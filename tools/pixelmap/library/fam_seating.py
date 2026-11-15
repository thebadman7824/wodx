"""The seating family (B6346): stools, benches, settles, chairs, great chairs and thrones, armchairs and sofas, day
beds, rocking and office chairs, bar stools, pews and choir stalls, floor cushions and divans, hammocks, deck chairs,
box pews and stone benches, each drawn from straight above in every era it spans.

A seat seen from above is its seat, its back along the north edge and its arms down the sides, with the leg ends
showing at the corners. What names it is that back, and what changes from one to the next is what a household
would see: the wood and how it was worked in that age, the dye of the cloth on it, the pattern of the region, how
rich it is (rough and patched, plain and sound, or carved, inlaid and gilded) and how it has been kept (worn shows
faded paint, scuffs and a patch; broken a split board, a missing leg or a torn cushion).

The shared drawing machinery for the seating and tables families lives here too (Look, the style table, the
pattern painter and the wear marks); fam_tables imports it. Light from the north-west; a tight shadow south-east;
nothing drawn past the footprint but the shadow."""
import math
import zlib

import numpy as np
from PIL import Image, ImageDraw

from px import OUT
from library.core import define, YEAR_END
from library.census import CENSUS, ERAS
from library.art import (ramp, tone, mix, shadow, slab, knob, cloth, box_px, IRON, BRASS, STEEL, WHITE, LINEN,
                         PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE)

EI = {k: i for i, (k, _, _, _) in enumerate(ERAS)}
DA, LN, RE, AR, VI, GW, MC, MO, FD = range(9)                 # era indices: dark-ages .. future-darkness
AGE2ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century",
           "modern": "modern", "Future Darkness": "future-darkness"}
_ROW = {r.id: r for r in CENSUS}
GOLD = ramp((206, 162, 56), 22)
SILVER = ramp((190, 194, 202), 16, (0, 0, 2))
CHROME = ramp((180, 188, 198), 24)
BONE = ramp((222, 212, 184), 10)
STONE = ramp((152, 148, 140), 16, (0, 0, 4))

# ---------------------------------------------------------------- the regional styles
# wood: the common wood; wood2: the fine wood of later rich houses; paint: the painted finish, if the style paints;
# dyes: its own shade of each dye; undyed: its plain cloth; motif: its pattern; metal: its fittings; glow: its
# far-future light; plastic: the colour its machine-age goods come in.
STY = {
    "central": dict(wood=(156, 112, 68), wood2=(112, 64, 40), paint=(60, 96, 64), undyed=(176, 164, 136), motif="flowers", metal="iron",
                    dyes=dict(red=(156, 44, 40), blue=(50, 74, 136), green=(64, 108, 62), gold=(196, 150, 54)), glow=(90, 200, 220), plastic=(86, 116, 89)),
    "atlantic": dict(wood=(138, 98, 60), wood2=(118, 50, 34), paint=(40, 50, 86), undyed=(190, 180, 150), motif="chintz", metal="brass",
                     dyes=dict(red=(140, 30, 44), blue=(36, 50, 100), green=(48, 88, 56), gold=(184, 144, 70)), glow=(120, 180, 240), plastic=(69, 77, 108)),
    "northern": dict(wood=(204, 178, 126), wood2=(170, 120, 70), paint=(70, 104, 160), undyed=(198, 192, 172), motif="rosemaling", metal="iron",
                     dyes=dict(red=(176, 52, 44), blue=(56, 90, 150), green=(70, 120, 90), gold=(214, 170, 70)), glow=(150, 220, 240), plastic=(94, 123, 171)),
    "mediterranean": dict(wood=(112, 74, 48), wood2=(88, 52, 36), paint=(226, 222, 206), undyed=(214, 200, 166), motif="tile", metal="iron",
                          dyes=dict(red=(186, 84, 50), blue=(40, 80, 160), green=(96, 120, 60), gold=(222, 170, 60)), glow=(240, 190, 110), plastic=(227, 223, 210)),
    "islamic": dict(wood=(150, 98, 62), wood2=(98, 58, 40), paint=(40, 150, 170), undyed=(204, 186, 150), motif="star", metal="brass",
                    dyes=dict(red=(150, 26, 40), blue=(34, 58, 140), green=(30, 112, 84), gold=(212, 168, 60)), glow=(80, 230, 200), plastic=(69, 162, 179)),
    "steppe": dict(wood=(170, 118, 72), wood2=(150, 90, 50), paint=(210, 104, 36), undyed=(212, 202, 176), motif="horn", metal="silver",
                   dyes=dict(red=(186, 40, 36), blue=(40, 80, 170), green=(60, 130, 80), gold=(230, 160, 40)), glow=(250, 150, 70), plastic=(213, 123, 65)),
    "southasia": dict(wood=(154, 106, 54), wood2=(84, 44, 34), paint=(190, 60, 110), undyed=(220, 206, 172), motif="paisley", metal="brass",
                      dyes=dict(red=(178, 36, 52), blue=(36, 52, 120), green=(52, 120, 66), gold=(222, 166, 36)), glow=(250, 120, 170), plastic=(196, 86, 128)),
    "eastasia": dict(wood=(148, 116, 76), wood2=(70, 30, 26), paint=(170, 36, 30), undyed=(206, 198, 176), motif="fret", metal="brass",
                     dyes=dict(red=(170, 34, 30), blue=(36, 56, 130), green=(70, 130, 100), gold=(218, 178, 50)), glow=(240, 90, 80), plastic=(179, 65, 60)),
    "seasia": dict(wood=(202, 168, 98), wood2=(120, 76, 40), paint=(130, 170, 80), undyed=(214, 198, 150), motif="weave", metal="brass",
                   dyes=dict(red=(150, 44, 34), blue=(48, 60, 110), green=(80, 120, 50), gold=(200, 150, 60)), glow=(140, 240, 120), plastic=(145, 179, 103)),
    "africa": dict(wood=(92, 58, 40), wood2=(60, 36, 28), paint=(210, 160, 50), undyed=(200, 176, 130), motif="kente", metal="brass",
                   dyes=dict(red=(170, 50, 30), blue=(40, 60, 120), green=(40, 110, 50), gold=(222, 170, 40)), glow=(250, 200, 60), plastic=(213, 171, 77)),
    "americas": dict(wood=(176, 150, 96), wood2=(132, 84, 50), paint=(110, 60, 120), undyed=(214, 196, 156), motif="step", metal="silver",
                     dyes=dict(red=(176, 40, 40), blue=(50, 150, 160), green=(60, 110, 70), gold=(214, 160, 50)), glow=(90, 240, 220), plastic=(128, 86, 137)),
    "oceania": dict(wood=(124, 78, 48), wood2=(96, 52, 34), paint=(44, 40, 40), undyed=(206, 186, 140), motif="tapa", metal="iron",
                    dyes=dict(red=(150, 70, 40), blue=(40, 100, 140), green=(70, 120, 70), gold=(200, 150, 70)), glow=(80, 200, 250), plastic=(72, 69, 69)),
    "polar": dict(wood=(150, 146, 136), wood2=(120, 112, 100), paint=(150, 150, 150), undyed=(170, 130, 90), motif="dots", metal="iron",
                  dyes=dict(red=(150, 56, 40), blue=(60, 80, 110), green=(80, 100, 80), gold=(200, 170, 110)), glow=(200, 240, 255), plastic=(162, 162, 162)),
}
COLOURS = ["red", "blue", "green"]
MATERIALS = ["local", "dark", "pale"]


def tags_of(oid):
    row = _ROW[oid]
    return tuple(p.strip().rsplit(" ", 1)[0] for p in row.where.split(",") if p.strip())


def era_looks(oid, y0=None, y1=None):
    """Looks for each census era the object spans, so a map's year picks the era's drawing."""
    row = _ROW.get(oid); a, b = 1197, YEAR_END
    if row:
        ya, _, yb = row.years.partition("-"); a, b = int(ya) if ya else a, int(yb) if yb else b
    a, b = y0 or a, y1 or b
    out = []
    for k, ea, eb, lab in ERAS:
        if ea <= b and eb >= a: out.append((max(ea, a), min(eb, b), lab, {"era": k}))
    return tuple(out)


# The liveries of mass-made things (office chairs, garden chairs, steel desks of recent decades), which look the same the
# world over: their variations come from the make's colour, not from a region.
MAKES = {"grey": (128, 130, 134), "black": (44, 44, 48), "beige": (196, 186, 160), "blue": (50, 80, 140), "red": (160, 40, 36)}
MAKE_LIST = ["grey", "black", "beige", "blue", "red"]


# How each era finished wood and coloured things, laid over the region's own colours: raw adzed wood in the Dark
# Ages; smoke, age and the plague years greying everything in the Long Night; oiled wood in the Renaissance; waxed
# and darker in the Age of Reason; shellac and graining, and the bright new aniline dyes, in the Victorian age; dark
# stain and drab cloth in the Great War; blond teak and bright plastics at mid-century; pale beech and laminate in
# the Modern age; grime and dark sealant in the Future Darkness. (target wood colour, amount; dye target, amount)
ERA_FINISH = {0: (None, 0, None, 0), 1: ((92, 82, 72), .34, (110, 100, 90), .18), 2: ((156, 98, 54), .3, (176, 34, 52), .16),
              3: ((100, 52, 36), .32, (44, 66, 130), .16), 4: ((186, 112, 44), .36, (255, 40, 120), .18),
              5: ((70, 54, 40), .38, (120, 110, 80), .1), 6: ((206, 160, 104), .34, (255, 255, 255), .1),
              7: ((222, 200, 160), .38, (150, 150, 156), .12), 8: ((52, 54, 62), .38, (40, 44, 56), .2)}


def era_finish(S, e):
    """The region's colours as its era finished them (see ERA_FINISH)."""
    wt, wa, dt, da = ERA_FINISH[e]
    if not wt: return S
    S = dict(S); S["wood"] = mix(S["wood"], wt, wa); S["wood2"] = mix(S["wood2"], wt, wa * .8)
    if dt:
        S["dyes"] = {k: mix(c, dt, da) for k, c in S["dyes"].items()}; S["paint"] = mix(S["paint"], dt, da)
        if e >= 6: S["plastic"] = mix(S["plastic"], dt, da)
    return S


class Look:
    """What a variation means for the drawing: the era, the household's means, the region and the upkeep, turned into
    ramps of colour and a few yes-or-no choices."""

    def __init__(s, v):
        s.v = v; s.era = v.get("era") or AGE2ERA.get(v.get("age"), "dark-ages"); s.e = EI[s.era]
        s.w = int(v.get("wealth", 2)); s.st = v.get("style") or "central"; s.S = STY.get(s.st, STY["central"])
        s.cond = v.get("condition", "new"); s.worn = s.cond != "new"; s.broken = s.cond == "broken"
        s.mat = v.get("material", "local"); s.col = v.get("colour", "red")
        s.glob = not v.get("style") and (s.e >= MO or v.get("_glob"))                              # mass-made (global_from): one look worldwide, its maker's livery
        if s.glob:
            m = MAKES[v.get("make") or s.pick(MAKE_LIST, "make")]
            s.S = dict(STY["central"], paint=m, plastic=mix(m, (255, 255, 255), .15), wood=(150, 112, 70), wood2=(176, 140, 96), metal="iron")
        else: s.S = era_finish(s.S, s.e)
        s.poor, s.rich, s.prince = s.w <= 1, s.w >= 4, s.w >= 5

    def pick(s, options, salt=""):
        """One of several makes or models, chosen steadily from the variation's own values (the same variation always
        gets the same one), or as the variation names it."""
        if s.v.get(salt) in options: return s.v[salt]
        key = "|".join(f"{k}={s.v[k]}" for k in sorted(s.v) if k not in ("era", "age", "vid", "style")) + salt
        return options[zlib.crc32(key.encode()) % len(options)]

    def f(s, c):
        """A colour as the object's upkeep leaves it: worn and broken things faded toward grey-brown."""
        if not s.worn: return c
        return mix(c, (136, 126, 112), .26 if s.broken else .2)

    def R(s, c, step=18, hue=(6, 2, -6)): return ramp(s.f(c), step, hue)

    def fade(s, C): return [s.f(c) for c in C] if s.worn else C

    @property
    def wood(s):
        base = s.S["wood2"] if (s.w >= 3 and s.e >= AR) else s.S["wood"]
        if s.mat == "dark": base = tone(base, -34)
        elif s.mat == "pale": base = mix(base, (226, 206, 160), .4)
        if s.poor and s.e <= AR: base = mix(base, (120, 104, 84), .12)
        return s.R(base, 18)

    def mt(s, c):
        """A finish made darker or paler by the variation's material."""
        if s.mat == "dark": return tone(c, -38)
        if s.mat == "pale": return mix(c, (232, 226, 210), .38)
        return c

    @property
    def paint(s): return s.R(s.mt(s.S["paint"]), 18)

    @property
    def tw(s):
        """The wood stained or painted in the region's way: what later factory pieces are finished in."""
        return s.R(mix(s.wood[2], s.S["paint"], .55), 18)

    def cover(s, K=None, t=.22):
        """Upholstery: the dye, toned toward the region's own colour."""
        return ramp(mix(s.dye()[2], (K or s.paint)[2], t), 18)

    def dye(s, k=None):
        if s.poor:                                                          # no dye: the plain wool or linen, brown or grey
            u = s.S["undyed"]; c = {"red": mix(u, (92, 62, 42), .7), "blue": mix(u, (140, 140, 146), .7)}.get(k or s.col, u)
            return s.R(c, 14)
        return s.R(mix(s.S["dyes"][k or s.col], s.S["paint"], .3), 20)

    def dye2(s):
        """A second dye that goes with the first."""
        i = COLOURS.index(s.col) if s.col in COLOURS else 0
        return s.R(s.S["dyes"][COLOURS[(i + 1) % 3]], 20) if not s.poor else s.R(tone(s.S["undyed"], -30), 14)

    @property
    def metal(s):
        if s.e >= MC: return s.fade(CHROME)
        if s.poor or s.w == 2: return s.fade(IRON)
        if s.prince: return s.fade(GOLD)
        return s.fade({"brass": BRASS, "silver": SILVER, "iron": IRON}[s.S["metal"]] if s.w == 3 else BRASS)

    @property
    def glow(s):
        g = s.S["glow"]; return [tone(g, -70), tone(g, -30), g]

    @property
    def comp(s):
        return s.R(s.mt(mix(mix((58, 64, 74), s.S["paint"], .75 if s.glob else .45), s.S["dyes"][s.col], .15)), 14)

    @property
    def plastic(s): return s.R(s.mt(s.S["plastic"]), 14)


def LK(v): return Look(v)


