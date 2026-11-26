# 02 — Storyboard · "O Fio que Une"

> Fonte única de tempo para animação **e** trilha. Todos os frames são **absolutos** (frame 0 = início do vídeo).
> Leia junto com `01-direcao-criativa.md` (paleta, fontes, easings, springs, elementos).

## 0. Especificações

| Item | Valor |
|---|---|
| Composição principal | `PafiesHorizontal` — **1920×1080**, 30 fps |
| Composição vertical | `PafiesVertical` — **1080×1920**, 30 fps (mesmas cenas, recompostas — ver §4) |
| Duração | **1140 frames = 38,0 s = 19 compassos = 76 beats** a 120 BPM |
| Grade | `BEAT = 15`, `BAR = 60`. Tempo 1 do compasso *n* (1-based) = `(n−1)·60` |
| Áudio | `public/audio/trilha.wav` (gerada por script Python a partir da cue sheet §3) |
| Último frame | 1139 — deve ser um lockup limpo do selo (serve de thumbnail) |

**Convenção de sobreposição:** cada cena é uma `<Sequence from={início} durationInFrames={fim−início+1}>`. Nas sobreposições, a cena que entra fica **por cima**, e a transição é feita por elementos (fita, mergulho, whip, colapso) — nunca por crossfade de opacidade da cena inteira.

| Cena | Nome | Início | Fim | Frames | Compassos (seção) | Overlap de entrada |
|---|---|---|---|---|---|---|
| S01 | A Faísca | 0 | 239 | 240 | 1–4 (Intro) | — |
| S02 | Gotas que se Encontram | 225 | 479 | 255 | 5–8 (Build) | 225–239 (15 f) |
| S03 | Energia em Revezamento | 465 | 719 | 255 | 9–12 (Drop 1) | 465–479 (15 f) |
| S04 | O Anel Solidário | 705 | 839 | 135 | 13–14 (Break) | 705–719 (15 f) |
| S05 | Dez | 828 | 959 | 132 | 15–16 (Drop 2) | 828–839 (12 f) |
| S06 | O Encontro (Selo) | 945 | 1139 | 195 | 17–19 (Finale/Outro) | 945–959 (15 f) |

A fita (`<Ribbon />`) é **contínua entre cenas**: o ponto onde ela sai de uma cena é o ponto onde ela entra na próxima (posições de handoff indicadas em cada cena).

---

## 1. Cenas em detalhe

### S01 — A Faísca · frames 0–239 · 16 beats (Intro)

**Fundo:** `gradBg` com predominância `navyNight`; grão 0.06; 3 blobs `navySoft` gigantes (raio 500–700px) desfocados no fundo a 40% de opacidade, derivando lentamente (parallax ×0.3). Câmera: zoom 1.00→1.06 ao longo da cena (`FLUID`).

| Frames | Ação |
|---|---|
| 0–14 | Escuro quase total (só grão e blobs muito sutis). |
| **15** | `<Spark />` surge no centro (960,540): spring `POP` de 0→1. Heartbeat suave. |
| 15–89 | Faísca pulsa no heartbeat do compasso 2: pulso em **60** (escala 1→1.35→1, 4 raios-cruz on twos por 3 f). Um `<StitchLine />` muito sutil começa a se desenhar em diagonal ao fundo (opacidade 0.25). |
| 84–89 | **Antecipação:** a faísca encolhe para 0.8 e recua 20px para a direita (`BACK_IN`). |
| **90** | A faísca dispara para a esquerda e vira a **cabeça da fita**: `<Ribbon />` desenha uma curva em S do centro até a borda esquerda, volta em arco amplo e atravessa a tela da esquerda para a direita (cabeça viaja ~2400px em 30 f, `EXPO_OUT`). Whoosh 88. |
| **120** | Ao passar pelo terço esquerdo, a fita "corta" o quadro e revela **"UNIR"** (Unbounded 900, 200px, `cream`) — revelação por máscara: o texto só existe *atrás* da cabeça da fita (clip-path seguindo o head). Leve squash no pouso (2 f). Heartbeat. |
| 144–149 | "UNIR" sai: desliza 60px para cima + scaleY 1→0 (`EXPO_IN`, 6 f). |
| **150** | A fita dá uma laçada e revela **"CUIDAR"** (mesma fonte, 200px), posicionado no centro-direita, inclinado −4°. Tick. |
| 174–179 | "CUIDAR" sai (mesma lógica, para baixo). |
| **180** | A fita passa reta e longa pela base e revela **"COMPARTILHAR"** (Unbounded 900, 150px, tracking −0.03em), centralizado, letras com stagger de 1 f da esquerda p/ direita. Heartbeat. **Riser começa.** |
| 180–224 | "COMPARTILHAR" faz drift scale 1.00→1.04. A fita volta, contorna a palavra por cima e começa a enrolar em espiral no centro. |
| 210–219 | "COMPARTILHAR" sai sugado para o centro da espiral (scale→0, `EXPO_IN`). |
| 220–239 | A espiral da fita aperta e vira uma **gota laranja** (círculo 40px) no centro — vira o "núcleo" de onde a S02 nasce. **Whoosh 228.** |

