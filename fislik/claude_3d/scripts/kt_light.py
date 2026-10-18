"""Işık, hava hacmi (ışık huzmeleri), toz zerreleri, kamera ve gündüz/gece modları."""
import math
import random

import bpy
import bmesh
from mathutils import Matrix, Vector

import kt_common as C
import kt_layout as L

SUN_DIR = Vector((-0.34, 0.72, 0.60)).normalized()    # güneşe doğru
MOON_DIR = Vector((0.30, 0.80, 0.52)).normalized()    # aya doğru
DAY_EXPOSURE = 1.5
NIGHT_EXPOSURE = 1.0
NIGHT_WORLD_STRENGTH = 0.4


def _aim(obj, toward):
    obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(toward).to_euler()


def _sun(col, name, toward, strength, color, angle_deg):
    lamp = bpy.data.objects.get(name)
    if lamp is None:
        data = bpy.data.lights.new(name, "SUN")
        lamp = bpy.data.objects.new(name, data)
        col.objects.link(lamp)
    lamp.data.energy = strength
    lamp.data.color = color
    lamp.data.angle = math.radians(angle_deg)
    _aim(lamp, toward)
    lamp.location = toward * 8 + Vector((0, L.Y_BACK, 2))
    return lamp


def volume_material(density=0.024, anisotropy=0.45, color=(1.0, 0.97, 0.93)):
    mat = C._new_material("Hava_Toz")
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type == "BSDF_PRINCIPLED":
            nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = density
    vol.inputs["Anisotropy"].default_value = anisotropy
    vol.inputs["Color"].default_value = (*color, 1)
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    return mat


def build_volume(col):
    W = L.ROOM_HALF_W - 0.03
    bm = bmesh.new()
    C.add_box(bm, (-W, L.Y_FRONT + 0.03, 0.005), (W, L.Y_BACK - 0.025, L.CEIL - 0.005))
    obj = C.mesh_object("Hava_Hacmi", bm, col, [volume_material()])
    obj.visible_shadow = False
    return obj


def _in_beam(p, toward):
    """p noktasından güneşe giden ışın pencere açıklığından geçiyor mu?"""
    if toward.y <= 0:
        return False
    tt = (L.WIN_FRAME_Y - p.y) / toward.y
    q = p + toward * tt
    hw = L.WIN_HALF_W - L.WIN_FRAME_W
    if abs(q.x) > hw or q.z < L.WIN_SILL + L.WIN_FRAME_W:
        return False
    if q.z <= L.WIN_SPRING:
        return True
    return q.x ** 2 + (q.z - L.WIN_SPRING) ** 2 <= hw ** 2


