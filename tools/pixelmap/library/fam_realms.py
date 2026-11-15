"""The realms family (B6461): the otherworlds' own objects, drawn from straight above for the realm maps and for the
places on earth where a realm leaks through. The Wyrm's blight and hives (Malfeas, the Scar, tainted woods and works),
living flesh (Malfeas, the Atrocity Realm, the demon Abyss, Tzimisce havens), the fabric of the Underworld (the
Labyrinth and the Tempest), Paradox and the Deep Umbra, the machine realms and the Technocracy's far future, the
Dreaming, and the stones of the Aetherial and Legendary realms, Pangaea and the Duat.

None of these is a people's handicraft, so none takes a regional style (global_from is the first year it is found).
Their variations come from what really varies: the realm it sits in (its palette and growth), its size and stage of
growth (the wealth axis reads as how strong the realm is there: a poor place has a small young growth, a rich one a
great old one), its state (dormant or active, lit or dark, shut or open). Every variation is drawn sound: wear is the shared
layer core.render lays over it.

Each era has its own look, because each realm takes something from the living world of its age:
- the Wyrm's blight and hives feed on the age's poison, and what fed them lies tangled in them (era_poison);
- the fleshcrafter works with the age's surgery, so seams, pins and clamps are the age's own (suture);
- the Underworld draws in the relics of the age's dead (relic);
- Paradox takes the shape of the age's reigning picture of the world (paradigm lines);
- the Weaver's pattern web creeps further into the Umbra each age, and the Avatar Storm scars it from 1997 (weave);
- the machine realms are built from the age's scrap and wire (scrap_bit, WIRE);
- the Dreaming dims as Banality grows, greys through the Long Night and flares again in the Resurgence (glamour);
- the stones of the far realms carry the offerings the age's visitors leave (offering).
Made things (voidship fittings, pylons, pads, missiles) are drawn in the making of their age."""
import math
import zlib

import numpy as np
from PIL import Image, ImageDraw

from px import OUT, T
from library.core import define, CATALOGUE
from library.census import CENSUS, ERAS
from library.art import box_px, tone, mix, ramp, IRON, BRASS, STEEL, COMPOSITE, GLOW, WHITE

EK = [k for k, _, _, _ in ERAS]
EI = {k: i for i, k in enumerate(EK)}
_ROWS = {r.id: r for r in CENSUS}


# ================================================================ shared helpers
class Ctx:
    pass


def ctx(tm, v):
    """The variation in hand: era index e (0 Dark Ages to 8 Future Darkness), wealth w, and an rng seeded
    from the whole variation (era included), so each variation keeps its own shape and each age grows its own."""
    c = Ctx(); c.v = v; c.d = tm.d; c.tm = tm
    c.era = v.get("era") or "dark-ages"; c.e = EI.get(c.era, 0)
    c.w = int(v.get("wealth", 2))
    key = repr(sorted((k, str(x)) for k, x in v.items() if k not in ("vid", "age")))
    c.rng = np.random.default_rng(zlib.crc32(key.encode()))
    c.big = .86 + .05 * c.w                                     # the realm's strength there: size of the growth
    return c


def rp(base, step=18): return ramp(tuple(int(max(0, min(255, b))) for b in base), step)


def poly(tm, pts, col, out=OUT): tm.d.polygon([(float(a), float(b)) for a, b in pts], fill=col, outline=out)


def pshadow(tm, pts, dx=4, dy=5, f=.6):
    sp = [(a + dx, b + dy) for a, b in pts]
    tm.shade((min(p[0] for p in sp), min(p[1] for p in sp), max(p[0] for p in sp) + 1, max(p[1] for p in sp) + 1), f=f, kind="poly", pts=sp)


def eshadow(tm, cx, cy, rx, ry, dx=4, dy=5, f=.6):
    tm.shade((cx - rx + dx, cy - ry + dy, cx + rx + dx, cy + ry + dy), f=f, kind="ellipse")


def lit_ellipse(tm, cx, cy, rx, ry, C, out=OUT):
    """A rounded thing lit from the north-west: dark rim, body, lit crescent."""
    d = tm.d
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C[1], outline=out)
    if rx > 3 and ry > 3:
        d.ellipse([cx - rx + 1, cy - ry + 1, cx + rx - 2, cy + ry - 2], fill=C[2])
        d.ellipse([cx - rx * .7 - 1, cy - ry * .7 - 1, cx + rx * .25, cy + ry * .25], fill=C[3])
        if rx > 6: d.ellipse([cx - rx * .55, cy - ry * .55, cx - rx * .2, cy - ry * .2], fill=C[4])


def lit_rect(tm, x0, y0, x1, y1, C, out=OUT, r=0):
    d = tm.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 <= x0 or y1 <= y0: return
    if r: d.rounded_rectangle([x0, y0, x1, y1], r, fill=C[2], outline=out)
    else: d.rectangle([x0, y0, x1, y1], fill=C[2], outline=out)
    if x1 - x0 > 4 and y1 - y0 > 4:
        d.line([x0 + 1 + r // 2, y0 + 1, x1 - 1 - r // 2, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + 1 + r // 2, x0 + 1, y1 - 1 - r // 2], fill=C[3])
        d.line([x0 + 1 + r // 2, y1 - 1, x1 - 1 - r // 2, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + 1 + r // 2, x1 - 1, y1 - 1 - r // 2], fill=C[1])


def blob(c, cx, cy, rx, ry, n=14, jag=.18):
    a0 = c.rng.uniform(0, 6.28)
    return [(cx + math.cos(a) * rx * c.rng.uniform(1 - jag, 1), cy + math.sin(a) * ry * c.rng.uniform(1 - jag, 1)) for a in np.linspace(0, 2 * math.pi, n, endpoint=False) + a0]


def lump(tm, c, cx, cy, rx, ry, C, jag=.15, sh=True, out=OUT, n=14):
    """A heaped soft thing from above: ragged outline, body, lighter rings stepped toward the north-west light."""
    pts = blob(c, cx, cy, rx, ry, n, jag)
    if sh: pshadow(tm, pts, 3, 4, .62)
    tm.d.polygon(pts, fill=C[1], outline=out)
    for t, k in ((.8, 2), (.52, 3), (.26, 4)):
        tm.d.polygon([(cx + (a - cx) * t - rx * (1 - t) * .3, cy + (b - cy) * t - ry * (1 - t) * .3) for a, b in pts], fill=C[k])
    return pts


def thick(tm, pts, col, w, out=OUT):
    """A line with a dark rim (a root, a tube, a cable)."""
    tm.d.line(pts, fill=out, width=w + 2); tm.d.line(pts, fill=col, width=w)


def curve(c, x0, y0, x1, y1, bend=.25, n=7):
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2; nx, ny = -(y1 - y0), (x1 - x0)
    k = c.rng.uniform(-bend, bend); bx, by = mx + nx * k, my + ny * k
    return [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * bx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * by + t * t * y1) for t in np.linspace(0, 1, n)]


def blk(tm, x, y, s, col, out=None):
    """A small square cluster (never a lone pixel)."""
    tm.d.rectangle([x, y, x + s, y + s], fill=col, outline=out)


def glow(tm, cx, cy, r, rgb, power=.9):
    """Light a glowing thing throws on itself and the floor near it, tinted by its colour."""
    m = max(rgb) or 1
    tm.glow(cx, cy, r, col=tuple(.75 + .75 * v / m for v in rgb), power=power)


def clipped(draw):
    """The drawing kept to its footprint, with room only for the short shadow south-east."""
    def f(tm, x, y, w, h, st, v):
        a0 = np.asarray(tm.img).copy(); draw(tm, x, y, w, h, st, v)
        X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); a1 = np.asarray(tm.img).copy(); keep = np.zeros(a1.shape[:2], bool)
        keep[max(0, Y0 - 2):Y1 + 3, max(0, X0 - 2):X1 + 3] = True; a1[~keep] = a0[~keep]
        tm.img.paste(Image.fromarray(a1), (0, 0))
    f.__doc__ = draw.__doc__; f.__name__ = draw.__name__
    return f


def era_looks(a, b):
    return tuple((max(a, y0), min(b, y1), lab, {"era": k}) for k, y0, y1, lab in ERAS if y0 <= b and y1 >= a)


def R(oid, draw, axes, ref, nvar=14, **kw):
    """Define one realm object: a look for each era it spans, its rooms (realm ids) from the census, one look the
    worlds over from its first year (no people's style), and its size reference."""
    row = _ROWS[oid]; ya, _, yb = row.years.partition("-"); a, b = int(ya) if ya else 1197, int(yb) if yb else 2200
    kw.setdefault("looks", era_looks(a, b)); kw.setdefault("tags", tuple(t.strip().rsplit(" ", 1)[0] for t in row.where.split(",")))
    gf = next(y0 for k, y0, y1, _ in ERAS if y0 <= a <= y1) if a > 1197 else a      # one look the worlds over from the first era it is in
    return define(oid, draw=clipped(draw), axes=axes, ref=ref, global_from=gf, nvar=nvar, **kw)


def frame(x, y, w, h, inset=2):
    X0, Y0, X1, Y1 = box_px(x, y, w, h, inset); return X0, Y0, X1, Y1, (X0 + X1) / 2, (Y0 + Y1) / 2


# ================================================================ what each age leaves in a realm
def era_poison(tm, c, px_, py_, q):
    """What fed the Wyrm's growth in each age, lying tangled in it: a rusted mail shirt and a bone (Dark Ages), a
    limed plague shroud (Long Night), a cracked alchemist's flask (Renaissance), a tar keg (Age of Reason), a heap of
    furnace slag (Victorian), a gas shell (Great War), a rusted oil drum with its hazard mark (Mid-Century), a leaking
    blue plastic drum and syringes (Modern), a cracked dark pipe with a glowing seam (Future Darkness)."""
    d = tm.d; e = c.e; q = max(6, q)
    if e == 0:
        lit_ellipse(tm, px_, py_, q, q * .7, rp((110, 80, 60), 12))
        for k in range(4): d.arc([px_ - q * .8 + k * q * .35, py_ - q * .4, px_ - q * .3 + k * q * .35, py_ + q * .2], 0, 360, fill=(150, 90, 50), width=1)
        thick(tm, [px_ - q, py_ + q * .8, px_ + q * .5, py_ + q * .5], (226, 216, 196), 3)
    elif e == 1:
        poly(tm, [(px_ - q, py_ - q * .5), (px_ + q * .8, py_ - q * .7), (px_ + q, py_ + q * .4), (px_ - q * .7, py_ + q * .7)], (214, 210, 196))
        d.line([px_ - q * .6, py_ - q * .3, px_ + q * .6, py_ + q * .3], fill=(150, 146, 136), width=2)
        blk(tm, px_ - 2, py_ - 2, 3, (90, 30, 40))
    elif e == 2:
        lit_ellipse(tm, px_, py_, q * .7, q * .7, rp((90, 150, 120), 20)); thick(tm, [px_ + q * .4, py_ - q * .4, px_ + q * 1.1, py_ - q * 1.0], (90, 150, 120), 3)
        d.line([px_ - q * .3, py_ - q * .5, px_ + q * .2, py_ + q * .4], fill=OUT, width=1)
    elif e == 3:
        lit_ellipse(tm, px_, py_, q * .8, q * .8, rp((86, 62, 44), 14)); d.ellipse([px_ - q * .7, py_ - q * .7, px_ + q * .7, py_ + q * .7], outline=IRON[2], width=2)
        d.ellipse([px_ - q * .3, py_ - q * .3, px_ + q * .3, py_ + q * .3], fill=(20, 16, 18))
    elif e == 4:
        for k in range(4): lit_ellipse(tm, px_ + (k % 2) * q * .7 - q * .4, py_ + (k // 2) * q * .6 - q * .3, q * .45, q * .38, rp((70, 64, 76), 12))
    elif e == 5:
        lit_rect(tm, px_ - q, py_ - q * .32, px_ + q * .7, py_ + q * .32, rp((150, 140, 80), 18), r=4)
        d.rectangle([px_ + q * .45, py_ - q * .32, px_ + q * .7, py_ + q * .32], fill=(200, 160, 60)); d.rectangle([px_ - q * .4, py_ - q * .32, px_ - q * .25, py_ + q * .32], fill=(220, 200, 60))
    elif e == 6:
        lit_ellipse(tm, px_, py_, q * .85, q * .85, rp((130, 70, 40), 14)); d.ellipse([px_ - q * .6, py_ - q * .6, px_ + q * .6, py_ + q * .6], outline=(80, 40, 30), width=2)
        d.polygon([(px_, py_ - q * .4), (px_ + q * .4, py_ + q * .3), (px_ - q * .4, py_ + q * .3)], fill=(230, 200, 40), outline=OUT)
    elif e == 7:
        lit_ellipse(tm, px_, py_, q * .85, q * .85, rp((40, 100, 170), 18)); d.ellipse([px_ - q * .25, py_ - q * .25, px_ + q * .25, py_ + q * .25], fill=(30, 40, 60))
        for k in range(2): thick(tm, [px_ + q * (.9 + k * .3), py_ - q * .3, px_ + q * (1.1 + k * .3), py_ + q * .4], (230, 230, 236), 1)
    else:
        thick(tm, [px_ - q, py_ + q * .4, px_ + q, py_ - q * .4], COMPOSITE[2], 7); d.line([px_ - q * .8, py_ + q * .3, px_ + q * .8, py_ - q * .3], fill=GLOW[2], width=2)


ERA_TAINT = [(150, 140, 112), (92, 62, 84), (150, 130, 66), (112, 126, 96), (74, 70, 70), (196, 176, 62), (196, 112, 52), (196, 66, 160), (52, 206, 170)]


def suture(tm, c, pts):
    """A seam in living flesh, worked with the surgery of the age: gut stitches (Dark Ages), a rag binding over
    plague sores (Long Night), bone pins (Renaissance), silver pins laid out as in an anatomy plate (Age of Reason),
    brass clamps (Victorian), steel wire stitches (Great War), red rubber tubing and a chrome clamp (Mid-Century),
    staples and a clear drip tube (Modern), a glowing seam with a dark port (Future Darkness)."""
    d = tm.d; e = c.e
    if e in (0, 1, 2, 3, 5, 7):
        d.line(pts, fill=(60, 20, 26), width=2)
        for i in range(0, len(pts) - 1):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]; mx, my = (ax + bx) / 2, (ay + by) / 2; nx, ny = -(by - ay), (bx - ax); L = math.hypot(nx, ny) or 1; nx, ny = nx / L * 4, ny / L * 4
            if e == 0: d.line([mx - nx, my - ny, mx + nx, my + ny], fill=(210, 190, 150), width=2)
            elif e == 1: d.rectangle([mx - 3, my - 3, mx + 2, my + 2], fill=(180, 170, 140)); d.rectangle([mx - 1, my - 1, mx, my], fill=(140, 110, 40))
            elif e == 2: d.rectangle([mx - nx - 1, my - ny - 1, mx - nx + 1, my - ny + 1], fill=(236, 226, 200)); d.rectangle([mx + nx - 1, my + ny - 1, mx + nx + 1, my + ny + 1], fill=(236, 226, 200))
            elif e == 3: d.line([mx - nx * 1.4, my - ny * 1.4, mx + nx * 1.4, my + ny * 1.4], fill=(210, 214, 220), width=1); blk(tm, mx - nx * 1.4 - 1, my - ny * 1.4 - 1, 2, (240, 240, 244))
            elif e == 5: d.line([mx - nx, my - ny, mx + nx, my + ny], fill=(150, 156, 164), width=1); d.line([mx - nx + 1, my - ny, mx + nx + 1, my + ny], fill=(90, 96, 104), width=1)
            else: d.rectangle([mx - nx - 1, my - ny - 1, mx + nx + 1, my + ny + 1], outline=(200, 204, 210))
        if e == 7: d.line([(a + 6, b + 5) for a, b in pts], fill=(200, 230, 236), width=2)
    elif e == 4:
        d.line(pts, fill=(60, 20, 26), width=2)
        for a, b in pts[1:-1:2]: lit_rect(tm, a - 4, b - 3, a + 4, b + 3, rp((190, 150, 70), 20))
    elif e == 6:
        thick(tm, pts, (170, 60, 50), 4); a, b = pts[len(pts) // 2]; lit_rect(tm, a - 4, b - 4, a + 4, b + 4, rp((200, 204, 210), 18))
    else:
        d.line(pts, fill=(30, 30, 40), width=4); d.line(pts, fill=GLOW[1], width=2); a, b = pts[len(pts) // 2]
        lit_ellipse(tm, a, b, 4, 4, rp((50, 54, 66), 12))


def relic(tm, c, px_, py_, q, k=0):
    """A relic of the age's dead, drawn down into the Underworld: a broken sword (Dark Ages), a plague cross on a
    cord (Long Night), a rosary (Renaissance), a tricorn hat (Age of Reason), a pocket watch on its chain (Victorian),
    a steel helmet (Great War), a telephone receiver on its cord (Mid-Century), a mobile phone (Modern), a dark data
    slate with a lit edge (Future Darkness). Relics look washed grey, as things do in the Shadowlands."""
    d = tm.d; e = (c.e + k) % 9 if k else c.e; q = max(5, q); g = lambda col: mix(col, (150, 156, 170), .45)
    if e == 0:
        thick(tm, [px_ - q, py_ + q * .4, px_ + q * .6, py_ - q * .3], g((190, 194, 200)), 3); thick(tm, [px_ - q * .55, py_ - q * .15, px_ - q * .25, py_ + q * .6], g((140, 110, 70)), 2)
    elif e == 1:
        thick(tm, [px_, py_ - q * .8, px_, py_ + q * .8], g((140, 100, 60)), 3); thick(tm, [px_ - q * .5, py_ - q * .2, px_ + q * .5, py_ - q * .2], g((140, 100, 60)), 3)
        d.arc([px_ - q, py_ - q * 1.2, px_ + q, py_ + q * .2], 200, 340, fill=g((120, 110, 90)), width=1)
    elif e == 2:
        for t in np.linspace(0, 5.2, 11): blk(tm, px_ + math.cos(t) * q * .7 - 1, py_ + math.sin(t) * q * .6 - 1, 2, g((150, 60, 60)))
        thick(tm, [px_ + q * .5, py_ + q * .4, px_ + q * .9, py_ + q], g((220, 200, 140)), 2)
    elif e == 3:
        poly(tm, [(px_ - q, py_ + q * .4), (px_, py_ - q * .8), (px_ + q, py_ + q * .4)], g((50, 44, 50))); d.line([px_ - q * .8, py_ + q * .35, px_ + q * .8, py_ + q * .35], fill=g((200, 170, 90)), width=1)
    elif e == 4:
        lit_ellipse(tm, px_, py_, q * .6, q * .6, rp(g((200, 170, 80)), 18)); d.ellipse([px_ - q * .4, py_ - q * .4, px_ + q * .4, py_ + q * .4], fill=g((236, 232, 220)))
        d.line([px_, py_, px_, py_ - q * .3], fill=OUT, width=1); d.arc([px_ + q * .4, py_ - q, px_ + q * 1.4, py_ + q * .2], 120, 260, fill=g((200, 170, 80)), width=1)
    elif e == 5:
        lit_ellipse(tm, px_, py_, q, q * .8, rp(g((100, 110, 80)), 14)); d.ellipse([px_ - q * .55, py_ - q * .45, px_ + q * .55, py_ + q * .45], outline=g((70, 76, 56)), width=1)
    elif e == 6:
        thick(tm, [px_ - q, py_, px_ + q * .5, py_ - q * .3], g((40, 40, 44)), 5); lit_ellipse(tm, px_ - q, py_, q * .3, q * .3, rp(g((40, 40, 44)), 14))
        d.arc([px_ - q * .2, py_ - q * .2, px_ + q, py_ + q], 0, 200, fill=g((40, 40, 44)), width=1)
    elif e == 7:
        lit_rect(tm, px_ - q * .4, py_ - q * .75, px_ + q * .4, py_ + q * .75, rp(g((60, 62, 70)), 14), r=2); d.rectangle([px_ - q * .28, py_ - q * .55, px_ + q * .28, py_ + q * .2], fill=g((90, 120, 150)))
    else:
        lit_rect(tm, px_ - q * .8, py_ - q * .5, px_ + q * .8, py_ + q * .5, rp((40, 42, 50), 12), r=2); d.line([px_ - q * .6, py_ + q * .4, px_ + q * .6, py_ + q * .4], fill=GLOW[2], width=2)


PARADIGM = [(206, 170, 70), (170, 60, 50), (120, 150, 200), (210, 200, 170), (190, 150, 80), (150, 200, 230), (90, 200, 120), (230, 60, 200), (90, 240, 250)]


def paradigm(tm, c, X0, Y0, X1, Y1, k=1.0):
    """Paradox takes the shape of the age's own picture of the world, laid as lines over a flaw: gilt knotwork
    (Dark Ages), the circles of the astrologer's houses (Long Night), a perspective grid running to its vanishing
    point (Renaissance), compass circles and triangles (Age of Reason), clockwork gear teeth (Victorian), the zigzag
    of electric arcs (Great War), graph paper and an atom's orbits (Mid-Century), stepped pixel blocks in red, green
    and blue (Modern), glitching scan lines (Future Darkness)."""
    d = tm.d; e = c.e; col = PARADIGM[e]; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; W, H = X1 - X0, Y1 - Y0; r = min(W, H) / 2
    if e == 0:
        for t in np.linspace(0, 6.28, 7)[:-1]:
            d.arc([cx + math.cos(t) * r * .35 - r * .3, cy + math.sin(t) * r * .35 - r * .3, cx + math.cos(t) * r * .35 + r * .3, cy + math.sin(t) * r * .35 + r * .3], 0, 360, fill=col, width=2)
    elif e == 1:
        for f in (.9, .62, .34): d.ellipse([cx - r * f, cy - r * f, cx + r * f, cy + r * f], outline=col, width=2)
        for t in np.linspace(0, 6.28, 13)[:-1]: d.line([cx + math.cos(t) * r * .34, cy + math.sin(t) * r * .34, cx + math.cos(t) * r * .9, cy + math.sin(t) * r * .9], fill=col, width=1)
    elif e == 2:
        vx, vy = cx + W * .1, Y0 + H * .15
        for t in np.linspace(0, 1, 7): d.line([vx, vy, X0 + W * t, Y1], fill=col, width=1)
        for t in (.45, .65, .85): d.line([X0 + 4, vy + (Y1 - vy) * t, X1 - 4, vy + (Y1 - vy) * t], fill=col, width=1)
    elif e == 3:
        d.ellipse([cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8], outline=col, width=2)
        d.polygon([(cx, cy - r * .8), (cx + r * .7, cy + r * .4), (cx - r * .7, cy + r * .4)], outline=col); d.line([cx, cy - r * .8, cx, cy + r * .8], fill=col)
    elif e == 4:
        for gx, gy, gr in ((cx - r * .3, cy - r * .2, r * .42), (cx + r * .38, cy + r * .3, r * .3)):
            d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], outline=col, width=3)
            for t in np.linspace(0, 6.28, 11)[:-1]: blk(tm, gx + math.cos(t) * gr - 2, gy + math.sin(t) * gr - 2, 3, col)
    elif e == 5:
        for j in range(3):
            pts = [(X0 + W * t, cy + (j - 1) * H * .25 + (6 if i % 2 else -6)) for i, t in enumerate(np.linspace(.08, .92, 9))]
            d.line(pts, fill=col, width=2)
    elif e == 6:
        for gx in np.arange(X0 + 6, X1 - 2, 12): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=mix(col, (30, 40, 40), .5), width=1)
        for gy in np.arange(Y0 + 6, Y1 - 2, 12): d.line([X0 + 3, gy, X1 - 3, gy], fill=mix(col, (30, 40, 40), .5), width=1)
        for a in (0, 60, 120):
            pts = [(cx + math.cos(t) * r * .7 * math.cos(math.radians(a)) - math.sin(t) * r * .25 * math.sin(math.radians(a)), cy + math.cos(t) * r * .7 * math.sin(math.radians(a)) + math.sin(t) * r * .25 * math.cos(math.radians(a))) for t in np.linspace(0, 6.3, 24)]
            d.line(pts, fill=col, width=2)
    elif e == 7:
        cols = [(230, 50, 60), (60, 220, 90), (60, 90, 240)]
        for i in range(9):
            s = max(5, int(r * .16)); bx, by = X0 + W * (.12 + .09 * i), cy - H * .3 + (i % 3) * s
            blk(tm, bx, by, s, cols[i % 3], out=OUT)
    else:
        for gy in np.arange(Y0 + 4, Y1 - 2, 7):
            off = int(c.rng.integers(-6, 7)); d.line([X0 + 3 + max(0, off), gy, X1 - 3 + min(0, off), gy], fill=mix(col, (20, 30, 40), .3), width=1)
        blk(tm, cx - r * .3, cy - 3, int(r * .5), col)


def weave(tm, c, cx, cy, r, col=(176, 184, 200)):
    """The Weaver's pattern web on a growth of the Umbra: none in the wild Dark Ages and Long Night, then a few
    straight strands, thickening each age into a grid and crystal crusts; from the Avatar Storm of 1997 jagged
    storm-shards lodge in it as well."""
    d = tm.d; e = c.e; n = [0, 0, 2, 3, 4, 5, 6, 7, 8][e]
    for i in range(n):
        a = c.rng.uniform(0, 6.28); b = a + c.rng.uniform(1.4, 2.6)
        d.line([cx + math.cos(a) * r * .9, cy + math.sin(a) * r * .9, cx + math.cos(b) * r * .9, cy + math.sin(b) * r * .9], fill=col, width=1)
    if e >= 4:
        for i in range(e - 3):
            a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.3, .85) * r; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t; s = 3 + e // 3
            poly(tm, [(px_, py_ - s), (px_ + s, py_), (px_, py_ + s), (px_ - s, py_)], mix(col, (255, 255, 255), .2))
    if e >= 7:
        for i in range(2 + (e - 7) * 2):
            a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.2, .8) * r; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t
            poly(tm, [(px_ - 4, py_ + 5), (px_ + 1, py_ - 7), (px_ + 5, py_ + 3)], (220, 60, 70))
    if e == 0:                                                          # the wild age: Wyld sparks in the growth
        for i in range(5):
            a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.2, .8) * r; blk(tm, cx + math.cos(a) * t, cy + math.sin(a) * t, 3, (250, 230, 120))
    if e == 1:
        for i in range(4):
            a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.2, .8) * r; blk(tm, cx + math.cos(a) * t, cy + math.sin(a) * t, 3, (200, 120, 230))


