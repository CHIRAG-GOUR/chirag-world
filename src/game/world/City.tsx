'use client';
// The generic city fabric: streets, kerbs, parks, modular buildings, street trees and lamps.
// Buildings are merged per facade style (4 draw calls for the whole skyline); props are instanced.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { city, CITY_HALF, streetLines, STREET_W, PLAZA_HALF } from './layout';
import { facadeWalls, tiledBox, merge, crownGeometry } from './geometry';
import { useMaterials, type FacadeStyle } from './materials';
import { useSettings } from '../state/stores';
import { qualities } from '../data/world';

function Buildings() {
  const M = useMaterials();
  const { byStyle, roofs, podiums } = useMemo(() => {
    const byStyle: Record<FacadeStyle, THREE.BufferGeometry[]> = { stone: [], glass: [], brick: [], concrete: [] };
    const roofGeos: THREE.BufferGeometry[] = [];
    const podiumGeos: THREE.BufferGeometry[] = [];
    for (const b of city.buildings) {
      // podium: storefront glazing + a stone band
      podiumGeos.push(facadeWalls(b.w, b.podium, b.d, b.x, 0.15, b.z));
      roofGeos.push(tiledBox(b.w + 0.6, 0.5, b.d + 0.6, b.x, b.podium + 0.4, b.z));
      const lowerH = b.setback < 1 ? (b.h - b.podium) * 0.62 : b.h - b.podium;
      byStyle[b.style].push(facadeWalls(b.w, lowerH, b.d, b.x, b.podium + 0.65, b.z));
      let top = b.podium + 0.65 + lowerH;
      if (b.setback < 1) {
        const w2 = b.w * b.setback, d2 = b.d * b.setback;
        roofGeos.push(tiledBox(b.w, 0.4, b.d, b.x, top + 0.2, b.z));
        const upperH = b.h - b.podium - lowerH;
        byStyle[b.style].push(facadeWalls(w2, upperH, d2, b.x, top + 0.4, b.z));
        top += 0.4 + upperH;
        roofGeos.push(tiledBox(w2 + 0.3, 0.7, d2 + 0.3, b.x, top + 0.35, b.z));
        roofGeos.push(tiledBox(w2 * 0.4, 2.2, d2 * 0.35, b.x + w2 * 0.15, top + 1.8, b.z - d2 * 0.1));
      } else {
        roofGeos.push(tiledBox(b.w + 0.3, 0.7, b.d + 0.3, b.x, top + 0.35, b.z));
        roofGeos.push(tiledBox(b.w * 0.3, 1.8, b.d * 0.25, b.x - b.w * 0.2, top + 1.6, b.z + b.d * 0.15));
      }
    }
    return {
      byStyle: Object.fromEntries(Object.entries(byStyle).map(([k, v]) => [k, merge(v)])) as Record<FacadeStyle, THREE.BufferGeometry>,
      roofs: merge(roofGeos),
      podiums: merge(podiumGeos),
    };
  }, []);

  return (
    <group>
      {(Object.keys(byStyle) as FacadeStyle[]).map((k) => (
        <mesh key={k} geometry={byStyle[k]} material={M.facade[k]} castShadow receiveShadow />
      ))}
      <mesh geometry={podiums} material={M.facade.glass} castShadow receiveShadow />
      <mesh geometry={roofs} material={M.concrete} castShadow receiveShadow />
      <RigidBody type="fixed" colliders={false}>
        {city.buildings.map((b, i) => (
          <CuboidCollider key={i} args={[b.w / 2 + 0.3, b.h / 2, b.d / 2 + 0.3]} position={[b.x, b.h / 2, b.z]} />
        ))}
      </RigidBody>
    </group>
  );
}

