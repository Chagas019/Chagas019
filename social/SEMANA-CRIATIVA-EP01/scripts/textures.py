"""Gera as texturas fotográficas do sistema visual (céu, grama, papel e grão).

Uso: python3 scripts/textures.py   (requer numpy + Pillow)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")
W, H = 1080, 1350
rng = np.random.default_rng(7)


def fbm(w, h, octaves=6, base=4, persistence=0.55, seed=0):
    r = np.random.default_rng(seed)
    acc = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        small = r.random((max(2, int(n * h / w)), n))
        layer = np.array(Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255.0
        acc += layer * amp
        total += amp
        amp *= persistence
    return acc / total


def grain(h, w, strength):
    return rng.normal(0, strength, (h, w, 1))


def save(arr, name, q=92):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.save(os.path.join(OUT, name), quality=q)


def sky(w=W, h=H, seed=1):
    y = np.linspace(0, 1, h)[:, None]
    top = np.array([74, 128, 196])
    bottom = np.array([150, 190, 228])
    base = top + (bottom - top) * y[..., None]
    base = np.repeat(base, w, axis=1)
    n = fbm(w, h, octaves=7, base=3, persistence=0.58, seed=seed)
    # nuvens: limiar suave + mais densas no centro-baixo
    bias = 0.10 * np.exp(-((y - 0.62) ** 2) / 0.08)
    c = np.clip((n + bias - 0.50) / 0.20, 0, 1)
    c = c ** 1.3
    shade = fbm(w, h, octaves=5, base=6, seed=seed + 5)
    cloud = np.array([246, 244, 238]) - (shade[..., None] - 0.5) * 70
    img = base * (1 - c[..., None]) + cloud * c[..., None]
    img += grain(h, w, 16)
    return img


def grass(w=W, h=H, seed=3):
    # fibras verticais: ruído esticado na vertical
    r = np.random.default_rng(seed)
    blades = r.random((h // 22, w // 2))
    blades = np.array(Image.fromarray((blades * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255.0
    fine = r.random((h // 6, w))
    fine = np.array(Image.fromarray((fine * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) / 255.0
    patches = fbm(w, h, octaves=5, base=3, seed=seed + 1)
    t = 0.45 * blades + 0.25 * fine + 0.30 * patches
    dark = np.array([24, 38, 20])
    mid = np.array([58, 86, 40])
    light = np.array([128, 148, 84])
    t3 = t[..., None]
    img = np.where(t3 < 0.5, dark + (mid - dark) * (t3 / 0.5), mid + (light - mid) * ((t3 - 0.5) / 0.5))
    img += grain(h, w, 14)
    return img


def paper(w=W, h=H, seed=9):
    base = np.array([243, 238, 227], dtype=float)
    n = fbm(w, h, octaves=6, base=8, seed=seed)
    img = np.ones((h, w, 3)) * base + (n[..., None] - 0.5) * 18
    img += grain(h, w, 7)
    return img


def grain_overlay(w=W, h=H):
    g = rng.normal(128, 46, (h, w)).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(g, "L").convert("RGBA")
    a = np.full((h, w), 255, np.uint8)
    img.putalpha(Image.fromarray(a))
    img.save(os.path.join(OUT, "grain.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    save(sky(), "sky.jpg")
    save(sky(1080, 1350, seed=11), "sky-2.jpg")
    save(grass(), "grass.jpg")
    save(paper(), "paper.jpg")
    grain_overlay()
    print("ok")
