import { useSyncExternalStore } from 'react'
import { Check, MoonStar } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { isSleepTimerActive, useSleepTimerStore } from '../store/useSleepTimerStore'
import { useToastStore } from '../store/useToastStore'
import { formatDuration } from '../utils/format'
import { itemNoun } from '../utils/longForm'
import { PlayerPopover, PopoverItem } from './PlayerPopover'

const MINUTE_OPTIONS = [5, 15, 30, 45, 60]

function minutesLabel(m) {
  return m === 60 ? '1 hour' : `${m} minutes`
}

function subscribeClock(onTick) {
  const t = setInterval(onTick, 1000)
  return () => clearInterval(t)
}
const subscribeNever = () => () => {}
const currentSecond = () => Math.floor(Date.now() / 1000)
const zero = () => 0

/** The current epoch second, re-rendering once a second while `enabled`, for the countdown. */
function useNowSec(enabled) {
  return useSyncExternalStore(enabled ? subscribeClock : subscribeNever, enabled ? currentSecond : zero)
}

export function SleepTimerButton({ placement = 'up', className = '' }) {
  const endsAt = useSleepTimerStore((s) => s.endsAt)
  const endOfItem = useSleepTimerStore((s) => s.endOfItem)
  const active = useSleepTimerStore(isSleepTimerActive)
  const setMinutes = useSleepTimerStore((s) => s.setMinutes)
  const setEndOfItem = useSleepTimerStore((s) => s.setEndOfItem)
  const cancel = useSleepTimerStore((s) => s.cancel)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const showToast = useToastStore((s) => s.showToast)

  const nowSec = useNowSec(endsAt != null)
  const leftSec = endsAt != null ? Math.max(0, endsAt / 1000 - nowSec) : 0
  const noun = itemNoun(currentSong)

  const label = endsAt != null
    ? `Sleep timer, ${formatDuration(leftSec)} left`
    : endOfItem
      ? `Sleep timer, stops at the end of this ${noun}`
      : 'Sleep timer'

  return (
    <PlayerPopover
      label={label}
      active={active}
      placement={placement}
      className={className}
      trigger={
        <>
          <MoonStar className="size-5" />
          {endsAt != null ? (
            <span className="hidden text-xs tabular-nums lg:inline">{formatDuration(leftSec)}</span>
          ) : null}
        </>
      }
    >
      {(close) => (
        <>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--aw-muted)]">
            {endsAt != null ? `Sleep timer · ${formatDuration(leftSec)} left` : 'Sleep timer'}
          </p>
          {MINUTE_OPTIONS.map((m) => (
            <PopoverItem
              key={m}
              checked={false}
              onSelect={() => {
                setMinutes(m)
                close()
                showToast(`Playback will stop in ${minutesLabel(m)}`)
              }}
            >
              {minutesLabel(m)}
            </PopoverItem>
          ))}
          <PopoverItem
            checked={endOfItem}
            onSelect={() => {
              setEndOfItem()
              close()
              showToast(`Playback will stop at the end of this ${noun}`)
            }}
          >
            <span>End of this {noun}</span>
            {endOfItem ? <Check className="size-4" /> : null}
          </PopoverItem>
          {active ? (
            <>
              <div className="my-1 border-t border-[var(--aw-border)]" />
              <PopoverItem
                checked={null}
                tone="danger"
                onSelect={() => {
                  cancel()
                  close()
                  showToast('Sleep timer off')
                }}
              >
                Turn off timer
              </PopoverItem>
            </>
          ) : null}
        </>
      )}
    </PlayerPopover>
  )
}
