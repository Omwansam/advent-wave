import { Check } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { PLAYBACK_RATES, formatRate, isLongForm } from '../utils/longForm'
import { PlayerPopover, PopoverItem } from './PlayerPopover'

/** Speed control. Shown for sermons and podcasts only — songs always play at 1×. */
export function PlaybackSpeedButton({ placement = 'up', className = '' }) {
  const currentSong = usePlayerStore((s) => s.currentSong)
  const rate = usePlayerStore((s) => s.playbackRate)
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate)

  if (!isLongForm(currentSong)) return null

  return (
    <PlayerPopover
      label={`Playback speed ${formatRate(rate)}`}
      active={rate !== 1}
      placement={placement}
      className={className}
      trigger={<span className="min-w-[2.25rem] text-sm font-semibold tabular-nums">{formatRate(rate)}</span>}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--aw-muted)]">
            Playback speed
          </p>
          {PLAYBACK_RATES.map((r) => (
            <PopoverItem
              key={r}
              checked={r === rate}
              onSelect={() => {
                setPlaybackRate(r)
                close()
              }}
            >
              <span className="tabular-nums">
                {formatRate(r)}
                {r === 1 ? <span className="ml-1 font-normal text-[var(--aw-muted)]">Normal</span> : null}
              </span>
              {r === rate ? <Check className="size-4" /> : null}
            </PopoverItem>
          ))}
        </>
      )}
    </PlayerPopover>
  )
}
