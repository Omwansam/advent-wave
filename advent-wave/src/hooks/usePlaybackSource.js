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
 * Manifests asked for ahead of need: the next song in the queue (usePreloadNext, crossfade) and
 * any song the listener is about to pick (usePrefetchOnIntent). A prefetched manifest is used
 * once, by the next mount of this hook for that id, and only while its URL has time left: it is
 * signed and expires (expiresAtEpochSeconds), and one close to expiry could 403 mid-song. A bucket
 * URL lasts the recording plus 30 minutes from when it was signed, so past 25 minutes it may not
 * outlast the song it plays; the age cap also keeps a changed quality setting from lingering.
 */
const PREFETCH_MAX_AGE_MS = 25 * 60_000
const MIN_URL_LIFE_MS = 90_000
const prefetched = new Map()

function usable(entry, now = Date.now()) {
  if (now - entry.at > PREFETCH_MAX_AGE_MS) return false
  const expires = entry.manifest?.expiresAtEpochSeconds
  return !expires || expires * 1000 - now > MIN_URL_LIFE_MS
}

/**
 * Opens the connection to where the audio lives as soon as its host is known — DNS, TCP and TLS
 * to the bucket are otherwise paid after the click. Once per origin; no crossorigin attribute,
 * because <audio> fetches without CORS and the browser keeps the two kinds of connection apart.
 */
const warmedOrigins = new Set()
function warmOrigin(url) {
  let origin
  try {
    origin = new URL(url).origin
  } catch {
    return
  }
  if (warmedOrigins.has(origin) || origin === window.location.origin) return
  warmedOrigins.add(origin)
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = origin
  document.head.appendChild(link)
}

export function prefetchManifest(mediaItemId) {
  const hit = prefetched.get(mediaItemId)
  if (hit && usable(hit)) return hit.promise
  for (const [id, e] of prefetched) if (!usable(e)) prefetched.delete(id)
  const entry = { at: Date.now(), manifest: null, promise: null }
  entry.promise = getStreamManifest(mediaItemId).then(
    (manifest) => {
      entry.manifest = manifest
      if (manifest?.audioUrl) warmOrigin(manifest.audioUrl)
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

/** A prefetched manifest that has arrived and whose URL still has time left, or null. Synchronous. */
export function peekPrefetched(mediaItemId) {
  const hit = prefetched.get(mediaItemId)
  return hit?.manifest && usable(hit) ? hit.manifest : null
}

/** A prefetch still on its way — a click right after a hover — so the click waits for it rather than asking again. */
function inFlight(mediaItemId) {
  const hit = prefetched.get(mediaItemId)
  return hit && !hit.manifest && usable(hit) ? hit.promise : null
}

/**
 * Resolves a playable URL for a media item.
 *
 * `TrackDto.audioUrl` points at the manifest endpoint, not at audio bytes: the catalogue is
 * church-licensed, so every real URL is signed and expires (plan §11.8). The manifest is fetched
 * per track — or taken, once, from the prefetch above while its URL is still good.
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
    const pending = ready ? null : inFlight(mediaItemId)
    const shared = Boolean(ready || pending)

    ;(ready ? Promise.resolve(ready) : pending ?? getStreamManifest(mediaItemId, { signal: controller.signal }))
      .then((manifest) => {
        if (controller.signal.aborted) return
        if (manifest?.audioUrl) warmOrigin(manifest.audioUrl)
        setEntry({ id: mediaItemId, manifest, error: null })
        // Used: a later play of the same item fetches a fresh signature.
        if (shared) prefetched.delete(mediaItemId)
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
