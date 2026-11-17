# BRIEFING v4 — Evolução visual (CHAGAS CREATIVE)

Base = o site atual em `portfolio/` (v3, 51/51 no QA). **Evoluir, não recriar.** Conteúdo e contrato de dados/marcação de `docs/BRIEFING.md` continuam valendo (seções, slots, hooks de teste). Não inventar conteúdo. Não instalar dependências.

## Referência estética
"Mobile App Design System — DeebPro Studio" (Dribbble; o domínio está bloqueado nesta sessão, então use os princípios): design system consistente, hierarquia visual profissional, tipografia moderna e bem trabalhada, composição sofisticada, espaçamento equilibrado, **cards com acabamento premium**, contraste e legibilidade, consistência entre componentes, microinterações e transições elegantes, excelência no mobile.

Tradução para este projeto: manter a paleta (preto/grafite/papel + destaque REC laranja) e a assinatura de estúdio, mas trocar o visual "flat e cru" por **superfícies em camadas**: cards arredondados (raio médio), bordas hairline, leve brilho interno no topo, elevação sutil, padding generoso, grid de 8 px, componentes com estados claros (hover/focus/active/disabled), chips e badges consistentes, botões em 2–3 tamanhos. Mobile-first: alvos ≥ 44 px, nada de texto espremido.

## Novos tokens (Design System define os valores; os outros usam com fallback)
`--r-sm` (≈10px) · `--r-md` (≈16px) · `--r-card` (≈20px) · `--r-lg` (≈28px) · `--r-pill` (999px)
`--surface-0` (fundo) · `--surface-1` (card) · `--surface-2` (card elevado/hover) · `--surface-3` (input/chip)
`--border-hairline` · `--border-strong` · `--highlight-top` (brilho interno, ex. inset 0 1px 0 rgba(255,255,255,.06))
`--elev-1` · `--elev-2` · `--elev-3` (box-shadow) · `--ring-focus`
`--sp-*` existentes · `--dur-*`/`--ease-*` existentes (+ `--ease-spring` se útil)

## Posse de arquivos (ninguém edita arquivo de outro)
- Agente 1 UI/UX: `index.html`, `docs/UX_AUDIT.md`
- Agente 2 Frontend: `assets/css/base.css`, `assets/js/render/*.js`, `assets/js/form.js`, `assets/js/lightbox.js`
- Agente 3 Motion: `assets/css/motion.css`, `assets/js/motion.js`, `assets/js/reveal.js`, `assets/js/nav.js`
- Agente 4 Design System: `assets/css/tokens.css`, `docs/DESIGN_SYSTEM.md`
- Agente 5 QA: `tests/**`, `docs/QA_REPORT.md` (depois da integração)
- Orquestrador: `content/*.json`, `main.js`, commits.

Servidor: `python3 -m http.server 8123` na raiz do repo → `http://localhost:8123/portfolio/` (já rodando). Testes: `node portfolio/tests/qa.js`. Screenshots com Playwright (preinstalado). Sem git commit. Relatório final ≤ 15 linhas.
