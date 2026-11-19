#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica a migration e roda os testes de RLS.
set -euo pipefail
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}
DIR=$(mktemp -d)
cleanup() { "$PGBIN/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
RUNAS=""; [ "$(id -u)" = "0" ] && { chown -R postgres "$DIR"; RUNAS="runuser -u postgres --"; }
$RUNAS "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p 55432 -k $DIR -c listen_addresses=''" -w start >/dev/null
P="psql -h $DIR -p 55432 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c 'create database mailbot' >/dev/null
$P -d mailbot -f supabase/tests/auth_stub.sql >/dev/null
$P -d mailbot -f supabase/migrations/20261119000000_mailbot_init.sql >/dev/null
$P -d mailbot -f supabase/tests/rls_test.sql
