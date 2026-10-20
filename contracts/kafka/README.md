# Kafka contract

**Status: 5 of 6 topics have a producer (as outbox rows), `audio.transcode.v1` has its `requested` half; 3 consumers run on the interim dispatcher. No broker or schema registry exists.**

Each topic directory holds `schema.json` (JSON Schema 2020-12) for the message **value**. Every
file under `../examples/kafka/` validates against its topic's schema; CI must re-run that check.
Examples for the implemented topics are real rows copied from the development database, not
hand-typed.

## Registry

| Topic | Key | Compacted | Producer | Consumers | Status |
|---|---|---|---|---|---|
| `playback.events.v1` | `user_id` | no (30d retention) | gateway `PlaybackIngestService` | C (Cassandra writer), F (features) | **implemented** |
| `library.events.v1` | `user_id` | no | platform-core `LibraryService`, `FriendService` (1.6.0) | F | **implemented** |
| `catalog.playlist.v1` | `playlist_id` | yes | platform-core `LibraryService` | B (search index), F | **implemented** |
| `catalog.media.v1` | `media_item_id` | yes | gateway `CatalogAdminService` (every status change), `TranscodeCompletedHandler` | B, F | **implemented** (1.2.0) |
| `catalog.artist.v1` | `artist_id` | yes | gateway `CatalogAdminService` (`/v1/admin/artists`) | B, F | **implemented** (1.2.0) |
| `audio.transcode.v1` | `media_item_id` | no | `requested`: gateway `CatalogAdminService`. `completed`: *workstream D's worker — none yet* | A `TranscodeCompletedHandler` | **partial** (1.2.0) |

Topic names are constants in `org.adventwave.contracts.events.Topics`. Schema compatibility
mode, when a registry exists: `BACKWARD` (plan §1 day 2).

## The envelope — how a payload becomes a message

Every implemented event is written as a row in the `outbox` table, in the same transaction as
the domain write that caused it (`OutboxWriter` is `@Transactional(MANDATORY)`; the rollback
direction is tested by `OutboxAtomicityTest`). Debezium's outbox event router, once configured
by workstream C, maps the row to a message:

| Outbox column | Kafka | Notes |
|---|---|---|
| `event_type` | **topic** | Holds the topic name, e.g. `playback.events.v1` |
| `aggregate_id` | **key** | `user_id` for playback/library, `playlist_id` for playlist |
| `payload` | **value** | JSONB, validated by the topic's `schema.json` |
| `event_id` | header `id` | UUID, UNIQUE in the table. **This is the idempotency key.** |
| `created_at` | header / timestamp | Producer wall clock |
| `id` (bigserial) | — | Defines order within the WAL; Debezium preserves it |

**Idempotency rule:** consumers dedupe on the envelope `event_id`. A payload may repeat it (the
playback payload does, because the client can supply one) but must not carry a *different* one —
see drift item K1 below.

**Ordering:** guaranteed per key, in `outbox.id` order. Nothing is guaranteed across keys.

**Tombstones:** compacted topics express deletion as an explicit `{ "<key>": ..., "deleted": true }`
message, never as a null value. The outbox `payload` column is `NOT NULL`, so a null value cannot
be represented, and an explicit tombstone also survives a JSON-validating consumer.

**Retry / dead-letter:** not defined for the three implemented topics — they have no consumer.
`audio.transcode.v1` specifies 3 attempts then `audio.transcode.v1.dlq` (plan §11.7).

## Consumers — how the rows reach handlers today

**Status: 3 consumers IMPLEMENTED, on an INTERIM transport.** Module `backend/events-pipeline`
(workstream C's home in the monolith).

| Consumer | Topic | Does |
|---|---|---|
| `PlayCountRecorder` | `playback.events.v1` | Increments `play_counts_by_item_day` / `play_counts_by_artist_day` (Postgres interim for the Cassandra tables — `../cassandra/README.md`) |
| `HomeCacheInvalidationHandler` | `catalog.playlist.v1` | Drops the cached home rails (`a:home:*`) |
| `TranscodeCompletedHandler` | `audio.transcode.v1` (`completed` only) | Stores `media_assets` + loudness, then publishes — the licence trigger decides; a refusal leaves the item `processing` with its outputs kept |

Every handler implements `EventHandler { topic(); handle(EventEnvelope) }` where `EventEnvelope`
is the envelope above as a Java record — the handler cannot tell which transport delivered it.

**Interim transport:** `OutboxDispatcher`, a scheduled in-process poller that takes unpublished
rows in `id` order (`FOR UPDATE SKIP LOCKED`, one transaction per batch), delivers each to its
topic's handlers, and sets `published_at`. This is the poller the outbox DDL anticipates and
the thing Debezium replaces; it is switched off with `adventwave.events.dispatcher.enabled=false`
once Debezium publishes the table, and the handlers become Kafka listeners with no code change.
Its semantics deliberately match Kafka's so nothing is learnt twice: delivery marks the row,
not successful processing (a throwing handler is logged at ERROR with the `event_id` and the row
advances); order is per key; delivery is at-least-once.

**Idempotency, concretely:** `processed_events (event_id, handler)` — a handler claims the pair
before acting; a redelivery finds the row and does nothing. `OutboxDispatchTest` proves a
redelivered counted play counts once.

## The privacy rule (verbatim, plan §1 day 2)

> Events with `private: true` must be excluded from listening history, from recommendation
> features, and from the friend-activity feed.

The gateway already applies it to the Postgres interim history (`PrivateSessionConformanceTest`,
6 cases) and still emits the event, flagged. Every consumer of `playback.events.v1` enforces it
again; it is a contract-conformance test in each pipeline, not a code-review comment.

## Documented drift (implementation ≠ plan, recorded here, not silently fixed)

| # | Finding | Smallest correction |
|---|---|---|
| K1 | ~~`playback.events.v1` rows carried two different `event_id`s.~~ **Resolved in 1.1.0:** `OutboxWriter.append(…, eventId)`; the payload's id is the row's id. `PlaybackSubmission.eventId` is now typed `UUID` (the Kafka contract always said `format: uuid`). Proven by `PrivateSessionConformanceTest.oneEventIdPerEvent`. | — |
| K2 | `event_id` appears inside the payload for playback but not for library or playlist events. | Adopted rule: **the envelope carries `event_id`**. Payload copies are permitted, must be equal (K1). |
| K3 | `device` is free text; the plan enumerates `web \| ios \| android`. Nothing validates it. | Schema documents it as a string with recommended values. Tightening it is an RFC. |
| K4 | `outbox.event_type` holds the topic name; the event *name* (`liked`, `deleted`) is inside the payload as `action` or shape. | Documented as-is. Consistent with Debezium's router. |
| K5 | ~~`HomeSectionCache.invalidateAll()` had no caller.~~ **Resolved in 1.1.0:** `HomeCacheInvalidationHandler` consumes `catalog.playlist.v1`. | — |
