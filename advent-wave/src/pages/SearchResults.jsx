import { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Disc3, Play, SearchX, Sparkles } from 'lucide-react'
import { PlaylistCard } from '../components/PlaylistCard'
import { SongRow } from '../components/SongRow'
import { SearchHighlight } from '../components/SearchHighlight'
import { PageError, PageLoading } from '../components/PageState'
import { search as searchCatalog } from '../api'
import { useApi } from '../hooks/useApi'
import { usePlayerStore } from '../store/usePlayerStore'

/** Matches SearchResultsDto so the page can render before the first request resolves. */
const NO_RESULTS = {
  songs: [],
  sermons: [],
  podcasts: [],
  artists: [],
  albums: [],
  playlists: [],
  topResult: null,
  lyricsMatches: null,
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'sermons', label: 'Sermons' },
  { id: 'podcasts', label: 'Podcasts' },
]

function TopResultCard({ top, query, results }) {
  const playQueue = usePlayerStore((s) => s.playQueue)

  if (!top) return null

  const { type, item } = top

  if (type === 'song') {
    const idx = results.songs.findIndex((s) => s.id === item.id)
    const queue = results.songs.length ? results.songs : [item]
    const start = idx >= 0 ? idx : 0
    return (
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--aw-primary)]/20 to-[var(--aw-gold-soft)]/50 p-6 shadow-[var(--aw-shadow-card)] ring-1 ring-[var(--aw-primary)]/15">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
          Top result
        </p>
        <p className="mt-1 text-xs text-[var(--aw-muted)]">Song</p>
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <img
            src={item.cover}
            alt=""
            className="size-32 shrink-0 rounded-2xl object-cover shadow-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-[var(--aw-text)]">
              <SearchHighlight text={item.title} query={query} />
            </p>
            <p className="mt-1 text-[var(--aw-muted)]">
              <SearchHighlight text={item.artist} query={query} />
            </p>
            <button
              type="button"
              onClick={() => playQueue(queue, start)}
              data-prefetch={queue[start]?.id}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--aw-primary-hover)]"
            >
              <Play className="size-4 fill-current" />
              Play
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'sermon' || type === 'podcast') {
    const list = type === 'sermon' ? results.sermons : results.podcasts
    const idx = list.findIndex((s) => s.id === item.id)
    const queue = list.length ? list : [item]
    const start = idx >= 0 ? idx : 0
    const label = type === 'sermon' ? 'Sermon' : 'Podcast'
    return (
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--aw-gold-soft)]/40 to-[var(--aw-primary)]/15 p-6 shadow-[var(--aw-shadow-card)] ring-1 ring-[var(--aw-primary)]/15">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
          Top result
        </p>
        <p className="mt-1 text-xs text-[var(--aw-muted)]">{label}</p>
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <img
            src={item.cover}
            alt=""
            className="size-32 shrink-0 rounded-2xl object-cover shadow-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold text-[var(--aw-text)]">
              <SearchHighlight text={item.title} query={query} />
            </p>
            <p className="mt-1 text-[var(--aw-muted)]">
              <SearchHighlight text={item.artist} query={query} />
            </p>
            <button
              type="button"
              onClick={() => playQueue(queue, start)}
              data-prefetch={queue[start]?.id}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--aw-primary-hover)]"
            >
              <Play className="size-4 fill-current" />
              Play
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'playlist') {
    return (
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
          Top result
        </p>
        <p className="mb-3 text-xs text-[var(--aw-muted)]">Playlist</p>
        <div className="max-w-xs">
          <PlaylistCard
            playlist={item}
            songs={item.songs ?? []}
            showCardMenu
          />
        </div>
        <p className="mt-3 max-w-md text-sm text-[var(--aw-muted)]">
          <SearchHighlight text={item.description || ''} query={query} />
        </p>
      </div>
    )
  }

  if (type === 'album') {
    return (
      <div className="overflow-hidden rounded-3xl bg-[var(--aw-surface)] p-6 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
          Top result
        </p>
        <p className="mt-1 text-xs text-[var(--aw-muted)]">Album</p>
        <Link
          to={`/album/${item.id}`}
          className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end"
        >
          <img
            src={item.cover}
            alt=""
            className="size-32 shrink-0 rounded-2xl object-cover shadow-lg"
          />
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[var(--aw-text)]">
              <SearchHighlight text={item.title} query={query} />
            </p>
            <p className="mt-1 text-[var(--aw-muted)]">
              <SearchHighlight text={item.artist} query={query} />
            </p>
          </div>
        </Link>
      </div>
    )
  }

  if (type === 'artist') {
    return (
      <div className="overflow-hidden rounded-3xl bg-[var(--aw-surface)] p-6 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
          Top result
        </p>
        <p className="mt-1 text-xs text-[var(--aw-muted)]">Artist</p>
        <Link
          to={`/artist/${item.id}`}
          className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center"
        >
          <img
            src={item.cover}
            alt=""
            className="size-32 shrink-0 rounded-full object-cover shadow-lg ring-2 ring-[var(--aw-gold)]/25"
          />
          <p className="text-center text-2xl font-bold text-[var(--aw-text)] sm:text-left">
            <SearchHighlight text={item.name} query={query} />
          </p>
        </Link>
      </div>
    )
  }

  return null
}

