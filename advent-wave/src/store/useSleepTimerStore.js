import { create } from 'zustand'

/**
 * Stop playback after a while, or when the current item ends — for the hymns at bedtime and
 * the Friday-evening sermon that is still playing at 2 a.m.
 *
 * Deliberately not persisted: a timer that survived a reload would pause a session the
 * listener started fresh, with no visible reason. MusicPlayer is what enforces it.
 */
export const useSleepTimerStore = create((set) => ({
  /** Epoch ms at which playback pauses, for a timed sleep. */
  endsAt: null,
  /** Pause when the current item finishes instead of moving on. */
  endOfItem: false,

  setMinutes: (minutes) =>
    set({ endsAt: Date.now() + minutes * 60_000, endOfItem: false }),
  setEndOfItem: () => set({ endsAt: null, endOfItem: true }),
  cancel: () => set({ endsAt: null, endOfItem: false }),
}))

export function isSleepTimerActive(s) {
  return s.endsAt != null || s.endOfItem
}
