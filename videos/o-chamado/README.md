# O CHAMADO — experiência visual 3D (9:16)

| Item | Valor |
|---|---|
| Vídeo final | `O_CHAMADO_1080x1920.mp4` · 1080×1920 · 30 fps · 32 s · H.264 + AAC |
| Projeto 3D editável | `blender/projeto/cena01..05.blend` (Blender 5.x / Cycles) |
| Gerador 3D | `blender/ochamado.py` — modela objetos, materiais, luz de estúdio, câmera e animação |
| Composição | `composicao/comp.html` + `comp.js` — camadas, raios de luz, bloom, grading, tipografia |
| After Effects | `after-effects/OChamado_montagem.jsx` — importa as sequências e monta o projeto `.aep` |
| Áudio | `audio/mix_final.wav` (mix), `narracao_sincronizada.wav`, `trilha_instrumental.wav`, `trilha.py` |
| Fontes | `fonts/` — Inter Display, Cormorant Garamond (OFL) |

## Roteiro
| Tempo | Cena | Objeto 3D | Texto / narração |
|---|---|---|---|
| 0–6.5 s | 01 O início — fundo bege | Bússola dourada (vidro, agulha com física de mola) | “Existe um propósito para a sua vida.” |
| 6.5–12.5 s | 02 O chamado — fundo branco | Porta que abre, luz real atravessando | “Deus continua chamando.” |
| 12.5–20.5 s | 03 Os talentos — azul acinzentado | Câmera, Bíblia aberta (páginas virando), microfone, pincel, partículas | “Ele te deu dons / talentos / uma missão.” |
| 20.5–26.5 s | 04 A resposta — vermelho escuro e preto | Chama volumétrica | “O chamado não é sobre ser perfeito. É sobre estar disponível.” |
| 26.5–32 s | 05 Encerramento — escuro, luz suave | Cruz dourada | “Qual é a sua resposta?” / “Sim, Senhor. Eis-me aqui.” |

## Recriar
```bash
pip install bpy==5.3.0
python blender/ochamado.py <cena 1-5> <obj|bg|blend> 1 9999 render/cenaN_<camada>
cd composicao && node comp.js 0 960 saida.mp4
ffmpeg -i saida.mp4 -i ../audio/mix_final.wav -c:v copy -c:a aac -shortest O_CHAMADO.mp4
```
Narração: ElevenLabs, voz “Leonardo – Deep & Resonant”.
