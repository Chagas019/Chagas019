#!/bin/sh
# Roda a migração e os testes de segurança num PostgreSQL vazio.
# Uso: PGHOST=... PGPORT=... PGUSER=postgres sh supabase/tests/run.sh
set -e
cd "$(dirname "$0")"
DB=midiaflow_test
psql -v ON_ERROR_STOP=1 -qc "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d $DB -f 00_supabase_stub.sql
psql -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/0001_midiaflow.sql 2>/dev/null
psql -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/0001_midiaflow.sql 2>/dev/null # reexecutável
out=$(psql -v ON_ERROR_STOP=1 -At -d $DB -f 10_security.sql 2>&1)
echo "$out" | grep -E '^(t|f)' | sort | uniq -c
if echo "$out" | grep -qE '(^|\|)f$'; then echo "FALHOU: alguma verificação deu falso"; exit 1; fi
echo "$out" | grep -q TODOS_OS_TESTES_PASSARAM || { echo "$out" | tail -20; exit 1; }
echo "Banco OK"
