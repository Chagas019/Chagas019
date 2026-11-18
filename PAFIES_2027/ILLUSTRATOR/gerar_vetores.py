"""PAFIES 2027 - geracao dos vetores (SVG editavel, camadas nomeadas -> abre no Illustrator).
Executar: python3 gerar_vetores.py  (gera os .svg nesta pasta)
"""
import math, os
OUT = os.path.dirname(os.path.abspath(__file__))
Y, YD, YL = "#FFD21F", "#C99400", "#FFF07A"   # amarelo / extrusao / brilho
B, BD, BL = "#0B3196", "#061A5C", "#2F63E0"   # azul royal
K, W, CREAM = "#0A0A0A", "#FFFFFF", "#FFF6EC"


def svg(name, w, h, body, defs=""):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
         f'<defs>{defs}</defs>{body}</svg>')
    open(os.path.join(OUT, name), "w").write(s)


def layer(id_, inner):
    return f'<g id="{id_}">{inner}</g>'


def pts(p, dx=0, dy=0):
    return " ".join(f"{x+dx:.1f},{y+dy:.1f}" for x, y in p)


def extrude(poly, dx, dy, side, front, stroke=K, sw=8, hi=None):
    """Raio/forma com extrusao 3D: faces laterais + face frontal."""
    sides = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        q = [a, b, (b[0] + dx, b[1] + dy), (a[0] + dx, a[1] + dy)]
        sides.append(f'<polygon points="{pts(q)}" fill="{side}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>')
    back = f'<polygon points="{pts(poly, dx, dy)}" fill="{side}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
    front_s = f'<polygon points="{pts(poly)}" fill="{front}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
    out = layer("Extrusao", back + "".join(sides)) + layer("Face", front_s)
    if hi:
        out += layer("Brilho", f'<polygon points="{pts(hi)}" fill="{YL}" opacity=".85"/>')
    return out


# ---------- RAIOS 3D ----------
bolt1 = [(250, 20), (90, 300), (205, 300), (120, 560), (360, 230), (240, 230), (330, 20)]
hi1 = [(262, 45), (130, 280), (160, 280), (285, 45)]
svg("raio_3d_A.svg", 460, 620, extrude(bolt1, 34, 26, YD, Y, hi=hi1))
bolt2 = [(40, 120), (300, 40), (270, 120), (520, 60), (230, 210), (260, 140), (20, 230)]
svg("raio_3d_B.svg", 580, 290, extrude(bolt2, 26, 30, YD, Y))
bolt3 = [(150, 10), (40, 200), (120, 200), (60, 380), (230, 150), (150, 150), (215, 10)]
svg("raio_3d_C.svg", 300, 420, extrude(bolt3, 22, 18, YD, Y))
# raio "flat" estilo do megafone (sem contorno)
flat = [(0, 70), (260, 0), (190, 70), (330, 60), (40, 150), (120, 95)]
svg("raio_flat_megafone.svg", 340, 160, layer("Raio", f'<polygon points="{pts(flat)}" fill="{Y}"/>'))

# ---------- STARBURST / RAIOS DE LUZ ----------
rays = ""
for i in range(24):
    a0 = i / 24 * 2 * math.pi
    a1 = a0 + math.pi / 24
    rays += f'<polygon points="500,500 {500+800*math.cos(a0):.0f},{500+800*math.sin(a0):.0f} {500+800*math.cos(a1):.0f},{500+800*math.sin(a1):.0f}" fill="{Y}"/>'
svg("burst_raios_luz.svg", 1000, 1000, layer("Raios", rays))

# ---------- HALFTONE ----------
dots = ""
for r in range(0, 40):
    for c in range(0, 40):
        x, y = c * 25 + (12 if r % 2 else 0), r * 25
        rad = 1 + 10 * (1 - y / 1000)
        dots += f'<circle cx="{x}" cy="{y}" r="{rad:.1f}"/>'
svg("textura_halftone.svg", 1000, 1000, layer("Halftone", f'<g fill="{K}">{dots}</g>'))

