# 03 — Relatório de QA · Gincana Solidária PAFIES · 10ª edição

Data: 26/11/2026 · Remotion 4.0.242 · máquina 4 CPUs / 15 GB · critérios: `docs/02-storyboard.md` §5.

## 1. Resumo

**Status: APROVADO com 1 pendência menor (loudness 0,1 LU abaixo da meta).**
Os dois masters finais foram renderizados, verificados e estão em `out/`. Foram corrigidos dois
bugs objetivos de sincronização: o giro do "10ª" começava 4–7 frames depois do hit, e o áudio
dos MP4 ficava 43 ms atrasado.

## 2. O que foi testado

| # | Teste | Método | Resultado |
|---|---|---|---|
| 1 | TypeScript | `npx tsc --noEmit` (antes e depois das correções) | OK, sem erros |
| 2 | Trilha | `ffprobe public/trilha.wav` | PCM s16le, 48 kHz, estéreo, 38,000 s ✔ |
| 3 | Render de teste | `ffprobe out/teste-baixa.mp4` | 480×270, 30 fps, h264 + AAC ✔ |
| 4 | Varredura visual H | 76 frames (1 a cada 15 f) extraídos do teste, 4 pranchas | ver §3 |
| 5 | Varredura visual V | 77 stills `PafiesVertical` a 0,25 (1 a cada 15 f + 1139) | ver §3 |
| 6 | Sincronia visual | stills a 0,5 em cue−1 / cue / cue+2 para os 9 IMPACTS e os ticks 870, 1065, 1072; giro 899–920 quadro a quadro | ver §4 |
| 7 | Sincronia de áudio | numpy: fluxo espectral (janela 1024, passo de ¼ de frame) no WAV, pico de onset ±3 f em cada cue | ver §4 |
| 8 | Silêncio 836–839 | RMS do WAV | −240 dB (silêncio digital) ✔ |
| 9 | Loudness | `ffmpeg ebur128=peak=true` (WAV e MP4 final) | −15,1 LUFS; true peak −1,3 dBTP (WAV) / −1,5 dBTP (AAC) |
| 10 | Bordas / selo | stills em escala 1 (H: 950–1139; V: 950–1139) + bounding box dos pixels dourados | ver §5 |
| 11 | Determinismo | mesmo frame (600, 1080) renderizado duas vezes, diferença de pixels | idênticos ✔ |
| 12 | Masters finais | ffprobe com contagem de frames; 6 frames de cada extraídos com ffmpeg e inspecionados; correlação cruzada áudio MP4 × WAV | ver §6 |

## 3. Verificação visual

- **Textos:** aparecem somente UNIR, CUIDAR, COMPARTILHAR, GINCANA, ENERGIA, JUNTOS, SOLIDÁRIA (anel),
  Solidária (script), 10ª, EDIÇÃO, PAFIES e 10ª EDIÇÃO. Não há datas, ano, locais, equipes nem outros
  números. Busca no código: nenhum texto literal fora de `src/content.ts`.
- **Acentos:** Á (SOLIDÁRIA, Solidária), Ç/Ã (EDIÇÃO) e o ordinal "ª" (com traço) estão corretos nas duas versões.
- **Legibilidade:** boa em todas as palavras-impacto. "10ª EDIÇÃO" dentro do selo (44 px) fica legível a 1080p e no
  poster.
- **Zona segura:** os textos ficam dentro da zona segura nas posições de repouso. Só saem dela em quadros de movimento
  (por exemplo, COMPARTILHAR entrando no frame 180, JUNTOS saindo pelo topo no 654–665 da vertical e o slam 3×→1×
  do "10ª" no 840–845, que é intencional).
- **Telas vazias:** os frames 0–14 são só o fundo navy, antes de a faísca surgir no cue 15, como pede o
  storyboard. O 839 é o congelamento com o ponto de faísca. Nenhum frame preto indesejado.
- **Continuidade da fita e transições:** a íris da gota (S01→S02), o mergulho no reflexo e a íris do branco
  (S02→S03), o whip com a fita (S03→S04), o colapso em faísca (S04→S05) e o mergulho no "0" (S05→S06) não
  têm saltos nem crossfade.
- **Paleta:** navy / electric / laranja / turquesa / dourado / cream, consistente nas duas versões.

## 4. Sincronização

**Áudio (onsets detectados no WAV × cues):**

| Cue | 240 | 480 | 540 | 600 | 840 | 900 | 960 | 1020 | 1080 |
|---|---|---|---|---|---|---|---|---|---|
| desvio (frames) | +0,07 | +0,07 | +0,07 | +0,07 | −0,18 | +0,07 | −0,43 | −0,18 | +0,07 |

