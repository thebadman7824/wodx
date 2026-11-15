"""Machines of the works, the clinic, the town's pleasures, security and the old works for the library (B6349), the
second half of the "machines" family: forklift to glass furnace.

Every drawing is seen from straight above with its front to the south. Mass-made machines look the same the world
over (DRAWING.md, "Never make up a regional look"): they carry `global_from` and their variations come from the makes
and liveries of the day, their size and fit-out, what they hold or show, the clutter round them and their wear. The
old works (water-wheel, lime kiln, tenter, tanning pits, brewing copper, glass furnace, smoking rack, kennel) were
built by hand from what each place had, so they vary by region: the woods, stones, roofs and forms really used there.

Each drawing is wrapped by `_obj`, which adds one short shadow south-east and the glows; wear is the shared layer
in core.render, so every variation is drawn sound, and a poor owner's machine is plainer, not patched."""
import math

import numpy as np
from PIL import Image

from px import OUT
from library.core import define
from library.census import CENSUS
from library.art import tone, mix, ramp, box_px, slab, rivet, knob, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW
from library import variants as _V

PER = {"dark-ages": "M", "long-night": "M", "renaissance": "E", "age-of-reason": "E", "victorian": "V",
       "great-war": "W", "mid-century": "W", "modern": "N", "future-darkness": "F"}
EK = {k: i for i, k in enumerate(PER)}
AGE2ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century",
           "modern": "modern", "Future Darkness": "future-darkness"}
GREY = (124, 116, 104)

# what each region really built the old works from: its timber, its stone, its roofing, a lime or clay render, and
# the cloth it wove (used only on hand-built things, never on machines)
STY = {
    "central":       dict(wood=(140, 102, 62), stone=(150, 146, 138), roof=(150, 70, 50), render=(214, 206, 186), cloth=(150, 50, 40)),
    "atlantic":      dict(wood=(122, 84, 52), stone=(112, 116, 124), roof=(70, 74, 86), render=(200, 196, 182), cloth=(60, 80, 110)),
    "northern":      dict(wood=(196, 168, 118), stone=(88, 92, 100), roof=(96, 120, 70), render=(170, 60, 44), cloth=(186, 178, 156)),
    "mediterranean": dict(wood=(108, 74, 50), stone=(222, 208, 176), roof=(196, 104, 64), render=(234, 230, 216), cloth=(206, 160, 70)),
    "islamic":       dict(wood=(120, 80, 50), stone=(204, 168, 112), roof=(176, 150, 110), render=(214, 186, 140), cloth=(40, 120, 130)),
    "steppe":        dict(wood=(176, 120, 70), stone=(160, 132, 96), roof=(190, 176, 150), render=(186, 150, 110), cloth=(170, 60, 40)),
    "southasia":     dict(wood=(150, 96, 48), stone=(180, 98, 74), roof=(160, 96, 70), render=(206, 170, 120), cloth=(222, 140, 40)),
    "eastasia":      dict(wood=(94, 64, 46), stone=(120, 128, 138), roof=(70, 72, 80), render=(226, 222, 210), cloth=(50, 62, 110)),
    "seasia":        dict(wood=(196, 166, 96), stone=(160, 96, 66), roof=(150, 140, 80), render=(180, 150, 104), cloth=(110, 60, 100)),
    "africa":        dict(wood=(80, 52, 36), stone=(176, 100, 62), roof=(188, 160, 96), render=(160, 92, 56), cloth=(214, 168, 50)),
    "americas":      dict(wood=(166, 118, 78), stone=(196, 148, 108), roof=(156, 132, 96), render=(200, 164, 120), cloth=(180, 60, 60)),
    "oceania":       dict(wood=(116, 80, 54), stone=(76, 76, 82), roof=(176, 158, 104), render=(150, 130, 100), cloth=(176, 130, 80)),
    "polar":         dict(wood=(156, 150, 138), stone=(60, 64, 70), roof=(130, 120, 104), render=(222, 226, 230), cloth=(150, 120, 90)),
}
# the makers' finishes of mass-made machines (their liveries), and what a rich or poor owner adds to them
LIV = {"grey": (132, 136, 140), "green": (70, 104, 82), "yellow": (220, 176, 40), "orange": (220, 112, 36), "red": (178, 42, 38),
       "blue": (48, 84, 150), "black": (46, 46, 52), "cream": (220, 210, 180), "white": (226, 226, 222), "beige": (196, 182, 150),
       "olive": (104, 108, 70), "teal": (40, 120, 120), "silver": (176, 180, 186), "chrome": (196, 200, 206), "maroon": (110, 34, 40)}
METAL = {"brass": BRASS, "gold": ramp((214, 172, 60), 22), "silver": ramp((190, 194, 200), 18)}
RUST = ramp((122, 70, 46), 16)
RUBBER = [(20, 20, 24), (30, 30, 34), (42, 42, 46), (58, 58, 62), (80, 80, 84)]
LEATHER = {"black": ramp((52, 46, 48), 14), "oxblood": ramp((110, 40, 40), 16), "green": ramp((54, 90, 70), 16), "tan": ramp((160, 112, 66), 16),
           "red": ramp((176, 44, 44), 16), "blue": ramp((50, 80, 140), 16), "white": ramp((214, 210, 200), 10), "cream": ramp((216, 200, 160), 12)}
HAZ = ((232, 190, 30), (30, 28, 30))
WARM, COOL, ARC = (1.55, 1.05, .55), (1.0, 1.25, 1.5), (1.4, 1.5, 1.8)


class C:
    """One variation's colours: era, period, wealth, style or make, and the palettes they give."""
    def __init__(s, v):
        s.era = v.get("era") or AGE2ERA.get(v.get("age"), "modern")
        s.per = PER[s.era]; s.ek = EK[s.era]; s.v = v
        s.w = int(v.get("wealth", 3)); s.style = v.get("style") or "central"; s.cond = v.get("condition", "new")
        s.poor, s.rich = s.w <= 1, s.w >= 4
        S = STY.get(s.style, STY["central"]); s.S = S; f = .3 if s.poor else 0
        s.wood = ramp(mix(S["wood"], GREY, f), 18)
        s.stone = ramp(S["stone"], 16, (0, 0, 4)); s.roof = ramp(mix(S["roof"], GREY, f * .5), 16)
        s.render = ramp(mix(S["render"], GREY, f), 14); s.cloth = ramp(mix(S["cloth"], GREY, f), 18)
        s.make = v.get("make") or v.get("colour") or "grey"
        base = LIV.get(s.make, LIV["grey"])
        s.paint = ramp(mix(base, GREY, .28 if s.poor else 0), 20)
        s.iron = IRON
        s.metal = METAL["brass"] if s.rich else STEEL
        s.chrome = STEEL if not s.poor else ramp((130, 130, 128), 16)
        s.comp = ramp(mix(COMPOSITE[2], base, .45), 14)
        s.glow = [mix(GLOW[0], base, .25), mix(GLOW[1], base, .25), mix(GLOW[2], base, .15)]

    def axis(s, k, default): return s.v.get(k, default)


def _seed(v):
    return sum((i + 1) * ord(ch) for i, ch in enumerate("".join(f"{k}{v[k]}" for k in sorted(v) if k not in ("vid",)))) % 100003


def _obj(fn, metal=True, off=4, chip=True):
    """Wrap a drawing: one short shadow south-east, laid only round the pixels the drawing made, and its glows. Wear is
    the shared layer in core.render, so every variation here is drawn sound."""
    def draw(tm, x, y, w, h, st, v):
        c = C(v); before = np.asarray(tm.img).copy()
        glows = fn(tm, x, y, w, h, st, v, c) or []
        a = np.asarray(tm.img).astype(np.float32); m = np.abs(a - before.astype(np.float32)).sum(2) > 0
        if not m.any(): return
        sh = np.zeros_like(m); sh[off:, off - 1:] = m[:-off, :-(off - 1)]; sh &= ~m
        a[sh] = before[sh].astype(np.float32) * np.array([.53, .54, .6], np.float32)
        tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
        for g in glows:
            gx, gy, gr, col = g[:4]; tm.glow(gx, gy, gr, col=col, power=.8)
    draw.__doc__ = fn.__doc__
    return draw


# ---------------------------------------------------------------- small pieces
def rb(d, x0, y0, x1, y1, C, r=2, out=OUT):
    """A lit block: outlined, light north and west edges, dark south and east."""
    x0, y0, x1, y1 = int(min(x0, x1)), int(min(y0, y1)), int(max(x0, x1)), int(max(y0, y1))
    if x1 - x0 < 4 or y1 - y0 < 4: d.rectangle([x0, y0, x1, y1], fill=C[2], outline=out); return
    r = min(r, (x1 - x0) // 2, (y1 - y0) // 2)
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=C[2], outline=out)
    k = r // 2 + 1
    d.line([x0 + k, y0 + 1, x1 - k, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + k, x0 + 1, y1 - k], fill=C[3])
    d.line([x0 + k, y1 - 1, x1 - k, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + k, x1 - 1, y1 - k], fill=C[1])


def disc(d, cx, cy, r, C, out=OUT):
    """A lit round top: a highlight arc to the north-west, a dark rim south-east."""
    r = max(2, int(r)); d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=out)
    if r >= 4:
        d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 160, 260, fill=C[4], width=2)
        d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 340, 70, fill=C[0], width=2)


def ring(d, cx, cy, r, C, w=2):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OUT, width=w + 2); d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=C[2], width=w)
    d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 170, 250, fill=C[4], width=1)


def tyre(d, x0, y0, x1, y1, vert=True):
    """A tyre or wheel seen from above: a dark rubber block with its tread across it."""
    rb(d, x0, y0, x1, y1, RUBBER, 2)
    if vert:
        for k in range(int(y0) + 3, int(y1) - 2, 3): d.line([x0 + 2, k, x1 - 2, k], fill=RUBBER[3])
    else:
        for k in range(int(x0) + 3, int(x1) - 2, 3): d.line([k, y0 + 2, k, y1 - 2], fill=RUBBER[3])


