import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlayerStore } from '../store/usePlayerStore'
import { PlaylistCardMenu } from './PlaylistCardMenu'

export function PlaylistCard({
  playlist,
  songs,
  className = '',
  showCardMenu = true,
}) {
  const playSong = usePlayerStore((s) => s.playSong)

  const onPlay = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!songs?.length) return
    playSong(songs[0], songs)
  }

  const canPlay = Boolean(songs?.length)

  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className={`aw-card-lift group relative block overflow-hidden rounded-2xl bg-[var(--aw-surface)] shadow-[var(--aw-shadow-card)] ring-1 ring-black/[0.04] hover:shadow-[var(--aw-shadow-hover)] dark:ring-white/10 ${className}`}
    >
      <div className="relative aspect-square overflow-hidden">
        {showCardMenu ? (
          <PlaylistCardMenu playlistId={playlist.id} songs={songs} />
        ) : null}
        <img
          src={playlist.cover}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
        <button
          type="button"
          onClick={onPlay}
          disabled={!canPlay}
          className="absolute bottom-3 right-3 flex size-12 translate-y-2 items-center justify-center rounded-full bg-[var(--aw-primary)] text-white opacity-0 shadow-lg transition duration-300 hover:scale-110 hover:bg-[var(--aw-primary-hover)] active:scale-95 enabled:group-hover:translate-y-0 enabled:group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Play playlist"
        >
          <Play className="size-5 translate-x-0.5 fill-current" />
        </button>
      </div>
      <div className="p-4 text-left">
        <p className="line-clamp-1 font-semibold text-[var(--aw-text)]">
          {playlist.title}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--aw-muted)]">
          {playlist.description}
        </p>
      </div>
    </Link>
  )
}
