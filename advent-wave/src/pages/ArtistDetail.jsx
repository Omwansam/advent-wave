import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Play, UserPlus, UserCheck } from 'lucide-react'
import { SongRow } from '../components/SongRow'
import { PageError, PageLoading, PageNotFound } from '../components/PageState'
import { getArtist } from '../api'
import { useApi } from '../hooks/useApi'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useToastStore } from '../store/useToastStore'

export function ArtistDetail() {
  const { id } = useParams()
  const playQueue = usePlayerStore((s) => s.playQueue)
  const followedArtistIds = useLibraryStore((s) => s.followedArtistIds)
  const toggleFollowArtist = useLibraryStore((s) => s.toggleFollowArtist)
  const showToast = useToastStore((s) => s.showToast)

  const { data: artist, error, loading, refetch } = useApi(
    (signal) => getArtist(id, { signal }),
    [id],
  )

  if (loading) return <PageLoading sections={2} />
  if (error?.isNotFound) return <PageNotFound what="Artist not found." />
  if (error) return <PageError error={error} onRetry={refetch} what="this artist" />
  if (!artist) return null

  const tracks = artist.tracks ?? []
  const following = followedArtistIds.includes(artist.id)

  return (
    <div>
      <Link
        to="/discover"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--aw-muted)] transition hover:text-[var(--aw-primary)]"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-t from-[var(--aw-bg)] via-[var(--aw-primary)]/15 to-[var(--aw-gold)]/20 p-8 md:p-12">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
          <img
            src={artist.cover}
            alt=""
            className="size-40 shrink-0 rounded-full object-cover shadow-2xl ring-4 ring-white/50 dark:ring-white/10 md:size-48"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
              Artist
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[var(--aw-text)] md:text-6xl">
              {artist.name}
            </h1>
            <p className="mt-2 text-[var(--aw-muted)]">
              {tracks.length} song{tracks.length === 1 ? '' : 's'}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!tracks.length}
                onClick={() => playQueue(tracks, 0)}
                data-prefetch={tracks[0]?.id}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-8 py-3 text-sm font-bold text-white shadow-xl shadow-[var(--aw-primary)]/30 transition enabled:hover:scale-[1.02] enabled:hover:bg-[var(--aw-primary-hover)] disabled:opacity-50"
              >
                <Play className="size-5 fill-current" />
                Play popular
              </button>
              <button
                type="button"
                onClick={() => {
                  const willFollow = !following
                  toggleFollowArtist(artist.id, artist.name)
                  showToast(
                    willFollow
                      ? `Following ${artist.name}`
                      : `Unfollowed ${artist.name}`,
                  )
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition ${
                  following
                    ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10 text-[var(--aw-primary)]'
                    : 'border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)]/40'
                }`}
              >
                {following ? (
                  <UserCheck className="size-5" />
                ) : (
                  <UserPlus className="size-5" />
                )}
                {following ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)]">
          Popular releases
        </h2>
        <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
          {tracks.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              queue={tracks}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
