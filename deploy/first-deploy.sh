#!/usr/bin/env bash
# Run once, on the server, after the first install-release.sh and before anyone else signs in:
#
#   sudo -u adventwave ./first-deploy.sh
#
# A fresh database carries development seed data (migrations V2 and V3). This takes it out of
# public view:
#   1. revokes the reference catalogue's placeholder licence, which withdraws every recording under
#      it through the admin API — the same path as any revocation, outbox events included;
#   2. marks the reference "church" as not consenting, so nothing new can be published under it;
#   3. hides the seed's curated playlists, which would otherwise show empty;
#   4. deletes the three demo listener accounts (listener@, pastor@, newuser@adventwave.app),
#      which anyone controlling that mailbox could otherwise claim through a password reset.
#
# Safe to run twice. Needs the bootstrap admin's email and password (it asks) and reads the
# database settings from /etc/adventwave/gateway.env.
set -euo pipefail

ENV_FILE=${ENV_FILE:-/etc/adventwave/gateway.env}
API=${API:-http://127.0.0.1:8080}
REFERENCE_CHURCH=c9483745-dfe9-529f-bfec-7b69e614e1c1
REFERENCE_LICENCE=49e003c8-9fe6-5202-88f8-f38c5769749c

command -v jq >/dev/null || { echo "needs jq (sudo apt install jq)" >&2; exit 1; }
# Read single keys rather than sourcing the file: systemd's format is not shell (MAIL_FROM has a '<').
setting() { grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-; }

read -r -p "Admin email: " ADMIN_EMAIL
read -r -s -p "Admin password: " ADMIN_PASSWORD; echo
TOKEN=$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email: $e, password: $p}' \
  | curl -fsS "$API/v1/auth/admin/login" -H 'Content-Type: application/json' -d @- | jq -r .token)
unset ADMIN_PASSWORD
[ -n "$TOKEN" ] && [ "$TOKEN" != null ] || { echo "admin sign-in failed" >&2; exit 1; }

admin() {
  local method=$1 path=$2 body=${3:-}
  local out status
  out=$(curl -sS -w '\n%{http_code}' -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' ${body:+-d "$body"})
  status=${out##*$'\n'}
  if [ "$status" -ge 400 ]; then
    echo "$method $path -> $status: $(echo "${out%$'\n'*}" | jq -r '.message // .' 2>/dev/null)" >&2
    echo "(a 403 that asks for a password change: sign in to the admin portal once and change it, then rerun)" >&2
    exit 1
  fi
}

echo "1. revoking the reference licence (withdraws its recordings)"
admin PUT "/v1/admin/licenses/$REFERENCE_LICENCE/status" '{"consentStatus":"revoked"}'
echo "2. marking the reference church as not consenting"
admin PUT "/v1/admin/churches/$REFERENCE_CHURCH/consent" '{"consentStatus":"revoked"}'

# jdbc:postgresql://host:port/db -> libpq settings for psql
URL=$(setting ADVENTWAVE_DB_URL); URL=${URL#jdbc:postgresql://}; URL=${URL%%\?*}
PGHOST=${URL%%[:/]*}; PORT_PART=${URL#"$PGHOST"}; PORT_PART=${PORT_PART%%/*}; PGPORT=${PORT_PART#:}
export PGHOST PGPORT=${PGPORT:-5432} PGDATABASE=${URL##*/} PGUSER=$(setting ADVENTWAVE_DB_USER) PGPASSWORD=$(setting ADVENTWAVE_DB_PASSWORD)

echo "3. hiding the seed's curated playlists, 4. deleting the demo accounts"
psql -v ON_ERROR_STOP=1 -q <<'SQL'
BEGIN;
UPDATE playlists SET is_public = FALSE, updated_at = now()
 WHERE is_curated AND legacy_id IS NOT NULL AND is_public;
DELETE FROM users
 WHERE external_auth_id IN ('dev|listener@adventwave.app', 'dev|pastor@adventwave.app', 'dev|newuser@adventwave.app');
COMMIT;
SELECT (SELECT count(*) FROM media_items WHERE status = 'published') AS published_items,
       (SELECT count(*) FROM users) AS listener_accounts,
       (SELECT count(*) FROM playlists WHERE is_curated AND is_public) AS public_curated_playlists;
SQL
echo "done: the catalogue is now empty until a church's recordings are added through the admin portal"
