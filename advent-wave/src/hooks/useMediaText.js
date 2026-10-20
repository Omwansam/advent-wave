import { useEffect, useState } from 'react'
import { getChapters, getLyrics } from '../api'
import { isLongForm } from '../utils/longForm'

/**
 * Song lyrics and sermon chapters for the playing item (RFC 0004), fetched once per item per
 * session. Both change only when an editor changes them, and the full player and the bar ask
 * for the same item at once, so a small cache saves the second request and the flash between.
 */
const TTL_MS = 10 * 60_000
const cache = new Map()

function cached(key) {
  const hit = cache.get(key)
  return hit && Date.now() - hit.at < TTL_MS ? hit : null
}

function useMediaText(kind, id, fetcher) {
  const key = id ? `${kind}:${id}` : null
  const [entry, setEntry] = useState(null)

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    const hit = cached(key)
    const load = hit
      ? Promise.resolve(hit.value)
      : fetcher(id, { signal: controller.signal }).then(
          (value) => value,
          (error) => {
            // No lyrics is a 404 by contract — the same as having none.
            if (error?.status === 404) return null
            throw error
          },
        )
    load
      .then((value) => {
        if (!hit) cache.set(key, { value, at: Date.now() })
        if (!controller.signal.aborted) setEntry({ key, value, error: null })
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return
        setEntry({ key, value: null, error })
      })
    return () => controller.abort()
  }, [key, id, fetcher])

  const current = entry && entry.key === key ? entry : null
  return {
    data: current?.value ?? null,
    error: current?.error ?? null,
    loading: Boolean(key) && !current,
  }
}

/** @returns {{ data: { synced: boolean, lines: { startMs?: number, text: string }[], credit: string } | null, error, loading }} */
export function useLyrics(track) {
  return useMediaText('lyrics', track && !isLongForm(track) ? track.id : null, getLyrics)
}

/** @returns {{ data: { chapters: { startMs: number, title: string }[] } | null, error, loading }} */
export function useChapters(track) {
  return useMediaText('chapters', isLongForm(track) ? track.id : null, getChapters)
}

/** Index of the entry whose start is the latest one at or before `ms`; -1 before the first. */
export function indexAt(entries, ms) {
  let found = -1
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i].startMs <= ms) found = i
    else break
  }
  return found
}
