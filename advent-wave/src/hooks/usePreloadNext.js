import { useEffect } from 'react'
import { peekPrefetched, prefetchManifest } from './usePlaybackSource'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUiStore } from '../store/useUiStore'
import { isLongForm } from '../utils/longForm'
import { peekNext, releaseElement } from '../utils/playback'

/** Let the playing item buffer first; at its start the two would compete for the same bandwidth. */
const START_AFTER_SEC = 3
/**
 * Within this much of the end. A preloaded URL is good for ~25 minutes after it is fetched
 * (usePlaybackSource), so a long sermon's successor is fetched near its end, not at its start.
 */
const WITHIN_END_SEC = 20 * 60

/**
 * Loads the next item in the queue into the idle <audio> element while the current one plays, so
 * Next, or the end of the song, swaps elements instead of starting from nothing: no manifest round
 * trip, no connection to open, audio already buffered. The swap happens in the store's change
 * callback, the moment the track changes, so the new track and its element render together; the
 * source effect then finds the URL loaded and only has to start it.
 *
 * A song is buffered (preload="auto"); a sermon or episode only has its header read, since a whole
 * service downloaded on the off chance would cost the listener's data. Data saver loads no audio
 * ahead, only the manifest. Crossfade starts its fade on the element this has already loaded.
 *
 * @param {{ slotsRef: { current: [HTMLAudioElement | null, HTMLAudioElement | null] },
 *           active: 0 | 1, activeRef: { current: 0 | 1 }, setActive: (slot: 0 | 1) => void,
 *           loadedUrlsRef: { current: [string | null, string | null] },
 *           fadeRef: { current: object | null } }} p
 */
export function usePreloadNext({ slotsRef, active, activeRef, setActive, loadedUrlsRef, fadeRef }) {
  const currentId = usePlayerStore((s) => s.currentSong?.id ?? null)
  const nextId = usePlayerStore((s) => peekNext(s)?.id ?? null)

  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a || !nextId || nextId === currentId) return undefined
    const idleSlot = active === 0 ? 1 : 0
    let started = false
    let cancelled = false
    let watched = null
    // A preload that fails (a missing file, an expired URL) is dropped at once, so the track
    // change loads the item the usual way and a real failure is reported there, not swallowed.
    const onPreloadError = () => {
      const idle = slotsRef.current[idleSlot]
      if (!idle || !idle.error) return
      releaseElement(idle)
      loadedUrlsRef.current[idleSlot] = null
    }

    const onTime = () => {
      if (started || fadeRef.current || a.paused || a.currentTime < START_AFTER_SEC) return
      if (Number.isFinite(a.duration) && a.duration - a.currentTime > WITHIN_END_SEC) return
      started = true
      a.removeEventListener('timeupdate', onTime)
      const next = peekNext(usePlayerStore.getState())
      if (next?.id !== nextId) return
      prefetchManifest(nextId)
        .then((manifest) => {
          if (cancelled || !manifest?.audioUrl) return
          if (useUiStore.getState().audioQuality === 'data_saver') return
          const idle = slotsRef.current[idleSlot]
          if (!idle || fadeRef.current || loadedUrlsRef.current[idleSlot] === manifest.audioUrl) return
          idle.preload = isLongForm(next) ? 'metadata' : 'auto'
          idle.addEventListener('error', onPreloadError)
          watched = idle
          idle.src = manifest.audioUrl
          loadedUrlsRef.current[idleSlot] = manifest.audioUrl
          idle.load()
        })
        .catch(() => {
          // Only a head start: the next item loads the usual way when it comes.
        })
    }

    a.addEventListener('timeupdate', onTime)
    return () => {
      cancelled = true
      a.removeEventListener('timeupdate', onTime)
      watched?.removeEventListener('error', onPreloadError)
    }
  }, [slotsRef, active, loadedUrlsRef, fadeRef, currentId, nextId])

  // The handoff. A crossfade makes its own (it is mid-fade by the time it moves the queue on).
  useEffect(
    () =>
      usePlayerStore.subscribe((state, prev) => {
        const id = state.currentSong?.id
        if (!id || id === prev.currentSong?.id || fadeRef.current) return
        const url = peekPrefetched(id)?.audioUrl
        const from = activeRef.current
        const to = from === 0 ? 1 : 0
        if (!url || loadedUrlsRef.current[to] !== url) return
        // Never hand over an element that failed: MusicPlayer loads the item afresh and reports it.
        if (slotsRef.current[to]?.error) {
          releaseElement(slotsRef.current[to])
          loadedUrlsRef.current[to] = null
          return
        }
        releaseElement(slotsRef.current[from])
        loadedUrlsRef.current[from] = null
        activeRef.current = to
        setActive(to)
      }),
    [slotsRef, activeRef, setActive, loadedUrlsRef, fadeRef],
  )
}
