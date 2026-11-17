# 09 — CÓDIGO — confie-em-cristo

Composição `ConfieEmCristo-Vertical`: 1080×1920, 60 fps, `durationInFrames = duracaoTotal(planoConfie) = 2799`. Fica registrada em `<Folder name="ConfieEmCristo">` no `Root.tsx`. As composições Demo e Testes não foram tocadas.
A composição horizontal não foi registrada porque o pedido desta rodada era só a vertical. O layout já é responsivo (`unidade()`/`areaSegura()`), então registrar `-Horizontal` é só uma linha, mas os enquadramentos não foram conferidos em 16:9.

## Estrutura
- `src/projetos/confie-em-cristo/ConfieEmCristo.tsx`: fundo global (`FundoProfundo`), depois o `TransitionSeries` com as 6 cenas, depois `Grao` e `Vinheta` (interpolados por cena com `atmosferaFe`). Tudo isso fica dentro de `SaidaParaNegro` (os últimos 50 f vão para o preto). A `CamadaSomCinema` fica por último.
- `cenas/comum.tsx`: `janelaCena(id)` (início e duração vêm de `iniciosDasCenas`), `local()`, `useLayout()` (u, área segura, `maxLargura = width − 2·seg.x`), `Ancora` (centra o bloco e o limita à área segura), `Sangria` (overscan de 6% para a câmera nunca mostrar a borda) e `caminhada(frameAbs)`.
- `cenas/paisagem.tsx`: `HORIZONTE = 0.6` e `FUGA_X = 0.5`, iguais em `Horizonte` (solX) e `Estrada` (fugaX). Também tem `CaminhanteNaEstrada`, que usa `naEstrada()` com `anguloLuz 0` e `sombraInclinacao 0`.
- `cenas/Cena1Incerteza.tsx` … `Cena6Finalizacao.tsx`.

Todos os tempos saem de `gatilhosConfie`, dos blocos de `texto.ts` via `relativo(bloco, inicioCena)` e de `confieCena4`. Nenhum frame de sincronia foi digitado à mão.

### Transições (tabela do 06-movimento)
| | Efeito | Frames |
|---|---|---|
| T1 | `vazamentoDeLuz({cor:'ambar', origem: ponto de luz da cena 1 (50%, 68%)})` | 30 |
| T2 | `revelacaoDeLuz({forma:'fenda', angulo:90, cor:'dourado', brilhoBorda:0.7})` | 40 |
| T3 | `dissolveFoco({subida:40, desfoque:14})` | 30 |
| T4 | `dissolveFoco({modo:'rack', desfoque:14})` | 30 |
| T5 | `fadeNegro({respiro:0.2})` | 40 |

A duração vem do plano. Se ela divergir de `efeitosTransicaoConfie`, o código lança um erro claro. Os wrappers das cenas não têm fundo opaco: cada cena desenha o próprio cenário como camada, e o fundo global fica fora do `TransitionSeries`.

### Camadas por cena (ordem do COR)
cenário (em `PlanoDeFoco`) → `LuzVolumetrica` → `PoeiraDeLuz` → `FonteDeLuz`/`Halacao` → **`GradacaoCor`** → tipografia em `PlanoDeFoco profundidade={1} semDesfoque` → (global) `Grao` → `Vinheta`.

### Por cena
1. **Incerteza**: `CeuNoturno` + poeira + `FonteDeLuz` (já visível no f0, cresce de 0,07 a 0,42 e pulsa em "Talvez"). O `TextoImpacto` usa os blocos do TEXTO. "RESPOSTAS" aquece para dourado em "planos" por cruzamento de 24 f. Câmera: dolly 1→1,06 com deriva y.
2. **Momentos difíceis**: `Horizonte`/`Estrada` noturnos, Caminhante cansado (0,75, ciclo 72, vista 12). Rack focus de 0,3 para 1 nos primeiros 90 f e pan x de 0 a 40 com zoom de 1,02 a 1,07.
3. **Mensagem**: a estrada noturna fica por trás e a `Revelacao` usa `opacidadeEscuridao 0.72`, com o amanhecer como `children`. O progresso segue a voz: o fio cresce até "Mas", rompe de "escute" a "Deus" e chega a 1 em "Deus". Há um bloom de `Halacao` em "escute" e `LuzVolumetrica` vinda de `luzPrincipal`. O Caminhante para em "escute" e retoma em "caminhando", com o cansaço indo de 0,75 a 0,3 e a luz de 0,5 a 1,2. A névoa adensa em "enxergar". A caminhada (estrada, posição e fase do passo via `faseFrames`) é função do frame absoluto, então continua idêntica dos dois lados da T2.
4. **Confiança**: `PalavraGigante` "CONFIE." com as batidas de `confieCena4`, `escalaEntrada 1.1`, `escalasBatidas` e dourado na 2ª batida. O halo dá um flash e decai em cerca de 20 f a cada "confie". Há micro-shake de câmera (`trepidacao` com amplitude 3), fios dourados e as linhas editoriais "Quando faltar…".
5. **Cristo**: `Cruz3D` (madeira escurecida, contraluz, luz de 0 a 1 na entrada e mais forte em "Jesus", emissivo 0,06). Por trás, a `Cruz2D` em modo silhueta fornece o halo e os raios que se abrem em "Jesus", mais a `LuzVolumetrica`. Câmera: crane-down até "Jesus", dolly de 1 a 1,08 e rack focus de 2 para 1. O plano B só com a 2D é `CRUZ_3D = false` em `Cena5Cristo.tsx`.
6. **Finalização**: `TextoImpacto` "CONFIE / EM CRISTO." com `impactoEscala` discreto em "Confie" e no clímax, e o halo pulsando uma vez no clímax. Depois vêm `Divisor`, `TextoEditorial` com o versículo e `AssinaturaVersiculo` "JOÃO 14,6" (entrada em `textoCena6Referencia`). Por fim, `SaidaParaNegro`. Câmera: dolly-out de 1,04 a 1, sem câmera na mão.

