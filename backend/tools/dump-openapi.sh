#!/usr/bin/env bash
# Regenerates <repo>/contracts/openapi/adventwave.yaml from a running gateway.
#
# The spec is generated from the controllers, never hand-edited: that is what stops the
# published contract from drifting away from the code that serves it (plan §1 day 4, §5.1).
# Editing the YAML by hand is how the two come apart.
#
#   ./mvnw -q -DskipTests install && ./mvnw spring-boot:run -pl gateway -Dspring-boot.run.profiles=local
#   ./tools/dump-openapi.sh
set -euo pipefail

BASE_URL="${ADVENTWAVE_API_BASE_URL:-http://localhost:8080}"
# The contract repo at the repository root, not the Maven module of the same name.
OUT="$(cd "$(dirname "$0")/../.." && pwd)/contracts/openapi/adventwave.yaml"

# Probe the document itself: it is the one thing this script needs from the gateway.
if ! curl -fsS -o /dev/null "$BASE_URL/v3/api-docs"; then
  echo "gateway is not serving /v3/api-docs on $BASE_URL — start it first" >&2
  exit 1
fi

curl -fsS "$BASE_URL/v3/api-docs.yaml" -o "$OUT"
echo "wrote $OUT ($(wc -l < "$OUT") lines)"
