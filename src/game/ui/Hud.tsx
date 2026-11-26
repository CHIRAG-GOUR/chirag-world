'use client';
// Minimal HUD: to-do list (top-left), compass to the next goal (top-centre),
// progress + minimap (top-right), prompts and speed (bottom), toasts.
import { useEffect, useState } from 'react';
import { MapPin, Compass, Landmark, Flag, Map as MapIcon, Pause, CheckCircle2, Circle, Navigation, Car } from 'lucide-react';
import { useProgress, useSession, useSettings } from '../state/stores';
import { districtById, districts, missions } from '../data/world';
import { interactableById, interactables } from '../data/interactables';
import { Minimap } from './CityMap';
import { useToasts } from '../systems/notify';
import { openInteractable, toggleCar } from './useHotkeys';
import { currentObjective } from '../systems/objective';
import { runtime } from '../player/runtime';

function Stat({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  return (
    <div className="flex items-center gap-2 text-xs" title={label}>
      <span className="text-ink-2">{icon}</span>
      <span className="w-20 text-ink-2">{label}</span>
      <span className="font-semibold tabular-nums">{value}/{total}</span>
    </div>
  );
}

/** Live values that change every frame (read from runtime, refreshed ~10×/s). */
function useLive() {
  const [v, setV] = useState({ arrow: 0, dist: 0, label: '', speed: 0, driving: false, carNear: false, seated: true });
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (t: number) => {
      if (t - last > 90) {
        last = t;
        const obj = currentObjective(useProgress.getState().missionsDone);
        let arrow = 0, dist = 0, label = '';
        if (obj) {
          const dx = obj.position.x - runtime.position.x, dz = obj.position.z - runtime.position.z;
          dist = Math.hypot(dx, dz);
          // camera looks along (-sin yaw, -cos yaw); arrow angle is target bearing relative to that
          const camAng = Math.atan2(-Math.sin(runtime.cameraYaw), -Math.cos(runtime.cameraYaw));
          arrow = Math.atan2(dx, dz) - camAng;
          label = obj.label;
        }
        setV({ arrow, dist, label, speed: Math.abs(runtime.car.speed) * 3.6, driving: runtime.driving, carNear: runtime.carNear, seated: runtime.seated });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return v;
}

export default function Hud() {
  const district = useSession(s => s.district);
  const nearest = useSession(s => s.nearest);
  const panel = useSession(s => s.panel);
  const open = useSession(s => s.openPanel);
  const minimap = useSettings(s => s.minimap);
  const found = useProgress(s => s.districts);
  const visited = useProgress(s => s.interacted);
  const done = useProgress(s => s.missionsDone);
  const toasts = useToasts(s => s.items);
  const live = useLive();
  const it = nearest ? interactableById[nearest] : null;
  const nextIdx = missions.findIndex(m => !done.includes(m.id));
  const shown = missions.slice(Math.max(0, nextIdx - 1), Math.max(0, nextIdx - 1) + 5);

  const [hint, setHint] = useState(true);
  useEffect(() => { const t = setTimeout(() => setHint(false), 15000); return () => clearTimeout(t); }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* top-left: to-do list */}
      <div className="absolute left-4 top-4 w-72">
        <div className="panel pointer-events-auto px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2"><MapPin size={13} />{district ? districtById[district].name : 'City streets'}</div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2">To do</div>
          <ul className="mt-1 space-y-1.5">
            {shown.map(m => {
              const ok = done.includes(m.id), active = missions[nextIdx]?.id === m.id;
              return (
                <li key={m.id} className={`flex items-start gap-2 text-sm ${ok ? 'text-ink-2' : ''}`}>
                  {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-olive" /> : <Circle size={15} className={`mt-0.5 shrink-0 ${active ? 'text-accent' : 'text-ink-2'}`} />}
                  <div>
                    <div className={ok ? 'line-through' : active ? 'font-semibold' : ''}>{m.title}</div>
                    {active ? <div className="text-xs text-ink-2">{m.hint}</div> : null}
                  </div>
                </li>
              );
            })}
            {nextIdx === -1 ? <li className="text-sm font-semibold">Every task complete.</li> : null}
          </ul>
          <div className="mt-2 text-[11px] text-ink-2">{done.length} of {missions.length} done</div>
        </div>
      </div>

      {/* top-centre: compass to the next goal */}
      {live.label && !live.seated ? (
        <div className="panel absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3 px-4 py-2">
          <Navigation size={20} className="text-accent" style={{ transform: `rotate(${(-live.arrow * 180) / Math.PI}deg)` }} />
          <div className="text-sm"><b>{live.label}</b> <span className="tabular-nums text-ink-2">· {Math.round(live.dist)} m</span></div>
        </div>
      ) : null}

      {/* top-right: real progress + minimap */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
        <div className="panel pointer-events-auto flex items-center gap-1 p-1">
          <button className="rounded-lg p-2 hover:bg-paper-2" onClick={() => open({ type: 'map' })} aria-label="City map (Tab)"><MapIcon size={18} /></button>
          <button className="rounded-lg p-2 hover:bg-paper-2" onClick={() => open({ type: 'pause' })} aria-label="Pause (Esc)"><Pause size={18} /></button>
        </div>
        <div className="panel space-y-1 px-3 py-2.5">
          <Stat icon={<Compass size={13} />} label="Districts" value={found.length} total={districts.length} />
          <Stat icon={<Landmark size={13} />} label="Landmarks" value={visited.filter(v => interactableById[v]).length} total={interactables.length} />
          <Stat icon={<Flag size={13} />} label="Tasks" value={done.length} total={missions.length} />
        </div>
        {minimap ? <Minimap /> : null}
      </div>

      {/* bottom: prompts */}
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {it && !panel && !live.driving ? (
          <button className="panel pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-sm" onClick={() => openInteractable(it.id)}>
            <span className="kbd">E</span><span>{it.label[0].toUpperCase() + it.label.slice(1)}</span>
          </button>
        ) : null}
        {(live.carNear || live.driving) && !panel ? (
          <button className="panel pointer-events-auto flex items-center gap-3 px-4 py-2.5 text-sm" onClick={toggleCar}>
            <span className="kbd">F</span><Car size={16} /><span>{live.driving ? 'Get out' : 'Drive the supercar'}</span>
          </button>
        ) : null}
        {live.driving ? (
          <div className="panel flex items-baseline gap-2 px-4 py-2"><span className="font-serif text-3xl tabular-nums">{Math.round(live.speed)}</span><span className="text-xs text-ink-2">km/h · W/S throttle · A/D steer · Space handbrake</span></div>
        ) : null}
      </div>

      {/* bottom-left: controls hint */}
      {hint && !live.driving ? (
        <div className="panel absolute bottom-4 left-4 hidden gap-3 px-3 py-2 text-xs text-ink-2 md:flex">
          {[['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'jump'], ['E', 'interact'], ['F', 'car'], ['Tab', 'map'], ['C', 'camera']].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5"><span className="kbd">{k}</span>{v}</span>
          ))}
        </div>
      ) : null}

      {/* toasts */}
      <div className="absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map(t => <div key={t.id} className="panel px-4 py-2 text-sm font-medium">{t.text}</div>)}
      </div>
    </div>
  );
}
