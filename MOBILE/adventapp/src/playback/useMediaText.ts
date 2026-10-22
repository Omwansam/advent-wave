import { useEffect, useState } from 'react';

import { getChapters, getLyrics } from '@/api';
import type { Track } from '@/api/models';
import type { ChapterDto, LyricLineDto } from '@/api/types';
import { isLongForm } from '@/lib/longForm';

/**
 * Song lyrics and sermon chapters for the playing item (RFC 0004), fetched once per item per
 * session: both change only when an editor changes them, and the full player and its lyrics
 * card ask for the same item at once.
 */
const TTL_MS = 10 * 60_000;
const cache = new Map<string, { value: unknown; at: number }>();

interface Result<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

function useMediaText<T>(kind: string, id: string | null, fetcher: (id: string) => Promise<T | null>): Result<T> {
  const key = id ? `${kind}:${id}` : null;
  const [entry, setEntry] = useState<{ key: string; value: T | null; error: unknown } | null>(null);

  useEffect(() => {
    if (!key || !id) return undefined;
    let cancelled = false;
    const hit = cache.get(key);
    const load: Promise<T | null> =
      hit && Date.now() - hit.at < TTL_MS
        ? Promise.resolve(hit.value as T | null)
        : fetcher(id).then(
            (value) => {
              cache.set(key, { value, at: Date.now() });
              return value;
            },
            (error) => {
              // No lyrics is a 404 by contract — the same as having none.
              if ((error as { status?: number })?.status === 404) {
                cache.set(key, { value: null, at: Date.now() });
                return null;
              }
              throw error;
            },
          );
    load
      .then((value) => {
        if (!cancelled) setEntry({ key, value, error: null });
      })
      .catch((error) => {
        if (!cancelled) setEntry({ key, value: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [key, id, fetcher]);

  const current = entry && entry.key === key ? entry : null;
  return { data: current?.value ?? null, error: current?.error ?? null, loading: Boolean(key) && !current };
}

export interface Lyrics {
  synced: boolean;
  lines: LyricLineDto[];
  credit?: string;
}

const fetchLyrics = async (id: string): Promise<Lyrics | null> => {
  const l = await getLyrics(id);
  if (!l?.lines?.length) return null;
  return { synced: Boolean(l.synced), lines: l.lines, credit: l.credit };
};

const fetchChapters = async (id: string): Promise<ChapterDto[] | null> => {
  const c = await getChapters(id);
  return c?.chapters?.length ? c.chapters : null;
};

export function useLyrics(track: Track | null): Result<Lyrics> {
  return useMediaText('lyrics', track && !isLongForm(track) ? track.id : null, fetchLyrics);
}

export function useChapters(track: Track | null): Result<ChapterDto[]> {
  return useMediaText('chapters', track && isLongForm(track) ? track.id : null, fetchChapters);
}

/** Index of the entry whose start is the latest at or before `ms`; -1 before the first. */
export function indexAt(entries: { startMs?: number }[], ms: number): number {
  let found = -1;
  for (let i = 0; i < entries.length; i += 1) {
    if ((entries[i].startMs ?? 0) <= ms) found = i;
    else break;
  }
  return found;
}
