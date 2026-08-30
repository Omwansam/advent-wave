import { Link } from 'react-router-dom'
import { Heart, Play, Shuffle } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { PageError, PageLoading } from '../components/PageState'
import { getMediaBatch } from '../api'
import { useApi } from '../hooks/useApi'
import { useLibraryStore } from '../store/useLibraryStore'
import { usePlayerStore } from '../store/usePlayerStore'

export function LikedSongs() {
  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const libraryLoaded = useLibraryStore((s) => s.loaded)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)

  // The library gives ids; one batch request resolves them, in the order they were liked.
  const idKey = likedSongIds.join(',')
  const { data, error, loading, refetch } = useApi(
    (signal) => getMediaBatch(likedSongIds, { signal }),
    [idKey],
    { enabled: libraryLoaded },
  )

  const likedSongs = data ?? []
  const pending = !libraryLoaded || loading

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--aw-gold)]/25 via-[var(--aw-primary)]/20 to-[var(--aw-bg)] p-8 pb-12 shadow-[var(--aw-shadow-card)] ring-1 ring-[var(--aw-primary)]/15 md:flex md:items-end md:gap-8 md:p-10">
        <div className="relative z-10 flex flex-1 flex-col gap-4 md:flex-row md:items-end">
          <div className="flex size-40 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] shadow-2xl md:size-52">
            <Heart className="size-20 fill-white text-white md:size-24" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-text)]">
              Playlist
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[var(--aw-text)] md:text-6xl">
              Liked songs
            </h1>
            <p className="mt-2 text-sm text-[var(--aw-muted)]">
              {likedSongIds.length} saved track{likedSongIds.length === 1 ? '' : 's'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!likedSongs.length}
                onClick={() => playQueue(likedSongs, 0)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-[var(--aw-primary)]/30 transition enabled:hover:scale-[1.02] enabled:hover:bg-[var(--aw-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="size-5 fill-current" />
                Play
              </button>
              <button
                type="button"
                disabled={!likedSongs.length}
                onClick={() => {
                  toggleShuffle()
                  playQueue(likedSongs, 0)
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold text-[var(--aw-text)] transition hover:bg-[var(--aw-surface-elevated)] disabled:opacity-40"
              >
                <Shuffle className="size-4" />
                Shuffle play
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10">
        {error ? (
          <PageError error={error} onRetry={refetch} what="your liked songs" />
        ) : pending && likedSongIds.length ? (
          <PageLoading sections={1} />
        ) : likedSongs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)] p-12 text-center">
            <p className="text-[var(--aw-muted)]">
              Songs you like will appear here.
            </p>
            <Link
              to="/discover"
              className="mt-4 inline-block font-semibold text-[var(--aw-primary)] hover:underline"
            >
              Discover music
            </Link>
          </div>
        ) : (
          <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
            {likedSongs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                queue={likedSongs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
