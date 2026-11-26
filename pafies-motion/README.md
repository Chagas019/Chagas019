# Gincana Solidária PAFIES · 10ª edição — Motion Design

Filme de 38 s (1140 frames, 30 fps) em **Remotion 4.0.242 + React 18 + TypeScript**, conceito
"O fio que une". Duas saídas: **horizontal 1920×1080** e **vertical 1080×1920** (recomposta, não recortada).

Documentos-fonte: `docs/01-direcao-criativa.md` (paleta, fontes, movimento) e
`docs/02-storyboard.md` (cenas, frames, cue sheet, regras da vertical, checklist de QA).

## V2 — Teaser (produto principal)

A V1 (acima) foi reprovada pelo estilo; a **V2** segue a linguagem das referências e o roteiro novo
(`docs/04-briefing-v2.md`): **24 s · 720 frames · 30 fps · 120 BPM**, trilha `public/trilha-v2.wav`.

- Composições: **`PafiesTeaser`** (1920×1080) e **`PafiesTeaserVertical`** (1080×1920, recomposta),
  no topo do Studio. Cenas isoladas em `CenasV2/` (`V1-EAi` … `V5-Selo`, + `-V`). A V1 ficou em `V1/`.
- Roteiro (somente em `src/content-v2.ts`): "E AÍ," · "ESTÃO PREPARADOS" · "PARA A" + "10ª" (ouro
  gigante) + "GINCANA?" · "TÁ CHEGANDO," + "HEIN?" · selo GINCANA / Solidária / PAFIES / 10ª EDIÇÃO.
- Estilo: fundos **chapados** (sem degradê/vinheta/grão), cortes secos de cor no beat (`bgAt`,
  `src/timeline-v2.json`), linha branca condutora, respingos (`Splash`), pinceladas de velocidade,
  anel tipográfico 3D (`AnelFrase`), zoom-out extremo de dentro de um respingo.
- **Personagem do cliente**: `src/scenes-v2/shared/Corredor.tsx` mostra, FIEL, os 5 recortes do GIF
  dele (`public/corredor/f00…f04.png`, gerados por `scripts/recortar_personagem.py`) em ciclo de
  corrida (3 f/pose ≈ 10 poses/s). Nunca é redesenhado; a ação vem de câmera/posição/escala e das
  pinceladas atrás dele. (O `PersonagemLiquido` continua em `src/design/v2/` só para a prancha.)

| Cena | Frames | Fundo | Ação |
|---|---|---|---|
| V1 "E AÍ," | 0–119 | laranja | linha corta a tela; Corredor entra com zoom e pisa no f30 (splash azul + pinceladas); "E AÍ," pop no f45, treme nos beats; sai correndo |
| V2 "PREPARADOS" | 120–299 | azul elétrico | anel 3D tumbling nos 3 eixos → trava de frente legível 225–276; linha em arco |
| V3 "10ª GINCANA" | 300–479 | verde do GIF → marinho (390) | corrida em câmera baixa sobre pinceladas; "PARA A" 330; silêncio 386–389 congela; "10ª" ouro bate no 390, "GINCANA?" no 405 |
| V4 "TÁ CHEGANDO" | 480–599 | close no respingo → turquesa | zoom-out extremo; "TÁ CHEGANDO," letra a letra (495–533); "HEIN?" no 540 com o Corredor atravessando e pisando na poça |
| V5 Selo | 600–719 | marinho | linha desenha o círculo → selo dourado; coração, pessoas, lockup; hit final 660 e hold |

```bash
npm run render:teaser            # out/pafies-teaser-v2.mp4 (+ remux do áudio com trilha-v2.wav)
npm run render:teaser:vertical   # out/pafies-teaser-v2-vertical.mp4
# teste rápido em baixa
npx remotion render src/index.ts PafiesTeaser out/teaser-test-025.mp4 --scale=0.25 --pixel-format=yuv420p
# QA visual
node scripts/qa-stills.mjs PafiesTeaser 30,60,240,390,430,540,670 0.5 h
```

