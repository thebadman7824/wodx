"""Pictures for an object review desk: for each object and era, its variations cropped to the drawing and enlarged so
small things can be judged, on the plank floor, with a strip of its other states.

    python3 library/deskpics.py OUTDIR ID ...      writes OUTDIR/img/<id>-<era>.png and OUTDIR/items.json
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import library.catalogue  # noqa: F401  (loads every family module)
from library.core import CATALOGUE, render
from library import variants as V
from library.census import ERAS

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FLOOR = (92, 70, 52)
ERA_NAME = {k: l for k, _, _, l in ERAS}
ERA_YEARS = {k: (a, b) for k, a, b, _ in ERAS}


def tile(sp, v, st):
    w, d = sp.size(); r = render(sp, "s", w, d, st, v, seed=11)
    a = r["rgb"].astype(np.float32); m = r["mult"]
    img = np.where(r["body"][..., None], a, np.full(a.shape, FLOOR, np.float32) * m).clip(0, 255).astype(np.uint8)
    ys, xs = np.nonzero(r["body"])
    if len(xs):
        k = 6; img = img[max(0, ys.min() - k):ys.max() + k + 1, max(0, xs.min() - k):xs.max() + k + 1]
    return Image.fromarray(img)


def era_sheet(oid, era, n=12, cols=6):
    sp = CATALOGUE[oid]; al = V.variations(oid, era); vs = [al[round(i * (len(al) - 1) / max(1, n - 1))] for i in range(min(n, len(al)))]  # spread over regions and wealth
    tiles = [(tile(sp, v, sp.states[0]), V.label(v)) for v in vs]
    if len(sp.states) > 1:
        for st in sp.states[1:]:
            tiles += [(tile(sp, v, st), f"{st}: {V.label(v)}") for v in vs[:cols]]
    big = max(max(t.size) for t, _ in tiles); z = max(1, min(4, 110 // max(1, big)))
    tiles = [(t.resize((t.size[0] * z, t.size[1] * z), Image.NEAREST), lab) for t, lab in tiles]
    cw = max(max(t.size[0] for t, _ in tiles), 176) + 8; ch = max(t.size[1] for t, _ in tiles) + 26
    cols = max(1, min(cols, 1000 // cw)); rows = -(-len(tiles) // cols)
    out = Image.new("RGB", (cw * cols, ch * rows), (32, 29, 27)); d = ImageDraw.Draw(out); f = ImageFont.truetype(FONT, 10)
    for i, (t, lab) in enumerate(tiles):
        x, y = (i % cols) * cw, (i // cols) * ch
        out.paste(t, (x + (cw - 8 - t.size[0]) // 2, y)); d.text((x, y + ch - 22), lab[:28], fill=(190, 182, 168), font=f)
    return out, z


def main(outdir, ids):
    os.makedirs(os.path.join(outdir, "img"), exist_ok=True); items = []
    for oid in ids:
        sp = CATALOGUE[oid]
        for era in V.eras_for(oid):
            im, z = era_sheet(oid, era); name = f"img/{oid}-{era}.png"; im.save(os.path.join(outdir, name), optimize=True)
            a, b = ERA_YEARS[era]
            items.append({"id": f"{oid}-{era}", "obj": oid, "name": sp.name, "era": ERA_NAME[era], "years": f"{a} to {b}",
                          "zoom": z, "w": im.size[0], "src": name, "states": list(sp.states), "n": len(V.variations(oid, era))})
        print(oid, flush=True)
    json.dump(items, open(os.path.join(outdir, "items.json"), "w"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
