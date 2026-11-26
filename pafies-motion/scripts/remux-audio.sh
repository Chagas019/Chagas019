#!/usr/bin/env bash
# QA: o AAC gerado pelo render sai atrasado 2048 amostras (~43 ms, ~1,3 frame) em relação ao vídeo
# (priming do encoder sem edit list). Este passo recodifica o áudio a partir de public/trilha.wav
# com edit list correto, copiando o vídeo sem recompressão.
# Uso: bash scripts/remux-audio.sh out/arquivo.mp4 [public/trilha.wav]   (V2: public/trilha-v2.wav)
set -euo pipefail
in="$1"; wav="${2:-public/trilha.wav}"; tmp="${in%.mp4}.remux.tmp.mp4"
ffmpeg -v error -y -i "$in" -i "$wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart "$tmp"
mv "$tmp" "$in"
echo "áudio realinhado: $in"
