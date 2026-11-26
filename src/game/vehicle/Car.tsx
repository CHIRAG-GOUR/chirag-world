'use client';
// Chirag's car: an original yellow mid-engine supercar (not a replica of any real or licensed model).
// Kinematic body + Rapier character controller = solid collisions with the city, arcade handling.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CuboidCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { Collider, KinematicCharacterController } from '@dimforge/rapier3d-compat';
import { runtime } from '../player/runtime';
import { touch } from '../player/touch';
import { useSession } from '../state/stores';
import type { Controls } from '../player/Player';

const HALF = { x: 1.0, y: 0.45, z: 2.25 };
const TUNE = { accel: 14, brake: 26, reverse: 7, maxSpeed: 46, maxReverse: 9, drag: 0.35, roll: 3, steer: 0.55, wheelBase: 2.6, grip: 7, driftGrip: 1.6 };

function buildCar() {
  const paint = new THREE.MeshPhysicalMaterial({ color: '#f6c400', roughness: 0.28, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.06 });
  const black = new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.5, metalness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#1b232b', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.85 });
  const rim = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.25, metalness: 0.95 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
  const head = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4d6', emissiveIntensity: 2.5 });
  const tail = new THREE.MeshStandardMaterial({ color: '#7a0b0b', emissive: '#ff1a1a', emissiveIntensity: 1.6 });
  const g = new THREE.Group();

  // side profile → extruded wedge body (x along length, y up), centred afterwards
  const s = new THREE.Shape();
  s.moveTo(-2.3, 0.28); s.lineTo(2.25, 0.3); s.quadraticCurveTo(2.42, 0.36, 2.35, 0.55);
  s.lineTo(1.3, 0.78); s.lineTo(0.7, 0.84); s.lineTo(-1.4, 0.92); s.lineTo(-2.05, 0.95);
  s.quadraticCurveTo(-2.35, 0.9, -2.32, 0.6); s.lineTo(-2.3, 0.28);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.86, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 4, curveSegments: 12 }), paint);
  body.geometry.translate(0, 0, -0.93);
  body.rotation.y = -Math.PI / 2; // length along Z, nose toward +Z
  body.castShadow = true;
  g.add(body);

  // cabin canopy
  const c = new THREE.Shape();
  c.moveTo(1.05, 0.82); c.quadraticCurveTo(0.55, 1.28, -0.2, 1.3); c.quadraticCurveTo(-0.95, 1.27, -1.45, 0.95); c.lineTo(1.05, 0.82);
  const cabin = new THREE.Mesh(new THREE.ExtrudeGeometry(c, { depth: 1.36, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }), glass);
  cabin.geometry.translate(0, 0, -0.68);
  cabin.rotation.y = -Math.PI / 2;
  g.add(cabin);

  // side intakes, splitter, diffuser, rear wing
  for (const sx of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.8), black);
    intake.position.set(sx * 0.98, 0.6, -0.45); intake.rotation.y = sx * 0.12; g.add(intake);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), paint);
    mirror.position.set(sx * 1.02, 0.98, 0.75); g.add(mirror);
  }
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.35), black); splitter.position.set(0, 0.3, 2.25); g.add(splitter);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.25), black); diffuser.position.set(0, 0.38, -2.3); g.add(diffuser);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.05, 0.32), black); wing.position.set(0, 1.12, -2.05); g.add(wing);
  for (const sx of [-0.6, 0.6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), black); post.position.set(sx, 1.02, -2.0); g.add(post); }

  // lights
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.08), head); hl.position.set(sx * 0.62, 0.62, 2.28); hl.rotation.y = sx * 0.25; g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.05), tail); tl.position.set(sx * 0.6, 0.82, -2.38); g.add(tl);
  }

  // wheels (front pair steer)
  const wheels: THREE.Group[] = [];
  const pos: [number, number][] = [[-0.92, 1.38], [0.92, 1.38], [-0.92, -1.45], [0.92, -1.45]];
  pos.forEach(([x, z]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.36, z); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 28), tyre); t.rotation.z = Math.PI / 2; t.castShadow = true; spin.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.31, 10), rim); r.rotation.z = Math.PI / 2; spin.add(r);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.04), rim); sp.rotation.x = (k / 5) * Math.PI; sp.position.x = Math.sign(x) * 0.16; spin.add(sp); }
    wheels.push(pivot);
  });
  g.position.y = -HALF.y; // body origin sits at the collider centre
  return { group: g, wheels, body };
}

