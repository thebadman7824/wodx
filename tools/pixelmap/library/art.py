"""Shared drawing helpers for the library's own drawings (B6339): lit tops, grain, cloth, metal, all seen from straight
above, light from the north-west, shadows short and tight. Coordinates in pixels unless named in squares."""
import math

import numpy as np

from px import R, T, OUT

P = lambda v: int(round(v * T))


def tone(c, k): return tuple(int(max(0, min(255, v + k))) for v in c)


def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ramp(base, step=18, hue=(6, 2, -6)):
    """Five tones from a middle colour, dark to light: the darker lean cool, the lighter warm (RULES: ramps shift hue)."""
    return [tuple(int(max(0, min(255, base[i] + k * step + hue[i] * k * (1 if k > 0 else .5)))) for i in range(3)) for k in (-2, -1, 0, 1, 2)]


# materials a player tells apart on a dark plank floor: each lighter or more coloured than the floor
OAK = ramp((150, 112, 70), 20)
DEAL = ramp((182, 160, 118), 18)            # scrubbed pine
WALNUT = ramp((104, 66, 44), 16)
PAINT_RED, PAINT_BLUE, PAINT_GREEN = ramp((150, 50, 40), 20), ramp((54, 84, 140), 20), ramp((70, 110, 70), 18)
IRON = [(18, 18, 24), (34, 34, 44), (56, 56, 66), (84, 84, 94), (130, 130, 138)]
BRASS = ramp((184, 148, 70), 22)
STEEL = ramp((150, 156, 164), 20)
WHITE = ramp((214, 210, 198), 12)
LINEN = ramp((196, 186, 160), 14)
TICK = ramp((170, 160, 132), 14)
WOOL_RED, WOOL_BLUE, WOOL_GREEN, WOOL_BROWN = ramp((132, 44, 36), 18), ramp((50, 70, 120), 18), ramp((64, 96, 58), 16), ramp((116, 84, 56), 16)
PLASTIC_GREY, PLASTIC_WHITE = ramp((176, 178, 180), 14), ramp((226, 226, 222), 8)
COMPOSITE = ramp((58, 64, 74), 14)
GLOW = [(40, 120, 140), (70, 190, 210), (150, 240, 250)]
CLOTHS = {"red": WOOL_RED, "blue": WOOL_BLUE, "green": WOOL_GREEN, "linen": LINEN, "brown": WOOL_BROWN}


def shadow(tm, x0, y0, x1, y1, off=4, f=.56, kind="rect"):
    tm.shade((x0 + off - 1, y0 + off, x1 + off, y1 + off + 1), f=f, kind=kind)


def slab(tm, x0, y0, x1, y1, C, grain="x", out=OUT, knots=0, gaps=None, rng=None):
    """A lit board top: outline, light north and west edges, dark south and east edges, grain strokes along `grain`,
    and dark joints at `gaps` (pixel positions across the grain)."""
    d = tm.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=out)
    d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=C[3])
    d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=C[1])
    rng = rng or np.random.default_rng(x0 * 31 + y0)
    if grain:
        L = (x1 - x0) if grain == "x" else (y1 - y0); A = (y1 - y0) if grain == "x" else (x1 - x0)
        for _ in range(int(L * A / 90)):
            u, v = rng.uniform(4, L - 12), rng.uniform(3, A - 3); ln = rng.uniform(6, 14); c = C[1] if rng.random() < .6 else C[3]
            if grain == "x": d.line([x0 + u, y0 + v, x0 + u + ln, y0 + v], fill=c)
            else: d.line([x0 + v, y0 + u, x0 + v, y0 + u + ln], fill=c)
        for _ in range(knots):
            u, v = rng.uniform(10, L - 10), rng.uniform(4, A - 4); kx, ky = (x0 + u, y0 + v) if grain == "x" else (x0 + v, y0 + u)
            d.ellipse([kx - 2, ky - 1, kx + 2, ky + 1], fill=C[0])
    for g in gaps or ():
        if grain == "x": d.line([x0 + 2, y0 + g, x1 - 2, y0 + g], fill=C[0])
        else: d.line([x0 + g, y0 + 2, x0 + g, y1 - 2], fill=C[0])


