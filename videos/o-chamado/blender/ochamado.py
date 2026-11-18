"""
O CHAMADO — produção 3D (Blender 5.x / Cycles)
------------------------------------------------
Uso (headless):
  python ochamado.py <cena 1-5> <camada obj|bg|blend> <frame_ini> <frame_fim> <pasta_saida>

Camadas:
  obj   -> objetos 3D (fundo transparente, 720x1280, DOF + motion blur)
  bg    -> cenário/estúdio com sombras reais dos objetos (objetos invisíveis à câmera)
  blend -> apenas salva o .blend editável da cena
"""
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Euler

FPS = 30
TAU = math.tau

# ------------------------------------------------------------------ util
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    return sc

def ease_io(p): p = max(0, min(1, p)); return p * p * (3 - 2 * p)
def ease_out(p): p = max(0, min(1, p)); return 1 - (1 - p) ** 3
def ease_inout5(p): p = max(0, min(1, p)); return 16 * p ** 5 if p < .5 else 1 - (-2 * p + 2) ** 5 / 2
def lerp(a, b, p): return a + (b - a) * p
def prog(t, a, b): return max(0.0, min(1.0, (t - a) / (b - a)))
def vlerp(a, b, p): return Vector(a).lerp(Vector(b), p)

def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o); return o

def collection(name):
    c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c

def hexc(h, a=1.0):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), a)