# ---------------------------------------------------------------- patterns of the regions
def motif(tm, box, L, C=None, A=None, dense=1):
    """The region's own pattern painted, woven or inlaid over a rectangle: tulips on Central pine, chintz roses,
    rosemaling scrolls, blue tiles, the eight-pointed star, ram's horns, paisley, the key fret, basket weave, kente
    stripes, stepped frets, tapa triangles, or rows of dots."""
    if L.glob: return                                                             # no people's ornament on mass-made things
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    if x1 - x0 < 6 or y1 - y0 < 4: return
    C = C or L.dye(); A = A or L.dye2(); kind = L.S["motif"]; W, H = x1 - x0, y1 - y0
    sp = max(7, int(12 / dense))
    if kind == "flowers":
        for cx in range(x0 + 5, x1 - 3, sp + 2):
            cy = (y0 + y1) // 2 + (2 if (cx // sp) % 2 else -2)
            d.line([cx, cy, cx - 2, min(y1 - 1, cy + 4)], fill=A[1]); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=C[3]); d.point((cx, cy), fill=GOLD[4])
    elif kind == "chintz":
        for j, cy in enumerate(range(y0 + 3, y1 - 1, 7)):
            for cx in range(x0 + 3 + (j % 2) * 4, x1 - 2, 9):
                d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=C[3]); d.point((cx + 2, cy + 1), fill=A[2])
    elif kind == "rosemaling":
        for cx in range(x0 + 6, x1 - 5, sp + 4):
            cy = (y0 + y1) // 2
            d.arc([cx - 5, cy - 4, cx + 5, cy + 4], 180, 360, fill=C[3], width=2); d.arc([cx - 3, cy - 1, cx + 7, cy + 5], 0, 180, fill=A[3], width=1)
            d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=WHITE[3])
    elif kind == "tile":
        s_ = 6
        for j, gy in enumerate(range(y0 + 1, y1 - 1, s_)):
            for i, gx in enumerate(range(x0 + 1, x1 - 1, s_)):
                d.rectangle([gx, gy, min(x1 - 1, gx + s_ - 2), min(y1 - 1, gy + s_ - 2)], fill=(C[2] if (i + j) % 2 else WHITE[3]))
    elif kind == "star":
        for j, cy in enumerate(range(y0 + 5, y1 - 2, 10)):
            for cx in range(x0 + 5 + (j % 2) * 5, x1 - 3, 10):
                d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=A[3]); d.polygon([(cx, cy - 4), (cx + 4, cy), (cx, cy + 4), (cx - 4, cy)], outline=GOLD[3])
                d.point((cx, cy), fill=WHITE[4])
    elif kind == "horn":
        for cx in range(x0 + 6, x1 - 5, sp + 3):
            cy = (y0 + y1) // 2
            d.arc([cx - 5, cy - 4, cx, cy + 3], 90, 360, fill=C[3], width=2); d.arc([cx, cy - 4, cx + 5, cy + 3], 180, 450, fill=C[3], width=2)
    elif kind == "paisley":
        for j, cy in enumerate(range(y0 + 3, y1 - 2, 8)):
            for cx in range(x0 + 4 + (j % 2) * 5, x1 - 3, 10):
                d.ellipse([cx - 3, cy - 2, cx + 2, cy + 3], fill=C[3]); d.point((cx + 2, cy - 2), fill=C[3]); d.point((cx, cy), fill=A[4])
    elif kind == "fret":
        d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=GOLD[2] if L.rich else C[3])
        for cx in range(x0 + 4, x1 - 6, 8):
            cy = y0 + 3
            d.line([cx, cy, cx + 4, cy, cx + 4, cy + 3, cx + 2, cy + 3], fill=GOLD[3] if L.rich else C[3])
        if H > 12: d.ellipse([(x0 + x1) // 2 - 4, (y0 + y1) // 2 - 3, (x0 + x1) // 2 + 4, (y0 + y1) // 2 + 4], outline=GOLD[3] if L.rich else C[4])
    elif kind == "weave":
        for j, gy in enumerate(range(y0 + 1, y1 - 1, 4)):
            for i, gx in enumerate(range(x0 + 1, x1 - 1, 4)):
                if (i + j) % 2: d.line([gx, gy + 1, min(x1 - 1, gx + 3), gy + 1], fill=C[1])
                else: d.line([gx + 1, gy, gx + 1, min(y1 - 1, gy + 3)], fill=C[3])
    elif kind == "kente":
        bw = max(6, W // 6); cols = [C, A, L.R(L.S["dyes"]["gold"], 20)] if not L.poor else [C, L.R((60, 44, 34), 8), C]
        for i, gx in enumerate(range(x0 + 1, x1 - 1, bw)):
            c = cols[i % 3]
            if i % 2:
                for gy in range(y0 + 1, y1 - 1, 3): d.line([gx, gy, min(x1 - 1, gx + bw - 1), gy], fill=c[2])
            else:
                for gx2 in range(gx, min(x1 - 1, gx + bw), 3): d.line([gx2, y0 + 1, gx2, y1 - 1], fill=c[3])
    elif kind == "step":
        cy = (y0 + y1) // 2; pts = []
        for i, gx in enumerate(range(x0 + 2, x1 - 2, 4)): pts += [(gx, cy - 3 if (i // 2) % 2 else cy + 3), (gx + 4, cy - 3 if (i // 2) % 2 else cy + 3)]
        if len(pts) > 1: d.line(pts, fill=C[3], width=2)
        d.line([x0 + 2, y0 + 2, x1 - 2, y0 + 2], fill=A[3]); d.line([x0 + 2, y1 - 2, x1 - 2, y1 - 2], fill=A[3])
    elif kind == "tapa":
        for j, gy in enumerate(range(y0 + 2, y1 - 4, 7)):
            for gx in range(x0 + 2, x1 - 5, 7):
                d.polygon([(gx, gy + 5), (gx + 3, gy), (gx + 6, gy + 5)], fill=(C[1] if j % 2 else A[1]))
    else:                                                                       # dots and chevrons
        for j, gy in enumerate(range(y0 + 3, y1 - 2, 6)):
            for gx in range(x0 + 3 + (j % 2) * 3, x1 - 2, 6): d.rectangle([gx - 1, gy - 1, gx, gy], fill=C[1])


def border(tm, box, M, w=1):
    """A gilt, brass or inlaid line round a surface, the mark of a rich piece."""
    x0, y0, x1, y1 = (int(t) for t in box)
    tm.d.rectangle([x0, y0, x1, y1], outline=M[3], width=w); tm.d.line([x0 + 1, y0, x1 - 1, y0], fill=M[4])


def pad(tm, box, C, r=4, buttons=False, piping=None, dimple=True):
    """An upholstered cushion or pad: soft edge, a lit north-west, a dark south-east, a dimple, buttons if asked."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    if x1 - x0 < 3 or y1 - y0 < 3: return
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=C[2], outline=OUT if piping is None else piping)
    d.line([x0 + r, y0 + 1, x1 - r, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + r, x0 + 1, y1 - r], fill=C[3])
    d.line([x0 + r, y1 - 1, x1 - r, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + r, x1 - 1, y1 - r], fill=C[1])
    if buttons:
        for j, by in enumerate(range(y0 + 5, y1 - 3, 7)):
            for bx in range(x0 + 5 + (j % 2) * 4, x1 - 3, 8): d.rectangle([bx, by, bx + 1, by + 1], fill=C[0])
    elif dimple and x1 - x0 > 12 and y1 - y0 > 10:
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2; d.ellipse([mx - 4, my - 2, mx + 4, my + 2], fill=C[1])


def weave(tm, box, C, step=3):
    """Rush, cane, string or rattan: a criss-cross of strands in two tones."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    d.rectangle([x0, y0, x1, y1], fill=C[1], outline=OUT)
    for k in range(x0 - (y1 - y0), x1, step):
        d.line([max(x0 + 1, k), y0 + 1 + max(0, x0 + 1 - k), min(x1 - 1, k + (y1 - y0)), y0 + 1 + min(y1 - y0 - 2, x1 - 1 - k)], fill=C[3])
    for k in range(x0, x1 + (y1 - y0), step * 2):
        d.line([min(x1 - 1, k), y0 + 1 + max(0, k - x1 + 1), max(x0 + 1, k - (y1 - y0)), y0 + 1 + min(y1 - y0 - 2, k - x0 - 1)], fill=C[2])


def fringe(tm, x0, x1, y, C, dy=3):
    for fx in range(int(x0), int(x1), 2): tm.d.line([fx, y, fx, y + dy], fill=C[3] if fx % 4 else C[1])


def tassel(tm, x, y, C):
    tm.d.rectangle([x - 1, y - 1, x + 1, y + 2], fill=C[3], outline=OUT); tm.d.point((x, y - 1), fill=GOLD[4])


def leg(tm, x, y, C, r=2, round_=False):
    """A leg end showing past or under the seat."""
    if round_: tm.d.ellipse([x - r, y - r, x + r, y + r], fill=C[0], outline=OUT)
    else: tm.d.rectangle([x - r, y - r, x + r, y + r], fill=C[0], outline=OUT)
    tm.d.point((x - r + 1, y - r + 1), fill=C[3])


def wear(tm, box, L, cloth_=False, rng=None):
    """Scuffs, a stain and a patch on a worn thing; a split and splinters on a broken one."""
    if not L.worn: return
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box); W, H = x1 - x0, y1 - y0
    if W < 12 or H < 6: return
    rng = rng or np.random.default_rng(x0 * 7 + y0 * 13 + W)
    for _ in range(max(1, W * H // 700)):                                     # pale scuffs
        sx, sy = rng.uniform(x0 + 3, x1 - 8), rng.uniform(y0 + 2, y1 - 3); d.line([sx, sy, sx + rng.uniform(3, 7), sy + rng.uniform(-1, 1)], fill=(176, 164, 144))
    sx, sy = x0 + W * .62, y0 + H * .45                                         # a stain
    tm.shade((sx - 3, sy - 2, sx + 4, sy + 3), f=.78, kind="ellipse")
    if cloth_ and W > 14 and H > 10:                                           # a patch sewn on
        px_, py_ = x0 + W // 4, y0 + H // 3
        d.rectangle([px_, py_, px_ + 6, py_ + 5], fill=(150, 134, 104), outline=(80, 66, 54))
        d.point((px_ + 2, py_ + 1), fill=(220, 210, 190)); d.point((px_ + 5, py_ + 4), fill=(220, 210, 190))
    if L.broken:                                                               # the split, jagged
        pts = []; n = 6
        for i in range(n + 1):
            pts.append((x0 + W * (.2 + .6 * i / n), y0 + H * (.3 + .4 * i / n) + (2 if i % 2 else -1)))
        d.line(pts, fill=OUT, width=1); d.line([(p[0] + 1, p[1] + 1) for p in pts[1:4]], fill=(60, 46, 38))


def cut(tm, snap, poly):
    """Take a piece off what has been drawn (a broken corner or a missing leg): the floor shows through again."""
    m = Image.new("L", tm.img.size, 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    tm.img.paste(snap, (0, 0), m)


def chip(tm, snap, X0, Y0, X1, Y1, L, corner=1):
    """A broken corner: the piece cut away, splinters on the edge, the piece itself lying beside."""
    if not L.broken: return
    k = max(5, int(min(X1 - X0, Y1 - Y0) * .28))
    cx, cy = (X1, Y1) if corner == 1 else (X0, Y1)
    sg = -1 if corner == 1 else 1
    cut(tm, snap, [(cx, cy - k), (cx + sg * k, cy + 1), (cx - sg * 4, cy + 4), (cx - sg * 4, cy - k)])
    tm.d.line([cx, cy - k, cx + sg * k, cy], fill=OUT)
    tm.d.line([cx + sg * 2, cy - k + 2, cx + sg * (k - 2), cy - 1], fill=(200, 184, 150))


def tint(tm, box, c, a):
    """Lay a thin coat of one colour over everything inside a box (a laminate, a varnish)."""
    from px import Q
    x0, y0, x1, y1 = (max(0, int(t) // Q) for t in box); x1, y1 = min(tm.img.size[0], x1 + 1), min(tm.img.size[1], y1 + 1)
    if x1 <= x0 or y1 <= y0: return
    ar = np.array(tm.img.crop((x0, y0, x1, y1))).astype(np.float32); ar[..., :3] = ar[..., :3] * (1 - a) + np.array(c, np.float32) * a
    tm.img.paste(Image.fromarray(ar.clip(0, 255).astype(np.uint8)), (x0, y0))


def era_mark(tm, box, L, kind="wood"):
    """What each era did to a thing of wood, cloth or stone, drawn over its top so that a form that lasted for
    centuries still shows when it was made. Wood: Long Night heavy iron straps; Renaissance a carved band; Age of
    Reason brass mounts at the corners; Victorian a varnish gleam; Great War a dark stained, bevelled edge;
    Mid-Century a blond lipping with chrome caps; Modern a white edge band; Future Darkness grime. Cloth: darned
    patches; an embroidered band; a printed sprig; fringe and piping; a broad drab stripe; a bold diagonal print; a
    zipped seam; grime. Stone: moss and a crack; a moulded edge; fluted ends; cast-iron ends; a memorial plaque;
    concrete patching; a sprayed tag; grime."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box); e = L.e; W, H = x1 - x0, y1 - y0
    if W < 10 or H < 8 or e == DA: return
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    def grime():
        for k in range(3):
            gx = x0 + W * (.2 + .3 * k); tm.shade((gx - W * .08, y0 + H * .2, gx + W * .08, y1 - H * .2), f=.72, kind="ellipse")
    if kind == "wood":
        C = L.wood
        if e == LN:
            for sx in (x0 + W // 4, x1 - W // 4 - 3):
                d.rectangle([sx, y0, sx + 3, y1], fill=(L.paint if L.w >= 2 else L.fade(IRON))[1], outline=OUT)   # iron, or the first painted bands
                for ny in (y0 + 2, cy, y1 - 3): d.point((sx + 1, ny), fill=IRON[4])
        elif e == RE:                                                            # carved bands at both ends, a gilt bead in rich work
            for yb in (y0 + 1, y1 - 7):
                d.rectangle([x0 + 1, yb, x1 - 1, yb + 6], fill=C[1])
                for k in range(x0 + 3, x1 - 5, 6): d.arc([k, yb + 1, k + 6, yb + 6], 180, 360, fill=C[4]); d.point((k + 3, yb + 3), fill=GOLD[3] if L.rich else C[0])
        elif e == AR:
            M = L.metal; k = max(3, min(W, H) // 6)
            for (ax, ay, sx, sy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
                d.polygon([(ax, ay), (ax + sx * k, ay), (ax, ay + sy * k)], fill=M[3], outline=OUT)
            d.ellipse([cx - 2, y1 - 5, cx + 2, y1 - 1], fill=M[3], outline=OUT)
        elif e == VI:
            for k in (W // 4, W // 2 + W // 6):
                ex = max(x0 + 1, x0 + k - H // 2); ey = min(y1 - 1, y0 + 1 + 2 * (x0 + k - ex))
                d.line([x0 + k, y0 + 1, ex, ey], fill=mix(C[4], (255, 240, 210), .4), width=2)
        elif e == GW:
            d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=tone(C[0], -20), width=3); d.line([x0 + 4, y0 + 4, x1 - 4, y0 + 4], fill=C[3])
        elif e == MC:
            tint(tm, box, (214, 170, 110), .2)
            d.rectangle([x0, y0, x1, y1], outline=mix(C[4], (230, 190, 130), .4), width=2)
            for ax, ay in ((x0 + 1, y0 + 1), (x1 - 3, y0 + 1), (x0 + 1, y1 - 3), (x1 - 3, y1 - 3)): d.rectangle([ax, ay, ax + 2, ay + 2], fill=CHROME[4])
        elif e == MO:                                                            # laminate: a pale coat, a white edge band
            tint(tm, box, (234, 230, 222), .3); d.rectangle([x0, y0, x1, y1], outline=(236, 236, 230), width=2)
        else: grime()
    elif kind == "cloth":
        A = L.dye2()
        if e == LN:
            for px_, py_ in ((x0 + W // 8, y0 + H // 6), (x1 - W // 3, y1 - H // 2), (x0 + W // 2, y0 + 2)):
                pw, ph = max(6, W // 4), max(5, H // 3)
                d.rectangle([px_, py_, min(x1 - 1, px_ + pw), min(y1 - 1, py_ + ph)], fill=L.R((112, 98, 82), 10)[2], outline=(70, 60, 50))
                for k in range(px_ + 2, min(x1 - 2, px_ + pw - 1), 3): d.point((k, py_ + 1), fill=(200, 190, 170))
        elif e == RE:
            d.rectangle([x0 + 2, cy - 3, x1 - 2, cy + 3], fill=A[2])
            for k in range(x0 + 4, x1 - 3, 5): d.point((k, cy), fill=GOLD[4])
        elif e == AR:
            for j, yy in enumerate(range(y0 + 4, y1 - 2, 6)):
                for xx in range(x0 + 4 + (j % 2) * 3, x1 - 2, 7): d.rectangle([xx, yy, xx + 1, yy + 1], fill=A[3])
        elif e == VI:
            d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=A[1], width=2); fringe(tm, x0 + 2, x1 - 2, y1 - 2, A, 2)
            for tx in (x0 + 2, x1 - 2): tassel(tm, tx, y1 - 2, L.metal)
        elif e == GW:
            d.rectangle([x0 + W // 3, y0 + 1, x0 + W // 3 + max(4, W // 6), y1 - 1], fill=L.R((110, 100, 76), 10)[2])
        elif e == MC:
            for k in range(-H, W, 9):                                            # diagonal stripes, kept inside the cloth
                ax, bx = x0 + k, x0 + k + H; ay, by = y1 - 1, y0 + 1
                if ax < x0: ay -= (x0 - ax); ax = x0
                if bx > x1: by += (bx - x1); bx = x1
                if bx > ax: d.line([ax, ay, bx, by], fill=A[3], width=3)
            d.rectangle([x0, y0, x1, y1], outline=OUT)
        elif e == MO:
            d.line([x0 + 3, cy, x1 - 3, cy], fill=(40, 40, 44), width=2); d.rectangle([x1 - 8, cy - 2, x1 - 5, cy + 2], fill=CHROME[4])
        else: grime()
    else:
        S_ = STONE
        if e == LN:
            tm.shade((x0, (y0 + y1) // 2, x1 + 1, y1 + 1), f=.78)               # weathered dark along the wet side
            for mx, my in ((x0 + W // 6, y0 + 3), (x1 - W // 4, y1 - 6)): d.ellipse([mx, my, mx + max(6, W // 6), my + 5], fill=(70, 100, 54))
            d.line([cx - 6, y0 + 2, cx, cy, cx - 3, y1 - 2], fill=OUT)
        elif e == RE: d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], outline=S_[4]); d.rectangle([x0 + 5, y0 + 5, x1 - 5, y1 - 5], outline=S_[1])
        elif e == AR:
            for ex in (x0 + 2, x1 - 10):
                for k in range(0, 8, 3): d.line([ex + k, y0 + 2, ex + k, y1 - 2], fill=S_[1])
        elif e == VI:
            for ex in (x0, x1 - 6): d.rectangle([ex, y0 - 1, ex + 6, y1 + 1], fill=IRON[1], outline=OUT); d.arc([ex - 2, y0, ex + 8, y0 + 8], 180, 360, fill=IRON[3], width=2)
        elif e == GW: d.rectangle([cx - 8, cy - 3, cx + 8, cy + 3], fill=BRASS[2], outline=OUT); d.line([cx - 6, cy, cx + 6, cy], fill=BRASS[0])
        elif e == MC:                                                            # the council's wooden slats bolted on
            for k, yy in enumerate(range(y0 + 2, y1 - 3, 5)): d.rectangle([x0 + 3, yy, x1 - 3, yy + 3], fill=L.paint[2 + k % 2], outline=OUT)
        elif e == MO:
            pts = [(x0 + W * (.2 + .6 * k / 7), cy + (5 if k % 2 else -5)) for k in range(8)]; d.line(pts, fill=L.dye()[3], width=3)
        else: grime()


def finish(tm, snap, box, L, cloth_=False, corner=1):
    wear(tm, box, L, cloth_=cloth_)
    if L.broken and corner: chip(tm, snap, *box, L, corner=corner)


def body(fn):
    """Wrap a drawing: the Look, a snapshot of the floor for broken pieces, the footprint in pixels."""
    def draw(tm, x, y, w, h, st, v):
        L = Look(v); snap = tm.img.copy(); fn(tm, box_px(x, y, w, h, 2), st, L, snap)
    draw.__doc__ = fn.__doc__; draw.__name__ = fn.__name__
    return draw


def sdef(oid, fn, ref=None, ft=None, axes=None, looks=None, **kw):
    """Define one object of these families (new, or taken over from the catalogue)."""
    if ft is not None: kw["ft"] = ft
    if ref is not None: kw["ref"] = ref
    if oid in _ROW: kw.setdefault("tags", tags_of(oid))
    kw["looks"] = looks if looks is not None else era_looks(oid)
    ax = {"material": MATERIALS, "colour": COLOURS} if axes is None else axes
    return define(oid, draw=body(fn), axes=ax, **kw)


# ---------------------------------------------------------------- the parts of a seat
def back_rail(tm, X0, Y0, X1, bk, L, C, kind, M=None):
    """The chair's back along the north edge, seen from above: its top rail and what fills it."""
    d = tm.d; M = M or L.metal; cx = (X0 + X1) // 2
    if kind == "panel":                                                         # a joined back, its carved panel
        slab(tm, X0, Y0, X1, Y0 + bk, C, "x", rng=tm.rng)
        if L.rich: motif(tm, (X0 + 4, Y0 + 2, X1 - 4, Y0 + bk - 2), L, C=L.dye(), A=M, dense=1.4)
        for px_ in (X0 + 1, X1 - 4): d.rectangle([px_, Y0, px_ + 3, Y0 + bk], fill=C[3], outline=OUT)
        if L.rich:
            for px_ in (X0 + 2, X1 - 2): knob(tm, px_, Y0 + 1, M, 2)
    elif kind == "plank":                                                       # a sgabello's single carved plank, shaped at the top
        d.polygon([(cx - 8, Y0), (cx + 8, Y0), (cx + 6, Y0 + bk), (cx - 6, Y0 + bk)], fill=C[3], outline=OUT); d.line([cx - 6, Y0 + 1, cx + 6, Y0 + 1], fill=C[4])
        d.ellipse([cx - 2, Y0 + 2, cx + 2, Y0 + 5], fill=C[1])
    elif kind == "ladder":
        for k, yy in enumerate((Y0, Y0 + bk // 2)): d.rectangle([X0 + 1, yy, X1 - 1, yy + max(2, bk // 3)], fill=C[3 - k], outline=OUT)
        for px_ in (X0, X1 - 4): leg(tm, px_ + 2, Y0 + 2, C, 2, round_=True)
    elif kind == "spindle":
        d.arc([X0, Y0, X1, Y0 + 2 * bk + 6], 180, 360, fill=OUT, width=5); d.arc([X0, Y0, X1, Y0 + 2 * bk + 6], 182, 358, fill=C[3], width=3)
        for a in np.linspace(205, 335, 6):
            r_ = math.radians(a); d.line([cx + math.cos(r_) * (X1 - X0) / 2.1, Y0 + bk + 3 + math.sin(r_) * (bk + 2), cx + math.cos(r_) * (X1 - X0) / 3, Y0 + bk + 4], fill=C[1], width=2)
    elif kind == "splat":                                                       # a shaped top rail and a central vase splat
        d.rounded_rectangle([X0, Y0, X1, Y0 + max(4, bk // 2)], 3, fill=C[3], outline=OUT); d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=C[4])
        d.polygon([(cx - 4, Y0 + 3), (cx + 4, Y0 + 3), (cx + 2, Y0 + bk + 2), (cx - 2, Y0 + bk + 2)], fill=C[2], outline=OUT)
        if L.rich: d.line([X0 + 3, Y0 + 2, X1 - 3, Y0 + 2], fill=M[3])
    elif kind == "balloon":
        d.ellipse([X0 + 1, Y0 - 2, X1 - 1, Y0 + bk * 2], outline=OUT, width=4); d.arc([X0 + 2, Y0 - 1, X1 - 2, Y0 + bk * 2 - 1], 180, 360, fill=C[3], width=2)
        d.line([X0 + 4, Y0 + bk, X1 - 4, Y0 + bk], fill=C[2], width=3)
    elif kind == "hoop":
        d.arc([X0 + 1, Y0, X1 - 1, Y0 + bk * 2 + 4], 180, 360, fill=OUT, width=5); d.arc([X0 + 1, Y0, X1 - 1, Y0 + bk * 2 + 4], 182, 358, fill=C[3], width=3)
        d.arc([X0 + 6, Y0 + 4, X1 - 6, Y0 + bk * 2], 190, 350, fill=C[1], width=2)
    elif kind == "slat":
        d.rectangle([X0, Y0, X1, Y0 + 3], fill=C[3], outline=OUT)
        for gx in range(X0 + 3, X1 - 2, 5): d.rectangle([gx, Y0 + 3, gx + 2, Y0 + bk], fill=C[2], outline=OUT)
    elif kind == "pad":
        pad(tm, (X0, Y0, X1, Y0 + bk), L.dye(), r=4, buttons=L.rich, dimple=False)
    elif kind == "shell":
        d.rounded_rectangle([X0, Y0, X1, Y0 + bk + 4], 6, fill=C[3], outline=OUT); d.line([X0 + 5, Y0 + 2, X1 - 5, Y0 + 2], fill=C[4])
        d.line([X0 + 4, Y0 + bk + 2, X1 - 4, Y0 + bk + 2], fill=C[1])
    elif kind == "horseshoe":                                                   # the round back running on into the arms
        d.arc([X0, Y0, X1, Y0 + (X1 - X0)], 160, 380, fill=OUT, width=6); d.arc([X0, Y0, X1, Y0 + (X1 - X0)], 162, 378, fill=C[3], width=4)
        d.rectangle([cx - 3, Y0 + 3, cx + 3, Y0 + bk + 3], fill=C[2], outline=OUT)
        if L.rich: d.ellipse([cx - 2, Y0 + 4, cx + 2, Y0 + 8], fill=M[3])


def seat_top(tm, box, L, C, kind):
    """The seat itself: a board, rush or cane, string, a cushion, plastic, hide."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    if kind == "board":
        slab(tm, x0, y0, x1, y1, C, "x", rng=tm.rng); d.arc([x0 + 3, y0 + 2, x1 - 3, y1 - 2], 20, 160, fill=C[1])
    elif kind == "rush":
        weave(tm, box, L.R((186, 164, 96), 16), 3)
    elif kind == "cane":
        weave(tm, box, L.R((206, 180, 120), 14), 2)
    elif kind == "string":
        weave(tm, box, L.R(L.S["undyed"], 16) if L.poor else L.dye(), 3)
    elif kind == "pad":
        slab(tm, x0, y0, x1, y1, C, None); pad(tm, (x0 + 2, y0 + 2, x1 - 2, y1 - 2), L.dye(), r=4, buttons=L.prince)
    elif kind == "plastic":
        d.rounded_rectangle([x0, y0, x1, y1], 5, fill=C[2], outline=OUT); d.rounded_rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], 4, fill=C[1])
        d.line([x0 + 4, y0 + 1, x1 - 4, y0 + 1], fill=C[4])
    elif kind == "hide":
        hc = L.R((150, 110, 74), 16); d.rounded_rectangle([x0, y0, x1, y1], 4, fill=hc[2], outline=OUT)
        d.ellipse([x0 + (x1 - x0) // 3, y0 + 3, x0 + (x1 - x0) // 3 + 5, y0 + 7], fill=hc[0]); d.ellipse([x1 - 9, y1 - 8, x1 - 4, y1 - 4], fill=hc[4])
    elif kind == "leather":
        lc = L.R(L.mt(mix((120, 54, 36) if L.st not in ("eastasia", "islamic") else (60, 40, 30), L.S["dyes"][L.col], .3)), 16)
        d.rounded_rectangle([x0, y0, x1, y1], 3, fill=lc[2], outline=OUT); d.line([x0 + 3, y0 + 1, x1 - 3, y0 + 1], fill=lc[4])
        for sx in range(x0 + 2, x1 - 1, 4): d.point((sx, y1 - 1), fill=BRASS[4]); d.point((sx, y0 + 1), fill=BRASS[3])


# ---------------------------------------------------------------- stool
SHAPE = {"central": "round", "atlantic": "square", "northern": "log", "mediterranean": "square", "islamic": "oct", "steppe": "round",
         "southasia": "weave", "eastasia": "drum", "seasia": "weave", "africa": "carved", "americas": "reed", "oceania": "oval", "polar": "hide"}


def outline(d, shape, cx, cy, r, fill, out=OUT, width=1):
    """Fill a seat's outline: round, square, eight-sided, oval or an uneven hide."""
    if shape in ("square",): d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], 2, fill=fill, outline=out, width=width)
    elif shape == "oct":
        k = r * .41; d.polygon([(cx - k, cy - r), (cx + k, cy - r), (cx + r, cy - k), (cx + r, cy + k), (cx + k, cy + r), (cx - k, cy + r), (cx - r, cy + k), (cx - r, cy - k)], fill=fill, outline=out)
    elif shape == "oval": d.ellipse([cx - r, cy - r * .78, cx + r, cy + r * .78], fill=fill, outline=out, width=width)
    elif shape == "hide":
        pts = [(cx + math.cos(math.radians(a)) * r * (1 - .14 * ((a // 45) % 2)), cy + math.sin(math.radians(a)) * r * (1 - .14 * ((a // 45) % 2))) for a in range(0, 360, 30)]
        d.polygon(pts, fill=fill, outline=out)
    else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=out, width=width)


def _stool(tm, B, st, L, snap):
    """A stool from above: its seat and the leg ends splayed past it. Dark Ages to Victorian, each region its own:
    a round three-legged stool (Central Europe), a square plank stool on four legs (Atlantic), a log stool with its
    bark ring (Northern), a square rush-seated stool (Mediterranean), an eight-sided inlaid stool (Islamic world), a
    painted or felt-covered round (steppe), a cane moodha (South Asia), a lacquered drum stool with studs (East Asia),
    a rattan stool (Southeast Asia), a carved stool with a hollowed seat (Africa), a woven reed seat (the Americas),
    an oval carved seat with shell inlay (Oceania), a hide over a whalebone frame (the far north). Renaissance and Age
    of Reason Europe: the joint stool, square on turned legs. Great War and Mid-Century: an enamelled kitchen stool.
    Modern: steel legs and a vinyl seat. Future Darkness: a moulded pod with a lit rim. Broken: a leg gone and the
    stool tipped."""
    d = tm.d; X0, Y0, X1, Y1 = B; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 2; C = L.wood; e = L.e
    shape = SHAPE[L.st]
    shadow(tm, cx - r, cy - r, cx + r, cy + r, 4, kind="ellipse")
    if e == FD:
        sh = ("round", "oct", "square")[list(STY).index(L.st) % 3]; K = L.comp
        outline(d, sh, cx, cy, r, K[2]); outline(d, sh, cx, cy, r - 3, K[1], out=L.glow[2], width=2)
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=L.glow[1]); d.arc([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], 190, 250, fill=K[4])
    elif e == MO:
        K = L.plastic; sh = "square" if shape in ("square", "oct") else "round"
        if L.w <= 1:                                                               # a moulded plastic stool, the hand slot in its seat
            outline(d, sh, cx, cy, r, K[2]); outline(d, sh, cx, cy, r - 4, K[1], out=K[0])
            d.rounded_rectangle([cx - 6, cy - 2, cx + 6, cy + 2], 2, fill=K[0]); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 190, 250, fill=K[4])
        else:                                                                      # steel legs and a padded vinyl seat
            for a in (45, 135, 225, 315):
                ra = math.radians(a); leg(tm, cx + math.cos(ra) * r, cy + math.sin(ra) * r, CHROME, 2, round_=True)
            outline(d, sh, cx, cy, r - 1, CHROME[2]); pad(tm, (cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3), K, r=r - 5, piping=L.dye()[1])
            motif(tm, (cx - r + 6, cy - 4, cx + r - 6, cy + 4), L, dense=1.3)
    elif e in (GW, MC):
        K = (L.R(L.S["plastic"], 16) if L.w >= 2 else L.R(tone(L.S["paint"], -30), 16)) if e == MC else L.paint       # mid-century: vinyl and chrome, or a dark enamelled kitchen stool
        for lx, ly in ((cx - r, cy - r), (cx + r, cy - r), (cx - r, cy + r), (cx + r, cy + r)): leg(tm, lx, ly, K if e == GW else CHROME, 2)
        d.rounded_rectangle([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 5, fill=K[2], outline=OUT); d.line([cx - r + 5, cy - r + 2, cx + r - 5, cy - r + 2], fill=K[4])
        if L.w >= 2 and e == MC: pad(tm, (cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4), L.R(mix(L.dye()[2], K[2], .45), 18), r=4); motif(tm, (cx - r + 6, cy - 4, cx + r - 6, cy + 4), L, C=K, dense=1.3)
        else: d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=K[0])                       # the hand hole
    elif e in (RE, AR) and L.st in ("central", "atlantic", "northern", "mediterranean"):     # the joint stool
        for lx, ly in ((cx - r, cy - r), (cx + r, cy - r), (cx - r, cy + r), (cx + r, cy + r)): leg(tm, lx, ly, C, 3)
        slab(tm, cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, C, "x", rng=tm.rng)
        d.rectangle([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=C[1])
        if L.w >= 2: motif(tm, (cx - r + 5, cy - 4, cx + r - 5, cy + 4), L, dense=1.3)
    else:
        K = C
        if shape == "drum" and L.w >= 2: K = L.paint
        if shape == "round" and L.st == "steppe" and L.w >= 2: K = L.paint
        if shape == "log" and L.w >= 2: K = L.paint
        nl = {"round": 3, "square": 4, "oct": 4, "carved": 0, "drum": 0, "hide": 3, "oval": 4, "log": 0, "weave": 0, "reed": 4}[shape]
        for k in range(nl):
            ra = math.radians(90 + 360 * k / nl + (45 if nl == 4 else 0)); leg(tm, cx + math.cos(ra) * r, cy + math.sin(ra) * r, BONE if shape == "hide" else C, 3, round_=True)
        if shape in ("weave",):
            WV = L.R((206, 180, 120), 14) if L.st == "southasia" else L.R((188, 150, 84), 14)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WV[1], outline=OUT)
            for k in range(-r + 2, r - 1, 3):
                h_ = int(math.sqrt(max(0, r * r - k * k))) - 1
                d.line([cx + k, cy - h_, cx + k, cy + h_], fill=WV[3] if k % 2 else WV[2])
            d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=WV[0], width=2)
            if L.w >= 2: d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], outline=L.dye()[3], width=2)
        else:
            outline(d, "round" if shape in ("carved", "drum", "log", "reed") else shape, cx, cy, r, K[2])
            d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 190, 260, fill=K[4])
            if shape == "log":
                d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=L.R((90, 70, 54), 10)[1], width=3)
                for rr in (r - 6, r - 10): d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 200, 330, fill=K[1])
                if L.w >= 2: motif(tm, (cx - r + 5, cy - 4, cx + r - 5, cy + 4), L, dense=1.3)
            elif shape == "carved":
                for a in range(0, 360, 30):
                    ra = math.radians(a); d.line([cx + math.cos(ra) * (r - 1), cy + math.sin(ra) * (r - 1), cx + math.cos(ra) * (r - 4), cy + math.sin(ra) * (r - 4)], fill=K[0])
                d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=K[1]); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=L.metal[3] if L.w >= 2 else K[3])
            elif shape == "drum":
                for a in range(0, 360, 30):
                    ra = math.radians(a); d.rectangle([cx + math.cos(ra) * (r - 2) - 1, cy + math.sin(ra) * (r - 2) - 1, cx + math.cos(ra) * (r - 2), cy + math.sin(ra) * (r - 2)], fill=BRASS[4])
                d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], outline=K[0])
                if L.w >= 2: d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=GOLD[2] if L.w >= 3 else K[3])
            elif shape == "hide":
                hc = L.R((176, 140, 100), 14); outline(d, "hide", cx, cy, r - 3, hc[2], out=hc[0]); d.ellipse([cx - 3, cy - 5, cx + 3, cy], fill=hc[4])
                if L.w >= 2: d.line([cx - r + 5, cy + 3, cx + r - 5, cy + 3], fill=L.dye()[2], width=2)
            elif shape == "oct":
                d.polygon([(cx, cy - r + 3), (cx + r - 3, cy), (cx, cy + r - 3), (cx - r + 3, cy)], outline=L.metal[3] if L.w >= 2 else K[0])
                d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=L.dye()[3] if L.w >= 2 else K[4])
            elif shape == "oval":
                d.ellipse([cx - r + 4, cy - r * .78 + 3, cx + r - 4, cy + r * .78 - 3], outline=K[0])
                for a in (0, 90, 180, 270): ra = math.radians(a); d.rectangle([cx + math.cos(ra) * (r - 6) - 1, cy + math.sin(ra) * (r * .78 - 5) - 1, cx + math.cos(ra) * (r - 6) + 1, cy + math.sin(ra) * (r * .78 - 5) + 1], fill=BONE[3])
            elif shape == "reed":
                RC = L.R((172, 150, 92), 14)
                d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=RC[2])
                for k in range(-r + 4, r - 3, 2):
                    h_ = int(math.sqrt(max(0, (r - 3) ** 2 - k * k)))
                    d.line([cx + k, cy - h_, cx + k, cy + h_], fill=RC[1 + 2 * (k % 4 == 0)])
                if L.w >= 2: d.line([cx - r + 4, cy, cx + r - 4, cy], fill=L.dye()[3], width=3)
            elif shape == "square":
                if L.st == "mediterranean": weave(tm, (cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4), L.R((186, 164, 96), 16), 3)
                else:
                    d.line([cx - r + 2, cy - 1, cx + r - 2, cy - 1], fill=K[0])
                    for gx in (cx - r + 3, cx + r - 3):
                        for gy in (cy - r + 3, cy + r - 3): d.point((gx, gy), fill=IRON[3])
            else:
                if L.w >= 2: motif(tm, (cx - r + 5, cy - 4, cx + r - 5, cy + 4), L, dense=1.3)
                elif e <= LN:
                    for k in range(3):
                        ra = math.radians(90 + 120 * k); d.ellipse([cx + math.cos(ra) * r * .55 - 2, cy + math.sin(ra) * r * .55 - 2, cx + math.cos(ra) * r * .55 + 2, cy + math.sin(ra) * r * .55 + 2], fill=K[0])
    if e <= VI: era_mark(tm, (cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2), L, "wood")
    wear(tm, (cx - r, cy - r, cx + r, cy + r), L)
    if L.broken:                                                                   # a leg gone: a wedge out of the seat, the leg lying beside
        cut(tm, snap, [(cx + 2, cy + 2), (X1 + 4, cy + 4), (X1 + 4, Y1 + 4), (cx + 4, Y1 + 4)])
        d.line([cx + 2, cy + 2, X1 - 3, cy + 5], fill=OUT); d.line([cx + 2, cy + 2, cx + 5, Y1 - 3], fill=OUT)
        d.line([cx + 6, Y1 - 2, X1 - 2, cy + 8], fill=OUT, width=4); d.line([cx + 6, Y1 - 2, X1 - 2, cy + 8], fill=C[3], width=2)


sdef("stool", _stool, ref="three-legged stools and joint stools, a seat about 12 in across with the legs splayed past it; drum and moodha stools of Asia about the same",
     front=False)


# ---------------------------------------------------------------- chairs
def frame(L, fine=True):
    """The wood or stuff a chair's frame is made of in its era and region."""
    e = L.e
    if e == FD: return L.comp
    if e == MO: return L.plastic
    if e == MC: return L.tw if L.w >= 2 else CHROME
    if L.st in ("steppe", "northern", "eastasia", "americas") and L.w >= 3 and e <= VI: return L.paint
    if L.st == "seasia" and e <= GW: return L.R((196, 160, 92), 16)
    return L.wood


# Each era's chair at each means: (back, seat, legs). Poor, middling, rich.
CHAIR_FORM = {RE: (("plank", "board", "splay"), ("panel", "board", "turned"), ("panel", "leather", "x")),
              AR: (("ladder", "rush", "turned"), ("splat", "pad", "cabriole"), ("splat", "pad", "cabriole")),
              VI: (("spindle", "board", "splay"), ("balloon", "pad", "turned"), ("balloon", "pad", "turned")),
              GW: (("hoop", "cane", "round"), ("slat", "leather", "square"), ("slat", "leather", "square")),
              MC: (("shell", "plastic", "tube"), ("slat", "pad", "taper"), ("slat", "pad", "taper")),
              MO: (("shell", "plastic", "tube"), ("pad", "pad", "square"), ("pad", "pad", "square")),
              FD: (("shell", "plastic", "tube"), ("shell", "pad", "tube"), ("shell", "pad", "tube"))}
STYLE_BACK = {"eastasia": ("horseshoe", "board"), "seasia": ("hoop", "cane"), "southasia": ("panel", "string"), "africa": ("panel", "hide"),
              "polar": ("ladder", "hide"), "islamic": ("panel", "pad"), "oceania": ("slat", "rush")}


def chair_legs(tm, B, bk, L, C, kind):
    """The legs where they show past the seat, seen from above: square or turned ends at the corners, splayed stick
    legs, the curved knees of cabriole legs, the crossed staves of an X-frame, steel tube."""
    d = tm.d; X0, Y0, X1, Y1 = B
    if kind == "x":                                                             # the X-frame's curved staves along each side
        for sx, sg in ((X0, 1), (X1, -1)):
            d.arc([sx - 6 if sg > 0 else sx - 6, Y0 + bk - 4, sx + 6, Y1 + 2], 90 if sg < 0 else 270, 270 if sg < 0 else 90, fill=OUT, width=4)
            d.arc([sx - 6, Y0 + bk - 4, sx + 6, Y1 + 2], 90 if sg < 0 else 270, 270 if sg < 0 else 90, fill=C[3], width=2)
        for sx in (X0 + 1, X1 - 1):
            for sy in (Y0 + bk - 2, Y1 - 1): d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=L.metal[3], outline=OUT)
        return
    for k, (lx, ly) in enumerate(((X0 + 2, Y0 + bk), (X1 - 2, Y0 + bk), (X0 + 2, Y1 - 2), (X1 - 2, Y1 - 2))):
        sg = -1 if lx < (X0 + X1) // 2 else 1
        if kind == "splay": d.line([lx, ly, lx + sg * 3, ly + (3 if k >= 2 else -2)], fill=OUT, width=3); leg(tm, lx + sg * 3, ly + (3 if k >= 2 else -2), C, 1, round_=True)
        elif kind == "cabriole" and k >= 2:                                     # the front knees curving out
            d.arc([lx - 4, ly - 6, lx + 4, ly + 2], 0 if sg > 0 else 90, 120 if sg > 0 else 210, fill=OUT, width=4)
            d.arc([lx - 4, ly - 6, lx + 4, ly + 2], 0 if sg > 0 else 90, 120 if sg > 0 else 210, fill=C[3], width=2)
            if L.rich: d.point((lx + sg * 2, ly), fill=L.metal[4])
        elif kind in ("turned", "round", "taper"): leg(tm, lx, ly, C, 2 if kind != "taper" else 1, round_=True)
        elif kind == "tube": leg(tm, lx, ly, CHROME if L.e < FD else C, 1, round_=True)
        else: leg(tm, lx, ly, C, 2)
    if kind in ("turned", "square", "splay") and L.e <= GW:                     # the front stretcher between the legs
        d.line([X0 + 4, Y1 - 1, X1 - 4, Y1 - 1], fill=C[1])


def chair_parts(tm, B, L, back, seat, arms, C, bkf=.26, legs_=True, cushion=None, legs="square"):
    """Draw a chair in a box: the seat, the leg ends at the corners past it, the arms down the sides, and the back to
    the north standing proud, its shadow falling on the seat. Returns the seat box."""
    d = tm.d; X0, Y0, X1, Y1 = B; H = Y1 - Y0; bk = max(6, int(H * bkf))
    aw = 4 if arms else 0
    ins = 2 if arms else 3; sb = (X0 + ins + aw, Y0 + bk - 2, X1 - ins - aw, Y1 - ins)
    if seat == "plastic": seat_top(tm, sb, L, C, "plastic")
    elif seat == "pad": d.rounded_rectangle(list(sb), 3, fill=C[1], outline=OUT); pad(tm, (sb[0] + 3, sb[1] + 3, sb[2] - 3, sb[3] - 3), cushion or L.dye(), r=4, buttons=L.w >= 3 and L.e in (VI, GW) or L.prince)
    else: seat_top(tm, sb, L, C, seat)
    if cushion is not None and seat in ("board", "rush", "cane", "string", "hide", "leather"):
        iw = max(3, (sb[2] - sb[0]) // 5); pad(tm, (sb[0] + iw, sb[1] + 5, sb[2] - iw, sb[3] - 4), cushion, r=3)   # a loose squab, the seat showing round it
        if L.rich:
            for tx, ty in ((sb[0] + 3, sb[3] - 3), (sb[2] - 3, sb[3] - 3)): tassel(tm, tx, ty, L.metal)
    if legs_: chair_legs(tm, B, bk, L, C if not (L.e == MO or (L.e == MC and not L.rich)) else CHROME, legs)
    if arms:
        for ax in (X0 + 1, X1 - 1 - aw):
            d.rectangle([ax, Y0 + bk - 2, ax + aw, Y1 - 4], fill=C[3], outline=OUT); d.line([ax + 1, Y0 + bk, ax + 1, Y1 - 6], fill=C[4])
            if L.rich: d.rectangle([ax, Y1 - 7, ax + aw, Y1 - 4], fill=L.metal[3], outline=OUT)
    tm.shade((sb[0], Y0 + bk - 2, sb[2], Y0 + bk + 4), f=.55)                   # the back stands up: its shadow on the seat
    back_rail(tm, X0, Y0, X1, bk, L, C, back)
    return sb


def _chair(tm, B, st, L, snap):
    """A chair from above, its back to the north standing proud of the seat. Renaissance: a sgabello with a carved
    plank back on splayed legs for the poor, a joined box-seat chair with a panelled back on turned legs, or for the
    rich an X-framed chair with a leather seat and cushion; Age of Reason: a rush-seated ladder-back, or a shaped
    splat back on cabriole legs with a stuffed seat; Victorian: a Windsor with its spindle bow, or a balloon-back with
    a buttoned seat; Great War: a bentwood hoop on a cane seat, or a slatted chair on a studded leather seat;
    Mid-Century: a moulded shell on steel legs, or a teak slat-back with a loose cushion; Modern: a plastic stacking
    chair, or an upholstered dining chair; Future Darkness: a dark shell with a lit rim. East Asia: the horseshoe back;
    Southeast Asia: rattan and cane; South Asia: a string seat; Africa: a carved back and hide seat; the far north:
    hide on a ladder frame; the Islamic world and Oceania their own backs, until the Victorian trade brings the
    European forms. Broken: the back split and a leg gone."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; C = frame(L)
    shadow(tm, X0, Y0, X1, Y1, 4)
    back, seat, legs = CHAIR_FORM[e][0 if L.w <= 1 else (1 if L.w <= 3 else 2)]
    if L.st in STYLE_BACK and (e <= AR or (e <= GW and L.st in ("eastasia", "seasia"))):
        back, seat = STYLE_BACK[L.st]
        if e == AR: legs = "cabriole" if L.st in ("eastasia", "islamic") else "turned"
        if e == VI: seat = "pad"
    if seat == "plastic" and e < FD: C = L.plastic
    cush = L.dye() if (L.w >= 4 and seat in ("board", "rush", "hide", "string", "leather")) else None
    chair_parts(tm, B, L, back, seat, L.rich or back == "horseshoe" or legs == "x", C, cushion=cush, legs=legs)
    if e >= MC and L.w >= 3 and seat == "plastic": motif(tm, (X0 + 7, (Y0 + Y1) // 2, X1 - 7, Y1 - 6), L, dense=1.4)
    if e == FD: d.line([X0 + 4, Y1 - 2, X1 - 4, Y1 - 2], fill=L.glow[2]); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=L.glow[1])
    if L.prince: border(tm, (X0 + 1, Y0 + 1, X1 - 1, Y0 + 5), GOLD)
    finish(tm, snap, (X0, Y0, X1, Y1), L, cloth_=cush is not None)


sdef("chair", _chair, axes={"material": MATERIALS, "colour": COLOURS},
     ref="joined chairs from the 15th c., Windsor and bentwood chairs, a seat 16 to 20 in square, the back 18 to 24 in wide")


def takht(tm, cb, L):
    """A cushioned seat of state on a low inlaid platform: a back cushion and two bolsters, the region's cloth."""
    d = tm.d
    d.rectangle(list(cb), fill=L.wood[2], outline=OUT); border(tm, cb, L.metal)
    motif(tm, (cb[0] + 2, cb[1] + 2, cb[2] - 2, cb[3] - 2), L, C=L.dye2(), A=L.metal, dense=1.2)
    pad(tm, (cb[0] + 4, cb[1] + 10, cb[2] - 4, cb[3] - 4), L.dye(), r=4)
    pad(tm, (cb[0] + 3, cb[1] + 2, cb[2] - 3, cb[1] + 10), L.dye2(), r=4, dimple=False)
    for bx in (cb[0] + 3, cb[2] - 9): pad(tm, (bx, cb[1] + 10, bx + 6, cb[3] - 6), L.dye2(), r=3, dimple=False)
    for tx in (cb[0] + 6, cb[2] - 6): tassel(tm, tx, cb[3] - 2, L.metal)


def stoolthrone(tm, cb, L):
    """A chief's carved stool seat, round and studded, a skin laid over the front."""
    d = tm.d; cx, cy = (cb[0] + cb[2]) // 2, (cb[1] + cb[3]) // 2; r = min(cb[2] - cb[0], cb[3] - cb[1]) // 2 - 1; C = L.wood
    sk = L.R((210, 170, 90), 14); d.ellipse([cb[0], cy, cb[2], cb[3] + 2], fill=sk[2], outline=OUT)
    for k in range(cb[0] + 3, cb[2] - 3, 6): d.ellipse([k, cy + 6 + (k % 5), k + 3, cy + 9 + (k % 5)], fill=(50, 36, 30))
    d.ellipse([cx - r, cy - r, cx + r, cy + r - 4], fill=C[2], outline=OUT)
    for a in range(0, 360, 24):
        ra = math.radians(a); d.rectangle([cx + math.cos(ra) * (r - 2) - 1, cy - 2 + math.sin(ra) * (r - 3) - 1, cx + math.cos(ra) * (r - 2), cy - 2 + math.sin(ra) * (r - 3)], fill=L.metal[4])
    d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 9], fill=C[1]); motif(tm, (cx - r + 7, cy - 5, cx + r - 7, cy + 1), L, dense=1.4)


