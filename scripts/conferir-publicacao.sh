#!/usr/bin/env bash
# Confere o site depois de publicado. Uso: conferir-publicacao.sh https://usuario.github.io/repo/
set -u
url="${1:?informe a URL do site}"
url="${url%/}/"
tentativas=8
for i in $(seq 1 "$tentativas"); do
  codigo=$(curl -s -o /tmp/pagina.html -w '%{http_code}' "$url")
  [ "$codigo" = "200" ] && break
  echo "Tentativa $i/$tentativas: HTTP $codigo, aguardando 15 s…"
  sleep 15
done
[ "$codigo" = "200" ] || { echo "ERRO: $url respondeu HTTP $codigo"; exit 1; }
echo "Página no ar: $url (HTTP 200)"

grep -q '<title>Comunica+Fé</title>' /tmp/pagina.html || { echo "ERRO: título 'Comunica+Fé' não encontrado na página publicada"; exit 1; }
echo "Título conferido."

erros=0
for nome in $(grep -o 'icones/[a-z0-9-]*\.webp' /tmp/pagina.html | sort -u; \
              grep -o 'ico: "[a-z0-9-]*"' /tmp/pagina.html | sed 's/ico: "\(.*\)"/icones\/\1.webp/' | sort -u); do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$url$nome")
  if [ "$c" = "200" ]; then echo "ok   $nome"; else echo "ERRO $nome (HTTP $c)"; erros=$((erros + 1)); fi
done
[ "$erros" -eq 0 ] || { echo "$erros ícone(s) não carregaram."; exit 1; }
echo "Publicação conferida."
