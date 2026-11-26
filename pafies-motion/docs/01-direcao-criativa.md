# 01 — Direção Criativa · Gincana Solidária PAFIES · 10ª edição

> Documento-fonte para Motion Designer, Designer Gráfico, Desenvolvedor e QA.
> Em caso de dúvida, **este documento + `02-storyboard.md` vencem qualquer outra decisão**.
> Constantes globais: `FPS = 30`, `BPM = 120`, `BEAT = 15 frames`, `BAR = 60 frames` (compasso 4/4).

---

## 1. Conceito — "O FIO QUE UNE"

**Ideia central.** Uma única fita laranja nasce de uma faísca no escuro e atravessa o filme inteiro, costurando pessoas, palavras e cenas. Ela corre, é passada de mão em mão como um bastão de gincana, vira anel em torno da palavra "SOLIDÁRIA" e, no fim, amarra as mãos de duas pessoas sobre um coração líquido — fechando o selo da 10ª edição.

**Frase-guia para a equipe:** *"Nada aparece sozinho: tudo chega puxado pelo fio."* Toda entrada de elemento deve ter uma causa visual (a fita passa, uma gota cai, um impacto empurra). Se um elemento surge "do nada" com fade, está errado.

**Arco emocional:** faísca íntima (curiosidade) → gotas que se juntam (encontro) → energia de competição (euforia) → respiro (solidariedade) → explosão do "10ª" (orgulho) → abraço/selo (afeto, fechamento).

---

## 2. Paleta (hex exatos)

### 2.1 Tokens

| Token | Hex | Uso |
|---|---|---|
| `navyNight` | `#060F2E` | Fundo mais escuro, vinhetas, sombras, S01 e S04 |
| `navy` | `#0B1A4A` | **Cor dominante** — fundo padrão (marinho do pin) |
| `navySoft` | `#16296B` | Planos intermediários, blobs de fundo, sombra de texto |
| `electric` | `#1F5BFF` | Azul elétrico de apoio — fundo do "drop" (S03), speed lines |
| `electricLight` | `#5C8BFF` | Brilhos/realces sobre `electric` |
| `teal` | `#2EC4D6` | Turquesa do coração (cor base) |
| `tealLight` | `#8FEAF0` | Topo/realce do coração, reflexo líquido |
| `tealDeep` | `#1A86B8` | Base/sombra do coração |
| `orange` | `#FF7A00` | Laranja da fita (início do degradê A) |
| `amber` | `#FFB547` | Fim do degradê A, brilho da fita |
| `hotOrange` | `#FF5A1F` | Laranja-quente (início do degradê B) |
| `coral` | `#FF7B6B` | Coral (fim do degradê B) — mangas/personagem, respingos |
| `gold` | `#E9B949` | Dourado do selo (base) |
| `goldLight` | `#FFE08A` | Brilho/shimmer do dourado |
| `goldDeep` | `#A8741A` | Sombra/bisel do dourado |
| `cream` | `#FFF6E5` | Tipografia principal (nunca branco puro em grandes áreas) |
| `white` | `#FFFFFF` | Só para brilhos pontuais, speed lines e flashes de 1–2 frames |

### 2.2 Degradês

| Nome | Definição | Onde |
|---|---|---|
| `gradRibbon` (A) | `linear 90°: #FF7A00 0% → #FFB547 100%` | A fita condutora (sempre) |
| `gradWarm` (B) | `linear 135°: #FF5A1F 0% → #FF7B6B 100%` | Respingos, manga do personagem, hits de energia |
| `gradHeart` | `radial (centro 35% 30%): #8FEAF0 0% → #2EC4D6 45% → #1A86B8 100%` | Coração líquido |
| `gradGold` | `linear 180°: #FFE08A 0% → #E9B949 45% → #A8741A 100%` | Borda do selo, "10ª" |
| `gradBg` | `radial (centro 50% 45%): #16296B 0% → #0B1A4A 55% → #060F2E 100%` | Fundo padrão (vinheta embutida) |
| `gradElectric` | `radial: #5C8BFF 0% → #1F5BFF 50% → #0B1A4A 100%` | Fundo do S03 |

