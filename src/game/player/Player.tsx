'use client';
// Third-person player: Rapier kinematic capsule driven by a KinematicCharacterController.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { Collider, KinematicCharacterController } from '@dimforge/rapier3d-compat';
import CharacterModel from './CharacterGLB';
import { runtime, SPAWN, HOME, GAIT } from './runtime';
import { touch } from './touch';
import { useSession, useSettings } from '../state/stores';

export const CAPSULE = { halfHeight: 0.55, radius: 0.42 };
const FEET = CAPSULE.halfHeight + CAPSULE.radius;

// Human numbers: a jog is reached in ~0.6 s, a sprint in ~1.1 s, a stop takes ~0.4 s; a standing jump clears ~0.6 m.
const TUNING = {
  accel: 5.2, sprintAccel: 4.6, decel: 7.5, airControl: 0.25,
  gravity: -20, jump: 5.0, coyote: 0.12, buffer: 0.12, maxFall: -40,
  turnStill: 6.5, turnWalk: 7.5, turnSprint: 3.2, // max facing turn rate, rad/s
  pivotAngle: 1.15, // input this far behind (rad) from a standstill = turn on the spot first
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export type Controls = 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'jump';

export default function Player() {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<Collider | null>(null);
  const visual = useRef<THREE.Group>(null);
  const { world, rapier } = useRapier();
  const [, getKeys] = useKeyboardControls<Controls>();

  // created in an effect (not useMemo) so StrictMode's mount→unmount→mount never leaves a freed controller
  const controllerRef = useRef<KinematicCharacterController | null>(null);
  useEffect(() => {
    const c = world.createCharacterController(0.04);
    c.enableAutostep(0.45, 0.25, true); // climb kerbs and plaza steps
    c.enableSnapToGround(0.45);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(true);
    controllerRef.current = c;
    return () => { controllerRef.current = null; world.removeCharacterController(c); };
  }, [world]);

  const state = useRef({ vel: new THREE.Vector3(), speed: 0, vy: 0, coyote: 0, buffer: 0, jumpHeld: false, airTime: 0 });

  // CapsLock toggles a relaxed walk (GTA-style); mirrors the OS caps state so it never gets out of sync
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'CapsLock') runtime.walkMode = e.getModifierState('CapsLock'); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);
  // every visit starts at home, seated at the desk
  const start = useMemo(() => new THREE.Vector3(HOME.chair.x, 0.24 + FEET, HOME.chair.z), []);

  useFrame((_, rawDt) => {
    const b = body.current, col = collider.current, controller = controllerRef.current;
    if (!b || !col || !controller) return;
    const dt = Math.min(rawDt, 1 / 30);
    const s = state.current;
    const session = useSession.getState();
    const canMove = session.phase === 'playing' && !session.panel && runtime.inputEnabled;

    if (visual.current) visual.current.visible = !runtime.driving && useSettings.getState().cameraMode !== 'first';

    // in the car: the body parks above the car (no collisions) and follows it
    if (runtime.driving) {
      const cp = runtime.car.position;
      b.setNextKinematicTranslation({ x: cp.x, y: cp.y + 40, z: cp.z });
      runtime.position.copy(cp);
      runtime.speed = Math.abs(runtime.car.speed);
      runtime.grounded = true;
      s.vel.set(0, 0, 0); s.vy = 0; s.speed = 0;
      return;
    }
    // seated at the desk until the player stands up
    if (runtime.seated) {
      b.setNextKinematicTranslation({ x: HOME.chair.x, y: 0.24 + FEET, z: HOME.chair.z });
      runtime.position.set(HOME.chair.x, 0.24, HOME.chair.z);
      runtime.facing = 0;
      runtime.anim = 'sit';
      runtime.grounded = true;
      if (visual.current) visual.current.rotation.y = 0;
      return;
    }

    // fast travel / respawn
    if (runtime.teleport) {
      b.setTranslation(runtime.teleport, true);
      b.setNextKinematicTranslation(runtime.teleport);
      s.vel.set(0, 0, 0); s.vy = 0; s.speed = 0;
      runtime.teleport = null;
      return;
    }

    // ---- input (keyboard + touch), camera-relative
    const k = canMove ? getKeys() : { forward: false, back: false, left: false, right: false, sprint: false, jump: false };
    let ix = (k.right ? 1 : 0) - (k.left ? 1 : 0) + (canMove ? touch.move.x : 0);
    let iz = (k.back ? 1 : 0) - (k.forward ? 1 : 0) + (canMove ? touch.move.y : 0);
    const mag = Math.min(1, Math.hypot(ix, iz));
    const ilen = Math.hypot(ix, iz);
    if (ilen > 0) { ix /= ilen; iz /= ilen; }
    const yaw = runtime.cameraYaw;
    const wishX = Math.cos(yaw) * ix - Math.sin(yaw) * -iz;
    const wishZ = -Math.sin(yaw) * ix - Math.cos(yaw) * -iz;
    const sprint = k.sprint || touch.sprint;
    const touching = Math.hypot(touch.move.x, touch.move.y) > 0.05;
    // gait: CapsLock = relaxed walk, default = jog, Shift = sprint; a half-pushed stick walks
    let gait = runtime.walkMode ? GAIT.walk : sprint ? GAIT.sprint : GAIT.jog;
    if (touching && !sprint) gait = mag < 0.55 ? GAIT.walk * Math.max(0.35, mag / 0.55) : GAIT.jog;
    const grounded = runtime.grounded;

    // ---- facing: the body turns toward where he is going; he never slides sideways
    let targetSpeed = 0;
    let turnRate = 0;
    runtime.turningInPlace = 0;
    if (mag > 0.05) {
      const want = Math.atan2(wishX, wishZ);
      const diff = wrap(want - runtime.facing);
      const fast = smoothstep(GAIT.jog, GAIT.sprint, s.speed);
      const maxTurn = s.speed < 0.3 ? TUNING.turnStill : TUNING.turnWalk + (TUNING.turnSprint - TUNING.turnWalk) * fast;
      // eased approach: quick for big corrections, gentle for small ones (no snapping, no jitter)
      const step = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn * dt, Math.abs(diff) * Math.min(1, 10 * dt) + 0.6 * dt);
      if (grounded) { runtime.facing = wrap(runtime.facing + step); turnRate = step / Math.max(dt, 1e-4); }
      const pivot = s.speed < 0.35 && Math.abs(diff) > TUNING.pivotAngle;
      if (pivot) runtime.turningInPlace = Math.sign(diff);
      // slow down through sharp turns instead of skating round them
      targetSpeed = pivot ? 0 : gait * mag * smoothstep(-0.3, 0.85, Math.cos(diff));
    }

    // ---- speed along the facing direction with human acceleration / deceleration
    const prevSpeed = s.speed;
    if (grounded) {
      const rate = targetSpeed > s.speed ? (targetSpeed > GAIT.jog + 0.2 ? TUNING.sprintAccel : TUNING.accel) : TUNING.decel;
      s.speed += Math.sign(targetSpeed - s.speed) * Math.min(Math.abs(targetSpeed - s.speed), rate * dt);
      s.vel.set(Math.sin(runtime.facing) * s.speed, 0, Math.cos(runtime.facing) * s.speed);
    } else if (mag > 0.05) {
      // a little air control, no mid-air spinning
      s.vel.x += (wishX * gait - s.vel.x) * TUNING.airControl * dt;
      s.vel.z += (wishZ * gait - s.vel.z) * TUNING.airControl * dt;
    }

    // ---- jump: coyote time + input buffering, only on a fresh press
    const jumpPressed = (k.jump || touch.jump) && canMove;
    if (jumpPressed && !s.jumpHeld) s.buffer = TUNING.buffer;
    s.jumpHeld = jumpPressed;
    touch.jump = false;
    s.coyote = grounded ? TUNING.coyote : Math.max(0, s.coyote - dt);
    s.buffer = Math.max(0, s.buffer - dt);
    if (s.buffer > 0 && s.coyote > 0) { s.vy = TUNING.jump; s.buffer = 0; s.coyote = 0; }

    // ---- gravity
    if (grounded && s.vy <= 0) s.vy = -2; // keep contact on slopes/steps
    else s.vy = Math.max(TUNING.maxFall, s.vy + TUNING.gravity * dt);

    // ---- collide and slide
    const desired = { x: s.vel.x * dt, y: s.vy * dt, z: s.vel.z * dt };
    controller.computeColliderMovement(col, desired, rapier.QueryFilterFlags.EXCLUDE_SENSORS);
    const m = controller.computedMovement();
    const p = b.translation();
    const next = { x: p.x + m.x, y: p.y + m.y, z: p.z + m.z };
    b.setNextKinematicTranslation(next);
    const nowGrounded = controller.computedGrounded();
    if (s.vy > 0 && m.y < desired.y * 0.5) s.vy = 0; // bonked a ceiling
    // walking into a wall: the legs slow down with the body instead of running on the spot
    if (dt > 0) {
      const actual = Math.hypot(m.x, m.z) / dt;
      if (nowGrounded && actual < s.speed - 0.05) s.speed = Math.max(actual, s.speed - TUNING.decel * dt);
      if (!nowGrounded) { s.vel.x = m.x / dt; s.vel.z = m.z / dt; }
    }

    // ---- publish state for the animation system
    s.airTime = nowGrounded ? 0 : s.airTime + dt;
    runtime.grounded = nowGrounded || s.airTime < 0.06;
    runtime.speed = grounded ? s.speed : Math.hypot(s.vel.x, s.vel.z);
    // low-passed: raw frame-to-frame acceleration spikes on wall contact and would jerk the upper body
    const rawAccel = THREE.MathUtils.clamp((s.speed - prevSpeed) / Math.max(dt, 1e-4), -12, 12);
    runtime.accel += (rawAccel - runtime.accel) * Math.min(1, 5 * dt);
    runtime.turnRate += (turnRate - runtime.turnRate) * Math.min(1, 12 * dt);
    runtime.vy = s.vy;
    const v = runtime.speed;
    runtime.anim = !runtime.grounded ? (s.vy > 0 ? 'jump' : 'fall')
      : runtime.turningInPlace ? 'turn'
      : v < 0.15 ? 'idle'
      : runtime.accel > 1.5 && v < GAIT.jog * 0.8 ? 'start'
      : runtime.accel < -2 && targetSpeed < v ? 'stop'
      : v < 2.0 ? 'walk' : v < 3.6 ? 'jog' : v < 4.6 ? 'run' : 'sprint';
    runtime.position.set(next.x, next.y - FEET, next.z);
    runtime.velocity.set(s.vel.x, s.vy, s.vel.z);
    if (visual.current) visual.current.rotation.y = runtime.facing;

    // fell out of the world → back to the plaza
    if (next.y < -30) runtime.teleport = SPAWN.clone();
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start.toArray()} enabledRotations={[false, false, false]}>
      <CapsuleCollider ref={(c) => { collider.current = (c as unknown as Collider) ?? null; }} args={[CAPSULE.halfHeight, CAPSULE.radius]} />
      <group ref={visual} position={[0, -FEET, 0]}>
        <CharacterModel />
      </group>
    </RigidBody>
  );
}
