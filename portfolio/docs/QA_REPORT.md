# QA_REPORT — Portfólio Chagas

Data: 2026-11-17 · Ferramenta: `node portfolio/tests/qa.js` (Playwright/Chromium) · Critérios: `docs/QA_PLAN.md`

## Resultado: **36 PASS · 0 WARN · 0 FAIL**

| Área | Checks | Resultado |
|---|---|---|
| Carregamento | HTTP 200, 0 erros de console, 0 requisições falhas | PASS |
| Links | 116 referências internas válidas; externos com `rel` seguro | PASS |
| SEO | title/description/OG/JSON-LD, 1 `h1`, ordem de headings | PASS |
| Acessibilidade | landmarks + skip link, nomes acessíveis, labels, contraste (fundos sólidos) | PASS |
| Imagens | 10 imgs com `alt`, `width/height`, lazy; AVIF/WebP com srcset | PASS |
| Conteúdo | 3/3 projetos; 7 serviços × 3 planos | PASS |
| Formulário | bloqueia envio vazio, `aria-invalid`, mensagens via `aria-describedby`, região live, e-mail inválido | PASS |
| Lightbox | `role=dialog`, foco entra/preso/retorna, setas, Esc | PASS |
| Responsivo | sem overflow em 360/390/768/1024/1440/1920; menu mobile 360/390/768 | PASS |
| Movimento | `prefers-reduced-motion`: conteúdo visível, 0 animações infinitas | PASS |
| Performance | JS 43,6 KB / 60 KB; CLS 0,020; LCP 188 ms (localhost) | PASS |

## Problemas encontrados e corrigidos
- 1ª rodada (site parcial): 10 FAIL — CSS/JS 404, preços ausentes, form enviava GET, lightbox e menu sem ARIA. Corrigidos pelo Agent 04.
- Harness: crash quando o form navegava; 404 contando no orçamento de JS. Corrigidos pelo Agent 05.
- Revisão visual (orquestrador): blocos "Em curadoria" exibiam notas internas de briefing ao visitante → passaram a usar o texto público da categoria. Função morta `renderHero` removida.

## Pendências (não bloqueiam, dependem de conteúdo)
- **S2** Canonical, OG e JSON-LD apontam para `example.com` — trocar pelo domínio final.
- **S2** Sem canal de contato configurado: o form mostra erro honesto até preencher e-mail/WhatsApp em `content/portfolio.json` ou `formEndpoint` em `assets/js/config.js`.
- **S3** Mosaico em 1440 px deixa espaço vazio à direita do tile vertical (estético).
- **S3** LCP medido em localhost sem throttling — confirmar com Lighthouse após publicar.
- **S3** Contraste verificado só sobre fundos sólidos (não sobre imagens/gradientes).
