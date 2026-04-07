import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { formatDuration } from '../utils/format'
import { useUiStore } from '../store/useUiStore'
import { FullPlayerModal } from './FullPlayerModal'
import { LikeButton } from './LikeButton'

export function MusicPlayer() {
  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const volumeBeforeMuteRef = useRef(0.85)

  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)

  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const nextSong = usePlayerStore((s) => s.nextSong)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const seek = usePlayerStore((s) => s.seek)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const toggleQueuePanel = usePlayerStore((s) => s.toggleQueuePanel)
  const queuePanelOpen = usePlayerStore((s) => s.queuePanelOpen)
  const setFullPlayerOpen = useUiStore((s) => s.setFullPlayerOpen)

  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const recordTrackPlay = useLibraryStore((s) => s.recordTrackPlay)

  useEffect(() => {
    if (!currentSong?.id) return
    recordTrackPlay(currentSong.id)
  }, [currentSong?.id, recordTrackPlay])

  useEffect(() => {
    const a = audioRef.current
    if (!a || !currentSong?.audioUrl) return
    a.src = currentSong.audioUrl
    a.load()
  }, [currentSong?.id, currentSong?.audioUrl])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0)
    const onEnd = () => {
      const st = usePlayerStore.getState()
      if (st.repeat === 'one') {
        a.currentTime = 0
        void a.play()
        return
      }
      usePlayerStore.getState().nextSong()
    }
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
    }
  }, [currentSong?.id, setDuration])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTimeUpdate = () => setCurrentTime(a.currentTime)
    a.addEventListener('timeupdate', onTimeUpdate)
    return () => a.removeEventListener('timeupdate', onTimeUpdate)
  }, [setCurrentTime])

  useEffect(() => {
    const a = audioRef.current
    if (!a || !currentSong) return
    if (isPlaying) {
      const p = a.play()
      if (p?.catch) p.catch(() => {})
    } else {
      a.pause()
    }
  }, [isPlaying, currentSong?.id, currentSong])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = volume
  }, [volume])

  useEffect(() => {
    if (volume > 0.001) volumeBeforeMuteRef.current = volume
  }, [volume])

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

  const onNext = () => nextSong()

  const onSeekPointer = (e) => {
    const el = progressRef.current
    const a = audioRef.current
    if (!el || !a || !duration) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const t = (x / rect.width) * duration
    a.currentTime = t
    seek(t)
  }

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      const el = document.activeElement
      const tag = el?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'BUTTON' ||
        tag === 'SELECT' ||
        el?.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      usePlayerStore.getState().togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const liked = Boolean(
    currentSong && likedSongIds.includes(currentSong.id),
  )

  return (
    <>
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <FullPlayerModal audioRef={audioRef} />

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--aw-border)] bg-[var(--aw-player-bg)]/95 shadow-[0_-8px_32px_rgba(109,93,246,0.08)] backdrop-blur-md md:left-[var(--aw-sidebar-w)]">
        {!currentSong ? (
          <div className="mx-auto flex h-[88px] max-w-[1600px] items-center justify-center px-4 text-sm text-[var(--aw-muted)]">
            Select a song to start listening
          </div>
        ) : (
          <>
            <div
              ref={progressRef}
              role="slider"
              tabIndex={0}
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration || 0)}
              className="group relative h-1 w-full cursor-pointer bg-black/5 dark:bg-white/10"
              onClick={onSeekPointer}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  const a = audioRef.current
                  if (!a) return
                  const delta = e.key === 'ArrowLeft' ? -5 : 5
                  a.currentTime = Math.max(0, a.currentTime + delta)
                  setCurrentTime(a.currentTime)
                }
              }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--aw-primary)] to-[var(--aw-gold)] transition-[width] duration-200 ease-out will-change-[width]"
                style={{ width: `${pct}%` }}
              />
              <div className="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-0 shadow-md ring-2 ring-[var(--aw-primary)] transition group-hover:opacity-100" />
            </div>

            <div className="mx-auto grid h-[88px] max-w-[1600px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 md:gap-4 md:px-6">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setFullPlayerOpen(true)}
                  className="group/art shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-primary)]"
                  title="Expand now playing"
                  aria-label="Expand now playing"
                >
                  <img
                    src={currentSong.cover}
                    alt=""
                    className={`size-12 rounded-xl object-cover shadow-md ring-1 ring-black/5 transition group-hover/art:brightness-95 md:size-14 ${
                      isPlaying
                        ? 'ring-2 ring-[var(--aw-primary)]/45 shadow-[var(--aw-primary)]/20'
                        : ''
                    }`}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--aw-text)]">
                    {currentSong.title}
                  </p>
                  <Link
                    to={`/artist/${encodeURIComponent(currentSong.artist)}`}
                    className="block truncate text-sm text-[var(--aw-muted)] transition hover:text-[var(--aw-text)] hover:underline"
                  >
                    {currentSong.artist}
                  </Link>
                </div>
                <LikeButton
                  liked={liked}
                  onToggle={() => currentSong && toggleLike(currentSong.id)}
                  size="md"
                  className="shrink-0 p-2"
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-0.5 md:gap-1">
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    className={`rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                      shuffle
                        ? 'text-[var(--aw-primary)]'
                        : 'text-[var(--aw-muted)]'
                    }`}
                    aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
                    title="Shuffle"
                  >
                    <Shuffle className="size-4 md:size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onPrev}
                    className="rounded-full p-2 text-[var(--aw-text)] transition hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Previous"
                  >
                    <SkipBack className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex size-10 items-center justify-center rounded-full bg-[var(--aw-primary)] text-white shadow-lg transition duration-200 ease-out hover:scale-105 hover:bg-[var(--aw-primary-hover)] active:scale-90"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    <span
                      key={isPlaying ? 'pause' : 'play'}
                      className="inline-flex aw-play-icon-swap"
                    >
                      {isPlaying ? (
                        <Pause className="size-5 fill-current" />
                      ) : (
                        <Play className="size-5 translate-x-0.5 fill-current" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="rounded-full p-2 text-[var(--aw-text)] transition hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Next"
                  >
                    <SkipForward className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={cycleRepeat}
                    className={`rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                      repeat !== 'off'
                        ? 'text-[var(--aw-primary)]'
                        : 'text-[var(--aw-muted)]'
                    }`}
                    aria-label={`Repeat: ${repeat}`}
                    title={`Repeat: ${repeat}`}
                  >
                    {repeat === 'one' ? (
                      <Repeat1 className="size-4 md:size-5" />
                    ) : (
                      <Repeat className="size-4 md:size-5" />
                    )}
                  </button>
                </div>
                <div className="hidden items-center gap-2 text-xs tabular-nums text-[var(--aw-muted)] md:flex">
                  <span>{formatDuration(currentTime)}</span>
                  <span>/</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-1 md:gap-2">
                <button
                  type="button"
                  onClick={() => setFullPlayerOpen(true)}
                  className="hidden rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] sm:block dark:hover:bg-white/10"
                  title="Full screen player"
                  aria-label="Full screen player"
                >
                  <Maximize2 className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleQueuePanel}
                  className={`rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10 ${
                    queuePanelOpen
                      ? 'text-[var(--aw-primary)]'
                      : 'text-[var(--aw-muted)] hover:text-[var(--aw-text)]'
                  }`}
                  aria-label="Queue"
                  title="Queue"
                >
                  <ListMusic className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (volume > 0.001) {
                      volumeBeforeMuteRef.current = volume
                      setVolume(0)
                    } else {
                      setVolume(volumeBeforeMuteRef.current || 0.85)
                    }
                  }}
                  className="hidden rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 sm:block dark:hover:bg-white/10"
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    <VolumeX className="size-5" />
                  ) : (
                    <Volume2 className="size-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="hidden h-1 w-16 max-w-full cursor-pointer accent-[var(--aw-primary)] sm:block md:w-24"
                  aria-label="Volume"
                />
              </div>
            </div>
          </>
        )}
      </footer>
    </>
  )
}
