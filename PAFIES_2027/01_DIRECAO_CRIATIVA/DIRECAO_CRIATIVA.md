# PAFIES 2027 — 10ª EDIÇÃO · Direção Criativa

**Conceito:** A CONTAGEM REGRESSIVA COMEÇOU!
**Formato:** vertical 1080×1920 · 30 fps · 40 s · MP4 H.264 + AAC
**Trilha:** original, 120 BPM (1 batida = 15 frames) · todos os cortes caem em batida ou compasso

## Identidade

| Token | Hex | Uso |
|---|---|---|
| Azul royal | `#1E40C8` | fundo principal, assinatura |
| Azul royal claro | `#3A63F0` | luzes, brilhos, gradientes |
| Azul profundo | `#0A1A5C` | sombras, extrusão do logo |
| Amarelo vibrante | `#FFD000` | raios, destaques, números |
| Preto | `#0A0A0F` | contornos, sombra dura editorial, halftone |
| Branco | `#F5F5F2` | texto de apoio, tarjas |

- **Tipografia:** Anton (OFL, Google Fonts) para títulos condensados; Inter 800 para HUD/legendas.
- **Linguagem gráfica:** sombra dura deslocada (offset preto), halftone, raios amarelos com contorno, sunburst giratório, tarjas editoriais inclinadas (-2° a -5°), grão de filme e vinheta.
- **Logo:** logo oficial PAFIES (círculo azul com letras brancas desenhadas à mão), recortado do arquivo enviado com fundo transparente (`07_ASSETS/logo/pafies_logo_oficial_1600.png`). A marca é usada como imagem e não foi redesenhada. A animação só acrescenta profundidade (extrusão e sombra), rotação 3D de entrada e brilho.
- **Ilustração enviada:** megafone halftone com raios amarelos, recortado do fundo (`07_ASSETS/ilustracao/megafone_recorte.png`). Aparece no "EI, GALERA…" (cena 1) e no "ESSA EDIÇÃO PROMETE!" (cena 4). A linguagem dela (halftone, raios amarelos, recorte tipo adesivo com sombra dura) orientou toda a direção gráfica.

## Decupagem + guia de locução

A narração **não foi gravada**: não havia voz sintética disponível offline e o conector ElevenLabs falhou ao conectar. A trilha deixa espaço para a voz. A locução deve ser gravada seguindo os tempos abaixo e entrar na faixa A3 da timeline do Resolve.

| Tempo | Cena | Visual | Texto na tela | Locução (início ≈) |
|---|---|---|---|---|
| 00:00–06:00 | 01 ABERTURA | Tela escura, luz azul pulsando a cada batimento, anéis de pulso, push-in de câmera | EI, GALERA… (1,1 s) · ESTÃO PREPARADOS? (3,1 s) | 0,8 s "Ei, galera! Posso fazer uma pergunta?" · 3,0 s "Estão preparados?" |
| 06:00–14:00 | 02 REVELAÇÃO | Flash + impacto, logo entra em 3D (rotação X 75°→0°, extrusão), sunburst, raios, explosão de partículas, "10" 3D do Blender | 10ª EDIÇÃO · GINCANA SOLIDÁRIA · PAFIES 2027 | 6,3 s "Porque a nossa Gincana Solidária PAFIES está chegando!" · 9,5 s "E dessa vez temos um motivo ainda mais especial: estamos chegando à nossa décima edição!" |
| 14:00–24:00 | 03 SOLIDARIEDADE | Celular 3D sobe; alimentos 3D (maçã, lata, arroz, leite, coração) orbitam com parallax e profundidade de campo; faixa editorial | DESAFIOS · UNIÃO · CRIATIVIDADE · DIVERSÃO · SOLIDARIEDADE → MUITO MAIS QUE UMA COMPETIÇÃO. → UMA MISSÃO DE SOLIDARIEDADE. | 14,3 s "Serão momentos de desafios, união, criatividade, diversão e, principalmente, solidariedade!" · 18,5 s "Porque aqui não é apenas sobre competir." · 21,0 s "É sobre fazer a diferença na vida de quem precisa!" |
| 24:00–32:00 | 04 EXPECTATIVA | Cortes secos a cada compasso (2 s): amarelo → azul → preto; micro-zoom em cada kick; multidão vetorial; contagem 3-2-1 | PREPARE SUA EQUIPE! · REÚNA A GALERA! · ESSA EDIÇÃO PROMETE! · 3 · 2 · 1 | 24,2 s "Então já vai preparando sua equipe," · 26,2 s "reunindo a galera e aquecendo a criatividade…" · 28,2 s "Porque essa edição promete entrar para a história!" |
| 32:00–40:00 | 05 FINALIZAÇÃO | Impacto, logo centralizado no azul royal, raios, partículas, anel de choque e golpe final em 38 s | ESTÃO PREPARADOS? · PAFIES 2027 · VAMOS FAZER HISTÓRIA! · 10ª EDIÇÃO · UMA SÓ MISSÃO: FAZER A DIFERENÇA | 32,3 s "E aí, galera… estão preparados para viver tudo isso?" · 35,0 s "Gincana Solidária PAFIES 2027!" · 37,0 s "Décima edição. Uma só missão: fazer a diferença!" |

> A narração completa tem cerca de 42 s em ritmo normal. Para caber em 40 s, o locutor deve falar em ritmo animado (≈3 palavras/s), como em publicidade. Sem datas no roteiro, como pedido.

## Mapa emocional da trilha (08_AUDIO)

| Tempo | Música | Sound design |
|---|---|---|
| 0–6 s | drone grave + pad em Lá menor | batimentos acelerando (1,05 s → 0,55 s), whooshes nos textos, riser + reverse swell |
| 6 s | — | **IMPACTO** (boom + crack + cauda) |
| 6–14 s | kick 4×4, baixo em colcheias, pads Am–F–C–G | whooshes nas entradas, riser em 12,5 s |
| 14–18 s | breakdown: pads + arpejo (C–G–Am–F) | impacto suave, whooshes descendentes |
| 18–24 s | batida volta com palmas | riser + reverse swell para a virada |
| 24–30 s | energia máxima: snare, hats em semicolcheia, stabs nos cortes | whoosh antes de cada corte |
| 30–32 s | contagem 3-2-1 (kick + stab subindo) + rufar | riser |
| 32–38 s | refrão com arpejo | impacto grande |
| 38–40 s | acorde final + cauda | golpe final |

## Equipe e responsabilidades (como foi executado)

| Função | Execução real neste ambiente |
|---|---|
| Diretor criativo | conceito, paleta, decupagem e QA de cada etapa (este documento) |
| Designer | vetores em SVG/PDF gerados por código (`02_ILLUSTRATOR/scripts`) |
| Artista 3D | Blender 5.3 (módulo bpy), Cycles CPU, cenas e renders RGBA (`04_BLENDER`) |
| Motion designer | Remotion 4 (React): cenas, tipografia cinética, câmera e parallax (`05_REMOTION`); script de construção do AE (`03_AFTER_EFFECTS`) |
| Editor | montagem por cena, timeline FCPXML para o Resolve (`06_DAVINCI`) |
| Sound designer | trilha e efeitos 100% sintetizados (`08_AUDIO/scripts/sound_design.py`) |
| QA | stills, folhas de contato, análise de loudness, revisão do vídeo final (`09_PREVIEW`) |
