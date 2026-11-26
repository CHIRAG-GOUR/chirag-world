// Deterministic city layout from the district map. Pure data — rendering lives in components.
import { districts } from '../data/world';
import type { FacadeStyle } from './materials';

export const CITY_HALF = 270; // city extends ±270 m
export const GRID = 60; // street spacing
export const STREET_W = 14; // carriageway + kerb
export const SIDEWALK = 4;
export const PLAZA_HALF = GRID - STREET_W / 2; // square plaza park around the origin (53 m)
export const PLAZA_R = 46; // circular stone plaza

export const streetLines: number[] = [];
for (let v = -CITY_HALF + 30; v <= CITY_HALF - 30; v += GRID) streetLines.push(v);
// lines: -240 -180 -120 -60 0 60 120 180 240

function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export type Building = { x: number; z: number; w: number; d: number; h: number; style: FacadeStyle; setback: number; podium: number };
export type Block = { x0: number; x1: number; z0: number; z1: number; kind: 'built' | 'park' | 'district' | 'plaza' };
export type Prop = { x: number; z: number; r: number; s: number; v: number };

const inPlaza = (x: number, z: number) => Math.abs(x) < PLAZA_HALF + 1 && Math.abs(z) < PLAZA_HALF + 1;
const nearDistrict = (x: number, z: number) =>
  districts.find(d => d.id !== 'plaza' && Math.hypot(x - d.center[0], z - d.center[1]) < d.radius + 12);

function generate() {
  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const trees: Prop[] = [];
  const lamps: Prop[] = [];

  for (let i = 0; i < streetLines.length - 1; i++) {
    for (let j = 0; j < streetLines.length - 1; j++) {
      const x0 = streetLines[i] + STREET_W / 2, x1 = streetLines[i + 1] - STREET_W / 2;
      const z0 = streetLines[j] + STREET_W / 2, z1 = streetLines[j + 1] - STREET_W / 2;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const r = rng(i * 31 + j * 7 + 3);
      if (inPlaza(cx, cz)) { blocks.push({ x0, x1, z0, z1, kind: 'plaza' }); continue; }
      if (nearDistrict(cx, cz)) { blocks.push({ x0, x1, z0, z1, kind: 'district' }); continue; }
      // a few pocket parks keep the grid from feeling like a spreadsheet
      if (r() < 0.12) {
        blocks.push({ x0, x1, z0, z1, kind: 'park' });
        for (let k = 0; k < 14; k++) trees.push({ x: x0 + 6 + r() * (x1 - x0 - 12), z: z0 + 6 + r() * (z1 - z0 - 12), r: r() * 6, s: 0.8 + r() * 0.6, v: Math.floor(r() * 3) });
        continue;
      }
      blocks.push({ x0, x1, z0, z1, kind: 'built' });

      // subdivide into lots
      const inner = { x0: x0 + SIDEWALK, x1: x1 - SIDEWALK, z0: z0 + SIDEWALK, z1: z1 - SIDEWALK };
      const splitX = r() < 0.6 ? 2 : 1, splitZ = r() < 0.6 ? 2 : 1;
      const lw = (inner.x1 - inner.x0) / splitX, ld = (inner.z1 - inner.z0) / splitZ;
      const dist = Math.hypot(cx, cz);
      for (let a = 0; a < splitX; a++) for (let b = 0; b < splitZ; b++) {
        const w = lw - 1.6 - r() * 2, d = ld - 1.6 - r() * 2;
        const x = inner.x0 + lw * (a + 0.5), z = inner.z0 + ld * (b + 0.5);
        // taller towards the middle ring, lower at the edges; skyline district side is tallest
        const ring = dist < 130 ? 1 : dist < 210 ? 0.8 : 0.5;
        const north = z < -120 ? 1.25 : 1;
        const floors = Math.round((4 + r() * 12) * ring * north + (r() < 0.12 ? 8 : 0));
        const h = 5 + floors * 3.6;
        const styles: FacadeStyle[] = h > 45 ? ['glass', 'glass', 'stone', 'concrete'] : ['stone', 'brick', 'concrete', 'brick', 'glass'];
        buildings.push({ x, z, w, d, h, style: styles[Math.floor(r() * styles.length)], setback: h > 38 && r() < 0.7 ? 0.72 + r() * 0.12 : 1, podium: 5 });
      }
    }
  }

  // street trees + lamps along every street segment (skipping intersections and the plaza)
  const along = (fixed: number, horizontal: boolean) => {
    for (let t = -CITY_HALF + 8; t <= CITY_HALF - 8; t += 12) {
      const nearCross = streetLines.some(l => Math.abs(t - l) < STREET_W / 2 + 4);
      if (nearCross) continue;
      for (const side of [-1, 1]) {
        const off = fixed + side * (STREET_W / 2 + 1.6);
        const x = horizontal ? t : off, z = horizontal ? off : t;
        if (inPlaza(x, z)) continue;
        const seed = Math.abs(Math.round(x * 13 + z * 7));
        if (seed % 2 === 0) trees.push({ x, z, r: (seed % 360) * (Math.PI / 180), s: 0.85 + (seed % 5) * 0.08, v: seed % 3 });
        else if (seed % 4 === 1) lamps.push({ x: horizontal ? t : fixed + side * (STREET_W / 2 + 0.6), z: horizontal ? fixed + side * (STREET_W / 2 + 0.6) : t, r: side > 0 ? Math.PI : 0, s: 1, v: horizontal ? 1 : 0 });
      }
    }
  };
  streetLines.forEach(l => { along(l, true); along(l, false); });

  return { blocks, buildings, trees, lamps };
}

export const city = generate();
