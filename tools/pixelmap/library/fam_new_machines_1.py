"""Machines for the library, added from a check of Cataclysm's world objects (first batch): workshop and factory
plant (air compressor, band saw, chain hoist, hydraulic press, industrial pump, heavy machine, heat-treating furnace,
electric arc furnace, scrap baler, fire hose cabinet, drilling rig, biogas digester), the clinic (anaesthetic
machine, dialysis machine), the kitchen (deep fryer), the laboratory (bioprinter, algae bioreactor, growth tank,
chromatograph, electron microscope, irradiator, lab freezer, lab robot, laser on its optical table, 3D fabricator),
doors and halls (card reader, intercom, walk-through metal detector), the street (car charging point, drone dock),
sport (ball-throwing machine) and the Technocracy (power-armour gantry).

Every one is seen from straight above with its front to the south. These are made things, sold the world over by a
few makers in each age, so they carry no people's pattern: each is `global_from` its first year, and its looks come
from what really changes: the era's form and making (riveted iron and brass, enamel and chrome, beige and grey
plastic, dark sealed composites), the make and model, the maker's livery, the fit-out a richer owner buys, what it
holds or works on, and its wear. Two belong to World of Darkness factions: the growth tank is a Progenitor vat in
their clinical white and green, and the gantry holds Iteration X power armour in chrome and black with its blue
lit seams. Each drawing is wrapped by `_obj`, which lays the wear on the pixels drawn and casts one short shadow."""
import math

import numpy as np
from PIL import Image

from px import OUT
from library.core import define
from library.census import CENSUS, ERAS
from library.art import tone, mix, ramp, box_px, IRON, BRASS, STEEL, WHITE, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW

PER = {"dark-ages": "V", "long-night": "V", "renaissance": "V", "age-of-reason": "V", "victorian": "V", "great-war": "G",
       "mid-century": "M", "modern": "N", "future-darkness": "F"}
AGE2ERA = {"medieval": "victorian", "early modern": "victorian", "1800s": "victorian", "1900s": "mid-century",
           "modern": "modern", "Future Darkness": "future-darkness"}
GREY = (124, 118, 110)
RUST = ramp((128, 72, 44), 16)
CHROME = [(70, 76, 86), (120, 128, 140), (176, 184, 194), (214, 220, 228), (246, 248, 250)]
RUBBER = ramp((44, 44, 48), 10)
COPPER = ramp((176, 100, 56), 20)
WOOD = ramp((128, 82, 48), 18)
DARKWOOD = ramp((92, 54, 34), 16)
CONC = ramp((150, 148, 140), 10)
BRICK = ramp((150, 72, 52), 14)
FIREBRICK = ramp((206, 176, 130), 12)
RED = ramp((188, 40, 34), 20)
YEL = ramp((222, 184, 40), 18)
GLASS = [(60, 90, 110), (96, 136, 156), (150, 190, 206), (196, 224, 232), (236, 248, 250)]
HOT = [(120, 30, 10), (200, 70, 20), (250, 150, 40), (255, 220, 120), (255, 250, 220)]
HAZ = ((232, 190, 30), (30, 28, 30))
SS = ramp((176, 180, 182), 14)                                                   # stainless steel

# makers' liveries of each age (paint a factory really sold), chosen by the "livery" axis
LIV = {
    "V": [(40, 40, 46), (66, 104, 72), (140, 50, 46), (136, 134, 128), (176, 92, 56), (64, 82, 136), (168, 150, 100)],
    "G": [(72, 110, 78), (144, 144, 138), (38, 38, 42), (170, 120, 72), (66, 86, 140), (132, 52, 48), (150, 140, 82)],
    "M": [(226, 218, 190), (90, 180, 170), (150, 184, 210), (170, 110, 70), (126, 132, 132), (190, 60, 52), (96, 110, 70)],
    "N": [(46, 48, 54), (236, 236, 230), (178, 44, 40), (206, 196, 170), (176, 180, 184), (92, 96, 104), (196, 200, 206)],
    "F": [(214, 218, 222), (30, 90, 96), (66, 70, 80), (110, 36, 44), (20, 22, 26), (150, 156, 164), (60, 56, 74)],
}
SCREEN_ON = [(20, 40, 60), (60, 120, 170), (140, 200, 230), (220, 244, 250)]
SCREEN_OFF = [(16, 18, 22), (30, 32, 38), (48, 52, 60), (70, 76, 86)]


class C:
    """One variation's look: its age, means, state, condition and the palettes they give."""
    def __init__(s, v, st, era0):
        s.era = v.get("era") or AGE2ERA.get(v.get("age"), era0)
        s.per = PER.get(s.era, "M"); s.w = int(v.get("wealth", 3)); s.cond = v.get("condition", "new"); s.v = v
        s.poor, s.rich = s.w <= 1, s.w >= 4
        s.on = st in ("on", "open", "lit", "full"); s.open = st == "open"; s.st = st; s.broken = s.cond == "broken"
        k = int(v.get("livery", 0)) % 7; s.k = k
        base = LIV[s.per][k]
        if s.poor: base = mix(base, GREY, .3)
        s.liv = ramp(base, 18)
        s.alt = ramp(LIV[s.per][(k + 3) % 7], 18)
        s.metal = RUST if s.w == 0 else (CHROME if s.rich else STEEL)
        s.trim = (BRASS if s.per in "VG" else CHROME) if s.rich else (IRON if s.per in "VG" else STEEL)
        s.make = int(v.get("make", 0))

    def axis(s, k, d): return s.v.get(k, d)


def _obj(fn, era0, off=4):
    """Wrap a drawing: a mirrored build where asked, and a short shadow south-east."""
    def draw(tm, x, y, w, h, st, v):
        c = C(v, st, era0); before = np.asarray(tm.img).copy()
        glows = fn(tm, x, y, w, h, st, v, c) or []
        if v.get("hand") == "left":                                                  # the mirror-built model
            fx0, _, fx1, _ = box_px(x, y, w, h, 0); im = np.asarray(tm.img).copy()
            im[:, fx0:fx1 + 1] = im[:, fx0:fx1 + 1][:, ::-1]; tm.img.paste(Image.fromarray(im), (0, 0))
            glows = [(fx0 + fx1 - gx, gy, gr, col) for gx, gy, gr, col in glows]
        a = np.asarray(tm.img).astype(np.float32); m = (np.abs(a - before.astype(np.float32)).sum(2) > 0)
        if not m.any(): return
        ys, xs = np.nonzero(m); bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
        rng = np.random.default_rng(int(bx0 * 7 + by0 * 13 + c.w * 31 + int(v.get("livery", 0)) * 5 + len(c.cond)))
        def pick():
            i = int(rng.integers(0, len(xs))); return xs[i], ys[i]
        yy, xx = np.ogrid[:a.shape[0], :a.shape[1]]
        big = (bx1 - bx0) * (by1 - by0)
        # no stamped rust, tape, stains, cracks or glints (the owner, 2026-11-15): poor is plainer, wear is core.wear_layer
        if off:
            sh = np.zeros_like(m); sh[off:, off - 1:] = m[:-off, :m.shape[1] - (off - 1)]; sh &= ~m
            a[sh] = before[sh].astype(np.float32) * np.array([.55, .56, .62], np.float32)
        tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
        for gx, gy, gr, col in glows:
            tm.glow(gx, gy, gr, col=col, power=.8)
    draw.__doc__ = fn.__doc__
    return draw


