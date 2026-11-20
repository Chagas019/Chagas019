"""Aura em forma de chama atrás da cabeça — desenhada por parâmetros (línguas de fogo) e suavizada
em curvas Bézier (Catmull-Rom). 4 variações (boil) trocadas a cada 2 quadros na animação.
Camadas: chama externa magenta, chama interna amarela."""
import math

CX, CY = 300, 250            # centro da cabeça no espaço do recorte (600×796)
AZ, MG, AM = '#0A4F96', '#F833F8', '#EAC11A'

# línguas: (ângulo° [0 = direita, 90 = topo], altura, largura°, inclinação°)
TONGUES = [(18, 70, 18, 10), (42, 120, 20, 14), (66, 190, 22, 16), (92, 250, 20, 20),
           (114, 175, 20, 18), (138, 125, 19, 14), (160, 80, 18, 10)]

def flame_pts(R0, scale, var, tongues=TONGUES, n=180):
    pts = []
    a0, a1 = -10, 190
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        r = R0
        lean = 0
        for k, (ta, h, w, ln) in enumerate(tongues):
            # variação do boil: altura/largura/posição do pico mudam por variante (determinístico)
            j = math.sin(var * 2.1 + k * 1.7)
            ta2 = ta + 4 * j
            h2 = h * scale * (1 + .14 * math.sin(var * 1.3 + k * 2.3))
            d = (a - ta2) / (w * (1 + .1 * j))
            if abs(d) < 1:
                p = (1 - abs(d)) ** 1.9            # pico pontudo
                r += h2 * p
                lean += ln * p * (1 + .3 * j)
        # inclinação das pontas (chama "sopra" para a direita)
        aa = math.radians(a - lean * (r - R0) / max(1, R0) * 1.2)
        pts.append((CX + r * math.cos(aa), CY - r * math.sin(aa)))
    # fecha por baixo, atrás da cabeça
    pts.append((CX + R0 * .55, CY + R0 * .55)); pts.append((CX - R0 * .55, CY + R0 * .55))
    return pts

def catmull(pts):
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    n = len(pts)
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d + 'Z'

def svg_groups(W=600, H=796):
    out = []
    for v in range(4):
        outer = catmull(flame_pts(262, 1.0, v, n=90))
        inner_t = [(a, h * .6, w * .85, l) for (a, h, w, l) in TONGUES[1:-1]]
        inner = catmull(flame_pts(236, 1.0, v + 7, inner_t, n=90))
        out.append(f'<g class="boil" id="aura{v}"{"" if v == 0 else " style=\"display:none\""}>'
                   f'<path fill="{MG}" d="{outer}"/><path fill="{AM}" d="{inner}"/></g>')
    return ''.join(out)
