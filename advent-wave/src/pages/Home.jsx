import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Play } from 'lucide-react'
import { PlaylistCard } from '../components/PlaylistCard'
import { SectionRow } from '../components/SectionRow'
import { SongRow } from '../components/SongRow'
import { LazySection } from '../components/LazySection'
import { PageError, PageLoading } from '../components/PageState'
import { getHome } from '../api'
import { useApi } from '../hooks/useApi'
import { greetingLabel } from '../utils/timeGreeting'
import { usePlayerStore } from '../store/usePlayerStore'
import { useAuthStore } from '../store/useAuthStore'

function SongScrollCard({ song, index, queue, showAlbum = false }) {
  return (
    <div className="w-[min(100%,min(90vw,340px))] shrink-0 snap-start scroll-ml-1">
      <div className="rounded-2xl bg-[var(--aw-surface)] p-2 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        <SongRow
          song={song}
          index={index}
          queue={queue}
          showAlbum={showAlbum}
          showIndex={false}
        />
      </div>
    </div>
  )
}

function TrackRail({ title, subtitle, to, tracks, showAlbum = false }) {
  if (!tracks?.length) return null
  return (
    <SectionRow title={title} subtitle={subtitle} to={to}>
      {tracks.map((song, i) => (
        <SongScrollCard
          key={song.id}
          song={song}
          index={i}
          queue={tracks}
          showAlbum={showAlbum}
        />
      ))}
    </SectionRow>
  )
}

export function Home() {
  const { search } = useOutletContext() || { search: '' }
  const playQueue = usePlayerStore((s) => s.playQueue)
  const user = useAuthStore((s) => s.user)

  // One request assembles the whole page server-side: recently played, trending, curated
  // playlists, sermons and recommendations. The client no longer scores anything.
  const { data, error, loading, refetch } = useApi((signal) => getHome({ signal }), [])

  const q = search.trim().toLowerCase()
  const filterSongs = useMemo(
    () => (list) =>
      !q
        ? list ?? []
        : (list ?? []).filter(
            (s) =>
              s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
          ),
    [q],
  )

  if (loading) return <PageLoading sections={4} />
  if (error) return <PageError error={error} onRetry={refetch} what="your home page" />
  if (!data) return null

  const {
    greetingPeriod,
    recentlyPlayed,
    trendingNow,
    sabbathWorship,
    sermons,
    recommendations,
  } = data

  const becauseYouListened = recommendations?.becauseYouListened
  const trendingInRegion = recommendations?.trendingInRegion
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || ''
  const greeting = greetingLabel(greetingPeriod)
  const heroTitle = firstName ? `${greeting}, ${firstName}` : greeting
  const featuredMix = trendingNow ?? []

  return (
    <div className="space-y-2">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--aw-primary)]/15 via-[var(--aw-gold-soft)]/40 to-[var(--aw-bg)] p-8 shadow-[var(--aw-shadow-card)] ring-1 ring-[var(--aw-primary)]/15">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
            AdventWave
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--aw-text)] md:text-4xl">
            {heroTitle}
          </h1>
          <p className="mt-3 text-[var(--aw-muted)]">
            Here&apos;s your mix of worship, sermons, and what&apos;s moving
            listeners right now — tuned from your taste, not a random shuffle.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!featuredMix.length}
              onClick={() => playQueue(featuredMix, 0)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--aw-primary)]/30 transition hover:bg-[var(--aw-primary-hover)] disabled:opacity-50"
            >
              <Play className="size-4 fill-current" />
              Play featured mix
            </button>
            <Link
              to="/browse"
              className="inline-flex items-center rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold text-[var(--aw-text)] transition hover:bg-[var(--aw-surface-elevated)]"
            >
              Browse all
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold text-[var(--aw-text)] transition hover:bg-[var(--aw-surface-elevated)]"
            >
              Discover
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-6 py-3 text-sm font-semibold text-[var(--aw-text)] transition hover:bg-[var(--aw-surface-elevated)]"
            >
              Account
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 size-72 rounded-full bg-[var(--aw-primary)]/20 blur-3xl" />
      </section>

      <TrackRail
        title="Recently played"
        subtitle="Pick up where you left off — ordered by your latest starts."
        to="/history"
        tracks={filterSongs(recentlyPlayed)}
      />

      <LazySection>
        <SectionRow
          title="Recommended for you"
          subtitle="From your likes, history, and follows — scored on the server, not random."
          to="/browse"
        >
          {(recommendations?.recommendedSongs ?? []).map((song, i) => (
            <SongScrollCard
              key={song.id}
              song={song}
              index={i}
              queue={recommendations.recommendedSongs}
            />
          ))}
          {(recommendations?.recommendedPlaylists ?? []).map((pl) => (
            <div
              key={pl.id}
              className="w-[min(100%,220px)] shrink-0 snap-start scroll-ml-1"
            >
              <PlaylistCard playlist={pl} songs={pl.songs} />
            </div>
          ))}
        </SectionRow>
      </LazySection>

      <LazySection>
        <TrackRail
          title="Trending now"
          subtitle="Most played across the catalogue right now."
          to="/discover"
          tracks={filterSongs(trendingNow)}
        />
      </LazySection>

      {becauseYouListened ? (
        <LazySection>
          <TrackRail
            title={`Because you listened to ${becauseYouListened.artistName}`}
            subtitle="More from an artist you have been playing."
            tracks={filterSongs(becauseYouListened.songs)}
          />
        </LazySection>
      ) : null}

      {trendingInRegion ? (
        <LazySection>
          <TrackRail
            title={`Trending in ${trendingInRegion.label}`}
            subtitle="What listeners near you are playing."
            to="/discover"
            tracks={filterSongs(trendingInRegion.songs)}
          />
        </LazySection>
      ) : null}

      {sabbathWorship?.length ? (
        <LazySection>
          <SectionRow
            title="Sabbath worship picks"
            subtitle="Playlists scored for Sabbath rest, worship, and calm focus."
            to="/library"
          >
            {sabbathWorship.map((pl) => (
              <div
                key={pl.id}
                className="w-[min(100%,220px)] shrink-0 snap-start scroll-ml-1"
              >
                <PlaylistCard playlist={pl} songs={pl.songs} />
              </div>
            ))}
          </SectionRow>
        </LazySection>
      ) : null}

      <LazySection>
        <TrackRail
          title="Sermons for you"
          subtitle="Saved sermons first, then the rest of the catalogue."
          to="/sermons"
          tracks={filterSongs(sermons)}
          showAlbum
        />
      </LazySection>
    </div>
  )
}
