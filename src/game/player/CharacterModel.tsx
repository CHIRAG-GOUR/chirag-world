'use client';
/* eslint-disable react-hooks/immutability -- Three.js objects are animated imperatively inside useFrame (standard R3F pattern) */
// Chirag's avatar, modelled from his photo: short faded dark hair, thick brows, moustache + short
// jaw-line beard, big smile, warm brown skin; olive CHIRAG hoodie, blue jeans, white sneakers,
// grey smartwatch on the left wrist. Gameplay drives it only via `runtime.anim` / `runtime.speed`,
// so a rigged Blender/GLB character can replace this component without touching movement code.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from './runtime';

const C = {
  skin: '#c68c69', skinShade: '#b27a58', hair: '#1a120d', fade: '#4b3a2f', beard: '#22170f', lip: '#8f4c45', teeth: '#f6f1e8',
  iris: '#3a2416', hoodie: '#6b7a2e', hoodieDark: '#55621f', strings: '#eef2e2', jeans: '#3e6fb0', jeansDark: '#335d96',
  sneaker: '#f4f4f2', sole: '#d5d8dc', watch: '#8d9196', watchFace: '#1a1b1d',
};

function backText() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d')!;
  g.font = '900 150px "Arial Black", Impact, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 14; g.strokeStyle = '#3c4515'; g.strokeText('CHIRAG', 512, 132);
  g.fillStyle = '#f5f3ea'; g.fillText('CHIRAG', 512, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function build() {
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, rough = 0.75, metal = 0) => {
    const k = `${color}${rough}${metal}`;
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
    return mats.get(k)!;
  };
  const m = (geo: THREE.BufferGeometry, material: THREE.Material, shadow = true) => {
    const x = new THREE.Mesh(geo, material);
    x.castShadow = shadow; x.receiveShadow = shadow;
    return x;
  };
  const cap = (r: number, len: number, color: string, rough = 0.8) => m(new THREE.CapsuleGeometry(r, len, 6, 14), mat(color, rough));

  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const hips = new THREE.Group(); hips.position.y = 0.95; rig.add(hips);
  const pelvis = m(new THREE.SphereGeometry(0.17, 20, 14), mat(C.jeans, 0.85)); pelvis.scale.set(1, 0.62, 0.7); hips.add(pelvis);

  // ---- legs: hip → knee → ankle
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.095 * s, -0.02, 0); hips.add(hip);
    const thigh = cap(0.075, 0.32, C.jeans, 0.85); thigh.position.y = -0.22; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    const shin = cap(0.062, 0.32, C.jeans, 0.85); shin.position.y = -0.2; knee.add(shin);
    const hem = m(new THREE.CylinderGeometry(0.068, 0.07, 0.04, 16), mat(C.jeansDark)); hem.position.y = -0.38; knee.add(hem);
    const shoe = new THREE.Group(); shoe.position.set(0, -0.44, 0.035); knee.add(shoe);
    const upper = m(new THREE.SphereGeometry(0.06, 16, 10), mat(C.sneaker, 0.5)); upper.scale.set(1.1, 0.75, 2.05); shoe.add(upper);
    const sole = m(new THREE.BoxGeometry(0.115, 0.03, 0.27), mat(C.sole, 0.7)); sole.position.set(0, -0.045, 0.005); shoe.add(sole);
    const lace = m(new THREE.BoxGeometry(0.05, 0.012, 0.07), mat('#cfd3d8'), false); lace.position.set(0, 0.04, 0.04); shoe.add(lace);
    legs.push({ hip, knee });
  }

  // ---- torso: tapered hoodie (lathe), hood, pocket, drawstrings, CHIRAG on the back
  const spine = new THREE.Group(); hips.add(spine);
  const profile = [[0.0, 0.0], [0.17, 0.0], [0.18, 0.08], [0.185, 0.22], [0.2, 0.38], [0.19, 0.48], [0.12, 0.56], [0.06, 0.58]].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = m(new THREE.LatheGeometry(profile, 28), mat(C.hoodie, 0.92)); torso.scale.set(1.05, 1, 0.68); torso.position.y = 0.02; spine.add(torso);
  const band = m(new THREE.TorusGeometry(0.172, 0.022, 8, 28), mat(C.hoodieDark, 0.92)); band.rotation.x = Math.PI / 2; band.scale.set(1.05, 0.68, 1); band.position.y = 0.04; spine.add(band);
  const hood = m(new THREE.SphereGeometry(0.13, 18, 12), mat(C.hoodieDark, 0.92)); hood.scale.set(1.45, 0.6, 0.85); hood.position.set(0, 0.55, -0.09); spine.add(hood);
  const pocket = m(new THREE.BoxGeometry(0.22, 0.09, 0.02), mat(C.hoodieDark, 0.92), false); pocket.position.set(0, 0.15, 0.128); spine.add(pocket);
  for (const s of [-1, 1]) {
    const str = m(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6), mat(C.strings), false); str.position.set(0.035 * s, 0.47, 0.115); spine.add(str);
  }
  const text = new THREE.Mesh(new THREE.CylinderGeometry(0.197, 0.197, 0.1, 28, 1, true, Math.PI - 0.8, 1.6), new THREE.MeshStandardMaterial({ map: backText(), transparent: true, depthWrite: false, roughness: 0.85 }));
  text.scale.set(1.05, 1, 0.68); text.position.y = 0.33; spine.add(text);

  // ---- arms: shoulder → elbow → wrist; grey smartwatch on the left wrist
  const arms: { shoulder: THREE.Group; elbow: THREE.Group }[] = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(0.215 * s, 0.47, 0); spine.add(shoulder);
    const ball = m(new THREE.SphereGeometry(0.07, 14, 10), mat(C.hoodie, 0.92)); shoulder.add(ball);
    const upperArm = cap(0.058, 0.2, C.hoodie, 0.92); upperArm.position.y = -0.15; shoulder.add(upperArm);
    const elbow = new THREE.Group(); elbow.position.y = -0.3; shoulder.add(elbow);
    const fore = cap(0.05, 0.18, C.hoodie, 0.92); fore.position.y = -0.13; elbow.add(fore);
    const cuff = m(new THREE.CylinderGeometry(0.047, 0.05, 0.035, 14), mat(C.hoodieDark, 0.92)); cuff.position.y = -0.245; elbow.add(cuff);
    const hand = m(new THREE.BoxGeometry(0.06, 0.09, 0.035), mat(C.skin, 0.55)); hand.position.y = -0.31; elbow.add(hand);
    const thumb = m(new THREE.CapsuleGeometry(0.013, 0.035, 4, 8), mat(C.skin, 0.55)); thumb.position.set(-0.033 * s, -0.295, 0.015); thumb.rotation.z = 0.5 * s; elbow.add(thumb);
    if (s < 0) { // left wrist: grey strap + dark round face
      const strap = m(new THREE.TorusGeometry(0.036, 0.009, 8, 20), mat(C.watch, 0.5, 0.3), false); strap.rotation.x = Math.PI / 2; strap.position.y = -0.265; elbow.add(strap);
      const face = m(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 20), mat(C.watchFace, 0.2, 0.6), false); face.rotation.z = Math.PI / 2; face.position.set(-0.04, -0.265, 0); elbow.add(face);
    }
    arms.push({ shoulder, elbow });
  }

  // ---- neck + head (slightly enlarged so the face reads at third-person distance)
  const neck = m(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 14), mat(C.skin, 0.6)); neck.position.y = 0.6; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.64; head.scale.setScalar(1.18); spine.add(head);
  const skull = m(new THREE.SphereGeometry(0.115, 32, 24), mat(C.skin, 0.55)); skull.scale.set(0.9, 1.12, 1); skull.position.y = 0.12; head.add(skull);
  const jaw = m(new THREE.SphereGeometry(0.1, 24, 16), mat(C.skin, 0.55)); jaw.scale.set(0.9, 0.8, 0.95); jaw.position.set(0, 0.07, 0.012); head.add(jaw);
  for (const s of [-1, 1]) { const ear = m(new THREE.SphereGeometry(0.025, 12, 8), mat(C.skinShade, 0.6)); ear.scale.set(0.55, 1.15, 0.9); ear.position.set(0.104 * s, 0.12, -0.005); head.add(ear); }

  // hair: dark volume on top + lighter faded sides/back
  const top = m(new THREE.SphereGeometry(0.121, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.38), mat(C.hair, 0.85)); top.scale.set(0.93, 1.05, 1.04); top.position.set(0, 0.135, -0.004); top.rotation.x = -0.18; head.add(top);
  const quiff = m(new THREE.SphereGeometry(0.06, 16, 10), mat(C.hair, 0.85)); quiff.scale.set(1.5, 0.55, 0.9); quiff.position.set(0, 0.235, 0.05); head.add(quiff);
  const fade = m(new THREE.SphereGeometry(0.118, 28, 16, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.22, Math.PI * 0.3), mat(C.fade, 0.9)); fade.scale.set(0.92, 1.1, 1.01); fade.position.y = 0.12; head.add(fade);

  // eyes, brows, nose, smile, moustache, beard (face looks toward +Z)
  const eyes: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(0.039 * s, 0.135, 0.095); head.add(eye);
    const white = m(new THREE.SphereGeometry(0.016, 14, 10), mat('#f3efe9', 0.3), false); white.scale.set(1.25, 0.8, 0.55); eye.add(white);
    const iris = m(new THREE.SphereGeometry(0.0095, 12, 8), mat(C.iris, 0.25), false); iris.position.z = 0.007; eye.add(iris);
    const glint = m(new THREE.SphereGeometry(0.0025, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), false); glint.position.set(0.003, 0.003, 0.0105); eye.add(glint);
    eyes.push(eye);
    const brow = m(new THREE.BoxGeometry(0.038, 0.009, 0.01), mat(C.hair, 0.9), false); brow.position.set(0.041 * s, 0.158, 0.103); brow.rotation.z = -0.12 * s; head.add(brow);
  }
  const nose = m(new THREE.SphereGeometry(0.017, 14, 10), mat(C.skinShade, 0.5), false); nose.scale.set(1.05, 1.25, 1); nose.position.set(0, 0.112, 0.112); head.add(nose);
  const bridge = m(new THREE.BoxGeometry(0.013, 0.035, 0.012), mat(C.skin, 0.5), false); bridge.position.set(0, 0.132, 0.108); head.add(bridge);
  // broad smile: lips + a row of teeth
  const lips = m(new THREE.TorusGeometry(0.027, 0.006, 8, 20, Math.PI), mat(C.lip, 0.5), false); lips.rotation.z = Math.PI; lips.position.set(0, 0.078, 0.104); head.add(lips);
  const teeth = m(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 20, 1, false, -Math.PI / 2 - 0.9, 1.8), mat(C.teeth, 0.3), false); teeth.rotation.x = Math.PI / 2; teeth.position.set(0, 0.077, 0.084); head.add(teeth);
  // moustache drooping at the ends (as in the photo)
  const stache = m(new THREE.TorusGeometry(0.03, 0.0075, 8, 20, Math.PI * 0.95), mat(C.beard, 0.9), false); stache.position.set(0, 0.075, 0.1); stache.rotation.z = Math.PI * 0.025; head.add(stache);
  // short beard hugging the jaw line and chin
  const beard = m(new THREE.SphereGeometry(0.104, 28, 16, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.5, Math.PI * 0.36), mat(C.beard, 0.95)); beard.scale.set(0.93, 0.85, 1); beard.position.set(0, 0.07, 0.014); head.add(beard);
  const chin = m(new THREE.SphereGeometry(0.03, 12, 8), mat(C.beard, 0.95), false); chin.scale.set(1.3, 0.9, 0.8); chin.position.set(0, 0.025, 0.08); head.add(chin);

  return { root, rig, hips, spine, legs, arms, head, eyes };
}

