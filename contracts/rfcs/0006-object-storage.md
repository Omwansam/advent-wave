# RFC 0006 — Masters and derived audio in S3-compatible object storage

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-20 |
| Contracts | **1.6.0**, with RFCs 0005 and 0007 |
| Compatibility class | **Minor**: no schema, no new operation. `GET /v1/admin/media/{id}/preview` no longer returns **501**; `POST /v1/admin/media/{id}/upload` returns a presigned bucket URL where it returned the gateway's own |
| Workstreams | **A** gateway, **D** audio pipeline |

## Why

Audio lived in a directory on the gateway's machine (`adventwave.catalog.local-media-root`), served
by the gateway itself, which `audio/transcode.md` called local-only (drift A1). A server needs the
masters somewhere durable and the bytes served by something other than the JVM. The project chose
S3-compatible storage: any of AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2 or MinIO, with
no lock-in and no CDN contract yet.

## What

`adventwave.storage.mode` = `local` (unchanged, development) or `s3`, with
`adventwave.storage.s3.{endpoint, region, access-key, secret-key, masters-bucket, derived-bucket,
path-style, staging-dir}` (`ADVENTWAVE_S3_*`).

| Step | With `s3` |
|---|---|
| Upload ticket (`POST /v1/admin/media/{id}/upload`) | A presigned **PUT** on `masters/{id}/original.{ext}`, signed for that key, content type and length, valid `upload-url-ttl` (10 min). **409** if any `masters/{id}/original.*` exists: masters are never replaced. The browser PUTs straight to the bucket |
| Transcode | `LocalTranscodeWorker` downloads the master into the staging directory, runs `tools/transcode.py` there unchanged, uploads every derived file (`audio/mp4`, `Cache-Control: private, max-age=31536000, immutable`) **before** delivering `completed`, then removes the staged copies |
| Playback (`/v1/media/{id}/stream/{profile}`) | After the HMAC check, **302** to a presigned **GET** on `derived/{id}/{profile}.m4a`, valid for the item's duration plus 30 minutes (never less than `signed-url-ttl`, never more than 7 days) |
| Admin preview | The same presigned GETs, one per profile; works on any status |

Both buckets are private. The masters bucket needs a CORS rule allowing `PUT` from the admin
portal's origin (`deploy/s3-cors.json`); the derived bucket needs none, since `<audio>` does not
use CORS.

## Decisions

- **Upload before publish, always.** The worker uploads the derived files and only then delivers
  `completed`, so an item can never be published ahead of its audio. A failed upload is a failed
  attempt, retried like any other.
- **The transcode tool does not know about S3.** It still works on one directory holding `masters/`,
  `derived/` and `work/`; the worker makes that directory per job. `work/` is left in place because
  the tool keeps a per-item lock there, which a killed gateway's orphaned run may still hold.
- **Playback URLs last as long as the listening.** A presigned GET that expired mid-sermon would stop
  a range request, so its life is the recording's duration plus 30 minutes, not the 5-minute manifest
  TTL. The gateway URL in the manifest stays short-lived and HMAC-signed, as before.
- **Checksums only when the API requires them.** AWS SDK 2.30 adds CRC checksum headers to every
  request by default, and several S3-compatible providers reject them. `WHEN_REQUIRED` keeps one code
  path for all of them.
- **A server runs `s3`.** `DevDefaultsGuard` refuses `local` outside development: it serves audio
  from the gateway with no signed origin. In `s3` mode the local media origin and the gateway's own
  upload endpoint are not registered at all.

## Verification

Against S3Proxy 4.1.1 on localhost with SigV4 enforced (unsigned and wrong-key requests **403**): an
upload ticket pointed at the masters bucket; the PUT with the signed content type **200**, with
another content type **403**; a second ticket **409**; the transcode staged the 7.9 MB master,
uploaded four renditions and published the item; the listener manifest's URL 302'd to a presigned
GET that answered a range request **206** `audio/mp4` and a full GET with a 45.000 s M4A (ffprobe);
`X-Amz-Expires` was 1845 s for the 45 s item; a tampered signature, an unsigned object URL and a
tampered gateway signature each **403**; admin preview returned four presigned bucket URLs. The admin
portal sends the same `Content-Type` in the ticket request and the PUT. The release jar booted in
production mode with `s3` and the worker on, under systemd with `deploy/gateway.env.example` filled in.

## Amendment, 2026-10-22: the manifest hands out the presigned URL itself

With `storage.mode=s3`, `StreamManifestDto.audioUrl` is now the presigned GET on the derived bucket,
not the gateway's signed redirect to it, and `expiresAtEpochSeconds` is that URL's expiry (the
recording plus 30 minutes). No field or operation changes.

**Why.** Measured from Nairobi against the server in Boston (through Cloudflare's edge), the
redirect was a second transatlantic round trip between the manifest and the first byte of audio:
0.9–2 s on every track, on top of the manifest's own. The gateway's part of each was 10–15 ms.

**What it does not change.** Nothing unsigned leaves the gateway, and the caller receives nothing
the redirect did not already hand the same caller: the presigned URL was the redirect's target,
and it was never bound to the listener. Local storage, and an item with no stored asset, keep the
redirect, because an unsigned origin URL must not reach a client. `GET
/v1/media/{id}/stream/{profile}` still answers manifests issued before, and any client that follows
it.

The web player also prefetches a song's manifest when the listener reaches for it, and buffers the
next song in the queue on its second audio element, so Next and the end of a song swap elements
instead of starting from nothing.
