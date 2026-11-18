"""PAFIES 2027 — Design gráfico vetorial.

Gera os vetores da campanha como SVG editável (grupos nomeados = camadas),
compatível com Adobe Illustrator (Arquivo > Abrir) e After Effects
(importar via Illustrator > Criar formas a partir da camada vetorial).

Saída: 02_ILLUSTRATOR/svg/*.svg  e cópia em 05_REMOTION/public/vetores/
"""
import math, os, random, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "svg")
REMOTION = os.path.abspath(os.path.join(ROOT, "..", "05_REMOTION", "public", "vetores"))
os.makedirs(OUT, exist_ok=True)

ROYAL, ROYAL_DEEP, YELLOW, BLACK, WHITE = "#1E40C8", "#0A1A5C", "#FFD000", "#0A0A0F", "#F5F5F2"
FONT = "Anton, 'Archivo Black', Impact, sans-serif"


def svg(name, w, h, body, bg=None):
    bgr = f'<rect id="BG" width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    doc = (f'<?xml version="1.0" encoding="UTF-8"?>\n'
           f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
           f'<title>PAFIES 2027 — {name}</title>\n{bgr}\n{body}\n</svg>\n')
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(doc)


def g(id_, inner, extra=""):
    return f'<g id="{id_}" {extra}>\n{inner}\n</g>'


# ---------- 1. RAIOS AMARELOS (lightning bolts) ----------
BOLTS = {
    "RAIO_A": [(62, 0), (14, 118), (52, 118), (24, 230), (118, 86), (74, 86), (108, 0)],
    "RAIO_B": [(70, 0), (20, 100), (58, 104), (10, 220), (110, 78), (66, 74), (112, 0)],
    "RAIO_C": [(48, 0), (8, 130), (46, 126), (34, 240), (120, 96), (78, 100), (98, 0)],
}


def pts(p, dx=0, dy=0):
    return " ".join(f"{x + dx},{y + dy}" for x, y in p)


def bolt_group(name, p):
    # 3 camadas: sombra azul (deslocada), contorno preto, preenchimento amarelo + brilho
    return g(name, "\n".join([
        f'<polygon id="{name}_SOMBRA" points="{pts(p, 10, 10)}" fill="{ROYAL}"/>',
        f'<polygon id="{name}_CONTORNO" points="{pts(p)}" fill="{BLACK}" stroke="{BLACK}" stroke-width="14" stroke-linejoin="round"/>',
        f'<polygon id="{name}_PREENCHIMENTO" points="{pts(p)}" fill="{YELLOW}"/>',
        f'<polyline id="{name}_BRILHO" points="{pts(p[:3])}" fill="none" stroke="#FFF6B0" stroke-width="5" stroke-linecap="round" transform="translate(6,8) scale(0.9)"/>',
    ]))


for n, p in BOLTS.items():
    svg(n.lower(), 140, 260, bolt_group(n, p))
svg("raios_amarelos_kit", 520, 300, "\n".join(
    f'<g transform="translate({20 + i * 170},20)">{bolt_group(n, p)}</g>' for i, (n, p) in enumerate(BOLTS.items())))

# ---------- 2. SUNBURST (raios de luz) ----------
def sunburst(n=28, r=1600, cx=800, cy=800, color=YELLOW):
    out = []
    for i in range(n):
        a0 = 2 * math.pi * i / n
        a1 = a0 + math.pi / n * 0.85
        out.append(f'<polygon points="{cx},{cy} {cx + r * math.cos(a0):.1f},{cy + r * math.sin(a0):.1f} '
                   f'{cx + r * math.cos(a1):.1f},{cy + r * math.sin(a1):.1f}" fill="{color}"/>')
    return "\n".join(out)


svg("sunburst_amarelo", 1600, 1600, g("SUNBURST_RAIOS", sunburst()))
svg("sunburst_azul", 1600, 1600, g("SUNBURST_RAIOS", sunburst(color="#2C55E8")))

# ---------- 3. HALFTONE ----------
def halftone(w, h, step=22, mode="linear", color=BLACK, maxr=None):
    maxr = maxr or step * 0.62
    out = []
    for j, y in enumerate(range(0, h + step, step)):
        off = step / 2 if j % 2 else 0
        for x in range(0, w + step, step):
            xx = x + off
            if mode == "linear":
                t = y / h
            elif mode == "radial":
                t = min(1, math.hypot(xx - w / 2, y - h / 2) / (0.62 * math.hypot(w / 2, h / 2)))
            else:  # diagonal
                t = (xx / w + y / h) / 2
            r = maxr * t ** 1.4
            if r > 0.6:
                out.append(f'<circle cx="{xx:.0f}" cy="{y}" r="{r:.1f}"/>')
    return g("HALFTONE_PONTOS", "\n".join(out), f'fill="{color}"')


svg("halftone_linear_preto", 1080, 1920, halftone(1080, 1920))
svg("halftone_radial_preto", 1080, 1920, halftone(1080, 1920, 26, "radial"))
svg("halftone_diagonal_amarelo", 1080, 1080, halftone(1080, 1080, 20, "diag", YELLOW))
svg("halftone_linear_branco", 1080, 1920, halftone(1080, 1920, 24, "linear", WHITE))

