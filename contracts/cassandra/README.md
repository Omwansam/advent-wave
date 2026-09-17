# Cassandra contract

**Status: NOT IMPLEMENTED — planned for workstream C.** `schema.cql` is the target, taken from
plan §1 day 4; nothing in the codebase reads or writes Cassandra.

## What stands in for it today

`listening_history` in PostgreSQL (`../postgres/schema.sql`), written by
`ListeningHistoryService.record` from `PlaybackIngestService`, read by `GET /v1/history` and by
the home page's "Recently played" rail. It is reached only through `ListeningHistoryRepository`.

## The semantic difference — decide this before the swap, not during it

| | PostgreSQL interim | Cassandra target |
|---|---|---|
| Rows per (user, item) | **One.** `UNIQUE (user_id, media_item_id)`; a replay upserts: `played_at = now()`, `ms_played = max(old, new)`, `completed = old OR new` | **One per play.** Clustering on `played_at` |
| Meaning | "When did I last play this" | "Everything I played, in order" |
| Bound | `trimToNewest(100)` after each write | TTL (proposed 90d) + `LIMIT 100` on read |
| Effect on the client | Recently-played never shows the same track twice | Would, unless the reader deduplicates |

The client's `ListeningHistory` page was written against the first semantics. Moving to the second
without deduplicating on read changes what users see. This is an RFC item for workstream C, not
a migration detail.

## Requirements every writer inherits

- **Privacy.** Write only when the event has `counted = true` **and** `private = false`. The
  gateway already applies this rule to the interim table (`PrivateSessionConformanceTest`); the
  Cassandra writer applies it again on the event. It is a conformance test in C's pipeline.
- **Idempotency.** Consumers dedupe on the envelope `event_id` (`../kafka/README.md`). A replayed
  event must not produce a second history row or a second counter increment.
- **Play counts** — since 1.1.0 the two `play_counts_by_*` tables exist in PostgreSQL with the
  CQL's column names (`plays` as an integer the writer increments), written by
  `PlayCountRecorder` from `playback.events.v1` and read by `TrendingService`. "Trending now" is
  real: most-played over the last 7 days, filled with static `popularity` while counts are thin.
  The Cassandra writer inherits the same three rules the interim applies, in this order:
  1. `private: true` is never counted;
  2. only `counted: true` events count — the server's verdict, not re-derived;
  3. **one listen, one count:** only terminal events (`play_completed`, `skipped`) increment.
     `play_progress` events can also clear the threshold, so counting them would count a single
     listen several times. Proven by `OutboxDispatchTest.progressEventsDoNotDoubleCount`.
  The `day` is `server_ts` in UTC.