### Áudio
`<CamadaSomCinema cues={cuesConfie} trilha={trilhaConfie} narracao={vozConfie.arquivo} palavras={vozConfie.palavras} />`. A trilha tem ducking pelas palavras e os cues de SFX estão integrados. A narração ainda é `null`. Ela passa a tocar sozinha quando a VOZ preencher `vozConfie.arquivo`.

### Configuração
- `remotion.config.ts`: `setChromiumOpenGlRenderer('swangle')`.
- `scripts/review-frames.mjs`: `gl: 'swangle'`. O arquivo é do REVISÃO; troquei por pedido do coordenador.
- `package.json`: scripts `trilha` e `sfx:cinema`.

## Validação
- `npx tsc --noEmit`: OK. `npm run qa`: 63 arquivos, nenhum erro. `npx remotion compositions src/index.ts`: `ConfieEmCristo-Vertical 60 1080x1920 2799`.
- `npm run review -- ConfieEmCristo-Vertical 0,60,300,449,470,560,670,900,1300,1500,1597,1768,1830,2026,2200,2295,2370,2600,2798`: 19 stills e a folha de contato, todos inspecionados. Conferi também f2740 (assinatura completa) e f2600 em escala cheia.
- Corrigido depois de olhar os stills: a cruz 3D estava chapada e alaranjada de frente. Baixei o preenchimento, o emissivo e a luz e escureci a madeira, e agora ela lê como contraluz e acende em "Jesus". A fenda da T2 estava cinza-lavada e passou para `cor: 'dourado'`. O ponto de luz do f0 estava pequeno demais (raioInicial 14→22).
- O 3D renderiza de verdade com swangle.
- Tempo: um still em escala cheia leva cerca de 9–10 s de ponta a ponta, com bundle (f900 cena 3 = 10,4 s; f2100 cena 5 3D = 9,0 s). No lote de 19 stills a 0,5×, foram cerca de 3 s por frame.
- Blur de tela cheia ≤ 14 px: `CameraCinema desfoqueMax` 14, dissolves com 14 e bloom do vazamento ≤ 7. A única exceção é o pouso do "CONFIE." (≈16 px por 16 f), que só cobre a palavra.

## Pedidos a outros agentes
- MOVIMENTO/REVISÃO: na metade da T2 (f670) as faixas do feixe ainda lavam a tela num bege acinzentado sobre o céu azul. Funciona como a luz rasgando, mas vale avaliar em movimento.
- VOZ: quando o áudio real chegar, basta preencher `vozConfie.arquivo` e regerar as palavras. O vídeo, os cues e o ducking se recalculam.
- REVISÃO: rodar a revisão em vídeo no Studio (as transições e as batidas só se julgam em movimento).

## ENTREGA — codigo — confie-em-cristo
Status: concluído
Arquivos alterados: src/projetos/confie-em-cristo/ConfieEmCristo.tsx (novo), src/projetos/confie-em-cristo/cenas/{comum.tsx, paisagem.tsx, Cena1Incerteza.tsx, Cena2MomentosDificeis.tsx, Cena3Mensagem.tsx, Cena4Confianca.tsx, Cena5Cristo.tsx, Cena6Finalizacao.tsx} (novos), src/Root.tsx, remotion.config.ts, package.json, scripts/review-frames.mjs (gl swangle, por pedido do coordenador), projetos/confie-em-cristo/09-codigo.md
Contrato exportado: composição `ConfieEmCristo-Vertical` · `ConfieEmCristo` · `CRUZ_3D` (plano B 2D) · `LUZ_CENA1` · `caminhada()`/`CAMINHADA` · `HORIZONTE`/`FUGA_X`
Validação feita: tsc OK · qa OK · compositions OK · review com 19 frames dirigidos, inspecionados visualmente · stills de 9–10 s em escala cheia
Pedidos a outros agentes: MOVIMENTO/REVISÃO (tom da T2 em f670) · VOZ (arquivo real) · REVISÃO (revisão em movimento)
Riscos/pendências: os tempos são do roteiro cronometrado (sem narração real). A Cruz3D em swangle é renderização por software e deixa o render final mais lento nos ~500 f da cena 5. Não há horizontal. O render final não foi feito (exige `aprovacoes/ConfieEmCristo-Vertical.aprovado`).
