# 08 — SOM — confie-em-cristo

## Resumo
Trilha instrumental **original** composta e sintetizada pelo estúdio (sem samples, sem material de terceiros → licença própria),
5 SFX cinematográficos novos, catálogo `sfxCinema.ts`, camada `CamadaSomCinema.tsx` (ducking suave por palavras) e
`som.ts` com 14 cues em frames absolutos **derivados** de `gatilhosConfie` / `efeitosTransicaoConfie` (nenhum número copiado).
`biblioteca.ts` e `CamadaSom.tsx` **não** foram alterados.

## Trilha — `public/audio/trilha/confie-em-cristo.wav`
- Gerador: `node scripts/compor-trilha.mjs` (Node puro escreve as stems em PCM float; ffmpeg faz convolução/EQ/master). ~17 s.
- Determinística: PRNG mulberry32 com seeds fixas, sem `Math.random()`. Duas execuções seguidas → MD5 idêntico (trilha `f1bb3a86…`; idem para os 5 SFX).
- 52,5 s, 48 kHz, estéreo, PCM 16-bit com dither triangular. A narração termina em 46,6 s; o resto é cauda (a camada faz o fade nos 45 f finais da composição).
- **Piano ambiente** (157 notas): síntese aditiva, até 16 parciais com inarmonicidade `f·n·√(1+B·n²)` (B cresce com a altura),
  comb do ponto de martelo (~1/7), brilho dependente da velocidade, decaimento em 2 estágios por parcial (agudos morrem antes),
  2 cordas desafinadas ±0,7 cent nos 6 primeiros parciais (batimento), ruído de martelo filtrado, ataque de 1,1 ms, pedal por acorde
  (o abafador desce logo depois do acorde seguinte; legato mais longo no trecho escuro).
- **Pads/cordas**: dente-de-serra com banda limitada por tabela, 3 vozes com detune ±8 cents abertas no estéreo, filtro SVF passa-baixa
  que acompanha o arco de luz (380 Hz no escuro → 3,4 kHz no clímax → 900 Hz na cauda). As cordas (2 vozes ±5–6 cents, vibrato com
  entrada atrasada) só entram depois da virada.
- **Drone** Si1 → Ré2 (crossfade em 11–13 s) com batimento lento. **Textura**: ruído rosa em passa-banda errante (vento escuro) + "ar" em 7,5 kHz que só aparece depois da luz.
- **Reverb**: convolução (`afir`) com IR estéreo sintética de hall (RT60 3,8 s, pré-delay 22 ms, 9 reflexões iniciais, cauda que escurece de 8 kHz para 1,3 kHz, corte de graves em 140 Hz). Piano: dry 0,8 / wet 0,6. Pads: 0,85 / 0,45.
- **EQ**: HPF 30 Hz, −1,5 dB em 280 Hz (embolamento), **−3 dB em 2,9 kHz** (abre espaço para a presença da voz), LPF 15 kHz.
- **Master**: medição → ganho linear para −20 LUFS → limitador de segurança a 192 kHz (não chegou a agir) → 48 kHz.

### Harmonia e arco (alinhados a `voz.ts`)
Si menor → Ré maior relativo. Bm–G–D–A(sus) no escuro; depois G–D–A–Bm; resolução em Ré.

| Tempo | Frames | Seção | Harmonia | O que acontece |
|---|---|---|---|---|
| 0–10,6 s | 0–636 | A — escuro/esparso | Bm · G · D · Asus4 | piano rarefeito (notas a cada ~1,15 s, com silêncios), pad fechado a 380–560 Hz, drone Si1, vento |
| 10,6–11,8 s | 636–708 | respiro | Asus4 suspenso | pedal solto, pad/drone caem, uma única nota Lá5 *pp* (silêncio antes de "Mas escute") |
| 11,8–26,6 s | 708–1597 | B — a luz abre | G (sino Si5) · D · A · Bm · G · D · Asus4 | arpejos em ~0,55 s, entram as cordas e o "ar"; filtro abre 760→1500 Hz |
| 26,6–38,7 s | 1597–2324 | C — crescendo de esperança | D ("confie") · A · G ("confie") · Bm · Asus4 · **D ("Jesus", topo Ré6)** · G · Bm · Asus4 · A | arpejos em ~0,37 s, baixo em oitavas; respiração em Lá antes de "Confie em Cristo" |
| 38,7–43,2 s | 2324–2591 | D — resolução luminosa | D · **acorde cheio de Ré no clímax 39,5 s** · G · A | o ponto mais aberto (filtro 3,4 kHz, cordas no máximo) |
| 43,2–46,6 s | 2591–2799 | final | D (tônica) | arpejo se rarefaz (~0,8 s) até 46,1 s |
| 46,6–52,5 s | 2799–3150 | cauda | D | sino Ré5/Lá5/Ré6/Fá#6 no fim da voz, reverb e fade de 4 s |

