"""Sahneyi baştan üretir. Blender içinde:  exec(open(".../build_all.py").read())

İçe aktarılan varlıklar (Fislik_Dolabi, HDRI dünyaları, Poly Haven modelleri) korunur;
prosedürel her şey (oda, kitaplıklar, ışık, aksesuarlar) yeniden kurulur.
"""
import importlib
import sys

P = "/home/berkay/Projeler/Kutuphane_otomasyonu/fislik/claude_3d/scripts"
if P not in sys.path:
    sys.path.insert(0, P)

import kt_common, kt_layout, kt_room, kt_shelves, kt_light  # noqa: E401,E402

for _m in (kt_common, kt_layout, kt_room, kt_shelves, kt_light):
    importlib.reload(_m)


def build_all(parts=("room", "shelves", "light")):
    if "room" in parts:
        kt_room.build()
    if "shelves" in parts:
        kt_shelves.build()
    if "light" in parts:
        kt_light.build()
    if "props" in parts:
        import kt_props
        importlib.reload(kt_props)
        kt_props.build()
    if "decor" in parts:
        import kt_decor
        importlib.reload(kt_decor)
        kt_decor.build()
    if "states" in parts:
        import kt_states
        importlib.reload(kt_states)
        kt_states.build()


def render(path, samples=128, percent=50):
    import bpy
    scn = bpy.context.scene
    scn.cycles.samples = samples
    scn.render.resolution_percentage = percent
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
