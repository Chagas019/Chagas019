#!/bin/sh
# Teaser (música inteira, 0 → 29,54 s) nos 3 formatos: render mudo → mux do áudio original sem fade.
set -e; cd "$(dirname "$0")/../.."
SCR=${SCRATCH:-/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad}/vid; mkdir -p $SCR
for WH in 1920x1080 1080x1920 1080x1080; do W=${WH%x*}; H=${WH#*x}
  node 06_teaser/src/lib/render.js 06_teaser/src/teaser.html "" $SCR/teaser_$WH.mp4 $W $H
  06_teaser/src/lib/mux.sh $SCR/teaser_$WH.mp4 06_teaser/render/teaser_$WH.mp4 0 0
done
