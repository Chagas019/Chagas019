# QA Plan — Chagas Portfolio

Escopo: `portfolio/index.html` (estático, HTML/CSS/JS vanilla), conteúdo em `portfolio/content/*.json`.
Automação: `node portfolio/tests/qa.js [porta]` (Playwright/Chromium, servidor próprio, porta padrão 8091).
Relatório: `portfolio/tests/qa-report.json` + screenshots em `portfolio/tests/screenshots/`.

## Escala de severidade

| Nível | Definição | Bloqueia release? |
|---|---|---|
| S1 Crítico | Página quebra, conteúdo principal ausente, form/nav inutilizável, erro JS fatal | Sim |
| S2 Alto | Falha WCAG AA, link/asset 404, overflow horizontal, budget de performance estourado | Sim |
| S3 Médio | Inconsistência visual, SEO incompleto, animação com jank, aviso (WARN) relevante | Não (corrigir no sprint) |
| S4 Baixo | Polimento, copy, micro-detalhe | Não |

Harness: FAIL = S1/S2, WARN = S3/S4. Exit code 1 se houver qualquer FAIL.

## 1. Responsividade — viewports 360, 390, 768, 1024, 1440, 1920
- Sem scroll horizontal (`scrollWidth <= innerWidth`) em todas as larguras. (S2)
- Tipografia legível: corpo >= 16px no mobile; títulos sem quebra de palavra cortada. (S3)
- Grid de projetos: 1 col (<=390), 2 col (768), 3+ col (>=1024). (S3)
- Tabela/cards de preço legíveis sem zoom em 360px. (S2)
- Alvos de toque >= 44x44px em <=768px. (S2)
- Screenshot full-page de cada viewport revisado manualmente. (S3)

## 2. Navegação e links
- Todo `href` interno (`#id` ou caminho relativo) resolve: âncora existe ou recurso retorna 200. (S2)
- Todo `src` (img, script, link stylesheet, source) retorna 200; zero requests falhos. (S2)
- Links externos com `target=_blank` têm `rel="noopener"`. (S3)
- Menu mobile (<=768): botão `[data-nav-toggle]` alterna `aria-expanded` true/false, abre/fecha o menu, fecha com Esc e ao clicar em um link. (S1)
- Smooth scroll respeita reduced-motion. (S3)

## 3. Formulário de contato (`form#contact-form`)
- Campos name, email, message com `<label>` associado. (S2)
- Submit vazio é bloqueado; campos inválidos recebem `aria-invalid="true"`. (S1)
- Mensagem de erro textual ligada por `aria-describedby` e anunciada (`aria-live` / `role=alert`). (S2)
- E-mail inválido rejeitado; foco vai ao primeiro campo inválido. (S2)
- Sucesso: feedback visível + acessível; sem recarregar página com erro. (S2)
- `autocomplete` adequado (name, email). (S4)

## 4. Acessibilidade — WCAG 2.1 AA
- 1 único `<h1>`; hierarquia de headings sem saltos. (S2)
- `<html lang>` definido; landmarks `header`, `nav`, `main`, `footer`. (S2)
- Todo botão/link com nome acessível (texto, `aria-label` ou `aria-labelledby`). (S2)
- Toda imagem com `alt` (decorativa: `alt=""`). (S2)
- Contraste texto >= 4.5:1 (>= 3:1 texto grande / UI). (S2)
- Foco visível em todos os interativos; ordem de tab lógica; skip link. (S2)
- Lightbox: `role=dialog` + `aria-modal`, foco preso, Esc fecha, setas navegam, foco retorna ao gatilho. (S1)
- Nada depende só de cor; zoom 200% sem perda de conteúdo. (S2)

## 5. Performance (budgets, Lighthouse mobile simulado)
- LCP < 2.5s; CLS < 0.1; INP < 200ms. (S2)
- JS total transferido < 60KB (sem compressão estimada pelo harness). (S2)
- CSS total < 50KB; fontes <= 2 famílias, `font-display: swap`, preload da principal. (S3)
- Imagens abaixo da dobra com `loading="lazy"`; todas com `width`/`height` (ou aspect-ratio). (S2)
- Imagens em AVIF/WebP com `srcset`/`sizes`; hero com `fetchpriority="high"`. (S3)
- Nenhum erro no console; zero 404. (S2)

## 6. SEO
- `<title>` 30–60 caracteres; `meta description` 70–160. (S3)
- `link rel=canonical`; Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`); `twitter:card`. (S3)
- JSON-LD válido (`Person` ou `ProfessionalService`) parseável. (S3)
- `meta viewport` presente; `alt` descritivo nas imagens de projeto. (S2)
- Conteúdo de projetos/preços visível no DOM após render (JS rendering ok). (S3)

## 7. Animações
- Reveal anima apenas `opacity`/`transform` (sem layout shift; CLS inalterado). (S2)
- `prefers-reduced-motion: reduce`: todo conteúdo visível (opacity 1) sem depender de scroll/IntersectionObserver. (S1)
- Sem JS: conteúdo não fica oculto (classe `.js` controla estado inicial). (S2)
- 60fps em scroll no desktop; nada de animação infinita chamativa. (S3)

## 8. Conteúdo dinâmico
- `#trabalhos`: renderiza 1 `[data-project]` por item de `content/portfolio.json`; cada um abre lightbox. (S1)
- `#investimento`: 7 `[data-pricing-service]`, cada um com 3 `[data-pricing-tier]`, valores formatados BRL. (S1)
- Falha ao carregar JSON exibe fallback amigável, sem erro fatal. (S2)

## 9. UX
- CTA principal visível acima da dobra em 360px e 1440px. (S2)
- Estados hover/focus/active consistentes; cursor pointer em clicáveis. (S3)
- Header fixo não cobre âncoras (`scroll-margin-top`). (S3)
- Copy em pt-BR revisada; sem lorem ipsum. (S3)

## Processo
1. Dev roda `node portfolio/tests/qa.js` localmente antes de cada entrega.
2. QA executa harness + revisão manual (screenshots, teclado, leitor de tela NVDA/VoiceOver).
3. Lighthouse mobile para LCP/CLS reais; anexar valores ao relatório.
4. Bugs registrados com severidade, viewport, passos e screenshot.