# ---------- ADESIVOS DE ALIMENTOS (sticker recortado + volume por gradiente) ----------
def sticker(name, w, h, shape_d, art, grads=""):
    shadow = f'<path d="{shape_d}" fill="#000" opacity=".28" transform="translate(10,14)"/>'
    border = f'<path d="{shape_d}" fill="{CREAM}"/>'
    svg(name, w, h, layer("Sombra", shadow) + layer("Borda_Adesivo", border) + layer("Arte", art), grads)


def rg(id_, c1, c2, cx="35%", cy="30%"):
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="75%"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>'


def lg(id_, c1, c2, x2="1", y2="0"):
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'

# Maca
sticker("alimento_maca.svg", 420, 440,
        "M210 70 C120 20 20 90 30 210 C40 340 130 430 210 400 C290 430 380 340 390 210 C400 90 300 20 210 70Z",
        f'<path d="M210 95 C135 55 55 110 62 210 C70 320 140 395 210 370 C280 395 350 320 358 210 C365 110 285 55 210 95Z" fill="url(#ma)" stroke="{K}" stroke-width="6"/>'
        f'<ellipse cx="140" cy="170" rx="34" ry="52" fill="#fff" opacity=".45" transform="rotate(-25 140 170)"/>'
        f'<path d="M210 100 C205 70 212 45 228 25" stroke="#5a3a1a" stroke-width="12" fill="none" stroke-linecap="round"/>'
        f'<path d="M226 60 C260 20 320 30 330 45 C300 80 255 80 226 60Z" fill="#3fb34f" stroke="{K}" stroke-width="5"/>',
        rg("ma", "#ff6b5b", "#b3121e"))
# Lata
sticker("alimento_lata.svg", 360, 470,
        "M30 60 Q30 20 180 20 Q330 20 330 60 L330 410 Q330 450 180 450 Q30 450 30 410Z",
        f'<rect x="55" y="60" width="250" height="350" fill="url(#lt)" stroke="{K}" stroke-width="6"/>'
        f'<ellipse cx="180" cy="60" rx="125" ry="28" fill="#e8e8ee" stroke="{K}" stroke-width="6"/>'
        f'<ellipse cx="180" cy="60" rx="95" ry="18" fill="#c9c9d2"/>'
        f'<ellipse cx="180" cy="410" rx="125" ry="28" fill="#9a9aa6" stroke="{K}" stroke-width="6"/>'
        f'<rect x="55" y="150" width="250" height="160" fill="{B}"/>'
        f'<text x="180" y="248" font-family="Anton" font-size="64" fill="{Y}" text-anchor="middle">FEIJÃO</text>'
        f'<rect x="80" y="70" width="26" height="330" fill="#fff" opacity=".35"/>',
        lg("lt", "#f2f2f6", "#8d8d99"))
# Saco de arroz
sticker("alimento_arroz.svg", 400, 500,
        "M60 40 L340 40 L370 120 L370 450 Q370 480 340 480 L60 480 Q30 480 30 450 L30 120Z",
        f'<path d="M75 60 L325 60 L350 125 L350 445 L50 445 L50 125Z" fill="url(#ar)" stroke="{K}" stroke-width="6"/>'
        f'<path d="M75 60 L325 60 L330 95 L70 95Z" fill="{Y}" stroke="{K}" stroke-width="5"/>'
        f'<rect x="80" y="170" width="240" height="170" rx="20" fill="{B}" stroke="{K}" stroke-width="5"/>'
        f'<text x="200" y="285" font-family="Anton" font-size="84" fill="#fff" text-anchor="middle">ARROZ</text>'
        f'<text x="200" y="400" font-family="Anton" font-size="44" fill="{B}" text-anchor="middle">5 KG</text>'
        f'<rect x="70" y="110" width="22" height="320" fill="#fff" opacity=".4"/>',
        lg("ar", "#ffffff", "#d7dcef"))
# Caixa de leite
sticker("alimento_leite.svg", 340, 520,
        "M60 110 L170 20 L280 110 L300 130 L300 480 Q300 500 280 500 L60 500 Q40 500 40 480 L40 130Z",
        f'<path d="M60 130 L170 45 L280 130 L280 480 L60 480Z" fill="url(#lei)" stroke="{K}" stroke-width="6"/>'
        f'<path d="M60 130 L170 45 L280 130Z" fill="#dfe6ff" stroke="{K}" stroke-width="5"/>'
        f'<rect x="60" y="230" width="220" height="140" fill="{BL}"/>'
        f'<text x="170" y="330" font-family="Anton" font-size="78" fill="#fff" text-anchor="middle">LEITE</text>'
        f'<circle cx="230" cy="180" r="26" fill="{Y}" stroke="{K}" stroke-width="4"/>',
        lg("lei", "#ffffff", "#c8d2f0"))
