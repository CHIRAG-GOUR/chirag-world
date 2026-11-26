'use client';
// District 1 — Central Plaza: the hub where every visit starts.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text3D, Text, Center } from '@react-three/drei';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { useMaterials } from './materials';
import { tiledBox, merge } from './geometry';
import { PLAZA_HALF, PLAZA_R, streetLines, CITY_HALF } from './layout';
import { Trees } from './City';
import { districts, missions } from '../data/world';
import { profile } from '../data/portfolio';

const FONT_3D = '/fonts/helvetiker_bold.typeface.json';
export const FONT_UI = '/fonts/Geist-Regular.ttf';

function mapTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const k = S / (CITY_HALF * 2 + 40), o = S / 2;
  g.fillStyle = '#efe9dc'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#d9d1c1';
  streetLines.forEach(l => { g.fillRect(o + l * k - 7 * k, 0, 14 * k, S); g.fillRect(0, o + l * k - 7 * k, S, 14 * k); });
  districts.forEach(d => {
    g.fillStyle = d.color + 'cc';
    g.beginPath(); g.arc(o + d.center[0] * k, o + d.center[1] * k, d.radius * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1c1b19'; g.font = '600 26px Georgia, serif'; g.textAlign = 'center';
    g.fillText(d.short.toUpperCase(), o + d.center[0] * k, o + d.center[1] * k + 9);
  });
  g.strokeStyle = '#1c1b19'; g.lineWidth = 6; g.strokeRect(3, 3, S - 6, S - 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Fountain() {
  const M = useMaterials();
  const jets = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    jets.current?.children.forEach((j, i) => {
      const s = 1 + Math.sin(clock.elapsedTime * 2.2 + i * 0.9) * 0.08;
      j.scale.set(1, s, 1);
    });
  });
  const jetMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dbeef2', transparent: true, opacity: 0.55, roughness: 0.1, emissive: '#9fc9d2', emissiveIntensity: 0.15 }), []);
  return (
    <group>
      {/* pool: limestone rim + dark reflective water */}
      <mesh position={[0, 0.45, 0]} material={M.limestone} castShadow receiveShadow>
        <cylinderGeometry args={[10, 10.3, 0.7, 64]} />
      </mesh>
      <mesh position={[0, 0.78, 0]} rotation-x={-Math.PI / 2} material={M.water}>
        <circleGeometry args={[9.4, 64]} />
      </mesh>
      {/* central sculpture: stacked stone discs with a bronze ring */}
      <mesh position={[0, 1.3, 0]} material={M.stoneDark} castShadow>
        <cylinderGeometry args={[1.6, 2, 1.1, 32]} />
      </mesh>
      <mesh position={[0, 2.2, 0]} material={M.limestone} castShadow>
        <cylinderGeometry args={[1.1, 1.3, 0.8, 32]} />
      </mesh>
      <mesh position={[0, 3.6, 0]} rotation-x={Math.PI / 2} material={M.bronze} castShadow>
        <torusGeometry args={[1.25, 0.12, 16, 64]} />
      </mesh>
      <group ref={jets}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 5.5, 1.5, Math.sin(a) * 5.5]} material={jetMat}>
              <cylinderGeometry args={[0.05, 0.12, 1.5, 8]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Monument() {
  const M = useMaterials();
  return (
    <group position={[0, 0.22, -25]}>
      <mesh position={[0, 0.6, 0]} material={M.limestone} castShadow receiveShadow>
        <boxGeometry args={[32, 1.2, 3.6]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={M.stoneDark} receiveShadow>
        <boxGeometry args={[33.5, 0.1, 5]} />
      </mesh>
      <Center position={[0, 3.05, 0]} disableY>
        <Text3D font={FONT_3D} size={3.1} height={0.7} bevelEnabled bevelSize={0.05} bevelThickness={0.06} curveSegments={6} letterSpacing={0.18} material={M.bronze} castShadow>
          {profile.name.toUpperCase()}
        </Text3D>
      </Center>
      <Text font={FONT_UI} fontSize={0.46} color="#3b342c" position={[0, 0.62, 1.81]} anchorX="center" anchorY="middle" letterSpacing={0.12}>
        {profile.roles.slice(0, 3).join('  ·  ').toUpperCase()}
      </Text>
    </group>
  );
}

function MapTable() {
  const M = useMaterials();
  const tex = useMemo(() => mapTexture(), []);
  return (
    <group position={[17, 0.22, 8]} rotation-y={-Math.PI / 2.6}>
      <mesh position={[0, 0.5, 0]} material={M.stoneDark} castShadow><boxGeometry args={[1.2, 1, 1.2]} /></mesh>
      <mesh position={[0, 1.05, 0]} rotation-x={-0.35} material={M.bronze} castShadow><boxGeometry args={[3.2, 0.12, 2.4]} /></mesh>
      <mesh position={[0, 1.115, 0.02]} rotation-x={-Math.PI / 2 - 0.35}>
        <planeGeometry args={[3, 2.2]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  );
}

function MissionBoard() {
  const M = useMaterials();
  return (
    <group position={[-17, 0.22, 8]} rotation-y={Math.PI / 2.6}>
      {[-1.6, 1.6].map(x => (
        <mesh key={x} position={[x, 1.4, 0]} material={M.metal} castShadow><boxGeometry args={[0.14, 2.8, 0.14]} /></mesh>
      ))}
      <mesh position={[0, 1.9, 0]} material={M.wood} castShadow><boxGeometry args={[3.6, 2, 0.12]} /></mesh>
      <mesh position={[0, 1.9, 0.065]}><planeGeometry args={[3.3, 1.75]} /><meshStandardMaterial color="#f4efe4" roughness={0.9} /></mesh>
      <Text font={FONT_UI} fontSize={0.2} color="#1c1b19" position={[-1.5, 2.6, 0.07]} anchorX="left" anchorY="top" letterSpacing={0.1}>MISSIONS</Text>
      {missions.slice(0, 7).map((m, i) => (
        <Text key={m.id} font={FONT_UI} fontSize={0.13} color="#3b342c" position={[-1.5, 2.3 - i * 0.19, 0.07]} anchorX="left" anchorY="top">
          {`${i + 1}.  ${m.title}`}
        </Text>
      ))}
    </group>
  );
}

function Kiosk() {
  const M = useMaterials();
  return (
    <group position={[7, 0.22, 25]} rotation-y={Math.PI}>
      <mesh position={[0, 1.3, 0]} material={M.limestone} castShadow><boxGeometry args={[0.5, 2.6, 0.5]} /></mesh>
      <mesh position={[0, 2.75, 0]} material={M.metal} castShadow><boxGeometry args={[1.8, 0.12, 1.2]} /></mesh>
      <mesh position={[0, 1.6, 0.27]}><planeGeometry args={[0.42, 1.2]} /><meshStandardMaterial color="#1f3a44" emissive="#3c7584" emissiveIntensity={0.5} roughness={0.2} /></mesh>
      <Text font={FONT_UI} fontSize={0.12} color="#e8f3f5" position={[0, 2.05, 0.28]} anchorX="center" maxWidth={0.4} textAlign="center">INFO</Text>
    </group>
  );
}

/** Tree planters + benches + lamps around the ring, with gaps for the four boulevards. */
function Ring() {
  const M = useMaterials();
  const { planters, benches, trees, lamps } = useMemo(() => {
    const planters: { x: number; z: number; a: number }[] = [];
    const benches: { x: number; z: number; a: number }[] = [];
    const lamps: { x: number; z: number; r: number }[] = [];
    const trees: { x: number; z: number; r: number; s: number; v: number }[] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      const near = Math.min(...[0, 0.5, 1, 1.5, 2].map(q => Math.abs(((a / Math.PI) - q))));
      if (near < 0.09) continue; // keep the boulevard axes open
      const r = 37;
      planters.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, a });
      trees.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: i, s: 1.05, v: i % 3 });
      const b = a + Math.PI / n;
      const nb = Math.min(...[0, 0.5, 1, 1.5, 2].map(q => Math.abs(((b / Math.PI) - q))));
      if (nb > 0.06) benches.push({ x: Math.cos(b) * 33, z: Math.sin(b) * 33, a: b });
      lamps.push({ x: Math.cos(b) * 41, z: Math.sin(b) * 41, r: -b + Math.PI / 2 });
    }
    // corner gardens of the plaza square
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 0; k < 4; k++) trees.push({ x: sx * (PLAZA_HALF - 5 - (k % 2) * 6), z: sz * (PLAZA_HALF - 5 - Math.floor(k / 2) * 6), r: k, s: 1.2, v: (k + 1) % 3 });
    }
    return { planters, benches, trees, lamps };
  }, []);

  const benchGeo = useMemo(() => merge([tiledBox(2.2, 0.12, 0.6, 0, 0.5, 0), tiledBox(2.2, 0.5, 0.1, 0, 0.8, -0.28), tiledBox(0.12, 0.45, 0.5, -0.95, 0.22, 0), tiledBox(0.12, 0.45, 0.5, 0.95, 0.22, 0)]), []);

  return (
    <group>
      {planters.map((p, i) => (
        <mesh key={i} position={[p.x, 0.65, p.z]} rotation-y={-p.a} material={M.concrete} castShadow receiveShadow>
          <cylinderGeometry args={[2.1, 2.2, 0.9, 24]} />
        </mesh>
      ))}
      {benches.map((b, i) => (
        <mesh key={i} geometry={benchGeo} position={[b.x, 0.22, b.z]} rotation-y={-b.a - Math.PI / 2} material={M.wood} castShadow receiveShadow />
      ))}
      <Trees items={trees.map(t => ({ ...t, y: 1 }))} />
      <PlazaLamps items={lamps} />
      <RigidBody type="fixed" colliders={false}>
        {planters.map((p, i) => <CylinderCollider key={i} args={[0.6, 2.2]} position={[p.x, 0.7, p.z]} />)}
      </RigidBody>
    </group>
  );
}

