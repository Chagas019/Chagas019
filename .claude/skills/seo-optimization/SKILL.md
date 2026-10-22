---
name: seo-optimization
description: Melhora metadados, indexação, dados estruturados, imagens, links, carregamento e Core Web Vitals para SEO técnico e on-page. Use ao publicar páginas, criar landing pages, revisar o SEO de um site ou quando o site não aparece bem no Google.
---

# SEO Optimization

## Metadados (toda página)
- `<title>` único, 50–60 caracteres, com o termo principal no início.
- `<meta name="description">` única, 140–160 caracteres, com chamada para ação.
- `<link rel="canonical">`, `<html lang="pt-BR">`, `viewport`.
- Open Graph e Twitter Card (`og:title`, `og:description`, `og:image` 1200×630, `og:url`).
- Favicon e `apple-touch-icon`.

## Indexação
- `robots.txt` correto e `sitemap.xml` atualizado (e enviado ao Search Console).
- SPA (React/Vite): conteúdo importante precisa estar no HTML; considere pré-renderização/SSG para páginas públicas; metadados por rota.
- URLs limpas, curtas e estáveis; redirecionamento 301 ao mudar.
- Páginas privadas ou duplicadas com `noindex`.

## Conteúdo e estrutura
- Um `h1` com o tema da página; `h2`/`h3` descrevendo as seções.
- Texto real e útil (não só imagem); links internos com texto descritivo (nada de "clique aqui").
- Dados estruturados JSON-LD conforme o caso: `Organization`, `LocalBusiness`, `Event`, `Article`, `Product`, `BreadcrumbList`, `FAQPage`.

## Imagens
- Nome de arquivo descritivo, `alt` útil, WebP/AVIF, dimensões e lazy loading (ver `performance-engineer`).

## Performance
Core Web Vitals entram no ranqueamento: LCP < 2.5s, INP < 200ms, CLS < 0.1.

## Checklist
- [ ] Title e description únicos em cada página.
- [ ] Canonical, OG e sitemap OK.
- [ ] Conteúdo visível sem JavaScript ou pré-renderizado.
- [ ] JSON-LD válido (Rich Results Test).
- [ ] Sem links quebrados nem erros 404 internos.
- [ ] Lighthouse SEO ≥ 95.
