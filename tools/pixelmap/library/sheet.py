"""The contact sheet (B6337): every library object drawn alone at its true size (94 px to the 5 ft square), on a
plank floor with the square grid, its footprint outlined and an arrow on its front, in each state and each look by
age, labelled with what a player calls it, its size, its years and how it stands.

    python3 tools/pixelmap/library/sheet.py OUTDIR [GROUP ...]     one PNG per group plus cards.json"""
import json, os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import library
from library.core import CATALOGUE, render, blend, T, YEAR_END
from library.measure import measure
from px import Map

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(n):
    try: return ImageFont.truetype(FONT, n)
    except OSError: return ImageFont.load_default()


def floor(w, h, seed=3):
    m = Map(max(1, -(-w // T)), max(1, -(-h // T)), seed=seed); m.put(m.planks(m.H, m.W, "wood", bh=18), 0, 0)
    a = np.asarray(m.img).astype(np.float32) * .92; return Image.fromarray(a.clip(0, 255).astype(np.uint8)).crop((0, 0, w, h))


def years(sp):
    a, b = sp.eras; return f"{a} to {'Future Darkness' if b >= YEAR_END else b}"


def ftxt(v):
    return f"{v[0]:g} to {v[1]:g}" if isinstance(v, tuple) else f"{v:g}"


def card(sp, st, look):
    """One picture: the object in state st with look options, on its floor tile, footprint and front marked."""
    wf, df = sp.size(); v = dict(look[3]) if look else sp.look(None)
    v.update(next(iter(sp.variants.values())) if sp.variants else {})
    r = render(sp, "s", wf, df, st, v, 7)
    pad = r["pad"]; H, W = r["rgb"].shape[:2]; m = 30; cw, ch = W + 2 * m, H + 2 * m
    bg = floor(cw, ch); a = np.asarray(bg).astype(np.float32)
    a[m:m + H, m:m + W] = blend(a[m:m + H, m:m + W], r)
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for gx in range(m + pad % T, cw, T): d.line([gx, 0, gx, ch], fill=(255, 255, 255, 60))
    x0, y0 = m + pad, m + pad; x1, y1 = x0 + int(r["fw"] * T), y0 + int(r["fh"] * T)
    for k in range(x0, x1, 8): d.line([k, y0, min(k + 4, x1), y0], fill=(240, 230, 120)); d.line([k, y1, min(k + 4, x1), y1], fill=(240, 230, 120))
    for k in range(y0, y1, 8): d.line([x0, k, x0, min(k + 4, y1)], fill=(240, 230, 120)); d.line([x1, k, x1, min(k + 4, y1)], fill=(240, 230, 120))
    if sp.front:
        cx = (x0 + x1) // 2; d.polygon([(cx - 8, y1 + 6), (cx + 8, y1 + 6), (cx, y1 + 18)], fill=(250, 210, 60), outline=(30, 20, 20))
    return im


def cards_for(sp):
    looks = list(sp.looks) or [None]
    out = []
    for lk in looks:
        for st in sp.states: out.append((lk, st, card(sp, st, lk)))
    return out


def group_sheet(group, specs, outdir, width=2400):
    f1, f2 = font(22), font(16); pieces = []
    for sp in specs:
        for lk, st, im in cards_for(sp):
            lab = [sp.name + (f" ({st})" if st != "one" else ""), f"{ftxt(sp.ft[0])} by {ftxt(sp.ft[1])} ft",
                   (lk[2] + ", " if lk else "") + (f"{lk[0]} to {lk[1]}" if lk else years(sp)), sp.mount + (", front" if sp.front else "")]
            pieces.append((sp.id, im, lab))
    x = y = 20; rowh = 0; placed = []
    for oid, im, lab in pieces:
        w, h = im.size; cw = max(w, 230); chh = h + 96
        if x + cw > width - 20: x = 20; y += rowh + 20; rowh = 0
        placed.append((x, y, oid, im, lab)); x += cw + 20; rowh = max(rowh, chh)
    sheet = Image.new("RGB", (width, y + rowh + 20), (24, 22, 26)); d = ImageDraw.Draw(sheet)
    for x, y, oid, im, lab in placed:
        sheet.paste(im, (x, y))
        for k, t in enumerate(lab): d.text((x, y + im.size[1] + 4 + k * 22), t, fill=(236, 230, 214) if k == 0 else (170, 164, 150), font=f1 if k == 0 else f2)
    p = os.path.join(outdir, f"sheet-{group}.png"); sheet.save(p, optimize=True); return p


def main(outdir, groups=None):
    os.makedirs(outdir, exist_ok=True); by = {}
    for sp in CATALOGUE.values():
        if sp.mount == "opening": continue
        by.setdefault(sp.group, []).append(sp)
    out = []
    for g, specs in by.items():
        if groups and g not in groups: continue
        out.append(group_sheet(g, specs, outdir))
    return out


if __name__ == "__main__":
    for p in main(sys.argv[1], sys.argv[2:] or None): print(p)
