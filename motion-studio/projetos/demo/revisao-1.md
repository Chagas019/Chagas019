# Revisão 1 — demo — 2026-11-17

Veredito: **REPROVADO** (2 BLOQUEANTES, 7 IMPORTANTES, 1 POLIMENTO)

## Verificação técnica
- `npx tsc --noEmit`: OK (0 erros)
- `npm run qa`: OK (31 arquivos, nenhum erro)
- `npx remotion compositions src/index.ts`: Demo-Vertical 1080×1920 e Demo-Horizontal 1920×1080, 60 fps, 604 frames = 200+220+220−18−18 = `duracaoTotal(plano)`. OK
- SFX existem (`click`, `impacto`, `notificacao`, `pop`, `whoosh`). Picos de -9,1 dB (whoosh) e -5,1 dB (impacto): sem clipping.
- `public/audio/narracao/` está **vazio** (`vozDemo.arquivo = null`). Ver item 9.

## Frames analisados (imagens em `render/revisao/`)
- Automáticos (12 por formato): `Demo-Vertical-auto/`, `Demo-Horizontal-auto/`
- Dirigidos (ambos formatos): 0, 18, 52, 90, 102, 182, 190, 191, 192, 199, 200, 204, 258, 309, 383, 384, 392, 393, 394, 401, 402, 408, 426, 428, 495, 509, 510, 511, 530, 603 → `Demo-Vertical/`, `Demo-Horizontal/`
- Extras do vertical: 24, 32, 40, 52, 500, 516 → `Demo-Vertical-extra/`

## Conferência voz × cenas × som (OK, a menos que esteja na tabela)
| Palavra | startMs → frame | Evento visual | Cue |
|---|---|---|---|
| Dez | 300 → 18 | título palavra 1 entra em 18 | click 18 OK |
| Um | 1500 → 90 | título palavra 3 entra em 90 | click 90 OK |
| estúdio. | 1700 → 102 | entra em 102 com gradiente | — |
| Notificações, | 3400 → 204 | notificação 1 (182+22) | notificacao 204 OK |
| interfaces | 4300 → 258 | notificação 2 (182+76) | pop 258 OK |
| personagens | 5150 → 309 | mascote rosa (182+127) | pop 309 OK |
| Tudo / sincronizado | 6800/7100 → 408/426 | título (384+24 / 384+42) | — |
| voz. (clímax) | 8500 → 510 | "Estúdio" (384+126) | impacto 510 (ver item 7) |
| whip 1 / whip 2 | 182–200 / 384–402 | meio do whip em 191 / 393 | o whoosh em 176/378 chega ao pico em +15f (0,25 s) = 191/393. OK |
| cards | — | 404/416/428 | pops 404/416/428 OK |

Destaque da legenda no `startMs` verificado em 204, 258, 309, 408, 426, 510: OK (±0 frame).

## Problemas

