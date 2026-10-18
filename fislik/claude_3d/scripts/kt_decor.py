"""Kütüphane merdiveni, kadife perdeler, desenli halı ve içe aktarılan modellerin yerleşimi."""
import math
import os

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

import kt_common as C
import kt_layout as L

RUG_SIZE = (2.6, 1.7)


# ---------------------------------------------------------------- merdiven

def ladder(col, wood, brass, x=-2.2):
    yb = L.Y_BACK - L.CASE_LOWER_D          # arka kitaplığın ön yüzü (ray bu düzlemde)
    bottom = Vector((x, yb - 0.92, 0.07))
    top = Vector((x, yb - 0.035, 3.56))
    u = (top - bottom).normalized()
    length = (top - bottom).length
    frame = Matrix(((1, 0, 0, bottom.x), (0, u.z, u.y, bottom.y), (0, -u.y, u.z, bottom.z), (0, 0, 0, 1)))
    bm = bmesh.new()
    for sx in (-0.24, 0.24):
        C.add_box(bm, (sx - 0.022, -0.018, 0), (sx + 0.022, 0.018, length), 0, frame)
    z = 0.32
    while z < 3.35:
        yc = bottom.y + u.y * (z - bottom.z) / u.z
        C.add_box(bm, (x - 0.22, yc - 0.05, z - 0.013), (x + 0.22, yc + 0.05, z + 0.013), 0)
        z += 0.3
    for sx in (-0.24, 0.24):          # raya asılan pirinç kancalar ve alt tekerlekler
        hx = x + sx
        C.add_box(bm, (hx - 0.012, top.y - 0.02, 3.596), (hx + 0.012, yb + 0.026, 3.616), 1)
        C.add_box(bm, (hx - 0.012, top.y - 0.02, 3.54), (hx + 0.012, top.y, 3.616), 1)
        C.add_box(bm, (hx - 0.012, yb + 0.016, 3.56), (hx + 0.012, yb + 0.026, 3.616), 1)
        C.add_cylinder(bm, (hx, bottom.y, 0.04), 0.038, 0.022, axis="X", segments=20, mat=1)
    obj = C.mesh_object("Kutuphane_Merdiveni", bm, col, [wood, brass])
    C.add_bevel(obj, width=0.004)
    return obj


# ---------------------------------------------------------------- perde

def velvet_material():
    mat = C.simple_material("Kadife_Bordo", (0.16, 0.014, 0.022), roughness=0.82,
                            **{"Sheen Weight": 1.0, "Sheen Roughness": 0.35})
    C.bsdf_of(mat).inputs["Sheen Tint"].default_value = (1.0, 0.55, 0.55, 1)
    return mat


def curtain_panel(bm, xa, xb, y0, z0, z1, phase, nx=90, nz=36, wave=0.072):
    grid = []
    for k in range(nz + 1):
        z = z0 + (z1 - z0) * k / nz
        drop = 1 - k / nz
        amp = 0.018 + 0.03 * drop
        row = []
        for i in range(nx + 1):
            x = xa + (xb - xa) * i / nx
            y = y0 + amp * math.sin(2 * math.pi * (x - xa) / wave + phase) + 0.012 * drop * math.sin(5 * x)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for k in range(nz):
        for i in range(nx):
            f = bm.faces.new((grid[k][i], grid[k][i + 1], grid[k + 1][i + 1], grid[k + 1][i]))
            f.smooth = True


def curtains(col, brass):
    yc = L.Y_BACK - 0.13
    zt = L.WIN_SPRING + L.WIN_HALF_W + 0.16
    bm = bmesh.new()
    curtain_panel(bm, -1.28, -0.74, yc, 0.015, zt, 0.0)
    curtain_panel(bm, 0.74, 1.28, yc, 0.015, zt, 1.3)
    obj = C.mesh_object("Perdeler", bm, col, [velvet_material()], recalc=False)
    sol = obj.modifiers.new("Kalinlik", "SOLIDIFY")
    sol.thickness = 0.004
    bm = bmesh.new()
    C.add_cylinder(bm, (0, yc, zt + 0.04), 0.017, 2.7, axis="X", segments=20)
    for sx in (-1.36, 1.36):
        C.add_sphere(bm, (sx, yc, zt + 0.04), 0.038, segs=20)
        C.add_box(bm, (sx * 0.97 - 0.01, yc, zt + 0.03), (sx * 0.97 + 0.01, L.Y_BACK, zt + 0.05))
    x = -1.26
    while x < 1.27:
        if abs(x) > 0.72:
            C.add_cylinder(bm, (x, yc, zt + 0.02), 0.026, 0.006, axis="X", segments=16)
        x += 0.06
    rod = C.mesh_object("Perde_Corubugu", bm, col, [brass])
    for f in rod.data.polygons:
        f.use_smooth = True
    return obj, rod


# ---------------------------------------------------------------- halı

