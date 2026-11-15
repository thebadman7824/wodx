"""Hearths, heat and cooking (B6346): every census row of the "hearths" family, drawn in every era it spans, seen
from straight above with its front (the fire's mouth, the stoking side) toward the south.

Each drawing honours the variation it is given:
    era        the form and making of the age (a raised stone hearth, a brick range, an enamel cooker, a lit panel)
    wealth     0 and 1 rough and patched, 2 and 3 sound and plain, 4 and 5 carved, tiled, brass-railed and crowded
    style      the region's own stone, clay, timber, glaze and pattern (STY below)
    condition  worn (soot, scuffs, a chipped corner), broken (a crack, fallen stones, a missing piece)
    own axes   fuel, what is cooking, the glaze, the build of a fire
Fires have two states, "lit" (flames, embers, warm light on the stones round them and a glow for the map in
tm.hearths) and "out" (cold grey ash and charred ends), drawn for every variation, and a `light` the game lights.

The shared kit at the top (palettes for each style, the fire, wear and breakage, patterns) is also used by
fam_lights_water.py."""
import math
import zlib

import numpy as np
from PIL import Image

from px import OUT
from library.core import define, YEAR_END
from library.census import ERAS
from library.art import ramp, tone, mix, slab, rivet, knob, box_px, OAK, DEAL, WALNUT, IRON, BRASS, STEEL, WHITE, LINEN, COMPOSITE, GLOW, PLASTIC_WHITE, PLASTIC_GREY

E = YEAR_END
EI = {k: i for i, (k, *_r) in enumerate(ERAS)}
AGE_ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century", "modern": "modern", "Future Darkness": "future-darkness"}
LOOKS = tuple((a, b, lab, {"era": k}) for k, a, b, lab in ERAS)

# ---------------------------------------------------------------- palettes
STONE = ramp((150, 146, 138), 18, (0, 0, 4))
BRICK = ramp((156, 82, 58), 18)
CLAY = ramp((176, 108, 68), 18)
SLATE = ramp((70, 74, 82), 14, (0, 2, 6))
CREAM = ramp((226, 214, 178), 10)
COPPER = ramp((184, 104, 60), 22)
SOOT = [(14, 12, 14), (26, 22, 24), (40, 34, 34), (58, 50, 48), (78, 70, 66)]
ASH = ramp((120, 116, 112), 14, (0, 0, 2))
WATER = [(20, 40, 70), (34, 70, 104), (54, 104, 140), (100, 150, 176), (170, 210, 220)]
FIREC = [(58, 12, 14), (124, 26, 18), (196, 62, 20), (238, 124, 30), (252, 190, 66), (255, 236, 164)]
GOLD = ramp((200, 160, 60), 24)
SILVER = ramp((180, 182, 186), 20, (0, 1, 3))
CHROME = ramp((176, 186, 196), 26, (0, 2, 5))
ENAMELS = {"cream": CREAM, "white": ramp((232, 230, 224), 9), "green": ramp((96, 150, 112), 16), "blue": ramp((84, 120, 170), 16),
           "red": ramp((176, 60, 50), 18), "black": ramp((52, 52, 58), 14), "steel": STEEL, "brown": ramp((120, 80, 52), 16)}

# each region's own materials: hearth stone, timber, render or clay, the dye or paint, a second dye, glaze, metal, pattern
STY = {
    "central":       dict(stone=(150, 146, 138), wood=(182, 150, 104), plaster=(222, 214, 196), acc=(66, 120, 78), acc2=(170, 52, 44), tile=(66, 116, 92), metal="iron", pat="flowers"),
    "atlantic":      dict(stone=(118, 118, 116), wood=(150, 112, 70), plaster=(206, 198, 180), acc=(128, 36, 60), acc2=(226, 214, 170), tile=(196, 200, 214), metal="brass", pat="check"),
    "northern":      dict(stone=(108, 112, 126), wood=(150, 62, 46), plaster=(196, 190, 176), acc=(60, 100, 190), acc2=(210, 170, 70), tile=(226, 220, 200), metal="iron", pat="scroll"),
    "mediterranean": dict(stone=(216, 200, 166), wood=(104, 66, 44), plaster=(240, 236, 226), acc=(196, 100, 48), acc2=(48, 90, 160), tile=(200, 112, 66), metal="iron", pat="tiles"),
    "islamic":       dict(stone=(204, 182, 142), wood=(120, 80, 50), plaster=(232, 222, 200), acc=(30, 140, 170), acc2=(230, 230, 220), tile=(40, 118, 156), metal="brass", pat="star"),
    "steppe":        dict(stone=(140, 130, 108), wood=(196, 96, 40), plaster=(210, 196, 160), acc=(150, 30, 40), acc2=(60, 140, 190), tile=(206, 130, 44), metal="iron", pat="horn"),
    "southasia":     dict(stone=(176, 112, 86), wood=(132, 86, 44), plaster=(222, 196, 150), acc=(200, 60, 130), acc2=(230, 120, 30), tile=(230, 190, 90), metal="brass", pat="lotus"),
    "eastasia":      dict(stone=(112, 112, 108), wood=(44, 34, 34), plaster=(232, 228, 214), acc=(210, 64, 30), acc2=(30, 30, 36), tile=(120, 170, 140), metal="bronze", pat="lattice"),
    "seasia":        dict(stone=(130, 122, 100), wood=(196, 174, 104), plaster=(200, 178, 128), acc=(100, 64, 140), acc2=(150, 90, 40), tile=(150, 130, 60), metal="brass", pat="weave"),
    "africa":        dict(stone=(172, 92, 62), wood=(98, 60, 40), plaster=(124, 80, 58), acc=(226, 180, 40), acc2=(90, 140, 60), tile=(170, 70, 40), metal="iron", pat="zigzag"),
    "americas":      dict(stone=(186, 154, 112), wood=(132, 100, 70), plaster=(206, 164, 122), acc=(40, 170, 130), acc2=(180, 30, 60), tile=(90, 130, 160), metal="iron", pat="fret"),
    "oceania":       dict(stone=(72, 68, 66), wood=(112, 70, 40), plaster=(214, 192, 150), acc=(124, 52, 30), acc2=(30, 26, 24), tile=(150, 110, 70), metal="iron", pat="tapa"),
    "polar":         dict(stone=(112, 124, 112), wood=(176, 166, 146), plaster=(192, 170, 132), acc=(150, 170, 190), acc2=(150, 60, 40), tile=(222, 214, 190), metal="iron", pat="dots"),
}
# makers' liveries for mass-made things that look the same the world over (global_from): no people's colours
LIVERY = {"white": (232, 232, 228), "grey": (130, 132, 138), "black": (40, 40, 44), "beige": (212, 198, 168), "red": (176, 36, 32),
          "blue": (46, 80, 150), "green": (56, 110, 72), "chrome": (192, 198, 206), "yellow": (222, 182, 30), "orange": (222, 112, 30)}
STY["global"] = dict(stone=(150, 150, 148), wood=(140, 110, 80), plaster=(222, 220, 214), acc=(120, 124, 130), acc2=(60, 62, 68), tile=(200, 200, 198), metal="steel", pat=None)
METALS = {"iron": IRON, "brass": BRASS, "bronze": ramp((150, 110, 60), 20), "copper": COPPER, "silver": SILVER, "gold": GOLD, "steel": STEEL, "chrome": CHROME}


def _sat(c, f):
    m = sum(c) / 3
    return tuple(int(max(0, min(255, m + (x - m) * f))) for x in c)


def era_tint(c, e):
    """The age's own cast on a region's colours, so each era reads apart: the Long Night's soot and grime of the plague
    years, the Renaissance's strong new dyes, the Age of Reason's pale limewash and pastels, Victorian soot and dark
    stains, the Great War's drab, Mid-Century's bright enamels, Modern's clean pale finishes, Future Darkness's dark."""
    if e == 1: return mix(c, (64, 54, 46), .22)
    if e == 2: return _sat(c, 1.3)
    if e == 3: return mix(c, (236, 230, 216), .22)
    if e == 4: return mix(c, (74, 44, 38), .22)
    if e == 5: return mix(_sat(c, .6), (124, 118, 92), .2)
    if e == 6: return _sat(mix(c, (250, 246, 236), .1), 1.35)
    if e == 7: return mix(_sat(c, .8), (214, 214, 212), .28)
    if e == 8: return mix(c, (40, 44, 56), .3)
    return c


def era_grade(a, e):
    """The age's cast laid over a drawing's pixels (H x W x 3 floats): the Long Night darker and smokier (the plague
    years), the Renaissance's stronger dyes, the Age of Reason paler and limewashed, Victorian soot browns, the Great
    War's drab, Mid-Century's bright enamels, Modern's clean cool light, Future Darkness dark and blue. A shift, not a
    wash, so the regions keep their difference."""
    if e in (2, 6):
        m = a.mean(2, keepdims=True); a = m + (a - m) * 1.3
    off = {1: (-24, -26, -28), 3: (18, 14, 6), 4: (-10, -24, -28), 5: (6, 2, -24), 6: (22, 6, -4), 7: (6, 14, 22), 8: (-30, -24, -8)}.get(e)
    if off: a = a + np.array(off, np.float32)
    return a


class K:
    """The variation, read once: era (and its index e), wealth w, style and its palette, condition, state."""
    def __init__(s, v, st="one"):
        s.v = v; s.st = st
        s.era = v.get("era") or AGE_ERA.get(v.get("age"), "dark-ages"); s.e = EI[s.era]
        s.w = int(v.get("wealth", 2)); s.style = v.get("style") or ("global" if v.get("_global") else "central"); s.cond = v.get("condition", "new")
        p = STY.get(s.style, STY["central"])
        if s.style == "global":                                         # one look worldwide: the maker's livery, not a people's dye
            p = dict(p); lv = LIVERY.get(v.get("livery"), p["acc"]); p["acc"] = lv; p["tile"] = mix(lv, (200, 200, 198), .5); p["acc2"] = mix(lv, (40, 40, 44), .6)
        s.P = p
        s.stone, s.wood, s.plaster = ramp(p["stone"], 16, (0, 0, 3)), ramp(p["wood"], 18), ramp(p["plaster"], 12)
        s.acc, s.acc2, s.tile = ramp(p["acc"], 20), ramp(p["acc2"], 20), ramp(p["tile"], 18)
        s.metal = METALS["gold" if s.w >= 5 else "brass" if s.w >= 4 and p["metal"] == "iron" else p["metal"]]
        s.enam = ramp(mix(p["tile"], (232, 228, 218), .25 if s.w >= 2 else .5), 14)
        s.fd = ramp(mix((58, 64, 74), p["acc"], .55), 14); s.fdglow = mix(p["acc"], (200, 250, 255), .45)
        if s.style == "global": s.enam = ramp(mix(p["acc"], (240, 240, 236), .1), 14); s.fd = ramp(mix((58, 64, 74), p["acc"], .7), 14)
        s.lit = st not in ("out", "empty")
        s.poor, s.rich = s.w <= 1, s.w >= 4
        s.worn, s.broken = s.cond == "worn", s.cond == "broken"
        s.med, s.early, s.vic, s.c20, s.modern, s.future = s.e <= 1, s.e in (2, 3), s.e == 4, s.e in (5, 6), s.e == 7, s.e == 8
        s.rng = np.random.default_rng(zlib.crc32(repr(sorted((k, str(x)) for k, x in v.items() if k not in ("vid", "age", "_global"))).encode()))

    def get(s, k, default=None): return s.v.get(k, default)

    def mat(s):
        """The region's building stuff for a furnace or kiln: (ramp, kind) with kind brick, render, mud or stone."""
        st = s.style
        if st in ("central", "atlantic", "northern"): return {"central": BRICK, "atlantic": ramp((176, 146, 100), 16), "northern": ramp((140, 70, 56), 16)}[st], "brick"
        if st == "eastasia": return ramp((120, 122, 126), 14), "brick"
        if st in ("mediterranean", "islamic"): return s.plaster, "render"
        if st in ("oceania", "polar"): return s.stone, "stone"
        return ramp(mix(s.P["plaster"], s.P["stone"], .4), 14), "mud"


def reg(oid, draw, axes=None, states=None, light=None, **kw):
    """Define one object with its draw, its axes and the eras' looks, keeping what the catalogue already holds."""
    if states: kw["states"] = states
    if light: kw["light"] = light
    inner = draw
    gf = kw.get("global_from")
    def draw(tm, x, y, w, h, st, v, _f=inner):
        v = dict(v or {})
        if gf and not v.get("style"): v["_global"] = True             # no style given: the maker's look, not a made-up people's look
        e = EI.get(v.get("era") or AGE_ERA.get(v.get("age"), "dark-ages"), 0)
        if not e or not hasattr(tm, "img"): return _f(tm, x, y, w, h, st, v)
        X0, Y0, X1, Y1 = box_px(x - .4, y - .4, w + .8, h + .8, 0)
        X0, Y0 = max(0, int(X0)), max(0, int(Y0)); X1, Y1 = min(tm.img.size[0], int(X1)), min(tm.img.size[1], int(Y1))
        before = np.asarray(tm.img.crop((X0, Y0, X1, Y1))).astype(np.int16)
        out = _f(tm, x, y, w, h, st, v)
        after = np.asarray(tm.img.crop((X0, Y0, X1, Y1))).astype(np.float32)
        drawn = (np.abs(after[..., :3] - before[..., :3]).sum(2) > 6) & (after[..., :3].max(2) < 236)   # what the drawing changed, keeping lit flames and panes bright
        if drawn.any():
            g = era_grade(after[..., :3], e); after[..., :3][drawn] = g[drawn]
            tm.img.paste(Image.fromarray(after.clip(0, 255).astype(np.uint8), tm.img.mode), (X0, Y0))
        return out
    draw.__doc__ = inner.__doc__; draw.__name__ = inner.__name__
    return define(oid, draw=draw, axes=axes or {}, looks=LOOKS, **kw)


# ---------------------------------------------------------------- shared drawing pieces
def warm(tm, cx, cy, r, k=.5, mask_box=None):
    """Firelight on what is already drawn round a fire: stepped rings of warm tint (the stones, the sill, the pot)."""
    W, H = tm.img.size; cx, cy, r = int(cx), int(cy), int(max(2, r))
    x0, y0, x1, y1 = max(0, cx - r), max(0, cy - r), min(W, cx + r + 1), min(H, cy + r + 1)
    if mask_box: x0, y0, x1, y1 = max(x0, int(mask_box[0])), max(y0, int(mask_box[1])), min(x1, int(mask_box[2]) + 1), min(y1, int(mask_box[3]) + 1)
    if x1 <= x0 or y1 <= y0: return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    f = np.clip(1 - np.hypot(xx - cx, yy - cy) / r, 0, 1); f = np.floor(f * 4 + .5) / 4 * k
    a = np.asarray(tm.img.crop((x0, y0, x1, y1))).astype(np.float32)
    a = a * (1 + f[..., None] * (np.array([.55, .2, -.25]))) + f[..., None] * np.array([60, 26, 0])
    tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (x0, y0))


def glow_for_map(tm, cx, cy, r, cone=None):
    tm.hearths = getattr(tm, "hearths", []) + [(int(cx), int(cy), int(r), cone)]


