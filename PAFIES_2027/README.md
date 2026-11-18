# PAFIES 2027 — Campanha 10ª Gincana Solidária

Vídeo vertical 1080x1920 · 9:16 · 30 fps · 40 s · H.264 + AAC 320k (48 kHz)

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `RENDERS/` | `PAFIES_2027_campanha_1080x1920.mp4`: vídeo final |
| `PREVIEW/` | prévia leve para aprovação + `stills/` (quadros de QA) |
| `ILLUSTRATOR/` | vetores SVG editáveis com camadas nomeadas (abrem no Illustrator) + `gerar_vetores.py` |
| `AFTER_EFFECTS/` | `engine.js` (composições/animação) + `render.js` (fila de render) |
| `ASSETS/` | logo original extraído (badge e letras com transparência), megafone, fontes OFL |
| `AUDIO/` | `trilha_mix.wav`, `stems/` (bateria, baixo, pad, arpejo, drone, sfx), `cues.json`, `narracao_guia.srt`, `sound_design.py` |

## Por que não há .aep/.ai

O ambiente é um contêiner Linux na nuvem, sem interface gráfica e sem Adobe After Effects ou Illustrator
(são aplicativos de desktop Windows/macOS, que não podem ser instalados aqui legalmente). Por isso, a produção
foi feita por código, com os mesmos conceitos:

- **Illustrator** → SVG vetorial com grupos/camadas nomeados (`Face`, `Extrusao`, `Brilho`, `Borda_Adesivo`…).
  Para abrir: *Arquivo › Abrir* no Illustrator. Instale a fonte Anton (`ASSETS/fonts`) para os textos dos rótulos.
- **After Effects** → `engine.js`: câmera 3D com perspectiva e dolly, easing equivalente ao Graph Editor
  (expo/back/elastic), parallax e profundidade de campo por eixo Z, motion blur por subframes (obturador de 180°),
  partículas (faíscas, bokeh), luz volumétrica, máscaras/track mattes (íris, tarja), tipografia cinética letra a letra,
  camera shake sincronizado aos impactos e granulação de filme.
  Os SVGs, PNGs e WAVs/stems podem ser importados num projeto do AE para refazer ou ajustar a animação no app.

## Cenas e cues de sincronia (`AUDIO/cues.json`)

1. **00–06 s, Abertura**: tela escura, batimentos + ECG, "EI, GALERA…" (1.0 s) e "ESTÃO PREPARADOS?" (3.4 s), megafone; íris azul.
2. **06–14 s, Revelação**: drop em 6.0 s, o logo voa da profundidade, shockwave, faíscas e raios 3D; "10ª EDIÇÃO" (8 s), "GINCANA SOLIDÁRIA" (10 s), "PAFIES 2027" (11 s); whip pan.
3. **14–23 s, Solidariedade**: celular 3D com alimentos orbitando, luz volumétrica; textos em 15 e 18 s; palavras-chave no beat (20–22.5 s); mergulho na tela.
4. **23–32 s, Expectativa**: tipografia gigante em 3 fundos (amarelo/azul/preto), marquee em parallax; riser e colapso antes do drop.
5. **32–40 s, Finalização**: badge PAFIES com impacto, raios orbitando, "ESTÃO PREPARADOS?", "PAFIES 2027", "VAMOS FAZER HISTÓRIA!" e brilho final.

## Locução

Nenhuma voz foi gerada: não havia TTS em português de qualidade disponível, e o conector ElevenLabs falhou ao conectar.
A trilha já deixa espaço para a voz. Para gravar, use `AUDIO/narracao_guia.srt` (timecodes por frase) e mixe a voz
sobre `trilha_mix.wav` com ducking de cerca de 6 dB na música.

## Re-render

```bash
cd ILLUSTRATOR && python3 gerar_vetores.py
cd ../AUDIO && python3 sound_design.py
cd ../AFTER_EFFECTS && node render.js stills 1.5,9,20   # QA
node render.js video 3                                  # MP4 final
```

Áudio 100% sintetizado (original). Fontes Anton/Bebas Neue: SIL Open Font License. Logo e megafone: arquivos fornecidos pelo cliente.