function Ground() {
  const M = useMaterials();
  const { kerbs, parks, markings } = useMemo(() => {
    const kerbGeos: THREE.BufferGeometry[] = [];
    const parkGeos: THREE.BufferGeometry[] = [];
    for (const b of city.blocks) {
      if (b.kind === 'plaza') continue;
      const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      kerbGeos.push(tiledBox(w, 0.18, d, cx, 0.09, cz, 2.4));
      if (b.kind === 'park' || b.kind === 'district') parkGeos.push(tiledBox(w - 7, 0.06, d - 7, cx, 0.2, cz, 6));
    }
    // dashed centre lines (skip intersections and the plaza)
    const dash: THREE.BufferGeometry[] = [];
    for (const l of streetLines) {
      for (let t = -CITY_HALF + 4; t < CITY_HALF - 4; t += 6) {
        if (streetLines.some(o => Math.abs(t - o) < STREET_W / 2 + 1)) continue;
        if (Math.abs(l) < 1 && Math.abs(t) < PLAZA_HALF + 2) continue;
        dash.push(tiledBox(0.18, 0.02, 2.6, l, 0.012, t));
        dash.push(tiledBox(2.6, 0.02, 0.18, t, 0.012, l));
      }
    }
    return { kerbs: merge(kerbGeos), parks: merge(parkGeos), markings: merge(dash) };
  }, []);

  const asphalt = useMemo(() => {
    const t = M.asphalt.map!.clone();
    t.repeat.set(CITY_HALF / 6, CITY_HALF / 6);
    t.needsUpdate = true;
    const m = M.asphalt.clone();
    m.map = t;
    return m;
  }, [M]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={asphalt}>
        <planeGeometry args={[CITY_HALF * 2 + 60, CITY_HALF * 2 + 60]} />
      </mesh>
      <mesh geometry={kerbs} material={M.sidewalk} receiveShadow />
      <mesh geometry={parks} material={M.grass} receiveShadow />
      <mesh geometry={markings} material={M.paint} />
      {/* far landscape beyond the city edge */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} material={M.grass} receiveShadow>
        <ringGeometry args={[CITY_HALF + 25, 1400, 64, 1]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1400, 0.5, 1400]} position={[0, -0.5, 0]} />
        {/* kerbs / lawns are real steps (the character auto-steps up them) */}
        {city.blocks.filter(b => b.kind !== 'plaza').map((b, i) => (
          <CuboidCollider key={i} args={[(b.x1 - b.x0) / 2, 0.115, (b.z1 - b.z0) / 2]} position={[(b.x0 + b.x1) / 2, 0.115, (b.z0 + b.z1) / 2]} />
        ))}
      </RigidBody>
    </group>
  );
}

const TREE_VARIANTS = 3;
export function Trees({ items }: { items: { x: number; z: number; r: number; s: number; v: number; y?: number }[] }) {
  const M = useMaterials();
  const density = qualities[useSettings(s => s.quality)].vegetation;
  const kept = useMemo(() => items.filter((_, i) => (i * 0.618) % 1 < density), [items, density]);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<(THREE.InstancedMesh | null)[]>([]);
  const crownGeos = useMemo(() => Array.from({ length: TREE_VARIANTS }, (_, i) => crownGeometry(i * 3.7)), []);
  const leaf = [M.leafA, M.leafB, M.leafC];

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const counts = new Array(TREE_VARIANTS).fill(0);
    kept.forEach((t, i) => {
      q.setFromEuler(new THREE.Euler(0, t.r, 0));
      const y0 = t.y ?? 0;
      trunk.current?.setMatrixAt(i, m.compose(p.set(t.x, y0 + 1.6 * t.s, t.z), q, s.set(t.s, t.s, t.s)));
      const c = crowns.current[t.v];
      c?.setMatrixAt(counts[t.v]++, m.compose(p.set(t.x, y0 + 4.6 * t.s, t.z), q, s.set(t.s, t.s * 1.05, t.s)));
    });
    if (trunk.current) { trunk.current.count = kept.length; trunk.current.instanceMatrix.needsUpdate = true; trunk.current.computeBoundingSphere(); }
    crowns.current.forEach((c, v) => { if (c) { c.count = counts[v]; c.instanceMatrix.needsUpdate = true; c.computeBoundingSphere(); } });
  }, [kept]);

  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, items.length]} material={M.bark} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 3.2, 6]} />
      </instancedMesh>
      {crownGeos.map((g, v) => (
        <instancedMesh key={v} ref={el => { crowns.current[v] = el; }} args={[g, leaf[v], items.length]} castShadow receiveShadow />
      ))}
    </group>
  );
}

export function Lamps({ items }: { items: { x: number; z: number; r: number }[] }) {
  const M = useMaterials();
  const post = useRef<THREE.InstancedMesh>(null), head = useRef<THREE.InstancedMesh>(null), bulb = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    items.forEach((l, i) => {
      q.setFromEuler(new THREE.Euler(0, l.r, 0));
      post.current?.setMatrixAt(i, m.compose(p.set(l.x, 3, l.z), q, s));
      const off = new THREE.Vector3(0, 0, 0.9).applyQuaternion(q);
      head.current?.setMatrixAt(i, m.compose(p.set(l.x + off.x, 6.05, l.z + off.z), q, s));
      bulb.current?.setMatrixAt(i, m.compose(p.set(l.x + off.x, 5.92, l.z + off.z), q, s));
    });
    [post, head, bulb].forEach(r => { if (r.current) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); } });
  }, [items]);
  return (
    <group>
      <instancedMesh ref={post} args={[undefined, M.metal, items.length]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 6, 8]} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, M.metal, items.length]} castShadow>
        <boxGeometry args={[0.35, 0.14, 1.9]} />
      </instancedMesh>
      <instancedMesh ref={bulb} args={[undefined, M.lampGlow, items.length]}>
        <boxGeometry args={[0.26, 0.04, 0.5]} />
      </instancedMesh>
    </group>
  );
}

export default function City() {
  return (
    <group>
      <Ground />
      <Buildings />
      <Trees items={city.trees} />
      <Lamps items={city.lamps} />
    </group>
  );
}
