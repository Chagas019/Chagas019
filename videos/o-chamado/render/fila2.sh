#!/bin/bash
until grep -q "FILA CONCLUIDA" /home/user/Chagas019/videos/o-chamado/render/fila_log.txt; do sleep 20; done
cd /home/user/Chagas019/videos/o-chamado/blender
for L in obj bg; do rm -rf /home/user/Chagas019/videos/o-chamado/render/cena3_$L; echo "INICIO cena3 $L (v2) $(date +%T)"; /tmp/claude-0/-home-user-Chagas019/77461f37-a4f7-5ef9-a1ca-85471fded379/scratchpad/bl/bin/python ochamado.py 3 $L 1 9999 /home/user/Chagas019/videos/o-chamado/render/cena3_$L > /home/user/Chagas019/videos/o-chamado/render/log_cena3_${L}_v2.txt 2>&1; echo "FIM cena3 $L (v2) $(date +%T) $(ls /home/user/Chagas019/videos/o-chamado/render/cena3_$L | wc -l)"; done
/tmp/claude-0/-home-user-Chagas019/77461f37-a4f7-5ef9-a1ca-85471fded379/scratchpad/bl/bin/python ochamado.py 3 blend 1 1 /home/user/Chagas019/videos/o-chamado/blender/projeto > /dev/null 2>&1
echo "FILA2 CONCLUIDA"
