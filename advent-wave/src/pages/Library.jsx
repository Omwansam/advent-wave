import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownAZ, Clock, Heart, ListMusic } from 'lucide-react'
import { PlaylistCard } from '../components/PlaylistCard'
import { SongRow } from '../components/SongRow'
import {
  playlists,
  resolvePlaylist,
  getSongById,
} from '../data/mockData'
import { useLibraryStore } from '../store/useLibraryStore'

export function Library() {
  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const userPlaylists = useLibraryStore((s) => s.userPlaylists)

  const [playlistSort, setPlaylistSort] = useState('recent')
  const [likedSort, setLikedSort] = useState('recent')

  const likedSongs = useMemo(
    () => likedSongIds.map(getSongById).filter(Boolean),
    [likedSongIds],
  )

  const likedSongsSorted = useMemo(() => {
    const list = [...likedSongs]
    if (likedSort === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title))
      return list
    }
    const order = new Map(likedSongIds.map((id, i) => [id, i]))
    list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    return list
  }, [likedSongs, likedSongIds, likedSort])

  const curated = useMemo(
    () => playlists.map(resolvePlaylist),
    [],
  )
  const mine = useMemo(
    () => userPlaylists.map((p) => resolvePlaylist(p)),
    [userPlaylists],
  )

  const mineSorted = useMemo(() => {
    const list = [...mine]
    if (playlistSort === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return list
  }, [mine, playlistSort])

  const curatedSorted = useMemo(() => {
    const list = [...curated]
    if (playlistSort === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return list
  }, [curated, playlistSort])

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--aw-text)]">
          Your library
        </h1>
        <p className="mt-2 text-[var(--aw-muted)]">
          Playlists you create, tracks you love, and saved sermons.
        </p>
      </header>

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListMusic className="size-5 text-[var(--aw-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--aw-text)]">
              Playlists
            </h2>
          </div>
          <div className="flex rounded-full bg-[var(--aw-surface)] p-1 ring-1 ring-[var(--aw-border)]">
            <button
              type="button"
              onClick={() => setPlaylistSort('recent')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                playlistSort === 'recent'
                  ? 'bg-[var(--aw-primary)] text-white'
                  : 'text-[var(--aw-muted)]'
              }`}
            >
              <Clock className="size-3.5" />
              Recent
            </button>
            <button
              type="button"
              onClick={() => setPlaylistSort('alpha')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                playlistSort === 'alpha'
                  ? 'bg-[var(--aw-primary)] text-white'
                  : 'text-[var(--aw-muted)]'
              }`}
            >
              <ArrowDownAZ className="size-3.5" />
              A–Z
            </button>
          </div>
        </div>
        {mineSorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)] p-8 text-center text-[var(--aw-muted)]">
            No playlists yet — use <strong className="text-[var(--aw-text)]">Create playlist</strong> in the sidebar.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mineSorted.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} songs={pl.songs} />
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {curatedSorted.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} songs={pl.songs} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-[var(--aw-gold)]" />
            <h2 className="text-xl font-semibold text-[var(--aw-text)]">
              Liked songs
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {likedSongs.length > 0 ? (
              <Link
                to="/liked"
                className="text-sm font-semibold text-[var(--aw-primary)] hover:underline"
              >
                Open full list
              </Link>
            ) : null}
            <div className="flex rounded-full bg-[var(--aw-surface)] p-1 ring-1 ring-[var(--aw-border)]">
              <button
                type="button"
                onClick={() => setLikedSort('recent')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  likedSort === 'recent'
                    ? 'bg-[var(--aw-primary)] text-white'
                    : 'text-[var(--aw-muted)]'
                }`}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setLikedSort('alpha')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  likedSort === 'alpha'
                    ? 'bg-[var(--aw-primary)] text-white'
                    : 'text-[var(--aw-muted)]'
                }`}
              >
                A–Z
              </button>
            </div>
          </div>
        </div>
        {likedSongs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] p-8 text-center text-[var(--aw-muted)]">
            Tap the heart on any row to build your collection.{' '}
            <Link className="font-medium text-[var(--aw-primary)]" to="/">
              Go to Home
            </Link>
          </div>
        ) : (
          <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
            {likedSongsSorted.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                queue={likedSongsSorted}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
