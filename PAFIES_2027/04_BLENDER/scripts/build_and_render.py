"""PAFIES 2027 — Produção 3D (Blender 5.x / bpy)

Constrói todas as cenas 3D da campanha, salva os .blend editáveis e renderiza
sequências PNG com transparência (RGBA) para composição no Remotion / After Effects.

Uso:
  python build_and_render.py build            # só constrói e salva os .blend
  python build_and_render.py render <job>     # renderiza um job (phone, num10, apple, can, rice, milk, heart)
  python build_and_render.py render all
"""
import bpy, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND_DIR = os.path.join(ROOT, "blend")
RENDER_DIR = os.path.join(ROOT, "renders")
FONT_BLACK = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"

# ---------- Paleta PAFIES (sRGB) ----------
ROYAL = "#1E40C8"
ROYAL_DEEP = "#0A1A5C"
YELLOW = "#FFD000"
BLACK = "#0A0A0F"
WHITE = "#F5F5F2"


def lin(hexstr, a=1.0):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[f(v) for v in c], a)


# ---------- utilidades ----------
def new_scene(name, res=(720, 720), frames=72):
    sc = bpy.data.scenes.new(name)
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 20
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.fps = 30
    sc.frame_start, sc.frame_end = 1, frames
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.compression = 40
    sc.view_settings.view_transform = "Standard"
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    w = bpy.data.worlds.new(name + "_World")
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = lin(ROYAL_DEEP)
    bg.inputs["Strength"].default_value = 0.35
    sc.world = w
    bpy.context.window_manager  # noqa
    return sc


def link(sc, ob):
    sc.collection.objects.link(ob)
    return ob


