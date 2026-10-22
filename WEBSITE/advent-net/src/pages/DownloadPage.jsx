import { useState } from 'react'
import { Check, Clock, Copy, Download, Info, Laptop, Monitor, MonitorDown, ShieldCheck, Smartphone } from 'lucide-react'
import { appUrl, detectPlatform, downloadUrl, DOWNLOADS, formatBytes, LINUX_CHECKSUMS } from '../lib/adventwave'
import { UNREACHABLE, useRelease } from '../lib/useLive'

const PLATFORM_ICONS = { windows: Monitor, mac: Laptop, linux: MonitorDown }

const FEATURES = [
  'Keeps playing when you close the window — controls in the system tray',
  'Your keyboard’s media keys and the system’s now-playing controls work',
  'The same account, library, queue and sermon progress as in the browser and on your phone',
  'Opens straight into AdventWave, and keeps itself up to date',
]

/**
 * The first launch of an installer nobody has paid to sign yet: each system warns once. The same
 * words as the web app's /download (advent-wave/src/pages/DownloadPage.jsx).
 */
const FIRST_OPEN = {
  windows: 'If Windows shows “Windows protected your PC”, choose More info, then Run anyway.',
  mac: 'The first time, right-click AdventWave in Applications and choose Open, then Open again.',
  linux: 'For the AppImage: make it executable (right-click → Properties → Permissions, or chmod +x), then open it.',
}

/** From the repository README, "Install on Linux". */
const LINUX_STEPS = [
  {
    title: '.deb — Ubuntu, Debian, Linux Mint',
    commands: `cd ~/Downloads
wget -c ${downloadUrl('AdventWave.deb')}
sudo apt install ./AdventWave.deb`,
    after: 'Then open AdventWave from your applications menu, or run adventwave in a terminal.',
  },
  {
    title: 'AppImage — any distribution',
    commands: `cd ~/Downloads
wget -c ${downloadUrl('AdventWave.AppImage')}
chmod +x AdventWave.AppImage
./AdventWave.AppImage`,
    after: 'It checks for new versions by itself and installs them the next time you quit.',
  },
]

const RELEASED = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * /download: AdventWave for Windows, macOS and Linux, offering the visitor's own system first.
 * The installers are on our own server; what it has now — version, date, each file's size — comes
 * from its release.json, and until a release has arrived the page says so instead of offering
 * links that would fail.
 */
