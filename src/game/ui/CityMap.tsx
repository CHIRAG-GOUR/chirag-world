'use client';
// SVG city map generated from the same layout data as the 3D world (minimap + full map).
import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { districts, type DistrictId } from '../data/world';
import { interactables } from '../data/interactables';
import { streetLines, CITY_HALF, PLAZA_R } from '../world/layout';
import { runtime } from '../player/runtime';
import { useProgress } from '../state/stores';

const EXTENT = CITY_HALF + 20;

function usePlayerMarker() {
  const [p, setP] = useState({ x: runtime.position.x, z: runtime.position.z, yaw: runtime.facing });
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (t: number) => {
      if (t - last > 100) { last = t; setP({ x: runtime.position.x, z: runtime.position.z, yaw: runtime.facing }); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

export function MapSvg({ zoom = 1, centerOnPlayer = false, onSelect, selected }: {
  zoom?: number; centerOnPlayer?: boolean; onSelect?: (id: DistrictId) => void; selected?: DistrictId | null;
}) {
  const p = usePlayerMarker();
  const found = useProgress(s => s.districts);
  const visited = useProgress(s => s.interacted);
  const span = (EXTENT * 2) / zoom;
  const cx = centerOnPlayer ? p.x : 0, cz = centerOnPlayer ? p.z : 0;
  const view = `${cx - span / 2} ${cz - span / 2} ${span} ${span}`;
  return (
    <svg viewBox={view} className="h-full w-full" role="img" aria-label="City map">
      <rect x={-EXTENT * 2} y={-EXTENT * 2} width={EXTENT * 4} height={EXTENT * 4} fill="#e9e3d6" />
      <rect x={-CITY_HALF} y={-CITY_HALF} width={CITY_HALF * 2} height={CITY_HALF * 2} fill="#e2dbcc" />
      {streetLines.map(l => (
        <g key={l} fill="#f8f5ee">
          <rect x={l - 7} y={-CITY_HALF} width={14} height={CITY_HALF * 2} />
          <rect x={-CITY_HALF} y={l - 7} width={CITY_HALF * 2} height={14} />
        </g>
      ))}
      <circle cx={0} cy={0} r={PLAZA_R} fill="#d9ccb2" />
      {districts.map(d => {
        const known = found.includes(d.id);
        return (
          <g key={d.id} onClick={() => onSelect?.(d.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <circle cx={d.center[0]} cy={d.center[1]} r={d.radius} fill={d.color} fillOpacity={known ? 0.55 : 0.18}
              stroke={selected === d.id ? '#c2410c' : d.color} strokeWidth={selected === d.id ? 4 : 2} strokeDasharray={known ? undefined : '6 5'} />
            <text x={d.center[0]} y={d.center[1] + 5} textAnchor="middle" fontSize={zoom > 2 ? 9 : 15} fontWeight={600} fill="#1c1b19">{d.short}</text>
          </g>
        );
      })}
      {interactables.map(it => (
        <circle key={it.id} cx={it.position[0]} cy={it.position[2]} r={zoom > 2 ? 1.6 : 3} fill={visited.includes(it.id) ? '#6b7a2e' : '#c2410c'} />
      ))}
      <g transform={`translate(${p.x} ${p.z}) rotate(${(-p.yaw * 180) / Math.PI + 180})`}>
        <path d={zoom > 2 ? 'M0 -4 L3 3 L0 1.6 L-3 3 Z' : 'M0 -8 L6 6 L0 3 L-6 6 Z'} fill="#1c1b19" stroke="#f7f5f0" strokeWidth={zoom > 2 ? 0.8 : 1.5} />
      </g>
    </svg>
  );
}

export function Minimap() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="panel h-40 w-40 overflow-hidden p-0" aria-label="Minimap">
      <MapSvg zoom={3.6} centerOnPlayer />
    </div>
  );
}

export function MapLegend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-ink-2">
      <li className="flex items-center gap-1"><Navigation size={12} /> You</li>
      <li className="flex items-center gap-1"><MapPin size={12} className="text-accent" /> Not visited</li>
      <li className="flex items-center gap-1"><MapPin size={12} className="text-olive" /> Visited</li>
      <li className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border border-dashed border-ink-2" /> Undiscovered district</li>
    </ul>
  );
}
