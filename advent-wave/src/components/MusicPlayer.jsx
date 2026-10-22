import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ListMusic,
  Loader2,
  Maximize2,
  MicVocal,
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
import { usePlaybackSource } from '../hooks/usePlaybackSource'
import { usePlaybackReporter } from '../hooks/usePlaybackReporter'
import { useListeningProgress } from '../hooks/useListeningProgress'
import { useToastStore } from '../store/useToastStore'
import { useProgressStore } from '../store/useProgressStore'
import { useSleepTimerStore } from '../store/useSleepTimerStore'
import { formatRate, isLongForm } from '../utils/longForm'
import { peekNext, releaseElement, startPlayback } from '../utils/playback'
import { useCrossfade } from '../hooks/useCrossfade'
import { useAutoplay } from '../hooks/useAutoplay'
import { usePreloadNext } from '../hooks/usePreloadNext'
import { useMediaSession } from '../hooks/useMediaSession'
import { indexAt, useChapters, useLyrics } from '../hooks/useMediaText'
import { PlaybackSpeedButton } from './PlaybackSpeedButton'
import { SleepTimerButton } from './SleepTimerButton'

function isTyping(el) {
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el?.isContentEditable)
}

function sleepTimerFired() {
  useSleepTimerStore.getState().cancel()
  usePlayerStore.getState().setPlaying(false)
  useToastStore.getState().showToast('Sleep timer ended. Playback paused')
}

