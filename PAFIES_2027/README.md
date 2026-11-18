# PAFIES 2027 — 10ª Edição · Campanha audiovisual

**A CONTAGEM REGRESSIVA COMEÇOU!** · vertical 1080×1920 · 30 fps · 40 s · H.264

## Entregáveis

| # | Entregável | Onde |
|---|---|---|
| 1 | **MP4 final 1080×1920** | `10_FINAL/PAFIES2027_10a_EDICAO_1080x1920.mp4` |
| 1b | Versão alternativa: teaser 16 s | `10_FINAL/PAFIES2027_TEASER_16s_1080x1920.mp4` |
| 2 | Projeto After Effects (construtor) | `03_AFTER_EFFECTS/PAFIES2027_build_project.jsx` → gera `PAFIES2027_MASTER.aep` |
| 3 | Vetores editáveis (SVG + PDF compatível com Illustrator) e PNG | `02_ILLUSTRATOR/svg`, `/pdf`, `/png` |
| 4 | Arquivos do Blender (master + 1 por elemento) e renders RGBA | `04_BLENDER/blend`, `04_BLENDER/renders` |
| 5 | Código-fonte Remotion | `05_REMOTION/src` |
| 6 | Timeline do DaVinci Resolve (FCPXML) + LUT + clipes por cena | `06_DAVINCI` |
| 7 | Trilha, efeitos e stems (WAV 48 kHz/24 bit) | `08_AUDIO` |
| 8 | Prévia para aprovação (stills + folha de contato) | `09_PREVIEW` |

## Ferramentas usadas (auditoria do ambiente)

O ambiente é um container Linux na nuvem: 4 vCPU, 15 GB de RAM, sem GPU, sem interface gráfica e sem Computer Use.

| Programa pedido | Situação | O que foi feito |
|---|---|---|
| Blender | não vinha instalado; **instalado** (Blender 5.3 como módulo Python `bpy`, gratuito/GPL) | modelagem, materiais PBR, iluminação de 3 pontos, câmera com profundidade de campo, animação e render Cycles com transparência |
| Remotion | **instalado** (v4, npm) | motor de motion design e composição final, além de versões alternativas e prévias |
| Adobe Illustrator | proprietário, sem versão Linux | vetores gerados por script como SVG (abre no Illustrator) e PDF (formato nativo do Illustrator, com grupos nomeados) |
| Adobe After Effects | proprietário, sem versão Linux | script ExtendScript que constrói o projeto `.aep` completo ao ser executado no AE. Não foi testado em um AE real |
| DaVinci Resolve | precisa de GPU e interface gráfica | timeline FCPXML, LUT `.cube` e clipes por cena para abrir no Resolve. A finalização (LUT, loudness e encode) foi feita com FFmpeg |
| Locução | sem TTS offline; conector ElevenLabs falhou ao conectar | guia de locução sincronizado em `01_DIRECAO_CRIATIVA`, com faixa A3 reservada na timeline |

Nenhum software pago foi contratado ou instalado. Toda a trilha e os efeitos foram sintetizados do zero, sem samples de terceiros.

## Pendências para a versão de veiculação

1. **Locução:** grave seguindo o guia em `01_DIRECAO_CRIATIVA` e mixe na faixa A3 do Resolve.
2. **Logo em alta resolução:** o logo foi recortado de uma captura de tela (≈780 px de diâmetro, ampliado para 1600 px). Se existir o arquivo original (PNG/AI/SVG), basta substituir `05_REMOTION/public/logo/pafies_logo.png` e renderizar de novo.
3. **Vídeo de referência:** não chegou ao ambiente. Com ele dá para ajustar ritmo e transições.

## Como renderizar de novo

```bash
# 3D
python 04_BLENDER/scripts/build_and_render.py build && python 04_BLENDER/scripts/build_and_render.py render all
# vetores
python 02_ILLUSTRATOR/scripts/gerar_vetores.py && node 02_ILLUSTRATOR/scripts/exportar_pdf_png.js
# áudio
python 08_AUDIO/scripts/sound_design.py
# motion (Remotion)
cd 05_REMOTION && npm i && npx remotion render src/index.ts PAFIES2027 out/master.mp4 --muted
# finalização (LUT + loudness + H.264)
python 06_DAVINCI/scripts/finalizar.py 05_REMOTION/out/master.mp4
```
