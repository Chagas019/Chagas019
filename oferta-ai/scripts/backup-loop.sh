#!/bin/sh
# Executado no serviço "backup" do docker compose: pg_dump diário com retenção de 14 dias.
set -eu
while true; do
  TS=$(date +%Y%m%d-%H%M%S)
  pg_dump -h postgres -U "${POSTGRES_USER:-oferta}" -d "${POSTGRES_DB:-oferta_ai}" -Fc -f "/backups/oferta_ai-$TS.dump" \
    && echo "backup ok: oferta_ai-$TS.dump" || echo "backup FALHOU em $TS"
  find /backups -name 'oferta_ai-*.dump' -mtime +14 -delete
  sleep 86400
done
