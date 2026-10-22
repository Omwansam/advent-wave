import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, UserCheck, UserPlus } from 'lucide-react'
import { searchUsers } from '../api'
import { useFriendsStore } from '../store/useFriendsStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { useToastStore } from '../store/useToastStore'
import { formatAgo } from '../utils/format'

/**
 * Friend activity (RFC 0007): the pieces the side panel, the Friends page and profiles share.
 * A listener has no picture, only a display name, so the avatar is their initials.
 */

const SIZES = { sm: 'size-10 text-sm', lg: 'size-40 text-5xl md:size-48' }

export function UserAvatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => [...part][0].toUpperCase())
    .join('')
  // Same name, same colour, on every device.
  let hash = 0
  for (const ch of name || '') hash = (hash * 31 + ch.codePointAt(0)) | 0
  const hue = Math.abs(hash) % 360
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ring-2 ring-[var(--aw-gold)]/20`}
      style={{ backgroundColor: `hsl(${hue} 45% 42%)` }}
    >
      {initials || '?'}
    </span>
  )
}

/** Three bars, like a level meter: this friend is playing it right now. */
function NowPlaying() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" title="Listening now" aria-label="Listening now">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-pulse rounded-sm bg-[var(--aw-primary)]"
          style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

export function FriendRow({ friend }) {
  const track = useFriendsStore((s) => (friend.activity ? s.tracks[friend.activity.mediaItemId] : null))
  const playSong = usePlayerStore((s) => s.playSong)
  const activity = track ? friend.activity : null

  return (
    <li className="mb-1">
      <div className="flex gap-3 rounded-xl p-2 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
        <Link to={`/user/${friend.id}`} className="shrink-0" aria-label={friend.displayName}>
          <UserAvatar name={friend.displayName} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/user/${friend.id}`}
              className="truncate text-sm font-semibold text-[var(--aw-text)] hover:underline"
            >
              {friend.displayName}
            </Link>
            {activity ? (
              <span className="shrink-0 text-xs text-[var(--aw-muted)]">
                {activity.playing ? <NowPlaying /> : formatAgo(activity.atEpochMs)}
              </span>
            ) : null}
          </div>
          {track ? (
            <p className="truncate text-xs text-[var(--aw-muted)]">
              <button
                type="button"
                onClick={() => playSong(track, [track])}
                data-prefetch={track.id}
                className="text-[var(--aw-text)]/90 hover:text-[var(--aw-primary)] hover:underline"
                title={`Play ${track.title}`}
              >
                {track.title}
              </button>
              <span className="mx-1">·</span>
              {track.artistId ? (
                <Link to={`/artist/${track.artistId}`} className="hover:underline">
                  {track.artist}
                </Link>
              ) : (
                <span>{track.artist}</span>
              )}
            </p>
          ) : (
            <p className="truncate text-xs text-[var(--aw-muted)]">No recent activity</p>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * Following someone from search, a profile or the Friends page. `followedByMe` is the server's
 * answer where the caller has one (search, profiles); the friends list holds only the most recent
 * 200, so it is the fallback, not the authority.
 */
export function FollowUserButton({ userId, name, followedByMe, size = 'sm', onChange }) {
  const inFriends = useFriendsStore((s) => s.friends.some((f) => f.id === userId))
  const toggleFollow = useFriendsStore((s) => s.toggleFollow)
  const showToast = useToastStore((s) => s.showToast)
  const [busy, setBusy] = useState(false)
  // What the last click here returned, which is newer than either source above.
  const [toggled, setToggled] = useState(null)
  const following = toggled ?? followedByMe ?? inFriends

  const onClick = async () => {
    setBusy(true)
    try {
      const now = await toggleFollow(userId)
      setToggled(now)
      showToast(now ? `Following ${name}` : `Unfollowed ${name}`)
      onChange?.(now)
    } catch {
      showToast(`Could not ${following ? 'unfollow' : 'follow'} ${name}. Try again.`)
    } finally {
      setBusy(false)
    }
  }

  const large = size === 'lg'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border font-bold transition disabled:opacity-60 ${
        large ? 'px-6 py-3 text-sm' : 'px-3 py-1 text-xs'
      } ${
        following
          ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10 text-[var(--aw-primary)]'
          : 'border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)]/40'
      }`}
    >
      {following ? (
        <UserCheck className={large ? 'size-5' : 'size-3.5'} />
      ) : (
        <UserPlus className={large ? 'size-5' : 'size-3.5'} />
      )}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

const MIN_QUERY = 2
const SEARCH_DELAY_MS = 300

/** Finds listeners by display name. */
export function FindFriends({ autoFocus = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const trimmed = query.trim()
  const searching = [...trimmed].length >= MIN_QUERY

  useEffect(() => {
    if (!searching) return undefined
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchUsers(trimmed, { signal: controller.signal })
        .then(({ users }) => {
          setResults(users)
          setError(null)
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setError(err)
        })
    }, SEARCH_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, searching])

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Find friends by name</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--aw-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find friends by name"
          autoFocus={autoFocus}
          maxLength={100}
          className="w-full rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] py-2 pl-9 pr-3 text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-muted)] focus:border-[var(--aw-primary)] focus:outline-none"
        />
      </label>
      {searching ? (
        <ul className="mt-2" aria-live="polite">
          {error ? (
            <li className="px-2 py-1 text-xs text-[var(--aw-muted)]">Search is not available right now.</li>
          ) : results == null ? (
            <li className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--aw-muted)]">
              <Loader2 className="size-3.5 animate-spin" /> Searching
            </li>
          ) : results.length === 0 ? (
            <li className="px-2 py-1 text-xs text-[var(--aw-muted)]">No one by that name.</li>
          ) : (
            results.map((user) => (
              <li key={user.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                <Link to={`/user/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={user.displayName} />
                  <span className="truncate text-sm font-semibold text-[var(--aw-text)]">{user.displayName}</span>
                </Link>
                <FollowUserButton userId={user.id} name={user.displayName} followedByMe={user.followedByMe} />
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
