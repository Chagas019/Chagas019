"""VFX — extrai contornos da Dela Gothic One (fonte aprovada do título) para o morph esfera→letra.
Uso: PYTHONPATH=<fonttools+brotli> python3 glyphs.py  → ../lib/glyphs.js
Cada contorno é achatado (curvas → polígono) e reamostrado em N pontos por comprimento de arco,
começando no ponto mais alto (para o morph a partir do círculo não torcer)."""
import json, math, os
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '../../../02_identidade/fontes/dela-gothic-one-latin-400-normal.woff2')
N = 180
f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
def q(p0, p1, p2, n=12): return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in (i/n for i in range(1, n+1))]
def c(p0, p1, p2, p3, n=12): return [tuple((1-t)**3*p0[k]+3*(1-t)**2*t*p1[k]+3*(1-t)*t*t*p2[k]+t**3*p3[k] for k in (0,1)) for t in (i/n for i in range(1, n+1))]
def contours(ch):
    pen = RecordingPen(); gs[cmap[ord(ch)]].draw(pen); out=[]; cur=[]
    for op, args in pen.value:
        if op == 'moveTo': cur=[args[0]]
        elif op == 'lineTo': cur.append(args[0])
        elif op == 'qCurveTo':
            pts=list(args); p0=cur[-1]
            for i in range(len(pts)-1):
                p1=pts[i]; p2=pts[i+1] if i==len(pts)-2 else ((pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2)
                cur+=q(p0,p1,p2); p0=p2
        elif op == 'curveTo': cur+=c(cur[-1],*args)
        elif op in ('closePath','endPath'): out.append(cur); cur=[]
    return out
def resample(pts, n):
    pts = pts + [pts[0]]; seg=[math.dist(pts[i],pts[i+1]) for i in range(len(pts)-1)]; L=sum(seg)
    top = max(range(len(pts)-1), key=lambda i: pts[i][1])            # começa no topo
    pts = pts[top:-1]+pts[:top]+[pts[top]]; seg=[math.dist(pts[i],pts[i+1]) for i in range(len(pts)-1)]
    # orientação horária na tela (y para baixo) como o círculo do JS
    area=sum(pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1] for i in range(len(pts)-1))
    if area < 0: pts=pts[::-1]; seg=seg[::-1]
    out=[]; acc=0; i=0
    for k in range(n):
        d=L*k/n
        while i < len(seg)-1 and acc+seg[i] < d: acc+=seg[i]; i+=1
        t=(d-acc)/seg[i] if seg[i] else 0
        out.append([round((pts[i][0]+(pts[i+1][0]-pts[i][0])*t)/upm,4), round(-(pts[i][1]+(pts[i+1][1]-pts[i][1])*t)/upm,4)])
    return out
G={}
for ch in 'JESU':
    cs=contours(ch); main=max(cs,key=len)
    G[ch]=dict(adv=round(gs[cmap[ord(ch)]].width/upm,4), contornos=len(cs), pts=resample(main,N))
open(os.path.join(HERE,'../lib/glyphs.js'),'w').write('// gerado por tools/glyphs.py — Dela Gothic One, em unidades de em (y para baixo, baseline = 0)\nwindow.GLYPHS='+json.dumps(G)+';\n')
print({k:(v['adv'],v['contornos']) for k,v in G.items()})
