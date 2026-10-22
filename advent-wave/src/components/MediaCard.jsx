import { Pause, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlaylistPlayback } from '../hooks/usePlaylistPlayback'
import { usePlayerStore } from '../store/usePlayerStore'

/**
 * The play control that rises out of a card's artwork on hover, and stays up while the
 * card's item is the one playing. The parent must carry the `group` class.
 */
export function CardPlayButton({
  onClick,
  playing = false,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const dims = size === 'sm' ? 'size-10' : 'size-12'
  const icon = size === 'sm' ? 'size-4' : 'size-5'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={playing ? 'Pause' : 'Play'}
      className={`flex ${dims} items-center justify-center rounded-full bg-[var(--aw-primary)] text-white shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition-all duration-300 ease-out hover:scale-105 hover:bg-[var(--aw-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        playing
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
      } ${className}`}
    >
      {playing ? (
        <Pause className={`${icon} fill-current`} />
      ) : (
        <Play className={`${icon} translate-x-0.5 fill-current`} />
      )}
    </button>
  )
}

/**
 * Shelf card: artwork, one-line title, two-line subtitle, no chrome until hovered. Links
 * to `to` when given; otherwise the whole card plays.
 */
export function MediaCard({
  to,
  title,
  subtitle,
  cover,
  round = false,
  active = false,
  playing = false,
  canPlay = true,
  onPlay,
  /** A track id: its manifest is fetched when the card is hovered or pressed (usePrefetchOnIntent). */
  prefetchId,
}) {
  const body = (
    <>
      <div className="relative">
        <img
          src={cover}
          alt=""
          loading="lazy"
          className={`aspect-square w-full bg-[var(--aw-surface-elevated)] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${
            round ? 'rounded-full' : 'rounded-md'
          }`}
        />
        {canPlay ? (
          <CardPlayButton
            onClick={onPlay}
            playing={playing}
            className="absolute bottom-2 right-2"
          />
        ) : null}
      </div>
      <p
        className={`mt-3 truncate text-[15px] font-semibold ${
          active ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-text)]'
        }`}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--aw-muted)]">
          {subtitle}
        </p>
      ) : null}
    </>
  )

  const cls =
    'group relative block w-[148px] shrink-0 snap-start rounded-lg p-3 text-left transition-colors duration-200 hover:bg-[var(--aw-card-hover)] md:w-[172px] lg:w-[184px]'

  if (to) {
    return (
      <Link to={to} className={cls} data-prefetch={prefetchId}>
        {body}
      </Link>
    )
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPlay?.(e)
        }
      }}
      className={`cursor-pointer ${cls}`}
      data-prefetch={prefetchId}
    >
      {body}
    </div>
  )
}

/** A track on a shelf. Opens the album when the track has one; the play button plays it. */
export function TrackCard({ track, queue }) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playSong = usePlayerStore((s) => s.playSong)
  const togglePlay = usePlayerStore((s) => s.togglePlay)

  const active = currentSong?.id === track.id

  const onPlay = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (active) togglePlay()
    else playSong(track, queue)
  }

  return (
    <MediaCard
      to={track.albumId ? `/album/${track.albumId}` : undefined}
      title={track.title}
      subtitle={track.mediaType === 'sermon' ? `Sermon · ${track.artist}` : track.artist}
      cover={track.cover}
      active={active}
      playing={active && isPlaying}
      onPlay={onPlay}
      prefetchId={track.id}
    />
  )
}

/** A playlist on a shelf. Opens the playlist; the play button starts it from the top. */
export function PlaylistMediaCard({ playlist }) {
  const { onPlay, canPlay } = usePlaylistPlayback(playlist)
  return (
    <MediaCard
      to={`/playlist/${playlist.id}`}
      title={playlist.title}
      subtitle={playlist.description}
      cover={playlist.cover}
      canPlay={canPlay}
      onPlay={onPlay}
    />
  )
}
