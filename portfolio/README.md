# CHAGAS CREATIVE — Portfólio (site estático)

HTML + CSS + ES modules, sem framework e sem build. Funciona em GitHub Pages, Vercel ou Netlify.

## Rodar localmente

```bash
# na RAIZ do repositório (algumas mídias ficam em ../videos, ../resultado …)
python3 -m http.server 8000
# abra http://localhost:8000/portfolio/
```
`file://` não funciona (o conteúdo é carregado via `fetch`).

## Onde editar cada coisa

| Quero mudar… | Arquivo |
|---|---|
| **Preços** (serviços e produtos), aviso, nota, condições | `content/pricing.json` — único arquivo de preços |
| Contatos (WhatsApp, Instagram, e-mail), localização | `content/portfolio.json` → `site` |
| Texto "Sobre", trajetória | `content/portfolio.json` → `about`, `timeline` |
| Áreas de atuação, ferramentas, equipamentos | `content/portfolio.json` → `areas`, `tools`, `equipment` |
| Projetos selecionados | `content/portfolio.json` → `selected` |
| Produtos digitais | `content/portfolio.json` → `products` (preço em `pricing.json → products`) |
| Trabalhos com fotos/vídeos (Portfólio) | `content/portfolio.json` → `projects` |
| Título e subtítulo do hero, SEO (title, description) | `index.html` |
| Cores, fontes, espaçamentos | `assets/css/tokens.css` (ver `docs/DESIGN_SYSTEM.md`) |

### Preços
```json
{ "id": "ensaio", "label": "Ensaio", "price_from": 250, "desc": "…" }
```
Mude `price_from`. Em `products`, troque `null` por um número (`"la-creme": 49`) para exibir "a partir de R$ 49"; `null` mostra "Sob consulta". Cada item novo em `groups[].items` vira automaticamente uma opção no formulário de orçamento.

### Imagens e vídeos
1. Coloque o arquivo numa pasta do repositório (ex.: `fotos/eventos/festa-01.jpg`).
2. Gere as versões otimizadas: `bash portfolio/scripts/optimize-media.sh fotos/eventos/festa-01.jpg` (requer `ffmpeg`; cria WebP/AVIF + `media/manifest.json`).
3. Referencie com caminho relativo a `portfolio/index.html`, ex.: `"../fotos/eventos/festa-01.jpg"`.
- **Trabalho do Portfólio:** em `projects` → `{ "id", "title", "category", "year", "description", "role", "featured", "cover": {"src","alt","w","h"}, "media": [{"type":"image|video","src","poster","alt","w","h"}] }`. A categoria (`eventos`, `ensaios`, …) sai de "Em curadoria" assim que tiver um projeto.
- **Projeto selecionado / produto:** preencha `cover` (projetos) ou `image` (produtos) com `{"src","alt","w","h"}`; sem isso aparece o placeholder.
- **Foto de perfil:** `about.photo` → `{"src","alt","w","h"}` (vertical, ≥ 1200 px).

Vídeos: use versões leves para a web (ex.: `ffmpeg -i original.mp4 -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 30 -movflags +faststart media/nome-web.mp4`). Os originais pesados ficam fora do site. Se rodar `optimize-media.sh` sem argumentos, ele recria o manifest: as entradas `media/*-web-*.mp4` (posters dos vídeos leves) precisam ser readicionadas.

### Contatos
`site.whatsapp` só dígitos (`5519989905361`), `site.instagram` sem @, `site.email`. Botões, formulário, WhatsApp flutuante e JSON-LD usam esses valores. O link do WhatsApp flutuante também está no `index.html` (para funcionar sem JS).

## Formulário de orçamento
O visitante marca serviços, descreve o projeto e informa os contatos. O envio abre o WhatsApp com a mensagem pronta (ou o e-mail, pelo segundo botão). Nada é enviado a servidor e nunca aparece sucesso falso. Opcional: `assets/js/config.js → formEndpoint` (ex.: Formspree).

## Publicar
1. Gere a pasta pronta: `bash portfolio/scripts/build-dist.sh` → `portfolio/dist/` (só os arquivos usados, sem caminhos `../`, site na raiz do domínio).
- **Vercel / Netlify:** comando de build `bash portfolio/scripts/build-dist.sh`, diretório de saída `portfolio/dist`. Ou arraste a pasta `dist/` no painel da Netlify.
- **GitHub Pages:** o workflow `.github/workflows/publicar-site.yml` publica outro site; para o portfólio, ative Pages pela raiz da branch e acesse `/portfolio/`.
- **Antes de publicar:** troque `TODO(domínio)` no `index.html` e `https://SEU-DOMINIO` em `robots.txt` e `sitemap.xml` pelo domínio real (ver `docs/SEO.md`).

## Estrutura
```
index.html  ·  content/{portfolio,pricing}.json  ·  assets/css/{tokens,base}.css
assets/js/{main,data,dom,nav,reveal,lightbox,form,config}.js  ·  assets/js/render/*.js
media/ (gerado)  ·  scripts/optimize-media.sh  ·  tests/qa.js  ·  docs/*.md
```

## Testes
`node portfolio/tests/qa.js` (Playwright, 51 verificações) — relatório em `docs/QA_REPORT.md`.