### Medições (ffmpeg loudnorm + `scripts/analisar-audio.mjs`)
| Arquivo | Dur. | LUFS int. | True peak | LRA | DC (L/R) | Clip | Cliques |
|---|---|---|---|---|---|---|---|
| trilha/confie-em-cristo.wav | 52,5 s | **−20,0** | **−4,3 dBTP** | 9,6 LU | 1e-7 / 1e-7 | 0 | 0 |
| sfx/whoosh_suave.wav | 1,7 s | −20,0 | −9,2 | — | <2e-6 | 0 | 0 |
| sfx/impacto_suave.wav | 3,2 s | −20,0 | −4,3 | — | <4e-6 | 0 | 0 |
| sfx/riser_luz.wav | 4,0 s | −20,0 | −9,1 | — | <1e-6 | 0 | 0 |
| sfx/brilho.wav | 4,0 s | −20,0 | −8,4 | — | <1e-6 | 0 | 0 |
| sfx/respiro.wav | 2,1 s | −20,0 | −9,0 | — | <2e-6 | 0 | 0 |
| pré-mix trilha×0,6 + 14 cues (sem voz) | 47,5 s | −23,6 | −7,0 | 8,4 | ~0 | 0 | 0 |

Loudness momentânea da trilha (400 ms): ≈ −26 LUFS no escuro, queda para −29 no respiro (11,5 s), −20…−19 de 14 a 32 s,
−16 em "Jesus" (33 s), pico −14,6 logo após o clímax (40,5–41,5 s), descendo na cauda. O arco aparece no waveform.

Detector de cliques: 2ª diferença da amostra > 6× a energia local de 10 ms (e > 0,02). Validado com um sinal de teste com degrau (pegou o degrau em t=1,000 s). Começo e fim dos arquivos ficam em 0 (fades de 3 ms / 80 ms nos SFX, 0,35 s / 4 s na trilha).

Faixas da trilha (volumedetect): <60 Hz −52,6 dB · 120 Hz −31 · 330 Hz −28 · 600 Hz −27,6 · 1,5 kHz −31,6 · 4 kHz −39,6 → corpo nos médios-graves e espaço livre na região da voz.

### Revisão visual — `render/revisao/som/`
- `trilha-espectrograma.png`: o escuro (0–11 s) concentrado abaixo de ~1 kHz; na virada (11,8 s) aparecem os harmônicos de 1–4 kHz; brilho máximo em 39–46 s; fade final limpo. Sem riscos verticais de banda larga (sem cliques).
- `trilha-waveform.png`: envelope crescente com picos em 14, 26,6, 33,8 e 39,5–41 s; respiro visível em ~11 s.
- `sfx-cinema-espectrograma.png` (whoosh · impacto · riser · brilho · respiro em sequência): varredura do whoosh, riser em rampa até 6,5 kHz, parciais estáveis do brilho.
- `premix-trilha-sfx-waveform.png`: impactos de "confie"/clímax aparecem como acentos discretos sobre a trilha, sem estourar.
- Observação: o `showspectrumpic` do ffmpeg 6.1 desenha uma faixa horizontal escura/clara fixa (~480 Hz na trilha, ~1,3 kHz nos SFX) que **não existe no sinal**: a medição por banda contradiz a imagem (ex.: impacto_suave tem −30 dB em 1,3 kHz contra −7 dB em 50 Hz). É um artefato de desenho, não do áudio.

