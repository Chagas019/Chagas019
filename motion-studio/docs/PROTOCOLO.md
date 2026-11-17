# Protocolo do Estúdio — contratos, posse de arquivos e handoff

Todos os caminhos são relativos à raiz do repositório. O projeto Remotion fica em `motion-studio/`.

## Posse de arquivos (cada agente só ESCREVE nos seus)

| Agente | Biblioteca (reutilizável) | Por projeto (`src/projetos/<slug>/`) | Assets |
|---|---|---|---|
| motion-voz | `src/voz/` | `voz.ts` | `public/audio/narracao/` |
| motion-cenas | `src/cenas/` | `cenas.ts` | — |
| motion-personagens | `src/personagens/` | `personagens.ts` (opcional) | `public/personagens/` |
| motion-texto | `src/texto/` | `texto.ts` (opcional) | `public/fontes/` |
| motion-pecas | `src/pecas/` | `pecas.ts` (opcional) | `public/assets/` |
| motion-movimento | `src/movimento/` | `movimento.ts` (opcional) | — |
| motion-cor | `src/cor/` | `estilo.ts` | — |
| motion-som | `src/som/`, `scripts/gerar-sfx.sh` | `som.ts` | `public/audio/sfx/`, `public/audio/trilha/` |
| motion-codigo | `src/config/`, `src/Root.tsx`, `src/index.ts`, `remotion.config.ts`, `package.json` | `<Nome>.tsx`, `cenas/*.tsx` | `scripts/render-guard.mjs` |
| motion-revisao | `scripts/review-frames.mjs`, `scripts/qa-check.mjs` | — | `render/revisao/` |

Todos escrevem seus relatórios em `motion-studio/projetos/<slug>/NN-<agente>.md`.
Precisa mudar arquivo de outro agente? **Não edite** — registre o pedido na seção "Pedidos a outros agentes" do seu relatório.

## Ordem do pipeline

1. **VOZ** → `voz.ts` (palavras com startMs/endMs, pausas, impactos)
2. **CENAS** → `cenas.ts` (cenas, frames, transições, storyboard, responsáveis) — lê `voz.ts`
3. Em paralelo: **PERSONAGENS, TEXTO, PEÇAS, MOVIMENTO, COR, SOM** — leem `voz.ts` + `cenas.ts`
4. **CÓDIGO** integra em `<Nome>.tsx` + `cenas/*.tsx` e registra em `Root.tsx`
5. **REVISÃO** → `npm run qa` + `npm run review -- <Id>` + análise visual → `revisao-N.md`
6. Responsáveis corrigem; REVISÃO re-verifica (máx. 3 rodadas antes de escalar ao humano)
7. Coordenador apresenta ao humano. **Render final só com `aprovacoes/<Id>.aprovado` criado pelo humano.**

## Formato do relatório de entrega (obrigatório no fim de toda resposta de agente)

```
## ENTREGA — <agente> — <slug>
Status: concluído | bloqueado | parcial
Arquivos alterados: <lista>
Contrato exportado: <símbolos/tipos que outros agentes consomem>
Validação feita: <comando + resultado>
Pedidos a outros agentes: <agente: pedido> | nenhum
Riscos/pendências: <...> | nenhum
```

## Regras técnicas comuns

- Animação **somente** via `useCurrentFrame()` / `interpolate` / `spring`. Nada de CSS transition, `@keyframes`, timers.
- **Proibido `Math.random()`** e `Date.now()`. Aleatoriedade: `random('seed')` do `remotion` ou `@remotion/noise`.
- Assets via `staticFile()`; imagens com `<Img>`, áudio com `<Html5Audio>`, vídeo com `<OffthreadVideo>`.
- 60 FPS. Vertical 1080×1920, horizontal 1920×1080. Medidas responsivas via `unidade()` e `areaSegura()` (`src/config/formatos.ts`).
- Tempo: converter ms→frame com `msParaFrame()`; nunca "chutar" frames de sincronia.
- Toda mudança termina com `cd motion-studio && npx tsc --noEmit && npm run qa`.
