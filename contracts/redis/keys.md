# Redis key-namespace registry

Six workstreams sharing one Redis without a registry is a guaranteed collision. Every key is
`{ws}:{purpose}:{id}` with a declared owner and TTL. The executable copy of this table is
`org.adventwave.contracts.redis.RedisKeys` — add a key there, not only here.

| Key pattern | Owner | TTL | Purpose | Implemented |
| --- | --- | --- | --- | --- |
| `a:player:{user_id}` | A | 24h, flushed to PG every 30s | Player-state write buffer | yes — `PlayerStateService` |
| `a:player:dirty` | A | none (drained each flush) | Set of listeners with unflushed state | yes — `PlayerStateService` |
| `a:home:{segment}` | A | 5m ±20% jitter | Assembled shared home sections | yes — `HomeSectionCache` |
| `a:ratelimit:{user_id}:{route}` | A | 1m | Fixed-window limiter, esp. `/v1/events/playback` | yes — `RateLimiter` |
| `a:friendfeed:{user_id}` | A | 10m | Backs `FriendActivityPanel` | not used — since 1.6.0 (RFC 0007) `GET /v1/friends` reads Postgres (`listener_activity`), one indexed query per minute per open app; held for when that stops being cheap |
| `b:media:{media_item_id}` | B | 1h + event-invalidated | Catalog read cache | not yet — catalogue is small enough to read through |
| `b:typeahead:{query_prefix}` | B | 15m | In front of Elasticsearch | not yet — no Elasticsearch yet |
| `c:trending:{region}:{day}` | C | 48h | Sorted set of live counts | not yet — workstream C |
| `f:reco:{user_id}` | F | 6h | Precomputed recommendations | not yet — v1 computes on request |
| `d:playsession:{session_id}` | D | 15m | Signed-URL / playback session tracking | not yet — workstream D |

## Two guardrails

**1. Redis is a cache and ephemeral state, never a source of truth.** Every key must be
reconstructible from Postgres or Cassandra. Flushing Redis in staging must not fail any
end-to-end test.

The single deliberate exception is `a:player:*`. Its documented loss window is **≤30 seconds of
playback position** — the flush interval, configured by `adventwave.player.flush-interval-ms`.
Nothing else in that buffer is unrecoverable: queue, volume and shuffle state all survive in
Postgres from the previous flush.

**2. Invalidation rides the existing Kafka contracts.** `catalog.*` topics are compacted and
already specified, so cache invalidation is a consumer of those topics rather than a new
mechanism. No workstream invents its own invalidation path.

## Degradation

Every Redis path in this codebase degrades rather than fails:

- `HomeSectionCache` — a read or write failure is a cache miss; the page is slower and correct.
- `PlayerStateService` — falls back to writing Postgres directly.
- `RateLimiter` — **fails open**. Dropping playback events during a cache outage would corrupt
  what we report to contributing churches; a brief unlimited window is the lesser harm.

That last one is a deliberate asymmetry. If the limiter is ever protecting something whose loss
matters less than its abuse, that choice has to be revisited for that route specifically.
