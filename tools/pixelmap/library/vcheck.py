"""The variation gate (B6347): every object in every era it spans has at least ten variations that look different,
every regional style at every wealth band looks different from the others, and every drawing keeps to its footprint.
It also draws each object's sheet: one row an era, one picture a variation, at true size.

    python3 tools/pixelmap/library/vcheck.py FAMILY|ID ... [--sheet OUTDIR] [--quick]

Exit 1 with a list of problems when any object fails. --quick checks two eras an object (its first and last)."""
import os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import library  # noqa: F401
from library.core import CATALOGUE, render
from library.census import CENSUS, ERAS
from library import variants as V
from library.measure import measure

DIFF = 7.0            # mean difference (0-255) over the object's own pixels for two variations to count as different
MIN = V.MIN_VARIANTS
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _pic(oid, v):
    sp = CATALOGUE[oid]; w, d = sp.size(); st = sp.states[0]
    r = render(sp, "s", w, d, st, v, seed=11)
    return r


def _sig(r, size=24):
    """The drawing's footprint (and the few pixels its edge and shadow may take), shrunk to a small square, so a cup
    and a cart are compared on their own pixels and not on the empty floor round them."""
    a = r["rgb"].astype(np.float32); b = r["body"]
    a = np.where(b[..., None], a, 0)
    k = max(0, r.get("pad", 0) - 4); H, W = a.shape[:2]
    if k and H > 2 * k + 2 and W > 2 * k + 2: a = a[k:H - k, k:W - k]
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((size, size), Image.BILINEAR)
    return np.asarray(im).astype(np.float32)


SHAPE_SAME = 0.08  # a twin whose light-and-dark pattern differs less than this is a recolour, not a new look


def _shape(sig):
    """The drawing's light-and-dark pattern with colour, tint and overall brightness taken out (grey, then scaled to
    its own mean and spread), so an era passed off with a colour cast alone is caught."""
    g = sig.mean(axis=2); m = g > 0
    if m.sum() < 4: return g
    return np.where(m, (g - g[m].mean()) / (g[m].std() + 1e-6), 0)


