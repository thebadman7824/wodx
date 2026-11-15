"""Machines for the library (B6349), the first half of the "machines" family: power and plant (generator, steam
engine, boiler, coal furnace, water heater, fuse box, transformer, battery bank, solar panels, air conditioner,
fans, aerials, satellite dish), the house (washing machine, dryer, mangle, dishwasher, microwave, toaster, television,
wireless, telephone, printer, switchboard), streets and services (cash machine, payphone, newspaper box, parking
meter, traffic light, fire alarm, extinguisher, petrol pump, turnstile, lift, escalator, security camera) and shops
(shopping trolley, till, checkout, steel shelving, pallet of goods).

Every one is seen from straight above with its front to the south. These are made things, sold the world over by a
few makers in each age, so they carry no people's pattern: each one is `global_from` its first year, and its looks
come from what really changes. The era gives its form (a valve wireless against a boombox, a cabinet television
against a flat screen, a glass-globed petrol pump against a modern dispenser). The make and the maker's livery give
its model and paint (cream enamel, hammertone grey, black, a maker's red). Wealth runs from a dented, rusted,
taped one with a mismatched panel to a polished one with chrome trim and its badge. Condition runs from new through
worn (faded, scuffed, stained) to broken (a crack, a smashed screen, a hanging door, sparking wires). Things that
switch on or open have their states: off and on, closed and open. Each drawing is wrapped by `_obj`, which lays the
wear on the pixels it drew and casts one short shadow south-east."""
import math

import numpy as np
from PIL import Image

from px import OUT
from library.core import define
from library.census import CENSUS, ERAS
from library.art import tone, mix, ramp, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW

PER = {"dark-ages": "A", "long-night": "A", "renaissance": "A", "age-of-reason": "A", "victorian": "V", "great-war": "G",
       "mid-century": "M", "modern": "N", "future-darkness": "F"}
AGE2ERA = {"medieval": "age-of-reason", "early modern": "age-of-reason", "1800s": "victorian", "1900s": "mid-century",
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
HAZ = ((232, 190, 30), (30, 28, 30))

# makers' liveries of each age (paint a factory really sold), chosen by the "livery" axis 0..6
LIV = {
    "A": [(40, 40, 46), (54, 82, 60), (110, 40, 40), (96, 92, 86), (140, 70, 50), (70, 60, 90), (150, 130, 90)],
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
        s.per = PER[s.era]; s.w = int(v.get("wealth", 3)); s.cond = v.get("condition", "new"); s.v = v
        s.poor, s.rich = s.w <= 1, s.w >= 4
        s.on = st in ("on", "open", "lit"); s.open = st == "open"; s.broken = s.cond == "broken"
        k = int(v.get("livery", 0)) % 7
        base = LIV[s.per][k]
        if s.poor: base = mix(base, GREY, .3)
        s.liv = ramp(base, 18)
        s.alt = ramp(LIV[s.per][(k + 3) % 7], 18)                                # a second panel's colour
        s.metal = RUST if s.w == 0 else (CHROME if s.rich else STEEL)
        s.trim = (BRASS if s.per in "AVG" else CHROME) if s.rich else (IRON if s.per in "AVG" else STEEL)
        s.make = v.get("make", 0)

    def axis(s, k, d): return s.v.get(k, d)


def _obj(fn, era0, off=4):
    """Wrap a drawing: wear and breakage on the pixels drawn, the poor one's rust, tape and dents, the rich one's
    polish, and a short shadow south-east."""
    def draw(tm, x, y, w, h, st, v):
        c = C(v, st, era0); before = np.asarray(tm.img).copy()
        glows = fn(tm, x, y, w, h, st, v, c) or []
        if v.get("hand") == "left":                                                                          # the left-handed model: controls and fittings on the other side
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
        if c.poor:                                                                            # rust blooms and dents
            for _ in range(max(2, int(m.sum() / 700))):
                px_, py_ = pick(); rr = max(2, min(7, (bx1 - bx0) // 10))
                bl = (((xx - px_) / rr) ** 2 + ((yy - py_) / (rr * .7)) ** 2 <= 1) & m
                a[bl] = a[bl] * .45 + np.array(RUST[2], np.float32) * .55
            if big > 900:                                                                     # a strip of tape over a split
                px_, py_ = bx0 + (bx1 - bx0) * .62, by0 + (by1 - by0) * .35; L = max(6, min(18, (bx1 - bx0) // 4))
                tp = (np.abs(yy - py_ - (xx - px_) * .4) <= 1.5) & (np.abs(xx - px_) <= L) & m
                a[tp] = np.array((176, 178, 172), np.float32); a[tp & (np.abs(yy - py_ - (xx - px_) * .4) <= .5)] = (204, 206, 200)
        if c.cond in ("worn", "broken"):
            a[m] = a[m] * .82 + np.array(GREY, np.float32) * .18
            for _ in range(max(3, int(m.sum() / 450))):                                       # scuffs and chips
                px_, py_ = pick(); sl = (slice(py_, py_ + 2), slice(px_, px_ + 3)); mm = m[sl]; a[sl][mm] = a[sl][mm] * .7
            px_, py_ = pick(); rr = max(3, min(8, (bx1 - bx0) // 7))
            stn = (((xx - px_) / rr) ** 2 + ((yy - py_) / (rr * .7)) ** 2 <= 1) & m
            a[stn] = a[stn] * .74 + np.array((60, 44, 28), np.float32) * .12
        if c.cond == "broken":                                                                # a crack across it
            x_, y_ = bx0 + (bx1 - bx0) * rng.uniform(.25, .6), by0 + 1
            while y_ < by1:
                nx, ny = x_ + rng.integers(-2, 3), y_ + rng.integers(1, 4)
                for t in np.linspace(0, 1, 5):
                    ix, iy = int(x_ + (nx - x_) * t), int(y_ + (ny - y_) * t)
                    if 0 <= iy < a.shape[0] and 0 <= ix + 1 < a.shape[1] and m[iy, ix]:
                        a[iy, ix] = (30, 24, 28)
                        if m[iy, ix + 1]: a[iy, ix + 1] = a[iy, ix + 1] * .6
                x_, y_ = nx, ny
        if c.rich and c.cond == "new":                                                        # polish: a few glints
            for _ in range(3):
                px_, py_ = pick(); sl = (slice(py_, py_ + 1), slice(px_, px_ + 3)); mm = m[sl]
                a[sl][mm] = np.minimum(255, a[sl][mm] * .4 + 160)
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
    if r: d.rounded_rectangle([x0, y0, x1, y1], r, fill=Cl[2], outline=out)
    else: d.rectangle([x0, y0, x1, y1], fill=Cl[2], outline=out)
    q = r // 2
    if x1 - x0 > 4 and y1 - y0 > 4:
        d.line([x0 + 1 + q, y0 + 1, x1 - 1 - q, y0 + 1], fill=Cl[4]); d.line([x0 + 1, y0 + 1 + q, x0 + 1, y1 - 1 - q], fill=Cl[3])
        d.line([x0 + 1 + q, y1 - 1, x1 - 1 - q, y1 - 1], fill=Cl[0]); d.line([x1 - 1, y0 + 1 + q, x1 - 1, y1 - 1 - q], fill=Cl[1])


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


def fanblades(d, cx, cy, r, Cl, n=3, spin=False, a0=.3, guard=None, hub=None):
    """Fan blades from above: crisp blades when still, a blurred disc when spinning; a guard of rings and spokes."""
    if spin:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mix(Cl[1], (200, 200, 200), .25))
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=mix(Cl[3], (230, 230, 230), .3))
        for k in range(n * 2):
            a = a0 + k * math.pi / n
            d.arc([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], math.degrees(a), math.degrees(a) + 25, fill=Cl[3])
    else:
        for k in range(n):
            a = a0 + k * 2 * math.pi / n; b1, b2 = a - .32, a + .32
            pts = [(cx, cy), (cx + math.cos(b1) * r * .95, cy + math.sin(b1) * r * .95), (cx + math.cos(a) * r, cy + math.sin(a) * r),
                   (cx + math.cos(b2) * r * .9, cy + math.sin(b2) * r * .9)]
            d.polygon(pts, fill=Cl[2], outline=Cl[0]); d.line([pts[0], pts[1]], fill=Cl[4])
    if guard:
        d.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], outline=guard[1], width=2)
        for rr in (r * .66, r * .33):
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=guard[2])
        for k in range(8):
            a = k * math.pi / 4; d.line([cx + math.cos(a) * r * .33, cy + math.sin(a) * r * .33, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=guard[2])
    hr = max(2, int(r * .2)); d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(hub or Cl)[1], outline=OUT); d.point((cx - 1, cy - 1), fill=(hub or Cl)[4])


def cable(d, pts, col=(34, 34, 38), w=2):
    d.line(pts, fill=OUT, width=w + 2, joint="curve"); d.line(pts, fill=col, width=w, joint="curve")


def sparks(d, x, y):
    """Sparks off a torn wire: a bright star and two flecks."""
    x, y = int(x), int(y)
    d.line([x - 3, y, x + 3, y], fill=(255, 240, 140)); d.line([x, y - 3, x, y + 3], fill=(255, 240, 140))
    d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 230))
    d.rectangle([x + 4, y - 5, x + 5, y - 4], fill=(255, 210, 80)); d.rectangle([x - 6, y + 3, x - 5, y + 4], fill=(255, 210, 80))


def smoke(d, x, y, k=3, col=(176, 176, 180)):
    """A few puffs of exhaust or steam drifting east."""
    for i in range(k):
        r = 2 + i; cx, cy = x + i * 4, y + i * 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tone(col, -i * 8)); d.arc([cx - r, cy - r, cx + r, cy + r], 180, 270, fill=tone(col, 30))


