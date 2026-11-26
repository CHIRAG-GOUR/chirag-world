'use client';
// The 3D scene: renderer, physics world, city, player, camera and frame systems.
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import City from './world/City';
import Plaza from './world/Plaza';
import Districts from './world/Districts';
import Home from './world/Home';
import Car from './vehicle/Car';
import Waypoint from './systems/Waypoint';
import { Lighting, PostFX } from './world/Atmosphere';
import Player from './player/Player';
import CameraRig from './camera/CameraRig';
import { InteractionSystem, IntroCamera } from './systems/Systems';
import { useSession, useSettings } from './state/stores';
import { qualities } from './data/world';
import { runtime } from './player/runtime';

const keyMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'jump', keys: ['Space'] },
];

/** Low quality skips the composer, so the renderer does the tone mapping itself. */
function RendererSettings() {
  const get = useThree(s => s.get);
  const q = useSettings(s => s.quality);
  useEffect(() => {
    const { gl } = get();
    gl.toneMapping = q === 'low' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = 1;
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __r3f: get, __runtime: runtime }); // dev-only inspection
  }, [get, q]);
  return null;
}

function Ready() {
  useEffect(() => {
    if (useSession.getState().phase === 'loading') useSession.getState().setPhase('intro');
  }, []);
  return null;
}

export default function Experience() {
  const q = qualities[useSettings(s => s.quality)];
  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        shadows={q.shadows > 0}
        dpr={[Math.min(0.75, q.dpr), q.dpr]}
        camera={{ fov: 55, near: 0.1, far: q.drawDistance + 200, position: [0, 80, 200] }}
        gl={{ antialias: q.id === 'low', powerPreference: 'high-performance', stencil: false }}
        style={{ position: 'fixed', inset: 0 }}
      >
        <RendererSettings />
        <Lighting />
        <Suspense fallback={null}>
          <Physics gravity={[0, -24, 0]} interpolate>
            <City />
            <Plaza />
            <Districts />
            <Home />
            <Car />
            <Player />
            <CameraRig />
          </Physics>
          <Ready />
        </Suspense>
        <Waypoint />
        <InteractionSystem />
        <IntroCamera />
        <PostFX />
      </Canvas>
    </KeyboardControls>
  );
}