## SFX novos — `public/audio/sfx/` (gerados por `scripts/gerar-sfx-cinema.mjs`, atalho `scripts/gerar-sfx-cinema.sh`)
| Arquivo | Síntese | Pico | Volume padrão |
|---|---|---|---|
| whoosh_suave.wav | ruído rosa, dois passa-banda varrendo 280→2400→700 Hz, panorâmica E→D, reverb curto | 0,62 s | 0,35 |
| impacto_suave.wav | sub 58→40 Hz (decai em 0,55 s) + corpo de ruído < 380 Hz, ataque de 4 ms, reverb 2,2 s | 0 s | 0,5 |
| riser_luz.wav | ruído com passa-banda subindo 400→6500 Hz + Ré maior agudo com trêmolo acelerando; termina no pico (2,6 s) + cauda | 2,6 s | 0,38 |
| brilho.wav | 6 parciais de Ré maior (1,2–5,9 kHz), fases/trêmolos de seed fixa, ar em 9 kHz, reverb 2,8 s | 0,18 s | 0,28 |
| respiro.wav | ruído rosa em passa-banda 500→1400 Hz, envelope de inspiração | 0,8 s | 0,25 |

Origem/licença: todos gerados pelo estúdio por síntese (sem samples). Determinísticos (MD5 iguais em duas execuções).

## Código
- `src/som/sfxCinema.ts` — `SFX_CINEMA` (arquivo, volume, duracaoS, picoS), `NomeSfxCinema`, `CueCinema` (aceita também os nomes da `SFX` base; campos opcionais `trimInicio`, `duracao`, `fadeOut`, `evento`) e `MIX_CINEMA`.
- `src/som/CamadaSomCinema.tsx` — `<CamadaSomCinema cues narracao trilha palavras mix? />`.
  Ducking: palavras com gap < 450 ms viram um bloco de fala; a trilha já está baixa 80 ms antes da 1ª sílaba, segura 180 ms depois
  da última e desce/sobe com **rampa em curva S de 250 ms**. Níveis calibrados para a trilha a −20 LUFS: **0,6 livre → 0,19 sob a voz**
  (≈ −24 LUFS nos respiros, ≈ −34 LUFS sob a voz, ~18 dB abaixo da narração a −16; ducking de 10 dB, mais fundo que o da camada base, com 8,8 dB).
  Fade de entrada de 30 f e de saída de 45 f. SFX com `trimBefore` e fade-out opcional por volume de frame (sem cliques no corte).
  Exporta também `blocosDeFala` e `profundidadeDucking`, funções puras e testáveis.
- `src/projetos/confie-em-cristo/som.ts` — `cuesConfie: CueCinema[]` e `trilhaConfie`.

## Decisões de sincronia
- Os whooshes de transição (T3, T4) começam 6 f antes da transição. O pico do whoosh (37 f) cai perto do fim do dissolve, ainda no silêncio da voz.
- T1: o MOVIMENTO pediu um swell em f429 com pico em f449. Alinhei o **pico** do whoosh ao flash: o arquivo começa em f412, mas a subida (t^2,2) só fica audível por volta de f425. Por baixo, um brilho a 0,16.
- T2: o riser **termina** em f660 (feixe mais forte em f655–674). Os 70 f iniciais são pulados (`trimInicio`), então ele surge 1 s antes do fim de "resposta" (f634) e cresce no silêncio de 1200 ms.
- T5: sem whoosh, como pedido. Só uma cauda de ar (`respiro` sem os primeiros 0,5 s) de f2274 a f2298 (preto absoluto), com fade de 12 f.
- Os impactos caem no frame exato do "bate" visual (f1597, f1768, f2324 discreto, f2370 clímax). São quase só sub/grave e não mascaram a inteligibilidade.
- Os brilhos começam `picoS` (11 f) antes do alvo. O de "Jesus" chega no gap entre "lembre-se" (fim f2000) e "Jesus" (f2026).
- Não pus impacto em "controle" (sugerido no storyboard da cena 3): cairia sobre sílaba tônica no meio da frase, e a virada já tem riser + brilho.

## Pedidos a outros agentes
- **CÓDIGO**: usar `<CamadaSomCinema cues={cuesConfie} trilha={trilhaConfie} narracao={vozConfie.arquivo} palavras={vozConfie.palavras} />` em `ConfieEmCristo.tsx` (não a `CamadaSom` base). Opcional: scripts `"trilha": "node scripts/compor-trilha.mjs"` e `"sfx:cinema": "bash scripts/gerar-sfx-cinema.sh"` no `package.json`.
- **VOZ**: quando houver o áudio real, regerar `palavras`. Cues e ducking se recalculam sozinhos. A trilha tem os tempos de acorde fixos no script (`ACORDES` em `compor-trilha.mjs`): se a voz real desviar mais de ~300 ms em 11,8 / 26,6 / 29,5 / 33,8 / 39,5 s, o SOM reajusta e roda o script de novo (~17 s).
- **REVISÃO**: ouvir a mistura com a voz real e conferir se o nível 0,6 nos respiros não fica alto demais no trecho escuro (dá para ajustar com `mix={{trilha: 0.5}}`).

