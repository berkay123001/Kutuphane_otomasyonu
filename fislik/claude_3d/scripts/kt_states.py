"""Web etkileşimleri için hareketli parçalar ve anahtar kareler.

Kare 1   : her şey kapalı / yerinde (ana arka plan)
Kare 1-24: seçili kitap raftan çekilir, üst-orta çekmece açılır, seçili fiş yükselir.
Her etkileşim ayrı render edilip web'de bölge bazlı sprite olarak oynatılabilir.
"""
import math
import random

import bpy
import bmesh
from mathutils import Matrix

import kt_common as C
import kt_layout as L
import kt_shelves as S

FRAMES = (1, 24)

# Web'deki tıklanabilir etkileşimler: kimlik -> (etiket, hareket eden nesneler)
INTERACTIONS = {
    "cekmece": ("Katalog çekmecesi", ("Cekmece_Ust_Orta",)),
    "kitap": ("Raftaki kitap", ("Kitap_Secili",)),
    "fis": ("Seçili katalog fişi", ("Secili_Fis",)),
    "kapi": ("Arşiv dolabı", ("Yan_Sol_Kapi",)),
}


def selected_book(col):
    old = bpy.data.objects.get("Kitap_Secili")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    rng = random.Random(99)
    D, Du = L.CASE_LOWER_D, L.CASE_UPPER_D
    yu = D - Du
    cz, top = L.CASE_COUNTER, L.CASE_TOP
    z0 = cz + 2 * (top - cz) / L.CASE_SHELVES
    t, d, h = 0.048, 0.24, 0.30
    bm = bmesh.new()
    layer = bm.loops.layers.float_color.new("kitap_renk")
    M = Matrix.Translation((-t / 2, 0, 0))
    S.add_book(bm, layer, rng, M, t, d, h, (0.24, 0.03, 0.025), "deri", True, True)
    mats = [bpy.data.materials[n] for n in ("Kitap_Cilt", "Kitap_Sayfa", "Altin_Varak")]
    book = C.mesh_object("Kitap_Secili", bm, col, mats, recalc=False)
    book.location = (L.CASE_INNER_X + 0.335, L.Y_BACK - D + yu + 0.024, z0)
    book["etkilesim"] = "kitap_al"
    return book


def drawer_cards(drawer_name="Cekmece_Ust_Orta", seed=31):
    """Açılan çekmecenin içine iki sıra katalog kartı (çekmeceyle birlikte hareket eder)."""
    drawer = bpy.data.objects.get(drawer_name)
    old = bpy.data.objects.get(f"{drawer_name}_Kartlar")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    if drawer is None:
        return None
    from mathutils import Vector
    bb = [Vector(v) for v in drawer.bound_box]
    lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
    hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    rng = random.Random(seed)
    bm = bmesh.new()
    inner_w = (hi.x - lo.x) - 0.06
    col_w = inner_w / 2 - 0.01
    z0 = lo.z + 0.03
    card_h = min(0.16, (hi.z - lo.z) - 0.08)
    for c in range(2):
        x0 = lo.x + 0.03 + c * (col_w + 0.02)
        y = lo.y + 0.08
        i = 0
        while y < hi.y - 0.05:
            lean = math.radians(rng.uniform(-10, -3))
            M = Matrix.Translation((0, y, z0)) @ Matrix.Rotation(lean, 4, "X")
            C.add_box(bm, (x0, 0, 0), (x0 + col_w, 0.0007, card_h), 0, M)
            if i % 12 == 0:
                tx = x0 + rng.uniform(0.0, col_w - 0.05)
                C.add_box(bm, (tx, 0, card_h), (tx + 0.05, 0.0007, card_h + 0.018), 1, M)
            y += rng.uniform(0.004, 0.0065)
            i += 1
    mats = [bpy.data.materials.get(n) for n in ("Katalog_Karti", "Katalog_Sekme")]
    cards = C.mesh_object(f"{drawer_name}_Kartlar", bm, drawer.users_collection[0],
                          [m for m in mats if m], recalc=False)
    cards.parent = drawer
    return cards


def _key(obj, frame, loc=None, rot=None):
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert("location", frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert("rotation_euler", frame=frame)


def _ease(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.easing = "EASE_IN_OUT"


def animate(book):
    f0, f1 = FRAMES
    mid = (f0 + f1) // 2
    base = book.location.copy()
    book.animation_data_clear()
    _key(book, f0, base, (0, 0, 0))
    _key(book, mid, base, (math.radians(16), 0, 0))
    _key(book, f1, base + type(base)((0, -0.13, 0.01)), (math.radians(8), 0, 0))
    _ease(book)

    drawer = bpy.data.objects.get("Cekmece_Ust_Orta")
    if drawer:
        drawer.animation_data_clear()
        _key(drawer, f0, (0, 0, 0))
        _key(drawer, f1, (0, -0.42, 0))
        _ease(drawer)
        drawer["etkilesim"] = "cekmece_ac"

    card = bpy.data.objects.get("Secili_Fis")
    if card:
        card.animation_data_clear()
        _key(card, f0, (0, 0, -0.045))
        _key(card, f1, (0, 0, 0))
        _ease(card)
        card["etkilesim"] = "fis_sec"

    door = bpy.data.objects.get("Yan_Sol_Kapi")
    if door:
        door.animation_data_clear()
        _key(door, f0, rot=(0, 0, 0))
        _key(door, f1, rot=(0, 0, math.radians(105) * door.get("acilma_yonu", 1)))
        _ease(door)

    scn = bpy.context.scene
    scn.frame_start, scn.frame_end = f0, f1
    scn.frame_set(f0)


def build(col_name="Etkilesim"):
    col = C.collection(col_name)
    book = selected_book(col)
    drawer_cards()
    animate(book)
    return book
