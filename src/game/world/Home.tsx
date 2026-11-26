'use client';
// Chirag's home: a modern house on the block south of the plaza, with his developer room inside.
// Posters and figures are original artwork (no copyrighted characters).
import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMaterials } from './materials';
import { FONT_UI } from './Plaza';
import DeskSetup from './DeskSetup';

// house shell (world coords)
const X0 = 23, X1 = 37, Z0 = 80, Z1 = 92, H = 3.6, T = 0.3;
const DOOR = { x0: 29, x1: 31.2, h: 2.5 };

type PosterArt = (g: CanvasRenderingContext2D, w: number, h: number) => void;
const posters: Record<string, PosterArt> = {
  crimsonMoon: (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1a0b0f'); sky.addColorStop(1, '#3b0d12'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c1121f'; g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.28, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b0507';
    for (let i = 0; i < 7; i++) { const x = w * (0.15 + Math.random() * 0.7), y = h * (0.15 + Math.random() * 0.45), s = 8 + Math.random() * 10; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s / 2, x, y); g.quadraticCurveTo(x + s / 2, y - s / 2, x + s, y); g.quadraticCurveTo(x, y - s / 4, x - s, y); g.fill(); }
    g.fillRect(0, h * 0.78, w, h * 0.22);
    for (let x = 0; x < w; x += 14) { g.beginPath(); g.moveTo(x, h * 0.78); g.lineTo(x + 7, h * (0.6 + Math.random() * 0.12)); g.lineTo(x + 14, h * 0.78); g.fill(); }
    g.fillStyle = '#e5383b'; g.font = 'bold 20px Georgia'; g.textAlign = 'center'; g.fillText('CRIMSON MOON', w / 2, h * 0.93);
  },
  noir: (g, w, h) => {
    g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9e4d8'; g.beginPath(); g.ellipse(w / 2, h * 0.34, w * 0.34, h * 0.05, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(w * 0.34, h * 0.2, w * 0.32, h * 0.14);
    g.fillStyle = '#0d0d0d'; g.fillRect(w * 0.34, h * 0.29, w * 0.32, h * 0.025);
    g.strokeStyle = '#8b0000'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.75); g.quadraticCurveTo(w * 0.47, h * 0.6, w / 2, h * 0.5); g.stroke();
    g.fillStyle = '#b00020'; g.beginPath(); g.arc(w / 2, h * 0.48, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e9e4d8'; g.font = 'italic 22px Georgia'; g.textAlign = 'center'; g.fillText('The Family Business', w / 2, h * 0.9);
  },
  frostAxe: (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#dbe7ee'); bg.addColorStop(1, '#5d7684'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, h * 0.45, 30 + i * 18, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#2b2f33'; g.fillRect(w * 0.48, h * 0.18, w * 0.04, h * 0.6);
    g.fillStyle = '#9fb4c0'; g.beginPath(); g.moveTo(w * 0.52, h * 0.2); g.quadraticCurveTo(w * 0.8, h * 0.22, w * 0.78, h * 0.4); g.quadraticCurveTo(w * 0.65, h * 0.33, w * 0.52, h * 0.36); g.fill();
    g.fillStyle = '#1d262c'; g.font = 'bold 20px Georgia'; g.textAlign = 'center'; g.fillText('WINTER WAR', w / 2, h * 0.92);
  },
  spiral: (g, w, h) => {
    // original art: orange dusk over layered peaks, a lone climber near the top
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#ffb347'); sky.addColorStop(1, '#ff6a00'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff1c1'; g.beginPath(); g.arc(w * 0.7, h * 0.28, 28, 0, Math.PI * 2); g.fill();
    [['#b34700', 0.62], ['#7a2f00', 0.72], ['#3d1700', 0.82]].forEach(([c, y], i) => {
      g.fillStyle = c as string; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, h * (y as number) - Math.abs(Math.sin(x * 0.03 + i)) * 60);
      g.lineTo(w, h); g.fill();
    });
    g.fillStyle = '#1b0b00'; g.fillRect(w * 0.46, h * 0.43, 4, 12); g.beginPath(); g.arc(w * 0.46 + 2, h * 0.43 - 4, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b0b00'; g.font = 'bold 22px Georgia'; g.textAlign = 'center'; g.fillText('KEEP CLIMBING', w / 2, h * 0.93);
  },
  code: (g, w, h) => {
    g.fillStyle = '#f4efe4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c1b19'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText('ship it.', w / 2, h * 0.45);
    g.font = '14px monospace'; g.fillText('git commit -m "one more thing"', w / 2, h * 0.58);
  },
};

