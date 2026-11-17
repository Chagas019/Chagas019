# 06 — MOVIMENTO — confie-em-cristo

Biblioteca nova em `motion-studio/src/movimento/cinema.tsx`. Ela importa `curvas` de `curvas.ts` e não altera `curvas.ts`, `Camera.tsx` nem `transicoes.tsx`.
Tudo é determinístico: só depende de `frame` ou do progresso da transição, e a aleatoriedade vem de `noise2D` (`@remotion/noise`) com seed.
Os tempos entram por props, então quando chegar a narração real basta recalcular os frames em `cenas.ts`/`voz.ts`.

## Contrato importante (bug encontrado e corrigido)
O `TransitionSeries` mantém o wrapper de apresentação montado durante a cena inteira, com o progresso travado: 0 antes da saída e 1 depois da entrada.
Por isso, toda apresentação precisa ser identidade em p=0 (saindo) e em p=1 (entrando).
Na primeira versão, o `fadeNegro` pintava um fundo preto opaco no wrapper de saída. Quando a cena seguinte ainda estava invisível, esse fundo cobria a cena anterior e gerava cerca de 10 frames pretos na transição de antes.
Corrigi: o escurecimento agora é uma camada por cima, com opacidade 0 em p=0. O CÓDIGO não deve criar wrappers com fundo opaco em volta de cenas do `TransitionSeries`.

## Transições (TransitionPresentation + helper de timing)
| Apresentação | Timing | O que faz | Faixa útil |
|---|---|---|---|
| `vazamentoDeLuz({cor:'ambar', intensidade:1, origem:{x:72,y:28}, pico:0.46, seed})` | `tempoVazamento(30)` (easing suave) | A cena atual estoura (brilho até +160%, bloom ≤ 7 px, dolly +2,5%). Um halo âmbar e um núcleo branco quente com faixa anamórfica em blend `screen`, com cintilação via noise, cobrem a troca. A cena nova emerge da luz (brilho 2,4→1, escala 1,03→1, ease-out expo). | 30–48 f |
| `revelacaoDeLuz({forma:'fenda'\|'radial', angulo:90, centro, suavidade:14, cor:'quente', brilhoBorda:0.85})` | `tempoRevelacao(40)` | Máscara linear (fenda que se abre a partir do eixo) ou radial suave revela a cena nova. Um feixe luminoso acompanha a borda da máscara. A cena antiga recua 3,5% e é "lavada" pela luz. A abertura usa cubic in-out: a luz começa estreita e abre. | 40–72 f |
| `dissolveFoco({desfoque:16, escala:0.04, subida:0, modo:'cruzado'\|'rack'})` | `tempoDissolveFoco(30)` | Dissolve com rack focus (blur ≤ 20 px, já ajustado pela `unidade`) e ±2% de escala. `subida` faz a nova cena vir de baixo. `modo:'rack'` é sequencial: o foco sai da cena atual e só depois "puxa" a próxima. | 30–60 f |
| `fadeNegro({respiro:0.25, cor:'#030304'})` | `tempoFadeNegro(40)` | Mergulho no preto (ease-in, afunda 1,5%), pausa no preto absoluto e emersão (ease-out). | 40–90 f |
| `SaidaParaNegro` (componente, fora do TransitionSeries) | props `inicio`, `duracao=90` | Fade final para o preto sem cena seguinte. | 60–120 f |

