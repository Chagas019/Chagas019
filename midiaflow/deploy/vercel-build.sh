#!/bin/sh
# Baixa o MídiaFlow do GitHub (commit fixo) e gera o site em dist/.
set -e
SHA=b1b6c091521a289b5ba821f085cc41df77b71ba6
rm -rf src dist
mkdir src
curl -fsSL "https://codeload.github.com/Chagas019/Chagas019/tar.gz/$SHA" | tar xz -C src --strip-components=2 --wildcards '*/midiaflow/*'
cd src
npm ci --no-audit --no-fund
npm run build
mv dist ../dist
