import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Sparkles } from 'lucide-react'

/** Newest first. Give a new entry a new id: the dot shows until the newest id has been seen. */
const ITEMS = [
  {
    id: '2026-10-friends',
    title: 'Friend activity',
    body: 'Follow friends and see what they are listening to. You choose whether they see yours.',
    to: '/friends',
  },
  {
    id: '2026-10-lyrics',
    title: 'Hymn lyrics',
    body: 'Sing along: the words follow the recording, and search finds a hymn by a line you remember.',
    to: '/search',
  },
  {
    id: '2026-10-chapters',
    title: 'Sermon chapters',
    body: 'Jump straight to the scripture reading, the sermon or the appeal.',
    to: '/sermons',
  },
  {
    id: '2026-10-autoplay',
    title: 'Autoplay and crossfade',
    body: 'When your queue ends, similar songs keep playing. Crossfade blends one song into the next.',
    to: '/settings',
  },
  {
    id: '2026-10-progress',
    title: 'Pick up where you left off',
    body: 'Sermons and podcasts remember your place on every device, with a sleep timer and speed control.',
    to: '/sermons',
  },
]

const SEEN_KEY = 'adventwave-whats-new-seen'

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

export function WhatsNewMenu() {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const wrapRef = useRef(null)
  const unread = seen !== ITEMS[0].id

  const toggle = () => {
    setOpen((v) => !v)
    if (unread) {
      setSeen(ITEMS[0].id)
      try {
        localStorage.setItem(SEEN_KEY, ITEMS[0].id)
      } catch {
        // Storage blocked: the dot comes back next visit, nothing worse.
      }
    }
  }

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
        onClick={toggle}
        className="relative rounded-full p-2 text-[var(--aw-muted)] transition hover:bg-black/5 hover:text-[var(--aw-text)] dark:hover:bg-white/10"
        aria-label="What is new"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--aw-primary)] ring-2 ring-[var(--aw-nav-bg)]" />
        ) : null}
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
