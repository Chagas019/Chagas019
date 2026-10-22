---
name: responsive-layout
description: Adapta cada tela a celulares, tablets, notebooks e monitores ultrawide, com mobile-first, breakpoints coerentes, tipografia fluida e alvos de toque adequados. Use ao construir ou corrigir layouts que quebram em algum tamanho de tela.
---

# Responsive Layout

## Abordagem
- Mobile-first: estilo base para 360px e `min-width` para crescer.
- Breakpoints pelo conteúdo, não por aparelho. Referência: 480, 768, 1024, 1280, 1536, 1920+.
- Teste em 360, 390, 768, 1024, 1366, 1920 e 2560px de largura, e também em paisagem no celular.

## Técnicas
- Grid/Flex com `minmax()`, `auto-fit`, `gap` e `clamp()` em vez de larguras fixas.
- Tipografia fluida: `font-size: clamp(2rem, 1rem + 4vw, 5rem)`.
- Container com `max-width` e padding lateral (16px no mobile, 24–48px no desktop).
- Container queries para componentes que mudam conforme o espaço disponível.
- Imagens: `max-width: 100%`, `aspect-ratio`, `object-fit` e `srcset`.
- Use `100dvh`/`svh` em vez de `100vh` no mobile.

## Ultrawide (1920px+)
- Limite a largura do conteúdo de leitura (≈ 1200–1440px); deixe só fundos e imagens irem até a borda.
- Aumente o espaçamento e a escala com moderação; não estique o texto.

## Mobile
- Alvos de toque ≥ 44×44px, com espaço entre eles.
- Navegação clara (menu acessível ou barra inferior); nada que dependa de hover.
- Sem rolagem horizontal acidental (`overflow-x` só em componentes intencionais).
- Inputs com o `type`/`inputmode` certo e fonte ≥ 16px (evita zoom no iOS).
- Respeite as safe areas (`env(safe-area-inset-*)`).

## Checklist
- [ ] Nenhum texto cortado ou sobreposto em 360px.
- [ ] Nenhuma rolagem horizontal.
- [ ] Imagens nítidas e sem distorção.
- [ ] Hierarquia mantida em todos os tamanhos.
