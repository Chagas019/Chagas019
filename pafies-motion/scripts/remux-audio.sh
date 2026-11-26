#!/usr/bin/env bash
# QA: o AAC gerado pelo render sai atrasado 2048 amostras (~43 ms, ~1,3 frame) em relação ao vídeo
# (priming do encoder sem edit list). Este passo recodifica o áudio a partir de public/trilha.wav
# com edit list correto, copiando o vídeo sem recompressão. Uso: bash scripts/remux-audio.sh out/arquivo.mp4
set -euo pipefail
in="$1"; tmp="${in%.mp4}.remux.tmp.mp4"
ffmpeg -v error -y -i "$in" -i public/trilha.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart "$tmp"
mv "$tmp" "$in"
echo "áudio realinhado: $in"
