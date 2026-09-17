# `catalog.artist.v1`

**Status: IMPLEMENTED.** Key: `artist_id`. Compacted.

Current state of one artist. Fields mirror artists columns. Compacted by artist_id.

- **Producer:** gateway CatalogAdminService via outbox (POST/PUT /v1/admin/artists)
- **Consumers:** workstream B, workstream F
- **Source of truth for the payload:** `artists columns in contracts/postgres/schema.sql`

## Message shapes

### single shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `artist_id` | string (uuid) | yes |  |
| `name` | string | yes | Unique across the catalogue (artists_name_unique). |
| `slug` | string | yes |  |
| `cover_url` | string | no |  |
| `bio` | string | no |  |
| `church_id` | string (uuid) | no | Contributing church. Omitted when unknown. |
| `verified` | boolean | yes |  |

### `deleted` = `True`

| Field | Type | Required | Notes |
|---|---|---|---|
| `artist_id` | string (uuid) | yes |  |
| `deleted` | boolean const `True` | yes |  |

## Examples

See `../../examples/kafka/catalog.artist.v1.*.json`. Real outbox rows.
