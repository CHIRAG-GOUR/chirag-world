'use client';
// Root of the client app: 3D experience + UI overlay.
import Experience from './Experience';
import Hud from './ui/Hud';
import Panels from './ui/Panels';
import TouchControls from './ui/TouchControls';
import { TitleScreen, RecruiterTour } from './ui/Screens';
import { useHotkeys } from './ui/useHotkeys';
import { useSession } from './state/stores';

export default function Game() {
  useHotkeys();
  const phase = useSession(s => s.phase);
  const mode = useSession(s => s.mode);
  return (
    <main className="fixed inset-0">
      <Experience />
      {phase === 'loading' ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#d9d3c7]">
          <p className="font-serif text-3xl text-ink">Building the city…</p>
        </div>
      ) : null}
      <TitleScreen />
      {phase === 'playing' && mode === 'explorer' ? <><Hud /><TouchControls /></> : null}
      <RecruiterTour />
      <Panels />
    </main>
  );
}
