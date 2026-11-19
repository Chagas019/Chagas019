#!/bin/sh
set -e
# Discos montados (Render, Docker volumes) podem chegar como root: garante escrita e roda sem privilégios.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R socialai:socialai /data 2>/dev/null || true
  if command -v setpriv >/dev/null 2>&1; then
    exec setpriv --reuid=socialai --regid=socialai --init-groups "$@"
  elif command -v runuser >/dev/null 2>&1; then
    exec runuser -u socialai -- "$@"
  fi
  echo "aviso: setpriv/runuser indisponíveis; executando como root" >&2
fi
exec "$@"
