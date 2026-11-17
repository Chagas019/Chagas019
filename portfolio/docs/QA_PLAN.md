# QA Plan — CHAGAS CREATIVE (v3)

Escopo: `portfolio/index.html` (estático, HTML/CSS/ES modules), conteúdo em `portfolio/content/portfolio.json` e `portfolio/content/pricing.json`.
Fonte da verdade: `docs/BRIEFING.md` → "CONTRATO DE DADOS" e "CONTRATO DE MARCAÇÃO".
Automação: `node portfolio/tests/qa.js [porta]` (Playwright/Chromium, servidor próprio na raiz do repo, porta padrão 8091).
Saída: `portfolio/tests/qa-report.json` + `portfolio/tests/screenshots/*.png`. Exit 0 = sem FAIL, 1 = algum FAIL, 2 = erro do harness.

Contagens esperadas são lidas em tempo de execução dos JSON (nada fixo no teste): grupos/itens de `pricing.json`, `selected.length`, `products.length`, `projects.length`.

## Severidade

| Nível | Definição | Bloqueia release? |
|---|---|---|
| S1 Crítico | Página quebra, conteúdo principal ausente, form/nav inutilizável, erro JS fatal | Sim |
| S2 Alto | Falha WCAG AA, link/asset 404, overflow horizontal, budget estourado, dado divergente do JSON | Sim |
| S3 Médio | Inconsistência visual, SEO incompleto, aviso relevante | Não |
| S4 Baixo | Polimento, copy | Não |

Harness: FAIL = S1/S2, WARN = S3/S4.

## 1. Estrutura e navegação (S1)
- `sections.present`: `#home #sobre #servicos #portfolio #projetos #produtos #orcamento #contato`.
- `nav.anchors`: `[data-nav-menu]` tem exatamente 8 `a[href="#…"]`, todas resolvem e cobrem as 8 seções.
- `nav.mobile-360/390/768`: `button[data-nav-toggle]` alterna `aria-expanded`, menu visível/oculto, Esc fecha.
- `links.internal` (S2): todo href/src/srcset interno resolve (âncora existe ou HTTP 200). `links.external-rel` (S3): `target=_blank` com `rel=noopener`.

## 2. Preços — `#orcamento` (S2)
- `content.pricing`: nº de `[data-pricing-group]` == `groups.length`; nº de `[data-pricing-item]` == total de itens; cada item mostra `price_from` em BRL pt-BR (`R$ 1.234`, aceita `,00` e NBSP); `price_from: null` → "Sob consulta".
- `content.pricing-notes`: textos `disclaimer` e `note` do JSON presentes (`[data-slot=pricing-disclaimer|pricing-note]`).

## 3. Projetos selecionados — `#projetos` (S2)
- `content.selected`: nº de `[data-selected-project]` == `selected.length`; todo `data-type` ∈ {realizado, pessoal, conceitual}.
- `content.selected-filters`: botões em `[data-slot=selected-filters]` mudam o conjunto visível; filtro de tipo só mostra itens daquele tipo; botões expõem `aria-pressed`/`aria-selected` (ausência = WARN).

## 4. Produtos digitais — `#produtos` (S2)
- `content.products`: nº de `[data-product]` == `products.length`; cada card tem preço ("R$…" ou "Sob consulta") e CTA `a[href^="https://wa.me/5519989905361"]`.

## 5. Formulário — `form#quote-form` (S1)
- `form.fields`: `name`, `email`, `phone`, `message` + checkboxes `name="services"`.
- `form.blocks-empty`: envio vazio não navega, não faz POST e não abre WhatsApp.
- `form.aria-invalid` + `form.error-messages`: campos inválidos com `aria-invalid="true"` + `aria-describedby` apontando para texto de erro + região `aria-live`/`role=alert|status` populada em `#orcamento`.
- `form.email-format`: e-mail inválido rejeitado.
- `form.whatsapp`: com ≥1 serviço + dados válidos, o submit WhatsApp (`[data-submit=whatsapp]`) gera URL `https://wa.me/5519989905361?text=…` contendo os rótulos dos serviços marcados e a mensagem. `window.open` é substituído via `addInitScript` (log em `window.__opened`); navegações para wa.me são abortadas e registradas; popups capturados.
- `form.mailto`: existe alternativa por e-mail (`[data-submit=email]` ou `a[href^=mailto:]`).
- `form.no-fake-success` (S3): nenhuma mensagem de "enviado com sucesso" simulada.

