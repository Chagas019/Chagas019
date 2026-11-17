# 02 — CENAS — confie-em-cristo

Plano: `planoConfie` em `motion-studio/src/projetos/confie-em-cristo/cenas.ts` · 60 FPS · vertical 1080×1920.
**Duração total: 2799 frames (46,65 s)**, igual a `msParaFrame(vozConfie.duracaoMs)`. Confirmado com tsx.

## Método
- Nenhum frame foi copiado à mão. O `cenas.ts` calcula tudo a partir de `vozConfie.palavras` com `msParaFrame`. Quando chegar o áudio real, basta a VOZ regerar `voz.ts` e o plano se recalcula sozinho.
- Cada transição fica **centrada no silêncio** entre a última palavra de uma cena e a primeira da seguinte. O script de verificação confirmou que **nenhuma palavra cai em sobreposição de transição**: toda frase fica inteira dentro da sua cena.
- As transições duram de 30 a 40 frames (ritmo contemplativo). Uso só os tipos existentes de `Transicao`. O efeito cinematográfico está em `efeitosTransicaoConfie`, com frames absolutos e janela de silêncio, para o MOVIMENTO implementar.
- Os frames absolutos de todos os gatilhos estão exportados em `gatilhosConfie`, para TEXTO, MOVIMENTO, SOM e COR.
- O primeiro elemento visível é o ponto de luz no f0 (opacidade ≥ 0,3 até o f12).

## Tabela
| # | Cena | Frame inicial abs. | Frames | Palavras cobertas | Texto de tela | Transição de saída (tipo · frames · efeito) |
|---|---|---|---|---|---|---|
| 1 | incerteza | 0 | 465 (7,75 s) | frases 1–2: "Talvez você não entenda…" → "…como você imaginou." (f54–427) | VOCÊ NÃO PRECISA TER TODAS AS RESPOSTAS. | fade · 30 · vazamento de luz (f435–465, silêncio f427–472) |
| 2 | momentos-dificeis | 435 | 255 (4,25 s) | frase 3: "Talvez você esteja cansado de esperar por uma resposta." (f472–634) | TALVEZ VOCÊ ESTEJA CANSADO DE ESPERAR. | fade · 40 · revelação de luz (f650–690, silêncio de 1200 ms f634–706) |
| 3 | mensagem | 650 | 853 (14,22 s) | frases 4–7: "Mas escute:" → "…enxergar o destino." (f706–1461) | DEUS NÃO PERDEU O CONTROLE DA SUA HISTÓRIA. | slide (cima) · 30 · dissolve com foco subindo (f1473–1503, silêncio f1461–1515) |
| 4 | confianca | 1473 | 371 (6,18 s) | frases 8–9: "Quando faltar força, confie." / "Quando faltar direção, confie." (f1515–1803) | QUANDO FALTAR FORÇA, CONFIE. · QUANDO FALTAR DIREÇÃO, CONFIE. | fade · 30 · dissolve com foco / rack focus (f1814–1844, silêncio f1803–1854) |
| 5 | cristo | 1814 | 500 (8,33 s) | frases 10–11: "Quando tudo parecer impossível…" → "…medo do amanhã." (f1854–2264) | QUANDO TUDO PARECER IMPOSSÍVEL, · JESUS continua ao seu lado. · NÃO TENHA MEDO DO AMANHÃ. | fade · 40 · fade para preto (f2274–2314, silêncio de 1000 ms f2264–2324) |
| 6 | finalizacao | 2274 | 525 (8,75 s) | frases 12–13 + respiro: "Confie em Cristo." / "Ele é o caminho, a verdade e a vida." (f2324–2649) + respiro f2649–2799 | CONFIE EM CRISTO. · Ele é o caminho, a verdade e a vida. · João 14,6 | — (fim) |

Arco de luz e cor, com a `mistura` do COR: 0 → 0,1 → 0,15–0,6 → 0,8 → 0,95 → 0,9 (escuridão → luz atravessa → luminoso → cruz → assinatura).

## Storyboard