export function DownloadPage() {
  /** undefined while asking the server, null when it has no release yet, UNREACHABLE when it could not be asked. */
  const release = useRelease()
  // Unreachable: offer the links anyway. The files' names never change; only the details are unknown.
  const has = (file) => release === UNREACHABLE || release?.files?.[file] != null
  const sizeOf = (file) => formatBytes(release?.files?.[file])

  const detected = detectPlatform()
  const primary = detected ? DOWNLOADS[detected] : null
  const ordered = detected
    ? [[detected, DOWNLOADS[detected]], ...Object.entries(DOWNLOADS).filter(([id]) => id !== detected)]
    : Object.entries(DOWNLOADS)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-36 sm:px-6">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-aw-gold">Desktop app</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_30px_rgba(11,9,24,0.9)] md:text-6xl">
          AdventWave for your computer
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-aw-text/85">
          Hymns, choirs, sermons and podcasts in their own window, playing on while you work.
        </p>

        {primary ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              {primary.files.map((file, i) => (
                <FileLink
                  key={file.file}
                  file={file.file}
                  available={has(file.file)}
                  className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-bold shadow-xl transition ${
                    i === 0
                      ? 'bg-aw-primary text-white shadow-aw-primary/40 hover:bg-aw-primary-hover'
                      : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
                  }`}
                >
                  <Download className="size-5" aria-hidden />
                  {file.label}
                </FileLink>
              ))}
            </div>
            <p className="text-sm text-aw-muted">
              {primary.detail}
              {primary.files.length === 1 ? ` · ${primary.files[0].note}` : ''}
              {primary.files.length === 1 && sizeOf(primary.files[0].file) ? ` · ${sizeOf(primary.files[0].file)}` : ''}
            </p>
            <ReleaseLine release={release} />
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md rounded-2xl bg-aw-ink/80 p-5 text-sm text-aw-muted ring-1 ring-white/10">
            <Smartphone className="mx-auto size-6 text-aw-violet" aria-hidden />
            <p className="mt-3">
              The desktop app is for Windows, macOS and Linux computers. On a phone, listen in the browser — the Android
              app is coming to Google Play.
            </p>
            <a href={appUrl('/')} className="mt-4 inline-block font-semibold text-aw-violet hover:text-white">
              Open AdventWave in the browser →
            </a>
            <ReleaseLine release={release} className="mt-4" />
          </div>
        )}
      </section>

      <section aria-labelledby="platforms" className="mt-20">
        <h2 id="platforms" className="sr-only">
          All platforms
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {ordered.map(([id, platform]) => {
            const Icon = PLATFORM_ICONS[id]
            return (
              <li
                key={id}
                className={`flex flex-col rounded-3xl bg-aw-ink/80 p-6 ring-1 ${
                  id === detected ? 'ring-aw-violet/60' : 'ring-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-aw-primary/15 text-aw-violet">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-bold text-white">
                      {platform.name}
                      {id === detected && <span className="ml-2 text-xs font-medium text-aw-gold">Your computer</span>}
                    </h3>
                    <p className="text-xs text-aw-muted">{platform.detail}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-1 flex-col gap-2">
                  {platform.files.map((file) => (
                    <FileLink
                      key={file.file}
                      file={file.file}
                      available={has(file.file)}
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-white/10 transition hover:bg-aw-primary/10 hover:ring-aw-violet/50"
                    >
                      <span>
                        <span className="block font-semibold text-white">{file.label}</span>
                        <span className="block text-xs text-aw-muted">
                          {file.note}
                          {sizeOf(file.file) ? ` · ${sizeOf(file.file)}` : ''}
                        </span>
                      </span>
                      <Download className="size-4 shrink-0 text-aw-violet" aria-hidden />
                    </FileLink>
                  ))}
                </div>
                <p className="mt-4 flex gap-2 text-xs text-aw-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>{FIRST_OPEN[id]}</span>
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="why" className="mx-auto mt-20 max-w-3xl">
        <h2 id="why" className="text-center text-2xl font-bold text-white md:text-3xl">
          Why the app
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex gap-3 rounded-2xl bg-aw-ink/80 p-4 text-sm text-aw-text/90 ring-1 ring-white/10">
              <Check className="mt-0.5 size-4 shrink-0 text-aw-violet" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="linux" className="mx-auto mt-20 max-w-3xl">
        <h2 id="linux" className="text-center text-2xl font-bold text-white md:text-3xl">
          Installing on Linux from a terminal
        </h2>
        <p className="mt-3 text-center text-sm text-aw-muted">
          Tested on Ubuntu 24.04. <code className="text-aw-text">wget -c</code> picks up where it left off, so on a slow
          line run the same command again until it finishes.
        </p>
        <div className="mt-6 space-y-4">
          {LINUX_STEPS.map((step) => (
            <div key={step.title} className="rounded-3xl bg-aw-ink/80 p-5 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">{step.title}</h3>
              <CommandBlock commands={step.commands} />
              <p className="mt-3 text-sm text-aw-muted">{step.after}</p>
            </div>
          ))}
          <p className="flex gap-2 rounded-2xl p-4 text-sm text-aw-muted ring-1 ring-white/10">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-aw-gold" aria-hidden />
            <span>
              The server publishes the SHA-512 of every Linux file in{' '}
              <a className="font-semibold text-aw-violet hover:text-white" href={LINUX_CHECKSUMS}>
                latest-linux.yml
              </a>
              . Compare yours with <code className="text-aw-text">openssl dgst -sha512 -binary AdventWave.deb | base64 -w0</code>.
            </span>
          </p>
        </div>
      </section>
    </div>
  )
}

/** A download link, or — before the server has the file — the same button, switched off. */
function FileLink({ file, available, className, children }) {
  if (available) {
    return (
      <a href={downloadUrl(file)} className={className}>
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

/** "Version 1.0.0 · released 22 October 2026", or that the app is on its way. */
function ReleaseLine({ release, className = '' }) {
  if (release === undefined || release === UNREACHABLE) return null
  if (release === null) {
    return (
      <p className={`inline-flex items-center gap-2 text-sm font-semibold text-aw-gold ${className}`}>
        <Clock className="size-4" aria-hidden />
        The desktop app is on its way — check back soon.
      </p>
    )
  }
  const date = release.publishedAt ? new Date(release.publishedAt) : null
  return (
    <p className={`text-xs text-aw-muted ${className}`}>
      Version {release.version}
      {date && !Number.isNaN(date.getTime()) ? ` · released ${RELEASED.format(date)}` : ''}
    </p>
  )
}

function CommandBlock({ commands }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(commands).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-2xl bg-black/50 p-4 pr-14 font-mono text-[13px] leading-relaxed text-aw-lavender">
        <code>{commands}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-xl text-aw-muted ring-1 ring-white/10 transition hover:text-white"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span className="sr-only">{copied ? 'Copied' : 'Copy commands'}</span>
      </button>
    </div>
  )
}
