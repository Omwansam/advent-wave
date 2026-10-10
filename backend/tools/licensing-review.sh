#!/usr/bin/env bash
# Licensing review (plan §4 weeks 7–8): every published item checked against its consent record.
#
# The database refuses to publish without a granted, unexpired licence, and a licence that lapses
# later withdraws its items (RFC 0002). Neither checks the consent record behind the licence. This
# does, for every published item:
#
#   blocking   no licence · licence not granted · licence expired · no consent document ·
#              placeholder consent document (the seed catalogue's) · church consent not granted ·
#              licence held by a different church from the artist's
#   warning    licence expires within 30 days
#
# Exits 1 when anything is blocking, so it can gate a launch. Read-only.
#
#   ./tools/licensing-review.sh            # flagged items only; ADVENTWAVE_DB_* or the local defaults
#   ./tools/licensing-review.sh --all      # every published item
set -euo pipefail

HOST="${ADVENTWAVE_DB_HOST:-localhost}"
PORT="${ADVENTWAVE_DB_PORT:-5433}"
USER="${ADVENTWAVE_DB_USER:-adventwave}"
DB="${ADVENTWAVE_DB_NAME:-adventwave}"
ALL=false
[ "${1:-}" = "--all" ] && ALL=true

psql_() { PGPASSWORD="${ADVENTWAVE_DB_PASSWORD:-}" psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -X -q -v ON_ERROR_STOP=1 "$@"; }

REVIEW=$(cat <<'SQL'
WITH reviewed AS (
  SELECT m.title, a.name AS artist, coalesce(c.name, '-') AS church,
         array_to_string(array_remove(ARRAY[
           CASE WHEN l.id IS NULL THEN 'no licence' END,
           CASE WHEN l.consent_status <> 'granted' THEN 'licence ' || l.consent_status END,
           CASE WHEN l.expires_at IS NOT NULL AND l.expires_at <= now() THEN 'licence expired' END,
           CASE WHEN l.id IS NOT NULL AND coalesce(btrim(l.consent_document_url), '') = '' THEN 'no consent document' END,
           CASE WHEN l.consent_document_url ~* '(placeholder|/seed/)' THEN 'placeholder consent document' END,
           CASE WHEN l.id IS NOT NULL AND c.consent_status IS DISTINCT FROM 'granted' THEN 'church consent ' || coalesce(c.consent_status, 'missing') END,
           CASE WHEN l.id IS NOT NULL AND a.church_id IS DISTINCT FROM l.church_id THEN 'licensed by another church' END
         ], NULL), '; ') AS blocking,
         CASE WHEN l.expires_at > now() AND l.expires_at <= now() + interval '30 days'
              THEN 'licence expires ' || to_char(l.expires_at, 'YYYY-MM-DD') END AS warning
  FROM media_items m
  JOIN artists a ON a.id = m.artist_id
  LEFT JOIN licenses l ON l.id = m.license_id
  LEFT JOIN churches c ON c.id = l.church_id
  WHERE m.status = 'published'
)
SQL
)

read -r TOTAL BLOCKED WARNED < <(psql_ -tA -F' ' -c "$REVIEW SELECT count(*), count(*) FILTER (WHERE blocking <> ''), count(*) FILTER (WHERE warning IS NOT NULL) FROM reviewed")
echo "licensing review of $DB on $HOST:$PORT — $TOTAL published, $BLOCKED blocking, $WARNED expiring within 30 days"
FILTER="WHERE blocking <> '' OR warning IS NOT NULL"; $ALL && FILTER=""
if $ALL || [ "$BLOCKED" -gt 0 ] || [ "$WARNED" -gt 0 ]; then
  echo
  psql_ -P pager=off -P footer=off -c "$REVIEW
    SELECT title, artist, church, nullif(concat_ws('; ', nullif(blocking, ''), warning), '') AS problems
    FROM reviewed $FILTER ORDER BY blocking = '', church, artist, title"
fi
[ "$BLOCKED" -eq 0 ]
