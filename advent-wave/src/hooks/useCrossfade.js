import { useCallback, useEffect, useRef } from 'react'
import { peekPrefetched, prefetchManifest } from './usePlaybackSource'
import { usePlayerStore } from '../store/usePlayerStore'
import { useSleepTimerStore } from '../store/useSleepTimerStore'
import { useUiStore } from '../store/useUiStore'
import { isLongForm } from '../utils/longForm'
import { peekNext, releaseElement, startPlayback } from '../utils/playback'

/** How far ahead of the fade the next song's manifest is asked for. Signed URLs live 5 min. */
const PREFETCH_LEAD_SEC = 15
/** Between timeupdates, which a browser fires only ~4×/s: smooth enough to hear no steps. */
const STEP_MS = 50

const clamp01 = (x) => Math.min(1, Math.max(0, x))
/** Equal-power: the two halves sum to constant loudness, so the middle does not dip. */
const curve = (k) => Math.sin((k * Math.PI) / 2)

/**
 * Crossfade between songs (RFC 0004): with `crossfadeSec` left in the current song, the next one
 * starts on the other <audio> element, the two fade across on an equal-power curve, and the
 * store moves on to the next song at that moment — so the title, the reporter and the queue all
 * see the handoff when it is heard, not when the outgoing tail finally stops.
 *
 * Only between two songs, never under repeat-one or an end-of-item sleep timer, and only while
 * playing. The fade is driven by both elements' own positions rather than a clock, so a buffering
 * stall or a seek bends it instead of breaking it, and it keeps going in a background tab, where
 * animation frames stop but timeupdate does not.
 *
 * @param {{ slotsRef: { current: [HTMLAudioElement | null, HTMLAudioElement | null] },
 *           active: 0 | 1, activeRef: { current: 0 | 1 }, setActive: (slot: 0 | 1) => void,
 *           loadedUrlsRef: { current: [string | null, string | null] },
 *           targetVolumeRef: { current: number },
 *           handoffRef: { current: { id: string, tailMs: number } | null } }} p
 */
export function useCrossfade({ slotsRef, active, activeRef, setActive, loadedUrlsRef, targetVolumeRef, handoffRef }) {
  const fadeRef = useRef(null)

  const finish = useCallback(() => {
    const f = fadeRef.current
    if (!f) return
    fadeRef.current = null
    clearInterval(f.timer)
    f.out.removeEventListener('timeupdate', f.step)
    releaseElement(f.out)
    loadedUrlsRef.current[f.outSlot] = null
    const inc = slotsRef.current[activeRef.current]
    if (inc) inc.volume = targetVolumeRef.current
  }, [slotsRef, activeRef, loadedUrlsRef, targetVolumeRef])

  /** Stops the outgoing song at once: a pause, a skip, or a jump elsewhere in the queue. */
  const cancel = finish

  const step = useCallback(() => {
    const f = fadeRef.current
    if (!f) return
    const inc = slotsRef.current[activeRef.current]
    const outLeft = f.out.ended || f.out.paused ? 0 : Math.max(0, f.out.duration - f.out.currentTime)
    const outK = clamp01(outLeft / f.seconds)
    const inK = clamp01(inc.currentTime / f.seconds)
    f.out.volume = f.outFrom * curve(outK)
    inc.volume = targetVolumeRef.current * curve(inK)
    if (outK <= 0 && inK >= 1) finish()
  }, [slotsRef, activeRef, targetVolumeRef, finish])

  /** The crossfade length when one should happen now, else null. */
  const eligible = useCallback((a) => {
    const ui = useUiStore.getState()
    const st = usePlayerStore.getState()
    if (!ui.crossfadeEnabled || !(ui.crossfadeSec > 0)) return null
    if (!st.isPlaying || st.repeat === 'one' || useSleepTimerStore.getState().endOfItem) return null
    const next = peekNext(st)
    if (!st.currentSong || !next || next.id === st.currentSong.id) return null
    if (isLongForm(st.currentSong) || isLongForm(next)) return null
    // A song shorter than two fades would spend its whole length fading.
    if (!(a.duration > ui.crossfadeSec * 2)) return null
    return { seconds: ui.crossfadeSec, next }
  }, [])

  const begin = useCallback(
    (out, seconds, next) => {
      const manifest = peekPrefetched(next.id)
      if (!manifest?.audioUrl) return // Not here yet; the next timeupdate asks again.
      const outSlot = activeRef.current
      const inSlot = outSlot === 0 ? 1 : 0
      const inc = slotsRef.current[inSlot]
      if (!inc) return

      inc.src = manifest.audioUrl
      loadedUrlsRef.current[inSlot] = manifest.audioUrl
      inc.volume = 0
      inc.defaultPlaybackRate = 1
      inc.playbackRate = 1
      inc.load()
      startPlayback(inc)

      const f = { out, outSlot, outFrom: out.volume, seconds, toId: next.id, step: null, timer: null }
      f.step = () => step()
      f.timer = setInterval(f.step, STEP_MS)
      out.addEventListener('timeupdate', f.step)
      fadeRef.current = f

      // The outgoing tail still plays, under the next song: the reporter counts it as heard.
      const outId = usePlayerStore.getState().currentSong?.id
      handoffRef.current = outId ? { id: outId, tailMs: Math.round(Math.max(0, out.duration - out.currentTime) * 1000) } : null
      activeRef.current = inSlot
      setActive(inSlot)
      usePlayerStore.getState().nextSong()
    },
    [slotsRef, activeRef, setActive, loadedUrlsRef, handoffRef, step],
  )

  // Watch the playing element: ask for the next manifest a little early, start the fade on time,
  // and while fading, step it on this element's ticks too.
  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return undefined
    const onTime = () => {
      if (fadeRef.current) {
        step()
        return
      }
      const go = eligible(a)
      if (!go) return
      const left = a.duration - a.currentTime
      if (!Number.isFinite(left)) return
      if (left <= go.seconds + PREFETCH_LEAD_SEC) prefetchManifest(go.next.id).catch(() => {})
      if (left <= go.seconds) begin(a, go.seconds, go.next)
    }
    a.addEventListener('timeupdate', onTime)
    return () => a.removeEventListener('timeupdate', onTime)
  }, [slotsRef, active, eligible, begin, step])

  // A track change that is not the fade's own handoff — skip, previous, a row clicked — ends it.
  const currentId = usePlayerStore((s) => s.currentSong?.id)
  useEffect(() => {
    const f = fadeRef.current
    if (f && currentId !== f.toId) cancel()
  }, [currentId, cancel])

  useEffect(() => cancel, [cancel])

  return { fadeRef, cancel }
}