### Mapeamento para o plano (`efeitosTransicaoConfie`)
| # | Frames | Usar | Momentos-chave |
|---|---|---|---|
| T1 incerteza → momentos-difíceis | f435–465 (30) | `vazamentoDeLuz({cor:'ambar', origem:{x:50, y:70}})` + `tempoVazamento(30)`. A origem fica no ponto de luz âmbar do terço inferior. | pico do flash ≈ f449 |
| T2 momentos-difíceis → mensagem | f650–690 (40) | `revelacaoDeLuz({forma:'fenda', angulo:90})` + `tempoRevelacao(40)` | feixe mais forte em f655–674 |
| T3 mensagem → confiança | f1473–1503 (30) | `dissolveFoco({subida:40})` + `tempoDissolveFoco(30)` | blur máximo ≈ f1488 |
| T4 confiança → cristo | f1814–1844 (30) | `dissolveFoco({modo:'rack', desfoque:18})` + `tempoDissolveFoco(30)` | troca de foco ≈ f1827–1832 |
| T5 cristo → finalização | f2274–2314 (40) | `fadeNegro({respiro:0.2})` + `tempoFadeNegro(40)` | preto absoluto f2290–2298 |

## Câmera cinematográfica
- `<CameraCinema chaves={ChaveCinema[]} mao={Mao|false} abertura={9} desfoqueMax={14} easing={curvas.suave}>`
  - As chaves são `{frame, zoom, x, y, rot, foco}`. Os frames são relativos à Sequence; x e y estão em px na base 1080 e são escalados pela `unidade()`.
  - `mao`: câmera na mão com duas oitavas de noise. Padrão: 2,5 px, roll de 0,12° e 0,22 ciclos/s. Use `false` para desligar.
- `<PlanoDeFoco profundidade={0..2} semDesfoque? desfoqueBase?>`
  - Profundidade 0 fica parada (infinito), 1 se move com a câmera e 2 é primeiro plano, com parallax e dolly dobrados.
  - Desfoque = |profundidade − foco| × abertura, com teto em `desfoqueMax`, que nunca passa de 30.
  - `semDesfoque` serve para tipografia que precisa ficar sempre nítida.
- Helpers de chaves: `dolly(inicio, fim, zi, zf)` e `rackFocus(inicio, duracao, de, ate)`. Hook: `useCameraCinema()`.
- É independente de `Camera`/`Camada`, porque tem contexto próprio.

### Chaves de câmera recomendadas por cena (zoom total ≤ 10%)
1. Incerteza: `dolly(0, fim, 1.00, 1.06)`, deriva y 0→−20 e `mao` padrão. Planos: céu 0, poeira 0.6, ponto de luz 1, grão sem desfoque.
2. Momentos difíceis: pan lateral x 0→40 e zoom 1.02→1.07. `rackFocus` de 0.3 (estrada ao fundo) para 1 (silhueta) nos primeiros 90 f.
3. Mensagem: tilt y 30→−30 acompanhando a luz e zoom 1→1.05. Roll 0→0.4° no máximo.
4. Confiança: câmera quase parada (`mao` com amplitude 1.5), sem dolly. O impacto vem do texto.
5. Cristo: dolly-in lento 1.00→1.08 rumo à cruz e `rackFocus` de 2 (poeira em primeiro plano) para 1 (cruz).
6. Finalização: dolly-out 1.04→1.00 e `mao:false` (quietude).

## Helpers
- `respirar(frame, {amplitude:0.012, periodo:300, fase})`: escala contínua que começa exatamente em 1.
- `impactoEscala(frame, batidas, {pico:0.08, ataque:3, decaimento:24, antecipacao:0.015, framesAntecipacao:6, degrau:0})`:
  - Faz um recuo de 1,5% nos 6 f antes da batida, um estalo de +8% em 3 f (expo out) e assenta em 24 f (cubic out).
  - `degrau` acumula escala a cada batida (por exemplo 0.03 para o terceiro "CONFIE" terminar maior).
- `trepidacao(frame, batidas, {amplitude:5, rotacao:0.25, duracao:12, seed})`: tremor por noise que decai quadraticamente em 12 f. Retorna `{x, y, rot}`.
- `estiloImpacto(frame, batidas, u, opcoesImpacto, opcoesTremor)`: atalho que devolve o `transform` já pronto.
- `entradaContemplativa(frame, inicio, {duracao:54, subida:24, desfoque:8})`: entrada lenta (opacidade + subida + foco). Para elementos irmãos, use stagger de 6–8 f.

