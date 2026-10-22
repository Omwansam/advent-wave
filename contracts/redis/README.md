# Redis contract

**Status: IMPLEMENTED (5 keys in use, 6 reserved).** Executable form: `org.adventwave.contracts.redis.RedisKeys`.

`keys.md` is the registry — every namespace, its owner, TTL, and whether it is in use. This file
adds what the audit found by reading each call site.

## What actually touches Redis today

| Key | Value type | Writer → Reader | TTL | How it becomes stale |
|---|---|---|---|---|
| `a:player:{user_id}` | STRING, JSON of `PlayerStateService.Buffered` | `PlayerStateService.save` → `.get`, `.flushBuffer` | 24h | Overwritten on every save; flushed to Postgres every `adventwave.player.flush-interval-ms` (30s). **Documented loss window: ≤30s of playback position.** Queue, volume, shuffle survive in Postgres from the previous flush. |
| `a:player:dirty` | SET of user_id | `.save` adds → `.flushBuffer` drains | none | Drained each flush; a failed flush re-adds the id |
| `a:home:{trending \| sermons \| sabbath-worship}` | STRING, JSON `TrackDto[]` / `PlaylistDto[]` | `HomeSectionCache` | 5m ±20% jitter | **TTL only.** `invalidateAll()` exists and has no caller — it is the hook for a `catalog.*` consumer (K5). |
| `a:site:showcase` | STRING, JSON `SiteDto` | `SiteCache.showcase` (RFC 0008) | 30m ±20% jitter | Dropped by `SiteCacheInvalidationHandler` on every `catalog.media.v1`, `catalog.artist.v1` and `catalog.playlist.v1` message; built from the `a:home:*` rails plus three count queries. A read or write failure is a cache miss. |
| `a:ratelimit:{user_id}:events-playback` | STRING counter (INCR) | `RateLimiter.allow` | 1m, set on first increment | Fixed window. Limit `adventwave.events.playback-per-minute` (240). **Fails open** on Redis error — dropping playback events would corrupt what is reported to churches. |

Reserved but unused (`a:friendfeed`, `b:media`, `b:typeahead`, `c:trending`, `f:reco`,
`d:playsession`): defined in `RedisKeys` so the namespace is held; owners in `keys.md`.

## The guardrail, and evidence it holds

**Redis is a cache and a write buffer, never a source of truth.** Every call site catches its
own failure and falls through to Postgres: the gateway ran an entire integration session with no
Redis process at all, and `application-local.yml` disables the Redis health indicator for
exactly that reason. Flushing Redis must not fail any end-to-end test; the only data at risk is
the ≤30s player-position window above.

## Documented drift

| # | Finding | Smallest correction |
|---|---|---|
| R1 | ~~`a:player:dirty` was a string literal in `PlayerStateService`.~~ **Resolved in 1.1.0:** `RedisKeys.PLAYER_DIRTY`. | — |
