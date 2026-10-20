# RFC 0004 — Hymn lyrics, sermon chapters, autoplay, and crossfade that works

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-20 |
| Contracts | **1.5.0** |
| Compatibility class | **Minor**: three tables, one column, eight operations, one optional response field and one optional request field, all new. Nothing existing changes shape |
| Workstreams | **A** gateway and platform-core, **B** catalogue and search, **F** recommender, **G** web client, admin portal |

## Why

The four gaps the Spotify feature study ranked highest (`advent-wave/SPOTIFY_FEATURE_STUDY.md`):

1. **Lyrics.** Congregational song is sung, and half the catalogue is in Swahili or a mix; a
   listener learning *Mwamba Wa Milele* needs the words. Nor can anyone find a hymn by the line
   they remember.
2. **Crossfade** is a saved setting that playback ignores.
3. **Chapters.** A sermon has a shape — scripture reading, sermon, appeal, closing hymn — and a
   listener returning for the appeal scrubs for it.
4. **Autoplay.** When the queue ends, the music stops.

The shipped Spotify desktop client 1.2.95 (`xpui.spa`), examined statically with REA, shows the
behaviour each is built on — not the code, which is not used:

- Lyrics are fetched per track from the server: `{ syncType, lines, provider, providerDisplayName,
  isRtlLanguage }`, where a **404 means "no lyrics"**, not an error (`xpui-routes-track-v2.js`). The
  now-playing card says "These lyrics aren't synced to the song yet" when lines carry no times, and
  synced lines seek on click (`dwp-panel-section.js` c.149790). Search marks a **Lyrics match**.
- Chapters show only when an episode has valid chapter items (`dwp-panel-section.js` c.186829).
- Autoplay: "When your audio ends, we'll play you something similar"; it is unavailable when
  personalised recommendations are off, and its tracks appear in the queue under **Next from:**.
- The crossfade setting reads **Crossfade songs**.

## What

### Postgres (V8, additive)

| Table / column | Shape |
|---|---|
| `media_lyrics` | `media_item_id` PK → `media_items`, `language`, `rights_basis` ∈ `public_domain` · `contributor` · `licensed`, `credit` (non-blank), `plain_text` (all lines, for search; trigram index), `updated_at` |
| `media_lyric_lines` | `(media_item_id, position)` PK → `media_lyrics`, `start_ms` (null when unsynced), `text` |
| `media_chapters` | `(media_item_id, position)` PK → `media_items`, `start_ms`, `title`; `UNIQUE (media_item_id, start_ms)` |
| `user_settings.autoplay` | `BOOLEAN NOT NULL DEFAULT TRUE` |

### REST

| Operation | Behaviour |
|---|---|
| `GET /v1/media/{id}/lyrics` | `LyricsDto`. **404** when the item is unpublished *or has no lyrics* — the client treats both as "none" |
| `GET /v1/media/{id}/chapters` | `ChaptersDto`; an empty list when there are none. **404** when unpublished |
| `GET /v1/autoplay?seed=&seed=…&limit=` | `AutoplayDto { tracks }`: up to `limit` (default 10, max 25) published items of the first seed's media type, most similar to the seeds first, seeds excluded. 1–10 seeds and `limit` 1–25, **400** outside that; unknown or unpublished seeds are ignored, and when none is left the list is empty |
| `GET /v1/admin/media/{id}/lyrics` | Any status. **404** when none |
| `PUT /v1/admin/media/{id}/lyrics` | Replace. Songs only (**400** otherwise). `media:write` |
| `DELETE /v1/admin/media/{id}/lyrics` | **204**. `media:write` |
| `GET /v1/admin/media/{id}/chapters` | Any status |
| `PUT /v1/admin/media/{id}/chapters` | Replace the list; `[]` clears. Sermons and podcasts only (**400** otherwise). `media:write` |

`LyricsDto { mediaItemId, synced, lines: [{ startMs?, text }], language?, rightsBasis, credit,
updatedAt }`; `ChaptersDto { mediaItemId, chapters: [{ startMs, title }] }`.

- `SearchResultsDto` gains optional `lyricsMatches: [{ track, line }]` — songs whose words contain
  the query (3+ characters), with the first matching line, at most 10, excluding songs already in
  `songs`. The existing lists and their ranking (ported score-for-score from `searchRank.js`) are
  untouched.
