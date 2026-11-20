#!/bin/sh
# Visualizer: energia por quadro do WAV original → JSON → render (1920×1080 e 1080×1920) → mux sem fade.
# Sem energia.json a cena usa envelope sintético (8 s) → saída marcada _preview.
set -e; cd "$(dirname "$0")/../.."
SCR=${SCRATCH:-/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad}/vid; mkdir -p $SCR
python3 08_visualizer/src/extrair_energia.py
for WH in 1920x1080 1080x1920; do W=${WH%x*}; H=${WH#*x}
  node 06_teaser/src/lib/render.js 08_visualizer/src/visualizer.html "" $SCR/visualizer_$WH.mp4 $W $H
  06_teaser/src/lib/mux.sh $SCR/visualizer_$WH.mp4 08_visualizer/render/visualizer_$WH.mp4 0 0
done