export function SearchResults() {
  const { search: ctxSearch = '' } = useOutletContext() || {}
  const [params] = useSearchParams()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const query = (ctxSearch.trim() || (params.get('q') ?? '')).trim()
  const [tab, setTab] = useState('all')

  // Ranking runs on the server, ported score-for-score from searchRank.js including the
  // Kenya boost — the client no longer has a second, drifting copy of it.
  const { data, error, loading, refetch } = useApi(
    (signal) => searchCatalog(query, { signal }),
    [query],
    { enabled: query.length > 0 },
  )

  const results = data ?? NO_RESULTS
  // Songs found by a line of their words (RFC 0004), never ones already listed under Songs.
  const lyricsMatches = results.lyricsMatches ?? []
  const lyricsQueue = lyricsMatches.map((m) => m.track)

  const show = (id) => tab === 'all' || tab === id
  const searching = query.length > 0 && loading

  const hasAny =
    results.songs.length > 0 ||
    lyricsMatches.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0 ||
    results.sermons.length > 0 ||
    results.podcasts.length > 0

  const hints = [
    'worship',
    'choir',
    'kenya',
    'nairobi',
    'swahili',
    'sabbath',
    'grace',
    'sermon',
  ]

  if (!query) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center md:py-16">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[var(--aw-primary)]/10 text-[var(--aw-primary)]">
          <Sparkles className="size-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-[var(--aw-text)] md:text-3xl">
          Search AdventWave
        </h1>
        <p className="mt-3 text-[var(--aw-muted)]">
          Start typing in the bar above — results update as you type. Search
          songs, artists, albums, playlists, and sermons.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {hints.map((hint) => (
            <Link
              key={hint}
              to={`/search?q=${encodeURIComponent(hint)}`}
              className="rounded-full border border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-2 text-sm font-medium text-[var(--aw-muted)] transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              {hint}
            </Link>
          ))}
        </div>
        <Link
          to="/browse"
          className="mt-10 inline-block font-medium text-[var(--aw-primary)] hover:underline"
        >
          Browse all content
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--aw-text)] md:text-3xl">
        Results for{' '}
        <span className="text-[var(--aw-primary)]">
          <SearchHighlight text={query} query={query} />
        </span>
      </h1>
      <p className="mt-1 text-sm text-[var(--aw-muted)]">
        Exact and prefix matches are ranked first.
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-[var(--aw-primary)] text-white'
                : 'bg-[var(--aw-surface)] text-[var(--aw-muted)] ring-1 ring-[var(--aw-border)] hover:text-[var(--aw-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-8">
          <PageError error={error} onRetry={refetch} what="search results" />
        </div>
      ) : searching ? (
        <div className="mt-8">
          <PageLoading sections={2} />
        </div>
      ) : !hasAny ? (
        <div
          className="mt-16 flex flex-col items-center rounded-3xl border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)]/60 px-6 py-16 text-center"
          role="status"
        >
          <SearchX
            className="size-14 text-[var(--aw-muted)]"
            strokeWidth={1.25}
            aria-hidden
          />
          <p className="mt-6 text-xl font-semibold text-[var(--aw-text)]">
            No results found
          </p>
          <p className="mt-2 max-w-md text-[var(--aw-muted)]">
            Try another keyword, check spelling, or browse genres and playlists
            from the home and library pages.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {hints.slice(0, 5).map((hint) => (
              <Link
                key={hint}
                to={`/search?q=${encodeURIComponent(hint)}`}
                className="rounded-full bg-[var(--aw-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--aw-primary)] hover:bg-[var(--aw-primary)]/20"
              >
                {hint}
              </Link>
            ))}
          </div>
          <Link
            to="/browse"
            className="mt-8 font-medium text-[var(--aw-primary)] hover:underline"
          >
            Browse all
          </Link>
        </div>
      ) : (
        <>
          {show('all') && results.topResult ? (
            <section className="mt-10">
              <TopResultCard
                top={results.topResult}
                query={query}
                results={results}
              />
            </section>
          ) : null}

          {results.songs.length > 0 && (show('all') || tab === 'songs') ? (
            <section className="mt-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                  Songs
                </h2>
                {results.songs.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => playQueue(results.songs, 0)}
                    data-prefetch={results.songs[0]?.id}
                    className="text-sm font-semibold text-[var(--aw-primary)] hover:underline"
                  >
                    Play all
                  </button>
                ) : null}
              </div>
              <div className="mb-2 hidden grid-cols-[minmax(0,48px)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[var(--aw-border)] px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)] md:grid">
                <span>#</span>
                <span>Title</span>
                <span className="hidden md:block">Album</span>
                <span className="text-right">Time</span>
              </div>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {results.songs.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    queue={results.songs}
                    highlightQuery={query}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {lyricsMatches.length > 0 && (show('all') || tab === 'songs') ? (
            <section className="mt-12" aria-labelledby="lyrics-match-heading">
              <div className="mb-4">
                <h2 id="lyrics-match-heading" className="text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                  Lyrics match
                </h2>
                <p className="mt-1 text-sm text-[var(--aw-muted)]">Songs whose words contain “{query}”.</p>
              </div>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {lyricsMatches.map((m, i) => (
                  <div key={m.track.id}>
                    <SongRow song={m.track} index={i} queue={lyricsQueue} />
                    <p className="-mt-1 pb-2 pl-[4.25rem] pr-3 text-sm italic text-[var(--aw-muted)] md:pl-[5.25rem]">
                      “<SearchHighlight text={m.line} query={query} />”
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {results.artists.length > 0 && (show('all') || tab === 'artists') ? (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                Artists
              </h2>
              <div className="flex flex-wrap gap-4">
                {results.artists.map((a) => (
                  <Link
                    key={a.name}
                    to={`/artist/${a.id}`}
                    className="aw-card-lift flex w-[9.5rem] flex-col items-center rounded-2xl bg-[var(--aw-surface)] p-4 text-center shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] hover:ring-[var(--aw-primary)]/25 dark:ring-white/10"
                  >
                    <img
                      src={a.cover}
                      alt=""
                      className="size-28 rounded-full object-cover shadow-md ring-2 ring-[var(--aw-gold)]/20"
                    />
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--aw-text)]">
                      <SearchHighlight text={a.name} query={query} />
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.playlists.length > 0 &&
          (show('all') || tab === 'playlists') ? (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                Playlists
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.playlists.map((pl) => (
                  <PlaylistCard
                    key={pl.id}
                    playlist={pl}
                    songs={pl.songs ?? []}
                    showCardMenu
                  />
                ))}
              </div>
            </section>
          ) : null}

          {results.albums.length > 0 && (show('all') || tab === 'albums') ? (
            <section className="mt-12">
              <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                Albums
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {results.albums.map((a) => (
                  <Link
                    key={a.id}
                    to={`/album/${a.id}`}
                    className="aw-card-lift overflow-hidden rounded-2xl bg-[var(--aw-surface)] shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] hover:ring-[var(--aw-primary)]/20 dark:ring-white/10"
                  >
                    <div className="aspect-square">
                      <img
                        src={a.cover}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex items-start gap-2 p-4">
                      <Disc3 className="mt-0.5 size-4 shrink-0 text-[var(--aw-muted)]" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-[var(--aw-text)]">
                          <SearchHighlight text={a.title} query={query} />
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm text-[var(--aw-muted)]">
                          <SearchHighlight text={a.artist} query={query} />
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.sermons.length > 0 &&
          (show('all') || tab === 'sermons') ? (
            <section className="mt-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                  Sermons
                </h2>
                {results.sermons.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => playQueue(results.sermons, 0)}
                    data-prefetch={results.sermons[0]?.id}
                    className="text-sm font-semibold text-[var(--aw-primary)] hover:underline"
                  >
                    Play all
                  </button>
                ) : null}
              </div>
              <div className="mb-2 hidden grid-cols-[minmax(0,48px)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-[var(--aw-border)] px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)] md:grid">
                <span>#</span>
                <span>Title</span>
                <span className="hidden md:block">Source</span>
                <span className="text-right">Time</span>
              </div>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {results.sermons.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    queue={results.sermons}
                    highlightQuery={query}
                    showAlbum
                  />
                ))}
              </div>
            </section>
          ) : null}

          {results.podcasts.length > 0 &&
          (show('all') || tab === 'podcasts') ? (
            <section className="mt-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--aw-text)] md:text-2xl">
                  Podcasts
                </h2>
                {results.podcasts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => playQueue(results.podcasts, 0)}
                    data-prefetch={results.podcasts[0]?.id}
                    className="text-sm font-semibold text-[var(--aw-primary)] hover:underline"
                  >
                    Play all
                  </button>
                ) : null}
              </div>
              <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
                {results.podcasts.map((song, i) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={i}
                    queue={results.podcasts}
                    highlightQuery={query}
                    showAlbum
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
