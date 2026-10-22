import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Download, Info, Laptop, Monitor, MonitorDown, Sparkles } from 'lucide-react'
import { detectPlatform, DOWNLOADS, fetchDesktopRelease, isDesktopApp } from '../utils/desktop'

const PLATFORM_ICONS = { windows: Monitor, mac: Laptop, linux: MonitorDown }

const FEATURES = [
  'Keeps playing when you close the window — controls in the system tray',
  'Your keyboard’s media keys and the system’s now-playing controls work',
  'The same account, library, queue and sermon progress as here and on your phone',
  'Opens straight into AdventWave, and keeps itself up to date',
]

/**
 * The first launch of an installer nobody has paid to sign yet: each system warns once.
 * Kept honest and short; it goes away when the builds are signed (DESKTOP/README.md).
 */
const FIRST_OPEN = {
  windows: 'If Windows shows “Windows protected your PC”, choose More info, then Run anyway.',
  mac: 'The first time, right-click AdventWave in Applications and choose Open, then Open again.',
  linux: 'For the AppImage: make it executable (right-click → Properties → Permissions, or chmod +x), then open it.',
}

const RELEASED = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

/** A download link, or — before the server has the release — the same button, switched off. */
function FileLink({ href, available, className, children }) {
  if (available) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <span aria-disabled="true" className={`${className} cursor-not-allowed opacity-50`}>
      {children}
    </span>
  )
}

/**
 * /download: AdventWave for Windows, macOS and Linux. Open to everyone — no account needed to
 * get the app — and it offers the visitor's own system first. The files are on our own server;
 * until the first release has reached it, the page says the app is on its way instead of
 * offering links that would fail.
 */
export function DownloadPage() {
  /** undefined while asking the server, null when it has no release yet. */
  const [release, setRelease] = useState(undefined)
  useEffect(() => {
    const controller = new AbortController()
    fetchDesktopRelease(controller.signal)
      .then(setRelease)
      .catch((error) => {
        if (error.name !== 'AbortError') setRelease(null)
      })
    return () => controller.abort()
  }, [])
  const available = Boolean(release)
  const has = (href) => available && release.files?.[href.split('/').pop()] != null

  const detected = detectPlatform()
  const primary = detected ? DOWNLOADS[detected] : null
  const others = Object.entries(DOWNLOADS).filter(([id]) => id !== detected)

  return (
    <div className="relative min-h-svh bg-[var(--aw-bg)] text-[var(--aw-text)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70 dark:opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% -20%, rgba(109,93,246,0.35), transparent), radial-gradient(ellipse 60% 50% at 90% 30%, rgba(201,162,39,0.18), transparent)',
        }}
      />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2" title="AdventWave home">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--aw-primary)] to-[#8b7cff] text-white shadow-lg">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">AdventWave</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--aw-muted)]! transition hover:bg-[var(--aw-surface-elevated)] hover:text-[var(--aw-text)]!"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Open in the browser
        </Link>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 pb-20">
        <section className="pt-8 text-center md:pt-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--aw-gold)]">Desktop app</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            AdventWave for your computer
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--aw-muted)] md:text-lg">
            Hymns, choirs, sermons and podcasts in their own window, playing on while you work.
          </p>

          {isDesktopApp ? (
            <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--aw-primary)]/12 px-5 py-3 text-sm font-semibold text-[var(--aw-primary)]">
              <Check className="size-4" aria-hidden />
              You’re already using the desktop app.
            </p>
          ) : primary ? (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-3">
                {primary.files.map((file, i) => (
                  <FileLink
                    key={file.href}
                    href={file.href}
                    available={has(file.href)}
                    className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-bold shadow-lg transition ${
                      i === 0
                        ? 'bg-[var(--aw-primary)] text-white! shadow-[var(--aw-primary)]/30 hover:brightness-110'
                        : 'bg-[var(--aw-surface)] text-[var(--aw-text)] ring-1 ring-[var(--aw-border)] hover:ring-[var(--aw-primary)]/50'
                    }`}
                  >
                    <Download className="size-5" aria-hidden />
                    {file.label}
                  </FileLink>
                ))}
              </div>
              <p className="text-sm text-[var(--aw-muted)]">
                {primary.detail}
                {primary.files.length === 1 ? ` · ${primary.files[0].note}` : ''}
              </p>
              <ReleaseLine release={release} />
            </div>
          ) : (
            <p className="mx-auto mt-8 max-w-md text-sm text-[var(--aw-muted)]">
              The desktop app is for Windows, macOS and Linux computers. Pick yours below — or keep listening right here
              in the browser.
            </p>
          )}
        </section>

        <section aria-labelledby="platforms" className="mt-16">
          <h2 id="platforms" className="sr-only">
            All platforms
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {(detected ? [[detected, DOWNLOADS[detected]], ...others] : Object.entries(DOWNLOADS)).map(([id, platform]) => {
              const Icon = PLATFORM_ICONS[id]
              return (
                <li
                  key={id}
                  className={`flex flex-col rounded-3xl bg-[var(--aw-surface)] p-6 shadow-[var(--aw-shadow-card)] ring-1 ${
                    id === detected ? 'ring-[var(--aw-primary)]/50' : 'ring-black/[0.05] dark:ring-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--aw-primary)]/12 text-[var(--aw-primary)]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-bold">{platform.name}</h3>
                      <p className="text-xs text-[var(--aw-muted)]">{platform.detail}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-1 flex-col gap-2">
                    {platform.files.map((file) => (
                      <FileLink
                        key={file.href}
                        href={file.href}
                        available={has(file.href)}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--aw-border)] px-4 py-3 text-sm transition hover:border-[var(--aw-primary)]/50 hover:bg-[var(--aw-primary)]/5"
                      >
                        <span>
                          <span className="block font-semibold">{file.label}</span>
                          <span className="block text-xs text-[var(--aw-muted)]">{file.note}</span>
                        </span>
                        <Download className="size-4 shrink-0 text-[var(--aw-primary)]" aria-hidden />
                      </FileLink>
                    ))}
                  </div>
                  <p className="mt-4 flex gap-2 text-xs text-[var(--aw-muted)]">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>{FIRST_OPEN[id]}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="features" className="mx-auto mt-16 max-w-3xl">
          <h2 id="features" className="text-center text-2xl font-bold">
            Why the app
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-3 rounded-2xl bg-[var(--aw-surface)] p-4 text-sm ring-1 ring-black/[0.04] dark:ring-white/10">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--aw-primary)]" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

/** "Version 1.0.0 · released 23 October 2026", or that the app is on its way. */
function ReleaseLine({ release }) {
  if (release === undefined) return null
  if (release === null) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--aw-gold)]">
        <Clock className="size-4" aria-hidden />
        The desktop app is on its way — check back soon.
      </p>
    )
  }
  const date = release.publishedAt ? new Date(release.publishedAt) : null
  return (
    <p className="text-xs text-[var(--aw-muted)]">
      Version {release.version}
      {date && !Number.isNaN(date.getTime()) ? ` · released ${RELEASED.format(date)}` : ''}
    </p>
  )
}
