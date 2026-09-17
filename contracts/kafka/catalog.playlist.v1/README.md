# `catalog.playlist.v1`

**Status: IMPLEMENTED.** Key: `playlist_id`. Compacted.

Current state of one playlist, or its deletion. Compacted by playlist_id: the newest message per key is the truth, and a tombstone is an explicit {deleted:true} message rather than a null value, so it survives the outbox (JSONB NOT NULL).

- **Producer:** platform-core LibraryService via outbox
- **Consumers:** workstream B (search index), workstream F
- **Source of truth for the payload:** `backend/platform-core/src/main/java/org/adventwave/platform/library/LibraryService.java`

## Message shapes

### single shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `playlist_id` | string (uuid) | yes |  |
| `owner_id` | string | yes | UUID of the owner, or the empty string for a curated playlist (Map.of cannot hold null). |
| `title` | string | yes |  |
| `description` | string | yes | Empty string when unset. |
| `is_curated` | boolean | yes |  |
| `is_public` | boolean | yes |  |
| `song_ids` | array of uuid | yes | Ordered by playlist_items.position. |

### `deleted` = `True`

| Field | Type | Required | Notes |
|---|---|---|---|
| `playlist_id` | string (uuid) | yes |  |
| `deleted` | boolean const `True` | yes |  |

## Examples

See `../../examples/kafka/catalog.playlist.v1.*.json`. Real outbox rows.
