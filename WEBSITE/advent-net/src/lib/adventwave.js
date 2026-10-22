/**
 * The live AdventWave service this website presents: the web app, its API (`/v1`) and the desktop
 * installers (`/downloads`) are all served from one host, our own server.
 *
 * - `VITE_APP_ORIGIN` — that host. Defaults to the production one.
 * - `VITE_API_ORIGIN` — where this site asks for data. Built, it is the app's host (the gateway
 *   allows any origin on `GET /v1/site`, RFC 0008); set it to "" when the website is served
 *   behind the same proxy as `/v1`. In development it is always "": Vite proxies `/v1` and
 *   `/downloads` (vite.config.js).
 */
export const APP_ORIGIN = (import.meta.env.VITE_APP_ORIGIN || 'https://adventwave.draftbitlabs.tech').replace(/\/+$/, '')

const API_ORIGIN = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_ORIGIN ?? APP_ORIGIN).replace(/\/+$/, '')

/** A page of the web app, e.g. appUrl('/sermons'). */
export const appUrl = (path = '/') => `${APP_ORIGIN}${path}`

/** Past this the page stops waiting and shows what it shows without the answer. */
const TIMEOUT_MS = 10000
const timeoutUnless = (signal) => signal ?? AbortSignal.timeout(TIMEOUT_MS)

/**
 * The catalogue as the site shows it — totals, what is trending, sermons, curated playlists and
 * categories — or null when this server does not have `GET /v1/site` yet. The gateway keeps one
 * copy in Redis for everyone, so this is cheap to ask for. The shape is `SiteDto` in
 * contracts/openapi/adventwave.yaml.
 */
export async function fetchSite(signal) {
  const response = await fetch(`${API_ORIGIN}/v1/site`, { signal: timeoutUnless(signal), headers: { Accept: 'application/json' } })
  if (response.status === 404 || response.status === 401) return null
  if (!response.ok) throw new Error(`/v1/site: ${response.status}`)
  if (!response.headers.get('content-type')?.includes('json')) return null
  return response.json()
}

/**
 * The desktop release our server is serving: `{ tag, version, publishedAt, files }`, where
 * `files` maps each file name to its size in bytes. Written by deploy/docker/desktop-sync.py;
 * null before the first release has arrived.
 */
export async function fetchRelease(signal) {
  const response = await fetch(`${API_ORIGIN}/downloads/release.json`, { signal: timeoutUnless(signal), cache: 'no-cache' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`release.json: ${response.status}`)
  // A server without the file may answer with a single-page app's index.html instead.
  if (!response.headers.get('content-type')?.includes('json')) return null
  const info = await response.json()
  return info && typeof info.version === 'string' ? info : null
}

/**
 * Installers carry no version in their names (DESKTOP/electron-builder.yml), so these links always
 * serve the newest. They point at our server even in development: the files are never proxied.
 */
const DOWNLOADS_BASE = `${APP_ORIGIN}/downloads`

/** @typedef {'windows' | 'mac' | 'linux'} DesktopPlatform */

/** @type {Record<DesktopPlatform, { name: string, detail: string, files: { label: string, file: string, note: string }[] }>} */
export const DOWNLOADS = {
  windows: {
    name: 'Windows',
    detail: 'Windows 10 and 11, 64-bit',
    files: [{ label: 'Download for Windows', file: 'AdventWave-Setup.exe', note: 'Installer (.exe)' }],
  },
  mac: {
    name: 'macOS',
    detail: 'Apple silicon and Intel Macs',
    files: [{ label: 'Download for macOS', file: 'AdventWave.dmg', note: 'Disk image (.dmg)' }],
  },
  linux: {
    name: 'Linux',
    detail: '64-bit',
    files: [
      { label: 'Download AppImage', file: 'AdventWave.AppImage', note: 'Runs on most distributions' },
      { label: 'Download .deb', file: 'AdventWave.deb', note: 'Ubuntu, Debian, Linux Mint' },
    ],
  },
}

export const downloadUrl = (file) => `${DOWNLOADS_BASE}/${file}`

/** The update feed beside each Linux file, with its SHA-512 (README "Check the download"). */
export const LINUX_CHECKSUMS = downloadUrl('latest-linux.yml')

/**
 * The visitor's computer, as far as the browser says: client hints where the browser has them,
 * the user agent otherwise. Phones and tablets get null — the desktop app is not for them.
 *
 * @returns {DesktopPlatform | null}
 */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return null
  const hinted = navigator.userAgentData?.platform?.toLowerCase() ?? ''
  const ua = navigator.userAgent.toLowerCase()
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  const touchMac = ua.includes('macintosh') && navigator.maxTouchPoints > 1
  if (/android|iphone|ipad|ipod/.test(ua) || touchMac || navigator.userAgentData?.mobile) return null
  if (hinted.includes('win') || ua.includes('windows')) return 'windows'
  if (hinted.includes('mac') || ua.includes('mac os')) return 'mac'
  if (hinted.includes('linux') || hinted.includes('chrome os') || ua.includes('linux') || ua.includes('cros')) return 'linux'
  return null
}

const SIZE = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

/** 120730971 → "115 MB". */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number') return null
  return `${SIZE.format(bytes / (1024 * 1024))} MB`
}

const COUNT = new Intl.NumberFormat()
export const formatCount = (n) => COUNT.format(n)

/** 1872000 → "31 min", 302000 → "5 min". */
export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
