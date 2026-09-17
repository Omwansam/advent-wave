# Kafka contract

**Status: 3 of 6 topics IMPLEMENTED (as outbox rows), 3 PLANNED. No broker, no schema registry, no consumer exists.**

Each topic directory holds `schema.json` (JSON Schema 2020-12) for the message **value**. Every
file under `../examples/kafka/` validates against its topic's schema; CI must re-run that check.
Examples for the implemented topics are real rows copied from the development database, not
hand-typed.

## Registry

| Topic | Key | Compacted | Producer | Consumers | Status |
|---|---|---|---|---|---|
| `playback.events.v1` | `user_id` | no (30d retention) | gateway `PlaybackIngestService` | C (Cassandra writer), F (features) | **implemented** |
| `library.events.v1` | `user_id` | no | platform-core `LibraryService` | F | **implemented** |
| `catalog.playlist.v1` | `playlist_id` | yes | platform-core `LibraryService` | B (search index), F | **implemented** |
| `catalog.media.v1` | `media_item_id` | yes | *none yet* — ingest path (A/H), transcode consumer (A) | B, F | planned |
| `catalog.artist.v1` | `artist_id` | yes | *none yet* — ingest path (A) | B, F | planned |
| `audio.transcode.v1` | `media_item_id` | no | *none yet* — D upload service / worker | A | planned |

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

## The privacy rule (verbatim, plan §1 day 2)

> Events with `private: true` must be excluded from listening history, from recommendation
> features, and from the friend-activity feed.

The gateway already applies it to the Postgres interim history (`PrivateSessionConformanceTest`,
6 cases) and still emits the event, flagged. Every consumer of `playback.events.v1` enforces it
again; it is a contract-conformance test in each pipeline, not a code-review comment.

## Documented drift (implementation ≠ plan, recorded here, not silently fixed)

| # | Finding | Smallest correction |
|---|---|---|
| K1 | `playback.events.v1` rows carry **two different `event_id`s**: `payload.event_id` (from the client submission or generated in `PlaybackIngestService`) and `outbox.event_id` (generated again in `OutboxEvent`). A consumer deduping on the header and one deduping on the body disagree. | `OutboxWriter.append` takes an optional event id; `PlaybackIngestService` passes the payload's. One line each. |
| K2 | `event_id` appears inside the payload for playback but not for library or playlist events. | Adopted rule: **the envelope carries `event_id`**. Payload copies are permitted, must be equal (K1). |
| K3 | `device` is free text; the plan enumerates `web \| ios \| android`. Nothing validates it. | Schema documents it as a string with recommended values. Tightening it is an RFC. |
| K4 | `outbox.event_type` holds the topic name; the event *name* (`liked`, `deleted`) is inside the payload as `action` or shape. | Documented as-is. Consistent with Debezium's router. |
| K5 | `HomeSectionCache.invalidateAll()` exists and has no caller. The plan says invalidation rides `catalog.*`. | It is the intended consumer hook for `catalog.playlist.v1`. Not a G0 item. |
