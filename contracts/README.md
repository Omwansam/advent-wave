# AdventWave contracts

**This directory is the source of truth for every interface between AdventWave components.**
Version: see [`VERSION`](VERSION). A service may consume these files; it may never vendor,
fork, or reinterpret them. Where a service and a contract disagree, the contract is right until
an RFC says otherwise — and the disagreement is recorded, never silently patched on either side.

## Layout

| Path | Contract | Status at 1.0.0 | Generated from |
|---|---|---|---|
| [`postgres/`](postgres/) | Schema, constraints, trigger, outbox | **implemented** | `backend/tools/dump-schema.sh` (pg_dump of a migrated DB) |
| [`openapi/adventwave.yaml`](openapi/adventwave.yaml) | The public REST surface, 31 operations | **implemented** | `backend/tools/dump-openapi.sh` (springdoc, from the running gateway) |
| [`kafka/`](kafka/) | Six topics, JSON Schema per message value | 3 implemented, 3 planned | `playback.events.v1`, `library.events.v1`, `catalog.playlist.v1` from the event classes and `LibraryService`; the rest from the plan and table columns |
| [`redis/`](redis/) | Key registry, TTLs, owners | **implemented** | `RedisKeys.java` + call sites |
| [`cassandra/`](cassandra/) | History and play-count tables | **planned** (Postgres interim) | plan §1 day 4 |
| [`proto/`](proto/) | gRPC service contracts | **deferred** — no service boundary exists | one README per service, mapping planned RPCs to the Java that backs them |
| [`audio/transcode.md`](audio/transcode.md) | Transcode worker input/output, serving | serving implemented, ingest planned | plan §11 + `media_assets` |
| [`examples/`](examples/) | Kafka messages and API responses | — | real outbox rows and live API responses; constructed where nothing exists yet |

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

## Known drift at 1.0.0

Every place the implementation and the plan disagree is recorded in the relevant contract's
"Documented drift" table with the smallest correction. None is silently resolved. Summary:

| Id | Where | One line |
|---|---|---|
| K1 | kafka | `playback.events.v1` carries two different `event_id`s (payload vs outbox row) |
| K2 | kafka | `event_id` placement differs by topic; rule adopted: envelope carries it |
| K3 | kafka | `device` is unvalidated free text |
| O1–O3 | openapi | three error paths return 500 instead of 400/404 (missing query param, FK violation, unreadable body) |
| O7 | openapi | operationId `playback_1` is a springdoc collision suffix (two controller methods named `playback`) |
| R1 | redis | `a:player:dirty` hardcoded, absent from `RedisKeys.java` |
| A1–A3 | audio | 302 target path unserved; no waveform row type; profile enum not a CHECK |
| C1 | cassandra | interim history is one-row-per-item; target is one-row-per-play |

## Ownership

| Contract | Owner |
|---|---|
| postgres, redis `a:*`, kafka `library.events`, `catalog.playlist`, `playback.events` (producer), openapi | workstream A |
| kafka `catalog.media`, `catalog.artist` (as index consumer), redis `b:*`, proto `catalog`/`search` | workstream B |
| kafka consumers, cassandra, redis `c:*` | workstream C |
| audio, kafka `audio.transcode`, redis `d:*`, proto `media` | workstream D |
| proto `recommendation`, redis `f:*` | workstream F |
| this README, `VERSION`, the review board | tech lead |
