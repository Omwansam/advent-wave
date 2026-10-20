import { useEffect, useRef } from 'react'
import { getAutoplay } from '../api'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUiStore } from '../store/useUiStore'

/** What the server is asked to continue from: the last few items played up to now. */
const SEEDS = 5
/** Added per top-up; another comes when the listener reaches the end of these. */
const BATCH = 10

/**
 * Autoplay (RFC 0004): when the last item in the queue starts, ask for more like what has been
 * playing and append it, so the queue does not simply stop. Asked at the start of the last item
 * rather than at its end, so a crossfade has a next song to fade into.
 *
 * Off under repeat (the queue loops instead) and when the listener turned it off. Appended items
 * carry `autoplay: true`, which the queue shows as "Next from: Autoplay".
 */
export function useAutoplay() {
  const enabled = useUiStore((s) => s.autoplay)
  const currentId = usePlayerStore((s) => s.currentSong?.id ?? null)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const queueLength = usePlayerStore((s) => s.queue.length)
  const repeat = usePlayerStore((s) => s.repeat)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const askedRef = useRef(null)

  useEffect(() => {
    if (!enabled || !currentId || !isPlaying || repeat !== 'off') return
    if (currentIndex < queueLength - 1) return
    // Once per position in the queue: a pause and resume on the same last item asks nothing new.
    const key = `${currentId}@${queueLength}`
    if (askedRef.current === key) return
    askedRef.current = key

    const { queue } = usePlayerStore.getState()
    const seeds = queue.slice(Math.max(0, currentIndex - SEEDS + 1), currentIndex + 1).map((t) => t.id)
    getAutoplay(seeds)
      .then((res) => {
        const st = usePlayerStore.getState()
        // The listener has moved on, or added songs themselves: theirs come first.
        if (st.currentSong?.id !== currentId || st.queue.length !== queueLength) return
        const queued = new Set(st.queue.map((t) => t.id))
        const fresh = (res?.tracks ?? [])
          .filter((t) => !queued.has(t.id))
          .slice(0, BATCH)
          .map((t) => ({ ...t, autoplay: true }))
        if (fresh.length) st.enqueueSongs(fresh)
      })
      .catch(() => {
        // Nothing to add: the queue ends, as it did before autoplay existed.
      })
  }, [enabled, currentId, currentIndex, queueLength, repeat, isPlaying])
}