def fire(tm, cx, cy, w, h, kk, glow=170, fuel="wood", cone=None):
    """A fire bed. Lit: tm.fire's logs, embers and flames, firelight on what is round it, a glow for the map. Out: cold
    grey ash, charred ends, nothing glowing. fuel: wood, peat (dark sods), coal (black lumps), dung (round cakes),
    charcoal (small black sticks)."""
    d = tm.d; cx, cy, w, h = int(cx), int(cy), max(3, int(w)), max(3, int(h)); rng = kk.rng
    if kk.lit:
        if fuel in ("wood", None):
            tm.fire(cx, cy, w, h, seed=int(rng.integers(0, 99)))
        else:
            d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=FIREC[0])
            n = int(w * h / 6) + 4
            for _ in range(n):
                a, q = rng.uniform(0, 2 * math.pi), rng.uniform(0, 1) ** .6
                x, y = cx + math.cos(a) * q * w * .85, cy + math.sin(a) * q * h * .85; s = 2 if fuel in ("coal", "charcoal") else 3
                hot = FIREC[min(5, 2 + int((1 - q) * 3.4))]
                if fuel == "peat": d.rectangle([x - s, y - 1, x + s, y + 1], fill=(48, 30, 24)); d.line([x - s + 1, y, x + s - 1, y], fill=hot)
                elif fuel == "dung": d.ellipse([x - s, y - s, x + s, y + s], fill=(70, 50, 34)); d.point((x, y), fill=hot)
                else: d.rectangle([x - s, y - s + 1, x + s - 1, y + s - 1], fill=SOOT[1]); d.point((x, y - 1), fill=hot); d.point((x + 1, y - 1), fill=hot)
            for i in range(max(2, w // 5)):                                      # low flames off the coals
                fx = cx + (i - max(2, w // 5) / 2 + .5) * w * .45; ht = h * rng.uniform(.6, 1.0)
                bw = max(3, w * .22)
                for sc, c in ((1, FIREC[2]), (.62, FIREC[3]), (.32, FIREC[4])): d.polygon([(fx - bw * sc, cy + 2), (fx - bw * sc * .5, cy - ht * sc * .6), (fx + 1, cy - ht * sc), (fx + bw * sc * .6, cy - ht * sc * .5), (fx + bw * sc, cy + 2)], fill=c)
        warm(tm, cx, cy, max(w, h) * 2.4, .55)
        glow_for_map(tm, cx, cy, glow, cone)
    else:
        d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=ASH[1])
        d.ellipse([cx - w + 2, cy - h + 2, cx + w - 3, cy + h - 3], fill=ASH[2])
        for k in range(3 if fuel in ("wood", None) else 0):                      # charred ends of the logs
            a = -.5 + k * .55; L = w * .7; ox, oy = math.cos(a) * L, math.sin(a) * L * h / w
            d.line([cx - ox, cy - oy, cx + ox, cy + oy], fill=SOOT[1], width=max(2, int(h * .28)))
            d.line([cx - ox * .8, cy - oy * .8 - 1, cx + ox * .8, cy + oy * .8 - 1], fill=SOOT[3])
        for _ in range(int(w * h / 14) + 2):
            x, y = cx + rng.uniform(-w, w) * .7, cy + rng.uniform(-h, h) * .6
            d.rectangle([x, y, x + 2, y + 1], fill=(ASH[4] if rng.random() < .5 else SOOT[2]))


def flame(tm, x, y, s=3, lit=True, col=None):
    """A small flame seen from above (a candle's or a lamp's): a bright core with an orange rim; out, a black wick."""
    d = tm.d; x, y = int(x), int(y)
    if not lit:
        d.rectangle([x - 1, y - 1, x, y], fill=SOOT[0]); return
    c = col or FIREC
    d.ellipse([x - s, y - s, x + s, y + s], fill=c[3]); d.ellipse([x - s + 1, y - s + 1, x + s - 1, y + s - 1], fill=c[4])
    d.ellipse([x - max(1, s // 2), y - max(1, s // 2), x + max(0, s // 2 - 1), y + max(0, s // 2 - 1)], fill=c[5])


def halo(tm, cx, cy, r, col=(255, 214, 130), k=.55, box=None):
    """A lit lamp's own light on its body: warm tint stepped toward the flame (drawn on the object, not the floor)."""
    W, H = tm.img.size; cx, cy, r = int(cx), int(cy), int(max(2, r))
    x0, y0, x1, y1 = max(0, cx - r), max(0, cy - r), min(W, cx + r + 1), min(H, cy + r + 1)
    if box: x0, y0, x1, y1 = max(x0, int(box[0])), max(y0, int(box[1])), min(x1, int(box[2]) + 1), min(y1, int(box[3]) + 1)
    if x1 <= x0 or y1 <= y0: return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    f = np.floor(np.clip(1 - np.hypot(xx - cx, yy - cy) / r, 0, 1) * 3 + .5) / 3 * k
    a = np.asarray(tm.img.crop((x0, y0, x1, y1))).astype(np.float32)
    a = a * (1 - f[..., None]) + f[..., None] * np.array(col, np.float32)
    tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (x0, y0))


def stone_blob(tm, cx, cy, rw, rh, C, rng, out=OUT):
    """One fieldstone from above: an irregular lit top, a dark south-east rim."""
    d = tm.d
    pts = [(cx + math.cos(a) * rw * rng.uniform(.78, 1), cy + math.sin(a) * rh * rng.uniform(.78, 1)) for a in np.linspace(0, 2 * math.pi, 8, endpoint=False)]
    d.polygon(pts, fill=C[1], outline=out)
    d.polygon([(cx + (x - cx) * .72 - 1, cy + (y - cy) * .72 - 1) for x, y in pts], fill=C[2])
    d.polygon([(cx + (x - cx) * .38 - rw * .18, cy + (y - cy) * .38 - rh * .2) for x, y in pts], fill=C[3])


def pattern(tm, x0, y0, x1, y1, kk, C1=None, C2=None, pat=None, step=None):
    """The region's motif painted in a panel or band: flowers, checks, scrolls, tiles, stars, horns, lotus, lattice,
    weave, zigzag, fret, tapa triangles, dots. C1 and C2 are the two colours (the style's dyes by default)."""
    d = tm.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); pat = pat or kk.P["pat"]
    if not pat: return                                                                      # mass-made: no people's ornament
    C1 = C1 or kk.acc; C2 = C2 or kk.acc2; Wd, Hd = x1 - x0, y1 - y0
    if Wd < 4 or Hd < 4: return
    s = step or max(6, min(12, min(Wd, Hd) // 2 if min(Wd, Hd) < 16 else 10))
    for j, gy in enumerate(range(y0 + 1, y1 - 2, s)):
        for i, gx in enumerate(range(x0 + 1, x1 - 2, s)):
            cx, cy = gx + s // 2, gy + s // 2; e = min(s // 2 - 1, (x1 - 1 - gx) // 2, (y1 - 1 - gy) // 2)
            if e < 2: continue
            if pat == "flowers":
                if (i + j) % 2 == 0:
                    for a in range(4): d.point((cx + (1, -1, 0, 0)[a] * 2, cy + (0, 0, 1, -1)[a] * 2), fill=C2[3])
                    d.point((cx, cy), fill=GOLD[4])
                else: d.line([cx - 2, cy + 1, cx + 2, cy - 1], fill=C1[3])
            elif pat == "check":
                if (i + j) % 2 == 0: d.rectangle([gx, gy, gx + s - 2, gy + s - 2], fill=C1[2])
            elif pat == "scroll":
                d.arc([cx - e, cy - e, cx + e, cy + e], 180 + 90 * (i % 2), 450 + 90 * (i % 2) - 90, fill=C1[3] if j % 2 == 0 else C2[3])
            elif pat == "tiles":
                d.rectangle([gx, gy, gx + s - 2, gy + s - 2], fill=(C1 if (i + j) % 2 else C2)[2]); d.point((cx, cy), fill=WHITE[4])
            elif pat == "star":
                d.polygon([(cx, cy - e), (cx + e, cy), (cx, cy + e), (cx - e, cy)], fill=C1[3]); d.rectangle([cx - e * .6, cy - e * .6, cx + e * .6, cy + e * .6], outline=C2[3])
            elif pat == "horn":
                d.arc([cx - e, cy - e, cx, cy], 90, 360, fill=C1[3]); d.arc([cx, cy, cx + e, cy + e], 270, 540, fill=C1[3])
            elif pat == "lotus":
                d.ellipse([cx - e, cy - e, cx + e, cy + e], outline=C1[3]); d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=C2[3])
            elif pat == "lattice":
                d.rectangle([gx, gy, gx + s - 2, gy + s - 2], outline=C1[2]); d.line([cx, gy, cx, cy], fill=C1[2])
            elif pat == "weave":
                if (i + j) % 2: d.line([gx + 1, cy, gx + s - 3, cy], fill=C1[3], width=2)
                else: d.line([cx, gy + 1, cx, gy + s - 3], fill=C2[3], width=2)
            elif pat == "zigzag":
                d.line([gx, cy + 2, gx + s // 2, cy - 2, gx + s - 1, cy + 2], fill=C1[3] if j % 2 == 0 else C2[2], width=2)
            elif pat == "fret":
                d.line([gx + 1, cy + 2, gx + 1, gy + 1, cx + 1, gy + 1, cx + 1, cy], fill=C1[3], width=2)
            elif pat == "tapa":
                d.polygon([(gx, gy + s - 2), (cx, gy + 1), (gx + s - 2, gy + s - 2)], fill=C1[1] if (i + j) % 2 else C2[2])
            else:
                d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=C1[3])


def rim(tm, x0, y0, x1, y1, C, w=2):
    """A metal rail or trim round a box: lit along the north and west, dark along the south and east."""
    d = tm.d
    d.line([x0, y0, x1, y0], fill=C[3], width=w); d.line([x0, y0, x0, y1], fill=C[3], width=w)
    d.line([x0, y1, x1, y1], fill=C[1], width=w); d.line([x1, y0, x1, y1], fill=C[1], width=w)


def wear(tm, kk, x0, y0, x1, y1, C=None, soot=False):
    """Condition: worn shows scuffs, faded patches and a chipped corner (soot streaks on a fire's things); broken a
    jagged crack, a missing corner and its fallen pieces. Drawn over what is there, inside the box."""
    if kk.cond == "new": return
    d = tm.d; rng = np.random.default_rng(int(x0) * 7 + int(y0) * 13 + int(x1)); x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    Wd, Hd = x1 - x0, y1 - y0
    if Wd < 4 or Hd < 4: return
    C = C or SOOT
    if Wd < 16 or Hd < 16:                                                        # a small thing: one scuff, or one crack and a chip
        if kk.worn: d.line([x0 + 2, y1 - 3, x0 + max(3, Wd // 2), y1 - 2], fill=tone(C[0], -10), width=2)
        else:
            d.line([x0 + Wd // 3, y0 + 1, x0 + Wd // 2, y0 + Hd // 2, x0 + Wd // 3 + 2, y1 - 1], fill=SOOT[0], width=1)
            d.polygon([(x1 - max(2, Wd // 4), y1), (x1, y1 - max(2, Hd // 4)), (x1, y1)], fill=SOOT[1])
        return
    if kk.worn:
        for _ in range(max(2, Wd * Hd // 700)):                                   # scuffs and faded patches
            px_, py_ = rng.uniform(x0 + 3, x1 - 6), rng.uniform(y0 + 3, y1 - 5); ln = rng.uniform(3, max(4, Wd / 6))
            d.line([px_, py_, min(x1 - 2, px_ + ln), py_ + rng.uniform(-2, 2)], fill=C[1] if not soot else SOOT[2], width=2 if soot else 1)
        for _ in range(max(1, Wd * Hd // 1600)):
            px_, py_ = rng.uniform(x0 + 4, x1 - 8), rng.uniform(y0 + 4, y1 - 8); r = rng.uniform(2, max(3, min(Wd, Hd) / 7))
            tm.shade((px_ - r, py_ - r * .7, px_ + r, py_ + r * .7), f=.72 if soot else .84, kind="ellipse")
        d.polygon([(x1, y1 - min(6, Hd // 4)), (x1, y1), (x1 - min(6, Wd // 4), y1)], fill=tone(C[0], -10))        # a chipped corner
    else:
        cx = rng.uniform(x0 + Wd * .3, x1 - Wd * .3); pts = [(cx, y0 + 1)]; y = y0 + 1
        while y < y1 - 2:
            y += rng.uniform(3, 7); pts.append((pts[-1][0] + rng.uniform(-4, 4), min(y, y1 - 2)))
        d.line(pts, fill=SOOT[0], width=2); d.line([(x + 1, y) for x, y in pts[1:]], fill=tone(C[3] if len(C) > 3 else C[-1], 10))
        q = min(Wd, Hd) // 4
        d.polygon([(x1 - q, y1), (x1, y1 - q), (x1, y1)], fill=SOOT[1])                                                # a missing corner
        for k in range(3):                                                                                            # its fallen pieces
            fx, fy = x1 - q - 3 - k * 5, y1 - 3 - (k % 2) * 3
            d.rectangle([fx, fy, fx + 3, fy + 2], fill=C[2], outline=OUT)


def lit_glass(tm, x0, y0, x1, y1, lit, frame=None, horn=False):
    """A pane in a lamp or a stove door: lit, amber with a bright core; out, dark blue-grey with a glint."""
    d = tm.d
    if x1 - x0 < 2 or y1 - y0 < 2: return
    if lit:
        c0, c1 = ((236, 176, 96), (255, 222, 150)) if horn else ((250, 184, 80), (255, 238, 170))
        d.rectangle([x0, y0, x1, y1], fill=c0, outline=frame); d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=c1) if x1 - x0 > 3 and y1 - y0 > 3 else None
    else:
        d.rectangle([x0, y0, x1, y1], fill=(150, 130, 96) if horn else (54, 62, 76), outline=frame); d.point((x0 + 1, y0 + 1), fill=(170, 190, 210))


def pot_on(tm, cx, cy, r, kk, C=None, contents="stew"):
    """A cooking pot or kettle seen from above: rim, lid or what is in it, a handle."""
    d = tm.d; C = C or IRON; cx, cy, r = int(cx), int(cy), int(r)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 160, 280, fill=C[4])
    inner = {"stew": (124, 82, 44), "water": WATER[2], "porridge": (210, 196, 160), "milk": (236, 232, 220), "soup": (170, 120, 50), "dye": (60, 60, 140), "oil": (196, 160, 60)}.get(contents)
    if contents == "kettle":
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=C[3]); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=C[1], outline=OUT)
        d.line([cx + r - 1, cy, cx + r + 5, cy - 3], fill=C[2], width=3); d.arc([cx - r + 2, cy - r - 2, cx + r - 2, cy + r - 6], 200, 340, fill=C[1], width=2)
    elif contents == "lid":
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[1]); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=C[3], outline=OUT)
    elif contents == "griddle":
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=SOOT[2]); d.ellipse([cx - r // 2, cy - r // 2, cx + r // 3, cy + r // 3], fill=(214, 180, 120))
        d.line([cx + r, cy, cx + r + 6, cy], fill=C[1], width=2)
    elif inner:
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=inner)
        if contents in ("stew", "soup"): d.point((cx - 2, cy), fill=(200, 150, 80)); d.point((cx + 2, cy + 1), fill=(90, 130, 60))
        d.arc([cx - r + 4, cy - r + 4, cx + r - 5, cy + r - 5], 190, 250, fill=tone(inner, 40))
    if contents not in ("kettle", "griddle"): d.line([cx - r - 2, cy, cx - r + 1, cy], fill=C[1], width=2); d.line([cx + r - 1, cy, cx + r + 2, cy], fill=C[1], width=2)



def bricks(tm, x0, y0, x1, y1, C, bw=10, bh=5, mortar=None):
    """Brick or block courses: mortar lines a tone down, joints staggered, a few bricks a tone lighter."""
    d = tm.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); m = mortar or C[0]
    for j, gy in enumerate(range(y0 + bh, y1, bh)): d.line([x0 + 1, gy, x1 - 1, gy], fill=m)
    for j, gy in enumerate(range(y0, y1 - 1, bh)):
        off = (bw // 2) * (j % 2)
        for i, gx in enumerate(range(x0 + off, x1 - 1, bw)):
            if gx > x0: d.line([gx, gy + 1, gx, min(y1 - 1, gy + bh - 1)], fill=m)
            if (i * 3 + j * 5) % 7 == 0 and gx + 2 < x1 - 2: d.line([gx + 2, gy + 2, min(x1 - 2, gx + bw - 2), gy + 2], fill=C[3])


def block(tm, x0, y0, x1, y1, C, sh=4):
    """A solid lit block with a short shadow south-east."""
    tm.shade((x0 + sh - 1, y0 + sh, x1 + sh, y1 + sh + 1), f=.56)
    d = tm.d; d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT)
    d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=C[3])
    d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=C[1])


def firedogs(tm, x0, x1, y0, y1, C=IRON):
    d = tm.d
    for fx in (x0, x1 - 4): d.rectangle([fx, y0, fx + 4, y1], fill=C[2], outline=OUT); d.rectangle([fx, y1 - 3, fx + 4, y1 + 1], fill=C[3], outline=OUT)


def setting(tm, kk, X0, Y0, X1, Y1, m=6):
    """The masonry round a built-in stove or range, in the region's manner: glazed tiles with their pattern in
    Central Europe, the North, East Asia and the Islamic world; brick in Atlantic Europe; whitewashed render or
    painted tiles by the Mediterranean; plaster or mud elsewhere. Returns the inner box left for the iron."""
    d = tm.d; st = kk.style
    if st in ("central", "northern", "eastasia", "islamic", "mediterranean", "southasia"):
        C = kk.tile; d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        pattern(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, kk, C1=ramp(C[4], 10), C2=kk.acc2, step=7)
    elif st == "atlantic":
        C = BRICK; d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, C, 10, 5)
    else:
        C = kk.plaster; d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
        pattern(tm, X0 + 1, Y1 - m, X1 - 1, Y1 - 1, kk, step=6)
    return X0 + m, Y0 + m // 2, X1 - m, Y1 - 1


def stoveboard(tm, kk, X0, Y0, X1, Y1):
    """The slab a free-standing stove or brazier stands on to spare the floor: the region's stone, tile or a zinc sheet."""
    d = tm.d
    if kk.w <= 1:                                                               # a poor household's: a flat stone or a box of sand
        C = kk.stone if kk.style not in ("africa", "seasia", "southasia", "americas") else ramp(kk.P["plaster"], 14)
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
        for k_ in range(3): d.line([X0 + 3 + k_ * 9, Y1 - 3, X0 + 7 + k_ * 9, Y1 - 4], fill=C[0])
    elif kk.e >= 5 and kk.style in ("atlantic", "americas", "oceania", "northern", "central"):
        C = ramp(mix((168, 170, 172), kk.P["acc"], .25), 12); d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); rim(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, C, 1)
    elif kk.style in ("islamic", "mediterranean", "central", "eastasia", "southasia"):
        d.rectangle([X0, Y0, X1, Y1], fill=kk.tile[2], outline=OUT); pattern(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, kk, C1=ramp(kk.tile[4], 8), step=8)
    else:
        C = kk.stone; d.rectangle([X0, Y0, X1, Y1], fill=C[3], outline=OUT); d.line([(X0 + X1) // 2, Y0 + 1, (X0 + X1) // 2, Y1 - 1], fill=C[1]); d.line([X0 + 1, (Y0 + Y1) // 2, X1 - 1, (Y0 + Y1) // 2], fill=C[1])


# ---------------------------------------------------------------- the open hearth
def hearth(tm, x, y, w, h, st, v):
    """An open hearth in the middle of the floor, seen from above. Dark Ages: a ring of fieldstones on trodden clay,
    the fire in the middle; Long Night: the same, sootier, with iron firedogs; Renaissance and Age of Reason: a square
    of dressed slabs with a kerb; Victorian: a flagstone cottage hearth with an iron trivet. In the Islamic world a
    raised plastered ocak; on the steppe an iron fire-frame on its stones; in South Asia a clay chulha; in East Asia
    an irori, a square wooden frame round a bed of ash with a hanging kettle; in Southeast Asia a clay box on a
    frame; in Africa the three hearthstones. The poor burn dung or peat on bare stones; the comfortable have a pot,
    kettle or griddle on the fire."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = (X1 - X0) // 2; rng = k.rng
    fuel = k.get("fuel", "wood"); ves = k.get("vessel", "none"); C = k.stone
    tm.shade((X0 + 4, Y0 + 6, X1 + 4, Y1 + 5), f=.62, kind="ellipse")
    st_ = k.style
    if st_ == "eastasia":                                                       # the irori: a sunken square in a wooden frame
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=k.wood[2], outline=OUT); d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=k.wood[4])
        q = 12 if not k.rich else 16; d.rectangle([X0 + q, Y0 + q, X1 - q, Y1 - q], fill=ASH[3], outline=OUT)
        for gy in range(Y0 + q + 4, Y1 - q, 6): d.line([X0 + q + 3, gy, X1 - q - 3, gy], fill=ASH[2])
        if k.rich: pattern(tm, X0 + 4, Y0 + 4, X1 - 4, Y0 + q - 1, k, pat="lattice", C1=k.acc)
        fr = (X1 - X0 - 2 * q) // 3
    elif st_ in ("islamic", "seasia", "southasia"):                             # a raised plastered box hearth, or a clay chulha
        Cc = k.plaster if st_ != "southasia" else CLAY
        d.rounded_rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], 8, fill=Cc[2], outline=OUT); d.arc([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], 180, 270, fill=Cc[4])
        q = 14; d.rounded_rectangle([X0 + q, Y0 + q, X1 - q, Y1 - q], 6, fill=SOOT[2], outline=Cc[0])
        if st_ == "southasia":                                                  # the chulha's two lobes that hold the pot
            for ax in (X0 + q, X1 - q): d.ellipse([ax - 7, cy - 9, ax + 7, cy + 9], fill=Cc[3], outline=OUT)
        if k.w >= 2: pattern(tm, X0 + 5, Y1 - q + 2, X1 - 5, Y1 - 5, k, step=7)
        fr = (X1 - X0 - 2 * q) // 3
    elif st_ == "africa":                                                       # the three hearthstones
        d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=tone(k.plaster[1], -10))
        fr = R_ // 2
        for a in (-90, 30, 150):
            ra = math.radians(a); stone_blob(tm, cx + math.cos(ra) * R_ * .55, cy + math.sin(ra) * R_ * .55, 13, 11, C, rng)
    elif st_ == "steppe":                                                       # stones and the iron fire-frame (tulga)
        d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=k.plaster[1], outline=OUT)
        for a in np.linspace(0, 2 * math.pi, 9, endpoint=False): stone_blob(tm, cx + math.cos(a) * R_ * .7, cy + math.sin(a) * R_ * .7, 8, 7, C, rng)
        fr = R_ // 2
    else:
        if k.e <= 1 or k.w <= 1:                                               # a ring of fieldstones on trodden clay
            d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=tone(k.plaster[0], -30))
            n = 11 if k.w >= 1 else 8
            for a in np.linspace(0, 2 * math.pi, n, endpoint=False): stone_blob(tm, cx + math.cos(a) * R_ * .74, cy + math.sin(a) * R_ * .74, 10, 9, C, rng)
            fr = R_ // 2
        else:                                                                    # dressed slabs in a square with a kerb
            d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=C[3], outline=OUT); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=C[4])
            s_ = (X1 - X0) // 3
            for gx in range(X0 + s_, X1 - 4, s_): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=C[1])
            for gy in range(Y0 + s_, Y1 - 4, s_): d.line([X0 + 3, gy, X1 - 3, gy], fill=C[1])
            q = 9; d.rectangle([X0 + q, Y0 + q, X1 - q, Y1 - q], fill=C[2], outline=C[0])
            if k.e == 4: d.rectangle([X0 + 2, Y1 - 10, X1 - 2, Y1 - 2], fill=tone(C[2], -14), outline=OUT)     # the flag in front for the kettle
            fr = R_ // 2
    if k.e == 1 and st_ not in ("eastasia", "africa"): firedogs(tm, cx - fr - 4, cx + fr + 4, cy - 9, cy + 9)
    fire(tm, cx, cy + 2, fr, int(fr * .8), k, glow=190, fuel=fuel)
    if st_ == "steppe":                                                         # the tulga's iron ring and legs over the fire
        d.ellipse([cx - fr - 4, cy - fr - 4, cx + fr + 4, cy + fr + 4], outline=IRON[3], width=3)
        for a in (45, 165, 285): ra = math.radians(a); d.line([cx + math.cos(ra) * (fr + 4), cy + math.sin(ra) * (fr + 4), cx + math.cos(ra) * (fr + 13), cy + math.sin(ra) * (fr + 13)], fill=IRON[2], width=3)
    if ves != "none" or st_ == "eastasia":
        if st_ == "eastasia": d.line([cx, Y0 + 3, cx, cy - 6], fill=k.wood[3], width=3)               # the pot-hook pole from the beam
        pot_on(tm, cx, cy - 2, max(9, fr * 2 // 3), k, C=k.metal if k.rich else IRON, contents={"pot": "stew", "kettle": "kettle", "griddle": "griddle"}.get(ves, "kettle"))
        if k.e == 4 and st_ not in ("eastasia",): d.ellipse([cx - fr, cy - fr, cx + fr, cy + fr], outline=IRON[2], width=2)   # the trivet ring
    if k.lit and ves != "none": warm(tm, cx, cy, fr * 2, .3)
    wear(tm, k, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, C, soot=True)


reg("hearth", hearth, axes={"fuel": ["wood", "peat", "dung", "wood", "charcoal"], "vessel": ["none", "pot", "kettle", "griddle"]}, states=("lit", "out"),
    light={"dim": 5, "bright": 1, "color": "#ff9a40", "kind": "fire"}, name="open hearth")


# ---------------------------------------------------------------- the fireplace
def fireplace(tm, x, y, w, h, st, v):
    """A fireplace against the wall (north), its fire in the back of the hearth and the hearthstone stepping out to
    the room. Dark Ages: a plain stone hood on corbels over a raised hearth, firedogs and logs; Long Night: a heavier
    hood, an iron fireback and soot; Renaissance: a carved stone mantel, a wide hearth with a crane and pot; Age of
    Reason: a chimneypiece with tiled cheeks and a basket grate; Victorian: a cast-iron register grate burning coal,
    a mantel shelf with a clock and candlesticks, a brass fender; Great War: a tiled surround with a small grate and a
    coal scuttle; Mid-Century: a stepped tiled surround with a gas fire's glowing radiants; Modern: a wood-burning
    stove on a slate hearth; Future Darkness: a heat panel with a lit grille. The region gives the stone, the tiles
    and the pattern; wealth the carving, brass and goods on the mantel."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0; rng = k.rng
    fuel = k.get("fuel", "wood"); mant = k.get("mantel", "candles")
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56)
    C = k.stone if k.style not in ("mediterranean", "islamic", "africa", "americas", "southasia") else k.plaster
    if k.poor and k.e <= 3: C = k.plaster
    if k.e <= 3:
        hood = H_ * 2 // 5
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)                                           # the raised hearth floor
        for gx in range(X0 + 14, X1 - 2, 14): d.line([gx, Y0 + hood, gx, Y1 - 2], fill=C[1])
        d.rectangle([X0, Y0, X1, Y0 + hood], fill=C[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])   # hood or chimneypiece
        if k.e >= 2 or k.rich:
            pattern(tm, X0 + 3, Y0 + 3, X1 - 3, Y0 + hood - 3, k, step=8)                              # carving or painted band
        cw = W_ // 6 if k.e != 3 else W_ // 5
        for jx in (X0, X1 - cw):                                                                       # cheeks
            d.rectangle([jx, Y0, jx + cw, Y1 - H_ // 5], fill=C[3], outline=OUT)
            if k.e == 3: pattern(tm, jx + 2, Y0 + hood + 2, jx + cw - 2, Y1 - H_ // 5 - 2, k, C1=k.acc2, C2=k.tile, pat="dots" if k.style == "atlantic" else None, step=6)
        bx0, by0, bx1, by1 = X0 + cw + 2, Y0 + hood, X1 - cw - 2, Y1 - H_ // 5
        d.rectangle([bx0, by0, bx1, by1], fill=SOOT[1])
        if k.e == 1: d.rectangle([cx - W_ // 6, by0, cx + W_ // 6, by0 + 6], fill=IRON[1], outline=OUT)        # the fireback
        if k.e == 3: d.arc([cx - W_ // 6, by0 - 4, cx + W_ // 6, by1 - 2], 20, 160, fill=IRON[3], width=2)       # the basket grate
        elif k.e != 3: firedogs(tm, cx - W_ // 5, cx + W_ // 5, by0 + 2, by1 - 3)
        fire(tm, cx, (by0 + by1) // 2 + 1, W_ // 5, max(4, (by1 - by0) // 2 - 1), k, glow=180, fuel="coal" if k.e == 3 and fuel == "coal" else fuel, cone=(math.pi / 2, 1.1))
        if k.e == 2:                                                                                    # the crane and its pot
            d.line([bx0 + 2, by0 + 3, cx + 2, by0 + 3], fill=IRON[1], width=3); pot_on(tm, cx, by0 + 8, 8, k, contents="stew")
        if k.rich and k.e >= 2:                                                                        # a coat of arms
            d.polygon([(cx - 6, Y0 + 4), (cx + 6, Y0 + 4), (cx + 6, Y0 + 11), (cx, Y0 + 16), (cx - 6, Y0 + 11)], fill=k.acc[2], outline=GOLD[3])
        d.rectangle([X0 + 4, Y1 - H_ // 5, X1 - 4, Y1 - 1], fill=C[1], outline=OUT)                   # the hearthstone
    elif k.e in (4, 5, 6):
        top = H_ * 3 // 5
        Cm = {4: (ramp(mix(C[2], k.P["acc"], .4), 14) if not k.rich else ramp(mix((226, 222, 214), k.P["tile"], .5), 10)), 5: k.tile, 6: k.tile}[k.e]
        if k.e == 6: Cm = ramp(mix(k.P["tile"], (200, 190, 170), .45), 14)
        d.rectangle([X0, Y0, X1, Y0 + top], fill=Cm[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cm[4])
        if k.e == 4:
            d.rectangle([X0 - 0, Y0, X1, Y0 + 7], fill=Cm[3] if not k.rich else WALNUT[3], outline=OUT)   # the mantel shelf
            for jx in (X0 + 4, X1 - W_ // 6 - 2): pattern(tm, jx, Y0 + 9, jx + W_ // 6 - 2, Y0 + top - 2, k, C1=k.tile, step=6)   # tiled cheeks
        if k.e == 5:
            for gx in range(X0 + 8, X1, 8): d.line([gx, Y0 + 2, gx, Y0 + top - 2], fill=Cm[1])
            d.rectangle([X0, Y0, X1, Y0 + 6], fill=WALNUT[3], outline=OUT)
        if k.e == 6:
            for i in range(3): d.rectangle([X0 + i * 6, Y0 + i * 3, X1 - i * 6, Y0 + top - i * 3], outline=Cm[1 if i % 2 else 3])
        gx0, gx1, gy0, gy1 = cx - W_ // 6, cx + W_ // 6, Y0 + top // 3, Y0 + top
        d.rectangle([gx0, gy0, gx1, gy1], fill=SOOT[1], outline=OUT)
        if k.e == 6:                                                                                    # a gas fire's radiants
            for i in range(5):
                rx = gx0 + 4 + i * (gx1 - gx0 - 8) // 5; d.rectangle([rx, gy0 + 3, rx + 3, gy1 - 3], fill=(FIREC[4] if k.lit else WHITE[2]), outline=(FIREC[2] if k.lit else WHITE[0]))
            if k.lit: warm(tm, cx, gy1, W_ // 3, .4); glow_for_map(tm, cx, gy1, 110, (math.pi / 2, 1.1))
        else:
            fire(tm, cx, (gy0 + gy1) // 2 + 2, (gx1 - gx0) // 2 - 3, (gy1 - gy0) // 3, k, glow=140, fuel="coal" if fuel != "wood" else "wood", cone=(math.pi / 2, 1.1))
            for gx in range(gx0 + 3, gx1 - 1, 4): d.line([gx, gy0 + (gy1 - gy0) // 2, gx, gy1 - 1], fill=IRON[1])      # the grate bars
        d.rectangle([X0 + 3, Y0 + top, X1 - 3, Y1], fill=(Cm[3] if k.e != 4 else STONE[2]), outline=OUT)                 # the hearth
        if k.e == 4 or k.rich: rim(tm, X0 + 6, Y0 + top + 3, X1 - 6, Y1 - 3, k.metal if k.e == 4 else BRASS)            # the fender
        if k.e == 5 or k.w <= 2: d.ellipse([X1 - 20, Y1 - 15, X1 - 6, Y1 - 2], fill=IRON[2], outline=OUT); d.ellipse([X1 - 17, Y1 - 12, X1 - 9, Y1 - 5], fill=SOOT[1])   # coal scuttle
    elif k.e == 7:
        Cs = ramp(mix(SLATE[2], k.P["stone"], .5), 14) if k.w <= 3 else ramp(mix((210, 206, 198), k.P["stone"], .3), 10)
        d.rectangle([X0, Y0, X1, Y1], fill=Cs[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cs[4])
        d.rectangle([X0, Y0, X1, Y0 + 6], fill=k.wood[3] if not k.rich else Cs[3], outline=OUT)
        sx0, sx1, sy0, sy1 = cx - W_ // 4, cx + W_ // 4, Y0 + 7, Y0 + H_ * 3 // 5
        Cv = k.enam if k.w >= 2 else IRON
        d.rectangle([sx0, sy0, sx1, sy1], fill=Cv[1], outline=OUT); d.line([sx0 + 2, sy0 + 2, sx1 - 2, sy0 + 2], fill=Cv[4])
        d.ellipse([cx - 5, sy0 + 3, cx + 5, sy0 + 13], fill=IRON[0], outline=IRON[3])                       # its flue
        lit_glass(tm, sx0 + 5, sy1 - 12, sx1 - 5, sy1 - 3, k.lit, frame=OUT)
        if k.lit: warm(tm, cx, sy1, W_ // 3, .4); glow_for_map(tm, cx, sy1, 110, (math.pi / 2, 1.1))
        d.rectangle([X1 - 20, Y1 - 22, X1 - 5, Y1 - 4], fill=k.wood[2], outline=OUT); d.line([X1 - 18, Y1 - 13, X1 - 7, Y1 - 13], fill=k.wood[0])   # the log basket
        pattern(tm, X0 + 3, Y1 - 10, X0 + W_ // 3, Y1 - 3, k, step=6)
    else:
        Cf = k.fd; d.rectangle([X0, Y0, X1, Y0 + H_ * 2 // 3], fill=Cf[2], outline=OUT)
        d.line([X0 + 2, Y0 + 2, X1 - 2, Y0 + 2], fill=k.fdglow if k.lit else Cf[3])
        gw = (X1 - X0) // (3 + k.w % 3); gx0 = cx - gw
        d.rounded_rectangle([gx0, Y0 + 6, cx + gw, Y0 + H_ * 2 // 3 - 4], 4, fill=SOOT[1], outline=OUT)
        for gx in range(gx0 + 3, cx + gw - 2, 4): d.line([gx, Y0 + 9, gx, Y0 + H_ * 2 // 3 - 7], fill=(FIREC[3] if k.style not in ("eastasia", "seasia", "polar") else k.fdglow) if k.lit else Cf[0])
        if k.rich: pattern(tm, X0 + 3, Y0 + 5, gx0 - 3, Y0 + H_ * 2 // 3 - 3, k, C1=ramp(k.fdglow, 10), step=7)
        d.rectangle([X0 + 4, Y0 + H_ * 2 // 3, X1 - 4, Y1], fill=Cf[1], outline=OUT); d.line([X0 + 6, Y1 - 3, X1 - 6, Y1 - 3], fill=k.fdglow if k.lit else Cf[3])
        if k.lit: halo(tm, cx, Y0 + H_ // 3, W_ // 2, (255, 170, 90), .3); glow_for_map(tm, cx, Y0 + H_ * 2 // 3, 100, (math.pi / 2, 1.1))
    if k.e in (2, 3, 4, 5) and mant != "none":                                                         # goods on the mantel or the hood's shelf
        if mant == "candles" or k.rich:
            for tx in (X0 + 10, X1 - 10): d.ellipse([tx - 3, Y0 + 2, tx + 3, Y0 + 8], fill=k.metal[2], outline=OUT); flame(tm, tx, Y0 + 5, 2, k.lit)
        if mant == "clock": d.rectangle([cx - 6, Y0 + 1, cx + 6, Y0 + 7], fill=WALNUT[2], outline=OUT); d.ellipse([cx - 3, Y0 + 2, cx + 3, Y0 + 6], fill=WHITE[4])
        if mant == "pots": 
            for tx in (cx - 14, cx + 14): d.ellipse([tx - 4, Y0 + 1, tx + 4, Y0 + 8], fill=k.tile[3], outline=OUT)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, C, soot=k.lit or k.worn)


reg("fireplace", fireplace, axes={"fuel": ["wood", "coal", "peat"], "mantel": ["candles", "clock", "pots", "none"]}, states=("lit", "out"))


# ---------------------------------------------------------------- the bread oven
def oven(tm, x, y, w, h, st, v):
    """A bread oven against the wall, its mouth to the room (south) and the stoking floor before it. Dark Ages and
    Long Night: a clay dome on a wattle-and-daub plinth, a board door leant by the mouth; Renaissance and Age of
    Reason: a brick oven, its dome rendered, an iron door; Victorian: a bakehouse oven in brick with an iron door
    frame and damper; Great War and Mid-Century: a baker's steel deck oven with stacked doors; Modern: a steel deck
    oven with lit glass doors; Future Darkness: a sealed dark oven with a lit window. In the Americas the beehive
    horno, by the Mediterranean a whitewashed dome, in Africa a patterned mud dome. Lit: the fire in the mouth and its
    light on the sill; out: cold ash and the door shut."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0; rng = k.rng
    bake = k.get("bake", "loaves")
    tm.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 5), f=.56)
    horno = k.style in ("americas", "mediterranean", "africa", "islamic", "steppe") and (k.e <= 3 or (k.e <= 7 and k.style in ("mediterranean", "americas", "africa")))
    if k.e <= 4 or (horno and k.e < 8):
        Cb = BRICK if (k.e in (2, 3, 4) and k.style in ("central", "atlantic", "northern", "eastasia")) else k.plaster
        if k.style == "africa": Cb = ramp(k.P["plaster"], 14)
        if horno:                                                               # a free dome on its plinth
            d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 10, fill=k.stone[2], outline=OUT)
        else:
            d.rectangle([X0, Y0, X1, Y1], fill=Cb[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cb[4])
            if Cb is BRICK: bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, BRICK, 12, 6)
        r = int(min(W_, H_) * .40); dcy = Y0 + int(H_ * .44)
        Cd = {"mediterranean": ramp((232, 228, 218), 10), "africa": ramp(k.P["plaster"], 16), "americas": ramp(k.P["plaster"], 16)}.get(k.style, CLAY if k.e <= 1 else ramp(mix(k.P["plaster"], (180, 110, 70), .5), 16))
        if k.poor: Cd = ramp(tone(Cd[2], -20), 14)
        if Q1(tm): tm.dome(cx, dcy, r, "clay")
        d.ellipse([cx - r, dcy - r, cx + r, dcy + r], fill=Cd[2], outline=OUT)
        for q, c, o in ((r - 4, 3, -3), (int(r * .62), 4, -7)): d.ellipse([cx - q + o, dcy - q + o, cx + q + o, dcy + q + o], fill=Cd[c])
        d.ellipse([cx - 4, dcy - r + 10, cx + 4, dcy - r + 18], fill=SOOT[1], outline=OUT)              # the vent
        if k.style == "africa" or (k.rich and k.style in ("islamic", "southasia", "central")):
            for a in np.linspace(0, 2 * math.pi, 14, endpoint=False):
                d.line([cx + math.cos(a) * r * .55, dcy + math.sin(a) * r * .55, cx + math.cos(a) * r * .9, dcy + math.sin(a) * r * .9], fill=k.acc[1] if k.style != "africa" else k.acc2[2], width=2)
        if k.style == "mediterranean" or k.style == "islamic": d.arc([cx - r + 3, dcy - r + 3, cx + r - 3, dcy + r - 3], 0, 360, fill=k.acc2[2] if k.rich else Cd[1], width=2)
        my = Y1 - int(H_ * .22)                                                 # the mouth, its arch, the fire
        mr = int(W_ * .16)
        d.pieslice([cx - mr - 6, my - mr - 6, cx + mr + 6, my + mr + 6], 180, 360, fill=(k.stone[3] if k.e <= 1 else BRICK[3]), outline=OUT)
        d.pieslice([cx - mr, my - mr, cx + mr, my + mr], 180, 360, fill=SOOT[0], outline=OUT)
        if k.lit: fire(tm, cx, my - mr // 3, mr - 4, mr // 3 + 1, k, glow=240, cone=(math.pi / 2, 1.05))
        else:
            fire(tm, cx, my - mr // 3, mr - 4, mr // 3 + 1, k)
            if k.e >= 2: d.rectangle([cx - mr - 2, my - 5, cx + mr + 2, my + 1], fill=IRON[2], outline=OUT); knob(tm, cx, my - 2, IRON, 2)   # the door shut
        if k.e == 4 or (k.e >= 2 and k.rich):
            d.rectangle([cx - mr - 8, my - mr - 9, cx + mr + 8, my - mr - 5], fill=IRON[2], outline=OUT)                         # the iron frame and damper
            d.line([X1 - 14, Y0 + 8, X1 - 14, my - 4], fill=IRON[3]); knob(tm, X1 - 14, my - 3, IRON, 2)
        d.rectangle([cx - mr - 12, my, cx + mr + 12, my + 10], fill=k.stone[3], outline=OUT); d.line([cx - mr - 11, my + 1, cx + mr + 11, my + 1], fill=k.stone[4])   # the sill
        if k.lit: warm(tm, cx, my + 2, mr + 14, .5)
        if not k.lit and k.e <= 1: d.rectangle([cx + mr + 14, my - 4, cx + mr + 20, my + 12], fill=OAK[2], outline=OUT)       # the board door, leant aside
    else:
        Cs = {5: ramp(mix(IRON[3], k.P["tile"], .35), 16), 6: k.enam, 7: ramp(mix(STEEL[2], k.P["tile"], .3 if k.w < 4 else .1), 16), 8: k.fd}[k.e]
        d.rectangle([X0, Y0, X1, Y1], fill=(BRICK if k.e == 5 else Cs)[2], outline=OUT)
        if k.e == 5: bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, BRICK, 12, 6)
        d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 24], fill=Cs[1], outline=OUT); d.line([X0 + 7, Y0 + 7, X1 - 7, Y0 + 7], fill=Cs[4])   # the oven's top
        for gx in range(X0 + 16, X1 - 10, 14): d.line([gx, Y0 + 9, gx, Y1 - 27], fill=Cs[0])
        n = 2 if k.w <= 2 else 3
        dw = (W_ - 16) // n
        for i in range(n):                                                      # the doors along the front
            dx0 = X0 + 8 + i * dw; d.rectangle([dx0, Y1 - 22, dx0 + dw - 4, Y1 - 4], fill=Cs[3], outline=OUT)
            if k.e >= 7: lit_glass(tm, dx0 + 4, Y1 - 19, dx0 + dw - 8, Y1 - 10, k.lit, frame=OUT)
            else: d.rectangle([dx0 + 4, Y1 - 19, dx0 + dw - 8, Y1 - 15], fill=(FIREC[3] if k.lit else SOOT[2]), outline=OUT)
            d.line([dx0 + 3, Y1 - 7, dx0 + dw - 7, Y1 - 7], fill=(CHROME if k.e >= 6 else BRASS)[3], width=2)
        if k.e == 8: d.line([X0 + 4, Y0 + 3, X1 - 4, Y0 + 3], fill=k.fdglow if k.lit else k.fd[3], width=2)
        if k.rich or k.e == 5: pattern(tm, X0 + 8, Y0 + 9, X1 - 8, Y0 + 20, k, step=7)
        if k.lit: warm(tm, cx, Y1 - 10, W_ // 2, .3); glow_for_map(tm, cx, Y1 - 6, 140, (math.pi / 2, 1.1))
        my = Y1 - 26
    if bake != "none":                                                           # the day's baking on the stoking floor
        by = Y1 - 6
        if bake == "loaves":
            for i in range(3 if not k.rich else 5): lx = X0 + 8 + i * 12; d.ellipse([lx, by - 6, lx + 10, by + 1], fill=(184, 126, 64), outline=OUT); d.line([lx + 3, by - 3, lx + 7, by - 4], fill=(226, 180, 110))
        elif bake == "flatbread":
            for i in range(2 if not k.rich else 3): lx = X0 + 6 + i * 16; d.ellipse([lx, by - 9, lx + 14, by + 1], fill=(220, 186, 126), outline=OUT); d.point((lx + 5, by - 4), fill=(150, 96, 50))
        elif bake == "pies":
            for i in range(2 + k.w // 2): lx = X0 + 6 + i * 14; d.ellipse([lx, by - 9, lx + 12, by + 1], fill=(200, 140, 70), outline=OUT); d.line([lx + 3, by - 4, lx + 9, by - 4], fill=(150, 90, 40))
        elif bake == "peel":
            d.line([X1 - 8, Y0 + 12, X1 - 8, Y1 - 12], fill=OAK[3], width=3); d.rectangle([X1 - 14, Y1 - 14, X1 - 2, Y1 - 3], fill=OAK[3], outline=OUT)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.plaster, soot=True)


def Q1(tm): return False


reg("oven", oven, axes={"bake": ["loaves", "none", "flatbread", "peel", "pies"]}, states=("lit", "out"), ref="household clay and brick bake ovens about 7 ft across with the stoking floor in front of the mouth; bakers' deck ovens about 7 ft")


# ---------------------------------------------------------------- the tiled stove
GLAZES = {"red": (150, 56, 44), "green": (70, 120, 82), "brown": (126, 80, 48), "white": (226, 224, 214), "ochre": (196, 150, 60), "black": (50, 50, 56), "blue": (70, 100, 160)}


def tiledstove(tm, x, y, w, h, st, v):
    """A tiled stove against the wall, stoked through its small iron door at the front. Central Europe: a square
    tower of tiles (Kachelofen); the North: a round white stove (kakelugn) painted with blue flowers. Long Night:
    pot tiles, each a dished bowl; Renaissance: square relief tiles, green or brown; Age of Reason: painted faience
    with a crowned top tier; Victorian: glossy white tiles with a brass door; Great War and Mid-Century: smooth
    tiles in a stepped top. Wealth adds the upper tier, the cornice and brass; lit, the door glows and warms the tiles."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; W_ = X1 - X0
    G = ramp(GLAZES[k.get("glaze", "green")], 18)
    if k.style == "northern": G = ramp(mix((232, 230, 222), GLAZES[k.get("glaze", "green")], .45), 10)
    tm.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 5), f=.55, kind="ellipse" if k.style == "northern" else "rect")
    if k.style == "northern":
        r = W_ // 2 - 1
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=G[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 160, 290, fill=G[4], width=2)
        for a in np.linspace(0, 2 * math.pi, 16 if k.w < 4 else 24, endpoint=False):                   # the tile courses round the drum
            d.line([cx + math.cos(a) * r * .6, cy + math.sin(a) * r * .6, cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=G[0])
        for q in (int(r * .6), int(r * .35)): d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=G[3 if q > r * .5 else 4], outline=G[0])
        Cm = ramp(GLAZES[k.get("glaze", "green")], 18) if k.get("glaze") not in ("white", None) else k.acc
        for a in np.linspace(0, 2 * math.pi, 8, endpoint=False):                                     # painted sprigs
            fx, fy = cx + math.cos(a) * r * .8, cy + math.sin(a) * r * .8; d.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=Cm[1])
        if k.rich: d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=GOLD[3], outline=OUT)            # the gilt crown on top
        dy = Y1 - 4
    else:
        d.rectangle([X0, Y0, X1, Y1], fill=G[2], outline=OUT)
        n = 5 if k.w < 4 else 6; s_ = W_ / n
        for i in range(n):
            for j in range(n):
                tx0, ty0 = X0 + i * s_, Y0 + j * s_; tx1, ty1 = tx0 + s_ - 1, ty0 + s_ - 1; tcx, tcy = (tx0 + tx1) / 2, (ty0 + ty1) / 2
                d.rectangle([tx0, ty0, tx1, ty1], outline=G[0])
                if k.e == 1: d.ellipse([tx0 + 2, ty0 + 2, tx1 - 2, ty1 - 2], fill=G[1], outline=G[0]); d.ellipse([tcx - 2, tcy - 2, tcx + 1, tcy + 1], fill=G[0])   # pot tiles
                elif k.e == 2: d.rectangle([tx0 + 3, ty0 + 3, tx1 - 3, ty1 - 3], fill=G[3], outline=G[1]); d.point((tcx, tcy), fill=G[0]); d.point((tcx - 1, tcy), fill=G[0])
                elif k.e == 3:
                    d.rectangle([tx0 + 1, ty0 + 1, tx1 - 1, ty1 - 1], fill=WHITE[3]); d.ellipse([tcx - 3, tcy - 3, tcx + 3, tcy + 3], outline=G[1]); d.point((tcx, tcy), fill=G[1])
                elif k.e == 4: d.line([tx0 + 1, ty0 + 1, tx1 - 2, ty0 + 1], fill=G[4]); d.point((tx0 + 2, ty0 + 2), fill=WHITE[4])
                else: d.line([tx0 + 1, ty0 + 1, tx0 + 1, ty1 - 1], fill=G[3])
        if k.w >= 3 or k.e == 3:                                                                       # the upper tier or the crown
            q = W_ // 4; d.rectangle([X0 + q, Y0 + q - 4, X1 - q, Y1 - q - 4], fill=G[3], outline=OUT); d.line([X0 + q + 1, Y0 + q - 3, X1 - q - 1, Y0 + q - 3], fill=G[4])
            if k.e == 3 or k.rich: d.rectangle([cx - 5, Y0 + q + 2, cx + 5, Y0 + q + 10], fill=(GOLD if k.rich else G)[3], outline=OUT)
            if k.e >= 5: d.rectangle([X0 + q + 4, Y0 + q, X1 - q - 4, Y1 - q - 8], outline=G[1])
        if k.rich: rim(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, BRASS if k.e >= 4 else G, 2)
        dy = Y1 - 2
    dw = W_ // 5                                                                                        # the stoking door
    d.rectangle([cx - dw, dy - 10, cx + dw, dy], fill=(BRASS if (k.e >= 4 or k.rich) else IRON)[2], outline=OUT)
    if k.lit:
        for gx in range(cx - dw + 3, cx + dw - 1, 4): d.line([gx, dy - 7, gx, dy - 3], fill=FIREC[4])
        warm(tm, cx, dy, W_ // 2, .35); glow_for_map(tm, cx, dy, 80, (math.pi / 2, 1.0))
    else:
        for gx in range(cx - dw + 3, cx + dw - 1, 4): d.line([gx, dy - 7, gx, dy - 3], fill=SOOT[1])
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, G)


reg("tiledstove", tiledstove, axes={"glaze": ["green", "brown", "white", "ochre", "black", "blue", "red"]}, nvar=16, states=("lit", "out"), front=True, clear=2,
    light={"dim": 3, "bright": .5, "color": "#ff9a40", "kind": "fire"}, tags=("home", "hall", "parlour", "chamber"),
    ref="Kachelofen and kakelugn about 3 1/2 to 4 1/2 ft square or across (surviving stoves in Swiss, Austrian and Swedish house museums)")


# ---------------------------------------------------------------- the kitchen range (cooker)
def cooker(tm, x, y, w, h, st, v):
    """A kitchen range against the wall, hot plates or rings on top and the oven doors along the front. Age of
    Reason: an open range, its fire basket between two iron hobs in a brick setting; Victorian: a black-leaded
    closed range with round lids, a fire window and a brass rail; Great War: a black range with steel trim; Mid-
    Century: an enamel gas cooker in the region's colour, four burners and a grill; Modern: a white or steel electric
    cooker, black rings and knobs; Future Darkness: a dark induction top with lit rings. Lit: the fire glows, gas
    burns blue, rings glow red. A pan, pot or kettle stands on it."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    pans = k.get("pans", "kettle")
    tm.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 5), f=.5)
    rr = max(5, min(W_ // 6, H_ // 4))
    spots = [(X0 + W_ // 4, Y0 + H_ // 3), (X1 - W_ // 4, Y0 + H_ // 3), (X0 + W_ // 4, Y0 + H_ * 2 // 3 - 2), (X1 - W_ // 4, Y0 + H_ * 2 // 3 - 2)]
    if k.e <= 5:
        X0, Y0, X1, Y1 = setting(tm, k, X0, Y0, X1, Y1, 7 if k.w >= 2 else 5); W_, H_ = X1 - X0, Y1 - Y0
        rr = max(5, min(W_ // 6, H_ // 4)); spots = [(X0 + W_ // 4, Y0 + H_ // 3), (X1 - W_ // 4, Y0 + H_ // 3), (X0 + W_ // 4, Y0 + H_ * 2 // 3 - 2), (X1 - W_ // 4, Y0 + H_ * 2 // 3 - 2)]
    if k.e <= 3:
        hw = W_ // 3
        for hx0 in (X0 + 2, X1 - hw - 2): block(tm, hx0, Y0 + 4, hx0 + hw, Y1 - 6, IRON, sh=0); d.rectangle([hx0 + 3, Y1 - 14, hx0 + hw - 3, Y1 - 8], fill=IRON[3], outline=OUT)   # hob and oven door
        fx0, fx1 = X0 + hw + 5, X1 - hw - 5; d.rectangle([fx0, Y0 + 4, fx1, Y1 - 6], fill=SOOT[1], outline=OUT)
        fire(tm, cx, (Y0 + Y1) // 2, (fx1 - fx0) // 2 - 1, H_ // 4, k, glow=130, fuel="coal", cone=(math.pi / 2, 1.1))
        for gx in range(fx0 + 2, fx1, 4): d.line([gx, Y0 + H_ // 2, gx, Y1 - 7], fill=IRON[1])
        if k.rich: d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=BRASS[3], width=2)
        pspots = [(X0 + 2 + hw // 2, Y0 + H_ // 3), (X1 - 2 - hw // 2, Y0 + H_ // 3)]
    elif k.e in (4, 5):
        C = IRON if k.e == 4 else ramp(mix(IRON[3], k.P["tile"], .2), 14)
        if k.w <= 1: C = ramp(mix(C[2], (120, 70, 44), .3), 14)
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        if k.rich:                                                              # the copper boiler at the end and a brass plate rail
            d.rectangle([X1 - W_ // 5, Y0 + 2, X1 - 2, Y1 - 2], fill=COPPER[2], outline=OUT); d.ellipse([X1 - W_ // 5 + 3, Y0 + 5, X1 - 5, Y0 + 5 + W_ // 5 - 8], fill=COPPER[4], outline=OUT)
            X1 = X1 - W_ // 5; W_ = X1 - X0; spots = [(X0 + W_ // 4, Y0 + H_ // 3), (X1 - W_ // 4, Y0 + H_ // 3)]; d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
        d.rectangle([X0, Y0, X1, Y0 + 6], fill=C[3], outline=OUT)                                         # the flue back
        if k.rich: pattern(tm, X0 + 2, Y0 + 1, X1 - 2, Y0 + 6, k, C1=BRASS, step=5, pat="dots")
        for sx, sy in spots[:2]: d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=C[1], outline=OUT); d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=C[3])
        fx0, fx1 = X0 + W_ // 3, X1 - W_ // 3
        d.rectangle([fx0, Y0 + H_ * 3 // 5, fx1, Y1 - 6], fill=(FIREC[3] if k.lit else SOOT[2]), outline=OUT)
        for gx in range(fx0 + 3, fx1, 4): d.line([gx, Y0 + H_ * 3 // 5, gx, Y1 - 6], fill=IRON[0])
        for ox in (X0 + 4, X1 - W_ // 3 + 4): d.rectangle([ox, Y0 + H_ * 3 // 5, ox + W_ // 3 - 10, Y1 - 6], fill=C[3], outline=OUT); knob(tm, ox + W_ // 6 - 5, Y1 - 10, k.metal if k.w >= 3 else IRON, 2)
        d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=(BRASS if k.w >= 2 else IRON)[3 if k.e == 4 else 2], width=2)
        if k.e == 5: d.line([X0 + 2, Y0 + 8, X1 - 2, Y0 + 8], fill=STEEL[3])
        if k.lit: warm(tm, cx, Y1 - 8, W_ // 3, .4); glow_for_map(tm, cx, Y1 - 6, 110, (math.pi / 2, 1.1))
        pspots = spots[:2]
    else:
        C = {6: k.enam, 7: ramp(mix(k.P["acc"], (232, 232, 228) if k.w < 4 else STEEL[2], .15), 12), 8: k.fd}[k.e]
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
        if k.e >= 7: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y0 + 7, k, C1=(ramp(k.fdglow, 10) if k.e == 8 else k.acc), step=5)
        if k.e == 6: d.rectangle([X0, Y0, X1, Y0 + 7], fill=C[3], outline=OUT); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=CHROME[3])   # the splash-back and grill
        top = (k.e == 7 and k.w >= 3) or k.e == 8
        if top: d.rectangle([X0 + 3, Y0 + 8, X1 - 3, Y1 - 9], fill=(26, 26, 32) if k.e == 7 else SOOT[1], outline=OUT)                  # glass hob
        for sx, sy in spots:
            if k.e == 6:
                d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=IRON[1], outline=OUT); d.ellipse([sx - rr + 3, sy - rr + 3, sx + rr - 3, sy + rr - 3], outline=IRON[3])
                if k.lit: d.ellipse([sx - rr + 2, sy - rr + 2, sx + rr - 2, sy + rr - 2], outline=(110, 160, 255)); d.ellipse([sx - rr + 4, sy - rr + 4, sx + rr - 4, sy + rr - 4], outline=(70, 110, 230))
            elif k.e == 7:
                d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=((170, 40, 26) if k.lit else (24, 24, 28)), outline=OUT if not top else (60, 60, 66))
                d.ellipse([sx - rr + 3, sy - rr + 3, sx + rr - 3, sy + rr - 3], outline=((230, 80, 40) if k.lit else (60, 60, 66)))
            else:
                d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], outline=(k.fdglow if k.lit else k.fd[3]), width=2)
        for i in range(4): knob(tm, X0 + W_ * (i + 1) // 5, Y1 - 4, CHROME if k.e != 8 else ramp(k.fdglow, 10), 2)
        if k.lit and k.e == 7: glow_for_map(tm, cx, (Y0 + Y1) // 2, 50)
        pspots = spots
    if pans != "none":
        sx, sy = pspots[0]
        if pans == "kettle": pot_on(tm, sx, sy, rr - 1, k, C=k.metal if k.w >= 3 else IRON, contents="kettle")
        elif pans in ("pot", "both"): pot_on(tm, sx, sy, rr, k, C=(STEEL if k.e >= 6 else IRON), contents="stew")
        if pans == "both": pot_on(tm, pspots[1][0], pspots[1][1], rr - 1, k, C=k.metal if k.w >= 3 else IRON, contents="kettle")
        else: pot_on(tm, pspots[-1][0], pspots[-1][1], rr - 1, k, C=IRON, contents="griddle")
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, IRON if k.e <= 5 else ENAMELS["white"])


for _id in ("cooker", "range"):
    reg(_id, cooker, axes={"pans": ["kettle", "pot", "pan", "none", "both"], "livery": ["white", "chrome", "black", "beige", "red", "grey", "green"]}, states=("lit", "out"), front=True, clear=3, mount="wall", global_from=1990, nvar=22,
        light={"dim": 3, "bright": .5, "color": "#ff9a40", "kind": "fire"}, tags=("home", "kitchen", "inn"),
        ref="cast-iron ranges 3 to 4 1/2 ft wide (Victorian ironmongers' catalogues); gas and electric cookers about 2 by 2 ft")
define("range", ft=((3, 4.5), (2, 2.5)))


# ---------------------------------------------------------------- the iron stove
def stove_iron(tm, x, y, w, h, st, v):
    """A free-standing iron stove with its flue pipe rising from the top, seen from above. Age of Reason: a box stove
    of cast plates with relief panels on short legs; Victorian and Great War: a round pot-belly with its flue collar
    and a kettle on the top; Mid-Century: an enamel parlour heater in the region's colour; Modern: a square wood
    stove with a glass door; Future Darkness: a dark cylinder with lit vents. Lit, the fire shows red through the
    door and the top glows; out, it is cold and grey."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; W_ = X1 - X0; r = W_ // 2 - 2
    ket = k.get("top", "kettle")
    C = {3: IRON, 4: IRON, 5: ramp(mix(IRON[3], k.P["tile"], .25), 14), 6: k.enam, 7: ramp(mix(IRON[3], k.P["acc"], .35), 14), 8: k.fd}[k.e]
    if k.e in (3, 4) and k.style not in ("central", "atlantic", "northern"): C = ramp(mix(IRON[2], k.P["acc"], .3), 14)
    if k.w <= 1: C = ramp(mix(mix(C[2], (128, 70, 40), .35), k.P["acc"], .3), 14)    # rusted and patched, a poor household's
    stoveboard(tm, k, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1)
    r = r - 4; X0, Y0, X1, Y1 = X0 + 4, Y0 + 4, X1 - 4, Y1 - 4; W_ = X1 - X0
    if k.e in (4, 5):
        tm.shade((cx - r + 3, cy - r + 4, cx + r + 4, cy + r + 4), f=.55, kind="ellipse")
        for a in (45, 135, 225, 315): ra = math.radians(a); d.rectangle([cx + math.cos(ra) * r - 3, cy + math.sin(ra) * r - 3, cx + math.cos(ra) * r + 3, cy + math.sin(ra) * r + 3], fill=C[1], outline=OUT)   # legs
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 160, 280, fill=C[4], width=2)
        q = int(r * .62); d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=(C[1] if not k.lit else mix(C[1], FIREC[2], .35)), outline=OUT)
        if k.rich or k.w >= 3: d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=k.metal[3])          # the nickel ring
        d.rectangle([cx - r // 2, cy + r - 9, cx + r // 2, cy + r - 2], fill=(FIREC[3] if k.lit else SOOT[2]), outline=OUT)   # the draught door
        fx, fy = cx + r // 3, cy - r // 3
    else:
        tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.55)
        rad = 8 if k.e in (6, 8) else 2
        d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], rad, fill=C[2], outline=OUT); d.line([X0 + 4, Y0 + 3, X1 - 4, Y0 + 3], fill=C[4])
        if k.e == 3: pattern(tm, X0 + 4, Y0 + 5, X1 - 4, Y1 - 12, k, C1=ramp(C[4], 8), C2=ramp(C[3], 8), step=8)        # cast relief
        if k.e == 6 and k.w >= 2: rim(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, CHROME)
        if k.e == 8:
            for gy in range(Y0 + 8, Y1 - 12, 5): d.line([X0 + 6, gy, X1 - 6, gy], fill=(k.fdglow if k.lit else C[0]))
        lit_glass(tm, X0 + 8, Y1 - 12, X1 - 8, Y1 - 4, k.lit, frame=OUT) if k.e in (7, 6, 3) else None
        fx, fy = cx + W_ // 5, Y0 + W_ // 4
    d.ellipse([fx - 7, fy - 7, fx + 7, fy + 7], fill=IRON[1], outline=OUT); d.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=SOOT[0])          # the flue pipe
    if ket != "none" and k.e != 8: pot_on(tm, cx - W_ // 6, cy - W_ // 8, max(6, W_ // 7), k, C=(k.metal if k.w >= 3 else IRON), contents={"kettle": "kettle", "pot": "stew", "irons": "lid", "pan": "griddle"}[ket])
    if k.lit:
        warm(tm, cx, Y1 - 6, W_ // 2, .3); glow_for_map(tm, cx, Y1 - 4, 90)
    wear(tm, k, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, C)


reg("stove-iron", stove_iron, axes={"top": ["kettle", "none", "pot", "irons", "pan"]}, states=("lit", "out"), clear=2,
    light={"dim": 3, "bright": .5, "color": "#ff9a40", "kind": "fire"}, tags=("home", "hall", "kitchen", "guardroom", "office", "station", "barracks", "workshop"),
    ref="box and pot-belly stoves 20 to 30 in across (trade catalogues, 1850 to 1920)")


# ---------------------------------------------------------------- the brazier
def brazier(tm, x, y, w, h, st, v):
    """A brazier of glowing coals, seen from above. Dark Ages to the Age of Reason: an iron basket of bars on three
    legs (by the Mediterranean and in the Islamic world a brass mangal, its rim pierced; in East Asia a hibachi, a
    round glazed jar of ash; in Africa and the Americas a clay pot on three stones); Victorian onward: a bucket or
    oil drum with holes punched round it, the street's fire; Future Darkness: a scorched drum with lit seams. The
    rich have brass, silver or gilt. Lit: coals glow and throw light; out: grey ash."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 3
    fuel = k.get("fuel", "charcoal")
    tm.shade((cx - r + 3, cy - r + 4, cx + r + 5, cy + r + 5), f=.55, kind="ellipse")
    if k.w >= 2 and k.style not in ("africa", "americas", "oceania", "polar"): stoveboard(tm, k, X0, Y0, X1, Y1); r -= 2
    if k.e >= 4 and not (k.rich and k.e <= 6) and k.style not in ("eastasia",):
        C = ramp(mix((120, 92, 72), k.P["acc"], .5), 14) if k.e < 8 else k.fd
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 150, 290, fill=C[4], width=2)
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=C[1])                         # the drum's rim
        q = r - 5
        if k.e >= 8 and k.lit:
            for a in np.linspace(0, 2 * math.pi, 10, endpoint=False): d.point((cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)), fill=k.fdglow)
    elif k.style == "eastasia" or (k.style == "seasia" and k.w >= 2):                                # hibachi
        C = ramp((210, 214, 222), 10) if k.w >= 2 else CLAY
        if k.rich and k.style == "eastasia": C = ramp((44, 34, 34), 12)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 150, 290, fill=C[4], width=2)
        if k.w >= 2: pattern(tm, cx - r + 3, cy + r - 9, cx + r - 3, cy + r - 3, k, C1=(k.acc2 if not k.rich else GOLD), pat="lattice", step=6)
        q = r - 6; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=ASH[3])
        q = q - 3
    elif k.style in ("africa", "americas", "oceania", "polar", "steppe") and k.w <= 2 or k.w <= 1:
        C = ramp(k.P["plaster"], 16) if k.style != "polar" else ramp(k.P["stone"], 16)
        if k.style not in ("africa", "americas", "oceania", "polar", "steppe"): C = ramp(mix(CLAY[2], k.P["plaster"], .5), 16)
        for a in (-90, 30, 150): ra = math.radians(a); stone_blob(tm, cx + math.cos(ra) * r * .8, cy + math.sin(ra) * r * .8, 7, 6, k.stone, k.rng)
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=C[2], outline=OUT); d.arc([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], 150, 290, fill=C[4], width=2)
        q = r - 9
        pattern(tm, cx - r + 5, cy + r - 9, cx + r - 5, cy + r - 4, k, step=5)
    else:
        C = k.metal if (k.rich or k.style in ("islamic", "southasia", "mediterranean")) and k.w >= 2 else IRON
        for a in (90, 210, 330): ra = math.radians(a); d.line([cx, cy, cx + math.cos(ra) * (r + 2), cy + math.sin(ra) * (r + 2)], fill=C[1], width=4)   # legs splayed out
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[1], outline=OUT)
        q = r - 6
        if C is IRON:
            for a in np.linspace(0, 2 * math.pi, 12, endpoint=False): d.line([cx + math.cos(a) * q, cy + math.sin(a) * q, cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)], fill=IRON[3])
        else:
            d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=C[3], width=2)
            for a in np.linspace(0, 2 * math.pi, 16, endpoint=False): d.point((cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4)), fill=C[0])   # the pierced rim
    fire(tm, cx, cy, q, q, k, glow=150, fuel=fuel)
    if k.style == "eastasia" and k.w >= 2: d.line([cx - q, cy + q, cx + q // 2, cy - q], fill=STEEL[3], width=2)    # the fire tongs
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, C)


reg("brazier", brazier, axes={"fuel": ["charcoal", "wood", "coal", "dung"]}, states=("lit", "out"), clear=1,
    light={"dim": 4, "bright": 1, "color": "#ff9040", "kind": "fire"}, tags=("hall", "guardroom", "courtyard", "street", "camp", "shrinehall", "alley"),
    ref="iron and brass braziers 18 to 24 in across; street fire drums 2 ft (55 gallon drums 23 in)")


# ---------------------------------------------------------------- the clay oven (tandoor)
def tandoor(tm, x, y, w, h, st, v):
    """A clay oven, a pot-bellied jar sunk in a mud or brick plinth, open at the top: from above a thick clay ring and
    the dark mouth, flat breads slapped on the inner wall, the coals glowing at the bottom when lit. In South Asia a
    tandoor, on the steppe a tandyr on its mud platform, in the Islamic world a tannur, in Africa a clay pit oven.
    Modern ones are clad in steel; Future Darkness ones in a dark shell. Wealth gives a tiled plinth and more bread."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 2
    bread = k.get("bread", "naan")
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.55, kind="ellipse" if k.style in ("africa", "steppe") else "rect")
    pl = k.get("plinth", "mud")
    Pl = {"mud": ramp(k.P["plaster"], 14), "brick": BRICK, "tiled": k.tile, "stone": k.stone}[pl]
    if k.e >= 7: Pl = ramp(mix(Pl[2], STEEL[2] if k.e == 7 else k.fd[2], .15), 14)
    if k.style in ("africa", "steppe") and k.e < 7: d.ellipse([X0, Y0, X1, Y1], fill=Pl[2], outline=OUT); d.arc([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 160, 280, fill=Pl[4], width=2)
    else:
        d.rectangle([X0, Y0, X1, Y1], fill=Pl[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Pl[4])
        if pl == "brick": bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, BRICK, 10, 5)
        if pl == "tiled" or k.w >= 2: pattern(tm, X0 + 3, Y1 - 10, X1 - 3, Y1 - 3, k, C1=ramp(Pl[4], 8) if pl == "tiled" else k.tile, step=6)
    Cr = CLAY if k.e < 7 else (STEEL if k.e == 7 else k.fd)
    d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=Cr[3], outline=OUT); d.arc([cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7], 160, 290, fill=Cr[4], width=2)
    q = r - 14; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=SOOT[1], outline=Cr[0])
    fire(tm, cx, cy, q - 6, q - 6, k, glow=120, fuel="charcoal")
    if bread in ("naan", "samsa") and k.lit:
        n = 3 if k.w < 2 else 5
        for i in range(n):
            a = -math.pi / 2 + i * 2 * math.pi / n; bx, by = cx + math.cos(a) * (q - 3), cy + math.sin(a) * (q - 3)
            if bread == "naan": d.ellipse([bx - 5, by - 3, bx + 5, by + 3], fill=(222, 184, 120), outline=(150, 96, 50)); d.point((bx, by), fill=(150, 96, 50))
            else: d.polygon([(bx - 4, by + 3), (bx, by - 4), (bx + 4, by + 3)], fill=(214, 166, 96), outline=(130, 80, 40))
    if bread == "skewers":
        for i in range(3): d.line([cx - q + 4 + i * 6, cy - q - 4, cx - q + 8 + i * 6, cy + q + 6], fill=STEEL[3], width=2); d.rectangle([cx - q + 5 + i * 6, cy - 2, cx - q + 8 + i * 6, cy + 4], fill=(140, 60, 40))
    if k.e < 7 or k.w >= 2: d.ellipse([X1 - 16, Y1 - 16, X1 - 5, Y1 - 5], fill=(k.metal if k.w >= 2 else WALNUT)[2], outline=OUT); d.ellipse([X1 - 12, Y1 - 12, X1 - 9, Y1 - 9], fill=SOOT[2])   # the lid, set aside
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, Pl, soot=True)


reg("tandoor", tandoor, axes={"bread": ["naan", "none", "skewers", "samsa", "naan"], "plinth": ["mud", "brick", "tiled", "stone", "mud"]}, nvar=16, states=("lit", "out"), clear=2,
    light={"dim": 3, "bright": .5, "color": "#ff9040", "kind": "fire"}, tags=("kitchen", "courtyard", "yard"),
    ref="tandoor and tannur jars 2 to 3 ft across in their plinth (ethnographic surveys of Punjab and Central Asian bakeries)")


# ---------------------------------------------------------------- the clay cooking stove of Asia
def cookstove_asia(tm, x, y, w, h, st, v):
    """A built cooking stove of clay or brick against the wall, its pots sunk in round holes on top and the fire
    mouths in the front (south). East Asia: a plastered brick stove (the Chinese zao, the Japanese kamado) with a
    wok and a rice pot under a wooden lid; Southeast Asia: a clay box on a raised hearth with a pot and a wok;
    South Asia: a mud chulha of two or three mouths. Modern: gas rings set in a tiled counter; Future Darkness: a
    dark counter with lit rings. Wealth adds tiles, more holes and a brass pot."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0
    n = 1 if k.w <= 0 else 2 if k.w <= 2 else 3
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.55)
    if k.e <= 6:
        fin = k.get("finish", "plaster")
        C = {"plaster": ramp((214, 210, 198), 12), "clay": ramp(mix(k.P["plaster"], (170, 110, 70), .4), 14), "brick": BRICK, "tile": k.tile, "black": ramp((60, 56, 56), 12)}[fin]
        rad = 10 if k.style == "southasia" else 3
        d.rounded_rectangle([X0, Y0, X1, Y1], rad, fill=C[2], outline=OUT); d.line([X0 + 4, Y0 + 1, X1 - 4, Y0 + 1], fill=C[4])
        if k.style == "eastasia" and k.w >= 3: pattern(tm, X0 + 2, Y1 - 9, X1 - 2, Y1 - 2, k, C1=k.tile, pat="tiles" if k.rich else "lattice", step=7)
        if k.style == "southasia" and k.w >= 2: pattern(tm, X0 + 4, Y1 - 8, X1 - 4, Y1 - 2, k, C1=ramp((236, 228, 210), 8), pat="dots", step=6)
        if k.style == "seasia": d.rectangle([X0 + 2, Y1 - 8, X1 - 2, Y1 - 2], fill=k.wood[2], outline=OUT)          # the bamboo edge of the hearth box
        if k.e >= 5 or (k.style == "eastasia" and k.w >= 2): d.ellipse([X1 - 14, Y0 + 2, X1 - 3, Y0 + 13], fill=SOOT[1], outline=OUT)   # the chimney
        rr = min(H_ // 3, W_ // (2 * n + 1)); cy = Y0 + H_ // 2 - 2
        for i in range(n):
            px_ = X0 + W_ * (i + 1) // (n + 1)
            d.ellipse([px_ - rr - 2, cy - rr - 2, px_ + rr + 2, cy + rr + 2], fill=SOOT[2], outline=OUT)
            kind = ("wok", "lid", "pot")[(i + k.w) % 3]
            if kind == "wok": d.ellipse([px_ - rr, cy - rr, px_ + rr, cy + rr], fill=IRON[2], outline=OUT); d.ellipse([px_ - rr + 4, cy - rr + 4, px_ + rr - 4, cy + rr - 4], fill=IRON[1]); d.ellipse([px_ - 3, cy - 2, px_ + 3, cy + 3], fill=(150, 170, 80)); d.line([px_ + rr - 2, cy, px_ + rr + 3, cy], fill=k.wood[3], width=2)
            elif kind == "lid": d.ellipse([px_ - rr, cy - rr, px_ + rr, cy + rr], fill=OAK[3], outline=OUT); d.line([px_ - rr + 3, cy, px_ + rr - 3, cy], fill=OAK[1], width=3)
            else: pot_on(tm, px_, cy, rr, k, C=(BRASS if k.rich or k.style == "southasia" else IRON), contents="soup")
            mx = px_; d.pieslice([mx - 7, Y1 - 8, mx + 7, Y1 + 6], 180, 360, fill=SOOT[0], outline=OUT)                # the fire mouth below
            if k.lit:
                fire(tm, mx, Y1 - 3, 5, 3, k, glow=90, cone=(math.pi / 2, 1.1))
            else: d.rectangle([mx - 4, Y1 - 4, mx + 4, Y1 - 2], fill=ASH[2])
    else:
        fin = k.get("finish", "plaster")
        tint = {"plaster": (210, 210, 206), "clay": (190, 150, 110), "brick": (170, 90, 70), "tile": k.P["tile"], "black": (60, 60, 66)}[fin]
        C = ramp(mix(tint, k.P["tile"], .25), 12) if k.e == 7 else ramp(mix(k.fd[2], tint, .5), 12)
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        if k.e == 7:
            for gx in range(X0 + 9, X1, 9): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=C[1])
            for gy in range(Y0 + 9, Y1, 9): d.line([X0 + 1, gy, X1 - 1, gy], fill=C[1])
        rr = min(H_ // 4, W_ // (2 * n + 2)); cy = Y0 + H_ // 2 - 2
        for i in range(n):
            px_ = X0 + W_ * (i + 1) // (n + 1)
            if k.e == 7:
                d.ellipse([px_ - rr, cy - rr, px_ + rr, cy + rr], fill=IRON[1], outline=OUT)
                for a in range(4): ra = a * math.pi / 2 + .78; d.line([px_ + math.cos(ra) * (rr - 1), cy + math.sin(ra) * (rr - 1), px_ + math.cos(ra) * (rr + 4), cy + math.sin(ra) * (rr + 4)], fill=IRON[0], width=2)
                if k.lit: d.ellipse([px_ - rr + 2, cy - rr + 2, px_ + rr - 2, cy + rr - 2], outline=(110, 160, 255), width=2)
            else: d.ellipse([px_ - rr, cy - rr, px_ + rr, cy + rr], outline=(k.fdglow if k.lit else C[3]), width=2)
            if i == 0: pot_on(tm, px_, cy, rr - 2, k, C=(STEEL if k.e == 7 else IRON), contents="soup")
            knob(tm, px_, Y1 - 4, CHROME, 2)
        if k.rich: d.rectangle([X0 + 4, Y0 + 1, X1 - 4, Y0 + 7], fill=(CHROME if k.e == 7 else ramp(k.fdglow, 10))[2], outline=OUT)    # the extractor hood's edge
        if k.w >= 2: pattern(tm, X0 + 2, Y1 - 8, X1 - 2, Y1 - 2, k, step=6)
        if k.lit: glow_for_map(tm, (X0 + X1) // 2, cy, 50)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, C, soot=True)


reg("cookstove-asia", cookstove_asia, axes={"finish": ["plaster", "clay", "brick", "tile", "black"]}, nvar=16, states=("lit", "out"), front=True, clear=2, mount="wall",
    light={"dim": 3, "bright": .5, "color": "#ff9040", "kind": "fire"}, tags=("kitchen",),
    ref="kitchen stoves of brick and clay 3 1/2 to 5 ft long and 2 to 3 ft deep (Chinese zao and Japanese kamado in folk house museums)")


# ---------------------------------------------------------------- the camp fire
def campfire(tm, x, y, w, h, st, v):
    """A camp fire on open ground: a patch of trodden, scorched earth, a ring of stones (in Africa the three
    hearthstones, in the far north driftwood and bones, on the steppe a dung fire on a stone ring), the logs laid as
    a star, a tepee or a log cabin, and what cooks over it: a pot on a tripod, a spit on forked sticks, a kettle on the
    stones. Modern ones burn in a steel fire ring with a grill; Future Darkness ones in a cut-down drum. The poor
    have no ring; the well-off carry an iron tripod and a good pot."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = (X1 - X0) // 2; rng = k.rng
    build = k.get("build", "star"); cook = k.get("cook", "pot")
    Eg = ramp(mix(k.P["plaster"], (70, 58, 46), .55), 12)
    pts = [(cx + math.cos(a) * R_ * rng.uniform(.86, 1), cy + math.sin(a) * R_ * rng.uniform(.86, 1)) for a in np.linspace(0, 2 * math.pi, 14, endpoint=False)]
    d.polygon(pts, fill=Eg[2]); d.polygon([(cx + (px_ - cx) * .7, cy + (py_ - cy) * .7) for px_, py_ in pts], fill=Eg[1])            # trodden earth, scorched in
    fr = int(R_ * .42)
    if k.e >= 7:
        C = ramp(mix(IRON[3], k.P["acc"], .35), 14) if k.e == 7 else k.fd
        d.ellipse([cx - fr - 8, cy - fr - 8, cx + fr + 8, cy + fr + 8], fill=C[2], outline=OUT); d.arc([cx - fr - 7, cy - fr - 7, cx + fr + 7, cy + fr + 7], 150, 290, fill=C[4], width=2)
        d.ellipse([cx - fr - 2, cy - fr - 2, cx + fr + 2, cy + fr + 2], fill=SOOT[1])
        if k.e == 8 and k.lit:
            for a in np.linspace(0, 2 * math.pi, 12, endpoint=False): d.point((cx + math.cos(a) * (fr + 6), cy + math.sin(a) * (fr + 6)), fill=k.fdglow)
    elif k.style == "africa":
        for a in (-90, 30, 150): ra = math.radians(a); stone_blob(tm, cx + math.cos(ra) * (fr + 6), cy + math.sin(ra) * (fr + 6), 11, 10, k.stone, rng)
    elif k.style == "polar":
        for a in np.linspace(0, 2 * math.pi, 6, endpoint=False): d.line([cx + math.cos(a) * (fr + 2), cy + math.sin(a) * (fr + 2), cx + math.cos(a + .5) * (fr + 10), cy + math.sin(a + .5) * (fr + 10)], fill=WHITE[2 + (int(a) % 2)], width=4)
    elif k.w >= 1:
        n = 9 if k.w < 3 else 12
        for a in np.linspace(0, 2 * math.pi, n, endpoint=False): stone_blob(tm, cx + math.cos(a) * (fr + 6), cy + math.sin(a) * (fr + 6), 8, 7, k.stone, rng)
    Cw = k.wood if k.style not in ("polar",) else ramp((176, 166, 146), 14)
    if k.lit:
        fire(tm, cx, cy, fr, int(fr * .9), k, glow=230, fuel="dung" if k.style == "steppe" and k.w <= 1 else "wood")
    else: fire(tm, cx, cy, fr, int(fr * .9), k)
    ends = {"star": [0, 72, 144, 216, 288], "tepee": [20, 100, 180, 260, 340, 60], "cabin": [0, 90, 180, 270]}[build]
    for a in ends:                                                                                        # the unburnt log ends poking out
        ra = math.radians(a); ln = fr + (12 if build == "star" else 5)
        if build == "cabin":
            ox = (fr + 2) * (1 if a in (0, 90) else -1); d.line([cx - fr - 4, cy + ox * .5 if a % 180 == 0 else cy, cx + fr + 4, cy + ox * .5 if a % 180 == 0 else cy], fill=Cw[1], width=4) if a % 180 == 0 else d.line([cx + ox * .5, cy - fr - 4, cx + ox * .5, cy + fr + 4], fill=Cw[2], width=4)
            continue
        d.line([cx + math.cos(ra) * fr * .5, cy + math.sin(ra) * fr * .5, cx + math.cos(ra) * ln, cy + math.sin(ra) * ln], fill=Cw[1], width=5)
        d.line([cx + math.cos(ra) * fr * .55, cy + math.sin(ra) * fr * .55 - 1, cx + math.cos(ra) * ln, cy + math.sin(ra) * ln - 1], fill=Cw[3], width=2)
        d.ellipse([cx + math.cos(ra) * ln - 2, cy + math.sin(ra) * ln - 2, cx + math.cos(ra) * ln + 2, cy + math.sin(ra) * ln + 2], fill=Cw[3], outline=OUT)
    if k.e >= 7 and k.w >= 2:                                                                            # the grill over it
        for gx in range(cx - fr, cx + fr + 1, 4): d.line([gx, cy - fr // 2, gx, cy + fr // 2], fill=STEEL[3])
    if cook == "pot":                                                                                    # a tripod and its pot
        Ct = IRON if k.w >= 2 or k.e >= 4 else Cw
        for a in (-90, 30, 150): ra = math.radians(a); d.line([cx, cy, cx + math.cos(ra) * (R_ - 4), cy + math.sin(ra) * (R_ - 4)], fill=Ct[2], width=3)
        pot_on(tm, cx, cy, fr // 2, k, C=(k.metal if k.rich else IRON), contents="stew")
    elif cook == "spit":
        for sx in (cx - R_ + 8, cx + R_ - 8): d.line([sx - 4, cy - 2, sx + 4, cy + 2], fill=Cw[1], width=3); d.line([sx - 4, cy + 2, sx + 4, cy - 2], fill=Cw[1], width=3)
        d.line([cx - R_ + 6, cy, cx + R_ - 6, cy], fill=Cw[3] if k.e < 4 else STEEL[3], width=2)
        d.ellipse([cx - 9, cy - 6, cx + 9, cy + 6], fill=(150, 84, 44), outline=OUT); d.arc([cx - 7, cy - 4, cx + 7, cy + 4], 200, 330, fill=(214, 150, 90))   # a hare or a fowl
    elif cook == "kettle":
        pot_on(tm, cx + fr - 2, cy + fr // 2, fr // 2 + 1, k, C=(k.metal if k.w >= 2 else IRON), contents="kettle")
    wear(tm, k, cx - fr, cy - fr, cx + fr, cy + fr, Eg) if k.cond == "broken" else None


reg("campfire", campfire, axes={"build": ["star", "tepee", "cabin"], "cook": ["pot", "none", "spit", "kettle"]}, states=("lit", "out"),
    light={"dim": 6, "bright": 2, "color": "#ff9a40", "kind": "fire"}, mount="ground", ref="a fire 2 1/2 to 3 ft across in its ring of stones, with the scorched ground and the cooking gear round it about 4 1/2 ft")


# ---------------------------------------------------------------- the cauldron on a tripod
def cauldron(tm, x, y, w, h, st, v):
    """A big pot hung on its chain from three splayed legs over a fire, seen from above: the legs reaching to three
    corners, the pot's rim, and what boils in it (stew, water, dye, porridge, a witch's green). Iron in most lands,
    bronze in East Asia, brass in South Asia, clay in Africa and the Americas; a steel stock pot on a camp tripod from
    the Modern era. Lit: flames lick out past the pot; out: ash under it."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = (X1 - X0) // 2
    cont = k.get("contents", "stew")
    Cp = {"eastasia": ramp((126, 100, 60), 18), "southasia": BRASS, "africa": CLAY, "americas": CLAY, "oceania": ramp((80, 70, 66), 14)}.get(k.style, IRON)
    if k.rich and Cp is IRON: Cp = COPPER
    if k.e >= 7: Cp = k.enam if k.e == 7 else k.fd
    Ct = ramp(mix(k.P["wood"], (70, 66, 70), .5 if k.e >= 4 else 0), 16) if k.w <= 1 else IRON
    Ash = ramp(mix(k.P["plaster"], (60, 52, 46), .3), 12)
    d.ellipse([cx - R_ + 3, cy - R_ + 3, cx + R_ - 3, cy + R_ - 3], fill=Ash[2]); d.ellipse([cx - R_ + 10, cy - R_ + 10, cx + R_ - 10, cy + R_ - 10], fill=Ash[0])   # the trodden ground, scorched in the middle
    for i, a in enumerate((-90, 30, 150)):
        ra = math.radians(a); ex, ey = cx + math.cos(ra) * (R_ - 2), cy + math.sin(ra) * (R_ - 2)
        d.line([cx, cy, ex, ey], fill=Ct[1], width=6); d.line([cx, cy - 1, ex, ey - 1], fill=Ct[4], width=2); d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=Ct[2], outline=OUT)
    r = int(R_ * .42)
    fire(tm, cx, cy + 2, r + 7, r + 5, k, glow=170)
    if k.e >= 7:                                                                                         # a camp burner's ring
        Cb = ramp(mix(STEEL[2], k.P["acc"], .5), 14) if k.e == 7 else ramp(k.fdglow, 12)
        d.ellipse([cx - r - 13, cy - r - 13, cx + r + 13, cy + r + 13], outline=Cb[2], width=6); d.arc([cx - r - 13, cy - r - 13, cx + r + 13, cy + r + 13], 180, 270, fill=Cb[4], width=2)
    if k.w >= 1 and k.e < 7:                                                                             # stones round the fire
        for a in np.linspace(0, 2 * math.pi, 7 + k.w, endpoint=False): stone_blob(tm, cx + math.cos(a) * (r + 11), cy + math.sin(a) * (r + 11), 5, 4, k.stone, k.rng)
    pot_on(tm, cx, cy, r, k, C=Cp, contents=cont)
    if cont == "witch":
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(80, 170, 60)); d.ellipse([cx - 3, cy - 4, cx + 2, cy + 1], fill=(170, 240, 120)); d.point((cx + 5, cy + 3), fill=(200, 255, 160))
    d.line([cx, cy - r, cx, cy - 2], fill=IRON[3], width=1)                                                # the chain to the pot's bail
    if k.lit and cont in ("stew", "water", "witch", "soup"):
        for i in range(3): d.arc([cx - 4 + i * 3, cy - 4 - i * 2, cx + 2 + i * 3, cy + 2 - i * 2], 200, 340, fill=(236, 236, 232))   # steam curling up
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, Cp)


reg("cauldron", cauldron, axes={"contents": ["stew", "water", "dye", "porridge", "witch", "soup", "milk"]}, states=("lit", "out"), clear=1,
    light={"dim": 4, "bright": 1, "color": "#ff9a40", "kind": "fire"}, tags=("camp", "kitchen", "yard", "laboratory"),
    ref="iron cauldrons 16 to 24 in across hung from a tripod about 3 ft between the feet")


# ---------------------------------------------------------------- the roasting spit
MEATS = {"pig": ((214, 150, 120), (180, 110, 80)), "fowl": ((214, 168, 100), (170, 110, 60)), "joint": ((150, 70, 50), (110, 50, 40)), "lamb": ((200, 150, 110), (160, 100, 70)), "fish": ((180, 186, 180), (120, 126, 120))}


def spit(tm, x, y, w, h, st, v):
    """A roasting spit across a long fire: two iron firedogs or forked stakes at the ends, the spit rod with its crank
    handle on the east, the roast on it (a pig, a joint, fowls, a lamb, fish), the drip pan below it on the south.
    Dark Ages: forked stakes over a fire on the ground; Renaissance and after: iron spit-dogs on a stone hearth, the
    rich with a clockwork jack and a row of birds. The region chooses the meat, the stone and the stakes."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2 - 3
    meat = k.get("meat", "pig")
    if k.style in ("islamic", "southasia") and meat == "pig": meat = "lamb"
    Hs = k.stone if k.e >= 2 or k.w >= 3 else ramp(mix(k.P["plaster"], (60, 52, 46), .5), 12)
    d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=Hs[2], outline=OUT); d.line([X0 + 5, Y0 + 5, X1 - 5, Y0 + 5], fill=Hs[4])          # the hearth slab or bare ground
    if k.e >= 2 and k.w >= 2:
        for gx in range(X0 + 20, X1 - 6, 20): d.line([gx, Y0 + 5, gx, Y1 - 5], fill=Hs[1])
    if k.w >= 4: pattern(tm, X0 + 5, Y1 - 10, X1 - 5, Y1 - 5, k, step=6)
    fire(tm, (X0 + X1) // 2, cy + 6, W_ // 3, H_ // 6, k, glow=200)
    Cd = IRON if k.e >= 2 or k.w >= 3 else k.wood
    for sx in (X0 + 12, X1 - 12):
        if Cd is IRON: d.rectangle([sx - 4, Y0 + 6, sx + 4, Y1 - 10], fill=IRON[2], outline=OUT); d.line([sx - 3, Y0 + 7, sx - 3, Y1 - 11], fill=IRON[4])
        else: d.line([sx - 6, cy - 6, sx + 6, cy + 6], fill=Cd[1], width=4); d.line([sx - 6, cy + 6, sx + 6, cy - 6], fill=Cd[2], width=4)
    d.line([X0 + 8, cy, X1 - 6, cy], fill=(IRON if Cd is IRON else Cd)[3], width=3)                                    # the spit rod
    d.line([X1 - 8, cy, X1 - 8, cy + 10], fill=IRON[3], width=3); knob(tm, X1 - 8, cy + 11, k.wood, 2)                  # the crank
    C1, C2 = MEATS[meat]
    if meat in ("fowl", "fish"):
        n = 2 + k.w // 2
        for i in range(n):
            mx = X0 + 22 + i * (W_ - 44) // max(1, n - 1) if n > 1 else (X0 + X1) // 2
            d.ellipse([mx - 7, cy - 6, mx + 7, cy + 6], fill=C1, outline=OUT); d.arc([mx - 5, cy - 4, mx + 5, cy + 4], 200, 320, fill=tone(C1, 30))
            if meat == "fowl": d.ellipse([mx - 9, cy - 3, mx - 5, cy + 3], fill=C2, outline=OUT)
            else: d.polygon([(mx + 7, cy), (mx + 12, cy - 4), (mx + 12, cy + 4)], fill=C2, outline=OUT)
    else:
        L = {"pig": W_ // 3, "joint": W_ // 6, "lamb": W_ // 4}[meat]; mx = (X0 + X1) // 2
        d.ellipse([mx - L, cy - 9, mx + L, cy + 9], fill=C1, outline=OUT); d.arc([mx - L + 3, cy - 7, mx + L - 3, cy + 7], 200, 330, fill=tone(C1, 30), width=2)
        d.line([mx - L + 6, cy + 4, mx + L - 6, cy + 4], fill=C2)
        if meat == "pig": d.ellipse([mx + L - 4, cy - 5, mx + L + 4, cy + 5], fill=C1, outline=OUT); d.point((mx + L + 2, cy - 1), fill=OUT)
        if meat == "lamb":
            for lx in (mx - L + 2, mx + L - 2): d.line([lx, cy, lx + (-6 if lx < mx else 6), cy + 4], fill=C2, width=3)
        if k.lit: d.arc([mx - L + 4, cy - 6, mx + L - 4, cy + 6], 20, 160, fill=(150, 80, 40))                         # browned underside lit by the fire
    d.rectangle([X0 + W_ // 4, Y1 - 12, X1 - W_ // 4, Y1 - 6], fill=(IRON if k.w < 4 else BRASS)[2], outline=OUT); d.line([X0 + W_ // 4 + 2, Y1 - 9, X1 - W_ // 4 - 2, Y1 - 9], fill=(196, 160, 70))   # the drip pan
    if k.rich and k.e >= 2:                                                                                             # the clockwork jack on the end post
        d.rectangle([X1 - 22, Y0 + 6, X1 - 6, Y0 + 18], fill=BRASS[2], outline=OUT); d.ellipse([X1 - 18, Y0 + 8, X1 - 10, Y0 + 16], fill=BRASS[4], outline=OUT)
    wear(tm, k, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, Hs, soot=True)


reg("spit", spit, axes={"meat": ["pig", "fowl", "joint", "lamb", "fish"]}, states=("lit", "out"), clear=1, front=True,
    light={"dim": 4, "bright": 1, "color": "#ff9a40", "kind": "fire"}, tags=("kitchen", "greathall", "camp"),
    ref="kitchen spits about 5 ft between the spit-dogs over a fire about 3 ft deep (surviving Tudor kitchens, Hampton Court)")


# ---------------------------------------------------------------- the radiator
def radiator(tm, x, y, w, h, st, v):
    """A radiator under the window or along the wall, seen from above: a row of cast sections, their tops rounded,
    the valve and pipe at one end. Victorian: ornate cast columns with a scroll on each, often bronzed; Great War:
    plain column sections; Mid-Century: slimmer sections painted cream or the house's colour; Modern: a flat steel
    panel with its grille; Future Darkness: a dark slab with a lit strip. Rich houses have a marble or wooden cover
    shelf and brass valves; worn ones are chipped and rusty."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0
    base = {"bronze": (170, 130, 70), "cream": (226, 214, 178), "white": (234, 232, 226), "grey": (150, 152, 156), "silver": (190, 192, 196)}[k.get("paint", "cream")]
    paint = ramp(mix(base, k.P["tile"] if k.e % 2 else k.P["acc"], .6), 12)
    if k.e == 8: paint = ramp(mix(mix(k.fd[2], k.P["acc2"], .35), base, .25), 12)
    if k.style == "global": paint = ramp(base, 12) if k.e < 8 else ramp(mix((58, 64, 74), base, .7), 12)
    tm.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 3), f=.56)
    if k.e <= 6:
        n = max(6, W_ // (8 if k.e == 4 else 6 if k.e == 5 else 5))
        sw = W_ / n
        for i in range(n):
            sx0 = X0 + i * sw; sx1 = sx0 + sw - 1
            d.rounded_rectangle([sx0, Y0 + 1, sx1, Y1 - 1], 2, fill=paint[2], outline=OUT); d.line([sx0 + 1, Y0 + 2, sx0 + 1, Y1 - 2], fill=paint[4])
            if k.e == 4 and sw > 5: d.point((sx0 + sw / 2, (Y0 + Y1) / 2), fill=paint[0]); d.point((sx0 + sw / 2, Y0 + 3), fill=paint[4])
    else:
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=paint[2], outline=OUT); d.line([X0 + 1, Y0 + 2, X1 - 1, Y0 + 2], fill=paint[4])
        for gx in range(X0 + 3, X1 - 2, 3): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=paint[1])
        if k.e == 8: d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=k.fdglow)
    if k.rich and k.e <= 6:                                                                                  # a cover shelf on top
        Cs = ramp(mix((222, 218, 210), k.P["stone"], .4), 10) if k.e != 5 else WALNUT
        d.rectangle([X0 + W_ // 6, Y0, X1 - W_ // 6, Y1], fill=Cs[2], outline=OUT); d.line([X0 + W_ // 6 + 1, Y0 + 1, X1 - W_ // 6 - 1, Y0 + 1], fill=Cs[4])
        pattern(tm, X0 + W_ // 6 + 2, Y0 + 2, X1 - W_ // 6 - 2, Y1 - 2, k, step=6)
    fit = k.get("fit", "plain")
    if fit == "boxed":                                                                                        # a slatted cover box over it
        Cb = ramp((222, 218, 206) if k.w < 4 else (150, 110, 70), 12)
        d.rectangle([X0, Y0, X1, Y1], fill=Cb[2], outline=OUT)
        for gx in range(X0 + 3, X1 - 2, 4): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=Cb[0])
    vx = X1 - 3                                                                                               # the valve and its pipe
    if fit == "thermostat": d.ellipse([vx - 6, Y1 - 9, vx + 4, Y1 + 1], fill=WHITE[3], outline=OUT); d.line([vx - 1, Y1 - 8, vx - 1, Y1 - 4], fill=WHITE[0])
    else: d.ellipse([vx - 4, Y1 - 6, vx + 4, Y1 + 1], fill=(BRASS if k.w >= 3 else IRON)[3], outline=OUT)
    if fit == "pipes":                                                                                        # the flow and return pipes along the wall
        for py in (Y0 + 2, Y1 - 2): d.line([X0, py, X1, py], fill=(COPPER if k.e >= 6 else IRON)[3], width=2)
    if fit == "towel":                                                                                        # a towel drying over it
        Ct = ramp(k.rng.choice([(200, 80, 70), (90, 130, 190), (230, 226, 210), (120, 170, 110)]), 12)
        tx0 = X0 + W_ // 5; d.rectangle([tx0, Y0, tx0 + W_ // 3, Y1], fill=Ct[2], outline=OUT); d.line([tx0 + 2, Y0 + 2, tx0 + 2, Y1 - 2], fill=Ct[4])
    if fit == "socks":                                                                                        # socks and gloves laid on top
        for i in range(3):
            sx = X0 + 6 + i * W_ // 4; Cs_ = ramp([(60, 60, 70), (200, 60, 50), (220, 216, 200)][i], 10)
            d.rounded_rectangle([sx, Y0 + 1, sx + W_ // 6, Y1 - 2], 3, fill=Cs_[2], outline=OUT)
    if fit == "shelf":                                                                                        # a plain shelf over it with things on it
        Cs_ = ramp((150, 110, 70) if k.w >= 3 else (226, 222, 212), 12)
        d.rectangle([X0, Y0, X1, Y1 - 3], fill=Cs_[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cs_[4])
        d.ellipse([X0 + W_ // 4, Y0 + 2, X0 + W_ // 4 + 8, Y0 + 9], fill=CLAY[3], outline=OUT); d.rectangle([X1 - W_ // 3, Y0 + 3, X1 - W_ // 3 + 12, Y0 + 8], fill=(80, 100, 140), outline=OUT)
    wear(tm, k, X0, Y0, X1, Y1, paint)


reg("radiator", radiator, axes={"paint": ["cream", "bronze", "white", "grey", "silver"], "fit": ["towel", "plain", "boxed", "socks", "thermostat"]}, clear=1, global_from=1902, nvar=20,
    tags=("home", "office", "hall", "parlour", "chamber", "ward", "station"), ref="cast-iron column radiators 2 1/2 to 4 ft long and 7 to 10 in deep (American Radiator Company catalogues, 1900s)")


# ---------------------------------------------------------------- the heater
def heater(tm, x, y, w, h, st, v):
    """A small room heater against the wall. Great War: a gas fire, a row of white clay radiants in an iron frame,
    glowing orange when lit; Mid-Century: an electric bar fire, a chrome reflector bowl with two or three red-hot
    bars; Modern: an oil-filled fin heater or a fan heater with its grille; Future Darkness: a dark panel with a lit
    face. The region gives the casing's enamel; lit, the bars or radiants glow and warm the floor in front."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    tm.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 3), f=.56)
    C = k.enam if k.e != 8 else k.fd
    if k.e <= 5 or (k.e == 6 and k.w <= 1):
        Cf = k.enam if k.w >= 2 else ramp(mix(IRON[3], k.P["tile"], .4), 14)
        d.rectangle([X0, Y0, X1, Y1], fill=Cf[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cf[4])
        pattern(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, k, C1=ramp(Cf[4], 8), step=5)
        n = 3 + k.w; rw = (W_ - 16) / n; X0 += 4
        for i in range(n):
            rx = X0 + 4 + i * rw; d.rectangle([rx, Y0 + 3, rx + rw - 2, Y1 - 3], fill=(FIREC[3] if k.lit else WHITE[2]), outline=(FIREC[1] if k.lit else WHITE[0]))
            d.line([rx + 1, Y0 + 5, rx + 1, Y1 - 5], fill=(FIREC[5] if k.lit else WHITE[4]))
        if k.w >= 3: rim(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, BRASS)
    elif k.e == 6 and k.get("kind") == "fan":                                                  # a bowl fire: a round chrome reflector with its element
        d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=C[1], outline=OUT); q = min(W_, H_) // 2 - 1
        d.ellipse([cx - q, Y0 + 1, cx + q, Y1 - 1], fill=CHROME[3], outline=OUT); d.ellipse([cx - q // 3, (Y0 + Y1) // 2 - q // 3, cx + q // 3, (Y0 + Y1) // 2 + q // 3], fill=((240, 90, 40) if k.lit else (110, 100, 96)))
    elif k.e == 6 and k.get("kind") == "panel":                                               # a convector cabinet with its louvres
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        for gy in range(Y0 + 3, Y1 - 2, 3): d.line([X0 + 4, gy, X1 - 4, gy], fill=C[0])
        if k.lit: d.rectangle([X1 - 8, Y0 + 2, X1 - 3, Y0 + 6], fill=(240, 90, 40))
    elif k.e == 6:
        d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=C[2], outline=OUT)
        pattern(tm, X0 + 1, Y0 + 1, X0 + 7, Y1 - 1, k, C1=ramp(C[4], 8), step=4); pattern(tm, X1 - 7, Y0 + 1, X1 - 1, Y1 - 1, k, C1=ramp(C[4], 8), step=4)
        d.rounded_rectangle([X0 + 8, Y0 + 3, X1 - 8, Y1 - 3], 5, fill=CHROME[3], outline=CHROME[1])                      # the reflector
        for i in range(2 + (k.w >= 3)):
            by = Y0 + 5 + i * (H_ - 10) // max(1, 1 + (k.w >= 3)); d.line([X0 + 10, by, X1 - 10, by], fill=((230, 70, 30) if k.lit else (120, 110, 100)), width=3)
            if k.lit: d.line([X0 + 8, by, X1 - 8, by], fill=(255, 170, 90))
        for gx in range(X0 + 12, X1 - 10, 6): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=CHROME[2])                              # the guard
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 4, fill=C[2], outline=OUT); d.line([X0 + 3, Y0 + 1, X1 - 3, Y0 + 1], fill=C[4])
        if k.get("kind") in ("fins", "panel"):
            for gx in range(X0 + 4, X1 - 3, 5): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=C[0])
            d.ellipse([X1 - 9, Y0 + 3, X1 - 3, Y0 + 9], fill=((220, 60, 40) if k.lit else (80, 40, 40)), outline=OUT)        # the pilot lamp
        else:
            d.ellipse([cx - H_ // 2 + 2, Y0 + 2, cx + H_ // 2 - 2, Y1 - 2], fill=SOOT[2], outline=OUT)                       # the fan grille
            for q in range(3, H_ // 2 - 2, 3): d.ellipse([cx - q, (Y0 + Y1) // 2 - q, cx + q, (Y0 + Y1) // 2 + q], outline=C[1])
            d.line([X0 + 3, Y1 - 3, cx - H_ // 2, Y1 - 3], fill=(k.fdglow if k.e == 8 else (255, 140, 60)) if k.lit else C[0], width=2)
    if k.lit:
        warm(tm, cx, Y1, W_, .35); glow_for_map(tm, cx, Y1, 70, (math.pi / 2, 1.0))
    wear(tm, k, X0, Y0, X1, Y1, C)


reg("heater", heater, axes={"kind": ["fins", "fan", "panel", "fins", "fan", "panel", "fan"], "livery": ["white", "beige", "grey", "black", "red", "chrome", "blue"]}, states=("lit", "out"), front=True, clear=2, nvar=26, global_from=1919,
    light={"dim": 2, "bright": .5, "color": "#ff8a50", "kind": "fire"}, tags=("chamber", "office", "parlour"),
    ref="gas fires and electric bar fires 16 to 24 in wide and 8 to 12 in deep (Belling and Cannon catalogues, 1920s to 1960s)")


# ---------------------------------------------------------------- the smith's forge
def bellows(tm, kk, bx0, by0, bx1, by1):
    """The forge's blower in the region's manner, its nozzle toward the west (the fire). Great leather bellows on a
    frame in Europe; a box bellows (fuigo) in East Asia; two goatskin bags in South Asia and the steppe; two pot
    bellows with their sticks in Africa; a hand-cranked fan blower from the Victorian age; an electric blower from
    Mid-Century; a gas line and regulator in the Modern age."""
    d = tm.d; cy = (by0 + by1) // 2; W_, H_ = bx1 - bx0, by1 - by0
    if kk.e >= 7:                                                                                      # the gas bottle and its hose
        r = min(W_, H_) // 3; gx, gy = bx0 + W_ // 2, cy
        C = ramp(mix((170, 60, 40), kk.P["acc"], .4), 16) if kk.e == 7 else kk.fd
        d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=C[2], outline=OUT); d.arc([gx - r + 2, gy - r + 2, gx + r - 2, gy + r - 2], 160, 280, fill=C[4], width=2)
        d.ellipse([gx - 4, gy - 4, gx + 4, gy + 4], fill=BRASS[3], outline=OUT); d.line([gx - 4, gy, bx0 - 4, gy - 6], fill=SOOT[2], width=3)
        return
    if kk.e >= 4:                                                                                      # a fan blower on its stand, crank out
        r = min(W_, H_) // 3; gx, gy = bx0 + W_ // 2, cy
        C = ramp(mix(IRON[3], kk.P["tile"], .35), 14) if kk.e == 4 or kk.w < 3 else kk.enam
        d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=C[2], outline=OUT); d.ellipse([gx - r + 4, gy - r + 4, gx + r - 4, gy + r - 4], outline=C[4])
        d.rectangle([bx0 - 4, gy - 4, gx, gy + 4], fill=C[1], outline=OUT)
        if kk.e == 4 or kk.w < 3: d.line([gx, gy, gx + r + 6, gy + r // 2], fill=IRON[3], width=3); knob(tm, gx + r + 6, gy + r // 2, kk.wood, 3)
        else: d.rectangle([gx + r - 2, gy - 6, gx + r + 8, gy + 6], fill=STEEL[2], outline=OUT)        # the motor
        return
    st = kk.style
    if st == "eastasia":
        d.rectangle([bx0 + 2, by0 + 6, bx1 - 2, by1 - 6], fill=kk.wood[2] if kk.w >= 2 else OAK[1], outline=OUT); d.line([bx0 + 3, by0 + 7, bx1 - 3, by0 + 7], fill=kk.wood[4])
        d.line([bx1 - 2, cy, bx1 + 2, cy], fill=OAK[3], width=3); d.line([bx0 - 4, cy, bx0 + 2, cy], fill=IRON[2], width=4)   # the push handle and the nozzle
        if kk.w >= 2: pattern(tm, bx0 + 4, by0 + 9, bx1 - 4, by1 - 9, kk, pat="lattice", step=6)
    elif st in ("africa", "southasia", "steppe", "seasia", "americas", "oceania", "polar"):
        Cs = ramp((150, 110, 72), 16) if st != "africa" else CLAY
        for oy in (by0 + H_ // 4, by1 - H_ // 4):                                                   # two bags or two pots
            if st == "africa":
                d.ellipse([bx0 + 6, oy - 10, bx0 + 26, oy + 10], fill=Cs[2], outline=OUT); d.ellipse([bx0 + 10, oy - 6, bx0 + 22, oy + 6], fill=ramp((150, 120, 80), 12)[3]); d.line([bx0 + 16, oy, bx1 - 4, oy - 4], fill=kk.wood[3], width=3)
            else:
                d.ellipse([bx0 + 4, oy - 9, bx1 - 4, oy + 9], fill=Cs[2], outline=OUT); d.arc([bx0 + 6, oy - 7, bx1 - 6, oy + 7], 180, 270, fill=Cs[4]); d.line([bx0 + 8, oy - 5, bx0 + 8, oy + 5], fill=Cs[0])
            d.line([bx0 - 4, cy, bx0 + 6, oy], fill=IRON[2], width=3)
    else:
        Cb = ramp((130, 80, 50), 16) if kk.w < 4 else ramp((110, 60, 50), 16)
        d.polygon([(bx0, cy - H_ // 2 + 4), (bx1 - 8, cy - 7), (bx1 - 8, cy + 7), (bx0, cy + H_ // 2 - 4)], fill=Cb[2], outline=OUT)   # the great leather bellows
        for i in range(4): xx = bx0 + 6 + i * (W_ - 16) // 4; hh = (H_ // 2 - 6) * (1 - i / 5); d.line([xx, cy - hh, xx, cy + hh], fill=Cb[0])
        d.line([bx0 + 3, cy - H_ // 2 + 6, bx1 - 10, cy - 6], fill=Cb[4])
        d.line([bx1 - 8, cy, bx1 - 1, cy], fill=kk.wood[3], width=4)                                    # its handle
        d.line([bx0 - 6, cy, bx0 + 2, cy], fill=IRON[2], width=4)
        if kk.w >= 3: pattern(tm, bx0 + 4, cy - 4, bx0 + W_ // 2, cy + 4, kk, step=5)


def forge(tm, x, y, w, h, st, v):
    """A smith's forge against the wall: a waist-high hearth of stone or brick, its firepot of coals under the hood
    (north), the blower beside it (east), the quench tub and the tongs by the front. Dark Ages: a fieldstone hearth
    with clay walls; Renaissance and after: dressed stone or brick with an iron hood; Victorian: a cast-iron forge
    pan with a cranked fan blower; Mid-Century: an electric blower; Modern: a gas forge, a firebrick box with ports;
    Future Darkness: an induction coil in a dark case. The region gives the stone and its blower. Lit: the coals
    glow white-hot and throw light; out: grey clinker."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0
    fw = int(W_ * .64); fx0, fx1 = X0, X0 + fw; cx = (fx0 + fx1) // 2
    Cs, _kind = k.mat()
    if k.e <= 1: Cs = k.stone
    if k.e <= 1 and k.poor: Cs = ramp(mix(k.P["plaster"], (130, 100, 80), .3), 14)
    if k.e >= 4 and k.e <= 6: Cs = ramp(mix(IRON[3], k.P["acc"], .45), 14) if k.w >= 2 else Cs
    if k.e == 7: Cs = ramp(mix((196, 176, 150), k.P["acc"], .5), 12)
    if k.e == 8: Cs = ramp(mix(k.fd[2], k.P["acc2"], .3), 14)
    Fl = ramp(mix(k.P["stone"], k.P["acc2"], .35), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=mix(Fl[2], (90, 80, 70), .25), outline=OUT)                 # the smithy floor round the hearth
    block(tm, fx0, Y0 + 2, fx1, Y1 - 12, Cs)
    if _kind == "brick" and 2 <= k.e <= 3: bricks(tm, fx0 + 1, Y0 + 3, fx1 - 1, Y1 - 13, BRICK, 12, 6)
    elif k.e <= 3:
        for gx in range(fx0 + 22, fx1 - 4, 22): d.line([gx, Y0 + 4, gx, Y1 - 14], fill=Cs[1])
    hood = (Y1 - Y0) // 4
    Ch = IRON if k.e >= 2 else Cs
    d.rectangle([fx0 + 6, Y0 + 2, fx1 - 6, Y0 + 2 + hood], fill=Ch[3] if Ch is IRON else Cs[3], outline=OUT); d.line([fx0 + 7, Y0 + 3, fx1 - 7, Y0 + 3], fill=Ch[4])   # the hood or chimney
    if k.w >= 3 and k.e < 7: pattern(tm, fx0 + 8, Y0 + 4, fx1 - 8, Y0 + hood, k, step=7)
    fcy = Y0 + hood + (Y1 - 12 - Y0 - hood) // 2
    if k.e == 7:                                                                                   # the gas forge box
        d.rectangle([cx - fw // 4, fcy - 14, cx + fw // 4, fcy + 14], fill=(226, 214, 190), outline=OUT); d.rectangle([cx - fw // 4 + 4, fcy - 6, cx + fw // 4 - 4, fcy + 6], fill=(FIREC[4] if k.lit else SOOT[1]), outline=OUT)
        if k.lit: warm(tm, cx, fcy, fw // 3, .4); glow_for_map(tm, cx, fcy, 150)
    elif k.e == 8:
        d.ellipse([cx - 16, fcy - 16, cx + 16, fcy + 16], outline=(k.fdglow if k.lit else Cs[3]), width=3); d.rectangle([cx - 4, fcy - 4, cx + 4, fcy + 4], fill=(FIREC[4] if k.lit else Cs[0]))
        if k.lit: halo(tm, cx, fcy, 24, (255, 170, 90), .4); glow_for_map(tm, cx, fcy, 120)
    else:
        d.ellipse([cx - fw // 4, fcy - 16, cx + fw // 4, fcy + 16], fill=SOOT[1], outline=OUT)
        fire(tm, cx, fcy, fw // 4 - 4, 12, k, glow=170, fuel="charcoal" if k.e <= 3 else "coal")
        if k.lit: d.rectangle([cx - 10, fcy - 2, cx + 6, fcy + 2], fill=(255, 230, 160), outline=FIREC[3])   # an iron bar heating in the coals
        else: d.rectangle([cx - 10, fcy - 2, cx + 6, fcy + 2], fill=IRON[2], outline=OUT)
    for i in range(3 + k.w):                                                                         # fuel heaped on the rim
        d.ellipse([fx0 + 6 + i * 6, Y1 - 24, fx0 + 13 + i * 6, Y1 - 17], fill=SOOT[2])
    bellows(tm, k, fx1 + 6, Y0 + 4, X1 - 2, Y1 - 18)
    qx, qy, qr = X1 - 16, Y1 - 12, 10                                                                 # the quench tub
    Cq = k.wood if k.e < 6 else ramp(mix(STEEL[2], k.P["acc"], .3), 14)
    d.ellipse([qx - qr, qy - qr, qx + qr, qy + qr], fill=Cq[2], outline=OUT); d.ellipse([qx - qr + 3, qy - qr + 3, qx + qr - 3, qy + qr - 3], fill=WATER[1]); d.point((qx - 3, qy - 3), fill=WATER[4])
    d.line([fx1 - 22, Y1 - 6, fx1 - 4, Y1 - 10], fill=IRON[3], width=2); d.line([fx1 - 22, Y1 - 4, fx1 - 4, Y1 - 6], fill=IRON[3], width=2)   # tongs on the rim
    wear(tm, k, fx0 + 2, Y0 + 4, fx1 - 2, Y1 - 14, Cs, soot=True)


reg("forge", forge, axes={}, states=("lit", "out"), front=True, clear=3, mount="wall", group="hearths",
    light={"dim": 5, "bright": 1.5, "color": "#ff8a30", "kind": "fire"}, ref="a waist-high hearth 5 to 6 ft long with its bellows beside it, about 9 by 6 ft in all (Diderot's Encyclopedie, forge plates)")


# ---------------------------------------------------------------- the potter's kiln
def kiln(tm, x, y, w, h, st, v):
    """A potter's kiln seen from above. Dark Ages to Victorian: a round updraft kiln of brick or clay, its domed
    roof with vent holes and the fire mouths on the south (by the Mediterranean and in the Islamic world plastered
    white; in Africa a clay dome; in East Asia a square brick chamber with a stepped flue); Great War and Mid-
    Century: a brick kiln with an iron door and a chimney; Modern: an electric kiln, an eight-sided steel drum with its
    lid and control box; Future Darkness: a sealed dark kiln with a lit window. Lit: the mouths roar and the vents
    glow; out: cold. Pots wait on the ground beside it, greenware or fired."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 - 4; W_ = X1 - X0; r = int(W_ * .40)
    load = k.get("load", "pots")
    tm.shade((cx - r + 4, cy - r + 5, cx + r + 5, cy + r + 5), f=.55, kind="ellipse")
    if k.e <= 6:
        sq = k.style == "eastasia" or k.e in (5, 6)
        Cb, kind = k.mat()
        if sq:
            d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=Cb[2], outline=OUT)
            if kind == "brick": bricks(tm, cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, Cb, 10, 5)
            for i in range(3): d.rectangle([cx - r + 6 + i * 4, cy - r + 6 + i * 4, cx + r - 6 - i * 4, cy + r - 6 - i * 4], outline=Cb[0 if i % 2 else 3])   # the stepped roof
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Cb[2], outline=OUT)
            for q, c, o in ((r - 4, 3, -2), (int(r * .6), 4, -5)): d.ellipse([cx - q + o, cy - q + o, cx + q + o, cy + q + o], fill=Cb[c])
            if kind == "brick":
                for a in np.linspace(0, 2 * math.pi, 18, endpoint=False): d.line([cx + math.cos(a) * r * .65, cy + math.sin(a) * r * .65, cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=Cb[0])
            if k.w >= 2: d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=IRON[2], width=2)                     # the iron band
        nv = 4 + k.w
        for i in range(nv):                                                                         # vent holes, glowing when fired
            a = i * 2 * math.pi / nv + .3; vx, vy = cx + math.cos(a) * r * .45, cy + math.sin(a) * r * .45
            d.ellipse([vx - 3, vy - 3, vx + 3, vy + 3], fill=(FIREC[4] if k.lit else SOOT[1]), outline=OUT)
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(FIREC[3] if k.lit else SOOT[0]), outline=OUT)
        if k.e >= 5: d.rectangle([cx + r - 14, cy - r - 2, cx + r - 2, cy - r + 10], fill=BRICK[1], outline=OUT); d.rectangle([cx + r - 11, cy - r + 1, cx + r - 5, cy - r + 7], fill=SOOT[0])   # the chimney
        for mx in ((cx - r // 2, cx + r // 2) if k.w >= 2 else (cx,)):                                # the fire mouths
            my = cy + r - 2
            d.pieslice([mx - 9, my - 9, mx + 9, my + 9], 0, 180, fill=SOOT[0], outline=OUT)
            if k.lit: fire(tm, mx, my + 2, 6, 3, k, glow=120, cone=(math.pi / 2, 1.1))
        if k.lit: halo(tm, cx, cy, r // 2, (255, 160, 80), .25)
    else:
        C = ramp(mix(STEEL[2], k.P["acc"], .45), 16) if k.e == 7 else k.fd
        Cs_, _ = k.mat(); d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=mix(Cs_[2], (200, 200, 200), .4), outline=OUT)   # the floor slab it stands on
        pts = [(cx + math.cos(a) * r, cy + math.sin(a) * r) for a in np.linspace(math.pi / 8, 2 * math.pi + math.pi / 8, 8, endpoint=False)]
        d.polygon(pts, fill=C[2], outline=OUT); d.polygon([(cx + (px_ - cx) * .8, cy + (py_ - cy) * .8) for px_, py_ in pts], fill=C[3], outline=C[1])
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=C[1], outline=OUT)                            # the peephole plug
        bx = cx + r - 6; d.rectangle([bx, cy + r // 3, bx + 14, cy + r // 3 + 18], fill=(ramp(mix((90, 96, 104), k.P["tile"], .3), 12) if k.e == 7 else C)[2], outline=OUT)   # the control box
        d.rectangle([bx + 3, cy + r // 3 + 3, bx + 11, cy + r // 3 + 8], fill=((240, 80, 50) if k.lit else SOOT[1]) if k.e == 7 else (k.fdglow if k.lit else SOOT[1]))
        if k.lit: glow_for_map(tm, cx, cy, 50)
    if load != "none":                                                                                 # pots waiting beside it
        Cp = ramp((206, 190, 160), 10) if load == "pots" else ramp(k.P["tile"] if load == "glazed" else (176, 104, 66), 16)
        n = 2 + k.w
        for i in range(n):
            px_, py_ = X0 + 8 + i * 12, Y1 - 9
            d.ellipse([px_ - 5, py_ - 5, px_ + 5, py_ + 5], fill=Cp[2], outline=OUT); d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=Cp[0])
    wear(tm, k, cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4, Cb if k.e <= 6 else C, soot=True)


reg("kiln", kiln, name="potter's kiln", ft=((5, 7), (5, 7)), eras=(1197, E), group="hearths", axes={"load": ["pots", "none", "glazed", "fired", "pots"]}, states=("lit", "out"),
    front=True, clear=2, mount="floor", tags=("pottery", "yard"), light={"dim": 4, "bright": 1, "color": "#ff7a30", "kind": "fire"},
    ref="round updraft potters' kilns 5 to 7 ft across (excavated medieval kilns, e.g. Laverstock); electric kilns 2 to 3 ft with their box")


# ---------------------------------------------------------------- the still
def still(tm, x, y, w, h, st, v):
    """A still: the pot on its furnace (west), the head and its swan neck running east to the worm tub, the coil in
    the cooling water, and the spout dripping into a jug or bottle at the front. Long Night and Renaissance: a clay or
    copper alembic, an alchemist's or apothecary's; Age of Reason to Mid-Century: a copper pot still on a brick
    furnace; Modern: a stainless still with a column; Future Darkness: glass and dark composite. In East Asia a clay
    pot still with a wooden head; in South Asia clay pots joined by a bamboo pipe. Lit: the furnace glows."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0
    pr_ = int(min(W_ * .26, H_ * .40)); pcx, pcy = X0 + pr_ + 4, Y0 + H_ // 2 - 2
    Cf, kind = k.mat()
    if k.e >= 7: Cf = ramp(mix(STEEL[1], k.P["acc"], .55), 14) if k.e == 7 else ramp(mix(k.fd[2], k.P["acc2"], .35), 14)
    build = k.get("build", "pot") if k.e >= 7 else "pot"
    if k.e >= 7: Cf = ramp(LIVERY.get(k.get("frame"), (80, 110, 140)), 12)
    Cp = COPPER if k.e in (2, 3, 4, 5, 6) else (STEEL if k.e == 7 else (ramp((200, 220, 230), 12) if k.e == 8 else CLAY))
    if k.style in ("eastasia", "southasia", "seasia", "africa") and k.e <= 6: Cp = CLAY if k.w < 3 else ramp((130, 100, 60), 18)
    if k.e <= 1 and k.rich: Cp = COPPER
    d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=mix(mix(k.P["stone"], k.P["acc2"], .4), (90, 80, 70), .2) if k.e < 7 else mix(Cf[2], (90, 80, 70), .3), outline=OUT)   # the floor it stands on
    if k.e >= 7 and k.w <= 1: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=(150, 146, 140), outline=OUT)             # a bare concrete floor
    if k.e >= 7 and k.w >= 4:                                                                                            # a tiled still-room floor
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=(226, 222, 214) if k.e == 7 else (70, 74, 86), outline=OUT)
        for gx in range(X0 + 8, X1 - 2, 8): d.line([gx, Y0 + 3, gx, Y1 - 3], fill=(170, 166, 160) if k.e == 7 else (40, 44, 52))
        for gy in range(Y0 + 8, Y1 - 2, 8): d.line([X0 + 3, gy, X1 - 3, gy], fill=(170, 166, 160) if k.e == 7 else (40, 44, 52))
    d.rectangle([X0 + 2, pcy - pr_ - 4, pcx + pr_ + 6, pcy + pr_ + 8], fill=Cf[2], outline=OUT)                             # the furnace
    if kind == "brick" and k.e < 7: bricks(tm, X0 + 3, pcy - pr_ - 3, pcx + pr_ + 5, pcy + pr_ + 7, Cf, 8, 4)
    d.pieslice([pcx - 7, pcy + pr_ + 1, pcx + 7, pcy + pr_ + 15], 180, 360, fill=SOOT[0], outline=OUT)                      # its fire door
    if k.lit: fire(tm, pcx, pcy + pr_ + 6, 5, 3, k, glow=90, cone=(math.pi / 2, 1.1))
    d.ellipse([pcx - pr_, pcy - pr_, pcx + pr_, pcy + pr_], fill=Cp[2], outline=OUT); d.arc([pcx - pr_ + 2, pcy - pr_ + 2, pcx + pr_ - 2, pcy + pr_ - 2], 160, 280, fill=Cp[4], width=2)
    hr = pr_ // 2; d.ellipse([pcx - hr, pcy - hr, pcx + hr, pcy + hr], fill=Cp[3] if not (k.style == "eastasia" and k.e <= 6) else k.wood[3], outline=OUT)   # the head
    tcx, tcy, tr = X1 - pr_ - 2, pcy - 2, int(pr_ * .85)                                                                 # the worm tub
    Ct = k.wood if k.e <= 6 else Cf
    d.line([pcx + hr, pcy - 2, tcx - tr // 2, tcy - 2], fill=Cp[1], width=4); d.line([pcx + hr, pcy - 3, tcx - tr // 2, tcy - 3], fill=Cp[4])   # the swan neck
    if k.e >= 7 and build in ("column", "reflux", "keg", "glass"):                                                 # a plate condenser on its stand, not a worm tub
        Cc = {"column": STEEL, "reflux": CHROME, "keg": ramp((60, 90, 70), 14), "glass": ramp((200, 226, 236), 8)}[build]
        d.rectangle([tcx - tr, Y0 + 3, tcx + tr, Y1 - 12], fill=Cc[2], outline=OUT)
        for gy in range(Y0 + 6, Y1 - 14, 4): d.line([tcx - tr + 2, gy, tcx + tr - 2, gy], fill=Cc[0])
        d.line([pcx + hr, pcy - 2, tcx - tr, pcy - 2], fill=Cp[1], width=4)
    else:
      d.ellipse([tcx - tr, tcy - tr, tcx + tr, tcy + tr], fill=Ct[2], outline=OUT)
      for a in np.linspace(0, 2 * math.pi, 10, endpoint=False): d.line([tcx + math.cos(a) * (tr - 3), tcy + math.sin(a) * (tr - 3), tcx + math.cos(a) * tr, tcy + math.sin(a) * tr], fill=Ct[0])   # staves
      d.ellipse([tcx - tr + 4, tcy - tr + 4, tcx + tr - 4, tcy + tr - 4], fill=WATER[1])
      for q in range(4, tr - 5, 4): d.arc([tcx - q, tcy - q, tcx + q, tcy + q], 0, 300, fill=Cp[3])                             # the coil under the water
    if k.e >= 7 and build == "copper": d.ellipse([pcx - pr_, pcy - pr_, pcx + pr_, pcy + pr_], fill=COPPER[2], outline=OUT); d.ellipse([pcx - hr, pcy - hr, pcx + hr, pcy + hr], fill=COPPER[4], outline=OUT)
    if k.e >= 7 and build == "alembic":                                                                                # a copper alembic with its onion head
        d.ellipse([pcx - pr_, pcy - pr_, pcx + pr_, pcy + pr_], fill=COPPER[3], outline=OUT); d.ellipse([pcx - hr - 3, pcy - hr - 3, pcx + hr + 3, pcy + hr + 3], fill=COPPER[1], outline=OUT); d.ellipse([pcx - 3, pcy - 3, pcx + 3, pcy + 3], fill=COPPER[4])
    if k.e >= 7 and build == "glass":                                                                                  # a glass boiling flask on a hot plate
        Gl = ramp((190, 220, 230), 10); d.ellipse([pcx - pr_, pcy - pr_, pcx + pr_, pcy + pr_], fill=Gl[3], outline=OUT); d.ellipse([pcx - pr_ + 4, pcy - pr_ + 4, pcx + pr_ - 4, pcy + pr_ - 4], fill=(200, 180, 120)); d.ellipse([pcx - 4, pcy - 4, pcx + 4, pcy + 4], fill=Gl[4], outline=Gl[1])
    if k.e >= 7 and build == "keg":
        for q in (pr_ - 3, pr_ - 7): d.ellipse([pcx - q, pcy - q, pcx + q, pcy + q], outline=STEEL[0])
    if k.e >= 7 and build in ("column", "reflux"):                                                                     # the column (two for a reflux still)
        for j in range(1 + (build == "reflux")):
            qx = pcx + 2 + j * 16; d.ellipse([qx - 7, pcy - pr_ - 4, qx + 7, pcy - pr_ + 10], fill=(STEEL if k.e == 7 else CHROME)[4], outline=OUT); d.ellipse([qx - 3, pcy - pr_, qx + 3, pcy - pr_ + 6], fill=STEEL[1])
    jx, jy = tcx, Y1 - 6                                                                                                 # the spout and the jug
    d.line([tcx, tcy + tr, jx, jy - 6], fill=Cp[2], width=2)
    Cj = {0: CLAY, 1: CLAY}.get(k.w, ramp((90, 130, 90), 16) if k.e >= 3 else CLAY)
    d.ellipse([jx - 6, jy - 6, jx + 6, jy + 4], fill=Cj[2], outline=OUT); d.ellipse([jx - 2, jy - 3, jx + 2, jy + 1], fill=(220, 210, 160) if k.lit else SOOT[1])
    if k.w >= 3: pattern(tm, X0 + 3, pcy + pr_ + 9, pcx - 9, Y1 - 3, k, step=6)
    if k.lit: warm(tm, pcx, pcy + pr_ + 8, pr_, .4)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, Cf)


reg("still", still, axes={"build": ["pot", "column", "copper", "reflux", "keg", "glass", "alembic"], "frame": ["grey", "black", "red", "green", "white"]}, global_from=1990, nvar=16, states=("lit", "out"), clear=2, light={"dim": 2, "bright": .5, "color": "#ff9040", "kind": "fire"},
    tags=("laboratory", "cellar", "barn", "workshop"), ref="pot stills with their worm tubs 3 to 4 1/2 ft long (Brunschwig, Liber de arte distillandi, 1500; farm stills)")


# ---------------------------------------------------------------- the brew furnace
def brewfurnace(tm, x, y, w, h, st, v):
    """A brewer's furnace: a block of brick, stone or clay against the wall with the great copper set in its top and
    its fire mouth to the room (south). Dark Ages: a clay-walled hearth under an iron cauldron; Renaissance to
    Victorian: a brick-set copper with a wooden cover; Great War and Mid-Century: a steam-jacketed copper with
    gauges; Modern: a steel kettle; Future Darkness: a sealed vessel. Lit: the fire under it; out: cold."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    Cb, kind = k.mat()
    if k.e >= 7: Cb = ramp(mix((200, 200, 196), k.P["acc"], .45), 12) if k.e == 7 else k.fd
    block(tm, X0, Y0, X1, Y1 - 4, Cb)
    if k.e >= 7: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y0 + 9, k, C1=ramp(Cb[4], 8), step=6)
    if kind == "brick" and k.e < 7: bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 5, Cb, 12, 6)
    r = int(min(W_, H_) * .36); cy = Y0 + H_ // 2 - 6
    Cc = COPPER if k.e <= 6 else (STEEL if k.e == 7 else k.fd)
    if k.e <= 1 and not k.rich: Cc = IRON
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Cc[1], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 160, 290, fill=Cc[4], width=3)
    wort = k.get("contents", "wort")
    if wort == "cover": d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=OAK[3], outline=OUT); d.line([cx - r + 8, cy, cx + r - 8, cy], fill=OAK[1], width=3)
    else:
        d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=(150, 96, 40) if wort == "wort" else (210, 190, 120)); d.arc([cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7], 190, 260, fill=(220, 180, 110))
        if k.lit:
            for i in range(3): d.arc([cx - 6 + i * 4, cy - 6 - i * 2, cx + i * 4, cy - i * 2], 200, 340, fill=(236, 236, 230))
    if k.e in (5, 6):
        for gx in (X0 + 10, X1 - 10): d.ellipse([gx - 5, Y0 + 5, gx + 5, Y0 + 15], fill=WHITE[4], outline=OUT); d.line([gx, Y0 + 10, gx + 3, Y0 + 7], fill=OUT)   # gauges
    if k.w >= 3: pattern(tm, X0 + 3, Y1 - 14, X1 - 3, Y1 - 7, k, step=6)
    my = Y1 - 6
    d.pieslice([cx - 12, my - 12, cx + 12, my + 12], 180, 360, fill=SOOT[0], outline=OUT)
    if k.e <= 6: fire(tm, cx, my - 4, 9, 4, k, glow=150, cone=(math.pi / 2, 1.1))
    elif k.lit: d.rectangle([cx - 8, my - 6, cx + 8, my - 2], fill=(k.fdglow if k.e == 8 else (110, 160, 255))); glow_for_map(tm, cx, my, 60)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 6, Cb, soot=True)


reg("brewfurnace", brewfurnace, axes={"contents": ["wort", "cover", "water"]}, states=("lit", "out"), native="s", front=True, clear=2.5, mount="wall",
    light={"dim": 5, "bright": 1.5, "color": "#ff9a40", "kind": "fire"}, ref="a brick-set copper of the brewhouse, 5 to 7 ft (surviving brewhouses, e.g. the Lacock Abbey brewhouse)")
