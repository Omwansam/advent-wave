import { useEffect } from 'react'
import { useProgressStore } from '../store/useProgressStore'
import { isLongForm } from '../utils/longForm'

/** Often enough that a closed tab loses little; rarely enough not to rewrite storage 4×/s. */
const SAVE_EVERY_SEC = 5

/**
 * Records how far into a sermon or podcast episode the listener is, for resume and for the
 * In progress / Unplayed filters. Songs are not tracked: nobody resumes a hymn at verse three.
 *
 * @param {{ current: HTMLAudioElement | null }} audioRef
 * @param {{ id: string, mediaType?: string } | null} track
 */
export function useListeningProgress(audioRef, track) {
  const id = isLongForm(track) ? track.id : null

  useEffect(() => {
    const a = audioRef.current
    if (!a || !id) return undefined

    // When the track changes, the element still holds the previous item's source until this
    // one's manifest arrives, and its pause and timeupdate events describe that item. Nothing
    // is written for this id until this id's own metadata has loaded.
    let loaded = false
    let lastSaved = -Infinity

    // flush: also tell the server now. Pause, seek and leaving the item are the moments a
    // listener might pick up on another device; steady playback is throttled in the store.
    const save = (flush) => {
      if (!loaded || !(a.duration > 0)) return
      useProgressStore.getState().record(id, a.currentTime, a.duration, { flush })
      lastSaved = a.currentTime
    }
    const flush = () => save(true)
    const onMeta = () => {
      loaded = true
    }
    const onTime = () => {
      if (Math.abs(a.currentTime - lastSaved) >= SAVE_EVERY_SEC) save(false)
    }
    const onEnded = () => {
      if (loaded) useProgressStore.getState().markFinished(id, a.duration)
    }

    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('pause', flush)
    a.addEventListener('seeked', flush)
    a.addEventListener('ended', onEnded)
    return () => {
      // The track is changing (or the player is going away) and the element has not been
      // handed the next source yet, so this is still this item's final position.
      flush()
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('pause', flush)
      a.removeEventListener('seeked', flush)
      a.removeEventListener('ended', onEnded)
    }
  }, [audioRef, id])
}
