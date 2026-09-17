# Audio contract — `audio.transcode.v1` and the serving side

**Status:** serving side IMPLEMENTED; ingest side (upload, worker, storage, CDN) NOT IMPLEMENTED.
Owner: workstream D. Source: plan §11, and the columns of `media_items` / `media_assets`, which
were designed from it. Message schemas: `../kafka/audio.transcode.v1/schema.json`.

## Media identity

One `media_items` row is the unit of work. Its `id` is the Kafka key, the storage-key prefix,
and the join to `media_assets`. Two file classes:

| Class | Where | Key layout | Served? |
|---|---|---|---|
| Master (WAV/FLAC, lossless) | `adventwave-masters` bucket, archive tier after 30d | `masters/{media_item_id}/original.{ext}` → `media_items.master_storage_key` | never |
| Derivative (AAC in M4A, `+faststart`) | `adventwave-derived` bucket, CDN origin | `derived/{media_item_id}/{profile}.m4a` → `media_assets.storage_key` | signed URLs only |

Deterministic keys are what make a retry idempotent: a re-run overwrites identically, and
`media_assets (media_item_id, profile)` is UNIQUE, so a poison message cannot half-publish.

## Input — `requested`

Produced by the upload service after a presigned PUT lands the master (a 200 MB WAV never
traverses the API). Fields: `event_id`, `media_item_id`, `media_type`, `master_storage_key`,
`ladder`, `attempt` (1..3), `requested_at`.

`ladder` is `BitrateLadder.ladderFor(media_type)` — already in the codebase:

| `media_type` | ladder | profiles |
|---|---|---|
| `song` | `music_v1` | `aac_24_hev2` 24k HE-AACv2 · `aac_96` · `aac_160` · `aac_320` (AAC-LC) |
| `sermon`, `podcast` | `speech_v1` | `aac_24_hev2` · `aac_64` · `aac_128` |

Open decision, unchanged since the plan: HE-AACv2 needs `libfdk_aac` (non-redistributable
ffmpeg build). Internal container image is fine; the fallback is `aac_64` as the low tier. D
decides; the enum in the schema is updated by RFC if the 24k tier is dropped.

## Worker steps (order matters)

1. **probe** — duration, channels, sample rate from the master. Never hardcode either; mono
   masters stay mono (double bitrate spent on identical channels otherwise), sample rate capped
   at 48 kHz.
2. **encode + measure** — one ffmpeg pass fans out to every profile *and* `ebur128` loudness.
   Decode the master once, not once per profile.
3. **verify** — every output probed before upload: codec matches profile; duration within
   ±100 ms of the master; channels and sample rate match the probe; `byte_size` read from the
   file, never computed. A truncated encode that is still a valid file is the failure most
   likely to reach a listener.
4. **waveform** (optional) — `waveform.json` for the scrubber.
5. **upload** to deterministic keys.
6. **emit `completed`.**

Two things the worker must **not** do: re-encode to normalise loudness (measure once, the client
applies gain), and trim silence (`silenceremove` cuts room tone, fade-ins and a cappella
intros — flag `long_leading_silence` / `long_trailing_silence` for review instead).

## Output — `completed`

`status: completed` carries `duration_ms`, `loudness_lufs`, `true_peak_dbfs`, and `assets[]`
(one per profile; fields match `media_assets` columns one-to-one) plus optional review `flags`.
`status: failed` carries `error {code, message, stage}` and empty `assets`.

**Consumer (workstream A)**, in one transaction: insert `media_assets` rows; write
`loudness_lufs`, `true_peak_dbfs` to `media_items`; set `status = 'published'`. The last step is
refused by the database — trigger `media_items_publication_gate` — unless the item's licence is
`granted`. That check is not application logic and cannot be routed around. On `failed`,
`status = 'failed'`, surfaced in the admin portal. Retries: 3 with exponential backoff, then
`audio.transcode.v1.dlq`.

## Serving — what exists today

`GET /v1/media/{id}/stream` → `StreamManifestDto`:

```
media_item_id, duration_ms, loudness_lufs, target_lufs (-14.0), gain_db (= target − loudness),
waveform_url (null today), selected_profile, audio_url (signed, 5 min), expires_at_epoch_seconds,
profiles[] {profile, bitrate_kbps, byte_size, codec}
```

`selected_profile` = `BitrateLadder.resolveProfile(media_type, user_settings.audio_quality)`,
falling back to the lowest available profile. **One signed URL per manifest**, not one per
profile — four times the leak surface otherwise. The URL is
`GET /v1/media/{id}/stream/{profile}?exp&uid&sig`, HMAC-SHA256 over `id|profile|uid|exp`,
verified in constant time, then **302** to the bytes. No HLS/DASH: whole files plus HTTP range
requests.

The client applies `gain_db` only when the listener's `normalizeAudio` setting is on, attenuating
only (`true_peak_dbfs` exists because lossy decoders can overshoot 0 dBFS).

## Documented drift

| # | Finding | Smallest correction |
|---|---|---|
| A1 | The 302 target for a real asset is `{api-base-url}/media-storage/{storage_key}` (`StreamService.storageUrl`). **Nothing serves that path.** Today every item has no `media_assets` row and falls back to `seed_source_url` with a warning. | Make the derived-bucket/CDN origin a config property (`adventwave.catalog.media-origin-url`) that D's provisioning sets; the placeholder path is a dev-only default. |
| A2 | `waveform_url` is always `null`; `media_assets` has no row type for `waveform.json`. | Either a `waveform_storage_key` column on `media_items` or a pseudo-profile row. RFC when D builds step 4. |
| A3 | `profile` values are a comment on `media_assets.profile`, not a CHECK constraint; the enum lives in `BitrateLadder` and now in the schema. | Add the CHECK when the ladder decision (libfdk) is final. |
