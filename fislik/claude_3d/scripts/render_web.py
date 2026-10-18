"""Frontend sahne varlıklarını arka planda (başsız Blender) üretir.

Kullanım:
  blender -b fislik/claude_3d/kutuphane_claude.blend --python fislik/claude_3d/scripts/render_web.py
  ... -- --sadece-veri     yalnızca sahne.json (etkileşim alanları, huzme şekli)
"""
import sys
import time

P = "/home/berkay/Projeler/Kutuphane_otomasyonu/fislik/claude_3d/scripts"
if P not in sys.path:
    sys.path.insert(0, P)

import kt_web  # noqa: E402


def log(*parts):
    print("[render_web]", *parts, flush=True)


def main(argv):
    started = time.time()
    data = kt_web.scene_data()
    log("veri yazildi:", kt_web.write_data(data))
    if "--sadece-veri" in argv:
        return
    for theme in kt_web.THEMES:
        t = time.time()
        kt_web.render_base(theme)
        log(f"arka plan {theme}: {time.time() - t:.1f}s")
    for item in data["etkilesimler"]:
        for theme in kt_web.THEMES:
            t = time.time()
            kt_web.render_sprites(item["id"], theme, item["alan"])
            log(f"kareler {item['id']}/{theme}: {time.time() - t:.1f}s")
    log(f"BITTI toplam {time.time() - started:.0f}s")


main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