SCRAP = [(96, 90, 88), (120, 120, 126), (190, 150, 70), (176, 120, 60), (70, 70, 76), (110, 114, 100), (200, 204, 212), (70, 120, 70), (52, 56, 66)]


def scrap_bit(tm, c, px_, py_, q, k=0):
    """One piece of the age's scrap: a forged bar and a horseshoe (Dark Ages), a dented plate of armour (Long Night),
    a clock wheel (Renaissance), a brass gear and a pump barrel (Age of Reason), a cast-iron girder with rivets
    (Victorian), a riveted steel plate and wire (Great War), a chrome bumper and a radio valve (Mid-Century), a green
    circuit board (Modern), a dark composite panel with a lit seam (Future Darkness)."""
    d = tm.d; e = c.e; q = max(5, q); a = c.rng.uniform(0, 3.14)
    ca, sa = math.cos(a), math.sin(a)
    def rot(u, v): return (px_ + u * ca - v * sa, py_ + u * sa + v * ca)
    C = rp(SCRAP[e], 18)
    if e == 0:
        thick(tm, [rot(-q, 0), rot(q, 0)], C[2], 4); d.arc([px_ - q * .5, py_ - q * .5, px_ + q * .5, py_ + q * .5], 200 + k * 30, 520 + k * 30, fill=C[3], width=3)
    elif e == 1:
        poly(tm, [rot(-q, -q * .5), rot(q, -q * .6), rot(q * .8, q * .5), rot(-q * .9, q * .6)], C[2]); d.line([rot(-q * .6, 0), rot(q * .6, 0)], fill=C[4], width=1)
    elif e in (2, 3):
        gr = q * .7; d.ellipse([px_ - gr, py_ - gr, px_ + gr, py_ + gr], fill=C[2], outline=OUT)
        for t in np.linspace(0, 6.28, 9)[:-1]: blk(tm, px_ + math.cos(t + a) * gr - 2, py_ + math.sin(t + a) * gr - 2, 3, C[3], OUT)
        d.ellipse([px_ - gr * .3, py_ - gr * .3, px_ + gr * .3, py_ + gr * .3], fill=C[0])
    elif e == 4:
        poly(tm, [rot(-q, -q * .3), rot(q, -q * .3), rot(q, q * .3), rot(-q, q * .3)], C[2]); d.line([rot(-q, 0), rot(q, 0)], fill=C[0], width=2)
        for t in (-.6, 0, .6): blk(tm, rot(q * t, -q * .2)[0] - 1, rot(q * t, -q * .2)[1] - 1, 2, C[4])
    elif e == 5:
        poly(tm, [rot(-q, -q * .6), rot(q, -q * .6), rot(q, q * .6), rot(-q, q * .6)], C[2])
        for t in (-.7, .7): blk(tm, rot(q * t, q * .4)[0] - 1, rot(q * t, q * .4)[1] - 1, 2, C[4])
        d.arc([px_ - q * .4, py_ - q * .2, px_ + q * 1.1, py_ + q * .9], 0, 300, fill=(140, 140, 144), width=1)
    elif e == 6:
        thick(tm, [rot(-q, 0), rot(q, 0)], C[3], 5); d.line([rot(-q, -1), rot(q, -1)], fill=(250, 250, 252), width=1)
        lit_ellipse(tm, rot(q * .2, q * .7)[0], rot(q * .2, q * .7)[1], 3, 3, rp((240, 160, 90), 20))
    elif e == 7:
        poly(tm, [rot(-q, -q * .55), rot(q, -q * .55), rot(q, q * .55), rot(-q, q * .55)], C[2])
        for t in (-.5, .1, .6): blk(tm, rot(q * t, 0)[0] - 2, rot(q * t, 0)[1] - 2, 3, (30, 30, 34))
        d.line([rot(-q * .8, q * .35), rot(q * .8, q * .35)], fill=(200, 170, 70), width=1)
    else:
        poly(tm, [rot(-q, -q * .5), rot(q, -q * .5), rot(q, q * .5), rot(-q, q * .5)], C[2]); d.line([rot(-q * .8, 0), rot(q * .8, 0)], fill=GLOW[2], width=2)


GLAM = [1.0, .5, .62, .55, .45, .38, .8, .9, .66]


def banality(tm, c, before):
    """The Dreaming as the age sees it: full colour in the Dark Ages, Banality's grey frost over the following ages,
    a bright return in the Resurgence and after, dimming again in Future
    Darkness. Laid only over what was drawn since `before`."""
    t = 1 - GLAM[c.e]
    a = np.asarray(tm.img).astype(np.float32); m = np.abs(a.astype(np.int16) - before).sum(2) > 0
    if not m.any(): return
    lum = a.mean(2, keepdims=True); g = lum * np.array([.96, .98, 1.06], np.float32) + 10
    b = a * (1 - t * .8) + g * t * .8
    a[m] = b[m]; tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))


def offering(tm, c, px_, py_, q):
    """What the age's visitors leave at a stone or pool of the far realms: a bundle of herbs and a bone (Dark Ages),
    a wolf skull (Long Night), a horn cup (Renaissance), a clay pipe and a twist of tobacco (Age of Reason), a tin
    lantern (Victorian), a soldier's tag on its chain (Great War), a candle in a jar (Mid-Century), a glow stick and
    beads (Modern), a lit data token (Future Darkness)."""
    d = tm.d; e = c.e; q = max(5, q)
    if e == 0:
        for k in range(4): thick(tm, [px_ - q * .6 + k * 3, py_ - q * .6, px_ - q * .2 + k * 3, py_ + q * .6], (90, 120, 60), 2)
        thick(tm, [px_ + q * .2, py_ + q * .5, px_ + q, py_ - q * .2], (226, 216, 196), 3)
    elif e == 1:
        lit_ellipse(tm, px_, py_, q * .6, q * .8, rp((220, 212, 190), 12)); blk(tm, px_ - q * .3, py_ + q * .1, 2, OUT); blk(tm, px_ + q * .15, py_ + q * .1, 2, OUT)
    elif e == 2:
        d.arc([px_ - q, py_ - q * .6, px_ + q, py_ + q * .6], 180, 360, fill=OUT, width=5); d.arc([px_ - q, py_ - q * .6, px_ + q, py_ + q * .6], 180, 360, fill=(200, 180, 130), width=3)
        lit_ellipse(tm, px_ + q * .8, py_, q * .3, q * .3, rp((140, 110, 70), 12))
    elif e == 3:
        thick(tm, [px_ - q, py_, px_ + q * .5, py_ - q * .2], (236, 232, 222), 2); lit_ellipse(tm, px_ + q * .6, py_ - q * .25, q * .3, q * .3, rp((236, 232, 222), 10))
        blk(tm, px_ - q * .5, py_ + q * .4, 4, (120, 80, 40))
    elif e == 4:
        lit_rect(tm, px_ - q * .55, py_ - q * .55, px_ + q * .55, py_ + q * .55, rp((150, 150, 156), 16)); d.ellipse([px_ - q * .3, py_ - q * .3, px_ + q * .3, py_ + q * .3], fill=(250, 200, 90))
    elif e == 5:
        lit_rect(tm, px_ - q * .5, py_ - q * .3, px_ + q * .5, py_ + q * .3, rp((170, 170, 176), 16), r=2); d.arc([px_ - q, py_ - q, px_ + q * .2, py_ + q * .2], 180, 300, fill=(150, 150, 156), width=1)
    elif e == 6:
        lit_ellipse(tm, px_, py_, q * .55, q * .55, rp((190, 210, 210), 14)); blk(tm, px_ - 2, py_ - 2, 4, (250, 220, 120))
    elif e == 7:
        thick(tm, [px_ - q, py_ + q * .3, px_ + q * .6, py_ - q * .4], (120, 250, 110), 3)
        for t in np.linspace(0, 3, 6): blk(tm, px_ - q * .5 + math.cos(t) * q * .6, py_ + q * .5 + math.sin(t) * q * .3, 2, ((230, 60, 160), (60, 160, 230), (240, 220, 60))[int(t * 2) % 3])
    else:
        lit_ellipse(tm, px_, py_, q * .5, q * .5, rp((40, 44, 56), 12)); d.ellipse([px_ - q * .25, py_ - q * .25, px_ + q * .25, py_ + q * .25], fill=GLOW[2])


def petal(cx, cy, a, L, wd, c=None, n=12):
    """A soft frilled petal or frond from (cx, cy) out along angle a: a pointed oval with a wavy edge."""
    ca, sa = math.cos(a), math.sin(a); pts = []
    for k in range(n + 1):
        t = k / n; u = L * t; v = wd / 2 * math.sin(math.pi * t) ** .8 * (1 + (.12 * math.sin(t * 19) if c is not None else 0))
        pts.append((cx + u * ca - v * sa, cy + u * sa + v * ca))
    for k in range(n, -1, -1):
        t = k / n; u = L * t; v = -wd / 2 * math.sin(math.pi * t) ** .8 * (1 + (.12 * math.sin(t * 23 + 1) if c is not None else 0))
        pts.append((cx + u * ca - v * sa, cy + u * sa + v * ca))
    return pts


def grub(tm, cx, cy, r, col, seg=None):
    """A curled grub seen through a skin or lying in a cell: a ring of soft segments with a dark head."""
    seg = seg or tone(col, -30)
    for k, t in enumerate(np.linspace(.4, 5.0, 8)):
        q = r * (.32 + .05 * math.sin(k)); x_, y_ = cx + math.cos(t) * r * .55, cy + math.sin(t) * r * .55
        tm.d.ellipse([x_ - q, y_ - q, x_ + q, y_ + q], fill=col, outline=seg)
    hx, hy = cx + math.cos(5.2) * r * .55, cy + math.sin(5.2) * r * .55; tm.d.ellipse([hx - r * .26, hy - r * .26, hx + r * .26, hy + r * .26], fill=(60, 40, 30), outline=OUT)


# ================================================================ the Wyrm's blight and hives
BLIGHT = {"malfeas": ((150, 162, 72), (66, 60, 30), (130, 44, 40)),      # cap, ground, veins: bile green under a sick sky
          "scar": ((124, 114, 104), (40, 38, 42), (156, 74, 32)),         # soot grey on slag, rust veins
          "atrocity": ((156, 84, 116), (60, 30, 38), (176, 32, 44)),     # bruise purple on blood-soaked earth
          "earth": ((176, 176, 134), (62, 66, 50), (80, 46, 76))}         # pale sick caps in a poisoned wood
REALM4 = ["malfeas", "scar", "atrocity", "earth"]


