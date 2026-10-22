import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { PageError, PageLoading, PageNotFound } from '../components/PageState'
import { getAlbum } from '../api'
import { useApi } from '../hooks/useApi'
import { usePlayerStore } from '../store/usePlayerStore'

export function AlbumDetail() {
  const { id } = useParams()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const { data: album, error, loading, refetch } = useApi(
    (signal) => getAlbum(id, { signal }),
    [id],
  )

  if (loading) return <PageLoading sections={2} />
  if (error?.isNotFound) {
    return <PageNotFound what="Album not found." to="/discover" label="Browse Discover" />
  }
  if (error) return <PageError error={error} onRetry={refetch} what="this album" />
  if (!album) return null

  const tracks = album.tracks ?? []

  return (
    <div>
      <Link
        to="/discover"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--aw-muted)] transition hover:text-[var(--aw-primary)]"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end">
        <div className="relative aspect-square w-full max-w-[280px] shrink-0 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
          <img src={album.cover} alt="" className="size-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
            Album
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[var(--aw-text)] md:text-5xl">
            {album.title}
          </h1>
          <p className="mt-3 text-[var(--aw-muted)]">
            <Link
              to={`/artist/${album.artistId}`}
              className="font-semibold text-[var(--aw-text)] hover:underline"
            >
              {album.artist}
            </Link>
            <span className="text-[var(--aw-muted)]"> · </span>
            {tracks.length} songs
          </p>
          <button
            type="button"
            disabled={!tracks.length}
            onClick={() => playQueue(tracks, 0)}
            data-prefetch={tracks[0]?.id}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--aw-primary)]/25 transition enabled:hover:bg-[var(--aw-primary-hover)] disabled:opacity-50"
          >
            <Play className="size-4 fill-current" />
            Play album
          </button>
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-2 hidden grid-cols-[minmax(0,48px)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[var(--aw-border)] px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)] md:grid">
          <span>#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="text-right">Time</span>
        </div>
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {tracks.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={tracks}
              showAlbum={false}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