function posterTexture(name: keyof typeof posters) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 360;
  const g = c.getContext('2d')!;
  posters[name](g, 256, 360);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1f24'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#26272d'; g.fillRect(0, 0, 90, 320);
  g.fillStyle = '#2c2d33'; g.fillRect(0, 0, 512, 22);
  const colors = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#abb2bf', '#56b6c2'];
  for (let i = 0; i < 17; i++) {
    let x = 104 + (i % 4 === 0 ? 0 : 18 * (1 + (i % 3)));
    for (let k = 0; k < 4; k++) { const w = 18 + Math.random() * 70; g.fillStyle = colors[(i + k) % colors.length]; g.fillRect(x, 32 + i * 16, w, 7); x += w + 8; }
  }
  for (let i = 0; i < 12; i++) { g.fillStyle = '#5c6370'; g.fillRect(12, 34 + i * 18, 50 + Math.random() * 20, 6); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Figure({ position, colors }: { position: [number, number, number]; colors: [string, string, string] }) {
  const [body, accent, skin] = colors;
  return (
    <group position={position} scale={0.6}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.09, 0.1, 0.03, 16]} /><meshStandardMaterial color="#2b2b2b" /></mesh>
      <mesh position={[0, 0.17, 0]}><capsuleGeometry args={[0.045, 0.12, 4, 8]} /><meshStandardMaterial color={body} roughness={0.5} /></mesh>
      <mesh position={[0, 0.2, 0.035]}><boxGeometry args={[0.07, 0.03, 0.02]} /><meshStandardMaterial color={accent} /></mesh>
      <mesh position={[0, 0.31, 0]}><sphereGeometry args={[0.05, 16, 12]} /><meshStandardMaterial color={skin} roughness={0.5} /></mesh>
      <mesh position={[0, 0.335, 0]}><sphereGeometry args={[0.052, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={accent} roughness={0.6} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0.06 * s, 0.17, 0]} rotation-z={s * 0.4}><capsuleGeometry args={[0.016, 0.08, 4, 6]} /><meshStandardMaterial color={body} /></mesh>)}
    </group>
  );
}


function plasterWall() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!; g.fillStyle = '#d8c2a3'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7000; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v * 0.85},${v * 0.68},0.35)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
}

function plankFloor() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
    const x = k * 170 - (r % 2) * 85;
    g.fillStyle = `hsl(${18 + Math.random() * 6}, ${38 + Math.random() * 10}%, ${22 + Math.random() * 7}%)`; g.fillRect(x, r * 64, 170, 64);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.strokeRect(x + 0.5, r * 64 + 0.5, 170, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
}