def blighttree(tm, x, y, w, h, st, v):
    """A blighted fungal tree from above: in place of a crown, a stack of great sick mushroom caps, each with a pale
    rim, dark gills showing under its south-east edge and pustule spots, over a trunk of twisted grey-white stalks;
    oily black ground round its foot, veined with the realm's colour, and spore clumps drifting off it. The realm
    sets its colours (bile green in Malfeas, soot grey in the Scar, bruise purple in the Atrocity Realm, pale and
    sickly in a tainted wood on earth); a sapling is a few small caps, an ancient one a great heap of them. What fed
    it in its age lies in its roots."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    cap, grd, vein = BLIGHT[v.get("realm", "malfeas")]; cap = mix(cap, ERA_TAINT[c.e], .28)
    stage = {"sapling": .62, "grown": .82, "ancient": 1.0}[v.get("stage", "grown")] * min(1, c.big)
    pts = blob(c, cx, cy, Rr * .99, Rr * .97, 18, .1); d.polygon(pts, fill=grd, outline=OUT)
    for k in range(10):
        a = c.rng.uniform(0, 6.28); L_ = Rr * c.rng.uniform(.75, .97); d.line(curve(c, cx, cy, cx + math.cos(a) * L_, cy + math.sin(a) * L_, .2), fill=vein, width=2)
    for k in range(6):                                                   # roots
        a = k * 1.05 + c.rng.uniform(-.3, .3); L_ = Rr * c.rng.uniform(.55, .85); thick(tm, curve(c, cx, cy, cx + math.cos(a) * L_, cy + math.sin(a) * L_, .15), (184, 178, 160), 4)
    era_poison(tm, c, X0 + Rr * .32, Y1 - Rr * .32, Rr * .16)
    n = 4 + c.w + int(stage * 3); C = rp(cap, 18)
    caps = [(cx, cy, Rr * .4 * stage)] + [(cx + math.cos(a) * Rr * .48 * stage, cy + math.sin(a) * Rr * .44 * stage, Rr * c.rng.uniform(.24, .32) * stage)
                                           for a in np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)]
    for px_, py_, r in sorted(caps, key=lambda p: -(p[0] + p[1]) if p[2] < Rr * .38 * stage else 1e9):
        eshadow(tm, px_, py_, r, r * .9, 4, 5)
        d.ellipse([px_ - r, py_ - r * .9, px_ + r, py_ + r * .9], fill=tone(C[0], -20), outline=OUT)   # the gills under the rim
        for t in np.linspace(.6, 2.6, 8): d.line([px_ + math.cos(t) * r * .5, py_ + math.sin(t) * r * .45, px_ + math.cos(t) * r * .95, py_ + math.sin(t) * r * .86], fill=C[0], width=1)
        lit_ellipse(tm, px_ - r * .08, py_ - r * .1, r * .86, r * .78, C)
        d.arc([px_ - r * .94, py_ - r * .88, px_ + r * .78, py_ + r * .68], 160, 300, fill=C[4], width=2)
        for k in range(3 + int(r / 10)):
            a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.2, .6) * r; blk(tm, px_ + math.cos(a) * t - 2, py_ + math.sin(a) * t - 2, 3, mix(C[4], (240, 236, 200), .5))
    for k in range(5 + c.w):                                             # spore clumps on the air
        a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.7, .92) * Rr; blk(tm, cx + math.cos(a) * t, cy + math.sin(a) * t, 3, mix(ERA_TAINT[c.e], (220, 220, 180), .4))
def blightbloom(tm, x, y, w, h, st, v):
    """A spore-bloom of the blight from above: a fleshy fungal flower the size of a cartwheel, its thick frilled
    petals folded round a swollen puffball heart pocked with spore pores, standing in a slick of its own ooze. Closed
    it is a tight bud; open, the petals splay and the heart shows; spewing, a ring of spore clumps puffs out all round
    it. Realm colours as the blighted tree."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    cap, grd, vein = BLIGHT[v.get("realm", "malfeas")]; cap = mix(cap, ERA_TAINT[c.e], .3); C = rp(cap, 18); V = rp(vein, 16)
    phase = v.get("phase", "open")
    d.polygon(blob(c, cx, cy, Rr * .98, Rr * .94, 14, .14), fill=grd, outline=OUT)
    for k in range(3): blk(tm, cx + c.rng.uniform(-Rr * .7, Rr * .6), cy + c.rng.uniform(-Rr * .7, Rr * .6), 4, mix(grd, cap, .4))
    n = 8 if phase != "bud" else 6; pr_ = Rr * (.9 if phase != "bud" else .6) * min(1, c.big + .05)
    for i, a in enumerate(np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)):
        L_ = pr_ * c.rng.uniform(.78, 1.0); pts = petal(cx, cy, a, L_, L_ * (.42 if phase != "bud" else .5), c)
        pshadow(tm, pts, 3, 4); poly(tm, pts, V[2] if i % 2 else V[1])
        d.line([cx + math.cos(a) * L_ * .3, cy + math.sin(a) * L_ * .3, cx + math.cos(a) * L_ * .85, cy + math.sin(a) * L_ * .85], fill=V[4], width=2)
        d.line(pts[len(pts) // 4: 3 * len(pts) // 4], fill=V[3], width=1)
    hr = Rr * (.36 if phase != "bud" else .3)
    lit_ellipse(tm, cx, cy, hr, hr, C)
    for k in range(7): a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.1, .7) * hr; blk(tm, cx + math.cos(a) * t - 2, cy + math.sin(a) * t - 2, 3, C[0])
    if phase == "spewing":
        for k in range(7):
            a = -1.57 + k * .52 + c.rng.uniform(-.15, .15); t = c.rng.uniform(.62, .95); q = 3 + int(c.rng.integers(0, 2))
            for sx in (-1, 1): blk(tm, cx + sx * math.cos(a) * t * Rr - q / 2, cy + math.sin(a) * t * Rr, q, mix(ERA_TAINT[c.e], (230, 230, 190), .45))
    era_poison(tm, c, X0 + Rr * .3, Y0 + Rr * .3, Rr * .2)


HIVE = {"resin": ((196, 140, 60), (110, 70, 30)), "paper": ((176, 166, 140), (100, 92, 76)), "chitin": ((70, 70, 84), (36, 34, 44)), "membrane": ((206, 150, 150), (140, 60, 70))}


def hivepod(tm, x, y, w, h, st, v):
    """A brood pod of a Wyrm hive from above: an egg-shaped sac of hardened amber resin, grey wasp paper or black
    chitin, glued to the floor by a skirt of the same stuff and webbed with threads, a curled grub showing dark through
    its skin. Closed: sealed under its cap; open: split into flaps, the cap thrown off, slime and the empty cell
    inside. The realm sets the slime and ground; big pods in a strong hive."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    shell, dark = HIVE[v.get("hive", "resin")]; cap, grd, vein = BLIGHT[v.get("realm", "malfeas")]; shell = mix(mix(shell, ERA_TAINT[c.e], .22), cap, .22)
    S = rp(shell, 20); op = st == "open"
    d.polygon(blob(c, cx, cy, Rr * .98, Rr * .95, 14, .12), fill=grd, outline=OUT)
    for k in range(8):
        a = c.rng.uniform(0, 6.28); d.line([cx, cy, cx + math.cos(a) * Rr * .95, cy + math.sin(a) * Rr * .92], fill=mix(shell, (240, 230, 200), .3), width=1)
    for k in range(5): a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.75, .9) * Rr; d.ellipse([cx + math.cos(a) * t - 5, cy + math.sin(a) * t - 4, cx + math.cos(a) * t + 5, cy + math.sin(a) * t + 4], fill=vein)
    era_poison(tm, c, X1 - Rr * .3, Y1 - Rr * .3, Rr * .18)
    rx, ry = Rr * .7 * min(1, c.big), Rr * .86 * min(1, c.big)
    eshadow(tm, cx, cy, rx, ry, 4, 5)
    if not op:
        lit_ellipse(tm, cx, cy, rx, ry, S)
        grub(tm, cx, cy + ry * .1, rx * .6, mix(S[2], dark, .45), mix(S[2], dark, .6))                     # the grub showing through
        d.ellipse([cx - rx * .35, cy - ry * .85, cx + rx * .35, cy - ry * .5], fill=S[3], outline=OUT)                                                    # the cap
        for t in np.linspace(.3, 2.8, 5): d.line([cx + math.cos(t) * rx * .9, cy + math.sin(t) * ry * .9, cx + math.cos(t) * rx * .6, cy + math.sin(t) * ry * .6], fill=S[1], width=1)
    else:
        for i, a in enumerate(np.linspace(0, 6.28, 5, endpoint=False) + .3):
            tip = (cx + math.cos(a) * rx * 1.15, cy + math.sin(a) * ry * 1.05); poly(tm, [(cx + math.cos(a - .55) * rx * .7, cy + math.sin(a - .55) * ry * .7), tip, (cx + math.cos(a + .55) * rx * .7, cy + math.sin(a + .55) * ry * .7)], S[3 if i % 2 else 2])
        d.ellipse([cx - rx * .7, cy - ry * .7, cx + rx * .7, cy + ry * .7], fill=tone(dark, -20), outline=OUT)
        d.ellipse([cx - rx * .4, cy - ry * .3, cx + rx * .3, cy + ry * .4], fill=mix(vein, (200, 210, 120), .5))
        lit_ellipse(tm, cx + rx * 1.0, cy - ry * .9, rx * .32, ry * .22, S)


def hivenest(tm, x, y, w, h, st, v):
    """A hive comb on a wall from above: a long mass of layered wasp paper, amber resin or yellowed wax built out from
    the wall (to the north), its face toward the room a honeycomb of six-sided cells, some capped and some open with
    a grub's dark head in them, swirled paper layers behind, and a dark crawl hole at one end big enough for a body.
    The realm colours the cells; a strong hive is built thick."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1)
    mat = v.get("hive", "paper"); base = {"paper": (172, 160, 134), "resin": (192, 136, 62), "wax": (204, 176, 90)}[mat]; base = mix(base, ERA_TAINT[c.e], .22)
    S = rp(base, 16); cap, grd, vein = BLIGHT[v.get("realm", "malfeas")]
    pts = [(X0, Y0), (X1, Y0)] + [(X1 - (X1 - X0) * t, Y1 - c.rng.uniform(0, (Y1 - Y0) * .12)) for t in np.linspace(0, 1, 9)]
    pshadow(tm, pts, 3, 4); poly(tm, pts, S[1])
    for k in range(4):                                                      # paper swirls toward the wall
        yy = Y0 + (Y1 - Y0) * (.1 + k * .08); d.line([(X0 + (X1 - X0) * t, yy + math.sin(t * 9 + k) * 3) for t in np.linspace(.03, .97, 16)], fill=S[3 if k % 2 else 0], width=2)
    s = max(6, int((Y1 - Y0) * .16)); hx = s * 1.7
    for row in range(3):
        yy = Y0 + (Y1 - Y0) * .45 + row * s * 1.45
        for i in range(int((X1 - X0) / hx)):
            px_ = X0 + hx * .7 + i * hx + (hx / 2 if row % 2 else 0)
            if px_ > X1 - hx * .5 or yy > Y1 - s * .4: continue
            hexa = [(px_ + math.cos(a) * s, yy + math.sin(a) * s * .9) for a in np.linspace(0, 6.28, 6, endpoint=False) + .52]
            capped = c.rng.random() < .5
            poly(tm, hexa, S[3] if capped else tone(S[0], -18))
            if not capped and c.rng.random() < .6: d.ellipse([px_ - s * .35, yy - s * .35, px_ + s * .35, yy + s * .35], fill=mix(vein, (230, 220, 180), .5))
    hx_ = X0 + (X1 - X0) * (.15 if c.w % 2 else .85); d.ellipse([hx_ - s * 1.3, Y0 + (Y1 - Y0) * .2, hx_ + s * 1.3, Y0 + (Y1 - Y0) * .2 + s * 2], fill=(20, 14, 16), outline=S[0])
    era_poison(tm, c, X0 + (X1 - X0) * .5, Y0 + (Y1 - Y0) * .22, min(14, (Y1 - Y0) * .16))


# ================================================================ flesh
FLESH = {"malfeas": ((156, 120, 84), (110, 140, 60)),          # skin, ooze: sallow flesh weeping bile green
         "atrocity": ((178, 70, 66), (110, 20, 28)),           # raw red, blood
         "abyss": ((120, 100, 120), (60, 40, 90)),             # grey-violet, black-violet
         "haven": ((196, 168, 152), (130, 40, 50))}            # a fleshcrafter's pale shaped skin, dark blood


def fleshpod(tm, x, y, w, h, st, v):
    """A pulsing organ pod from above: a ribbed sac of living flesh the size of a barrel, blue-veined, rooted to the
    floor by fleshy tendrils, a puckered mouth at its top; a seam worked with the age's surgery runs over it. Closed:
    the mouth clenched; open: peeled back in four flaps over the organ it grows, a heart, a brain or a cluster of
    eyes. The realm sets its skin."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    skin, ooze = FLESH[v.get("realm", "atrocity")]; F = rp(skin, 18); op = st == "open"; organ = v.get("organ", "heart")
    d.polygon(blob(c, cx, cy, Rr, Rr * .96, 14, .16), fill=tone(ooze, -10), outline=OUT)
    for k in range(8):
        a = k * .785 + .39; thick(tm, curve(c, cx, cy, cx + math.cos(a) * Rr * .96, cy + math.sin(a) * Rr * .92, .25), F[1], 4)
    r = Rr * .7 * min(1, c.big); eshadow(tm, cx, cy, r, r, 4, 5)
    lit_ellipse(tm, cx, cy, r, r * .95, F)
    form = v.get("form", "sac")
    if form == "ribbed":
        for t in np.linspace(0, 6.28, 13)[:-1]: d.line([cx + math.cos(t) * r * .3, cy + math.sin(t) * r * .3, cx + math.cos(t) * r * .95, cy + math.sin(t) * r * .9], fill=F[0], width=2)
    elif form == "spiked":
        for t in np.linspace(0, 6.28, 9)[:-1]:
            bx, by = cx + math.cos(t) * r * .8, cy + math.sin(t) * r * .8; poly(tm, [(bx - math.sin(t) * 4, by + math.cos(t) * 4), (bx + math.cos(t) * r * .4, by + math.sin(t) * r * .4), (bx + math.sin(t) * 4, by - math.cos(t) * 4)], mix(BONE[3], skin, .35))
    else:
        for t in np.linspace(0, 6.28, 9)[:-1]: d.arc([cx - r * .95, cy - r * .9, cx + r * .95, cy + r * .9], math.degrees(t), math.degrees(t) + 8, fill=F[0], width=2)
    for k in range(2):                                                     # blue veins, a pair each side
        a = c.rng.uniform(-1.2, 1.2)
        for sx in (-1, 1): d.line([(cx + sx * (px_ - cx), py_) for px_, py_ in curve(c, cx + math.cos(a) * r * .3, cy + math.sin(a) * r * .3, cx + math.cos(a + .6) * r * .85, cy + math.sin(a + .6) * r * .85, .3)], fill=(70, 80, 150), width=1)
    suture(tm, c, curve(c, cx, cy - r * .85, cx, cy + r * .85, .08, 6))
    if not op:
        d.ellipse([cx - r * .22, cy - r * .3, cx + r * .2, cy + r * .05], fill=F[0], outline=OUT)
        for t in np.linspace(0, 6.28, 7)[:-1]: d.line([cx - .01 + math.cos(t) * r * .05, cy - r * .12 + math.sin(t) * r * .05, cx + math.cos(t) * r * .2, cy - r * .12 + math.sin(t) * r * .17], fill=tone(F[0], -30), width=1)
    else:
        for a in (.8, 2.4, 3.9, 5.5): poly(tm, [(cx + math.cos(a - .5) * r * .45, cy + math.sin(a - .5) * r * .45), (cx + math.cos(a) * r * 1.02, cy + math.sin(a) * r * 1.02), (cx + math.cos(a + .5) * r * .45, cy + math.sin(a + .5) * r * .45)], F[3])
        d.ellipse([cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55], fill=tone(ooze, -30), outline=OUT)
        if organ == "heart":
            lit_ellipse(tm, cx - r * .12, cy, r * .26, r * .3, rp((170, 40, 50), 18)); lit_ellipse(tm, cx + r * .14, cy + r * .04, r * .22, r * .28, rp((150, 36, 46), 18))
            thick(tm, [cx, cy - r * .25, cx + r * .1, cy - r * .5], (190, 120, 130), 3)
        elif organ == "brain":
            lit_ellipse(tm, cx, cy, r * .42, r * .36, rp((214, 160, 160), 14))
            for k in range(5): d.arc([cx - r * .35 + k * r * .12, cy - r * .3, cx - r * .1 + k * r * .12, cy + r * .3], 60, 300, fill=(160, 100, 110), width=1)
            d.line([cx, cy - r * .36, cx, cy + r * .36], fill=(150, 90, 100), width=1)
        else:
            for px_, py_ in ((cx - r * .2, cy - r * .15), (cx + r * .2, cy - r * .1), (cx, cy + r * .2)):
                lit_ellipse(tm, px_, py_, r * .17, r * .17, rp((230, 226, 210), 10)); d.ellipse([px_ - r * .08, py_ - r * .08, px_ + r * .08, py_ + r * .08], fill=(150, 120, 40)); blk(tm, px_ - 2, py_ - 2, 3, OUT)


def fleshmaw(tm, x, y, w, h, st, v):
    """A toothed maw grown in a wall, seen from above where it bulges out of the wall face (to the north): heavy lips
    of flesh along the wall, a ring of long yellowed teeth, and a seam of the age's surgery where it was grafted in.
    Closed: the lips meet and the teeth mesh in a line; open: the jaws gape on a dark throat and a lolling tongue, a
    hazard to anyone passing. The realm sets its skin."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1)
    skin, ooze = FLESH[v.get("realm", "atrocity")]; skin = mix(skin, {"pale": (236, 226, 216), "engorged": (200, 30, 40), "bruised": (90, 50, 110)}[v.get("flush", "pale")], .35)
    F = rp(skin, 18); op = st == "open"; W, H = X1 - X0, Y1 - Y0; wide = v.get("size", "wide") == "wide"
    pts = [(X0, Y0)] + [(X0 + W * t, Y0 + H * (.95 - .22 * (2 * t - 1) ** 2) + c.rng.uniform(-2, 2)) for t in np.linspace(0, 1, 11)] + [(X1, Y0)]
    pshadow(tm, pts, 3, 4); poly(tm, pts, F[1])
    mx0, mx1 = X0 + W * (.08 if wide else .24), X1 - W * (.08 if wide else .24); my0, my1 = Y0 + H * (.18 if op else .36), Y0 + H * (.82 if op else .64)
    d.ellipse([mx0 - 4, my0 - 5, mx1 + 4, my1 + 5], fill=F[3], outline=OUT)        # the lips
    d.ellipse([mx0, my0, mx1, my1], fill=(28, 8, 14) if op else F[0], outline=OUT)
    if op:
        lit_ellipse(tm, (mx0 + mx1) / 2, my1 - (my1 - my0) * .3, (mx1 - mx0) * .2, (my1 - my0) * .2, rp((190, 80, 90), 16))
    nt = 7 + c.w
    for i in range(nt):
        t = (i + .5) / nt; tx = mx0 + (mx1 - mx0) * t; edge = math.sqrt(max(0, 1 - (2 * t - 1) ** 2))
        ty0 = (my0 + my1) / 2 - (my1 - my0) / 2 * edge; ty1 = (my0 + my1) / 2 + (my1 - my0) / 2 * edge; L_ = (my1 - my0) * (.3 if op else .48)
        tc = mix((236, 220, 170), (140, 120, 90), 0)
        poly(tm, [(tx - 3, ty0), (tx + 3, ty0), (tx, ty0 + L_)], tc); poly(tm, [(tx - 3, ty1), (tx + 3, ty1), (tx, ty1 - L_)], tc)
    suture(tm, c, [(X0 + W * .04, Y0 + H * .2), (X0 + W * .3, Y0 + H * .1), (X0 + W * .6, Y0 + H * .14), (X0 + W * .9, Y0 + H * .08)])
    for k in range(3): blk(tm, mx0 + (mx1 - mx0) * (.2 + .3 * k), my1 + 3, 3, ooze)


def fleshtubes(tm, x, y, w, h, st, v):
    """Breathing flesh tubes from above: a clump of fleshy stalks rising from a bed of skin, each seen end on as a
    ribbed ring round a dark gasping hole, joined by tubes that snake over the floor; a seam of the age's surgery
    where two were grafted. Gasping: the holes wide; decaying: grey-green and sagging with a sick glow in them. The
    realm sets the skin."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    skin, ooze = FLESH[v.get("realm", "atrocity")]; kind = v.get("kind", "gasping")
    if kind == "decaying": skin = mix(skin, (120, 140, 100), .45)
    F = rp(skin, 18)
    d.polygon(blob(c, cx, cy, Rr, Rr * .96, 16, .12), fill=F[1], outline=OUT)
    for k in range(6): d.arc([cx - Rr * (.3 + k * .1), cy - Rr * (.3 + k * .1), cx + Rr * (.3 + k * .1), cy + Rr * (.3 + k * .1)], k * 50, k * 50 + 70, fill=F[0], width=2)
    n = 3 + c.w // 2 + (1 if kind == "gasping" else 0)
    tubes = [(cx + math.cos(a) * Rr * .5, cy + math.sin(a) * Rr * .5, Rr * c.rng.uniform(.2, .27) * min(1.05, c.big)) for a in np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)] + [(cx, cy, Rr * .22)]
    for i in range(len(tubes) - 1):
        a, b = tubes[i], tubes[(i + 1) % (len(tubes) - 1)]; thick(tm, curve(c, a[0], a[1], b[0], b[1], .3), F[2], 6)
    suture(tm, c, curve(c, tubes[0][0], tubes[0][1], cx, cy, .1, 5))
    for px_, py_, r in sorted(tubes, key=lambda p: -(p[0] + p[1])):
        eshadow(tm, px_, py_, r, r, 4, 5); lit_ellipse(tm, px_, py_, r, r, F)
        for t in (.75, .5): d.ellipse([px_ - r * t, py_ - r * t, px_ + r * t, py_ + r * t], outline=F[0], width=1)
        hole = r * (.45 if kind == "gasping" else .3)
        d.ellipse([px_ - hole, py_ - hole, px_ + hole, py_ + hole], fill=(26, 8, 14) if kind != "decaying" else (60, 110, 60), outline=OUT)
        if kind == "decaying": blk(tm, px_ - 2, py_ - 2, 3, (170, 240, 140))
        else: d.ellipse([px_ - hole * .4, py_ - hole * .4, px_ + hole * .3, py_ + hole * .3], fill=tone(ooze, -20))
    if kind == "decaying": glow(tm, cx, cy, Rr * .9, (140, 230, 120), .5)


CLOTHES = [((130, 134, 140), (150, 40, 40)), ((150, 136, 112), (110, 96, 80)), ((150, 40, 50), (220, 200, 160)), ((160, 40, 36), (220, 210, 190)),
           ((50, 50, 60), (200, 196, 186)), ((120, 116, 80), (90, 86, 60)), ((100, 104, 70), (70, 72, 50)), ((90, 104, 80), (60, 70, 90)), ((40, 42, 50), (80, 220, 230))]


def impalestake(tm, x, y, w, h, st, v):
    """An impaling stake from above: the sharpened top of a thick post standing out of a pool of blood, with the one
    it holds slumped down it: a body sagging round the stake, arms hanging, in the clothes of the age's soldiers
    (mail and surcoat, plague rags, a slashed doublet, a red coat, a black frock coat, khaki, olive drab, camouflage,
    dark armour with lit seams); or bones only, or the bare stake. The stake is the age's: an adzed log, a tarred
    pole, a greased pointed stake, a squared post, an iron-shod post, a steel picket, a length of rebar, a scaffold
    tube, a dark composite spike."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    hold = v.get("victim", "corpse"); e = c.e
    stake = [(120, 92, 62), (60, 50, 44), (150, 112, 70), (130, 100, 70), (80, 80, 88), (110, 112, 104), (140, 80, 50), (170, 172, 176), (50, 54, 64)][e]
    S = rp(stake, 16); cl, trim = CLOTHES[e]
    grd = {"atrocity": (70, 40, 40), "mud": (96, 80, 56), "snow": (188, 192, 200), "ash": (110, 108, 112)}[v.get("ground", "atrocity")]
    d.rectangle([X0, Y0, X1, Y1], fill=grd, outline=None)
    d.polygon(blob(c, cx + 2, cy + 2, Rr * .9, Rr * .82, 14, .2), fill=(96, 20, 26) if v.get("blood", "fresh") == "fresh" else (60, 34, 30), outline=OUT)
    for k in range(4): d.ellipse([cx + c.rng.uniform(-Rr * .7, Rr * .4), cy + c.rng.uniform(-Rr * .6, Rr * .5), cx + c.rng.uniform(Rr * .45, Rr * .8), cy + c.rng.uniform(Rr * .5, Rr * .8)], fill=(120, 26, 30))
    sr = Rr * (.2 if e not in (6, 7) else .13)
    if hold != "bare":
        bx, by = cx, cy
        if hold == "corpse":
            body = [(bx - Rr * .45, by - Rr * .25), (bx + Rr * .45, by - Rr * .28), (bx + Rr * .5, by + Rr * .3), (bx - Rr * .5, by + Rr * .35)]
            pshadow(tm, body, 3, 4); poly(tm, body, cl)
            d.line([bx - Rr * .45, by - Rr * .05, bx + Rr * .48, by - Rr * .05], fill=trim, width=2)
            for sx in (-1, 1): thick(tm, [bx + sx * Rr * .45, by - Rr * .2, bx + sx * Rr * .8, by + Rr * .45], cl, 5); blk(tm, bx + sx * Rr * .8 - 2, by + Rr * .45 - 2, 4, (200, 170, 150))
            lit_ellipse(tm, bx - Rr * .05, by - Rr * .5, Rr * .2, Rr * .18, rp((206, 176, 156) if e != 8 else (70, 74, 84), 14))
        else:
            thick(tm, [bx - Rr * .4, by, bx + Rr * .4, by], (224, 214, 190), 3)
            for k in range(4): d.arc([bx - Rr * .35, by - Rr * .35 + k * 5, bx + Rr * .35, by - Rr * .05 + k * 5], 180, 360, fill=(224, 214, 190), width=2)
            lit_ellipse(tm, bx, by - Rr * .55, Rr * .16, Rr * .15, rp((224, 214, 190), 10)); blk(tm, bx - 3, by - Rr * .55, 2, OUT); blk(tm, bx + 2, by - Rr * .55, 2, OUT)
    eshadow(tm, cx, cy, sr, sr, 5, 6)
    lit_ellipse(tm, cx, cy, sr, sr, S); d.ellipse([cx - sr * .35, cy - sr * .35, cx + sr * .25, cy + sr * .25], fill=S[4])
    if e == 4: d.ellipse([cx - sr * .7, cy - sr * .7, cx + sr * .7, cy + sr * .7], outline=IRON[3], width=2)
    if e == 8: d.line([cx - sr * .6, cy, cx + sr * .6, cy], fill=GLOW[2], width=2)
    if hold == "corpse": d.ellipse([cx - sr * .5, cy - sr * .5, cx + sr * .5, cy + sr * .5], fill=(140, 20, 30))
    relic(tm, c, X0 + Rr * .3, Y1 - Rr * .3, Rr * .2)


# ================================================================ the Underworld
UNDER = {"labyrinth": ((52, 68, 60), (110, 230, 150)),       # black-green stone and soulsteel, sick green spectre-light
         "tempest": ((120, 130, 150), (150, 190, 230)),      # storm grey, cold blue
         "abyss": ((72, 50, 92), (190, 110, 240))}           # void violet-black, violet
BONE = rp((214, 204, 178), 14)


def skull(tm, cx, cy, r, B=BONE, eyes=None):
    """A skull from above, face to the south: the dome, a brow line and two dark eye holes (lit with spectre-light
    when eyes is given)."""
    d = tm.d; lit_ellipse(tm, cx, cy, r, r * .92, B)
    d.line([cx - r * .7, cy + r * .2, cx + r * .7, cy + r * .2], fill=B[0], width=1)
    for sx in (-1, 1):
        d.ellipse([cx + sx * r * .42 - r * .22, cy + r * .3, cx + sx * r * .42 + r * .22, cy + r * .7], fill=eyes or (20, 14, 18))
    d.rectangle([cx - r * .12, cy + r * .72, cx + r * .12, cy + r * .9], fill=B[0])


def spectregate(tm, x, y, w, h, st, v):
    """A Labyrinth archway from above: two piers of fused bones and black stone, skulls set in them staring south
    with spectre-light in their eyes, and the lintel between them a span of ribs and long bones; in the gap a veil of
    living shadow. Closed: the shadow fills the arch, swirling, with grasping hands in it; open: the veil drawn back
    to the piers and a dark passage of black flagstones running through. The realm sets the stone and the light;
    relics of the age's dead are cemented in the piers. A rich (strong) gate is built of more skulls. The piers
    are square, round or each a pair of narrow posts."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0
    stone, light = UNDER[v.get("realm", "labyrinth")]; build = v.get("build", "bone")
    stone = {"bone": mix(stone, (200, 190, 166), .6), "stone": stone, "soulsteel": mix(stone, (150, 170, 200), .45)}[build]
    S = rp(mix(stone, (110, 100, 120), .1 * (c.e % 3)), 14); op = st == "open"
    pw = W * .2
    if op:                                                                   # the passage floor through the arch
        lit_rect(tm, X0 + pw - 2, Y0 + 2, X1 - pw + 2, Y1 - 2, rp((34, 32, 40), 8))
        for gx in np.arange(X0 + pw + 10, X1 - pw - 4, 16): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=(20, 18, 24), width=1)
        d.line([X0 + pw, cy, X1 - pw, cy], fill=(20, 18, 24), width=1)
        for sx in (X0 + pw + 6, X1 - pw - 6):                                    # the veil gathered at each pier
            d.polygon(blob(c, sx, cy, 8, H * .45, 10, .3), fill=(14, 10, 18), outline=tone(light, -80))
    else:
        d.rectangle([X0 + pw - 2, Y0 + 3, X1 - pw + 2, Y1 - 3], fill=(16, 12, 20))
        for k in range(6):
            pts = [(X0 + pw + (W - 2 * pw) * t, cy + math.sin(t * 9 + k * 1.3) * H * .3 * c.rng.uniform(.5, 1)) for t in np.linspace(0, 1, 14)]
            d.line(pts, fill=mix((30, 24, 40), light, .08 + .05 * (k % 3)), width=2)
        for k in range(2 + c.w // 2):                                            # hands reaching out of it
            hx_ = X0 + pw + (W - 2 * pw) * c.rng.uniform(.15, .85); hy_ = cy + c.rng.uniform(-H * .15, H * .2)
            col = mix((150, 156, 170), light, .25)
            d.line([hx_, hy_ + 8, hx_, hy_ - 2], fill=col, width=3)
            for f in (-3, -1, 1, 3): d.line([hx_ + f * .7, hy_ - 2, hx_ + f, hy_ - 7], fill=col, width=1)
    # the lintel of ribs and long bones along the north
    pshadow(tm, [(X0 + pw * .6, Y0), (X1 - pw * .6, Y0), (X1 - pw * .6, Y0 + H * .32), (X0 + pw * .6, Y0 + H * .32)], 3, 4)
    lit_rect(tm, X0 + pw * .6, Y0 + 1, X1 - pw * .6, Y0 + H * .3, S)
    for gx in np.arange(X0 + pw * .8, X1 - pw * .7, 7):
        d.arc([gx - 5, Y0 + 2, gx + 5, Y0 + H * .3 - 1], 180, 360, fill=BONE[3], width=2)
    thick(tm, [X0 + pw * .7, Y0 + H * .15, X1 - pw * .7, Y0 + H * .15], BONE[2], 3)
    skull(tm, cx, Y0 + H * .2, min(9, H * .18), eyes=light)
    for sx in (X0, X1 - pw):                                                # the two piers
        pts = [(sx, Y0), (sx + pw, Y0), (sx + pw, Y1), (sx, Y1)]; pier = v.get("piers", "square")
        pshadow(tm, pts, 4, 5)
        if pier == "round": lit_ellipse(tm, sx + pw / 2, (Y0 + Y1) / 2, pw / 2 + 2, H / 2, S)
        elif pier == "twin":                                                  # each pier a pair of narrow posts
            for px0 in (sx, sx + pw * .55): lit_rect(tm, px0, Y0, px0 + pw * .45, Y1, S)
        else: lit_rect(tm, sx, Y0, sx + pw, Y1, S)
        n = 2 + c.w // 2; q = min(pw, H) * .2
        for k in range(n):
            skull(tm, sx + pw * (.3 + .4 * (k % 2)), Y0 + H * (.25 + .5 * (k // 2) / max(1, (n - 1) // 2)) if n > 2 else Y0 + H * (.3 + .4 * k), q, eyes=light if (k + c.w) % 2 else None)
        thick(tm, [sx + 3, Y1 - 5, sx + pw - 3, Y1 - 8], BONE[2], 2)
    relic(tm, c, X0 + pw * .5, Y1 - H * .2, min(pw, H) * .16)
    relic(tm, c, X1 - pw * .5, Y1 - H * .2, min(pw, H) * .16, k=4)
    if not op: glow(tm, cx, cy, W * .25, light, .35)


GLYPH = [(1, 0, 1), (0, 1, 1), (1, 1, 0), (1, 0, 0), (0, 1, 0)]
# the names of the age's drowned dead are cut in the age's own hand: runes, black letter, Roman capitals, copperplate,
# a printer's type, stencil, typewriter, a bar code, lit code (each a cell size and stroke pattern)
SCRIPT = [(6, 7, "rune"), (5, 8, "black"), (7, 7, "roman"), (8, 5, "copper"), (5, 6, "type"), (8, 8, "stencil"), (5, 5, "type"), (3, 9, "bar"), (6, 4, "code")]


def labyrinthstele(tm, x, y, w, h, st, v):
    """A Labyrinth stele from above: an upright slab of black stone or dark soulsteel on a stepped plinth, its top
    edge seen from above and its south face shown foreshortened, cut with rows of angular glyphs that glow with
    spectre-light (a warning or a waymark in the tongue of the deep). A relic of the age's dead is propped against
    its foot. The realm sets the stone and the glow; a strong place has a larger, crowded stele. Its head is
    square, rounded or pointed like a gable."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0
    stone, light = UNDER[v.get("realm", "labyrinth")]; mat = v.get("stone", "basalt")
    base = {"basalt": (40, 38, 46), "soulsteel": (150, 160, 186), "bone": (206, 198, 174)}[mat]; S = rp(base, 14)
    plinth = {"labyrinth": (46, 70, 56), "tempest": (110, 124, 146), "abyss": (66, 40, 86)}[v.get("realm", "labyrinth")]
    lit_rect(tm, X0, Y0 + H * .08, X1, Y1, rp(plinth, 12))                       # the plinth
    lean = int(c.rng.integers(-2, 3)); top = Y0 + H * .15
    pshadow(tm, [(X0 + 4, top), (X1 - 4, top), (X1 - 4, Y1 - 4), (X0 + 4, Y1 - 4)], 3, 4)
    lit_rect(tm, X0 + 4 + lean, top, X1 - 4 + lean, Y1 - 4, S)                    # the foreshortened south face
    head = v.get("head", "flat"); Tp = rp(tone(base, 20), 10)
    if head == "round": d.pieslice([X0 + 4 + lean, top - H * .12, X1 - 4 + lean, top + H * .12], 180, 360, fill=Tp[2], outline=OUT); d.line([X0 + 4 + lean, top, X1 - 4 + lean, top], fill=Tp[1], width=3)
    elif head == "pointed": poly(tm, [(X0 + 4 + lean, top + 2), (cx + lean, Y0 + 1), (X1 - 4 + lean, top + 2)], Tp[2], out=OUT)
    else: lit_rect(tm, X0 + 3 + lean, top - 4, X1 - 3 + lean, top + 3, Tp)                 # its top edge
    if c.w >= 4: d.line([X0 + 5 + lean, top + 5, X1 - 5 + lean, top + 5], fill=tone(light, -40), width=2)
    gc = light; sw, sh, kind = SCRIPT[c.e]; gy = top + 6 + (c.w >= 4) * 3
    while gy < Y1 - 6 - sh * .5:
        gx = X0 + 7 + lean
        while gx < X1 - 7 - sw * .6 + lean:
            r_ = c.rng.random()
            if kind == "bar": d.line([gx, gy, gx, gy + sh], fill=gc, width=1 + (r_ < .4))
            elif kind == "code": d.rectangle([gx, gy, gx + sw * (.3 + r_ * .6), gy + 1], fill=gc)
            elif kind == "rune": d.line([gx, gy + sh * .8, gx + sw * .3, gy, gx + sw * .6, gy + sh * .8], fill=gc, width=1)
            elif kind == "black": d.rectangle([gx, gy, gx + 2, gy + sh * .8], fill=gc); d.point((gx + 3, gy), fill=gc)
            elif kind == "roman": d.line([gx, gy, gx + sw * .3, gy + sh * .7, gx + sw * .6, gy], fill=gc, width=1)
            elif kind == "copper": d.arc([gx, gy, gx + sw * .7, gy + sh], 30 + r_ * 90, 300, fill=gc, width=1)
            elif kind == "stencil": d.rectangle([gx, gy, gx + sw * .5, gy + sh * .6], outline=gc)
            else: d.rectangle([gx, gy + sh * .3, gx + sw * .55, gy + sh * .6], fill=gc)
            gx += sw
        gy += sh + 1
    relic(tm, c, X1 - W * .2, Y1 - H * .15, min(W, H) * .14)
    glow(tm, cx, cy, W * .5, light, .3)


def oblivionchasm(tm, x, y, w, h, st, v):
    """A chasm of the void from above: a ragged rent in the ground, its lip of cracked black stone breaking away in
    ledges that step down, darker and darker, into a nothing so black it seems to move, pricked with drifting motes;
    wisps of mist curl over the edge and relics of the age's dead lie where they slid. The realm sets the stone and
    the motes (sick green in the Labyrinth, cold blue in the Tempest, violet in the Abyss); a strong place opens a
    wider rent."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    stone, light = UNDER[v.get("realm", "labyrinth")]; S = rp(stone, 14)
    pts = blob(c, cx, cy, W / 2, H / 2, 22, .08); d.polygon(pts, fill=S[2], outline=OUT)
    for k in range(14):
        a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.75, .95); px_, py_ = cx + math.cos(a) * W / 2 * t, cy + math.sin(a) * H / 2 * t
        d.line([px_, py_, px_ + c.rng.uniform(-10, 10), py_ + c.rng.uniform(-8, 8)], fill=S[0], width=1)
    f = (.6 + .05 * c.w)
    rift = v.get("shape", "rift") == "rift"
    for k, (t, col) in enumerate(((f, S[1]), (f * .84, S[0]), (f * .7, tone(S[0], -20)), (f * .56, (8, 6, 12)))):
        if rift:                                                           # a long jagged crack, widest in the middle
            top = [(X0 + W * (.5 - .5 * t * 1.5 * (1 - u)) + W * .75 * t * u * 1.33, cy - H * .5 * t * math.sin(math.pi * u) ** .7 * c.rng.uniform(.75, 1)) for u in np.linspace(0, 1, 12)]
            top = [(cx + (a - cx), b) for a, b in top]
            xs = np.linspace(cx - W * .5 * t * 1.3, cx + W * .5 * t * 1.3, 12)
            ring = [(xx, cy - H * .5 * t * math.sin(math.pi * u) ** .7 * c.rng.uniform(.7, 1) + math.sin(u * 9) * 3) for xx, u in zip(xs, np.linspace(0, 1, 12))]
            ring += [(xx, cy + H * .5 * t * math.sin(math.pi * u) ** .7 * c.rng.uniform(.7, 1) + math.sin(u * 7) * 3) for xx, u in zip(xs[::-1], np.linspace(1, 0, 12))]
            ring = [(min(X1 - 2, max(X0 + 2, a)), b) for a, b in ring]
        else:
            ring = blob(c, cx, cy, W / 2 * t, H / 2 * t, 18, .14)
        d.polygon(ring, fill=col, outline=OUT if k == 0 else None)
    motes = v.get("motes", "sparks")
    for k in range((10 + c.w * 2) if motes == "sparks" else 3):
        a = c.rng.uniform(0, 6.28); t = math.sqrt(c.rng.uniform(0, 1)) * f * .5; blk(tm, cx + math.cos(a) * W / 2 * t, cy + math.sin(a) * H / 2 * t, 2, mix(light, (255, 255, 255), .3) if k % 3 else light)
    if motes == "mist":                                                     # mist welling up and curling over the lip
        for k in range(6):
            px_ = cx + c.rng.uniform(-W * .3, W * .3); py_ = cy + c.rng.uniform(-H * .15, H * .15)
            pts = [(px_ + math.cos(t * 4) * 6 * t, py_ - t * H * .25 + math.sin(t * 4) * 4) for t in np.linspace(0, 1.6, 12)]
            d.line(pts, fill=mix((150, 156, 170), light, .25), width=4); d.line([(a - 1, b - 1) for a, b in pts], fill=mix((200, 206, 216), light, .2), width=1)
    for k in range(4 if motes != "none" else 1):
        a = c.rng.uniform(0, 6.28); px_, py_ = cx + math.cos(a) * W / 2 * f, cy + math.sin(a) * H / 2 * f
        d.line(curve(c, px_, py_, px_ + c.rng.uniform(-24, 24), py_ + c.rng.uniform(-16, 16), .4), fill=mix((170, 176, 190), light, .2), width=3)
    relic(tm, c, X0 + W * .14, Y1 - H * .2, min(W, H) * .07); relic(tm, c, X1 - W * .14, Y0 + H * .22, min(W, H) * .07, k=3)


def maelstrommist(tm, x, y, w, h, st, v):
    """A bank of Maelstrom mist from above: a long drift of thick grey-white fog in rolled, overlapping billows,
    swirling into a slow spiral at its heart, with pale faces and reaching hands half-formed in it and relics of the
    age's dead tumbling through. The realm tints it (bone grey in the Labyrinth, storm blue in the Tempest, slate on
    the Far Shores, sooty by Stygia); calm it lies low, raging it spirals tight with lightning in it. A strong storm
    is a thicker bank."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    tint = {"tempest": (150, 164, 186), "labyrinth": (170, 170, 164), "shores": (126, 136, 146), "stygia": (120, 112, 116)}[v.get("realm", "tempest")]
    mood = v.get("mood", "calm"); M = rp(tint, 16)
    n = 9 + c.w + (3 if mood == "raging" else 0)
    bill = [(X0 + W * c.rng.uniform(.14, .86), Y0 + H * c.rng.uniform(.2, .8), W * c.rng.uniform(.12, .2), H * c.rng.uniform(.22, .34)) for _ in range(n)]
    bill += [(X0 + W * .12, cy, W * .12, H * .3), (X1 - W * .12, cy, W * .12, H * .3), (cx, Y0 + H * .2, W * .2, H * .2), (cx, Y1 - H * .2, W * .2, H * .2)]
    for px_, py_, rx, ry in bill: d.ellipse([px_ - rx - 1, py_ - ry - 1, px_ + rx + 1, py_ + ry + 1], fill=M[0])
    for px_, py_, rx, ry in sorted(bill, key=lambda b: b[0] + b[1], reverse=True):
        d.ellipse([px_ - rx, py_ - ry, px_ + rx, py_ + ry], fill=M[1]); d.ellipse([px_ - rx, py_ - ry, px_ + rx - 3, py_ + ry - 3], fill=M[2])
        d.arc([px_ - rx * .8, py_ - ry * .8, px_ + rx * .6, py_ + ry * .6], 180, 290, fill=M[4], width=2)
    turns = 2.4 if mood == "raging" else 1.4
    pts = [(cx + math.cos(t * 6.28 * turns) * W * .3 * (1 - t), cy + math.sin(t * 6.28 * turns) * H * .34 * (1 - t)) for t in np.linspace(0, .9, 40)]
    d.line(pts, fill=M[0], width=3); d.line([(a - 1, b - 1) for a, b in pts], fill=M[3], width=1)
    for k in range(2 + c.w // 2):                                                # faces in the fog
        fx, fy = X0 + W * c.rng.uniform(.2, .8), Y0 + H * c.rng.uniform(.3, .7); r = min(W, H) * .07
        d.ellipse([fx - r, fy - r * 1.2, fx + r, fy + r * 1.2], fill=M[3])
        for sx in (-1, 1): d.ellipse([fx + sx * r * .4 - 2, fy - r * .2 - 2, fx + sx * r * .4 + 2, fy - r * .2 + 2], fill=M[0])
        d.ellipse([fx - 2, fy + r * .4, fx + 2, fy + r * .7], fill=M[0])
    if mood == "raging":
        for k in range(2):
            px_, py_ = X0 + W * c.rng.uniform(.25, .75), Y0 + H * .2; pts = [(px_, py_)]
            for j in range(5): px_ += c.rng.uniform(-8, 8); py_ += H * .12; pts.append((px_, py_))
            d.line(pts, fill=(230, 236, 255), width=2)
    relic(tm, c, X0 + W * .3, Y0 + H * .35, min(W, H) * .08); relic(tm, c, X0 + W * .7, Y1 - H * .3, min(W, H) * .08, k=5)


# ================================================================ Paradox and the Deep Umbra
PARA = {"paradox": ((210, 206, 196), (60, 60, 70)),          # floor, rift: a bleached plain under a white sky
        "deep-umbra": ((60, 52, 96), (10, 8, 20)),
        "shard": ((150, 60, 50), (40, 10, 14)),               # the Shard Realm of Forces
        "lab": ((170, 176, 180), (30, 34, 40))}              # a laboratory floor where a working went wrong


def paradoxflaw(tm, x, y, w, h, st, v):
    """A fault in the shape of things from above: a patch of floor broken into slabs that do not meet, each shifted
    and turned a little as if folded wrong, the gaps between them showing a flat dark nothing; laid over it, things
    that cannot be: an impossibly flat blue square, impossibly thin lines of cyan, magenta and yellow, and the lines of
    the age's own picture of the world (paradigm). The realm sets the floor; a rift kind splits it, a fold kind
    doubles a slab over itself, a flat kind flattens the middle to a smooth disc. A strong flaw is wider."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    floor, rift = PARA[v.get("realm", "paradox")]; F = rp(floor, 14); kind = v.get("kind", "rift"); sp = 1
    d.rectangle([X0, Y0, X1, Y1], fill=rift, outline=OUT)
    n = 3; s = W / n
    for i in range(n):
        for j in range(n):
            ox, oy = c.rng.uniform(-3, 3) * sp, c.rng.uniform(-3, 3) * sp; a = c.rng.uniform(-.12, .12) * sp
            px_, py_ = X0 + s * (i + .5) + ox, Y0 + s * (j + .5) + oy; q = s * .43
            pts = [(px_ + (u * math.cos(a) - vv * math.sin(a)) * q, py_ + (u * math.sin(a) + vv * math.cos(a)) * q) for u, vv in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            poly(tm, pts, F[2 + (i + j) % 2]); d.line(pts[:2], fill=F[4], width=1)
    if kind == "fold":
        pts = [(X0 + W * .3, Y0 + H * .3), (X1 - W * .2, Y0 + H * .25), (X1 - W * .3, Y1 - H * .2)]; poly(tm, pts, F[1]); d.line([pts[0], pts[2]], fill=F[4], width=2)
    elif kind == "flat":
        d.ellipse([cx - W * .28, cy - H * .28, cx + W * .28, cy + H * .28], fill=mix(floor, (255, 255, 255), .5), outline=OUT)
    paradigm(tm, c, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3)
    q = W * (.1 + .02 * c.w); bx, by = X0 + W * c.rng.uniform(.2, .6), Y0 + H * c.rng.uniform(.2, .6)
    d.rectangle([bx, by, bx + q, by + q], fill=(40, 90, 230))
    for col, o in (((40, 230, 240), .2), ((240, 40, 220), .5), ((250, 240, 40), .8)):
        d.line([X0 + 3, Y0 + H * o, X1 - 3, Y0 + H * (1 - o) * .9 + 4], fill=col, width=1)


def paradoxglass(tm, x, y, w, h, st, v):
    """Scarlet realm glass from above: a bed of broken red glass, great flat shards of it lying and standing at
    angles, each with a bright edge toward the light and the colour deepening into its body, a pool of scarlet water
    caught among them that throws a red light; inside the glass, faint, the lines of the age's picture of the world.
    Pale rose glass in the Horizon realms, deep carmine in the Shard Realm, a burning scarlet in the Paradox realm."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    base = {"shard": (150, 20, 40), "paradox": (220, 40, 46), "horizon": (220, 120, 140)}[v.get("realm", "shard")]
    G = rp(mix(base, PARADIGM[c.e], .12), 22)
    d.polygon(blob(c, cx, cy, W / 2, H / 2, 16, .1), fill=tone(G[0], -30), outline=OUT)
    pool = v.get("pool", "wet")
    if pool != "dry": d.polygon(blob(c, cx + W * .1, cy + H * .1, W * (.2 if pool == "wet" else .3), H * (.2 if pool == "wet" else .3), 10, .2), fill=G[3] if pool == "wet" else mix(G[4], (255, 255, 255), .4), outline=G[0])
    n = 5 + c.w
    for k in range(n):
        a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.1, .62); px_, py_ = cx + math.cos(a) * W / 2 * t, cy + math.sin(a) * H / 2 * t
        L_ = min(W, H) * c.rng.uniform(.18, .32); b = c.rng.uniform(0, 6.28)
        pts = [(px_ + math.cos(b) * L_, py_ + math.sin(b) * L_), (px_ + math.cos(b + 2.3) * L_ * .5, py_ + math.sin(b + 2.3) * L_ * .5), (px_ + math.cos(b + 3.6) * L_ * .6, py_ + math.sin(b + 3.6) * L_ * .6)]
        pshadow(tm, pts, 3, 4, .5); poly(tm, pts, G[1 + k % 3], out=G[0]); d.line(pts[:2], fill=G[4], width=2)
    paradigm(tm, c, cx - W * .25, cy - H * .25, cx + W * .25, cy + H * .25)
    glow(tm, cx + W * .1, cy + H * .1, min(W, H) * .5, base, .4)


