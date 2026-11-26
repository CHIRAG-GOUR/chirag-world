'use client';
// Warm late-afternoon light: physical sky, sun with player-following shadows, matched fog,
// local reflection environment (no downloaded HDRI), and restrained post-processing.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO, SMAA, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { runtime } from '../player/runtime';
import { useSettings } from '../state/stores';
import { qualities } from '../data/world';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.42, -0.72).normalize(); // low sun from the north-west
const FOG = '#d9d3c7';

export function Lighting() {
  const q = qualities[useSettings(s => s.quality)];
  const sun = useRef<THREE.DirectionalLight>(null);
  const get = useThree(s => s.get);

  useEffect(() => {
    const { scene, camera } = get();
    scene.fog = new THREE.Fog(FOG, q.drawDistance * 0.45, q.drawDistance * 1.05);
    scene.background = new THREE.Color(FOG);
    (camera as THREE.PerspectiveCamera).far = q.drawDistance + 200;
    camera.updateProjectionMatrix();
  }, [q.drawDistance, get]);

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.castShadow = q.shadows > 0;
    if (q.shadows) {
      l.shadow.mapSize.set(q.shadows, q.shadows);
      l.shadow.map?.dispose();
      l.shadow.map = null;
    }
  }, [q.shadows]);

  // keep a tight shadow frustum centred on the player (texel-snapped to avoid shimmering)
  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const p = runtime.position;
    const texel = 70 / (q.shadows || 1024);
    const cx = Math.round(p.x / texel) * texel, cz = Math.round(p.z / texel) * texel;
    l.target.position.set(cx, 0, cz);
    l.position.set(cx + SUN_DIR.x * 120, SUN_DIR.y * 120, cz + SUN_DIR.z * 120);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      <Sky distance={4500} sunPosition={SUN_DIR.toArray()} turbidity={5.5} rayleigh={1.3} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <hemisphereLight args={['#fff1dc', '#5a5045', 0.35]} />
      <directionalLight
        ref={sun}
        color="#ffe2b8"
        intensity={3.6}
        castShadow
        shadow-bias={-0.00025}
        shadow-normalBias={0.04}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={1}
        shadow-camera-far={320}
      />
      {/* reflection environment: soft sky dome + warm sun card, rendered once */}
      <Environment resolution={256} frames={1} environmentIntensity={0.42}>
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial side={THREE.BackSide} color="#bcd3e0" />
        </mesh>
        <Lightformer form="rect" intensity={2.2} color="#fff1dc" position={[0, 40, 0]} scale={[120, 120, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="circle" intensity={6} color="#ffd9a3" position={SUN_DIR.clone().multiplyScalar(60).toArray()} scale={18} />
        <Lightformer form="rect" intensity={0.8} color="#cdbfa8" position={[0, -10, 0]} scale={[200, 200, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
    </>
  );
}

export function PostFX() {
  const q = qualities[useSettings(s => s.quality)];
  if (q.id === 'low') return null; // renderer tone mapping only
  return (
    <EffectComposer multisampling={q.id === 'ultra' ? 4 : 0} enableNormalPass={false}>
      {q.ao !== 'off' ? (
        <N8AO aoRadius={2.2} distanceFalloff={1} intensity={q.ao === 'ultra' ? 2.6 : 2.2} halfRes={q.ao === 'half'} quality={q.ao === 'ultra' ? 'high' : 'medium'} color="#2b241c" />
      ) : <></>}
      {q.bloom ? <Bloom intensity={0.22} luminanceThreshold={1.1} luminanceSmoothing={0.2} mipmapBlur /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.35} />
      {q.smaa ? <SMAA /> : <></>}
    </EffectComposer>
  );
}
