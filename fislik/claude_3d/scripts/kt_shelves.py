"""Tavana kadar ahşap kitaplıklar ve prosedürel kitaplar (seriler, yatık yığınlar, eğik kitaplar)."""
import math
import random

import bpy
import bmesh
from mathutils import Matrix

import kt_common as C
import kt_layout as L

PALETTE = [  # (lineer RGB, ağırlık)
    ((0.20, 0.035, 0.030), 5),   # bordo deri
    ((0.11, 0.020, 0.020), 4),   # koyu şarap
    ((0.035, 0.075, 0.045), 4),  # orman yeşili
    ((0.025, 0.035, 0.075), 4),  # lacivert
    ((0.13, 0.060, 0.025), 6),   # kahve deri
    ((0.30, 0.170, 0.070), 4),   # taba
    ((0.018, 0.016, 0.014), 3),  # siyah
    ((0.45, 0.380, 0.260), 2),   # parşömen
    ((0.32, 0.200, 0.050), 2),   # hardal
    ((0.060, 0.090, 0.090), 2),  # petrol
    ((0.17, 0.150, 0.130), 2),   # gri keten
    ((0.22, 0.090, 0.100), 2),   # gül kurusu
]
LABELS = [(0.012, 0.010, 0.008), (0.16, 0.02, 0.015), (0.03, 0.05, 0.03)]
ROT_FLAT = Matrix.Rotation(math.radians(-90), 4, "Y")


def pick_color(rng):
    colors, weights = zip(*PALETTE)
    base = rng.choices(colors, weights=weights)[0]
    k = rng.uniform(0.72, 1.08)
    return tuple(min(1.0, c * k) for c in base)


def _paint(faces, layer, color, rnd):
    for f in faces:
        for loop in f.loops:
            loop[layer] = (*color, rnd)


def add_book(bm, layer, rng, M, t, d, h, color, style, gilt, label):
    """Kanonik kitap: kalınlık x(0..t), derinlik y(0..d, sırt y=0), yükseklik z(0..h)."""
    sp, bt, pin = 0.0035, min(0.003, t * 0.12), 0.0035
    rnd = rng.random()
    cover = set()
    cover |= C.add_box(bm, (0, 0, 0), (t, sp, h), 0, M)
    cover |= C.add_box(bm, (0, sp, 0), (bt, d, h), 0, M)
    cover |= C.add_box(bm, (t - bt, sp, 0), (t, d, h), 0, M)
    pages = C.add_box(bm, (bt, sp, pin), (t - bt, d - 0.003, h - pin), 1, M)
    _paint(cover, layer, color, rnd)
    _paint(pages, layer, color, rnd)
    if style == "deri":
        n = rng.choice((2, 3, 4, 5))
        zs = [h * (0.12 + 0.76 * i / (n - 1)) for i in range(n)]
        for zc in zs:
            band = C.add_box(bm, (-0.0008, -0.0016, zc - 0.0035), (t + 0.0008, sp, zc + 0.0035),
                             2 if gilt else 0, M)
            _paint(band, layer, color, rnd)
    if label:
        lab_col = rng.choice(LABELS)
        lab = C.add_box(bm, (t * 0.1, -0.0009, h * 0.64), (t * 0.9, 0.0005, h * 0.76),
                        2 if (gilt and rng.random() < 0.3) else 0, M)
        _paint(lab, layer, lab_col, rnd)


def _series(rng, max_h, max_d):
    return dict(
        n=rng.choices([1, 2, 3, 4, 6, 8, 12], weights=[30, 12, 10, 8, 6, 4, 3])[0],
        color=pick_color(rng),
        h=rng.uniform(0.19, max(0.2, min(0.335, max_h - 0.015))),
        t=rng.uniform(0.018, 0.055),
        d=rng.uniform(0.15, min(0.27, max_d)),
        style="deri" if rng.random() < 0.55 else "bez",
        gilt=rng.random() < 0.65,
        label=rng.random() < 0.35,
    )


def _lean(bm, layer, rng, M_case, x_end, x_max, y, z0, max_h, max_d):
    space = x_max - x_end
    if space < 0.05:
        return
    h = rng.uniform(0.2, max(0.21, min(0.32, max_h - 0.02)))
    t = rng.uniform(0.02, 0.04)
    theta = math.radians(rng.uniform(7, 24))
    while h * math.sin(theta) + t * math.cos(theta) > space - 0.004 and theta > 0.05:
        theta *= 0.8
    M = M_case @ Matrix.Translation((x_end + h * math.sin(theta), y, z0)) \
        @ Matrix.Rotation(-theta, 4, "Y")
    s = _series(rng, max_h, max_d)
    add_book(bm, layer, rng, M, t, s["d"], h, s["color"], s["style"], s["gilt"], s["label"])


