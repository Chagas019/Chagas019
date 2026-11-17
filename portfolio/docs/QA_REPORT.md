# QA_REPORT — CHAGAS CREATIVE (v3)

Data: 2026-11-17 · `node portfolio/tests/qa.js` (Playwright/Chromium) · Critérios: `docs/QA_PLAN.md`

## Resultado: **51 PASS · 0 WARN · 0 FAIL**

| Área | O que foi verificado | Resultado |
|---|---|---|
| Carregamento | HTTP 200, 0 erros de console, 0 requisições falhas | PASS |
| Navegação | 8 seções, 8 âncoras do menu; menu mobile 360/390/768 (aria-expanded, Esc) | PASS |
| Links | todas as referências internas; externos com `rel` seguro; Instagram, mailto e wa.me corretos | PASS |
| SEO | title, description, OG, JSON-LD, 1 `h1`, ordem de headings | PASS |
| Acessibilidade | landmarks + skip link, nomes acessíveis, labels, contraste | PASS |
| Imagens | `alt`, `width/height`, lazy; AVIF/WebP com srcset | PASS |
| Conteúdo | 4 grupos / 12 preços em R$ pt-BR + aviso e nota; 11 projetos com tipo e filtro; 5 produtos com preço/"Sob consulta" e botão WhatsApp | PASS |
| Sem conteúdo falso | sem lorem ipsum, example.com visível ou imagens de banco | PASS |
| Formulário de orçamento | bloqueia envio vazio; aria-invalid + mensagens; e-mail inválido; mensagem do WhatsApp contém serviços e descrição; alternativa por e-mail; nunca simula "enviado" | PASS |
| WhatsApp flutuante | visível no mobile, href correto, não cobre os botões de envio | PASS |
| Lightbox / detalhes | role=dialog, foco entra/preso/retorna, setas, Esc | PASS |
| Responsivo | sem overflow em 360/390/768/1024/1440/1920 | PASS |
| Movimento | reduced-motion: tudo visível, 0 animações infinitas | PASS |
| Performance | JS 64 KB / 80 KB; CLS 0,042; LCP 256 ms (localhost) | PASS |

## Problemas encontrados e corrigidos
- 1ª rodada v3 (antes do JS novo): 10 FAIL — preços, projetos, produtos e checkboxes vazios; envio vazio fazia GET; WhatsApp flutuante fora da tela; CLS 0,103; erro no `reveal.js`. Corrigidos pelo Frontend.
- Revisão visual do orquestrador: **título do hero invisível** — o `clip-path` da animação impedia o IntersectionObserver de detectá-lo; e o título (152 px) empurrava subtítulo e botões para fora da primeira tela. Correção: elementos acima da dobra revelam no carregamento; título limitado a `12.5svh`. Monograma estático "CH" → "CC".

## Pendências (dependem de conteúdo, não bloqueiam)
- **S2** Domínio: canonical/OG/JSON-LD/sitemap/robots usam `TODO(domínio)` / `https://SEU-DOMINIO`.
- **S3** Projetos e produtos sem imagem mostram placeholder honesto até receber mídias reais.
- **S3** LCP medido em localhost sem throttling — confirmar com Lighthouse após publicar.