# ---------- 4. GRAFISMOS ----------
def plus(x, y, s, c):
    t = s * 0.32
    return f'<path d="M{x - t / 2},{y - s / 2}h{t}v{(s - t) / 2}h{(s - t) / 2}v{t}h{-(s - t) / 2}v{(s - t) / 2}h{-t}v{-(s - t) / 2}h{-(s - t) / 2}v{-t}h{(s - t) / 2}z" fill="{c}"/>'


def star(x, y, r, c, n=4):
    p = []
    for i in range(n * 2):
        a = math.pi * i / n - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        p.append(f"{x + rr * math.cos(a):.1f},{y + rr * math.sin(a):.1f}")
    return f'<polygon points="{" ".join(p)}" fill="{c}"/>'


graf = [
    g("BRILHO_4PONTAS", star(100, 100, 90, YELLOW)),
    g("CRUZ_PLUS", plus(300, 100, 120, WHITE)),
    g("ANEL_CONTAGEM", f'<circle cx="500" cy="100" r="80" fill="none" stroke="{YELLOW}" stroke-width="18" stroke-dasharray="40 14"/>'),
    g("SETA_DUPLA", f'<path d="M640,40l60,60l-60,60M700,40l60,60l-60,60" fill="none" stroke="{YELLOW}" stroke-width="22" stroke-linejoin="miter"/>'),
    g("CIRCULO_CHEIO", f'<circle cx="900" cy="100" r="70" fill="{ROYAL}" stroke="{BLACK}" stroke-width="10"/>'),
    g("ONDAS", f'<path d="M40,300 q40,-40 80,0 t80,0 t80,0 t80,0" fill="none" stroke="{WHITE}" stroke-width="14" stroke-linecap="round"/>'),
    g("FITA_ZIGZAG", f'<polyline points="420,300 470,250 520,300 570,250 620,300 670,250 720,300" fill="none" stroke="{YELLOW}" stroke-width="18" stroke-linejoin="miter"/>'),
    g("MAOS_CORACAO", f'<path d="M900,330 C820,270 830,210 880,215 C900,218 905,235 900,250 C895,235 900,218 920,215 C970,210 980,270 900,330Z" fill="{YELLOW}" stroke="{BLACK}" stroke-width="8"/>'),
]
svg("grafismos_kit", 1000, 380, "\n".join(graf))

# ---------- 5. TIPOGRAFIA (composições editáveis, texto vivo) ----------
def type_layout(name, lines, bg=ROYAL):
    """lines: (texto, tamanho, cor, y, rotação)"""
    out = []
    for i, (t, size, col, y, rot) in enumerate(lines):
        out.append(
            f'<g id="LINHA_{i + 1:02d}" transform="rotate({rot} 540 {y})">'
            f'<text x="548" y="{y + 8}" text-anchor="middle" font-family="{FONT}" font-size="{size}" fill="{BLACK}">{t}</text>'
            f'<text x="540" y="{y}" text-anchor="middle" font-family="{FONT}" font-size="{size}" fill="{col}">{t}</text></g>')
    svg(name, 1080, 1920, halftone(1080, 1920, 26, "radial", "#000000").replace('id="HALFTONE_PONTOS"', 'id="TEXTURA_HALFTONE" opacity="0.18"') + "\n" + g("TIPOGRAFIA", "\n".join(out)), bg)


type_layout("tipo_01_abertura", [("EI, GALERA…", 150, WHITE, 860, -3), ("ESTÃO", 220, YELLOW, 1080, 0), ("PREPARADOS?", 190, YELLOW, 1270, 0)], BLACK)
type_layout("tipo_02_revelacao", [("10ª EDIÇÃO", 200, YELLOW, 1300, -2), ("GINCANA SOLIDÁRIA", 110, WHITE, 1450, 0), ("PAFIES 2027", 150, WHITE, 1600, 0)])
type_layout("tipo_03_solidariedade", [("MUITO MAIS QUE", 120, WHITE, 760, 0), ("UMA COMPETIÇÃO.", 130, WHITE, 900, 0), ("UMA MISSÃO DE", 120, YELLOW, 1120, -2), ("SOLIDARIEDADE.", 150, YELLOW, 1280, -2)])
type_layout("tipo_04_expectativa", [("PREPARE", 240, YELLOW, 640, -4), ("SUA EQUIPE!", 170, WHITE, 830, -4), ("REÚNA A GALERA!", 140, WHITE, 1120, 0), ("ESSA EDIÇÃO", 150, YELLOW, 1390, 3), ("PROMETE!", 230, YELLOW, 1610, 3)])
type_layout("tipo_05_final", [("ESTÃO PREPARADOS?", 120, WHITE, 420, 0), ("PAFIES 2027", 200, YELLOW, 1440, 0), ("VAMOS FAZER HISTÓRIA!", 100, WHITE, 1600, 0)])

# ---------- 6. LOGO ----------
# O logo oficial PAFIES foi recebido e é usado como arquivo original (07_ASSETS/logo),
# sem redesenho. Nenhum vetor de logo é gerado aqui.

# ---------- cópia para o Remotion ----------
os.makedirs(REMOTION, exist_ok=True)
for f in os.listdir(OUT):
    shutil.copy(os.path.join(OUT, f), REMOTION)
print("SVGs:", sorted(os.listdir(OUT)))
