"""Web demosu için çıktı: tema arka planları, etkileşim kare dizileri ve sahne verisi (sahne-data.js).

Her etkileşim yalnızca kendi ekran bölgesinde render edilir; diğer etkileşimlerin animasyonu
o sırada durdurulur ki bölgeler birbirine karışmasın.
"""
import json
import os

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

import kt_common as C
import kt_layout as L
import kt_light
import kt_room
import kt_states

FRONTEND = os.path.normpath(os.path.join(C.ROOT, "..", "..", "frontend"))
ASSETS = os.path.join(FRONTEND, "public", "sahne")
DATA_PATH = os.path.join(FRONTEND, "src", "sahne", "sahne.json")
W, H = 2560, 1440
SAMPLES = 384
THEMES = {"gunduz": kt_light.day, "gece": kt_light.night}


# ---------------------------------------------------------------- izdüşüm

def _meshes(names):
    out = []
    for n in names:
        obj = bpy.data.objects.get(n)
        if obj:
            out.extend(o for o in [obj, *obj.children_recursive] if o.type == "MESH")
    return out


def _to_px(co):
    scn = bpy.context.scene
    p = world_to_camera_view(scn, scn.camera, co)
    return p.x * W, (1 - p.y) * H


def _rect(objs, frames, pad, min_size=0):
    scn = bpy.context.scene
    xs, ys = [], []
    for f in frames:
        scn.frame_set(f)
        for o in objs:
            for c in o.bound_box:
                x, y = _to_px(o.matrix_world @ Vector(c))
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    if x1 - x0 < min_size:
        cx = (x0 + x1) / 2
        x0, x1 = cx - min_size / 2, cx + min_size / 2
    if y1 - y0 < min_size:
        cy = (y0 + y1) / 2
        y0, y1 = cy - min_size / 2, cy + min_size / 2
    x0, y0 = max(0, int(x0)), max(0, int(y0))
    x1, y1 = min(W, int(x1) + 1), min(H, int(y1) + 1)
    scn.frame_set(kt_states.FRAMES[0])
    return [x0, y0, x1 - x0, y1 - y0]


def _hull(points):
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def beam_polygon(toward, y_limit=-2.4):
    """Pencereden giren huzmenin ekrandaki dış sınırı (toz parçacıkları için)."""
    hw = L.WIN_HALF_W - L.WIN_FRAME_W
    pts = []
    for x, z in kt_room.arch_points(hw, L.WIN_SILL, L.WIN_SPRING, segs=12):
        q = Vector((x, L.WIN_FRAME_Y, z))
        t = q.z / toward.z
        if toward.y > 0 and (q.y - toward.y * t) < y_limit:
            t = (q.y - y_limit) / toward.y
        p = q - toward * t
        for co in (q, p):
            px, py = _to_px(co)
            pts.append((round(px, 1), round(py, 1)))
    return [list(p) for p in _hull(pts)]


# ---------------------------------------------------------------- render

def _setup(samples):
    scn = bpy.context.scene
    kt_light.render_settings(preview=False)
    scn.cycles.samples = samples
    scn.render.resolution_x, scn.render.resolution_y = W, H
    scn.render.resolution_percentage = 100
    scn.render.use_persistent_data = True
    fmt = scn.render.image_settings
    fmt.file_format = "WEBP"
    fmt.color_mode = "RGB"
    fmt.quality = 88
    scn.render.use_file_extension = True
    dust = bpy.data.objects.get("Toz_Zerreleri")
    if dust:
        dust.hide_render = True


def _border(rect=None):
    r = bpy.context.scene.render
    r.use_border = rect is not None
    r.use_crop_to_border = rect is not None
    if rect:
        x, y, w, h = rect
        r.border_min_x, r.border_max_x = x / W, (x + w) / W
        r.border_min_y, r.border_max_y = 1 - (y + h) / H, 1 - y / H


def _render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def _freeze_others(active_key):
    """Etkin olmayan etkileşimlerin animasyonunu geçici olarak ayırır (kare 1 hâlinde kalırlar)."""
    bpy.context.scene.frame_set(kt_states.FRAMES[0])
    frozen = []
    for key, (_, names) in kt_states.INTERACTIONS.items():
        if key == active_key:
            continue
        for n in names:
            obj = bpy.data.objects.get(n)
            ad = obj.animation_data if obj else None
            if ad and ad.action:
                frozen.append((obj, ad.action, getattr(ad, "action_slot", None)))
                ad.action = None
    return frozen


def _restore(frozen):
    for obj, action, slot in frozen:
        obj.animation_data.action = action
        if slot is not None and hasattr(obj.animation_data, "action_slot"):
            obj.animation_data.action_slot = slot


def render_base(theme, samples=SAMPLES):
    _setup(samples)
    THEMES[theme]()
    _border(None)
    bpy.context.scene.frame_set(kt_states.FRAMES[0])
    _render(os.path.join(ASSETS, theme))


def render_sprites(key, theme, rect, samples=SAMPLES):
    _setup(samples)
    THEMES[theme]()
    frozen = _freeze_others(key)
    try:
        _border(rect)
        f0, f1 = kt_states.FRAMES
        for i, f in enumerate(range(f0, f1 + 1), 1):
            bpy.context.scene.frame_set(f)
            _render(os.path.join(ASSETS, "kareler", key, theme, f"f{i:02d}"))
    finally:
        _restore(frozen)
        _border(None)
        bpy.context.scene.frame_set(f0)


# ---------------------------------------------------------------- veri

def scene_data():
    f0, f1 = kt_states.FRAMES
    items = []
    for key, (label, names) in kt_states.INTERACTIONS.items():
        objs = _meshes(names)
        if not objs:
            continue
        items.append({
            "id": key,
            "etiket": label,
            "alan": _rect(objs, range(f0, f1 + 1, 3), pad=26),
            "nokta": _rect(objs, [f0], pad=8, min_size=44),
        })
    return {
        "boyut": {"w": W, "h": H},
        "kareSayisi": f1 - f0 + 1,
        "temalar": {t: f"/sahne/{t}.webp" for t in THEMES},
        "kareYolu": "/sahne/kareler/{id}/{tema}/f{n}.webp",
        "etkilesimler": items,
        "huzme": {"gunduz": beam_polygon(kt_light.SUN_DIR),
                  "gece": beam_polygon(kt_light.MOON_DIR)},
    }


def write_data(data, path=DATA_PATH):
    """Sahne verisi frontend'e JSON olarak yazılır (Blender'dan üretilir, elle düzenlenmez)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    return path
