#!/usr/bin/env python3
"""Monta uma prancha (contact sheet) de stills de QA. Uso: python3 scripts/qa-sheet.py saida.png img1.png img2.png ..."""
import sys
from PIL import Image, ImageDraw
out, *imgs = sys.argv[1:]
ims = [Image.open(p).convert('RGB') for p in imgs]
w, h = ims[0].size
cols = 2 if w > h else 3
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), (40, 40, 40))
for i, (im, p) in enumerate(zip(ims, imgs)):
    x, y = (i % cols) * (w + 8), (i // cols) * (h + 8)
    sheet.paste(im.resize((w, h)), (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + 6), p.split('/')[-1], fill=(255, 255, 0))
sheet.save(out)