def voidpatch(tm, x, y, w, h, st, v):
    """A patch of open void from above: a hole in the realm's ground with a curled, fraying lip, through which shows
    the black of the Deep Umbra: stars in clusters, a faint nebula and a far lit body. The lip of the hole is drawn
    in the lines of the age's picture of the world, unravelling. The realm sets the ground round it (violet in the
    Deep Umbra, white in a Paradox realm, shifting in the Flux)."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    grd = {"deep-umbra": (84, 70, 120), "paradox": (206, 202, 192), "flux": (90, 150, 110)}[v.get("realm", "deep-umbra")]; G = rp(grd, 14)
    sky = v.get("sky", "stars")
    d.polygon(blob(c, cx, cy, W / 2, H / 2, 16, .1), fill=G[2], outline=OUT)
    f = .66 + .04 * c.w
    hole = blob(c, cx, cy, W / 2 * f, H / 2 * f, 16, .22)
    d.polygon([(a + 3, b + 3) for a, b in hole], fill=G[4]); d.polygon(hole, fill=(4, 4, 12), outline=G[0])
    neb = {"stars": (60, 40, 110), "nebula": (140, 50, 120), "world": (30, 70, 120)}[sky]
    d.ellipse([cx - W * .2, cy - H * .1, cx + W * .15, cy + H * .14], fill=mix((4, 4, 12), neb, .5))
    for k in range(14 + c.w * 3):
        a = c.rng.uniform(0, 6.28); t = math.sqrt(c.rng.uniform(0, 1)) * f * .45; blk(tm, cx + math.cos(a) * W * t, cy + math.sin(a) * H * t, 1 + (k % 4 == 0), (230, 230, 255) if k % 3 else (255, 220, 160))
    if sky == "world": lit_ellipse(tm, cx + W * .12, cy - H * .1, W * .09, W * .09, rp((90, 140, 200), 20))
    for a in np.linspace(0, 6.28, 9)[:-1]:
        px_, py_ = cx + math.cos(a) * W / 2 * f, cy + math.sin(a) * H / 2 * f; d.line([px_, py_, px_ + math.cos(a + 1.6) * 8, py_ + math.sin(a + 1.6) * 8], fill=G[4], width=2)
    paradigm(tm, c, cx - W * f / 2, cy - H * f / 2, cx + W * f / 2, cy + H * f / 2)


UMBRA = {"deep-umbra": ((80, 60, 150), (150, 110, 220)),       # body, tips: violet and lilac
         "flux": ((60, 150, 120), (230, 130, 200)),            # sea-green with pink: the Flux shifts its colours
         "shard": ((170, 80, 40), (250, 190, 90)),
         "horizon": ((170, 150, 80), (250, 240, 170)),
         "pangaea": ((50, 110, 50), (150, 200, 80))}          # primal green


def umbralflora(tm, x, y, w, h, st, v):
    """A growth of the deep worlds from above, big enough to climb: a giant fern crown of long feathered fronds, a
    lichen tree of stacked crusted plates, or a polyp tree of fat tubes each ending in a glowing mouth. Violet in the
    Deep Umbra, sea-green and pink in the Flux, ember in the Shard Realm, gold in a Horizon realm, primal green in
    Pangaea. The Weaver's pattern web creeps over it more each age (weave). A strong place grows a bigger one."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    body, tip = UMBRA[v.get("realm", "deep-umbra")]; B = rp(body, 18); Tc = rp(tip, 18); kind = v.get("kind", "fern"); sz = min(1, c.big)
    if kind == "fern":
        n = 9 + c.w
        for i, a in enumerate(np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)):
            L_ = Rr * c.rng.uniform(.8, 1.0) * sz; pts = petal(cx, cy, a, L_, L_ * .3, c)
            pshadow(tm, pts, 3, 4); poly(tm, pts, B[1 + i % 3])
            for t in np.linspace(.2, .9, 7):
                px_, py_ = cx + math.cos(a) * L_ * t, cy + math.sin(a) * L_ * t; q = L_ * .14 * math.sin(math.pi * t)
                for sgn in (-1, 1): d.line([px_, py_, px_ + math.cos(a + sgn * 1.0) * q, py_ + math.sin(a + sgn * 1.0) * q], fill=B[4], width=1)
            d.line([cx, cy, cx + math.cos(a) * L_, cy + math.sin(a) * L_], fill=B[0], width=2)
            blk(tm, cx + math.cos(a) * L_ * .92 - 2, cy + math.sin(a) * L_ * .92 - 2, 3, Tc[3])
        lit_ellipse(tm, cx, cy, Rr * .14, Rr * .14, B)
    elif kind == "lichen":
        plates = [(cx + math.cos(a) * Rr * t, cy + math.sin(a) * Rr * t, Rr * c.rng.uniform(.22, .32) * sz) for a, t in zip(np.linspace(0, 6.28, 8 + c.w, endpoint=False), c.rng.uniform(.5, .7, 8 + c.w))]
        thick(tm, [cx - Rr * .1, cy - Rr * .1, cx + Rr * .2, cy + Rr * .2], (90, 80, 70), 6)
        for px_, py_, r in sorted(plates, key=lambda p: -(p[0] + p[1])):
            eshadow(tm, px_, py_, r, r * .8, 3, 4); lit_ellipse(tm, px_, py_, r, r * .8, B)
            for k in range(4): a = c.rng.uniform(0, 6.28); blk(tm, px_ + math.cos(a) * r * .5 - 2, py_ + math.sin(a) * r * .4 - 2, 3, Tc[2])
            d.arc([px_ - r, py_ - r * .8, px_ + r, py_ + r * .8], 200, 300, fill=Tc[4], width=2)
    else:
        tubes = [(cx + math.cos(a) * Rr * .55 * sz, cy + math.sin(a) * Rr * .55 * sz) for a in np.linspace(0, 6.28, 6 + c.w // 2, endpoint=False) + c.rng.uniform(0, 1)]
        for px_, py_ in tubes: thick(tm, curve(c, cx, cy, px_, py_, .3), B[2], 8)
        for px_, py_ in tubes:
            r = Rr * c.rng.uniform(.16, .22); eshadow(tm, px_, py_, r, r, 3, 4); lit_ellipse(tm, px_, py_, r, r, B)
            d.ellipse([px_ - r * .5, py_ - r * .5, px_ + r * .5, py_ + r * .5], fill=Tc[3], outline=OUT); blk(tm, px_ - 2, py_ - 2, 3, Tc[4])
        lit_ellipse(tm, cx, cy, Rr * .25, Rr * .25, B)
    weave(tm, c, cx, cy, Rr * .85)


CRYSTAL = {"deep-umbra": (150, 120, 250), "shard": (250, 120, 60), "horizon": (120, 230, 250), "erebus": (110, 250, 160), "caern": (240, 230, 160)}


def hexprism(tm, cx, cy, r, C, a=0):
    """A crystal seen end on from above: a six-sided top with its facets lit toward the north-west."""
    pts = [(cx + math.cos(t) * r, cy + math.sin(t) * r) for t in np.linspace(0, 6.28, 6, endpoint=False) + a]
    eshadow(tm, cx, cy, r, r, 4, 5); poly(tm, pts, C[1], out=C[0])
    for i in range(6):
        p1, p2 = pts[i], pts[(i + 1) % 6]; ang = math.atan2((p1[1] + p2[1]) / 2 - cy, (p1[0] + p2[0]) / 2 - cx)
        k = 4 if -2.6 < ang < -1.0 else 3 if -3.2 < ang < -.4 else 1 if 0.4 < ang < 2.4 else 2
        tm.d.polygon([p1, p2, (cx, cy)], fill=C[k])
    tm.d.polygon([(cx + math.cos(t) * r * .35, cy + math.sin(t) * r * .35) for t in np.linspace(0, 6.28, 6, endpoint=False) + a], fill=C[4])


def lumincrystal(tm, x, y, w, h, st, v):
    """A glowing realm crystal from above: a cluster of six-sided crystals of different heights, seen end on, their
    facets lit and their cores bright, round a big central one, growing out of cracked rock. Lit: they shine and
    throw their colour on the ground; out: dark and glassy. Lilac in the Deep Umbra, ember in the Shard Realm, ice
    blue in a Horizon realm, green in Erebus, pale gold at a caern. The Weaver's web creeps over it each age."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    col = CRYSTAL[v.get("realm", "deep-umbra")]; lit = st == "lit"
    C = rp(col if lit else mix(col, (50, 50, 60), .6), 26)
    d.polygon(blob(c, cx, cy, Rr, Rr * .95, 14, .15), fill=(70, 66, 74), outline=OUT)
    for k in range(6): a = c.rng.uniform(0, 6.28); d.line([cx, cy, cx + math.cos(a) * Rr * .95, cy + math.sin(a) * Rr * .9], fill=(44, 40, 48), width=1)
    n = 4 + c.w
    cr = [(cx + math.cos(a) * Rr * c.rng.uniform(.42, .62), cy + math.sin(a) * Rr * c.rng.uniform(.42, .62), Rr * c.rng.uniform(.18, .27) * min(1, c.big)) for a in np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)]
    if v.get("cut", "cluster") == "spray":
        for k, a in enumerate(np.linspace(0, 6.28, n + 3, endpoint=False) + c.rng.uniform(0, 1)):
            L_ = Rr * c.rng.uniform(.6, .9) * min(1, c.big); pts = [(cx + math.cos(a - .12) * Rr * .2, cy + math.sin(a - .12) * Rr * .2), (cx + math.cos(a) * L_, cy + math.sin(a) * L_), (cx + math.cos(a + .12) * Rr * .2, cy + math.sin(a + .12) * Rr * .2)]
            pshadow(tm, pts, 3, 4); poly(tm, pts, C[1 + k % 3], out=C[0]); d.line([pts[0], pts[1]], fill=C[4], width=2)
        hexprism(tm, cx, cy, Rr * .26, C)
    else:
        for px_, py_, r in sorted(cr, key=lambda p: -(p[0] + p[1])) + [(cx, cy, Rr * .36 * min(1, c.big))]: hexprism(tm, px_, py_, r, C, c.rng.uniform(0, 1))
    weave(tm, c, cx, cy, Rr * .8)
    if lit: glow(tm, cx, cy, Rr * 1.5, col, .6)


def moonpool(tm, x, y, w, h, st, v):
    """A still moon pool from above: a round basin of perfectly clear, silvered water ringed by pale stones, the full
    moon's disc lying in it and a few ripple rings, moss on the stones; an offering the age's visitors left on the
    rim. Lit: the moon shines in it and silver light spills round; out: the water dark and the moon a faint ghost.
    The realm sets the stone and water. A strong place has a broad pool and a finer ring of stones."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    stone, water = {"aetherial": ((200, 204, 214), (70, 110, 170)), "wolfhome": ((150, 140, 120), (50, 80, 100)),
                    "caern": ((130, 130, 120), (40, 70, 90)), "deep-umbra": ((120, 110, 160), (40, 40, 110))}[v.get("realm", "aetherial")]
    lit = st == "lit"; S = rp(stone, 16); Wt = rp(water if lit else tone(water, -30), 18)
    n = 10 + c.w * 2
    if v.get("rim", "round") == "broad":
        d.ellipse([cx - Rr, cy - Rr, cx + Rr, cy + Rr], fill=S[2], outline=OUT); d.ellipse([cx - Rr * .9, cy - Rr * .9, cx + Rr * .85, cy + Rr * .85], outline=S[4], width=2)
        for a in np.linspace(0, 6.28, n, endpoint=False): d.line([cx + math.cos(a) * Rr * .72, cy + math.sin(a) * Rr * .72, cx + math.cos(a) * Rr, cy + math.sin(a) * Rr], fill=S[0], width=1)
        n = 0
    for a in np.linspace(0, 6.28, n, endpoint=False):
        r = Rr * c.rng.uniform(.14, .2); lit_ellipse(tm, cx + math.cos(a) * Rr * .82, cy + math.sin(a) * Rr * .82, r, r * .85, S)
    pr_ = Rr * .7; d.ellipse([cx - pr_, cy - pr_, cx + pr_, cy + pr_], fill=Wt[2], outline=S[0])
    d.ellipse([cx - pr_ + 3, cy - pr_ + 3, cx + pr_ - 1, cy + pr_ - 1], fill=Wt[1])
    mr = pr_ * .32; mx, my = cx - pr_ * .2, cy - pr_ * .15
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(236, 238, 246) if lit else Wt[3])
    if lit: d.ellipse([mx - mr * .4, my - mr * .2, mx - mr * .1, my + mr * .1], fill=(200, 204, 220))
    for k in (1.4, 2.0): d.ellipse([mx - mr * k, my - mr * k * .8, mx + mr * k, my + mr * k * .8], outline=Wt[3], width=1)
    for k in range(4): a = c.rng.uniform(0, 6.28); blk(tm, cx + math.cos(a) * Rr * .82, cy + math.sin(a) * Rr * .82, 4, (90, 130, 70))
    offering(tm, c, cx + Rr * .62, cy + Rr * .6, Rr * .16)
    if lit: glow(tm, cx, cy, Rr * 1.4, (200, 210, 255), .55)