# ---------------------------------------------------------------- small parts
def case(d, x0, y0, x1, y1, Cl, r=0, out=OUT):
    """A painted or plastic case from above: outline, lit north and west edges, dark south and east edges."""
    x0, y0, x1, y1 = int(x0), int(y0), int(max(x1, x0 + 1)), int(max(y1, y0 + 1))
    if r: d.rounded_rectangle([x0, y0, x1, y1], min(r, (x1 - x0) // 2, (y1 - y0) // 2), fill=Cl[2], outline=out)
    else: d.rectangle([x0, y0, x1, y1], fill=Cl[2], outline=out)
    q = r // 2
    if x1 - x0 > 4 and y1 - y0 > 4:
        d.line([x0 + 1 + q, y0 + 1, x1 - 1 - q, y0 + 1], fill=Cl[4]); d.line([x0 + 1, y0 + 1 + q, x0 + 1, y1 - 1 - q], fill=Cl[3])
        d.line([x0 + 1 + q, y1 - 1, x1 - 1 - q, y1 - 1], fill=Cl[0]); d.line([x1 - 1, y0 + 1 + q, x1 - 1, y1 - 1 - q], fill=Cl[1])


def disc(d, cx, cy, r, Cl, out=OUT, ry=None):
    """A round top (a tank, a drum, a dome) lit from the north-west."""
    ry = ry or r
    d.ellipse([cx - r, cy - ry, cx + r, cy + ry], fill=Cl[1], outline=out)
    d.ellipse([cx - r + 2, cy - ry + 2, cx + r - 3, cy + ry - 3], fill=Cl[2])
    d.ellipse([cx - r * .55, cy - ry * .6, cx + r * .05, cy - ry * .05], fill=Cl[3])
    if r > 6: d.ellipse([cx - r * .45, cy - ry * .5, cx - r * .2, cy - ry * .25], fill=Cl[4])


def tube(d, x0, y0, x1, y1, Cl, vert=False, out=OUT):
    """A lying cylinder from above (a receiver tank, a pipe): banded light along its length."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    r = ((x1 - x0) if vert else (y1 - y0)) // 2
    d.rounded_rectangle([x0, y0, x1, y1], max(1, r), fill=Cl[1], outline=out)
    if vert:
        W = x1 - x0; d.rectangle([x0 + W * .2, y0 + 2, x0 + W * .6, y1 - 2], fill=Cl[2]); d.rectangle([x0 + W * .28, y0 + 3, x0 + W * .42, y1 - 3], fill=Cl[3])
        if W > 6: d.line([x0 + W * .32, y0 + 4, x0 + W * .32, y1 - 4], fill=Cl[4])
    else:
        H = y1 - y0; d.rectangle([x0 + 2, y0 + H * .2, x1 - 2, y0 + H * .6], fill=Cl[2]); d.rectangle([x0 + 3, y0 + H * .28, x1 - 3, y0 + H * .42], fill=Cl[3])
        if H > 6: d.line([x0 + 4, y0 + H * .32, x1 - 4, y0 + H * .32], fill=Cl[4])


def louvres(d, x0, y0, x1, y1, Cl, step=3, vert=False):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if vert:
        for k in range(x0, x1, step): d.line([k, y0, k, y1], fill=Cl[0]); d.line([k + 1, y0, k + 1, y1], fill=Cl[3])
    else:
        for k in range(y0, y1, step): d.line([x0, k, x1, k], fill=Cl[0]); d.line([x0, k + 1, x1, k + 1], fill=Cl[3])


def lamp(d, x, y, col, lit, r=2):
    d.ellipse([x - r, y - r, x + r, y + r], fill=col if lit else mix(col, (30, 30, 34), .7), outline=OUT)
    if lit: d.rectangle([x - 1, y - 1, x, y], fill=mix(col, (255, 255, 255), .6))


def dial(d, cx, cy, r, face=(230, 224, 204), needle=(30, 30, 30), ang=-.8, rim=None):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=face, outline=rim or OUT)
    d.line([cx, cy, cx + math.cos(ang) * (r - 1), cy + math.sin(ang) * (r - 1)], fill=needle, width=1)


def cable(d, pts, col=(34, 34, 38), w=2):
    d.line(pts, fill=OUT, width=w + 2, joint="curve"); d.line(pts, fill=col, width=w, joint="curve")


def sparks(d, x, y):
    x, y = int(x), int(y)
    d.line([x - 3, y, x + 3, y], fill=(255, 240, 140)); d.line([x, y - 3, x, y + 3], fill=(255, 240, 140))
    d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 230))
    d.rectangle([x + 4, y - 5, x + 5, y - 4], fill=(255, 210, 80)); d.rectangle([x - 6, y + 3, x - 5, y + 4], fill=(255, 210, 80))


def screen(d, x0, y0, x1, y1, lit, broken=False, tint=None):
    x0, y0, x1, y1 = int(x0), int(y0), int(max(x1, x0 + 2)), int(max(y1, y0 + 2))
    P = SCREEN_ON if lit and not broken else SCREEN_OFF
    if tint and lit and not broken: P = [mix(p, tint, .35) for p in P]
    d.rectangle([x0, y0, x1, y1], fill=P[1], outline=OUT)
    if lit and not broken and x1 - x0 > 4 and y1 - y0 > 4:
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, (y0 + y1) // 2], fill=P[2])
        d.rectangle([x0 + (x1 - x0) // 3, (y0 + y1) // 2 + 1, x0 + 2 * (x1 - x0) // 3, y1 - 2], fill=P[3])
    elif x1 - x0 > 6:
        d.line([x0 + 2, y0 + 2, x0 + min(x1 - x0, y1 - y0) // 2 + 2, y0 + 2], fill=P[3])
    if broken:
        cx, cy = x0 + (x1 - x0) * .4, y0 + (y1 - y0) * .45
        for a in (0.3, 1.4, 2.5, 3.6, 4.7, 5.6):
            L = max(x1 - x0, y1 - y0) * .5; ex, ey = cx + math.cos(a) * L, cy + math.sin(a) * L
            d.line([cx, cy, min(max(ex, x0 + 1), x1 - 1), min(max(ey, y0 + 1), y1 - 1)], fill=(200, 210, 220))


def hazard(d, x0, y0, x1, y1, s=5):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=HAZ[0])
    for k in range(x0 - (y1 - y0), x1, s * 2):
        cl = lambda u: max(x0, min(x1, u))
        pts = [(cl(k), y1), (cl(k + s), y1), (cl(k + s + (y1 - y0)), y0), (cl(k + (y1 - y0)), y0)]
        d.polygon(pts, fill=HAZ[1])
    d.rectangle([x0, y0, x1, y1], outline=OUT)


def bolt(d, x, y, Cl=STEEL):
    d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=Cl[1]); d.point((x - 1, y - 1), fill=Cl[4])


def glyphs(d, x0, y0, x1, y1, col):
    """Lettering suggested by shape only: short blocks of strokes along a line."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); k = x0
    while k < x1 - 2:
        L = min(x1 - k, 3 + (k * 7) % 5); d.rectangle([k, y0, k + L - 1, y1], fill=col); k += L + 2


def trefoil(d, cx, cy, r, bg=YEL[3], fg=(30, 28, 30)):
    """The radiation trefoil on its yellow disc."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg, outline=OUT)
    for k in range(3):
        a = -math.pi / 2 + k * 2 * math.pi / 3
        d.pieslice([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], math.degrees(a) - 30, math.degrees(a) + 30, fill=fg)
    d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], fill=bg); d.ellipse([cx - r * .18, cy - r * .18, cx + r * .18, cy + r * .18], fill=fg)


def smoke(d, x, y, k=3, col=(176, 176, 180)):
    for i in range(k):
        r = 3 + i * 2; d.ellipse([x + i * 5 - r, y - i * 3 - r, x + i * 5 + r, y - i * 3 + r], fill=tone(col, -i * 8))
        d.arc([x + i * 5 - r, y - i * 3 - r, x + i * 5 + r, y - i * 3 + r], 180, 270, fill=tone(col, 30))


def hose_coil(d, cx, cy, r, col, n=3):
    """A coiled hose or cable from above: rings inside each other."""
    for k in range(n):
        rr = r - k * 3
        if rr < 2: break
        d.ellipse([cx - rr, cy - rr * .8, cx + rr, cy + rr * .8], outline=OUT, width=3); d.ellipse([cx - rr, cy - rr * .8, cx + rr, cy + rr * .8], outline=col, width=1)


# ---------------------------------------------------------------- registering
_ROW = {r.id: r for r in CENSUS}


def reg(oid, fn, ref, off=4, axes=None, **kw):
    """Define an object from its census row: its rooms as tags, mass-made the world over from its first year."""
    row = _ROW[oid]; tags = tuple(p.split()[0] for p in row.where.split(","))
    ya = int(row.years.partition("-")[0])
    era0 = next(k for k, a, b, _n in ERAS if a <= ya <= b)
    ax = {"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"]}
    ax.update(axes or {})
    kw.setdefault("nvar", 24)
    define(oid, draw=_obj(fn, era0, off), tags=tags, ref=ref, axes=ax, global_from=kw.pop("global_from", next(a for _, a, b, _n in ERAS if a <= ya <= b)), **kw)


def mk(c, n): return int(c.make) % n


# ================================================================ workshop and factory
def _pumphead(d, cx, cy, r, c, twin=False, finned=True, Cl=None):
    """A compressor's pump from above: one or two finned cylinder heads on a crankcase."""
    Cl = Cl or IRON
    case(d, cx - r * 1.4, cy - r * .8, cx + r * 1.4, cy + r * .8, Cl, r=3)
    for k in ((-.65, .65) if twin else (0,)):
        hx = cx + k * r; rr = r * (.6 if twin else .8)
        d.ellipse([hx - rr, cy - rr, hx + rr, cy + rr], fill=Cl[3], outline=OUT)
        if finned:
            for q in range(1, 3): d.ellipse([hx - rr + q * 2, cy - rr + q * 2, hx + rr - q * 2, cy + rr - q * 2], outline=Cl[1])
        d.rectangle([hx - 1, cy - 1, hx + 1, cy + 1], fill=c.trim[3])


def aircompressor(tm, x, y, w, h, st, v, c):
    """An air compressor from above: its long receiver tank with the pump, motor and belt on top. Great War: a black
    riveted receiver with rows of rivets, a cast-iron single or twin pump with its spoked flywheel and a flat belt
    off to the line shaft. Mid-Century: an enamelled welded tank in the maker's colour, a finned V-twin pump, a
    mesh belt guard and a ribbed motor, wheels and a handle on the portable one. Modern: a painted tank under a
    plastic shroud, a quick coupler and a coiled yellow hose. Future Darkness: a quiet sealed cabinet with a lit
    panel. Running: the gauge needle up, the belt a blur and the lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx = X0 + W // 2
    if p == "F":
        case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 2, L, r=6)
        louvres(d, X0 + 6, Y0 + 8, X1 - 6, Y0 + H * .45, L, 4)
        case(d, X0 + 5, Y0 + H * .55, X1 - 5, Y0 + H * .72, ramp((30, 32, 38), 8), r=2)
        screen(d, X0 + 8, Y0 + H * .57, X1 - 8, Y0 + H * .7, c.on, c.broken, tint=(60, 200, 210))
        if m % 2: tube(d, X0 + 6, Y0 + H * .76, X1 - 6, Y1 - 6, c.alt)                              # a small buffer tank
        d.line([X0 + 4, Y1 - 4, X1 - 4, Y1 - 4], fill=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
        hose_coil(d, cx, Y0 + H * .3, 9, YEL[2] if m < 3 else (60, 120, 200), 2)
        return [(cx, Y1 - 4, 20, (.7, 1.2, 1.4))] if c.on and not c.broken else []
    upright = m == 4
    TK = L
    if p == "V":                                                                                     # a steam-driven straight-line compressor on its receiver
        tube(d, X0 + 3, Y0 + 4, X1 - 3, Y1 - 4, TK, vert=True)
        for k in (Y0 + 9, Y1 - 9):
            for q in range(X0 + 6, X1 - 5, 4): bolt(d, q, k, IRON)
        sc = BRASS if c.w >= 3 else ramp((120, 100, 70), 14)
        case(d, X0 + 5, Y0 + 14, X1 - 5, Y0 + 34, sc, r=4)                                           # the lagged steam cylinder
        for q in range(Y0 + 17, Y0 + 33, 4): d.line([X0 + 7, q, X1 - 7, q], fill=sc[1])
        d.rectangle([cx - 1, Y0 + 34, cx + 1, Y0 + 46], fill=STEEL[3], outline=OUT)                  # piston rod to the air cylinder
        disc(d, cx, Y0 + 54, W // 2 - 6, IRON); d.rectangle([X0 + 2, Y0 + 62, X1 - 2, Y0 + 66], fill=IRON[1], outline=OUT)   # the air cylinder and its flywheel
        cable(d, [(X1 - 5, Y0 + 20), (X1, Y0 + 12)], (150, 150, 150), 2)                             # the steam pipe
        dial(d, cx, Y1 - 14, 4, ang=-2.4 if not c.on else -.5, rim=c.trim[0])
        if c.on and not c.broken: smoke(d, X1 - 6, Y0 + 12, 2, (226, 226, 230))
        if c.broken: sparks(d, X1 - 6, Y0 + H * .5)
        return
    if upright:
        disc(d, cx, Y0 + H * .68, W // 2 - 2, TK)
        for a in range(8): bolt(d, cx + math.cos(a * .785) * (W // 2 - 6), Y0 + H * .68 + math.sin(a * .785) * (W // 2 - 6), c.trim)
        py = Y0 + H * .25
    else:
        tube(d, X0 + 3, Y0 + 4, X1 - 3, Y1 - 4, TK, vert=True)
        if p == "G":
            for k in (Y0 + 9, Y0 + 13, Y1 - 13, Y1 - 9):
                for q in range(X0 + 6, X1 - 5, 4): bolt(d, q, k, IRON)
        py = Y0 + H * .36
    pumpC = IRON if p == "G" else (c.alt if p == "M" else ramp((60, 62, 68), 12))
    if p == "N" and not upright:                                                                     # the plastic shroud
        case(d, X0 + 2, Y0 + 10, X1 - 2, Y0 + H * .55, c.alt, r=8); louvres(d, X0 + 8, Y0 + 16, X1 - 8, Y0 + H * .3, c.alt, 3)
        dial(d, X0 + 10, Y0 + H * .45, 4, ang=-2.2 if not c.on else -.6); dial(d, X1 - 10, Y0 + H * .45, 4, ang=-2.0 if not c.on else -.9)
        hose_coil(d, cx, Y0 + H * .76, 10, YEL[2] if m % 2 == 0 else (200, 60, 50), 3)
    else:
        _pumphead(d, cx, py, W * .26, c, twin=(m in (1, 3) or p == "M"), Cl=pumpC)
        fy = py + W * .32
        if p == "G":                                                                                  # spoked flywheel on edge and the flat belt
            d.rectangle([X0 + 2, fy - 3, X1 - 2, fy + 3], fill=IRON[2], outline=OUT)
            for q in range(X0 + 5, X1 - 3, 5): d.line([q, fy - 2, q, fy + 2], fill=IRON[4] if not c.on else IRON[3])
            d.line([X1 - 4, fy - 1, X1, fy - 8], fill=(110, 70, 40), width=3)
        else:                                                                                         # belt guard and motor
            gx0, gx1 = X0 + 4, X1 - 4
            case(d, gx0, fy - 4, gx1, fy + 6, ramp((70, 72, 76), 12) if p == "M" else c.alt, r=3)
            for q in range(gx0 + 3, gx1 - 2, 3): d.line([q, fy - 3, q, fy + 5], fill=(40, 40, 44) if not c.on else (110, 110, 116))
            my = fy + 14; case(d, X0 + 7, my - 6, X1 - 7, my + 6, ramp((90, 96, 104), 12) if m != 2 else RED, r=5)
            for q in range(X0 + 10, X1 - 9, 3): d.line([q, my - 5, q, my + 5], fill=ramp((90, 96, 104), 12)[1])
        dial(d, X1 - 8, Y0 + 8, 4, ang=-2.4 if not c.on else -.5)
        if m == 2 and p == "G":                                                                       # a petrol engine drive
            case(d, X0 + 4, Y1 - 30, X1 - 4, Y1 - 14, ramp((120, 40, 36), 14), r=3); d.ellipse([cx - 4, Y1 - 26, cx + 4, Y1 - 18], fill=BRASS[2], outline=OUT)
    if (m == 3 or p == "N") and not upright:                                                          # wheels and handle of a portable
        for wy in (Y1 - 16,):
            d.rectangle([X0, wy - 6, X0 + 3, wy + 6], fill=RUBBER[1], outline=OUT); d.rectangle([X1 - 3, wy - 6, X1, wy + 6], fill=RUBBER[1], outline=OUT)
        d.line([X0 + 6, Y0 + 2, X1 - 6, Y0 + 2], fill=c.metal[2], width=2)
    lamp(d, X0 + 7, Y0 + 7, (230, 70, 50) if p != "G" else (240, 200, 120), c.on, 2)
    if c.rich and p != "G": d.line([X0 + 5, Y1 - 6, X1 - 5, Y1 - 6], fill=CHROME[3], width=2)
    if c.broken: sparks(d, X1 - 6, Y0 + H * .5)


reg("aircompressor", aircompressor, "workshop receivers of 20 to 80 gallons, about 2 by 5 ft (Ingersoll-Rand and Champion catalogues; Clayton and Shuttleworth 1910s air sets)",
    states=("off", "on"), front=True, clear=2)


def anaesthetic(tm, x, y, w, h, st, v, c):
    """An anaesthetic machine from above. Great War: a wooden tray trolley with glass bottles of ether and
    chloroform, a pair of gas cylinders laid in their cradle, a rubber bag and mask. Mid-Century: a chrome Boyle's
    machine: the bank of glass flowmeter tubes, a vaporiser, upright cylinders at the back with their coloured
    shoulders, the black breathing bag and the corrugated hose looped to the mask. Modern: a grey or cream
    workstation with its monitor on top, coloured agent vaporisers and blue hoses. Future Darkness: a white sealed
    unit with a large screen. In use: the bag full, the floats up and the screen lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    O2 = [ramp((30, 30, 34), 8), WHITE] if m % 2 == 0 else [ramp((240, 240, 236), 8), WHITE]          # oxygen: black and white, or all white
    N2O = ramp((50, 80, 160), 16)
    MED = {"G": [(150, 112, 70), (104, 60, 40), (226, 224, 214), (180, 184, 186), (40, 40, 44), (120, 84, 54)],
           "F": [(236, 238, 240), (150, 160, 170), (150, 214, 200), (52, 56, 64), (120, 170, 220), (190, 160, 210)],
           "M": [(226, 220, 196), (170, 196, 176), (128, 134, 136), (196, 204, 212), (238, 238, 232), (130, 150, 170)],
           "N": [(150, 154, 158), (222, 214, 190), (236, 236, 232), (120, 140, 166), (196, 190, 170), (80, 84, 92)]}
    L = ramp(MED.get(p, MED["M"])[c.k % 6], 14)
    if p == "G":
        tray = L
        case(d, X0, Y0, X1, Y1, tray); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=tray[0])
        tube(d, X0 + 4, Y0 + 5, X1 - 4, Y0 + 12, O2[0]); tube(d, X0 + 4, Y0 + 14, X1 - 4, Y0 + 21, N2O)    # cylinders in their cradle
        for k in range(2 + m % 2):
            bx = X0 + 8 + k * 11
            d.ellipse([bx - 5, Y0 + 25, bx + 5, Y0 + 35], fill=GLASS[2], outline=GLASS[0]); d.ellipse([bx - 3, Y0 + 27, bx + 3, Y0 + 33], fill=(200, 160, 70) if k == 0 else (210, 200, 150))
            d.rectangle([bx - 1, Y0 + 29, bx + 1, Y0 + 31], fill=c.trim[3])
        bag = ramp((120, 60, 40), 12) if m < 3 else RUBBER
        d.ellipse([X1 - 15, Y1 - 15, X1 - 3, Y1 - 3], fill=bag[2 if c.on else 1], outline=OUT); d.line([X1 - 12, Y1 - 12, X1 - 8, Y1 - 12], fill=bag[4])
        cable(d, [(X1 - 9, Y1 - 14), (X0 + 10, Y1 - 8)], (60, 50, 44), 2)
        d.ellipse([X0 + 3, Y1 - 12, X0 + 13, Y1 - 3], fill=(60, 60, 64) if m % 2 else BRASS[2], outline=OUT)   # the mask
        return
    body = L
    case(d, X0, Y0 + 4, X1, Y1 - 2, body, r=2 if p == "M" else 5)
    if p in "MN":                                                                                    # cylinders at the back, shoulders seen
        for k, cl in enumerate((O2[0], N2O, O2[0], ramp((140, 140, 150), 10))[:2 + m % 3]):
            cx_ = X0 + 6 + k * 9
            if cx_ > X1 - 5: break
            d.ellipse([cx_ - 4, Y0, cx_ + 4, Y0 + 8], fill=cl[2], outline=OUT); d.ellipse([cx_ - 2, Y0 + 2, cx_ + 2, Y0 + 6], fill=O2[1][2] if cl is O2[0] else cl[4])
    if p == "M":
        fx = X0 + 4                                                                                   # flowmeter bank
        case(d, fx, Y0 + 11, fx + 18, Y0 + 26, ramp((60, 60, 66), 10))
        for k in range(4):
            tx = fx + 3 + k * 4; d.rectangle([tx, Y0 + 13, tx + 2, Y0 + 24], fill=GLASS[3])
            fy = Y0 + (14 if c.on else 22) + (k % 2) * 2; d.rectangle([tx, fy, tx + 2, fy + 1], fill=(220, 60, 40) if k % 2 else (40, 120, 200))
        vc = [ramp((200, 170, 60), 16), ramp((210, 120, 50), 16), ramp((130, 80, 160), 16), CHROME, ramp((70, 150, 90), 14)][m]
        disc(d, X1 - 9, Y0 + 18, 6, vc); dial(d, X1 - 9, Y0 + 18, 2)
        d.rectangle([X0 + 3, Y0 + 30, X1 - 3, Y0 + 33], fill=CHROME[3], outline=OUT)                  # the back bar
    elif p == "N":
        screen(d, X0 + 4, Y0 + 10, X1 - 4, Y0 + 22, c.on, c.broken, tint=(60, 200, 120))
        for k, vc in enumerate((ramp((150, 90, 170), 14), ramp((220, 190, 50), 14), ramp((60, 110, 200), 14))[:1 + m % 3]):
            disc(d, X0 + 7 + k * 9, Y0 + 28, 4, vc)
    else:
        case(d, X0 + 2, Y0 + 6, X1 - 2, Y1 - 4, L, r=8)
        if m % 2: screen(d, X0 + 5, Y0 + 9, X1 - 5, Y0 + 26, c.on, c.broken, tint=(80, 220, 200))
        else:
            screen(d, X0 + 5, Y0 + 9, X0 + W * .6, Y0 + 30, c.on, c.broken, tint=(80, 220, 200))
            disc(d, X1 - 9, Y0 + 15, 5, [ramp((150, 90, 170), 14), ramp((220, 190, 50), 14), ramp((60, 110, 200), 14)][m % 3])
        d.line([X0 + 6, Y1 - 8, X1 - 6, Y1 - 8], fill=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
    bag = RUBBER if p == "M" else (ramp((60, 110, 190), 12) if p == "N" else ramp((40, 140, 150), 12))
    by = Y1 - 9; r = 6 if c.on else 4
    hose = (40, 40, 44) if p == "M" else ((90, 140, 210) if p == "N" else (200, 210, 214))
    cable(d, [(X0 + W * .4, Y0 + 32), (X0 + 6, Y1 - 6), (X0 + W * .55, Y1 - 3)], hose, 3)
    d.ellipse([X1 - 6 - 2 * r, by - r, X1 - 4, by + r], fill=bag[2], outline=OUT); d.line([X1 - 3 - 2 * r, by - r + 2, X1 - 8, by - r + 2], fill=bag[4])
    if c.rich and p == "M": d.rectangle([X0 + 1, Y1 - 4, X1 - 1, Y1 - 2], fill=CHROME[3])


reg("anaesthetic", anaesthetic, "Boyle's machine trolley about 2 by 2 1/2 ft (British Oxygen Company catalogues; Shipway and Boyle apparatus, 1917)",
    states=("off", "on"), front=True, clear=2)


def arcfurnace(tm, x, y, w, h, st, v, c):
    """An electric arc furnace from above: the round shell on its working platform, the domed roof, the graphite
    electrodes through the roof held in their arms off the mast, the pouring spout to the south and the slag door to
    the west. Great War: a small brick-lined riveted shell, its arms off a girder gantry. Mid-Century: a bigger
    shell in the maker's paint with the water-cooled roof ring and hoses. Modern: hydraulic arms, a single electrode
    on the direct-current makes and yellow rails. Future Darkness: a dark sealed shell with lit seams. Melting: the
    white heat round the electrodes, the spout glowing and sparks."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    plat = ramp([(96, 96, 100), (120, 70, 50), (60, 62, 66), (110, 116, 96), (140, 136, 120)][m] if p != "F" else (48, 50, 58), 10)
    case(d, X0, Y0, X1, Y1, plat)                                                                    # the checker-plate platform
    for q in range(X0 + 6, X1 - 4, 10):
        for r_ in range(Y0 + 6 + (q // 10 % 2) * 5, Y1 - 4, 10): d.line([q, r_, q + 3, r_ + 2], fill=plat[3])
    if p in "NF": hazard(d, X0 + 2, Y1 - 10, X1 - 2, Y1 - 3)
    cx, cy = X0 + W * .46, Y0 + H * .46; R = min(W, H) * (.32 if p == "G" else .38)
    sp = [(cx - 12, cy + R - 6), (cx + 12, cy + R - 6), (cx + 6, cy + R + 22), (cx - 6, cy + R + 22)]  # the pouring spout
    d.polygon(sp, fill=FIREBRICK[1] if not c.on else HOT[1], outline=OUT)
    if c.on and not c.broken: d.polygon([(cx - 4, cy + R), (cx + 4, cy + R), (cx + 2, cy + R + 18), (cx - 2, cy + R + 18)], fill=HOT[3])
    d.rectangle([cx - R - 14, cy - 10, cx - R + 4, cy + 10], fill=IRON[2], outline=OUT)            # the slag door
    shell = L
    if p == "V":                                                                                       # Heroult's first tilting furnace: a squat box, two electrodes
        bx0, by0, bx1, by1 = cx - R, cy - R * .75, cx + R, cy + R * .75
        case(d, bx0, by0, bx1, by1, shell, r=10)
        for q in range(int(bx0) + 8, int(bx1) - 4, 10): bolt(d, q, by0 + 4, IRON); bolt(d, q, by1 - 4, IRON)
        rf = [BRICK, FIREBRICK, ramp((130, 96, 70), 12), ramp((96, 90, 86), 12), BRICK][m]
        d.rounded_rectangle([bx0 + 16, by0 + 14, bx1 - 16, by1 - 14], 8, fill=rf[2] if not c.on else HOT[2], outline=OUT)
        for q in range(int(by0) + 20, int(by1) - 14, 8): d.line([bx0 + 18, q, bx1 - 18, q], fill=rf[1] if not c.on else HOT[3])
        for k, ex in enumerate((cx - R * .35, cx + R * .35)):
            d.rectangle([ex - 4, Y0 + 8, ex + 4, cy - 6], fill=IRON[2], outline=OUT)                      # the hanging arms from the gantry
            d.ellipse([ex - 12, cy - 12, ex + 12, cy + 12], fill=COPPER[2], outline=OUT); d.ellipse([ex - 8, cy - 8, ex + 8, cy + 8], fill=(54, 54, 58), outline=OUT)
            d.ellipse([ex - 6, cy - 6, ex - 1, cy - 1], fill=(90, 90, 96))
        d.rectangle([X0 + 6, Y0 + 4, X1 - 6, Y0 + 14], fill=IRON[2], outline=OUT)
        for q in range(X0 + 10, X1 - 8, 12): d.line([q, Y0 + 5, q + 6, Y0 + 13], fill=IRON[3])
        for k in range(2): cable(d, [(cx - R * .35 + k * R * .7, Y0 + 14), (X1 - 10 + k * 3, Y0 + 30)], COPPER[1], 3)
        if c.on and not c.broken:
            sparks(d, cx, cy); return [(cx, cy, 110, (1.6, 1.0, .5)), (cx, cy + R + 16, 50, (1.7, .9, .4))]
        if c.broken: sparks(d, cx + R * .6, cy + R * .4)
        return
    disc(d, cx, cy, R, shell)
    if p == "G":
        for a in range(24): bolt(d, cx + math.cos(a * .262) * (R - 4), cy + math.sin(a * .262) * (R - 4), IRON)
    roof = [BRICK, FIREBRICK, ramp((110, 116, 124), 12), ramp((130, 96, 70), 12), ramp((80, 110, 130), 12)][(m + "GMNF".index(p)) % 5]
    d.ellipse([cx - R * .7, cy - R * .7, cx + R * .7, cy + R * .7], fill=roof[2], outline=OUT)
    if p == "G":
        for k in range(1, 4): d.ellipse([cx - R * .78 * k / 4, cy - R * .78 * k / 4, cx + R * .78 * k / 4, cy + R * .78 * k / 4], outline=roof[1])
    else:
        for a in range(12):                                                                            # water-cooled panels
            d.line([cx + math.cos(a * .524) * R * .4, cy + math.sin(a * .524) * R * .4, cx + math.cos(a * .524) * R * .78, cy + math.sin(a * .524) * R * .78], fill=roof[0])
        d.ellipse([cx - R * .84, cy - R * .84, cx + R * .84, cy + R * .84], outline=ramp((70, 110, 160), 12)[2], width=2)
    one = p in "NF" and m in (1, 3)
    els = [(cx, cy)] if one else [(cx + math.cos(a) * R * .26, cy + math.sin(a) * R * .26) for a in (math.pi, -math.pi / 3, math.pi / 3)]
    if c.on and not c.broken:
        d.ellipse([cx - R * .42, cy - R * .42, cx + R * .42, cy + R * .42], fill=HOT[2]); d.ellipse([cx - R * .3, cy - R * .3, cx + R * .3, cy + R * .3], fill=HOT[3])
    else:
        d.ellipse([cx - R * .4, cy - R * .4, cx + R * .4, cy + R * .4], fill=roof[1], outline=roof[0])
    mx = X1 - 14                                                                                       # the mast and the arms
    case(d, mx - 10, cy - 30, X1 - 3, cy + 30, ramp((70, 72, 78), 12) if p != "M" else c.alt)
    for k, (ex, ey) in enumerate(els):
        armC = c.alt if p != "G" else IRON
        ay = ey
        d.rectangle([ex, ay - 4, mx - 8, ay + 4], fill=armC[2], outline=OUT); d.line([ex + 2, ay - 3, mx - 9, ay - 3], fill=armC[4])
        er = 9 if one else 6
        d.ellipse([ex - er - 3, ey - er - 3, ex + er + 3, ey + er + 3], fill=COPPER[2] if p != "F" else ramp((80, 84, 96), 10)[2], outline=OUT)   # the clamp
        d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(54, 54, 58), outline=OUT); d.ellipse([ex - er + 2, ey - er + 2, ex - 1, ey - 1], fill=(90, 90, 96))
    if p == "G":                                                                                        # the gantry girder
        d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y0 + 16], fill=IRON[2], outline=OUT)
        for q in range(X0 + 10, X1 - 8, 12): d.line([q, Y0 + 7, q + 6, Y0 + 15], fill=IRON[3])
    else:
        for k in range(3): cable(d, [(mx - 2, cy - 24 + k * 6), (mx + 2, cy - 40 + k * 4), (X1 - 6, cy - 50 + k * 3)], (40, 40, 44) if p != "F" else (30, 80, 90), 3)
    if p == "F":
        d.arc([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], 0, 360, fill=(255, 120, 40) if c.on and not c.broken else (90, 50, 40), width=2)
    if m == 4 and p != "G":                                                                             # a scrap basket waiting
        case(d, X0 + 8, Y0 + 8, X0 + 50, Y0 + 50, IRON, r=6)
        for k in range(10): d.line([X0 + 12 + (k * 7) % 34, Y0 + 12 + (k * 11) % 34, X0 + 18 + (k * 5) % 30, Y0 + 16 + (k * 13) % 30], fill=RUST[3], width=2)
    if c.on and not c.broken:
        for k in range(5): sparks(d, cx + math.cos(k * 1.3) * R * .9, cy + R + 10 + (k % 2) * 6) if k < 2 else None
        return [(cx, cy, 120, (1.6, 1.0, .5)), (cx, cy + R + 16, 50, (1.7, .9, .4))]
    if c.broken: sparks(d, mx - 20, cy + 10)


reg("arcfurnace", arcfurnace, "Heroult furnaces of 3 to 15 ton, shells of 8 to 12 ft across on a platform of about 12 ft (Iron Age 1910s; Lectromelt catalogues)",
    states=("off", "on"), front=True, clear=4)


def ballmachine(tm, x, y, w, h, st, v, c):
    """A ball-throwing machine from above. Mid-Century: a painted metal box with its open hopper of yellow tennis
    balls on top, the throwing wheel's housing and the mouth to the south; a baseball pitcher with two wheels in a
    frame and a feed chute of white balls; a cricket bowling machine with red balls. Modern: a moulded plastic case,
    a pull handle and wheels, the hopper heaped. Future Darkness: a sleek shell with a sensor eye and a lit ring.
    Full or empty: the hopper heaped with balls, or showing its floor and a stray ball or two."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    full = st == "full"
    ball = [YEL, YEL, ramp((200, 220, 60), 14), WHITE, RED][m]
    if m == 3:                                                                                        # baseball: two wheels in a frame and a chute
        fr = c.metal if p != "F" else L
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=OUT, width=4); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=fr[2], width=2)
        for wx in (X0 + W * .3, X0 + W * .7):
            case(d, wx - 4, Y0 + H * .45, wx + 4, Y1 - 6, RUBBER, r=3); d.line([wx, Y0 + H * .48, wx, Y1 - 9], fill=RUBBER[4] if not c.on else RUBBER[0])
        for wx in (X0 + W * .15, X0 + W * .85): case(d, wx - 3, Y0 + H * .55, wx + 3, Y1 - 10, L, r=2)   # motors
        d.polygon([(X0 + W * .38, Y0 + 4), (X0 + W * .62, Y0 + 4), (X0 + W * .56, Y0 + H * .5), (X0 + W * .44, Y0 + H * .5)], fill=L[2], outline=OUT)
        n = 4 if full else 1
        for k in range(n): d.ellipse([X0 + W / 2 - 3, Y0 + 5 + k * 4, X0 + W / 2 + 3, Y0 + 11 + k * 4], fill=ball[3], outline=OUT); d.point((X0 + W / 2, Y0 + 7 + k * 4), fill=RED[2])
        return
    r = 6 if p == "M" else 9
    case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 2, L, r=r)
    if p == "F": d.rounded_rectangle([X0 + 3, Y0 + 4, X1 - 3, Y1 - 4], r, outline=GLOW[2] if c.on and not c.broken else GLOW[0])
    hx0, hy0, hx1, hy1 = X0 + 5, Y0 + 5, X1 - 5, Y0 + H * .68                                           # the hopper
    if p == "M": d.rectangle([hx0, hy0, hx1, hy1], fill=L[0], outline=OUT)
    else: d.rounded_rectangle([hx0, hy0, hx1, hy1], 5, fill=(30, 30, 34) if p == "N" else L[0], outline=OUT)
    if full:
        for row in range(3):
            for k in range(4):
                bx = hx0 + 4 + k * 6 + (row % 2) * 3; by = hy0 + 4 + row * 6
                if bx + 3 <= hx1 - 1: d.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=ball[2], outline=OUT); d.point((bx - 1, by - 1), fill=ball[4])
    else:
        d.ellipse([hx0 + 4, hy1 - 8, hx0 + 10, hy1 - 2], fill=ball[2], outline=OUT)
        d.line([(hx0 + hx1) / 2, hy0 + 3, (hx0 + hx1) / 2, hy1 - 3], fill=L[1])
    d.rectangle([X0 + W * .35, Y1 - 8, X0 + W * .65, Y1 - 2], fill=(26, 26, 30), outline=OUT)             # the mouth
    if p == "N" or m == 1: d.line([X0 + 5, Y0 + 1, X1 - 5, Y0 + 1], fill=c.metal[2], width=2)            # handle
    if p == "F": d.ellipse([X0 + W / 2 - 3, Y1 - 13, X0 + W / 2 + 3, Y1 - 9], fill=(30, 200, 230) if c.on else (30, 50, 60), outline=OUT)
    lamp(d, X1 - 7, Y1 - 6, (90, 220, 90), c.on, 1)


reg("ballmachine", ballmachine, "tennis ball machines of about 2 by 2 ft (Little Prince, Prince and Lobster catalogues); JUGS baseball pitching machines",
    states=("full", "empty"), front=True, clear=6, axes={"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"]})


