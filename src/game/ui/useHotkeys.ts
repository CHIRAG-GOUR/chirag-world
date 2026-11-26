'use client';
// Global hotkeys: E interact · Tab map · M minimap · C camera mode · Esc pause/close.
import { useEffect } from 'react';
import { useProgress, useSession, useSettings, type CameraMode } from '../state/stores';
import { interactableById } from '../data/interactables';
import { runtime, HOME } from '../player/runtime';
import { notify } from '../systems/notify';
import * as THREE from 'three';

export function openInteractable(id: string) {
  const it = interactableById[id];
  if (!it || it.kind === 'zone') return;
  if (it.kind === 'action') {
    if (id === 'desk' && runtime.seated) { runtime.seated = false; runtime.teleport = HOME.standUp.clone(); runtime.cameraDistance = 4.2; }
    useProgress.getState().markInteracted(id);
    return;
  }
  useSession.getState().openPanel({ type: 'interactable', id });
  useProgress.getState().markInteracted(id);
}

const CAMERA_CYCLE: CameraMode[] = ['third', 'first', 'cinematic'];

/** F: get into the nearby car, or step out on the driver's side. */
export function toggleCar() {
  if (useSession.getState().panel) return;
  if (runtime.driving) {
    if (Math.abs(runtime.car.speed) > 6) { notify('Slow down to get out'); return; }
    runtime.driving = false;
    const side = new THREE.Vector3(Math.cos(runtime.car.yaw), 0, -Math.sin(runtime.car.yaw)).multiplyScalar(-2.4);
    runtime.teleport = runtime.car.position.clone().add(side).setY(runtime.car.position.y + 1.3);
    return;
  }
  if (runtime.carNear && !runtime.seated) {
    runtime.driving = true;
    useProgress.getState().markInteracted('car');
  }
}

export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useSession.getState();
      if (s.phase !== 'playing') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      switch (e.code) {
        case 'KeyE':
          if (!s.panel && s.nearest) openInteractable(s.nearest);
          break;
        case 'KeyF':
          toggleCar();
          break;
        case 'Tab':
          e.preventDefault();
          if (s.panel?.type === 'map') s.closePanel();
          else if (!s.panel || s.panel.type !== 'pause') s.openPanel({ type: 'map' });
          break;
        case 'KeyM':
          useSettings.getState().set({ minimap: !useSettings.getState().minimap });
          break;
        case 'KeyC': {
          const cur = useSettings.getState().cameraMode;
          useSettings.getState().set({ cameraMode: CAMERA_CYCLE[(CAMERA_CYCLE.indexOf(cur) + 1) % CAMERA_CYCLE.length] });
          break;
        }
        case 'Escape':
          if (s.panel) s.closePanel();
          else s.openPanel({ type: 'pause' });
          break;
      }
    };
    // Browsers swallow Esc while the pointer is locked; losing the lock unexpectedly = pause.
    let wasLocked = false;
    const onLock = () => {
      const locked = !!document.pointerLockElement;
      const s = useSession.getState();
      if (wasLocked && !locked && s.phase === 'playing' && !s.panel) s.openPanel({ type: 'pause' });
      wasLocked = locked;
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, []);
}