def glyphs(d, x0, y0, x1, y1, col, n=None):
    """Lettering suggested by shape only, never readable: short blocks of strokes along a line."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); H = y1 - y0
    k = x0
    while k < x1 - 2:
        L = min(x1 - k, 3 + (k * 7) % 5)
        d.rectangle([k, y0, k + L - 1, y1], fill=col); k += L + 2


def screen(d, x0, y0, x1, y1, lit, broken=False, tint=None, glare=True):
    """A screen: dark glass when off, lit with a soft picture when on; smashed glass when broken."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    P = SCREEN_ON if lit and not broken else SCREEN_OFF
    if tint and lit and not broken: P = [mix(p, tint, .35) for p in P]
    d.rectangle([x0, y0, x1, y1], fill=P[1], outline=OUT)
    if lit and not broken:
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, (y0 + y1) // 2], fill=P[2])
        d.rectangle([x0 + (x1 - x0) // 3, (y0 + y1) // 2 - 1, x0 + 2 * (x1 - x0) // 3, y1 - 2], fill=P[3])
    elif glare and x1 - x0 > 6:
        d.line([x0 + 2, y0 + 2, x0 + min(x1 - x0, y1 - y0) // 2 + 2, y0 + 2], fill=P[3])
    if broken:
        cx, cy = x0 + (x1 - x0) * .4, y0 + (y1 - y0) * .45
        for a in (0.3, 1.4, 2.5, 3.6, 4.7, 5.6):
            L = max(x1 - x0, y1 - y0) * .5
            ex, ey = cx + math.cos(a) * L, cy + math.sin(a) * L
            ex, ey = min(max(ex, x0 + 1), x1 - 1), min(max(ey, y0 + 1), y1 - 1)
            d.line([cx, cy, ex, ey], fill=(200, 210, 220))
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(220, 230, 236))


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


def warn(d, cx, cy, s=5):
    """A yellow electrical warning triangle with its black flash."""
    d.polygon([(cx, cy - s), (cx + s, cy + s - 1), (cx - s, cy + s - 1)], fill=YEL[3], outline=OUT)
    d.line([cx + 1, cy - s + 3, cx - 1, cy, cx + 1, cy, cx - 1, cy + s - 3], fill=OUT)


# ---------------------------------------------------------------- registering
_ROW = {r.id: r for r in CENSUS}


def reg(oid, fn, era0, ref, off=4, axes=None, **kw):
    """Define an object from its census row: its rooms as tags, mass-made the world over from its first year."""
    row = _ROW[oid]; tags = tuple(p.split()[0] for p in row.where.split(","))
    ya = int(row.years.partition("-")[0]); ax = {"livery": list(range(6)), "make": list(range(5)), "hand": ["right", "left"]}   # lengths 6 and 5 so the spread meets every value (variants._spread)
    ax.update(axes or {})
    kw.setdefault("nvar", 24)
    define(oid, draw=_obj(fn, era0, off), tags=tags, ref=ref, axes=ax, global_from=kw.pop("global_from", next(a for _, a, b, _n in ERAS if a <= ya <= b)), **kw)


def mk(c, n): return int(c.make) % n


# ================================================================ power and plant
def generator(tm, x, y, w, h, st, v, c):
    """A generating set from above. Great War: a hopper-cooled engine on a timber skid, its open water hopper on
    top, twin flywheels and a belt to a round dynamo. Mid-Century: a painted engine with cooling fins, a round fuel
    tank and its cap, the alternator's louvred end and a control box with a dial, on a steel skid. Modern: a tube-
    frame portable with its tank and socket panel, a suitcase inverter set, or a big diesel set in a louvred canopy.
    Future Darkness: a sealed dark unit with vents and a lit strip. Running: exhaust and a lit lamp."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 3); L = c.liv
    ex, ey = X1 - 8, Y0 + 6
    if p == "G":
        sk = WOOD if m == 0 else ramp(mix(WOOD[2], L[2], .7), 16)
        case(d, X0, Y0 + 4, X1, Y1 - 4, sk if not c.poor else ramp((110, 90, 70), 14))                     # the skid or bedplate
        for k in (Y0 + 8, Y1 - 8): d.line([X0 + 2, k, X1 - 2, k], fill=sk[0])
        if m == 1:                                                                                          # a farm lighting plant: engine and dynamo in one case
            d.ellipse([X0 + 6, Y0 + 5, X0 + W * .55, Y1 - 5], fill=L[2], outline=OUT); d.ellipse([X0 + 10, Y0 + 8, X0 + W * .5, Y1 - 8], fill=L[3])
            for k in range(4): d.line([X0 + 13 + k * 5, Y0 + 9, X0 + 13 + k * 5, Y1 - 9], fill=L[1])
            dx = X0 + W * .76; d.ellipse([dx - 10, Y0 + 7, dx + 10, Y1 - 7], fill=c.trim[2], outline=OUT)
            d.ellipse([dx - 5, Y0 + 13, dx + 5, Y1 - 13], fill=COPPER[2], outline=OUT); ex, ey = X0 + 12, Y0 + 7
        else:
            ex_ = X0 + W * .36
            case(d, X0 + 6, Y0 + 9, ex_ + 4, Y1 - 9, L, r=3)
            d.ellipse([X0 + 9, Y0 + 11, ex_, Y1 - 11], fill=L[1], outline=OUT)                                # water hopper
            d.ellipse([X0 + 12, Y0 + 14, ex_ - 3, Y1 - 14], fill=(60, 96, 120)); d.line([X0 + 14, Y0 + 15, ex_ - 7, Y0 + 15], fill=(150, 190, 210))
            for fx in (ex_ + 6, ex_ + 12): case(d, fx, Y0 + 2, fx + 3, Y1 - 2, IRON)                        # flywheels on edge
            dx = X0 + W * .72; d.ellipse([dx - 8, Y0 + 10, dx + 8, Y1 - 10], fill=c.trim[2], outline=OUT)    # the dynamo
            d.ellipse([dx - 4, Y0 + 15, dx + 4, Y1 - 15], fill=COPPER[2], outline=OUT)
            d.line([ex_ + 14, Y0 + 12, dx - 6, Y0 + 12], fill=(90, 60, 40), width=2); d.line([ex_ + 14, Y1 - 12, dx - 6, Y1 - 12], fill=(90, 60, 40), width=2)
            ex, ey = X0 + 10, Y0 + 6
        if m == 2: case(d, X1 - 10, Y0 + 2, X1 - 2, Y1 - 2, ramp((40, 40, 44), 10))                         # a switchboard slate
    elif p == "M":
        case(d, X0, Y0 + 2, X1, Y1 - 2, IRON)
        case(d, X0 + 4, Y0 + 5, X0 + W * .55, Y1 - 5, L, r=2)                                                 # engine block
        louvres(d, X0 + 7, Y0 + 8, X0 + W * .2, Y1 - 8, L, 3, vert=True)
        tx = X0 + W * .38; d.ellipse([tx - 9, Y0 + 7, tx + 9, Y1 - 7], fill=L[3], outline=OUT)            # fuel tank
        d.ellipse([tx - 3, Y0 + H // 2 - 3, tx + 3, Y0 + H // 2 + 3], fill=c.trim[3], outline=OUT)
        case(d, X0 + W * .58, Y0 + 8, X1 - 4, Y1 - 8, c.alt if m == 1 else L, r=4)                          # alternator
        louvres(d, X1 - 10, Y0 + 11, X1 - 6, Y1 - 11, L, 2, vert=True)
        case(d, X0 + W * .62, Y1 - 13, X0 + W * .82, Y1 - 4, IRON); dial(d, X0 + W * .67, Y1 - 9, 3)
        lamp(d, X0 + W * .77, Y1 - 9, (230, 70, 50), c.on, 2)
        ex, ey = X0 + W * .25, Y0 + 4
    elif p == "N":
        if m == 1:                                                                                          # suitcase inverter set
            case(d, X0 + 4, Y0 + 5, X1 - 4, Y1 - 3, L, r=8)
            d.rounded_rectangle([X0 + 16, Y0 + 9, X1 - 16, Y0 + 15], 3, fill=L[0], outline=OUT)              # carry handle
            louvres(d, X0 + 9, Y0 + 18, X0 + 18, Y1 - 8, L, 3, vert=True)
            case(d, X1 - 22, Y1 - 13, X1 - 8, Y1 - 6, ramp((50, 50, 56), 10))
            for k in (X1 - 19, X1 - 13): d.rectangle([k, Y1 - 11, k + 2, Y1 - 8], fill=(20, 20, 22))
            lamp(d, X1 - 26, Y1 - 9, (90, 220, 90), c.on, 2); ex, ey = X0 + 10, Y1 - 10
        elif m == 2:                                                                                         # diesel set in its canopy
            case(d, X0, Y0 + 1, X1, Y1 - 1, L)
            louvres(d, X0 + 4, Y0 + 5, X0 + 16, Y1 - 5, L, 3, vert=True); louvres(d, X1 - 14, Y0 + 5, X1 - 4, Y1 - 5, L, 3, vert=True)
            d.rectangle([X0 + 18, Y0 + 3, X1 - 16, Y1 - 3], outline=L[0])
            d.ellipse([X0 + W // 2 - 4, Y0 + 6, X0 + W // 2 + 4, Y0 + 14], fill=IRON[1], outline=OUT)        # exhaust stack
            d.rectangle([X0 + 22, Y1 - 10, X0 + 34, Y1 - 5], fill=c.alt[2], outline=OUT); ex, ey = X0 + W // 2, Y0 + 8
        else:                                                                                                # tube-frame portable
            fr = c.metal if c.w else RUST
            d.rounded_rectangle([X0 + 1, Y0 + 2, X1 - 1, Y1 - 2], 6, outline=OUT, width=5); d.rounded_rectangle([X0 + 2, Y0 + 3, X1 - 2, Y1 - 3], 5, outline=fr[2], width=2)
            case(d, X0 + 8, Y0 + 7, X0 + W * .62, Y1 - 12, L, r=6)                                          # fuel tank
            d.line([X0 + 12, Y0 + 10, X0 + W * .55, Y0 + 10], fill=L[4])
            d.ellipse([X0 + 13, Y0 + 11, X0 + 21, Y0 + 19], fill=(30, 30, 34), outline=OUT)                 # cap
            case(d, X0 + W * .64, Y0 + 8, X1 - 7, Y0 + 20, IRON); louvres(d, X0 + W * .66, Y0 + 10, X1 - 9, Y0 + 18, STEEL, 2)  # muffler
            case(d, X0 + 10, Y1 - 12, X1 - 10, Y1 - 5, ramp((60, 60, 66), 12))                              # socket panel
            for k in range(X0 + 16, X1 - 14, 8): d.rectangle([k, Y1 - 10, k + 3, Y1 - 7], fill=(230, 220, 200))
            lamp(d, X1 - 13, Y1 - 9, (230, 60, 40), c.on, 2); ex, ey = X1 - 10, Y0 + 12
    else:
        if m == 1:                                                                                          # a round fuel-cell drum and its inverter
            d.ellipse([X0 + 2, Y0 + 2, X0 + H - 2, Y1 - 2], fill=L[2], outline=OUT); d.ellipse([X0 + 8, Y0 + 8, X0 + H - 8, Y1 - 8], fill=L[3], outline=L[0])
            case(d, X0 + H, Y0 + 8, X1 - 2, Y1 - 6, c.alt, r=3)
        elif m == 2:                                                                                        # two stacked modules
            case(d, X0 + 2, Y0 + 3, X0 + W // 2 - 1, Y1 - 2, L, r=3); case(d, X0 + W // 2 + 1, Y0 + 3, X1 - 2, Y1 - 2, c.alt, r=3)
            louvres(d, X0 + 6, Y0 + 7, X0 + W // 2 - 5, Y1 - 8, L, 4)
        else:
            case(d, X0 + 2, Y0 + 3, X1 - 2, Y1 - 2, L, r=4)
            louvres(d, X0 + 7, Y0 + 7, X0 + W * .45, Y1 - 8, L, 3)
            d.rectangle([X0 + W * .52, Y0 + 7, X1 - 7, Y1 - 8], fill=L[1], outline=OUT)
        d.line([X0 + 5, Y1 - 4, X1 - 5, Y1 - 4], fill=GLOW[2] if c.on and not c.broken else GLOW[0], width=2)
        cable(d, [(X1 - 4, Y0 + H // 2), (X1 - 1, Y0 + H // 2 + 4)], (40, 40, 44)); ex, ey = None, None
    if c.broken:
        sparks(d, X0 + W * .7, Y1 - 6); cable(d, [(X0 + W * .7, Y1 - 6), (X0 + W * .58, Y1 - 2)], (200, 60, 40), 1)
    if c.on and ex is not None and not c.broken: smoke(d, ex, ey, 3)
    if c.on and p == "F" and not c.broken: return [(X0 + W // 2, Y1, 30, (.8, 1.2, 1.4))]


reg("generator", generator, "great-war", "portable sets of 3 by 2 ft (Honda EB and Lister D catalogues); hopper-cooled lighting sets of about 3 ft, 1910s",
    states=("off", "on"), front=True, clear=2)


def steamengine(tm, x, y, w, h, st, v, c):
    """A stationary steam engine from above. Age of Reason: a beam engine, its great rocking beam over the round
    cylinder, the parallel motion, the connecting rod and the flywheel turning in its pit. Victorian to Mid-Century:
    a horizontal mill engine, its lagged cylinder, the piston rod through the crosshead guides, the crank, the
    flyball governor and the huge flywheel in its pit; a twin engine on the rich; enamelled and lined out with brass
    when kept, rusted and patched when not. Running: the flywheel's blur and wisps of steam."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; L = c.liv; m = mk(c, 5)
    FL = [CONC, ramp((150, 70, 52), 14), ramp((214, 210, 200), 10), ramp((140, 84, 60), 12), WOOD][m if m < 5 else 0]
    case(d, X0, Y0, X1, Y1, FL)                                                                              # the engine-house floor
    if m in (1, 2, 3):
        for k in range(Y0 + 10, Y1 - 2, 10): d.line([X0 + 2, k, X1 - 2, k], fill=FL[1])
        for k in range(X0 + 10 + (5 if m == 3 else 0), X1 - 2, 10 if m != 3 else 20): d.line([k, Y0 + 2, k, Y1 - 2], fill=FL[1])
    else:
        for k in range(X0 + 12, X1 - 4, 24 if m == 0 else 8): d.line([k, Y0 + 2, k, Y1 - 2], fill=FL[1])
    case(d, X0 + 4, Y0 + H * .2, X1 - 4, Y1 - H * .2, ramp(mix(L[2], (60, 60, 66), .55), 14))                 # the bedplate
    fx = X0 + int(W * .74)                                                                                   # flywheel pit
    d.rectangle([fx - 10, Y0 + 3, fx + 10, Y1 - 3], fill=(26, 24, 26), outline=OUT)
    rim = c.metal if c.w else RUST
    case(d, fx - 6, Y0 + 5, fx + 6, Y1 - 5, rim)
    if c.on and not c.broken:
        for k in range(Y0 + 8, Y1 - 8, 5): d.line([fx - 5, k, fx + 5, k + 2], fill=rim[4])
    else:
        for k in range(Y0 + 14, Y1 - 10, 22): d.rectangle([fx - 5, k, fx + 5, k + 3], fill=rim[0])
    shy = Y0 + H // 2                                                                                         # crankshaft
    d.rectangle([fx - 18, shy - 3, X1 - 6, shy + 3], fill=STEEL[2], outline=OUT)
    d.rectangle([X1 - 14, shy - 9, X1 - 4, shy + 9], fill=IRON[2], outline=OUT)                            # outer bearing
    if p == "A":
        d.ellipse([X0 + 10, shy - 22, X0 + 54, shy + 22], fill=(150, 80, 50) if c.rich else tone(L[2], 30), outline=OUT); d.ellipse([X0 + 16, shy - 16, X0 + 48, shy + 16], fill=tone(L[3], 30), outline=L[0])
        d.rectangle([X0 + 4, shy - 6 - 2 * (m % 2), fx - 16, shy + 6 + 2 * (m % 2)], fill=DARKWOOD[2] if m % 2 == 0 else L[1], outline=OUT)   # the beam
        d.line([X0 + 6, shy - 4, fx - 18, shy - 4], fill=DARKWOOD[4] if not c.rich else IRON[4])
        d.ellipse([X0 + W * .38 - 6, shy - 6, X0 + W * .38 + 6, shy + 6], fill=c.trim[3], outline=OUT)        # the pivot
        d.line([fx - 18, shy, fx - 4, shy], fill=STEEL[1], width=4)
        for k in (shy - 30, shy + 22): d.rectangle([X0 + W * .3, k, X0 + W * .46, k + 8], fill=DARKWOOD[1], outline=OUT)   # beam columns
    elif p == "G":                                                                                          # an enclosed high-speed engine driving a dynamo
        ex1 = X0 + int(W * .46); nc = 2 + m % 2
        case(d, X0 + 10, Y0 + 14, ex1, Y1 - 14, ramp(tone(L[2], 24), 18), r=4)                               # the crankcase
        for k in range(nc):
            ccx = X0 + 10 + (ex1 - X0 - 10) * (k + .5) / nc
            d.ellipse([ccx - 13, shy - 13, ccx + 13, shy + 13], fill=tone(L[3], 24), outline=OUT); d.ellipse([ccx - 7, shy - 7, ccx + 7, shy + 7], fill=c.trim[2], outline=OUT)
            for q in range(6): a_ = q * math.pi / 3; bolt(d, ccx + math.cos(a_) * 10, shy + math.sin(a_) * 10, c.trim)
        d.rectangle([ex1, shy - 4, X0 + W * .56, shy + 4], fill=STEEL[2], outline=OUT)
        dx0, dx1 = X0 + int(W * .56), X1 - 16                                                                 # the dynamo
        case(d, dx0, Y0 + 12, dx1, Y1 - 12, ramp((70, 76, 90), 14) if m < 4 else ramp((60, 90, 70), 14), r=10)
        d.rectangle([dx0 + 6, Y0 + 20, dx0 + 18, Y1 - 20], fill=COPPER[2], outline=OUT)
        for k in range(Y0 + 22, Y1 - 20, 3): d.line([dx0 + 7, k, dx0 + 17, k], fill=COPPER[0])
        for k in (Y0 + 24, Y1 - 28): d.rectangle([dx0 + 2, k, dx0 + 22, k + 4], fill=BRASS[3], outline=OUT)   # brush gear
        cable(d, [(dx1 - 8, Y1 - 13), (dx1 - 4, Y1 - 4), (X1 - 4, Y1 - 4)], (40, 40, 44), 3)
        d.line([X0 + 20, Y1 - 4, X0 + 20, Y1 - 12, X0 + 60, Y1 - 12], fill=COPPER[1] if c.w > 1 else IRON[2], width=4)
    else:
        cx1 = X0 + int(W * .34)
        for yy, on in ((shy, True), (shy - 34, m in (1, 3) or c.w == 5)):
            if not on or yy - 16 < Y0: continue
            case(d, X0 + 8, yy - 15, cx1, yy + 15, ramp((150, 80, 50), 16) if c.rich else ramp(tone(L[2], 30), 18), r=5)                                      # the lagged cylinder
            for k in range(X0 + 14, cx1 - 4, 9): d.line([k, yy - 13, k, yy + 13], fill=c.trim[1 if not c.rich else 3])
            d.ellipse([X0 + 14, yy - 22, X0 + 26, yy - 12], fill=c.trim[2], outline=OUT)                    # valve chest top
            d.rectangle([cx1, yy - 2, cx1 + 40, yy + 2], fill=CHROME[3] if c.w else STEEL[2], outline=OUT)   # piston rod
            d.rectangle([cx1 + 10, yy - 9, cx1 + 44, yy - 6], fill=IRON[3]); d.rectangle([cx1 + 10, yy + 6, cx1 + 44, yy + 9], fill=IRON[3])   # guides
            d.rectangle([cx1 + 36, yy - 5, cx1 + 46, yy + 5], fill=c.trim[2], outline=OUT)                 # crosshead
            d.line([cx1 + 46, yy, fx - 18, shy], fill=STEEL[1], width=5); d.line([cx1 + 46, yy - 1, fx - 18, shy - 1], fill=STEEL[3], width=1)
        gx = X0 + int(W * .5); gy = Y1 - 18                                                                    # governor
        d.line([gx - 9, gy, gx + 9, gy], fill=c.trim[1], width=2)
        for k in (gx - 9, gx + 9): d.ellipse([k - 4, gy - 4, k + 4, gy + 4], fill=c.trim[3], outline=OUT)
        d.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=IRON[2])
        d.line([X0 + 20, Y1 - 4, X0 + 20, Y1 - 14, X0 + 50, Y1 - 14], fill=COPPER[1] if c.w > 1 else IRON[2], width=4)   # steam pipe
    if c.broken: d.line([fx - 8, Y0 + 30, fx + 8, Y0 + 44], fill=OUT, width=3); d.rectangle([fx + 12, Y1 - 22, fx + 18, Y1 - 12], fill=rim[1], outline=OUT)
    if c.on and not c.broken: smoke(d, X0 + 22, Y0 + 12, 3, (226, 228, 232))


reg("steamengine", steamengine, "age-of-reason", "mill and pumping engines of 10 to 12 ft by 6 ft with a 6 to 8 ft flywheel in its pit (Science Museum mill engines)",
    states=("off", "on"), front=True, clear=3)


def firedoor(d, x0, y0, x1, y1, lit, Cl=IRON):
    """A fire door seen edge-on at the front of a firebox, with the glow of the fire through its draught slots."""
    d.rectangle([x0, y0, x1, y1], fill=Cl[1], outline=OUT)
    for k in range(int(x0) + 3, int(x1) - 2, 4):
        d.line([k, y0 + 1, k + 1, y0 + 1], fill=(250, 150, 50) if lit else Cl[0])
    if lit: d.rectangle([x0 + 2, y1 - 1, x1 - 2, y1], fill=(255, 190, 80))


def coalheap(d, x, y, r=8):
    for dx, dy, rr in ((0, 0, r), (-r * .6, r * .3, r * .7), (r * .6, r * .4, r * .6)):
        d.ellipse([x + dx - rr, y + dy - rr * .7, x + dx + rr, y + dy + rr * .7], fill=(34, 32, 36), outline=OUT)
    for dx, dy in ((-2, -2), (3, 0), (-4, 3), (1, 3)): d.rectangle([x + dx, y + dy, x + dx + 1, y + dy], fill=(96, 96, 108))


def boiler(tm, x, y, w, h, st, v, c):
    """A heating or works boiler from above. Victorian and Great War: a vertical boiler, its riveted round shell, the
    uptake in the middle, a brass safety valve and the fire door with coal by it; or a horizontal shell set in
    brickwork with its two flue doors. Mid-Century: a cast-iron sectional boiler, its sections and oil burner, gauge
    and pipes. Modern: a steel cabinet with its flue, a manifold of red and blue valved pipes, the pump and a round red
    expansion vessel. Future Darkness: a sealed unit with a lit seam. Firing: the fire's glow at the door."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lit = c.on and not c.broken; glows = []
    if p == "G":                                                                                            # a cast-iron sectional boiler, hand-fired
        if m == 2:                                                                                          # the round sectional kind
            cx, cy, r = X0 + W * .4, Y0 + H * .42, H * .38
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT)
            for rr in (r * .75, r * .5): d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=L[0])
        else:
            case(d, X0 + 8, Y0 + 4, X1 - 22, Y1 - 12, L, r=3)
            for k in range(X0 + 16, X1 - 24, 8 + m % 3): d.line([k, Y0 + 6, k, Y1 - 14], fill=L[0]); d.line([k + 1, Y0 + 6, k + 1, Y1 - 14], fill=L[3])
        if m == 3: case(d, X0 + 2, Y0 + 2, X0 + 30, Y0 + 40, COPPER, r=12)                                  # its hot-water cylinder
        if m == 4: case(d, X0 + 20, Y0 + 8, X0 + 56, Y0 + 30, c.alt, r=2); d.rectangle([X0 + 24, Y0 + 12, X0 + 52, Y0 + 26], fill=(30, 30, 34))   # coke magazine
        d.ellipse([X0 + W * .35, Y0 + 8, X0 + W * .35 + 14, Y0 + 22], fill=IRON[1], outline=OUT)            # smoke outlet
        firedoor(d, X0 + W * .3, Y1 - 14, X0 + W * .55, Y1 - 6, lit, c.trim if c.rich else IRON)
        dial(d, X1 - 30, Y0 + 12, 5, rim=c.trim[1]); coalheap(d, X1 - 12, Y1 - 12, 9)
        d.line([X1 - 20, Y0 + 2, X1 - 20, Y1 - 24], fill=IRON[2] if c.w < 3 else COPPER[2], width=6)
        if lit: glows.append((X0 + W * .42, Y1 - 4, 30, (1.6, 1.0, .5)))
    elif p == "V":
        if m % 2 == 0:                                                                                      # vertical boiler
            cx, cy, r = X0 + W * .42, Y0 + H * .45, min(W, H) * .42
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=L[3])
            for k in range(16):
                a = k * math.pi / 8; bolt(d, cx + math.cos(a) * (r - 5), cy + math.sin(a) * (r - 5), c.trim)
            d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=IRON[1], outline=OUT); d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(20, 18, 20))
            d.ellipse([cx + 10, cy - r + 6, cx + 18, cy - r + 14], fill=BRASS[3] if c.w > 1 else IRON[3], outline=OUT)   # safety valve
            firedoor(d, cx - 10, Y1 - 10, cx + 10, Y1 - 4, lit); fy = Y1 - 6; fx = cx
        else:                                                                                               # shell set in brickwork
            BR = ramp((150, 72, 54), 14); case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, BR)
            for k in range(Y0 + 7, Y1 - 3, 6): d.line([X0 + 3, k, X1 - 3, k], fill=BR[1])
            case(d, X0 + 10, Y0 + 8, X1 - 10, Y1 - 12, L, r=12)
            for k in range(X0 + 18, X1 - 12, 12): d.line([k, Y0 + 9, k, Y1 - 13], fill=L[1])
            for fx_ in (X0 + W * .32, X0 + W * .68): firedoor(d, fx_ - 9, Y1 - 10, fx_ + 9, Y1 - 4, lit)
            d.ellipse([X0 + W // 2 - 5, Y0 + 12, X0 + W // 2 + 5, Y0 + 22], fill=BRASS[3] if c.w > 1 else IRON[3], outline=OUT)
            fx, fy = X0 + W // 2, Y1 - 6
        coalheap(d, X1 - 14, Y1 - 12, 9)
        if lit: glows.append((fx, fy + 4, 34, (1.6, 1.0, .5)))
    elif p == "M":
        case(d, X0 + 6, Y0 + 6, X1 - 18, Y1 - 10, L)
        for k in range(X0 + 14, X1 - 20, 9): d.line([k, Y0 + 8, k, Y1 - 12], fill=L[0]); d.line([k + 1, Y0 + 8, k + 1, Y1 - 12], fill=L[3])
        case(d, X0 + W * .3, Y1 - 14, X0 + W * .55, Y1 - 2, c.alt if m != 2 else IRON, r=3)                 # the burner
        dial(d, X1 - 26, Y0 + 14, 5)
        d.line([X0 + 20, Y0 + 2, X0 + 20, Y0 + 8], fill=COPPER[2], width=5); d.line([X1 - 12, Y0 + 2, X1 - 12, Y1 - 12], fill=IRON[2], width=6)
        d.ellipse([X1 - 17, Y0 + 2, X1 - 7, Y0 + 12], fill=IRON[1], outline=OUT)                            # flue
        if m in (1, 3): d.ellipse([X1 - 18, Y1 - 22, X1 - 4, Y1 - 8], fill=RED[2], outline=OUT)
        if m == 4: case(d, X0 + 2, Y0 + 2, X0 + 30, Y0 + 26, ramp((90, 100, 80), 14), r=10)                    # its oil tank
        if m == 2: case(d, X0 + 6, Y1 - 9, X0 + 26, Y1 - 2, CONC)
        if lit: d.rectangle([X0 + W * .36, Y1 - 10, X0 + W * .48, Y1 - 6], fill=(255, 170, 60)); glows.append((X0 + W * .42, Y1, 24, (1.5, 1.05, .6)))
    elif p == "N":
        bx1 = X0 + W * (.55 if m % 2 else .7)
        case(d, X0 + 4, Y0 + 4, bx1, Y1 - 6, L, r=2)
        d.ellipse([X0 + 10, Y0 + 8, X0 + 22, Y0 + 20], fill=STEEL[3], outline=OUT); d.ellipse([X0 + 13, Y0 + 11, X0 + 19, Y0 + 17], fill=(30, 30, 34))
        d.rectangle([X0 + 10, Y1 - 16, bx1 - 8, Y1 - 10], fill=(40, 42, 48), outline=OUT)                 # control strip
        lamp(d, bx1 - 14, Y1 - 13, (60, 160, 240) if lit else (230, 70, 40), lit or c.broken, 2)
        for k, col in enumerate(((200, 50, 40), (50, 90, 200), (200, 50, 40), (50, 90, 200))):              # flow and return
            px_ = X0 + 12 + k * 10; d.line([px_, Y1 - 6, px_, Y1 - 1], fill=COPPER[2], width=4); d.rectangle([px_ - 3, Y1 - 4, px_ + 3, Y1 - 2], fill=col)
        d.ellipse([bx1 + 4, Y0 + 6, bx1 + 4 + 24, Y0 + 30], fill=RED[2] if m != 4 else WHITE[2], outline=OUT)   # expansion vessel
        d.ellipse([bx1 + 10, Y0 + 12, bx1 + 18, Y0 + 20], fill=RED[3] if m != 4 else WHITE[3])
        if m % 2: case(d, bx1 + 2, Y0 + 36, X1 - 4, Y1 - 6, WHITE, r=10)                                   # hot-water cylinder
        d.line([bx1, Y1 - 20, X1 - 4, Y1 - 20], fill=COPPER[2], width=3)
    else:
        case(d, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, L, r=6)
        if m % 2: case(d, X0 + 14, Y0 + 14, X1 - 14, Y1 - 14, c.alt, r=4)
        d.rounded_rectangle([X0 + 12, Y1 - 12, X1 - 12, Y1 - 9], 1, fill=GLOW[2] if lit else GLOW[0])
        for k in range(X0 + 16, X1 - 16, 14 + 4 * m): d.ellipse([k, Y0 + 2, k + 8, Y0 + 10], fill=COMPOSITE[1], outline=OUT)
        if m in (2, 4): cable(d, [(X0 + 8, Y0 + 20), (X0 + 2, Y0 + 30), (X0 + 4, Y1 - 4)], (190, 180, 160), 3)
    if c.broken:
        d.line([X0 + 6, Y1 - 3, X0 + 30, Y1 - 3], fill=(70, 110, 140), width=3)                             # a leak across the floor
        d.ellipse([X0 + 2, Y1 - 6, X0 + 20, Y1], fill=(80, 120, 150))
    return glows


reg("boiler", boiler, "victorian", "vertical and sectional heating boilers of 4 to 6 ft by 3 to 4 ft with their pipework (Cochran and Ideal catalogues)",
    states=("off", "on"), front=True, clear=3, mount="wall")


def coalfurnace(tm, x, y, w, h, st, v, c):
    """A gravity warm-air furnace from above, the 'octopus': its round jacket in the middle, the big round ducts
    reaching out from its crown to the rooms above, the fire door and ash door at the front and a heap of coal with
    its shovel. The jacket is cast iron, black or a maker's green, grey or brown; the ducts galvanised, taped with
    asbestos cloth at the joints."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; m = mk(c, 5); L = c.liv
    cx, cy, r = X0 + W * .46, Y0 + H * .46, W * .3; lit = c.on and not c.broken
    duct = STEEL if c.w > 1 else ramp((140, 140, 130), 12); n = 4 + m
    if c.per == "V": n = 2 + m % 2
    if m % 2 or c.per == "V":                                                                               # set in a brick casing
        BR = ramp((150, 72, 54), 14) if c.per != "V" or m % 2 else ramp((170, 150, 120), 12)
        case(d, cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8, BR) if c.per != "V" else case(d, X0 + 4, Y0 + 14, X1 - 4, Y1 - 14, BR)
        if c.per != "V":
            for k in range(int(cy - r - 4), int(cy + r + 8), 5): d.line([cx - r - 7, k, cx + r + 7, k], fill=BR[1])
    for k in range(n):
        a = -math.pi / 2 + (k - (n - 1) / 2) * (math.pi * 1.25 / max(1, n - 1)) if n > 1 else -math.pi / 2
        ex_, ey_ = cx + math.cos(a) * W * .5, cy + math.sin(a) * H * .5
        ex_, ey_ = min(max(ex_, X0 + 6), X1 - 6), min(max(ey_, Y0 + 6), Y1 - 6)
        d.line([cx, cy, ex_, ey_], fill=OUT, width=11); d.line([cx, cy, ex_, ey_], fill=duct[2], width=8)
        d.line([cx + 1, cy - 2, ex_ + 1, ey_ - 2], fill=duct[4], width=1)
        mx, my = (cx + ex_) / 2, (cy + ey_) / 2; d.ellipse([mx - 4, my - 4, mx + 4, my + 4], fill=(214, 206, 186))   # taped joint
        d.ellipse([ex_ - 5, ey_ - 5, ex_ + 5, ey_ + 5], fill=duct[1], outline=OUT)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=L[3], width=2)
    d.ellipse([cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45], fill=L[3], outline=L[0])
    if c.rich: d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], outline=BRASS[3])
    firedoor(d, cx - 9, cy + r - 2, cx + 9, cy + r + 4, lit); d.rectangle([cx - 7, cy + r + 6, cx + 7, cy + r + 9], fill=IRON[1], outline=OUT)
    coalheap(d, X1 - 13, Y1 - 10, 9)
    d.line([X0 + 8, Y1 - 6, X0 + 24, Y1 - 12], fill=WOOD[1], width=2); d.polygon([(X0 + 22, Y1 - 15), (X0 + 30, Y1 - 13), (X0 + 27, Y1 - 7), (X0 + 20, Y1 - 9)], fill=IRON[3], outline=OUT)
    if c.broken: smoke(d, cx + 4, cy - r - 2, 3, (90, 88, 86))
    if lit: return [(cx, cy + r + 6, 30, (1.6, 1.0, .5))]


reg("coalfurnace", coalfurnace, "victorian", "gravity 'octopus' furnaces with jackets of 3 to 4 ft and ducts out to 4 ft (Sears and Williamson catalogues, 1910s to 1950s)",
    states=("off", "on"), front=True, clear=4)


def waterheater(tm, x, y, w, h, st, v, c):
    """A water heater from above, on its wall. Victorian and Great War: a copper bath geyser, its domed top and
    the flue rising from it, the gas tap and swivel spout. Mid-Century and Modern: a round enamelled storage tank
    with its flue hood, the gas control and its pipes, or an electric tank with its thermostat cover; a slim
    tankless box late on. Future Darkness: a sealed slab with a lit gauge. On: the burner's glow or the lamp."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy, r = X0 + W / 2, Y0 + H / 2 - 1, min(W, H) / 2 - 2; lit = c.on and not c.broken
    if p == "V":
        Cu = COPPER if c.w > 1 else ramp((110, 120, 100), 14)                                              # verdigris on the poor one
        Cu = [Cu, CHROME, Cu, BRASS, L][m]                                                                  # copper, nickel, brass or enamel
        d.rectangle([X0 + 1, Y0, X1 - 1, Y0 + 7 + 3 * (m % 3)], fill=L[2], outline=OUT)                    # its painted backboard
        if m == 2: case(d, X0 + 3, Y0 + 2, X1 - 3, Y1 - 2, L, r=3)                                        # its cabinet
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Cu[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 5, cy + r - 5], fill=Cu[3])
        d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 200, 280, fill=Cu[4], width=2)
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=IRON[1], outline=OUT)
        d.line([cx + r - 4, cy + 2, cx + r + 1, Y1 - 1], fill=BRASS[2], width=2)                            # the swivel spout
        d.ellipse([X0 + 1, Y1 - 6, X0 + 7, Y1], fill=BRASS[3], outline=OUT)
        if lit: d.arc([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], 20, 160, fill=(255, 170, 60), width=2)
        if c.w >= 4: d.ellipse([cx - r + 7, cy - r + 7, cx - r + 12, cy - r + 12], fill=BRASS[4])
    elif p in "GMN" and m != 4:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 3, cy + r - 3], outline=L[3])
        if m % 2 == 0:                                                                                      # gas: the flue hood
            d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=STEEL[2], outline=OUT); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(30, 30, 34))
            d.rectangle([cx - 4, Y1 - 6, cx + 4, Y1 - 1], fill=(60, 60, 64), outline=OUT); lamp(d, cx + 7, Y1 - 4, (255, 140, 50), lit, 1)
        else:                                                                                               # electric: the thermostat box
            d.rectangle([cx - 5, cy - 3, cx + 5, cy + 3], fill=L[0], outline=OUT); lamp(d, cx, cy + 7, (240, 80, 50), lit, 2)
        for k, col in ((-6, (60, 90, 200)), (6, (200, 50, 40))): d.line([cx + k, Y0 - 1, cx + k, cy - r + 3], fill=COPPER[2], width=3); d.point((cx + k, Y0 + 1), fill=col)
    elif p in "GMN":                                                                                        # tankless box
        case(d, X0 + 6, Y0 + 3, X1 - 6, Y1 - 3, L, r=2); d.rectangle([cx - 5, cy + 2, cx + 5, cy + 7], fill=(30, 40, 40), outline=OUT)
        if lit: d.rectangle([cx - 3, cy + 4, cx + 2, cy + 5], fill=(110, 230, 160))
        for k in (-6, 0, 6): d.line([cx + k, Y1 - 3, cx + k, Y1], fill=COPPER[2], width=2)
    else:
        if m >= 3:                                                                                          # a round heat-pump cylinder
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=c.alt[2] if m == 4 else L[1], outline=OUT)
        else:
            case(d, X0 + 4, Y0 + 3, X1 - 4, Y1 - 3, L, r=5); d.rounded_rectangle([X0 + 8, Y0 + 7 + 3 * m, X1 - 8, Y1 - 7], 3, fill=c.alt[1], outline=OUT)
        d.line([X0 + 10, Y1 - 10, X0 + 10 + (W - 20) * (.3 + .15 * m), Y1 - 10], fill=GLOW[2] if lit else GLOW[0], width=2)
    if c.broken: d.ellipse([X0 + 2, Y1 - 5, X0 + 16, Y1 + 1], fill=(80, 120, 150))


reg("waterheater", waterheater, "victorian", "bath geysers of about 18 in across and storage tanks of 18 to 24 in (Ewart geysers; Rheem tanks)",
    states=("off", "on"), front=True, clear=2, mount="wall")


def fusebox(tm, x, y, w, h, st, v, c):
    """A fuse board or breaker panel on its wall, from above: a shallow box with its conduits running up into the
    wall. Victorian: a varnished board with porcelain fuse carriers and a knife switch's handle standing out.
    Great War and Mid-Century: a steel box with its big side lever. Modern: a grey or white consumer unit, its lid
    swung open on its rows of breakers. Future Darkness: a dark panel with a lit seam. Open: the door swung out;
    broken: hanging wires and sparks."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    opn = c.open
    for k in range(X0 + 4, X1 - 2, 6 - m % 2): d.line([k, Y0 - 1, k, Y0 + 2], fill=IRON[2] if p in "VG" else STEEL[1], width=2)   # conduits
    body = [WOOD, DARKWOOD, ramp((50, 52, 58), 12), ramp((214, 210, 200), 10), L][m] if p in "VF" else L
    if p == "F": body = L
    case(d, X0, Y0 + 1, X1, Y1, body)
    if opn:                                                                                                 # the door swung out, the fuses in their row
        d.rectangle([X0 + 2, Y0 + 3, X1 - 2, Y1 - 2], fill=(30, 30, 34))
        for i, k in enumerate(range(X0 + 3, X1 - 3, 3)):
            d.rectangle([k, Y0 + 3, k + 1, Y1 - 3], fill=(236, 230, 214) if p in "VG" else ((60, 60, 64) if i % 4 else (220, 60, 50)))
        d.line([X0, Y1, X0 - 2, Y1 + W * .8], fill=OUT, width=4); d.line([X0, Y1, X0 - 2, Y1 + W * .8], fill=body[2], width=2)
    elif p == "V":
        for k in range(X0 + 4, X1 - 4, 6): d.rectangle([k, Y0 + 3, k + 3, Y1 - 2], fill=WHITE[3], outline=OUT)
    else:
        d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=body[0])
        if p == "F": d.line([X0 + 3, Y1 - 1, X0 + 3 + (W - 6) * (m + 1) / 5, Y1 - 1], fill=GLOW[2])
    if p in "VGM" and not opn:                                                                              # the main switch's handle
        d.rectangle([X1 - 6, Y1 - 2, X1 - 3, Y1 + 3], fill=c.trim[2] if p == "V" else RED[2], outline=OUT)
    if c.broken:
        cable(d, [(X0 + W * .3, Y1 - 3), (X0 + W * .25, Y1 + 2)], (200, 60, 40), 1); cable(d, [(X0 + W * .45, Y1 - 3), (X0 + W * .5, Y1 + 2)], (40, 80, 200), 1)
        sparks(d, X0 + W * .38, Y1 - 2)


reg("fusebox", fusebox, "victorian", "fuse boards of about 18 by 6 in deep, breaker panels 14 to 20 in by 4 to 6 in (IEE wiring practice; Square D catalogues)",
    states=("closed", "open"), front=True, clear=3, mount="wall")


def transformer(tm, x, y, w, h, st, v, c):
    """An electrical transformer from above on its concrete pad. To Mid-Century: an oil tank with cooling fins down
    its sides, three porcelain bushings on its lid with their lines going off, and its round conservator; or the
    same in a fenced compound. From Mid-Century: a squat pad-mounted box with its lock and warning sign. Future
    Darkness: a sealed dark block with a lit band. Humming: the bushings' tips and the lamp glow; broken: a burst
    tank, oil spilt and sparks."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    if p == "V":                                                                                            # on a timber platform between poles
        case(d, X0, Y0, X1, Y1, WOOD)
        for k in range(Y0 + 8, Y1, 8): d.line([X0 + 2, k, X1 - 2, k], fill=WOOD[0])
        for px_, py_ in ((X0 + 6, Y0 + 6), (X1 - 6, Y0 + 6), (X0 + 6, Y1 - 6), (X1 - 6, Y1 - 6)): d.ellipse([px_ - 5, py_ - 5, px_ + 5, py_ + 5], fill=DARKWOOD[2], outline=OUT)
    else: case(d, X0, Y0, X1, Y1, CONC)
    if p == "F":
        case(d, X0 + 8, Y0 + 8, X1 - 8, Y1 - 8, L, r=6); d.line([X0 + 12, Y0 + H // 2, X1 - 12, Y0 + H // 2], fill=GLOW[2] if c.on else GLOW[0], width=3)
        for k in range(X0 + 14, X1 - 14, 10 - m): d.line([k, Y0 + 12, k, Y0 + 20], fill=L[0])
        warn(d, X0 + W // 2, Y1 - 16, 5)
    elif p in "MN" and m % 2 == 1:                                                                          # pad-mounted box
        case(d, X0 + 6, Y0 + 10, X1 - 6, Y1 - 8, L, r=3)
        d.line([X0 + W // 2, Y0 + 12, X0 + W // 2, Y1 - 10], fill=L[0]); d.rectangle([X0 + W // 2 - 3, Y1 - 22, X0 + W // 2 + 3, Y1 - 16], fill=STEEL[3], outline=OUT)
        louvres(d, X0 + 12, Y0 + 16, X0 + 26, Y0 + 30, L, 3); warn(d, X1 - 18, Y1 - 20, 5)
    else:
        if m == 2 or m == 4:                                                                                # its fenced compound
            for k in range(X0 + 2, X1 - 1, 4): d.line([k, Y0 + 2, k + 2, Y0 + 4], fill=STEEL[3]); d.line([k, Y1 - 3, k + 2, Y1 - 1], fill=STEEL[3])
            for k in range(Y0 + 2, Y1 - 1, 4): d.line([X0 + 2, k, X0 + 4, k + 2], fill=STEEL[3]); d.line([X1 - 3, k, X1 - 1, k + 2], fill=STEEL[3])
        tx0, ty0, tx1, ty1 = X0 + 16, Y0 + 18, X1 - 16, Y1 - 14
        for k in range(ty0 + 2, ty1 - 1, 3):                                                                # cooling fins
            d.rectangle([tx0 - 8, k, tx0, k + 1], fill=L[1], outline=None); d.rectangle([tx1, k, tx1 + 8, k + 1], fill=L[1])
        case(d, tx0, ty0, tx1, ty1, L, r=2)
        d.rounded_rectangle([tx0 + 2, Y0 + 6, tx1 - 2, ty0 - 2], 5, fill=L[3], outline=OUT)                # conservator
        for k in range(3):
            bx_ = tx0 + (tx1 - tx0) * (k + 1) / 4; by_ = ty0 + (ty1 - ty0) * .45
            d.ellipse([bx_ - 6, by_ - 6, bx_ + 6, by_ + 6], fill=(150, 90, 60) if p in "VG" and c.w < 4 else WHITE[2], outline=OUT)
            d.ellipse([bx_ - 3, by_ - 3, bx_ + 3, by_ + 3], fill=WHITE[4] if not (p in "VG" and c.w < 4) else (190, 120, 80))
            d.line([bx_, by_ - 3, bx_ + (k - 1) * 6, Y0 + 1], fill=(30, 30, 34))
        warn(d, tx0 + 8, ty1 - 8, 4)
    if c.broken:
        d.ellipse([X0 + 6, Y1 - 18, X0 + 34, Y1 - 4], fill=(40, 36, 30)); d.ellipse([X0 + 10, Y1 - 15, X0 + 22, Y1 - 9], fill=(70, 66, 56))
        sparks(d, X0 + W // 2, Y0 + H * .45)


reg("transformer", transformer, "victorian", "distribution transformers on pads of about 4 ft square (pad-mounted 25 to 100 kVA units; Ferranti oil-cooled tanks)",
    states=("off", "on"), front=True, clear=3)


def batterybank(tm, x, y, w, h, st, v, c):
    """A bank of batteries against its wall, from above. Modern: rows of lead-acid blocks with red and black posts
    and the links between them on a steel rack, a cabinet of flat lithium modules each with its lights, or a few big
    yellow traction cells. Future Darkness: dark sealed modules with lit charge bars. On: the charge lights lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; lit = c.on and not c.broken
    case(d, X0, Y0, X1, Y1, ramp((70, 72, 78), 12) if m != 3 else ramp((160, 160, 156), 12))              # the rack or cabinet
    if p == "N" and m in (0, 2, 3):
        cols, rows = (5, 2) if m != 2 else (3, 2)
        cw, ch = (W - 6) / cols, (H - 6) / rows
        for i in range(cols):
            for j in range(rows):
                bx, by = X0 + 3 + i * cw, Y0 + 3 + j * ch
                Bc = YEL if m == 2 else L
                case(d, bx + 1, by + 1, bx + cw - 1, by + ch - 1, Bc, r=1)
                d.ellipse([bx + 3, by + 3, bx + 6, by + 6], fill=RED[2], outline=OUT); d.ellipse([bx + cw - 6, by + 3, bx + cw - 3, by + 6], fill=(30, 30, 30), outline=OUT)
                if i < cols - 1: d.line([bx + cw - 4, by + 4, bx + cw + 4, by + 4], fill=COPPER[3], width=2)
        lamp(d, X1 - 6, Y1 - 5, (80, 220, 90), lit, 2)
    else:
        n = 4 + m % 3
        for k in range(n):
            by = Y0 + 3 + k * (H - 6) / n
            case(d, X0 + 3, by + 1, X1 - 3, by + (H - 6) / n - 1, L if k % 2 == 0 or p == "F" else c.alt, r=1)
            for q in range(4):
                lx = X1 - 14 + q * 3; d.rectangle([lx, by + 3, lx + 1, by + 4], fill=(90, 230, 120) if lit and (q < 3 - k % 2) else (40, 50, 44))
        if p == "F": d.line([X0 + 4, Y1 - 2, X1 - 4, Y1 - 2], fill=GLOW[2] if lit else GLOW[0])
        cable(d, [(X0 + 6, Y0 + 2), (X0 + 6, Y0 - 2)], (200, 50, 40), 2)
    if c.broken:
        d.ellipse([X0 + 4, Y1 - 6, X0 + 22, Y1 + 1], fill=(170, 180, 120)); sparks(d, X0 + W * .6, Y0 + 8)


reg("batterybank", batterybank, "modern", "battery racks of about 3 by 1 1/2 to 2 ft (48 V lead-acid strings; home lithium cabinets)",
    states=("off", "on"), front=True, clear=3, mount="wall")


SOLAR = {"M": [(40, 50, 90), (90, 100, 140), (30, 36, 50), (110, 90, 120), (50, 80, 120), (70, 70, 80)],
         "N": [(46, 48, 54), (236, 236, 230), (178, 44, 40), (206, 196, 170), (176, 180, 184), (92, 96, 104), (196, 200, 206)],
         "F": [(20, 22, 30), (70, 50, 90), (18, 50, 60), (60, 60, 66), (24, 46, 90), (90, 70, 40)]}


def solarpanel(tm, x, y, w, h, st, v, c):
    """Solar panels from above on their frame. Mid-Century: early panels of round silicon wafers on a white sheet in
    an aluminium frame. Modern: blue speckled polycrystalline or black monocrystalline cells in a grid, one panel or
    two or three side by side. Future Darkness: dark seamless film, the busbars faint. Poor ones are cracked, dusty
    or leaf-strewn; broken ones have a shattered cell."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    cell = ramp(SOLAR[p][int(v.get("livery", 0)) % 6], 14); fr = CHROME if m % 2 == 0 else ramp((40, 40, 44), 10)
    n = (1, 2, 3, 2, 1)[m]
    pw = (W - 2) / n
    for i in range(n):
        px0 = X0 + 1 + i * pw; case(d, px0, Y0 + 1, px0 + pw - 2, Y1 - 1, fr)
        ix0, iy0, ix1, iy1 = px0 + 3, Y0 + 4, px0 + pw - 5, Y1 - 4
        if p == "M":
            d.rectangle([ix0, iy0, ix1, iy1], fill=WHITE[2])
            s = 9
            for gx in np.arange(ix0 + 1, ix1 - s + 2, s + 1):
                for gy in np.arange(iy0 + 1, iy1 - s + 2, s + 1):
                    d.ellipse([gx, gy, gx + s, gy + s], fill=cell[2], outline=cell[0]); d.line([gx + 2, gy + s // 2, gx + s - 2, gy + s // 2], fill=STEEL[3])
        else:
            d.rectangle([ix0, iy0, ix1, iy1], fill=cell[2])
            s = 8 if m != 4 else 11
            if p == "N":
                for gx in np.arange(ix0 + s, ix1, s): d.line([gx, iy0, gx, iy1], fill=cell[4] if m % 2 == 0 else cell[0])
                for gy in np.arange(iy0 + s, iy1, s): d.line([ix0, gy, ix1, gy], fill=cell[4] if m % 2 == 0 else cell[0])
            else:
                for gx in np.arange(ix0 + 6, ix1, 12): d.line([gx, iy0, gx, iy1], fill=cell[3])
            d.line([ix0 + 1, iy0 + 1, ix0 + (ix1 - ix0) // 3, iy0 + 1], fill=cell[4])
    if c.poor:
        for k in range(4): d.ellipse([X0 + 12 + k * 21, Y0 + 9 + (k % 2) * 20, X0 + 18 + k * 21, Y0 + 13 + (k % 2) * 20], fill=(150, 120, 60))
    if c.broken: screen(d, X0 + W * .3, Y0 + H * .25, X0 + W * .5, Y0 + H * .7, False, True, glare=False)


reg("solarpanel", solarpanel, "mid-century", "photovoltaic panels of about 5 1/2 by 3 1/4 ft (60-cell modules); 1970s round-cell panels a little smaller",
    off=3, axes={"livery": list(range(6)), "make": list(range(5))})


def aircon(tm, x, y, w, h, st, v, c):
    """An air-conditioning unit from above. A condensing unit with its big round fan grille in the top, one fan or
    two; a window unit with louvres slanting out and its grille; a slim wall split outside unit. Future Darkness: a
    sealed dark unit with a lit ring. Running: the fan a blur and drips below; broken: a bent grille and a stain."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    spin = c.on and not c.broken
    case(d, X0, Y0, X1, Y1, L, r=2)
    if m in (1, 3) and p != "F":                                                                           # window unit
        louvres(d, X0 + 4, Y0 + 4, X1 - 4, Y0 + H * .55, L, 3)
        d.rectangle([X0 + 4, Y1 - H * .38, X1 - 4, Y1 - 3], fill=c.alt[1], outline=OUT)
        for k in range(X0 + 6, X1 - 4, 3): d.line([k, Y1 - H * .38 + 2, k, Y1 - 5], fill=c.alt[3])
        lamp(d, X1 - 8, Y0 + H * .6, (90, 220, 90), spin, 2)
    else:
        nf = 2 if m == 4 and W > 50 else 1
        for k in range(nf):
            cx = X0 + W * (k + .5) / nf if nf > 1 else X0 + W * .45; cy = Y0 + H / 2; r = min(H / 2 - 4, W / nf / 2 - 4)
            d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=(30, 30, 34), outline=OUT)
            fanblades(d, cx, cy, r, ramp((60, 62, 68), 12), 3 + m % 2, spin, guard=CHROME if c.rich else STEEL)
        if nf == 1: louvres(d, X1 - 10, Y0 + 5, X1 - 4, Y1 - 5, L, 3, vert=True)
        if p == "F": d.ellipse([X0 + W * .45 - H / 2 + 3, Y0 + 3, X0 + W * .45 + H / 2 - 3, Y1 - 3], outline=GLOW[2] if spin else GLOW[0])
    if c.broken: d.line([X0 + 8, Y0 + 8, X0 + 20, Y0 + 20], fill=OUT, width=2)
    if spin: d.ellipse([X0 + 6, Y1 - 3, X0 + 10, Y1], fill=(110, 150, 180))


reg("aircon", aircon, "mid-century", "condensing units and window units of about 30 by 20 in to 3 by 2 ft (Carrier and Fedders catalogues)",
    states=("off", "on"), front=True, clear=2, mount="wall")


def ceilingfan(tm, x, y, w, h, st, v, c):
    """A ceiling fan seen from below the ceiling's height, from straight above. Victorian: two long wooden paddles
    on a brass hub, turned by a belt from the line shaft. Great War: four wooden blades and a brass or black motor
    bell. Mid-Century: three pressed-steel blades painted in the maker's colour round a domed motor. Modern: five
    wood or white blades and a glass light bowl under the motor. Future Darkness: slim dark blades in a lit ring.
    Turning: the blades a blur; broken: a blade gone and one hanging askew."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy = X0 + W / 2, Y0 + H / 2; r = min(W, H) / 2 - 2; spin = c.on and not c.broken
    lv = int(v.get("livery", 0)) % 6
    FIN = [WOOD, DARKWOOD, ramp((140, 60, 40), 16), ramp((46, 44, 46), 10), ramp((196, 170, 110), 14), WHITE]   # oak, walnut, mahogany, japanned, cane, white
    n, Bc, hub = {"V": (2, FIN[lv], BRASS if lv % 2 == 0 else IRON), "G": (4, FIN[lv], BRASS if c.w > 2 else ramp(LIV["G"][lv], 16)), "M": (3, L, CHROME if c.rich else L),
                  "N": (5 - (m == 3), [WOOD, WHITE, DARKWOOD, ramp((50, 50, 54), 10), ramp((196, 170, 110), 14), CHROME][lv], ramp(LIV["N"][m], 14)), "F": (3, L, c.alt)}[p]
    if p == "V" and m >= 3: n = 4
    if p == "F": d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GLOW[2] if spin else GLOW[0], width=2)
    if spin:
        fanblades(d, cx, cy, r - 2, Bc, n, True, hub=hub)
    else:
        a0 = .4 + m * .3
        for k in range(n):
            if c.broken and k == 0: continue
            a = a0 + k * 2 * math.pi / n; bw = {"V": 7, "G": 6, "M": 7, "N": 6, "F": 4}[p]
            if c.broken and k == 1: a += .35
            ux, uy = math.cos(a), math.sin(a); nx, ny = -uy, ux; r0 = r * .22
            pts = [(cx + ux * r0 + nx * 2, cy + uy * r0 + ny * 2), (cx + ux * (r - 1) + nx * bw, cy + uy * (r - 1) + ny * bw),
                   (cx + ux * (r - 1) - nx * bw, cy + uy * (r - 1) - ny * bw), (cx + ux * r0 - nx * 2, cy + uy * r0 - ny * 2)]
            if p == "M": pts[1], pts[2] = (cx + ux * r * .8 + nx * (bw + 3), cy + uy * r * .8 + ny * (bw + 3)), (cx + ux * r * .8 - nx * (bw + 3), cy + uy * r * .8 - ny * (bw + 3))
            d.polygon(pts, fill=Bc[2], outline=OUT); d.line([pts[0], pts[1]], fill=Bc[4])
            d.line([cx + ux * r0, cy + uy * r0, cx + ux * r * .45, cy + uy * r * .45], fill=hub[1], width=3)            # the blade iron
    hr = r * (.22 if p != "N" else .26) * (1 + .12 * (m % 3))
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=hub[2], outline=OUT); d.ellipse([cx - hr + 2, cy - hr + 2, cx, cy], fill=hub[4])
    if p == "N": d.ellipse([cx - hr * .55, cy - hr * .55, cx + hr * .55, cy + hr * .55], fill=(240, 236, 214) if not c.on else (255, 246, 200), outline=OUT)
    if p == "V": d.line([cx, cy, X1 - 2, cy - r * .2], fill=(90, 60, 40), width=2)                       # the drive belt
    if p == "G" and m in (2, 4): d.line([cx, Y0 + 2, cx, cy - hr], fill=IRON[2], width=3)               # its downrod and wire


reg("ceilingfan", ceilingfan, "victorian", "ceiling fans of 36 to 56 in across the blades (Hunter and Emerson catalogues from the 1890s)",
    states=("off", "on"), off=0)


def deskfan(tm, x, y, w, h, st, v, c):
    """An electric desk fan from above, tilted up a little toward the room: the guard and blades as an oval in
    front, the motor behind, the foot under it and its flex. Victorian and Great War: brass blades in an open
    star guard on a heavy cast base. Mid-Century: steel blades in a chrome or painted cage, a round domed foot.
    Modern: a plastic fan, its square foot with buttons. Future Darkness: a bladeless ring on a dark stand.
    Running: the blades a blur."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx = X0 + W / 2; spin = c.on and not c.broken; tilt = .55 + .1 * (m % 3)
    fy = Y0 + H * .62                                                                                        # the foot
    if p in "VG": d.ellipse([cx - W * .4, fy - H * .24, cx + W * .4, fy + H * .34], fill=(IRON if m % 2 else L)[2], outline=OUT)
    elif p == "M": d.ellipse([cx - W * (.26 + .04 * m), fy - H * .2, cx + W * (.26 + .04 * m), fy + H * .28], fill=L[2] if m != 2 else CHROME[2], outline=OUT)
    elif p == "N": case(d, cx - W * .3, fy - H * .16, cx + W * .3, fy + H * .3, L, r=3)
    else: d.ellipse([cx - W * (.2 + .05 * m), fy - H * .12, cx + W * (.2 + .05 * m), fy + H * .3], fill=L[1], outline=OUT)
    cable(d, [(cx, fy + H * .2), (cx + W * .3, Y1 - 1), (X1 - 1, Y1 - 2)], (30, 30, 34) if p != "V" else (140, 110, 70), 1)
    if p == "N":
        for k in range(3): d.rectangle([cx - 6 + k * 5, fy + H * .18, cx - 3 + k * 5, fy + H * .24], fill=L[0])
    d.ellipse([cx - W * .14, Y0 + 1, cx + W * .14, Y0 + H * .34], fill=(L if p != "V" else BRASS)[1], outline=OUT)   # the motor
    gy, gr = Y0 + H * .4, W * .46
    if p == "F":
        if m % 2: d.rectangle([cx - W * .3, fy - H * .1, cx + W * .3, fy + H * .3], fill=c.alt[2], outline=OUT)
        d.ellipse([cx - gr, gy - gr * tilt * .6, cx + gr, gy + gr * tilt * .6], outline=OUT, width=5)
        d.ellipse([cx - gr + 1, gy - gr * tilt * .6 + 1, cx + gr - 1, gy + gr * tilt * .6 - 1], outline=L[3], width=3)
        if spin: d.ellipse([cx - gr + 4, gy - gr * tilt * .6 + 3, cx + gr - 4, gy + gr * tilt * .6 - 3], outline=GLOW[1])
        return
    lv = int(v.get("livery", 0)) % 6
    Bc = [BRASS, COPPER, CHROME, ramp((50, 50, 54), 10), ramp((150, 110, 60), 16), ramp((70, 100, 70), 14)][lv] if p in "VG" else (L if p == "M" else ramp((150, 190, 220) if m % 2 else (220, 222, 224), 12))
    bb = [cx - gr, gy - gr * tilt, cx + gr, gy + gr * tilt]
    if spin: d.ellipse(bb, fill=mix(Bc[2], (200, 200, 200), .4))
    else:
        nb = 4 if p in "VG" else 3
        for k in range(nb):
            a = .5 + k * 2 * math.pi / nb
            d.pieslice(bb, math.degrees(a) - 24, math.degrees(a) + 24, fill=Bc[2], outline=Bc[0])
    G_ = ([BRASS, IRON][m % 2] if p == "V" else (IRON if p == "G" and m % 2 else (CHROME if p in "GM" else Bc)))
    d.ellipse(bb, outline=G_[1], width=2)
    nsp = 4 if p in "VG" else 10
    for k in range(nsp):
        a = k * 2 * math.pi / nsp; d.line([cx, gy, cx + math.cos(a) * gr, gy + math.sin(a) * gr * tilt], fill=G_[2])
    d.ellipse([cx - 3, gy - 2, cx + 3, gy + 2], fill=G_[3], outline=OUT)
    if c.broken: d.line([cx - gr * .6, gy - gr * tilt * .9, cx - gr * .2, gy + gr * tilt * .2], fill=OUT, width=2)


reg("deskfan", deskfan, "victorian", "desk fans with 8 to 16 in blades on a foot about 8 in across (GE and Emerson fans, 1900s on)",
    states=("off", "on"), off=3)


def antenna(tm, x, y, w, h, st, v, c):
    """An aerial from above on its roof or yard. Victorian: a lattice wireless mast seen down its length, a
    triangle of members, its guys running out to anchors through white egg insulators. Great War: a timber pole
    with a spreader and its long wire running off north. Mid-Century: a television aerial, its fishbone of
    elements on the boom, lashed to a brick chimney. Modern: a log-periodic and a little dish on a tripod.
    Future Darkness: a white radome and panel antennas on a short mast."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy = X0 + W / 2, Y0 + H / 2
    base = [ramp((150, 72, 54), 14), CONC, ramp((80, 80, 86), 10), WOOD, L][m]                               # chimney, ballast, roof plate, timber, painted
    case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, base)
    if m == 0:
        for k in range(Y0 + 6, Y1 - 2, 5): d.line([X0 + 3, k, X1 - 3, k], fill=base[1])
    if p in "VG":
        for ax, ay in ((X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X0 + 3, Y1 - 3), (X1 - 3, Y1 - 3)):
            d.line([cx, cy, ax, ay], fill=(40, 40, 44)); mx, my = (cx + ax) / 2, (cy + ay) / 2
            d.ellipse([mx - 2, my - 2, mx + 2, my + 2], fill=WHITE[3], outline=OUT)
        if p == "V":
            q = 9 + m % 3
            d.polygon([(cx, cy - q), (cx + q, cy + q * .7), (cx - q, cy + q * .7)], fill=L[2], outline=OUT); d.polygon([(cx, cy - q * .4), (cx + q * .4, cy + q * .3), (cx - q * .4, cy + q * .3)], fill=L[0])
        else:
            d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=L[2], outline=OUT); d.line([cx - 12, cy, cx + 12, cy], fill=L[1], width=3)
            for k in (-10, -4, 4, 10): d.line([cx + k, cy, cx + k, Y0], fill=COPPER[3])
    elif p == "M":
        d.line([cx - 14, cy - 12, cx + 14, cy + 12], fill=OUT, width=4); d.line([cx - 14, cy - 12, cx + 14, cy + 12], fill=L[3] if m != 4 else CHROME[3], width=2)
        for k in range(5 + m):
            t = k / (4 + m); px_, py_ = cx - 14 + 28 * t, cy - 12 + 24 * t; ln = 10 - 5 * t
            d.line([px_ + ln * .65, py_ - ln * .75, px_ - ln * .65, py_ + ln * .75], fill=CHROME[3], width=1)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=STEEL[1], outline=OUT)
        cable(d, [(cx, cy), (cx + 6, Y1 - 3)], (40, 40, 44), 1)
    elif p == "N":
        for k in range(3): a = k * 2 * math.pi / 3 + .5; d.line([cx, cy, cx + math.cos(a) * 15, cy + math.sin(a) * 15], fill=STEEL[2], width=2)
        d.polygon([(cx, cy), (cx - 12, cy - 15), (cx + 12, cy - 15)], outline=CHROME[3])
        for k in range(1, 5): d.line([cx - 12 * k / 5, cy - 15 * k / 5, cx + 12 * k / 5, cy - 15 * k / 5], fill=CHROME[3])
        d.ellipse([cx + 3, cy + 1, cx + 15, cy + 13], fill=(L if m != 4 else WHITE)[3], outline=OUT); d.line([cx + 9, cy + 7, cx + 6, cy + 1], fill=OUT)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=STEEL[2], outline=OUT)
    else:
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=WHITE[2] if m % 2 == 0 else COMPOSITE[3], outline=OUT); d.arc([cx - 7, cy - 7, cx + 7, cy + 7], 190, 260, fill=WHITE[4], width=2)
        for k in range(3): a = k * 2 * math.pi / 3 - .3; d.rectangle([cx + math.cos(a) * 13 - 3, cy + math.sin(a) * 13 - 3, cx + math.cos(a) * 13 + 3, cy + math.sin(a) * 13 + 3], fill=COMPOSITE[2], outline=OUT)
        lamp(d, cx, cy, (240, 60, 50), c.on, 1)
    if c.broken: d.line([cx, cy, X1 - 4, Y1 - 6], fill=STEEL[1], width=2)


reg("antenna", antenna, "victorian", "rooftop masts and aerials on a base of about 2 ft (chimney lashings; television aerial booms 3 to 6 ft)",
    states=("off", "on"), nvar=32)


def satellitedish(tm, x, y, w, h, st, v, c):
    """A satellite dish from above, tipped up to the southern sky. Mid-Century: a big early dish of solid or mesh
    panels with a buttonhook feed on a pole set in a ballast frame. Modern: an offset dish in white or grey on a wall
    bracket or pole, its arm reaching out to the feed. Future Darkness: a flat round or square terminal on a short
    mast. Broken: a bent arm and a dented dish."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy = X0 + W / 2, Y0 + H * .45
    if m in (0, 3):
        case(d, X0 + 4, Y0 + H * .55, X1 - 4, Y1 - 2, CONC)                                                      # ballast frame
        for k in range(4): d.rectangle([X0 + 8 + k * (W - 22) / 3, Y0 + H * .62, X0 + 14 + k * (W - 22) / 3, Y1 - 6], fill=CONC[1], outline=OUT)
    elif m in (1, 4): d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 7], fill=ramp((150, 72, 54), 14)[2], outline=OUT)   # the wall it hangs on
    else: d.ellipse([cx - 5, Y1 - 12, cx + 5, Y1 - 2], fill=STEEL[2], outline=OUT)
    if p == "F":
        if m % 2: case(d, cx - W * .3, cy - H * .3, cx + W * .3, cy + H * .3, L, r=3)
        else: d.ellipse([cx - W * .32, cy - H * .32, cx + W * .32, cy + H * .32], fill=L[2], outline=OUT)
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=GLOW[2] if c.on else GLOW[0])
        return
    rx, ry = (W * .45, H * .4) if p == "M" else (W * .34, H * .28)
    Dc = L if p == "N" else ramp((190, 190, 184), 12) if m % 2 else L
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=Dc[2], outline=OUT)
    d.ellipse([cx - rx + 3, cy - ry + 3, cx + rx - 3, cy + ry - 3], fill=Dc[1]); d.arc([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], 180, 270, fill=Dc[4], width=2)
    if p == "M":
        for k in range(6): a = k * math.pi / 3; d.line([cx, cy, cx + math.cos(a) * rx * .9, cy + math.sin(a) * ry * .9], fill=Dc[0])
        for a in (math.pi * .25, math.pi * .75, math.pi * 1.5): d.line([cx + math.cos(a) * rx * .9, cy + math.sin(a) * ry * .9, cx, cy + 3], fill=STEEL[2])
        d.rectangle([cx - 3, cy, cx + 3, cy + 6], fill=STEEL[3], outline=OUT)
    else:
        fx, fy = cx + 2, cy + ry + 6
        d.line([cx, cy + ry * .6, fx, fy], fill=OUT, width=4); d.line([cx, cy + ry * .6, fx, fy], fill=STEEL[3], width=2)
        d.rectangle([fx - 3, fy - 3, fx + 3, fy + 3], fill=(40, 40, 44), outline=OUT)
    if c.broken: d.line([cx - rx * .5, cy - ry * .3, cx + rx * .2, cy + ry * .5], fill=Dc[0], width=3)


reg("satellitedish", satellitedish, "mid-century", "dishes of 2 to 3 ft (domestic offset dishes) and 4 to 6 ft early home dishes on ballast frames",
    states=("off", "on"))


# ================================================================ the house
LAUNDRY = [((70, 90, 160), (200, 60, 50)), ((230, 220, 200), (90, 140, 90)), ((200, 160, 60), (60, 60, 70)), ((150, 60, 90), (220, 220, 220))]


def laundry(d, cx, cy, r, k=0):
    """A wet tangle of washing: a few coloured folds."""
    for i, (dx, dy) in enumerate(((-.3, -.2), (.25, -.15), (0, .25), (-.2, .3))):
        col = LAUNDRY[(k + i) % 4][i % 2]
        d.ellipse([cx + dx * r - r * .45, cy + dy * r - r * .3, cx + dx * r + r * .45, cy + dy * r + r * .3], fill=col, outline=tone(col, -50))


def washingmachine(tm, x, y, w, h, st, v, c):
    """A washing machine from above. Great War: a wooden tub on legs, its lid, the agitator's gear head and a
    wringer of two rollers clamped across one side. Mid-Century: a round enamelled wringer washer with its wringer
    head, or a square top-loading automatic with a lid and the dials on its back panel. Modern: a front-loader, its
    worktop, the soap drawer and dial on the front strip, its round door swung out when open; or a top-loader where
    those are sold. Future Darkness: a sealed box with a lit ring. Open: the lid up or door out, washing inside."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    opn = c.open; cx, cy = X0 + W / 2, Y0 + H / 2
    if p == "G" or (p == "M" and m in (0, 3)):                                                                # a round tub with its wringer
        r = min(W, H) / 2 - 3
        if p == "G" and m in (2, 4):                                                                          # a square cabinet tub on legs
            case(d, X0 + 2, Y0 + 3, X1 - 2, Y1 - 1, ramp((110, 80, 50), 14) if m == 2 else L)
        tubc = [WOOD, ramp((150, 80, 50), 16), STEEL, ramp((70, 110, 78), 16), ramp((144, 144, 138), 14), COPPER][int(v.get("livery", 0)) % 6] if p == "G" else L
        d.ellipse([cx - r, cy - r + 2, cx + r, cy + r], fill=tubc[2], outline=OUT)
        if p == "G":
            for k in range(12): a = k * math.pi / 6; d.line([cx + math.cos(a) * (r - 2), cy + 1 + math.sin(a) * (r - 2), cx + math.cos(a) * (r - 5), cy + 1 + math.sin(a) * (r - 5)], fill=tubc[0])
            d.ellipse([cx - r + 1, cy - r + 3, cx + r - 1, cy + r - 1], outline=IRON[2], width=2)
        if opn:
            d.ellipse([cx - r + 5, cy - r + 7, cx + r - 5, cy + r - 5], fill=(110, 140, 160)); laundry(d, cx, cy + 1, r * .55, m)
            d.ellipse([X1 - 16, Y1 - 16, X1 - 2, Y1 - 2], fill=tubc[3], outline=OUT)                             # lid set down
        else:
            d.ellipse([cx - r + 4, cy - r + 6, cx + r - 4, cy + r - 4], fill=tubc[3], outline=tubc[0]); d.ellipse([cx - 5, cy - 4, cx + 5, cy + 6], fill=IRON[2] if p == "G" else CHROME[2], outline=OUT)
        wy = Y0 + 4 if m % 2 == 0 else Y1 - 12                                                                  # the wringer
        d.rectangle([cx - r * .8, wy - 2, cx + r * .8, wy + 8], fill=IRON[1] if p == "G" else L[0], outline=OUT)
        for k in (wy, wy + 4): d.rectangle([cx - r * .7, k, cx + r * .7, k + 3], fill=(230, 226, 216) if p == "M" else WOOD[3], outline=OUT)
        d.line([cx + r * .8, wy + 3, X1 - 2, wy + 3], fill=IRON[2], width=2); d.ellipse([X1 - 6, wy - 1, X1 - 1, wy + 6], fill=WOOD[2], outline=OUT)
    elif p == "F":
        case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, L, r=6)
        r = min(W, H) * (.24 + .04 * m)
        if m >= 3: d.rectangle([X0 + 4, Y1 - 10, X1 - 4, Y1 - 5], fill=c.alt[2], outline=OUT)
        if opn: d.ellipse([cx - r, Y1 - 4, cx + r, Y1 + 6], fill=L[3], outline=OUT)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GLOW[2] if not opn else GLOW[0], width=2)
        if m % 2: d.rectangle([X0 + 6, Y0 + 5, X0 + 18, Y0 + 10], fill=c.alt[2], outline=OUT)
        if opn: laundry(d, cx, cy, r * .7, m)
    else:
        top = p == "M" or m in (2, 4)                                                                             # top-loader
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=2)
        if top:
            d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 10], fill=L[0] if p == "M" else c.alt[2], outline=OUT)    # the back panel and dials
            for k in (X0 + 9, X1 - 9): d.ellipse([k - 3, Y0 + 3, k + 3, Y0 + 9], fill=CHROME[3], outline=OUT)
            lamp(d, cx, Y0 + 6, (240, 90, 60), c.on or opn, 1)
            if opn:
                d.ellipse([cx - 15, Y0 + 14, cx + 15, Y1 - 6], fill=(150, 156, 164), outline=OUT); d.ellipse([cx - 12, Y0 + 17, cx + 12, Y1 - 9], fill=(70, 74, 84))
                laundry(d, cx, (Y0 + Y1) / 2 + 4, 10, m)
            else:
                d.rectangle([X0 + 5, Y0 + 13, X1 - 5, Y1 - 4], outline=L[0]); d.rectangle([cx - 5, Y1 - 6, cx + 5, Y1 - 4], fill=L[0])
        else:
            d.rectangle([X0 + 3, Y1 - 9, X1 - 3, Y1 - 3], fill=c.alt[3] if m % 2 else L[3], outline=OUT)       # the front strip
            d.rectangle([X0 + 5, Y1 - 8, X0 + 15, Y1 - 4], fill=L[1], outline=OUT); dial(d, X1 - 10, Y1 - 6, 3, face=L[3])
            d.rectangle([X0 + 20, Y1 - 8, X0 + 28, Y1 - 5], fill=(30, 50, 40) if not c.on else (80, 220, 140))
            if opn:
                d.ellipse([X0 + 8, Y1 - 2, X0 + 30, Y1 + 10], fill=(160, 170, 180), outline=OUT); d.ellipse([X0 + 12, Y1, X0 + 26, Y1 + 8], fill=(120, 150, 170))
                laundry(d, X0 + 24, Y1 + 3, 6, m)
    if c.broken: d.ellipse([X0 + 2, Y1 - 3, X0 + 22, Y1 + 3], fill=(110, 150, 180))


reg("washingmachine", washingmachine, "great-war", "washers of 24 to 27 in square (Maytag and Thor tubs about 2 ft across; 60 cm European front-loaders)",
    states=("closed", "open"), front=True, clear=2.5, mount="wall")


def dryer(tm, x, y, w, h, st, v, c):
    """A tumble dryer from above. Mid-Century: a squared enamelled cabinet with its chrome-trimmed control panel
    standing up along the back, the lint screen in the top and the silver duct out behind. Modern: a plain worktop
    with the control strip at the front and its round door. Future Darkness: a sealed cube with a lit seam.
    Open: the round door swung out on the clothes in the drum; running: the panel lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; opn = c.open
    cx, cy = X0 + W / 2, Y0 + H / 2
    d.line([X1 - 8, Y0 + 2, X1 - 8, Y0 - 1], fill=CHROME[3], width=5)                                          # the duct
    case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 1, L, r=2 if p != "F" else 6)
    if p == "M":
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 12], fill=L[0] if m % 2 else c.alt[1], outline=OUT)
        d.line([X0 + 3, Y0 + 11, X1 - 3, Y0 + 11], fill=CHROME[3])
        for k, q in enumerate((X0 + 10, cx, X1 - 10)): dial(d, q, Y0 + 7, 3, face=CHROME[3], ang=k)
        d.rectangle([cx - 10, Y0 + 16, cx + 10, Y0 + 21], fill=L[1], outline=OUT)                                 # lint screen
        for k in range(int(cx) - 8, int(cx) + 9, 3): d.line([k, Y0 + 17, k, Y0 + 20], fill=L[0])
    elif p == "N":
        d.rectangle([X0 + 3, Y1 - 9, X1 - 3, Y1 - 3], fill=L[3] if m % 2 else c.alt[3], outline=OUT)
        dial(d, X0 + W * (.3 + .1 * (m % 3)), Y1 - 6, 3, face=L[4]); d.rectangle([X1 - 16, Y1 - 8, X1 - 6, Y1 - 4], fill=(30, 40, 40) if not c.on else (240, 170, 60))
    else:
        d.line([X0 + 5, Y1 - 5, X1 - 5, Y1 - 5], fill=GLOW[2] if c.on else GLOW[0], width=2)
        rr = 6 + 3 * m; d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=c.alt[2], width=2)
        if m >= 3: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 9], fill=c.alt[1], outline=OUT)
    if opn:
        d.ellipse([cx - 12, Y1 - 3, cx + 12, Y1 + 9], fill=CHROME[2] if p != "F" else L[3], outline=OUT); d.ellipse([cx - 8, Y1 - 1, cx + 8, Y1 + 7], fill=(60, 64, 74))
        laundry(d, cx, Y1 + 3, 7, m + 1)
    if c.broken: d.line([X1 - 8, Y0 + 2, X1 - 3, Y0 + 10], fill=OUT, width=2); smoke(d, X1 - 10, Y0 + 6, 2, (120, 120, 120))


reg("dryer", dryer, "mid-century", "tumble dryers of about 27 in square (Hamilton and Whirlpool dryers; 60 cm European units)",
    states=("closed", "open"), front=True, clear=2.5, mount="wall")


def mangle(tm, x, y, w, h, st, v, c):
    """A wringer mangle from above: two long rollers between cast-iron end frames, the pressure screw and its spring
    on top, the big handwheel with its handle at one side and a board or table to feed from. Victorian: wooden
    rollers in an ornate black or green frame. Great War: the same, often with a folding wooden table-top laid by.
    Mid-Century: white rubber rollers on a lighter painted frame, or an electric wringer. Its load: a sheet or a shirt
    going through."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cy = Y0 + H / 2; rx0, rx1 = X0 + 10, X1 - 12
    if p != "G" or m in (2, 4): case(d, X0 + 4, Y0 + 3, X1 - 8, Y1 - 3, ramp(mix(L[2], (70, 70, 70), .3), 14))      # the stand and its tray
    if p == "G" and m not in (2, 4):                                                                               # the table-top laid on its frame
        case(d, X0 + 2, Y0 + 2, X1 - 8, Y1 - 2, WOOD); d.line([X0 + 4, cy, X1 - 10, cy], fill=WOOD[0])
    else:
        for fx in (rx0 - 6, rx1 + 1):                                                                          # end frames
            d.rectangle([fx, Y0 + 2, fx + 5, Y1 - 2], fill=L[1], outline=OUT); d.line([fx + 1, Y0 + 3, fx + 1, Y1 - 3], fill=L[3])
            if p == "V" and c.w > 2: d.ellipse([fx - 1, cy - 4, fx + 6, cy + 3], fill=c.trim[3], outline=OUT)
        rc = WOOD if p in "VG" else ramp((226, 222, 210), 10)
        for ry in (cy - 7, cy + 1):
            case(d, rx0, ry, rx1, ry + 6, rc, r=2)
        d.rectangle([X0 + W / 2 - 3, Y0 + 1, X0 + W / 2 + 3, cy - 7], fill=IRON[2], outline=OUT)                # pressure screw
        d.ellipse([X0 + W / 2 - 5, Y0, X0 + W / 2 + 5, Y0 + 6], fill=c.trim[2], outline=OUT)
        d.rectangle([X1 - 6, Y0 + 2, X1 - 2, Y1 - 2], fill=IRON[1], outline=OUT)                               # the handwheel on edge
        d.line([X1 - 4, Y1 - 6, X1 - 1, Y1 - 1], fill=WOOD[2], width=3)
        if p == "M" and m % 2 == 0: d.ellipse([rx0 - 4, Y1 - 10, rx0 + 6, Y1 - 1], fill=L[2], outline=OUT)      # its motor
        load = ["none", "sheet", "shirt", "sheet", "none"][(m + int(v.get("livery", 0))) % 5]
        if load != "none":
            col = WHITE if load == "sheet" else ramp((150, 170, 210), 12)
            d.polygon([(rx0 + 4, cy + 2), (rx1 - 4, cy + 2), (rx1 - 8, Y1 - 1), (rx0 + 8, Y1 - 1)], fill=col[2], outline=OUT)
            for k in range(rx0 + 12, rx1 - 8, 10): d.line([k, cy + 4, k + 2, Y1 - 3], fill=col[1])
    if c.broken: d.line([rx0, cy - 7, rx0 + 18, cy + 6], fill=OUT, width=2)


reg("mangle", mangle, "victorian", "household wringer mangles of about 3 ft by 20 in with 24 to 30 in rollers (Ewbank and Acme mangles)",
    front=True, clear=2)


def dishwasher(tm, x, y, w, h, st, v, c):
    """A dishwasher from above. Closed it is the worktop over it, with the control strip along the front edge:
    Mid-Century: an enamelled top-loading cabinet with a lid and a chrome handle; Modern: a laminate or steel
    worktop with buttons and a lamp; Future Darkness: a sealed drawer with a lit strip. Open: the lid up or the door
    folded down with the rack slid out full of plates and cups."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; opn = c.open
    TOP = [ramp((200, 196, 186), 10), WOOD, ramp((70, 70, 74), 10), L, L][m]                                # a worktop over it, or its own top
    if p == "M" and m >= 2:                                                                                 # front-door or portable kind
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, WOOD if m == 4 else L, r=1)
        if m == 4:
            for k in range(X0 + 5, X1 - 2, 5): d.line([k, Y0 + 2, k, Y1 - 2], fill=WOOD[1])
            for q in (X0 + 3, X1 - 3): d.ellipse([q - 2, Y1 - 3, q + 2, Y1 + 1], fill=(30, 30, 30))
        d.rectangle([X0 + 2, Y1 - 7, X1 - 2, Y1 - 2], fill=L[3] if m != 3 else CHROME[2], outline=OUT); d.rectangle([X0 + W / 2 - 6, Y1 - 5, X0 + W / 2 + 6, Y1 - 3], fill=CHROME[4])
        if opn:
            d.rectangle([X0 + 1, Y1, X1 - 1, Y1 + 8], fill=L[3], outline=OUT); ox, oy, ow = X0 + 3, Y1 - 10, W - 6
    elif p == "M":
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, L, r=3 + 4 * m)
        if opn:
            d.rectangle([X0 + 3, Y0 - 1, X1 - 3, Y0 + 3], fill=L[3], outline=OUT); d.rectangle([X0 + 4, Y0 + 5, X1 - 4, Y1 - 5], fill=(80, 90, 100), outline=OUT)
            ox, oy, ow = X0 + 6, Y0 + 7, W - 12
        else:
            d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 7], outline=L[0]); d.rectangle([X0 + W / 2 - 7, Y1 - 6, X0 + W / 2 + 7, Y1 - 4], fill=CHROME[3], outline=OUT)
    else:
        case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, TOP if p == "N" else L, r=0 if p == "N" else 2 + 2 * m)
        if p == "F" and m % 2: d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y0 + 4 + 4 * m], fill=c.alt[2], outline=OUT)
        d.rectangle([X0 + 2, Y1 - 6, X1 - 2, Y1 - 2], fill=L[2] if p == "N" else c.alt[1], outline=OUT)
        for k in range(3): d.rectangle([X0 + 5 + k * 5, Y1 - 5, X0 + 7 + k * 5, Y1 - 3], fill=L[0])
        lamp(d, X1 - 6, Y1 - 4, (90, 220, 120) if p == "N" else GLOW[1], c.on, 1)
        if opn:
            d.rectangle([X0 + 1, Y1, X1 - 1, Y1 + 8], fill=L[3], outline=OUT); ox, oy, ow = X0 + 3, Y1 - 10, W - 6
            d.rectangle([ox - 1, oy - 1, ox + ow + 1, Y1 + 7], outline=CHROME[2])
    if opn:
        for i in range(4):
            for j in range(2):
                px_, py_ = ox + 3 + i * (ow - 6) / 4, oy + 3 + j * 8
                if j == 0: d.ellipse([px_, py_, px_ + 6, py_ + 6], fill=WHITE[3], outline=OUT); d.ellipse([px_ + 2, py_ + 2, px_ + 4, py_ + 4], fill=WHITE[1])
                else: d.ellipse([px_ + 1, py_, px_ + 5, py_ + 4], fill=[(200, 80, 60), (70, 110, 170), WHITE[2], (220, 200, 90)][(i + m) % 4], outline=OUT)
    if c.broken: d.ellipse([X0 + 3, Y1 - 2, X0 + 22, Y1 + 4], fill=(150, 170, 190))


reg("dishwasher", dishwasher, "mid-century", "dishwashers of 24 in square under the worktop (Kitchenaid KD and Miele G-series, 60 cm)",
    states=("closed", "open"), front=True, clear=2.5, mount="wall")


def microwave(tm, x, y, w, h, st, v, c):
    """A microwave oven on its worktop, from above: the case with its vent slots, the control column at the right
    with the clock showing along the front edge, and when open the door swung out and the glass turntable inside.
    Mid-Century: a big box cased in wood-grain or almond with dials. Modern: white, black or steel with a keypad and
    green digits. Future Darkness: a dark slab with a lit seam. On: the light inside and the clock lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; opn = c.open
    body = WOOD if p == "M" and m % 2 else L
    case(d, X0, Y0 + 1, X1, Y1 - 1, body, r=2 if p != "F" else 4)
    cxp = X1 - W * (.2 + .05 * m)
    if m >= 3 and p != "F": d.rectangle([X0 + 3, Y0 + 3, cxp - 3, Y1 - 3], outline=c.alt[1], width=2)
    d.rectangle([cxp, Y0 + 2, X1 - 2, Y1 - 2], fill=(L if body is WOOD else c.alt)[1] if p != "F" else L[0], outline=OUT)   # the control column
    if p == "M":
        for k in (Y0 + 7, Y0 + 15): dial(d, (cxp + X1) / 2, k, 3, face=CHROME[3])
    else:
        for i in range(3):
            for j in range(2): d.rectangle([cxp + 2 + i * 3, Y0 + 5 + j * 4, cxp + 3 + i * 3, Y0 + 6 + j * 4], fill=L[3])
    d.rectangle([cxp + 1, Y1 - 5, X1 - 3, Y1 - 3], fill=(20, 30, 24) if not c.on else (90, 240, 140) if p == "N" else (240, 120, 60))
    louvres(d, X0 + 4, Y0 + 4, X0 + 14, Y0 + 12, body, 3, vert=True)
    if opn:
        d.line([X0 + 1, Y1, X0 + 3, Y1 + W * .55], fill=OUT, width=5); d.line([X0 + 1, Y1, X0 + 3, Y1 + W * .55], fill=body[2], width=3)
        d.ellipse([X0 + 6, Y0 + 5, cxp - 4, Y1 - 4], fill=(220, 230, 236), outline=(140, 150, 160))
    else:
        d.line([X0 + 2, Y1 - 2, cxp - 1, Y1 - 2], fill=(30, 32, 38) if not c.on else (240, 210, 120))
    if c.broken: smoke(d, X0 + 10, Y0 + 8, 2, (90, 90, 90)); sparks(d, X0 + 18, Y1 - 4)
    if c.on and not c.broken: return [(X0 + W * .4, Y1 + 2, 14, (1.3, 1.2, .9))]


reg("microwave", microwave, "mid-century", "countertop microwave ovens of about 20 to 24 by 14 to 16 in (Amana Radarange 1967; 0.8 cu ft modern units)",
    states=("off", "on"), front=True, clear=1.5)


def toaster(tm, x, y, w, h, st, v, c):
    """A toaster or a kettle on the worktop, from above. Toaster: two bread slots in a chrome or painted body,
    the lever at one end; on, the slots glow and toast stands up in them. Kettle: a round lid on a chrome, copper or
    plastic jug, its spout one way and the handle the other, on its base; on, steam rises from the spout.
    Mid-Century: rounded chrome and bakelite; Modern: plastic and brushed steel; Future Darkness: a dark sealed pod."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    on = c.on and not c.broken
    body = CHROME if (p == "M" and m == 0) else (COPPER if p == "M" and m == 3 else L)
    if m in (3, 4):                                                                                            # a kettle
        cx, cy, r = X0 + W * .45, Y0 + H / 2, min(W, H) / 2 - 1
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=body[2], outline=OUT); d.ellipse([cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55], fill=body[3], outline=body[0])
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(30, 30, 30))
        d.polygon([(cx - r + 1, cy - 2), (X0, cy - 1), (X0, cy + 1), (cx - r + 1, cy + 2)], fill=body[1], outline=OUT)
        d.arc([cx + r - 4, cy - r + 1, X1, cy + r - 1], 270, 90, fill=(30, 30, 34), width=2)
        if on: smoke(d, X0 + 1, cy - 3, 2, (230, 232, 236))
    else:
        case(d, X0, Y0 + 1, X1 - 3, Y1 - 1, body, r=4 if p == "M" else 2)
        for k in (Y0 + H * .3, Y0 + H * .62):
            d.rectangle([X0 + 3, k - 1, X1 - 7, k + 1], fill=(20, 16, 14))
            if on: d.rectangle([X0 + 4, k - 1, X1 - 8, k], fill=(240, 120, 40))
            elif c.open or m == 1: d.rectangle([X0 + 3, k - 2, X1 - 7, k + 1], fill=(200, 150, 80), outline=OUT)
        d.rectangle([X1 - 3, Y0 + H / 2 - 2, X1, Y0 + H / 2 + 1], fill=(30, 30, 34), outline=OUT)
        if body is CHROME: d.rectangle([X0, Y0 + 1, X0 + 4, Y1 - 1], fill=L[2], outline=OUT); d.rectangle([X1 - 7, Y0 + 1, X1 - 3, Y1 - 1], fill=L[2], outline=OUT)
        if p == "F": d.line([X0 + 2, Y1 - 2, X1 - 5, Y1 - 2], fill=GLOW[2] if on else GLOW[0])
    if c.broken: d.line([X0 + 2, Y1 - 1, X0 - 1, Y1 + 3], fill=(200, 60, 40))


reg("toaster", toaster, "mid-century", "pop-up toasters of about 11 by 7 in and electric kettles about 7 in across (Sunbeam T-20, Russell Hobbs K1)",
    states=("off", "on"), front=True, clear=.5, off=2)


CABWOOD = [ramp((110, 66, 40), 16), ramp((140, 60, 40), 16), ramp((190, 150, 100), 16), ramp((150, 96, 56), 16), WOOD, DARKWOOD]   # walnut, mahogany, blond, teak, oak, dark


def television(tm, x, y, w, h, st, v, c):
    """A television from above, its screen toward the room. Mid-Century: a wooden console cabinet with the tube's
    rounded back standing out behind and rabbit-ear aerials on top, a plastic portable with its carrying handle, or a
    wood-grain set on a trolley. Modern: a deep plastic box set with its tapered back on a cabinet, or a flat screen
    standing on its foot on a low media unit with a player and the remote. Future Darkness: a hair-thin panel on a
    wall bracket over a dark unit with a lit edge. On: the screen's blue light thrown on the floor in front;
    broken: the screen smashed, glass on the floor."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lv = int(v.get("livery", 0)) % 6; on = c.on and not c.broken; cx = X0 + W / 2
    glows = [(cx, Y1 + 10, 40, (.75, .95, 1.5))] if on else []
    if p == "M":
        if m in (0, 2, 3):                                                                                   # cabinet sets
            Cw = CABWOOD[lv] if m != 2 else ramp(mix(CABWOOD[lv][2], (150, 110, 70), .5), 14)
            bx0, bx1 = (X0 + 1, X1 - 1) if m == 0 else (X0 + W * .14, X1 - W * .14)
            d.rounded_rectangle([cx - W * .2, Y0, cx + W * .2, Y0 + H * .4], 6, fill=(60, 58, 56), outline=OUT)   # the tube's back
            case(d, bx0, Y0 + H * .25, bx1, Y1 - 1, Cw)
            d.line([bx0 + 3, Y1 - 4, bx1 - 3, Y1 - 4], fill=Cw[0])
            if m == 3:
                for q in (bx0 - 3, bx1 + 3): d.ellipse([q - 3, Y1 - 6, q + 3, Y1], fill=CHROME[2], outline=OUT)
            if m != 0 or c.w < 4:                                                                             # rabbit ears
                ax, ay = cx + 4, Y0 + H * .55
                for dx in (-1, 1): d.line([ax, ay, ax + dx * 16, Y0 + 1], fill=CHROME[3], width=1)
                d.ellipse([ax - 3, ay - 2, ax + 3, ay + 3], fill=(40, 40, 40), outline=OUT)
            if m == 0 and c.w >= 4: case(d, bx0 + 4, Y0 + H * .35, cx - 10, Y1 - 6, CABWOOD[(lv + 2) % 6]); case(d, cx + 10, Y0 + H * .35, bx1 - 4, Y1 - 6, CABWOOD[(lv + 2) % 6])   # radiogram lids
        else:                                                                                                # a portable
            bx0, bx1 = X0 + W * .2, X1 - W * .2
            d.rounded_rectangle([bx0 + 4, Y0 + 2, bx1 - 4, Y0 + H * .5], 5, fill=L[0], outline=OUT)
            case(d, bx0, Y0 + H * .3, bx1, Y1 - 2, L, r=4)
            d.rounded_rectangle([cx - 9, Y0 + H * .4, cx + 9, Y0 + H * .55], 2, outline=CHROME[3], width=2)
            d.line([bx1 - 6, Y0 + H * .4, bx1 + 6, Y0 + 2], fill=CHROME[3])
    elif p == "N":
        Cw = [WOOD, ramp((40, 40, 44), 8), ramp((200, 196, 186), 10), DARKWOOD, ramp((150, 150, 150), 10)][m]
        case(d, X0 + 1, Y0 + H * .3, X1 - 1, Y1 - 1, Cw)                                                       # the unit
        if m < 2:                                                                                            # a deep box set
            d.polygon([(cx - W * .18, Y0 + H * .5), (cx + W * .18, Y0 + H * .5), (cx + W * .1, Y0 + 1), (cx - W * .1, Y0 + 1)], fill=L[1], outline=OUT)
            case(d, cx - W * .26, Y0 + H * .45, cx + W * .26, Y1 - 4, L, r=2)
        else:                                                                                                # a flat screen on its foot
            d.rectangle([cx - W * .44, Y0 + H * .42, cx + W * .44, Y0 + H * .52], fill=L[1] if lv != 1 else (30, 30, 34), outline=OUT)
            d.rounded_rectangle([cx - 8, Y0 + H * .52, cx + 8, Y0 + H * .72], 2, fill=L[0], outline=OUT)
        d.rectangle([X0 + 5, Y1 - 6, X0 + 18, Y1 - 3], fill=(36, 36, 40), outline=OUT); lamp(d, X0 + 16, Y1 - 4, (90, 220, 120), on, 1)
        d.rectangle([X1 - 14, Y1 - 7, X1 - 10, Y1 - 2], fill=(30, 30, 34), outline=OUT)                    # the remote
    else:
        Cw = [L, c.alt, ramp((24, 24, 28), 8), L, c.alt][m]
        case(d, X0 + 1, Y0 + H * .4, X1 - 1, Y1 - 1, Cw, r=3)
        d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y0 + 5 + m], fill=(20, 22, 26), outline=OUT)                  # the panel on its bracket
        d.line([X0 + 4, Y1 - 3, X1 - 4, Y1 - 3], fill=GLOW[2] if on else GLOW[0])
    if c.broken:
        for k in range(5): d.rectangle([cx - 14 + k * 7, Y1 - 3 + (k % 2) * 2, cx - 12 + k * 7, Y1 - 2 + (k % 2) * 2], fill=(200, 216, 226))
        d.line([cx - 10, Y1 - 2, cx + 6, Y0 + H * .5], fill=OUT)
    return glows


reg("television", television, "mid-century", "console sets about 3 ft by 18 in (RCA 630-TS cabinet and 1950s consoles); flat screens 3 to 4 ft wide on their units",
    states=("off", "on"), front=True, clear=4, mount="wall", nvar=32)


def valve(d, x, y, lit, r=3):
    d.ellipse([x - r, y - r, x + r, y + r], fill=(150, 170, 176) if not lit else (230, 170, 90), outline=(90, 100, 110))
    d.rectangle([x - 1, y - 1, x, y], fill=(250, 220, 150) if lit else (210, 220, 226))


def wireless(tm, x, y, w, h, st, v, c):
    """A wireless set from above. Mid-Century: a 1920s breadboard set with its glass valves, coil and tuning dials
    and a horn loudspeaker beside; a wooden cabinet set with its cloth-backed fretwork and dial along the front; a
    bakelite or leather portable with its handle; a transistor radio with its aerial out. Modern: a boombox with
    two speakers and a tape door under its handle, or a clock radio with red figures. Future Darkness: a round
    speaker with a light ring. On: the valves glow, the dial lights."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    on = c.on and not c.broken; lv = int(v.get("livery", 0)) % 6
    if p == "M":
        if m == 0:                                                                                            # breadboard set and horn
            case(d, X0, Y0 + 2, X1 - 8, Y1 - 1, CABWOOD[lv])
            for k in range(3): valve(d, X0 + 5 + k * 6, Y0 + 7, on)
            d.ellipse([X0 + 3, Y1 - 9, X0 + 11, Y1 - 3], outline=COPPER[3], width=2)
            for k in (X0 + 15, X1 - 13): dial(d, k, Y1 - 6, 3, face=(30, 26, 24), needle=(230, 220, 200))
            d.ellipse([X1 - 11, Y0, X1, Y0 + 11], fill=L[2] if lv % 2 else BRASS[2], outline=OUT); d.ellipse([X1 - 8, Y0 + 3, X1 - 3, Y0 + 8], fill=(30, 26, 24))
        elif m in (1, 4):                                                                                     # a cabinet set
            case(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, CABWOOD[lv], r=4 if m == 4 else 1)
            d.rectangle([X0 + 3, Y1 - 5, X1 - 3, Y1 - 2], fill=(150, 120, 80) if m == 1 else L[2], outline=OUT)
            d.rectangle([X0 + W / 2 - 4, Y1 - 5, X0 + W / 2 + 4, Y1 - 2], fill=(240, 200, 110) if on else (190, 170, 130))
            for k in range(X0 + 5, X1 - 4, 4): d.line([k, Y0 + 3, k, Y0 + 6], fill=CABWOOD[lv][0])
        else:                                                                                                 # portable or transistor
            bx0, bx1 = (X0 + 2, X1 - 2) if m == 2 else (X0 + W * .25, X1 - W * .2)
            case(d, bx0, Y0 + 3, bx1, Y1 - 1, L, r=3)
            d.rectangle([bx0 + 3, Y0 + 6, bx1 - 3, Y0 + 12], fill=L[0])
            for k in range(int(bx0) + 4, int(bx1) - 3, 3): d.line([k, Y0 + 7, k, Y0 + 11], fill=L[3])
            dial(d, bx1 - 6, Y1 - 5, 3, face=(240, 200, 110) if on else (200, 190, 160))
            if m == 2: d.rounded_rectangle([bx0 + 6, Y0, bx1 - 6, Y0 + 4], 2, outline=L[0], width=2)
            else: d.line([bx1 - 2, Y0 + 3, X1 - 1, Y0 - 1], fill=CHROME[3])
    elif p == "N":
        if m < 3:                                                                                             # a boombox
            case(d, X0, Y0 + 3, X1, Y1 - 1, L, r=2)
            d.rounded_rectangle([X0 + 6, Y0, X1 - 6, Y0 + 4], 2, outline=CHROME[2] if m != 1 else L[0], width=2)
            for q in (X0 + 6, X1 - 6): d.ellipse([q - 5, Y0 + 6, q + 5, Y0 + 16], fill=(30, 30, 34), outline=CHROME[3]); d.ellipse([q - 2, Y0 + 9, q + 2, Y0 + 13], fill=CHROME[2])
            d.rectangle([X0 + W / 2 - 4, Y0 + 7, X0 + W / 2 + 4, Y0 + 13], fill=(60, 64, 74), outline=OUT)
            lamp(d, X0 + W / 2, Y1 - 4, (240, 80, 50), on, 1)
        else:                                                                                                 # a clock radio
            case(d, X0 + 2, Y0 + 3, X1 - 2, Y1 - 2, L, r=4)
            d.rectangle([X0 + 5, Y1 - 8, X0 + W * .55, Y1 - 4], fill=(30, 10, 10), outline=OUT)
            for k in range(3): d.rectangle([X0 + 6 + k * 3, Y1 - 7, X0 + 7 + k * 3, Y1 - 5], fill=(250, 60, 40) if on or m == 4 else (90, 30, 30))
            for k in range(int(X0 + W * .6), int(X1 - 4), 3): d.line([k, Y0 + 6, k, Y1 - 6], fill=L[0])
    else:
        cx, cy, r = X0 + W / 2, Y0 + H / 2, min(W, H) / 2 - 1
        if m % 2: case(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, L, r=6)
        else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L[2], outline=OUT)
        d.ellipse([cx - r * .6, cy - r * .6, cx + r * .6, cy + r * .6], outline=GLOW[2] if on else c.alt[1], width=2)
    if c.broken: d.line([X0 + 4, Y0 + 4, X0 + 12, Y1 - 4], fill=OUT)
    if on: return [(X0 + W / 2, Y0 + H / 2, 16, (1.3, 1.1, .8))]


reg("wireless", wireless, "mid-century", "wireless sets of about 18 by 12 in (1920s breadboard sets, Philco and Bush cabinet sets, Roberts portables)",
    states=("off", "on"), front=True, clear=1, off=2)


def telephone(tm, x, y, w, h, st, v, c):
    """A telephone on a desk, from above. Victorian: an open iron-frame set with its two brass bells and the
    handset across the cradle on top. Great War: a candlestick, its round foot, the mouthpiece on its column and the
    receiver hung on its hook. Mid-Century: a rotary-dial desk set, its handset across the top and the dial with
    its finger holes, in black, ivory, red, green or grey. Modern: a push-button set or a cordless handset in its
    base. Future Darkness: a dark slab with a lit face. In use: the handset lifted off on its curly cord."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    use = c.on; cx, cy = X0 + W / 2, Y0 + H / 2
    lv = int(v.get("livery", 0)) % 6
    hs = L if p in "MNF" else [ramp((40, 40, 44), 10), BRASS, CHROME, COPPER, DARKWOOD, ramp((70, 104, 72), 14)][lv]
    def handset(x0, y0, x1, y1, Cl):
        d.line([x0, y0, x1, y1], fill=OUT, width=5); d.line([x0, y0, x1, y1], fill=Cl[2], width=3)
        for q in ((x0, y0), (x1, y1)): d.ellipse([q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3], fill=Cl[2], outline=OUT)
    if p == "V":
        d.rectangle([X0 + 1, Y0 + 2 + m % 3, X1 - 1, Y1 - 1], fill=L[2], outline=OUT)
        for q in (X0 + 4, X1 - 4): d.ellipse([q - 3, Y1 - 6, q + 3, Y1], fill=[BRASS, CHROME, IRON, COPPER, BRASS][m][3 if c.w > 2 else 1], outline=OUT)
        if not use: handset(X0 + 3, Y0 + 4, X1 - 3, Y0 + 4, hs)
    elif p == "G":
        d.ellipse([X0 + 1 + m % 2, Y0 + 1 + m % 2, X1 - 1 - m % 2, Y1 - 1 - m % 2], fill=hs[3], outline=OUT); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=[IRON, BRASS, CHROME, IRON, BRASS][m][2 + m % 2], outline=OUT)
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(20, 20, 20))
        if m in (1, 3): d.ellipse([cx - 4, Y1 - 6, cx + 4, Y1], fill=WHITE[3], outline=OUT)
        if m in (2, 4): d.rectangle([X0, Y0, X1, Y0 + 3], fill=DARKWOOD[2], outline=OUT)                       # its bell box on the wall behind                    # a dial for the automatic exchange
        if not use: d.ellipse([X1 - 4, cy - 4, X1 + 1, cy + 3], fill=hs[2], outline=OUT)
    elif p == "F":
        case(d, X0 + 1 + m % 2, Y0 + 1, X1 - 1 - m % 2, Y1 - 1, L, r=3); d.rectangle([X0 + 5, Y0 + 4, X1 - 5, Y0 + 6 + m], fill=GLOW[1] if use else (20, 22, 26))
        return
    else:
        body = L
        if p == "N" and m >= 3:                                                                              # a cordless handset in its base
            case(d, X0 + 1, Y0 + 5, X1 - 1, Y1, c.alt, r=3); case(d, cx - 3, Y0 + 1, cx + 3, Y1 - 2, body, r=2)
            for j in range(3): d.rectangle([cx - 2, Y0 + 5 + j * 3, cx + 1, Y0 + 6 + j * 3], fill=body[4] if lv_ok(body) else (60, 60, 60))
            return
        case(d, X0 + 1, Y0 + 3, X1 - 1, Y1, body, r=3 if p == "M" else 2)
        if p == "M": d.ellipse([cx - 4, cy - 1, cx + 4, cy + 7], fill=WHITE[3] if m % 2 == 0 else CHROME[3], outline=OUT); d.ellipse([cx - 1, cy + 2, cx + 1, cy + 4], fill=body[1])
        else:
            for i in range(3):
                for j in range(2): d.rectangle([X0 + 3 + i * 3, cy + 1 + j * 3, X0 + 4 + i * 3, cy + 2 + j * 3], fill=body[4] if lv_ok(body) else (230, 230, 230))
        if not use: handset(X0 + 2, Y0 + 3, X1 - 2, Y0 + 3, body if m != 3 else c.alt)
    if use:                                                                                                    # the handset lifted and laid down, its cord curling
        d.line([X0 + 2, Y0 + 3, X0, Y1 - 2], fill=(40, 40, 40))
        handset(X0 + 2, Y1 - 3, X1 - 2, Y1 - 2, hs)
    if c.broken: d.line([X1 - 2, Y1 - 4, X1 + 2, Y1 + 2], fill=(40, 40, 40))


def lv_ok(Cl): return sum(Cl[2]) < 400


reg("telephone", telephone, "victorian", "desk telephones of about 8 to 9 in square (Ericsson 1890s, Western Electric candlestick and 500 set, GPO 706)",
    states=("off", "on"), front=True, clear=1, off=2)


def printer(tm, x, y, w, h, st, v, c):
    """A printer on its desk, from above. Mid-Century: a beige dot-matrix printer with its ribbon cover and
    platen knob, a fold of green-barred continuous paper with its sprocket holes feeding in behind and coming out
    over the top. Modern: a laser printer with the printed sheets in the well of its top, or a wide inkjet with its
    paper standing in the tray behind. Future Darkness: a dark slab with a lit slot. Printing: pages coming out and
    the lamp lit; broken: a jam, a crumpled sheet."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; on = c.on and not c.broken
    if p == "M":
        case(d, X0 + 1, Y0 + 6, X1 - 1, Y1 - 3, L, r=2)
        d.rectangle([X0 + 5, Y0 + 9, X1 - 9, Y0 + H * .55], fill=(40, 42, 48) if m % 2 else L[1], outline=OUT)   # ribbon cover
        d.ellipse([X1 - 6, Y0 + H * .4, X1, Y0 + H * .4 + 6], fill=(40, 40, 40), outline=OUT)
        pc = ramp((226, 236, 224), 8)
        d.rectangle([X0 + 4, Y0, X1 - 8, Y0 + 7], fill=pc[2], outline=OUT)                                     # paper feeding in
        for k in range(Y0 + 1, Y0 + 7, 2): d.point((X0 + 6, k), fill=OUT); d.point((X1 - 10, k), fill=OUT)
        for k in range(Y0 + 2, Y0 + 7, 3): d.line([X0 + 9, k, X1 - 13, k], fill=(150, 200, 160))
        lamp(d, X0 + 6, Y1 - 6, (90, 220, 90), on, 1)
        if on: d.rectangle([X0 + 6, Y1 - 4, X1 - 10, Y1], fill=pc[3], outline=OUT)
    elif p == "N":
        if m < 3:                                                                                             # laser
            case(d, X0 + 1, Y0 + 2, X1 - 1, Y1 - 1, L, r=2)
            d.rectangle([X0 + 6, Y0 + 5, X1 - 6, Y0 + H * .62], fill=L[0], outline=OUT)
            if on or m == 1: d.rectangle([X0 + 8, Y0 + 7, X1 - 8, Y0 + H * .58], fill=WHITE[3], outline=OUT); d.line([X0 + 11, Y0 + 10, X1 - 14, Y0 + 10], fill=(60, 60, 70))
            d.rectangle([X1 - 12, Y1 - 7, X1 - 4, Y1 - 3], fill=(40, 40, 46), outline=OUT); lamp(d, X1 - 8, Y1 - 5, (90, 220, 90), on, 1)
        else:                                                                                                 # inkjet
            d.rectangle([X0 + 8, Y0, X1 - 8, Y0 + 7], fill=WHITE[3], outline=OUT)
            case(d, X0 + 1, Y0 + 6, X1 - 1, Y1 - 5, L, r=4)
            d.rectangle([X0 + 4, Y0 + H * .45, X1 - 4, Y0 + H * .55], fill=L[0])
            if on: d.rectangle([X0 + 10, Y1 - 6, X1 - 10, Y1], fill=WHITE[3], outline=OUT)
    else:
        case(d, X0 + 2, Y0 + 3, X1 - 2, Y1 - 3, L, r=4 + m)
        d.line([X0 + 6, Y1 - 6, X1 - 6, Y1 - 6], fill=GLOW[2] if on else GLOW[0], width=2)
        if m % 2: d.rectangle([X0 + 8, Y0 + 7, X1 - 8, Y0 + 14], fill=c.alt[2], outline=OUT)
    if c.broken: d.polygon([(X0 + 10, Y1 - 6), (X0 + 22, Y1 - 4), (X0 + 18, Y1 + 2), (X0 + 8, Y1)], fill=WHITE[2], outline=OUT); lamp(d, X0 + 5, Y0 + 8, (240, 160, 40), True, 1)


reg("printer", printer, "mid-century", "desk printers of about 16 to 24 by 12 to 16 in (Epson MX-80, HP LaserJet 4)",
    states=("off", "on"), front=True, clear=1.5)


def switchboard(tm, x, y, w, h, st, v, c):
    """A telephone switchboard from above, its back to the wall: the tall cabinet of jacks behind, the keyshelf in
    front with its rows of cord plugs and keys, and the cords. Victorian: a varnished wooden magneto board with
    drop shutters and brass. Great War: a wooden lamp board in sections, one for each operator. Mid-Century: a grey
    steel or wooden cord board with its lamps. In use: the cords up in the jacks, lamps lit; idle: the plugs all
    sat in their rows."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lv = int(v.get("livery", 0)) % 6; on = c.on and not c.broken
    Cb = (CABWOOD[lv] if m in (0, 1, 3) else L) if p == "V" else CABWOOD[lv] if (p == "G" and m % 2) else (L if p == "G" else (L if m % 2 == 0 else CABWOOD[lv]))
    ns = (2, 3, 2, 3, 4)[m] if p != "V" else 1 + m % 2
    sw = (W - 2) / ns
    for i in range(ns):
        sx0, sx1 = X0 + 1 + i * sw, X0 + i * sw + sw
        case(d, sx0, Y0 + 1, sx1, Y0 + H * .42, Cb)                                                         # the jack cabinet's top
        d.rectangle([sx0 + 2, Y0 + H * .34, sx1 - 2, Y0 + H * .42], fill=(30, 28, 26))                       # the jack field's lip
        for k in range(int(sx0) + 4, int(sx1) - 3, 4):
            col = (250, 210, 90) if on and (k // 4 + i) % 3 == 0 else ((200, 160, 70) if p == "V" else (70, 66, 60))
            d.rectangle([k, Y0 + H * .36, k + 1, Y0 + H * .4], fill=col)
        case(d, sx0, Y0 + H * .44, sx1, Y1 - 1, [ramp(tone(Cb[2], 20), 14), ramp((60, 100, 70), 14), ramp((130, 50, 44), 14), ramp((44, 44, 48), 10), ramp((150, 110, 70), 14)][m])   # the keyshelf, wood or leathered
        for row, yy in enumerate((Y0 + H * .55, Y0 + H * .68)):
            for k in range(int(sx0) + 5, int(sx1) - 4, 5):
                if on and row == 0 and (k // 5 + i) % 2 == 0:
                    d.line([k, yy, k + 2, Y0 + H * .4], fill=[(200, 60, 40), (40, 40, 40), (60, 90, 170)][k % 3]); continue
                d.ellipse([k - 1, yy - 1, k + 2, yy + 2], fill=BRASS[3] if p != "M" else CHROME[3], outline=OUT)
        for k in range(int(sx0) + 6, int(sx1) - 6, 7): d.rectangle([k, Y1 - 7, k + 2, Y1 - 4], fill=(30, 30, 30))   # keys
        if p == "V":                                                                                       # drop shutters and the magneto crank
            for k in range(int(sx0) + 6, int(sx1) - 6, 8): d.ellipse([k, Y0 + 5, k + 5, Y0 + 10], fill=(30, 30, 30), outline=BRASS[2])
            d.rectangle([sx1 - 8, Y0 + H * .46, sx1 - 3, Y0 + H * .6], fill=IRON[2], outline=OUT); d.ellipse([sx1 - 9, Y0 + H * .58, sx1 - 2, Y0 + H * .66], fill=WOOD[3], outline=OUT)
    if c.broken:
        d.line([X0 + 20, Y0 + H * .6, X0 + 24, Y1 + 2], fill=(200, 60, 40)); d.line([X0 + 30, Y0 + H * .6, X0 + 36, Y1 + 1], fill=(40, 40, 40))


reg("switchboard", switchboard, "victorian", "cord switchboards of 2 to 3 positions, each about 2 ft wide, with a keyshelf 2 1/2 ft deep (Western Electric No. 1 and GPO CB boards)",
    states=("off", "on"), front=True, clear=4, mount="wall")


# ================================================================ streets and services
BANK = [(200, 40, 40), (30, 70, 150), (40, 130, 70), (240, 190, 40), (90, 40, 110), (230, 110, 30)]   # a bank's or a firm's signage colour


def cashmachine(tm, x, y, w, h, st, v, c):
    """A cash machine set in its wall, from above: the bank's coloured fascia band along the wall, the steel
    surround standing out, the hood over the screen, the sloped ledge with its keypad, the card slot's light and the
    cash slot. Mid-Century: a heavy steel through-the-wall unit with big keys and no screen. Modern: a screen under a
    hood, a keypad and a receipt slot. Future Darkness: a dark slab with a palm plate and a lit band. Open: the safe
    door swung out on the cassettes of notes; broken: the screen smashed, the keypad prised off."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; bank = ramp(BANK[lv], 18); on = not c.broken
    d.rectangle([X0, Y0, X1, Y0 + 5], fill=bank[2], outline=OUT); glyphs(d, X0 + 6, Y0 + 2, X0 + W * .6, Y0 + 3, bank[4])
    surround = [STEEL, ramp((60, 62, 68), 10), CHROME, ramp((190, 190, 186), 10), bank][m] if p != "F" else ramp(mix(BANK[lv], (30, 32, 38), .55), 10)
    case(d, X0 + 3, Y0 + 5, X1 - 3, Y1 - 1, surround)
    if c.open:
        d.rectangle([X0 + 6, Y0 + 7, X1 - 6, Y1 - 3], fill=(30, 30, 34), outline=OUT)
        for k in range(4): d.rectangle([X0 + 9 + k * (W - 18) / 4, Y0 + 9, X0 + 6 + (k + 1) * (W - 18) / 4, Y1 - 5], fill=(90, 140, 90) if k % 2 else (190, 160, 110), outline=OUT)
        d.line([X0 + 3, Y1, X0 + 1, Y1 + W * .3], fill=OUT, width=5); d.line([X0 + 3, Y1, X0 + 1, Y1 + W * .3], fill=surround[2], width=3)
        return
    if p == "M":
        d.rectangle([X0 + 8, Y0 + 8, X0 + W * .45, Y0 + 12], fill=(30, 30, 34), outline=OUT)
        for i in range(4):
            for j in range(2): d.rectangle([X0 + W * .52 + i * 5, Y0 + 8 + j * 5, X0 + W * .52 + i * 5 + 3, Y0 + 11 + j * 5], fill=WHITE[3], outline=OUT)
    elif p == "N":
        screen(d, X0 + 8, Y0 + 7, X0 + W * .55, Y0 + 12, on, c.broken)
        for i in range(3):
            for j in range(2): d.rectangle([X0 + W * .6 + i * 4, Y0 + 9 + j * 3, X0 + W * .6 + i * 4 + 2, Y0 + 10 + j * 3], fill=(200, 200, 196))
    else:
        d.rectangle([X0 + 8, Y0 + 7, X1 - 8 - 4 * m, Y0 + 12], fill=(16, 18, 22), outline=OUT); d.line([X0 + 9, Y0 + 9, X1 - 9 - 4 * m, Y0 + 9], fill=GLOW[2] if on else GLOW[0])
        d.ellipse([X0 + W / 2 - 4, Y1 - 7, X0 + W / 2 + 4, Y1 - 1], fill=GLOW[1] if on else COMPOSITE[1], outline=OUT)
    if p != "F":
        d.rectangle([X0 + 8, Y1 - 5, X0 + W * .4, Y1 - 3], fill=(20, 20, 22))                                   # cash slot
        d.rectangle([X1 - 14, Y1 - 6, X1 - 8, Y1 - 3], fill=(20, 20, 22)); d.rectangle([X1 - 13, Y1 - 5, X1 - 9, Y1 - 4], fill=(90, 230, 120) if on else (60, 40, 40))
    if c.broken and p != "F": d.rectangle([X0 + W * .62, Y1 - 2, X0 + W * .62 + 6, Y1 + 2], fill=(50, 50, 54), outline=OUT)


reg("cashmachine", cashmachine, "mid-century", "through-the-wall cash machines with a fascia about 2 1/2 ft wide standing a foot out (Barclaycard 1967 machine; NCR 5070)",
    states=("closed", "open"), openable="chest", front=True, clear=3, mount="wall")


PHONECO = [(200, 30, 30), (170, 176, 180), (60, 120, 70), (40, 70, 150), (230, 180, 40), (60, 60, 64)]    # the phone company's colour


def payphone(tm, x, y, w, h, st, v, c):
    """A public telephone on its wall, from above. Victorian and Great War: a varnished wooden wall set with its
    two bell gongs, the crank, the receiver on its hook and a coin box below. Mid-Century: a steel coin telephone in
    the company's colour (red, silver, green, blue, yellow or black) under a curved acoustic hood. Modern: a card and
    coin phone with a little display under a square hood. Future Darkness: a gutted kiosk or a touch-screen post.
    In use: the receiver lifted, hanging on its cord; broken: the handset torn off, the cord dangling."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; co = ramp(PHONECO[lv], 18); use = c.on; cx = X0 + W / 2
    if p in "VG":
        Cw = [CABWOOD[0], CABWOOD[2], ramp((40, 40, 44), 10), CABWOOD[1], ramp((60, 100, 70), 14), CHROME][lv]
        case(d, X0 + 3, Y0, X1 - 3, Y1 - 3, Cw)
        for q in (cx - 6, cx + 6): d.ellipse([q - 4, Y0 + 2, q + 4, Y0 + 10], fill=BRASS[3] if c.w > 1 else STEEL[3], outline=OUT)
        d.rectangle([X1 - 4, Y0 + 6, X1, Y0 + 9], fill=IRON[2], outline=OUT); d.ellipse([X1 - 2, Y0 + 9, X1 + 1, Y0 + 13], fill=WOOD[3])     # crank
        d.ellipse([cx - 3, Y1 - 9, cx + 3, Y1 - 3], fill=(30, 30, 30), outline=OUT)                            # mouthpiece
        if p == "G" or m % 2: case(d, cx - 8, Y1 - 6, cx + 8, Y1, IRON if m < 3 else BRASS)                     # coin box
        hk = (X0 + 3, Y0 + 10)
    elif p in "MN":
        hood = co if p == "M" or m % 2 else ramp((190, 190, 186), 10)
        if p == "M" and m % 2 == 0: d.pieslice([X0, Y0 - H * .6, X1, Y1], 0, 180, fill=hood[2], outline=OUT); d.arc([X0 + 2, Y0 - H * .6 + 2, X1 - 2, Y1 - 2], 20, 160, fill=hood[3])
        elif p == "M": case(d, X0 + 2, Y0, X1 - 2, Y1 - 4, hood, r=4)
        else: case(d, X0, Y0, X1, Y1 - 2, hood)
        case(d, cx - 8, Y0 + 2, cx + 8, Y1 - 4, co if p == "N" else ramp(tone(co[2], -30), 16), r=2)
        if p == "N": d.rectangle([cx - 5, Y0 + 4, cx + 5, Y0 + 7], fill=(120, 170, 120) if not c.broken else (30, 30, 30))
        else: d.ellipse([cx - 4, Y0 + 5, cx + 4, Y0 + 13], fill=CHROME[3], outline=OUT)
        hk = (cx - 8, Y0 + 6)
    else:
        if m % 2:                                                                                              # a gutted old kiosk
            case(d, X0 + 1, Y0, X1 - 1, Y1 - 1, ramp(mix(co[2], GREY, .3), 14)); d.rectangle([X0 + 6, Y0 + 4, X1 - 6, Y1 - 5], fill=(40, 40, 42))
            cable(d, [(cx, Y0 + 4), (cx + 2, Y1 - 3)], (30, 30, 30), 1); return
        case(d, X0 + 2 + 2 * (m % 3), Y0, X1 - 2 - 2 * (m % 3), Y1 - 2, ramp(mix(co[2], (40, 42, 50), .5), 12), r=3); screen(d, cx - 5, Y0 + 3, cx + 5, Y1 - 6, not c.broken, c.broken, tint=co[2])
        return
    if c.broken:
        cable(d, [hk, (hk[0] - 2, Y1 + 2)], (30, 30, 30), 1); return
    if use:
        cable(d, [hk, (hk[0] - 3, Y1 - 4), (hk[0] + 2, Y1 - 2)], (30, 30, 30), 1)
        d.rectangle([hk[0] - 2, Y1 - 3, hk[0] + 7, Y1 + 1], fill=(30, 30, 30) if p != "N" else co[1], outline=OUT)
    else:
        d.rectangle([hk[0] - 2, hk[1] - 2, hk[0] + 1, hk[1] + 9], fill=(30, 30, 30) if p != "N" else co[1], outline=OUT)


reg("payphone", payphone, "victorian", "wall pay telephones about 9 in by 6 in under a hood of 18 by 12 in (Western Electric 50A pay station, GPO coin boxes)",
    states=("off", "on"), front=True, clear=3, mount="wall")


PAPER = [(30, 80, 160), (200, 40, 40), (240, 200, 40), (40, 120, 70), (230, 230, 226), (40, 40, 44)]


def newsbox(tm, x, y, w, h, st, v, c):
    """A newspaper box on the pavement, from above: the box in the paper's own colour on its pedestal, its top
    sloping down to the window at the front through which the front page shows, the coin slot and the pull handle.
    Mid-Century: a wooden honour box or a pressed-steel box. Modern: a steel or plastic box, often two or three
    side by side. Future Darkness: a battered dark box with a lit screen in the window. Open: the door down on the
    stack of papers; broken: the window smashed, the box tipped."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; n = 2 if (p == "N" and m in (2, 4)) else 1
    for i in range(n):
        bx0, bx1 = X0 + 1 + i * (W - 2) / n, X0 + (i + 1) * (W - 2) / n
        B = ramp(PAPER[(lv + i * 2) % 6], 16) if not (p == "M" and m == 0) else WOOD
        if p == "F": B = ramp(mix(PAPER[lv], (40, 40, 44), .35), 12)
        case(d, bx0, Y0 + 1, bx1, Y1 - 1, B, r=2)
        wy0 = Y0 + H * .45
        if c.open:
            d.rectangle([bx0 + 3, wy0, bx1 - 3, Y1 - 4], fill=(230, 228, 218), outline=OUT)
            for k in range(int(wy0) + 3, int(Y1) - 5, 3): d.line([bx0 + 5, k, bx1 - 5, k], fill=(150, 146, 140))
            d.rectangle([bx0 + 2, Y1, bx1 - 2, Y1 + 4], fill=B[1], outline=OUT)
        else:
            d.rectangle([bx0 + 3, wy0, bx1 - 3, Y1 - 4], fill=(170, 190, 200) if p != "F" else (20, 26, 30), outline=OUT)   # the window
            if p == "F": d.rectangle([bx0 + 5, wy0 + 2, bx1 - 5, Y1 - 6], fill=GLOW[1] if not c.broken else (20, 20, 20))
            else:
                d.rectangle([bx0 + 5, wy0 + 2, bx1 - 5, Y1 - 6], fill=(232, 230, 222))
                d.rectangle([bx0 + 6, wy0 + 3, bx1 - 6, wy0 + 5], fill=(30, 30, 30)); d.rectangle([bx0 + 6, wy0 + 7, bx0 + (bx1 - bx0) / 2, Y1 - 8], fill=(120, 120, 126))
        d.rectangle([bx1 - 9, Y0 + 4, bx1 - 4, Y0 + 7], fill=CHROME[2], outline=OUT)                           # coin slot
        glyphs(d, bx0 + 4, Y0 + 4, bx1 - 11, Y0 + 6, B[4] if sum(B[2]) < 450 else B[0])
    if c.broken: screen(d, X0 + 4, Y0 + H * .45, X0 + W / 2, Y1 - 4, False, True, glare=False)


reg("newsbox", newsbox, "mid-century", "newspaper vending boxes of about 16 to 20 in square (K-Jack and Sho-Rack boxes)",
    states=("closed", "open"), front=True, clear=2)


def parkingmeter(tm, x, y, w, h, st, v, c):
    """A parking meter from above, on its post at the kerb. Mid-Century: a domed meter head with its glass window
    and the red flag of an expired meter or the pointer of paid time, sometimes two heads on one post. Modern: a
    pay-and-display machine with its solar panel on top and keypad. Future Darkness: a slim dark post with a lit
    screen. On: time paid, the window green; off: expired, the red flag up."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cx, cy = X0 + W / 2, Y0 + H / 2; paid = c.on
    if p == "M":
        heads = [(cx, cy)] if m != 1 else [(cx - 3, cy), (cx + 3, cy)]
        for hx, hy in heads:
            r = 6 if len(heads) == 1 else 3.5
            if m == 2: case(d, hx - r, hy - r, hx + r, hy + r, L, r=2)
            else: d.ellipse([hx - r, hy - r, hx + r, hy + r + (1 if m != 3 else -2)], fill=L[2], outline=OUT); d.arc([hx - r + 1, hy - r + 1, hx + r - 1, hy + r - 1], 200, 290, fill=L[4])
            if m == 4: d.line([hx - r + 1, hy - 1, hx + r - 1, hy - 1], fill=YEL[3])
            d.rectangle([hx - 2, hy + 2, hx + 1, hy + 3], fill=(90, 210, 110) if paid else (220, 40, 30))
    elif p == "N" and m in (1, 2):                                                                               # an electronic meter head with its screen
        d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=L[2], outline=OUT); d.rectangle([cx - 3, cy - 1, cx + 3, cy + 2], fill=(130, 170, 140) if m == 1 else (40, 50, 60), outline=OUT)
        d.rectangle([cx - 1, cy + 3, cx + 1, cy + 4], fill=(90, 210, 110) if paid else (220, 40, 30))
    elif p == "N":
        case(d, X0, Y0, X1, Y1, L if m != 3 else ramp((40, 90, 160), 16), r=1)
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 5], fill=(30, 40, 80), outline=OUT)                          # solar panel
        d.rectangle([X0 + 3, Y1 - 5, X1 - 3, Y1 - 2], fill=(90, 200, 120) if paid else (40, 60, 50))
    else:
        if m % 2: case(d, X0 + 2, Y0 + 1, X1 - 2, Y1 - 1, L, r=2)
        else: d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=L[2], outline=OUT)
        d.rectangle([cx - 2, cy + 2, cx + 1, cy + 3], fill=GLOW[2] if paid else (200, 40, 50))
    if c.broken: d.line([X0, Y1, X1, Y0], fill=OUT, width=2)


reg("parkingmeter", parkingmeter, "mid-century", "parking meters with heads about 8 in across on a 4 ft post (Park-O-Meter 1935, Duncan meters); pay-and-display machines about 1 ft square",
    states=("off", "on"), front=True, clear=1, off=3)


SIG = {"red": (240, 40, 30), "amber": (250, 170, 30), "green": (40, 220, 110)}


def trafficlight(tm, x, y, w, h, st, v, c):
    """A traffic light from above at the kerb: the post's foot, the signal head's top with its three visors
    standing out toward the road, and the lit lamp's colour falling on the ground in front. Mid-Century: early
    heads in green or black, some with a bell, some the round-topped tower kind; Modern: yellow, black or grey
    heads, upright or laid sideways, with a push-button box for walkers; Future Darkness: a slim dark head with a
    lit strip. Which lamp is lit (red, amber, green) is its own axis; off: all dark."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6
    hc = ramp([(230, 190, 30), (36, 38, 40), (60, 100, 70), (150, 154, 156), (200, 204, 196), (110, 104, 60)][lv], 14)   # yellow, black, green, grey, white, olive heads
    if p == "F": hc = c.liv
    lit = c.on and not c.broken; sig = v.get("show", "red"); cx = X0 + W / 2
    d.ellipse([cx - 3, Y0 + 1, cx + 3, Y0 + 7], fill=STEEL[2], outline=OUT)                                     # the post
    if p == "M" and m == 0:                                                                                     # the early semaphore kind: two arms
        d.ellipse([cx - 4, Y0 + 3, cx + 4, Y0 + 11], fill=hc[2], outline=OUT)
        d.rectangle([X0 + 1, Y0 + 6, cx - 3, Y0 + 9], fill=(200, 40, 30) if sig != "green" or not lit else (40, 160, 80), outline=OUT)
        d.rectangle([cx + 3, Y0 + 6, X1 - 1, Y0 + 9], fill=WHITE[3], outline=OUT)
        d.ellipse([cx - 6, Y1 - 8, cx + 6, Y1 - 1], fill=hc[1], outline=OUT)                                      # its pedestal in the road
    elif p == "M" and m == 2:                                                                                   # a four-way tower head
        d.ellipse([cx - 7, Y0 + 2, cx + 7, Y0 + 16], fill=hc[2], outline=OUT)
        for a in range(4): d.arc([cx - 8, Y0 + 1, cx + 8, Y0 + 17], a * 90 + 20, a * 90 + 70, fill=hc[0], width=2)
        if lit: d.rectangle([cx - 2, Y0 + 14, cx + 2, Y0 + 16], fill=SIG.get(sig, SIG["red"]))
    elif m in (1, 3) and p != "F":                                                                             # laid sideways: three visors in a row
        case(d, X0 + 1, Y0 + 4, X1 - 1, Y0 + 10, hc)
        for i, k in enumerate(("red", "amber", "green")):
            vx = X0 + 4 + i * (W - 8) / 3 + 1
            d.arc([vx - 1, Y0 + 7, vx + (W - 8) / 3 - 1, Y1 - 3], 0, 180, fill=hc[1], width=2)
            if lit and k == sig: d.rectangle([vx + 1, Y0 + 11, vx + (W - 8) / 3 - 3, Y0 + 12], fill=SIG[k])
    else:                                                                                                      # upright: the top visor over the lamps
        if p == "N" and m in (0, 4): d.rectangle([cx - 8, Y0 + 2, cx + 8, Y0 + 6], fill=(30, 30, 30), outline=(240, 240, 236))   # its backing board
        case(d, cx - 5, Y0 + 3, cx + 5, Y0 + 13, hc)
        d.arc([cx - 6, Y0 + 8, cx + 6, Y1 - 1], 0, 180, fill=hc[1], width=2)
        if lit: d.rectangle([cx - 3, Y0 + 13, cx + 3, Y0 + 14], fill=SIG.get(sig, SIG["red"]))
        if p == "F": d.line([cx - 4, Y0 + 5, cx + 4, Y0 + 5], fill=GLOW[2] if lit else GLOW[0])
    if m == 4 or (p == "M" and m == 2): d.rectangle([X1 - 5, Y0 + 1, X1 - 1, Y0 + 5], fill=(230, 190, 30) if p != "M" else BRASS[3], outline=OUT)   # push button or bell
    if c.broken: d.line([X0 + 2, Y0 + 3, X1 - 3, Y0 + 12], fill=hc[0], width=2)
    if lit: return [(cx, Y1 + 6, 22, {"red": (1.5, .7, .6), "amber": (1.5, 1.1, .5), "green": (.7, 1.5, .9)}.get(sig, (1.5, .7, .6)))]


reg("trafficlight", trafficlight, "mid-century", "signal heads about 1 ft square with 8 to 12 in lamps on a post (Garrett Morgan and Harris signals 1920s; BS 505 heads)",
    states=("on", "off"), front=True, clear=1, axes={"show": ["red", "amber", "green"]})


def firealarm(tm, x, y, w, h, st, v, c):
    """A fire alarm on its wall, from above: its backing plate, the round gong or sounder standing out and the call
    point or pull box beside it. Victorian: a brass, nickel or japanned gong on a varnished board with a pull handle
    on its chain. Great War: a red gong and a cast pull box with its little glass. Mid-Century: a red or chrome bell
    and a round break-glass box. Modern: a square red call point and a red or white sounder with its beacon.
    Future Darkness: a dark sounder plate with a lit ring. Ringing: the lamp lit and the glass broken."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; ring = c.on
    BLK, CRM, GRY, BRZ = ramp((40, 40, 44), 10), ramp((200, 196, 186), 10), ramp((126, 132, 132), 10), ramp((150, 100, 50), 16)
    plate = {"V": [CABWOOD[0], CABWOOD[2], BLK, CABWOOD[1], ramp((60, 100, 70), 14), CRM][lv], "G": [CABWOOD[0], RED, IRON, CABWOOD[2], CRM, ramp((60, 100, 70), 14)][lv],
             "M": [RED, CHROME, WHITE, CRM, GRY, BLK][lv], "N": [RED, WHITE, CRM, GRY, CHROME, BLK][lv], "F": ramp(LIV["F"][lv], 12)}[p]
    gong = {"V": [BRASS, CHROME, IRON, COPPER, BRZ][m], "G": [RED, BRASS, CHROME, BLK, BRZ][m], "M": [RED, CHROME, BRASS, BLK, CRM][m],
            "N": [RED, WHITE, RED, CHROME, WHITE][m], "F": [ramp((40, 40, 46), 10), RED, WHITE, BLK, ramp((90, 30, 40), 12)][m]}[p]
    left = m % 2 == 0
    d.rectangle([X0, Y0, X1, Y1 - 1], fill=plate[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=plate[4])   # the backing board
    gx0 = X0 + 1 if left else X1 - 10; bx0 = X1 - 8 if left else X0 + 1
    d.line([X0 + 9, Y1 - 3, X1 - 9, Y1 - 3], fill=(GRY if p != "V" else BRASS)[1])                               # the conduit or bell wire
    gx = gx0 + 4
    if p == "N" and m in (1, 3): d.rectangle([gx - 4, Y0 + 1, gx + 4, Y1 - 1], fill=gong[2], outline=OUT); d.rectangle([gx - 1, Y0 + 2, gx + 1, Y0 + 3], fill=(250, 80, 60) if ring else (120, 40, 40))
    else: d.ellipse([gx - 3, Y0 + 1, gx + 3, Y1 - 2], fill=gong[2], outline=OUT); d.point((gx - 1, Y0 + 2), fill=gong[4])
    bx = bx0 + 4.5
    box = RED if p != "F" else ramp((40, 40, 46), 10)
    if p == "V": d.line([bx, Y0 + 1, bx, Y1], fill=IRON[3]); d.rectangle([bx - 2, Y1 - 2, bx + 2, Y1], fill=WOOD[3])
    else:
        d.rectangle([bx - 2, Y0 + 1, bx + 2, Y1 - 2], fill=box[2] if plate is not RED else box[3], outline=OUT)
        d.point((bx, Y0 + 3), fill=(220, 230, 236) if not ring else (60, 40, 40))
    if p == "F": d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=(255, 60, 50) if ring else (90, 30, 30))
    if ring: return [(X0 + W / 2, Y1 + 4, 14, (1.5, .7, .6))]


reg("firealarm", firealarm, "victorian", "an alarm gong of 6 to 8 in and its pull box or call point side by side on the wall, about 1 1/2 ft in all (Gamewell and Grinnell fire alarm stations)",
    ft=((1.2, 1.8), (.3, .45)),
    states=("off", "on"), front=True, clear=2, mount="wall", off=2)


def extinguisher(tm, x, y, w, h, st, v, c):
    """A fire extinguisher from above on its wall bracket: the round body, the valve and its handle on top, the
    hose curled round. Great War: a copper or brass soda-acid one with its domed cap. Mid-Century: a red one, or the
    chrome and brass kind. Modern: red with the band of its kind (cream foam, black gas, blue powder, red water,
    green). Future Darkness: a dark grey cylinder with a lit band. Broken: knocked down, lying on its side."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; cx, cy = X0 + W / 2, Y0 + H / 2
    body = {"G": [COPPER, BRASS, RED, CHROME, ramp((40, 40, 44), 10), ramp((150, 100, 50), 16)], "M": [RED, CHROME, BRASS, ramp((210, 200, 170), 10), ramp((40, 40, 44), 10), ramp((40, 80, 170), 14)],
            "N": [RED] * 6, "F": [ramp(q, 12) for q in LIV["F"]]}[p][lv]
    band = [(236, 220, 170), (30, 30, 30), (40, 80, 180), (200, 40, 40), (40, 130, 70), (230, 190, 40)][lv]
    if c.broken:
        case(d, X0, cy - 4, X1, cy + 4, body, r=4); d.rectangle([X1 - 4, cy - 2, X1, cy + 2], fill=(30, 30, 30)); return
    r = W / 2 - 1 - (m % 3)
    if m == 4: d.ellipse([X0, Y0 + 1, X0 + 5, Y0 + 6], fill=(30, 30, 30), outline=OUT)                           # the horn of a gas one
    d.rectangle([cx - 4, Y0, cx + 4, Y0 + 2], fill=STEEL[1], outline=OUT)                                     # the bracket
    if p == "F" and m % 2: case(d, cx - r, cy - r, cx + r, cy + r, body, r=2)
    else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=body[2], outline=OUT)
    if p == "N": d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=band, width=2)
    if p == "F": d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=GLOW[1] if c.on else GLOW[0], width=1)
    if p == "G": d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=body[4], outline=OUT)
    else:
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(30, 30, 30)); d.line([cx, cy, cx + 4, cy - 3], fill=(30, 30, 30), width=2)
        d.arc([cx - r - 1, cy - 2, cx + 2, cy + r + 1], 90, 200, fill=(20, 20, 20), width=2)                  # the hose


reg("extinguisher", extinguisher, "great-war", "hand extinguishers about 7 in across and 2 ft tall on a wall bracket (Minimax and Pyrene; BS EN 3 colour coding)",
    front=True, clear=2, mount="wall", off=2, nvar=32)


BRAND = [(200, 30, 30), (240, 200, 40), (30, 90, 170), (40, 130, 70), (230, 230, 226), (230, 110, 30)]


def fuelpump(tm, x, y, w, h, st, v, c):
    """A petrol pump from above. Great War: a visible-measure pump on its square plinth, the tall glass cylinder
    with the red petrol in it and the lit glass globe of the brand on top. Mid-Century: a clock-face or computing
    pump in the company's colours with a rounded top and its globe, the hose and nozzle hung on its side. Modern: a
    dispenser on a raised island with bollards, hoses both sides and its display. Future Darkness: a charging post
    with its cable and a lit ring. In use: the nozzle out on its hose and the display lit."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; B = ramp(BRAND[lv], 16); use = c.on and not c.broken; cx, cy = X0 + W / 2, Y0 + H / 2
    if p in "NF" or m == 4: case(d, X0, Y0 + 2, X1, Y1 - 2, CONC); hazard(d, X0 + 2, Y0 + 3, X0 + 8, Y0 + 9, 2); hazard(d, X1 - 8, Y1 - 9, X1 - 2, Y1 - 3, 2)
    if p == "G":
        case(d, cx - 13, cy - 13, cx + 13, cy + 13, B if m % 2 else IRON)                                       # the plinth and its column
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(200, 216, 220), outline=OUT); d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(200, 60, 40) if m != 2 else (230, 180, 60))
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=B[3] if use or c.w > 2 else B[2], outline=OUT); d.ellipse([cx - 2, cy - 3, cx + 1, cy], fill=B[4])   # the globe
        d.line([cx - 13, cy + 8, X0 + 2, Y1 - 2], fill=(30, 30, 30), width=2)
    elif p == "M":
        if m != 4: case(d, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, CONC)                                               # its island
        case(d, cx - 12, cy - 9, cx + 12, cy + 11, B, r=6)
        d.rectangle([cx - 9, cy + 4, cx + 9, cy + 11], fill=WHITE[3], outline=OUT)                              # the dial face's top
        d.ellipse([cx - 5, cy - 6, cx + 5, cy + 4], fill=WHITE[3] if lv != 4 else B[0], outline=OUT); d.ellipse([cx - 3, cy - 4, cx + 3, cy + 2], fill=B[3])
        hx = cx + 13
    elif p == "N":
        case(d, cx - 8, Y0 + 5, cx + 8, Y1 - 5, B if m % 2 else ramp((200, 200, 196), 10))
        d.rectangle([cx - 6, cy - 3, cx + 6, cy + 3], fill=(30, 30, 34), outline=OUT); d.rectangle([cx - 4, cy - 1, cx + 4, cy + 1], fill=(90, 230, 120) if use else (40, 50, 44))
        d.rectangle([cx - 8, Y0 + 5, cx + 8, Y0 + 9], fill=B[2] if m % 2 == 0 else WHITE[3], outline=OUT)
        hx = cx + 9
    else:
        case(d, cx - 6 - m, cy - 9, cx + 6 + m, cy + 9, ramp(mix(BRAND[lv], (40, 44, 52), .55), 10), r=4); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], outline=(B[3] if use else B[0]), width=2)
        hx = cx + 7
    if p != "G":
        if use: cable(d, [(hx, cy), (hx + 4, Y1 - 4), (cx, Y1)], (30, 30, 30), 2); d.rectangle([cx - 3, Y1 - 3, cx + 2, Y1], fill=B[1] if p != "F" else (40, 40, 44), outline=OUT)
        else: cable(d, [(hx, cy - 5), (hx + 3, cy + 6)], (30, 30, 30), 2); d.rectangle([hx - 1, cy - 8, hx + 3, cy - 3], fill=B[1], outline=OUT)
    if c.broken: d.line([cx - 10, cy - 10, cx + 10, cy + 10], fill=OUT, width=2); d.ellipse([X0 + 2, Y1 - 8, X0 + 14, Y1 - 2], fill=(90, 70, 60))
    if use and p in "GF": return [(cx, cy, 20, (1.3, 1.2, 1.0))]


reg("fuelpump", fuelpump, "great-war", "petrol pumps on a plinth of about 18 to 24 in (Gilbarco and Wayne pumps; modern dispensers on 2 ft islands)",
    states=("off", "on"), front=True, clear=4)


def turnstile(tm, x, y, w, h, st, v, c):
    """A turnstile from above across a passage. Victorian and Great War: a cast-iron cross of four arms on its post
    between railings, a counting box on the rich one. Mid-Century: a waist-high steel cabinet with three arms, one
    barring the way. Modern: glass paddle gates closing from two cabinets, with a reader lit green or red. Future
    Darkness: dark posts with a beam of light across. Open: the arm dropped or the paddles drawn back."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    cy = Y0 + H / 2; opn = c.open
    if p in "VG":
        for yy in (Y0 + 1, Y1 - 2): d.rectangle([X0, yy, X1, yy + 2], fill=L[2], outline=OUT)                  # railings
        cx = X0 + W * (.4 + .1 * (m % 3))
        a0 = .0 if not opn else math.pi / 4
        for k in range(4):
            a = a0 + k * math.pi / 2; d.line([cx, cy, cx + math.cos(a) * H * .45, cy + math.sin(a) * H * .45], fill=OUT, width=4)
            d.line([cx, cy, cx + math.cos(a) * H * .45, cy + math.sin(a) * H * .45], fill=L[3], width=2)
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=c.trim[2], outline=OUT)
        if c.rich or m == 4: case(d, X0 + 2, cy - 5, X0 + 14, cy + 5, CABWOOD[m] if p == "V" else L)
    elif p == "M":
        case(d, X0 + 1, Y0 + 1, X0 + W * .42, Y1 - 1, L, r=2)
        d.rectangle([X0 + 4, Y0 + 3, X0 + W * .42 - 3, Y1 - 3], fill=[CHROME, STEEL, L, ramp((40, 40, 44), 10), BRASS][m][2 if m != 2 else 3], outline=OUT)   # its top plate
        ax, ay = X0 + W * .42, cy
        for k, a in enumerate((0, 2.1, 4.2)):
            a = a + (math.pi / 2 if opn else 0)
            if k == 0 and not opn: d.line([ax, ay, X1 - 3, ay], fill=OUT, width=4); d.line([ax, ay, X1 - 3, ay], fill=CHROME[3], width=2)
            else: d.line([ax, ay, ax + math.cos(a) * 10, ay + math.sin(a) * 7], fill=CHROME[2], width=2)
        d.rectangle([X0 + 4, Y0 + 4, X0 + 10, Y0 + 8], fill=(30, 30, 30))
        if m in (1, 3): case(d, X0 + 12, Y0 + 3, X0 + 20, Y1 - 3, BRASS)                                          # a coin box
        if m == 4: d.line([X0 + 2, Y1 - 1, X1 - 2, Y1 - 1], fill=CHROME[3], width=2)                               # the lane's rail
    else:
        cw = 13 + 2 * (m % 3)
        for bx0 in (X0 + 1, X1 - cw - 1):
            case(d, bx0, Y0 + 1, bx0 + cw, Y1 - 1, L if p == "N" else ramp(mix(L[2], (30, 32, 40), .4), 10), r=2)
            if m >= 3: d.rectangle([bx0 + 3, Y0 + 4, bx0 + cw - 3, Y1 - 4], fill=(170, 210, 220) if p == "N" else c.alt[1], outline=OUT)
        if p == "N":
            lamp(d, X0 + 5, Y0 + 5, (90, 230, 120) if opn else (240, 60, 40), True, 2)
            if not opn:
                for bx, dx in ((X0 + cw + 1, 1), (X1 - cw - 1, -1)): d.rectangle(sorted([bx, bx + dx * (W / 2 - 11)]) and [min(bx, bx + dx * (W / 2 - 11)), cy - 2, max(bx, bx + dx * (W / 2 - 11)), cy + 2], fill=(170, 210, 220), outline=(100, 140, 150))
        else:
            if not opn: d.line([X0 + cw + 1, cy, X1 - cw - 1, cy], fill=GLOW[2], width=2)
            for bx in (X0 + 5, X1 - 5): d.line([bx, Y0 + 3, bx, Y1 - 3], fill=GLOW[1] if opn else (200, 60, 70))
    if c.broken: d.line([X0 + W * .6, Y0 + 2, X0 + W * .7, Y1 - 2], fill=OUT, width=2)


reg("turnstile", turnstile, "victorian", "turnstiles across a passage of about 2 1/2 ft between 3 ft posts and cabinets (Ellison rush-preventive turnstiles; Gunnebo gates)",
    states=("closed", "open"), front=True, clear=3, nvar=32)


def lift(tm, x, y, w, h, st, v, c):
    """A lift in its shaft, from above with the roof off: the shaft walls, the car's floor, its handrail and button
    panel, and the doors at the front. Victorian: an open iron cage lift, its car floor of boards seen through the
    mesh, the ropes and the operator's lever, a folding lattice gate across. Great War: a panelled wooden car with
    brass. Mid-Century: steel sliding doors in the maker's colour and a linoleum floor. Modern: brushed steel doors
    and a carpeted or tiled car with a mirror wall. Future Darkness: a dark car lined with lit strips. Open: the gate
    folded or the doors slid aside; broken: the doors jammed half open on the empty shaft."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lv = int(v.get("livery", 0)) % 6; opn = c.open
    case(d, X0, Y0, X1, Y1, CONC if p != "V" else IRON)                                                         # the shaft
    cx0, cy0, cx1, cy1 = X0 + 8, Y0 + 8, X1 - 8, Y1 - 14
    if c.broken:
        d.rectangle([cx0, cy0, cx1, cy1], fill=(14, 12, 14), outline=OUT)
        for k in (X0 + W * .4, X0 + W * .6): d.line([k, cy0, k, cy1], fill=(60, 60, 64), width=2)
    else:
        FL = [WOOD, ramp((140, 60, 50), 12), ramp((90, 100, 80), 12), ramp((150, 150, 146), 10), ramp((60, 70, 120), 12)][m]   # boards, red lino, green lino, terrazzo, blue carpet
        if p in "VG": FL = [WOOD, DARKWOOD, ramp((140, 60, 50), 12), ramp((190, 150, 100), 14), ramp((120, 40, 40), 12)][m]
        d.rectangle([cx0, cy0, cx1, cy1], fill=FL[2], outline=OUT)
        if p in "VG":
            for k in range(cy0 + 6, cy1, 6): d.line([cx0 + 1, k, cx1 - 1, k], fill=FL[1])
        elif p == "N" and m % 2: 
            for i in range(cx0 + 10, cx1, 10): d.line([i, cy0 + 1, i, cy1 - 1], fill=FL[1])
            for j in range(cy0 + 10, cy1, 10): d.line([cx0 + 1, j, cx1 - 1, j], fill=FL[1])
        wall = {"V": L, "G": CABWOOD[lv], "M": L, "N": L, "F": L}[p]
        for (a, b_, c_, d_) in ((cx0, cy0, cx1, cy0 + 7), (cx0, cy0, cx0 + 7, cy1), (cx1 - 7, cy0, cx1, cy1)):
            d.rectangle([a, b_, c_, d_], fill=wall[2], outline=OUT)
        if p == "V":
            for k in range(cx0 + 2, cx1, 4): d.line([k, cy0, k, cy0 + 4], fill=IRON[4])
            d.ellipse([X0 + W / 2 - 4, Y0 + H / 2 - 4, X0 + W / 2 + 4, Y0 + H / 2 + 4], outline=STEEL[3])         # ropes' shackle
            d.line([cx1 - 10, cy1 - 12, cx1 - 6, cy1 - 20], fill=BRASS[3], width=2)
        else:
            d.line([cx0 + 6, cy0 + 6, cx1 - 6, cy0 + 6], fill=(BRASS if p == "G" else CHROME)[3], width=2)    # handrail
            d.rectangle([cx1 - 4, cy1 - 24, cx1 - 1, cy1 - 8], fill=(30, 30, 34)); 
            for k in range(cy1 - 22, cy1 - 9, 4): d.point((cx1 - 3, k), fill=(250, 200, 90))
        if p == "N" and m >= 3: d.rectangle([cx0 + 5, cy0 + 1, cx1 - 5, cy0 + 3], fill=(190, 210, 220))      # mirror
        if p == "F":
            for k in (cx0 + 2, cx1 - 3): d.line([k, cy0 + 4, k, cy1 - 4], fill=GLOW[1])
    dy = Y1 - 12                                                                                                # the doors' line
    d.rectangle([X0 + 2, dy, X1 - 2, Y1 - 2], fill=ramp((150, 148, 140), 10)[3], outline=OUT)                 # the landing sill
    door = {"V": L, "G": BRASS, "M": L, "N": CHROME if m % 2 else L, "F": L}[p]
    if p in "VG":
        if opn:
            for k in range(3): d.line([X0 + 6 + k * 2, dy + 1, X0 + 8 + k * 2, Y1 - 3], fill=door[2], width=2)
        else:
            for k in range(X0 + 6, X1 - 6, 6): d.line([k, dy + 1, k + 3, Y1 - 3], fill=door[2]); d.line([k + 3, dy + 1, k, Y1 - 3], fill=door[2])
    else:
        mid = X0 + W / 2; half = W / 2 - 8
        span = 10 if opn else (half * .5 if c.broken else half)                                                   # open: the leaves slid back into their pockets
        for a, b_ in ((X0 + 8, X0 + 8 + span), (X1 - 8 - span, X1 - 8)):
            d.rectangle([a, dy + 2, b_, dy + 7], fill=door[2], outline=OUT); d.line([a + 1, dy + 3, b_ - 1, dy + 3], fill=door[4])
        d.rectangle([X1 - 6, dy - 10, X1 - 2, dy - 2], fill=CHROME[2], outline=OUT)                                # the call buttons
        for k in (dy - 8, dy - 5): d.rectangle([X1 - 5, k, X1 - 3, k + 1], fill=(250, 200, 80) if opn else (90, 80, 60))
    lamp(d, X1 - 8, Y1 - 4, (250, 200, 80), opn, 2)


reg("lift", lift, "victorian", "passenger lift cars of about 5 by 5 ft in a 6 ft shaft (Otis cars; BS 5655 shafts)",
    states=("closed", "open"), front=True, clear=5, mount="wall", off=0)


def escalator(tm, x, y, w, h, st, v, c):
    """An escalator from above, its foot at the south: the moving handrails along both balustrades, the steps
    with their cleats, the comb plates and landing plates at each end. Victorian and Great War: wooden steps and
    panelled wooden balustrades. Mid-Century: wooden treads with bronze or polished-wood balustrades and lamp
    standards up the middle deck. Modern: steel steps with yellow edges between glass balustrades. Future
    Darkness: dark steps edged with light. Running: the arrow lit green at the foot; stopped: a red bar across."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lv = int(v.get("livery", 0)) % 6; run = c.on and not c.broken
    clad = L                                                                                                    # the outer cladding in the maker's or the owner's paint
    bal = {"V": CABWOOD[(lv + 2) % 6], "G": CABWOOD[(lv + 3) % 6], "M": [CABWOOD[lv], BRASS, CABWOOD[(lv + 1) % 6], CHROME, BRASS][m], "N": ramp((170, 200, 210), 10), "F": ramp((36, 38, 46), 8)}[p]
    rail = [ramp((26, 26, 30), 6), ramp((150, 40, 36), 12), ramp((40, 60, 130), 12), ramp((60, 100, 60), 12), ramp((110, 70, 40), 12)][m]
    bw = 16
    for bx0 in (X0, X1 - bw):
        case(d, bx0, Y0, bx0 + bw, Y1, clad)
        case(d, bx0 + 4, Y0 + 2, bx0 + bw - 2, Y1 - 2, bal) if bx0 == X0 else case(d, bx0 + 2, Y0 + 2, bx0 + bw - 4, Y1 - 2, bal)
        d.rectangle([bx0 + 6, Y0 + 3, bx0 + bw - 6, Y1 - 3], fill=rail[2], outline=OUT)                         # handrail
        if p == "F": d.line([bx0 + 1, Y0 + 2, bx0 + 1, Y1 - 2], fill=GLOW[1] if run else GLOW[0])
    AL, BK = ramp((150, 154, 160), 10), ramp((50, 52, 58), 8)
    tread = {"V": [WOOD, ramp((200, 170, 120), 14), DARKWOOD, CABWOOD[3], WOOD], "G": [DARKWOOD, ramp((200, 170, 120), 14), WOOD, CABWOOD[1], DARKWOOD],
             "M": [WOOD, DARKWOOD, AL, BK, ramp((200, 170, 120), 14)], "N": [AL, BK, AL, ramp((100, 104, 110), 8), BK],
             "F": [BK, ramp((30, 34, 44), 8), ramp((70, 74, 84), 8), BK, ramp((40, 30, 40), 8)]}[p][m]
    sx0, sx1 = X0 + bw + 1, X1 - bw - 1
    d.rectangle([sx0, Y0 + 14, sx1, Y1 - 14], fill=tread[2])
    for k in range(Y0 + 16, Y1 - 14, 10):
        d.line([sx0, k, sx1, k], fill=OUT); d.line([sx0, k + 1, sx1, k + 1], fill=tread[4])
        for q in range(int(sx0) + 2, int(sx1) - 1, 3): d.line([q, k + 2, q, k + 8], fill=tread[1])
        if p == "N": d.line([sx0, k + 1, sx1, k + 1], fill=YEL[3]); d.line([sx0, k + 1, sx0, k + 8], fill=YEL[3]); d.line([sx1, k + 1, sx1, k + 8], fill=YEL[3])
        if p == "F": d.line([sx0, k + 1, sx1, k + 1], fill=GLOW[1])
    if c.broken:
        d.rectangle([sx0, Y0 + H * .45, sx1, Y0 + H * .45 + 20], fill=(14, 12, 14), outline=OUT)
    for ey, k in ((Y0, 1), (Y1 - 14, -1)):                                                                       # landing and comb plates
        d.rectangle([sx0, ey, sx1, ey + 13], fill=(BRASS if p in "VG" else CHROME)[2], outline=OUT)
        for q in range(int(sx0) + 3, int(sx1) - 2, 5): d.line([q, ey + 2, q, ey + 11], fill=CHROME[1])
    if p == "M" and m in (0, 2):
        for k in (Y0 + H * .3, Y0 + H * .7): d.ellipse([X0 + W / 2 - 4, k - 4, X0 + W / 2 + 4, k + 4], fill=BRASS[3], outline=OUT)
    ax, ay = X0 + W / 2, Y1 - 7
    if run: d.polygon([(ax, ay - 5), (ax + 5, ay + 2), (ax - 5, ay + 2)], fill=(80, 230, 120), outline=OUT)
    else: d.rectangle([ax - 8, ay - 2, ax + 8, ay + 2], fill=(220, 50, 40), outline=OUT)


reg("escalator", escalator, "victorian", "escalators about 4 ft wide over a run of 12 ft and more (Otis and Seeberger 1900; 1,000 mm step escalators)",
    states=("off", "on"), front=True, clear=6)


def securitycamera(tm, x, y, w, h, st, v, c):
    """A security camera on its wall bracket, from above. Mid-Century: a boxy beige or grey camera on an arm with a
    sun hood over the lens. Modern: a white bullet camera on its bracket, or a smoked dome on a plate. Future
    Darkness: a small black eye on a dark mount with a lit ring. On: its red lamp lit; broken: hanging by its cable,
    the lens smashed."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv; on = c.on and not c.broken
    cx = X0 + W / 2
    d.rectangle([cx - 4, Y0, cx + 4, Y0 + 2], fill=STEEL[2], outline=OUT)                                          # wall plate
    if c.broken:
        cable(d, [(cx, Y0 + 2), (cx + 3, Y1 - 4)], (30, 30, 30), 1); case(d, cx - 2, Y1 - 6, cx + 8, Y1, L, r=1); return
    if p == "N" and m in (2, 4) or p == "F" and m >= 2:
        r = H / 2 - 1
        d.ellipse([cx - r, Y0 + 1, cx + r, Y1 - 1], fill=L[2], outline=OUT)
        if p == "F" and m % 2: d.rectangle([cx - r - 2, Y0, cx + r + 2, Y0 + 3], fill=c.alt[2], outline=OUT)
        d.ellipse([cx - r * .6, Y0 + 1 + r * .4, cx + r * .6, Y1 - 1 - r * .4], fill=(40, 44, 50) if p == "N" else GLOW[1] if on else GLOW[0])
        lamp(d, cx + r * .7, Y0 + 3, (250, 40, 30), on, 1)
        return
    d.line([cx, Y0 + 2, cx, Y0 + 5], fill=STEEL[1], width=2)
    ang = .35 * ((m % 3) - 1)
    bw, bl = (5, H - 4) if p == "M" else (4 - (p == "F"), H - 5)
    if p == "N" and m == 3: bw += 1
    pts = [(-bw, 0), (bw, 0), (bw, bl), (-bw, bl)]
    P_ = [(cx + u * math.cos(ang) - vv * math.sin(ang), Y0 + 3 + u * math.sin(ang) + vv * math.cos(ang)) for u, vv in pts]
    d.polygon(P_, fill=L[2], outline=OUT)
    if p == "M": d.line([P_[0], P_[3]], fill=L[4])
    ex, ey = (P_[2][0] + P_[3][0]) / 2, (P_[2][1] + P_[3][1]) / 2
    d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], fill=(30, 40, 60), outline=OUT)
    lamp(d, P_[1][0], P_[1][1] + 2, (250, 40, 30), on, 1)


reg("securitycamera", securitycamera, "mid-century", "CCTV cameras about 10 by 4 in on a wall arm, domes about 5 in (1970s tube cameras; modern bullet and dome cameras)",
    states=("off", "on"), front=True, clear=1, mount="wall", off=2, nvar=32)


# ================================================================ shops and stores
GOODS = [(200, 60, 50), (240, 200, 60), (60, 120, 190), (70, 150, 80), (236, 232, 220), (230, 130, 40), (140, 80, 150)]


def grocery(d, x0, y0, x1, y1, k):
    """A few groceries seen from above: a box, a tin, a bottle top, a loaf, a bag."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); i = 0
    for gx in range(x0 + 2, x1 - 5, 7):
        for gy in range(y0 + 2, y1 - 5, 7):
            col = GOODS[(k + i * 3) % 7]; t = (k + i) % 4; i += 1
            if t == 0: d.rectangle([gx, gy, gx + 5, gy + 4], fill=col, outline=OUT)
            elif t == 1: d.ellipse([gx, gy, gx + 5, gy + 5], fill=CHROME[2], outline=OUT); d.ellipse([gx + 1, gy + 1, gx + 4, gy + 4], fill=col)
            elif t == 2: d.ellipse([gx + 1, gy + 1, gx + 4, gy + 4], fill=col, outline=OUT)
            else: d.rounded_rectangle([gx, gy, gx + 6, gy + 4], 2, fill=(200, 150, 80), outline=OUT)


def shoppingcart(tm, x, y, w, h, st, v, c):
    """A shopping trolley from above, its handle to the south. Mid-Century: the folding basket carrier of the late
    1930s, a frame holding a wire basket, or the nesting wire trolley with its child-seat flap. Modern: a steel
    trolley with a coloured plastic handle and corners, or an all-plastic one. Future Darkness: a dark composite cart
    with a lit handle. Full: groceries in it; broken: a wheel gone, tipped and bent, dumped."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; hcol = ramp(GOODS[lv], 16); full = v.get("show", "empty") == "full"
    wire = CHROME if c.w >= 2 else ramp((150, 140, 120), 12)
    if p == "F": wire = ramp(mix(LIV["F"][lv], (40, 42, 50), .3), 10)
    for wx, wy in ((X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X0 + 4, Y1 - 6), (X1 - 4, Y1 - 6)):                    # the wheels
        if c.broken and wx > X0 + W / 2 and wy > Y0 + H / 2: continue
        d.ellipse([wx - 3, wy - 3, wx + 3, wy + 3], fill=(40, 40, 40), outline=OUT)
    bx0, by0, bx1, by1 = X0 + 2, Y0 + 2, X1 - 2, Y1 - 10
    if p == "M" and m in (0, 3):                                                                                 # the folding carrier: a frame and a basket
        d.rectangle([bx0, by0, bx1, Y1 - 4], outline=wire[1], width=2)
        bx0, by0, bx1, by1 = bx0 + 4, by0 + 6, bx1 - 4, by0 + (by1 - by0) * .55
    if p in "MN" and (m >= 3 or p == "N" and m in (1, 4)) and not (p == "M" and m == 3):                        # all plastic or a coloured basket
        case(d, bx0, by0, bx1, by1, hcol if p == "N" else ramp(mix(GOODS[lv], (200, 200, 200), .3), 14), r=3)
        d.rectangle([bx0 + 3, by0 + 3, bx1 - 3, by1 - 3], fill=hcol[1])
    else:
        d.polygon([(bx0, by0), (bx1, by0), (bx1 - 2, by1), (bx0 + 2, by1)], fill=(60, 60, 64), outline=wire[1])
        for k in np.arange(bx0 + 3, bx1 - 1, 3): d.line([k, by0 + 1, k, by1 - 1], fill=wire[2])
        for k in np.arange(by0 + 3, by1 - 1, 4): d.line([bx0 + 1, k, bx1 - 1, k], fill=wire[3])
        d.rectangle([bx0, by0, bx1, by0 + 2], fill=hcol[2] if p != "M" or m in (2, 4) else wire[2], outline=OUT)   # the front bumper
    if p in "MN" and m == 2: d.rectangle([bx0 + 3, by1 - 9, bx1 - 3, by1 - 2], fill=hcol[3], outline=OUT)        # child-seat flap
    if full: grocery(d, bx0 + 2, by0 + 3, bx1 - 2, by1 - 3, lv + m)
    hy = Y1 - 5                                                                                                    # the handle
    d.rectangle([X0 + 1, hy - 2, X1 - 1, hy + 2], fill=hcol[2] if p != "M" else (wire if m != 4 else hcol)[2], outline=OUT); d.line([X0 + 2, hy - 1, X1 - 2, hy - 1], fill=hcol[4] if p != "M" else wire[4])
    if p == "F": d.line([X0 + 3, hy, X1 - 3, hy], fill=GLOW[2] if c.on else GLOW[0])
    if c.broken: d.line([bx0 + 2, by0 + 6, bx1 - 2, by1 - 4], fill=OUT, width=2)


reg("shoppingcart", shoppingcart, "mid-century", "shopping trolleys about 2 ft wide and 3 ft long (Goldman's 1937 folding carrier; Wanzl trolleys)",
    front=True, clear=1, axes={"show": ["empty", "full", "empty"]})


def keys(d, x0, y0, x1, y1, cols, rows, C, round_=True):
    sx, sy = (x1 - x0) / cols, (y1 - y0) / rows
    for i in range(cols):
        for j in range(rows):
            kx, ky = x0 + i * sx + sx / 2, y0 + j * sy + sy / 2; r = max(1, min(sx, sy) / 2 - 1)
            if round_: d.ellipse([kx - r, ky - r, kx + r, ky + r], fill=C[3], outline=OUT)
            else: d.rectangle([kx - r, ky - r, kx + r, ky + r], fill=C[3], outline=C[0])


def cashregister(tm, x, y, w, h, st, v, c):
    """A till on its counter, from above. Victorian and Great War: an ornate brass or nickel cash register, its
    banks of round keys, the pop-up figure tabs in the glass top, the crank at the side and the drawer below.
    Mid-Century: an electric register in grey or cream enamel with its keys and the display tower. Modern: a
    point-of-sale terminal, a screen, keypad and receipt printer. Future Darkness: a tablet on its stand and a card
    reader. Open: the drawer out with its coin cups and notes."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    lv = int(v.get("livery", 0)) % 6; opn = c.open
    dy = Y0 + H * .7
    if opn:                                                                                                         # the drawer out
        d.rectangle([X0 + 3, dy, X1 - 3, Y1 + 6], fill=(60, 50, 40) if p in "VG" else (50, 50, 54), outline=OUT)
        for i in range(5): d.ellipse([X0 + 5 + i * (W - 10) / 5, Y1 - 2, X0 + 9 + i * (W - 10) / 5, Y1 + 2], fill=CHROME[2] if i % 2 else BRASS[2])
        for i in range(3): d.rectangle([X0 + 5 + i * (W - 10) / 3, dy + 2, X0 + 3 + (i + 1) * (W - 10) / 3, Y1 - 4], fill=(110, 150, 100) if i != 1 else (180, 150, 110))
    else: d.rectangle([X0 + 3, dy, X1 - 3, Y1 - 1], fill=(CABWOOD[lv] if p in "VG" else L)[1], outline=OUT)
    if p in "VG":
        Bm = [BRASS, CHROME, ramp((150, 100, 50), 16), COPPER, BRASS][m] if p == "V" else ([L, CHROME, L, ramp((150, 100, 50), 16), L][m])
        if p == "G": case(d, X0, Y0 + 1, X1 - 4, Y1 - 1, CABWOOD[lv])                                                 # its wooden cabinet base
        case(d, X0 + 1, Y0 + 2, X1 - 5, dy, Bm, r=2 if p == "V" else 0)
        if p == "V":
            for k in range(X0 + 4, X1 - 7, 4): d.arc([k, Y0 + 1, k + 4, Y0 + 5], 180, 360, fill=Bm[4])              # the cast scrollwork
        keys(d, X0 + 3, Y0 + H * .3, X1 - 7, dy - 1, 5 if p == "V" else 4, 3 if p == "V" else 4, ramp(GOODS[lv], 14) if p == "V" and lv != 4 else WHITE)
        d.rectangle([X0 + 6, Y0 + 3, X1 - 10, Y0 + H * .26], fill=(170, 200, 210), outline=Bm[0])                  # the figure window
        for k in range(3): d.rectangle([X0 + 8 + k * 4, Y0 + 5, X0 + 10 + k * 4, Y0 + 7], fill=WHITE[4])
        d.line([X1 - 5, Y0 + H * .4, X1, Y0 + H * .4], fill=IRON[2], width=2); d.ellipse([X1 - 3, Y0 + H * .4, X1, Y0 + H * .55], fill=WOOD[3])
    elif p == "M":
        case(d, X0 + 1, Y0 + 2, X1 - 1, dy, L, r=3)
        d.rectangle([X0 + W * .3, Y0, X0 + W * .7, Y0 + 6], fill=L[0], outline=OUT); d.rectangle([X0 + W * .35, Y0 + 1, X0 + W * .65, Y0 + 4], fill=(30, 30, 30) if not c.on else (90, 220, 140))
        keys(d, X0 + 3, Y0 + 8, X1 - 3, dy - 1, 5 if m % 2 else 4, 3, ramp((40, 40, 44), 10) if m < 3 else WHITE, False)
    elif p == "N":
        case(d, X0 + 1, Y0 + H * .35, X1 - 1, dy, L, r=1)
        screen(d, X0 + 4, Y0 + 1, X1 - 10, Y0 + H * .35, True, c.broken)
        keys(d, X0 + 3, Y0 + H * .4, X1 - 12, dy - 1, 4, 2, ramp((200, 200, 196), 8), False)
        case(d, X1 - 9, Y0 + H * .38, X1 - 2, dy - 2, ramp((50, 50, 54), 8)); d.rectangle([X1 - 8, Y0 + H * .34, X1 - 3, Y0 + H * .4], fill=WHITE[4])
    else:
        d.polygon([(X0 + 4, Y0 + 2), (X1 - 4, Y0 + 2), (X1 - 6, dy - 2), (X0 + 6, dy - 2)], fill=L[1], outline=OUT)
        screen(d, X0 + 7, Y0 + 4, X1 - 7, dy - 5, True, c.broken, tint=GLOW[1])
        d.rectangle([X1 - 8, dy - 4, X1 - 2, dy + 2], fill=c.alt[2], outline=OUT)


reg("cashregister", cashregister, "victorian", "cash registers of about 16 to 18 in square on the counter (National Cash Register models of the 1890s; modern POS terminals)",
    states=("closed", "open"), openable="box", front=True, clear=1.5, nvar=32)


def checkout(tm, x, y, w, h, st, v, c):
    """A checkout counter from above, the shopper's side to the south. Mid-Century: a long wooden or enamelled
    counter with the till at the end and a shelf for bags, later a rubber belt in a steel counter. Modern: a black
    conveyor belt with its divider bar, the scanner's glass, the card reader on its stand, the till and the bagging
    well, in the shop's colours. Future Darkness: a self-checkout of dark pods with lit scanners. On: the belt and
    the scanner's red line lit; shopping on the belt."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; S_ = ramp(GOODS[lv], 16); on = c.on and not c.broken; L = c.liv
    body = S_ if p != "M" or m % 2 else (CABWOOD[lv] if m == 0 else L)
    case(d, X0, Y0 + 2, X1, Y1 - 2, body)                                                                           # the counter
    d.line([X0 + 2, Y1 - 5, X1 - 2, Y1 - 5], fill=body[0])
    if p == "F":
        for k in range(3):
            px0 = X0 + 4 + k * (W - 8) / 3; case(d, px0, Y0 + 5, px0 + (W - 8) / 3 - 4, Y1 - 6, ramp(mix(GOODS[lv], (30, 32, 40), .6), 10), r=4)
            screen(d, px0 + 4, Y0 + 8, px0 + 16, Y0 + 18, on, c.broken); d.line([px0 + 4, Y1 - 12, px0 + 20, Y1 - 12], fill=(250, 60, 50) if on else (80, 30, 30))
        return
    belt_x1 = X0 + W * (.62 if m < 3 else .55)
    if p == "M" and m in (0, 2):                                                                                    # a plain counter top
        d.rectangle([X0 + 4, Y0 + 6, belt_x1, Y1 - 8], fill=tone(body[2], 20), outline=OUT)
        if v.get("show", "goods") == "goods": grocery(d, X0 + 8, Y0 + 10, X0 + 40, Y1 - 12, lv + m)
    else:
        d.rectangle([X0 + 4, Y0 + 6, belt_x1, Y1 - 8], fill=(30, 30, 34), outline=OUT)                                # the belt
        for k in range(X0 + 8, int(belt_x1), 6): d.line([k, Y0 + 7, k, Y1 - 9], fill=(44, 44, 48) if not on else (54, 54, 58))
        d.rectangle([X0 + W * .3, Y0 + 7, X0 + W * .3 + 3, Y1 - 9], fill=S_[3], outline=OUT)                         # divider
        if v.get("show", "goods") == "goods": grocery(d, X0 + 8, Y0 + 10, X0 + W * .28, Y1 - 12, lv + m)
        if p == "N":
            d.rectangle([belt_x1 + 2, Y0 + 8, belt_x1 + 16, Y1 - 10], fill=(60, 80, 70), outline=OUT)                    # scanner glass
            if on: d.line([belt_x1 + 4, Y0 + H / 2, belt_x1 + 14, Y0 + H / 2], fill=(255, 50, 40))
    tx = X1 - 22                                                                                                     # the till
    case(d, tx, Y0 + 4, X1 - 3, Y0 + 20, ramp((60, 60, 64), 10) if p == "N" else BRASS if m == 4 else ramp((200, 196, 186), 10))
    if p == "N": screen(d, tx + 3, Y0 + 5, X1 - 6, Y0 + 12, on, c.broken)
    d.rectangle([tx, Y1 - 16, X1 - 3, Y1 - 6], fill=tone(body[2], -20), outline=OUT)                                 # the bag well
    glyphs(d, X0 + 6, Y1 - 4, X0 + W * .4, Y1 - 3, body[4] if sum(body[2]) < 400 else body[0])


reg("checkout", checkout, "mid-century", "checkout counters about 6 ft long and 2 1/2 to 3 ft deep with their belt (supermarket checkstands from the 1930s; modern checkouts)",
    states=("off", "on"), front=True, clear=3, axes={"show": ["goods", "bare", "goods"]})


STOCK = ["tins", "boxes", "bottles", "tools", "files", "bare"]


def shelving(tm, x, y, w, h, st, v, c):
    """Steel shelving against a wall, from above: the four angle-iron uprights at its corners, the top shelf and
    what stands on it (tins, boxes, bottles, tools, box files or nothing). Mid-Century: slotted angle in green,
    grey or cream paint, bolted. Modern: grey or zinc-plated boltless racking, or a white shop gondola. Future
    Darkness: dark composite shelves with a lit edge. Broken: a shelf down at one end, its load slid off."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5); L = c.liv
    stock = v.get("show", "tins"); k0 = int(v.get("livery", 0)) + m
    case(d, X0, Y0, X1, Y1, L)
    if p == "M" or m % 2: 
        for k in range(X0 + 6, X1 - 4, 6): d.ellipse([k, Y0 + 2, k + 2, Y0 + 3], fill=L[0])                         # the slots
    sx0, sy0, sx1, sy1 = X0 + 3, Y0 + 3, X1 - 3, Y1 - 3
    if c.broken:
        d.polygon([(X0 + W * .5, Y0 + 2), (X1 - 2, Y0 + 2), (X1 - 2, Y1 - 2), (X0 + W * .5, Y1 - 2)], fill=L[0], outline=OUT); sx1 = X0 + W * .5
        for k in range(4): d.rectangle([X1 - 20 + k * 4, Y1 + 1 - (k % 2) * 2, X1 - 17 + k * 4, Y1 + 3 - (k % 2) * 2], fill=GOODS[k], outline=OUT)
    if stock == "tins":
        for gx in np.arange(sx0, sx1 - 6, 7):
            for gy in np.arange(sy0, sy1 - 5, 7): d.ellipse([gx, gy, gx + 6, gy + 6], fill=CHROME[2], outline=OUT); d.ellipse([gx + 2, gy + 2, gx + 4, gy + 4], fill=GOODS[int(gx / 7 + k0) % 7])
    elif stock == "boxes":
        bx = sx0
        while bx < sx1 - 8:
            bw = 9 + (int(bx) * 7 + k0) % 8; d.rectangle([bx, sy0, min(bx + bw, sx1), sy1], fill=[(200, 160, 110), GOODS[(int(bx) + k0) % 7]][int(bx) % 2], outline=OUT)
            d.line([bx + 1, sy0 + (sy1 - sy0) / 2, min(bx + bw, sx1) - 1, sy0 + (sy1 - sy0) / 2], fill=(150, 120, 80)); bx += bw + 1
    elif stock == "bottles":
        for gx in np.arange(sx0, sx1 - 4, 5):
            for gy in np.arange(sy0, sy1 - 4, 5): d.ellipse([gx, gy, gx + 4, gy + 4], fill=[(60, 120, 60), (150, 90, 40), (200, 220, 220)][int(gx + gy + k0) % 3], outline=OUT)
    elif stock == "tools":
        for i, gx in enumerate(np.arange(sx0 + 2, sx1 - 10, 12)):
            d.line([gx, sy0 + 2, gx + 8, sy1 - 2], fill=IRON[3], width=2); d.rectangle([gx - 1, sy0, gx + 3, sy0 + 4], fill=GOODS[(i + k0) % 7], outline=OUT)
    elif stock == "files":
        for i, gx in enumerate(np.arange(sx0, sx1 - 4, 5)): d.rectangle([gx, sy0, gx + 4, sy1], fill=[(40, 70, 130), (40, 40, 44), (150, 40, 40), (90, 120, 80)][(i // 3 + k0) % 4], outline=OUT); d.rectangle([gx + 1, sy0 + 2, gx + 3, sy0 + 4], fill=WHITE[3])
    for px_, py_ in ((X0, Y0), (X1 - 3, Y0), (X0, Y1 - 3), (X1 - 3, Y1 - 3)): d.rectangle([px_, py_, px_ + 3, py_ + 3], fill=L[0] if p != "N" or m != 2 else CHROME[2], outline=OUT)
    if p == "F": d.line([X0 + 2, Y1 - 1, X1 - 2, Y1 - 1], fill=GLOW[1])


reg("shelving", shelving, "mid-century", "steel shelving units 3 to 4 ft wide and 12 to 18 in deep (Dexion slotted angle 1947; boltless racking)",
    front=True, clear=2.5, mount="wall", axes={"show": STOCK})


def goodspallet(tm, x, y, w, h, st, v, c):
    """A pallet of goods from above: the wooden pallet's deck boards showing at the edges and the load on it,
    cartons in a bonded stack with their tape, sacks, drums or crates, strapped. Mid-Century: a hardwood pallet,
    cartons and sacks under steel strapping. Modern: a pine or blue plastic pallet, the stack shrink-wrapped and
    glinting, its label on the side. Future Darkness: sealed composite crates on a dark skid. Open: the wrap cut
    away, a carton opened on the top and a few lifted off beside."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; p = c.per; m = mk(c, 5)
    lv = int(v.get("livery", 0)) % 6; load = v.get("show", "cartons"); opn = c.open
    pal = [WOOD, ramp((200, 170, 120), 14), ramp((40, 90, 160), 14), WOOD, DARKWOOD][m] if p != "F" else ramp((40, 42, 50), 8)
    case(d, X0, Y0, X1, Y1, pal)
    for k in range(X0 + 6, X1 - 2, 10): d.line([k, Y0 + 1, k, Y1 - 1], fill=pal[0])
    lx0, ly0, lx1, ly1 = X0 + 3, Y0 + 3, X1 - 3, Y1 - 3
    CT = ramp(mix((200, 160, 110), GOODS[lv], .25 if p != "F" else .6), 14)
    if p == "F": CT = ramp(mix(LIV["F"][lv], (90, 90, 96), .3), 12)
    if load == "sacks" and p != "F":
        for i in range(3):
            for j in range(2):
                sx, sy = lx0 + i * (lx1 - lx0) / 3, ly0 + j * (ly1 - ly0) / 2
                d.rounded_rectangle([sx + 1, sy + 1, sx + (lx1 - lx0) / 3 - 1, sy + (ly1 - ly0) / 2 - 1], 6, fill=[LINEN, ramp((180, 170, 140), 12), WHITE][lv % 3][2], outline=OUT)
                d.line([sx + 4, sy + 4, sx + (lx1 - lx0) / 3 - 5, sy + 4], fill=LINEN[4])
    elif load == "drums" and p != "F":
        for i in range(2):
            for j in range(2):
                cx_, cy_, r = lx0 + (i + .5) * (lx1 - lx0) / 2, ly0 + (j + .5) * (ly1 - ly0) / 2, min(lx1 - lx0, ly1 - ly0) / 4 - 1
                Dc = ramp(GOODS[(lv + i + j) % 7], 14); d.ellipse([cx_ - r, cy_ - r, cx_ + r, cy_ + r], fill=Dc[2], outline=OUT)
                d.ellipse([cx_ - r + 4, cy_ - r + 4, cx_ + r - 4, cy_ + r - 4], outline=Dc[0]); d.ellipse([cx_ + r * .3, cy_ - r * .5, cx_ + r * .3 + 4, cy_ - r * .5 + 4], fill=Dc[0])
    else:
        nc = 3 + (m % 2)
        for i in range(nc):
            for j in range(2):
                bx, by = lx0 + i * (lx1 - lx0) / nc, ly0 + j * (ly1 - ly0) / 2
                if opn and i == nc - 1 and j == 0: continue
                case(d, bx + 1, by + 1, bx + (lx1 - lx0) / nc - 1, by + (ly1 - ly0) / 2 - 1, CT)
                d.line([bx + 3, by + (ly1 - ly0) / 4, bx + (lx1 - lx0) / nc - 3, by + (ly1 - ly0) / 4], fill=(170, 150, 110) if p != "F" else GLOW[0], width=2)
        if opn:
            bx = lx0 + (nc - 1) * (lx1 - lx0) / nc; d.rectangle([bx + 2, ly0 + 2, lx1 - 2, ly0 + (ly1 - ly0) / 2 - 2], fill=(90, 70, 50), outline=OUT)
            grocery(d, bx + 2, ly0 + 2, lx1 - 2, ly0 + (ly1 - ly0) / 2 - 2, lv)
    if not opn and p == "M":
        for k in (X0 + W * .3, X0 + W * .7): d.line([k, Y0 + 1, k, Y1 - 1], fill=STEEL[3], width=2)                     # strapping
    if not opn and p == "N" and m != 4:
        for k in range(Y0 + 6, Y1 - 4, 9): d.line([X0 + 4, k, X1 - 4, k + 3], fill=(235, 240, 245))                   # the shrink-wrap's sheen
    if p == "N": d.rectangle([X0 + W / 2 - 6, Y1 - 8, X0 + W / 2 + 6, Y1 - 3], fill=WHITE[4], outline=OUT)
    if c.broken:
        for k in range(4): d.rectangle([X1 - 22 + k * 5, Y1 - 6 + (k % 2) * 3, X1 - 18 + k * 5, Y1 - 3 + (k % 2) * 3], fill=CT[1], outline=OUT)


reg("goodspallet", goodspallet, "mid-century", "a 1200 by 1000 mm (4 by 3 1/3 ft) pallet with its load (ISO 6780 pallets; 48 by 40 in GMA pallets)",
    states=("closed", "open"), openable="crate", front=True, clear=2, axes={"show": ["cartons", "sacks", "drums", "cartons"]})
