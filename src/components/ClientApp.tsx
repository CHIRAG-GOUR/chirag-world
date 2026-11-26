'use client';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/game/Game'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-[#d9d3c7]">
      <p className="font-serif text-3xl text-ink">Chirag Gour</p>
    </div>
  ),
});

export default function ClientApp() {
  return <Game />;
}
