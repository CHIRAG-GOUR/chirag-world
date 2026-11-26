'use client';
// In-world guidance: a soft light column + floating marker over the current objective.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useProgress } from '../state/stores';
import { currentObjective } from './objective';
import { runtime } from '../player/runtime';

export default function Waypoint() {
  const group = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const column = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const obj = currentObjective(useProgress.getState().missionsDone);
    const near = obj ? Math.hypot(runtime.position.x - obj.position.x, runtime.position.z - obj.position.z) < 3 : true;
    g.visible = !!obj && !near && !runtime.seated;
    if (!obj) return;
    g.position.set(obj.position.x, obj.position.y, obj.position.z);
    const t = clock.elapsedTime;
    if (marker.current) { marker.current.position.y = 4.2 + Math.sin(t * 2) * 0.25; marker.current.rotation.y = t * 1.2; }
    if (column.current) (column.current.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(t * 2) * 0.04;
  });
  return (
    <group ref={group}>
      <mesh ref={column} position={[0, 14, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 28, 24, 1, true]} />
        <meshBasicMaterial color="#e8803a" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={marker} position={[0, 4.2, 0]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#c2410c" emissive="#c2410c" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.27, 0]}>
        <ringGeometry args={[1.1, 1.35, 48]} />
        <meshBasicMaterial color="#c2410c" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
