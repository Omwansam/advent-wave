import { useEffect } from 'react'
import { prefetchManifest } from './usePlaybackSource'
import { usePlayerStore } from '../store/usePlayerStore'

/** Resting on an item this long reads as intent; sweeping across a list on the way elsewhere does not. */
const HOVER_MS = 120

function prefetchIdOf(event) {
  const el = event.target instanceof Element ? event.target.closest('[data-prefetch]') : null
  return el?.getAttribute('data-prefetch') || null
}

function prefetch(id) {
  if (!id || usePlayerStore.getState().currentSong?.id === id) return
  prefetchManifest(id).catch(() => {
    // Only a head start: the click fetches the manifest itself if this one failed.
  })
}

/**
 * Fetches a song's manifest when the listener looks about to play it — the pointer resting on it,
 * a press (the only warning a touch screen gives), or keyboard focus — so the click finds it
 * ready in usePlaybackSource and the connection to the audio already open. The manifest is a round
 * trip to the gateway, the largest single wait between a click and sound.
 *
 * Any element marked data-prefetch="<media item id>" takes part: one set of listeners for the
 * whole app rather than one per row.
 */
export function usePrefetchOnIntent() {
  useEffect(() => {
    let timer
    let hovered = null
    const onOver = (e) => {
      const id = prefetchIdOf(e)
      if (id === hovered) return
      hovered = id
      clearTimeout(timer)
      if (id) timer = setTimeout(() => prefetch(id), HOVER_MS)
    }
    const onNow = (e) => prefetch(prefetchIdOf(e))
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerdown', onNow, { passive: true, capture: true })
    document.addEventListener('focusin', onNow)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerdown', onNow, { capture: true })
      document.removeEventListener('focusin', onNow)
    }
  }, [])
}