### 2.3 Regras de uso
- **Azul domina ~70%** da área de tela no total do filme (navy + navyNight + electric + navySoft).
- **Laranja ~15%**: é *acento e protagonista em movimento*, nunca fundo cheio por mais de 3 frames (exceção: flash de impacto de 2 frames).
- **Turquesa ~7%**: coração, blobs líquidos, reflexos.
- **Dourado ~3%**: reservado para "10ª" e selo. Não usar dourado em outras palavras.
- **Creme/branco ~5%**: tipografia e brilhos.
- Laranja **nunca** encosta diretamente em dourado sem 8px de navy entre eles (evita "sujar" o dourado).
- Texto creme sobre navy/electric sempre. Texto navy só sobre creme ou laranja.
- Proibido: preto puro `#000`, cinza neutro, verde, roxo.

---

## 3. Tipografia

Todas via `@remotion/google-fonts` (verificadas em `node_modules`). Carregar só os pesos listados (`loadFont('normal', { weights: [...], subsets: ['latin','latin-ext'] })`).

| Papel | Família | Módulo | Pesos | Uso |
|---|---|---|---|---|
| Display principal | **Unbounded** | `@remotion/google-fonts/Unbounded` | 900, 700 | "GINCANA", "ENERGIA", "JUNTOS", "10ª", palavras-impacto. Caixa alta, tracking `-0.02em` (900) |
| Display condensado | **Anton** | `@remotion/google-fonts/Anton` | 400 | Texto do anel 3D ("SOLIDÁRIA ✦"), pilhas tipográficas/eco, speed-type. Caixa alta, tracking `0.04em` |
| Script | **Yellowtail** | `@remotion/google-fonts/Yellowtail` | 400 | Somente "Solidária" (capitalizada). Revelação por máscara de traço (write-on) |
| Apoio | **Bricolage Grotesque** | `@remotion/google-fonts/BricolageGrotesque` | 800, 600 | "PAFIES" (800, tracking `0.12em`), "EDIÇÃO" (600, tracking `0.25em`) |

Regras:
- Fallback do script: `Dancing Script` 700 (`@remotion/google-fonts/DancingScript`) só se Yellowtail falhar no render.
- O "ª" de "10ª": usar o glifo U+00AA da Unbounded, tamanho 42% do "10", alinhado ao topo, com traço sublinhado. Se o glifo renderizar mal, desenhar como "a" minúsculo Unbounded 700 + retângulo de 6px abaixo.
- Escala (1920×1080): Hero 260–340px · Palavra-impacto 180–220px · Script 200–240px · Apoio 64–96px. Mínimo absoluto em tela: 48px.
- Texto sempre com **micro-vida**: nenhuma palavra fica 100% parada; mínimo um drift de escala 1.00→1.03 ou y ±6px durante sua permanência.
- Sombra de texto padrão (estilo "esmalte do pin"): `0 6px 0 #060F2E` (sólida, sem blur) + borda interna de 2px `navySoft` opcional. Nada de drop-shadow difuso genérico.

---

## 4. Linguagem de movimento

### 4.1 Easings nomeados (usar `Easing.bezier(...)` do Remotion)

| Nome | Bezier | Quando |
|---|---|---|
| `EXPO_OUT` | `(0.16, 1, 0.3, 1)` | Entradas padrão (rápido e assenta suave) |
| `EXPO_IN` | `(0.7, 0, 0.84, 0)` | Saídas padrão (acelera para fora) |
| `SNAP` | `(0.85, 0, 0.15, 1)` | Movimentos de câmera, wipes, troca de estado |
| `WHIP` | `(0.9, 0, 0.1, 1)` | Whip-pans e transições de chicote |
| `BACK_IN` | `(0.36, 0, 0.66, -0.56)` | Antecipação (recuo antes do movimento) |
| `BACK_OUT` | `(0.34, 1.56, 0.64, 1)` | Overshoot de pouso |
| `FLUID` | `(0.37, 0, 0.63, 1)` | Fluxos líquidos, drift, anel girando, fita ociosa |

### 4.2 Springs (`spring({ fps, frame, config })`)

