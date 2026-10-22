# AdventWave for Windows, macOS and Linux

The website (<https://adventwave.draftbitlabs.tech>) in its own window, with what a browser tab
cannot do:

- **Keeps playing when you close it.** While music plays, closing the window leaves AdventWave in
  the system tray, with Play/Pause, Next and Previous in its menu. With nothing playing, closing
  quits. On macOS the window closes and the app stays in the Dock, as Mac apps do.
- **Media keys and the system's now-playing controls**, from the website's Media Session support.
- **One window.** Launching it again brings the open one forward.
- **`adventwave://` links**: `adventwave://album/<id>` opens that album in the app.
- **Its own offline page**, which reconnects by itself.
- **Updates itself** from our server (Windows and the Linux AppImage now; macOS once signed).

It loads the live site, so every website deploy reaches desktop listeners at once; the app
itself only needs a new release when this folder changes. Same origin as the website, so the
gateway needs no CORS entry for it.

## Run it

```bash
npm ci
npx install-electron          # Electron 44 fetches its binary on demand
npm start                     # against the live site
npm run dev                   # against the website's dev server on :5173
```

## Release it

Bump `version` in `package.json`, commit, then tag the same version:

```bash
git tag desktop-v1.0.1 && git push origin desktop-v1.0.1
```

`.github/workflows/desktop-release.yml` builds the Windows installer, the macOS disk image and
the Linux AppImage and .deb on GitHub's runners (the only Windows and Mac machines we have) and
attaches them to the `desktop-v1.0.1` release. Within 15 minutes the server's `downloads`
service (`deploy/docker/desktop-sync.py`) copies them to `/srv/adventtwave/downloads`, checking
each against GitHub's digest, and the web container serves them at
<https://adventwave.draftbitlabs.tech/downloads/>. That is where the website's /download page
links and where installed apps look for updates; the file names never change, so the links
always serve the newest. To pick a release up at once: `./aw exec downloads python
/desktop-sync.py once` on the server.

Locally, `npm run dist:linux` builds the Linux packages into `dist/`. Windows needs Wine and
macOS a Mac, so those are left to the workflow.

## Signing

Builds are unsigned until certificates are added as repository secrets (Settings → Secrets and
variables → Actions). Until then, each system warns the first time; the download page says how
to get past it.

| Platform | Secrets | Where from |
|---|---|---|
| Windows | `WIN_CSC_LINK` (the .pfx, base64), `WIN_CSC_KEY_PASSWORD` | A code-signing certificate, e.g. Azure Trusted Signing or any OV/EV certificate authority |
| macOS | `MAC_CSC_LINK` (Developer ID Application .p12, base64), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | The Apple Developer Program; the app is then signed and notarized, and can update itself |

## How it is put together

| File | What |
|---|---|
| `src/main.js` | The window, tray, single instance, deep links, offline page, and the rule that nothing outside the AdventWave site opens in the app (other links go to the browser) |
| `src/preload.js` | `window.adventwaveDesktop`: the website reports what is playing and hears the tray's commands (`advent-wave/src/hooks/useDesktopBridge.js`). The page gets no Node.js |
| `src/updater.js` | electron-updater against `https://adventwave.draftbitlabs.tech/downloads/latest*.yml` |
| `electron-builder.yml` | Installers, the `adventwave://` scheme, and Electron fuses: no running as Node, no inspector, only the integrity-checked `app.asar` loads |