def bandsaw(tm, x, y, w, h, st, v, c):
    """A band saw from above: the tall C-frame standing at the back and side, its upper and lower wheel covers two
    rounded bulges joined by the column, the bright blade running down from the upper cover through the slot in the
    square table, the guide block over the table, the fence beside the blade, a board half cut and a heap of
    sawdust. Victorian: a cast frame in its paint with brass lining, a wooden table. Great War: black or green
    japanned castings. Mid-Century: enamelled castings in the maker's grey or green and a motor. Modern: a painted
    steel frame and cabinet. Future Darkness: a dark frame with a lit blade guard. The butcher's one is stainless
    with a cut of meat on the table. Running: the blade a bright blur and the lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    meat = m == 4 and p != "V"
    frC = SS if meat else (L if p != "N" else c.alt)
    tb = WOOD if p == "V" else (SS if meat else ramp((140, 144, 148), 12))
    bx = X0 + W * .62                                                                                     # the blade's line
    case(d, X0 + 2, Y0 + H * .62, X0 + W * .56, Y1 - 1, frC, r=10)                                       # the lower wheel cover
    d.arc([X0 + 5, Y0 + H * .65, X0 + W * .53, Y1 - 4], 180, 270, fill=frC[4])
    case(d, X0 + 2, Y0 + 6, X0 + 11, Y1 - 6, ramp(tone(frC[2], -24), 14), r=3)                             # the column of the C
    case(d, X0 + 2, Y0 + 1, bx + 8, Y0 + H * .34, frC, r=10)                                              # the upper wheel cover
    d.arc([X0 + 5, Y0 + 4, bx + 5, Y0 + H * .34 - 3], 180, 270, fill=frC[4])
    d.ellipse([X0 + W * .3 - 3, Y0 + H * .17 - 3, X0 + W * .3 + 3, Y0 + H * .17 + 3], fill=frC[0], outline=OUT)   # the wheel's hub knob
    if p == "V":
        for q in range(int(X0 + 10), int(bx), 7): bolt(d, q, Y0 + 3, BRASS if c.w >= 3 else IRON)
    else:
        glyphs(d, X0 + 14, Y0 + H * .25, X0 + 28, Y0 + H * .25 + 1, frC[0])
    t0 = (X0 + W * .3, Y0 + H * .36, X1 - 3, Y1 - 9)                                                     # the square table
    case(d, *t0, tb)
    if p != "V": d.line([t0[0] + 2, t0[1] + (t0[3] - t0[1]) * .7, t0[2] - 2, t0[1] + (t0[3] - t0[1]) * .7], fill=tb[1])   # mitre slot
    d.line([bx, t0[1] + 2, bx, t0[3] - 2], fill=tb[0])                                                   # the blade slot
    fx = X0 + W * .4                                                                                     # the fence
    case(d, fx - 2, t0[1] + 2, fx + 2, t0[3] - 2, ramp((90, 96, 104), 12) if not meat else SS)
    if meat:
        d.ellipse([fx + 3, Y0 + H * .52, bx - 1, Y0 + H * .74], fill=(170, 60, 60), outline=OUT); d.ellipse([fx + 6, Y0 + H * .57, fx + 11, Y0 + H * .65], fill=(230, 220, 200))
    else:
        case(d, fx + 3, Y0 + H * .58, bx + 5, Y1 - 11, ramp((196, 160, 110), 14))                         # a board half through
        d.line([bx, Y0 + H * .58, bx, Y0 + H * .68], fill=(40, 30, 20))
    blade = (250, 250, 255) if c.on and not c.broken else (206, 212, 220)
    d.line([bx, Y0 + H * .34, bx, Y0 + H * .6], fill=OUT, width=4); d.line([bx, Y0 + H * .34, bx, Y0 + H * .6], fill=blade, width=2)   # the blade, down from the cover
    if c.on and not c.broken: d.line([bx + 1, Y0 + H * .36, bx + 1, Y0 + H * .56], fill=(170, 200, 230))
    gd = STEEL if not (p == "F") else ramp((40, 44, 52), 10)
    case(d, bx - 4, Y0 + H * .4, bx + 4, Y0 + H * .48, gd); d.point((bx - 2, Y0 + H * .42), fill=gd[4])     # the guide block
    if p == "F": d.line([bx + 4, Y0 + H * .4, bx + 4, Y0 + H * .48], fill=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
    dust = ((206, 180, 128), (226, 204, 156)) if not meat else ((228, 216, 206), (244, 238, 230))       # sawdust on the table and the floor
    d.ellipse([bx - 2, t0[3] - 6, bx + 10, t0[3] + 6], fill=dust[0]); d.ellipse([bx, t0[3] - 3, bx + 6, t0[3] + 3], fill=dust[1])
    d.ellipse([X1 - 14, Y1 - 7, X1 - 2, Y1 - 1], fill=dust[0])
    if p in "MN" and not meat: case(d, X0 + W * .36, Y1 - 9, X0 + W * .56, Y1 - 1, ramp((70, 76, 84), 10), r=3)   # motor
    lamp(d, X0 + 7, Y0 + H * .5, (230, 60, 40) if p != "V" else (200, 160, 80), c.on, 2)
    if c.broken: d.line([bx - 6, Y0 + H * .5, bx + 10, Y0 + H * .62], fill=(220, 224, 230))                 # a snapped blade


reg("bandsaw", bandsaw, "floor band saws with 14 to 20 in wheels on a stand of about 3 ft square (Delta Rockwell and Fay and Egan catalogues)",
    states=("off", "on"), front=True, clear=3)


# ================================================================ the laboratory
LABC = {"M": [(226, 220, 196), (170, 190, 176), (128, 134, 136), (196, 204, 212), (210, 196, 160), (110, 124, 140)],
        "N": [(222, 214, 190), (236, 236, 232), (150, 154, 158), (90, 120, 160), (196, 190, 170), (70, 74, 82)],
        "F": [(236, 238, 240), (40, 44, 52), (150, 214, 200), (120, 128, 140), (196, 206, 222), (70, 40, 60)]}


def labliv(c, alt=0):
    """A laboratory maker's case colour: cream, putty, grey and steel blue by age, white and dark later."""
    return ramp(LABC.get(c.per, LABC["M"])[(c.k + alt) % 6], 14)


