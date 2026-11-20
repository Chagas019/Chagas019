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
    lab = cv2.cvtColor(s, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, A, Bb = lab[..., 0], lab[..., 1], lab[..., 2]
    m = mask > 0
    # pele: tons quentes e não muito escuros
    skin = m & (A > 137) & (Bb > 139) & (L > np.quantile(L[m], q_dark))
    skin = clean(skin, 25, 6000, 5000).astype(bool)
    # sombras da pele (magenta): metade mais escura da pele
    ls = L[skin]
    mid = skin & (L < np.quantile(ls, q_mid))
    # mãos (abaixo do queixo): só a sombra mais funda, para não virar listras entre os dedos
    h = L.shape[0]; yy = np.mgrid[0:h, 0:L.shape[1]][0]
    hands = yy > h * .60
    mid = np.where(hands, False, mid)
    # linhas entre os dedos: vales locais de luminância (traço escuro de ilustração)
    Lr = cv2.cvtColor(cv2.bilateralFilter(rgb, 9, 40, 9), cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32)
    val = cv2.GaussianBlur(Lr, (0, 0), 3) - cv2.GaussianBlur(Lr, (0, 0), 16)
    lines = hands & skin & (val < -9)
    lines = clean(lines.astype(np.uint8), 9, 700, 100).astype(bool)
    linesF = lines
    # escuro: tudo que não é pele (cabelo, óculos, barba, camisa)
    dark = m & (~skin | (L < np.quantile(L[m], q_dark)) | linesF)
    # destaques (magenta) dentro do escuro: reflexos mais claros (óculos, cachos, camisa)
    ld = L[dark]
    hi = dark & (L > np.quantile(ld, .955))
    # cachos: no cabelo (topo), reflexos médios viram "vírgulas" magenta
    hair = (yy < h * .36) & dark
    curls = hair & (Lr - cv2.GaussianBlur(Lr, (0, 0), 10) > 5)
    curls = clean(curls.astype(np.uint8), 11, 900, 200).astype(bool)
    hi = hi | curls
    return dark.astype(np.uint8), mid.astype(np.uint8), hi.astype(np.uint8)

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

def main(out, q_dark=.36, q_mid=.28):
    rgb, alpha = load()
    base = bust_mask(alpha)
    dark, mid, light = tones(rgb, base, q_dark, q_mid)
    dark = clean(dark, 17, 1500, 3000) & base
    mid = clean(mid, 41, 6000, 4000) & base & (1 - dark)
    light = clean(light, 25, 2500, 600) & dark
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
    <path id="hi" fill="{MG}" fill-rule="evenodd" d="{paths['shine']}"/>
  </g>
</svg>'''
    open(out, 'w').write(svg)
    print('ok', out, {k: len(v) for k, v in paths.items()})

if __name__ == '__main__':
    sys.path.insert(0, __import__('os').path.dirname(__file__))
    main(sys.argv[1], *(float(x) for x in sys.argv[2:4]))
