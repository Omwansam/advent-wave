import { useEffect, useRef } from 'react'
import { getPlayerState, savePlayerState } from '../api'
import { usePlayerStore } from '../store/usePlayerStore'

/**
 * Keeps the player's state on the account, so a listener can pick up on another device
 * where they stopped (plan §1 day 1: player_state).
 *
 * Two write cadences, because the two kinds of change have different costs of loss:
 *  - structural changes (track, queue, shuffle, repeat, volume) are pushed after a short
 *    debounce — losing one means resuming into the wrong queue;
 *  - position is pushed at most every POSITION_INTERVAL_MS while playing, and immediately
 *    on pause or track change. The server's documented loss window is ≤30s of position
 *    (its Redis buffer flushes every 30s), so a 10s client cadence adds little to that.
 *
 * Nothing is written until the server's copy has been read: otherwise signing in would
 * overwrite the account's state with this device's empty player.
 */
const STRUCTURE_DEBOUNCE_MS = 400
const POSITION_INTERVAL_MS = 10_000

function snapshot(s) {
  return {
    currentSongId: s.currentSong?.id ?? null,
    queue: s.queue.map((t) => t.id),
    orderedQueue: s.orderedQueue ? s.orderedQueue.map((t) => t.id) : null,
    currentIndex: s.currentIndex,
    positionMs: Math.max(0, Math.round((s.currentTime || 0) * 1000)),
    volume: s.volume,
    shuffle: s.shuffle,
    repeat: s.repeat,
  }
}

function structureKey(s) {
  return [
    s.currentSong?.id ?? '',
    s.queue.map((t) => t.id).join(','),
    s.orderedQueue ? s.orderedQueue.map((t) => t.id).join(',') : '',
    s.currentIndex,
    s.volume,
    s.shuffle,
    s.repeat,
  ].join('|')
}

export function usePlayerSync(token) {
  const debounceRef = useRef(null)
  const lastPositionPushRef = useRef(0)

  // Read the account's copy once per session.
  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    getPlayerState()
      .then((state) => {
        if (!cancelled) usePlayerStore.getState().hydrateFromServer(state)
      })
      .catch(() => {
        // Offline or unauthenticated: play from an empty queue and try again next session.
        if (!cancelled) usePlayerStore.getState().hydrateFromServer(null)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return undefined

    const push = () => {
      const s = usePlayerStore.getState()
      if (!s.hydrated) return
      lastPositionPushRef.current = Date.now()
      savePlayerState(snapshot(s)).catch(() => {
        // The next change retries. Position is the only thing lost, and only ≤10s of it.
      })
    }

    let prevKey = structureKey(usePlayerStore.getState())
    let prevPlaying = usePlayerStore.getState().isPlaying
    let prevSongId = usePlayerStore.getState().currentSong?.id

    const unsubscribe = usePlayerStore.subscribe((s) => {
      if (!s.hydrated) return
      const key = structureKey(s)
      const songChanged = s.currentSong?.id !== prevSongId
      const paused = prevPlaying && !s.isPlaying
      prevPlaying = s.isPlaying
      prevSongId = s.currentSong?.id

      if (key !== prevKey) {
        prevKey = key
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(push, STRUCTURE_DEBOUNCE_MS)
        return
      }
      if (paused || songChanged) {
        push()
        return
      }
      if (s.isPlaying && Date.now() - lastPositionPushRef.current >= POSITION_INTERVAL_MS) {
        push()
      }
    })

    return () => {
      unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [token])
}