# Pao
sticker("alimento_pao.svg", 480, 330,
        "M40 200 C20 80 140 30 240 40 C340 30 460 80 440 200 C430 290 360 300 240 300 C120 300 50 290 40 200Z",
        f'<path d="M65 195 C50 100 150 65 240 70 C330 65 430 100 415 195 C405 265 350 275 240 275 C130 275 75 265 65 195Z" fill="url(#pa)" stroke="{K}" stroke-width="6"/>'
        + "".join(f'<path d="M{150+i*70} 105 Q{170+i*70} 160 {150+i*70} 215" stroke="#8a4b12" stroke-width="10" fill="none" stroke-linecap="round"/>' for i in range(3))
        + f'<ellipse cx="170" cy="110" rx="70" ry="16" fill="#fff" opacity=".35"/>',
        rg("pa", "#f7c063", "#b8661b", "40%", "25%"))
# Banana
sticker("alimento_banana.svg", 460, 330,
        "M40 90 C70 280 330 330 430 180 C450 150 420 120 395 140 C300 230 140 210 90 60 C80 30 30 40 40 90Z",
        f'<path d="M65 90 C95 255 320 300 405 175 C320 245 135 225 85 75 C78 58 60 64 65 90Z" fill="url(#ba)" stroke="{K}" stroke-width="6"/>'
        f'<path d="M80 72 L70 50" stroke="#4a3a12" stroke-width="12" stroke-linecap="round"/>',
        lg("ba", "#fff27a", "#e0a800", "0", "1"))

# ---------- CELULAR 3D ----------
phone = (layer("Corpo_Extrusao", f'<rect x="38" y="30" width="460" height="940" rx="70" fill="#05081a"/>')
         + layer("Corpo", f'<rect x="20" y="16" width="460" height="940" rx="70" fill="url(#ph)" stroke="#2b3570" stroke-width="6"/>')
         + layer("Tela", f'<rect x="44" y="40" width="412" height="892" rx="52" fill="{B}"/>')
         + layer("Notch", f'<rect x="190" y="58" width="120" height="30" rx="15" fill="#05081a"/>')
         + layer("Reflexo", f'<path d="M60 60 L260 60 L60 520Z" fill="#fff" opacity=".10"/>'))
svg("celular_3d.svg", 520, 990, phone, lg("ph", "#3a4486", "#0b1033", "1", "1"))

# ---------- TIPOGRAFIA (placas para animacao) ----------
txts = ["EI, GALERA…", "ESTÃO PREPARADOS?", "10ª EDIÇÃO", "GINCANA SOLIDÁRIA", "PAFIES 2027",
        "MUITO MAIS QUE UMA COMPETIÇÃO.", "UMA MISSÃO DE SOLIDARIEDADE.", "PREPARE SUA EQUIPE!",
        "REÚNA A GALERA!", "ESSA EDIÇÃO PROMETE!", "VAMOS FAZER HISTÓRIA!"]
body = ""
for i, t in enumerate(txts):
    y = 130 + i * 150
    body += layer(f"Texto_{i+1:02d}",
                  f'<text x="62" y="{y+8}" font-family="Anton" font-size="110" fill="{K}">{t}</text>'
                  f'<text x="54" y="{y}" font-family="Anton" font-size="110" fill="{Y if i % 2 else W}" stroke="{K}" stroke-width="4">{t}</text>')
svg("tipografia_campanha.svg", 2000, 1800, f'<rect width="2000" height="1800" fill="{B}"/>' + body)

# ---------- PALETA ----------
pal = "".join(f'<rect x="{i*220+20}" y="20" width="200" height="200" fill="{c}" stroke="#999"/>'
              f'<text x="{i*220+30}" y="260" font-family="Inter" font-size="28">{c}</text>'
              for i, c in enumerate([B, Y, K, W, BD, YD]))
svg("paleta_identidade.svg", 1360, 290, layer("Paleta", pal))
print("ok")
