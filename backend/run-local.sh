#!/usr/bin/env bash
# Boot the gateway against a locally installed Postgres. No Docker involved.
#
# Reads backend/.env (copy it from .env.example first), exports every setting, and hands
# the JVM a JDK 21 — the version pinned in pom.xml. Ctrl-C stops it.
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
    echo "no .env found. Run:  cp .env.example .env" >&2
    exit 1
fi

# set -a marks everything assigned from here on for export, so the JVM inherits it.
set -a
# shellcheck disable=SC1091
source .env
set +a

# Spring Boot needs Java 21; the system default here is 17.
export JAVA_HOME="${JAVA_HOME:-$HOME/.jdks/temurin-21}"
if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
    echo "JAVA_HOME=$JAVA_HOME is not a JDK. Point it at a JDK 21." >&2
    exit 1
fi

version=$("$JAVA_HOME/bin/java" -version 2>&1 | head -1)
case "$version" in
    *\"21*) ;;
    *) echo "need JDK 21, JAVA_HOME has: $version" >&2; exit 1 ;;
esac

echo "java     $version"
echo "database ${ADVENTWAVE_DB_URL}"
echo "port     ${PORT:-8080}"
echo

# Two steps, deliberately. `spring-boot:run -pl gateway -am` does not work: -am puts the
# aggregator root and the four library modules into the reactor, and a goal named on the
# command line runs against every project in it — so the plugin hits the root pom first and
# dies with "Unable to find a suitable main class".
#
# So: install the siblings into ~/.m2 once, then run gateway alone, where it is the only
# project in the reactor and the only one with a main class.
./mvnw -q -DskipTests install

exec ./mvnw spring-boot:run -pl gateway
