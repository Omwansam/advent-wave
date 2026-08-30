import { useEffect, useRef } from 'react'
import { sendPlaybackEvent } from '../api'

/** One listening session per page load, as the event schema expects. */
const SESSION_ID = crypto.randomUUID()

const DEVICE = 'web'

/**
 * Reports playback to the server.
 *
 * The client only says what happened; the server decides whether it counts as a play
 * (>=30s or >=50% of the item), whether private session suppresses it, and whether it
 * reaches listening history. None of those rules are duplicated here on purpose — they are
 * a licensing obligation to contributing churches, so there is exactly one implementation.
 *
 * @param {{ current: HTMLAudioElement | null }} audioRef
 * @param {{ id: string, durationMs?: number, duration?: number } | null} currentSong
 */
export function usePlaybackReporter(audioRef, currentSong) {
  const playedMsRef = useRef(0)
  const lastPositionRef = useRef(0)
  const reportedForRef = useRef(null)

  const songId = currentSong?.id ?? null
  const durationMs =
    currentSong?.durationMs ?? (currentSong?.duration ? currentSong.duration * 1000 : 0)

  // Accumulate real listening time rather than reading currentTime at the end: a seek would
  // otherwise report a position the listener never actually heard.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    const onTimeUpdate = () => {
      const position = audio.currentTime
      const delta = position - lastPositionRef.current
      // A delta larger than a timeupdate interval is a seek, not listening.
      if (delta > 0 && delta < 2) playedMsRef.current += delta * 1000
      lastPositionRef.current = position
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [audioRef])

  useEffect(() => {
    if (!songId) return undefined

    playedMsRef.current = 0
    lastPositionRef.current = 0
    reportedForRef.current = songId

    void report(songId, 'play_started', 0)

    // Runs when the track changes or the player unmounts — either way this item is over, and
    // this is the event that carries enough ms_played for the server to count it.
    return () => {
      const msPlayed = Math.round(playedMsRef.current)
      if (msPlayed <= 0) return
      const completed = durationMs > 0 && msPlayed >= durationMs * 0.95
      void report(songId, completed ? 'play_completed' : 'skipped', msPlayed)
    }
  }, [songId, durationMs])
}

function report(mediaItemId, eventType, msPlayed) {
  return sendPlaybackEvent({
    eventId: crypto.randomUUID(),
    mediaItemId,
    sessionId: SESSION_ID,
    eventType,
    msPlayed,
    device: DEVICE,
    clientTs: new Date().toISOString(),
  }).catch(() => {
    // Telemetry must never break playback. The server rate-limits this route, so a dropped
    // event under load is expected and not worth surfacing to the listener.
  })
}