export function MusicPlayer() {
  // Two elements, so a crossfade can play the end of one song under the start of the next
  // (RFC 0004). `active` is the one that is the player — what every hook below and the full
  // player act on through audioRef; the other is idle except during a fade.
  const slotsRef = useRef([null, null])
  const setSlotA = useCallback((el) => {
    slotsRef.current[0] = el
  }, [])
  const setSlotB = useCallback((el) => {
    slotsRef.current[1] = el
  }, [])
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const audioRef = useRef(null)
  useLayoutEffect(() => {
    audioRef.current = slotsRef.current[active]
  }, [active])
  const loadedUrlsRef = useRef([null, null])
  const targetVolumeRef = useRef(0.85)
  const handoffRef = useRef(null)
  const progressRef = useRef(null)
  const volumeBeforeMuteRef = useRef(0.85)

  const currentSong = usePlayerStore((s) => s.currentSong)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const buffering = usePlayerStore((s) => s.buffering)
  const volume = usePlayerStore((s) => s.volume)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const playbackRate = usePlayerStore((s) => s.playbackRate)
  const sleepEndsAt = useSleepTimerStore((s) => s.endsAt)

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
  const nextUpId = usePlayerStore((s) => peekNext(s)?.id)
  const setFullPlayerOpen = useUiStore((s) => s.setFullPlayerOpen)

  const likedSongIds = useLibraryStore((s) => s.likedSongIds)
  const toggleLike = useLibraryStore((s) => s.toggleLike)
  const recordTrackPlay = useLibraryStore((s) => s.recordTrackPlay)

  const normalizeAudio = useUiStore((s) => s.normalizeAudio)
  const { url: streamUrl, gainFactor, error: streamError } = usePlaybackSource(currentSong?.id)

  usePlaybackReporter(audioRef, currentSong, active, handoffRef)
  useListeningProgress(audioRef, currentSong, active)
  const { fadeRef, cancel: cancelFade } = useCrossfade({ slotsRef, active, activeRef, setActive, loadedUrlsRef, targetVolumeRef, handoffRef })
  usePreloadNext({ slotsRef, active, activeRef, setActive, loadedUrlsRef, fadeRef })
  useAutoplay()
  const longForm = isLongForm(currentSong)
  const lyrics = useLyrics(currentSong)
  const chapters = useChapters(currentSong)?.data?.chapters ?? []
  const chapterIndex = indexAt(chapters, currentTime * 1000)

  useEffect(() => {
    if (!currentSong?.id) return
    recordTrackPlay(currentSong.id)
  }, [currentSong?.id, recordTrackPlay])

  // The element follows two inputs, applied together: the current track's source and whether
  // the listener wants sound. A track change sets isPlaying at once, but the source arrives
  // later, from the manifest fetch, and assigning src resets the element: it pauses and drops
  // any pending play(). Starting playback only when isPlaying flipped left a freshly picked
  // track silent behind a Pause button until Play was pressed twice.
  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return
    if (!streamUrl) {
      // The next track's manifest is on its way (or failed). The previous source must not
      // keep playing under the new title.
      a.pause()
      return
    }
    // A crossfade has already loaded this URL into this element; reloading would restart it.
    if (loadedUrlsRef.current[active] !== streamUrl) {
      // A preloaded next item becomes the player when the track changes (usePreloadNext), so a
      // URL still sitting on the other element here belongs to a track no longer coming next.
      const other = active === 0 ? 1 : 0
      if (!fadeRef.current && loadedUrlsRef.current[other]) {
        // Preloaded for a track that is not the one playing now: stop downloading it.
        releaseElement(slotsRef.current[other])
        loadedUrlsRef.current[other] = null
      }
      loadedUrlsRef.current[active] = streamUrl
      a.src = streamUrl
      a.load()
    }
    if (isPlaying) startPlayback(a)
    else {
      a.pause()
      // Pausing mid-fade stops the outgoing song too, rather than leaving it to play out alone.
      cancelFade()
    }
  }, [active, streamUrl, isPlaying, cancelFade, fadeRef])

  // A track whose manifest cannot be fetched is not playing, whatever was asked for.
  useEffect(() => {
    if (streamError) usePlayerStore.getState().setPlaying(false)
  }, [streamError])

  // "Loading" on the play buttons: wanted playing, nothing audible yet. The manifest still on its
  // way counts, and so does the element waiting for data, at the start or after a stall.
  useEffect(() => {
    usePlayerStore.getState().setBuffering(isPlaying && !streamUrl && !streamError)
  }, [isPlaying, streamUrl, streamError])

  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return undefined
    const setBuffering = usePlayerStore.getState().setBuffering
    const onWaiting = () => setBuffering(true)
    const onPlay = () => {
      if (a.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setBuffering(true)
    }
    const onSound = () => setBuffering(false)
    const events = [['waiting', onWaiting], ['play', onPlay], ['playing', onSound], ['pause', onSound], ['error', onSound]]
    events.forEach(([e, f]) => a.addEventListener(e, f))
    if (!a.paused && a.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) setBuffering(false)
    return () => events.forEach(([e, f]) => a.removeEventListener(e, f))
  }, [active])

  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return
    // After a crossfade this element loaded its metadata before it became the player.
    if (a.readyState >= 1 && Number.isFinite(a.duration)) setDuration(a.duration)
    const onMeta = () => {
      setDuration(Number.isFinite(a.duration) ? a.duration : 0)
      // A resumed session: seek to where the account stopped, once, then forget it. Only on
      // the restored track; one picked before that track finished loading starts from the top.
      const { pendingSeekSec, pendingSeekId, currentSong: song, clearPendingSeek } = usePlayerStore.getState()
      let resumed = false
      if (pendingSeekSec != null) {
        if (pendingSeekId === song?.id && pendingSeekSec > 0 && pendingSeekSec < a.duration) {
          a.currentTime = pendingSeekSec
          setCurrentTime(pendingSeekSec)
          resumed = true
        }
        clearPendingSeek()
      }
      // A sermon or episode picked up again starts where this account left it, not at the
      // top. The account's server copy above wins when it applies; it is the newer of the two.
      if (!resumed && isLongForm(song)) {
        const at = useProgressStore.getState().resumeAt(song.id)
        if (at != null && at < a.duration) {
          a.currentTime = at
          setCurrentTime(at)
        }
      }
    }
    const onEnd = () => {
      const st = usePlayerStore.getState()
      // "End of this sermon": move on to the next item, but leave it paused.
      if (useSleepTimerStore.getState().endOfItem) {
        st.nextSong()
        sleepTimerFired()
        return
      }
      if (st.repeat === 'one') {
        a.currentTime = 0
        startPlayback(a)
        return
      }
      const endedId = st.currentSong?.id
      st.nextSong()
      // Wrapping onto the same track (repeat-all over a one-song queue) changes nothing the
      // source effect watches, so restart it here.
      const next = usePlayerStore.getState()
      if (next.isPlaying && next.currentSong?.id === endedId) {
        a.currentTime = 0
        startPlayback(a)
      }
    }
    const onError = () => {
      // A source that fails to load or decode. Say so, and show it as paused rather than
      // leaving a Pause button over silence.
      if (!a.getAttribute('src') || a.error?.code === MediaError.MEDIA_ERR_ABORTED) return
      usePlayerStore.getState().setPlaying(false)
      const title = usePlayerStore.getState().currentSong?.title
      useToastStore.getState().showToast(title ? `Couldn't play "${title}"` : "Couldn't play this track")
    }
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    a.addEventListener('error', onError)
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('error', onError)
    }
  }, [active, currentSong?.id, setDuration, setCurrentTime])

  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return
    const onTimeUpdate = () => setCurrentTime(a.currentTime)
    a.addEventListener('timeupdate', onTimeUpdate)
    return () => a.removeEventListener('timeupdate', onTimeUpdate)
  }, [active, setCurrentTime])

  // normalizeAudio applies the server's per-item gain so a studio hymn and a phone recording of
  // a camp meeting play at the same loudness (plan §11.3). During a crossfade the fade owns the
  // element's volume and reads this target on every step instead.
  const volumeTarget = normalizeAudio ? volume * gainFactor : volume
  useEffect(() => {
    targetVolumeRef.current = volumeTarget
    const a = slotsRef.current[active]
    if (!a || fadeRef.current) return
    a.volume = volumeTarget
  }, [active, volumeTarget, fadeRef])

  useEffect(() => {
    if (volume > 0.001) volumeBeforeMuteRef.current = volume
  }, [volume])

  // Speed applies to sermons and podcasts; songs always play as recorded. load() resets
  // playbackRate to defaultPlaybackRate, so both are set and the next source keeps the speed.
  useEffect(() => {
    const a = slotsRef.current[active]
    if (!a) return
    const r = longForm ? playbackRate : 1
    a.defaultPlaybackRate = r
    a.playbackRate = r
  }, [active, longForm, playbackRate])

  // A timed sleep. Wall-clock, not listening time: "stop in 30 minutes" means 30 minutes.
  useEffect(() => {
    if (sleepEndsAt == null) return undefined
    const ms = sleepEndsAt - Date.now()
    if (ms <= 0) {
      sleepTimerFired()
      return undefined
    }
    const t = setTimeout(sleepTimerFired, ms)
    return () => clearTimeout(t)
  }, [sleepEndsAt])

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

  useMediaSession({ audioRef, active, currentSong, isPlaying, onPrev, onNext })

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
      const el = document.activeElement
      if (isTyping(el)) return
      if (e.code === 'Space') {
        // A focused button's own Space press is a click; do not also toggle playback.
        if (el?.tagName === 'BUTTON') return
        e.preventDefault()
        usePlayerStore.getState().togglePlay()
        return
      }
      if (e.key === '>' || e.key === '<') {
        const st = usePlayerStore.getState()
        if (!isLongForm(st.currentSong)) return
        e.preventDefault()
        const r = st.stepPlaybackRate(e.key === '>' ? 1 : -1)
        useToastStore.getState().showToast(`Speed ${formatRate(r)}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const liked = Boolean(
    currentSong && likedSongIds.includes(currentSong.id),
  )

  return (
    <>
      <audio ref={setSlotA} className="hidden" preload="metadata" />
      <audio ref={setSlotB} className="hidden" preload="metadata" />
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
              {/* Where each chapter starts. The first is at 0 and needs no mark. */}
              {duration > 0
                ? chapters.map((c) =>
                    c.startMs > 0 && c.startMs / 1000 < duration ? (
                      <span
                        key={c.startMs}
                        aria-hidden
                        className="pointer-events-none absolute top-0 h-full w-0.5 bg-[var(--aw-player-bg)]"
                        style={{ left: `${(c.startMs / 1000 / duration) * 100}%` }}
                      />
                    ) : null,
                  )
                : null}
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
                  {streamError ? (
                    <p className="truncate text-sm text-red-600 dark:text-red-400">
                      Unavailable — {streamError.message}
                    </p>
                  ) : chapterIndex >= 0 ? (
                    <p className="truncate text-sm text-[var(--aw-muted)]" title={chapters[chapterIndex].title}>
                      <span className="tabular-nums">{chapterIndex + 1}/{chapters.length}</span>
                      {' · '}
                      {chapters[chapterIndex].title}
                    </p>
                  ) : (
                    <Link
                      to={`/artist/${currentSong.artistId}`}
                      className="block truncate text-sm text-[var(--aw-muted)] transition hover:text-[var(--aw-text)] hover:underline"
                    >
                      {currentSong.artist}
                    </Link>
                  )}
                </div>
                <LikeButton
                  liked={liked}
                  onToggle={() => currentSong && toggleLike(currentSong.id, currentSong.mediaType)}
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
                    aria-busy={isPlaying && buffering}
                  >
                    <span
                      key={isPlaying ? (buffering ? 'loading' : 'pause') : 'play'}
                      className="inline-flex aw-play-icon-swap"
                    >
                      {isPlaying && buffering ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="size-5 fill-current" />
                      ) : (
                        <Play className="size-5 translate-x-0.5 fill-current" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    data-prefetch={nextUpId}
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
                {lyrics.data ? (
                  <button
                    type="button"
                    onClick={() => setFullPlayerOpen(true)}
                    className="hidden rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] sm:block dark:hover:bg-white/10"
                    aria-label="Lyrics"
                    title="Lyrics"
                  >
                    <MicVocal className="size-5" />
                  </button>
                ) : null}
                <PlaybackSpeedButton className="hidden sm:block" />
                <SleepTimerButton className="hidden sm:block" />
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
