// Geometry builders with world-scaled UVs so shared tiling materials line up everywhere.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODULE } from './materials';

/** Four facade walls (no top/bottom). UVs are in window modules (MODULE.w × MODULE.h). */
export function facadeWalls(w: number, h: number, d: number, cx: number, y0: number, cz: number) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const hw = w / 2, hd = d / 2;
  const walls: Array<{ a: [number, number]; b: [number, number]; n: [number, number]; len: number }> = [
    { a: [-hw, hd], b: [hw, hd], n: [0, 1], len: w },
    { a: [hw, hd], b: [hw, -hd], n: [1, 0], len: d },
    { a: [hw, -hd], b: [-hw, -hd], n: [0, -1], len: w },
    { a: [-hw, -hd], b: [-hw, hd], n: [-1, 0], len: d },
  ];
  // snap to whole modules so windows never get cut in half at corners
  const uMax = (len: number) => Math.max(1, Math.round(len / MODULE.w));
  const vMax = Math.max(1, Math.round(h / MODULE.h));
  walls.forEach((wall, i) => {
    const base = i * 4;
    const corners: Array<[number, number, number]> = [
      [wall.a[0], 0, wall.a[1]], [wall.b[0], 0, wall.b[1]], [wall.b[0], h, wall.b[1]], [wall.a[0], h, wall.a[1]],
    ];
    corners.forEach(([x, y, z]) => { pos.push(cx + x, y0 + y, cz + z); nor.push(wall.n[0], 0, wall.n[1]); });
    const u = uMax(wall.len);
    uv.push(0, 0, u, 0, u, vMax, 0, vMax);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Box whose UVs are in metres / `tile` (for paving, sidewalks, roofs). */
export function tiledBox(w: number, h: number, d: number, cx: number, cy: number, cz: number, tile = 4) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const sx = nx > 0.5 ? d : w, sy = ny > 0.5 ? d : h;
    uv.setXY(i, (uv.getX(i) * sx) / tile, (uv.getY(i) * sy) / tile);
  }
  g.translate(cx, cy, cz);
  return g;
}

export function merge(geos: THREE.BufferGeometry[]) {
  if (!geos.length) return new THREE.BufferGeometry();
  const nonIndexed = geos.map(g => (g.index ? g : g));
  const m = mergeGeometries(nonIndexed, false);
  geos.forEach(g => g.dispose());
  return m ?? new THREE.BufferGeometry();
}

/** Low-poly organic crown: subdivided icosahedron with deterministic jitter. */
export function crownGeometry(seed: number, radius = 2.2) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + Math.sin(x * 3.1 + seed) * 0.08 + Math.cos(z * 2.7 + y * 1.3 + seed) * 0.08;
    p.setXYZ(i, x * k, y * k * 0.92, z * k);
  }
  g.computeVertexNormals();
  return g;
}
