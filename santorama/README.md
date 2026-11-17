# SANTORAMA

Série animada sobre a vida dos santos católicos. *Histórias que inspiram. Vidas que apontam para Cristo.*

## Estrutura
```
santorama/
  brand/           logo, foto de perfil, board de identidade
  assets/          characters/ (model sheets), backgrounds/
  templates/       Reels (zonas seguras), Stories
  music/, sound-effects/   bibliotecas reutilizáveis (a trilha do EP001 é gerada por tools/build_score.py)
  docs/            guia de marca, bíblia de personagens, controle de qualidade
  tools/           pipeline: build_narration.py, build_score.py, render_stills.sh
  studio/          projeto Remotion (React + TypeScript)
    src/brand/       tokens, Logo, peças estáticas
    src/core/        câmera/parallax, partículas, luz, película, legendas, montador de episódio
    src/characters/  personagens oficiais (Kolbe) + figuras
    src/scenes/ep001 cenas independentes do episódio 1
    src/episodes/    configuração de cada episódio (mapa cena → componente)
  episodes/001-sao-maximiliano-kolbe/
    research/ script/ storyboard/ audio/ subtitles/ renders/ thumbnail/ instagram-post.md
```

## Pipeline de um episódio
1. **Pesquisa** → `episodes/<ep>/research/pesquisa.md`
2. **Roteiro** → `episodes/<ep>/script/narration.json`, uma linha por fala: `scene`, `text` (legenda), `say` (pronúncia), `hl` (palavras em ouro), `pause` (pausa dramática em s)
3. **Narração + tempos** (Kokoro, voz neural local):
   `python3 -I tools/build_narration.py <ep> --model-dir <pasta com kokoro-v1.0.onnx e voices-v1.0.bin>`
   Gera `audio/narration.wav` (masterizada), `audio/timings.json` (cenas e legendas palavra a palavra) e `subtitles/legendas.srt`.
   **Para usar ElevenLabs** (ou outra voz): salve uma fala por arquivo em `audio/lines/00.wav, 01.wav…` e rode com `--use-existing`. Os tempos se recalculam sozinhos.
4. **Trilha + efeitos + mixagem:** `python3 -I tools/build_score.py <ep>` gera `music.wav`, `sfx.wav`, `events.json` e `mix.wav` (-14 LUFS, com ducking).
5. Copie `mix.wav`, `timings.json` e `events.json` para `studio/public/<ep>/`.
6. **Cenas:** crie `studio/src/scenes/<ep>/` (reutilize `Camera`, `Layer`, `Particles`, `LightRays`, `Fog`, `FilmFinish`) e `studio/src/episodes/<ep>.ts`, e registre a composição em `Root.tsx`.
7. **Render:** `cd studio && npm run render:ep001` (ou `npx remotion render src/index.ts <ID> <saida.mp4>`). Prévia interativa: `npm run studio`.
8. **Peças estáticas:** `bash tools/render_stills.sh`

Mudar duração, narração, legenda, pausa ou destaque é só editar `narration.json` e repetir os passos 3 a 7: as cenas se reajustam aos novos tempos. Movimentos e transições ficam nos keyframes `Camera kf` de cada cena. A trilha se edita em `build_score.py`.

## Dependências
Node 22 · `cd studio && npm install` · Python 3 com `numpy soundfile kokoro-onnx` · FFmpeg · Chromium (configurado em `studio/remotion.config.ts`, renderizador GL `angle`).