## ENTREGA — som — confie-em-cristo
Status: concluído
Arquivos alterados (todos novos):
- scripts/compor-trilha.mjs, scripts/gerar-sfx-cinema.mjs, scripts/gerar-sfx-cinema.sh, scripts/analisar-audio.mjs, scripts/lib/audio-dsp.mjs
- public/audio/trilha/confie-em-cristo.wav
- public/audio/sfx/{whoosh_suave,impacto_suave,riser_luz,brilho,respiro}.wav
- src/som/sfxCinema.ts, src/som/CamadaSomCinema.tsx, src/projetos/confie-em-cristo/som.ts
- render/revisao/som/*.png, projetos/confie-em-cristo/08-som.md

Contrato exportado: `SFX_CINEMA`, `NomeSfxCinema`, `CueCinema`, `MIX_CINEMA` (sfxCinema.ts) · `CamadaSomCinema`, `blocosDeFala`, `profundidadeDucking` · `cuesConfie`, `trilhaConfie` (som.ts)
Validação feita: `npx tsc --noEmit` ok · `npm run qa` ✓ nenhum erro (54 arquivos) · `analisar-audio.mjs` OK em 6 arquivos + pré-mix (0 clip, 0 cliques, DC < 4e-6) · loudnorm trilha −20,0 LUFS / −4,3 dBTP · determinismo por MD5 ok
Pedidos a outros agentes: CÓDIGO (integrar a CamadaSomCinema) · VOZ (regerar palavras com o áudio real) · REVISÃO (nível da trilha no escuro)
Riscos/pendências: a voz ainda é roteiro cronometrado, então os acordes da trilha estão presos aos tempos estimados · a mistura com a voz real ainda não foi ouvida

### Seções da trilha
| Seção | Tempo | Frames (60 fps) | Caráter |
|---|---|---|---|
| A — escuro | 0,0–10,6 s | 0–636 | Bm–G–D–Asus4, piano esparso, pad fechado, drone Si |
| Respiro | 10,6–11,8 s | 636–708 | quase silêncio, nota única Lá5 |
| B — a luz abre | 11,8–26,6 s | 708–1597 | G (sino) → D–A–Bm–G–D–Asus4, entram cordas e ar |
| C — crescendo | 26,6–38,7 s | 1597–2324 | D/G nos "confie", Ré luminoso em "Jesus" (33,8 s) |
| D — resolução | 38,7–43,2 s | 2324–2591 | Ré maior cheio, clímax 39,5 s (f2370) |
| Final | 43,2–46,6 s | 2591–2799 | tônica Ré, arpejo rarefeito |
| Cauda | 46,6–52,5 s | 2799–3150 | sino agudo + reverb, fade 4 s |

### Cues (`cuesConfie`)
| Frame | Som | Volume | Evento visual |
|---|---|---|---|
| 412 | whoosh_suave | 0,30 | T1 vazamento de luz, pico no flash f449 |
| 438 | brilho | 0,16 | T1 flash âmbar (pico f449) |
| 574 (trim 70 f) | riser_luz | 0,38 | T2 riser, termina em f660 no feixe |
| 649 | brilho | 0,18 | T2 feixe volumétrico (f660) |
| 1467 | whoosh_suave | 0,20 | T3 dissolve com foco |
| 1597 | impacto_suave | 0,42 | CONFIE #1 |
| 1768 | impacto_suave | 0,42 | CONFIE #2 |
| 1808 | whoosh_suave | 0,20 | T4 rack focus |
| 1833 | brilho | 0,18 | cruz nítida (f1844) |
| 2015 | brilho | 0,20 | raios atrás da cruz, "Jesus" f2026 |
| 2274–2298 | respiro (trim 30 f, fade 12 f) | 0,20 | T5 cauda até o preto absoluto |
| 2324 | impacto_suave | 0,28 | "CONFIE" final (discreto) |
| 2359 | brilho | 0,20 | brilho dourado / halo do clímax |
| 2370 | impacto_suave | 0,55 | CLÍMAX "EM CRISTO." |

---

# Rodada 2 — item 11 da revisão 1 (POLIMENTO, áudio)

## Problema confirmado
Medi a trilha com o ganho exato da camada (mesma função, aplicada frame a frame) e a loudness momentânea (ebur128 M) dentro dos blocos de fala:
com ganho único 0,6 → 0,19, a trilha ficava a **−40,5 LUFS sob a fala no trecho escuro** (24,5 dB abaixo da voz a −16), −35,6 em B, −33,2 em C e −32,2 em D.
O motivo é que a própria trilha tem ~10 LU de dinâmica (escuro ≈ −26 LUFS, clímax ≈ −15), e um ganho único não compensa isso.
Sem narração, a trilha ainda caía 10 dB em 14 blocos "fantasmas" (bombeamento no preview).

## Correção
1. **Níveis por seção** (`NivelSecao`). `trilhaConfie` agora é um descritor `{arquivo, niveis}` (`TrilhaComNiveis`). A `CamadaSomCinema` aceita string ou descritor, então a chamada atual em `ConfieEmCristo.tsx` (`trilha={trilhaConfie}`) continua igual e o CÓDIGO não precisa editar nada.
   As fronteiras são derivadas de `efeitosTransicaoConfie` (início de T2, T3 e T5, todas em silêncio da voz), com crossfade em curva S de 45 f (`MIX_CINEMA.transicaoSecaoFrames`).

| Seção | A partir de | Livre | Sob a voz | Queda |
|---|---|---|---|---|
| A — escuro | f0 | 0,85 | 0,50 | −4,6 dB |
| B — a luz abre | t2.inicio (f650) | 0,70 | 0,29 | −7,7 dB |
| C — crescendo | t3.inicio (f1473) | 0,62 | 0,22 | −9,0 dB |
| D — resolução | t5.inicio (f2274) | 0,55 | 0,19 | −9,2 dB |

   A revisão sugeria 0,28 no trecho escuro. Pela medição, 0,28 ainda deixaria a trilha a −35,5 LUFS (19,5 dB abaixo da voz), por isso usei 0,50.
2. **Sem voz, sem ducking.** Novo prop `duckingSemVoz` (padrão `false`). Com `narracao` nula, a trilha toca no nível livre da seção, estável e sem bombear. Quando `vozConfie.arquivo` existir, o ducking liga sozinho, e `duckingSemVoz` força o ducking para testes.
3. A lógica foi para **`src/som/ducking.ts`**, que é puro (sem React) e dá para medir em Node: `blocosDeFala`, `profundidadeDucking`, `niveisNoFrame`, `ganhoTrilha`. A `CamadaSomCinema` reexporta essas funções. As rampas (250 ms em S, pré 80 ms, pós 180 ms, junção 450 ms) não mudaram.

## Medição depois da correção (trilha com o ganho real da camada, M de 400 ms)
| Seção | Antes: sob fala | **Depois: sob fala (com voz)** | Abaixo da voz −16 | Sem voz (preview, nível estável) |
|---|---|---|---|---|
| A — escuro | −40,5 | **−32,1** | 16,1 dB | −29,5 / −27,5 |
| B — abre | −35,6 | **−31,9** | 15,9 dB | −25,9 / −24,3 |
| C — crescendo | −33,2 | **−32,0** | 16,0 dB | −22,9 |
| D — resolução | −32,2 | **−32,2** | 16,2 dB | −22,4 |

Meta "trilha 14–18 dB abaixo da voz em todo o vídeo" atendida (15,9–16,2 dB). O arco de dinâmica continua nos respiros: gaps a −32 → −30 → −27 → −24 LUFS.

Pré-mixagens completas (trilha com ganho real + 14 cues), em `render/revisao/som/`:
- `premix-r2-com-ducking.wav/.png`: −27,7 LUFS, −8,5 dBTP, 0 clip, 0 cliques, DC ~0.
- `premix-r2-sem-voz.wav/.png` (o que o preview toca hoje): −23,6 LUFS, −7,4 dBTP, 0 clip, 0 cliques. Envelope contínuo, sem bombeamento.

## ENTREGA — som — confie-em-cristo (rodada 2)
Status: concluído
Arquivos alterados: src/som/ducking.ts (novo), src/som/CamadaSomCinema.tsx, src/som/sfxCinema.ts (`transicaoSecaoFrames`), src/projetos/confie-em-cristo/som.ts (`trilhaConfie` → `TrilhaComNiveis`), render/revisao/som/premix-r2-*.{wav,png}, projetos/confie-em-cristo/08-som.md
Contrato exportado: `TrilhaComNiveis`, `NivelSecao`, `ganhoTrilha`, `niveisNoFrame`, `blocosDeFala`, `profundidadeDucking` (ducking.ts) · `CamadaSomCinema` com `trilha: string | TrilhaComNiveis` e `duckingSemVoz?` · `trilhaConfie: TrilhaComNiveis`
Validação feita: `npx tsc --noEmit` ok · `npm run qa` ✓ nenhum erro (64 arquivos) · medição ebur128 por seção (acima) · `analisar-audio.mjs` OK nas duas pré-mixagens
Pedidos a outros agentes: nenhum (a chamada em ConfieEmCristo.tsx continua compatível) · REVISÃO: refazer o balanço com a voz real quando ela existir
Riscos/pendências: com a voz real, os blocos de fala mudam e a medição precisa ser refeita (os níveis por seção devem continuar valendo, já que dependem da trilha, não da voz)

---

# Rodada 3 — reancoragem da revelação de luz (T2 virou fade simples)

O CÓDIGO trocou a T2 por um fade de 40 f (f650–690), então o feixe da transição não existe mais. A revelação acontece dentro da cena 3: o fio de luz cresce até "Mas" e a fenda **rompe em "escute"** (`g.escute`, f716), abrindo até "Deus" (`g.deus`, f784).
**Esta seção substitui** as linhas da T2 nas tabelas de cues e de decisões acima.

- `rupturaLuz = g.escute`. O **riser termina (pico) exatamente em f716**.
- O riser completo (2,6 s) começaria em f560, em cima de "esperar" (f560). Agora `inicioRiser = max(início completo, g.respostaFim)` = **f634, o fim de "resposta"**: nada sobe sob "esperar por uma resposta". Os 74 f iniciais são pulados (`trimInicio`), com **fade-in de 10 f** (campo novo `fadeIn` em `CueCinema`, aplicado na `CamadaSomCinema`) para não entrar seco no meio do arquivo. A subida inteira (1,37 s) acontece no silêncio de 1200 ms antes de "Mas".
- O brilho abre com a fenda: pico em f716 (início f705).
- Volumes reduzidos (riser 0,38 → 0,32, brilho 0,18 → 0,16) porque o pico agora encosta na voz. O pico cai no "es-" átono de "escute", não na tônica "-cu-".
- Removidos `feixeT2` e `PICO_REVELACAO`. Tudo é derivado dos gatilhos, sem números copiados.

Medição (pré-mixagem sem voz, M de 400 ms): a trilha fica em −28 a −27 LUFS durante a subida (10,6–11,8 s) e chega a −24 LUFS logo após a ruptura (12,1 s). É um acento discreto, sem ataque seco. Espectrograma: `render/revisao/som/virada-r3-espectro.png` (8,5–13,5 s).

| Frame | Som | Volume | Evento visual |
|---|---|---|---|
| 634 → pico 716 (trim 74 f, fade-in 10 f) | riser_luz | 0,32 | sobe após "resposta"; pico na ruptura da fenda ("escute") |
| 705 → pico 716 | brilho | 0,16 | fenda de luz se abre (escute → Deus) |

Demais cues sem mudança (412, 438, 1467, 1597, 1768, 1808, 1833, 2015, 2274, 2324, 2359, 2370).

## ENTREGA — som — confie-em-cristo (rodada 3)
Status: concluído
Arquivos alterados: src/projetos/confie-em-cristo/som.ts (riser/brilho reancorados em `g.escute`, início em `g.respostaFim`), src/som/sfxCinema.ts (`CueCinema.fadeIn?`), src/som/CamadaSomCinema.tsx (aplica `fadeIn`), render/revisao/som/{premix-r3-com.wav, premix-r3-sem.wav, virada-r3-espectro.png}, projetos/confie-em-cristo/08-som.md
Contrato exportado: `cuesConfie` (14 cues) · `CueCinema.fadeIn?: number` (opcional, compatível)
Validação feita: `npx tsc --noEmit` ok · `npm run qa` ✓ nenhum erro · `analisar-audio.mjs` OK em riser_luz, brilho e nas duas pré-mixagens (com ducking: −27,7 LUFS / −8,5 dBTP; sem voz: −23,6 LUFS / −7,4 dBTP; 0 clip, 0 cliques, DC ~0)
Pedidos a outros agentes: nenhum
Riscos/pendências: com a voz real, conferir se o pico do riser em "escute" não mascara a palavra. Se mascarar, a correção é baixar para 0,25 ou atrasar o pico para `g.escute + 4`
