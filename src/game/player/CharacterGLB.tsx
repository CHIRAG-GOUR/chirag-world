'use client';
// Chirag: Blender-built human (MPFB / MakeHuman, game_engine skeleton) driven by baked animation clips.
//
// Locomotion is a 1-D blend tree over real clips (idle → walk → run → sprint) whose phases are synchronised
// and advanced by distance travelled ÷ stride length, so the planted foot never slides at any speed.
// Air (jump / fall), landing, turn-on-the-spot and seated poses blend on top with smoothed weights;
// a light procedural layer adds lean into turns/acceleration and lets the head lead the turn.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { runtime } from './runtime';
import CLIPS from './chiragClips.json';

export const CHARACTER_URL = '/models/chirag.glb';
useGLTF.preload(CHARACTER_URL);

type ClipName = keyof typeof CLIPS;
const LOCO = ['walk', 'run', 'sprint'] as const;
const STRIDE = Object.fromEntries(LOCO.map(n => [n, CLIPS[n].speed * CLIPS[n].seconds])) as Record<(typeof LOCO)[number], number>;
const SEAT_DROP = -0.43; // the chair seat is lower than standing hip height

/** Hair-like cards render as alpha cut-outs (no sorting flicker); glasses stay truly transparent. */
const CUTOUT: Record<string, number> = {
  M_ChiragHair: 0.3, M_ChiragBrows: 0.2, M_ChiragLashes: 0.25, M_FacialHair: 0.22, M_ChiragEyes: 0.5,
};
const THIN = new Set(['M_ChiragOutfit', 'M_Lettering', 'M_Drawstring', 'M_GlassesSteel', 'M_Grommet']);
function tuneMaterial(m: THREE.MeshStandardMaterial) {
  if (!m || !m.name) return;
  if (m.name in CUTOUT) {
    m.transparent = false; m.depthWrite = true; m.alphaTest = CUTOUT[m.name]; m.side = THREE.DoubleSide;
  } else if (m.name.startsWith('M_Glasses') && m.name !== 'M_GlassesSteel') {
    m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide; m.roughness = 0.08;
  } else {
    m.transparent = false;
    m.side = THIN.has(m.name) ? THREE.DoubleSide : THREE.FrontSide;
  }
  m.needsUpdate = true;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const TMP = {
  q: new THREE.Quaternion(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(),
  sceneQ: new THREE.Quaternion(), parentQ: new THREE.Quaternion(),
};

/** Rotate a bone by q (expressed in character space) on top of the animated pose. */
function addRotation(scene: THREE.Object3D, b: THREE.Bone | undefined, q: THREE.Quaternion) {
  if (!b || !b.parent) return;
  scene.getWorldQuaternion(TMP.sceneQ);
  b.parent.getWorldQuaternion(TMP.parentQ);
  TMP.parentQ.premultiply(TMP.sceneQ.invert());          // parent in character space
  TMP.qa.copy(TMP.parentQ).invert().multiply(q).multiply(TMP.parentQ);
  b.quaternion.premultiply(TMP.qa);
}

export default function CharacterGLB() {
  const { scene, animations } = useGLTF(CHARACTER_URL);
  const root = useRef<THREE.Group>(null);

  const rig = useMemo(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isMesh) {
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
        tuneMaterial(mesh.material as THREE.MeshStandardMaterial);
      }
    });
    const mixer = new THREE.AnimationMixer(scene);
    const actions = {} as Record<ClipName, THREE.AnimationAction>;
    for (const clip of animations) {
      if (!(clip.name in CLIPS)) continue;
      const a = mixer.clipAction(clip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.play();
      a.setEffectiveTimeScale(0); // time is driven explicitly below
      a.setEffectiveWeight(0);
      actions[clip.name as ClipName] = a;
    }
    const bone = (n: string) => scene.getObjectByName(n) as THREE.Bone | undefined;

    // Align the gait cycles: find each clip's phase offset that best matches walk's left/right foot pattern.
    const footL = bone('foot_l'), footR = bone('foot_r');
    const offset: Record<string, number> = { walk: 0, run: 0, sprint: 0 };
    if (footL && footR) {
      const N = 32, pl = new THREE.Vector3(), pr = new THREE.Vector3();
      const signal = (name: ClipName) => {
        const a = actions[name];
        if (!a) return null;
        for (const other of Object.values(actions)) other.setEffectiveWeight(0);
        a.setEffectiveWeight(1);
        const out: number[] = [];
        for (let i = 0; i < N; i++) {
          a.time = (i / N) * CLIPS[name].seconds;
          mixer.update(0);
          scene.updateMatrixWorld(true);
          footL.getWorldPosition(pl); footR.getWorldPosition(pr);
          out.push(pl.z - pr.z); // forward = +Z
        }
        a.setEffectiveWeight(0);
        return out;
      };
      const ref = signal('walk');
      for (const name of ['run', 'sprint'] as const) {
        const sig = signal(name);
        if (!ref || !sig) continue;
        let best = 0, bestScore = -Infinity;
        for (let s = 0; s < N; s++) {
          let score = 0;
          for (let i = 0; i < N; i++) score += ref[i] * sig[(i + s) % N];
          if (score > bestScore) { bestScore = score; best = s; }
        }
        offset[name] = best / N;
      }
    }
    // rest-pose quaternions for the procedural layer
    const lean = ['spine_01', 'spine_02', 'neck_01', 'head'].map(bone);
    return { mixer, actions, offset, spine1: lean[0], spine2: lean[1], neck: lean[2], head: lean[3] };
  }, [scene, animations]);

  const st = useRef({
    phase: 0, v: 0, idleT: 0, turnT: 0, airT: 0, jumpT: 0, landT: 99, wasAir: false, airTime: 0,
    w: {} as Record<string, number>, lift: 0,
  });
  // the frame loop drives the rig through a ref (render-time objects stay immutable)
  const live = useRef<typeof rig | null>(null);
  useEffect(() => { live.current = rig; }, [rig]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const r = live.current;
    if (!r) return;
    const s = st.current, { actions, mixer, offset } = r;
    const anim = runtime.anim;
    // blend on a smoothed speed so small speed wobbles never pump the arms between gaits
    st.current.v += (runtime.speed - st.current.v) * Math.min(1, 8 * dt);
    const v = st.current.v;
    const air = !runtime.grounded && !runtime.seated;
    const target: Record<string, number> = {};

    // ---- seated
    if (runtime.seated || anim === 'sit') {
      target.sit = 1;
    } else {
      // ---- air: jump launch, then fall loop
      s.airTime = air ? s.airTime + dt : 0;
      if (air && !s.wasAir) { s.jumpT = runtime.vy > 0.5 ? 0 : 99; }
      if (!air && s.wasAir && s.airT > 0.22) s.landT = 0; // only real drops get a landing
      s.airT = air ? s.airT + dt : 0;
      s.wasAir = air;
      let airW = 0;
      if (air) {
        s.jumpT += dt;
        const jumping = s.jumpT < CLIPS.jump.seconds && runtime.vy > -1;
        airW = smooth(0.0, 0.08, s.airTime + (jumping ? 0.08 : 0));
        if (jumping) target.jump = airW; else target.fall = airW;
      }

      // ---- landing: a short absorb on top of whatever the legs do next
      s.landT += dt;
      const landW = s.landT < CLIPS.land.seconds ? (1 - smooth(0.15, CLIPS.land.seconds, s.landT)) * (v > 2.5 ? 0.35 : 0.85) : 0;
      if (landW > 0) target.land = landW;

      // ---- ground locomotion 1-D blend (idle → walk → run → sprint)
      const ground = (1 - airW) * (1 - landW);
      const turnW = runtime.turningInPlace && v < 0.4 ? 1 - smooth(0.15, 0.4, v) : 0;
      // pure-walk zone up to WALK_TOP (cadence scales), so a walk never borrows the run's bent arms
      const W = CLIPS.walk.speed, WALK_TOP = W * 1.35, R = CLIPS.run.speed, S = CLIPS.sprint.speed;
      let wi = 0, ww = 0, wr = 0, ws = 0;
      if (v <= WALK_TOP) { ww = smooth(0, W * 0.75, v); wi = 1 - ww; }
      else if (v <= R) { wr = smooth(WALK_TOP, R, v); ww = 1 - wr; }
      else { ws = smooth(R, S, v); wr = 1 - ws; }
      const turnShare = turnW * wi;               // pivoting replaces the idle share only
      if (turnShare > 0) target[runtime.turningInPlace > 0 ? 'turn_left' : 'turn_right'] = ground * turnShare;
      target.idle = ground * (wi - turnShare);
      target.walk = ground * ww; target.run = ground * wr; target.sprint = ground * ws;

      // distance-driven phase: stride length is blended with the same weights → no foot sliding
      const moving = ww + wr + ws;
      const stride = moving > 1e-3 ? (ww * STRIDE.walk + wr * STRIDE.run + ws * STRIDE.sprint) / moving : STRIDE.walk;
      s.phase = (s.phase + (runtime.speed * dt) / stride) % 1;   // true distance travelled
    }

    // ---- smooth every weight (no pops), then set clip times
    const names = Object.keys(actions) as ClipName[];
    let total = 0;
    for (const n of names) {
      const cur = s.w[n] ?? 0, tgt = target[n] ?? 0;
      const rate = tgt > cur ? 9 : 6;   // fade in a touch faster than out
      s.w[n] = cur + (tgt - cur) * Math.min(1, rate * dt);
      total += s.w[n];
    }
    s.idleT += dt;
    if (runtime.turningInPlace) s.turnT += dt * 1.2; else s.turnT = 0.15;
    for (const n of names) {
      const a = actions[n];
      const w = total > 1e-4 ? s.w[n] / total : n === 'idle' ? 1 : 0;
      a.setEffectiveWeight(w);
      const len = CLIPS[n].seconds || 0.001;
      if (n === 'walk' || n === 'run' || n === 'sprint') a.time = ((s.phase + offset[n]) % 1) * len;
      else if (n === 'idle') a.time = s.idleT % len;
      else if (n === 'turn_left' || n === 'turn_right') a.time = 0.15 + (s.turnT % (len - 0.3));
      else if (n === 'jump') a.time = Math.min(s.jumpT, len - 0.001);
      else if (n === 'fall') a.time = s.airT % len;
      else if (n === 'land') a.time = Math.min(s.landT, len - 0.001);
      else a.time = 0;
    }
    mixer.update(0);
    scene.updateMatrixWorld(true);

    // ---- procedural polish: lean into turns and acceleration, head leads the turn
    if (!runtime.seated) {
      const turnLean = THREE.MathUtils.clamp(-runtime.turnRate * v * 0.03, -0.16, 0.16);
      const accelLean = THREE.MathUtils.clamp(runtime.accel * 0.012, -0.05, 0.06);
      TMP.q.setFromAxisAngle(Z, turnLean * 0.5).multiply(TMP.qb.setFromAxisAngle(X, accelLean * 0.5));
      addRotation(scene, r.spine1, TMP.q);
      addRotation(scene, r.spine2, TMP.q);
      const look = THREE.MathUtils.clamp(runtime.turnRate * 0.07, -0.3, 0.3);
      addRotation(scene, r.neck, TMP.q.setFromAxisAngle(Y, look * 0.4));
      addRotation(scene, r.head, TMP.q.setFromAxisAngle(Y, look * 0.6));
    }

    // seat height (sit pose keeps the pelvis at standing height)
    s.lift += ((runtime.seated ? SEAT_DROP : 0) - s.lift) * Math.min(1, 10 * dt);
    if (root.current) root.current.position.y = s.lift;
  });

  return <group ref={root}><primitive object={scene} /></group>;
}
