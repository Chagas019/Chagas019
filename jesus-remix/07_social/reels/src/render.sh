#!/bin/sh
# Reels 1080×1920: trecho break → fim (início = CUES.inicio = impactos_chave.break).
set -e; cd "$(dirname "$0")/../../.."
SCR=${SCRATCH:-/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad}/vid; mkdir -p $SCR
SS=$(python3 -c "import json;print(json.load(open('09_audio/analise/beatmap.json'))['impactos_chave']['break'])")
node 06_teaser/src/lib/render.js 07_social/reels/src/reels.html "" $SCR/reels_1080x1920.mp4 1080 1920
06_teaser/src/lib/mux.sh $SCR/reels_1080x1920.mp4 07_social/reels/render/reels_1080x1920.mp4 $SS 1