def _lordchair(tm, B, st, L, snap):
    """The lord's great chair from above, a footstool before it. Dark Ages and Long Night: a box chair of carved oak,
    its tall back pierced with arcading, finials at the corners; Renaissance: a Savonarola X-frame chair with its
    leather back strap, or a carved wainscot chair; Age of Reason: a gilded armchair with a damask seat. The North
    paints it, East Asia lacquers it with a round back; the Islamic world, South Asia and the steppe sit their lords on
    a cushioned takht with bolsters; Africa on a carved, studded stool with a skin before it."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e
    C = L.paint if L.st in ("eastasia", "steppe", "northern", "americas", "oceania") else L.wood
    if e == AR and L.st in ("central", "atlantic", "mediterranean"): C = L.R(mix(L.S["wood2"], (206, 162, 56), .5 if L.prince else .25), 20)
    fh = int((Y1 - Y0) * .24); cy1 = Y1 - fh - 2                               # the footstool takes the front
    fs = (X0 + (X1 - X0) // 4, cy1 + 4, X1 - (X1 - X0) // 4, Y1 - 1)
    shadow(tm, X0, Y0, X1, cy1, 4); shadow(tm, *fs, 3)
    d.rectangle(list(fs), fill=C[2], outline=OUT); pad(tm, (fs[0] + 2, fs[1] + 2, fs[2] - 2, fs[3] - 2), L.dye2(), r=2, dimple=False)
    B2 = (X0, Y0, X1, cy1)
    if L.st in ("islamic", "southasia", "steppe"): takht(tm, B2, L)
    elif L.st == "africa": stoolthrone(tm, B2, L)
    elif e == RE and L.st in ("mediterranean", "central", "atlantic") and L.col != "green":   # the X-frame chair
        for sx, sg in ((X0 + 4, 1), (X1 - 4, -1)):
            d.line([sx, Y0 + 8, sx + sg * 6, cy1 - 2], fill=OUT, width=5); d.line([sx, Y0 + 8, sx + sg * 6, cy1 - 2], fill=C[3], width=3)
            d.line([sx + sg * 6, Y0 + 8, sx, cy1 - 2], fill=OUT, width=5); d.line([sx + sg * 6, Y0 + 8, sx, cy1 - 2], fill=C[2], width=3)
        d.rectangle([X0 + 6, Y0 + 2, X1 - 6, Y0 + 9], fill=L.R((120, 54, 36), 16)[2], outline=OUT)
        for gx in range(X0 + 8, X1 - 6, 4): d.point((gx, Y0 + 5), fill=GOLD[4])
        pad(tm, (X0 + 11, Y0 + 12, X1 - 11, cy1 - 3), L.dye(), r=4); motif(tm, (X0 + 14, Y0 + 15, X1 - 14, cy1 - 6), L, dense=1.4)
        for tx in (X0 + 12, X1 - 12): tassel(tm, tx, cy1 - 3, L.metal)
    else:
        bk = int((cy1 - Y0) * .34)
        back = "horseshoe" if L.st == "eastasia" else "panel"
        sb = chair_parts(tm, B2, L, back, "board", True, C, bkf=.34, cushion=L.dye())
        motif(tm, (sb[0] + 5, sb[1] + 6, sb[2] - 5, sb[3] - 5), L, dense=1.4)
        if back == "panel":                                                       # the tall back: arcading or carving, finials
            d.rectangle([X0 + 5, Y0 + 2, X1 - 5, Y0 + bk - 3], fill=C[1], outline=OUT)
            if e <= LN:
                for gx in range(X0 + 8, X1 - 8, 7): d.arc([gx, Y0 + 3, gx + 6, Y0 + bk + 2], 180, 360, fill=C[4]); d.line([gx, Y0 + 6, gx, Y0 + bk - 4], fill=C[0])
            else: motif(tm, (X0 + 6, Y0 + 3, X1 - 6, Y0 + bk - 4), L, C=L.dye(), A=L.metal, dense=1.5)
            for fx in (X0 + 2, X1 - 2): knob(tm, fx, Y0 + 2, L.metal, 3)
            if L.st == "polar":                                                   # furs heaped over it
                fc = L.R((200, 190, 170), 10); d.ellipse([X0 + 6, Y0 + bk - 4, X1 - 6, Y0 + bk + 12], fill=fc[2], outline=fc[0]); d.arc([X0 + 9, Y0 + bk - 1, X1 - 9, Y0 + bk + 9], 200, 340, fill=fc[4])
        if L.prince: border(tm, (X0 + 5, Y0 + 2, X1 - 5, Y0 + bk - 3), GOLD)
    era_mark(tm, (X0, Y0, X1, cy1), L, "wood")
    finish(tm, snap, (X0, Y0, X1, cy1), L, cloth_=True)


sdef("lordchair", _lordchair, front=True, clear=2, ref="medieval box chairs and great chairs, 2 to 2 1/2 ft wide over the arms, about 2 ft deep, with a footstool before")


def _throne(tm, B, st, L, snap):
    """A throne on its dais from above: two or three steps of stone or wood, carpeted, the great chair at the back
    under its canopy posts, a runner down the steps toward the hall. Each region its own: carved oak and crimson
    (Central and Atlantic Europe), painted and gilt (the North), marble and tile (the Mediterranean), a cushioned
    inlaid takht under a canopy (the Islamic world, South Asia), a lacquered dragon seat (East Asia), a carved stool
    throne on a leopard skin (Africa), felt and silver (the steppe). Modern and future thrones are a chair of state
    on a platform, the future one lit."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    stone = L.R(mix((150, 146, 140), L.S["paint"], .25), 16) if e < FD else L.comp
    shadow(tm, X0, Y0, X1, Y1, 5)
    n = 3
    for k in range(n):                                                          # the steps of the dais, each a ring
        i = k * 9; d.rectangle([X0 + i, Y0 + i // 2, X1 - i, Y1 - i], fill=stone[2 + (k % 2)], outline=OUT); d.line([X0 + i + 1, Y0 + i // 2 + 1, X1 - i - 1, Y0 + i // 2 + 1], fill=stone[4])
    if e in (LN, RE): era_mark(tm, (X0, Y0, X1, Y1), L, "stone")       # moss on the dais in the Long Night, a moulded edge after
    top = (X0 + 27, Y0 + 14, X1 - 27, Y1 - 27)
    cl = L.dye(); motif_box = (top[0] + 2, top[1] + 2, top[2] - 2, top[3] - 2)
    d.rectangle(list(top), fill=cl[2], outline=OUT); motif(tm, motif_box, L, C=L.dye2(), A=L.metal, dense=.9)
    border(tm, top, L.metal); fringe(tm, top[0], top[2], top[3] + 1, L.metal, 2)
    rx0, rx1 = (X0 + X1) // 2 - 16, (X0 + X1) // 2 + 16                       # the runner down the steps
    d.rectangle([rx0, top[3], rx1, Y1 - 1], fill=cl[1], outline=OUT); d.line([rx0 + 3, top[3], rx0 + 3, Y1 - 2], fill=L.metal[3]); d.line([rx1 - 3, top[3], rx1 - 3, Y1 - 2], fill=L.metal[3])
    cw = min(52, (top[2] - top[0]) - 8); cx = (X0 + X1) // 2
    cb = (cx - cw // 2, top[1] + 4, cx + cw // 2, top[1] + 4 + int(cw * .95))
    sub = L
    if L.st in ("islamic", "southasia", "steppe"): takht(tm, cb, L)
    elif L.st == "africa": stoolthrone(tm, cb, L)
    else:
        C = L.paint if L.st in ("eastasia", "northern") else (L.R((206, 162, 56), 22) if L.st in ("central", "atlantic", "mediterranean") else L.wood)
        if e >= MO: C = L.comp if e == FD else L.R((40, 36, 40), 12)
        back = "horseshoe" if L.st == "eastasia" else ("shell" if e >= MO else "panel")
        chair_parts(tm, cb, L, back, "board", True, C, bkf=.36, cushion=L.dye())
    for px_, py_ in ((top[0] + 2, top[1] + 2), (top[2] - 2, top[1] + 2)):          # the canopy posts at the back corners
        d.ellipse([px_ - 4, py_ - 4, px_ + 4, py_ + 4], fill=L.metal[2], outline=OUT); d.point((px_ - 1, py_ - 1), fill=L.metal[4])
    if e == FD: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=L.glow[2])
    era_mark(tm, top, L, "wood")
    finish(tm, snap, (top[0], top[1], top[2], top[3]), L, cloth_=True, corner=0)
    if L.broken: chip(tm, snap, X0, Y0, X1, Y1, L)


sdef("throne", _throne, front=True, clear=3, ref="royal and episcopal thrones on a dais of two or three steps, 5 to 6 ft square")


# ---------------------------------------------------------------- upholstered seats
def upholstered(tm, B, L, snap, kind="chair"):
    """An armchair, sofa or day bed from above: the padded back along the north, arms down the sides, the seat
    cushions toward the front, its cover in the region's cloth."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 5)
    F = frame(L); cov = L.dye()
    if e == VI and L.rich and L.st in ("atlantic", "central", "northern", "americas"): cov = L.R((112, 52, 34) if L.col != "green" else (52, 70, 50), 16)   # leather
    if e == GW: cov = L.R(mix((112, 64, 40), L.S["paint"], .5), 16) if L.w >= 3 else cov
    if e == MO: cov = L.R(mix(L.S["plastic"], (150, 146, 140), .35), 14) if L.w <= 3 else cov
    if e == FD: cov = L.comp
    if L.st == "seasia" and e <= MC: F = L.R((196, 160, 92), 16)
    rad = {AR: 3, VI: 5, GW: 9, MC: 2, MO: 3, FD: 10}.get(e, 3)
    bk = max(8, int(H * .28)); aw = max(7, int(min(16, W * .15))) if kind != "chaise" else 0
    if e == MC:                                                                    # a wooden frame showing, tapered legs
        for lx, ly in ((X0 + 2, Y0 + 2), (X1 - 2, Y0 + 2), (X0 + 2, Y1 - 2), (X1 - 2, Y1 - 2)): leg(tm, lx, ly, F, 2, round_=True)
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=F[2], outline=OUT); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=F[4])
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], rad, fill=cov[1], outline=OUT)
    if kind == "chaise":                                                           # one scrolled end to the west, the long seat
        d.rounded_rectangle([X0, Y0, X0 + max(14, W // 6), Y1], 8, fill=cov[3], outline=OUT); d.arc([X0 + 3, Y0 + 4, X0 + 16, Y1 - 4], 100, 260, fill=cov[4], width=2)
        d.rounded_rectangle([X0 + 6, Y0, X1 - W // 3, Y0 + bk - 4], rad, fill=cov[3], outline=OUT)
        pad(tm, (X0 + max(14, W // 6) + 2, Y0 + bk - 2, X1 - 3, Y1 - 3), cov, r=5, buttons=e == VI)
        pad(tm, (X0 + max(14, W // 6) + 2, Y0 + bk, X0 + max(14, W // 6) + 14, Y1 - 5), L.dye2(), r=5, dimple=False)
        if L.rich:
            for tx in (X0 + max(14, W // 6) + 8,): tassel(tm, tx, Y1 - 4, L.metal)
        motif(tm, (X0 + W // 3, Y0 + bk + 4, X1 - 10, Y1 - 8), L, C=L.dye2(), A=L.metal, dense=.9)
        if e <= VI and L.rich: border(tm, (X0, Y0, X1, Y1), L.metal)
        if e == FD: d.line([X0 + 10, Y1 - 3, X1 - 10, Y1 - 3], fill=L.glow[2], width=2)
        return
    d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + bk], rad, fill=cov[3], outline=OUT)
    if e == VI or (e == AR and L.rich):                                              # deep buttoning
        for j, by in enumerate(range(Y0 + 5, Y0 + bk - 2, 5)):
            for bx in range(X0 + 6 + (j % 2) * 4, X1 - 4, 8): d.rectangle([bx, by, bx + 1, by + 1], fill=cov[0])
    if e == AR and kind == "chair":                                                  # the wings at the back corners
        for wx in (X0, X1 - aw - 4): d.rounded_rectangle([wx, Y0, wx + aw + 4, Y0 + bk + 6], 4, fill=cov[3], outline=OUT)
    for ax in (X0 + 2, X1 - 2 - aw):
        d.rounded_rectangle([ax, Y0 + 6, ax + aw, Y1 - 2], rad if e in (GW, FD) else 3, fill=cov[3], outline=OUT); d.line([ax + 2, Y0 + 8, ax + 2, Y1 - 6], fill=cov[4])
        if e == VI: d.arc([ax + 1, Y1 - 12, ax + aw - 1, Y1 - 2], 0, 180, fill=cov[0])       # the rolled arm's scroll
        if e in (AR, VI) and L.w >= 3: knob(tm, ax + aw // 2, Y1 - 3, L.wood, 2)
        if e == MC: d.rectangle([ax, Y0 + 6, ax + aw, Y1 - 2], fill=F[3], outline=OUT)      # wooden arms
    n = max(1, int((W - 2 * aw) / 40)); sw = (W - 2 * aw - 8) / n
    for i in range(n):
        a0 = X0 + aw + 4 + i * sw; pad(tm, (a0 + 1, Y0 + bk + 2, a0 + sw - 1, Y1 - 5), cov, r=rad // 2 + 2, buttons=e == VI and L.prince)
    # the region's throw or cushions, the rich piece's trim
    sx = X0 + aw + 6
    if L.st in ("islamic", "southasia", "steppe", "africa", "americas", "oceania", "polar") or L.w >= 4:
        cw = min(18, int(sw * .5))
        pad(tm, (sx, Y0 + bk - 6, sx + cw, Y0 + bk + 8), L.dye2(), r=3, dimple=False); motif(tm, (sx + 2, Y0 + bk - 4, sx + cw - 2, Y0 + bk + 6), L, dense=1.5)
        if n > 1: pad(tm, (X1 - aw - 6 - cw, Y0 + bk - 6, X1 - aw - 6, Y0 + bk + 8), L.dye2(), r=3, dimple=False)
    if L.st in ("africa", "americas", "oceania", "polar", "steppe") and e <= MO:          # a throw over the back
        tc = L.dye2() if L.st != "polar" else L.R((176, 150, 116), 14)
        d.rectangle([X0 + W // 3, Y0 + 2, X0 + W // 3 + max(14, W // 5), Y0 + bk + 4], fill=tc[2], outline=OUT)
        motif(tm, (X0 + W // 3 + 1, Y0 + 3, X0 + W // 3 + max(14, W // 5) - 1, Y0 + bk + 3), L, C=L.dye(), A=tc, dense=1.5)
    else:
        motif(tm, (X0 + aw + 6, Y0 + 4, X1 - aw - 6, Y0 + bk - 3), L, C=L.dye2(), A=L.metal, dense=1.3)
    if L.rich and e <= GW: fringe(tm, X0 + aw + 2, X1 - aw - 2, Y1 - 3, L.metal, 3)
    if e == FD: d.line([X0 + 10, Y1 - 3, X1 - 10, Y1 - 3], fill=L.glow[2], width=2); d.line([X0 + 4, Y0 + 3, X1 - 4, Y0 + 3], fill=L.glow[1])


def _armchair(tm, B, st, L, snap):
    """An armchair from above: Age of Reason, a wing chair in damask with wooden knees; Victorian, a buttoned velvet
    or leather easy chair with rolled arms; Great War, a plump leather club chair; Mid-Century, a Danish chair with
    wooden arms and loose cushions; Modern, a squared fabric chair; Future Darkness, a moulded lounger with a lit
    edge. Each region throws its own cloth over it: kilim cushions, kente, a serape, tapa, furs. Worn: faded, a patch;
    broken: the cover split and a corner gone."""
    upholstered(tm, B, L, snap, "chair"); finish(tm, snap, B, L, cloth_=True)


def _sofa(tm, B, st, L, snap):
    """A sofa from above, as the armchair but long, two or three seat cushions: a camel-back settee, a buttoned
    Chesterfield, a club sofa, a Danish sofa on tapered legs, a modern fabric sofa, a moulded future lounger."""
    upholstered(tm, B, L, snap, "sofa"); finish(tm, snap, B, L, cloth_=True)


def _chaise(tm, B, st, L, snap):
    """A day bed or chaise longue from above: one scrolled end to the west, a short back, the long cushion and a
    bolster, in the region's cloth. """
    upholstered(tm, B, L, snap, "chaise"); finish(tm, snap, B, L, cloth_=True)


sdef("armchair", _armchair, eras=(1700, YEAR_END), variants={}, ref="upholstered easy chairs from the 18th c., 2 1/2 to 3 ft each way")
sdef("sofa", _sofa, eras=(1750, YEAR_END), variants={}, ref="sofas and settees from the later 18th c., 5 to 7 ft by about 3 ft")
sdef("chaise", _chaise, front=True, clear=2, ref="day beds and chaises longues, 5 1/2 to 6 1/2 ft long, about 2 1/2 ft wide")


# ---------------------------------------------------------------- rocking, office and bar seats
def _rocking(tm, B, st, L, snap):
    """A rocking chair from above: a chair on two long curved rockers that run out past it front and back, a cushion
    tied on its seat and back. Age of Reason and Victorian: a Windsor or ladder-back rocker (a Boston rocker painted
    and stencilled in the Americas) with a rag cushion in poor homes; Great War: a bentwood rocker with a cane seat;
    Mid-Century: a moulded shell on wooden rockers; Modern: a padded glider; Future Darkness: a dark shell on lit
    runners."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    C = (L.tw if L.w >= 2 else L.wood) if e <= GW else frame(L)
    if e in (MC, MO): C = L.plastic
    rk = C if e != MC else L.wood
    shadow(tm, X0 + 2, Y0 + 6, X1 - 2, Y1 - 6, 4)
    for rx, sg in ((X0 + 3, 1), (X1 - 3, -1)):                                  # the rockers, long and curved toward the ends
        pts = [(rx + sg * 3, Y0 + 1), (rx, Y0 + H // 4), (rx, Y1 - H // 4), (rx + sg * 3, Y1 - 1)]
        d.line(pts, fill=OUT, width=6); d.line(pts, fill=rk[3], width=4); d.line([(p[0] - 1, p[1]) for p in pts], fill=rk[4])
        if e == FD: d.line(pts, fill=L.glow[2], width=2)
    cb = (X0 + 1, Y0 + int(H * .16), X1 - 1, Y1 - int(H * .18))
    back, seat = {AR: ("ladder", "rush"), VI: ("spindle", "board"), GW: ("hoop", "cane"), MC: ("shell", "plastic"), MO: ("pad", "pad"), FD: ("shell", "plastic")}[e]
    if L.st == "americas" and e <= VI: back = "slat"
    chair_parts(tm, cb, L, back, seat, True, C, legs_=False)
    cu = L.dye() if L.w <= 1 else L.cover(C)
    bk = max(6, int((cb[3] - cb[1]) * .26)); ck = L.v.get("cushion", "plain")
    sbx = (cb[0] + 7, cb[1] + bk, cb[2] - 7, cb[3] - 2)
    if ck == "plain": pad(tm, sbx, cu, r=4, buttons=L.w >= 3)                 # the seat cushion
    elif ck == "patchwork": cloth(tm, *sbx, cu, n=0, pattern="patch", rng=tm.rng)
    if ck != "none" and e <= GW: pad(tm, (cb[0] + 8, cb[1] + 2, cb[2] - 8, cb[1] + bk - 1), cu, r=3, dimple=False)   # and the back's, tied on
    if L.w >= 2 and e <= VI: motif(tm, (cb[0] + 9, cb[1] + bk + 3, cb[2] - 9, cb[3] - 4), L, C=L.dye2(), A=L.metal, dense=1.4)
    finish(tm, snap, cb, L, cloth_=True)


sdef("rocking", _rocking, nvar=24, axes={"material": MATERIALS, "colour": COLOURS, "cushion": ["plain", "patchwork", "none"]}, front=True, clear=1.5, ref="Windsor and Boston rockers, a seat about 20 in wide, the rockers 2 1/2 to 3 ft long")


def _officechair(tm, B, st, L, snap):
    """An office chair from above. Victorian: a swivel captain's chair, its curved spindle back and arms on a
    four-footed iron spider; Great War: an oak banker's swivel chair; Mid-Century: a steel tanker chair with vinyl
    pads; Modern: a mesh-backed task chair on a five-star base with castors; Future Darkness: a dark moulded seat on a
    lit ring. The region shows in the wood, the leather and the cloth of its pads. From 1990 the chair is mass-made and the same the world over: a mesh task chair, a tufted executive chair or a small typist's chair, in the maker's grey, black, beige, blue or red."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 + 2; R_ = (X1 - X0) // 2 - 1
    shadow(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 2, 4)
    nf = 4 if e <= GW else 5; base = IRON if e <= GW else (CHROME if e == MC else (L.plastic if L.w <= 2 else CHROME))
    if e == FD: d.ellipse([cx - R_ + 1, cy - R_ + 1, cx + R_ - 1, cy + R_ - 1], fill=L.comp[0], outline=L.glow[2], width=3)
    else:
        for k in range(nf):                                                     # the swivel base's feet and castors
            a = math.radians(90 + 360 * k / nf + (45 if nf == 4 else 0)); fx, fy = cx + math.cos(a) * R_, cy + math.sin(a) * R_ * .92
            d.line([cx, cy, fx, fy], fill=OUT, width=4); d.line([cx, cy, fx, fy], fill=base[2], width=2); d.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=base[1], outline=OUT)
    sb = (X0 + 4, Y0 + 9, X1 - 4, Y1 - 4); C = (L.tw if L.w <= 3 else L.paint) if e <= GW else (L.plastic if e != FD else L.comp)
    if e <= GW:
        seat_top(tm, sb, L, C, "board")
        pk = L.v.get("pad", "cloth")
        if pk == "leather": pad(tm, (sb[0] + 2, sb[1] + 2, sb[2] - 2, sb[3] - 2), L.R({"red": (110, 40, 34), "blue": (40, 34, 34), "green": (60, 74, 50)}.get(L.col, (110, 60, 40)), 16), r=3, buttons=L.w >= 4)
        elif pk == "cloth": pad(tm, (sb[0] + 2, sb[1] + 2, sb[2] - 2, sb[3] - 2), L.dye(), r=3)
        d.arc([X0 + 3, Y0 + 2, X1 - 3, Y0 + 2 + (X1 - X0) - 6], 160, 380, fill=OUT, width=6); d.arc([X0 + 3, Y0 + 2, X1 - 3, Y0 + 2 + (X1 - X0) - 6], 162, 378, fill=C[3], width=4)
        for a in np.linspace(205, 335, 5):
            r_ = math.radians(a); d.line([cx + math.cos(r_) * (R_ - 4), Y0 + 2 + (R_ - 3) + math.sin(r_) * (R_ - 4), cx + math.cos(r_) * (R_ - 12), Y0 + (R_ - 3) + math.sin(r_) * (R_ - 12)], fill=C[1], width=2)
    elif e == MC:
        if L.rich: C = L.R(L.mt(mix((70, 36, 28), L.S["paint"], .55)), 14)          # the manager's chair: buttoned leather
        d.rounded_rectangle(list(sb), 4, fill=CHROME[2], outline=OUT); pad(tm, (sb[0] + 2, sb[1] + 2, sb[2] - 2, sb[3] - 2), C, r=4, buttons=L.rich)
        pad(tm, (X0 + 6, Y0 + 2, X1 - 6, Y0 + 11), C, r=3, dimple=False)
        for ax in (X0 + 3, X1 - 8): d.rectangle([ax, Y0 + 12, ax + 5, Y1 - 12], fill=CHROME[3], outline=OUT); pad(tm, (ax, Y0 + 13, ax + 5, Y0 + 24), L.cover(C), r=2, dimple=False)
    else:                                                                       # the makes of the day: a mesh task chair, an executive chair, a typist's chair
        pk = L.v.get("pad", "cloth"); m = L.pick(["task", "exec", "typist"], "model")
        P_ = L.cover(C, .4) if pk == "cloth" else (C if pk == "bare" else L.R((44, 40, 40), 10))
        if m == "exec":                                                         # high padded back and broad padded arms, tufted
            pad(tm, sb, P_, r=6, buttons=True)
            pad(tm, (X0 + 2, Y0, X1 - 2, Y0 + 16), P_, r=6, buttons=True)
            for ax in (X0, X1 - 8): pad(tm, (ax, Y0 + 14, ax + 8, Y1 - 10), P_, r=3, dimple=False)
        elif m == "typist":                                                     # a small round seat, a little back pad, no arms
            d.ellipse([sb[0] + 4, sb[1] + 2, sb[2] - 4, sb[3] - 2], fill=P_[2], outline=OUT); d.arc([sb[0] + 6, sb[1] + 4, sb[2] - 6, sb[3] - 4], 200, 260, fill=P_[4])
            pad(tm, (cx - 9, Y0 + 2, cx + 9, Y0 + 9), C, r=3, dimple=False); d.line([cx, Y0 + 9, cx, sb[1] + 3], fill=(40, 40, 44), width=3)
        else:
            pad(tm, sb, P_, r=6, buttons=pk == "leather")
            d.rounded_rectangle([X0 + 5, Y0 + 1, X1 - 5, Y0 + 12], 5, fill=C[1], outline=OUT)
            for gx in range(X0 + 8, X1 - 6, 3): d.line([gx, Y0 + 3, gx, Y0 + 10], fill=C[3] if e == MO else L.glow[1])  # the mesh
            for ax in (X0 + 3, X1 - 7): d.rectangle([ax, Y0 + 16, ax + 4, Y1 - 14], fill=(40, 40, 44), outline=OUT)
    if e <= GW: era_mark(tm, sb, L, "wood")
    finish(tm, snap, sb, L, cloth_=e >= MC)


sdef("officechair", _officechair, nvar=36, axes={"material": MATERIALS, "colour": COLOURS, "pad": ["leather", "cloth", "bare"], "model": ["task", "exec", "typist"]}, global_from=1990, front=True, clear=1.5, ref="swivel desk chairs from the 1850s, about 2 ft across the base")


def _barstool(tm, B, st, L, snap):
    """A bar stool from above: a high round seat with the foot ring round its legs showing past it. Great War: a turned
    wooden stool with a brass ring; Mid-Century: chrome with a padded vinyl top in the diner's colour; Modern: a steel
    or wooden saddle seat; Future Darkness: a dark disc with a lit ring. The region shows in its wood and its cloth. From 1990 it is mass-made and the same the world over: a round, square or low-backed seat in the maker's colour."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 + 1
    shadow(tm, cx - r, cy - r, cx + r, cy + r, 4, kind="ellipse")
    ring = {VI: L.fade(BRASS), GW: L.fade(BRASS), MC: CHROME, MO: L.fade(STEEL), FD: L.glow}[e]
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OUT, width=3); d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=ring[2], width=1)
    for a in (45, 135, 225, 315):
        ra = math.radians(a); leg(tm, cx + math.cos(ra) * (r - 1), cy + math.sin(ra) * (r - 1), frame(L) if e <= GW else CHROME, 2)
    s_ = r - 2
    if e <= GW: K = L.wood if L.w <= 2 else L.paint
    elif e == MC: K = L.plastic
    elif e == MO: K = L.plastic
    else: K = L.comp
    m = L.pick(["disc", "square", "backed"], "model") if e >= MO else "disc"
    if m == "square": d.rounded_rectangle([cx - s_, cy - s_, cx + s_, cy + s_], 3, fill=K[2], outline=OUT); d.line([cx - s_ + 2, cy - s_ + 2, cx + s_ - 2, cy - s_ + 2], fill=K[4])
    else: d.ellipse([cx - s_, cy - s_, cx + s_, cy + s_], fill=K[2], outline=OUT); d.arc([cx - s_ + 2, cy - s_ + 2, cx + s_ - 2, cy + s_ - 2], 190, 260, fill=K[4])
    if m == "backed": d.arc([cx - s_ - 1, cy - s_ - 1, cx + s_ + 1, cy + s_ + 1], 190, 350, fill=OUT, width=5); d.arc([cx - s_, cy - s_, cx + s_, cy + s_], 192, 348, fill=K[0], width=3)
    if L.w >= 3 or (e == MC and L.w >= 2):                                       # a padded top, buttoned when rich
        P_ = ramp(mix(L.dye()[2], K[2], .35), 18); pad(tm, (cx - s_ + 3, cy - s_ + 3, cx + s_ - 3, cy + s_ - 3), P_, r=s_ - 3, buttons=L.w >= 4, piping=K[0])
    elif L.w >= 2: d.ellipse([cx - s_ + 4, cy - s_ + 4, cx + s_ - 4, cy + s_ - 4], outline=K[1]); d.line([cx - 4, cy, cx + 4, cy], fill=K[0], width=2)
    else:
        for k in (-4, 0, 4): d.line([cx - s_ + 4, cy + k, cx + s_ - 4, cy + k], fill=K[1])
    if e == FD: d.ellipse([cx - s_ + 2, cy - s_ + 2, cx + s_ - 2, cy + s_ - 2], outline=L.glow[2])
    if L.broken: cut(tm, snap, [(cx, cy), (X1 + 4, cy - 2), (X1 + 4, Y1 + 4), (cx - 2, Y1 + 4)]); d.line([cx, cy, X1 - 3, cy], fill=OUT); d.line([cx, cy, cx, Y1 - 3], fill=OUT)
    elif L.worn: wear(tm, (cx - s_, cy - s_, cx + s_, cy + s_), L, cloth_=True)


sdef("barstool", _barstool, nvar=21, ft=((1.25, 1.75), (1.25, 1.75)), axes={"material": MATERIALS, "colour": COLOURS, "model": ["disc", "square", "backed"]}, global_from=1990, front=False,
     ref="bar stools of the 1900s on, a seat 13 to 16 in across with a foot ring about 18 in")


# ---------------------------------------------------------------- benches, settles and pews
def plank(tm, box, L, C, kind="board"):
    """A bench's seat seen from above, in the manner of its age and region."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    if kind == "split":                                                          # a split log, adzed flat, the stake legs through it
        slab(tm, x0, y0, x1, y1, C, "x", knots=2, rng=tm.rng); d.line([x0 + 2, y1 - 2, x1 - 2, y1 - 2], fill=C[0])
        for lx in (x0 + 8, x1 - 10):
            for ly in (y0 + 4, y1 - 5): d.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=C[0], outline=OUT)
    elif kind == "slats":
        n = max(2, (y1 - y0) // 6); sh = (y1 - y0) / n
        for i in range(n): d.rectangle([x0, y0 + i * sh, x1, y0 + (i + 1) * sh - 2], fill=C[3 - i % 2], outline=OUT)
    elif kind == "poles":                                                        # bamboo poles lashed side by side
        n = max(3, (y1 - y0) // 4); sh = (y1 - y0) / n
        for i in range(n):
            yy = y0 + i * sh; d.rounded_rectangle([x0, yy, x1, yy + sh - 1], 2, fill=C[2 + i % 2], outline=OUT)
            for nx in range(x0 + 14, x1 - 6, 22): d.line([nx, yy, nx, yy + sh - 1], fill=C[0])
    elif kind == "string":
        d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT); weave(tm, (x0 + 3, y0 + 3, x1 - 3, y1 - 3), L.R(L.S["undyed"], 14), 3)
    elif kind == "log":                                                          # a half log, the bark at its edges
        d.rounded_rectangle([x0, y0, x1, y1], 4, fill=C[2], outline=OUT); d.line([x0 + 3, y0 + 1, x1 - 3, y0 + 1], fill=L.R((90, 70, 54), 10)[1], width=2)
        d.line([x0 + 3, y1 - 2, x1 - 3, y1 - 2], fill=L.R((90, 70, 54), 10)[0], width=2)
        for k in range(x0 + 6, x1 - 6, 9): d.arc([k, y0 + 3, k + 8, y1 - 3], 270, 90, fill=C[1])
    elif kind == "moulded":
        d.rounded_rectangle([x0, y0, x1, y1], 5, fill=C[2], outline=OUT); d.line([x0 + 5, y0 + 1, x1 - 5, y0 + 1], fill=C[4]); d.line([x0 + 5, y1 - 2, x1 - 5, y1 - 2], fill=C[0])
    else:
        slab(tm, x0, y0, x1, y1, C, "x", rng=tm.rng); d.line([x0 + 3, y0 + 3, x1 - 3, y0 + 3], fill=C[3])


BENCH_KIND = {"seasia": "poles", "southasia": "string", "africa": "log", "americas": "log", "polar": "log", "oceania": "log"}


def bench_cover(tm, box, L, cv):
    """What lies on a bench: nothing, a banker (a long cloth over it), or loose cushions."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    if cv == "cloth":
        d.rectangle([x0 + 6, y0, x1 - 6, y1], fill=L.dye()[2], outline=OUT); motif(tm, (x0 + 8, y0 + 2, x1 - 8, y1 - 2), L, C=L.dye2(), A=L.metal, dense=1.2)
        if L.w >= 3: fringe(tm, x0 + 6, x1 - 6, y1 - 2, L.metal, 2)
    elif cv == "cushions":
        n = max(1, (x1 - x0) // 34); cw = (x1 - x0 - 8) / n
        for i in range(n): pad(tm, (x0 + 4 + i * cw + 2, y0 + 1, x0 + 4 + (i + 1) * cw - 4, y1 - 1), L.dye() if i % 2 == 0 else L.dye2(), r=3)


def _bench(tm, B, st, L, snap):
    """A bench from above. Dark Ages and Long Night: a split plank on stake legs whose ends show through it;
    Renaissance and Age of Reason: a joined form with a moulded edge; Victorian: a scrubbed pine bench, or a park
    bench of slats on cast-iron ends; Great War and Mid-Century: a painted slatted bench; Modern: slats on steel;
    Future Darkness: a moulded bench with a lit strip. Southeast Asia: lashed bamboo poles; South Asia: a string seat
    on a frame; Africa, the Americas, Oceania and the far north: a half log with its bark. A rich house lays a
    banker cloth or cushions on it."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cv = L.v.get("cover", "bare")
    if L.poor and cv == "cloth": cv = "bare"
    shadow(tm, X0, Y0, X1, Y1, 4)
    C = L.wood if e <= VI else L.tw
    kind = "split" if e <= LN else "board"
    if e <= GW and L.st in BENCH_KIND: kind = BENCH_KIND[L.st]
    if e in (RE, AR) and L.w >= 2 and kind == "board": kind = "moulded"
    if e == VI and L.w >= 3 and kind == "board": kind = "park"
    if e in (GW, MC): C = L.paint if kind in ("board", "moulded") else C; kind = "slats" if kind in ("board", "moulded") else kind
    if e == MO: kind, C = "slats", L.tw
    if e == FD: kind, C = "moulded", L.comp
    if L.st in ("steppe", "northern", "central", "eastasia") and L.w >= 2 and e <= VI: C = L.paint
    if kind == "park":                                                          # slats on cast-iron ends
        plank(tm, (X0 + 3, Y0, X1 - 3, Y1), L, L.tw, "slats")
        for ex in (X0, X1 - 6): d.rectangle([ex, Y0 - 1, ex + 6, Y1 + 1], fill=IRON[2], outline=OUT); d.line([ex + 1, Y0, ex + 1, Y1], fill=IRON[4])
    else:
        plank(tm, (X0, Y0, X1, Y1), L, C, kind)
        if kind in ("moulded", "board") and e >= RE and e <= VI:
            for lx in (X0 + 2, X1 - 6): d.rectangle([lx, Y0 + 1, lx + 4, Y1 - 1], fill=C[1], outline=OUT)   # the end boards
        if kind in ("board", "moulded") and L.w >= 2 and e <= VI and C is not L.wood: motif(tm, (X0 + 10, Y0 + 3, X1 - 10, Y1 - 3), L, dense=1.2)
        if e in (MO,): 
            for lx in (X0 + 10, X1 - 12): d.rectangle([lx, Y0 - 1, lx + 2, Y1 + 1], fill=STEEL[2])
        if e == FD: d.line([X0 + 6, Y1 - 2, X1 - 6, Y1 - 2], fill=L.glow[2]); d.line([X0 + 6, Y0 + 2, X1 - 6, Y0 + 2], fill=L.glow[1])
    if cv != "bare": bench_cover(tm, (X0, Y0, X1, Y1), L, cv)
    if L.e == LN: era_mark(tm, (X0, Y0, X1, Y1), L, "wood")
    finish(tm, snap, (X0, Y0, X1, Y1), L, cloth_=cv != "bare")


sdef("bench", _bench, axes={"material": MATERIALS, "colour": COLOURS, "cover": ["bare", "cloth", "cushions"]},
     ref="plank benches and forms, 4 to 8 ft long, a seat 12 to 16 in deep")


def _settle(tm, B, st, L, snap):
    """A high-backed settle against the wall, from above: the tall solid back along the north (the top of its
    panelling and cornice seen), a box seat with a hinged lid, arms or wings at both ends, cushions on it. Long Night
    and Renaissance: oak, linenfold or plain panels; Age of Reason: a painted settle (rosemaling in the North, flowers
    in Central Europe); Victorian and Great War: a pine settle in a cottage or inn; the Americas: a painted settle with
    a stencilled back rail."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    C = L.paint if (L.w >= 2 and e >= AR and L.st in ("northern", "central", "americas")) else (L.wood if e <= AR else L.tw)
    tm.shade((X0 + 5, Y0 + 6, X1 + 6, Y1 + 5), f=.5)
    bk = max(9, int(H * .34))
    slab(tm, X0, Y0 + bk, X1, Y1, C, "x", rng=tm.rng)                           # the box seat and its lid
    d.line([X0 + 6, Y1 - 4, X1 - 6, Y1 - 4], fill=C[0]); knob(tm, (X0 + X1) // 2, Y1 - 2, L.metal, 2)
    for hx in (X0 + (X1 - X0) // 3, X1 - (X1 - X0) // 3): d.rectangle([hx - 3, Y0 + bk + 1, hx + 3, Y0 + bk + 3], fill=IRON[3])   # lid hinges
    d.rectangle([X0 - 1, Y0, X1 + 1, Y0 + bk], fill=C[3], outline=OUT); d.line([X0, Y0 + 1, X1, Y0 + 1], fill=C[4])   # the high back's cornice
    for gx in range(X0 + 14, X1 - 6, 14): d.line([gx, Y0 + 3, gx, Y0 + bk - 2], fill=C[1])                  # its panels
    if L.w >= 2: motif(tm, (X0 + 6, Y0 + 3, X1 - 6, Y0 + bk - 3), L, dense=1.2)
    for ax in (X0, X1 - 6): d.rectangle([ax, Y0 + bk, ax + 6, Y1], fill=C[3], outline=OUT); d.line([ax + 1, Y0 + bk + 1, ax + 1, Y1 - 1], fill=C[4])
    cv = L.v.get("cover", "cushions")
    if cv == "cushions": bench_cover(tm, (X0 + 7, Y0 + bk + 3, X1 - 7, Y1 - 6), L, "cushions")
    elif cv == "cloth" and not L.poor: bench_cover(tm, (X0 + 7, Y0 + bk + 3, X1 - 7, Y1 - 6), L, "cloth")
    elif cv == "fleece":
        fc = L.R((206, 196, 172), 10); d.rounded_rectangle([X0 + 12, Y0 + bk + 2, X0 + (X1 - X0) // 2, Y1 - 5], 6, fill=fc[2], outline=fc[0])
        for k in range(X0 + 15, X0 + (X1 - X0) // 2 - 3, 5): d.arc([k, Y0 + bk + 5, k + 5, Y0 + bk + 10], 180, 360, fill=fc[4])
    finish(tm, snap, (X0, Y0, X1, Y1), L, cloth_=True)


sdef("settle", _settle, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "cover": ["cushions", "fleece", "cloth"]}, front=True, clear=2,
     ref="settles of English, Welsh, German and Scandinavian farmhouses, 5 to 7 ft long, 18 to 24 in deep with the back")


def _pew(tm, B, st, L, snap):
    """A church pew from above: the long seat, its back along the north with the book ledge on top holding hymn books,
    the bench ends at each side (poppyheads in gothic work), kneelers on the floor before it. Long Night and
    Renaissance: oak with carved poppyhead ends; Age of Reason: plain painted deal; Victorian: pitch pine with gothic
    ends and a cushion; later: varnished pine, then light beech, then a moulded future bench. Each region its own
    wood and the cloth of its kneelers."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    C = L.wood if e <= AR else (L.tw if e < FD else L.comp)
    shadow(tm, X0, Y0, X1, Y1, 4)
    bk = max(7, int(H * .3)); seat = (X0 + 6, Y0 + bk, X1 - 6, Y0 + int(H * .78))
    slab(tm, *seat, C, "x", rng=tm.rng)
    d.rectangle([X0 + 4, Y0, X1 - 4, Y0 + bk], fill=C[3], outline=OUT); d.line([X0 + 5, Y0 + 1, X1 - 5, Y0 + 1], fill=C[4])     # the back's top, the ledge
    d.rectangle([X0 + 6, Y0 + bk - 4, X1 - 6, Y0 + bk - 1], fill=C[1])
    for k, bx in enumerate(range(X0 + 16, X1 - 16, 26)):                      # hymn books on the ledge
        bc = (L.dye(), L.dye2(), L.R((40, 36, 40), 10))[k % 3]; d.rectangle([bx, Y0 + 2, bx + 9, Y0 + bk - 5], fill=bc[2], outline=OUT); d.line([bx + 1, Y0 + 3, bx + 8, Y0 + 3], fill=WHITE[3])
    for ex in (X0, X1 - 7):                                                     # the bench ends
        d.rectangle([ex, Y0, ex + 7, seat[3] + 2], fill=C[2], outline=OUT); d.line([ex + 1, Y0 + 1, ex + 1, seat[3]], fill=C[4])
        if e in (LN, RE, VI) and L.w >= 2: d.ellipse([ex - 1, Y0 - 1, ex + 8, Y0 + 7], fill=C[3], outline=OUT); d.point((ex + 3, Y0 + 2), fill=C[4])   # poppyhead
    if L.w >= 3 or e == VI: pad(tm, (seat[0] + 3, seat[1] + 2, seat[2] - 3, seat[3] - 2), L.cover(C, .15), r=3, dimple=False)
    for kx in range(X0 + 14, X1 - 20, 28):                                      # kneelers before it
        kc = L.dye() if (k := kx // 28) % 2 else L.dye2()
        d.rounded_rectangle([kx, seat[3] + 4, kx + 18, Y1 - 1], 3, fill=kc[2], outline=OUT)
        if L.w >= 2: motif(tm, (kx + 2, seat[3] + 5, kx + 16, Y1 - 2), L, C=kc, A=L.metal, dense=1.6)
    if e == FD: d.line([X0 + 8, seat[3], X1 - 8, seat[3]], fill=L.glow[2])
    if e >= MC: era_mark(tm, seat, L, "wood")
    finish(tm, snap, seat, L)


sdef("pew", _pew, nvar=20, front=True, clear=1.5, ref="parish pews of the 15th to 19th c., 8 to 12 ft long, 2 1/2 to 3 ft from back to front with the kneeling space")


def _choirstall(tm, B, st, L, snap):
    """Choir stalls from above: a row of seats divided by arm rests along the back, the tall carved canopy over them
    (its cresting and pinnacles seen from above), and the book desk before them with open choir books and candles.
    Dark Ages: plain oak with a shallow canopy; Long Night and Renaissance: rich tabernacle work with pinnacles; Age of
    Reason: classical panelling with a cornice; later eras keep the old stalls, cleaned and lit by lamps or, at the
    last, a glow strip."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    C = L.wood if e < FD else L.comp
    shadow(tm, X0, Y0, X1, Y1, 5)
    cn = int(H * .26); row = (X0, Y0 + cn, X1, Y0 + int(H * .62)); desk = (X0 + 4, Y0 + int(H * .7), X1 - 4, Y1 - 2)
    d.rectangle([X0, Y0, X1, Y0 + cn], fill=C[1], outline=OUT)                # the canopy
    if e in (LN, RE) or (e >= VI and L.w >= 4):
        for px_ in range(X0 + 6, X1 - 3, 16):
            d.polygon([(px_, Y0 + cn - 2), (px_ + 5, Y0 + 2), (px_ + 10, Y0 + cn - 2)], fill=C[3], outline=OUT); d.point((px_ + 5, Y0 + 4), fill=L.metal[4])
    else:
        d.line([X0 + 2, Y0 + 3, X1 - 2, Y0 + 3], fill=C[4]); d.line([X0 + 2, Y0 + cn - 3, X1 - 2, Y0 + cn - 3], fill=C[0])
    if L.w >= 4: border(tm, (X0 + 1, Y0 + 1, X1 - 1, Y0 + cn - 1), L.metal)
    slab(tm, *row, C, "x", rng=tm.rng); n = max(3, (X1 - X0) // 30); sw = (X1 - X0) / n
    for i in range(n):                                                          # each stall's seat and its arms
        sx = X0 + i * sw; d.rectangle([sx, row[1], sx + 4, row[3]], fill=C[3], outline=OUT)
        pad(tm, (sx + 7, row[1] + 4, sx + sw - 4, row[3] - 3), L.cover(C, .2), r=3)
    d.rectangle([X1 - 4, row[1], X1, row[3]], fill=C[3], outline=OUT)
    slab(tm, *desk, C, "x", rng=tm.rng)                                        # the book desk
    for i in range(n):
        bx = int(X0 + i * sw + sw / 2 - 9)
        if (i + L.w) % 2 == 0:                                                  # an open choir book, staves on its pages
            d.rectangle([bx, desk[1] + 2, bx + 18, desk[3] - 2], fill=LINEN[4], outline=OUT); d.line([bx + 9, desk[1] + 2, bx + 9, desk[3] - 2], fill=LINEN[1])
            for ly in range(desk[1] + 5, desk[3] - 3, 3): d.line([bx + 2, ly, bx + 7, ly], fill=(60, 50, 50)); d.line([bx + 11, ly, bx + 16, ly], fill=(160, 40, 40) if ly % 2 else (60, 50, 50))
        else: d.ellipse([bx + 6, desk[1] + 3, bx + 12, desk[1] + 9], fill=BRASS[2], outline=OUT); d.rectangle([bx + 8, desk[1] + 4, bx + 10, desk[1] + 7], fill=WHITE[4])
    motif(tm, (X0 + 6, desk[1] + 1, X1 - 6, desk[1] + 3), L, dense=1.4)
    if e == FD: d.line([X0 + 4, desk[3] - 1, X1 - 4, desk[3] - 1], fill=L.glow[2])
    finish(tm, snap, row, L)


sdef("choirstall", _choirstall, nvar=30, front=True, clear=2, mount="wall",
     ref="medieval choir stalls, each stall about 2 ft wide, the row with its desk 4 to 5 ft deep")


def _pewbox(tm, B, st, L, snap):
    """A box pew from above: a square pen of high panelled walls with a door to the aisle, benches round three sides
    inside with cushions, hassocks on the floor and a prayer book on the ledge. Age of Reason: painted deal or oak, the
    door with its brass number; Victorian: the last of them, grained and varnished, lined in baize or damask."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; th = 5
    C = L.paint if L.mat == "pale" else L.wood
    tm.shade((X0 + 5, Y0 + 5, X1 + 5, Y1 + 5), f=.55)
    lin = L.cover(C, .15)
    d.rectangle([X0, Y0, X1, Y1], fill=lin[1], outline=OUT)                    # the floor inside, lined
    for gx in range(X0 + th + 4, X1 - th, 6): d.line([gx, Y0 + th, gx, Y1 - th], fill=lin[0])
    for bx0, by0, bx1, by1 in ((X0 + th, Y0 + th, X1 - th, Y0 + th + 16), (X0 + th, Y0 + th + 16, X0 + th + 16, Y1 - th - 4), (X1 - th - 16, Y0 + th + 16, X1 - th, Y1 - th - 4)):
        slab(tm, bx0, by0, bx1, by1, C, "x" if bx1 - bx0 > by1 - by0 else "y", rng=tm.rng)
        pad(tm, (bx0 + 2, by0 + 2, bx1 - 2, by1 - 2), L.dye(), r=3, dimple=False)
    for hx in (X0 + (X1 - X0) // 3, X1 - (X1 - X0) // 3):                       # hassocks
        d.rounded_rectangle([hx - 8, Y1 - 30, hx + 8, Y1 - 18], 3, fill=L.dye2()[2], outline=OUT); motif(tm, (hx - 6, Y1 - 28, hx + 6, Y1 - 20), L, dense=2)
    d.rectangle([(X0 + X1) // 2 - 6, Y0 + th + 4, (X0 + X1) // 2 + 6, Y0 + th + 12], fill=L.R((40, 30, 30), 10)[2], outline=OUT)   # a prayer book
    for x0_, y0_, x1_, y1_ in ((X0, Y0, X1, Y0 + th), (X0, Y0, X0 + th, Y1), (X1 - th, Y0, X1, Y1), (X0, Y1 - th, X0 + (X1 - X0) // 2 - 14, Y1), (X0 + (X1 - X0) // 2 + 14, Y1 - th, X1, Y1)):
        d.rectangle([x0_, y0_, x1_, y1_], fill=C[3], outline=OUT)              # the high walls' tops
    d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
    dx = X0 + (X1 - X0) // 2 - 14                                               # the door: shut, or swung in against the hinge side
    if st == "open":
        d.rectangle([dx, Y1 - th, dx + 28, Y1], fill=lin[0], outline=OUT)        # the doorway's sill
        d.polygon([(dx, Y1 - th), (dx + 5, Y1 - th), (dx + 13, Y1 - th - 26), (dx + 8, Y1 - th - 27)], fill=C[2], outline=OUT); knob(tm, dx + 11, Y1 - th - 22, L.metal, 2)
    else: d.rectangle([dx, Y1 - th, dx + 28, Y1], fill=C[2], outline=OUT); knob(tm, dx + 24, Y1 - 3, L.metal, 2)
    if L.w >= 4: border(tm, (X0, Y0, X1, Y0 + th), GOLD)
    finish(tm, snap, (X0, Y0, X1, Y1), L)


sdef("pewbox", _pewbox, nvar=20, states=("closed", "open"), front=True, clear=2, axes={"material": MATERIALS, "colour": COLOURS},
     ref="18th c. box pews, 6 to 9 ft square, walls about 4 ft high")


def _benchstone(tm, B, st, L, snap):
    """A stone bench from above: a heavy slab on two stone supports whose ends show at the sides. Each region its
    own stone and work: grey sandstone (Central and Atlantic Europe), granite (the North and East Asia), white marble
    with a scrolled end (the Mediterranean), a tiled bench (the Islamic world), red sandstone with a carved edge (South
    Asia), laterite (Africa), carved andesite with a stepped fret (the Americas), basalt (Oceania), a slab of slate
    (the far north). Modern: poured concrete; Future Darkness: a dark slab with a lit seam. Worn: lichen and moss; broken:
    cracked through."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e
    SC = {"central": (150, 140, 120), "atlantic": (164, 156, 136), "northern": (120, 120, 124), "mediterranean": (226, 222, 212), "islamic": (200, 180, 140),
          "steppe": (170, 150, 120), "southasia": (176, 96, 70), "eastasia": (140, 142, 140), "seasia": (120, 110, 96), "africa": (170, 90, 56),
          "americas": (130, 120, 104), "oceania": (70, 66, 64), "polar": (86, 92, 100)}[L.st]
    K = L.R(L.mt(SC), 16) if e < MO else (L.R(L.mt(mix((170, 168, 160), SC, .55)), 12) if e == MO else L.comp)
    shadow(tm, X0, Y0, X1, Y1, 4)
    for ex in (X0 + 6, X1 - 18):                                                # the supports past the slab
        d.rectangle([ex, Y0 - 1, ex + 12, Y1 + 1], fill=K[1], outline=OUT)
    d.rectangle([X0 + 1, Y0 + 2, X1 - 1, Y1 - 2], fill=K[2], outline=OUT); d.line([X0 + 2, Y0 + 3, X1 - 2, Y0 + 3], fill=K[4]); d.line([X0 + 2, Y1 - 3, X1 - 2, Y1 - 3], fill=K[0])
    rng = np.random.default_rng(5)
    for _ in range((X1 - X0) // 6):                                              # the stone's speckle in clusters
        sx, sy = rng.uniform(X0 + 4, X1 - 6), rng.uniform(Y0 + 5, Y1 - 5); d.rectangle([sx, sy, sx + 1, sy], fill=K[1 + int(sx) % 3])
    if L.st == "islamic" and e < MO:
        for gx in range(X0 + 4, X1 - 6, 8): d.rectangle([gx, Y0 + 4, gx + 6, Y1 - 4], fill=(WHITE[3] if (gx // 8) % 2 else L.R((40, 120, 150), 16)[2]), outline=K[0])
    elif L.st == "mediterranean" and e < MO:
        for ex in (X0 + 1, X1 - 9): d.ellipse([ex, Y0 + 2, ex + 8, Y1 - 2], fill=K[3], outline=OUT); d.arc([ex + 2, Y0 + 4, ex + 6, Y1 - 4], 90, 270, fill=K[0])
    elif L.st in ("americas", "southasia", "eastasia", "africa") and e < MO: motif(tm, (X0 + 8, Y0 + 4, X1 - 8, Y1 - 4), L, C=K, A=K, dense=1.2)
    if L.w >= 4 and e < MO: d.rectangle([X0 + 3, Y0 + 4, X1 - 3, Y1 - 4], outline=K[4])
    if e == FD: d.line([X0 + 6, (Y0 + Y1) // 2, X1 - 6, (Y0 + Y1) // 2], fill=L.glow[2])
    if e == MO and L.w >= 3: plank(tm, (X0 + 4, Y0 + 3, X1 - 4, Y1 - 3), L, L.tw, "slats")     # timber slats bolted on the concrete
    elif e == MO: motif(tm, (X0 + 8, Y0 + 4, X1 - 8, Y1 - 4), L, C=L.paint, A=L.paint, dense=1)  # the town's painted pattern
    if L.worn:                                                                  # lichen and moss in clumps
        mc = L.R((90, 120, 60), 14)
        for mx in (X0 + 10, X1 - 26, (X0 + X1) // 2): d.ellipse([mx, Y1 - 8, mx + 9, Y1 - 3], fill=mc[2]); d.point((mx + 3, Y1 - 7), fill=mc[4])
    era_mark(tm, (X0, Y0, X1, Y1), L, "stone")
    finish(tm, snap, (X0, Y0, X1, Y1), L)


sdef("bench-stone", _benchstone, nvar=26, front=False, ref="stone benches of cloisters, courtyards and parks, 5 to 7 ft long, 15 to 18 in deep")


# ---------------------------------------------------------------- low seats of Asia and Africa
def _cushion(tm, B, st, L, snap):
    """A floor cushion from above: a square pad, plump at the middle, tasselled at the corners, in the region's
    cloth: kilim weave and velvet (the Islamic world), felt with ram's horns (the steppe), block-printed cotton
    (South Asia), silk brocade or a plain zabuton (East Asia), batik (Southeast Asia), kente or mud cloth (Africa).
    Poor ones are sacking stuffed with straw, patched; rich ones silk with gold tassels. Modern: printed cotton or a
    bean bag; Future Darkness: a gel pad with a soft-lit seam."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e
    shadow(tm, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3)
    C = L.cover(L.paint, .25) if not L.poor else L.dye()
    if e == FD: C = L.comp
    if L.v.get("shape") == "round": d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=C[2], outline=OUT); d.arc([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], 190, 260, fill=C[4], width=2)
    else: pad(tm, (X0 + 1, Y0 + 1, X1 - 1, Y1 - 1), C, r=8)
    m = 9 if L.v.get("shape") != "round" else 12
    if L.poor:
        d.line([X0 + 6, (Y0 + Y1) // 2, X1 - 6, (Y0 + Y1) // 2], fill=C[0]); d.rectangle([X0 + 9, Y0 + 9, X0 + 18, Y0 + 17], fill=L.R(tone(L.S["undyed"], -40), 10)[2], outline=OUT)
        for k in range(X0 + 10, X0 + 18, 3): d.point((k, Y0 + 9), fill=WHITE[3])
    else:
        motif(tm, (X0 + m, Y0 + m, X1 - m, Y1 - m), L, C=L.dye2(), A=L.metal, dense=1.2 if L.w <= 3 else 1.6)
        if L.w >= 4: border(tm, (X0 + m - 3, Y0 + m - 3, X1 - m + 3, Y1 - m + 3), L.metal)
    if L.v.get("shape") != "round":
        for tx, ty in ((X0 + 2, Y0 + 2), (X1 - 2, Y0 + 2), (X0 + 2, Y1 - 2), (X1 - 2, Y1 - 2)): tassel(tm, tx, ty, L.metal if L.w >= 2 else C)
    if e == FD: d.rounded_rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], 6, outline=L.glow[2])
    era_mark(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), L, "cloth")
    if L.worn: wear(tm, (X0, Y0, X1, Y1), L, cloth_=True)
    if L.broken:                                                                # split open, its stuffing out
        sc = L.R((206, 186, 120), 10) if e <= VI else L.R((230, 230, 226), 6)
        d.polygon([(X1 - 14, Y1 - 6), (X1 + 2, Y1 - 12), (X1 + 3, Y1 + 2), (X1 - 8, Y1 + 3)], fill=sc[2], outline=sc[0])


sdef("cushion", _cushion, nvar=18, axes={"material": MATERIALS, "colour": COLOURS, "shape": ["square", "round"]}, front=False,
     ref="floor cushions (minder, zabuton, gaddi) 18 to 28 in square")


def _divan(tm, B, st, L, snap):
    """A divan along the wall from above: a long low platform with its mattress, a row of back cushions against the
    wall, bolsters at each end and a cloth or carpet thrown over the seat with a fringe at the front. The Islamic world:
    kilim and velvet, brass trays nearby; the steppe: felt and silk; South Asia: a gaddi with block-printed covers and
    round bolsters. Poor ones are a mattress on a raised mud or plank bench under plain cloth. Modern: a fitted sofa
    bench; Future Darkness: a moulded bench with a lit plinth."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 4)
    base = L.R((176, 150, 116), 12) if L.poor else (L.wood if e < MO else (L.plastic if e == MO else L.comp))
    d.rectangle([X0, Y0, X1, Y1], fill=base[2], outline=OUT); d.line([X0 + 1, Y1 - 2, X1 - 1, Y1 - 2], fill=base[0])
    M = L.cover(L.paint, .3) if not L.poor else L.dye()
    d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y1 - 4], fill=M[2], outline=OUT)      # the mattress under its cloth
    motif(tm, (X0 + 6, Y0 + int(H * .45), X1 - 6, Y1 - 7), L, C=L.dye2(), A=L.metal, dense=1)
    if L.w >= 2: fringe(tm, X0 + 4, X1 - 4, Y1 - 4, L.metal if L.w >= 4 else M, 3)
    n = max(3, (X1 - X0) // 30); cw = (X1 - X0 - 30) / n                        # the back cushions against the wall
    for i in range(n): pad(tm, (X0 + 15 + i * cw, Y0 + 2, X0 + 15 + (i + 1) * cw - 2, Y0 + int(H * .4)), L.dye2() if i % 2 else L.dye(), r=4)
    for bx in (X0 + 3, X1 - 15):                                                 # bolsters at each end
        d.rounded_rectangle([bx, Y0 + 3, bx + 12, Y1 - 6], 6, fill=L.dye2()[2], outline=OUT); d.line([bx + 3, Y0 + 5, bx + 3, Y1 - 9], fill=L.dye2()[4])
        for ty in (Y0 + 4, Y1 - 7): d.line([bx + 2, ty, bx + 10, ty], fill=L.metal[3] if L.w >= 3 else L.dye2()[0])
    if e == FD: d.line([X0 + 4, Y1 - 1, X1 - 4, Y1 - 1], fill=L.glow[2])
    finish(tm, snap, (X0, Y0, X1, Y1), L, cloth_=True)


sdef("divan", _divan, nvar=18, front=True, clear=2, ref="Ottoman and Persian divans along the wall, 6 to 10 ft long, 2 1/2 to 3 ft deep")


def _hammockseat(tm, B, st, L, snap):
    """A hammock slung along the wall from above: the long body of it, the cords gathering to a ring at each end
    tied to its posts or hooks. The Americas: woven cotton with coloured stripes (a hamaca); Southeast Asia: a rattan
    or rope net; Africa: a net of plant fibre; Oceania: woven pandanus. Rich ones have a fringed edge (a mosquito net
    folded at the head); Modern: bright nylon; Future Darkness: a dark mesh with a lit edge. Broken: a cord gone and
    one end slumped."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx = (X0 + X1) // 2; W = X1 - X0
    tm.shade((cx - W // 3 + 4, Y0 + 20, cx + W // 3 + 6, Y1 - 16), f=.6, kind="ellipse")
    cord = L.R((206, 190, 150), 12)
    for ey, sg in ((Y0 + 3, 1), (Y1 - 3, -1)):                                  # the cords and rings
        d.ellipse([cx - 4, ey - 3, cx + 4, ey + 3], outline=L.metal[2] if e >= VI else cord[0], width=2)
        for k in range(-3, 4): d.line([cx, ey, cx + k * (W // 9), ey + sg * 20], fill=cord[1])
    by0, by1 = Y0 + 22, Y1 - 22
    body = [(cx - W // 2 + 4, by0), (cx + W // 2 - 4, by0), (cx + W // 2 - 2, (by0 + by1) // 2), (cx + W // 2 - 4, by1), (cx - W // 2 + 4, by1), (cx - W // 2 + 2, (by0 + by1) // 2)]
    kind = {"americas": "stripes", "seasia": "net", "africa": "net", "oceania": "mat"}.get(L.st, "net")
    if e >= MO: kind = "stripes"
    C = L.cover(L.paint, .3) if not L.poor else L.dye()
    if e == FD: C = L.comp
    if L.broken: body = body[:4] + [(cx - W // 2 + 10, by1 - 30), (cx - W // 2 + 4, (by0 + by1) // 2)]
    if kind == "net":
        d.polygon(body, fill=None, outline=OUT)
        for k in range(-W, W + (by1 - by0), 6):
            d.line([cx - W // 2 + 4 + k, by0, cx - W // 2 + 4 + k - (by1 - by0) // 2, by1], fill=C[3]); d.line([cx - W // 2 + 4 + k - 30, by0, cx - W // 2 + 4 + k + (by1 - by0) // 2 - 30, by1], fill=C[2])
        m = Image.new("L", tm.img.size, 255); ImageDraw.Draw(m).polygon(body, fill=0); tm.img.paste(snap, (0, 0), m)
        d.polygon(body, outline=OUT); d.line([body[0], body[5], body[4]], fill=C[1], width=2); d.line([body[1], body[2], body[3]], fill=C[1], width=2)
    else:
        d.polygon(body, fill=C[2], outline=OUT)
        if kind == "stripes":
            cols = [L.dye2(), L.R(L.S["dyes"]["gold"], 16) if not L.poor else C, C]
            for i, gx in enumerate(range(cx - W // 2 + 7, cx + W // 2 - 5, 5)): d.line([gx, by0 + 2, gx, by1 - 2], fill=cols[i % 3][2 + (i % 2)], width=2)
        else:
            for gy in range(by0 + 2, by1 - 1, 4):
                for gx in range(cx - W // 2 + 6 + (gy // 4 % 2) * 3, cx + W // 2 - 4, 6): d.line([gx, gy, gx + 3, gy], fill=C[1])
        d.line([body[0], body[5], body[4]], fill=C[4])
    if L.w >= 2: motif(tm, (cx - W // 2 + 8, (by0 + by1) // 2 - 6, cx + W // 2 - 8, (by0 + by1) // 2 + 6), L, C=L.dye2(), A=L.metal, dense=1.2)
    if L.w >= 3: fringe(tm, cx - W // 2 + 4, cx + W // 2 - 4, by1 - 1, L.dye2(), 3)
    if e == FD: d.polygon(body, outline=L.glow[2])
    era_mark(tm, (cx - W // 3, by0 + 10, cx + W // 3, by1 - 10), L, "cloth")
    if L.worn and not L.broken: wear(tm, (cx - W // 3, by0 + 10, cx + W // 3, by1 - 10), L, cloth_=True)


sdef("hammockseat", _hammockseat, nvar=20, front=False, ref="woven and net hammocks, 6 to 8 ft between the end rings, about 3 ft across")


def _deckchair(tm, B, st, L, snap):
    """A deck chair or garden chair from above: two long wooden rails with the canvas sling slung between them,
    sagging, in broad stripes, the cross bar and foot rest. Victorian and Great War: a steamer chair of teak with a
    rug over it; Mid-Century: the striped canvas deck chair, or an aluminium garden chair with webbing; Modern: a
    white plastic sun lounger; Future Darkness: a dark moulded lounger with a lit rim. From 1990 it is mass-made and the same the world over: a plastic lounger, an aluminium chair with webbing, or a shop canvas sling, in the maker's colour."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    shadow(tm, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 4)
    F = L.tw if e <= MC else (L.plastic if e == MO else L.comp)
    if e == MC and L.v.get("frame") == "metal": F = CHROME
    for rx in (X0 + 1, X1 - 6): d.rectangle([rx, Y0, rx + 5, Y1], fill=F[2], outline=OUT); d.line([rx + 1, Y0 + 1, rx + 1, Y1 - 1], fill=F[4])
    d.rectangle([X0 + 1, Y0 + 2, X1 - 1, Y0 + 7], fill=F[3], outline=OUT); d.rectangle([X0 + 1, Y1 - 10, X1 - 1, Y1 - 5], fill=F[3], outline=OUT)
    sl = (X0 + 6, Y0 + 7, X1 - 6, Y1 - 10)
    m = L.pick(["lounger", "webbing", "sling"], "model") if e >= MO else "-"
    if m == "webbing":                                                           # an aluminium folding chair with woven webbing
        for rx in (X0 + 1, X1 - 6): d.rectangle([rx, Y0, rx + 5, Y1], fill=CHROME[2], outline=OUT)
        A = L.dye() if e < FD else L.comp
        for gy in range(sl[1], sl[3], 4): d.rectangle([sl[0], gy, sl[2], gy + 2], fill=F[2], outline=F[0])
        for gx in range(sl[0] + 2, sl[2] - 1, 6): d.rectangle([gx, sl[1], gx + 2, sl[3]], fill=A[3])
    elif e >= MO and m == "lounger":                                             # moulded slats
        for gy in range(sl[1], sl[3], 5): d.rectangle([sl[0], gy, sl[2], gy + 3], fill=F[3], outline=F[0])
        pad(tm, (sl[0] + 2, sl[1] + 2, sl[2] - 2, sl[1] + (sl[3] - sl[1]) // 2), L.cover(F, .2), r=3)
    else:
        C = L.dye() if e < FD else L.comp; A = L.dye2() if not L.poor else L.R(L.S["undyed"], 14)
        if m == "sling": C, A = F, L.R((236, 236, 230), 8)                        # the shop's canvas sling in the maker's colour and white
        d.rectangle(list(sl), fill=C[2], outline=OUT)
        sw = max(3, (sl[2] - sl[0]) // 6)
        for i, gx in enumerate(range(sl[0] + 1, sl[2], sw)):                    # the canvas stripes
            if i % 2: d.rectangle([gx, sl[1] + 1, min(sl[2] - 1, gx + sw - 1), sl[3] - 1], fill=A[2])
        for gy in (sl[1] + (sl[3] - sl[1]) // 3, sl[1] + 2 * (sl[3] - sl[1]) // 3): d.line([sl[0] + 1, gy, sl[2] - 1, gy], fill=C[0])   # the sag
        if e <= GW and L.w >= 3:                                                # a travelling rug over the steamer chair
            r0 = sl[1] + (sl[3] - sl[1]) // 2; cloth(tm, sl[0] - 2, r0, sl[2] + 2, sl[3] - 2, L.R(L.mt(L.S["dyes"]["green"] if L.col != "green" else (110, 80, 50)), 14), folds="x", n=1, pattern="check")
    if e == FD: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=L.glow[2])
    finish(tm, snap, sl, L, cloth_=True)


sdef("deckchair", _deckchair, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "frame": ["wood", "metal"], "model": ["lounger", "webbing", "sling"]}, global_from=1990, front=True, clear=1,
     ref="folding deck and steamer chairs, about 2 ft wide and 4 to 5 ft long when set up")


# ---------------------------------------------------------------- bean bag and airliner seats
def _beanbag(tm, B, st, L, snap):
    """A bean bag from above: a soft sack slumped on the floor, a hollow where someone sat, creases running out from
    it and a seam round the top. Mid-Century (from 1969): vinyl or corduroy in the room's colour, a printed or
    patchwork cover in the region's cloth; Modern: a mass-made nylon or faux-suede sack, round, pear-shaped or a long
    lounger, in the maker's colour; Future Darkness: a dark sealed sack with a lit seam."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; W, H = X1 - X0, Y1 - Y0
    m = L.pick(["round", "pear", "lounger"], "model") if e >= MO else "round"
    C = (L.R(mix(L.dye()[2], L.S["paint"], .35), 18) if e == MC else L.plastic) if e < FD else L.comp
    shadow(tm, X0 + 2, Y0 + 2, X1 - 1, Y1 - 1, 4, kind="ellipse")
    if m == "lounger": pts = [(X0 + 4, Y0 + H * .2), (X1 - 6, Y0 + 2), (X1 - 1, cy), (X1 - 8, Y1 - 2), (X0 + 6, Y1 - 4), (X0 + 1, cy)]; d.polygon(pts, fill=C[2], outline=OUT)
    elif m == "pear": d.ellipse([X0 + 1, Y0 + H // 5, X1 - 1, Y1 - 1], fill=C[2], outline=OUT); d.ellipse([cx - W // 4, Y0 + 1, cx + W // 4, Y0 + H // 2], fill=C[3], outline=OUT)
    else: d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=C[2], outline=OUT)
    d.arc([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], 200, 280, fill=C[4], width=2)                                  # the light on its shoulder
    d.ellipse([cx - W // 5, cy - H // 6, cx + W // 5, cy + H // 4], fill=C[1])                              # the hollow where one sat
    for a in range(0, 360, 45):                                                                             # creases out from the hollow
        ra = math.radians(a + 20); d.line([cx + math.cos(ra) * W // 5, cy + math.sin(ra) * H // 5, cx + math.cos(ra) * W // 2.6, cy + math.sin(ra) * H // 2.6], fill=C[0])
    if e == MC:
        if L.v.get("cover") == "cord":
            for gx in range(X0 + 6, X1 - 4, 3): d.line([gx, cy - H // 3, gx, cy + H // 3], fill=C[3])
            d.ellipse([cx - W // 5, cy - H // 6, cx + W // 5, cy + H // 4], fill=C[1])
        elif L.v.get("cover") == "patch": motif(tm, (X0 + W // 5, Y0 + 5, X1 - W // 5, Y0 + H // 3), L, C=L.dye2(), A=L.metal, dense=1)
        else: d.arc([X0 + 8, Y0 + 6, X1 - 8, Y1 - 6], 210, 250, fill=WHITE[4], width=2)                   # the vinyl's shine
    if e == FD: d.arc([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 0, 360, fill=L.glow[2])
    d.ellipse([cx - 2, Y0 + 3, cx + 2, Y0 + 6], fill=C[0])                                                  # the zip pull at the seam
    wear(tm, (X0 + 4, Y0 + 4, X1 - 4, Y1 - 4), L, cloth_=True)
    if L.broken:                                                                                            # split, beans spilt
        for k in range(14): bx, by = X1 - 6 - (k * 7) % 14, Y1 - 4 + (k * 3) % 6 - 3; d.ellipse([bx, by, bx + 2, by + 2], fill=WHITE[4])


sdef("beanbag", _beanbag, nvar=24, axes={"material": MATERIALS, "colour": COLOURS, "cover": ["vinyl", "cord", "patch"], "model": ["round", "pear", "lounger"]},
     global_from=1990, front=False, ref="the Sacco bean bag of 1968 and its copies, about 2 1/2 to 3 ft across")


AIRLINES = {"grey": (110, 114, 122), "black": (50, 52, 60), "beige": (176, 160, 130), "blue": (40, 64, 120), "red": (150, 40, 40)}


def _planeseat(tm, B, st, L, snap):
    """A row of airliner seats from above, facing south: the seat backs along the north edge with their headrest
    covers, the cushions, the armrests between, belts and buckles on the seats. Three economy seats abreast, two wider
    business seats, or one first-class seat with its console. Mid-Century: the 1920s wicker chairs of the first
    airliners for the poorest, then cloth in the airline's livery with ashtrays in the armrests; Modern: grey or
    leather seats with white headrest covers; Future Darkness: dark sealed pods with lit strips. Mass-made and the
    same the world over: the airline's livery is what changes."""
    L = Look(dict(L.v, _glob=1)); d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    m = L.pick(["economy", "business", "first"], "model"); n = {"economy": 3, "business": 2, "first": 1}[m]
    C = L.R(mix(AIRLINES[L.pick(list(AIRLINES), "airline")], L.dye()[2], .25), 16) if e < FD else L.comp
    shadow(tm, X0, Y0, X1, Y1, 4)
    d.rectangle([X0, Y1 - 4, X1, Y1], fill=(60, 62, 66), outline=OUT)                      # the seat track on the floor
    aw = 4 if m == "economy" else 7; sw = (W - aw * (n + 1)) / n
    for i in range(n):
        x0 = int(X0 + aw + i * (sw + aw)); x1 = int(x0 + sw)
        if e == MC and L.w <= 1:                                                           # a wicker chair of the first airliners
            weave(tm, (x0, Y0 + 2, x1, Y1 - 6), L.R((196, 170, 110), 14), 3); d.arc([x0, Y0, x1, Y0 + 14], 180, 360, fill=OUT, width=4)
            continue
        pad(tm, (x0, Y0 + 2, x1, Y0 + int(H * .32)), C, r=3, dimple=False)                 # the seat back's top, seen from above
        if e < FD: d.rectangle([x0 + 3, Y0 + 3, x1 - 3, Y0 + 8], fill=WHITE[4] if e == MO or L.w >= 3 else L.dye2()[3], outline=WHITE[1])   # the headrest cover
        pad(tm, (x0 + 1, Y0 + int(H * .32) - 2, x1 - 1, Y1 - 6), C, r=4, buttons=m == "first")
        if e == MC and m != "first":                                                      # the airline's woven check of the day
            for k, yy in enumerate(range(Y0 + int(H * .36), Y1 - 8, 4)): d.line([x0 + 3, yy, x1 - 3, yy], fill=(L.dye2() if k % 2 else C)[1], width=2)
        if e == MO:                                                                        # the slimline seat's moulded grey shell round the back
            d.rectangle([x0, Y0 + 1, x1, Y0 + 4], fill=(70, 72, 78), outline=OUT); d.line([x0, Y0 + 1, x0, Y0 + int(H * .32)], fill=(70, 72, 78), width=3); d.line([x1, Y0 + 1, x1, Y0 + int(H * .32)], fill=(70, 72, 78), width=3)
        by = Y0 + int(H * .7); d.line([x0 + 2, by, x1 - 2, by], fill=(60, 60, 64), width=2); d.rectangle([(x0 + x1) // 2 - 2, by - 2, (x0 + x1) // 2 + 2, by + 2], fill=CHROME[4], outline=OUT)   # the belt and buckle
        if e == FD: d.line([x0 + 2, Y0 + 3, x1 - 2, Y0 + 3], fill=L.glow[2])
    for i in range(n + 1):                                                                 # the armrests
        ax = int(X0 + i * (sw + aw)); d.rectangle([ax, Y0 + int(H * .3), ax + aw, Y1 - 8], fill=(70, 72, 78) if e < FD else L.comp[0], outline=OUT)
        if e == MC and 0 < i < n: d.ellipse([ax, Y1 - 14, ax + aw, Y1 - 10], fill=CHROME[3])   # the ashtray lid
        if m == "first" and i == n: d.rectangle([ax - 2, Y0 + int(H * .3), ax + aw, Y1 - 8], fill=L.R((150, 120, 90), 14)[2], outline=OUT)   # the console
    finish(tm, snap, B, L, cloth_=True, corner=0)


sdef("planeseat", _planeseat, nvar=21, axes={"material": MATERIALS, "colour": COLOURS, "model": ["economy", "business", "first"], "airline": list(AIRLINES)},
     global_from=1919, front=True, clear=2.5, ref="airliner seat rows: three economy seats about 5 ft wide and 2 1/2 ft deep, after Boeing and Douglas cabin plans")
