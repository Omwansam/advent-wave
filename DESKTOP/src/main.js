const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  protocol,
  session,
  shell,
  Tray,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const { APP_ORIGIN, APP_URL, BACKGROUND, PROTOCOL, UA_SUFFIX } = require('./config');
const { startUpdater } = require('./updater');
const windowState = require('./windowState');

/**
 * AdventWave for the desktop: the website in its own window, with what a browser tab cannot
 * do — a tray icon with the player's controls, music that keeps playing when the window is
 * closed, adventwave:// links, one window however often it is launched, a proper offline page,
 * and updates of its own. Media keys and the system's now-playing panel come from the website's
 * Media Session support, which Chromium hands to the OS.
 *
 * The page is untrusted as far as this process is concerned: no Node.js, a sandboxed renderer,
 * and nothing it can navigate to outside the AdventWave origin.
 */

const ASSETS = path.join(__dirname, '..', 'assets');
const OFFLINE_FILE = path.join(__dirname, 'offline.html');
/**
 * The app's own pages are served from a private scheme rather than file://: the packaged app
 * lives in app.asar, which plain file:// cannot read once the grantFileProtocolExtraPrivileges
 * fuse is off (electron-builder.yml) — Electron's recommended setup.
 */
const SHELL_SCHEME = 'adventwave-shell';
const OFFLINE_URL = `${SHELL_SCHEME}://app/offline.html`;
protocol.registerSchemesAsPrivileged([{ scheme: SHELL_SCHEME, privileges: { standard: true, secure: true } }]);
/** Chromium's "the request was cancelled": a navigation replaced by another, not a failure. */
const ERR_ABORTED = -3;

/** @type {BrowserWindow | null} */
let win = null;
/** @type {Tray | null} */
let tray = null;
let quitting = false;
let toldAboutTray = false;
/** Where the page was when it last failed to load, to go back to on Retry. */
let lastWanted = APP_URL.toString();
/** What the website last said it was playing (null until it says, or on an older website). */
let nowPlaying = null;

/* ------------------------------------------------------------------ one instance */

if (!app.requestSingleInstanceLock()) {
  // Another AdventWave is running: it receives our arguments (a deep link, perhaps) and shows itself.
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    showWindow();
    if (link) openDeepLink(link);
  });
  start();
}

/* ------------------------------------------------------------------ links */

function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

