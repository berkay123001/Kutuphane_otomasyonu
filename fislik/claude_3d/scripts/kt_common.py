"""Fişlik kütüphane sahnesi — ortak yardımcılar (koleksiyon, kutu üretimi, malzemeler)."""
import os
import math

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = "/home/berkay/Projeler/Kutuphane_otomasyonu/fislik/claude_3d"
TEX = os.path.join(ROOT, "assets", "textures")


# ---------------------------------------------------------------- koleksiyon

def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def clear_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        return
    for obj in list(col.all_objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)


def link(obj, col):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    return obj


# ---------------------------------------------------------------- geometri

def add_box(bm, lo, hi, mat=0, matrix=None):
    """bm içine (lo..hi) köşeli bir kutu ekler; yeni yüzleri döndürür."""
    lo, hi = Vector(lo), Vector(hi)
    size = hi - lo
    center = (lo + hi) / 2
    m = Matrix.Translation(center) @ Matrix.Diagonal((size.x, size.y, size.z, 1.0))
    if matrix is not None:
        m = matrix @ m
    verts = bmesh.ops.create_cube(bm, size=1.0, matrix=m)["verts"]
    faces = {f for v in verts for f in v.link_faces}
    for f in faces:
        f.material_index = mat
    return faces


def add_cylinder(bm, center, radius, depth, axis="Z", segments=16, mat=0):
    rot = {"Z": Matrix.Identity(4),
           "X": Matrix.Rotation(math.radians(90), 4, "Y"),
           "Y": Matrix.Rotation(math.radians(90), 4, "X")}[axis]
    m = Matrix.Translation(Vector(center)) @ rot
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius,
                                radius2=radius, depth=depth, matrix=m)
    faces = {f for v in res["verts"] for f in v.link_faces}
    for f in faces:
        f.material_index = mat
    return faces


def add_sphere(bm, center, radius, segs=12, mat=0):
    m = Matrix.Translation(Vector(center))
    res = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(6, segs // 2),
                                    radius=radius, matrix=m)
    faces = {f for v in res["verts"] for f in v.link_faces}
    for f in faces:
        f.material_index = mat
        f.smooth = True
    return faces


def extrude_profile(bm, pts_xz, y0, y1, mat=0):
    """XZ düzlemindeki kapalı çokgeni y0..y1 boyunca katı prizmaya çevirir."""
    front = [bm.verts.new((x, y0, z)) for x, z in pts_xz]
    back = [bm.verts.new((x, y1, z)) for x, z in pts_xz]
    faces = [bm.faces.new(front), bm.faces.new(list(reversed(back)))]
    n = len(pts_xz)
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((front[i], front[j], back[j], back[i])))
    for f in faces:
        f.material_index = mat
    return faces


def ring_profile(bm, outer, inner, y0, y1, mat=0):
    """İki iç içe kapalı çokgen arasındaki halkayı (pencere kasası) y0..y1 kalınlığında üretir."""
    n = len(outer)
    of = [bm.verts.new((x, y0, z)) for x, z in outer]
    ob = [bm.verts.new((x, y1, z)) for x, z in outer]
    inf = [bm.verts.new((x, y0, z)) for x, z in inner]
    inb = [bm.verts.new((x, y1, z)) for x, z in inner]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((of[i], of[j], inf[j], inf[i])))
        faces.append(bm.faces.new((ob[j], ob[i], inb[i], inb[j])))
        faces.append(bm.faces.new((of[j], of[i], ob[i], ob[j])))
        faces.append(bm.faces.new((inf[i], inf[j], inb[j], inb[i])))
    for f in faces:
        f.material_index = mat
    return faces


def mesh_object(name, bm, col, materials=(), location=(0, 0, 0), rot_z=0.0, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    for mat in materials:
        me.materials.append(mat)
    obj.location = location
    obj.rotation_euler.z = rot_z
    col.objects.link(obj)
    return obj


def add_bevel(obj, width=0.004, segments=2, angle=40):
    mod = obj.modifiers.new("Pah", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = False
    return mod


# ---------------------------------------------------------------- malzemeler

def _new_material(name):
    mat = bpy.data.materials.get(name)
    if mat is not None:
        bpy.data.materials.remove(mat)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def bsdf_of(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def _image(path, colorspace):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    return img


def pbr_box(name, tex_id, real_size=1.0, tint=None, value=1.0, rough_add=0.0,
            normal_strength=1.0, blend=0.2, coord="Object"):
    """Poly Haven dokusunu UV gerektirmeden kutu projeksiyonuyla bağlar."""
    mat = _new_material(name)
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = bsdf_of(mat)
    tc = nodes.new("ShaderNodeTexCoord")
    mp = nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / real_size,) * 3
    links.new(tc.outputs[coord], mp.inputs["Vector"])

    def tex(suffix, cs):
        node = nodes.new("ShaderNodeTexImage")
        node.image = _image(os.path.join(TEX, f"{tex_id}_{suffix}_2k.jpg"), cs)
        node.projection = "BOX"
        node.projection_blend = blend
        links.new(mp.outputs["Vector"], node.inputs["Vector"])
        return node

    diff = tex("diff", "sRGB")
    rough = tex("rough", "Non-Color")
    nor = tex("nor_gl", "Non-Color")

    hsv = nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Value"].default_value = value
    links.new(diff.outputs["Color"], hsv.inputs["Color"])
    color_out = hsv.outputs["Color"]
    if tint is not None:
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs["B"].default_value = (*tint, 1.0)
        links.new(color_out, mix.inputs["A"])
        color_out = mix.outputs["Result"]
    links.new(color_out, bsdf.inputs["Base Color"])

    radd = nodes.new("ShaderNodeMath")
    radd.operation = "ADD"
    radd.use_clamp = True
    radd.inputs[1].default_value = rough_add
    links.new(rough.outputs["Color"], radd.inputs[0])
    links.new(radd.outputs["Value"], bsdf.inputs["Roughness"])

    nmap = nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = normal_strength
    links.new(nor.outputs["Color"], nmap.inputs["Color"])
    links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def simple_material(name, color, roughness=0.5, metallic=0.0, **extra):
    mat = _new_material(name)
    bsdf = bsdf_of(mat)
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for key, val in extra.items():
        bsdf.inputs[key].default_value = val
    return mat


def brass_material(name="Pirinc"):
    mat = simple_material(name, (0.72, 0.52, 0.24), roughness=0.32, metallic=1.0)
    nt = mat.node_tree
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 60.0
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = 0.22
    ramp.inputs["To Max"].default_value = 0.5
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], bsdf_of(mat).inputs["Roughness"])
    return mat
