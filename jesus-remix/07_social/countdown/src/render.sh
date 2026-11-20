#!/bin/sh
# Countdown 5 s (n = 7, 5, 3, 1): trecho drop − 1,8 s → drop + 3,2 s; número trava no drop.
set -e; cd "$(dirname "$0")/../../.."
SCR=${SCRATCH:-/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad}/vid; mkdir -p $SCR
SS=$(python3 -c "import json;print(round(json.load(open('09_audio/analise/beatmap.json'))['impactos_chave']['drop']-1.8,3))")
for N in 7 5 3 1; do
  node 06_teaser/src/lib/render.js 07_social/countdown/src/countdown.html "n=$N" $SCR/countdown_$N.mp4 1080 1920
  06_teaser/src/lib/mux.sh $SCR/countdown_$N.mp4 07_social/countdown/render/countdown_$( [ $N = 1 ] && echo 1dia || echo ${N}dias )_1080x1920.mp4 $SS 1
done
