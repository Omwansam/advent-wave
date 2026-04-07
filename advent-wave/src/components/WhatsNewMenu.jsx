import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Sparkles } from 'lucide-react'

const ITEMS = [
  {
    id: 'n1',
    title: 'New: Full screen player',
    body: 'Tap artwork or expand — lyrics placeholder included.',
    to: '/',
  },
  {
    id: 'n2',
    title: 'Browse by mood',
    body: 'Discover categories tuned for worship and rest.',
    to: '/browse',
  },
  {
    id: 'n3',
    title: 'Listening history',
    body: 'Replay everything you have started recently.',
    to: '/history',
  },
]

export function WhatsNewMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-[var(--aw-muted)] transition hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
        aria-label="What is new"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--aw-primary)] ring-2 ring-[var(--aw-nav-bg)]" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-[60] mt-2 w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-2xl border border-[var(--aw-border)] bg-[var(--aw-surface)] py-2 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="flex items-center gap-2 border-b border-[var(--aw-border)] px-4 py-3">
            <Sparkles className="size-4 text-[var(--aw-gold)]" />
            <span className="text-sm font-bold text-[var(--aw-text)]">
              What is new
            </span>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1 [scrollbar-width:thin]">
            {ITEMS.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition hover:bg-[var(--aw-surface-elevated)]"
                >
                  <p className="text-sm font-semibold text-[var(--aw-text)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--aw-muted)]">
                    {item.body}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