def bioprinter(tm, x, y, w, h, st, v, c):
    """A bioprinter from above: a bench cabinet under a glass hood, the gantry rail across with its syringe heads
    of pink and amber bio-ink, the stage with a dish holding the printed tissue (an ear, a lattice, a row of dots,
    a vessel), the touch screen at the front. Modern: a beige or white box with a separate monitor beside it.
    Future Darkness: a smooth white or dark shell with a lit rim. Printing: the screen and the blue curing light."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 2, L, r=4 if p == "N" else 10)
    hx0, hy0, hx1, hy1 = X0 + 6, Y0 + 6, X1 - (24 if p == "N" else 6), Y1 - 14
    lit = c.on and not c.broken
    d.rectangle([hx0, hy0, hx1, hy1], fill=mix(GLASS[1], (60, 90, 200), .4) if lit else GLASS[1], outline=L[0])
    d.line([hx0 + 2, hy0 + 2, hx0 + 16, hy0 + 2], fill=GLASS[4]); d.line([hx0 + 2, hy0 + 2, hx0 + 2, hy0 + 10], fill=GLASS[3])
    ry = hy0 + (hy1 - hy0) * .3
    d.rectangle([hx0 + 2, ry - 2, hx1 - 2, ry + 2], fill=STEEL[2], outline=OUT)                         # the gantry rail
    inks = [(230, 130, 150), (220, 170, 70), (200, 90, 110), (150, 200, 210), (230, 210, 200)]
    n = 1 + m % 3
    for k in range(n):
        sx = hx0 + 10 + k * 8
        d.ellipse([sx - 3, ry - 4, sx + 3, ry + 4], fill=inks[(k + m) % 5], outline=OUT); d.point((sx - 1, ry - 2), fill=(255, 255, 255))
    dx, dy = (hx0 + hx1) // 2 + 4, hy0 + (hy1 - hy0) * .66; r = min(12, (hy1 - hy0) // 3)
    d.ellipse([dx - r, dy - r, dx + r, dy + r], fill=(220, 230, 234), outline=OUT); d.ellipse([dx - r + 2, dy - r + 2, dx + r - 2, dy + r - 2], fill=(236, 200, 190))
    t = (214, 110, 120)
    if m == 0: d.arc([dx - 6, dy - 7, dx + 5, dy + 7], 290, 250, fill=t, width=3); d.arc([dx - 3, dy - 3, dx + 2, dy + 3], 300, 230, fill=t)   # an ear
    elif m == 1:
        for q in range(-6, 7, 4): d.line([dx + q, dy - 6, dx + q, dy + 6], fill=t); d.line([dx - 6, dy + q, dx + 6, dy + q], fill=t)
    elif m == 2:
        for q in range(-1, 2):
            for qq in range(-1, 2): d.ellipse([dx + q * 5 - 2, dy + qq * 5 - 2, dx + q * 5 + 2, dy + qq * 5 + 2], fill=t)
    elif m == 3: d.line([dx - 7, dy + 4, dx - 2, dy - 2, dx + 3, dy + 1, dx + 7, dy - 5], fill=t, width=3)
    else: d.ellipse([dx - 5, dy - 4, dx + 5, dy + 4], fill=(170, 60, 70), outline=t)
    screen(d, X0 + 8, Y1 - 12, X0 + W * .5, Y1 - 5, c.on, c.broken, tint=(80, 160, 230))
    if p == "N":                                                                                     # the separate monitor and keyboard
        case(d, X1 - 21, Y0 + 6, X1 - 4, Y0 + 26, ramp((200, 194, 176), 12), r=2); screen(d, X1 - 19, Y0 + 9, X1 - 6, Y0 + 22, c.on, c.broken)
        d.rectangle([X1 - 21, Y0 + 30, X1 - 4, Y0 + 38], fill=(206, 200, 184), outline=OUT)
        for q in range(X1 - 19, X1 - 6, 3): d.line([q, Y0 + 32, q, Y0 + 36], fill=(150, 146, 136))
    else:
        d.rounded_rectangle([X0 + 3, Y0 + 4, X1 - 3, Y1 - 4], 9, outline=GLOW[2] if lit else GLOW[0])
    lamp(d, X1 - 8, Y1 - 8, (80, 200, 255), c.on, 2)
    if lit: return [(dx, dy, 22, (.7, .8, 1.6))]


reg("bioprinter", bioprinter, "benchtop bioprinters of about 3 to 4 ft by 2 1/2 ft on their cart (Organovo NovoGen MMX, 3D-Bioplotter and CELLINK literature)",
    states=("off", "on"), front=True, clear=2)


def bioreactor(tm, x, y, w, h, st, v, c):
    """Algae photobioreactor panels from above. Modern: a run of glass tubes along a frame, joined by U-bends at the
    ends, the culture green or red, with the pump and degassing tank at one end; or a row of flat clear panels
    standing across the frame, each green with an air line along its top. Future Darkness: the same in dark frames
    with lit edges. Running: bubbles rising and the culture bright; off: settled and dull."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cult = [(70, 150, 60), (140, 170, 50), (40, 120, 110), (170, 70, 50), (60, 110, 40), (110, 160, 90)][(c.k + m) % 6]
    if not c.on: cult = mix(cult, (60, 70, 50), .35)
    CU = ramp(cult, 16)
    fr = c.metal if p == "N" else ramp(LIV["F"][c.k % 7], 12)
    case(d, X0, Y0 + 1, X1, Y1 - 1, fr)
    px0 = X0 + 16
    case(d, X0 + 2, Y0 + 4, X0 + 14, Y1 - 4, L, r=3); disc(d, X0 + 8, Y0 + H // 2, 4, IRON)           # pump and degasser
    if m % 2 == 0:                                                                                   # tubes and U-bends
        n = 4 + m // 2
        for k in range(n):
            ty = Y0 + 4 + k * (H - 8) / n; th = (H - 8) / n - 2
            d.rounded_rectangle([px0, ty, X1 - 3, ty + th], int(th // 2), fill=CU[2], outline=mix(GLASS[0], CU[0], .5))
            d.line([px0 + 3, ty + 1, X1 - 6, ty + 1], fill=GLASS[4])
            if c.on and not c.broken:
                for q in range(px0 + 8 + k * 5, X1 - 6, 13): d.rectangle([q, ty + th / 2, q + 1, ty + th / 2 + 1], fill=CU[4])
        cable(d, [(X0 + 14, Y0 + 7), (px0 + 2, Y0 + 7)], STEEL[2], 2)
    else:                                                                                            # flat panels across the frame
        n = 9 + m
        step = (X1 - px0 - 2) / n
        for k in range(n):
            qx = px0 + k * step
            d.rectangle([qx, Y0 + 4, qx + step * .55, Y1 - 4], fill=CU[2], outline=mix(GLASS[0], CU[0], .5))
            d.line([qx + 1, Y0 + 5, qx + 1, Y1 - 5], fill=CU[4])
            if c.on and not c.broken: d.rectangle([qx + 2, Y0 + 10 + (k * 7) % (H - 20), qx + 3, Y0 + 11 + (k * 7) % (H - 20)], fill=(230, 250, 220))
        d.line([px0, Y0 + 3, X1 - 3, Y0 + 3], fill=STEEL[3], width=2)                                  # the air manifold
    if p == "F": d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=GLOW[2] if c.on and not c.broken else GLOW[0])
    lamp(d, X0 + 8, Y0 + 7, (90, 230, 90), c.on, 1)
    if c.broken:
        d.polygon([(X0 + W * .6, Y0 + 3), (X0 + W * .66, Y0 + H * .6), (X0 + W * .56, Y1 - 3)], fill=GLASS[3])
        d.ellipse([X0 + W * .55, Y1 - 6, X0 + W * .75, Y1 + 1], fill=CU[1])


reg("bioreactor", bioreactor, "tubular and flat-panel photobioreactors of 2 by 8 ft modules (Varicon Aqua BioFence; Subitec flat-panel reactors)",
    states=("on", "off"), front=False, clear=2)


def biotank(tm, x, y, w, h, st, v, c):
    """A Progenitor growth vat from above: a round glass vat in its clinical white or steel ring, the green fluid
    lit from below with a curled body growing inside (a grown man, a child, a beast, a mass of tissue), bubbles
    rising, the lid's hoses and cables running to a pillar with its readout, and the Progenitors' green helix on
    the ring. Mid-Century: a riveted steel ring, brass valves and a porthole lid. Modern: a white plastic housing
    and screens. Future Darkness: a dark sealed ring with lit seams. Full or drained: the body afloat, or the glass
    empty but for a green film and dregs."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    full = st == "full"
    ring = {"M": [STEEL, ramp((200, 200, 194), 10), IRON, ramp((180, 190, 186), 10), CHROME, ramp((150, 160, 150), 10)],
            "N": [PLASTIC_WHITE, ramp((230, 236, 232), 8), CHROME, ramp((210, 226, 220), 8), ramp((190, 196, 200), 8), STEEL],
            "F": [ramp((40, 44, 50), 10), ramp((226, 232, 230), 8), ramp((60, 70, 70), 10), CHROME, ramp((30, 34, 40), 8), ramp((80, 90, 96), 10)]}[p][c.k % 6]
    fl = [(80, 190, 110), (120, 200, 90), (60, 170, 150), (150, 200, 120), (90, 170, 80), (70, 160, 130)][(c.k + m) % 6]
    FL = ramp(fl, 16)
    cx, cy = X0 + W * .42, Y0 + H * .46; R = min(W, H) * .4
    pil = (X1 - 9, Y0 + 4, X1 - 1, Y1 - 6)                                                           # the pillar with its readout
    case(d, *pil, ring, r=2); screen(d, pil[0] + 2, pil[1] + 4, pil[2] - 2, pil[1] + 14, full and not c.broken, c.broken, tint=(80, 220, 120))
    for k in range(3): cable(d, [(pil[0], pil[1] + 18 + k * 5), (cx + R * .3, cy + R * .3 + k * 2)], [(40, 40, 44), (60, 140, 90), (200, 200, 196)][k], 2)
    d.ellipse([cx - R - 3, cy - R - 3, cx + R + 3, cy + R + 3], fill=ring[2], outline=OUT)           # the ring
    d.ellipse([cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], outline=ring[4])
    if p == "M":
        for a in range(12): bolt(d, cx + math.cos(a * .524) * (R + 1), cy + math.sin(a * .524) * (R + 1), BRASS if c.rich else IRON)
    if full and not c.broken:
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=FL[2], outline=FL[0])
        d.ellipse([cx - R * .7, cy - R * .7, cx + R * .5, cy + R * .5], fill=FL[3])
        sk = (226, 186, 170) if m != 2 else (120, 100, 80)
        if m == 3:                                                                                    # a mass of tissue
            for q in range(5): d.ellipse([cx - 6 + q * 3 - 4, cy - 4 + (q % 2) * 4 - 4, cx - 6 + q * 3 + 4, cy - 4 + (q % 2) * 4 + 4], fill=(200, 120, 120), outline=(150, 70, 80))
        else:
            s = .8 if m == 1 else 1.3                                                                   # a curled body: head, back, arms, knees
            ol = mix(sk, (30, 60, 40), .6)
            d.arc([cx - 10 * s, cy - 7 * s, cx + 8 * s, cy + 11 * s], 190, 80, fill=ol, width=max(4, int(7 * s)) + 2)
            d.arc([cx - 9 * s, cy - 6 * s, cx + 7 * s, cy + 10 * s], 195, 75, fill=sk, width=max(3, int(6 * s)))
            d.line([cx - 4 * s, cy - 2 * s, cx + 2 * s, cy + 3 * s], fill=tone(sk, -24), width=max(2, int(3 * s)))   # the arm
            d.line([cx + 5 * s, cy + 8 * s, cx - 3 * s, cy + 6 * s], fill=sk, width=max(2, int(4 * s)))              # the knees drawn up
            d.ellipse([cx - 11 * s, cy - 12 * s, cx - 2 * s, cy - 3 * s], fill=sk, outline=ol)                     # the head
            d.arc([cx - 11 * s, cy - 12 * s, cx - 2 * s, cy - 3 * s], 180, 300, fill=(60, 40, 30) if m != 2 else (90, 70, 50), width=2)
            if m == 2: d.line([cx + 7 * s, cy - 2 * s, cx + 12 * s, cy - 8 * s], fill=sk, width=2)    # a beast's tail
        for q in range(4): d.ellipse([cx + R * .3 + (q % 2) * 4, cy - R * .7 + q * 6, cx + R * .3 + (q % 2) * 4 + 2, cy - R * .7 + q * 6 + 2], fill=FL[4])
    else:
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GLASS[1], outline=GLASS[0])
        d.ellipse([cx - R + 3, cy - R + 3, cx + R - 3, cy + R - 3], outline=FL[1], width=2)          # the green film
        d.ellipse([cx - 5, cy + R * .4, cx + 7, cy + R * .7], fill=FL[0])
        if c.broken:
            for a in (0.5, 1.6, 2.8, 4.1, 5.3): d.line([cx, cy, cx + math.cos(a) * R, cy + math.sin(a) * R], fill=GLASS[4])
            d.ellipse([cx + R * .2, cy + R * .6, cx + R + 6, Y1 - 1], fill=FL[2])
    d.line([cx - R * .6, cy - R * .6, cx - R * .2, cy - R * .8], fill=(240, 250, 250))                 # glare on the glass
    hx, hy = cx - R * .78, cy + R * .78                                                                 # the Progenitor helix mark on the ring
    d.ellipse([hx - 5, hy - 5, hx + 5, hy + 5], fill=(30, 110, 70), outline=OUT)
    d.arc([hx - 3, hy - 4, hx + 3, hy + 4], 270, 90, fill=(170, 240, 190)); d.arc([hx - 3, hy - 4, hx + 3, hy + 4], 90, 270, fill=(110, 200, 150))


reg("biotank", biotank, "growth and clone tanks of about 3 ft across, after laboratory culture vessels and bioreactor vats of 200 to 500 litres (Sartorius and New Brunswick catalogues)",
    states=("full", "empty"), front=False, clear=2)


def cardreader(tm, x, y, w, h, st, v, c):
    """A card or badge reader on its wall, from above: its small box. Mid-Century: a grey or beige box with a swipe
    slot and a red lamp. Modern: a black proximity pad, some with a keypad. Future Darkness: a dark glass pad with
    a lit ring. Granted: the lamp green; locked: red."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    PAL = {"M": [(150, 150, 146), (200, 190, 160), (60, 60, 64), (120, 130, 150), (170, 160, 130), (90, 100, 90)],
           "N": [(40, 40, 44), (200, 200, 196), (90, 94, 100), (30, 50, 90), (150, 150, 150), (70, 50, 40)],
           "F": [(24, 26, 30), (220, 224, 228), (60, 30, 40), (30, 70, 80), (100, 104, 110), (50, 46, 70)]}[p]
    L = ramp(PAL[c.k % 6], 14)
    case(d, X0, Y0, X1, Y1, L, r=1 if p == "M" else 2)
    ok = st == "on"
    lc = (60, 230, 90) if ok else (240, 50, 40)
    if m == 1: d.rectangle([X0 + 1, Y0 + 1, X0 + W // 2, Y1 - 1], fill=tone(L[1], -30))                 # a keypad half
    elif m == 2: d.rectangle([X0 + 1, Y1 - 2, X1 - 1, Y1 - 1], fill=(236, 232, 220))                    # a maker's label
    elif m == 3: d.rectangle([X1 - 3, Y0 + 1, X1 - 1, Y1 - 1], fill=[(200, 50, 40), (50, 90, 190), (230, 190, 50)][c.k % 3])
    elif m == 4: d.rectangle([X0, Y0, X1, Y1], outline=CHROME[3])
    if p == "M":
        d.line([X0 + 1, Y0 + 2, X1 - 3, Y0 + 2], fill=(20, 20, 22))                                    # the swipe slot
        d.rectangle([X1 - 3, Y1 - 3, X1 - 1, Y1 - 1], fill=lc)
    elif p == "N":
        if m % 2: d.rectangle([X0 + 1, Y0 + 1, X0 + W // 2, Y1 - 1], fill=L[1]); d.point((X0 + 2, Y0 + 2), fill=L[4])   # keypad
        d.rectangle([X1 - 3, Y0 + 1, X1 - 1, Y0 + 2], fill=lc)
    else:
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=lc if m % 2 else mix(lc, (60, 200, 230), .6))
    if c.broken: d.line([X0, Y1, X1, Y0], fill=(240, 240, 230))


reg("cardreader", cardreader, "wall readers of about 3 by 5 in on a 6 in back box (HID ProxPoint and Wiegand swipe readers)",
    ft=((.4, .6), (.25, .4)), states=("off", "on"), front=True, clear=1, mount="wall", off=1)


def chainhoist(tm, x, y, w, h, st, v, c):
    """A chain hoist hung from overhead, seen from above: the beam it runs on, its trolley wheels, the round gear
    housing, the hand chain hanging in a loop, the load chain and the hook, and whatever hangs from it (a crate, an
    engine block, a sling of pipes). Victorian: a differential pulley block's iron sheave from a timber beam.
    Great War: a black spur-geared block on a trolley. Mid-Century: an electric hoist in the maker's colour with
    its pendant on a cable. Modern and Future Darkness: a yellow or orange electric hoist, its pendant, a dark one
    with a lit strip."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    by = Y0 + H * .3
    beam = [DARKWOOD, WOOD, ramp((90, 92, 96), 12), ramp((140, 110, 74), 14), IRON][m] if p == "V" else ramp((90, 92, 96), 12)
    case(d, X0, by - 5, X1, by + 5, beam)                                                              # the beam overhead
    if p != "V": d.line([X0 + 1, by, X1 - 1, by], fill=beam[0])
    d.rectangle([X0, by + 5, X1, by + 8], fill=tone(beam[0], -10))                                     # the beam's shadow on the floor below
    load = int(c.axis("load", 0)) % 4
    cx = X0 + W * .45
    ly = Y1 - 7
    if load == 1: case(d, cx - 11, ly - 6, cx + 11, ly + 6, ramp((170, 130, 80), 14)); d.line([cx - 10, ly, cx + 10, ly], fill=ramp((170, 130, 80), 14)[0])
    elif load == 2:
        case(d, cx - 11, ly - 6, cx + 11, ly + 6, ramp((80, 84, 90), 12), r=2)
        for q in range(4): d.ellipse([cx - 9 + q * 5, ly - 2, cx - 6 + q * 5, ly + 1], fill=(40, 40, 44))
    elif load == 3:
        for q in range(3): tube(d, cx - 13, ly - 6 + q * 4, cx + 13, ly - 3 + q * 4, RUST if c.poor else STEEL)
    d.line([cx, by, cx, ly - (6 if load else 0)], fill=(70, 70, 76), width=2)                          # load chain
    for q in range(int(by) + 2, int(ly) - 4, 3): d.point((cx, q), fill=(170, 170, 176))
    if p == "V":
        disc(d, cx, by, 10, IRON if c.k % 2 else ramp(LIV["V"][c.k % 7], 14))
        d.ellipse([cx - 6, by - 6, cx + 6, by + 6], outline=IRON[0]); d.ellipse([cx - 2, by - 2, cx + 2, by + 2], fill=BRASS[2] if c.rich else IRON[3])
        if m % 2: disc(d, cx - 12, by + 6, 6, IRON)                                                      # the lower running block
    else:
        for wx in (cx - 9, cx + 7): d.rectangle([wx, by - 7, wx + 3, by + 7], fill=STEEL[1], outline=OUT)  # trolley wheels
        body = IRON if p == "G" and c.k % 2 == 0 else L
        if p == "G" and m >= 3:                                                                              # a boxed spur-geared block with its hand wheel
            case(d, cx - 11, by - 7, cx + 9, by + 7, body, r=2); d.ellipse([cx + 5, by - 9, cx + 15, by + 9], outline=OUT, width=3); d.ellipse([cx + 6, by - 8, cx + 14, by + 8], outline=body[3])
        elif p == "G": disc(d, cx, by, 9, body); d.rectangle([cx + 6, by - 4, cx + 14, by + 4], fill=body[1], outline=OUT)
        else:
            case(d, cx - 12, by - 8, cx + 14, by + 8, body, r=5); louvres(d, cx - 8, by - 5, cx + 2, by + 5, body, 3, vert=True)
            if p == "F": d.line([cx - 10, by + 6, cx + 12, by + 6], fill=GLOW[2])
    if p in "VG":                                                                                       # the hand chain's loop
        hx = cx + 14
        d.ellipse([hx - 4, by + 4, hx + 5, Y1 - 3], outline=(60, 60, 64), width=2)
        for q in range(int(by) + 6, int(Y1) - 4, 4): d.point((hx - 4, q), fill=(170, 170, 176)); d.point((hx + 5, q + 2), fill=(170, 170, 176))
    else:                                                                                               # pendant on its cable
        px_ = cx + 16; cable(d, [(cx + 12, by + 6), (px_, Y1 - 12)], (30, 30, 34), 1)
        case(d, px_ - 4, Y1 - 13, px_ + 4, Y1 - 2, YEL if p != "F" else ramp((40, 40, 46), 10), r=2)
        lamp(d, px_, Y1 - 9, (90, 220, 90), True, 1); lamp(d, px_, Y1 - 5, (230, 60, 40), False, 1)
    hb = YEL if p in "MNF" else (RED if c.k % 2 else IRON)                                              # the hook block, below the hoist
    hy = by + 13
    if load: d.line([cx - 9, ly - 6, cx, hy + 3, cx + 9, ly - 6], fill=(40, 40, 44))                      # the sling up to the hook
    case(d, cx - 4, hy - 3, cx + 4, hy + 3, hb, r=2)
    d.arc([cx - 4, hy + 1, cx + 4, hy + 9], 300, 220, fill=OUT, width=4); d.arc([cx - 4, hy + 1, cx + 4, hy + 9], 300, 220, fill=STEEL[3], width=2)   # the hook
    if c.broken: d.line([cx + 2, by + 8, cx + 10, ly], fill=(70, 70, 76), width=2)


reg("chainhoist", chainhoist, "one to five ton hoists of about 1 1/2 ft across with a lift of 10 ft (Weston differential blocks; Yale and Towne spur-geared and electric hoists)",
    front=False, clear=0, axes={"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"], "load": [0, 1, 2, 3]}, off=5)


def chromatograph(tm, x, y, w, h, st, v, c):
    """A chromatograph on its bench from above. Mid-Century: a gas chromatograph's cabinet with its injector ports,
    copper gas lines, dials and the strip-chart recorder's paper with its red trace of peaks. Modern: a beige box
    with a small display and the round autosampler tray of vials on top, or a liquid chromatograph's stack with
    its solvent bottles. Future Darkness: a dark or white unit with a screen. Running: the lamps, a fresh trace."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    lc = m % 2 == 1                                                                                    # liquid rather than gas
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=2 if p == "M" else 5)
    if lc:                                                                                             # the solvent tray
        d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y0 + 14], fill=L[0], outline=OUT)
        for k in range(4):
            bx = X0 + 8 + k * 7; d.ellipse([bx - 3, Y0 + 6, bx + 3, Y0 + 12], fill=GLASS[3], outline=OUT)
            d.ellipse([bx - 1, Y0 + 8, bx + 1, Y0 + 10], fill=[(200, 60, 50), (60, 110, 200), (230, 190, 60), (60, 160, 90)][k])
    else:
        for k in range(2): d.ellipse([X0 + 6 + k * 8, Y0 + 5, X0 + 11 + k * 8, Y0 + 10], fill=c.trim[3], outline=OUT)   # injector ports
        d.line([X0 + 4, Y0 + 13, X1 - 4, Y0 + 13], fill=COPPER[2], width=2)
    if p == "M":
        d.rectangle([X0 + 5, Y0 + 18, X1 - 5, Y1 - 9], fill=(240, 236, 220), outline=OUT)              # chart paper and its trace
        for q in range(X0 + 9, X1 - 5, 5): d.line([q, Y0 + 19, q, Y1 - 10], fill=(200, 220, 210))
        pts = []; base = Y1 - 12
        for q in range(X0 + 6, X1 - 6, 2): pts.append((q, base - (9 if (q - X0) % 11 in (0, 1) and c.on else 0) * (1 + (q % 3) * .3)))
        d.line(pts, fill=(200, 40, 40))
        dial(d, X0 + 7, Y1 - 5, 2); dial(d, X0 + 14, Y1 - 5, 2)
    elif p == "F":                                                                                     # a sealed unit: a rack of vials under a lid and a wide screen
        d.rounded_rectangle([X0 + 4, Y0 + (17 if lc else 5), X1 - 4, Y0 + H * .55], 5, fill=GLASS[1], outline=OUT)
        for q in range(4):
            for r_ in range(2): d.ellipse([X0 + 8 + q * 6, Y0 + (20 if lc else 8) + r_ * 6, X0 + 12 + q * 6, Y0 + (24 if lc else 12) + r_ * 6], fill=GLASS[3] if (q + r_) % 3 else (200, 80, 160), outline=OUT)
        screen(d, X0 + 3, Y1 - 13, X1 - 3, Y1 - 4, c.on, c.broken, tint=(90, 220, 200))
        d.line([X0 + 4, Y0 + H * .6, X1 - 4, Y0 + H * .6], fill=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
    else:
        screen(d, X0 + 5, Y1 - 12, X0 + W * .6, Y1 - 4, c.on, c.broken, tint=(90, 220, 120))
        if not lc:                                                                                     # the autosampler carousel
            cx, cy, r = X0 + W * .55, Y0 + H * .52, 9
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[1], outline=OUT)
            for a in range(10): d.ellipse([cx + math.cos(a * .628) * 6 - 1.5, cy + math.sin(a * .628) * 6 - 1.5, cx + math.cos(a * .628) * 6 + 1.5, cy + math.sin(a * .628) * 6 + 1.5], fill=GLASS[3] if a % 3 else (60, 90, 200))
        else:
            louvres(d, X0 + 5, Y0 + 18, X1 - 5, Y1 - 15, L, 4)
    lamp(d, X1 - 6, Y1 - 6, (90, 220, 90), c.on, 2)
    if c.broken: sparks(d, X1 - 8, Y0 + 14)


reg("chromatograph", chromatograph, "bench gas chromatographs of about 2 by 2 ft (Perkin-Elmer 154 of 1955; Hewlett-Packard 5890 and Agilent 1100 literature)",
    states=("off", "on"), front=True, clear=2)


# ================================================================ yards, kitchens and wards
def compactor(tm, x, y, w, h, st, v, c):
    """A scrap baler or compactor from above: the long steel box of its chamber with heavy ribs, the hydraulic ram's
    cylinder at one end and its power pack, the open loading hopper showing what it crushes (scrap iron, flattened
    cans, cardboard, car bodies) and a finished bale at the far end. Mid-Century: riveted plate in green or grey.
    Modern: welded plate in the maker's yellow, blue or red with hazard stripes. Future Darkness: a dark armoured
    box with lit warning strips. Full or empty: the hopper heaped, or bare and stained."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    full = st == "full"
    ram_w = W * .28
    case(d, X0 + 1, Y0 + H * .25, X0 + ram_w, Y1 - H * .25, c.alt, r=3)                                  # power pack
    tube(d, X0 + 6, Y0 + H * .4, X0 + ram_w + 14, Y0 + H * .6, CHROME if c.w >= 3 else STEEL)          # the ram cylinder
    if p == "M":
        dial(d, X0 + 10, Y0 + H * .3, 4)
    else:
        case(d, X0 + 4, Y0 + H * .27, X0 + 22, Y0 + H * .36, ramp((40, 40, 44), 8)); lamp(d, X0 + 8, Y0 + H * .315, (90, 220, 90), full, 2)
    bx0 = X0 + ram_w + 6
    case(d, bx0, Y0 + 2, X1 - 1, Y1 - 2, L)                                                            # the chamber
    for q in range(int(bx0) + 10, int(X1) - 4, 18):                                                     # ribs
        d.rectangle([q, Y0 + 2, q + 4, Y1 - 2], fill=L[3], outline=OUT)
        if p == "M":
            for r_ in range(int(Y0) + 6, int(Y1) - 4, 8): bolt(d, q + 2, r_, L)
    hx0, hy0, hx1, hy1 = bx0 + 8, Y0 + 10, X1 - W * .25, Y1 - 10                                         # the hopper
    d.rectangle([hx0, hy0, hx1, hy1], fill=(36, 34, 34), outline=OUT)
    load = int(c.axis("load", 0)) % 4
    rng = np.random.default_rng(int(c.k * 7 + m * 3 + load))
    if full:
        for k in range(int((hx1 - hx0) * (hy1 - hy0) / 40)):
            px_, py_ = rng.uniform(hx0 + 3, hx1 - 8), rng.uniform(hy0 + 3, hy1 - 6)
            if load == 0: d.line([px_, py_, px_ + rng.uniform(-6, 8), py_ + rng.uniform(-4, 5)], fill=[RUST[3], RUST[2], STEEL[2], IRON[3]][k % 4], width=2)
            elif load == 1: d.ellipse([px_, py_, px_ + 5, py_ + 3], fill=[(200, 40, 40), (200, 200, 206), (60, 120, 200), (230, 190, 50)][k % 4], outline=OUT)
            elif load == 2: d.rectangle([px_, py_, px_ + 8, py_ + 5], fill=[(176, 140, 96), (150, 116, 80), (196, 170, 120)][k % 3], outline=(110, 84, 56))
            else: d.polygon([(px_, py_), (px_ + 9, py_ + 2), (px_ + 6, py_ + 7)], fill=[(140, 40, 40), (60, 90, 140), (180, 180, 170), (40, 90, 60)][k % 4], outline=OUT)
    else:
        d.ellipse([hx0 + 10, hy0 + 8, hx0 + 40, hy1 - 6], fill=(54, 46, 40))
    bl = [RUST, ramp((180, 180, 186), 12), ramp((170, 136, 92), 12), ramp((120, 60, 50), 12)][load]       # a finished bale
    case(d, hx1 + 8, Y0 + H * .3, X1 - 6, Y1 - H * .3, bl)
    for q in range(int(Y0 + H * .3) + 4, int(Y1 - H * .3), 4): d.line([hx1 + 9, q, X1 - 7, q], fill=bl[0])
    d.line([hx1 + 14, Y0 + H * .3, hx1 + 14, Y1 - H * .3], fill=STEEL[3])
    if p in "NF": hazard(d, bx0 + 2, Y1 - 8, X1 - 4, Y1 - 4)
    if p == "F": d.line([bx0 + 2, Y0 + 5, X1 - 4, Y0 + 5], fill=(255, 140, 40) if full else (90, 50, 30), width=2)


reg("compactor", compactor, "scrap balers with a chamber of about 8 by 4 ft (Harris and Lindemann baling presses; Marathon and Waste Quip compactors)",
    states=("full", "empty"), front=True, clear=4, axes={"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"], "load": [0, 1, 2, 3]})


def deepfryer(tm, x, y, w, h, st, v, c):
    """A deep fryer against its wall, from above: the oil well (one or two), the baskets with their long handles to
    the front, the flue at the back and the control knobs. Mid-Century: a cream or green enamel gas fryer with a
    chrome rim. Modern: stainless steel. Future Darkness: stainless with a touch panel and a lit strip. Frying: the
    oil bubbling gold with chips in the basket; cold: the oil dark and still, the baskets hung up."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    body = {"M": [ramp((226, 218, 190), 12), ramp((120, 170, 140), 12), ramp((180, 60, 50), 14), CHROME, ramp((90, 110, 140), 12), ramp((200, 196, 186), 10)],
            "N": [SS, ramp((150, 154, 158), 12), ramp((190, 194, 196), 10), ramp((60, 62, 66), 10), SS, ramp((170, 60, 50), 14)],
            "F": [SS, ramp((40, 42, 48), 10), ramp((210, 214, 218), 8), ramp((70, 40, 44), 10), ramp((140, 146, 152), 10), ramp((30, 70, 80), 10)]}[p][c.k % 6]
    hot = c.on and not c.broken
    case(d, X0, Y0, X1, Y1, body, r=2)
    d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y0 + 8], fill=IRON[1], outline=OUT)                            # the flue at the back
    louvres(d, X0 + 5, Y0 + 3, X1 - 5, Y0 + 7, IRON, 2)
    twin = m % 2 == 1
    wells = [(X0 + 3, X0 + W // 2 - 1), (X0 + W // 2 + 1, X1 - 3)] if twin else [(X0 + 4, X1 - 4)]
    for k, (a, b) in enumerate(wells):
        wy0, wy1 = Y0 + 11, Y1 - 12
        oil = ramp((214, 160, 50), 16) if hot else ramp((110, 80, 30), 10)
        if c.poor: oil = ramp(mix(oil[2], (60, 40, 20), .4), 10)
        d.rectangle([a, wy0, b, wy1], fill=oil[1], outline=OUT); d.rectangle([a + 2, wy0 + 2, b - 2, wy1 - 2], fill=oil[2])
        if hot:
            for q in range(4): d.ellipse([a + 3 + (q * 5) % max(4, b - a - 6), wy0 + 4 + q * 6, a + 6 + (q * 5) % max(4, b - a - 6), wy0 + 7 + q * 6], outline=oil[4])
            ba = (a + 1, wy0 + 3, b - 1, wy1 - 3)                                                          # the basket down in the oil, with chips
            d.rectangle(ba, outline=STEEL[3])
            for q in range(6): d.rectangle([a + 3 + (q * 3) % max(3, b - a - 6), wy0 + 6 + q * 3, a + 6 + (q * 3) % max(3, b - a - 6), wy0 + 7 + q * 3], fill=(240, 200, 100))
        else:
            d.rectangle([a + 1, wy0 - 7, b - 1, wy0 - 2], fill=STEEL[1], outline=STEEL[3])                # the basket hung up over the flue
            for q in range(a + 3, b - 1, 3): d.line([q, wy0 - 6, q, wy0 - 3], fill=STEEL[3])
        hx = (a + b) // 2; d.line([hx, wy1 - 2, hx, Y1 - 4], fill=(30, 30, 30) if p != "M" else DARKWOOD[1], width=3)   # basket handle
    for k in range(2 if p != "F" else 0): d.ellipse([X0 + 4 + k * 6, Y1 - 7, X0 + 8 + k * 6, Y1 - 3], fill=(30, 30, 30), outline=OUT)
    if p == "F": d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=(255, 150, 60) if hot else GLOW[0], width=2)
    lamp(d, X1 - 6, Y1 - 5, (240, 160, 40), hot, 1)
    if c.broken: d.ellipse([X0 + 4, Y1 - 10, X1, Y1 + 3], fill=(120, 90, 40))                          # spilt oil


reg("deepfryer", deepfryer, "commercial fryers of 15 to 20 in wide and about 2 1/2 ft deep (Frymaster and Pitco catalogues; Henny Penny)",
    states=("off", "on"), front=True, clear=3, mount="wall")


def dialysis(tm, x, y, w, h, st, v, c):
    """A dialysis machine from above. Mid-Century: a Kolff-Brigham style console, the round tub of dialysate with
    its coil, a cream or green cabinet with dials. Modern: a tower with a screen on top, the round blood pump's
    rotor, the dialyser cylinder clipped to its side and the red and blue lines. Future Darkness: a slim white
    unit with a large screen. Running: blood red in the lines and the screen lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c, 1)
    if p == "N": L = ramp([(238, 238, 234), (160, 196, 220), (130, 134, 140), (170, 214, 190), (226, 210, 150), (70, 74, 82)][c.k % 6], 12)
    run = c.on and not c.broken
    blood = (190, 30, 40) if run else (200, 190, 196)
    if p == "M":
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=3)
        cx, cy, r = X0 + W * .5, Y0 + H * .42, min(W, H) * .3                                          # the dialysate tub with its coil
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SS[2], outline=OUT)
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(170, 200, 210) if m % 2 == 0 else (200, 200, 150))
        for k in range(3): d.ellipse([cx - r + 5 + k * 2, cy - r + 5 + k * 2, cx + r - 5 - k * 2, cy + r - 5 - k * 2], outline=blood)
        for k in range(3): dial(d, X0 + 6 + k * 8, Y1 - 6, 3)
        if m in (1, 3): case(d, X1 - 9, Y0 + 3, X1 - 3, Y1 - 3, ramp([(60, 64, 72), (150, 110, 70)][m // 2], 12))   # a flowmeter column
        if m in (2, 4): d.rectangle([X0 + 3, Y0 + 3, X0 + W * .3, Y0 + 7], fill=(240, 236, 220), outline=OUT)
    else:
        case(d, X0 + 3, Y0 + 1, X1 - 3, Y1 - 1, L, r=5 if p == "N" else 9)
        if m: case(d, X0 + 5, Y1 - 9, X0 + W * .6, Y1 - 3, ramp([(70, 120, 190), (150, 150, 156), (60, 150, 150), (130, 100, 170)][m - 1], 12), r=3)
        screen(d, X0 + 6, Y0 + 3, X1 - 6, Y0 + (14 if p == "N" else 18), c.on, c.broken, tint=[(90, 200, 230), (90, 230, 120), (240, 180, 60), (200, 120, 230), (230, 230, 230)][m])
        if m in (2, 4): d.rectangle([X0 + 6, Y0 + 3, X0 + W * .45, Y0 + (14 if p == "N" else 18)], fill=ramp((60, 64, 72), 10)[1], outline=OUT); lamp(d, X0 + 10, Y0 + 8, (240, 200, 60), c.on, 2)
        pr = 6; px_, py_ = X0 + W * .35, Y0 + H * .55                                                   # the blood pump rotor
        d.ellipse([px_ - pr, py_ - pr, px_ + pr, py_ + pr], fill=ramp((60, 62, 70), 10)[2], outline=OUT)
        d.arc([px_ - pr + 2, py_ - pr + 2, px_ + pr - 2, py_ + pr - 2], 30, 330, fill=blood, width=2)
        d.line([px_ - 3, py_, px_ + 3, py_], fill=STEEL[3], width=2)
        tube(d, X1 - 10, Y0 + H * .35, X1 - 4, Y1 - 6, ramp((236, 236, 232), 8) if m % 2 == 0 else ramp((200, 220, 236), 8), vert=True)   # dialyser
        d.rectangle([X1 - 9, Y0 + H * .36, X1 - 5, Y0 + H * .4], fill=(200, 40, 40)); d.rectangle([X1 - 9, Y1 - 10, X1 - 5, Y1 - 7], fill=(40, 80, 200))
        if p == "N":
            for k in range(2): disc(d, X0 + 9 + k * 7, Y1 - 6, 3, [ramp((200, 60, 60), 12), ramp((60, 140, 200), 12)][k])   # concentrate jugs
    cable(d, [(X0 + W * .45, Y1 - 3), (X0 + W * .3, Y1 + 1), (X0 + 2, Y1 - 4)], blood, 1)
    cable(d, [(X0 + W * .55, Y1 - 3), (X0 + W * .7, Y1 + 1), (X1 - 2, Y1 - 6)], (60, 100, 200) if run else (210, 210, 214), 1)


reg("dialysis", dialysis, "dialysis machines of about 1 1/2 to 2 ft square (Fresenius 4008, Baxter and Gambro literature; the Kolff-Brigham kidney)",
    states=("on", "off"), front=True, clear=3)


def digester(tm, x, y, w, h, st, v, c):
    """A biogas digester in a farmyard from above. Victorian: a brick pit with an iron cover and a gas pipe to the
    house (the Exeter and Bombay plants). Great War and Mid-Century: a brick or concrete ring with a floating
    steel gas holder drum in the maker's paint, the inlet tank for slurry and the outlet trench. Modern: a moulded
    fibreglass or plastic dome in green, blue or orange. Future Darkness: a dark membrane dome with a lit gauge.
    Each with its gas pipe and valve, a heap of dung by the inlet."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy = X0 + W * .46, Y0 + H * .46; R = min(W, H) * .36
    ix, iy = X0 + 4, Y1 - 22                                                                            # inlet tank and dung
    case(d, ix, iy, ix + 20, Y1 - 3, CONC if p != "V" else BRICK, r=3); d.ellipse([ix + 3, iy + 3, ix + 17, Y1 - 6], fill=(96, 74, 44))
    d.ellipse([ix + 6, iy + 5, ix + 13, iy + 11], fill=(120, 94, 56))
    case(d, X1 - 26, Y1 - 12, X1 - 3, Y1 - 3, CONC if p != "V" else BRICK); d.rectangle([X1 - 23, Y1 - 10, X1 - 6, Y1 - 5], fill=(80, 70, 46))   # outlet trench
    if p == "V":
        BK = ramp([(150, 72, 52), (196, 170, 110), (140, 136, 126), (70, 70, 90), (170, 100, 70), (120, 60, 50)][c.k % 6], 14)
        disc(d, cx, cy, R + 4, BK)
        for k in range(1, 4): d.ellipse([cx - R + k * 5, cy - R + k * 5, cx + R - k * 5, cy + R - k * 5], outline=BK[1])
        if m % 2: d.rectangle([cx - R * .9, cy - 3, cx + R * .9, cy + 3], fill=DARKWOOD[2], outline=OUT)        # a timber bearer across
        d.ellipse([cx - R * .55, cy - R * .55, cx + R * .55, cy + R * .55], fill=L[2], outline=OUT)        # the iron cover
        for a in range(8): bolt(d, cx + math.cos(a * .785) * R * .45, cy + math.sin(a * .785) * R * .45, IRON)
    else:
        rim = CONC if (p != "G" or c.k % 2) else BRICK
        disc(d, cx, cy, R + 5, rim)
        if p in "GM":                                                                                    # the floating gas drum
            disc(d, cx, cy, R - 2, L)
            for a in range(4): d.line([cx, cy, cx + math.cos(a * 1.571 + .4) * (R - 3), cy + math.sin(a * 1.571 + .4) * (R - 3)], fill=L[0])
            d.rectangle([cx - 4, cy - R - 6, cx + 4, cy - R + 2], fill=IRON[2], outline=OUT)               # guide frame
        elif p == "N":
            DM = ramp([(70, 130, 70), (60, 100, 170), (210, 120, 40), (90, 90, 96), (200, 190, 150), (150, 60, 50)][c.k % 6], 16)
            disc(d, cx, cy, R, DM)
            for a in range(6): d.arc([cx - R, cy - R, cx + R, cy + R], a * 60, a * 60 + 30, fill=DM[0])
        else:
            DM = ramp(LIV["F"][c.k % 7], 12)
            disc(d, cx, cy, R + 1, DM); d.ellipse([cx - R * .4, cy - R * .4, cx + R * .4, cy + R * .4], outline=DM[0])
            d.ellipse([cx + R * .5, cy - 4, cx + R * .5 + 8, cy + 4], fill=(90, 230, 120), outline=OUT)
        if m == 2: d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=CHROME[2], outline=OUT)
    cable(d, [(cx, cy), (cx + R * .7, cy - R * .7), (X1 - 3, Y0 + 6)], (60, 60, 66) if p != "N" else (230, 200, 60), 2)   # the gas pipe
    d.ellipse([X1 - 10, Y0 + 2, X1 - 2, Y0 + 10], fill=RED[2] if p != "V" else BRASS[2], outline=OUT)                         # the valve
    if c.broken: d.ellipse([cx - R * .2, cy + R * .3, cx + R + 10, Y1 - 2], fill=(84, 66, 40))


