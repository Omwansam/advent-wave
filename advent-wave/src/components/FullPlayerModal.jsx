import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { useUiStore } from '../store/useUiStore'
import { formatDuration } from '../utils/format'
import { isLongForm } from '../utils/longForm'
import { LikeButton } from './LikeButton'
import { ChaptersPanel } from './ChaptersPanel'
import { LyricsPanel } from './LyricsPanel'
import { PlaybackSpeedButton } from './PlaybackSpeedButton'
import { SleepTimerButton } from './SleepTimerButton'

export function FullPlayerModal({ audioRef }) {
  const localProgressRef = useRef(null)
  const setOpen = useUiStore((s) => s.setFullPlayerOpen)
  const open = useUiStore((s) => s.fullPlayerOpen)

  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const buffering = usePlayerStore((s) => s.buffering)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const nextSong = usePlayerStore((s) => s.nextSong)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const toggleQueuePanel = usePlayerStore((s) => s.toggleQueuePanel)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const seek = usePlayerStore((s) => s.seek)

  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const toggleLike = useLibraryStore((s) => s.toggleLike)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.code === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open || !currentSong) return null

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0
  // The track carries its own album id and title; no catalogue lookup needed.
  const album = currentSong.albumId
    ? { id: currentSong.albumId, title: currentSong.album }
    : null
  const liked = likedSongIds.includes(currentSong.id)

  const onSeekPointer = (e) => {
    const el = localProgressRef.current
    const a = audioRef.current
    if (!el || !a || !duration) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const t = (x / rect.width) * duration
    a.currentTime = t
    seek(t)
  }

  const seekTo = (t) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = t
    seek(t)
  }

  const onPrev = () => {
    const a = audioRef.current
    if (a && a.currentTime > 3) {
      a.currentTime = 0
      setCurrentTime(0)
      return
    }
    const moved = usePlayerStore.getState().prevSong()
    if (!moved && a) {
      a.currentTime = 0
      setCurrentTime(0)
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm md:left-[var(--aw-sidebar-w)]"
        aria-label="Close full player"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-x-0 bottom-0 top-14 z-[81] flex flex-col overflow-hidden rounded-t-3xl bg-gradient-to-b from-[var(--aw-surface)] to-[var(--aw-bg)] shadow-2xl md:left-[var(--aw-sidebar-w)] md:top-[3.5rem] md:rounded-none">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--aw-border)] px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-full p-2 text-[var(--aw-text)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Minimize player"
          >
            <ChevronDown className="size-6" />
          </button>
          <span className="text-sm font-medium text-[var(--aw-muted)]">
            Now playing
          </span>
          <button
            type="button"
            onClick={() => {
              toggleQueuePanel()
              setOpen(false)
            }}
            className="rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
            aria-label="Open queue"
          >
            <ListMusic className="size-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-28 pt-6 md:flex-row md:items-stretch md:gap-10 md:px-10 md:pb-10">
          <div className="mx-auto w-full max-w-sm shrink-0 md:mx-0 md:flex md:max-w-md md:flex-1 md:items-center md:justify-center">
            <img
              src={currentSong.cover}
              alt=""
              className="aspect-square w-full max-w-sm rounded-3xl object-cover shadow-2xl ring-1 ring-black/10"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col md:justify-center md:py-8">
            <h2 className="text-center text-2xl font-bold text-[var(--aw-text)] md:text-left md:text-4xl">
              {currentSong.title}
            </h2>
            <Link
              to={`/artist/${currentSong.artistId}`}
              className="mt-2 block text-center text-lg text-[var(--aw-muted)] hover:text-[var(--aw-primary)] hover:underline md:text-left"
            >
              {currentSong.artist}
            </Link>
            {album ? (
              <Link
                to={`/album/${album.id}`}
                className="mt-1 block text-center text-sm text-[var(--aw-muted)] hover:underline md:text-left"
              >
                {album.title}
              </Link>
            ) : (
              <p className="mt-1 text-center text-sm text-[var(--aw-muted)] md:text-left">
                {currentSong.album}
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-4 md:justify-start">
              <LikeButton
                liked={liked}
                onToggle={() => toggleLike(currentSong.id, currentSong.mediaType)}
                size="lg"
                className="p-3"
              />
              {/* Opens downward: this column scrolls, and an upward menu would be clipped. */}
              <PlaybackSpeedButton placement="down" />
              <SleepTimerButton placement="down" />
            </div>

            <div
              ref={localProgressRef}
              role="slider"
              tabIndex={0}
              className="mt-8 h-1.5 w-full cursor-pointer rounded-full bg-black/10 dark:bg-white/10"
              onClick={onSeekPointer}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--aw-primary)] to-[var(--aw-gold)] transition-[width] duration-200 ease-out will-change-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm tabular-nums text-[var(--aw-muted)]">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 md:justify-start">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`rounded-full p-3 ${
                  shuffle ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-muted)]'
                }`}
              >
                <Shuffle className="size-6" />
              </button>
              <button
                type="button"
                onClick={onPrev}
                className="rounded-full p-3 text-[var(--aw-text)]"
              >
                <SkipBack className="size-8" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex size-16 items-center justify-center rounded-full bg-[var(--aw-primary)] text-white shadow-xl transition duration-200 ease-out hover:scale-105 hover:bg-[var(--aw-primary-hover)] active:scale-90"
              >
                <span
                  key={isPlaying ? (buffering ? 'loading' : 'pause') : 'play'}
                  className="inline-flex aw-play-icon-swap"
                >
                  {isPlaying && buffering ? (
                    <Loader2 className="size-9 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="size-9 fill-current" />
                  ) : (
                    <Play className="size-9 translate-x-1 fill-current" />
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => nextSong()}
                className="rounded-full p-3 text-[var(--aw-text)]"
              >
                <SkipForward className="size-8" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className={`rounded-full p-3 ${
                  repeat !== 'off'
                    ? 'text-[var(--aw-primary)]'
                    : 'text-[var(--aw-muted)]'
                }`}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="size-6" />
                ) : (
                  <Repeat className="size-6" />
                )}
              </button>
            </div>

            {isLongForm(currentSong) ? (
              <ChaptersPanel track={currentSong} currentTime={currentTime} onSeek={seekTo} />
            ) : (
              <LyricsPanel track={currentSong} currentTime={currentTime} onSeek={seekTo} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
