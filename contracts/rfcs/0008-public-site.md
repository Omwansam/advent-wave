# RFC 0008 — The public website: one cached, open read of the catalogue

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-22 |
| Contracts | **1.7.0** |
| Compatibility class | **Minor**: one operation, four response schemas, one Redis key. Nothing existing changes shape |
| Workstreams | **A** gateway, **B** catalogue (two count queries), **G** web (the website in `WEBSITE/advent-net`) |

## Why

AdventWave gets an official website (`WEBSITE/advent-net`): what it is, what churches are sharing,
and the desktop downloads. A website that says "hymns, choirs and sermons" and then shows none is a
brochure; it should show the catalogue as it is today. Every catalogue read so far needs a listener
account, so the site has nothing it may ask for.

What the site shows changes when the catalogue does — a few times a day — and is the same for every
visitor. So the gateway should build it once and serve that copy to everyone, not run the queries
per visit.

## What

### REST

| Operation | Behaviour |
|---|---|
| `GET /v1/site` | `SiteDto { totals, trending, sermons, playlists, categories, generatedAt }`. Public (no token), any origin |

- `totals` — `SiteTotals { songs, sermons, podcasts, hours, artists, churches, playlists }`, counted
  over **published** items only. `hours` is their total duration, rounded down. `artists` are those
  with something published; `churches` those whose licence covers something published; `playlists`
  the curated, public ones.
- `trending` — the first 8 of the home page's shared "Trending now" rail (the last seven days of
  counted plays, topped up by static popularity), `sermons` the first 6 of its sermons rail,
  `playlists` the first 6 of its Sabbath-worship rail. The site and the app agree on what is
  trending because they read the same rails (`HomeSectionCache`).
- `SiteItem { id, title, artist, artistId, albumId?, cover?, mediaType, durationMs }` — enough to
  draw a card and link into the web app (`/artist/{artistId}`). **No `audioUrl`.**
- `SiteCollection { id, title, description?, cover?, items }` — a playlist's own cover, or its first
  recording's.
- `categories` — `DiscoverCategoryDto`, as `GET /v1/discover` returns them.
- Response header `Cache-Control: public, max-age=300, stale-while-revalidate=600`.

### Security and CORS

- `permitAll` for `GET /v1/site` only; every other method on it stays the listener API (401).
- A CORS rule for `/v1/site` alone: `Access-Control-Allow-Origin: *`, `GET` and `HEAD`, no
  credentials. The website may be served from a host of its own; the rest of the API keeps its
  configured origins (`ADVENTWAVE_CORS_ORIGINS`).

### Redis

| Key | Owner | TTL | Purpose |
|---|---|---|---|
| `a:site:{section}` | A | 30m ±20% jitter + event-invalidated | Assembled public-site sections; `a:site:showcase` is the whole `SiteDto` |

`SiteCacheInvalidationHandler` drops it on every `catalog.media.v1`, `catalog.artist.v1` and
`catalog.playlist.v1` message — guardrail 2, the same path as `HomeCacheInvalidationHandler`. A
Redis read or write failure is a cache miss (`SiteCache`), like `HomeSectionCache`.

## Decisions

- **One endpoint, one cached value.** The site needs everything at once and nothing per visitor, so
  the whole response is the cache entry. The home rails it is made from are cached already (5m), so
  a rebuild is three count queries and the category list.
- **30 minutes, not 5.** The home page's rails refresh often because listeners notice; a website
  visitor does not, and invalidation already covers the changes that matter (publish, withdraw,
  rename, playlist edits). The TTL only bounds how stale a trending order can get.
- **Open CORS on this one path.** It carries nothing a page could not already show, takes no
  credentials, and the site is a static build that may live anywhere (behind the same proxy, or on
  its own host). Opening the whole API to `*` was not considered.
- **No stream URLs, even though they are signed.** The site links into the web app to listen; it
  does not play anything itself, and a public, cached document should not carry playback paths.
- **The desktop release stays a static file.** The site reads `/downloads/release.json` from the
  server that serves the installers, as the web app's `/download` does. It is a file the `downloads`
  service writes; caching it in Redis would only add a way for the two to disagree. For a site on
  another host, the web container sends `Access-Control-Allow-Origin: *` on `/downloads/*.json` and
  `*.yml`.

## Verified

- `SiteCacheTest` (no containers): a miss builds once and stores with a 24–36 minute TTL; a hit
  never touches the catalogue; Redis down on read and write still answers; a catalogue event and an
  invalidation with Redis down both behave.
- Local gateway against Postgres: `GET /v1/site` with no token is 200 with the headers above and no
  `audioUrl`; `GET /v1/browse` with no token stays 401; `POST /v1/site` is 401; a preflight to
  `/v1/auth/login` from a foreign origin stays 403 while `/v1/site` allows it. Without Redis the
  gateway logs the cache warning and answers from Postgres.
- `dump-openapi.sh`: the regenerated document differs only by this operation, its four schemas and
  the version.
