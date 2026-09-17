# `library.events.v1`

**Status: IMPLEMENTED.** Key: `user_id`. Not compacted.

A change to one user's library: a like toggled, an artist or playlist followed or unfollowed. Three shapes, discriminated by `action`. The envelope (outbox row) carries event_id and created_at; the payload does not repeat them.

- **Producer:** platform-core LibraryService via outbox
- **Consumers:** workstream F (features)
- **Source of truth for the payload:** `backend/platform-core/src/main/java/org/adventwave/platform/library/LibraryService.java`

## Message shapes

### `action` ∈ ['liked', 'unliked']

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |
| `action` | string enum ['liked', 'unliked'] | yes |  |
| `media_item_id` | string (uuid) | yes |  |
| `collection` | string enum ['liked_songs', 'saved_sermons'] | yes |  |

### `action` ∈ ['followed_artist', 'unfollowed_artist']

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |
| `action` | string enum ['followed_artist', 'unfollowed_artist'] | yes |  |
| `artist_id` | string (uuid) | yes |  |

### `action` ∈ ['followed_playlist', 'unfollowed_playlist']

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |
| `action` | string enum ['followed_playlist', 'unfollowed_playlist'] | yes |  |
| `playlist_id` | string (uuid) | yes |  |

## Examples

See `../../examples/kafka/library.events.v1.*.json`. Real outbox rows.
