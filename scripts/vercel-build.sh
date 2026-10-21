#!/usr/bin/env bash
# Monta a pasta _site para a Vercel (o vercel.json chama este script).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site
SITE_URL="${SITE_URL:-https://comunicafe-chagas7.vercel.app/}" bash scripts/montar-site.sh _site
cp -r icones social midia _site/
mkdir -p _site/fotos
find fotos -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) -exec cp {} _site/fotos/ \;
