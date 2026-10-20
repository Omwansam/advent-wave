import { CircleCheck } from 'lucide-react'
import { progressStatus } from '../store/useProgressStore'
import { formatTimeLeft } from '../utils/format'

/**
 * How far into a sermon or episode the listener is: "23 min left" over a thin bar, or
 * Played. Nothing for an item not yet started — that is the default and needs no label.
 *
 * @param {{ track: { duration?: number }, progress?: import('../store/useProgressStore').Progress }} props
 */
export function ListeningProgress({ track, progress }) {
  const status = progressStatus(progress)

  if (status === 'finished') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--aw-muted)]">
        <CircleCheck className="size-4 text-[var(--aw-primary)]" aria-hidden />
        Played
      </span>
    )
  }

  if (status !== 'in-progress') return null

  const duration = progress.durationSec || track.duration || 0
  const pct = duration ? Math.min(100, (progress.positionSec / duration) * 100) : 0

  return (
    <div className="flex w-24 shrink-0 flex-col items-end gap-1 md:w-28">
      <span className="text-xs tabular-nums text-[var(--aw-muted)]">
        {formatTimeLeft(duration - progress.positionSec)}
      </span>
      <div
        className="hidden h-1 w-full overflow-hidden rounded-full bg-black/10 sm:block dark:bg-white/10"
        role="progressbar"
        aria-label="Listened"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-[var(--aw-primary)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