def coralspire(tm, x, y, w, h, st, v):
    """A coral spire of a far world from above: a branching tower of coral seen down its height, its arms spreading
    from a thick knobbed base in forks, each tip open in a polyp mouth with fine feeding fringes, crusted with
    sponge and barnacle at its foot. Violet and orange in the Deep Umbra, bone white and blue in the Flux; a young
    spire is a stub, an old one a tangle."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    body, tip = {"violet": ((130, 70, 150), (250, 150, 80)), "bone": ((220, 210, 190), (80, 150, 230)), "red": ((190, 60, 60), (250, 220, 120))}[v.get("colour", "violet")]
    B = rp(body, 20); Tp = rp(tip, 20)
    d.polygon(blob(c, cx, cy, Rr, Rr * .96, 14, .12), fill=(60, 64, 80), outline=OUT)
    for k in range(8): a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.75, .92) * Rr; lit_ellipse(tm, cx + math.cos(a) * t, cy + math.sin(a) * t, 4, 3, rp((180, 170, 140), 14))
    def branch(x0_, y0_, a, L_, wd, depth):
        x1_, y1_ = x0_ + math.cos(a) * L_, y0_ + math.sin(a) * L_; thick(tm, [x0_, y0_, x1_, y1_], B[2 + depth % 2], wd)
        if depth < 2 + (c.w >= 3):
            for s_ in (-.55, .55): branch(x1_, y1_, a + s_ + c.rng.uniform(-.2, .2), L_ * .62, max(2, wd - 2), depth + 1)
        else:
            lit_ellipse(tm, x1_, y1_, 4, 4, Tp); blk(tm, x1_ - 1, y1_ - 1, 2, OUT)
    form = v.get("form", "tree")
    if form == "brain":
        lit_ellipse(tm, cx, cy, Rr * .78, Rr * .74, B)
        for k in range(7): d.arc([cx - Rr * .7 + k * Rr * .2, cy - Rr * .6, cx - Rr * .3 + k * Rr * .2, cy + Rr * .6], 50, 310, fill=B[0], width=2)
        for k in range(6): a = c.rng.uniform(0, 6.28); lit_ellipse(tm, cx + math.cos(a) * Rr * .5, cy + math.sin(a) * Rr * .5, 4, 4, Tp)
    elif form == "fan":
        for a in np.linspace(3.6, 5.8, 5 + c.w // 2): branch(cx, cy + Rr * .4, a, Rr * .42, 7, 0)
        lit_ellipse(tm, cx, cy + Rr * .4, Rr * .2, Rr * .16, B)
    else:
        for a in np.linspace(0, 6.28, 4 + c.w // 2, endpoint=False) + c.rng.uniform(0, 1): branch(cx, cy, a, Rr * .36, 7, 0)
        lit_ellipse(tm, cx, cy, Rr * .2, Rr * .2, B)
# ================================================================ the machine realms and the far future
MACH = {"autochthonia": ((120, 96, 70), (250, 140, 50)),      # ground, light: oiled bronze and iron under furnace glow
        "cyberrealm": ((40, 46, 60), (60, 230, 250)),         # dark grid floor, neon cyan
        "scar": ((70, 60, 56), (220, 80, 40))}                # slag and rust, sullen red
WIRE = [((96, 96, 104), (140, 140, 148)), ((110, 70, 50), (150, 100, 70)), ((190, 150, 70), (230, 200, 110)), ((180, 100, 60), (226, 150, 100)),
        ((40, 36, 34), (180, 100, 60)), ((120, 124, 130), (170, 174, 180)), ((150, 40, 36), (40, 40, 44)), ((220, 60, 50), (60, 120, 220)), ((40, 44, 56), (120, 250, 250))]
# the age's wire: drawn iron, rusted iron, brass, copper, gutta-percha over copper, barbed steel, cloth-covered red and
# black, coloured plastic, dark fibre with lit ends (each a body colour and a second colour for its ends or stripes)


def scrapspire(tm, x, y, w, h, st, v):
    """A scrap-metal spire from above: a great heap of the age's wrecked machines piled into a tower, seen down its
    height, its top a point of bent beams at the middle and its sides stepping out in rings of jammed plates, girders
    and wheels, with beams sticking out like spines and the age's scrap (scrap_bit) wedged all through it; light from
    the realm glows in the gaps (furnace orange in Autochthonia, neon cyan in the Cyberrealm, sullen red in the Scar).
    A spire, a squat column or a sprawling tangle; climbable by its jutting beams."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    grd, light = MACH[v.get("realm", "autochthonia")]; form = v.get("form", "spire"); M = rp(mix(SCRAP[c.e], grd, .3), 18)
    d.polygon(blob(c, cx, cy, Rr, Rr * .97, 18, .12), fill=grd, outline=OUT)
    rings = {"spire": (.95, .72, .5, .3, .14), "column": (.9, .8, .7, .6), "tangle": (.98, .8, .62)}[form]
    for k, t in enumerate(rings):
        pts = blob(c, cx - Rr * .04 * k, cy - Rr * .04 * k, Rr * t, Rr * t * .96, 14, .2)
        pshadow(tm, pts, 3, 4, .55); poly(tm, pts, M[min(4, k + (0 if form != "column" else 1))])
        for j in range(3 + c.w // 2):
            a = c.rng.uniform(0, 6.28); r_ = Rr * t * .9; blk(tm, cx + math.cos(a) * r_ - 2, cy + math.sin(a) * r_ - 2, 3, light if (j + k) % 3 == 0 else M[0])
        for j in range(2 + (form == "tangle") * 2):
            a = c.rng.uniform(0, 6.28); r_ = Rr * t * .75; scrap_bit(tm, c, cx + math.cos(a) * r_, cy + math.sin(a) * r_, Rr * .12, j)
    n = 6 + c.w + (4 if form == "tangle" else 0)
    for k in range(n):                                                         # beams jutting out: the hand- and footholds
        a = c.rng.uniform(0, 6.28); r0, r1 = Rr * c.rng.uniform(.2, .5), Rr * c.rng.uniform(.75, .98)
        thick(tm, [cx + math.cos(a) * r0, cy + math.sin(a) * r0, cx + math.cos(a + .1) * r1, cy + math.sin(a + .1) * r1], M[3], 3)
    lit_ellipse(tm, cx - Rr * .1, cy - Rr * .1, Rr * .08, Rr * .08, M)
    glow(tm, cx, cy, Rr * .9, light, .3)


def wiregrass(tm, x, y, w, h, st, v):
    """Wire grass from above: a patch of ground sprouting tufts of the age's wire (WIRE) instead of grass, the strands
    springing out of each tuft in stiff fans, their ends bright, sparks jumping between them where they cross; the
    realm sets the ground. Short: a low stubble; tall: long arching blades; tangled: a snarl."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    grd, light = MACH[v.get("realm", "autochthonia")]; wire, tip = WIRE[c.e]; L = {"short": .1, "tall": .2, "tangled": .14}[v.get("length", "tall")]
    d.polygon(blob(c, cx, cy, W / 2, H / 2, 16, .1), fill=grd, outline=OUT)
    for k in range(10): blk(tm, cx + c.rng.uniform(-W * .4, W * .35), cy + c.rng.uniform(-H * .4, H * .35), 4, tone(grd, -14))
    n = 8 + c.w * 2
    for k in range(n):
        a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * .8; tx, ty = cx + math.cos(a) * W / 2 * t, cy + math.sin(a) * H / 2 * t
        d.ellipse([tx - 3, ty - 2, tx + 3, ty + 2], fill=tone(grd, -30))
        for j in range(6):
            b = c.rng.uniform(3.4, 6.0) if v.get("length") != "tangled" else c.rng.uniform(0, 6.28); Lw = min(W, H) * L * c.rng.uniform(.6, 1.1)
            ex, ey = tx + math.cos(b) * Lw, ty + math.sin(b) * Lw
            if v.get("length") == "tangled": d.arc([tx - Lw * .5, ty - Lw * .5, tx + Lw * .5, ty + Lw * .5], math.degrees(b), math.degrees(b) + 200, fill=wire, width=1)
            else: d.line([tx, ty, ex, ey], fill=wire, width=1)
            if j % 2 == 0: blk(tm, ex - 1, ey - 1, 2, tip)
        if c.e == 5: blk(tm, tx - 3, ty - 4, 2, (200, 200, 206))                  # barbs
    for k in range(3 + c.w // 2):
        sx, sy = cx + c.rng.uniform(-W * .35, W * .35), cy + c.rng.uniform(-H * .35, H * .35)
        d.line([sx - 4, sy - 3, sx, sy + 1, sx - 2, sy + 2, sx + 4, sy + 5], fill=mix(light, (255, 255, 255), .4), width=1)


CYB = {"chrome": (200, 204, 214), "black": (50, 52, 60), "white": (226, 226, 222), "military": (100, 110, 84), "flesh": (200, 160, 140)}


def cyborgremains(tm, x, y, w, h, st, v):
    """The remains of a cyborg from above: a man-sized body lying on its back, head to the north, its casing split:
    a metal skull with one lens still glowing, a ribcage frame with cables spilling out, an arm of pistons, legs of
    struts and joints, and a dark pool of coolant. Chrome, black, white, military olive or skin-covered; whole, or
    torn into scattered pieces."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0
    col = CYB[v.get("make", "chrome")]; M = rp(col, 22); scat = v.get("pose", "whole") == "scattered"; lens = (250, 60, 50) if c.w % 2 else (60, 230, 250)
    horiz = W > H; L, Wd = (W, H) if horiz else (H, W)
    def P(u, vv): return (X0 + u * W, cy + vv * H) if horiz else (cx + vv * W, Y0 + u * H)
    pool = [P(.25, -.3), P(.7, -.4), P(.75, .35), P(.3, .4)]; d.polygon(pool, fill=(30, 50, 46))
    off = .04 if scat else 0
    hx, hy = P(.1 - off, 0); lit_ellipse(tm, hx, hy, Wd * .3, Wd * .3, M); blk(tm, hx + Wd * .05, hy - 3, 4, lens)
    d.line([hx - Wd * .15, hy + 2, hx + Wd * .15, hy + 2], fill=M[0], width=1)
    a, b = P(.19, -.38), P(.5, .38); lit_rect(tm, min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]), M, r=3)
    for k in range(4):
        u = .23 + k * .065; p0, p1 = P(u, -.34), P(u, .34); d.line([p0, p1], fill=M[0], width=2)
    for k in range(4):
        p0 = P(.34, c.rng.uniform(-.1, .1)); p1 = P(.34 + c.rng.uniform(.1, .3), c.rng.uniform(-.45, .45)); d.line(curve(c, *p0, *p1, .4), fill=((200, 40, 40), (40, 90, 200), (220, 200, 40), (40, 40, 44))[k], width=2)
    for sgn in (-1, 1):
        o = sgn * (.12 if scat else 0)
        thick(tm, [P(.22, sgn * .38), P(.44 + o, sgn * .46)], M[2], 5); blk(tm, P(.42 + o, sgn * .46)[0] - 2, P(.42 + o, sgn * .46)[1] - 2, 4, M[4])
        thick(tm, [P(.5, sgn * .18), P(.72 + o, sgn * .24)], M[2], 6); lit_ellipse(tm, *P(.72 + o, sgn * .24), 5, 5, M)
        thick(tm, [P(.72 + o, sgn * .24), P(.95, sgn * .22 + o)], M[1], 5)
    if v.get("make") == "flesh":
        for k in range(3): blk(tm, P(.3 + k * .2, .1)[0], P(.3 + k * .2, .1)[1], 4, (150, 40, 40))


def powerpylon(tm, x, y, w, h, st, v):
    """A humming power pylon from above: a heavy round column on a square footing, its top a stack of insulator rings
    round a bright core, thick cables running from it across the floor, hazard stripes on the footing. On: the core
    blazes and arcs crackle from ring to ring; off: dark, a cold cap. A Tesla coil, a fusion cell or a frosted cryo
    pylon; housed in grey, yellow, black, white or orange, on a square pad, a round plinth or a finned pad. A grander place has a taller, ringed one."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    kind = v.get("kind", "tesla"); house = {"grey": (150, 154, 160), "yellow": (210, 180, 50), "black": (50, 52, 60), "white": (220, 222, 226), "orange": (220, 120, 40)}[v.get("housing", "grey")]
    core = {"tesla": (150, 200, 255), "fusion": (255, 170, 80), "cryo": (180, 250, 255)}[kind]; on = st == "on"; Hs = rp(house, 18)
    foot = v.get("footing", "square"); P_ = rp((80, 82, 90), 12)
    if foot == "round":
        lit_ellipse(tm, cx, cy, Rr * .98, Rr * .98, P_)
        for k in range(16): a = k * math.pi / 8; d.line([cx + math.cos(a) * Rr * .86, cy + math.sin(a) * Rr * .86, cx + math.cos(a) * Rr * .96, cy + math.sin(a) * Rr * .96], fill=(220, 190, 40), width=4)
    else:
        lit_rect(tm, X0, Y0, X1, Y1, P_)
        for k in range(0, int(X1 - X0), 10): d.polygon([(X0 + k, Y1 - 1), (X0 + k + 5, Y1 - 1), (X0 + k + 9, Y1 - 6), (X0 + k + 4, Y1 - 6)], fill=(220, 190, 40))
        if foot == "fins":                                    # four cooling fins out to the corners
            for sx in (-1, 1):
                for sy in (-1, 1):
                    for j in range(3): thick(tm, [cx + sx * Rr * (.55 + j * .1), cy + sy * Rr * (.75 - j * .1), cx + sx * Rr * (.75 + j * .1), cy + sy * Rr * (.95 - j * .1)], Hs[1], 3)
    for a in (.5, 2.2, 4.0):
        thick(tm, [cx + math.cos(a) * Rr * .5, cy + math.sin(a) * Rr * .5, cx + math.cos(a) * Rr * .95, cy + math.sin(a) * Rr * .95], (30, 30, 34), 4)
    rr = Rr * .7; eshadow(tm, cx, cy, rr, rr, 5, 6); lit_ellipse(tm, cx, cy, rr, rr, Hs)
    nr = 2 + (c.w >= 4) + (kind == "tesla")
    for k in range(nr):
        t = .85 - k * .17; d.ellipse([cx - rr * t, cy - rr * t, cx + rr * t, cy + rr * t], outline=(230, 230, 236) if kind != "fusion" else Hs[0], width=3)
    cr = rr * .28; d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=core if on else (40, 44, 52), outline=OUT)
    if on:
        d.ellipse([cx - cr * .5, cy - cr * .5, cx + cr * .3, cy + cr * .3], fill=(255, 255, 255))
        for k in range(4):
            a = c.rng.uniform(0, 6.28); pts = [(cx + math.cos(a) * cr, cy + math.sin(a) * cr)]
            for j in range(4): a += c.rng.uniform(-.4, .4); pts.append((cx + math.cos(a) * (cr + (j + 1) * rr * .16), cy + math.sin(a) * (cr + (j + 1) * rr * .16)))
            d.line(pts, fill=mix(core, (255, 255, 255), .5), width=1)
    if kind == "cryo":
        for k in range(6): a = c.rng.uniform(0, 6.28); blk(tm, cx + math.cos(a) * rr * .8, cy + math.sin(a) * rr * .8, 3, (236, 246, 255))
    if on: glow(tm, cx, cy, Rr * 1.4, core, .55)


def translocator(tm, x, y, w, h, st, v):
    """A translocation pad from above: a broad raised disc (or hexagon) of dark plates in rings round a glassy centre,
    emitter posts standing round its rim and a control lectern at its south edge. On: the rings and centre light up
    and a column of light fills the pad; off: dark glass and dim posts. The light is blue, amber, violet, white or
    green by its makers."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    col = {"blue": (80, 160, 255), "amber": (255, 180, 60), "violet": (190, 110, 255), "white": (230, 236, 250), "green": (90, 240, 140)}[v.get("ring", "blue")]
    on = st == "on"; P_ = rp((70, 74, 86) if v.get("deck", "dark") == "dark" else (176, 180, 186), 14); hexa = v.get("frame", "round") == "hex"
    def shape(r): return [(cx + math.cos(t) * r, cy + math.sin(t) * r) for t in np.linspace(0, 6.28, 6 if hexa else 40, endpoint=False) + (math.pi / 6 if hexa else 0)]
    pshadow(tm, shape(Rr * .96), 4, 5); poly(tm, shape(Rr * .96), P_[1])
    poly(tm, shape(Rr * .88), P_[2])
    for k, t in enumerate((.74, .56, .38)):
        poly(tm, shape(Rr * t), P_[3 - k % 2]); d.polygon(shape(Rr * t), outline=col if on else P_[0])
    for a in np.linspace(0, 6.28, 12, endpoint=False): d.line([cx + math.cos(a) * Rr * .38, cy + math.sin(a) * Rr * .38, cx + math.cos(a) * Rr * .88, cy + math.sin(a) * Rr * .88], fill=P_[0], width=1)
    d.ellipse([cx - Rr * .24, cy - Rr * .24, cx + Rr * .24, cy + Rr * .24], fill=mix(col, (255, 255, 255), .5) if on else (30, 40, 56), outline=OUT)
    npost = 4 + (c.w >= 5) * 2
    for k, a in enumerate(np.linspace(0, 6.28, npost, endpoint=False) + .4):
        px_, py_ = cx + math.cos(a) * Rr * .88, cy + math.sin(a) * Rr * .88; eshadow(tm, px_, py_, 6, 6, 3, 4); lit_ellipse(tm, px_, py_, 6, 6, rp((150, 156, 166), 18))
        blk(tm, px_ - 2, py_ - 2, 3, col if on else (40, 44, 52))
    lit_rect(tm, cx - Rr * .18, Y1 - Rr * .18, cx + Rr * .18, Y1 - 2, rp((60, 64, 74), 14)); d.rectangle([cx - Rr * .12, Y1 - Rr * .14, cx + Rr * .12, Y1 - Rr * .08], fill=col if on else (30, 34, 40))
    if on: glow(tm, cx, cy, Rr * 1.1, col, .7)


def riotfoam(tm, x, y, w, h, st, v):
    """Hardened riot foam from above: a lumpy heap of set sticky foam sprayed across a passage, bulging in rounded
    billows with a glossy skin, drips and strings round its edge, and whatever it caught stuck fast in it: a baton, a
    pair of boots, a riot shield. White, yellow, orange, grey or blue by its maker."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    col = {"white": (232, 232, 222), "yellow": (230, 206, 90), "orange": (236, 140, 60), "grey": (170, 170, 168), "blue": (120, 170, 220)}[v.get("colour", "white")]; F = rp(col, 16)
    lumps = [(cx + math.cos(a) * Rr * t, cy + math.sin(a) * Rr * t, Rr * c.rng.uniform(.3, .42)) for a, t in zip(np.linspace(0, 6.28, 9, endpoint=False) + c.rng.uniform(0, 1), c.rng.uniform(.35, .6, 9))]
    lumps += [(cx, cy, Rr * .5)]
    for px_, py_, r in lumps: eshadow(tm, px_, py_, r, r, 3, 4)
    for px_, py_, r in lumps: d.ellipse([px_ - r - 1, py_ - r - 1, px_ + r + 1, py_ + r + 1], fill=OUT)
    for px_, py_, r in sorted(lumps, key=lambda p: -(p[0] + p[1])):
        d.ellipse([px_ - r, py_ - r, px_ + r, py_ + r], fill=F[2]); d.ellipse([px_ - r * .8, py_ - r * .8, px_ + r * .4, py_ + r * .4], fill=F[3])
        blk(tm, px_ - r * .5, py_ - r * .5, 3, F[4])
    caught = v.get("trapped", "none")
    if caught == "baton": thick(tm, [cx - Rr * .5, cy + Rr * .2, cx + Rr * .3, cy - Rr * .3], (30, 30, 34), 4)
    elif caught == "boots":
        for sx in (-1, 1): lit_rect(tm, cx + sx * Rr * .2 - 5, cy - 8, cx + sx * Rr * .2 + 5, cy + 8, rp((40, 36, 34), 12), r=3)
    elif caught == "shield": lit_rect(tm, cx - Rr * .3, cy - Rr * .4, cx + Rr * .3, cy + Rr * .4, rp((150, 170, 190), 18), r=4); d.rectangle([cx - Rr * .25, cy - Rr * .05, cx + Rr * .25, cy + Rr * .05], fill=(30, 30, 36))
    for k in range(6): a = c.rng.uniform(0, 6.28); d.line([cx + math.cos(a) * Rr * .8, cy + math.sin(a) * Rr * .8, cx + math.cos(a) * Rr * .97, cy + math.sin(a) * Rr * .97], fill=F[1], width=2)


VSHIP = [None, None, None, None,
         dict(body=(110, 66, 40), trim=(200, 160, 70), dark=(40, 30, 26), glass=(220, 200, 140)),     # Victorian: mahogany and brass, ether lamps
         dict(body=(110, 116, 110), trim=(80, 84, 80), dark=(40, 42, 40), glass=(230, 220, 160)),     # Great War: riveted grey steel
         dict(body=(200, 204, 210), trim=(170, 40, 40), dark=(50, 50, 54), glass=(110, 230, 140)),    # Mid-Century: chrome and red, green scopes
         dict(body=(170, 172, 168), trim=(60, 64, 70), dark=(40, 42, 48), glass=(110, 200, 250)),     # Modern: grey panels, screens
         dict(body=(52, 56, 66), trim=(80, 84, 96), dark=(24, 26, 32), glass=(90, 240, 250))]         # Future Darkness: dark composite, lit edges
TRIM = {"brass": (200, 160, 70), "steel": (150, 156, 166), "black": (40, 40, 46), "white": (226, 226, 222), "red": (180, 50, 44)}


def _helm(tm, d, e, mx, X0, Y0, W, H, T_, B, gl, on, sc):
    """The steering control of a voidship console at mx, in the age's making: a ship's wheel (Victorian), a row of
    toggles and a crank (Great War), a yoke (Mid-Century), a keyboard (Modern), a lit touch ring (Future Darkness)."""
    if e == 4:
        r = H * .2 * sc; d.ellipse([mx - r, Y0 + H * .6 - r, mx + r, Y0 + H * .6 + r], outline=T_[2], width=3)
        for a in np.linspace(0, 6.28, 9)[:-1]: d.line([mx, Y0 + H * .6, mx + math.cos(a) * r * 1.3, Y0 + H * .6 + math.sin(a) * r * 1.3], fill=B[1], width=2)
    elif e == 5:
        n = 8 if sc == 1 else 3
        for k in range(n): blk(tm, mx + (k - (n - 1) / 2) * W * .07 - 1, Y0 + H * .42, 3, (230, 230, 220) if (k + on) % 2 else (40, 40, 40))
        lit_rect(tm, mx - 8 * sc, Y0 + H * .55, mx + 8 * sc, Y0 + H * .75, T_)
    elif e == 6:
        thick(tm, [mx - H * .25 * sc, Y0 + H * .6, mx + H * .25 * sc, Y0 + H * .6], T_[2], 4); thick(tm, [mx, Y0 + H * .45, mx, Y0 + H * .6], B[1], 3)
    elif e == 8:                                                         # a lit touch ring
        r = H * .2 * sc; d.ellipse([mx - r, Y0 + H * .6 - r, mx + r, Y0 + H * .6 + r], fill=(34, 36, 44), outline=gl if on else T_[2], width=3)
    else:
        lit_rect(tm, mx - W * .14 * sc, Y0 + H * .4, mx + W * .14 * sc, Y0 + H * .55, rp((60, 62, 70) if e == 7 else (34, 36, 44), 10))
        n = 8 if sc == 1 else 4
        for k in range(n): blk(tm, mx + (k - (n - 1) / 2) * W * .03 - 1, Y0 + H * .45, 2, (200, 200, 206) if e == 7 else (gl if on else (60, 64, 70)))


def voidshipconsole(tm, x, y, w, h, st, v):
    """A voidship helm console from above, its back to the hull wall (north) and its operator's side to the south:
    a long curved desk of the age's making with its instruments: brass dials, a ship's wheel and a speaking tube on
    mahogany (Victorian ether ships), toggle switches and round gauges on riveted steel (Great War), round green
    scopes, chrome and a steering yoke (Mid-Century), flat screens, a keyboard and a joystick (Modern), dark glass
    panes and lit touch strips (Future Darkness); helm, navigation or drive station. On: the dials and screens lit;
    off: dark. A grander ship has more of everything."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0
    S = VSHIP[max(4, c.e)]; e = max(4, c.e); tr = TRIM[v.get("trim", "brass")]; B = rp(mix(S["body"], tr, .45), 18); T_ = rp(tr, 20); on = st == "on"
    lay = v.get("layout", "helm"); gl = S["glass"] if on else tone(S["dark"], 10)
    pts = [(X0, Y0), (X1, Y0), (X1, Y0 + H * .55)] + [(X1 - W * t, Y0 + H * (.55 + .4 * math.sin(math.pi * t))) for t in np.linspace(0, 1, 12)] + [(X0, Y0 + H * .55)]
    pshadow(tm, pts, 4, 5); poly(tm, pts, B[2])
    d.line(pts[2:-1], fill=T_[2], width=3)                                             # the trim along the operator's edge
    lit_rect(tm, X0 + 3, Y0 + 3, X1 - 3, Y0 + H * .3, rp(S["dark"], 12))                # the instrument face
    n = 4 + (c.w >= 5) * 2
    for k in range(n):
        gx = X0 + W * (k + .5) / n
        if e == 4 or e == 5:
            lit_ellipse(tm, gx, Y0 + H * .16, H * .1, H * .1, rp(tr if e == 4 else (150, 150, 156), 18)); d.ellipse([gx - H * .07, Y0 + H * .09, gx + H * .07, Y0 + H * .23], fill=gl)
            d.line([gx, Y0 + H * .16, gx + H * .05, Y0 + H * .11], fill=OUT, width=1)
        elif e == 6:
            d.ellipse([gx - H * .1, Y0 + H * .06, gx + H * .1, Y0 + H * .26], fill=(30, 40, 34), outline=T_[3], width=2)
            if on: d.line([gx - H * .08, Y0 + H * .16, gx - H * .02, Y0 + H * .1, gx + H * .03, Y0 + H * .2, gx + H * .08, Y0 + H * .14], fill=gl, width=1)
        else:
            d.rectangle([gx - W / n * .4, Y0 + H * .06, gx + W / n * .4, Y0 + H * .26], fill=gl, outline=T_[1] if e == 7 else S["dark"])
            if on: d.line([gx - W / n * .3, Y0 + H * .2, gx + W / n * .2, Y0 + H * .2], fill=tone(gl, -60), width=1)
    # the controls at the operator's edge, laid out evenly about the middle: the helm itself (one wheel or yoke in the
    # middle), a navigator's chart in the middle between two small control sets, or the drive levers in two banks either side of a throttle quadrant
    if lay == "nav":
        ch = rp((40, 60, 90) if e >= 7 else (210, 200, 160), 14); lit_rect(tm, cx - W * .17, Y0 + H * .38, cx + W * .17, Y0 + H * .74, ch)
        for k in range(5): blk(tm, cx + W * (-.12 + .06 * k), Y0 + H * (.46 + .06 * (k % 2)), 2, (250, 250, 220) if e >= 7 else (60, 50, 40))
        d.line([cx - W * .14, Y0 + H * .66, cx + W * .14, Y0 + H * .46], fill=(220, 60, 50), width=1)
        spots = (cx - W * .33, cx + W * .33)
    elif lay == "drive":
        for sx in (-1, 1):
            for k in range(4):
                lx = cx + sx * W * (.12 + .06 * k)
                thick(tm, [lx, Y0 + H * .66, lx, Y0 + H * (.42 + .06 * (k % 2))], T_[3], 3); blk(tm, lx - 2, Y0 + H * (.42 + .06 * (k % 2)) - 2, 4, (200, 40, 40) if k % 2 else (230, 230, 230))
        lit_rect(tm, cx - W * .07, Y0 + H * .36, cx + W * .07, Y0 + H * .8, T_)          # the throttle quadrant
        spots = ()
    else: spots = (cx,)
    sc = 1 if len(spots) == 1 else .6
    for mx in spots: _helm(tm, d, e, mx, X0, Y0, W, H, T_, B, gl, on, sc)
    for sx in (-1, 1):
        if e == 4: lit_ellipse(tm, cx + sx * W * .42, Y0 + H * .5, 5, 5, T_)            # speaking tubes
        elif e == 6:
            for k in range(3): blk(tm, cx + sx * W * (.3 + .05 * k), Y0 + H * .44, 3, (240, 60, 50) if on and k % 2 else (90, 90, 96))
        elif e >= 7: lit_ellipse(tm, cx + sx * W * .42, Y0 + H * .55, 5, 5, rp((40, 40, 46), 14))
    if e == 8 and on: d.line([X0 + W * .1, Y0 + H * .35, X1 - W * .1, Y0 + H * .35], fill=gl, width=2)
    if on: glow(tm, cx, Y0 + H * .2, W * .45, S["glass"], .4)


