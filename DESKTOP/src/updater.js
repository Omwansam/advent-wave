const { app } = require('electron');

/**
 * Updates of the desktop shell itself, from our own server
 * (https://adventwave.draftbitlabs.tech/downloads/latest*.yml, kept current by
 * deploy/docker/desktop-sync.py). The website inside needs no update: it is always the live one.
 *
 * Downloaded quietly, installed when the app next quits, with one system notification when it
 * is ready. Skipped where it cannot work: a development run, a .deb install (apt owns that),
 * and an unsigned Mac build (macOS refuses to swap in an unsigned app).
 */
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

function updatable() {
  if (!app.isPackaged) return false;
  if (process.platform === 'linux') return Boolean(process.env.APPIMAGE);
  return true;
}

function startUpdater() {
  if (!updatable()) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (error) => {
    // Offline, rate-limited by GitHub, or an unsigned Mac build: try again next time.
    console.warn('[updater]', error?.message ?? error);
  });
  const check = () => autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  check();
  setInterval(check, CHECK_EVERY_MS).unref();
}

module.exports = { startUpdater };
