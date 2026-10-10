-- Staff accounts for the admin portal — RFC 0001 (contracts/rfcs/0001-admin-portal.md).
--
-- Listeners keep authenticating through the IdP (`users.external_auth_id`); this table is the
-- other population: the few people who run the catalogue, signing in with an email and a
-- password at POST /v1/auth/admin/login. Kept apart from `users` on purpose — a listener row is
-- provisioned on first sight of a token, a staff row is created deliberately by a super admin,
-- and neither must ever turn into the other.
--
-- The gateway reads this row on every admin request: the role here, not anything in the token,
-- decides what the request may do, so a role change or a disabled account takes effect at once.

CREATE TABLE admin_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Stored lower-cased and trimmed; sign-in compares the same way.
    email                TEXT        NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%'),
    display_name         TEXT        NOT NULL CHECK (btrim(display_name) <> ''),
    -- A Spring Security DelegatingPasswordEncoder string, e.g. '{bcrypt}$2a$10$…'. The prefix
    -- names the algorithm, so a stronger one can be introduced without a migration.
    password_hash        TEXT        NOT NULL,
    -- RBAC. Each role maps to a fixed set of permissions in AdminRole; the mapping is code,
    -- reviewed with the endpoints it guards, so it is not a table an operator could edit.
    role                 TEXT        NOT NULL
                         CHECK (role IN ('super_admin', 'content_manager', 'rights_manager', 'viewer')),
    active               BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Set when someone other than the owner chose the password (a new account, a reset). Until
    -- the owner replaces it, the account can sign in and change its password, nothing else.
    must_change_password BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Carried in every token as `ver`. Bumped by sign-out, a password change or reset, a role
    -- change and deactivation, which ends every session issued before it.
    token_version        INTEGER     NOT NULL DEFAULT 0 CHECK (token_version >= 0),
    -- Brute-force guard: after adventwave.auth.admin.max-failed-logins consecutive failures the
    -- account refuses sign-in until locked_until.
    failed_logins        INTEGER     NOT NULL DEFAULT 0 CHECK (failed_logins >= 0),
    locked_until         TIMESTAMPTZ,
    last_login_at        TIMESTAMPTZ,
    password_changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
