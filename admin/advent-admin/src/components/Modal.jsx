import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * A dialog for create and edit forms. Mount it with a `key` per record so its form state
 * starts from that record instead of being synced to it.
 *
 * Rendered into document.body: the page's enter animation leaves a transform on <main>, and a
 * transformed ancestor becomes the containing block of `position: fixed`, which would clip the
 * overlay to the page instead of the viewport.
 */
export function Modal({ title, description, onClose, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`aw-page-enter relative my-8 w-full ${width} rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--aw-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-[var(--aw-muted)]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--aw-muted)] hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--aw-border)] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