| Nome | damping | stiffness | mass | Uso |
|---|---|---|---|---|
| `POP` | 12 | 180 | 0.8 | Letras slam, ícones, "pop" com overshoot visível (~12%) |
| `PESO` | 18 | 120 | 1.2 | Objetos grandes (10ª, selo), pouso pesado com overshoot ~5% |
| `GELATINA` | 8 | 140 | 0.6 | Blobs e coração (wobble de squash & stretch) |
| `SUAVE` | 200 | 100 | 1 | Sem overshoot — câmera, fades de suporte |

### 4.3 Regras
- **Antecipação obrigatória** em todo movimento > 300px: 3–5 frames de recuo (`BACK_IN`, 6–10% da distância no sentido oposto) antes do arranque.
- **Overshoot** em pousos: 4–12% (via `POP`/`PESO`/`BACK_OUT`). Nunca overshoot em câmera.
- **Squash & stretch** em gotas e letras-slam: ao bater, `scaleY 0.82 / scaleX 1.15` por 2 frames, depois spring de volta.
- **Sincronia**: o *pico* do movimento (pouso, contato, flash) cai **exatamente** no frame do evento da cue sheet — a antecipação começa antes.
- **"On twos" (15 fps)**: respingos, speed lines, partículas, grão e "boil" de contornos usam `Math.floor(frame / 2) * 2` como tempo. Câmera, fita e tipografia ficam a 30 fps. Esse contraste é a assinatura do filme.
- **Motion blur**: não usar CameraMotionBlur (custo de render). Simular: em whips/pans rápidos, aplicar `scaleX` de 1.0→1.6 no eixo do movimento + 2 cópias "fantasma" com opacidade 0.35/0.15 deslocadas 1 e 2 frames atrás. Só nos frames de velocidade máxima (3–5 frames).
- **Durações padrão**: entrada de palavra 8–12 frames; saída 6–8 frames (saídas sempre mais rápidas que entradas); transição entre cenas 12–15 frames de sobreposição; respiro mínimo de leitura de palavra: 20 frames.
- **Flash de impacto**: nos impactos principais, 2 frames de overlay `white`/`amber` a 35% de opacidade + shake de câmera 3 frames (±8px, decaindo).
- **Câmera viva**: todo plano tem um drift lento (zoom 1.00→1.04 ou pan 20px ao longo da cena, `FLUID`). Nunca plano 100% estático.
- **Parallax**: mínimo 3 camadas de profundidade (fundo blobs ×0.3, meio ×0.6, frente ×1.0).

---

## 5. Elementos gráficos (biblioteca)

Todos em SVG/React. Nomes = nomes de componentes sugeridos.

