# `audio.transcode.v1`

**Status: PARTIAL.** Key: `media_item_id`. Not compacted.

Transcode job lifecycle for workstream D's worker. PARTIAL: `requested` is produced and `completed` is consumed; nothing produces `completed` until workstream D's worker exists. `requested` is produced by the upload service; `completed` by the worker and consumed by workstream A, which writes media_assets rows, the loudness fields, and moves status processing → published — which the database refuses without a granted licence. Keyed by media_item_id so a job and its result share a partition.

- **Producer:** requested: gateway CatalogAdminService (POST /v1/admin/media/{id}/transcode). completed: none yet — workstream D's worker
- **Consumers:** gateway TranscodeCompletedHandler (completed → media_assets, loudness, publish)
- **Source of truth for the payload:** `advent-wave/BACKEND_BUILD_PLAN.md §11.6 + media_assets columns`
- **Dead letter:** `audio.transcode.v1.dlq (planned)`

## Message shapes

### `kind` = `requested`

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string const `requested` | yes |  |
| `event_id` | string (uuid) | yes |  |
| `media_item_id` | string (uuid) | yes |  |
| `media_type` | string enum ['song', 'sermon', 'podcast'] | yes |  |
| `master_storage_key` | string | yes | masters/{media_item_id}/original.{ext}. Masters are never served and never deleted. |
| `ladder` | string enum ['music_v1', 'speech_v1'] | yes | BitrateLadder.ladderFor(media_type): songs → music_v1, sermons and podcasts → speech_v1. |
| `attempt` | integer | yes | 3 attempts with exponential backoff, then the dead-letter topic. |
| `requested_at` | string (date-time) | yes |  |

### `kind` = `completed`

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string const `completed` | yes |  |
| `event_id` | string (uuid) | yes |  |
| `media_item_id` | string (uuid) | yes |  |
| `status` | string enum ['completed', 'failed'] | yes |  |
| `duration_ms` | integer | no | Probed from the encode; must match the master within ±100 ms. |
| `loudness_lufs` | number | no | Integrated loudness measured once from the master (ebur128). → media_items.loudness_lufs |
| `true_peak_dbfs` | number | no | → media_items.true_peak_dbfs |
| `assets` | array of object | no | One per profile in the ladder. Empty on failure. |
| `flags` | array of string | no | Conditions for human review in the admin portal. Never auto-corrected (plan §11.1, §11.7). |
| `error` | object/null | no |  |
| `completed_at` | string (date-time) | yes |  |

Conditional: when `status` = `completed`, ['duration_ms', 'loudness_lufs', 'true_peak_dbfs', 'assets'] are also required; otherwise `error` is required.

## Examples

See `../../examples/kafka/audio.transcode.v1.*.json`. `requested` examples are real outbox rows from `POST /v1/admin/media/{id}/transcode`; `completed`/`failed` are constructed — no worker exists yet.
