#!/usr/bin/env bash
# Gera portfolio/dist/: o site pronto para publicar na raiz de um domínio
# (Vercel/Netlify: diretório de saída = portfolio/dist). Copia só os arquivos
# usados e troca as referências "../pasta/arquivo" por "pasta/arquivo".
set -euo pipefail
cd "$(dirname "$0")/.."            # portfolio/
OUT=dist
rm -rf "$OUT" && mkdir -p "$OUT"

cp index.html robots.txt sitemap.xml "$OUT"/
cp -r assets content media "$OUT"/
rm -rf "$OUT/content/_fixtures"
# mídias de terceiros / sem uso no site não vão para a publicação
rm -f "$OUT"/media/fotos-carlo-acutis-* "$OUT"/media/midia-carlo-acutis-*

# Arquivos fora de portfolio/ referenciados pelo conteúdo ou pela página
refs=$(grep -rhoE '"\.\./[^"]+"' content/*.json index.html | tr -d '"' | sort -u)
for r in $refs; do
  src="${r}"                       # relativo a portfolio/
  dst="$OUT/${r#../}"
  if [ -f "$src" ]; then mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; else echo "aviso: $r não existe" >&2; fi
done

# Reescreve "../" → "" nos arquivos de dados e na página
for f in "$OUT"/index.html "$OUT"/content/*.json "$OUT"/media/manifest.json; do
  sed -i 's#"\.\./#"#g' "$f"
done

echo "dist pronto: $(find "$OUT" -type f | wc -l) arquivos, $(du -sh "$OUT" | cut -f1)"