/** adventwave://album/123?x=1 → https://<site>/album/123?x=1. Anything else is ignored. */
function deepLinkToUrl(link) {
  try {
    const url = new URL(link);
    if (url.protocol !== `${PROTOCOL}:`) return null;
    const pathname = `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return new URL(pathname + url.search, APP_URL).toString();
  } catch {
    return null;
  }
}

function openDeepLink(link) {
  const target = deepLinkToUrl(link);
  if (target) load(target);
}

/** Leaving the site — a church's website, a help page — goes to the system browser, never this window. */
function openExternally(url) {
  try {
    const { protocol } = new URL(url);
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') void shell.openExternal(url);
  } catch {
    // Not a URL: nothing to open.
  }
}

/* ------------------------------------------------------------------ the window */

function createWindow(initialUrl) {
  const state = windowState.load();
  win = new BrowserWindow({
    ...state.bounds,
    minWidth: 480,
    minHeight: 560,
    show: false,
    title: 'AdventWave',
    backgroundColor: BACKGROUND,
    icon: process.platform === 'linux' ? path.join(ASSETS, 'icon.png') : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
      // A minimised window must keep its timers: they advance the queue, crossfades and progress.
      backgroundThrottling: false,
      // Play pressed in the tray is not a click in the page; it must still be allowed to start sound.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  if (state.maximized) win.maximize();
  windowState.track(win);

  win.once('ready-to-show', () => win?.show());

  const contents = win.webContents;
  contents.setUserAgent(`${contents.getUserAgent()} ${UA_SUFFIX}/${app.getVersion()}`);

  contents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    openExternally(url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: 'deny' };
  });

  // No connection (or the server is unreachable): our own page instead of Chromium's error.
  contents.on('did-fail-load', (_event, code, _description, url, isMainFrame) => {
    if (!isMainFrame || code === ERR_ABORTED || !isAppUrl(url)) return;
    lastWanted = url;
    win?.loadURL(OFFLINE_URL).catch(() => undefined);
  });

  contents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') load(lastWanted);
  });

  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const mod = process.platform === 'darwin' ? input.meta : input.control;
    if (input.key === 'F5' || (mod && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      contents.reload();
    } else if (!app.isPackaged && mod && input.shift && input.key.toLowerCase() === 'i') {
      contents.toggleDevTools();
    }
  });

  win.on('close', (event) => {
    if (quitting) return;
    // macOS: closing the window never quits an app. Elsewhere: while music plays, close to the
    // tray so it keeps playing, as Spotify does; with nothing playing, closing quits.
    const keepRunning = process.platform === 'darwin' || (tray != null && nowPlaying?.playing === true);
    if (!keepRunning) return;
    event.preventDefault();
    win?.hide();
    if (process.platform !== 'darwin' && !toldAboutTray && Notification.isSupported()) {
      toldAboutTray = true;
      new Notification({
        title: 'AdventWave is still playing',
        body: 'It is in the system tray. Right-click the icon to pause, or Quit.',
        silent: true,
      }).show();
    }
  });

  win.on('closed', () => {
    win = null;
  });

  load(initialUrl);
}

/**
 * Every page load goes through here. A failed load (offline, server down) is reported by
 * `did-fail-load`, which shows the offline page; the rejected promise must not also become an
 * unhandled rejection, which would take the whole app down.
 */
function load(url) {
  if (!win) return;
  try {
    win.loadURL(url).catch(() => undefined);
  } catch {
    // Refused before it started (a policy, a bad URL): the window keeps what it shows.
  }
}

function showWindow() {
  if (!win) {
    createWindow(APP_URL.toString());
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function sendCommand(command) {
  win?.webContents.send('adventwave:command', command);
}

/* ------------------------------------------------------------------ tray */

function trayImage() {
  if (process.platform === 'darwin') {
    const image = nativeImage.createFromPath(path.join(ASSETS, 'trayTemplate.png'));
    image.setTemplateImage(true);
    return image;
  }
  return nativeImage.createFromPath(path.join(ASSETS, 'tray.png'));
}

function updateTray() {
  if (!tray) return;
  const playing = nowPlaying?.playing === true;
  const label = nowPlaying?.title ? `${nowPlaying.title}${nowPlaying.artist ? ` — ${nowPlaying.artist}` : ''}` : null;
  tray.setToolTip(label ? `AdventWave · ${label}` : 'AdventWave');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...(label ? [{ label: label.length > 60 ? `${label.slice(0, 59)}…` : label, enabled: false }, { type: 'separator' }] : []),
      { label: playing ? 'Pause' : 'Play', enabled: nowPlaying != null, click: () => sendCommand('toggle') },
      { label: 'Next', enabled: nowPlaying != null, click: () => sendCommand('next') },
      { label: 'Previous', enabled: nowPlaying != null, click: () => sendCommand('previous') },
      { type: 'separator' },
      { label: 'Show AdventWave', click: showWindow },
      { label: 'Quit AdventWave', click: () => app.quit() },
    ]),
  );
}

function createTray() {
  tray = new Tray(trayImage());
  tray.on('click', showWindow);
  updateTray();
}

/* ------------------------------------------------------------------ menu */

function setMenu() {
  if (process.platform !== 'darwin') {
    // Windows and Linux: no menu bar. Copy, paste and reload still work from the keyboard.
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      {
        label: 'Playback',
        submenu: [
          { label: 'Play / Pause', click: () => sendCommand('toggle') },
          { label: 'Next', accelerator: 'Cmd+Right', click: () => sendCommand('next') },
          { label: 'Previous', accelerator: 'Cmd+Left', click: () => sendCommand('previous') },
        ],
      },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  );
}

/* ------------------------------------------------------------------ the page's messages */

/** Only the AdventWave site may talk to the shell; Retry may also come from the offline page. */
function fromApp(event, { allowOfflinePage = false } = {}) {
  const url = event.senderFrame?.url ?? '';
  if (isAppUrl(url)) return true;
  return allowOfflinePage && url === OFFLINE_URL;
}

function listen() {
  ipcMain.on('adventwave:now-playing', (event, info) => {
    if (!fromApp(event)) return;
    nowPlaying = info && typeof info === 'object' ? info : null;
    updateTray();
  });
  ipcMain.on('adventwave:retry', (event) => {
    if (!fromApp(event, { allowOfflinePage: true })) return;
    load(lastWanted);
  });
}

/* ------------------------------------------------------------------ start */

function start() {
  // Register adventwave:// with the OS. In development the app is `electron .`, so the
  // registration has to name the script too.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // macOS delivers deep links as an event, possibly before the window exists.
  let pendingLink = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) ?? null;
  app.on('open-url', (event, link) => {
    event.preventDefault();
    if (win) {
      showWindow();
      openDeepLink(link);
    } else {
      pendingLink = link;
    }
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', showWindow);

  app.whenReady().then(() => {
    // The site asks for nothing but fullscreen and the clipboard (sharing a link); everything
    // else — camera, microphone, location, notifications — is refused without a prompt.
    const allowed = new Set(['fullscreen', 'clipboard-sanitized-write']);
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      callback(allowed.has(permission) && isAppUrl(contents.getURL()));
    });
    session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => {
      return allowed.has(permission) && origin === APP_ORIGIN;
    });

    protocol.handle(SHELL_SCHEME, async (request) => {
      if (new URL(request.url).pathname !== '/offline.html') return new Response('Not found', { status: 404 });
      const html = await fs.promises.readFile(OFFLINE_FILE);
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    });

    listen();
    setMenu();
    createWindow(deepLinkToUrl(pendingLink ?? '') ?? APP_URL.toString());
    pendingLink = null;
    createTray();
    startUpdater();
  });
}