**Saída / handoff (225–239):** a gota laranja no centro (960,540) é o handoff. S02 entra por cima com os blobs azuis surgindo das bordas.

**Áudio sincronizado:** heartbeat 15 (simples), 60/67, 120/127, 180/187; whoosh 88; tick 150; riser 180→240; whoosh 228; impacto suave 240.

---

### S02 — Gotas que se Encontram · frames 225–479 · 17 beats (Build)

**Fundo:** `navy` com `gradBg`; blobs de fundo continuam (parallax). Câmera: pan lento de 30px para a direita + zoom 1.00→1.05.

| Frames | Ação |
|---|---|
| 225–239 | Overlap: a gota laranja central fica; dois `<LiquidBlob />` grandes (A: `teal`, raio 220px; B: `electric`, raio 200px) entram pelas bordas esquerda e direita com antecipação (recuam 30px nos 4 f iniciais). |
| **240** | **Kick + impacto suave.** Gota laranja "estala": `<Splash />` laranja (8 gotas, on twos) e `<ImpactRings />` pequenos. A gota se estica e vira novamente fita, que começa a **costurar** os dois blobs: passa por cima de A, por baixo de B (alternar z-index), em laço infinito (∞) lento. |
| 240–299 | Os blobs flutuam um em direção ao outro em senos (período 90 f), com satélites pequenos (6–10 gotinhas `teal`/`tealLight`) se fundindo e se soltando via filtro goo. Cada kick (270) gera um pulso `GELATINA` nos blobs (squash 4%). |
| **300–390** | **"GINCANA" letra a letra**, uma letra por beat: G **300**, I **315**, N **330**, C **345**, A **360**, N **375**, A **390**. Unbounded 900, 220px, `cream`, sombra sólida `0 8px 0 #060F2E`, linha de base y=760 (abaixo dos blobs). Cada letra cai de −120px com antecipação de 2 f, pousa com `POP` (squash 2 f) e solta 3–4 gotinhas (`<Splash />` `teal`, on twos). As letras já pousadas fazem um "bounce" sutil (2px) a cada kick. |
| 390–404 | Palavra completa; a fita passa por baixo da palavra sublinhando-a (traço da esquerda p/ direita em 12 f). |
| 405–435 | **Fusão:** blobs A e B colidem no centro (360,0 → centro) com `GELATINA`; o goo os funde e a massa se reorganiza (morph de path ou interpolação de círculos) no **`<LiquidHeart />`** (largura 420px), cor migra para `gradHeart`. **Bloop em 420** (frame exato em que o coração "fecha" a forma). |
| 420–464 | Coração respira; "GINCANA" sobe 40px e encolhe para 0.85 (abre espaço). Snare roll 450→480; **riser 420→480**. A fita circunda o coração uma vez (órbita elíptica, 30 f). |
| 465–479 | **Transição "mergulho no coração":** câmera dá zoom brutal no reflexo branco do lóbulo esquerdo (scale 1→14, `EXPO_IN`); "GINCANA" sai pelos lados (letras se afastam em leque). O reflexo branco preenche a tela no frame 478–479 (flash). **Whoosh 470.** |

