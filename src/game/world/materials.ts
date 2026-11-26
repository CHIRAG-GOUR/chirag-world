'use client';
// Shared PBR materials + procedurally painted textures (generated once, reused everywhere).
// Facade textures describe ONE window module; geometry UVs are in modules, so a single
// material covers every building of that style.
import * as THREE from 'three';

type Painter = (g: CanvasRenderingContext2D, s: number) => void;

function canvasTex(size: number, paint: Painter, { srgb = true, repeat = 1 }: { srgb?: boolean; repeat?: number } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  paint(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(g: CanvasRenderingContext2D, s: number, amount: number, alpha = 0.08, seed = 1) {
  let x = seed * 9301;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rnd() * 255);
    g.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
    g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

// ------------------------------------------------------------------ ground surfaces
const asphaltMap = () => canvasTex(512, (g, s) => {
  g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, s, s);
  noise(g, s, 26000, 0.22, 3);
}, { repeat: 1 });

const pavingMap = () => canvasTex(512, (g, s) => {
  // staggered stone slabs, warm limestone
  g.fillStyle = '#bfb29b'; g.fillRect(0, 0, s, s);
  const rows = 8, h = s / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (s / 8);
    for (let x = -s / 4; x < s; x += s / 4) {
      const tone = 176 + Math.floor(Math.random() * 30);
      g.fillStyle = `rgb(${tone + 14},${tone + 4},${tone - 14})`;
      g.fillRect(x + off + 2, r * h + 2, s / 4 - 4, h - 4);
    }
  }
  noise(g, s, 18000, 0.12, 5);
});

const sidewalkMap = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#bdb6aa'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 2;
  for (let i = 0; i <= s; i += s / 2) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
  noise(g, s, 6000, 0.12, 7);
});

const grassMap = () => canvasTex(512, (g, s) => {
  g.fillStyle = '#6b8a3e'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) {
    const l = 30 + Math.random() * 30;
    g.fillStyle = `hsla(${78 + Math.random() * 20},${35 + Math.random() * 20}%,${l}%,0.5)`;
    g.fillRect(Math.random() * s, Math.random() * s, 1.5, 3 + Math.random() * 3);
  }
});

const concreteMap = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#c9c3b8'; g.fillRect(0, 0, s, s);
  noise(g, s, 9000, 0.1, 11);
  g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
});

// ------------------------------------------------------------------ facade modules (1 window bay × 1 floor)
export type FacadeStyle = 'stone' | 'glass' | 'brick' | 'concrete';

const facadePainters: Record<FacadeStyle, { color: Painter; rough: Painter }> = {
  stone: {
    color: (g, s) => {
      g.fillStyle = '#d9cbb2'; g.fillRect(0, 0, s, s); noise(g, s, 4000, 0.1, 2);
      g.fillStyle = '#2f3b44'; g.fillRect(s * 0.18, s * 0.14, s * 0.64, s * 0.66);
      g.fillStyle = 'rgba(190,210,225,0.25)'; g.fillRect(s * 0.18, s * 0.14, s * 0.64, s * 0.2);
      g.fillStyle = '#b9a98d'; g.fillRect(s * 0.14, s * 0.8, s * 0.72, s * 0.06);
      g.fillStyle = '#5a5047'; g.fillRect(s * 0.495, s * 0.14, s * 0.01, s * 0.66);
    },
    rough: (g, s) => { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, s, s); g.fillStyle = '#1a1a1a'; g.fillRect(s * 0.18, s * 0.14, s * 0.64, s * 0.66); },
  },
  glass: {
    color: (g, s) => {
      const grd = g.createLinearGradient(0, 0, 0, s);
      grd.addColorStop(0, '#4f6676'); grd.addColorStop(1, '#2d3f4b');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.fillStyle = '#9aa3a8'; g.fillRect(0, 0, s, s * 0.06); g.fillRect(0, 0, s * 0.03, s);
      g.fillStyle = '#7e878c'; g.fillRect(0, s * 0.82, s, s * 0.18);
    },
    rough: (g, s) => { g.fillStyle = '#141414'; g.fillRect(0, 0, s, s); g.fillStyle = '#9a9a9a'; g.fillRect(0, s * 0.82, s, s * 0.18); g.fillRect(0, 0, s, s * 0.06); },
  },
  brick: {
    color: (g, s) => {
      g.fillStyle = '#9c5a3c'; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(60,30,20,0.5)'; g.lineWidth = 1;
      for (let y = 0; y < s; y += s / 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
      for (let y = 0, r = 0; y < s; y += s / 16, r++) for (let x = (r % 2) * s / 8; x < s; x += s / 4) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s / 16); g.stroke(); }
      noise(g, s, 3000, 0.12, 4);
      g.fillStyle = '#e8dccb'; g.fillRect(s * 0.22, s * 0.18, s * 0.56, s * 0.6);
      g.fillStyle = '#2b333a'; g.fillRect(s * 0.25, s * 0.21, s * 0.5, s * 0.54);
      g.fillStyle = 'rgba(200,215,225,0.25)'; g.fillRect(s * 0.25, s * 0.21, s * 0.5, s * 0.15);
      g.fillStyle = '#e8dccb'; g.fillRect(s * 0.48, s * 0.21, s * 0.04, s * 0.54);
    },
    rough: (g, s) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s); g.fillStyle = '#1a1a1a'; g.fillRect(s * 0.25, s * 0.21, s * 0.5, s * 0.54); },
  },
  concrete: {
    color: (g, s) => {
      g.fillStyle = '#e3ddd2'; g.fillRect(0, 0, s, s); noise(g, s, 4000, 0.08, 9);
      g.fillStyle = '#34424c'; g.fillRect(0, s * 0.2, s, s * 0.5);
      g.fillStyle = 'rgba(200,220,230,0.2)'; g.fillRect(0, s * 0.2, s, s * 0.12);
      g.fillStyle = '#c8c0b2'; g.fillRect(s * 0.47, s * 0.2, s * 0.06, s * 0.5);
    },
    rough: (g, s) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s); g.fillStyle = '#181818'; g.fillRect(0, s * 0.2, s, s * 0.5); },
  },
};

