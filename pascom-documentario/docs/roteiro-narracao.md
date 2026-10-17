# Roteiro de narração — "Somos chamados a algo maior"

Para gravação humana. Voz masculina adulta, timbre grave e natural, interpretação de testemunho
(não de propaganda). Emoção contida, dicção clara, crescimento gradual até o Ato 3.

**Marcações:** `/` respiração curta · `//` pausa (≈1 s) · `///` silêncio longo (2–3 s) ·
**negrito** = ênfase leve · `[ ]` = indicação de interpretação · `⏱` = momento em que a fala começa
no vídeo (pode variar ±0,5 s; ajuste depois em `src/data/timeline.json`).

## Técnica de gravação

- Sala sem eco (armário com roupas, colchão atrás do microfone), microfone a 15–20 cm, com pop filter.
- WAV 48 kHz / 24 bits, pico em torno de −6 dBFS. Sem compressão nem reverb (a mixagem cuida disso).
- Grave cada fala 3 vezes. Escolha a melhor e salve como `n01.wav`, `n02.wav`... em
  `public/assets/audio/narration/` (cada arquivo começa no início da fala, sem silêncio antes),
  **ou** grave tudo de uma vez acompanhando o vídeo e salve como `full.wav` (alinhado ao 0 s).
- Rode `npm run assets:scan` e `npm run render`. A música recua sozinha sob a voz.
- Se uma fala ficar mais longa que o espaço previsto, **não acelere a voz**: aumente o `end` dela
  e empurre as seguintes na linha do tempo; as cenas acompanham.

---

## ATO 1 — O SILÊNCIO

[Começo íntimo, quase sussurrado. A voz está perto, como quem conta algo pessoal.]

| ID | ⏱ | Texto |
|---|---|---|
| n01 | 0:05,0 | Às vezes, / tudo começa com um **olhar**. // |
| n02 | 0:08,4 | Uma imagem. / |
| n03 | 0:10,1 | Um instante. // [mais baixo] |
| n04 | 0:11,8 | A vontade de **guardar** aquilo / que o tempo parece querer levar embora. // [leve saudade; alongue "embora"] |
| n05 | 0:17,4 | Mas, / em algum momento, / percebemos... // [virada; deixe as reticências soarem] |
| n06 | 0:20,6 | que não se tratava apenas de **fotografar**. /// [firme e calmo; a imagem respira] |

## ATO 2 — O CHAMADO

[Testemunho. Começa sereno e vai abrindo a voz até o fim do ato.]

| ID | ⏱ | Texto |
|---|---|---|
| n07 | 0:26,0 | Porque Deus também nos **chama** / através daquilo que colocamos a serviço. // |
| n08 | 0:31,4 | Talvez tenha começado com uma câmera. / [lembrança, quase um sorriso] |
| n09 | 0:34,6 | Talvez com um vídeo. / |
| n10 | 0:36,4 | Talvez com a vontade de comunicar alguma coisa. // |
| n11 | 0:40,7 | Mas o chamado **nunca** foi apenas sobre aquilo / que estava diante das nossas lentes. // [cresce, sem acelerar] |
| n12 | 0:46,7 | Era sobre as **pessoas**. / |
| n13 | 0:48,7 | Sobre os encontros. / |
| n14 | 0:50,5 | Sobre as histórias que Deus escreve / em **silêncio**. /// [diminua em "silêncio"; a música para] |

## ATO 3 — ALGO MAIOR

[O coração do filme. A primeira frase entra junto com o tutti da orquestra (0:55,7). Voz plena, sem gritar.]

| ID | ⏱ | Texto |
|---|---|---|
| n15 | 0:55,7 | **Somos chamados a algo maior** / do que fotografias. // |
| n16 | 0:59,5 | Maior do que vídeos. / [ritmo marcado, um corte por frase] |
| n17 | 1:01,0 | Maior do que curtidas. / |
| n18 | 1:02,8 | Maior do que números. // [desça o tom para fechar] |
| n19 | 1:05,3 | Somos chamados a **servir**. // [convicção serena] |
| n20 | 1:08,2 | A transformar técnica em **serviço**. / |
| n21 | 1:10,9 | Criatividade em **missão**. / |
| n22 | 1:13,0 | Comunicação em **encontro**. / |
| n23 | 1:15,3 | E imagens em testemunhos de **fé**. // |
| n24 | 1:18,6 | Porque, / quando colocamos nossos dons / a serviço do Reino de Deus, / [mais íntimo] |
| n25 | 1:22,8 | até aquilo que parece pequeno / pode se tornar instrumento de **evangelização**. /// |

## ATO 4 — A MISSÃO

[A música desacelera. Humildade, sem queixa. Esperança crescendo devagar.]

| ID | ⏱ | Texto |
|---|---|---|
| n26 | 1:30,1 | Talvez nem todos se lembrem / de quem estava atrás da câmera. // |
| n27 | 1:34,6 | Talvez ninguém saiba / quantas horas foram dedicadas àquela imagem. // |
| n28 | 1:39,8 | Mas, / se através daquilo que comunicamos, / alguém se sentir **acolhido**... // |
| n29 | 1:44,8 | se alguém reencontrar a **esperança**... // |
| n30 | 1:47,7 | se alguém se aproximar de **Cristo**... // [a frase mais delicada; quase em oração] |
| n31 | 1:50,9 | então nossa missão / terá valido a pena. // [resolução, leve sorriso na voz] |
| n32 | 1:54,9 | Porque não estamos aqui apenas para mostrar / o que acontece dentro da Igreja. // |
| n33 | 2:00,7 | Estamos aqui para ajudar as pessoas / a encontrarem **Aquele** / que dá sentido a tudo. /// |

Depois de n33, sem voz: na tela, "Talvez a única Igreja que alguém veja esta semana seja a que
você mostrou." Deixe esse silêncio existir; não grave nada por cima.

## ATO 5 — O ENVIO

Sem narração. A trilha e o ambiente da igreja conduzem: "SOMOS CHAMADOS A ALGO MAIOR." →
"Somos chamados a levar o amor de Cristo através da comunicação." →
"SOMOS CHAMADOS A SER PASCOM." → silêncio.