`scripts/remux-audio.sh` aceita o WAV como 2º argumento (padrão `public/trilha.wav`, V1).

## Estrutura

```
pafies-motion/
├─ docs/                      direção criativa, storyboard, prancha de design, referências
├─ public/trilha.wav          trilha original (gerada por script, sincronizada com a timeline)
├─ scripts/
│  ├─ gerar_trilha.py         sintetiza a trilha lendo src/timeline.json
│  ├─ qa-stills.mjs           vários stills de uma composição com um bundle só (QA visual)
│  └─ qa-sheet.py             monta uma prancha com os stills de QA
└─ src/
   ├─ index.ts / Root.tsx     registro das composições
   ├─ timeline.json/.ts       FONTE ÚNICA DE TEMPO (cenas, cues de áudio, grupos IMPACTS/TICKS…)
   ├─ cues.ts                 frames nomeados de cada ação (derivados da timeline) + shakes/flashes
   ├─ content.ts              TODOS os textos exibidos
   ├─ layout.ts               horizontal × vertical (zona segura, encaixe de fonte)
   ├─ design/                 tokens (cores, degradês, escala tipográfica), fontes, elementos SVG
   │                          (Selo, Coracao, Pessoa, Fita, Blob, SpeedLines, Respingos, Grao, AnelTexto, Sparkle)
   │                          e a prancha (Preview.tsx → composição Design/DesignBoard)
   ├─ motion/                 easings, springs, hooks (prog, anticipate, shake…), KineticText, transições
   ├─ scenes/
   │  ├─ S01Faisca.tsx … S06Encontro.tsx   uma cena por arquivo (props { layout: 'h' | 'v' })
   │  └─ shared/              Backdrop, Camera, Spark, ImpactRings, SplashAt, HeadReveal,
   │                          ScriptWriteOn, StitchLine, BigArm, rotas da fita (route.ts)
   └─ compositions/
      ├─ PafiesFilme.tsx      monta as 6 cenas em <Sequence> sobrepostas + transições + áudio
      ├─ FilmOverlay.tsx      camada global: grão on twos, vinheta, flashes de impacto
      └─ SceneStandalone.tsx  cena isolada (+ camada global) para a pasta "Cenas"
```

Composições no Studio:

| Id | Tamanho | Conteúdo |
|---|---|---|
| `PafiesMain` | 1920×1080 | filme completo |
| `PafiesVertical` | 1080×1920 | filme completo recomposto |
| `Cenas/S01-Faisca` … `S06-Encontro` (+ `-V`) | H e V | cada cena isolada, mesmo tempo absoluto do filme |
| `Design/DesignBoard` | 1920×1080 | prancha dos elementos de design |

## Instalação e Studio

```bash
npm install
npm run studio          # abre o Remotion Studio (http://localhost:3000)
```

O Chromium usado no render é configurado em `remotion.config.ts`
(`REMOTION_CHROME` sobrescreve o caminho padrão `/opt/pw-browsers/chromium`).

## Trilha sonora

```bash
pip install numpy       # única dependência
npm run audio           # = python3 scripts/gerar_trilha.py → public/trilha.wav
```

O script lê `src/timeline.json`: se você mover um evento sonoro lá, regenere a trilha e a animação
acompanha automaticamente (as cenas leem os mesmos frames via `src/cues.ts`).

## Renderizar

