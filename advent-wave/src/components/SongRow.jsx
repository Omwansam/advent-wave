import { Pause, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDuration } from '../utils/format'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { SongRowMenu } from './SongRowMenu'
import { SearchHighlight } from './SearchHighlight'
import { LikeButton } from './LikeButton'

export function SongRow({
  song,
  index,
  queue,
  showAlbum = true,
  showIndex = true,
  showMenu = true,
  /** When set (user playlist page), menu offers “Remove from playlist”. */
  playlistContext = null,
  /** Highlights this string in title / artist (search UI). */
  highlightQuery = '',
  showLike = true,
  endSlot = null,
  className = '',
}) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playSong = usePlayerStore((s) => s.playSong)
  const togglePlay = usePlayerStore((s) => s.togglePlay)

  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const savedSermonIds = useLibraryStore((s) => s.savedSermonIds)
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  const active = currentSong?.id === song.id
  const playing = active && isPlaying

  const onRowClick = () => {
    playSong(song, queue)
  }

  const onPlayPause = (e) => {
    e.stopPropagation()
    if (active) togglePlay()
    else playSong(song, queue)
  }

  // The server returns the album id on the track, so no catalogue lookup is needed here.
  const albumLink = song.albumId ? { id: song.albumId } : null
  const liked =
    song.mediaType === 'sermon'
      ? savedSermonIds.includes(song.id)
      : likedSongIds.includes(song.id)

  const gridCols = showAlbum
    ? 'grid-cols-[auto_1fr_auto] md:grid-cols-[minmax(0,48px)_minmax(0,1fr)_minmax(0,1fr)_auto]'
    : 'grid-cols-[auto_1fr_auto] md:grid-cols-[minmax(0,48px)_minmax(0,1fr)_auto]'

  return (
    <div
      role="button"
      tabIndex={0}
      data-prefetch={song.id}
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onRowClick()
        }
      }}
      className={`group grid cursor-pointer ${gridCols} items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out md:gap-4 ${
        active
          ? 'bg-[var(--aw-primary)]/12 ring-1 ring-[var(--aw-primary)]/30 shadow-sm'
          : 'hover:bg-[var(--aw-surface-elevated)] hover:ring-1 hover:ring-[var(--aw-primary)]/12 hover:shadow-sm'
      } ${className}`}
    >
      <div className="relative flex h-9 w-10 shrink-0 items-center justify-center md:w-12">
        {showIndex ? (
          <>
            <span
              className={`tabular-nums transition-opacity duration-200 group-hover:opacity-0 ${active ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-muted)]'}`}
            >
              {index + 1}
            </span>
            <button
              type="button"
              onClick={onPlayPause}
              className="pointer-events-none absolute inset-0 m-auto flex size-9 scale-90 items-center justify-center rounded-full bg-[var(--aw-primary)] text-white opacity-0 shadow-md transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 hover:bg-[var(--aw-primary-hover)] active:scale-90"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="size-4 fill-current" />
              ) : (
                <Play className="size-4 translate-x-0.5 fill-current" />
              )}
            </button>
          </>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={song.cover}
            alt=""
            className="size-10 rounded-lg object-cover shadow-sm transition duration-300 will-change-transform group-hover:scale-[1.04] group-hover:shadow-md md:size-11"
          />
          {!showIndex ? (
            <button
              type="button"
              onClick={onPlayPause}
              className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--aw-primary)] text-white shadow-lg transition hover:scale-105 active:scale-90">
                {playing ? (
                  <Pause className="size-3 fill-current" />
                ) : (
                  <Play className="size-3 translate-x-0.5 fill-current" />
                )}
              </span>
            </button>
          ) : null}
        </div>
        <div className="min-w-0">
          <p
            className={`truncate font-medium ${active ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-text)]'}`}
          >
            {highlightQuery.trim() ? (
              <SearchHighlight text={song.title} query={highlightQuery} />
            ) : (
              song.title
            )}
          </p>
          <p className="truncate text-sm text-[var(--aw-muted)]">
            {highlightQuery.trim() ? (
              <SearchHighlight text={song.artist} query={highlightQuery} />
            ) : (
              song.artist
            )}
          </p>
        </div>
      </div>

      {showAlbum ? (
        albumLink ? (
          <Link
            to={`/album/${albumLink.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hidden min-w-0 truncate text-sm text-[var(--aw-muted)] hover:text-[var(--aw-primary)] hover:underline md:block"
          >
            {song.album}
          </Link>
        ) : (
          <p className="hidden min-w-0 truncate text-sm text-[var(--aw-muted)] md:block">
            {song.album}
          </p>
        )
      ) : null}

      <div className="flex items-center justify-end gap-1">
        {endSlot}
        {showMenu ? (
          <SongRowMenu song={song} playlistContext={playlistContext} />
        ) : null}
        {showLike ? (
          <LikeButton
            liked={liked}
            onToggle={() => toggleLike(song.id, song.mediaType)}
            size="sm"
            className="p-2 opacity-100"
          />
        ) : null}
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-[var(--aw-muted)]">
          {formatDuration(song.duration)}
        </span>
      </div>
    </div>
  )
}
