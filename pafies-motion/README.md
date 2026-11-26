# Gincana Solidária PAFIES · 10ª edição — Motion Design

Filme de 38 s (1140 frames, 30 fps) em **Remotion 4.0.242 + React 18 + TypeScript**, conceito
"O fio que une". Duas saídas: **horizontal 1920×1080** e **vertical 1080×1920** (recomposta, não recortada).

Documentos-fonte: `docs/01-direcao-criativa.md` (paleta, fontes, movimento) e
`docs/02-storyboard.md` (cenas, frames, cue sheet, regras da vertical, checklist de QA).

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
# (atalhos: npm run render  /  npm run render:vertical)

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
