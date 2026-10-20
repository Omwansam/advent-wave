import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useFriendsStore } from '../store/useFriendsStore'
import { FindFriends, FriendRow } from './Friends'

/**
 * What the people you follow are playing (RFC 0007), refreshed by useFriendsPoll. Hidden in a
 * private session, as in the reference client: you are not sharing, so you are not watching.
 */
export function FriendActivityPanel() {
  const privateSession = useUiStore((s) => s.privateSession)
  const shareActivity = useUiStore((s) => s.shareActivity)
  const collapsed = useUiStore((s) => s.friendActivityCollapsed)
  const toggleFriendActivity = useUiStore((s) => s.toggleFriendActivity)
  const friends = useFriendsStore((s) => s.friends)
  const loaded = useFriendsStore((s) => s.loaded)
  const error = useFriendsStore((s) => s.error)

  if (privateSession) return null

  if (collapsed) {
    return (
      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-0 top-14 z-20 hidden w-10 flex-col items-center border-l border-[var(--aw-border)] bg-[var(--aw-nav-bg)]/95 py-3 backdrop-blur-md 2xl:flex">
        <button
          type="button"
          onClick={toggleFriendActivity}
          className="rounded-lg p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-primary)] dark:hover:bg-white/10"
          title="Show friend activity"
          aria-label="Show friend activity"
        >
          <ChevronLeft className="size-5" />
        </button>
        <Users className="mt-4 size-5 text-[var(--aw-muted)]" aria-hidden />
      </div>
    )
  }

  return (
    <aside className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-0 top-14 z-20 hidden w-72 flex-col border-l border-[var(--aw-border)] bg-[var(--aw-nav-bg)]/95 backdrop-blur-md 2xl:flex">
      <div className="flex items-center justify-between border-b border-[var(--aw-border)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--aw-text)]">
          <Link to="/friends" className="hover:underline">Friend activity</Link>
        </h2>
        <button
          type="button"
          onClick={toggleFriendActivity}
          className="rounded-full p-1.5 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
          title="Collapse"
          aria-label="Collapse friend activity"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:thin]">
        {!loaded ? null : error && !friends.length ? (
          <p className="px-1 py-2 text-xs text-[var(--aw-muted)]">Friend activity is not available right now.</p>
        ) : friends.length ? (
          <ul>
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f} />
            ))}
          </ul>
        ) : (
          <p className="px-1 py-2 text-sm text-[var(--aw-muted)]">
            Follow friends to see what they are listening to.
          </p>
        )}
        <div className="mt-4 border-t border-[var(--aw-border)] pt-4">
          <FindFriends />
        </div>
        {!shareActivity ? (
          <p className="mt-4 px-1 text-xs text-[var(--aw-muted)]">
            You are not sharing what you play.{' '}
            <Link to="/settings" className="underline hover:text-[var(--aw-primary)]">Settings</Link>
          </p>
        ) : null}
      </div>
    </aside>
  )
}
