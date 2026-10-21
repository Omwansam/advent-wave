#!/usr/bin/env bash
# The Docker flavour of deploy/first-deploy.sh: the same four steps, with nothing needed on the
# host but python3 and docker. Run once, after the first install, before anyone else signs in:
#
#   deploy/docker/first-deploy.sh            (asks for the admin email and password)
#
# Revokes the reference catalogue's placeholder licence through the admin API (withdrawing its
# recordings, outbox events included), marks the reference church as not consenting, hides the
# seed's curated playlists and deletes the three demo listener accounts. Safe to run twice.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
API=${API:-http://127.0.0.1:${AW_GATEWAY_PORT:-8090}}
[ -n "${ADMIN_EMAIL:-}" ] || read -r -p "Admin email: " ADMIN_EMAIL
[ -n "${ADMIN_PASSWORD:-}" ] || { read -r -s -p "Admin password: " ADMIN_PASSWORD; echo; }
export API ADMIN_EMAIL ADMIN_PASSWORD

python3 -I - <<'PY'
import json, os, sys, urllib.request, urllib.error
api = os.environ["API"]
def call(method, path, body=None, token=None):
    req = urllib.request.Request(api + path, method=method, data=None if body is None else json.dumps(body).encode())
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        detail = json.loads(e.read() or b"{}").get("message", "")
        sys.exit(f"{method} {path} -> {e.code}: {detail}"
                 + ("\n(a 403 asking for a password change: sign in to the admin portal once, change it, rerun)" if e.code == 403 else ""))
token = call("POST", "/v1/auth/admin/login", {"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]})["token"]
print("1. revoking the reference licence (withdraws its recordings)")
call("PUT", "/v1/admin/licenses/49e003c8-9fe6-5202-88f8-f38c5769749c/status", {"consentStatus": "revoked"}, token)
print("2. marking the reference church as not consenting")
call("PUT", "/v1/admin/churches/c9483745-dfe9-529f-bfec-7b69e614e1c1/consent", {"consentStatus": "revoked"}, token)
PY
unset ADMIN_PASSWORD

echo "3. hiding the seed's curated playlists, 4. deleting the demo accounts"
"$here/aw" exec -T postgres psql -U adventwave -d adventwave -v ON_ERROR_STOP=1 -q <<'SQL'
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
echo "done: the catalogue is empty until a church's recordings are added through the admin portal"
