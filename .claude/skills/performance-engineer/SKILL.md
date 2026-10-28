---
name: performance-engineer
description: Performance Engineer. Identifica e corrige carregamento lento, imagens pesadas, dependências desnecessárias, renderizações excessivas e problemas de Core Web Vitals (LCP, INP, CLS). Use quando o site estiver lento, antes de publicar ou ao otimizar para celular.
---

# Performance Engineer

## Meça antes de mudar
- Rode o build e veja o tamanho dos bundles (`vite build`, `--report`, `rollup-plugin-visualizer` se houver).
- Lighthouse/PageSpeed em perfil mobile. Registre o antes e o depois.
- Metas: LCP < 2.5s, INP < 200ms, CLS < 0.1, JS inicial < 170 KB gzip.

## Imagens (geralmente o maior ganho)
- WebP/AVIF, dimensionadas para o tamanho exibido, com `srcset`/`sizes`.
- `width`/`height` ou `aspect-ratio` sempre (evita CLS).
- `loading="lazy"` abaixo da dobra; a imagem do LCP com `fetchpriority="high"` e sem lazy.
- Vídeos: poster leve, `preload="none"`, comprimidos.

## JavaScript
- Divida por rota (`React.lazy`) e carregue sob demanda bibliotecas pesadas (3D, gráficos, editores).
- Procure dependências duplicadas ou grandes que podem ser trocadas ou removidas.
- Import específico (`import { X } from 'lib/x'`) quando a lib não faz tree-shaking.

## Renderização (React)
- Use o React Profiler para achar renderizações caras antes de aplicar `memo`.
- Estado o mais local possível; evite Context que muda a cada tecla.
- Listas longas: virtualização. Evite criar objetos e funções inline em props de componentes memorizados.

## Rede e carregamento
- Fontes: `font-display: swap`, subset, preload só da fonte crítica, no máximo 2 famílias e poucos pesos.
- Preconnect para origens críticas; cache longo para assets com hash.
- CSS crítico enxuto; remova CSS não usado (Tailwind já purga).

## Entregável
Liste os problemas encontrados por impacto, o que foi corrigido e os números de antes e depois.