reg("digester", digester, "family biogas plants of 2 to 6 cubic metres, about 5 ft across (KVIC floating-drum and Chinese fixed-dome designs; the Exeter sewage plant of 1895)",
    front=False, clear=2, off=3)


def _derrick(d, cx, cy, s, top, Cl, lattice=False, n=5):
    """A derrick seen from straight above: four legs climbing from the corners of its base to the small crown at the
    top, the girts between them as squares shrinking upward, and bracing across each face."""
    for i in range(n, 0, -1):
        r = top + (s - top) * i / n
        d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=OUT, width=3); d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=Cl[2 + (i % 2)], width=1)
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        d.line([cx + sx * s, cy + sy * s, cx + sx * top, cy + sy * top], fill=OUT, width=5); d.line([cx + sx * s, cy + sy * s, cx + sx * top, cy + sy * top], fill=Cl[3], width=3)
        if lattice:
            for i in range(n):
                r0 = top + (s - top) * i / n; r1 = top + (s - top) * (i + 1) / n
                d.line([cx + sx * r0, cy + sy * r1, cx + sx * r1, cy + sy * r0], fill=Cl[1])
    d.rectangle([cx - top - 3, cy - top - 3, cx + top + 3, cy + top + 3], fill=Cl[1], outline=OUT)            # the crown block
    d.ellipse([cx - top + 1, cy - top + 1, cx + top - 1, cy + top - 1], fill=STEEL[2], outline=OUT); d.point((cx - 2, cy - 2), fill=STEEL[4])


def drillrig(tm, x, y, w, h, st, v, c):
    """An oil or water-well drilling rig from above. Victorian: a cable-tool rig: the timber derrick tapering to its
    crown, the walking beam on its samson post, the bull wheel and band wheel, and the engine house with its boiler
    and smoking stack. Great War: a taller timber derrick over a rotary table, the slush pit beside it. Mid-
    Century: a steel lattice derrick, the drawworks, mud pumps, a rack of drill pipe and the doghouse. Modern: a
    painted mast rig with mud tanks and generator sets. Future Darkness: an automated rig in dark plate with lit
    rails and no crew hut. Drilling: the stack or exhausts smoking and the mud pit stirred."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    ground = ramp([(120, 100, 76), (140, 120, 90), (100, 92, 80), (150, 130, 96), (110, 104, 92), (130, 110, 84)][c.k % 6], 8)
    d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=ground[2])                                         # the trodden pad
    rng = np.random.default_rng(c.k * 11 + m)
    for _ in range(30):
        a_, b_ = rng.uniform(X0 + 6, X1 - 20), rng.uniform(Y0 + 6, Y1 - 10); d.line([a_, b_, a_ + rng.uniform(6, 14), b_], fill=ground[1])
    cx, cy = X0 + W * .38, Y0 + H * .4; S = W * (.2 if p in "VG" else .17)
    pit = ramp((96, 80, 60), 10)                                                                           # the mud or slush pit
    d.rounded_rectangle([X0 + 10, Y1 - 70, X0 + 120, Y1 - 12], 10, fill=pit[1], outline=OUT); d.rounded_rectangle([X0 + 16, Y1 - 64, X0 + 114, Y1 - 18], 8, fill=pit[2] if p != "V" else (60, 50, 40))
    if c.on and not c.broken:
        for q in range(4): d.arc([X0 + 30 + q * 20, Y1 - 52, X0 + 46 + q * 20, Y1 - 36], 200, 340, fill=pit[4])
    if p == "V":
        dk = ramp([(150, 112, 70), (120, 90, 60), (170, 140, 96), (110, 80, 56), (160, 120, 80), (140, 100, 64)][c.k % 6], 16)
        slab_ = DARKWOOD
        d.rectangle([cx - S - 6, cy - S - 6, cx + S + 6, cy + S + 6], fill=dk[1], outline=OUT)
        for q in range(int(cx - S - 4), int(cx + S + 4), 6): d.line([q, cy - S - 5, q, cy + S + 5], fill=dk[0])
        _derrick(d, cx, cy, S, 8, dk, n=6)
        bx = cx + S + 18                                                                                     # walking beam to the samson post
        d.rectangle([cx + 6, cy - 4, bx + 70, cy + 4], fill=slab_[2], outline=OUT); d.line([cx + 8, cy - 3, bx + 68, cy - 3], fill=slab_[4])
        d.rectangle([bx + 30, cy - 10, bx + 40, cy + 10], fill=slab_[1], outline=OUT)
        tube(d, cx - S, cy + S + 12, cx + S, cy + S + 30, ramp((120, 84, 50), 14))                            # bull wheel
        d.ellipse([bx + 62, cy + 10, bx + 86, cy + 34], outline=OUT, width=3); d.ellipse([bx + 63, cy + 11, bx + 85, cy + 33], outline=dk[3])   # band wheel
        hx0, hy0 = X1 - 120, Y0 + 30 + (m % 3) * 20                                                          # engine house: painted plank roof
        RF = ramp(LIV["V"][(c.k + m) % 7], 14)
        case(d, hx0, hy0, X1 - 14, hy0 + 90, RF)
        d.line([hx0 + 2, hy0 + 45, X1 - 16, hy0 + 45], fill=OUT, width=2)
        for q in range(int(hx0) + 6, int(X1) - 16, 7): d.line([q, hy0 + 2, q, hy0 + 88], fill=RF[1 if q % 2 else 3])
        tube(d, hx0 + 14, hy0 + 100, X1 - 20, hy0 + 130, IRON)                                               # the boiler
        disc(d, X1 - 32, hy0 + 104, 7, IRON); ex, ey = X1 - 32, hy0 + 100
    else:
        fl = ramp((110, 110, 112), 10) if p != "F" else ramp((50, 52, 60), 8)
        d.rectangle([cx - S - 14, cy - S - 14, cx + S + 14, cy + S + 14], fill=fl[2], outline=OUT)        # the rig floor or substructure
        for q in range(int(cx - S - 10), int(cx + S + 12), 8): d.line([q, cy - S - 12, q, cy + S + 12], fill=fl[1])
        if p == "G":
            dk = ramp([(150, 112, 70), (120, 90, 60), (170, 140, 96), (110, 80, 56), (160, 120, 80), (140, 100, 64)][c.k % 6], 16)
            _derrick(d, cx, cy, S, 7, dk, n=7)
        elif p == "M":
            _derrick(d, cx, cy, S, 7, L, lattice=True, n=6)
        else:
            mw = 16                                                                                           # a mast rig seen from above: a narrow box mast
            case(d, cx - mw, cy - S, cx + mw, cy + S * .3, L)
            for q in range(int(cy - S) + 6, int(cy + S * .3), 10): d.line([cx - mw + 2, q, cx + mw - 2, q + 8], fill=L[0])
            d.rectangle([cx - 8, cy - 8, cx + 8, cy + 8], fill=STEEL[2], outline=OUT)
            if p == "F": d.rectangle([cx - S - 14, cy - S - 14, cx + S + 14, cy + S + 14], outline=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
        d.ellipse([cx - 5, cy + S * .55 - 5, cx + 5, cy + S * .55 + 5], fill=(40, 40, 44), outline=OUT)      # the rotary table and hole
        dw = (cx + S + 20, cy - 26, cx + S + 90, cy + 26)                                                    # drawworks
        case(d, *dw, c.alt, r=3); tube(d, dw[0] + 10, dw[1] + 12, dw[2] - 10, dw[3] - 12, STEEL)
        for k in range(2 if p != "G" else 1):                                                                # mud pumps
            case(d, X1 - 90, Y1 - 120 + k * 50, X1 - 16, Y1 - 82 + k * 50, L if p != "G" else ramp((80, 80, 86), 12), r=2)
            for q in range(3): disc(d, X1 - 78 + q * 18, Y1 - 101 + k * 50, 6, STEEL)
        if p in "MN":                                                                                        # pipe rack
            for q in range(6 + m): tube(d, X0 + 12, Y0 + 12 + q * 7, X0 + 12 + S * 1.4, Y0 + 18 + q * 7, [STEEL, RUST, ramp((70, 110, 160), 12)][q % 3 if c.poor else 0])
        if p in "GMN":                                                                                       # doghouse or tool house
            case(d, X1 - 110, Y0 + 14, X1 - 30, Y0 + 70 + (m % 3) * 16, c.alt if p != "G" else L)
            d.rectangle([X1 - 100, Y0 + 24, X1 - 80, Y0 + 34], fill=GLASS[2], outline=OUT)
        if p == "N":
            for k in range(2): case(d, X0 + 140 + k * 70, Y1 - 60, X0 + 200 + k * 70, Y1 - 14, ramp((60, 100, 70), 12) if k else L, r=3); louvres(d, X0 + 146 + k * 70, Y1 - 52, X0 + 160 + k * 70, Y1 - 20, L, 3, vert=True)
        ex, ey = (X1 - 50, Y1 - 110) if p != "F" else (None, None)
    if c.on and not c.broken and ex is not None: smoke(d, ex, ey, 4, (150, 146, 140) if p == "V" else (190, 190, 194))
    if c.broken:
        for q in range(4): d.line([cx - S + q * 20, cy + S + 4, cx - S + 30 + q * 20, cy + S + 30], fill=(30, 26, 22), width=3)   # fallen timbers or pipe


reg("drillrig", drillrig, "cable-tool derricks of 20 ft square at the base and 72 ft high (Drake well 1859; Oil Well Supply catalogues); land rigs on a 20 ft substructure",
    states=("on", "off"), front=False, clear=4, off=5)


def dronedock(tm, x, y, w, h, st, v, c):
    """A drone charging dock from above: a weatherproof box whose lid opens in two halves over the landing pad.
    Closed: the domed lid with its seam, vents and lit status ring. Open: the halves folded back, the pad with its
    landing mark and charging contacts and the drone sitting on it, its four rotors. Made by a few firms in white,
    grey, black or a carrier's colour; on a roof, a depot or a lab."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; m = mk(c, 5); L = c.liv
    op = st == "open"
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=6)
    louvres(d, X0 + 4, Y1 - 10, X0 + 22, Y1 - 4, L, 3, vert=True)
    cx, cy = X0 + W / 2, Y0 + H * .46
    if not op:
        if m % 2 == 0:
            d.rounded_rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 14], 10, fill=L[3], outline=OUT); d.line([cx, Y0 + 7, cx, Y1 - 15], fill=L[0], width=2)
        else:
            disc(d, cx, cy, min(W, H) * .36, ramp(tone(L[2], 20), 14)); d.line([cx - min(W, H) * .36, cy, cx + min(W, H) * .36, cy], fill=L[0], width=2)
    else:
        d.rectangle([X0 + 2, Y0 + 2, X0 + 8, Y1 - 12], fill=L[3], outline=OUT); d.rectangle([X1 - 8, Y0 + 2, X1 - 2, Y1 - 12], fill=L[3], outline=OUT)   # lid halves folded
        pad = ramp((60, 62, 68), 8)
        d.rectangle([X0 + 9, Y0 + 5, X1 - 9, Y1 - 13], fill=pad[2], outline=OUT)
        d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], outline=(240, 240, 236), width=2)
        for q in (-1, 1): d.rectangle([cx + q * 12 - 2, cy - 14, cx + q * 12 + 2, cy + 14], fill=COPPER[3])   # contacts
        dc = [ramp((230, 230, 226), 10), ramp((60, 62, 66), 10), ramp((200, 60, 40), 12), ramp((220, 200, 60), 12), ramp((120, 130, 140), 10)][m]
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):                                                    # the drone
            ax, ay = cx + sx * 12, cy + sy * 12
            d.line([cx, cy, ax, ay], fill=OUT, width=4); d.line([cx, cy, ax, ay], fill=dc[1], width=2)
            d.ellipse([ax - 7, ay - 7, ax + 7, ay + 7], outline=dc[3]); d.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], fill=dc[0], outline=OUT)
        case(d, cx - 6, cy - 7, cx + 6, cy + 7, dc, r=3); d.ellipse([cx - 2, cy + 3, cx + 2, cy + 7], fill=(30, 30, 36))
    ring = (60, 220, 120) if not c.broken else (240, 60, 40)
    d.rectangle([X1 - 22, Y1 - 9, X1 - 6, Y1 - 5], fill=ring, outline=OUT)
    if c.broken: sparks(d, X1 - 12, Y0 + 12)
    return [(X1 - 14, Y1 - 6, 10, (.8, 1.4, 1.0))]


reg("dronedock", dronedock, "drone docks of about 3 by 3 ft with the lid shut (DJI Dock, Percepto and Skydio Dock literature)",
    states=("closed", "open"), front=True, clear=1, axes={"livery": list(range(6)), "make": list(range(5))})


def electronmicroscope(tm, x, y, w, h, st, v, c):
    """An electron microscope from above. Mid-Century: the tall round column in its lead-lined collar on a big desk
    console, the viewing window and binocular viewer, banks of knobs and the separate rack of electronics. Modern:
    the column on a smaller desk with two monitors and a keyboard. Future Darkness: a compact column in a sealed
    cabinet with a wide screen. Working: the screens or the viewing window glowing green."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    on = c.on and not c.broken
    desk = (X0 + 2, Y0 + H * .25, X1 - 2, Y1 - 3)
    case(d, *desk, L, r=3 if p == "M" else 6)
    cx, cy = X0 + W * (.42 if m % 2 == 0 else .58), Y0 + H * .42; R = H * .2
    if p == "M":                                                                                            # electronics rack beside, and the knob banks
        case(d, X1 - 22, Y0 + 2, X1 - 2, Y0 + H * .25 + 4, labliv(c, 2))
        for q in range(4): d.line([X1 - 20, Y0 + 6 + q * 5, X1 - 4, Y0 + 6 + q * 5], fill=OUT)
        for q in range(7): d.ellipse([X0 + 8 + q * 9, Y1 - 13, X0 + 13 + q * 9, Y1 - 8], fill=(40, 40, 44) if q % 3 else c.trim[3], outline=OUT)
        d.ellipse([cx - 10, cy + R + 2, cx + 10, cy + R + 14], fill=(60, 200, 90) if on else (40, 60, 50), outline=OUT)   # the viewing screen
        d.rectangle([cx - 7, cy + R + 14, cx + 7, cy + R + 20], fill=(30, 30, 34), outline=OUT)                       # binocular viewer
    else:
        for k in range(2 if p == "N" else 1):
            sx = X0 + 6 + k * 26 if m % 2 == 0 else X1 - 32 - k * 26
            if p == "F": sx = X0 + 6 if m % 2 == 0 else X1 - 52; d.rectangle([sx, Y1 - 24, sx + 46, Y1 - 8], fill=(20, 20, 24), outline=OUT); screen(d, sx + 2, Y1 - 22, sx + 44, Y1 - 10, on, False, tint=(80, 220, 120)); continue
            d.rectangle([sx, Y1 - 24, sx + 22, Y1 - 10], fill=(30, 30, 34), outline=OUT); screen(d, sx + 2, Y1 - 22, sx + 20, Y1 - 12, on, False, tint=(80, 220, 120))
        d.rectangle([X0 + W * .3, Y1 - 8, X0 + W * .55, Y1 - 4], fill=(200, 200, 196), outline=OUT)                  # keyboard
    col = ramp((150, 156, 164), 16) if p != "F" else ramp(LIV["F"][c.k % 7], 14)
    disc(d, cx, cy, R + 6, ramp(tone(L[2], -30), 12))                                                       # the collar
    disc(d, cx, cy, R, col)                                                                                  # the column from above
    d.ellipse([cx - R * .4, cy - R * .4, cx + R * .4, cy + R * .4], fill=col[0], outline=OUT); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=c.trim[3])
    for a in range(6): bolt(d, cx + math.cos(a * 1.05) * (R + 3), cy + math.sin(a * 1.05) * (R + 3), c.trim)
    cable(d, [(cx + R, cy - R * .5), (X1 - 6, Y0 + 8)], (40, 40, 44), 3)
    if p != "M": lamp(d, X0 + 8, Y0 + H * .3, (90, 220, 90), on, 2)
    if c.broken: sparks(d, cx + R, cy)


reg("electronmicroscope", electronmicroscope, "transmission electron microscopes on a desk of about 6 by 4 ft (Siemens Elmiskop and RCA EMU; JEOL and FEI literature)",
    states=("off", "on"), front=True, clear=3)


def evcharger(tm, x, y, w, h, st, v, c):
    """An electric car charging point from above: the pedestal's top on its concrete pad with a protective bollard,
    the holster for the plug, the cable coiled on its hook, the screen and the maker's colour. Modern: an early
    pedestal with a paddle plug (for the first electric cars) or a plain grey post. Future Darkness: a slim post in
    a network's colour with a lit ring. In use: the cable run out south to a car and the ring glowing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    PAL = {"N": [(150, 154, 158), (50, 52, 58), (40, 130, 70), (236, 236, 232), (40, 90, 170), (210, 180, 60)],
           "F": [(236, 238, 240), (30, 32, 36), (30, 170, 120), (40, 120, 220), (240, 160, 30), (200, 40, 60)]}[p]
    L = ramp(PAL[c.k % 6], 14)
    use = c.on and not c.broken
    padC = CONC if p == "N" else ramp((50, 52, 56), 8)
    d.rectangle([X0, Y0, X1, Y1], fill=padC[2], outline=padC[0])                                            # the pad
    if p == "F": d.rectangle([X0 + 1, Y1 - 3, X1 - 1, Y1 - 1], fill=(40, 170, 90) if m % 2 else (40, 110, 200))   # the painted bay
    d.line([X0 + 1, Y1 - 2, X1 - 1, Y1 - 2], fill=(240, 240, 232) if p == "N" or m % 2 else (240, 210, 60), width=2)   # the parking bay's painted line
    d.ellipse([X0 + 1, Y1 - 9, X0 + 8, Y1 - 2], fill=YEL[2] if m % 2 == 0 else (200, 200, 200), outline=OUT)   # bollard
    px0, py0, px1, py1 = X0 + 3, Y0 + 2, X1 - 3, Y0 + H * .66
    if p == "N": case(d, px0, py0, px1, py1, L, r=2)
    else: d.ellipse([px0, py0, px1, py1 + 3], fill=L[2], outline=OUT); d.ellipse([px0 + 3, py0 + 2, px1 - 6, py1 - 4], fill=L[3])
    screen(d, px0 + 3, py0 + 3, px1 - 3, py0 + 7, use, c.broken, tint=(80, 200, 120))
    hcol = [(30, 30, 34), (226, 120, 40), (150, 154, 160), (40, 80, 150), (60, 140, 80)][m]             # the cable's own colour by make
    if p == "F":
        d.ellipse([px0 + 2, py0 + 2, px1 - 2, py1 + 1], outline=(60, 220, 230) if use else (70, 90, 100), width=2)
    if m == 1: d.rectangle([px0 + 2, py1 - 5, px1 - 2, py1 - 2], fill=ramp(PAL[(c.k + 3) % 6], 10)[2])   # a network's band
    elif m == 3: d.rectangle([px0 + 2, py0 + 2, px0 + 5, py1 - 2], fill=(240, 240, 236))
    if not use:
        hose_coil(d, X0 + W * .55, py1 - 1, 6, hcol, 2)                                                    # the cable coiled on its hook on the post
        d.rectangle([X0 + W * .55 - 2, py1 - 9, X0 + W * .55 + 2, py1 - 6], fill=STEEL[3], outline=OUT)
        d.rectangle([px1 - 7, py1 - 9, px1 - 1, py1 - 2], fill=(20, 20, 22), outline=OUT)                 # the plug in its holster
        d.rectangle([px1 - 5, py1 - 7, px1 - 3, py1 - 4], fill=(60, 200, 230) if p == "F" else (230, 230, 226))
    else:
        cable(d, [(px1 - 4, py1), (X0 + W * .6, Y1 - 4), (X0 + W * .35, Y1 - 2)], hcol, 2)
        d.rectangle([X0 + W * .3, Y1 - 6, X0 + W * .3 + 5, Y1 - 1], fill=(20, 20, 22), outline=OUT)      # the plug run out to the car
        d.rectangle([px0 + 2, py0 + 2, px1 - 2, py0 + 9], outline=(140, 240, 200))                     # the screen's glow
    if p == "N" and m == 4: d.rectangle([px0 + 3, py1 - 7, px0 + 9, py1 - 3], fill=(120, 40, 140), outline=OUT)   # the paddle plug's magenta badge
    if c.broken: d.line([px0 + 2, py0 + 2, px1 - 2, py1 - 2], fill=(240, 240, 230)); sparks(d, px1 - 2, py1 - 4)
    if use: return [(X0 + W / 2, Y0 + H * .4, 16, (.7, 1.3, 1.4))]


