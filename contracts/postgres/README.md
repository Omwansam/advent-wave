# PostgreSQL contract

**Status: IMPLEMENTED.** 18 tables, 1 trigger, 2 extensions. Owner: workstream A.

| File | What it is | Who edits it |
|---|---|---|
| `schema.sql` | The applied schema, dumped from a Flyway-migrated PostgreSQL 16 by `backend/tools/dump-schema.sh` | nobody — regenerate |
| `backend/contracts/src/main/resources/db/migration/V1__core_schema.sql` | The DDL, with the reasoning for every decision in comments | workstream A, by RFC |
| `V2__seed_reference_catalogue.sql`, `V3__seed_demo_accounts.sql` | Development fixtures. Not contract. Deleted when workstream H ships real content. | — |

The migrations are the executable form; `schema.sql` is the frozen result. CI must migrate an
empty database and diff the dump against this file — a migration that changes a table without a
contract version bump is how drift starts.

## Rules that are enforced in the database, not in code

These are the ones a consumer can rely on without reading Java.

- **No item is published without a granted licence.** Trigger `media_items_publication_gate`
  refuses `status = 'published'` unless `license_id` points at a `licenses` row with
  `consent_status = 'granted'` and an unexpired `expires_at`. Fires on INSERT and on UPDATE of
  `status` or `license_id`. Tested by `PublicationGateTest` (5 cases).
  The trigger checks only at the moment of publication; a licence revoked or expired later
  withdraws its items through the gateway (RFC 0002: on the status change, and by
  `LicenceExpirySweep` for `expires_at`).
- **A curated playlist has no owner.** `playlists_curated_has_no_owner`.
- **One transcode output per profile per item.** `media_assets (media_item_id, profile)` UNIQUE.
  This is what makes transcode retries idempotent (audio contract §runtime).
- **Liked Songs and Saved Sermons are one table.** `user_likes.collection` is the discriminator;
  the primary key includes it.
- **Artist names are unique.** The client's `followedArtistNames` can be resolved to ids.
- **One listening-history row per (user, item).** `listening_history_user_item_unique`. This is
  "last played", not a play log — see the Cassandra contract for how that changes.
- **`player_state.queue` holds ids, never objects.** JSONB array of media item id strings.
- **One resume point per (user, item), sermons and podcasts only.** `listening_progress_pkey`;
  the gateway refuses songs (RFC 0003). Not listening history: a private session does not
  suppress it, and it has no outbox row.

## State transitions

`media_items.status`: `draft → processing → published → withdrawn | failed`.

Only the transition **into `published`** is guarded, by the trigger above. No application code
transitions status today: there is no ingest or admin path. The seed inserts items directly as
`published` against a granted seed licence. Workstream D's transcode consumer (audio contract)
is the first thing that will move an item `processing → published`.

## The outbox

```
outbox (id BIGSERIAL, event_id UUID UNIQUE, aggregate_type, aggregate_id TEXT,
        event_type TEXT, payload JSONB, created_at, published_at NULL)
```

Every write that changes library or catalogue state appends a row **in the same transaction**
(`OutboxWriter` is `@Transactional(MANDATORY)`; `OutboxAtomicityTest` proves the rollback
direction). `event_type` holds the **Kafka topic name**; `aggregate_id` is the Kafka key;
`event_id` is the idempotency key. See `../kafka/README.md` for the envelope.

`published_at` is set by whatever publishes the row. Since 1.1.0 that is the interim
`OutboxDispatcher` (`../kafka/README.md` → Consumers); Debezium takes over the same column.

## Deviations from the plan's starting DDL

All additive. Each is annotated `ADDED` in V1 with its reason.

| Addition | Why |
|---|---|
| `user_settings.crossfade_sec`, `.audio_quality` | The client persists both; the stream endpoint needs the quality to resolve a profile |
| `user_likes.collection` | Resolves plan §1 day 1 open question 1 |
| `media_items.legacy_id`, `playlists.legacy_id` | Cross-reference to `mockData.js` during migration; makes seeding idempotent. Removable after WS G/H. |
| `media_items.seed_source_url` | Placeholder audio for items with no `media_assets`. Removable after WS D/H. |
| `discover_category_items` | The client's Discover page had a hardcoded id map; it needed a home |
| `listening_history` | Interim for Cassandra `listening_history_by_user`; accessed only via `ListeningHistoryRepository` |
| `outbox.event_id` | Consumers are idempotent on it (plan §6) |
| `play_counts_by_item_day`, `play_counts_by_artist_day` (1.1.0) | Interim for the Cassandra tables of the same name and columns; written only by `PlayCountRecorder`, read only by `TrendingService` |
| `processed_events` (1.1.0) | **Permanent, not interim.** `(event_id, handler)` claims — how a consumer is idempotent under any transport |
| `listening_progress` (1.4.0) | Per-item resume points for sermons and podcasts, [RFC 0003](../rfcs/0003-listening-progress.md); `player_state` keeps only the current item's |

## Not in the schema

- No roles, no admin users, no audit log. Authorization is ownership only.
- `churches` and `licenses` have no JPA entity and no endpoint — they are written by the seed
  and read by the trigger. Workstream H's ingest path will be the first application writer.
