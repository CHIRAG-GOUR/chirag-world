'use client';
// Title screen + Recruiter tour.
import { useState } from 'react';
import { Compass, Briefcase, FolderGit2, ArrowUpRight, X, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useSession, useSettings } from '../state/stores';
import { profile, projects, skills, career } from '../data/portfolio';
import { runtime } from '../player/runtime';

export function TitleScreen() {
  const phase = useSession(s => s.phase);
  const reduced = useSettings(s => s.reducedMotion);
  if (phase !== 'intro') return null;
  const begin = (mode: 'explorer' | 'recruiter') => {
    const s = useSession.getState();
    s.setMode(mode);
    s.setPhase('playing');
    // explorer: fly down to the player (skippable via settings); recruiter: stay cinematic
    runtime.inputEnabled = mode === 'recruiter' || useSettings.getState().skipIntro ? true : false;
    if (mode === 'recruiter') useSettings.getState().set({ cameraMode: 'cinematic' });
  };
  return (
    <div className="fixed inset-0 z-30 flex items-end p-6 md:items-center md:p-14">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#f7f5f0]/90 via-[#f7f5f0]/45 to-transparent" />
      <div className="relative max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-2">Welcome to the city of</p>
        <h1 className="mt-2 font-serif text-6xl leading-none text-ink md:text-8xl">{profile.name}</h1>
        <p className="mt-4 text-lg text-ink-2">{profile.roles.slice(0, 3).join(' · ')}</p>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink">{profile.headline} Walk the streets to explore the work, or take the quick tour.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button className="btn btn-primary px-5 py-3 text-base" onClick={() => begin('explorer')}><Compass size={18} /> Explore the city</button>
          <button className="btn px-5 py-3 text-base" onClick={() => begin('recruiter')}><Briefcase size={18} /> Recruiter tour (2 min)</button>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="h-4 w-4 accent-[#c2410c]" checked={reduced} onChange={e => useSettings.getState().set({ reducedMotion: e.target.checked })} />
          Reduce motion
        </label>
      </div>
    </div>
  );
}

const TABS = ['Profile', 'Projects', 'Skills', 'Experience', 'Contact'] as const;

export function RecruiterTour() {
  const mode = useSession(s => s.mode);
  const phase = useSession(s => s.phase);
  const [tab, setTab] = useState(0);
  if (mode !== 'recruiter' || phase !== 'playing') return null;
  const exit = () => {
    useSession.getState().setMode('explorer');
    useSettings.getState().set({ cameraMode: 'third' });
    runtime.inputEnabled = true;
  };
  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col p-4">
      <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-1 border-b border-line px-3 py-2">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === i ? 'bg-ink text-paper' : 'hover:bg-paper-2'}`}>{t}</button>
          ))}
          <button className="ml-auto rounded-md p-1.5 text-ink-2 hover:bg-paper-2" onClick={exit} aria-label="Leave tour and explore"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === 0 && (
            <div className="space-y-3">
              <h2 className="font-serif text-4xl">{profile.name}</h2>
              <p className="text-ink-2">{profile.roles.join(' · ')}</p>
              <p className="text-[15px] leading-relaxed">{profile.headline}</p>
              <p className="text-sm"><b>{profile.education.degree}</b> — {profile.education.school}, {profile.education.years}</p>
            </div>
          )}
          {tab === 1 && (
            <ul className="space-y-3">
              {projects.map(p => (
                <li key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between gap-2"><b>{p.name}</b><span className="chip capitalize">{p.kind}</span></div>
                  <p className="mt-1 text-sm">{p.tagline}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{p.stack.slice(0, 6).map(s => <span key={s} className="chip">{s}</span>)}</div>
                  <div className="mt-2 flex gap-3 text-sm">
                    {p.live ? <a className="inline-flex items-center gap-1 text-accent hover:underline" href={p.live} target="_blank" rel="noopener noreferrer">Live <ArrowUpRight size={13} /></a> : null}
                    {p.repo ? <a className="inline-flex items-center gap-1 text-ink-2 hover:underline" href={p.repo} target="_blank" rel="noopener noreferrer">Code <ArrowUpRight size={13} /></a> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {tab === 2 && (
            <div className="space-y-4">
              {skills.map(g => (
                <div key={g.id}><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">{g.name}</h3>
                  <div className="flex flex-wrap gap-1.5">{g.items.map(s => <span key={s} className="chip">{s}</span>)}</div></div>
              ))}
              <p className="text-xs text-ink-2">Every entry appears in the dependencies of Chirag&apos;s own repositories or on his résumé.</p>
            </div>
          )}
          {tab === 3 && (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {[...career].reverse().map(c => (
                <li key={c.id}>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-olive" />
                  <div className="text-xs text-ink-2">{c.dates ?? 'Dates not listed'}</div>
                  <b>{c.title}</b> <span className="text-ink-2">· {c.org}</span>
                  <p className="text-sm">{c.summary}</p>
                </li>
              ))}
            </ol>
          )}
          {tab === 4 && (
            <div className="space-y-3">
              <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer"><FolderGit2 size={16} /> github.com/CHIRAG-GOUR <ArrowUpRight size={14} /></a>
              <p className="text-sm text-ink-2">More contact options will appear here once Chirag chooses which to publish.</p>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-line px-3 py-2">
          <button className="btn" disabled={tab === 0} onClick={() => setTab(t => Math.max(0, t - 1))}><ChevronLeft size={16} /> Back</button>
          <button className="btn" onClick={() => useSession.getState().openPanel({ type: 'settings' })} aria-label="Settings"><Settings2 size={16} /></button>
          {tab < TABS.length - 1
            ? <button className="btn btn-primary" onClick={() => setTab(t => t + 1)}>Next <ChevronRight size={16} /></button>
            : <button className="btn btn-primary" onClick={exit}>Explore the city</button>}
        </footer>
      </div>
    </div>
  );
}
