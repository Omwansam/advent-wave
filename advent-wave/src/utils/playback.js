import { usePlayerStore } from '../store/usePlayerStore'

/**
 * play(), with its rejection handled. AbortError means a newer load() or pause() superseded
 * this call, the normal result of switching tracks quickly. Anything else (autoplay refused,
 * source unplayable) means nothing is playing, so the UI is told and one press of Play retries.
 */
export function startPlayback(audio) {
  const p = audio.play()
  p?.catch?.((err) => {
    if (err?.name === 'AbortError') return
    usePlayerStore.getState().setPlaying(false)
  })
}

/** Stops an element and lets go of its source, so it stops downloading too. */
export function releaseElement(audio) {
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

/** What nextSong() would move to, without moving: the queue's next item, or its first under repeat-all. */
export function peekNext(state) {
  const { queue, currentIndex, repeat } = state
  if (currentIndex < queue.length - 1) return queue[currentIndex + 1]
  if (repeat === 'all' && queue.length > 1) return queue[0]
  return null
}
