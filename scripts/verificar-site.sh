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

# SEO e compartilhamento
for tag in '<meta name="description"' 'property="og:title"' 'property="og:description"' 'property="og:image"' 'name="twitter:card"' 'application/ld+json' '<html lang="pt-BR">'; do
  grep -q "$tag" index.html || falha "faltando no index.html: $tag"
done
[ "$(grep -o '<h1' index.html | wc -l)" -eq 1 ] || falha "a página deve ter exatamente um <h1>"
[ -f social/pascom-1200x630.jpg ] || falha "imagem de prévia ausente: social/pascom-1200x630.jpg"
python3 - <<'PY' || falha "dados estruturados (JSON-LD) inválidos"
import json, re
html = open("index.html", encoding="utf-8").read()
for bloco in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
    json.loads(bloco)
PY
desc=$(grep -o '<meta name="description" content="[^"]*"' index.html | sed 's/.*content="//; s/"$//')
[ "${#desc}" -le 160 ] || falha "descrição com ${#desc} caracteres (máximo recomendado: 160)"

while IFS= read -r arq; do
  falha "arquivo grande demais (>5 MB): $arq"
done < <(find index.html icones fotos social -type f -size +5M 2>/dev/null)

if [ "$erros" -gt 0 ]; then echo "Encontrei $erros problema(s)."; exit 1; fi
echo "Tudo certo."
