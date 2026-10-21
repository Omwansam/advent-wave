#!/bin/sh
# Runs in the `backup` service: one custom-format dump a day, checked readable, the newest
# $BACKUP_KEEP kept. A dump right now:  ./aw exec backup sh /backup-loop.sh once
#
# Restore into a fresh database (stop the gateway first):
#   ./aw exec -T postgres createdb -U adventwave adventwave_restore
#   ./aw exec -T postgres pg_restore -U adventwave -d adventwave_restore --no-owner < "$AW_HOME/backups/<file>.dump"
set -u

dump() {
  f="/backups/adventwave-$(date -u +%Y%m%dT%H%M%SZ).dump"
  # An unreadable dump is not a backup: it is checked before it replaces anything.
  if ! { pg_dump --format=custom --compress=6 --file="$f.partial" \
         && pg_restore --list "$f.partial" >/dev/null \
         && mv "$f.partial" "$f"; }; then
    rm -f "$f.partial"
    return 1
  fi
  echo "backed up to $f ($(du -h "$f" | cut -f1))"
  ls -1t /backups/adventwave-*.dump | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm -f
}

if [ "${1:-}" = once ]; then dump; exit $?; fi

trap 'exit 0' TERM
while :; do
  if dump; then
    delay=${BACKUP_EVERY:-86400}
  else
    echo "backup failed; retrying in an hour" >&2
    delay=3600
  fi
  sleep "$delay" &
  wait $!
done
