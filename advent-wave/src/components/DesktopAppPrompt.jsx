import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Download, Laptop, Monitor, MonitorDown, X } from 'lucide-react'
import { detectPlatform, DOWNLOADS, fetchDesktopRelease, isDesktopApp } from '../utils/desktop'

/** This browser's answer: snoozed until a time, or never again. Per browser, not per account. */
const STORAGE_KEY = 'adventwave-desktop-prompt'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
/** Let the page settle first: a dialog over a half-drawn home page reads as an error. */
const SHOW_AFTER_MS = 2500
const PLATFORM_ICONS = { windows: Monitor, mac: Laptop, linux: MonitorDown }

function dismissedNow() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return Boolean(saved?.never || (saved?.until && saved.until > Date.now()))
  } catch {
    return false
  }
}

const snoozed = () => ({ until: Date.now() + SNOOZE_MS })

function remember(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Private browsing: the prompt may come back next visit, which is harmless.
  }
}

/**
 * Invites a listener on a computer to install the desktop app: their own system first, the
 * others below, and the full /download page. Never inside the desktop app, never on a phone.
 */
export function DesktopAppPrompt() {
  const platform = isDesktopApp ? null : detectPlatform()
  const [open, setOpen] = useState(false)
  /** undefined while asking the server, null when it has no release yet. */
  const [release, setRelease] = useState(undefined)
  const firstButtonRef = useRef(null)

  useEffect(() => {
    if (!platform || dismissedNow()) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setOpen(true)
      fetchDesktopRelease(controller.signal)
        .then(setRelease)
        .catch((error) => {
          if (error.name !== 'AbortError') setRelease(null)
        })
    }, SHOW_AFTER_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [platform])

  useEffect(() => {
    if (!open) return undefined
    firstButtonRef.current?.focus()
    const onKey = (e) => {
      if (e.code !== 'Escape') return
      remember(snoozed())
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !platform) return null

  const close = (value) => {
    remember(value)
    setOpen(false)
  }
  const snooze = () => close(snoozed())
  const never = () => close({ never: true })

  const available = Boolean(release)
  const has = (href) => available && release.files?.[href.split('/').pop()] != null
  const mine = DOWNLOADS[platform]
  const others = Object.entries(DOWNLOADS).filter(([id]) => id !== platform)

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-sm"
        aria-label="Not now"
        onClick={snooze}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-prompt-title"
        className="fixed left-1/2 top-1/2 z-[86] w-[min(100vw-2rem,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-[var(--aw-surface)] shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
      >
        <div className="relative bg-gradient-to-br from-[var(--aw-primary)] to-[#3a2cb0] px-6 pb-6 pt-7 text-white">
          <button
            type="button"
            onClick={snooze}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="size-5" />
          </button>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
            <MonitorDown className="size-6" aria-hidden />
          </span>
          <h2 id="desktop-prompt-title" className="mt-4 text-2xl font-extrabold tracking-tight">
            AdventWave for your computer
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Its own window that keeps playing when you close it, with tray controls and your keyboard’s media keys.
          </p>
        </div>

        <div className="px-6 py-5">
          {release === null ? (
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--aw-gold)]">
              <Clock className="size-4" aria-hidden />
              On its way — check back soon.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {mine.files.map((file, i) => (
              <Option
                key={file.href}
                ref={i === 0 ? firstButtonRef : undefined}
                href={file.href}
                available={has(file.href)}
                primary={i === 0}
                onChosen={never}
                icon={Download}
                title={file.label}
                note={`${mine.detail} · ${file.note}`}
              />
            ))}
          </div>

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--aw-muted)]">Other options</p>
          <ul className="flex flex-col gap-1">
            {others.flatMap(([id, other]) =>
              other.files.map((file) => (
                <li key={file.href}>
                  <Option
                    href={file.href}
                    available={has(file.href)}
                    onChosen={never}
                    icon={PLATFORM_ICONS[id]}
                    title={`${other.name}${other.files.length > 1 ? ` · ${file.label.replace(/^Download /, '')}` : ''}`}
                    note={file.note}
                    compact
                  />
                </li>
              )),
            )}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--aw-border)] pt-4 text-sm">
            {/* `!`: the site's global `a { color: inherit }` would otherwise win (index.css). */}
            <Link to="/download" onClick={snooze} className="font-semibold text-[var(--aw-primary)]! hover:underline">
              See all downloads
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={never}
                className="rounded-full px-3 py-1.5 font-medium text-[var(--aw-muted)] transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]"
              >
                Don’t show again
              </button>
              <button
                type="button"
                onClick={snooze}
                className="rounded-full bg-[var(--aw-surface-elevated)] px-4 py-1.5 font-semibold text-[var(--aw-text)] transition hover:brightness-95 dark:hover:brightness-125"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** One download: a link when the server has the file, the same row switched off until then. */
function Option({ ref, href, available, primary = false, compact = false, onChosen, icon, title, note }) {
  const Glyph = icon
  const base = compact
    ? 'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition'
    : 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition'
  const tone = primary
    ? 'bg-[var(--aw-primary)] text-white! hover:brightness-110'
    : compact
      ? 'hover:bg-[var(--aw-surface-elevated)]'
      : 'ring-1 ring-[var(--aw-border)] hover:ring-[var(--aw-primary)]/50'
  const body = (
    <>
      <Glyph className={`${compact ? 'size-4' : 'size-5'} shrink-0`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold ${compact ? '' : 'text-base'}`}>{title}</span>
        <span className={`block truncate text-xs ${primary ? 'text-white/80' : 'text-[var(--aw-muted)]'}`}>{note}</span>
      </span>
    </>
  )
  if (!available) {
    return (
      <span ref={ref} tabIndex={-1} aria-disabled="true" className={`${base} ${tone} cursor-not-allowed opacity-50`}>
        {body}
      </span>
    )
  }
  return (
    <a ref={ref} href={href} onClick={onChosen} className={`${base} ${tone}`}>
      {body}
    </a>
  )
}