def voidshipseat(tm, x, y, w, h, st, v):
    """A voidship crash couch from above: a long reclined seat for a body lying on its back, head to the north, a
    padded headrest with side wings, a deep body pan with raised side bolsters, a leg rest, and a harness over it:
    two shoulder straps crossing to a buckle, or five straps to a round quick-release, or a padded bar, with armrests
    carrying a control grip. The age's making: buttoned leather on a brass frame (Victorian ether ships), canvas on a
    steel frame (Great War), white vinyl and chrome (Mid-Century), grey padded nylon with orange straps (Modern),
    black gel-pad on a dark shell (Future Darkness)."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; e = max(4, c.e)
    pad = {4: (110, 50, 34), 5: (150, 140, 100), 6: (226, 222, 210), 7: (120, 124, 130), 8: (36, 38, 44)}[e]
    pad = mix(pad, {"red": (170, 40, 40), "blue": (40, 70, 150), "green": (60, 110, 70), "black": (36, 36, 40), "tan": (190, 150, 96)}[v.get("cover", "tan")], .6)
    frm = {4: (200, 160, 70), 5: (110, 114, 110), 6: (210, 214, 220), 7: (80, 84, 90), 8: (60, 64, 76)}[e]
    strap = {4: (70, 40, 26), 5: (140, 130, 90), 6: (60, 60, 64), 7: (240, 130, 40), 8: (80, 240, 240)}[e]
    frm = mix(frm, {"light": (236, 236, 232), "dark": (30, 30, 36)}[v.get("shell", "light")], .45)
    Pd = rp(pad, 18); Fr = rp(frm, 20)
    lit_rect(tm, X0, Y0 + H * .02, X1, Y1, Fr, r=6)                                       # the frame
    lit_rect(tm, X0 + W * .2, Y0 + H * .04, X1 - W * .2, Y0 + H * .18, Pd, r=6)          # headrest
    for sx in (X0 + W * .1, X1 - W * .22): lit_rect(tm, sx, Y0 + H * .06, sx + W * .12, Y0 + H * .16, Pd, r=3)
    lit_rect(tm, X0 + W * .1, Y0 + H * .2, X1 - W * .1, Y0 + H * .66, Pd, r=5)           # back and seat pan
    for sx in (X0 + W * .1, X1 - W * .22): lit_rect(tm, sx, Y0 + H * .22, sx + W * .12, Y0 + H * .64, rp(tone(pad, 16), 16), r=4)   # bolsters
    lit_rect(tm, X0 + W * .16, Y0 + H * .68, X1 - W * .16, Y1 - H * .03, Pd, r=5)        # leg rest
    if e == 4:
        for gy in np.arange(Y0 + H * .26, Y0 + H * .62, H * .08):
            for gx in (cx - W * .12, cx + W * .12): blk(tm, gx - 1, gy - 1, 2, Pd[0])
    else:
        for gy in np.arange(Y0 + H * .3, Y0 + H * .64, H * .1): d.line([X0 + W * .24, gy, X1 - W * .24, gy], fill=Pd[1], width=1)
    harness = v.get("harness", "five"); bx, by = cx, Y0 + H * .5
    if harness == "bar":
        lit_rect(tm, X0 + W * .06, Y0 + H * .36, X1 - W * .06, Y0 + H * .44, rp(frm, 16), r=4)
    else:
        sw = max(3, int(W * .08))
        for sx in (-1, 1): thick(tm, [cx + sx * W * .2, Y0 + H * .2, bx - sx * 2, by], strap, sw)
        if harness == "five":
            for sx in (-1, 1): thick(tm, [cx + sx * W * .3, Y0 + H * .62, bx, by], strap, sw)
            thick(tm, [cx, Y0 + H * .7, bx, by], strap, sw)
            lit_ellipse(tm, bx, by, W * .09, W * .09, rp((200, 204, 210), 20))
        else: lit_rect(tm, bx - W * .08, by - 4, bx + W * .08, by + 4, rp((200, 204, 210), 20))
    for sx in (X0 + 1, X1 - W * .1): lit_rect(tm, sx, Y0 + H * .3, sx + W * .09, Y0 + H * .55, Fr, r=2); lit_ellipse(tm, sx + W * .045, Y0 + H * .5, W * .04, W * .04, rp((40, 40, 46), 12))
    if c.w >= 5:                                                                      # a captain's couch: control pads on both arms
        for sx in (X0 + 1, X1 - W * .1): d.rectangle([sx + 2, Y0 + H * .32, sx + W * .09 - 2, Y0 + H * .42], fill=VSHIP[e]["glass"], outline=OUT)


def voidshipdrive(tm, x, y, w, h, st, v):
    """A voidship drive from above: the engine of the age's void craft, seen from inside the engine room with its
    exhaust to the south: a brass ether engine of spheres and coils on a mahogany bed (Victorian), a riveted steel
    turbine drum (Great War), a ribbed rocket motor bell with its pumps (Mid-Century), a grey ion thruster with its
    grid face (Modern), a dark fusion torus wound with magnets (Future Darkness), as one great nozzle, a ring or a
    cluster of small ones, with its feed pipes and housing. On: the core and nozzles glowing white-hot to blue, the
    heat thrown round; off: cold metal."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2; e = max(4, c.e)
    S = VSHIP[e]; fin = TRIM[v.get("finish", "steel")]; Hs = rp(mix(S["body"], fin, .55), 18); on = st == "on"
    kind = v.get("kind", "nozzle"); hot = {4: (250, 200, 120), 5: (250, 170, 90), 6: (255, 150, 60), 7: (120, 180, 255), 8: (160, 120, 255)}[e]
    lit_rect(tm, X0, Y0, X1, Y1, rp(S["dark"], 10), r=4)                                  # the bed plate
    for k in range(3):                                                                    # feed pipes from the north
        px_ = X0 + Rr * (.5 + k * .5); thick(tm, [px_, Y0 + 2, px_, Y0 + Rr * .5], Hs[3] if e != 4 else rp(S["trim"], 18)[2], 5)
    noz = {"nozzle": [(cx, cy + Rr * .05, Rr * .7)], "ring": [(cx, cy + Rr * .05, Rr * .78)],
           "cluster": [(cx + dx * Rr * .4, cy + dy * Rr * .4, Rr * .36) for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1))]}[kind]
    for px_, py_, r in noz:
        eshadow(tm, px_, py_, r, r, 4, 5)
        if e == 4:
            Bz = rp(mix(S["trim"], fin, .5), 20); lit_ellipse(tm, px_, py_, r, r, Bz)
            for t in (.8, .6): d.ellipse([px_ - r * t, py_ - r * t, px_ + r * t, py_ + r * t], outline=Bz[0], width=2)
            for a in np.linspace(0, 6.28, 5)[:-1]: lit_ellipse(tm, px_ + math.cos(a) * r * .55, py_ + math.sin(a) * r * .55, r * .14, r * .14, rp((220, 220, 230), 16))
        elif e == 5:
            lit_ellipse(tm, px_, py_, r, r, Hs)
            for a in np.linspace(0, 6.28, 17)[:-1]: blk(tm, px_ + math.cos(a) * r * .88 - 1, py_ + math.sin(a) * r * .88 - 1, 2, Hs[4])
            for a in np.linspace(0, 6.28, 9)[:-1]: d.line([px_, py_, px_ + math.cos(a) * r * .6, py_ + math.sin(a) * r * .6], fill=Hs[0], width=2)
        elif e == 6:
            lit_ellipse(tm, px_, py_, r, r, Hs)
            for t in np.linspace(.9, .4, 5): d.ellipse([px_ - r * t, py_ - r * t, px_ + r * t, py_ + r * t], outline=Hs[0 if t > .6 else 1], width=1)
        elif e == 7:
            lit_ellipse(tm, px_, py_, r, r, Hs)
            for gx in np.arange(px_ - r * .6, px_ + r * .6, 6): d.line([gx, py_ - r * .55, gx, py_ + r * .55], fill=Hs[0], width=1)
            for gy in np.arange(py_ - r * .6, py_ + r * .6, 6): d.line([px_ - r * .55, gy, px_ + r * .55, gy], fill=Hs[0], width=1)
        else:
            lit_ellipse(tm, px_, py_, r, r, Hs)
            for a in np.linspace(0, 6.28, 13)[:-1]: lit_rect(tm, px_ + math.cos(a) * r * .8 - 3, py_ + math.sin(a) * r * .8 - 3, px_ + math.cos(a) * r * .8 + 3, py_ + math.sin(a) * r * .8 + 3, rp((80, 84, 100), 14))
        cr = r * (.42 if kind != "ring" else .55)
        d.ellipse([px_ - cr, py_ - cr, px_ + cr, py_ + cr], fill=(hot if on else (26, 26, 30)), outline=OUT)
        if kind == "ring": d.ellipse([px_ - cr * .6, py_ - cr * .6, px_ + cr * .6, py_ + cr * .6], fill=Hs[1], outline=OUT)
        if on: d.ellipse([px_ - cr * .45, py_ - cr * .45, px_ + cr * .3, py_ + cr * .3], fill=mix(hot, (255, 255, 255), .6))
    if on:
        glow(tm, cx, cy, Rr * 1.3, hot, .6); tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, Rr * 1.2, None)]


# ================================================================ the Dreaming
DREAM = {"far-dreaming": ((150, 110, 210), (250, 200, 120)),      # leaf, fruit: lavender leaves, honey-gold glass
         "deep-dreaming": ((40, 60, 140), (250, 240, 160)),       # night blue, star gold
         "arcadia": ((210, 180, 70), (250, 120, 160)),            # gold leaves, rose glass
         "summer-country": ((80, 170, 90), (240, 250, 255)),      # summer green, clear glass
         "dream-zone": ((230, 90, 200), (90, 240, 250))}          # a dreamer's own neon


def chimericaltree(tm, x, y, w, h, st, v):
    """A chimerical tree with glass fruit from above: a broad crown of leaf bundles in impossible colours (lavender
    in the Far Dreaming, night blue in the Deep Dreaming, gold by the gates of Arcadia, deep green in the Summer
    Country, a dreamer's neon in a Dream Zone), hung with round glass fruit that catch the light, a few fallen and
    shining in the grass beneath, and a ring of glimmer round the trunk. The age's glamour colours it (banality):
    bright in the Dark Ages, frosted grey through the Long Night and the banal centuries, bright again from
    the Resurgence. Apples, pears or star fruit; a young tree is small, an old one vast."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    leaf, fruit = DREAM[v.get("realm", "far-dreaming")]; L = rp(leaf, 20); Fr = rp(fruit, 24); kind = v.get("fruit", "apple")
    before = np.asarray(tm.img).astype(np.int16)
    d.ellipse([cx - Rr, cy - Rr, cx + Rr, cy + Rr], fill=mix(leaf, (60, 90, 60), .6), outline=None)
    r = Rr * .86 * min(1, c.big + .02); n = 9 + c.w
    lumps = [(cx, cy, r * .55)] + [(cx + math.cos(a) * r * .55, cy + math.sin(a) * r * .55, r * c.rng.uniform(.34, .44)) for a in np.linspace(0, 6.28, n, endpoint=False) + c.rng.uniform(0, 1)]
    for px_, py_, q in lumps: d.ellipse([px_ - q - 2, py_ - q - 2, px_ + q + 2, py_ + q + 2], fill=OUT)
    tm.rng = np.random.default_rng(int(c.rng.integers(1, 1 << 30))); tm.canopy(lumps, cx, cy, r, L, size=5)
    nf = 8 + c.w * 3
    for k in range(nf):
        a = c.rng.uniform(0, 6.28); t = math.sqrt(c.rng.uniform(.05, 1)) * r * .85; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t
        if kind == "pear": lit_ellipse(tm, px_, py_, 4, 5, Fr, out=Fr[0])
        elif kind == "star":
            poly(tm, [(px_ + math.cos(b) * (6 if j % 2 == 0 else 2.5), py_ + math.sin(b) * (6 if j % 2 == 0 else 2.5)) for j, b in enumerate(np.linspace(-1.57, 4.71, 10, endpoint=False))], Fr[2], out=Fr[0])
        else: lit_ellipse(tm, px_, py_, 5, 5, Fr, out=Fr[0])
        blk(tm, px_ - 2, py_ - 2, 2, (255, 255, 255))
    for k in range(3 + c.w // 2):
        a = c.rng.uniform(0, 6.28); px_, py_ = cx + math.cos(a) * Rr * .93, cy + math.sin(a) * Rr * .93
        lit_ellipse(tm, px_, py_, 4, 4, Fr, out=Fr[0])
    banality(tm, c, before)
    if GLAM[c.e] > .6: glow(tm, cx, cy, Rr * 1.1, fruit, .25 * GLAM[c.e])


def chimericalbloom(tm, x, y, w, h, st, v):
    """Chimerical flowers from above: a clump of impossible blooms, bell flowers glowing from inside, star flowers of
    frosted glass, golden reeds and whisking feather-heads, on a bed of bright leaves, a few motes of glimmer drifting
    off. The realm sets their colours; the age's glamour brightens or greys them (banality). A rich patch is thick
    with blooms."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    leaf, fruit = DREAM[v.get("realm", "far-dreaming")]; L = rp(leaf, 18); Fl = rp(fruit, 24); kind = v.get("bloom", "bells")
    before = np.asarray(tm.img).astype(np.int16)
    for k in range(12 + c.w * 2):
        a = c.rng.uniform(0, 6.28); t = math.sqrt(c.rng.uniform(0, 1)) * Rr * .75; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t
        pts = petal(px_, py_, c.rng.uniform(0, 6.28), Rr * .4, Rr * .16); poly(tm, pts, L[1 + k % 3])
    n = 5 + c.w
    for k in range(n):
        a = c.rng.uniform(0, 6.28); t = math.sqrt(c.rng.uniform(0, 1)) * Rr * .62; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t; q = Rr * c.rng.uniform(.14, .2)
        if kind == "bells":
            eshadow(tm, px_, py_, q, q, 2, 3); lit_ellipse(tm, px_, py_, q, q, Fl, out=Fl[0]); d.ellipse([px_ - q * .4, py_ - q * .4, px_ + q * .4, py_ + q * .4], fill=(255, 250, 220))
        elif kind == "stars":
            poly(tm, [(px_ + math.cos(b) * (q * 1.2 if j % 2 == 0 else q * .45), py_ + math.sin(b) * (q * 1.2 if j % 2 == 0 else q * .45)) for j, b in enumerate(np.linspace(-1.57, 4.71, 10, endpoint=False))], Fl[3], out=Fl[0])
            blk(tm, px_ - 2, py_ - 2, 3, Fl[4])
        else:
            thick(tm, [px_, py_, px_ + q * 1.4, py_ - q * 1.4], (230, 200, 90), 2)
            for b in np.linspace(0, 6.28, 7)[:-1]: d.line([px_ + q * 1.4, py_ - q * 1.4, px_ + q * 1.4 + math.cos(b) * q * .7, py_ - q * 1.4 + math.sin(b) * q * .7], fill=Fl[4], width=1)
    for k in range(4): a = c.rng.uniform(0, 6.28); blk(tm, cx + math.cos(a) * Rr * .85, cy + math.sin(a) * Rr * .85, 2, (255, 250, 210))
    banality(tm, c, before)


# the sweets each age's children dream of, as a boulder: honeycomb (Dark Ages), barley sugar (Long Night), white
# sugar plate (Renaissance), sugared comfits (Age of Reason), striped seaside rock (Victorian), boiled sweets (Great
# War), rock candy crystal on its stick (Mid-Century), neon gummy (Modern), glowing synthetic sugar glass (Future)
CANDY = [((214, 160, 60), (240, 200, 110)), ((200, 130, 50), (236, 180, 90)), ((236, 230, 220), (200, 180, 200)), ((230, 200, 210), (170, 210, 160)),
         ((236, 90, 120), (250, 246, 240)), ((190, 50, 60), (240, 180, 60)), ((150, 200, 240), (250, 250, 255)), ((90, 230, 90), (250, 80, 200)), ((120, 90, 250), (90, 250, 240))]