### Batidas de "CONFIE" (calcular sempre com `msParaFrame` a partir de `voz.ts`)
- "confie." em 26616 ms ≈ f1597 e "confie." em 29464 ms ≈ f1768. Usar `impactoEscala` com `{pico:0.10, degrau:0.03}` e `trepidacao` com `{amplitude:4}`.
- "Confie" em 38732 ms ≈ f2324, já na cena 6. Usar um impacto discreto: `{pico:0.05}`, sem trepidação.
- Os valores em ms são estimativas. Quando a VOZ trouxer o áudio real, os frames precisam ser recalculados via `gatilhosConfie`, nunca digitados à mão.

## Validação
- `npx tsc --noEmit`: nenhum erro em `cinema.tsx`. Existe hoje um erro em `src/personagens/Caminhante.tsx(255)`, do agente PERSONAGENS, que não é meu.
- `npm run qa`: 51 arquivos verificados, nenhum erro.
- Renderizei frames de teste numa composição temporária (já removida), com as cinco transições nas durações do projeto (30/40/30/30/40) e frames f−1, f, f+1 em cada borda.
  - Não há frame vazio nem salto nas bordas.
  - O vazamento chega a luminância média de 218 no pico e volta a 44 no fim.
  - O preto do `fadeNegro` aparece só no respiro planejado.
  - O frame preto indevido que encontrei foi corrigido e revalidado.

## ENTREGA — movimento — confie-em-cristo
Status: concluído

Arquivos alterados:
- `motion-studio/src/movimento/cinema.tsx` (novo)
- `motion-studio/projetos/confie-em-cristo/06-movimento.md`

Contrato exportado (`src/movimento/cinema.tsx`):
- Transições: `vazamentoDeLuz`, `tempoVazamento`, `revelacaoDeLuz`, `tempoRevelacao`, `dissolveFoco`, `tempoDissolveFoco`, `fadeNegro`, `tempoFadeNegro`, `SaidaParaNegro`
- Câmera: `CameraCinema`, `PlanoDeFoco`, `useCameraCinema`, `dolly`, `rackFocus`
- Helpers: `respirar`, `impactoEscala`, `trepidacao`, `estiloImpacto`, `entradaContemplativa`, `CORES_LUZ`
- Tipos: `VazamentoProps`, `RevelacaoProps`, `DissolveFocoProps`, `FadeNegroProps`, `ChaveCinema`, `Mao`, `OpcoesImpacto`

Curvas por elemento:
- Entradas usam `curvas.entrada` (expo out); saídas usam `curvas.saida` (expo in), mais curtas.
- Câmera e chaves usam `curvas.suave`.
- Revelação usa cubic in-out; impacto usa expo out (ataque) + cubic out (decaimento).
- Nada é linear para objetos; a câmera na mão usa noise.

Durações recomendadas:
| Transição | Recomendado | No projeto |
|---|---|---|
| `vazamentoDeLuz` | 30–48 f | 30 |
| `revelacaoDeLuz` | 40–72 f | 40 |
| `dissolveFoco` | 30–60 f | 30 (T3 com subida, T4 com `modo:'rack'`) |
| `fadeNegro` | 40–90 f | 40 com `respiro:0.2` |
| `SaidaParaNegro` | 60–120 f | — |

Validação feita:
- `npx tsc --noEmit`: OK para os meus arquivos; o único erro está em `personagens/Caminhante.tsx`, de outro agente.
- `npm run qa`: ✓ nenhum erro.
- Frames consecutivos renderizados nas bordas de todas as transições: sem frame preto ou vazio indevido.

Pedidos a outros agentes:
- CÓDIGO:
  - Em `ConfieEmCristo.tsx`, usar no `TransitionSeries` as apresentações e timings da tabela "Mapeamento para o plano". Os `tipo` em `cenas.ts` ('fade'/'slide') não descrevem o efeito; a fonte é `efeitosTransicaoConfie`.
  - Não colocar fundo opaco em wrappers das cenas.
  - Calcular as batidas de "CONFIE" com `msParaFrame(...) - inicioDaCena`.
  - Envolver cada cena em `CameraCinema` com as chaves sugeridas acima.