function PlazaLamps({ items }: { items: { x: number; z: number; r: number }[] }) {
  const M = useMaterials();
  return (
    <group>
      {items.map((l, i) => (
        <group key={i} position={[l.x, 0.22, l.z]}>
          <mesh position={[0, 2, 0]} material={M.metal} castShadow><cylinderGeometry args={[0.06, 0.09, 4, 8]} /></mesh>
          <mesh position={[0, 4.15, 0]} material={M.lampGlow}><sphereGeometry args={[0.22, 16, 12]} /></mesh>
          <mesh position={[0, 4.42, 0]} material={M.metal}><cylinderGeometry args={[0.05, 0.3, 0.14, 16]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export default function Plaza() {
  const M = useMaterials();
  const ground = useMemo(() => {
    const grass = tiledBox(PLAZA_HALF * 2, 0.2, PLAZA_HALF * 2, 0, 0.1, 0, 6);
    // boulevard entry paths from the circle to the square edge
    const paths = [
      tiledBox(14, 0.04, PLAZA_HALF - PLAZA_R + 2, 0, 0.215, PLAZA_R + (PLAZA_HALF - PLAZA_R) / 2 - 1, 4),
      tiledBox(14, 0.04, PLAZA_HALF - PLAZA_R + 2, 0, 0.215, -(PLAZA_R + (PLAZA_HALF - PLAZA_R) / 2 - 1), 4),
      tiledBox(PLAZA_HALF - PLAZA_R + 2, 0.04, 14, PLAZA_R + (PLAZA_HALF - PLAZA_R) / 2 - 1, 0.215, 0, 4),
      tiledBox(PLAZA_HALF - PLAZA_R + 2, 0.04, 14, -(PLAZA_R + (PLAZA_HALF - PLAZA_R) / 2 - 1), 0.215, 0, 4),
    ];
    return { grass, paths: merge(paths) };
  }, []);
  const disc = useMemo(() => {
    const g = new THREE.CircleGeometry(PLAZA_R, 96);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * PLAZA_R * 2) / 4, (uv.getY(i) * PLAZA_R * 2) / 4);
    return g;
  }, []);

  return (
    <group>
      <mesh geometry={ground.grass} material={M.grass} receiveShadow />
      <mesh geometry={ground.paths} material={M.paving} receiveShadow />
      <mesh geometry={disc} material={M.paving} rotation-x={-Math.PI / 2} position-y={0.22} receiveShadow />
      {/* inlaid bands */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.225} material={M.stoneDark} receiveShadow><ringGeometry args={[29, 29.8, 96]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.225} material={M.stoneDark} receiveShadow><ringGeometry args={[12.2, 12.8, 96]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.225} material={M.bronze} receiveShadow><ringGeometry args={[PLAZA_R - 0.5, PLAZA_R, 128]} /></mesh>
      <Fountain />
      <Monument />
      <MapTable />
      <MissionBoard />
      <Kiosk />
      <Ring />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 10.3]} position={[0, 0.6, 0]} />
        <CuboidCollider args={[16, 3, 1.8]} position={[0, 3, -25]} />
        <CuboidCollider args={[1, 1, 1]} position={[17, 1, 8]} />
        <CuboidCollider args={[1.8, 1.4, 0.3]} position={[-17, 1.4, 8]} rotation={[0, Math.PI / 2.6, 0]} />
        <CuboidCollider args={[0.4, 1.4, 0.4]} position={[7, 1.4, 25]} />
        {/* the raised plaza slab is a step, not a wall */}
        <CuboidCollider args={[PLAZA_HALF, 0.11, PLAZA_HALF]} position={[0, 0.11, 0]} />
      </RigidBody>
    </group>
  );
}
