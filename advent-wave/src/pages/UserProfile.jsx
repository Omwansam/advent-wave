import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getUserProfile } from '../api'
import { useApi } from '../hooks/useApi'
import { useFriendsStore } from '../store/useFriendsStore'
import { FollowUserButton, FriendRow, UserAvatar } from '../components/Friends'
import { PageError, PageLoading, PageNotFound } from '../components/PageState'

function count(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

/** A listener's public profile (RFC 0007): a name, who follows whom, and what they are playing if you follow them. */
export function UserProfile() {
  const { id } = useParams()
  const { data: profile, error, loading, refetch } = useApi(
    (signal) => getUserProfile(id, { signal }),
    [id],
  )
  const friend = useFriendsStore((s) => s.friends.find((f) => f.id === id))

  if (loading) return <PageLoading sections={1} />
  if (error?.isNotFound) return <PageNotFound what="Listener not found." />
  if (error) return <PageError error={error} onRetry={refetch} what="this profile" />
  if (!profile) return null

  return (
    <div>
      <Link
        to="/friends"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--aw-muted)] transition hover:text-[var(--aw-primary)]"
      >
        <ArrowLeft className="size-4" />
        Friends
      </Link>

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-t from-[var(--aw-bg)] via-[var(--aw-primary)]/15 to-[var(--aw-gold)]/20 p-8 md:p-12">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
          <UserAvatar name={profile.displayName} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
              Profile
            </p>
            <h1 className="mt-1 break-words text-4xl font-black tracking-tight text-[var(--aw-text)] md:text-6xl">
              {profile.displayName}
            </h1>
            <p className="mt-2 text-[var(--aw-muted)]">
              {count(profile.followerCount, 'follower', 'followers')} ·{' '}
              {count(profile.followingCount, 'following', 'following')}
              {profile.followsMe && !profile.isMe ? (
                <span className="ml-2 rounded-full bg-[var(--aw-primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--aw-primary)]">
                  Follows you
                </span>
              ) : null}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              {profile.isMe ? (
                <p className="text-sm text-[var(--aw-muted)]">
                  This is you. Choose whether your followers see what you play in{' '}
                  <Link to="/settings" className="underline hover:text-[var(--aw-primary)]">Settings</Link>.
                </p>
              ) : (
                <FollowUserButton
                  userId={profile.id}
                  name={profile.displayName}
                  followedByMe={profile.followedByMe}
                  size="lg"
                  onChange={refetch}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {friend ? (
        <section className="mt-10 max-w-xl">
          <h2 className="mb-3 text-xl font-semibold text-[var(--aw-text)]">
            {friend.activity?.playing ? 'Listening now' : 'Recently played'}
          </h2>
          <ul className="rounded-2xl bg-[var(--aw-surface)] p-2 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
            <FriendRow friend={friend} />
          </ul>
        </section>
      ) : null}
    </div>
  )
}
