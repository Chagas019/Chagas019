# OS DONS — Vídeo cinematográfico (9:16)

| Item | Valor |
|---|---|
| Formato | 1080×1920 · 30 fps · 26 s · MP4 H.264 + AAC |
| Vídeo final | `OS_DONS_1080x1920.mp4` |
| Projeto After Effects | `after-effects/OsDons_build.jsx` → gera `after-effects/OS_DONS.aep` |
| Trilha original | `audio/trilha_os_dons.wav` (sintetizada, sem direitos de terceiros) |
| Fontes | `fonts/` — Anton, Playfair Display ExtraBold Italic (Google Fonts, OFL) |

## Roteiro / timeline
| Tempo | Cena | Destaques |
|---|---|---|
| 0.0–5.6 | 01 Introdução | Explosão de luz vermelha, onda de choque, “VOCÊ JÁ / DESCOBRIU / o seu / DOM?” em slam, push de câmera, mergulho (whip zoom) |
| 5.6–13.6 | 02 Descoberta | CRIATIVIDADE (letras vindo da profundidade) · FÉ (impacto dourado + shake) · PROPÓSITO (fatias deslizantes) · TALENTO (giro 3D + varredura de luz) |
| 13.6–20.0 | 03 Mensagem | Revelação por máscara linha a linha; “NÃO” com destaque vermelho; “ESCONDIDOS.” revelado pela luz |
| 20.0–23.7 | 04 Encerramento | Fundo vermelho→preto, spot dramático, “COLOQUE SEUS DONS a serviço DE DEUS.” |
| 23.7–26.0 | Final | “qual é o seu DOM?” |

Mundo 3D em todas as cenas: 520 partículas/bokeh com profundidade de campo, estrelas, 14 sólidos wireframe (octaedro, icosaedro, cubo, tetraedro), símbolos (chama, estrela, cruz, anéis, pomba), palavras flutuantes, raios de luz, parallax por dolly de câmera, motion blur real (render a 60 fps → shutter de 180°), glow, bloom, vinheta e grão.

## Abrir no After Effects
1. Instale as fontes de `fonts/`.
2. AE → **Arquivo › Scripts › Executar arquivo de script…** → `after-effects/OsDons_build.jsx`.
3. O script monta comps nomeadas (`01_COMPS`, `02_CENAS`, …), câmera 3D com DOF, animators de texto, trilha com marcadores de impacto, adiciona à fila de render (H.264) e salva `OS_DONS.aep`.

## Recriar o MP4 (sem AE)
```bash
cd render
python3 trilha.py                       # gera trilha.wav
node render.js 0 1560 full60.mp4         # 60 fps (Chromium/Playwright)
ffmpeg -i full60.mp4 -i trilha.wav -vf "tmix=frames=2,fps=30" -c:v libx264 -crf 17 -c:a aac -shortest ../OS_DONS_1080x1920.mp4
```
