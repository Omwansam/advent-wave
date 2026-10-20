# AdventWave contracts

**This directory is the source of truth for every interface between AdventWave components.**
Version: see [`VERSION`](VERSION). A service may consume these files; it may never vendor,
fork, or reinterpret them. Where a service and a contract disagree, the contract is right until
an RFC says otherwise — and the disagreement is recorded, never silently patched on either side.

## Layout

| Path | Contract | Status at 1.0.0 | Generated from |
|---|---|---|---|
| [`postgres/`](postgres/) | Schema, constraints, trigger, outbox | **implemented** | `backend/tools/dump-schema.sh` (pg_dump of a migrated DB) |
| [`openapi/adventwave.yaml`](openapi/adventwave.yaml) | The public REST surface, 34 listener and auth + 34 admin operations | **implemented** | `backend/tools/dump-openapi.sh` (springdoc, from the running gateway) |
| [`kafka/`](kafka/) | Six topics, JSON Schema per message value | **implemented**; `audio.transcode.v1` `completed` is produced by the local worker (RFC 0001) until workstream D's service exists | `playback.events.v1`, `library.events.v1`, `catalog.playlist.v1` from the event classes and `LibraryService`; the rest from the plan and table columns |
| [`redis/`](redis/) | Key registry, TTLs, owners | **implemented** | `RedisKeys.java` + call sites |
| [`cassandra/`](cassandra/) | History and play-count tables | **planned** (Postgres interim) | plan §1 day 4 |
| [`proto/`](proto/) | gRPC service contracts | **deferred** — no service boundary exists | one README per service, mapping planned RPCs to the Java that backs them |
| [`audio/transcode.md`](audio/transcode.md) | Transcode worker input/output, upload, serving | implemented locally: upload, worker, both sides of the seam (RFC 0001); object storage, CDN and the worker service are planned | plan §11 + `media_assets` |
| [`examples/`](examples/) | Kafka messages and API responses | — | real outbox rows and live API responses; constructed where nothing exists yet |
| [`rfcs/`](rfcs/) | Accepted changes, one file each | — | written by hand, before the change |

The Java module `backend/contracts` is the **executable consumer** of this directory — DTOs,
event records, Flyway migrations, `RedisKeys`. It implements these contracts; it does not
define them. When the two disagree, CI fails.

## What "the source of truth" means for generated files

`postgres/schema.sql` and `openapi/adventwave.yaml` are generated *from the implementation*.
That is deliberate: a hand-written spec drifts the first week. The contract is still the file
in this directory — the generator is how it is kept honest, and the freeze is what stops the
implementation moving underneath it. After the tag, a regeneration that produces a diff is a
contract change and needs an RFC, whichever side moved.

## Versioning

`VERSION` is semantic and applies to the whole directory. Git tag `contracts@<version>`.

| Change | Bump | Consumers |
|---|---|---|
| Add an optional field, endpoint, topic, key, or example | patch/minor | no action |
| Add a required field, remove or rename anything, change a type or enum, change a status code, change a key or partitioning | **major** | migrate within one week, then the old version is deleted |
| Documentation only | patch | — |

A topic's version suffix (`.v1`) is its own major version. A breaking change creates
`<topic>.v2` beside it; both are produced until every consumer has moved.

## Backward compatibility rules

- **Kafka** — `BACKWARD` compatibility (new schema reads old messages): fields may be added
  only as optional; enums may gain values only if every consumer tolerates unknown ones.
  Consumers dedupe on the envelope `event_id` and must tolerate replay.
- **REST** — fields may be added to responses; request fields may be added only as optional.
  `@JsonInclude(NON_NULL)` means an absent field and a null field are the same thing to a client.
- **Postgres** — additive migrations only without a major bump. No destructive migration
  (`DROP`, type narrowing, `NOT NULL` on a populated column) without an explicit approval label.
- **Redis** — a key's meaning never changes; retire it and add a new one.

## Changing a contract

1. Write an RFC: what changes, why, which workstreams are affected, the compatibility class above.
2. Affected workstreams sign off.
3. Change the implementation and regenerate; or change the planned file directly for
   not-yet-implemented contracts.
4. Bump `VERSION`, tag, and record the change in the relevant `README.md` drift table if the
   implementation and plan still differ afterwards.
5. Consumers migrate within one week of a major bump. Then the old version is deleted.

Contract changes after the freeze go through the weekly contract review board (plan §7).

## Invariants every workstream inherits

Verbatim, because they are contract terms and not code-review preferences:

- **Private session.** Events with `private: true` must be excluded from listening history,
  from recommendation features, and from the friend-activity feed. Enforced in the gateway
  (`PrivateSessionConformanceTest`) and re-enforced by every consumer.
- **A play counts** when `ms_played >= 30000` OR `ms_played >= duration_ms * 0.5`. Computed
  server-side (`PlayCountingPolicy`). This is what is reported to contributing churches.
- **No item is published without a granted licence.** A database trigger, not application logic.
- **Every domain write that changes catalogue or library state writes an outbox row in the same
  transaction.** Consumers are idempotent on `event_id`.
- **Never return an unsigned media URL.** One signed URL per manifest, short-lived.
- **Redis is never a source of truth.** The only tolerated loss is ≤30s of playback position.

## Changes

