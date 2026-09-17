import { useRef, useState } from 'react'
import { getMediaBatch } from '../api'
import { usePlayerStore } from '../store/usePlayerStore'
import { useToastStore } from '../store/useToastStore'

/**
 * Play handler for a playlist card. Home's recommended playlists arrive with `songIds`
 * but no resolved `songs`, so the first press resolves them through the batch endpoint
 * and starts playback once they are back. Curated playlists that already carry `songs`
 * start immediately.
 */
export function usePlaylistPlayback(playlist) {
  const playQueue = usePlayerStore((s) => s.playQueue)
  const showToast = useToastStore((s) => s.showToast)
  const [busy, setBusy] = useState(false)
  const resolved = useRef(null)

  const songs = playlist.songs?.length ? playlist.songs : resolved.current
  const ids = playlist.songIds ?? []
  const canPlay = Boolean(songs?.length || ids.length)

  const onPlay = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (songs?.length) {
      playQueue(songs, 0)
      return
    }
    if (!ids.length || busy) return
    setBusy(true)
    try {
      const tracks = await getMediaBatch(ids)
      resolved.current = tracks
      if (tracks.length) playQueue(tracks, 0)
    } catch {
      showToast('Could not load that playlist')
    } finally {
      setBusy(false)
    }
  }

  return { onPlay, canPlay, busy }
}
