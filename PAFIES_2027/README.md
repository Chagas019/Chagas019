# PAFIES 2027 — 10ª Edição · Campanha audiovisual

**v4 (atual):** animação por recortes. Personagens e objetos gerados como elementos separados no Floot (`07_ASSETS/elementos_v4`), recortados e montados com articulações: braço com megafone girando no ombro, galera pulando no tempo da música, corredores com balanço, mãos e caixa. Cenários em camadas feitos em código, câmera 2.5D, paleta marinho/vermelho-coral/amarelo/azul-claro/branco e tipografia Big Shoulders Display (`05_REMOTION/src/v4.tsx`).

**v3:** ilustrações editoriais geradas com IA no Floot (projeto "PAFIES 2027 Assets"), no estilo das referências, animadas com câmera 2.5D, logo oficial, fitas, texto palavra por palavra, morph e wipes (`05_REMOTION/src/v3.tsx`, artes em `07_ASSETS/ilustracoes_ia`). As versões v2 e v1 continuam em `10_FINAL`.

**v2:** reconstrução visual em animação editorial 2D, inspirada nas referências (ilustração chapada com sombra recortada, fitas de velocidade, spray, match-cuts). Ilustrações originais (megafone, mãos, caixa de doação, alimentos, galera, corredor, estádio), câmera 2.5D por camadas, morph círculo→coração, texto palavra por palavra com máscara e wipes no tempo da trilha. Código: `05_REMOTION/src/v2`. Roteiro, timing e trilha são os mesmos da v1.

**A CONTAGEM REGRESSIVA COMEÇOU!** · vertical 1080×1920 · 30 fps · 40 s · H.264

## Entregáveis

| # | Entregável | Onde |
|---|---|---|
| 1 | **MP4 final v2 (direção editorial 2D) 1080×1920** | `10_FINAL/PAFIES2027_10a_EDICAO_1080x1920.mp4` |
| 1b | Teaser 16 s (v2) | `10_FINAL/PAFIES2027_TEASER_16s_1080x1920.mp4` |
| 1c | Versão anterior (v1, 3D) | `10_FINAL/PAFIES2027_v1_3D_1080x1920.mp4` |
| 2 | Projeto After Effects v2 (construtor) | `03_AFTER_EFFECTS/PAFIES2027_v2_editorial_build.jsx` → gera `PAFIES2027_v2_MASTER.aep` (o da v1 também está na pasta) |
| 3 | Ilustrações vetoriais v2 (SVG + PDF para Illustrator) e vetores v1 | `02_ILLUSTRATOR/v2_editorial`, `02_ILLUSTRATOR/svg`, `/pdf` |
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
