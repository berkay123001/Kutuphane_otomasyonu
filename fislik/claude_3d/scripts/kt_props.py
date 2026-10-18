"""Masa üstü: banker lambası, açık kitap, fiş kutusu, damga, kitap yığını; tavan sarkıt lambaları."""
import math
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

import kt_common as C
import kt_layout as L
import kt_shelves as S

TOP = 1.09                     # fişlik dolabının üst yüzeyi
DY = L.DESK_Y


def _emissive(name, color, night_strength, **kw):
    """Gece modunda yanan malzeme; gücü kt_light gece/gündüz geçişinde ayarlanır."""
    mat = C.simple_material(name, kw.pop("base", color), **kw)
    bsdf = C.bsdf_of(mat)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.0
    mat["gece_emisyon"] = night_strength
    return mat


def _night_point(col, name, loc, energy, color, radius=0.03):
    light = bpy.data.objects.new(name, bpy.data.lights.new(name, "POINT"))
    light.data.energy = energy
    light.data.color = color
    light.data.shadow_soft_size = radius
    light.location = loc
    light["gece_isigi"] = 1
    col.objects.link(light)
    return light


def _place(obj, x, y, z, rot_deg=0.0):
    obj.location = (x, y, z)
    obj.rotation_euler.z = math.radians(rot_deg)
    return obj


# ---------------------------------------------------------------- banker lambası

def banker_lamp(col, mats):
    bm = bmesh.new()
    C.add_cylinder(bm, (0, 0, 0.011), 0.085, 0.022, segments=40)
    C.add_cylinder(bm, (0, 0, 0.029), 0.062, 0.014, segments=40)
    C.add_cylinder(bm, (0, 0.02, 0.19), 0.009, 0.31, segments=16)
    C.add_box(bm, (-0.012, -0.045, 0.335), (0.012, 0.03, 0.352))
    C.add_cylinder(bm, (0.05, -0.07, 0.265), 0.0015, 0.07, segments=6)
    C.add_sphere(bm, (0.05, -0.07, 0.228), 0.006)
    base = C.mesh_object("Lamba_Govde", bm, col, [mats["pirinc"]])
    for f in base.data.polygons:
        f.use_smooth = True

    bm = bmesh.new()
    length, ry, rz = 0.27, 0.088, 0.062
    arc = [(ry * math.cos(math.radians(a)), rz * math.sin(math.radians(a)))
           for a in range(-18, 199, 9)]
    left = [bm.verts.new((-length / 2, y, z)) for y, z in arc]
    right = [bm.verts.new((length / 2, y, z)) for y, z in arc]
    for i in range(len(arc) - 1):
        bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    bm.faces.new(list(reversed(left)))
    bm.faces.new(right)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    shade = C.mesh_object("Lamba_Abajur", bm, col, [mats["yesil_cam"], mats["opal"]], recalc=False)
    shade.location = (0, -0.035, 0.30)
    sol = shade.modifiers.new("Kalinlik", "SOLIDIFY")
    sol.thickness = 0.003
    sol.material_offset = 1
    shade.parent = base

    bm = bmesh.new()
    C.add_sphere(bm, (0, 0, 0), 0.022, segs=16)
    bulb = C.mesh_object("Lamba_Ampul", bm, col, [mats["ampul"]], recalc=False)
    bulb.location = (0, -0.035, 0.285)
    bulb.parent = base

    light = _night_point(col, "Lamba_Isigi", (0, -0.035, 0.265), 40.0, (1.0, 0.62, 0.32), 0.025)
    light.parent = base
    return _place(base, -0.55, DY + 0.17, TOP, 12)


# ---------------------------------------------------------------- açık kitap

