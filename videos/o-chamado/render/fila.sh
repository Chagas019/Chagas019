#!/bin/bash
# fila de render — O CHAMADO
cd /home/user/Chagas019/videos/o-chamado/blender
PY=/tmp/claude-0/-home-user-Chagas019/77461f37-a4f7-5ef9-a1ca-85471fded379/scratchpad/bl/bin/python
for job in "1 obj" "1 bg" "2 obj" "2 bg" "3 obj" "3 bg" "5 obj" "5 bg" "4 obj"; do
  set -- $job
  echo "INICIO cena$1 $2 $(date +%T)"
  $PY ochamado.py $1 $2 1 9999 /home/user/Chagas019/videos/o-chamado/render/cena$1_$2 > /home/user/Chagas019/videos/o-chamado/render/log_cena$1_$2.txt 2>&1 || echo "FALHA cena$1 $2"
  echo "FIM cena$1 $2 $(date +%T) $(ls /home/user/Chagas019/videos/o-chamado/render/cena$1_$2 | wc -l) quadros"
done
for n in 1 2 3 4 5; do $PY ochamado.py $n blend 1 1 /home/user/Chagas019/videos/o-chamado/blender/projeto > /dev/null 2>&1; done
echo "FILA CONCLUIDA $(date +%T)"