export default function Home() {
  const M = useMaterials();
  const tex = useMemo(() => ({
    screen: screenTexture(),
    crimsonMoon: posterTexture('crimsonMoon'), noir: posterTexture('noir'), frostAxe: posterTexture('frostAxe'), spiral: posterTexture('spiral'), code: posterTexture('code'),
  }), []);
  const cladding = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efe8da', roughness: 0.85 }), []);
  const timber = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a6b45', roughness: 0.7 }), []);
  const interiorWall = useMemo(() => plasterWall(), []);
  const floorMat = useMemo(() => plankFloor(), []);
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfe3ee', emissive: '#bcd7e6', emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.2 }), []);
  const ledMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#7fb7ff', emissiveIntensity: 2.2 }), []);
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;

  const walls = [
    // [w, h, d, x, y, z]
    [X1 - X0, H, T, cx, H / 2, Z1], // south
    [T, H, Z1 - Z0, X0, H / 2, cz], // west
    [T, H, Z1 - Z0, X1, H / 2, cz], // east
    [DOOR.x0 - X0, H, T, (X0 + DOOR.x0) / 2, H / 2, Z0], // north, left of door
    [X1 - DOOR.x1, H, T, (DOOR.x1 + X1) / 2, H / 2, Z0], // north, right of door
    [DOOR.x1 - DOOR.x0, H - DOOR.h, T, (DOOR.x0 + DOOR.x1) / 2, DOOR.h + (H - DOOR.h) / 2, Z0], // lintel
  ] as const;

  return (
    <group>
      {/* ---------- exterior shell */}
      {walls.map(([w, h, d, x, y, z], i) => (
        <group key={i}>
          <mesh position={[x, y, z]} material={cladding} castShadow receiveShadow><boxGeometry args={[w, h, d]} /></mesh>
        </group>
      ))}
      {/* interior faces in a darker, cosy tone */}
      <mesh position={[cx, H / 2, Z1 - T / 2 - 0.01]} rotation-y={Math.PI} material={interiorWall}><planeGeometry args={[X1 - X0 - T, H]} /></mesh>
      <mesh position={[X0 + T / 2 + 0.01, H / 2, cz]} rotation-y={Math.PI / 2} material={interiorWall}><planeGeometry args={[Z1 - Z0 - T, H]} /></mesh>
      <mesh position={[X1 - T / 2 - 0.01, H / 2, cz]} rotation-y={-Math.PI / 2} material={interiorWall}><planeGeometry args={[Z1 - Z0 - T, H]} /></mesh>
      {/* roof with timber fascia */}
      <mesh position={[cx, H + 0.15, cz]} material={M.concrete} castShadow receiveShadow><boxGeometry args={[X1 - X0 + 1.2, 0.3, Z1 - Z0 + 1.2]} /></mesh>
      <mesh position={[cx, H + 0.42, cz]} material={timber} castShadow><boxGeometry args={[X1 - X0 + 1.3, 0.25, Z1 - Z0 + 1.3]} /></mesh>
      <mesh position={[cx, H - 0.01, cz]} rotation-x={Math.PI / 2} material={interiorWall}><planeGeometry args={[X1 - X0, Z1 - Z0]} /></mesh>
      {/* windows (glazing panels on both faces) */}
      {[[X0 - 0.16, 1.8, 84, Math.PI / 2], [X0 + 0.16, 1.8, 84, -Math.PI / 2], [X1 + 0.16, 1.8, 82.9, -Math.PI / 2], [X1 - 0.16, 1.8, 82.9, Math.PI / 2]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation-y={r} material={windowMat}><planeGeometry args={[3.2, 1.6]} /></mesh>
      ))}
      {[[26, 1.8], [34, 1.8]].map(([x, y], i) => (
        <group key={i}>
          <mesh position={[x, y, Z0 - 0.16]} rotation-y={Math.PI} material={windowMat}><planeGeometry args={[2.6, 1.6]} /></mesh>
          <mesh position={[x, y, Z0 + 0.16]} material={windowMat}><planeGeometry args={[2.6, 1.6]} /></mesh>
        </group>
      ))}
      {/* house number + name plate by the door */}
      <mesh position={[32.1, 2.1, Z0 - 0.17]} material={timber}><boxGeometry args={[1.2, 0.36, 0.04]} /></mesh>
      <Text font={FONT_UI} fontSize={0.16} color="#f7f5f0" position={[32.1, 2.1, Z0 - 0.2]} rotation-y={Math.PI} anchorX="center" anchorY="middle" letterSpacing={0.1}>CHIRAG</Text>

      {/* ---------- interior */}
      <mesh position={[cx, 0.24, cz]} rotation-x={-Math.PI / 2} material={floorMat} receiveShadow><planeGeometry args={[X1 - X0 - T, Z1 - Z0 - T]} /></mesh>
      {/* LED strip along the ceiling edge */}
      {[[cx, H - 0.08, Z1 - 0.2, X1 - X0 - 0.8, 0], [X0 + 0.2, H - 0.08, cz, Z1 - Z0 - 0.8, Math.PI / 2], [X1 - 0.2, H - 0.08, cz, Z1 - Z0 - 0.8, Math.PI / 2]].map(([x, y, z, len, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation-y={r} material={ledMat}><boxGeometry args={[len, 0.04, 0.04]} /></mesh>
      ))}
      <pointLight position={[29.5, 3.0, 88.6]} intensity={7} distance={10} decay={2} color="#ffcf9a" castShadow={false} />
      <pointLight position={[26, 2.6, 84]} intensity={4} distance={9} decay={2} color="#8fb4ff" />

      <DeskSetup screen={tex.screen} />

      {/* posters (original art) */}
      {([
        ['crimsonMoon', [X0 + 0.17, 1.95, 86.7], Math.PI / 2],
        ['spiral', [X0 + 0.17, 1.95, 88.0], Math.PI / 2],
        ['noir', [X0 + 0.17, 1.95, 89.3], Math.PI / 2],
        ['frostAxe', [X0 + 0.17, 1.95, 90.6], Math.PI / 2],
        ['code', [X1 - 0.17, 1.95, 90.6], -Math.PI / 2],
      ] as const).map(([name, pos, r]) => (
        <group key={name} position={pos as unknown as [number, number, number]} rotation-y={r}>
          <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.98, 1.36, 0.02]} /><meshStandardMaterial color="#141414" /></mesh>
          <mesh position={[0, 0, 0.007]}><planeGeometry args={[0.9, 1.27]} /><meshStandardMaterial map={tex[name]} roughness={0.7} /></mesh>
        </group>
      ))}

      {/* shelves with action figures on the east wall */}
      {[1.2, 1.75].map((y, row) => (
        <group key={y} position={[X1 - 0.35, y, 87.6]}>
          <mesh material={timber} castShadow><boxGeometry args={[0.36, 0.04, 2.4]} /></mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((z, i) => (
            <Figure key={z} position={[0, 0.02, z]} colors={([
              ['#f97316', '#1e3a8a', '#e8b48f'], ['#1f2937', '#dc2626', '#d69e74'], ['#e5e7eb', '#b91c1c', '#c48a62'], ['#14532d', '#facc15', '#e8b48f'],
              ['#4338ca', '#e5e7eb', '#d69e74'], ['#7f1d1d', '#111827', '#e8b48f'], ['#0f766e', '#fde68a', '#c48a62'], ['#111827', '#f97316', '#d69e74'],
            ] as [string, string, string][])[row * 4 + i]} />
          ))}
        </group>
      ))}

      {/* beanbag + plant */}
      <mesh position={[25.4, 0.55, 83.6]} scale={[1, 0.6, 1]} castShadow><sphereGeometry args={[0.6, 24, 16]} /><meshStandardMaterial color="#6b7a2e" roughness={0.95} /></mesh>
      <group position={[35.8, 0.24, 90.9]}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.22, 0.18, 0.5, 16]} /><meshStandardMaterial color="#e7dfd2" /></mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i) * 0.12, 0.85, Math.sin(i) * 0.12]} rotation={[Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5]}>
            <coneGeometry args={[0.07, 0.8, 6]} /><meshStandardMaterial color="#3f6b35" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ---------- front yard: path, hedge with a gate gap, mailbox */}
      <mesh position={[30.1, 0.21, 73.5]} material={M.paving} receiveShadow><boxGeometry args={[2.2, 0.06, 13]} /></mesh>
      {[[17, 12], [43.1, 12]].map(([x, w], i) => (
        <mesh key={i} position={[x, 0.75, 67.8]} castShadow receiveShadow><boxGeometry args={[w, 1.1, 0.9]} /><meshStandardMaterial color="#4c6b3a" roughness={0.95} /></mesh>
      ))}

      {/* ---------- colliders */}
      <RigidBody type="fixed" colliders={false}>
        {walls.map(([w, h, d, x, y, z], i) => <CuboidCollider key={i} args={[w / 2, h / 2, d / 2]} position={[x, y, z]} />)}
        <CuboidCollider args={[(X1 - X0) / 2 + 0.6, 0.2, (Z1 - Z0) / 2 + 0.6]} position={[cx, H + 0.2, cz]} />
        <CuboidCollider args={[(X1 - X0) / 2, 0.12, (Z1 - Z0) / 2]} position={[cx, 0.12, cz]} />
        <CuboidCollider args={[1.05, 0.42, 0.46]} position={[30, 0.66, 91.28]} />
        <CuboidCollider args={[0.2, 0.6, 1.2]} position={[X1 - 0.35, 1.5, 87.6]} />
        <CuboidCollider args={[0.6, 0.35, 0.6]} position={[25.4, 0.45, 83.6]} />
        <CuboidCollider args={[6, 0.55, 0.45]} position={[17, 0.75, 67.8]} />
        <CuboidCollider args={[6, 0.55, 0.45]} position={[43.1, 0.75, 67.8]} />
      </RigidBody>
    </group>
  );
}