1. **`<Ribbon />` — a fita condutora.** Path SVG (cúbicas) com `stroke` de largura variável simulada por 2 paths sobrepostos (corpo `gradRibbon` 28px + brilho `amber`/`white` 4px deslocado 6px, opacidade 0.6). Desenho com `strokeDasharray/offset` (head) + cauda que se apaga (tail) — o trecho visível tem comprimento finito, como um cometa. Ponta arredondada. Em momentos de torção, alternar a largura de 28→10→28px (simula a fita virando de lado). Sombra sólida `navyNight` 10px abaixo, 30% opacidade.
2. **`<Spark />` — faísca inicial.** Círculo `amber` 14px + halo radial `orange` 0→60px, pulsando a cada beat (escala 1→1.35→1 com `POP`). 4 raios finos em cruz (2px, `white`) aparecem por 3 frames em cada pulso, on twos.
3. **`<LiquidBlob />` — blobs líquidos.** Círculos/elipses em grupo com filtro "goo" (`feGaussianBlur stdDeviation=18` + `feColorMatrix` alpha `0 0 0 22 -9`) para fusão orgânica. Cores `teal`, `electric`, `navySoft`. Movimento por senos lentos (período 90–150 frames) + spring `GELATINA` quando colidem.
4. **`<LiquidHeart />` — coração líquido.** Forma de coração **assimétrico e gordinho** (lóbulo esquerdo 8% maior, ponta levemente deslocada à direita, como o do pin), preenchido `gradHeart`. Superfície com uma "linha d'água" ondulada interna (`tealLight`, onda senoidal animada) e 1 reflexo em forma de vírgula branca a 40% no lóbulo esquerdo. Respira (escala 1.00↔1.025, período 60 frames = 1 compasso).
5. **`<WavySeal />` — selo ondulado.** Contorno com **14 ondas** (raio base R, amplitude 0.06R, `r(θ) = R·(1 + 0.06·sin(14θ))`), traço duplo: externo `gradGold` 16px + interno `goldDeep` 4px. Miolo `navy` com leve `gradBg`. Animação de entrada: draw-on do traço (dashoffset) em 40 frames `EXPO_OUT`, girando –30°→0°.
6. **`<Person />` — personagens geométricos.** Construídos só com primitivas: cabeça = círculo; cabelo = semicírculo/meia-lua sólida `navyNight`; tronco = retângulo arredondado (raio 40%); braço = cápsula (retângulo com raio total) articulada em 2 segmentos (ombro, cotovelo) via rotate; mão = círculo pequeno. Pessoa A: manga `gradWarm` com padrão xadrez simples (linhas 3px `navySoft` a 45%), pele `#F2C9A0`. Pessoa B: blusa `orange`, pele `#C68A5E`. Sem rosto detalhado: apenas 2 pontos de olho e 1 arco de sorriso (2px). Linha de contorno `navyNight` 4px (estética esmalte).
7. **`<SpeedLines />` — linhas radiais.** 36–60 triângulos finos (base 4–10px, comprimento 300–900px) irradiando de um ponto focal, cores `white` 70% e `electricLight`; aleatoriedade por seed **fixa** (`random('speed-'+i)`), redistribuídas a cada 2 frames (on twos). Interior livre: raio interno 180–260px.
8. **`<Splash />` — respingos.** Gotas (círculo + cauda em lágrima) em `gradWarm`/`teal`, 6–14 por impacto, trajetória balística (gravidade), animadas on twos, morrem com scale→0 em 10–14 frames. Sempre disparadas por um impacto.
9. **`<TypeRing />` — anel tipográfico 3D.** Palavras em Anton dispostas em cilindro com CSS 3D (`transform-style: preserve-3d`, cada caractere `rotateY(i·Δ) translateZ(R)`), `perspective: 1400px`. Faixa de fundo do anel = a própria fita laranja (gradRibbon) com texto `navy`; face traseira com opacidade 0.35 (`backface` visível, escurecida). Anel inclinado `rotateX(-18°) rotateZ(-8°)`, gira em Y.
10. **`<ImpactRings />` — anéis de impacto.** 2–3 círculos de traço (`stroke` 6→0px) expandindo de 0 a 600px em 14 frames `EXPO_OUT`, cores `amber` e `white`.
11. **`<Grain />` — grão sutil.** `feTurbulence` (`baseFrequency 0.9`, `numOctaves 2`) em overlay `mix-blend-mode: overlay`, opacidade **0.06**, seed muda a cada 2 frames. Sempre presente, por cima de tudo.
12. **`<Sparkle />` — estrela de 4 pontas** (`✦` desenhado em path, não fonte), `goldLight`/`white`, aparece em 4–6 frames com rotação 45°. Usada como separador no anel e no shimmer final.
13. **`<StitchLine />` — pesponto.** Linha tracejada (`dasharray 14 10`, 3px, `navySoft`) que às vezes acompanha a fita em paralelo — eco da costura do tecido da foto do pin. Uso discreto (S01, S06).

---

## 6. Trilha sonora (sintetizada em Python — original)

