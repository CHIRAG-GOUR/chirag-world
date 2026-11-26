'use client';
// Tiny toast queue for discovery / mission notifications.
import { create } from 'zustand';

type Toast = { id: number; text: string };
export const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }));
let n = 0;
export function notify(text: string) {
  const id = ++n;
  useToasts.setState(s => ({ items: [...s.items.slice(-2), { id, text }] }));
  setTimeout(() => useToasts.setState(s => ({ items: s.items.filter(t => t.id !== id) })), 3600);
}
