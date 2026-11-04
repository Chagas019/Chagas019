#!/usr/bin/env python3
"""Prepara a imagem ORIGINAL do Pafieis para animação (sem redesenhar nada).

Separa a cabeça (com gorro e fones) do resto da imagem e reconstrói o fundo azul
atrás dela, para que a cabeça possa se mover. Também mede olhos e boca.

Uso: python3 tools/puppet.py public/ref/pafieis-original.jpg
Saída: public/puppet/plate.png, public/puppet/head.png, src/character/puppet.json
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else 'public/ref/pafieis-original.jpg'
OUT_W, OUT_H = 1080, 1920
# pontos medidos na imagem original (676 x 1200)
HEAD_TOP, CUT_Y, KEEP_Y = 470, 806, 786
EYES = [(284, 714, 54, 36, -4), (387, 710, 54, 36, 3)]  # cx, cy, largura, altura, inclinação
MOUTH = (338, 772, 44)
PIVOT = (338, 812)
LID_COLORS = [('#e3926f', '#c4715a'), ('#f8b193', '#e5967b')]  # pele das pálpebras (topo, borda)

im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(float) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx, mn = a.max(2), a.min(2)
s = (mx - mn) / (mx + 1e-6)
d = mx - mn + 1e-6
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
bg = (hue > 185) & (hue < 240) & (s > 0.35) & (mx > 0.3)
bg_head = bg & (mx > 0.62)  # perto da cabeça o fundo é claro; azul escuro = concha do fone
yy, xx = np.mgrid[0:H, 0:W]
zone = (yy >= HEAD_TOP) & (yy < CUT_Y) & (xx > 150) & (xx < 530)
head = (~bg_head) & zone

# limpa ruído: maior componente conectado
from collections import deque
lab = np.zeros(head.shape, np.int32); best, bestn, cur = 0, 0, 0
for y0 in range(HEAD_TOP, CUT_Y):
    for x0 in range(150, 530):
        if head[y0, x0] and not lab[y0, x0]:
            cur += 1; q = deque([(y0, x0)]); lab[y0, x0] = cur; n = 0
            while q:
                y, x = q.popleft(); n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and head[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur; q.append((ny, nx))
            if n > bestn: best, bestn = cur, n
head = lab == best
# preenche buracos internos (fundo visto entre o arco do fone e o gorro) para moverem junto
outside = np.zeros_like(head); q = deque()
for x in range(150, 530):
    for y in (HEAD_TOP, CUT_Y - 1):
        if not head[y, x]: outside[y, x] = True; q.append((y, x))
for y in range(HEAD_TOP, CUT_Y):
    for x in (150, 529):
        if not head[y, x]: outside[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if HEAD_TOP <= ny < CUT_Y and 150 <= nx < 530 and not head[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True; q.append((ny, nx))
head = head | (zone & ~outside & (xx > 150) & (xx < 530))

# alfa da cabeça com borda suave e transição suave no pescoço
alpha = Image.fromarray((head * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
al = np.asarray(alpha).astype(float)
fade = np.clip((CUT_Y - yy) / 10.0, 0, 1)
al = al * np.where(yy > CUT_Y - 10, fade, 1)
head_rgba = np.dstack([np.asarray(im), al.astype(np.uint8)])

# placa: imagem original com o fundo reconstruído atrás da cabeça
plate = a.copy()
fillm = np.asarray(Image.fromarray((head * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
neck = (xx > 296) & (xx < 380) & (yy > 790)
fillm &= (yy < CUT_Y + 2) & ~neck
fillm &= ~((xx >= 312) & (xx < 366) & (yy >= 752))
for y in range(HEAD_TOP - 6, CUT_Y + 2):
    xs = np.where(fillm[y])[0]
    if len(xs) == 0: continue
    # trechos contínuos (o pescoço divide a linha em dois)
    runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
    for run in runs:
        x0, x1 = run.min(), run.max()
        cl = np.median(plate[y, max(0, x0 - 16):max(1, x0 - 6)], 0)
        cr = np.median(plate[y, min(W - 2, x1 + 6):min(W - 1, x1 + 16)], 0)
        if x1 >= 376 and x0 > 296 and y > 790: cl = cr
        t = np.linspace(0, 1, x1 - x0 + 1)[:, None]
        plate[y, x0:x1 + 1] = cl * (1 - t) + cr * t
# estende a pele do pescoço para cima (aparece se a cabeça subir um pouco)
for y in range(752, 801):
    plate[y, 312:366] = plate[801, 312:366]
plate_img = Image.fromarray((plate * 255).astype(np.uint8))
blur = plate_img.filter(ImageFilter.GaussianBlur(14))
m = Image.fromarray((fillm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(4))
plate_img = Image.composite(blur, plate_img, m)

# cores de pele para as pálpebras
def px(x, y):
    return '#%02x%02x%02x' % tuple(int(v) for v in np.asarray(im)[y, x])

k = OUT_W / W
up = lambda img: img.resize((OUT_W, OUT_H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.6, 70, 2))
import os
os.makedirs('public/puppet', exist_ok=True)
up(plate_img).save('public/puppet/plate.png')
up(Image.fromarray(head_rgba, 'RGBA')).save('public/puppet/head.png')
rig = {
    'scale': k,
    'pivot': [PIVOT[0] * k, PIVOT[1] * k],
    'eyes': [{'cx': e[0] * k, 'cy': e[1] * k, 'w': e[2] * k, 'h': e[3] * k, 'tilt': e[4],
              'lid': c[0], 'lid2': c[1]} for e, c in zip(EYES, LID_COLORS)],
    'mouth': {'cx': MOUTH[0] * k, 'cy': MOUTH[1] * k, 'w': MOUTH[2] * k, 'skin': px(MOUTH[0], MOUTH[1] + 9)},
}
json.dump(rig, open('src/character/puppet.json', 'w'), indent=1)
print(json.dumps(rig, indent=1))
