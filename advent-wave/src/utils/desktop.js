/**
 * The AdventWave desktop app (DESKTOP/ in this repository) is this website in its own window.
 * Its preload script gives the page one object, `window.adventwaveDesktop`; when it is there,
 * the site is running inside the app — so it wires the tray's controls and does not offer to
 * download what is already installed.
 */
export const desktopBridge = typeof window !== 'undefined' ? (window.adventwaveDesktop ?? null) : null

export const isDesktopApp = desktopBridge != null

/**
 * Installers are served by our own server, from the same origin as this site. GitHub's runners
 * build them (.github/workflows/desktop-release.yml); the server's `downloads` service copies
 * each release into place (deploy/docker/desktop-sync.py). Their names carry no version, so
 * these links always serve the newest (DESKTOP/electron-builder.yml).
 */
const LATEST = '/downloads'

/** What the server has: `{ tag, version, publishedAt, files }`, written by desktop-sync.py. */
const RELEASE_INFO = `${LATEST}/release.json`

/** @typedef {'windows' | 'mac' | 'linux'} DesktopPlatform */

/** @type {Record<DesktopPlatform, { name: string, detail: string, files: { label: string, href: string, note: string }[] }>} */
export const DOWNLOADS = {
  windows: {
    name: 'Windows',
    detail: 'Windows 10 and 11, 64-bit',
    files: [{ label: 'Download for Windows', href: `${LATEST}/AdventWave-Setup.exe`, note: 'Installer (.exe)' }],
  },
  mac: {
    name: 'macOS',
    detail: 'Apple silicon and Intel Macs',
    files: [{ label: 'Download for macOS', href: `${LATEST}/AdventWave.dmg`, note: 'Disk image (.dmg)' }],
  },
  linux: {
    name: 'Linux',
    detail: '64-bit',
    files: [
      { label: 'Download AppImage', href: `${LATEST}/AdventWave.AppImage`, note: 'Runs on most distributions' },
      { label: 'Download .deb', href: `${LATEST}/AdventWave.deb`, note: 'Ubuntu, Debian, Linux Mint' },
    ],
  },
}

/**
 * The visitor's computer, as far as the browser says: the newer client hints where the browser
 * has them, the user agent otherwise. Phones and tablets get null — the desktop app is not for them.
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

/**
 * The desktop release the server is serving, or null before the first one has arrived.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ version: string, publishedAt?: string, files: Record<string, number> } | null>}
 */
export async function fetchDesktopRelease(signal) {
  const response = await fetch(RELEASE_INFO, { signal, cache: 'no-cache' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`release.json: ${response.status}`)
  // A server without the file may answer with the site itself (a single-page app's fallback).
  if (!response.headers.get('content-type')?.includes('json')) return null
  const info = await response.json()
  return info && typeof info.version === 'string' ? info : null
}
