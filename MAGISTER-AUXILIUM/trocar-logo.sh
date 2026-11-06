#!/usr/bin/env bash
# Uso: ./trocar-logo.sh /caminho/do/logotipo-original.png
# Copia o arquivo ORIGINAL byte a byte (sem conversão, sem recorte, sem filtro) e regenera todas as peças.
set -euo pipefail
cd "$(dirname "$0")"
[ -f "${1:-}" ] || { echo "Informe o arquivo do logotipo original."; exit 1; }
cp -- "$1" assets/logo-original.png
cmp -s -- "$1" assets/logo-original.png && echo "✔ Logotipo copiado sem alterações (idêntico byte a byte)."
node _fonte/render.js
(cd .. && rm -f MAGISTER-AUXILIUM/08-ARQUIVOS-FINAIS/MAGISTER-AUXILIUM-entrega.zip && zip -qr MAGISTER-AUXILIUM/08-ARQUIVOS-FINAIS/MAGISTER-AUXILIUM-entrega.zip MAGISTER-AUXILIUM -x 'MAGISTER-AUXILIUM/08-ARQUIVOS-FINAIS/*')
echo "✔ Peças regeneradas."
