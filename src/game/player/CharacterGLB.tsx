'use client';
// Chirag's Blender-built body (MPFB / MakeHuman, game_engine skeleton) with procedural bone animation.
// Driven only by runtime.anim / runtime.speed, exactly like the previous avatar, so gameplay is untouched.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { runtime } from './runtime';

export const CHARACTER_URL = '/models/chirag.glb';
useGLTF.preload(CHARACTER_URL);

type Joint = { bone: THREE.Bone; restLocal: THREE.Quaternion; restWorld: THREE.Quaternion; restPos: THREE.Vector3 };
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const ARM_DOWN = 0.72; // brings the A-pose arms down to the sides

export default function CharacterGLB() {
  const { scene } = useGLTF(CHARACTER_URL);
  const joints = useMemo(() => {
    scene.updateMatrixWorld(true);
    const rootInv = new THREE.Quaternion();
    scene.getWorldQuaternion(rootInv).invert();
    const map: Record<string, Joint> = {};
    scene.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; }
      const bone = o as THREE.Bone;
      if (bone.isBone) {
        const wq = new THREE.Quaternion();
        bone.getWorldQuaternion(wq);
        map[bone.name] = { bone, restLocal: bone.quaternion.clone(), restWorld: rootInv.clone().multiply(wq), restPos: bone.position.clone() };
      }
    });
    return map;
  }, [scene]);

  const tmp = useMemo(() => ({ d: new THREE.Quaternion(), a: new THREE.Quaternion(), b: new THREE.Quaternion(), c: new THREE.Quaternion() }), []);
  const phase = useRef(0);
  const landT = useRef(0);
  const prevGrounded = useRef(true);
  const root = useRef<THREE.Group>(null);

  /** Rotate a bone by a rotation expressed in character (model) space, relative to its rest pose. */
  const pose = (name: string, q: THREE.Quaternion) => {
    const j = joints[name];
    if (!j) return;
    tmp.d.copy(j.restWorld).invert().multiply(q).multiply(j.restWorld);
    j.bone.quaternion.copy(j.restLocal).multiply(tmp.d);
  };
  const rot = (axis: THREE.Vector3, angle: number, out: THREE.Quaternion) => out.setFromAxisAngle(axis, angle);
  /** arm: lower from A-pose, then swing (x) and raise sideways (extraZ). */
  const arm = (side: 'l' | 'r', swing: number, elbow: number, extraZ = 0) => {
    const s = side === 'l' ? -1 : 1; // left arm is on +X
    rot(Z, s * ARM_DOWN + s * -extraZ, tmp.b);
    rot(X, swing, tmp.a).multiply(tmp.b);
    pose(`upperarm_${side}`, tmp.a);
    pose(`lowerarm_${side}`, rot(X, -elbow, tmp.c));
  };

  useFrame((_, dt) => {
    const a = runtime.anim, sp = runtime.speed;
    const t = performance.now() / 1000;
    let lift = 0;

    if (!prevGrounded.current && runtime.grounded) landT.current = 0.2;
    prevGrounded.current = runtime.grounded;
    landT.current = Math.max(0, landT.current - dt);

    // defaults
    let thighL = 0, thighR = 0, calfL = 0, calfR = 0, spineX = 0, spineY = 0, headY = 0, headX = 0;
    let armL = { swing: 0, elbow: 0.15, z: 0 }, armR = { swing: 0, elbow: 0.15, z: 0 };

    if (a === 'sit') {
      thighL = thighR = -1.5; calfL = calfR = 1.5;
      spineX = 0.12; headX = 0.1 + Math.sin(t * 0.6) * 0.03;
      const tap = Math.sin(t * 14) * 0.05;
      armL = { swing: -0.85, elbow: 1.05 + tap, z: 0 };
      armR = { swing: -0.85, elbow: 1.05 - tap, z: 0 };
      lift = -0.43;
    } else if (a === 'walk' || a === 'run') {
      const run = a === 'run';
      phase.current += dt * (run ? 10.5 : 7.2) * Math.min(1.3, 0.45 + sp / (run ? 7 : 4.2));
      const s = Math.sin(phase.current), c = Math.cos(phase.current);
      const amp = run ? 0.8 : 0.45;
      thighL = -s * amp; thighR = s * amp;
      calfL = Math.max(0, s) * amp * 1.6 + (run ? 0.2 : 0.05);
      calfR = Math.max(0, -s) * amp * 1.6 + (run ? 0.2 : 0.05);
      armL = { swing: s * amp * 0.8, elbow: run ? 1.3 : 0.35, z: 0 };
      armR = { swing: -s * amp * 0.8, elbow: run ? 1.3 : 0.35, z: 0 };
      spineX = run ? 0.18 : 0.04; spineY = s * 0.1;
      lift = Math.abs(c) * (run ? 0.05 : 0.02) - (run ? 0.04 : 0.01);
    } else if (a === 'jump' || a === 'fall') {
      thighL = -0.7; calfL = 1.0; thighR = 0.2; calfR = 0.5;
      armL = { swing: -0.3, elbow: 0.6, z: 0.6 }; armR = { swing: -0.3, elbow: 0.6, z: 0.6 };
    } else {
      const b = Math.sin(t * 1.8);
      spineX = b * 0.012; headY = Math.sin(t * 0.5) * 0.2;
      armL.swing = armR.swing = b * 0.02;
    }
    if (landT.current > 0) {
      const k = landT.current / 0.2;
      thighL -= 0.45 * k; thighR -= 0.45 * k; calfL += 0.9 * k; calfR += 0.9 * k; lift -= 0.12 * k;
    }

    pose('thigh_l', rot(X, thighL, tmp.a)); pose('thigh_r', rot(X, thighR, tmp.a));
    pose('calf_l', rot(X, calfL, tmp.a)); pose('calf_r', rot(X, calfR, tmp.a));
    pose('foot_l', rot(X, -Math.min(0.6, calfL * 0.3) - thighL * 0.2, tmp.a));
    pose('foot_r', rot(X, -Math.min(0.6, calfR * 0.3) - thighR * 0.2, tmp.a));
    pose('spine_01', rot(X, spineX, tmp.a).multiply(rot(Y, spineY, tmp.b)));
    pose('neck_01', rot(Y, headY * 0.4, tmp.a));
    pose('head', rot(X, headX, tmp.a).multiply(rot(Y, headY * 0.6, tmp.b)));
    arm('l', armL.swing, armL.elbow, armL.z);
    arm('r', armR.swing, armR.elbow, armR.z);
    if (root.current) root.current.position.y = lift;
  });

  return <group ref={root}><primitive object={scene} /></group>;
}
