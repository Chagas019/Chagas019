#!/usr/bin/env bash
# Monta o site para hospedagem a partir de site/pagina.html.
# Uso: SITE_URL=https://comunicafe.exemplo.org/ bash scripts/montar-site.sh [pasta-de-saída]
#   SITE_URL (opcional): endereço público do site. Com ele saem o endereço canônico,
#   a imagem de prévia com endereço completo, robots.txt e sitemap.xml.
#   Sem pasta de saída, atualiza o index.html na raiz do repositório.
set -euo pipefail
cd "$(dirname "$0")/.."
SAIDA="${1:-.}"
mkdir -p "$SAIDA"
SITE_URL="${SITE_URL:-}" SAIDA="$SAIDA" python3 - <<'PY'
import json, os, re, datetime
src = open("site/pagina.html", encoding="utf-8").read()
site = os.environ["SITE_URL"].strip()
if site and not site.endswith("/"):
    site += "/"
saida = os.environ["SAIDA"]

# Separa o que é cabeçalho (title, meta, link, style) do corpo da página
i = src.index("</style>") + len("</style>")
topo, corpo = src[:i], src[i:].strip()
estilo = topo[topo.index("<style>"):]
fontes = "\n".join(re.findall(r'<link [^>]*>', topo))

TITULO = "Comunica+Fé | Liturgia do dia, agenda e santos da comunicação"
DESC = re.search(r'<meta name="description" content="([^"]*)">', topo).group(1)
IMG = "social/comunicafe-1200x630.jpg"
img_url = (site + IMG) if site else IMG
icone = ("data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23c8102e'/%3E"
         "%3Cpath d='M32 14v36M22 26h20' stroke='white' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E")

org = {"@type": "Organization", "name": "Comunica+Fé", "alternateName": "Pastoral da Comunicação",
       "description": DESC, "logo": img_url}
web = {"@type": "WebSite", "name": "Comunica+Fé", "description": DESC, "inLanguage": "pt-BR"}
if site:
    org["url"] = site; web["url"] = site
ld = json.dumps({"@context": "https://schema.org", "@graph": [org, web]}, ensure_ascii=False, indent=1)

meta = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    f"<title>{TITULO}</title>",
    f'<meta name="description" content="{DESC}">',
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta name="theme-color" content="#c8102e">',
    f'<link rel="icon" href="{icone}">',
    *([f'<link rel="canonical" href="{site}">'] if site else []),
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="pt_BR">',
    '<meta property="og:site_name" content="Comunica+Fé">',
    f'<meta property="og:title" content="{TITULO}">',
    f'<meta property="og:description" content="{DESC}">',
    *([f'<meta property="og:url" content="{site}">'] if site else []),
    f'<meta property="og:image" content="{img_url}">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Comunica+Fé, Pastoral da Comunicação: liturgia do dia, agenda e frase do dia">',
    '<meta name="twitter:card" content="summary_large_image">',
    f'<meta name="twitter:title" content="{TITULO}">',
    f'<meta name="twitter:description" content="{DESC}">',
    f'<meta name="twitter:image" content="{img_url}">',
    fontes,
    f'<script type="application/ld+json">\n{ld}\n</script>',
    estilo,
]
html = "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n" + "\n".join(meta) + "\n</head>\n<body>\n" + corpo + "\n</body>\n</html>\n"
open(os.path.join(saida, "index.html"), "w", encoding="utf-8").write(html)

if site:
    hoje = datetime.date.today().isoformat()
    open(os.path.join(saida, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {site}sitemap.xml\n")
    open(os.path.join(saida, "sitemap.xml"), "w").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{site}</loc><lastmod>{hoje}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>\n")
print(f"Montado em {saida}/index.html" + (f" para {site}" if site else " (sem SITE_URL: sem canônico, robots.txt e sitemap.xml)"))
PY
