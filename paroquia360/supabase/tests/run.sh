#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica stub do auth + migrações + seed e roda os testes de RLS.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DIR=$(mktemp -d); PORT=${PORT:-55432}
chown postgres "$DIR" 2>/dev/null || true
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
as_pg "$BIN/initdb -D $DIR -A trust -U postgres >/dev/null"
as_pg "$BIN/pg_ctl -D $DIR -o '-p $PORT -k $DIR' -l $DIR/log -w start >/dev/null"
trap 'as_pg "$BIN/pg_ctl -D $DIR -m fast stop >/dev/null"; rm -rf "$DIR"' EXIT
PSQL="psql -X -q -t -v ON_ERROR_STOP=1 -h $DIR -p $PORT -U postgres -d postgres"
$PSQL -f tests/local_auth_stub.sql
for f in migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f seed.sql
$PSQL -f tests/rls_test.sql
