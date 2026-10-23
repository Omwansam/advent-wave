import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookOpen, Heart } from 'lucide-react'
import { FilterChips } from '../components/FilterChips'
import { LazySection } from '../components/LazySection'
import { PlaylistMediaCard, TrackCard } from '../components/MediaCard'
import { PageError } from '../components/PageState'
import { HomeSkeleton } from '../components/PageSkeleton'
import {
  PlaylistQuickTile,
  QuickPickTile,
  TrackQuickTile,
} from '../components/QuickPickTile'
import { ProfileShelf } from '../components/ProfileCard'
import { Shelf } from '../components/Shelf'
import { getArtists, getHome } from '../api'
import { useApi } from '../hooks/useApi'
import { greetingLabel } from '../utils/timeGreeting'
import { useAuthStore } from '../store/useAuthStore'

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'sermons', label: 'Sermons' },
]

/** Wash colours: brand tints for the two fixed tiles, a stable per-item hue for the rest. */
const PRIMARY_TINT = 'color-mix(in srgb, var(--aw-primary) 45%, transparent)'
const GOLD_TINT = 'color-mix(in srgb, var(--aw-gold) 45%, transparent)'
const RESTING_TINT = 'color-mix(in srgb, var(--aw-primary) 28%, transparent)'

function tintOf(id) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 60% 45% / 0.45)`
}

function uniqueById(list) {
  const seen = new Set()
  return list.filter((x) => x && !seen.has(x.id) && seen.add(x.id))
}

function TrackShelf({ eyebrow, title, to, tracks }) {
  if (!tracks?.length) return null
  return (
    <Shelf eyebrow={eyebrow} title={title} to={to}>
      {tracks.map((t) => (
        <TrackCard key={t.id} track={t} queue={tracks} />
      ))}
    </Shelf>
  )
}

function PlaylistShelf({ eyebrow, title, to, playlists }) {
  if (!playlists?.length) return null
  return (
    <Shelf eyebrow={eyebrow} title={title} to={to}>
      {playlists.map((pl) => (
        <PlaylistMediaCard key={pl.id} playlist={pl} />
      ))}
    </Shelf>
  )
}

export function Home() {
  const { search } = useOutletContext() || { search: '' }
  const user = useAuthStore((s) => s.user)
  const [chip, setChip] = useState('all')
  const [tint, setTint] = useState(null)

  // One request assembles the whole page server-side: recently played, trending, curated
  // playlists, sermons and recommendations. The client only filters and arranges.
  const { data, error, loading, refetch } = useApi((signal) => getHome({ signal }), [])
  // Spotify's "Popular artists", for a church catalogue (RFC 0009): choirs and groups, and
  // churches, each the most listened to over 30 days. Loaded beside the home page, not in it.
  const { data: popularChoirs } = useApi((signal) => getArtists({ kind: ['choir', 'group', 'soloist'], limit: 16 }, { signal }), [])
  const { data: churches } = useApi((signal) => getArtists({ kind: 'church', limit: 16 }, { signal }), [])

  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () => (list) =>
      (list ?? []).filter((t) => {
        if (chip !== 'all' && (chip === 'sermons') !== (t.mediaType === 'sermon')) return false
        if (!q) return true
        return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
      }),
    [chip, q],
  )
  const showPlaylists = chip !== 'sermons'

  const {
    greetingPeriod,
    recentlyPlayed,
    trendingNow,
    sabbathWorship,
    sermons,
    recommendations,
  } = data ?? {}

  // Eight tiles: two fixed library links, then what the listener has actually been playing,
  // padded from trending and sermons for a fresh account. Playlists are interleaved so the
  // grid does not read as one long list of tracks.
  const quickPicks = useMemo(() => {
    if (!data) return []
    const inChip = (t) =>
      chip === 'all' || (chip === 'sermons') === (t.mediaType === 'sermon')
    const tracks = uniqueById([
      ...(recentlyPlayed ?? []),
      ...(trendingNow ?? []),
      ...(sermons ?? []),
    ])
      .filter(inChip)
      .slice(0, 4)
    const playlists = showPlaylists
      ? uniqueById([
          ...(sabbathWorship ?? []),
          ...(recommendations?.recommendedPlaylists ?? []),
        ]).slice(0, 2)
      : []
    const liked =
      chip !== 'sermons'
        ? { kind: 'link', id: 'liked', to: '/liked', title: 'Liked Songs', icon: Heart,
            iconClass: 'bg-gradient-to-br from-[var(--aw-primary)] to-[#3b2fb5]', tint: PRIMARY_TINT }
        : null
    const sermonsTile =
      chip !== 'music'
        ? { kind: 'link', id: 'sermons', to: '/sermons', title: 'Sermons', icon: BookOpen,
            iconClass: 'bg-gradient-to-br from-[var(--aw-gold)] to-[#8a6d12]', tint: GOLD_TINT }
        : null
    return [
      liked,
      tracks[0] && { kind: 'track', item: tracks[0] },
      playlists[0] && { kind: 'playlist', item: playlists[0] },
      tracks[1] && { kind: 'track', item: tracks[1] },
      sermonsTile,
      tracks[2] && { kind: 'track', item: tracks[2] },
      playlists[1] && { kind: 'playlist', item: playlists[1] },
      tracks[3] && { kind: 'track', item: tracks[3] },
    ]
      .filter(Boolean)
      .slice(0, 8)
  }, [data, chip, showPlaylists, recentlyPlayed, trendingNow, sermons, sabbathWorship, recommendations])

  if (loading) return <HomeSkeleton />
  if (error) return <PageError error={error} onRetry={refetch} what="your home page" />
  if (!data) return null

  const becauseYouListened = recommendations?.becauseYouListened
  const trendingInRegion = recommendations?.trendingInRegion
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || ''
  const greeting = greetingLabel(greetingPeriod)
  const quickQueue = quickPicks.filter((p) => p.kind === 'track').map((p) => p.item)
  const madeForPlaylists = showPlaylists ? (recommendations?.recommendedPlaylists ?? []) : []
  const madeForSongs = visible(recommendations?.recommendedSongs)

  return (
    <div className="relative" style={{ '--aw-home-tint': tint ?? RESTING_TINT }}>
      {/* Colour wash behind the top of the feed; bleeds to the edges of the page padding. */}
      <div
        aria-hidden
        className="aw-home-tint pointer-events-none absolute -left-4 -right-4 -top-6 h-[420px] md:-left-8 md:-right-8"
      />

      <div className="relative space-y-10">
        <FilterChips options={CHIPS} value={chip} onChange={setChip} label="Filter home" />

        <section>
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--aw-text)] md:text-3xl">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <div className="@container">
            <div className="grid grid-cols-2 gap-2 @6xl:grid-cols-4">
              {quickPicks.map((p) => {
                if (p.kind === 'track') {
                  return (
                    <TrackQuickTile
                      key={p.item.id}
                      track={p.item}
                      queue={quickQueue}
                      tint={tintOf(p.item.id)}
                      onHover={setTint}
                    />
                  )
                }
                if (p.kind === 'playlist') {
                  return (
                    <PlaylistQuickTile
                      key={p.item.id}
                      playlist={p.item}
                      tint={tintOf(p.item.id)}
                      onHover={setTint}
                    />
                  )
                }
                return (
                  <QuickPickTile
                    key={p.id}
                    to={p.to}
                    title={p.title}
                    icon={p.icon}
                    iconClass={p.iconClass}
                    tint={p.tint}
                    onHover={setTint}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {madeForPlaylists.length || madeForSongs.length ? (
          <Shelf eyebrow="Made for" title={firstName || 'you'} to="/discover">
            {madeForPlaylists.map((pl) => (
              <PlaylistMediaCard key={pl.id} playlist={pl} />
            ))}
            {madeForSongs.map((t) => (
              <TrackCard key={t.id} track={t} queue={madeForSongs} />
            ))}
          </Shelf>
        ) : null}

        <TrackShelf
          title="Recently played"
          to="/history"
          tracks={visible(recentlyPlayed)}
        />

        <LazySection>
          <TrackShelf title="Trending now" to="/discover" tracks={visible(trendingNow)} />
        </LazySection>

        {chip !== 'sermons' && !q ? (
          <LazySection>
            <ProfileShelf title="Popular choirs" to="/choirs" profiles={popularChoirs?.artists} />
          </LazySection>
        ) : null}

        {!q ? (
          <LazySection>
            <ProfileShelf title="Churches" to="/choirs?filter=churches" profiles={churches?.artists} />
          </LazySection>
        ) : null}

        {becauseYouListened ? (
          <LazySection>
            <TrackShelf
              eyebrow="Because you listened to"
              title={becauseYouListened.artistName}
              tracks={visible(becauseYouListened.songs)}
            />
          </LazySection>
        ) : null}

        {showPlaylists ? (
          <LazySection>
            <PlaylistShelf
              eyebrow="Rest and worship"
              title="Sabbath worship picks"
              to="/library"
              playlists={sabbathWorship}
            />
          </LazySection>
        ) : null}

        <LazySection>
          <TrackShelf title="Sermons for you" to="/sermons" tracks={visible(sermons)} />
        </LazySection>

        {trendingInRegion ? (
          <LazySection>
            <TrackShelf
              eyebrow="Trending in"
              title={trendingInRegion.label}
              to="/discover"
              tracks={visible(trendingInRegion.songs)}
            />
          </LazySection>
        ) : null}
      </div>
    </div>
  )
}
