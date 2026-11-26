'use client';
// Frame systems: nearest-interactable scan, district discovery, autosave, intro camera.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { interactables } from '../data/interactables';
import { districts } from '../data/world';
import { runtime } from '../player/runtime';
import { useProgress, useSession, useSettings } from '../state/stores';
import { notify } from './notify';

export function InteractionSystem() {
  const saveT = useRef(0);
  useFrame((_, dt) => {
    const session = useSession.getState();
    if (session.phase !== 'playing') return;
    const p = runtime.position;

    // nearest interactable within its radius (planar distance)
    let best: string | null = null, bestD = Infinity;
    for (const it of interactables) {
      const d = Math.hypot(p.x - it.position[0], p.z - it.position[2]);
      if (it.kind === 'zone') { if (d < it.radius && !runtime.driving) useProgress.getState().markInteracted(it.id); continue; }
      if (it.kind === 'action' && it.id === 'desk' && !runtime.seated) continue;
      if (runtime.driving) continue;
      if (d < it.radius && d < bestD) { best = it.id; bestD = d; }
    }
    session.setNearest(best);

    // district discovery: real entry into a district's area
    let current: (typeof districts)[number] | null = null;
    for (const d of districts) {
      if (Math.hypot(p.x - d.center[0], p.z - d.center[1]) < d.radius) { current = d; break; }
    }
    session.setDistrict(current ? current.id : null);
    if (current && useProgress.getState().discoverDistrict(current.id)) notify(`District discovered · ${current.name}`);

    // autosave position every 3 s
    saveT.current += dt;
    if (saveT.current > 3) {
      saveT.current = 0;
      useProgress.getState().savePosition([+p.x.toFixed(2), +(p.y + 1.2).toFixed(2), +p.z.toFixed(2)]);
    }
  });
  return null;
}

/** Title-screen orbit + fly-in to the player. Hands the camera to CameraRig when finished. */
export function IntroCamera() {
  const { camera } = useThree();
  const flight = useRef<{ t: number; from: THREE.Vector3; fromLook: THREE.Vector3 } | null>(null);
  const look = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    const s = useSession.getState();
    if (s.phase === 'intro') {
      // inside the room: a slow dolly past the posters toward Chirag at his desk
      const t = state.clock.elapsedTime;
      camera.position.set(27.9 + Math.sin(t * 0.18) * 0.35, 1.75 + Math.sin(t * 0.22) * 0.05, 87.3);
      look.current.set(30.25, 1.12, 90.7);
      camera.lookAt(look.current);
      flight.current = null;
      return;
    }
    if (s.phase !== 'playing' || runtime.inputEnabled) return;
    // fly-in requested (inputEnabled=false while flying)
    if (!flight.current) flight.current = { t: 0, from: camera.position.clone(), fromLook: look.current.clone() };
    const f = flight.current;
    const dur = useSettings.getState().reducedMotion ? 0.01 : 2.2;
    f.t = Math.min(1, f.t + dt / dur);
    const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2; // easeInOutCubic
    const head = new THREE.Vector3(runtime.position.x, runtime.position.y + 1.75, runtime.position.z);
    const yaw = runtime.cameraYaw, pitch = runtime.cameraPitch, d = runtime.cameraDistance;
    const end = head.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d));
    // arc over the plaza: lift the midpoint
    const mid = f.from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, Math.min(40, f.from.distanceTo(end) * 0.15), 0));
    const a = f.from.clone().lerp(mid, e), b = mid.clone().lerp(end, e);
    camera.position.copy(a.lerp(b, e));
    camera.lookAt(f.fromLook.clone().lerp(head, e));
    if (f.t >= 1) { runtime.inputEnabled = true; flight.current = null; }
  });
  return null;
}
