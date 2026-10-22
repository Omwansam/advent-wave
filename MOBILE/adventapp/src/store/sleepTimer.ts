import { create } from 'zustand';

/**
 * Stop playback after a while, or when the current item ends — for the hymns at bedtime and the
 * Friday-evening sermon still playing at 2 a.m. Not persisted: a timer that outlived the app
 * would pause a session started fresh. The playback engine enforces it.
 */
interface SleepTimerState {
  endsAt: number | null;
  endOfItem: boolean;
  setMinutes: (minutes: number) => void;
  setEndOfItem: () => void;
  cancel: () => void;
}

export const useSleepTimerStore = create<SleepTimerState>((set) => ({
  endsAt: null,
  endOfItem: false,
  setMinutes: (minutes) => set({ endsAt: Date.now() + minutes * 60_000, endOfItem: false }),
  setEndOfItem: () => set({ endsAt: null, endOfItem: true }),
  cancel: () => set({ endsAt: null, endOfItem: false }),
}));

export function isSleepTimerActive(s: Pick<SleepTimerState, 'endsAt' | 'endOfItem'>): boolean {
  return s.endsAt != null || s.endOfItem;
}