```bash
# horizontal (final)
npx remotion render src/index.ts PafiesMain out/pafies-10-edicao.mp4 --codec=h264 --crf=18
# vertical (final)
npx remotion render src/index.ts PafiesVertical out/pafies-10-edicao-vertical.mp4 --codec=h264 --crf=18
# (atalhos: npm run render  /  npm run render:vertical — já incluem o passo abaixo)
# OBRIGATÓRIO após o render: realinha o áudio AAC (o render o deixa ~43 ms atrasado)
bash scripts/remux-audio.sh out/pafies-10-edicao.mp4
bash scripts/remux-audio.sh out/pafies-10-edicao-vertical.mp4

# teste rápido em baixa resolução
npx remotion render src/index.ts PafiesMain out/teste-baixa.mp4 --scale=0.25 --codec=h264   # (0.33 dá largura ímpar e o h264 recusa)

# um still / vários stills para QA
npx remotion still src/index.ts PafiesMain out/qa/f840.png --frame=840 --scale=0.5
node scripts/qa-stills.mjs PafiesMain 120,480,840,1139 0.5 qa
python3 scripts/qa-sheet.py out/qa/prancha.png out/qa/qa-120.png out/qa/qa-480.png
```

## Como alterar

- **Textos:** somente em `src/content.ts`. Lista fechada (docs/01 §8): sem datas, ano, horários, locais,
  equipes, números além de "10ª" ou dados institucionais. Palavras longas na vertical se ajustam
  sozinhas (`useLayout().fit`).
- **Cores / degradês / sombras / escala tipográfica:** `src/design/tokens.ts`. Fontes: `src/design/fonts.ts`.
- **Tempo:**
  - eventos com som (impactos, ticks, plucks, chimes…): `src/timeline.json` → regenere a trilha;
  - ações visuais (saídas, antecipações, órbita da fita…): `src/cues.ts`, escritas como deslocamento
    a partir de um cue (ex.: `TK_UNIR + 24`);
  - início/fim/overlap das cenas: `scenes` em `src/timeline.json` (o filme e as composições isoladas leem dali);
  - shakes de câmera e flashes: `SHAKES` e `FLASHES` em `src/cues.ts`.
- **Layout de cada cena:** no topo de cada `src/scenes/Sxx*.tsx` (objetos `geo`/rotas por layout `h`/`v`).
- **Easings e springs:** `src/motion/easings.ts` e `src/motion/springs.ts` (nomes do doc 01 §4).

## Notas técnicas

- Toda cena trabalha em **frame absoluto** (`useSceneFrame`), então a mesma cena funciona no filme
  e isolada.
- Respingos, speed lines, sparkles e grão animam **on twos** (`onTwos(frame)`); câmera, fita e
  tipografia a 30 fps.
- Aleatoriedade sempre com `random(seed)` determinístico.
- Transições motivadas (sem crossfade): íris da gota (S01→S02), mergulho no reflexo + íris do branco
  (S02→S03), whip-pan com a fita sobrevivente (S03→S04), colapso em faísca (S04→S05), mergulho no "0"
  com `zoomDive` (S05→S06).

## Narração (V2)

A trilha do teaser é `public/trilha-v2-narrada.wav` = música (`trilha-v2.wav`) + voz de narrador.

- Falas e momentos de entrada: `narracao/falas.json` (texto + frame a 30 fps).
- Voz: Piper `pt_BR-cadu-medium` (offline). Baixe o modelo em huggingface.co/rhasspy/piper-voices (`pt/pt_BR/cadu/medium`, arquivos `.onnx` e `.onnx.json`) e instale `pip install piper-tts`.
- Regenerar voz + mix: `python3 scripts/gerar_narracao.py --modelo caminho/pt_BR-cadu-medium.onnx`
- Só remixar (ajustar volume/ducking): `python3 scripts/gerar_narracao.py --voz-db 3 --duck-db -11`
- Para trocar por uma voz gravada ou do ElevenLabs: substitua os WAVs em `narracao/brutos/` (mesmos nomes) e rode o script sem `--modelo`.
- Depois: `npm run render:teaser` e `npm run render:teaser:vertical` (ou apenas troque o áudio de um MP4 pronto com `bash scripts/remux-audio.sh out/arquivo.mp4 public/trilha-v2-narrada.wav`).
