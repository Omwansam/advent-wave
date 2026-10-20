# `catalog.media.v1`

**Status: IMPLEMENTED.** Key: `media_item_id`. Compacted.

Current state of one media item, or its withdrawal. The first producer is the ingest/admin path (workstream A/H) and the transcode consumer that flips status to published (workstream D → A). Fields mirror media_items columns; changing them is an RFC. Compacted by media_item_id.

- **Producer:** gateway CatalogAdminService + TranscodeCompletedHandler via outbox (every status change); MediaTextAdminService re-announces the item, payload unchanged, when its lyrics or chapters change (RFC 0004)
- **Consumers:** workstream B (search index), workstream F
- **Source of truth for the payload:** `media_items columns in contracts/postgres/schema.sql`

## Message shapes

### single shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `media_item_id` | string (uuid) | yes |  |
| `media_type` | string enum ['song', 'sermon', 'podcast'] | yes |  |
| `title` | string | yes |  |
| `artist_id` | string (uuid) | yes |  |
| `album_id` | string (uuid) | no | Omitted when the item has no album. |
| `duration_ms` | integer | yes |  |
| `cover_url` | string | no |  |
| `genre` | string | no |  |
| `language` | string | no |  |
| `region` | string | no |  |
| `popularity` | integer | no |  |
| `status` | string enum ['draft', 'processing', 'published', 'withdrawn', 'failed'] | yes | Consumers index only 'published'. The publication gate trigger guarantees a granted licence behind it. |
| `published_at` | string (date-time) | no |  |
| `updated_at` | string (date-time) | yes |  |

### `deleted` = `True`

| Field | Type | Required | Notes |
|---|---|---|---|
| `media_item_id` | string (uuid) | yes |  |
| `deleted` | boolean const `True` | yes |  |

## Examples

See `../../examples/kafka/catalog.media.v1.*.json`. Real outbox rows.
