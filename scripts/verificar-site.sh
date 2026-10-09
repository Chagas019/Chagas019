#!/usr/bin/env bash
# Confere os arquivos do site antes de publicar.
set -u
cd "$(dirname "$0")/.."
erros=0
falha() { echo "ERRO: $*"; erros=$((erros + 1)); }

[ -f index.html ] || { echo "ERRO: index.html não encontrado"; exit 1; }
grep -q '<title>[^<]\+</title>' index.html || falha "index.html sem <title>"

# Ícones usados: caminhos fixos, ico("nome") e ico: "nome"
icones=$( { grep -o 'icones/[a-z0-9-]*\.webp' index.html | sed 's#icones/##; s#\.webp##'
            grep -o 'ico("[a-z0-9-]*"' index.html | sed 's/ico("//; s/"//'
            grep -o 'ico: "[a-z0-9-]*"' index.html | sed 's/ico: "//; s/"//'; } | sort -u)
for nome in $icones; do
  [ -f "icones/$nome.webp" ] || falha "ícone usado mas ausente: icones/$nome.webp"
done
echo "Ícones conferidos: $(echo "$icones" | wc -w)"

while IFS= read -r arq; do
  falha "arquivo grande demais (>5 MB): $arq"
done < <(find index.html icones fotos -type f -size +5M 2>/dev/null)

if [ "$erros" -gt 0 ]; then echo "Encontrei $erros problema(s)."; exit 1; fi
echo "Tudo certo."
