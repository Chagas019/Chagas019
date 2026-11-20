"""Ilustração flat do André (3 tons) a partir do recorte da foto → SVG vetorial editável.

Uso: python3 vetorizar.py <saida.svg> [preview.png]
Pipeline: recorte do busto → suavização forte (bilateral + mean-shift) → posterização em 3 tons por
luminância (azul-profundo / magenta / creme) → limpeza morfológica (remove ruído, fecha buracos,
arredonda bordas) → potrace (potracer) → SVG com grupos nomeados:
  #aura (chamas, 4 variações p/ boiling — desenhadas à mão em aura.py), #base (silhueta),
  #mid (sombras magenta), #dark (cabelo/óculos/barba/camisa/linhas), #shine (brilhos creme).
"""
import sys, numpy as np, cv2, potrace
from PIL import Image

SRC = '/home/user/Chagas019/jesus-remix/03_assets/foto/artista_recorte.png'
AZ, MG, CR = '#0A4F96', '#F833F8', '#F9F9F9'
CROP = (130, 0, 730, 796)          # busto: cabeça + mãos
UP = 2                              # trabalha em 2× para curvas mais lisas

def load():
    im = np.array(Image.open(SRC).convert('RGBA'))
    x0, y0, x1, y1 = CROP
    im = im[y0:y1, x0:x1]
    im = cv2.resize(im, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    return im[..., :3].copy(), im[..., 3]

def bust_mask(alpha):
    h, w = alpha.shape
    a = (alpha > 140).astype(np.uint8)
    # corta os ombros num arco suave (formato de busto/mascote)
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy, rx, ry = w * .5, h * .58, w * .47, h * .62
    ell = (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) <= 1
    a = a & ell.astype(np.uint8)
    return clean(a, 41, 4000, 4000)

def clean(m, blur, min_area, hole_area):
    m = (m > 0).astype(np.uint8)
    # remove ilhas pequenas e fecha buracos pequenos
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= min_area: keep[lab == i] = 1
    inv = 1 - keep
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < hole_area: keep[lab == i] = 1
    # arredonda: blur + limiar
    k = blur | 1
    f = cv2.GaussianBlur(keep.astype(np.float32), (k, k), 0)
    return (f > .5).astype(np.uint8)

def tones(rgb, mask, q_dark, q_mid):
    s = rgb.copy()
    for _ in range(3): s = cv2.bilateralFilter(s, 13, 50, 13)
    s = cv2.pyrMeanShiftFiltering(s, 14, 26)
    s = cv2.medianBlur(s, 11)
    L = cv2.cvtColor(s, cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32)
    vals = L[mask > 0]
    t1, t2 = np.quantile(vals, q_dark), np.quantile(vals, q_mid)
    dark = (L < t1) & (mask > 0)
    mid = (L < t2) & (mask > 0)
    light = (L > np.quantile(vals, .985)) & (mask > 0)
    return dark.astype(np.uint8), mid.astype(np.uint8), light.astype(np.uint8)

def trace(m, turd=80, alphamax=1.25, tol=.6):
    bm = potrace.Bitmap(~(m.astype(bool)))   # potracer traça os pixels "pretos" (False)
    pl = bm.trace(turdsize=turd, alphamax=alphamax, opticurve=True, opttolerance=tol)
    S = 1 / UP
    f = lambda p: f'{p.x * S:.1f} {p.y * S:.1f}'
    d = []
    for c in pl:
        d.append('M' + f(c.start_point))
        for seg in c:
            if seg.is_corner: d.append('L' + f(seg.c) + 'L' + f(seg.end_point))
            else: d.append('C' + f(seg.c1) + ' ' + f(seg.c2) + ' ' + f(seg.end_point))
        d.append('Z')
    return ''.join(d)

def main(out, prev=None, q_dark=.44, q_mid=.66):
    rgb, alpha = load()
    base = bust_mask(alpha)
    dark, mid, light = tones(rgb, base, q_dark, q_mid)
    dark = clean(dark, 15, 900, 700) & base
    mid = clean(mid | dark, 17, 1200, 900) & base
    light = clean(light, 9, 250, 100) & base & (1 - mid)
    W, H = (CROP[2] - CROP[0]), (CROP[3] - CROP[1])
    paths = {k: trace(v) for k, v in dict(base=base, mid=mid, dark=dark, shine=light).items()}
    import aura
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -300 {W + 240} {H + 300}" width="{W + 240}" height="{H + 300}">
  <!-- JESUS Remix · André Castro — ilustração flat (3 tons) vetorizada do recorte oficial (potrace) + aura desenhada.
       Grupos: aura (4 variações de chama para boiling), base, mid (sombras), dark (cabelo/óculos/barba/camisa), shine. -->
  <g id="aura">{aura.svg_groups(W, H)}</g>
  <g id="ilustra">
    <path id="base" fill="{CR}" stroke="{AZ}" stroke-width="10" stroke-linejoin="round" fill-rule="evenodd" d="{paths['base']}"/>
    <path id="mid" fill="{MG}" fill-rule="evenodd" d="{paths['mid']}"/>
    <path id="dark" fill="{AZ}" fill-rule="evenodd" d="{paths['dark']}"/>
    <path id="shine" fill="{CR}" fill-rule="evenodd" d="{paths['shine']}"/>
  </g>
</svg>'''
    open(out, 'w').write(svg)
    print('ok', out, {k: len(v) for k, v in paths.items()})

if __name__ == '__main__':
    sys.path.insert(0, __import__('os').path.dirname(__file__))
    main(sys.argv[1], *(float(x) for x in sys.argv[2:4]))
