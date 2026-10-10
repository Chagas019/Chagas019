# Theo Valente — site de fotógrafo (Next.js + Tailwind + GSAP + Lenis)

## Regra de ouro das animações

**Toda animação usa Lenis no scroll e GSAP no movimento.**

- O scroll é sempre do Lenis (`src/components/SmoothScroll.tsx`). Nunca usar `scroll-behavior: smooth`, `window.scrollTo` com `behavior` ou outra lib de scroll.
- Todo movimento é GSAP (`gsap`, `ScrollTrigger`). Nada de animação via CSS `@keyframes`/`transition` para entrada, saída ou scroll — CSS só para hover simples, e mesmo assim respeitando a duração e o ease abaixo.
- Sempre importar o GSAP de `@/lib/gsap` (registra o ScrollTrigger uma vez só, no cliente).
- Animações em componentes usam `useGSAP`-like: `gsap.context()` dentro de `useLayoutEffect` (via `useIsoLayoutEffect`) e `ctx.revert()` no cleanup.

## Ritmo cinematográfico (obrigatório)

- Nada entra ou sai em menos de **0.6s**.
- Ease só **power3** (`power3.out`, `power3.inOut`, `power3.in`) ou **expo** (`expo.out`, `expo.inOut`). Scrub usa `ease: "none"` só no tween linear que acompanha o scroll.
- Em CSS, os equivalentes são `--ease-power3: cubic-bezier(0.215, 0.61, 0.355, 1)` e `--ease-expo: cubic-bezier(0.16, 1, 0.3, 1)`.
- Sequências: stagger de 0.2s entre elementos.
- Sites cinematográficos são lentos com intenção.

## Lenis × ScrollTrigger (mobile)

A integração fica só em `SmoothScroll.tsx` e não pode mudar:

1. `lenis.on("scroll", ScrollTrigger.update)`
2. O `raf` do Lenis roda no `gsap.ticker` (`lenis.raf(time * 1000)`) e `gsap.ticker.lagSmoothing(0)`.
3. Em toque, o Lenis **não** sequestra o scroll nativo (`syncTouch: false`) — é isso que evita o pulo no mobile.
4. `ScrollTrigger.config({ ignoreMobileResize: true })` para a barra do navegador não recalcular os pins.
5. Alturas de tela com `svh`, nunca `vh`, em seções com pin.
6. Pins usam `anticipatePin: 1` e `invalidateOnRefresh: true`.

## Estrutura

- `src/app/page.tsx` — monta as seções.
- `src/components/` — `Nav`, `Hero`, `PinSequence`, `Services`, `Gallery`, `Contact`, `SmoothScroll`.
- `public/media/` — vídeo do hero e fotos. As imagens atuais são provisórias (geradas); trocar pelas fotos reais mantendo os nomes.

## Comandos

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint
