"""Machines added from a check of Cataclysm's world objects, second batch (B6349): the dairy, the machine shop and the
wood shop (milking machine, milling machine, mitre saw, jointer, table saw, tyre changer), the works and the yard
(mixing vat, pallet racking, pipework, storage tank, robot arm, roof vent, air vent), the laboratory and the clinic
(NMR magnet, mass spectrometer, oxygen concentrator, water purifier, surgical robot, radioisotope generator), the
office and the street (shredder, ticket machine, telecom cabinet), the gym (rowing machine), the strategic works
(missile in its silo, reactor core), the Technocracy and its rivals (nanofabricator, neural couch, dimensional gate,
psychic test chair), and two old machines that people built by hand: the winch and the windmill, plus the small wind
turbine.

Every drawing is seen from straight above with its front to the south. Mass-made machines look the same the world
over (DRAWING.md, "Never make up a regional look"): each carries `global_from` its first year, and its variations
come from what really changes: the form of its age, the makers' liveries (`livery`), the model (`make`), which side
its controls sit (`hand`), wealth (a dented, taped, rusted one against a polished one with its badge) and wear. The
winch before the iron foundries and the windmill in every age were built from what each place had, so they vary by
region in honest ways only: the type of mill a people built (post mill, tower mill with cloth jib sails, smock mill,
the vertical-axis mill of Persia and Sistan, the Chinese mat-sail mill), its timber, stone, render and roofing.

Each drawing is wrapped by `_obj`, which lays the condition on the pixels it drew (worn: faded, scuffed, stained;
broken: a crack), rust and tape on a poor owner's ironwork, a few glints on a rich one's, and one short shadow
south-east."""
import math

import numpy as np
from PIL import Image

from px import OUT
from library.core import define
from library.census import CENSUS, ERAS
from library.art import tone, mix, ramp, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW

# the period of each era: A before the foundries (hand-built), V Victorian, G Great War, M Mid-Century, N Modern, F Future
PER = {"dark-ages": "D", "long-night": "L", "renaissance": "R", "age-of-reason": "A", "victorian": "V", "great-war": "G",
       "mid-century": "M", "modern": "N", "future-darkness": "F"}
AGE2ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century",
           "modern": "modern", "Future Darkness": "future-darkness"}
GREY = (124, 118, 110)
RUST = ramp((128, 72, 44), 16)
CHROME = [(70, 76, 86), (120, 128, 140), (176, 184, 194), (214, 220, 228), (246, 248, 250)]
RUBBER = ramp((44, 44, 48), 10)
COPPER = ramp((176, 100, 56), 20)
WOOD = ramp((128, 82, 48), 18)
DARKWOOD = ramp((92, 54, 34), 16)
CONC = ramp((150, 148, 140), 10)
RED = ramp((188, 40, 34), 20)
YEL = ramp((222, 184, 40), 18)
ORANGE = ramp((220, 110, 34), 18)
HAZ = ((232, 190, 30), (30, 28, 30))
CYAN, ICE, VIOLET = (1.0, 1.3, 1.5), (1.1, 1.3, 1.6), (1.3, 1.0, 1.6)

# the makers' liveries of each age (paint a factory really sold), chosen by the "livery" axis 0..5
LIV = {
    "A": [(110, 80, 52), (96, 66, 44), (130, 96, 60), (84, 60, 42), (120, 90, 62), (100, 74, 50)],
    "V": [(40, 40, 46), (66, 104, 72), (120, 44, 46), (136, 134, 128), (120, 84, 56), (56, 70, 116)],
    "G": [(72, 110, 78), (150, 150, 144), (96, 64, 46), (170, 120, 72), (66, 86, 140), (132, 52, 48)],
    "M": [(226, 218, 190), (90, 180, 170), (150, 184, 210), (110, 130, 110), (126, 132, 132), (190, 60, 52)],
    "N": [(46, 48, 54), (236, 236, 230), (220, 176, 40), (40, 130, 140), (176, 180, 184), (200, 60, 46)],
    "F": [(214, 218, 222), (30, 90, 96), (66, 70, 80), (110, 36, 44), (20, 22, 26), (120, 110, 150)],
}
SCREEN_ON = [(20, 40, 60), (60, 120, 170), (140, 200, 230), (220, 244, 250)]
SCREEN_OFF = [(16, 18, 22), (30, 32, 38), (48, 52, 60), (70, 76, 86)]

# what each region really built hand-made machines from: timber, stone, render or whitewash, roofing (no ornament)
STY = {
    "central":       dict(wood=(140, 102, 62), stone=(150, 146, 138), render=(214, 206, 186), roof=(150, 70, 50)),
    "atlantic":      dict(wood=(122, 84, 52), stone=(112, 116, 124), render=(200, 196, 182), roof=(70, 74, 86)),
    "northern":      dict(wood=(70, 54, 44), stone=(88, 92, 100), render=(170, 60, 44), roof=(110, 96, 70)),
    "mediterranean": dict(wood=(108, 74, 50), stone=(222, 208, 176), render=(238, 234, 222), roof=(196, 104, 64)),
    "islamic":       dict(wood=(120, 80, 50), stone=(204, 168, 112), render=(214, 186, 140), roof=(176, 150, 110)),
    "steppe":        dict(wood=(176, 120, 70), stone=(160, 132, 96), render=(186, 150, 110), roof=(190, 176, 150)),
    "southasia":     dict(wood=(150, 96, 48), stone=(180, 98, 74), render=(206, 170, 120), roof=(160, 96, 70)),
    "eastasia":      dict(wood=(94, 64, 46), stone=(120, 128, 138), render=(226, 222, 210), roof=(70, 72, 80)),
    "seasia":        dict(wood=(196, 166, 96), stone=(160, 96, 66), render=(180, 150, 104), roof=(150, 140, 80)),
    "africa":        dict(wood=(80, 52, 36), stone=(176, 100, 62), render=(160, 92, 56), roof=(188, 160, 96)),
    "americas":      dict(wood=(166, 118, 78), stone=(196, 148, 108), render=(200, 164, 120), roof=(156, 132, 96)),
    "oceania":       dict(wood=(116, 80, 54), stone=(76, 76, 82), render=(150, 130, 100), roof=(176, 158, 104)),
    "polar":         dict(wood=(156, 150, 138), stone=(60, 64, 70), render=(222, 226, 230), roof=(130, 120, 104)),
}


class C:
    """One variation's look: its age, means, state, condition and the palettes they give."""
    def __init__(s, v, st, era0):
        s.era = v.get("era") or AGE2ERA.get(v.get("age"), era0)
        s.per = PER.get(s.era, "M"); s.w = int(v.get("wealth", 3)); s.cond = v.get("condition", "new"); s.v = v
        s.poor, s.rich = s.w <= 1, s.w >= 4
        s.on = st in ("on", "open", "lit", "full"); s.open = st == "open"; s.broken = s.cond == "broken"
        k = int(v.get("livery", 0)) % 6
        lp = LIV.get(s.per if s.per in LIV else "A")
        base = lp[k]
        if s.poor: base = mix(base, GREY, .3)
        s.liv = ramp(base, 18)
        s.alt = ramp(lp[(k + 3) % 6], 18)
        s.metal = RUST if s.w == 0 else (CHROME if s.rich else STEEL)
        s.trim = (BRASS if s.per in "DLRAVG" else CHROME) if s.rich else (IRON if s.per in "DLRAVG" else STEEL)
        s.make = int(v.get("make", 0))
        s.style = v.get("style") or "central"
        s.sty = STY.get(s.style, STY["central"])

    def axis(s, k, d): return s.v.get(k, d)


def mk(c, n): return int(c.make) % n


def _obj(fn, era0, off=4):
    """Wrap a drawing: a mirrored build where asked, and a short shadow south-east."""
    def draw(tm, x, y, w, h, st, v):
        c = C(v, st, era0); before = np.asarray(tm.img).copy()
        glows = fn(tm, x, y, w, h, st, v, c) or []
        if v.get("hand") == "left":                                                     # the other-handed model: controls on the other side
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
            sh = np.zeros_like(m); sh[off:, off - 1:] = m[:-off, :-(off - 1)]; sh &= ~m
            a[sh] = before[sh].astype(np.float32) * np.array([.55, .56, .62], np.float32)
        tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
        for gx, gy, gr, col in glows:
            tm.glow(gx, gy, gr, col=col, power=.8)
    draw.__doc__ = fn.__doc__
    return draw


# ---------------------------------------------------------------- small parts
def case(d, x0, y0, x1, y1, Cl, r=0, out=OUT):
    """A painted or plastic case from above: outline, lit north and west edges, dark south and east edges."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 < x0: x0, x1 = x1, x0
    if y1 < y0: y0, y1 = y1, y0
    r = min(r, (x1 - x0) // 2, (y1 - y0) // 2)
    if r > 0: d.rounded_rectangle([x0, y0, x1, y1], r, fill=Cl[2], outline=out)
    else: d.rectangle([x0, y0, x1, y1], fill=Cl[2], outline=out)
    q = r // 2
    if x1 - x0 > 4 and y1 - y0 > 4:
        d.line([x0 + 1 + q, y0 + 1, x1 - 1 - q, y0 + 1], fill=Cl[4]); d.line([x0 + 1, y0 + 1 + q, x0 + 1, y1 - 1 - q], fill=Cl[3])
        d.line([x0 + 1 + q, y1 - 1, x1 - 1 - q, y1 - 1], fill=Cl[0]); d.line([x1 - 1, y0 + 1 + q, x1 - 1, y1 - 1 - q], fill=Cl[1])


def disc(d, cx, cy, r, Cl, out=OUT, ry=None):
    """A round top lit from the north-west: rim, body, a lit crescent north-west and a dark one south-east."""
    ry = ry or r
    d.ellipse([cx - r, cy - ry, cx + r, cy + ry], fill=Cl[2], outline=out)
    if r > 4:
        d.arc([cx - r + 1, cy - ry + 1, cx + r - 1, cy + ry - 1], 180, 270, fill=Cl[4])
        d.arc([cx - r + 1, cy - ry + 1, cx + r - 1, cy + ry - 1], 0, 90, fill=Cl[0])


def louvres(d, x0, y0, x1, y1, Cl, step=3, vert=False):
    """Vent slots in a panel."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if vert:
        for k in range(x0, x1, step): d.line([k, y0, k, y1], fill=Cl[0]); d.line([k + 1, y0, k + 1, y1], fill=Cl[3])
    else:
        for k in range(y0, y1, step): d.line([x0, k, x1, k], fill=Cl[0]); d.line([x0, k + 1, x1, k + 1], fill=Cl[3])


def lamp(d, x, y, col, lit, r=2):
    """An indicator lamp: bright with a pale core when lit, dull when out."""
    d.ellipse([x - r, y - r, x + r, y + r], fill=col if lit else mix(col, (30, 30, 34), .7), outline=OUT)
    if lit: d.rectangle([x - 1, y - 1, x, y], fill=mix(col, (255, 255, 255), .6))


def dial(d, cx, cy, r, face=(230, 224, 204), needle=(30, 30, 30), ang=-.8, rim=None):
    """A round gauge: rim, face, a needle."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=face, outline=rim or OUT)
    d.line([cx, cy, cx + math.cos(ang) * (r - 1), cy + math.sin(ang) * (r - 1)], fill=needle, width=1)


def wheel(d, cx, cy, r, Cl, spokes=4, a0=0.0):
    """A handwheel or crank wheel from above, on edge seen as a disc with spokes."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OUT, width=3); d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=Cl[3])
    for k in range(spokes):
        a = a0 + k * 2 * math.pi / spokes; d.line([cx, cy, cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=Cl[1], width=2)
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=Cl[3], outline=OUT)


def cable(d, pts, col=(34, 34, 38), w=2):
    d.line(pts, fill=OUT, width=w + 2, joint="curve"); d.line(pts, fill=col, width=w, joint="curve")


def sparks(d, x, y):
    """Sparks off a torn wire: a bright star and two flecks."""
    x, y = int(x), int(y)
    d.line([x - 3, y, x + 3, y], fill=(255, 240, 140)); d.line([x, y - 3, x, y + 3], fill=(255, 240, 140))
    d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 230))
    d.rectangle([x + 4, y - 5, x + 5, y - 4], fill=(255, 210, 80)); d.rectangle([x - 6, y + 3, x - 5, y + 4], fill=(255, 210, 80))


def screen(d, x0, y0, x1, y1, lit, broken=False, tint=None):
    """A screen: dark glass when off, lit with a soft picture when on; smashed glass when broken."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    P = SCREEN_ON if lit and not broken else SCREEN_OFF
    if tint and lit and not broken: P = [mix(p, tint, .35) for p in P]
    d.rectangle([x0, y0, x1, y1], fill=P[1], outline=OUT)
    if lit and not broken:
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, (y0 + y1) // 2], fill=P[2])
        d.rectangle([x0 + (x1 - x0) // 3, (y0 + y1) // 2 - 1, x0 + 2 * (x1 - x0) // 3, y1 - 2], fill=P[3])
    elif x1 - x0 > 6:
        d.line([x0 + 2, y0 + 2, x0 + min(x1 - x0, y1 - y0) // 2 + 2, y0 + 2], fill=P[3])
    if broken:
        cx, cy = x0 + (x1 - x0) * .4, y0 + (y1 - y0) * .45
        for a in (0.3, 1.4, 2.5, 3.6, 4.7, 5.6):
            L = max(x1 - x0, y1 - y0) * .5
            ex, ey = min(max(cx + math.cos(a) * L, x0 + 1), x1 - 1), min(max(cy + math.sin(a) * L, y0 + 1), y1 - 1)
            d.line([cx, cy, ex, ey], fill=(200, 210, 220))


def hazard(d, x0, y0, x1, y1, s=5):
    """Yellow and black hazard stripes."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=HAZ[0])
    for k in range(x0 - (y1 - y0), x1, s * 2):
        pts = [(max(x0, k), y1), (min(x1, k + s), y1), (min(x1, k + s + (y1 - y0)), y0), (max(x0, k + (y1 - y0)), y0)]
        d.polygon(pts, fill=HAZ[1])
    d.rectangle([x0, y0, x1, y1], outline=OUT)


def bolt(d, x, y, Cl=STEEL):
    d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=Cl[1]); d.point((x - 1, y - 1), fill=Cl[4])


def trefoil(d, cx, cy, r):
    """The radiation warning sign: a yellow disc with three black blades."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=YEL[3], outline=OUT)
    for k in range(3):
        a = -math.pi / 2 + k * 2 * math.pi / 3
        d.pieslice([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], math.degrees(a) - 30, math.degrees(a) + 30, fill=OUT)
    d.ellipse([cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45], fill=YEL[3]); d.ellipse([cx - r * .25, cy - r * .25, cx + r * .25, cy + r * .25], fill=OUT)


def glyphs(d, x0, y0, x1, y1, col):
    """Lettering suggested by shape only, never readable: short blocks of strokes along a line."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); k = x0
    while k < x1 - 2:
        L = min(x1 - k, 3 + (k * 7) % 5); d.rectangle([k, y0, k + L - 1, y1], fill=col); k += L + 2


def blade(d, cx, cy, r, Cl, teeth=16, spin=False):
    """A circular saw blade from above: steel disc, a ring of teeth, the arbor nut; a blur when it spins."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Cl[3], outline=OUT)
    if spin:
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=Cl[4])
    else:
        for k in range(teeth):
            a = k * 2 * math.pi / teeth; d.line([cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3), cx + math.cos(a + .15) * r, cy + math.sin(a + .15) * r], fill=Cl[0])
    d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], fill=Cl[1], outline=OUT); d.point((cx - 1, cy - 1), fill=Cl[4])


# ---------------------------------------------------------------- registering
_ROW = {r.id: r for r in CENSUS}


def reg(oid, fn, era0, ref, off=4, axes=None, glob=True, **kw):
    """Define an object from its census row: its rooms as tags; mass-made the world over from its first era unless
    glob gives another year (or False for a hand-built thing that varies by region in every age)."""
    row = _ROW[oid]; tags = tuple(p.split()[0] for p in row.where.split(","))
    ya = int(row.years.partition("-")[0] or 1197)
    ax = {"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"]}   # lengths 6 and 5 so the spread meets every value
    ax.update(axes or {})
    kw.setdefault("nvar", 24)
    if glob is True: kw["global_from"] = next(a for _, a, b, _n in ERAS if a <= ya <= b)
    elif glob: kw["global_from"] = glob
    define(oid, draw=_obj(fn, era0, off), tags=tags, ref=ref, axes=ax, **kw)


BOARDS = {"pine": ramp((200, 168, 112), 14), "oak": ramp((160, 118, 72), 16), "walnut": ramp((104, 68, 46), 14),
          "plywood": ramp((214, 190, 140), 10), "mdf": ramp((170, 140, 100), 8)}


def board(d, x0, y0, x1, y1, kind, along="y"):
    """A board of timber lying on a machine's bed: its colour, grain strokes along it and a sawn end."""
    if kind not in BOARDS: return
    B = BOARDS[kind]; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=B[2], outline=OUT)
    if kind not in ("mdf", "plywood"):
        if along == "y":
            for k in range(x0 + 3, x1 - 1, 4): d.line([k, y0 + 2 + (k * 7) % 5, k, y1 - 2 - (k * 3) % 6], fill=B[1])
        else:
            for k in range(y0 + 3, y1 - 1, 4): d.line([x0 + 2 + (k * 7) % 5, k, x1 - 2 - (k * 3) % 6, k], fill=B[1])
    d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=B[4]); d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=B[0])


# ================================================================ the machine shop and the wood shop
def millingmachine(tm, x, y, w, h, st, v, c):
    """A milling machine from above, its column at the back and the table across its front. Victorian: a belt-driven
    column mill in black japan or dark green, the stepped cone pulley on top with its belt running up to the line
    shaft, and the wide cast base. Great War: a horizontal mill, the overarm out over the table and the arbor
    cutter on it, its gearbox on the side and an electric motor on a bracket. Mid-Century: a turret knee mill, the
    round turret, the ram out front and the round motor on the head, enamelled grey or green. Modern: a CNC
    machining centre in its sheet-steel enclosure, the sliding door's window over the table and the control pendant
    with its screen. Future Darkness: a sealed dark cell, a seam of light and a small port. Makes add a coolant tank,
    a power feed, a dividing head or a work lamp. Running: the spindle's blur, coolant on the work, a lit screen."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx = (X0 + X1) // 2 - 6; ty0, ty1 = Y0 + int(H * .56), Y0 + int(H * .72)
    if p in "NF":
        EN = L if p == "N" else ramp(mix(L[2], (40, 42, 50), .45), 12)
        case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 6, EN, r=6 if p == "F" else 0)
        wx0, wy0, wx1, wy1 = X0 + 10, Y0 + int(H * .34), X1 - 30, Y1 - 14
        if p == "N":
            d.rectangle([wx0 - 3, wy0 - 3, wx1 + 3, wy1 + 3], fill=EN[0], outline=OUT)
            d.rectangle([wx0, wy0, wx1, wy1], fill=(70, 96, 116), outline=OUT)                                  # the door window over the table
            d.rectangle([wx0 + 4, wy0 + (wy1 - wy0) // 2 - 4, wx1 - 4, wy0 + (wy1 - wy0) // 2 + 4], fill=(116, 126, 136))
            d.ellipse([cx - 8, wy0 + 4, cx + 6, wy0 + 18], fill=(150, 160, 170), outline=OUT)               # spindle through the glass
            d.line([wx0 + 2, wy0 + 2, wx0 + 14, wy0 + 2], fill=(190, 216, 230))
            case(d, X1 - 26, Y0 + 30, X1 - 4, Y0 + 66, ramp((60, 62, 70), 12))                               # control pendant
            screen(d, X1 - 22, Y0 + 34, X1 - 8, Y0 + 48, c.on, c.broken)
            for k in range(3): d.rectangle([X1 - 22 + k * 5, Y0 + 54, X1 - 19 + k * 5, Y0 + 57], fill=(200, 200, 196) if k else RED[3])
            louvres(d, X0 + 10, Y0 + 8, X1 - 30, Y0 + 20, EN, 3)
            if m == 1: hazard(d, X0 + 4, Y1 - 12, X1 - 4, Y1 - 7)
            if m == 2: disc(d, X0 + 22, Y0 + 18, 14, c.alt)                                                  # tool changer drum
            if m == 3: case(d, X1 - 26, Y1 - 30, X1 - 4, Y1 - 8, c.alt)                                     # chip conveyor bin
            if m == 4: case(d, X0 + 2, Y0 + 2, X0 + 30, Y0 + 26, ramp((70, 72, 78), 10))                    # coolant unit
        else:
            seam = GLOW[1] if c.on else GLOW[0]
            d.line([X0 + 6, Y0 + H // 2 - 8, X1 - 6, Y0 + H // 2 - 8], fill=seam, width=2)
            if m % 2: d.line([X0 + W // 3, Y0 + 6, X0 + W // 3, Y1 - 12], fill=seam, width=2)
            px_, py_ = X0 + W // 3 + (m - 2) * 12, Y0 + int(H * .64)
            d.ellipse([px_ - 12, py_, px_ + 12, py_ + 22], fill=(20, 26, 34), outline=GLOW[0])
            if c.on: d.ellipse([px_ - 6, py_ + 5, px_ + 6, py_ + 17], fill=GLOW[2])
            case(d, X1 - 30, Y0 + 8, X1 - 8, Y0 + 30 + m * 6, ramp(tone(EN[2], 30), 10), r=3)
            cable(d, [(X1 - 8, Y0 + 12), (X1 - 3, Y0 + 2)], (30, 30, 34), 3)
        if c.broken: sparks(d, X1 - 14, Y0 + 40)
        return [(X0 + W // 3, Y0 + int(H * .7), 40, CYAN)] if c.on and p == "F" else []
    BA = ramp(tone(L[2], -14), 16)
    case(d, X0 + 10, Y0 + 2, X1 - 12, Y1 - 4, BA, r=3)                                                          # the wide cast base
    case(d, cx - W * .26, Y0 + 6, cx + W * .26, ty0 + 4, L)                                                     # the column
    case(d, cx - W * .3, ty1 - 2, cx + W * .3, Y1 - 8, ramp(tone(L[2], 8), 16))                                 # the knee and its saddle
    if p == "V":
        for k, r in enumerate((15, 12, 9, 6)): d.ellipse([cx - r, Y0 + 22 - r // 2 - k * 3, cx + r, Y0 + 22 + r // 2 - k * 3], fill=IRON[1 + k % 3], outline=OUT)   # cone pulley
        d.line([cx - 5, Y0 + 2, cx - 5, Y0 + 14], fill=(110, 76, 44), width=4); d.line([cx + 5, Y0 + 2, cx + 5, Y0 + 14], fill=(110, 76, 44), width=4)
        d.rectangle([cx - 5, Y0 + 34, cx + 5, ty0], fill=STEEL[1], outline=OUT)                                # the spindle head
        for k in range(Y0 + 40, ty0 - 4, 8): d.line([cx - W * .24, k, cx - 8, k], fill=L[1])                 # cast ribs
    elif p == "G":
        case(d, cx - 10, Y0 + 8, cx + 10, ty1 + 2, ramp(tone(L[2], 24), 16))                                    # the overarm
        case(d, cx + W * .27, Y0 + 12, cx + W * .47, Y0 + 44, c.alt)                                         # the gearbox on the side
        disc(d, cx - W * .3, Y0 + 20, 10, ramp((80, 84, 96), 14))                                            # the motor on its bracket
        d.rectangle([cx - 22, ty0 - 2, cx + 8, ty0 + 4], fill=STEEL[3], outline=OUT)                         # the arbor and cutter
    else:
        disc(d, cx, Y0 + 20, 17, ramp(tone(L[2], 16), 16))                                                   # the turret
        case(d, cx - 9, Y0 + 20, cx + 9, ty0 + 4, ramp(tone(L[2], 10), 16))                                    # the ram
        disc(d, cx, ty0 - 4, 11 if m != 2 else 13, ramp(tone(L[2], -8), 14))                                 # the motor on the head
        d.line([cx + 11, ty0 - 8, cx + 20, ty0 - 15], fill=STEEL[2], width=2)                                # the quill lever
    tb = STEEL if c.w > 1 else IRON
    case(d, X0 + 2, ty0, X1 - 2, ty1, tb)                                                                      # the table with its T-slots
    for k in range(3): d.line([X0 + 8, ty0 + 4 + k * 5, X1 - 8, ty0 + 4 + k * 5], fill=tb[0])
    for ex in (X0 + 3, X1 - 3): wheel(d, ex, (ty0 + ty1) // 2, 5, STEEL, 3)
    wheel(d, cx, Y1 - 5, 5, STEEL, 3)                                                                          # the knee crank
    vx = cx - 14 + 6 * (m - 2)
    case(d, vx, ty0 + 2, vx + 22, ty1 - 2, ramp(tone(L[2], -10), 12))                                          # the vice and its work
    d.rectangle([vx + 5, ty0 + 4, vx + 17, ty1 - 4], fill=(196, 198, 200), outline=OUT)
    if m == 1: case(d, X1 - 26, Y1 - 26, X1 - 4, Y1 - 4, ramp((90, 110, 120), 12))                            # coolant tank
    if m == 2: case(d, X1 - 18, ty0 - 4, X1 - 2, ty1 + 4, c.alt)                                              # power feed
    if m == 3: disc(d, X0 + 18, (ty0 + ty1) // 2, 9, IRON)                                                     # dividing head
    if m == 4: d.line([cx + W * .26, Y0 + 10, X1 - 6, Y0 + 30, X1 - 14, ty0 - 6], fill=IRON[1], width=2); disc(d, X1 - 14, ty0 - 8, 5, YEL)   # work lamp
    if c.on and not c.broken:
        d.ellipse([cx - 7, ty0 - 2, cx + 7, ty0 + 10], outline=CHROME[4])
        d.rectangle([vx + 15, ty0 + 3, vx + 19, ty0 + 6], fill=(120, 200, 190))
    if c.broken: d.rectangle([X1 - 16, ty0 - 2, X1 - 2, ty0 + 4], fill=tb[0], outline=OUT); sparks(d, cx + 14, Y0 + 30)


reg("millingmachine", millingmachine, "victorian", "knee mills with a 4 to 5 ft table on a 2 ft column, about 5 by 6 ft with the handwheels (Brown and Sharpe No. 2 universal mill 1862; Bridgeport Series I); CNC centres about 6 ft wide",
    states=("off", "on"), front=True, clear=3)


def mitresaw(tm, x, y, w, h, st, v, c):
    """A mitre saw on its bench, from above: the round turntable with its angle scale, the fence across the back,
    the blade in its guard over the slot, the motor and handle, and a length of timber against the fence. Mid-Century:
    a cast motor-arm chop saw on an iron base, painted grey or green, a fixed guard. Modern: a sliding compound saw,
    its twin rails out behind and a maker's livery on the arm and motor (yellow, teal, red, black). Future Darkness:
    a battery saw in dark composite with a laser cut line. Makes add a dust bag, extension wings or a clamp.
    Running: the blade's blur and a curl of sawdust."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = X0 + W // 2 - 2, Y0 + int(H * .6)
    BS = IRON if p == "M" else (ramp((70, 70, 76), 12) if p == "N" else COMPOSITE)
    case(d, X0 + (0 if m == 2 else 6), Y0 + H * .32, X1 - (0 if m == 2 else 6), Y1, BS)                        # base and wings
    r = int(min(W, H) * .36)
    disc(d, cx, cy, r, STEEL if p != "F" else ramp((90, 96, 108), 12))                                      # the turntable
    for k in range(-3, 4):
        a = math.pi / 2 + k * .3; d.line([cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3), cx + math.cos(a) * r, cy + math.sin(a) * r], fill=OUT)
    d.rectangle([X0 + 1, Y0 + H * .32, X1 - 1, Y0 + H * .32 + 3], fill=STEEL[3], outline=OUT)                  # the fence
    board(d, X0, Y0 + H * .2, X1, Y0 + H * .32 - 1, v.get("work", "none"), along="x")                         # timber against the fence
    if p == "N" and m != 2:
        for k in (cx - 7, cx + 4): d.rectangle([k, Y0 + 1, k + 3, Y0 + H * .32], fill=CHROME[3], outline=OUT)   # sliding rails
    GU = L if p != "M" else ramp(tone(L[2], -20), 16)
    case(d, cx - r + 2, cy - r - 2, X1 - 3, cy + 3, GU, r=5)                                                    # arm, guard and motor in the livery
    blade(d, cx - 3, cy - 1, max(5, r - 6), STEEL, 10, c.on and not c.broken)
    louvres(d, X1 - 10, cy - r + 2, X1 - 6, cy, GU, 2, vert=True)
    d.rectangle([cx - 4, cy + 4, cx + 8, cy + 9], fill=RUBBER[2] if p != "M" else DARKWOOD[2], outline=OUT)     # the handle
    if m == 1 or m == 3: d.ellipse([X1 - 14, Y0 + 1, X1 - 2, Y0 + 14], fill=(70, 70, 64) if m == 1 else (150, 40, 36), outline=OUT)   # dust bag
    if m == 4: d.rectangle([X0 + 3, Y0 + H * .4, X0 + 10, Y0 + H * .4 + 10], fill=c.alt[2], outline=OUT)        # a hold-down clamp
    if p == "F": d.line([cx - 3, Y0 + H * .34, cx - 3, Y1 - 2], fill=(240, 60, 60))                           # laser line
    if c.on and not c.broken:
        for k in range(3): d.ellipse([X0 + 3 + k * 3, cy + 4 + k * 2, X0 + 6 + k * 3, cy + 7 + k * 2], fill=(222, 196, 140))
    if c.broken: d.line([cx - r, cy + r - 2, cx + r, cy - r + 6], fill=OUT, width=2)


WORK = ["none", "pine", "oak", "walnut", "plywood"]
reg("mitresaw", mitresaw, "mid-century", "mitre saws on a base of about 2 to 2 1/2 ft by 1 1/2 to 2 ft with a 10 to 12 in blade (Rockwell 1964 power mitre box; DeWalt DW708 sliding compound saw)",
    states=("off", "on"), front=True, clear=2, axes={"work": WORK})


def planer(tm, x, y, w, h, st, v, c):
    """A jointer from above, long and narrow: the infeed and outfeed tables in line with the cutterhead's slot
    between them, the fence along the back, the guard over the knives and a board being faced. Victorian: a
    cast-iron jointer on its cast frame, driven by a belt from the line shaft and countershaft. Great War: the same
    on a cabinet stand with its own electric motor bolted behind. Mid-Century: on a sheet-steel stand, enamelled grey
    or green, a belt guard on the end. Modern: a combination planer-thicknesser, the outfeed hood and a dust port with
    its hose. Future Darkness: a sealed composite bed and a lit guard. Running: the knives' blur and shavings."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx = X0 + W // 2 + (m - 2) * 4
    BED = IRON if p in "VG" else (STEEL if p != "F" else ramp((84, 90, 102), 12))
    case(d, X0 + 4, Y0 + 2, X1 - 4, Y1 - 2, L, r=2)                                                            # the frame or stand under it
    case(d, X0 + 2, Y0 + H * .28, cx - 4, Y1 - H * .2, BED); case(d, cx + 4, Y0 + H * .28, X1 - 2, Y1 - H * .2, BED)   # infeed, outfeed
    d.rectangle([cx - 3, Y0 + H * .28, cx + 3, Y1 - H * .2], fill=(30, 30, 34), outline=OUT)                  # the cutterhead slot
    for k in range(int(Y0 + H * .32), int(Y1 - H * .22), 4): d.line([cx - 2, k, cx + 2, k + 2], fill=STEEL[4] if not c.on else STEEL[2])
    d.rectangle([X0 + W * .25, Y0 + 2, X1 - W * .25, Y0 + H * .28], fill=BED[3], outline=OUT)                  # the fence
    wk = v.get("work", "none")
    if wk != "none": board(d, X0 + 4, Y0 + H * .34, cx - 8, Y1 - H * .26, wk, along="x")                     # the board on the infeed
    GU = c.alt if p in "MN" else (BRASS if c.rich else IRON)
    d.pieslice([cx - 14, Y0 + H * .28, cx + 14, Y1 - H * .2 + 6], 270, 450, fill=GU[2], outline=OUT)            # the knife guard swung over
    if p == "V":
        d.line([X0 + 10, Y0 + 1, X0 + 16, Y1 - 2], fill=(110, 76, 44), width=3); d.line([X0 + 18, Y0 + 1, X0 + 24, Y1 - 2], fill=(110, 76, 44), width=3)   # belts
        wheel(d, X1 - 8, Y0 + H // 2, 6, IRON, 4)
    if p == "G":
        disc(d, X1 - 16, Y0 + 9, 8, ramp((70, 74, 86), 14)); d.rectangle([X1 - 30, Y0 + 2, X1 - 24, Y0 + 14], fill=IRON[2], outline=OUT)   # its own motor
    if p == "M": case(d, X1 - 14, Y0 + 3, X1 - 3, Y1 - 3, ramp(tone(L[2], -20), 14))                            # belt guard on the end
    if p == "N":
        disc(d, X1 - 12, Y0 + 8, 6, ramp((60, 60, 66), 10)); cable(d, [(X1 - 12, Y0 + 8), (X1 - 2, Y0 + 2)], (150, 150, 156), 3)   # dust port
        d.rectangle([X0 + 3, Y1 - 6, X0 + 13, Y1 - 3], fill=(60, 200, 80) if not c.broken else (60, 60, 60), outline=OUT)
    if p == "F": d.line([X0 + 4, Y1 - H * .2 + 2, X1 - 4, Y1 - H * .2 + 2], fill=GLOW[1] if c.on else GLOW[0], width=2)
    if c.on and not c.broken:
        for k in range(3): d.arc([X1 - 22 + k * 5, Y0 + H * .35, X1 - 14 + k * 5, Y0 + H * .55], 0, 200, fill=(226, 200, 150), width=2)
    if c.broken: d.rectangle([X1 - 20, Y1 - H * .2 - 4, X1 - 2, Y1 - H * .2], fill=(40, 40, 44))
    return [(cx, Y0 + H // 2, 30, CYAN)] if c.on and p == "F" else []


reg("planer", planer, "victorian", "jointers with 6 to 12 in knives on beds of 4 to 6 ft by 1 1/2 to 2 ft (J. A. Fay and Egan jointers 1880s; Delta 6 in jointer; Scheppach combination planers)",
    states=("off", "on"), front=True, clear=3, axes={"work": WORK})


def tablesaw(tm, x, y, w, h, st, v, c):
    """A table saw from above: the square table, the blade rising through its throat plate, the rip fence on its
    rail, the mitre gauge in its slot, the guard and a board being ripped. Victorian: a saw bench, a timber top on an
    iron frame, belt-driven from below. Great War: an iron-topped bench saw with its own motor hung on the side.
    Mid-Century: a cast-iron cabinet saw with ground wings, enamelled grey or green. Modern: a cabinet or jobsite saw
    in a maker's livery with a riving knife and dust hose. Future Darkness: dark composite, a sensing blade brake, a
    lit edge. Running: the blade's blur and sawdust thrown off the back."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    if p == "V": TOP = WOOD if m % 2 == 0 else ramp((150, 110, 70), 16)
    elif p == "G": TOP = IRON
    elif p in "MN": TOP = STEEL if m != 4 else ramp((120, 124, 128), 14)
    else: TOP = ramp((70, 74, 84), 12)
    case(d, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, L, r=2)                                                            # the cabinet or frame under
    wing = 0 if p in "MN" and m < 3 else 10
    case(d, X0 + wing, Y0 + 2, X1 - wing, Y1 - 16, TOP)                                                         # the table
    if not wing:
        for k in (X0 + W * .22, X1 - W * .22): d.line([k, Y0 + 3, k, Y1 - 17], fill=TOP[0])                  # wing joints
    bx, by = X0 + W * .46, Y0 + H * .4
    wk = v.get("work", "none")
    if wk != "none": board(d, bx + 4, Y0 + 6, bx + 24, Y1 - 22, wk)                                            # the board against the fence
    d.rounded_rectangle([bx - 6, by - 22, bx + 6, by + 22], 4, fill=TOP[1], outline=OUT)                      # throat plate
    d.rectangle([bx - 1, by - 18, bx + 1, by + 18], fill=STEEL[4] if not c.on else STEEL[2], outline=OUT)      # the blade edge on
    if c.on and not c.broken:
        d.line([bx - 3, by - 18, bx - 3, by + 18], fill=CHROME[3]); d.line([bx + 3, by - 18, bx + 3, by + 18], fill=CHROME[3])
        for k in range(4): d.ellipse([bx - 2 + k * 3, Y0 + 3 + k, bx + 1 + k * 3, Y0 + 6 + k], fill=(226, 200, 150))
    for k in (X0 + W * .3, X0 + W * .7): d.line([k, Y0 + 3, k, Y1 - 17], fill=OUT)                            # mitre slots
    mx = X0 + W * .3; d.rectangle([mx - 10, Y1 - 30, mx + 4, Y1 - 22], fill=c.alt[2], outline=OUT)               # mitre gauge
    d.rectangle([X0 + 2, Y1 - 16, X1 - 2, Y1 - 10], fill=STEEL[2] if p != "V" else DARKWOOD[2], outline=OUT)    # fence rail
    fx = bx + 26
    case(d, fx, Y0 + 3, fx + 7, Y1 - 10, L if p in "MNF" else IRON)                                              # rip fence
    if p in "NF" or (p == "M" and m == 3):
        d.rounded_rectangle([bx - 8, by - 16, bx + 8, by + 16], 3, outline=(200, 210, 214), width=2)         # the blade guard
    if p == "V":
        d.line([bx, by + 20, X0 + 6, Y1 - 2], fill=(110, 76, 44), width=3)                                   # the belt from below
    if p == "G": disc(d, X0 + 9, Y0 + H * .5, 9, ramp((70, 74, 86), 14))                                       # motor hung on the side
    if p == "N": cable(d, [(X1 - 10, Y1 - 8), (X1 - 4, Y1 - 2)], (40, 40, 44), 3)
    if p == "F": d.line([X0 + 3, Y1 - 17, X1 - 3, Y1 - 17], fill=GLOW[1] if c.on else GLOW[0], width=2)
    d.rectangle([X0 + 12, Y1 - 8, X0 + 24, Y1 - 4], fill=RED[2] if p != "V" else IRON[1], outline=OUT)         # switch
    if c.broken: d.line([X0 + 12, Y0 + 10, X0 + W * .4, Y0 + H * .5], fill=OUT, width=2)


reg("tablesaw", tablesaw, "victorian", "table saws with a top of about 2 1/2 to 3 by 2 1/2 ft plus wings, about 3 by 4 ft with the fence rail (Delta Unisaw 1939; Powermatic 66; Victorian saw benches of 3 to 4 ft)",
    states=("off", "on"), front=True, clear=4, axes={"work": WORK})


def tyrechanger(tm, x, y, w, h, st, v, c):
    """A tyre changer from above: the round turntable with its four jaws holding a wheel and tyre, the column at the
    back with the mount-demount head swung over the rim, and the bead breaker's arm and blade on the side.
    Mid-Century: a hand changer, a cast stand, a long iron bar and a whitewall tyre on a pressed-steel rim. Modern: an
    air-powered changer in a maker's red, blue or grey with its foot pedals and air gauge, an alloy wheel. Future
    Darkness: a dark automated changer with a sensor ring. Running: the turntable turning."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = X0 + int(W * .45), Y0 + int(H * .55)
    case(d, X0 + 2, Y0 + 4, X1 - 4, Y1 - 4, L, r=5)                                                              # the cabinet
    R_ = int(min(W, H) * (.32 + .03 * (m % 3)))
    if p == "M": d.rectangle([X0 + 2, cy - 2, X1 - 2, cy + 2], fill=IRON[3], outline=OUT)                    # the long bar
    d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], fill=RUBBER[1], outline=OUT)                               # the tyre
    if p == "M" and m % 2 == 0: d.ellipse([cx - R_ + 4, cy - R_ + 4, cx + R_ - 4, cy + R_ - 4], outline=(226, 224, 216), width=3)   # whitewall
    for k in range(12):
        a = k * math.pi / 6; d.line([cx + math.cos(a) * (R_ - 3), cy + math.sin(a) * (R_ - 3), cx + math.cos(a) * (R_ - 1), cy + math.sin(a) * (R_ - 1)], fill=RUBBER[3])
    rr = int(R_ * .6)
    rim = [STEEL, CHROME, ramp((50, 52, 58), 12), ramp((200, 196, 186), 10), ramp((170, 150, 100), 14)][m] if p != "M" else ([STEEL, RED, CHROME, ramp((230, 226, 210), 8), ramp((40, 40, 46), 10)][m])
    disc(d, cx, cy, rr, rim)                                                                                    # the rim
    if p != "M":
        for k in range(5): a = k * 2 * math.pi / 5; d.line([cx, cy, cx + math.cos(a) * (rr - 2), cy + math.sin(a) * (rr - 2)], fill=rim[0], width=2)   # alloy spokes
    for k in range(4):
        a = k * math.pi / 2 + .4; jx, jy = cx + math.cos(a) * rr * .75, cy + math.sin(a) * rr * .75
        d.rectangle([jx - 3, jy - 3, jx + 3, jy + 3], fill=L[0], outline=OUT)                                   # the jaws
    disc(d, cx, cy, 4, IRON)
    col = (X1 - 18, Y0 + 2)
    case(d, col[0], col[1], col[0] + 14, col[1] + 16, c.alt if p != "F" else COMPOSITE)                          # the column
    d.line([col[0] + 6, col[1] + 10, cx + rr * .7, cy - rr * .7], fill=STEEL[1], width=5)                     # the swing arm and its head
    d.ellipse([cx + rr * .7 - 4, cy - rr * .7 - 4, cx + rr * .7 + 4, cy - rr * .7 + 4], fill=STEEL[3], outline=OUT)
    d.line([X0 + 4, Y0 + 14, X0 + 4, Y1 - 14], fill=STEEL[1], width=3); d.rectangle([X0 + 1, Y1 - 22, X0 + 9, Y1 - 12], fill=STEEL[3], outline=OUT)   # bead breaker
    if p in "NF":
        for k in range(3): d.rectangle([X0 + 14 + k * 8, Y1 - 7, X0 + 19 + k * 8, Y1 - 2], fill=RUBBER[3], outline=OUT)   # pedals
        dial(d, X1 - 10, Y1 - 12, 4)
    if p == "F": d.ellipse([cx - R_ - 3, cy - R_ - 3, cx + R_ + 3, cy + R_ + 3], outline=GLOW[1] if c.on else GLOW[0], width=2)
    if c.on and not c.broken: d.arc([cx - rr - 2, cy - rr - 2, cx + rr + 2, cy + rr + 2], 200, 320, fill=CHROME[4], width=2)
    if c.broken: d.line([cx - R_, cy, cx - R_ + 10, cy + 6], fill=(210, 200, 180), width=2)


reg("tyrechanger", tyrechanger, "mid-century", "tyre changers about 3 ft square with their columns (Coats 10-10 tire changer 1950s; Corghi and Hunter changers)",
    states=("off", "on"), front=True, clear=3)


def milkingmachine(tm, x, y, w, h, st, v, c):
    """A milking machine from above. Mid-Century: a bucket milker, the round steel pail with its lid, the pulsator
    on top and the rubber hoses to the claw with its four teat cups; a Surge pail hung from its leather strap, or two
    pails on a wheeled carrier. Modern: a milking unit on its trolley, the clear milk jar, the claw and cups and the
    vacuum line. Future Darkness: a robot milker's box, its arm folded and the laser teat finder lit. Running: milk
    in the jar and the pulsator lamp."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = X0 + W // 2 - 4, Y0 + H // 2 - 3
    if p == "F":
        case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 3, ramp(mix(L[2], (60, 64, 72), .3), 12), r=4)
        d.line([X0 + 4, cy + (m - 2) * 2, X1 - 8, cy + 4], fill=STEEL[3], width=3)
        lamp(d, X1 - 6, Y0 + 6, (240, 60, 60), c.on, 2); d.rectangle([X0 + 4, Y1 - 9, X1 - 4, Y1 - 6], fill=GLOW[1] if c.on else GLOW[0])
        for k in range(4): d.ellipse([X0 + 5 + (k % 2) * 9, Y0 + 5 + (k // 2) * 7, X0 + 10 + (k % 2) * 9, Y0 + 10 + (k // 2) * 7], fill=STEEL[2] if m % 2 else CHROME[3], outline=OUT)
        return [(X1 - 6, Y0 + 6, 14, (1.5, 1.0, 1.0))] if c.on else []
    if p == "M":
        if m in (2, 4): case(d, X0, Y0 + 1, X1 - 10, Y1 - 4, L, r=2)                                           # a wheeled carrier
        pr = int(min(W, H) * .3)
        if m == 3: d.line([X0, cy, X1 - 8, cy], fill=LEATHER_T[1], width=4)                                   # a Surge pail's strap
        disc(d, cx, cy, pr, CHROME if c.rich else STEEL, ry=pr - (2 if m == 3 else 0))                       # the pail and lid
        if m == 4: disc(d, cx + 2, cy + pr + 3, pr - 4, STEEL)
        d.ellipse([cx - pr + 3, cy - pr + 3, cx + pr - 3, cy + pr - 3], outline=STEEL[1])
        case(d, cx - 4, cy - 4, cx + 5, cy + 4, L if m not in (2, 4) else c.alt)                             # the pulsator
        hose = [(cx + 4, cy), (X1 - 6, cy + 4), (X1 - 6, Y1 - 6)]
    else:
        case(d, X0 + 1, Y0 + 1, X0 + W * .62, Y1 - 3, L, r=2)                                                  # the trolley
        d.ellipse([X0 + 4, Y0 + 4, X0 + W * .56, Y0 + H * .58], fill=(200, 214, 220) if not c.on else (240, 238, 226), outline=OUT)   # the milk jar
        hose = [(X0 + W * .56, cy), (X1 - 6, cy + 4), (X1 - 6, Y1 - 6)]
    cable(d, hose, RUBBER[2] if m % 2 == 0 else (180, 60, 50), 1)
    ccx, ccy = X1 - 8, Y1 - 8                                                                                   # the claw and its four cups
    d.ellipse([ccx - 3, ccy - 3, ccx + 3, ccy + 3], fill=STEEL[3], outline=OUT)
    for dx, dy in ((-5, -4), (4, -4), (-5, 3), (4, 3)): d.ellipse([ccx + dx - 2, ccy + dy - 2, ccx + dx + 2, ccy + dy + 2], fill=STEEL[2] if m != 1 else CHROME[3], outline=OUT)
    if c.on: lamp(d, X0 + 4, Y1 - 5, (90, 220, 90), True, 1)
    if c.broken: d.line([X1 - 6, cy + 4, X1 - 2, cy - 2], fill=(240, 240, 232), width=2)


LEATHER_T = ramp((140, 96, 56), 14)
reg("milkingmachine", milkingmachine, "mid-century", "bucket milkers about 1 ft across with hoses and claw over 2 ft (De Laval and Surge bucket milkers 1920s on; Lely Astronaut robot boxes)",
    states=("off", "on"), front=False, off=3)


# ================================================================ the works and the yard
MIXES = {"paint": (180, 60, 50), "dough": (222, 204, 160), "chemical": (110, 180, 90), "tar": (40, 36, 34), "milk": (236, 232, 220), "slurry": (140, 130, 110)}


def mixingvat(tm, x, y, w, h, st, v, c):
    """An industrial mixing vat from above: the round vat with its rim, the bridge across the top carrying the
    agitator's drive, and what is being mixed showing in the open half. Victorian: a coopered wooden vat bound with
    iron hoops, a belt-driven paddle shaft on a timber bridge. Great War: a riveted iron pan, a geared drive on an
    iron bridge. Mid-Century: a welded steel vat in the maker's enamel, a motor and gearbox on the bridge. Modern:
    stainless steel with a jacket, a hinged lid, a control box and a ladder. Future Darkness: a sealed dark vessel
    with a sight glass and a lit ring. Running: a swirl in the mix."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = min(W, H) // 2 - 3
    mix_ = ramp(MIXES.get(v.get("contents"), (180, 60, 50)), 14)
    if p == "V": SH = ramp(mix((130, 90, 56), L[2], .45), 16)
    elif p == "G": SH = ramp(mix(L[2], (70, 70, 76), .3), 14)
    elif p == "M": SH = L
    elif p == "N": SH = CHROME if c.w > 1 else STEEL
    else: SH = ramp(mix(L[2], (40, 42, 50), .2), 12)
    disc(d, cx, cy, R_, SH)                                                                                    # the vat
    if p == "V":
        for k in range(24):
            a = k * math.pi / 12; d.line([cx + math.cos(a) * (R_ - 5), cy + math.sin(a) * (R_ - 5), cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=SH[0])   # staves
        d.ellipse([cx - R_ + 1, cy - R_ + 1, cx + R_ - 1, cy + R_ - 1], outline=IRON[2], width=2)                 # the hoop
    if p == "G":
        for k in range(20):
            a = k * math.pi / 10; bolt(d, cx + math.cos(a) * (R_ - 3), cy + math.sin(a) * (R_ - 3), IRON)       # rivets
    if p == "F":
        d.ellipse([cx - R_ + 4, cy - R_ + 4, cx + R_ - 4, cy + R_ - 4], outline=GLOW[1] if c.on else GLOW[0], width=2)
        sx, sy = cx + [6, -24, 6, -24, -8][m], cy + [6, 6, -24, -24, 10][m]
        d.ellipse([sx, sy, sx + 18, sy + 18], fill=mix_[2], outline=STEEL[3])                                    # sight glass
        case(d, cx - 6, cy - R_ + 4, cx + 6, cy - 4, ramp((60, 64, 74), 12), r=3)
        if m >= 3: d.rectangle([cx - R_ + 10, cy - 3, cx + R_ - 10, cy + 3], fill=mix_[2], outline=OUT)        # a level window across the top
        return [(cx, cy, 50, CYAN)] if c.on else []
    ir = R_ - 6
    lidded = p == "N" and m % 2 == 1
    d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=mix_[2], outline=OUT)                              # the mix
    if lidded: d.pieslice([cx - ir, cy - ir, cx + ir, cy + ir], 180, 360, fill=SH[3], outline=OUT)           # half lid
    if c.on and not c.broken:
        for k in range(3): d.arc([cx - ir + 6 + k * 6, cy - ir + 6 + k * 6, cx + ir - 6 - k * 6, cy + ir - 6 - k * 6], 20 + k * 40, 140 + k * 40, fill=mix_[4], width=2)
    else:
        d.arc([cx - ir + 4, cy - ir + 4, cx + ir - 4, cy + ir - 4], 200, 250, fill=mix_[4])
    BR = WOOD if p == "V" else (IRON if p == "G" else ramp(tone(L[2], -20), 14) if p == "M" else STEEL)
    if m % 2: case(d, cx - 6, Y0 + 2, cx + 6, Y1 - 2, BR)                                                    # the bridge, across or along
    else: case(d, X0 + 2, cy - 6, X1 - 2, cy + 6, BR)
    if p == "V":
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=IRON[2], outline=OUT)                                  # pulley
        d.line([cx - 3, Y0, cx - 3, cy - 8], fill=(110, 76, 44), width=3); d.line([cx + 3, Y0, cx + 3, cy - 8], fill=(110, 76, 44), width=3)
    else:
        case(d, cx - 12, cy - 12, cx + 12 + m * 2, cy + 12, ramp(tone(L[2], 10), 14) if p != "N" else ramp((90, 100, 120), 14), r=3)   # motor and gearbox
        if p in "MN": louvres(d, cx - 8, cy - 8, cx + 8, cy + 8, L, 3, vert=True)
    if p == "N":
        case(d, X1 - 16, Y1 - 22, X1 - 2, Y1 - 4, c.alt); lamp(d, X1 - 9, Y1 - 15, (90, 220, 90), c.on, 2)        # control box
        for k in range(Y0 + 6, cy - 10, 5): d.line([X0 + 6, k, X0 + 14, k], fill=STEEL[3])                       # ladder
    if c.broken: d.line([cx - R_ + 6, cy + 10, cx - R_ + 20, cy + 26], fill=OUT, width=2); d.ellipse([cx - R_ - 2, cy + 18, cx - R_ + 10, cy + 30], fill=mix_[1])


reg("mixingvat", mixingvat, "victorian", "mixing vats and pans of 4 to 6 ft across (Werner and Pfleiderer mixers 1880s; 1,000 to 2,000 litre stainless process tanks)",
    states=("off", "on"), front=False, clear=2, axes={"contents": list(MIXES)})


GOODS = ["boxes", "sacks", "drums", "wrapped", "empty", "crates"]


def palletrack(tm, x, y, w, h, st, v, c):
    """Pallet racking from above, its back to the wall: the uprights at each bay, the beams along the front and back
    and the pallets on the top level with their loads (cardboard cases, sacks, drums, shrink-wrapped stacks, crates or
    an empty bay). Mid-Century: bolted angle-iron racking in grey or green and timber pallets. Modern: blue uprights
    and orange beams, the maker's sign and the bay load notice. Future Darkness: dark automated racking with a shuttle
    rail and lit bay numbers."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    nb = 3 if m < 3 else 2
    UP = ramp((40, 70, 140), 16) if p == "N" and m != 4 else (L if p != "F" else ramp((50, 54, 62), 12))
    BM = ORANGE if p == "N" and m != 4 else (ramp(tone(L[2], -24), 14) if p != "F" else ramp((70, 74, 84), 12))
    goods = v.get("contents", "boxes")
    bw = W / nb
    for b in range(nb):
        bx0 = X0 + b * bw
        load = goods if (b + m) % 4 != 3 else ("empty" if goods != "empty" else "boxes")
        if load != "empty":
            px0, px1 = bx0 + 5, bx0 + bw - 5
            case(d, px0, Y0 + 4, px1, Y1 - 4, ramp((170, 140, 96), 12))                                           # the pallet
            for k in range(3): d.line([px0 + 2, Y0 + 6 + k * (H - 12) / 2, px1 - 2, Y0 + 6 + k * (H - 12) / 2], fill=(110, 86, 60))
            gx0, gy0, gx1, gy1 = px0 + 3, Y0 + 7, px1 - 3, Y1 - 7
            if load == "boxes":
                cs = (gx1 - gx0) / 3
                for i in range(3):
                    for j in range(2):
                        case(d, gx0 + i * cs, gy0 + j * (gy1 - gy0) / 2, gx0 + (i + 1) * cs - 1, gy0 + (j + 1) * (gy1 - gy0) / 2 - 1, ramp((186, 146, 96), 12))
                        d.line([gx0 + i * cs + 2, gy0 + j * (gy1 - gy0) / 2 + (gy1 - gy0) / 4, gx0 + (i + 1) * cs - 3, gy0 + j * (gy1 - gy0) / 2 + (gy1 - gy0) / 4], fill=(150, 120, 80))
            elif load == "sacks":
                for i in range(3):
                    sx = gx0 + i * (gx1 - gx0) / 3
                    d.rounded_rectangle([sx, gy0, sx + (gx1 - gx0) / 3 - 1, gy1], 6, fill=(200, 186, 150), outline=OUT); d.line([sx + 3, gy0 + 4, sx + (gx1 - gx0) / 3 - 4, gy0 + 4], fill=(150, 136, 104))
            elif load == "drums":
                rr = min((gx1 - gx0) / 4, (gy1 - gy0) / 4) - 1
                for i in range(2):
                    for j in range(2): disc(d, gx0 + (gx1 - gx0) * (i * 2 + 1) / 4, gy0 + (gy1 - gy0) * (j * 2 + 1) / 4, rr, [RED, ramp((50, 90, 160), 16), ramp((60, 110, 60), 16)][(b + m) % 3])
            elif load == "wrapped":
                d.rectangle([gx0, gy0, gx1, gy1], fill=(170, 186, 196), outline=OUT)
                for k in range(int(gx0) + 3, int(gx1), 6): d.line([k, gy0 + 1, k + 4, gy1 - 1], fill=(214, 226, 232))
            else:
                case(d, gx0, gy0, gx1, gy1, ramp((150, 116, 76), 14))
                d.line([gx0, gy0, gx1, gy1], fill=(110, 84, 56)); d.line([gx0, gy1, gx1, gy0], fill=(110, 84, 56))
        else:
            d.line([bx0 + 6, Y0 + H // 2, bx0 + bw - 6, Y0 + H // 2], fill=BM[1], width=2)                       # an empty bay's deck bar
    for yy in (Y0 + 1, Y1 - 4): d.rectangle([X0 + 1, yy, X1 - 1, yy + 3], fill=BM[2], outline=OUT)              # beams front and back
    for b in range(nb + 1):
        ux = min(X1 - 5, X0 + b * bw - (0 if b < nb else 5))
        for yy in (Y0, Y1 - 6): case(d, ux, yy, ux + 5, yy + 6, UP)                                              # uprights
        d.line([ux + 2, Y0 + 6, ux + 2, Y1 - 6], fill=UP[1], width=2)                                             # side bracing
    if p == "N": d.rectangle([X0 + W // 2 - 6, Y1 - 3, X0 + W // 2 + 6, Y1], fill=YEL[3], outline=OUT)          # load notice
    if p == "F":
        d.line([X0 + 2, Y0 + H // 2, X1 - 2, Y0 + H // 2], fill=GLOW[0], width=2)
        for b in range(nb): d.rectangle([X0 + b * bw + bw / 2 - 3, Y1 - 3, X0 + b * bw + bw / 2 + 3, Y1], fill=GLOW[1])
    if c.broken: d.line([X0 + bw - 8, Y1 - 4, X0 + bw + 10, Y1 + 2], fill=BM[0], width=4)


reg("palletrack", palletrack, "mid-century", "pallet racking bays of 2.7 m (about 9 ft) beams and 1.1 m (about 3 1/2 to 4 ft) deep frames holding two Euro or 48 by 40 in pallets (SEMA and Dexion racking)",
    states=("one",), front=True, clear=10, axes={"contents": GOODS})


def pipework(tm, x, y, w, h, st, v, c):
    """Industrial pipework along a wall from above: two to four pipe runs side by side on their brackets, flanged
    joints, a valve wheel, a gauge and a branch dropping away. Victorian: cast-iron pipe with bolted flanges and a
    brass valve, steam pipes lagged in canvas. Great War: lagged mains in white asbestos with their bands, iron
    flanges. Mid-Century: steel pipe painted in its service colours (green water, silver steam, yellow gas, orange
    electric). Modern: steel and grey plastic runs with arrow labels and a cable tray. Future Darkness: sealed dark
    conduits with lit seams. Broken: a split pipe leaking."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    n = 2 + m % 3; gap = (H - 4) / n
    SERV = [ramp((70, 120, 80), 16), ramp((190, 194, 200), 14), ramp((220, 180, 40), 16), ramp((220, 120, 40), 16), ramp((60, 90, 160), 16)]
    for k in range(-1, int(W / 30) + 1):                                                                        # brackets
        bx = X0 + 8 + k * 30 + (m * 5) % 30
        if X0 < bx < X1 - 4: d.rectangle([bx, Y0, bx + 3, Y1], fill=IRON[2] if p in "VG" else STEEL[1], outline=OUT)
    for i in range(n):
        py = Y0 + 2 + gap * i + gap / 2; r = max(3, gap / 2 - 2 - (i % 2))
        if p == "V": Pc = ramp(mix(L[2], (40, 40, 46), .4), 16) if i != n - 1 or m % 2 == 0 else ramp((196, 184, 156), 12)
        elif p == "G": Pc = ramp((222, 220, 210), 10) if i % 2 == 0 else ramp(mix(L[2], (60, 60, 66), .3), 16)
        elif p == "M": Pc = SERV[(i + int(v.get("livery", 0))) % 5]
        elif p == "N": Pc = STEEL if i % 2 == 0 else ramp((150, 154, 160), 10) if m < 3 else ramp(L[2], 16)
        else: Pc = ramp(mix(L[2], (52, 56, 66), .3), 12)
        d.rectangle([X0, py - r, X1, py + r], fill=Pc[2], outline=OUT)
        d.line([X0 + 1, py - r + 1, X1 - 1, py - r + 1], fill=Pc[4]); d.line([X0 + 1, py + r - 1, X1 - 1, py + r - 1], fill=Pc[0])
        for fx in range(int(X0 + 20 + i * 11), int(X1 - 4), 48):                                                # flanges or bands
            if p in "VGN": d.rectangle([fx, py - r - 2, fx + 3, py + r + 2], fill=(Pc if p != "G" else IRON)[1], outline=OUT)
            if p == "G": d.line([fx + 12, py - r, fx + 12, py + r], fill=(160, 160, 150))
        if p == "N" and i % 2 == 1: d.polygon([(X0 + 40, py - 2), (X0 + 48, py), (X0 + 40, py + 2)], fill=(30, 30, 30))   # flow arrow
        if p == "F": d.line([X0 + 2, py, X1 - 2, py], fill=GLOW[1] if i == m % n else GLOW[0])
    vx = X0 + W * (.3 + .1 * m)
    wheel(d, vx, Y0 + 2 + gap / 2, max(5, gap / 2), BRASS if p == "V" or c.rich else RED if p in "MN" else IRON, 4)   # valve wheel
    if p != "F": dial(d, X1 - 14 - m * 6, Y0 + H - gap / 2 - 2, max(3, gap / 2 - 2))
    if c.broken:
        bx, by = X0 + W * .62, Y0 + 2 + gap * (n - 1) + gap / 2
        d.line([bx - 3, by - 3, bx + 3, by + 3], fill=OUT, width=2)
        for k in range(3): d.ellipse([bx + k * 4, by + 2 + k, bx + 4 + k * 4, by + 6 + k], fill=(200, 210, 220) if p in "VG" else (70, 100, 140))
    return [(X0 + W // 2, Y0 + H // 2, 40, CYAN)] if p == "F" and not c.broken else []


reg("pipework", pipework, "victorian", "pipe runs of 2 to 8 in bore on wall brackets, about 2 ft deep in all over a 10 ft length (BS 1710 service colours; Victorian mill steam mains)",
    states=("one",), front=True, clear=2, off=3)


TANKS = {"water": (60, 110, 150), "oil": (30, 26, 24), "milk": (236, 232, 220), "fuel": (150, 120, 60), "chemical": (120, 170, 80)}


def storagetank(tm, x, y, w, h, st, v, c):
    """A liquid storage tank from above, its round top with the manhole, the ladder up its side, a level gauge and
    the outlet valve. Victorian: a riveted iron tank on a brick base, or a timber water vat bound with hoops. Great
    War: a riveted tank with a bolted cover. Mid-Century: a welded steel tank in its paint with a gauge and a vent
    pipe. Modern: a green or black plastic water tank, or a white bunded fuel tank with its pump. Future Darkness:
    a dark composite tank with a lit level strip. Open: the manhole cover laid back, the liquid showing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2 - 2, (Y0 + Y1) // 2 - 2; R_ = min(W, H) // 2 - 4
    liq = ramp(TANKS.get(v.get("contents"), (60, 110, 150)), 14)
    if p == "V": SH = ramp(mix(WOOD[2], L[2], .35), 16) if m % 2 else ramp(mix(L[2], (60, 56, 56), .15), 14)
    elif p == "G": SH = ramp(mix(L[2], (80, 80, 84), .4), 14)
    elif p == "N": SH = [ramp((60, 100, 66), 14), ramp((40, 40, 44), 10), ramp((220, 220, 214), 10), L, ramp((90, 120, 160), 14)][m]
    elif p == "F": SH = ramp(mix(L[2], (40, 44, 52), .25), 12)
    else: SH = L
    if p in "VG" and m % 2 == 0:
        case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, ramp((150, 80, 60), 14))                                    # the brick base
        for k in range(Y0 + 8, Y1 - 2, 7): d.line([X0 + 3, k, X1 - 3, k], fill=(110, 60, 48))
    if p == "N" and m == 2:
        case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, SH, r=6); case(d, X0 + 8, Y0 + 8, X1 - 8, Y1 - 8, SH, r=4)     # a bunded square tank
    else:
        disc(d, cx, cy, R_, SH)
    if p == "V" and m % 2:
        for k in (R_ - 2, R_ * .7): d.ellipse([cx - k, cy - k, cx + k, cy + k], outline=IRON[2], width=2)
    elif p in "VG":
        for k in range(20): a = k * math.pi / 10; bolt(d, cx + math.cos(a) * (R_ - 4), cy + math.sin(a) * (R_ - 4), IRON)
        d.line([cx - R_ + 4, cy, cx + R_ - 4, cy], fill=SH[0])
    elif p == "N" and m in (0, 1, 4):
        for k in (R_ * .45, R_ * .75): d.ellipse([cx - k, cy - k, cx + k, cy + k], outline=SH[1])            # moulded ribs
    mr = max(6, R_ // 3); mx, my = cx + (R_ // 3 if m % 2 else 0), cy - (R_ // 4)
    if c.open:
        d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=OUT); d.ellipse([mx - mr + 2, my - mr + 2, mx + mr - 2, my + mr - 2], fill=liq[2])
        d.line([mx - mr + 4, my - 1, mx, my - 1], fill=liq[4])
        disc(d, mx + mr + 6, my + mr, mr - 1, SH)                                                              # the cover laid by
    else:
        disc(d, mx, my, mr, ramp(tone(SH[2], -16), 12))
        for k in range(6): a = k * math.pi / 3; bolt(d, mx + math.cos(a) * (mr - 2), my + math.sin(a) * (mr - 2), STEEL)
    for k in range(int(cy + R_ * .3), int(Y1 - 2), 4): d.line([X1 - 12, k, X1 - 4, k], fill=STEEL[3] if p != "V" else WOOD[3])   # the ladder
    d.line([X1 - 12, cy + R_ * .3, X1 - 12, Y1 - 2], fill=OUT); d.line([X1 - 4, cy + R_ * .3, X1 - 4, Y1 - 2], fill=OUT)
    if p in "MN": d.rectangle([cx - R_ + 6, cy - 2, cx - R_ + 9, cy + R_ * .6], fill=(220, 224, 228), outline=OUT)   # level gauge
    if p == "G":                                                                                              # the handrail round the roof and a vent cowl
        d.arc([cx - R_ + 3, cy - R_ + 3, cx + R_ - 3, cy + R_ - 3], 150, 390, fill=IRON[3], width=3)
        for k in range(7): a = math.radians(150 + k * 40); disc(d, cx + math.cos(a) * (R_ - 3), cy + math.sin(a) * (R_ - 3), 3, IRON)
        disc(d, cx - R_ * .4, cy + R_ * .35, 7, IRON); d.ellipse([cx - R_ * .4 - 3, cy + R_ * .35 - 3, cx - R_ * .4 + 3, cy + R_ * .35 + 3], fill=OUT)
    if p == "N" and m == 2: case(d, X0 + 4, Y1 - 18, X0 + 22, Y1 - 4, RED)                                    # the pump on a fuel tank
    if p == "F": d.arc([cx - R_ + 3, cy - R_ + 3, cx + R_ - 3, cy + R_ - 3], 90, 270, fill=GLOW[1], width=2)
    d.rectangle([X0 + 2, cy + R_ - 10, X0 + 12, cy + R_ - 4], fill=BRASS[2] if p in "VG" else RED[2], outline=OUT)   # outlet valve
    if c.broken: d.ellipse([X0, cy + R_ - 6, X0 + 20, cy + R_ + 4], fill=liq[1])
    return [(cx, cy, 40, CYAN)] if p == "F" else []


reg("storagetank", storagetank, "victorian", "tanks of 4 to 6 ft across: 500 to 1,000 gallon riveted cisterns and farm fuel tanks (Braithwaite pressed-steel tanks; 2,500 litre polyethylene water tanks)",
    states=("closed", "open"), openable="box", front=False, clear=2, axes={"contents": list(TANKS)})


def robotarm(tm, x, y, w, h, st, v, c):
    """An industrial robot arm from above on its floor plate, the yellow and black hazard line round its reach.
    Mid-Century: a hydraulic arm, its box-like body on the turret and the telescoping boom out to a gripper, painted
    dark blue or grey. Modern: a six-axis arm in a maker's orange, yellow, red or white, its upper arm and forearm
    folded over the base, the wrist and gripper or welding torch, the fat cable dress along it. Future Darkness: a
    slender dark arm with lit joints. Running: the arm swung out to work and its lamp lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = X0 + W // 2 + 4, Y0 + H // 2 + 6
    hazard(d, X0 + 1, Y0 + 1, X1 - 1, Y0 + 4); hazard(d, X0 + 1, Y1 - 4, X1 - 1, Y1 - 1)
    for hx in (X0 + 1, X1 - 4):
        d.rectangle([hx, Y0 + 1, hx + 3, Y1 - 1], fill=HAZ[0], outline=OUT)
        for k in range(Y0 + 4, Y1 - 4, 10): d.rectangle([hx + 1, k, hx + 2, k + 4], fill=HAZ[1])
    case(d, cx - 26, cy - 26, cx + 26, cy + 24, ramp(mix(L[2], (40, 40, 46), .6), 12))                        # floor plate
    for k in ((-22, -22), (22, -22), (-22, 20), (22, 20)): bolt(d, cx + k[0], cy + k[1])
    cl = lambda px_, py_: (min(max(px_, X0 + 8), X1 - 8), min(max(py_, Y0 + 8), Y1 - 8))
    AR = L if p != "F" else ramp(mix(L[2], (30, 32, 40), .2), 12)
    ang = (-2.2 + .35 * m) + (.9 if c.on else 0)
    if p == "M":
        case(d, cx - 22, cy - 16, cx + 22, cy + 16, AR, r=3); louvres(d, cx - 18, cy - 12, cx - 6, cy + 12, AR, 3, vert=True)                                                  # the body on its turret
        ex, ey = cl(cx + math.cos(ang) * 44, cy + math.sin(ang) * 44)
        d.line([cx, cy, ex, ey], fill=OUT, width=12); d.line([cx, cy, ex, ey], fill=STEEL[3], width=8)        # telescoping boom
        d.line([cx, cy, cx + (ex - cx) * .5, cy + (ey - cy) * .5], fill=AR[1], width=8)
    else:
        disc(d, cx, cy, 20, AR)                                                                               # base turret
        ex1, ey1 = cl(cx + math.cos(ang) * 28, cy + math.sin(ang) * 28)
        ex, ey = cl(ex1 + math.cos(ang + 1.2 - .2 * m) * 22, ey1 + math.sin(ang + 1.2 - .2 * m) * 22)
        d.line([cx, cy, ex1, ey1], fill=OUT, width=18); d.line([cx, cy, ex1, ey1], fill=AR[2], width=14)      # upper arm
        d.line([cx - 2, cy - 2, ex1 - 2, ey1 - 2], fill=AR[4], width=2)
        disc(d, ex1, ey1, 10, AR)                                                                             # elbow
        d.line([ex1, ey1, ex, ey], fill=OUT, width=12); d.line([ex1, ey1, ex, ey], fill=AR[3], width=8)       # forearm
        cable(d, [(cx + 6, cy + 6), (ex1 + 6, ey1 + 4)], (40, 40, 44), 3)
        if p == "F":
            for jx, jy in ((cx, cy), (ex1, ey1)): d.ellipse([jx - 3, jy - 3, jx + 3, jy + 3], fill=GLOW[2] if c.on else GLOW[0])
    tool = int(v.get("tool", 0)) % 3
    if m == 4:
        for fx, fy in ((X0 + 3, Y0 + 7), (X1 - 7, Y0 + 7), (X0 + 3, Y1 - 11), (X1 - 7, Y1 - 11)): d.rectangle([fx, fy, fx + 4, fy + 4], fill=YEL[2], outline=OUT)   # guard fence posts
    if tool == 0:
        for s in (-1, 1): d.line([ex, ey, ex + 5 * s, ey + 6], fill=STEEL[1], width=2)                       # gripper
    elif tool == 1: d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=COPPER[2], outline=OUT); d.point((ex, ey), fill=(255, 255, 220))   # weld torch
    else: d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=(40, 40, 44), outline=STEEL[3])                   # suction cup
    disc(d, ex, ey, 3, STEEL)
    lamp(d, X1 - 8, Y0 + 10, (250, 160, 40), c.on, 3)
    if c.broken: sparks(d, ex, ey); d.line([cx + 10, cy + 14, cx + 24, cy + 20], fill=(30, 30, 30), width=3)
    return [(ex, ey, 18, (1.4, 1.4, 1.8))] if c.on and tool == 1 and not c.broken else []


reg("robotarm", robotarm, "mid-century", "industrial robots with a base about 2 ft square and a 4 to 6 ft reach (Unimate 1961; KUKA KR 16 and Fanuc M-20 series)",
    states=("off", "on"), front=False, clear=2, axes={"tool": [0, 1, 2]})


def roofvent(tm, x, y, w, h, st, v, c):
    """A roof ventilator from above: its round head on the curb. Mid-Century: a galvanised cowl or a whirlybird
    turbine, the curved vanes swirled round the top cap. Modern: a turbine in galvanised or painted steel, or a square
    louvred extract cowl with its fan. Future Darkness: a dark sealed vent with a lit sensor. Running: the turbine's
    vanes blurred as it spins."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(W, H) // 2 - 1
    MT = ramp((170, 174, 176), 14) if m in (0, 3) else L
    if p == "F": MT = ramp(mix(L[2], (40, 44, 52), .2), 12)
    if p == "N" and m == 4:
        case(d, X0, Y0, X1, Y1, MT); louvres(d, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, MT, 3); return []
    if p == "M" and m % 2:                                                                                    # a cowl, its hood toward the south
        disc(d, cx, cy, r, MT); d.pieslice([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 0, 180, fill=OUT)
        d.pieslice([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], 0, 180, fill=MT[0]); return []
    if p == "F" and m % 2:
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, MT, r=4); d.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=GLOW[2] if c.on else GLOW[0]); return []
    disc(d, cx, cy, r, MT)
    nv = 12 if p == "M" else 16
    for k in range(nv):
        a = k * 2 * math.pi / nv + (.2 if c.on else 0)
        d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], math.degrees(a), math.degrees(a) + 12, fill=MT[0])
        d.line([cx + math.cos(a) * r * .4, cy + math.sin(a) * r * .4, cx + math.cos(a + .5) * (r - 1), cy + math.sin(a + .5) * (r - 1)], fill=MT[0] if not c.on else MT[3])
    disc(d, cx, cy, max(2, r // 3), ramp(tone(MT[2], 20), 10))
    if p == "F": d.point((cx, cy), fill=GLOW[2])
    if c.broken: d.pieslice([cx - r, cy - r, cx + r, cy + r], 20, 70, fill=OUT)


reg("roofvent", roofvent, "mid-century", "turbine ventilators of 12 to 14 in throat with heads about 14 in across (Whirlybird and Lomanco turbines; Edmonds rotary vents 1930s)",
    states=("off", "on"), front=False, off=3)


def vent(tm, x, y, w, h, st, v, c):
    """An air vent or grate on the wall or floor, from above: the frame and its grille. Victorian: a cast-iron grate
    from the founder's catalogue, its pierced pattern of slots and holes, black-leaded or brass. Great War: a pressed
    steel louvre. Mid-Century: a painted steel grille with adjustable louvres, cream or grey. Modern: an aluminium or
    white plastic diffuser, or a duct grille with a filter. Future Darkness: a dark slot vent with a faint lit edge.
    Broken: the grille hanging off, the duct's dark mouth behind."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    if p == "V": FR = BRASS if c.rich else ramp(mix(L[2], (34, 34, 44), .35), 16)
    elif p == "G": FR = ramp(mix(L[2], (100, 100, 104), .2), 14)
    elif p == "M": FR = L
    elif p == "N": FR = [ramp((210, 212, 214), 10), PLASTIC_WHITE, STEEL, L, ramp((100, 104, 110), 12)][m]
    else: FR = ramp(mix(L[2], (36, 40, 48), .2), 12)
    case(d, X0, Y0, X1, Y1, FR)
    ix0, iy0, ix1, iy1 = X0 + 5, Y0 + 5, X1 - 5, Y1 - 5
    if c.broken:
        d.rectangle([ix0, iy0, ix1, iy1], fill=(14, 12, 16))
        d.polygon([(ix0, iy1), (ix1 - 10, iy1 + 3), (ix1 - 12, iy0 + 8), (ix0 + 4, iy0 + 4)], fill=FR[1], outline=OUT); return []
    d.rectangle([ix0, iy0, ix1, iy1], fill=(20, 18, 22))
    if p == "V":
        pat = m % 3
        if m >= 3: d.rectangle([ix0, iy0, ix1, iy1], fill=FR[1])
        for i, xx in enumerate(range(ix0 + 2, ix1 - 2, 8)):
            for j, yy in enumerate(range(iy0 + 2, iy1 - 2, 8)):
                if pat == 0: d.ellipse([xx, yy, xx + 5, yy + 5], fill=FR[2], outline=FR[0])
                elif pat == 1: d.rectangle([xx, yy, xx + 6, yy + 2], fill=FR[3]); d.rectangle([xx + 2, yy + 4, xx + 4, yy + 6], fill=FR[2])
                else: d.polygon([(xx + 3, yy), (xx + 6, yy + 3), (xx + 3, yy + 6), (xx, yy + 3)], fill=FR[3])
    elif p == "G":
        louvres(d, ix0, iy0 + 1, ix1, iy1, FR, 3 if m % 2 else 4)
    elif p == "M":                                                                                            # an egg-crate return grille or a bar grille with its damper
        if m % 2 == 0:
            for k in range(ix0 + 4, ix1, 6): d.line([k, iy0, k, iy1], fill=FR[3], width=2)
            for k in range(iy0 + 4, iy1, 6): d.line([ix0, k, ix1, k], fill=FR[3], width=2)
        else:
            for k in range(ix0 + 3, ix1, 5): d.line([k, iy0, k, iy1], fill=FR[3], width=2)
        d.rectangle([ix1 - 8, iy0 - 4, ix1 - 2, iy0 - 1], fill=FR[0])                                          # the damper lever
    elif p == "N":
        if m % 2: 
            for k in range(3): d.rectangle([ix0 + k * 4, iy0 + k * 3, ix1 - k * 4, iy1 - k * 3], outline=FR[1 + k % 2])   # a ceiling diffuser's rings
        else:
            louvres(d, ix0, iy0, ix1, iy1, FR, 3, vert=True)
    elif m % 2:
        d.ellipse([ix0 + 4, iy0, ix1 - 4, iy1], fill=FR[1], outline=OUT); d.ellipse([ix0 + 10, iy0 + 4, ix1 - 10, iy1 - 4], fill=(20, 18, 22), outline=GLOW[1])
    else:
        for k in range(iy0 + 2, iy1, 4 + m): d.line([ix0 + 2, k, ix1 - 2, k], fill=FR[0], width=2)
        d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=GLOW[1] if not c.broken else GLOW[0])
    for bx, by in ((X0 + 2, Y0 + 2), (X1 - 3, Y0 + 2), (X0 + 2, Y1 - 3), (X1 - 3, Y1 - 3)): bolt(d, bx + 1, by + 1, FR)


reg("vent", vent, "victorian", "grilles of about 18 by 9 in to 2 ft by 1 ft (Victorian cast-iron air bricks and floor gratings; Waterloo and Gilberts grilles)",
    states=("one",), front=True, clear=0, off=2)


# ================================================================ the laboratory and the clinic
def nmr(tm, x, y, w, h, st, v, c):
    """An NMR spectrometer's magnet from above, with the floor tape marking its field. Mid-Century: an iron-cored
    electromagnet, its two great round pole pieces and yoke with the coils wound round them, the probe between,
    and the console cabinet behind. Modern: a superconducting magnet, the big round white cryostat with its turret of
    helium and nitrogen fill ports, standing on three legs on a pad. Future Darkness: a compact dark magnet with a lit
    ring. Running: the field ring lit and the console screen on."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=YEL[3] if m % 2 == 0 else (200, 60, 50), width=2)      # the field line on the floor
    if p == "M":
        case(d, X0 + 8, cy - 14, X1 - 8, cy + 14, ramp(mix(L[2], (60, 62, 70), .4), 14))                      # the yoke
        for sx in (X0 + 24, X1 - 24):
            disc(d, sx, cy, 18 if m < 3 else 15, COPPER if m != 3 else ramp((150, 120, 70), 16))           # coils
            disc(d, sx, cy, 10, IRON)                                                                         # pole faces
        d.rectangle([cx - 4, cy - 18, cx + 4, cy + 4], fill=(220, 220, 214), outline=OUT)                     # the probe
        case(d, X0 + 10, Y0 + 6, X1 - 10, Y0 + 22, L)                                                          # the console
        for k in range(3): dial(d, X0 + 20 + k * 14, Y0 + 14, 5)
        lamp(d, X1 - 18, Y0 + 14, (240, 80, 40), c.on, 2)
        cable(d, [(cx, cy + 14), (cx + 6, Y1 - 6)], (40, 40, 44), 3)
        return []
    CR = ramp((220, 222, 220), 10) if p == "N" and m < 3 else (L if p == "N" else ramp(mix(L[2], (40, 44, 52), .3), 12))
    for a in (math.pi / 2, math.pi * 7 / 6, -math.pi / 6): d.rectangle([cx + math.cos(a) * 30 - 4, cy + math.sin(a) * 30 - 4, cx + math.cos(a) * 30 + 4, cy + math.sin(a) * 30 + 4], fill=STEEL[1], outline=OUT)   # legs
    disc(d, cx, cy, int(min(W, H) * .36), CR)                                                                 # the cryostat
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], outline=CR[1])
    tx = cx + (m - 2) * 4
    disc(d, tx, cy - 4, 9, STEEL)                                                                             # the turret
    for dx, dy in ((-4, -14), (6, -12), (-10, 4)): disc(d, tx + dx, cy + dy, 3, CHROME)                      # fill ports
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(30, 30, 36), outline=OUT)                              # the bore
    if p == "F": d.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], outline=GLOW[1] if c.on else GLOW[0], width=2)
    if c.broken:
        for k in range(3): d.ellipse([cx + 12 + k * 6, cy - 30 - k * 4, cx + 22 + k * 6, cy - 22 - k * 4], fill=(230, 236, 240))   # a quench's cloud
    return [(cx, cy, 50, ICE)] if c.on and p == "F" else []


reg("nmr", nmr, "mid-century", "NMR magnets of 3 to 5 ft across with their field line (Varian A-60 electromagnet 1961; Bruker 400 to 600 MHz cryostats about 4 ft)",
    states=("off", "on"), front=False, clear=3)


def spectrometer(tm, x, y, w, h, st, v, c):
    """A mass spectrometer from above. Mid-Century: a magnetic-sector instrument across a long bench, the bent
    flight tube passing between the poles of the big magnet, the ion source at one end, the collector at the other,
    the vacuum pumps and the chart recorder. Modern: a gas chromatograph's oven box beside the benchtop quadrupole
    unit and a computer screen. Future Darkness: a dark sealed analyser with a lit sample tray. Running: the source
    glowing and the screen or chart moving."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp((70, 70, 76), 10) if p != "M" else ramp(tone(L[2], -30), 12))    # the bench or frame
    if p == "M":
        mx = X0 + W * (.4 + .05 * (m % 3))
        d.arc([X0 + 10, Y0 + 8, X1 - 30, Y1 + 30], 200, 320, fill=OUT, width=7); d.arc([X0 + 10, Y0 + 8, X1 - 30, Y1 + 30], 200, 320, fill=STEEL[3], width=3)   # flight tube
        case(d, mx - 18, Y0 + 4, mx + 18, Y0 + 34, L, r=3)                                                  # magnet
        d.ellipse([mx - 10, Y0 + 10, mx + 10, Y0 + 28], fill=COPPER[2], outline=OUT)
        case(d, X0 + 4, Y0 + H * .55, X0 + 24, Y1 - 4, c.alt)                                                 # ion source housing
        lamp(d, X0 + 14, Y0 + H * .55 + 8, (240, 150, 60), c.on, 3)
        case(d, X1 - 30, Y0 + H * .5, X1 - 4, Y1 - 4, ramp((220, 216, 200), 10))                              # chart recorder
        d.line([X1 - 28, Y1 - 12, X1 - 20, Y1 - 18, X1 - 14, Y1 - 10, X1 - 6, Y1 - 20], fill=(180, 40, 40))
        for k in range(2): disc(d, X0 + W * .5 + k * 14, Y1 - 10, 5, IRON)                                    # pumps
        return []
    if p == "N":
        case(d, X0 + 4, Y0 + 4, X0 + W * .38, Y1 - 6, L)                                                       # GC oven
        d.rectangle([X0 + 8, Y0 + 8, X0 + W * .34, Y0 + H * .55], fill=L[1], outline=OUT)
        d.ellipse([X0 + 12, Y0 + 10, X0 + 28, Y0 + 26], outline=STEEL[4])
        case(d, X0 + W * .4, Y0 + 4, X0 + W * .76, Y1 - 6, c.alt)                                              # the MS unit
        louvres(d, X0 + W * .44, Y0 + 8, X0 + W * .72, Y0 + 20, c.alt, 3)
        lamp(d, X0 + W * .7, Y1 - 12, (90, 220, 90), c.on, 2)
        d.rectangle([X0 + W * .8, Y0 + 6, X1 - 4, Y0 + 30], fill=(40, 40, 46), outline=OUT); screen(d, X0 + W * .82, Y0 + 8, X1 - 6, Y0 + 26, c.on, c.broken)
        if m % 2: case(d, X0 + W * .42, Y1 - 14, X0 + W * .56, Y1 - 4, ramp((210, 210, 206), 8))              # autosampler
        return []
    EN = ramp(mix(L[2], (40, 44, 52), .25), 12)
    case(d, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, EN, r=6)
    for k in range(5): d.ellipse([X0 + 10 + k * 10, Y1 - 18, X0 + 16 + k * 10, Y1 - 12], fill=(220, 220, 230) if (k + m) % 2 else (180, 60, 60), outline=OUT)   # sample vials
    d.line([X0 + 8, Y0 + H // 2 - 6, X1 - 8, Y0 + H // 2 - 6], fill=GLOW[1] if c.on else GLOW[0], width=2)
    case(d, X1 - 30, Y0 + 8, X1 - 8, Y0 + 26, ramp(tone(EN[2], 30), 10), r=3)
    return [(X0 + W // 3, Y1 - 15, 26, CYAN)] if c.on else []


reg("spectrometer", spectrometer, "mid-century", "mass spectrometers about 5 by 3 ft on their bench (CEC 21-103 and Metropolitan-Vickers MS2 sector instruments; Agilent 5973 GC-MS)",
    states=("off", "on"), front=True, clear=3)


def oxygen(tm, x, y, w, h, st, v, c):
    """An oxygen concentrator from above: the cabinet on its castors, the flowmeter's glass tube on top, the
    humidifier bottle and the green tubing coiled to the nasal cannula. Mid-Century: a large cabinet in wood-grain or
    cream steel. Modern: a grey or blue plastic unit with a carry handle. Future Darkness: a small dark unit with a
    lit ring. Running: the ball up in the flowmeter, a green lamp."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    if p == "M" and m == 1: L = ramp((140, 96, 60), 14)                                                         # the wood-grain cabinet
    if p == "M" and m == 3: case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, STEEL)                                        # on its trolley
    case(d, X0 + 1, Y0 + 1, X1 - 6, Y1 - 4, L, r=3 if p != "M" else 1)
    if p == "N": d.rounded_rectangle([X0 + 6, Y0 + 3, X1 - 12, Y0 + 7], 2, fill=L[0], outline=OUT)             # handle
    d.rectangle([X0 + 4, Y0 + 10, X0 + 8, Y1 - 10], fill=(210, 230, 230), outline=OUT)                          # flowmeter tube
    d.ellipse([X0 + 4, (Y1 - 14) if not c.on else (Y0 + 12), X0 + 8, (Y1 - 10) if not c.on else (Y0 + 16)], fill=(40, 40, 46))
    d.ellipse([X0 + 11, Y0 + 10, X0 + 19, Y0 + 18], fill=(200, 226, 236), outline=OUT)                         # humidifier bottle
    if p == "F": d.ellipse([X0 + 10, Y1 - 14, X0 + 20, Y1 - 6], outline=GLOW[1] if c.on else GLOW[0], width=2)
    lamp(d, X1 - 12, Y1 - 10, (60, 210, 90), c.on, 2)
    tube = (100, 190, 120) if m != 4 else (220, 230, 230)
    d.arc([X1 - 14, Y0 + 2, X1 - 1, Y0 + 16], 0, 360, fill=tube); d.arc([X1 - 12, Y0 + 4, X1 - 3, Y0 + 14], 0, 300, fill=tube)   # coiled tubing
    for kx, ky in ((X0 + 3, Y1 - 3), (X1 - 9, Y1 - 3)): d.rectangle([kx, ky - 1, kx + 3, ky + 1], fill=RUBBER[1])
    if c.broken: d.line([X1 - 8, Y0 + 8, X1 - 1, Y1 - 2], fill=tube)