def _smooth_noise(h, w, cell, rng):
    gh, gw = h // cell + 2, w // cell + 2
    g = rng.random((gh, gw))
    yy = np.linspace(0, gh - 1.001, h)
    xx = np.linspace(0, gw - 1.001, w)
    y0, x0 = yy.astype(int), xx.astype(int)
    fy, fx = (yy - y0)[:, None], (xx - x0)[None, :]
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]
    b = g[y0][:, x0 + 1]
    c = g[y0 + 1][:, x0]
    d = g[y0 + 1][:, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def rug_pixels(w=1600, h=1046, seed=4):
    rng = np.random.default_rng(seed)
    W, H = RUG_SIZE
    yy, xx = np.mgrid[0:h, 0:w]
    X = (xx / (w - 1) - 0.5) * W
    Y = (yy / (h - 1) - 0.5) * H
    d = np.minimum(W / 2 - np.abs(X), H / 2 - np.abs(Y))
    along = np.where(W / 2 - np.abs(X) < H / 2 - np.abs(Y), Y, X)

    red = np.array([0.44, 0.07, 0.055])
    navy = np.array([0.07, 0.09, 0.2])
    cream = np.array([0.82, 0.72, 0.52])
    gold = np.array([0.72, 0.5, 0.2])
    img = np.empty((h, w, 3))
    img[:] = red

    a, b = (X + Y) / math.sqrt(2), (X - Y) / math.sqrt(2)
    fa, fb = np.abs((a / 0.15) % 1 - 0.5), np.abs((b / 0.15) % 1 - 0.5)
    img[np.minimum(fa, fb) < 0.05] = navy * 1.4
    img[(fa > 0.4) & (fb > 0.4)] = gold

    r = np.sqrt((X / 0.68) ** 2 + (Y / 0.42) ** 2)
    th = np.arctan2(Y, X)
    med = r < 1.0
    img[med] = navy
    petals = (np.cos(8 * th) * (1 - r) > 0.12) & (r < 0.8)
    img[petals] = red * 1.15
    img[(r > 0.92) & (r < 1.0)] = cream
    img[(r > 0.36) & (r < 0.42)] = gold
    img[r < 0.18] = cream * 0.9
    img[(r < 0.12)] = red

    for cx in (-1, 1):
        for cy in (-1, 1):
            rc = np.sqrt(((X - cx * (W / 2 - 0.24)) / 0.36) ** 2 + ((Y - cy * (H / 2 - 0.24)) / 0.3) ** 2)
            img[rc < 1.0] = navy
            img[(rc > 0.9) & (rc < 1.0)] = cream

    border = d < 0.24
    img[border] = navy
    motif = np.cos(2 * math.pi * along / 0.13) * np.cos(math.pi * (d - 0.13) / 0.15)
    img[border & (d > 0.06) & (d < 0.2) & (motif > 0.45)] = red * 1.2
    img[border & (d > 0.06) & (d < 0.2) & (motif > 0.8)] = gold
    for lo, hi, colr in ((0.03, 0.045, cream), (0.2, 0.212, gold), (0.232, 0.242, cream)):
        img[(d > lo) & (d < hi)] = colr

    wear = 0.82 + 0.25 * _smooth_noise(h, w, 40, rng) + 0.08 * _smooth_noise(h, w, 6, rng)
    fade = 1.0 + 0.12 * np.exp(-(X ** 2 / 0.5 + Y ** 2 / 0.3))
    img *= (wear * fade)[..., None]
    img = np.clip(img, 0, 1)
    rgba = np.concatenate([img, np.ones((h, w, 1))], axis=2)
    return rgba[::-1].astype(np.float32), w, h


def rug_material():
    path = os.path.join(C.TEX, "hali_desen.png")
    img = bpy.data.images.get("hali_desen.png")
    if img is None:
        px, w, h = rug_pixels()
        img = bpy.data.images.new("hali_desen.png", w, h, alpha=False)
        img.pixels.foreach_set(px.ravel())
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
    mat = C.simple_material("Hali", (0.4, 0.08, 0.06), roughness=0.92,
                            **{"Sheen Weight": 0.8, "Sheen Roughness": 0.5})
    nt = mat.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], C.bsdf_of(mat).inputs["Base Color"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], C.bsdf_of(mat).inputs["Normal"])
    return mat


def rug(col):
    W, H = RUG_SIZE
    bm = bmesh.new()
    bm.loops.layers.uv.new("UVMap")
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5,
                          matrix=Matrix.Diagonal((W, H, 1, 1)), calc_uvs=True)
    obj = C.mesh_object("Hali", bm, col, [rug_material()], recalc=False)
    sol = obj.modifiers.new("Kalinlik", "SOLIDIFY")
    sol.thickness = 0.009
    sol.offset = 1.0
    C.add_bevel(obj, width=0.003)
    obj.location = (0.05, 0.42, 0.0)
    obj.rotation_euler.z = math.radians(-2.5)
    return obj


# ---------------------------------------------------------------- içe aktarılan modeller

def place_imports(col):
    root = bpy.data.objects.get("Fislik_Dolabi")
    if root:
        root.location = (0, L.DESK_Y, 0)
    chair = bpy.data.objects.get("GreenChair_01")
    if chair:
        chair.location = (1.42, 0.62, 0.0)
        chair.rotation_euler.z = math.radians(-28)
    parts = [o for o in bpy.data.objects if o.name.startswith("potted_plant_04") and o.parent is None
             and o.type == "MESH"]
    if parts:
        pot = bpy.data.objects.get("Saksi") or bpy.data.objects.new("Saksi", None)
        if pot.name not in col.objects:
            col.objects.link(pot)
        for p in parts:
            p.parent = pot
        pot.location = (0.58, L.Y_BACK + 0.085, L.WIN_SILL + 0.035)
        pot.rotation_euler.z = math.radians(30)


def build(col_name="Dekor"):
    C.clear_collection(col_name)
    col = C.collection(col_name)
    wood = bpy.data.materials["Ahsap_Raf"]
    brass = bpy.data.materials.get("Pirinc_Aksesuar") or C.brass_material("Pirinc_Aksesuar")
    ladder(col, wood, brass)
    curtains(col, brass)
    rug(col)
    place_imports(C.collection("Modeller"))
    return col
