import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getProgress, saveProgress } from '@/api';
import { appStorage } from '@/lib/storage';
import { useAuthStore } from './auth';

/**
 * Where each sermon and podcast episode was left (RFC 0003), so the next play resumes there —
 * on this phone or on the laptop. The account's copy is on the server; this is its local cache,
 * keyed by account, merged on sign-in with the newer entry winning. The thresholds are the web
 * app's, so "in progress" means the same thing everywhere.
 */
const MIN_RESUME_SEC = 15;
const FINISH_MARGIN_SEC = 30;
const RESUME_REWIND_SEC = 3;
const MAX_ENTRIES = 300;
const PUSH_EVERY_MS = 30_000;
const MAX_BACKFILL = 50;

const ANON = '_';
const EMPTY: Record<string, Progress> = Object.freeze({}) as Record<string, Progress>;

export interface Progress {
  positionSec: number;
  durationSec: number;
  finished: boolean;
  updatedAt: number;
}

export type ProgressStatus = 'unplayed' | 'in-progress' | 'finished';

function currentUserId(): string {
  return useAuthStore.getState().user?.id ?? ANON;
}

function isFinishedAt(positionSec: number, durationSec: number): boolean {
  return durationSec > 0 && positionSec >= durationSec - Math.min(FINISH_MARGIN_SEC, durationSec * 0.05);
}

const lastPushAt = new Map<string, number>();

function push(id: string, p: Progress) {
  lastPushAt.set(id, Date.now());
  saveProgress(id, { positionMs: Math.round(p.positionSec * 1000), completed: p.finished }).catch(() => {
    // The next change retries; until then this device's copy is the newer one.
  });
}

function prune(entries: Record<string, Progress>): Record<string, Progress> {
  const ids = Object.keys(entries);
  if (ids.length <= MAX_ENTRIES) return entries;
  const keep = ids.sort((a, b) => entries[b].updatedAt - entries[a].updatedAt).slice(0, MAX_ENTRIES);
  return Object.fromEntries(keep.map((id) => [id, entries[id]]));
}

interface ProgressState {
  byUser: Record<string, Record<string, Progress>>;
  hydrate: () => Promise<void>;
  record: (id: string, positionSec: number, durationSec: number, opts?: { flush?: boolean }) => void;
  markFinished: (id: string, durationSec: number) => void;
  resumeAt: (id: string) => number | null;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => {
      const write = (id: string, entry: Progress, flush: boolean) => {
        const uid = currentUserId();
        if (uid === ANON) return;
        set((s) => ({ byUser: { ...s.byUser, [uid]: prune({ ...(s.byUser[uid] ?? {}), [id]: entry }) } }));
        if (flush || Date.now() - (lastPushAt.get(id) ?? 0) >= PUSH_EVERY_MS) push(id, entry);
      };

      return {
        byUser: {},

        hydrate: async () => {
          const uid = currentUserId();
          if (uid === ANON) return;
          let rows;
          try {
            rows = (await getProgress())?.items ?? [];
          } catch {
            return;
          }
          if (currentUserId() !== uid) return;

          const local = get().byUser[uid] ?? {};
          const merged = { ...local };
          const serverAt = new Map<string, number>();
          for (const r of rows) {
            if (!r.mediaItemId) continue;
            const at = Date.parse(r.updatedAt ?? '') || 0;
            serverAt.set(r.mediaItemId, at);
            const mine = local[r.mediaItemId];
            if (!mine || at > mine.updatedAt) {
              merged[r.mediaItemId] = {
                positionSec: (r.positionMs ?? 0) / 1000,
                durationSec: mine?.durationSec ?? 0,
                finished: Boolean(r.completed),
                updatedAt: at,
              };
            }
          }
          set((s) => ({ byUser: { ...s.byUser, [uid]: prune(merged) } }));

          Object.entries(local)
            .filter(([id, p]) => !serverAt.has(id) || p.updatedAt > (serverAt.get(id) ?? 0))
            .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_BACKFILL)
            .forEach(([id, p]) => push(id, p));
        },

        record: (id, positionSec, durationSec, { flush = false } = {}) => {
          if (!id || !(durationSec > 0) || !Number.isFinite(positionSec)) return;
          const finished = isFinishedAt(positionSec, durationSec);
          const prev = get().byUser[currentUserId()]?.[id];
          // Seeking back to the top of a finished sermon is not un-finishing it.
          if (prev?.finished && !finished && positionSec < MIN_RESUME_SEC) return;
          write(id, { positionSec, durationSec, finished, updatedAt: Date.now() }, flush);
        },

        markFinished: (id, durationSec) => {
          const prev = get().byUser[currentUserId()]?.[id];
          const d = durationSec > 0 ? durationSec : (prev?.durationSec ?? 0);
          write(id, { positionSec: d, durationSec: d, finished: true, updatedAt: Date.now() }, true);
        },

        resumeAt: (id) => {
          const p = get().byUser[currentUserId()]?.[id];
          if (!p || p.finished || p.positionSec < MIN_RESUME_SEC) return null;
          if (isFinishedAt(p.positionSec, p.durationSec)) return null;
          return Math.max(0, p.positionSec - RESUME_REWIND_SEC);
        },
      };
    },
    { name: 'adventwave-progress', storage: appStorage, partialize: (s) => ({ byUser: s.byUser }) },
  ),
);

export function progressStatus(p: Progress | undefined): ProgressStatus {
  if (!p) return 'unplayed';
  if (p.finished) return 'finished';
  return p.positionSec >= MIN_RESUME_SEC ? 'in-progress' : 'unplayed';
}

/** The signed-in account's entries. */
export function useProgressMap(): Record<string, Progress> {
  const uid = useAuthStore((s) => s.user?.id ?? ANON);
  return useProgressStore((s) => s.byUser[uid]) ?? EMPTY;
}