def sweetrock(tm, x, y, w, h, st, v):
    """A boulder of rock candy from above: a great faceted lump of sugar with flat glassy faces lit toward the
    north-west, each facet a different shade, glittering sugar crystals on it and a scatter of broken candy at its
    foot. The candy is the age's (CANDY), tinted by the dreamer's favourite colour; it stands in a puddle of melt where
    the Dream Zone is warm. A boulder, a cluster of smaller ones or a heap of rubble; a strong dream makes a bigger
    one. The age's glamour brightens or greys it."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    a_, b_ = CANDY[c.e]; tint = {"plain": None, "pink": (250, 140, 190), "blue": (120, 170, 250), "green": (140, 230, 140), "gold": (250, 210, 90)}[v.get("tint", "plain")]
    if tint: a_ = mix(a_, tint, .45)
    A = rp(a_, 26); B = rp(b_, 22); form = v.get("form", "boulder")
    before = np.asarray(tm.img).astype(np.int16)
    d.polygon(blob(c, cx + 3, cy + 4, Rr * .98, Rr * .9, 14, .1), fill=mix(a_, (120, 80, 60), .5), outline=None)   # the puddle of melt
    rocks = {"boulder": [(cx, cy, Rr * .8)], "cluster": [(cx - Rr * .3, cy - Rr * .25, Rr * .5), (cx + Rr * .38, cy - Rr * .1, Rr * .42), (cx - Rr * .05, cy + Rr * .4, Rr * .4)],
             "rubble": [(cx + math.cos(t) * Rr * .5, cy + math.sin(t) * Rr * .5, Rr * .3) for t in np.linspace(0, 6.28, 6, endpoint=False)] + [(cx, cy, Rr * .35)]}[form]
    for px_, py_, r in rocks:
        r *= min(1, c.big + .05); pts = [(px_ + math.cos(t) * r * c.rng.uniform(.82, 1), py_ + math.sin(t) * r * c.rng.uniform(.82, 1)) for t in np.linspace(0, 6.28, 7, endpoint=False) + c.rng.uniform(0, 1)]
        pshadow(tm, pts, 4, 5); poly(tm, pts, A[1])
        top = (px_ - r * .15, py_ - r * .18)
        for i in range(len(pts)):
            p1, p2 = pts[i], pts[(i + 1) % len(pts)]; ang = math.atan2((p1[1] + p2[1]) / 2 - py_, (p1[0] + p2[0]) / 2 - px_)
            k = 4 if -2.6 < ang < -1.0 else 3 if -3.3 < ang < -.3 else 0 if .4 < ang < 2.4 else 2
            d.polygon([p1, p2, top], fill=A[k] if i % 2 else mix(A[k], B[2], .4)); d.line([p1, top], fill=A[min(4, k + 1)], width=1)
        if c.e == 4:                                                      # the rock's stripes
            for j in range(3): d.line([px_ - r * .6, py_ - r * .5 + j * r * .4, px_ + r * .6, py_ - r * .3 + j * r * .4], fill=B[3], width=3)
        if c.e == 6: thick(tm, [px_, py_, px_ + r * .5, py_ + r * .9], (230, 220, 200), 2)
        for k in range(3): blk(tm, px_ + c.rng.uniform(-r * .5, r * .3), py_ + c.rng.uniform(-r * .5, r * .3), 2, (255, 255, 255))
    for k in range(5 + c.w):
        a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.75, .95) * Rr; px_, py_ = cx + math.cos(a) * t, cy + math.sin(a) * t
        poly(tm, [(px_ - 3, py_ - 2), (px_ + 3, py_ - 3), (px_ + 2, py_ + 3)], B[3], out=A[0])
    banality(tm, c, before)


def sweetpool(tm, x, y, w, h, st, v):
    """A pool of molten chocolate from above: a broad glossy pool of the sweet the age's children dream of: molten
    honey with comb floating (Dark Ages and Long Night), dark treacle (Renaissance), frothed drinking chocolate
    (Age of Reason), each in a dark or a pale run, and from the Victorian age on chocolate, milk, dark or white, with cream swirled through it; a rim
    of biscuit, wafer or caramel crust round it and sweets floating. Deep: dark and still; shallow: lighter, with
    the bottom showing. The age's glamour brightens or greys it."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    e = c.e; kind = v.get("kind", "milk")
    liquid = (230, 170, 50) if e <= 1 else (60, 36, 24) if e == 2 else (130, 80, 50) if e == 3 else {"milk": (130, 80, 50), "dark": (70, 40, 28), "white": (236, 222, 190)}[kind]
    if e <= 3: liquid = mix(liquid, {"milk": liquid, "dark": (40, 24, 16), "white": (244, 232, 204)}[kind], .55)   # a dark or pale run of it
    rim = {"biscuit": (200, 150, 90), "wafer": (220, 190, 130), "caramel": (190, 110, 40)}[v.get("rim", "biscuit")]
    deep = v.get("depth", "deep") == "deep"; Lq = rp(liquid if deep else mix(liquid, (240, 220, 200), .25), 18); Rm = rp(rim, 18)
    before = np.asarray(tm.img).astype(np.int16)
    pts = blob(c, cx, cy, W / 2, H / 2, 18, .08); poly(tm, pts, Rm[2])
    for k in range(16):
        a = k * .39; d.line([cx + math.cos(a) * W * .42, cy + math.sin(a) * H * .42, cx + math.cos(a) * W * .49, cy + math.sin(a) * H * .48], fill=Rm[0], width=1)
        if v.get("rim") == "wafer": d.line([cx + math.cos(a + .2) * W * .44, cy + math.sin(a + .2) * H * .43, cx + math.cos(a + .2) * W * .48, cy + math.sin(a + .2) * H * .47], fill=Rm[4], width=1)
    inner = blob(c, cx, cy, W * .41, H * .4, 16, .08); poly(tm, inner, Lq[1], out=Rm[0])
    d.polygon([(cx + (a - cx) * .85 - 3, cy + (b - cy) * .85 - 3) for a, b in inner], fill=Lq[2])
    for k in range(4):                                                    # swirls of cream through it, slow ripples
        r = W * (.08 + k * .06); d.arc([cx - r, cy - r * .6, cx + r, cy + r * .6], 200 + k * 40, 330 + k * 40, fill=Lq[4] if e >= 4 else Lq[3], width=2)
    if e <= 1:
        for k in range(3): px_, py_ = cx + c.rng.uniform(-W * .25, W * .2), cy + c.rng.uniform(-H * .25, H * .2); hexa = [(px_ + math.cos(t) * 6, py_ + math.sin(t) * 6) for t in np.linspace(0, 6.28, 6, endpoint=False)]; poly(tm, hexa, (240, 200, 90))
    if e >= 4 and kind != "white": d.line([(cx - W * .3 + t * W * .6, cy + math.sin(t * 9) * H * .08) for t in np.linspace(0, 1, 14)], fill=(240, 230, 210), width=2)
    for k in range(2 + c.w // 2):
        px_, py_ = cx + c.rng.uniform(-W * .3, W * .3), cy + c.rng.uniform(-H * .25, H * .25); col = CANDY[e][k % 2]
        lit_ellipse(tm, px_, py_, 5, 4, rp(col, 20))
    d.ellipse([cx - W * .2, cy - H * .2, cx - W * .1, cy - H * .14], fill=Lq[4])
    banality(tm, c, before)


# ================================================================ realm stones and the primal world
HEART = {"aetherial": ((170, 200, 240), (250, 252, 255)), "legendary": ((220, 170, 60), (255, 236, 160)),
         "horizon": ((150, 110, 230), (240, 220, 255)), "summer-country": ((90, 200, 110), (230, 255, 220))}


def _gem(tm, d, cx, cy, r, n, sy, G, core, lit):
    """A faceted gem of n sides from above, stretched sy north to south, lit from the north-west, its core burning."""
    off = math.pi / n; pts = [(cx + math.cos(t) * r, cy + math.sin(t) * r * sy) for t in np.linspace(0, 6.28, n, endpoint=False) + off - math.pi / 2]
    pshadow(tm, pts, 5, 6); poly(tm, pts, G[1], out=G[0])
    for i in range(n):
        p1, p2 = pts[i], pts[(i + 1) % n]; ang = math.atan2((p1[1] + p2[1]) / 2 - cy, (p1[0] + p2[0]) / 2 - cx)
        k = 4 if -2.6 < ang < -1.0 else 3 if -3.3 < ang < -.3 else 0 if .4 < ang < 2.4 else 2
        d.polygon([p1, p2, (cx - r * .1, cy - r * .1)], fill=G[k])
    d.polygon([(cx + math.cos(t) * r * .4 - r * .1, cy + math.sin(t) * r * .44 * sy - r * .1) for t in np.linspace(0, 6.28, n, endpoint=False) + off - math.pi / 2], fill=core if lit else G[2])


def realmheart(tm, x, y, w, h, st, v):
    """The heart-stone of a realm from above: a great faceted gem set in a ring of stone or roots at the realm's
    heart, its facets bright toward the light and its core burning, rune marks cut in a circle round it on the ground,
    and an offering the age's visitors left at the ring. Sky blue in the Aetherial realms, gold in a Legendary realm,
    violet in a Horizon realm, green in the Summer Country; set in stone, in roots or floating over a pool; cut round, grown tall or in a cluster with lesser gems. Lit: it
    pulses and throws its colour wide; out: dim, the realm failing."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    col, core = HEART[v.get("realm", "aetherial")]; lit = st == "lit"; G = rp(col if lit else mix(col, (60, 60, 70), .55), 26); seat = v.get("seat", "stone")
    ground = {"stone": (150, 146, 136), "roots": (90, 70, 50), "pool": (50, 90, 130)}[seat]
    d.ellipse([cx - Rr, cy - Rr, cx + Rr, cy + Rr], fill=ground, outline=OUT)
    for k, a in enumerate(np.linspace(0, 6.28, 12, endpoint=False)):              # the rune ring
        px_, py_ = cx + math.cos(a) * Rr * .72, cy + math.sin(a) * Rr * .72
        d.line([px_ - 3, py_ - 3, px_ + 3, py_ + 3] if k % 2 else [px_ - 3, py_ + 3, px_, py_ - 3, px_ + 3, py_ + 3], fill=core if lit else tone(ground, -40), width=1)
    if seat == "roots":
        for a in np.linspace(0, 6.28, 7, endpoint=False): thick(tm, curve(c, cx, cy, cx + math.cos(a) * Rr * .75, cy + math.sin(a) * Rr * .75, .3), (110, 84, 60), 5)
    elif seat == "stone":
        for a in np.linspace(0, 6.28, 8, endpoint=False): lit_rect(tm, cx + math.cos(a) * Rr * .55 - 5, cy + math.sin(a) * Rr * .55 - 5, cx + math.cos(a) * Rr * .55 + 5, cy + math.sin(a) * Rr * .55 + 5, rp((170, 166, 156), 14))
    else:
        for k in (1, 2): d.ellipse([cx - Rr * .3 * k, cy - Rr * .25 * k, cx + Rr * .3 * k, cy + Rr * .25 * k], outline=(140, 180, 220), width=1)
    cut = v.get("cut", "round"); r = Rr * (.3 + .025 * c.w)
    if cut == "cluster":                                                        # lesser gems grown round the heart
        for a in (-1.57, .52, 2.62): _gem(tm, d, cx + math.cos(a) * r * 1.25, cy + math.sin(a) * r * 1.25, r * .45, 5, 1, G, core, lit)
    _gem(tm, d, cx, cy, r, {"round": 8, "tall": 6, "cluster": 5}[cut], 1.6 if cut == "tall" else 1.1, G, core, lit)
    keepers(tm, c, cx, cy, Rr * .9, Rr * .9, 10)
    if lit: glow(tm, cx, cy, Rr * 1.5, core if seat != "pool" else col, .6)


def moonbridgestone(tm, x, y, w, h, st, v):
    """A moon bridge stone from above: a rounded standing stone at a caern or a realm's edge, its top cut with a
    crescent and the glyph of the bridge's end, pale silver lichen on it, a ring of small stones round its foot and
    an offering the age's visitors left. Lit: the bridge is open and silver moonlight streams from the crescent along
    the ground; out: dark stone. Grey granite, white quartz, black basalt or red sandstone."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); Rr = min(X1 - X0, Y1 - Y0) / 2
    stone = {"granite": (140, 140, 136), "quartz": (220, 218, 210), "basalt": (60, 60, 68), "sandstone": (180, 110, 80)}[v.get("stone", "granite")]
    S = rp(stone, 18); lit = st == "lit"; ground = {"wolfhome": (70, 100, 60), "caern": (90, 110, 70), "aetherial": (150, 170, 200), "legendary": (120, 140, 80)}[v.get("realm", "caern")]
    d.ellipse([cx - Rr, cy - Rr, cx + Rr, cy + Rr], fill=ground, outline=OUT)
    keepers(tm, c, cx, cy, Rr * .82, Rr * .82, 8 + c.w // 2)
    if lit:
        d.polygon([(cx - Rr * .1, cy), (cx + Rr * .1, cy), (cx + Rr * .3, Y1 - 2), (cx - Rr * .3, Y1 - 2)], fill=(214, 222, 246))
    r = Rr * .55 * min(1, c.big + .05)
    pts = [(cx + math.cos(t) * r * c.rng.uniform(.88, 1), cy + math.sin(t) * r * .8 * c.rng.uniform(.88, 1)) for t in np.linspace(0, 6.28, 10, endpoint=False)]
    pshadow(tm, pts, 5, 6); poly(tm, pts, S[2])
    d.polygon([(cx + (a - cx) * .7 - r * .12, cy + (b - cy) * .7 - r * .1) for a, b in pts], fill=S[3])
    mc = (236, 240, 255) if lit else S[0]
    d.arc([cx - r * .45, cy - r * .45, cx + r * .35, cy + r * .35], 60, 300, fill=mc, width=3)
    d.ellipse([cx - r * .25, cy - r * .35, cx + r * .4, cy + r * .3], fill=S[3])
    d.line([cx + r * .1, cy - r * .1, cx + r * .1, cy + r * .2], fill=mc, width=2); d.line([cx, cy + r * .05, cx + r * .2, cy + r * .05], fill=mc, width=2)
    for k in range(4): blk(tm, cx + c.rng.uniform(-r * .6, r * .4), cy + c.rng.uniform(-r * .5, r * .3), 3, (200, 210, 190))
    if lit: glow(tm, cx, cy, Rr * 1.3, (200, 214, 255), .55)


BRONZE = {"aetherial": (200, 140, 70), "legendary": (236, 200, 90), "horizon": (120, 90, 110), "duat": (230, 196, 90)}


def bronzepillar(tm, x, y, w, h, st, v):
    """A giant bronze pillar from above: a column far taller than a tower, so all that shows is its round capital,
    ringed with mouldings stepping out to a square abacus, cast with a band of figures or script, standing on a
    broad square plinth whose corners show past it. Bronze bright in the Aetherial realms, gilded in a Legendary realm,
    dark in a Horizon realm, banded with gold and glyphs in the Duat. The bronze goes green with age: a little in the
    Dark Ages, more each age after (verdigris), and an offering the age's visitors left lies at its foot. Plain,
    fluted or banded; its capital topped by a square abacus, opened as a lotus or stepped as a round drum. A
    stronger realm raises a broader one."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); Rr = min(X1 - X0, Y1 - Y0) / 2
    br = BRONZE[v.get("realm", "aetherial")]; B = rp(br, 24); kind = v.get("kind", "banded"); green = (80, 170, 140)
    lit_rect(tm, X0, Y0, X1, Y1, rp({"aetherial": (190, 196, 210), "legendary": (150, 144, 130), "horizon": (80, 70, 96), "duat": (210, 180, 120)}[v.get("realm", "aetherial")], 12))   # the plinth
    for k in range(4): lit_rect(tm, X0 + 3 + (X1 - X0) * k / 4, Y1 - 10, X0 + (X1 - X0) * (k + 1) / 4 - 2, Y1 - 3, rp((130, 124, 112), 10))
    cap = v.get("capital", "abacus"); r = Rr * (.5 + .04 * c.w); eshadow(tm, cx, cy, r, r, 6, 7)
    if cap == "abacus": lit_rect(tm, cx - r * .92, cy - r * .92, cx + r * .92, cy + r * .92, B)          # a square abacus
    elif cap == "lotus":                                                                 # an open lotus of eight petals
        for a in np.linspace(0, 6.28, 8, endpoint=False):
            px_, py_ = cx + math.cos(a) * r * .9, cy + math.sin(a) * r * .9; lit_ellipse(tm, px_, py_, r * .32, r * .32, B)
    else:                                                                                # a stepped round drum
        lit_ellipse(tm, cx, cy, r * 1.05, r * 1.05, rp(tone(br, -30), 16)); d.ellipse([cx - r * .95, cy - r * .95, cx + r * .95, cy + r * .95], outline=B[0], width=2)
    for t, k in ((.86, 1), (.76, 3), (.64, 2), (.52, 4)): d.ellipse([cx - r * t, cy - r * t, cx + r * t, cy + r * t], fill=B[k], outline=B[0])
    if kind == "fluted":
        for a in np.linspace(0, 6.28, 20, endpoint=False): d.line([cx + math.cos(a) * r * .52, cy + math.sin(a) * r * .52, cx + math.cos(a) * r * .76, cy + math.sin(a) * r * .76], fill=B[0], width=2)
    elif kind == "banded":
        for a in np.linspace(0, 6.28, 16, endpoint=False):
            px_, py_ = cx + math.cos(a) * r * .7, cy + math.sin(a) * r * .7; blk(tm, px_ - 2, py_ - 3, 4, B[0] if v.get("realm") != "duat" else (40, 60, 150))
    d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], fill=B[3], outline=B[0]); d.ellipse([cx - r * .25, cy - r * .25, cx, cy], fill=B[4])
    for k in range(2 + c.e * 3):                                          # verdigris, more each age
        a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.3, .9) * r; q = 3 + (k % 3) * 2 + c.e // 3
        d.ellipse([cx + math.cos(a) * t - q, cy + math.sin(a) * t - q * .7, cx + math.cos(a) * t + q, cy + math.sin(a) * t + q * .7], fill=mix(green, br, .3))
    if v.get("realm") == "duat":
        for a in np.linspace(0, 6.28, 8, endpoint=False): d.arc([cx - r * .62, cy - r * .62, cx + r * .62, cy + r * .62], math.degrees(a), math.degrees(a) + 22, fill=(40, 60, 160), width=4)
    keepers(tm, c, cx, cy, Rr * .84, Rr * .84, 8, Rr * .11)


def keepers(tm, c, cx, cy, rx, ry, n=10, q=None):
    """The ring the age's keepers and visitors raise round a holy stone or a realm's heart, so each age has its own
    setting: rough menhirs (Dark Ages), warding stakes topped with skulls (Long Night), turned stone balusters under
    a rail (Renaissance), dressed blocks each set with a brass compass pin (Age of Reason), a cast-iron railing with
    spear heads (Victorian), sandbags and a strand of wire (Great War), a concrete kerb with lamp posts (Mid-Century),
    striped steel barriers and instrument cases (Modern), dark composite pylons with lit seams (Future Darkness)."""
    d = tm.d; e = c.e; q = q or max(5, min(rx, ry) * .14)
    pts = [(cx + math.cos(a) * rx, cy + math.sin(a) * ry) for a in np.linspace(0, 6.28, n, endpoint=False) + .3]
    if e == 4: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(40, 40, 46), width=2)
    if e == 5: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(150, 150, 156), width=1)
    if e == 2: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(176, 166, 146), width=max(3, int(q * .5)))   # the balustrade rail
    if e == 6: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(170, 168, 160), width=max(4, int(q * .7)))   # the kerb
    for k, (px_, py_) in enumerate(pts):
        if e == 0: lit_ellipse(tm, px_, py_, q * .8, q * 1.1, rp((130, 128, 120), 16)); eshadow(tm, px_, py_, q * .8, q, 3, 4, .7)
        elif e == 1:
            lit_ellipse(tm, px_, py_, q * .35, q * .35, rp((110, 84, 60), 14))
            if k % 2 == 0: lit_ellipse(tm, px_, py_ - q * .3, q * .5, q * .45, rp((220, 212, 190), 10)); blk(tm, px_ - 2, py_ - q * .3, 2, OUT)
        elif e == 2: lit_ellipse(tm, px_, py_, q * .6, q * .6, rp((210, 200, 180), 14)); d.ellipse([px_ - q * .25, py_ - q * .25, px_ + q * .25, py_ + q * .25], outline=(150, 140, 120))
        elif e == 3: lit_rect(tm, px_ - q * .75, py_ - q * .75, px_ + q * .75, py_ + q * .75, rp((220, 212, 196), 12)); blk(tm, px_ - 2, py_ - 2, 4, (200, 170, 80))
        elif e == 4: blk(tm, px_ - 2, py_ - 2, 4, (60, 60, 70), OUT)
        elif e == 5: lit_rect(tm, px_ - q * .8, py_ - q * .45, px_ + q * .8, py_ + q * .45, rp((170, 150, 100), 14), r=3)
        elif e == 6:
            if k % 2 == 0: eshadow(tm, px_, py_, q * .5, q * .5, 3, 4); lit_ellipse(tm, px_, py_, q * .5, q * .5, rp((60, 62, 66), 12)); d.ellipse([px_ - q * .3, py_ - q * .3, px_ + q * .3, py_ + q * .3], fill=(250, 226, 130))
            else: lit_rect(tm, px_ - q * .35, py_ - q * .8, px_ + q * .35, py_ + q * .8, rp((190, 188, 180), 10))
        elif e == 7:
            ang = math.atan2(py_ - cy, px_ - cx) + 1.57; ca, sa = math.cos(ang) * q, math.sin(ang) * q
            thick(tm, [px_ - ca, py_ - sa, px_ + ca, py_ + sa], (230, 230, 230), 3); blk(tm, px_ - 2, py_ - 2, 3, (210, 40, 40))
            if k % 4 == 0: lit_rect(tm, px_ - q * .5, py_ + q * .4, px_ + q * .5, py_ + q * 1.0, rp((60, 62, 70), 12))
        else: lit_rect(tm, px_ - q * .45, py_ - q * .45, px_ + q * .45, py_ + q * .45, rp((44, 48, 60), 12)); blk(tm, px_ - 1, py_ - q * .3, 2, GLOW[2])


def camp(tm, c, px_, py_, q):
    """What the age's visitors leave at a shelter's mouth: a fire ring and a fur (Dark Ages), a blanket and a wooden
    bowl (Long Night), a leather pack (Renaissance), a powder horn and a blanket roll (Age of Reason), a tin billy
    over the fire (Victorian), an army groundsheet (Great War), a canvas rucksack (Mid-Century), a nylon sleeping bag
    in orange (Modern), a dark thermal sheet with a lit edge (Future Darkness)."""
    d = tm.d; e = c.e
    d.ellipse([px_ - q, py_ - q * .8, px_ + q, py_ + q * .8], fill=(40, 34, 32), outline=OUT)
    for a in np.linspace(0, 6.28, 8, endpoint=False): lit_ellipse(tm, px_ + math.cos(a) * q, py_ + math.sin(a) * q * .8, 3, 3, rp((140, 136, 130), 14))
    d.ellipse([px_ - q * .4, py_ - q * .3, px_ + q * .4, py_ + q * .3], fill=(240, 140, 40) if e % 2 == 0 else (90, 80, 76))
    gx, gy = px_ + q * 4.5, py_ - q * .2                              # the visitors' own shelter or bedding beside the fire
    if e == 0: poly(tm, [(gx - q * 2, gy + q), (gx, gy - q * 1.6), (gx + q * 2, gy + q)], rp((150, 120, 80), 14)[2]); d.line([gx, gy - q * 1.6, gx, gy + q], fill=(90, 70, 50), width=2)
    elif e == 1: lit_rect(tm, gx - q * 2, gy - q * .5, gx + q * 2, gy + q * .5, rp((140, 110, 70), 12)); [d.line([gx - q * 2 + k * 4, gy - q * .5, gx - q * 2 + k * 4, gy + q * .5], fill=(100, 80, 50)) for k in range(int(q))]
    elif e == 2: lit_rect(tm, gx - q * 1.6, gy - q, gx + q * 1.6, gy + q, rp((200, 190, 160), 14)); d.line([gx, gy - q, gx, gy + q], fill=(150, 140, 110), width=2)
    elif e == 3: lit_rect(tm, gx - q * 1.8, gy - q * .6, gx + q * 1.8, gy + q * .6, rp((90, 80, 60), 12), r=4); thick(tm, [gx - q * 2.2, gy + q, gx - q * .8, gy + q * .4], (230, 220, 190), 2)
    elif e == 4: lit_rect(tm, gx - q * 1.8, gy - q * 1.1, gx + q * 1.8, gy + q * 1.1, rp((110, 100, 70), 12)); d.line([gx - q * 1.8, gy - q * 1.1, gx + q * 1.8, gy + q * 1.1], fill=(60, 50, 40)); lit_ellipse(tm, px_, py_, q * .3, q * .3, rp((180, 180, 186), 18))
    elif e == 5: poly(tm, [(gx - q * 2, gy + q), (gx - q * 2, gy - q * .6), (gx, gy - q * 1.4), (gx + q * 2, gy - q * .6), (gx + q * 2, gy + q)], rp((110, 110, 76), 12)[2]); d.line([gx, gy - q * 1.4, gx, gy + q], fill=(80, 80, 56), width=2)
    elif e == 6: lit_rect(tm, gx - q * 1.4, gy - q * .8, gx + q * 1.4, gy + q * .8, rp((120, 120, 90), 14), r=4); lit_rect(tm, gx - q * .6, gy - q * .4, gx + q * .6, gy + q * .4, rp((150, 150, 110), 12))
    elif e == 7: lit_ellipse(tm, gx, gy, q * 2, q * 1.4, rp((240, 120, 40), 18)); d.line([gx - q * 2, gy, gx + q * 2, gy], fill=(150, 70, 20)); d.line([gx, gy - q * 1.4, gx, gy + q * 1.4], fill=(150, 70, 20))
    else: poly(tm, [(gx - q * 2, gy + q), (gx - q, gy - q), (gx + q, gy - q), (gx + q * 2, gy + q)], rp((40, 44, 56), 12)[2]); d.line([gx - q, gy - q, gx + q, gy - q], fill=GLOW[2], width=2)


def shellshelter(tm, x, y, w, h, st, v):
    """A megafauna-shell shelter of Pangaea from above: the vast domed shell of a glyptodont-like beast, its back a
    mosaic of six-sided bony plates each with a raised rosette, laid over a hollow and propped up on its south side so
    a dark crawl opening shows there, hides drawn over the gap, the ground trodden bare in front and the age's
    visitors' camp at the mouth (camp). Tawny, grey-brown, banded or mossy; a bigger beast makes a bigger shell. A domed shell
    of rosette plates, an armadillo's shell in rows of square scutes, or a domed shell with a ridge of spikes."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    beast = v.get("beast", "domed"); shell = {"tawny": (196, 150, 90), "greybrown": (110, 100, 96), "banded": (160, 110, 70), "mossy": (110, 130, 70)}[v.get("shell", "tawny")]; S = rp(shell, 18)
    d.polygon(blob(c, cx, cy, W / 2, H / 2, 16, .06), fill=(120, 100, 70), outline=None)    # trodden ground
    k_ = min(1, .8 + .04 * c.w); sx0, sy0, sx1, sy1 = cx - W * .45 * k_, Y0 + H * .03 + H * .7 * (1 - k_), cx + W * .45 * k_, Y0 + H * .73
    scx, scy = (sx0 + sx1) / 2, (sy0 + sy1) / 2; rx, ry = (sx1 - sx0) / 2, (sy1 - sy0) / 2
    d.ellipse([scx - rx * .7, sy1 - ry * .45, scx + rx * .7, sy1 + ry * .25], fill=(16, 12, 12))   # the crawl opening's shade
    eshadow(tm, scx, scy, rx, ry, 6, 7); d.ellipse([sx0, sy0, sx1, sy1], fill=S[1], outline=OUT)
    s = max(8, int(min(rx, ry) * .2)); hx = s * 1.75
    for row in range(-6, 7):
        for col in range(-8, 9):
            px_, py_ = scx + col * hx + (hx / 2 if row % 2 else 0), scy + row * s * 1.5
            if beast == "banded": px_ = scx + col * s * 1.2
            q = ((px_ - scx) / rx) ** 2 + ((py_ - scy) / ry) ** 2
            if q > .82: continue
            lt = -((px_ - scx) / rx + (py_ - scy) / ry) * .5 + .5 - q * .3
            k = int(np.clip(1 + lt * 3.2, 1, 4)); band = v.get("shell") == "banded" and row % 3 == 0
            if beast == "banded":                                              # an armadillo's rows of square scutes
                d.rectangle([px_ - s * .55, py_ - s * .7, px_ + s * .55, py_ + s * .55], fill=S[k], outline=S[0])
                continue
            hexa = [(px_ + math.cos(a) * s * .95, py_ + math.sin(a) * s * .95) for a in np.linspace(0, 6.28, 6, endpoint=False) + .52]
            d.polygon(hexa, fill=S[k] if not band else S[max(0, k - 2)], outline=S[0])
            d.ellipse([px_ - s * .3, py_ - s * .3, px_ + s * .3, py_ + s * .3], fill=S[min(4, k + 1)])
    if beast == "banded":
        for row in range(-6, 7, 2):
            by_ = scy + row * s * 1.5 + s * .75; f = 1 - ((by_ - scy) / ry) ** 2
            if f > .1: hw = rx * math.sqrt(f) * .88; d.line([scx - hw, by_, scx + hw, by_], fill=OUT, width=2)
    elif beast == "spined":                                                    # a ridge of bony spikes along the spine
        for t in np.linspace(-.8, .8, 7):
            py_ = scy + t * ry * .85; poly(tm, [(scx - s * .6, py_ + s * .5), (scx, py_ - s * .9), (scx + s * .6, py_ + s * .5)], S[4], out=OUT)
    if v.get("shell") == "mossy":
        for k in range(8): a = c.rng.uniform(0, 6.28); t = c.rng.uniform(.2, .8); d.ellipse([scx + math.cos(a) * rx * t - 6, scy + math.sin(a) * ry * t - 4, scx + math.cos(a) * rx * t + 6, scy + math.sin(a) * ry * t + 4], fill=(70, 110, 50))
    if v.get("door", "hides") == "hides": lit_rect(tm, scx - rx * .45, sy1 - ry * .12, scx + rx * .45, sy1 + ry * .06, rp((150, 110, 70), 14), r=3)   # hides over the gap
    # the visitors' gear spread to dry on the shell's back: a hide, a blanket, a cloak, a coat, a tarpaulin, a
    # groundsheet, a canvas sheet, a nylon mat, a thermal sheet (the age's own)
    gc = [(150, 110, 70), (120, 100, 80), (60, 70, 110), (150, 40, 40), (50, 60, 56), (170, 160, 100), (190, 180, 150), (40, 120, 200), (50, 54, 66)][c.e]
    gw_, gh_ = rx * (.5 + .06 * (c.e % 3)), ry * (.36 + .05 * (c.e % 4)); gx_, gy_ = scx + rx * c.rng.uniform(-.35, .1), scy + ry * c.rng.uniform(-.45, -.1)
    gpts = [(gx_ - gw_ / 2, gy_ - gh_ / 2), (gx_ + gw_ / 2, gy_ - gh_ / 2 + 4), (gx_ + gw_ / 2 - 3, gy_ + gh_ / 2), (gx_ - gw_ / 2 + 2, gy_ + gh_ / 2 - 3)]
    if c.e == 0: gpts = blob(c, gx_, gy_, gw_ / 2, gh_ / 2, 9, .3)
    pshadow(tm, gpts, 2, 3); poly(tm, gpts, rp(gc, 14)[2])
    for k in range(2 + c.e % 3): d.line([gx_ - gw_ * .4, gy_ - gh_ * .3 + k * gh_ * .25, gx_ + gw_ * .4, gy_ - gh_ * .25 + k * gh_ * .25], fill=rp(gc, 14)[1 if c.e % 2 else 4], width=1)
    if c.e == 8: d.line([gpts[0], gpts[1]], fill=GLOW[2], width=2)
    if c.e == 5: d.rectangle([gx_ - gw_ * .15, gy_ - gh_ * .15, gx_ + gw_ * .15, gy_ + gh_ * .1], fill=(236, 236, 230))
    camp(tm, c, cx - W * .36, Y1 - H * .12, min(W, H) * .085)


def tomblock(tm, x, y, w, h, st, v):
    """A tomb lock or ward lever on a wall from above: a stone panel set out from the wall (to the north), framed
    in carved glyphs, with its works: a rotary lever on a round boss, a row of coloured switches (checkered, cyan,
    purple, yellow), a combination dial or a jagged glass aperture, and a keyhole; the works flat on the face, sunk in a
    dark recess or on a raised boss, edged in gilt in a rich tomb. Closed: the lever up and the panel flush; open: the
    lever thrown down and a slot gaping beneath it. Limestone, granite, basalt or gilded; its keepers' fittings of the age at
    both ends: iron straps, skull bosses, carved pilasters, brass corner plates, a cast-iron frame, a steel bar and
    padlock, warning lamps, hazard tape and sensors, a lit composite frame."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0
    stone = {"limestone": (214, 196, 160), "granite": (150, 140, 140), "basalt": (60, 58, 66), "gilded": (220, 180, 80)}[v.get("stone", "limestone")]
    S = rp(stone, 16); op = st == "open"; mech = v.get("works", "lever")
    pshadow(tm, [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)], 3, 4); lit_rect(tm, X0, Y0, X1, Y1, S)
    for gx in np.arange(X0 + 3, X1 - 3, 5): blk(tm, gx, Y1 - 4, 2, S[0]); blk(tm, gx + 1, Y0 + 2, 2, S[0])
    panel = v.get("panel", "flat")
    if panel == "sunk": d.rectangle([X0 + W * .14, Y0 + H * .18, X1 - W * .14, Y1 - H * .18], fill=tone(stone, -70), outline=OUT)   # a recess for the works
    elif panel == "raised": lit_rect(tm, X0 + W * .1, Y0 - 2, X1 - W * .1, Y1 - H * .12, rp(tone(stone, 30), 14))                   # a raised boss
    if c.w >= 4: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=(236, 200, 90), width=2)                                     # gilt edge
    if mech == "lever":
        lit_ellipse(tm, cx, cy, H * .28, H * .28, rp((150, 120, 60), 20))
        ang = -1.2 if not op else 1.2; d.line([cx, cy, cx + math.cos(ang) * H * .45, cy + math.sin(ang) * H * .45], fill=OUT, width=4); d.line([cx, cy, cx + math.cos(ang) * H * .45, cy + math.sin(ang) * H * .45], fill=(200, 170, 90), width=2)
    elif mech == "switches":
        for k, col in enumerate(((40, 40, 40), (60, 220, 230), (170, 70, 200), (240, 210, 60))):
            bx = X0 + W * (.15 + .2 * k); by = cy - 3 + (4 if op and k == 2 else 0)
            d.rectangle([bx, by, bx + W * .14, by + 6], fill=col, outline=OUT)
            if k == 0: d.rectangle([bx + 1, by + 1, bx + W * .07, by + 3], fill=(230, 230, 230))
    elif mech == "dial":                                                     # a combination dial
        lit_ellipse(tm, cx, cy, H * .32, H * .32, rp((120, 124, 130), 16))
        for a_ in np.linspace(0, 6.28, 12, endpoint=False): d.line([cx + math.cos(a_) * H * .22, cy + math.sin(a_) * H * .22, cx + math.cos(a_) * H * .3, cy + math.sin(a_) * H * .3], fill=OUT, width=1)
        ang = -1.57 if not op else 0; d.line([cx, cy, cx + math.cos(ang) * H * .2, cy + math.sin(ang) * H * .2], fill=(220, 40, 40), width=2)
    else:
        poly(tm, [(cx - W * .2, cy), (cx - W * .08, cy - H * .25), (cx + W * .05, cy - H * .1), (cx + W * .2, cy - H * .28), (cx + W * .18, cy + H * .2), (cx - W * .1, cy + H * .25)], (130, 200, 220), out=OUT)
    d.ellipse([X1 - W * .14, cy - 3, X1 - W * .08, cy + 1], fill=OUT); d.rectangle([X1 - W * .12, cy, X1 - W * .1, cy + 4], fill=OUT)
    if op: d.rectangle([X0 + W * .2, Y1 - H * .22, X1 - W * .25, Y1 - H * .1], fill=(10, 8, 10))
    e = c.e; L, R_ = X0 + W * .03, X1 - W * .03                     # the fittings its keepers set on it in their age
    if e == 0:
        for sx in (L, R_ - 5): lit_rect(tm, sx, Y0, sx + 5, Y1, rp((70, 66, 64), 12))                      # iron straps
    elif e == 1:
        for sx in (L + 4, R_ - 4): skull(tm, sx, cy, min(6, H * .3))                                       # skull bosses
    elif e == 2:
        for sx in (L, R_ - 7):                                                                             # carved pilasters
            lit_rect(tm, sx, Y0, sx + 7, Y1, rp(tone(stone, 20), 12)); d.line([sx + 3, Y0 + 2, sx + 3, Y1 - 2], fill=S[0], width=1)
    elif e == 3:
        for sx in (X0, X1 - 6):
            for sy in (Y0, Y1 - 6): lit_rect(tm, sx, sy, sx + 6, sy + 6, rp((200, 160, 70), 16))              # brass corner plates
    elif e == 4:
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=(50, 50, 58), width=3)                       # a cast-iron frame
        for gx in np.linspace(X0 + 4, X1 - 4, 9): blk(tm, gx - 1, Y1 - 3, 2, (150, 150, 160))
    elif e == 5:
        thick(tm, [X0 + 2, Y1 - H * .2, X1 - 2, Y1 - H * .2], (110, 110, 116), 4)                           # a steel bar and padlock
        lit_rect(tm, cx - 5, Y1 - H * .3, cx + 5, Y1 - 2, rp((150, 120, 50), 16))
    elif e == 6:
        for sx in (L + 4, R_ - 4): lit_ellipse(tm, sx, cy, H * .18, H * .18, rp((230, 200, 60), 18))        # warning lamps
    elif e == 7:
        for k in range(0, int(W), 8): d.line([X0 + k, Y1 - 3, X0 + k + 4, Y1 - 3], fill=(240, 210, 40), width=3)   # tape and sensors
        for sx in (L + 3, R_ - 3): d.ellipse([sx - 3, Y0 + 2, sx + 3, Y0 + 8], fill=(20, 18, 20), outline=(200, 40, 40))
    else:
        d.rectangle([X0 + W * .05, Y0 + H * .1, X1 - W * .05, Y1 - H * .1], outline=(240, 120, 40)); d.line([X0 + W * .05, Y0 + H * .1, X1 - W * .05, Y0 + H * .1], fill=(255, 220, 160), width=2)


MISSILE = {"white": (208, 208, 204), "olive": (100, 110, 70), "sand": (200, 170, 110), "checker": (230, 230, 226), "black": (46, 48, 56)}


def missilewreck(tm, x, y, w, h, st, v):
    """A wrecked missile from above: a long fallen body lying in a scorched crater, its nose cone cracked off at the
    north end and its tail fins at the south, its skin burst open at the middle showing tanks and frames inside, torn
    panels and debris scattered. The age's making: a finned rocket of the forties and fifties (often black and white
    checks or olive), a long white cold-war missile, a grey cruise missile with stub wings (Modern), a dark angular
    composite body with lit seams (Future Darkness)."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1, cx, cy = frame(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0
    e = c.e; paint = MISSILE[v.get("paint", "white")] if e < 8 else mix(MISSILE[v.get("paint", "white")], (50, 54, 66), .35); P_ = rp(paint, 20)
    d.polygon(blob(c, cx, cy, W / 2, H / 2, 20, .08), fill=(60, 52, 46), outline=None)                      # the scorched furrow
    r = W * (.22 if e != 7 else .17); seg = .015 * c.w; sg = 1 if c.rng.random() < .5 else -1; fx, tx = sg * c.rng.uniform(.07, .12) * W, -sg * c.rng.uniform(.05, .1) * W;   # the halves always broken askew
    L_ = Y1 - H * .12 - (Y0 + H * .1)
    body = (Y0 + H * .1, Y1 - H * .12); mid = body[0] + L_ * .5
    if v.get("crater", "shallow") == "deep":
        d.ellipse([cx - W * .48, mid - W * .5, cx + W * .48, mid + W * .5], fill=(34, 28, 26), outline=(90, 80, 70))
    def tube(y0_, y1_, ox):                                                # a round body: lit west side, dark east side
        q = cx + ox; lit_rect(tm, q - r, y0_, q + r, y1_, P_, r=3 if e < 8 else 0)
        d.rectangle([q - r * .6, y0_ + 2, q - r * .35, y1_ - 2], fill=P_[4]); d.rectangle([q + r * .5, y0_ + 2, q + r * .85, y1_ - 2], fill=P_[0])
        if e == 8:
            for yy in np.arange(y0_ + 10, y1_ - 4, 18): d.line([q - r, yy, q + r, yy + 6], fill=P_[0], width=1)
        if v.get("paint") == "checker" and e < 8:
            for k in range(int((y1_ - y0_) / (L_ * .1))): d.rectangle([q - r + (r if k % 2 else 0) + 1, y0_ + L_ * .1 * k, q + (0 if k % 2 else r) - 1, min(y1_, y0_ + L_ * .1 * (k + 1))], fill=(40, 40, 44))
    tube(body[0], body[0] + L_ * .45, fx); tube(body[0] + L_ * (.55 + seg), body[1], tx)
    d.polygon([(cx + fx - r * .9, body[0] + L_ * .45), (cx + fx + r * .9, body[0] + L_ * .45), (cx + tx + r * .7, body[0] + L_ * (.55 + seg)), (cx + tx - r * .8, body[0] + L_ * (.55 + seg))], fill=(30, 28, 30))
    for k in range(3): d.ellipse([cx + fx - r * .6, body[0] + L_ * (.46 + .03 * k), cx + fx + r * .6, body[0] + L_ * (.5 + .03 * k)], outline=(130, 130, 136), width=1)
    nb = body[0] + 2; cx0 = cx; cx = cx + fx
    if e == 6: d.pieslice([cx - r + W * .1, nb - r * 2.4, cx + r + W * .1, nb + r * 1.2], 180, 360, fill=P_[3], outline=OUT)          # an ogive nose, knocked aside
    elif e == 7: d.polygon([(cx - r + W * .1, nb), (cx + r + W * .1, nb), (cx + W * .1, Y0 + 2)], fill=P_[3], outline=OUT)
    else: d.polygon([(cx - r + W * .12, nb), (cx + r + W * .12, nb), (cx + r * .4 + W * .12, Y0 + H * .03), (cx + W * .12, Y0 + 2), (cx - r * .4 + W * .12, Y0 + H * .03)], fill=P_[3], outline=OUT)
    cx = cx0 + tx
    for sx in (-1, 1):
        if e == 6: poly(tm, [(cx + sx * r, body[1] - H * .1), (cx + sx * W * .48, body[1]), (cx + sx * W * .48, Y1 - 2), (cx + sx * r, Y1 - H * .04)], P_[1 if sx > 0 else 3])
        elif e == 7: poly(tm, [(cx + sx * r, body[1] - H * .05), (cx + sx * W * .34, body[1] + H * .03), (cx + sx * r, body[1] + H * .03)], P_[1 if sx > 0 else 3])
        else: poly(tm, [(cx + sx * r, body[1] - H * .2), (cx + sx * W * .46, Y1 - 4), (cx + sx * r, body[1] - H * .06)], P_[1 if sx > 0 else 3])
    if e == 7:
        for sx in (-1, 1): poly(tm, [(cx0 + fx + sx * r, cy - H * .05), (cx0 + fx + sx * W * .46, cy), (cx0 + fx + sx * r, cy + H * .04)], P_[2])
    lit_ellipse(tm, cx, Y1 - 4, r * .7, 4, rp((50, 46, 46), 10))
    if e == 8: d.line([cx0 + fx, body[0] + 4, cx0 + fx, body[0] + L_ * .44], fill=GLOW[1], width=2); d.line([cx, body[0] + L_ * .58, cx, body[1] - 4], fill=GLOW[1], width=2)
    if e == 6: d.rectangle([cx0 + fx - r * .6, body[0] + H * .12, cx0 + fx + r * .6, body[0] + H * .14], fill=(170, 40, 40))
    cx = cx0
    for k in range(5): a = c.rng.uniform(0, 6.28); px_, py_ = cx + math.cos(a) * W * .38, cy + math.sin(a) * H * .3; poly(tm, [(px_, py_), (px_ + 8, py_ + 2), (px_ + 3, py_ + 7)], P_[2])


# ================================================================ the definitions
REF_OWN = "our own measure (the books give no size)"
R("blighttree", blighttree, {"realm": REALM4, "stage": ["sapling", "grown", "ancient"]},
  "a blighted tree crown 7 to 9 ft across, as a small field tree (" + REF_OWN + ")")
R("blightbloom", blightbloom, {"realm": REALM4, "phase": ["bud", "open", "spewing"]}, "a spore-bloom about a cartwheel across, 2 1/2 to 3 1/2 ft (" + REF_OWN + ")")
R("hivepod", hivepod, {"realm": REALM4, "hive": ["resin", "paper", "chitin", "membrane"]}, "a brood pod the size of a barrel, 2 1/2 to 3 1/2 ft (" + REF_OWN + ")",
  states=("closed", "open"), openable="sack")
R("hivenest", hivenest, {"realm": REALM4, "hive": ["paper", "resin", "wax"]}, "a hive comb built out 3 to 4 1/2 ft from the wall along 5 to 7 ft, with a crawl hole a body can pass (" + REF_OWN + ")",
  front=True, clear=1.5)
R("fleshpod", fleshpod, {"realm": ["malfeas", "atrocity", "abyss", "haven"], "organ": ["heart", "brain", "eyes"], "form": ["sac", "ribbed", "spiked"]}, "an organ pod the size of a barrel, 2 1/2 to 3 1/2 ft (" + REF_OWN + ")",
  states=("closed", "open"), openable="sack", nvar=18)
R("fleshmaw", fleshmaw, {"realm": ["malfeas", "atrocity", "abyss", "haven"], "size": ["narrow", "wide"], "flush": ["pale", "engorged", "bruised"]}, "a maw about a doorway wide, 3 1/2 to 4 1/2 ft, bulging 1 to 2 ft from the wall (" + REF_OWN + ")",
  states=("closed", "open"), front=True, clear=2)
R("fleshtubes", fleshtubes, {"realm": ["malfeas", "atrocity", "abyss", "haven"], "kind": ["gasping", "decaying"]}, "a clump of tubes 3 1/2 to 4 1/2 ft across, each a hand to a foot wide (" + REF_OWN + ")")
R("impalestake", impalestake, {"victim": ["corpse", "bones", "bare", "corpse"], "blood": ["fresh", "old"], "ground": ["atrocity", "mud", "snow", "ash"]}, "an impaling stake 6 to 10 in thick with its body and blood pool about 2 ft across (Ottoman and Wallachian accounts of 1460s impalement)", nvar=20)
R("spectregate", spectregate, {"realm": ["labyrinth", "tempest", "abyss"], "build": ["bone", "stone", "soulsteel"], "piers": ["square", "round", "twin"]}, "an archway with an opening about 5 ft wide between piers 1 1/2 ft thick, 8 ft overall, 2 ft deep (" + REF_OWN + ")",
  states=("closed", "open"), openable="gate", front=True, clear=3, nvar=16)
R("labyrinthstele", labyrinthstele, {"realm": ["labyrinth", "tempest", "abyss"], "stone": ["basalt", "soulsteel", "bone"], "head": ["flat", "round", "pointed"]}, "a stele 2 ft wide and a foot thick on its plinth, like a grave stele (Greek and Roman funerary stelae)", nvar=18)
R("oblivionchasm", oblivionchasm, {"realm": ["labyrinth", "tempest", "abyss"], "motes": ["sparks", "mist", "none"], "shape": ["rift", "pit"]}, "a rent 8 1/2 to 11 1/2 ft long, as a collapse pit in a road (" + REF_OWN + ")", nvar=18)
R("maelstrommist", maelstrommist, {"realm": ["tempest", "labyrinth", "shores", "stygia"], "mood": ["calm", "raging"]}, "a bank of fog about 10 by 6 ft, the size of a token's room to hide (" + REF_OWN + ")", low=True)
R("paradoxflaw", paradoxflaw, {"realm": ["paradox", "deep-umbra", "shard", "lab"], "kind": ["rift", "fold", "flat"]}, "a fault 3 1/2 to 4 1/2 ft across (" + REF_OWN + ")", low=True)
R("paradoxglass", paradoxglass, {"realm": ["shard", "paradox", "horizon"], "pool": ["dry", "wet", "frozen"]}, "a bed of realm glass 3 1/2 to 4 1/2 by 2 1/2 to 3 1/2 ft (" + REF_OWN + ")")
R("voidpatch", voidpatch, {"realm": ["deep-umbra", "paradox", "flux"], "sky": ["stars", "nebula", "world"]}, "a hole in the realm about 4 ft across (" + REF_OWN + ")", low=True)
R("umbralflora", umbralflora, {"realm": list(UMBRA), "kind": ["fern", "lichen", "polyp"]}, "a growth 5 to 7 ft across, the spread of a tree fern (Dicksonia crowns of 6 ft)")
R("lumincrystal", lumincrystal, {"realm": list(CRYSTAL), "cut": ["cluster", "spray"]}, "a crystal cluster 2 1/2 to 3 1/2 ft across, as large quartz clusters (Arkansas and Brazilian quartz beds)",
  states=("lit", "out"), light={"dim": 3, "bright": 1, "color": "#b49cff", "kind": "lamp"})
R("moonpool", moonpool, {"realm": ["aetherial", "wolfhome", "caern", "deep-umbra"], "rim": ["round", "broad"]}, "a pool about 6 ft across in its ring of stones, as a spring basin or holy well (" + REF_OWN + ")",
  states=("lit", "out"), light={"dim": 3, "bright": 1, "color": "#c8d2ff", "kind": "lamp"})
R("coralspire", coralspire, {"colour": ["violet", "bone", "red"], "form": ["fan", "tree", "brain"]}, "a coral head 3 1/2 to 4 1/2 ft across, as a large branching coral (Acropora tables 1 to 2 m)")
R("scrapspire", scrapspire, {"realm": list(MACH), "form": ["spire", "column", "tangle"]}, "a scrap spire 5 to 7 ft across at its foot (" + REF_OWN + ")", nvar=18)
R("wiregrass", wiregrass, {"realm": list(MACH), "length": ["short", "tall", "tangled"]}, "a patch of wire grass 3 1/2 to 4 1/2 ft across (" + REF_OWN + ")", low=True, nvar=16)
R("cyborgremains", cyborgremains, {"make": list(CYB), "pose": ["whole", "scattered"]}, "a body 5 1/2 to 6 1/2 ft long lying with its limbs and spill about 2 ft wide (an adult's length)", nvar=18)
R("powerpylon", powerpylon, {"kind": ["tesla", "fusion", "cryo"], "housing": ["grey", "yellow", "black", "white", "orange"], "footing": ["square", "round", "fins"]}, "a pylon on a footing 2 1/2 to 3 1/2 ft square, as a pad-mounted transformer", nvar=18,
  states=("on", "off"), light={"dim": 3, "bright": 1, "color": "#9cc8ff", "kind": "lamp"})
R("translocator", translocator, {"ring": ["blue", "amber", "violet", "white", "green"], "frame": ["round", "hex"], "deck": ["dark", "pale"]}, "a pad 5 to 7 ft across, room for two standing with their gear (" + REF_OWN + ")", nvar=18,
  states=("on", "off"), low=True)
R("riotfoam", riotfoam, {"colour": ["white", "yellow", "orange", "grey", "blue"], "trapped": ["none", "baton", "boots", "shield"]}, "a set mass of sticky foam 3 1/2 to 4 1/2 ft across, about what one projector lays across a passage (sticky foam trials of the 1970s and 1990s)")
R("voidshipconsole", voidshipconsole, {"trim": list(TRIM), "layout": ["helm", "nav", "drive"]}, "a helm desk 5 to 7 ft long and 2 1/2 to 3 1/2 ft deep, as an airliner or ship's bridge console",
  states=("on", "off"), front=True, clear=2.5, nvar=16)
R("voidshipseat", voidshipseat, {"cover": ["red", "blue", "green", "black", "tan"], "harness": ["five", "cross", "bar"], "shell": ["light", "dark"]}, "a reclined couch 2 1/2 to 3 1/2 ft wide and 5 to 7 ft long (Soyuz Kazbek couches and astronaut couches)",
  front=True, clear=1.5, nvar=18)
R("voidshipdrive", voidshipdrive, {"kind": ["nozzle", "ring", "cluster"], "finish": list(TRIM)}, "an engine on its bed 7 to 9 ft square, as a small rocket motor and its pumps (RL10 and similar)",
  states=("on", "off"), light={"dim": 4, "bright": 1.5, "color": "#a0b8ff", "kind": "fire"})
R("chimericaltree", chimericaltree, {"realm": list(DREAM), "fruit": ["apple", "pear", "star"]}, "a crown 8 1/2 to 11 1/2 ft across, as an orchard standard apple (orchard planting guides)", nvar=15)
R("chimericalbloom", chimericalbloom, {"realm": list(DREAM), "bloom": ["bells", "stars", "whisks"]}, "a clump of flowers about 3 ft across, as a garden peony or iris clump", nvar=15)
R("sweetrock", sweetrock, {"tint": ["plain", "pink", "blue", "green", "gold"], "form": ["boulder", "cluster", "rubble"]}, "a boulder 3 1/2 to 4 1/2 ft across, as the boulders of RULES.md (3 to 5 ft)", nvar=15)
R("sweetpool", sweetpool, {"kind": ["milk", "dark", "white"], "rim": ["biscuit", "wafer", "caramel"], "depth": ["deep", "shallow"]}, "a pool about 8 by 6 ft, as a garden pond (" + REF_OWN + ")", nvar=18, low=True)
R("realmheart", realmheart, {"realm": list(HEART), "seat": ["stone", "roots", "pool"], "cut": ["round", "tall", "cluster"]}, "a heart-stone and its rune ring 3 1/2 to 4 1/2 ft across (" + REF_OWN + ")",
  states=("lit", "out"), light={"dim": 4, "bright": 1.5, "color": "#dce8ff", "kind": "lamp"}, nvar=18)
R("moonbridgestone", moonbridgestone, {"stone": ["granite", "quartz", "basalt", "sandstone"], "realm": ["wolfhome", "caern", "aetherial", "legendary"]}, "a standing stone and its ring about 3 ft across, as the wayside standing stones of RULES.md",
  states=("lit", "out"), light={"dim": 3, "bright": 1, "color": "#d0dcff", "kind": "lamp"}, nvar=22)
R("bronzepillar", bronzepillar, {"realm": list(BRONZE), "kind": ["plain", "fluted", "banded"], "capital": ["abacus", "lotus", "drum"]}, "a capital and plinth 5 to 7 ft across, as a great temple column (the Karnak hypostyle columns, 10 ft and more)", nvar=22)
R("shellshelter", shellshelter, {"shell": ["tawny", "greybrown", "banded", "mossy"], "door": ["hides", "open"], "beast": ["domed", "banded", "spined"]}, "a shell 8 1/2 to 11 1/2 ft long, as a Glyptodon carapace (about 3 m long and 1.5 m high)", nvar=22)
R("tomblock", tomblock, {"stone": ["limestone", "granite", "basalt", "gilded"], "works": ["lever", "switches", "aperture", "dial"], "panel": ["flat", "sunk", "raised"]}, "a lock panel about 2 ft wide set a foot out from the wall (" + REF_OWN + ")",
  states=("closed", "open"), front=True, clear=1.5, nvar=20)
R("missilewreck", missilewreck, {"paint": list(MISSILE), "crater": ["shallow", "deep"]}, "a missile 25 to 35 ft long and 5 to 6 ft across (the V-2 at 46 ft, the Tomahawk at 20 ft, with the scattered pieces)", nvar=18)