**Saída / handoff:** a tela fica tomada por branco→`electric` no frame 479; a S03 começa já em `electric`.

**Áudio:** kicks 240, 270, 300, 330, 360, 390, 420, 450; hats nos contratempos; plucks 300–390 (notas F#4, A4, B4, D5, E5, F#5, A5); bloop 420; riser 420→480; snare roll 450→480; whoosh 470; impacto 480.

---

### S03 — Energia em Revezamento · frames 465–719 · 17 beats (Drop 1)

**Fundo:** `gradElectric`. `<SpeedLines />` radiais (on twos) com ponto focal móvel. Câmera com mais energia: micro-shake nos impactos, drift diagonal.

| Frames | Ação |
|---|---|
| 465–479 | Overlap: o fundo `electric` "abre" de dentro do flash branco (iris circular crescendo do centro, 15 f, `EXPO_OUT`). |
| **480** | **IMPACTO + crash.** Flash 2 f (amber 35%), shake 3 f. **"ENERGIA"** (Unbounded 900, 220px, `cream`) explode do centro: escala 2.2→1 com `POP`, letras com stagger de 1 f do centro para as bordas. Speed lines a 100% de densidade. `<Splash />` `gradWarm` (14 gotas). |
| 480–534 | "ENERGIA" treme on twos (±2px) e a fita cruza a tela em diagonal 3 vezes como uma **corrida** — rastro de 600px, com 2 cópias-fantasma (motion blur simulado). |
| 530–539 | "ENERGIA" sai por whip vertical (sobe, stretch Y 1.5, `WHIP`, 8 f). |
| **540** | **Hit.** **"JUNTOS"** (Unbounded 900, 240px) entra de baixo com antecipação; atrás dele, eco em Anton outline (stroke 3px `electricLight`, sem preenchimento) repetido 4× para cima com opacidade 0.6/0.4/0.25/0.1 (pilha-eco). |
| 560–599 | "JUNTOS" encolhe para 0.6 e sobe para o topo (y=180). Entram **os dois braços** (`<Person />` só braço + manga, em grande escala, recorte "câmera baixa" como na ref. de corrida): braço A (manga `gradWarm` xadrez) pela esquerda, segurando a ponta da fita como **bastão**; braço B (manga `orange`) pela direita, mão aberta. Antecipação de 5 f em cada braço. Perspectiva exagerada: a mão A em primeiro plano é 1.4× maior. |
| **600** | **REVEZAMENTO — grande impacto + crash.** A mão A entrega a fita na mão B: no frame 600 as mãos se tocam; `<ImpactRings />` + `<Splash />` turquesa e laranja; flash 2 f; shake. Speed lines invertem de direção. |
| 600–654 | A mão B dispara com a fita para a direita; a fita deixa um rastro largo (48px) que cruza a tela e "embrulha" "JUNTOS" (laço em volta da palavra). Braços saem (`EXPO_IN`, 10 f). |
| **660 / 675 / 690** | Pilha rítmica, uma palavra por beat, alinhadas à esquerda (x=200), empilhadas: **"UNIR"** (660, y=320), **"CUIDAR"** (675, y=540), **"COMPARTILHAR"** (690, y=760). Anton 400, 190px, `cream`; cada uma entra com wipe horizontal da fita (a fita passa e deixa a palavra). A palavra anterior vira outline (`electricLight`) quando a nova entra. |
| **705–719** | **Transição WHIP para a direita:** tudo desliza −1920px em 15 f (`WHIP`) com motion blur simulado nos frames 709–714; a fita fica, esticada horizontalmente, e é o único elemento que "sobrevive" ao whip. **Whoosh 705.** |

**Saída / handoff:** fita horizontal na altura y=540 cruzando toda a tela; S04 começa com ela.

**Áudio:** kicks em todo beat 480→705; snares 495, 525, …, 705 (tempos 2 e 4); crash 480 e 600; impacto 480; hit 540; impacto grande 600; ticks 660/675/690; whoosh 705.

---

### S04 — O Anel Solidário · frames 705–839 · 9 beats (Break)

**Fundo:** volta ao `navy`/`navyNight` (respiro). Grão sobe para 0.08. Sem speed lines. Câmera: zoom lento 1.00→1.08.

| Frames | Ação |
|---|---|
| 705–719 | Overlap: chegando do whip, o fundo vira `navy`; a fita horizontal desacelera (ainda vibrando como corda, amplitude decaindo). |
| **720** | **Heartbeat.** A fita dobra suas pontas para trás e se fecha num **anel** em perspectiva (`<TypeRing />`, raio 520px, inclinação `rotateX(−18°) rotateZ(−8°)`); no anel aparece o texto **"SOLIDÁRIA ✦ SOLIDÁRIA ✦ SOLIDÁRIA ✦ "** (Anton, 110px, `navy` sobre a faixa laranja). Rotação Y contínua de 0°→200° até 828 (`FLUID`; nos últimos 20 f acelera). |
| **750–795** | No centro do anel, **"Solidária"** em Yellowtail (230px, `cream`, sombra sólida `navyNight` 6px) se escreve da esquerda para a direita (máscara de traço/clip progressivo, 45 f, `FLUID`). O pingo do "i" e o acento do "á" pousam por último com `POP` em 792–795. **Chime 750.** |
| **780** | Heartbeat + chime; `<Sparkle />` dourados piscam em 3 pontos ao redor da palavra (on twos). **Riser 780→836.** |
| 800–827 | Anel acelera a rotação; "Solidária" faz drift scale 1.00→1.05; partículas `amber` são puxadas em direção ao centro (sucção). |
| **828–839** | **Colapso:** anel e palavra são sugados para um ponto no centro (scale→0, rotação +180°, `EXPO_IN`), restando uma faísca dourada (12px). Frames **836–839: congelamento total** (silêncio na trilha) — só a faísca, 1 frame de respiro visual antes do impacto. |

**Saída / handoff:** faísca dourada no centro (960,540) → explode na S05.

**Áudio:** heartbeat 720/727 e 780/787; chime 750 e 780; riser 780→836; reverse cymbal 810→836; **silêncio 836–839**.

---

### S05 — Dez · frames 828–959 · 8 beats (Drop 2)

**Fundo:** `navy` com `<SpeedLines />` brancas e `electricLight` explodindo do centro (on twos); por trás, raios largos alternados `navy`/`navySoft` (sunburst de 24 fatias girando 10°/s).

| Frames | Ação |
|---|---|
| 828–839 | (overlap com o colapso do S04) |
| **840** | **IMPACTO MÁXIMO** (kick + boom + crash). Flash `goldLight` 2 f a 40%, shake 4 f (±10px). **"10ª"** (Unbounded 900, 360px, preenchimento `gradGold`, contorno `goldDeep` 4px, sombra sólida `navyNight` 10px) aparece em escala 3.0→1.0 com `PESO` (pousa no frame 846, overshoot 5%). `<ImpactRings />` dourados ×3 e `<Splash />` laranja/dourado (14 gotas). |
| 846–869 | Speed lines a todo vapor; "10ª" pulsa a cada kick (1.00→1.03). |
| **870–882** | **"EDIÇÃO"** (Bricolage Grotesque 600, 80px, tracking 0.25em, `cream`) entra embaixo (y=760), letra a letra com stagger de 2 f, cada letra subindo 30px com `POP`. Tick em 870. |
| 892–899 | Antecipação: "10ª" inclina para trás (rotateY −20°). **Whoosh 892.** |
| **900** | **Hit:** "10ª" dá um giro completo em Y (360° em 14 f, `SNAP`, CSS 3D com `perspective: 1200px`; mostra a espessura via 6 camadas empilhadas de `goldDeep` deslocadas 2px em Z). `<Sparkle />` ×4 no fim do giro. |
| 915–929 | "EDIÇÃO" sai para baixo (`EXPO_IN`); "10ª" centraliza o "0" na tela (move-se para que o miolo do "0" fique em 960,540). |
| **930–959** | **Mergulho no "0":** zoom brutal no miolo do "0" (scale 1→18, `EXPO_IN`, 30 f). O vazio interno do "0" (navy) passa a ocupar toda a tela; as bordas douradas do "0" passam pela câmera e, nos últimos 6 f, viram o **contorno dourado ondulado** do selo (a S06 começa aqui por cima). **Riser curto + whoosh 930→960.** |

**Saída / handoff:** tela `navy`, borda dourada fugindo para fora do quadro → S06.

**Áudio:** impacto 840; kicks em todo beat 840→945; snares 855, 885, 915, 945; tick 870; whoosh 892; hit 900; riser/whoosh 930→960; impacto 960.

---

### S06 — O Encontro (Selo) · frames 945–1139 · 13 beats (Finale/Outro)

**Fundo:** `gradBg`; blobs `navySoft` sutis; `<StitchLine />` circular ao redor do selo (raio R+40). Câmera: pull-out lento 1.06→1.00 (946–1080) e depois estática com drift ±4px.

**Layout final (1920×1080)** — centro do selo (960,540), `<WavySeal />` R = 460px:
- Coração `<LiquidHeart />` largura 380px, centro (960, 310).
- Pessoa A (esquerda) de corpo inteiro até a cintura, atrás-esquerda do coração, braços estendidos para a direita; Pessoa B (direita), espelhada. Mãos se encontram em (960, 250), acima do coração.
- **"GINCANA"** — Unbounded 900, 124px, `cream`, sombra sólida `navyNight` 6px, centro y=525.
- **"Solidária"** — Yellowtail 150px, `cream`, centro y=640, sobreposto 15% ao "GINCANA" (como no pin).
- **"PAFIES"** — Bricolage Grotesque 800, 72px, tracking 0.12em, `cream`, y=765.
- **"10ª EDIÇÃO"** — Bricolage Grotesque 600, 44px, tracking 0.2em, preenchimento `gradGold`, y=845.

| Frames | Ação |
|---|---|
| 945–959 | Overlap: borda dourada vinda do "0" se acomoda no contorno do selo. |
| **960** | **Impacto suave + kick.** O `<WavySeal />` termina seu draw-on (iniciado em 948) até 1000 (`EXPO_OUT`), girando −30°→0°. Miolo navy com brilho radial sutil. |
| 975–1005 | Gota turquesa cai do topo e se espalha (goo) formando o `<LiquidHeart />` (spring `GELATINA`). **Bloop 990** (frame em que o coração assenta). Linha d'água interna começa a ondular. |
| 990–1019 | Pessoas A e B deslizam das laterais para trás do coração (de x±400px, `EXPO_OUT`, antecipação de 4 f), braços ainda abaixados; aos 1005 começam a erguer e estender os braços um para o outro (rotação de ombro −10°→−70°, cotovelo 40°→10°). A fita laranja entra pela esquerda, contorna o selo por dentro (1000–1015) e chega às mãos. |
| **1020** | **O ENCONTRO** (chime + clap + `<ImpactRings />` turquesa e laranja pequenos). As mãos se tocam acima do coração; a fita dá **um laço** em volta das duas mãos (desenho de nó/laço em 10 f) e suas pontas pendem, balançando (spring `GELATINA`). Coração dá um pulso 1.00→1.08→1.00. |
| **1035** | **"GINCANA"** pousa (letras caem com stagger de 2 f, `POP`, squash 2 f). Snare/hit. |
| **1040–1070** | **"Solidária"** se escreve (Yellowtail, write-on 30 f). Shimmer suave no som. |
| **1065** | **"PAFIES"** sobe 30px + clip de baixo para cima (10 f, `EXPO_OUT`). Tick. |
| **1072** | **"10ª EDIÇÃO"** aparece por wipe dourado da esquerda (8 f). Tick. |
| **1080** | **HIT FINAL** (acorde D add9 + crash + sub). "Stamp": selo inteiro escala 1.00→1.045→1.00 (`PESO`), flash `goldLight` 2 f a 25%, `<ImpactRings />` dourados atrás do selo, 8 `<Sparkle />` ao redor da borda (on twos). |
| 1086–1110 | **Shimmer:** faixa de brilho diagonal (`goldLight`→transparente, 120px de largura, −20°) varre a borda dourada da esquerda para a direita. |
| 1080–1139 | **Hold vivo:** coração respira, fita pendente balança (amplitude decaindo), selo flutua ±4px (período 60 f), sparkles ocasionais (seed fixa: 1096, 1112, 1128). Último frame (1139) = lockup limpo, sem flash nem partícula em transição. |

**Áudio:** impacto suave 960; kicks 960, 990, 1020, 1050; bloop 990; chime+clap 1020; hit 1035; ticks 1065 e 1072; **hit final 1080**; cauda de reverb até 1139 (fade de áudio somente nos últimos 20 frames, 1120→1139).

---

## 2. Resumo de textos por cena (verificação QA)

| Cena | Textos exatos |
|---|---|
| S01 | `UNIR`, `CUIDAR`, `COMPARTILHAR` |
| S02 | `GINCANA` |
| S03 | `ENERGIA`, `JUNTOS`, `UNIR`, `CUIDAR`, `COMPARTILHAR` |
| S04 | `SOLIDÁRIA ✦` (anel, repetido), `Solidária` (script) |
| S05 | `10ª`, `EDIÇÃO` |
| S06 | `GINCANA`, `Solidária`, `PAFIES`, `10ª EDIÇÃO` |

Nenhum outro texto, número, data, ano, local ou nome pode aparecer. (`✦` é um ornamento desenhado em path, não um caractere de fonte.)

---

## 3. Cue sheet de áudio (fonte única)

Conversão: `t(s) = frame / 30`. Eventos marcados com **★** são "picos" — a animação deve ter o pico visual exatamente nesse frame. `→` indica evento contínuo (início→fim).

### 3.1 Eventos pontuais

| Frame | t (s) | Evento | Cena | Visual sincronizado |
|---|---|---|---|---|
| 15 | 0,500 | heartbeat simples (suave) | S01 | ★ faísca surge |
| 60 | 2,000 | heartbeat (tum) | S01 | ★ pulso da faísca |
| 67 | 2,233 | heartbeat (tum, −3 dB) | S01 | — |
| 88 | 2,933 | whoosh curto | S01 | faísca dispara (90) |
| 120 | 4,000 | heartbeat (tum) + tick | S01 | ★ "UNIR" |
| 127 | 4,233 | heartbeat (tum, −3 dB) | S01 | — |
| 150 | 5,000 | tick | S01 | ★ "CUIDAR" |
| 180 | 6,000 | heartbeat (tum) + tick | S01 | ★ "COMPARTILHAR" |
| 187 | 6,233 | heartbeat (tum, −3 dB) | S01 | — |
| 228 | 7,600 | whoosh | S01→S02 | espiral vira gota |
| 240 | 8,000 | **impacto suave** + kick | S02 | ★ gota estala |
| 270 | 9,000 | kick | S02 | pulso dos blobs |
| 300 | 10,000 | kick + pluck F#4 | S02 | ★ "G" |
| 315 | 10,500 | pluck A4 | S02 | ★ "I" |
| 330 | 11,000 | kick + pluck B4 | S02 | ★ "N" |
| 345 | 11,500 | pluck D5 | S02 | ★ "C" |
| 360 | 12,000 | kick + pluck E5 | S02 | ★ "A" |
| 375 | 12,500 | pluck F#5 | S02 | ★ "N" |
| 390 | 13,000 | kick + pluck A5 | S02 | ★ "A" |
| 420 | 14,000 | kick + bloop | S02 | ★ coração fecha |
| 450 | 15,000 | kick | S02 | — |
| 470 | 15,667 | whoosh | S02→S03 | mergulho no reflexo |
| 480 | 16,000 | **IMPACTO** + crash + kick | S03 | ★ "ENERGIA" + flash |
| 540 | 18,000 | **hit** | S03 | ★ "JUNTOS" |
| 600 | 20,000 | **IMPACTO GRANDE** + crash | S03 | ★ mãos se tocam (revezamento) |
| 660 | 22,000 | tick (hit leve) | S03 | ★ "UNIR" |
| 675 | 22,500 | tick (hit leve) | S03 | ★ "CUIDAR" |
| 690 | 23,000 | tick (hit leve) | S03 | ★ "COMPARTILHAR" |
| 705 | 23,500 | whoosh (whip) | S03→S04 | whip-pan |
| 720 | 24,000 | heartbeat (tum) | S04 | ★ fita fecha em anel |
| 727 | 24,233 | heartbeat (tum, −3 dB) | S04 | — |
| 750 | 25,000 | chime | S04 | ★ início do write-on "Solidária" |
| 780 | 26,000 | heartbeat (tum) + chime | S04 | ★ sparkles |
| 787 | 26,233 | heartbeat (tum, −3 dB) | S04 | — |
| 836 | 27,867 | **silêncio** (836–839) | S04 | congelamento, faísca |
| 840 | 28,000 | **IMPACTO MÁXIMO** + crash + boom | S05 | ★ "10ª" |
| 870 | 29,000 | tick | S05 | ★ "EDIÇÃO" |
| 892 | 29,733 | whoosh | S05 | antecipação do giro |
| 900 | 30,000 | **hit** | S05 | ★ giro 360° do "10ª" |
| 960 | 32,000 | **impacto suave** + kick | S06 | ★ selo se fecha |
| 990 | 33,000 | kick + bloop | S06 | ★ coração assenta |
| 1020 | 34,000 | kick + **chime + clap** | S06 | ★ O ENCONTRO (mãos + laço) |
| 1035 | 34,500 | hit (snare) | S06 | ★ "GINCANA" |
| 1050 | 35,000 | kick | S06 | — |
| 1065 | 35,500 | tick | S06 | ★ "PAFIES" |
| 1072 | 35,733 | tick | S06 | ★ "10ª EDIÇÃO" |
| 1080 | 36,000 | **HIT FINAL** (D add9 + crash + sub) | S06 | ★ stamp do selo |

### 3.2 Eventos contínuos

| Início | Fim | Evento |
|---|---|---|
| 0 | 239 | Pad (Bm–G–D–A, 1 acorde/compasso), filtro abrindo 400 Hz→1,2 kHz |
| 180 | 240 | Riser 1 |
| 240 | 479 | Hats nos contratempos (beat + 7,5 f, i.e. +0,25 s) · baixo em colcheias |
| 420 | 480 | Riser 2 |
| 450 | 480 | Snare roll em semicolcheias (crescendo) |
| 480 | 719 | Kick em todo beat (480, 495, …, 705) · snares 495, 525, 555, 585, 615, 645, 675, 705 · hats contratempo · baixo |
| 720 | 835 | Break: pad + baixo longo, sem bateria |
| 780 | 836 | Riser 3 (o mais longo e intenso) |
| 810 | 836 | Reverse cymbal |
| 836 | 839 | Silêncio total (corte seco) |
| 840 | 959 | Kick em todo beat (840, 855, …, 945) · snares 855, 885, 915, 945 · hats · baixo |
| 930 | 960 | Riser curto + whoosh de mergulho |
| 960 | 1079 | Pad mais aberto + kick nos tempos 1 e 3 (960, 990, 1020, 1050) |
| 1080 | 1139 | Acorde final D add9 sustentado + cauda de reverb; fade de áudio 1120→1139 |

### 3.3 Exportação para código
O Desenvolvedor deve criar `src/timeline.ts` exportando estas constantes (mesmos números desta cue sheet), e o script Python da trilha deve ler o mesmo arquivo (ou um `src/cues.json` gerado a partir dele) — **uma única fonte de verdade**:
`SCENES` (id, from, to), `IMPACTS` (240, 480, 540, 600, 840, 900, 960, 1020, 1080), `WHOOSHES` (88, 228, 470, 705, 892, 930), `RISERS` ([180,240], [420,480], [780,836], [930,960]), `HEARTBEATS` (15, 60, 120, 180, 720, 780), `PLUCKS` (300…390), `TICKS` (120, 150, 180, 660, 675, 690, 870, 1065, 1072), `BLOOPS` (420, 990), `CHIMES` (750, 780, 1020), `SILENCE` ([836, 839]), `FINAL_HIT` (1080).

---

## 4. Versão vertical 1080×1920 — recomposição

Mesma timeline, mesmos frames, mesma trilha. Implementar cenas com layout parametrizado por `useVideoConfig()` (`isVertical = height > width`). Regras:

- **Zona segura:** margens de 90px laterais, 220px no topo e 300px na base (UI de redes sociais). Nenhum texto fora dela.
- **Escala de tipografia:** palavras-impacto limitadas pela largura útil (900px): usar `fontSize = min(tamanhoHorizontal, larguraÚtil / (nLetras × 0.78))`. "COMPARTILHAR" em Unbounded cai para ~96px — no vertical, **quebrar em "COMPAR-" / "TILHAR"** NÃO é permitido; em vez disso usar Anton (condensada) a 150px.
- **S01:** a fita percorre trajetória **vertical** (cima→baixo em S) em vez de horizontal; palavras centralizadas em y = 760, 960, 1160 respectivamente.
- **S02:** blobs entram por **cima e por baixo** (não pelas laterais); "GINCANA" em y=1380, 150px; coração no centro (540, 860).
- **S03:** "ENERGIA" 150px; braços entram de **baixo-esquerda e cima-direita** (diagonal) para manter o encontro no centro; pilha UNIR/CUIDAR/COMPARTILHAR em y = 700/900/1100, alinhada à esquerda x=90, Anton 150px. Whip passa a ser **vertical** (para cima).
- **S04:** anel com raio 400px e inclinação maior (`rotateX(−24°)`) para caber; "Solidária" 170px.
- **S05:** "10ª" 300px em (540, 860); "EDIÇÃO" y=1120; sunburst centrado no "10ª".
- **S06:** selo R = 470px centrado em (540, 900); acima do selo (y≈300) e abaixo (y≈1560) entram ornamentos extras: `<StitchLine />` e 2 `<Sparkle />`, para preencher sem texto adicional. Tipografia interna do selo idêntica em proporção ao R.
- Speed lines, blobs de fundo e grão: recalcular ponto focal e raios pela maior dimensão (1920).
- Nada de simplesmente "letterbox" ou recortar a versão horizontal.

---

## 5. Checklist do QA (critérios de aceite)

1. Duração exata 1140 frames; ambas as composições renderizam sem erro.
2. Cada ★ da cue sheet: pico visual no frame exato (tolerância 0 f para impactos, ±1 f para ticks).
3. Textos: somente os da §2; acentos corretos (Á, Ç, Ã) e "ª" renderizado.
4. Nenhum crossfade de cena inteira; nenhuma palavra parada > 10 f.
5. Respingos/speed lines visivelmente on twos; resto a 30 fps.
6. Paleta: amostrar 10 frames — nenhuma cor fora da tabela de tokens (exceto tons de pele e interpolações de degradê).
7. Áudio: −14 LUFS ±1, pico ≤ −1 dBTP; silêncio real em 836–839.
8. Render determinístico (dois renders do mesmo frame idênticos).
9. Último frame (1139) limpo e legível como thumbnail, em ambas as versões.
