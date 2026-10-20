# Spotify feature study — what AdventWave lacked, and what branch `arnold` adds

**Date:** 2026-10-20 · **Branch:** `arnold` · **Method:** REA static analysis of a shipped client

## Boundary

The reference is the Spotify desktop client **1.2.95.453** (Ubuntu snap). Its UI ships as
`Apps/xpui.spa`, a ZIP of the web bundle (SHA-256
`7ce05c0001be22c7b5124d9dd59dd1ab1e0c188640967836b996f0d32a62f74e`). It was unpacked outside the
repository and read with REA as inert text: nothing was executed and nothing was sent to Spotify.
**No Spotify code, artwork or branding is in the app.** What was taken is behaviour — which
features exist and how they act — and every feature below is our own implementation on our own
model. The i18n keys and short UI strings in this document are quoted only as evidence.

REA analysed 17 of the 248 inventoried source files, chosen by route name: now-playing bar, settings,
lyrics, track page, library, recents, recently played, offline, blend, listening stats, song
collection, episode, show, podcast chapters, episode collection, buddy feed, root dialogs. Coverage
inside those chunks is partial (REA reports its semantic graph truncated), so **a feature missing
from this table is unexamined, not absent.**

## Ledger

Evidence is chunk + column in the minified bundle, and the i18n key the chunk reads there.

| Spotify feature | Evidence | AdventWave before | On `arnold` |
|---|---|---|---|
| **Sleep timer** — minutes, hours, "End of episode/track", turn off; "Sleep timer - {0} left" | `dwp-now-playing-bar.js` c.30769–32699, `web-player.sleep-timer.*` | none | **Built.** 5–60 min or end of this sermon/episode/song; countdown in the bar; pauses (end-of-item moves on, paused) |
| **Playback speed** — increase/decrease shortcuts, "Speed {0}×"; videos stay at original speed | `xpui-root-dialogs.js` c.158636, c.158764, `playback-control.*-playback-speed` | none | **Built**, for sermons and podcasts only — hymns always play as recorded. 0.75–2×, `<` / `>` keys |
| **Episode progress** — In Progress / Unplayed filters, "{0} left" | `xpui-routes-show.js`, `shows.filter.in-progress`, `shows.filter.unplayed`, `time.left` | one resume position (current item only) | **Built.** Per-item resume, filters and "23 min left" on Sermons and Podcasts |
| **Resume points from the server** — each episode carries `playedState { playPositionMilliseconds, state }`, `Completed` compared | `xpui-routes-show.js` (text search; REA's graph does not index property names) | none | **Built.** `GET`/`PUT /v1/progress`, table `listening_progress` — [RFC 0003](../contracts/rfcs/0003-listening-progress.md), contracts 1.4.0 |
| **Lyrics** — synced, "provided by", translate, search by lyrics | `dwp-now-playing-bar.js`, `xpui-routes-track-v2.js`, `search.lyrics-match` | placeholder card | Card now shown for songs only. **Not built** — needs a lyrics field or endpoint and the text; most hymn texts are public domain |
| **Transcripts** (auto or creator-provided) and **chapters** for episodes | `xpui-routes-episode.js`, `web-player.episode.transcript*`, `web-player.podcast-chapter.*` | none | **Not built** — needs data from contributing churches; chapters are timestamps an admin could enter |
| **Crossfade** | `xpui-routes-desktop-settings.js` c.39410, `desktop.settings.crossfadeTracks` | setting is saved, **playback ignores it** | **Not built.** Needs a second `<audio>` element and the next manifest pre-fetched |
| **Autoplay** similar audio when the queue ends | settings chunk, `desktop.settings.autoplay` | queue just stops | Not built. `/v1/recommendations` already exists to feed it |
| **Smart shuffle / fewer repeats** | settings chunk, `desktop.settings.shuffle.mode.*` | plain shuffle | Not built |
| **Sort newest / oldest** | `xpui-routes-show.js`, `shows.sort.*` | — | Not built — `TrackDto` has no publish date (contract change) |
| **Recents** grouped by day; played / saved / shared | `xpui-routes-recents.js`, `web-player.recents.*` | Listening history (flat) | Not built |
| Normalize volume, private session, friend activity, queue | settings, buddy feed | **present** | — |
| Equalizer, offline downloads, Jam, Blend, audiobooks, ads | settings, blend, offline chunks | — | Out of scope for now |

## What was verified, and how

- Frontend: `eslint src` and `vite build` clean. REA drove headless Chrome through the real app:
  set 1.5× and a 30-minute timer on a sermon, paused, filtered to In progress (row showed time
  left); then a fresh browser profile resumed the same sermon from the server's position.
- Backend: built and booted on the local Postgres stack; every response class of the new endpoints
  checked against the running gateway; REA inventoried the built jar for the new classes and V7.
  Testcontainers integration tests were **not** run (no Docker on this machine).

## Next, by value to a sermon-and-hymn listener

1. **Hymn lyrics** — the biggest gap for congregational singing. Contract change (lyrics on the
   item or `GET /v1/media/{id}/lyrics`), admin entry, and the full-screen card already in place.
2. **Crossfade** — the toggle exists and does nothing; fix or hide it.
3. **Sermon chapters** — scripture reading, sermon, appeal: timestamps entered at ingest.
4. **Autoplay** at queue end from `/v1/recommendations`.
