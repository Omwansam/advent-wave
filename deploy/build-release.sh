#!/usr/bin/env bash
# Builds one release: the gateway jar, both web apps, the transcode tool and these deploy files,
# in deploy/out/adventwave-<commit>.tar.gz. Run on a development machine, from anywhere in the
# repository; copy the tarball to the server and run install-release.sh there.
#
# The web apps are built with no VITE_API_BASE_URL on purpose: Caddy serves each one on the
# same origin as its /v1 proxy (deploy/Caddyfile).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMMIT=$(git -C "$ROOT" rev-parse --short=12 HEAD)
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "warning: uncommitted changes; this release is not reproducible from $COMMIT" >&2
  COMMIT="$COMMIT-dirty"
fi
NAME="adventwave-$COMMIT"
OUT="$ROOT/deploy/out/$NAME"

rm -rf "$OUT"
mkdir -p "$OUT/tools" "$OUT/deploy"

echo "==> gateway"
(cd "$ROOT/backend" && ./mvnw -q -DskipTests package -pl gateway -am)
JAR=$(find "$ROOT/backend/gateway/target" -maxdepth 1 -name 'gateway-*.jar' ! -name '*-plain.jar' ! -name '*.original' | head -n 1)
[ -n "$JAR" ] || { echo "no gateway jar under backend/gateway/target" >&2; exit 1; }
cp "$JAR" "$OUT/gateway.jar"

for app in advent-wave:web admin/advent-admin:admin; do
  dir=${app%%:*}; target=${app##*:}
  echo "==> $dir"
  (cd "$ROOT/$dir" && npm ci --no-audit --no-fund --loglevel=error && env -u VITE_API_BASE_URL npx vite build --outDir "$OUT/$target" --emptyOutDir >/dev/null)
done

# Development hints must not ship (see PageState.jsx); fail loudly if one did.
if grep -rlq 'spring-boot:run\|localhost:8080' "$OUT/web" "$OUT/admin"; then
  echo "a web build still contains a development-only string:" >&2
  grep -rl 'spring-boot:run\|localhost:8080' "$OUT/web" "$OUT/admin" >&2
  exit 1
fi

cp "$ROOT/backend/tools/transcode.py" "$OUT/tools/"
cp "$ROOT/deploy/"{README.md,Caddyfile,adventwave-gateway.service,gateway.env.example,s3-cors.json,install-release.sh,first-deploy.sh} "$OUT/deploy/"
cp -r "$ROOT/deploy/backup" "$OUT/deploy/"
echo "$COMMIT" > "$OUT/RELEASE"

tar -C "$ROOT/deploy/out" -czf "$ROOT/deploy/out/$NAME.tar.gz" "$NAME"
echo "==> deploy/out/$NAME.tar.gz ($(du -h "$ROOT/deploy/out/$NAME.tar.gz" | cut -f1))"
