# Anatomia de uma Câmera — planejamento técnico

## Ferramentas (o que existe neste ambiente)
| Pedido | Disponível? | Usado |
|---|---|---|
| Blender, After Effects, Illustrator, DaVinci | Não (ambiente Linux sem GUI e sem esses programas) | — |
| Remotion | Instalável, mas exige baixar o Chromium dele (bloqueado) | — |
| Skill **anatomy** | Sim | Método (conceito → lista de peças → modelo físico verdadeiro → verificação por close-ups), regras de acabamento: sólidos com bisel, uma única cor de destaque, linhas que terminam em pontos, nada de setas soltas |
| Three.js (WebGL) em Chromium sem tela | Sim | Modelagem 3D procedural, materiais PBR, luzes, câmera cinematográfica |
| Playwright + ffmpeg | Sim | Render determinístico quadro a quadro, 3840×2160, 30 fps, H.264 |
| Kokoro TTS (voz `pm_alex`, pt-BR) | Sim (offline) | Narração |
| numpy/scipy | Sim | Trilha eletrônica e efeitos sonoros sintetizados |

A skill anatomy gera figuras isométricas interativas para a web (SVG + WebGL); ela não gera vídeo, e o modo 3D dela está em beta e gira um único objeto por vez. Por isso o vídeo é renderizado em Three.js, aplicando as regras de acabamento da skill.

## Fidelidade
Câmera mirrorless genérica, não um modelo específico. Proporções coerentes com a classe (corpo ≈124×72×44 mm, lente 50 mm f/1.8 ≈ ⌀64×62 mm, sensor full frame 36×24 mm).

Representado com fidelidade (física e geometria conhecidas):
- caminho óptico e convergência; diafragma e números f (área ∝ 1/N², f/1.8→f/8 ≈ 19,8× menos luz);
- obturador de plano focal com duas cortinas e fenda em alta velocidade;
- matriz de pixels com microlentes e filtro Bayer (50 % verde);
- formatos full frame 36×24 e APS-C 23,5×15,6 em escala real (APS-C ≈ 42 % da área);
- cadeia de processamento: leitura/conversão A/D → demosaico → redução de ruído → tons/balanço de branco → compressão/arquivo.

Esquemático (varia conforme o modelo, sinalizado na tela):
- posição exata de placas, dissipador, flex e bateria;
- obturador com primeira cortina eletrônica em muitos modelos;
- estabilização no sensor (IBIS) presente só em parte dos modelos.

## Cenas (tempos vêm da narração)
1. Apresentação: giro de 360°, luz percorrendo o corpo, título.
2. Desmontagem: vista explodida com 12 componentes e legendas com linhas de chamada.
3. Luz: corpo em raio-X, raios atravessando a óptica, diafragma f/1.8 ↔ f/8.
4. Sensor: macro na matriz, fótons, Bayer, comparação FF × APS-C em escala.
5. Obturador: cortinas em câmera lenta, fenda, 1/1000 · 1/250 · 1/30 com hélice a 1500 rpm.
6. Processamento: dados saindo do sensor pela placa até o processador e o cartão.
7. Montagem final: desmontagem reversa, aproximação da lente, frase final.
