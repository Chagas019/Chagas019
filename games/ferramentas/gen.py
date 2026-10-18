"""Gera as imagens de luz em movimento da landing (hero, cartão do hero e cards)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1]
rng = np.random.default_rng(7)
ORANGE = np.array([1.0, 0.2, 0.02])
HOT = np.array([1.0, 0.42, 0.16])
WHITE = np.array([1.0, 0.97, 0.94])


def streaks(w, h, n, y_range, x_range, colors, thick=(1, 6), inten=(0.3, 1.2), length=(0.3, 0.9), glow=3.0):
    """Faixas de luz horizontais com afinamento nas pontas e brilho suave."""
    img = np.zeros((h, w, 3))
    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    for _ in range(n):
        yc = rng.uniform(*y_range) * h
        L = rng.uniform(*length) * w
        x0 = rng.uniform(x_range[0] * w, x_range[1] * w - L * 0.3)
        sig = rng.uniform(*thick)
        a = rng.uniform(*inten)
        col = colors[rng.integers(len(colors))]
        t = np.clip((xs - x0) / L, 0, 1)
        # mais forte perto da ponta direita, como rastro
        along = np.where((xs >= x0) & (xs <= x0 + L), np.sin(np.pi * t) ** 1.5 * (0.35 + 0.65 * t), 0)
        core = np.exp(-((ys - yc) ** 2) / (2 * sig ** 2))
        halo = np.exp(-((ys - yc) ** 2) / (2 * (sig * glow) ** 2)) * 0.25
        img += (a * along * (core + halo))[..., None] * col
    return img


def tonemap(x, k=1.0):
    """Comprime o brilho sem lavar a cor: o laranja continua laranja quando fica forte."""
    m = x.max(axis=2, keepdims=True)
    m2 = 1 - np.exp(-m * k)
    return x * np.where(m > 1e-6, m2 / np.maximum(m, 1e-6), 0)


def rot(arr, deg, out=None):
    """Gira e recorta o centro no tamanho final (gere maior que o final para não sobrar canto)."""
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
    im = im.rotate(deg, resample=Image.BICUBIC, expand=False)
    if out:
        W0, H0 = im.size
        im = im.crop(((W0 - out[0]) // 2, (H0 - out[1]) // 2, (W0 + out[0]) // 2, (H0 + out[1]) // 2))
    return np.asarray(im).astype(float) / 255


def blur(arr, r):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im).astype(float) / 255


def save_rgb(arr, name, q=82):
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(f"{OUT}/{name}", quality=q, method=6)


def save_rgba(rgb_over_black, alpha_extra, name, q=84):
    """Converte luz sobre preto em RGBA (alfa = brilho), somando o alfa do objeto."""
    lum = rgb_over_black.max(axis=2)
    alpha = np.clip(np.maximum(lum, alpha_extra), 0, 1)
    rgb = np.where(alpha[..., None] > 1e-3, rgb_over_black / np.maximum(alpha[..., None], 1e-3), 0)
    out = np.dstack([np.clip(rgb, 0, 1), alpha])
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(f"{OUT}/{name}", quality=q, method=6)


# ---------- hero: objeto + rastros ----------
W, H = 1500, 1150
obj = Image.open(sys.argv[2]).convert("RGBA")
obj = obj.crop(obj.getbbox())
scale = 760 / obj.height
obj = obj.resize((int(obj.width * scale), 760), Image.LANCZOS)
ox, oy = (W - obj.width) // 2 + 40, (H - obj.height) // 2
o = np.asarray(obj).astype(float) / 255
obj_rgb = np.zeros((H, W, 3)); obj_a = np.zeros((H, W))
obj_rgb[oy:oy + obj.height, ox:ox + obj.width] = o[..., :3] * o[..., 3:4]
obj_a[oy:oy + obj.height, ox:ox + obj.width] = o[..., 3]

BW, BH = int(W * 1.4), int(H * 1.4)
GRAY = np.array([0.78, 0.78, 0.8])
# fumaça branca/cinza na faixa de cima, laranja forte no meio
white = streaks(BW, BH, 70, (0.33, 0.5), (0.1, 0.75), [WHITE, GRAY, WHITE], thick=(0.8, 6), inten=(0.1, 0.75), length=(0.25, 0.6), glow=5)
white += streaks(BW, BH, 8, (0.36, 0.48), (0.15, 0.7), [GRAY], thick=(14, 30), inten=(0.08, 0.2), length=(0.3, 0.6), glow=2)
orange = streaks(BW, BH, 60, (0.47, 0.6), (0.12, 0.85), [ORANGE, ORANGE, ORANGE, HOT], thick=(0.8, 6), inten=(0.25, 1.2), length=(0.2, 0.55), glow=4)
orange += streaks(BW, BH, 10, (0.5, 0.57), (0.3, 0.75), [ORANGE], thick=(10, 26), inten=(0.35, 0.8), length=(0.25, 0.5), glow=2)
orange += streaks(BW, BH, 12, (0.6, 0.66), (0.1, 0.6), [WHITE, GRAY], thick=(0.8, 3), inten=(0.2, 0.6), length=(0.2, 0.45), glow=4)
back = rot(tonemap(white, 1.2) + tonemap(orange, 1.6), 22, (W, H))
core = streaks(BW, BH, 26, (0.49, 0.57), (0.3, 0.62), [ORANGE, ORANGE, HOT, np.array([1.0, 0.75, 0.55])], thick=(1, 6), inten=(0.5, 1.4), length=(0.15, 0.35), glow=3)
mid = rot(tonemap(core, 1.6), 22, (W, H))
# fade nas bordas esquerda/direita
xs = np.linspace(0, 1, W)[None, :, None]
edge = np.clip(np.minimum(xs / 0.2, (1 - xs) / 0.38), 0, 1) ** 1.5
back *= edge; mid *= edge
glow = blur(mid, 22) * 0.9
comp = back * (1 - obj_a[..., None]) + obj_rgb
# luz laranja atravessa o meio do objeto (tela)
front = np.clip(mid + glow, 0, 1)
comp = 1 - (1 - comp) * (1 - front * np.where(obj_a[..., None] > 0, 0.9, 1.0))
save_rgba(comp, obj_a, "hero-peca.webp")

# ---------- cartão do hero (luz no canto inferior direito) ----------
w, h = 880, 628
c = streaks(int(w * 1.4), int(h * 1.4), 46, (0.5, 0.82), (0.35, 1.0), [ORANGE, ORANGE, HOT, WHITE, ORANGE], thick=(0.8, 5), inten=(0.25, 1.2), length=(0.3, 0.7))
c = rot(tonemap(c, 1.5), 14, (w, h))
c = c * np.clip((np.linspace(0, 1, w)[None, :, None] - 0.25) / 0.5, 0, 1)
save_rgb(c + 14 / 255, "cartao-luz.webp")

# ---------- card "Dicas": faixas laranjas horizontais ----------
w, h = 880, 560
d = streaks(int(w * 1.2), int(h * 1.2), 80, (0.22, 0.64), (-0.2, 1.0), [ORANGE, ORANGE, ORANGE, HOT], thick=(1, 10), inten=(0.3, 1.2), length=(0.6, 1.3), glow=3)
d += streaks(int(w * 1.2), int(h * 1.2), 10, (0.3, 0.58), (-0.2, 1.0), [ORANGE], thick=(16, 34), inten=(0.15, 0.4), length=(0.8, 1.3), glow=1.6)
d += streaks(int(w * 1.2), int(h * 1.2), 12, (0.28, 0.6), (-0.2, 1.0), [WHITE], thick=(0.6, 1.6), inten=(0.2, 0.6), length=(0.5, 1.1), glow=3)
d = rot(tonemap(d, 1.5), -3, (w, h))
save_rgb(d + 5 / 255, "card-dicas.webp")

# ---------- card "Reviews": rastro cinza/branco com laranja ----------
r = streaks(int(w * 1.3), int(h * 1.3), 60, (0.15, 0.75), (-0.1, 1.05), [WHITE, WHITE, np.array([0.55, 0.55, 0.57]), ORANGE, HOT], thick=(0.8, 6), inten=(0.2, 1.0), length=(0.35, 0.9), glow=4)
r = rot(tonemap(r, 1.2), 8, (w, h))
r = blur(r, 1.2)
save_rgb(r + 6 / 255, "card-reviews.webp")
print("ok")
