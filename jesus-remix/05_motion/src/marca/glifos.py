"""Extrai os contornos de J E S U (Dela Gothic One, fonte aprovada) e converte cada trecho
quadrático (TrueType) em UMA cúbica com tangentes preservadas (ajuste por mínimos quadrados),
como o Illustrator mostraria: poucos pontos de ancoragem, alças longas.
Saída: glifos.js  (window.GLIFOS = {J:{adv, contours:[[seg...]]}, ...}; unidades da fonte, y para cima)
Uso: python3 glifos.py"""
import json, os
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '../../../02_identidade/fontes/dela-gothic-one-latin-400-normal.woff2')

def quads(p0, offs, pend):
    """qCurveTo -> lista de quadráticas (p0, c, p1) com pontos implícitos"""
    out, a = [], p0
    for i, c in enumerate(offs):
        b = pend if i == len(offs) - 1 else ((c[0] + offs[i + 1][0]) / 2, (c[1] + offs[i + 1][1]) / 2)
        out.append((a, c, b)); a = b
    return out

def sample(qs, n=24):
    pts = []
    for (a, c, b) in qs:
        for t in np.linspace(0, 1, n, endpoint=False):
            pts.append(((1-t)**2*np.array(a) + 2*(1-t)*t*np.array(c) + t*t*np.array(b)))
    pts.append(np.array(qs[-1][2])); return np.array(pts)

def fit(qs):
    P0, P3 = np.array(qs[0][0], float), np.array(qs[-1][2], float)
    if len(qs) == 1:
        a, c, b = [np.array(x, float) for x in qs[0]]
        return P0, a + 2/3*(c-a), b + 2/3*(c-b), P3
    d0 = np.array(qs[0][1], float) - P0; d0 /= np.linalg.norm(d0)
    d1 = np.array(qs[-1][1], float) - P3; d1 /= np.linalg.norm(d1)
    pts = sample(qs)
    # parametrização por comprimento de corda
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]; u = L / L[-1]
    for _ in range(6):
        B0, B1, B2, B3 = (1-u)**3, 3*(1-u)**2*u, 3*(1-u)*u**2, u**3
        A = np.stack([np.concatenate([B1*d0[0]]), B2*d1[0]], 1)
        A = np.vstack([np.stack([B1*d0[0], B2*d1[0]], 1), np.stack([B1*d0[1], B2*d1[1]], 1)])
        base = np.outer(B0+B1, P0) + np.outer(B2+B3, P3)
        r = np.concatenate([pts[:, 0]-base[:, 0], pts[:, 1]-base[:, 1]])
        (k0, k1), *_ = np.linalg.lstsq(A, r, rcond=None)
        C1, C2 = P0 + k0*d0, P3 + k1*d1
        # reparametrização (1 passo de Newton)
        for j in range(len(u)):
            t = u[j]; Q = (1-t)**3*P0+3*(1-t)**2*t*C1+3*(1-t)*t*t*C2+t**3*P3
            dQ = 3*(1-t)**2*(C1-P0)+6*(1-t)*t*(C2-C1)+3*t*t*(P3-C2)
            ddQ = 6*(1-t)*(C2-2*C1+P0)+6*t*(P3-2*C2+C1)
            num = np.dot(Q-pts[j], dQ); den = np.dot(dQ, dQ)+np.dot(Q-pts[j], ddQ)
            if abs(den) > 1e-9: u[j] = min(1, max(0, t - num/den))
    return P0, C1, C2, P3

f = TTFont(FONT); cmap = f.getBestCmap(); gs = f.getGlyphSet()
out = {}
for ch in 'JESU':
    g = gs[cmap[ord(ch)]]; pen = RecordingPen(); g.draw(pen)
    contours, cur, start = [], [], None; p = None
    for op, args in pen.value:
        if op == 'moveTo': p = start = args[0]; cur = []
        elif op == 'lineTo': cur.append({'t': 'L', 'p': [p, args[0]]}); p = args[0]
        elif op == 'qCurveTo':
            a, c1, c2, b = fit(quads(p, args[:-1], args[-1]))
            cur.append({'t': 'C', 'p': [list(map(float, a)), [round(float(v), 2) for v in c1], [round(float(v), 2) for v in c2], list(map(float, b))]}); p = args[-1]
        elif op in ('closePath', 'endPath'):
            if p != start: cur.append({'t': 'L', 'p': [p, start]})
            contours.append(cur)
    out[ch] = {'adv': g.width, 'contours': contours}
hh = f['hhea']
js = '/* gerado por glifos.py — Dela Gothic One (J E S U), cúbicas ajustadas */\nwindow.GLIFOS = ' + json.dumps({'upm': f['head'].unitsPerEm, 'asc': hh.ascent, 'desc': hh.descent, 'g': out}) + ';\n'
open(os.path.join(HERE, 'glifos.js'), 'w').write(js)
print({k: sum(len(c) for c in v['contours']) for k, v in out.items()})
