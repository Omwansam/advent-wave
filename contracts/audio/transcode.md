# Audio contract — `audio.transcode.v1` and the serving side

**Status:** implemented locally end to end (1.3.0, RFC 0001). The admin portal uploads a master through `POST /v1/admin/media/{id}/upload` (a signed URL the browser PUTs to; locally the gateway's own streaming endpoint), `POST /v1/admin/media/{id}/transcode` emits `requested`, the gateway's `LocalTranscodeWorker` consumes it and runs `backend/tools/transcode.py`, and `TranscodeCompletedHandler` consumes the `completed` it produces. Storage is a local directory and the gateway is the media origin in the `local` profile (A1). Since 1.6.0 ([RFC 0006](../rfcs/0006-object-storage.md)) storage can also be S3-compatible object storage (`adventwave.storage.mode=s3`): a presigned PUT to the masters bucket, the worker staging the master from it and uploading every derived file to the derived bucket before `completed` is delivered, and the manifest hands the player a presigned GET on the derived bucket directly (RFC 0006 amendment, 2026-10-22; the signed redirect remains for local storage). The CDN in front of the derived bucket and the worker as its own service are NOT IMPLEMENTED.
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

**Interim, as implemented (RFC-1):** no build has `libfdk_aac`, so the worker emits `aac_64` in
place of `aac_24_hev2`: songs get `aac_64 · aac_96 · aac_160 · aac_320`, speech `aac_64 · aac_128`.
Both are in the schema's enum already. `BitrateLadder` still names `aac_24_hev2`;
`data_saver` listeners fall back to the lowest available profile, which is `aac_64`.

## Worker steps (order matters)

A transcode request must name the item's own master, `masters/{media_item_id}/original.{ext}`;
any other key is refused with 400 (RFC 0002). One run per item at a time: the tool holds a lock
on `work/{media_item_id}/`.

1. **probe** — duration, channels, sample rate from the master. Never hardcode channels; mono
   masters stay mono (double bitrate spent on identical channels otherwise). Every derivative is
   resampled to **44.1 kHz** (`aresample`, soxr when the build has it), so each asset has one
   known rate; a 44.1 kHz master passes through untouched. A video container's audio stream is
   copied out bit-exact at ingest; the picture is not kept.
2. **encode + measure** — one ffmpeg pass fans out to every profile *and* `ebur128` loudness.
   Decode the master once, not once per profile. The meter taps the master before the
   resampler, so `loudness_lufs` describes the master itself. `silencedetect` runs in the same
   pass (−50 dBFS for 3 s or more at either end → a review flag).
3. **verify** — every output probed before upload: codec matches profile; duration within
   ±100 ms of the master; channels match the probe; sample rate is 44100; `byte_size` read from
   the file, never computed. A truncated encode that is still a valid file is the failure most
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

### Review flags and failure reasons (1.3.0)

What a human acts on is stored with the item and shown in the admin portal's review queue:

- `media_items.review_flags` (`TEXT[]`, default empty) holds the last `completed` message's
  `flags` — `lossy_master`, `long_leading_silence`, `long_trailing_silence`. Written when the
  outputs are stored, replaced by every completed run. Flags never block publication and are
  never corrected automatically.
- `media_items.failure_reason` holds a `failed` message's `error.message` and `error.stage`
  (`"<message> (stage <stage>)"`). Cleared when outputs are stored.
- Requesting a new transcode clears both: until the new run lands there is no verdict.
- Both are on `AdminMediaItemDto` as `reviewFlags` and `failureReason`.

### The local worker (1.3.0)

`LocalTranscodeWorker`, enabled only by `adventwave.audio.local-worker-enabled` (the `local`
profile), plays workstream D on one machine. `TranscodeRequestedHandler` claims each `requested`
event and hands the job over after the claim commits; the worker runs one job at a time,
`transcode.py run` without `--deliver`, and appends the message the tool prints to the outbox
with its own `event_id`. A `failed` message from the tool is final. A crash, a timeout
(`transcode-timeout`, 60 min) or unreadable output is retried after 30 s and 2 min; after the
third attempt the worker appends `failed` (`encode_failed`, stage `encode`) saying what happened —
there is no DLQ locally. At startup it re-enqueues every `processing` item whose latest
`requested` has no later `completed`; deterministic outputs make the re-run safe.

### Upload (1.3.0)

`POST /v1/admin/media/{id}/upload` `{filename, contentType, sizeBytes}` returns
`{uploadUrl, method: PUT, masterStorageKey, expiresAt}` for `masters/{id}/original.{ext}` (wav,
flac, aif, aiff, mp3, m4a, aac, ogg, opus, mp4, mov, webm). Draft or failed items only; 409 if a
master exists — masters are never replaced. Locally the URL is the gateway's
`PUT /v1/uploads/{id}?key&exp&sig` (HMAC over `id|key|exp`, 10 minutes), which streams the body
to a partial file and renames it into place once every declared byte has arrived. Production
returns a presigned PUT to the masters bucket from the same call (`MasterUploads`).

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
| A1 | **Corrected.** The 302 target for a real asset is `{media-origin-url}/{storage_key}`. `adventwave.catalog.media-origin-url` (env `ADVENTWAVE_MEDIA_ORIGIN_URL`) is the CDN origin D's provisioning sets; unset, it is `{api-base-url}/media-storage`, which only the `local` profile answers: with `adventwave.catalog.local-media-root` set (default `~/media`, env `ADVENTWAVE_MEDIA_ROOT`) the gateway serves `{root}/derived/` at `/media-storage/derived/**`, unauthenticated like a CDN origin, with range requests. Masters are never mapped. | Provisioning sets `media-origin-url`; the local origin is never enabled outside `local`. With `storage.mode=s3` (1.6.0) the target is instead a presigned GET on the derived bucket, valid for the item's duration plus 30 minutes, and `media-origin-url` is not used. |
| A2 | `waveform_url` is always `null`; `media_assets` has no row type for `waveform.json`. | Either a `waveform_storage_key` column on `media_items` or a pseudo-profile row. RFC when D builds step 4. |
| A3 | `profile` values are a comment on `media_assets.profile`, not a CHECK constraint; the enum lives in `BitrateLadder` and now in the schema. | Add the CHECK when the ladder decision (libfdk) is final. |
