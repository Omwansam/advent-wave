import { Check, Monitor, Smartphone, Speaker, X } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '../store/useUiStore'

const DEVICES = [
  {
    id: 'browser',
    label: 'This browser',
    sub: 'AdventWave Web Player',
    icon: Monitor,
  },
  {
    id: 'phone',
    label: 'Pixel · Phone',
    sub: 'AdventWave mobile (demo)',
    icon: Smartphone,
    disabled: true,
  },
  {
    id: 'speaker',
    label: 'Living room speaker',
    sub: 'Smart speaker (coming soon)',
    icon: Speaker,
    disabled: true,
  },
]

export function ConnectDeviceModal() {
  const open = useUiStore((s) => s.connectDeviceOpen)
  const setOpen = useUiStore((s) => s.setConnectDeviceOpen)
  const [activeId, setActiveId] = useState('browser')

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm md:left-[var(--aw-sidebar-w)]"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-labelledby="connect-title"
        className="fixed left-1/2 top-1/2 z-[91] w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--aw-surface)] p-6 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="connect-title"
              className="text-lg font-bold text-[var(--aw-text)]"
            >
              Connect to a device
            </h2>
            <p className="mt-1 text-sm text-[var(--aw-muted)]">
              Pick where to play — like Spotify Connect.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {DEVICES.map((d) => {
            const Icon = d.icon
            const active = activeId === d.id && !d.disabled
            return (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={d.disabled}
                  onClick={() => {
                    if (!d.disabled) setActiveId(d.id)
                  }}
                  className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${
                    d.disabled
                      ? 'cursor-not-allowed border-[var(--aw-border)] opacity-50'
                      : active
                        ? 'border-[var(--aw-primary)] bg-[var(--aw-primary)]/10'
                        : 'border-[var(--aw-border)] hover:bg-[var(--aw-surface-elevated)]'
                  }`}
                >
                  <Icon className="size-8 shrink-0 text-[var(--aw-primary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--aw-text)]">
                      {d.label}
                    </p>
                    <p className="text-xs text-[var(--aw-muted)]">{d.sub}</p>
                  </div>
                  {active ? (
                    <Check className="size-5 shrink-0 text-[var(--aw-primary)]" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 text-center text-xs text-[var(--aw-muted)]">
          Real device hand-off will use your API when you deploy.
        </p>
      </div>
    </>
  )
}
