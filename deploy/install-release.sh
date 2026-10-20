#!/usr/bin/env bash
# Installs a release built by build-release.sh, on the server:
#
#   sudo ./install-release.sh adventwave-<commit>.tar.gz
#
# Unpacks into /opt/adventwave/releases/<commit>, points /opt/adventwave/current at it, restarts
# the gateway and waits for it to report healthy. Flyway migrates the database on startup, so take
# a backup first (sudo systemctl start adventwave-backup) when the release adds a migration.
#
# Rolling back is pointing current at the previous release and restarting — but only while no
# migration has run since: a migrated schema does not go back by itself.
set -euo pipefail

TARBALL=${1:?usage: install-release.sh adventwave-<commit>.tar.gz}
BASE=/opt/adventwave
[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)" >&2; exit 1; }

NAME=$(tar -tzf "$TARBALL" | head -n 1 | cut -d/ -f1)
DEST="$BASE/releases/${NAME#adventwave-}"
mkdir -p "$BASE/releases"
if [ -e "$DEST" ]; then
  echo "$DEST already exists; reinstalling it"
  rm -rf "$DEST"
fi
tar -C "$BASE/releases" -xzf "$TARBALL"
mv "$BASE/releases/$NAME" "$DEST"
chown -R root:root "$DEST"
chmod -R a+rX,go-w "$DEST"

PREVIOUS=$(readlink -f "$BASE/current" 2>/dev/null || true)
ln -sfn "$DEST" "$BASE/current.new" && mv -T "$BASE/current.new" "$BASE/current"
echo "current -> $DEST${PREVIOUS:+ (was $PREVIOUS)}"

systemctl restart adventwave-gateway
echo -n "waiting for the gateway"
for _ in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
    echo " — healthy"
    # Caddy serves the web apps straight from current/; nothing to reload unless the Caddyfile changed.
    ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf   # keep the five newest
    exit 0
  fi
  echo -n .
  sleep 2
done
echo
echo "the gateway did not become healthy; journalctl -u adventwave-gateway -n 100 says why" >&2
[ -n "$PREVIOUS" ] && echo "to roll back: sudo ln -sfn $PREVIOUS $BASE/current && sudo systemctl restart adventwave-gateway" >&2
exit 1
