# Chagas — Portfólio (site estático)

HTML + CSS + ES modules, sem framework e sem build. Funciona em GitHub Pages, Vercel ou Netlify.

## Rodar localmente

```bash
# na raiz do repositório (as mídias são referenciadas como ../videos, ../resultado …)
python3 -m http.server 8000
# abra http://localhost:8000/portfolio/
```
`file://` não funciona (o conteúdo é carregado via `fetch`).

## Estrutura

```
portfolio/
  index.html                 página única (seções: sobre, currículo, trabalhos, serviços, planos, contato)
  assets/css/tokens.css      design tokens (fonte: docs/DESIGN_SYSTEM.md)
  assets/css/base.css        reset, layout e componentes (usa só var(--token, fallback))
  assets/js/config.js        ← endpoint do formulário, canal de fallback, caminhos
  assets/js/main.js          boot: carrega dados e chama os renderizadores
  assets/js/data.js          loader (content/*.json → fallback em content/_fixtures/ com aviso no console)
  assets/js/render/*.js      profile, projects, gallery, pricing, contact, media (srcset/manifest)
  assets/js/lightbox.js      galeria modal (teclado, foco preso, swipe, vídeo)
  assets/js/nav.js · reveal.js · form.js · dom.js
  content/portfolio.json     site, perfil, categorias, projetos, pendências
  content/pricing.json       serviços, planos, adicionais, termos
  media/                     variantes geradas (WebP/AVIF 640/1280/1920 + posters) e manifest.json
  scripts/optimize-media.sh  gera media/ a partir dos originais (que ficam intactos)
```

## Adicionar um projeto

1. Copie as mídias para uma pasta do repositório (ex.: `fotos/`, `videos/`).
2. Rode `bash portfolio/scripts/optimize-media.sh` (requer `ffmpeg`; gera variantes + `media/manifest.json`).
   Para pastas novas, passe os arquivos: `bash portfolio/scripts/optimize-media.sh fotos/novo.jpg videos/novo.mp4`
   (sem argumentos ele varre videos/ resultado/ midia/ fotos/ social/ e reescreve o manifest).
3. Em `content/portfolio.json`, adicione em `projects`:
   `{ "id", "title", "category", "year", "client", "description", "role", "featured", "status": "published",
     "cover": {"src":"../fotos/novo.jpg","alt","w","h"}, "media": [{ "type":"image|video", "src", "poster", "alt", "w", "h" }] }`
   `src` é relativo a `portfolio/index.html` (por isso `../`). O srcset é montado automaticamente quando o `src` está no manifest.
   `status: "draft"` ou `"hidden"` oculta o projeto. Categorias sem projeto mostram o bloco honesto "Em curadoria".

## Formulário

`assets/js/config.js → formEndpoint` (ex.: URL do Formspree). Vazio = o envio abre WhatsApp (ou e-mail) com a
mensagem montada e avisa o usuário; nunca exibe sucesso falso. Sem e-mail/WhatsApp no JSON, mostra erro honesto.

## Deploy

- **GitHub Pages**: publique a raiz do repositório; acesse `/portfolio/`.
- **Vercel / Netlify**: diretório de saída = raiz do repositório (sem comando de build). As mídias em `../` precisam ser publicadas junto.
- Antes: troque `https://example.com/portfolio/` (canonical, OG, JSON-LD) pela URL real.

## Testes

`node portfolio/tests/qa.js` (Playwright) — contrato de data-attributes documentado no topo do arquivo.
