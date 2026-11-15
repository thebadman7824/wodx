"""A whole-map picture as players see it (B6337): the background with every door, window and container laid back on
in its starting state (windows open, the rest shut), for close-ups and before-and-after pictures.

    python3 tools/pixelmap/library/view.py MAPDIR OUT.png [x0 y0 x1 y1 squares to crop] [--scale 1]"""
import json, os, sys
from PIL import Image

T = 94


def view(d, crop=None):
    name = os.path.basename(os.path.normpath(d)); side = json.load(open(os.path.join(d, f"{name}.wodx.json")))
    img = Image.open(os.path.join(d, side["map"])).convert("RGBA")
    for o in side.get("features", []) + side.get("openings", []):
        art = o.get("art"); r = o.get("artRect") or o.get("rect")
        if not art or not r: continue
        st = "open" if o.get("startOpen") else "closed"
        t = Image.open(os.path.join(d, art[st])).convert("RGBA"); img.alpha_composite(t, (int(round(r[0] * T)), int(round(r[1] * T))))
    if crop: img = img.crop(tuple(int(v * T) for v in crop))
    return img.convert("RGB")


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    view(a[0], [float(v) for v in a[2:6]] if len(a) >= 6 else None).save(a[1])