### 1.4.0 — [RFC 0003](rfcs/0003-listening-progress.md), listening progress
- **Added** `openapi`: `GET /v1/progress` and `PUT /v1/progress/{mediaItemId}` (tag `player`) —
  one resume point per sermon or podcast episode, so a listener picks up where they stopped on any
  device. Songs are refused (400), unpublished items are 404. Schemas `ListeningProgressDto`,
  `ListeningProgressListDto`.
- **Added** `postgres`: table `listening_progress` (V7).
- **Added** `examples`: `progress.list.json`, `progress.save.json`, `progress.save.song.json`.
- Not listening history: a private session does not suppress it, and no outbox row is written.
- No breaking change.

### 1.3.0 — [RFC 0001](rfcs/0001-admin-portal.md), admin portal
- **Added** `openapi`: 12 operations. `POST /v1/admin/media/{id}/upload` (a URL to PUT the master to,
  never through the API); `GET /v1/admin/media/{id}/preview`; `GET /v1/admin/albums?artistId=`;
  `GET /v1/admin/licenses?status=`; `POST /v1/auth/admin/login`; `GET /v1/admin/me`,
  `POST /v1/admin/me/password`, `POST /v1/admin/me/sign-out`; `GET`/`POST /v1/admin/accounts`,
  `PATCH /v1/admin/accounts/{id}`, `POST /v1/admin/accounts/{id}/password`.
- **Added** `openapi`: optional `mediaType` and `q` on `GET /v1/admin/media`; optional
  `reviewFlags` and `failureReason` on `AdminMediaItemDto`.
- **Added** `openapi`: role-based access. Each admin operation needs one permission —
  `catalog:read`, `media:write`, `media:publish`, `rights:write` or `admins:manage` — checked
  against the stored account on every request; `catalog:write` is still accepted on every
  catalogue operation. The admin 403 now carries the Error body naming the missing permission.
- **Added** `postgres`: `media_items.review_flags` (TEXT[], default empty),
  `media_items.failure_reason`; table `admin_accounts`.
- **Added** `kafka`: a `completed` producer for `audio.transcode.v1` (gateway
  `LocalTranscodeWorker`, local profile) and a `requested` consumer (`TranscodeRequestedHandler`).
- **Changed (dev only)**: the dev issuer no longer grants `catalog:write` to any email by default.
- **Recorded drift** O8 (nested request schemas share names).
- No breaking change.

### 1.2.0
- **Added** `openapi`: the ingest surface, 23 operations under `/v1/admin/**` — churches,
  licences, artists, albums, media items through `draft → processing → published → withdrawn`.
  Requires the `catalog:write` scope (`403` without it); state refusals are `409`.
- **Added** `kafka`: producers for `catalog.media.v1` and `catalog.artist.v1`, the `requested`
  half of `audio.transcode.v1`, and the `completed` consumer (`TranscodeCompletedHandler`).
  Examples for all three now come from real outbox rows.
- **Added** entities for `churches` and `licenses` (schema unchanged).
- No breaking change.

### 1.1.0
- **Added** `postgres`: `play_counts_by_item_day`, `play_counts_by_artist_day` (Cassandra interim),
  `processed_events` (consumer idempotency, permanent). Additive.
- **Added** `kafka`: consumers `PlayCountRecorder` and `HomeCacheInvalidationHandler` on the
  interim in-process dispatcher (`kafka/README.md` → Consumers).
- **Changed** `openapi`: `PlaybackSubmission.eventId` is `format: uuid` (the Kafka contract
  always required it; a client sending anything else now gets 400 where it silently got a
  second id before — K1); operationId `playback_1` → `redirectToAsset`.
- **Changed** `openapi`: four error paths that returned 500 now return 400/404 as documented
  (O1–O3); they were always declared, they were just wrong.
- **Resolved drift:** K1, K5, O1, O2, O3, O7, R1.

### 1.0.0
Initial lock. Tag `contracts@v1.0.0`.

## Known drift

Every place the implementation and the plan disagree is recorded in the relevant contract's
"Documented drift" table with the smallest correction. None is silently resolved. Summary:

| Id | Where | One line |
|---|---|---|
| K2 | kafka | `event_id` placement differs by topic; rule adopted: envelope carries it |
| K3 | kafka | `device` is unvalidated free text |
| A1–A3 | audio | 302 target path unserved; no waveform row type; profile enum not a CHECK |
| C1 | cassandra | interim history is one-row-per-item; target is one-row-per-play |
| O8 | openapi | nested request records share schema names (`Request` for five DTOs, `Update` for two); see RFC 0001 |

Resolved in 1.1.0: K1, K5, O1–O3, O7, R1 (struck through in the per-contract tables).

## Ownership

| Contract | Owner |
|---|---|
| postgres, redis `a:*`, kafka `library.events`, `catalog.playlist`, `playback.events` (producer), openapi | workstream A |
| kafka `catalog.media`, `catalog.artist` (as index consumer), redis `b:*`, proto `catalog`/`search` | workstream B |
| kafka consumers, cassandra, redis `c:*` | workstream C |
| audio, kafka `audio.transcode`, redis `d:*`, proto `media` | workstream D |
| proto `recommendation`, redis `f:*` | workstream F |
| this README, `VERSION`, the review board | tech lead |