- SOM:
  - Whoosh/swell de luz 6 f antes de cada transição: f429 (vazamento, swell brilhante com pico em f449), f644 (revelação: swell suave, sem whoosh agressivo), f1467 (dissolve: textura de ar muito discreta), f1808 (rack: idem).
  - T5, fade para preto em f2274: sem whoosh, apenas uma cauda que respira até f2298.
  - Impactos graves curtos em f1597 e f1768 (CONFIE), e um impacto discreto em f2324.
  - Todos esses frames devem ser recalculados quando chegar o áudio real.
- TEXTO: colocar a tipografia em `<PlanoDeFoco profundidade={1} semDesfoque>` para acompanhar a câmera sem perder nitidez.
- PERSONAGENS: corrigir o erro de tipo em `src/personagens/Caminhante.tsx:255` (parâmetro `cor` implícito `any`), que faz o `tsc` falhar.

Riscos/pendências:
- Os frames de batida e de transição dependem da narração estimada e precisam ser recalculados com o áudio real.
- `filter: blur` + `brightness` no vazamento custa caro em render, mas o bloom fica ≤ 7 px e dura apenas cerca de 15 f.
- O `PlanoDeFoco` com desfoque em tela cheia deve ficar ≤ 14 px para manter o render rápido.

---
# Rodada 2 — correções da revisão 1 (itens 2 e 4)

## Item 2: T1 `vazamentoDeLuz` sem "bege chapado"
- Removi a lavagem com `backgroundColor` (que chegava a ~72%).
- O brilho da cena que sai caiu de +1,6 para **+0,8** (curva suave) e o bloom de 7 para 5 px.
- A luz agora tem textura:
  - núcleo quente pequeno na origem;
  - streak anamórfico horizontal;
  - 4 manchas de película (radiais âmbar/dourado/quente) com posição e raio guiados por `noise2D` (seed);
  - um véu diagonal fraco que varre lateralmente (−35% → 0 no pico → +35%).
- A camada de luz recebe uma máscara radial com queda, então as bordas da tela nunca estouram.
- O cross-fade ficou mais largo (p 0,24–0,70): no pico as duas cenas aparecem sob a luz.
- Medição em f430–470: a luminância média vai de 18 até 56 no pico (f449) e volta a 27. O desvio-padrão da luminância (contraste) **sobe** de 6 para 39 no pico, e a estrada e o horizonte continuam legíveis atrás da luz. Antes ele colapsava.
- O pico continua em f449 (`pico` 0.46), sem impacto no cue do SOM.

## Item 4: T5 `fadeNegro` com descida gradual
- Saída:
  - a vinheta fecha para o centro com `curvas.suave` ("a luz se recolhe");
  - um véu uniforme **linear** acompanha a vinheta;
  - o preto absoluto só chega em p = meio.
- Medição em f2274–2290: luminância 57 → 54 → 50 → 47 → 43 → 39 → 34 → 28 → 20 → 14 → 10 → 6 → 5 → 4 → 3. A queda fica distribuída pelos 16 f, sem o corte de 4 f.
- Corrigi um segundo bug na entrada: a cena que entra fica por cima, e as camadas pretas que eu tinha posto nela cobriam a descida (preto instantâneo em f2274). Agora a entrada usa só opacidade e máscara radial que abre do centro. O preto da pausa vai de f2290 a f2298 e a cena 6 emerge de f2299 a f2314.

Validação: `npx tsc --noEmit` OK · `npm run qa` ✓ · `REVIEW_SUB=r2-mov npm run review -- ConfieEmCristo-Vertical 430-470,2270-2320` (92 frames consecutivos, sem salto nem frame vazio indevido).
