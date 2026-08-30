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

    getStreamManifest(mediaItemId, { signal: controller.signal })
      .then((manifest) => setEntry({ id: mediaItemId, manifest, error: null }))
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        setEntry({ id: mediaItemId, manifest: null, error })
      })

    return () => controller.abort()
  }, [mediaItemId])

  const current = entry && entry.id === mediaItemId ? entry : null

  return {
    url: current?.manifest?.audioUrl ?? null,
    gainFactor: gainToVolumeFactor(current?.manifest?.gainDb),
    manifest: current?.manifest ?? null,
    error: current?.error ?? null,
    loading: Boolean(mediaItemId) && !current,
  }
}
