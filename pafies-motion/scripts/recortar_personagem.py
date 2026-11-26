"""Recorta o personagem do cliente (GIF de referência) em PNGs transparentes.

O GIF original alterna o fundo entre verde chapado e vermelho com pinceladas.
Usamos só os 5 quadros de fundo verde, que formam o ciclo completo de corrida
e permitem um recorte limpo por dominância de verde (o personagem não tem verde).

Uso: python3 scripts/recortar_personagem.py docs/referencias/personagem-cliente.gif public/corredor
Saída: public/corredor/f00.png ... f04.png (1600x1200, upscale Lanczos 2x)
"""
import os, sys
import numpy as np
from PIL import Image, ImageSequence, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith(".png"):
        os.remove(os.path.join(out, f))
k = 0
for fr in ImageSequence.Iterator(Image.open(src)):
    a = np.asarray(fr.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if g.mean() < r.mean():  # quadro de fundo vermelho: descartado
        continue
    green = g - np.maximum(r, b)
    alpha = np.clip((70 - green) * (255 / 40), 0, 255).astype(np.uint8)
    g2 = np.where(green > 0, np.maximum(r, b), g)  # despill
    rgb = np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")
    al = img.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    img.putalpha(al)
    img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    img.save(os.path.join(out, f"f{k:02d}.png"))
    k += 1
print(f"{k} quadros salvos em {out}")