| # | Severidade | Composição | Frame(s) | Problema | Evidência | Agente responsável | Correção sugerida |
|---|---|---|---|---|---|---|---|
| 1 | BLOQUEANTE | Horizontal | ~309–400 (pior em 329) | O mascote rosa cobre a palavra "VIVOS." da legenda. A base do celular (altura 900 px num quadro de 1080) fica atrás da legenda, que é lida sobre a moldura. | `Demo-Horizontal-auto/frame-0329.png`: corpo do mascote sobre "VIVOS."; legenda sobre a borda inferior do celular | motion-codigo (`cenas/Cena2Pecas.tsx`) | No horizontal, `alturaCel` ≤ 760 e subir o celular (translateY ≈ −60·u), para a base ficar acima da faixa da legenda (90% − altura da legenda). Mascote em `y = alturaCel*0.05` e `x = largCel*0.75`, longe da faixa inferior. |
| 2 | BLOQUEANTE | Ambas | início de cada palavra: 258, 309, 426… | A pílula da palavra ativa invade as palavras vizinhas. Escala de até 1,16 (mola elástica + 0,04), padding horizontal de 0,2·tamanho e gap de só 0,18·tamanho. | V 309: "E" quase todo coberto ("▮PERSONAGENS") e a pílula encosta em "VIVOS". V/H 426: "TUDO" vira "TUDC" sob a pílula de "SINCRONIZADO" | motion-texto (`src/texto/LegendaSincronizada.tsx`) | Gap ≥ 0,32·tamanho, ou overshoot máximo de 1,06 com `transformOrigin: center`. Alternativa: aplicar a escala só ao fundo (pseudo-camada absoluta), sem escalar o box no fluxo. |
| 3 | IMPORTANTE | Ambas | 392–407 | O whip 2 termina numa tela vazia. A cena 3 só mostra conteúdo a partir do frame local 20 (404). Durante a transição sobra só o fundo e a legenda velha "E PERSONAGENS VIVOS." flutuando. | V/H 393, 394, 401, 402: só fundo e legenda. H 408: um card fantasma ("4"), sem título | motion-codigo (`cenas/Cena3Fechamento.tsx`) | Fazer os cards entrarem durante o whip: `entradaEm` 2/10/18 (abs 386/394/402). O título continua em 24/42 (sincronia com a voz). Avisar motion-som para mover os pops para 386/394/402. |
| 4 | IMPORTANTE | Ambas | 0–17 (miniatura) | O frame 0 tem só o fundo: a miniatura sai vazia nas redes. Nada aparece até o frame ~20. | `*/frame-0000.png` e `frame-0018.png`: fundo puro | motion-cenas (`cenas.ts`, storyboard da abertura) | Definir um estado de capa no frame 0. Por exemplo, mascote já em quadro (pousado, `entradaEm` ≤ −30) e um kicker "Estúdio Motion" pequeno que sai antes do "Dez". Ou declarar um `posterFrame` (ex.: 150) para o CÓDIGO registrar. |
| 5 | IMPORTANTE | Vertical (queda) / ambas (quique) | 20–45 | A queda do mascote azul atravessa o título no vertical: em 24 o corpo está sobre "Dez". O `quique` não quica, afunda: a mola passa de 1, então `y` fica positivo e o mascote vai ~100 px abaixo do chão/sombra (frame 40) antes de voltar. | `Demo-Vertical-extra/` 24 (sobre "Dez"), 40 (abaixo da posição de repouso, sombra fora) | motion-personagens (`src/personagens/movimentos.ts` / `Mascote.tsx`) | `quique`: refletir o overshoot (y = −|1−s|·altura, ou uma bounce de Easing) para nunca passar do chão. Expor `alturaQueda` e no vertical limitar a queda para começar abaixo do título, ou entrar por fade/escala em vez de queda vertical. |
| 6 | IMPORTANTE | Ambas | 32 vs 52 | O SFX "impacto" (52, "mascote toca o chão") toca 20 frames (333 ms) depois do primeiro contato com o chão, que é o frame 32 (spring 9/120/0,9: contato no frame local 12 + entradaEm 20). | Cálculo da `spring` + `Demo-Vertical-extra/frame-0032.png` (mascote na linha do chão) | motion-som (`som.ts`) | Mover `impacto` para o frame do contato. Hoje é 32. Se motion-personagens mudar o `quique` (item 5), recalcular a partir da nova curva. |
| 7 | IMPORTANTE | Ambas | 496–515 (clímax 510) | No clímax "voz." a área do título está vazia. "Tudo sincronizado" sai em 496–510 e "Estúdio" só começa a subir da máscara em 510, então o impacto cai num quadro sem título (509, 510 e 511 sem nenhum título). | V/H 509, 510, 511: só cards e legenda. V 516: "Estúdio" ainda pela metade | motion-codigo (`cenas/Cena3Fechamento.tsx`) | A palavra precisa estar pousada no impacto: "Estúdio Motion" com `entradas` [120,124] (mola rápida termina ≈ 510) e `saidaEm` 106 no título anterior, para um cruzamento sem vazio. |
| 8 | IMPORTANTE | Ambas | 204–400, 404–603 | Texto abaixo do mínimo legível (corpo ≥ 34 px a 1080 de largura). Rótulos dos cards com 24·u ("AGENTES", "QUADROS/S", "SINCRONIA"). Notificação com 22/26/30·u (app, mensagem, título). Data do celular com ≈ 25 px. | V 510: rótulos dos cards ilegíveis no tamanho do celular. V 309: "Cena 2 passou na revisão" mal se lê | motion-pecas (`src/pecas/CardMetrica.tsx`, `Notificacao.tsx`) | Rótulo do card ≥ 34·u. Notificação: título ≥ 36·u e mensagem ≥ 34·u, aumentando a largura/altura do card. Se for decorativo, o título da notificação ainda precisa passar de 34. |
| 9 | IMPORTANTE | Ambas | todos | Não há narração: `vozDemo.arquivo = null` e `public/audio/narracao/` vazio. As legendas correm sem voz e não dá para verificar "narração dominante", mascaramento por SFX nem o pico ≤ −1 dBTP do mix. Os timestamps são de roteiro e não de transcrição. | `voz.ts` linhas 1–3; diretório vazio | motion-voz (`voz.ts`, `public/audio/narracao/`) | Entregar a locução (ou TTS de referência), regerar `palavras` por transcrição e avisar CENAS/SOM se algum `startMs` mudar mais de 1 frame. |
| 10 | POLIMENTO | Ambas (pior no horizontal) | 408–603 | Na cena 3 há dois focos com o mesmo texto. A legenda "TUDO SINCRONIZADO COM" repete o título "Tudo sincronizado", e "A SUA VOZ." concorre com "Estúdio Motion" no clímax. A legenda no vertical também encosta no limite dos 80% (base ≈ 80,2% com a escala da mola). | V/H 426, 530 | motion-codigo (`Demo.tsx`) | Esconder a legenda enquanto houver título cinético na cena 3, ou mostrar só "A SUA VOZ." com o título menor. No vertical, somar 1–2% de folga ao `paddingBottom`. |

