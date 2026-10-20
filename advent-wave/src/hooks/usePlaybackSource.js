import { useEffect, useState } from 'react'
import { getStreamManifest } from '../api'

/** -14 LUFS is the server's target; it also returns the per-item gain to reach it. */
function gainToVolumeFactor(gainDb) {
  if (typeof gainDb !== 'number' || !Number.isFinite(gainDb)) return 1
  // Attenuate only. An <audio> element cannot amplify past 1.0, and boosting a quiet master
  // would clip anyway — true_peak_dbfs exists because lossy decoders can already overshoot
  // 0 dBFS (plan §11.7).
  return Math.min(1, 10 ** (gainDb / 20))
}

/**
 * Crossfade needs the next song's manifest before the current one ends (RFC 0004), so it asks
 * ahead with prefetchManifest. A prefetched manifest is used once, by the next mount of this hook
 * for that id, and only while young: signed URLs live five minutes on the server, and a manifest
 * kept longer than this would hand the player a URL close to expiry.
 */
const PREFETCH_TTL_MS = 60_000
const prefetched = new Map()

export function prefetchManifest(mediaItemId) {
  const hit = prefetched.get(mediaItemId)
  if (hit && Date.now() - hit.at < PREFETCH_TTL_MS) return hit.promise
  const entry = { at: Date.now(), manifest: null, promise: null }
  entry.promise = getStreamManifest(mediaItemId).then(
    (manifest) => {
      entry.manifest = manifest
      return manifest
    },
    (error) => {
      prefetched.delete(mediaItemId)
      throw error
    },
  )
  prefetched.set(mediaItemId, entry)
  return entry.promise
}

/** A prefetched manifest that has arrived and is still young, or null. Synchronous. */
export function peekPrefetched(mediaItemId) {
  const hit = prefetched.get(mediaItemId)
  return hit?.manifest && Date.now() - hit.at < PREFETCH_TTL_MS ? hit.manifest : null
}

/**
 * Resolves a playable URL for a media item.
 *
 * `TrackDto.audioUrl` points at the manifest endpoint, not at audio bytes: the catalogue is
 * church-licensed, so every real URL is signed and short-lived (plan §11.8). The manifest is
 * fetched per track and never cached — a cached `audioUrl` is an expired one.
 *
 * @param {string | undefined} mediaItemId
 * @returns {{ url: string | null, gainFactor: number, manifest: object | null,
 *             error: Error | null, loading: boolean }}
 */
export function usePlaybackSource(mediaItemId) {
  // One entry, tagged with the id it belongs to. Comparing that tag against the id being
  // asked for is what keeps the previous track's manifest from leaking into the next one,
  // and it means nothing has to be cleared synchronously when the track changes.
  const [entry, setEntry] = useState(null)

  useEffect(() => {
    if (!mediaItemId) return undefined

    const controller = new AbortController()
    const ready = peekPrefetched(mediaItemId)

    ;(ready ? Promise.resolve(ready) : getStreamManifest(mediaItemId, { signal: controller.signal }))
      .then((manifest) => {
        setEntry({ id: mediaItemId, manifest, error: null })
        // Used: a later play of the same item fetches a fresh signature.
        if (ready) prefetched.delete(mediaItemId)
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        setEntry({ id: mediaItemId, manifest: null, error })
      })

    return () => controller.abort()
  }, [mediaItemId])

  const current = entry && entry.id === mediaItemId ? entry : null
  // A crossfade has already started this item from its prefetched manifest. Answering with that
  // manifest on the very first render keeps the URL steady; a null URL would pause the element.
  const manifest = current?.manifest ?? (current ? null : peekPrefetched(mediaItemId))

  return {
    url: manifest?.audioUrl ?? null,
    gainFactor: gainToVolumeFactor(manifest?.gainDb),
    manifest: manifest ?? null,
    error: current?.error ?? null,
    loading: Boolean(mediaItemId) && !current && !manifest,
  }
}