## 6. WhatsApp flutuante e contatos (S2)
- `whatsapp.float`: `a[data-whatsapp-float]` existe, href começa com `https://wa.me/5519989905361`, nome acessível.
- `whatsapp.float-mobile` (390px): visível e dentro do viewport após rolagem (deve ser `position: fixed`).
- `whatsapp.float-vs-submit` (390px): com os botões de submit rolados ao centro (FAIL) e ao fim do viewport (WARN), o botão flutuante não se sobrepõe e `elementFromPoint` atinge o submit. Screenshot `float-vs-submit-390.png`.
- `contact.links`: Instagram `https://www.instagram.com/chagas_catolico/`, `mailto:hh3356577@gmail.com`, link wa.me — dentro de `#contato` (fora dele = WARN).

## 7. Sem conteúdo falso (S2)
- `content.no-fake`: sem "lorem ipsum", sem `example.com` no texto renderizado, sem tokens PLACEHOLDER/TODO visíveis, nenhum `src/srcset/poster/style/background-image` de bancos de imagem (unsplash, pexels, pixabay, shutterstock, istock, getty, freepik, Adobe Stock, picsum, placehold…), e os JSON de conteúdo também não os referenciam.
- `seo.no-placeholder-meta` (S3): meta/canonical/JSON-LD sem `example.com`/PLACEHOLDER (WARN enquanto `site.url` for "" sem domínio de deploy).
- Manual: nenhum cliente, métrica, resultado, data ou contrato inventado (conferir contra BRIEFING).

## 8. Acessibilidade — WCAG 2.1 AA (S2)
- `seo.h1` (1 único h1), `a11y.heading-order` (WARN em saltos), `a11y.landmarks` (header/nav/main/footer + skip link), `a11y.names`, `a11y.form-labels`, `a11y.contrast` (heurística, WARN — confirmar com axe/Lighthouse), `a11y.touch-targets-360` (WARN < 44px).
- Lightbox: `lightbox.open` (role=dialog + aria-modal), `focus-in`, `focus-trap`, `arrows`, `esc`, `focus-return`.

## 9. Responsividade (S2)
- `responsive.no-overflow` em 360/390/768/1024/1440/1920; screenshots `full-<w>.png` revisados manualmente.

## 10. Performance (S2)
- `perf.js-budget`: JS total ≤ **80KB** (elevado de 60KB no v3: módulos novos de projetos selecionados, produtos e formulário de orçamento).
- `perf.cls` < 0.1 e `perf.lcp` < 2.5s (lab, 390px, sem throttling — confirmar com Lighthouse mobile).
- `img.alt-dimensions` (alt + width/height ou aspect-ratio, nenhuma quebrada), `img.lazy` (abaixo da dobra com `loading=lazy`).
- `console.errors` = 0, `network.failed` = 0 (requisições wa.me abortadas pelo stub são ignoradas).

## 11. SEO (S3)
- `seo.meta`: title 30–60, description 70–160, viewport, lang, canonical, Open Graph completo, twitter:card, JSON-LD parseável.

## 12. Movimento
- `motion.reduced-visible` (S1): com `prefers-reduced-motion: reduce`, todo `[data-reveal]`, seções, projetos, preços, selecionados e produtos com opacidade 1 sem rolar.
- `motion.reduced-no-infinite` (S3): nenhuma animação infinita rodando.

## Processo
1. Cada agente roda `node portfolio/tests/qa.js` antes de entregar.
2. QA executa harness + revisão manual (screenshots, teclado, leitor de tela) e registra em `docs/QA_REPORT.md` com severidade, viewport, passos e evidência.
3. Lighthouse mobile para LCP/CLS reais.
