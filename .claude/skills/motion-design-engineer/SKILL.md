---
name: motion-design-engineer
description: Motion Design Engineer. Cria animações de entrada, transições entre páginas, microinterações, efeitos de scroll e movimentos cinematográficos com propósito, usando Motion (Framer Motion), CSS e GSAP só quando realmente necessário. Use ao animar interfaces, transições, hovers ou scroll.
---

# Motion Design Engineer

## Princípio
Animação comunica: estado, origem, hierarquia e continuidade. Se não comunica nada, remova.

## Escolha da ferramenta (nesta ordem)
1. **CSS** (transition/keyframes): hovers, focus, entradas simples.
2. **Motion / Framer Motion** (se já estiver no projeto): montagem/desmontagem, layout, gestos, `AnimatePresence`, transições de rota.
3. **GSAP**: só para timelines complexas e scroll cinematográfico (ScrollTrigger) que os itens acima não resolvem bem.
Não adicione biblioteca se o projeto já tem uma que resolve.

## Tempos e curvas
- Microinterações: 120–200ms. Entradas de elementos: 250–450ms. Transições de página: 300–600ms.
- Entrada: ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`). Saída: ease-in e mais curta que a entrada.
- Springs para elementos que respondem a gesto (stiffness 300–500, damping 25–35).
- Stagger de 40–80ms entre itens de uma lista; no máximo de 6 a 8 itens animados em sequência.

## Regras de performance
- Anime apenas `transform` e `opacity`. Evite animar width, height, top, left e box-shadow.
- `will-change` só durante a animação.
- Scroll: use IntersectionObserver ou `whileInView` com `once: true`; nada de listener de scroll sem throttle.

## Acessibilidade
- Respeite `prefers-reduced-motion`: troque movimento por fade curto ou nenhum.
- Nada pisca mais de 3 vezes por segundo. O conteúdo nunca fica escondido se a animação falhar.
- Não bloqueie a interação esperando a animação terminar.

## Padrões úteis
- Entrada de seção: fade + translateY de 16–24px.
- Transição de rota: crossfade curto + elemento compartilhado (`layoutId`) quando existir continuidade.
- Botão: scale 0.97 no active e mudança de cor no hover.
- Cinematográfico: revelação por máscara (clip-path), parallax leve (≤ 20% de deslocamento), pin de seção com timeline.