Os ticks 120, 150, 180, 660, 675, 690, 870, 1065 e 1072 têm desvio de +0,07 f. **Todos ficam dentro de ±1 frame.** O 960 é um
impacto suave, com o riser terminando, e por isso o onset aparece mais cedo.

**Visual:** os flashes (`FLASHES`) e shakes (`SHAKES`) são gerados a partir de `timeline.json` e aparecem no frame
exato: 240, 480, 540, 600, 840, 900, 960, 1020 e 1080. O pouso do "10ª" é no 840 (escala 3×), e o laço da fita
começa no 1020. EDIÇÃO (870), PAFIES (1065) e 10ª EDIÇÃO (1072) começam a revelar no frame do tick e já estão
visíveis em cue+1/cue+2, dentro da tolerância de ±1 f.

## 5. Bugs encontrados e correções

| # | Bug | Gravidade | Correção |
|---|---|---|---|
| B1 | **Giro 360° do "10ª" fora de sincronia e curto demais.** Com o easing `SNAP` simétrico (0.85,0,0.15,1) em 14 f, o "10ª" ficava parado de 900 a 903, girava praticamente todo entre 904 e 910 (pico de velocidade no 907, **7 f depois do hit**) e o giro útil durava cerca de 4 frames. | média (sincronia) | `src/scenes/S05Dez.tsx`: novo `SPIN_EASE = Easing.bezier(0.25, 0.55, 0.3, 1)`, que arranca no hit e desacelera. `src/cues.ts`: `spinDur` passou de 14 para 18. Agora o giro começa em 901 (+46°/f) e é legível de 901 a 911 (face de trás e espessura visíveis em 903–906). Os sparkles do fim do giro foram para 918. |
| B2 | **Áudio dos MP4 atrasado 2048 amostras (42,7 ms ≈ 1,3 frame).** O AAC do render sai sem compensação do priming do encoder (medido por correlação cruzada MP4 × WAV em 8, 20, 28 e 34 s), o que viola a tolerância de ±1 f. | média (sincronia) | Novo `scripts/remux-audio.sh`: recodifica o áudio a partir de `public/trilha.wav` com edit list correto e copia o vídeo sem recompressão. Foi incluído em `npm run render` e `render:vertical` e documentado no README. Desvio após a correção: **0 amostras** nas duas versões. |

**Problemas relatados pelo Dev:**
- **Selo R=460 no pull-out:** medido em escala 1. **O selo não é cortado** em nenhum frame. Na horizontal, as margens
  mínimas ficam entre 28 e 46 px (y 42–1052 no 960–980, pull 1,06) e 50 px no stamp (1080). Na vertical, as margens
  laterais ficam entre 21 e 56 px (o ImpactRings do stamp sai do quadro, como previsto). É gráfico, não texto, então
  não foi alterado. Se quiserem mais respiro, reduzam o pull-out para 1,03.
- **Giro curto:** corrigido (B1).

## 6. Arquivos finais

| Arquivo | Especificação | Tamanho |
|---|---|---|
| `out/pafies-10-edicao.mp4` | H.264 High, **1920×1080**, 30 fps, 1140 frames, 38,000 s, CRF 18 (~7,6 Mb/s), yuvj420p; AAC-LC 48 kHz estéreo 320 kb/s; faststart | 37,5 MB |
| `out/pafies-10-edicao-vertical.mp4` | H.264 High, **1080×1920**, 30 fps, 1140 frames, 38,000 s, CRF 18; AAC-LC 48 kHz estéreo 320 kb/s; faststart | 35,6 MB |
| `out/poster.jpg` | frame 1139 (lockup final limpo), 1920×1080 | 197 kB |
| `docs/qa-prancha.png` | prancha do filme final, 1 frame a cada 30 (38 quadros) | 2,3 MB |

Os renders levaram cerca de 3 min 50 s cada (`--concurrency=4`). Logs: `out/render-final-h.log` e `out/render-final-v.log`.
Os stills de QA ficaram em `out/qa/` (cerca de 217 MB, podem ser apagados).

## 7. Pendências

1. **Loudness:** −15,1 LUFS integrado; a meta é −14 ±1, então faltam 0,1 LU. O true peak é −1,3 dBTP. Subir o ganho sem
   limiter estoura o teto de −1 dBTP. Sugestão: ajustar a master em `scripts/gerar_trilha.py` (+0,5 dB com limiter
   a −1,2 dBTP), rodar `npm run audio` e re-renderizar. Não foi feito aqui para não mexer na mix.
2. **Pixel format `yuvj420p`** (full range, herdado dos frames JPEG). Toca em players e redes, mas para máxima
   compatibilidade dá para renderizar com `--pixel-format=yuv420p`. Opcional.
3. O selo encosta a 21–50 px das bordas no pull-out e no stamp, sem corte (ver §5). Decisão de design.
