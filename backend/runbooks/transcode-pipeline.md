# Runbook — upload and transcode pipeline (local worker)

Scope: the `local` profile, where the gateway is the master store, the media origin and the
transcode worker (RFC 0001). Paths are relative to the media root (`ADVENTWAVE_MEDIA_ROOT`,
default `~/media`): `masters/{id}/` (never served, never replaced), `derived/{id}/` (served),
`work/{id}/` (staging, `ffmpeg.log`, `message.json`, the per-item lock).

Every worker line in the gateway log starts `transcode {id}:`. That and the item's page in the
admin portal (status timeline, failure reason, review flags) answer most questions.

## An item stays in `processing`

1. **Outputs stored, waiting on a licence.** The item page lists outputs but the status is
   `processing`. The transcode is done; publication was refused because the licence is not
   granted or has expired. Grant the licence (church page), then **Publish** on the item.
2. **Queued behind other work.** One item at a time; expect about 0.15× real time (a 5-minute
   song takes about 45 s, a 1-hour sermon about 9 minutes). Look for `queued` and `attempt 1
   started` lines for the items ahead of it.
3. **The gateway restarted mid-run.** On startup the worker re-queues every `processing` item
   whose latest `requested` has no `completed` after it. Nothing to do but wait for it.
4. **Waiting on an orphan.** If the gateway was killed hard (`kill -9`, the OOM killer), its
   `transcode.py` child keeps running, and the re-run logs `another run of this item is in
   progress; waiting for it to finish`. It continues once the orphan exits. To see it:
   `pgrep -af "transcode.py run --media-item-id {id}"`. Killing that process is safe: the waiting
   run then starts from scratch, and the output is deterministic.
5. **No worker.** `ADVENTWAVE_LOCAL_WORKER=false`, or a profile other than `local`: nothing
   consumes `requested`. Items wait for workstream D's service.

## An item is `failed`

The failure reason on the item page names the stage.

| Stage | Usual cause | Action |
|---|---|---|
| `probe` | Not audio, truncated, or an unreadable container | The master is never replaced: create a new item and upload a good file |
| `encode` | ffmpeg failed, or the worker crashed or timed out three times (30 s, then 2 min backoff; 60 min timeout per attempt) | `work/{id}/ffmpeg.log`, then **Retry transcode** |
| `verify` | An output's codec, duration (±100 ms), channels or 44.1 kHz rate was wrong, or the master is digital silence | `work/{id}/ffmpeg.log`; usually a damaged master: new item |

A definitive failure (probe, encode, verify) is reported once and not retried. Only a crash, a
timeout or unreadable output is retried.

## Upload refused

| Response | Meaning |
|---|---|
| 400 | Extension not accepted (wav, flac, aif, aiff, mp3, m4a, aac, ogg, opus, mp4, mov, webm), the declared size is over 4 GB, or fewer bytes arrived than `Content-Length` said (nothing stored: upload again) |
| 403 | The upload URL expired (10 minutes) or was altered: request a new one |
| 409 | The item is past `draft`/`failed`, an upload for it is already in progress, or its master is already stored. Masters are never replaced: new item |
| 411 / 413 | The PUT had no `Content-Length`, or a body over 4 GB |
| 501 | No master storage on this instance: not the `local` profile |
| 400 on **transcode** | `masterStorageKey` is not this item's own `masters/{id}/original.{ext}` |

## An item vanished from listeners

Check its licence first. Revoking a licence, or reaching its `expires_at`, withdraws every item
on it (RFC 0002). The gateway log says `licence expiry: withdrew N item(s)`. Granting the licence
again does not republish: publish each item again from its page.

## Review flags

`lossy_master` (MP3, AAC or video source: ask the church for WAV or FLAC),
`long_leading_silence` and `long_trailing_silence` (quieter than −50 dBFS for 3 s or more).
Flags never block publication and nothing is ever trimmed. Listen to the preview and decide.

## The gateway refuses to start

`refusing to start with development credentials` comes from `DevDefaultsGuard`: outside the
`local` profile, every secret it names must be set, and the dev issuer turned off. The message
lists exactly which. `python3, ffmpeg or ffprobe is missing` comes from the worker's startup
check in the `local` profile.

## Before a launch

`tools/licensing-review.sh` checks every published item's consent record, and exits 1 while
anything is blocking.