reg("evcharger", evcharger, "charging pedestals of about 1 ft square on a pad of 1 1/2 by 1 ft (GM EV1 Magne Charge, ChargePoint and Tesla literature)",
    states=("off", "on"), front=True, clear=3, mount="ground")


# ================================================================ the Technocracy's plant
IX_ARMOUR = [CHROME, ramp((96, 102, 114), 16), ramp((44, 46, 52), 10), ramp((120, 136, 160), 16), ramp((214, 218, 226), 10), ramp((126, 108, 86), 14)]


def _cog(d, cx, cy, r, col, hole):
    """Iteration X's cog: a toothed ring with its hub."""
    for k in range(8):
        a = k * math.pi / 4; d.rectangle([cx + math.cos(a) * r - 2, cy + math.sin(a) * r - 2, cx + math.cos(a) * r + 2, cy + math.sin(a) * r + 2], fill=col)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col, outline=OUT); d.ellipse([cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45], fill=hole)


def exogantry(tm, x, y, w, h, st, v, c):
    """An Iteration X power-armour gantry from above: a square steel frame on a deck plate with hazard-striped
    corners, two jointed service arms, cable looms dropping from the overhead rail, and the Convention's cog on the
    deck. Occupied: the suit stands clamped in it, seen from over its head: the domed helm with its glowing blue
    visor slit, the great shoulder plates, the reactor pack on its back lit through its vents and the arms down at
    its sides; a heavy model with a shoulder gun, a slim scout, one with a weapon arm or a missile pod. In chrome,
    gunmetal, black, steel blue, white or bronze plate. Empty: the clamps open and the deck's boot marks."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; m = mk(c, 5)
    AR = IX_ARMOUR[c.k % 6]; seam = [(60, 170, 255), (80, 220, 255), (150, 200, 255), (60, 120, 255), (200, 230, 255)][m]
    lit = not c.broken
    deck = ramp((52, 56, 64), 8)
    case(d, X0, Y0, X1, Y1, deck)
    for q in range(X0 + 8, X1 - 4, 12): d.line([q, Y0 + 3, q, Y1 - 3], fill=deck[1])
    for sx, sy in ((X0 + 2, Y0 + 2), (X1 - 14, Y0 + 2), (X0 + 2, Y1 - 14), (X1 - 14, Y1 - 14)): hazard(d, sx, sy, sx + 12, sy + 12, 3)
    fr = ramp((84, 90, 100), 14)
    d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], outline=OUT, width=6); d.rectangle([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], outline=fr[3], width=3)   # the frame
    d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y0 + 14], fill=fr[2], outline=OUT)                                # the overhead rail
    for k in range(3): cable(d, [(X0 + 24 + k * 22, Y0 + 12), (X0 + 30 + k * 18, Y0 + 30)], [(30, 30, 34), (60, 60, 70), (30, 60, 90)][k], 2)
    cx, cy = X0 + W / 2, Y0 + H * .52
    _cog(d, X0 + 18, Y1 - 22, 6, fr[3], (20, 24, 30))                                                       # the cog on the deck
    d.line([X0 + 15, Y1 - 25, X0 + 21, Y1 - 19], fill=seam); d.line([X0 + 21, Y1 - 25, X0 + 15, Y1 - 19], fill=seam)
    for sx in (-1, 1):                                                                                      # service arms
        ax = cx + sx * (W / 2 - 10)
        d.line([ax, cy - 20, cx + sx * 26, cy - 10], fill=OUT, width=6); d.line([ax, cy - 20, cx + sx * 26, cy - 10], fill=fr[2], width=4)
        d.ellipse([ax - 4, cy - 24, ax + 4, cy - 16], fill=fr[1], outline=OUT)
    if st == "full":
        s = {1: 1.5, 2: 1.1}.get(m, 1.32)
        pk = ramp((40, 44, 52), 10)
        case(d, cx - 13 * s, cy - 22 * s, cx + 13 * s, cy - 8 * s, pk, r=4)                                  # the reactor pack on its back, to the north
        for q in range(3): d.line([cx - 8 * s + q * 8 * s, cy - 19 * s, cx - 8 * s + q * 8 * s, cy - 12 * s], fill=seam if lit else (40, 50, 60), width=2)
        for sx in (-1, 1):                                                                                  # arms and gauntlets, reaching forward
            d.rounded_rectangle([cx + sx * 21 * s - 5, cy - 6 * s, cx + sx * 21 * s + 5, cy + 14 * s], 4, fill=AR[1], outline=OUT)
            d.ellipse([cx + sx * 21 * s - 6, cy + 11 * s, cx + sx * 21 * s + 6, cy + 20 * s], fill=AR[0], outline=OUT)
        d.rounded_rectangle([cx - 17 * s, cy - 12 * s, cx + 17 * s, cy + 8 * s], 7, fill=AR[2], outline=OUT)    # the torso and pauldrons
        for sx in (-1, 1):
            d.ellipse([cx + sx * 18 * s - 10 * s, cy - 13 * s, cx + sx * 18 * s + 10 * s, cy + 5 * s], fill=AR[3], outline=OUT)
            d.arc([cx + sx * 18 * s - 8 * s, cy - 11 * s, cx + sx * 18 * s + 8 * s, cy + 3 * s], 200, 300, fill=AR[4], width=2)
        if m == 1: tube(d, cx + 12 * s, cy - 24 * s, cx + 19 * s, cy + 2 * s, ramp((60, 64, 72), 10), vert=True)   # the shoulder gun
        if m == 3: d.rectangle([cx - 24 * s, cy - 2 * s, cx - 18 * s, cy + 26 * s], fill=ramp((60, 64, 72), 10)[2], outline=OUT)   # weapon arm
        if m == 4:
            case(d, cx - 12, cy - 30 * s, cx + 12, cy - 20 * s, AR, r=2)                                       # the missile pod over the pack
            for q in range(4): d.ellipse([cx - 9 + q * 5, cy - 28 * s, cx - 6 + q * 5, cy - 25 * s], fill=(20, 20, 24))
        d.ellipse([cx - 8 * s, cy - 8 * s, cx + 8 * s, cy + 8 * s], fill=AR[3], outline=OUT)                 # the helm
        d.ellipse([cx - 5 * s, cy - 6 * s, cx + 1 * s, cy - 1 * s], fill=AR[4])
        d.line([cx - 5 * s, cy + 5 * s, cx + 5 * s, cy + 5 * s], fill=seam if lit else (30, 40, 50), width=2)   # the visor slit, facing south
        d.line([cx - 15 * s, cy + 1 * s, cx - 9 * s, cy + 1 * s], fill=seam if lit else (40, 50, 60)); d.line([cx + 9 * s, cy + 1 * s, cx + 15 * s, cy + 1 * s], fill=seam if lit else (40, 50, 60))
        for sx in (-1, 1): d.rectangle([cx + sx * 29 * s - 3, cy - 6 * s, cx + sx * 29 * s + 3, cy - 1 * s], fill=fr[4], outline=OUT)   # clamps closed
        if c.broken: sparks(d, cx + 10, cy + 2)
        if lit: return [(cx, cy, 30, (.6, .9, 1.7))]
    else:
        for sx in (-1, 1):
            d.rectangle([cx + sx * 28 - 3, cy - 10, cx + sx * 28 + 3, cy - 4], fill=fr[4], outline=OUT)      # clamps open
            d.ellipse([cx + sx * 9 - 5, cy + 6, cx + sx * 9 + 5, cy + 20], fill=deck[0])                    # boot marks
        cable(d, [(cx - 6, Y0 + 14), (cx - 10, cy - 6)], (40, 40, 46), 2); cable(d, [(cx + 6, Y0 + 14), (cx + 12, cy - 4)], (30, 60, 90), 2)
        d.rectangle([cx - 6, cy - 2, cx + 6, cy + 2], fill=seam if lit else (30, 40, 50))


reg("exogantry", exogantry, "a frame of about 5 ft square for a suit of 7 to 8 ft standing (after military exoskeleton and aircraft engine maintenance stands)",
    states=("full", "empty"), front=True, clear=3, axes={"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"]})


def fabricator(tm, x, y, w, h, st, v, c):
    """A 3D printer or fabricator from above. An open-frame printer: the frame, the bed with its print, the gantry
    and hot end, the filament spool on its arm. A boxed printer: a white or black case with a glass top. A resin
    printer: a tinted orange or green lid over the vat. An industrial fabricator: a cabinet with a window and a
    touch screen. A delta: three towers round a round bed. Printing: the nozzle hot, the screen lit, the print part
    made; idle: a finished print on the bed or a bare one."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; m = mk(c, 5)
    CS = ramp([(236, 236, 232), (40, 42, 48), (200, 90, 40), (150, 156, 164), (60, 110, 170), (90, 60, 110)][c.k % 6], 14)
    fil = [(230, 120, 40), (60, 170, 220), (220, 220, 220), (40, 40, 44), (200, 60, 80), (90, 200, 90)][(c.k + m) % 6]
    run = c.on and not c.broken
    cx, cy = X0 + W * .46, Y0 + H * .5
    def part(px_, py_, r):
        if run: d.rectangle([px_ - r, py_ - r * .5, px_ + r, py_ + r * .5], fill=fil, outline=OUT)
        else: d.polygon([(px_, py_ - r), (px_ + r, py_), (px_, py_ + r), (px_ - r, py_)], fill=fil, outline=OUT); d.line([px_ - r + 2, py_, px_, py_ - r + 2], fill=tone(fil, 40))
    if m == 0:
        d.rectangle([X0 + 3, Y0 + 6, X1 - 10, Y1 - 4], outline=OUT, width=4); d.rectangle([X0 + 4, Y0 + 7, X1 - 11, Y1 - 5], outline=CS[2], width=2)
        d.rectangle([X0 + 9, Y0 + 14, X1 - 16, Y1 - 10], fill=(40, 40, 46), outline=OUT); d.rectangle([X0 + 11, Y0 + 16, X1 - 18, Y1 - 12], fill=(210, 160, 70))   # bed
        part(cx, cy + 4, 7)
        d.rectangle([X0 + 5, cy - 6, X1 - 12, cy - 3], fill=STEEL[2], outline=OUT); d.rectangle([cx - 4, cy - 9, cx + 4, cy], fill=(40, 40, 44), outline=OUT)
        disc(d, X1 - 6, Y0 + 12, 6, ramp(fil, 14))                                                       # the spool
    elif m == 4:
        d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=CS[2], outline=OUT); d.ellipse([X0 + 10, Y0 + 10, X1 - 10, Y1 - 10], fill=(40, 40, 46), outline=OUT)
        for a in (-math.pi / 2, math.pi / 6, 5 * math.pi / 6):
            tx, ty = cx + math.cos(a) * (W * .4), cy + math.sin(a) * (H * .4)
            d.rectangle([tx - 4, ty - 4, tx + 4, ty + 4], fill=CS[3], outline=OUT); d.line([tx, ty, cx, cy], fill=STEEL[3])
        part(cx, cy + 3, 6); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(40, 40, 44), outline=OUT)
    else:
        case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, CS, r=4)
        win = (X0 + 7, Y0 + 7, X1 - 7, Y1 - 16)
        tint = {1: GLASS[1], 2: (220, 110, 30) if c.k % 2 else (60, 150, 80), 3: GLASS[0]}[m]
        d.rectangle(win, fill=tint, outline=OUT)
        if m == 2:
            d.rectangle([win[0] + 4, win[1] + 4, win[2] - 4, win[3] - 4], fill=mix(tint, (20, 20, 20), .4))   # the vat under the lid
            part(cx, cy - 3, 6)
        else:
            d.rectangle([win[0] + 3, win[1] + 3, win[2] - 3, win[3] - 3], fill=mix(tint, (60, 60, 64), .5))
            part(cx, cy - 2, 6 if m == 1 else 9)
        d.line([win[0] + 2, win[1] + 2, win[0] + 12, win[1] + 2], fill=GLASS[4])
        screen(d, X0 + 7, Y1 - 13, X0 + W * .5, Y1 - 5, run, c.broken, tint=(80, 200, 240))
    lamp(d, X1 - 6, Y1 - 6, (255, 140, 40), run, 2)
    if c.broken: d.line([X0 + 6, Y0 + 6, X1 - 10, Y1 - 10], fill=fil, width=1); sparks(d, X1 - 10, Y0 + 10)


reg("fabricator", fabricator, "desktop and floor 3D printers of 1 1/2 to 3 ft (Prusa i3, Ultimaker, Formlabs and Stratasys literature)",
    states=("off", "on"), front=True, clear=2)


def heattreat(tm, x, y, w, h, st, v, c):
    """A heat-treating furnace against its wall, from above: the box with its firebrick-lined chamber and the door at
    the front, the burner or the heating elements' terminal box, the flue, the pyrometer. Victorian and Great War:
    a brick case bound with iron straps, a gas burner pipe, a cast door on its lifting chain. Mid-Century: a steel
    case in the maker's enamel with a dial pyrometer. Modern: a grey or blue case with a digital controller.
    Future Darkness: a dark sealed case. Open: the door lifted, the chamber glowing with the parts on its hearth;
    shut: the door down and a glow at its seams."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    op = st == "open"
    caseC = ramp([(150, 72, 52), (186, 150, 110), (120, 100, 90), (90, 60, 50), (160, 110, 80), (130, 120, 110)][c.k % 6], 14) if p == "V" else L
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, caseC, r=2)
    if p == "V":
        for q in range(Y0 + 6, Y1 - 4, 6): d.line([X0 + 2, q, X1 - 2, q], fill=caseC[1])                      # brick courses
        for q in ((X0 + 6, X1 - 7) if m % 2 == 0 else (X0 + 6, X0 + W // 2, X1 - 7)): d.rectangle([q - 2, Y0 + 1, q + 2, Y1 - 1], fill=IRON[2], outline=OUT)   # iron straps
    elif p == "G":                                                                                            # an iron-cased furnace, riveted
        for q in range(X0 + 6, X1 - 4, 8): bolt(d, q, Y0 + 4, IRON); bolt(d, q, Y0 + H * .3, IRON)
        if m % 2: d.rectangle([X0 + 4, Y0 + 7, X0 + W * .3, Y0 + H * .28], fill=tone(L[2], -24), outline=OUT)
    if p in "VG":
        cable(d, [(X0 + 4, Y0 + H * .55), (X0 + 4, Y0 + 6), (X0 + W * .3, Y0 + 6)], IRON[3] if p == "G" else BRASS[2], 3)   # the burner pipe
    else:
        louvres(d, X0 + 6, Y0 + 4, X0 + W * .4, Y0 + 12, L, 3, vert=True)
        if m % 2: d.rectangle([X0 + 4, Y0 + 14, X0 + W * .45, Y0 + H * .3], fill=c.alt[2], outline=OUT)        # the terminal box in a second colour
    d.rectangle([X0 + W * .7, Y0 + 3, X0 + W * .7 + 10, Y0 + 13], fill=IRON[1], outline=OUT)                    # the flue
    d.rectangle([X0 + W * .7 + 2, Y0 + 5, X0 + W * .7 + 8, Y0 + 11], fill=(30, 26, 26))
    ch = (X0 + 10, Y0 + H * .35, X1 - 10, Y1 - 3)
    if op:
        d.rectangle(ch, fill=HOT[2], outline=OUT); d.rectangle([ch[0] + 3, ch[1] + 3, ch[2] - 3, ch[3] - 2], fill=HOT[3])
        for q in range(3 + m % 3): d.rectangle([ch[0] + 6 + q * 10, ch[1] + 6, ch[0] + 12 + q * 10, ch[1] + 10], fill=HOT[1], outline=(120, 40, 20))   # parts on the hearth
        d.rectangle([ch[0] - 2, Y0 + H * .2, ch[2] + 2, Y0 + H * .33], fill=IRON[2] if p in "VG" else caseC[0], outline=OUT)   # the door lifted
    else:
        dr = ramp(LIV[p][(c.k + m) % 7], 14) if p in "VG" else ramp(tone(L[2], -30), 12)
        d.rectangle([ch[0] - 2, ch[1], ch[2] + 2, ch[3]], fill=dr[2], outline=OUT); d.line([ch[0] - 1, ch[1] + 1, ch[2] + 1, ch[1] + 1], fill=dr[4])
        d.line([ch[0], ch[3] - 1, ch[2], ch[3] - 1], fill=HOT[2] if not c.broken else IRON[0])
        d.rectangle([(ch[0] + ch[2]) / 2 - 6, ch[1] + 3, (ch[0] + ch[2]) / 2 + 6, ch[1] + 6], fill=c.trim[3], outline=OUT)   # the door handle
    if p in "VGM": dial(d, X1 - 8, Y0 + 8, 4, ang=-.6 if op else -1.6, rim=c.trim[1])
    else: screen(d, X1 - 18, Y0 + 4, X1 - 4, Y0 + 11, True, c.broken, tint=(240, 90, 60))
    if c.broken: d.line([X0 + 4, Y0 + 4, X0 + W * .4, Y1 - 6], fill=(30, 24, 24), width=2)
    return [(X0 + W / 2, Y1 - 3, 40 if op else 16, (1.6, 1.0, .5))]


reg("heattreat", heattreat, "box furnaces of 3 to 4 ft by 2 to 2 1/2 ft with a chamber of 1 to 1 1/2 ft (Lindberg, Hevi-Duty and Leeds and Northrup catalogues)",
    states=("closed", "open"), front=True, clear=3, mount="wall")


def hosecabinet(tm, x, y, w, h, st, v, c):
    """A fire hose cabinet on its wall, from above: the cabinet's top and its glazed door at the front, the hose
    reel inside with its canvas or rubber hose and brass nozzle, the valve wheel. Victorian and Great War: varnished
    or red-painted wood with a brass reel. Mid-Century: red enamelled steel. Modern: red or stainless with a white
    label. Future Darkness: a dark case with a red lit strip. Open: the door swung out and the hose showing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    CB = {"V": [WOOD, DARKWOOD, RED, ramp((110, 40, 34), 14), ramp((150, 110, 70), 14), ramp((60, 80, 60), 12)],
          "G": [RED, ramp((140, 36, 30), 14), DARKWOOD, ramp((170, 70, 50), 14), WOOD, ramp((90, 90, 96), 12)],
          "M": [RED, ramp((200, 70, 50), 16), ramp((150, 30, 30), 14), CHROME, ramp((226, 220, 200), 10), ramp((90, 90, 96), 12)],
          "N": [RED, SS, ramp((230, 230, 226), 10), ramp((160, 30, 34), 14), ramp((120, 124, 130), 12), ramp((210, 60, 40), 14)],
          "F": [ramp((40, 42, 48), 10), ramp((90, 30, 36), 12), SS, ramp((60, 64, 72), 10), ramp((140, 30, 30), 12), ramp((24, 24, 28), 8)]}[p][c.k % 6]
    case(d, X0, Y0, X1, Y1 - 2, CB)
    hose = [(200, 190, 160), (226, 220, 200), (200, 50, 40), (60, 60, 64), (170, 140, 100)][(m + c.k) % 5] if p in "VG" else ((200, 50, 40) if p != "F" else (220, 220, 214))
    reel = [BRASS, RED, IRON][(m + c.k) % 3] if p in "VG" else (RED if CB is not RED else CHROME)
    rx0, rx1 = X0 + 5, X0 + W * (.62 if m % 2 == 0 else .8)
    d.rectangle([rx0, Y0 + 3, rx1, Y1 - 6], fill=reel[1], outline=OUT)
    for q in range(int(rx0) + 3, int(rx1) - 1, 3): d.line([q, Y0 + 4, q, Y1 - 7], fill=hose); d.line([q + 1, Y0 + 4, q + 1, Y1 - 7], fill=tone(hose, -40))
    d.rectangle([rx1 + 3, Y0 + 3, rx1 + 9, Y0 + 9], fill=BRASS[3], outline=OUT)                               # nozzle
    if m % 2 == 0: dial(d, X1 - 7, Y0 + 7, 4, face=RED[2], needle=(230, 220, 200), rim=OUT)                    # the valve wheel
    if m in (2, 4): d.rectangle([X1 - 10, Y0 + 2, X1 - 3, Y1 - 5], fill=RED[1], outline=OUT); d.rectangle([X1 - 8, Y0 + 3, X1 - 5, Y0 + 6], fill=(20, 20, 20))   # an extinguisher bay
    if m == 3: d.rectangle([X1 - 12, Y0 + 3, X1 - 3, Y0 + 6], fill=RED[3], outline=OUT); d.polygon([(X1 - 4, Y0 + 2), (X1 - 1, Y0 + 4), (X1 - 4, Y0 + 7)], fill=STEEL[3])   # a fire axe on its clips
    if st == "open":
        d.line([X0, Y1 - 2, X0 + 4, Y1 + 30], fill=OUT, width=4); d.line([X0, Y1 - 2, X0 + 4, Y1 + 30], fill=CB[3], width=2)   # the door swung out
        d.line([X0 + 1, Y1 + 2, X0 + 3, Y1 + 26], fill=GLASS[3])
    else:
        d.rectangle([X0 + 2, Y1 - 6, X1 - 2, Y1 - 2], fill=GLASS[2], outline=OUT); d.line([X0 + 4, Y1 - 5, X0 + W * .3, Y1 - 5], fill=GLASS[4])   # the glazed door edge
        d.rectangle([X0 + W * .4, Y1 - 6, X0 + W * .62, Y1 - 3], fill=(240, 236, 226) if p != "V" else BRASS[3])   # label
        glyphs(d, X0 + W * .42, Y1 - 5, X0 + W * .6, Y1 - 4, (160, 30, 30))
    if p == "F": d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=(255, 60, 50))
    if c.broken: d.line([X0 + W * .2, Y1 - 6, X0 + W * .5, Y1 - 2], fill=(240, 240, 240))


