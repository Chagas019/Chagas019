# PAFIES 2027 — vídeo das inscrições

Vídeo vertical (1080×1920, 30 fps, 30 s) para a 10ª Gincana Solidária PAFIES, avisando que as inscrições terminam no domingo.
Não aparece nenhuma pessoa: só motion graphics, tipografia animada, objetos 3D em CSS e o logo.

- `pafies-2027-inscricoes.mp4`: vídeo final, com narração e trilha.
- `pafies-2027.html`: a animação inteira. Abra com `?play` para ver em tempo real com a narração, ou com `?t=9.5` para ver um quadro parado.
- `audio/narracao.wav` e `audio/timing.json`: narração e o início e o fim de cada frase. As cenas seguem esses tempos.
- `sfx.py`: gera a trilha (batida, whooshes, impactos), mixa com a narração e abaixa a trilha quando a voz entra. Gera `build/mix.wav`.
- `render.mjs`: captura os 900 quadros com Playwright e gera `build/video-mudo.mp4`.
- `quadros.png`: um quadro por segundo, para conferir rápido.

## Para trocar a narração

1. Substitua `audio/narracao.wav` pela nova gravação.
2. Ajuste os tempos das cenas (`const S=` e os `b0` de cada cena em `pafies-2027.html`) para bater com as frases.
3. Rode:

```sh
python3 sfx.py
ln -s "$(npm root -g)" node_modules && node render.mjs
ffmpeg -i build/video-mudo.mp4 -i build/mix.wav -map 0:v -map 1:a -c:v libx264 -crf 20 -maxrate 14M -bufsize 28M \
  -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart pafies-2027-inscricoes.mp4
```

Fontes (Anton, Sora ExtraBold, Montserrat Black, Space Grotesk) ficam em `fonts/`, vindas do Google Fonts.