export default function CharacterModel() {
  const parts = useMemo(() => build(), []);
  const phase = useRef(0);
  const blinkAt = useRef(2);
  const landT = useRef(0);
  const prevGrounded = useRef(true);

  useFrame((_, dt) => {
    const { rig, hips, spine, legs, arms, head, eyes } = parts;
    const a = runtime.anim, sp = runtime.speed;
    const t = performance.now() / 1000;
    // neutral pose
    rig.position.set(0, 0, 0); hips.rotation.set(0, 0, 0); spine.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    legs.forEach(l => { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); });
    arms.forEach((x, i) => { x.shoulder.rotation.set(0, 0, i ? -0.08 : 0.08); x.elbow.rotation.set(-0.15, 0, 0); });

    if (!prevGrounded.current && runtime.grounded) landT.current = 0.2;
    prevGrounded.current = runtime.grounded;
    landT.current = Math.max(0, landT.current - dt);

    if (a === 'sit') {
      // seated at the desk, typing
      rig.position.y = -0.41;
      legs.forEach(l => { l.hip.rotation.x = -1.5; l.knee.rotation.x = 1.55; });
      spine.rotation.x = 0.18;
      const tap = Math.sin(t * 14);
      arms.forEach((x, i) => {
        x.shoulder.rotation.x = -0.75; x.shoulder.rotation.z = (i ? -1 : 1) * 0.12;
        x.elbow.rotation.x = -1.05 + (i ? tap : -tap) * 0.05;
      });
      head.rotation.x = 0.12 + Math.sin(t * 0.6) * 0.03;
    } else if (a === 'walk' || a === 'run') {
      const run = a === 'run';
      phase.current += dt * (run ? 11 : 7.5) * Math.min(1.25, 0.45 + sp / (run ? 7 : 4.2));
      const s = Math.sin(phase.current), c = Math.cos(phase.current);
      const amp = run ? 0.85 : 0.5;
      legs[0].hip.rotation.x = s * amp; legs[1].hip.rotation.x = -s * amp;
      legs[0].knee.rotation.x = Math.max(0, -s) * amp * 1.5 + (run ? 0.25 : 0.05);
      legs[1].knee.rotation.x = Math.max(0, s) * amp * 1.5 + (run ? 0.25 : 0.05);
      arms[0].shoulder.rotation.x = -s * amp * 0.9; arms[1].shoulder.rotation.x = s * amp * 0.9;
      arms.forEach(x => (x.elbow.rotation.x = run ? -1.25 : -0.35));
      rig.position.y = Math.abs(c) * (run ? 0.06 : 0.025) - (run ? 0.03 : 0);
      spine.rotation.x = run ? 0.16 : 0.04;
      hips.rotation.y = s * 0.08;
      spine.rotation.y = -s * 0.12;
    } else if (a === 'jump' || a === 'fall') {
      legs[0].hip.rotation.x = -0.7; legs[0].knee.rotation.x = 1.1;
      legs[1].hip.rotation.x = 0.25; legs[1].knee.rotation.x = 0.5;
      arms.forEach((x, i) => { x.shoulder.rotation.z = (i ? -1 : 1) * (a === 'jump' ? 0.9 : 0.6); x.elbow.rotation.x = -0.5; });
    } else {
      // idle: breathing + small weight shift
      const b = Math.sin(t * 1.8);
      spine.rotation.x = b * 0.012;
      rig.position.y = b * 0.004;
      head.rotation.y = Math.sin(t * 0.5) * 0.18;
      hips.rotation.z = Math.sin(t * 0.4) * 0.02;
    }
    if (landT.current > 0) {
      const k = landT.current / 0.2;
      rig.position.y -= 0.1 * k;
      legs.forEach(l => { l.hip.rotation.x -= 0.4 * k; l.knee.rotation.x += 0.8 * k; });
    }

    if (t > blinkAt.current + 0.12) blinkAt.current = t + 2.2 + Math.random() * 3;
    const closed = t > blinkAt.current && t < blinkAt.current + 0.12;
    eyes.forEach(e => (e.scale.y = closed ? 0.15 : 1));
  });

  return <primitive object={parts.root} />;
}
