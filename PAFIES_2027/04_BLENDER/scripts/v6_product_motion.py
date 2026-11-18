"""PAFIES 2027 v6 — motion 3D estilo "product motion" (objetos explodindo e flutuando, cena monocromática,
luz de estúdio suave, ambiente desfocado com profundidade de campo).

Uso:
  python v6_product_motion.py build                 # cria e salva 04_BLENDER/blend/PAFIES2027_v6.blend
  python v6_product_motion.py still <CENA> <frame>  # prévia
  python v6_product_motion.py render <CENA> [...]   # sequência PNG em renders_v6/<CENA>/
Cenas: S1 (180f) S2 (240f) S3 (300f) S4 (240f) S5 (240f)
"""
import bpy, math, os, sys, random
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND = os.path.join(ROOT, "blend", "PAFIES2027_v6.blend")
OUT = os.path.join(ROOT, "renders_v6")
LOGO = os.path.abspath(os.path.join(ROOT, "..", "07_ASSETS", "logo", "pafies_logo_oficial_1600.png"))
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
RES = (540, 960)


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1,)


def mat(name, col, rough=0.45, metal=0.0, coat=0.25, sss=0.0, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin(col); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Coat Weight"].default_value = coat
    b.inputs["Subsurface Weight"].default_value = sss
    if emit:
        b.inputs["Emission Color"].default_value = lin(col); b.inputs["Emission Strength"].default_value = emit
    return m


class Scene:
    def __init__(self, name, frames, theme):
        self.sc = sc = bpy.data.scenes.new(name)
        sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 10
        sc.cycles.use_denoising = True; sc.cycles.max_bounces = 4; sc.render.use_persistent_data = True
        sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.fps = 30
        sc.frame_start, sc.frame_end = 1, frames
        sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGB"
        sc.view_settings.view_transform = "Standard"
        w = bpy.data.worlds.new(name + "_W"); w.use_nodes = True
        w.node_tree.nodes["Background"].inputs["Color"].default_value = lin(theme["world"])
        w.node_tree.nodes["Background"].inputs["Strength"].default_value = theme.get("wstr", 0.8)
        sc.world = w
        self.t = theme
        self.room()

    def link(self, ob):
        self.sc.collection.objects.link(ob); return ob

    def add(self, op, name, m=None, **kw):
        op(**kw); ob = bpy.context.active_object; ob.name = name
        for c in list(ob.users_collection): c.objects.unlink(ob)
        self.link(ob)
        if m: ob.data.materials.append(m)
        return ob

    def bevel(self, ob, w=0.05, seg=4):
        md = ob.modifiers.new("B", "BEVEL"); md.width = w; md.segments = seg; md.limit_method = "ANGLE"

    def smooth(self, ob):
        for p in ob.data.polygons: p.use_smooth = True

    def room(self):
        t = self.t
        wall = self.add(bpy.ops.mesh.primitive_plane_add, "Wall", mat("M_wall", t["wall"], 0.8, coat=0), size=30)
        wall.rotation_euler = (math.radians(90), 0, 0); wall.location = (0, 14, 5)
        floor = self.add(bpy.ops.mesh.primitive_plane_add, "Floor", mat("M_floor", t["floor"], 0.7, coat=0), size=40)
        floor.location = (0, 0, -3.2)
        desk = self.add(bpy.ops.mesh.primitive_cube_add, "Desk", mat("M_desk", t["desk"], 0.5), size=1)
        desk.scale = (14, 2.5, 0.35); desk.location = (0, 6.5, -2.6); self.bevel(desk, 0.06)
        rnd = random.Random(t["seed"])
        for i in range(9):  # objetos de cenário (ficam desfocados ao fundo)
            k = rnd.choice(["cyl", "box", "sph"])
            m = mat(f"M_prop{i}", rnd.choice(t["props"]), 0.5)
            x = rnd.uniform(-4.5, 4.5)
            if k == "cyl": ob = self.add(bpy.ops.mesh.primitive_cylinder_add, f"Prop{i}", m, radius=rnd.uniform(0.15, 0.35), depth=rnd.uniform(0.5, 1.6), vertices=32)
            elif k == "box": ob = self.add(bpy.ops.mesh.primitive_cube_add, f"Prop{i}", m, size=rnd.uniform(0.4, 0.9)); self.bevel(ob, 0.05)
            else: ob = self.add(bpy.ops.mesh.primitive_uv_sphere_add, f"Prop{i}", m, radius=rnd.uniform(0.2, 0.4)); self.smooth(ob)
            ob.location = (x * 1.3, 6.0 + rnd.uniform(0, 1.2), -2.2 + (ob.dimensions.z / 2))
        def area(n, loc, rot, col, power, size):
            ld = bpy.data.lights.new(n, "AREA"); ld.energy = power; ld.size = size; ld.color = lin(col)[:3]
            ob = bpy.data.objects.new(n, ld); ob.location = loc; ob.rotation_euler = [math.radians(a) for a in rot]; self.link(ob)
        area("Key", (-4, -5, 5), (55, 0, -35), "#FFFFFF", t.get("key", 1400), 6)
        area("Fill", (5, -4, 1), (80, 0, 50), t["fill"], 500, 6)
        area("Rim", (2, 5, 4), (-60, 0, 160), "#FFFFFF", 700, 3)
        cd = bpy.data.cameras.new("Cam"); cd.lens = 55; cd.dof.use_dof = True; cd.dof.aperture_fstop = 1.3
        cam = bpy.data.objects.new("Camera", cd); self.link(cam); self.sc.camera = cam
        cam.location = (0, -11, 0.3); cam.rotation_euler = (math.radians(89), 0, 0); cd.dof.focus_distance = 11
        self.cam = cam

    def dolly(self, frames, z0=-11, z1=-9.6, rot=4):
        c = self.cam
        c.location.y = z0; c.rotation_euler.z = math.radians(-rot / 2); c.keyframe_insert("location", frame=1); c.keyframe_insert("rotation_euler", frame=1)
        c.location.y = z1; c.rotation_euler.z = math.radians(rot / 2); c.keyframe_insert("location", frame=frames); c.keyframe_insert("rotation_euler", frame=frames)
        c.data.dof.focus_distance = abs(z1) + 0.5

    # ---------- biblioteca de objetos (estilo "clay" brilhante) ----------
    def obj(self, kind, col, size=1.0, name=None):
        name = name or f"{kind}_{len(self.sc.objects)}"
        m = mat("M_" + name, col, 0.38, coat=0.4) if kind != "text" else None
        if kind == "sphere":
            ob = self.add(bpy.ops.mesh.primitive_uv_sphere_add, name, m, radius=0.32 * size, segments=48, ring_count=24); self.smooth(ob)
        elif kind == "torus":
            ob = self.add(bpy.ops.mesh.primitive_torus_add, name, m, major_radius=0.32 * size, minor_radius=0.12 * size, major_segments=48, minor_segments=20); self.smooth(ob)
        elif kind == "capsule":
            ob = self.add(bpy.ops.mesh.primitive_cylinder_add, name, m, radius=0.13 * size, depth=0.7 * size, vertices=32); self.bevel(ob, 0.12 * size, 6); self.smooth(ob)
        elif kind == "cube":
            ob = self.add(bpy.ops.mesh.primitive_cube_add, name, m, size=0.45 * size); self.bevel(ob, 0.08 * size, 5)
        elif kind == "confetti":
            ob = self.add(bpy.ops.mesh.primitive_cube_add, name, m, size=1); ob.scale = (0.16 * size, 0.07 * size, 0.02 * size)
        elif kind in ("star", "heart"):
            cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; sp = cu.splines.new("POLY")
            pts = []
            if kind == "star":
                for i in range(10):
                    a = math.pi / 2 + i * math.pi / 5; r = 0.38 if i % 2 == 0 else 0.17
                    pts.append((math.cos(a) * r, math.sin(a) * r))
            else:
                for i in range(80):
                    a = 2 * math.pi * i / 80
                    pts.append((16 * math.sin(a) ** 3 / 40, (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 40))
            sp.points.add(len(pts) - 1)
            for p, (x, y) in zip(sp.points, pts): p.co = (x * size, y * size, 0, 1)
            sp.use_cyclic_u = True; cu.fill_mode = "BOTH"; cu.extrude = 0.1 * size; cu.bevel_depth = (0.04 * size if kind == "star" else 0); cu.bevel_resolution = 4
            ob = bpy.data.objects.new(name, cu); self.link(ob); ob.data.materials.append(m); ob.rotation_euler.x = math.radians(90)
        elif kind == "text":
            cu = bpy.data.curves.new(name, "FONT"); cu.body = col[1]; cu.font = bpy.data.fonts.load(FONT, check_existing=True)
            cu.size = size; cu.align_x = cu.align_y = "CENTER"; cu.extrude = 0.12 * size; cu.bevel_depth = 0.02 * size
            ob = bpy.data.objects.new(name, cu); self.link(ob); ob.data.materials.append(mat("M_" + name, col[0], 0.35, coat=0.6)); ob.rotation_euler.x = math.radians(90)
        return ob

    def explode(self, objs, center, start, spread=(1.8, 1.2, 3.0), seed=1, hold_drift=0.06, end=240):
        """Explosão: cada objeto sai do centro (escala 0) e desacelera até flutuar (ease-out + drift lento)."""
        rnd = random.Random(seed); center = Vector(center)
        for i, ob in enumerate(objs):
            ang = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(0.45, 1.0)
            tgt = Vector((center[0] + math.cos(ang) * spread[0] * r, center[1] + rnd.uniform(-spread[1], spread[1]), center[2] + math.sin(ang) * spread[2] * r))
            s0 = start + rnd.randint(0, 6); base = ob.scale.copy()
            r0 = Vector((rnd.uniform(-3, 3), rnd.uniform(-3, 3), rnd.uniform(-3, 3)))
            ob.location = center; ob.scale = (0.001, 0.001, 0.001); ob.keyframe_insert("location", frame=s0); ob.keyframe_insert("scale", frame=s0)
            ob.rotation_euler = (ob.rotation_euler.x + r0.x, r0.y, r0.z); ob.keyframe_insert("rotation_euler", frame=s0)
            ob.location = center + (tgt - Vector(center)) * 0.85; ob.scale = base * 1.08; ob.keyframe_insert("location", frame=s0 + 9); ob.keyframe_insert("scale", frame=s0 + 9)
            ob.scale = base; ob.keyframe_insert("scale", frame=s0 + 16)
            ob.location = tgt; ob.keyframe_insert("location", frame=s0 + 30)
            ob.location = tgt + (tgt - Vector(center)).normalized() * hold_drift * 10 + Vector((0, 0, rnd.uniform(-0.2, 0.2)))
            ob.keyframe_insert("location", frame=end)
            ob.rotation_euler = (ob.rotation_euler.x + r0.x * 0.4 + 0.6, r0.y * 1.3, r0.z * 1.3 + 0.8); ob.keyframe_insert("rotation_euler", frame=end)

    def float_bob(self, ob, frames, amp=0.08, spin=20):
        base = ob.location.copy(); r = ob.rotation_euler.copy()
        for f in range(1, frames + 1, 30):
            ob.location = base + Vector((0, 0, amp * math.sin(f / 15))); ob.keyframe_insert("location", frame=f)
        ob.rotation_euler = (r.x, r.y, r.z - math.radians(spin / 2)); ob.keyframe_insert("rotation_euler", frame=1)
        ob.rotation_euler = (r.x, r.y, r.z + math.radians(spin / 2)); ob.keyframe_insert("rotation_euler", frame=frames)

    # ---------- heróis ----------
    def megaphone(self, col="#FFC300"):
        m = mat("M_mega", col, 0.3, coat=0.6); mr = mat("M_mega_rim", "#E63946", 0.35, coat=0.5); md = mat("M_mega_dark", "#1A2E52", 0.5)
        rig = bpy.data.objects.new("MEGA", None); self.link(rig)
        bell = self.add(bpy.ops.mesh.primitive_cone_add, "Bell", m, radius1=0.95, radius2=0.28, depth=1.6, vertices=64); bell.rotation_euler.y = math.radians(90); bell.location = (0.4, 0, 0)
        sol = bell.modifiers.new("S", "SOLIDIFY"); sol.thickness = 0.05; self.smooth(bell)
        rim = self.add(bpy.ops.mesh.primitive_torus_add, "Rim", mr, major_radius=0.95, minor_radius=0.07, major_segments=64); rim.rotation_euler.y = math.radians(90); rim.location = (-0.4, 0, 0); self.smooth(rim)
        body = self.add(bpy.ops.mesh.primitive_cylinder_add, "Body", m, radius=0.3, depth=0.9, vertices=48); body.rotation_euler.y = math.radians(90); body.location = (1.6, 0, 0); self.bevel(body, 0.05)
        cap = self.add(bpy.ops.mesh.primitive_cylinder_add, "Cap", md, radius=0.32, depth=0.12, vertices=48); cap.rotation_euler.y = math.radians(90); cap.location = (2.08, 0, 0)
        hd = self.add(bpy.ops.mesh.primitive_cube_add, "Handle", md, size=1); hd.scale = (0.18, 0.16, 0.6); hd.location = (1.55, 0, -0.5); self.bevel(hd, 0.06)
        for o in (bell, rim, body, cap, hd): o.parent = rig
        return rig

    def logo_disc(self, d=2.2):
        rig = bpy.data.objects.new("LOGO", None); self.link(rig)
        side = mat("M_logo_side", "#0E2E9E", 0.35, coat=0.6)
        disc = self.add(bpy.ops.mesh.primitive_cylinder_add, "Disc", side, radius=d / 2, depth=0.28, vertices=96); disc.rotation_euler.x = math.radians(90); self.bevel(disc, 0.06, 6)
        img = bpy.data.images.load(LOGO, check_existing=True)
        lm = bpy.data.materials.new("M_logo_face"); lm.use_nodes = True; nt = lm.node_tree
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
        b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.3; b.inputs["Coat Weight"].default_value = 0.6
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"]); nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
        face = self.add(bpy.ops.mesh.primitive_plane_add, "Face", lm, size=d * 0.985); face.rotation_euler.x = math.radians(90); face.location.y = -0.145
        for o in (disc, face): o.parent = rig
        return rig

    def box(self):
        rig = bpy.data.objects.new("BOX", None); self.link(rig)
        m = mat("M_box", "#F2B24D", 0.6, coat=0.1); mi = mat("M_box_in", "#8A4A1C", 0.8, coat=0)
        b = self.add(bpy.ops.mesh.primitive_cube_add, "BoxBody", m, size=1); b.scale = (1.6, 1.2, 1.1); self.bevel(b, 0.03)
        inner = self.add(bpy.ops.mesh.primitive_cube_add, "BoxIn", mi, size=1); inner.scale = (1.5, 1.1, 0.02); inner.location.z = 0.54
        for sgn, axis in ((1, "x"), (-1, "x"), (1, "y"), (-1, "y")):
            fl = self.add(bpy.ops.mesh.primitive_cube_add, "Flap", m, size=1)
            if axis == "x": fl.scale = (0.03, 1.2, 0.55); fl.location = (sgn * 0.95, 0, 0.75); fl.rotation_euler.y = math.radians(-sgn * 35)
            else: fl.scale = (1.6, 0.03, 0.5); fl.location = (0, sgn * 0.75, 0.75); fl.rotation_euler.x = math.radians(sgn * 35)
            fl.parent = rig
        hm = self.obj("heart", "#E63946", 1.1, "BoxHeart"); hm.location = (0, -0.62, 0); hm.parent = rig
        for o in (b, inner): o.parent = rig
        return rig

    def food(self, kind):
        rig = bpy.data.objects.new(kind.upper(), None); self.link(rig)
        if kind == "apple":
            a = self.add(bpy.ops.mesh.primitive_uv_sphere_add, "Apple", mat("M_apple", "#E63946", 0.3, coat=0.7), radius=0.38, segments=48, ring_count=24); a.scale.z = 0.88; self.smooth(a)
            st = self.add(bpy.ops.mesh.primitive_cylinder_add, "Stem", mat("M_stem", "#4A2E14", 0.7), radius=0.03, depth=0.2); st.location.z = 0.38
            lf = self.add(bpy.ops.mesh.primitive_uv_sphere_add, "Leaf", mat("M_leaf", "#3FA34D", 0.4), radius=0.12); lf.scale = (1, 0.25, 0.45); lf.location = (0.12, 0, 0.42); self.smooth(lf)
            parts = [a, st, lf]
        elif kind == "can":
            c = self.add(bpy.ops.mesh.primitive_cylinder_add, "Can", mat("M_can", "#C9CDD6", 0.25, metal=0.9), radius=0.3, depth=0.8, vertices=48); self.bevel(c, 0.03)
            lb = self.add(bpy.ops.mesh.primitive_cylinder_add, "Label", mat("M_label", "#1E40C8", 0.4), radius=0.305, depth=0.5, vertices=48); self.smooth(lb)
            parts = [c, lb]
        elif kind == "rice":
            r = self.add(bpy.ops.mesh.primitive_cube_add, "Rice", mat("M_rice", "#F4EFE6", 0.6), size=1); r.scale = (0.55, 0.25, 0.8); self.bevel(r, 0.1, 6)
            lb = self.add(bpy.ops.mesh.primitive_cube_add, "RiceLabel", mat("M_rlabel", "#FFC300", 0.5), size=1); lb.scale = (0.56, 0.26, 0.22)
            parts = [r, lb]
        else:  # milk
            mb = self.add(bpy.ops.mesh.primitive_cube_add, "Milk", mat("M_milk", "#FFFFFF", 0.5), size=1); mb.scale = (0.42, 0.42, 0.8); self.bevel(mb, 0.03)
            lb = self.add(bpy.ops.mesh.primitive_cube_add, "MilkLabel", mat("M_mlabel", "#8EC5E8", 0.5), size=1); lb.scale = (0.43, 0.43, 0.3); lb.location.z = -0.1
            cp = self.add(bpy.ops.mesh.primitive_cylinder_add, "MilkCap", mat("M_cap", "#E63946", 0.4), radius=0.07, depth=0.08); cp.location = (0.1, 0, 0.45)
            parts = [mb, lb, cp]
        for p in parts: p.parent = rig
        return rig

    def person(self, i, col):
        """bonequinho 'toy' (galera): corpo cápsula, cabeça esfera, braços erguidos."""
        rig = bpy.data.objects.new(f"PESSOA_{i}", None); self.link(rig)
        skin = mat(f"M_skin{i}", ["#F2C3A0", "#C98A5E", "#8A5A3C", "#E0A57E", "#5A3A28"][i % 5], 0.45, sss=0.05)
        cm = mat(f"M_shirt{i}", col, 0.45, coat=0.3)
        body = self.add(bpy.ops.mesh.primitive_cylinder_add, f"Body{i}", cm, radius=0.32, depth=0.9, vertices=32); body.location.z = 0.45; self.bevel(body, 0.28, 8); self.smooth(body)
        head = self.add(bpy.ops.mesh.primitive_uv_sphere_add, f"Head{i}", skin, radius=0.26, segments=32, ring_count=16); head.location.z = 1.18; self.smooth(head)
        hair = self.add(bpy.ops.mesh.primitive_uv_sphere_add, f"Hair{i}", mat(f"M_hair{i}", "#2A1A12", 0.6), radius=0.27, segments=32, ring_count=16); hair.location.z = 1.24; hair.scale.z = 0.7; self.smooth(hair)
        arms = []
        for s in (-1, 1):
            arm = self.add(bpy.ops.mesh.primitive_cylinder_add, f"Arm{i}{s}", cm, radius=0.1, depth=0.55, vertices=16); self.bevel(arm, 0.07, 4); self.smooth(arm)
            piv = bpy.data.objects.new(f"Shoulder{i}{s}", None); self.link(piv); piv.location = (s * 0.3, 0, 0.75); piv.parent = rig
            arm.parent = piv; arm.location = (0, 0, 0.27)
            hand = self.add(bpy.ops.mesh.primitive_uv_sphere_add, f"Hand{i}{s}", skin, radius=0.09); hand.parent = piv; hand.location = (0, 0, 0.58); self.smooth(hand)
            piv.rotation_euler.y = math.radians(-s * 25); arms.append(piv)
        for p in (body, head, hair): p.parent = rig
        return rig, arms

    def jump(self, rig, arms, frames, phase, beat=15, height=0.55):
        """Pulo no tempo (1 por batida): antecipação (agacha), impulso, ar, aterrissagem com squash."""
        base = rig.location.copy()
        for f in range(1, frames + 1):
            t = ((f + phase) % beat) / beat
            air = math.sin(t * math.pi) if t > 0.15 else 0
            squash = (1 - t / 0.15) if t <= 0.15 else 0
            rig.location = base + Vector((0, 0, air * height)); rig.scale = (1 + squash * 0.12, 1 + squash * 0.12, 1 - squash * 0.15 + air * 0.05)
            rig.keyframe_insert("location", frame=f); rig.keyframe_insert("scale", frame=f)
            for k, a in enumerate(arms):
                s = -1 if k == 0 else 1
                a.rotation_euler.y = math.radians(-s * (40 + 40 * air)); a.keyframe_insert("rotation_euler", frame=f)


THEMES = {
    "S1": dict(world="#0A1430", wstr=0.25, wall="#0E1B3D", floor="#0B1530", desk="#13244F", props=["#1A2E52", "#22407A", "#0F1E44"], fill="#3A63F0", seed=1, key=600),
    "S2": dict(world="#C9D3F5", wall="#B9C6F2", floor="#AEB9EA", desk="#9FAEE6", props=["#8EA0E0", "#C7D1F6", "#7F92D8"], fill="#AFC3FF", seed=2),
    "S3": dict(world="#F7D9C4", wall="#F3C9A8", floor="#EDBE9C", desk="#E9B48E", props=["#F6E3D2", "#EFC39E", "#F9EBDD"], fill="#FFD2B0", seed=3),
    "S4": dict(world="#FFE7A3", wall="#FFD873", floor="#F5CC60", desk="#F2C24F", props=["#FFE9A8", "#F7D06A", "#FFF1C9"], fill="#FFE3A0", seed=4),
    "S5": dict(world="#C9D3F5", wall="#AFBDF0", floor="#A3B1E8", desk="#94A5E2", props=["#8EA0E0", "#C7D1F6", "#7F92D8"], fill="#AFC3FF", seed=5),
}


def build():
    random.seed(7)
    # S1 — megafone no escuro, luz subindo com batimentos
    s = Scene("S1", 180, THEMES["S1"]); s.dolly(180, -11, -9.2, 6)
    mg = s.megaphone(); mg.location = (-0.7, 0, 0.4); mg.scale = (0.8,) * 3; mg.rotation_euler = (0, math.radians(-14), math.radians(-48)); s.float_bob(mg, 180, 0.1, 30)
    rim = s.sc.objects["Rim"]; rim.data.energy = 50; rim.data.keyframe_insert("energy", frame=1)
    for f, e in ((14, 900), (20, 300), (45, 1100), (52, 400), (100, 1400), (150, 1600)):
        rim.data.energy = e; rim.data.keyframe_insert("energy", frame=f)
    s.explode([s.obj(k, c, sz) for k, c, sz in [("sphere", "#FFC300", 0.5), ("star", "#FFC300", 0.7), ("torus", "#3A63F0", 0.6), ("confetti", "#FFFFFF", 1), ("confetti", "#FFC300", 1), ("sphere", "#3A63F0", 0.4), ("star", "#FFFFFF", 0.5), ("capsule", "#E63946", 0.6)]],
              (-0.6, -0.5, 0.6), 98, spread=(1.8, 1.0, 2.8), seed=11, end=180)
    # S2 — logo em disco + explosão azul, "10"
    s = Scene("S2", 240, THEMES["S2"]); s.dolly(240, -11.5, -10, 5)
    lg = s.logo_disc(2.6); lg.location = (0, 0, 0.9)
    lg.scale = (0.001,) * 3; lg.keyframe_insert("scale", frame=1); lg.rotation_euler.z = math.radians(-120); lg.keyframe_insert("rotation_euler", frame=1)
    lg.scale = (1.08,) * 3; lg.keyframe_insert("scale", frame=12); lg.scale = (1,) * 3; lg.keyframe_insert("scale", frame=20)
    lg.rotation_euler.z = math.radians(-12); lg.keyframe_insert("rotation_euler", frame=24); lg.rotation_euler.z = math.radians(12); lg.keyframe_insert("rotation_euler", frame=240)
    objs = []
    for k, c, sz in [("star", "#FFC300", 0.9), ("star", "#FFFFFF", 0.6), ("heart", "#E63946", 0.8), ("torus", "#1E40C8", 0.8), ("sphere", "#FFC300", 0.6), ("sphere", "#1E40C8", 0.45),
                     ("capsule", "#FFFFFF", 0.8), ("cube", "#3A63F0", 0.7), ("confetti", "#FFC300", 1.2), ("confetti", "#E63946", 1.2), ("confetti", "#FFFFFF", 1.2), ("torus", "#FFC300", 0.5),
                     ("heart", "#FFFFFF", 0.5), ("star", "#1E40C8", 0.7), ("sphere", "#E63946", 0.35), ("capsule", "#1E40C8", 0.6)]:
        objs.append(s.obj(k, c, sz))
    s.explode(objs + [s.obj(k, c, sz) for k, c, sz in [('sphere', '#FFC300', 0.5), ('star', '#FFC300', 0.6), ('confetti', '#1E40C8', 1.2), ('torus', '#FFFFFF', 0.45), ('heart', '#E63946', 0.55), ('capsule', '#FFC300', 0.5), ('confetti', '#FFC300', 1.2), ('sphere', '#FFFFFF', 0.4)]], (0, 0, 0.9), 4, spread=(2.0, 1.6, 3.4), seed=21)
    ten = s.obj("text", ("#FFC300", "10ª"), 1.5, "TXT10"); ten.location = (0, -0.6, -1.5)
    ten.scale = (0.001,) * 3; ten.keyframe_insert("scale", frame=96); ten.scale = (1.1,) * 3; ten.keyframe_insert("scale", frame=106); ten.scale = (1,) * 3; ten.keyframe_insert("scale", frame=114)
    ten.rotation_euler.z = math.radians(-25); ten.keyframe_insert("rotation_euler", frame=96); ten.rotation_euler.z = math.radians(8); ten.keyframe_insert("rotation_euler", frame=240)
    # S3 — caixa de doação com alimentos explodindo (cena pêssego)
    s = Scene("S3", 300, THEMES["S3"]); s.dolly(300, -11.5, -9.8, 6)
    bx = s.box(); bx.location = (0, 0, -1.0); bx.rotation_euler = (math.radians(12), 0, math.radians(-25)); s.float_bob(bx, 300, 0.06, 14)
    items = []
    for k in ["apple", "can", "rice", "milk", "apple", "can"]:
        items.append(s.food(k))
    for k, c, sz in [("heart", "#E63946", 0.9), ("heart", "#FF6B5B", 0.6), ("sphere", "#FFC300", 0.4), ("confetti", "#FFFFFF", 1.2), ("confetti", "#E63946", 1.2), ("torus", "#FF8A3D", 0.5), ("star", "#FFC300", 0.6)]:
        items.append(s.obj(k, c, sz))
    s.explode(items, (0, 0, -0.4), 16, spread=(1.9, 1.4, 3.3), seed=31, end=300)
    big = s.obj("heart", "#E63946", 3.2, "BigHeart"); big.location = (0, -1.2, 0.4)
    big.scale = (0.001,) * 3; big.keyframe_insert("scale", frame=200); big.scale = (1.1,) * 3; big.keyframe_insert("scale", frame=212); big.scale = (1,) * 3; big.keyframe_insert("scale", frame=222)
    big.rotation_euler.z = math.radians(-15); big.keyframe_insert("rotation_euler", frame=200); big.rotation_euler.z = math.radians(10); big.keyframe_insert("rotation_euler", frame=300)
    # S4 — a galera (bonequinhos) pulando no tempo, cena amarela
    s = Scene("S4", 240, THEMES["S4"]); s.dolly(240, -11.5, -10.2, 6)
    cols = ["#1E40C8", "#E63946", "#FFFFFF", "#0B1F4D", "#FF6B5B", "#3A63F0", "#E63946", "#1E40C8", "#FFFFFF"]
    pos = [(-1.5, 1.4, -1.6), (0, 1.6, -1.6), (1.5, 1.4, -1.6), (-1.9, -0.2, -2.6), (-0.65, -0.1, -2.6), (0.65, -0.1, -2.6), (1.9, -0.2, -2.6), (-1.2, -1.6, -3.4), (1.2, -1.6, -3.4)]
    for i, (p, c) in enumerate(zip(pos, cols)):
        rig, arms = s.person(i, c); rig.location = p; rig.scale = (1.15,) * 3; rig.rotation_euler.z = math.radians(random.uniform(-20, 20))
        s.jump(rig, arms, 240, phase=(i * 4) % 15)
    cf = [s.obj("confetti", random.choice(["#1E40C8", "#E63946", "#FFFFFF", "#FF6B5B"]), 1.2) for _ in range(18)]
    s.explode(cf, (0, 0, 2.0), 2, spread=(2.2, 2.0, 1.6), seed=41)
    # S5 — final: logo herói + explosão + galera embaixo
    s = Scene("S5", 240, THEMES["S5"]); s.dolly(240, -12.5, -10.8, 5)
    lg = s.logo_disc(2.8); lg.location = (0, 0, 0.8)
    lg.scale = (0.001,) * 3; lg.keyframe_insert("scale", frame=1); lg.scale = (1.08,) * 3; lg.keyframe_insert("scale", frame=12); lg.scale = (1,) * 3; lg.keyframe_insert("scale", frame=20)
    lg.scale = (1.12,) * 3; lg.keyframe_insert("scale", frame=184); lg.scale = (1,) * 3; lg.keyframe_insert("scale", frame=196)
    lg.rotation_euler.z = math.radians(-14); lg.keyframe_insert("rotation_euler", frame=1); lg.rotation_euler.z = math.radians(14); lg.keyframe_insert("rotation_euler", frame=240)
    objs = [s.obj(k, c, sz) for k, c, sz in [("star", "#FFC300", 0.9), ("heart", "#E63946", 0.8), ("torus", "#FFC300", 0.7), ("sphere", "#1E40C8", 0.5), ("confetti", "#FFC300", 1.2), ("confetti", "#FFFFFF", 1.2),
                                             ("star", "#FFFFFF", 0.6), ("capsule", "#E63946", 0.6), ("cube", "#1E40C8", 0.6), ("sphere", "#FFC300", 0.4), ("heart", "#FFFFFF", 0.5), ("torus", "#1E40C8", 0.5)]]
    s.explode(objs, (0, 0, 0.8), 2, spread=(2.0, 1.6, 3.4), seed=51)
    objs2 = [s.obj("confetti", random.choice(["#FFC300", "#E63946", "#FFFFFF", "#1E40C8"]), 1.3) for _ in range(20)]
    s.explode(objs2, (0, 0, 0.8), 180, spread=(2.4, 2.0, 4.0), seed=52)
    for i in range(5):
        rig, arms = s.person(i, ["#1E40C8", "#E63946", "#FFFFFF", "#FF6B5B", "#0B1F4D"][i]); rig.location = (-1.8 + i * 0.9, -1.5, -3.4); rig.scale = (0.65,) * 3
        s.jump(rig, arms, 240, phase=(i * 5) % 15, height=0.4)
    for sc in list(bpy.data.scenes):
        if sc.name not in THEMES: bpy.data.scenes.remove(sc)
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)


def isolate(name):
    keep = bpy.data.scenes[name]
    for sc in list(bpy.data.scenes):
        if sc != keep: bpy.data.scenes.remove(sc)
    return keep


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "build":
        build(); print("BLEND OK", BLEND)
    elif a[0] == "still":
        bpy.ops.wm.open_mainfile(filepath=BLEND); sc = isolate(a[1]); sc.frame_set(int(a[2]))
        sc.render.filepath = os.path.join(OUT, "_preview", f"{a[1]}_{a[2]}.png"); bpy.ops.render.render(write_still=True, scene=sc.name)
    elif a[0] == "render":
        for name in a[1:]:
            bpy.ops.wm.open_mainfile(filepath=BLEND); sc = isolate(name)
            sc.render.filepath = os.path.join(OUT, name, name + "_"); bpy.ops.render.render(animation=True, scene=sc.name); print("RENDER OK", name)
