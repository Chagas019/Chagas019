# Controle de qualidade — EP001 (v1)

Arquivo: `episodes/001-sao-maximiliano-kolbe/renders/ep001-kolbe-v1.mp4`

| Verificação | Resultado |
|---|---|
| História historicamente correta | ✅ 16 fatos checados (`research/pesquisa.md`). Ajustes aplicados: sem barba em 1941, datas na tela (28/05/1941, 14/08/1941, 10/10/1982) e Jo 15,13 no texto litúrgico. |
| Datas coerentes com as fontes | ✅ Museu de Auschwitz, IPN, Vatican News, Britannica. |
| Personagem com a mesma aparência | ✅ um único componente (`Kolbe.tsx`) com duas variantes de figurino. Rosto, óculos e proporções idênticos. |
| Animação real (não slideshow) | ✅ câmera virtual com parallax de 4 a 7 camadas por cena, piscar, respiração, olhar e inclinação de cabeça, ciclo de caminhada, máquina girando, porta, rota no mapa, partículas, raios e neblina. |
| Narração presente | ✅ voz masculina neural pt-BR (Kokoro `pm_alex`), 21 falas com pausas dramáticas, masterizada (EQ, compressão, ambiência, −16 LUFS). |
| Voz sincronizada | ✅ cortes de cena e eventos visuais calculados a partir dos tempos reais da voz. |
| Legendas corretas | ✅ texto idêntico ao roteiro, palavra a palavra, destaques em ouro. SRT em `subtitles/`. ⚠️ O tempo por palavra é estimado por sílabas dentro de cada fala (o início e o fim de cada fala são exatos). |
| Música equilibrada | ✅ trilha original com ducking sob a voz. Arco suspense → tensão → silêncio → esperança (ré maior). |
| Áudio sem cortes | ✅ `silencedetect` (−50 dB, 0,8 s): nenhum silêncio. Pico −1,4 dBFS, sem clipping. |
| Vídeo 1080×1920 | ✅ H.264 High, 30 fps, 89,5 s, AAC 256 kbps 48 kHz, faststart. Loudness integrado de −14 LUFS (padrão de redes sociais). |

## Limitações conhecidas (honestas)
1. **ElevenLabs sem créditos.** A conta conectada tinha 5 dos 10.000 créditos, e a geração com a voz "Leonardo – Deep & Resonant" falhou por falta de cota. Usei o **Kokoro** (TTS neural open source, Apache-2.0), que é natural, mas menos expressivo. Para trocar: recarregue o ElevenLabs, gere cada fala de `narration.json` (o roteiro já tem as tags de emoção do v4) e salve em `audio/lines/NN.wav`. Depois rode `build_narration.py --use-existing`, `build_score.py` e o render.
2. **Ninguém ouviu o áudio antes da entrega.** Não consigo escutar. Verifiquei por medição (loudness, picos, silêncios), mas a pronúncia de "Kolbe" e "Auschwitz" pelo TTS precisa de escuta humana. Os ajustes de pronúncia ficam no campo `say`.
3. **O vídeo de referência não estava nesta conversa.** A direção de arte seguiu o briefing escrito (2D cinematográfico, parallax, luz dramática, tons terrosos e dourados). Envie o vídeo para alinhar a v2.
4. **Arte vetorial feita em código** (SVG + texturas), não gerada por IA: garante consistência total do personagem e animação real, sem "cara de IA". O storyboard traz prompts prontos caso queiram ilustrações rasterizadas pintadas à mão ou por gerador de imagem, que podem ser trocadas camada a camada.
5. **Trilha e efeitos sintetizados do zero** (`tools/build_score.py`). São 100% originais e livres de direitos, mas não chegam ao nível de uma orquestra gravada. Para a v2, dá para trocar por música licenciada em `music/` e alterar a entrada da mixagem.
