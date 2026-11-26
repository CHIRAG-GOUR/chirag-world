'use client';
// Mobile: left virtual joystick, right-side drag to look, jump + interact buttons.
import { useRef, useState } from 'react';
import { ArrowUp, Hand } from 'lucide-react';
import { touch } from '../player/touch';
import { useSession } from '../state/stores';
import { openInteractable } from './useHotkeys';

export default function TouchControls() {
  const nearest = useSession(s => s.nearest);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const look = useRef<{ x: number; y: number; id: number } | null>(null);
  const R = 46;

  return (
    <div className="fixed inset-0 z-10 md:hidden" style={{ pointerEvents: 'none' }}>
      {/* look area: right 60% of the screen */}
      <div className="absolute inset-y-0 right-0 w-3/5" style={{ pointerEvents: 'auto', touchAction: 'none' }}
        onPointerDown={e => { look.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const l = look.current; if (!l || l.id !== e.pointerId) return; touch.look.dx += e.clientX - l.x; touch.look.dy += e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; }}
        onPointerUp={() => { look.current = null; }} />
      {/* joystick */}
      <div className="absolute bottom-8 left-8 h-32 w-32 rounded-full border border-line bg-paper/60" style={{ pointerEvents: 'auto', touchAction: 'none' }}
        onPointerDown={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={e => {
          const o = origin.current; if (!o || o.id !== e.pointerId) return;
          let dx = e.clientX - o.x, dy = e.clientY - o.y; const d = Math.hypot(dx, dy);
          if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
          setKnob({ x: dx, y: dy }); touch.move.x = dx / R; touch.move.y = dy / R; touch.sprint = d > R * 0.95;
        }}
        onPointerUp={() => { origin.current = null; setKnob({ x: 0, y: 0 }); touch.move.x = touch.move.y = 0; touch.sprint = false; }}>
        <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-ink/70" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <div className="absolute bottom-10 right-6 flex gap-3" style={{ pointerEvents: 'auto' }}>
        {nearest ? <button className="panel grid h-14 w-14 place-items-center" onClick={() => openInteractable(nearest)} aria-label="Interact"><Hand size={22} /></button> : null}
        <button className="panel grid h-14 w-14 place-items-center" onPointerDown={() => { touch.jump = true; }} aria-label="Jump"><ArrowUp size={22} /></button>
      </div>
    </div>
  );
}
