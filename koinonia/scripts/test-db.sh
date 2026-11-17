#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica stub do Supabase + migrations + seed e roda os testes SQL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-55432}"
DATA="$(mktemp -d)"
LOG="$DATA/server.log"
cleanup() { "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DATA"; RUN_AS="sudo -u postgres"
  command -v sudo >/dev/null || RUN_AS="su postgres -c"
fi
run() { if [ -z "$RUN_AS" ]; then "$@"; elif [ "$RUN_AS" = "su postgres -c" ]; then su postgres -c "$(printf '%q ' "$@")"; else $RUN_AS "$@"; fi; }

run "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
run "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=''" -l "$LOG" -w start >/dev/null
PSQL=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "migration: $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/seed/01_catalog.sql"
fail=0
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  if "${PSQL[@]}" -f "$f" >"$DATA/out.txt" 2>&1; then echo "PASS $(basename "$f")"; [ -n "${VERBOSE:-}" ] && { grep -o "ok (expected error).*" "$DATA/out.txt" || true; }; else echo "FAIL $(basename "$f")"; cat "$DATA/out.txt"; fail=1; fi
done
exit $fail