def mat(name, color, metallic=0.0, rough=0.4, coat=0.0, emission=None, estr=0.0, sss=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(color) if isinstance(color, str) else color
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Subsurface Weight"].default_value = sss
    if emission:
        b.inputs["Emission Color"].default_value = lin(emission)
        b.inputs["Emission Strength"].default_value = estr
    return m


def band_mat(name, base, band, lo, hi, metallic=0.0, rough=0.35, coat=0.3):
    """Material com faixa horizontal (rótulos de embalagem) via coordenada Generated Z."""
    m = mat(name, base, metallic, rough, coat)
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.interpolation = "CONSTANT"
    cr.elements[0].position = 0.0
    cr.elements[0].color = lin(base)
    cr.elements[1].position = lo
    cr.elements[1].color = lin(band)
    e = cr.elements.new(hi)
    e.color = lin(base)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def mesh_obj(sc, name, op, **kw):
    op(**kw)
    ob = bpy.context.active_object
    ob.name = name
    # mover do cenário temporário para o alvo
    for c in ob.users_collection:
        c.objects.unlink(ob)
    sc.collection.objects.link(ob)
    return ob


def add_bevel(ob, width=0.05, seg=4):
    m = ob.modifiers.new("Bevel", "BEVEL")
    m.width, m.segments = width, seg
    m.limit_method = "ANGLE"
    return m


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def area_light(sc, name, loc, rot, color, power, size=2.0):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy, ld.size = power, size
    ld.color = lin(color)[:3]
    ob = bpy.data.objects.new(name, ld)
    ob.location, ob.rotation_euler = loc, [math.radians(a) for a in rot]
    return link(sc, ob)


def three_point(sc, scale=1.0):
    """Iluminação cinematográfica: key branca quente, rim azul royal, fill amarelo."""
    area_light(sc, "Key", (3.5 * scale, -3.5 * scale, 4 * scale), (50, 0, 45), "#FFF4E0", 900 * scale ** 2, 3)
    area_light(sc, "Rim_Royal", (-3.5 * scale, 3 * scale, 2.5 * scale), (-60, 0, 210), ROYAL, 1500 * scale ** 2, 2.5)
    area_light(sc, "Fill_Yellow", (-4 * scale, -2.5 * scale, -0.5 * scale), (95, 0, -60), YELLOW, 350 * scale ** 2, 4)


def camera(sc, loc, target=(0, 0, 0), lens=70, fstop=2.8, focus=None):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    ob = bpy.data.objects.new("Camera", cd)
    ob.location = loc
    link(sc, ob)
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    cd.dof.focus_distance = focus or d.length
    sc.camera = ob
    return ob


def key(ob, path, frame, value, interp="BEZIER"):
    setattr(ob, path, value) if not isinstance(value, tuple) else None
    if isinstance(value, tuple):
        setattr(ob, path, value)
    ob.keyframe_insert(data_path=path, frame=frame)


def loop_spin(ob, frames, axis=2, tilt=12):
    """Rotação 360° em loop perfeito + oscilação de inclinação (float)."""
    ob.rotation_euler = (math.radians(tilt), 0, 0)
    ob.keyframe_insert("rotation_euler", frame=1)
    r = list(ob.rotation_euler)
    r[axis] += math.radians(360)
    ob.rotation_euler = r
    ob.keyframe_insert("rotation_euler", frame=frames + 1)
    set_linear(ob)


def set_linear(ob):
    ad = ob.animation_data
    if not ad or not ad.action:
        return
    for fc in iter_fcurves(ad.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


def iter_fcurves(action):
    # Blender 4.4+/5.x: actions em camadas (slotted actions)
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        yield from action.fcurves
        return
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []):
                yield from bag.fcurves


# ---------- temporário p/ operadores ----------
TMP = bpy.data.scenes[0]
bpy.context.window_manager  # noqa


# ===================== CENAS =====================
def build_phone():
    sc = new_scene("PHONE", res=(720, 960), frames=150)
    sc.cycles.samples = 14
    sc.render.use_motion_blur = False
    # corpo
    body = mesh_obj(sc, "Phone_Body", bpy.ops.mesh.primitive_cube_add, size=1)
    body.scale = (0.78, 0.085, 1.6)
    bpy.ops.object.select_all(action="DESELECT")
    add_bevel(body, 0.075, 8)
    body.data.materials.append(mat("M_Phone_Metal", "#2A2D3A", metallic=0.9, rough=0.28, coat=1.0))
    # tela (emissiva, azul royal) — frente = -Y
    scr = mesh_obj(sc, "Phone_Screen", bpy.ops.mesh.primitive_plane_add, size=1)
    scr.rotation_euler = (math.radians(90), 0, 0)
    scr.scale = (0.72, 1.5, 1)
    scr.location = (0, -0.0436, 0)
    add_bevel(scr, 0.06, 6).affect = "VERTICES"
    scr.data.materials.append(mat("M_Screen", ROYAL, rough=0.08, coat=1.0, emission=ROYAL, estr=1.4))
    # textos da tela
    def txt(name, s, size, z, color, estr, extrude=0.004):
        cu = bpy.data.curves.new(name, "FONT")
        cu.body = s
        cu.font = bpy.data.fonts.load(FONT_BLACK, check_existing=True)
        cu.size = size
        cu.align_x, cu.align_y = "CENTER", "CENTER"
        cu.extrude = extrude
        ob = bpy.data.objects.new(name, cu)
        ob.rotation_euler = (math.radians(90), 0, 0)
        ob.location = (0, -0.046, z)
        ob.data.materials.append(mat("M_" + name, color, emission=color, estr=estr))
        return link(sc, ob)
    t10 = txt("Screen_10", "10ª", 0.5, 0.2, YELLOW, 6.0, 0.01)
    t1 = txt("Screen_EDICAO", "EDIÇÃO", 0.14, -0.15, WHITE, 3.0)
    t2 = txt("Screen_PAFIES", "PAFIES 2027", 0.1, -0.36, YELLOW, 4.0)
    # câmera traseira + ilha
    isl = mesh_obj(sc, "Cam_Island", bpy.ops.mesh.primitive_cube_add, size=1)
    isl.scale = (0.3, 0.03, 0.3)
    isl.location = (0.17, 0.045, 0.56)
    add_bevel(isl, 0.06, 6)
    isl.data.materials.append(mat("M_Island", "#15151C", metallic=1, rough=0.3))
    for i, (x, z) in enumerate([(0.1, 0.63), (0.24, 0.63), (0.1, 0.49)]):
        ln = mesh_obj(sc, f"Lens_{i}", bpy.ops.mesh.primitive_cylinder_add, radius=0.06, depth=0.04, vertices=48)
        ln.rotation_euler = (math.radians(90), 0, 0)
        ln.location = (x, 0.065, z)
        ln.data.materials.append(mat("M_Lens", "#050508", metallic=0.2, rough=0.02, coat=1))
    # notch
    pn = mesh_obj(sc, "Punch", bpy.ops.mesh.primitive_cylinder_add, radius=0.025, depth=0.01, vertices=32)
    pn.rotation_euler = (math.radians(90), 0, 0)
    pn.location = (0, -0.047, 0.69)
    pn.data.materials.append(mat("M_Punch", BLACK, rough=0.1))
    # rig: Null (Empty) controla tudo — equivalente ao Null Object do AE
    rig = bpy.data.objects.new("RIG_Phone", None)
    link(sc, rig)
    for ob in [body, scr, t10, t1, t2, isl, pn] + [o for o in sc.objects if o.name.startswith("Lens_")]:
        ob.parent = rig
    # animação: entra girando, desacelera, flutua
    rig.rotation_euler = (math.radians(8), 0, math.radians(-200))
    rig.location = (0, 0, -0.35)
    rig.keyframe_insert("rotation_euler", frame=1)
    rig.keyframe_insert("location", frame=1)
    rig.rotation_euler = (math.radians(-4), 0, math.radians(-14))
    rig.location = (0, 0, 0.0)
    rig.keyframe_insert("rotation_euler", frame=70)
    rig.keyframe_insert("location", frame=70)
    rig.rotation_euler = (math.radians(4), 0, math.radians(14))
    rig.location = (0, 0, 0.08)
    rig.keyframe_insert("rotation_euler", frame=150)
    rig.keyframe_insert("location", frame=150)
    three_point(sc, 1.2)
    camera(sc, (0, -3.7, 0.15), (0, 0, 0), lens=60, fstop=4.0)
    return sc


def build_num10():
    sc = new_scene("NUM10", res=(800, 800), frames=120)
    sc.cycles.samples = 14
    sc.render.use_motion_blur = False
    cu = bpy.data.curves.new("TXT_10", "FONT")
    cu.body = "10"
    cu.font = bpy.data.fonts.load(FONT_BLACK, check_existing=True)
    cu.size = 2.2
    cu.align_x, cu.align_y = "CENTER", "CENTER"
    cu.extrude = 0.28
    cu.bevel_depth = 0.035
    cu.bevel_resolution = 4
    ob = bpy.data.objects.new("TXT_10", cu)
    ob.rotation_euler = (math.radians(90), 0, 0)
    link(sc, ob)
    m = mat("M_Gold_Yellow", YELLOW, metallic=0.25, rough=0.22, coat=1.0, emission=YELLOW, estr=0.15)
    ob.data.materials.append(m)
    ob.data.materials.append(mat("M_Edge_Royal", ROYAL, metallic=0.6, rough=0.25))
    rig = bpy.data.objects.new("RIG_10", None)
    link(sc, rig)
    ob.parent = rig
    rig.rotation_euler = (0, 0, math.radians(-90))
    rig.scale = (0.6, 0.6, 0.6)
    rig.keyframe_insert("rotation_euler", frame=1)
    rig.keyframe_insert("scale", frame=1)
    rig.rotation_euler = (math.radians(6), 0, math.radians(-12))
    rig.scale = (1, 1, 1)
    rig.keyframe_insert("rotation_euler", frame=40)
    rig.keyframe_insert("scale", frame=40)
    rig.rotation_euler = (math.radians(-6), 0, math.radians(14))
    rig.keyframe_insert("rotation_euler", frame=120)
    three_point(sc, 1.3)
    camera(sc, (0, -5.4, 0.3), (0, 0, 0), lens=55, fstop=5.6)
    return sc


def item_scene(name, res=400, frames=72):
    sc = new_scene(name, res=(res, res), frames=frames)
    sc.cycles.samples = 12
    three_point(sc, 0.8)
    camera(sc, (0, -5.2, 1.2), (0, 0, 0), lens=60, fstop=5.6)
    return sc


def build_apple():
    sc = item_scene("APPLE")
    a = mesh_obj(sc, "Apple", bpy.ops.mesh.primitive_uv_sphere_add, radius=1, segments=64, ring_count=32)
    for v in a.data.vertices:
        x, y, z = v.co
        r = math.sqrt(x * x + y * y)
        v.co.z = z * 0.88 - 0.28 * math.exp(-(r * r) / 0.06) * (1 if z > 0 else -0.6)
        v.co.x *= 1 + 0.06 * z
        v.co.y *= 1 + 0.06 * z
    smooth(a)
    a.modifiers.new("Sub", "SUBSURF").levels = 2
    a.data.materials.append(mat("M_Apple", "#D2141E", rough=0.28, coat=0.6, sss=0.08))
    st = mesh_obj(sc, "Stem", bpy.ops.mesh.primitive_cylinder_add, radius=0.045, depth=0.45)
    st.location = (0.03, 0, 0.75)
    st.rotation_euler = (0, math.radians(12), 0)
    st.data.materials.append(mat("M_Stem", "#4A2E14", rough=0.7))
    lf = mesh_obj(sc, "Leaf", bpy.ops.mesh.primitive_uv_sphere_add, radius=0.3, segments=24, ring_count=12)
    lf.scale = (1, 0.12, 0.45)
    lf.location = (0.3, 0, 0.88)
    lf.rotation_euler = (0, math.radians(-30), 0)
    smooth(lf)
    lf.data.materials.append(mat("M_Leaf", "#2E9E3A", rough=0.4, sss=0.1))
    return finish_item(sc, [a, st, lf])


def build_can():
    sc = item_scene("CAN")
    c = mesh_obj(sc, "Can", bpy.ops.mesh.primitive_cylinder_add, radius=0.75, depth=1.7, vertices=96)
    add_bevel(c, 0.06, 5)
    smooth(c)
    c.data.materials.append(mat("M_Can_Metal", "#C8CCD4", metallic=1.0, rough=0.22))
    lab = mesh_obj(sc, "Label", bpy.ops.mesh.primitive_cylinder_add, radius=0.755, depth=1.3, vertices=96)
    smooth(lab)
    lab.data.materials.append(mat("M_Can_Label", YELLOW, rough=0.35, coat=0.6))
    ring = mesh_obj(sc, "Label_Stripe", bpy.ops.mesh.primitive_cylinder_add, radius=0.762, depth=0.32, vertices=96)
    smooth(ring)
    ring.data.materials.append(mat("M_Stripe", ROYAL, rough=0.3, coat=0.5))
    return finish_item(sc, [c, lab, ring], tilt=18)


def build_rice():
    sc = item_scene("RICE")
    b = mesh_obj(sc, "Rice_Pack", bpy.ops.mesh.primitive_cube_add, size=1)
    b.scale = (1.15, 0.45, 1.75)
    add_bevel(b, 0.12, 6)
    b.data.materials.append(band_mat("M_Rice", WHITE, ROYAL, 0.28, 0.62, rough=0.45, coat=0.4))
    tag = mesh_obj(sc, "Rice_Seal", bpy.ops.mesh.primitive_cylinder_add, radius=0.3, depth=0.04, vertices=64)
    tag.rotation_euler = (math.radians(90), 0, 0)
    tag.location = (0, -0.235, 0.0)
    tag.data.materials.append(mat("M_Seal", YELLOW, rough=0.3, coat=0.8))
    return finish_item(sc, [b, tag])


def build_milk():
    sc = item_scene("MILK")
    b = mesh_obj(sc, "Milk_Body", bpy.ops.mesh.primitive_cube_add, size=1)
    b.scale = (0.8, 0.8, 1.6)
    add_bevel(b, 0.04, 3)
    b.data.materials.append(band_mat("M_Milk", WHITE, ROYAL, 0.12, 0.42, rough=0.4, coat=0.3))
    me = bpy.data.meshes.new("Milk_Roof")
    hx, hy, z0, z1 = 0.4, 0.4, 0.8, 1.25
    me.from_pydata([(-hx,-hy,z0),(hx,-hy,z0),(hx,hy,z0),(-hx,hy,z0),(-hx,0,z1),(hx,0,z1),(-hx,0,z1+0.18),(hx,0,z1+0.18),(-hx,0.04,z1),(hx,0.04,z1)],[],
                   [(0,1,5,4),(2,3,4,5),(0,4,3),(1,2,5),(4,5,7,6)])
    roof = bpy.data.objects.new("Milk_Roof", me); link(sc, roof)
    roof.data.materials.append(mat("M_Roof", WHITE, rough=0.4))
    cap = mesh_obj(sc, "Milk_Cap", bpy.ops.mesh.primitive_cylinder_add, radius=0.12, depth=0.12, vertices=32)
    cap.location = (0.18, -0.22, 1.02)
    cap.rotation_euler = (math.radians(-35), 0, 0)
    cap.data.materials.append(mat("M_Cap", YELLOW, rough=0.3))
    return finish_item(sc, [b, roof, cap])


def build_heart():
    sc = item_scene("HEART")
    cu = bpy.data.curves.new("Heart", "CURVE")
    cu.dimensions = "2D"
    sp = cu.splines.new("POLY")
    pts = []
    for i in range(120):
        t = 2 * math.pi * i / 120
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17, y / 17))
    sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts):
        p.co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    cu.fill_mode = "BOTH"
    cu.extrude = 0.3
    ob = bpy.data.objects.new("Heart", cu)
    link(sc, ob)
    rm = ob.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.03
    sm = ob.modifiers.new("Smooth", "SMOOTH"); sm.factor = 1.0; sm.iterations = 25
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.data.materials.append(mat("M_Heart", YELLOW, metallic=0.1, rough=0.2, coat=1.0))
    return finish_item(sc, [ob], tilt=0)