def screen(d, x0, y0, x1, y1, on, col=None, kind="lines"):
    """A screen or a glass window: dark when off, lit with a picture when on, a glint either way."""
    col = col or GLOW; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=(18, 20, 26) if not on else col[0], outline=OUT)
    if on and x1 - x0 > 6 and y1 - y0 > 5:
        if kind == "lines":
            for k in range(y0 + 2, y1 - 1, 3): d.line([x0 + 2, k, x0 + 2 + (x1 - x0 - 4) * (.4 + .5 * ((k * 7) % 5) / 5), k], fill=col[1])
        elif kind == "trace":
            pts = [(x0 + 2 + i, (y0 + y1) / 2 + (-(y1 - y0) / 3 if i % 9 == 4 else (2 if i % 9 == 5 else 0))) for i in range(0, x1 - x0 - 3)]
            d.line(pts, fill=col[2])
        elif kind == "game":
            d.rectangle([x0 + 2, y1 - 4, x1 - 2, y1 - 2], fill=col[1])
            for k in range(x0 + 3, x1 - 3, 5): d.rectangle([k, y0 + 3, k + 2, y0 + 4], fill=col[2])
            d.rectangle([(x0 + x1) // 2 - 1, y1 - 7, (x0 + x1) // 2 + 1, y1 - 5], fill=(250, 240, 120))
        d.line([x0 + 1, y0 + 1, x0 + 1 + (x1 - x0) // 3, y0 + 1], fill=col[2])
    else:
        d.line([x0 + 2, y0 + 2, x0 + 2 + (x1 - x0) // 4, y0 + 2], fill=(70, 80, 96))


def hazard(d, x0, y0, x1, y1, s=5):
    """Yellow and black hazard stripes."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=HAZ[0])
    hgt = y1 - y0
    for k in range(x0 - hgt, x1, s * 2):
        d.polygon([(max(x0, k), y1), (min(x1, k + s), y1), (min(x1, k + s + hgt), y0), (max(x0, k + hgt), y0)], fill=HAZ[1])
    d.rectangle([x0, y0, x1, y1], outline=OUT)


def tape(d, x0, y0, x1, y1):
    """A strip of grey cloth tape, the mend of the hard-up."""
    d.rectangle([x0, y0, x1, y1], fill=(150, 152, 150), outline=(90, 92, 94))
    d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=(190, 192, 190))


def patch(d, x, y, s, col=(120, 104, 80)):
    """A rag or leather patch with its stitches."""
    d.rectangle([x, y, x + s, y + s * 2 // 3], fill=col, outline=(70, 60, 50))
    for k in range(x + 1, x + s, 3): d.point((k, y + 1), fill=(200, 190, 160))


def cable(d, pts, col=RUBBER, w=2):
    d.line(pts, fill=OUT, width=w + 2, joint="curve"); d.line(pts, fill=col[2], width=w, joint="curve")


def coil(d, cx, cy, r, col=RUBBER, n=3):
    """A coiled cable or hose lying on the floor."""
    for k in range(n): d.ellipse([cx - r + k * 2, cy - r * .7 + k, cx + r - k * 2, cy + r * .7 - k], outline=OUT, width=1)
    for k in range(n): d.ellipse([cx - r + k * 2 + 1, cy - r * .7 + k + 1, cx + r - k * 2 - 1, cy + r * .7 - k - 1], outline=col[2 + k % 2], width=1)


def lamp(d, cx, cy, r, on, col=(250, 200, 90)):
    """A small lamp or indicator: dull when off, bright with a white core when on."""
    if on:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col, outline=OUT)
        if r >= 2: d.rectangle([cx - 1, cy - 1, cx, cy], fill=(255, 250, 230))
    else:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mix(col, (40, 40, 46), .65), outline=OUT)


def plate(d, x, y, C=BRASS, w=8, h=4):
    """A maker's plate."""
    d.rectangle([x, y, x + w, y + h], fill=C[3], outline=OUT); d.line([x + 2, y + 2, x + w - 2, y + 2], fill=C[1])


def chrome_edge(d, x0, y0, x1, y1, C=STEEL):
    d.rectangle([x0, y0, x1, y1], outline=C[4]); d.line([x0, y1, x1, y1], fill=C[1])


def swatch(d, x0, y0, x1, y1, C, kind="plain"):
    """Woven cloth: plain, check or stripe."""
    d.rectangle([x0, y0, x1, y1], fill=C[2])
    if kind == "check":
        for k in range(int(x0) + 2, int(x1), 8): d.line([k, y0, k, y1], fill=C[0], width=2)
        for k in range(int(y0) + 2, int(y1), 8): d.line([x0, k, x1, k], fill=C[0], width=2)
    elif kind == "stripe":
        for k in range(int(x0) + 2, int(x1), 7): d.line([k, y0, k, y1], fill=C[4], width=2)
    else:
        for k in range(int(y0) + 1, int(y1), 3): d.line([x0, k, x1, k], fill=C[3])


# ---------------------------------------------------------------- registering
_ROW = {r.id: r for r in CENSUS}


def reg(oid, fn, axes, ref, glob=True, metal=True, chip=True, off=4, **kw):
    """Define one object with its census rooms as tags. glob: the year from which it looks the same worldwide; True
    takes the start of the first era it is found in (a mass-made machine), False keeps every era regional."""
    row = _ROW[oid]
    kw.setdefault("tags", tuple(p.strip().split()[0] for p in row.where.split(",") if p.strip()))
    if glob is True:
        ya = row.years.partition("-")[0]; glob = _V.era_span(_V.era_of(int(ya) if ya else 1197))[0]
    if glob: kw["global_from"] = glob
    define(oid, draw=_obj(fn, metal=metal, chip=chip, off=off), axes=axes, ref=ref, **kw)


def frame(x, y, w, h, inset=2):
    X0, Y0, X1, Y1 = box_px(x, y, w, h, inset); return X0, Y0, X1, Y1, X1 - X0, Y1 - Y0, (X0 + X1) // 2, (Y0 + Y1) // 2


ON = ("on", "lit", "open", "full")


# ================================================================ the warehouse and the works
def _goods(d, x0, y0, x1, y1, kind, c, rng):
    """A load seen from above: a pallet of cartons, sacks, drums, crates or a loose heap."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if kind in ("pallet", "cartons"):
        rb(d, x0, y0, x1, y1, ramp((176, 146, 100), 16), 1)
        for k in range(x0 + 4, x1 - 2, max(6, (x1 - x0) // 5)): d.line([k, y0 + 1, k, y1 - 1], fill=(120, 96, 64))
        if kind == "cartons":
            cw = max(8, (x1 - x0) // 2 - 1); ch = max(8, (y1 - y0) // 2 - 1)
            for i in range(2):
                for j in range(2):
                    bx, by = x0 + 2 + i * (cw + 1), y0 + 2 + j * (ch + 1)
                    rb(d, bx, by, bx + cw - 2, by + ch - 2, ramp((196, 160, 110), 14), 1); d.line([bx + 1, by + ch // 2 - 1, bx + cw - 3, by + ch // 2 - 1], fill=(220, 210, 180))
    elif kind == "drums":
        r = max(5, min(x1 - x0, y1 - y0) // 4)
        for i, (fx, fy) in enumerate(((.28, .28), (.72, .28), (.28, .72), (.72, .72))):
            cx, cy = int(x0 + (x1 - x0) * fx), int(y0 + (y1 - y0) * fy)
            C = ramp(((40, 80, 150), (170, 40, 36), (60, 110, 60), (200, 160, 40))[(i + c.ek) % 4], 18)
            disc(d, cx, cy, r, C); d.ellipse([cx + r // 3, cy - r // 2, cx + r // 3 + 2, cy - r // 2 + 2], fill=C[0])
    elif kind == "sacks":
        for j, (fx, fy) in enumerate(((.25, .3), (.7, .28), (.3, .72), (.72, .7))):
            cx, cy = int(x0 + (x1 - x0) * fx), int(y0 + (y1 - y0) * fy); s = max(6, (x1 - x0) // 4)
            d.rounded_rectangle([cx - s, cy - s * 2 // 3, cx + s, cy + s * 2 // 3], 4, fill=LINEN[2], outline=OUT); d.line([cx - s + 3, cy - s // 2, cx + s - 3, cy - s // 2], fill=LINEN[4])
    elif kind == "crates":
        rb(d, x0, y0, x1, y1, ramp((170, 130, 80), 18), 1)
        for k in range(x0 + 5, x1 - 2, 6): d.line([k, y0 + 2, k, y1 - 2], fill=(118, 86, 54))
        d.line([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=(118, 86, 54), width=2)
    elif kind in ("coal", "ore", "gravel"):
        C = {"coal": [(16, 16, 20), (30, 30, 34), (46, 44, 48), (66, 64, 66), (96, 94, 96)], "ore": ramp((140, 90, 60), 18), "gravel": ramp((150, 146, 136), 16)}[kind]
        d.rectangle([x0, y0, x1, y1], fill=C[1])
        for _ in range(int((x1 - x0) * (y1 - y0) / 14)):
            px_, py_ = rng.uniform(x0, x1 - 3), rng.uniform(y0, y1 - 2); d.rectangle([px_, py_, px_ + 2, py_ + 1], fill=C[int(rng.integers(0, 5))])
    elif kind == "bottles":
        for gx in range(x0 + 4, x1 - 3, 7):
            for gy in range(y0 + 4, y1 - 3, 7):
                d.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=(60, 110, 70), outline=OUT); d.point((gx - 1, gy - 1), fill=(170, 220, 180))
    elif kind == "parcels":
        for i, (fx0, fy0, fx1, fy1) in enumerate(((0, 0, .55, .45), (.6, .05, 1, .5), (.05, .55, .5, 1), (.55, .55, .95, .95))):
            bx0, by0, bx1, by1 = x0 + (x1 - x0) * fx0, y0 + (y1 - y0) * fy0, x0 + (x1 - x0) * fx1, y0 + (y1 - y0) * fy1
            rb(d, bx0, by0, bx1, by1, ramp((190, 150, 100) if i % 2 else (210, 200, 180), 14), 1)
            d.line([bx0 + 2, (by0 + by1) / 2, bx1 - 2, (by0 + by1) / 2], fill=(150, 120, 80) if i % 2 else (190, 60, 50), width=2)


def forklift(tm, x, y, w, h, st, v, c):
    """A forklift truck from above, its forks to the south, the counterweight at the back. Mid-Century: a squat
    rounded electric or petrol truck of the 1930s to 1950s, open bench seat, big steering wheel, the mast of two plain
    channels; Modern: a squared counterbalance truck under its overhead guard of bars, a gas bottle across the back,
    hazard stripes on the counterweight and an amber beacon; Future Darkness: a driverless shell with no seat, a
    sensor dome and lit strips. Liveries are the makers' yellow, orange, red, blue, grey or green; a load may sit on
    the forks. On: headlamps and the beacon lit."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; on = st == "on"
    rng = np.random.default_rng(_seed(v)); B = c.paint if per != "F" else c.comp
    my = Y0 + int(H * .56)                                                                 # the mast
    tw = max(8, W // 8)
    for ty in (Y0 + int(H * .06), my - int(H * .17)):                                     # four wheels standing out at the sides
        for tx in (X0, X1 - tw): tyre(d, tx, ty, tx + tw, ty + int(H * .15))
    bx0, bx1 = X0 + tw - 3, X1 - tw + 3
    if per == "W":
        d.rounded_rectangle([bx0, Y0 + 2, bx1, my - 2], 16, fill=B[2], outline=OUT)
        d.arc([bx0 + 2, Y0 + 4, bx1 - 2, Y0 + 40], 190, 350, fill=B[4], width=2)
        for k in range(Y0 + 10, Y0 + 24, 4): d.line([bx0 + 10, k, bx1 - 10, k], fill=B[1])                   # the louvres over the motor
        rb(d, bx0 + 8, Y0 + int(H * .2), bx1 - 8, Y0 + int(H * .32), LEATHER["black" if c.w < 4 else "oxblood"], 4)   # the bench seat
        ring(d, cx, Y0 + int(H * .42), 10, RUBBER, 2); d.line([cx - 9, Y0 + int(H * .42), cx + 9, Y0 + int(H * .42)], fill=RUBBER[2], width=2)
        if c.rich: d.line([bx0 + 4, my - 8, bx1 - 4, my - 8], fill=STEEL[4], width=2); plate(d, cx - 5, my - 16)
    else:
        pts = [(bx0, Y0 + 12), (bx0 + 10, Y0 + 2), (bx1 - 10, Y0 + 2), (bx1, Y0 + 12), (bx1, my - 2), (bx0, my - 2)]
        d.polygon(pts, fill=B[2], outline=OUT); d.line([bx0 + 10, Y0 + 3, bx1 - 10, Y0 + 3], fill=B[4], width=2)
        d.line([bx0 + 1, Y0 + 13, bx0 + 1, my - 3], fill=B[3]); d.line([bx1 - 1, Y0 + 13, bx1 - 1, my - 3], fill=B[0])
        if per == "N":
            hazard(d, bx0 + 4, Y0 + 5, bx1 - 4, Y0 + 11)                                                # the counterweight's stripes
            d.rounded_rectangle([bx0 + 6, Y0 + 14, bx1 - 6, Y0 + 26], 6, fill=(200, 204, 210) if c.w >= 3 else (170, 60, 50), outline=OUT)   # the gas bottle
            d.line([bx0 + 10, Y0 + 16, bx1 - 10, Y0 + 16], fill=WHITE[4]); d.rectangle([cx - 2, Y0 + 13, cx + 2, Y0 + 16], fill=BRASS[2])
            rb(d, bx0 + 10, Y0 + int(H * .24), bx1 - 10, Y0 + int(H * .36), LEATHER["black"], 5)       # the seat
            ring(d, cx, Y0 + int(H * .45), 7, RUBBER, 2)
            gy0, gy1 = Y0 + int(H * .2), my - 4                                                            # the overhead guard
            d.rectangle([bx0 + 2, gy0, bx1 - 2, gy1], outline=OUT, width=5); d.rectangle([bx0 + 3, gy0 + 1, bx1 - 3, gy1 - 1], outline=B[1] if c.make != "black" else STEEL[1], width=3)
            for k in range(bx0 + 12, bx1 - 6, 9): d.line([k, gy0 + 3, k, gy1 - 3], fill=OUT, width=3); d.line([k, gy0 + 3, k, gy1 - 3], fill=IRON[3])
            lamp(d, cx, gy0 + 2, 3, on, (250, 160, 30))
            if c.rich: d.line([bx0 + 2, my - 12, bx1 - 2, my - 12], fill=WHITE[4], width=2)
        else:
            d.rounded_rectangle([bx0 + 6, Y0 + int(H * .2), bx1 - 6, my - 6], 10, fill=B[3], outline=OUT)
            for k in (bx0 + 4, bx1 - 5): d.line([k, Y0 + 14, k, my - 6], fill=c.glow[1 if on else 0], width=2)
            disc(d, cx, Y0 + int(H * .3), 7, ramp((40, 44, 52), 14)); d.ellipse([cx - 3, Y0 + int(H * .3) - 3, cx + 3, Y0 + int(H * .3) + 3], fill=c.glow[2] if on else c.glow[0])
            d.line([bx0 + 8, my - 14, bx1 - 8, my - 14], fill=c.glow[1 if on else 0], width=1)
    d.rectangle([X0 + 6, my - 2, X1 - 6, my + 8], fill=IRON[1], outline=OUT)                            # the mast and its carriage
    for k in (X0 + 10, X1 - 14): d.rectangle([k, my - 4, k + 4, my + 10], fill=IRON[3], outline=OUT)
    d.line([cx - 3, my, cx - 3, my + 6], fill=IRON[4]); d.line([cx + 3, my, cx + 3, my + 6], fill=IRON[4])
    load = c.axis("load", "none"); fw = max(5, W // 12)
    for fx in (cx - W // 4, cx + W // 4 - fw):                                                         # the forks
        d.rectangle([fx, my + 8, fx + fw, Y1 - 2], fill=IRON[2], outline=OUT); d.line([fx + 1, my + 9, fx + 1, Y1 - 4], fill=IRON[4])
    if load != "none": _goods(d, X0 + 6, my + 14, X1 - 6, Y1 - 4, load, c, rng)
    glows = []
    for hx in (X0 + 8, X1 - 8):
        lamp(d, hx, my + 3, 2, on, (250, 240, 200))
        if on: glows.append((hx, Y1 + 10, 40, COOL))
    if on and per == "N": glows.append((cx, Y0 + int(H * .2), 26, WARM))
    return glows


reg("forklift", forklift, {"make": ["yellow", "orange", "red", "blue", "grey", "green", "black"], "load": ["none", "cartons", "drums", "pallet", "crates", "sacks"]},
    "counterbalance forklifts of the 1930s to now are 3 1/2 to 4 1/2 ft wide and 7 to 9 ft long with their forks (Clark, Hyster and Toyota specification sheets)",
    front=True, clear=4, states=("off", "on"), nvar=24)


def drillpress(tm, x, y, w, h, st, v, c):
    """A pillar drill from above: the base plate, the round table, the column behind and the head over it with its
    three feed handles. Victorian: dark cast iron driven from the line shaft, its flat leather belt running off north
    over cone pulleys, or a hand-cranked post drill with its flywheel in a poor shop; Great War: an early motor slung
    behind with its cooling ribs and a short belt, a handwheel at the side; Mid-Century: its own motor at the back
    under a rounded belt guard, in the maker's enamel; Modern: a squared guard striped yellow, a red stop button, a
    yellow chuck guard and a work lamp on its arm; Future
    Darkness: a sealed head with a lit collar. It may stand on bare floor, a rubber mat, boards, chequer plate, a
    painted safety bay or a concrete block. On: the chuck a blur of motion, swarf on the table, the work lamp lit."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"
    old = per == "V"; gw = c.era == "great-war"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))
    B = ramp(mix(c.paint[2], (40, 42, 46), .12), 18) if old or gw else (c.paint if per != "F" else c.comp)
    rb(d, X0 + 2, Y0 + int(H * .34), X1 - 2, Y1 - 1, ramp(mix(B[2], (60, 60, 66), .2), 14), 2)             # the base
    for k in (X0 + 6, X1 - 8): d.ellipse([k, Y1 - 6, k + 3, Y1 - 3], fill=IRON[0])                         # its bolts
    tc = (cx, Y0 + int(H * .62)); TB = STEEL if not old else ramp(mix(B[2], (150, 150, 150), .5), 16)
    if c.make in ("black", "maroon", "cream", "green"): rb(d, tc[0] - W * .32, tc[1] - W * .26, tc[0] + W * .32, tc[1] + W * .26, TB, 1)   # a square table (the maker's pattern)
    else: disc(d, tc[0], tc[1], W * .3, TB)                                                                # a round one
    d.line([tc[0] - W * .22, tc[1], tc[0] + W * .22, tc[1]], fill=STEEL[0]); d.line([tc[0], tc[1] - W * .22, tc[0], tc[1] + W * .22], fill=STEEL[0])
    work = c.axis("work", "plate")
    if work == "plate": rb(d, tc[0] - 7, tc[1] - 5, tc[0] + 7, tc[1] + 5, ramp((150, 140, 120), 14), 1)
    elif work == "block": rb(d, tc[0] - 6, tc[1] - 6, tc[0] + 6, tc[1] + 6, ramp((176, 140, 90), 14), 1)
    elif work == "casting": disc(d, tc[0], tc[1], 6, ramp((90, 90, 96), 14))
    elif work == "board": rb(d, tc[0] - 11, tc[1] - 4, tc[0] + 11, tc[1] + 4, ramp((196, 160, 110), 14), 1)
    elif work == "pipe": d.rectangle([tc[0] - 10, tc[1] - 3, tc[0] + 10, tc[1] + 3], fill=ramp((176, 96, 56), 18)[3], outline=OUT)
    elif work == "vice": rb(d, tc[0] - 8, tc[1] - 4, tc[0] + 8, tc[1] + 4, ramp((60, 90, 140), 16), 1); d.line([tc[0], tc[1] - 4, tc[0], tc[1] + 4], fill=OUT)
    if on:
        for k in range(4): d.arc([tc[0] - 9 + k * 4, tc[1] + 2, tc[0] - 5 + k * 4, tc[1] + 6], 0, 270, fill=STEEL[4])
    rb(d, cx - 7, Y0 + 2, cx + 7, Y0 + int(H * .56), B, 4)                                                  # the head
    if old:
        for k, r in enumerate((9, 7, 5)): disc(d, cx, Y0 + 9, r, ramp((80, 80, 88), 14) if c.w > 2 else B)  # the cone pulleys or bevel gears
        if c.w <= 2:                                                                                       # a hand-cranked post drill: its flywheel and crank
            fc = (X0 + 7, Y0 + int(H * .3)); ring(d, fc[0], fc[1], 9, B, 2)
            for a_ in (0, 60, 120): d.line([fc[0] - 8 * math.cos(math.radians(a_)), fc[1] - 8 * math.sin(math.radians(a_)), fc[0] + 8 * math.cos(math.radians(a_)), fc[1] + 8 * math.sin(math.radians(a_))], fill=B[3])
            d.line([fc[0], fc[1], fc[0] - 5, fc[1] + 10], fill=IRON[3], width=2); d.ellipse([fc[0] - 8, fc[1] + 8, fc[0] - 3, fc[1] + 13], fill=c.wood[2], outline=OUT)
        else:
            d.rectangle([cx - 4, Y0 - 3, cx + 4, Y0 + 6], fill=LEATHER["tan"][2], outline=OUT)            # the belt up to the shaft
            if c.rich: d.ellipse([X0 + 4, Y0 + 14, X0 + 9, Y0 + 19], fill=BRASS[3], outline=OUT)             # a brass oil cup
        ring(d, X1 - 5, Y0 + int(H * .3), 6, IRON, 1); d.line([X1 - 11, Y0 + int(H * .3), X1 + 1, Y0 + int(H * .3)], fill=IRON[3])
        if c.rich: d.line([cx - 5, Y0 + 18, cx - 5, Y0 + int(H * .5)], fill=BRASS[3])
    elif gw:                                                                                              # an early motor drill: the motor slung behind, a short belt
        rb(d, X0 + 2, Y0 + 1, X1 - 2, Y0 + 11, ramp(mix(c.paint[2], (40, 40, 44), .3), 16), 5)
        for k in range(X0 + 6, X1 - 5, 4): d.line([k, Y0 + 3, k, Y0 + 9], fill=OUT)                           # its cooling ribs
        d.ellipse([X1 - 9, Y0 + 2, X1 - 3, Y0 + 9], fill=(170, 100, 60), outline=OUT)                          # the copper terminal box
        d.rectangle([cx - 3, Y0 + 10, cx + 3, Y0 + 16], fill=LEATHER["tan"][2], outline=OUT)
        ring(d, X0 + 6, Y0 + int(H * .45), 6, B, 1)                                                           # the handwheel
    else:
        if per == "N":
            rb(d, X0 + 1, Y0 + 1, X1 - 1, Y0 + 14, B, 1)                                                       # the squared belt guard
            d.line([X0 + 3, Y0 + 12, X1 - 3, Y0 + 12], fill=HAZ[0], width=2)
            lamp(d, X0 + 6, Y0 + int(H * .4), 3, True, (200, 40, 40))                                          # the stop button
            d.line([X1 - 3, Y0 + 14, cx + 9, Y0 + int(H * .45)], fill=RUBBER[2], width=2); lamp(d, cx + 9, Y0 + int(H * .45), 3, on, (250, 240, 200))   # the work lamp on its arm
            d.rectangle([cx - 7, Y0 + int(H * .44), cx + 7, Y0 + int(H * .58)], fill=(230, 200, 90), outline=OUT); d.line([cx - 5, Y0 + int(H * .46), cx - 5, Y0 + int(H * .56)], fill=(250, 240, 180))   # the chuck guard
        else:
            rb(d, X0 + 4, Y0 + 1, X1 - 4, Y0 + 12, B, 4)                                                       # the rounded belt guard
            disc(d, cx, Y0 + 4, 5, ramp(mix(B[2], (40, 40, 44), .4), 12))                                      # the motor behind
        if per == "F": d.ellipse([cx - 5, Y0 + int(H * .44), cx + 5, Y0 + int(H * .58)], outline=c.glow[1 if on else 0], width=2)
        if c.rich: plate(d, cx - 4, Y0 + 4, STEEL, 8, 3)
    hb = (X1 - 6, Y0 + int(H * .42))                                                                       # the feed handles
    for a_ in (200, 320, 80):
        ex, ey = hb[0] + math.cos(math.radians(a_)) * 9, hb[1] + math.sin(math.radians(a_)) * 9
        d.line([hb[0], hb[1], ex, ey], fill=STEEL[2], width=2); d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], fill=RUBBER[2] if per in "NF" else IRON[1], outline=OUT)
    ch = (cx, Y0 + int(H * .52))
    if on: d.ellipse([ch[0] - 4, ch[1] - 4, ch[0] + 4, ch[1] + 4], outline=STEEL[3]); d.ellipse([ch[0] - 2, ch[1] - 2, ch[0] + 2, ch[1] + 2], fill=STEEL[4])
    else: disc(d, ch[0], ch[1], 3, STEEL)
    if on and per in "NF": return [(cx, tc[1], 14, WARM)]


reg("drillpress", drillpress, {"make": ["grey", "green", "blue", "black", "red", "cream", "maroon"], "work": ["plate", "block", "vice", "none", "pipe", "casting", "board"],
                               "floor": ["bare", "mat", "boards", "plate", "bay", "concrete"]},
    "pillar drills stand on a base about 1 1/2 to 2 ft square (Fosdick, Walker-Turner and Delta catalogues)", front=True, clear=2.5, states=("off", "on"), nvar=32)


CLOTHC = {"plain": (214, 206, 186), "check": (60, 80, 140), "stripe": (160, 50, 44), "twill": (110, 100, 80), "indigo": (40, 50, 96),
          "khaki": (176, 160, 110), "black": (44, 42, 46), "green": (60, 110, 70), "rose": (200, 120, 130)}


def powerloom(tm, x, y, w, h, st, v, c):
    """A power loom from above, the weaver's side to the south: the warp beam at the back, the threads running
    forward through the healds and the reed, the woven cloth winding on to the cloth beam at the front, a shuttle box
    at each end of the slay and the driving pulley at the side. Age of Reason: a heavy timber frame (Cartwright's
    kind); Victorian: the black cast-iron Lancashire loom with its picking sticks; Great War and Mid-Century: the same
    painted, a Northrop's round battery of bobbins at the side, its own motor later; Modern: a shuttleless rapier
    loom under guards with its control panel. The cloth may be plain, checked or striped. On: the shuttle out on the
    race, the threads blurred, a lamp lit. It stands on bare floor, boards, flags or a painted bay."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; on = st == "on"; rng = np.random.default_rng(_seed(v))
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    F = c.wood if per == "E" else (ramp((40, 42, 46), 12) if per == "V" else (c.paint if per == "W" else ramp(mix(c.paint[2], (200, 200, 200), .3), 14)))
    yarn = ramp(CLOTHC[c.axis("cloth", "plain")], 18)
    if per == "E": F = ramp(mix(c.wood[2], LIV.get(c.make, GREY), .45), 18)
    elif per == "V": F = ramp(mix(c.paint[2], (36, 38, 42), .6), 14)
    fx0, fx1 = X0 + 12, X1 - 12
    for k in (X0 + 2, X1 - 12): rb(d, k, Y0 + 2, k + 10, Y1 - 2, F, 2)                                       # the side frames
    by = Y0 + 8; d.rounded_rectangle([fx0, by, fx1, by + 12], 5, fill=yarn[1], outline=OUT)                  # the warp beam
    for k in range(fx0 + 3, fx1 - 2, 4): d.line([k, by + 2, k, by + 10], fill=yarn[3])
    ry = Y0 + int(H * .62); cyy = Y1 - 16
    for k in range(fx0 + 2, fx1 - 1, 2): d.line([k, by + 12, k, ry], fill=yarn[3] if (k // 2) % 2 else yarn[2])   # the warp threads
    if on:
        for k in range(by + 16, ry - 2, 5): d.line([fx0, k, fx1, k], fill=mix(yarn[3], (230, 230, 230), .4))
    for hy in (Y0 + int(H * .36), Y0 + int(H * .44)):                                                         # the heald shafts
        d.rectangle([fx0 - 2, hy, fx1 + 2, hy + 3], fill=F[1] if per != "E" else c.wood[0], outline=OUT)
    swatch(d, fx0, ry + 6, fx1, cyy, yarn, {"check": "check", "stripe": "stripe"}.get(c.axis("cloth", "plain"), "plain"))
    d.rectangle([X0 + 4, ry, X1 - 4, ry + 5], fill=F[3], outline=OUT)                                          # the slay and reed
    for k in range(fx0, fx1, 3): d.point((k, ry + 2), fill=STEEL[3])
    for bx in (X0 + 1, X1 - 15): rb(d, bx, ry - 3, bx + 14, ry + 8, F, 1)                                      # the shuttle boxes
    sx = (fx0 + fx1) // 2 if on else X0 + 3
    d.polygon([(sx, ry + 2), (sx + 4, ry), (sx + 10, ry), (sx + 14, ry + 2), (sx + 10, ry + 4), (sx + 4, ry + 4)], fill=ramp((190, 150, 90), 14)[3], outline=OUT)
    d.rounded_rectangle([fx0 - 2, cyy, fx1 + 2, Y1 - 4], 5, fill=yarn[2], outline=OUT); d.line([fx0, cyy + 2, fx1, cyy + 2], fill=yarn[4])   # the cloth beam
    if per in "EV":                                                                                          # the picking sticks
        for k in (X0 + 6, X1 - 8): d.line([k, Y0 + int(H * .3), k + (6 if k < cx else -6), ry - 2], fill=c.wood[3], width=3)
    pc = (X1 - 6, Y0 + int(H * .26))
    if per in "EV" or c.era == "great-war":
        disc(d, pc[0], pc[1], 10, IRON if per != "E" else c.wood); d.rectangle([pc[0] - 3, Y0, pc[0] + 3, pc[1]], fill=LEATHER["tan"][2], outline=OUT)
    if per == "W":
        bc = (X0 + 7, Y0 + int(H * .3)); d.ellipse([bc[0] - 9, bc[1] - 9, bc[0] + 9, bc[1] + 9], fill=IRON[2], outline=OUT)
        for a_ in range(0, 360, 36): d.ellipse([bc[0] + math.cos(math.radians(a_)) * 6 - 2, bc[1] + math.sin(math.radians(a_)) * 6 - 2, bc[0] + math.cos(math.radians(a_)) * 6 + 2, bc[1] + math.sin(math.radians(a_)) * 6 + 2], fill=yarn[3])
        if c.era == "mid-century":                                                                         # its own motor and gear guards over both ends
            G = ramp(mix(F[2], (200, 200, 196), .45), 14)
            rb(d, X0 + 1, ry + 8, X0 + 22, Y1 - 1, G, 4); rb(d, X1 - 22, ry + 8, X1 - 1, Y1 - 1, G, 4)
            rb(d, X1 - 26, Y0 + 2, X1 - 2, Y0 + int(H * .4), ramp((60, 64, 70), 12), 6); d.ellipse([X1 - 20, Y0 + 8, X1 - 8, Y0 + 20], fill=(80, 84, 90), outline=OUT)
    if per == "N":
        rb(d, X0 + 14, Y0 + int(H * .3), X1 - 14, Y0 + int(H * .5), ramp(mix(c.paint[2], (230, 230, 230), .5), 10), 3)   # guards
        rb(d, X1 - 24, Y0 + int(H * .52), X1 - 4, Y0 + int(H * .62), ramp((60, 64, 70), 12), 2); screen(d, X1 - 21, Y0 + int(H * .53), X1 - 9, Y0 + int(H * .6), on)
    if c.rich: plate(d, X0 + 3, Y0 + int(H * .7), BRASS if per != "N" else STEEL, 7, 4)
    if on and per in "WN": return [(X1 - 20, ry, 30, WARM)]


reg("powerloom", powerloom, {"floor": ["bare", "boards", "bay", "plate"], "make": ["green", "grey", "black", "blue", "cream", "olive", "maroon"], "cloth": list(CLOTHC)},
    "a Lancashire or Northrop power loom stands about 7 to 9 ft across the reed and 4 to 6 ft deep (Hattersley and Draper catalogues)", glob=True, front=True, clear=2.5, states=("off", "on"), nvar=24)


def conveyor(tm, x, y, w, h, st, v, c):
    """A conveyor from above, running north to south between its side rails. Victorian and Great War: a canvas belt on
    a timber frame, a belt pulley at the head; Mid-Century: rows of steel rollers in a painted frame; Modern: a black
    rubber belt with yellow guards, a red stop cord along its side and the drive motor at the head; Future Darkness: a
    sealed composite belt with lit edges. Full: goods along the belt (cartons, sacks, parcels, coal, bottles)."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; full = st == "full"; rng = np.random.default_rng(_seed(v))
    kind = c.axis("goods", "cartons"); rollers = per == "W" and c.era == "mid-century" and kind not in ("coal",)
    F = ramp(mix(c.wood[2], c.paint[2], .35), 18) if per == "V" or c.era == "great-war" and c.w < 3 else (c.paint if per != "F" else c.comp)
    for k in (X0, X1 - 10): rb(d, k, Y0, k + 10, Y1, F, 2)                                                  # side rails
    bx0, bx1 = X0 + 11, X1 - 11
    if rollers:
        d.rectangle([bx0, Y0 + 2, bx1, Y1 - 2], fill=(30, 30, 34))
        for k in range(Y0 + 4, Y1 - 4, 8): d.rounded_rectangle([bx0, k, bx1, k + 5], 2, fill=STEEL[2], outline=OUT); d.line([bx0 + 2, k + 1, bx1 - 2, k + 1], fill=STEEL[4])
    else:
        bk = c.axis("belt", "rubber")
        belt = {"canvas": LINEN, "rubber": RUBBER, "green": ramp((60, 120, 80), 14), "grey": ramp((120, 124, 128), 12), "white": ramp((220, 222, 216), 8), "brown": ramp((120, 80, 50), 14)}[bk]
        if per == "V" or c.era == "great-war": belt = LINEN if bk in ("canvas", "white", "green") else LEATHER["tan"]
        if per == "F": belt = ramp(mix((40, 44, 52), belt[2], .3), 10)
        d.rectangle([bx0, Y0 + 2, bx1, Y1 - 2], fill=belt[2], outline=OUT)
        for k in range(Y0 + 6, Y1 - 4, 6): d.line([bx0 + 1, k, bx1 - 1, k], fill=belt[1])
        disc(d, cx, Y0 + 6, 0, belt)
    hd = Y0 + 2                                                                                           # the head drum
    d.rounded_rectangle([X0 + 2, hd, X1 - 2, hd + 9], 4, fill=IRON[2] if per != "F" else c.comp[1], outline=OUT); d.line([X0 + 4, hd + 2, X1 - 4, hd + 2], fill=IRON[4])
    if per == "N":
        rb(d, X1 - 14, Y0 + 12, X1 - 1, Y0 + 30, c.paint, 2); hazard(d, X0 + 1, hd + 10, X1 - 1, hd + 14)
        d.line([X0 - 1, Y0 + 30, X0 - 1, Y1 - 10], fill=(200, 40, 40), width=2)
        for k in range(Y0 + 40, Y1 - 10, 40): d.rectangle([X0 - 2, k, X0 + 1, k + 3], fill=HAZ[0])
    if per == "F":
        for k in (X0 + 7, X1 - 8): d.line([k, Y0 + 12, k, Y1 - 4], fill=c.glow[1 if full else 0], width=1)
    if per == "V" or c.era == "great-war": d.rectangle([cx - 4, max(0, Y0 - 6), cx + 4, hd + 4], fill=LEATHER["tan"][2], outline=OUT)
    if c.rich and per != "F": plate(d, X0 + 1, Y1 - 12, BRASS if per in "VW" else STEEL, 5, 6)
    if full:
        step = max(28, (bx1 - bx0) + 10)
        for k, gy in enumerate(range(Y0 + 22, Y1 - 24, step)):
            if kind in ("coal", "ore", "gravel"): _goods(d, bx0 + 3, gy, bx1 - 3, gy + step - 8, kind, c, rng)
            else: _goods(d, bx0 + 2 + (k % 2) * 2, gy, bx1 - 4 + (k % 2) * 2, gy + (bx1 - bx0) - 4, {"cartons": "parcels", "sacks": "sacks", "bottles": "bottles", "parcels": "parcels", "crates": "crates"}.get(kind, "parcels"), c, rng)


reg("conveyor", conveyor, {"make": ["grey", "green", "blue", "yellow", "orange", "black", "cream"], "goods": ["cartons", "sacks", "coal", "bottles", "crates", "gravel", "ore"], "belt": ["rubber", "canvas", "green", "white", "brown", "grey"]},
    "belt and roller conveyors run 2 to 3 1/2 ft wide in sections of 10 ft and more (Link-Belt and Rapistan catalogues)", states=("full", "empty"), nvar=16)


def car(d, x0, y0, x1, y1, c, col, front="s"):
    """A motor car from above for a lift or a bay: body, bonnet, windscreen, roof and rear window, wheels just
    showing, lamps at the front. Mid-Century: separate wings bulging at each corner; Modern: one smooth shell; Future
    Darkness: a dark pod with a lit band."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); W, H = x1 - x0, y1 - y0; cx = (x0 + x1) // 2; per = c.per
    P = ramp(col, 20)
    for wy in (y0 + int(H * .14), y1 - int(H * .26)):
        for wx in (x0, x1 - 8): tyre(d, wx, wy, wx + 8, wy + int(H * .13))
    if per == "W":
        for wy in (y0 + int(H * .1), y1 - int(H * .3)):
            for wx in (x0 + 1, x1 - 17): d.rounded_rectangle([wx, wy, wx + 16, wy + int(H * .22)], 7, fill=P[1], outline=OUT)
        d.rounded_rectangle([x0 + 9, y0 + 2, x1 - 9, y1 - 2], 10, fill=P[2], outline=OUT)
        d.line([cx, y1 - int(H * .34), cx, y1 - 6], fill=P[0])                                        # the bonnet's hinge
        d.rectangle([cx - 8, y1 - 6, cx + 8, y1 - 2], fill=STEEL[3], outline=OUT)                         # the grille
    else:
        d.rounded_rectangle([x0 + 4, y0 + 2, x1 - 4, y1 - 2], 12, fill=P[2], outline=OUT)
        d.line([x0 + 7, y0 + 8, x0 + 7, y1 - 10], fill=P[4]); d.line([x1 - 7, y0 + 8, x1 - 7, y1 - 10], fill=P[0])
    ws0, ws1 = y1 - int(H * .44), y1 - int(H * .36)
    glass = (34, 44, 60) if per != "F" else (20, 24, 30)
    d.polygon([(x0 + 12, ws1), (x1 - 12, ws1), (x1 - 16, ws0), (x0 + 16, ws0)], fill=glass, outline=OUT)   # windscreen
    d.line([x0 + 16, ws0 + 2, x0 + 26, ws0 + 2], fill=(110, 130, 150))
    rb(d, x0 + 15, y0 + int(H * .3), x1 - 15, ws0, P, 4)                                                 # roof
    d.polygon([(x0 + 16, y0 + int(H * .3)), (x1 - 16, y0 + int(H * .3)), (x1 - 14, y0 + int(H * .2)), (x0 + 14, y0 + int(H * .2))], fill=glass, outline=OUT)
    for lx in (x0 + 9, x1 - 9): lamp(d, lx, y1 - 5, 3, False, (240, 230, 190))
    if per == "F": d.line([x0 + 6, y1 - 12, x1 - 6, y1 - 12], fill=c.glow[1], width=2)


def carlift(tm, x, y, w, h, st, v, c):
    """A garage car lift from above. Mid-Century: an in-ground lift, its chrome ram rising from a pit plate between two
    long saddle rails, or a four-post lift of two runways with ramps at the foot; Modern: a two-post lift, its posts
    at the sides with four swing arms reaching in, or a four-post or scissor lift; Future Darkness: a flush platform
    with lit edges. Full: a car stands on it (its wings, windscreen, roof and lamps)."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; full = st == "full"
    kind = c.axis("kind", "post"); B = c.paint if per != "F" else c.comp
    if per == "F":
        rb(d, X0 + 6, Y0 + 4, X1 - 6, Y1 - 4, B, 6)
        d.rounded_rectangle([X0 + 9, Y0 + 7, X1 - 9, Y1 - 7], 5, outline=c.glow[1], width=2)                  # the lit edge
        for k in (X0 + 30, X1 - 44):
            for wy in (Y0 + int(H * .25), Y1 - int(H * .3)): d.rectangle([k, wy, k + 14, wy + 8], fill=ramp((60, 64, 72), 12)[3], outline=OUT)   # wheel pads
        rb(d, X1 - 18, Y1 - 30, X1 - 4, Y1 - 6, ramp((50, 54, 62), 12), 3); screen(d, X1 - 16, Y1 - 27, X1 - 6, Y1 - 18, True, c.glow)   # its control pillar
        if kind == "post":
            for py in (Y0 + int(H * .3), Y0 + int(H * .7)):
                for px_ in (X0, X1 - 16): rb(d, px_, py - 14, px_ + 16, py + 14, ramp((60, 64, 72), 12), 4); lamp(d, px_ + 8, py, 3, True, c.glow[2])
        elif kind == "runway":
            for k in (X0 + 22, X1 - 52): d.rectangle([k, Y0 + 10, k + 30, Y1 - 10], fill=B[3], outline=c.glow[0])
        else:
            for k in range(Y0 + 20, Y1 - 12, 24): d.line([X0 + 12, k, X1 - 12, k], fill=B[1])
    elif kind == "runway":
        for px_, py in ((X0, Y0 + 2), (X1 - 14, Y0 + 2), (X0, Y1 - 22), (X1 - 14, Y1 - 22)): rb(d, px_, py, px_ + 14, py + 18, B, 2)
        d.rectangle([X0 + 2, Y0 + 8, X1 - 2, Y0 + 14], fill=B[1], outline=OUT); d.rectangle([X0 + 2, Y1 - 16, X1 - 2, Y1 - 10], fill=B[1], outline=OUT)
        for k in (X0 + 20, X1 - 54):                                                                  # the runways
            rb(d, k, Y0 + 14, k + 34, Y1 - 6, ramp(mix(B[2], (130, 130, 130), .5), 14), 1)
            for t in range(Y0 + 20, Y1 - 10, 6): d.line([k + 3, t, k + 31, t], fill=(100, 100, 104))       # tread plate
            d.polygon([(k, Y1 - 6), (k + 34, Y1 - 6), (k + 30, Y1), (k + 4, Y1)], fill=STEEL[1], outline=OUT)   # the ramp
        if per == "N": hazard(d, X0 + 2, Y1 - 16, X1 - 2, Y1 - 10)
    elif kind == "post" and per == "N" or kind == "scissor" and per == "W":
        for py in (cy,):
            for px_ in (X0, X1 - 22):
                rb(d, px_, py - 22, px_ + 22, py + 22, B, 2); d.rectangle([px_ + 5, py - 16, px_ + 17, py + 16], fill=B[0]); d.rectangle([px_ + 8, py - 12, px_ + 14, py + 12], fill=IRON[2])
                if per == "N": hazard(d, px_ + 1, py + 23, px_ + 21, py + 29)
                for sgn in (-1, 1):                                                                   # the swing arms
                    ex = cx + (-20 if px_ < cx else 20); ey = py + sgn * int(H * .3)
                    sx_ = px_ + (22 if px_ < cx else 0); sy_ = py + sgn * 14
                    d.line([sx_, sy_, ex, ey], fill=OUT, width=8); d.line([sx_, sy_, ex, ey], fill=IRON[3], width=5)
                    d.rectangle([ex - 5, ey - 5, ex + 5, ey + 5], fill=RUBBER[3], outline=OUT)
        if per == "N": d.rectangle([X0 + 16, cy - 4, X1 - 16, cy + 4], fill=STEEL[1], outline=OUT)         # the floor plate over the cables
    elif kind == "scissor":
        rb(d, X0 + 20, Y0 + 20, X1 - 20, Y1 - 20, B, 3)
        d.line([X0 + 24, Y0 + 24, X1 - 24, Y1 - 24], fill=B[0], width=4); d.line([X1 - 24, Y0 + 24, X0 + 24, Y1 - 24], fill=B[0], width=4)
        hazard(d, X0 + 20, Y1 - 26, X1 - 20, Y1 - 20)
    else:                                                                                             # the in-ground lift
        d.rectangle([X0 + 14, Y0 + 14, X1 - 14, Y1 - 14], fill=(70, 72, 76), outline=OUT)                 # the pit's cover plates
        for k in range(Y0 + 30, Y1 - 14, 30): d.line([X0 + 15, k, X1 - 15, k], fill=(50, 52, 56))
        for k in (X0 + 24, X1 - 36): rb(d, k, Y0 + 24, k + 12, Y1 - 24, B, 3)                             # the saddle rails
        d.rectangle([X0 + 30, cy - 6, X1 - 30, cy + 6], fill=B[1], outline=OUT)
        disc(d, cx, cy, 16, STEEL); d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=STEEL[0])          # the chrome ram
    if c.rich and per != "F":
        for px_ in (X0 + 2, X1 - 8): plate(d, px_, Y0 + int(H * .45), STEEL, 6, 10)
    if full:
        car(d, X0 + 18, Y0 + 14, X1 - 18, Y1 - 14, c, CARC[c.axis("car", "red")])


CARC = {"red": (170, 40, 36), "blue": (50, 80, 150), "black": (40, 40, 46), "white": (220, 220, 214), "green": (60, 100, 70),
        "silver": (170, 174, 180), "cream": (214, 200, 150)}
reg("carlift", carlift, {"make": ["blue", "red", "grey", "yellow", "black", "green", "orange"], "kind": ["post", "runway", "scissor"], "car": list(CARC)},
    "garage lifts take a car 6 to 7 ft wide and 13 to 16 ft long between their posts or on their runways (Rotary and Weaver lift catalogues)",
    front=True, clear=4, states=("empty", "full"), nvar=28)


def toolchest(tm, x, y, w, h, st, v, c):
    """A rolling tool chest from above, its back to the wall. Mid-Century: a steel chest of rounded edges with a chrome
    handle bar each side and a hinged top; Modern: a bigger squared chest with a rubber mat on its lid and stickers;
    Future Darkness: a composite case with a lit lock strip. Things lie on the lid (a rag, a radio, a mug, parts, a
    manual). Open: the lid tipped back against the wall showing the tray of spanners, and the top drawer pulled out
    with its sockets. It stands on bare floor, a mat, boards, chequer plate, concrete or a painted bay."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; op = st == "open"; B = c.paint if per != "F" else c.comp
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    for hx in (X0, X1 - 3): d.rectangle([hx, Y0 + 6, hx + 3, Y1 - 6], fill=c.chrome[3], outline=OUT)        # side handles
    bx0, bx1 = X0 + 4, X1 - 4
    if op:
        rb(d, bx0, Y0, bx1, Y0 + 5, ramp(mix(B[2], (30, 30, 30), .4), 12), 1)                              # the lid tipped back
        d.rectangle([bx0, Y0 + 5, bx1, Y1 - 10], fill=B[0], outline=OUT)                                    # the open well
        d.rectangle([bx0 + 2, Y0 + 7, bx1 - 2, Y1 - 12], fill=(40, 40, 46))
        for k, tx in enumerate(range(bx0 + 4, bx1 - 4, 5)):                                                # spanners laid in the tray
            d.line([tx, Y0 + 9, tx, Y1 - 15], fill=STEEL[3 + k % 2], width=2); d.ellipse([tx - 2, Y0 + 8, tx + 2, Y0 + 11], outline=STEEL[4])
        rb(d, bx0 - 1, Y1 - 10, bx1 + 1, Y1, B, 1)                                                          # the drawer pulled out
        d.rectangle([bx0 + 2, Y1 - 8, bx1 - 2, Y1 - 2], fill=(150, 40, 36) if c.make != "red" else (40, 40, 46))
        for k in range(bx0 + 4, bx1 - 3, 4): d.ellipse([k - 1, Y1 - 7, k + 2, Y1 - 4], fill=STEEL[4], outline=OUT)
    else:
        rb(d, bx0, Y0, bx1, Y1, B, 4 if per == "W" else 1)
        if per == "W": d.line([bx0 + 3, Y1 - 4, bx1 - 3, Y1 - 4], fill=c.chrome[4])
        if per == "N": d.rectangle([bx0 + 3, Y0 + 3, bx1 - 3, Y1 - 4], fill=RUBBER[2] if c.w >= 2 else B[1])     # the lid mat
        if per == "F": d.line([bx0 + 3, Y1 - 3, bx1 - 3, Y1 - 3], fill=c.glow[1], width=2)
        top = c.axis("top", "clear")
        if top == "rag": d.polygon([(cx - 8, cy - 4), (cx + 6, cy - 6), (cx + 9, cy + 4), (cx - 5, cy + 5)], fill=(170, 60, 50), outline=OUT)
        elif top == "radio": rb(d, cx - 9, cy - 5, cx + 9, cy + 4, ramp((60, 60, 64), 12), 2); d.ellipse([cx + 1, cy - 3, cx + 7, cy + 3], fill=(30, 30, 34))
        elif top == "mug": d.ellipse([cx + 3, cy - 4, cx + 10, cy + 3], fill=WHITE[2], outline=OUT); d.ellipse([cx + 5, cy - 2, cx + 8, cy + 1], fill=(70, 40, 30))
        elif top == "parts":
            for k in range(4): d.ellipse([bx0 + 6 + k * 7, cy - 2, bx0 + 10 + k * 7, cy + 2], fill=STEEL[2 + k % 3], outline=OUT)
        elif top == "manual": rb(d, cx - 10, cy - 6, cx + 4, cy + 5, ramp((200, 190, 160), 12), 1)
        elif top == "spanner": d.line([bx0 + 6, cy + 3, bx1 - 8, cy - 3], fill=STEEL[3], width=2)
        if per == "N" and c.w <= 3:
            for k, col in enumerate(((220, 200, 40), (60, 120, 200), (230, 230, 230))): d.rectangle([bx1 - 9 - k * 6, Y1 - 8, bx1 - 5 - k * 6, Y1 - 5], fill=col)
        if c.rich and per != "F": d.rectangle([cx - 3, Y1 - 3, cx + 3, Y1 - 1], fill=c.chrome[4])
    for kx in (X0 + 5, X1 - 6): d.rectangle([kx - 1, Y1 - 1, kx + 2, Y1 + 1], fill=RUBBER[1])


reg("toolchest", toolchest, {"floor": ["bare", "mat", "boards", "plate", "concrete", "bay"], "make": ["red", "blue", "black", "grey", "green", "orange", "silver"], "top": ["clear", "rag", "radio", "mug", "parts", "manual", "spanner"]},
    "roller cabinets with their top chests are 2 to 3 ft wide and 1 1/2 ft deep (Kennedy, Snap-on and Craftsman catalogues)",
    front=True, clear=2, states=("closed", "open"), openable="chest", nvar=32)


def welder(tm, x, y, w, h, st, v, c):
    """A welding set from above. Mid-Century: arc, a big transformer cabinet with louvres, a crank on its top and a
    current dial; gas, the black oxygen and maroon acetylene bottles chained on a grey trolley; MIG, a heavy cabinet
    with the wire feeder and its gas bottle. Modern: arc, a small inverter box with its strap and a big coil of leads;
    gas, the bottles on a painted two-wheeled trolley with chrome regulators; MIG, a tall set on its wheeled cart with
    the bottle chained behind. Future Darkness: a compact sealed unit with a lit display and a slim torch lead. It may
    stand on bare floor, a welding blanket, a steel floor plate or a bench. On: the arc or flame burning at the torch,
    bright, with sparks."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"; kind = c.axis("kind", "arc")
    B = c.paint if per != "F" else ramp(mix(c.paint[2], COMPOSITE[2], .3), 16)
    tip = (X0 + 7, Y1 - 6)
    mat = c.axis("mat", "bare")                                                                       # what it stands on
    if mat == "blanket": d.rectangle([X0, Y0, X1, Y1], fill=(196, 180, 120), outline=(130, 116, 80)); [d.line([X0 + 1, k, X1 - 1, k], fill=(176, 160, 104)) for k in range(Y0 + 3, Y1, 4)]
    elif mat == "plate": rb(d, X0, Y0, X1, Y1, ramp((96, 100, 106), 12), 0); [d.line([X0 + k, Y0 + 2, X0 + k + 3, Y0 + 5], fill=(130, 134, 140)) for k in range(3, W - 4, 8)]
    elif mat == "bench": rb(d, X0, Y0, X1, Y1, ramp((70, 120, 160) if per != "W" else (90, 90, 70), 14), 1)
    if per == "F":
        if mat == "bare": rb(d, X0, Y0, X1, Y1, ramp((48, 52, 60), 10), 4)                                     # its dark composite floor pad
        B = ramp(mix(c.paint[2], COMPOSITE[2], .2), 18)
        rb(d, X0 + 3, Y0 + 3, X1 - 3, Y0 + int(H * .6), B, 6)
        if kind == "gas":
            for gx in (X0 + 9, X1 - 9): disc(d, gx, Y0 + int(H * .32), 5, ramp((40, 44, 52), 12)); lamp(d, gx, Y0 + int(H * .32), 1, on, c.glow[2])
        elif kind == "mig": d.ellipse([cx - 6, Y0 + 14, cx + 6, Y0 + 26], fill=(20, 22, 26), outline=c.glow[1 if on else 0])
        d.line([X0 + 6, Y0 + int(H * .6) - 3, X1 - 6, Y0 + int(H * .6) - 3], fill=c.glow[1 if on else 0], width=2)
        screen(d, cx - 6, Y0 + 9, cx + 6, Y0 + 15, on, c.glow, "trace")
        if kind not in ("arc", "mig"): disc(d, X1 - 6, Y0 + 6, 5, ramp((60, 64, 72), 12))
        cable(d, [(cx, Y0 + int(H * .5)), (cx, Y1 - 8)], ramp((40, 44, 52), 10), 1)
        coil(d, cx, Y1 - 8, 7, ramp((40, 44, 52), 10), 2)                                                     # the lead coiled at its foot
    elif kind == "gas":
        T = ramp((84, 86, 92), 14) if per == "W" else B
        rb(d, X0 + 4, Y0 + 3, X1 - 4, Y0 + int(H * .62), T, 2)                                                   # the trolley
        if per == "N":
            for wx in (X0, X1 - 5): tyre(d, wx, Y0 + 2, wx + 5, Y0 + 14)
            d.line([X0 + 6, Y0 + int(H * .62) + 2, X1 - 6, Y0 + int(H * .62) + 2], fill=STEEL[3], width=2)       # its handle
        disc(d, cx - 7, Y0 + 13, 7, ramp((44, 44, 48), 12)); disc(d, cx + 8, Y0 + 13, 7, ramp((120, 40, 44), 14))   # oxygen and acetylene
        for gx in (cx - 7, cx + 8): d.rectangle([gx - 2, Y0 + 10, gx + 2, Y0 + 14], fill=BRASS[3] if per == "W" else STEEL[4], outline=OUT)
        d.line([X0 + 4, Y0 + 18, X1 - 4, Y0 + 18], fill=STEEL[2])                                              # the chain
        if per == "N": coil(d, cx + 4, Y1 - 8, 9, ramp((170, 40, 40), 16), 2)
        cable(d, [(cx - 7, Y0 + 20), (cx - 2, Y1 - 10), tip], ramp((60, 90, 170), 16)); cable(d, [(cx + 8, Y0 + 20), (cx + 2, Y1 - 8), (tip[0] + 2, tip[1])], ramp((170, 40, 40), 16))
        d.line([tip[0], tip[1], tip[0] + 8, tip[1] - 3], fill=BRASS[3], width=2)
    elif per == "W":
        rb(d, X0 + 3, Y0 + 2, X1 - 3, Y0 + int(H * .66), B, 4)
        for k in range(Y0 + 6, Y0 + int(H * .5), 3): d.line([X0 + 8, k, cx - 1, k], fill=B[0])                     # louvres
        if kind == "mig": rb(d, cx + 1, Y0 + 4, X1 - 6, Y0 + 15, ramp(mix(B[2], (60, 62, 66), .4), 12), 2); d.ellipse([cx + 4, Y0 + 6, cx + 12, Y0 + 13], fill=(150, 90, 50), outline=OUT)
        else: ring(d, cx + 7, Y0 + 9, 4, STEEL, 1)                                                                # the crank on its top
        d.ellipse([cx + 3, Y0 + int(H * .42), cx + 11, Y0 + int(H * .58)], fill=(230, 226, 210), outline=OUT)        # the dial
        cable(d, [(X0 + 8, Y0 + int(H * .66)), (X0 + 10, Y1 - 10), tip], RUBBER)
        coil(d, cx + 6, Y1 - 7, 8, RUBBER, 2)
        d.line([tip[0], tip[1], tip[0] + 6, tip[1] - 5], fill=(40, 40, 44), width=3)
    elif kind == "arc":
        rb(d, X0 + 3, Y0 + 3, cx + 3, Y0 + int(H * .38), B, 2)                                                    # the inverter box
        d.line([X0 + 5, Y0 + 5, cx + 1, Y0 + 5], fill=RUBBER[2], width=2)                                         # its strap
        lamp(d, cx - 2, Y0 + int(H * .3), 2, on, (90, 220, 90))
        coil(d, cx + 4, Y0 + int(H * .62), 11, RUBBER, 3)
        cable(d, [(X0 + 8, Y0 + int(H * .38)), (X0 + 8, Y1 - 10), tip], RUBBER)
        d.line([tip[0], tip[1], tip[0] + 6, tip[1] - 5], fill=(40, 40, 44), width=3)
    else:
        for wx in (X0, X1 - 5): tyre(d, wx, Y0 + int(H * .45), wx + 5, Y0 + int(H * .7))
        rb(d, X0 + 4, Y0 + int(H * .25), X1 - 4, Y0 + int(H * .72), B, 2)                                          # the MIG set on its cart
        disc(d, cx, Y0 + 7, 6, ramp((70, 120, 80), 14)); d.line([X0 + 6, Y0 + 13, X1 - 6, Y0 + 13], fill=STEEL[2])   # its bottle behind
        screen(d, cx - 4, Y0 + int(H * .3), cx + 6, Y0 + int(H * .4), on, [(40, 30, 20), (230, 120, 40), (255, 200, 120)])
        cable(d, [(X0 + 8, Y0 + int(H * .72)), (X0 + 10, Y1 - 10), tip], RUBBER)
        d.line([tip[0], tip[1], tip[0] + 6, tip[1] - 5], fill=(20, 70, 120), width=3)
    if c.rich: plate(d, X0 + 6, Y0 + int(H * .55), STEEL, 6, 3)
    if on:
        col = (250, 250, 255) if kind != "gas" else (120, 170, 255)
        d.ellipse([tip[0] - 3, tip[1] - 3, tip[0] + 3, tip[1] + 3], fill=col)
        for a_ in (200, 240, 290, 330): d.line([tip[0], tip[1], tip[0] + 6 * math.cos(math.radians(a_)), tip[1] + 6 * math.sin(math.radians(a_))], fill=(255, 220, 120))
        return [(tip[0], tip[1], 40, ARC if kind != "gas" else COOL)]


reg("welder", welder, {"make": ["blue", "red", "orange", "green", "grey", "yellow", "cream"], "kind": ["arc", "gas", "mig"], "mat": ["bare", "blanket", "plate", "bench", "bare"]},
    "a transformer welding set or a gas welding trolley stands about 1 1/2 to 2 ft square (Lincoln, Murex and BOC catalogues)",
    front=True, clear=2, states=("off", "on"), nvar=24)


def typecase(tm, x, y, w, h, st, v, c):
    """A printer's type case on its frame from above, its back to the wall. Renaissance and Age of Reason: an upper and
    a lower case of boxes on a sloping timber frame, the boxes of Latin type unequal (the e box biggest), many small
    boxes for the Arabic sorts in the Islamic world, a close grid of character type in East and South Asia; Victorian
    to Mid-Century: a cabinet of drawers with a case pulled out and laid on top, oak or pine or a steel cabinet in the
    twentieth century, a composing stick and a galley beside; Victorian: the upper and lower pair; Great War: one
    California job case with its big e box; Mid-Century: two job cases side by side and a lead cutter on top. Type fills the boxes, or is sparse, or lies pied (spilt)
    across the case, or stands set in a forme."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; rng = np.random.default_rng(_seed(v))
    WD = c.wood if per in "ME" else ramp({"oak": (150, 110, 66), "pine": (190, 160, 110), "cherry": (140, 70, 50), "steel": (120, 128, 120), "black": (50, 46, 46),
                                       "mahogany": (110, 56, 40), "green": (80, 100, 84)}[c.axis("wood", "oak")], 18)
    if c.rich and per in "ME": WD = ramp(mix(WD[2], (90, 40, 30), .4), 18)
    script = "latin"
    if per in "ME": script = {"islamic": "arabic", "eastasia": "cjk", "southasia": "indic", "steppe": "indic"}.get(c.style, "latin")
    rb(d, X0, Y0, X1, Y1, WD, 1)                                                                            # the frame or cabinet
    if per not in "ME":
        for k in range(Y0 + 4, Y1 - 2, 5): d.line([X0 + 2, k, X0 + 5, k], fill=WD[0])                       # drawer fronts at the side
    cx0, cy0, cx1, cy1 = X0 + 7, Y0 + 3, X1 - 7, Y1 - 3
    d.rectangle([cx0, cy0, cx1, cy1], fill=WD[3], outline=OUT)
    fill = c.axis("fill", "full")
    def boxes(x0, y0, x1, y1, nx, ny, big=()):
        for i in range(nx):
            for j in range(ny):
                bx0, by0 = x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny; bx1, by1 = x0 + (x1 - x0) * (i + 1) / nx, y0 + (y1 - y0) * (j + 1) / ny
                if (i, j) in big: continue
                d.rectangle([bx0, by0, bx1, by1], fill=WD[1], outline=WD[0])
                if fill == "full" or (fill == "sparse" and rng.random() < .4):
                    d.rectangle([bx0 + 1, by0 + 1, bx1 - 1, by1 - 1], fill=(120, 122, 130) if (i + j) % 3 else (140, 142, 150))
    if script == "latin" and c.era == "great-war":                                                            # one California job case: lower case left and middle, capitals right
        t1, t2 = cx0 + (cx1 - cx0) * 5 // 12, cx0 + (cx1 - cx0) * 2 // 3
        boxes(cx0, cy0, t1, cy1, 4, 5); boxes(t1, cy0, t2, cy1, 2, 3, big=((0, 1), (1, 1))); boxes(t2, cy0, cx1, cy1, 4, 6)
        d.rectangle([t1, cy0 + (cy1 - cy0) // 3, t2, cy0 + 2 * (cy1 - cy0) // 3], fill=WD[1], outline=OUT)            # the big e box
        for k in (t1, t2): d.line([k, cy0, k, cy1], fill=OUT, width=2)
    elif script == "latin" and c.era == "mid-century":                                                        # two job cases pulled out side by side on a steel cabinet
        boxes(cx0, cy0, cx - 1, cy1, 5, 6); boxes(cx + 1, cy0, cx1, cy1, 5, 6)
        d.line([cx, cy0, cx, cy1], fill=OUT, width=3)
        d.rectangle([cx - 6, Y0 - 2, cx + 6, Y0 + 2], fill=STEEL[3], outline=OUT)                              # the lead and rule cutter on top
    elif script == "latin":
        my = (cy0 + cy1) // 2
        boxes(cx0, cy0, cx1, my, 7, 3)
        boxes(cx0, my, cx1, cy1, 6, 2)
        d.line([cx0, my, cx1, my], fill=OUT)
    elif script == "arabic": boxes(cx0, cy0, cx1, cy1, 12, 5)
    elif script == "indic": boxes(cx0, cy0, cx1, cy1, 10, 6)
    else: boxes(cx0, cy0, cx1, cy1, 14, 7)
    if fill == "pied":
        for _ in range(26):
            px_, py_ = rng.uniform(cx0 + 1, cx1 - 2), rng.uniform(cy0 + 1, cy1 - 2); d.rectangle([px_, py_, px_ + 1, py_ + 1], fill=(150, 152, 160))
    elif fill == "forme":
        d.rectangle([cx - 10, cy - 6, cx + 10, cy + 6], fill=IRON[2], outline=OUT); d.rectangle([cx - 7, cy - 4, cx + 7, cy + 4], fill=(140, 142, 150))
        for k in range(cy - 3, cy + 4, 2): d.line([cx - 6, k, cx + 6, k], fill=(90, 92, 100))
    d.rectangle([X1 - 6, Y0 + 4, X1 - 2, Y1 - 6], fill=STEEL[3] if per not in "ME" else c.wood[1], outline=OUT)    # the composing stick
    if c.era == "renaissance":                                                                                  # the visorium holding the copy
        d.rectangle([X0 + 1, Y0 + 2, X0 + 18, Y1 - 4], fill=(222, 212, 184), outline=OUT)
        for k in range(Y0 + 6, Y1 - 6, 3): d.line([X0 + 4, k, X0 + 15, k], fill=(90, 70, 60))
        d.rectangle([X0 + 8, Y0, X0 + 11, Y0 + 4], fill=c.wood[0], outline=OUT)
    elif c.era == "age-of-reason":                                                                              # a galley of set lines on the frame
        d.rectangle([X0 + 1, cy - 8, X0 + 20, Y1 - 2], fill=c.wood[3], outline=OUT); d.rectangle([X0 + 3, cy - 6, X0 + 18, Y1 - 4], fill=(110, 112, 120))
        for k in range(cy - 5, Y1 - 4, 2): d.line([X0 + 4, k, X0 + 17, k], fill=(150, 152, 160))
    if per in "ME" and c.rich: d.line([X0 + 1, Y1 - 2, X1 - 1, Y1 - 2], fill=BRASS[3])


reg("typecase", typecase, {"wood": ["oak", "pine", "cherry", "steel", "black", "mahogany", "green"], "fill": ["full", "sparse", "pied", "forme", "full"]},
    "a pair of cases on their frame is about 3 ft wide and 2 ft deep (Moxon's Mechanick Exercises 1683; Hansard's Typographia 1825)", glob=1837,
    metal=False, front=True, clear=2.5, mount="wall", nvar=16)


# ================================================================ the laboratory and the clinic
SAMPLE = {"blood": (150, 30, 34), "clear": (190, 210, 220), "amber": (200, 150, 50), "green": (90, 160, 80), "blue": (70, 110, 190), "milk": (226, 220, 200), "empty": None}


def centrifuge(tm, x, y, w, h, st, v, c):
    """A laboratory centrifuge from above. Victorian: a hand-cranked spinner, its open bowl of brass, nickel or copper
    on a painted iron tripod with the crank and gear at the side; Great War: an electric bowl in a white enamelled
    guard ring with its motor box beside; Mid-Century: a floor drum in the maker's enamel with its round lid and a
    speed dial; Modern: a pale square floor cabinet with a domed lid, keypad and display; Future Darkness: a sealed dark
    drum ringed with light. A rack of tubes, a log book or a wash bottle may stand by it. Open: the lid up, the rotor
    with its tubes of blood, serum or culture in their buckets."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; op = st == "open"; era = c.era
    col = SAMPLE[c.axis("sample", "blood")]; kit = c.axis("kit", "none")
    if kit == "rack":
        d.rectangle([X0 + 2, Y1 - 7, X0 + 22, Y1 - 1], fill=c.wood[3] if per in "VW" else (230, 230, 226), outline=OUT)
        for k in range(X0 + 4, X0 + 21, 4): d.ellipse([k, Y1 - 6, k + 2, Y1 - 3], fill=col or (190, 210, 220))
    elif kit == "book": rb(d, X0 + 1, Y1 - 10, X0 + 13, Y1 - 1, ramp((60, 80, 120) if c.w % 2 else (120, 50, 40), 14), 1)
    elif kit == "bottle": d.ellipse([X1 - 9, Y1 - 9, X1 - 1, Y1 - 1], fill=(200, 220, 230), outline=OUT); d.rectangle([X1 - 6, Y1 - 12, X1 - 4, Y1 - 7], fill=(220, 60, 50))
    if kit != "none": Y1 -= 6; H = Y1 - Y0; cy = (Y0 + Y1) // 2
    B = _era_body(c); rc = (cx, cy - 1); r = int(min(W, H) * .36)
    def rotor(rr, n=6):
        disc(d, rc[0], rc[1], rr, STEEL)
        for k in range(n):
            a_ = math.radians(k * 360 / n + 15); tx, ty = rc[0] + math.cos(a_) * rr * .62, rc[1] + math.sin(a_) * rr * .62
            d.ellipse([tx - 3, ty - 3, tx + 3, ty + 3], fill=(40, 40, 46), outline=OUT)
            if col: d.ellipse([tx - 2, ty - 2, tx + 1, ty + 1], fill=col)
        disc(d, rc[0], rc[1], 3, STEEL)
    if per == "V":
        Pt = ramp(mix(c.paint[2], (40, 40, 44), .3), 16)
        d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=Pt[1], outline=OUT)                                   # the painted tripod foot
        for a_ in (90, 210, 330): d.line([rc[0], rc[1], rc[0] + math.cos(math.radians(a_)) * (r + 5), rc[1] + math.sin(math.radians(a_)) * (r + 5)], fill=Pt[3], width=3)
        M = {"cream": BRASS, "white": ramp((196, 200, 206), 16), "grey": ramp((196, 200, 206), 16), "blue": BRASS, "green": ramp((176, 100, 60), 20),
             "black": ramp((176, 100, 60), 20), "beige": BRASS}.get(c.make, BRASS)
        ring(d, rc[0], rc[1], r, M, 3); rotor(r - 4, 4)
        gx = X1 - 6; disc(d, gx, cy + 4, 5, Pt); d.line([gx, cy + 4, gx + 2, Y1 - 3], fill=IRON[3], width=2); d.ellipse([gx - 1, Y1 - 6, gx + 5, Y1], fill=c.wood[2], outline=OUT)
    elif era == "great-war":
        rb(d, X1 - 12, Y0 + 2, X1 - 1, Y0 + 16, ramp(mix(c.paint[2], (60, 60, 64), .3), 14), 3)                 # the motor box
        disc(d, cx - 2, cy, r + 4, ramp(mix((222, 222, 214), c.paint[2], .45), 12))
        if op: rotor(r - 1)
        else: disc(d, cx - 2, cy, r - 2, ramp((196, 200, 206), 16)); d.rectangle([cx - 6, cy - 1, cx + 2, cy + 1], fill=OUT)
        cable(d, [(X1 - 6, Y0 + 16), (X1 - 4, Y1 - 2)], RUBBER, 1)
    elif per == "W":
        disc(d, cx, cy, int(min(W, H) * .46), B)
        if op: rotor(r)
        else:
            disc(d, rc[0], rc[1], r, ramp(mix(B[2], (230, 230, 230), .3), 14)); d.rectangle([rc[0] - 6, rc[1] - 1, rc[0] + 6, rc[1] + 1], fill=STEEL[3])
        d.ellipse([cx - 4, Y1 - 9, cx + 4, Y1 - 3], fill=(230, 226, 210), outline=OUT); d.line([cx, Y1 - 6, cx + 2, Y1 - 8], fill=OUT)
    else:
        rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, B, 4 if per == "F" else 3)
        if per == "N": d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 6], fill=c.paint[2])
        if op:
            d.rectangle([X0 + 4, Y0, X1 - 4, Y0 + 4], fill=B[3], outline=OUT); ring(d, rc[0], rc[1], r + 1, STEEL, 1); rotor(r - 1)
        else:
            disc(d, rc[0], rc[1], r, ramp(mix(B[2], (240, 240, 240), .4), 12) if per == "N" else ramp(mix(c.paint[2], (30, 34, 40), .5), 12))
            if per == "F": d.ellipse([rc[0] - r + 2, rc[1] - r + 2, rc[0] + r - 2, rc[1] + r - 2], outline=c.glow[1], width=2)
        screen(d, X0 + 5, Y1 - 8, cx, Y1 - 4, True, c.glow if per == "F" else None, "lines")
        lamp(d, X1 - 7, Y1 - 6, 2, not op, (90, 220, 90))
    if c.rich and per in "WN": plate(d, X0 + 3, Y0 + 3, STEEL, 6, 3)


reg("centrifuge", centrifuge, {"make": ["cream", "white", "grey", "blue", "green", "black", "beige"], "sample": list(SAMPLE), "kit": ["none", "rack", "book", "bottle", "rack"]},
    "floor centrifuges stand 1 1/2 to 2 1/2 ft across (International Equipment Co. and Beckman catalogues)", states=("closed", "open"), nvar=28)


def fumehood(tm, x, y, w, h, st, v, c):
    """A fume cupboard from above, its back to the wall and its sash to the south: the exhaust duct and its fan at the
    back, the worktop of black slate or epoxy inside with glassware and a burner seen through the glazed roof, the
    sash across the front. Mid-Century: a timber cabinet in teak or oak, lead-lined, a round duct of earthenware or
    steel; Modern: white enamelled steel with service posts of taps down both sides, a sash of three panes and an
    airflow display; Future Darkness: a dark sealed hood with lit seams.
    Open: the sash raised, the glass gone from the front and the work plain to see. The worktop may be black slate or epoxy, white tiles, stainless steel or teak; a wide
    hood has two sashes."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; op = st == "open"; rng = np.random.default_rng(_seed(v))
    F = ramp({"teak": (130, 84, 50), "oak": (160, 120, 74), "white": (224, 224, 218), "grey": (150, 154, 156), "cream": (214, 204, 176),
              "blue": (80, 110, 150), "green": (90, 120, 100)}[c.axis("make", "white")], 16)
    if per == "W" and c.axis("make", "white") in ("white", "grey", "blue"): F = ramp(mix(F[2], (150, 110, 70), .5), 16)
    if per == "F": F = ramp(mix(COMPOSITE[2], F[2], .6), 14)
    rb(d, X0, Y0, X1, Y1, F, 2)                                                                              # the carcass
    tk = c.axis("top", "slate")
    top = {"slate": (40, 40, 44), "tiles": (220, 220, 214), "steel": (170, 174, 178), "teak": (120, 80, 50)}.get(tk, (40, 40, 44))
    d.rectangle([X0 + 5, Y0 + 12, X1 - 5, Y1 - 6], fill=top, outline=OUT)                                    # the worktop
    if tk == "tiles": [d.line([X0 + 6, k, X1 - 6, k], fill=(180, 180, 176)) for k in range(Y0 + 18, Y1 - 6, 6)]
    work = c.axis("work", "glass")
    if work in ("glass", "still"):
        for k, fx in enumerate((.2, .35, .55, .72)):
            gx = int(X0 + W * fx); gy = int(Y0 + H * (.45 + .12 * (k % 2)))
            d.ellipse([gx - 4, gy - 4, gx + 4, gy + 4], fill=(170, 200, 210), outline=(70, 100, 110)); d.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=SAMPLE[("blue", "amber", "green", "blood")[k]])
        if work == "still": d.line([X0 + int(W * .2), Y0 + int(H * .45), X0 + int(W * .72), Y0 + int(H * .45)], fill=(150, 190, 200), width=2)
    elif work == "burner":
        d.ellipse([cx - 6, cy - 2, cx + 6, cy + 10], fill=IRON[2], outline=OUT); d.ellipse([cx - 2, cy + 2, cx + 2, cy + 6], fill=(90, 150, 250) if op else IRON[1])
        cable(d, [(cx + 6, cy + 4), (X1 - 8, cy + 6)], ramp((200, 120, 60), 14), 1)
    elif work == "rack":
        for k in range(8): d.rectangle([X0 + 12 + k * 6, cy - 2, X0 + 15 + k * 6, cy + 6], fill=SAMPLE[("blood", "clear", "amber", "green")[k % 4]], outline=OUT)
    elif work == "tray":                                                                                       # a tray of beakers centred on the worktop
        rb(d, cx - 14, cy - 6, cx + 14, cy + 8, ramp((200, 204, 206), 10), 2)
        for k in (-8, 0, 8): d.ellipse([cx + k - 3, cy - 2, cx + k + 3, cy + 4], fill=(190, 200, 210), outline=OUT)
    d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 11], fill=F[1], outline=OUT)                                    # the baffle along the back
    dc = (X1 - 16 if c.w % 2 else X0 + 16, Y0 + 6)
    disc(d, dc[0], dc[1], 7, ramp((150, 110, 80), 14) if per == "W" and c.w < 3 else STEEL)                    # the exhaust duct
    d.ellipse([dc[0] - 3, dc[1] - 3, dc[0] + 3, dc[1] + 3], fill=OUT)
    if not op:                                                                                              # the sash glass across the front
        a = np.asarray(tm.img).astype(np.float32); sl = (slice(int(Y0 + 12), int(Y1 - 5)), slice(int(X0 + 5), int(X1 - 4)))
        a[sl] = a[sl] * .72 + np.array((120, 160, 180) if per != "F" else (30, 60, 70), np.float32) * .28; tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
        for k in range(X0 + 10, X1 - 10, 30): d.line([k, Y1 - 8, k + 10, Y0 + 14], fill=(200, 230, 240))
        d.rectangle([X0 + 3, Y1 - 6, X1 - 3, Y1 - 3], fill=F[3], outline=OUT)
        if c.axis("bays", "one") == "two": d.rectangle([cx - 2, Y0 + 11, cx + 2, Y1 - 3], fill=F[2], outline=OUT)   # the mullion between two sashes
    else:
        d.rectangle([X0 + 3, Y0 + 11, X1 - 3, Y0 + 14], fill=(160, 190, 200), outline=OUT)                     # the sash run up
    if per == "N":                                                                                          # service posts of taps down both sides, a sash of three panes and the airflow display
        for k in (X0 + 1, X1 - 6): d.rectangle([k, Y0 + 12, k + 5, Y1 - 4], fill=STEEL[3], outline=OUT); [d.point((k + 2, j), fill=(200, 60, 50)) for j in range(Y0 + 16, Y1 - 6, 8)]
        for k in (X0 + W // 3, X0 + 2 * W // 3): d.line([k, Y0 + 12, k, Y1 - 4], fill=F[0], width=2)
        screen(d, cx - 6, Y1 - 5, cx + 6, Y1 - 1, True, [(20, 50, 30), (80, 220, 100), (200, 255, 200)])
    if per == "F": d.line([X0 + 3, Y1 - 2, X1 - 3, Y1 - 2], fill=c.glow[1], width=2)
    if c.rich: d.rectangle([X0 + 6, Y1 - 3, X0 + 16, Y1 - 1], fill=BRASS[3] if per == "W" else STEEL[4])


reg("fumehood", fumehood, {"top": ["slate", "tiles", "steel", "teak", "slate"], "bays": ["one", "two"], "make": ["white", "teak", "oak", "grey", "cream", "blue", "green"], "work": ["glass", "burner", "rack", "still", "tray", "empty"]},
    "fume cupboards are 4 to 6 ft wide and 2 1/2 to 3 ft deep (Harvard and BS 7258 laboratory fittings)", metal=False,
    front=True, clear=3, states=("closed", "open"), nvar=48)


MSWOOD = {"brass": (110, 60, 40), "black": (40, 34, 32), "grey": (150, 110, 70), "cream": (190, 150, 100), "white": (130, 80, 50), "green": (90, 56, 40), "red": (140, 70, 56)}


def microscope(tm, x, y, w, h, st, v, c):
    """A microscope from above, standing on a bench. Age of Reason: a Culpeper tripod microscope, its tube covered in
    green or red shagreen or vellum on three brass legs over a round stage, all on its square wooden box base with a
    drawer; Victorian: a lacquered brass monocular on a broad horseshoe foot, a square stage with a slide and the
    mirror below; Great War: the same in black japanning with a nickelled stage; Mid-Century: black or grey enamel and
    chrome on a broad foot, a coarse focus knob each side; Modern: a grey or white binocular microscope with two
    eyepieces and a built-in lamp; Future Darkness: a dark digital scope with a small screen on its head. It may
    stand on a green baize cloth, a white tile, a cork mat or a black bench top."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 0); per = c.per; era = c.era
    mk = c.axis("make", "brass"); slide = SAMPLE[c.axis("slide", "blood")] or (210, 220, 226)
    pad = c.axis("pad", "none")                                                                          # what it stands on, under the whole footprint
    if pad == "baize": rb(d, X0, Y0, X1, Y1, ramp((50, 100, 70), 10), 1)
    elif pad == "tile": rb(d, X0, Y0, X1, Y1, ramp((222, 222, 214), 8), 0); [d.line([k, Y0 + 1, k, Y1 - 1], fill=(180, 180, 176)) for k in range(X0 + 6, X1, 6)]
    elif pad == "cork": rb(d, X0, Y0, X1, Y1, ramp((176, 130, 80), 12), 1)
    elif pad == "black": rb(d, X0, Y0, X1, Y1, ramp((40, 42, 46), 8), 0)
    kit = c.axis("kit", "none"); KX = X1 - 9                                                              # what lies beside it, in a strip to the east
    if kit == "slidebox": rb(d, KX, Y0 + 2, X1, Y1 - 2, ramp((120, 70, 44) if per in "EV" else (60, 90, 140), 14), 1); [d.line([KX + 2, k, X1 - 2, k], fill=(220, 220, 210)) for k in range(Y0 + 5, Y1 - 3, 3)]
    elif kit == "notes": d.rectangle([KX, Y0 + 1, X1, Y1 - 1], fill=(226, 218, 196), outline=OUT); [d.line([KX + 2, k, X1 - 2, k], fill=(90, 80, 90)) for k in range(Y0 + 4, Y1 - 2, 3)]
    elif kit == "dish": d.ellipse([KX - 1, cy - 5, X1, cy + 5], fill=(200, 216, 220), outline=OUT); d.ellipse([KX + 2, cy - 2, X1 - 3, cy + 2], fill=(200, 160, 60))
    elif kit == "lamp": d.ellipse([KX, Y0 + 2, X1, Y0 + 11], fill=BRASS[2] if per in "EV" else ((40, 40, 46) if per != "F" else c.glow[0]), outline=OUT); d.ellipse([KX + 2, Y0 + 4, X1 - 2, Y0 + 9], fill=(250, 220, 140) if per != "F" else c.glow[2])
    X1 = KX - 1; W = X1 - X0; cx = (X0 + X1) // 2
    if per == "E":
        cov = ramp({"brass": (60, 110, 80), "black": (50, 46, 44), "grey": (190, 170, 130), "cream": (220, 206, 170), "white": (150, 40, 40),
                    "green": (40, 90, 70), "red": (130, 40, 50)}[mk], 16)
        rb(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp(MSWOOD[mk], 16), 1); d.rectangle([cx - 2, Y1 - 3, cx + 2, Y1 - 2], fill=BRASS[3])   # the box base and its drawer knob
        for a_ in (90, 210, 330): d.line([cx, cy, cx + math.cos(math.radians(a_)) * 8, cy + math.sin(math.radians(a_)) * 8], fill=BRASS[1], width=2)
        ring(d, cx, cy, 7, BRASS, 1); disc(d, cx, cy - 1, 5, cov); d.ellipse([cx - 1, cy - 2, cx + 1, cy], fill=BRASS[4])
    elif per == "V" or era == "great-war":
        M = BRASS if per == "V" or mk in ("brass", "cream") else ramp({"black": (40, 40, 46), "red": (90, 40, 40), "green": (40, 70, 56), "grey": (110, 110, 116), "white": (196, 196, 190)}[mk], 14)
        if per == "V" and mk in ("black", "grey", "white", "green", "red"): M = ramp({"black": (60, 50, 40), "grey": (176, 170, 150), "white": (200, 170, 100), "green": (110, 84, 50), "red": (160, 90, 60)}[mk], 18)
        d.polygon([(X0 + 1, Y1 - 1), (X0 + 4, cy), (X1 - 4, cy), (X1 - 1, Y1 - 1), (cx + 4, Y1 - 1), (cx, cy + 4), (cx - 4, Y1 - 1)], fill=M[2], outline=OUT)   # the horseshoe foot
        st_ = STEEL if per != "V" else ramp((40, 40, 46), 12)
        d.rectangle([X0 + 3, cy - 5, X1 - 3, cy + 3], fill=st_[2], outline=OUT); d.rectangle([X0 + 4, cy - 2, X1 - 4, cy], fill=mix(slide, (220, 230, 236), .5))   # stage and slide
        disc(d, cx, cy - 6, 3, M); d.ellipse([cx - 1, cy - 7, cx + 1, cy - 5], fill=OUT)
        for kx in (X0 + 1, X1 - 3): d.rectangle([kx, cy - 8, kx + 2, cy - 4], fill=M[3])
    else:
        B = c.paint if per != "F" else ramp(mix(COMPOSITE[2], c.paint[2], .55), 14)
        if per == "W": B = ramp(mix(c.paint[2], (40, 40, 46), .4), 14)
        rb(d, X0 + 1, Y0 + 3, X1 - 1, Y1 - 1, B, 3)                                                           # body and foot
        d.rectangle([cx - 6, cy - 2, cx + 6, cy + 3], fill=OUT); d.rectangle([cx - 5, cy - 1, cx + 5, cy + 1], fill=mix(slide, (220, 230, 236), .4))
        if per == "N":
            for ex in (cx - 3, cx + 3): disc(d, ex, Y0 + 4, 2, ramp((40, 40, 44), 10))                          # the two eyepieces
            lamp(d, cx, Y1 - 3, 1, True, (250, 240, 200))
        elif per == "F": screen(d, X0 + 2, Y0 + 1, X1 - 2, cy - 3, True, [mix(slide, (10, 10, 20), .6), slide, (230, 240, 240)], "trace")
        else: disc(d, cx, Y0 + 5, 3, STEEL); d.ellipse([cx - 1, Y0 + 4, cx + 1, Y0 + 6], fill=OUT)
        for kx in (X0, X1 - 2): d.rectangle([kx, cy, kx + 2, cy + 3], fill=STEEL[3], outline=OUT)
    if c.rich and per in "EV": d.ellipse([X1 - 5, Y0 + 1, X1 - 1, Y0 + 5], fill=BRASS[4], outline=OUT)


reg("microscope", microscope, {"make": ["brass", "black", "grey", "cream", "white", "green", "red"], "slide": ["blood", "green", "blue", "amber", "clear"],
    "kit": ["none", "slidebox", "notes", "dish", "lamp", "slidebox"], "pad": ["none", "baize", "tile", "cork", "black"]}, "a compound microscope stands on a foot 4 to 8 in across, with its slide box or notes beside it (Culpeper, Powell and Lealand, Zeiss and Olympus)",
    ft=((1.2, 1.6), (0.9, 1.15)), metal=False, nvar=28)


def _era_body(c, white=True):
    """The casing of a clinic machine in each age: Victorian wood and brass, Great War white enamel, Mid-Century the
    maker's enamel, Modern pale plastic with the maker's colour as a band, Future Darkness dark composite."""
    per, era = c.per, c.era
    if per == "V": return ramp(mix((120, 80, 50), c.paint[2], .4), 18)
    if era == "great-war": return ramp(mix((222, 222, 214), c.paint[2], .5), 12) if white else ramp(mix((60, 60, 66), c.paint[2], .5), 12)
    if per == "W": return c.paint
    if per == "N": return ramp(mix((214, 216, 214), c.paint[2], .55), 12)
    return ramp(mix(COMPOSITE[2], c.paint[2], .6), 14)


OLDMETAL = {"cream": BRASS, "white": ramp((196, 200, 206), 16), "grey": ramp((150, 152, 158), 16), "green": ramp((176, 100, 60), 20), "blue": ramp((60, 80, 120), 16),
            "black": ramp((50, 50, 56), 14), "beige": ramp((200, 170, 100), 18), "teal": ramp((90, 140, 120), 16), "red": ramp((140, 50, 40), 16)}


def floor_under(d, X0, Y0, X1, Y1, c, kind):
    """What a workshop or shop machine stands on, laid flat over its whole footprint and centred on it: bare floor
    (nothing), a rubber mat, a timber platform of boards, a steel chequer plate, a painted safety bay of its age (stone
    flags before the Victorian age), a block of concrete, or in a clinic or shop white or green tiles, chequered
    tiles, terrazzo, linoleum or carpet."""
    per = c.per; X0, Y0, X1, Y1 = int(X0), int(Y0), int(X1), int(Y1); mx = (X0 + X1) / 2
    def cols(step, off=0):                                                                                  # x positions mirrored about the middle
        out, k = [], step / 2 + off
        while mx + k < X1 - 1: out += [round(mx - k), round(mx + k)]; k += step
        return out
    def flat(col, edge=None): d.rectangle([X0, Y0, X1, Y1], fill=col, outline=edge or mix(col, (0, 0, 0), .35))
    if kind == "mat": flat(RUBBER[2], OUT); [d.line([X0 + 2, k, X1 - 2, k], fill=RUBBER[1]) for k in range(Y0 + 4, Y1 - 1, 4)]
    elif kind == "boards": flat(c.wood[2]); [d.line([X0 + 1, k, X1 - 1, k], fill=c.wood[1]) for k in range(Y0 + 6, Y1 - 1, 6)]
    elif kind == "plate":
        flat((120, 124, 130))
        for j, k in enumerate(range(Y0 + 3, Y1 - 2, 4)):
            for i in cols(6, 1.5 if j % 2 else 0): d.line([i - 1, k, i + 1, k], fill=(156, 160, 166))
    elif kind == "bay" and per in "ME": flat((150, 146, 136)); [d.line([X0 + 1, k, X1 - 1, k], fill=(110, 106, 100)) for k in range(Y0 + 8, Y1 - 1, 8)]   # stone flags
    elif kind == "bay":
        col = {"V": (150, 140, 120), "W": (90, 120, 90) if c.era == "great-war" else (60, 110, 80), "N": (200, 200, 196), "F": (40, 44, 52)}.get(per, (150, 140, 120))
        flat(col); d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=HAZ[0] if per in "NF" else (226, 222, 200), width=2)
    elif kind == "concrete": walls(d, X0, Y0, X1, Y1, "concrete", c)
    elif kind == "tiles":
        T = (226, 228, 222) if per in "VN" else (170, 200, 180); flat(T)
        for k in cols(6): d.line([k, Y0 + 1, k, Y1 - 1], fill=mix(T, (0, 0, 0), .2))
        for k in range(Y0 + 6, Y1, 6): d.line([X0 + 1, k, X1 - 1, k], fill=mix(T, (0, 0, 0), .2))
    elif kind == "terrazzo":
        flat((186, 180, 168))
        for j, k in enumerate(range(Y0 + 2, Y1 - 1, 4)):
            for i in cols(5, 2 if j % 2 else 0): d.point((i, k), fill=(120, 110, 100))
    elif kind == "check":
        flat((230, 228, 220), (40, 40, 44))
        for j, k in enumerate(range(Y0 + 1, Y1 - 1, 6)):
            for i in cols(12, 6 if j % 2 else 0): d.rectangle([max(i - 3, X0 + 1), k, min(i + 2, X1 - 1), min(k + 5, Y1 - 1)], fill=(40, 40, 44))
    elif kind == "carpet":
        K = ramp({"V": (120, 40, 50), "W": (60, 70, 120), "N": (70, 60, 90), "F": (36, 30, 50)}.get(per, (120, 40, 50)), 10); flat(K[2])
        for k in range(Y0 + 3, Y1 - 2, 6):
            for i in cols(6): d.point((i, k), fill=K[4])
    elif kind == "lino": flat({"V": (120, 90, 70), "W": (90, 110, 120), "N": (150, 170, 176), "F": (50, 56, 66)}.get(per, (120, 90, 70)))


def stand_under(d, X0, Y0, X1, Y1, c, kind):
    """What a clinic machine stands on, filling its footprint: bare floor, a wheeled trolley, a bench top or a tiled
    plinth, each of its age (oak and mahogany, white enamel, the maker's enamelled steel, grey laminate, dark
    composite). Returns the box left for the machine."""
    per, era = c.per, c.era
    if kind == "floor": return X0 + 1, Y0 + 1, X1 - 1, Y1 - 1
    if kind == "trolley":
        T = ramp((226, 226, 218), 10) if era == "great-war" else (c.wood if per == "V" else (c.paint if per == "W" else (ramp((180, 184, 188), 12) if per == "N" else c.comp)))
        rb(d, X0, Y0, X1, Y1, T, 2); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=T[1])
        for kx, ky in ((X0 + 1, Y0 + 1), (X1 - 4, Y0 + 1), (X0 + 1, Y1 - 4), (X1 - 4, Y1 - 4)): d.ellipse([kx, ky, kx + 3, ky + 3], fill=RUBBER[2], outline=OUT)
    elif kind == "bench":
        T = ramp({"V": (110, 60, 40), "W": (60, 60, 60) if era == "great-war" else (60, 90, 80), "N": (190, 190, 186), "F": (40, 44, 52)}.get(per, (110, 60, 40)), 14)
        rb(d, X0, Y0, X1, Y1, T, 1)
        if per in "VW": [d.line([X0 + 2, k, X1 - 2, k], fill=T[1]) for k in range(Y0 + 6, Y1 - 2, 9)]
    else:
        T = ramp({"V": (190, 180, 160), "W": (210, 210, 200), "N": (170, 176, 180), "F": (50, 56, 66)}.get(per, (190, 180, 160)), 10)
        rb(d, X0, Y0, X1, Y1, T, 0)
        for k in range(X0 + 7, X1, 7): d.line([k, Y0 + 1, k, Y1 - 1], fill=T[1])
        for k in range(Y0 + 7, Y1, 7): d.line([X0 + 1, k, X1 - 1, k], fill=T[1])
    return X0 + 4, Y0 + 4, X1 - 4, Y1 - 4


def autoclave(tm, x, y, w, h, st, v, c):
    """A steam steriliser from above. Victorian: Chamberland's copper boiler on its tripod, the domed lid held down by
    a ring of clamp bolts, a gauge and a safety valve on top, the gas ring under it, or a small horizontal boiler on its cradle with
    a door wheel at its end (later cabinets of that model load from a square steel lid on top); Great War: a nickelled upright
    drum with a wheel clamp in the middle of its lid; Mid-Century: a squared cabinet in the maker's enamel, its round
    door to the front; Modern: a pale box with a coloured band, a display and the round door; Future Darkness: a dark
    sealed box with a lit ring. Open: the lid set aside or the door swung back, the wire basket of instruments in it."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; op = st == "open"; era = c.era; B = _era_body(c)
    stuff = c.axis("load", "instruments")
    if c.axis("stand", "floor") == "floor" and (per == "V" or era == "great-war"): rb(d, X0, Y0, X1, Y1, ramp((150, 154, 156), 10), 3)   # a zinc drip tray under it
    X0, Y0, X1, Y1 = stand_under(d, X0, Y0, X1, Y1, c, c.axis("stand", "floor")); W, H, cx, cy = X1 - X0, Y1 - Y0, (X0 + X1) // 2, (Y0 + Y1) // 2
    def basket(r):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 62, 66), outline=STEEL[3])
        for k in range(-r + 3, r - 2, 3): d.line([cx - r + 3, cy + k, cx + r - 3, cy + k], fill=STEEL[1])
        if stuff == "instruments":
            for k in range(-4, 5, 3): d.line([cx + k - 3, cy - 5, cx + k + 2, cy + 5], fill=STEEL[4], width=1)
        elif stuff == "dressings": rb(d, cx - 6, cy - 4, cx + 6, cy + 4, LINEN, 2)
        elif stuff == "jars":
            for k in (-4, 4): d.ellipse([cx + k - 3, cy - 3, cx + k + 3, cy + 3], fill=(170, 200, 210), outline=OUT)
    if per == "V" or era == "great-war":
        M = OLDMETAL.get(c.make, BRASS) if per == "V" else ramp(mix((196, 200, 206), c.paint[2], .55), 16)
        if c.axis("model", "upright") == "horizontal":                                                       # a horizontal boiler, its door to the south
            bw = max(5, int(W * .3)); top, bot = Y0 + 2, Y1 - 3
            for k in (top + 4, bot - 6): d.rectangle([cx - bw - 2, k, cx + bw + 2, k + 2], fill=IRON[1], outline=OUT)   # its cradle
            rb(d, cx - bw, top, cx + bw, bot, M, bw)
            for k in (top + (bot - top) // 3, top + 2 * (bot - top) // 3): d.line([cx - bw + 1, k, cx + bw - 1, k], fill=M[0])   # the riveted bands
            d.ellipse([cx - 3, top + 2, cx + 3, top + 8], fill=(236, 232, 214), outline=OUT)                     # the gauge
            if op: ring(d, cx, bot - 2, bw - 1, M, 2); d.rectangle([cx - 3, bot - 5, cx + 3, bot - 1], fill=STEEL[3] if stuff != "dressings" else LINEN[3])
            else:
                ring(d, cx, bot - 4, 4, IRON, 1)
                for a_ in (0, 90): d.line([cx - 4 * math.cos(math.radians(a_)), bot - 4 - 4 * math.sin(math.radians(a_)), cx + 4 * math.cos(math.radians(a_)), bot - 4 + 4 * math.sin(math.radians(a_))], fill=IRON[3])   # the door wheel
            return
        if per == "V":
            for a_ in (90, 210, 330): d.line([cx, cy, cx + math.cos(math.radians(a_)) * W * .48, cy + math.sin(math.radians(a_)) * H * .48], fill=IRON[2], width=3)
        else: d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=(222, 222, 214), outline=OUT)                   # its white stand
        r = int(min(W, H) * .38)
        if op:
            ring(d, cx, cy, r, M, 3); basket(r - 4)
            disc(d, X1 - 7, Y1 - 7, 7, M)                                                                     # the lid set by
        else:
            disc(d, cx, cy, r, M)
            if per == "V":
                for a_ in range(0, 360, 45):
                    bx, by = round(cx + math.cos(math.radians(a_)) * (r - 2)), round(cy + math.sin(math.radians(a_)) * (r - 2)); d.rectangle([bx - 1, by - 1, bx + 1, by + 1], fill=IRON[2])   # the clamp bolts
            else:
                for a_ in (0, 90, 180, 270): d.line([cx, cy, cx + math.cos(math.radians(a_)) * (r - 4), cy + math.sin(math.radians(a_)) * (r - 4)], fill=STEEL[1], width=2)
                disc(d, cx, cy, 3, STEEL)
            d.ellipse([cx - 3, cy - r // 2 - 3, cx + 3, cy - r // 2 + 3], fill=(236, 232, 214), outline=OUT)   # the gauge
            d.rectangle([cx - 2, cy + r // 2 - 2, cx + 2, cy + r // 2 + 2], fill=BRASS[3], outline=OUT)        # the safety valve
    else:
        rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 6, B, 3 if per != "F" else 6)
        if c.axis("model", "upright") == "horizontal":                                                       # a top-loading chamber: its square steel lid
            d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 14], fill=STEEL[3], outline=OUT); d.rectangle([X0 + 8, Y0 + 8, X1 - 8, Y1 - 17], outline=STEEL[1])
            d.line([cx - 5, Y1 - 15, cx + 5, Y1 - 15], fill=OUT, width=2)
        if per == "N": d.rectangle([X0 + 3, Y1 - 12, X1 - 3, Y1 - 9], fill=c.paint[2]); screen(d, X0 + 5, Y0 + 5, cx, Y0 + 10, True, [(20, 40, 30), (90, 220, 120), (200, 255, 210)])
        if per == "F": d.rounded_rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 9], 5, outline=c.glow[1], width=1)
        if per == "W": d.ellipse([X0 + 5, Y0 + 5, X0 + 12, Y0 + 12], fill=(236, 232, 214), outline=OUT); [d.line([X0 + 15, k, X1 - 5, k], fill=B[1]) for k in range(Y0 + 6, Y0 + 14, 3)]
        if op:
            d.ellipse([X1 - 16, Y1 - 12, X1 + 2, Y1 + 2], fill=STEEL[2], outline=OUT)                         # the door swung back
            d.rectangle([cx - 8, Y1 - 6, cx + 8, Y1 - 2], fill=(40, 40, 44), outline=OUT)
            d.rectangle([cx - 6, Y1 - 5, cx + 6, Y1 - 3], fill=STEEL[4] if stuff != "dressings" else LINEN[3])
        else:
            d.rectangle([cx - 10, Y1 - 7, cx + 10, Y1 - 1], fill=STEEL[2], outline=OUT); d.line([cx - 8, Y1 - 6, cx + 8, Y1 - 6], fill=STEEL[4])
            d.line([cx + 6, Y1 - 4, cx + 12, Y1 - 4], fill=OUT, width=2)                                        # its handle
    if c.rich and per in "VW": d.rectangle([cx - 4, Y0 - 1, cx + 4, Y0 + 1], fill=BRASS[3], outline=OUT)        # the maker's plate


reg("autoclave", autoclave, {"make": ["cream", "white", "grey", "green", "blue", "beige", "teal"], "load": ["instruments", "dressings", "jars", "empty"],
                             "stand": ["floor", "trolley", "bench", "plinth", "trolley"], "model": ["upright", "horizontal", "upright"]},
    "hospital and laboratory sterilisers stand 1 1/2 to 2 1/2 ft across (Chamberland 1884; Castle and Amsco catalogues)", states=("closed", "open"), nvar=48)


def incubator(tm, x, y, w, h, st, v, c):
    """An incubator from above. For the ward, an infant incubator: Victorian, a wooden box with glazed lids and a
    water tank (Lion's or Tarnier's kind); Great War, a white enamelled cabinet with a glass top; Mid-Century, a clear
    plastic hood with arm ports on a cabinet in the maker's enamel; Modern, the same on a pale cabinet with a monitor;
    Future Darkness, a dark pod with a lit edge. For the laboratory, a squared cabinet with its glass inner door and
    shelves of culture dishes, flasks or eggs. Open: the lid or hood up, or the door swung back, the inside plain."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; op = st == "open"; era = c.era; B = _era_body(c)
    kind = c.axis("kind", "infant"); held = c.axis("contents", "baby")
    if per == "V": B = ramp(mix(c.wood[2], OLDMETAL.get(c.make, BRASS)[2], .35), 16)
    elif era == "great-war": B = ramp(mix((222, 222, 214), c.paint[2], .3), 12)
    X0, Y0, X1, Y1 = stand_under(d, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, c, c.axis("stand", "floor")); X0 -= 2; Y0 -= 2; X1 += 2; Y1 += 2; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    rb(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, B, 3 if per in "WN" else 1)
    if per == "V": [d.line([X0 + 3, k, X1 - 3, k], fill=B[1]) for k in range(Y0 + 5, Y1 - 2, 5)]
    ix0, iy0, ix1, iy1 = X0 + 5, Y0 + 5, X1 - 5, Y1 - 5
    if kind == "infant":
        d.rectangle([ix0, iy0, ix1, iy1], fill=(214, 214, 206), outline=OUT)                                  # the mattress
        if held == "baby":
            d.ellipse([cx - 5, iy0 + 1, cx + 3, iy0 + 9], fill=(214, 170, 140), outline=OUT)                     # the baby, its head to the north
            d.rounded_rectangle([cx - 6, iy0 + 7, cx + 5, iy1 - 2], 4, fill=LINEN[3] if per != "N" else ramp((150, 190, 220), 12)[3], outline=OUT)
        elif held == "eggs":
            for k in range(3): d.ellipse([ix0 + 3 + k * 8, cy - 3, ix0 + 9 + k * 8, cy + 4], fill=(230, 220, 190), outline=OUT)
        if not op:
            a = np.asarray(tm.img).astype(np.float32); sl = (slice(iy0 - 2, iy1 + 3), slice(ix0 - 2, ix1 + 3))
            tint = (150, 190, 210) if per != "F" else (40, 70, 80)
            a[sl] = a[sl] * .7 + np.array(tint, np.float32) * .3; tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
            d.rounded_rectangle([ix0 - 2, iy0 - 2, ix1 + 2, iy1 + 2], 6 if per in "WNF" and era != "great-war" else 0, outline=(200, 230, 240) if per != "V" else BRASS[2])
            d.line([ix0, iy1, ix0 + 6, iy0 + 2], fill=(230, 245, 250))
            if per in "WN" and era != "great-war":
                for px_ in (ix0 + 2, ix1 - 6): d.ellipse([px_, iy1 - 2, px_ + 5, iy1 + 3], outline=STEEL[4])   # the arm ports
        else:
            d.rectangle([ix0 - 2, Y0, ix1 + 2, Y0 + 4], fill=(170, 210, 226) if per != "V" else c.wood[3], outline=OUT)   # the lid swung up
    else:
        if op:
            d.rectangle([ix0, iy0, ix1, iy1], fill=(70, 72, 78), outline=OUT)
            for k in range(iy0 + 2, iy1, 5):
                d.line([ix0 + 1, k + 3, ix1 - 1, k + 3], fill=STEEL[3])
                for j in range(ix0 + 3, ix1 - 3, 6):
                    if held == "eggs": d.ellipse([j, k, j + 4, k + 3], fill=(230, 220, 190))
                    else: d.ellipse([j, k, j + 4, k + 3], fill=(200, 220, 220), outline=(150, 170, 170)); d.point((j + 2, k + 1), fill=(200, 160, 60))
            d.rectangle([X1 - 4, Y1 - 2, X1 + 2, Y1 + 4], fill=B[3], outline=OUT)                               # the door swung open
        else:
            d.rectangle([ix0, iy0, ix1, iy1], fill=B[1], outline=OUT); d.line([ix0 + 2, iy0 + 2, ix1 - 2, iy0 + 2], fill=B[3])
            for k in range(ix0 + 3, ix1 - 3, 3): d.line([k, iy0 + 4, k, iy0 + 8], fill=B[0])                   # the vent
            d.ellipse([ix1 - 9, iy1 - 8, ix1 - 3, iy1 - 2], fill=(236, 232, 214), outline=OUT)                  # the thermometer dial
    if per == "N": screen(d, X0 + 2, Y1 - 4, X0 + 14, Y1, True, [(20, 40, 30), (90, 220, 120), (200, 255, 210)], "trace")
    if per == "F": d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=c.glow[1], width=2)


reg("incubator", incubator, {"make": ["cream", "white", "green", "blue", "grey", "beige", "teal"], "kind": ["infant", "lab", "infant", "lab", "infant"], "contents": ["baby", "empty", "eggs", "baby", "dishes"], "stand": ["floor", "trolley", "bench", "plinth", "trolley"]},
    "an infant incubator or a laboratory incubator stands about 2 to 3 ft by 1 1/2 ft (Lion 1891; Isolette and Memmert catalogues)",
    states=("closed", "open"), nvar=32)


DRAPE = {"victorian": (226, 222, 210), "great-war": (232, 230, 222), "mid-century": (90, 130, 110), "modern": (70, 120, 170), "future-darkness": (90, 96, 110)}
SKIN = (206, 160, 130)


def _patient(d, x0, y0, x1, y1, era, sheet=None):
    """A body lying on its back under a sheet or drape, the head to the north showing."""
    cx = (x0 + x1) // 2; S = ramp(sheet or DRAPE.get(era, (220, 220, 210)), 12)
    d.ellipse([cx - 7, y0, cx + 7, y0 + 15], fill=SKIN, outline=OUT); d.arc([cx - 7, y0, cx + 7, y0 + 15], 180, 360, fill=(90, 60, 40), width=3)
    d.rounded_rectangle([x0, y0 + 13, x1, y1], 8, fill=S[2], outline=OUT)
    d.line([cx, y0 + 18, cx - 2, y1 - 4], fill=S[1]); d.line([x0 + 4, y0 + 16, x1 - 4, y0 + 16], fill=S[4])
    for k in (x0 + 5, x1 - 5): d.line([k, y0 + 24, k, (y0 + y1) // 2], fill=S[1])


def operatingtable(tm, x, y, w, h, st, v, c):
    """An operating table from above, the head to the north. Victorian: a scrubbed wooden table with a leather pad,
    head rest, straps and a sawdust bucket at its foot; Great War: a white enamelled iron table on its pedestal with the
    crank wheels at the foot; Mid-Century: a chrome table on a hydraulic column, its pad in three sections and the arm
    boards out to the sides; Modern: a segmented pad in the maker's colour on a pale column, side rails and the
    control pendant on its cable; Future Darkness: a dark composite slab ringed with light. The arm boards may be out
    on both sides or tucked away; in the Great War instrument stands may stand either side. The theatre floor may be
    tiled, terrazzo, linoleum or a rubber mat. Full: a patient under the
    sheet or drape of the age (white, then green, then blue)."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era; full = st == "full"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))
    pad = LEATHER.get(c.axis("pad", "black"), LEATHER["black"])
    tx0, tx1 = cx - int(W * .3), cx + int(W * .3)
    WOODS = {"grey": (150, 110, 70), "cream": (190, 160, 110), "green": (110, 66, 44), "white": (200, 180, 140), "blue": (90, 60, 50), "beige": (170, 130, 90), "teal": (130, 90, 60)}
    if per == "V":
        c.wood = ramp(WOODS.get(c.make, (150, 110, 70)), 18)
        rb(d, tx0 - 2, Y0 + 2, tx1 + 2, Y1 - 12, c.wood, 1)
        for k in range(Y0 + 8, Y1 - 14, 8): d.line([tx0, k, tx0 + 6, k], fill=c.wood[1])
        rb(d, tx0 + 2, Y0 + 6, tx1 - 2, Y1 - 18, pad, 4)
        for k in range(Y0 + 14, Y1 - 20, 10): d.ellipse([cx - 1, k, cx + 1, k + 2], fill=pad[0])                # buttons
        for sy in (cy - 10, cy + 20): d.rectangle([tx0 - 3, sy, tx1 + 3, sy + 3], fill=LEATHER["tan"][2], outline=OUT); d.rectangle([tx1 - 1, sy - 1, tx1 + 2, sy + 4], fill=BRASS[3])
        disc(d, cx, Y1 - 6, 6, c.wood); d.ellipse([cx - 4, Y1 - 10, cx + 4, Y1 - 2], fill=(200, 180, 130))         # the sawdust bucket
    elif era == "great-war":
        E = ramp(mix((226, 226, 218), c.paint[2], .35), 10)
        rb(d, tx0 - 3, Y0 + 2, tx1 + 3, Y1 - 14, E, 3); rb(d, tx0 + 1, Y0 + 5, tx1 - 1, Y1 - 18, pad, 3)
        for k in (tx0 - 1, tx1 - 7): ring(d, k + 4, Y1 - 8, 5, STEEL, 1)                                         # the crank wheels
        arms = c.axis("arms", "both")
        for sx_ in ((tx0 - 16, tx1 + 5) if arms == "long" else ()):                                                # instrument trays on stands either side
            rb(d, sx_, Y0 + int(H * .25), sx_ + 11, Y0 + int(H * .45), STEEL, 1)
            for k in range(4): d.line([sx_ + 3, Y0 + int(H * .27) + k * 5, sx_ + 8, Y0 + int(H * .27) + k * 5], fill=STEEL[4])
        if arms == "tucked":
            for bx_ in (X0 + 10, X1 - 10): disc(d, bx_, Y1 - 30, 8, ramp((226, 226, 218), 8))                     # enamel basins on their stands
        d.rectangle([cx - 5, cy - 6, cx + 5, cy + 6], outline=E[0])
    else:
        Bc = ramp(mix((190, 194, 200), c.paint[2], .45), 16) if per == "W" else (ramp(mix((214, 216, 214), c.paint[2], .45), 12) if per == "N" else ramp(mix(COMPOSITE[2], c.paint[2], .8), 14))
        d.ellipse([cx - 18, cy + 10, cx + 18, cy + 34], fill=Bc[1], outline=OUT)                                   # the column's foot
        arms = c.axis("arms", "both")
        for ay in (Y0 + int(H * .32),) if arms != "tucked" else ():                                               # the arm boards
            for sgn in (-1, 1):
                ax0 = tx1 if sgn > 0 else X0 + 2; ax1 = X1 - 2 if sgn > 0 else tx0
                rb(d, ax0, ay, ax1, ay + 10, pad, 3)
        rb(d, tx0 - 2, Y0 + 2, tx1 + 2, Y1 - 4, Bc, 3)
        for (a0, a1) in ((.02, .16), (.17, .55), (.56, .97)):
            rb(d, tx0, Y0 + 4 + int(H * a0), tx1, Y0 + int(H * a1), pad if per != "F" else ramp(mix(pad[2], (30, 34, 40), .2), 12), 4)
        if per in "NF":
            for k in (tx0 - 3, tx1 + 1): d.line([k, Y0 + 20, k, Y1 - 20], fill=STEEL[3], width=2)                 # side rails
            rb(d, cx - 5, Y1 - 9, cx + 5, Y1 - 2, ramp((200, 200, 196), 10), 2)                                       # the foot control
        if per == "F": d.rounded_rectangle([tx0 - 4, Y0 + 1, tx1 + 4, Y1 - 3], 6, outline=c.glow[1], width=2)
    if c.rich and per in "VW": d.rectangle([tx0, Y1 - 15, tx0 + 8, Y1 - 13], fill=BRASS[3] if per == "V" else STEEL[4])
    if full: _patient(d, tx0 + 3, Y0 + 6, tx1 - 3, Y1 - 22, era)


reg("operatingtable", operatingtable, {"pad": ["black", "oxblood", "green", "tan", "red", "blue", "white"], "make": ["grey", "cream", "green", "white", "blue", "beige", "teal"],
                                     "arms": ["both", "long", "tucked", "both"], "floor": ["bare", "tiles", "terrazzo", "lino", "mat"]},
    "operating tables are 1 1/2 to 2 ft wide and 6 to 7 ft long, 3 ft with the arm boards out (Allen and Hanburys; Maquet and Stryker)",
    front=True, clear=3, states=("empty", "full"), nvar=40)


def examtable(tm, x, y, w, h, st, v, c):
    """An examination couch from above, its head to the north. Victorian: a mahogany couch with buttoned leather and a
    raised head; Great War: a white enamelled iron frame with a leather pad; Mid-Century: a chrome frame with a vinyl
    pad in the maker's colour and a step at the foot; Modern: a pale cabinet base with a vinyl top and a roll of paper
    sheet down it; Future Darkness: a dark sealed couch with a lit edge. A sheet, a pillow or a blanket may lie on it."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era
    pad = LEATHER.get(c.axis("pad", "black"), LEATHER["black"]); top = c.axis("cover", "none")
    F = c.wood if per == "V" else (ramp((226, 226, 218), 10) if era == "great-war" else (STEEL if per == "W" else (_era_body(c) if per == "N" else ramp(mix(COMPOSITE[2], c.paint[2], .6), 14))))
    rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, F, 2 if per != "N" else 4)
    if per == "W" and era != "great-war": rb(d, cx - 12, Y1 - 12, cx + 12, Y1 + 1, ramp((60, 62, 66), 10), 2)        # the step
    rb(d, X0 + 5, Y0 + int(H * .22), X1 - 5, Y1 - 6 - (12 if per == "W" and era != "great-war" else 0), pad, 4)
    rb(d, X0 + 5, Y0 + 5, X1 - 5, Y0 + int(H * .22) - 1, ramp(mix(pad[2], (255, 255, 255), .12), 16), 6)             # the raised head
    if per == "V":
        for k in range(Y0 + int(H * .3), Y1 - 10, 12):
            for j in (cx - 8, cx + 8): d.ellipse([j - 1, k - 1, j + 1, k + 1], fill=pad[0])
    if per == "N" and top in ("none", "paper"): d.rectangle([cx - int(W * .3), Y0 + 6, cx + int(W * .3), Y1 - 6], fill=(236, 234, 226), outline=(190, 190, 184)); d.ellipse([cx - int(W * .32), Y1 - 8, cx + int(W * .32), Y1 - 2], fill=(220, 220, 212), outline=OUT)
    elif top == "sheet": d.rectangle([X0 + 6, Y0 + int(H * .3), X1 - 6, Y1 - 10], fill=LINEN[3], outline=LINEN[0])
    elif top == "pillow": rb(d, X0 + 8, Y0 + 7, X1 - 8, Y0 + int(H * .18), WHITE, 5)
    elif top == "blanket": d.rectangle([X0 + 5, Y1 - int(H * .35), X1 - 5, Y1 - 8], fill=(140, 60, 50) if c.w % 2 else (70, 90, 130), outline=OUT)
    if per == "F": d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=c.glow[1], width=2)


reg("examtable", examtable, {"pad": ["black", "oxblood", "green", "tan", "blue", "cream", "red"], "cover": ["none", "paper", "sheet", "pillow", "blanket"]},
    "examination couches are 2 to 2 1/2 ft wide and 6 ft long (Allen and Hanburys; Hill-Rom and Midmark catalogues)",
    metal=False, front=True, clear=2, mount="wall", nvar=20)


def xray(tm, x, y, w, h, st, v, c):
    """An X-ray room's machine from above, the couch running north to south. Victorian: a wooden couch, the pear-shaped
    glass Crookes tube on a wooden stand arm over it, the induction coil in its box beside with its brass terminals
    and wires; Great War: a Coolidge tube in a lead-glass bowl on an iron column, the transformer cabinet behind;
    Mid-Century: a cream couch under a tube head on a ceiling column, the control desk behind its lead screen; Modern:
    a C-arm on its wheeled base curving round the table, its monitor cart beside; Future Darkness: a dark ring gantry
    over the couch with lit seams. On: the tube glowing (green in the old glass), the lamps lit. It stands on bare floor, tiles, linoleum, terrazzo or boards."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    pad = LEATHER.get(c.axis("pad", "black"), LEATHER["black"]); B = c.paint if per != "F" else ramp(mix(COMPOSITE[2], c.paint[2], .75), 14)
    tx0, tx1 = X0 + int(W * .22), X0 + int(W * .6)
    glows = []
    if per == "V" or era == "great-war":
        T = c.wood if per == "V" else ramp((226, 226, 218), 10)
        rb(d, tx0, Y0 + 10, tx1, Y1 - 6, T, 2); rb(d, tx0 + 3, Y0 + 13, tx1 - 3, Y1 - 9, pad, 4)                  # the couch
        TB = ramp(mix(c.wood[2], c.paint[2], .45), 18) if per == "V" else c.paint
        rb(d, X1 - 38, Y0 + 4, X1 - 2, Y1 - 4, TB, 2)                                                           # the apparatus table
        for j, yy in enumerate(range(Y1 - 50, Y1 - 8, 12)):                                                   # its battery of jars
            for xx in range(X1 - 34, X1 - 6, 10): d.rectangle([xx, yy, xx + 7, yy + 9], fill=(150, 180, 170), outline=OUT); d.rectangle([xx + 2, yy + 2, xx + 5, yy + 4], fill=(70, 60, 50))
        coil_box = (X1 - 30, Y0 + 8, X1 - 2, Y0 + 50)
        rb(d, *coil_box, c.wood if per == "V" else ramp(mix(c.paint[2], (40, 40, 44), .4), 14), 2)              # induction coil or transformer
        if per == "V":
            d.rounded_rectangle([X1 - 26, Y0 + 14, X1 - 6, Y0 + 44], 8, fill=(40, 30, 30), outline=OUT)           # the coil itself, wound in black
            for k in range(Y0 + 16, Y0 + 43, 3): d.line([X1 - 24, k, X1 - 8, k], fill=(70, 50, 40))
        for k in (X1 - 26, X1 - 8): disc(d, k, Y0 + 54, 3, BRASS)
        tp = (cx, cy - 10)
        d.line([X0 + 6, Y0 + 20, tp[0], tp[1]], fill=OUT, width=6); d.line([X0 + 6, Y0 + 20, tp[0], tp[1]], fill=c.wood[2] if per == "V" else IRON[3], width=3)   # the stand arm
        rb(d, X0 + 2, Y0 + 12, X0 + 14, Y0 + 28, c.wood if per == "V" else IRON, 2)
        gcol = (120, 230, 120) if on else (190, 210, 200)
        if per == "V":
            d.ellipse([tp[0] - 16, tp[1] - 10, tp[0] + 16, tp[1] + 10], fill=mix(gcol, (40, 60, 50), .2), outline=(60, 90, 70))   # the Crookes tube
            d.ellipse([tp[0] - 6, tp[1] - 4, tp[0] + 6, tp[1] + 4], fill=gcol)
            for k in (-22, 22): d.line([tp[0] + k * .7, tp[1], tp[0] + k, tp[1]], fill=(180, 200, 190), width=3)
        else:
            disc(d, tp[0], tp[1], 15, ramp((90, 80, 70), 14)); d.ellipse([tp[0] - 7, tp[1] - 7, tp[0] + 7, tp[1] + 7], fill=gcol if on else (110, 120, 120))
        cable(d, [(X1 - 26, Y0 + 54), (tp[0] + 20, tp[1] - 20), (tp[0] + 14, tp[1])], ramp((170, 140, 90), 14), 1)
        cable(d, [(X1 - 8, Y0 + 54), (X1 - 10, tp[1] + 20), (tp[0] + 16, tp[1] + 6)], ramp((170, 140, 90), 14), 1)
        if on: glows.append((tp[0], tp[1], 60, (1.0, 1.4, 1.0)))
        if c.rich: plate(d, X1 - 24, Y0 + 40, BRASS, 12, 4)
    elif per == "W":
        rb(d, tx0, Y0 + 8, tx1, Y1 - 8, ramp((220, 212, 190), 10), 3); rb(d, tx0 + 3, Y0 + 11, tx1 - 3, Y1 - 11, pad, 4)
        d.rectangle([X0 + 2, Y0 + 2, X0 + 10, Y1 - 30], fill=STEEL[2], outline=OUT)                                # the ceiling rail
        th = (cx, cy - 6)
        d.line([X0 + 6, th[1], th[0], th[1]], fill=STEEL[3], width=5)
        rb(d, th[0] - 16, th[1] - 12, th[0] + 16, th[1] + 12, B, 6)                                               # the tube head
        d.rectangle([th[0] - 7, th[1] - 7, th[0] + 7, th[1] + 7], fill=(60, 60, 64), outline=OUT); lamp(d, th[0], th[1], 3, on, (250, 230, 150))
        d.rectangle([X1 - 40, Y0 + 30, X1 - 34, Y1 - 4], fill=ramp((140, 140, 136), 10)[2], outline=OUT)            # the lead screen
        d.rectangle([X1 - 40, Y1 - 50, X1 - 34, Y1 - 36], fill=(110, 140, 160))
        rb(d, X1 - 30, Y1 - 70, X1 - 2, Y1 - 6, B, 2)                                                            # the control desk
        rb(d, X1 - 30, Y0 + 4, X1 - 2, Y0 + 40, ramp(mix(B[2], (60, 60, 60), .3), 14), 3)                          # the transformer
        for k in range(3): lamp(d, X1 - 18 + k * 6, Y1 - 34, 2, on, ((250, 80, 60), (250, 200, 60), (90, 220, 90))[k])
        d.ellipse([X1 - 18, Y1 - 26, X1 - 8, Y1 - 16], fill=(230, 226, 210), outline=OUT)
        if on: glows.append((th[0], th[1], 30, WARM))
    elif per == "N":
        rb(d, tx0, Y0 + 6, tx1, Y1 - 6, ramp((90, 94, 100), 10), 2); rb(d, tx0 + 3, Y0 + 9, tx1 - 3, Y1 - 9, pad, 4)
        ac = (X0 + 18, cy)
        rb(d, X0 + 2, cy - 24, X0 + 30, cy + 24, B, 6)                                                            # the C-arm's wheeled base
        d.arc([X0 + 10, cy - 34, tx1 + 18, cy + 34], 270, 90, fill=OUT, width=12); d.arc([X0 + 11, cy - 33, tx1 + 17, cy + 33], 270, 90, fill=ramp(mix(B[2], (230, 230, 230), .5), 12)[2], width=8)
        rb(d, cx + 10, cy - 40, cx + 30, cy - 26, ramp((200, 200, 200), 10), 3); rb(d, cx + 10, cy + 26, cx + 30, cy + 40, ramp((200, 200, 200), 10), 3)   # tube and intensifier
        rb(d, X1 - 26, Y0 + 6, X1 - 2, Y0 + 50, ramp(mix((200, 200, 196), B[2], .4), 10), 3)                          # the monitor cart
        screen(d, X1 - 23, Y0 + 9, X1 - 5, Y0 + 24, on, [(20, 20, 24), (170, 170, 170), (240, 240, 240)]); screen(d, X1 - 23, Y0 + 27, X1 - 5, Y0 + 42, on, [(20, 20, 24), (170, 170, 170), (240, 240, 240)])
        hazard(d, X0 + 4, cy + 18, X0 + 28, cy + 22, 3)
        if on: glows.append((X1 - 14, Y0 + 26, 26, COOL))
    else:
        rb(d, tx0, Y0 + 6, tx1, Y1 - 6, ramp((40, 44, 52), 10), 3); rb(d, tx0 + 3, Y0 + 9, tx1 - 3, Y1 - 9, ramp(mix(pad[2], (30, 34, 40), .25), 12), 4)
        gy = cy - 20
        B = ramp(mix(COMPOSITE[2], c.paint[2], .85), 14)
        rb(d, X0 + 4, gy - 26, X1 - 4, gy + 26, B, 14); d.rectangle([tx0 - 2, gy - 18, tx1 + 2, gy + 18], fill=(16, 18, 22))   # the ring gantry
        rb(d, X1 - 26, Y1 - 50, X1 - 4, Y1 - 6, B, 4); screen(d, X1 - 23, Y1 - 46, X1 - 7, Y1 - 30, on, c.glow, "trace")
        d.rounded_rectangle([X0 + 8, gy - 14, X1 - 8, gy + 14], 8, outline=c.glow[1 if on else 0], width=2)
        if on: glows.append((cx, gy, 40, COOL))
    return glows


reg("xray", xray, {"floor": ["bare", "tiles", "lino", "terrazzo", "boards"], "make": ["cream", "grey", "white", "green", "blue", "beige", "teal"], "pad": ["black", "oxblood", "green", "tan", "blue", "cream", "red"]},
    "an X-ray couch with its tube stand or C-arm takes a floor about 6 by 8 ft (Siemens and General Electric catalogues)",
    front=True, clear=3, states=("off", "on"), nvar=40)


def scanner(tm, x, y, w, h, st, v, c):
    """A body scanner from above: the great gantry across the north end, its bore over the patient table that runs
    out south on its base. Mid-Century: the first CT scanners, a squared beige gantry with its electronics cabinet; Modern: a white CT ring or the
    deep block of an MRI magnet with the maker's coloured band, a control box and a laser cross on the table; Future
    Darkness: a dark sealed gantry with a lit ring. On: the lamps, the lit ring and the laser lines."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; on = st == "on"; kind = c.axis("kind", "ct")
    G = ramp((210, 196, 160), 12) if per == "W" else (ramp((228, 228, 224), 8) if per == "N" else ramp(mix(COMPOSITE[2], c.paint[2], .6), 14))
    depth = int(H * (.22 if kind == "ct" else .38)); gy0 = Y0 + 6
    tx0, tx1 = cx - int(W * .17), cx + int(W * .17)
    rb(d, tx0 + 6, gy0 + depth - 4, tx1 - 6, Y1 - 4, ramp((150, 154, 160), 12), 4)                               # the table's base
    rb(d, tx0, gy0 + depth // 3, tx1, Y1 - 20, ramp((70, 76, 86) if per != "W" else (120, 110, 90), 12), 6)       # the table top
    pad = c.axis("pad", "blue")
    rb(d, tx0 + 3, gy0 + depth + 6, tx1 - 3, Y1 - 24, LEATHER.get(pad, LEATHER["blue"]), 5)
    rb(d, X0 + 2, gy0, X1 - 2, gy0 + depth, G, (14 if kind != "pet" else 6) if per != "W" else 2)               # the gantry
    if per == "W":                                                                                             # a squared gantry and its separate electronics cabinet
        d.rectangle([X0 + 6, gy0 + 4, X1 - 6, gy0 + depth - 4], outline=G[1])
        rb(d, X0 + 2, cy + 6, X0 + 30, Y1 - 4, ramp((196, 184, 150), 12), 2); [d.line([X0 + 5, k, X0 + 27, k], fill=(150, 140, 110)) for k in range(cy + 10, Y1 - 6, 4)]
    else:
        d.rounded_rectangle([X0 + 6, gy0 + 4, X1 - 6, gy0 + depth - 4], 10, outline=G[1])
        d.ellipse([cx - int(W * .3), gy0 + 2, cx + int(W * .3), gy0 + depth - 2], outline=G[0], width=3)         # the ring within its cover
    band = c.paint
    d.rectangle([X0 + 3, gy0 + depth // 3, X1 - 3, gy0 + depth * 2 // 3], fill=band[2] if per != "F" else mix(band[2], (40, 44, 50), .5))
    if per == "F": d.line([X0 + 3, gy0 + depth // 2, X1 - 3, gy0 + depth // 2], fill=c.glow[1 if on else 0], width=2)
    if kind == "pet": d.line([X0 + 8, gy0 + depth // 3, X1 - 8, gy0 + depth // 3], fill=band[3], width=2)
    d.ellipse([cx - 8, gy0 + depth - 10, cx + 8, gy0 + depth + 2], fill=(20, 22, 26), outline=OUT)               # the mouth of the bore
    rb(d, X1 - 18, Y1 - 30, X1 - 2, Y1 - 4, ramp((190, 190, 186), 10) if per != "F" else c.comp, 3)               # the control pedestal
    lamp(d, X1 - 10, Y1 - 24, 2, on, (90, 220, 90))
    glows = []
    if on:
        d.line([cx, gy0 + depth + 4, cx, Y1 - 26], fill=(250, 60, 60)); d.line([tx0 + 2, gy0 + depth + 20, tx1 - 2, gy0 + depth + 20], fill=(250, 60, 60))   # the laser cross
        for k in (X0 + 12, X1 - 12): lamp(d, k, gy0 + depth // 2, 3, True, (120, 220, 250))
        glows.append((cx, gy0 + depth // 2, 50, COOL))
    return glows


reg("scanner", scanner, {"make": ["blue", "teal", "grey", "green", "orange", "red", "black"], "kind": ["ct", "mri", "pet"], "pad": ["blue", "black", "cream", "green", "white"]},
    "a CT or MRI scanner's gantry and table take a room floor about 7 by 14 ft (EMI 1975; Siemens, GE and Philips site plans)",
    front=True, clear=3, states=("off", "on"), nvar=32)


def ventilator(tm, x, y, w, h, st, v, c):
    """A ventilator from above. Mid-Century: a Bird or Bennett respirator, a small green or grey box on its pole stand
    with a five-castor foot, the corrugated hose looping to the bed and the oxygen cylinder chained beside, a cardiac
    monitor with its round green screen on the shelf; Modern: a pale ventilator on its trolley, its touch screen and
    the patient monitor above, white hoses, an oxygen cylinder in green, white or black as the country codes it;
    Future Darkness: a slim tower on a round foot with lit screens. On: the screens lit with their traces. It stands on bare floor, tiles, linoleum or terrazzo."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    B = c.paint if per == "W" else (ramp(mix((214, 216, 214), c.paint[2], .8), 12) if per == "N" else ramp(mix(COMPOSITE[2], c.paint[2], .85), 14))
    tr = [(10, 40, 20), (60, 220, 90), (200, 255, 200)]
    if per == "W":
        rb(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, ramp(mix(c.paint[2], (200, 200, 196), .25), 12), 3)                 # the shelf trolley
        for kx, ky in ((X0 + 1, Y0 + 1), (X1 - 4, Y0 + 1), (X0 + 1, Y1 - 4), (X1 - 4, Y1 - 4)): d.ellipse([kx, ky, kx + 3, ky + 3], fill=RUBBER[2], outline=OUT)
        disc(d, X0 + 7, Y1 - 7, 6, ramp((50, 50, 56), 12)); d.ellipse([X0 + 4, Y1 - 10, X0 + 10, Y1 - 4], fill=(220, 220, 214))   # the oxygen cylinder
        rb(d, cx - 10, cy - 8, cx + 10, cy + 6, B, 3)                                                              # the respirator box
        d.ellipse([cx - 4, cy - 5, cx + 4, cy + 3], fill=(230, 226, 210), outline=OUT)
        rb(d, X0 + 2, Y0 + 2, X0 + 18, Y0 + 14, ramp((70, 70, 74), 12), 3); d.ellipse([X0 + 5, Y0 + 4, X0 + 15, Y0 + 12], fill=tr[0] if not on else tr[1], outline=OUT)   # the round scope
    elif per == "F":                                                                                           # a slim tower on a round foot
        disc(d, cx, cy + 6, int(min(W, H) * .42), ramp((50, 54, 62), 10))
        rb(d, cx - 15, Y0 + 2, cx + 15, Y1 - 6, B, 8)
        screen(d, cx - 8, Y0 + 5, cx + 8, cy - 4, on, c.glow, "trace"); d.line([cx - 13, cy + 4, cx + 13, cy + 4], fill=c.glow[1 if on else 0], width=2)
    else:
        rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, B, 4)
        screen(d, X0 + 5, Y0 + 5, X1 - 5, Y0 + 15, on, tr if per == "N" else c.glow, "trace")
        screen(d, X0 + 5, Y0 + 18, cx + 2, Y0 + 26, on, [(40, 30, 10), (240, 200, 60), (255, 240, 180)], "lines")
        for k in range(3): lamp(d, cx + 7 + k * 4, Y0 + 22, 1, on, ((250, 80, 60), (250, 200, 60), (90, 220, 90))[k])
        if per == "N": d.rectangle([X0 + 3, Y1 - 6, X1 - 3, Y1 - 4], fill=c.paint[2])
        cyl = c.axis("cylinder", "none")
        if cyl != "none": disc(d, X0 + 9, Y1 - 10, 8, ramp({"green": (60, 140, 80), "white": (226, 226, 222), "black": (44, 44, 48)}[cyl], 12)); d.ellipse([X0 + 6, Y1 - 13, X0 + 12, Y1 - 7], fill=STEEL[3], outline=OUT)
    hose = ramp({"white": (214, 216, 214), "blue": (110, 150, 200), "clear": (180, 200, 206), "green": (110, 170, 130), "grey": (140, 144, 150)}[c.axis("hose", "white")], 10)
    cable(d, [(cx, cy + 4), (cx + 10, Y1 - 4), (X1 - 4, Y1 - 10), (X1 - 2, cy)], hose, 3)
    for k in range(4): d.point((cx + 8 + k * 2, Y1 - 5 - k), fill=hose[0])
    if on: return [(cx, Y0 + 10, 18, COOL)]


reg("ventilator", ventilator, {"floor": ["bare", "tiles", "lino", "terrazzo"], "make": ["green", "grey", "cream", "blue", "teal", "black", "yellow"], "hose": ["white", "blue", "clear", "green", "grey"],
                                "cylinder": ["none", "green", "white", "black", "none"]},
    "a respirator on its stand or a ventilator trolley with its monitor takes about 2 ft square (Bird Mark 7, 1958; Puritan Bennett and Draeger)",
    front=True, clear=1.5, states=("off", "on"), nvar=48)


def dentalchair(tm, x, y, w, h, st, v, c):
    """A dentist's chair from above, the head to the north. Victorian: a carved chair in plush on its pump pedestal, a
    porcelain spittoon on a bracket and the foot-treadle engine with its cord arm beside; Great War: white enamel and
    leather, the electric engine on its jointed arm of pulleys, a glass spittoon; Mid-Century: a reclining chair in
    the maker's vinyl, the unit beside it with the spittoon, the instrument tray on its arm and the lamp over the
    head; Modern: a contoured chair lying almost flat, a tray swung over the chest and a lamp; Future Darkness: a dark
    pod-chair with lit edges. The unit stands on the right, or on the left for a left-handed dentist."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era
    U = LEATHER.get(c.axis("pad", "red"), LEATHER["red"]); left = c.axis("side", "right") == "left"; ccx = cx + (int(W * .08) if left else -int(W * .08))
    sx0, sx1 = ccx - int(W * .3), ccx + int(W * .3)
    frm = ramp(mix(c.wood[2], c.paint[2], .4), 18) if per == "V" else (_era_body(c) if per != "W" or era == "great-war" else ramp(mix((190, 194, 200), c.paint[2], .5), 16))
    disc(d, ccx, cy + 6, 16, frm)                                                                                # the pedestal
    rb(d, ccx - 9, Y0 + 3, ccx + 9, Y0 + 14, U, 5)                                                               # the head rest
    d.rectangle([ccx - 2, Y0 + 13, ccx + 2, Y0 + 18], fill=frm[2], outline=OUT)
    rb(d, sx0, Y0 + 18, sx1, cy, U, 6)                                                                           # the back
    rb(d, sx0, cy + 1, sx1, cy + int(H * .2), U, 5)                                                              # the seat
    if per in "VW" and era != "mid-century" or per == "V":
        for ax in (sx0 - 6, sx1 + 1): rb(d, ax, cy - 8, ax + 5, cy + int(H * .18), frm, 2)                        # the arms
        rb(d, ccx - int(W * .14), cy + int(H * .22), ccx + int(W * .14), Y1 - 8, frm, 2)                          # a footrest
    else:
        rb(d, sx0 + 2, cy + int(H * .2) + 1, sx1 - 2, Y1 - 4, U, 6)                                              # the leg rest
    if per == "V":
        for k in range(Y0 + 24, cy - 2, 8): d.ellipse([ccx - 1, k, ccx + 1, k + 2], fill=U[0])
        if c.rich: d.rectangle([sx0, Y0 + 18, sx1, Y0 + 20], fill=BRASS[3])
    ux = X1 - 12 if not left else X0 + 10
    if per == "V":
        rb(d, ux - 6, cy + 10, ux + 8, cy + 34, c.wood, 2); d.line([ux, cy + 10, ux - 4, Y0 + 20], fill=IRON[3], width=2)   # the treadle engine and its arm
        ring(d, ux + 1, cy + 22, 6, IRON, 1)
        d.ellipse([ux - 6, Y0 + 24, ux + 6, Y0 + 36], fill=(236, 232, 220), outline=OUT); d.ellipse([ux - 3, Y0 + 27, ux + 3, Y0 + 33], fill=(150, 170, 180))   # porcelain spittoon
    else:
        if era == "great-war":
            pts = [(ux + 4, Y1 - 10), (ux - 2, cy + 6), (ux + 6, Y0 + 28), (ccx + 10, Y0 + 20)]
            d.line(pts, fill=OUT, width=4); d.line(pts, fill=STEEL[3], width=2)
            for p_ in pts[1:3]: ring(d, p_[0], p_[1], 3, STEEL, 1)
            d.ellipse([ux - 6, Y0 + 30, ux + 6, Y0 + 42], fill=(180, 210, 220), outline=OUT)                       # the glass spittoon
        else:
            rb(d, ux - 7, Y0 + 26, ux + 9, cy + 20, frm if per != "W" else c.paint, 4)                                 # the dental unit
            d.ellipse([ux - 5, Y0 + 28, ux + 7, Y0 + 40], fill=(236, 236, 230), outline=OUT); d.ellipse([ux - 2, Y0 + 31, ux + 4, Y0 + 37], fill=(120, 170, 190))
            tray = (ccx - 4 if per == "N" else (ux - 18 if not left else ux + 4), cy + 4 if per == "N" else cy + 26)
            d.line([ux, cy + 10, tray[0] + 6, tray[1] + 3], fill=STEEL[2], width=2)
            rb(d, tray[0] - 4, tray[1] - 3, tray[0] + 16, tray[1] + 9, ramp((210, 210, 206), 10), 2)
            for k in range(4): d.line([tray[0] + k * 4, tray[1], tray[0] + k * 4 + 2, tray[1] + 6], fill=STEEL[4])
            d.line([X0 + 4, Y0 + 2, ccx - 6, Y0 + 8], fill=STEEL[2], width=2); rb(d, ccx - 12, Y0 + 4, ccx + 2, Y0 + 12, ramp((220, 220, 214), 10), 3)   # the lamp
            if per == "F": d.line([sx0 - 2, Y0 + 18, sx0 - 2, Y1 - 6], fill=c.glow[1], width=2)


reg("dentalchair", dentalchair, {"pad": ["red", "green", "blue", "oxblood", "cream", "black", "tan"], "make": ["cream", "grey", "green", "white", "blue", "beige", "maroon"], "side": ["right", "left", "right"]},
    "a dental chair with its unit takes about 3 by 6 ft lying back (S. S. White 1870s; Ritter and A-dec catalogues)",
    front=True, clear=2, nvar=40)


def embalming(tm, x, y, w, h, st, v, c):
    """An embalming table from above, the head to the north. Victorian: a scrubbed wooden board on trestles with a
    bucket at the foot and the gravity bottle hung on its stand; Great War: a white porcelain table with a raised rim,
    a drain channel and a hole at the foot; Mid-Century: a porcelain or steel table on its pedestal with the embalming
    machine (a glass jar on a pump) beside; Modern: stainless steel with drain holes, a head block and a hose; Future
    Darkness: dark steel with lit edges. A rubber sheet, a folded sheet or towels may lie on it, and an instrument
    trays, rows of fluid bottles or basins either side. Full: a body under its sheet. It stands on tiles, chequered tiles, terrazzo or linoleum."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era; full = st == "full"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    fin = c.axis("finish", "porcelain")
    T = c.wood if per == "V" else ramp({"porcelain": (230, 230, 222), "steel": (184, 188, 192), "enamel": (214, 220, 212), "marble": (220, 214, 204),
                                       "zinc": (160, 166, 168)}[fin], 10)
    if per == "V": T = ramp(mix(c.wood[2], c.paint[2], .45), 18)
    elif per != "F": T = ramp(mix(T[2], c.paint[2], .4), 10)
    if per == "F": T = ramp(mix((60, 64, 72), c.paint[2], .3), 12)
    tx0, tx1 = cx - int(W * .4), cx + int(W * .4)
    if per == "V":
        for ty in (Y0 + 18, Y1 - 30): d.rectangle([tx0 - 4, ty, tx1 + 4, ty + 6], fill=c.wood[1], outline=OUT)
        rb(d, tx0, Y0 + 4, tx1, Y1 - 14, T, 1); [d.line([k, Y0 + 6, k, Y1 - 16], fill=T[1]) for k in range(tx0 + 8, tx1 - 2, 9)]
        disc(d, cx, Y1 - 6, 6, c.wood); d.ellipse([cx - 3, Y1 - 9, cx + 3, Y1 - 3], fill=(90, 40, 40))
        d.line([X1 - 6, Y0 + 4, X1 - 6, Y0 + 40], fill=IRON[3], width=2); d.ellipse([X1 - 11, Y0 + 2, X1 - 1, Y0 + 14], fill=(200, 210, 200), outline=OUT); d.ellipse([X1 - 9, Y0 + 6, X1 - 3, Y0 + 12], fill=(200, 110, 110))
    elif era == "great-war":                                                                                       # a porcelain tub-table with its thick rim
        rb(d, tx0, Y0 + 4, tx1, Y1 - 16, T, 10)
        d.rounded_rectangle([tx0 + 6, Y0 + 10, tx1 - 6, Y1 - 22], 8, fill=T[1], outline=T[0])
        d.ellipse([cx - 3, Y1 - 27, cx + 3, Y1 - 21], fill=(30, 30, 34)); disc(d, cx, Y1 - 7, 6, ramp((200, 200, 196), 10))   # drain and pail
    else:
        if per != "W": disc(d, cx, cy + 10, 16, STEEL if per != "F" else c.comp)
        rb(d, tx0 + 6, Y0 + 4, tx1 - 6, Y1 - 6, T, 3)
        d.rectangle([tx0 + 9, Y0 + 8, tx1 - 9, Y1 - 10], outline=T[0])                                            # the gutter
        d.line([cx, Y0 + 14, cx, Y1 - 14], fill=T[1]); d.ellipse([cx - 3, Y1 - 15, cx + 3, Y1 - 9], fill=(30, 30, 34))   # the channel and drain
        if per in "NF":
            for k in range(Y0 + 20, Y1 - 20, 10): d.ellipse([cx - 9, k, cx - 7, k + 2], fill=T[0]); d.ellipse([cx + 7, k, cx + 9, k + 2], fill=T[0])
            rb(d, cx - 6, Y0 + 9, cx + 6, Y0 + 16, ramp((90, 100, 110), 10), 3)                                    # the head block
            cable(d, [(cx + 2, Y1 - 10), (X1 - 4, Y1 - 8), (X1 - 4, cy)], ramp((200, 200, 196), 10), 1)
        if per == "W" and era == "mid-century" or per == "N":
            rb(d, X1 - 14, Y0 + 6, X1 - 1, Y0 + 30, ramp(mix(c.paint[2], (200, 200, 200), .2) if per == "W" else (190, 192, 196), 12), 2)   # the embalming machine
            d.ellipse([X1 - 12, Y0 + 8, X1 - 3, Y0 + 17], fill=(200, 210, 214), outline=OUT); d.ellipse([X1 - 10, Y0 + 10, X1 - 5, Y0 + 15], fill=(210, 120, 130))
        if per == "F": d.rounded_rectangle([tx0 - 2, Y0 + 2, tx1 + 2, Y1 - 4], 6, outline=c.glow[1], width=2)
    if c.rich and per in "VW": d.rectangle([tx0 + 2, Y1 - 13, tx0 + 10, Y1 - 11], fill=BRASS[3])
    cov = c.axis("cover", "bare")
    if not full and cov == "rubber": rb(d, tx0 + 8, Y0 + 12, tx1 - 8, Y1 - 24, ramp((96, 44, 36) if per != "F" else (40, 40, 44), 10), 2)   # a rubber sheet laid out
    elif not full and cov == "sheet": rb(d, tx0 + 6, cy + 10, tx1 - 6, Y1 - 20, ramp((228, 226, 218), 8), 2)   # a folded sheet at the foot
    elif not full and cov == "towels": rb(d, tx0 + 6, Y0 + 8, tx1 - 6, Y0 + 40, ramp((90, 130, 110) if per in "NF" else (210, 206, 196), 12), 2)
    kit = c.axis("kit", "none")
    for (a0, a1) in ((X0, tx0 - 1), (tx1 + 1, X1)):                                                          # the same on each side
        if a1 - a0 < 6: continue
        if kit == "tray": rb(d, a0, cy - 30, a1, cy + 20, STEEL, 2); [d.line([a0 + 3, k, a1 - 3, k], fill=STEEL[4]) for k in range(cy - 26, cy + 18, 6)]
        elif kit == "bottles":
            for k in range(4): d.ellipse([a0 + 1, Y0 + 40 + k * 14, a1 - 1, Y0 + 52 + k * 14], fill=((200, 110, 120), (230, 150, 60), (90, 170, 110), (200, 200, 210))[k], outline=OUT)
        elif kit == "basin": disc(d, (a0 + a1) // 2, Y1 - 30, min(8, (a1 - a0) // 2), ramp((226, 226, 220), 8) if per != "F" else c.comp)
    if full: _patient(d, tx0 + 3, Y0 + 8, tx1 - 3, Y1 - 16, era, (226, 224, 214))


reg("embalming", embalming, {"floor": ["tiles", "terrazzo", "lino", "check"], "finish": ["porcelain", "steel", "enamel", "marble", "zinc"], "make": ["grey", "cream", "green", "white", "blue", "black", "teal"],
                             "cover": ["bare", "rubber", "sheet", "towels", "bare"], "kit": ["none", "tray", "bottles", "basin"]},
    "embalming and cooling tables are 2 to 2 1/2 ft wide and 6 1/2 to 7 ft long (Ferguson and Frigid Fluid Co. catalogues)",
    front=True, clear=3, states=("empty", "full"), nvar=32)


def cremator(tm, x, y, w, h, st, v, c):
    """A cremation furnace from above, its charging door to the south and its flue to the north. Victorian: a block of
    firebrick in courses, the iron door in its frame and a round brick flue (Gorini's and Siemens's kind); Great War:
    the same bound with iron tie rods and gas burner pipes along its sides; Mid-Century: a steel-cased furnace in the
    maker's enamel with a counterweighted door and a control box; Modern: a stainless-clad cabinet with a control
    screen and a stack; Future Darkness: a dark sealed block with lit seams. The flue stands where the building
    puts it, and a big crematorium has two chambers side by side. Lit: fire showing at the peep holes and
    round the door, its glow on the floor before it. It stands on bare floor, tiles, concrete, terrazzo or chequer plate."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era; lit = st == "lit"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    brick = ramp({"grey": (150, 70, 50), "green": (190, 170, 110), "blue": (120, 60, 50), "cream": (210, 190, 150), "black": (110, 100, 96),
                  "maroon": (130, 50, 40), "silver": (176, 150, 120)}.get(c.make, (150, 70, 50)), 16)                     # red, yellow stock, blue engineering, white glazed, grey fire brick
    if per == "V" or era == "great-war":
        rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 14, brick, 1)
        for k, yy in enumerate(range(Y0 + 6, Y1 - 16, 6)):
            d.line([X0 + 3, yy, X1 - 3, yy], fill=brick[0])
            for xx in range(X0 + 6 + (k % 2) * 6, X1 - 3, 12): d.line([xx, yy - 5, xx, yy], fill=brick[1])
        fx = {"centre": cx, "west": X0 + 26, "east": X1 - 26}[c.axis("flue", "centre")]
        disc(d, fx, Y0 + 26, 20, brick); d.ellipse([fx - 11, Y0 + 15, fx + 11, Y0 + 37], fill=(24, 18, 18))         # the flue
        if era == "great-war":                                                                                   # cased in iron plates
            Pl = ramp(mix((70, 72, 78), c.paint[2], .2), 12)
            d.rectangle([X0 + 2, Y0 + 50, X1 - 2, Y1 - 14], fill=Pl[2], outline=OUT)
            for k in range(X0 + 2, X1, 30): d.line([k, Y0 + 50, k, Y1 - 14], fill=Pl[0]); [rivet(tm, k + 3, yy) for yy in range(Y0 + 56, Y1 - 16, 14)]
            for k in (Y0 + 50, cy + 10): d.line([X0 + 2, k, X1 - 2, k], fill=IRON[2], width=3)
            for k in (X0 + 6, X1 - 8): d.line([k, Y0 + 44, k, Y1 - 18], fill=ramp((120, 120, 110), 12)[2], width=4)   # gas pipes
    else:
        Cs = c.paint if per == "W" else (ramp(mix((196, 200, 204), c.paint[2], .6), 12) if per == "N" else ramp(mix(COMPOSITE[2], c.paint[2], .55), 14))
        rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 14, Cs, 4)
        for k in range(X0 + 20, X1 - 10, 24): d.line([k, Y0 + 4, k, Y1 - 16], fill=Cs[1])
        fl = c.axis("flue", "centre") != "east"; sx_ = X0 + 22 if fl else X1 - 22; bx_ = X1 - 34 if fl else X0 + 8
        disc(d, sx_, Y0 + 22, 14, STEEL if per != "F" else c.comp); d.ellipse([sx_ - 7, Y0 + 15, sx_ + 7, Y0 + 29], fill=(24, 18, 18))   # the stack
        rb(d, bx_, Y0 + 10, bx_ + 26, Y0 + 40, ramp((70, 72, 78), 10), 3)                                         # the control box
        if per == "W": [lamp(d, bx_ + 6 + k * 8, Y0 + 20, 3, lit, ((250, 80, 60), (250, 200, 60), (90, 220, 90))[k]) for k in range(3)]
        else: screen(d, bx_ + 3, Y0 + 13, bx_ + 23, Y0 + 28, lit, c.glow if per == "F" else None, "lines")
        if per == "F": d.rounded_rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 17], 6, outline=c.glow[1 if lit else 0], width=2)
    two = c.axis("doors", 1) == 2
    dx0, dx1 = (cx - int(W * .22), cx + int(W * .22)) if not two else (X0 + 8, cx - 6)
    for o_ in ((0,) if not two else (0, dx1 - dx0 + 14)):
        rb(d, dx0 + o_, Y1 - 22, dx1 + o_, Y1 - 4, IRON if per in "VW" else STEEL, 2)                              # the charging door(s)
    if per == "W" and era == "mid-century":
        d.line([dx1, Y1 - 13, X1 - 8, Y1 - 13], fill=IRON[3], width=2); disc(d, X1 - 8, Y1 - 13, 4, IRON)            # its counterweight
    for k in (cx - 10, cx + 10):
        d.ellipse([k - 3, Y1 - 16, k + 3, Y1 - 10], fill=(250, 150, 40) if lit else (30, 24, 24), outline=OUT)        # peep holes
    if lit: d.line([dx0 + 2, Y1 - 4, dx1 - 2, Y1 - 4], fill=(250, 120, 40), width=2)
    if c.rich and per in "VW": plate(d, dx0 + 4, Y1 - 20, BRASS, 10, 4)
    if lit: return [(cx, Y1 + 6, 60, WARM)]


reg("cremator", cremator, {"floor": ["bare", "tiles", "concrete", "terrazzo", "plate"], "make": ["grey", "green", "blue", "cream", "black", "maroon", "silver"], "flue": ["centre", "west", "east"], "doors": [1, 2, 1]},
    "a cremation furnace takes a floor of about 8 by 10 ft with its door (Gorini 1870s; Siemens; Matthews and Facultatieve cremators)",
    front=True, clear=8, states=("out", "lit"), light={"dim": 3, "bright": 1, "color": "#ff8a30", "kind": "fire"}, nvar=32)


# ================================================================ trades and pleasures of the town
def barberchair(tm, x, y, w, h, st, v, c):
    """A barber's chair from above, the head rest to the north and the foot rest to the south, on its round pump
    base. Victorian: a carved oak frame in plush, the foot rest of cast iron; Great War: white porcelain enamel arms and
    base with leather; Mid-Century: chrome arms, a vinyl seat and back in the maker's colour, a chrome foot plate;
    Modern: a black or coloured hydraulic chair on its chrome disc; Future Darkness: a dark moulded chair with a lit
    edge. A cape or a towel may lie over it. It stands on bare floor, chequered or plain tiles, linoleum, boards or terrazzo."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; era = c.era
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    U = LEATHER.get(c.axis("pad", "red"), LEATHER["red"])
    if per == "V": U = ramp(mix(U[2], (110, 40, 70), .3), 16)
    frm = ramp(mix(c.wood[2], c.paint[2], .4), 18) if per == "V" else (ramp(mix((232, 232, 226), c.paint[2], .3), 10) if era == "great-war" else
          (ramp(mix((200, 204, 210), c.paint[2], .5), 16) if per in "WN" else ramp(mix(COMPOSITE[2], c.paint[2], .6), 14)))
    base = {"V": frm, "N": ramp((44, 44, 48), 10), "F": frm}.get(per, ramp((236, 236, 230), 8) if era == "great-war" else STEEL)
    if per == "N": U = ramp(mix(U[2], (30, 30, 34), .15), 14); frm = ramp((40, 40, 44), 10)                       # modern: dark vinyl, black arms
    disc(d, cx, cy + 6, int(W * .42), base)                                                                    # the round base
    if per == "N": d.ellipse([cx - int(W * .42) + 2, cy + 8 - int(W * .42), cx + int(W * .42) - 2, cy + 4 + int(W * .42)], outline=STEEL[4], width=2)
    rb(d, cx - 8, Y0 + 2, cx + 8, Y0 + 12, U, 5); d.rectangle([cx - 2, Y0 + 11, cx + 2, Y0 + 16], fill=STEEL[3])  # head rest
    rb(d, X0 + 9, Y0 + 15, X1 - 9, cy - 2, U, 6)                                                               # back
    rb(d, X0 + 9, cy - 1, X1 - 9, cy + int(H * .22), U, 5)                                                     # seat
    for ax in (X0 + 2, X1 - 9): rb(d, ax, cy - 14, ax + 7, cy + int(H * .2), frm, 3)                             # arms
    if era == "mid-century":
        for k in range(Y0 + 19, cy + int(H * .2), 4): d.line([X0 + 10, k, X1 - 10, k], fill=U[1])                # channel tufting
    if era == "great-war": d.rectangle([X0 + 9, Y0 + 15, X1 - 9, Y0 + 18], fill=(236, 236, 230), outline=OUT)   # the enamel head bar
    if per == "V":
        for k in range(Y0 + 20, cy - 4, 7): d.ellipse([cx - 1, k, cx + 1, k + 2], fill=U[0])
        d.line([X0 + 10, cy + int(H * .3), X1 - 10, cy + int(H * .3)], fill=IRON[2], width=4)                     # cast iron foot rest
        for k in range(X0 + 12, X1 - 10, 6): d.ellipse([k, cy + int(H * .3) - 2, k + 3, cy + int(H * .3) + 2], outline=IRON[3])
    else:
        rb(d, cx - 12, cy + int(H * .26), cx + 12, Y1 - 3, STEEL if per != "F" else frm, 3)                       # foot plate
        for k in range(cx - 9, cx + 10, 4): d.line([k, cy + int(H * .27) + 2, k, Y1 - 5], fill=STEEL[1] if per != "F" else frm[1])
    item = c.axis("item", "none")
    if item == "cape": d.polygon([(X0 + 9, Y0 + 15), (X1 - 9, Y0 + 15), (X1 - 4, cy + 10), (X0 + 4, cy + 10)], fill=(214, 214, 206) if c.w % 2 else (60, 70, 110), outline=OUT)
    elif item == "towel": rb(d, X0 + 10, Y0 + 13, X1 - 10, Y0 + 20, WHITE, 2)
    if per == "F": d.line([X0 + 9, cy + int(H * .22), X1 - 9, cy + int(H * .22)], fill=c.glow[1], width=2)
    if c.rich and per in "VW": plate(d, cx - 4, cy + int(H * .22) + 2, BRASS, 8, 3)


reg("barberchair", barberchair, {"floor": ["bare", "check", "tiles", "lino", "boards", "terrazzo"], "pad": ["red", "black", "oxblood", "green", "blue", "tan", "cream"], "make": ["grey", "white", "cream", "black", "red", "green", "blue"],
                                 "item": ["none", "cape", "towel", "none"]},
    "a barber's chair stands about 2 1/2 ft wide and 4 ft long lying back (Koken and Takara Belmont catalogues)", front=True, clear=3, nvar=32)


ART = {"red": (200, 50, 50), "blue": (50, 90, 190), "yellow": (230, 190, 40), "green": (50, 150, 80), "purple": (120, 60, 170),
       "orange": (230, 120, 40), "black": (40, 40, 48), "white": (220, 220, 214), "teal": (40, 150, 150), "pink": (220, 100, 150)}


def arcade(tm, x, y, w, h, st, v, c):
    """An arcade cabinet from above, its back to the wall: the cabinet's top with its marquee box at the back, the
    tilted screen glimpsed below it, and the control panel standing out at the front with its joystick ball and
    bright buttons. Mid-Century: the cabinets of the 1970s and 80s, painted side art in bold colours or wood grain, one
    stick or a trackball or a wheel; Modern: a wide black two-player cabinet; Future Darkness: a dark pod with lit
    edges and a hand-scanner panel. On: the screen and marquee lit, their light on the floor. It stands on bare floor, carpet, linoleum, chequered tiles or boards."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    S = ramp(ART.get(c.axis("art", "red"), (200, 50, 50)), 22)
    if per == "N": S = ramp(mix(S[2], (30, 30, 36), .3), 16)
    if per == "F": S = ramp(mix(COMPOSITE[2], S[2], .85), 14)
    py0 = Y0 + int(H * .6)
    rb(d, X0 + 2, Y0 + 1, X1 - 2, py0, S, 2)                                                                   # the cabinet top
    for k in (X0 + 2, X1 - 6): d.rectangle([k, Y0 + 1, k + 4, py0], fill=S[3] if per != "F" else c.glow[1 if on else 0])   # its side art edges
    d.rectangle([X0 + 6, Y0 + 3, X1 - 6, Y0 + 9], fill=(250, 230, 160) if on else (90, 84, 70), outline=OUT)      # the marquee
    screen(d, X0 + 8, Y0 + 12, X1 - 8, py0 - 3, on, [(20, 20, 60), (90, 200, 250), (250, 250, 120)], "game")
    panel = c.axis("panel", "stick")
    pw = 4 if per == "W" else 1
    rb(d, X0 + pw, py0, X1 - pw, Y1 - 2, ramp((50, 50, 56), 12), 2)                                              # the control panel
    def stick(px_):
        d.ellipse([px_ - 3, py0 + 5, px_ + 3, py0 + 11], fill=(220, 40, 40), outline=OUT); d.point((px_ - 1, py0 + 6), fill=(255, 200, 200))
    bcols = ((250, 220, 40), (60, 140, 240), (240, 60, 60), (60, 200, 90))
    if panel == "trackball": disc(d, cx, py0 + 9, 5, ramp((200, 180, 150), 16))
    elif panel == "wheel": ring(d, cx, py0 + 9, 7, RUBBER, 2)
    elif panel == "gun": d.polygon([(cx - 8, py0 + 6), (cx + 6, py0 + 6), (cx + 6, py0 + 9), (cx - 2, py0 + 9), (cx - 4, py0 + 13), (cx - 8, py0 + 13)], fill=(60, 60, 66), outline=OUT)
    elif panel == "twin" or per == "N":
        for px_ in (X0 + 10, cx + 4): stick(px_); [d.ellipse([px_ + 6 + k * 4, py0 + 6, px_ + 9 + k * 4, py0 + 9], fill=bcols[k]) for k in range(2)]
    else:
        stick(X0 + 12); [d.ellipse([cx + k * 5, py0 + 6, cx + 3 + k * 5, py0 + 9], fill=bcols[k]) for k in range(3)]
    if per == "F": d.rectangle([X0 + 8, py0 + 4, X1 - 8, Y1 - 5], fill=S[3], outline=S[4])    # the hand-scanner plate
    if per == "N": d.rectangle([X0 + 6, Y0 + 10, X1 - 6, py0 - 1], outline=S[4], width=2)                         # the bright bezel
    if on: return [(cx, Y1 + 6, 34, (1.1, 1.2, 1.5))]


reg("arcade", arcade, {"floor": ["bare", "carpet", "lino", "check", "boards"], "art": list(ART)[:8], "panel": ["stick", "twin", "trackball", "wheel", "gun"]},
    "an upright arcade cabinet is 2 to 2 1/2 ft wide and about 3 ft deep with its control panel (Atari, Midway and Sega cabinet drawings)",
    metal=False, front=True, clear=3, mount="wall", states=("off", "on"), nvar=48)


def pinball(tm, x, y, w, h, st, v, c):
    """A pinball table from above, the player's end to the south: the glass over the bright playfield, the flippers at
    the foot, the round pop bumpers, lanes and slingshots, the plunger lane down the right, and the backbox standing
    at the head. Mid-Century: a 1930s bagatelle of pins and pockets on legs with no flippers, or from 1947 a flipper
    game of pop bumpers and painted art; Modern: a wider body with ramps and a dot-matrix display in the backbox;
    Future Darkness: a dark table with a lit playfield. On: the lamps lit under the glass and in the backbox."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"; rng = np.random.default_rng(_seed(v))
    A = ramp(ART.get(c.axis("art", "blue"), (50, 90, 190)), 20); Cb = ramp(LIV.get(c.make, (40, 40, 46)), 18)
    if per == "F": Cb = ramp(mix(COMPOSITE[2], Cb[2], .6), 14); A = ramp(mix(A[2], (20, 20, 30), .4), 18)
    early = per == "W" and c.axis("game", "flipper") == "bagatelle"
    rb(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, Cb, 3)                                                                # the cabinet
    rb(d, X0 + 1, Y0, X1 - 1, Y0 + 12, Cb, 2)                                                                  # the backbox at the head
    if per in "NF": screen(d, X0 + 10, Y0 + 3, X1 - 10, Y0 + 9, on, [(40, 20, 0), (250, 130, 30), (255, 220, 120)], "lines")
    else: d.rectangle([X0 + 6, Y0 + 3, X1 - 6, Y0 + 9], fill=A[3] if on else A[1], outline=OUT)
    px0, py0, px1, py1 = X0 + 6, Y0 + 15, X1 - 10, Y1 - 6
    d.rectangle([px0, py0, px1, py1], fill=A[2], outline=OUT)                                                   # the playfield
    for k in range(3): d.ellipse([px0 + 4 + k * 10, py0 + 30 + k * 6, px0 + 20 + k * 10, py0 + 46 + k * 6], fill=A[3 if k % 2 else 1])   # painted art
    d.rectangle([px1 + 1, py0 + 20, X1 - 5, py1], fill=(30, 30, 34), outline=OUT); d.rectangle([px1 + 2, py1 - 8, X1 - 6, py1 - 1], fill=STEEL[3])   # plunger lane
    if early:
        for _ in range(26):
            qx, qy = rng.uniform(px0 + 3, px1 - 3), rng.uniform(py0 + 4, py1 - 14); d.rectangle([qx, qy, qx + 1, qy + 1], fill=STEEL[4])
        for k in range(4): d.arc([px0 + 3 + k * 7, py1 - 12, px0 + 9 + k * 7, py1 - 6], 0, 180, fill=(240, 220, 120), width=2)
    else:
        for bx, by in ((cx - 8, py0 + 12), (cx + 4, py0 + 10), (cx - 2, py0 + 22)):
            d.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=(250, 240, 200) if on else (190, 180, 160), outline=OUT); d.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(240, 60, 60))
        for sx in (px0 + 3, px1 - 9): d.polygon([(sx, py1 - 24), (sx + 6, py1 - 14), (sx, py1 - 14)], fill=(250, 250, 240), outline=OUT)
        d.polygon([(cx - 13, py1 - 10), (cx - 3, py1 - 5), (cx - 4, py1 - 3), (cx - 14, py1 - 8)], fill=(240, 240, 230), outline=OUT)   # flippers
        d.polygon([(cx + 13, py1 - 10), (cx + 3, py1 - 5), (cx + 4, py1 - 3), (cx + 14, py1 - 8)], fill=(240, 240, 230), outline=OUT)
        if per in "NF": d.arc([px0 + 2, py0 + 26, px1 - 2, py0 + 60], 200, 340, fill=(200, 220, 240) if per == "N" else c.glow[1], width=3)   # a ramp
    if on:
        for _ in range(10):
            qx, qy = rng.uniform(px0 + 3, px1 - 4), rng.uniform(py0 + 30, py1 - 16); d.ellipse([qx, qy, qx + 3, qy + 3], fill=(255, 230, 120))
    d.ellipse([cx + 6, py1 - 20, cx + 9, py1 - 17], fill=STEEL[4], outline=OUT)                                  # the ball
    a = np.asarray(tm.img).astype(np.float32); sl = (slice(py0, py1 + 1), slice(px0, px1 + 1))                    # the glass
    a[sl] = a[sl] * .9 + 255 * .06; tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
    d.line([px0 + 4, py1 - 4, px0 + 14, py0 + 30], fill=(230, 240, 250))
    if c.rich: chrome_edge(d, X0 + 2, Y1 - 6, X1 - 2, Y1 - 2)
    if on: return [(cx, cy, 40, (1.2, 1.15, 1.4))]


reg("pinball", pinball, {"art": list(ART)[:7], "make": ["black", "red", "blue", "maroon", "cream", "silver", "green"], "game": ["flipper", "bagatelle", "flipper"]},
    "a pinball table is about 2 1/2 ft wide and 4 1/2 to 5 ft long with its backbox (Gottlieb, Bally and Williams cabinet drawings)",
    metal=False, front=True, clear=3, states=("off", "on"), nvar=24)


def slotmachine(tm, x, y, w, h, st, v, c):
    """A slot machine from above, its back to the wall: the cabinet's top, the reel window sloping toward the player,
    the handle on its arm at the right side and the coin tray at the front. Victorian and Great War: a cast-iron or
    oak cabinet of three reels with ornate cresting (Fey's Liberty Bell), then by the Great War the Mills bell with its
    round jackpot window on top and a mint vendor at the side; Mid-Century: the rounded coloured casting of the
    one-armed bandit with a chrome band and a deep payout tray; Modern: a video slot with its screen and button deck; Future Darkness: a
    dark slab with a lit screen. A cup of coins or a drink may stand on it. On: the lamps and the reels or screen lit. It stands on bare floor, carpet, chequered tiles, linoleum or boards."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; era = c.era; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    B = ramp(LIV.get(c.make, (178, 42, 38)), 20)
    if per == "V": B = ramp(mix(c.wood[2], B[2], .75), 18)
    elif era == "great-war": B = ramp(mix((70, 70, 76), B[2], .75), 16)
    elif per == "F": B = ramp(mix(COMPOSITE[2], B[2], .6), 14)
    if era == "mid-century": d.rounded_rectangle([X0 + 3, Y0 + 1, X1 - 8, Y1 - 4], 9, fill=B[2], outline=OUT); d.line([X0 + 8, Y0 + 3, X1 - 13, Y0 + 3], fill=B[4])   # the rounded casting
    else: rb(d, X0 + 3, Y0 + 1, X1 - 8, Y1 - 4, B, 3)                                                          # the cabinet
    if era == "great-war":                                                                                     # the round jackpot window on its top, and the mint vendor at the side
        d.ellipse([cx - 12, Y0 + 2, cx + 4, Y0 + 14], fill=(200, 210, 214), outline=OUT); d.ellipse([cx - 8, Y0 + 5, cx, Y0 + 11], fill=BRASS[3])
        rb(d, X0, cy + 6, X0 + 8, Y1 - 6, STEEL, 1)
    if era == "mid-century":                                                                                   # a chrome band across its face and a deep payout tray
        d.rectangle([X0 + 3, cy + 4, X1 - 8, cy + 8], fill=STEEL[4], outline=OUT)
        rb(d, X0 + 4, Y1 - 14, X1 - 9, Y1 - 4, STEEL, 2)
    if per == "V":
        for k in range(X0 + 6, X1 - 10, 5): d.ellipse([k, Y0 + 3, k + 3, Y0 + 6], fill=(BRASS if per == "V" else STEEL)[3])   # the ornate cresting
    if per == "F":                                                                                             # a tall curved screen over the whole face, lit at its edge
        L_ = ramp(LIV.get(c.make, (178, 42, 38)), 20)
        d.rounded_rectangle([X0 + 5, Y0 + 4, X1 - 10, Y1 - 8], 6, fill=(16, 16, 22) if not on else mix(L_[2], (20, 20, 30), .4), outline=L_[3], width=2)
        d.line([X0 + 8, Y0 + 7, X0 + 8, Y1 - 11], fill=L_[4])
    elif per == "N":
        screen(d, X0 + 6, Y0 + 6, X1 - 11, cy + 2, on, [(30, 10, 40), (200, 80, 220), (255, 230, 120)] if per == "N" else c.glow, "lines")
        rb(d, X0 + 5, cy + 5, X1 - 10, Y1 - 8, ramp((40, 40, 46), 10), 2)
        for k in range(4): lamp(d, X0 + 9 + k * 5, cy + 9, 2, on, ((250, 60, 60), (250, 200, 40), (60, 200, 90), (60, 140, 240))[k])
    else:
        ry0 = Y0 + 9 if per == "V" else (Y0 + 16 if era == "great-war" else Y0 + 6)
        rb(d, X0 + 6, ry0, X1 - 11, cy + 2, ramp((40, 40, 46), 10), 1)                                           # the reel window
        for k in range(3):
            rx = X0 + 8 + k * ((X1 - X0 - 21) // 3)
            d.rectangle([rx, ry0 + 2, rx + (X1 - X0 - 21) // 3 - 2, cy], fill=(240, 236, 220) if on else (180, 176, 160))
            d.ellipse([rx + 1, cy - 8, rx + 5, cy - 4], fill=((220, 40, 40), (240, 200, 40), (60, 150, 60))[(k + c.w) % 3])
        if era != "mid-century": d.rectangle([X0 + 6, Y1 - 10, X1 - 11, Y1 - 6], fill=STEEL[2] if per != "V" else BRASS[2], outline=OUT)      # the payout cup
    if per != "F": d.line([X1 - 7, cy + 2, X1 - 2, Y0 + 6], fill=STEEL[3], width=3); disc(d, X1 - 3, Y0 + 5, 4, ramp((220, 40, 40), 18) if per != "V" else ramp((40, 30, 30), 12))   # the handle
    top = c.axis("top", "none")
    if top == "coins": d.ellipse([X0 + 4, Y1 - 12, X0 + 12, Y1 - 5], fill=(220, 220, 214), outline=OUT); d.ellipse([X0 + 6, Y1 - 10, X0 + 10, Y1 - 7], fill=BRASS[3])
    elif top == "drink": d.ellipse([X1 - 16, Y1 - 12, X1 - 9, Y1 - 5], fill=(180, 200, 210), outline=OUT); d.ellipse([X1 - 14, Y1 - 10, X1 - 11, Y1 - 7], fill=(160, 90, 30))
    if c.rich: chrome_edge(d, X0 + 3, Y0 + 1, X1 - 8, Y1 - 4, STEEL if per != "V" else BRASS)
    if on: return [(cx, Y1 + 4, 26, (1.4, 1.2, 1.0))]


reg("slotmachine", slotmachine, {"floor": ["bare", "carpet", "check", "lino", "boards"], "make": ["red", "green", "blue", "maroon", "cream", "black", "orange", "yellow", "teal", "white"], "top": ["none", "coins", "drink", "none", "coins"]},
    "a slot machine stands about 1 1/2 to 2 ft wide and deep on its stand (Mills and Bally catalogues; IGT cabinet drawings)",
    front=True, clear=2.5, mount="wall", states=("off", "on"), nvar=40)


def _deck(d, cx, cy, r, on, kind, col):
    """A turntable or a CD deck from above: the platter and record, the tone arm, or the jog wheel and its screen."""
    if kind == "cdj":
        rb(d, cx - r - 4, cy - r - 6, cx + r + 4, cy + r + 4, ramp((50, 52, 58), 10), 2)
        ring(d, cx, cy + 1, r - 1, STEEL, 2); disc(d, cx, cy + 1, r - 4, ramp((40, 40, 46), 10))
        d.rectangle([cx - 6, cy - r - 4, cx + 6, cy - r], fill=(80, 200, 240) if on else (20, 24, 30))
        return
    rb(d, cx - r - 4, cy - r - 4, cx + r + 6, cy + r + 4, ramp((176, 180, 186), 14) if kind == "silver" else ramp((40, 40, 46), 10), 2)
    disc(d, cx, cy, r, ramp((30, 30, 34), 8)); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=(56, 56, 62))
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=col)
    if on: d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 200, 250, fill=(140, 140, 150), width=2)
    d.line([cx + r + 3, cy - r, cx + r - 2, cy + r - 6, cx + 2, cy + r - 2], fill=STEEL[4], width=2)            # the tone arm


def djbooth(tm, x, y, w, h, st, v, c):
    """A DJ booth from above, its back to the wall and the DJ's side to the north: a counter faced in the club's colour
    with two decks and the mixer between them, crates of records or a laptop, a lamp. Mid-Century: two silver or black
    turntables of the disco years, a rotary mixer and crates of vinyl; Modern: turntables or CD decks either side of a
    channel mixer, a laptop and headphones; Future Darkness: a dark slab with lit control surfaces. On: the platters
    turning, the mixer's lights and the booth's coloured light thrown on the floor. It stands on bare floor, carpet, boards, chequer plate or linoleum."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    F = ramp(ART.get(c.axis("facing", "black"), (40, 40, 48)), 18)
    if per == "F": F = ramp(mix(COMPOSITE[2], F[2], .75), 14)
    rb(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, F, 3)                                                                # the counter, its facing round it
    d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 10], fill=(28, 28, 32), outline=OUT)                               # the desk top
    gear = c.axis("gear", "black")
    kind = "cdj" if per in "NF" and gear == "cdj" else ("silver" if gear == "silver" else "black")
    col = ramp(ART.get(c.axis("facing", "black"), (40, 40, 48)), 20)[3]
    r = min(14, (Y1 - Y0) // 2 - 9)
    for dx in (X0 + 6 + r + 4, X1 - 8 - r - 4): _deck(d, dx, Y0 + 6 + r + 2, r, on, kind, col)
    mx0, mx1 = cx - 10, cx + 10                                                                               # the mixer
    rb(d, mx0, Y0 + 6, mx1, Y1 - 12, ramp((60, 62, 68), 10), 2)
    for k in range(mx0 + 4, mx1 - 2, 5):
        d.line([k, Y0 + 12, k, Y1 - 18], fill=(20, 20, 24)); d.rectangle([k - 1, Y0 + 18 + (k * 3) % 8, k + 1, Y0 + 20 + (k * 3) % 8], fill=STEEL[4])
        if on: d.rectangle([k - 1, Y0 + 8, k + 1, Y0 + 10], fill=((90, 220, 90), (250, 200, 40), (250, 60, 60))[(k // 5) % 3])
    if per in "NF" and c.w >= 3: rb(d, X1 - 40, Y1 - 12, X1 - 18, Y1 - 3, ramp((190, 192, 196), 10), 2); screen(d, X1 - 38, Y1 - 11, X1 - 20, Y1 - 6, on, c.glow)   # a laptop
    if per == "W":
        for k in range(3): rb(d, X0 + 4 + k * 14, Y1 - 10, X0 + 16 + k * 14, Y1 - 2, ramp((140, 100, 60), 14), 1)   # record crates
    ring(d, cx + 18, Y1 - 6, 4, RUBBER, 2)                                                                     # headphones
    if per == "F": d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=c.glow[1 if on else 0], width=2)
    if c.rich and per != "F": chrome_edge(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1)
    if on:
        g = tuple(1.0 + .5 * (v_ / 255) for v_ in col)
        return [(cx, Y1 + 10, 60, g)]


reg("djbooth", djbooth, {"floor": ["bare", "carpet", "boards", "plate", "lino"], "facing": list(ART)[:7], "gear": ["black", "silver", "cdj", "black", "cdj"]},
    "a DJ booth is a counter 5 to 7 ft long and 2 1/2 to 3 ft deep holding two decks and a mixer (Technics SL-1200 and club fit-out drawings)",
    front=True, clear=3, mount="wall", states=("off", "on"), nvar=48)


def speakers(tm, x, y, w, h, st, v, c):
    """A loudspeaker cabinet from above, its baffle tilted up as a stage wedge so the round drivers show: one big cone
    and a tweeter, two cones, a column of small cones, or a horn over a cone, in a box with steel corners and side
    handles and its covering round the edge. Mid-Century: tolex-covered cabinets with
    piping, or wood veneer, a radial horn of the 1960s and 70s; Modern: black flight-case cabinets with steel corners
    and a bass bin under a top box; Future Darkness: dark rounded pods with lit rings. On: the cones shaking and the
    power lamp lit."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; on = st == "on"
    cov = c.axis("cover", "black")
    Cc = {"black": ramp((40, 40, 44), 12), "veneer": ramp((150, 100, 60), 18), "white": ramp((214, 212, 204), 10), "grey": ramp((110, 112, 118), 12),
          "brown": ramp((100, 70, 50), 14), "blue": ramp((50, 70, 120), 14), "red": ramp((140, 40, 40), 16)}[cov]
    if per == "F": Cc = ramp(mix(COMPOSITE[2], Cc[2], .75), 14)
    rb(d, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, Cc, 2 if per != "F" else 8)                                            # the cabinet top
    if per == "W" and cov != "veneer": d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=(214, 210, 196))     # its piping
    if per == "N":                                                                                             # a flight case's aluminium edging and dish handle
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=STEEL[3], width=4); d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=OUT)
        d.rectangle([cx - 7, Y0 + 6, cx + 7, Y0 + 12], fill=STEEL[2], outline=OUT); d.line([cx - 5, Y0 + 9, cx + 5, Y0 + 9], fill=OUT, width=2)
    if per != "F":
        for kx, ky in ((X0 + 1, Y0 + 1), (X1 - 5, Y0 + 1), (X0 + 1, Y1 - 5), (X1 - 5, Y1 - 5)): d.rectangle([kx, ky, kx + 4, ky + 4], fill=STEEL[3], outline=OUT)
        for kx in (X0 + 2, X1 - 4): d.rectangle([kx, cy - 4, kx + 2, cy + 4], fill=(20, 20, 24))
    d.rectangle([X0 + 3, Y1 - 6, X1 - 3, Y1 - 2], fill=(26, 26, 30)); [d.point((k, Y1 - 4), fill=(70, 70, 76)) for k in range(X0 + 4, X1 - 3, 2)]   # the grille's edge
    stack = c.axis("stack", "horn")
    def cone(x_, y_, r_):                                                                                      # a driver: dark surround, cone and dust cap
        r_ = r_ + (1 if on else 0)
        d.ellipse([x_ - r_, y_ - r_, x_ + r_, y_ + r_], fill=(24, 24, 28), outline=OUT); d.ellipse([x_ - r_ + 2, y_ - r_ + 2, x_ + r_ - 2, y_ + r_ - 2], fill=(58, 58, 64))
        d.ellipse([x_ - r_ // 3, y_ - r_ // 3, x_ + r_ // 3, y_ + r_ // 3], fill=(90, 90, 96), outline=OUT); d.arc([x_ - r_ + 2, y_ - r_ + 2, x_ + r_ - 2, y_ + r_ - 2], 160, 250, fill=(110, 110, 118))
    R_ = (min(W, H) - 12) // 2
    if stack == "horn":                                                                                        # a horn above a big cone
        cone(cx, cy + 5, R_ - 5)
        d.polygon([(cx - 10, Y0 + 4), (cx + 10, Y0 + 4), (cx + 4, Y0 + 11), (cx - 4, Y0 + 11)], fill=(30, 30, 34), outline=OUT)
    elif stack == "top":                                                                                       # two cones side by side
        for k in (-1, 1): cone(cx + k * (R_ // 2 + 1), cy, R_ // 2)
    elif stack == "column":                                                                                    # a column of small cones
        for k in range(3): cone(cx, Y0 + 9 + k * ((H - 18) // 3), max(4, (H - 18) // 6))
    else:
        cone(cx, cy - 1, R_); d.ellipse([X1 - 12, Y0 + 4, X1 - 6, Y0 + 10], fill=(30, 30, 34), outline=OUT)      # one big cone and a tweeter
    lamp(d, X1 - 7, Y1 - 9, 2, on, (90, 220, 90) if per != "W" else (250, 60, 40))
    if per == "F": d.ellipse([cx - 9, cy - 11, cx + 9, cy + 7], outline=c.glow[1 if on else 0], width=2)
    if on:
        for k in (3, 6): d.arc([cx - 10 - k, cy - 12 - k, cx + 10 + k, cy + 8 + k], 60, 120, fill=(200, 200, 210))


reg("speakers", speakers, {"cover": ["black", "veneer", "white", "grey", "brown", "blue", "red"], "stack": ["horn", "top", "cone", "column", "top"]},
    "a speaker cabinet or a bass bin with its top box stands about 2 ft square (Vox, Marshall, JBL and Martin Audio cabinet drawings)",
    metal=False, front=True, clear=2, states=("off", "on"), nvar=32)


def treadmill(tm, x, y, w, h, st, v, c):
    """A treadmill from above, its console at the north end and the belt running back to the south, where the runner
    steps on: the motor hood under the console, the hand rails each side, the dark belt between side decks. Modern: a
    grey or black gym treadmill with a small screen and a cup holder; Future Darkness: a curved self-powered deck (or a broad one of lit slats) with
    no motor hood, lit rails and a broad screen, a towel, a phone or bottles at its screen foot. A towel or a water bottle may lie on it. On: the screen lit and the
    belt moving. It stands on bare floor, a rubber mat, carpet, linoleum or boards."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per; on = st == "on"
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    F = ramp(LIV.get(c.make, (60, 62, 68)), 16)
    if per == "F": F = ramp(mix(COMPOSITE[2], F[2], .75), 14)
    if per == "F":                                                                                             # a curved self-powered deck, no motor hood, a broad screen
        d.rounded_rectangle([X0 + 1, Y0 + 2, X1 - 1, Y1 - 2], 16, fill=F[2], outline=OUT)
        if c.axis("deck", "curved") == "slat":                                                                  # a broad deck of lit slats
            d.rectangle([X0 + 8, Y0 + 20, X1 - 8, Y1 - 8], fill=(26, 26, 30), outline=OUT)
            for k in range(Y0 + 24, Y1 - 10, 6): d.line([X0 + 10, k, X1 - 10, k], fill=c.glow[0], width=2)
        else:
            d.rounded_rectangle([X0 + 14, Y0 + 20, X1 - 14, Y1 - 8], 10, fill=(26, 26, 30), outline=OUT)
            for k in range(Y0 + 24, Y1 - 10, 4): d.line([X0 + 16, k, X1 - 16, k], fill=(44, 44, 50))
        screen(d, X0 + 6, Y0 + 5, X1 - 6, Y0 + 15, on, c.glow, "trace")
        for k in (X0 + 4, X1 - 5): d.line([k, Y0 + 20, k, Y1 - 14], fill=c.glow[1 if on else 0], width=2)
        if c.axis("item", "none") in ("towel", "phone"): d.rectangle([cx - 10, Y0 + 16, cx + 10, Y0 + 19], fill=(220, 220, 214) if c.axis("item", "none") == "towel" else (20, 20, 24), outline=OUT)   # a towel or phone across the screen foot
        elif c.axis("item", "none") == "bottle": [d.ellipse([k - 3, Y0 + 15, k + 3, Y0 + 21], fill=(90, 160, 220), outline=OUT) for k in (X0 + 9, X1 - 9)]   # bottles in both holders
        if on: return [(cx, Y0 + 10, 22, COOL)]
        return
    rb(d, X0 + 3, Y0 + 2, X1 - 3, Y1 - 2, F, 4)                                                                # the deck and frame
    rb(d, X0 + 1, Y0 + 2, X1 - 1, Y0 + 26, ramp(mix(F[2], (40, 40, 44), .4), 12), 5)                             # the motor hood and console
    screen(d, cx - 12, Y0 + 6, cx + 12, Y0 + 17, on, [(10, 30, 40), (60, 200, 240), (220, 250, 255)] if per == "N" else c.glow, "trace")
    for k in range(3): lamp(d, cx - 6 + k * 6, Y0 + 21, 1, on, ((90, 220, 90), (250, 200, 40), (250, 60, 60))[k])
    for k in (X0 + 1, X1 - 5): d.rectangle([k, Y0 + 26, k + 4, Y0 + int(H * .45)], fill=STEEL[3] if per != "F" else c.glow[1 if on else 0], outline=OUT)   # hand rails
    bx0, bx1 = X0 + 10, X1 - 10
    d.rectangle([bx0, Y0 + 28, bx1, Y1 - 6], fill=(30, 30, 34), outline=OUT)                                    # the belt
    for k in range(Y0 + 32, Y1 - 8, 5 if not on else 3): d.line([bx0 + 1, k, bx1 - 1, k], fill=(40, 40, 46) if not on else (54, 54, 60))
    d.rectangle([bx0 + 2, Y1 - 10, bx1 - 2, Y1 - 7], fill=STEEL[2])                                              # the rear roller cap
    item = c.axis("item", "none")
    if item == "towel": d.polygon([(X0 + 2, Y0 + 10), (X0 + 16, Y0 + 8), (X0 + 18, Y0 + 26), (X0 + 4, Y0 + 28)], fill=(220, 220, 214) if c.w % 2 else (60, 100, 160), outline=OUT)
    elif item == "bottle": d.ellipse([X1 - 12, Y0 + 6, X1 - 4, Y0 + 14], fill=(90, 160, 220), outline=OUT); d.ellipse([X1 - 10, Y0 + 8, X1 - 6, Y0 + 12], fill=(230, 230, 240))
    elif item == "phone": d.rectangle([cx + 14, Y0 + 7, cx + 20, Y0 + 17], fill=(20, 20, 24), outline=OUT)
    if on: return [(cx, Y0 + 12, 22, COOL)]


reg("treadmill", treadmill, {"floor": ["bare", "mat", "carpet", "lino", "boards"], "make": ["black", "grey", "silver", "blue", "red", "white", "teal"], "item": ["none", "towel", "bottle", "phone", "none"], "deck": ["curved", "slat"]},
    "a treadmill is about 2 1/2 to 3 ft wide and 6 to 7 ft long (Life Fitness and Precor specification sheets)",
    front=True, clear=3, states=("off", "on"), nvar=48)


PLATE = {"iron": ramp((60, 60, 66), 14), "bumper": ramp((40, 40, 44), 10), "chrome": STEEL, "red": ramp((170, 40, 40), 16), "blue": ramp((50, 80, 160), 16),
         "green": ramp((60, 130, 70), 16), "yellow": ramp((210, 180, 40), 16)}


def weightbench(tm, x, y, w, h, st, v, c):
    """A weight bench from above, the uprights at the north end with the barbell across them, the padded bench running
    south, plates stacked on the floor beside. Mid-Century: a steel-tube bench with a vinyl pad, cast-iron plates;
    Modern: a black padded bench, a chrome bar and coloured rubber bumper plates; Future Darkness: a dark moulded
    bench on a sensor floor plate with lit plate collars. Mid-Century lifters set the bar on two loose A-frame stands.
    A rubber mat or a wooden lifting platform may lie under it; its load may be light or heavy."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); per = c.per
    pad = LEATHER.get(c.axis("pad", "black"), LEATHER["black"])
    if per == "W" and c.axis("pad", "black") == "white": pad = LEATHER["cream"]                                     # mid-century white vinyl was a cream
    pk = c.axis("plates", "iron")
    if per == "W": pk = {"red": "iron", "blue": "chrome", "green": "iron", "yellow": "chrome", "bumper": "iron"}.get(pk, pk)   # cast iron before bumper plates
    P = PLATE.get(pk, PLATE["iron"])
    if per == "F": P = ramp(mix(COMPOSITE[2], P[2], .6), 14)
    frm = (ramp((70, 72, 76), 12) if per == "W" else STEEL) if per != "F" else c.comp
    floor = c.axis("floor", "none")
    if per == "F":                                                                                             # a sensor floor plate, plain, ribbed or edged in wood
        rb(d, X0, Y0 + 8, X1, Y1, ramp(mix(COMPOSITE[2], c.wood[2] if floor == "platform" else pad[2], .3 if floor != "platform" else .6), 12), 6); d.rounded_rectangle([X0 + 3, Y0 + 11, X1 - 3, Y1 - 3], 5, outline=c.glow[0])
        if floor == "mat": [d.line([X0 + 5, k, X1 - 5, k], fill=c.glow[0]) for k in range(Y0 + 40, Y1 - 6, 12)]
    elif per == "W" and floor == "none": rb(d, X0, Y0 + 10, X1, Y1, ramp((176, 150, 100), 10), 1); [d.line([X0 + 1, k, X1 - 1, k], fill=(150, 126, 84)) for k in range(Y0 + 14, Y1, 4)]   # a coir mat
    elif floor == "mat": rb(d, X0, Y0 + 10, X1, Y1, RUBBER, 1); [d.line([X0 + 1, k, X1 - 1, k], fill=RUBBER[1]) for k in range(Y0 + 30, Y1, 20)]
    elif floor == "platform":
        rb(d, X0, Y0 + 4, X1, Y1, c.wood, 1); [d.line([X0 + 1, k, X1 - 1, k], fill=c.wood[1]) for k in range(Y0 + 12, Y1, 7)]
        if per != "W": rb(d, X0 + 14, Y0 + 8, X1 - 14, Y1 - 4, RUBBER, 1)
    if per == "W":                                                                                             # mid-century: two loose A-frame stands
        for k in (cx - 26, cx + 20): d.line([k, Y0 + 10, k + 3, Y0 + 18], fill=OUT, width=5); d.line([k + 6, Y0 + 10, k + 3, Y0 + 18], fill=OUT, width=5); d.line([k, Y0 + 10, k + 6, Y0 + 10], fill=frm[2], width=3); disc(d, k + 3, Y0 + 18, 3, frm)
    else:
        for k in (cx - 22, cx + 16): rb(d, k, Y0 + 14, k + 6, Y0 + 34, frm, 1)                                   # the rack uprights
        rb(d, cx - 22, Y0 + 30, cx + 22, Y0 + 36, frm, 1)
        if per == "N": [d.rectangle([k, Y0 + 22, k + 6, Y0 + 25], fill=HAZ[0], outline=OUT) for k in (cx - 28, cx + 22)]   # the spotter arms
    pw = 9 if per != "W" else 6
    if per == "W": d.rectangle([cx - pw, Y0 + 26, cx + pw, Y1 - 10], fill=pad[2], outline=OUT); d.line([cx, Y0 + 28, cx, Y1 - 12], fill=pad[1])   # the vinyl pad, buttoned down its middle
    else: rb(d, cx - pw, Y0 + 26, cx + pw, Y1 - 10, pad, 5)                                                    # the pad
    d.rectangle([cx - 3, Y1 - 10, cx + 3, Y1 - 4], fill=frm[2], outline=OUT); d.rectangle([cx - 12, Y1 - 6, cx + 12, Y1 - 3], fill=frm[2], outline=OUT)
    by = Y0 + 18
    d.line([X0 + 2, by, X1 - 2, by], fill=OUT, width=4); d.line([X0 + 2, by, X1 - 2, by], fill=STEEL[4], width=2)   # the bar
    n = {"light": 1, "heavy": 3, "mid": 2}.get(c.axis("load", "mid"), 2)
    for sgn in (-1, 1):
        for k in range(n):
            px_ = cx + sgn * (W // 2 - 4 - (n - 1 - k) * 5)
            r = 13 - k * 2
            d.rectangle([px_ - 2, by - r, px_ + 2, by + r], fill=P[2 + k % 2], outline=OUT); d.line([px_ - 1, by - r + 1, px_ - 1, by + r - 1], fill=P[4])
    for sx_ in (X0 + 12, X1 - 12):                                                                             # spare plates on the floor, a stack each side
        for k in range(2): disc(d, sx_, Y1 - 30 + k * 4, 10 - k * 2, P)
        d.ellipse([sx_ - 2, Y1 - 28, sx_ + 2, Y1 - 24], fill=OUT)
    if per == "F":
        for sgn in (-1, 1): d.line([cx + sgn * 27, by - 8, cx + sgn * 27, by + 8], fill=c.glow[1], width=2)


reg("weightbench", weightbench, {"pad": ["black", "red", "blue", "oxblood", "tan", "green", "white"], "plates": list(PLATE), "load": ["mid", "light", "heavy"], "floor": ["none", "mat", "platform", "none"]},
    "a flat bench with its rack and an Olympic bar takes about 4 by 6 ft, the bar 7 ft long (York and Rogue catalogues)", front=True, clear=2, nvar=32)


def punchbag(tm, x, y, w, h, st, v, c):
    """A punching bag from above, hanging from the ceiling: the round top of the bag with its stitched seams, the
    swivel and the chains running up to it, a mat beneath. Victorian and Great War: a stitched brown leather or canvas
    bag stuffed with sawdust and rags; Mid-Century: red or black leather; Modern: vinyl in the maker's colour with a
    taped band; Future Darkness: a dark synthetic bag with a lit ring. It hangs from a beam in Victorian days, from an
    iron wall bracket in the Great War, from a steel ceiling plate in Modern times, over boards, sawdust, canvas,
    rubber or foam tiles as the age has it. Kinds: a heavy bag, a teardrop or a speed bag
    under its round board. It stands on bare floor, a mat, boards, carpet or concrete."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; era = c.era
    floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "bare"))                                     # what it stands on
    L = LEATHER.get(c.axis("pad", "red"), LEATHER["red"])
    if per == "V": L = ramp(mix(L[2], (150, 110, 70), .5), 16)
    elif era == "great-war": L = ramp(mix(L[2], (196, 184, 150), .55), 12)                                     # canvas
    if per == "F": L = ramp(mix(COMPOSITE[2], L[2], .6), 14)
    mats = ["none", "rubber", "canvas", "foam", "none"]
    mi = mats.index(c.axis("mat", "none")) if c.axis("mat", "none") in mats else 0
    mat = {"V": ["boards", "sawdust", "boards", "canvas", "none"], "great-war": ["canvas", "boards", "none", "sawdust", "canvas"],
           "mid-century": ["rubber", "canvas", "none", "rubber", "boards"], "N": ["foam", "rubber", "tiles", "none", "tiles"]}.get(per if per in "VN" else era, mats)[mi]
    if mat == "boards": rb(d, X0, Y0, X1, Y1, c.wood, 0); [d.line([X0, k, X1, k], fill=c.wood[1]) for k in range(Y0 + 6, Y1, 7)]
    elif mat == "sawdust": d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=(206, 180, 130), outline=(170, 146, 100))
    elif mat == "tiles":
        for i, kx in enumerate(range(X0, X1, (X1 - X0) // 2 + 1)):
            for j, ky in enumerate(range(Y0, Y1, (Y1 - Y0) // 2 + 1)): d.rectangle([kx, ky, kx + (X1 - X0) // 2, ky + (Y1 - Y0) // 2], fill=((40, 40, 44), (170, 40, 40), (50, 80, 150))[c.w % 3], outline=OUT)
    if mat == "rubber": rb(d, X0, Y0, X1, Y1, RUBBER, 1)
    elif mat == "canvas": rb(d, X0, Y0, X1, Y1, ramp((196, 186, 160), 10), 1)
    elif mat == "foam": rb(d, X0, Y0, X1, Y1, ramp((60, 90, 150), 14), 1); d.line([cx, Y0 + 1, cx, Y1 - 1], fill=OUT)
    kind = c.axis("kind", "heavy")
    if per == "V": d.rectangle([X0, cy - 5, X1, cy + 5], fill=c.wood[2], outline=OUT); d.line([X0, cy - 3, X1, cy - 3], fill=c.wood[4])   # the beam it hangs from
    elif era == "great-war": d.line([cx, Y0, cx, cy], fill=OUT, width=6); d.line([cx, Y0, cx, cy], fill=IRON[2], width=4)                # an iron wall bracket
    elif per == "N" and kind != "speed": rb(d, cx - 9, cy - 9, cx + 9, cy + 9, STEEL, 1)                                                     # a ceiling mount plate
    if kind == "speed":
        d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=c.wood[2], outline=OUT); d.ellipse([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], outline=c.wood[1])   # the rebound board
        disc(d, cx, cy + 4, 6, L)
    else:
        r = int(min(W, H) * (.36 if kind == "heavy" else .3))
        disc(d, cx, cy, r, L)
        for a_ in (0, 90, 180, 270): d.line([cx + math.cos(math.radians(a_)) * 4, cy + math.sin(math.radians(a_)) * 4, cx + math.cos(math.radians(a_)) * (r - 2), cy + math.sin(math.radians(a_)) * (r - 2)], fill=L[1])
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=L[1])
        if per == "N" and kind == "heavy": d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=(220, 220, 214), width=2)
        if per == "F": d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=c.glow[1], width=2)
        for a_ in (45, 135, 225, 315): d.line([cx, cy, cx + math.cos(math.radians(a_)) * (r - 4), cy + math.sin(math.radians(a_)) * (r - 4)], fill=STEEL[3])   # the chains
        disc(d, cx, cy, 4, STEEL)                                                                               # the swivel


reg("punchbag", punchbag, {"floor": ["bare", "mat", "boards", "carpet", "concrete"], "pad": ["red", "black", "tan", "blue", "oxblood", "green", "white"], "kind": ["heavy", "teardrop", "speed", "heavy"], "mat": ["none", "rubber", "canvas", "foam", "none"]},
    "a heavy bag is 12 to 16 in across, hung over a floor space about 2 ft square (Everlast catalogues)", metal=False, mount="on", nvar=24)


# ================================================================ security and war
COPPER = ramp((184, 104, 60), 22)
EARTH, TURF, BRICK, CONCRETE, BAMBOO, CLAY = (118, 94, 68), (84, 104, 62), (156, 74, 54), (168, 166, 158), (196, 178, 112), (176, 112, 72)


def walls(d, x0, y0, x1, y1, mat, c, out=True):
    """A patch of building stuff seen from above, in the local material: earth, turf, timber, rubble, ashlar, brick,
    concrete, render, bamboo or clay, each with its own grain."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 <= x0 or y1 <= y0: return
    C = {"earth": ramp(mix(EARTH, c.render[2], .6), 12), "turf": ramp(mix(TURF, c.roof[2], .45), 14), "timber": c.wood, "rubble": ramp(mix(c.stone[2], (90, 86, 80), .15), 16),
         "ashlar": ramp(mix(c.stone[2], (236, 232, 220), .25), 12), "brick": ramp(mix(BRICK, c.stone[2], .45), 16), "concrete": ramp(mix(CONCRETE, c.stone[2], .3), 10),
         "render": c.render, "bamboo": ramp(BAMBOO, 16), "clay": ramp(mix(CLAY, c.render[2], .5), 16), "iron": IRON, "steel": STEEL}[mat]
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT if out else None)
    if mat in ("earth", "turf"):
        for k in range(0, (x1 - x0) * (y1 - y0) // 30): d.point((x0 + (k * 37) % max(1, x1 - x0), y0 + (k * 53) % max(1, y1 - y0)), fill=C[(k % 3) + 1])
    elif mat in ("timber", "bamboo"):
        st_ = 4 if mat == "timber" else 3
        if x1 - x0 >= y1 - y0:
            for k in range(y0 + st_, y1, st_): d.line([x0 + 1, k, x1 - 1, k], fill=C[1])
        else:
            for k in range(x0 + st_, x1, st_): d.line([k, y0 + 1, k, y1 - 1], fill=C[1])
        if mat == "bamboo":
            for k in range(x0 + 9, x1, 14): d.line([k, y0 + 1, k, y1 - 1], fill=C[4])
    elif mat == "rubble":
        for j, k in enumerate(range(y0 + 1, y1, 5)):
            for i in range(x0 + (j % 2) * 3, x1 - 3, 7): d.ellipse([i, k, min(i + 6, x1), min(k + 4, y1)], fill=C[2 + (i + k) % 3 - 1], outline=C[0])
    elif mat in ("ashlar", "brick", "concrete"):
        ch, cw = {"ashlar": (6, 12), "brick": (3, 7), "concrete": (14, 30)}[mat]
        for j, k in enumerate(range(y0 + ch, y1, ch)):
            d.line([x0 + 1, k, x1 - 1, k], fill=C[0] if mat != "concrete" else C[1])
        for j, k in enumerate(range(y0, y1, ch)):
            for i in range(x0 + (cw // 2 if j % 2 else 0), x1, cw): d.line([i, k + 1, i, min(y1 - 1, k + ch - 1)], fill=C[0] if mat != "concrete" else C[1])
    elif mat in ("render", "clay"):
        for k in range(0, (x1 - x0) * (y1 - y0) // 60): d.point((x0 + (k * 41) % max(1, x1 - x0), y0 + (k * 29) % max(1, y1 - y0)), fill=C[3])
    if out: d.rectangle([x0, y0, x1, y1], outline=OUT)


def ground(d, x0, y0, x1, y1, c):
    """The trodden ground of a works yard in the local earth, under and round the works."""
    G = ramp(mix(c.render[2], (96, 80, 60), .45), 10); x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=G[2])
    for k in range(0, (x1 - x0) * (y1 - y0) // 40): d.point((x0 + (k * 37) % max(1, x1 - x0), y0 + (k * 53) % max(1, y1 - y0)), fill=G[(k % 3) + 1])


def water(d, x0, y0, x1, y1, moving, tint=(70, 110, 140)):
    W_ = ramp(tint, 14); d.rectangle([int(x0), int(y0), int(x1), int(y1)], fill=W_[1], outline=OUT)
    for k in range(int(y0) + 3, int(y1) - 1, 6 if not moving else 3):
        d.line([x0 + 2 + (k * 7) % 6, k, x0 + 2 + (k * 7) % 6 + (x1 - x0) * .3, k], fill=W_[3] if not moving else (220, 232, 236))


FINISH = {"steel": ramp((150, 156, 164), 18), "black": ramp((50, 50, 56), 12), "grey": ramp((112, 116, 120), 14), "green": ramp((70, 104, 82), 16),
          "cream": ramp((200, 190, 160), 12), "brass": BRASS, "bronze": ramp((150, 104, 58), 20)}
WALLF = {"stone": (176, 170, 156), "cream": (214, 204, 172), "green": (92, 120, 96), "black": (52, 52, 58), "marble": (226, 222, 212), "oak": (130, 90, 56)}


def vaultdoor(tm, x, y, w, h, st, v, c):
    """A strongroom door from above, a thick slab of steel in its frame along the wall, seen from over its top edge.
    Victorian: a square door of plate iron, its face painted and lined in gold with brass handles and a keyhole plate;
    Great War: a square door of riveted plate with a great brass capstan; Mid-Century: the round door of polished
    steel with its spoked wheel and the time-lock box; Modern: a brushed square door with a lit keypad and a camera
    over it; Future Darkness: a dark sealed slab with lit seams. The wall round it is faced in stone, marble, oak or
    paint. Open: the door swung back flat against the wall, the vault's day gate of bars across the opening."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 0); per = c.per; era = c.era; op = st == "open"
    F = FINISH.get(c.axis("finish", "steel"), STEEL)
    if per == "F": F = ramp(mix(COMPOSITE[2], F[2], .5), 14)
    Wl = ramp(WALLF.get(c.axis("frame", "stone"), (176, 170, 156)), 14)
    dw = int(W * .46); dx0, dx1 = cx - dw // 2, cx + dw // 2
    rb(d, X0, Y0, dx0 - 4, Y1, Wl, 1)                 # the faced wall either side
    rb(d, dx1 + 4, Y0, X1, Y1, Wl, 1)
    for k in (dx0 - 5, dx1 + 1): d.rectangle([k, Y0, k + 4, Y1], fill=ramp((90, 92, 98), 12)[2], outline=OUT)      # the steel jambs
    if op:
        d.rectangle([dx0, Y0, dx1, Y1], fill=(20, 20, 24), outline=OUT)                                         # the opening
        if c.axis("gate", "daygate") == "daygate":
            d.line([dx0, cy, dx1, cy], fill=STEEL[3] if per != "V" else BRASS[3], width=2)
            for k in range(dx0 + 3, dx1, 5): d.line([k, Y0 + 2, k, Y1 - 2], fill=STEEL[3] if per != "V" else BRASS[3], width=2)
        rb(d, X0 + 2, Y1 - 12, dx0 - 6, Y1, F, 2)                                                               # the door laid back along the wall
        for k in range(X0 + 8, dx0 - 8, 8): disc(d, k, Y1 - 13, 2, STEEL)                                      # its bolts
        return
    if per == "W" and era == "mid-century":
        d.rounded_rectangle([dx0, Y0 + 1, dx1, Y1 - 1], 14, fill=F[2], outline=OUT); d.line([dx0 + 8, Y0 + 3, dx1 - 8, Y0 + 3], fill=F[4])
        for k in range(dx0 + 10, dx1 - 8, 12): d.line([k, Y0 + 4, k, Y1 - 4], fill=F[1])                        # polished bands
        d.line([cx - 16, cy, cx + 16, cy], fill=STEEL[4], width=3)
        for k in (-16, 0, 16): disc(d, cx + k, cy, 3, STEEL)                                                   # the spoked wheel
        rb(d, dx1 - 22, Y0 + 6, dx1 - 8, Y1 - 6, BRASS, 1)                                                     # the time lock
    else:
        rb(d, dx0, Y0 + 1, dx1, Y1 - 1, F, 1)
        if per == "V":
            d.rectangle([dx0 + 3, Y0 + 4, dx1 - 3, Y1 - 4], outline=METAL["gold"][3]); plate(d, cx - 5, cy - 2, BRASS, 10, 4)
            for k in (dx0 + 10, dx1 - 14): d.rectangle([k, cy - 3, k + 4, cy + 3], fill=BRASS[3], outline=OUT)
        elif era == "great-war":
            for k in range(dx0 + 4, dx1 - 2, 6): [rivet(tm, k, yy) for yy in (Y0 + 4, Y1 - 5)]
            disc(d, cx, cy, 7, BRASS); [d.line([cx - 11, cy, cx + 11, cy], fill=BRASS[3], width=2), d.line([cx, cy - 11, cx, cy + 11], fill=BRASS[3], width=2)]
        elif per == "N":
            for k in range(dx0 + 3, dx1 - 2, 3): d.line([k, Y0 + 3, k, Y1 - 3], fill=F[3])                      # brushed
            d.rectangle([dx1 + 8, Y0 + 6, dx1 + 18, Y1 - 8], fill=(30, 30, 34), outline=OUT); lamp(d, dx1 + 13, cy, 2, True, (90, 220, 90))
            disc(d, dx0 - 14, Y0 + 7, 4, ramp((30, 30, 34), 8))                                                # the camera dome
        else:
            for k in (dx0 + dw // 3, dx0 + 2 * dw // 3): d.line([k, Y0 + 3, k, Y1 - 3], fill=c.glow[1], width=1)
            d.line([dx0 + 3, cy, dx1 - 3, cy], fill=c.glow[1], width=2); lamp(d, dx1 + 12, cy, 3, True, c.glow[2])


reg("vaultdoor", vaultdoor, {"finish": list(FINISH), "frame": list(WALLF), "gate": ["daygate", "none", "daygate"]},
    "a bank vault door and its frame run 6 to 9 ft along the wall and stand 1 1/2 to 3 ft thick (Mosler, Diebold and Chubb catalogues)",
    front=True, clear=6, mount="wall", states=("closed", "open"), nvar=24)


def razorwire(tm, x, y, w, h, st, v, c):
    """A coil of barbed or razor wire from above, its loops lying along its length between pickets. Mid-Century: the
    loose barbed-wire concertina of the Second World War on iron corkscrew pickets with a straight strand along it,
    painted or galvanised; Modern: tight bright coils of galvanised razor tape glinting with blades, on steel posts,
    in single, double or stacked rows; Future Darkness: dark wire with a lit sensor post here and there."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per
    fin = c.axis("finish", "galvanised")
    Wc = ramp({"galvanised": (176, 182, 188), "oxide": (140, 64, 48), "black": (60, 60, 66), "dull": (120, 120, 116), "green": (90, 110, 80)}[fin], 16)
    if per == "F": Wc = ramp(mix(Wc[2], (40, 40, 48), .12), 14)
    rows = {"single": [cy], "double": [Y0 + H // 3, Y0 + 2 * H // 3], "stack": [Y0 + H // 4, cy, Y0 + 3 * H // 4]}[c.axis("coils", "single")]
    r = max(6, (Y1 - Y0) // (2 * len(rows)) + (2 if len(rows) == 1 else 3))
    step = max(5, r // 2 + 2) if per != "W" else r + 3
    wd = 1 if per != "N" else 2
    for ry in rows:
        if per == "W": d.line([X0, ry, X1, ry], fill=Wc[1], width=1)                                           # the straight strand
        for k in range(X0 + r + ((W - 2 * r) % step) // 2, X1 - r + 1, step):
            d.ellipse([k - r, ry - r, k + r, ry + r], outline=Wc[1], width=wd)
            d.arc([k - r, ry - r, k + r, ry + r], 160, 260, fill=Wc[4], width=1)
            if per == "W":
                for a_ in (0, 90, 180, 270): ex, ey = k + math.cos(math.radians(a_)) * r, ry + math.sin(math.radians(a_)) * r; d.line([ex - 1, ey - 1, ex + 1, ey + 1], fill=Wc[0])   # barbs
            else:
                for a_ in (40, 130, 220, 310): d.point((k + math.cos(math.radians(a_)) * r, ry + math.sin(math.radians(a_)) * r), fill=(250, 250, 250) if fin == "galvanised" else Wc[4])
    gp = (60 if per != "W" else 40) + {"8": -14, "10": 0, "12": 16}[str(c.axis("bay", "10"))]
    for k in range(X0 + 4 + ((W - 8) % gp) // 2, X1 - 3, gp):                                                      # pickets or posts
        if per == "W": d.line([k, Y0 + 2, k, Y1 - 2], fill=IRON[2], width=3); ring(d, k, Y0 + 4, 2, IRON, 1)
        else: disc(d, k, cy, 4, STEEL if per == "N" else ramp((40, 40, 48), 10))
        if per == "F": lamp(d, k, cy, 2, True, c.glow[2])


reg("razorwire", razorwire, {"finish": ["galvanised", "oxide", "black", "dull", "green"], "coils": ["single", "double", "stack", "single"], "bay": ["10", "8", "12"]},
    "a concertina coil is about 2 1/2 ft across and is laid in lengths of 10 to 50 ft (US Army FM 5-15; BS EN razor wire sheets)",
    metal=True, chip=False, nvar=52)


LINK = {"galvanised": (176, 182, 188), "green": (60, 116, 72), "black": (46, 46, 52), "oxide": (140, 64, 48), "white": (226, 226, 220)}


def chainlink(tm, x, y, w, h, st, v, c):
    """A chain-link fence from above, a thin line along its length: the posts with their caps, the diamond mesh seen
    nearly edge on. Victorian and Great War: woven wire, galvanised, japanned or painted, on timber posts, then on
    iron angle posts, plain or with a rail or barbed strands; posts stand 8, 10 or 12 ft apart; Mid-Century: galvanised mesh on round steel posts with domed caps, with a
    top rail or only a tension wire, sometimes over a concrete mowing kerb; Modern: galvanised or green, black or white coated mesh, with privacy slats or barbed strands at the top;
    Future Darkness: dark mesh with lit sensor caps."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 0); per = c.per; era = c.era; ek = c.ek
    fins = list(LINK); fin = c.axis("finish", "galvanised")

    M = ramp(LINK[fin], 16)
    if per == "F": M = ramp(mix(M[2], (40, 40, 48), .35), 14)
    top = c.axis("top", "plain")
    if per in "VW" and top == "slats": top = "kerb" if era == "mid-century" else "rail"                        # slats are a modern thing; a concrete mowing kerb under it instead
    if top == "kerb": d.rectangle([X0, cy - 5, X1, cy + 5], fill=CONCRETE, outline=OUT)
    if top == "slats":
        S = ramp(LIV[("green", "blue", "white", "black", "red")[c.w % 5]], 16); d.rectangle([X0, cy - 3, X1, cy + 3], fill=S[2], outline=OUT)
    else:
        d.rectangle([X0, cy - 2, X1, cy + 2], fill=mix(M[1], (60, 60, 60), .3))
        for k in range(X0, X1 - 2, 4): d.line([k, cy - 2, k + 4, cy + 2], fill=M[3]); d.line([k, cy + 2, k + 4, cy - 2], fill=M[2])   # the mesh
    if top in ("rail", "barbed", "kerb") or per == "N" or (per == "W" and top != "plain"): d.line([X0, cy - 1, X1, cy - 1], fill=M[4], width=2)   # the top rail (a plain fence has only its tension wire)
    if top == "barbed":
        for k in range(X0 + 3 + ((W - 6) % 6) // 2, X1 - 2, 6): d.line([k - 2, cy - 4, k, cy - 3], fill=M[0]); d.line([k, cy - 3, k + 2, cy - 4], fill=M[0]); d.point((k, cy - 5), fill=M[4])
    gap = {0: 46, 1: 46, 2: 46, 3: 46, 4: 46, 5: 38, 6: 58, 7: 50, 8: 66}[ek] + {"8": -8, "10": 0, "12": 10}[str(c.axis("bay", "10"))]
    P = c.wood if per == "V" else (IRON if era == "great-war" else M)
    for k in range(X0 + 3 + ((W - 6) % gap) // 2, X1 - 2, gap):
        if era == "great-war": d.rectangle([k - 3, cy - 3, k + 3, cy + 3], fill=P[2], outline=OUT); d.line([k - 3, cy - 3, k + 3, cy - 3], fill=P[4])   # an angle post
        else: disc(d, k, cy, 4 if per != "N" else 5, P); d.point((k - 1, cy - 1), fill=(240, 240, 240) if per != "V" else P[4])
        if per == "F": lamp(d, k, cy, 2, True, c.glow[2])


reg("chainlink", chainlink, {"finish": list(LINK), "top": ["plain", "barbed", "slats", "rail"], "bay": ["10", "8", "12"]},
    "chain-link fencing comes in 10 ft bays between posts, 4 to 8 ft high (Anchor Fence and ASTM F567 sheets)", chip=False, nvar=40)


def tanktrap(tm, x, y, w, h, st, v, c):
    """An anti-tank obstacle from above. Great War: lengths of rail driven slantwise into a concrete footing with wire
    wound round, a timber knife-rest wrapped in barbed wire, or a block of concrete; Mid-Century: the steel hedgehog of
    three crossed angle irons (a six-pointed star from above), the pyramid of a dragon's tooth, a concrete cube or a
    tetrapod, the concrete left grey, whitewashed, tarred or painted in camouflage; Modern: a steel hedgehog with
    hazard bands, a concrete road barrier or a striped cube; Future Darkness: dark composite blocks with a lit sensor.
    Steel comes in red oxide, black, olive, grey or white. It may stand on beach sand, turf or a concrete apron."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 3); per = c.per; era = c.era
    _under(d, X0 - 2, Y0 - 2, X1 + 2, Y1 + 2, c.axis("ground", "none"), c)                                      # where it stands: beach sand, turf or a concrete apron
    kind = c.axis("kind", "hedgehog"); fin = c.axis("finish", "oxide")
    Stl = ramp({"oxide": (140, 64, 48), "black": (50, 50, 56), "olive": (100, 104, 70), "grey": (120, 124, 128), "white": (210, 208, 200)}[fin], 14)
    Con = ramp(mix((170, 166, 156), Stl[2], .5), 12)
    if per == "F": Stl = ramp(mix(COMPOSITE[2], Stl[2], .7), 14); Con = ramp(mix(COMPOSITE[2], Con[2], .7), 12)
    def hedgehog(col):
        for a_ in (0, 60, 120):
            ex, ey = math.cos(math.radians(a_)) * W * .46, math.sin(math.radians(a_)) * H * .46
            d.line([cx - ex, cy - ey, cx + ex, cy + ey], fill=OUT, width=10); d.line([cx - ex, cy - ey, cx + ex, cy + ey], fill=col[2], width=7)
            d.line([cx - ex, cy - ey - 2, cx + ex, cy + ey - 2], fill=col[4], width=1)
        for a_ in range(0, 360, 60): rivet(tm, cx + math.cos(math.radians(a_)) * 8, cy + math.sin(math.radians(a_)) * 8, IRON)
    def tooth(): 
        d.polygon([(X0 + 4, Y0 + 4), (X1 - 4, Y0 + 4), (cx, cy)], fill=Con[4]); d.polygon([(X0 + 4, Y0 + 4), (X0 + 4, Y1 - 4), (cx, cy)], fill=Con[3])
        d.polygon([(X1 - 4, Y1 - 4), (X1 - 4, Y0 + 4), (cx, cy)], fill=Con[1]); d.polygon([(X1 - 4, Y1 - 4), (X0 + 4, Y1 - 4), (cx, cy)], fill=Con[0])
        d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=OUT)
    def cube(stripe=False):
        rb(d, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, Con, 3); d.rectangle([X0 + 12, Y0 + 12, X1 - 12, Y1 - 12], outline=Con[1])
        if stripe:
            for k in (cx - 22, cx - 4, cx + 14): d.rectangle([k - 4 + 4, Y0 + 7, k + 4 + 4, Y1 - 7], fill=HAZ[0] if c.w % 2 else (220, 60, 50))   # painted bands
            d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], outline=OUT)
    if era == "great-war":
        if kind == "hedgehog":
            d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=Con[1], outline=OUT)
            for a_ in (90, 210, 330):
                ex, ey = cx + math.cos(math.radians(a_)) * W * .44, cy + math.sin(math.radians(a_)) * H * .44
                d.line([cx, cy, ex, ey], fill=OUT, width=8); d.line([cx, cy, ex, ey], fill=Stl[2], width=5)
            d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], outline=ramp((120, 116, 110), 10)[2])
        elif kind in ("cube", "tetrapod"):                                                                     # a knife rest
            Wd = ramp(mix(c.wood[2], Stl[2], .5), 14)                                                          # raw, tarred or painted timber
            for k in (X0 + 8, X1 - 14): d.line([k, Y0 + 4, k + 6, Y1 - 4], fill=Wd[1], width=5); d.line([k + 6, Y0 + 4, k, Y1 - 4], fill=Wd[2], width=5)
            d.line([X0 + 6, cy, X1 - 6, cy], fill=Wd[3], width=6)
            for k in range(X0 + 8, X1 - 6, 6): d.ellipse([k - 4, cy - 8, k + 4, cy + 8], outline=ramp((120, 116, 110), 10)[1])
        else: cube()
    elif per == "N":
        if kind == "hedgehog": hedgehog(Stl); [d.line([cx - 6, cy - 6 + k * 6, cx + 6, cy - 6 + k * 6], fill=HAZ[0], width=3) for k in range(3)]
        elif kind == "tooth":                                                                                  # a concrete road barrier
            for by_ in (Y0 + 4, cy + 4):                                                                     # two lengths of concrete road barrier
                rb(d, X0 + 2, by_, X1 - 2, by_ + 22, Con, 2); d.rectangle([X0 + 2, by_ + 8, X1 - 2, by_ + 14], fill=Con[4], outline=OUT)
                for k in range(X0 + 6, X1 - 4, 14): d.rectangle([k, by_ + 16, k + 6, by_ + 19], fill=(220, 60, 50))
        else: cube(stripe=True)
    else:
        if kind == "hedgehog": hedgehog(Stl)
        elif kind == "tooth": tooth()
        elif kind == "cube": cube()
        else:
            for a_ in (90, 210, 330):
                ex, ey = cx + math.cos(math.radians(a_)) * W * .4, cy + math.sin(math.radians(a_)) * H * .4
                d.line([cx, cy, ex, ey], fill=OUT, width=16); d.line([cx, cy, ex, ey], fill=Con[2], width=13); disc(d, ex, ey, 7, Con)
            disc(d, cx, cy, 10, Con)
        if per == "F": lamp(d, cx, cy, 3, True, c.glow[2])


reg("tanktrap", tanktrap, {"kind": ["hedgehog", "tooth", "cube", "tetrapod"], "finish": ["oxide", "black", "olive", "grey", "white"],
                         "ground": ["none", "sand", "turf", "plinth", "none"]},
    "a Czech hedgehog or a dragon's tooth stands 3 to 5 ft across (Second World War defence manuals; Atlantic Wall surveys)", chip=True, nvar=52)


def _under(d, X0, Y0, X1, Y1, kind, c):
    """What a roof or yard machine stands on: a concrete plinth, a roof of boards and lead, a steel grating, a ring of
    sandbags, beach sand or turf."""
    if kind == "plinth": walls(d, X0, Y0, X1, Y1, "concrete", c)
    elif kind == "roof": rb(d, X0, Y0, X1, Y1, ramp((110, 114, 120), 10), 1); [d.line([X0 + 1, k, X1 - 1, k], fill=(84, 88, 94)) for k in range(Y0 + 5, Y1, 6)]
    elif kind == "grating":
        d.rectangle([X0, Y0, X1, Y1], fill=(60, 62, 66), outline=OUT)
        for k in range(X0 + 3, X1, 4): d.line([k, Y0 + 1, k, Y1 - 1], fill=(120, 124, 128))
    elif kind == "sandbags":                                                                                   # a ring of sandbags, filled earth in hessian
        S = ramp((176, 150, 104), 12); d.rectangle([X0, Y0, X1, Y1], fill=mix(EARTH, (120, 110, 90), .5))
        mx = (X0 + X1) / 2
        for j, k in enumerate(range(int(Y0), int(Y1) - 4, 6)):
            o = 0 if j % 2 else 4.5
            while mx + o + 4 <= X1:
                for i in {round(mx - o), round(mx + o)}:                                                        # bags laid mirrored about the middle
                    if k < Y0 + 8 or k > Y1 - 12 or abs(i - mx) > (X1 - X0) / 2 - 12: d.rounded_rectangle([i - 4, k, i + 4, k + 5], 2, fill=S[2 + j % 2], outline=OUT)
                o += 9
    elif kind == "sand": d.rectangle([X0, Y0, X1, Y1], fill=(214, 196, 150)); [d.point((i, j), fill=(190, 172, 130)) for i in range(int(X0) + 2, int(X1), 5) for j in range(int(Y0) + 2 + (i % 3), int(Y1), 5)]
    elif kind == "turf": walls(d, X0, Y0, X1, Y1, "turf", c)


def searchlight(tm, x, y, w, h, st, v, c):
    """A searchlight from above: the drum of the lamp in its yoke on a turntable, the glass front to the south, standing
    on a concrete plinth, a roof, a steel grating, a ring of sandbags or turf. Victorian: an arc-lamp drum of brass or painted iron with its
    ventilating top on a tripod; Great War: a drum in service drab on an iron cross-frame; Mid-Century: a big drum in the service's paint on a four-wheeled trailer with
    its power cable; Modern: a black xenon lamp on a pedestal; Future Darkness: a dark sealed head with a lit ring.
    Lit: the glass blazing and its beam thrown south across the ground."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; era = c.era; lit = st == "lit"
    B = ramp(LIV.get(c.make, (104, 108, 70)), 18)
    if era == "great-war": B = ramp(mix((96, 100, 70), B[2], .5), 14)
    if per == "V": B = BRASS if c.make in ("cream", "yellow") else ramp(mix((60, 60, 66), B[2], .6), 14)
    if per == "N": B = ramp(mix((40, 40, 44), B[2], .6), 12)
    if per == "F": B = ramp(mix(COMPOSITE[2], B[2], .5), 14)
    base = c.axis("base", "plinth")
    _under(d, X0, Y0, X1, Y1, base, c)
    if per == "W" and era == "mid-century":
        rb(d, X0 + 7, Y0 + 7, X1 - 7, Y1 - 7, ramp(mix(B[2], (60, 60, 60), .2), 14), 3)                            # the trailer
        for kx, ky in ((X0 + 1, Y0 + 6), (X1 - 7, Y0 + 6), (X0 + 1, Y1 - 18), (X1 - 7, Y1 - 18)): tyre(d, kx, ky, kx + 6, ky + 12)
    elif per in "NF": disc(d, cx, cy, int(W * .38), ramp((60, 62, 68), 12) if per == "N" else c.comp)             # the pedestal
    elif era == "great-war":                                                                                   # an iron cross-frame stand
        for a_ in (45, 135): ex, ey = math.cos(math.radians(a_)) * W * .48, math.sin(math.radians(a_)) * H * .48; d.line([cx - ex, cy - ey, cx + ex, cy + ey], fill=OUT, width=7); d.line([cx - ex, cy - ey, cx + ex, cy + ey], fill=IRON[2], width=5)
    else:
        for a_ in (90, 210, 330): d.line([cx, cy, cx + math.cos(math.radians(a_)) * W * .46, cy + math.sin(math.radians(a_)) * H * .46], fill=IRON[2], width=4)
    disc(d, cx, cy, int(W * .22), ramp((80, 80, 86), 12))                                                       # the turntable
    dr = int(W * .3)
    if per == "F":                                                                                             # a sealed dome head, no yoke, its lens ringed with light
        rb(d, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, c.comp, 8); disc(d, cx, cy, int(W * .36), B)
        d.ellipse([cx - 12, cy + 2, cx + 12, cy + 18], fill=(255, 250, 220) if lit else (60, 70, 80), outline=c.glow[1])
        if lit: return [(cx, cy + 16, 120, (1.6, 1.55, 1.3), False)]
        return
    for k in (cx - dr - 5, cx + dr + 1): d.rectangle([k, cy - 10, k + 4, cy + 10], fill=B[1], outline=OUT)      # the yoke
    rb(d, cx - dr, cy - int(H * .34), cx + dr, cy + int(H * .24), B, 6)                                         # the drum
    if per in "VW": [d.line([cx - dr + 3, k, cx + dr - 3, k], fill=B[0]) for k in range(cy - int(H * .3), cy - int(H * .14), 3)]   # vent louvres
    gy = cy + int(H * .24)
    d.ellipse([cx - dr + 1, gy - 4, cx + dr - 1, gy + 4], fill=(255, 250, 220) if lit else (120, 140, 150), outline=OUT)   # the glass front
    if per == "F": d.ellipse([cx - dr + 4, gy - 2, cx + dr - 4, gy + 2], outline=c.glow[1])
    if lit: return [(cx, gy + 6, 120, (1.6, 1.55, 1.3), False)]


reg("searchlight", searchlight, {"make": ["olive", "grey", "black", "green", "cream", "blue", "yellow"], "base": ["plinth", "roof", "grating", "plinth", "sandbags", "turf"]},
    "a searchlight on its stand or trailer takes 2 1/2 to 4 ft square (Sperry 60-inch, 1930s; Royal Engineers searchlight manuals)",
    front=True, clear=2, states=("out", "lit"), light={"dim": 12, "bright": 6, "color": "#fff6dc", "kind": "lamp"}, nvar=40)


def siren(tm, x, y, w, h, st, v, c):
    """A warning siren from above, standing on a roof, a steel grating, a concrete plinth or turf. Victorian: a hand-cranked
    siren, its round drum and the crank at the side; Great War: an electric motor siren, its drum ringed with rotor
    ports, in red or grey; Mid-Century: the civil-defence siren with its rain hood, or a great horn siren with its
    four trumpets; Modern: an electronic siren of square horn speakers clustered on a pole, or a squat rotating siren with
    a pale cap; Future Darkness: a dark
    dome with a lit ring. On: the rotor a blur, the lamp lit."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); per = c.per; era = c.era; on = st == "on"
    B = ramp(LIV.get(c.make, (178, 42, 38)), 18)
    if per == "F": B = ramp(mix(COMPOSITE[2], B[2], .8), 14)
    _under(d, X0, Y0, X1, Y1, c.axis("mount", "roof"), c)
    r = int(min(W, H) * .4)
    dark = ramp(mix(B[2], (40, 40, 40), .35), 14)
    if per == "V":
        disc(d, cx, cy, r, B); disc(d, cx, cy, r - 6, dark)
        d.line([cx + r - 2, cy, X1 - 2, cy + 8], fill=IRON[3], width=3); d.ellipse([X1 - 7, cy + 5, X1 - 1, cy + 11], fill=c.wood[2], outline=OUT)   # the crank
    elif era == "great-war" or (per == "W" and c.axis("kind", "rotor") == "rotor"):
        disc(d, cx, cy, r, B)
        for a_ in range(0, 360, 36): d.line([cx + math.cos(math.radians(a_)) * (r - 7), cy + math.sin(math.radians(a_)) * (r - 7), cx + math.cos(math.radians(a_)) * (r - 1), cy + math.sin(math.radians(a_)) * (r - 1)], fill=(30, 30, 34), width=3)   # rotor ports
        if era == "great-war": disc(d, cx, cy, r - 8, ramp(mix(B[2], (200, 200, 200), .3), 14))
        else: d.pieslice([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 360, fill=dark[2], outline=OUT); disc(d, cx, cy + 4, 6, STEEL)   # the rain hood
    elif per == "W":
        disc(d, cx, cy, 8, B)
        for a_ in (0, 90, 180, 270):
            ex, ey = cx + math.cos(math.radians(a_)) * r, cy + math.sin(math.radians(a_)) * r
            d.line([cx, cy, ex, ey], fill=OUT, width=11); d.line([cx, cy, ex, ey], fill=B[2], width=8); d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=(30, 30, 34), outline=OUT)
    elif per == "N" and c.axis("kind", "rotor") == "rotor":                                                  # a modern rotating siren: a squat drum, its ports and a cap
        disc(d, cx, cy, r, B); disc(d, cx, cy, r - 7, ramp((200, 202, 206), 10))
        for a_ in range(0, 360, 60): d.line([cx + math.cos(math.radians(a_)) * (r - 6), cy + math.sin(math.radians(a_)) * (r - 6), cx + math.cos(math.radians(a_)) * (r - 1), cy + math.sin(math.radians(a_)) * (r - 1)], fill=(30, 30, 34), width=4)
    elif per == "N":                                                                                            # an electronic siren of square horns on a pole
        for gx in (-1, 1):
            for gy in (-1, 1):
                bx, by = cx + gx * 10, cy + gy * 10; rb(d, bx - 9, by - 9, bx + 9, by + 9, B, 2); d.rectangle([bx - 5, by - 5, bx + 5, by + 5], fill=(30, 30, 34))
    else:
        disc(d, cx, cy, r, B); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=c.glow[1 if on else 0], width=2)
    if on:
        if per in "VW": d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=(220, 220, 230))
        lamp(d, cx, cy, 3, True, (250, 80, 40))


reg("siren", siren, {"make": ["red", "grey", "yellow", "green", "black", "olive", "silver"], "mount": ["roof", "grating", "plinth", "roof", "turf"], "kind": ["rotor", "horns", "rotor"]},
    "a siren head with its motor or horns stands 1 1/2 to 3 ft across on its pole or frame (Federal Signal and Carter catalogues; Home Office ARP sirens)",
    states=("off", "on"), nvar=40)


# ================================================================ the yard and the old works

def waterwheel(tm, x, y, w, h, st, v, c):
    """A water-wheel from above, turning on its axle across a mill race that runs north to south, the axle running west
    into the mill wall. The race banks are of each age's build: earth and wattle in the Dark Ages, timber planking in
    the Long Night, rubble stone in the Renaissance, dressed stone with a timber sluice in the Age of Reason, brick
    with an iron wheel in Victorian days, concrete with the iron wheel in the Great War and a steel wheel after; that
    order runs first in the middle lands, the north and the Atlantic coast, while elsewhere the race keeps the place's
    own build for longer (stone by the Mediterranean and in East Asia, timber in the Americas, the steppe, the far
    north and Oceania, clay in Africa, earth in Southeast Asia) and the wheel stays wooden until the Great War. An
    iron wheel shows its crossed spokes. A poor mill's wheel is smaller with fewer floats, a rich one's closer set. Where the
    wheel really differs it is drawn so: the Islamic world's noria with its ring of clay pots lifting water to a stone
    aqueduct, the bamboo wheel of East and Southeast Asia with its tube buckets; elsewhere a wooden wheel, undershot,
    breast (with the breastwork the water falls over) or overshot from a timber launder. The Great War race has an
    iron hatch raised by rack and pinion; from the Mid-Century a dynamo shed stands on the west bank. On: the race running white under the paddles; off: the sluice shut and
    the water still."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = c.ek; on = st == "on"; sty = c.style
    bank = ["earth", "timber", "rubble", "ashlar", "brick", "concrete", "concrete", "concrete", "concrete"][ek]
    core = sty in ("central", "northern", "atlantic")                                                          # where brick, iron and concrete came first
    if ek >= 4 and not core:                                                                                   # elsewhere the race kept the place's own build longer
        bank = {"mediterranean": "ashlar", "americas": "timber", "steppe": "timber", "polar": "timber", "oceania": "timber", "africa": "clay",
                "southasia": "brick" if ek >= 5 else "rubble", "eastasia": "ashlar", "seasia": "earth", "islamic": "render"}.get(sty, bank)
        if ek >= 6 and sty in ("americas", "mediterranean", "eastasia"): bank = "concrete"
    bw = int(W * .2)
    walls(d, X0, Y0, X0 + bw, Y1, "render" if sty == "islamic" and ek < 5 else bank, c); walls(d, X1 - bw, Y0, X1, Y1, bank, c)
    ground(d, X0 + 1, Y0 + 1, X0 + bw // 2, Y1 - 1, c); ground(d, X1 - bw // 2, Y0 + 1, X1 - 1, Y1 - 1, c)                      # the trodden bank tops
    if ek == 0:
        for k in range(Y0 + 6, Y1, 10): d.line([X1 - bw + 2, k, X1 - 2, k + 4], fill=c.wood[1], width=2)                 # wattle along the bank
    water(d, X0 + bw, Y0, X1 - bw, Y1, on, (60, 100, 120) if sty not in ("islamic", "africa") else (110, 120, 100))
    kind = c.axis("kind", "undershot")
    if sty == "islamic": kind = "noria"
    elif sty in ("eastasia", "seasia"): kind = "bamboo"
    iron = ek >= 4 if core else ek >= 5
    Wc = ramp(BAMBOO, 16) if kind == "bamboo" else (IRON if iron and ek < 6 else (STEEL if iron else c.wood))
    wx0, wx1 = X0 + bw - 2, X1 - bw + 2; wy0, wy1 = Y0 + int(H * .12), Y1 - int(H * .12)
    if c.poor: wy0, wy1 = wy0 + 8, wy1 - 8                                                                       # and is smaller across
    if kind == "overshot" and kind != "bamboo":                                                                  # the launder comes in over the top
        walls(d, cx - 10, Y0, cx + 10, wy0 + 20, "timber" if ek < 6 else "steel", c); water(d, cx - 7, Y0, cx + 7, wy0 + 18, on)
    # the wheel itself: two rims with the paddles or pots between
    for rx in (wx0, wx1 - 6): rb(d, rx, wy0, rx + 6, wy1, Wc, 2)
    step = (14 if c.poor else (7 if c.rich else 10)) if kind != "noria" else 11                                    # a poor mill's wheel has fewer floats, a rich one's more
    for k in range(wy0 + 4, wy1 - 2, step):
        if kind == "noria":
            d.line([wx0 + 6, k, wx1 - 6, k], fill=c.wood[1], width=2)
            for rx in (wx0 - 1, wx1 - 7): d.ellipse([rx, k - 3, rx + 8, k + 4], fill=ramp(CLAY, 14)[2 + (k // step) % 2], outline=OUT)   # the clay pots
        elif kind == "bamboo":
            d.line([wx0 + 6, k, wx1 - 6, k], fill=Wc[1]); ring(d, wx0 + 3, k, 3, Wc, 1)
        else:
            d.rectangle([wx0 + 6, k, wx1 - 6, k + 4], fill=Wc[3 if (k // step) % 2 else 2], outline=OUT)
    if kind in ("noria", "bamboo") or iron:                                                                     # its open spokes over the water
        d.line([wx0 + 6, wy0 + 4, wx1 - 6, wy1 - 4], fill=Wc[1], width=2); d.line([wx1 - 6, wy0 + 4, wx0 + 6, wy1 - 4], fill=Wc[1], width=2)
    if kind == "noria": walls(d, X0, Y0, X1 - bw, Y0 + 12, "ashlar", c)                                        # the aqueduct it fills
    # the axle into the mill
    ay = (wy0 + wy1) // 2
    d.rectangle([X0, ay - 4, wx1, ay + 4], fill=OUT); d.rectangle([X0 + 1, ay - 3, wx1 - 1, ay + 3], fill=(IRON if iron else c.wood)[2])
    rb(d, X0 + 2, ay - 8, X0 + 14, ay + 8, IRON if ek >= 3 else c.wood, 1)                                     # its bearing block
    if kind == "breast": walls(d, X0 + bw, wy1 - 2, X1 - bw, wy1 + 6, bank, c)                                 # the breastwork the water falls over
    if ek == 5:                                                                                                 # an iron hatch raised by a rack and pinion
        walls(d, X0 + bw - 4, Y0 + 1, X1 - bw + 4, Y0 + 13, "iron", c)
        for k in (cx - 10, cx + 10): d.rectangle([k - 3, Y0, k + 3, Y0 + 14], fill=IRON[3], outline=OUT)
        ring(d, cx, Y0 + 7, 6, IRON, 2)
    elif ek == 3 or ek == 4 or not on:                                                                          # a sluice board across the race
        walls(d, X0 + bw, Y0 + 2, X1 - bw, Y0 + 8, "timber" if ek < 7 else "steel", c)
    if ek >= 6:                                                                                                 # the dynamo shed on the west bank, the wheel making light for the farm
        rb(d, X0 + 1, ay + 10, X0 + bw + 2, ay + 30, ramp(mix(c.roof[2], (110, 114, 120), .3), 14), 1); d.line([X0 + 2, ay + 20, X0 + bw + 1, ay + 20], fill=OUT)
    if on:
        for k in range(wy1, Y1 - 2, 4): d.line([X0 + bw + 4, k, X1 - bw - 4, k], fill=(232, 240, 242))


reg("waterwheel", waterwheel, {"kind": ["undershot", "breast", "overshot", "undershot"]},
    "a mill wheel runs 10 to 20 ft across and 3 to 6 ft wide on its axle in a race (Reynolds, Stronger than a Hundred Men, 1983; noria of Hama)",
    glob=False, states=("on", "off"), nvar=16)


SMOKE = {"fish": [(170, 140, 100), (196, 160, 110), (150, 120, 90)], "salmon": [(200, 110, 80), (220, 130, 90)], "meat": [(110, 50, 40), (130, 70, 50), (90, 44, 36)],
         "sausage": [(130, 60, 50), (150, 80, 60)], "ham": [(150, 90, 60), (170, 100, 70)], "fruit": [(180, 120, 60), (120, 70, 60), (200, 160, 80)],
         "chillies": [(190, 40, 30), (160, 30, 30)], "fish_small": [(190, 170, 130), (160, 150, 120)], "herbs": [(90, 110, 60), (110, 130, 70)]}
REG_SMOKE = {"central": "sausage", "atlantic": "fish", "northern": "fish", "mediterranean": "fruit", "islamic": "fruit", "steppe": "meat",
             "southasia": "chillies", "eastasia": "fish_small", "seasia": "fish_small", "africa": "fish", "americas": "meat", "oceania": "fish", "polar": "salmon"}


def smokerack(tm, x, y, w, h, st, v, c):
    """A smoking and drying rack from above: its frame of poles over a smoulder, hung with what the place cures. Fish
    split on the rails for the Atlantic, the north, Africa and Oceania, salmon in the far north, sausages and hams in
    the middle lands, figs, apricots and peppers by the Mediterranean and in the Islamic world, chillies in South Asia,
    small fish on bamboo racks in East and Southeast Asia, strips of meat on the steppe and in the Americas. The frame
    is of each age: lashed poles in the Dark Ages, forked stakes in the Long Night, a plank-ended frame in the Renaissance, a wattle hood in the Age of Reason, iron rods and hooks in Victorian days,
    wire netting in the Great War, steel mesh over an oil drum after, a steel smoker with a gas ring and its
    bottle in Modern times in the middle lands, the north, the Atlantic, the Americas and Oceania (elsewhere still the
    oil drum, on bamboo, clay-country or chilli racks of the old poles) and scrap in the Future Darkness. From the Victorian age the smoke pit has sides of the
    place's own build: brick in the middle lands and on the Atlantic, rubble in the north and Oceania, clay in Africa and
    South Asia, timber on the steppe, in the far north and the Americas, render by the Mediterranean and in the Islamic
    world, bamboo in East and Southeast Asia. A poor rack has three rails, a rich one five. Lit: the fire
    glowing under."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = c.ek; lit = st == "lit"; sty = c.style
    ground(d, X0, Y0, X1, Y1, c)
    pole = ramp(BAMBOO, 16) if sty in ("eastasia", "seasia") and ek < 8 else (ramp((176, 170, 156), 10) if sty == "polar" and ek < 6 else c.wood)
    gas = ek == 7 and sty in ("central", "atlantic", "northern", "americas", "oceania")                             # the bought gas smoker is a rich-world thing
    if ek >= 4 and not (ek == 7 and not gas and sty in ("eastasia", "seasia", "africa", "southasia")):
        pole = IRON if ek < 6 else (STEEL if ek < 8 else ramp(mix(COMPOSITE[2], (140, 64, 48), .5), 14))
    # the fire under
    if ek == 6 or (ek == 7 and not gas):
        disc(d, cx, cy, int(min(W, H) * .32), ramp((60, 60, 64), 10)); d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(30, 26, 24))    # an oil drum
    elif gas:
        rb(d, X0 + 2, Y0, X1 - 2, Y0 + 10, STEEL, 2); disc(d, X1 - 10, Y1 - 10, 7, ramp((200, 60, 50), 14))   # the steel smoker's back and its gas bottle
        d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=(80, 120, 230), width=2)                             # the gas ring
    elif ek == 3: walls(d, X0, Y0, X1, Y0 + 10, "timber", c)                                                   # a wattle hood at the back
    elif ek == 2: walls(d, X0, Y0, X0 + 8, Y1, "timber", c); walls(d, X1 - 8, Y0, X1, Y1, "timber", c)       # plank ends
    elif ek == 1: d.ellipse([cx - 14, cy - 10, cx + 14, cy + 10], outline=c.stone[2], width=4)                 # a ring of hearth stones
    d.ellipse([cx - 9, cy - 6, cx + 9, cy + 6], fill=(250, 150, 50) if lit else (60, 50, 44), outline=OUT)
    if lit: d.ellipse([cx - 4, cy - 2, cx + 4, cy + 2], fill=(255, 230, 140))
    # the frame
    if ek in (5, 6) or gas:
        for k in range(X0 + 4, X1 - 3, 4): d.line([k, Y0 + 4, k, Y1 - 4], fill=pole[3])
        for k in range(Y0 + 4, Y1 - 3, 4): d.line([X0 + 4, k, X1 - 4, k], fill=pole[1])
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=pole[2], width=2)
    if ek >= 4:                                                                                                  # the sides of the smoke pit, of the place's own build
        sm = {"central": "brick", "atlantic": "brick", "northern": "rubble", "africa": "clay", "polar": "timber", "americas": "timber", "steppe": "timber",
              "oceania": "rubble", "mediterranean": "render", "islamic": "render", "southasia": "clay", "eastasia": "bamboo", "seasia": "bamboo"}.get(sty, "brick")
        for (a0, a1) in ((X0, X0 + 6), (X1 - 6, X1)): walls(d, a0, Y0 + 2, a1, Y1 - 2, sm, c)
    nr = 3 if c.poor else (5 if c.rich else 4)                                                                   # a poor rack has fewer rails
    rails = [Y0 + 8 + i * ((H - 16) // (nr - 1)) for i in range(nr)]
    for ry in rails:
        d.line([X0 + 2, ry, X1 - 2, ry], fill=OUT, width=4); d.line([X0 + 2, ry, X1 - 2, ry], fill=pole[3], width=2)
    for px_ in (X0 + 2, X1 - 4):
        if ek == 0: d.line([px_, Y0 + 2, px_ + 2, Y1 - 2], fill=pole[1], width=3)
        else: d.rectangle([px_, Y0 + 2, px_ + 3, Y1 - 2], fill=pole[1], outline=OUT)
    if ek == 2: [d.rectangle([X0 + 1, k - 1, X1 - 1, k + 1], outline=c.wood[0]) for k in rails]
    # the catch
    kind = REG_SMOKE.get(sty, "fish")
    if c.axis("catch", "local") == "herbs": kind = "herbs"
    elif c.axis("catch", "local") == "fish" and kind not in ("fruit", "chillies"): kind = "fish"
    cols = SMOKE[kind]; n = 0
    stp = {"fruit": 6, "chillies": 6, "meat": 5, "herbs": 7}.get(kind, 7 if kind not in ("sausage", "ham") else 10)
    span = W - 14; k0 = cx - (span // stp) * stp // 2
    for ry in rails:
        k = k0
        while k + stp <= cx + (span // stp) * stp // 2 + 1:
            col = cols[n % len(cols)]; n += 1
            if kind in ("fruit", "chillies"):
                for j in range(3): d.ellipse([k, ry - 2 + j * 3, k + 3, ry + 1 + j * 3], fill=col, outline=OUT)
                k += 6
            elif kind in ("sausage", "ham"):
                if kind == "ham" or n % 2: d.ellipse([k + 1, ry, k + 8, ry + 10], fill=col, outline=OUT)
                else: d.rectangle([k + 3, ry, k + 5, ry + 9], fill=col, outline=OUT)
                k += 10
            elif kind == "meat": d.rectangle([k, ry, k + 2, ry + 8], fill=col, outline=OUT); k += 5
            elif kind == "herbs": d.ellipse([k, ry - 1, k + 5, ry + 6], fill=col, outline=OUT); k += 7
            else:
                d.polygon([(k, ry), (k + 5, ry), (k + 4, ry + 9), (k + 1, ry + 9)], fill=col, outline=OUT); k += 7      # split fish, tails down
    if lit:
        return [(cx, cy, 30, WARM)]


reg("smokerack", smokerack, {"catch": ["local", "local", "fish", "herbs", "local"]},
    "a smoking or drying rack is 3 to 5 ft long over its fire pit (FAO Fishery Technical Paper 'Smoking of fish', 1983; ethnographic field drawings)",
    glob=False, metal=False, states=("out", "lit"), light={"dim": 5, "bright": 2, "color": "#ff9a40", "kind": "fire"}, nvar=16)


def limekiln(tm, x, y, w, h, st, v, c):
    """A lime kiln from above, in the stone of the place. Dark Ages: a clamp, a low mound of turf and earth over stacked
    limestone and wood with its smoke vents; Long Night: a round flare kiln of rubble, the charge showing in its bowl;
    Renaissance: a round pot of dressed stone with its draw arch to the south; Age of Reason: a square stone kiln built
    into a bank, a cart track to its top and an arched draw-eye; Victorian: a brick-lined kiln bound with iron straps
    and two draw-eyes; Great War: a pair of brick pots in a bench (one in a poor works); Mid-Century: a steel-shelled or stone-clad shaft
    kiln with its hopper and ladder. The Dark Ages clamp shows what the place burns: limestone, or shells and coral on
    the southern coasts, dung cakes on the steppe, an open pyre of logs in the Americas. From the Age of Reason to the Great War heaps of stone, coal or burnt
    lime may wait on the bank top; a poor Victorian kiln has one draw-eye, a rich one three. Lit: the charge glowing red and the smoke rising; out: the burnt lime white."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); ek = c.ek; lit = st == "lit"
    charge = (230, 110, 40) if lit else (222, 220, 210)
    ground(d, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, c)
    def bowl(cx_, cy_, r):
        d.ellipse([cx_ - r, cy_ - r, cx_ + r, cy_ + r], fill=charge, outline=OUT)
        for k in range(8): d.ellipse([cx_ - r // 2 + (k * 7) % r, cy_ - r // 2 + (k * 11) % r, cx_ - r // 2 + (k * 7) % r + 5, cy_ - r // 2 + (k * 11) % r + 4], fill=mix(charge, (120, 110, 100), .3), outline=None)
        if lit: d.ellipse([cx_ - r // 3, cy_ - r // 3, cx_ + r // 3, cy_ + r // 3], fill=(255, 200, 100))
    if ek == 0:
        d.ellipse([X0 + 6, Y0 + 10, X1 - 6, Y1 - 6], fill=ramp(TURF, 14)[2], outline=OUT)
        d.ellipse([X0 + 10, Y0 + 14, X1 - 10, Y1 - 10], fill=ramp(mix(EARTH, c.render[2], .7), 12)[2], outline=ramp(TURF, 14)[0])
        for a_ in range(0, 360, 60): ex, ey = cx + math.cos(math.radians(a_)) * W * .25, cy + math.sin(math.radians(a_)) * H * .25; d.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=charge if lit else (40, 34, 30), outline=OUT)
        for k in range(6): d.ellipse([X0 + 4 + k * 14, Y1 - 12, X0 + 14 + k * 14, Y1 - 4], fill=c.stone[2 + k % 2], outline=OUT)   # spare stone
        sty = c.style
        if sty == "americas":                                                                                  # an open pyre: a ring of logs round the charge
            for a_ in range(0, 360, 20): ex, ey = cx + math.cos(math.radians(a_)) * W * .3, cy + math.sin(math.radians(a_)) * H * .3; d.line([cx + (ex - cx) * .6, cy + (ey - cy) * .6, ex, ey], fill=c.wood[1], width=5)
        lump = ramp((232, 226, 212), 8) if sty in ("southasia", "seasia", "oceania") else (ramp((110, 84, 50), 10) if sty == "steppe" else c.stone)   # shell and coral, dung fuel, or limestone
        for k in range(12): sx_, sy_ = cx - 40 + (k * 29) % 80, cy - 34 + (k * 17) % 64; d.ellipse([sx_, sy_, sx_ + 9, sy_ + 6], fill=lump[1 + k % 3], outline=OUT)
    elif ek in (1, 2):
        r = int(W * .42); m = "rubble" if ek == 1 else "ashlar"
        Cs = ramp(mix(c.stone[2], (236, 232, 220), .25 if ek == 2 else 0), 14)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Cs[2], outline=OUT)
        for k in range(0, 360, 15 if ek == 1 else 24):
            ex, ey = cx + math.cos(math.radians(k)) * (r - 7), cy + math.sin(math.radians(k)) * (r - 7); d.ellipse([ex - 5, ey - 4, ex + 5, ey + 4], outline=Cs[0])
        bowl(cx, cy, int(r * .6))
        if ek == 2:
            walls(d, cx - 16, cy + r - 6, cx + 16, Y1, "ashlar", c); d.rectangle([cx - 8, Y1 - 12, cx + 8, Y1], fill=(30, 24, 20), outline=OUT)   # the draw arch
        else:
            d.rectangle([cx - 8, cy + r - 6, cx + 8, cy + r + 4], fill=(30, 24, 20), outline=OUT)
    elif ek in (3, 4):
        walls(d, X0, Y0, X1, Y0 + 26, "turf", c)                                                              # the bank behind
        d.rectangle([cx - 10, Y0, cx + 10, Y0 + 26], fill=ramp(EARTH, 12)[3], outline=OUT)                      # the cart track up to its top
        walls(d, X0 + 8, Y0 + 22, X1 - 8, Y1 - 4, "ashlar" if ek == 3 else "brick", c)
        bowl(cx, cy + 6, int(W * .26))
        eyes = [cx] if ek == 3 or c.poor else ([cx - 32, cx + 32] if not c.rich else [cx - 36, cx, cx + 36])          # a poor kiln has one draw-eye, a rich one three
        for ex in eyes: d.rectangle([ex - 9, Y1 - 18, ex + 9, Y1 - 4], fill=(30, 24, 20), outline=OUT); d.arc([ex - 9, Y1 - 26, ex + 9, Y1 - 10], 180, 360, fill=c.stone[4], width=2)
        if ek == 4:
            for k in (Y0 + 40, Y1 - 30): d.line([X0 + 8, k, X1 - 8, k], fill=IRON[2], width=3)                  # the iron straps
    elif ek == 5:
        walls(d, X0 + 2, Y0 + 10, X1 - 2, Y1 - 6, "brick", c)
        pots = (cx,) if c.poor else (cx - int(W * .22), cx + int(W * .22))                                       # a poor works fires one pot
        for k in pots: bowl(k, cy, int(W * .17)); d.ellipse([k - int(W * .17), cy - int(W * .17), k + int(W * .17), cy + int(W * .17)], outline=IRON[3], width=2)
        for k in pots: d.rectangle([k - 8, Y1 - 18, k + 8, Y1 - 6], fill=(30, 24, 20), outline=OUT)
    if ek in (3, 4, 5) and c.axis("pile", "none") != "none":                                                   # heaps of stone and coal waiting on the bank top
        P = {"stone": c.stone, "coal": ramp((44, 42, 44), 10), "lime": ramp((234, 232, 222), 8)}[c.axis("pile", "none")]
        for hx in (X0 + 16, X1 - 16):
            d.ellipse([hx - 11, Y0 + 2, hx + 11, Y0 + 18], fill=P[2], outline=OUT)
            for k in range(4): d.ellipse([hx - 7 + k * 4, Y0 + 6 + (k % 2) * 4, hx - 4 + k * 4, Y0 + 9 + (k % 2) * 4], fill=P[3 + k % 2])
    if ek >= 6:
        S = ramp(mix((110, 114, 118), c.stone[2], .45), 14)                                 # steel-shelled or stone-clad
        r = int(W * .36); disc(d, cx, cy, r, S)
        for k in range(0, 360, 30): d.line([cx + math.cos(math.radians(k)) * (r - 3), cy + math.sin(math.radians(k)) * (r - 3), cx + math.cos(math.radians(k)) * (r - 9), cy + math.sin(math.radians(k)) * (r - 9)], fill=S[0])
        bowl(cx, cy, int(r * .5))
        d.polygon([(cx + r - 6, cy - 20), (X1 - 2, Y0 + 4), (X1 - 2, Y0 + 30), (cx + r - 4, cy - 4)], fill=STEEL[2], outline=OUT)   # the hopper chute
        for k in range(cy - r, cy + r, 6): d.line([X0 + 4, k, X0 + 12, k], fill=IRON[3])                            # the ladder
        d.line([X0 + 4, cy - r, X0 + 4, cy + r], fill=IRON[2], width=2); d.line([X0 + 12, cy - r, X0 + 12, cy + r], fill=IRON[2], width=2)
        walls(d, cx - 20, Y1 - 16, cx + 20, Y1, "concrete", c)
    if lit:
        for k in range(3): d.ellipse([cx - 18 + k * 12, Y0 + 2 + k * 3, cx - 6 + k * 12, Y0 + 12 + k * 3], fill=(150, 146, 140), outline=None)
        return [(cx, cy, 70, WARM)]


reg("limekiln", limekiln, {"pile": ["none", "stone", "coal", "lime", "stone"]},
    "a field lime kiln is 10 to 20 ft across (Williams, Limekilns and Limeburning, 1989; Historic England, Introduction to Heritage Assets: Lime Kilns)",
    glob=False, states=("out", "lit"), light={"dim": 4, "bright": 2, "color": "#ff7a30", "kind": "fire"}, nvar=16)


DYES = [  # what was on the tenters in each age
    [(212, 202, 178), (70, 90, 130), (150, 62, 50), (200, 170, 80), (150, 146, 136)],          # Dark Ages: undyed, woad, madder, weld, grey
    [(212, 202, 178), (140, 80, 50), (70, 90, 130), (172, 40, 40), (110, 80, 60)],              # Long Night: undyed, russet, woad, scarlet, brown
    [(182, 30, 40), (40, 38, 44), (60, 80, 140), (60, 100, 70), (214, 206, 186)],               # Renaissance: scarlet, black, blue, green, undyed
    [(40, 50, 100), (182, 36, 40), (200, 180, 130), (40, 40, 44), (70, 110, 80)],               # Age of Reason: indigo, scarlet, buff, black, green
    [(130, 70, 140), (130, 130, 136), (40, 50, 90), (180, 50, 120), (220, 214, 200)],            # Victorian: mauve, grey, navy, magenta, bleached
]


def tenter(tm, x, y, w, h, st, v, c):
    """A tenter frame from above, a long rack in a field with a length of woollen cloth stretched on its hooks to dry
    and set square. The cloth is the dye of its age: undyed, woad, madder and weld in the Dark Ages; russet and scarlet
    in the Long Night; scarlet, black and green in the Renaissance; indigo and buff in the Age of Reason; the new mauve,
    magenta and navy in Victorian days. The frame grows with the ages: rough stakes, then a hooked rail with stays,
    then tall posts with struts and a pegged lower rail, iron posts by the Victorian mills. In the north the cloth is
    the grey and brown homespun wool; by the Mediterranean the posts stand on a paved terrace. Empty: the bare rails
    and their hooks."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = min(c.ek, 4); full = st == "full"; sty = c.style
    if sty == "mediterranean": walls(d, X0, Y0, X1, Y1, "ashlar", c)
    post = c.wood if ek < 4 else IRON
    pal = DYES[ek]; col = pal[(c.w + {"central": 0, "atlantic": 1, "northern": 2, "mediterranean": 3}.get(sty, 0) + int(c.axis("bolt", 0))) % len(pal)]
    if sty == "northern": col = mix(col, (150, 136, 110), .55)
    Cl = ramp(mix(col, GREY, .25) if c.poor else col, 14)
    ry0, ry1 = Y0 + 8, Y1 - 8
    if full:
        d.rectangle([X0 + 6, ry0, X1 - 6, ry1], fill=Cl[2], outline=OUT)
        for k in range(ry0 + 3, ry1, 4): d.line([X0 + 7, k, X1 - 7, k], fill=Cl[1])                             # the nap
        d.line([X0 + 7, ry0 + 1, X1 - 7, ry0 + 1], fill=Cl[4])
        if ek >= 3: d.line([X0 + 7, ry1 - 3, X1 - 7, ry1 - 3], fill=Cl[0], width=2)                              # its selvedge list
    for ry in (ry0, ry1):
        d.line([X0 + 2, ry, X1 - 2, ry], fill=OUT, width=5); d.line([X0 + 2, ry, X1 - 2, ry], fill=post[3], width=3)
        if ek >= 1 and not full:
            for k in range(X0 + 6, X1 - 4, 6): d.point((k, ry + (2 if ry == ry0 else -2)), fill=STEEL[4])        # tenterhooks
    gap = [60, 50, 44, 40, 36][ek]
    for k in range(X0 + 2, X1, gap):
        if ek == 0: d.ellipse([k - 3, ry0 - 3, k + 3, ry0 + 3], fill=post[1], outline=OUT); d.ellipse([k - 3, ry1 - 3, k + 3, ry1 + 3], fill=post[1], outline=OUT)
        else:
            for ry in (ry0, ry1): rb(d, k - 3, ry - 4, k + 3, ry + 4, post, 1)
        if ek >= 1: d.line([k, ry0 - 4, k + 6, Y0], fill=post[1], width=2)                                     # a stay
        if ek >= 2: d.line([k, ry1 + 4, k + 6, Y1], fill=post[1], width=2)
    if ek == 3:
        for k in range(X0 + 20, X1, gap): d.rectangle([k - 2, ry1 - 2, k + 2, ry1 + 2], fill=c.wood[4], outline=OUT)   # the pegs of the lower rail


reg("tenter", tenter, {"bolt": [0, 1, 2, 3, 4]},
    "a tenter frame takes a cloth up to about 20 yards long and 1 1/2 to 2 yards wide; a short field rack is 20 ft (Victoria County History; Ponting, Woollen Industry of South-West England)",
    glob=False, metal=False, states=("full", "empty"), nvar=16)


TANBARK = {"central": (110, 70, 40), "atlantic": (104, 66, 40), "northern": (150, 90, 60), "mediterranean": (170, 140, 70), "islamic": (170, 130, 60),
           "steppe": (140, 100, 60), "southasia": (90, 56, 34), "eastasia": (130, 84, 56), "seasia": (140, 50, 40), "africa": (150, 60, 40),
           "americas": (150, 70, 50), "oceania": (160, 84, 50), "polar": (150, 110, 80)}   # oak, birch, sumac, babul, mangrove, acacia, hemlock, wattle
LIQUOR = [(216, 214, 200), (150, 110, 60), (120, 80, 40), (90, 60, 34), (70, 44, 30), (170, 130, 70)]
FEZ = [(226, 222, 210), (150, 110, 60), (176, 60, 40), (210, 170, 50), (60, 100, 140), (110, 74, 40), (190, 120, 50)]


def tanpits(tm, x, y, w, h, st, v, c):
    """Tanning pits from above: the lime pits white, then the rows of tan pits darkening with oak or bark liquor, with
    walkways between and hides laid over the edge, the liquor coloured by the bark of the place: oak, birch, sumac,
    babul, mangrove, acacia, hemlock or wattle. In the Islamic world they are the honeycomb of round clay vats of a
    great tannery such as Fez's Chouara, the dye vats red, saffron and indigo among the lime and the brown. In Africa,
    round clay-lined pits in the ground. Elsewhere square pits lined in each age's way: earth in the Dark Ages, timber
    in the Long Night, stone in the Renaissance, brick in narrow rows of four in the Age of Reason, brick with plank walkways and a pump in
    Victorian days, brick pits in a concrete yard in the Great War, then all concrete with iron rails. Empty: the pits drained to their bottoms."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = c.ek; full = st == "full"; sty = c.style
    rng = __import__("random").Random(_seed(v))
    if sty in ("islamic", "africa"):
        walls(d, X0, Y0, X1, Y1, "clay" if sty == "islamic" else "earth", c)
        r = 11 if sty == "islamic" else 15; i = 0
        for j, ky in enumerate(range(Y0 + r + 2, Y1 - r, 2 * r + 4)):
            for kx in range(X0 + r + 2 + (r if j % 2 else 0), X1 - r, 2 * r + 4):
                col = (FEZ if sty == "islamic" else LIQUOR)[(i + c.w + ek) % (7 if sty == "islamic" else 6)] if full else (90, 70, 50); i += 1
                d.ellipse([kx - r, ky - r, kx + r, ky + r], fill=ramp(CLAY, 14)[3] if sty == "islamic" else ramp(EARTH, 12)[1], outline=OUT)
                d.ellipse([kx - r + 3, ky - r + 3, kx + r - 3, ky + r - 3], fill=col, outline=OUT)
        if ek >= 4: walls(d, X0, Y0, X1, Y0 + 8, "render" if ek < 7 else "concrete", c)                       # the tannery's wall and its terraces
        if ek in (1, 3, 5): [d.line([X0 + 2, k, X1 - 2, k], fill=c.wood[3]) for k in (Y0 + 12, Y1 - 4)]         # plank runs between rows
        if ek in (2, 6): d.rectangle([X1 - 22, Y1 - 20, X1 - 4, Y1 - 4], fill=c.wood[2], outline=OUT)          # a stack of hides
    else:
        lin = ["earth", "timber", "rubble", "brick", "brick", "brick", "concrete"][min(ek, 6)]
        walls(d, X0, Y0, X1, Y1, "earth" if ek < 4 else ("timber" if ek == 4 else "concrete"), c)                  # the yard floor or walkways
        cols, rows = (4 if ek == 3 else 3), 2; pw, ph = (W - 8) // cols, (H - 8) // rows                         # narrower pits in fours by the Age of Reason
        for j in range(rows):
            for i in range(cols):
                px0, py0 = X0 + 4 + i * pw, Y0 + 4 + j * ph
                walls(d, px0, py0, px0 + pw - 6, py0 + ph - 6, lin, c)
                col = mix(LIQUOR[(i + j * cols + c.w) % 6], TANBARK.get(sty, (110, 70, 40)), .5) if full else (80, 64, 46)
                d.rectangle([px0 + 4, py0 + 4, px0 + pw - 10, py0 + ph - 10], fill=col, outline=OUT)
                if full and rng.random() < .5: d.polygon([(px0 + 4, py0 + 4), (px0 + 22, py0 + 4), (px0 + 18, py0 + 14), (px0 + 4, py0 + 12)], fill=(200, 170, 130), outline=OUT)   # a hide
        if ek == 4: rb(d, X1 - 16, cy - 8, X1 - 4, cy + 8, IRON, 2)                                             # the pump
        if ek >= 5: [d.line([X0 + 2, k, X1 - 2, k], fill=IRON[3], width=2) for k in (cy - 2,)]
    if c.poor: d.rectangle([X0 + 6, Y1 - 12, X0 + 24, Y1 - 4], fill=(110, 90, 60), outline=OUT)               # a heap of bark


reg("tanpits", tanpits, {},
    "a tan pit is about 6 by 4 ft and a yard holds rows of them (Clarkson, 'The Manufacture of Leather', 1983; the Chouara tannery, Fez)",
    glob=False, states=("full", "empty"), nvar=16)


VESSEL = {"central": "copper", "atlantic": "copper", "northern": "copper", "mediterranean": "copper", "islamic": "copper", "steppe": "cauldron",
          "southasia": "degchi", "eastasia": "kama", "seasia": "clay", "africa": "clay", "americas": "clay", "oceania": "clay", "polar": "cauldron"}


def brewcopper(tm, x, y, w, h, st, v, c):
    """A brewing vessel from above on its fire. The old vessel is the place's own: a copper in a brick or stone setting
    in the West and the Islamic world, an iron cauldron on the steppe and in the far north, a brass degchi on a mud
    stove in South Asia, the iron kama with its wooden steamer tub in East Asia, big clay beer pots on the hearth in
    Southeast Asia, Africa, the Americas and Oceania. The hearth grows with the ages: three stones, a clay ring, a
    brick or clay stove, a dressed stone or rendered setting with its flue, an iron-bound brick setting, then a
    limewashed setting under a sheet-iron hood. From the Mid-Century the brewhouse
    is the same everywhere: a steam-jacketed copper on a plinth (tiled or clad in the brewery's colour, or
    plated, terrazzo or chequered tiles with a coloured kerb), then stainless steel on a plinth clad in the
    brewery's colour with its gauges and control box, then a dark sealed vessel with lit read-outs. Lit: the fire glowing under and the steam rising."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = c.ek; lit = st == "lit"; sty = c.style
    r = int(W * .34)
    if ek <= 5:
        vk = VESSEL.get(sty, "copper"); ground(d, X0, Y0, X1, Y1, c)
        if ek == 0: [disc(d, cx + math.cos(math.radians(a_)) * (r + 6), cy + math.sin(math.radians(a_)) * (r + 6), 7, c.stone) for a_ in (90, 210, 330)]
        elif ek == 1: d.ellipse([cx - r - 9, cy - r - 9, cx + r + 9, cy + r + 9], fill=ramp(mix(CLAY, c.render[2], .4), 14)[2], outline=OUT)
        else:
            hot = sty in ("islamic", "southasia", "africa", "americas")
            walls(d, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, {2: "clay" if hot else "brick", 3: "render" if hot else "ashlar", 4: "brick", 5: "render"}[ek], c)
        if ek >= 3: walls(d, X0 + 4, Y0, X0 + 20, Y0 + 14, "brick", c)                                         # the flue
        if ek >= 4: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=IRON[2], width=3)                      # iron binding
        if ek == 5: d.rectangle([X0 + 8, Y0 + 6, X1 - 8, Y0 + 14], fill=ramp((90, 92, 96), 10)[2], outline=OUT)   # a sheet-iron hood
        d.rectangle([cx - 8, Y1 - 10, cx + 8, Y1 - 1], fill=(250, 150, 50) if lit else (40, 32, 28), outline=OUT)   # the stoke hole
        M = {"copper": COPPER, "cauldron": IRON, "degchi": BRASS, "kama": IRON, "clay": ramp(CLAY, 16)}[vk]
        if vk == "clay":
            for k, (ox, oy) in enumerate(((-.4, -.3), (.4, -.3), (0, .35))): disc(d, cx + ox * W * .55, cy + oy * H * .55, int(r * .55), M); d.ellipse([cx + ox * W * .55 - 6, cy + oy * H * .55 - 6, cx + ox * W * .55 + 6, cy + oy * H * .55 + 6], fill=(150, 110, 60) if c.axis("brew", "wort") != "empty" else (40, 30, 24))
        else:
            disc(d, cx, cy, r, M); d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=(150, 104, 50) if c.axis("brew", "wort") != "empty" else (40, 30, 24), outline=OUT)
            if vk == "kama": ring(d, cx, cy, r - 6, c.wood, 4)                                                  # the steamer tub
            if vk == "copper" and ek >= 2: d.pieslice([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], 180, 360, fill=c.wood[2], outline=OUT)   # half its wooden lid
    else:
        S = COPPER if ek == 6 else (STEEL if ek == 7 else ramp(mix(COMPOSITE[2], STEEL[2], .3), 14))
        L_ = ramp(LIV.get(c.make, LIV["grey"]), 16)
        pl = c.axis("plinth", "clad")                                                                         # the plinth: clad in the brewery's colour, or tiled, plated or terrazzo with a coloured kerb
        if pl == "clad":
            rb(d, X0, Y0, X1, Y1, L_ if ek < 8 else ramp(mix(COMPOSITE[2], L_[2], .8), 14), 3)
            if ek == 6: [d.line([X0 + 1, k, X1 - 1, k], fill=L_[1]) for k in range(Y0 + 8, Y1, 8)]; [d.line([k, Y0 + 1, k, Y1 - 1], fill=L_[1]) for k in range(X0 + 8, X1, 8)]
        else: floor_under(d, X0, Y0, X1, Y1, c, pl); d.rectangle([X0, Y0, X1, Y1], outline=L_[2] if ek < 8 else c.glow[0], width=3)
        disc(d, cx, cy, r + 4, S); d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=S[4] if c.axis("brew", "wort") != "empty" else (40, 36, 34), outline=OUT)   # the domed top and its manway, open when empty
        cable(d, [(cx + r, cy - 6), (X1 - 2, Y0 + 6)], ramp((150, 150, 150), 12), 3)                            # the steam or wort pipe
        if ek >= 7: rb(d, X0 + 2, Y1 - 16, X0 + 22, Y1 - 2, ramp(LIV.get(c.make, LIV["grey"]), 16), 1); screen(d, X0 + 5, Y1 - 13, X0 + 19, Y1 - 6, lit, c.glow)
        else: ring(d, X0 + 10, Y1 - 10, 5, BRASS, 1)                                                           # a steam gauge
        rb(d, X1 - 18, Y1 - 18, X1 - 2, Y1 - 2, ramp(LIV.get(c.make, LIV["grey"]), 16), 2)                       # the maker's pump box
    if lit:
        for k in range(3): d.ellipse([cx - 14 + k * 9, cy - r - 4 - k * 3, cx - 4 + k * 9, cy - r + 4 - k * 3], fill=(226, 226, 222))
        return [(cx, Y1 - 6, 40, WARM)]


reg("brewcopper", brewcopper, {"make": ["grey", "green", "blue", "red", "cream", "black", "silver"], "brew": ["wort", "wort", "empty", "wort"],
                               "plinth": ["clad", "tiles", "plate", "terrazzo", "clad", "check"]},
    "a brewhouse copper holds 2 to 20 barrels and stands 4 to 6 ft across in its setting (Sambrook, Country House Brewing in England, 1996)",
    glob=1919, states=("out", "lit"), light={"dim": 3, "bright": 1, "color": "#ff8a30", "kind": "fire"}, nvar=32)


GLASS = {"central": [(90, 140, 70), (120, 150, 80)], "northern": [(90, 140, 70), (70, 110, 60)], "atlantic": [(110, 150, 120), (200, 210, 200)],
         "mediterranean": [(220, 230, 230), (60, 90, 160)], "islamic": [(40, 140, 160), (60, 80, 170)], "steppe": [(90, 130, 90), (150, 120, 60)],
         "southasia": [(200, 40, 80), (230, 180, 40)], "eastasia": [(200, 60, 50), (230, 220, 200)], "seasia": [(60, 130, 160), (200, 150, 50)],
         "africa": [(40, 60, 140), (40, 120, 90)], "americas": [(110, 150, 120), (200, 210, 200)], "oceania": [(90, 140, 120), (200, 200, 190)],
         "polar": [(110, 150, 120), (200, 210, 200)]}


def glassfurnace(tm, x, y, w, h, st, v, c):
    """A glass furnace from above, its glory holes round the edge, the pots of melt within, the wood or coal by it and
    newly blown pieces on the marver bench. Dark Ages and Long Night: a round clay-and-stone beehive with its side
    annealing chamber; Renaissance and Age of Reason: an oblong furnace with arched working holes, coal-fired by the
    Age of Reason with its grate and iron bands; Victorian: the round furnace of a glass cone with its ring of pots;
    Great War: an oblong brick furnace with steel buckstays. A heap of cullet lies by it. The glass is the place's own: green forest glass in the middle lands and the north,
    clear cristallo and blue by the Mediterranean, turquoise and cobalt in the Islamic world, red and yellow bangle
    glass in South Asia, blue and green bead glass in Africa. From the Mid-Century it is the same everywhere: a tank
    furnace in steel, a studio glory hole and annealer in Modern times, a dark sealed unit after, on a works floor of concrete, steel plate, a painted bay, boards or tiles. Lit: the holes white
    hot."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 2); ek = c.ek; lit = st == "lit"; sty = c.style
    hot = (255, 230, 150) if lit else (40, 30, 26)
    gl = GLASS.get(sty, GLASS["central"]) if ek < 6 else [ART.get(c.axis("glass", "blue"), (60, 90, 170)), (220, 226, 230)]
    def holes(pts, r=6):
        for (hx, hy) in pts: d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=hot, outline=OUT)
    if ek < 6: ground(d, X0, Y0, X1, Y1, c)
    else: floor_under(d, X0, Y0, X1, Y1, c, c.axis("floor", "concrete"))                                       # the works floor
    if ek <= 1:
        R = int(W * .36); m = c.stone if ek == 0 else ramp(mix(c.stone[2], CLAY, .4), 14)
        disc(d, cx, cy, R, m); d.ellipse([cx - R + 8, cy - R + 8, cx + R - 8, cy + R - 8], outline=m[0])
        holes([(cx + math.cos(math.radians(a_)) * (R - 6), cy + math.sin(math.radians(a_)) * (R - 6)) for a_ in ((30, 150, 270) if ek == 0 else (0, 90, 180, 270))])
        if ek == 1: rb(d, X1 - 30, Y0 + 2, X1 - 2, Y0 + 40, m, 4)                                              # the annealing chamber
        for k in range(5): d.line([X0 + 2, Y1 - 4 - k * 4, X0 + 40, Y1 - 4 - k * 4], fill=c.wood[1 + k % 3], width=3)   # the wood stack
    elif ek == 4:                                                                                              # the round furnace of a glass cone, its pots in a ring
        R = int(W * .4); B_ = ramp(mix(BRICK, c.stone[2], .45), 16)
        disc(d, cx, cy - 8, R, B_); d.ellipse([cx - R + 10, cy - 8 - R + 10, cx + R - 10, cy - 8 + R - 10], outline=B_[0], width=2)
        holes([(cx + math.cos(math.radians(a_)) * (R - 8), cy - 8 + math.sin(math.radians(a_)) * (R - 8)) for a_ in range(0, 360, 45)], 5)
        d.ellipse([cx - 10, cy - 18, cx + 10, cy + 2], fill=(30, 30, 32), outline=OUT)                         # the central grate
    elif ek <= 5:
        mat = ["", "", "rubble", "brick", "brick", "brick"][ek]
        walls(d, X0 + 10, Y0 + 14, X1 - 10, Y1 - 30, mat, c)
        holes([(k, Y1 - 34) for k in range(X0 + 26, X1 - 20, 26)], 6)
        if ek >= 3:
            for k in range(X0 + 10, X1 - 9, 30): d.line([k, Y0 + 14, k, Y1 - 30], fill=IRON[2] if ek < 5 else STEEL[2], width=3)   # iron bands, then buckstays
        if ek == 3: d.rectangle([cx - 14, Y0 + 2, cx + 14, Y0 + 14], fill=(30, 30, 32), outline=OUT)            # the coal grate and ash pit
        if ek == 4: [walls(d, k, Y0 + 2, k + 16, Y0 + 14, "brick", c) for k in (X0 + 14, X1 - 30)]              # the regenerator flues
        if ek == 2: rb(d, X1 - 30, Y0 + 2, X1 - 8, Y0 + 14, c.stone, 2)
    else:
        S = STEEL if ek < 8 else ramp(mix(COMPOSITE[2], STEEL[2], .3), 14)
        L_ = ramp(LIV.get(c.make, LIV["grey"]), 16)
        if ek == 6:                                                                                            # a tank furnace, its crown and the steel in the maker's paint
            walls(d, X0 + 4, Y0 + 4, X1 - 4, Y1 - 30, "brick", c); [d.line([k, Y0 + 4, k, Y1 - 30], fill=L_[2], width=6) for k in range(X0 + 4, X1, 20)]
            rb(d, X0 + 4, Y0 + 4, X1 - 4, Y0 + 44, L_, 1)
            holes([(k, Y1 - 34) for k in range(X0 + 20, X1 - 14, 22)], 5)
        elif ek == 8:                                                                                          # one dark sealed unit, its hole ringed with light
            rb(d, X0 + 4, Y0 + 4, X1 - 4, Y1 - 40, ramp(mix(COMPOSITE[2], L_[2], .8), 14), 10)
            d.ellipse([cx - 22, cy - 34, cx + 22, cy + 10], outline=c.glow[1 if lit else 0], width=3); holes([(cx, cy - 12)], 12)
            screen(d, X0 + 12, Y0 + 10, X0 + 40, Y0 + 22, lit, c.glow)
        else:
            rb(d, X0 + 4, Y0 + 4, cx - 4, Y1 - 40, ramp(LIV.get(c.make, LIV["grey"]), 16), 3); holes([((X0 + cx) // 2, Y1 - 44)], 8)   # the glory hole
            rb(d, cx + 4, Y0 + 4, X1 - 4, Y1 - 40, ramp(mix(S[2], L_[2], .8), 14), 3); d.rectangle([cx + 10, Y1 - 46, X1 - 10, Y1 - 42], fill=OUT)   # the annealer
            screen(d, cx + 10, Y0 + 10, cx + 30, Y0 + 20, lit, c.glow)
    if True:                                                                                                   # a heap of cullet, broken glass for the next melt
        d.ellipse([X1 - 44, Y0 + 2, X1 - 2, Y0 + 28], fill=mix(gl[0], (40, 40, 40), .15), outline=OUT)
        for k in range(6): d.point((X1 - 30 + k * 5, Y0 + 8 + (k * 3) % 8), fill=(240, 246, 240))
    # the marver bench and the new glass on it
    walls(d, X0 + 4, Y1 - 22, X1 - 4, Y1 - 6, "timber" if ek < 6 else "steel", c)
    for k in range(6): disc(d, X0 + 16 + k * ((W - 30) // 6), Y1 - 14, 5, ramp(gl[k % 2], 16))
    if lit: return [(cx, cy, 60, WARM)]


reg("glassfurnace", glassfurnace, {"make": ["grey", "blue", "black", "red", "green", "silver", "orange"], "glass": ["blue", "green", "red", "yellow", "purple"],
                                   "floor": ["concrete", "plate", "bay", "boards", "bare", "tiles"]},
    "a small glass furnace with its working floor takes 6 to 10 ft square (Theophilus, De diversis artibus; Agricola, De re metallica, 1556; studio furnace makers' sheets)",
    glob=1919, states=("out", "lit"), light={"dim": 3, "bright": 1, "color": "#ffb050", "kind": "fire"}, nvar=40)


KENNEL_DOG = {"brown": (130, 86, 50), "black": (40, 36, 34), "white": (226, 222, 210), "tan": (196, 150, 90), "grey": (130, 128, 124), "red": (170, 90, 50)}


def kennel(tm, x, y, w, h, st, v, c):
    """A dog kennel from above: a small roofed box with its door to the south, the dog lying out in front when full.
    Dark Ages: a little round wattle hut under a thatch cone; Long Night: planks under a gabled board roof; Renaissance: a hipped
    roof of silvered shingles; Age of Reason: a gabled tile roof with a little porch over the door and finials;
    Victorian: a barrel on its side, its staves and iron hoops, where barrels were to be had; Great War: a tin roof;
    Mid-Century: a felt roof and a blanket at the door. Each roof takes the tone of the place's own roofing (red tile,
    slate, turf, terracotta, dark tile, grass); in the hot lands the walls are mud render, and in Africa it is a little
    round hut under a grass cone until the Great War. From Modern times it is a moulded plastic kennel in a maker's
    colour (a rounded box, an igloo dome or a gabled house), then a dark composite pod of the same shapes. Full: the dog lying out in front on its chain."""
    d = tm.d; X0, Y0, X1, Y1, W, H, cx, cy = frame(x, y, w, h, 1); ek = c.ek; full = st == "full"; sty = c.style
    ky1 = Y1 - (22 if full else 6)
    if ek <= 6:
        roofm = ["thatch", "boards", "shingle", "tile", "slate", "tin", "felt"][ek]
        R = {"thatch": ramp((176, 150, 90), 16), "boards": c.wood, "shingle": ramp((112, 110, 104), 12), "tile": c.roof,
             "slate": ramp((80, 84, 96), 12), "tin": ramp((150, 156, 160), 16), "felt": ramp((50, 52, 56), 10)}[roofm]
        R = ramp(mix(R[2], c.roof[2], 1 if roofm == "tin" else .5), 16)                                          # tin painted to match the place's roofs                                                                 # half the age's roofing, half the place's own
        wallm = "render" if sty in ("islamic", "africa", "southasia") else "timber"
        walls(d, X0 + 2, Y0 + 2, X1 - 2, ky1, wallm, c)
        if ek == 4 and sty not in ("africa", "islamic", "southasia"):                                         # Victorian: a barrel on its side, hoops across, staves along
            Bw = ramp(mix(c.wood[2], R[2], .3), 16)
            rb(d, X0 + 2, Y0 + 2, X1 - 2, ky1, Bw, 8); d.rectangle([X0 + 4, Y0 + 3, cx, ky1 - 2], fill=Bw[3])         # its lit west side
            for k in range(X0 + 6, X1 - 4, 5): d.line([k, Y0 + 4, k, ky1 - 2], fill=Bw[1])
            for k in (Y0 + 8, (Y0 + ky1) // 2, ky1 - 8): d.line([X0 + 2, k, X1 - 2, k], fill=IRON[1], width=2)
            d.line([X0 + 6, Y0 + 3, X0 + 6, ky1 - 3], fill=Bw[4], width=2)
        elif (sty == "africa" and ek < 5) or ek == 0:                                                           # a little round hut of mud or wattle under a grass or thatch cone
            d.ellipse([X0, Y0, X1, ky1], fill=R[2], outline=OUT)
            for a_ in range(0, 360, 30): d.line([cx, (Y0 + ky1) // 2, cx + math.cos(math.radians(a_)) * (W // 2 - 2), (Y0 + ky1) // 2 + math.sin(math.radians(a_)) * ((ky1 - Y0) // 2 - 2)], fill=R[1 if 90 < a_ < 270 else 3])
        else:
            d.polygon([(X0, Y0), (cx, Y0), (cx, ky1 - 4), (X0, ky1 - 4)], fill=R[3], outline=OUT)                # the lit west slope
            d.polygon([(cx, Y0), (X1, Y0), (X1, ky1 - 4), (cx, ky1 - 4)], fill=R[1], outline=OUT)
            st_ = {"thatch": 3, "boards": 6, "shingle": 5, "tile": 4, "slate": 5, "tin": 3, "felt": 9}[roofm]
            for k in range(Y0 + st_, ky1 - 4, st_):
                if roofm == "tin": d.line([X0 + 1, k, X1 - 1, k], fill=R[3])
                else: d.line([X0 + 1, k, cx - 1, k], fill=R[2]); d.line([cx + 1, k, X1 - 1, k], fill=R[0])
            if roofm == "tin": [d.line([k, Y0 + 1, k, ky1 - 5], fill=R[3] if k < cx else R[1]) for k in range(X0 + 3, X1, 6)]
            d.line([cx, Y0, cx, ky1 - 4], fill=R[4], width=2)
            if ek == 2:                                                                                        # hipped: the end slopes run down to the ridge's ends
                rt, rbm = Y0 + (ky1 - Y0) // 4, ky1 - 4 - (ky1 - Y0) // 4
                d.line([cx, Y0, cx, ky1 - 4], fill=R[2], width=2); d.line([cx, rt, cx, rbm], fill=R[4], width=2)
                d.polygon([(X0, Y0), (X1, Y0), (cx, rt)], fill=R[4], outline=OUT); d.polygon([(X0, ky1 - 4), (X1, ky1 - 4), (cx, rbm)], fill=R[0], outline=OUT)
            if ek == 3:                                                                                        # a little porch roof over the door, finials on the ridge
                rb(d, cx - 12, ky1 - 10, cx + 12, ky1 + 1, R, 1); disc(d, cx, Y0 + 2, 3, R); disc(d, cx, ky1 - 6, 3, R)
            if ek == 0: [d.line([X0 + 2, k, X1 - 2, k + 2], fill=c.wood[0]) for k in range(Y0 + 8, ky1 - 6, 8)]
        if ek >= 4 and sty not in ("islamic", "africa", "southasia"):
            d.rectangle([X0 + 2, ky1 - 4, X1 - 2, ky1], fill=ramp(LIV.get(("green", "red", "cream", "blue", "white", "maroon", "black")[c.w % 7], (70, 104, 82)), 14)[2], outline=OUT)   # the painted front
        d.rectangle([cx - 7, ky1 - 4, cx + 7, ky1 + 2], fill=(26, 22, 20), outline=OUT)                         # the door
        if ek == 6: d.rectangle([cx - 9, ky1 + 1, cx + 9, ky1 + 6], fill=(150, 60, 50), outline=OUT)             # a blanket
    else:
        P = ramp(LIV.get(c.make, LIV["grey"]), 16) if ek == 7 else ramp(mix(COMPOSITE[2], LIV.get(c.make, LIV["grey"]), .5), 14)
        mod = c.axis("model", "box")
        if mod == "igloo": d.ellipse([X0 + 2, Y0 + 2, X1 - 2, ky1 + 2], fill=P[2], outline=OUT); d.ellipse([X0 + 9, Y0 + 9, X1 - 9, ky1 - 6], outline=P[4], width=2)   # a round dome
        elif mod == "gable":                                                                                     # a moulded gabled roof, its two pitches
            rb(d, X0 + 2, Y0 + 2, X1 - 2, ky1, P, 3); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, ky1 - 2], fill=P[2])
            for k in (cx - 8, cx + 8): d.line([k, Y0 + 4, k, ky1 - 3], fill=P[1])
            d.line([cx, Y0 + 2, cx, ky1 - 1], fill=OUT, width=2)
        else: rb(d, X0 + 2, Y0 + 2, X1 - 2, ky1, P, 10); d.ellipse([X0 + 8, Y0 + 8, X1 - 8, ky1 - 8], outline=P[4], width=2)
        rb(d, X0 + 6, ky1 - 6, X1 - 6, ky1 + 2, ramp(LIV.get("cream" if c.make != "cream" else "green"), 14), 2)
        d.rectangle([cx - 7, ky1 - 4, cx + 7, ky1 + 2], fill=(26, 22, 20), outline=OUT)
        if ek == 8: lamp(d, X1 - 8, Y0 + 8, 2, True, c.glow[2])
    if full:
        D = ramp(KENNEL_DOG.get(c.axis("dog", "brown"), (130, 86, 50)), 16)
        d.ellipse([cx - 14, Y1 - 18, cx + 10, Y1 - 6], fill=D[2], outline=OUT)                                    # curled body
        d.ellipse([cx + 4, Y1 - 20, cx + 16, Y1 - 10], fill=D[3], outline=OUT); d.point((cx + 12, Y1 - 16), fill=OUT)   # head
        d.ellipse([cx + 7, Y1 - 22, cx + 10, Y1 - 18], fill=D[1])                                               # ear
        d.line([cx - 14, Y1 - 12, cx - 20, Y1 - 8], fill=D[1], width=2)                                         # tail
        d.line([cx, ky1 + 2, cx + 6, Y1 - 14], fill=IRON[3] if ek < 7 else (200, 60, 60))                       # chain or lead
        disc(d, X1 - 10, Y1 - 8, 4, STEEL if ek >= 5 else ramp(CLAY, 14))                                       # the water bowl


reg("kennel", kennel, {"make": ["green", "blue", "red", "grey", "beige", "black", "yellow"], "dog": list(KENNEL_DOG), "model": ["box", "igloo", "gable"]},
    "a dog kennel for a farm dog is about 3 by 4 ft (Stonehenge, The Dog in Health and Disease, 1859; Petmate catalogues)",
    glob=1990, metal=False, states=("full", "empty"), nvar=40)