- **BPM 120**, compasso 4/4 → 1 beat = 0,5 s = **15 frames**; 1 compasso = 2 s = **60 frames**.
- **Tonalidade:** Ré maior. **Progressão** (1 acorde por compasso, em loop): `Bm – G – D – A` (vi–IV–I–V), esperançosa. No final (compasso 19, frame 1080): acorde sustentado `D add9` (D–F#–A–E).
- **Duração:** 38 s = 1140 frames = 19 compassos.
- **Timbres (síntese):**
  - *Pad*: 3 saws detunados (±7 cents) + lowpass 1,2 kHz com abertura lenta; ataque 0,4 s.
  - *Sub/baixo*: seno + leve saturação, segue a fundamental do acorde em colcheias a partir do build.
  - *Kick*: seno com pitch sweep 150→45 Hz em 80 ms + click de 3 ms.
  - *Heartbeat*: dois kicks graves e abafados (lowpass 200 Hz), o 2º ~230 ms depois e 3 dB mais baixo ("tum-tum").
  - *Snare/clap*: ruído branco bandpass 1,8 kHz (decay 120 ms) + tom 190 Hz curto.
  - *Hats*: ruído highpass 8 kHz, decay 30 ms, nos contratempos.
  - *Pluck*: saw curta com envelope rápido (decay 180 ms) — melodia das letras de "GINCANA".
  - *Riser*: ruído com bandpass subindo 300 Hz→8 kHz + seno subindo 1 oitava; volume em rampa exponencial.
  - *Whoosh*: ruído bandpass com sweep rápido (200 ms) e pan L→R.
  - *Impacto*: kick + boom sub 40 Hz (decay 1,2 s) + burst de ruído (decay 300 ms) + crash (ruído highpass 5 kHz, decay 1,5 s).
  - *Chime/bloop*: sino (seno + harmônico 2,76×) e "bloop" (seno com pitch 400→900 Hz em 90 ms) para gotas e coração.
- **Estrutura:**

| Seção | Compassos | Frames | Conteúdo |
|---|---|---|---|
| Intro | 1–4 | 0–239 | Pad abrindo, heartbeat nos inícios de compasso, ticks suaves; riser 180→240 |
| Build | 5–8 | 240–479 | Kick nos tempos 1 e 3, hats nos contratempos, baixo em colcheias, plucks de "GINCANA"; snare roll + riser 420→480 |
| Drop 1 | 9–12 | 480–719 | Four-on-the-floor, snare em 2 e 4, crash em 480 e 600, hits nos textos |
| Break | 13–14 | 720–839 | Bateria sai, pad + heartbeat + chime; riser 780→836; **silêncio 836–839** |
| Drop 2 | 15–16 | 840–959 | Impacto máximo em 840, four-on-the-floor, whoosh de mergulho 930→960 |
| Finale/Outro | 17–19 | 960–1139 | Kick em 1 e 3 (mais leve), chime do encontro em 1020, **hit final em 1080**, cauda de reverb até 1139 |

- Frames exatos de cada evento: ver **cue sheet** em `02-storyboard.md` (fonte única para áudio e animação).
- Mix: alvo −14 LUFS integrado, pico ≤ −1 dBTP, saída WAV 48 kHz estéreo. Impactos com sidechain (ducking de 4 dB no pad por 150 ms).

---

## 7. O que evitar

- **Cara de template/slide**: texto centralizado que entra com fade, fica parado e sai com fade. Proibido.
- **Fade genérico** (crossfade de opacidade) como transição entre cenas. Toda transição é *motivada*: fita, mergulho, whip, colapso.
- Texto parado por mais de 10 frames sem micro-movimento.
- Mais de 2 palavras grandes em tela ao mesmo tempo (exceto a pilha-eco no S03 e o lockup final).
- Drop-shadow difusa, brilho "neon" genérico, lens flare, bevel/emboss do Photoshop.
- Easing linear em qualquer coisa que não seja rotação contínua.
- Elementos entrando todos ao mesmo tempo — sempre escalonar 2–4 frames (stagger).
- Respingos aleatórios a cada render: toda aleatoriedade usa `random(seed)` determinístico.
- Qualquer conteúdo factual: datas, ano, horários, locais, equipes, números além de "10ª", chamadas ("inscreva-se", "participe até…"), dados institucionais.
- Copiar as referências literalmente (personagem de respingos, corredor, o anel azul exato). Traduzir a linguagem, não o desenho.
- 3D real/WebGL, vídeo externo, imagens bitmap de stock. Tudo vetorial e procedural.

## 8. Textos permitidos (lista fechada)

`GINCANA` · `SOLIDÁRIA` / `Solidária` · `PAFIES` · `10ª` · `EDIÇÃO` / `10ª EDIÇÃO` · `UNIR` · `CUIDAR` · `COMPARTILHAR` · `JUNTOS` · `ENERGIA` · `SOLIDARIEDADE`

Qualquer palavra fora desta lista precisa de aprovação do Diretor Criativo.
