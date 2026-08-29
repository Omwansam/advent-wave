#!/usr/bin/env bash
# Create the adventwave role and database on a locally installed Postgres.
#
# This is the one-time equivalent of what docker-compose.yml declares: POSTGRES_DB,
# POSTGRES_USER, POSTGRES_PASSWORD. It does NOT create tables — Flyway does that on the
# gateway's first boot, from contracts/src/main/resources/db/migration.
#
# Usage:  ./tools/setup-local-db.sh [port]      (default 5433)
set -euo pipefail

PORT="${1:-5433}"
DB=adventwave
USER=adventwave
PASSWORD=adventwave

echo "creating role '$USER' and database '$DB' on port $PORT"

# CREATEDB so the role owns the database, which is what lets it CREATE EXTENSION below
# without being a superuser: pgcrypto and pg_trgm are both marked trusted in PG 13+.
sudo -u postgres psql -p "$PORT" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$USER') THEN
        CREATE ROLE $USER LOGIN PASSWORD '$PASSWORD';
    ELSE
        ALTER ROLE $USER LOGIN PASSWORD '$PASSWORD';
    END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -p "$PORT" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
    sudo -u postgres createdb -p "$PORT" -O "$USER" "$DB"
    echo "database created"
else
    echo "database already exists, leaving it alone"
fi

# V1__core_schema.sql opens with these two. Creating them here as well is harmless
# (IF NOT EXISTS) and surfaces a missing postgresql-contrib now rather than mid-migration.
PGPASSWORD="$PASSWORD" psql -h localhost -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SQL

echo
echo "done. The 'local' Spring profile expects port 5433; if yours differs, edit"
echo "gateway/src/main/resources/application-local.yml or override at run time:"
echo "  SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:$PORT/$DB"
