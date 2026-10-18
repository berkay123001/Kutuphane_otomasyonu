"""Gerçek zamanlı 3B oda için ışık 'bake' + glTF dışa aktarımı (başsız Blender).

Kullanım:
  blender -b fislik/claude_3d/kutuphane_claude.blend --python fislik/claude_3d/scripts/bake_web.py -- [--ornek 64] [--tema gunduz]

Çıktı (frontend/public/oda3d/):
  oda.glb                 — sıkıştırılmış geometri (tek UV: ışık haritası), malzemesiz
  <grup>_<tema>.webp      — her grubun Cycles ile pişirilmiş (albedo × ışık) dokusu
  oda.json                — grup → doku eşlemesi ve hareketli parça bilgisi

Hacimsel huzme ve toz pişirilmez; tarayıcıda ucuz sahte huzme/parçacıkla çizilir.
"""
import json
import os
import sys
import time

import bpy

P = "/home/berkay/Projeler/Kutuphane_otomasyonu/fislik/claude_3d/scripts"
if P not in sys.path:
    sys.path.insert(0, P)

import kt_common as C  # noqa: E402
import kt_light  # noqa: E402

CIKTI = os.path.normpath(os.path.join(C.ROOT, "..", "..", "frontend", "public", "oda3d"))

# Durağan gruplar (birleştirilir, tek dokuya pişirilir) — ad: (nesne adları/önekleri, doku boyu)
STATIK = {
    "oda": (["Zemin", "Tavan", "Duvar_Sol", "Duvar_Sag", "Duvar_On", "Duvar_Arka", "Tavan_Kirisleri",
             "Lambri", "Pencere_Kasa", "Pencere_Denizlik", "Perdeler", "Perde_Corubugu"], 4096),
    "raflar": (["Arka_Sol_Govde", "Arka_Sag_Govde", "Yan_Sol_Govde", "Yan_Sag_Govde",
                "Kutuphane_Merdiveni"], 4096),
    "kitaplar": (["Arka_Sol_Kitaplar", "Arka_Sag_Kitaplar", "Yan_Sol_Kitaplar", "Yan_Sag_Kitaplar",
                  "Kitap_Secili"], 4096),
    "esya": (["Hali", "GreenChair_01", "potted_plant_04", "Lamba_Govde", "Lamba_Abajur", "Lamba_Ampul",
              "Acik_Kitap", "Fis_Kutusu", "Kataloq_Fisleri", "Secili_Fis", "Istampa", "Damga",
              "Masa_Kitaplari", "Sarkit_0", "Sarkit_1", "Dolap_Govde"], 4096),
}
# Hareket eden parçalar: ayrı nesne + ayrı (küçük) doku
HAREKETLI = {
    "Cekmece_Ust_Sol": 1024, "Cekmece_Ust_Orta": 1024, "Cekmece_Ust_Sag": 1024,
    "Cekmece_Alt_Sol": 1024, "Cekmece_Alt_Orta": 1024, "Cekmece_Alt_Sag": 1024,
    "Yan_Sol_Kapi": 1024,
}
# Pişirilmeyen ama sahnede kalması gerekenler
SAYDAM = ["Pencere_Cami"]
# Bake'te de dışarıda bırakılanlar
DISARIDA = ["Hava_Hacmi", "Toz_Zerreleri"]


def log(*parca):
    print("[bake_web]", *parca, flush=True)


def eslesir(ad, desenler):
    return any(ad == d or ad.startswith(d + "_") or ad.startswith(d + ".") for d in desenler)


# ---------------------------------------------------------------- hazırlık

def degistiricileri_uygula():
    """Tüm görünür örgülerin değiştiricilerini (pah, kalınlık) uygular, malzemeleri tekilleştirir."""
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in list(bpy.data.objects):
        if ob.type != "MESH" or ob.name in DISARIDA:
            continue
        if ob.modifiers:
            yeni = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
            ob.modifiers.clear()
            ob.data = yeni
        elif ob.data.users > 1:
            ob.data = ob.data.copy()


def ebeveynden_kopar(ob):
    mw = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = mw


# Görünürlük sınaması için kameranın bulunabileceği noktalar (Blender koordinatları)
GOZLER = [(0.0, -3.4, 1.45), (0.0, 0.15, 1.22), (0.0, 0.6, 1.5), (-1.2, -1.5, 1.6), (1.2, -1.5, 1.6)]


