import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Play } from 'lucide-react'
import { PlaylistCard } from '../components/PlaylistCard'
import { SectionRow } from '../components/SectionRow'
import { SongRow } from '../components/SongRow'
import { LazySection } from '../components/LazySection'
import {
  playlists,
  recentlyPlayedIds,
  resolvePlaylist,
  songs,
  sermonTracks,
  getSongsByIds,
} from '../data/mockData'
import { enrichSongCatalog, getRecommendations } from '../utils/getRecommendations'
import { greetingLabel, getGreetingPeriod } from '../utils/timeGreeting'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useAuthStore } from '../store/useAuthStore'

/** Catalogue-wide “trending” — popularity from mock metadata, sorted deterministically. */
const TRENDING_NOW_SONGS = (() => {
  const enriched = enrichSongCatalog(songs)
  return [...enriched]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 18)
})()

/** Playlists scored by Sabbath / worship keywords + a small id boost — not random. */
const SABBATH_WORSHIP_PLAYLISTS = (() => {
  const ranked = playlists
    .map((p) => {
      const text = `${p.title} ${p.description || ''}`.toLowerCase()
      let score = 0
      if (/\bsabbath\b/.test(text)) score += 4
      if (/\bworship\b|\bhymn\b|\bpraise\b|\bquiet\b|\brest\b/.test(text))
        score += 2
      if (p.id === 'p1' || p.id === 'p3' || p.id === 'p4') score += 1
      return { p, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  const resolved = ranked.map(({ p }) => resolvePlaylist(p))
  if (resolved.length > 0) return resolved.slice(0, 8)
  return ['p1', 'p3', 'p4']
    .map((id) => playlists.find((p) => p.id === id))
    .filter(Boolean)
    .map(resolvePlaylist)
})()

function SongScrollCard({ song, index, queue }) {
  return (
    <div className="w-[min(100%,min(90vw,340px))] shrink-0 snap-start scroll-ml-1">
      <div className="rounded-2xl bg-[var(--aw-surface)] p-2 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        <SongRow
          song={song}
          index={index}
          queue={queue}
          showIndex={false}
        />
      </div>
    </div>
  )
}

export function Home() {
  const { search } = useOutletContext() || { search: '' }
  const playQueue = usePlayerStore((s) => s.playQueue)
  const recentTrackIds = useLibraryStore((s) => s.recentTrackIds)
  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const savedSermonIds = useLibraryStore((s) => s.savedSermonIds)
  const followedArtistNames = useLibraryStore((s) => s.followedArtistNames)
  const userPlaylists = useLibraryStore((s) => s.userPlaylists)
  const user = useAuthStore((s) => s.user)

  const greeting = greetingLabel(getGreetingPeriod())
  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] || ''

  const recent = useMemo(() => {
    const ids =
      recentTrackIds.length > 0 ? recentTrackIds : recentlyPlayedIds
    return getSongsByIds(ids.slice(0, 14))
  }, [recentTrackIds])

  const {
    recommendedSongs,
    recommendedPlaylists,
  } = useMemo(() => {
    const forScoring = [...userPlaylists, ...playlists]
    return getRecommendations(
      { likedSongIds, recentTrackIds, followedArtistNames },
      songs,
      forScoring,
    )
  }, [likedSongIds, recentTrackIds, followedArtistNames, userPlaylists])

  const fromFollowedArtists = useMemo(() => {
    if (!followedArtistNames.length) return []
    const set = new Set(followedArtistNames)
    return songs.filter((s) => set.has(s.artist)).slice(0, 16)
  }, [followedArtistNames])

  const sermonsForYou = useMemo(() => {
    const saved = new Set(savedSermonIds)
    return [...sermonTracks].sort((a, b) => {
      const pa = saved.has(a.id) ? 1 : 0
      const pb = saved.has(b.id) ? 1 : 0
      if (pb !== pa) return pb - pa
      return (b.duration ?? 0) - (a.duration ?? 0)
    })
  }, [savedSermonIds])

  const q = search.trim().toLowerCase()
  const filterSongs = (list) =>
    !q
      ? list
      : list.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q),
        )

  const heroTitle = firstName
    ? `${greeting}, ${firstName}`
    : greeting

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
              onClick={() => playQueue(songs, 0)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--aw-primary)]/30 transition hover:bg-[var(--aw-primary-hover)]"
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

      <SectionRow
        title="Recently played"
        subtitle="Pick up where you left off — ordered by your latest starts."
        to="/history"
      >
        {filterSongs(recent).map((song, i) => (
          <SongScrollCard
            key={song.id}
            song={song}
            index={i}
            queue={filterSongs(recent)}
          />
        ))}
      </SectionRow>

      <LazySection>
        <SectionRow
          title="Recommended for you"
          subtitle="From your likes, history, and follows — scored in the app, not random."
          to="/browse"
        >
          {recommendedSongs.map((song, i) => (
            <SongScrollCard
              key={song.id}
              song={song}
              index={i}
              queue={recommendedSongs}
            />
          ))}
          {recommendedPlaylists.map((pl) => {
            const resolved = resolvePlaylist(pl)
            return (
              <div
                key={resolved.id}
                className="w-[min(100%,220px)] shrink-0 snap-start scroll-ml-1"
              >
                <PlaylistCard playlist={resolved} songs={resolved.songs} />
              </div>
            )
          })}
        </SectionRow>
      </LazySection>

      <LazySection>
        <SectionRow
          title="Trending now"
          subtitle="Most popular tracks in the catalogue right now — by mock listen data."
          to="/discover"
        >
          {filterSongs(TRENDING_NOW_SONGS).map((song, i) => (
            <SongScrollCard
              key={song.id}
              song={song}
              index={i}
              queue={filterSongs(TRENDING_NOW_SONGS)}
            />
          ))}
        </SectionRow>
      </LazySection>

      <LazySection>
        <SectionRow
          title="From artists you follow"
          subtitle={
            fromFollowedArtists.length
              ? 'Songs from artists in your library.'
              : 'Follow artists on their pages to fill this rail.'
          }
          to={fromFollowedArtists.length ? '/followed-artists' : '/discover'}
        >
          {fromFollowedArtists.length > 0 ? (
            filterSongs(fromFollowedArtists).map((song, i) => (
              <SongScrollCard
                key={song.id}
                song={song}
                index={i}
                queue={filterSongs(fromFollowedArtists)}
              />
            ))
          ) : (
            <div className="min-w-0 flex-1 rounded-2xl border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)]/80 px-6 py-10 text-center text-sm text-[var(--aw-muted)]">
              Your followed artists will appear here.{' '}
              <Link
                to="/discover"
                className="font-medium text-[var(--aw-primary)] hover:underline"
              >
                Discover artists
              </Link>
            </div>
          )}
        </SectionRow>
      </LazySection>

      <LazySection>
        <SectionRow
          title="Sabbath worship picks"
          subtitle="Playlists scored for Sabbath rest, worship, and calm focus — curated by title & description."
          to="/library"
        >
          {SABBATH_WORSHIP_PLAYLISTS.map((pl) => (
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
        <SectionRow
          title="Sermons for you"
          subtitle={
            savedSermonIds.length
              ? 'Saved sermons first, then the rest of the catalogue.'
              : 'Heart sermons to pin them here — otherwise sorted by length.'
          }
          to="/sermons"
        >
          {filterSongs(sermonsForYou).map((song, i) => (
            <div
              key={song.id}
              className="w-[min(100%,min(90vw,340px))] shrink-0 snap-start scroll-ml-1"
            >
              <div className="rounded-2xl bg-[var(--aw-surface)] p-2 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                <SongRow
                  song={song}
                  index={i}
                  queue={filterSongs(sermonsForYou)}
                  showAlbum
                  showIndex={false}
                />
              </div>
            </div>
          ))}
        </SectionRow>
      </LazySection>
    </div>
  )
}
