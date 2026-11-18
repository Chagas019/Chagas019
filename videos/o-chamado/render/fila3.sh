#!/bin/bash
# re-render da cena 3 (objetos) com as páginas corrigidas
PY=/tmp/claude-0/-home-user-Chagas019/77461f37-a4f7-5ef9-a1ca-85471fded379/scratchpad/bl/bin/python
cd /home/user/Chagas019/videos/o-chamado/blender
$PY ochamado.py 3 obj 1 9999 /home/user/Chagas019/videos/o-chamado/render/cena3_obj > /home/user/Chagas019/videos/o-chamado/render/log_cena3_obj_v3.txt 2>&1
$PY ochamado.py 3 blend 1 1 /home/user/Chagas019/videos/o-chamado/blender/projeto > /dev/null 2>&1
echo FIM > /home/user/Chagas019/videos/o-chamado/render/c3v3.done