def _page_half(bm, sign, w=0.165, d=0.235, nu=18, nv=4, z0=0.004):
    verts = []
    for i in range(nu + 1):
        u = i / nu
        z = z0 + 0.0035 + 0.017 * (1 - (1 - u) ** 3) * (1 - 0.3 * u)
        row = [bm.verts.new((sign * (0.003 + u * w), -d / 2 + d * j / nv, z)) for j in range(nv + 1)]
        verts.append(row)
    top = []
    for i in range(nu):
        for j in range(nv):
            q = (verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1])
            top.append(bm.faces.new(q if sign > 0 else tuple(reversed(q))))
    ring = [v[0] for v in verts] + verts[-1][1:] + [v[-1] for v in reversed(verts)][1:] \
        + list(reversed(verts[0]))[1:-1]
    low = [bm.verts.new((v.co.x, v.co.y, z0)) for v in ring]
    n = len(ring)
    for k in range(n):
        m = (k + 1) % n
        q = (ring[k], low[k], low[m], ring[m])
        bm.faces.new(q if sign > 0 else tuple(reversed(q)))
    for f in top:
        f.smooth = True


def text_page_material():
    mat = C.simple_material("Acik_Sayfa", (0.80, 0.74, 0.60), roughness=0.82)
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    tc = nodes.new("ShaderNodeTexCoord")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(tc.outputs["Object"], sep.inputs["Vector"])

    def math_node(op, a=None, b=None, clamp=False):
        n = nodes.new("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        for idx, val in enumerate((a, b)):
            if isinstance(val, (int, float)):
                n.inputs[idx].default_value = val
            elif val is not None:
                links.new(val, n.inputs[idx])
        return n.outputs[0]

    ax = math_node("ABSOLUTE", sep.outputs["X"])
    ay = math_node("ABSOLUTE", sep.outputs["Y"])
    in_x = math_node("MULTIPLY", math_node("GREATER_THAN", ax, 0.02),
                     math_node("LESS_THAN", ax, 0.152))
    in_y = math_node("LESS_THAN", ay, 0.092)
    stripes = math_node("GREATER_THAN", math_node("SINE", math_node("MULTIPLY", sep.outputs["Y"],
                                                                    2 * math.pi / 0.0052)), 0.55)
    words = nodes.new("ShaderNodeTexNoise")
    words.inputs["Scale"].default_value = 90.0
    links.new(tc.outputs["Object"], words.inputs["Vector"])
    word_mask = math_node("GREATER_THAN", words.outputs["Fac"], 0.42)
    ink = math_node("MULTIPLY", math_node("MULTIPLY", in_x, in_y),
                    math_node("MULTIPLY", stripes, word_mask))
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (0.80, 0.74, 0.60, 1)
    mix.inputs["B"].default_value = (0.16, 0.13, 0.11, 1)
    fac = math_node("MULTIPLY", ink, 0.75)
    links.new(fac, mix.inputs["Factor"])
    links.new(mix.outputs["Result"], C.bsdf_of(mat).inputs["Base Color"])
    return mat


def open_book(col, mats):
    bm = bmesh.new()
    layer = bm.loops.layers.float_color.new("kitap_renk")
    cover = C.add_box(bm, (-0.178, -0.125, 0), (0.178, 0.125, 0.004), 0)
    spine = C.add_box(bm, (-0.012, -0.125, -0.002), (0.012, 0.125, 0.006), 0)
    for f in cover | spine:
        for lp in f.loops:
            lp[layer] = (0.16, 0.025, 0.02, 0.3)
    _page_half(bm, 1)
    _page_half(bm, -1)
    for f in bm.faces:
        if f.material_index == 0 and f not in cover and f not in spine:
            f.material_index = 1
    obj = C.mesh_object("Acik_Kitap", bm, col, [mats["cilt"], mats["sayfa_yazi"]], recalc=False)
    return _place(obj, -0.06, DY - 0.2, TOP, -7)


# ---------------------------------------------------------------- fiş kutusu ve damga

def card_box(col, mats, seed=21):
    rng = random.Random(seed)
    w, d, h, t = 0.16, 0.40, 0.085, 0.009
    bm = bmesh.new()
    C.add_box(bm, (-w / 2, -d / 2, 0), (w / 2, d / 2, t))
    C.add_box(bm, (-w / 2, -d / 2, 0), (-w / 2 + t, d / 2, h))
    C.add_box(bm, (w / 2 - t, -d / 2, 0), (w / 2, d / 2, h))
    C.add_box(bm, (-w / 2, -d / 2, 0), (w / 2, -d / 2 + t, h))
    C.add_box(bm, (-w / 2, d / 2 - t, 0), (w / 2, d / 2, h))
    C.add_box(bm, (-0.035, -d / 2 - 0.003, 0.03), (0.035, -d / 2, 0.06), 1)
    box = C.mesh_object("Fis_Kutusu", bm, col, [mats["ahsap"], mats["pirinc"]])
    C.add_bevel(box, width=0.0015)

    bm = bmesh.new()
    y = -d / 2 + t + 0.004
    i = 0
    while y < d / 2 - t - 0.03:
        tab = i % 9 == 0
        lean = math.radians(rng.uniform(4, 13))
        M = Matrix.Translation((0, y, t)) @ Matrix.Rotation(-lean, 4, "X")
        ch = 0.078 if not tab else 0.072
        C.add_box(bm, (-0.064, 0, 0), (0.064, 0.0006, ch), 0, M)
        if tab:
            x0 = rng.choice((-0.055, -0.02, 0.015))
            C.add_box(bm, (x0, 0, ch), (x0 + 0.035, 0.0006, ch + 0.014), 1, M)
        y += rng.uniform(0.0035, 0.0055)
        i += 1
    cards = C.mesh_object("Kataloq_Fisleri", bm, col, [mats["kart"], mats["kart_sekme"]])
    cards.parent = box

    bm = bmesh.new()
    M = Matrix.Translation((0, 0.02, t + 0.045)) @ Matrix.Rotation(math.radians(6), 4, "X")
    C.add_box(bm, (-0.064, 0, 0), (0.064, 0.0006, 0.078), 0, M)
    C.add_box(bm, (0.02, 0, 0.078), (0.055, 0.0006, 0.092), 1, M)
    picked = C.mesh_object("Secili_Fis", bm, col, [mats["kart"], mats["kart_kirmizi"]])
    picked.parent = box
    return _place(box, 0.5, DY + 0.02, TOP, 4)


def stamp_set(col, mats):
    bm = bmesh.new()
    C.add_box(bm, (-0.055, -0.04, 0), (0.055, 0.04, 0.014), 0)
    C.add_box(bm, (-0.047, -0.032, 0.012), (0.047, 0.032, 0.0155), 1)
    pad = C.mesh_object("Istampa", bm, col, [mats["metal_koyu"], mats["murekkep"]])
    C.add_bevel(pad, width=0.002)
    _place(pad, 0.2, DY + 0.24, TOP, -10)

    bm = bmesh.new()
    C.add_box(bm, (-0.022, -0.016, 0), (0.022, 0.016, 0.012), 1)
    C.add_box(bm, (-0.025, -0.019, 0.012), (0.025, 0.019, 0.024), 0)
    C.add_cylinder(bm, (0, 0, 0.055), 0.009, 0.06, segments=16)
    C.add_sphere(bm, (0, 0, 0.095), 0.021, segs=20)
    stamp = C.mesh_object("Damga", bm, col, [mats["ahsap"], mats["murekkep"]])
    for f in stamp.data.polygons:
        f.use_smooth = len(f.vertices) == 4
    return _place(stamp, 0.31, DY + 0.18, TOP, 20)


def desk_books(col, mats, seed=5):
    rng = random.Random(seed)
    bm = bmesh.new()
    layer = bm.loops.layers.float_color.new("kitap_renk")
    z = 0.0
    for color in ((0.13, 0.06, 0.025), (0.025, 0.06, 0.04), (0.2, 0.035, 0.03), (0.4, 0.33, 0.22)):
        t, length, d = rng.uniform(0.025, 0.045), rng.uniform(0.22, 0.27), rng.uniform(0.16, 0.19)
        M = Matrix.Translation((length / 2, -d / 2 + rng.uniform(-0.01, 0.01), z)) \
            @ Matrix.Rotation(math.radians(rng.uniform(-6, 6)), 4, "Z") @ S.ROT_FLAT \
            @ Matrix.Translation((0, 0, -length / 2))
        S.add_book(bm, layer, rng, M, t, d, length, color, "deri", True, rng.random() < 0.5)
        z += t
    obj = C.mesh_object("Masa_Kitaplari", bm, col, [mats["cilt"], mats["sayfa"], mats["altin"]],
                        recalc=False)
    return _place(obj, -0.62, DY - 0.16, TOP, 18)


# ---------------------------------------------------------------- sarkıt lambalar

def pendants(col, mats):
    out = []
    for i, x in enumerate((-1.2, 1.2)):
        bm = bmesh.new()
        C.add_cylinder(bm, (0, 0, 0.6), 0.004, 0.92, segments=8)
        C.add_cylinder(bm, (0, 0, 1.07), 0.05, 0.02, segments=24)
        C.add_cylinder(bm, (0, 0, 0.115), 0.032, 0.05, segments=24)
        body = C.mesh_object(f"Sarkit_{i}", bm, col, [mats["pirinc"]])
        bm = bmesh.new()
        C.add_sphere(bm, (0, 0, 0.0), 0.095, segs=32)
        globe = C.mesh_object(f"Sarkit_{i}_Kure", bm, col, [mats["opal_kure"]], recalc=False)
        globe.parent = body
        light = _night_point(col, f"Sarkit_{i}_Isigi", (0, 0, 0.0), 38.0, (1.0, 0.66, 0.38), 0.1)
        light.parent = body
        body.location = (x, 1.05, L.CEIL - 0.26 - 1.08)
        out.append(body)
    return out


def materials():
    names = ("Kitap_Cilt", "Kitap_Sayfa", "Altin_Varak")
    if all(n in bpy.data.materials for n in names):
        book = {n: bpy.data.materials[n] for n in names}
    else:
        book = {m.name: m for m in S.book_materials()}
    return {
        "pirinc": C.brass_material("Pirinc_Aksesuar"),
        "yesil_cam": _emissive("Lamba_Yesil_Cam", (0.1, 0.9, 0.25), 0.35,
                               base=(0.01, 0.16, 0.045), roughness=0.06, **{"Coat Weight": 1.0}),
        "opal": _emissive("Lamba_Opal", (1.0, 0.85, 0.6), 6.0, base=(0.9, 0.88, 0.8), roughness=0.4),
        "ampul": _emissive("Lamba_Ampul", (1.0, 0.7, 0.4), 40.0, base=(0.9, 0.9, 0.85),
                           roughness=0.1),
        "opal_kure": _emissive("Sarkit_Opal", (1.0, 0.8, 0.55), 1.2, base=(0.62, 0.58, 0.5),
                               roughness=0.25, **{"Subsurface Weight": 0.6}),
        "cilt": book["Kitap_Cilt"],
        "sayfa": book["Kitap_Sayfa"],
        "altin": book["Altin_Varak"],
        "sayfa_yazi": text_page_material(),
        "ahsap": bpy.data.materials["Ahsap_Raf"],
        "kart": C.simple_material("Katalog_Karti", (0.78, 0.72, 0.58), roughness=0.85),
        "kart_sekme": C.simple_material("Katalog_Sekme", (0.62, 0.5, 0.3), roughness=0.85),
        "kart_kirmizi": C.simple_material("Katalog_Sekme_Kirmizi", (0.45, 0.06, 0.04), roughness=0.8),
        "metal_koyu": C.simple_material("Metal_Koyu", (0.05, 0.05, 0.05), roughness=0.35, metallic=1.0),
        "murekkep": C.simple_material("Murekkep", (0.02, 0.015, 0.02), roughness=0.6),
    }


def build(col_name="Aksesuar"):
    C.clear_collection(col_name)
    col = C.collection(col_name)
    mats = materials()
    banker_lamp(col, mats)
    open_book(col, mats)
    card_box(col, mats)
    stamp_set(col, mats)
    desk_books(col, mats)
    pendants(col, mats)
    return col
