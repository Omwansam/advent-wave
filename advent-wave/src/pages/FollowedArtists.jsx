import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { getArtistByName } from '../data/mockData'
import { useLibraryStore } from '../store/useLibraryStore'

export function FollowedArtists() {
  const followedArtistNames = useLibraryStore((s) => s.followedArtistNames)

  const artists = useMemo(
    () =>
      followedArtistNames
        .map((name) => getArtistByName(name))
        .filter(Boolean),
    [followedArtistNames],
  )

  return (
    <div>
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-[var(--aw-primary)]">
          <UserRound className="size-6" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            Following
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Your artists
        </h1>
        <p className="mt-2 max-w-xl text-[var(--aw-muted)]">
          Artists you follow appear here. Open any artist page and tap Follow
          (Spotify-style).
        </p>
      </header>

      {artists.length === 0 ? (
        <div className="rounded-2xl bg-[var(--aw-surface)] p-12 text-center shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          <p className="text-[var(--aw-muted)]">
            You are not following anyone yet.
          </p>
          <Link
            to="/search"
            className="mt-4 inline-block font-medium text-[var(--aw-primary)]"
          >
            Search artists
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artists.map((a) => (
            <li key={a.name}>
              <Link
                to={`/artist/${encodeURIComponent(a.name)}`}
                className="group flex items-center gap-4 rounded-2xl bg-[var(--aw-surface)] p-4 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] transition hover:ring-[var(--aw-primary)]/30 dark:ring-white/10"
              >
                <img
                  src={a.cover}
                  alt=""
                  className="size-16 shrink-0 rounded-full object-cover ring-2 ring-[var(--aw-gold)]/25 transition group-hover:scale-105"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--aw-text)]">
                    {a.name}
                  </p>
                  <p className="text-sm text-[var(--aw-muted)]">
                    {a.songIds.length} track
                    {a.songIds.length === 1 ? '' : 's'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