reg("hosecabinet", hosecabinet, "hose reel cabinets of about 3 ft by 10 in (NFPA 14 hose stations; Elkhart and Allenco catalogues)",
    states=("closed", "open"), front=True, clear=3, mount="wall", off=2)


# ================================================================ presses, pumps and heavy plant
def hydraulicpress(tm, x, y, w, h, st, v, c):
    """A hydraulic press from above: the crown or head plate held up on four columns (or two side frames), the great
    ram cylinder in its middle, the bed showing in front with the work on it, and the pump beside. Victorian: a
    Bramah press, a cast-iron crown painted and lined, round columns with big nuts, a hand pump with its long
    lever and a brass gauge. Great War: a riveted crown and a belt-driven pump. Mid-Century: a welded H-frame in
    the maker's green or grey, an electric power pack and push buttons. Modern: a yellow, blue or orange frame
    with light-curtain posts. Future Darkness: a dark sealed frame with lit guards."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    bed = (X0 + 6, Y0 + 10, X1 - 22, Y1 - 6)
    case(d, *bed, ramp([(120, 120, 124), (96, 98, 104), (140, 132, 120), (110, 116, 110), (130, 126, 130)][m], 12))   # the bed
    work = [ramp((150, 110, 70), 14), STEEL, ramp((200, 196, 186), 10), RUST, ramp((190, 150, 60), 14)][m]
    case(d, (bed[0] + bed[2]) / 2 - 10, bed[3] - 18, (bed[0] + bed[2]) / 2 + 10, bed[3] - 4, work, r=2)        # the work on the bed
    if p in "VG":
        for cx_, cy_ in ((bed[0] + 6, bed[1] + 6), (bed[2] - 6, bed[1] + 6), (bed[0] + 6, bed[3] - 6), (bed[2] - 6, bed[3] - 6)):
            disc(d, cx_, cy_, 5, c.metal if c.w else RUST); d.rectangle([cx_ - 2, cy_ - 2, cx_ + 2, cy_ + 2], fill=IRON[1])   # columns and nuts
        cr = (bed[0] + 2, bed[1] + 2, bed[2] - 2, bed[1] + (bed[3] - bed[1]) * .62)
    else:
        for q in (bed[0], bed[2] - 10): case(d, q, bed[1] - 4, q + 10, bed[3] - 22, L)                           # side frames
        cr = (bed[0] + 2, bed[1] - 2, bed[2] - 2, bed[1] + (bed[3] - bed[1]) * .55)
    if m == 3: d.ellipse(cr, fill=L[2], outline=OUT); d.arc([cr[0] + 2, cr[1] + 2, cr[2] - 2, cr[3] - 2], 180, 270, fill=L[4], width=2)   # a cast oval crown
    else: case(d, *cr, L, r=4 if p in "MNF" else 2)                                                                  # the crown
    ccx, ccy = (cr[0] + cr[2]) / 2, (cr[1] + cr[3]) / 2
    rc = ramp(tone(L[2], 30), 14) if p != "V" else [IRON, BRASS, STEEL, IRON, COPPER][m]
    if m == 2:                                                                                                 # two rams side by side
        for q in (-1, 1): disc(d, ccx + q * (cr[2] - cr[0]) * .24, ccy, min(cr[2] - cr[0], cr[3] - cr[1]) * .26, rc)
    else: disc(d, ccx, ccy, min(cr[2] - cr[0], cr[3] - cr[1]) * (.42 if m == 4 else .34), rc)                     # the ram cylinder
    if p == "V":
        d.rectangle([cr[0] + 3, cr[1] + 3, cr[2] - 3, cr[3] - 3], outline=BRASS[3] if c.w >= 3 else L[0])       # lining out
    if p == "G":
        for q in range(int(cr[0]) + 4, int(cr[2]) - 2, 6): bolt(d, q, cr[1] + 3, IRON); bolt(d, q, cr[3] - 3, IRON)
    px0 = X1 - 20                                                                                             # the pump
    if p == "V":
        case(d, px0, Y0 + 20, X1 - 3, Y0 + 44, IRON, r=2); d.line([px0 + 8, Y0 + 32, X1 - 2, Y1 - 10], fill=OUT, width=4); d.line([px0 + 8, Y0 + 32, X1 - 2, Y1 - 10], fill=STEEL[3], width=2)
        dial(d, px0 + 8, Y0 + 12, 5, rim=BRASS[1])
    elif p == "G":
        case(d, px0, Y0 + 20, X1 - 3, Y0 + 50, IRON, r=2); d.rectangle([px0 + 2, Y0 + 8, X1 - 5, Y0 + 16], fill=(110, 70, 40), outline=OUT)   # belt pulley
        dial(d, px0 + 8, Y0 + 58, 5)
    else:
        case(d, px0, Y0 + 10, X1 - 2, Y0 + 48, c.alt, r=3); louvres(d, px0 + 3, Y0 + 14, X1 - 5, Y0 + 26, c.alt, 3)
        case(d, px0 + 2, Y0 + 52, X1 - 4, Y0 + 66, ramp((50, 50, 56), 8)); lamp(d, px0 + 6, Y0 + 59, (90, 220, 90), True, 2); lamp(d, px0 + 13, Y0 + 59, (230, 60, 40), False, 2)
        cable(d, [(px0, Y0 + 30), (cr[2], ccy)], (30, 30, 34), 2)
    if p in "NF":                                                                                              # light-curtain posts
        for q in (bed[0] - 2, bed[2] - 4): d.rectangle([q, bed[3] - 2, q + 6, Y1 - 1], fill=YEL[2] if p == "N" else ramp((40, 40, 46), 8)[2], outline=OUT); d.point((q + 3, bed[3] + 1), fill=(240, 60, 40))
    if p == "F": d.line([cr[0] + 2, cr[3] - 2, cr[2] - 2, cr[3] - 2], fill=GLOW[2] if not c.broken else GLOW[0], width=2)
    if c.broken: d.ellipse([bed[0], bed[3] - 10, bed[0] + 26, bed[3] + 2], fill=(120, 90, 30))                    # a pool of leaked oil


reg("hydraulicpress", hydraulicpress, "four-column and H-frame presses of 3 to 4 ft square at the bed (Bramah's patent press; Elmes, Dake and Enerpac catalogues)",
    front=True, clear=3)


def industrialpump(tm, x, y, w, h, st, v, c):
    """An industrial pump on its baseplate from above, its flanged pipes in and out. Victorian: a steam duplex pump
    with two steam cylinders and two water cylinders end to end, the valve chest and the rods between. Great War: a
    centrifugal pump's snail-shell volute, driven by a flat belt. Mid-Century: a motor and volute in the maker's
    colour coupled on a baseplate. Modern: a motor and pump with a yellow coupling guard. Future Darkness: a sealed
    canned pump in dark plate with a lit band. Running: the rods or coupling a blur and the lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    run = c.on and not c.broken
    case(d, X0 + 2, Y0 + H * .2, X1 - 2, Y1 - H * .2, ramp((70, 72, 76), 10) if p != "V" else IRON)           # baseplate
    pipe = c.metal if p != "F" else ramp((60, 64, 72), 10)
    pc = ramp([(110, 110, 116), (60, 90, 140), (60, 110, 70), (150, 60, 50)][m % 4], 14) if p in "MN" else pipe
    tube(d, X0, Y0 + 2, X0 + W * .3, Y0 + 16, pc)                                                             # suction pipe
    tube(d, X1 - W * .25, Y1 - 16, X1, Y1 - 2, pc)                                                            # delivery pipe
    for fx, fy in ((X0 + W * .3, Y0 + 9), (X1 - W * .25, Y1 - 9)): d.rectangle([fx - 2, fy - 9, fx + 2, fy + 9], fill=pipe[1], outline=OUT)   # flanges
    cy = Y0 + H / 2
    if p == "V":
        sc = ramp((150, 104, 64), 14) if m >= 3 else L                                                         # wood-lagged or painted steam cylinders
        wc = c.alt if m == 2 else IRON
        for k in range(2 if m % 2 == 0 else 1):                                                               # duplex or simplex: steam and water cylinders end to end
            yy = (cy - 9 + k * 18) if m % 2 == 0 else cy
            tube(d, X0 + 6, yy - 7, X0 + W * .38, yy + 7, sc); tube(d, X0 + W * .58, yy - 6, X1 - 6, yy + 6, wc)
            if m >= 3:
                for q in (X0 + 12, X0 + W * .3): d.line([q, yy - 6, q, yy + 6], fill=BRASS[3], width=2)
            d.rectangle([X0 + W * .38, yy - 1, X0 + W * .58, yy + 1], fill=STEEL[3] if not run else STEEL[4], outline=OUT)
        case(d, X0 + W * .14, cy - 4, X0 + W * .3, cy + 4, BRASS if c.w >= 3 else L)                          # valve chest
        if run: smoke(d, X0 + 12, cy - 18, 2, (230, 230, 234))
    elif p == "F":
        tube(d, X0 + 10, cy - 14, X1 - 10, cy + 14, L)
        d.line([X0 + 12, cy + 10, X1 - 12, cy + 10], fill=GLOW[2] if run else GLOW[0], width=2)
        louvres(d, X0 + 14, cy - 10, X0 + W * .3, cy + 2, L, 3, vert=True)
    else:
        vx, vy, vr = X0 + W * .3, cy, H * (.24 if m % 2 == 0 else .3)                                         # the volute
        vc = L
        if p == "G" and m >= 3: tube(d, X0 + 6, cy + vr + 2, X0 + W * .7, cy + vr + 8, c.alt)                   # a priming tank alongside
        d.ellipse([vx - vr, vy - vr, vx + vr, vy + vr], fill=vc[2], outline=OUT)
        d.arc([vx - vr * .7, vy - vr * .7, vx + vr * .7, vy + vr * .7], 0, 300, fill=vc[0], width=2); d.arc([vx - vr * .4, vy - vr * .4, vx + vr * .4, vy + vr * .4], 60, 360, fill=vc[4])
        d.ellipse([vx - 4, vy - 4, vx + 4, vy + 4], fill=vc[1], outline=OUT)
        if p == "G":
            d.rectangle([vx + vr, vy - 3, X0 + W * .6, vy + 3], fill=STEEL[2], outline=OUT)
            d.rectangle([X0 + W * .6, vy - 16, X0 + W * .66, vy + 16], fill=IRON[2], outline=OUT)                  # belt pulley
            d.line([X0 + W * .63, vy - 16, X1 - 6, Y0 + 4], fill=(110, 70, 40), width=3)
        else:
            gd = YEL if p == "N" or m % 2 else ramp(tone(L[2], -20), 12)
            case(d, vx + vr, vy - 6, X0 + W * .55, vy + 6, gd)                                                   # coupling guard
            if run: louvres(d, vx + vr + 2, vy - 4, X0 + W * .55 - 2, vy + 4, gd, 2, vert=True)
            case(d, X0 + W * .55, vy - H * .2, X1 - 8, vy + H * .2, c.alt if p == "N" else L, r=4)                   # the motor
            for q in range(int(X0 + W * .6), int(X1 - 12), 4): d.line([q, vy - H * .2 + 2, q, vy + H * .2 - 2], fill=(c.alt if p == "N" else L)[1])
            d.rectangle([X1 - 20, vy - H * .2 - 6, X1 - 10, vy - H * .2], fill=ramp((60, 60, 66), 8)[2], outline=OUT)   # terminal box
    dial(d, X0 + W * .3, Y0 + 9, 3, ang=-.4 if run else -2.4)
    lamp(d, X1 - 6, Y0 + 6, (90, 220, 90), run, 2)
    if c.broken: d.ellipse([X0 + W * .2, Y1 - 12, X0 + W * .6, Y1 + 1], fill=(70, 100, 130))                     # a leak


reg("industrialpump", industrialpump, "pump sets of 3 to 4 ft by 2 to 3 ft on their baseplate (Worthington duplex steam pumps; Gwynnes and Goulds centrifugal pumps)",
    states=("off", "on"), front=False, clear=2)


def intercom(tm, x, y, w, h, st, v, c):
    """An intercom panel on its wall, from above: its small plate. Mid-Century: a bakelite or chrome box with a round
    speaker grille and a push button. Modern: a steel or plastic panel with a column of buttons. Future Darkness:
    a dark glass plate with a camera eye. Talking: the lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    PAL = {"M": [(80, 50, 34), (30, 30, 32), (220, 210, 180), (180, 186, 194), (120, 130, 110), (150, 60, 50)],
           "N": [(176, 180, 184), (230, 230, 226), (50, 52, 58), (200, 190, 160), (40, 70, 120), (120, 124, 128)],
           "F": [(24, 26, 30), (220, 224, 228), (60, 30, 40), (30, 60, 70), (90, 94, 100), (40, 36, 60)]}[p]
    L = ramp(PAL[c.k % 6], 14)
    case(d, X0, Y0, X1, Y1, L, r=1)
    talk = st == "on"
    if p == "M":
        d.ellipse([X0 + 1, Y0, X0 + 5, Y1], fill=L[0]); d.rectangle([X1 - 3, Y0 + 1, X1 - 1, Y1 - 1], fill=CHROME[3] if m % 2 else (200, 40, 30))
    elif p == "N":
        d.rectangle([X0 + 1, Y0 + 1, X0 + 4, Y1 - 1], fill=L[0])
        d.rectangle([X1 - 4, Y0 + 1, X1 - 1, Y1 - 1], fill=[(230, 230, 226), (40, 40, 44), (200, 40, 30), (60, 120, 200), (230, 190, 50)][m])
    else:
        d.ellipse([X0 + 1, Y0, X0 + 4, Y1 - 1], fill=(20, 20, 24), outline=[(60, 200, 230), (230, 230, 230), (90, 230, 120), (240, 160, 40), (200, 80, 220)][m])
    d.point((X0 + W // 2, Y0 + 1), fill=(90, 240, 90) if talk else (60, 60, 60))
    if c.broken: d.line([X0, Y1, X1, Y0], fill=(240, 240, 230))


reg("intercom", intercom, "wall stations of about 4 by 6 in (Talk-A-Phone, Aiphone and Siedle catalogues)",
    ft=((.4, .6), (.2, .3)), states=("off", "on"), front=True, clear=1, mount="wall", off=1)


def irradiator(tm, x, y, w, h, st, v, c):
    """An irradiator from above: a self-shielded cell, its great round lead drum on a plinth, the sample drawer or
    lift at its top, the trefoil warning and the control console. Mid-Century: a hammertone grey drum with a dial
    console. Modern: a beige or blue drum or a square X-ray cabinet with a screen; a blood irradiator's turntable.
    Future Darkness: a dark sealed drum with lit bands. Open: the drawer slid out and the canister showing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    op = st == "open"
    case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, ramp((90, 92, 96), 10))                                             # the plinth
    cx, cy = X0 + W * .45, Y0 + H * .44; R = min(W, H) * .34
    if m == 1 and p != "M":                                                                                    # a square X-ray cabinet
        case(d, cx - R, cy - R, cx + R, cy + R, L, r=6); d.rectangle([cx - R + 8, cy - R + 8, cx + R - 8, cy + R - 8], outline=L[0], width=2)
    else:
        disc(d, cx, cy, R, L)
        d.ellipse([cx - R * .72, cy - R * .72, cx + R * .72, cy + R * .72], outline=L[0], width=2)
        if m == 4: disc(d, cx + R * .9, cy + R * .2, R * .45, L)                                               # a second drum
    if m == 2: d.ellipse([cx - R * .5, cy - R * .5, cx + R * .5, cy + R * .5], fill=ramp((60, 62, 70), 10)[2], outline=OUT)   # the turntable
    trefoil(d, cx - R * .55, cy + R * .55, 7)
    dw = (cx - 12, cy - 10, cx + 12, cy + 10)
    if op:
        d.rectangle([dw[0], cy + R - 4, dw[2], cy + R + 22], fill=SS[2], outline=OUT)                             # the drawer out
        disc(d, cx, cy + R + 9, 7, ramp((200, 60, 60), 14) if m == 2 else STEEL)
    d.rectangle(dw, fill=SS[3] if not op else (30, 30, 34), outline=OUT)
    cx2 = X1 - 26                                                                                               # the control console
    case(d, cx2, Y0 + 8, X1 - 6, Y0 + 40, labliv(c, 3), r=2)
    if p == "M":
        for q in range(3): dial(d, cx2 + 6 + (q % 2) * 8, Y0 + 14 + q * 8, 3)
    else:
        screen(d, cx2 + 3, Y0 + 11, X1 - 9, Y0 + 24, True, c.broken, tint=(240, 200, 80))
    lamp(d, cx2 + 10, Y0 + 34, (240, 60, 40) if op else (90, 220, 90), True, 2)
    if p == "F":
        d.arc([cx - R, cy - R, cx + R, cy + R], 0, 360, fill=(250, 200, 60) if not c.broken else (90, 70, 30), width=2)
    if c.broken: d.line([cx - R, cy - R * .2, cx + R * .4, cy + R], fill=(30, 28, 30), width=2)


reg("irradiator", irradiator, "self-shielded irradiators of 3 to 5 ft on a plinth of about 6 ft (Atomic Energy of Canada Gammacell 220; Gammacell and RS 2000 literature)",
    states=("closed", "open"), front=True, clear=3)


