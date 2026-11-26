'use client';
// Game state split by lifetime: session (not saved), settings (saved), progress (saved, versioned).
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { detectQuality, missions, type QualityId, type DistrictId } from '../data/world';

// localStorage that never throws (private mode, quota, disabled storage).
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ------------------------------------------------------------------ session
export type Panel =
  | { type: 'interactable'; id: string }
  | { type: 'map' }
  | { type: 'pause' }
  | { type: 'settings' }
  | null;

type SessionState = {
  phase: 'loading' | 'intro' | 'playing';
  mode: 'explorer' | 'recruiter';
  panel: Panel;
  nearest: string | null; // id of nearest interactable in range
  district: DistrictId | null;
  pointerLocked: boolean;
  setPhase: (p: SessionState['phase']) => void;
  setMode: (m: SessionState['mode']) => void;
  openPanel: (p: Panel) => void;
  closePanel: () => void;
  setNearest: (id: string | null) => void;
  setDistrict: (d: DistrictId | null) => void;
  setPointerLocked: (v: boolean) => void;
};

export const useSession = create<SessionState>((set) => ({
  phase: 'loading',
  mode: 'explorer',
  panel: null,
  nearest: null,
  district: null,
  pointerLocked: false,
  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  setNearest: (nearest) => set((s) => (s.nearest === nearest ? s : { nearest })),
  setDistrict: (district) => set((s) => (s.district === district ? s : { district })),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
}));

// ------------------------------------------------------------------ settings
export type CameraMode = 'third' | 'first' | 'cinematic';
type SettingsState = {
  quality: QualityId;
  sensitivity: number; // 0.2 .. 2
  invertY: boolean;
  volume: number; // 0..1
  muted: boolean;
  reducedMotion: boolean;
  skipIntro: boolean;
  minimap: boolean;
  cameraMode: CameraMode;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      quality: detectQuality(),
      sensitivity: 1,
      invertY: false,
      volume: 0.6,
      muted: false,
      reducedMotion: false,
      skipIntro: false,
      minimap: true,
      cameraMode: 'third',
      set: (patch) => set(patch),
    }),
    { name: 'chirag-world:settings', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);

// ------------------------------------------------------------------ progress (versioned, validated)
export const PROGRESS_VERSION = 1;

type ProgressData = {
  districts: DistrictId[];
  interacted: string[]; // interactable ids actually opened
  projects: string[]; // project ids actually viewed
  missionsDone: string[];
  achievements: string[];
  playerPos: [number, number, number] | null;
};
type ProgressState = ProgressData & {
  discoverDistrict: (d: DistrictId) => boolean;
  markInteracted: (id: string) => void;
  markProject: (id: string) => void;
  savePosition: (p: [number, number, number]) => void;
  reset: () => void;
};

const emptyProgress: ProgressData = { districts: [], interacted: [], projects: [], missionsDone: [], achievements: [], playerPos: null };

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 500) : []);
function sanitize(raw: unknown): ProgressData {
  if (!raw || typeof raw !== 'object') return { ...emptyProgress };
  const r = raw as Record<string, unknown>;
  const pos = Array.isArray(r.playerPos) && r.playerPos.length === 3 && r.playerPos.every(n => Number.isFinite(n))
    ? (r.playerPos as [number, number, number]) : null;
  return {
    districts: strArr(r.districts) as DistrictId[],
    interacted: strArr(r.interacted),
    projects: strArr(r.projects),
    missionsDone: strArr(r.missionsDone),
    achievements: strArr(r.achievements),
    playerPos: pos,
  };
}

/** Recompute missions from real actions — never stored as free-floating flags. */
function completedMissions(p: ProgressData): string[] {
  return missions
    .filter(m => (m.target.type === 'interact' ? p.interacted.includes(m.target.id) : p.districts.includes(m.target.id as DistrictId)))
    .map(m => m.id);
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...emptyProgress,
      discoverDistrict: (d) => {
        if (get().districts.includes(d)) return false;
        set((s) => {
          const next = { ...s, districts: [...s.districts, d] };
          return { districts: next.districts, missionsDone: completedMissions(next) };
        });
        return true;
      },
      markInteracted: (id) => {
        if (get().interacted.includes(id)) return;
        set((s) => {
          const next = { ...s, interacted: [...s.interacted, id] };
          return { interacted: next.interacted, missionsDone: completedMissions(next) };
        });
      },
      markProject: (id) => set((s) => (s.projects.includes(id) ? s : { projects: [...s.projects, id] })),
      savePosition: (playerPos) => set({ playerPos }),
      reset: () => set({ ...emptyProgress }),
    }),
    {
      name: 'chirag-world:progress',
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => sanitize(s),
      migrate: (persisted) => sanitize(persisted), // unknown/older shapes are cleaned, never crash
      merge: (persisted, current) => {
        const clean = sanitize(persisted);
        return { ...current, ...clean, missionsDone: completedMissions(clean) };
      },
    },
  ),
);
