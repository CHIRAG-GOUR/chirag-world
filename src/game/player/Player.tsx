'use client';
// Third-person player: Rapier kinematic capsule driven by a KinematicCharacterController.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { Collider, KinematicCharacterController } from '@dimforge/rapier3d-compat';
import CharacterModel from './CharacterGLB';
import { runtime, SPAWN, HOME } from './runtime';
import { touch } from './touch';
import { useSession, useSettings } from '../state/stores';

export const CAPSULE = { halfHeight: 0.55, radius: 0.42 };
const FEET = CAPSULE.halfHeight + CAPSULE.radius;

const TUNING = {
  walk: 4.2, sprint: 7.6, accel: 18, decel: 22, airControl: 0.35,
  gravity: -24, jump: 8.2, coyote: 0.12, buffer: 0.12, turnRate: 12, maxFall: -40,
};

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

  const state = useRef({ vel: new THREE.Vector3(), vy: 0, coyote: 0, buffer: 0, jumpHeld: false, airTime: 0 });
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
      s.vel.set(0, 0, 0); s.vy = 0;
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
      s.vel.set(0, 0, 0); s.vy = 0;
      runtime.teleport = null;
      return;
    }

    // ---- input (keyboard + touch), camera-relative
    const k = canMove ? getKeys() : { forward: false, back: false, left: false, right: false, sprint: false, jump: false };
    let ix = (k.right ? 1 : 0) - (k.left ? 1 : 0) + (canMove ? touch.move.x : 0);
    let iz = (k.back ? 1 : 0) - (k.forward ? 1 : 0) + (canMove ? touch.move.y : 0);
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const yaw = runtime.cameraYaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const wish = right.multiplyScalar(ix).add(fwd.multiplyScalar(-iz));
    const sprint = k.sprint || touch.sprint;
    const target = wish.multiplyScalar(sprint ? TUNING.sprint : TUNING.walk);

    // ---- horizontal velocity with acceleration / deceleration
    const grounded = runtime.grounded;
    const rate = (target.lengthSq() > 0.01 ? TUNING.accel : TUNING.decel) * (grounded ? 1 : TUNING.airControl);
    const flatVel = new THREE.Vector3(s.vel.x, 0, s.vel.z);
    const delta = target.clone().sub(flatVel);
    const maxStep = rate * dt;
    if (delta.length() > maxStep) delta.setLength(maxStep);
    s.vel.x += delta.x; s.vel.z += delta.z;

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
    // keep actual (collided) horizontal speed so we don't push into walls
    if (dt > 0) { s.vel.x = m.x / dt; s.vel.z = m.z / dt; }

    // ---- facing + animation state
    const hs = Math.hypot(s.vel.x, s.vel.z);
    if (hs > 0.4) {
      const want = Math.atan2(s.vel.x, s.vel.z);
      let d = want - runtime.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      runtime.facing += d * Math.min(1, TUNING.turnRate * dt);
    }
    s.airTime = nowGrounded ? 0 : s.airTime + dt;
    runtime.grounded = nowGrounded || s.airTime < 0.06;
    runtime.speed = hs;
    runtime.anim = !runtime.grounded ? (s.vy > 0 ? 'jump' : 'fall') : hs > 5.5 ? 'run' : hs > 0.35 ? 'walk' : 'idle';
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
