#!/bin/sh
# Backup manual: ./scripts/backup.sh  (requer DATABASE_URL ou stack docker rodando)
set -eu
mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "$DATABASE_URL" -Fc -f "backups/oferta_ai-$TS.dump"
else
  docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-oferta}" -d "${POSTGRES_DB:-oferta_ai}" -Fc > "backups/oferta_ai-$TS.dump"
fi
echo "backup salvo em backups/oferta_ai-$TS.dump"
# Restaurar: pg_restore --clean --if-exists -d "$DATABASE_URL" backups/<arquivo>.dump
