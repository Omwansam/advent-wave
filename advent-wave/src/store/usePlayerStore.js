import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** @typedef {'off' | 'all' | 'one'} RepeatMode */

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * @param {object[]} list
 * @param {object} song
 * @param {boolean} shuffleOn
 */
function buildQueueFromList(list, song, shuffleOn) {
  const base = [...list]
  const q = shuffleOn ? shuffleArray(base) : base
  const idx = Math.max(0, q.findIndex((s) => s.id === song.id))
  return {
    queue: q,
    orderedQueue: shuffleOn ? base : null,
    currentSong: q[idx] ?? song,
    currentIndex: idx,
  }
}

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      queue: [],
      /**
       * Position to seek to once the resumed track's metadata loads, in seconds. Set by
       * hydrateFromServer, consumed by MusicPlayer, then cleared. Kept separate from
       * currentTime so a seek is applied exactly once, not on every re-render.
       */
      pendingSeekSec: null,
      /** The track pendingSeekSec belongs to. Any other track starts from the top. */
      pendingSeekId: null,
      /** True once the server's copy has been applied (or found empty) for this session. */
      hydrated: false,
      /** When shuffle is on: non-shuffled copy for turning shuffle off. */
      orderedQueue: null,
      currentIndex: 0,
      volume: 0.85,
      currentTime: 0,
      duration: 0,
      shuffle: false,
      /** @type {RepeatMode} */
      repeat: 'off',
      queuePanelOpen: false,

      /**
       * Applies the account's server-side player state: the queue with tracks resolved, the
       * current index, and where playback stopped. Never starts playing — browsers block
       * autoplay, and resuming into sound the listener did not ask for is worse anyway.
       *
       * @param {{ tracks: object[], currentIndex: number, positionMs: number, volume: number,
       *           shuffle: boolean, repeat: string, orderedQueue: string[] | null } | null} state
       */
      hydrateFromServer: (state) => {
        // The listener picked a track before the account's copy arrived. That choice is newer
        // than anything the server holds, so it stands and the restore is skipped.
        if (get().currentSong) {
          set({ hydrated: true })
          return
        }
        if (!state || !state.tracks?.length) {
          set({ hydrated: true })
          return
        }
        const queue = state.tracks
        const idx = Math.min(Math.max(0, state.currentIndex ?? 0), queue.length - 1)
        // orderedQueue holds ids; rebuild it from the resolved tracks so it stays objects here.
        const byId = new Map(queue.map((t) => [t.id, t]))
        const orderedQueue = state.orderedQueue?.length
          ? state.orderedQueue.map((id) => byId.get(id)).filter(Boolean)
          : null
        set({
          queue,
          orderedQueue,
          currentIndex: idx,
          currentSong: queue[idx],
          isPlaying: false,
          currentTime: (state.positionMs ?? 0) / 1000,
          pendingSeekSec: (state.positionMs ?? 0) / 1000,
          pendingSeekId: queue[idx].id,
          volume: typeof state.volume === 'number' ? state.volume : get().volume,
          shuffle: Boolean(state.shuffle),
          repeat: ['off', 'all', 'one'].includes(state.repeat) ? state.repeat : 'off',
          hydrated: true,
        })
      },

      clearPendingSeek: () => set({ pendingSeekSec: null, pendingSeekId: null }),

      /** On logout: the next account must not resume this one's queue. */
      resetForLogout: () =>
        set({
          currentSong: null,
          isPlaying: false,
          queue: [],
          orderedQueue: null,
          currentIndex: 0,
          currentTime: 0,
          duration: 0,
          pendingSeekSec: null,
          pendingSeekId: null,
          hydrated: false,
        }),

      setQueuePanelOpen: (v) => set({ queuePanelOpen: Boolean(v) }),
      toggleQueuePanel: () => set((s) => ({ queuePanelOpen: !s.queuePanelOpen })),

      toggleShuffle: () => {
        const s = get()
        if (!s.queue.length) {
          set((st) => ({ shuffle: !st.shuffle }))
          return
        }
        if (!s.shuffle) {
          const base = s.orderedQueue ? [...s.orderedQueue] : [...s.queue]
          const shuffled = shuffleArray(base)
          const idx = Math.max(
            0,
            shuffled.findIndex((x) => x.id === s.currentSong?.id),
          )
          set({
            shuffle: true,
            orderedQueue: base,
            queue: shuffled,
            currentIndex: idx,
            currentSong: shuffled[idx],
          })
        } else {
          const base = s.orderedQueue ?? [...s.queue]
          const idx = Math.max(
            0,
            base.findIndex((x) => x.id === s.currentSong?.id),
          )
          set({
            shuffle: false,
            orderedQueue: null,
            queue: base,
            currentIndex: idx,
            currentSong: base[idx],
          })
        }
      },

      setShuffle: (v) => {
        const on = Boolean(v)
        const s = get()
        if (on === s.shuffle) return
        if (!s.queue.length) {
          set({ shuffle: on })
          return
        }
        if (on) {
          const base = s.orderedQueue ? [...s.orderedQueue] : [...s.queue]
          const shuffled = shuffleArray(base)
          const idx = Math.max(
            0,
            shuffled.findIndex((x) => x.id === s.currentSong?.id),
          )
          set({
            shuffle: true,
            orderedQueue: base,
            queue: shuffled,
            currentIndex: idx,
            currentSong: shuffled[idx],
          })
        } else {
          const base = s.orderedQueue ?? [...s.queue]
          const idx = Math.max(
            0,
            base.findIndex((x) => x.id === s.currentSong?.id),
          )
          set({
            shuffle: false,
            orderedQueue: null,
            queue: base,
            currentIndex: idx,
            currentSong: base[idx],
          })
        }
      },

      cycleRepeat: () =>
        set((s) => {
          const order = ['off', 'all', 'one']
          const i = order.indexOf(s.repeat)
          return { repeat: order[(i + 1) % order.length] }
        }),

      playSong: (song, queue) => {
        const list = queue?.length ? [...queue] : [song]
        const shuffleOn = get().shuffle
        const { queue: q, orderedQueue: oq, currentSong: cs, currentIndex: idx } =
          buildQueueFromList(list, song, shuffleOn)
        set({
          currentSong: cs,
          queue: q,
          orderedQueue: oq,
          currentIndex: idx,
          isPlaying: true,
          currentTime: 0,
        })
      },

      playQueue: (queue, startIndex = 0) => {
        const list = queue?.length ? [...queue] : []
        if (!list.length) return
        const shuffleOn = get().shuffle
        const i = Math.min(Math.max(0, startIndex), list.length - 1)
        const song = list[i]
        const { queue: q, orderedQueue: oq, currentSong: cs, currentIndex: idx } =
          buildQueueFromList(list, song, shuffleOn)
        set({
          currentSong: cs,
          queue: q,
          orderedQueue: oq,
          currentIndex: idx,
          isPlaying: true,
          currentTime: 0,
        })
      },

      jumpToQueueIndex: (index) => {
        const { queue } = get()
        if (index < 0 || index >= queue.length) return
        set({
          currentSong: queue[index],
          currentIndex: index,
          isPlaying: true,
          currentTime: 0,
        })
      },

      addToQueue: (song) => {
        set((s) => {
          const q = [...s.queue, song]
          if (s.shuffle && s.orderedQueue) {
            return { queue: q, orderedQueue: [...s.orderedQueue, song] }
          }
          return { queue: q }
        })
      },

      enqueueSongs: (songs) => {
        const list = songs?.filter(Boolean) ?? []
        if (!list.length) return
        set((s) => {
          const q = [...s.queue, ...list]
          if (s.shuffle && s.orderedQueue) {
            return { queue: q, orderedQueue: [...s.orderedQueue, ...list] }
          }
          return { queue: q }
        })
      },

      playNext: (song) => {
        set((s) => {
          const insertAt = Math.min(s.currentIndex + 1, s.queue.length)
          const q = [...s.queue]
          q.splice(insertAt, 0, song)
          if (s.shuffle && s.orderedQueue) {
            const oq = [...s.orderedQueue]
            const curId = s.currentSong?.id
            const oi = oq.findIndex((x) => x.id === curId)
            const at = oi >= 0 ? oi + 1 : oq.length
            oq.splice(at, 0, song)
            return { queue: q, orderedQueue: oq }
          }
          return { queue: q }
        })
      },

      removeFromQueue: (index) => {
        set((s) => {
          if (index < 0 || index >= s.queue.length) return s
          const removed = s.queue[index]
          const q = s.queue.filter((_, i) => i !== index)
          let oq = s.orderedQueue
          if (s.shuffle && oq) {
            oq = oq.filter((x) => x.id !== removed.id)
          }
          let ci = s.currentIndex
          if (index < s.currentIndex) ci -= 1
          else if (index === s.currentIndex) {
            ci = Math.min(s.currentIndex, q.length - 1)
          }
          if (q.length === 0) {
            return {
              queue: [],
              orderedQueue: null,
              currentIndex: 0,
              currentSong: null,
              isPlaying: false,
              currentTime: 0,
            }
          }
          ci = Math.max(0, Math.min(ci, q.length - 1))
          return {
            queue: q,
            orderedQueue: s.shuffle ? oq : null,
            currentIndex: ci,
            currentSong: q[ci],
            isPlaying: s.isPlaying,
          }
        })
      },

      togglePlay: () =>
        set((s) => {
          if (!s.currentSong) return s
          return { isPlaying: !s.isPlaying }
        }),

      setPlaying: (v) => set({ isPlaying: Boolean(v) }),

      nextSong: () => {
        const { queue, currentIndex, repeat } = get()
        const n = queue.length
        if (n === 0) return

        if (currentIndex < n - 1) {
          const idx = currentIndex + 1
          set({
            currentSong: queue[idx],
            currentIndex: idx,
            isPlaying: true,
            currentTime: 0,
          })
          return
        }

        if (repeat === 'all') {
          set({
            currentSong: queue[0],
            currentIndex: 0,
            isPlaying: true,
            currentTime: 0,
          })
        } else {
          set({ isPlaying: false, currentTime: 0 })
        }
      },

      /** @returns {boolean} true if the track changed */
      prevSong: () => {
        const { queue, currentIndex, repeat } = get()
        const n = queue.length
        if (n === 0) return false

        if (currentIndex > 0) {
          const idx = currentIndex - 1
          set({
            currentSong: queue[idx],
            currentIndex: idx,
            isPlaying: true,
            currentTime: 0,
          })
          return true
        }

        if (repeat === 'all') {
          const idx = n - 1
          set({
            currentSong: queue[idx],
            currentIndex: idx,
            isPlaying: true,
            currentTime: 0,
          })
          return true
        }

        return false
      },

      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),

      setCurrentTime: (t) => set({ currentTime: t }),

      setDuration: (d) => set({ duration: d || 0 }),

      seek: (seconds) => set({ currentTime: Math.max(0, seconds) }),
    }),
    {
      name: 'adventwave-player',
      partialize: (s) => ({
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
)
