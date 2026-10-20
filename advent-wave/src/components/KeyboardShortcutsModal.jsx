import { X } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'

const ROWS = [
  ['Play / Pause', 'Space'],
  ['Sermon speed up / down', '> / <'],
  ['Sleep timer', 'Moon icon in player'],
  ['Queue', 'Click queue in player'],
  ['Full screen player', 'Click artwork or expand in bar'],
  ['Close modal / drawer', 'Escape'],
  ['Search', 'Type in top bar (live on /search), Enter'],
  ['What is new', 'Bell icon in header'],
  ['Add to playlist', '··· on any track row'],
  ['Playlist shuffle', 'Shuffle on playlist page'],
]

export function KeyboardShortcutsModal() {
  const open = useUiStore((s) => s.shortcutsOpen)
  const setOpen = useUiStore((s) => s.setShortcutsOpen)

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
        aria-labelledby="kbd-title"
        className="fixed left-1/2 top-1/2 z-[91] w-[min(100vw-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--aw-surface)] p-6 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="kbd-title"
            className="text-lg font-bold text-[var(--aw-text)]"
          >
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-[var(--aw-muted)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--aw-muted)]">
          Press ? anywhere outside a text field to open this panel.
        </p>
        <table className="mt-6 w-full text-sm">
          <tbody className="divide-y divide-[var(--aw-border)]">
            {ROWS.map(([action, key]) => (
              <tr key={action}>
                <td className="py-2.5 pr-4 text-[var(--aw-text)]">{action}</td>
                <td className="py-2.5 text-right font-mono text-xs text-[var(--aw-muted)]">
                  {key}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