def labfreezer(tm, x, y, w, h, st, v, c):
    """A laboratory deep freezer against its wall, from above. An upright ultra-low freezer: the white or cream
    cabinet top, the compressor grille at the back, the handle and the display at the front edge. A chest freezer:
    a long lid with its seal and handle. Mid-Century: cream enamel and a chrome latch. Modern: white with a coloured
    maker's band and a red or green display. Future Darkness: white or dark with a lit band. Open: the door or lid
    back, the inner doors frosted and the racks of coloured sample boxes in clouds of cold."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    PAL = {"M": [(226, 220, 196), (236, 236, 230), (190, 196, 200), (170, 196, 176), (210, 196, 160), (160, 170, 186)],
           "N": [(238, 238, 234), (222, 214, 190), (200, 204, 208), (236, 236, 232), (180, 186, 194), (220, 224, 230)],
           "F": [(236, 238, 240), (40, 44, 52), (200, 206, 212), (70, 74, 84), (226, 232, 236), (30, 32, 38)]}[p]
    L = ramp(PAL[c.k % 6], 12)
    band = [(40, 90, 170), (200, 40, 40), (40, 140, 90), (240, 150, 40), (110, 60, 150)][m]
    op = st == "open"
    chest = m == 3
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=3)
    louvres(d, X0 + 4, Y0 + 3, X1 - 4, Y0 + 9, ramp((90, 94, 100), 10), 2)                                         # compressor grille
    if p != "M": d.rectangle([X0 + 2, Y0 + 11, X1 - 2, Y0 + 14], fill=band)
    if op:
        d.rectangle([X0 + 5, Y0 + 17, X1 - 5, Y1 - 4], fill=(210, 226, 236), outline=OUT)                        # frosted inside
        for q in range(4 if not chest else 6):
            bx = X0 + 8 + (q % 3) * ((W - 16) // 3); by = Y0 + 20 + (q // 3) * 12
            d.rectangle([bx, by, bx + (W - 22) // 3, by + 9], fill=[(230, 80, 80), (80, 140, 230), (240, 200, 60), (90, 200, 120), (200, 120, 220), (240, 240, 240)][(q + m) % 6], outline=OUT)
        d.ellipse([X0 + 10, Y1 - 16, X1 - 6, Y1 - 2], fill=(236, 244, 250))                                      # cold mist
        if not chest: d.line([X1 - 1, Y1 - 2, X1 + 2, Y1 + 30], fill=OUT, width=5); d.line([X1 - 1, Y1 - 2, X1 + 2, Y1 + 30], fill=L[3], width=3)   # the door swung out
    else:
        if chest:
            d.rectangle([X0 + 4, Y0 + 17, X1 - 4, Y1 - 4], outline=L[0]); d.rectangle([X0 + W * .35, Y1 - 6, X0 + W * .65, Y1 - 3], fill=CHROME[2], outline=OUT)
        else:
            d.rectangle([X1 - 8, Y0 + 18, X1 - 5, Y1 - 6], fill=CHROME[2] if p != "F" else ramp((40, 40, 46), 8)[3], outline=OUT)   # handle
        screen(d, X0 + 5, Y1 - 9, X0 + W * .45, Y1 - 3, True, c.broken, tint=(240, 80, 60) if c.broken else (80, 230, 120))
    if p == "M" and c.rich: d.rectangle([X0 + 3, Y0 + 15, X1 - 3, Y0 + 16], fill=CHROME[3])
    if p == "F": d.line([X0 + 3, Y1 - 2, X1 - 3, Y1 - 2], fill=GLOW[2] if not c.broken else (200, 50, 40), width=2)


reg("labfreezer", labfreezer, "ultra-low freezers of about 2 1/2 ft square (Revco and Thermo Scientific -80 freezers; So-Low chest freezers)",
    states=("closed", "open"), front=True, clear=3, mount="wall", back=.3)


def labrobot(tm, x, y, w, h, st, v, c):
    """A liquid-handling or gene-editing robot on its bench from above: the deck laid out in a grid of labware
    (microplates with their wells in colours, racks of yellow or blue tips, troughs of reagent), the gantry arm
    across it with its pipetting head of eight channels, and the frame or hood round it. Modern: a beige or grey
    frame open at the front. Future Darkness: a white or dark sealed hood with glass and a lit band. Running: the
    head over a plate and the lamp lit; idle: the head parked at the side."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    run = c.on and not c.broken
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=3 if p == "N" else 7)
    dk = (X0 + 5, Y0 + 9, X1 - 5, Y1 - 6)
    d.rectangle(dk, fill=ramp((150, 154, 160), 10)[1] if p == "N" else ramp((60, 64, 72), 10)[2], outline=OUT)   # the deck
    cols, rows = 4, 2
    cw, rh = (dk[2] - dk[0] - 4) / cols, (dk[3] - dk[1] - 4) / rows
    kinds = [(m + i) % 5 for i in range(cols * rows)]
    rng = np.random.default_rng(c.k * 13 + m)
    for i, kd in enumerate(kinds):
        bx, by = dk[0] + 2 + (i % cols) * cw, dk[1] + 2 + (i // cols) * rh
        b = (bx + 1, by + 1, bx + cw - 2, by + rh - 2)
        if kd in (0, 3):                                                                                        # a microplate
            d.rectangle(b, fill=(236, 236, 232), outline=OUT)
            wc = [(220, 60, 80), (60, 120, 220), (240, 200, 60), (90, 200, 120), (200, 120, 220)][(i + c.k) % 5]
            for qx in range(int(b[0]) + 2, int(b[2]) - 1, 3):
                for qy in range(int(b[1]) + 2, int(b[3]) - 1, 3):
                    if rng.random() < .7: d.rectangle([qx, qy, qx + 1, qy + 1], fill=wc)
        elif kd in (1, 4):                                                                                      # a tip rack
            d.rectangle(b, fill=(40, 40, 44), outline=OUT)
            tc = (240, 210, 60) if kd == 1 else (90, 150, 230)
            for qx in range(int(b[0]) + 2, int(b[2]) - 1, 3):
                for qy in range(int(b[1]) + 2, int(b[3]) - 1, 3): d.rectangle([qx, qy, qx + 1, qy + 1], fill=tc)
        else:                                                                                                   # a reagent trough
            d.rectangle(b, fill=(200, 210, 216), outline=OUT); d.rectangle([b[0] + 2, b[1] + 2, b[2] - 2, b[3] - 2], fill=[(160, 200, 230), (230, 160, 170), (200, 230, 160)][c.k % 3])
    gx = dk[0] + (dk[2] - dk[0]) * (.45 if run else .92)
    d.rectangle([dk[0], Y0 + 4, dk[2], Y0 + 9], fill=STEEL[2], outline=OUT)                                        # the rail
    d.rectangle([gx - 4, Y0 + 3, gx + 4, dk[3] - 2], fill=c.alt[2] if p == "N" else ramp((40, 44, 52), 10)[3], outline=OUT)   # the arm across
    hy = dk[1] + (dk[3] - dk[1]) * (.3 if run else .1)
    case(d, gx - 7, hy - 6, gx + 7, hy + 6, ramp((70, 74, 82), 10), r=2)                                       # the pipetting head
    for q in range(4): d.point((gx - 5 + q * 3, hy + 4), fill=(230, 230, 236))
    if p == "F":
        d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 6, outline=GLASS[3], width=2)
        d.line([X0 + 6, Y1 - 3, X1 - 6, Y1 - 3], fill=GLOW[2] if run else GLOW[0], width=2)
    lamp(d, X1 - 6, Y0 + 5, (90, 220, 90), run, 2)
    if c.broken: d.line([gx - 4, hy, dk[2] - 4, dk[3] - 2], fill=(30, 30, 34), width=2); sparks(d, gx, hy)


reg("labrobot", labrobot, "liquid handlers with a deck of about 3 by 2 ft (Beckman Biomek 2000, Tecan Freedom EVO and Opentrons literature)",
    states=("off", "on"), front=True, clear=2)


def laserrig(tm, x, y, w, h, st, v, c):
    """A laboratory laser on its optical table from above: the grey steel table top with its grid of tapped holes,
    the laser head's long body at one end, mirrors and lenses on their posts, beam blocks, the power supply and the
    chiller beside it. Mid-Century: a long tube laser (ruby, helium-neon, argon) in a cream or grey housing and a
    rack of supplies. Modern: a compact head and fibre. Future Darkness: a dark table with a lit enclosure edge.
    Firing: the beam drawn red, green or blue along its path from mirror to mirror; off: the path dark."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = labliv(c)
    fire = c.on and not c.broken
    tb = ramp([(150, 154, 160), (96, 100, 106), (50, 52, 58), (186, 190, 194), (120, 132, 150), (150, 144, 134)][c.k % 6] if p != "F" else LIV["F"][c.k % 7], 8)
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, tb)
    if m == 2: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=(24, 24, 26), width=5)                    # blackout curtains round it
    if m == 4: d.rectangle([X0 + W * .55, Y0 + H * .35, X1 - 4, Y1 - 4], fill=mix(GLASS[2], tb[2], .5), outline=GLASS[0])   # an acrylic enclosure
    for qx in range(X0 + 6, X1 - 4, 8):                                                                           # the hole grid
        for qy in range(Y0 + 6, Y1 - 4, 8): d.rectangle([qx, qy, qx + 1, qy + 1], fill=tb[0])
    beam = [(250, 40, 40), (60, 250, 80), (60, 120, 255), (250, 60, 40), (180, 80, 255)][m]
    hl = (X0 + 6, Y0 + H * .18, X0 + W * (.45 if p == "M" else .22), Y0 + H * .4)                                 # the laser head
    case(d, *hl, L if p != "F" else ramp(LIV["F"][c.k % 7], 12), r=4)
    if p == "M": louvres(d, hl[0] + 6, hl[1] + 3, hl[0] + 30, hl[3] - 3, L, 3, vert=True)
    by = (hl[1] + hl[3]) / 2
    pts = [(hl[2], by), (X1 - 20, by), (X1 - 20, Y1 - 18), (X0 + W * .5, Y1 - 18), (X0 + W * .5, Y0 + H * .62), (X0 + W * .3, Y0 + H * .62)]
    if fire:
        for a, b in zip(pts, pts[1:]): d.line([a, b], fill=mix(beam, (255, 255, 255), .2), width=2)
    for k, (mx, my) in enumerate(pts[1:]):                                                                       # mirrors and lenses on posts
        d.rectangle([mx - 3, my - 3, mx + 3, my + 3], fill=STEEL[3] if k % 2 else (40, 40, 44), outline=OUT)
        d.line([mx - 3, my + 3, mx + 3, my - 3], fill=GLASS[4])
    d.rectangle([X0 + W * .3 - 8, Y0 + H * .62 - 5, X0 + W * .3 - 2, Y0 + H * .62 + 5], fill=(30, 30, 34), outline=OUT)   # beam block
    sx = X0 + W * (.6 if p == "M" else .3)                                                                       # supplies and chiller
    case(d, sx, Y0 + 3, sx + 34, Y0 + H * .28, labliv(c, 2), r=2)
    if p == "M":
        for q in range(4): dial(d, sx + 5 + q * 8, Y0 + 9, 3)
    else:
        screen(d, sx + 3, Y0 + 5, sx + 22, Y0 + 12, fire, c.broken, tint=beam)
    if m == 1: case(d, X1 - 18, Y0 + 3, X1 - 3, Y0 + H * .3, ramp((60, 110, 170), 12), r=2)                       # the chiller
    if m == 3 and p != "M": cable(d, [(hl[2], by + 4), (X0 + W * .4, Y1 - 6), (X0 + W * .7, Y1 - 8)], (240, 190, 40), 1)   # a fibre
    if p == "F": d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=GLOW[2] if fire else GLOW[0])
    lamp(d, hl[0] + 6, hl[3] - 4, (250, 60, 40), fire, 2)
    if c.broken: d.line([pts[2][0] - 4, pts[2][1] - 4, pts[2][0] + 6, pts[2][1] + 6], fill=GLASS[4]); sparks(d, hl[2], by)
    if fire: return [(X0 + W * .5, Y0 + H * .5, 50, tuple(.6 + q / 255 * .9 for q in beam))]


reg("laserrig", laserrig, "optical tables of 8 to 10 ft by 4 ft (Newport and TMC catalogues; Spectra-Physics helium-neon and argon lasers)",
    states=("on", "off"), front=False, clear=3)


def machinery(tm, x, y, w, h, st, v, c):
    """A heavy industrial machine from above: a long lathe (bed, headstock, chuck, carriage, tailstock), a planer
    with its great reciprocating table, a horizontal mill, a power press with its flywheel, or a boring machine.
    Victorian: cast iron in black or green, driven by flat belts from the overhead shaft, its stepped cone pulley.
    Great War: a geared head and a belt to its own countershaft. Mid-Century: enamelled castings in the maker's
    grey, green or blue with its own motor. Modern: a CNC machine in its sheet-metal enclosure with a window and a
    control screen. Future Darkness: a robot cell behind its fence. Running: the belts and chips flying, the
    lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    run = c.on and not c.broken
    if p in "NF" and m != 4:
        if p == "N":
            case(d, X0 + 2, Y0 + 4, X1 - 2, Y1 - 4, L, r=4)                                                       # the enclosure
            d.rectangle([X0 + W * .2, Y0 + H * .25, X0 + W * .7, Y1 - 12], fill=GLASS[1], outline=OUT)
            d.rectangle([X0 + W * .22, Y0 + H * .3, X0 + W * .68, Y1 - 14], fill=mix(GLASS[1], (40, 40, 44), .5))
            disc(d, X0 + W * .38, Y0 + H * .55, 10, STEEL)
            case(d, X0 + W * .74, Y0 + H * .25, X1 - 8, Y1 - 14, ramp((50, 52, 58), 8)); screen(d, X0 + W * .76, Y0 + H * .3, X1 - 10, Y0 + H * .5, run, c.broken)
            d.line([X0 + 4, Y0 + 6, X1 - 4, Y0 + 6], fill=c.alt[2], width=3)
            lamp(d, X1 - 10, Y0 + 12, (90, 220, 90) if run else (230, 60, 40), True, 3)
        else:
            d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=OUT, width=3); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=YEL[2])   # the cell fence
            for q in range(X0 + 12, X1 - 4, 14): d.line([q, Y0 + 3, q, Y0 + 8], fill=YEL[0])
            case(d, X0 + W * .15, Y0 + H * .3, X0 + W * .5, Y1 - 16, L, r=5)                                       # the machine
            bx, by = X0 + W * .66, Y0 + H * .5                                                                     # the robot arm
            disc(d, bx, by, 12, ramp((220, 120, 40), 14) if c.k % 2 else ramp((220, 220, 216), 10))
            d.line([bx, by, X0 + W * .45, Y0 + H * .4], fill=OUT, width=8); d.line([bx, by, X0 + W * .45, Y0 + H * .4], fill=ramp((220, 120, 40), 14)[3] if c.k % 2 else (230, 230, 226), width=5)
            d.line([X0 + 6, Y1 - 6, X1 - 6, Y1 - 6], fill=GLOW[2] if run else GLOW[0], width=2)
        if c.broken: sparks(d, X0 + W * .5, Y0 + H * .5)
        return
    body = L if p != "V" or c.k % 2 else IRON
    if p in "VG":                                                                                               # the overhead shaft's belts, or a countershaft
        sy = Y0 + 6
        d.rectangle([X0 + 2, sy - 3, X1 - 2, sy + 3], fill=STEEL[1], outline=OUT)
        for q in (X0 + W * .2, X0 + W * .55): d.rectangle([q - 3, sy - 6, q + 3, sy + 6], fill=WOOD[2], outline=OUT)
    if m == 0:                                                                                                  # a lathe
        case(d, X0 + 6, Y0 + H * .35, X1 - 6, Y0 + H * .62, body)                                              # the bed
        d.line([X0 + 8, Y0 + H * .4, X1 - 8, Y0 + H * .4], fill=STEEL[3]); d.line([X0 + 8, Y0 + H * .57, X1 - 8, Y0 + H * .57], fill=STEEL[3])
        case(d, X0 + 4, Y0 + H * .22, X0 + W * .22, Y0 + H * .75, body, r=3)                                    # headstock
        if p == "V":
            for k in range(4): d.rectangle([X0 + 8 + k * 7, Y0 + H * .3, X0 + 13 + k * 7, Y0 + H * .67 - k * 2], fill=IRON[3 - k % 2], outline=OUT)   # cone pulley
        disc(d, X0 + W * .25, Y0 + H * .48, 9, STEEL)                                                          # chuck
        tube(d, X0 + W * .25, Y0 + H * .45, X0 + W * .7, Y0 + H * .51, RUST if c.poor else STEEL)            # the work
        case(d, X0 + W * .45, Y0 + H * .3, X0 + W * .56, Y0 + H * .7, ramp(tone(body[2], 30), 14))            # carriage
        case(d, X1 - W * .18, Y0 + H * .36, X1 - 8, Y0 + H * .6, body, r=2)                                     # tailstock
        if run: d.ellipse([X0 + W * .5, Y0 + H * .62, X0 + W * .62, Y0 + H * .74], fill=(200, 180, 120))       # swarf
    elif m == 1:                                                                                                # a planer
        case(d, X0 + 4, Y0 + H * .28, X1 - 4, Y1 - 8, body)
        tb = (X0 + (W * .1 if not run else W * .25), Y0 + H * .36, X0 + (W * .7 if not run else W * .85), Y1 - 14)
        case(d, *tb, STEEL)
        for q in range(int(tb[1]) + 4, int(tb[3]), 6): d.line([tb[0] + 2, q, tb[2] - 2, q], fill=STEEL[1])
        case(d, X0 + W * .45, Y0 + H * .18, X0 + W * .55, Y1 - 4, ramp(tone(body[2], 20), 14))                   # the cross rail
    elif m == 2:                                                                                                # a horizontal mill
        case(d, X0 + W * .1, Y0 + H * .2, X0 + W * .4, Y1 - 8, body, r=3)                                       # column
        case(d, X0 + W * .35, Y0 + H * .4, X1 - 8, Y0 + H * .66, STEEL)                                        # table
        d.rectangle([X0 + W * .4, Y0 + H * .44, X0 + W * .54, Y0 + H * .62], fill=ramp((150, 110, 70), 14)[2], outline=OUT)   # vice and work
        d.rectangle([X0 + W * .3, Y0 + H * .5, X0 + W * .62, Y0 + H * .54], fill=STEEL[4], outline=OUT)        # arbor
    elif m == 3:                                                                                                # a power press
        case(d, X0 + W * .2, Y0 + H * .2, X0 + W * .75, Y1 - 10, body, r=4)
        d.ellipse([X0 + W * .62, Y0 + H * .1, X0 + W * .76, Y1 - 12], fill=IRON[2], outline=OUT)               # flywheel on edge
        for q in range(int(Y0 + H * .15), int(Y1 - 14), 6): d.line([X0 + W * .64, q, X0 + W * .74, q], fill=IRON[4] if not run else IRON[3])
        d.rectangle([X0 + W * .3, Y0 + H * .4, X0 + W * .55, Y0 + H * .7], fill=STEEL[2], outline=OUT)        # the die
        case(d, X0 + W * .3, Y1 - 10, X0 + W * .55, Y1 - 3, ramp((180, 180, 186), 10))                          # stock strip
    else:                                                                                                       # a boring machine
        case(d, X0 + 6, Y0 + H * .55, X1 - 6, Y1 - 6, body)
        disc(d, X0 + W * .3, Y0 + H * .4, 16, ramp(tone(body[2], 20), 14)); disc(d, X0 + W * .3, Y0 + H * .4, 6, STEEL)
        case(d, X0 + W * .5, Y0 + H * .25, X1 - 10, Y0 + H * .55, STEEL)
    if p in "VG":
        for q in (X0 + W * .2, X0 + W * .55): d.line([q, Y0 + 9, q, Y0 + H * .3], fill=(110, 70, 40) if not run else (150, 110, 70), width=4)   # belts down
    if p == "M": case(d, X1 - 22, Y1 - 18, X1 - 4, Y1 - 4, ramp((90, 96, 104), 12), r=4); lamp(d, X1 - 13, Y1 - 11, (90, 220, 90), run, 2)   # its own motor
    if p == "N": case(d, X1 - 20, Y0 + 4, X1 - 4, Y0 + 20, c.alt); screen(d, X1 - 18, Y0 + 6, X1 - 6, Y0 + 14, run, c.broken)
    if p == "F": d.line([X0 + 4, Y1 - 3, X1 - 4, Y1 - 3], fill=GLOW[2] if run else GLOW[0], width=2)
    if c.broken: sparks(d, X0 + W * .5, Y0 + H * .5)


reg("machinery", machinery, "lathes, planers and presses of 8 by 4 to 5 ft (Brown and Sharpe, Cincinnati and Monarch catalogues; Whitworth lathes)",
    states=("off", "on"), front=True, clear=3)


def metaldetector(tm, x, y, w, h, st, v, c):
    """A walk-through metal detector from above: the top of the arch between its two side panels, the black rubber
    mat running through it in and out, the zone lamps along the header and, beside it, a table with a grey tray of
    keys and coins. Mid-Century: a boxy beige or grey arch with a control box on top. Modern: a grey or black arch
    with a bar of zone lamps. Future Darkness: a slim dark arch with lit edges. Sounding: the lamps red."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    PAL = {"M": [(206, 196, 170), (150, 150, 146), (120, 130, 150), (226, 220, 200), (90, 94, 100), (170, 150, 110)],
           "N": [(120, 124, 130), (40, 42, 48), (200, 200, 196), (60, 80, 120), (170, 176, 180), (100, 60, 50)],
           "F": [(24, 26, 30), (220, 224, 228), (60, 64, 72), (30, 60, 70), (110, 30, 40), (150, 156, 164)]}[p]
    L = ramp(PAL[c.k % 6], 12)
    alarm = st == "on"
    ax0, ax1 = X0 + 4, X1 - (16 if m % 2 == 0 else 4)
    d.rectangle([(ax0 + ax1) / 2 - 14, Y0, (ax0 + ax1) / 2 + 14, Y1], fill=(36, 36, 38), outline=OUT)          # the mat
    for q in range(int(Y0) + 3, int(Y1), 4): d.line([(ax0 + ax1) / 2 - 12, q, (ax0 + ax1) / 2 + 12, q], fill=(50, 50, 54))
    for xx in (ax0, ax1 - 10): case(d, xx, Y0 + H * .15, xx + 10, Y0 + H * .85, L, r=2)                         # the side panels
    hd = (ax0, Y0 + H * .3, ax1, Y0 + H * .7)
    case(d, *hd, L, r=2 if p != "F" else 6)                                                                    # the header
    lc = (240, 50, 40) if alarm else (60, 220, 90)
    if p == "M":
        case(d, (ax0 + ax1) / 2 - 8, hd[1] - 6, (ax0 + ax1) / 2 + 8, hd[1] + 4, ramp(tone(L[2], -30), 12)); lamp(d, (ax0 + ax1) / 2, hd[1] - 1, lc, True, 2)
    else:
        for q in range(5): d.rectangle([ax0 + 10 + q * ((ax1 - ax0 - 20) / 5), hd[1] + 3, ax0 + 14 + q * ((ax1 - ax0 - 20) / 5), hd[3] - 3], fill=lc if (alarm or q == 0) else (40, 50, 44))
    if p == "F": d.rounded_rectangle(hd, 6, outline=(60, 220, 230) if not alarm else (240, 60, 50))
    if m in (1, 3): d.rectangle([ax0 + 12, hd[3] - 6, ax1 - 12, hd[3] - 3], fill=[(200, 40, 40), (40, 90, 180), (230, 190, 50), (240, 240, 236)][c.k % 4])   # a maker's or the authority's band
    if m % 2 == 0:                                                                                              # the side table and tray
        case(d, X1 - 14, Y0 + 4, X1 - 2, Y1 - 4, ramp((150, 120, 80), 12) if p == "M" else ramp((160, 164, 170), 10))
        d.rectangle([X1 - 12, Y0 + 10, X1 - 4, Y0 + 24], fill=ramp((110, 114, 120), 8)[2], outline=OUT)
        d.ellipse([X1 - 11, Y0 + 12, X1 - 8, Y0 + 15], fill=BRASS[3]); d.rectangle([X1 - 8, Y0 + 17, X1 - 5, Y0 + 22], fill=(30, 30, 34))
    if c.broken: d.line([hd[0] + 4, hd[1] + 2, hd[2] - 10, hd[3] - 2], fill=(30, 28, 30), width=2)


reg("metaldetector", metaldetector, "walk-through arches of about 2 1/2 ft by 2 ft deep with a 30 in passage (Garrett, CEIA and Rapiscan literature; airport arches from 1972)",
    states=("off", "on"), front=True, clear=4)
