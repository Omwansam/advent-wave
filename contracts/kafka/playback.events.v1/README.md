# `playback.events.v1`

**Status: IMPLEMENTED.** Key: `user_id`. Not compacted.

One playback observation, as ingested by POST /v1/events/playback. The server computes counted, duration_ms, media_type and private; the client cannot set them. Emitted even when private=true, flagged, so every consumer can honour the rule: private events reach neither listening history nor recommendation features nor the friend feed.

- **Producer:** gateway PlaybackIngestService via outbox
- **Consumers:** workstream C (Cassandra writer), workstream F (features)
- **Source of truth for the payload:** `backend/contracts/src/main/java/org/adventwave/contracts/events/PlaybackEvent.java`

## Message shapes

### single shape

| Field | Type | Required | Notes |
|---|---|---|---|
| `event_id` | string (uuid) | yes | Idempotency key. Client-supplied via PlaybackSubmission.eventId, else generated at ingest. |
| `user_id` | string (uuid) | yes | From the JWT, never from the request body. |
| `media_item_id` | string (uuid) | yes |  |
| `media_type` | string enum ['song', 'sermon', 'podcast'] | yes | From the catalogue row, not the request. |
| `session_id` | string (uuid) | no | One per listening session (client-defined). Omitted when the client sent none. |
| `event_type` | string enum ['play_started', 'play_progress', 'play_completed', 'skipped'] | yes |  |
| `ms_played` | integer | yes |  |
| `duration_ms` | integer | yes | From media_items.duration_ms. |
| `counted` | boolean | yes | PlayCountingPolicy: ms_played >= 30000 OR ms_played >= duration_ms * 0.5. What is reported to contributing churches. |
| `private` | boolean | yes | user_settings.private_session at ingest time. MUST be honoured by every consumer. |
| `device` | string | no | Free text from the client. Recommended values: web, ios, android. Not validated server-side (see drift K3). |
| `client_ts` | string | no | Client wall clock, ISO 8601 by convention. Not validated server-side. |
| `server_ts` | string (date-time) | yes | Ingest time. Authoritative for ordering within a key. |

## Examples

See `../../examples/kafka/playback.events.v1.*.json`. Copied from real outbox rows.
