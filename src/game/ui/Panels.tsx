'use client';
// Modal panels: interactable content, full map, pause + settings.
import { useEffect, useRef, useState } from 'react';
import { X, FolderGit2, GraduationCap, Briefcase, MapPinned, Flag, Info, Settings2, Play, RotateCcw, Compass, CheckCircle2, Circle, ArrowUpRight } from 'lucide-react';
import { useProgress, useSession, useSettings, type CameraMode } from '../state/stores';
import { interactableById } from '../data/interactables';
import { districtById, districts, missions, qualities, type DistrictId, type QualityId } from '../data/world';
import { career, profile } from '../data/portfolio';
import { MapSvg, MapLegend } from './CityMap';
import { runtime, SPAWN } from '../player/runtime';

function Shell({ title, icon, children, wide = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  const close = useSession(s => s.closePanel);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-ink/20 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`panel flex max-h-[86vh] w-full flex-col overflow-hidden ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-ink-2">{icon}{title}</h2>
          <button className="rounded-md p-1 text-ink-2 hover:bg-paper-2" onClick={close} aria-label="Close (Esc)"><X size={18} /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ProfileContent() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-4xl leading-tight">{profile.name}</h3>
        <p className="mt-1 text-sm text-ink-2">{profile.roles.join(' · ')}</p>
        <p className="mt-3 text-[15px] leading-relaxed">{profile.headline}</p>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-paper-2 p-3">
        <GraduationCap size={18} className="mt-0.5 text-olive" />
        <div className="text-sm"><b>{profile.education.degree}</b><div className="text-ink-2">{profile.education.school} · {profile.education.years}</div></div>
      </div>
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2"><Briefcase size={14} /> Experience</h4>
        <ol className="space-y-2">
          {career.filter(c => c.id !== 'btech').reverse().map(c => (
            <li key={c.id} className="rounded-xl border border-line p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><b>{c.title}</b><span className="text-xs text-ink-2">{c.dates ?? 'dates not listed'}</span></div>
              <div className="text-ink-2">{c.org}</div>
              <p className="mt-1">{c.summary}</p>
            </li>
          ))}
        </ol>
      </div>
      <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer"><FolderGit2 size={16} /> GitHub profile <ArrowUpRight size={14} /></a>
    </div>
  );
}

function MissionsContent() {
  const done = useProgress(s => s.missionsDone);
  return (
    <ul className="space-y-2">
      {missions.map(m => {
        const ok = done.includes(m.id);
        return (
          <li key={m.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
            {ok ? <CheckCircle2 size={18} className="mt-0.5 text-olive" /> : <Circle size={18} className="mt-0.5 text-ink-2" />}
            <div><div className={`text-sm font-semibold ${ok ? 'text-ink-2 line-through' : ''}`}>{m.title}</div><div className="text-sm text-ink-2">{m.hint}</div></div>
          </li>
        );
      })}
    </ul>
  );
}

function AboutContent() {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed">
      <p>This city is Chirag Gour&apos;s portfolio. Each district stands for a real part of his work, and every fact in it comes from his repositories and résumé.</p>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {[['W A S D', 'Move'], ['Mouse', 'Look (click to lock)'], ['Shift', 'Sprint'], ['Space', 'Jump'], ['E', 'Interact'], ['Tab', 'City map'], ['M', 'Minimap'], ['C', 'Camera mode'], ['Esc', 'Pause']].map(([k, v]) => (
          <li key={k} className="flex items-center gap-2"><span className="kbd">{k}</span>{v}</li>
        ))}
      </ul>
      <p className="text-sm text-ink-2">Progress is saved in this browser only. Districts marked &ldquo;under construction&rdquo; are being built; their information is already readable from the map and gateways.</p>
    </div>
  );
}

function DistrictContent({ id }: { id: DistrictId }) {
  const d = districtById[id];
  const found = useProgress(s => s.districts.includes(id));
  return (
    <div className="space-y-3">
      <div className="h-1.5 w-16 rounded-full" style={{ background: d.color }} />
      <h3 className="font-serif text-3xl">{d.name}</h3>
      <p className="text-[15px] leading-relaxed">{d.blurb}</p>
      <div className="flex gap-2"><span className="chip">{d.built ? 'Open' : 'Under construction'}</span><span className="chip">{found ? 'Discovered' : 'Not yet discovered'}</span></div>
    </div>
  );
}

function MapContent() {
  const found = useProgress(s => s.districts);
  const [sel, setSel] = useState<DistrictId | null>(null);
  const close = useSession(s => s.closePanel);
  const travel = (id: DistrictId) => {
    const d = districtById[id];
    if (id === 'plaza') runtime.teleport = SPAWN.clone();
    else {
      const len = Math.hypot(...d.center);
      const k = (len - d.radius + 18) / len;
      runtime.teleport = SPAWN.clone().set(d.center[0] * k, 1.5, d.center[1] * k);
    }
    close();
  };
  const d = sel ? districtById[sel] : null;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_240px]">
      <div className="aspect-square overflow-hidden rounded-xl border border-line"><MapSvg onSelect={setSel} selected={sel} /></div>
      <div className="space-y-3">
        <MapLegend />
        <ul className="space-y-1">
          {districts.map(x => (
            <li key={x.id}>
              <button onClick={() => setSel(x.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-paper-2 ${sel === x.id ? 'bg-paper-2 font-semibold' : ''}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />{x.name}
                {found.includes(x.id) ? <CheckCircle2 size={14} className="ml-auto text-olive" /> : null}
              </button>
            </li>
          ))}
        </ul>
        {d ? (
          <div className="rounded-xl border border-line p-3 text-sm">
            <b>{d.name}</b><p className="mt-1 text-ink-2">{d.blurb}</p>
            {found.includes(d.id) ? (
              <button className="btn btn-primary mt-3 w-full justify-center" onClick={() => travel(d.id)}><Compass size={16} /> Fast travel</button>
            ) : <p className="mt-2 text-xs text-ink-2">Walk there once to unlock fast travel.</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingsContent() {
  const s = useSettings();
  const reset = useProgress(st => st.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-5 text-sm">
      <fieldset>
        <legend className="mb-2 font-semibold">Graphics quality</legend>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(qualities) as QualityId[]).map(q => (
            <button key={q} onClick={() => s.set({ quality: q })} className={`btn justify-center ${s.quality === q ? 'btn-primary' : ''}`}>{qualities[q].label}</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-2">Changes resolution, shadows, ambient occlusion, bloom, draw distance and tree density.</p>
      </fieldset>
      <label className="flex items-center justify-between gap-4">Mouse sensitivity
        <input type="range" min={0.2} max={2} step={0.05} value={s.sensitivity} onChange={e => s.set({ sensitivity: +e.target.value })} className="w-48 accent-[#c2410c]" />
      </label>
      <label className="flex items-center justify-between">Invert Y<input type="checkbox" checked={s.invertY} onChange={e => s.set({ invertY: e.target.checked })} className="h-4 w-4 accent-[#c2410c]" /></label>
      <label className="flex items-center justify-between">Reduce motion (shortens the intro, calmer camera)<input type="checkbox" checked={s.reducedMotion} onChange={e => s.set({ reducedMotion: e.target.checked })} className="h-4 w-4 accent-[#c2410c]" /></label>
      <label className="flex items-center justify-between">Skip intro next time<input type="checkbox" checked={s.skipIntro} onChange={e => s.set({ skipIntro: e.target.checked })} className="h-4 w-4 accent-[#c2410c]" /></label>
      <label className="flex items-center justify-between">Show minimap<input type="checkbox" checked={s.minimap} onChange={e => s.set({ minimap: e.target.checked })} className="h-4 w-4 accent-[#c2410c]" /></label>
      <fieldset>
        <legend className="mb-2 font-semibold">Camera</legend>
        <div className="grid grid-cols-3 gap-2">
          {(['third', 'first', 'cinematic'] as CameraMode[]).map(m => (
            <button key={m} onClick={() => s.set({ cameraMode: m })} className={`btn justify-center capitalize ${s.cameraMode === m ? 'btn-primary' : ''}`}>{m === 'third' ? 'Third person' : m === 'first' ? 'First person' : 'Cinematic'}</button>
          ))}
        </div>
      </fieldset>
      <div className="border-t border-line pt-4">
        {confirm ? (
          <div className="flex items-center gap-2"><span>Erase all exploration progress?</span>
            <button className="btn" onClick={() => setConfirm(false)}>Keep</button>
            <button className="btn btn-primary" onClick={() => { reset(); runtime.teleport = SPAWN.clone(); setConfirm(false); }}>Erase</button></div>
        ) : <button className="btn" onClick={() => setConfirm(true)}><RotateCcw size={16} /> Reset progress</button>}
      </div>
    </div>
  );
}

export default function Panels() {
  const panel = useSession(s => s.panel);
  const open = useSession(s => s.openPanel);
  if (!panel) return null;
  if (panel.type === 'map') return <Shell title="City map" icon={<MapPinned size={16} />} wide><MapContent /></Shell>;
  if (panel.type === 'settings') return <Shell title="Settings" icon={<Settings2 size={16} />}><SettingsContent /></Shell>;
  if (panel.type === 'pause') {
    return (
      <Shell title="Paused" icon={<Play size={16} />}>
        <div className="grid gap-2">
          <button className="btn btn-primary justify-center" onClick={() => useSession.getState().closePanel()}><Play size={16} /> Resume</button>
          <button className="btn justify-center" onClick={() => open({ type: 'map' })}><MapPinned size={16} /> City map</button>
          <button className="btn justify-center" onClick={() => open({ type: 'settings' })}><Settings2 size={16} /> Settings</button>
          <button className="btn justify-center" onClick={() => { useSession.getState().setMode('recruiter'); useSession.getState().closePanel(); }}><Briefcase size={16} /> Recruiter tour</button>
        </div>
      </Shell>
    );
  }
  const it = interactableById[panel.id];
  if (!it) return null;
  const body = it.kind === 'profile' ? <ProfileContent /> : it.kind === 'missions' ? <MissionsContent /> : it.kind === 'about' ? <AboutContent /> : it.kind === 'map' ? <MapContent /> : <DistrictContent id={it.ref as DistrictId} />;
  const icon = it.kind === 'profile' ? <Briefcase size={16} /> : it.kind === 'missions' ? <Flag size={16} /> : it.kind === 'map' ? <MapPinned size={16} /> : <Info size={16} />;
  return <Shell title={it.title} icon={icon} wide={it.kind === 'map'}>{body}</Shell>;
}
