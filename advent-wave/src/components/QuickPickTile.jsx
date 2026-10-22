import { Link } from 'react-router-dom'
import { CardPlayButton } from './MediaCard'
import { usePlaylistPlayback } from '../hooks/usePlaylistPlayback'
import { usePlayerStore } from '../store/usePlayerStore'

/**
 * Compact tile for the grid at the top of Home: artwork flush left, bold title, play
 * control on the right. `onHover` reports the tile's tint so the page can wash its
 * background with it, the way the hovered tile colours Spotify's header.
 */
export function QuickPickTile({
  to,
  title,
  cover,
  icon: Icon,
  iconClass = '',
  tint,
  onHover,
  onPlay,
  playing = false,
  canPlay = true,
  /** A track id: its manifest is fetched when the tile is hovered or pressed (usePrefetchOnIntent). */
  prefetchId,
}) {
  const cls =
    'group relative flex h-14 items-center gap-3 overflow-hidden rounded-md bg-[var(--aw-tile)] pr-2 text-left transition-colors duration-200 hover:bg-[var(--aw-tile-hover)] md:h-16'

  const hoverProps = onHover
    ? { onMouseEnter: () => onHover(tint), onMouseLeave: () => onHover(null) }
    : {}

  const body = (
    <>
      <div className="aspect-square h-full shrink-0 overflow-hidden bg-[var(--aw-surface-elevated)] shadow-[4px_0_12px_rgba(0,0,0,0.2)]">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className={`flex size-full items-center justify-center ${iconClass}`}>
            {Icon ? <Icon className="size-6 fill-current text-white" /> : null}
          </div>
        )}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--aw-text)] md:text-[15px]">
        {title}
      </p>
      {onPlay && canPlay ? (
        // Hover-only, so it has no place on touch layouts: there the title takes the width.
        <div className="hidden shrink-0 md:block">
          <CardPlayButton size="sm" onClick={onPlay} playing={playing} />
        </div>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls} data-prefetch={prefetchId} {...hoverProps}>
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
      {...hoverProps}
    >
      {body}
    </div>
  )
}

/** Quick-pick tile for a track: the tile itself plays it, with the shelf as the queue. */
export function TrackQuickTile({ track, queue, tint, onHover }) {
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
    <QuickPickTile
      to={track.albumId ? `/album/${track.albumId}` : undefined}
      title={track.title}
      cover={track.cover}
      tint={tint}
      onHover={onHover}
      onPlay={onPlay}
      playing={active && isPlaying}
      prefetchId={track.id}
    />
  )
}

/** Quick-pick tile for a playlist: opens it; the play button starts it from the top. */
export function PlaylistQuickTile({ playlist, tint, onHover }) {
  const { onPlay, canPlay } = usePlaylistPlayback(playlist)
  return (
    <QuickPickTile
      to={`/playlist/${playlist.id}`}
      title={playlist.title}
      cover={playlist.cover}
      tint={tint}
      onHover={onHover}
      onPlay={onPlay}
      canPlay={canPlay}
    />
  )
}
