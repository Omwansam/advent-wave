# RFC 0002 — Hardening pass: licence lapse, master keys, request errors, dev credentials

| | |
|---|---|
| Status | Implemented in the working tree; awaiting sign-off with RFC 0001 (both ship as 1.3.0) |
| Date | 2026-10-10 |
| Contracts | **1.3.0**, unreleased: no version change. No table, column, endpoint or response shape changes; `openapi/adventwave.yaml` and `postgres/schema.sql` regenerate unchanged |
| Compatibility class | **Patch**: behaviour now matches what the contracts already say. Each item names what a client could observe |
| Workstreams | **A** gateway, **D** audio, **H** licensing |

Found by running the plan §4 weeks 5–6 security pass against the local stack (no Docker), every
fix verified on a running gateway.

## 1. A lapsed licence takes its items down

The publication gate checks the licence only when an item is published. A licence revoked, or
expired, afterwards left its items streaming: "nothing goes public without it" held for one
instant. Now:

- `PUT /v1/admin/licenses/{id}/status` to anything but `granted` withdraws every published item
  on that licence, in the same transaction, with a `catalog.media.v1` event per item (`status:
  withdrawn`), exactly as `POST /v1/admin/media/{id}/withdraw` does.
- `LicenceExpirySweep` (every `adventwave.catalog.licence-expiry-sweep-ms`, default 60 s) marks
  granted licences whose `expires_at` has passed as `expired` and withdraws their items.
- Granting a licence again republishes nothing. An operator republishes, item by item.

Observable: items leave listener surfaces when their licence lapses. Revoking a licence now needs
only `rights:write`; the withdrawals it causes are its consequence, not a separate publish action.

## 2. A transcode reads only the item's own master

`POST /v1/admin/media/{id}/transcode` accepted any `masterStorageKey`, so item A could be
transcoded and published from item B's master, under A's licence, which the gate cannot see. The
key must now be `masters/{id}/original.{ext}` for that item with an accepted extension (the layout
`audio/transcode.md` already specifies); anything else is **400**. The admin portal only ever sent
the key the upload returned, so it is unaffected.

`tools/transcode.py run` also takes an exclusive per-item lock: a worker killed without its child
(SIGKILL, OOM) left that child running, and the restarted worker's re-run shared its staging
directory. The second run now waits for the first to exit.

## 3. Request errors are 4xx, not 500

No route, wrong method and unsupported content type answered **500** with an ERROR stack trace.
They are now **404**, **405** and **415** in the standard error body. None of the three appeared
in `openapi/adventwave.yaml`; a 500 there was never part of the contract.

## 4. Form bodies are not parsed

Spring's `FormContentFilter` read the whole body of any PUT/PATCH/DELETE labelled
`application/x-www-form-urlencoded` into memory, before authentication and without a size limit,
and a binary master labelled that way failed to decode. No endpoint takes a form body, so the
filter is off (`spring.mvc.formcontent.filter.enabled: false`).

## 5. Development credentials refuse to leave a laptop

The base configuration turns on the email-only dev token issuer and defaults every signing secret
to a published "dev-only" value. `DevDefaultsGuard` stops the gateway at startup, naming each
setting to provide, while the dev issuer is on (without an external IdP) or the listener-token,
admin-token, playback-URL or upload-URL secret is a dev default or shorter than 32 characters.
`adventwave.security.allow-dev-defaults` (`ADVENTWAVE_ALLOW_DEV_DEFAULTS`) switches it off; the
`local` profile, the integration tests and CI's contract regeneration set it.

## Verified, not changed

Signed-URL expiry and tampering (403), RBAC and token-population boundaries, private-session
exclusion from history, restart recovery of the local worker.

## Not verified here

The playback rate limiter needs Redis, which this environment does not run. It fails open by
design when Redis is unreachable.
