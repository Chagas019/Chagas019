#!/usr/bin/env bash
# Aplica as migrations + seed num PostgreSQL local descartável e roda os testes de RLS/regras.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL não encontrado (defina PGBIN)"; exit 1; }
TMP="$(mktemp -d)"; PORT="${PGPORT_TEST:-55432}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown -R postgres "$TMP"; else RUN=""; fi
$RUN "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/supabase-shim.sql
for f in supabase/migrations/*.sql; do echo "→ $f"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -c "grant all on all tables in schema public to anon, authenticated, service_role; grant all on all sequences in schema public to anon, authenticated, service_role;"
node scripts/build-seed-sql.mjs > "$TMP/seed.sql"
echo "→ seed"; "${PSQL[@]}" -f "$TMP/seed.sql"
echo "→ testes"; "${PSQL[@]}" -f supabase/tests/rls.test.sql
echo "Migrations, seed e testes SQL: OK"
