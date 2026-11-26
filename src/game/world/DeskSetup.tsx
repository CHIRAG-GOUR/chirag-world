'use client';
/* eslint-disable react-hooks/immutability -- the live clock texture is redrawn imperatively in useFrame */
// Cosy developer desk corner: walnut desk on a dark base, laptop, riser with a curved monitor showing
// the live time, speakers, headphones, coffee, phone, floating shelf with plants + clock, acoustic
// foam panels, curtains and an ergonomic chair. Original design.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';

const FLOOR = 0.24;
const DESK = { x: 30, z: 91.28, w: 2.1, d: 0.92, h: 0.74 };

function canvas(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export const walnutTexture = () => canvas(512, 256, (g) => {
  g.fillStyle = '#6a3a20'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * 256, amp = 2 + Math.random() * 6, f = 0.005 + Math.random() * 0.02;
    g.strokeStyle = `rgba(${40 + Math.random() * 30},${18 + Math.random() * 12},${8},${0.25 + Math.random() * 0.35})`;
    g.lineWidth = 0.6 + Math.random() * 1.8;
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) { const yy = y + Math.sin(x * f + i) * amp; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
});

function useLiveClock(w = 512, h = 200, color = '#f2f2f2', bg = '#0c0d10') {
  const state = useRef({ last: '' });
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [w, h]);
  useFrame(() => {
    const d = new Date();
    const s = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (s === state.current.last) return;
    state.current.last = s;
    const c = tex.image as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.font = `800 ${Math.round(h * 0.62)}px "Arial Black", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, w / 2, h / 2 + 4);
    tex.needsUpdate = true;
  });
  return tex;
}

function FoamPanel({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const cols = 8, rows = 10, cell = 0.11;
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(cell * 0.7, cell * 0.55, 4); g.rotateX(-Math.PI / 2); g.rotateZ(Math.PI / 4); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 1, flatShading: true }), []);
  const set = (el: THREE.InstancedMesh | null) => {
    if (!el) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      m.makeTranslation((c - (cols - 1) / 2) * cell, (r - (rows - 1) / 2) * cell, cell * 0.27);
      el.setMatrixAt(i++, m);
    }
    el.instanceMatrix.needsUpdate = true;
  };
  return (
    <group position={position} rotation-y={Math.PI}>
      <mesh position={[0, 0, 0.005]} material={mat}><boxGeometry args={[cols * cell + 0.02, rows * cell + 0.02, 0.02]} /></mesh>
      <instancedMesh ref={(el) => { ref.current = el; set(el); }} args={[geo, mat, cols * rows]} castShadow />
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f9a3a', roughness: 0.7, flatShading: true }), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.07, 0.055, 0.12, 20]} /><meshStandardMaterial color="#f4f2ee" roughness={0.4} /></mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.05, 0.17, Math.sin(a) * 0.05]} rotation={[Math.sin(a) * 0.9, a, Math.cos(a) * 0.9]} material={leaf} castShadow>
            <sphereGeometry args={[0.05, 6, 4]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Speaker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.2, 0.32, 0.22]} radius={0.035} smoothness={4} castShadow><meshStandardMaterial color="#4a4d63" roughness={0.55} /></RoundedBox>
      {[[0.07, 0.03], [-0.07, 0.05]].map(([y, r], i) => (
        <group key={i} position={[0, y, -0.112]} rotation-x={Math.PI / 2}>
          <mesh><cylinderGeometry args={[r + 0.012, r + 0.012, 0.01, 28]} /><meshStandardMaterial color="#2c2e3c" /></mesh>
          <mesh position={[0, -0.006, 0]}><cylinderGeometry args={[r, r, 0.01, 28]} /><meshStandardMaterial color="#1a1b22" roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Chair() {
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4d6da', roughness: 0.5 }), []);
  const mesh = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.8 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.5, metalness: 0.4 }), []);
  return (
    <group position={[30, FLOOR, 89.9]}>
      <RoundedBox args={[0.56, 0.09, 0.54]} radius={0.04} position={[0, 0.5, 0]} material={shell} castShadow />
      <RoundedBox args={[0.5, 0.7, 0.06]} radius={0.03} position={[0, 0.98, -0.3]} rotation-x={-0.12} material={mesh} castShadow />
      <RoundedBox args={[0.3, 0.14, 0.06]} radius={0.03} position={[0, 1.42, -0.36]} rotation-x={-0.2} material={shell} castShadow />
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[0.3 * s, 0.62, -0.02]} material={shell}><boxGeometry args={[0.04, 0.2, 0.04]} /></mesh>
          <RoundedBox args={[0.07, 0.03, 0.26]} radius={0.012} position={[0.3 * s, 0.72, 0.02]} material={shell} />
        </group>
      ))}
      <mesh position={[0, 0.27, 0]} material={dark}><cylinderGeometry args={[0.03, 0.035, 0.42, 12]} /></mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation-y={a}>
            <mesh position={[0.15, 0.07, 0]} rotation-z={0.08} material={dark}><boxGeometry args={[0.3, 0.035, 0.045]} /></mesh>
            <mesh position={[0.29, 0.035, 0]} material={dark}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function DeskSetup({ screen }: { screen: THREE.Texture }) {
  const walnut = useMemo(() => new THREE.MeshStandardMaterial({ map: walnutTexture(), roughness: 0.42, metalness: 0.05 }), []);
  const base = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3c3f45', roughness: 0.6 }), []);
  const clockMain = useLiveClock();
  const clockSmall = useLiveClock(256, 110, '#e9e9e9', '#16171a');
  const curve = useMemo(() => new THREE.CylinderGeometry(1.05, 1.05, 0.34, 32, 1, true, Math.PI - 0.32, 0.64), []);
  const curveFrame = useMemo(() => new THREE.CylinderGeometry(1.035, 1.035, 0.37, 32, 1, true, Math.PI - 0.34, 0.68), []);
  const curtainGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.0, 2.6, 24, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.04);
    g.computeVertexNormals();
    return g;
  }, []);
  const top = FLOOR + DESK.h;

  return (
    <group>
      {/* desk: walnut top on a dark base with a knee space */}
      <RoundedBox args={[DESK.w, 0.07, DESK.d]} radius={0.03} smoothness={4} position={[DESK.x, top, DESK.z]} material={walnut} castShadow receiveShadow />
      {[-1, 1].map(s => (
        <RoundedBox key={s} args={[0.46, DESK.h - 0.04, DESK.d - 0.06]} radius={0.04} position={[DESK.x + s * (DESK.w / 2 - 0.28), FLOOR + (DESK.h - 0.04) / 2, DESK.z]} material={base} castShadow receiveShadow />
      ))}
      <mesh position={[DESK.x, FLOOR + 0.36, DESK.z + DESK.d / 2 - 0.05]} material={base}><boxGeometry args={[DESK.w - 0.9, 0.6, 0.03]} /></mesh>

      {/* riser + curved monitor showing the live time, blue backlight */}
      <RoundedBox args={[1.15, 0.05, 0.32]} radius={0.015} position={[DESK.x, top + 0.18, DESK.z + 0.24]} material={walnut} castShadow />
      {[-0.5, 0.5].map(x => <mesh key={x} position={[DESK.x + x, top + 0.09, DESK.z + 0.24]} material={base}><boxGeometry args={[0.04, 0.14, 0.26]} /></mesh>)}
      <group position={[DESK.x, top + 0.47, DESK.z + 1.25]}>
        <mesh geometry={curveFrame}><meshStandardMaterial color="#121316" roughness={0.4} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={curve} position={[0, 0, 0]} scale={[0.995, 1, 0.995]}><meshBasicMaterial map={clockMain} toneMapped={false} /></mesh>
      </group>
      <mesh position={[DESK.x, top + 0.26, DESK.z + 0.26]}><cylinderGeometry args={[0.1, 0.12, 0.02, 24]} /><meshStandardMaterial color="#e9eef2" roughness={0.3} /></mesh>
      <mesh position={[DESK.x, top + 0.47, DESK.z + 0.36]}><planeGeometry args={[0.9, 0.5]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.35} toneMapped={false} /></mesh>
      <pointLight position={[DESK.x, top + 0.5, DESK.z + 0.42]} intensity={3} distance={2.2} color="#5b9bff" />

      {/* headphones resting on the monitor corner */}
      <group position={[DESK.x + 0.38, top + 0.66, DESK.z + 0.26]} rotation-z={-0.2}>
        <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.09, 0.012, 8, 24, Math.PI]} /><meshStandardMaterial color="#e9e9ee" roughness={0.4} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[0.09 * s, -0.02, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.045, 0.045, 0.035, 20]} /><meshStandardMaterial color="#5d6388" roughness={0.45} /></mesh>)}
      </group>

      {/* speakers */}
      <Speaker position={[DESK.x - 0.88, top + 0.2, DESK.z + 0.18]} />
      <Speaker position={[DESK.x + 0.88, top + 0.2, DESK.z + 0.18]} />

      {/* desk mat, laptop, mouse, phone, coffee */}
      <RoundedBox args={[0.9, 0.006, 0.4]} radius={0.003} position={[DESK.x + 0.05, top + 0.038, DESK.z - 0.18]}><meshStandardMaterial color="#1c1d20" roughness={0.9} /></RoundedBox>
      <group position={[DESK.x - 0.05, top + 0.042, DESK.z - 0.2]}>
        <RoundedBox args={[0.36, 0.022, 0.25]} radius={0.008}><meshStandardMaterial color="#17181b" roughness={0.35} metalness={0.5} /></RoundedBox>
        <mesh position={[0, 0.0115, 0.012]}><boxGeometry args={[0.32, 0.003, 0.13]} /><meshStandardMaterial color="#0d0e10" emissive="#2a7bbf" emissiveIntensity={0.7} /></mesh>
        <mesh position={[0, 0.012, 0.124]}><boxGeometry args={[0.28, 0.01, 0.01]} /><meshStandardMaterial color="#b87333" metalness={0.8} roughness={0.3} /></mesh>
        <group position={[0, 0.012, 0.124]} rotation-x={-0.3}>
          <RoundedBox args={[0.36, 0.23, 0.01]} radius={0.004} position={[0, 0.115, 0]}><meshStandardMaterial color="#17181b" roughness={0.35} metalness={0.5} /></RoundedBox>
          <mesh position={[0, 0.118, -0.006]} rotation-y={Math.PI}><planeGeometry args={[0.33, 0.2]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
        </group>
      </group>
      <mesh position={[DESK.x + 0.33, top + 0.055, DESK.z - 0.2]} scale={[1, 0.55, 1.5]}><sphereGeometry args={[0.035, 18, 12]} /><meshStandardMaterial color="#f2f2f0" roughness={0.35} /></mesh>
      <group position={[DESK.x - 0.55, top + 0.04, DESK.z - 0.22]} rotation-y={0.3}>
        <RoundedBox args={[0.075, 0.008, 0.16]} radius={0.003}><meshStandardMaterial color="#f4f4f2" roughness={0.25} /></RoundedBox>
        <mesh position={[0.012, 0.005, -0.045]}><torusGeometry args={[0.016, 0.0015, 6, 24]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} /></mesh>
      </group>
      <group position={[DESK.x + 0.62, top + 0.036, DESK.z - 0.16]}>
        <mesh><cylinderGeometry args={[0.07, 0.065, 0.008, 24]} /><meshStandardMaterial color="#f4f2ee" roughness={0.3} /></mesh>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.04, 0.033, 0.07, 24]} /><meshStandardMaterial color="#f4f2ee" roughness={0.3} /></mesh>
        <mesh position={[0, 0.072, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.036, 20]} /><meshStandardMaterial color="#4a2a17" roughness={0.2} /></mesh>
        <mesh position={[0.045, 0.04, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.018, 0.005, 8, 16, Math.PI]} /><meshStandardMaterial color="#f4f2ee" /></mesh>
      </group>

      {/* floating shelf: plants + live clock */}
      <RoundedBox args={[1.5, 0.05, 0.26]} radius={0.015} position={[DESK.x, FLOOR + 1.95, 91.7]} material={walnut} castShadow />
      <Plant position={[DESK.x - 0.55, FLOOR + 1.975, 91.68]} />
      <Plant position={[DESK.x + 0.5, FLOOR + 1.975, 91.68]} scale={0.9} />
      <group position={[DESK.x - 0.12, FLOOR + 2.06, 91.66]}>
        <RoundedBox args={[0.34, 0.17, 0.1]} radius={0.03}><meshStandardMaterial color="#1a1b1e" roughness={0.4} /></RoundedBox>
        <mesh position={[0, 0, -0.051]} rotation-y={Math.PI}><planeGeometry args={[0.3, 0.13]} /><meshBasicMaterial map={clockSmall} toneMapped={false} /></mesh>
      </group>

      {/* acoustic foam panels flanking the desk */}
      <FoamPanel position={[DESK.x - 1.55, FLOOR + 1.75, 91.84]} />
      <FoamPanel position={[DESK.x + 1.55, FLOOR + 1.75, 91.84]} />

      {/* curtains framing the west window */}
      {[82.15, 85.85].map(z => (
        <mesh key={z} geometry={curtainGeo} position={[23.42, FLOOR + 1.45, z]} rotation-y={Math.PI / 2}>
          <meshStandardMaterial color="#4e6a83" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[23.4, FLOOR + 2.8, 84]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.015, 0.015, 4.4, 8]} /><meshStandardMaterial color="#2b2d31" metalness={0.6} roughness={0.4} /></mesh>

      <Chair />
    </group>
  );
}