def _flat_stack(bm, layer, rng, M_case, x, y, z0, max_h, max_d):
    length = rng.uniform(0.21, 0.3)
    z = z0
    for _ in range(rng.randint(2, 5)):
        s = _series(rng, max_h, max_d)
        t = rng.uniform(0.022, 0.05)
        if z + t - z0 > max_h - 0.03:
            break
        lb = length * rng.uniform(0.86, 1.0)
        off = rng.uniform(-0.01, 0.01)
        M = M_case @ Matrix.Translation((x + lb + off, y + rng.uniform(0, 0.02), z)) @ ROT_FLAT
        add_book(bm, layer, rng, M, t, s["d"], lb, s["color"], s["style"], s["gilt"], s["label"])
        z += t
    return x + length + 0.012


def fill_shelf(bm, layer, rng, M_case, x0, x1, y_front, max_d, z0, max_h, skip=None):
    x = x0 + rng.uniform(0.0, 0.012)
    while x1 - x > 0.03:
        if skip and skip[0] - 0.002 <= x < skip[1]:
            x = skip[1]
            continue
        r = rng.random()
        if r < 0.05 and x1 - x > 0.35 and not (skip and x < skip[1] and x + 0.17 > skip[0]):
            gap = rng.uniform(0.06, 0.16)
            if rng.random() < 0.5:
                _lean(bm, layer, rng, M_case, x, x + gap, y_front + 0.01, z0, max_h, max_d)
            x += gap
            continue
        if r < 0.10 and x1 - x > 0.34 and not (skip and x < skip[1] and x + 0.34 > skip[0]):
            x = _flat_stack(bm, layer, rng, M_case, x, y_front, z0, max_h, max_d)
            continue
        s = _series(rng, max_h, max_d)
        placed = 0
        for _ in range(s["n"]):
            t = s["t"] * rng.uniform(0.94, 1.06)
            if x + t > x1 - 0.002 or (skip and x + t > skip[0] and x < skip[1]):
                break
            M = M_case @ Matrix.Translation((x, y_front + rng.uniform(0.003, 0.028), z0))
            add_book(bm, layer, rng, M, t, s["d"] * rng.uniform(0.97, 1.0), s["h"],
                     s["color"], s["style"], s["gilt"], s["label"])
            x += t + rng.uniform(0.0, 0.0025)
            placed += 1
        if placed == 0:
            if skip and x < skip[1] and x + 0.06 > skip[0]:
                x = skip[1]
                continue
            break
    if x1 - x > 0.05 and rng.random() < 0.8:
        _lean(bm, layer, rng, M_case, x, x1, y_front + 0.01, z0, max_h, max_d)


# ---------------------------------------------------------------- malzemeler

