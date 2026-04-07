import { useEffect } from 'react'
import { ListMusic, Trash2, X } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { formatDuration } from '../utils/format'

export function QueueDrawer() {
  const open = usePlayerStore((s) => s.queuePanelOpen)
  const setOpen = usePlayerStore((s) => s.setQueuePanelOpen)
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const jumpToQueueIndex = usePlayerStore((s) => s.jumpToQueueIndex)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.code === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const upNextCount = Math.max(0, queue.length - currentIndex - 1)

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px] md:left-[var(--aw-sidebar-w)]"
        aria-label="Close queue"
        onClick={() => setOpen(false)}
      />
      <aside
        className="fixed bottom-[88px] right-0 top-14 z-[61] flex w-full max-w-md flex-col border-l border-[var(--aw-border)] bg-[var(--aw-surface)] shadow-2xl md:bottom-[88px]"
        role="dialog"
        aria-labelledby="queue-heading"
      >
        <div className="flex items-center justify-between border-b border-[var(--aw-border)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <ListMusic className="size-5 text-[var(--aw-primary)]" aria-hidden />
            <h2
              id="queue-heading"
              className="text-lg font-semibold text-[var(--aw-text)]"
            >
              Queue
            </h2>
            <span className="rounded-full bg-[var(--aw-surface-elevated)] px-2 py-0.5 text-xs text-[var(--aw-muted)]">
              {queue.length} tracks
            </span>
            {shuffle ? (
              <span className="rounded-full bg-[var(--aw-primary)]/15 px-2 py-0.5 text-xs font-medium text-[var(--aw-primary)]">
                Shuffle
              </span>
            ) : null}
            {repeat !== 'off' ? (
              <span className="rounded-full bg-[var(--aw-surface-elevated)] px-2 py-0.5 text-xs text-[var(--aw-muted)]">
                Repeat {repeat === 'one' ? 'one' : 'all'}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {queue.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--aw-muted)]">
              Your queue is empty. Play a playlist or use “Add to queue” on any
              track.
            </p>
          ) : (
            <ul className="space-y-1">
              {queue.map((song, i) => {
                const active = i === currentIndex
                const showNowPlayingLabel = active
                const showUpNextLabel =
                  i === currentIndex + 1 && upNextCount > 0

                return (
                  <li key={`${song.id}-${i}`}>
                    {showNowPlayingLabel ? (
                      <p className="mb-1 px-3 pt-1 text-xs font-semibold uppercase tracking-wider text-[var(--aw-primary)]">
                        Now playing
                      </p>
                    ) : null}
                    {showUpNextLabel ? (
                      <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">
                        Up next
                        {upNextCount > 1 ? (
                          <span className="font-normal text-[var(--aw-muted)]/80">
                            {' '}
                            · {upNextCount} tracks
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <div
                      className={`flex items-center gap-3 rounded-xl px-2 py-2 transition ${
                        active
                          ? 'bg-[var(--aw-primary)]/12 ring-1 ring-[var(--aw-primary)]/25'
                          : 'hover:bg-[var(--aw-surface-elevated)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => jumpToQueueIndex(i)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <img
                          src={song.cover}
                          alt=""
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${active ? 'text-[var(--aw-primary)]' : 'text-[var(--aw-text)]'}`}
                          >
                            {song.title}
                          </p>
                          <p className="truncate text-xs text-[var(--aw-muted)]">
                            {song.artist}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--aw-muted)]">
                          {formatDuration(song.duration)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(i)}
                        className="shrink-0 rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
                        aria-label="Remove from queue"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