reg("oxygen", oxygen, "mid-century", "home oxygen concentrators of about 15 by 15 in and 2 to 2 1/2 ft tall (Invacare Platinum 5; DeVilbiss 515; 1970s units a little larger)",
    states=("off", "on"), front=True, clear=1, off=3)


def purifier(tm, x, y, w, h, st, v, c):
    """A water purifier on the wall, from above. Mid-Century: a stoneware candle filter crock, the round crock and
    its lid with a knob, the brass tap at the front; or a steel boiling still. Modern: a reverse-osmosis unit, its
    three or four filter canisters in a row on a bracket with the tubing, the pressure tank and the faucet. Future
    Darkness: a sealed dark unit with a lit purity readout. Running: water dripping, the readout lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 - 2
    if p == "M":
        CR = ramp([(214, 204, 180), (150, 110, 70), (232, 230, 224), (120, 130, 140), (190, 160, 110), (90, 70, 56)][int(v.get("livery", 0)) % 6], 12)
        if m == 2:                                                                                            # a steel boiling still
            case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 3, STEEL, r=2); disc(d, cx - 3, cy, 7, CHROME); d.line([cx + 4, cy, X1 - 3, Y1 - 4], fill=COPPER[2], width=2)
            return []
        r0 = min(W, H) // 2 - 2
        if m == 1: disc(d, cx + 3, cy + 3, r0 - 1, ramp(tone(CR[2], -30), 12))                                # the lower crock under the upper
        if m == 3: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 5], fill=IRON[2], outline=OUT)                   # wall bracket
        disc(d, cx, cy, r0 - (2 if m == 4 else 0), CR)                                                        # the crock
        disc(d, cx, cy, r0 - 5, ramp(tone(CR[2], -14), 12))                                                  # its lid
        disc(d, cx, cy, 3, BRASS if m == 4 else CR)
        d.rectangle([cx - 2, Y1 - 5, cx + 2, Y1 - 1], fill=BRASS[3], outline=OUT)                            # the tap
        if c.on: d.ellipse([cx - 1, Y1 - 1, cx + 1, Y1 + 1], fill=(120, 170, 220))
        return []
    if p == "N":
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y0 + 9, L)                                                             # the bracket panel on the wall
        n = 3 if m % 2 else 2
        for k in range(n):
            disc(d, X0 + 6 + k * (W - 10) / max(1, n - 1) * (1 if n > 1 else 0), Y0 + 10, 5, [PLASTIC_WHITE, ramp((150, 190, 220), 12), ramp((190, 200, 206), 10)][(k + m) % 3])
        d.line([X0 + 4, Y0 + 17, X1 - 4, Y0 + 17], fill=(220, 230, 236), width=2)
        disc(d, X0 + 8, Y1 - 7, 6, c.alt)                                                                     # pressure tank
        d.rectangle([X1 - 8, Y1 - 9, X1 - 3, Y1 - 2], fill=CHROME[3], outline=OUT)                            # faucet
    else:
        case(d, X0 + 1 + (m % 2) * 3, Y0 + 2, X1 - 1, Y1 - 3, ramp(mix(L[2], (40, 44, 52), .2), 12), r=3 + m)
        d.rectangle([X0 + 6, Y0 + 7 + m, X1 - 6, Y0 + 12 + m], fill=GLOW[2] if c.on else GLOW[0], outline=OUT)
        lamp(d, X1 - 7, Y1 - 7, (90, 200, 240), c.on, 2)
    if c.broken: d.ellipse([X0 + 2, Y1 - 4, X0 + 12, Y1 + 1], fill=(100, 140, 190))
    return [(cx, Y0 + 14, 18, CYAN)] if c.on and p == "F" else []


reg("purifier", purifier, "mid-century", "filters and RO units about 15 by 15 in (British Berkefeld stoneware filters, about 12 in across; under-sink RO systems of 15 by 5 in plus a tank)",
    states=("off", "on"), front=True, clear=1, off=2)


def surgicalrobot(tm, x, y, w, h, st, v, c):
    """A robotic surgery machine's patient cart from above: the wheeled base and column, the boom with three or four
    arms reaching out over the table edge, each holding its instrument in sterile drape, and the camera arm in the
    middle. Modern: a white cart with the arms in clear plastic drapes. Future Darkness: a dark cart with slender
    arms and lit joints. Running: the arm lamps lit blue."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    BA = ramp((226, 228, 230), 8) if p == "N" and m < 3 else (L if p == "N" else ramp(mix(L[2], (40, 44, 52), .25), 12))
    case(d, X0 + 6, Y0 + H * .55, X1 - 6, Y1 - 2, BA, r=6)                                                     # the wheeled base
    disc(d, X0 + W // 2, Y0 + H * .62, 12, ramp(tone(BA[2], -18), 10))                                       # the column
    case(d, X0 + 8, Y0 + H * .3, X1 - 8, Y0 + H * .42, BA, r=3)                                                # the boom
    na = 3 + m % 2
    for k in range(na):
        ax = X0 + 12 + k * (W - 24) / (na - 1); ay = Y0 + H * .36
        tx, ty = ax + (k - (na - 1) / 2) * 6, Y0 + 4 + (k % 2) * 6
        d.line([ax, ay, tx, ty], fill=OUT, width=7); d.line([ax, ay, tx, ty], fill=BA[3], width=4)          # the arm
        if p == "N": d.line([ax, ay, tx, ty], fill=(200, 220, 230), width=2)                                 # drape
        d.line([tx, ty, tx, ty - 3], fill=STEEL[1], width=2)
        lamp(d, ax, ay, (90, 170, 250), c.on, 2)
    if p == "F":
        for k in range(na): d.point((X0 + 12 + k * (W - 24) / (na - 1), Y0 + H * .45), fill=GLOW[2])
    if c.broken: sparks(d, X0 + W * .7, Y0 + H * .35)
    return [(X0 + W // 2, Y0 + H * .3, 40, ICE)] if c.on and p == "F" else []


reg("surgicalrobot", surgicalrobot, "modern", "patient-side carts of about 3 1/2 to 4 ft square with their arms (Intuitive da Vinci, 2000; CMR Versius carts)",
    states=("off", "on"), front=True, clear=3)


def rtg(tm, x, y, w, h, st, v, c):
    """A radioisotope generator from above: the round core with its cooling fins spread out like a star, bolted on
    its stand, the radiation trefoil and a cable to the load. Mid-Century: a Cold War unit (SNAP or Beta-M), fins of
    grey steel, a stencilled drum. Modern: a finned aluminium unit on a skid. Future Darkness: a dark compact core
    with a warm lit centre. Running: heat shimmer, a warm glow. Broken: a fin snapped off."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = min(W, H) // 2 - 3
    case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, ramp(mix(L[2], (60, 60, 66), .5), 12) if p != "N" else ramp((150, 120, 70), 14))   # the stand or skid
    FN = STEEL if p == "M" else (ramp((196, 200, 206), 10) if p == "N" else ramp(mix(L[2], (40, 44, 52), .3), 12))
    nf = 8 + 2 * (m % 3)
    for k in range(nf):
        a = k * 2 * math.pi / nf + (.2 if m % 2 else 0)
        if c.broken and k == 1: continue
        d.line([cx, cy, cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=OUT, width=5); d.line([cx, cy, cx + math.cos(a) * (R_ - 1), cy + math.sin(a) * (R_ - 1)], fill=FN[3], width=2)
    disc(d, cx, cy, R_ // 2, L if p != "F" else FN)                                                           # the core drum
    trefoil(d, cx, cy, max(4, R_ // 4))
    cable(d, [(cx + R_ // 2, cy + 4), (X1 - 3, Y1 - 4)], (40, 40, 44), 2)
    if c.on and not c.broken: return [(cx, cy, 40, (1.5, 1.1, .7))]


reg("rtg", rtg, "mid-century", "radioisotope generators of 1 1/2 to 3 ft across the fins (SNAP-27 about 18 in; Soviet Beta-M about 2 1/2 ft; MMRTG about 2 ft)",
    states=("off", "on"), front=False, clear=2)


# ================================================================ the office, the street and the gym
def shredder(tm, x, y, w, h, st, v, c):
    """A document shredder from above: the bin with the cutting head on top, the feed slot across it and the switch.
    Mid-Century: a heavy grey steel office shredder on its cabinet. Modern: a black or grey plastic bin shredder,
    a paper strip in the slot, the window on the bin showing the shreds. Future Darkness: a dark slim unit with a lit
    slot. Running: paper being fed and the lamp green. Broken: jammed, paper bunched in the slot."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 1, L, r=3 if p != "M" else 1)
    sy = Y0 + H * (.3 + .05 * (m % 3))
    d.rectangle([X0 + 4, sy - 1, X1 - 4, sy + 2], fill=(18, 16, 20) if p != "F" else (GLOW[1] if c.on else GLOW[0]))   # the slot
    if c.on or c.broken:
        d.rectangle([X0 + 6, sy - 8, X1 - 8, sy], fill=(240, 238, 230), outline=OUT)                         # paper going in
        if c.broken: d.polygon([(X0 + 6, sy - 8), (X0 + 12, sy - 12), (X0 + 18, sy - 6)], fill=(230, 226, 214), outline=OUT)
    if p in "NF" and m % 2 == 0:
        d.rectangle([X0 + 6, Y1 - 10, X1 - 6, Y1 - 4], fill=(70, 80, 90), outline=OUT)                       # the bin window
        for k in range(X0 + 7, X1 - 7, 3): d.line([k, Y1 - 9, k + 1, Y1 - 5], fill=(220, 220, 214))
    lamp(d, X1 - 6, Y0 + 6, (90, 220, 90), c.on, 2)
    d.rectangle([X0 + 4, Y0 + 4, X0 + 10, Y0 + 7], fill=L[0], outline=OUT)                                    # the switch
    if p == "M": louvres(d, X0 + 4, Y0 + H * .55, X1 - 4, Y1 - 4, L, 4)


reg("shredder", shredder, "mid-century", "office shredders of about 15 by 12 in to 18 by 15 in (Intimus 007 and Fellowes bin shredders)",
    states=("off", "on"), front=True, clear=1, off=3)


def ticketmachine(tm, x, y, w, h, st, v, c):
    """A ticket machine against the wall, from above: its cabinet with the canopy over the face, the buttons or
    screen, the coin slot and the ticket tray at the front. Mid-Century: a steel cabinet with a row of destination
    buttons and a coin slot, in the operator's colours. Modern: a touchscreen and card reader under a sloped hood.
    Future Darkness: a slim dark pillar with a lit face. Running: the screen lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    case(d, X0 + 1 + (3 if p == "F" and m % 2 else 0), Y0 + 1, X1 - 1, Y1 - 3, L, r=2 if p != "F" else 4 + m)
    d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 8], fill=c.alt[2] if p != "F" else L[3], outline=OUT)           # the canopy and sign
    glyphs(d, X0 + 6, Y0 + 5, X1 - 8, Y0 + 6, (240, 240, 236))
    if p == "M":
        if m >= 3: d.rectangle([X0 + 3, Y0 + 10, X1 - 3, Y0 + 22], fill=(220, 220, 210), outline=OUT)            # a printed route board
        for k in range(4 + m % 2): d.rectangle([X0 + 5 + k * 6, Y0 + 13, X0 + 9 + k * 6, Y0 + 17], fill=(230, 226, 210) if k % 2 else RED[3], outline=OUT)
        d.rectangle([X1 - 9, Y0 + 12, X1 - 5, Y0 + 20], fill=(20, 20, 24))                                    # coin slot
    else:
        screen(d, X0 + 5, Y0 + 11, X1 - 12, Y0 + 22, c.on, c.broken, tint=(80, 180, 120) if m % 2 else None)
        d.rectangle([X1 - 9, Y0 + 12, X1 - 4, Y0 + 18], fill=(30, 30, 34), outline=STEEL[3])                  # card reader
    d.rectangle([X0 + 6, Y1 - 7, X1 - 6, Y1 - 4], fill=(20, 20, 24), outline=STEEL[2])                         # ticket tray
    if c.broken and p == "M": d.line([X0 + 4, Y0 + 12, X1 - 4, Y0 + 20], fill=OUT, width=2)
    return [(X0 + W // 2, Y1, 22, (1.2, 1.3, 1.5))] if c.on and not c.broken and p != "M" else []


reg("ticketmachine", ticketmachine, "mid-century", "ticket machines about 2 ft wide by 1 1/2 ft deep (London Transport Shere machines; Scheidt and Bachmann and Ascom station machines)",
    states=("off", "on"), front=True, clear=3)


def telecombox(tm, x, y, w, h, st, v, c):
    """A street telecom cabinet from above: the long sheet-steel cabinet on its plinth, the rain lid with its
    vents, the door seams and lock, the warning label, and the stickers and tags a street leaves on it.
    Mid-Century: a cast-iron or steel cross-connection pillar in the operator's green or grey. Modern: a larger
    fibre street cabinet, green, grey or cream, with its fan vents. Future Darkness: a dark armoured node with a lit
    status strip. Open: the doors swung out and the wiring and fibre trays inside."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv
    m = mk(c, 5)
    BX = [ramp((40, 90, 64), 14), ramp((140, 144, 146), 12), ramp((206, 198, 170), 10), L, ramp((60, 72, 60), 14)][m] if p != "F" else ramp(mix(L[2], (40, 44, 52), .25), 12)
    if p == "M" and m == 2: BX = L
    d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=CONC[2], outline=OUT)                                   # the plinth
    if p == "M":                                                                                              # a narrower cast pillar with its domed lid
        case(d, X0 + W * .18, Y0 + 3, X1 - W * .18, Y1 - 4, BX, r=8)
        d.rounded_rectangle([X0 + W * .22, Y0 + 6, X1 - W * .22, Y1 - 8], 6, outline=BX[4])
        for k in (X0 + W * .3, X1 - W * .3): bolt(d, k, Y0 + H // 2, BX)
    else: case(d, X0 + 3, Y0 + 3, X1 - 3, Y1 - 4, BX, r=2)
    if p == "M": pass
    else: louvres(d, X0 + 8, Y0 + 7, X0 + W * .3, Y1 - 10, BX, 3, vert=True)
    if c.open and p == "M":
        d.rectangle([X0 + W * .3, Y0 + 6, X1 - W * .3, Y1 - 8], fill=(30, 30, 34), outline=OUT)
        for k in range(int(X0 + W * .32), int(X1 - W * .32), 3): d.line([k, Y0 + 8, k, Y1 - 10], fill=[(200, 60, 50), (60, 120, 200), (230, 200, 60), (220, 220, 220)][k % 4])
    elif c.open:
        d.rectangle([X0 + W * .35, Y0 + 5, X1 - 6, Y1 - 6], fill=(30, 30, 34), outline=OUT)
        for k in range(int(X0 + W * .38), int(X1 - 8), 5): d.line([k, Y0 + 7, k, Y1 - 8], fill=[(200, 60, 50), (60, 120, 200), (230, 200, 60), (220, 220, 220)][k % 4])
    elif p != "M":
        d.line([X0 + W * .62, Y0 + 5, X0 + W * .62, Y1 - 6], fill=BX[0])                                     # door seam
        bolt(d, X0 + W * .62 + 4, Y0 + H // 2, STEEL)
    d.polygon([(X1 - 14, Y0 + 9), (X1 - 9, Y0 + 17), (X1 - 19, Y0 + 17)], fill=YEL[3], outline=OUT)           # warning label
    if c.w <= 2 or c.cond != "new":
        d.rectangle([X0 + W * .4, Y0 + 9, X0 + W * .4 + 8, Y0 + 14], fill=(230, 230, 230)); d.line([X0 + W * .45, Y1 - 10, X0 + W * .55, Y1 - 12, X0 + W * .6, Y1 - 9], fill=(200, 60, 160), width=2)   # sticker and tag
    if p == "F": d.line([X0 + 6, Y1 - 6, X1 - 6, Y1 - 6], fill=GLOW[1], width=2)
    if c.broken: sparks(d, X0 + W * .5, Y0 + H * .5)


reg("telecombox", telecombox, "mid-century", "street cabinets about 3 by 1 1/2 ft (BT PCP cabinets about 1.1 m by 0.4 m; Openreach fibre cabinets 1.2 m by 0.5 m)",
    states=("closed", "open"), front=True, clear=2, off=3)


def rowingmachine(tm, x, y, w, h, st, v, c):
    """A rowing machine from above, long and narrow: the rail, the sliding seat, the foot stretchers and the
    resistance at the head with its handle. Victorian and Great War: a wooden frame on the floor, a sliding seat on
    rails, and two oar arms with hydraulic or friction cylinders out to each side. Mid-Century: a steel frame with a
    flywheel in its guard and a chain to the handle. Modern: an air rower, its fan cage at the head, the monorail, a
    small monitor; or a water rower, its round tank of water in a wooden frame. Future Darkness: a sleek dark rower
    with a lit screen. In use: the seat slid forward."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx = (X0 + X1) // 2
    sp = .35 if c.on else .7
    if p in "VG":
        FR = ramp(mix(WOOD[2] if m % 2 == 0 else (170, 126, 76), L[2], .45), 16) if p == "V" else ramp(mix(L[2], (60, 60, 66), .15), 16)
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp(tone(FR[2], -26), 12) if p == "V" or m % 2 else ramp(mix(WOOD[2], c.alt[2], .3), 12))   # the base board
        case(d, X0 + 4, Y0 + 2, X0 + 10, Y1 - 2, FR); case(d, X1 - 10, Y0 + 2, X1 - 4, Y1 - 2, FR)          # the side rails
        for yy in (Y0 + 2, Y0 + H * .3, Y1 - 6): case(d, X0 + 4, yy, X1 - 4, yy + 4, FR)
        ay = Y0 + H * .22
        for s in (-1, 1):                                                                                    # oar arms and their cylinders
            ex = cx + s * (W // 2 - 2)
            d.line([cx + s * 4, ay, ex, ay - 18], fill=OUT, width=4); d.line([cx + s * 4, ay, ex, ay - 18], fill=STEEL[3] if p == "V" else IRON[3], width=2)
            d.rectangle([cx + s * 6 - 2, ay + 4, cx + s * 6 + 2, ay + 22], fill=L[2] if p == "G" else BRASS[2], outline=OUT)
        d.rectangle([cx - 8, Y0 + H * .3 + 6, cx + 8, Y0 + H * .3 + 12], fill=DARKWOOD[2], outline=OUT)        # foot board
    else:
        RL = STEEL if p == "M" else (ramp((60, 62, 70), 10) if m % 2 == 0 else CHROME)
        if p == "N" and m == 3:                                                                               # a water rower
            RL = WOOD
        if m in (0, 2, 4): case(d, X0, Y0 + 4, X1, Y1, ramp([(40, 40, 44), (50, 60, 90), (90, 90, 96), (60, 40, 40), (40, 60, 50), (30, 30, 34)][int(v.get("livery", 0)) % 6], 8), r=2)   # the floor mat under it
        if m in (1, 2, 4): RL = L if p != "F" else ramp(mix(L[2], (40, 44, 52), .2), 12)
        for fy in (Y0 + 30, Y1 - 8): case(d, X0 + 2, fy, X1 - 2, fy + 6, L if m != 3 else WOOD, r=2)        # the feet across
        d.rectangle([cx - 5, Y0 + 10, cx + 5, Y1 - 2], fill=RL[2], outline=OUT); d.line([cx - 3, Y0 + 12, cx - 3, Y1 - 4], fill=RL[4])   # the monorail
        hy = Y0 + 16
        if p == "M": disc(d, cx, hy, 13, L); disc(d, cx, hy, 7, IRON)                                         # flywheel guard
        elif p == "N" and m == 3: disc(d, cx, hy, 15, ramp((90, 140, 170), 14)); d.ellipse([cx - 9, hy - 9, cx + 9, hy + 9], outline=(200, 230, 240))   # the water tank
        else:
            disc(d, cx, hy, 15, L if p == "N" else ramp(mix(L[2], (40, 44, 52), .25), 12))                  # fan cage
            for k in range(8): a = k * math.pi / 4 + (.3 if c.on else 0); d.line([cx, hy, cx + math.cos(a) * 12, hy + math.sin(a) * 12], fill=L[0])
            disc(d, cx, hy, 4, STEEL)
        if p != "M": case(d, cx - 6, Y0 + 30, cx + 6, Y0 + 40, ramp((40, 40, 44), 8)); screen(d, cx - 4, Y0 + 32, cx + 4, Y0 + 38, c.on)   # monitor
        for s in (-1, 1): d.rectangle([cx + s * 10 - 5, Y0 + H * .28, cx + s * 10 + 5, Y0 + H * .28 + 12], fill=RUBBER[2], outline=OUT)   # foot stretchers
        d.rectangle([cx - 11, Y0 + 26, cx + 11, Y0 + 29], fill=RUBBER[3], outline=OUT)                         # the handle
        for s in (-1, 1): d.rectangle([cx + s * 6 - 3, Y1 - 6, cx + s * 6 + 3, Y1 - 2], fill=RUBBER[1])
    sy = Y0 + H * sp
    case(d, cx - 9, sy, cx + 9, sy + 14, RUBBER if p not in "VG" else ramp((120, 50, 40), 14) if c.rich else LINEN, r=3)   # the seat
    if c.broken: d.line([cx - 4, Y0 + H * .5, cx + 6, Y0 + H * .55], fill=OUT, width=3)
    return [(cx, Y0 + 35, 18, CYAN)] if c.on and p == "F" else []


reg("rowingmachine", rowingmachine, "victorian", "rowing machines about 2 by 7 to 8 ft (Narragansett hydraulic rowers 1900; Concept2 Model D about 2 by 8 ft; WaterRower about 7 ft)",
    states=("off", "on"), front=True, clear=2)


# ================================================================ the strategic works
def missile(tm, x, y, w, h, st, v, c):
    """A missile in its silo, seen from straight above down the shaft: the concrete collar, the steel liner rings
    stepping down into the dark, the work platforms folded back, and the missile's nose in the middle. Mid-Century:
    a liquid-fuelled missile's broad white or olive nose with its umbilical arms clamped on. Modern: a solid-fuelled
    missile, its slim shroud of warheads, in white, grey or green. Future Darkness: a dark composite nose with lit
    seams. Closed: the great sliding door drawn over on its rails."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = min(W, H) // 2 - 4
    lk = int(v.get("livery", 0)) % 6
    if m in (0, 3): case(d, X0, Y0, X1, Y1, CONC)                                                              # the silo collar: a square apron
    elif m in (1, 4): disc(d, cx, cy, min(W, H) // 2, CONC)                                                    # a round collar
    else:
        q = min(W, H) // 2; e = q * .42
        d.polygon([(cx - q + e, cy - q), (cx + q - e, cy - q), (cx + q, cy - q + e), (cx + q, cy + q - e), (cx + q - e, cy + q), (cx - q + e, cy + q), (cx - q, cy + q - e), (cx - q, cy - q + e)], fill=CONC[2], outline=OUT)
    if m in (0, 3):
        for k in range(X0 + 20, X1 - 10, 40): d.line([k, Y0 + 2, k, Y1 - 2], fill=CONC[1])
    if m >= 3: case(d, X0 + 6, Y1 - 34, X0 + 34, Y1 - 6, STEEL); d.ellipse([X0 + 12, Y1 - 28, X0 + 28, Y1 - 12], outline=STEEL[0], width=2)   # the personnel hatch
    if not c.open:
        dw = int(W * .9)
        for rx in (Y0 + 12, Y1 - 16): d.rectangle([X0 + 4, rx, X1 - 4, rx + 4], fill=STEEL[2], outline=OUT)      # rails
        case(d, cx - dw // 2, Y0 + 8, cx + dw // 2, Y1 - 8, ramp(mix((120, 120, 112), L[2], .2), 10))        # the door
        for k in range(Y0 + 30, Y1 - 20, 30): d.line([cx - dw // 2 + 4, k, cx + dw // 2 - 4, k], fill=CONC[1])
        hazard(d, cx - dw // 2 + 6, Y1 - 20, cx + dw // 2 - 6, Y1 - 13, 8)
        d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], outline=CONC[1], width=3)
        return []
    for k, rr in enumerate(range(R_, 10, -max(6, R_ // 7))):                                                      # liner rings into the dark
        t = k / 7; col = mix([(150, 152, 156), (150, 90, 70), (120, 140, 120), (200, 200, 196), (110, 116, 126), (170, 160, 130)][lk], (10, 10, 14), min(1, t))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col, outline=mix(col, (0, 0, 0), .4))
    for k in range(4):                                                                                           # folded platforms
        a = k * math.pi / 2 + .785
        d.line([cx + math.cos(a) * R_ * .55, cy + math.sin(a) * R_ * .55, cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=YEL[2], width=6)
    if p == "M": NC, nr = ([ramp((226, 226, 220), 8), ramp((96, 104, 70), 14), ramp((40, 42, 46), 8), ramp((150, 154, 156), 10), ramp((200, 196, 186), 8)][m]), int(R_ * (.46 + .04 * (m % 3)))
    elif p == "N": NC, nr = ([ramp((226, 226, 220), 8), ramp((70, 90, 70), 12), ramp((120, 124, 128), 10), ramp((60, 70, 60), 10), ramp((40, 44, 50), 10)][m]), int(R_ * (.32 + .04 * (m % 3)))
    else: NC, nr = ramp(mix(L[2], (34, 36, 44), .3), 12), int(R_ * .4)
    disc(d, cx, cy, nr, NC)                                                                                      # the nose
    disc(d, cx - nr // 5, cy - nr // 5, nr // 2, ramp(tone(NC[2], 16), 10))
    disc(d, cx - nr // 4, cy - nr // 4, max(3, nr // 6), NC)
    if p == "M":
        for a in (0, math.pi * 2 / 3, math.pi * 4 / 3):
            d.line([cx + math.cos(a) * nr, cy + math.sin(a) * nr, cx + math.cos(a) * R_ * .8, cy + math.sin(a) * R_ * .8], fill=OUT, width=7)
            d.line([cx + math.cos(a) * nr, cy + math.sin(a) * nr, cx + math.cos(a) * R_ * .8, cy + math.sin(a) * R_ * .8], fill=STEEL[3], width=3)   # umbilical arms
    if p == "F":
        for a in range(4): d.line([cx, cy, cx + math.cos(a * math.pi / 2) * nr, cy + math.sin(a * math.pi / 2) * nr], fill=GLOW[1])
    if c.broken:
        for k in range(4): d.ellipse([cx + 10 + k * 8, cy - 20 - k * 6, cx + 30 + k * 8, cy - 4 - k * 6], fill=(214, 216, 210))   # venting propellant
    return [(cx, cy, 50, (1.2, 1.0, 1.0))] if p == "F" else []


reg("missile", missile, "mid-century", "silo tubes of about 10 to 12 ft bore (Minuteman launch tubes 12 ft; Titan II silos 55 ft deep with a 10 ft missile)",
    states=("open", "closed"), front=False, clear=0, nvar=24)


def reactor(tm, x, y, w, h, st, v, c):
    """A nuclear reactor's core seen from the refuelling floor. Mid-Century: a graphite reactor's top shield, a
    great disc of steel channel caps in a close grid with the control-rod caps picked out, or a pool reactor with the
    core glowing blue under deep water. Modern: a pressurised-water reactor's vessel head with its forest of control
    rod drives and the cable trays, inside the yellow-railed cavity, or the pool with its bridge crane. Future
    Darkness: a compact sealed core with lit rings. Running: the pool's blue Cherenkov light."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = min(W, H) // 2 - 6
    case(d, X0, Y0, X1, Y1, ramp(mix((160, 158, 150), L[2], .45), 10))                                         # the refuelling floor
    for k in range(X0 + 2, X1, 7): d.line([k, Y0 + 1, k, Y0 + 5], fill=YEL[3] if (k // 7) % 2 else OUT)       # railing
    pool = m in (1, 4)
    if p == "F":
        if m % 2: case(d, cx - R_, cy - R_, cx + R_, cy + R_, ramp(mix(L[2], (40, 44, 52), .3), 12), r=R_ // 3)   # a square containment block
        else: disc(d, cx, cy, R_, ramp(mix(L[2], (40, 44, 52), .3), 12))
        for rr in (R_ * .75, R_ * .5, R_ * .25): d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=GLOW[1] if c.on else GLOW[0], width=2)
        for k in range(6 + m): a = k * 2 * math.pi / (6 + m); case(d, cx + math.cos(a) * R_ * .62 - 5, cy + math.sin(a) * R_ * .62 - 5, cx + math.cos(a) * R_ * .62 + 5, cy + math.sin(a) * R_ * .62 + 5, STEEL)
        return [(cx, cy, 160, ICE)] if c.on else []
    if pool:
        d.rectangle([X0 + 14, Y0 + 14, X1 - 14, Y1 - 14], fill=(30, 70, 110), outline=OUT)                    # the pool
        for k in range(Y0 + 20, Y1 - 20, 14): d.arc([X0 + 20, k, X1 - 20, k + 10], 200, 340, fill=(70, 120, 160))
        cr = R_ // 3
        d.rectangle([cx - cr, cy - cr, cx + cr, cy + cr], fill=(50, 120, 200) if c.on else (40, 60, 80), outline=(120, 200, 255) if c.on else OUT)   # the core under water
        for i in range(-2, 3):
            for j in range(-2, 3): d.rectangle([cx + i * cr * .4 - 2, cy + j * cr * .4 - 2, cx + i * cr * .4 + 2, cy + j * cr * .4 + 2], fill=(150, 220, 255) if c.on else (60, 80, 100))
        case(d, X0 + 4, cy + R_ * .5, X1 - 4, cy + R_ * .5 + 14, ramp(tone(L[2], 0), 14))                    # the bridge
        return [(cx, cy, 120, (.8, 1.3, 1.8))] if c.on else []
    if p == "M":
        disc(d, cx, cy, R_, ramp((150, 150, 146), 10))                                                       # the top shield
        g = 9
        for i in range(-R_ // g, R_ // g + 1):
            for j in range(-R_ // g, R_ // g + 1):
                px_, py_ = cx + i * g, cy + j * g
                if (px_ - cx) ** 2 + (py_ - cy) ** 2 < (R_ - 6) ** 2:
                    rod = (i * 3 + j * 5) % (7 + m) == 0
                    d.rectangle([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=(RED[2] if m % 2 == 0 else YEL[2]) if rod else (L[2] if m >= 2 else (180, 178, 170)), outline=mix(OUT, (100, 100, 100), .3))
        return []
    d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], fill=(26, 26, 30), outline=OUT)                            # the cavity
    disc(d, cx, cy, int(R_ * .8), ramp((150, 150, 146), 10) if m != 3 else L)                                # the vessel head
    for k in range(16): a = k * math.pi / 8; bolt(d, cx + math.cos(a) * R_ * .76, cy + math.sin(a) * R_ * .76, STEEL)
    g = 12
    for i in range(-4, 5):
        for j in range(-4, 5):
            if i * i + j * j <= 17: disc(d, cx + i * g, cy + j * g, 4, STEEL if (i + j + m) % 3 else CHROME)    # control-rod drives
    for a in (0, math.pi / 2, math.pi, -math.pi / 2):
        d.line([cx + math.cos(a) * R_ * .85, cy + math.sin(a) * R_ * .85, cx + math.cos(a) * (R_ + 4), cy + math.sin(a) * (R_ + 4)], fill=c.alt[2], width=6)   # cable trays
    trefoil(d, X1 - 16, Y1 - 16, 9)
    if c.broken:
        for k in range(5): d.ellipse([cx - 30 + k * 14, cy - 30 - k * 4, cx - 10 + k * 14, cy - 14 - k * 4], fill=(200, 200, 196))


reg("reactor", reactor, "mid-century", "reactor tops of about 12 to 16 ft across (PWR vessel heads about 14 ft; RBMK top shield and research pool reactors such as TRIGA, 6 to 8 ft cores in 20 ft pools)",
    states=("off", "on"), front=False, clear=0)


# ================================================================ the Technocracy and its rivals
def nanofab(tm, x, y, w, h, st, v, c):
    """A Technocratic nanofabricator column from above: a round sealed column on its stepped plinth, the dome of its
    assembly chamber with a viewing port, the feedstock lines and the lit rings. In the port: grey assembler slurry
    and the half-made object (a pistol, a hand, a lattice, a device). Running: the rings lit and the chamber
    glowing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = min(W, H) // 2 - 4
    if m % 2: case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, ramp(mix(L[2], (40, 44, 52), .5), 10), r=8)          # square plinth
    else: disc(d, cx, cy, R_, ramp(mix(L[2], (40, 44, 52), .5), 10))
    disc(d, cx, cy, int(R_ * .8), L)                                                                           # the column
    for k in range(4 + m):                                                                                    # feedstock lines
        a = k * 2 * math.pi / (4 + m) + .3
        d.line([cx + math.cos(a) * R_ * .8, cy + math.sin(a) * R_ * .8, cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=c.alt[1], width=4)
    ring = GLOW[1] if c.on else GLOW[0]
    d.ellipse([cx - R_ * .7, cy - R_ * .7, cx + R_ * .7, cy + R_ * .7], outline=ring, width=2)
    pr = int(R_ * .45)
    d.ellipse([cx - pr, cy - pr, cx + pr, cy + pr], fill=(110, 120, 130), outline=OUT)                        # the port
    d.ellipse([cx - pr + 3, cy - pr + 3, cx + pr - 3, cy + pr - 3], fill=(150, 156, 164) if not c.on else (180, 220, 230))
    thing = int(v.get("work", 0)) % 4                                                                         # the half-made object
    tc = (60, 62, 70)
    if thing == 0: d.rectangle([cx - 10, cy - 3, cx + 8, cy + 2], fill=tc); d.rectangle([cx + 2, cy, cx + 6, cy + 9], fill=tc)
    elif thing == 1:
        d.rectangle([cx - 6, cy - 2, cx + 6, cy + 8], fill=(200, 160, 140))
        for k in range(4): d.rectangle([cx - 6 + k * 3, cy - 10, cx - 5 + k * 3, cy - 2], fill=(200, 160, 140))
    elif thing == 2:
        for k in range(-2, 3): d.line([cx + k * 5, cy - 10, cx + k * 5, cy + 10], fill=tc); d.line([cx - 10, cy + k * 5, cx + 10, cy + k * 5], fill=tc)
    else: disc(d, cx, cy, 7, ramp((90, 140, 160), 12))
    d.line([cx - pr + 5, cy - pr + 6, cx - 2, cy - pr + 4], fill=(230, 240, 246))
    if c.broken: d.line([cx - pr, cy - pr, cx + pr, cy + pr], fill=OUT, width=2); sparks(d, cx + R_ * .7, cy)
    return [(cx, cy, 90, CYAN)] if c.on and not c.broken else []


reg("nanofab", nanofab, "future-darkness", "a Technocratic assembly column of about 6 ft on its plinth, sized after industrial vacuum deposition chambers (Applied Materials Endura, about 6 ft across)",
    states=("off", "on"), front=False, clear=2, axes={"work": [0, 1, 2, 3]})


def netchair(tm, x, y, w, h, st, v, c):
    """A neural-interface couch from above: a padded reclining couch with its head toward the west, the interface
    crown of electrodes over the headrest, the cable loom running to a rack at the foot or side, the side console
    and a drip line. The cushions in the maker's colour; the cheap ones taped and stained. Occupied: a body lying
    in it, its face under the crown, the crown and rack lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cy = (Y0 + Y1) // 2
    case(d, X0 + 4, Y0 + 6, X1 - 24, Y1 - 6, ramp((60, 62, 70), 10), r=8)                                      # the frame
    case(d, X0 + 8, Y0 + 10, X1 - 28, Y1 - 10, L, r=10)                                                        # the cushion
    for k in range(int(X0 + 30), int(X1 - 30), 18): d.line([k, Y0 + 12, k, Y1 - 12], fill=L[1])              # quilting
    hx = X0 + 18
    d.ellipse([hx - 12, cy - 12, hx + 12, cy + 12], fill=L[3], outline=OUT)                                  # the headrest
    if c.on:                                                                                                   # someone lying in it
        disc(d, hx + 2, cy, 8, ramp((176, 132, 104), 12))
        case(d, hx + 10, cy - 12, X1 - 44, cy + 12, ramp([(60, 60, 70), (110, 40, 40), (60, 80, 110)][m % 3], 12), r=6)
        for s in (-1, 1): d.line([X1 - 44, cy + s * 5, X1 - 30, cy + s * 6], fill=(50, 50, 60), width=5)
    crown = GLOW[2] if c.on else GLOW[0]
    d.arc([hx - 15, cy - 15, hx + 15, cy + 15], 100, 260, fill=STEEL[3], width=4)                              # the crown
    for k in range(5): a = math.radians(110 + k * 35); d.ellipse([hx + math.cos(a) * 15 - 2, cy + math.sin(a) * 15 - 2, hx + math.cos(a) * 15 + 2, cy + math.sin(a) * 15 + 2], fill=crown)
    rx = X1 - 20
    case(d, rx, Y0 + 2 + m * 2, X1 - 2, Y1 - 2, ramp((40, 42, 50), 10))                                         # the rack
    for k in range(Y0 + 8 + m * 2, Y1 - 6, 6): d.line([rx + 3, k, X1 - 5, k], fill=GLOW[1] if c.on and (k // 6) % 2 else (70, 74, 84))
    cable(d, [(hx - 10, cy - 8), (hx - 14, Y0 + 3), (rx + 2, Y0 + 4)], (30, 30, 36), 3)
    cable(d, [(hx - 10, cy + 8), (hx - 6, Y1 - 3), (rx + 2, Y1 - 4)], (200, 60, 50) if m % 2 else (40, 80, 160), 2)
    if m >= 3: d.line([X1 - 40, Y0 + 4, X1 - 40, cy - 6], fill=(200, 220, 230), width=2); disc(d, X1 - 40, Y0 + 5, 3, ramp((200, 220, 230), 8))   # the drip
    if c.broken: sparks(d, rx + 8, cy)
    return [(hx, cy, 30, CYAN), (rx + 9, cy, 24, CYAN)] if c.on else []


reg("netchair", netchair, "future-darkness", "a reclining couch about 6 by 2 1/2 ft with its rack, sized after dental and dialysis recliners of 70 to 75 in",
    states=("empty", "full"), front=True, clear=2)


def portalring(tm, x, y, w, h, st, v, c):
    """A Void Engineer dimensional gate from above: a great ring standing on its raised platform, the ring's
    segments and emitter nodes, the ramp up to it at the front, the power conduits snaking off, and between the
    ring's posts the threshold plate. Running: the gate open, a swirl of light across the threshold."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 - 6; R_ = min(W, H) // 2 - 6
    PL = ramp(mix(L[2], (60, 64, 74), .5), 10)
    if m % 2: case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, PL, r=10)                                                 # an octagonal or round platform
    else: disc(d, cx, cy + 6, R_ + 4, PL)
    case(d, cx - 20, Y1 - 24, cx + 20, Y1 - 2, ramp(tone(PL[2], 14), 10))                                      # the ramp
    for k in range(Y1 - 22, Y1 - 3, 4): d.line([cx - 18, k, cx + 18, k], fill=PL[1])
    tone_ = [(80, 200, 230), (180, 120, 240), (120, 240, 160), (240, 180, 90), (230, 230, 250)][m]
    if c.on:                                                                                                  # the open gate
        for k, rr in enumerate(range(R_ - 6, 4, -6)):
            col = mix(tone_, (255, 255, 255), k / 8) if k % 2 == 0 else mix(tone_, (20, 10, 40), .5)
            d.ellipse([cx - rr, cy - rr * .9, cx + rr, cy + rr * .9], fill=col)
        for k in range(6):
            a = k * math.pi / 3; d.arc([cx - R_ + 8, cy - R_ + 8, cx + R_ - 8, cy + R_ - 8], math.degrees(a), math.degrees(a) + 30, fill=(255, 255, 255), width=2)
    else:
        d.ellipse([cx - R_ + 6, cy - R_ + 6, cx + R_ - 6, cy + R_ - 6], fill=ramp((40, 44, 54), 8)[1], outline=OUT)   # the dark threshold plate
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], outline=mix(tone_, (40, 40, 50), .6))
    d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], outline=OUT, width=9)
    d.ellipse([cx - R_ + 2, cy - R_ + 2, cx + R_ - 2, cy + R_ - 2], outline=L[3], width=5)                    # the ring
    ns = 6 + 2 * (m % 2)
    for k in range(ns):
        a = k * 2 * math.pi / ns
        ex, ey = cx + math.cos(a) * (R_ - 4), cy + math.sin(a) * (R_ - 4)
        d.ellipse([ex - 5, ey - 5, ex + 5, ey + 5], fill=c.alt[2], outline=OUT)                                 # emitter nodes
        d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], fill=tone_ if c.on else (70, 74, 84))
    for s in (-1, 1): cable(d, [(cx + s * R_ * .7, cy + R_ * .7), (cx + s * R_, Y1 - 6), (X0 + 4 if s < 0 else X1 - 4, Y1 - 4)], (36, 36, 44), 4)
    if c.broken:
        d.line([cx + R_ * .5, cy - R_ * .9, cx + R_ * .8, cy - R_ * .5], fill=(20, 18, 24), width=8); sparks(d, cx + R_ * .65, cy - R_ * .7)
    return [(cx, cy, 200, tuple(1 + (t / 255) * .8 for t in tone_))] if c.on else []


reg("portalring", portalring, "future-darkness", "a gate ring of about 7 to 8 ft on its platform, sized to pass a person with gear (Void Engineer gates; a 6 1/2 ft door's clearance)",
    states=("off", "on"), front=True, clear=4)


def psychrig(tm, x, y, w, h, st, v, c):
    """A psychic test chair with its instruments, from above. Technocratic (the Progenitors and New World Order): a
    steel chair with arm and ankle straps, a crown of electrodes over the headrest wired to a console; Mid-Century a
    grey console of dials and a pen recorder; Modern an EEG cap and monitors on a cart; Future Darkness a sealed
    reclining pod with a lit scan ring. The Arcanum and the parapsychologists: a padded armchair facing a card table;
    Mid-Century the Zener cards laid out, a screen and a tally sheet; Modern a Ganzfeld chair, the red lamp, the
    headphones and a camera; Future Darkness a quiet chair ringed with sensors. Running: the instruments lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    order = v.get("order", "technocracy")
    cx, cy = X0 + W // 2 - 4, Y0 + int(H * .38)
    if order == "arcanum":
        CH = ramp([(110, 40, 40), (60, 80, 60), (130, 96, 60), (60, 60, 90), (150, 120, 90), (90, 60, 70)][int(v.get("livery", 0)) % 6], 14)
        if p == "F": CH = ramp(mix(CH[2], (50, 54, 64), .3), 12)
        if m % 2: case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, ramp([(120, 40, 40), (60, 70, 100), (110, 90, 60)][m % 3], 10))   # a rug under it
        case(d, cx - 18, cy - 20, cx + 18, cy - 10, ramp(tone(CH[2], -20), 12), r=4)                         # the chair back
        case(d, cx - 18, cy - 12, cx - 12, cy + 14, CH, r=2); case(d, cx + 12, cy - 12, cx + 18, cy + 14, CH, r=2)   # arms
        case(d, cx - 12, cy - 10, cx + 12, cy + 14, ramp(tone(CH[2], 14), 12), r=3)                           # seat
        if p == "M":
            case(d, X0 + 4, Y1 - 26, X1 - 4, Y1 - 4, [WOOD, DARKWOOD, ramp((70, 90, 70), 14), ramp((170, 130, 80), 14), WOOD][m])   # the card table
            for k in range(5): d.rectangle([X0 + 10 + k * 12, Y1 - 20, X0 + 18 + k * 12, Y1 - 10], fill=(236, 232, 220), outline=OUT); d.ellipse([X0 + 12 + k * 12, Y1 - 17, X0 + 16 + k * 12, Y1 - 13], outline=(40, 60, 140))
            d.rectangle([X1 - 22, Y1 - 30, X1 - 18, Y1 - 4], fill=DARKWOOD[2], outline=OUT)                    # the screen
        elif p == "N":
            d.ellipse([cx - 6, cy - 16, cx + 6, cy - 6], fill=(240, 240, 236), outline=OUT)                     # the halved balls over the eyes
            d.arc([cx - 9, cy - 18, cx + 9, cy - 4], 180, 360, fill=(30, 30, 34), width=3)                     # headphones
            disc(d, X1 - 12, Y0 + 10, 6, RED if c.on else ramp((90, 40, 40), 10))                              # the red lamp
            case(d, X0 + 4, Y1 - 18, X0 + 22, Y1 - 4, ramp((40, 40, 44), 8)); d.ellipse([X0 + 9, Y1 - 15, X0 + 17, Y1 - 7], fill=(60, 80, 110), outline=OUT)   # camera
        else:
            for k in range(6): a = k * math.pi / 3; disc(d, cx + math.cos(a) * 26, cy + math.sin(a) * 26, 4, GLOW if c.on else STEEL)
        if p != "N" and m % 2: disc(d, X1 - 10, Y0 + 10, 6, BRASS)                                             # a lamp
        return [(X1 - 12, Y0 + 10, 50, (1.6, .8, .8))] if c.on and p == "N" else []
    FR = STEEL if p != "F" else ramp(mix(L[2], (40, 44, 52), .3), 12)
    if p == "F":
        d.ellipse([X0 + 6, Y0 + 4, X1 - 6, Y1 - 20], fill=FR[2], outline=OUT); d.ellipse([X0 + 12, Y0 + 10, X1 - 12, Y1 - 26], fill=(40, 60, 80) if not c.on else (90, 160, 190), outline=OUT)   # the pod lid
        d.ellipse([X0 + 4, Y0 + 20, X1 - 4, Y0 + 30], outline=GLOW[2] if c.on else GLOW[0], width=2)
        case(d, X0 + 10 + (m % 3) * 6, Y1 - 18, X1 - 10, Y1 - 4, c.alt, r=3)
        if m % 2: d.rectangle([X0 + 16, Y0 + 16, X1 - 16, Y0 + 24], fill=FR[3], outline=OUT)                   # the hinged lid band
        return [(cx, cy, 50, CYAN)] if c.on else []
    case(d, cx - 16, cy - 20, cx + 16, cy - 10, FR, r=2)                                                       # the chair
    case(d, cx - 18, cy - 10, cx + 18, cy + 18, ramp(mix(c.alt[2], (90, 70, 60) if p == "M" else (60, 62, 70), .35), 12), r=3)
    for s in (-1, 1): d.rectangle([cx + s * 16 - 3, cy - 6, cx + s * 16 + 3, cy + 14], fill=FR[1], outline=OUT); d.rectangle([cx + s * 16 - 3, cy + 2, cx + s * 16 + 3, cy + 5], fill=(60, 40, 30))   # arms and straps
    hc = GLOW[2] if c.on else STEEL[3]
    d.arc([cx - 9, cy - 24, cx + 9, cy - 8], 180, 360, fill=hc, width=3)                                         # electrode crown or cap
    for k in range(4): d.point((cx - 6 + k * 4, cy - 22), fill=RED[3])
    if m >= 3:                                                                                                # a restraint board under the chair
        d.rectangle([cx - 22, cy + 18, cx + 22, cy + 24], fill=FR[1], outline=OUT)
    if p == "M":
        case(d, X0 + 4, Y1 - 24, X1 - 4, Y1 - 4, L)                                                            # the console
        for k in range(3 + m % 2): dial(d, X0 + 14 + k * 14, Y1 - 15, 5)
        d.rectangle([X1 - 22, Y1 - 22, X1 - 8, Y1 - 8], fill=(236, 232, 214), outline=OUT); d.line([X1 - 20, Y1 - 14, X1 - 16, Y1 - 18, X1 - 12, Y1 - 12, X1 - 10, Y1 - 16], fill=(40, 40, 160))
    else:
        case(d, X0 + 4, Y1 - 24, X1 - 4, Y1 - 4, ramp((200, 200, 196), 8) if m % 2 else L)                      # the cart
        for k in range(2): screen(d, X0 + 8 + k * 30, Y1 - 21, X0 + 32 + k * 30, Y1 - 8, c.on, c.broken, tint=(100, 220, 120) if k else None)
    cable(d, [(cx, cy - 22), (X1 - 6, cy - 22), (X1 - 6, Y1 - 24)], (30, 30, 36), 2)
    if c.broken: sparks(d, X1 - 6, cy)
    return []


reg("psychrig", psychrig, "mid-century", "a test chair about 2 1/2 ft square and its console or table, about 4 by 5 ft in all (Rhine's Duke laboratory card tests; Ganzfeld rooms; EEG chairs)",
    states=("off", "on"), front=True, clear=2, axes={"order": ["technocracy", "arcanum"]})


# ================================================================ the winch, the windmill and the wind turbine
ROPE = {"central": (170, 150, 104), "atlantic": (166, 146, 100), "northern": (150, 130, 90), "mediterranean": (190, 170, 120),
        "islamic": (150, 110, 70), "steppe": (210, 196, 160), "southasia": (140, 92, 54), "eastasia": (176, 160, 116),
        "seasia": (200, 176, 100), "africa": (120, 84, 56), "americas": (180, 160, 110), "oceania": (150, 110, 70), "polar": (110, 80, 60)}
# how each region built a hand windlass: the posts (trestle, stone pier, rendered pier, forked post, single post, lashed bamboo)
WPOST = {"central": "trestle", "atlantic": "trestle", "northern": "log", "mediterranean": "pier", "islamic": "render",
         "steppe": "log", "southasia": "pier", "eastasia": "single", "seasia": "bamboo", "africa": "fork", "americas": "fork",
         "oceania": "bamboo", "polar": "fork"}
ERA_K = {"D": 0, "L": 1, "R": 2, "A": 3}


def winch(tm, x, y, w, h, st, v, c):
    """A winch or capstan from above. Before the foundries each people built it from its own timber and rope: a
    horizontal drum between two posts with handspikes or a crank, on oak trestles in Central and Atlantic Europe,
    on squared logs in the north, on stone piers round the Mediterranean and in South Asia, on rendered mud-brick
    piers in the Islamic world, on one post with a single crank in East Asia (the well windlass), on lashed bamboo in
    the islands, and on forked posts elsewhere; the rope of hemp, palm fibre, coir, rawhide or walrus hide; the
    rich one bound with iron. Dark Ages: pegged timber and a few turns of rope. Long Night: iron straps on the drum
    and a pawl and ratchet. Renaissance: an iron crank with a flywheel or a geared crab. Age of Reason: a capstan with
    whelps and its iron pawl ring, or a crab winch with a cast gear. From the Victorian age the winch is made in iron
    the world over: a cast-iron crab winch with its gear train; then steam and electric winches with their motors;
    hydraulic winches and steel cable; a powered capstan with a lit ring. Working: rope paying off taut."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    if p in ERA_K:
        ek = ERA_K[p]; st_ = c.style; S = c.sty
        WD = ramp(tone(S["wood"], [14, -14, 0, -26][ek]), 16)
        RP = ramp(tone(ROPE.get(st_, (170, 150, 104)), [0, -18, 8, -6][ek]), 12)
        IRN = BRASS if c.rich and ek >= 2 else IRON
        capstan = ek == 3 and m in (1, 3) or (st_ in ("northern", "atlantic", "mediterranean") and m == 4 and ek >= 1)
        if capstan:                                                                                          # a capstan: drum standing up, bars out
            R_ = min(W, H) // 2 - 4
            for k in range(6 if ek < 3 else 8):
                a = k * 2 * math.pi / (6 if ek < 3 else 8) + .2
                d.line([cx, cy, cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=OUT, width=6); d.line([cx, cy, cx + math.cos(a) * (R_ - 1), cy + math.sin(a) * (R_ - 1)], fill=WD[3], width=3)
            disc(d, cx, cy, R_ // 2, WD); d.ellipse([cx - R_ // 2 + 4, cy - R_ // 2 + 4, cx + R_ // 2 - 4, cy + R_ // 2 - 4], outline=RP[2], width=4)
            if ek >= 3: d.ellipse([cx - R_ // 2 - 4, cy - R_ // 2 - 4, cx + R_ // 2 + 4, cy + R_ // 2 + 4], outline=IRN[2], width=3)   # pawl ring
            disc(d, cx, cy, R_ // 5, WD)
            d.line([cx, cy + R_ // 2, cx + 6, Y1], fill=RP[1], width=3)
            return []
        post = WPOST.get(st_, "trestle")
        dy0, dy1 = cy - H * (.16 if ek < 3 else .22), cy + H * (.16 if ek < 3 else .22)                    # the drum's ends, east and west
        px0, px1 = X0 + 3, X1 - 3; pw = 9
        PC = {"pier": ramp(S["stone"], 12), "render": ramp(S["render"], 10)}.get(post, WD)
        for pxx in (px0, px1 - pw):
            if post == "trestle":
                d.line([pxx + pw // 2, Y0 + 4, pxx + pw // 2, Y1 - 4], fill=OUT, width=8); d.line([pxx + pw // 2, Y0 + 5, pxx + pw // 2, Y1 - 5], fill=WD[2], width=6)   # the trestle's feet
                case(d, pxx, cy - 8, pxx + pw, cy + 8, WD)
            elif post in ("pier", "render"):
                case(d, pxx - 2, cy - 14, pxx + pw + 2, cy + 14, PC, r=2 if post == "render" else 0)
                if post == "pier": d.line([pxx, cy, pxx + pw, cy], fill=PC[1])
            elif post == "single":
                if pxx == px0: case(d, pxx, cy - 9, pxx + pw, cy + 9, WD)
                else: d.rectangle([pxx + 4, cy - 4, pxx + pw - 2, cy + 4], fill=WD[1], outline=OUT)
            elif post == "bamboo":
                for k in range(3): d.line([pxx + 1 + k * 3, cy - 16, pxx + 1 + k * 3, cy + 16], fill=OUT, width=4); d.line([pxx + 1 + k * 3, cy - 15, pxx + 1 + k * 3, cy + 15], fill=ramp((200, 180, 110), 12)[2 + k % 2], width=2)
                d.line([pxx, cy - 6, pxx + pw, cy - 6], fill=RP[1], width=2); d.line([pxx, cy + 6, pxx + pw, cy + 6], fill=RP[1], width=2)   # lashings
            elif post == "log":
                case(d, pxx - 4, Y0 + 6, pxx + pw + 4, Y1 - 6, ramp(tone(WD[2], -10), 14), r=6)
            else:                                                                                               # a forked post
                disc(d, pxx + pw // 2, cy, 9, WD); d.line([pxx + 1, cy - 12, pxx + pw - 1, cy + 12], fill=WD[0], width=2)
        dx0, dx1 = px0 + pw, px1 - pw
        case(d, dx0, dy0, dx1, dy1, WD, r=3)                                                                   # the drum
        for k in range(int(dx0) + 4, int(dx1) - 2, 4 if ek != 0 else 6):                                       # rope wound on it
            if k < dx0 + (dx1 - dx0) * [.45, .9, .7, .8][ek]: d.line([k, dy0 + 2, k + 2, dy1 - 2], fill=RP[2 + (k // 4) % 2], width=2)
        if ek >= 1:
            for k in (dx0 + 4, dx1 - 6): d.rectangle([k, dy0, k + 2, dy1], fill=IRN[2])                         # iron bands
            d.ellipse([dx1 - 12, dy0 - 3, dx1 - 2, dy1 + 3], outline=IRN[1], width=2)                             # the ratchet wheel
            d.line([dx1 - 7, dy1 + 2, dx1 - 2, Y1 - 6], fill=IRN[2], width=2)                                    # the pawl
        if ek >= 2 and post != "single":
            d.line([px1, cy, X1, cy], fill=IRN[2], width=3); d.line([X1 - 1, cy, X1 - 1, cy + 12], fill=IRN[3], width=3)   # an iron crank
            if m % 2 == 0: d.ellipse([px1 - 6, cy - 16, px1 + 2, cy + 16], outline=IRN[1], width=3)            # its flywheel
        elif post == "single":
            d.line([px0, cy, X0, cy], fill=WD[1], width=4); d.line([X0 + 1, cy, X0 + 1, cy + 16], fill=WD[3], width=4)   # the one crank
        else:
            for k in range(3): d.line([dx0 + 5 + k * (dx1 - dx0) / 3, dy0, dx0 + 2 + k * (dx1 - dx0) / 3, Y0 + 4], fill=WD[3], width=3)     # handspikes
        if ek == 3:
            for k in range(int(dx0) + 6, int(dx1) - 4, 8): d.line([k, dy0 + 1, k, dy1 - 1], fill=IRN[3], width=2)   # the iron whelps
        if ek == 3 and m == 0: disc(d, dx0 + 8, dy1 + 9, 7, IRN)                                              # a crab's cast gear
        rx = dx0 + (dx1 - dx0) * .4
        d.line([rx, dy1, rx + (6 if c.on else 0), Y1], fill=RP[1], width=3)                                     # the rope going off
        if m == 2 or (m == 3 and c.w >= 2): d.rectangle([rx - 6, Y1 - 12, rx + 6, Y1], fill=WD[2] if st_ not in ("islamic", "africa") else RP[2], outline=OUT)   # a bucket or load
        if c.broken: d.line([dx0 + 6, dy0, dx0 + 20, dy1], fill=OUT, width=3)
        return []
    # ---- made in iron the world over
    FR = L if p != "F" else ramp(mix(L[2], (40, 44, 52), .3), 12)
    if p == "F":
        R_ = min(W, H) // 2 - 4
        if m >= 3: case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp(tone(FR[2], -30), 10), r=6)                   # its deck plate
        disc(d, cx, cy, R_ - (m % 3) * 2, FR); disc(d, cx, cy, R_ - 10, ramp(tone(FR[2], 20 + 10 * (m % 2)), 10))
        for k in range(8): a = k * math.pi / 4; d.line([cx + math.cos(a) * (R_ - 12), cy + math.sin(a) * (R_ - 12), cx + math.cos(a) * (R_ - 4), cy + math.sin(a) * (R_ - 4)], fill=FR[0], width=3)   # whelps
        d.ellipse([cx - R_ + 3, cy - R_ + 3, cx + R_ - 3, cy + R_ - 3], outline=GLOW[1] if c.on else GLOW[0], width=2)
        d.line([cx, cy + R_ - 10, cx + 4 * (m - 2), Y1], fill=(60, 60, 64), width=3)
        return [(cx, cy, 40, CYAN)] if c.on else []
    for sx in (X0 + 6, X1 - 18):
        case(d, sx, Y0 + 6, sx + 12, Y1 - 6, FR, r=4)                                                          # the side frames
        if p == "V":
            for k in range(Y0 + 12, Y1 - 10, 12): d.ellipse([sx + 3, k, sx + 9, k + 6], fill=FR[0])            # cast lightening holes
    dy0, dy1 = cy - H * .14, cy + H * .14
    case(d, X0 + 18, dy0, X1 - 18, dy1, STEEL if p in "NM" else IRON)                                            # the drum
    rope = (170, 150, 104) if p in "VG" else (110, 114, 120)
    for k in range(X0 + 20, X1 - 20, 3): d.line([k, dy0 + 2, k + 1, dy1 - 2], fill=tone(rope, (k % 6) * 4 - 8))
    if p in "VG" and m >= 3: disc(d, X0 + 10, cy, 9, STEEL if c.rich else IRON)                               # a warping drum on the shaft end
    if p in "VG":
        gx, gy = X0 + 24 + 6 * (m % 2), cy + 15
        disc(d, gx, gy, 9, IRON); disc(d, gx + 12, gy + 2, 4, IRON)                                           # the big gear and pinion
        for k in range(12): a = k * math.pi / 6; d.point((gx + math.cos(a) * 8, gy + math.sin(a) * 8), fill=IRON[4])
        if p == "V" or m % 2: d.line([X1 - 6, cy + 10, X1 - 1, cy + 10], fill=IRON[2], width=3); d.line([X1 - 2, cy + 10, X1 - 2, cy + 24], fill=WOOD[3], width=4)   # crank handle
        if p == "G": case(d, X1 - 26, Y0 + 1, X1 - 4, Y0 + 15, ramp((70, 74, 86), 14)); d.ellipse([X1 - 22, Y0 + 3, X1 - 8, Y0 + 13], fill=COPPER[2] if m % 2 else IRON[2], outline=OUT)   # steam cylinder or motor
    else:
        case(d, X1 - 26 - 4 * (m % 3), cy - 16, X1 - 2, cy + 16, ramp(tone(FR[2], -16), 14), r=6)                # the motor
        louvres(d, X1 - 20, cy - 12, X1 - 6, cy + 12, FR, 3, vert=True)
        if p == "N": hazard(d, X0 + 2, Y1 - 6, X1 - 2, Y1 - 2)
        if m >= 3: case(d, X0 + 2, Y0 + 2, X0 + 20, Y0 + 16, c.alt); lamp(d, X0 + 11, Y0 + 9, (90, 220, 90), c.on, 2)   # control box
    d.line([cx, dy1, cx + (6 if c.on else 0), Y1], fill=tone(rope, -30), width=3)
    if c.broken: d.line([X0 + 22, dy0, X0 + 40, dy1], fill=OUT, width=3)
    return []


reg("winch", winch, "dark-ages", "windlasses and capstans of about 3 ft square on their posts (Agricola, De re metallica 1556; Admiralty capstans; Chatham crab winches with 2 to 3 ft frames)",
    states=("off", "on"), front=True, clear=3, glob=1837, nvar=24)


# the type of mill each people built (honest regional differences only), and how each age kept it
MILLTYPE = {"central": "post", "atlantic": "post", "northern": "post", "mediterranean": "tower", "islamic": "panemone",
            "steppe": "panemone", "southasia": "panemone", "eastasia": "matsail", "seasia": "matsail", "africa": "tower",
            "americas": "smock", "oceania": "tower", "polar": "tent"}
ERA_TINT = {"D": 12, "L": -12, "R": 6, "A": -8, "V": 10, "G": -6, "M": -16, "N": 16, "F": -22}
SAILCLOTH = ramp((214, 202, 172), 12)
PATCH = ramp((150, 120, 84), 12)


def _arm(hx, hy, th, r, f=.5):
    return hx + math.cos(th) * r, hy - math.sin(th) * r * f


def _sails(d, hx, hy, Ls, n, th0, kind, c, WD, spin=False, poor=False):
    """A windmill's sails as seen from above: arms in their upright plane, leaning back, so they show squashed.
    kind: lattice (common sails with cloth), shutter (patent sails), jib (triangular cloths), bare (stocks only)."""
    f = .5
    if spin:
        d.ellipse([hx - Ls, hy - Ls * f, hx + Ls, hy + Ls * f], outline=mix(SAILCLOTH[2], (120, 120, 120), .3), width=6)
        d.ellipse([hx - Ls * .6, hy - Ls * .6 * f, hx + Ls * .6, hy + Ls * .6 * f], outline=mix(SAILCLOTH[3], (120, 120, 120), .3), width=3)
    for k in range(n):
        th = th0 + k * 2 * math.pi / n
        if spin and k % 2: continue
        ex, ey = _arm(hx, hy, th, Ls, f)
        ws = Ls * .26 if kind != "jib" else Ls * .3
        px_, py_ = -math.sin(th) * ws, -math.cos(th) * ws * f
        if kind in ("lattice", "shutter") and not spin:
            r1 = Ls * .2; a1 = _arm(hx, hy, th, r1, f)
            quad = [a1, (ex, ey), (ex + px_, ey + py_), (a1[0] + px_, a1[1] + py_)]
            cloth = kind == "shutter" or not (c.broken and k == 1)
            if cloth:
                C_ = ramp((236, 234, 226), 8) if kind == "shutter" else (PATCH if poor and k == 2 else SAILCLOTH)
                d.polygon(quad, fill=C_[2], outline=OUT)
            else:
                d.polygon(quad, outline=WD[1])
            for t in np.linspace(.2, 1, 9 if kind == "lattice" else 12):
                q = _arm(hx, hy, th, Ls * t, f); d.line([q, (q[0] + px_, q[1] + py_)], fill=WD[1] if kind == "lattice" else (150, 150, 146))
        elif kind == "jib" and not spin:
            nxt = _arm(hx, hy, th + 2 * math.pi / n, Ls * .95, f)
            d.polygon([_arm(hx, hy, th, Ls * .15, f), (ex, ey), (ex + (nxt[0] - ex) * .45, ey + (nxt[1] - ey) * .45)], fill=SAILCLOTH[3] if not (poor and k % 3 == 0) else PATCH[2], outline=OUT)
        d.line([hx, hy, ex, ey], fill=OUT, width=5); d.line([hx, hy, ex, ey], fill=WD[3], width=3)            # the stock or whip
    disc(d, hx, hy, 6, IRON if c.per not in "DL" else WD)


def windmill(tm, x, y, w, h, st, v, c):
    """A windmill from above with its sails, which turn in an upright plane and so show squashed as they lean back
    toward the cap. Each people's own kind: in Central and Northern Europe a post mill, its weatherboarded body on
    the post with the tail pole and ladder out behind, open quarter bars in the Dark Ages and a roundhouse beneath it
    from the Renaissance; in Atlantic Europe the same, and from the Renaissance the octagonal smock mill of the Low
    Countries, white-painted later; round the Mediterranean and on the Cape the round whitewashed or rendered tower
    with a conical thatch or tile cap and many triangular jib cloths; in the Islamic world, Sistan and the borderlands
    of India the vertical-axis mill, its rotors of reed mats turning inside high mud-brick or fired-brick walls; in
    China and the islands the mat-sail mill, a ring of masts with their sails round an upright shaft driving a pallet
    pump; the settlers' smock mill in the Americas, the convicts' stone tower in Australia, and the Russian tent mill in
    the far north. The poor mill has two or three patched sails; the rich one a full set and a roundhouse. Victorian:
    patent shutter sails and a fantail. Mid-Century: derelict, its sails stripped to the stocks. Modern: restored for
    visitors behind its fence. Future Darkness: grimed and patched. Turning: the sails a blur."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    st_ = c.style; S = c.sty; kind = MILLTYPE.get(st_, "post"); et = ERA_TINT.get(p, 0)
    if kind == "post" and st_ == "atlantic" and p not in "DL" and m % 2: kind = "smock"
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    WD = ramp(tone(S["wood"], et), 16)
    derelict, restored, grim = p == "M" and m in (0, 3), p == "N", p == "F"
    spin = c.on and not c.broken and not (derelict)
    nsail = 4 if c.w >= 2 else (3 if m % 2 else 2)
    sk = "shutter" if p in "VGN" and st_ in ("central", "atlantic", "northern", "americas", "oceania") else "lattice"
    if derelict or (grim and m % 2): sk = "bare"
    th0 = (math.pi / 4 if m % 2 else 0) + (.4 if c.on else 0)
    Ls = W * .46
    MOUND = {"D": (112, 96, 70), "L": (84, 100, 64), "R": (140, 134, 120), "A": (156, 140, 108), "V": (150, 96, 76),
             "G": (70, 68, 66), "M": (100, 112, 70), "N": (96, 140, 76), "F": (52, 54, 60)}.get(p, (112, 96, 70))
    MD = ramp(MOUND, 10)
    disc(d, cx, cy, int(min(W, H) * .47), MD)                                                                   # the mill mound or apron of its age
    if p in "RA":
        for k in range(24): a = k * math.pi / 12; d.line([cx + math.cos(a) * min(W, H) * .4, cy + math.sin(a) * min(W, H) * .4, cx + math.cos(a) * min(W, H) * .46, cy + math.sin(a) * min(W, H) * .46], fill=MD[0])   # stone revetment or setts
    if p in "VN": d.line([cx, cy + H * .2, cx + W * .1, Y1 - 4], fill=MD[4] if p == "N" else ramp((176, 160, 120), 10)[2], width=12)   # the cart track or path
    Rm = min(W, H) * .47; rng_ = np.random.default_rng(7 + m)
    if p == "D":                                                                                               # earth clods on a raw mound
        for k in range(10): a = k * .63; r_ = Rm * (.55 + .35 * ((k * 7) % 5) / 5); disc(d, cx + math.cos(a) * r_, cy + math.sin(a) * r_, 6, ramp(tone(MOUND, -24), 8))
    if p in "LM":                                                                                              # grass and weeds grown over it
        for k in range(18):
            a = k * .35 + .2; r_ = Rm * (.5 + .45 * ((k * 5) % 7) / 7); gx, gy = cx + math.cos(a) * r_, cy + math.sin(a) * r_
            for t in (-4, 0, 4): d.line([gx + t, gy + 4, gx + t * 1.6, gy - 6], fill=ramp((60, 90, 50), 12)[1 + (k % 3)], width=2)
    hs = W * .2                                                                                                 # the outbuilding each age kept in a corner of the mill plot
    if p == "L":                                                                                               # a wattled grain hut with a heavy barred door, south-west
        case(d, X0 + 2, Y1 - hs, X0 + hs, Y1 - 2, ramp((150, 126, 80), 12)); d.line([X0 + 4, Y1 - hs / 2, X0 + hs - 2, Y1 - hs / 2], fill=OUT, width=2)
        d.rectangle([X0 + hs - 10, Y1 - hs * .7, X0 + hs - 2, Y1 - hs * .3], fill=IRON[2], outline=OUT)
    if p == "R":                                                                                               # a stone miller's house, north-east
        case(d, X1 - hs, Y0 + 2, X1 - 2, Y0 + hs, ramp(tone(S["roof"], 0), 12)); d.line([X1 - hs / 2, Y0 + 4, X1 - hs / 2, Y0 + hs - 2], fill=OUT, width=2)
    if p == "A":                                                                                               # the miller's cart, north-west
        case(d, X0 + 4, Y0 + 10, X0 + hs, Y0 + hs * .7, WOOD); disc(d, X0 + 4, Y0 + hs * .4, 9, WOOD); disc(d, X0 + hs, Y0 + hs * .4, 9, WOOD)
        d.line([X0 + hs, Y0 + hs * .4, X0 + hs + 30, Y0 + hs * .4], fill=WOOD[1], width=4)
    if p == "V":                                                                                               # a brick store, south-east
        case(d, X1 - hs, Y1 - hs, X1 - 2, Y1 - 2, ramp((150, 80, 60), 12)); d.line([X1 - hs + 2, Y1 - hs / 2, X1 - 4, Y1 - hs / 2], fill=OUT, width=2)
    if p == "M":                                                                                               # a fallen outbuilding's rubble, south-west
        for k in range(6): disc(d, X0 + 14 + (k % 3) * 22, Y1 - 14 - (k // 3) * 22, 10, ramp((120, 110, 100), 10))
    if p == "L":                                                                                               # a wattle hurdle fence round the mound
        d.ellipse([cx - Rm + 4, cy - Rm + 4, cx + Rm - 4, cy + Rm - 4], outline=OUT, width=8)
        d.ellipse([cx - Rm + 5, cy - Rm + 5, cx + Rm - 5, cy + Rm - 5], outline=ramp((120, 90, 56), 12)[2], width=5)
        for k in range(20): a = k * math.pi / 10; disc(d, cx + math.cos(a) * (Rm - 8), cy + math.sin(a) * (Rm - 8), 4, ramp((90, 66, 44), 10))
    if p == "A":                                                                                               # spare millstones by the door
        for k in range(2): disc(d, cx - W * .3 + k * 40, cy + H * .32, 17, ramp((170, 166, 156), 10)); disc(d, cx - W * .3 + k * 40, cy + H * .32, 4, ramp((60, 60, 60), 6))
    if p == "N":                                                                                               # the visitors' sign and benches
        case(d, cx - W * .38, cy + H * .26, cx - W * .26, cy + H * .34, ramp((70, 100, 70), 10))
        for k in range(2): case(d, cx + W * .18 + k * 30, cy + H * .32, cx + W * .18 + k * 30 + 24, cy + H * .32 + 8, WOOD)
    if p == "A":                                                                                               # a cobbled apron of setts
        for i in range(-6, 7):
            for j in range(-6, 7):
                sx_, sy_ = cx + i * Rm / 6.5, cy + j * Rm / 6.5
                if (sx_ - cx) ** 2 + (sy_ - cy) ** 2 < (Rm - 8) ** 2: d.rectangle([sx_ - 6, sy_ - 5, sx_ + 6, sy_ + 5], outline=MD[0])
    if p in "VG":                                                                                              # sacks of grain and meal waiting at the door
        for k in range(3 + (p == "G") * 2): d.rounded_rectangle([cx - W * .3 + k * 18, cy + H * .3, cx - W * .3 + k * 18 + 14, cy + H * .3 + 20], 5, fill=ramp((200, 186, 150), 10)[2], outline=OUT)
    if p == "G":                                                                                               # the engine shed added beside it
        case(d, X1 - hs, Y0 + 2, X1 - 2, Y0 + hs, ramp((110, 110, 116), 10)); d.line([X1 - hs, Y0 + hs / 2, X1 - 2, Y0 + hs / 2], fill=OUT)
        case(d, X0 + 2, Y1 - hs * .6, X0 + hs, Y1 - 2, ramp((70, 80, 60), 10), r=6)                             # a motor lorry's place
    if p == "F":                                                                                               # rubble heaps
        for k in range(5): a = k * 1.3 + .4; disc(d, cx + math.cos(a) * Rm * .78, cy + math.sin(a) * Rm * .78, 12, ramp((90, 88, 86), 10))
    if restored:                                                                                               # the visitors' fence
        for k in range(24):
            a = k * math.pi / 12; fx, fy = cx + math.cos(a) * W * .47, cy + math.sin(a) * H * .47
            d.rectangle([fx - 2, fy - 2, fx + 2, fy + 2], fill=WOOD[3], outline=OUT)
    if kind in ("post", "smock", "tent"):
        if kind == "post":
            BODY = ramp(tone((236, 232, 220) if st_ == "atlantic" and p in "AVGMNF" else (40, 36, 34) if st_ == "northern" and p != "D" else S["wood"], et), 14)
            if p in "RAVGMNF" and c.w >= 2 and not (p == "M" and m == 1):
                disc(d, cx, cy, int(W * .2), ramp(tone(S["stone"] if st_ != "northern" else S["wood"], et), 12))     # the roundhouse
                d.ellipse([cx - W * .2 + 6, cy - W * .2 + 6, cx + W * .2 - 6, cy + W * .2 - 6], outline=ramp(tone(S["roof"], et), 12)[1], width=3)
            elif p in "DL" or c.w < 2:
                for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)): d.line([cx, cy, cx + sx * W * .2, cy + sy * H * .2], fill=OUT, width=7); d.line([cx, cy, cx + sx * W * .2, cy + sy * H * .2], fill=WD[2], width=4)   # quarter bars
            bw, bd = W * .13, H * .19
            d.line([cx, cy, cx + (m - 2) * 8, Y0 + 4], fill=OUT, width=7); d.line([cx, cy, cx + (m - 2) * 8, Y0 + 4], fill=WD[3], width=4)   # the tail pole
            for k in range(6):                                                                                     # the ladder
                ly = cy - bd - 6 - k * 12; d.line([cx - 10, ly, cx + 10, ly], fill=WD[3], width=2)
            d.line([cx - 10, cy - bd - 4, cx - 10, cy - bd - 70], fill=WD[1], width=2); d.line([cx + 10, cy - bd - 4, cx + 10, cy - bd - 70], fill=WD[1], width=2)
            case(d, cx - bw, cy - bd, cx + bw, cy + bd, BODY)                                                      # the body
            RF = ramp(tone({"atlantic": (70, 74, 86), "central": tone(S["wood"], -36)}.get(st_, S["roof"]), et), 12)   # boarded or shingled roof
            d.rectangle([cx - bw + 3, cy - bd + 3, cx, cy + bd - 3], fill=RF[3]); d.rectangle([cx, cy - bd + 3, cx + bw - 3, cy + bd - 3], fill=RF[1])   # the curved roof, lit and shaded
            d.line([cx, cy - bd + 2, cx, cy + bd - 2], fill=RF[4], width=2)
            for k in range(int(cy - bd + 10), int(cy + bd - 4), 10): d.line([cx - bw + 3, k, cx + bw - 3, k], fill=RF[2])
            hx, hy = cx, cy + bd + 4
        elif kind == "smock":
            q = W * .2; e = q * .42; o = (cx, cy)
            SM = ramp(tone((40, 40, 44) if st_ == "atlantic" and p in "RA" else (200, 196, 186) if st_ == "atlantic" else (130, 126, 116), et), 12)
            d.polygon([(cx - q + e, cy - q), (cx + q - e, cy - q), (cx + q, cy - q + e), (cx + q, cy + q - e), (cx + q - e, cy + q), (cx - q + e, cy + q), (cx - q, cy + q - e), (cx - q, cy - q + e)], fill=SM[2], outline=OUT)
            for k in range(8): a = k * math.pi / 4 + math.pi / 8; d.line([cx, cy, cx + math.cos(a) * q * 1.05, cy + math.sin(a) * q * 1.05], fill=SM[1])
            case(d, cx - q * .55, cy - q * .75, cx + q * .55, cy + q * .7, ramp(tone((150, 70, 50) if st_ == "atlantic" else S["roof"], et), 12), r=int(q * .5))   # the boat cap
            if p in "AVGNF": wheel(d, cx, cy - q - 14, 13, WD, 6)                                                    # the fantail
            else: d.line([cx, cy, cx, Y0 + 6], fill=WD[3], width=4)
            hx, hy = cx, cy + q * .7 + 4
        else:                                                                                                     # the Russian tent mill
            q = W * .2; e = q * .42
            pts = [(cx - q + e, cy - q), (cx + q - e, cy - q), (cx + q, cy - q + e), (cx + q, cy + q - e), (cx + q - e, cy + q), (cx - q + e, cy + q), (cx - q, cy + q - e), (cx - q, cy - q + e)]
            TT = ramp(tone(S["wood"], et), 14)
            for k in range(8):
                d.polygon([(cx, cy), pts[k], pts[(k + 1) % 8]], fill=TT[[4, 3, 2, 1, 0, 1, 2, 3][k]], outline=OUT)        # the shingled tent, lit north-west
            case(d, cx - 16, cy + q * .3, cx + 16, cy + q * .3 + 22, ramp(tone(S["wood"], et - 20), 12))           # the turning head
            d.line([cx, cy - q, cx - 10, Y0 + 6], fill=WD[3], width=4)
            hx, hy = cx, cy + q * .3 + 24
        _sails(d, hx, hy, Ls, nsail, th0, sk, c, WD, spin, c.poor)
    elif kind == "tower":
        tr = W * .2
        TW = ramp(tone(S["render"] if st_ != "oceania" else S["stone"], et), 10)
        if st_ == "mediterranean": TW = ramp(tone((240, 238, 230), et), 8)
        disc(d, cx, cy, tr, TW)                                                                                      # the tower
        d.arc([cx - tr + 3, cy - tr + 3, cx + tr - 3, cy + tr - 3], 200, 250, fill=TW[4], width=2)
        thatched = p in "DL" or c.poor or st_ == "africa"
        CP = ramp(tone((176, 150, 96) if thatched else (190, 100, 64) if st_ == "mediterranean" else S["roof"], et), 14)
        cr = tr * .78
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=CP[2], outline=OUT)                                  # the conical cap
        for k in range(16):
            a = k * math.pi / 8; d.line([cx, cy, cx + math.cos(a) * cr, cy + math.sin(a) * cr], fill=CP[1 if k % 2 else 3])
        d.pieslice([cx - cr, cy - cr, cx + cr, cy + cr], 180, 270, fill=CP[3]); d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=CP[0])
        if st_ == "mediterranean":                                                                                 # the door and its step to the south-west
            d.rectangle([cx - tr - 6, cy + 4, cx - tr + 4, cy + 16], fill=WOOD[2], outline=OUT)
        d.line([cx, cy, cx + (m - 2) * 10, Y0 + 8], fill=OUT, width=6); d.line([cx, cy, cx + (m - 2) * 10, Y0 + 8], fill=WD[3], width=3)   # the tail pole that winds the cap
        nj = 8 if c.w >= 2 else 6
        if c.rich: nj = 12
        jk = "jib" if st_ in ("mediterranean", "africa") and sk != "bare" else sk
        _sails(d, cx, cy + cr + 4, Ls, nj if jk == "jib" else nsail, th0, jk, c, WD, spin, c.poor)
    elif kind == "panemone":                                                                                       # the vertical-axis mill of Persia
        nr = 2 if st_ == "southasia" else (3 if c.w >= 2 else 2)
        if st_ == "steppe": nr = 4 if c.w >= 2 else 3
        WL = ramp(tone(S["render"] if st_ != "southasia" else S["stone"], et), 10)
        bx0, bx1 = X0 + 4, X1 - 4; by0, by1 = cy - H * .26, cy + H * .18
        d.rectangle([bx0, by0, bx1, by1], fill=WL[1], outline=OUT)
        cwid = (bx1 - bx0) / nr; rr = min(cwid, by1 - by0) * .42
        for k in range(nr):
            rx = bx0 + cwid * (k + .5)
            d.rectangle([bx0 + cwid * k + 6, by0 + 6, bx0 + cwid * (k + 1) - 6, by1 - 6], fill=(40, 34, 32))      # the chamber
            ang = (k * .5 + (.3 if c.on else 0))
            MAT = ramp(tone((190, 160, 100) if p in "DLRAV" else (150, 140, 130) if p in "GM" else (180, 170, 140), et), 12)
            nb = 6
            for b in range(nb):
                if (derelict or c.broken) and b % 2: continue
                a = ang + b * 2 * math.pi / nb
                bx_, by_ = rx + math.cos(a) * rr, cy + math.sin(a) * rr
                pa = a + math.pi / 2
                d.polygon([(rx, cy), (bx_, by_), (bx_ + math.cos(pa) * rr * .35, by_ + math.sin(pa) * rr * .35)], fill=MAT[2] if not spin else mix(MAT[2], (60, 50, 40), .4), outline=OUT)   # reed-mat blades
            disc(d, rx, cy, 5, WD)
            if k: d.rectangle([bx0 + cwid * k - 6, by0 - 6, bx0 + cwid * k + 6, by1], fill=WL[2], outline=OUT)   # dividing walls
        d.rectangle([bx0, by0 - 14, bx1, by0], fill=WL[3], outline=OUT)                                           # the high windward wall to the north
        for k in range(int(bx0) + 10, int(bx1) - 4, 24): d.line([k, by0 - 12, k, by0 - 2], fill=WL[1])
        d.rectangle([bx0, by1, bx1, by1 + H * .14], fill=WL[2], outline=OUT)                                       # the millstone room below
        for k in range(nr): disc(d, bx0 + cwid * (k + .5), by1 + H * .07, 14, ramp((150, 146, 140), 10))
    else:                                                                                                          # the Chinese mat-sail mill
        R_ = W * .3
        FRM = ramp(tone((196, 176, 106) if st_ == "seasia" else S["wood"], et), 14)
        d.line([cx, cy, cx + 16, Y1 - 4], fill=OUT, width=12); d.line([cx, cy, cx + 16, Y1 - 4], fill=WOOD[2], width=8)   # the pallet pump trough
        for k in range(int(cy) + 10, int(Y1) - 8, 10): d.line([cx - 3 + (k - cy) * 16 / (Y1 - cy), k, cx + 3 + (k - cy) * 16 / (Y1 - cy), k], fill=WOOD[0])
        d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], outline=OUT, width=6); d.ellipse([cx - R_ + 1, cy - R_ + 1, cx + R_ - 1, cy + R_ - 1], outline=FRM[3], width=3)
        for k in range(8):
            a = k * math.pi / 4 + (.25 if c.on else 0); mx, my = cx + math.cos(a) * R_, cy + math.sin(a) * R_
            d.line([cx, cy, mx, my], fill=FRM[1], width=2)                                                         # the spokes
            if (derelict or c.broken) and k % 2: continue
            sa = a + math.pi / 2 - .5; L_ = R_ * .6; dp = 24
            MT = ramp(tone((170, 146, 96) if p not in "MNF" else (150, 136, 110), et), 12)
            d.polygon([(mx, my), (mx + math.cos(sa) * L_, my + math.sin(sa) * L_), (mx + math.cos(sa) * L_ + math.cos(a) * -dp, my + math.sin(sa) * L_ + math.sin(a) * -dp), (mx + math.cos(a) * -dp, my + math.sin(a) * -dp)], fill=MT[2], outline=OUT)   # a mat sail
            for t in (.33, .66): d.line([mx + math.cos(sa) * L_ * t, my + math.sin(sa) * L_ * t, mx + math.cos(sa) * L_ * t + math.cos(a) * -dp, my + math.sin(sa) * L_ * t + math.sin(a) * -dp], fill=MT[0])   # battens
            disc(d, mx, my, 4, FRM)                                                                                # the mast
        disc(d, cx, cy, 12, FRM)
    if grim:
        for k in range(3): d.rectangle([cx - 30 + k * 26, cy + 10 - k * 14, cx - 14 + k * 26, cy + 20 - k * 14], fill=(40, 44, 52), outline=OUT)   # patched sheeting
    if c.broken and kind in ("post", "smock", "tower", "tent"): d.line([cx - W * .3, cy + H * .2, cx - W * .1, cy + H * .1], fill=OUT, width=5)


reg("windmill", windmill, "dark-ages", "mills with sails of about 30 to 45 ft span (Mediterranean tower mills of 30 to 40 ft; Bourn and Pitstone post mills, sails about 50 ft, bodies 12 by 18 ft; Nashtifan vertical-axis mills about 25 ft long a rotor)",
    states=("off", "on"), front=True, clear=6, glob=False, nvar=10, ft=((32, 48), (32, 48)), axes={"make": list(range(5)), "livery": [0]})


def windturbine(tm, x, y, w, h, st, v, c):
    """A small wind turbine from above on its mast: the four splayed legs of the lattice tower at the corners or a
    guyed pole with its guy wires, the rotor turning in its upright plane and so seen squashed across the front,
    and the tail vane out behind. Victorian: a many-bladed wheel of wooden slats on a timber tower, a wooden tail.
    Great War: a galvanised steel fan of curved blades on a steel tower. Mid-Century: a three-bladed lighting
    plant with its streamlined generator, the long tail vane with the maker's name. Modern: a small three-bladed
    turbine in white or grey on a tilt-up pole. Future Darkness: a helical upright rotor in dark composite with lit
    bands. Turning: the rotor a blur."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    spin = c.on and not c.broken
    TWR = WOOD if p == "V" else (STEEL if p != "F" else ramp((60, 64, 74), 10))
    base = int(v.get("base", 0))                                                                              # what it stands on
    if base == 1: case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, CONC)                                               # a concrete pad
    elif base == 2: disc(d, cx, cy, min(W, H) // 2 - 1, ramp((120, 110, 96), 10))                              # a gravel ring
    elif base == 3: case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp((50, 48, 52), 8))                            # a flat roof's deck
    elif base == 4: case(d, X1 - W * .42, Y1 - H * .32, X1 - 1, Y1 - 1, WOOD if p in "VG" else ramp((150, 150, 144), 10))   # the battery shed at its foot
    if p in "VGM":                                                                                            # lattice tower legs
        for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            ex, ey = cx + sx * (W / 2 - 4), cy + sy * (H / 2 - 4)
            d.line([cx, cy, ex, ey], fill=OUT, width=5); d.line([cx, cy, ex, ey], fill=TWR[3], width=3)
            d.rectangle([ex - 3, ey - 3, ex + 3, ey + 3], fill=CONC[2], outline=OUT)
        d.rectangle([cx - W * .2, cy - H * .2, cx + W * .2, cy + H * .2], outline=TWR[1], width=2)                # a girt
    else:
        for sx, sy in ((-1, -1), (1, -1), (0, 1)): d.line([cx, cy, cx + sx * (W / 2 - 2), cy + sy * (H / 2 - 2)], fill=(150, 150, 150))   # guy wires
    if p == "F":
        R_ = W * .26
        disc(d, cx, cy, R_ + 4, ramp(mix(L[2], (40, 44, 52), .3), 12))
        for k in range(3):
            a = k * 2 * math.pi / 3 + (.5 if spin else 0) + m * .2
            d.arc([cx - R_, cy - R_, cx + R_, cy + R_], math.degrees(a), math.degrees(a) + 70, fill=L[3], width=5)   # the helical blades
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=GLOW[2] if spin else GLOW[0], outline=OUT)
        return [(cx, cy, 30, CYAN)] if spin else []
    tail = WOOD if p == "V" else (STEEL if p == "G" else L)
    d.line([cx, cy, cx, Y0 + 8], fill=OUT, width=4); d.line([cx, cy, cx, Y0 + 8], fill=TWR[3], width=2)          # the tail boom
    vw = 3 + (6 if p in "MN" else 2)                                                                          # the vane, leaned so its face shows
    d.polygon([(cx - vw, Y0 + 2), (cx + vw, Y0 + 2), (cx + vw - 2, Y0 + 28), (cx - vw + 2, Y0 + 28)], fill=tail[2], outline=OUT)
    if p in "MN": glyphs(d, cx - vw + 2, Y0 + 8, cx + vw - 2, Y0 + 10, tail[4])
    hy = cy + 8; Ls = W * (.34 + .03 * m); f = .34
    if p in "VG":
        nb = 18 if p == "V" else 12 + 2 * (m % 3)
        BL = WOOD if p == "V" else ramp((176, 180, 184), 12)
        if p == "V": BL = ramp(mix(WOOD[2], L[2], .4), 14)
        if p == "G" and m >= 3: BL = ramp(mix((176, 180, 184), L[2], .5), 12)
        if spin: d.ellipse([cx - Ls, hy - Ls * f, cx + Ls, hy + Ls * f], fill=mix(BL[2], (150, 150, 150), .4), outline=OUT)
        else:
            d.ellipse([cx - Ls, hy - Ls * f, cx + Ls, hy + Ls * f], fill=mix(BL[0], (40, 40, 40), .3), outline=OUT)
            for k in range(nb):
                th = k * 2 * math.pi / nb
                if c.broken and k % 5 == 0: continue
                a = _arm(cx, hy, th, Ls * .35, f); b = _arm(cx, hy, th, Ls * .97, f); b2 = _arm(cx, hy, th + .14, Ls * .97, f)
                d.polygon([a, b, b2], fill=BL[2 + k % 2], outline=BL[0])
        d.ellipse([cx - Ls * .35, hy - Ls * .35 * f, cx + Ls * .35, hy + Ls * .35 * f], outline=BL[1])
    else:
        BL = L if p == "N" and m != 0 else ramp((226, 228, 226), 8)
        if p == "M": BL = ramp((150, 120, 80), 14) if m % 2 else ramp((176, 180, 184), 12)
        if spin: d.ellipse([cx - Ls, hy - Ls * f, cx + Ls, hy + Ls * f], outline=mix(BL[3], (140, 140, 140), .3), width=4)
        else:
            for k in range(3):
                th = math.pi / 2 + k * 2 * math.pi / 3 + m * .3
                if c.broken and k == 1: continue
                b = _arm(cx, hy, th, Ls, f); px_, py_ = -math.sin(th) * 5, -math.cos(th) * 5 * f
                d.polygon([(cx, hy), (b[0] + px_, b[1] + py_), b], fill=BL[2], outline=OUT)
    case(d, cx - 6, hy - 22, cx + 6, hy + 2, L if p != "V" else WOOD, r=5)                                       # the generator or gear head
    disc(d, cx, hy + 3, 4, STEEL)


reg("windturbine", windturbine, "victorian", "small turbines with rotors of 6 to 12 ft over a tower of about 6 ft square at the foot (Blyth 1887; Aermotor 6 ft wheels; Jacobs 1930s plants; Bergey Excel 1)",
    states=("off", "on"), front=False, clear=2, axes={"base": [0, 1, 2, 3, 4]})
