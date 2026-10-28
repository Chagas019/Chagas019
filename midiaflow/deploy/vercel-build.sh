#!/bin/sh
# Baixa o MídiaFlow do GitHub (commit fixo) e gera o site em dist/.
set -e
SHA=1b33a427b6340021badab0cb203ff91ada7386be
rm -rf src dist
mkdir src
curl -fsSL "https://codeload.github.com/Chagas019/Chagas019/tar.gz/$SHA" | tar xz -C src --strip-components=2 --wildcards '*/midiaflow/*'
cd src
npm install --no-audit --no-fund
npm run build
mv dist ../dist