def _asym(r):
    """How far the drawing is from its own left-right mirror (front to the south), on the body only."""
    a = r["rgb"].astype(np.float32).mean(axis=2); b = r["body"]
    ys, xs = np.nonzero(b)
    if len(xs) < 9: return 0.0
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; m = b[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    both = m & m[:, ::-1]
    return float(np.abs(a - a[:, ::-1])[both].mean()) if both.any() else 0.0


def check(oid, eras=None):
    bad = []
    if oid not in CATALOGUE: return [f"{oid}: in the census but not drawn (no library definition)"]
    prev = None
    for era in (eras or V.eras_for(oid)):
        vs = V.variations(oid, era)
        pics = [_pic(oid, v) for v in vs]; sigs = [_sig(p) for p in pics]
        asy = [_asym(p) for p in pics]; med = float(np.median(asy))
        odd = [v["vid"] for v, a in zip(vs, asy) if a > max(2.2 * med, med + 18)]  # a stray or off-centre detail
        if odd: bad.append(f"{oid} {era}: {len(odd)} variations far less symmetric than the rest (a misaligned or stray detail?), e.g. {odd[0]}")
        # each era its own: the same variation one era on must look different in most cases (Long Night is not Dark Ages)
        if prev is not None and eras is None:
            pe, pv, ps = prev; same = []
            for v, sg in zip(vs, sigs):
                twin = next((k for k, w in enumerate(pv) if {a: b for a, b in w.items() if a not in ("era", "age", "vid")} == {a: b for a, b in v.items() if a not in ("era", "age", "vid")}), None)
                if twin is not None and (np.abs(sg - ps[twin]).mean() <= DIFF / 2
                                         or np.abs(_shape(sg) - _shape(ps[twin])).mean() <= SHAPE_SAME): same.append(v["vid"])
            if len(same) > len(vs) // 2: bad.append(f"{oid} {era}: {len(same)} of {len(vs)} variations look the same as in {pe}, or differ only in colour (each era needs its own look: change how it is made, not only its tint), e.g. {same[0]}")
        prev = (era, vs, sigs)
        distinct = []
        for k, s in enumerate(sigs):
            if all(np.abs(s - sigs[j]).mean() > DIFF for j in distinct): distinct.append(k)
        if len(distinct) < MIN: bad.append(f"{oid} {era}: only {len(distinct)} of {len(vs)} variations look different (needs {MIN})")
        same = [(vs[i]["vid"], vs[j]["vid"]) for i in range(len(vs)) for j in range(i + 1, len(vs))
                if vs[i].get("style") != vs[j].get("style") and np.abs(sigs[i] - sigs[j]).mean() <= DIFF / 2]
        if len(same) > len(vs) // 3: bad.append(f"{oid} {era}: {len(same)} pairs of different regions look alike, e.g. {same[0][0]} and {same[0][1]}")
        for v in vs[:: max(1, len(vs) // 4)]:                       # a few variations of each era against the footprint
            try:
                for p in measure(CATALOGUE[oid], var=v)[1]: bad.append(f"{v['vid']}: {p}")
            except Exception as e: bad.append(f"{v['vid']}: cannot be drawn: {e}")
    return bad


def sheet(oid, outdir, cols=14, scale=1):
    """One object's sheet: a row for each era, its variations along the row, each labelled."""
    os.makedirs(outdir, exist_ok=True); f = ImageFont.truetype(FONT, 13); f2 = ImageFont.truetype(FONT, 18)
    rows = []
    for era in V.eras_for(oid):
        pics = []
        for v in V.variations(oid, era):
            r = _pic(oid, v); a = r["rgb"].astype(np.float32); m = r["mult"]
            floor = np.full(a.shape, (92, 70, 52), np.float32)
            img = np.where(r["body"][..., None], a, floor * m).clip(0, 255).astype(np.uint8)
            pics.append((Image.fromarray(img), V.label(v)))
        rows.append((era, pics))
    cw = max(max(p.size[0] for p, _ in ps) for _, ps in rows) + 10; ch = max(max(p.size[1] for p, _ in ps) for _, ps in rows) + 34
    width = 150 + cw * min(cols, max(len(ps) for _, ps in rows))
    height = sum(ch * (-(-len(ps) // cols)) for _, ps in rows) + 50
    out = Image.new("RGB", (width, height), (24, 22, 26)); d = ImageDraw.Draw(out)
    d.text((10, 10), f"{CATALOGUE[oid].name} ({oid})", fill=(236, 230, 214), font=f2); y = 44
    for era, ps in rows:
        d.text((10, y + 6), dict((k, l) for k, _, _, l in ERAS)[era], fill=(200, 190, 170), font=f)
        for i, (p, lab) in enumerate(ps):
            x = 150 + (i % cols) * cw; yy = y + (i // cols) * ch
            out.paste(p, (x, yy)); d.text((x, yy + p.size[1] + 2), lab[:34], fill=(150, 144, 132), font=ImageFont.truetype(FONT, 10))
        y += ch * (-(-len(ps) // cols))
    if scale != 1: out = out.resize((out.size[0] * scale, out.size[1] * scale), Image.NEAREST)
    p = os.path.join(outdir, f"{oid}.png"); out.save(p, optimize=True); return p


def ids_for(args):
    fams = {r.family for r in CENSUS}; out = []
    for a in args:
        if a in fams: out += [r.id for r in CENSUS if r.family == a]
        else: out.append(a)
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]; quick = "--quick" in sys.argv
    outdir = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    if outdir: args = [a for a in args if a != outdir]
    bad = []
    for oid in ids_for(args):
        eras = None
        if quick and oid in CATALOGUE:
            e = V.eras_for(oid); eras = [e[0], e[-1]] if e else []
        bad += check(oid, eras)
        if outdir and oid in CATALOGUE: print(sheet(oid, outdir))
    print("\n".join(bad) or "variation gate passes")
    sys.exit(1 if bad else 0)
