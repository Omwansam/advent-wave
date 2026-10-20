import { useEffect } from 'react'
import { useFriendsStore } from '../store/useFriendsStore'

/** About how often the reference client refreshes its friend feed. */
const POLL_MS = 60_000

/**
 * Keeps the friends list fresh while the app is open: once on mount, then every minute while
 * the tab is visible, and straight away when it becomes visible again. One request a minute,
 * so no push channel yet.
 */
export function useFriendsPoll() {
  const load = useFriendsStore((s) => s.load)

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])
}