## Itens conferidos sem problema
- Whip 1 e 2: sem frame preto. Desfoque e stretch contínuos em 190/191/192 e 392/393/394. Os frames de entrada e saída (182/200, 384/402) estão limpos.
- Paleta consistente entre as cenas (noite), grão 0,06 (≤ 0,08), vinheta discreta.
- Área segura vertical: título da cena 1 a ~27% da altura e conteúdo da cena 2/3 entre 10% e 80%.
- Nenhum texto cortado nas bordas em nenhum frame amostrado.

## ENTREGA — motion-revisao — demo
Status: concluído
Veredito: **REPROVADO** (rodada 1 de 3)
Arquivos alterados: `motion-studio/projetos/demo/revisao-1.md`, `motion-studio/render/revisao/{Demo-Vertical,Demo-Horizontal,Demo-Vertical-auto,Demo-Horizontal-auto,Demo-Vertical-extra}/`
Contrato exportado: nenhum
Validação feita: `npx tsc --noEmit` OK · `npm run qa` OK · `npx remotion compositions` OK (604f, 60fps) · `npm run review` em 12 + 30 frames por formato + 6 extras
Pedidos a outros agentes:
- motion-codigo: #1 (Cena2 horizontal: celular e mascote fora da faixa da legenda), #3 (cards entram durante o whip 2), #7 (título do clímax pousado em 510), #10 (legenda × título na cena 3)
- motion-texto: #2 (pílula ativa não pode invadir as palavras vizinhas)
- motion-cenas: #4 (estado de capa no frame 0 / posterFrame)
- motion-personagens: #5 (quique sem atravessar o chão; queda não pode cruzar o título no vertical)
- motion-som: #6 (impacto no contato real com o chão, hoje frame 32). Depois de #3, mover os pops dos cards
- motion-pecas: #8 (rótulos dos cards e textos da notificação ≥ 34 px)
- motion-voz: #9 (arquivo de narração real e timestamps transcritos)
Riscos/pendências: sem narração não dá para aprovar o mix de áudio. A ordem recomendada é personagens (#5) antes de som (#6), e codigo (#3) antes dos pops do som.