def build_dust(col, count=380, seed=7):
    rng = random.Random(seed)
    bm = bmesh.new()
    placed, tries = 0, 0
    while placed < count and tries < count * 400:
        tries += 1
        p = Vector((rng.uniform(-2.8, 2.8), rng.uniform(-1.0, L.Y_BACK - 0.35),
                    rng.uniform(0.4, 4.3)))
        if not _in_beam(p, SUN_DIR):
            continue
        r = rng.uniform(0.0005, 0.0013)
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r,
                                   matrix=Matrix.Translation(p))
        placed += 1
    mat = C._new_material("Toz_Zerresi")
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    for n in list(nt.nodes):
        if n.type == "BSDF_PRINCIPLED":
            nt.nodes.remove(n)
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diff.inputs["Color"].default_value = (0.55, 0.5, 0.44, 1)
    trans = nt.nodes.new("ShaderNodeBsdfTranslucent")
    trans.inputs["Color"].default_value = (0.7, 0.64, 0.55, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs["Fac"].default_value = 0.6
    nt.links.new(diff.outputs["BSDF"], mix.inputs[1])
    nt.links.new(trans.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    obj = C.mesh_object("Toz_Zerreleri", bm, col, [mat], recalc=False)
    obj.visible_shadow = False
    return obj, placed


def build_camera(col):
    cam = bpy.data.objects.get("Kamera")
    if cam is None:
        cam = bpy.data.objects.new("Kamera", bpy.data.cameras.new("Kamera"))
        col.objects.link(cam)
    cam.location = (0.0, -3.4, 1.45)
    cam.rotation_euler = (math.radians(90), 0, 0)
    cam.data.lens = 20
    cam.data.sensor_width = 36
    cam.data.shift_y = 0.06
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = 5.0
    cam.data.dof.aperture_fstop = 5.6
    cam.data.clip_end = 60
    bpy.context.scene.camera = cam
    return cam


def render_settings(preview=True):
    scn = bpy.context.scene
    cy = scn.cycles
    cy.device = "GPU"
    cy.samples = 160 if preview else 1024
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03 if preview else 0.008
    cy.use_denoising = True
    try:
        cy.denoiser = "OPTIX"
    except TypeError:
        pass
    cy.max_bounces = 10
    cy.diffuse_bounces = 4
    cy.glossy_bounces = 4
    cy.transmission_bounces = 8
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 8.0
    cy.volume_step_rate = 1.0 if preview else 0.5
    scn.render.resolution_x, scn.render.resolution_y = 1920, 1080
    scn.render.resolution_percentage = 50 if preview else 100
    vs = scn.view_settings
    try:
        vs.view_transform = "AgX"
    except TypeError:
        pass
    looks = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items]
    vs.look = next((lk for lk in looks if "Medium High" in lk), "None")
    return vs.look


def day(world_day="Dunya_Gunduz"):
    scn = bpy.context.scene
    col = C.collection("Isik")
    _sun(col, "Gunes", SUN_DIR, 11.0, (1.0, 0.87, 0.70), 0.55).hide_render = False
    moon = bpy.data.objects.get("Ay_Isigi")
    if moon:
        moon.hide_render = True
    if world_day in bpy.data.worlds:
        scn.world = bpy.data.worlds[world_day]
    scn.view_settings.exposure = DAY_EXPOSURE
    _set_night_lights(False)


def night(world_night="Dunya_Gece"):
    scn = bpy.context.scene
    col = C.collection("Isik")
    sun = bpy.data.objects.get("Gunes")
    if sun:
        sun.hide_render = True
    _sun(col, "Ay_Isigi", MOON_DIR, 2.4, (0.5, 0.64, 1.0), 0.6).hide_render = False
    if world_night in bpy.data.worlds:
        scn.world = bpy.data.worlds[world_night]
        _world_strength(scn.world, NIGHT_WORLD_STRENGTH)
    scn.view_settings.exposure = NIGHT_EXPOSURE
    _set_night_lights(True)


def build_gobo(col, distance=2.2, size=(5.0, 6.0), openness=0.5, seed=3.0):
    """Pencerenin dışında, güneş yolunda yaprak gölgesi: huzmeyi ayrı şeritlere böler.
    Kameraya görünmez, yalnızca gölge düşürür."""
    old = bpy.data.objects.get("Yaprak_Golgesi")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    bm = bmesh.new()
    sx, sy = size[0] / 2, size[1] / 2
    bm.faces.new([bm.verts.new(v) for v in ((-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0))])
    mat = C._new_material("Yaprak_Golgesi")
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    for n in list(nt.nodes):
        if n.type == "BSDF_PRINCIPLED":
            nt.nodes.remove(n)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.6
    noise.inputs["Detail"].default_value = 9.0
    noise.inputs["Roughness"].default_value = 0.62
    noise.noise_dimensions = "4D"
    noise.inputs["W"].default_value = seed
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = openness - 0.03
    ramp.color_ramp.elements[1].position = openness + 0.03
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    leaf = nt.nodes.new("ShaderNodeBsdfDiffuse")
    leaf.inputs["Color"].default_value = (0.02, 0.035, 0.01, 1)
    hole = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(ramp.outputs["Color"], mix.inputs["Fac"])
    nt.links.new(hole.outputs["BSDF"], mix.inputs[1])
    nt.links.new(leaf.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    gobo = C.mesh_object("Yaprak_Golgesi", bm, col, [mat], recalc=False)
    center = Vector((0.0, L.WIN_FRAME_Y, (L.WIN_SILL + L.WIN_SPRING + L.WIN_HALF_W) / 2))
    gobo.location = center + SUN_DIR * distance
    _aim(gobo, SUN_DIR)
    gobo.visible_camera = False
    gobo.visible_diffuse = False
    gobo.visible_glossy = False
    gobo.visible_transmission = False
    gobo.visible_volume_scatter = False
    return gobo


def viewport_fast():
    """Gezinme için hafifletilmiş Cycles 'Rendered' görünümü (tam çözünürlük, daha kaba hacim adımı).
    EEVEE denendi: akıcı ama hacimsel ışık ve iç mekân sekmeleri soluk kalıyor.
    Toz zerreleri yalnızca son render'da görünür."""
    scn = bpy.context.scene
    dust = bpy.data.objects.get("Toz_Zerreleri")
    if dust:
        dust.hide_viewport = True
    cy = scn.cycles
    cy.preview_samples = 64
    cy.use_preview_adaptive_sampling = True
    cy.preview_adaptive_threshold = 0.05
    cy.volume_preview_step_rate = 2.0
    cy.use_preview_denoising = True
    cy.preview_denoising_start_sample = 1
    scn.render.preview_pixel_size = "AUTO"

    ee = scn.eevee
    ee.use_volumetric_shadows = True
    ee.volumetric_tile_size = "8"
    ee.volumetric_samples = 48
    ee.volumetric_end = 25.0
    ee.use_shadows = True
    ee.use_raytracing = True
    for name in ("Pencere_Cami", "Yaprak_Golgesi"):
        mat = bpy.data.materials.get(name)
        if mat:
            mat.use_transparent_shadow = True
            mat.surface_render_method = "DITHERED"
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type != "VIEW_3D":
                continue
            sh = area.spaces.active.shading
            sh.type = "RENDERED"
            sh.use_scene_lights = True
            sh.use_scene_world = True


def build_fill(col):
    """Kadraj dışındaki (kameranın arkasındaki) pencerelerden gelen yumuşak dolgu ışığı."""
    fill = bpy.data.objects.get("Dolgu_Isik")
    if fill is None:
        fill = bpy.data.objects.new("Dolgu_Isik", bpy.data.lights.new("Dolgu_Isik", "AREA"))
        col.objects.link(fill)
    fill.data.shape = "RECTANGLE"
    fill.data.size, fill.data.size_y = 3.2, 2.0
    fill.location = (-1.6, L.Y_FRONT + 0.15, 3.0)
    _aim(fill, -Vector((0.35, 1.0, -0.25)).normalized())
    fill["gunduz"] = (80.0, 1.0, 0.95, 0.88)
    fill["gece"] = (25.0, 1.0, 0.72, 0.45)
    return fill


def _set_fill(mode):
    fill = bpy.data.objects.get("Dolgu_Isik")
    if fill and mode in fill:
        energy, r, g, b = fill[mode]
        fill.data.energy = energy
        fill.data.color = (r, g, b)


def _world_strength(world, value):
    bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
    if bg:
        bg.inputs["Strength"].default_value = value


def _set_night_lights(on):
    _set_fill("gece" if on else "gunduz")
    for mat in bpy.data.materials:
        if "gece_emisyon" in mat:
            strength = mat["gece_emisyon"] if on else 0.0
            C.bsdf_of(mat).inputs["Emission Strength"].default_value = strength
    for obj in bpy.data.objects:
        if obj.get("gece_isigi"):
            obj.hide_render = not on
            obj.hide_viewport = not on


def build():
    col = C.collection("Isik")
    for name in ("Hava_Hacmi", "Toz_Zerreleri"):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    build_volume(col)
    _, n_dust = build_dust(col)
    build_camera(col)
    build_fill(col)
    build_gobo(col)
    look = render_settings(preview=True)
    day()
    return n_dust, look
