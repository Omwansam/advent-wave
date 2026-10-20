-- Listener accounts: email and password sign-in run by AdventWave itself — RFC 0005
-- (contracts/rfcs/0005-listener-accounts.md). Replaces the email-only dev issuer as the way a
-- listener signs in on a real server; the managed IdP of plan §1 pre-work was not chosen.
--
-- `users` stays the identity row every other table references, and stays IdP-neutral: an
-- account made here gets external_auth_id 'adventwave|{uuid}', and its secrets live in the two
-- tables below. A users row with no credentials row (the seeded demo accounts, anyone the dev
-- issuer provisioned) has no password; the password-reset link is how its owner sets one, which
-- proves the email is theirs before anything is attached to it.

CREATE TABLE listener_credentials (
    user_id             UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- A Spring Security DelegatingPasswordEncoder string, as admin_accounts.password_hash.
    password_hash       TEXT        NOT NULL,
    -- Set by following the verification link, or by a password reset (which proves the same).
    email_verified_at   TIMESTAMPTZ,
    -- After adventwave.auth.listener.max-failed-logins consecutive failures, sign-in is refused
    -- until locked_until. Existing sessions are not ended by someone else's wrong guesses.
    failed_logins       INTEGER     NOT NULL DEFAULT 0 CHECK (failed_logins >= 0),
    locked_until        TIMESTAMPTZ,
    -- Carried in every token as `ver`; bumped by sign-out-everywhere, a password change and a
    -- reset, which ends every session issued before it.
    token_version       INTEGER     NOT NULL DEFAULT 0 CHECK (token_version >= 0),
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single-use links sent by email. Only a SHA-256 of the token is kept: a leaked table must not
-- be a list of working reset links.
CREATE TABLE listener_tokens (
    token_hash  TEXT        PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose     TEXT        NOT NULL CHECK (purpose IN ('password_reset', 'email_verification')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX listener_tokens_user_purpose_idx ON listener_tokens (user_id, purpose);