### 1 · incerteza (f0–465)
- **Enquadramento:** plano geral vazio, quase preto. Um ponto de luz âmbar no terço inferior central.
- **Camadas:** céu noturno desfocado · poeira de luz (bokeh) · grão 0,07 e vinheta 0,6.
- **Ação:** a luz já aparece no f0 e cresce devagar. "VOCÊ NÃO PRECISA" sobe por máscara a partir de "entenda" (f96). "TER TODAS AS RESPOSTAS." completa no silêncio depois de "agora" (f214). "RESPOSTAS" aquece para dourado em "planos" (f297).
- **Gatilhos:** Talvez f54 (pulso da luz) · entenda f96 · agora (fim) f214 · Talvez f259 · planos f297 · imaginou (fim) f427.
- **Câmera:** push-in lento de 1,00 para 1,06, com deriva vertical por noise.
- **Luz e cor:** escuridão total; o âmbar é a única fonte.
- **Áudio:** pad grave e piano esparso desde o f0, com ducking sob a voz.
- **Saída:** vazamento de luz. O ponto âmbar estoura num flare lateral que revela a estrada.

### 2 · momentos-dificeis (f435–690)
- **Enquadramento:** plano baixo da estrada em perspectiva. Silhueta pequena, de costas, no terço inferior, sem rosto.
- **Camadas:** céu azul-escuro com neblina · estrada e silhueta · postes e vegetação desfocados em parallax, mais poeira.
- **Ação:** a silhueta caminha sozinha. "TALVEZ VOCÊ ESTEJA" entra em f472, "CANSADO" com mais peso em f526, "DE ESPERAR." em f560. O texto fica ancorado no espaço.
- **Câmera:** travelling e dolly-in de 1,00 para 1,05, com profundidade de campo rasa.
- **Luz e cor:** sombras longas e contraluz azul fraco; `mistura` 0,1.
- **Áudio:** piano e vento, sem impactos.
- **Saída:** revelação de luz no silêncio de 1200 ms. Um feixe volumétrico rasga o céu. É a virada.

### 3 · mensagem (f650–1503)
- **Enquadramento:** novo cenário revelado pela luz, com raios atravessando as nuvens e o horizonte clareando.
- **Camadas:** céu com god rays · horizonte e estrada · poeira dourada iluminada pelo feixe, grão 0,06.
- **Ação em três batidas:**
  - (a) "Mas escute:" (f706–751): só a luz respira, com bloom em "escute" (f716).
  - (b) "DEUS NÃO PERDEU O CONTROLE" entra palavra a palavra desde "Deus" (f784). "CONTROLE" é a maior palavra e trava em f836. "DA SUA HISTÓRIA." em serifada itálica (f891). Dissolve depois de f932.
  - (c) Frases 6–7 (f986–1461) só com legenda serifada discreta. Em "caminhando" (f1253) a silhueta volta a andar em direção à luz. Em "enxergar" (f1397) a névoa fica mais densa e a luz segue visível.
- **Câmera:** crane-up na revelação, plano estático em (b) e dolly-in em (c).
- **Luz e cor:** `mistura` de 0,15 a 0,6 e luz do fundo de 0,1 a 0,5; o frio vira âmbar.
- **Áudio:** riser de ar na revelação, impacto grave discreto em "controle" (f836) e uma segunda voz de piano em "caminhando".
- **Saída:** dissolve com foco. A cena desfoca subindo enquanto a cena 4 entra nítida.
- **Duração:** 14,2 s é longo, mas a cena tem três batidas internas, cada uma com um único foco visual.

### 4 · confianca (f1473–1844)
- **Enquadramento:** composição luminosa abstrata e centrada, com um halo atrás do texto.
- **Camadas:** gradiente de amanhecer · halo e linhas gráficas finas · "CONFIE." enorme em bold condensada, com extrusão sutil.
- **Ação:** "QUANDO FALTAR FORÇA," em serifada (f1553). "CONFIE." bate com spring de 1,25 para 1,0 em **f1597**. "QUANDO FALTAR DIREÇÃO," (f1715). "CONFIE." bate de novo, maior e mais dourado, em **f1768**.
- **Câmera:** micro-shake de 2 a 3 px por 6 frames em cada "confie", com push-in de 1,00 para 1,04 entre as batidas.
- **Luz e cor:** `mistura` 0,8. Cada "confie" dá um flash de +15% de exposição no halo, que decai em 20 frames.
- **Áudio:** impacto suave com sub em cada "confie".
- **Saída:** rack focus. "CONFIE." desfoca na frente e a cruz aparece nítida ao fundo.

