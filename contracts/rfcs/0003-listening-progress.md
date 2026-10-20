# RFC 0003 — Listening progress: resume sermons and podcasts on any device

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-20 |
| Contracts | **1.4.0** |
| Compatibility class | **Minor**: one table, two operations, two schemas, all new. Nothing existing changes shape |
| Workstreams | **A** platform-core and gateway, **G** web client |

## Why

A sermon is 40–60 minutes and is rarely heard in one sitting. Today only one position survives:
`player_state.position_ms`, the current item's. Start a different sermon and the first one's
place is gone, so the listener scrubs back through it or gives up. Nor can the Sermons and
Podcasts pages say what is half-heard and what is new.

Every major listening app keeps one resume point per spoken-word item. The shipped Spotify
desktop client (1.2.95, `xpui.spa`) was examined with REA as a reference: its show page reads
each episode's `playedState: { playPositionMilliseconds, state }` from the server and compares
`state` against a `Completed` value, and its UI offers **In Progress** and **Unplayed** filters
and a "{0} left" label (`shows.filter.in-progress`, `shows.filter.unplayed`, `time.left`). The
point is that the resume point comes back from the server, not from the device. Nothing here is
copied from that client; it is the behaviour, rebuilt on our own model.

## What

### Postgres — `listening_progress` (additive)

```sql
listening_progress (user_id, media_item_id, position_ms, completed, updated_at)
  PRIMARY KEY (user_id, media_item_id)
```

One row per listener per sermon or episode. `ON DELETE CASCADE` from both sides: a deleted
account or a deleted item takes its rows with it.

### REST

| Operation | Behaviour |
|---|---|
| `GET /v1/progress` | The caller's rows, most recently updated first, at most 500 |
| `PUT /v1/progress/{mediaItemId}` | Upsert `{ positionMs, completed }`. **404** when the item is not published; **400** when it is a song |

`ListeningProgressDto { mediaItemId, positionMs, completed, updatedAt }` and
`ListeningProgressListDto { items }`. On `PUT`, `mediaItemId` and `updatedAt` in the body are
ignored: the path names the item and the server stamps the time.

## Decisions

- **Songs are refused.** Nobody resumes a hymn at verse three, and a row per song played would
  be the listening history table again under another name. `MediaType.isSpeech()` decides.
- **Not listening history, so private session does not suppress it.** The three things private
  session must hide — listening history, recommendation features, friend activity — are about
  what *others* see or what is *learnt* from listening. A resume point is neither: it is shown
  only to its owner, feeds nothing, and losing it would make a private session worse at the one
  thing the listener asked for, which is to listen. This is the decision most worth a reviewer's
  objection.
- **No outbox row.** Like `player_state`, this is the listener's own playback position, not
  library or catalogue state; no consumer needs it. If recommendations later want "finished
  sermons" as a signal, they take it from `playback.events.v1`, which private session already
  governs.
- **No Redis buffer.** `player_state` buffers because it is written every 10 s per active
  listener. The web client writes progress on pause, seek, item change and end, and at most every
  30 s while playing; a primary-key upsert at that rate does not need a cache in front of it.
- **Last write wins.** Two devices playing the same sermon at once is rare; the later write is
  the better guess, and the server's clock stamps it so a skewed device clock cannot win forever.
- **`completed` is the client's word.** The client saw `ended` (or a stop in the last 30 s / 5 %).
  The server does not re-derive it from `media_items.duration_ms`: in the reference catalogue the
  seeded audio is not the recording the duration describes, and a rule that disagreed with the
  player would mark sermons finished that the listener never finished.
- **500 rows per listener**, oldest dropped on write, the same trimming `listening_history` uses.

## Client

The web client keeps progress per account in local storage for instant UI and offline listening.
It loads `GET /v1/progress` on sign-in, keeps whichever copy of each item is newer, sends up what
only it has (at most 50 items), and then pushes with `PUT` on pause, seek, item change and end,
and at most every 30 s per item while playing.

## Verification

No Docker on the development machine, so no new Testcontainers test is claimed, and the existing
Testcontainers suite was not run. Verified on the native-Postgres local stack (PostgreSQL 16, no
Redis):

- Flyway applied V7 and Hibernate's `ddl-auto: validate` accepted the entity on boot.
- The running gateway answered: upsert **200** (twice on one item — one row, body
  `mediaItemId`/`updatedAt` ignored); list newest-first; song **400**; unknown item **404**;
  negative `positionMs` **400**; malformed id **400**; no token **401**; a second account sees an
  empty list.
- In a fresh browser profile with empty storage (a second device), the web client loaded
  `GET /v1/progress` on sign-in, listed the sermon under In progress, started it at the server's
  position less the 3 s rewind, and on pause wrote the new position back with `PUT`.
- The built `gateway` jar carries `ListeningProgressController`, and its nested `contracts` jar
  carries V7 and both DTOs.
- `openapi/adventwave.yaml` and `postgres/schema.sql` regenerated from the running build: the diff
  is additive only (no existing operationId, schema or table changes); `validate-contracts.py`
  passes, 0 failures. `./mvnw test -pl contracts,catalog-service,reco-service` passes.
