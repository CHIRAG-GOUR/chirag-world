'use client';
// Third-person / first-person / cinematic camera with obstruction handling.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { runtime } from '../player/runtime';
import { touch } from '../player/touch';
import { useSession, useSettings } from '../state/stores';

const PITCH_MIN = -0.35, PITCH_MAX = 1.25;
const HEAD = 1.62;

export default function CameraRig() {
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  const smoothPos = useRef(new THREE.Vector3(0, 6, 42));
  const smoothTarget = useRef(new THREE.Vector3(0, 2, 33));
  const dragging = useRef(false);
  const zoomTarget = useRef(runtime.cameraDistance);

  // ---- input: pointer lock + mouse look, drag fallback, wheel zoom
  useEffect(() => {
    const el = gl.domElement;
    const look = (dx: number, dy: number) => {
      const { sensitivity, invertY } = useSettings.getState();
      const k = 0.0022 * sensitivity;
      runtime.cameraYaw -= dx * k;
      runtime.cameraPitch = THREE.MathUtils.clamp(runtime.cameraPitch + dy * k * (invertY ? -1 : 1), PITCH_MIN, PITCH_MAX);
    };
    const onMove = (e: MouseEvent) => {
      const s = useSession.getState();
      if (s.phase !== 'playing' || s.panel) return;
      if (document.pointerLockElement === el || dragging.current) look(e.movementX, e.movementY);
    };
    const onDown = (e: MouseEvent) => {
      const s = useSession.getState();
      if (s.phase !== 'playing' || s.panel) return;
      if (e.button === 0 && document.pointerLockElement !== el) {
        // request pointer lock; if the browser refuses (iframes, etc.) dragging still works
        try { const r = el.requestPointerLock?.() as unknown; if (r instanceof Promise) r.catch(() => {}); } catch { /* ignore */ }
      }
      dragging.current = true;
    };
    const onUp = () => { dragging.current = false; };
    const onWheel = (e: WheelEvent) => {
      if (useSession.getState().panel) return;
      zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current + e.deltaY * 0.01, 3, 13);
    };
    const onLock = () => useSession.getState().setPointerLocked(document.pointerLockElement === el);
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    el.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, [gl]);

  // release pointer lock whenever a panel opens
  useEffect(() => useSession.subscribe((s, prev) => {
    if (s.panel && !prev.panel && document.pointerLockElement) document.exitPointerLock();
  }), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const session = useSession.getState();
    if (session.phase === 'intro' || session.phase === 'loading') return; // intro owns the camera
    const mode = useSettings.getState().cameraMode;

    // touch look
    if (touch.look.dx || touch.look.dy) {
      const k = 0.005 * useSettings.getState().sensitivity;
      runtime.cameraYaw -= touch.look.dx * k;
      runtime.cameraPitch = THREE.MathUtils.clamp(runtime.cameraPitch + touch.look.dy * k, PITCH_MIN, PITCH_MAX);
      touch.look.dx = touch.look.dy = 0;
    }

    // driving: chase camera that swings in behind the car
    if (runtime.driving) {
      const cp = runtime.car.position;
      const behind = runtime.car.yaw + Math.PI;
      if (Math.abs(runtime.car.speed) > 1.5) {
        let d = behind - runtime.cameraYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        runtime.cameraYaw += d * Math.min(1, 3 * dt);
      }
      const target = new THREE.Vector3(cp.x, cp.y + 1.3, cp.z);
      const pitch = Math.max(0.12, Math.min(0.6, runtime.cameraPitch * 0.7));
      const dirC = new THREE.Vector3(Math.sin(runtime.cameraYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(runtime.cameraYaw) * Math.cos(pitch));
      let dist = 8.5 + Math.min(4, Math.abs(runtime.car.speed) * 0.08);
      const rayC = new rapier.Ray(target, dirC);
      const hitC = world.castRay(rayC, dist, true, rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS);
      if (hitC) dist = Math.max(2, hitC.timeOfImpact - 0.4);
      smoothPos.current.lerp(target.clone().addScaledVector(dirC, dist), 1 - Math.exp(-10 * dt));
      smoothTarget.current.lerp(target, 1 - Math.exp(-14 * dt));
      camera.position.copy(smoothPos.current);
      camera.lookAt(smoothTarget.current);
      return;
    }

    const head = new THREE.Vector3(runtime.position.x, runtime.position.y + HEAD, runtime.position.z);

    if (mode === 'first') {
      const dir = new THREE.Vector3(-Math.sin(runtime.cameraYaw) * Math.cos(runtime.cameraPitch), -Math.sin(runtime.cameraPitch) + 0.15, -Math.cos(runtime.cameraYaw) * Math.cos(runtime.cameraPitch));
      camera.position.lerp(head.clone().add(new THREE.Vector3(0, 0.2, 0)), 1 - Math.exp(-25 * dt));
      camera.lookAt(camera.position.clone().add(dir));
      return;
    }
    if (mode === 'cinematic') runtime.cameraYaw += dt * 0.12;

    runtime.cameraDistance += (zoomTarget.current - runtime.cameraDistance) * (1 - Math.exp(-10 * dt));
    const pitch = runtime.cameraPitch, yaw = runtime.cameraYaw;
    let dist = mode === 'cinematic' ? Math.max(runtime.cameraDistance, 9) : runtime.cameraDistance;
    const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    // obstruction: cast from the head toward the camera; pull in front of the first hit
    const ray = new rapier.Ray(head, offset);
    const hit = world.castRay(ray, dist, true, rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS);
    if (hit) dist = Math.max(1.2, hit.timeOfImpact - 0.35);

    const desired = head.clone().addScaledVector(offset, dist);
    desired.y = Math.max(desired.y, runtime.position.y + 0.4);
    const posK = 1 - Math.exp(-(hit ? 30 : 12) * dt); // snap in fast when blocked, ease out slowly
    smoothPos.current.lerp(desired, posK);
    smoothTarget.current.lerp(head, 1 - Math.exp(-16 * dt));
    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}
