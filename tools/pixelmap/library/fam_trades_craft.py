"""Trades and crafts, part one (B6346): the smith's, weaver's, potter's, joiner's, butcher's, brewer's, miller's,
printer's, tailor's and apothecary's gear, the market stall and the handcart, musical instruments, and the farm's
hives, coops, sties, hay, firewood, ploughs, tractors, stalls, mangers and saddle racks.

Every drawing takes the footprint in squares (x, y, w, h) on a scratch map, front toward the south, the state and the
variation. The variation carries the era (its form and making), the wealth (rough and patched, sound and plain, or
carved, gilt and dyed), the regional style (its own woods, paints, patterns and, where a people made the thing
another way, its own form) and the condition (new, worn: faded with scuffs and patches, broken: split, cracked,
tilted or spilt). Everything stays inside the footprint; shadows fall a few pixels south-east."""
import math
import zlib

import numpy as np

from px import OUT
from library.art import (P, mix, ramp, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW)
from library.census import ERAS
from library.core import define, spec

ERA_KEYS = [k for k, _, _, _ in ERAS]
EI = {k: i for i, k in enumerate(ERA_KEYS)}
_AGE_ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century", "modern": "modern",
            "Future Darkness": "future-darkness"}
STAGE = ["M", "M", "E", "E", "V", "W", "W", "N", "F"]        # medieval, early modern, Victorian, wartime and mid-century, now (Modern), Future

# ---------------------------------------------------------------- materials
R_ = ramp
COPPER = R_((176, 96, 60), 22)
TIN = R_((168, 172, 170), 16)
RUST = R_((130, 70, 44), 16)
STONE = R_((150, 146, 138), 18, (0, 0, 4))
SAND = R_((196, 172, 120), 16)
CLAY = R_((176, 104, 66), 18)
BUFF = R_((204, 176, 130), 14)
STRAW = R_((196, 166, 86), 18)
HAY = R_((170, 160, 80), 18)
MUD = R_((104, 80, 58), 14)
EARTH = R_((92, 74, 58), 12)
LEATHER = R_((120, 72, 44), 16)
HIDE = R_((176, 140, 100), 16)
BLACK = R_((44, 42, 48), 12)
ENAMEL_W = R_((222, 222, 214), 10)
CHROME = R_((176, 184, 192), 22)
PINK = R_((214, 150, 140), 14)
BARK = R_((92, 70, 56), 12)
BIRCH = R_((214, 210, 196), 12)
GREEN_PAINT = R_((64, 112, 72), 18)
WATER = [(30, 52, 96), (38, 74, 120), (52, 98, 140), (84, 136, 164), (168, 208, 214)]

# the thirteen style families: wood, paint or dye, second colour, metal, cloth, clay, straw, pattern
STY = {
    "central":       dict(wood=R_((176, 128, 70), 18), acc=R_((66, 118, 78), 18), acc2=R_((170, 52, 44), 18), metal=IRON, cloth=R_((150, 52, 44), 18), clay=CLAY, straw=STRAW, pat="flowers"),
    "atlantic":      dict(wood=R_((130, 66, 52), 16), acc=R_((52, 70, 124), 18), acc2=R_((196, 180, 140), 12), metal=IRON, cloth=R_((60, 84, 70), 16), clay=R_((150, 120, 96), 16), straw=STRAW, pat="check"),
    "northern":      dict(wood=R_((214, 196, 156), 14), acc=R_((160, 46, 40), 20), acc2=R_((52, 84, 150), 20), metal=IRON, cloth=R_((52, 84, 150), 18), clay=R_((140, 110, 90), 16), straw=R_((176, 156, 96), 16), pat="rose"),
    "mediterranean": dict(wood=R_((78, 58, 52), 14), acc=R_((200, 110, 64), 18), acc2=R_((228, 222, 204), 10), metal=IRON, cloth=R_((206, 182, 120), 14), clay=R_((196, 108, 66), 18), straw=STRAW, pat="tile"),
    "islamic":       dict(wood=R_((156, 100, 48), 16), acc=R_((46, 150, 150), 20), acc2=R_((228, 214, 170), 12), metal=COPPER, cloth=R_((150, 36, 48), 18), clay=R_((190, 150, 110), 16), straw=STRAW, pat="star"),
    "steppe":        dict(wood=R_((204, 112, 46), 20), acc=R_((172, 36, 40), 20), acc2=R_((60, 100, 170), 18), metal=IRON, cloth=R_((222, 210, 180), 12), clay=R_((150, 110, 80), 16), straw=R_((180, 168, 110), 14), pat="knot"),
    "southasia":     dict(wood=R_((112, 92, 36), 16), acc=R_((222, 150, 40), 22), acc2=R_((180, 40, 80), 18), metal=BRASS, cloth=R_((220, 140, 40), 20), clay=R_((176, 96, 62), 18), straw=STRAW, pat="paisley"),
    "eastasia":      dict(wood=R_((156, 36, 36), 18), acc=R_((40, 36, 42), 12), acc2=R_((60, 90, 170), 18), metal=IRON, cloth=R_((70, 90, 150), 16), clay=R_((214, 214, 204), 10), straw=R_((200, 184, 120), 14), pat="fret"),
    "seasia":        dict(wood=R_((206, 190, 110), 16), acc=R_((54, 60, 120), 18), acc2=R_((140, 80, 44), 16), metal=BRASS, cloth=R_((140, 90, 50), 16), clay=CLAY, straw=R_((206, 186, 120), 14), pat="batik"),
    "africa":        dict(wood=R_((56, 40, 36), 12), acc=R_((214, 170, 40), 22), acc2=R_((60, 120, 60), 18), metal=IRON, cloth=R_((200, 150, 50), 20), clay=R_((150, 80, 52), 16), straw=R_((180, 150, 90), 14), pat="kente"),
    "americas":      dict(wood=R_((200, 120, 110), 16), acc=R_((48, 140, 140), 20), acc2=R_((176, 56, 40), 20), metal=IRON, cloth=R_((176, 56, 40), 18), clay=R_((186, 120, 80), 16), straw=STRAW, pat="step"),
    "oceania":       dict(wood=R_((120, 120, 104), 14), acc=R_((222, 206, 168), 10), acc2=R_((70, 44, 34), 12), metal=IRON, cloth=R_((216, 196, 156), 12), clay=CLAY, straw=R_((190, 170, 110), 14), pat="tapa"),
    "polar":         dict(wood=R_((176, 180, 178), 14), acc=R_((226, 220, 200), 10), acc2=R_((150, 60, 50), 16), metal=IRON, cloth=R_((176, 150, 116), 14), clay=R_((120, 120, 118), 14), straw=R_((170, 160, 120), 12), pat="bead"),
}
# where a style's own paint and machine colours differ for factory-made things (tractors, sewing machines, modern goods)
PAINT = {"central": (50, 110, 60), "atlantic": (150, 150, 146), "northern": (176, 40, 36), "mediterranean": (220, 120, 40), "islamic": (30, 120, 110),
         "steppe": (60, 80, 170), "southasia": (220, 190, 40), "eastasia": (190, 50, 70), "seasia": (150, 200, 120), "africa": (110, 60, 150),
         "americas": (230, 228, 218), "oceania": (90, 180, 230), "polar": (120, 64, 34)}
GLOWS = {s: [mix(tuple(c), (20, 20, 28), .6), tuple(c), mix(tuple(c), (255, 255, 255), .55)] for s, c in
         {"central": (90, 220, 140), "atlantic": (120, 170, 255), "northern": (255, 90, 80), "mediterranean": (255, 170, 70), "islamic": (70, 230, 220),
          "steppe": (140, 120, 255), "southasia": (255, 210, 70), "eastasia": (255, 70, 110), "seasia": (150, 255, 120), "africa": (220, 120, 255),
          "americas": (80, 255, 200), "oceania": (90, 220, 255), "polar": (220, 240, 255)}.items()}
DYES = {"blue": R_((44, 64, 140), 18), "red": R_((160, 40, 40), 18), "yellow": R_((206, 170, 50), 18), "green": R_((60, 120, 70), 18),
        "brown": R_((110, 74, 46), 14), "black": R_((44, 40, 48), 10), "white": R_((222, 216, 200), 10), "purple": R_((110, 50, 110), 18),
        "orange": R_((214, 120, 40), 20), "undyed": R_((196, 184, 156), 12)}


def _lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]


def _clip(c): return tuple(int(max(0, min(255, v))) for v in c)


# the age's own cast over every material, between two ages drawn in the same forms: the Long Night's smoke, neglect and
# plague-year grime; the Age of Reason's lighter polished woods and bright brass; the Great War's dark stains and drab
ERA_TONE = {1: (-24, -14, 12), 3: (24, 12, -14), 5: (-10, -4, -26), 6: (14, 10, 0), 7: (-8, 4, 18), 8: (-22, -18, -6)}


class K:
    """One drawing's context: the box in pixels, the era, wealth, style and condition, and the drawing tools."""

    def __init__(s, tm, x, y, w, h, st, v):
        s.tm, s.d, s.st, s.v = tm, tm.d, st, v
        era = v.get("era") or _AGE_ERA.get(v.get("age"), "dark-ages")
        s.era = era; s.e = EI[era]; s.stage = STAGE[s.e]
        s.wealth = int(v.get("wealth", 2)); s.style = v.get("style") or "central"; s.cond = v.get("condition", "new")
        s.S = STY.get(s.style, STY["central"])
        s.X0, s.Y0, s.X1, s.Y1 = box_px(x, y, w, h, 2); s.W, s.H = s.X1 - s.X0, s.Y1 - s.Y0
        s.cx, s.cy = (s.X0 + s.X1) / 2, (s.Y0 + s.Y1) / 2
        s.rng = np.random.default_rng(zlib.crc32(f"{v.get('vid', '')}|{s.style}|{s.wealth}|{s.cond}|{st}".encode()))
        s.glow = GLOWS.get(s.style, GLOWS["central"])
        if "style" not in v and v.get("livery") in LIVERY:                                  # a maker's lit trim in its own livery colour
            c = _clip(tuple(x * 1.3 + 40 for x in LIVERY[v["livery"]])); s.glow = [mix(c, (20, 20, 28), .6), c, mix(c, (255, 255, 255), .55)]
        s._pc = {}

    # positions as fractions of the box
    def fx(s, t): return s.X0 + t * s.W

    def fy(s, t): return s.Y0 + t * s.H

    # colours: the household's means and the thing's upkeep change every material
    def c(s, C):
        key = tuple(tuple(c) for c in C)
        if key in s._pc: return s._pc[key]
        des = {0: .5, 1: .3}.get(s.wealth, 0); sat = {4: .2, 5: .34}.get(s.wealth, 0)
        tone = ERA_TONE.get(s.e)
        out = []
        for col in C:
            l = _lum(col); g = (l * 1.04 + 4, l * .98, l * .88)
            col = mix(col, _clip(g), des) if des else col
            if sat: col = _clip(tuple(col[i] + (col[i] - l) * sat for i in range(3)))
            if tone: col = _clip((col[0] + tone[0], col[1] + tone[1], col[2] + tone[2]))
            if s.cond == "worn": col = mix(col, _clip((l * .8 + 48, l * .8 + 46, l * .8 + 40)), .32)
            elif s.cond == "broken": col = mix(col, _clip((l * .62, l * .6, l * .6)), .3)
            out.append(col)
        s._pc[key] = out; return out

    def m(s, name): return s.c(s.S[name])

    @property
    def wood(s): return s.m("wood")

    @property
    def acc(s): return s.m("acc")

    @property
    def acc2(s): return s.m("acc2")

    @property
    def metal(s):
        if s.wealth >= 4 and s.stage in "ME" and s.S["metal"] is IRON: return s.c(BRASS)
        return s.c(s.S["metal"])

    @property
    def glob(s): return "style" not in s.v and ("livery" in s.v or "make" in s.v)

    @property
    def make(s):
        """The maker's model, where the thing looks the same the world over (else None)."""
        return s.v.get("make") if s.glob else None

    @property
    def paint(s):
        """The paint of a made thing: a maker's livery where it looks the same the world over, else the land's own paint."""
        if s.glob: return s.c(R_(LIVERY.get(s.v.get("livery"), LIVERY["grey"]), 20))
        return s.c(R_(PAINT[s.style], 20))

    @property
    def comp(s):
        """Future Darkness composite, a dark grey leaning to the style's own colour."""
        base = LIVERY.get(s.v.get("livery"), LIVERY["grey"]) if s.glob else PAINT[s.style]
        return s.c(R_(mix((58, 64, 74), base, .45), 14))

    @property
    def rich(s): return s.wealth >= 4

    @property
    def poor(s): return s.wealth <= 1

    # drawing tools (pixels)
    def sh(s, x0, y0, x1, y1, off=4, kind="rect"):
        s.tm.shade((x0 + off - 1, y0 + off, x1 + off, y1 + off + 1), f=.56, kind=kind)

    def rect(s, x0, y0, x1, y1, C, out=OUT, bevel=True, lv=2):
        d = s.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        if x1 < x0: x0, x1 = x1, x0
        if y1 < y0: y0, y1 = y1, y0
        d.rectangle([x0, y0, x1, y1], fill=C[lv], outline=out)
        if bevel and x1 - x0 > 4 and y1 - y0 > 4:
            d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[min(4, lv + 2)]); d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=C[min(4, lv + 1)])
            d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=C[max(0, lv - 2)]); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=C[max(0, lv - 1)])

    def rrect(s, x0, y0, x1, y1, r, C, out=OUT, lv=2):
        d = s.d; d.rounded_rectangle([int(x0), int(y0), int(x1), int(y1)], int(r), fill=C[lv], outline=out)
        if x1 - x0 > 2 * r + 4: d.line([x0 + r, y0 + 1, x1 - r, y0 + 1], fill=C[min(4, lv + 2)]); d.line([x0 + r, y1 - 1, x1 - r, y1 - 1], fill=C[max(0, lv - 2)])

    def disc(s, cx, cy, rx, ry=None, C=None, out=OUT, lv=2):
        ry = rx if ry is None else ry; d = s.d
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C[lv], outline=out)
        if rx > 4 and ry > 4:
            d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 190, 260, fill=C[min(4, lv + 2)])
            d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 10, 80, fill=C[max(0, lv - 2)])

    def bar(s, x0, y0, x1, y1, C, w=3, out=OUT):
        """A pole, leg or handle: dark edge, body, a lit line on its north-west side."""
        d = s.d
        if out: d.line([x0, y0, x1, y1], fill=out, width=w + 2)
        d.line([x0, y0, x1, y1], fill=C[2], width=w)
        if w >= 3:
            dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
            if nx + ny > 0: nx, ny = -nx, -ny
            o = max(1, w // 2 - 1) if w > 3 else 1
            d.line([x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o], fill=C[4])

    def poly(s, pts, C, out=OUT, lv=2): s.d.polygon([(int(a), int(b)) for a, b in pts], fill=C[lv], outline=out)

    def blob(s, cx, cy, rx, ry, C, n=7, out=OUT, lv=2, jit=.18):
        """A soft lumpy shape (hay, wool, a heap of earth), lit north-west."""
        pts = []
        for k in range(n * 3):
            a = 2 * math.pi * k / (n * 3); j = 1 + jit * math.sin(a * n + cx * .1)
            pts.append((cx + math.cos(a) * rx * j, cy + math.sin(a) * ry * j))
        s.poly(pts, C, out, lv)
        s.d.ellipse([cx - rx * .7, cy - ry * .75, cx + rx * .1, cy - ry * .05], fill=C[min(4, lv + 1)])

    def strokes(s, x0, y0, x1, y1, C, n, ang=None, ln=(5, 10), idx=(1, 3, 4)):
        """Short strokes (straw, grain, fibres) scattered over a box."""
        d = s.d; r = s.rng
        for _ in range(int(n)):
            px_, py_ = r.uniform(x0, x1), r.uniform(y0, y1); a = r.uniform(0, math.pi) if ang is None else ang + r.uniform(-.35, .35)
            L = r.uniform(*ln); d.line([px_, py_, px_ + math.cos(a) * L, py_ + math.sin(a) * L], fill=C[idx[int(r.integers(0, len(idx)))]])

    def pattern(s, x0, y0, x1, y1, key=None, A=None, B=None, bg=None):
        """The style's own pattern over a box: flowers, check, rosemaling scrolls, tiles, stars, knots, paisley, fret,
        batik, kente, step fret, tapa or beadwork."""
        if key is None and s.glob: return                                       # a mass-made thing carries no people's pattern
        d = s.d; key = key or s.S["pat"]; A = A or s.acc; B = B or s.acc2
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        if x1 - x0 < 6 or y1 - y0 < 6: return
        if bg: d.rectangle([x0, y0, x1, y1], fill=bg[2])
        W, H = x1 - x0, y1 - y0
        if key == "flowers":
            for gy in range(y0 + 5, y1 - 3, 12):
                for gx in range(x0 + 5 + (gy // 12 % 2) * 6, x1 - 3, 12):
                    for a in range(0, 360, 90): d.ellipse([gx + 3 * math.cos(math.radians(a)) - 2, gy + 3 * math.sin(math.radians(a)) - 2, gx + 3 * math.cos(math.radians(a)) + 2, gy + 3 * math.sin(math.radians(a)) + 2], fill=B[3])
                    d.rectangle([gx - 1, gy - 1, gx + 1, gy + 1], fill=BRASS[4])
        elif key == "check":
            for gx in range(x0, x1, 10): d.rectangle([gx, y0, min(x1, gx + 3), y1], fill=A[2])
            for gy in range(y0, y1, 10): d.rectangle([x0, gy, x1, min(y1, gy + 3)], fill=A[1])
            for gx in range(x0 + 6, x1, 10): d.line([gx, y0, gx, y1], fill=B[3])
        elif key == "rose":
            for gx in range(x0 + 2, x1 - 6, 14):
                for gy in range(y0 + 2, y1 - 6, 14):
                    d.arc([gx, gy, gx + 12, gy + 12], 180, 360, fill=A[3], width=2); d.arc([gx + 3, gy + 4, gx + 11, gy + 12], 0, 180, fill=B[3], width=2)
                    d.rectangle([gx + 5, gy + 5, gx + 7, gy + 7], fill=WHITE[3])
        elif key == "tile":
            s_ = 12
            for i, gy in enumerate(range(y0, y1 - 2, s_)):
                for j, gx in enumerate(range(x0, x1 - 2, s_)):
                    d.rectangle([gx, gy, min(x1, gx + s_ - 1), min(y1, gy + s_ - 1)], fill=(B if (i + j) % 2 else A)[2], outline=A[0])
                    if (i + j) % 2: d.polygon([(gx + 6, gy + 2), (gx + 10, gy + 6), (gx + 6, gy + 10), (gx + 2, gy + 6)], fill=A[3])
        elif key == "star":
            for gy in range(y0 + 7, y1 - 3, 14):
                for gx in range(x0 + 7 + (gy // 14 % 2) * 7, x1 - 3, 14):
                    d.rectangle([gx - 4, gy - 4, gx + 4, gy + 4], fill=A[2]); d.polygon([(gx, gy - 6), (gx + 6, gy), (gx, gy + 6), (gx - 6, gy)], fill=A[3])
                    d.rectangle([gx - 1, gy - 1, gx + 1, gy + 1], fill=B[4])
        elif key == "knot":
            for gx in range(x0, x1, 10):
                for gy in range(y0, y1, 10):
                    d.polygon([(gx + 5, gy), (gx + 10, gy + 5), (gx + 5, gy + 10), (gx, gy + 5)], outline=A[2])
                    d.rectangle([gx + 4, gy + 4, gx + 6, gy + 6], fill=B[3])
        elif key == "paisley":
            for gy in range(y0 + 6, y1 - 4, 13):
                for gx in range(x0 + 6 + (gy // 13 % 2) * 6, x1 - 4, 13):
                    d.ellipse([gx - 4, gy - 3, gx + 3, gy + 4], fill=A[3]); d.line([gx + 2, gy - 3, gx + 5, gy - 6], fill=A[3], width=2)
                    d.ellipse([gx - 2, gy - 1, gx + 1, gy + 2], fill=B[2])
        elif key == "fret":
            for gy in range(y0 + 2, y1 - 6, 12):
                for gx in range(x0 + 2, x1 - 8, 12):
                    d.line([(gx, gy + 8), (gx, gy), (gx + 8, gy), (gx + 8, gy + 6), (gx + 3, gy + 6), (gx + 3, gy + 3)], fill=A[3] if A[2][0] > 80 else BRASS[3], width=2)
        elif key == "batik":
            for gy in range(y0 + 4, y1 - 2, 9):
                pts = [(gx, gy + 3 * math.sin((gx - x0) / 5)) for gx in range(x0 + 1, x1, 2)]
                d.line(pts, fill=A[2], width=2)
                for gx in range(x0 + 4, x1 - 2, 9): d.ellipse([gx - 1, gy + 3, gx + 1, gy + 5], fill=B[3])
        elif key == "kente":
            cols = [A, B, s.c(R_((150, 40, 36), 18)), BLACK]
            for i, gx in enumerate(range(x0, x1, 9)):
                for j, gy in enumerate(range(y0, y1, 9)):
                    C = cols[(i + j * 2) % len(cols)]
                    if (i + j) % 2: d.rectangle([gx, gy, min(x1, gx + 8), min(y1, gy + 8)], fill=C[2])
                    else:
                        for k in range(gy, min(y1, gy + 9), 3): d.line([gx, k, min(x1, gx + 8), k], fill=C[3])
        elif key == "step":
            for gy in range(y0 + 1, y1 - 6, 12):
                pts = []; gx = x0
                while gx < x1:
                    pts += [(gx, gy + 8), (gx, gy + 4), (gx + 4, gy + 4), (gx + 4, gy), (gx + 8, gy), (gx + 8, gy + 4), (gx + 12, gy + 4), (gx + 12, gy + 8)]; gx += 12
                d.line([(min(px_, x1), py_) for px_, py_ in pts], fill=A[2], width=2)
                for gx in range(x0 + 6, x1 - 2, 12): d.rectangle([gx - 1, gy + 9, gx + 1, gy + 10], fill=B[2])
        elif key == "tapa":
            for i, gy in enumerate(range(y0, y1 - 4, 10)):
                for gx in range(x0, x1 - 4, 10):
                    d.polygon([(gx, gy + 9), (gx + 5, gy + 1), (gx + 10, gy + 9)], fill=B[2] if i % 2 else B[1])
                d.line([x0, gy + 9, x1, gy + 9], fill=B[0])
        elif key == "bead":
            for gy in range(y0 + 3, y1 - 2, 8):
                for k, gx in enumerate(range(x0 + 3, x1 - 2, 6)):
                    d.rectangle([gx - 2, gy - 2, gx + 2, gy + 2], fill=(B if k % 3 == 0 else A)[3 if k % 3 else 2])

    def inlay(s, x0, y0, x1, y1, wd=7):
        """A rich thing's inlaid or painted border: the style's pattern in a band round all four edges."""
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        if s.glob:                                                              # a maker's chrome or brass trim instead
            s.d.rectangle([x0, y0, x1, y1], outline=s.c(CHROME)[3], width=2); s.d.rectangle([x0 + 4, y0 + 4, x1 - 4, y1 - 4], outline=s.c(CHROME)[2]); return
        for bx in ((x0, y0, x1, y0 + wd), (x0, y1 - wd, x1, y1), (x0, y0 + wd, x0 + wd, y1 - wd), (x1 - wd, y0 + wd, x1, y1 - wd)):
            s.d.rectangle(bx, fill=s.acc[1]); s.pattern(*bx)
        s.d.rectangle([x0, y0, x1, y1], outline=s.c(BRASS)[3])

    def studs(s, x0, y0, x1, y1, C=None, step=14):
        """Brass or gilt studs round a rich thing's edge."""
        C = C or s.c(BRASS)
        for gx in range(int(x0) + 4, int(x1) - 2, step):
            for gy in (int(y0) + 3, int(y1) - 3): s.d.rectangle([gx - 1, gy - 1, gx + 1, gy + 1], fill=C[3]); s.d.point((gx - 1, gy - 1), fill=C[4])

    def ornament(s, x0, y0, x1, y1):
        """What the household's means add: gilt edging and inlay for the rich, rope lashing and a patch for the poor."""
        d = s.d
        if s.wealth >= 4:
            g = s.c(BRASS); d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], outline=g[3])
            if s.wealth >= 5: d.rectangle([x0 + 6, y0 + 6, x1 - 6, y1 - 6], outline=g[2]); s.studs(x0, y0, x1, y1, step=10)
            else: s.studs(x0, y0, x1, y1)
        elif s.wealth <= 1:
            rope = s.c(R_((170, 150, 108), 14))
            for gx in (x0 + (x1 - x0) * .3, x0 + (x1 - x0) * .72):
                d.line([gx, y0 + 1, gx + 3, y1 - 1], fill=rope[1], width=3); d.line([gx + 1, y0 + 1, gx + 4, y1 - 1], fill=rope[3])
            if s.wealth == 0: s.rect(x0 + (x1 - x0) * .45, y0 + (y1 - y0) * .3, x0 + (x1 - x0) * .62, y0 + (y1 - y0) * .62, s.c(R_((110, 96, 80), 12)))

    def wear(s, x0, y0, x1, y1, C=None):
        """Worn: scuffs and a chipped corner. Broken: a crack across and splinters (the caller adds its own breakage)."""
        d = s.d; r = s.rng; C = C or s.wood; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        if x1 - x0 < 8 or y1 - y0 < 8: return
        if s.cond in ("worn", "broken"):                                                     # grime and stains in soft blotches
            for _ in range(3 if s.cond == "worn" else 2):
                bw, bh = r.uniform(.25, .45) * (x1 - x0), r.uniform(.3, .55) * (y1 - y0); bx, by = r.uniform(x0, x1 - bw), r.uniform(y0, y1 - bh)
                s.grime(bx, by, bx + bw, by + bh)
        if s.cond == "worn":
            for _ in range(4):
                px_, py_ = r.uniform(x0 + 2, max(x0 + 3, x1 - 8)), r.uniform(y0 + 2, max(y0 + 3, y1 - 4)); d.line([px_, py_, px_ + r.uniform(4, 9), py_ + r.uniform(-1, 1)], fill=C[4], width=2)
            d.polygon([(x1 - 1, y1 - 7), (x1 - 1, y1 - 1), (x1 - 7, y1 - 1)], fill=C[0])
        elif s.cond == "broken":
            pts = [(x0 + (x1 - x0) * .2, y0 + 1)]
            for k in range(1, 5): pts.append((x0 + (x1 - x0) * (.2 + .15 * k) + r.uniform(-4, 4), y0 + (y1 - y0) * k / 4))
            d.line(pts, fill=OUT, width=2); d.line([(a + 1, b) for a, b in pts], fill=C[0])
            for a, b in pts[1:3]: d.line([a, b, a + 6, b - 3], fill=C[4])

    def grime(s, x0, y0, x1, y1, f=.64):
        """Darken an oval of the thing itself (never the floor round it): a stain or a patch of grime."""
        from PIL import Image as _I
        img = s.tm.img; W_, H_ = img.size
        x0, y0, x1, y1 = max(0, int(x0)), max(0, int(y0)), min(W_, int(x1)), min(H_, int(y1))
        if x1 - x0 < 3 or y1 - y0 < 3: return
        bg = np.array(img.getpixel((1, 1)), np.float32)
        a = np.asarray(img.crop((x0, y0, x1, y1))).astype(np.float32)
        yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0]
        oval = ((xx - (x1 - x0) / 2) / ((x1 - x0) / 2)) ** 2 + ((yy - (y1 - y0) / 2) / ((y1 - y0) / 2)) ** 2 <= 1
        floor = np.zeros(oval.shape, bool)
        for g in (1.0, .56):
            ref = bg * np.array([g * .94, g * .96, g * 1.06]) if g != 1 else bg
            floor |= np.abs(a - ref).sum(2) < 10
        m = oval & ~floor
        a[m] = a[m] * np.array([f * .96, f * .95, f * .98])
        img.paste(_I.fromarray(a.clip(0, 255).astype(np.uint8)), (x0, y0))

    def glowline(s, x0, y0, x1, y1, w=2): s.d.line([x0, y0, x1, y1], fill=s.glow[1], width=w)

    def future_shell(s, x0, y0, x1, y1, r=6):
        """Future Darkness: a dark sealed composite shell, its edge lit in the style's colour, a little grime."""
        s.rrect(x0, y0, x1, y1, r, s.comp); s.d.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], max(1, r - 2), outline=s.glow[1])
        rr = s.rng
        for _ in range(3):
            gx, gy = rr.uniform(x0 + 6, x1 - 10), rr.uniform(y0 + 6, y1 - 6); s.d.ellipse([gx, gy, gx + 7, gy + 3], fill=s.comp[0])

    def fire(s, cx, cy, w, h, lit=True, glow=80):
        if lit:
            s.tm.fire(int(cx), int(cy), max(3, int(w)), max(2, int(h)), seed=int(s.rng.integers(0, 99)))
            s.tm.hearths = getattr(s.tm, "hearths", []) + [(int(cx), int(cy), glow, None)]
        else:
            s.d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=(40, 34, 34), outline=OUT)
            for k in range(3): s.d.ellipse([cx - w + k * w * .6, cy - 2, cx - w + k * w * .6 + 4, cy + 2], fill=(90, 86, 84))


def looks_for(a, b):
    from library.variants import ERA_AGE
    return tuple((max(ea, a), min(eb, b), lab, {"era": k, "age": ERA_AGE[k]}) for k, ea, eb, lab in ERAS if ea <= b and eb >= a)


def reg(oid, fn, axes, **kw):
    """Define or take over an object, with a look for each census era it spans (so a map's year picks its era)."""
    sp = define(oid, draw=fn, axes=axes, **kw)
    sp.looks = looks_for(*sp.eras)
    return sp


def dz(v, key, default): return v.get(key, default)


# ---------------------------------------------------------------- small shared things
PAINTED = ("central", "northern", "steppe")                      # where folk painting went onto wheels, churns and the like
PAINTED_CARTS = ("mediterranean", "southasia", "central", "northern", "islamic", "steppe")   # Sicilian carts, truck and cart painting
LIVERY = {"red": (170, 40, 36), "green": (50, 110, 60), "blue": (50, 80, 160), "grey": (130, 134, 136), "orange": (214, 120, 40),
          "yellow": (214, 180, 40), "cream": (220, 210, 180), "black": (44, 42, 48), "white": (226, 226, 220), "brown": (120, 80, 50)}
EURO = ("central", "atlantic", "northern", "mediterranean", "americas", "oceania", "polar")


def bucket(k, cx, cy, r, C=None, fill=WATER, hoops=None):
    """A staved bucket or tub from above: rim, hoops, what it holds."""
    C = C or k.wood; d = k.d
    k.sh(cx - r, cy - r, cx + r, cy + r, 3, "ellipse")
    k.disc(cx, cy, r, r, C)
    d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(fill or C)[1 if fill else 0], outline=C[0])
    if fill is WATER: d.arc([cx - r + 5, cy - r + 5, cx + r - 6, cy + r - 6], 200, 250, fill=WATER[4])
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(hoops or k.c(IRON))[1])


def pot(k, cx, cy, r, C=None, fill=None, lid=False):
    """A clay pot or jar from above: its round shoulder and the dark mouth (or a lid)."""
    C = C or k.m("clay"); d = k.d
    k.sh(cx - r, cy - r, cx + r, cy + r, 3, "ellipse"); k.disc(cx, cy, r, r, C)
    mr = max(2, int(r * .5))
    if lid: k.disc(cx, cy, mr + 1, mr + 1, k.wood)
    else: d.ellipse([cx - mr, cy - mr, cx + mr, cy + mr], fill=(fill[1] if fill else C[0]), outline=C[0])


def hammer(k, x, y, ang, L=14, head=None, hs=3):
    """A hammer lying flat: a wooden haft and a small iron head across its end."""
    ca, sa = math.cos(ang), math.sin(ang)
    k.bar(x, y, x + ca * L, y + sa * L, k.c(R_((160, 120, 76), 16)), 2)
    hx, hy = x + ca * L, y + sa * L; H = head or k.c(IRON)
    k.d.polygon([(hx - sa * hs * 1.6 - ca * hs * .6, hy + ca * hs * 1.6 - sa * hs * .6), (hx + sa * hs * 1.6 - ca * hs * .6, hy - ca * hs * 1.6 - sa * hs * .6),
                 (hx + sa * hs * 1.6 + ca * hs * .6, hy - ca * hs * 1.6 + sa * hs * .6), (hx - sa * hs * 1.6 + ca * hs * .6, hy + ca * hs * 1.6 + sa * hs * .6)], fill=H[3], outline=OUT)


def straw_mass(k, x0, y0, x1, y1, C, n=None, ang=None):
    k.strokes(x0, y0, x1, y1, C, n or (x1 - x0) * (y1 - y0) / 14, ang=ang, ln=(4, 9))


def sack(k, cx, cy, w, h, C, tie=True):
    d = k.d; k.sh(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, 3, "ellipse")
    d.rounded_rectangle([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], int(min(w, h) * .4), fill=C[2], outline=OUT)
    d.line([cx - w * .3, cy - h * .32, cx + w * .2, cy - h * .32], fill=C[4]); d.line([cx - w * .2, cy + h * .2, cx + w * .3, cy + h * .25], fill=C[0])
    if tie: d.rectangle([cx + w / 2 - 4, cy - 2, cx + w / 2 + 1, cy + 2], fill=C[1], outline=OUT)


# ---------------------------------------------------------------- the smithy
def anvil(tm, x, y, w, h, st, v):
    """An anvil on its block, the quench pot beside it. Dark Ages and Long Night: a squat block anvil with a short beak
    on a round oak stump; Renaissance on: the horned anvil on a squared block; Victorian: the London-pattern anvil,
    on a cast-iron stand in better shops; 20th century and Modern: a steel stand painted; Future Darkness: a composite
    stand with a lit edge. Asian and Islamic smiths use a square block anvil, African smiths a stone or an iron block
    set in the ground. Rich: a bright polished face and a rack of tools; poor: a small rusty anvil, a rope-bound stump.
    Broken: the horn snapped and lying by the block."""
    k = K(tm, x, y, w, h, st, v); d = k.d; S = k.style; stg = k.stage
    iron = k.c(RUST if (k.poor and k.cond != "new") else IRON)
    bcx, bcy = k.fx(.44), k.fy(.52); br = min(k.W * .4, k.H * .46)
    bx0, by0, bx1, by1 = bcx - br, bcy - br, bcx + br, bcy + br
    # the quench pot in the north-east corner, under the anvil's tail
    qr = max(5, int(k.H * .2)); qx, qy = k.X1 - qr - 1, k.Y0 + qr + 1
    if S in ("africa", "southasia", "americas", "seasia", "oceania"): pot(k, qx, qy, qr, fill=WATER)
    elif S in ("islamic", "steppe"): bucket(k, qx, qy, qr, k.c(COPPER), hoops=k.c(COPPER))
    elif S == "eastasia": bucket(k, qx, qy, qr, k.m("clay"), hoops=k.acc)
    elif stg in "WN": bucket(k, qx, qy, qr, k.paint, hoops=k.c(STEEL))
    elif stg == "F": bucket(k, qx, qy, qr, k.comp, fill=[k.glow[0]] * 2 + [k.glow[1]] * 3)
    else: bucket(k, qx, qy, qr)
    # the block
    if S == "africa" and stg in "MEV":
        k.sh(bx0, by0, bx1, by1, 3, "ellipse"); k.disc(bcx, bcy, br * 1.05, br * .95, k.c(EARTH))     # the anvil stone in a beaten floor
        for a_ in range(0, 360, 60): d.ellipse([bcx + br * .85 * math.cos(math.radians(a_)) - 3, bcy + br * .8 * math.sin(math.radians(a_)) - 2, bcx + br * .85 * math.cos(math.radians(a_)) + 3, bcy + br * .8 * math.sin(math.radians(a_)) + 2], fill=k.c(STONE)[3])
    elif stg == "M" or S == "polar" and stg in "EV":
        C = k.c(STONE) if S == "polar" else k.wood
        k.sh(bx0, by0, bx1, by1, 4, "ellipse"); k.disc(bcx, bcy, br, br * .95, C)
        for rr in (br * .72, br * .45): d.ellipse([bcx - rr, bcy - rr * .95, bcx + rr, bcy + rr * .95], outline=C[1])
        if k.e == 1:                                                                                     # iron dogs driven across the splits
            for a_ in (40, 220): ax_, ay_ = bcx + br * .8 * math.cos(math.radians(a_)), bcy + br * .8 * math.sin(math.radians(a_)); d.line([ax_ - 3, ay_ - 3, ax_ + 3, ay_ + 3], fill=k.c(IRON)[3], width=2)
    elif stg == "E" or stg == "V" and k.wealth < 3:
        k.sh(bx0, by0, bx1, by1, 4); k.rect(bx0, by0, bx1, by1, k.wood)
        for gy in range(int(by0) + 5, int(by1) - 3, 5): d.line([bx0 + 3, gy, bx1 - 3, gy], fill=k.wood[1])
        if k.e == 3 or k.rich: d.rectangle([bx0 + 2, by0 + 2, bx1 - 2, by1 - 2], outline=k.c(IRON)[2])
    elif stg in "VW":
        C = k.paint
        k.sh(bx0, by0, bx1, by1, 4)
        for ax, ay in ((bx0, by0), (bx1 - 7, by0), (bx0, by1 - 7), (bx1 - 7, by1 - 7)): k.rect(ax, ay, ax + 7, ay + 7, C, lv=1)   # the splayed feet
        k.rect(bx0 + 4, by0 + 4, bx1 - 4, by1 - 4, C)
    elif stg == "N":
        k.sh(bx0, by0, bx1, by1, 4); k.rect(bx0, by0, bx1, by1, k.paint); d.line([bx0 + 3, by1 - 4, bx1 - 3, by1 - 4], fill=k.c(STEEL)[3])
    else:
        k.sh(bx0, by0, bx1, by1, 4); k.future_shell(bx0, by0, bx1, by1, 5)
    if k.poor and stg in "MEV": d.line([bx0 + 2, bcy + br * .55, bx1 - 2, bcy + br * .6], fill=k.c(R_((170, 150, 108), 14))[2], width=3)
    # the anvil
    face = k.c(STEEL) if (k.rich or stg in "WNF" and k.cond == "new") else iron
    sc = .82 if k.poor else 1.0 if k.wealth < 4 else 1.1
    mk = k.make
    if mk == "bench": sc *= .66                                             # a small bench anvil on the stand
    L = k.W * .62 * sc; fh = k.H * .16 * sc * (.72 if mk == "farrier" else 1.25 if mk == "double" else 1)
    blockform = S in ("islamic", "steppe", "southasia", "eastasia", "seasia") or (S == "africa" and stg in "MEV")
    if blockform:
        ax0, ay0, ax1, ay1 = bcx - L * .32, bcy - fh * 1.4, bcx + L * .32, bcy + fh * 1.4
        k.sh(ax0, ay0, ax1, ay1, 3); k.rect(ax0 - 2, ay0 - 2, ax1 + 2, ay1 + 2, iron, lv=1)
        d.rectangle([ax0 + 2, ay0 + 2, ax1 - 2, ay1 - 2], fill=face[3]); d.line([ax0 + 2, ay0 + 2, ax1 - 2, ay0 + 2], fill=face[4])
        if S == "islamic": d.polygon([(ax0 - 2, bcy - 3), (ax0 - L * .25, bcy), (ax0 - 2, bcy + 3)], fill=iron[2], outline=OUT)
        tail = ax1
    else:
        ax0, ax1 = bcx - L * .3, bcx + L * .42; ay0, ay1 = bcy - fh, bcy + fh
        horn = L * (.22 if stg == "M" else .58 if mk == "farrier" else .4)
        k.sh(ax0 - horn, ay0, ax1, ay1, 3)
        k.rect(ax0 + 3, ay0 - 3, ax1 - 5, ay1 + 3, iron, lv=0)                                           # the feet showing past the waist
        if k.cond != "broken":
            d.polygon([(ax0, ay0), (ax0 - horn, bcy + 1), (ax0, ay1)], fill=iron[2], outline=OUT); d.line([ax0 - horn + 3, bcy, ax0, ay0 + 2], fill=iron[4])
        k.rect(ax0, ay0, ax1, ay1, iron); d.rectangle([ax0 + 2, ay0 + 2, ax1 - 2, ay1 - 2], fill=face[3]); d.line([ax0 + 2, ay0 + 2, ax1 - 3, ay0 + 2], fill=face[4])
        if mk == "double":                                                                               # the continental two-horned anvil
            d.polygon([(ax1, ay0 + 2), (ax1 + L * .3, bcy), (ax1, ay1 - 2)], fill=iron[2], outline=OUT); d.line([ax1 + 2, ay0 + 4, ax1 + L * .28, bcy], fill=iron[4])
        if mk == "farrier": d.rectangle([ax0 + 3, ay1 - 2, ax0 + 9, ay1 + 4], fill=iron[1], outline=OUT)    # the clip horn
        if stg != "M": d.rectangle([ax1 - 7, bcy - 2, ax1 - 4, bcy + 1], fill=OUT)                         # the hardy hole
        if k.cond == "broken": d.polygon([(k.X0 + 2, k.Y1 - 9), (k.X0 + 2 + horn, k.Y1 - 6), (k.X0 + 2, k.Y1 - 3)], fill=iron[2], outline=OUT)   # the horn snapped off
        tail = ax1
    if k.cond == "worn":
        for _ in range(3):
            rx_, ry_ = k.rng.uniform(ax0 + 2, tail - 6), k.rng.uniform(ay0 + 1, ay1 - 3); d.ellipse([rx_, ry_, rx_ + 5, ry_ + 3], fill=k.c(RUST)[2])
    # the tools, laid on the block's south edge
    hammer(k, bcx - br * .7, by1 - 4, -.12, br * .9)
    if k.rich or v.get("tools") == "many":
        k.bar(bx1 - 2, by1 - 3, bx1 + 6, by0 + br * .9, k.c(IRON), 2); k.bar(bx1, by1 - 2, bx1 + 9, by0 + br * 1.0, k.c(IRON), 2)    # tongs leant on the block
    if v.get("tools") == "many":                                                                          # a set hammer and a swage block by it
        hammer(k, bcx - br * .6, by0 + 5, .2, br * .7, hs=4)
        sx0 = k.X0 + 1; k.rect(sx0, k.Y1 - 14, sx0 + 14, k.Y1 - 1, k.c(IRON), lv=1)
        for hx in (sx0 + 4, sx0 + 9): d.ellipse([hx - 1, k.Y1 - 10, hx + 2, k.Y1 - 7], fill=OUT)
    k.wear(bx0, by0, bx1, by1, k.wood)


def grindstone(tm, x, y, w, h, st, v):
    """A grindstone seen from above: the stone stands on edge, so it shows as a thick band of grit across the frame,
    turning on an iron axle with its crank to the east and its water trough beneath. Medieval: a timber frame on splayed
    legs; Renaissance and Age of Reason: a joined frame with a treadle; Victorian: a cast frame with a treadle and a seat;
    20th century: the pedal grinder, painted, with its seat; Modern: an electric wet grinder on a steel cabinet; Future:
    a sealed grinder. Style: the frame's wood or paint, the stone (pale sandstone, grey, red), the trough (wood, clay, stone)."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    stone = k.c({"mediterranean": SAND, "islamic": SAND, "africa": R_((150, 100, 80), 16), "southasia": R_((170, 110, 80), 16), "americas": R_((180, 120, 100), 16),
                 "eastasia": R_((120, 124, 126), 14), "northern": R_((126, 122, 118), 14), "polar": R_((110, 110, 112), 14)}.get(k.style, R_((176, 160, 128), 16)))
    frame = k.wood if stg in "ME" else k.paint if stg in "VWN" else k.comp
    fx0, fx1, fy0, fy1 = X0 + W * .08, X1 - W * .2, Y0 + H * .06, Y1 - H * .06; rw = max(6, int(H * .16))
    sx0, sx1 = k.fx(.36), k.fx(.36) + max(8, W * .15); sy0, sy1 = Y0 + H * .1, Y1 - H * .1
    if k.make == "bench" and stg in "WNF":
        C = k.paint if stg != "F" else k.comp
        k.sh(X0 + W * .3, Y0 + H * .2, X1 - W * .3, Y1 - H * .2, 4); k.rect(X0 + W * .3, Y0 + H * .25, X1 - W * .3, Y1 - H * .25, C, lv=1)   # the pedestal foot
        k.rrect(k.fx(.3), k.fy(.36), k.fx(.7), k.fy(.64), 6, C)                                                   # the motor between the wheels
        for ex in (X0 + 2, k.fx(.78)):
            k.rect(ex, Y0 + H * .12, ex + W * .2, Y1 - H * .12, k.c(STEEL), lv=1)                                  # the wheel guards
            k.rect(ex + 4, Y0 + H * .18, ex + W * .2 - 4, Y1 - H * .18, stone)
            for gy in range(int(Y0 + H * .2), int(Y1 - H * .2), 4): d.line([ex + 5, gy, ex + W * .2 - 5, gy], fill=stone[1])
        k.bar(k.fx(.22), k.cy, k.fx(.78), k.cy, k.c(STEEL), 3)
        if stg == "F": k.glowline(k.fx(.34), k.fy(.5), k.fx(.66), k.fy(.5))
        if k.cond == "broken": d.polygon([(X0 + 4, Y1 - H * .2), (X0 + W * .12, Y1 - 3), (X0 + 2, Y1 - 2)], fill=stone[2], outline=OUT)
        k.wear(k.fx(.3), k.fy(.36), k.fx(.7), k.fy(.64), C); return
    if k.make == "trough" and stg in "WN":                                                                       # the big farm stone in its cast trough
        k.sh(X0 + W * .1, Y0 + 2, X1 - W * .25, Y1 - 2, 4)
        k.rect(X0 + W * .1, k.fy(.15), X1 - W * .25, k.fy(.85), k.paint); d.rectangle([X0 + W * .14, k.fy(.22), X1 - W * .29, k.fy(.78)], fill=WATER[2], outline=OUT)
        sx0, sx1 = k.fx(.28), k.fx(.28) + W * .26
        for lx in (X0 + W * .1, X1 - W * .3): k.rect(lx, Y0 + 2, lx + 6, Y1 - 2, k.paint, lv=1)                  # the cast legs
    elif stg == "N":
        k.sh(fx0, fy0, X1 - 2, fy1, 4); k.rect(fx0, fy0, X1 - 2, fy1, frame)
        k.rect(fx0 + 5, fy0 + 5, sx0 - 4, fy1 - 5, k.c(STEEL), lv=1)                                           # the motor housing
        k.rect(sx0 - 3, sy0, sx1 + 3, sy1, k.c(PLASTIC_GREY), lv=1); d.rectangle([sx0, sy0 + 3, sx1, sy1 - 3], fill=WATER[2])   # the water tray
    elif stg == "F":
        if k.make == "trough": fy0, fy1 = Y0 + H * .2, Y1 - H * .2
        k.sh(fx0, fy0, X1 - 2, fy1, 4); k.future_shell(fx0, fy0, X1 - 2, fy1, 8); k.glowline(sx1 + 6, fy0 + 6, sx1 + 6, fy1 - 6)
        k.rect(sx1 + 10, fy0 + 8, X1 - 8, fy1 - 8, k.comp, lv=3)
    else:
        k.sh(fx0, fy0, fx1, fy1, 4)
        if stg == "M":
            for lx, ly, ox, oy in ((fx0, fy0, -1, -1), (fx1, fy0, 1, -1), (fx0, fy1, -1, 1), (fx1, fy1, 1, 1)):
                k.bar(lx + ox * 2, ly + oy * 2, lx - ox * -6, ly + oy * 2, frame, 3)
        trough = k.c(STONE) if k.style in ("mediterranean", "islamic", "polar") else k.m("clay") if k.style in ("africa", "southasia", "americas") else k.wood
        k.rect(sx0 - 7, fy0 + rw - 2, sx1 + 7, fy1 - rw + 2, trough, lv=1); d.rectangle([sx0 - 4, fy0 + rw + 1, sx1 + 4, fy1 - rw - 1], fill=WATER[2])
        k.rect(fx0, fy0, fx1, fy0 + rw, frame); k.rect(fx0, fy1 - rw, fx1, fy1, frame)                          # the two side rails
        k.rect(fx0, fy0, fx0 + rw * .8, fy1, frame); k.rect(fx1 - rw * .8, fy0, fx1, fy1, frame)
        if k.wealth >= 2:
            pass
        if stg in "EVW": k.bar(fx0 + 4, fy1 + 1, fx1 - 6, fy1 + 1, k.c(IRON) if stg != "E" else frame, 3)        # the treadle
        if stg in "VW":                                                                                          # the seat
            sc = k.c(LEATHER) if stg == "W" else k.wood; k.bar(fx1 - rw, Y1 - H * .3, X1 - 8, Y1 - H * .3, frame, 3); k.disc(X1 - 8, Y1 - H * .3, 7, 6, sc)
    # the stone on edge
    k.rect(sx0, sy0, sx1, sy1, stone)
    for gy in range(int(sy0) + 4, int(sy1) - 2, 4): d.line([sx0 + 2, gy, sx1 - 2, gy], fill=stone[1 if gy % 8 else 3])
    if k.cond == "worn": d.rectangle([sx0 + 2, k.cy - 3, sx1 - 2, k.cy + 3], fill=stone[0])                    # a dished, worn hollow
    # axle and crank
    k.bar(fx0 + 2, k.cy, sx1 + W * .22, k.cy, k.c(IRON), 3)
    if stg in "MEV":
        ex = sx1 + W * .22; k.bar(ex, k.cy, ex, k.cy + H * .28, k.c(IRON), 2); k.disc(ex, k.cy + H * .3, 3, 3, k.wood)
    if stg in "NF":                                                                                          # blades waiting by it
        for i in range(1 + k.wealth // 2): k.bar(X0 + 3, Y1 - 3 - i * 5, X0 + W * (.25 + .04 * i), Y1 - 4 - i * 5, k.c(STEEL), 2); d.rectangle([X0 + 1, Y1 - 5 - i * 5, X0 + 6, Y1 - 2 - i * 5], fill=k.c(BLACK)[2])
    if k.rich: k.ornament(fx0, fy0, fx1, fy1)
    elif k.poor: k.ornament(fx0, fy0, sx0 - 8, fy1)
    if k.cond == "broken": d.line([sx0 + 1, k.cy - 9, sx1 - 1, k.cy + 7], fill=OUT, width=2); d.polygon([(sx1 + 3, sy1 - 6), (sx1 + 10, sy1 - 2), (sx1 + 4, sy1)], fill=stone[2], outline=OUT)
    k.wear(fx0, fy0, fx1, fy0 + rw, frame)


def bellows(tm, x, y, w, h, st, v):
    """The smith's great bellows. European: a pear-shaped pair of boards with leather between, the nozzle to the south
    and a rocking pole; East and Southeast Asia: a box piston bellows with its pull handle; South Asia, the steppe and
    the Islamic world: two goatskin bags with their wooden mouths; Africa: twin clay pot bellows with skin tops and
    sticks. Victorian: an iron-framed bellows on a stand; 20th century: a cast-iron crank blower (a round fan case);
    Modern: an electric blower; Future: a sealed fan unit."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    leather = k.c(LEATHER if S not in ("polar", "steppe") else HIDE)
    if stg in "WNF" and not (k.make == "bellows" and stg in "WN"):
        cr = min(W * .28, H * .45); cx_, cy_ = X0 + cr + 4, k.cy
        if stg == "F":
            k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 10)
            for a in range(0, 360, 45): d.line([cx_, cy_, cx_ + cr * .8 * math.cos(math.radians(a)), cy_ + cr * .8 * math.sin(math.radians(a))], fill=k.glow[1], width=2)
        else:
            C = k.paint
            k.sh(cx_ - cr, cy_ - cr, X1, cy_ + cr, 4)
            k.rect(cx_, cy_ - cr * .45, X1 - 3, cy_ + cr * .45, k.c(IRON))                                 # the blast pipe
            k.disc(cx_, cy_, cr, cr, C); d.ellipse([cx_ - cr * .55, cy_ - cr * .55, cx_ + cr * .55, cy_ + cr * .55], outline=C[0])
            if stg == "W": k.bar(cx_, cy_, cx_ + cr * .2, cy_ - cr * .95, k.c(IRON), 2); k.disc(cx_ + cr * .2, cy_ - cr * .95, 3, 3, k.wood)   # the crank
            else: k.rect(cx_ - cr * .4, cy_ + cr * .2, cx_ + cr * .4, cy_ + cr * .95, k.c(STEEL))                                        # the motor
            if k.make == "forge":                                                                                   # on a portable forge, the pan of coals at the pipe's end
                fr_ = min(W * .22, H * .45); k.disc(X1 - fr_ - 2, cy_, fr_, fr_, C); d.ellipse([X1 - 2 * fr_ + 2, cy_ - fr_ + 4, X1 - 6, cy_ + fr_ - 4], fill=(40, 34, 34))
                for i in range(4): d.ellipse([X1 - fr_ - 8 + i * 4, cy_ - 3 + (i % 2) * 4, X1 - fr_ - 4 + i * 4, cy_ + (i % 2) * 4], fill=(230, 110, 40))
        k.wear(X0, Y0, X1, Y1, leather); return
    if S in ("eastasia", "seasia"):
        bx0, by0, bx1, by1 = X0 + 3, Y0 + H * .15, X1 - 10, Y1 - H * .15
        k.sh(bx0, by0, bx1, by1, 4); k.rect(bx0, by0, bx1, by1, k.wood)
        for gx in range(int(bx0) + 8, int(bx1) - 4, 9): d.line([gx, by0 + 3, gx, by1 - 3], fill=k.wood[1])
        k.bar(bx0 - 1, k.cy, bx0 + 8, k.cy, k.c(IRON), 2); k.bar(bx0 + 2, k.cy - 7, bx0 + 2, k.cy + 7, k.wood, 3)          # the pull handle
        k.rect(bx1, k.cy - 4, X1 - 2, k.cy + 4, k.c(IRON))                                                         # the tuyere
    elif S in ("southasia", "steppe", "islamic", "polar"):
        for cy_ in (Y0 + H * .27, Y0 + H * .73):
            k.sh(X0 + 3, cy_ - H * .22, X1 - 8, cy_ + H * .22, 3, "ellipse")
            k.blob(X0 + W * .42, cy_, W * .36, H * .2, leather, n=5, jit=.08)
            k.rect(X0 + 2, cy_ - 3, X0 + 9, cy_ + 3, k.wood)                                                         # the mouth sticks
            k.bar(X0 + W * .78, cy_, X1 - 3, k.cy, k.c(IRON), 2)
    elif S == "africa":
        for cy_ in (Y0 + H * .27, Y0 + H * .73):
            r = H * .22; k.sh(X0 + 4, cy_ - r, X0 + 4 + 2 * r, cy_ + r, 3, "ellipse")
            k.disc(X0 + 4 + r, cy_, r, r, k.m("clay")); d.ellipse([X0 + 4 + r * .35, cy_ - r * .65, X0 + 4 + r * 1.65, cy_ + r * .65], fill=leather[2], outline=OUT)
            k.bar(X0 + 4 + r, cy_, X0 + 4 + r - 2, cy_ - r * .9, k.wood, 2)                                                 # the pumping stick
            k.bar(X0 + 4 + 2 * r, cy_, X1 - 3, k.cy, k.m("clay"), 3)
    else:
        # the pear-shaped boards, wide end north-west, nozzle to the east
        pts = [(X0 + 2, Y0 + 3), (X0 + W * .55, Y0 + 2), (X1 - W * .15, k.cy - 4), (X1 - W * .15, k.cy + 4), (X0 + W * .55, Y1 - 2), (X0 + 2, Y1 - 3)]
        k.sh(X0, Y0, X1 - W * .12, Y1, 4)
        k.poly([(a, b) for a, b in pts], leather, lv=1)                                                                  # the leather showing past the board
        board = [(X0 + 5, Y0 + 6), (X0 + W * .53, Y0 + 5), (X1 - W * .18, k.cy - 2), (X1 - W * .18, k.cy + 2), (X0 + W * .53, Y1 - 5), (X0 + 5, Y1 - 6)]
        k.poly(board, k.wood)
        for gy in range(int(Y0) + 10, int(Y1) - 6, 6): d.line([X0 + 8, gy, X0 + W * .5, gy], fill=k.wood[1])
        if k.rich: k.pattern(X0 + 10, Y0 + 10, X0 + W * .45, Y1 - 10)                                    # carved and painted boards
        k.rect(X1 - W * .18, k.cy - 3, X1 - 2, k.cy + 3, k.c(BRASS if k.rich else IRON))                                 # the nozzle
        if stg == "V": d.rectangle([X0 + 3, Y0 + 3, X0 + W * .5, Y1 - 3], outline=k.c(IRON)[2])
        k.bar(X0 + 4, k.cy, X0 - 1, k.cy, k.wood, 3)
        if k.e == 1:                                                                                                       # Long Night: iron straps
            for gx in (X0 + W * .2, X0 + W * .4): d.line([gx, Y0 + 7, gx, Y1 - 7], fill=k.c(IRON)[2], width=2)
    if k.poor: k.ornament(X0 + 4, Y0 + 4, X0 + W * .5, Y1 - 4)
    if k.cond == "broken":
        d.polygon([(X0 + W * .3, Y1 - 4), (X0 + W * .45, Y1 - 12), (X0 + W * .52, Y1 - 3)], fill=OUT)                   # a split in the leather
    k.wear(X0 + 3, Y0 + 3, X0 + W * .6, Y1 - 3, leather)



def log(k, x0, y0, x1, y1, bark=None, along="x", cut=True):
    """A log lying down, seen from above: a long rounded body with bark ridges, lit along its north-west side, its
    sawn ends a pale band."""
    d = k.d; B = bark or k.c(BARK); x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    k.sh(x0, y0, x1, y1, 3)
    r = (y1 - y0) // 2 if along == "x" else (x1 - x0) // 2
    d.rounded_rectangle([x0, y0, x1, y1], max(1, r), fill=B[2], outline=OUT)
    if along == "x":
        d.line([x0 + r, y0 + 2, x1 - r, y0 + 2], fill=B[4]); d.line([x0 + r, y1 - 2, x1 - r, y1 - 2], fill=B[0])
        for gx in range(x0 + 6, x1 - 6, 7): d.line([gx, y0 + 4, gx + 4, y0 + 4 + (y1 - y0) // 3], fill=B[1])
        if cut:
            W_ = k.c(R_((214, 184, 130), 12))
            for ex in (x0 + 1, x1 - 4): d.rectangle([ex, y0 + 2, ex + 3, y1 - 2], fill=W_[2])
    else:
        d.line([x0 + 2, y0 + r, x0 + 2, y1 - r], fill=B[4]); d.line([x1 - 2, y0 + r, x1 - 2, y1 - r], fill=B[0])
        for gy in range(y0 + 6, y1 - 6, 7): d.line([x0 + 4, gy, x0 + 4 + (x1 - x0) // 3, gy + 4], fill=B[1])
        if cut:
            W_ = k.c(R_((214, 184, 130), 12))
            for ey in (y0 + 1, y1 - 4): d.rectangle([x0 + 2, ey, x1 - 2, ey + 3], fill=W_[2])


def mat(k, x0, y0, x1, y1, C=None, kind=None):
    """A woven floor mat: reed, pandanus, rush or felt, its weave in rows."""
    d = k.d; C = C or k.m("straw"); x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=C[0])
    for gy in range(y0 + 2, y1 - 1, 3): d.line([x0 + 1, gy, x1 - 1, gy], fill=C[1 if (gy // 3) % 2 else 3])
    for gx in range(x0 + 6, x1 - 2, 12): d.line([gx, y0 + 1, gx, y1 - 1], fill=C[0])


def cloth_web(k, x0, y0, x1, y1, D, along="y"):
    """A length of woven cloth in its dye, with the style's own pattern woven in."""
    d = k.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 - x0 < 3 or y1 - y0 < 3: return
    d.rectangle([x0, y0, x1, y1], fill=D[2], outline=D[0])
    if x1 - x0 > 10 and y1 - y0 > 10 and k.wealth >= 1:
        k.pattern(x0 + 3, y0 + 3, x1 - 3, y1 - 3, A=D if k.style != "central" else k.acc, B=k.acc2 if D is not k.acc2 else k.acc)
    for gx in range(x0 + 2, x1 - 1, 3): d.line([gx, y0 + 1, gx, y0 + 2], fill=D[3])


def fibre_basket(k, cx, cy, rx, ry, F_):
    """The fibre waiting to be spun, in the land's own container: a willow basket, a birch-bark box, a brass bowl, a
    felt bag, a lacquer box, a coiled or pandanus basket, with the style's colour banded round its rim."""
    d = k.d; S = k.style
    C = {"northern": k.c(BIRCH), "polar": k.c(BIRCH), "islamic": k.c(COPPER), "southasia": k.c(BRASS), "steppe": k.acc, "eastasia": k.acc,
         "mediterranean": k.m("clay")}.get(S, k.m("straw"))
    k.sh(cx - rx, cy - ry, cx + rx, cy + ry, 3, "ellipse"); k.disc(cx, cy, rx, ry, C)
    band = k.acc if S not in ("steppe", "eastasia") else k.acc2
    d.ellipse([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], outline=band[2], width=2)
    if S in ("africa", "americas", "seasia", "oceania", "central", "atlantic"):
        for a in range(0, 360, 30): d.line([cx + (rx - 1) * math.cos(math.radians(a)), cy + (ry - 1) * math.sin(math.radians(a)), cx + (rx - 4) * math.cos(math.radians(a + 12)), cy + (ry - 4) * math.sin(math.radians(a + 12))], fill=C[0])
    k.blob(cx, cy, rx * .62, ry * .62, F_, n=5)


# ---------------------------------------------------------------- spinning and weaving
def loom(tm, x, y, w, h, st, v):
    """A floor loom from above: the warp beam to the north, the warp running south through the heddles and the reed to
    the woven cloth on the breast beam, the treadles beneath and the weaver's bench at the front. Medieval: heavy adzed
    posts (iron pegs in the Long Night); Renaissance and Age of Reason: a joined frame, carved posts in rich houses;
    Victorian: the flying-shuttle boxes, and a Jacquard head with its card chain in rich workshops; 20th century: a
    power loom on a cast frame, its drive wheel to the side; Modern: a pale birch craft loom; Future: a dark frame
    with lit heddles. South Asia: the pit loom, the weaver's legs in a pit; Africa: the narrow-strip loom with its warp
    drawn out to a drag stone; the steppe and the Americas: a ground loom staked out. The cloth is woven in the style's
    own pattern and the household's dye."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    D = k.c(DYES.get(v.get("cloth", "blue"), DYES["blue"]))
    frame = k.wood if stg in "MEV" else k.paint if stg == "W" else k.c(BIRCH) if stg == "N" else k.comp
    warp = k.c(LINEN) if stg != "F" else [k.glow[0]] * 2 + [k.glow[1]] * 3
    if S == "africa" and stg in "MEV":                                     # the narrow-strip loom and its long warp
        lx0, lx1 = k.fx(.35), k.fx(.65)
        k.sh(lx0, k.fy(.45), lx1, Y1, 4)
        for px_ in (lx0, lx1 - 6):
            for py_ in (k.fy(.45), k.fy(.7)): k.rect(px_, py_, px_ + 6, py_ + 6, frame)
        k.bar(lx0, k.fy(.47), lx1, k.fy(.47), frame, 3); k.bar(lx0, k.fy(.72), lx1, k.fy(.72), frame, 3)
        sx = k.cx; k.disc(sx, Y0 + 12, 10, 8, k.c(STONE))                                                        # the drag stone
        for t in np.linspace(-.12, .12, 6): d.line([sx + t * 40, Y0 + 16, sx + t * W * .45, k.fy(.6)], fill=warp[3])
        cloth_web(k, k.cx - W * .07, k.fy(.6), k.cx + W * .07, k.fy(.88), D)
        for i in range(3): cloth_web(k, X0 + 4 + i * 8, k.fy(.3), X0 + 10 + i * 8, Y1 - 6, D if i % 2 else k.acc)   # finished strips laid by
        mat(k, lx0 - 4, Y1 - H * .1, lx1 + 4, Y1)
        k.wear(lx0, k.fy(.45), lx1, Y1, frame); return
    if S in ("steppe", "americas") and stg in "ME":                       # a ground loom pegged out
        k.sh(X0 + 8, Y0 + 8, X1 - 8, Y1 - 8, 3)
        for px_, py_ in ((X0 + 6, Y0 + 6), (X1 - 6, Y0 + 6), (X0 + 6, Y1 - 6), (X1 - 6, Y1 - 6)): k.disc(px_, py_, 4, 4, frame)
        k.bar(X0 + 10, Y0 + 10, X1 - 10, Y0 + 10, frame, 4); k.bar(X0 + 10, Y1 - 10, X1 - 10, Y1 - 10, frame, 4)
        for px_ in range(int(X0) + 14, int(X1) - 12, 3): d.line([px_, Y0 + 13, px_, k.fy(.5)], fill=warp[3])
        cloth_web(k, X0 + 13, k.fy(.5), X1 - 13, Y1 - 13, D)
        k.bar(X0 + 12, k.fy(.4), X1 - 12, k.fy(.4), k.wood, 3)
        k.wear(X0 + 10, k.fy(.5), X1 - 10, Y1 - 10, D); return
    # the frame: posts, side rails, beams
    p_ = max(6, int(W * .05)); k.sh(X0, Y0, X1, Y1 - H * .14, 5)
    for px_ in (X0, X1 - p_):
        k.rect(px_, Y0, px_ + p_, Y1 - H * .16, frame)
        if stg == "M" and k.e == 1: d.rectangle([px_ + 1, Y0 + 6, px_ + p_ - 1, Y0 + 8], fill=k.c(IRON)[2])
    for py_ in (Y0, k.fy(.45), Y1 - H * .16 - p_): k.rect(X0, py_, X1, py_ + p_, frame)
    ix0, ix1 = X0 + p_ + 3, X1 - p_ - 3
    log(k, ix0, Y0 + p_ + 2, ix1, Y0 + p_ + 14, k.c(R_((150, 120, 84), 12)) if stg != "F" else k.comp, cut=False)     # the warp beam, wound with yarn
    d.rectangle([ix0 + 6, Y0 + p_ + 4, ix1 - 6, Y0 + p_ + 12], fill=warp[2])
    fell = k.fy(.62)
    for px_ in range(int(ix0) + 2, int(ix1) - 1, 3): d.line([px_, Y0 + p_ + 15, px_, fell], fill=warp[3 if px_ % 2 else 2])
    hy = k.fy(.32); k.rect(ix0 - 2, hy, ix1 + 2, hy + 7, frame if stg != "F" else k.comp)                      # the heddle shafts
    for px_ in range(int(ix0), int(ix1), 4): d.line([px_, hy + 1, px_, hy + 6], fill=(k.glow[1] if stg == "F" else frame[0]))
    k.rect(ix0 - 2, k.fy(.52), ix1 + 2, k.fy(.52) + 5, k.c(IRON) if stg in "WNF" else frame)                 # the beater and reed
    cloth_web(k, ix0, fell, ix1, Y1 - H * .16 - p_ - 1, D)
    if k.make == "dobby":                                                                                      # the dobby head and its peg lags
        k.rect(X1 - p_ - W * .2, Y0 + 2, X1 - 2, k.fy(.3), frame, lv=3)
        for gy in range(int(Y0) + 6, int(k.fy(.3)) - 2, 4):
            for gx in range(int(X1 - p_ - W * .2) + 4, int(X1) - 5, 5): d.point((gx, gy), fill=k.c(STEEL)[4])
    if k.make == "jacquard" and stg in "WN": k.rect(k.fx(.25), Y0 + 2, k.fx(.75), Y0 + p_ + 18, frame, lv=3); [d.line([k.fx(.28), gy, k.fx(.72), gy], fill=WHITE[2 if gy % 2 else 4]) for gy in range(int(Y0) + 4, int(Y0 + p_ + 16), 3)]
    if stg == "V":                                                                                             # flying-shuttle boxes
        for bx in (X0 - 1, X1 - p_ - 5): k.rect(bx, k.fy(.5), bx + p_ + 6, k.fy(.5) + 9, k.wood, lv=3)
        if k.wealth >= 3:                                                                                      # the Jacquard head and its cards
            k.rect(k.fx(.35), Y0 + 2, k.fx(.65), Y0 + p_ + 16, k.wood, lv=3)
            for gy in range(int(Y0) + 4, int(Y0 + p_ + 14), 3): d.line([k.fx(.38), gy, k.fx(.62), gy], fill=WHITE[2 if gy % 2 else 4])
    if stg == "W":                                                                                             # the drive wheel and belt
        k.disc(X1 - p_ - 2, k.fy(.75), H * .13, H * .13, k.c(IRON)); d.ellipse([X1 - p_ - 6, k.fy(.75) - 4, X1 - p_ + 2, k.fy(.75) + 4], fill=OUT)
    if stg == "F": k.glowline(ix0, hy + 3, ix1, hy + 3)
    # the bench or the pit at the front, and the treadles
    by0 = Y1 - H * .14
    for i in range(4): k.bar(k.fx(.35) + i * W * .09, Y1 - H * .16 - p_ - 2, k.fx(.33) + i * W * .09, by0 - 2, frame, 2)
    if S == "southasia" and stg in "MEV":
        d.rectangle([k.fx(.25), by0, k.fx(.75), Y1], fill=k.c(EARTH)[0], outline=OUT); d.line([k.fx(.25) + 2, by0 + 2, k.fx(.75) - 2, by0 + 2], fill=k.c(EARTH)[1])
    elif stg in "MEVNF":
        k.rect(k.fx(.2), by0, k.fx(.8), Y1, frame if stg != "N" else k.c(BIRCH))
        if k.rich and stg in "EV": k.pattern(k.fx(.22) + 2, by0 + 2, k.fx(.78) - 2, Y1 - 2)
    if k.rich: k.ornament(X0, Y0, X1, Y0 + p_)
    if k.cond == "broken":                                                                                     # snapped warp ends hanging loose
        for px_ in range(int(k.fx(.3)), int(k.fx(.5)), 5): d.line([px_, fell - 18, px_ + 4, fell - 6], fill=OUT); d.line([px_ + 1, fell - 18, px_ + 5, fell - 6], fill=warp[4])
    k.wear(X0, k.fy(.45), X1, k.fy(.45) + p_, frame)


def backstrap(tm, x, y, w, h, st, v):
    """A backstrap loom from above: the far bar tied to a post at the north, the warp stretched south to the woven web
    and the near bar, the strap round the weaver's mat at the front, with the heddle rod, the shed rod and the flat
    sword across the warp, and the yarn by the mat. The Americas: a petate mat and brocaded cloth; Southeast Asia: a
    pandanus mat and ikat or songket; Africa: indigo and stripes; East Asia: a rush mat and banded cloth. Modern and
    Future: bright acrylic yarn, a plastic mat and bowl, and in Future Darkness a small lamp."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    D = k.c(DYES.get(v.get("cloth", "red"), DYES["red"]))
    done = {"begun": .3, "half": .5, "nearly": .7}.get(v.get("work", "half"), .45)
    matC = k.c({"americas": R_((186, 160, 104), 14), "seasia": R_((200, 184, 130), 12), "africa": R_((150, 110, 70), 14), "eastasia": R_((170, 170, 110), 12)}.get(S, STRAW))
    if stg in "NF": matC = k.c(R_((60, 110, 170), 16) if S in ("americas", "seasia") else R_((170, 60, 50), 16))
    mat(k, X0 + 1, Y1 - H * .26, X1 - 1, Y1)
    if stg not in "NF": mat(k, X0 + 1, Y1 - H * .26, X1 - 1, Y1, matC)
    else: k.rect(X0 + 1, Y1 - H * .26, X1 - 1, Y1, matC, lv=2)
    # the post at the north and its cords
    bx0, bx1 = k.fx(.16), k.fx(.84); ty = Y0 + H * .12
    if S == "eastasia":                                                   # the hollow box warp beam, braced by the feet
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y0 + 16, 3); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y0 + 16, k.wood)
    elif S == "seasia":                                                   # a house post of bamboo
        k.sh(k.cx - 9, Y0, k.cx + 9, Y0 + 16, 3); k.disc(k.cx, Y0 + 8, 9, 8, k.wood); d.ellipse([k.cx - 5, Y0 + 4, k.cx + 5, Y0 + 12], fill=k.wood[0])
    elif S == "africa":
        k.sh(k.cx - 5, Y0, k.cx + 5, Y0 + 10, 3); k.disc(k.cx, Y0 + 6, 5, 5, k.wood); k.disc(X0 + 10, Y0 + 9, 7, 6, k.m("clay"))
    else:                                                                 # a tree trunk
        k.sh(k.cx - 12, Y0, k.cx + 12, Y0 + 18, 3); k.disc(k.cx, Y0 + 9, 12, 9, k.c(BARK))
        for rr in (8, 4): d.ellipse([k.cx - rr, Y0 + 9 - rr * .75, k.cx + rr, Y0 + 9 + rr * .75], outline=k.c(BARK)[1])
    d.line([k.cx, Y0 + 9, bx0, ty], fill=k.c(LINEN)[1], width=2); d.line([k.cx, Y0 + 9, bx1, ty], fill=k.c(LINEN)[1], width=2)
    k.bar(bx0 - 3, ty, bx1 + 3, ty, k.wood, 3)
    ny = Y1 - H * .3; fell = ny - (ny - ty) * done
    for i, px_ in enumerate(range(int(bx0) + 1, int(bx1), 2)):                                                 # a warp-faced web: the warp carries the colours
        C = D if (i // 3) % 3 else k.acc
        d.line([px_, ty + 3, px_, fell], fill=C[3 if i % 2 else 2])
    cloth_web(k, bx0, fell, bx1, ny - 2, D)
    k.bar(bx0 - 3, ny, bx1 + 3, ny, k.wood, 3)
    k.bar(bx0 - 2, fell - (fell - ty) * .25, bx1 + 2, fell - (fell - ty) * .25, k.wood, 2)                    # the heddle rod
    k.bar(bx0 - 2, fell - (fell - ty) * .55, bx1 + 2, fell - (fell - ty) * .55, k.c(R_((190, 176, 120), 12)), 3)   # the shed rod
    k.rect(bx0 - 5, fell - 7, bx1 + 5, fell - 3, k.wood, lv=3)                                                  # the sword
    # the strap round where the weaver sits
    strap = k.c(LEATHER) if S != "seasia" else k.c(R_((150, 120, 70), 12))
    d.arc([bx0 - 6, ny - 6, bx1 + 6, Y1 - 4], 0, 180, fill=strap[1], width=4); d.arc([bx0 - 5, ny - 6, bx1 + 5, Y1 - 5], 20, 160, fill=strap[3])
    # the yarn
    yx, yy = X0 + W * .12, Y1 - H * .13
    if stg in "NF": k.disc(yx, yy, 8, 7, k.c(R_((230, 230, 220), 8)))
    else: bucket(k, yx, yy, 8, k.m("straw"), fill=None, hoops=k.m("straw"))
    for i, C in enumerate((D, k.acc, k.acc2)): k.disc(yx - 3 + i * 3, yy - 2 + (i % 2) * 3, 3, 3, C)
    if stg == "F":
        k.disc(X1 - 10, Y1 - H * .13, 5, 5, k.comp); d.ellipse([X1 - 12, Y1 - H * .13 - 2, X1 - 8, Y1 - H * .13 + 2], fill=k.glow[2])
        tm.hearths = getattr(tm, "hearths", []) + [(int(X1 - 10), int(Y1 - H * .13), 40, None)]
    my0 = Y1 - H * .26
    if k.cond == "worn":                                                                                      # the mat patched and the web faded
        for px_ in (X0 + W * .3, X0 + W * .62): k.rect(px_, my0 + 4, px_ + W * .16, my0 + H * .12, k.acc2, lv=1)
    if k.cond == "broken":                                                                                    # the warp cut through, the mat torn
        d.rectangle([bx0 + 2, fell - (fell - ty) * .4, bx1 - 2, fell - (fell - ty) * .3], fill=OUT)
        d.polygon([(X0 + W * .35, Y1 - 2), (X0 + W * .5, my0 + 6), (X0 + W * .7, Y1 - 2)], fill=OUT)
    k.wear(bx0, fell, bx1, ny, D)


def wheel(tm, x, y, w, h, st, v):
    """A spinning wheel. The wheel stands on edge, so from above it shows as a long narrow ring with its spokes, as a
    leaning thing shows a foreshortened face. Dark Ages and Long Night: the great wheel on its three-legged bench, the
    spindle at the far end; Renaissance to Victorian: the Saxony wheel, a slanted table with the flyer, the treadle
    and the distaff, the spinner's stool before it; 20th century: the upright castle wheel. South Asia, the Islamic
    world and Asia: the charkha or a low wheel on the floor, the spinner's mat before it. The fibre waits in the land's
    own basket, box or bowl: wool, flax, cotton or silk."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fib = {"wool": WHITE, "grey wool": R_((150, 148, 144), 12), "brown wool": R_((120, 90, 66), 12), "flax": R_((200, 184, 130), 12),
           "cotton": R_((236, 236, 230), 6), "silk": R_((236, 224, 180), 8)}
    F_ = k.c(fib.get(v.get("fibre", "wool"), WHITE))
    def wheel_ring(cx, cy, rx, ry, C):
        k.sh(cx - rx, cy - ry, cx + rx, cy + ry, 3, "ellipse")
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=OUT, width=5); d.ellipse([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], outline=C[2], width=3)
        d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 180, 280, fill=C[4])
        for a in range(0, 180, 30): ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a)); d.line([cx - rx * ca, cy - ry * sa, cx + rx * ca, cy + ry * sa], fill=C[1], width=2)
        k.disc(cx, cy, 4, 3, C)
    wood = k.wood if not (stg == "W" and k.e == 6) else k.paint
    if S in ("southasia", "islamic", "eastasia", "seasia"):                  # the charkha and the low Asian wheel
        mat(k, X0, k.fy(.55), X1, Y1, k.c(R_((190, 160, 110), 12)) if S != "eastasia" else k.c(R_((176, 176, 120), 12)))
        if k.wealth >= 2: k.pattern(X0 + 3, k.fy(.58), k.fx(.55), Y1 - 3)
        k.sh(X0 + 2, Y0 + H * .1, X1 - 2, k.fy(.55), 4)
        k.rect(X0 + 2, k.fy(.32), X1 - 2, k.fy(.32) + 9, wood); k.rect(X0 + 2, k.fy(.18), X0 + 10, k.fy(.52), wood); k.rect(X1 - 10, k.fy(.18), X1 - 2, k.fy(.52), wood)
        wheel_ring(k.fx(.62), k.fy(.3), W * .33, H * .2, wood)
        k.bar(k.fx(.95), k.fy(.3), X1 - 2, k.fy(.5), k.c(IRON), 2)                                             # the crank
        k.bar(X0 + 4, k.fy(.42), k.fx(.25), k.fy(.42), k.c(IRON), 2); k.blob(k.fx(.2), k.fy(.42), 6, 4, F_)     # the spindle and its cop
        fibre_basket(k, k.fx(.78), k.fy(.78), W * .17, H * .17, F_)
    else:
        if stg == "M":                                                   # the great wheel
            k.sh(X0, k.fy(.42), X1, k.fy(.62), 4)
            k.rect(X0 + 2, k.fy(.42), X1 - 2, k.fy(.6), wood)
            for gx in range(int(X0) + 8, int(X1) - 6, 9): d.line([gx, k.fy(.44), gx + 5, k.fy(.44)], fill=wood[1])
            wheel_ring(k.fx(.62), k.fy(.27), W * .36, H * .22, wood)
            k.rect(X0 + 3, k.fy(.3), X0 + 15, k.fy(.47), wood, lv=3); k.bar(X0 + 2, k.fy(.34), X0 + 24, k.fy(.34), k.c(IRON), 2)
            d.line([X0 + 14, k.fy(.34), k.fx(.62), k.fy(.06)], fill=k.c(LINEN)[2]); d.line([X0 + 14, k.fy(.34), k.fx(.62), k.fy(.48)], fill=k.c(LINEN)[2])
            k.blob(X0 + 18, k.fy(.34), 5, 4, F_)
            fibre_basket(k, k.fx(.24), k.fy(.8), W * .18, H * .17, F_)
            if k.wealth >= 2: k.disc(k.fx(.62), k.fy(.82), H * .13, H * .12, wood)                                   # the stool
        elif stg in "EV":                                                # the Saxony wheel and the stool
            k.sh(X0 + W * .05, Y0 + H * .05, X1 - W * .05, k.fy(.62), 4)
            k.rect(k.fx(.05), k.fy(.36), k.fx(.95), k.fy(.56), wood)
            if not k.poor and S in PAINTED: k.pattern(k.fx(.07), k.fy(.38), k.fx(.45), k.fy(.54))
            wheel_ring(k.fx(.64), k.fy(.24), W * .28, H * .18, wood)
            k.rect(k.fx(.1), k.fy(.2), k.fx(.33), k.fy(.32), wood, lv=3)                                        # the flyer and bobbin
            d.rectangle([k.fx(.15), k.fy(.22), k.fx(.28), k.fy(.3)], fill=F_[2])
            k.bar(k.fx(.2), k.fy(.36), k.fx(.14), Y0 + 6, wood, 2); k.blob(k.fx(.14), Y0 + 9, 8, 6, F_)              # the distaff with its fibre
            k.rect(k.fx(.42), k.fy(.58), k.fx(.72), k.fy(.66), wood, lv=1)                                      # the treadle
            k.disc(k.fx(.6), k.fy(.84), H * .14, H * .13, wood)                                               # the stool
            if k.rich: k.disc(k.fx(.6), k.fy(.84), H * .1, H * .09, k.m("cloth"))
            fibre_basket(k, k.fx(.2), k.fy(.82), W * .17, H * .16, F_)
        else:                                                            # the upright castle wheel
            k.sh(k.fx(.15), k.fy(.12), k.fx(.85), k.fy(.62), 4)
            k.rect(k.fx(.15), k.fy(.34), k.fx(.85), k.fy(.6), wood)
            if not k.poor and S in PAINTED: k.pattern(k.fx(.17), k.fy(.36), k.fx(.4), k.fy(.58))
            wheel_ring(k.cx, k.fy(.46), W * .27, H * .13, k.wood)
            k.rect(k.fx(.33), k.fy(.12), k.fx(.67), k.fy(.25), wood, lv=3); d.rectangle([k.fx(.4), k.fy(.15), k.fx(.6), k.fy(.22)], fill=F_[2])
            k.disc(k.fx(.62), k.fy(.83), H * .14, H * .13, wood); fibre_basket(k, k.fx(.22), k.fy(.82), W * .17, H * .16, F_)
    if k.rich: k.ornament(k.fx(.05), k.fy(.36), k.fx(.95), k.fy(.56))
    if k.cond == "broken": d.line([k.fx(.5), k.fy(.08), k.fx(.6), k.fy(.42)], fill=OUT, width=3)                # a spoke and the rim broken
    k.wear(k.fx(.05), k.fy(.36), k.fx(.95), k.fy(.56))


def distaff(tm, x, y, w, h, st, v):
    """A distaff and spindle set down in the spinner's basket or bowl: the distaff stick with its puff of fibre bound
    on with a ribbon, the spindle with its whorl and the cop of spun yarn. The north: the painted distaff board
    (prialka); South Asia and the Islamic world: a takli spindle in a little bowl; Modern and Future: a drop spindle
    and braids of dyed roving."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fib = {"wool": WHITE, "grey wool": R_((150, 148, 144), 12), "brown wool": R_((120, 90, 66), 12), "flax": R_((200, 184, 130), 12), "cotton": R_((236, 236, 230), 6), "dyed": None}
    F_ = k.c(fib.get(v.get("fibre", "wool")) or k.S["cloth"])
    if stg in "NF":
        F_ = k.c(R_(PAINT[S], 18))
        fibre_basket(k, k.cx, k.cy, W * .46, H * .46, k.acc)
        for i in range(3): k.blob(X0 + W * (.32 + i * .17), Y0 + H * (.3 + i * .16), W * .12, H * .09, F_ if i % 2 else k.acc2, n=4)
        k.bar(X0 + 4, Y1 - 6, X1 - 6, Y0 + 6, k.wood if stg == "N" else k.comp, 2); k.disc(X0 + 7, Y1 - 8, 4, 4, k.wood if stg == "N" else k.comp)
        if stg == "F": d.line([X0 + 4, Y1 - 8, X0 + 10, Y1 - 8], fill=k.glow[2], width=2)
        k.wear(X0, Y0, X1, Y1, F_); return
    if S == "northern":
        k.sh(X0, Y0, X1, Y1, 3); k.rect(X0 + 1, k.fy(.5), X1 - 1, Y1 - 1, k.wood)                         # the seat board
        k.rect(k.fx(.2), Y0 + 1, k.fx(.8), k.fy(.58), k.acc); k.pattern(k.fx(.2) + 2, Y0 + 3, k.fx(.8) - 2, k.fy(.56))
        k.blob(k.cx, k.fy(.3), W * .2, H * .16, F_, n=5)
    else:
        if k.e == 5:                                                                                       # Great War: a plain slatted box
            k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.wood); d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=k.wood[0])
            k.blob(k.cx, k.cy, W * .3, H * .28, F_, n=6)
        elif k.e == 6:                                                                                     # Mid-Century: a cloth work bag with its handles
            k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3); k.rrect(X0 + 2, Y0 + 4, X1 - 2, Y1 - 2, 8, k.m("cloth"))
            for hx in (k.fx(.3), k.fx(.7)): d.arc([hx - 8, Y0, hx + 8, Y0 + 14], 180, 360, fill=k.wood[1], width=3)
            k.blob(k.cx, k.cy, W * .26, H * .22, F_, n=6)
        else: fibre_basket(k, k.cx, k.cy, W * .46, H * .46, F_)
        if k.e == 4: d.arc([X0 + 4, Y0 + 2, X1 - 4, Y1 - 2], 200, 340, fill=k.wood[1], width=4)                       # Victorian: the basket's arched handle
        if S in ("southasia", "islamic", "africa"): k.disc(k.fx(.35), k.fy(.6), 3, 3, k.c(BRASS))                    # the takli's whorl
        k.bar(X0 + 3, Y1 - 4, X1 - 4, Y0 + 4, k.wood, 2)
        k.blob(X1 - W * .3, Y0 + H * .3, W * .2, H * .16, F_, n=5)
        d.line([X1 - W * .38, Y0 + H * .22, X1 - W * .22, Y0 + H * .38], fill=(k.acc2 if not k.poor else k.c(LINEN))[2], width=2)   # the ribbon
    k.bar(X0 + 4, k.fy(.32), k.fx(.55), Y0 + 4, k.wood, 2)                                                 # the spindle, its whorl and cop
    k.disc(X0 + W * .16, k.fy(.24), 3, 3, k.m("clay") if not k.rich else k.c(BRASS)); k.blob(X0 + W * .32, k.fy(.15), 5, 3, F_, n=4)
    if k.cond == "broken": d.line([X0 + W * .5, Y1 - 6, X0 + W * .62, Y1 - 3], fill=OUT, width=2)
    k.wear(X0, Y0, X1, Y1, F_)


def potterswheel(tm, x, y, w, h, st, v):
    """A potter's wheel from above: the wheel head with a pot rising on it in wet rings, the heavy kick wheel showing
    round it, the potter's seat, a ball of clay and the water bowl. South Asia and Africa: a big stick-turned wheel on
    the ground; East Asia: a low wheel turned with a stick in its rim hole; Victorian: a treadle frame; 20th century
    and Modern: an electric wheel with a splash pan; Future: a sealed wheel with a lit rim. The clay is the land's:
    red, buff, white or grey."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    clays = {"red": R_((176, 96, 62), 16), "buff": R_((206, 176, 130), 14), "white": R_((222, 218, 206), 10), "grey": R_((146, 142, 136), 14)}
    cl = v.get("clay") or {"eastasia": "white", "mediterranean": "red", "africa": "red", "atlantic": "buff", "northern": "grey"}.get(S, "red")
    CL = k.c(clays.get(cl, clays["red"]))
    cx_, cy_ = k.cx, k.fy(.42); R0 = min(W, H) * .4
    if stg in "WN" and k.make == "kick":                                                                    # a kick wheel: a timber frame, the flywheel showing below
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - H * .16, 4); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - H * .16, k.wood, lv=1)
        d.ellipse([cx_ - R0 * .95, cy_ - R0 * .85, cx_ + R0 * .95, cy_ + R0 * .85], outline=k.c(IRON)[1], width=5)
        k.rect(X0 + 4, Y1 - H * .3, k.fx(.3), Y1 - H * .2, k.wood, lv=3)                                         # the kick bar
    elif stg == "N":                                                                                         # a compact modern wheel: a two-piece plastic splash pan
        k.sh(cx_ - R0, cy_ - R0, cx_ + R0, cy_ + R0, 4, "ellipse")
        k.rect(cx_ - R0 * .7, cy_ - R0 * .6, cx_ + R0 * .7, cy_ + R0 * .9, k.paint, lv=1)
        k.disc(cx_, cy_, R0, R0 * .9, k.c(PLASTIC_WHITE)); d.line([cx_ - R0, cy_, cx_ + R0, cy_], fill=k.c(PLASTIC_GREY)[1], width=2)
        d.ellipse([cx_ - R0 * .78, cy_ - R0 * .7, cx_ + R0 * .78, cy_ + R0 * .7], fill=k.c(PLASTIC_GREY)[2], outline=OUT)
        k.rect(X1 - W * .2, Y1 - H * .3, X1 - 3, Y1 - H * .16, k.c(PLASTIC_GREY))                                 # the foot pedal on its lead
        d.line([cx_ + R0 * .6, cy_ + R0 * .5, X1 - W * .12, Y1 - H * .3], fill=OUT, width=2)
    elif stg in "WN":
        k.sh(cx_ - R0, cy_ - R0, cx_ + R0, cy_ + R0, 4, "ellipse")
        k.disc(cx_, cy_, R0, R0 * .9, k.paint)
        d.ellipse([cx_ - R0 * .78, cy_ - R0 * .7, cx_ + R0 * .78, cy_ + R0 * .7], fill=k.paint[1], outline=OUT)   # the splash pan
        k.rect(cx_ + R0 * .5, cy_ + R0 * .5, X1 - 2, Y1 - H * .2, k.c(STEEL))                                        # the motor and pedal
    elif stg == "F":
        k.sh(cx_ - R0, cy_ - R0, cx_ + R0, cy_ + R0, 4, "ellipse"); k.disc(cx_, cy_, R0, R0 * .9, k.comp)
        d.ellipse([cx_ - R0 + 3, cy_ - R0 * .9 + 3, cx_ + R0 - 3, cy_ + R0 * .9 - 3], outline=k.glow[1], width=4)
        k.rect(cx_ + R0 * .5, cy_ + R0 * .5, X1 - 2, Y1 - H * .2, k.comp); k.glowline(cx_ + R0 * .55, Y1 - H * .23, X1 - 5, Y1 - H * .23, 3)
    else:
        kw = k.c(STONE) if S in ("southasia", "africa") else k.wood
        k.sh(cx_ - R0, cy_ - R0, cx_ + R0, cy_ + R0, 4, "ellipse"); k.disc(cx_, cy_, R0, R0 * .92, kw)
        for a in range(0, 360, 45): d.line([cx_, cy_, cx_ + R0 * .9 * math.cos(math.radians(a)), cy_ + R0 * .82 * math.sin(math.radians(a))], fill=kw[1])
        if S in ("eastasia", "southasia", "africa"): d.ellipse([cx_ + R0 * .7 - 2, cy_ - 2, cx_ + R0 * .7 + 2, cy_ + 2], fill=OUT)   # the stick hole
        if stg == "V": k.rect(X0 + 2, cy_ - R0 * .2, X0 + 8, Y1 - 4, k.c(IRON)); k.rect(X1 - 8, cy_ - R0 * .2, X1 - 2, Y1 - 4, k.c(IRON))
    # the wheel head and the pot on it
    hr = R0 * .5; k.disc(cx_, cy_, hr, hr * .92, k.c(R_((120, 110, 100), 10)) if stg not in "WNF" else k.c(STEEL))
    pr_ = hr * (.8 if v.get("work", "pot") == "pot" else .55)
    k.disc(cx_, cy_, pr_, pr_ * .95, CL)
    for rr in (pr_ * .75, pr_ * .5): d.ellipse([cx_ - rr, cy_ - rr * .95, cx_ + rr, cy_ + rr * .95], outline=CL[1 if rr > pr_ * .6 else 0])
    d.ellipse([cx_ - pr_ * .3, cy_ - pr_ * .3, cx_ + pr_ * .3, cy_ + pr_ * .3], fill=CL[0]); d.arc([cx_ - pr_ + 2, cy_ - pr_ + 2, cx_ + pr_ - 2, cy_ + pr_ - 2], 200, 250, fill=CL[4])
    # seat, clay and water
    if stg == "N": k.disc(k.cx, Y1 - H * .09, H * .09, H * .08, k.c(PLASTIC_GREY))                           # a round stool
    elif S not in ("southasia", "africa") or stg in "WNF":
        k.sh(k.fx(.3), Y1 - H * .14, k.fx(.7), Y1, 3); k.rect(k.fx(.3), Y1 - H * .14, k.fx(.7), Y1, k.wood if stg != "F" else k.comp)
    k.blob(X0 + W * .12, Y1 - H * .12, W * .09, H * .08, CL, n=5)
    pot(k, X1 - W * .12, Y1 - H * .12, W * .09, k.m("clay"), fill=WATER)
    for i in range(int(2 + k.wealth)):                                                                       # pots drying
        px_ = X0 + 6 + i * W * .14
        if px_ > X1 - 8: break
        k.disc(px_, Y0 + 6, 5, 5, CL, lv=3); d.ellipse([px_ - 2, Y0 + 4, px_ + 2, Y0 + 8], fill=CL[0])
    if k.cond == "broken": d.polygon([(cx_ - pr_, cy_), (cx_, cy_ + pr_ * .6), (cx_ + pr_, cy_ - pr_ * .2), (cx_ + pr_ * .4, cy_ + pr_)], fill=CL[1], outline=OUT)   # the pot collapsed
    k.wear(X0, Y0, X1, Y1, CL)


SOILS = {"central": (104, 84, 64), "atlantic": (84, 70, 58), "northern": (70, 64, 60), "mediterranean": (150, 110, 80), "islamic": (190, 160, 120),
         "steppe": (160, 140, 100), "southasia": (160, 84, 60), "eastasia": (186, 160, 100), "seasia": (140, 80, 60), "africa": (170, 80, 50),
         "americas": (130, 76, 56), "oceania": (180, 120, 80), "polar": (120, 120, 116)}


# barks and woods of each land's logs
BARKS = {"central": R_((96, 76, 60), 12), "atlantic": R_((84, 70, 60), 12), "northern": BIRCH, "mediterranean": R_((120, 104, 90), 12),
         "islamic": R_((140, 112, 80), 12), "steppe": R_((110, 96, 80), 12), "southasia": R_((104, 84, 56), 12), "eastasia": R_((130, 96, 80), 12),
         "seasia": R_((150, 140, 90), 12), "africa": R_((70, 56, 50), 10), "americas": R_((140, 76, 60), 12), "oceania": R_((160, 150, 130), 12),
         "polar": R_((180, 176, 168), 10)}


def shavings(k, x0, y0, x1, y1, n=6, C=None):
    """Curls of shavings and chips on the floor, in small clusters."""
    C = C or k.c(R_((222, 196, 140), 10)); r = k.rng
    for _ in range(n):
        px_, py_ = r.uniform(x0, max(x0 + 1, x1 - 6)), r.uniform(y0, max(y0 + 1, y1 - 4))
        k.d.arc([px_, py_, px_ + 6, py_ + 4], 180, 360, fill=C[3], width=2); k.d.point((px_ + 1, py_ + 3), fill=C[1])


def lathe(tm, x, y, w, h, st, v):
    """A lathe from above. Dark Ages to Age of Reason, in Europe: the pole lathe, a bed of two rails on legs with its two
    poppets and the work between them, the cord running up to the springy pole overhead and down to the treadle;
    the Islamic world, Asia and Africa: the bow lathe on the floor, the turner's mat beside it. Victorian: the treadle
    lathe on a cast frame with its flywheel; 20th century and Modern: the engine lathe, headstock, chuck, carriage and
    tailstock in the maker's paint; Future: a sealed turning centre with a lit window."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    work = k.c(R_((214, 180, 120), 12)) if v.get("work", "wood") == "wood" else k.c(STEEL)
    if stg in "ME" and S in ("islamic", "southasia", "eastasia", "seasia", "africa", "steppe"):
        mat(k, X0, k.fy(.45), k.fx(.45), Y1, k.m("straw")); k.pattern(X0 + 3, k.fy(.6), k.fx(.42), Y1 - 3) if k.wealth >= 2 else None
        k.sh(k.fx(.4), k.fy(.25), X1, k.fy(.6), 3); log(k, k.fx(.4), k.fy(.3), X1 - 2, k.fy(.55), k.c(BARKS[S]))
        for px_ in (k.fx(.52), k.fx(.88)): k.rect(px_ - 3, k.fy(.15), px_ + 3, k.fy(.6), k.wood)
        k.rect(k.fx(.54), k.fy(.35), k.fx(.86), k.fy(.45), work)
        for gx in range(int(k.fx(.58)), int(k.fx(.84)), 8): d.line([gx, k.fy(.35), gx, k.fy(.45)], fill=work[0])
        d.arc([k.fx(.5), k.fy(.05), k.fx(.95), k.fy(.5)], 180, 360, fill=k.wood[1], width=3); d.line([k.fx(.5), k.fy(.27), k.fx(.95), k.fy(.27)], fill=k.c(LINEN)[2])   # the bow
        shavings(k, k.fx(.5), k.fy(.65), X1 - 4, Y1 - 3, 7)
        k.wear(k.fx(.4), k.fy(.3), X1, k.fy(.55)); return
    if stg in "ME":
        k.bar(X0 + 2, Y0 + 4, X1 - 2, Y0 + 6, k.c(BARKS[S]), 3)                                                    # the spring pole overhead
        k.sh(X0 + W * .08, k.fy(.35), X1 - W * .08, k.fy(.7), 4)
        for lx in (X0 + W * .08, X1 - W * .12):
            for ly in (k.fy(.33), k.fy(.68)): k.disc(lx + 3, ly, 4, 4, k.wood, lv=1)
        k.rect(X0 + W * .06, k.fy(.4), X1 - W * .06, k.fy(.47), k.wood); k.rect(X0 + W * .06, k.fy(.55), X1 - W * .06, k.fy(.62), k.wood)
        for px_ in (k.fx(.3), k.fx(.68)): k.rect(px_ - 5, k.fy(.3), px_ + 5, k.fy(.7), k.wood, lv=3)
        k.rect(k.fx(.3) + 5, k.fy(.45), k.fx(.68) - 5, k.fy(.55), work)
        for gx in range(int(k.fx(.36)), int(k.fx(.64)), 9): d.line([gx, k.fy(.45), gx, k.fy(.55)], fill=work[0])
        d.line([k.fx(.45), Y0 + 6, k.fx(.45), k.fy(.5)], fill=k.c(LINEN)[1]); d.line([k.fx(.45), k.fy(.5), k.fx(.48), Y1 - 6], fill=k.c(LINEN)[1])
        k.bar(k.fx(.2), Y1 - 5, k.fx(.75), Y1 - 8, k.wood, 4)                                                       # the treadle
        shavings(k, k.fx(.35), k.fy(.72), k.fx(.7), Y1 - 10, 5)
    elif stg == "F" and k.make != "wood":
        if k.make == "bench": k.rect(X0, Y0 + 2, X1, Y1 - 2, k.c(R_((90, 90, 96), 10)), lv=1); k.X0 = X0 = k.fx(.15); k.W = W = W * .7; k.X1 = X1 = X0 + W
        k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0 + 1, Y0 + 2, X1 - 1, Y1 - 2, 6)
        if k.make == "long": d.rectangle([X0 + 6, k.fy(.76), X1 - 6, Y1 - 6], fill=k.glow[0], outline=k.glow[2])
        d.rectangle([k.fx(.2), k.fy(.25), k.fx(.7), k.fy(.7)], fill=k.glow[0], outline=k.glow[1])
        k.disc(k.fx(.3), k.cy, H * .18, H * .18, k.c(STEEL)); k.rect(k.fx(.32), k.cy - 3, k.fx(.62), k.cy + 3, work)
        k.rect(k.fx(.78), k.fy(.25), k.fx(.94), k.fy(.7), k.comp, lv=3); d.rectangle([k.fx(.8), k.fy(.3), k.fx(.92), k.fy(.5)], fill=k.glow[2])
    elif k.make == "wood":                                                                          # a wood-turning lathe: twin bed bars, a tool rest, no carriage
        C = k.paint if stg != "F" else k.comp
        k.sh(X0 + 2, k.fy(.3), X1 - 2, k.fy(.75), 4)
        for gy in (k.fy(.4), k.fy(.58)): k.bar(X0 + 4, gy, X1 - 4, gy, k.c(STEEL), 5)
        k.rect(X0 + 2, k.fy(.25), k.fx(.2), k.fy(.78), C, lv=3); k.rect(k.fx(.84), k.fy(.3), X1 - 2, k.fy(.72), C, lv=3)
        k.rect(k.fx(.22), k.cy - 5, k.fx(.82), k.cy + 5, work)
        for gx in range(int(k.fx(.3)), int(k.fx(.8)), 10): d.line([gx, k.cy - 5, gx, k.cy + 5], fill=work[0])
        k.bar(k.fx(.3), k.fy(.68), k.fx(.75), k.fy(.68), k.c(IRON), 3); k.bar(k.fx(.5), k.fy(.68), k.fx(.5), k.fy(.85), k.c(IRON), 3)   # the tool rest
        if stg == "F": k.glowline(X0 + 4, k.fy(.27), k.fx(.18), k.fy(.27))
        shavings(k, k.fx(.25), k.fy(.8), k.fx(.85), Y1 - 1, 8)
    else:
        C = k.paint
        k.sh(X0 + 2, k.fy(.2), X1 - 2, k.fy(.85), 4)
        if k.make == "bench":                                                                          # a bench lathe on its bench
            k.rect(X0, k.fy(.1), X1, k.fy(.92), k.c(R_((120, 90, 60), 12)), lv=1)
            k.X0 = X0 = k.fx(.15); k.W = W = W * .68; k.X1 = X1 = X0 + W
        if k.make == "long": k.rect(X0 + 2, k.fy(.7), X1 - 2, Y1 - 1, k.c(IRON), lv=0); d.rectangle([X0 + 6, k.fy(.74), X1 - 6, Y1 - 4], fill=k.c(R_((60, 70, 60), 8))[1])   # the coolant tray
        if stg == "V":
            d.ellipse([k.fx(.04), k.fy(.62), k.fx(.3), Y1 - 1], outline=OUT, width=4); d.ellipse([k.fx(.04) + 1, k.fy(.62) + 1, k.fx(.3) - 1, Y1 - 2], outline=k.c(IRON)[2], width=2)   # the flywheel
            k.bar(k.fx(.1), Y1 - 3, k.fx(.6), Y1 - 3, k.c(IRON), 3)
        k.rect(X0 + 2, k.fy(.35), X1 - 2, k.fy(.65), C)                                                            # the bed
        d.line([X0 + 4, k.fy(.42), X1 - 4, k.fy(.42)], fill=k.c(STEEL)[3]); d.line([X0 + 4, k.fy(.58), X1 - 4, k.fy(.58)], fill=k.c(STEEL)[3])
        k.rect(X0 + 2, k.fy(.15), k.fx(.25), k.fy(.82), C, lv=3)                                                   # the headstock
        if stg in "WN": d.line([k.fx(.12), Y0 + 2, k.fx(.12), k.fy(.15)], fill=k.c(LEATHER)[1], width=3)           # the belt
        k.disc(k.fx(.28), k.cy, H * .17, H * .17, k.c(STEEL)); d.line([k.fx(.28), k.cy - H * .17, k.fx(.28), k.cy + H * .17], fill=OUT)   # the chuck
        k.rect(k.fx(.3), k.cy - 3, k.fx(.75), k.cy + 3, work)
        k.rect(k.fx(.48), k.fy(.25), k.fx(.6), k.fy(.88), C, lv=1); k.rect(k.fx(.5), k.fy(.62), k.fx(.58), k.fy(.7), k.c(STEEL))   # the carriage
        k.rect(k.fx(.78), k.fy(.25), k.fx(.92), k.fy(.75), C, lv=3); k.disc(k.fx(.95), k.cy, 4, 4, k.c(STEEL))               # the tailstock
        if stg == "N": d.rectangle([k.fx(.05), k.fy(.25), k.fx(.18), k.fy(.4)], fill=k.c(R_((240, 200, 40), 10))[2], outline=OUT)   # the control box
        shavings(k, k.fx(.35), k.fy(.68), k.fx(.7), Y1 - 2, 4, k.c(STEEL) if v.get("work") == "metal" else None)
    if k.rich and stg in "MEV": k.ornament(X0 + W * .06, k.fy(.4), X1 - W * .06, k.fy(.62))
    if k.poor: k.ornament(X0 + W * .06, k.fy(.4), X1 - W * .06, k.fy(.47))
    if k.cond == "broken": d.line([k.fx(.6), k.fy(.3), k.fx(.66), k.fy(.7)], fill=OUT, width=3); d.polygon([(k.fx(.55), Y1 - 2), (k.fx(.6), Y1 - 8), (k.fx(.64), Y1 - 2)], fill=work[2], outline=OUT)
    k.wear(X0 + W * .06, k.fy(.4), X1 - W * .06, k.fy(.62))


def sawpit(tm, x, y, w, h, st, v):
    """A saw pit from above: the long pit, earth-walled in the Middle Ages, boarded in the Renaissance and bricked by
    the Victorians, two sills across it carrying the log; the log snapped with a chalk line and half sawn along it,
    the long pit saw standing in the kerf with its tiller handle, the sawdust heaped in the pit below. East and South
    Asia: a frame saw instead. The land's own timber and bark."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    E_ = k.c(R_(SOILS[S], 14))
    px0, px1, py0, py1 = X0 + W * .04, X1 - W * .04, Y0 + H * .12, Y1 - H * .12
    d.rounded_rectangle([X0, Y0 + 1, X1, Y1 - 1], 8, fill=E_[3], outline=E_[1])                                # the trodden and thrown-up earth round it
    lining = k.wood if stg == "E" else k.m("clay") if stg == "V" else E_
    d.rectangle([px0, py0, px1, py1], fill=E_[0], outline=OUT)
    d.rectangle([px0, py0, px1, py0 + 5], fill=lining[2]); d.line([px0, py0 + 5, px1, py0 + 5], fill=OUT)
    if stg == "V":
        for gx in range(int(px0), int(px1), 8): d.line([gx, py0, gx, py0 + 5], fill=lining[0])
    elif stg == "E":
        for gx in range(int(px0) + 20, int(px1), 30): d.line([gx, py0, gx, py0 + 5], fill=lining[0])
    k.blob(k.fx(.55), k.fy(.72), W * .08, H * .12, k.c(R_((214, 186, 130), 12)), n=6)                            # sawdust in the pit
    for sx in (k.fx(.28), k.fx(.74)): log(k, sx - 6, Y0 + 1, sx + 6, Y1 - 1, k.c(BARKS[S]), along="y")            # the sills
    bark = k.c(BARKS[S]); ly0, ly1 = k.fy(.32), k.fy(.68)
    log(k, X0 + W * .07, ly0, X1 - W * .07, ly1, bark)
    cutx = k.fx(.5 if v.get("work", "half") == "half" else .25 if v["work"] == "begun" else .75)
    face = k.c(R_((222, 190, 136), 12)) if S not in ("africa", "southasia", "seasia") else k.c(R_((176, 110, 70), 14))
    d.rectangle([cutx, ly0 + 4, X1 - W * .07 - 4, ly1 - 4], fill=face[2]); d.line([cutx, k.cy, X1 - W * .07 - 2, k.cy], fill=OUT, width=2)   # the sawn face and the kerf
    for gx in range(int(cutx) + 6, int(X1 - W * .07) - 6, 12): d.line([gx, ly0 + 5, gx + 6, ly0 + 5], fill=face[1])
    d.line([X0 + W * .07 + 4, k.cy, cutx, k.cy], fill=k.acc2[3] if S != "central" else k.c(R_((60, 80, 160), 10))[3])   # the chalk line ahead of the cut
    if S in ("eastasia", "southasia", "seasia"):
        d.rectangle([cutx - 10, ly0 - 10, cutx + 10, ly1 + 10], outline=OUT, width=4); d.rectangle([cutx - 9, ly0 - 9, cutx + 9, ly1 + 9], outline=k.wood[3], width=2)   # the frame saw
    else:
        d.line([cutx, ly0 - 12, cutx, ly1 + 12], fill=k.c(STEEL)[3], width=2)
        k.bar(cutx - 12, ly0 - 12, cutx + 12, ly0 - 12, k.wood, 3); k.bar(cutx - 8, ly1 + 12, cutx + 8, ly1 + 12, k.wood, 3)   # the tiller and the box
    if k.rich: k.ornament(px0, py0, px1, py0 + 5)
    if k.cond == "broken": d.polygon([(k.fx(.62), py1), (k.fx(.7), py1 - 8), (k.fx(.8), py1)], fill=E_[3], outline=OUT)   # the side caved in
    k.wear(X0 + W * .07, ly0, X1 - W * .07, ly1, bark)


def sawhorse(tm, x, y, w, h, st, v):
    """A sawbuck with a log on it: two crossed trestles joined by a rail, seen from above as two crosses with the legs'
    feet splayed past the log; medieval ones of forked poles lashed together, later ones joined and pegged; Modern: a
    folding steel trestle with a plank; Future: a composite trestle with a lit clamp. The log's bark is the land's."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    leg = k.wood if stg in "MEVW" else k.paint if stg == "N" else k.comp
    k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 3); mk = k.make
    if mk == "plastic":                                                                                     # moulded plastic trestles
        for cx_ in (k.fx(.18), k.fx(.82)):
            k.rrect(cx_ - W * .12, Y0 + 2, cx_ + W * .12, Y1 - 2, 4, leg)
            for gy in range(int(Y0) + 8, int(Y1) - 6, 7): d.line([cx_ - W * .1, gy, cx_ + W * .1, gy], fill=leg[1])
    elif mk == "log":                                                                                       # a welded log horse: three X frames close set
        for cx_ in (k.fx(.3), k.fx(.5), k.fx(.7)):
            k.bar(cx_ - W * .07, Y0 + 2, cx_ + W * .07, Y1 - 2, leg, 4); k.bar(cx_ + W * .07, Y0 + 2, cx_ - W * .07, Y1 - 2, leg, 4)
        k.bar(k.fx(.3), Y0 + 4, k.fx(.7), Y0 + 4, leg, 3); k.bar(k.fx(.3), Y1 - 4, k.fx(.7), Y1 - 4, leg, 3)
    else:
        for cx_ in (k.fx(.2), k.fx(.8)):
            k.bar(cx_ - W * .1, Y0 + 2, cx_ + W * .1, Y1 - 2, leg, 6); k.bar(cx_ + W * .1, Y0 + 2, cx_ - W * .1, Y1 - 2, leg, 6)
            if stg == "M" or k.poor: d.rectangle([cx_ - 3, k.cy - 3, cx_ + 3, k.cy + 3], fill=k.c(R_((170, 150, 108), 14))[2], outline=OUT)   # the lashing
            else: k.disc(cx_, k.cy, 3, 3, k.c(IRON) if stg != "M" else leg)
        k.bar(k.fx(.2), k.fy(.8), k.fx(.8), k.fy(.8), leg, 3)
    load = v.get("load", "log")
    if load == "plank" or stg == "N" and not k.glob:
        k.rect(X0 + 2, k.fy(.3), X1 - 2, k.fy(.6), k.c(R_((214, 186, 130), 12))); d.line([X0 + 4, k.fy(.45), X1 - 4, k.fy(.45)], fill=k.c(R_((214, 186, 130), 12))[1])
    else:
        log(k, X0 + 2, k.fy(.22) if stg not in "NF" else k.fy(.32), X1 - 2, k.fy(.72) if stg not in "NF" else k.fy(.6), k.c(BARKS[S]))
        if load == "half-cut": d.line([k.fx(.55), k.fy(.28), k.fx(.55), k.fy(.66)], fill=OUT, width=2); shavings(k, k.fx(.45), Y1 - 8, k.fx(.7), Y1 - 2, 4, k.c(R_((222, 196, 140), 10)))
    if stg == "F": k.glowline(k.fx(.18), k.fy(.25), k.fx(.18), k.fy(.7), 3); k.glowline(k.fx(.82), k.fy(.25), k.fx(.82), k.fy(.7), 3)
    if stg in "NF":                                                                                          # a chainsaw laid by
        k.rect(k.fx(.2), Y1 - 11, k.fx(.38), Y1 - 1, k.paint if stg == "N" else k.comp); k.bar(k.fx(.38), Y1 - 6, k.fx(.38) + W * (.2 + .05 * k.wealth), Y1 - 6, k.c(STEEL), 4)
        if stg == "F": k.glowline(k.fx(.22), Y1 - 3, k.fx(.36), Y1 - 3)
    else:                                                                                                    # the saw laid across, with the land's handle
        k.bar(k.fx(.3), Y1 - 4, k.fx(.75), Y1 - 6, k.c(STEEL), 2); k.rect(k.fx(.25), Y1 - 8, k.fx(.32), Y1 - 2, k.acc if not k.poor else k.wood)
    if k.rich: k.ornament(X0 + 2, k.fy(.28), X1 - 2, k.fy(.66))
    if k.cond == "broken": k.bar(k.fx(.8), k.cy, X1 - 1, Y1 - 1, leg, 3); d.line([k.fx(.78), k.fy(.2), k.fx(.84), k.fy(.4)], fill=OUT, width=2)
    k.wear(X0 + 2, k.fy(.28), X1 - 2, k.fy(.66), k.c(BARKS[S]))


def chopping(tm, x, y, w, h, st, v):
    """A chopping block from above: a round of trunk stood on end, its rings and bark rim, the axe bitten into the top
    with its haft out to the south-east, chips and split billets round it. Dark Ages: a bearded axe; Renaissance to
    Victorian: a broad felling axe; 20th century: a hickory-hafted axe; Modern: a splitting maul with a plastic haft;
    Future: a composite axe with a lit edge. The bark and the axe head are the land's."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    cx_, cy_ = k.fx(.44), k.fy(.44); r = min(W, H) * .33
    bark = k.c(BARKS[S]); face = k.c(R_(mix(STY[S]["wood"][3], (230, 210, 170), .45), 12))
    # chips and billets first, under the block's shadow side
    C = k.c(R_((222, 196, 140), 10))
    for i in range(3 + k.wealth // 2):
        a = .6 + i * 1.3; bx, by = cx_ + math.cos(a) * r * 1.35, cy_ + math.sin(a) * r * 1.35
        k.rect(bx - 5, by - 3, bx + 5, by + 3, C if i % 2 else bark, lv=2)
    shavings(k, X0 + 2, Y1 - 10, X1 - 4, Y1 - 2, 4)
    k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 4, "ellipse"); k.disc(cx_, cy_, r, r, bark)
    d.ellipse([cx_ - r + 3, cy_ - r + 3, cx_ + r - 3, cy_ + r - 3], fill=face[2], outline=bark[0])
    for rr in (r * .65, r * .35): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=face[1])
    if k.cond != "new":
        for a in (.3, 2.2, 4): d.line([cx_ + math.cos(a) * r * .9, cy_ + math.sin(a) * r * .9, cx_ + math.cos(a) * r * .3, cy_ + math.sin(a) * r * .3], fill=face[0], width=2 if k.cond == "broken" else 1)
    if k.cond == "broken": d.line([cx_ - r, cy_ + 2, cx_ + r, cy_ - 4], fill=OUT, width=2)
    # the axe: bitten in at the centre, the haft to the south-east
    hc = k.c(R_((176, 136, 86), 14)) if stg in "MEVW" else k.paint if stg == "N" else k.comp
    k.bar(cx_ + 2, cy_ + 2, cx_ + r * 1.55, cy_ + r * 1.55, hc, 3)
    if stg == "F": k.glowline(cx_ + r * .6, cy_ + r * .6, cx_ + r * 1.2, cy_ + r * 1.2)
    head = k.c(IRON) if stg in "MEV" else k.c(STEEL)
    if stg == "M": pts = [(cx_ - 7, cy_ + 5), (cx_ + 6, cy_ - 8), (cx_ + 4, cy_ - 2), (cx_ + 1, cy_ + 3)]          # the bearded blade
    elif S in ("eastasia", "seasia", "africa", "oceania"): pts = [(cx_ - 4, cy_ + 4), (cx_ + 4, cy_ - 4), (cx_ + 6, cy_ - 1), (cx_ - 1, cy_ + 6)]   # a narrow blade
    else: pts = [(cx_ - 7, cy_ + 7), (cx_ + 7, cy_ - 7), (cx_ + 8, cy_ - 3), (cx_ - 3, cy_ + 8)]
    k.poly(pts, head, lv=3)
    if k.rich: d.line([pts[0], pts[1]], fill=k.c(BRASS)[4])
    if k.poor: d.line([cx_ + r * .9, cy_ + r * .7, cx_ + r * 1.1, cy_ + r * 1.0], fill=k.c(R_((170, 150, 108), 14))[2], width=3)   # the haft bound with cord
    k.wear(cx_ - r, cy_ - r, cx_ + r, cy_ + r, face)


MEATS = {"pork": R_((214, 140, 130), 14), "beef": R_((160, 50, 50), 16), "mutton": R_((150, 60, 56), 14), "fowl": R_((226, 200, 160), 10),
         "fish": R_((170, 184, 190), 14), "game": R_((110, 70, 56), 12), "seal": R_((90, 40, 44), 12), "duck": R_((170, 90, 50), 16)}


def joint(k, cx, cy, rx, ry, kind):
    """A cut of meat, a carcass or a fish from above: red flesh with its white fat, pale fowl, silver fish."""
    d = k.d; M = k.c(MEATS.get(kind, MEATS["pork"]))
    if kind == "fish":
        d.polygon([(cx - rx, cy), (cx - rx * .3, cy - ry), (cx + rx * .6, cy - ry * .5), (cx + rx, cy - ry), (cx + rx * .8, cy), (cx + rx, cy + ry), (cx + rx * .6, cy + ry * .5), (cx - rx * .3, cy + ry)], fill=M[2], outline=OUT)
        d.line([cx - rx * .6, cy - 1, cx + rx * .5, cy - 1], fill=M[4]); d.point((cx - rx * .7, cy - 1), fill=OUT)
    elif kind in ("fowl", "duck"):
        k.blob(cx, cy, rx, ry * .8, M, n=4, jit=.08); d.line([cx + rx * .7, cy, cx + rx * 1.1, cy - ry * .4], fill=M[1], width=3)
    else:
        k.blob(cx, cy, rx, ry, M, n=5, jit=.12)
        d.arc([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], 200, 330, fill=k.c(WHITE)[3], width=2)       # the fat
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=k.c(WHITE)[3])                                         # the bone


def butcherblock(tm, x, y, w, h, st, v):
    """A butcher's block from above. Medieval: a great round of elm on three stout legs; Renaissance to Victorian: a
    square end-grain block, dished in the middle with use, iron-banded by the Victorians; 20th century: the same with an
    enamel tray; Modern: a steel table with a white cutting board; Future: a composite slab with a lit edge. On it the
    cleaver and the meat the land eats: pork, beef, mutton, fowl, fish, duck or seal, and the blood of the work."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    meat = v.get("meat") or "pork"
    endg = k.c(R_(mix(STY[S]["wood"][2], (200, 170, 120), .35), 14))
    if stg == "M":
        r = min(W, H) * .47
        for a in (-90, 30, 150): k.disc(k.cx + r * math.cos(math.radians(a)) * 1.02, k.cy + r * math.sin(math.radians(a)) * 1.02, 4, 4, k.wood, lv=1)
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 4, "ellipse"); k.disc(k.cx, k.cy, r, r, k.c(BARKS[S]))
        d.ellipse([k.cx - r + 3, k.cy - r + 3, k.cx + r - 3, k.cy + r - 3], fill=endg[2], outline=endg[0])
        for rr in (r * .7, r * .4): d.ellipse([k.cx - rr, k.cy - rr, k.cx + rr, k.cy + rr], outline=endg[1])
        tx0, ty0, tx1, ty1 = k.cx - r * .7, k.cy - r * .7, k.cx + r * .7, k.cy + r * .7
    elif stg in "EVW" or k.make == "block":
        k.sh(X0, Y0, X1, Y1, 4); k.rect(X0, Y0, X1, Y1, endg)
        if stg in "NF": d.rectangle([X0, Y0, X1, Y1], outline=k.c(STEEL)[3] if stg == "N" else k.glow[1], width=3)   # the steel or lit frame round it
        s_ = 9
        for i, gy in enumerate(range(int(Y0) + 2, int(Y1) - 2, s_)):
            for j, gx in enumerate(range(int(X0) + 2, int(X1) - 2, s_)):
                if (i + j) % 2: d.rectangle([gx, gy, min(X1 - 2, gx + s_ - 1), min(Y1 - 2, gy + s_ - 1)], fill=endg[1])
        d.ellipse([k.fx(.25), k.fy(.25), k.fx(.75), k.fy(.75)], outline=endg[3])                                   # the dish worn in it
        if stg in "VW": d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=k.c(IRON)[2], width=2)
        if stg == "W": k.rect(X1 - W * .4, Y1 - H * .3, X1 - 3, Y1 - 3, k.c(ENAMEL_W))
        tx0, ty0, tx1, ty1 = X0 + 6, Y0 + 6, X1 - 6, Y1 - 6
    elif stg == "N":
        k.sh(X0, Y0, X1, Y1, 4); k.rect(X0, Y0, X1, Y1, k.c(STEEL)); k.rect(X0 + 5, Y0 + 5, X1 - 5, Y1 - 5, k.paint)                     # a colour-coded cutting board
        tx0, ty0, tx1, ty1 = X0 + 8, Y0 + 8, X1 - 8, Y1 - 8
    else:
        k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0, Y0, X1, Y1, 6); tx0, ty0, tx1, ty1 = X0 + 7, Y0 + 7, X1 - 7, Y1 - 7
    # blood, the meat, the cleaver
    B = k.c(R_((110, 24, 30), 12)); r_ = k.rng
    for _ in range(2 + (k.cond != "new") * 3):
        bx, by = r_.uniform(tx0, tx1 - 6), r_.uniform(ty0, ty1 - 4); d.ellipse([bx, by, bx + r_.uniform(4, 8), by + r_.uniform(3, 5)], fill=B[2])
    joint(k, tx0 + (tx1 - tx0) * .4, ty0 + (ty1 - ty0) * .4, (tx1 - tx0) * .28, (ty1 - ty0) * .22, meat)
    if k.wealth >= 3: joint(k, tx0 + (tx1 - tx0) * .72, ty0 + (ty1 - ty0) * .25, (tx1 - tx0) * .15, (ty1 - ty0) * .12, meat)
    k.rect(tx0 + (tx1 - tx0) * .55, ty0 + (ty1 - ty0) * .6, tx0 + (tx1 - tx0) * .9, ty0 + (ty1 - ty0) * .85, k.c(STEEL), lv=3)     # the cleaver's blade
    k.bar(tx0 + (tx1 - tx0) * .72, ty0 + (ty1 - ty0) * .85, tx0 + (tx1 - tx0) * .72, ty1 + 4, k.acc if k.rich else k.wood, 3)
    if k.cond == "broken": d.line([k.fx(.3), Y0 + 2, k.fx(.45), Y1 - 2], fill=OUT, width=3)                          # the block split
    k.wear(X0, Y0, X1, Y1, endg)


def meathooks(tm, x, y, w, h, st, v):
    """A rail of meat hooks against the wall, seen from above: the rail along the wall, the hooks, and the carcasses
    hanging beneath it, foreshortened, the widest at the top: sides of pork, lambs, beef quarters, game birds, ducks,
    fish or seal. Medieval: a pole on wooden pegs; Renaissance to Victorian: an iron rail; 20th century and Modern: a
    steel rail over white tiles; Future: a cold rail with a lit strip."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    meat = v.get("meat") or {"eastasia": "duck", "seasia": "duck", "polar": "seal", "oceania": "fish", "islamic": "mutton", "steppe": "mutton", "africa": "game"}.get(S, "pork")
    bh = max(10, int(H * .45))                                                                                # the board or tiles behind the rail
    if stg == "N":                                                                                            # a hygienic stainless panel
        k.rect(X0, Y0, X1, Y0 + bh, k.c(STEEL), lv=3)
        for gx in range(int(X0) + 20, int(X1), 24): d.line([gx, Y0 + 1, gx, Y0 + bh - 1], fill=k.c(STEEL)[1])
        d.rectangle([X0, Y0 + bh - 3, X1, Y0 + bh], fill=k.paint[2])
    elif stg == "W":
        d.rectangle([X0, Y0, X1, Y0 + bh], fill=k.c(ENAMEL_W)[3], outline=OUT)
        k.pattern(X0 + 1, Y0 + 1, X1 - 1, Y0 + bh - 1, key="tile", A=k.paint, B=k.acc)
    elif stg == "F": k.rect(X0, Y0, X1, Y0 + bh, k.comp)
    elif stg == "V" and S in EURO and S not in ("mediterranean", "northern"):                                                  # the Victorian butcher's glazed tiles
        d.rectangle([X0, Y0, X1, Y0 + bh], fill=k.c(ENAMEL_W)[3], outline=OUT); k.pattern(X0 + 1, Y0 + 1, X1 - 1, Y0 + bh - 1, key="tile", A=k.c(ENAMEL_W), B=k.paint)
    elif stg == "V" and S == "mediterranean":                                                                # a marble slab
        k.rect(X0, Y0, X1, Y0 + bh, k.c(R_((226, 224, 218), 8)), lv=3)
        for gx in range(int(X0) + 6, int(X1) - 10, 17): d.line([gx, Y0 + 2, gx + 8, Y0 + bh - 2], fill=k.c(STONE)[1])
    elif stg == "V" and S == "islamic":                                                                      # glazed tiles in the land's blues
        k.rect(X0, Y0, X1, Y0 + bh, k.acc); k.pattern(X0 + 1, Y0 + 1, X1 - 1, Y0 + bh - 1, key="tile")
    elif stg == "V" and S == "southasia":                                                                    # lime-washed plaster with a painted band
        k.rect(X0, Y0, X1, Y0 + bh, k.c(R_((232, 226, 210), 8)), lv=3); d.rectangle([X0 + 1, Y0 + bh - 4, X1 - 1, Y0 + bh - 1], fill=k.acc[2])
    elif stg == "V" and S in ("eastasia", "seasia"):                                                         # a woven bamboo screen
        mat(k, X0, Y0, X1, Y0 + bh, k.c(R_((190, 170, 110), 12)))
    else:
        k.rect(X0, Y0, X1, Y0 + bh, k.wood)
    rail = k.wood if stg in "ME" else k.c(IRON) if stg == "V" else k.c(STEEL) if stg != "F" else k.comp
    k.bar(X0 + 2, Y0 + 4, X1 - 2, Y0 + 4, rail, 4)
    if stg == "M":
        for gx in (X0 + 6, k.cx, X1 - 6): k.rect(gx - 3, Y0, gx + 3, Y0 + 8, k.wood)
    if stg == "F": k.glowline(X0 + 4, Y0 + 1, X1 - 4, Y0 + 1)
    n = 3 + k.wealth // 2 if meat not in ("fowl", "duck", "fish", "game") else 5 + k.wealth
    sp_ = (W - 8) / n
    for i in range(n):
        cx_ = X0 + 4 + sp_ * (i + .5)
        d.line([cx_, Y0 + 4, cx_, Y0 + 10], fill=k.c(STEEL)[2], width=2)
        if k.cond == "broken" and i == n - 1:
            joint(k, cx_, Y1 - 5, sp_ * .4, 4, meat); continue                                               # fallen to the floor
        kind = meat if not (k.rich and i % 3 == 2) else ("fowl" if meat != "fowl" else "game")
        if kind in ("fish",):
            joint(k, cx_, Y0 + 10 + (H - 12) * .5, (H - 12) * .5, sp_ * .3, kind)
        else:
            M = k.c(MEATS.get(kind, MEATS["pork"]))
            top, L_ = Y0 + 8, Y1 - 1 - (Y0 + 8); hw = sp_ * .36
            pts = [(cx_ - 2, top), (cx_ + 2, top), (cx_ + hw * .7, top + L_ * .2), (cx_ + hw, top + L_ * .45), (cx_ + hw * .8, top + L_ * .85), (cx_ + hw * .3, top + L_),
                   (cx_ - hw * .3, top + L_), (cx_ - hw * .8, top + L_ * .85), (cx_ - hw, top + L_ * .45), (cx_ - hw * .7, top + L_ * .2)]
            k.sh(cx_ - hw, top, cx_ + hw, Y1 - 1, 3); k.poly(pts, M)
            d.line([cx_ - hw * .6, top + L_ * .3, cx_ - hw * .7, top + L_ * .7], fill=M[4])
            if kind in ("pork", "beef", "mutton", "seal"):
                d.line([cx_ - sp_ * .3, Y0 + 13, cx_ - sp_ * .18, Y1 - 4], fill=k.c(WHITE)[3], width=2)       # the fat and the ribs
                for gy in range(int(Y0) + 14, int(Y1) - 4, 4): d.line([cx_ - sp_ * .1, gy, cx_ + sp_ * .2, gy], fill=M[1])
            if kind == "duck": d.line([cx_ - sp_ * .2, Y0 + 13, cx_ + sp_ * .2, Y0 + 13], fill=k.c(R_((200, 120, 50), 14))[4])
    if k.cond != "new":
        B = k.c(R_((110, 24, 30), 12))
        for i in range(3): d.ellipse([X0 + W * (.2 + i * .25), Y1 - 4, X0 + W * (.2 + i * .25) + 6, Y1 - 1], fill=B[2])
    if k.rich: k.studs(X0, Y0 + 1, X1, Y0 + 7, step=18)


def _liquid(k, cx, cy, rx, ry, L, full=True, swirl=True):
    d = k.d
    if full:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=L[2], outline=L[0])
        if swirl:
            for rr in (.7, .45):
                d.arc([cx - rx * rr, cy - ry * rr, cx + rx * rr, cy + ry * rr], 200, 330, fill=L[3], width=2); d.arc([cx - rx * rr, cy - ry * rr, cx + rx * rr, cy + ry * rr], 20, 120, fill=L[1], width=2)
        d.arc([cx - rx + 3, cy - ry + 3, cx + rx - 3, cy + ry - 3], 205, 245, fill=L[4], width=2)
    else:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=k.c(EARTH)[1], outline=OUT)
        d.ellipse([cx - rx * .6, cy - ry * .5, cx + rx * .5, cy + ry * .6], fill=L[0])                              # the stained dregs


def vat(tm, x, y, w, h, st, v):
    """A dyer's or tanner's vat from above, full of its liquor or empty and stained. Europe: a great staved vat with iron
    hoops, a pole across and cloth hauled over the rim; the Islamic world: a honeycomb of stone pits, each its own
    colour, set in a limed floor; Africa: a dye pit in the ground with a raised clay rim; South and Southeast Asia: big
    earthen vats; East Asia: a great glazed jar. Victorian: a copper-lined vat in rich works; 20th century: a concrete
    tank. The liquor: indigo, madder red, weld yellow, oak-bark tan, iron black or green."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    full = st != "empty"
    L = k.c(DYES.get({"tan": "brown"}.get(v.get("liquid", "blue"), v.get("liquid", "blue")), DYES["blue"]))
    cx_, cy_ = k.cx, k.cy; r = min(W, H) * .46
    if S == "islamic" and stg in "MEV":
        k.rect(X0, Y0, X1, Y1, k.c(R_((214, 206, 186), 10)))                                                      # the limed floor
        cols = [L, k.c(DYES["red"]), k.c(DYES["yellow"]), k.c(DYES["brown"]), k.c(DYES["white"]), k.c(DYES["black"]), k.c(DYES["green"])]
        rr = r * .34
        for i, (ox, oy) in enumerate([(0, 0)] + [(math.cos(a) * r * .64, math.sin(a) * r * .64) for a in np.linspace(0, 2 * math.pi, 7)[:-1]]):
            d.ellipse([cx_ + ox - rr - 3, cy_ + oy - rr - 3, cx_ + ox + rr + 3, cy_ + oy + rr + 3], fill=k.c(STONE)[3], outline=OUT)
            _liquid(k, cx_ + ox, cy_ + oy, rr, rr, cols[i % len(cols)], full, swirl=False)
        k.wear(X0, Y0, X1, Y1, k.c(STONE)); return
    if S == "africa" and stg in "MEV":
        k.disc(cx_, cy_, r, r, k.m("clay")); d.ellipse([cx_ - r + 6, cy_ - r + 6, cx_ + r - 6, cy_ + r - 6], fill=OUT)
        _liquid(k, cx_, cy_, r - 8, r - 8, L, full)
        pot(k, X1 - 12, Y1 - 12, 10, k.m("clay"), fill=L)
    elif S in ("southasia", "seasia", "eastasia") and stg in "MEV":
        C = k.m("clay") if S != "eastasia" else k.c(R_((90, 60, 44), 14))
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse"); k.disc(cx_, cy_, r, r, C)
        d.ellipse([cx_ - r * .8, cy_ - r * .8, cx_ + r * .8, cy_ + r * .8], fill=C[3], outline=C[0])                # the jar's shoulder and its lip
        _liquid(k, cx_, cy_, r * .66, r * .66, L, full)
        if S == "eastasia": d.arc([cx_ - r + 3, cy_ - r + 3, cx_ + r - 3, cy_ + r - 3], 190, 260, fill=k.c(WHITE)[3], width=2)
    elif stg == "W":
        k.sh(X0, Y0, X1, Y1, 5); k.rect(X0, Y0, X1, Y1, k.paint); k.pattern(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, key="check", A=k.paint, B=k.c(STONE))
        d.rectangle([X0 + 12, Y0 + 12, X1 - 12, Y1 - 12], fill=OUT); k.rect(X0 + 10, Y0 + 10, X1 - 10, Y0 + 14, k.c(STONE))
        _liquid(k, cx_, cy_, r - 14, r - 14, L, full); k.rect(X0, cy_ - 5, X1, cy_ + 5, k.c(IRON))                    # a grating walkway across
    else:
        C = k.wood; k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse")
        k.rect(X0, Y0 + H * .1, X0 + W * .3, Y1 - H * .1, k.wood, lv=1)                                                 # the dyer's plank stage
        k.disc(cx_, cy_, r, r, C)
        for a in range(0, 360, 12): d.line([cx_ + r * math.cos(math.radians(a)), cy_ + r * math.sin(math.radians(a)), cx_ + (r - 12) * math.cos(math.radians(a)), cy_ + (r - 12) * math.sin(math.radians(a))], fill=C[0])
        hoop = k.c(COPPER) if (stg == "V" and k.rich) else k.c(IRON)
        for rr in (r - 1, r - 6, r - 11): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=hoop[2], width=2)
        _liquid(k, cx_, cy_, r - 13, r - 13, L, full)
        k.bar(cx_ - r - 1, cy_ - r * .3, cx_ + r + 1, cy_ - r * .3, k.wood, 4)                                         # the pole across
        if full: cloth_web(k, cx_ + r * .3, cy_ - r * .3, cx_ + r * .55, cy_ + r * .5, L)                             # cloth hauled over the pole
    if k.rich and stg in "MEV": k.studs(cx_ - r * .5, cy_ + r * .82, cx_ + r * .5, cy_ + r * .95)
    if k.cond == "broken": d.line([cx_ + r * .5, cy_ + r * .5, cx_ + r * .9, cy_ + r * .2], fill=OUT, width=3); k.blob(cx_ + r * .85, cy_ + r * .7, r * .15, r * .1, L, n=5)
    k.wear(cx_ - r * .7, cy_ + r * .6, cx_ + r * .7, cy_ + r * .95, k.wood)


def mashtun(tm, x, y, w, h, st, v):
    """A brewer's mash tun from above, full of steaming mash or empty. Medieval to Age of Reason: a staved oak tun with
    iron hoops and the mash oar; the north: juniper boughs on the false bottom; Victorian: an iron-hooped tun with the
    rotating sparge arm; 20th century: a copper-hooded tun with its manway; Modern: a steel vessel with its pipes;
    Future: a sealed composite vessel. East Asia: rice mash in a cedar tub; Africa, the Americas and South Asia: the
    beer brewed in great earthen pots, sorghum, maize or rice."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    full = st != "empty"; grain = v.get("grain") or {"eastasia": "rice", "seasia": "rice", "southasia": "rice", "africa": "sorghum", "americas": "maize"}.get(S, "barley")
    G = k.c({"barley": R_((196, 164, 104), 14), "rice": R_((232, 228, 214), 8), "sorghum": R_((170, 104, 80), 14), "maize": R_((222, 186, 80), 14),
             "oats": R_((206, 190, 150), 12), "rye": R_((150, 120, 90), 12)}.get(grain, R_((196, 164, 104), 14)))
    cx_, cy_ = k.cx, k.cy; r = min(W, H) * .46
    def mash(cx, cy, rr):
        if not full:
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=k.c(EARTH)[1], outline=OUT); k.strokes(cx - rr * .5, cy - rr * .3, cx + rr * .4, cy + rr * .3, G, rr * .6); return
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=G[2], outline=G[0])
        for _ in range(int(rr * 1.4)):
            a = k.rng.uniform(0, 6.28); q = k.rng.uniform(0, rr * .85); px_, py_ = cx + math.cos(a) * q, cy + math.sin(a) * q
            d.ellipse([px_ - 2, py_ - 1, px_ + 2, py_ + 1], fill=G[1 if k.rng.random() < .5 else 3])
        d.arc([cx - rr * .6, cy - rr * .7, cx + rr * .2, cy - rr * .1], 180, 300, fill=k.c(WHITE)[4], width=2)            # steam rising
    if S in ("africa", "americas", "southasia", "seasia") and stg in "MEV":
        for ox, oy, rr in ((-.42, -.42, .5), (.42, -.4, .45), (-.35, .45, .45), (.45, .45, .4)):
            px_, py_ = cx_ + ox * r, cy_ + oy * r
            k.sh(px_ - rr * r, py_ - rr * r, px_ + rr * r, py_ + rr * r, 3, "ellipse"); k.disc(px_, py_, rr * r, rr * r, k.m("clay"))
            if k.wealth >= 2: d.arc([px_ - rr * r + 2, py_ - rr * r + 2, px_ + rr * r - 2, py_ + rr * r - 2], 0, 360, fill=k.acc[2], width=2)
            mash(px_, py_, rr * r * .6)
        k.rect(cx_ - 4, Y0 + 2, cx_ + 4, Y1 - 2, k.wood) if k.wealth >= 3 else None
        k.wear(X0, Y0, X1, Y1, k.m("clay")); return
    if stg in "MEV" or S == "eastasia" and stg != "F":
        C = k.wood if S != "eastasia" else k.c(R_((200, 160, 110), 12))
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse"); k.disc(cx_, cy_, r, r, C)
        for a in range(0, 360, 10): d.line([cx_ + r * math.cos(math.radians(a)), cy_ + r * math.sin(math.radians(a)), cx_ + (r - 7) * math.cos(math.radians(a)), cy_ + (r - 7) * math.sin(math.radians(a))], fill=C[0])
        hoopC = k.c(R_((150, 120, 70), 12)) if S == "eastasia" else k.c(COPPER) if k.rich else k.c(IRON)
        for rr in (r - 1, r - 5): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=hoopC[2], width=2)
        mash(cx_, cy_, r - 8)
        if S == "northern" and not full:
            for a in range(0, 360, 40): d.line([cx_, cy_, cx_ + (r - 12) * math.cos(math.radians(a)), cy_ + (r - 12) * math.sin(math.radians(a))], fill=k.c(R_((60, 100, 60), 14))[2], width=3)   # juniper boughs
        if stg == "V": k.bar(cx_ - r + 10, cy_, cx_ + r - 10, cy_, k.c(COPPER), 3); k.disc(cx_, cy_, 5, 5, k.c(COPPER))   # the sparge arm
        k.bar(cx_ + r * .2, cy_ + r * .1, X1 - 2, Y1 - 4, k.wood, 4); k.rect(cx_ + r * .1, cy_, cx_ + r * .35, cy_ + r * .25, k.wood)   # the mash oar
    elif stg in "WNF" and k.make in ("rect", "twin"):
        C = k.c(COPPER) if stg == "W" else k.c(STEEL) if stg == "N" else k.comp
        k.rect(X0, Y0, X1, Y1, k.paint if stg != "F" else k.c(R_((50, 54, 60), 8)))
        if k.make == "rect":                                                                                  # a square lauter tun with its rakes
            k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 5); k.rect(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, C)
            d.rectangle([X0 + 9, Y0 + 9, X1 - 9, Y1 - 9], fill=OUT); mash(cx_, cy_, r * .62) if full else None
            k.bar(X0 + 6, cy_, X1 - 6, cy_, k.c(STEEL), 4)
            for gx in np.linspace(X0 + 14, X1 - 14, 5): k.bar(gx, cy_ - 7, gx, cy_ + 7, k.c(STEEL), 2)
        else:                                                                                                 # a mash kettle and a tun side by side
            for px_ in (X0 + W * .27, X1 - W * .27):
                rr = min(W * .24, H * .42); k.sh(px_ - rr, cy_ - rr, px_ + rr, cy_ + rr, 4, "ellipse"); k.disc(px_, cy_, rr, rr, C)
                d.ellipse([px_ - rr * .5, cy_ - rr * .5, px_ + rr * .5, cy_ + rr * .5], fill=OUT); mash(px_, cy_, rr * .42) if full else None
            k.bar(X0 + W * .27, cy_ - r * .7, X1 - W * .27, cy_ - r * .7, k.c(STEEL), 4)
        if stg == "F": k.glowline(X0 + 3, Y1 - 3, X1 - 3, Y1 - 3, 3)
    elif stg in "WN":
        C = k.c(COPPER) if stg == "W" else k.c(STEEL)
        k.rect(X0, Y0, X1, Y1, k.paint); k.pattern(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, key="check", A=k.paint, B=k.c(IRON))      # the brewhouse deck
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse"); k.disc(cx_, cy_, r * .9, r * .9, C)
        for rr in (r * .75, r * .5): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=C[1])
        mx0, my0 = cx_ - r * .35, cy_ - r * .25                                                                   # the manway, open on the mash
        d.rectangle([mx0, my0, mx0 + r * .7, my0 + r * .5], fill=OUT); mash(cx_, cy_, r * .22) if full else None
        k.bar(cx_ + r, cy_, X1 - 1, cy_, k.c(STEEL), 5); k.bar(cx_, cy_ - r, cx_, Y0, k.c(STEEL), 4)
        k.rect(X0 + 2, Y1 - 16, X0 + 30, Y1 - 2, k.paint)
    else:
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse"); k.disc(cx_, cy_, r, r, k.comp)
        d.ellipse([cx_ - r + 4, cy_ - r + 4, cx_ + r - 4, cy_ + r - 4], outline=k.glow[1], width=3)
        d.ellipse([cx_ - r * .3, cy_ - r * .3, cx_ + r * .3, cy_ + r * .3], fill=k.glow[0] if full else OUT, outline=k.glow[2])
    if k.cond == "broken": d.line([cx_ - r * .9, cy_ + r * .3, cx_ - r * .5, cy_ + r * .1], fill=OUT, width=3); k.blob(cx_ - r * .9, cy_ + r * .8, r * .14, r * .1, G, n=5)
    k.wear(cx_ - r * .7, cy_ + r * .6, cx_ + r * .7, cy_ + r * .95, k.wood)


FRUIT = {"red grapes": R_((90, 40, 80), 16), "white grapes": R_((170, 190, 90), 16), "olives": R_((60, 70, 40), 12), "apples": R_((180, 70, 50), 18),
         "dates": R_((120, 70, 40), 14)}


def fruit_heap(k, cx, cy, rx, ry, F_, n=None):
    """A heap of grapes, olives or apples: small round clusters, lit tops."""
    d = k.d; r_ = k.rng
    for _ in range(n or int(rx * ry / 6)):
        a = r_.uniform(0, 6.28); q = math.sqrt(r_.uniform(0, 1)); px_, py_ = cx + math.cos(a) * rx * q, cy + math.sin(a) * ry * q
        d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=F_[2], outline=F_[0]); d.point((px_ - 1, py_ - 1), fill=F_[4])


def winepress(tm, x, y, w, h, st, v):
    """A wine, cider or oil press from above. Dark Ages and Long Night: the great beam press, the beam pivoted in its
    posts at the west and weighted with a stone at the east, the basket of fruit under its middle; Renaissance and Age
    of Reason: the twin-cheeked screw press with its great wooden screw and capstan bar; Victorian: the round slatted
    basket press with its iron screw and ratchet; 20th century: the hydraulic press with cloth-wrapped cheeses; Modern:
    a steel pneumatic press beside bins of fruit; Future: a sealed press. Grapes for wine, olives (pressed in stacked
    mats) for oil, apples for cider, dates for syrup; the juice runs down the channel into a tub."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fr = v.get("fruit") or {"atlantic": "apples", "islamic": "olives"}.get(S, "red grapes"); F_ = k.c(FRUIT.get(fr, FRUIT["red grapes"]))
    juice = k.c(R_((110, 30, 60), 14) if fr == "red grapes" else R_((170, 150, 50), 14) if fr in ("white grapes", "apples") else R_((90, 100, 40), 12) if fr == "olives" else R_((110, 60, 30), 12))
    bed = k.c(STONE) if S in ("mediterranean", "islamic") else k.wood
    cx_, cy_ = k.fx(.45), k.fy(.45)
    def basket(cx, cy, r):
        if fr == "olives":
            for i in range(4): k.disc(cx, cy - i * 2, r - i, r - i, k.c(R_((150, 110, 70), 12)))                     # the stacked fiscoli mats
            d.ellipse([cx - r * .3, cy - 6 - r * .3, cx + r * .3, cy - 6 + r * .3], fill=k.c(R_((150, 110, 70), 12))[0])
        else:
            k.disc(cx, cy, r, r, k.wood); fruit_heap(k, cx, cy, r - 4, r - 4, F_)
            for a in range(0, 360, 20): d.line([cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), cx + (r - 3) * math.cos(math.radians(a)), cy + (r - 3) * math.sin(math.radians(a))], fill=k.wood[0])
    if stg in "MEV" and k.poor and fr in ("red grapes", "white grapes", "apples"):                           # the poor tread or pound the fruit in a great tub
        r = min(W * .36, H * .44); tx, ty = k.fx(.4), k.cy
        bucket(k, tx, ty, r, k.wood if S not in ("mediterranean", "islamic") else k.c(STONE), fill=juice)
        fruit_heap(k, tx, ty, r * .8, r * .8, F_)
        for fx_, fy_ in ((-.25, -.1), (.2, .15)): d.ellipse([tx + fx_ * r - 4, ty + fy_ * r - 6, tx + fx_ * r + 4, ty + fy_ * r + 6], fill=juice[1], outline=OUT)   # the treader's footprints
        k.bar(tx + r, ty, X1 - W * .18, ty, juice, 3); bucket(k, X1 - W * .12, ty, H * .16, k.wood, fill=juice)
        if fr == "apples": k.bar(tx - r * .3, ty - r * .3, tx + r * .6, Y0 + 2, k.wood, 4)                         # the pounding pole
        if k.cond == "broken": d.line([tx - r * .7, ty + r * .5, tx - r * .2, ty + r * .9], fill=OUT, width=3)
        k.wear(X0, Y0, X1, Y1, k.wood); return
    if stg in "MEV":
        k.sh(X0 + W * .1, Y0 + H * .1, X1 - W * .1, Y1 - H * .2, 4)
        k.rect(X0 + W * .15, Y0 + H * .12, X1 - W * .2, Y1 - H * .22, bed)                                      # the press bed
        d.rectangle([X0 + W * .18, Y0 + H * .16, X1 - W * .23, Y1 - H * .26], outline=juice[1], width=2)        # its juice channel
        k.bar(k.fx(.45), Y1 - H * .22, k.fx(.45), Y1 - H * .14, juice, 3)                                         # the spout
        bucket(k, k.fx(.45), Y1 - H * .1, H * .1, k.wood, fill=juice)
        for i in range(1 + k.wealth // 2):                                                                        # baskets of fruit along the west side
            by_ = Y0 + H * (.14 + i * .26); br_ = min(W * .07, H * .12)
            k.disc(X0 + br_ + 1, by_ + br_, br_, br_, k.m("straw")); fruit_heap(k, X0 + br_ + 1, by_ + br_, br_ - 3, br_ - 3, F_)
        if k.wealth >= 3:                                                                                         # the year's casks or oil jars waiting along the north
            for i in range(k.wealth - 1):
                px_ = X0 + W * (.3 + i * .14)
                if fr == "olives": pot(k, px_, Y0 + 5, 5, k.m("clay"))
                else: bucket(k, px_, Y0 + 5, 5, k.wood, fill=None)
        tr = H * .2; tx, ty = X1 - tr - 1, Y1 - tr - 1                                                           # the tub of fruit waiting
        bucket(k, tx, ty, tr, k.wood, fill=None); fruit_heap(k, tx, ty, tr - 4, tr - 4, F_)
        if k.cond != "new":
            for i in range(4): k.blob(X0 + W * (.2 + .12 * i), Y0 + H * (.2 + (i % 2) * .4), 6, 4, juice, n=4)
        if stg == "M":
            basket(cx_, cy_, H * .2)
            for py_ in (Y0 + 2, Y1 - H * .28): k.rect(X0 + 2, py_, X0 + 12, py_ + 10, k.wood)                    # the posts at the pivot
            k.bar(X0 + 7, cy_, X1 - 12, cy_, k.wood, 9)                                                         # the great beam
            k.sh(X1 - 26, Y0 + 4, X1 - 2, Y0 + 30, 3, "ellipse"); k.disc(X1 - 14, Y0 + 16, 13, 12, k.c(STONE))       # the weight stone, hung from the beam's end
            if k.e == 1: d.line([cx_ - 4, cy_ - 5, cx_ - 4, cy_ + 5], fill=k.c(IRON)[2], width=3)
        elif stg == "E":
            basket(cx_, cy_, H * .22)
            for px_ in (cx_ - H * .38, cx_ + H * .3): k.rect(px_, cy_ - H * .38, px_ + H * .1, cy_ + H * .3, k.wood, lv=3)   # the cheeks
            k.rect(cx_ - H * .3, cy_ - H * .38, cx_ + H * .4, cy_ - H * .26, k.wood, lv=3)                          # the head
            k.disc(cx_, cy_, H * .1, H * .1, k.wood); d.arc([cx_ - H * .08, cy_ - H * .08, cx_ + H * .08, cy_ + H * .08], 0, 270, fill=k.wood[0], width=2)   # the screw
            k.bar(cx_ - W * .35, cy_ + 2, cx_ + W * .35, cy_ - 2, k.wood, 4)                                          # the capstan bar
        elif k.make == "twin":                                                                          # two small basket presses on the one bed
            for px_ in (k.fx(.3), k.fx(.6)):
                r = H * .17; k.disc(px_, cy_, r, r, k.wood); d.ellipse([px_ - r, cy_ - r, px_ + r, cy_ + r], outline=k.c(IRON)[2], width=2)
                fruit_heap(k, px_, cy_, r - 5, r - 5, F_); k.disc(px_, cy_, 5, 5, k.c(IRON)); k.bar(px_ - r - 4, cy_, px_ + r + 4, cy_, k.c(IRON), 2)
        elif k.make == "rack":                                                                          # a rack-and-cloth press: square cheeses under a square platen
            for i in range(3): k.rect(cx_ - H * .26 + i * 3, cy_ - H * .26 + i * 3, cx_ + H * .26 - i * 3, cy_ + H * .26 - i * 3, k.c(LINEN), lv=2 + i % 2)
            k.rect(cx_ - H * .3, cy_ - H * .06, cx_ + H * .3, cy_ + H * .06, k.wood, lv=3); k.disc(cx_, cy_, 6, 6, k.c(IRON))
            k.bar(cx_, cy_, k.fx(.95), Y0 + 4, k.c(IRON), 3)                                              # the long lever
        else:
            r = H * .25; k.disc(cx_, cy_, r, r, k.wood)
            for a in range(0, 360, 15): d.line([cx_ + r * math.cos(math.radians(a)), cy_ + r * math.sin(math.radians(a)), cx_ + (r - 5) * math.cos(math.radians(a)), cy_ + (r - 5) * math.sin(math.radians(a))], fill=k.wood[0], width=2)
            d.ellipse([cx_ - r, cy_ - r, cx_ + r, cy_ + r], outline=k.c(IRON)[2], width=2)
            fruit_heap(k, cx_, cy_, r - 7, r - 7, F_)
            k.disc(cx_, cy_, 7, 7, k.c(IRON)); k.bar(cx_ - W * .3, cy_, cx_ + W * .3, cy_, k.c(IRON), 3)               # screw and ratchet arms
    elif stg == "W":
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 4); k.rect(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, k.paint)
        k.rect(X0 + W * .2, Y0 + H * .15, X1 - W * .2, Y1 - H * .2, k.c(STEEL))
        d.rectangle([X0 + W * .18, Y0 + H * .13, X1 - W * .18, Y1 - H * .18], fill=juice[1])                    # the juice pan
        for i in range(3): k.rect(X0 + W * .25 + i * 4, Y0 + H * .2 + i * 4, X1 - W * .25 - i * 4, Y1 - H * .25 - i * 4, k.c(LINEN), lv=2 + i % 2)   # the cloth-wrapped cheeses
        fruit_heap(k, k.cx, k.cy, W * .14, H * .12, F_)
        if k.rich: k.inlay(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4)
    elif stg == "N":
        for i, bx in enumerate((X0 + 2, X0 + W * .52)):                                                         # bins of fruit
            k.rect(bx, Y1 - H * .36, bx + W * .44, Y1 - 2, k.paint); d.rectangle([bx + 4, Y1 - H * .33, bx + W * .44 - 4, Y1 - 5], fill=F_[1]); fruit_heap(k, bx + W * .22, Y1 - H * .19, W * .19, H * .14, F_)
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y0 + H * .62, 4); k.rrect(X0 + 4, Y0 + 4, X1 - 4, Y0 + H * .62, int(H * .25), k.c(STEEL))
        for gx in range(int(X0) + 24, int(X1) - 20, 22): d.line([gx, Y0 + 6, gx, Y0 + H * .6], fill=k.c(STEEL)[1])
        k.rect(k.cx - 12, Y0 + H * .2, k.cx + 12, Y0 + H * .42, k.c(STEEL), lv=4)                                 # the door
        for ex in (X0 + 4, X1 - 22): k.rect(ex, Y0 + 6, ex + 18, Y0 + H * .6, k.paint)                             # the end frames in the maker's paint
    else:
        k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 10)
        d.ellipse([k.cx - H * .25, k.cy - H * .25, k.cx + H * .25, k.cy + H * .25], fill=juice[1], outline=k.glow[1], width=2)
        fruit_heap(k, k.cx, k.cy, H * .15, H * .15, F_)
        if k.rich: k.inlay(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 9)
    if k.rich and stg in "MEV": k.ornament(X0 + W * .15, Y0 + H * .12, X1 - W * .2, Y1 - H * .22)
    if k.cond == "broken": d.line([k.fx(.6), Y0 + 4, k.fx(.7), Y1 - H * .25], fill=OUT, width=3); k.blob(k.fx(.8), Y1 - H * .12, W * .07, H * .06, juice, n=5)
    k.wear(X0, Y0, X1, Y1, bed)


def quern(tm, x, y, w, h, st, v):
    """A hand quern from above, on the cloth, skin or mat that catches the meal. Europe, Asia and the Islamic world: the
    rotary quern, the upper stone with its eye full of grain and its upright handle, the meal ringed round the lower
    stone; the Americas and Africa: the saddle quern or metate, the long hollowed stone with its rubbing stone and the
    meal heaped at its end; Victorian: a cast-iron hand mill on its box. The grain: wheat, barley, maize, millet or rice."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    grain = v.get("grain", "wheat")
    G = k.c({"wheat": R_((206, 170, 100), 12), "barley": R_((200, 180, 120), 12), "maize": R_((226, 184, 60), 16), "millet": R_((214, 196, 120), 10),
             "rice": R_((232, 228, 214), 8), "rye": R_((150, 120, 90), 12)}.get(grain, R_((206, 170, 100), 12)))
    meal = k.c(R_((236, 230, 214), 8))
    stone = k.c({"atlantic": R_((130, 126, 120), 14), "northern": R_((150, 110, 100), 14), "mediterranean": R_((110, 110, 116), 12),
                 "africa": R_((150, 130, 110), 14), "americas": R_((90, 86, 86), 12), "eastasia": R_((170, 170, 166), 12)}.get(S, STONE))
    under = {"central": "linen", "atlantic": "hide", "northern": "hide", "polar": "hide", "steppe": "felt"}.get(S, "mat")
    if under == "hide": k.blob(k.cx, k.cy, W * .48, H * .48, k.c(HIDE), n=6, jit=.1)
    elif under == "felt": k.rrect(X0, Y0, X1, Y1, 6, k.m("cloth")); k.pattern(X0 + 3, Y0 + 3, X1 - 3, Y1 - 3)
    elif under == "linen": k.rect(X0, Y0, X1, Y1, k.c(LINEN)); k.pattern(X0 + 2, Y0 + 2, X1 - 2, Y0 + 7)
    else: mat(k, X0, Y0, X1, Y1, k.m("straw")); k.pattern(X0 + 2, Y1 - 8, X1 - 2, Y1 - 2) if k.wealth >= 1 else None
    if stg == "V" and S not in ("americas", "africa"):
        k.sh(k.fx(.15), k.fy(.15), k.fx(.85), k.fy(.85), 3); k.rect(k.fx(.15), k.fy(.15), k.fx(.85), k.fy(.85), k.wood)
        k.disc(k.cx, k.cy, W * .24, H * .24, k.c(IRON)); fruit_heap(k, k.cx, k.cy, W * .14, H * .14, G, 12)
        k.bar(k.cx, k.cy, k.fx(.9), k.fy(.25), k.c(IRON), 3); k.disc(k.fx(.9), k.fy(.25), 4, 4, k.wood)
        k.rect(k.fx(.3), k.fy(.78), k.fx(.7), k.fy(.92), k.c(TIN)); d.rectangle([k.fx(.33), k.fy(.8), k.fx(.67), k.fy(.9)], fill=meal[2])
    elif S in ("americas", "africa"):
        k.sh(k.fx(.08), k.fy(.2), k.fx(.92), k.fy(.8), 3); k.rrect(k.fx(.08), k.fy(.2), k.fx(.92), k.fy(.8), 8, stone)
        d.rounded_rectangle([k.fx(.18), k.fy(.3), k.fx(.82), k.fy(.7)], 6, fill=stone[1])
        k.rrect(k.fx(.35), k.fy(.22), k.fx(.5), k.fy(.78), 4, stone, lv=3)                                      # the rubbing stone
        k.blob(k.fx(.8), k.fy(.5), W * .1, H * .14, meal, n=5); fruit_heap(k, k.fx(.22), k.fy(.5), W * .06, H * .12, G, 8)
        pot(k, k.fx(.12), k.fy(.12), W * .09, k.m("clay"), fill=G)
    else:
        r = min(W, H) * .4
        k.blob(k.cx, k.cy, r * 1.12, r * 1.1, meal, n=8, jit=.06)                                               # the meal round the lower stone
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse"); k.disc(k.cx, k.cy, r, r, stone)
        k.disc(k.cx, k.cy, r * .85, r * .85, stone, lv=3)
        d.ellipse([k.cx - r * .25, k.cy - r * .25, k.cx + r * .25, k.cy + r * .25], fill=OUT); fruit_heap(k, k.cx, k.cy, r * .18, r * .18, G, 6)   # the eye with its grain
        hx, hy = k.cx + r * .62, k.cy + r * .3; k.disc(hx, hy, 4, 4, k.wood); k.bar(hx, hy, hx + 4, hy - 6, k.wood, 2)
        if k.rich: d.ellipse([k.cx - r * .8, k.cy - r * .8, k.cx + r * .8, k.cy + r * .8], outline=k.c(IRON)[3], width=2)   # an iron rynd and band
    if k.cond == "broken": d.line([k.cx - W * .3, k.cy - 2, k.cx + W * .3, k.cy + 4], fill=OUT, width=3)
    k.wear(X0, Y0, X1, Y1, stone)


def millstones(tm, x, y, w, h, st, v):
    """A pair of millstones from above: the runner stone in its round wooden tun, the hopper over it on its horse full of
    grain, the meal spout to the meal bin at the front. Victorian: a pale French burr stone and an iron-hooped tun with
    its stone crane; 20th century and Modern: a roller mill in the maker's paint; Future: a sealed mill. The Islamic
    world and South Asia: the edge-runner mill, a stone wheel rolled round a basin on its beam."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    G = k.c(R_((206, 170, 100), 12)); meal = k.c(R_((236, 230, 214), 8))
    cx_, cy_ = k.cx, k.fy(.44); r = min(W, H) * .4
    if S in ("islamic", "southasia", "steppe") and stg in "MEV":
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 4, "ellipse"); k.disc(cx_, cy_, r, r, k.c(STONE))
        d.ellipse([cx_ - r * .8, cy_ - r * .8, cx_ + r * .8, cy_ + r * .8], fill=k.c(STONE)[1]); fruit_heap(k, cx_, cy_, r * .6, r * .6, G, 30)
        k.rect(cx_ - 4, cy_ - 4, cx_ + 4, cy_ + 4, k.wood)
        k.bar(cx_, cy_, X1 - 2, Y1 - 4, k.wood, 6)                                                                # the beam for the beast
        k.rect(cx_ + r * .25, cy_ + r * .1, cx_ + r * .65, cy_ + r * .45, k.c(STONE), lv=3)                         # the edge-runner on edge
        for gy in range(int(cy_ + r * .1) + 3, int(cy_ + r * .45), 3): d.line([cx_ + r * .27, gy, cx_ + r * .63, gy], fill=k.c(STONE)[1])
        pot(k, X0 + W * .12, Y0 + H * .12, W * .08, k.m("clay"), fill=k.c(R_((120, 110, 40), 10)) if S != "steppe" else meal)
        k.wear(cx_ - r, cy_ - r, cx_ + r, cy_ + r, k.c(STONE)); return
    if stg in "MEV":
        tun = k.wood
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse")
        if stg == "M": k.disc(cx_, cy_, r, r, tun)
        else: k.poly([(cx_ + r * math.cos(a), cy_ + r * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1] + math.pi / 8], tun)   # the eight-sided tun
        for a in range(0, 360, 15): d.line([cx_ + r * .98 * math.cos(math.radians(a)), cy_ + r * .98 * math.sin(math.radians(a)), cx_ + r * .82 * math.cos(math.radians(a)), cy_ + r * .82 * math.sin(math.radians(a))], fill=tun[1])
        if stg == "V": d.ellipse([cx_ - r * .9, cy_ - r * .9, cx_ + r * .9, cy_ + r * .9], outline=k.c(IRON)[2], width=2)
        # the hopper on its horse
        k.bar(cx_ - r * .9, cy_, cx_ + r * .9, cy_, tun, 5); k.bar(cx_, cy_ - r * .9, cx_, cy_ + r * .6, tun, 5)
        hs = r * .42; k.poly([(cx_ - hs, cy_ - hs), (cx_ + hs, cy_ - hs), (cx_ + hs * .4, cy_ - hs * .1), (cx_ - hs * .4, cy_ - hs * .1)], tun, lv=3)
        d.rectangle([cx_ - hs * .8, cy_ - hs * .9, cx_ + hs * .8, cy_ - hs * .35], fill=G[2]); fruit_heap(k, cx_, cy_ - hs * .6, hs * .7, hs * .2, G, 12)
        k.bar(cx_, cy_ + r * .82, cx_, Y1 - H * .14, tun, 4)                                                         # the meal spout
        k.rect(cx_ - W * .2, Y1 - H * .16, cx_ + W * .2, Y1 - 1, tun); d.rectangle([cx_ - W * .18, Y1 - H * .14, cx_ + W * .18, Y1 - 3], fill=meal[2])   # the meal bin
        if stg == "V": k.bar(X1 - 8, Y0 + 4, X1 - 8, cy_ + r * .4, k.c(IRON), 4); d.arc([X1 - 30, Y0 + 2, X1 - 6, Y0 + 26], 180, 270, fill=k.c(IRON)[2], width=3)   # the stone crane
        if k.rich: k.studs(cx_ - W * .2, Y1 - H * .16, cx_ + W * .2, Y1 - 1)
    elif stg in "WNF" and k.make in ("stone", "hammer"):
        C = k.paint if stg != "F" else k.comp
        if k.make == "stone":                                                                                 # a cast-cased stone mill, belt driven
            k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 4, "ellipse"); k.disc(cx_, cy_, r, r, C)
            d.ellipse([cx_ - r * .8, cy_ - r * .8, cx_ + r * .8, cy_ + r * .8], outline=C[0], width=2)
            k.rect(cx_ - r * .3, cy_ - r * .3, cx_ + r * .3, cy_ + r * .3, k.c(STEEL), lv=3); fruit_heap(k, cx_, cy_, r * .22, r * .22, G, 10)
            k.disc(X1 - W * .1, cy_, H * .12, H * .12, k.c(IRON)); d.line([X1 - W * .1, cy_ - H * .12, X1 - W * .1, Y0], fill=k.c(LEATHER)[1], width=3)
        else:                                                                                                 # a hammer mill and its cyclone
            k.sh(X0 + 4, k.fy(.3), k.fx(.6), Y1 - H * .2, 4); k.rect(X0 + 4, k.fy(.3), k.fx(.6), Y1 - H * .2, C)
            k.disc(k.fx(.32), k.fy(.55), H * .2, H * .2, k.c(STEEL)); d.ellipse([k.fx(.32) - 4, k.fy(.55) - 4, k.fx(.32) + 4, k.fy(.55) + 4], fill=OUT)
            k.bar(k.fx(.5), k.fy(.4), X1 - W * .2, Y0 + H * .2, k.c(STEEL), 6)
            k.disc(X1 - W * .18, Y0 + H * .2, H * .17, H * .17, k.c(STEEL)); d.ellipse([X1 - W * .18 - 5, Y0 + H * .2 - 5, X1 - W * .18 + 5, Y0 + H * .2 + 5], fill=C[2], outline=OUT)
        if stg == "F": k.glowline(X0 + 6, Y1 - H * .1, X1 - 6, Y1 - H * .1, 3)
        sack(k, k.fx(.3), Y1 - H * .08, W * .2, H * .12, k.c(LINEN)); sack(k, k.fx(.7), Y1 - H * .08, W * .2, H * .12, k.c(LINEN))
    elif stg in "WN":
        k.sh(X0 + W * .15, Y0 + H * .1, X1 - W * .15, Y1 - H * .15, 4); k.rect(X0 + W * .15, Y0 + H * .1, X1 - W * .15, Y1 - H * .15, k.paint)
        k.poly([(k.fx(.3), k.fy(.15)), (k.fx(.7), k.fy(.15)), (k.fx(.6), k.fy(.35)), (k.fx(.4), k.fy(.35))], k.c(STEEL)); fruit_heap(k, k.cx, k.fy(.22), W * .12, H * .05, G, 12)
        for gy in (k.fy(.45), k.fy(.55)): k.rect(k.fx(.22), gy, k.fx(.78), gy + 6, k.c(STEEL), lv=3)               # the rolls
        k.disc(k.fx(.85), k.fy(.5), H * .12, H * .12, k.c(IRON)); d.line([k.fx(.85), k.fy(.38), k.fx(.85), Y0], fill=k.c(LEATHER)[1], width=3)
        sack(k, k.fx(.3), Y1 - H * .08, W * .2, H * .12, k.c(LINEN)); sack(k, k.fx(.65), Y1 - H * .08, W * .2, H * .12, k.c(LINEN))
    else:
        k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 12)
        d.ellipse([cx_ - r * .5, cy_ - r * .5, cx_ + r * .5, cy_ + r * .5], fill=k.glow[0], outline=k.glow[1], width=2); fruit_heap(k, cx_, cy_, r * .3, r * .3, G, 12)
    if k.cond == "broken": d.line([cx_ - r * .7, cy_ + r * .3, cx_ + r * .2, cy_ + r * .8], fill=OUT, width=3); k.blob(k.fx(.85), Y1 - 8, 8, 5, meal, n=5)
    k.wear(cx_ - r * .5, Y1 - H * .16, cx_ + r * .5, Y1 - 1)


def churn(tm, x, y, w, h, st, v):
    """A butter churn from above. Europe and the settled Americas: the staved plunge churn, its hoops and lid, the dasher's
    handle standing up from the middle; Victorian: an end-over-end barrel churn on its stand with the crank; 20th
    century: a glass jar churn with a crank top, the cream showing; South Asia: a clay pot with the churning rod and
    its cord; the steppe: a tall painted wooden churn; the Islamic world and Africa: a goatskin hung from a tripod;
    the far north: a skin bag."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    cream = k.c(R_((236, 226, 186), 8)); r = min(W, H) * .46
    if S == "islamic":
        for a in (-90, 30, 150): k.bar(k.cx, k.cy, k.cx + r * 1.05 * math.cos(math.radians(a)), k.cy + r * 1.05 * math.sin(math.radians(a)), k.wood, 3)
        k.sh(k.cx - r * .7, k.cy - r * .5, k.cx + r * .7, k.cy + r * .5, 3, "ellipse")
        k.blob(k.cx, k.cy, r * .75, r * .5, k.c(HIDE), n=4, jit=.1)                                                # the goatskin hung from its tripod
        d.line([k.cx - r * .75, k.cy, k.cx - r, k.cy - 3], fill=k.c(LEATHER)[1], width=3)
        k.disc(k.cx, k.cy, 3, 3, k.c(IRON))
    elif S == "africa":
        gourd = k.c(R_((210, 160, 70), 16))                                                                       # a calabash churn
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse"); k.disc(k.cx, k.cy, r, r * .9, gourd)
        if k.wealth >= 2: k.pattern(k.cx - r * .6, k.cy - r * .5, k.cx + r * .6, k.cy + r * .5, key="kente" if k.wealth >= 3 else "step")
        k.disc(k.cx + r * .3, k.cy - r * .3, r * .28, r * .28, gourd, lv=3); d.ellipse([k.cx + r * .2, k.cy - r * .4, k.cx + r * .4, k.cy - r * .2], fill=OUT)   # the neck and its stopper hole
    elif S == "polar":
        k.sh(k.cx - r, k.cy - r * .7, k.cx + r, k.cy + r * .7, 3, "ellipse"); k.blob(k.cx, k.cy, r * .9, r * .65, k.c(R_((90, 70, 60), 12)), n=4, jit=.12)   # a sealskin bag
        if k.wealth >= 2: k.pattern(k.cx - r * .6, k.cy - r * .12, k.cx + r * .6, k.cy + r * .12)
        d.line([k.cx + r * .7, k.cy - r * .3, k.cx + r, k.cy - r * .6], fill=k.c(LEATHER)[2], width=3)
    elif S == "southasia":
        pot(k, k.cx, k.cy, r, k.m("clay"), fill=cream); d.ellipse([k.cx - r + 2, k.cy - r + 2, k.cx + r - 2, k.cy + r - 2], outline=k.acc[2], width=2)
        k.bar(k.cx - r, k.cy - r * .2, k.cx + r, k.cy + r * .2, k.c(LINEN), 2); k.disc(k.cx, k.cy, 4, 4, k.wood)
    elif stg == "W" and k.make == "barrel" or stg == "V" and k.wealth >= 2:
        k.sh(X0, Y0 + 3, X1, Y1 - 3, 3); k.rect(X0 + 1, Y0 + 5, X1 - 1, Y1 - 5, k.wood if not k.glob else k.paint)                 # the barrel churn on its stand
        for gx in (X0 + 5, X1 - 6): d.line([gx, Y0 + 6, gx, Y1 - 6], fill=k.c(IRON)[2], width=2)
        k.rect(k.cx - 5, Y0 + 2, k.cx + 5, Y0 + 8, k.c(IRON)); k.bar(X1 - 3, k.cy, X1 + 1, k.cy - 6, k.c(IRON), 2)
    elif stg == "W" and k.make == "dairy":                                                                 # a steel dairy churn, square, with its crank
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.c(STEEL))
        k.rect(X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, k.paint, lv=3); k.disc(k.cx, k.cy, r * .3, r * .3, k.c(STEEL))
        k.bar(k.cx, k.cy, X1 - 2, Y0 + 3, k.c(IRON), 3)
    elif stg == "W" and k.e >= 5 and S not in ("steppe",) and k.make != "plunge":
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.c(R_((190, 210, 214), 14)))   # the glass jar
        d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=cream[2]); k.disc(k.cx, k.cy, r * .78, r * .78, k.paint)       # the crank top
        k.bar(k.cx, k.cy, X1 - 3, k.cy - 4, k.c(IRON), 2)
    else:
        C = k.wood if S != "steppe" else k.acc
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse"); k.disc(k.cx, k.cy, r, r, C)
        for a in range(0, 360, 30): d.line([k.cx + r * math.cos(math.radians(a)), k.cy + r * math.sin(math.radians(a)), k.cx + r * .75 * math.cos(math.radians(a)), k.cy + r * .75 * math.sin(math.radians(a))], fill=C[0])
        hoop = k.c(BRASS) if k.rich else k.acc if k.wealth >= 2 else k.c(IRON) if stg != "M" else k.c(R_((150, 130, 80), 12))
        d.ellipse([k.cx - r + 1, k.cy - r + 1, k.cx + r - 1, k.cy + r - 1], outline=hoop[2], width=3)
        k.disc(k.cx, k.cy, r * .7, r * .7, k.wood, lv=3)                                                           # the lid
        if S in PAINTED and k.wealth >= 2: k.pattern(k.cx - r * .5, k.cy - r * .5, k.cx + r * .5, k.cy + r * .5)     # painted
        k.disc(k.cx, k.cy, 3, 3, k.wood, lv=1); d.point((k.cx - 1, k.cy - 1), fill=k.wood[4])                        # the dasher handle
    if k.cond != "new": d.ellipse([k.cx + r * .3, k.cy + r * .6, k.cx + r * .9, k.cy + r * .95], fill=cream[2])        # a splash of cream
    k.wear(X0, Y0, X1, Y1)
    if k.cond == "broken": d.line([k.cx - r * .8, k.cy - r * .4, k.cx - r * .2, k.cy + r * .6], fill=OUT, width=2)
    if k.poor and S not in ("islamic", "africa", "polar", "southasia"): d.line([k.cx - r, k.cy, k.cx + r, k.cy], fill=k.c(R_((170, 150, 108), 14))[2], width=2)


def press_print(tm, x, y, w, h, st, v):
    """A printing press from above. Renaissance and Age of Reason: the wooden common press, its two cheeks and head, the
    platen, the carriage running out to the front with the tympan and frisket opened on it, the bar to the east and the
    ink balls on the bank; East and Southeast Asia: the woodblock printer's table, the carved block, the brushes, the
    ink and the paper; Victorian: the iron hand press, a Columbian with its gilt eagle in rich shops; 20th century: the
    jobbing platen press with its round ink disc and flywheel; Modern: a small offset press with its rollers and paper
    feed; Future: a sealed printer. Printed sheets, in the land's script and ornament, lie by it."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    paper = k.c(R_((232, 226, 206), 8))
    def sheets(x0, y0, n):
        for i in range(n):
            px_, py_ = x0 + i * 4, y0 + i * 3
            k.rect(px_, py_, px_ + W * .16, py_ + H * .24, paper)
            for gy in range(int(py_) + 4, int(py_ + H * .24) - 3, 3): d.line([px_ + 3, gy, px_ + W * .16 - 3, gy], fill=OUT if S not in ("islamic", "eastasia") else k.c(BLACK)[1])
        if k.wealth >= 3: k.pattern(x0 + (n - 1) * 4 + 2, y0 + (n - 1) * 3 + 2, x0 + (n - 1) * 4 + W * .16 - 2, y0 + (n - 1) * 3 + 8)
    if S in ("eastasia", "seasia") and stg in "EV":
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 4); k.rect(X0 + 2, Y0 + H * .1, X1 - 2, Y1 - H * .1, k.wood)
        k.rect(k.fx(.3), k.fy(.25), k.fx(.62), k.fy(.7), k.c(R_((200, 160, 110), 12)))                              # the carved block
        for gy in range(int(k.fy(.3)), int(k.fy(.66)), 4): d.line([k.fx(.33), gy, k.fx(.59), gy], fill=k.c(BLACK)[1])
        k.rect(k.fx(.66), k.fy(.25), k.fx(.92), k.fy(.7), paper); k.disc(k.fx(.15), k.fy(.35), 8, 8, k.c(BLACK))       # paper and ink
        k.rect(k.fx(.08), k.fy(.6), k.fx(.22), k.fy(.68), k.c(R_((170, 130, 80), 12)))                              # the baren brush
        k.wear(X0 + 2, Y0 + H * .1, X1 - 2, Y1 - H * .1); return
    if stg == "E":
        frame = k.wood
        k.sh(X0 + W * .2, Y0, X1 - W * .2, Y1, 4)
        k.rect(X0 + W * .25, Y0 + 2, X1 - W * .25, Y1 - 2, frame, lv=1)                                             # the carriage rails
        for px_ in (X0 + W * .2, X1 - W * .2 - 10): k.rect(px_, Y0 + 2, px_ + 10, Y0 + H * .45, frame, lv=3)        # the cheeks
        k.rect(X0 + W * .2, Y0 + 2, X1 - W * .2, Y0 + 12, frame, lv=3)                                              # the head
        k.rect(k.fx(.33), k.fy(.15), k.fx(.67), k.fy(.42), k.c(R_((150, 150, 140), 12)))                            # the platen over the forme
        k.bar(X1 - W * .2, k.fy(.3), X1 - 2, k.fy(.42), k.c(IRON), 3)                                              # the bar
        k.rect(k.fx(.3), k.fy(.5), k.fx(.7), Y1 - 4, k.c(LEATHER), lv=3); d.rectangle([k.fx(.33), k.fy(.53), k.fx(.67), Y1 - 7], fill=paper[3])   # the tympan
        k.disc(X0 + 10, k.fy(.3), 8, 8, k.c(LEATHER)); k.disc(X0 + 10, k.fy(.55), 8, 8, k.c(LEATHER))              # the ink balls
        sheets(X0 + 2, k.fy(.68), 2 + k.wealth // 2)
        if k.rich: k.ornament(X0 + W * .2, Y0 + 2, X1 - W * .2, Y0 + 12)
    elif k.make == "proof" and stg in "VWN":                                                            # a small proof press: a bed and its hand-rolled cylinder
        C = k.paint
        k.rect(X0 + 2, Y0 + H * .08, X1 - 2, Y1 - H * .08, k.c(R_((130, 100, 70), 12)), lv=1)                   # the bench
        k.sh(k.fx(.2), k.fy(.2), k.fx(.8), k.fy(.8), 3); k.rect(k.fx(.2), k.fy(.2), k.fx(.8), k.fy(.8), C)
        d.rectangle([k.fx(.26), k.fy(.3), k.fx(.74), k.fy(.7)], fill=k.c(BLACK)[2], outline=OUT)                  # the inked forme
        k.rect(k.fx(.5), k.fy(.14), k.fx(.6), k.fy(.86), k.c(STEEL), lv=3); k.bar(k.fx(.55), k.fy(.86), k.fx(.55), Y1 - 2, k.c(IRON), 3)   # the cylinder and handle
        sheets(X0 + 4, k.fy(.2), 2)
    elif k.make == "cylinder" and stg in "WN":
        C = k.paint; k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 4)
        if stg == "W":                                                                                     # a flatbed cylinder press
            k.rect(X0 + 2, k.fy(.25), X1 - 2, k.fy(.75), C)
            k.rect(k.fx(.35), Y0 + 2, k.fx(.55), Y1 - 2, k.c(STEEL), lv=3)                                      # the great cylinder
            for gy in range(int(Y0) + 6, int(Y1) - 4, 6): d.line([k.fx(.37), gy, k.fx(.53), gy], fill=k.c(STEEL)[1])
            k.rect(k.fx(.6), k.fy(.3), X1 - 6, k.fy(.7), k.c(BLACK), lv=2)                                       # the forme on its bed
            k.rect(X0 + 6, k.fy(.32), k.fx(.3), k.fy(.68), paper)                                                # the feed board
        else:                                                                                              # a big copier press with its paper trays
            k.rect(X0 + W * .2, Y0 + 2, X1 - 2, Y1 - 2, k.c(R_((220, 218, 210), 6)))
            for i in range(3): k.rect(X0 + 2, Y0 + H * (.15 + i * .25), X0 + W * .22, Y0 + H * (.33 + i * .25), paper)
            k.rect(k.fx(.6), Y0 + 4, X1 - 6, k.fy(.25), k.c(PLASTIC_GREY)); d.rectangle([k.fx(.64), Y0 + 6, k.fx(.8), k.fy(.2)], fill=k.glow[1])
            d.rectangle([k.fx(.3), k.fy(.35), X1 - 8, Y1 - 8], outline=C[2], width=3)
    elif stg == "V":
        C = k.paint
        k.sh(X0 + W * .2, Y0, X1 - W * .2, Y1, 4)
        k.rect(X0 + W * .25, Y0 + 2, X1 - W * .25, Y1 - 2, C, lv=1)
        k.rect(X0 + W * .2, Y0 + 2, X1 - W * .2, Y0 + H * .45, C)
        if k.make == "cylinder":                                                                     # the Columbian's eagle counterweight on its lever
            k.bar(X0 + W * .2, Y0 + 6, X1 - 2, Y0 + 6, k.c(IRON), 4); k.blob(X1 - 12, Y0 + 10, 9, 7, k.c(BRASS), n=5)
            for px_ in (X0 + W * .3, X1 - W * .3): k.disc(px_, Y0 + 8, 4, 4, k.c(BRASS))
        else:                                                                                        # the Albion's round-topped head and its spring box
            k.disc(k.cx, Y0 + H * .2, W * .14, H * .16, C, lv=3); k.disc(k.cx, Y0 + H * .2, 5, 5, k.c(BRASS))
        k.rect(k.fx(.33), k.fy(.15), k.fx(.67), k.fy(.42), k.c(STEEL)); k.bar(X1 - W * .2, k.fy(.3), X1 - 2, k.fy(.45), k.c(IRON), 3)
        k.rect(k.fx(.3), k.fy(.5), k.fx(.7), Y1 - 4, k.c(IRON), lv=3); d.rectangle([k.fx(.33), k.fy(.53), k.fx(.67), Y1 - 7], fill=paper[3])
        sheets(X0 + 2, k.fy(.6), 1 + k.wealth // 2)
    elif stg == "W":
        C = k.paint; k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 4)
        k.rect(X0 + W * .15, Y0 + H * .1, X1 - W * .25, Y1 - H * .1, C)
        k.disc(k.fx(.42), k.fy(.32), H * .22, H * .22, k.c(STEEL)); d.ellipse([k.fx(.42) - 6, k.fy(.32) - 6, k.fx(.42) + 6, k.fy(.32) + 6], fill=k.c(BLACK)[2])   # the ink disc
        k.rect(k.fx(.3), k.fy(.6), k.fx(.6), k.fy(.85), C, lv=3)
        d.ellipse([X1 - W * .25, Y0 + H * .1, X1 - 2, Y1 - H * .1], outline=OUT, width=4); d.ellipse([X1 - W * .25 + 1, Y0 + H * .1 + 1, X1 - 3, Y1 - H * .1 - 1], outline=k.c(IRON)[2], width=2)   # the flywheel
        sheets(X0 + 2, k.fy(.5), 2)
    elif stg == "N":
        C = k.paint; k.sh(X0 + 2, Y0 + 4, X1 - 2, Y1 - 4, 4); k.rect(X0 + 2, Y0 + H * .15, X1 - 2, Y1 - H * .15, C)
        for gx in range(int(k.fx(.3)), int(k.fx(.7)), 8): k.rect(gx, Y0 + H * .2, gx + 5, Y1 - H * .2, k.c(STEEL), lv=3)   # the rollers
        k.rect(X0 + 4, Y0 + H * .25, k.fx(.25), Y1 - H * .25, paper); k.rect(k.fx(.75), Y0 + H * .25, X1 - 4, Y1 - H * .25, paper)
        for i in range(k.wealth // 2 + 1): k.rect(k.fx(.78) + i * 3, Y1 - H * .14 - i * 2, X1 - 2, Y1 - 2 - i * 2, paper, lv=3)   # reams waiting
        k.rect(k.fx(.4), Y0 + 2, k.fx(.6), Y0 + H * .15, k.c(PLASTIC_GREY)); d.rectangle([k.fx(.43), Y0 + 4, k.fx(.57), Y0 + H * .12], fill=k.glow[1])
    else:
        if k.make == "proof": k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.c(R_((90, 90, 96), 10)), lv=1); X0, X1, W = k.fx(.2), k.fx(.8), W * .6
        k.sh(X0, Y0, X1, Y1, 4); k.future_shell(X0 + 2, Y0 + 4, X1 - 2, Y1 - 4, 8)
        if k.make == "cylinder": d.rectangle([X0 + 8, Y0 + 8, X1 - 8, Y0 + 16], fill=k.glow[0], outline=k.glow[2])
        k.rect(X1 - W * .4, Y0 + H * .3, X1 - 6, Y1 - H * .3, paper); k.glowline(X0 + 6, Y0 + H * .3, X0 + 6, Y1 - H * .3, 3)
        k.rect(k.fx(.15), k.fy(.25), k.fx(.5), k.fy(.75), k.comp, lv=3)
    if k.cond == "broken": d.line([k.fx(.3), Y0 + 4, k.fx(.45), Y1 - 4], fill=OUT, width=3); k.rect(X0 + 2, Y1 - 10, X0 + W * .15, Y1 - 2, paper)
    k.wear(X0 + W * .2, Y0 + 2, X1 - W * .2, Y0 + H * .45, k.wood)


def sewingmachine(tm, x, y, w, h, st, v):
    """A sewing machine from above, open with cloth under the needle, or closed: the head folded down into its cabinet
    or under its wooden case. Victorian and Great War: a black machine with gold transfers on a treadle cabinet;
    Mid-Century: a cream or green electric machine on its table; Modern: a white plastic machine with its coloured
    panel; Future: a sealed composite machine with a lit panel. The cloth is the land's own."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    top = k.wood if stg in "VW" else k.c(R_((200, 184, 150), 10)) if stg == "N" else k.comp
    mk = k.make
    if mk == "hand" and stg in "VW":                                                                      # a hand machine on its own small base, no cabinet
        k.X0 = X0 = X0 + W * .08; k.X1 = X1 = X1 - W * .08; k.Y0 = Y0 = Y0 + H * .12; k.Y1 = Y1 = Y1 - H * .12; k.W = W = X1 - X0; k.H = H = Y1 - Y0
    if mk == "treadle" and stg == "N": top = k.c(R_((150, 150, 140), 8))                                   # an industrial machine's table
    k.sh(X0, Y0, X1, Y1, 4); k.rect(X0, Y0, X1, Y1, top)
    for kx in (X0 + W * .25, X0 + W * .75): k.disc(kx, Y1 - 4, 2, 2, k.c(BRASS))                                    # the drawer knobs
    if st == "closed":
        if stg in "VW" and k.e <= 5:
            k.rect(X0 + 3, Y0 + 3, X1 - 3, Y1 - 10, top, lv=3); d.line([X0 + 5, k.cy - 4, X1 - 5, k.cy - 4], fill=top[0])   # the leaf folded over
        else:
            k.rrect(X0 + W * .12, Y0 + H * .1, X1 - W * .12, Y1 - H * .25, 8, k.wood if stg != "F" else k.comp, lv=3)   # the carrying case
            k.bar(k.cx - 8, k.cy - 4, k.cx + 8, k.cy - 4, k.c(LEATHER), 3)
        k.wear(X0, Y0, X1, Y1, top); return
    # cloth under the needle
    cl = k.c(DYES.get(v.get("cloth", "red"), DYES["red"]))
    cloth_web(k, X0 + W * .05, Y0 + H * .4, k.fx(.55), Y1 - H * .15, cl)
    head = {"V": k.c(BLACK), "W": k.c(BLACK) if k.e == 5 else k.paint, "N": k.c(PLASTIC_WHITE), "F": k.comp}[stg]
    if stg == "N" and mk == "treadle": head = k.paint
    if stg in "NF" and mk == "hand":                                                                      # an overlocker: a squat head and its four cones
        k.sh(k.fx(.2), k.fy(.15), k.fx(.8), k.fy(.6), 3); k.rrect(k.fx(.2), k.fy(.15), k.fx(.8), k.fy(.6), 6, head)
        for i, cc in enumerate(("white", "black", "red", "blue")): k.disc(k.fx(.3 + i * .14), k.fy(.1), 4, 4, k.c(DYES[cc]))
        d.rectangle([k.fx(.3), k.fy(.3), k.fx(.7), k.fy(.42)], fill=k.paint[2] if stg == "N" else k.glow[1])
        if k.cond == "broken": d.line([k.fx(.5), k.fy(.2), k.fx(.6), k.fy(.48)], fill=OUT, width=2)
        k.wear(X0, Y0, X1, Y1, top); return
    if stg == "N" and mk == "treadle": k.disc(k.fx(.06), k.fy(.12), 5, 5, k.c(STEEL)); k.disc(k.fx(.06), k.fy(.12), 3, 3, k.c(DYES["white"]))   # the thread stand
    k.sh(k.fx(.15), k.fy(.15), k.fx(.9), k.fy(.55), 3)
    k.rect(k.fx(.15), k.fy(.2), k.fx(.85), k.fy(.45), head)                                                      # the arm
    k.rect(k.fx(.12), k.fy(.15), k.fx(.28), k.fy(.62), head, lv=3)                                               # the needle head
    k.disc(k.fx(.9), k.fy(.32), H * .17, H * .2, k.c(STEEL) if stg != "F" else k.comp)                           # the handwheel
    if mk == "hand" and stg in "VW": k.bar(k.fx(.9), k.fy(.32), k.fx(.97), k.fy(.6), k.c(IRON), 2); k.disc(k.fx(.97), k.fy(.6), 3, 3, k.wood)   # its crank
    k.disc(k.fx(.55), k.fy(.12), 4, 4, k.c(DYES["white"]))                                                       # the spool
    if stg in "VW" and head is not k.paint: k.pattern(k.fx(.32), k.fy(.24), k.fx(.8), k.fy(.41), key="flowers", A=k.c(BRASS), B=k.c(BRASS))   # gold transfers
    elif stg == "N": d.rectangle([k.fx(.4), k.fy(.25), k.fx(.7), k.fy(.4)], fill=k.paint[2])
    elif stg == "F": k.glowline(k.fx(.35), k.fy(.32), k.fx(.8), k.fy(.32), 3)
    if k.cond == "broken": d.line([k.fx(.5), k.fy(.2), k.fx(.6), k.fy(.48)], fill=OUT, width=2); k.disc(X1 - 6, Y1 - 8, 3, 3, k.c(STEEL))
    k.wear(X0, Y0, X1, Y1, top)


def scales(tm, x, y, w, h, st, v):
    """A pair of scales from above: the beam on its pillar with a pan at each end, goods in one and weights in the
    other, the box of weights beside. Medieval to Age of Reason: brass or copper pans on a wooden stand; Victorian: a
    counter scale with two flat pans on its box; 20th century: an enamelled dial scale; Modern: a digital scale;
    Future: a composite scale with a lit read-out. East and Southeast Asia: the steelyard, its one pan and sliding
    weight. The goods: spice, grain, tea, coin, salt."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    gd = v.get("goods", "spice")
    G = k.c({"spice": R_((206, 120, 40), 18), "grain": R_((206, 170, 100), 12), "tea": R_((70, 90, 50), 12), "coin": BRASS, "salt": R_((236, 236, 232), 6),
             "pepper": R_((50, 40, 40), 10)}.get(gd, R_((206, 120, 40), 18)))
    pan = k.c(BRASS) if stg in "MEV" and S not in ("islamic", "southasia") else k.c(COPPER) if stg in "MEV" else k.c(STEEL)
    if stg in "MEV":
        k.sh(X0, Y0, X1, Y1, 2); k.rect(X0, Y0, X1, Y1, k.wood)                                                    # the stand or counter board
        if S in ("eastasia", "seasia"):
            k.bar(X0 + 3, k.cy, X1 - 3, k.cy, k.wood, 2); k.disc(X0 + W * .25, k.cy, H * .3, H * .3, pan); fruit_heap(k, X0 + W * .25, k.cy, H * .18, H * .18, G, 6)
            k.rect(X1 - W * .3, k.cy - 3, X1 - W * .2, k.cy + 3, k.c(IRON))
        else:
            k.bar(X0 + 5, k.cy, X1 - 5, k.cy, pan, 2); k.disc(k.cx, k.cy, 3, 3, pan)
            if stg == "V": k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k.wood, lv=3)
            for px_, fill in ((X0 + W * .22, True), (X1 - W * .22, False)):
                k.disc(px_, k.cy, H * .32, H * .32, pan)
                if fill: fruit_heap(k, px_, k.cy, H * .2, H * .2, G, 7)
                else:
                    for i in range(2): k.disc(px_ - 3 + i * 5, k.cy, 2, 2, k.c(IRON if stg != "M" else BRASS), lv=3)
    elif stg == "W":
        k.sh(X0, Y0, X1, Y1, 2); k.rect(X0, Y0, X1, Y1, k.paint); k.disc(X0 + W * .3, k.cy, H * .35, H * .35, k.c(ENAMEL_W))
        d.line([X0 + W * .3, k.cy, X0 + W * .3 + 5, k.cy - 4], fill=OUT); k.disc(X1 - W * .28, k.cy, H * .35, H * .35, k.c(STEEL)); fruit_heap(k, X1 - W * .28, k.cy, H * .2, H * .2, G, 6)
    elif stg == "N":
        k.sh(X0, Y0, X1, Y1, 2); k.rect(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, k.paint); k.rect(X0 + 3, Y0 + 3, X1 - W * .35, Y1 - 3, k.c(STEEL))
        fruit_heap(k, X0 + W * .32, k.cy, W * .15, H * .2, G, 6); d.rectangle([X1 - W * .3, k.cy - 3, X1 - 3, k.cy + 3], fill=(60, 120, 80))
    else:
        k.sh(X0, Y0, X1, Y1, 2); k.future_shell(X0, Y0, X1, Y1, 4); fruit_heap(k, X0 + W * .35, k.cy, W * .15, H * .2, G, 6); k.glowline(X1 - W * .3, k.cy, X1 - 4, k.cy, 3)
    if k.rich: d.rectangle([X0, Y0, X1, Y1], outline=k.c(BRASS)[3], width=2); d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=k.acc[2])
    if k.cond == "broken": d.line([X0 + 3, Y1 - 3, k.cx, Y0 + 3], fill=OUT, width=2)
    k.wear(X0, Y0, X1, Y1)


GOODS = {"bread": R_((196, 140, 76), 14), "loaf": R_((196, 140, 76), 14), "cloth": None, "pots": R_((176, 104, 66), 18), "fish": R_((170, 184, 190), 14),
         "fruit": R_((190, 60, 50), 18), "apples": R_((190, 60, 50), 18), "spice": R_((206, 120, 40), 18), "meat": R_((160, 50, 50), 16), "greens": R_((80, 140, 60), 16)}


def stall(tm, x, y, w, h, st, v):
    """A market stall from above: the awning over its back half, the counter along the front with the goods set out on
    it, the trestles' feet showing. Medieval: a plain cloth on poles over boards on trestles; Renaissance and Age of
    Reason: a painted awning; Victorian and 20th century: striped canvas; Modern: a blue tarpaulin and plastic crates;
    Future: a dark canopy with a lit edge. The awning carries the land's colours and pattern. Closed: the goods under a
    cloth and the shutter board laid across the counter."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    gd = v.get("goods", "bread"); G = GOODS.get(gd, GOODS["bread"])
    G = k.c(G) if G else k.m("cloth")
    cy0, cy1 = k.fy(.55), Y1 - 2                                                                                # the counter
    k.sh(X0 + 2, cy0, X1 - 2, cy1, 4)
    for lx in (X0 + 8, X1 - 14): k.rect(lx, cy0 - 6, lx + 6, Y1, k.wood, lv=1)                                  # the trestles
    if stg == "N":
        k.rect(X0 + 2, cy0, X1 - 2, cy1, k.c(PLASTIC_GREY))
        for i, bx in enumerate(range(int(X0) + 6, int(X1) - 30, 34)): k.rect(bx, cy0 + 4, bx + 30, cy1 - 4, k.paint if i % 2 else k.acc)
    else:
        k.rect(X0 + 2, cy0, X1 - 2, cy1, k.wood if stg != "F" else k.comp)
        for gx in range(int(X0) + 40, int(X1) - 10, 40): d.line([gx, cy0 + 2, gx, cy1 - 2], fill=(k.wood if stg != "F" else k.comp)[0])
    # the goods
    gx0, gx1, gy0, gy1 = X0 + 8, X1 - 8, cy0 + 6, cy1 - 5
    if st == "closed":
        k.rect(gx0 - 4, gy0 - 2, gx1 + 4, gy1 + 2, k.wood, lv=3); d.line([gx0, (gy0 + gy1) / 2, gx1, (gy0 + gy1) / 2], fill=k.wood[0])
        cloth_web(k, gx0 + 10, gy0, gx0 + (gx1 - gx0) * .4, gy1, k.m("cloth"))
    else:
        if gd == "cloth":
            for i, bx in enumerate(np.linspace(gx0, gx1 - 26, 5)): cloth_web(k, bx, gy0, bx + 24, gy1, [k.m("cloth"), k.acc, k.acc2][i % 3])
        elif gd in ("pots",):
            for bx in np.arange(gx0 + 8, gx1 - 6, 16): pot(k, bx, (gy0 + gy1) / 2, 7, G)
        elif gd == "fish":
            for bx in np.arange(gx0 + 10, gx1 - 10, 22): joint(k, bx, (gy0 + gy1) / 2, 10, 4, "fish")
        elif gd == "meat":
            for bx in np.arange(gx0 + 12, gx1 - 10, 26): joint(k, bx, (gy0 + gy1) / 2, 10, 7, "pork")
        else:
            for bx in np.arange(gx0 + 12, gx1 - 10, 28):
                k.disc(bx, (gy0 + gy1) / 2, 12, (gy1 - gy0) / 2, k.m("straw")); fruit_heap(k, bx, (gy0 + gy1) / 2, 9, (gy1 - gy0) / 2 - 3, G, 10)
    # the awning over the back half
    ay0, ay1 = Y0 + 1, k.fy(.56)
    k.sh(X0, ay0, X1, ay1, 5)
    if stg == "N": C = k.c(R_((50, 90, 170), 16))
    elif stg == "F": C = k.comp
    else: C = k.m("cloth") if stg == "M" else k.acc
    d.rectangle([X0, ay0, X1, ay1], fill=C[2], outline=OUT)
    if stg in "VW":
        for i, gx in enumerate(range(int(X0) + 1, int(X1), 14)): d.rectangle([gx, ay0 + 1, min(X1 - 1, gx + 6), ay1 - 1], fill=(k.acc2 if k.style != "atlantic" else k.c(WHITE))[2])
    elif stg == "E" or (stg == "M" and k.wealth >= 2):
        k.pattern(X0 + 3, ay0 + 3, X1 - 3, ay1 - 3)
    elif stg == "F": d.rectangle([X0 + 2, ay0 + 2, X1 - 2, ay1 - 2], outline=k.glow[1], width=2)
    d.line([X0 + 1, ay0 + 2, X1 - 1, ay0 + 2], fill=C[4]); d.line([X0 + 1, ay1 - 2, X1 - 1, ay1 - 2], fill=C[0])
    for gx in range(int(X0) + 8, int(X1) - 4, 10): d.polygon([(gx, ay1), (gx + 5, ay1 + 4), (gx + 10, ay1)], fill=C[1], outline=OUT)   # the scalloped valance
    for px_ in (X0 + 2, X1 - 6): k.rect(px_, ay0, px_ + 4, ay0 + 4, k.wood)                                       # pole tops
    if k.rich: k.studs(X0, ay0, X1, ay1)
    if k.cond == "worn": k.rect(k.fx(.6), k.fy(.15), k.fx(.7), k.fy(.35), k.c(LINEN), lv=1)                       # a patch on the awning
    if k.cond == "broken": d.polygon([(k.fx(.25), ay0), (k.fx(.4), ay0), (k.fx(.33), ay1 - 4)], fill=OUT)        # the awning torn


# ---------------------------------------------------------------- carts, shops and laboratories
def handcart(tm, x, y, w, h, st, v):
    """A two-wheeled handcart from above, its handles out to the east: the bed with its sideboards, the two wheels on
    edge at its sides (long narrow shapes), the shafts and the cross handle, and its load. Medieval: solid plank
    wheels; Renaissance to Victorian: spoked wheels with iron tyres, the sideboards painted by the Victorians (gaily in
    rich carts); 20th century: bicycle wheels; Modern: a steel bed on pneumatic tyres; Future: a composite barrow with
    a lit rim. The load: hay, sacks, casks, crates, fish, pots, firewood or nothing."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    load = {"none": "empty"}.get(v.get("load", "hay"), v.get("load", "hay"))
    bx0, bx1, by0, by1 = X0 + 2, k.fx(.64), Y0 + H * .14, Y1 - H * .14
    body = k.wood if stg in "MEVW" else k.paint if stg == "N" else k.comp
    k.sh(bx0, by0, X1 - 2, by1, 4)
    # wheels on edge either side
    wl = W * .3; wx = (bx0 + bx1) / 2 - wl / 2
    for wy in (Y0 + 1, Y1 - H * .12):
        wc = k.c(BLACK) if stg in "WNF" else k.wood
        k.rrect(wx, wy, wx + wl, wy + H * .11, 3, wc)
        if stg in "EV": d.line([wx + 2, wy + H * .055, wx + wl - 2, wy + H * .055], fill=k.c(IRON)[3])
        if stg == "M": d.line([wx + wl * .5, wy + 1, wx + wl * .5, wy + H * .11 - 1], fill=wc[0], width=2)
    # the bed
    k.rect(bx0, by0, bx1, by1, body)
    sb = 6
    for r_ in ((bx0, by0, bx1, by0 + sb), (bx0, by1 - sb, bx1, by1), (bx0, by0, bx0 + sb, by1), (bx1 - sb, by0, bx1, by1)): k.rect(*r_, body, lv=3)
    if (stg in "VW" or k.rich) and S in PAINTED_CARTS: k.pattern(bx0 + 1, by0 + 1, bx1 - 1, by0 + sb - 1, A=k.acc, B=k.acc2); k.pattern(bx0 + 1, by1 - sb + 1, bx1 - 1, by1 - 1, A=k.acc, B=k.acc2)
    if stg == "F": d.rectangle([bx0 + 1, by0 + 1, bx1 - 1, by1 - 1], outline=k.glow[1], width=2)
    # the shafts and handle
    for sy in (by0 + 4, by1 - 4): k.bar(bx1, sy, X1 - 4, sy + (k.cy - sy) * .15, body if stg != "N" else k.c(STEEL), 4)
    k.bar(X1 - 5, by0 + 2, X1 - 5, by1 - 2, k.wood if stg != "F" else k.comp, 4)
    # the load
    ix0, iy0, ix1, iy1 = bx0 + sb + 2, by0 + sb + 2, bx1 - sb - 2, by1 - sb - 2; iw, ih = ix1 - ix0, iy1 - iy0
    if load == "hay": k.blob((ix0 + ix1) / 2, (iy0 + iy1) / 2, iw * .55, ih * .58, k.c(HAY), n=6); straw_mass(k, ix0, iy0, ix1, iy1, k.c(HAY), n=iw * ih / 30)
    elif load == "sacks":
        for i in range(3): sack(k, ix0 + iw * (.2 + .3 * i), (iy0 + iy1) / 2 + (i % 2 - .5) * ih * .2, iw * .28, ih * .7, k.c(LINEN))
    elif load == "casks":
        for i in range(2): bucket(k, ix0 + iw * (.27 + .46 * i), (iy0 + iy1) / 2, min(iw * .22, ih * .45), k.wood, fill=None)
    elif load == "crates":
        for i in range(2): k.rect(ix0 + iw * (.05 + .5 * i), iy0 + 2, ix0 + iw * (.45 + .5 * i), iy1 - 2, k.c(R_((200, 170, 120), 12)), lv=3)
    elif load == "fish":
        for i in range(2): bucket(k, ix0 + iw * (.27 + .46 * i), (iy0 + iy1) / 2, min(iw * .22, ih * .45), k.m("straw"), fill=None); joint(k, ix0 + iw * (.27 + .46 * i), (iy0 + iy1) / 2, iw * .14, ih * .15, "fish")
    elif load == "pots":
        for i in range(3):
            for j in range(2): pot(k, ix0 + iw * (.17 + .33 * i), iy0 + ih * (.27 + .46 * j), min(iw * .13, ih * .22), k.m("clay"))
    elif load == "firewood":
        for j in range(4): log(k, ix0, iy0 + j * ih / 4, ix1, iy0 + (j + 1) * ih / 4 - 1, k.c(BARKS[S]))
    if k.cond == "broken":                                                                                    # a wheel off and lying by it, the cart tilted
        d.rectangle([wx, Y1 - H * .12, wx + wl, Y1 - 1], fill=k.c(EARTH)[1]); k.rrect(X0 + 2, Y1 - H * .14, X0 + wl * .8, Y1 - 2, 3, k.wood, lv=1)
    k.wear(bx0, by0, bx1, by1, body)


JARS = {"central": (WHITE, R_((60, 90, 150), 18)), "atlantic": (WHITE, R_((60, 90, 150), 18)), "mediterranean": (R_((230, 220, 190), 10), R_((200, 140, 40), 18)),
        "islamic": (R_((60, 150, 160), 18), R_((40, 60, 140), 18)), "eastasia": (WHITE, R_((40, 60, 150), 18)), "southasia": (BRASS, R_((160, 50, 40), 18)),
        "steppe": (R_((180, 140, 100), 14), R_((60, 100, 170), 18)), "seasia": (R_((190, 170, 120), 12), R_((80, 110, 60), 16)),
        "africa": (R_((150, 90, 60), 14), R_((214, 180, 120), 12)), "americas": (R_((190, 120, 80), 14), R_((40, 40, 40), 10)),
        "oceania": (R_((200, 180, 140), 12), R_((80, 50, 40), 12)), "northern": (R_((140, 150, 160), 14), R_((60, 90, 150), 18)), "polar": (R_((160, 160, 156), 12), R_((60, 60, 60), 10))}
HERBS = [R_((90, 120, 60), 14), R_((150, 100, 60), 14), R_((200, 170, 90), 12), R_((120, 40, 40), 14), R_((210, 200, 180), 10), R_((70, 60, 50), 10)]


def apothecary(tm, x, y, w, h, st, v):
    """An apothecary's cabinet against the wall, seen from above: the top of its tall upper case with the jars standing
    on it, and the projecting counter with its rows of drawers below; open, the drawers pulled out showing their herbs,
    roots and powders. The jars: white and blue albarelli in Europe, yellow majolica in the Mediterranean, turquoise and
    cobalt in the Islamic world, blue-and-white porcelain over the many-drawered cabinet of East Asia, brass in South
    Asia; Victorian: glass carboys of coloured water; 20th century: white enamel; Modern: white shelving and boxed
    medicines; Future: a dispensary unit with a lit panel."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    case = k.wood if stg in "MEV" else k.c(ENAMEL_W) if stg in "WN" else k.comp
    if S == "eastasia" and stg in "MEV": case = k.c(R_((120, 70, 40), 14))
    uy1 = k.fy(.52)
    if k.make in ("shelves", "counter") and stg in "WNF":
        k.sh(X0, Y0, X1, Y1, 4); bx = ["brown", "blue", "green", "white"] if stg == "W" else ["red", "blue", "green", "yellow", "white", "orange"]
        if k.make == "shelves":                                                                         # open shelving, bottles and boxed medicines in rows
            k.rect(X0, Y0, X1, Y1, case, lv=1)
            for row, (sy0, sy1) in enumerate(((Y0 + 3, k.fy(.33)), (k.fy(.36), k.fy(.64)), (k.fy(.67), Y1 - 3))):
                d.line([X0 + 2, sy1 + 1, X1 - 2, sy1 + 1], fill=case[0])
                n_ = 7 + k.wealth
                for i in range(n_):
                    gx0 = X0 + 3 + i * (W - 6) / n_; gx1 = gx0 + (W - 6) / n_ - 2
                    C = k.c(DYES[bx[(i + row * 2) % len(bx)]]) if stg != "F" else [k.comp, k.c(R_((200, 220, 230), 10))][i % 2]
                    if stg == "W" and i % 2: k.disc((gx0 + gx1) / 2, (sy0 + sy1) / 2, (gx1 - gx0) / 2, (gx1 - gx0) / 2, C)
                    else: k.rect(gx0, sy0, gx1, sy1, C, lv=3)
        else:                                                                                           # a glass-topped dispensing counter
            k.rect(X0, Y0, X1, Y1, case)
            d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 12], fill=k.c(R_((176, 206, 214), 10))[2], outline=OUT)
            for i in range(6): k.rect(X0 + 9 + i * (W - 18) / 6, Y0 + 9, X0 + 5 + (i + 1) * (W - 18) / 6, Y1 - 16, k.c(DYES[bx[i % len(bx)]]), lv=1)
            k.rect(k.fx(.7), Y1 - 11, k.fx(.9), Y1 - 2, k.c(PLASTIC_GREY) if stg != "W" else k.c(BRASS))   # the till
        if stg == "F": k.glowline(X0 + 4, Y1 - 3, X1 - 4, Y1 - 3)
        if st == "open":
            for i in range(0, 6, 2): k.rect(X0 + i * W / 6 + 3, Y1 - 4, X0 + (i + 1) * W / 6 - 3, Y1 + 6, case, lv=3)   # drawers pulled out
        if k.cond == "broken": d.line([X0 + W * .25, Y0 + 2, X0 + W * .35, Y1 - 2], fill=OUT, width=2)
        k.wear(X0, Y0, X1, Y1, case); return
    k.sh(X0, Y0, X1, Y1, 4)
    k.rect(X0, uy1, X1, Y1, case, lv=1)                                                                      # the counter
    k.rect(X0, Y0, X1, uy1, case)                                                                            # the upper case's top
    if k.wealth >= 3 and stg in "MEV": k.inlay(X0, Y0, X1, uy1, 4)
    jar, band = (k.c(JARS[S][0]), k.c(JARS[S][1])) if stg in "ME" else ((k.c(R_((200, 220, 230), 12)), None) if stg == "V" else (k.c(ENAMEL_W), k.paint) if stg in "WN" else (k.comp, None))
    n = 6 + k.wealth
    for i in range(n):
        cx_ = X0 + (i + .5) * W / n; r = min(W / n * .42, (uy1 - Y0) * .4)
        if stg == "V":
            liq = k.c([DYES["red"], DYES["green"], DYES["blue"], DYES["yellow"]][i % 4])
            k.disc(cx_, (Y0 + uy1) / 2, r, r, jar); d.ellipse([cx_ - r * .6, (Y0 + uy1) / 2 - r * .6, cx_ + r * .6, (Y0 + uy1) / 2 + r * .6], fill=liq[2]); d.point((cx_ - r * .4, (Y0 + uy1) / 2 - r * .5), fill=WHITE[4])
        elif stg == "N":
            k.rect(cx_ - r, Y0 + 3, cx_ + r, uy1 - 3, k.c(ENAMEL_W), lv=3); d.line([cx_ - r + 2, (Y0 + uy1) / 2, cx_ + r - 2, (Y0 + uy1) / 2], fill=[k.paint, k.acc, k.acc2][i % 3][2], width=2)
        else:
            k.disc(cx_, (Y0 + uy1) / 2, r, r, jar)
            if band: d.ellipse([cx_ - r + 2, (Y0 + uy1) / 2 - r + 2, cx_ + r - 2, (Y0 + uy1) / 2 + r - 2], outline=band[2], width=2)
            k.disc(cx_, (Y0 + uy1) / 2, r * .4, r * .4, jar, lv=3)
    if stg == "F": k.glowline(X0 + 4, uy1 - 3, X1 - 4, uy1 - 3)
    # the drawers
    nd = 6 if S != "eastasia" else 10
    dw = W / nd
    for i in range(nd):
        dx0 = X0 + i * dw + 2; dx1 = X0 + (i + 1) * dw - 2
        if st == "open" and i % 2 == 0:
            k.rect(dx0, uy1 + 2, dx1, Y1 + 6, case, lv=3); d.rectangle([dx0 + 3, uy1 + 4, dx1 - 3, Y1 + 3], fill=k.c(HERBS[(i // 2) % len(HERBS)])[2])
            k.strokes(dx0 + 3, uy1 + 4, dx1 - 3, Y1 + 3, k.c(HERBS[(i // 2) % len(HERBS)]), 6, ln=(2, 4))
        else:
            k.disc((dx0 + dx1) / 2, Y1 - 3, 2, 2, k.c(BRASS))
    # a mortar on the counter
    if st != "open": k.disc(X1 - W * .1, (uy1 + Y1) / 2, (Y1 - uy1) * .35, (Y1 - uy1) * .35, k.c(BRASS) if k.rich else k.c(STONE)); d.line([X1 - W * .1, (uy1 + Y1) / 2, X1 - W * .05, uy1 + 1], fill=k.wood[1], width=2)
    if k.cond == "broken":
        for i in range(2): k.blob(X0 + W * (.3 + .2 * i), (Y0 + uy1) / 2, 5, 3, jar, n=4)
        d.line([X0 + W * .25, Y0 + 2, X0 + W * .35, uy1 - 2], fill=OUT, width=2)
    k.wear(X0, Y0, X1, Y1, case)


def alembic(tm, x, y, w, h, st, v):
    """An alembic still on its little furnace, from above: the round furnace with its fire (lit) or cold ash (out), the
    cucurbit with the alembic head over it, the long beak running down to the receiver flask on its stand. Medieval to
    Age of Reason: copper and glass, earthen in poorer houses, East Asia a stacked ceramic still; Victorian: a glass
    retort on a ring stand over a spirit lamp; 20th century: a flask and a water-jacketed condenser; Modern: a rotary
    evaporator; Future: a sealed glass coil with a lit core."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    lit = st != "out"; glass = k.c(R_((170, 210, 220), 16)); liq = k.c(DYES.get(v.get("liquor", "green"), DYES["green"]))
    fx, fy = k.fx(.3), k.cy; fr = min(W * .27, H * .45)
    stand = k.wood if stg in "MEVW" else k.c(STEEL) if stg == "N" else k.comp
    k.rect(X0, Y0 + 2, X1, Y1 - 2, stand, lv=1)                                                                 # the bench top it stands on
    if stg in "ME":
        furn = k.c(R_((150, 80, 60), 16)) if S not in ("eastasia",) else k.c(R_((110, 110, 100), 12))
        k.sh(fx - fr, fy - fr, fx + fr, fy + fr, 3, "ellipse"); k.disc(fx, fy, fr, fr, furn)
        d.ellipse([fx - fr * .82, fy - fr * .82, fx + fr * .82, fy + fr * .82], fill=(255, 150, 60) if lit else (50, 44, 44))
        if lit: tm.hearths = getattr(tm, "hearths", []) + [(int(fx), int(fy), 50, None)]
        pot_c = k.c(COPPER) if (k.wealth >= 3 or S == "islamic") else k.m("clay")
        if S == "eastasia": pot_c = k.c(R_((140, 170, 150), 14))
        k.disc(fx, fy, fr * .68, fr * .68, pot_c); k.disc(fx, fy, fr * .4, fr * .4, pot_c, lv=3)
        k.bar(fx + fr * .3, fy - fr * .2, k.fx(.8), k.fy(.7), pot_c, 3)                                          # the beak
        k.disc(k.fx(.82), k.fy(.68), H * .2, H * .2, glass); d.ellipse([k.fx(.82) - H * .12, k.fy(.68) - H * .12, k.fx(.82) + H * .12, k.fy(.68) + H * .12], fill=liq[2])
    elif k.make == "copper" and stg in "VWN":                                                          # a copper pot still on its burner, the worm tub beside
        k.sh(fx - fr, fy - fr, fx + fr, fy + fr, 3, "ellipse"); k.disc(fx, fy, fr, fr, k.c(IRON))
        if lit: d.ellipse([fx - fr * .9, fy - fr * .9, fx + fr * .9, fy + fr * .9], outline=(255, 150, 60), width=2); tm.hearths = getattr(tm, "hearths", []) + [(int(fx), int(fy), 40, None)]
        k.disc(fx, fy, fr * .8, fr * .8, k.c(COPPER)); k.disc(fx, fy, fr * .4, fr * .4, k.c(COPPER), lv=3)
        k.bar(fx + fr * .3, fy - fr * .2, k.fx(.78), k.fy(.35), k.c(COPPER), 4)                                # the lyne arm
        bucket(k, k.fx(.8), k.fy(.55), H * .3, k.wood if stg != "N" else k.c(STEEL), fill=WATER)
        d.arc([k.fx(.8) - H * .18, k.fy(.55) - H * .18, k.fx(.8) + H * .18, k.fy(.55) + H * .18], 0, 300, fill=k.c(COPPER)[3], width=2)   # the worm
        k.disc(X1 - 6, Y1 - 7, 5, 5, glass); d.ellipse([X1 - 9, Y1 - 10, X1 - 3, Y1 - 4], fill=liq[2])
    elif k.make == "condenser" and stg in "VWN":                                                       # a flask over its burner and a long water-jacketed condenser
        k.disc(fx, fy, fr * .5, fr * .5, k.c(BRASS) if stg == "V" else k.c(STEEL))
        if lit: d.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=(120, 160, 255)); tm.hearths = getattr(tm, "hearths", []) + [(int(fx), int(fy), 34, None)]
        k.disc(fx, fy - 2, fr * .65, fr * .65, glass); d.ellipse([fx - fr * .4, fy - fr * .3, fx + fr * .4, fy + fr * .35], fill=liq[2])
        k.bar(fx + fr * .5, fy - fr * .3, X1 - 8, Y0 + 6, glass, 7); d.line([fx + fr * .6, fy - fr * .3, X1 - 9, Y0 + 7], fill=k.c(R_((90, 140, 200), 10))[3])
        k.bar(k.fx(.6), k.fy(.2), k.fx(.6), Y0 + 2, k.c(R_((150, 60, 50), 8)), 2); k.disc(X1 - 8, Y1 - 8, 6, 6, glass)
        k.rect(k.fx(.6), Y1 - 12, k.fx(.75), Y1 - 4, k.paint)
    elif stg in "VW":
        k.disc(fx, fy, fr * .55, fr * .55, k.c(BRASS)); 
        if lit: d.ellipse([fx - 4, fy - 4, fx + 4, fy + 4], fill=(120, 160, 255)); tm.hearths = getattr(tm, "hearths", []) + [(int(fx), int(fy), 34, None)]
        d.ellipse([fx - fr, fy - fr, fx + fr, fy + fr], outline=k.c(IRON)[2], width=2)                           # the ring stand
        k.disc(fx, fy - 2, fr * .7, fr * .7, glass); d.ellipse([fx - fr * .45, fy - fr * .3, fx + fr * .45, fy + fr * .4], fill=liq[2])
        if stg == "W" and not k.glob:
            k.bar(fx + fr * .5, fy, X1 - 6, fy + H * .1, glass, 5); d.line([fx + fr * .8, fy + 1, X1 - 8, fy + H * .1 + 1], fill=liq[3])   # the condenser
            k.disc(X1 - 7, Y1 - H * .2, 6, 6, glass)
        else:
            k.bar(fx + fr * .4, fy - fr * .3, X1 - 8, Y1 - H * .25, glass, 3); k.disc(X1 - 9, Y1 - H * .25, 7, 7, glass); d.ellipse([X1 - 13, Y1 - H * .25 - 3, X1 - 5, Y1 - H * .25 + 3], fill=liq[2])
        k.rect(k.fx(.55), Y0 + 4, k.fx(.75), Y0 + 10, k.paint)                                                    # a labelled bottle box
    elif stg == "N":
        k.rect(X0 + 2, Y0 + 2, k.fx(.45), Y1 - 2, k.paint); d.rectangle([X0 + 5, Y0 + 5, k.fx(.42), k.fy(.35)], fill=k.glow[0])
        k.disc(k.fx(.62), k.cy, H * .28, H * .28, glass); d.ellipse([k.fx(.62) - H * .16, k.cy - H * .16, k.fx(.62) + H * .16, k.cy + H * .16], fill=liq[2])
        k.bar(k.fx(.45), k.fy(.3), k.fx(.9), k.fy(.25), glass, 4); k.disc(k.fx(.9), k.fy(.7), H * .18, H * .18, glass)
        if lit: d.rectangle([k.fx(.55), Y1 - 6, k.fx(.7), Y1 - 3], fill=(255, 120, 60))
    else:
        k.future_shell(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, 5)
        if k.make == "copper": k.disc(k.fx(.25), k.cy, H * .3, H * .3, k.c(COPPER)); k.bar(k.fx(.3), k.cy, k.fx(.6), k.cy, k.c(COPPER), 4)
        if k.make == "condenser":
            for gx in np.arange(k.fx(.62), X1 - 6, 6): d.line([gx, Y0 + 5, gx, Y1 - 5], fill=k.glow[1] if lit else k.comp[3], width=2)
        d.ellipse([k.cx - H * .3, k.cy - H * .3, k.cx + H * .3, k.cy + H * .3], fill=liq[1] if lit else OUT, outline=k.glow[1] if lit else k.comp[0], width=2)
        for a in range(0, 360, 60): d.arc([k.cx - H * .2, k.cy - H * .2, k.cx + H * .2, k.cy + H * .2], a, a + 30, fill=k.glow[2] if lit else k.comp[3])
    if k.cond == "broken":
        for px_ in (k.fx(.7), k.fx(.85)): d.polygon([(px_, k.fy(.3)), (px_ + 4, k.fy(.2)), (px_ + 6, k.fy(.35))], fill=glass[3], outline=OUT)   # broken glass
        k.blob(k.fx(.75), k.fy(.85), 6, 3, liq, n=4)
    k.wear(X0, Y0, X1, Y1, stand)


PAINTINGS = {"landscape": ((120, 160, 200), (70, 110, 60)), "portrait": ((60, 50, 44), (210, 170, 140)), "still life": ((50, 44, 40), (190, 120, 50)),
             "icon": ((200, 160, 60), (150, 40, 40)), "seascape": ((120, 160, 200), (40, 70, 110)), "abstract": ((220, 60, 50), (40, 90, 170))}


def easel(tm, x, y, w, h, st, v):
    """A painter's easel from above: the three legs splayed, the canvas leaning back on it so its painted face shows
    foreshortened in its frame, the palette with its blobs of colour and the brushes beside. Renaissance and Age of
    Reason: a wooden easel with pegs; Victorian: the heavy studio easel; 20th century and Modern: a metal tripod easel;
    Future: a lit display canvas. East Asia, the Islamic world and South Asia: the painter works on the floor, paper or
    silk laid on felt, with the ink stone and brushes, or the miniature on a low desk."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    sub = v.get("subject", "landscape"); A, B = PAINTINGS.get(sub, PAINTINGS["landscape"]); A, B = k.c(R_(A, 16)), k.c(R_(B, 16))
    def painting(x0, y0, x1, y1):
        d.rectangle([x0, y0, x1, y1], fill=A[2], outline=OUT)
        if sub in ("landscape", "seascape"): d.rectangle([x0 + 1, (y0 + y1) / 2, x1 - 1, y1 - 1], fill=B[2]); d.ellipse([x0 + 4, y0 + 2, x0 + 9, y0 + 6], fill=WHITE[4])
        elif sub in ("portrait",): k.disc((x0 + x1) / 2, (y0 + y1) / 2 - 1, (x1 - x0) * .18, (y1 - y0) * .3, B)
        elif sub == "icon": k.disc((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * .2, (y1 - y0) * .35, B); d.ellipse([(x0 + x1) / 2 - 3, y0 + 1, (x0 + x1) / 2 + 3, y0 + 5], fill=BRASS[4])
        elif sub == "still life": k.disc((x0 + x1) / 2 - 4, (y0 + y1) / 2 + 2, 4, 3, B); k.disc((x0 + x1) / 2 + 4, (y0 + y1) / 2 + 3, 3, 3, k.c(R_((150, 40, 40), 14)))
        else: d.rectangle([x0 + 2, y0 + 2, (x0 + x1) / 2, y1 - 2], fill=B[2]); d.ellipse([(x0 + x1) / 2, y0 + 2, x1 - 2, y1 - 2], fill=k.c(DYES["yellow"])[3])
    if S in ("eastasia", "islamic", "southasia") and stg in "EVW":
        felt = k.m("cloth") if S != "eastasia" else k.c(R_((60, 60, 70), 10))
        k.rect(X0, Y0 + 2, X1, Y1 - 2, felt); k.pattern(X0 + 2, Y1 - 7, X1 - 2, Y1 - 3) if k.wealth >= 3 else None
        k.rect(k.fx(.15), k.fy(.15), k.fx(.7), k.fy(.8), k.c(R_((234, 226, 200), 8)))                         # the paper or silk
        if S == "eastasia":
            for i in range(3): d.line([k.fx(.25 + i * .12), k.fy(.7), k.fx(.32 + i * .1), k.fy(.25)], fill=k.c(BLACK)[1], width=2)   # ink bamboo
            k.rect(k.fx(.78), k.fy(.15), k.fx(.95), k.fy(.45), k.c(BLACK))                                                         # the ink stone
        else:
            painting(k.fx(.25), k.fy(.25), k.fx(.6), k.fy(.7)); d.rectangle([k.fx(.2), k.fy(.2), k.fx(.65), k.fy(.75)], outline=k.c(BRASS)[3])
            k.disc(k.fx(.85), k.fy(.3), 4, 4, k.acc)
        for i in range(3): k.bar(k.fx(.78), k.fy(.55) + i * 4, k.fx(.97), k.fy(.55) + i * 4, k.wood, 2)
        k.wear(X0, Y0, X1, Y1, felt); return
    leg = k.wood if stg in "EV" else k.c(STEEL) if stg in "WN" else k.comp
    if k.make in ("studio", "box") and stg in "WN": leg = k.c(R_((150, 110, 70), 12)) if k.v.get("livery") != "black" else k.c(BLACK)
    k.sh(k.fx(.1), k.fy(.2), k.fx(.9), Y1, 3)
    if k.make == "studio":                                                                              # an H-frame studio easel: a broad base and its crank
        k.rect(k.fx(.05), k.fy(.62), k.fx(.95), k.fy(.74), leg); k.rect(k.fx(.05), k.fy(.08), k.fx(.15), Y1 - 2, leg, lv=3); k.rect(k.fx(.85), k.fy(.08), k.fx(.95), Y1 - 2, leg, lv=3)
        k.disc(k.fx(.9), k.fy(.8), 4, 4, k.c(IRON))
    elif k.make == "box":                                                                               # a box easel, its paint drawer open with the tubes
        for ex, ey in ((k.fx(.08), Y1 - 2), (k.fx(.92), Y1 - 2), (k.cx, Y0 + 2)): k.bar(k.cx, k.fy(.6), ex, ey, leg, 3)
        k.rect(k.fx(.2), k.fy(.64), k.fx(.8), Y1 - 3, leg, lv=3)
        for i, cc in enumerate(("red", "blue", "yellow", "white", "green", "black")): d.rectangle([k.fx(.24) + i * W * .09, k.fy(.7), k.fx(.24) + i * W * .09 + W * .06, Y1 - 7], fill=k.c(DYES[cc])[3], outline=OUT)
    else:
        for ex, ey in ((k.fx(.08), Y1 - 2), (k.fx(.92), Y1 - 2), (k.cx, Y0 + 2)): k.bar(k.cx, k.fy(.45), ex, ey, leg, 3 if stg in "EV" else 2)
    if stg == "V": k.rect(k.fx(.1), k.fy(.62), k.fx(.9), k.fy(.7), leg)                                         # the heavy easel's ledge
    # the canvas, leant back and foreshortened
    if stg == "F":
        d.rectangle([k.fx(.18), k.fy(.15), k.fx(.82), k.fy(.6)], fill=k.glow[0], outline=k.glow[1]); painting(k.fx(.24), k.fy(.2), k.fx(.76), k.fy(.55))
    else:
        fr = k.c(BRASS) if k.rich else k.wood
        d.rectangle([k.fx(.16), k.fy(.12), k.fx(.84), k.fy(.62)], fill=fr[2], outline=OUT); painting(k.fx(.2), k.fy(.16), k.fx(.8), k.fy(.58))
    if k.e == 3:                                                                                            # Age of Reason: the maulstick across and the colourman's box
        k.bar(k.fx(.1), k.fy(.62), k.fx(.9), k.fy(.08), k.wood, 2); k.disc(k.fx(.9), k.fy(.08), 3, 3, k.c(LEATHER))
        k.rect(k.fx(.62), k.fy(.66), k.fx(.95), Y1 - 2, k.wood, lv=3); d.line([k.fx(.62), k.fy(.8), k.fx(.95), k.fy(.8)], fill=k.wood[0])
    # the palette and brushes on a stool
    px_, py_ = k.fx(.15), k.fy(.82)
    if k.make == "box": px_, py_ = k.fx(.15), k.fy(.3)
    k.blob(px_, py_, W * .13, H * .1, k.c(R_((190, 150, 100), 12)), n=4, jit=.05)
    for i, C in enumerate((A, B, k.acc, k.c(WHITE))): d.ellipse([px_ - 7 + i * 4, py_ - 3, px_ - 4 + i * 4, py_], fill=C[3])
    for i in range(2 + k.wealth // 2): k.bar(k.fx(.68), k.fy(.78) + i * 3, k.fx(.95), k.fy(.74) + i * 3, k.wood, 1)
    if k.cond == "broken": d.line([k.fx(.2), k.fy(.15), k.fx(.75), k.fy(.6)], fill=OUT, width=2)              # the canvas slashed
    k.wear(k.fx(.16), k.fy(.12), k.fx(.84), k.fy(.62))


def piano(tm, x, y, w, h, st, v):
    """A piano against the wall, from above: the top of its case, and at the front the keyboard, open with its white and
    black keys or shut under the fall. Age of Reason: a square piano, a long box on turned legs with the keys at its
    left front; Victorian: an upright in rosewood or walnut with brass candle sconces and music on its top; 20th
    century: an upright with a runner, a vase and photographs on it, the spinet of mid-century; Modern: a digital
    piano; Future: a dark keyboard with lit keys. Rich cases inlaid in the style's pattern, East Asian ones black lacquer
    with gold."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    finish = v.get("finish", "wood")
    case = {"wood": k.wood, "black": k.c(BLACK), "painted": k.acc, "pale": k.c(R_((214, 196, 160), 12)), "white": k.c(R_((236, 234, 226), 10))}.get(finish, k.wood)
    if stg == "N": case = {"pale": k.c(PLASTIC_WHITE), "white": k.c(R_((236, 234, 226), 10)), "wood": k.c(R_((120, 70, 40), 20))}.get(finish, k.c(BLACK))
    if stg == "F": case = k.c(R_(mix(k.comp[2], case[2], .45), 14))
    ky0 = Y1 - H * (.3 if stg != "E" else .26)
    k.sh(X0, Y0, X1, Y1, 4)
    if k.make == "stage" and stg in "NF":                                                               # a stage keyboard on its X stand
        k.bar(X0 + 6, Y0 + 4, X1 - 6, Y1 - 4, k.c(STEEL), 4); k.bar(X1 - 6, Y0 + 4, X0 + 6, Y1 - 4, k.c(STEEL), 4)
        ky0 = k.fy(.4); k.rect(X0, k.fy(.22), X1, Y1 - H * .12, case, lv=1); kx0, kx1 = X0 + W * .05, X1 - W * .05
        d.rectangle([X0 + W * .3, k.fy(.25), X1 - W * .3, k.fy(.36)], fill=k.glow[1] if stg == "F" else k.c(PLASTIC_GREY)[1])
    elif stg == "E":                                                                                           # the square piano on its legs
        for lx, ly in ((X0 + 4, Y0 + 3), (X1 - 6, Y0 + 3), (X0 + 4, Y1 - 4), (X1 - 6, Y1 - 4)): k.disc(lx, ly, 3, 3, case, lv=1)
        k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 4, case)
        kx0, kx1 = X0 + 6, X0 + W * .62
    else:
        k.rect(X0, Y0, X1, ky0, case); k.rect(X0 + 2, ky0, X1 - 2, Y1, case, lv=1)
        kx0, kx1 = X0 + W * .12, X1 - W * .12
        if k.make == "upright" and stg in "NF": d.rectangle([X0 + 4, Y0 + 4, X1 - 4, ky0 - 4], outline=case[4]); k.rect(k.cx - W * .2, Y0 + 3, k.cx + W * .2, Y0 + 10, k.c(R_((230, 224, 200), 8)), lv=3)   # an acoustic upright, its lid and music
    if k.rich and stg in "EVW": k.inlay(X0 + 2, Y0 + 2, X1 - 2, ky0 - 1, 5)
    if S == "eastasia" and stg in "VW": d.rectangle([X0 + 4, Y0 + 4, X1 - 4, ky0 - 4], outline=k.c(BRASS)[3])
    if st == "open" or k.make == "stage" and stg in "NF":
        if k.make == "stage" and stg in "NF": ky0, Y1 = k.fy(.4), Y1 - H * .14
        d.rectangle([kx0, ky0 + 2, kx1, Y1 - 2], fill=WHITE[3] if stg != "F" else k.glow[2], outline=OUT)
        for gx in np.arange(kx0 + 3, kx1 - 2, 3.4): d.line([gx, ky0 + 3, gx, Y1 - 3], fill=WHITE[1] if stg != "F" else k.glow[1])
        for i, gx in enumerate(np.arange(kx0 + 4, kx1 - 4, 3.4)):
            if i % 7 not in (2, 6): d.line([gx + 1, ky0 + 3, gx + 1, (ky0 + Y1) / 2 + 1], fill=OUT, width=2)
    else:
        k.rect(kx0, ky0 + 2, kx1, Y1 - 2, case, lv=3)                                                          # the fall shut over the keys
    # things on the top
    if stg == "V":
        for sx in (X0 + 8, X1 - 8): k.disc(sx, ky0 - 5, 3, 3, k.c(BRASS)); d.point((sx, ky0 - 6), fill=(255, 220, 140))
        k.rect(k.cx - 12, Y0 + 3, k.cx + 12, Y0 + 13, k.c(R_((230, 224, 200), 8)), lv=3)                       # music
    elif stg == "W":
        cloth_web(k, X0 + W * .15, Y0 + 3, X1 - W * .15, Y0 + 11, k.m("cloth"))                                 # a runner
        pot(k, X0 + W * .2, Y0 + 7, 5, k.acc2); k.rect(X1 - W * .3, Y0 + 3, X1 - W * .22, Y0 + 12, k.c(BRASS), lv=3)
    elif stg == "N" and k.make not in ("stage", "upright"): k.rect(k.cx - 10, Y0 + 3, k.cx + 10, ky0 - 3, k.c(PLASTIC_GREY), lv=3); d.rectangle([k.cx - 6, Y0 + 5, k.cx + 6, Y0 + 9], fill=k.glow[1])
    elif stg == "F": k.glowline(X0 + 3, ky0, X1 - 3, ky0)
    if k.cond == "broken":
        d.line([X0 + W * .6, Y0 + 2, X0 + W * .68, ky0 - 2], fill=OUT, width=2)
        if st == "open": d.rectangle([kx0 + (kx1 - kx0) * .4, ky0 + 3, kx0 + (kx1 - kx0) * .5, Y1 - 3], fill=OUT)   # keys missing
    k.wear(X0, Y0, X1, ky0, case)


def organ(tm, x, y, w, h, st, v):
    """A church organ against the wall, from above: the case with the open tops of its pipes in rows and round towers,
    the console at the front with its keyboards and stop knobs, and the organist's bench. Long Night: a modest positive
    on a gallery; Renaissance and Age of Reason: a carved case with towers; Victorian: gilt display pipes; 20th
    century: a detached console with stop tabs; Modern: the same with a lit music desk; Future: a dark case with lit
    pipe mouths. The case oak, painted or gilt."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fin = v.get("case", "oak")
    case = {"oak": k.wood, "painted": k.acc, "gilt": k.c(R_((200, 160, 60), 20)), "dark": k.c(R_((60, 40, 36), 12)), "white": k.c(R_((226, 220, 204), 10))}.get(fin, k.wood)
    if stg == "F": case = k.comp
    pipe = k.c(TIN) if not (stg == "V" and k.rich) else k.c(BRASS)
    cy1 = k.fy(.62)
    k.sh(X0, Y0, X1, cy1, 5); k.rect(X0, Y0, X1, cy1, case)
    if fin in ("painted", "gilt") or k.wealth >= 5: k.pattern(X0 + 3, Y0 + 3, X1 - 3, Y0 + 10)
    # the pipe towers and flats
    towers = [k.fx(.12), k.fx(.5), k.fx(.88)] if stg != "M" else [k.fx(.5)]
    tr = min(W * .1, (cy1 - Y0) * .4)
    for tx in towers:
        k.disc(tx, (Y0 + cy1) / 2, tr, tr, case, lv=3)
        for a in np.linspace(0, 2 * math.pi, 9)[:-1]:
            px_, py_ = tx + math.cos(a) * tr * .62, (Y0 + cy1) / 2 + math.sin(a) * tr * .62
            d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=pipe[3], outline=OUT); d.point((px_, py_), fill=(k.glow[2] if stg == "F" else OUT))
        d.ellipse([tx - 4, (Y0 + cy1) / 2 - 4, tx + 4, (Y0 + cy1) / 2 + 4], fill=pipe[2], outline=OUT)
    for fx0, fx1 in ((k.fx(.24), k.fx(.4)), (k.fx(.6), k.fx(.76))) if stg != "M" else ((k.fx(.2), k.fx(.38)), (k.fx(.62), k.fx(.8))):
        for row in range(3):
            yy = Y0 + (cy1 - Y0) * (.25 + row * .25)
            for px_ in np.arange(fx0, fx1, 7):
                d.ellipse([px_ - 2.5, yy - 2.5, px_ + 2.5, yy + 2.5], fill=pipe[2 + row % 2], outline=OUT)
    # the console and bench
    c0, c1 = k.fx(.32), k.fx(.68)
    k.sh(c0, cy1, c1, k.fy(.84), 3); k.rect(c0, cy1, c1, k.fy(.84), case, lv=1)
    nm = 1 if stg == "M" else 2 if stg in "E" else 3
    for i in range(nm):
        ky = cy1 + 3 + i * 6; d.rectangle([c0 + 8, ky, c1 - 8, ky + 4], fill=WHITE[3], outline=OUT)
        for gx in np.arange(c0 + 10, c1 - 9, 4): d.line([gx, ky + 1, gx, ky + 2], fill=OUT)
    for sx in (c0 + 3, c1 - 4):
        for i in range(3): k.disc(sx, cy1 + 4 + i * 5, 2, 2, k.c(BRASS) if stg != "W" else k.paint)
    if stg in "NF": d.rectangle([k.cx - 10, cy1 + 2, k.cx + 10, cy1 + 6], fill=k.glow[1])
    k.rect(k.fx(.36), k.fy(.88), k.fx(.64), Y1 - 1, case, lv=3)                                                   # the bench
    if k.rich: k.ornament(X0, Y0, X1, cy1)
    if k.cond == "broken":
        for px_ in (k.fx(.3), k.fx(.33)): d.line([px_, Y0 + 6, px_ + 3, cy1 - 6], fill=OUT, width=2)
        k.blob(X0 + W * .1, Y1 - 6, 6, 3, pipe, n=4)                                                              # a fallen pipe
    k.wear(X0, Y0, X1, cy1, case)


def instrument(k, kind, cx, cy, L, ang, wood):
    """A stringed instrument lying flat: its body, sound hole, neck and pegs; harps and zithers with their strings."""
    d = k.d; ca, sa = math.cos(ang), math.sin(ang)
    P_ = lambda u, v_: (cx + u * ca - v_ * sa, cy + u * sa + v_ * ca)
    if kind in ("harp", "lyre"):
        pts = [P_(-L * .5, -L * .3), P_(L * .5, -L * .05), P_(-L * .3, L * .35)] if kind == "harp" else [P_(-L * .4, -L * .25), P_(L * .4, -L * .25), P_(L * .3, L * .3), P_(-L * .3, L * .3)]
        d.polygon(pts, outline=OUT, width=5); d.polygon(pts, outline=wood[2], width=3)
        for t in np.linspace(.15, .85, 6):
            a_, b_ = pts[0], pts[1]; p0 = (a_[0] + (b_[0] - a_[0]) * t, a_[1] + (b_[1] - a_[1]) * t); c_ = pts[-1]
            d.line([p0, (c_[0] + (b_[0] - c_[0]) * t, c_[1] + (b_[1] - c_[1]) * t)], fill=k.c(BRASS)[4])
        return
    if kind in ("zither", "kantele", "guqin"):
        wd = L * (.18 if kind == "guqin" else .3)
        pts = [P_(-L * .5, -wd * .6), P_(L * .5, -wd * .4 if kind == "kantele" else -wd * .6), P_(L * .5, wd * .4 if kind == "kantele" else wd * .6), P_(-L * .5, wd * .6)]
        k.poly(pts, wood)
        for t in np.linspace(-.4, .4, 6): d.line([P_(-L * .45, wd * t), P_(L * .45, wd * t)], fill=k.c(BRASS)[4])
        return
    # lutes, ouds, guitars, sitars, koras: a round or waisted body and a neck
    br = L * (.26 if kind in ("oud", "lute") else .22 if kind != "kora" else .3)
    neck = L * (.55 if kind not in ("sitar", "kora", "dombra") else .7)
    body = P_(-L * .5 + br, 0)
    k.sh(body[0] - br, body[1] - br, body[0] + br, body[1] + br, 3, "ellipse")
    k.bar(*body, *P_(-L * .5 + br + neck, 0), wood if kind != "kora" else k.wood, 4)
    if kind == "guitar" or kind == "electric":
        k.disc(*P_(-L * .5 + br * .8, 0), br * .9, br * .9, wood); k.disc(*body, br * .75, br * .75, wood)
    else:
        k.disc(*body, br, br * (.9 if kind != "dombra" else .7), wood if kind != "kora" else k.c(R_((210, 160, 70), 16)))
    if kind == "electric": k.rect(body[0] - 3, body[1] - 4, body[0] + 3, body[1] + 4, k.c(BLACK))
    else: d.ellipse([body[0] - br * .3, body[1] - br * .3, body[0] + br * .3, body[1] + br * .3], fill=OUT)    # the rose
    hx, hy = P_(-L * .5 + br + neck, 0); k.disc(hx, hy, 3, 3, wood, lv=1)
    if kind == "sitar": k.disc(*P_(-L * .5 + br + neck * .9, 0), br * .45, br * .45, k.c(R_((210, 160, 70), 16)))
    d.line([body, (hx, hy)], fill=k.c(STEEL)[4])


def harp(tm, x, y, w, h, st, v):
    """A harp or lute set down on its cushion or rug, from above. Each land plays its own: the lute in Central Europe and
    the Mediterranean, the harp in Atlantic Europe, the kantele in the north, the oud in the Islamic world, the dombra
    on the steppe, the sitar in South Asia, the guqin in East Asia, a boat zither in Southeast Asia, the kora in
    Africa, a small guitar in the Americas, the ukulele in Oceania and a lyre in the far north. From the Victorians on
    the guitar spreads; Modern: an electric guitar in the maker's paint; Future: a composite instrument with lit
    strings."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    kind = {"central": "lute", "atlantic": "harp", "northern": "kantele", "mediterranean": "lute", "islamic": "oud", "steppe": "dombra",
            "southasia": "sitar", "eastasia": "guqin", "seasia": "zither", "africa": "kora", "americas": "guitar", "oceania": "guitar", "polar": "lyre"}[S]
    if stg in "VW" and S in ("central", "mediterranean", "americas", "atlantic") and k.wealth < 5: kind = "guitar"
    if stg == "N" and S not in ("eastasia", "southasia", "islamic", "africa"): kind = "electric"
    rug = k.m("cloth")
    k.rrect(X0, Y0, X1, Y1, 4, rug); k.pattern(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, A=k.acc, B=k.acc2)
    if k.rich: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=k.c(BRASS)[3], width=2)
    wood = k.wood if kind not in ("electric",) else k.paint
    if stg == "F": wood = k.comp
    if kind == "oud" or kind == "lute": wood = k.c(R_((176, 120, 70), 16)) if S != "islamic" else k.c(R_((130, 80, 50), 14))
    instrument(k, kind, k.cx, k.cy, min(W, H) * 1.15, -.75 if kind not in ("harp", "lyre", "kantele") else 0, wood)
    if stg == "F": d.line([k.fx(.25), k.fy(.75), k.fx(.75), k.fy(.25)], fill=k.glow[2])
    if k.cond == "broken": d.line([k.fx(.3), k.fy(.3), k.fx(.6), k.fy(.7)], fill=OUT, width=2)
    k.wear(X0, Y0, X1, Y1, rug)


def drum(tm, x, y, w, h, st, v):
    """A drum from above, its head and how it is fixed: Africa a djembe, its goatskin laced with a net of cord; the
    Americas a big hand-painted frame drum; Oceania a sharkskin pahu laced with sennit; Southeast Asia a two-headed
    kendang lying on its side; South Asia a pair of tabla with their black tuning spots; East Asia a taiko with its
    rows of tacks on its stand; the steppe a shaman's frame drum, painted. Modern: a white synthetic head; Future: a
    composite drum with a lit rim. Rich drums carved or painted round the shell."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    skin = k.c(R_((214, 190, 150), 12) if stg not in "NF" else R_((232, 232, 226), 6))
    if S == "oceania" and stg not in "NF": skin = k.c(R_((150, 150, 140), 12))
    shell = k.wood if stg != "F" else k.comp
    cord = k.c(R_((200, 176, 120), 12)) if S != "africa" else k.acc
    r = min(W, H) * .46
    if S == "southasia":
        for cx_, rr, C in ((k.fx(.32), r * .55, shell), (k.fx(.7), r * .6, k.c(COPPER))):
            k.sh(cx_ - rr, k.cy - rr, cx_ + rr, k.cy + rr, 3, "ellipse"); k.disc(cx_, k.cy, rr, rr, C)
            d.ellipse([cx_ - rr * .8, k.cy - rr * .8, cx_ + rr * .8, k.cy + rr * .8], fill=skin[2], outline=cord[1])
            d.ellipse([cx_ - rr * .3, k.cy - rr * .3, cx_ + rr * .3, k.cy + rr * .3], fill=k.c(BLACK)[1])
        if k.wealth >= 2: k.pattern(k.fx(.1), Y1 - H * .2, k.fx(.9), Y1 - 2)
    elif S == "seasia":
        k.sh(X0 + 2, k.cy - r * .92, X1 - 2, k.cy + r * .92, 3)
        k.rrect(X0 + 2, k.cy - r * .92, X1 - 2, k.cy + r * .92, int(r * .6), shell)
        for ex in (X0 + 3, X1 - 9): d.ellipse([ex, k.cy - r * .45, ex + 6, k.cy + r * .45], fill=skin[2], outline=OUT)
        for gx in np.arange(X0 + 10, X1 - 10, 5): d.line([gx, k.cy - r * .5, gx + 3, k.cy + r * .5], fill=cord[2])   # the lacing along it
        if k.wealth >= 2: k.pattern(k.cx - r * .3, k.cy - r * .4, k.cx + r * .3, k.cy + r * .4)
    else:
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse")
        if S == "eastasia" and stg not in "F":
            k.rect(k.cx - r * 1.05, k.cy + r * .3, k.cx + r * 1.05, k.cy + r * .5, k.wood, lv=1)                     # the stand
        k.disc(k.cx, k.cy, r, r, shell if S not in ("steppe", "americas") else k.c(R_((150, 110, 70), 12)))
        hr = r * (.86 if S not in ("steppe", "americas") else .92)
        d.ellipse([k.cx - hr, k.cy - hr, k.cx + hr, k.cy + hr], fill=skin[2], outline=OUT)
        d.arc([k.cx - hr + 2, k.cy - hr + 2, k.cx + hr - 2, k.cy + hr - 2], 200, 260, fill=skin[4], width=2)
        if S == "africa":
            for a in range(0, 360, 20):
                p1 = (k.cx + r * math.cos(math.radians(a)), k.cy + r * math.sin(math.radians(a))); p2 = (k.cx + hr * .8 * math.cos(math.radians(a + 10)), k.cy + hr * .8 * math.sin(math.radians(a + 10)))
                d.line([p1, p2], fill=cord[2])
        elif S == "eastasia":
            for a in range(0, 360, 15): d.point((k.cx + r * .93 * math.cos(math.radians(a)), k.cy + r * .93 * math.sin(math.radians(a))), fill=k.c(BRASS)[4])
            d.ellipse([k.cx - hr * .4, k.cy - hr * .4, k.cx + hr * .4, k.cy + hr * .4], outline=k.acc2[2], width=2)   # the mitsudomoe ring
        elif S in ("steppe", "americas"):
            k.pattern(k.cx - hr * .5, k.cy - hr * .5, k.cx + hr * .5, k.cy + hr * .5)                                  # the painted head
        elif S == "oceania":
            for a in range(0, 360, 30): d.line([k.cx + r * math.cos(math.radians(a)), k.cy + r * math.sin(math.radians(a)), k.cx + hr * .7 * math.cos(math.radians(a)), k.cy + hr * .7 * math.sin(math.radians(a))], fill=cord[1], width=2)
        if k.wealth >= 3 and S not in ("steppe", "americas"): d.ellipse([k.cx - r, k.cy - r, k.cx + r, k.cy + r], outline=k.acc[2], width=3)
    # beaters
    if S in ("eastasia", "steppe", "americas"):
        for i in range(2 if S == "eastasia" else 1): k.bar(X1 - 4 - i * 4, Y1 - 3, X1 - 16 - i * 4, Y1 - 18, k.wood, 2)
    if stg == "F": d.ellipse([k.cx - r, k.cy - r, k.cx + r, k.cy + r], outline=k.glow[1], width=2)
    if k.cond == "broken": d.line([k.cx - r * .5, k.cy - r * .3, k.cx + r * .3, k.cy + r * .4], fill=OUT, width=2); d.line([k.cx - r * .2, k.cy + r * .3, k.cx + r * .1, k.cy - r * .1], fill=OUT, width=2)   # the head split
    k.wear(X0, Y0, X1, Y1, shell)


def bees(k, cx, cy, n=5):
    for i in range(n):
        a = i * 2.4; px_, py_ = cx + math.cos(a) * (3 + i), cy + math.sin(a) * (2 + i * .7)
        k.d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_], fill=(220, 170, 40)); k.d.point((px_, py_), fill=OUT)


def beehive(tm, x, y, w, h, st, v):
    """A beehive from above, on its stone or stand, the bees about its mouth. Europe: the straw skep, coil on coil, with
    a straw hackle over it in the Long Night; Victorian on: the white box hive with its lid and a stone on it;
    the Islamic world: stacked clay tube hives; Africa and Southeast Asia: a bark log hive; East Asia: an upright log
    hive with a little roof; the north: a hollowed log with its board roof; the Americas: a log hive of stingless bees;
    South Asia: a clay pot hive. Future: a composite hive with lit vents."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    r = min(W, H) * .44
    base = k.c(STONE) if S not in ("eastasia", "seasia") else k.wood
    if k.make == "topbar":                                                                                    # a long top-bar hive, its bars across, on legs
        C = k.paint if stg != "F" else k.comp
        k.sh(X0 + 1, Y0 + H * .15, X1 - 1, Y1 - H * .15, 4); k.rect(X0 + 1, Y0 + H * .15, X1 - 1, Y1 - H * .15, C)
        k.poly([(X0 + 1, k.cy), (k.cx, Y0 + H * .15), (X1 - 1, k.cy), (k.cx, Y1 - H * .15)], C, lv=3) if stg == "F" else None
        for gx in np.arange(X0 + 4, X1 - 3, 4): d.line([gx, Y0 + H * .15 + 2, gx, Y1 - H * .15 - 2], fill=C[1])
        k.rect(X0 + 1, k.cy - 3, X1 - 1, k.cy + 3, k.c(R_((140, 140, 136), 8)), lv=3)                            # the roof ridge
        bees(k, X1 - 6, Y1 - H * .1)
    elif k.make == "warre":                                                                                   # a Warre hive: square boxes under a gabled roof
        C = k.c(R_((190, 150, 100), 12)) if stg != "F" else k.comp
        k.sh(X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, 4)
        k.poly([(X0 + 2, Y0 + 2), (X1 - 2, Y0 + 2), (X1 - 2, k.cy)], C, lv=3); k.poly([(X0 + 2, Y0 + 2), (X0 + 2, k.cy), (X1 - 2, k.cy)], C, lv=3)
        k.rect(X0 + 2, Y0 + 2, k.cx, Y1 - 2, k.paint if stg != "F" else k.comp, lv=3); k.rect(k.cx, Y0 + 2, X1 - 2, Y1 - 2, k.paint if stg != "F" else k.comp, lv=1)   # the two roof faces
        d.line([k.cx, Y0 + 2, k.cx, Y1 - 2], fill=OUT, width=2)
        bees(k, k.cx, Y1 - 5)
    elif stg in "VWN" and S in ("central", "atlantic", "northern", "mediterranean", "americas", "oceania", "polar") or stg == "F":
        C = k.paint if stg != "F" else k.comp
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 4); k.rect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, C)
        k.rect(X0 + 5, Y0 + 5, X1 - 5, Y1 - 5, C, lv=3)                                                          # the lid
        if stg != "F": k.rect(k.cx - 6, k.cy - 4, k.cx + 6, k.cy + 4, k.c(R_((150, 80, 60), 16)))                  # a brick on the lid
        else: k.glowline(X0 + 6, Y1 - 6, X1 - 6, Y1 - 6, 3)
        d.rectangle([k.cx - 8, Y1 - 4, k.cx + 8, Y1 - 2], fill=OUT); bees(k, k.cx, Y1 - 6)
    elif S == "islamic":
        for i in range(3):
            ty = Y0 + 3 + i * H * .32
            k.rrect(X0 + 2, ty, X1 - 2, ty + H * .28, int(H * .12), k.m("clay")); d.ellipse([X1 - 9, ty + 3, X1 - 4, ty + H * .28 - 3], fill=OUT)
        bees(k, X1 - 8, k.cy)
    elif S in ("africa", "seasia", "americas", "northern", "oceania", "polar", "mediterranean"):
        bark = k.c(R_((196, 170, 130), 14)) if S == "mediterranean" else k.c(BARKS[S])                       # Mediterranean: a cork-bark hive
        k.sh(X0 + 2, k.cy - r * .76, X1 - 2, k.cy + r * .76, 3); log(k, X0 + 2, k.cy - r * .76, X1 - 2, k.cy + r * .76, bark, cut=False)
        if S == "mediterranean":
            for gx in np.arange(X0 + 8, X1 - 8, 9): d.line([gx, k.cy - r * .7, gx + 2, k.cy + r * .7], fill=bark[0], width=2)   # the cork's deep cracks
            k.rect(X0 + W * .3, k.cy - r * .9, X0 + W * .7, k.cy + r * .9, k.c(STONE), lv=3)                    # a slab laid on it
        d.ellipse([X1 - 9, k.cy - 3, X1 - 3, k.cy + 3], fill=OUT); bees(k, X1 - 8, k.cy + 4)
        if S in ("northern", "polar"): k.rect(X0 + 4, k.cy - r * .9, X1 - 10, k.cy - r * .1, k.wood, lv=3)    # the board roof
        if S == "oceania": k.rect(X0 + 2, k.cy - r * .2, X0 + 8, k.cy + r * .2, k.m("clay"))                     # the end stopped with clay
    elif S == "steppe":                                                                                       # an upright hollowed log hive with its board lid
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse"); k.disc(k.cx, k.cy, r, r, k.c(BARKS[S]))
        k.rect(k.cx - r * .75, k.cy - r * .75, k.cx + r * .75, k.cy + r * .75, k.wood, lv=3); k.disc(k.cx, k.cy, r * .2, r * .2, k.c(STONE))
        bees(k, k.cx + r * .7, k.cy + r * .7)
    elif S == "eastasia":
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3); k.poly([(k.cx - r, k.cy), (k.cx, k.cy - r), (k.cx + r, k.cy), (k.cx, k.cy + r)], k.c(R_((70, 66, 70), 10)))   # the little roof
        d.line([k.cx - r, k.cy, k.cx + r, k.cy], fill=OUT); d.line([k.cx, k.cy - r, k.cx, k.cy + r], fill=OUT); bees(k, k.cx + r * .6, k.cy + r * .5)
    elif S == "southasia":
        pot(k, k.cx, k.cy, r, k.m("clay"), lid=True); bees(k, k.cx + r * .6, k.cy + r * .6)
        if k.wealth >= 2: d.ellipse([k.cx - r + 2, k.cy - r + 2, k.cx + r - 2, k.cy + r - 2], outline=k.acc[2], width=2)
    else:                                                                                                    # the straw skep on its stone
        k.rect(X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, base, lv=1)
        if S == "atlantic": d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + H * .2], fill=k.c(STONE)[0], outline=OUT)   # in its bee bole in the wall
        sk = k.m("straw")
        k.sh(k.cx - r, k.cy - r, k.cx + r, k.cy + r, 3, "ellipse"); k.disc(k.cx, k.cy, r, r, sk)
        for rr in np.arange(r * .85, 2, -4): d.ellipse([k.cx - rr, k.cy - rr, k.cx + rr, k.cy + rr], outline=sk[1 if int(rr) % 8 < 4 else 3])
        for a in range(0, 360, 45): d.line([k.cx + r * .3 * math.cos(math.radians(a)), k.cy + r * .3 * math.sin(math.radians(a)), k.cx + r * .9 * math.cos(math.radians(a)), k.cy + r * .9 * math.sin(math.radians(a))], fill=sk[0])   # the bramble binding
        if k.e == 1 or k.poor: k.blob(k.cx, k.cy, r * .5, r * .5, k.c(HAY), n=6)                                  # the hackle
        bees(k, k.cx + r * .5, Y1 - 6)
    if k.cond == "broken": d.polygon([(k.cx - r * .2, k.cy - r * .9), (k.cx + r * .3, k.cy - r * .2), (k.cx - r * .4, k.cy)], fill=OUT)   # a hole torn in it
    k.wear(X0, Y0, X1, Y1)


def dovecote(tm, x, y, w, h, st, v):
    """A dovecote from above: its roof and the doves on it. Atlantic Europe: a round stone cote with a stone-slab cap and
    a lantern; Central Europe: a timbered cote on a post with a red tiled hip roof; the north: a plank cote with a
    board roof; the Mediterranean: a square tower with a terracotta pyramid roof; the Islamic world: a tall mud pigeon
    tower bristling with pots; East Asia: black tiles with upturned corners; elsewhere a thatched cote on a post.
    Modern: a pigeon loft with wire; Future: a composite roost."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    r = min(W, H) * .47; cx_, cy_ = k.cx, k.cy
    k.sh(X0, Y0, X1, Y1, 5, "ellipse" if S in ("atlantic", "islamic") else "rect")
    if k.make == "round" and stg in "NF":                                                                     # a round tiered cote on its post
        C = k.paint if stg == "N" else k.comp
        k.disc(cx_, cy_, r, r, C)
        for rr in (r * .72, r * .45): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], fill=C[3 if rr > r * .5 else 2], outline=OUT)
        for a in range(0, 360, 60): d.ellipse([cx_ + r * .86 * math.cos(math.radians(a)) - 3, cy_ + r * .86 * math.sin(math.radians(a)) - 3, cx_ + r * .86 * math.cos(math.radians(a)) + 3, cy_ + r * .86 * math.sin(math.radians(a)) + 3], fill=OUT)
        if stg == "F": d.ellipse([cx_ - 4, cy_ - 4, cx_ + 4, cy_ + 4], fill=k.glow[1])
    elif k.make == "post" and stg in "NF":                                                                    # a box cote on a post, its pitched roof and landing ledge
        C = k.paint if stg == "N" else k.comp
        k.rect(X0 + W * .15, Y0 + 2, X1 - W * .15, Y1 - 2, k.c(R_((90, 90, 96), 8)) if stg == "F" else k.c(R_((120, 120, 120), 8)), lv=1)
        k.rect(X0 + W * .1, Y0 + 2, k.cx, Y1 - H * .2, C, lv=3); k.rect(k.cx, Y0 + 2, X1 - W * .1, Y1 - H * .2, C, lv=1)
        k.rect(X0 + W * .15, Y1 - H * .2, X1 - W * .15, Y1 - 2, k.wood, lv=2)                                     # the landing ledge
        if stg == "F": k.glowline(k.cx, Y0 + 4, k.cx, Y1 - H * .22)
    elif stg == "N":
        k.rect(X0, Y0, X1, Y1, k.paint); k.rect(X0 + 4, Y0 + 4, X1 - 4, k.fy(.5), k.paint, lv=3)
        for gx in range(int(X0) + 4, int(X1) - 3, 4): d.line([gx, k.fy(.55), gx, Y1 - 4], fill=k.c(STEEL)[3])
    elif stg == "F":
        k.future_shell(X0, Y0, X1, Y1, 12); d.ellipse([cx_ - r * .4, cy_ - r * .4, cx_ + r * .4, cy_ + r * .4], outline=k.glow[1], width=2)
    elif S == "islamic":
        mud = k.c(R_((196, 170, 130), 12)); k.disc(cx_, cy_, r, r, mud)
        for rr in (r * .78, r * .5):
            for a in np.arange(0, 360, 360 / max(6, rr / 3)): d.ellipse([cx_ + rr * math.cos(math.radians(a)) - 2, cy_ + rr * math.sin(math.radians(a)) - 2, cx_ + rr * math.cos(math.radians(a)) + 2, cy_ + rr * math.sin(math.radians(a)) + 2], fill=OUT)
        d.ellipse([cx_ - r * .2, cy_ - r * .2, cx_ + r * .2, cy_ + r * .2], fill=k.c(WHITE)[3], outline=OUT)
    elif S == "atlantic":
        k.disc(cx_, cy_, r, r, k.c(STONE))
        for rr in (r * .8, r * .6, r * .4): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=k.c(STONE)[1])
        k.rect(cx_ - r * .22, cy_ - r * .22, cx_ + r * .22, cy_ + r * .22, k.wood, lv=3)                           # the lantern
    else:
        roof = {"central": k.c(R_((170, 70, 50), 16)), "mediterranean": k.c(R_((200, 110, 70), 16)), "northern": k.wood, "eastasia": k.c(R_((60, 60, 66), 10))}.get(S, k.m("straw"))
        tri = [((X0, Y0), (X1, Y0)), ((X1, Y0), (X1, Y1)), ((X1, Y1), (X0, Y1)), ((X0, Y1), (X0, Y0))]
        for i, (p0, p1) in enumerate(tri): k.poly([p0, p1, (cx_, cy_)], roof, lv=(3, 2, 1, 2)[i])                  # the hip roof's four faces
        if S in ("central", "mediterranean", "eastasia"):
            for t in np.linspace(.2, .8, 4):
                d.line([X0 + (cx_ - X0) * t, Y0 + (cy_ - Y0) * t, X1 - (X1 - cx_) * t, Y0 + (cy_ - Y0) * t], fill=roof[0])
                d.line([X0 + (cx_ - X0) * t, Y1 - (Y1 - cy_) * t, X1 - (X1 - cx_) * t, Y1 - (Y1 - cy_) * t], fill=roof[0])
        else: straw_mass(k, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, roof, n=W * H / 40)
        if S == "eastasia":
            for p in ((X0, Y0), (X1, Y0), (X0, Y1), (X1, Y1)): d.ellipse([p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3], fill=roof[3], outline=OUT)
        k.disc(cx_, cy_, 5, 5, k.wood)
    # doves on the roof
    for i in range(2 + k.wealth):
        a = i * 2.1 + .3; px_, py_ = cx_ + math.cos(a) * r * .6, cy_ + math.sin(a) * r * .6
        dv = k.c(R_((176, 178, 186), 12)) if i % 3 else k.c(WHITE)
        d.ellipse([px_ - 4, py_ - 2, px_ + 3, py_ + 2], fill=dv[2], outline=OUT); d.ellipse([px_ + 2, py_ - 2, px_ + 5, py_ + 1], fill=dv[3], outline=OUT)
    if k.cond == "broken": d.polygon([(cx_ + r * .1, cy_ - r * .8), (cx_ + r * .6, cy_ - r * .5), (cx_ + r * .3, cy_ - r * .1)], fill=OUT)   # the roof holed
    k.wear(X0, Y0, X1, Y1)

# ---------------------------------------------------------------- the farmyard
ROOFC = {"thatch": HAY, "palm": R_((150, 140, 80), 16), "tile": R_((170, 74, 52), 16), "slab": R_((120, 120, 116), 12), "turf": R_((84, 120, 62), 16),
         "iron": R_((150, 152, 150), 14), "felt": R_((74, 70, 70), 10), "bamboo": R_((180, 170, 100), 14), "mud": R_((180, 150, 110), 14),
         "dark tile": R_((76, 78, 84), 10), "shingle": R_((110, 90, 70), 14)}


def roof_kind(k):
    """The roof a small farm building gets in its land and age."""
    S, stg = k.style, k.stage
    if stg == "F": return "comp"
    if stg == "N": return "felt"
    if stg == "W" and S in ("central", "atlantic", "americas", "oceania", "northern"): return {"northern": "shingle"}.get(S, "iron")
    early = stg == "M"
    return {"central": "thatch" if early else "tile", "atlantic": "thatch" if early else "slab", "northern": "turf" if early else "shingle",
            "mediterranean": "tile", "islamic": "mud", "steppe": "felt", "southasia": "thatch", "eastasia": "dark tile", "seasia": "palm",
            "africa": "thatch", "americas": "thatch" if stg != "V" else "shingle", "oceania": "palm", "polar": "turf"}.get(S, "thatch")


def roof(k, x0, y0, x1, y1, kind, C=None):
    """A small gabled roof from above, its ridge running east and west: the north slope lit, the south in shade, the
    covering drawn in its own texture; a mud roof is flat with a parapet and a spout."""
    d = k.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); my = (y0 + y1) // 2
    if kind == "comp": k.future_shell(x0, y0, x1, y1, 4); k.glowline(x0 + 3, my, x1 - 3, my); return
    C = C or k.c(ROOFC.get(kind, HAY))
    k.sh(x0, y0, x1, y1, 4)
    if kind == "mud":
        k.rect(x0, y0, x1, y1, C, lv=3); d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], outline=C[1]); d.rectangle([x1 - 5, my - 2, x1 + 1, my + 1], fill=k.wood[1], outline=OUT); return
    k.rect(x0, y0, x1, my, C, lv=3); k.rect(x0, my, x1, y1, C, lv=1)
    if kind in ("thatch", "palm"):
        for a, b, lv in ((y0 + 2, my - 1, (2, 3, 4)), (my + 1, y1 - 2, (0, 1, 2))): k.strokes(x0 + 2, a, x1 - 3, b, C, (x1 - x0) * (b - a) / 16, ang=math.pi / 2, ln=(3, 6), idx=lv)
        d.rectangle([x0, my - 2, x1, my + 2], fill=C[0])
    elif kind in ("tile", "dark tile", "slab", "shingle"):
        st_ = 4 if kind != "slab" else 6
        for gy in range(y0 + st_, y1 - 1, st_):
            d.line([x0 + 1, gy, x1 - 1, gy], fill=C[0])
            for gx in range(x0 + 2 + (gy // st_ % 2) * 3, x1 - 1, 6 if kind != "slab" else 9): d.point((gx, gy - 1), fill=C[0])
    elif kind == "iron":
        for gx in range(x0 + 2, x1 - 1, 3): d.line([gx, y0 + 1, gx, y1 - 1], fill=C[1 if gx % 2 else 3])
    elif kind == "turf":
        for _ in range(int((x1 - x0) * (y1 - y0) / 60)): px_, py_ = k.rng.uniform(x0 + 3, x1 - 3), k.rng.uniform(y0 + 3, y1 - 3); d.ellipse([px_ - 2, py_ - 1, px_ + 2, py_ + 1], fill=C[3 if py_ < my else 1])
    elif kind == "bamboo":
        for gx in range(x0 + 2, x1 - 1, 4): d.line([gx, y0 + 1, gx, y1 - 1], fill=C[0])
    elif kind == "felt":
        for gy in range(y0 + 5, y1 - 2, 6): d.line([x0 + 1, gy, x1 - 1, gy], fill=C[0])
    d.line([x0, my, x1, my], fill=OUT, width=2)


HENS = [R_((150, 90, 50), 14), R_((230, 228, 220), 6), R_((60, 56, 60), 10), R_((200, 150, 80), 14), R_((150, 140, 130), 12)]


def hen(k, x, y, C, face=1):
    """A hen from above: a round body, the tail feathers, the head with its red comb."""
    d = k.d; d.ellipse([x - 4, y - 3, x + 3, y + 3], fill=C[2], outline=OUT); d.point((x - 2, y - 2), fill=C[4])
    hx = x + 4 * face; d.ellipse([hx - 2, y - 2, hx + 2, y + 1], fill=C[3], outline=OUT); d.point((hx, y - 2), fill=(200, 40, 40))
    d.line([x - 4 * face, y - 1, x - 6 * face, y - 3], fill=C[0], width=2)


def coop(tm, x, y, w, h, st, v):
    """A hen house and its run from above: the little house to the north under the roof of its land and age, the run
    to the south fenced with wattle, palings, bamboo or wire, hens scratching in it. Africa: an upturned woven basket
    coop; East and Southeast Asia: a bamboo cage, raised in the islands; the steppe: a felt-covered wicker coop.
    Modern makes: a timber ark, a coop with its run, a rounded plastic coop; Future: a sealed composite coop. Open:
    the pop hole open and the hens out in the run; closed: the hatch shut on them."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    opn = st == "open"; mk = k.make; r_ = k.rng
    hy1 = k.fy(.52)                                                                                         # the house's south wall
    fence = {"M": "wattle", "E": "pale", "V": "pale", "W": "wire", "N": "wire", "F": "wire"}[stg]
    old = stg in "MEV" or stg == "W" and S not in ("central", "atlantic", "americas", "oceania")
    if S == "northern" and stg == "W": fence = "pale"
    if S in ("eastasia", "seasia", "oceania") and old: fence = "bamboo"
    if S in ("islamic", "southasia", "africa", "americas", "steppe", "mediterranean") and old: fence = "mud" if S in ("islamic", "southasia", "mediterranean") else "wattle"
    # the run, its ground and fence
    gnd = k.c(R_(SOILS[S], 12)); d.rectangle([X0 + 1, hy1 - 2, X1 - 1, Y1 - 1], fill=gnd[3], outline=gnd[1])
    for _ in range(6): px_, py_ = r_.uniform(X0 + 4, X1 - 6), r_.uniform(hy1 + 2, Y1 - 4); d.point((px_, py_), fill=k.c(STRAW)[4])
    FC = {"wattle": k.c(R_((130, 100, 70), 12)), "pale": k.wood, "wire": k.c(STEEL), "bamboo": k.c(R_((180, 170, 100), 14)), "mud": k.c(R_((176, 146, 108), 12))}[fence]
    if mk == "ark" and stg in "NF": fence = "ark"
    for (ax, ay, bx, by) in ((X0 + 1, hy1, X0 + 1, Y1 - 1), (X1 - 1, hy1, X1 - 1, Y1 - 1), (X0 + 1, Y1 - 1, X1 - 1, Y1 - 1)):
        if fence == "wire":
            d.line([ax, ay, bx, by], fill=FC[3]); [d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=k.wood[2] if stg != "F" else k.comp[2]) for px_, py_ in ((ax, ay), (bx, by))]
        elif fence == "mud": d.line([ax, ay, bx, by], fill=FC[1], width=5); d.line([ax, ay, bx, by], fill=FC[3], width=2)
        elif fence == "ark": pass
        else:
            d.line([ax, ay, bx, by], fill=OUT, width=5); d.line([ax, ay, bx, by], fill=FC[2], width=3)
            L_ = max(1, int(math.hypot(bx - ax, by - ay) / 4))
            for i in range(L_): t = i / L_; d.point((ax + (bx - ax) * t, ay + (by - ay) * t), fill=FC[4 if fence != "wattle" else (0 if i % 2 else 4)])
    if fence == "wire":
        for gx in range(int(X0) + 4, int(X1) - 2, 4): d.line([gx, hy1, gx, Y1 - 2], fill=FC[1])
        for gy in range(int(hy1) + 4, int(Y1) - 2, 4): d.line([X0 + 2, gy, X1 - 2, gy], fill=FC[1])
    # the house
    hx0, hx1 = X0 + 2, X1 - 2
    if fence == "ark":                                                                                     # an A-frame ark over the whole: two long slopes
        roof(k, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, "felt" if stg == "N" else "comp", k.paint if stg == "N" else None)
        for gx in range(int(X0) + 6, int(X1) - 4, 4): d.line([gx, k.fy(.55), gx, Y1 - 3], fill=k.c(STEEL)[3])
    elif mk == "plastic" and stg in "NF":                                                                  # a rounded plastic coop
        k.sh(hx0, Y0 + 1, hx1, hy1 + 4, 4); k.rrect(hx0, Y0 + 1, hx1, hy1 + 4, int(H * .2), k.paint if stg == "N" else k.comp)
        for gx in np.arange(hx0 + 8, hx1 - 6, 8): d.line([gx, Y0 + 3, gx, hy1 + 2], fill=(k.paint if stg == "N" else k.comp)[1])
    elif S == "africa" and old:                                                                            # an upturned woven basket coop
        r = min(W * .3, H * .3); k.sh(k.cx - r, k.fy(.3) - r, k.cx + r, k.fy(.3) + r, 3, "ellipse"); k.disc(k.cx, k.fy(.3), r, r, k.m("straw"))
        for rr in np.arange(r - 3, 2, -4): d.ellipse([k.cx - rr, k.fy(.3) - rr, k.cx + rr, k.fy(.3) + rr], outline=k.m("straw")[1])
        k.disc(k.cx, k.fy(.3), 3, 3, k.wood)
    elif S in ("eastasia", "seasia") and old:                                                              # a bamboo cage, roofed
        C = k.c(R_((180, 170, 100), 14)); k.sh(hx0, Y0 + 1, hx1, hy1, 3); k.rect(hx0, Y0 + 1, hx1, hy1, C, lv=1)
        for gx in range(int(hx0) + 3, int(hx1) - 1, 3): d.line([gx, Y0 + 2, gx, hy1 - 1], fill=C[0])
        roof(k, hx0 + 4, Y0 + 1, hx1 - 4, hy1 - 6, roof_kind(k))
    elif S == "steppe" and old:                                                                            # a felt-covered wicker coop
        k.sh(hx0, Y0 + 1, hx1, hy1, 3); k.rrect(hx0, Y0 + 1, hx1, hy1, int(H * .15), k.c(R_((200, 190, 170), 10)))
        d.line([hx0 + 4, k.fy(.27), hx1 - 4, k.fy(.27)], fill=k.acc[2], width=2)
    else:
        roof(k, hx0, Y0 + 1, hx1, hy1, roof_kind(k), k.paint if stg == "N" and mk != "house" else None)
        if stg in "VW" and k.wealth >= 2: k.rect(k.fx(.42), Y0 + 1, k.fx(.58), Y0 + 6, k.c(R_((150, 80, 60), 14)), lv=3)   # a vent
    # the pop hole and the hens
    px_ = k.fx(.3); d.rectangle([px_ - 4, hy1 - 3, px_ + 4, hy1], fill=OUT if opn else (k.wood[1] if stg != "F" else k.comp[1]))
    if opn:
        k.bar(px_, hy1, px_ + 3, hy1 + H * .18, k.wood, 3)                                                   # the ramp down
        for i in range(2 + k.wealth // 2 + (1 if k.wealth >= 3 else 0)):
            C = k.c(HENS[(i + k.wealth + EI[k.era]) % len(HENS)]) if stg != "F" else k.c(HENS[i % 3])
            hen(k, X0 + 8 + r_.uniform(0, W - 18), hy1 + 6 + r_.uniform(0, H * .38), C, 1 if i % 2 else -1)
    else:
        d.rectangle([px_ - 4, hy1 - 3, px_ + 4, hy1], outline=OUT)
        k.rect(X0 + W * .62, hy1 + 4, X0 + W * .8, hy1 + 9, k.wood if stg != "F" else k.comp, lv=1)               # the feed trough
    if k.poor and stg in "MEV": d.line([X0 + W * .7, Y0 + 4, X0 + W * .9, k.fy(.4)], fill=k.c(R_((170, 150, 108), 14))[2], width=2)   # a rope-tied repair
    if k.cond == "broken": d.polygon([(X1 - W * .3, Y1 - 1), (X1 - W * .2, Y1 - H * .2), (X1 - W * .1, Y1 - 1)], fill=gnd[3], outline=OUT)   # the run broken open
    k.wear(hx0, Y0 + 1, hx1, hy1)


PIGS = {"pink": R_((222, 168, 156), 12), "black": R_((60, 56, 60), 10), "spotted": R_((222, 180, 168), 12), "brown": R_((150, 100, 70), 14),
        "red": R_((170, 90, 60), 14), "grey": R_((120, 110, 104), 12)}


def pig(k, cx, cy, L, C, face=1, spots=None):
    """A pig from above: the long body, the head with its ears and snout, the curl of tail."""
    d = k.d; hw = L * .3
    d.ellipse([cx - L / 2, cy - hw, cx + L / 2, cy + hw], fill=C[2], outline=OUT); d.arc([cx - L / 2 + 2, cy - hw + 1, cx + L / 2 - 2, cy + hw - 1], 200, 300, fill=C[4])
    hx = cx + face * L * .48; d.ellipse([hx - L * .16, cy - hw * .7, hx + L * .16, cy + hw * .7], fill=C[3], outline=OUT)
    for s_ in (-1, 1): d.polygon([(hx - face * 2, cy + s_ * 2), (hx - face * 6, cy + s_ * (hw * .8 + 2)), (hx + face * 2, cy + s_ * hw * .6)], fill=C[1], outline=OUT)
    d.ellipse([hx + face * L * .12 - 2, cy - 2, hx + face * L * .12 + 2, cy + 2], fill=k.c(PINK)[1], outline=OUT)
    d.arc([cx - face * L / 2 - 4, cy - 3, cx - face * L / 2 + 2, cy + 3], 0, 300, fill=C[1])
    if spots:
        for i in range(3): d.ellipse([cx - L * .3 + i * L * .22, cy - hw * .5 + (i % 2) * 3, cx - L * .3 + i * L * .22 + L * .14, cy - hw * .5 + (i % 2) * 3 + hw * .6], fill=spots[1])


def pigsty(tm, x, y, w, h, st, v):
    """A pigsty from above: the walled yard trodden to mud, the roofed shelter at its north end, the trough and the pigs,
    the gate in the south wall (shut, or swung open). Walls of wattle in the Middle Ages, dry stone in the Atlantic
    and northern lands, brick from the Victorians, rendered block in the 20th century; East Asia: a stone sty and black
    pigs; Southeast Asia and Oceania: a bamboo pen raised on posts; Africa and the Americas: a pole pen. Modern: a
    concrete pen with steel bars and a plastic hut; Future: a composite unit."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    opn = st == "open"; r_ = k.rng
    wall = {"M": "wattle", "E": "stone", "V": "brick", "W": "block", "N": "steel", "F": "comp"}[stg]
    if stg == "W": wall = {"central": "block", "atlantic": "stone", "northern": "pole", "mediterranean": "mud", "americas": "brick", "oceania": "steel", "polar": "stone"}.get(S, wall)
    if stg in "MEV" or stg == "W" and S not in EURO:
        if S in ("atlantic", "northern", "polar", "mediterranean", "eastasia") and stg != "V": wall = "stone"
        if S in ("seasia", "oceania", "southasia"): wall = "bamboo"
        if S in ("africa", "americas", "steppe"): wall = "pole"
        if S == "islamic": wall = "mud"
    WC = {"wattle": k.c(R_((130, 100, 70), 12)), "stone": k.c(STONE), "brick": k.c(R_((160, 80, 60), 14)), "block": k.c(R_((170, 168, 160), 8)),
          "steel": k.c(STEEL), "comp": k.comp, "bamboo": k.c(R_((180, 170, 100), 14)), "pole": k.c(BARKS[S]), "mud": k.c(R_((176, 146, 108), 12))}[wall]
    mud = k.c(R_(mix(SOILS[S], (70, 56, 44), .35), 12)) if stg not in "NF" else k.c(R_((150, 148, 140), 8))
    d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=mud[2])
    if stg in "NF":                                                                                        # the slatted floor
        for gy in range(int(Y0) + 6, int(Y1) - 2, 5): d.line([X0 + 3, gy, X1 - 3, gy], fill=mud[0])
    else:
        for _ in range(8): px_, py_ = r_.uniform(X0 + 6, X1 - 12), r_.uniform(k.fy(.4), Y1 - 8); d.ellipse([px_, py_, px_ + r_.uniform(6, 12), py_ + r_.uniform(3, 6)], fill=mud[0 if r_.random() < .5 else 3])
    # the shelter
    sy1 = k.fy(.38)
    if stg == "N": k.sh(X0 + 4, Y0 + 2, k.fx(.6), sy1, 3); k.rrect(X0 + 4, Y0 + 2, k.fx(.6), sy1, 8, k.paint)                 # a plastic ark hut
    else: roof(k, X0 + 2, Y0 + 2, X1 - 2, sy1, roof_kind(k))
    # walls
    ww = 9 if wall in ("stone", "brick", "block", "mud") else 6
    gx0, gx1 = k.fx(.62), k.fx(.86)                                                                        # the gate in the south wall
    segs = [(X0, Y0, X0 + ww, Y1), (X1 - ww, Y0, X1, Y1), (X0, Y1 - ww, gx0, Y1), (gx1, Y1 - ww, X1, Y1)]
    for x0_, y0_, x1_, y1_ in segs:
        k.rect(x0_, y0_, x1_, y1_, WC, lv=2 if wall != "pole" else 1)
        if wall == "stone":
            for gy in range(int(y0_) + 3, int(y1_) - 1, 5): d.line([x0_ + 1, gy, x1_ - 1, gy], fill=WC[0])
        elif wall == "brick":
            for gy in range(int(y0_) + 2, int(y1_) - 1, 3): d.line([x0_ + 1, gy, x1_ - 1, gy], fill=WC[0])
        elif wall in ("wattle", "bamboo", "pole"):
            hor = (x1_ - x0_) > (y1_ - y0_)
            for t in np.arange(0, (x1_ - x0_) if hor else (y1_ - y0_), 4): d.point(((x0_ + t, (y0_ + y1_) / 2) if hor else ((x0_ + x1_) / 2, y0_ + t)), fill=WC[4 if (t // 4) % 2 else 0])
        elif wall == "steel":
            for t in np.arange(x0_ + 3 if (x1_ - x0_) > ww else y0_ + 3, x1_ if (x1_ - x0_) > ww else y1_, 6): d.point(((t, (y0_ + y1_) / 2) if (x1_ - x0_) > ww else ((x0_ + x1_) / 2, t)), fill=OUT)
    if wall == "comp": k.glowline(X0 + 3, Y1 - 3, gx0, Y1 - 3)
    gate = k.wood if stg not in "NF" else (k.c(STEEL) if stg == "N" else k.comp)
    if opn: k.bar(gx0, Y1 - 3, gx0 + 3, Y1 + (gx1 - gx0) * .7 - 6, gate, 4)                               # swung out
    else:
        k.rect(gx0, Y1 - 5, gx1, Y1 - 1, gate, lv=3); d.line([gx0 + 2, Y1 - 3, gx1 - 2, Y1 - 3], fill=gate[0])
    # trough and pigs
    tC = k.c(STONE) if stg in "ME" else k.wood if stg == "V" else k.c(STEEL) if stg in "WN" else k.comp
    k.rect(X0 + ww + 2, k.fy(.45), X0 + ww + 10, k.fy(.8), tC, lv=1); d.rectangle([X0 + ww + 4, k.fy(.47), X0 + ww + 8, k.fy(.78)], fill=k.c(R_((150, 130, 90), 10))[1])
    breed = {"eastasia": "black", "seasia": "black", "oceania": "black", "africa": "red", "americas": "brown", "southasia": "black",
             "islamic": "grey", "steppe": "brown", "atlantic": "spotted", "northern": "pink", "mediterranean": "black", "polar": "pink"}.get(S, "spotted" if stg in "ME" else "pink")
    if stg in "WNF": breed = ["pink", "spotted", "black", "red"][(k.wealth + len(v.get("livery", ""))) % 4] if k.glob else breed
    C = k.c(PIGS[breed]); spots = k.c(PIGS["black"]) if breed == "spotted" else None
    n = 1 + k.wealth // 2 + (1 if k.wealth >= 3 else 0) + (1 if stg in "NF" else 0)
    for i in range(n):
        pig(k, X0 + W * (.42 + .28 * (i % 2)), k.fy(.52 + .17 * (i // 2)) + r_.uniform(-2, 2), min(W * .32, 40), C, 1 if i % 2 == 0 else -1, spots)
    if k.poor: d.ellipse([k.fx(.5), Y1 - 16, k.fx(.75), Y1 - 8], fill=k.c(R_((60, 70, 40), 10))[2])          # a slick of swill
    if k.cond == "broken": d.polygon([(X1 - 1, k.fy(.5)), (X1 - ww - 4, k.fy(.6)), (X1 - 1, k.fy(.7))], fill=mud[2], outline=OUT)   # a breach in the wall
    k.wear(X0, Y0, X1, sy1)


def haystack(tm, x, y, w, h, st, v):
    """A haystack in the field, from above. Most of Europe: the round rick, its top thatched and pulled to a point,
    held by ropes weighted with stones in the Atlantic and northern lands; Central Europe: a rick round its tall pole;
    the north: hay hung to dry on racks; the steppe: ricks inside a wattle fence; East and Southeast Asia: rice straw
    stacked round poles in a cluster; South Asia and the Islamic world: straw stacks on a raised platform, the tops
    plastered with mud; Africa: fodder in the fork of a platform. Victorian: a square rick on staddle stones; 20th
    century: small bales stacked in a block; Modern: round bales, wrapped or not; Future: sealed silage pods."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    hay = k.c(HAY if S not in ("eastasia", "seasia", "southasia") else STRAW); r_ = k.rng; mk = k.make
    cx_, cy_ = k.cx, k.cy; r = min(W, H) * .46
    def rick(cx, cy, rr, thatch=True):
        k.sh(cx - rr, cy - rr, cx + rr, cy + rr, 5, "ellipse"); k.disc(cx, cy, rr, rr, hay)
        straw_mass(k, cx - rr * .7, cy - rr * .7, cx + rr * .7, cy + rr * .7, hay, n=rr * rr / 8)
        if thatch:
            for a in range(0, 360, 12): d.line([cx, cy, cx + rr * .95 * math.cos(math.radians(a)), cy + rr * .95 * math.sin(math.radians(a))], fill=hay[1 if a % 24 else 3])
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=hay[4], outline=OUT)
    if stg == "N":
        n = 6 + k.wealth
        wrap = {"white": k.c(R_((232, 232, 228), 6)), "black": k.c(BLACK), "green": k.c(R_((60, 110, 70), 12)), "none": hay}.get(mk or "none", hay)
        for i in range(n):
            rows = -(-n // 3); bx, by = X0 + W * (.2 + .3 * (i % 3)), Y0 + H * (.2 + .6 * (i // 3) / max(1, rows - 1))
            br = min(W, H) * .14
            if (i + k.wealth) % 2 or mk == "square":                                                       # a bale lying on its side: a cylinder
                k.sh(bx - br, by - br * .8, bx + br, by + br * .8, 3); k.rrect(bx - br, by - br * .8, bx + br, by + br * .8, 4, wrap)
                for gx in np.arange(bx - br + 4, bx + br - 2, 4): d.line([gx, by - br * .7, gx, by + br * .7], fill=wrap[1])
            else:                                                                                          # standing on end: a disc
                k.sh(bx - br, by - br, bx + br, by + br, 3, "ellipse"); k.disc(bx, by, br, br, wrap)
                for rr in (br * .65, br * .3): d.ellipse([bx - rr, by - rr, bx + rr, by + rr], outline=wrap[1])
    elif stg == "W" and S == "americas":                                                                   # a loaf-shaped stack off the beaverslide
        k.sh(X0 + 4, Y0 + H * .15, X1 - 4, Y1 - H * .15, 5); k.rrect(X0 + 4, Y0 + H * .15, X1 - 4, Y1 - H * .15, int(H * .3), hay)
        straw_mass(k, X0 + 8, Y0 + H * .2, X1 - 8, Y1 - H * .2, hay, ang=0); d.line([X0 + 10, k.cy, X1 - 10, k.cy], fill=hay[4], width=2)
        k.bar(X0 + 4, Y0 + 4, X0 + W * .3, Y0 + H * .15, k.wood, 4); k.bar(X1 - 4, Y0 + 4, X1 - W * .3, Y0 + H * .15, k.wood, 4)   # the slide's poles
    elif stg == "W" and S == "atlantic":                                                                   # a Dutch barn: hay under a curved iron roof on posts
        roof(k, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, "iron")
        for px_ in np.linspace(X0 + 3, X1 - 6, 4): k.rect(px_, Y0 + 1, px_ + 4, Y0 + 5, k.c(IRON)); k.rect(px_, Y1 - 5, px_ + 4, Y1 - 1, k.c(IRON))
        d.rectangle([X0 + 2, Y1 - H * .15, X1 - 2, Y1 - 6], fill=hay[2]); straw_mass(k, X0 + 4, Y1 - H * .15, X1 - 4, Y1 - 6, hay)
    elif stg == "W" and S in ("central", "oceania"):                                                       # small rectangular bales stacked in a block
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 5); bw, bh = W * .18, H * .1
        for j, gy in enumerate(np.arange(Y0 + 4, Y1 - bh, bh)):
            for gx in np.arange(X0 + 4 + (j % 2) * bw / 2, X1 - bw, bw):
                k.rect(gx, gy, gx + bw - 1, gy + bh - 1, hay, lv=3 if j % 3 else 2)
                d.line([gx + bw * .3, gy + 1, gx + bw * .3, gy + bh - 2], fill=k.c(R_((60, 110, 150), 10) if k.e == 6 else R_((170, 150, 100), 8))[2])   # the twine
        if k.wealth >= 2: roof(k, X0 + 2, k.cy - H * .2, X1 - 2, k.cy + H * .2, "iron")                          # a tin sheet laid over the top
    elif stg == "F" and mk == "green":                                                                     # a long sealed silage tube
        for gy in (k.fy(.3), k.fy(.7)):
            k.sh(X0 + 4, gy - H * .17, X1 - 4, gy + H * .17, 4); k.rrect(X0 + 4, gy - H * .17, X1 - 4, gy + H * .17, int(H * .16), k.comp)
            k.glowline(X0 + 10, gy, X1 - 10, gy)
    elif stg == "F" and mk in ("black", "none"):                                                           # a squat silo tower with its hatch
        k.sh(cx_ - r, cy_ - r, cx_ + r, cy_ + r, 5, "ellipse"); k.disc(cx_, cy_, r, r, k.comp)
        for rr in (r * .75, r * .5): d.ellipse([cx_ - rr, cy_ - rr, cx_ + rr, cy_ + rr], outline=k.comp[0])
        d.ellipse([cx_ - r * .15, cy_ - r * .15, cx_ + r * .15, cy_ + r * .15], fill=k.glow[1], outline=OUT)
        if mk == "none": d.rectangle([X0 + 2, Y1 - H * .12, X1 - 2, Y1 - 2], fill=hay[2], outline=OUT)
    elif stg == "F":
        npod = 4 if mk == "white" else 9
        for i in range(npod):
            g = 2 if npod == 4 else 3; rr = r * (.45 if g == 2 else .3)
            bx, by = X0 + W * ((i % g) + .5) / g, Y0 + H * ((i // g) + .5) / g; k.sh(bx - rr, by - rr, bx + rr, by + rr, 4, "ellipse")
            k.disc(bx, by, rr, rr, k.comp); d.ellipse([bx - rr * .55, by - rr * .55, bx + rr * .55, by + rr * .55], outline=k.glow[1], width=2)
    elif stg == "V" and S == "americas":                                                                   # a hay barrack: a roof on four tall poles over the hay
        d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=hay[2], outline=OUT); straw_mass(k, X0 + 8, Y0 + 8, X1 - 8, Y1 - 8, hay)
        k.poly([(k.cx, Y0 + 12), (X1 - 12, k.cy), (k.cx, Y1 - 12), (X0 + 12, k.cy)], k.c(ROOFC["shingle"]), lv=3)
        for px_, py_ in ((X0 + 6, Y0 + 6), (X1 - 6, Y0 + 6), (X0 + 6, Y1 - 6), (X1 - 6, Y1 - 6)): k.disc(px_, py_, 4, 4, k.wood)
    elif stg == "V" and S in ("central", "oceania"):                                                       # a square rick on staddle stones
        for px_, py_ in ((X0 + 4, Y0 + 4), (X1 - 8, Y0 + 4), (X0 + 4, Y1 - 8), (X1 - 8, Y1 - 8), (k.cx - 2, Y0 + 4), (k.cx - 2, Y1 - 8)): k.disc(px_ + 2, py_ + 2, 4, 4, k.c(STONE))
        roof(k, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, "thatch", hay)
        for gx in np.arange(X0 + 16, X1 - 10, 18): d.line([gx, Y0 + 8, gx, Y1 - 8], fill=k.c(R_((150, 130, 90), 10))[1])   # the thatch spars
    elif S == "northern":                                                                                  # hay racks: hay hung on long fences
        for gy in np.arange(Y0 + H * .12, Y1 - 4, H * .28):
            k.sh(X0 + 4, gy - 5, X1 - 4, gy + 7, 3); k.rect(X0 + 4, gy - 4, X1 - 4, gy + 6, hay); straw_mass(k, X0 + 6, gy - 3, X1 - 6, gy + 5, hay, ang=math.pi / 2)
            for px_ in np.arange(X0 + 6, X1 - 2, W * .2): k.disc(px_, gy + 1, 2, 2, k.wood)
    elif S == "eastasia":                                                                                  # one great rice-straw stack round a tree, capped
        rick(cx_, cy_, r * .85, thatch=False); k.disc(cx_, cy_, r * .2, r * .2, k.c(BARKS[S])); d.ellipse([cx_ - r * .5, cy_ - r * .5, cx_ + r * .5, cy_ + r * .5], outline=k.c(R_((150, 130, 80), 10))[0], width=3)
        for a in range(0, 360, 90): k.bar(cx_, cy_, cx_ + r * .95 * math.cos(math.radians(a + 45)), cy_ + r * .95 * math.sin(math.radians(a + 45)), k.c(R_((150, 130, 80), 10)), 2)
    elif S == "seasia":                                                                                    # rice straw stacked round poles
        for i in range(5):
            bx, by = X0 + W * (.22 + .28 * (i % 3)), Y0 + H * (.25 + .45 * (i // 3)) + (i % 2) * 6; rr = r * .32
            rick(bx, by, rr, thatch=False); k.disc(bx, by, 2, 2, k.wood)
            d.ellipse([bx - rr * .5, by - rr * .5, bx + rr * .5, by + rr * .5], outline=k.c(R_((150, 130, 80), 10))[1], width=2)   # the straw cap
    elif S in ("southasia", "islamic", "africa"):                                                         # straw stacked on a platform, its top plastered
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 4)
        k.rect(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, k.c(BARKS[S]), lv=1)                                          # the pole platform
        for gx in np.arange(X0 + 8, X1 - 4, 6): d.line([gx, Y0 + 5, gx, Y1 - 5], fill=k.c(BARKS[S])[0])
        for px_, py_ in ((X0 + 4, Y0 + 4), (X1 - 8, Y0 + 4), (X0 + 4, Y1 - 8), (X1 - 8, Y1 - 8)): k.disc(px_ + 2, py_ + 2, 3, 3, k.c(BARKS[S]))
        rick(cx_, cy_, r * .9, thatch=False)
        if S != "africa": k.disc(cx_, cy_, r * .45, r * .45, k.c(R_((150, 120, 90), 12)))                   # the mud cap
        else:
            for a in range(0, 360, 60): k.bar(cx_, cy_, cx_ + r * .9 * math.cos(math.radians(a)), cy_ + r * .9 * math.sin(math.radians(a)), k.c(BARKS[S]), 2)
    elif S == "americas" and k.e <= 3:                                                                     # maize stalks stood in shocks to dry
        for i in range(5):
            bx, by = X0 + W * (.2 + .3 * (i % 3)), Y0 + H * (.25 + .5 * (i // 3)); rr = r * .3
            k.sh(bx - rr, by - rr, bx + rr, by + rr, 4, "ellipse"); k.disc(bx, by, rr, rr, k.c(FODDER["maize stalks"]))
            for a in range(0, 360, 30): d.line([bx, by, bx + rr * math.cos(math.radians(a)), by + rr * math.sin(math.radians(a))], fill=k.c(FODDER["maize stalks"])[1])
            d.line([bx - rr * .6, by, bx + rr * .6, by], fill=k.c(R_((170, 150, 108), 14))[0], width=2)
    elif S == "oceania" and k.e <= 3:                                                                      # bundles of cut fern and rushes for thatch, stacked
        C = k.c(R_((150, 130, 80), 14))
        for gy in np.arange(Y0 + 6, Y1 - 10, H * .2):
            k.sh(X0 + 6, gy, X1 - 6, gy + H * .16, 3); k.rect(X0 + 6, gy, X1 - 6, gy + H * .16, C); straw_mass(k, X0 + 8, gy + 2, X1 - 8, gy + H * .16 - 2, C, ang=0)
            for gx in np.arange(X0 + 20, X1 - 10, 24): d.line([gx, gy, gx, gy + H * .16], fill=k.c(R_((90, 70, 50), 10))[1], width=2)
    elif S == "polar":                                                                                       # a hay yard: stacks inside a turf wall
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=OUT, width=1); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=k.c(ROOFC["turf"])[2], width=7)
        for bx in (k.fx(.33), k.fx(.67)): rick(bx, cy_, r * .42)
    else:
        rick(cx_, cy_, r)
        if S in ("central", "mediterranean") or k.e == 1: k.disc(cx_, cy_, 4, 4, k.wood)                    # the rick pole
        if S == "mediterranean": pot(k, cx_, cy_, r * .22, k.m("clay"), lid=False)                          # the pot capping the pole
        if S in ("atlantic", "polar", "oceania", "northern") or k.wealth >= 2:                              # ropes weighted with stones
            for a in range(0, 360, 45):
                ex, ey = cx_ + r * math.cos(math.radians(a)), cy_ + r * math.sin(math.radians(a))
                d.line([cx_, cy_, ex, ey], fill=k.c(R_((150, 120, 80), 10))[1], width=1); k.disc(ex, ey, 3, 3, k.c(STONE))
        if S == "steppe":                                                                                   # the wattle fence round it
            d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=OUT, width=7); d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=k.c(R_((130, 100, 70), 12))[2], width=5)
    if k.cond == "worn": k.blob(k.fx(.8), k.fy(.85), W * .08, H * .06, hay, n=5)
    if k.cond == "broken" and stg not in "NF": d.pieslice([cx_ - r, cy_ - r, cx_ + r, cy_ + r], 20, 80, fill=k.c(R_((90, 80, 50), 10))[1], outline=OUT)   # a wedge cut out and rotten
    elif k.cond == "broken": d.line([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=OUT, width=3)
    k.wear(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, hay)


FODDER = {"hay": HAY, "straw": STRAW, "haylage": R_((130, 140, 70), 14), "rice straw": R_((206, 186, 120), 14), "lucerne": R_((120, 140, 70), 16), "stover": R_((170, 150, 90), 16),
          "maize stalks": R_((186, 170, 110), 16)}


def fork(k, x0, y0, x1, y1, tines=3, metal=None, wood=None):
    """A hay fork laid on the heap: its long shaft and the tines at its head."""
    d = k.d; k.bar(x0, y0, x1, y1, wood or k.c(R_((176, 140, 90), 12)), 2)
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1; ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    M = metal or k.c(IRON)
    d.line([x1 - nx * 4, y1 - ny * 4, x1 + nx * 4, y1 + ny * 4], fill=M[2], width=2)
    for i in range(tines):
        o = -4 + 8 * i / max(1, tines - 1); d.line([x1 + nx * o, y1 + ny * o, x1 + nx * o + ux * 9, y1 + ny * o + uy * 9], fill=M[3])


def hayheap(tm, x, y, w, h, st, v):
    """A heap of fodder on the floor with its fork: hay in most of Europe, straw for bedding, rice straw in East and
    Southeast Asia, lucerne in the Islamic world, sorghum stover in Africa, maize stalks in the Americas. Medieval: a
    wooden fork of a forked branch; Renaissance on: an iron-tined fork; Victorian: a steel fork; 20th century: hay
    pulled from a bale in its flakes, the twine cut; Modern: a slab from a big bale and a fork with a plastic grip;
    Future: compressed fodder blocks."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fd = (k.glob and v.get("feed")) or {"eastasia": "rice straw", "seasia": "rice straw", "islamic": "lucerne", "africa": "stover", "americas": "maize stalks"}.get(S, "hay")
    F_ = k.c(FODDER.get(fd, HAY)); r = min(W, H) * .46
    if stg == "F":
        for i in range(4):
            bx, by = X0 + W * (.28 + .44 * (i % 2)), Y0 + H * (.28 + .44 * (i // 2)); k.sh(bx - r * .45, by - r * .45, bx + r * .45, by + r * .45, 3)
            k.rect(bx - r * .45, by - r * .45, bx + r * .45, by + r * .45, F_, lv=3); d.rectangle([bx - r * .45, by - 2, bx + r * .45, by + 2], fill=k.comp[2])
        k.glowline(X0 + 3, Y1 - 3, X1 - 3, Y1 - 3)
    elif stg in "WN":                                                                                       # flakes off a bale
        k.sh(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, 3)
        n = 3 if stg == "W" else 2 + (k.wealth >= 2)
        for i in range(n):
            fx0 = X0 + 2 + i * (W - 4) / n; k.rect(fx0, Y0 + 3 + (i % 2) * 4, fx0 + (W - 4) / n - 2, Y1 - 3 - ((i + 1) % 2) * 4, F_, lv=3 - i % 2)
            straw_mass(k, fx0 + 2, Y0 + 6, fx0 + (W - 4) / n - 4, Y1 - 6, F_, n=W * H / (30 * n), ang=math.pi / 2)
        tw = k.paint if stg == "N" else k.c(R_((170, 150, 100), 8))                                          # baler twine in its colour
        d.line([X0 + 4, k.fy(.3), X1 - 4, k.fy(.32)], fill=tw[2]); d.line([X0 + 6, k.fy(.7), X0 + W * .4, k.fy(.9)], fill=tw[2])   # the cut twine
    else:
        k.sh(k.cx - r, k.cy - r * .9, k.cx + r, k.cy + r * .9, 3, "ellipse")
        k.blob(k.cx, k.cy, r, r * .9, F_, n=7, jit=.14)
        if fd in ("stover", "maize stalks"):
            for i in range(9): a = k.rng.uniform(-.5, .5); px_, py_ = k.cx + k.rng.uniform(-r * .6, r * .6), k.cy + k.rng.uniform(-r * .6, r * .6); k.bar(px_ - 10 * math.cos(a), py_ - 10 * math.sin(a), px_ + 10 * math.cos(a), py_ + 10 * math.sin(a), F_, 2)
        else: straw_mass(k, k.cx - r * .8, k.cy - r * .7, k.cx + r * .8, k.cy + r * .7, F_, n=r * r / 5)
        if S == "eastasia" or S == "seasia": d.line([k.cx - r * .6, k.cy, k.cx + r * .6, k.cy], fill=k.c(R_((150, 120, 70), 10))[1], width=2)   # a straw band
    # the fork
    if stg != "F":
        tines = 2 if stg == "M" else 3 if stg in "EV" else 4
        metal = k.wood if stg == "M" else k.c(IRON) if stg in "EV" else k.c(STEEL)
        fork(k, X0 + 3, Y1 - 4, X1 - W * .25, Y0 + H * .3, tines, metal, k.wood if stg != "N" else k.c(R_((176, 140, 90), 12)))
        if stg == "N": d.line([X0 + 3, Y1 - 4, X0 + 9, Y1 - 9], fill=k.paint[2], width=4)                     # the plastic grip
    if k.rich and stg in "MEV": d.ellipse([k.cx - r * .5, k.cy - r * .4, k.cx + r * .2, k.cy + r * .3], outline=k.c(R_((120, 150, 70), 10))[2], width=2)   # fresh green hay on top
    if k.cond == "broken": k.blob(X1 - 6, Y1 - 6, 5, 4, k.c(R_((90, 80, 50), 10)), n=4)                      # a mouldy patch
    k.wear(X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, F_)


def billet(k, x0, y0, x1, y1, bark, split=True):
    """One billet lying along the north-south line, seen from above: its long bark side, or the pale split face."""
    d = k.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if split: face = k.c(R_((214, 184, 130), 12)); d.polygon([(x0, y0 + 2), (x1, y0), (x1, y1), (x0, y1 - 1)], fill=face[2], outline=OUT); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=bark[1], width=2)
    else: d.rounded_rectangle([x0, y0, x1, y1], max(1, (x1 - x0) // 2), fill=bark[2], outline=OUT); d.line([x0 + 1, y0 + 2, x0 + 1, y1 - 2], fill=bark[4])
    for gy in range(y0 + 4, y1 - 2, 6): d.point(((x0 + x1) // 2, gy), fill=(bark if not split else k.c(R_((214, 184, 130), 12)))[0])


def woodpile(tm, x, y, w, h, st, v):
    """Fuel stacked against a wall, seen from above: the billets lying with their length from the wall, split faces up.
    Medieval: roundwood and bundled faggots; Renaissance on: split billets, neatly stacked; the north: a tall stack
    under a board roof; Atlantic Europe: turf (peat) stacked in its ridge; the Mediterranean: bundles of olive and vine
    prunings; the Islamic world: thorn bundles and dung cakes; South Asia and the steppe: dung cakes, round and flat,
    stacked; East Asia: split wood in tied bundles; Southeast Asia: bamboo lengths; Africa: bundles of thin sticks;
    Oceania and the far north: driftwood. 20th century: under a sheet of corrugated iron; Modern: a steel log rack;
    Future: fuel bricks on a rack."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    bark = k.c(BARKS[S]); r_ = k.rng
    kind = {"atlantic": "turf", "mediterranean": "faggots", "islamic": "dung", "southasia": "dung", "steppe": "dung", "eastasia": "bundles",
            "seasia": "bamboo", "africa": "sticks", "oceania": "drift", "polar": "drift"}.get(S, "billets")
    if stg == "N" and S in ("central", "americas", "oceania", "mediterranean"): kind = "rack"
    if stg == "F" and S in ("central", "americas", "northern"): kind = "bricks"
    k.sh(X0, Y0, X1, Y1, 4)
    if kind == "rack" or kind == "bricks":                                                                   # the steel rack's frame
        fr = k.paint if kind == "rack" else k.comp
        k.rect(X0, Y0, X1, Y1, fr, lv=1); d.rectangle([X0 + 4, Y0 + 3, X1 - 4, Y1 - 3], fill=OUT)
    if kind in ("billets", "rack"):
        bw = max(6, W / (14 + k.wealth * 2)); split = stg != "M"
        for i, gx in enumerate(np.arange(X0 + (4 if kind == "rack" else 1), X1 - (4 if kind == "rack" else 1) - bw + 1, bw)):
            jy = r_.uniform(0, 3)
            billet(k, gx, Y0 + 2 + jy, gx + bw - 1, Y1 - 2 - r_.uniform(0, 3), bark, split=split and (i + k.wealth) % 3 != 0)
        if S == "northern" and stg in "MEV": roof(k, X0, Y0, X1, Y0 + H * .45, "shingle" if stg != "M" else "turf")   # its board roof
        if stg == "W" and S in ("central", "americas", "oceania"): roof(k, X0, Y0, X1, Y1 - H * .4, "iron")
        if stg == "M":                                                                                       # a faggot of brushwood beside
            k.bar(X1 - W * .2, Y0 + 3, X1 - 3, Y1 - 3, bark, 7); [d.line([X1 - W * .2 + i * 3, Y0 + 3, X1 - W * .2 + i * 3 + 6, Y1 - 3], fill=bark[1]) for i in range(5)]
    elif kind == "turf":                                                                                     # peat turves stacked in a ridge
        C = k.c(R_((80, 60, 46), 12))
        for j, gy in enumerate(np.arange(Y0 + 2, Y1 - 5, 7)):
            for gx in np.arange(X0 + 2 + (j % 2) * 6, X1 - 10, 12): k.rect(gx, gy, gx + 11, gy + 6, C, lv=3 if j % 2 else 2)
        d.line([X0 + 2, k.cy, X1 - 2, k.cy], fill=C[0], width=2)
    elif kind == "dung":                                                                                     # dung cakes, round and flat, stacked
        C = k.c(R_((120, 96, 70), 12)); cr = max(5, H * .2)
        for j, gy in enumerate(np.arange(Y0 + cr, Y1 - cr + 1, cr * 1.6)):
            for gx in np.arange(X0 + cr + (j % 2) * cr * .8, X1 - cr, cr * 1.7):
                k.disc(gx, gy, cr, cr, C); d.ellipse([gx - cr * .4, gy - cr * .5, gx + cr * .2, gy + cr * .1], fill=C[3])
        if S == "islamic": k.bar(X0 + 3, Y0 + 3, X0 + W * .3, Y1 - 3, k.c(R_((140, 120, 80), 12)), 6)                  # a thorn bundle
    elif kind in ("faggots", "sticks", "bundles", "bamboo"):                                                 # bundles laid side by side, tied
        C = bark if kind != "bamboo" else k.c(R_((190, 176, 100), 14))
        bw = W / (6 + k.wealth)
        for gx in np.arange(X0 + 2, X1 - bw + 1, bw):
            k.rect(gx, Y0 + 2, gx + bw - 2, Y1 - 2, C, lv=2)
            for t in range(int(bw) // 3): d.line([gx + 2 + t * 3, Y0 + 3, gx + 2 + t * 3, Y1 - 3], fill=C[1 if t % 2 else 3])
            if kind == "bamboo":
                for gy in np.arange(Y0 + 6, Y1 - 4, 8): d.line([gx + 1, gy, gx + bw - 3, gy], fill=C[0])
            else:
                for ty in (k.fy(.3), k.fy(.7)): d.line([gx, ty, gx + bw - 2, ty], fill=k.c(R_((170, 150, 108), 14))[1], width=2)   # the ties
    elif kind == "drift":                                                                                     # grey driftwood, bleached and crooked
        C = k.c(R_((176, 170, 160), 12))
        for i in range(5 + k.wealth * 2):
            gx = X0 + 3 + i * (W - 10) / (5 + k.wealth * 2); k.bar(gx, Y0 + 3, gx + r_.uniform(-4, 6), Y1 - 3, C, int(r_.uniform(4, 8)))
    elif kind == "bricks":
        C = k.c(R_((90, 84, 80), 10))
        for j, gy in enumerate(np.arange(Y0 + 4, Y1 - 6, 7)):
            for gx in np.arange(X0 + 5, X1 - 12, 11): k.rect(gx, gy, gx + 10, gy + 6, C, lv=2 + (j + int(gx)) % 2)
        k.glowline(X0 + 3, Y1 - 3, X1 - 3, Y1 - 3)
    if stg == "F" and kind != "bricks": k.rect(X0, Y0, X1, Y0 + H * .3, k.comp, lv=2); k.glowline(X0 + 2, Y0 + H * .3, X1 - 2, Y0 + H * .3)   # a salvaged composite sheet over the back
    if k.rich and stg in "EV": k.rect(X0 + 1, Y0 + 1, X1 - 1, Y0 + 4, k.wood, lv=3)                           # a sawn board along the back
    if k.poor and stg in "MEV": d.line([X0 + 2, k.cy, X1 - 2, k.cy + 2], fill=k.c(R_((170, 150, 108), 14))[2], width=2)
    if k.cond == "broken":                                                                                    # the stack slumped, billets fallen out
        for i in range(3): billet(k, X0 + W * (.3 + .2 * i), Y1 - 8, X0 + W * (.3 + .2 * i) + 6, Y1 + 2, bark, True)
    k.wear(X0, Y0, X1, Y1, bark)


def plough(tm, x, y, w, h, st, v):
    """A plough from above, the beam running east to west, the share to the west. Medieval Europe: the heavy wheeled
    plough, its coulter, mouldboard and the wheels before it; the Mediterranean, the Islamic world, South Asia and
    Africa: the ard, a share and a single handle on a long pole; East Asia: the curved-beam plough with its iron share;
    the north: the forked sokha; the Americas: the foot plough; Oceania: the digging stick. Renaissance and Age of
    Reason: a lighter swing plough; Victorian: the iron plough; 20th century: a tractor's trailed two-furrow plough;
    Modern: a mounted reversible plough; Future: a composite autonomous tiller."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    iron = k.c(IRON) if not (k.poor and k.cond != "new") else k.c(RUST); wood = k.wood; mk = k.make
    soil = k.c(R_(SOILS[S], 12))
    d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=soil[3], outline=soil[1])                              # the furrowed earth it stands in
    for gy in np.arange(Y0 + 4, Y1 - 2, 5): d.line([X0 + 2, gy, X1 - 2, gy], fill=soil[1])
    if stg == "F" and mk == "one":                                                                         # an autonomous tiller on tracks
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 4)
        for ty in (Y0 + 2, Y1 - H * .22): k.rect(X0 + W * .2, ty, X1 - W * .1, ty + H * .2, k.c(R_((40, 40, 44), 6)))
        k.future_shell(X0 + W * .25, k.fy(.25), X1 - W * .15, k.fy(.75), 5); k.disc(X1 - W * .2, k.cy, 3, 3, k.comp); d.point((X1 - W * .2, k.cy), fill=k.glow[2])
        for gx in np.arange(X0 + 4, X0 + W * .2, 4): d.line([gx, k.fy(.2), gx, k.fy(.8)], fill=k.c(STEEL)[3], width=2)   # the tines
    elif stg in "WNF" and not (stg == "W" and k.wealth <= 1):
        C = k.paint if stg != "F" else k.comp
        n = {"one": 1, "two": 2, "three": 3, "four": 4}.get(mk or "two", 2) if stg != "W" else 1 + k.wealth // 2 + (1 if mk in ("three", "four") else 0)
        k.sh(X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, 4)
        k.bar(X0 + W * .08, k.fy(.3), X1 - W * .05, k.fy(.3), C, 7)                                           # the main frame
        k.rect(X1 - W * .14, Y0 + 3, X1 - 3, Y1 - 3, C, lv=3)                                                  # the headstock / hitch
        for i in range(n):
            bx = X0 + W * (.12 + i * .62 / max(1, n)); k.bar(bx + W * .08, k.fy(.3), bx, k.fy(.7), C, 4)      # the legs
            if mk == "four" and stg in "WN": k.disc(bx + 2, k.fy(.74), H * .14, H * .17, k.c(STEEL), lv=3); d.ellipse([bx - 1, k.fy(.74) - 3, bx + 5, k.fy(.74) + 3], fill=C[2])   # a disc plough's dished disc
            else: k.poly([(bx - 3, k.fy(.6)), (bx + W * .1, k.fy(.66)), (bx + W * .06, k.fy(.88)), (bx - 6, k.fy(.84))], k.c(STEEL), lv=3)   # the mouldboard, bright from the soil
            if mk in ("two", "three", "four") and stg == "N": k.poly([(bx - 3, k.fy(.06)), (bx + W * .1, k.fy(.12)), (bx + W * .06, k.fy(.26)), (bx - 6, k.fy(.22))], k.c(STEEL), lv=4)   # the reversed bodies above
        if stg == "W": k.disc(X0 + W * .08, k.fy(.15), H * .14, H * .14, k.c(IRON)); k.disc(X0 + W * .08, k.fy(.85), H * .14, H * .14, k.c(IRON))   # the land wheels
        if stg == "F": k.glowline(X0 + W * .1, k.fy(.3), X1 - W * .06, k.fy(.3), 2)
    else:
        kind = "wheeled" if S in ("central", "atlantic") else "sokha" if S in ("northern", "steppe", "polar") else "curved" if S in ("eastasia", "seasia") else \
            "foot" if S == "americas" and stg == "M" else "stick" if S == "oceania" and stg in "ME" else "ard"
        if stg == "E" and kind == "wheeled" and k.wealth <= 2: kind = "swing"
        if stg in "VW" and S in EURO: kind = "iron"
        if kind in ("wheeled", "swing", "iron"):
            bm = wood if kind != "iron" else k.paint
            k.sh(X0 + 6, k.fy(.25), X1 - 4, k.fy(.75), 3)
            k.bar(X0 + W * .2, k.cy, X1 - W * .05, k.cy, bm, 6)                                               # the beam
            k.poly([(X0 + W * .12, k.fy(.42)), (X0 + W * .32, k.fy(.45)), (X0 + W * .3, k.fy(.82)), (X0 + W * .1, k.fy(.7))], wood if kind != "iron" else iron, lv=3)   # the mouldboard
            k.poly([(X0 + 2, k.cy), (X0 + W * .14, k.fy(.4)), (X0 + W * .14, k.fy(.58))], iron, lv=3)          # the share
            k.bar(X0 + W * .25, k.fy(.35), X0 + W * .25, k.fy(.65), iron, 2)                                   # the coulter
            k.bar(X0 + W * .2, k.cy, X0 + 2, Y0 + 3, wood, 3); k.bar(X0 + W * .2, k.cy, X0 + 2, Y1 - 3, wood, 3)   # the stilts
            if kind == "wheeled":
                for wy in (Y0 + 4, Y1 - 4): d.ellipse([X1 - W * .2 - 6, wy - 3, X1 - W * .2 + 6, wy + 3], fill=wood[2], outline=OUT); d.line([X1 - W * .2, k.cy, X1 - W * .2, wy], fill=wood[1], width=2)
                k.bar(X1 - W * .2, Y0 + 4, X1 - W * .2, Y1 - 4, wood, 3)
            if kind == "iron": d.rectangle([X0 + W * .45, k.cy - 4, X0 + W * .55, k.cy + 4], fill=k.c(BRASS)[3] if k.rich else iron[3], outline=OUT)   # the maker's plate
        elif kind == "sokha":                                                                                   # a forked sokha between its shafts
            k.sh(X0 + 4, k.fy(.25), X1 - 4, k.fy(.75), 3)
            for gy in (k.fy(.3), k.fy(.7)): k.bar(X0 + W * .25, gy, X1 - 2, gy, wood, 4)                         # the shafts
            k.bar(X0 + W * .2, k.fy(.3), X0 + W * .2, k.fy(.7), wood, 4)
            for gy in (k.fy(.38), k.fy(.62)): k.poly([(X0 + 2, gy), (X0 + W * .2, gy - 4), (X0 + W * .2, gy + 4)], iron, lv=3)   # the two shares
        elif kind == "curved":
            k.sh(X0 + 4, k.fy(.3), X1 - 4, k.fy(.7), 3)
            d.arc([X0 + W * .1, k.fy(.1), X1 + W * .4, k.fy(1.6)], 180, 250, fill=OUT, width=7); d.arc([X0 + W * .1, k.fy(.1), X1 + W * .4, k.fy(1.6)], 180, 250, fill=wood[2], width=5)   # the curved beam
            k.poly([(X0 + 2, k.fy(.75)), (X0 + W * .18, k.fy(.62)), (X0 + W * .2, k.fy(.88))], iron, lv=3)
            k.bar(X0 + W * .14, k.fy(.75), X0 + W * .14, Y0 + 4, wood, 3)
        elif kind == "foot":                                                                                     # the chaquitaclla
            k.bar(X0 + W * .1, k.cy, X1 - 4, k.cy, wood, 4); k.bar(X0 + W * .3, k.cy, X0 + W * .3, k.fy(.75), wood, 3)
            k.poly([(X0 + 2, k.cy), (X0 + W * .12, k.cy - 4), (X0 + W * .12, k.cy + 4)], k.c(STONE) if stg == "M" else iron, lv=3)
            k.bar(X1 - W * .3, k.fy(.3), X1 - W * .3, k.fy(.7), wood, 3)
        elif kind == "stick":                                                                                   # a digging stick and a heap of turned earth
            k.bar(X0 + 6, k.cy, X1 - 6, k.cy - 4, wood, 4); k.blob(X0 + W * .25, k.fy(.75), W * .12, H * .15, soil, n=5)
            k.bar(X0 + W * .2, k.cy + 4, X0 + W * .2, k.cy - 6, wood, 3)
        else:                                                                                                    # the ard: a share, a handle and the long pole to the yoke
            k.sh(X0 + 4, k.fy(.35), X1 - 4, k.fy(.65), 3)
            k.bar(X0 + W * .15, k.cy, X1 - 2, k.cy, wood, 5)
            k.poly([(X0 + 2, k.cy), (X0 + W * .16, k.cy - 5), (X0 + W * .16, k.cy + 5)], iron if k.wealth >= 1 else wood, lv=3)
            k.bar(X0 + W * .15, k.cy, X0 + W * .08, Y0 + 3, wood, 3)
            if S in ("southasia", "islamic", "mediterranean"): k.rect(X1 - W * .12, Y0 + 3, X1 - W * .08, Y1 - 3, wood)   # the yoke
        if k.rich: k.disc(X1 - W * .08, k.cy, 3, 3, k.c(BRASS))
        if k.e == 1 and kind != "stick": d.line([X0 + W * .4, k.cy - 4, X0 + W * .4, k.cy + 4], fill=iron[2], width=2)      # Long Night: an iron strap mending the beam
    if k.cond == "broken": d.line([X0 + W * .55, k.fy(.3), X0 + W * .6, k.fy(.7)], fill=OUT, width=3)
    k.wear(X0 + W * .2, k.fy(.4), X1 - W * .05, k.fy(.6), wood)


def tractor(tm, x, y, w, h, st, v):
    """A farm tractor from above, its bonnet to the east: the great rear wheels at the west, the smaller front wheels,
    the bonnet over the engine, the seat (or the cab), the exhaust stack. Mid-Century: open tractors on steel or rubber
    wheels: the standard four-wheel tractor, the row-crop tractor with its front wheels close together, the crawler
    on tracks, the little grey utility tractor; Modern: a cab tractor, the big four-wheel-drive with equal wheels, a
    compact tractor, a tracked tractor; Future: an autonomous tractor with no seat, its sensors lit. The maker's
    livery: red, green, blue, orange, yellow, grey."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    C = k.paint if stg != "F" else k.comp; mk = k.make or "standard"; tyre = k.c(R_((40, 40, 42), 6)); hub = k.c(R_((214, 200, 120), 12)) if v.get("livery") in ("green", "red") else k.c(STEEL)
    def wheel(cx, cy, L, wd, steel=False):
        k.sh(cx - L / 2, cy - wd / 2, cx + L / 2, cy + wd / 2, 3)
        k.rect(cx - L / 2, cy - wd / 2, cx + L / 2, cy + wd / 2, tyre if not steel else k.c(IRON), lv=2)
        for gx in np.arange(cx - L / 2 + 2, cx + L / 2 - 1, 3): d.line([gx, cy - wd / 2 + 1, gx + 2, cy + wd / 2 - 1], fill=(tyre if not steel else k.c(IRON))[0 if not steel else 4])
        d.rectangle([cx - 3, cy - (wd / 2 - 2) * (1 if cy < k.cy else -1), cx + 3, cy - (wd / 2 - 4) * (1 if cy < k.cy else -1)], fill=hub[3])
    steel = k.e == 6 and k.wealth <= 1
    if mk in ("crawler", "tracked"):                                                                          # tracks the length of it
        for ty in (Y0 + 1, Y1 - H * .22):
            k.sh(X0 + W * .05, ty, X1 - W * .12, ty + H * .21, 3); k.rect(X0 + W * .05, ty, X1 - W * .12, ty + H * .21, tyre)
            for gx in np.arange(X0 + W * .05 + 2, X1 - W * .12, 4): d.line([gx, ty + 1, gx, ty + H * .21 - 1], fill=tyre[3])
    elif mk == "4wd":                                                                                         # equal big wheels all round
        for wx in (X0 + W * .2, X1 - W * .28):
            for wy in (Y0 + H * .12, Y1 - H * .12): wheel(wx, wy, W * .26, H * .22)
    else:
        rL = W * (.3 if mk != "compact" else .22); rW = H * (.24 if mk != "compact" else .2)
        for wy in (Y0 + rW / 2 + 1, Y1 - rW / 2 - 1): wheel(X0 + W * .2, wy, rL, rW, steel)                      # the rear wheels
        fL = W * .15
        if mk == "rowcrop": wheel(X1 - W * .14, k.cy, fL, H * .22)                                              # the tricycle front
        else:
            for wy in (Y0 + H * .18, Y1 - H * .18): wheel(X1 - W * .14, wy, fL, H * .14, steel)
    # the body
    by0, by1 = k.cy - H * .17, k.cy + H * .17
    k.sh(X0 + W * .12, by0, X1 - W * .04, by1, 4); k.rrect(X0 + W * .12, by0, X1 - W * .04, by1, 4, C)          # the bonnet and frame
    for gx in np.arange(X1 - W * .3, X1 - W * .06, 4): d.line([gx, by0 + 3, gx, by1 - 3], fill=C[1])           # the louvres
    d.rectangle([X1 - W * .05, by0 + 2, X1 - 2, by1 - 2], fill=k.c(R_((60, 60, 64), 6))[2], outline=OUT)        # the grille
    if stg == "N" or mk in ("tracked",):
        k.rect(X0 + W * .06, k.cy - H * .3, X0 + W * .4, k.cy + H * .3, k.c(R_((40, 44, 50), 6)), lv=2)         # the cab roof
        d.rectangle([X0 + W * .08, k.cy - H * .27, X0 + W * .38, k.cy + H * .27], outline=C[3], width=2)
        d.rectangle([X0 + W * .37, k.cy - H * .26, X0 + W * .4, k.cy + H * .26], fill=k.c(R_((150, 190, 210), 10))[3])   # the windscreen catching the light
        if k.wealth >= 3: [d.rectangle([X0 + W * .1 + i * 6, k.cy - H * .3, X0 + W * .1 + i * 6 + 3, k.cy - H * .3 + 2], fill=(250, 230, 160)) for i in range(4)]   # work lights
    elif stg == "F":
        k.glowline(X0 + W * .14, by0 + 2, X1 - W * .06, by0 + 2); k.glowline(X0 + W * .14, by1 - 2, X1 - W * .06, by1 - 2)
        for sx, sy in ((X1 - W * .08, by0 - 4), (X1 - W * .08, by1 + 4), (X0 + W * .14, k.cy)): k.disc(sx, sy, 3, 3, k.comp); d.point((sx, sy), fill=k.glow[2])   # the sensors
    else:
        k.disc(X0 + W * .14, k.cy, H * .1, H * .12, k.c(BLACK) if k.e == 6 else k.c(IRON))                       # the pan seat
        k.bar(X0 + W * .26, k.cy, X0 + W * .34, k.cy, k.c(BLACK), 3); d.ellipse([X0 + W * .3, k.cy - 5, X0 + W * .38, k.cy + 5], outline=k.c(BLACK)[2], width=2)   # the wheel
    if stg != "F": k.disc(X1 - W * .34, by0 + 4, 3, 3, k.c(BLACK)); d.point((X1 - W * .34, by0 + 4), fill=OUT)    # the exhaust stack
    if mk in ("standard", "rowcrop", "4wd") and k.wealth >= 2 and stg != "F": k.rect(X0 + 1, k.cy - 4, X0 + W * .08, k.cy + 4, k.c(IRON), lv=1)   # the drawbar and linkage
    if k.cond == "worn": k.grime(X1 - W * .3, by0, X1 - W * .04, by1, .7)
    if k.cond == "broken": k.rect(X1 - W * .3, by0 - 4, X1 - W * .12, by0 + 2, C, lv=4); d.line([X1 - W * .25, by0, X1 - W * .15, by1], fill=OUT, width=2)   # the bonnet lifted, a part out
    k.wear(X0 + W * .12, by0, X1 - W * .04, by1, C)


HORSES = {"bay": R_((130, 74, 44), 14), "chestnut": R_((170, 90, 50), 14), "grey": R_((196, 194, 188), 10), "black": R_((50, 46, 48), 8),
          "dun": R_((196, 164, 110), 14), "piebald": R_((230, 226, 218), 6)}


def horse(k, cx, y0, y1, wd, C, rug=None, mane=None):
    """A horse from above, its head to the north: the long body, the neck and narrow head, the ears, the mane down the
    neck and the tail at the rump."""
    d = k.d; L = y1 - y0; mane = mane or (k.c(R_((40, 34, 30), 6)) if C[2][0] > 100 else k.c(R_((30, 28, 28), 4)))
    d.line([cx, y1 - L * .08, cx + 2, y1 + 2], fill=mane[1], width=5)                                         # the tail
    d.ellipse([cx - wd / 2, y0 + L * .3, cx + wd / 2, y1 - L * .05], fill=C[2], outline=OUT)                  # the body
    d.arc([cx - wd / 2 + 2, y0 + L * .32, cx + wd / 2 - 2, y1 - L * .07], 190, 270, fill=C[4], width=2)
    d.polygon([(cx - wd * .3, y0 + L * .36), (cx + wd * .3, y0 + L * .36), (cx + wd * .17, y0 + L * .15), (cx - wd * .17, y0 + L * .15)], fill=C[2], outline=OUT)   # the neck
    d.ellipse([cx - wd * .19, y0, cx + wd * .19, y0 + L * .2], fill=C[3], outline=OUT)                         # the head
    for s_ in (-1, 1): d.line([cx + s_ * wd * .1, y0 + L * .13, cx + s_ * wd * .16, y0 + L * .1], fill=C[0], width=2)   # ears
    d.line([cx, y0 + L * .15, cx, y0 + L * .34], fill=mane[1], width=3)
    if rug: d.rounded_rectangle([cx - wd * .45, y0 + L * .38, cx + wd * .45, y1 - L * .14], 5, fill=rug[2], outline=OUT); d.line([cx - wd * .45, y0 + L * .5, cx + wd * .45, y0 + L * .5], fill=rug[4])


def horsestall(tm, x, y, w, h, st, v):
    """A horse stall from above, its head to the north wall: the partitions down each side, the manger and hay rack at
    the head, the straw bedding, the horse in it (or not), the bar or half-door across the open south end. Medieval:
    plank partitions and a hewn trough; Renaissance and Age of Reason: joined partitions with turned posts; Victorian:
    cast-iron posts with ball tops, rails over boarded partitions, a brick floor and its drain; 20th century: concrete
    and painted boards; Modern: a steel-and-timber stall on rubber mats; Future: a composite stall with lit rails. The
    Islamic world: mud-brick partitions and a carpet over the horse's back in rich houses; East Asia: posts and straw
    rope. Rich: a rug over the horse, a brass name plate. Open: the bar taken down."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    opn = st == "open"; hc = v.get("horse", "bay")
    floor = {"V": k.c(R_((150, 80, 60), 12)), "W": k.c(R_((160, 158, 150), 8)), "N": k.c(R_((50, 50, 54), 6)), "F": k.c(R_((70, 72, 80), 8))}.get(stg, k.c(R_(SOILS[S], 12)))
    d.rectangle([X0, Y0, X1, Y1], fill=floor[2])
    if stg == "V":
        for gy in range(int(Y0) + 4, int(Y1), 5): d.line([X0, gy, X1, gy], fill=floor[0])
        d.line([k.cx, k.fy(.5), k.cx, Y1 - 2], fill=OUT, width=2)                                              # the drain channel
    elif stg == "N":
        for gy in range(int(Y0) + 10, int(Y1), 12): d.line([X0, gy, X1, gy], fill=floor[0])
    straw = k.c(STRAW if stg not in "NF" else R_((200, 180, 120), 10))
    sx0, sx1 = X0 + W * .1, X1 - W * .1
    if stg == "N": straw = k.c(R_((210, 190, 140), 8))                                                         # wood shavings bedding
    d.rectangle([sx0, Y0 + H * .2, sx1, Y1 - H * .08], fill=straw[2]); straw_mass(k, sx0 + 2, Y0 + H * .22, sx1 - 2, Y1 - H * .1, straw, n=W * H / (60 if stg != "N" else 90))
    # partitions
    pt = {"M": k.wood, "E": k.wood, "V": k.wood, "W": k.paint, "N": k.wood, "F": k.comp}[stg]
    if S == "islamic" and stg in "MEV": pt = k.c(R_((176, 146, 108), 12))
    pw = max(5, W * .07)
    for px0 in (X0, X1 - pw):
        k.sh(px0, Y0, px0 + pw, Y1, 3); k.rect(px0, Y0, px0 + pw, Y1, pt, lv=2)
        if stg in "MEVN" and not (S == "islamic" and stg in "MEV"):
            for gy in range(int(Y0) + 6, int(Y1) - 2, 7 if stg != "N" else 10): d.line([px0 + 1, gy, px0 + pw - 1, gy], fill=pt[0])
        if stg in "VN": d.rectangle([px0 + 1, Y0 + 1, px0 + pw - 1, k.fy(.55)], outline=(k.c(IRON) if stg == "V" else k.paint)[3], width=2)   # the rails over the boards
        post = Y1 - 2
        if stg == "V": k.disc(px0 + pw / 2, post - 2, pw * .6, pw * .6, k.c(IRON)); d.point((px0 + pw / 2 - 1, post - 3), fill=k.c(IRON)[4])   # the ball-topped post
        elif stg == "E": k.disc(px0 + pw / 2, post - 2, pw * .5, pw * .5, pt, lv=3)
        elif stg == "F": k.glowline(px0 + pw / 2, Y0 + 3, px0 + pw / 2, Y1 - 3)
    if S == "eastasia" and stg in "MEV": d.line([X0 + pw, k.fy(.6), X1 - pw, k.fy(.6)], fill=k.c(STRAW)[1], width=2)   # a straw rope across
    # manger and rack at the head
    mC = k.wood if stg in "ME" else k.c(IRON) if stg == "V" else k.c(STEEL) if stg in "WN" else k.comp
    if S in ("islamic", "southasia", "africa") and stg in "MEV": mC = k.c(R_((176, 146, 108), 12))
    k.rect(X0 + pw, Y0, X1 - pw, Y0 + H * .12, mC, lv=1); d.rectangle([X0 + pw + 3, Y0 + 3, k.cx - 2, Y0 + H * .12 - 3], fill=k.c(HAY)[2])
    d.rectangle([k.cx + 2, Y0 + 3, X1 - pw - 3, Y0 + H * .12 - 3], fill=k.c(R_((190, 160, 100), 10))[1])           # oats in the other half
    if stg in "EVW":
        for gx in range(int(X0 + pw) + 3, int(X1 - pw) - 2, 4): d.line([gx, Y0 + 1, gx, Y0 + H * .05], fill=mC[3])  # the rack's bars
    if stg in "WNF" and k.wealth >= 2: k.disc(X1 - pw - 6, Y0 + H * .17, 4, 4, k.c(STEEL)); d.ellipse([X1 - pw - 8, Y0 + H * .17 - 2, X1 - pw - 4, Y0 + H * .17 + 2], fill=WATER[2])   # an automatic drinker
    # the horse
    if hc != "none":
        rug = (k.m("cloth") if stg in "MEV" and not k.glob else k.paint) if k.wealth >= 3 else None
        if S == "islamic" and k.rich and stg in "MEV": rug = k.acc
        horse(k, k.cx, Y0 + H * .1, Y1 - H * .14, min(W * .5, 46), k.c(HORSES.get(hc, HORSES["bay"])), rug)
        if rug and S in ("islamic", "steppe", "southasia") and stg in "MEV": k.pattern(k.cx - W * .14, k.fy(.45), k.cx + W * .14, k.fy(.72))
    else:
        fork(k, X0 + pw + 4, Y1 - 6, k.cx + W * .1, k.fy(.4), 3 if stg != "M" else 2)                          # mucked out, the fork left
    # the bar or half-door at the open end
    if not opn:
        bC = k.wood if stg in "MEV" else k.paint if stg in "WN" else k.comp
        if stg in "VWN": k.rect(X0 + pw, Y1 - 6, X1 - pw, Y1 - 1, bC, lv=3); d.line([X0 + pw + 2, Y1 - 4, X1 - pw - 2, Y1 - 4], fill=bC[0])   # the half-door
        else: k.bar(X0 + pw, Y1 - 3, X1 - pw, Y1 - 3, bC, 3)                                                     # the stall bar
    elif stg in "VWN": k.rect(X1 - pw - 4, Y1 - H * .35, X1 - pw, Y1 - 1, k.wood if stg == "V" else k.paint, lv=3)   # the door swung in against the side
    if k.rich: k.rect(k.cx - 6, Y0 + 1, k.cx + 6, Y0 + 5, k.c(BRASS), lv=3)                                  # the name plate
    if k.poor and stg in "MEV": d.line([X0 + pw, k.fy(.3), X0 + pw + 4, k.fy(.6)], fill=k.c(R_((170, 150, 108), 14))[2], width=2)
    if k.cond == "broken": d.line([X1 - pw, k.fy(.3), X1 - pw / 2, k.fy(.5)], fill=OUT, width=3)             # a kicked-out board
    if k.cond != "new": k.grime(sx0, k.fy(.6), sx1, Y1 - 4, .7)
    k.wear(X0, Y0, X0 + pw, Y1, pt)


def manger(tm, x, y, w, h, st, v):
    """A manger against the wall with the fodder in it, from above. Medieval: a trough hewn from a log, or planks on
    posts; Renaissance on: a plank manger with a hay rack of staves over it; Victorian: a cast-iron or glazed
    trough under an iron rack; 20th century: a galvanised trough; Modern: a plastic feeder and a galvanised rack;
    Future: a composite feeder with a lit level strip. The Islamic world, South Asia and Africa: a mud-built manger
    along the wall; East Asia: a wooden trough on legs. The fodder of the land: hay, oats, chopped straw, maize."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    fd = v.get("fodder", "hay")
    F_ = k.c({"hay": HAY, "oats": R_((196, 170, 110), 12), "chaff": R_((214, 196, 140), 10), "maize": R_((222, 186, 80), 14), "beet": R_((150, 60, 70), 14)}.get(fd, HAY))
    mud = S in ("islamic", "southasia", "africa") and stg in "MEVW"
    C = k.c(R_((176, 146, 108), 12)) if mud else k.wood if stg in "ME" or (stg == "V" and k.wealth < 3) else k.c(IRON) if stg == "V" else k.c(STEEL) if stg == "W" else k.paint if stg == "N" else k.comp
    if stg == "W": C = {"atlantic": k.c(R_((222, 210, 176), 10)), "northern": k.wood, "mediterranean": k.c(STONE), "steppe": k.wood, "polar": k.wood,
                        "eastasia": k.wood, "seasia": k.c(R_((180, 170, 100), 14)), "americas": k.c(R_((140, 110, 80), 12))}.get(S, C)   # fireclay, timber, stone, bamboo
    k.sh(X0, Y0, X1, Y1, 4)
    if stg == "M" and not mud and S not in ("eastasia",):                                                     # a hewn log trough
        log(k, X0 + 1, Y0 + 2, X1 - 1, Y1 - 2, k.c(BARKS[S]), cut=True)
        d.rounded_rectangle([X0 + 8, Y0 + 6, X1 - 8, Y1 - 6], 4, fill=k.wood[0], outline=OUT)
    elif mud:
        k.rect(X0, Y0, X1, Y1, C, lv=3); d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=C[0], outline=OUT)
        for gx in np.arange(X0 + W / 3, X1 - 4, W / 3): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=C[1], width=3)    # the bays
    else:
        k.rrect(X0, Y0, X1, Y1, 3 if stg in "WNF" else 1, C); d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=C[0], outline=OUT)
        if stg == "E" or stg == "V" and k.wealth < 3:
            for lx in (X0 + 2, X1 - 6): k.rect(lx, Y0, lx + 4, Y1, k.wood, lv=3)
        if S == "eastasia" and stg in "MEV": k.rect(X0 + 2, Y0 + 1, X1 - 2, Y0 + 3, k.c(BLACK), lv=2)
    # the fodder
    fx0, fy0, fx1, fy1 = X0 + 6, Y0 + 6, X1 - 6, Y1 - 6
    if fd in ("oats", "chaff", "maize"):
        d.rectangle([fx0, fy0 + 2, fx1, fy1], fill=F_[2])
        for _ in range(int((fx1 - fx0) * (fy1 - fy0) / 6)): px_, py_ = k.rng.uniform(fx0, fx1), k.rng.uniform(fy0 + 2, fy1); d.point((px_, py_), fill=F_[k.rng.integers(0, 5)])
    elif fd == "beet":
        for gx in np.arange(fx0 + 4, fx1 - 2, 8): k.disc(gx, (fy0 + fy1) / 2 + (int(gx) % 3 - 1) * 2, 4, 3, F_)
    else:
        k.blob((fx0 + fx1) / 2, (fy0 + fy1) / 2, (fx1 - fx0) / 2, (fy1 - fy0) / 2 + 2, F_, n=8, jit=.1); straw_mass(k, fx0, fy0, fx1, fy1, F_, n=(fx1 - fx0) * (fy1 - fy0) / 10)
    # the rack over it at the wall
    if stg in "EVWN" and not mud and not (stg == "W" and S in ("mediterranean", "eastasia", "seasia", "steppe")):
        rC = k.wood if stg == "E" or stg == "W" and S in ("northern", "polar", "americas") else k.c(IRON) if stg == "V" else k.c(STEEL)
        k.bar(X0 + 2, Y0 + 2, X1 - 2, Y0 + 2, rC, 3)
        for gx in np.arange(X0 + 5, X1 - 3, 5 if stg != "N" else 8): d.line([gx, Y0 + 1, gx, Y0 + H * .35], fill=rC[3])
    if stg == "N": k.disc(X1 - 8, Y1 - 5, 3, 3, k.c(R_((60, 60, 64), 6)))                                   # a lick block holder
    if stg == "F": k.glowline(X0 + 4, Y1 - 3, X0 + W * (.3 + .1 * k.wealth), Y1 - 3, 3)
    if k.rich and stg in "MEV": k.rect(X0 + W * .45, Y1 - 4, X0 + W * .55, Y1, k.c(BRASS), lv=3)
    if k.cond == "broken": d.line([X0 + W * .7, Y0 + 2, X0 + W * .76, Y1 - 2], fill=OUT, width=3); k.blob(X0 + W * .73, Y1 + 1, 6, 3, F_, n=4)
    k.wear(X0, Y0, X1, Y1, C)


def saddlerack(tm, x, y, w, h, st, v):
    """A saddle rack on the wall with its saddle and bridle, from above: the bracket, the saddle seen from over it with
    its pommel to the east, the cloth under it, the bridle and stirrups hung beside. Europe: a medieval war or riding
    saddle with high bows, later the flat English saddle; the steppe: a wooden-framed saddle with a high pommel on felt;
    the Islamic world: the high-fronted saddle on a bright cloth; East Asia: a lacquered saddle; South Asia: a padded
    saddle with a bright cloth; Africa: a Sahel saddle with fringed leather; the Americas: before the horse came, an
    Andean llama pack saddle, after it the stock saddle with its horn; Oceania: a carrying frame until the horse came;
    the far north: a sled dog's harness. Modern: a synthetic saddle on a steel rack; Future: a composite saddle."""
    k = K(tm, x, y, w, h, st, v); d = k.d; stg = k.stage; S = k.style
    X0, Y0, X1, Y1, W, H = k.X0, k.Y0, k.X1, k.Y1, k.W, k.H
    rack = k.wood if stg in "MEV" else k.c(STEEL) if stg in "WN" else k.comp
    k.sh(X0 + W * .06, Y0 + 4, X0 + W * .7, Y1 - 1, 3)
    k.rect(X0, Y0, X1, Y0 + 4, rack, lv=3)                                                                   # the board on the wall
    for px_ in (X0 + W * .1, X1 - W * .12): k.disc(px_, Y0 + 2, 2, 2, k.c(IRON))
    leather = k.c(LEATHER) if stg != "F" else k.comp
    if stg == "N" and k.wealth <= 2: leather = k.c(R_((60, 50, 44), 8))                                     # a cheap synthetic saddle
    cloth = k.m("cloth"); r_ = k.rng
    sx0, sx1 = X0 + W * .06, X0 + W * .7; sy0, sy1 = Y0 + 5, Y1 - 2; scx = (sx0 + sx1) / 2
    kind = "euro"
    if True:
        kind = {"steppe": "steppe", "islamic": "arab", "eastasia": "kura", "southasia": "arab", "africa": "sahel", "seasia": "kura",
                "americas": "pack" if k.e == 0 else "stock", "oceania": "frame" if k.e <= 3 else "stock", "polar": "dog"}.get(S, "euro")
        if S == "atlantic" and stg in "VWNF": kind = "english"
        if S == "seasia" and stg in "WNF": kind = "euro"
    if kind in ("euro", "english", "stock", "steppe", "arab", "kura", "sahel"):
        cl = cloth if kind != "kura" else k.c(R_((60, 60, 70), 8)); SW = sx1 - sx0
        if kind == "english": d.rounded_rectangle([sx0, sy0 + 1, sx1, sy1 - 1], 6, fill=k.c(R_((236, 234, 226), 6))[2], outline=OUT)   # the white numnah
        elif kind in ("arab", "sahel", "steppe") or k.wealth >= 3: d.rectangle([sx0 - 2, sy0, sx1 + 2, sy1], fill=cl[2], outline=OUT)   # the saddle cloth
        if kind in ("arab", "steppe") and stg in "MEV": k.pattern(sx0, sy1 - 6, sx1, sy1 - 1)
        if kind == "arab":
            for px_, py_ in ((sx0 - 1, sy0 + 1), (sx1 + 1, sy0 + 1), (sx0 - 1, sy1 - 1), (sx1 + 1, sy1 - 1)): k.disc(px_, py_, 3, 3, k.acc2)   # the tassels
        if kind == "sahel":
            for gx in np.arange(sx0, sx1, 3): d.line([gx, sy1, gx, sy1 + 3], fill=leather[1])                  # the fringe
        SC = leather if kind not in ("kura", "sahel") else k.c(R_((150, 60, 40), 12)) if kind == "sahel" else k.c(R_((120, 30, 30), 12)) if k.wealth >= 3 else k.c(BLACK)
        if kind == "stock":                                                                                # the stock saddle's broad square skirts
            d.rounded_rectangle([sx0, sy0 + 1, sx1, sy1 - 1], 3, fill=SC[1], outline=OUT); d.ellipse([sx0 + SW * .15, sy0 + 3, sx1 - SW * .15, sy1 - 3], fill=SC[2], outline=OUT)
            k.disc(sx1 - SW * .12, k.cy, 4, 4, SC, lv=4); d.ellipse([sx1 - SW * .12 - 2, k.cy - 2, sx1 - SW * .12 + 2, k.cy + 2], fill=SC[0])   # the horn
            if stg in "VWN": [d.point((sx0 + 4 + i * 4, sy1 - 3), fill=k.c(BRASS)[4]) for i in range(int((SW - 8) / 4))]   # tooling and conchos
        elif kind == "steppe":                                                                             # a wooden tree: two side bars, the high arches
            for by in (sy0 + 3, sy1 - 3): k.bar(sx0 + 2, by, sx1 - 2, by, k.wood, 3)
            k.rect(sx1 - SW * .18, sy0 + 1, sx1 - 2, sy1 - 1, k.wood, lv=3); k.rect(sx0 + 2, sy0 + 2, sx0 + SW * .12, sy1 - 2, k.wood, lv=1)
            d.ellipse([sx0 + SW * .2, sy0 + 5, sx1 - SW * .22, sy1 - 5], fill=k.c(R_((200, 190, 170), 10))[2], outline=OUT)   # the felt cushion
            if k.rich: [k.disc(sx1 - SW * .1, sy0 + 4 + i * 5, 1.5, 1.5, k.c(STEEL), lv=4) for i in range(3)]    # silver studs
        elif kind == "kura":                                                                               # a lacquered saddle and its two curved arches
            k.rrect(sx0 + 2, sy0 + 2, sx1 - 2, sy1 - 2, 4, SC)
            for ax_ in (sx0 + SW * .12, sx1 - SW * .14): d.arc([ax_ - 5, sy0, ax_ + 5, sy1], 270 if ax_ > scx else 90, 90 if ax_ > scx else 270, fill=k.c(BRASS)[3] if k.wealth >= 3 else SC[4], width=3)
        else:
            d.ellipse([sx0 + 2, sy0 + 2, sx1 - 2, sy1 - 2], fill=SC[2], outline=OUT)                           # the seat
            d.arc([sx0 + 4, sy0 + 3, sx1 - 4, sy1 - 3], 200, 260, fill=SC[4], width=2)
            hb = {"euro": .16 if stg in "ME" else .12, "english": .06, "arab": .24, "sahel": .14}[kind]
            k.rect(sx1 - SW * hb, sy0 + 2, sx1 - 2, sy1 - 2, SC if kind != "arab" else k.acc, lv=3)            # the pommel
            k.rect(sx0 + 2, sy0 + 2, sx0 + SW * hb * .8, sy1 - 2, SC if kind != "arab" else k.acc, lv=1)      # the cantle
            if kind == "sahel": k.disc(sx1 - SW * .08, k.cy, (sy1 - sy0) * .4, (sy1 - sy0) * .4, SC, lv=3)        # the broad pommel plate
            if kind == "english": d.ellipse([scx - 4, sy0 + 4, scx + 8, sy1 - 4], outline=SC[0])                 # the flap's knee roll
        if stg == "F": d.rectangle([scx - 6, sy0 + 3, scx + 6, sy1 - 3], fill=k.glow[1])                         # a lit panel in the composite seat
        if k.rich and stg in "MEV": d.rectangle([sx0, sy0, sx1, sy1], outline=k.c(BRASS)[3])                    # gilt edging
        for ex in (sx0 + SW * .4, sx0 + SW * .6): d.line([ex, sy1 - 2, ex, Y1], fill=leather[1], width=2)       # the stirrup leathers
    elif kind == "pack":                                                                                     # an Andean pack saddle: two woven bags on a pad
        for by in (sy0 + 1, (sy0 + sy1) / 2 + 1): k.rect(sx0, by, sx1, by + (sy1 - sy0) / 2 - 2, cloth, lv=2 + int(by > k.cy))
        d.line([sx0, k.cy, sx1, k.cy], fill=k.c(R_((170, 150, 108), 14))[1], width=2)
    elif kind == "frame":                                                                                    # a carrying frame of poles and cord
        for gx in (sx0 + 3, sx1 - 3): k.bar(gx, sy0, gx, sy1, k.wood, 3)
        for gy in (sy0 + 4, k.cy, sy1 - 4): k.bar(sx0 + 3, gy, sx1 - 3, gy, k.wood, 2)
        k.rect(sx0 + 8, sy0 + 6, sx1 - 8, sy1 - 6, k.m("straw"), lv=3)
    elif kind == "dog":                                                                                      # a sled dog's harness hung up
        for i in range(3): d.ellipse([sx0 + i * 10, sy0 + 2, sx0 + i * 10 + 14, sy1 - 2], outline=k.c(HIDE)[1], width=2)
        d.line([sx0, k.cy, sx1, k.cy], fill=k.c(HIDE)[2], width=2)
    # the bridle on its peg
    bx = X1 - W * .2
    k.disc(bx, Y0 + 5, 3, 3, rack)
    d.ellipse([bx - W * .1, Y0 + 5, bx + W * .1, Y1 - 3], outline=leather[1], width=2)
    if kind not in ("pack", "frame", "dog"): k.rect(bx - 3, Y1 - 6, bx + 3, Y1 - 3, k.c(STEEL) if stg != "M" else k.c(IRON), lv=3)   # the bit
    if k.rich and kind not in ("dog",): [k.disc(bx - W * .09 + i * W * .06, Y0 + H * .55, 2, 2, k.c(BRASS)) for i in range(4)]   # brass on the bridle
    if k.cond == "broken": d.line([sx0 + 6, sy0 + 3, scx, sy1 - 3], fill=OUT, width=2); d.line([bx - W * .1, k.cy, bx - W * .14, Y1], fill=leather[1], width=2)
    k.wear(sx0, sy0, sx1, sy1, leather)


reg("anvil", anvil, {"tools": ["few", "many"], "livery": ["black", "grey", "green"], "make": ["london", "farrier", "double", "bench"]}, nvar=22, global_from=1902, ft=((2.25, 3), (1.75, 2.5)), ref="an anvil about 2 ft long with its horn, on an oak block 18 to 24 in across (Moxon, Mechanick Exercises, 1678)")
reg("grindstone", grindstone, {"livery": ["green", "red", "grey", "blue", "black", "cream", "orange"], "make": ["pedal", "bench", "trough"]}, nvar=22, global_from=1902, ref="a 2 ft stone in a frame with its crank and water trough (Diderot, Encyclopedie plates, Coutelier)")
reg("bellows", bellows, {"livery": ["black", "red", "green", "grey", "brown", "blue", "cream"], "make": ["blower", "forge", "bellows"]}, nvar=22, global_from=1902, tags=("smith",), clear=1, ref="smith's great bellows 4 to 5 ft long (Moxon 1678; Diderot, Forges)")
reg("loom", loom, {"cloth": ["blue", "red", "undyed", "green", "yellow", "black", "purple"], "livery": ["grey", "green", "blue", "cream"], "make": ["plain", "dobby", "jacquard"]}, nvar=22, global_from=1902,
    ref="treadle looms with their bench about 9 by 6 ft (Diderot, Encyclopedie plates, Draperie; Broudy, The Book of Looms)")
reg("backstrap", backstrap, {"cloth": ["red", "blue", "yellow", "black", "green", "white", "purple", "orange"], "work": ["begun", "half", "nearly"]},
    tags=("craft", "weaver", "home", "yard"), front=True, clear=1, ref="backstrap looms with warps 4 to 6 ft and the weaver's mat (Broudy, The Book of Looms)")
reg("wheel", wheel, {"fibre": ["wool", "flax", "grey wool", "cotton", "brown wool", "silk"]},
    ref="great wheels about 5 ft with the bench, Saxony wheels about 3 ft, with the spinner's stool (Baines, Spinning Wheels, Spinners and Spinning)")
reg("distaff", distaff, {"fibre": ["wool", "flax", "dyed", "grey wool", "cotton", "brown wool"]}, ref="a distaff about 3 ft with its puff of wool and a spindle about 10 in")
reg("potterswheel", potterswheel, {"clay": ["red", "buff", "white", "grey"], "work": ["pot", "bowl"], "livery": ["blue", "grey", "green", "white", "cream"], "make": ["kick", "electric"]}, nvar=22, global_from=1919, tags=("craft", "pottery", "work"), front=True, clear=1,
    ref="kick wheels about 3 ft across with the seat (Rhodes, Clay and Glazes for the Potter; Diderot, Fayencerie)")
reg("lathe", lathe, {"work": ["wood", "metal"], "livery": ["grey", "green", "blue"], "make": ["engine", "bench", "wood", "long"]}, nvar=22, global_from=1837, front=True, clear=2, tags=("joinery", "work", "carpenter"),
    ref="pole lathes about 6 ft along the bed with the pole above (Moxon, Mechanick Exercises 1678); engine lathes 5 to 7 ft")
reg("sawpit", sawpit, {"work": ["half", "begun", "nearly"]}, tags=("joinery", "yard", "carpenter"),
    ref="saw pits about 12 to 14 ft by 3 to 4 ft (Holtzapffel, Turning and Mechanical Manipulation; Salaman, Dictionary of Woodworking Tools)")
reg("sawhorse", sawhorse, {"load": ["log", "half-cut", "plank"], "livery": ["yellow", "orange", "red", "grey", "blue"], "make": ["steel", "plastic", "log"]}, nvar=22, global_from=1990, ref="a sawbuck about 3 1/2 to 4 ft long with a log on it")
reg("chopping", chopping, {}, ref="a round of trunk about 18 to 24 in with the axe in it")
reg("butcherblock", butcherblock, {"meat": ["pork", "beef", "mutton", "fowl", "fish", "game"], "livery": ["white", "red", "grey"], "make": ["table", "block"]}, nvar=22, global_from=1990, tags=("kitchen", "butchery", "shop"),
    clear=2, ref="butchers' blocks about 30 to 36 in square on legs (Diderot, Encyclopedie plates, Boucher)")
reg("meathooks", meathooks, {"meat": ["pork", "beef", "mutton", "fowl", "game", "fish", "duck"], "livery": ["white", "grey"]}, nvar=22, global_from=1902, tags=("butchery", "cellar", "kitchen", "feeding"),
    ref="a rail of hooks about 6 ft along a butcher's wall, carcasses hanging about 18 in out from it")
reg("vat", vat, {"liquid": ["blue", "red", "yellow", "tan", "black", "green"], "livery": ["grey", "blue", "green"]}, nvar=22, global_from=1902, states=("full", "empty"),
    ref="open dye and tan vats about 8 ft across (Diderot, Teinturier; the Fez and Kano dye pits)")
reg("mashtun", mashtun, {"grain": ["barley", "oats", "rye", "rice", "sorghum", "maize"], "livery": ["grey", "green", "blue", "red"], "make": ["round", "rect", "twin"]}, nvar=22, global_from=1902, states=("full", "empty"), tags=("brew", "brewhouse"), clear=1.5,
    ref="mash tuns of 8 to 9 ft across in a brewhouse (Diderot, Brasserie; Combrune, Theory and Practice of Brewing 1762)")
reg("winepress", winepress, {"fruit": ["red grapes", "white grapes", "olives", "apples", "dates"], "livery": ["red", "green", "blue", "grey"], "make": ["basket", "twin", "rack"]}, nvar=22, global_from=1837, tags=("cellar", "barn", "press", "brew"), front=True, clear=2,
    ref="beam and screw presses about 8 by 6 ft on their beds (Diderot, Pressoir; Columella's beam press)")
reg("quern", quern, {"grain": ["wheat", "barley", "maize", "millet", "rice", "rye"]},
    ref="rotary querns about 16 to 20 in across on a cloth or skin; metates about 2 ft long (Curwen, Querns)")
reg("millstones", millstones, {"livery": ["red", "green", "grey", "blue", "black"], "make": ["roller", "stone", "hammer"]}, nvar=22, global_from=1902, tags=("mill",), clear=2, ref="millstones 4 to 5 ft across in a tun about 6 ft, the hopper over them (Fitzherbert; Evans, The Young Mill-Wright 1795)")
reg("churn", churn, {"livery": ["blue", "red", "green", "cream", "white"], "make": ["jar", "barrel", "dairy", "plunge"]}, nvar=22, global_from=1902, ref="plunge churns about 12 to 18 in across; barrel churns on a stand about 2 ft")
reg("press-print", press_print, {"livery": ["black", "green", "grey", "red", "blue"], "make": ["platen", "cylinder", "proof"]}, nvar=22, global_from=1837, tags=("printer", "work", "office"), front=True, clear=2,
    ref="the common press about 6 by 4 ft with its carriage (Moxon, Mechanick Exercises on the Whole Art of Printing 1683)")
reg("sewingmachine", sewingmachine, {"cloth": ["red", "blue", "white", "green", "black", "yellow", "purple"], "livery": ["black", "cream", "white", "grey", "green", "red"], "make": ["treadle", "hand", "portable"]}, nvar=22, global_from=1837, states=("open", "closed"), tags=("tailor", "work", "parlour"),
    front=True, clear=1.5, ref="treadle sewing machine cabinets about 3 ft by 1 1/2 ft (Singer 27 and 66 cabinets)")
reg("scales", scales, {"goods": ["spice", "grain", "tea", "coin", "salt", "pepper"], "livery": ["red", "white", "grey", "black", "green", "cream"]}, nvar=22, global_from=1902, tags=("shop", "counting", "market", "laboratory"),
    ref="beam scales about 18 in across the pans; counter scales about 16 in")
reg("stall", stall, {"goods": ["bread", "cloth", "pots", "fish", "fruit", "spice", "meat", "greens"]}, states=("open", "closed"),
    ref="trestle stalls with an awning, about 13 by 6 ft (market stall leases of the 14th to 19th c.)")
reg("handcart", handcart, {"load": ["hay", "sacks", "casks", "crates", "fish", "pots", "firewood", "empty"], "livery": ["green", "red", "blue", "grey", "yellow"]}, nvar=22, global_from=1990,
    ref="a two-wheeled handcart, bed about 6 by 3 1/2 ft, the shafts and cross handle beyond (costermongers' barrows)")
reg("apothecary", apothecary, {"livery": ["white", "cream", "green", "grey", "black"], "make": ["cabinet", "shelves", "counter"]}, nvar=22, global_from=1902, states=("closed", "open"), openable="chest", front=True, clear=2, tags=("shop", "laboratory", "surgery"),
    ref="apothecaries' drawer cabinets about 6 ft long and 18 in deep with their jars (Diderot, Pharmacie)")
reg("alembic", alembic, {"liquor": ["green", "red", "yellow", "blue", "white"], "livery": ["black", "grey"], "make": ["glass", "condenser", "copper"]}, nvar=22, global_from=1837, states=("lit", "out"), tags=("laboratory", "sanctum", "chantry"),
    ref="a still on its little furnace with its receiver, about 3 by 2 ft on the bench (Brunschwig, Liber de arte distillandi 1500)")
reg("easel", easel, {"subject": ["landscape", "portrait", "still life", "icon", "seascape", "abstract"], "livery": ["black", "brown", "grey"], "make": ["tripod", "studio", "box"]}, nvar=22, global_from=1902, tags=("studio", "salon", "gallery"),
    front=True, clear=2, ref="a studio easel about 3 by 2 ft at its feet with the canvas and palette")
reg("piano", piano, {"finish": ["wood", "black", "painted", "pale", "white"], "make": ["digital", "stage", "upright"]}, nvar=22, global_from=1837, states=("open", "closed"), tags=("salon", "parlour", "taproom"), front=True, clear=2.5,
    ref="square pianos about 5 1/2 by 2 ft, uprights about 5 by 2 ft (Broadwood and Pleyel models)")
reg("organ", organ, {"case": ["oak", "painted", "gilt", "dark", "white"]}, nvar=14, tags=("church", "nave", "chancel"), front=True, clear=3,
    ref="a gallery or chancel organ about 10 by 6 ft with its console (Dom Bedos, L'art du facteur d'orgues 1766)")
reg("harp", harp, {}, tags=("solar", "salon", "greathall"), ref="a harp, lute or zither 2 to 3 ft long laid on its cushion")
reg("drum", drum, {}, tags=("yard", "hall", "shrinehall", "square"), ref="drums 1 1/2 to 2 ft across (djembe, taiko, tabla pairs)")
reg("beehive", beehive, {"livery": ["white", "cream", "green", "blue", "yellow"], "make": ["box", "topbar", "warre"]}, nvar=22, global_from=1990, tags=("garden", "field"), ref="straw skeps about 18 in across on a stone 2 ft square; box hives about 20 in")
reg("dovecote", dovecote, {"livery": ["white", "cream", "green", "blue", "grey"], "make": ["loft", "post", "round"]}, nvar=22, global_from=1990, tags=("farmyard", "garden", "bailey"), ref="post dovecotes about 4 ft across under their roof")
reg("coop", coop, {"livery": ["green", "red", "white", "cream", "blue"], "make": ["house", "ark", "plastic"]}, nvar=22, global_from=1990, states=("closed", "open"),
    ft=((4, 6), (3.5, 5)), tags=("farmyard", "yard"), ref="a hen house about 4 ft square with its little run (Cobbett, Cottage Economy, 1822)")
reg("pigsty", pigsty, {"livery": ["green", "blue", "grey", "red", "orange"]}, nvar=22, global_from=1990, states=("closed", "open"),
    ft=((7, 10), (7, 10)), tags=("farmyard", "pen"), ref="a sty about 8 ft square with its covered pen (Loudon, Encyclopaedia of Cottage, Farm and Villa Architecture, 1833)")
reg("haystack", haystack, {"make": ["white", "black", "green", "none", "square"]}, nvar=22, global_from=1990, mount="ground",
    ft=((10, 12), (10, 12)), tags=("field", "farmyard", "yard"), ref="field ricks 10 to 12 ft across (Stephens, The Book of the Farm, 1844); round bales 4 to 5 ft")
reg("hayheap", hayheap, {"livery": ["red", "yellow", "blue", "green", "black"], "feed": ["hay", "straw", "lucerne", "haylage"]}, nvar=22, global_from=1990)
reg("woodpile", woodpile, {})
reg("plough", plough, {"make": ["one", "two", "three", "four"], "livery": ["red", "green", "blue", "grey", "orange", "yellow"]}, nvar=22, global_from=1919,
    ft=((7, 10), (2.5, 4)), tags=("barn", "field", "farmyard"), ref="a mouldboard plough about 8 ft long (Fitzherbert, Boke of Husbandrie, 1523); two-furrow tractor ploughs about 9 ft")
reg("tractor", tractor, {"make": ["standard", "rowcrop", "crawler", "compact", "4wd"], "livery": ["red", "green", "blue", "grey", "orange", "yellow"]}, nvar=22, global_from=1919, mount="ground",
    ft=((10.5, 14), (5, 7)), tags=("farmyard", "field", "barn"), ref="the Fordson Model F of 1917, about 8 ft 6 in by 5 ft 2 in; utility tractors of the 1950s to 1990s about 11 to 13 ft by 6 ft")
reg("horsestall", horsestall, {"horse": ["bay", "chestnut", "grey", "black", "dun", "none"], "livery": ["green", "black", "grey", "red", "blue"]}, nvar=22, global_from=1990,
    states=("closed", "open"))
reg("manger", manger, {"fodder": ["hay", "oats", "chaff", "maize", "beet"], "livery": ["green", "black", "grey", "blue", "red"]}, nvar=22, global_from=1990,
    ft=((5, 7), (1.5, 2.5)), tags=("stable", "barn", "pen"), ref="mangers about 2 ft wide along the stall head (Stephens, The Book of the Farm, 1844)")
reg("saddlerack", saddlerack, {}, ft=((3.5, 4.5), (1.25, 2)), tags=("stable", "barn"), ref="a saddle about 2 ft long on its bracket with the bridle hung by it")
