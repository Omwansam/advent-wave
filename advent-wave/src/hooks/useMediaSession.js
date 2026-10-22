import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'

const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator

/**
 * Lets the operating system show and control what is playing (Media Session API): a phone's lock
 * screen and notification, a headset's buttons, keyboard media keys, a watch. Without it the
 * browser shows the page's title and only play/pause.
 *
 * @param {{ audioRef: { current: HTMLAudioElement | null }, active: 0 | 1,
 *           currentSong: object | null, isPlaying: boolean,
 *           onPrev: () => void, onNext: () => void }} p
 */
export function useMediaSession({ audioRef, active, currentSong, isPlaying, onPrev, onNext }) {
  // The player's handlers change every render; the OS keeps whatever was registered.
  const handlersRef = useRef({ onPrev, onNext })
  useEffect(() => {
    handlersRef.current = { onPrev, onNext }
  })

  useEffect(() => {
    if (!supported) return
    navigator.mediaSession.metadata = currentSong
      ? new MediaMetadata({
          title: currentSong.title ?? '',
          artist: currentSong.artist ?? '',
          album: currentSong.album ?? '',
          artwork: currentSong.cover ? [{ src: new URL(currentSong.cover, window.location.href).href, sizes: '512x512' }] : [],
        })
      : null
  }, [currentSong])

  useEffect(() => {
    if (!supported) return
    navigator.mediaSession.playbackState = currentSong ? (isPlaying ? 'playing' : 'paused') : 'none'
  }, [currentSong, isPlaying])

  useEffect(() => {
    if (!supported) return undefined
    const store = () => usePlayerStore.getState()
    const seekTo = (t) => {
      const a = audioRef.current
      if (!a || !Number.isFinite(t)) return
      const to = Math.max(0, Number.isFinite(a.duration) ? Math.min(t, a.duration) : t)
      a.currentTime = to
      store().seek(to)
    }
    const actions = {
      play: () => store().setPlaying(true),
      pause: () => store().setPlaying(false),
      stop: () => store().setPlaying(false),
      previoustrack: () => handlersRef.current.onPrev(),
      nexttrack: () => handlersRef.current.onNext(),
      seekto: (d) => seekTo(d.seekTime),
      seekbackward: (d) => seekTo((audioRef.current?.currentTime ?? 0) - (d.seekOffset || 10)),
      seekforward: (d) => seekTo((audioRef.current?.currentTime ?? 0) + (d.seekOffset || 10)),
    }
    for (const [action, handler] of Object.entries(actions)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // A browser that does not know this action; the rest still work.
      }
    }
    return () => {
      for (const action of Object.keys(actions)) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          // As above.
        }
      }
    }
  }, [audioRef])

  // The lock screen's progress bar: its position, length and speed, updated when they change
  // rather than on every tick — the OS extrapolates from the rate in between.
  useEffect(() => {
    const a = audioRef.current
    if (!supported || !a || !navigator.mediaSession.setPositionState) return undefined
    const update = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) return
      try {
        navigator.mediaSession.setPositionState({
          duration: a.duration,
          playbackRate: a.playbackRate || 1,
          position: Math.min(Math.max(0, a.currentTime), a.duration),
        })
      } catch {
        // An inconsistent moment mid-load; the next event corrects it.
      }
    }
    const events = ['loadedmetadata', 'durationchange', 'ratechange', 'seeked', 'play', 'pause']
    events.forEach((e) => a.addEventListener(e, update))
    update()
    return () => events.forEach((e) => a.removeEventListener(e, update))
  }, [audioRef, active])
}
