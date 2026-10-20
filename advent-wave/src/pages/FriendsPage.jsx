import { Link } from 'react-router-dom'
import { useUiStore } from '../store/useUiStore'
import { useFriendsStore } from '../store/useFriendsStore'
import { FindFriends, FriendRow } from '../components/Friends'
import { PageLoading } from '../components/PageState'

/**
 * The people you follow and what they are playing (RFC 0007): the side panel's content as a
 * page, for screens too narrow to show the panel.
 */
export function FriendsPage() {
  const friends = useFriendsStore((s) => s.friends)
  const loaded = useFriendsStore((s) => s.loaded)
  const error = useFriendsStore((s) => s.error)
  const privateSession = useUiStore((s) => s.privateSession)
  const shareActivity = useUiStore((s) => s.shareActivity)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-[var(--aw-text)]">Friends</h1>
      <p className="mt-2 text-sm text-[var(--aw-muted)]">
        {privateSession
          ? 'You are in a private session: nobody sees what you play until you end it.'
          : shareActivity
            ? 'The people who follow you see what you play. You can stop sharing in '
            : 'You are not sharing what you play. You can start in '}
        {!privateSession ? (
          <>
            <Link to="/settings" className="underline hover:text-[var(--aw-primary)]">Settings</Link>.
          </>
        ) : null}
      </p>

      <section className="mt-8 rounded-2xl bg-[var(--aw-surface)] p-4 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        <FindFriends />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold text-[var(--aw-text)]">Following</h2>
        {!loaded ? (
          <PageLoading sections={1} />
        ) : error && !friends.length ? (
          <p className="text-sm text-[var(--aw-muted)]">Friend activity is not available right now.</p>
        ) : friends.length ? (
          <ul className="rounded-2xl bg-[var(--aw-surface)] p-2 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--aw-muted)]">
            You are not following anyone yet. Find friends by name above.
          </p>
        )}
      </section>
    </div>
  )
}