def finish_item(sc, parts, tilt=14):
    rig = bpy.data.objects.new("RIG_" + sc.name, None)
    link(sc, rig)
    for p in parts:
        p.parent = rig
    loop_spin(rig, sc.frame_end, tilt=tilt)
    return sc


BUILDERS = {
    "phone": build_phone, "num10": build_num10, "apple": build_apple, "can": build_can,
    "rice": build_rice, "milk": build_milk, "heart": build_heart,
}


def build_all():
    os.makedirs(BLEND_DIR, exist_ok=True)
    scenes = {k: f() for k, f in BUILDERS.items()}
    # remove a cena padrão vazia
    if TMP.name not in [s.name for s in scenes.values()] and len(bpy.data.scenes) > 1:
        bpy.data.scenes.remove(TMP)
    master = os.path.join(BLEND_DIR, "PAFIES2027_3D_MASTER.blend")
    bpy.ops.wm.save_as_mainfile(filepath=master)
    for k in BUILDERS:  # um .blend editável por elemento
        bpy.ops.wm.open_mainfile(filepath=master)
        isolate(k)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, f"PAFIES2027_{k.upper()}.blend"))
    return scenes


def isolate(job):
    keep = bpy.data.scenes[job.upper()]
    for s2 in list(bpy.data.scenes):
        if s2 != keep:
            bpy.data.scenes.remove(s2)
    return keep


def render(job):
    sc = isolate(job)
    out = os.path.join(RENDER_DIR, job)
    os.makedirs(out, exist_ok=True)
    sc.render.filepath = os.path.join(out, job + "_")
    bpy.ops.render.render(animation=True, scene=sc.name)


if __name__ == "__main__":
    args = sys.argv[1:]
    master = os.path.join(BLEND_DIR, "PAFIES2027_3D_MASTER.blend")
    if args[0] == "build":
        build_all()
        print("BLEND salvo:", master)
    elif args[0] == "render":
        jobs = list(BUILDERS) if args[1] == "all" else args[1:]
        for j in jobs:
            bpy.ops.wm.open_mainfile(filepath=master)
            render(j)
            print("RENDER OK:", j)
    elif args[0] == "still":  # prévia rápida de um frame
        bpy.ops.wm.open_mainfile(filepath=master)
        sc = isolate(args[1])
        sc.frame_set(int(args[2]))
        sc.render.filepath = os.path.join(RENDER_DIR, "_preview", f"{args[1]}_{args[2]}.png")
        bpy.ops.render.render(write_still=True, scene=sc.name)
