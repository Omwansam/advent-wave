/**
 * Where the desktop app points. It is a window onto the AdventWave website, so it always runs
 * the version the server has: a release of the website reaches desktop listeners the moment it
 * deploys, and the shell itself only changes for things only a desktop app can do.
 *
 * ADVENTWAVE_URL (or --app-url=) points a run at another copy, e.g. the Vite dev server:
 *   ADVENTWAVE_URL=http://localhost:5173 npm start
 */
const { app } = require('electron');

const LIVE = 'https://adventwave.draftbitlabs.tech';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * An installed app only takes an override that points at this computer (a local test copy):
 * a crafted shortcut must not be able to open some other site in a window called AdventWave.
 */
function override() {
  const arg = process.argv.find((a) => a.startsWith('--app-url='));
  const value = arg ? arg.slice('--app-url='.length) : process.env.ADVENTWAVE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    return !app.isPackaged || LOOPBACK.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

const APP_URL = override() ?? new URL(LIVE);

module.exports = {
  APP_URL,
  APP_ORIGIN: APP_URL.origin,
  /** adventwave://album/<id> opens that page in the app. */
  PROTOCOL: 'adventwave',
  /** Appended to the user agent, so the website can tell it is inside the app (and not offer to download it). */
  UA_SUFFIX: 'AdventWaveDesktop',
  BACKGROUND: '#121118',
};
