# AdventWave

Hymns, choirs, sermons and podcasts from Seventh-day Adventist churches — in the browser, on
your computer and on your phone, with one account.

- **Web:** <https://adventwave.draftbitlabs.tech>
- **Desktop (Windows, macOS, Linux):** <https://adventwave.draftbitlabs.tech/download>
- **Android:** coming to Google Play

## Install on Linux

The desktop app is downloaded from AdventWave's own server (tested on Ubuntu 24.04). Pick one:

| | For | File |
|---|---|---|
| **.deb** (recommended) | Ubuntu, Debian, Linux Mint, Pop!_OS, elementary OS | [AdventWave.deb](https://adventwave.draftbitlabs.tech/downloads/AdventWave.deb) |
| **AppImage** | Any 64-bit distribution; nothing to install, and it updates itself | [AdventWave.AppImage](https://adventwave.draftbitlabs.tech/downloads/AdventWave.AppImage) |

### .deb — Ubuntu, Debian, Linux Mint

```bash
cd ~/Downloads
wget -c https://adventwave.draftbitlabs.tech/downloads/AdventWave.deb
sudo apt install ./AdventWave.deb
```

Then open **AdventWave** from your applications menu, or run `adventwave` in a terminal.

To update, download the new `.deb` and install it the same way. To remove it:

```bash
sudo apt remove adventwave-desktop
```

### AppImage — any distribution

```bash
cd ~/Downloads
wget -c https://adventwave.draftbitlabs.tech/downloads/AdventWave.AppImage
chmod +x AdventWave.AppImage
./AdventWave.AppImage
```

Or in a file manager: right-click the file → Properties → Permissions → *Allow executing file as
program*, then double-click it. The AppImage checks for new versions by itself and installs
them the next time you quit. To remove it, delete the file.

`wget -c` picks up where it left off if the connection drops, so on a slow or patchy line run
the same command again until it finishes.

### Check the download (optional)

The server publishes the SHA-512 of every Linux file. To compare yours:

```bash
curl -s https://adventwave.draftbitlabs.tech/downloads/latest-linux.yml   # the version and checksums
openssl dgst -sha512 -binary AdventWave.deb | base64 -w0; echo           # must equal the deb's sha512 above
```

## Check that it works

1. **It opens and you can sign in** — the same email and password as on the website.
2. **Music plays and keeps playing when you close the window.** While something is playing,
   closing the window leaves AdventWave in the system tray (top bar or bottom panel): right-click
   the icon for Play/Pause, Next, Previous, Show and Quit. With nothing playing, closing quits.
3. **Your keyboard's media keys** (play/pause, next, previous) and your desktop's media controls
   work.
4. **Offline:** turn off Wi-Fi — the app shows "You're offline" and reconnects by itself when
   the connection comes back.
5. **Links** (.deb install): `xdg-open adventwave://download` opens that page in the app.

## If something goes wrong

| What you see | Fix |
|---|---|
| The AppImage does nothing, or says it needs **FUSE** | `sudo apt install libfuse2t64` (Ubuntu 24.04 and later) or `sudo apt install libfuse2` (older releases) |
| The AppImage won't start and the terminal shows **"The SUID sandbox helper binary was found, but is not configured correctly"** (some locked-down systems) | Use the `.deb`, which sets the sandbox up during install (including Ubuntu 24.04's AppArmor profile). Or run `./AdventWave.AppImage --no-sandbox` |
| No tray icon on GNOME | Install the *AppIndicator and KStatusNotifierItem Support* extension (`sudo apt install gnome-shell-extension-appindicator`, then log out and in) |
| It opened before and now shows a blank window | Quit it from the tray, then start it again. Your sign-in is kept in `~/.config/AdventWave` |

## In this repository

| Folder | What |
|---|---|
| [`advent-wave/`](advent-wave/README.md) | The website (React + Vite) |
| [`DESKTOP/`](DESKTOP/README.md) | The desktop app (Electron) and how releases are built |
| [`MOBILE/adventapp/`](MOBILE/adventapp/README.md) | The phone app (Expo / React Native) |
| [`admin/advent-admin/`](admin/advent-admin/README.md) | The admin portal for churches and editors |
| [`backend/`](backend/README.md) | The API gateway and services (Spring Boot) |
| [`contracts/`](contracts/README.md) | The OpenAPI contract, schemas and design RFCs |
| [`deploy/docker/`](deploy/docker/README.md) | Running the whole system on a server |
