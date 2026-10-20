# RFC 0005 — Listener accounts: email and password, run by the gateway

| | |
|---|---|
| Status | Implemented on branch `arnold`; awaiting sign-off |
| Date | 2026-10-20 |
| Contracts | **1.6.0**, with RFCs 0006 and 0007 |
| Compatibility class | **Minor**: two tables, eight operations, one optional response field, all new. `POST /v1/auth/session` (the dev issuer) is unchanged and still turned off everywhere but a laptop |
| Workstreams | **A** gateway and platform-core, **G** web client |

## Why

Nobody outside a developer's laptop can sign in. Listener sign-in has always been the dev issuer,
a stand-in for "the managed IdP that has not been chosen yet" (plan §1 pre-work): any email, no
password. `DevDefaultsGuard` rightly refuses it on a server, which leaves a deployed AdventWave
with no way in. The project chose its own accounts over an external IdP: no per-user fees, no
third party holding the congregation's addresses, and one server to run.

## What

### Postgres (V9, additive)

| Table | Shape |
|---|---|
| `listener_credentials` | `user_id` PK → `users`; `password_hash` (`{bcrypt}…`, DelegatingPasswordEncoder); `email_verified_at`; `failed_logins`, `locked_until`; `token_version`; `password_changed_at`, `last_login_at`, `created_at`, `updated_at` |
| `listener_tokens` | `token_hash` PK (SHA-256 hex, `^[0-9a-f]{64}$`); `user_id`; `purpose` ∈ `password_reset` · `email_verification`; `expires_at`, `used_at`, `created_at`; index `(user_id, purpose)` |

An account is still a `users` row. `external_auth_id` is `adventwave|<uuid>` for these accounts,
so it never collides with a dev (`dev|…`) or IdP subject.

### REST

| Operation | Behaviour |
|---|---|
| `POST /v1/auth/register` `{ email, password, name? }` | **201** `ListenerSessionDto`; sends a verification link. **409** email taken. **400** policy |
| `POST /v1/auth/login` `{ email, password }` | **200** `ListenerSessionDto`. **401** for a wrong password, an unknown email and an account with no password alike. **429** while locked |
| `POST /v1/auth/password-reset` `{ email }` | **202** always, whether or not the email has an account |
| `POST /v1/auth/password-reset/confirm` `{ token, newPassword }` | **200** a fresh session; every other session ends; the email counts as verified. **400** unknown, expired or spent link |
| `POST /v1/auth/verify-email` `{ token }` | **200** `UserDto` with `emailVerified: true`. **400** as above |
| `POST /v1/me/password` `{ currentPassword, newPassword }` | **200** a fresh session; every other session ends. **400** wrong current password. **409** account has no password |
| `POST /v1/me/sign-out` | **204**; every session of the account ends, this one included |
| `POST /v1/me/verify-email` | **202**; resends the link (no-op once verified) |

`ListenerSessionDto { token, tokenType: "Bearer", expiresIn, user: UserDto }`. `UserDto` gains
optional `emailVerified`, present only for an account with a password.

Every `/v1/auth/*` operation above is limited per client address: register 10/h, login 30/5 min,
password-reset 10/h, confirm 30/h, verify 30/h; over the limit **429**.

### Tokens

HS256, issuer `adventwave`, `sub` = `external_auth_id`, claims `uid` and `ver`; 30 days
(`ADVENTWAVE_LISTENER_TOKEN_TTL`). The decoder checks `ver` against `token_version`, so changing the
password, resetting it, or "sign out everywhere" ends every outstanding token at once. The
gateway's issuer routing: `adventwave-admin` → admin secret; `adventwave` → listener secret plus the
version check; an IdP issuer if one is configured; the dev decoder only while the dev issuer is on.
A listener token on an admin route is **403**.

## Decisions

- **Same answer for every failed sign-in.** A wrong password, an unknown email and a password-less
  account all get the same 401 message, and an unknown email still pays for a bcrypt comparison
  against a decoy hash, so timing does not tell them apart either. Reset requests are always 202.
- **Lockout per account, limits per address.** 10 failures lock the account for 15 minutes; the
  right password during a lockout is still refused. The per-address limits stop one machine trying
  many accounts. Behind a proxy they need `SERVER_FORWARD_HEADERS_STRATEGY=native` (deploy/README.md).
- **Password policy:** 8 characters to 72 bytes (bcrypt's limit, refused rather than truncated),
  not the email or its local part, not one of a short list of the most common passwords. No
  composition rules: a phrase is better than `P@ssw0rd1`.
- **Emailed links are single use and stored only as hashes.** 1 hour for a reset, 7 days for
  verification, at most 3 emails per account per hour. A reset spends every other reset link.
- **A reset claims an account.** An existing `users` row with no password (a seeded or dev account)
  gets credentials through a reset link, which proves the mailbox, never through register (409).
- **Verification does not gate listening.** An unverified account works; Settings says so and offers
  to resend. Verification exists so a reset link goes somewhere the listener controls.
- **Mail is async** on virtual threads, so SMTP latency is never a sign-in's latency. `log` mode
  writes the email to the log for a laptop; `DevDefaultsGuard` refuses it on a server, along with a
  dev-default or short listener secret and an `app-base-url` that is not https.

## Verification

No Docker on the development machine, so no Testcontainers test is claimed. On the native-Postgres
local stack, against the running gateway: register **201**, the same email **409**, a weak password
**400**; login **200**; a wrong password and an unknown email the same **401**; the verification link
**200** once and **400** after; reset **202** for an existing and a non-existent email; confirm ended
the old session and the link did not work twice; changing the password and sign-out-everywhere each
ended outstanding tokens; the demo `newuser@adventwave.app` was refused by register and claimed through
a reset; a listener token on the admin API **403**; a forged token **401**; ten wrong passwords then the
right one **429**; 31 sign-ins from one address in five minutes **429**. In production mode (the
release jar under systemd, the guard satisfied) the dev issuer route was 404, and behind forwarded
headers one address was limited while another was not. In headless Chrome driven by REA: sign-up
through the form landed in the app, and Settings showed "Email not confirmed yet · Send the link
again", change password and sign out everywhere.