def gorunmeyenleri_sil(ob, kitap=False):
    """Kameranın hiçbir konumdan göremeyeceği yüzleri siler (atlası gerçekten görünenlere ayırır).
    Kitaplarda yalnızca sırt (yerel -Y) ve üst (+Z) yüzler kalır; yanları komşu kitapla örtülür."""
    import bmesh
    from mathutils import Vector
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    mw = ob.matrix_world
    nm = mw.to_3x3().inverted().transposed()
    gozler = [Vector(g) for g in GOZLER]
    silinecek = []
    for f in bm.faces:
        if kitap:
            n = f.normal
            if not (n.y < -0.6 or n.z > 0.6):
                silinecek.append(f)
            continue
        c = mw @ f.calc_center_median()
        n = (nm @ f.normal).normalized()
        if all(n.dot(g - c) <= 1e-4 for g in gozler):
            silinecek.append(f)
    bmesh.ops.delete(bm, geom=silinecek, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()
    return len(silinecek)


def grup_nesneleri(ad, desenler):
    nesneler = [o for o in bpy.data.objects if o.type == "MESH" and eslesir(o.name, desenler)]
    if not nesneler:
        raise RuntimeError(f"{ad}: nesne bulunamadı")
    for o in nesneler:
        ebeveynden_kopar(o)
        o.hide_set(False)
        o.hide_render = False
    return nesneler


def birlestir(ad, nesneler):
    bpy.ops.object.select_all(action="DESELECT")
    for o in nesneler:
        o.select_set(True)
    bpy.context.view_layer.objects.active = nesneler[0]
    if len(nesneler) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ad
    ob.data.name = ad
    log(f"{ad}: {len(nesneler)} nesne, {len(ob.data.polygons)} yüz")
    return ob


def malzemeleri_tekillestir(ob):
    for slot in ob.material_slots:
        if slot.material:
            slot.material = slot.material.copy()


def isik_uv(nesneler, kenar=0.0015):
    """Işık haritası UV'si: her nesneye 'LM' katmanı; çoklu düzenlemede birlikte izdüşüm + ortak paket.
    Özgün UV'ler (içe aktarılan modellerin dokuları) render UV'si olarak korunur."""
    if not isinstance(nesneler, (list, tuple)):
        nesneler = [nesneler]
    bpy.ops.object.select_all(action="DESELECT")
    for ob in nesneler:
        me = ob.data
        render_uv = next((u.name for u in me.uv_layers if u.active_render), None)
        uv = me.uv_layers.get("LM") or me.uv_layers.new(name="LM")
        me.uv_layers.active = uv
        if render_uv:
            me.uv_layers[render_uv].active_render = True
        ob.select_set(True)
    bpy.context.view_layer.objects.active = nesneler[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=kenar, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=kenar, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


# ---------------------------------------------------------------- bake

def hedef_doku_ekle(ob, img):
    for slot in ob.material_slots:
        mat = slot.material
        if not mat or not mat.use_nodes:
            continue
        nt = mat.node_tree
        dugum = nt.nodes.new("ShaderNodeTexImage")
        dugum.image = img
        uvd = nt.nodes.new("ShaderNodeUVMap")
        uvd.uv_map = "LM"
        nt.links.new(uvd.outputs["UV"], dugum.inputs["Vector"])
        for n in nt.nodes:
            n.select = False
        dugum.select = True
        nt.nodes.active = dugum


def pisir(ad, nesneler, boyut, tema, ornek):
    if not isinstance(nesneler, (list, tuple)):
        nesneler = [nesneler]
    img = bpy.data.images.new(f"{ad}_{tema}", boyut, boyut, float_buffer=True)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in nesneler:
        hedef_doku_ekle(ob, img)
        ob.select_set(True)
    bpy.context.view_layer.objects.active = nesneler[0]
    scn = bpy.context.scene
    scn.cycles.samples = ornek
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT", "COLOR"},
                        margin=12, margin_type="EXTEND", use_clear=True, target="IMAGE_TEXTURES")
    yol = os.path.join(CIKTI, f"{ad}_{tema}.webp")
    img.save_render(yol, scene=scn)
    log(f"pişti {ad} {boyut}px {time.time() - t:.1f}s → {os.path.basename(yol)}")
    return os.path.basename(yol)


def ayarla(ornek):
    scn = bpy.context.scene
    kt_light.render_settings(preview=False)
    scn.cycles.samples = ornek
    scn.cycles.use_denoising = False
    scn.render.bake.use_selected_to_active = False
    fmt = scn.render.image_settings
    fmt.file_format = "WEBP"
    fmt.color_mode = "RGB"
    fmt.quality = 86
    scn.view_settings.exposure += 0.35   # hacimsel ışık ve parlama yokluğunu dengeler
    for mat in bpy.data.materials:        # yüzey altı saçılım 'diffuse' pişirmede kaybolur
        if mat.name.startswith(("Sarkit_Opal", "Lamba_Opal")) and mat.use_nodes:
            b = C.bsdf_of(mat)
            b.inputs["Subsurface Weight"].default_value = 0.0
            b.inputs["Base Color"].default_value = (0.86, 0.84, 0.78, 1)
    scn.frame_set(1)
    for ad in DISARIDA:
        o = bpy.data.objects.get(ad)
        if o:
            o.hide_render = True


# ---------------------------------------------------------------- dışa aktarım

def disa_aktar(nesneler):
    bpy.ops.object.select_all(action="DESELECT")
    for o in nesneler:
        o.select_set(True)
        # glTF'de tek UV: ışık haritası
        for uv in [u for u in o.data.uv_layers if u.name != "LM"]:
            o.data.uv_layers.remove(uv)
    yol = os.path.join(CIKTI, "oda.glb")
    bpy.ops.export_scene.gltf(
        filepath=yol, export_format="GLB", use_selection=True, export_materials="NONE",
        export_normals=False, export_texcoords=True, export_apply=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14, export_draco_texcoord_quantization=12,
        export_yup=True, export_animations=False, export_cameras=False, export_lights=False,
    )
    log(f"glb: {os.path.getsize(yol) / 1e6:.1f} MB")


def main(argv):
    ornek = int(argv[argv.index("--ornek") + 1]) if "--ornek" in argv else 256
    tema = argv[argv.index("--tema") + 1] if "--tema" in argv else "gunduz"
    os.makedirs(CIKTI, exist_ok=True)
    {"gunduz": kt_light.day, "gece": kt_light.night}[tema]()
    ayarla(ornek)
    for o in bpy.data.objects:          # kare 1 hâli sabitlensin (çekmece/kapı kapalı)
        o.animation_data_clear()
    degistiricileri_uygula()
    for ad in HAREKETLI:                 # birleştirmeden önce: ebeveyni silinse de yerinde kalsın
        o = bpy.data.objects.get(ad)
        if o:
            ebeveynden_kopar(o)

    bilgi = {"tema": [tema], "gruplar": {}, "hareketli": {}}
    pisenler = []
    for ad, (desenler, boyut) in STATIK.items():
        nesneler = grup_nesneleri(ad, desenler)
        silinen = 0
        for o in nesneler:
            malzemeleri_tekillestir(o)
            if ad in ("oda", "raflar"):
                silinen += gorunmeyenleri_sil(o)
            elif ad == "kitaplar":
                silinen += gorunmeyenleri_sil(o, kitap=True)
        log(f"{ad}: {len(nesneler)} nesne, görünmeyen {silinen} yüz silindi")
        isik_uv(nesneler)
        bilgi["gruplar"][ad] = pisir(ad, nesneler, boyut, tema, ornek)
        pisenler.append(birlestir(ad, nesneler))

    for ad, boyut in HAREKETLI.items():
        ob = bpy.data.objects.get(ad)
        if ob is None:
            continue
        kartlar = bpy.data.objects.get(f"{ad}_Kartlar")
        if kartlar:
            kartlar.hide_render = True  # gerçek fişler tarayıcıda veriden üretilecek
        ebeveynden_kopar(ob)
        malzemeleri_tekillestir(ob)
        isik_uv(ob, kenar=0.004)
        bilgi["hareketli"][ad] = pisir(ad, ob, boyut, tema, ornek)
        pisenler.append(ob)

    saydamlar = [bpy.data.objects[a] for a in SAYDAM if a in bpy.data.objects]
    for o in saydamlar:
        ebeveynden_kopar(o)
        isik_uv(o)
    disa_aktar(pisenler + saydamlar)
    with open(os.path.join(CIKTI, "oda.json"), "w", encoding="utf-8") as fh:
        json.dump(bilgi, fh, ensure_ascii=False, indent=2)
    log("BITTI")


main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
