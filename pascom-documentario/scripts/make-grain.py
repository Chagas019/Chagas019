#!/usr/bin/env python3
"""Gera 4 texturas de granulação de filme (PNG 512x512, ruído gaussiano levemente desfocado)."""
import os
import numpy as np
from PIL import Image, ImageFilter

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets", "images")
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)
for i in range(4):
    n = np.clip(128 + rng.normal(0, 46, (512, 512)), 0, 255).astype(np.uint8)
    img = Image.fromarray(n, "L").filter(ImageFilter.GaussianBlur(0.6))
    img.save(os.path.join(out, f"grain-{i}.png"), optimize=True)
print("ok")
