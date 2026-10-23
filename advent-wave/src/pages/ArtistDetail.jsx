import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Church, ExternalLink, MapPin, Play, UserCheck, UserPlus } from 'lucide-react'
import { ProfileShelf } from '../components/ProfileCard'
import { SongRow } from '../components/SongRow'
import { PageError, PageLoading, PageNotFound } from '../components/PageState'
import { getArtist } from '../api'
import { useApi } from '../hooks/useApi'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useToastStore } from '../store/useToastStore'
import { kindLabel } from '../utils/profile'

const COUNT = new Intl.NumberFormat()

/** How many of a section's rows show before "See more". */
const FIRST_ROWS = 5

/**
 * /artist/:id — any profile (RFC 0009). A church plays its own recordings and its choirs', and
 * lists those choirs; a choir links to its church and to its sister choirs there; an independent
 * one gets profiles like it. Songs, sermons and podcasts are listed apart.
 */
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

  if (loading) return <PageLoading sections={3} />
  if (error?.isNotFound) return <PageNotFound what="This profile was not found." />
  if (error) return <PageError error={error} onRetry={refetch} what="this profile" />
  if (!artist) return null

  const tracks = artist.tracks ?? []
  const songs = tracks.filter((t) => t.mediaType === 'song')
  const sermons = tracks.filter((t) => t.mediaType === 'sermon')
  const podcasts = tracks.filter((t) => t.mediaType === 'podcast')
  const following = followedArtistIds.includes(artist.id)
  const isChurch = artist.kind === 'church'
  const conference = artist.conference

  return (
    <div>
      <Link
        to="/choirs"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--aw-muted)] transition hover:text-[var(--aw-primary)]"
      >
        <ArrowLeft className="size-4" />
        Choirs & churches
      </Link>

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-t from-[var(--aw-bg)] via-[var(--aw-primary)]/15 to-[var(--aw-gold)]/20 p-8 md:p-12">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
          <img
            src={artist.cover}
            alt=""
            className="size-40 shrink-0 rounded-full bg-[var(--aw-surface-elevated)] object-cover shadow-2xl ring-4 ring-white/50 dark:ring-white/10 md:size-48"
          />
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
              {artist.verified ? <BadgeCheck className="size-4 text-[var(--aw-primary)]" aria-label="Verified" /> : null}
              {kindLabel(artist)}
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[var(--aw-text)] md:text-6xl">{artist.name}</h1>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[var(--aw-muted)] md:justify-start">
              {artist.church ? (
                <Link to={`/artist/${artist.church.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--aw-text)] hover:underline">
                  <Church className="size-4" aria-hidden />
                  {artist.church.name}
                </Link>
              ) : null}
              {conference ? (
                <Link to={`/choirs?conference=${encodeURIComponent(conference.id)}`} className="hover:underline">
                  {conference.name}
                  {conference.union ? ` · ${conference.union.shortName ?? conference.union.name}` : ''}
                </Link>
              ) : null}
              {artist.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {artist.location}
                </span>
              ) : null}
              {artist.followers != null ? (
                <span>
                  {COUNT.format(artist.followers)} follower{artist.followers === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                disabled={!tracks.length}
                onClick={() => playQueue(tracks, 0)}
                data-prefetch={tracks[0]?.id}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)] px-8 py-3 text-sm font-bold text-white shadow-xl shadow-[var(--aw-primary)]/30 transition enabled:hover:scale-[1.02] enabled:hover:bg-[var(--aw-primary-hover)] disabled:opacity-50"
              >
                <Play className="size-5 fill-current" />
                Play
              </button>
              <button
                type="button"
                onClick={() => {
                  const willFollow = !following
                  toggleFollowArtist(artist.id, artist.name)
                  showToast(willFollow ? `Following ${artist.name}` : `Unfollowed ${artist.name}`)
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition ${
                  following
                    ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10 text-[var(--aw-primary)]'
                    : 'border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)]/40'
                }`}
              >
                {following ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
                {following ? 'Following' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-10 space-y-10">
        <TrackSection title={isChurch ? 'Popular songs' : 'Popular'} tracks={songs} />
        <TrackSection title="Sermons" tracks={sermons} />
        <TrackSection title="Podcasts" tracks={podcasts} />

        {!tracks.length ? (
          <p className="rounded-2xl bg-[var(--aw-surface)] p-6 text-sm text-[var(--aw-muted)] ring-1 ring-black/[0.04] dark:ring-white/10">
            Nothing to hear here yet — recordings appear as soon as they are published.
          </p>
        ) : null}

        {isChurch ? <ProfileShelf title="Choirs and ministries" profiles={artist.members} /> : null}

        <ProfileShelf
          title={artist.church ? `More from ${artist.church.name}` : 'More like this'}
          to={artist.church ? `/artist/${artist.church.id}` : undefined}
          profiles={artist.related}
        />

        <About artist={artist} />
      </div>
    </div>
  )
}

function TrackSection({ title, tracks }) {
  const [expanded, setExpanded] = useState(false)
  if (!tracks.length) return null
  const shown = expanded ? tracks : tracks.slice(0, FIRST_ROWS)
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)]">{title}</h2>
      <div className="space-y-1 rounded-2xl bg-[var(--aw-surface)] p-3 shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] dark:ring-white/10">
        {shown.map((song, i) => (
          <SongRow key={song.id} song={song} index={i} queue={tracks} />
        ))}
      </div>
      {tracks.length > FIRST_ROWS ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 text-sm font-semibold text-[var(--aw-muted)] transition hover:text-[var(--aw-text)]"
        >
          {expanded ? 'Show less' : `See ${tracks.length - FIRST_ROWS} more`}
        </button>
      ) : null}
    </section>
  )
}

/** Bio, where the profile is, and its conference's website when the directory has one. */
function About({ artist }) {
  const conference = artist.conference
  if (!artist.bio && !conference && !artist.location) return null
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-[var(--aw-text)]">About</h2>
      <div className="space-y-3 rounded-2xl bg-[var(--aw-surface)] p-6 text-sm text-[var(--aw-muted)] ring-1 ring-black/[0.04] dark:ring-white/10">
        {artist.bio ? <p className="whitespace-pre-line text-[var(--aw-text)]">{artist.bio}</p> : null}
        {conference ? (
          <p>
            Part of <span className="font-semibold text-[var(--aw-text)]">{conference.name}</span>
            {conference.union ? `, ${conference.union.name}` : ''}
            {conference.headquarters ? ` — headquarters ${conference.headquarters}` : ''}.
            {conference.website ? (
              <>
                {' '}
                <a
                  href={conference.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--aw-primary)] hover:underline"
                >
                  Website
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  )
}
