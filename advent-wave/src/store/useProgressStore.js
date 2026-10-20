import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getProgress, saveProgress } from '../api'
import { useAuthStore } from './useAuthStore'

/**
 * Where each sermon and podcast episode was left, so the next play resumes there and the
 * lists can say what is in progress.
 *
 * The account's copy lives on the server (`/v1/progress`, RFC 0003), so a sermon left on the
 * phone resumes on the laptop. This store is its local cache: the UI reads it without waiting,
 * and it keeps working offline. On sign-in `hydrate` merges the two, newer entry winning; after
 * that every change is pushed — at most every PUSH_EVERY_MS while playing, at once on pause,
 * seek, item change and end.
 *
 * Keyed by account: a shared family laptop must not show one listener's sermons as another's.
 */

/** A start shorter than this is sampling, not a place to come back to. */
const MIN_RESUME_SEC = 15
/** Stopping this close to the end is finishing: the benediction and the outro get skipped. */
const FINISH_MARGIN_SEC = 30
/** Resuming exactly where it stopped drops the listener mid-sentence. */
const RESUME_REWIND_SEC = 3
/** Per account. Old entries go first; nobody resumes a sermon from 300 sermons ago. */
const MAX_ENTRIES = 300
/** While playing. Pause, seek, item change and end push at once, so this bounds a closed tab's loss. */
const PUSH_EVERY_MS = 30_000
/** Local entries the server has not seen, sent on sign-in. Newest first; the rest are stale. */
const MAX_BACKFILL = 50

const ANON = '_'
const EMPTY = Object.freeze({})

function currentUserId() {
  return useAuthStore.getState().user?.id ?? ANON
}

function isFinishedAt(positionSec, durationSec) {
  return durationSec > 0 && positionSec >= durationSec - Math.min(FINISH_MARGIN_SEC, durationSec * 0.05)
}

/** Per item, so one sermon's throttle does not hold back another's first write. */
const lastPushAt = new Map()

function push(id, p) {
  lastPushAt.set(id, Date.now())
  saveProgress(id, { positionMs: Math.round(p.positionSec * 1000), completed: p.finished }).catch(() => {
    // The next change retries. Until then this device's copy is the newer one, and sign-in
    // pushes it again.
  })
}

function prune(entries) {
  const ids = Object.keys(entries)
  if (ids.length <= MAX_ENTRIES) return entries
  const keep = ids
    .sort((a, b) => entries[b].updatedAt - entries[a].updatedAt)
    .slice(0, MAX_ENTRIES)
  return Object.fromEntries(keep.map((id) => [id, entries[id]]))
}

/**
 * @typedef {{ positionSec: number, durationSec: number, finished: boolean, updatedAt: number }} Progress
 * @typedef {'unplayed' | 'in-progress' | 'finished'} ProgressStatus
 */

export const useProgressStore = create(
  persist(
    (set, get) => {
      const write = (id, entry, flush) => {
        const uid = currentUserId()
        // Signed out: the player's final save on logout lands here, and it belongs to nobody.
        if (uid === ANON) return
        set((s) => ({
          byUser: {
            ...s.byUser,
            [uid]: prune({ ...(s.byUser[uid] ?? {}), [id]: entry }),
          },
        }))
        if (flush || Date.now() - (lastPushAt.get(id) ?? 0) >= PUSH_EVERY_MS) push(id, entry)
      }

      return {
        /** @type {Record<string, Record<string, Progress>>} */
        byUser: {},

        /**
         * Merges the account's server copy into this device's, newer entry winning, then sends
         * up what only this device has — progress recorded offline, or before the server kept it.
         */
        hydrate: async () => {
          const uid = currentUserId()
          if (uid === ANON) return
          let rows
          try {
            rows = (await getProgress())?.items ?? []
          } catch {
            return // Offline: the local copy stands, and the next sign-in tries again.
          }
          if (currentUserId() !== uid) return // Signed out or switched while the request ran.

          const local = get().byUser[uid] ?? {}
          const merged = { ...local }
          const serverAt = new Map()
          for (const r of rows) {
            const at = Date.parse(r.updatedAt) || 0
            serverAt.set(r.mediaItemId, at)
            const mine = local[r.mediaItemId]
            if (!mine || at > mine.updatedAt) {
              merged[r.mediaItemId] = {
                positionSec: (r.positionMs ?? 0) / 1000,
                // The server keeps no duration; the item is the same, so this device's stands.
                durationSec: mine?.durationSec ?? 0,
                finished: Boolean(r.completed),
                updatedAt: at,
              }
            }
          }
          set((s) => ({ byUser: { ...s.byUser, [uid]: prune(merged) } }))

          Object.entries(local)
            .filter(([id, p]) => !serverAt.has(id) || p.updatedAt > serverAt.get(id))
            .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_BACKFILL)
            .forEach(([id, p]) => push(id, p))
        },

        /** `flush` pushes to the server now; otherwise at most every PUSH_EVERY_MS per item. */
        record: (id, positionSec, durationSec, { flush = false } = {}) => {
          if (!id || !(durationSec > 0) || !Number.isFinite(positionSec)) return
          const finished = isFinishedAt(positionSec, durationSec)
          // Seeking back to the top of a finished sermon is not un-finishing it; playing it
          // through again past the resume threshold is.
          const prev = get().byUser[currentUserId()]?.[id]
          if (prev?.finished && !finished && positionSec < MIN_RESUME_SEC) return
          write(id, { positionSec, durationSec, finished, updatedAt: Date.now() }, flush)
        },

        markFinished: (id, durationSec) => {
          if (!id) return
          const prev = get().byUser[currentUserId()]?.[id]
          const d = durationSec > 0 ? durationSec : prev?.durationSec ?? 0
          write(id, { positionSec: d, durationSec: d, finished: true, updatedAt: Date.now() }, true)
        },

        /** Seconds to start the item at, or null to start from the top. */
        resumeAt: (id) => {
          const p = get().byUser[currentUserId()]?.[id]
          if (!p || p.finished || p.positionSec < MIN_RESUME_SEC) return null
          if (isFinishedAt(p.positionSec, p.durationSec)) return null
          return Math.max(0, p.positionSec - RESUME_REWIND_SEC)
        },
      }
    },
    {
      name: 'adventwave-progress',
      partialize: (s) => ({ byUser: s.byUser }),
    },
  ),
)

/** @param {Progress | undefined} p @returns {ProgressStatus} */
export function progressStatus(p) {
  if (!p) return 'unplayed'
  if (p.finished) return 'finished'
  return p.positionSec >= MIN_RESUME_SEC ? 'in-progress' : 'unplayed'
}

/** The signed-in account's entries, re-rendering only when they change. */
export function useProgressMap() {
  const uid = useAuthStore((s) => s.user?.id ?? ANON)
  return useProgressStore((s) => s.byUser[uid]) ?? EMPTY
}
