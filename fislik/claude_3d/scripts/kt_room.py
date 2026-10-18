"""Oda kabuğu: zemin, duvarlar, tavan kirişleri, kemerli pencere ve camı."""
import math

import bpy
import bmesh

import kt_common as C
import kt_layout as L

SEGS = 32


def arch_points(half_w, z0, z_spring, inset=0.0, segs=SEGS):
    r = half_w - inset
    pts = [(-r, z0 + inset), (r, z0 + inset)]
    for i in range(segs + 1):
        a = math.pi * i / segs
        pts.append((r * math.cos(a), z_spring + r * math.sin(a)))
    return pts


def arc_band(bm, r0, r1, z_spring, y0, y1, mat=0, segs=SEGS):
    """Kemer içindeki yarım daire kayıt (fanlight) çubuğu."""
    outer = [(r1 * math.cos(math.pi * i / segs), z_spring + r1 * math.sin(math.pi * i / segs))
             for i in range(segs + 1)]
    inner = [(r0 * math.cos(math.pi * i / segs), z_spring + r0 * math.sin(math.pi * i / segs))
             for i in range(segs + 1)]
    pts = outer + list(reversed(inner))
    return C.extrude_profile(bm, pts, y0, y1, mat)


def glass_material():
    mat = C._new_material("Pencere_Cami")
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        if n.type == "BSDF_PRINCIPLED":
            nodes.remove(n)
    out = next(n for n in nodes if n.type == "OUTPUT_MATERIAL")
    fres = nodes.new("ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.52
    clear = nodes.new("ShaderNodeBsdfTransparent")
    clear.inputs["Color"].default_value = (0.94, 0.97, 0.95, 1)
    gloss = nodes.new("ShaderNodeBsdfGlossy")
    gloss.inputs["Roughness"].default_value = 0.04
    mix1 = nodes.new("ShaderNodeMixShader")
    links.new(fres.outputs["Fac"], mix1.inputs["Fac"])
    links.new(clear.outputs["BSDF"], mix1.inputs[1])
    links.new(gloss.outputs["BSDF"], mix1.inputs[2])
    lp = nodes.new("ShaderNodeLightPath")
    shadow_clear = nodes.new("ShaderNodeBsdfTransparent")
    mix2 = nodes.new("ShaderNodeMixShader")
    links.new(lp.outputs["Is Shadow Ray"], mix2.inputs["Fac"])
    links.new(mix1.outputs["Shader"], mix2.inputs[1])
    links.new(shadow_clear.outputs["BSDF"], mix2.inputs[2])
    links.new(mix2.outputs["Shader"], out.inputs["Surface"])
    return mat


def materials():
    return {
        "zemin": C.pbr_box("Zemin_Parke", "herringbone_parquet", real_size=3.4,
                           value=0.62, rough_add=0.08),
        "siva": C.pbr_box("Duvar_Siva", "plastered_wall_04", real_size=3.2,
                          tint=(0.88, 0.74, 0.56), value=0.85, normal_strength=0.6),
        "tavan": C.pbr_box("Tavan_Siva", "plastered_wall_04", real_size=3.2,
                           tint=(0.92, 0.84, 0.70), value=0.95, normal_strength=0.4),
        "ahsap": C.pbr_box("Ahsap_Raf", "dark_wood", real_size=1.6,
                           tint=(1.0, 0.86, 0.76), value=0.6),
        "cam": glass_material(),
    }


def _bake_boolean(target, cutter):
    mod = target.modifiers.new("Delik", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    dg = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
    old = target.data
    target.modifiers.clear()
    target.data = baked
    bpy.data.meshes.remove(old)
    bpy.data.objects.remove(cutter, do_unlink=True)


def build_shell(col, mats):
    W, WT, H = L.ROOM_HALF_W, L.WALL_T, L.CEIL
    yb, yf = L.Y_BACK, L.Y_FRONT

    def slab(name, lo, hi, mat):
        bm = bmesh.new()
        C.add_box(bm, lo, hi)
        return C.mesh_object(name, bm, col, [mat])

    slab("Zemin", (-W - WT, yf - WT, -0.1), (W + WT, yb + WT, 0.0), mats["zemin"])
    slab("Tavan", (-W - WT, yf - WT, H), (W + WT, yb + WT, H + 0.2), mats["tavan"])
    slab("Duvar_Sol", (-W - WT, yf - WT, 0), (-W, yb + WT, H), mats["siva"])
    slab("Duvar_Sag", (W, yf - WT, 0), (W + WT, yb + WT, H), mats["siva"])
    slab("Duvar_On", (-W, yf - WT, 0), (W, yf, H), mats["siva"])
    back = slab("Duvar_Arka", (-W, yb, 0), (W, yb + WT, H), mats["siva"])

    bm = bmesh.new()
    C.extrude_profile(bm, arch_points(L.WIN_HALF_W, L.WIN_SILL, L.WIN_SPRING),
                      yb - 0.2, yb + WT + 0.2)
    cutter = C.mesh_object("_kesici", bm, col)
    _bake_boolean(back, cutter)

    # tavan kirişleri
    bm = bmesh.new()
    for x in (-2.4, -1.2, 0.0, 1.2, 2.4):
        C.add_box(bm, (x - 0.11, yf, H - 0.26), (x + 0.11, yb, H))
    C.add_box(bm, (-W, yb - 0.24, H - 0.32), (W, yb, H))
    C.add_box(bm, (-W, yb - 0.3, H - 0.36), (W, yb - 0.24, H - 0.3))
    beams = C.mesh_object("Tavan_Kirisleri", bm, col, [mats["ahsap"]])
    C.add_bevel(beams, width=0.01, segments=2)

    # pencere altı lambri ve süpürgelik
    bm = bmesh.new()
    xi = L.CASE_INNER_X
    C.add_box(bm, (-xi, yb - 0.02, 0.0), (xi, yb, 1.0))
    C.add_box(bm, (-xi, yb - 0.045, 0.96), (xi, yb, 1.02))
    C.add_box(bm, (-xi, yb - 0.035, 0.0), (xi, yb, 0.17))
    for x0 in (-xi + 0.08, 0.08):
        C.add_box(bm, (x0, yb - 0.03, 0.26), (x0 + xi - 0.16, yb - 0.02, 0.88))
    wains = C.mesh_object("Lambri", bm, col, [mats["ahsap"]])
    C.add_bevel(wains, width=0.004)


def build_window(col, mats):
    hw, fw, fd = L.WIN_HALF_W, L.WIN_FRAME_W, L.WIN_FRAME_D
    yc = L.WIN_FRAME_Y
    y0, y1 = yc - fd / 2, yc + fd / 2
    spring, sill = L.WIN_SPRING, L.WIN_SILL
    r_in = hw - fw

    bm = bmesh.new()
    outer = arch_points(hw, sill, spring, inset=-0.01)
    inner = arch_points(hw, sill, spring, inset=fw)
    C.ring_profile(bm, outer, inner, y0, y1)
    md, mw = 0.045, 0.034          # kayıt derinliği / genişliği
    for xm in (-0.3, 0.3):
        top = spring + math.sqrt(r_in ** 2 - xm ** 2) + 0.01
        C.add_box(bm, (xm - mw / 2, yc - md / 2, sill + fw - 0.01), (xm + mw / 2, yc + md / 2, top))
    for zt in (sill + fw + 0.69, sill + fw + 1.38, spring):
        C.add_box(bm, (-r_in - 0.01, yc - md / 2, zt - mw / 2), (r_in + 0.01, yc + md / 2, zt + mw / 2))
    arc_band(bm, 0.40, 0.40 + mw, spring, yc - md / 2, yc + md / 2)
    frame = C.mesh_object("Pencere_Kasa", bm, col, [mats["ahsap"]])
    C.add_bevel(frame, width=0.004)

    bm = bmesh.new()
    pts = arch_points(hw, sill, spring, inset=fw - 0.005)
    bm.faces.new([bm.verts.new((x, yc, z)) for x, z in pts])
    C.mesh_object("Pencere_Cami", bm, col, [mats["cam"]])

    # iç denizlik (taş üstü ahşap tabla) ve önündeki pervaz
    yb = L.Y_BACK
    bm = bmesh.new()
    C.add_box(bm, (-hw, yb - 0.001, sill - 0.01), (hw, y0, sill + 0.035))
    C.add_box(bm, (-hw - 0.08, yb - 0.06, sill - 0.01), (hw + 0.08, yb, sill + 0.035))
    C.add_box(bm, (-hw - 0.04, yb - 0.025, sill - 0.17), (hw + 0.04, yb, sill - 0.01))
    stool = C.mesh_object("Pencere_Denizlik", bm, col, [mats["ahsap"]])
    C.add_bevel(stool, width=0.006)


def build(col_name="Oda"):
    C.clear_collection(col_name)
    col = C.collection(col_name)
    mats = materials()
    build_shell(col, mats)
    build_window(col, mats)
    return mats
