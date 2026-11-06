import math, os, sys
from PIL import Image, ImageDraw, ImageFont
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(base, "05-ELEMENTOS-GRAFICOS")
C = {"dourado":"#B98732","verde":"#075C5A","marfim":"#F8F5EF","turquesa":"#36BDB5"}

def star(cx, cy, R, r, n=8, rot=-90):
    pts=[]
    for i in range(2*n):
        a=math.radians(rot+i*180/n); rr=R if i%2==0 else r
        pts.append(f"{cx+rr*math.cos(a):.2f},{cy+rr*math.sin(a):.2f}")
    return " ".join(pts)

def svg(body, vb="0 0 400 400"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n'

shapes = {
 "estrela-8-pontas": lambda c: f'<polygon points="{star(200,200,180,78)}" fill="{c}"/>',
 "estrela-8-pontas-linha": lambda c: f'<g fill="none" stroke="{c}" stroke-width="2.5"><polygon points="{star(200,200,180,78)}"/><polygon points="{star(200,200,110,48)}"/><circle cx="200" cy="200" r="24"/></g>',
 "circulo-aureo": lambda c: f'<g fill="none" stroke="{c}">'+"".join(f'<circle cx="200" cy="200" r="{r}" stroke-width="{w}"/>' for r,w in [(190,1.2),(176,4),(160,1),(120,1),(70,1)])+f'<polygon points="{star(200,200,40,17)}" fill="{c}" stroke="none"/></g>',
 "curva-manto": lambda c: f'<g fill="none" stroke="{c}" stroke-linecap="round">'+"".join(f'<path d="M{20+i*14} 390 C {60+i*18} {260-i*10}, {150+i*10} {150-i*6}, {200} {14+i*10} C {250-i*10} {150-i*6}, {340-i*18} {260-i*10}, {380-i*14} 390" stroke-width="{2.4-i*0.25:.2f}" opacity="{1-i*0.1:.2f}"/>' for i in range(7))+'</g>',
 "livro-aberto-linhas": lambda c: f'<g fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round">'+"".join(f'<path d="M200 300 Q {130-i*6} {250-i*16} {30+i*4} {270-i*22}"/><path d="M200 300 Q {270+i*6} {250-i*16} {370-i*4} {270-i*22}"/>' for i in range(6))+'<line x1="200" y1="300" x2="200" y2="120"/><path d="M200 300 Q 120 330 30 300 M200 300 Q 280 330 370 300"/></g>',
}
for name,f in shapes.items():
    for cn,cv in C.items():
        open(os.path.join(out,f"{name}--{cn}.svg"),"w").write(svg(f(cv)))

# padrao (tile repetível)
def padrao(fg,bg):
    b=f'<rect width="200" height="200" fill="{bg}"/>' if bg else ""
    b+=f'<g fill="none" stroke="{fg}" stroke-width="1" opacity=".9"><circle cx="0" cy="0" r="70"/><circle cx="200" cy="0" r="70"/><circle cx="0" cy="200" r="70"/><circle cx="200" cy="200" r="70"/><circle cx="100" cy="100" r="40"/></g>'
    b+=f'<polygon points="{star(100,100,16,7)}" fill="{fg}"/>'
    for x,y in [(0,0),(200,0),(0,200),(200,200)]: b+=f'<polygon points="{star(x,y,8,3.5)}" fill="{fg}"/>'
    return svg(b,"0 0 200 200")
for n,(fg,bg) in {"padrao-dourado-sobre-preto":("#B98732","#171615"),"padrao-dourado-sobre-marfim":("#C9A45D","#F8F5EF"),"padrao-turquesa-sobre-verde":("#36BDB5","#075C5A"),"padrao-dourado-transparente":("#B98732",None)}.items():
    open(os.path.join(out,f"{n}.svg"),"w").write(svg_ := padrao(fg,bg))

# Placeholder do logotipo — NÃO é o logotipo; é apenas a vaga onde o arquivo original entra.
p=os.path.join(base,"assets","logo-original.png")
if not os.path.exists(p) or "--force-placeholder" in sys.argv:
    im=Image.new("RGB",(1200,1200),"#FFFFFF"); d=ImageDraw.Draw(im)
    for i in range(0,1200,40):
        d.line([(60+i if 60+i<1140 else 1140,60),(min(60+i+20,1140),60)],fill="#B98732",width=4)
    d.rectangle([60,60,1140,1140],outline="#B98732",width=4)
    try: f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",54); g=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",36)
    except: f=g=ImageFont.load_default()
    for y,t,ft in [(470,"LOGOTIPO ORIGINAL",f),(560,"substitua este arquivo:",g),(620,"assets/logo-original.png",g)]:
        w=d.textlength(t,font=ft); d.text(((1200-w)/2,y),t,fill="#075C5A",font=ft)
    im.save(p); im.save(os.path.join(base,"assets","_placeholder.png"))
print("ok")
