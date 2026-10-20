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

REA analysed 18 of the 248 inventoried source files, chosen by route name: now-playing bar, settings,
lyrics, track page, library, recents, recently played, offline, blend, listening stats, song
collection, episode, show, podcast chapters, episode collection, buddy feed, root dialogs, and the
now-playing side panel. Coverage
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
| **Lyrics** — fetched per track (`{ syncType, lines, provider }`, **404 = none**), synced lines seek, "not synced" note, provider credit, search by lyrics | `xpui-routes-track-v2.js`, `dwp-panel-section.js` c.149790, `search.lyrics-match` | placeholder card | **Built** ([RFC 0004](../contracts/rfcs/0004-lyrics-chapters-autoplay.md)): synced or plain lyrics with a rights basis and credit, line-following card, lyrics button, "Lyrics match" in search, admin editor with LRC-style timing. Translation not built |
| **Chapters** for episodes, shown only when there are some | `dwp-panel-section.js` c.186829, `web-player.podcast-chapter.*` | none | **Built** (RFC 0004): chapters card in the full player, current chapter in the bar, marks on the progress bar, admin editor |
| **Transcripts** (auto or creator-provided) | `xpui-routes-episode.js`, `web-player.episode.transcript*` | none | Not built — needs text from contributing churches or a speech-to-text step |
| **Crossfade songs** | `xpui-routes-desktop-settings.js` c.39410, `desktop.settings.crossfadeTracks` | setting is saved, **playback ignores it** | **Built** (RFC 0004): two `<audio>` elements, next manifest prefetched, equal-power fade, songs only |
| **Autoplay** similar audio when the queue ends; shown as "Next from:" | settings chunk, `desktop.settings.autoplay`, `dwp-panel-section.js` `queue.next-from` | queue just stops | **Built** (RFC 0004): `GET /v1/autoplay`, seeded by the last items played; setting on by default |
| **Smart shuffle / fewer repeats** | settings chunk, `desktop.settings.shuffle.mode.*` | plain shuffle | Not built |
| **Sort newest / oldest** | `xpui-routes-show.js`, `shows.sort.*` | — | Not built — `TrackDto` has no publish date (contract change) |
| **Recents** grouped by day; played / saved / shared | `xpui-routes-recents.js`, `web-player.recents.*` | Listening history (flat) | Not built |
| **Friend activity** — per followed person: track, artist, "now" or how long ago; hidden in a private session; "Share my listening activity", on by default | buddy feed, `desktop.settings.privateSession`, settings chunk | panel with three invented people ("Mock feed") | **Built** ([RFC 0007](../contracts/rfcs/0007-friend-activity.md)): follow listeners, search by name, profiles, live panel and a Friends page for small screens, share setting; private session and sharing enforced on the server |
| Normalize volume, private session, queue | settings | **present** | — |
| Equalizer, offline downloads, Jam, Blend, audiobooks, ads | settings, blend, offline chunks | — | Out of scope for now |

## What was verified, and how

- Frontend: `eslint src` and `vite build` clean. REA drove headless Chrome through the real app:
  set 1.5× and a 30-minute timer on a sermon, paused, filtered to In progress (row showed time
  left); then a fresh browser profile resumed the same sermon from the server's position.
- Backend: built and booted on the local Postgres stack; every response class of the new endpoints
  checked against the running gateway; REA inventoried the built jar for the new classes and V7.
  Testcontainers integration tests were **not** run (no Docker on this machine).

## Ready for a server

Beyond the Spotify study, three things stood between the app and real listeners, and are now built:
listener accounts with email and password ([RFC 0005](../contracts/rfcs/0005-listener-accounts.md)),
audio in S3-compatible object storage ([RFC 0006](../contracts/rfcs/0006-object-storage.md)), and a
one-server deployment — systemd, Caddy, nightly backups, a first-deploy script that takes the
development seed out of view ([`deploy/README.md`](../deploy/README.md)). The demo-account sign-in
and the fake "Connect to a device" list are gone from production builds; What's New lists what shipped.

## Next, by value to a sermon-and-hymn listener

1. **Deploy**, following `deploy/README.md`, and add the first church's recordings in the admin portal.
2. **Enter the words.** Lyrics and chapters are empty until editors add them: Admin → Media library →
   a song → *Add lyrics* (choose the rights basis; public-domain hymn texts need only a credit), or a
   sermon → *Add chapters*.
3. **Transcripts** for sermons, for the hard of hearing and for search.
4. **Lyric translation** — an English hymn's Swahili words, or the reverse, side by side.
5. **Sort by date** on Sermons and Podcasts — needs a publish date on `TrackDto`.
6. **A delete for listening progress** — with a tombstone, see RFC 0003's known limitation.