def rivet(tm, x, y, C=IRON):
    tm.d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=C[2]); tm.d.point((x - 1, y - 1), fill=C[4])


def knob(tm, x, y, C=BRASS, r=2):
    tm.d.ellipse([x - r, y - r, x + r, y + r], fill=C[2], outline=OUT); tm.d.point((x - 1, y - 1), fill=C[4])


def pillow(tm, x0, y0, x1, y1, C=WHITE):
    d = tm.d
    d.rounded_rectangle([x0, y0, x1, y1], 4, fill=C[2], outline=OUT)
    d.line([x0 + 3, y0 + 1, x1 - 3, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + 3, x0 + 1, y1 - 3], fill=C[3])
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2; d.ellipse([mx - 6, my - 3, mx + 6, my + 3], fill=C[1])
    d.line([x0 + 3, y1 - 1, x1 - 3, y1 - 1], fill=C[0])


def cloth(tm, x0, y0, x1, y1, C, folds="y", n=3, rng=None, pattern=None):
    """A blanket, quilt or cloth lying over something: soft edge, fold lines, an optional pattern."""
    d = tm.d; rng = rng or np.random.default_rng(x0 + 7 * y0)
    d.rounded_rectangle([x0, y0, x1, y1], 3, fill=C[2], outline=OUT)
    if pattern == "check":
        s = 7
        for gx in range(x0 + 2, x1 - 1, s * 2): d.rectangle([gx, y0 + 2, min(x1 - 2, gx + s - 1), y1 - 2], fill=C[3])
        for gy in range(y0 + 2, y1 - 1, s * 2):
            for gx in range(x0 + 2, x1 - 1, s * 2): d.rectangle([gx, gy, min(x1 - 2, gx + s - 1), min(y1 - 2, gy + s - 1)], fill=WHITE[3])
    elif pattern == "patch":
        cols = [WOOL_RED, WOOL_BLUE, LINEN, WOOL_GREEN, PAINT_RED, WOOL_BROWN]; s = 11
        for i, gy in enumerate(range(y0 + 2, y1 - 2, s)):
            for j, gx in enumerate(range(x0 + 2, x1 - 2, s)):
                c = cols[(i * 2 + j * 3) % len(cols)]; d.rectangle([gx, gy, min(x1 - 2, gx + s - 2), min(y1 - 2, gy + s - 2)], fill=c[2 + (i + j) % 2])
    elif pattern == "flowers":
        for _ in range(int((x1 - x0) * (y1 - y0) / 70)):
            px_, py_ = rng.uniform(x0 + 4, x1 - 4), rng.uniform(y0 + 4, y1 - 4); c = (PAINT_RED, BRASS, WHITE)[int(rng.integers(0, 3))]
            d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=c[3]); d.point((px_, py_), fill=BRASS[4])
    elif pattern == "stripe":
        for gy in range(y0 + 5, y1 - 2, 8): d.line([x0 + 2, gy, x1 - 2, gy], fill=C[0]); d.line([x0 + 2, gy + 1, x1 - 2, gy + 1], fill=C[3])
    for k in range(n):                                                         # soft folds
        if folds == "y":
            fx = x0 + (x1 - x0) * (k + 1) / (n + 1) + rng.uniform(-3, 3); d.line([fx, y0 + 4, fx + rng.uniform(-3, 3), y1 - 3], fill=C[1])
            d.line([fx + 1, y0 + 4, fx + 1 + rng.uniform(-3, 3), y1 - 3], fill=C[3])
        else:
            fy = y0 + (y1 - y0) * (k + 1) / (n + 1) + rng.uniform(-3, 3); d.line([x0 + 4, fy, x1 - 3, fy + rng.uniform(-3, 3)], fill=C[1])
    d.line([x0 + 3, y0 + 1, x1 - 3, y0 + 1], fill=C[4])


def box_px(x, y, w, h, inset=0):
    return P(x) + inset, P(y) + inset, P(x + w) - inset, P(y + h) - inset