# ------------------------------------------------------------------ materiais
def mat(name, color, metal=0.0, rough=0.5, coat=0.0, trans=0.0, ior=1.45, emit=None, estr=0.0, bump=0.0, bump_scale=60.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color if len(color) == 4 else (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    try: b.inputs["Specular IOR Level"].default_value = spec
    except Exception: pass
    if emit:
        b.inputs["Emission Color"].default_value = emit
        b.inputs["Emission Strength"].default_value = estr
    if bump > 0:  # micro textura (couro, metal escovado, papel)
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = bump_scale; n.inputs["Detail"].default_value = 8
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = .02
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def M():
    return dict(
        gold=mat("Ouro escovado", hexc("#D9A85B"), 1, .23, bump=.04, bump_scale=300),
        goldp=mat("Ouro polido", hexc("#E6B867"), 1, .12),
        silver=mat("Aço escovado", hexc("#E3E5EA"), 1, .28, bump=.03, bump_scale=300),
        chrome=mat("Cromado", hexc("#F2F2F2"), 1, .06),
        red=mat("Laca vermelha", hexc("#8E0B1A"), 0, .28, coat=.6),
        redl=mat("Couro vinho", hexc("#5E0A14"), 0, .55, bump=.35, bump_scale=90),
        black=mat("Preto fosco", hexc("#141416"), 0, .45, bump=.25, bump_scale=120),
        blackg=mat("Preto brilhante", hexc("#0C0C0E"), 0, .12, coat=1),
        white=mat("Cerâmica", hexc("#F1EEE8"), 0, .32, coat=.4),
        ivory=mat("Marfim", hexc("#E9E0D0"), 0, .45),
        glass=mat("Vidro", (1, 1, 1, 1), 0, .0, trans=1.0, ior=1.5),
        lens=mat("Vidro óptico", hexc("#1B2340"), 0, .02, coat=1, trans=.2),
        blue=mat("Azul acetinado", hexc("#5566A8"), 0, .35, coat=.3),
    )

def paper_mat():
    m = bpy.data.materials.new("Papel com texto"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = .75
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sep.inputs[0])
    # linhas de texto: seno em V, quebrado por ruído em U (palavras), margens
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 260
    nt.links.new(sep.outputs["Y"], mul.inputs[0])
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'; nt.links.new(mul.outputs[0], sn.inputs[0])
    gt = nt.nodes.new("ShaderNodeMath"); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = .55; nt.links.new(sn.outputs[0], gt.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nt.links.new(tc.outputs["UV"], nz.inputs["Vector"])
    g2 = nt.nodes.new("ShaderNodeMath"); g2.operation = 'GREATER_THAN'; g2.inputs[1].default_value = .42; nt.links.new(nz.outputs["Fac"], g2.inputs[0])
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = 'MULTIPLY'; nt.links.new(gt.outputs[0], m1.inputs[0]); nt.links.new(g2.outputs[0], m1.inputs[1])
    # margens
    def band(lo, hi, src):
        a = nt.nodes.new("ShaderNodeMath"); a.operation = 'GREATER_THAN'; a.inputs[1].default_value = lo; nt.links.new(src, a.inputs[0])
        c = nt.nodes.new("ShaderNodeMath"); c.operation = 'LESS_THAN'; c.inputs[1].default_value = hi; nt.links.new(src, c.inputs[0])
        d = nt.nodes.new("ShaderNodeMath"); d.operation = 'MULTIPLY'; nt.links.new(a.outputs[0], d.inputs[0]); nt.links.new(c.outputs[0], d.inputs[1]); return d.outputs[0]
    bu, bv = band(.12, .88, sep.outputs["X"]), band(.1, .9, sep.outputs["Y"])
    m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = 'MULTIPLY'; nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(bu, m2.inputs[1])
    m3 = nt.nodes.new("ShaderNodeMath"); m3.operation = 'MULTIPLY'; nt.links.new(m2.outputs[0], m3.inputs[0]); nt.links.new(bv, m3.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = hexc("#F2ECDD"); mix.inputs[7].default_value = hexc("#5a524a")
    nt.links.new(m3.outputs[0], mix.inputs[0]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m

def flame_mat(name, strength, alpha_pow=1.2):
    """Chama: cor por altura (branco->laranja->vermelho) + bordas transparentes (layer weight)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission"); tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    hr = nt.nodes.new("ShaderNodeValToRGB"); el = hr.color_ramp.elements
    el[0].position = 0.0; el[0].color = hexc("#FFF6DC"); el[1].position = 1.0; el[1].color = hexc("#5A0508")
    for pos, c in ((.3, "#FFC45A"), (.55, "#FF7A1A"), (.8, "#D4231A")):
        e = el.new(pos); e.color = hexc(c)
    nt.links.new(sep.outputs["Z"], hr.inputs["Fac"]); nt.links.new(hr.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = strength
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = .35
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = 'POWER'; pw.inputs[1].default_value = alpha_pow
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    top = nt.nodes.new("ShaderNodeMath"); top.operation = 'MULTIPLY_ADD'; top.inputs[1].default_value = .6; top.inputs[2].default_value = 0
    nt.links.new(sep.outputs["Z"], top.inputs[0])
    tot = nt.nodes.new("ShaderNodeMath"); tot.operation = 'ADD'; tot.use_clamp = True
    nt.links.new(pw.outputs[0], tot.inputs[0]); nt.links.new(top.outputs[0], tot.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tot.outputs[0], mix.inputs[0]); nt.links.new(em.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m

def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o

def smooth(o, angle=40):
    for p in o.data.polygons: p.use_smooth = True
    try:
        mod = o.modifiers.new("Suavizar", 'SMOOTH_BY_ANGLE')
    except Exception:
        pass
    return o

def bevel(o, w=.02, seg=3):
    b = o.modifiers.new("Chanfro", 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = 'ANGLE'; return o

# ------------------------------------------------------------------ primitivas
def add_prim(kind, name, mat_, parent=None, coll=None, **kw):
    ops = {'cyl': bpy.ops.mesh.primitive_cylinder_add, 'cube': bpy.ops.mesh.primitive_cube_add,
           'sphere': bpy.ops.mesh.primitive_uv_sphere_add, 'torus': bpy.ops.mesh.primitive_torus_add,
           'cone': bpy.ops.mesh.primitive_cone_add, 'ico': bpy.ops.mesh.primitive_ico_sphere_add,
           'plane': bpy.ops.mesh.primitive_plane_add}
    ops[kind](**kw)
    o = bpy.context.object; o.name = name
    if coll:
        for c in o.users_collection: c.objects.unlink(o)
        coll.objects.link(o)
    if mat_: setmat(o, mat_)
    if parent: o.parent = parent
    return o

def empty(name, loc=(0, 0, 0), coll=None):
    e = bpy.data.objects.new(name, None); e.location = loc; e.empty_display_size = .5; link(e, coll); return e

def text_mesh(s, size, depth, mat_, parent, loc, rot=(0, 0, 0), coll=None, font=None):
    cu = bpy.data.curves.new(s, 'FONT'); cu.body = s; cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    if font: cu.font = font
    o = bpy.data.objects.new("Letra " + s, cu); link(o, coll); o.location = loc; o.rotation_euler = rot
    o.data.materials.append(mat_); o.parent = parent; return o

# ------------------------------------------------------------------ OBJETOS 3D
def bussola(mm, coll, font=None):
    root = empty("BÚSSOLA", coll=coll)
    case = add_prim('cyl', "Bússola caixa", mm['gold'], root, coll, radius=1, depth=.34, vertices=128); bevel(case, .05, 4); smooth(case)
    rim = add_prim('torus', "Bússola aro", mm['goldp'], root, coll, major_radius=.97, minor_radius=.075, major_segments=128, minor_segments=24, location=(0, 0, .2)); smooth(rim)
    face = add_prim('cyl', "Bússola mostrador", mm['ivory'], root, coll, radius=.92, depth=.02, vertices=128, location=(0, 0, .18))
    ring = add_prim('torus', "Bússola anel interno", mm['red'], root, coll, major_radius=.78, minor_radius=.012, major_segments=128, minor_segments=8, location=(0, 0, .195))
    for i in range(72):  # marcações
        a = i / 72 * TAU; L = .1 if i % 18 == 0 else (.06 if i % 6 == 0 else .03)
        tk = add_prim('cube', "Marca %d" % i, mm['black'] if i % 18 else mm['red'], root, coll, size=1, location=(math.cos(a) * (.85 - L / 2), math.sin(a) * (.85 - L / 2), .195))
        tk.scale = (L, .012 if i % 6 else .018, .006); tk.rotation_euler = (0, 0, a)
    for lbl, a in (("N", 90), ("L", 0), ("S", 270), ("O", 180)):
        r = math.radians(a)
        text_mesh(lbl, .16, .005, mm['red'] if lbl == "N" else mm['black'], root, (math.cos(r) * .62, math.sin(r) * .62, .193), (0, 0, r - math.pi / 2), coll, font)
    # rosa dos ventos (estrela) gravada
    needle = empty("Bússola agulha (pivô)", (0, 0, .23), coll); needle.parent = root
    n1 = add_prim('cone', "Agulha norte", mm['red'], needle, coll, vertices=4, radius1=.07, radius2=0, depth=.62, location=(0, .31, 0), rotation=(-math.pi / 2, 0, 0)); n1.scale = (1, .35, 1)
    n2 = add_prim('cone', "Agulha sul", mm['silver'], needle, coll, vertices=4, radius1=.07, radius2=0, depth=.62, location=(0, -.31, 0), rotation=(math.pi / 2, 0, 0)); n2.scale = (1, .35, 1)
    pin = add_prim('cyl', "Pino", mm['goldp'], needle, coll, radius=.045, depth=.06, vertices=48, location=(0, 0, .02)); bevel(pin, .015, 3)
    glass = add_prim('cyl', "Bússola vidro", mm['glass'], root, coll, radius=.93, depth=.03, vertices=128, location=(0, 0, .29)); bevel(glass, .012, 3); smooth(glass)
    glass.visible_shadow = False
    crown = add_prim('cyl', "Bússola coroa", mm['goldp'], root, coll, radius=.12, depth=.18, vertices=48, location=(0, 1.08, 0), rotation=(math.pi / 2, 0, 0)); bevel(crown, .02, 3)
    loop = add_prim('torus', "Bússola argola", mm['goldp'], root, coll, major_radius=.17, minor_radius=.035, major_segments=64, minor_segments=16, location=(0, 1.3, 0), rotation=(0, math.pi / 2, 0)); smooth(loop)
    return root, needle

def porta(mm, coll):
    root = empty("PORTA", coll=coll)
    W_, H_, T = 1.3, 2.6, .12
    fr = mm['white']
    for nm, loc, sc in (("Batente esquerdo", (-W_ / 2 - .08, 0, H_ / 2), (.16, .3, H_ + .16)),
                        ("Batente direito", (W_ / 2 + .08, 0, H_ / 2), (.16, .3, H_ + .16)),
                        ("Batente topo", (0, 0, H_ + .08), (W_ + .32, .3, .16))):
        b = add_prim('cube', nm, fr, root, coll, size=1, location=loc); b.scale = sc; bevel(b, .015, 3)
    sill = add_prim('cube', "Soleira", mm['goldp'], root, coll, size=1, location=(0, 0, -.02)); sill.scale = (W_ + .32, .34, .04); bevel(sill, .01, 2)
    # luz do outro lado (aparece quando a porta abre)
    glow = add_prim('plane', "Luz do chamado", None, root, coll, size=1, location=(0, .1, H_ / 2), rotation=(math.pi / 2, 0, 0)); glow.scale = (W_, H_, 1)
    gm = mat("Luz quente", (1, 1, 1, 1), emit=hexc("#FFF1D8"), estr=14); setmat(glow, gm)
    glow.visible_shadow = False
    hinge = empty("Porta dobradiça (pivô)", (-W_ / 2, -.04, 0), coll); hinge.parent = root
    door = add_prim('cube', "Folha da porta", mm['red'], hinge, coll, size=1, location=(W_ / 2, 0, H_ / 2)); door.scale = (W_ - .02, T, H_ - .02); bevel(door, .012, 3)
    for i, (z, h) in enumerate(((H_ * .68, H_ * .42), (H_ * .24, H_ * .32))):  # almofadas
        p = add_prim('cube', "Almofada %d" % (i + 1), mm['red'], hinge, coll, size=1, location=(W_ / 2, -T / 2 - .012, z)); p.scale = (W_ * .7, .03, h); bevel(p, .02, 4)
    kb = add_prim('sphere', "Maçaneta", mm['goldp'], hinge, coll, radius=.065, segments=48, ring_count=24, location=(W_ - .14, -T / 2 - .09, H_ * .48)); smooth(kb)
    st = add_prim('cyl', "Haste maçaneta", mm['goldp'], hinge, coll, radius=.02, depth=.1, vertices=32, location=(W_ - .14, -T / 2 - .04, H_ * .48), rotation=(math.pi / 2, 0, 0))
    plate = add_prim('cube', "Espelho", mm['goldp'], hinge, coll, size=1, location=(W_ - .14, -T / 2 - .01, H_ * .46)); plate.scale = (.07, .015, .26); bevel(plate, .02, 3)
    return root, hinge, glow

def biblia(mm, coll, pages=6):
    root = empty("BÍBLIA", coll=coll)
    cov = mm['redl']; pm = paper_mat()
    for s in (-1, 1):  # capas
        c = add_prim('cube', "Capa %s" % ("esq" if s < 0 else "dir"), cov, root, coll, size=1, location=(s * .62, 0, -.07)); c.scale = (1.22, 1.62, .04); bevel(c, .02, 3)
        c.rotation_euler = (0, s * -.10, 0)
        # bloco de páginas curvado
        blk = add_prim('cube', "Páginas %s" % ("esq" if s < 0 else "dir"), pm, root, coll, size=1, location=(s * .6, 0, .02)); blk.scale = (1.14, 1.54, .14)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=16); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=2.0); bpy.ops.object.mode_set(mode='OBJECT')
        me = blk.data
        for v in me.vertices:  # curva das páginas perto da lombada
            x = (v.co.x + .5)  # 0..1
            xx = x if s > 0 else 1 - x
            v.co.z += (.5 - .5 * math.cos(min(1, xx * 1.4) * math.pi)) * .9 - .45 if v.co.z > 0 else 0
        blk.rotation_euler = (0, s * -.10, 0); smooth(blk)
        # filete dourado na borda
        e = add_prim('cube', "Filete %s" % ("esq" if s < 0 else "dir"), mm['goldp'], root, coll, size=1, location=(s * 1.17, 0, -.02)); e.scale = (.02, 1.5, .1); e.rotation_euler = (0, s * -.1, 0)
    spine = add_prim('cyl', "Lombada", cov, root, coll, radius=.09, depth=1.62, vertices=32, location=(0, 0, -.08), rotation=(math.pi / 2, 0, 0))
    ribbon = add_prim('cube', "Fita marcadora", mm['red'], root, coll, size=1, location=(.08, -.95, -.05)); ribbon.scale = (.05, .5, .005); ribbon.rotation_euler = (.5, 0, .1)
    # páginas soltas que viram (bend)
    flips = []
    for i in range(pages):
        piv = empty("Página %d (pivô)" % (i + 1), (0, 0, .2 + i * .006), coll); piv.parent = root
        pg = add_prim('plane', "Página %d" % (i + 1), pm, piv, coll, size=1, location=(.55, 0, 0)); pg.scale = (1.1, 1.5, 1)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=24); bpy.ops.object.mode_set(mode='OBJECT')
        sd = pg.modifiers.new("Curvatura", 'SIMPLE_DEFORM'); sd.deform_method = 'BEND'; sd.deform_axis = 'Y'
        sd.origin = piv; sd.angle = 0
        sol = pg.modifiers.new("Espessura", 'SOLIDIFY'); sol.thickness = .004
        flips.append((piv, pg, sd))
    return root, flips

def camera_foto(mm, coll):
    root = empty("CÂMERA FOTOGRÁFICA", coll=coll)
    body = add_prim('cube', "Corpo", mm['black'], root, coll, size=1); body.scale = (1.5, .55, .9); bevel(body, .08, 5)
    top = add_prim('cube', "Tampa superior", mm['silver'], root, coll, size=1, location=(0, 0, .5)); top.scale = (1.5, .55, .14); bevel(top, .05, 4)
    hump = add_prim('cube', "Visor", mm['silver'], root, coll, size=1, location=(0, 0, .66)); hump.scale = (.5, .5, .26); bevel(hump, .06, 4)
    prism = add_prim('cube', "Visor frente", mm['black'], root, coll, size=1, location=(0, -.26, .66)); prism.scale = (.3, .02, .14); bevel(prism, .02, 2)
    grip = add_prim('cube', "Empunhadura", mm['black'], root, coll, size=1, location=(-.6, -.3, -.02)); grip.scale = (.26, .16, .82); bevel(grip, .07, 4)
    lens_parts = [(.42, .14, mm['silver'], -.32), (.38, .32, mm['black'], -.53), (.4, .08, mm['silver'], -.74), (.34, .1, mm['black'], -.82)]
    for i, (r, d, m_, y) in enumerate(lens_parts):
        l = add_prim('cyl', "Lente anel %d" % (i + 1), m_, root, coll, radius=r, depth=d, vertices=96, location=(.12, y, -.02), rotation=(math.pi / 2, 0, 0)); bevel(l, .015, 3); smooth(l)
    # anel de foco serrilhado
    kn = add_prim('cyl', "Anel de foco", mm['black'], root, coll, radius=.41, depth=.16, vertices=96, location=(.12, -.55, -.02), rotation=(math.pi / 2, 0, 0))
    tex = bpy.data.textures.new("serrilha", 'WOOD'); tex.wood_type = 'BANDS'; tex.noise_basis_2 = 'SAW'
    glass = add_prim('sphere', "Lente frontal", mm['lens'], root, coll, radius=.3, segments=64, ring_count=32, location=(.12, -.82, -.02)); glass.scale = (1, .25, 1); smooth(glass)
    for i, (x, r, h) in enumerate(((.42, .09, .07), (.62, .07, .06))):
        d = add_prim('cyl', "Dial %d" % (i + 1), mm['silver'], root, coll, radius=r, depth=h, vertices=48, location=(x, 0, .6)); bevel(d, .012, 2)
    sh = add_prim('cyl', "Disparador", mm['red'], root, coll, radius=.05, depth=.05, vertices=32, location=(-.55, -.12, .62)); bevel(sh, .01, 2)
    dot = add_prim('sphere', "Ponto vermelho", mm['red'], root, coll, radius=.035, location=(.55, -.28, .32))
    return root

def flame_volume(name, tc_obj, strength=38.0, seed=0.0):
    """Fogo volumétrico: densidade = ruído 4D animado x perfil de gota; cor por altura."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); L = nt.links.new
    gen = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ofs = nt.nodes.new("ShaderNodeVectorMath"); ofs.operation = 'MULTIPLY_ADD'
    ofs.inputs[1].default_value = (1, 1, 1 / .675); ofs.inputs[2].default_value = (.5, .5, .125 / .675)
    L(gen.outputs["Object"], ofs.inputs[0]); L(ofs.outputs[0], sep.inputs[0])
    tco = nt.nodes.new("ShaderNodeTexCoord"); tco.object = tc_obj
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.noise_dimensions = '4D'; nz.inputs["Scale"].default_value = 3.2; nz.inputs["Detail"].default_value = 6
    nz.inputs["Roughness"].default_value = .62; nz.inputs["W"].default_value = seed
    L(tco.outputs["Object"], nz.inputs["Vector"])
    # distância radial (0 no eixo, 1 na borda) — o domínio já tem forma de gota
    cx = nt.nodes.new("ShaderNodeMath"); cx.operation = 'SUBTRACT'; cx.inputs[1].default_value = .5; L(sep.outputs["X"], cx.inputs[0])
    cy = nt.nodes.new("ShaderNodeMath"); cy.operation = 'SUBTRACT'; cy.inputs[1].default_value = .5; L(sep.outputs["Y"], cy.inputs[0])
    vl = nt.nodes.new("ShaderNodeCombineXYZ"); L(cx.outputs[0], vl.inputs[0]); L(cy.outputs[0], vl.inputs[1])
    ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = 'LENGTH'; L(vl.outputs[0], ln.inputs[0])
    rr = nt.nodes.new("ShaderNodeMath"); rr.operation = 'MULTIPLY'; rr.inputs[1].default_value = 2.0; L(ln.outputs["Value"], rr.inputs[0])
    edge = nt.nodes.new("ShaderNodeMapRange"); edge.inputs["From Min"].default_value = .95; edge.inputs["From Max"].default_value = .15
    L(rr.outputs[0], edge.inputs["Value"])
    # campo = ruído deslocado pela altura (topo mais ralo -> línguas)
    hz = nt.nodes.new("ShaderNodeMath"); hz.operation = 'MULTIPLY'; hz.inputs[1].default_value = .55; L(sep.outputs["Z"], hz.inputs[0])
    fld = nt.nodes.new("ShaderNodeMath"); fld.operation = 'SUBTRACT'; L(nz.outputs["Fac"], fld.inputs[0]); L(hz.outputs[0], fld.inputs[1])
    fm = nt.nodes.new("ShaderNodeMath"); fm.operation = 'MULTIPLY'; L(fld.outputs[0], fm.inputs[0]); L(edge.outputs["Result"], fm.inputs[1])
    bf = nt.nodes.new("ShaderNodeMapRange"); bf.inputs["From Min"].default_value = 0.0; bf.inputs["From Max"].default_value = .22; L(sep.outputs["Z"], bf.inputs["Value"])
    fm2 = nt.nodes.new("ShaderNodeMath"); fm2.operation = 'MULTIPLY'; L(fm.outputs[0], fm2.inputs[0]); L(bf.outputs["Result"], fm2.inputs[1]); fm = fm2
    th = nt.nodes.new("ShaderNodeMapRange"); th.inputs["From Min"].default_value = .14; th.inputs["From Max"].default_value = .46
    L(fm.outputs[0], th.inputs["Value"])
    cr = nt.nodes.new("ShaderNodeValToRGB"); el = cr.color_ramp.elements
    el[0].position = 0; el[0].color = hexc("#3A0306"); el[1].position = 1; el[1].color = hexc("#FFE7A6")
    for pos, c in ((.2, "#B3120F"), (.45, "#F0400C"), (.7, "#FF8C1A"), (.88, "#FFC04D")):
        e = el.new(pos); e.color = hexc(c)
    L(th.outputs["Result"], cr.inputs["Fac"])
    emi = nt.nodes.new("ShaderNodeEmission"); L(cr.outputs["Color"], emi.inputs["Color"])
    st = nt.nodes.new("ShaderNodeMath"); st.operation = 'MULTIPLY'; st.inputs[1].default_value = strength; L(th.outputs["Result"], st.inputs[0])
    L(st.outputs[0], emi.inputs["Strength"])
    ab = nt.nodes.new("ShaderNodeVolumeAbsorption"); ab.inputs["Color"].default_value = (.2, .05, .02, 1)
    dn = nt.nodes.new("ShaderNodeMath"); dn.operation = 'MULTIPLY'; dn.inputs[1].default_value = 0.4; L(th.outputs["Result"], dn.inputs[0]); L(dn.outputs[0], ab.inputs["Density"])
    add = nt.nodes.new("ShaderNodeAddShader"); L(emi.outputs[0], add.inputs[0]); L(ab.outputs[0], add.inputs[1])
    L(add.outputs[0], out.inputs["Volume"])
    return m

def chama(coll, seed=1):
    root = empty("CHAMA", coll=coll)
    tc = empty("Turbulência (anim)", coll=coll); tc.parent = root
    o = add_prim('ico', "Chama (volume)", None, root, coll, subdivisions=4, radius=.5)
    for v in o.data.vertices:  # domínio em gota
        z = v.co.z / .5
        w = math.sqrt(max(0, 1 - z * z)) if z < 0 else (1 - z) ** 1.1 * (1 + .3 * (1 - z))
        r = math.hypot(v.co.x, v.co.y) or 1e-6
        v.co.x = v.co.x / r * w * .5; v.co.y = v.co.y / r * w * .5
        v.co.z = (z * (.5 if z < 0 else 2.2)) * .5
    o.scale = (.72, .72, 1.7)
    setmat(o, flame_volume("Fogo volumétrico", tc))
    o.visible_shadow = False
    lt = bpy.data.lights.new("Luz da chama", 'POINT'); lt.energy = 1500; lt.color = (1, .55, .25); lt.shadow_soft_size = .5
    lo = bpy.data.objects.new("Luz da chama", lt); link(lo, coll); lo.parent = root; lo.location = (0, 0, .4)
    return root, [(o, tc)], lo

def cruz(mm, coll):
    root = empty("CRUZ", coll=coll)
    v = add_prim('cube', "Cruz vertical", mm['gold'], root, coll, size=1); v.scale = (.34, .34, 3.0); bevel(v, .03, 4)
    h = add_prim('cube', "Cruz horizontal", mm['gold'], root, coll, size=1, location=(0, 0, .55)); h.scale = (1.9, .34, .34); bevel(h, .03, 4)
    # filete vermelho discreto no centro
    return root

def particulas(mm, coll, n, spread, seed, kinds=('sphere', 'torus', 'cube', 'capsule'), mats=('gold', 'white', 'red', 'goldp')):
    rnd = random.Random(seed); parts = []
    for i in range(n):
        k = rnd.choice(kinds); m_ = mm[rnd.choice(mats)]
        loc = Vector((rnd.uniform(-1, 1) * spread[0], rnd.uniform(-1, 1) * spread[1], rnd.uniform(-1, 1) * spread[2]))
        s = rnd.uniform(.05, .16)
        if k == 'sphere': o = add_prim('sphere', "Partícula esfera %d" % i, m_, None, coll, radius=s, segments=32, ring_count=16, location=loc)
        elif k == 'torus': o = add_prim('torus', "Partícula anel %d" % i, m_, None, coll, major_radius=s * 1.2, minor_radius=s * .35, major_segments=48, minor_segments=16, location=loc)
        elif k == 'cube': o = add_prim('cube', "Partícula cubo %d" % i, m_, None, coll, size=s * 1.6, location=loc); bevel(o, s * .2, 3)
        else: o = add_prim('cyl', "Partícula cápsula %d" % i, m_, None, coll, radius=s * .45, depth=s * 2.2, vertices=32, location=loc); bevel(o, s * .4, 4)
        smooth(o)
        parts.append(dict(o=o, base=loc.copy(), ph=rnd.uniform(0, TAU), rs=Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 1.4, amp=rnd.uniform(.05, .15)))
    return parts

def microfone(mm, coll):
    root = empty("MICROFONE", coll=coll)
    head = add_prim('sphere', "Grade", mm['silver'], root, coll, radius=.32, segments=48, ring_count=24, location=(0, 0, .5)); head.scale = (1, 1, 1.15); smooth(head)
    w = head.modifiers.new("Malha", 'WIREFRAME'); w.thickness = .012; w.use_replace = False
    ring = add_prim('cyl', "Anel", mm['goldp'], root, coll, radius=.24, depth=.08, vertices=48, location=(0, 0, .16)); bevel(ring, .015, 3)
    body = add_prim('cone', "Cabo", mm['black'], root, coll, radius1=.12, radius2=.22, depth=1.0, vertices=48, location=(0, 0, -.38)); bevel(body, .02, 3); smooth(body)
    return root

def pincel(mm, coll):
    root = empty("PINCEL", coll=coll)
    h = add_prim('cyl', "Cabo pincel", mm['red'], root, coll, radius=.06, depth=1.4, vertices=32, location=(0, 0, -.5)); bevel(h, .03, 3)
    f = add_prim('cyl', "Virola", mm['goldp'], root, coll, radius=.07, depth=.3, vertices=32, location=(0, 0, .35))
    b = add_prim('cone', "Cerdas", mm['black'], root, coll, radius1=.075, radius2=.01, depth=.4, vertices=32, location=(0, 0, .7)); smooth(b)
    return root

# ------------------------------------------------------------------ estúdio
def ciclorama(color, coll, width=60, depth=40, height=30, radius=6, y0=8):
    bm = bmesh.new(); prof = []
    for i in range(12): prof.append((-depth + depth * i / 11 + 0.0, 0.0))  # chão (y, z)
    for i in range(1, 17):
        a = i / 16 * math.pi / 2; prof.append((math.sin(a) * radius, radius - math.cos(a) * radius))
    for i in range(1, 8): prof.append((radius, radius + height * i / 7))
    cols = []
    for x in (-width / 2, width / 2):
        cols.append([bm.verts.new((x, y + y0, z)) for (y, z) in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((cols[0][i], cols[1][i], cols[1][i + 1], cols[0][i + 1]))
    me = bpy.data.meshes.new("Ciclorama"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("CENÁRIO ciclorama", me); link(o, coll)
    for p in o.data.polygons: p.use_smooth = True
    m = mat("Fundo estúdio", color, 0, .9, spec=.2); setmat(o, m)
    return o

def softbox(name, loc, rot, size, strength, color=(1, 1, 1, 1), coll=None):
    """Painel emissivo visível só em reflexos (assinatura de estúdio nos metais)."""
    o = add_prim('plane', name, None, None, coll, size=1, location=loc, rotation=rot); o.scale = (size[0], size[1], 1)
    setmat(o, mat(name, (0, 0, 0, 1), emit=color, estr=strength))
    o.visible_camera = False; o.visible_shadow = False; o.visible_diffuse = False
    return o

def area(name, loc, target, energy, size, color=(1, 1, 1), coll=None, spread=180):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.shape = 'RECTANGLE'; ld.size = size[0]; ld.size_y = size[1]; ld.color = color
    try: ld.spread = math.radians(spread)
    except Exception: pass
    o = bpy.data.objects.new(name, ld); link(o, coll); o.location = loc
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o

def studio(coll, warm=1.0, key=900, rim=600, fill=200):
    kc = (1, .96 * warm + (1 - warm), .9 * warm + (1 - warm))
    area("Luz principal (key)", (-4, -5, 6), (0, 0, 1.4), key, (4, 4), kc, coll)
    area("Luz de preenchimento", (5, -4, 2), (0, 0, 1.4), fill, (5, 5), (.95, .97, 1), coll)
    area("Luz de recorte (rim) dir", (4, 4, 4), (0, 0, 1.5), rim, (1.2, 5), (1, .95, .9), coll)
    area("Luz de recorte (rim) esq", (-4, 3.5, 3), (0, 0, 1.5), rim * .7, (1.2, 5), (1, .92, .88), coll)
    softbox("Softbox reflexo esquerdo", (-3, -2, 2), (0, math.radians(70), math.radians(-30)), (.8, 4), 6, coll=coll)
    softbox("Softbox reflexo direito", (3, -2.5, 2.5), (0, math.radians(-70), math.radians(30)), (.6, 4), 4, coll=coll)
    softbox("Softbox reflexo topo", (0, -1, 5), (0, 0, 0), (4, 2), 3, coll=coll)

def props_fundo(coll, palette, seed=3, y=9.0):
    """Objetos de cena desfocados ao fundo (prateleira, potes, esferas, livros) — como na referência."""
    rnd = random.Random(seed)
    shelf = add_prim('cube', "Fundo prateleira", mat("Prateleira", palette[0], 0, .7), None, coll, size=1, location=(3.2, y, .6)); shelf.scale = (3.4, 1.2, 1.2); bevel(shelf, .04, 3)
    shelf2 = add_prim('cube', "Fundo bloco", mat("Bloco", palette[1], 0, .6), None, coll, size=1, location=(-3.6, y + 1, 1.0)); shelf2.scale = (2.2, 1.2, 2.0); bevel(shelf2, .05, 3)
    for i in range(5):
        x = rnd.uniform(2, 4.6); h = rnd.uniform(.4, 1.0)
        c = add_prim('cyl', "Fundo pote %d" % i, mat("Pote %d" % i, palette[2 + i % 2], 0, .35, coat=.3), None, coll, radius=rnd.uniform(.14, .25), depth=h, vertices=48, location=(x, y - .1 + rnd.uniform(-.3, .3), 1.2 + h / 2)); bevel(c, .03, 3)
    for i in range(3):
        s = add_prim('sphere', "Fundo esfera %d" % i, mat("Esfera fundo %d" % i, palette[i % len(palette)], 0, .4, coat=.4), None, coll, radius=rnd.uniform(.25, .45), segments=48, ring_count=24, location=(rnd.uniform(-5, -2.4), y - .6 + rnd.uniform(-.5, .5), 2.0 + .4 * i if i == 0 else rnd.uniform(.3, .5))); smooth(s)
    for i in range(4):
        b = add_prim('cube', "Fundo livro %d" % i, mat("Livro fundo %d" % i, palette[i % len(palette)], 0, .6), None, coll, size=1, location=(-3.3 + i * .05, y - .2, 2.05 + i * .13)); b.scale = (1.0 - i * .1, .7, .12); b.rotation_euler = (0, 0, rnd.uniform(-.2, .2)); bevel(b, .02, 2)

def setup_render(sc, layer, cam, focus_obj=None, fstop=2.8):
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.cycles.use_adaptive_sampling = True
    sc.render.use_persistent_data = True
    sc.cycles.denoising_quality = 'FAST'; sc.cycles.denoising_prefilter = 'NONE'; sc.cycles.denoising_input_passes = 'RGB_ALBEDO'
    sc.cycles.max_bounces = 5; sc.cycles.diffuse_bounces = 1; sc.cycles.glossy_bounces = 2; sc.cycles.transmission_bounces = 4; sc.cycles.transparent_max_bounces = 8
    sc.cycles.volume_step_rate = 2.0; sc.cycles.volume_max_steps = 96; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = .5
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    if layer == 'obj':
        sc.render.resolution_x, sc.render.resolution_y = 720, 1280; sc.cycles.samples = 10; sc.cycles.adaptive_threshold = .06
        sc.render.film_transparent = True
    else:
        sc.render.resolution_x, sc.render.resolution_y = 360, 640; sc.cycles.samples = 10; sc.cycles.adaptive_threshold = .08
        sc.render.film_transparent = False
    cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = fstop
    if focus_obj: cam.data.dof.focus_object = focus_obj
    sc.camera = cam

def make_camera(lens=70):
    cd = bpy.data.cameras.new("CAM principal"); cd.lens = lens; cd.sensor_width = 36
    c = bpy.data.objects.new("CAM principal", cd); link(c); return c

def look(cam, target, roll=0.0):
    d = Vector(target) - cam.location; q = d.to_track_quat('-Z', 'Y'); e = q.to_euler(); e.rotate_axis('Z', roll) if False else None
    cam.rotation_euler = q.to_euler(); cam.rotation_euler.rotate_axis('Z', 0)
    if roll: cam.rotation_euler = (q @ Euler((0, 0, roll)).to_quaternion()).to_euler()

def key_all(objs, f):
    for o in objs:
        o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f)

def world(color, strength=.4):
    w = bpy.data.worlds.new("Mundo"); w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = color; bg.inputs[1].default_value = strength
    bpy.context.scene.world = w

def hide_for_layer(layer, objs_coll, set_coll):
    """obj: cenário invisível à câmera (ainda reflete/ilumina). bg: objetos invisíveis à câmera (ainda fazem sombra)."""
    if layer == 'obj':
        for o in set_coll.all_objects: o.visible_camera = False
    elif layer == 'bg':
        for o in objs_coll.all_objects:
            if o.type in ('MESH', 'FONT', 'CURVE'):
                o.visible_camera = False; o.visible_glossy = o.visible_glossy

# ================================================================== CENAS
# cada cena tem N quadros + 12 de "alça" para transições
SCENES = {1: 195, 2: 180, 3: 240, 4: 180, 5: 165}
HANDLE = 12

def cena1(layer):  # O INÍCIO — bússola, fundo bege
    sc = reset(); objs = collection("OBJETOS"); sets = collection("CENÁRIO E LUZ")
    world(hexc("#EADCC8"), .35); mm = M()
    ciclorama(hexc("#E8D7C1"), sets); props_fundo(sets, [hexc("#E9C9A4"), hexc("#F2E6D4"), hexc("#E0B48A"), hexc("#F5EFE6")], 3)
    studio(sets, warm=1.0, key=1000, rim=700)
    root, needle = bussola(mm, objs)
    parts = particulas(mm, objs, 14, (3.2, 2.0, 2.4), 11, mats=('gold', 'white', 'goldp'))
    cam = make_camera(75); setup_render(sc, layer, cam, root, 2.2); hide_for_layer(layer, objs, sets)
    N = SCENES[1] + 2 * HANDLE
    for f in range(1, N + 1):
        t = (f - 1 - HANDLE) / FPS
        # bússola: entra girando com inércia e assenta de frente
        spin = (1 - ease_out(prog(t, -.4, 4.6))) * math.radians(-330)
        root.location = (0, 0, 1.75 + math.sin(t * 1.3) * .06)
        root.rotation_euler = Euler((math.radians(90) - math.radians(14) * (1 - ease_io(prog(t, 0, 5))) + math.sin(t * .9) * .03,
                                     math.sin(t * .7) * .05, spin + math.sin(t * .5) * .04), 'XYZ')
        # agulha: oscila (mola amortecida) e aponta para o norte
        a = math.radians(160) * math.exp(-t * .9) * math.cos(t * 5.2) + math.radians(-25) * (1 - ease_io(prog(t, 2.5, 4.5)))
        needle.rotation_euler = (0, 0, a + math.radians(18))
        # câmera: aproximação lenta (dolly) com leve órbita
        p = ease_io(prog(t, -.4, 6.8))
        ang = lerp(math.radians(-18), math.radians(6), p)
        dist = lerp(15.0, 9.8, p)
        cam.location = (math.sin(ang) * dist, -math.cos(ang) * dist, lerp(2.4, 1.95, p))
        look(cam, (0, 0, 1.75))
        # saída: whip pan para a direita
        w = prog(t, 6.25, 6.9)
        if w > 0: cam.location.x += ease_inout5(w) * 3.5; look(cam, (ease_inout5(w) * 6, 0, 1.75))
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
        key_all([root, needle], f)
        for P in parts:
            P['o'].location = P['base'] + Vector((math.sin(t * .8 + P['ph']), math.cos(t * .6 + P['ph']), math.sin(t * .9 + P['ph'] * 2))) * P['amp'] + Vector((0, 0, 1.75))
            P['o'].rotation_euler = (P['rs'] * t).to_tuple(); key_all([P['o']], f)
    sc.frame_start, sc.frame_end = 1, N
    return sc

def cena2(layer):  # O CHAMADO — porta, fundo branco
    sc = reset(); objs = collection("OBJETOS"); sets = collection("CENÁRIO E LUZ")
    world(hexc("#F3F2EF"), .45); mm = M()
    ciclorama(hexc("#F1F0EC"), sets); props_fundo(sets, [hexc("#E7E4DE"), hexc("#F6F5F2"), hexc("#D9D3C9"), hexc("#EFE9DF")], 5)
    studio(sets, warm=.6, key=700, rim=500, fill=260)
    root, hinge, glow = porta(mm, objs)
    root.location = (0, 0, .35)
    # luz atrás da porta (lança luz pelo vão no chão e no ar)
    beam = area("Luz através da porta", (0, 3.0, 1.6), (0, -6, .2), 0, (1.2, 2.4), (1, .93, .8), objs, spread=40)
    parts = particulas(mm, objs, 10, (3.0, 2.2, 1.8), 21, kinds=('sphere', 'cube'), mats=('gold', 'white'))
    cam = make_camera(60); setup_render(sc, layer, cam, root, 3.2); hide_for_layer(layer, objs, sets)
    cam.data.dof.focus_object = None
    N = SCENES[2] + 2 * HANDLE
    for f in range(1, N + 1):
        t = (f - 1 - HANDLE) / FPS
        # aparição: porta sobe suavemente do chão com rotação (inércia)
        a = ease_out(prog(t, -.3, 1.6))
        root.location = (0, 0, lerp(-2.6, .35, a) + math.sin(t * 1.1) * .03)
        root.rotation_euler = (0, 0, lerp(math.radians(-55), math.radians(-14), a) + math.sin(t * .5) * .02)
        op = ease_inout5(prog(t, 1.8, 4.6))
        hinge.rotation_euler = (0, 0, math.radians(-104) * op)
        beam.data.energy = 9000 * ease_io(prog(t, 1.9, 3.8))
        glow.active_material.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 14
        p = ease_io(prog(t, -.4, 6.4)); ang = lerp(math.radians(-34), math.radians(-6), p)
        dist = lerp(10.5, 7.2, p)
        cam.location = (math.sin(ang) * dist, -math.cos(ang) * dist, lerp(1.2, 1.55, p))
        look(cam, (0, 0, 1.6))
        cam.data.dof.focus_distance = (cam.location - Vector((0, 0, 1.6))).length
        cam.data.keyframe_insert('dof.focus_distance', frame=f)
        w = prog(t, 5.75, 6.4)
        if w > 0: cam.location.x += ease_inout5(w) * 3; look(cam, (ease_inout5(w) * 6, 0, 1.6))
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
        key_all([root, hinge], f); beam.data.keyframe_insert('energy', frame=f)
        for P in parts:
            P['o'].location = P['base'] + Vector((math.sin(t * .8 + P['ph']), math.cos(t * .6 + P['ph']), math.sin(t * .9 + P['ph'] * 2))) * P['amp'] + Vector((0, -1.5, 1.6))
            P['o'].rotation_euler = (P['rs'] * t).to_tuple(); key_all([P['o']], f)
    sc.frame_start, sc.frame_end = 1, N
    return sc

def cena3(layer):  # OS TALENTOS — composição explodida, fundo azul acinzentado
    sc = reset(); objs = collection("OBJETOS"); sets = collection("CENÁRIO E LUZ")
    world(hexc("#AEB6C8"), .4); mm = M()
    ciclorama(hexc("#A9B2C6"), sets); props_fundo(sets, [hexc("#8E9AB8"), hexc("#C4CBDA"), hexc("#7383AE"), hexc("#DDE2EC")], 8)
    studio(sets, warm=.3, key=900, rim=700, fill=260)
    camf = camera_foto(mm, objs); bib, flips = biblia(mm, objs); mic = microfone(mm, objs); brush = pincel(mm, objs)
    hero = [  # objeto, posição base, escala, eixo de giro (rad/s), fase
        (camf, Vector((-.75, 0, 2.35)), .78, Vector((.15, .0, .55)), 0),
        (bib, Vector((.65, -.4, 1.05)), .72, Vector((.12, .1, -.3)), 1),
        (mic, Vector((1.55, .5, 2.45)), .6, Vector((.3, .2, .4)), 2),
        (brush, Vector((-1.6, .3, 1.2)), .7, Vector((.4, -.3, .2)), 3),
    ]
    for o, b, s, _, _ in hero: o.scale = (s, s, s)
    parts = particulas(mm, objs, 26, (2.6, 1.6, 1.8), 31, mats=('gold', 'white', 'red', 'blue', 'goldp'))
    focus = empty("Foco (anim)", coll=objs)
    cam = make_camera(55); setup_render(sc, layer, cam, focus, 2.8); hide_for_layer(layer, objs, sets)
    N = SCENES[3] + 2 * HANDLE
    for f in range(1, N + 1):
        t = (f - 1 - HANDLE) / FPS
        for i, (o, b, s, rs, ph) in enumerate(hero):
            ex = ease_out(prog(t, -.2 + i * .12, 1.6 + i * .12))  # “explosão”: saem do centro
            o.location = vlerp((0, 0, 1.8), b, ex) + Vector((math.sin(t * .7 + ph) * .06, math.cos(t * .5 + ph) * .05, math.sin(t * 1.1 + ph) * .08))
            if o is bib:  # Bíblia: sempre aberta para a câmera, balanço suave
                o.rotation_euler = Euler((math.radians(68) + math.sin(t * .7) * .12 + (1 - ex) * 1.2, math.sin(t * .5) * .15, math.radians(-12) + math.sin(t * .4) * .25 + (1 - ex) * 1.5), 'XYZ')
            elif o is camf:  # câmera fotográfica: giro lento 360 com leve inclinação
                o.rotation_euler = Euler((math.radians(8) + math.sin(t * .6) * .1 + (1 - ex) * 1.5, math.sin(t * .45) * .12, math.radians(-30) + t * math.radians(40) + (1 - ex) * 2), 'XYZ')
            else:
                o.rotation_euler = Euler((rs.x * t + ph * .4 + (1 - ex) * 2, rs.y * t, rs.z * t + ph + (1 - ex) * 3), 'XYZ')
            key_all([o], f)
        for k, (piv, pg, sd) in enumerate(flips):  # páginas virando em sequência
            p = ease_inout5(prog(t, 1.2 + k * .55, 2.4 + k * .55))
            piv.rotation_euler = (0, -math.pi * p * .96, 0)
            sd.angle = math.sin(p * math.pi) * math.radians(-70)
            piv.keyframe_insert('rotation_euler', frame=f); pg.keyframe_insert('modifiers["Curvatura"].angle', frame=f)
        for P in parts:
            ex = ease_out(prog(t, 0, 1.8))
            P['o'].location = P['base'] * (.2 + .8 * ex) + Vector((math.sin(t * .8 + P['ph']), math.cos(t * .6 + P['ph']), math.sin(t * .9 + P['ph'] * 2))) * P['amp'] + Vector((0, 0, 1.8))
            P['o'].rotation_euler = (P['rs'] * t).to_tuple(); key_all([P['o']], f)
        # câmera: começa perto da câmera fotográfica, recua (revela), orbita e termina na Bíblia
        p = ease_inout5(prog(t, -.3, 8.1))
        ang = lerp(math.radians(-38), math.radians(28), p)
        dist = 8.2 + 2.2 * math.sin(p * math.pi)
        tgt = vlerp((-.5, 0, 2.1), (.45, -.3, 1.35), ease_io(prog(t, 3.0, 7.6)))
        cam.location = Vector((math.sin(ang) * dist, -math.cos(ang) * dist, lerp(2.6, 2.0, p))) + Vector((tgt.x * .4, 0, 0))
        look(cam, tgt + Vector((0, 0, .75)), roll=math.radians(4) * math.sin(t * .4))
        focus.location = tgt
        w = prog(t, 7.75, 8.4)
        if w > 0: cam.location.z += ease_inout5(w) * 2.5; look(cam, tgt + Vector((0, 0, ease_inout5(w) * 5)))
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f); focus.keyframe_insert('location', frame=f)
    sc.frame_start, sc.frame_end = 1, N
    return sc

def cena4(layer):  # A RESPOSTA — chama, fundo vermelho escuro e preto
    sc = reset(); objs = collection("OBJETOS"); sets = collection("CENÁRIO E LUZ")
    world(hexc("#120203"), .25); mm = M()
    ciclorama(hexc("#3A0A0E"), sets); props_fundo(sets, [hexc("#2A0608"), hexc("#3C0B10"), hexc("#1A0405"), hexc("#4A0E14")], 13)
    area("Recorte quente", (3, 3, 4), (0, 0, 1.5), 500, (1, 4), (1, .5, .4), sets)
    area("Recorte frio", (-3.5, 2, 3), (0, 0, 1.5), 120, (1, 4), (.7, .75, 1), sets)
    root, layers, lamp = chama(objs)
    root.location = (0, 0, 1.2)
    stones = particulas(mm, objs, 9, (2.2, 1.4, 1.6), 41, kinds=('sphere',), mats=('blackg', 'goldp'))
    embers = []
    rnd = random.Random(5)
    em = mat("Brasa", (0, 0, 0, 1), emit=hexc("#FF8A2A"), estr=7)
    for i in range(22):
        e = add_prim('ico', "Brasa %d" % i, em, None, objs, subdivisions=1, radius=rnd.uniform(.012, .028)); embers.append((e, rnd.uniform(-.6, .6), rnd.uniform(-.4, .4), rnd.uniform(.25, .7), rnd.uniform(0, 3)))
        e.visible_shadow = False
    cam = make_camera(65); setup_render(sc, layer, cam, root, 2.0)
    sc.cycles.samples = 14; sc.cycles.volume_step_rate = 3.0
    if layer == 'obj': sc.render.resolution_x, sc.render.resolution_y = 540, 960
    sc.render.film_transparent = False  # volume emissivo: renderiza cena completa numa passada (camada 'obj')
    cam.data.dof.focus_object = None
    N = SCENES[4] + 2 * HANDLE
    for f in range(1, N + 1):
        t = (f - 1 - HANDLE) / FPS
        a = ease_out(prog(t, -.2, 1.4))
        s = lerp(.05, 1, a)
        root.scale = (s, s, s); root.location = (math.sin(t * .8) * .05, 0, 1.45 + math.sin(t * 1.2) * .05)
        root.rotation_euler = (math.sin(t * 1.7) * .04, math.sin(t * 1.3) * .05, t * .25)
        for k, (o, tc) in enumerate(layers):  # turbulência subindo + evolução do ruído
            tc.location = (math.sin(t * .7 + k) * .15, math.cos(t * .5) * .15, -t * 1.4); tc.keyframe_insert('location', frame=f)
            nzn = [n for n in o.active_material.node_tree.nodes if n.type == 'TEX_NOISE'][0]
            nzn.inputs["W"].default_value = t * .9; nzn.inputs["W"].keyframe_insert('default_value', frame=f)
        lamp.data.energy = 1500 * a * (1 + .12 * math.sin(t * 13) + .08 * math.sin(t * 23))
        lamp.data.keyframe_insert('energy', frame=f)
        for (e, x, y, sp, ph) in embers:
            z = ((t * sp + ph) % 2.4); e.location = (x * (1 + z * .3) + math.sin(t * 2 + ph) * .1, y, 1.6 + z)
            e.scale = [max(.01, 1 - z / 2.4) * a] * 3; e.keyframe_insert('location', frame=f); e.keyframe_insert('scale', frame=f)
        for P in stones:
            P['o'].location = P['base'] + Vector((math.sin(t * .6 + P['ph']), math.cos(t * .5 + P['ph']), math.sin(t * .7 + P['ph'] * 2))) * P['amp'] + Vector((0, .3, 1.7))
            P['o'].rotation_euler = (P['rs'] * t).to_tuple(); key_all([P['o']], f)
        p = ease_io(prog(t, -.4, 6.4))
        dist = lerp(8.5, 4.4, p); ang = lerp(math.radians(10), math.radians(-6), p)
        cam.location = (math.sin(ang) * dist, -math.cos(ang) * dist, lerp(1.9, 1.95, p))
        look(cam, (0, 0, 1.85))
        cam.data.dof.focus_distance = dist; cam.data.keyframe_insert('dof.focus_distance', frame=f)
        w = prog(t, 5.75, 6.4)
        if w > 0: cam.location.y += ease_inout5(w) * 3.2  # mergulho na chama
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)
        key_all([root], f); root.keyframe_insert('scale', frame=f)
    sc.frame_start, sc.frame_end = 1, N
    return sc

def cena5(layer):  # ENCERRAMENTO — cruz, cenário escuro, luz suave ao fundo
    sc = reset(); objs = collection("OBJETOS"); sets = collection("CENÁRIO E LUZ")
    world(hexc("#060607"), .2); mm = M()
    cyc = ciclorama(hexc("#0B0B0C"), sets)
    halo = add_prim('cyl', "Luz de fundo (halo)", None, None, sets, radius=3.6, depth=.01, vertices=96, location=(0, 7.0, 3.0), rotation=(math.pi / 2, 0, 0))
    hm = bpy.data.materials.new("Halo"); hm.use_nodes = True; nt = hm.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission"); gr = nt.nodes.new("ShaderNodeTexGradient"); gr.gradient_type = 'SPHERICAL'
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (.28, .28, .28)
    nt.links.new(tc.outputs["Object"], mp.inputs[0]); nt.links.new(mp.outputs[0], gr.inputs[0])
    cr = nt.nodes.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0, 0, 0, 1); cr.color_ramp.elements[1].color = hexc("#FFE2B8")
    cr.color_ramp.elements[1].position = 1; cr.color_ramp.elements[0].position = .25; cr.color_ramp.interpolation = 'EASE'
    nt.links.new(gr.outputs[0], cr.inputs[0]); nt.links.new(cr.outputs[0], em.inputs[0]); em.inputs[1].default_value = 1.6
    nt.links.new(em.outputs[0], out.inputs[0]); setmat(halo, hm); halo.visible_shadow = False
    area("Contra-luz", (0, 4, 3.2), (0, 0, 1.6), 550, (2.5, 2.5), (1, .88, .7), sets)
    area("Recorte esquerdo", (-3, 1.5, 3), (0, 0, 1.6), 350, (.8, 4), (1, .85, .75), sets)
    area("Recorte direito", (3, 1.5, 2.5), (0, 0, 1.6), 250, (.8, 4), (1, .4, .35), sets)
    area("Preenchimento suave", (0, -6, 2.5), (0, 0, 1.6), 60, (6, 3), (1, .95, .9), sets)
    softbox("Softbox reflexo (cruz)", (-2.2, -2.5, 2.5), (0, math.radians(60), math.radians(-35)), (.5, 4), 5, coll=sets)
    root = cruz(mm, objs)
    dust = particulas(mm, objs, 30, (3.0, 1.5, 2.2), 51, kinds=('sphere',), mats=('goldp',))
    for P in dust: P['o'].scale = (.35, .35, .35)
    cam = make_camera(70); setup_render(sc, layer, cam, root, 2.4); hide_for_layer(layer, objs, sets)
    N = SCENES[5] + 2 * HANDLE
    for f in range(1, N + 1):
        t = (f - 1 - HANDLE) / FPS
        a = ease_out(prog(t, -.2, 2.2))
        root.location = (0, 0, lerp(.6, 1.65, a) + math.sin(t * 1.0) * .04)
        root.rotation_euler = (math.sin(t * .6) * .03, 0, lerp(math.radians(-140), math.radians(0), ease_out(prog(t, -.2, 4.6))) + math.sin(t * .4) * .03)
        for P in dust:
            P['o'].location = P['base'] + Vector((math.sin(t * .4 + P['ph']), math.cos(t * .3 + P['ph']), t * .08 + math.sin(t * .5 + P['ph'] * 2) * .1)) * 1 + Vector((0, 0, 1.6))
            key_all([P['o']], f)
        p = ease_io(prog(t, -.4, 5.8))
        dist = lerp(13.5, 10.5, p); ang = lerp(math.radians(12), math.radians(0), p)
        cam.location = (math.sin(ang) * dist, -math.cos(ang) * dist, lerp(1.2, 1.55, p))
        look(cam, (0, 0, 1.7))
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f); key_all([root], f)
    sc.frame_start, sc.frame_end = 1, N
    return sc

BUILD = {1: cena1, 2: cena2, 3: cena3, 4: cena4, 5: cena5}

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    n, layer, a, b, out = int(argv[0]), argv[1], int(argv[2]), int(argv[3]), argv[4]
    sc = BUILD[n](layer if layer != 'blend' else 'obj')
    os.makedirs(out, exist_ok=True)
    if layer == 'blend':
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "cena%02d.blend" % n)); sys.exit(0)
    sc.frame_start, sc.frame_end = a, min(b, sc.frame_end)
    if layer == 'bg': sc.frame_step = 2  # fundo desfocado: 15 qps, interpolado na composição
    sc.render.filepath = os.path.join(out, "f_")
    bpy.ops.render.render(animation=True)