### 5 · cristo (f1814–2314)
- **Enquadramento:** cruz simples, de madeira ou linha gráfica, em contraluz. Sem figura humana e sem imagem religiosa artificial.
- **Camadas:** céu âmbar com raios por trás · cruz em 2D com volume sutil · poeira e flare.
- **Ação:** "QUANDO TUDO PARECER IMPOSSÍVEL," (f1914), depois "lembre-se:" (f1973) e uma pausa. Em **"Jesus" (f2026)** os raios se abrem por trás da cruz e "JESUS" aparece em dourado. "continua ao seu lado." vai até f2098. "NÃO TENHA MEDO DO AMANHÃ." entra em f2178, com "AMANHÃ" dourado em f2232.
- **Câmera:** crane-down lento em contra-plongée, estática depois de "Jesus".
- **Luz e cor:** o ponto mais quente do arco; `mistura` 0,95.
- **Áudio:** swell da trilha em "Jesus", que recua em "Não tenha medo".
- **Saída:** fade para preto no silêncio de 1000 ms. A luz se recolhe para o centro.

### 6 · finalizacao (f2274–2799)
- **Enquadramento:** tela escura com halo âmbar central e tipografia centrada na área segura.
- **Camadas:** preto profundo com halo · linha fina dourada · tipografia, grão 0,05.
- **Ação:** "CONFIE" entra em f2324 e "EM CRISTO." completa em **f2370 (clímax)**, com brilho dourado. A frase "Ele é o caminho, a verdade e a vida." entra em serifada itálica em f2446, com ênfase em caminho f2486, verdade f2548 e vida f2614. "João 14,6" aparece depois de f2649. Tudo segura até f2799.
- **Câmera:** push-in de 1,00 para 1,03.
- **Luz e cor:** `mistura` 0,9; o halo pulsa uma vez no clímax.
- **Áudio:** impacto discreto em "Cristo", acorde de piano sustentado no respiro e fade nos últimos 30 frames.

## Cobertura dos impactos da VOZ
| Impacto | Frame | Evento visual |
|---|---|---|
| silêncio antes de "Mas escute" | 634 | revelação de luz (transição 2→3, f650–690) |
| escute | 716 | bloom da luz |
| controle | 836 | "CONTROLE" trava em escala máxima + impacto grave |
| caminhando | 1253 | silhueta volta a caminhar rumo à luz |
| confie (1º) | 1597 | "CONFIE." bate em escala + flash do halo |
| confie (2º) | 1768 | "CONFIE." bate maior e dourado |
| Jesus | 2026 | os raios se abrem por trás da cruz + "JESUS" dourado |
| silêncio antes de "Confie em Cristo" | 2264 | fade para preto (f2274–2314) |
| Confie (final) | 2324 | "CONFIE" entra |
| Cristo (clímax) | 2370 | "EM CRISTO." com brilho + pulso do halo + impacto |

## Pedidos a outros agentes
- MOVIMENTO: implementar os 5 efeitos de `efeitosTransicaoConfie` sobre os tipos-base `fade`/`slide`, respeitando as janelas `inicio`/`fim`.
- TEXTO, SOM e COR: ler os frames de `gatilhosConfie` (importados de `cenas.ts`) em vez de copiar números.
- CÓDIGO: montar com `iniciosDasCenas(planoConfie)` e `durationInFrames = duracaoTotal(planoConfie)`.

## ENTREGA — motion-cenas — confie-em-cristo
Status: concluído
Arquivos alterados: motion-studio/src/projetos/confie-em-cristo/cenas.ts, motion-studio/projetos/confie-em-cristo/02-cenas.md
Contrato exportado: `planoConfie: PlanoCenas` (6 cenas, fps 60) · `gatilhosConfie` (frames absolutos da voz) · `efeitosTransicaoConfie` (efeito, início/fim e silêncio de cada transição)
Validação feita: `npx tsc --noEmit` passou · `npm run qa` sem erros · script tsx: `duracaoTotal` = 2799 = `msParaFrame(46648)`, nenhuma palavra em sobreposição de transição
Pedidos a outros agentes: MOVIMENTO: efeitos de transição · TEXTO/SOM/COR: usar `gatilhosConfie` · CÓDIGO: `iniciosDasCenas`/`duracaoTotal`
Riscos/pendências: os tempos vêm do roteiro cronometrado da VOZ (sem áudio real ainda). Com o áudio real o plano se recalcula, mas os frames citados neste relatório mudam. As cenas 3 (14,2 s) e 1 (7,75 s) passam do ritmo de 1,5–4 s, por decisão do briefing (6 cenas contemplativas), e têm batidas internas.