export default function Car() {
  const rb = useRef<RapierRigidBody>(null);
  const col = useRef<Collider | null>(null);
  const visual = useRef<THREE.Group>(null);
  const car = useMemo(() => buildCar(), []);
  const { world, rapier } = useRapier();
  const [, getKeys] = useKeyboardControls<Controls>();
  const ctrl = useRef<KinematicCharacterController | null>(null);
  const st = useRef({ speed: 0, lateral: 0, roll: 0, wheelSpin: 0, vy: 0 });

  useEffect(() => {
    const c = world.createCharacterController(0.03);
    c.enableAutostep(0.35, 0.4, true);
    c.enableSnapToGround(0.5);
    c.setMaxSlopeClimbAngle(0.6);
    ctrl.current = c;
    return () => { ctrl.current = null; world.removeCharacterController(c); };
  }, [world]);

  useFrame((_, rawDt) => {
    const body = rb.current, collider = col.current, c = ctrl.current;
    if (!body || !collider || !c) return;
    const dt = Math.min(rawDt, 1 / 30);
    const s = st.current;
    const session = useSession.getState();
    const active = runtime.driving && session.phase === 'playing' && !session.panel;
    const k = active ? getKeys() : null;
    const throttle = k ? (k.forward ? 1 : 0) - (k.back ? 1 : 0) - touch.move.y : 0;
    const steerIn = k ? (k.left ? 1 : 0) - (k.right ? 1 : 0) - touch.move.x : 0;
    const handbrake = !!(k && k.jump);

    // longitudinal
    if (throttle > 0.05) s.speed += (s.speed < 0 ? TUNE.brake : TUNE.accel) * throttle * dt;
    else if (throttle < -0.05) s.speed += (s.speed > 0 ? -TUNE.brake : -TUNE.reverse) * -throttle * dt;
    s.speed -= s.speed * TUNE.drag * dt + Math.sign(s.speed) * TUNE.roll * dt * (Math.abs(s.speed) > 0.3 ? 1 : 0);
    if (Math.abs(s.speed) < 0.15 && Math.abs(throttle) < 0.05) s.speed = 0;
    if (handbrake) s.speed *= 1 - 1.2 * dt;
    s.speed = THREE.MathUtils.clamp(s.speed, -TUNE.maxReverse, TUNE.maxSpeed);

    // steering (less lock at speed), bicycle model yaw
    const lock = TUNE.steer * (1 - Math.min(0.6, Math.abs(s.speed) / 60));
    runtime.car.steer += (steerIn * lock - runtime.car.steer) * Math.min(1, 8 * dt);
    const yawRate = (s.speed / TUNE.wheelBase) * Math.tan(runtime.car.steer) * (handbrake ? 1.5 : 1);
    runtime.car.yaw += yawRate * dt;

    // lateral slip (drift) decays with grip
    s.lateral += -yawRate * s.speed * 0.02 * (handbrake ? 3 : 1);
    s.lateral -= s.lateral * (handbrake ? TUNE.driftGrip : TUNE.grip) * dt;

    const fwd = new THREE.Vector3(Math.sin(runtime.car.yaw), 0, Math.cos(runtime.car.yaw));
    const right = new THREE.Vector3(Math.cos(runtime.car.yaw), 0, -Math.sin(runtime.car.yaw));
    s.vy = Math.max(-30, s.vy - 24 * dt);
    const move = fwd.multiplyScalar(s.speed * dt).add(right.multiplyScalar(s.lateral * dt));
    c.computeColliderMovement(collider, { x: move.x, y: s.vy * dt, z: move.z }, rapier.QueryFilterFlags.EXCLUDE_SENSORS);
    const m = c.computedMovement();
    if (c.computedGrounded()) s.vy = 0;
    // hitting a wall bleeds speed instead of sliding at full pace
    const wanted = Math.hypot(move.x, move.z), got = Math.hypot(m.x, m.z);
    if (wanted > 0.001 && got < wanted * 0.6) s.speed *= 0.6;
    const p = body.translation();
    const next = { x: p.x + m.x, y: p.y + m.y, z: p.z + m.z };
    body.setNextKinematicTranslation(next);
    body.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), runtime.car.yaw));
    runtime.car.position.set(next.x, next.y - HALF.y, next.z);
    runtime.car.speed = s.speed;

    // visuals: wheels, body roll
    s.wheelSpin += (s.speed / 0.36) * dt;
    car.wheels.forEach((w, i) => {
      (w.children[0] as THREE.Group).rotation.x = s.wheelSpin;
      if (i < 2) w.rotation.y = runtime.car.steer;
    });
    s.roll += (-runtime.car.steer * Math.min(1, Math.abs(s.speed) / 25) * 0.06 - s.roll) * Math.min(1, 6 * dt);
    if (visual.current) visual.current.rotation.z = s.roll;

    // proximity for the enter prompt
    const d = Math.hypot(runtime.position.x - next.x, runtime.position.z - next.z);
    runtime.carNear = !runtime.driving && d < 3.6;
  });

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders={false} position={[runtime.car.position.x, HALF.y + 0.25, runtime.car.position.z]} rotation={[0, runtime.car.yaw, 0]}>
      <CuboidCollider ref={(c) => { col.current = (c as unknown as Collider) ?? null; }} args={[HALF.x, HALF.y, HALF.z]} />
      <group ref={visual}><primitive object={car.group} /></group>
    </RigidBody>
  );
}
