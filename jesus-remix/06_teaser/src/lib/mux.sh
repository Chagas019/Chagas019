#!/bin/sh
# Mux do áudio ORIGINAL (somente leitura) sob o vídeo mudo. Sem filtros além de fade de 0,05 s nas bordas
# de recortes (evita clique); a música inteira entra sem fade. AAC 320k, vídeo copiado (sem re-encode).
# Uso: mux.sh <video_mudo.mp4> <saida.mp4> <inicio_s> [fade=1|0]
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
WAV="$ROOT/09_audio/original/Corte_Jesus.wav"
V="$1"; OUT="$2"; SS="$3"; FADE="${4:-1}"
D=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$V")
AF="anull"; [ "$FADE" = "1" ] && AF="afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$D - 0.05" | bc -l):d=0.05"
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loglevel error -i "$V" -ss "$SS" -t "$D" -i "$WAV" -map 0:v:0 -map 1:a:0 -c:v copy -af "$AF" -c:a aac -b:a 320k -ar 44100 -movflags +faststart -shortest "$OUT"
echo "OK $OUT (áudio $SS s + $D s)"
