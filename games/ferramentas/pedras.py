"""Pedras flutuantes em volta da janela do portal (camada transparente 1200×1200).
As posições seguem a referência: a janela ocupa x 82–1118 e y 265–935.
Uso: python3 pedras.py ../portal/img/pedras.webp"""
import math
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 2  # desenha em 2400 e reduz para suavizar
rng = np.random.default_rng(11)
camada = Image.new("RGBA", (1200 * S, 1200 * S), (0, 0, 0, 0))

# (x, y, tamanho, desfoque) na escala 1200
pedras = [
    # esquerda
    (62, 556, 7, 0), (8, 664, 6, 1.5), (44, 662, 9, 0), (58, 690, 7, 0), (36, 692, 10, 0), (57, 708, 8, 0),
    (20, 700, 5, 0), (40, 785, 8, 0), (73, 650, 4, 0), (30, 920, 7, 0), (66, 926, 6, 0), (271, 955, 8, 0),
    (50, 735, 3, 0), (14, 748, 4, 1),
    # direita
    (1150, 424, 9, 0), (958, 352, 5, 0), (1126, 516, 11, 0), (1172, 525, 8, 0), (1150, 566, 7, 0),
    (1171, 586, 6, 0), (1128, 650, 7, 0), (1140, 700, 9, 0), (1162, 718, 12, 0), (1182, 704, 8, 0),
    (1131, 738, 10, 0), (1146, 760, 6, 0), (1172, 690, 5, 0), (1192, 745, 7, 0), (1196, 680, 4, 0),
    (1186, 630, 5, 0), (1120, 610, 4, 0), (1158, 742, 4, 0), (1120, 760, 5, 0), (1176, 770, 4, 0),
    (1104, 780, 3, 0), (1196, 560, 6, 1.5), (1110, 470, 3, 0),
]

for x, y, r, blur in pedras:
    r *= S * rng.uniform(0.9, 1.25)
    n = rng.integers(7, 11)
    rot = rng.uniform(0, math.tau)
    pts = []
    for i in range(n):
        a = rot + i / n * math.tau
        rr = r * rng.uniform(0.62, 1.15)
        pts.append((x * S + math.cos(a) * rr, y * S + math.sin(a) * rr * rng.uniform(0.7, 1.0)))
    tam = int(r * 3)
    pedra = Image.new("RGBA", camada.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(pedra)
    d.polygon(pts, fill=(22, 22, 23, 255))
    # face iluminada (luz vindo de cima à esquerda)
    luz = [(px - r * 0.18 + (px - x * S) * -0.25, py - r * 0.2 + (py - y * S) * -0.25) for px, py in pts]
    d.polygon(luz, fill=(78, 78, 80, 255))
    face = [(x * S + (px - x * S) * 0.55 - r * 0.25, y * S + (py - y * S) * 0.55 - r * 0.28) for px, py in pts[: n // 2 + 1]]
    d.polygon(face, fill=(118, 118, 120, 255))
    mascara = Image.new("L", camada.size, 0)
    ImageDraw.Draw(mascara).polygon(pts, fill=255)
    pedra.putalpha(mascara)
    pedra = pedra.filter(ImageFilter.GaussianBlur(S * (0.6 + blur)))
    camada.alpha_composite(pedra)

camada = camada.resize((1200, 1200), Image.LANCZOS)
camada.save(sys.argv[1], quality=82, method=6)
print("ok")