- `UserSettingsDto` gains optional `autoplay`. Optional on purpose: a client that does not send it
  leaves it unchanged rather than switching it off.

### Kafka

No schema change. A lyrics or chapters write re-announces the item on `catalog.media.v1` (same
payload, new `updated_at`) in the same transaction, as every catalogue write does; consumers
re-read what they need.

## Decisions

- **The words have their own rights.** A licence covers the church's recording; the text of a hymn
  can belong to someone else entirely. Every lyrics row says on what basis it is shown —
  `public_domain`, `contributor` (the contributing church owns the words) or `licensed` — and
  carries a credit line ("Words: Fanny J. Crosby, 1873"), shown under the lyrics. Nothing is
  seeded: the words must match the recording, so an editor enters them. A rights manager reviews
  the basis like any other consent record.
- **Synced or not, never half.** Every line has a `startMs` (strictly increasing) or none does. A
  half-timed text cannot be highlighted honestly.
- **Lyrics for songs, chapters for sermons and podcasts.** `MediaType.isSpeech()` decides, both ways.
- **Chapters validate against the item:** starts strictly increasing, within `duration_ms` when it is
  known, at most 100, titles 1–120 characters.
- **Autoplay is seeded, not personalised.** It continues from what was just playing (the client
  sends the last few queue items); it does not read listening history, so private session has
  nothing to suppress. Liked items may be autoplayed — unlike `/v1/recommendations`, which is for
  discovery and excludes them. Default on, as in the reference client.
- **Crossfade is songs only and client-side.** Two audio elements; the next song's manifest is
  fetched ~20 s ahead (signed URLs live 5 min) and faded in on an equal-power curve while the
  current one fades out. Never between sermons, never under repeat-one or an end-of-item sleep
  timer. The outgoing song's tail plays under the next one, so it counts toward `ms_played`; the usual
  95 % rule then decides `play_completed` or `skipped`, exactly as if the song had played out alone.
- **Lyrics search is a separate list**, so `songs`' ranking parity with `searchRank.js` holds.

## Verification

No Docker on the development machine, so no Testcontainers test is claimed and the existing suite
was not run. On the native-Postgres local stack:

- Flyway applied V8; Hibernate's `ddl-auto: validate` accepted the new entities on boot.
- Against the running gateway: lyrics synced and unsynced saved and read back; refused with **400** —
  half-timed lines, non-increasing times, a line break inside a line, an unknown rights basis, a blank
  credit, lyrics on a sermon, chapters on a song, non-increasing or past-the-end chapters, a blank
  title; **404** for an unknown item and for a song with no lyrics; a listener token on an admin route
  **403**; `DELETE` twice **204**, no orphaned lines. Each successful write left exactly one
  `catalog.media.v1` outbox row; refused writes left none. Autoplay from a Swahili gospel seed returned
  Swahili and Kenyan gospel first; a sermon seed only sermons; no seed or `limit` 99 **400**; an
  unknown seed an empty list. `wretch like me` found Amazing Grace under `lyricsMatches` with its
  line; `amazing` (a title match) did not repeat it; a 2-character query returned none. A settings
  `PUT` without `autoplay` left it unchanged.
- In headless Chrome driven by REA: the lyrics card followed the recording and seeked on a line;
  search by a line showed "Lyrics match"; with the queue at its last song, autoplay appended ten under
  "Next from: Autoplay"; on locally served audio the crossfade prefetched the next manifest once,
  handed off on time without reloading it (one manifest request, next song at 0:07 eight seconds
  later), and reported the outgoing song `skipped` with its tail counted (19 s, after a seek to its
  last 14 s); chapters showed in the full player and the bar ("2/4 · Scripture reading") and seeked;
  in the admin portal a content manager added lyrics and chapters through the new forms.
- `./mvnw test -pl contracts,catalog-service,reco-service` passes, including three new autoplay tests;
  `eslint` and `vite build` clean in both web apps; `validate-contracts.py` 0 failures; the regenerated
  `openapi/adventwave.yaml` and `postgres/schema.sql` diff is additive only.
- All test lyrics, chapters, progress rows and the temporary admin account were removed afterwards.
