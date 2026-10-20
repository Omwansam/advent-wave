#!/usr/bin/env bash
# Nightly database backup, run by adventwave-backup.timer as the postgres user (peer
# authentication, so no password is stored anywhere). Custom-format dumps, so a single table can
# be restored with pg_restore -t. Keeps the newest $KEEP.
#
# Restore into an empty database:
#   sudo -u postgres createdb -O adventwave adventwave_restore
#   sudo -u postgres pg_restore -d adventwave_restore --no-owner --role=adventwave /var/backups/adventwave/<file>.dump
#
# Audio is not in here: it lives in the buckets. Turn on versioning for the masters bucket.
set -euo pipefail

DIR=${BACKUP_DIR:-/var/backups/adventwave}
DB=${BACKUP_DB:-adventwave}
KEEP=${BACKUP_KEEP:-14}

mkdir -p "$DIR"
FILE="$DIR/$DB-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --compress=6 --file="$FILE.partial" "$DB"
mv "$FILE.partial" "$FILE"
pg_restore --list "$FILE" >/dev/null   # an unreadable dump is not a backup
echo "backed up $DB to $FILE ($(du -h "$FILE" | cut -f1))"

ls -1t "$DIR"/"$DB"-*.dump | tail -n +"$((KEEP + 1))" | xargs -r rm -f