def book_materials():
    cilt = C._new_material("Kitap_Cilt")
    nt = cilt.node_tree
    bsdf = C.bsdf_of(cilt)
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "kitap_renk"
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 140.0
    noise.inputs["Detail"].default_value = 8.0
    mottle = nt.nodes.new("ShaderNodeMapRange")
    mottle.inputs["To Min"].default_value = 0.78
    mottle.inputs["To Max"].default_value = 1.12
    nt.links.new(noise.outputs["Fac"], mottle.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeVectorMath")
    mul.operation = "SCALE"
    nt.links.new(attr.outputs["Color"], mul.inputs[0])
    nt.links.new(mottle.outputs["Result"], mul.inputs["Scale"])
    nt.links.new(mul.outputs["Vector"], bsdf.inputs["Base Color"])
    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.38
    rough.inputs["To Max"].default_value = 0.82
    nt.links.new(attr.outputs["Alpha"], rough.inputs["Value"])
    nt.links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.0005
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    sayfa = C._new_material("Kitap_Sayfa")
    nt = sayfa.node_tree
    bsdf = C.bsdf_of(sayfa)
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "kitap_renk"
    ramp = nt.nodes.new("ShaderNodeMix")
    ramp.data_type = "RGBA"
    ramp.inputs["A"].default_value = (0.78, 0.72, 0.58, 1)
    ramp.inputs["B"].default_value = (0.55, 0.43, 0.26, 1)
    nt.links.new(attr.outputs["Alpha"], ramp.inputs["Factor"])
    nt.links.new(ramp.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 900.0
    wave.inputs["Distortion"].default_value = 4.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.15
    bump.inputs["Distance"].default_value = 0.0003
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    altin = C.simple_material("Altin_Varak", (0.83, 0.61, 0.26), roughness=0.28, metallic=1.0)
    return [cilt, sayfa, altin]


# ---------------------------------------------------------------- kitaplık

def _uprights(length):
    n = max(1, round(length / 0.95))
    return [length * i / n for i in range(n + 1)]


def _hollow_bay(bm, xa, xb, D, cz):
    """Kapısı açılabilen bölmenin içi: arka, taban, tavan, ara raf ve yan paneller."""
    box = C.add_box
    box(bm, (xa, D - 0.014, 0.1), (xb, D, cz - 0.04), 1)
    box(bm, (xa, 0.012, 0.1), (xb, D, 0.118))
    box(bm, (xa, 0.012, cz - 0.058), (xb, D, cz - 0.04))
    box(bm, (xa, 0.03, 0.47), (xb, D - 0.014, 0.488))
    box(bm, (xa, 0.012, 0.1), (xa + 0.018, D, cz - 0.04))
    box(bm, (xb - 0.018, 0.012, 0.1), (xb, D, cz - 0.04))


def _door(name, col, mats, case, d0, d1, xm, cz, idx):
    """Menteşeli ayrı kapı; orijini menteşe ekseninde. idx 0: menteşe solda, 1: sağda."""
    w = d1 - d0
    hinge = d0 if idx == 0 else d1
    x_lo, x_hi = (0.0, w) if idx == 0 else (-w, 0.0)
    bm = bmesh.new()
    C.add_box(bm, (x_lo, 0.0, 0.11), (x_hi, 0.014, cz - 0.05))
    C.add_box(bm, (x_lo + 0.06, -0.008, 0.18), (x_hi - 0.06, 0.002, cz - 0.12))
    knob_x = (xm - 0.04 if idx == 0 else xm + 0.04) - hinge
    C.add_sphere(bm, (knob_x, -0.012, 0.62), 0.016, mat=2)
    door = C.mesh_object(f"{name}_Kapi", bm, col, mats)
    C.add_bevel(door, width=0.004, segments=2)
    door.parent = case
    door.location = (hinge, 0.0, 0.0)
    door["etkilesim"] = "kapi_ac"
    door["acilma_yonu"] = -1 if idx == 0 else 1
    return door


def build_case(name, col, case_mats, book_mats, origin, rot_z, length, seed,
               rail=False, skip=None, door=None):
    rng = random.Random(seed)
    D, Du = L.CASE_LOWER_D, L.CASE_UPPER_D
    yu, t, top, cz = D - Du, 0.045, L.CASE_TOP, L.CASE_COUNTER
    xs = _uprights(length)
    S = L.CASE_SHELVES
    levels = [cz + k * (top - cz) / S for k in range(S)]

    bm = bmesh.new()
    box = C.add_box
    box(bm, (0, 0.035, 0), (length, D, 0.1))
    if door:
        hx0, hx1 = xs[door[0]], xs[door[0] + 1]
        if hx0 > 0:
            box(bm, (0, 0.012, 0.1), (hx0, D, cz - 0.04))
        if hx1 < length:
            box(bm, (hx1, 0.012, 0.1), (length, D, cz - 0.04))
        _hollow_bay(bm, hx0, hx1, D, cz)
    else:
        box(bm, (0, 0.012, 0.1), (length, D, cz - 0.04))
    door_span = None
    for i in range(len(xs) - 1):
        xa, xb = xs[i], xs[i + 1]
        xm = (xa + xb) / 2
        for j, (d0, d1) in enumerate(((xa + 0.03, xm - 0.002), (xm + 0.002, xb - 0.03))):
            if door and door == (i, j):
                door_span = (d0, d1, xm)
                continue
            box(bm, (d0, 0.0, 0.11), (d1, 0.014, cz - 0.05))
            box(bm, (d0 + 0.06, -0.008, 0.18), (d1 - 0.06, 0.002, cz - 0.12))
            C.add_sphere(bm, (xm - 0.04 if j == 0 else xm + 0.04, -0.012, 0.62), 0.016, mat=2)
    for x in xs:
        box(bm, (max(0, x - 0.03), -0.004, 0.1), (min(length, x + 0.03), 0.014, cz - 0.04))
    box(bm, (-0.02, -0.03, cz - 0.04), (length + 0.02, D, cz))

    for x in xs:
        lo, hi = max(0.0, x - t / 2), min(length, x + t / 2)
        if x == 0:
            hi = t
        if x == length:
            lo = length - t
        box(bm, (lo, yu, cz), (hi, D, top))
        box(bm, (lo - 0.008, yu - 0.018, cz), (hi + 0.008, yu + 0.01, top))
    for i in range(len(xs) - 1):
        xl = xs[i] + (t if i == 0 else t / 2)
        xr = xs[i + 1] - (t if i + 1 == len(xs) - 1 else t / 2)
        for z in levels[1:]:
            box(bm, (xl, yu + 0.005, z - 0.028), (xr, D - 0.012, z))
            box(bm, (xl, yu - 0.002, z - 0.042), (xr, yu + 0.02, z + 0.003))
    box(bm, (0, D - 0.012, cz), (length, D, top), 1)
    box(bm, (0, yu, top), (length, D, top + 0.03))
    box(bm, (0, yu - 0.014, top - 0.12), (length, yu + 0.02, top + 0.03))
    for proj, z0, z1 in ((0.02, top + 0.03, top + 0.08), (0.045, top + 0.08, top + 0.14),
                         (0.07, top + 0.14, top + 0.19)):
        box(bm, (-proj, yu - proj, z0), (length + proj, D, z1))
    if rail:
        yr, zr = yu - 0.1, 3.58
        C.add_cylinder(bm, (length / 2, yr, zr), 0.014, length - 0.04, axis="X", mat=2)
        for x in xs:
            xc = min(max(x, 0.03), length - 0.03)
            box(bm, (xc - 0.012, yr - 0.004, zr - 0.012), (xc + 0.012, yu - 0.015, zr + 0.012), 2)

    case = C.mesh_object(f"{name}_Govde", bm, col, case_mats, origin, rot_z)
    C.add_bevel(case, width=0.004, segments=2)
    if door_span:
        _door(name, col, case_mats, case, *door_span, cz, door[1])

    bm = bmesh.new()
    layer = bm.loops.layers.float_color.new("kitap_renk")
    I = Matrix.Identity(4)
    y_front = yu + 0.022
    max_d = D - 0.012 - y_front
    for i in range(len(xs) - 1):
        xl = xs[i] + (t if i == 0 else t / 2)
        xr = xs[i + 1] - (t if i + 1 == len(xs) - 1 else t / 2)
        for k, z0 in enumerate(levels):
            ceiling = levels[k + 1] - 0.045 if k + 1 < S else top - 0.125
            sk = skip[2] if skip and skip[0] == i and skip[1] == k else None
            fill_shelf(bm, layer, rng, I, xl + 0.004, xr - 0.004, y_front, max_d, z0,
                       ceiling - z0 - 0.005, skip=sk)
    if door:
        hx0, hx1 = xs[door[0]] + 0.03, xs[door[0] + 1] - 0.03
        x = hx0
        while hx1 - x > 0.32:
            x = _flat_stack(bm, layer, rng, I, x, 0.06, 0.118, 0.33, D - 0.09) + 0.03
        fill_shelf(bm, layer, rng, I, hx0, hx1, 0.05, D - 0.08, 0.488, 0.29)
    books = C.mesh_object(f"{name}_Kitaplar", bm, col, book_mats, origin, rot_z, recalc=False)
    return case, books


def case_placements():
    W, D, yb = L.ROOM_HALF_W, L.CASE_LOWER_D, L.Y_BACK
    back_len = W - L.CASE_INNER_X
    side_y1 = yb - D
    side_len = side_y1 - L.SIDE_CASE_Y0
    return [
        ("Arka_Sol", (-W, yb - D, 0), 0.0, back_len, 11, True, None, None),
        ("Arka_Sag", (L.CASE_INNER_X, yb - D, 0), 0.0, back_len, 12, False,
         (0, 2, (0.30, 0.37)), None),
        ("Yan_Sol", (-W + D, L.SIDE_CASE_Y0, 0), math.radians(90), side_len, 13, False, None,
         (1, 1)),
        ("Yan_Sag", (W - D, side_y1, 0), math.radians(-90), side_len, 14, False, None, None),
    ]


def build(col_name="Kitapliklar", wood=None):
    C.clear_collection(col_name)
    col = C.collection(col_name)
    wood = wood or bpy.data.materials["Ahsap_Raf"]
    dark = C.pbr_box("Ahsap_Koyu", "smoke_speckled_veneer", real_size=1.0,
                     tint=(0.8, 0.65, 0.5), value=0.45)
    case_mats = [wood, dark, C.brass_material()]
    book_mats = book_materials()
    out = []
    for name, origin, rot, length, seed, rail, skip, door in case_placements():
        out.append(build_case(name, col, case_mats, book_mats, origin, rot, length, seed,
                              rail=rail, skip=skip, door=door))
    return out
