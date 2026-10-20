import { useEffect, useRef, useState } from 'react'

/**
 * A player-control button with a small menu attached. Opens upward from the bottom bar and
 * downward elsewhere. Closes on an outside click or Escape — Escape is taken in the capture
 * phase so it closes this menu without also closing the full-screen player underneath.
 *
 * @param {{ label: string, active?: boolean, placement?: 'up' | 'down',
 *           trigger: import('react').ReactNode, className?: string,
 *           children: (close: () => void) => import('react').ReactNode }} props
 */
export function PlayerPopover({ label, active = false, placement = 'up', trigger, className = '', children }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const panelPosition = placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10 ${
          active || open
            ? 'text-[var(--aw-primary)]'
            : 'text-[var(--aw-muted)] hover:text-[var(--aw-text)]'
        }`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={`absolute right-0 ${panelPosition} z-[90] w-56 overflow-hidden rounded-xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  )
}

/** One row of a PlayerPopover menu. */
export function PopoverItem({ onSelect, checked = false, tone = 'default', children }) {
  return (
    <button
      type="button"
      role={checked == null ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--aw-surface-elevated)] ${
        tone === 'danger'
          ? 'text-red-600 dark:text-red-400'
          : checked
            ? 'font-semibold text-[var(--aw-primary)]'
            : 'text-[var(--aw-text)]'
      }`}
    >
      {children}
    </button>
  )
}
