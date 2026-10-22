# AdventWave website

The official site for AdventWave: what it is, what churches are sharing today, and the desktop
downloads. React 19, Vite and Tailwind 4, with the GetLayers **Flow Wave** scene (Three.js r0.143)
behind every page. Scrolling flies the camera down into the wave, and the cursor parts its surface.

| Page | What |
|---|---|
| `/` | Hero, live catalogue numbers, trending, sermons, Sabbath playlists, categories, features, for churches, platforms |
| `/download` | Windows, macOS and Linux installers from our own server, with version, date and file sizes from its `release.json`; terminal install steps for Linux |

## Where the data comes from

Everything is read from the live AdventWave service (`https://adventwave.draftbitlabs.tech`):

- `GET /v1/site` — the catalogue as the site shows it (RFC 0008,
  `contracts/rfcs/0008-public-site.md`). Public, any origin, no account. The gateway builds it
  once and keeps it in Redis (`a:site:showcase`, 30 minutes, dropped whenever the catalogue
  changes), so a visit costs no database queries. Until a server has this endpoint the page still
  reads correctly; it shows no numbers and offers the app instead.
- `GET /downloads/release.json` — the desktop release the server is serving, written by
  `deploy/docker/desktop-sync.py`. The download buttons link to `/downloads/<file>` on the same
  server.

## Run it

```sh
npm install
npm run dev                                       # /v1 and /downloads proxied to the live server
AW_API_TARGET=http://localhost:8080 npm run dev   # /v1 from a local gateway instead
```

When the live server cannot be reached, the terminal shows `http proxy error` lines. `ETIMEDOUT`
means it could not connect; `ENOTFOUND` means its name did not resolve, which usually means this
computer is offline. The page does not hang: after 10 seconds it shows itself without live numbers,
and the download buttons stay enabled.

A local gateway is `./mvnw spring-boot:run -pl gateway -Dspring-boot.run.profiles=local` in
`backend/`. Redis is optional: without it the gateway logs a warning and builds `/v1/site` from
Postgres on every request.

## Deploy

On the server it is the `site` container of the AdventWave Docker stack, beside the gateway, Redis
and the web apps: `deploy/docker/Dockerfile.site`, on its own host, `advent.draftbitlabs.tech`, whose vhost passes
`/v1/site` and `/downloads/` to the live services. Adding it to the running install takes three
steps, in `deploy/docker/README.md` ("The website").

## Build and host elsewhere

```sh
npm run build    # dist/, a static site
```

`dist/` can be served from anywhere; any path that is not a file should fall back to `index.html`.
Built like this, the site asks `https://adventwave.draftbitlabs.tech` for its data, cross-origin.
(The container is built with `VITE_API_ORIGIN` empty instead, because its vhost proxies the data.)
Two variables change that at build time:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_APP_ORIGIN` | `https://adventwave.draftbitlabs.tech` | The web app, its downloads, and where "Open AdventWave" goes |
| `VITE_API_ORIGIN` | the app origin | Where `/v1/site` and `release.json` are read. Set it to an empty string when the site is served behind the same proxy as `/v1` and `/downloads` |

Cross-origin reads need the gateway from contracts 1.7.0 (CORS on `/v1/site`) and the web
container's `Access-Control-Allow-Origin` on `/downloads/*.json` (`deploy/docker/web.nginx.conf`).

## The scene

`src/scene/` is Flow Wave built to its prompt: the shaders are verbatim and every number is the
layer's own. The changes are listed at the top of `flowWave.js`. In short:

- Colours are AdventWave's violet and gold instead of emerald.
- The pixel ratio is capped at 2.
- The two empty composer layers render once instead of every frame.
- `prefers-reduced-motion` holds the swell still.
- Each mount gets a fresh canvas, so React Fast Refresh never leaves it blank.

Content panels are opaque instead of `backdrop-blur`. Blurring over a canvas that changes every
frame stalls software and low-end GPUs.
