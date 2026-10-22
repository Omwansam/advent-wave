import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asTracks, type Track } from '@/api/models';
import type { PlayerStateDto } from '@/api/types';
import { PLAYBACK_RATES } from '@/lib/longForm';
import { appStorage } from '@/lib/storage';

/**
 * What is playing and what comes next: the web app's usePlayerStore, in TypeScript. The
 * playback engine (src/playback/engine.ts) follows this store and reports back into it; screens
 * only ever talk to the store. Queue rules — shuffle keeps an ordered copy, repeat-all wraps,
 * Play next goes after the current item — are the web's, so the queue the server keeps reads
 * the same on both.
 */
export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentSong: Track | null;
  isPlaying: boolean;
  /** Wanted playing but no sound yet: loading or stalled. Never persisted. */
  buffering: boolean;
  queue: Track[];
  /** When shuffle is on: the unshuffled queue, to return to. */
  orderedQueue: Track[] | null;
  currentIndex: number;
  /** Seconds to seek to once the resumed item loads; applied once by the engine. */
  pendingSeekSec: number | null;
  pendingSeekId: string | null;
  /** True once the account's copy has been applied (or found empty) this session. */
  hydrated: boolean;
  /** Kept for the server's player_state; a phone's volume is its own buttons. */
  volume: number;
  /** Sermons and podcasts only; songs always play at 1×. */
  playbackRate: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;

  hydrateFromServer: (state: PlayerStateDto | null) => void;
  clearPendingSeek: () => void;
  resetForLogout: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playSong: (song: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  jumpToQueueIndex: (index: number) => void;
  enqueueSongs: (songs: Track[]) => void;
  playNext: (song: Track) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearUpcoming: () => void;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  setBuffering: (v: boolean) => void;
  nextSong: () => void;
  /** @returns true if the item changed */
  prevSong: () => boolean;
  setPlaybackRate: (r: number) => void;
  stepPlaybackRate: (dir: 1 | -1) => number;
  setProgress: (currentTime: number, duration?: number) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueueFromList(list: Track[], song: Track, shuffleOn: boolean) {
  const base = [...list];
  let q = base;
  if (shuffleOn) {
    // The chosen item plays first; the rest are shuffled after it, as on the web.
    const rest = shuffleArray(base.filter((s) => s.id !== song.id));
    q = [base.find((s) => s.id === song.id) ?? song, ...rest];
  }
  const idx = Math.max(
    0,
    q.findIndex((s) => s.id === song.id),
  );
  return {
    queue: q,
    orderedQueue: shuffleOn ? base : null,
    currentSong: q[idx] ?? song,
    currentIndex: idx,
  };
}

/** What nextSong() would move to, without moving: the next item, or the first under repeat-all. */
export function peekNext(s: Pick<PlayerState, 'queue' | 'currentIndex' | 'repeat'>): Track | null {
  const { queue, currentIndex, repeat } = s;
  if (currentIndex < queue.length - 1) return queue[currentIndex + 1];
  if (repeat === 'all' && queue.length > 1) return queue[0];
  return null;
}

/** What prevSong() would move to. */
export function peekPrevious(s: Pick<PlayerState, 'queue' | 'currentIndex' | 'repeat'>): Track | null {
  const { queue, currentIndex, repeat } = s;
  if (currentIndex > 0) return queue[currentIndex - 1];
  if (repeat === 'all' && queue.length > 1) return queue[queue.length - 1];
  return null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      buffering: false,
      queue: [],
      orderedQueue: null,
      currentIndex: 0,
      pendingSeekSec: null,
      pendingSeekId: null,
      hydrated: false,
      volume: 0.85,
      playbackRate: 1,
      currentTime: 0,
      duration: 0,
      shuffle: false,
      repeat: 'off',

      /**
       * Applies the account's player state: the queue with tracks resolved, and where playback
       * stopped. Never starts playing — sound the listener did not ask for is worse than silence.
       */
      hydrateFromServer: (state) => {
        // Something was picked before the account's copy arrived; that choice is newer.
        if (get().currentSong || !state) {
          set({ hydrated: true });
          return;
        }
        const queue = asTracks(state.tracks);
        if (!queue.length) {
          set({ hydrated: true });
          return;
        }
        const idx = Math.min(Math.max(0, state.currentIndex ?? 0), queue.length - 1);
        const byId = new Map(queue.map((t) => [t.id, t]));
        const orderedQueue = state.orderedQueue?.length
          ? state.orderedQueue.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t))
          : null;
        const positionSec = (state.positionMs ?? 0) / 1000;
        set({
          queue,
          orderedQueue,
          currentIndex: idx,
          currentSong: queue[idx],
          isPlaying: false,
          currentTime: positionSec,
          pendingSeekSec: positionSec > 0 ? positionSec : null,
          pendingSeekId: positionSec > 0 ? queue[idx].id : null,
          volume: typeof state.volume === 'number' ? state.volume : get().volume,
          shuffle: Boolean(state.shuffle),
          repeat: state.repeat === 'all' || state.repeat === 'one' ? state.repeat : 'off',
          hydrated: true,
        });
      },

      clearPendingSeek: () => set({ pendingSeekSec: null, pendingSeekId: null }),

      /** The next account must not resume this one's queue. */
      resetForLogout: () =>
        set({
          currentSong: null,
          isPlaying: false,
          buffering: false,
          queue: [],
          orderedQueue: null,
          currentIndex: 0,
          currentTime: 0,
          duration: 0,
          pendingSeekSec: null,
          pendingSeekId: null,
          hydrated: false,
        }),

      toggleShuffle: () => {
        const s = get();
        if (!s.queue.length) {
          set({ shuffle: !s.shuffle });
          return;
        }
        if (!s.shuffle) {
          const base = s.orderedQueue ? [...s.orderedQueue] : [...s.queue];
          // Keep what is playing where it is and shuffle only what comes after it.
          const current = s.currentSong;
          const rest = shuffleArray(base.filter((x) => x.id !== current?.id));
          const queue = current ? [current, ...rest] : rest;
          set({ shuffle: true, orderedQueue: base, queue, currentIndex: 0, currentSong: queue[0] ?? null });
        } else {
          const base = s.orderedQueue ?? [...s.queue];
          const idx = Math.max(
            0,
            base.findIndex((x) => x.id === s.currentSong?.id),
          );
          set({ shuffle: false, orderedQueue: null, queue: base, currentIndex: idx, currentSong: base[idx] ?? null });
        }
      },

      cycleRepeat: () =>
        set((s) => {
          const order: RepeatMode[] = ['off', 'all', 'one'];
          return { repeat: order[(order.indexOf(s.repeat) + 1) % order.length] };
        }),

      playSong: (song, queue) => {
        const list = queue?.length ? [...queue] : [song];
        set({ ...buildQueueFromList(list, song, get().shuffle), isPlaying: true, currentTime: 0, duration: 0 });
      },

      playQueue: (queue, startIndex = 0) => {
        if (!queue.length) return;
        const i = Math.min(Math.max(0, startIndex), queue.length - 1);
        set({ ...buildQueueFromList(queue, queue[i], get().shuffle), isPlaying: true, currentTime: 0, duration: 0 });
      },

      jumpToQueueIndex: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({ currentSong: queue[index], currentIndex: index, isPlaying: true, currentTime: 0, duration: 0 });
      },

      enqueueSongs: (songs) => {
        const list = songs.filter(Boolean);
        if (!list.length) return;
        set((s) => {
          if (!s.currentSong) {
            return { queue: list, orderedQueue: null, currentIndex: 0, currentSong: list[0], isPlaying: true, currentTime: 0 };
          }
          const queue = [...s.queue, ...list];
          if (s.shuffle && s.orderedQueue) return { queue, orderedQueue: [...s.orderedQueue, ...list] };
          return { queue };
        });
      },

      playNext: (song) => {
        set((s) => {
          if (!s.currentSong) {
            return { queue: [song], orderedQueue: null, currentIndex: 0, currentSong: song, isPlaying: true, currentTime: 0 };
          }
          const q = [...s.queue];
          q.splice(Math.min(s.currentIndex + 1, q.length), 0, song);
          if (s.shuffle && s.orderedQueue) {
            const oq = [...s.orderedQueue];
            const oi = oq.findIndex((x) => x.id === s.currentSong?.id);
            oq.splice(oi >= 0 ? oi + 1 : oq.length, 0, song);
            return { queue: q, orderedQueue: oq };
          }
          return { queue: q };
        });
      },

      removeFromQueue: (index) => {
        set((s) => {
          if (index < 0 || index >= s.queue.length) return s;
          const removed = s.queue[index];
          const q = s.queue.filter((_, i) => i !== index);
          if (q.length === 0) {
            return { queue: [], orderedQueue: null, currentIndex: 0, currentSong: null, isPlaying: false, currentTime: 0 };
          }
          let ci = s.currentIndex;
          if (index < s.currentIndex) ci -= 1;
          ci = Math.max(0, Math.min(ci, q.length - 1));
          const oq = s.shuffle && s.orderedQueue ? s.orderedQueue.filter((x) => x.id !== removed.id) : null;
          return { queue: q, orderedQueue: oq, currentIndex: ci, currentSong: q[ci] };
        });
      },

      /** Drag to reorder in the queue screen. Never moves what is playing. */
      moveInQueue: (from, to) => {
        set((s) => {
          if (from === to || from === s.currentIndex || to <= s.currentIndex) return s;
          if (from < 0 || from >= s.queue.length || to >= s.queue.length) return s;
          const q = [...s.queue];
          const [item] = q.splice(from, 1);
          q.splice(to, 0, item);
          return { queue: q };
        });
      },

      clearUpcoming: () =>
        set((s) => {
          if (!s.currentSong) return s;
          const queue = s.queue.slice(0, s.currentIndex + 1);
          const keep = new Set(queue.map((t) => t.id));
          return { queue, orderedQueue: s.orderedQueue ? s.orderedQueue.filter((t) => keep.has(t.id)) : null };
        }),

      togglePlay: () => set((s) => (s.currentSong ? { isPlaying: !s.isPlaying } : s)),
      setPlaying: (v) => set({ isPlaying: Boolean(v) }),
      setBuffering: (v) => {
        if (get().buffering !== v) set({ buffering: v });
      },

      nextSong: () => {
        const s = get();
        const next = peekNext(s);
        if (!next) {
          set({ isPlaying: false, currentTime: 0 });
          return;
        }
        const idx = s.currentIndex < s.queue.length - 1 ? s.currentIndex + 1 : 0;
        set({ currentSong: s.queue[idx], currentIndex: idx, isPlaying: true, currentTime: 0, duration: 0 });
      },

      prevSong: () => {
        const s = get();
        if (!peekPrevious(s)) return false;
        const idx = s.currentIndex > 0 ? s.currentIndex - 1 : s.queue.length - 1;
        set({ currentSong: s.queue[idx], currentIndex: idx, isPlaying: true, currentTime: 0, duration: 0 });
        return true;
      },

      setPlaybackRate: (r) => {
        if ((PLAYBACK_RATES as readonly number[]).includes(r)) set({ playbackRate: r });
      },

      stepPlaybackRate: (dir) => {
        const rates = PLAYBACK_RATES as readonly number[];
        const i = rates.indexOf(get().playbackRate);
        const from = i >= 0 ? i : rates.indexOf(1);
        const to = Math.min(rates.length - 1, Math.max(0, from + dir));
        set({ playbackRate: rates[to] });
        return rates[to];
      },

      setProgress: (currentTime, duration) => {
        const s = get();
        const d = duration && duration > 0 ? duration : s.duration;
        if (Math.abs(s.currentTime - currentTime) < 0.05 && d === s.duration) return;
        set({ currentTime, duration: d });
      },
    }),
    {
      name: 'adventwave-player',
      storage: appStorage,
      partialize: (s) => ({ volume: s.volume, playbackRate: s.playbackRate, shuffle: s.shuffle, repeat: s.repeat }),
    },
  ),
);