let cache: ReturnType<typeof build> | null = null;
function build() {
  const facade = {} as Record<FacadeStyle, THREE.MeshStandardMaterial>;
  (Object.keys(facadePainters) as FacadeStyle[]).forEach((k) => {
    const p = facadePainters[k];
    facade[k] = new THREE.MeshStandardMaterial({
      map: canvasTex(256, p.color),
      roughnessMap: canvasTex(256, p.rough, { srgb: false }),
      // metalness = inverse of roughness: glazing reflects the sky, walls do not
      metalnessMap: canvasTex(256, (g, s) => {
        p.rough(g, s);
        g.globalCompositeOperation = 'difference';
        g.fillStyle = '#fff';
        g.fillRect(0, 0, s, s);
        g.globalCompositeOperation = 'source-over';
      }, { srgb: false }),
      roughness: 1,
      metalness: 0.7,
      envMapIntensity: 1.1,
    });
  });
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltMap(), roughness: 0.92, color: '#ffffff' });
  asphalt.map!.repeat.set(1, 1);
  return {
    facade,
    asphalt,
    paving: new THREE.MeshStandardMaterial({ map: pavingMap(), roughness: 0.78 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: sidewalkMap(), roughness: 0.85 }),
    grass: new THREE.MeshStandardMaterial({ map: grassMap(), roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteMap(), roughness: 0.82 }),
    roof: new THREE.MeshStandardMaterial({ color: '#8d877e', roughness: 0.9 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: '#6f675d', roughness: 0.7 }),
    limestone: new THREE.MeshStandardMaterial({ color: '#e4d9c6', roughness: 0.6 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#8a6a3f', roughness: 0.35, metalness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: '#3d4144', roughness: 0.45, metalness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: '#8b5e3c', roughness: 0.65 }),
    water: new THREE.MeshStandardMaterial({ color: '#2f5560', roughness: 0.06, metalness: 0.2, envMapIntensity: 1.4 }),
    paint: new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.6 }),
    lampGlow: new THREE.MeshStandardMaterial({ color: '#fff1d0', emissive: '#ffd89a', emissiveIntensity: 1.2 }),
    leafA: new THREE.MeshStandardMaterial({ color: '#5d7a35', roughness: 0.9, flatShading: true }),
    leafB: new THREE.MeshStandardMaterial({ color: '#7a8f3e', roughness: 0.9, flatShading: true }),
    leafC: new THREE.MeshStandardMaterial({ color: '#4c6b3a', roughness: 0.9, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: '#5b4636', roughness: 0.95 }),
  };
}

export function useMaterials() {
  if (!cache) cache = build();
  return cache;
}

/** Window-module size in metres (bay width × floor height). */
export const MODULE = { w: 3.2, h: 3.6 };
