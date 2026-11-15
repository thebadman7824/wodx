"""Household furniture drawn for the library, one look for each age (B6339-B6341). Each drawing takes the footprint in
squares (x, y, w, h) on a scratch map, front toward the south, the state and the look's options; v["age"] picks the
look. Everything stays inside the footprint; shadows fall a few pixels south-east."""
import math

import numpy as np

from px import OUT
from library.art import (P, tone, mix, ramp, shadow, slab, rivet, knob, pillow, cloth, box_px, OAK, DEAL, WALNUT, PAINT_RED, PAINT_BLUE,
                         PAINT_GREEN, IRON, BRASS, STEEL, WHITE, LINEN, TICK, WOOL_RED, WOOL_BLUE, WOOL_GREEN, WOOL_BROWN, PLASTIC_GREY,
                         PLASTIC_WHITE, COMPOSITE, GLOW, CLOTHS)

AGES = [(1197, 1449, "medieval"), (1450, 1780, "early modern"), (1781, 1918, "1800s"), (1919, 1989, "1900s"), (1990, 2029, "modern"), (2030, 2200, "Future Darkness")]


def looks(*keys, start=0):
    """Looks for the ages from `start` on: ((from, to, label, {"age": key}), ...)."""
    out = []
    for (a, b, lab), k in zip(AGES[start:], keys):
        out.append((a, b, lab, {"age": k}))
    return tuple(out)


# ---------------------------------------------------------------- tables
def table(tm, x, y, w, h, st, v):
    """A table from above. medieval: loose boards on two trestles whose feet stick out at each end; early: a joined
    walnut table with cleated ends; 1800s: a scrubbed pine kitchen table with a drawer knob; 1900s: a checked cloth
    hanging over its edges; modern: a pale veneer top with rounded corners and steel leg caps; future: a dark slab
    with a lit edge and a screen set in it."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); rng = tm.rng
    if age == "medieval":
        ty0, ty1 = Y0 + 4, Y1 - 4
        for fx in (X0 + 12, X1 - 20):                                        # the trestle feet, seen past the boards' edges
            shadow(tm, fx, Y0, fx + 9, Y1, 3); d.rectangle([fx, Y0, fx + 8, Y1], fill=WALNUT[1], outline=OUT); d.line([fx + 1, Y0 + 1, fx + 1, Y1 - 1], fill=WALNUT[3])
        shadow(tm, X0, ty0, X1, ty1, 4)
        n = 3; bh = (ty1 - ty0) / n
        for i in range(n):                                                   # three loose boards, a dark gap between each
            slab(tm, X0 + (i % 2) * 3, ty0 + i * bh, X1 - ((i + 1) % 2) * 3, ty0 + (i + 1) * bh - 2, OAK, "x", knots=1, rng=rng)
        for fx in (X0 + 16, X1 - 16):
            for i in range(n): rivet(tm, fx, int(ty0 + i * bh + bh / 2 - 1))
    elif age == "early modern":
        shadow(tm, X0, Y0, X1, Y1, 5)
        slab(tm, X0 + 12, Y0, X1 - 12, Y1, WALNUT, "x", knots=2, rng=rng, gaps=((Y1 - Y0) // 2,))
        for ex in (X0, X1 - 12):                                             # breadboard ends across the grain
            slab(tm, ex, Y0, ex + 12, Y1, WALNUT, "y", rng=rng)
        ry0, ry1 = (Y0 + Y1) // 2 - 7, (Y0 + Y1) // 2 + 7                     # a linen runner along the middle, fringed ends
        d.rectangle([X0 + 18, ry0, X1 - 18, ry1], fill=LINEN[3], outline=LINEN[0]); d.line([X0 + 20, ry0 + 3, X1 - 20, ry0 + 3], fill=LINEN[1]); d.line([X0 + 20, ry1 - 3, X1 - 20, ry1 - 3], fill=LINEN[1])
        for fy in range(ry0 + 1, ry1, 2): d.point((X0 + 16, fy), fill=LINEN[2]); d.point((X1 - 16, fy), fill=LINEN[2])
        for cx_ in (X0 + (X1 - X0) // 3, X1 - (X1 - X0) // 3):              # a pewter plate and a candlestick
            d.ellipse([cx_ - 6, Y0 + 4, cx_ + 6, Y0 + 14], fill=STEEL[1], outline=OUT); d.ellipse([cx_ - 3, Y0 + 6, cx_ + 3, Y0 + 11], fill=STEEL[3])
    elif age == "1800s":
        shadow(tm, X0, Y0, X1, Y1, 5)
        slab(tm, X0, Y0, X1, Y1, DEAL, "x", knots=3, rng=rng, gaps=((Y1 - Y0) // 3, 2 * (Y1 - Y0) // 3))
        for _ in range(int((X1 - X0) / 12)):                                 # scrub marks
            sx, sy = rng.uniform(X0 + 8, X1 - 16), rng.uniform(Y0 + 6, Y1 - 6); d.arc([sx, sy - 3, sx + 10, sy + 3], 200, 340, fill=DEAL[4])
        knob(tm, (X0 + X1) // 2, Y1 - 3, WALNUT, 3)                          # the drawer's knob on the near edge
    elif age == "1900s":
        shadow(tm, X0, Y0, X1, Y1, 5)
        slab(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, WALNUT, "x", rng=rng)
        cloth(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, PAINT_RED, folds="y", n=0, pattern="check", rng=rng)
        for cx_ in (X0 + 3, X1 - 3):                                         # the cloth's corners hanging down, folded
            for cy_ in (Y0 + 3, Y1 - 3): d.polygon([(cx_ - 3, cy_ - 3), (cx_ + 3, cy_ - 3), (cx_, cy_ + 3)], fill=PAINT_RED[1])
        d.ellipse([(X0 + X1) // 2 - 7, (Y0 + Y1) // 2 - 7, (X0 + X1) // 2 + 7, (Y0 + Y1) // 2 + 7], fill=WHITE[3], outline=OUT)   # a vase of flowers
        for a in range(0, 360, 72): r_ = math.radians(a); d.ellipse([(X0 + X1) // 2 + math.cos(r_) * 4 - 2, (Y0 + Y1) // 2 + math.sin(r_) * 4 - 2, (X0 + X1) // 2 + math.cos(r_) * 4 + 2, (Y0 + Y1) // 2 + math.sin(r_) * 4 + 2], fill=BRASS[4])
    elif age == "modern":
        shadow(tm, X0, Y0, X1, Y1, 4)
        d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=DEAL[3], outline=OUT); d.line([X0 + 6, Y0 + 1, X1 - 6, Y0 + 1], fill=DEAL[4])
        for k in range(Y0 + 6, Y1 - 4, 5): d.line([X0 + 4, k, X1 - 4, k], fill=DEAL[2])
        for cx_ in (X0 + 6, X1 - 6):
            for cy_ in (Y0 + 6, Y1 - 6): d.ellipse([cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3], fill=STEEL[3], outline=OUT)
        for mx in (X0 + (X1 - X0) // 4, X1 - (X1 - X0) // 4):                # two grey place mats
            d.rectangle([mx - 12, Y1 - 20, mx + 12, Y1 - 6], fill=PLASTIC_GREY[1], outline=PLASTIC_GREY[0])
    else:
        shadow(tm, X0, Y0, X1, Y1, 4)
        d.rounded_rectangle([X0, Y0, X1, Y1], 5, fill=COMPOSITE[1], outline=OUT); d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 4, outline=GLOW[1])
        sx0, sy0 = X0 + (X1 - X0) * .3, Y0 + 7; d.rectangle([sx0, sy0, X1 - (X1 - X0) * .3, Y1 - 7], fill=GLOW[0], outline=GLOW[1])
        for k in range(int(sy0) + 4, Y1 - 9, 5): d.line([sx0 + 4, k, sx0 + 4 + rng.uniform(6, 30), k], fill=GLOW[2])


# ---------------------------------------------------------------- beds
def bed(tm, x, y, w, h, st, v):
    """A bed, head to the wall (north), foot toward the room. medieval: a plank box with a striped straw tick, a
    bolster and a coarse wool blanket; early: a four-poster with turned posts, rails and bunched curtains; 1800s: an
    iron bedstead with barred head and foot and a patchwork quilt; 1900s: a wooden bed with a headboard, two pillows
    and a flowered eiderdown; modern: a divan with a padded headboard, a white duvet and a throw; future: a sleep pod
    with a soft-lit rim and a grey shell."""
    d = tm.d; age = v.get("age", "medieval"); C = CLOTHS.get(v.get("cloth", "red"), WOOL_RED); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); rng = tm.rng
    shadow(tm, X0, Y0, X1, Y1, 5)
    if age == "medieval":
        slab(tm, X0, Y0, X1, Y1, OAK, "y", rng=rng)
        d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=TICK[2], outline=OUT)
        for gx in range(X0 + 9, X1 - 6, 6): d.line([gx, Y0 + 7, gx, Y1 - 7], fill=TICK[0])
        d.rounded_rectangle([X0 + 8, Y0 + 8, X1 - 8, Y0 + 24], 6, fill=LINEN[2], outline=OUT); d.line([X0 + 12, Y0 + 9, X1 - 12, Y0 + 9], fill=LINEN[4])   # the bolster
        cloth(tm, X0 + 6, Y0 + int((Y1 - Y0) * .38), X1 - 6, Y1 - 6, C, folds="y", n=2, rng=rng, pattern="stripe")
        for cx_, cy_ in ((X0, Y0), (X1 - 6, Y0), (X0, Y1 - 6), (X1 - 6, Y1 - 6)): d.rectangle([cx_, cy_, cx_ + 6, cy_ + 6], fill=OAK[3], outline=OUT)
    elif age == "early modern":
        slab(tm, X0, Y0, X1, Y1, WALNUT, None)
        d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=WHITE[1], outline=OUT)
        pillow(tm, X0 + 9, Y0 + 9, X1 - 9, Y0 + 26)
        cloth(tm, X0 + 5, Y0 + int((Y1 - Y0) * .33), X1 - 5, Y1 - 5, C, folds="y", n=2, rng=rng, pattern="flowers")
        for gx in (X0, X1):                                                  # the canopy rails along the sides
            d.line([gx + (3 if gx == X0 else -3), Y0 + 3, gx + (3 if gx == X0 else -3), Y1 - 3], fill=WALNUT[0], width=3)
        d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=WALNUT[0], width=3); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=WALNUT[0], width=3)
        for cx_, cy_ in ((X0 + 4, Y0 + 4), (X1 - 4, Y0 + 4), (X0 + 4, Y1 - 4), (X1 - 4, Y1 - 4)):
            d.ellipse([cx_ - 9, cy_ - 9, cx_ + 9, cy_ + 9], fill=WOOL_RED[1] if C is not WOOL_RED else WOOL_GREEN[1], outline=OUT)   # curtains bunched at the posts
            d.arc([cx_ - 7, cy_ - 7, cx_ + 7, cy_ + 7], 180, 300, fill=WOOL_RED[3] if C is not WOOL_RED else WOOL_GREEN[3])
            d.ellipse([cx_ - 4, cy_ - 4, cx_ + 4, cy_ + 4], fill=WALNUT[3], outline=OUT); d.point((cx_ - 1, cy_ - 1), fill=WALNUT[4])
    elif age == "1800s":
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=WHITE[2], outline=OUT)
        pillow(tm, X0 + 10, Y0 + 12, X1 - 10, Y0 + 28)
        cloth(tm, X0 + 4, Y0 + int((Y1 - Y0) * .36), X1 - 4, Y1 - 4, C, folds="y", n=0, rng=rng, pattern="patch")
        for gy in (Y0, Y1 - 7):                                              # barred iron head and foot
            d.rectangle([X0, gy, X1, gy + 7], fill=IRON[1], outline=OUT); d.line([X0 + 1, gy + 1, X1 - 1, gy + 1], fill=IRON[4])
            for bx in range(X0 + 8, X1 - 4, 8): d.line([bx, gy + 2, bx, gy + 5], fill=IRON[3])
            for bx in (X0 + 2, X1 - 2): knob(tm, bx, gy + 3, BRASS, 3)
    elif age == "1900s":
        slab(tm, X0, Y0, X1, Y1, WALNUT, None)
        d.rectangle([X0, Y0, X1, Y0 + 10], fill=WALNUT[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=WALNUT[4])   # the headboard
        d.rectangle([X0 + 4, Y0 + 10, X1 - 4, Y1 - 4], fill=WHITE[2], outline=OUT)
        mw = (X1 - X0 - 12) // 2
        pillow(tm, X0 + 6, Y0 + 13, X0 + 6 + mw - 2, Y0 + 30); pillow(tm, X1 - 6 - mw + 2, Y0 + 13, X1 - 6, Y0 + 30)
        cloth(tm, X0 + 4, Y0 + int((Y1 - Y0) * .4), X1 - 4, Y1 - 4, C, folds="y", n=2, rng=rng, pattern="flowers")
    elif age == "modern":
        d.rounded_rectangle([X0, Y0, X1, Y0 + 12], 4, fill=PLASTIC_GREY[1], outline=OUT)                       # the padded headboard
        for bx in range(X0 + 6, X1 - 4, 10): d.ellipse([bx - 1, Y0 + 5, bx + 1, Y0 + 7], fill=PLASTIC_GREY[0])
        d.rounded_rectangle([X0 + 2, Y0 + 12, X1 - 2, Y1], 4, fill=PLASTIC_GREY[2], outline=OUT)
        mw = (X1 - X0 - 12) // 2
        pillow(tm, X0 + 6, Y0 + 15, X0 + 6 + mw - 2, Y0 + 31, PLASTIC_WHITE); pillow(tm, X1 - 6 - mw + 2, Y0 + 15, X1 - 6, Y0 + 31, PLASTIC_WHITE)
        cloth(tm, X0 + 4, Y0 + int((Y1 - Y0) * .38), X1 - 4, Y1 - 4, PLASTIC_WHITE, folds="y", n=2, rng=rng)
        cloth(tm, X0 + 4, Y1 - 24, X1 - 4, Y1 - 6, C, folds="x", n=1, rng=rng)                                   # a throw across the foot
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 16, fill=COMPOSITE[2], outline=OUT); d.rounded_rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], 14, outline=GLOW[1])
        d.rounded_rectangle([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], 12, fill=PLASTIC_GREY[1], outline=OUT)
        pillow(tm, X0 + 12, Y0 + 11, X1 - 12, Y0 + 26, PLASTIC_WHITE)
        cloth(tm, X0 + 8, Y0 + int((Y1 - Y0) * .42), X1 - 8, Y1 - 9, C, folds="y", n=1, rng=rng)
        d.rectangle([X0 + (X1 - X0) // 2 - 10, Y1 - 6, X0 + (X1 - X0) // 2 + 10, Y1 - 4], fill=GLOW[2])                # the panel at its foot


# ---------------------------------------------------------------- seats
def chair(tm, x, y, w, h, st, v):
    """A chair from above, its back to the north and its seat toward the front. early: a joined chair with a panelled
    back and arms; 1800s: a Windsor chair with its spindle back in an arc; 1900s: a bentwood kitchen chair; modern: a
    moulded plastic chair; future: a shell seat on one foot with a lit rim."""
    d = tm.d; age = v.get("age", "early modern"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx = (X0 + X1) // 2; rng = tm.rng
    shadow(tm, X0, Y0, X1, Y1, 4)
    if age == "early modern":
        slab(tm, X0 + 3, Y0 + 9, X1 - 3, Y1, WALNUT, "x", rng=rng)                                           # the seat
        d.rectangle([X0 + 6, Y0 + 13, X1 - 6, Y1 - 4], fill=WOOL_RED[2], outline=WOOL_RED[0])               # its cushion
        slab(tm, X0, Y0, X1, Y0 + 9, WALNUT, "x", rng=rng)                                                   # the panelled back, top rail
        for ax in (X0, X1 - 5): d.rectangle([ax, Y0 + 9, ax + 5, Y1 - 6], fill=WALNUT[3], outline=OUT)        # the arms
    elif age == "1800s":
        slab(tm, X0 + 2, Y0 + 10, X1 - 2, Y1, OAK, "x", rng=rng)
        d.ellipse([X0 + 6, Y0 + 14, X1 - 6, Y1 - 3], outline=OAK[1])                                          # the saddled seat
        d.arc([X0, Y0, X1, Y0 + 26], 180, 360, fill=OUT, width=5); d.arc([X0, Y0, X1, Y0 + 26], 185, 355, fill=OAK[3], width=3)   # the bow
        for a in np.linspace(205, 335, 6):
            r_ = math.radians(a); d.line([cx + math.cos(r_) * (X1 - X0) / 2, Y0 + 13 + math.sin(r_) * 13, cx + math.cos(r_) * (X1 - X0) / 3, Y0 + 15], fill=OAK[1], width=2)
    elif age == "1900s":
        d.ellipse([X0 + 2, Y0 + 8, X1 - 2, Y1], fill=WALNUT[2], outline=OUT); d.ellipse([X0 + 5, Y0 + 11, X1 - 5, Y1 - 3], fill=WOOL_BROWN[3], outline=WALNUT[0])   # cane seat
        for k in range(X0 + 8, X1 - 6, 4): d.line([k, Y0 + 14, k, Y1 - 5], fill=WOOL_BROWN[2])
        d.arc([X0 + 1, Y0, X1 - 1, Y0 + 24], 190, 350, fill=OUT, width=5); d.arc([X0 + 1, Y0, X1 - 1, Y0 + 24], 192, 348, fill=WALNUT[3], width=3)  # the bent back hoop
    elif age == "modern":
        for lx, ly in ((X0 + 2, Y0 + 9), (X1 - 4, Y0 + 9), (X0 + 2, Y1 - 2), (X1 - 4, Y1 - 2)): d.rectangle([lx, ly, lx + 2, ly + 2], fill=STEEL[2])   # leg tips past the seat
        d.rounded_rectangle([X0 + 4, Y0 + 9, X1 - 4, Y1 - 2], 5, fill=PLASTIC_WHITE[2], outline=OUT)                     # the seat
        d.rounded_rectangle([X0 + 7, Y0 + 13, X1 - 7, Y1 - 5], 4, fill=PLASTIC_WHITE[1])
        d.rounded_rectangle([X0 + 1, Y0, X1 - 1, Y0 + 9], 4, fill=PLASTIC_WHITE[3], outline=OUT); d.line([X0 + 5, Y0 + 2, X1 - 5, Y0 + 2], fill=PLASTIC_WHITE[4])   # the curved back
        d.line([X0 + 5, Y0 + 7, X1 - 5, Y0 + 7], fill=PLASTIC_WHITE[0])
    else:
        d.ellipse([(X0 + X1) // 2 - 4, Y1 - 10, (X0 + X1) // 2 + 4, Y1 - 2], fill=COMPOSITE[0])                            # the single foot
        d.rounded_rectangle([X0 + 3, Y0 + 9, X1 - 3, Y1 - 1], 7, fill=COMPOSITE[2], outline=OUT); d.rounded_rectangle([X0 + 6, Y0 + 12, X1 - 6, Y1 - 4], 5, fill=COMPOSITE[1])
        d.rounded_rectangle([X0, Y0, X1, Y0 + 11], 5, fill=COMPOSITE[3], outline=OUT); d.line([X0 + 4, Y0 + 9, X1 - 4, Y0 + 9], fill=GLOW[1], width=2)   # the high shell back, its lit edge
        d.line([X0 + 4, Y1 - 2, X1 - 4, Y1 - 2], fill=GLOW[1])


def armchair(tm, x, y, w, h, st, v):
    """An upholstered armchair or sofa from above: a padded back to the north, arms either side, seat cushions
    toward the front. 1800s: buttoned velvet with a carved frame; 1900s: a plump club chair; modern: a squared fabric
    sofa; future: a seamless moulded lounger. Width decides chair or sofa."""
    d = tm.d; age = v.get("age", "1800s"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); rng = tm.rng
    C = {"1800s": PAINT_RED, "1900s": WOOL_BROWN, "modern": PLASTIC_GREY, "Future Darkness": COMPOSITE}.get(age, WOOL_GREEN)
    if v.get("cloth"): C = CLOTHS.get(v["cloth"], C)
    shadow(tm, X0, Y0, X1, Y1, 5); rad = 10 if age in ("1900s", "Future Darkness") else 4
    d.rounded_rectangle([X0, Y0, X1, Y1], rad, fill=C[1], outline=OUT)
    bk = int((Y1 - Y0) * .3); aw = int(min(16, (X1 - X0) * .16))
    d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + bk], rad, fill=C[3], outline=OUT)              # the back
    for ax in (X0 + 2, X1 - 2 - aw): d.rounded_rectangle([ax, Y0 + 6, ax + aw, Y1 - 2], rad, fill=C[3], outline=OUT); d.line([ax + 2, Y0 + 8, ax + 2, Y1 - 6], fill=C[4])
    n = max(1, int((X1 - X0 - 2 * aw) / 44)); sw = (X1 - X0 - 2 * aw - 8) / n
    for i in range(n):                                                    # the seat cushions
        a0 = X0 + aw + 4 + i * sw; d.rounded_rectangle([a0 + 1, Y0 + bk + 2, a0 + sw - 1, Y1 - 5], 5, fill=C[2], outline=OUT); d.line([a0 + 4, Y0 + bk + 4, a0 + sw - 4, Y0 + bk + 4], fill=C[4])
    if age == "1800s":
        for i in range(X0 + 10, X1 - 8, 10): d.point((i, Y0 + bk // 2 + 1), fill=C[0]); d.point((i + 5, Y0 + bk // 2 - 3), fill=C[0])   # buttons
        for cx_ in (X0 + 1, X1 - 1): knob(tm, cx_, Y1 - 2, WALNUT, 3)
    if age == "Future Darkness": d.line([X0 + 10, Y1 - 3, X1 - 10, Y1 - 3], fill=GLOW[1], width=2)


# ---------------------------------------------------------------- chests and trunks
def chest(tm, x, y, w, h, st, v):
    """A chest, lock toward the front, lid hinged at the back. medieval: oak planks bound with iron straps and studs;
    early: a painted dower chest with a flower; 1800s: a travelling trunk with leather straps and brass corners; 1900s:
    a sea or army footlocker in green with steel corners; modern: a plastic storage box; future: a sealed case with a
    lit lock. Open: the lid stands up at the back and the inside shows what it keeps."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); rng = tm.rng
    paint = {"red": PAINT_RED, "blue": PAINT_BLUE, "green": PAINT_GREEN}.get(v.get("paint"), PAINT_RED)
    body = {"medieval": OAK, "early modern": paint, "1800s": WALNUT, "1900s": PAINT_GREEN, "modern": PLASTIC_GREY, "Future Darkness": COMPOSITE}[age]
    shadow(tm, X0, Y0, X1, Y1, 4)
    if st == "open":
        lid = 12                                                             # the lid stood up against the back: a thin foreshortened band
        d.rectangle([X0 - 1, Y0 - lid, X1 + 1, Y0], fill=body[1], outline=OUT); d.line([X0, Y0 - lid + 1, X1, Y0 - lid + 1], fill=body[3])
        d.rectangle([X0, Y0, X1, Y1], fill=body[2], outline=OUT)
        d.rectangle([X0 + 5, Y0 + 4, X1 - 5, Y1 - 5], fill=tone(body[0], -20), outline=OUT)
        ix0, iy0, ix1, iy1 = X0 + 7, Y0 + 6, X1 - 7, Y1 - 7; w3 = (ix1 - ix0) // 3
        goods = {"medieval": (LINEN, WOOL_RED, LINEN), "early modern": (LINEN, WOOL_BLUE, WHITE), "1800s": (WHITE, WOOL_BROWN, WOOL_BLUE),
                 "1900s": (WOOL_GREEN, LINEN, WOOL_BROWN), "modern": (PAINT_BLUE, WHITE, PAINT_RED), "Future Darkness": (STEEL, GLOW, STEEL)}[age]
        for k, col in enumerate(goods):                                      # folded things, their folds showing
            a0 = ix0 + k * w3 + 1; a1 = a0 + w3 - 2
            if col is GLOW: d.rectangle([a0, iy0, a1, iy1], fill=GLOW[0], outline=GLOW[1]); continue
            d.rectangle([a0, iy0, a1, iy1], fill=col[2], outline=OUT)
            for yy in range(iy0 + 4, iy1 - 1, 5): d.line([a0 + 1, yy, a1 - 1, yy], fill=col[1])
        if age in ("medieval", "early modern"): d.ellipse([ix1 - 12, iy1 - 9, ix1 - 3, iy1 - 1], fill=WALNUT[3], outline=OUT); d.line([ix1 - 8, iy1 - 9, ix1 - 6, iy1 - 12], fill=BRASS[3])   # a purse
        return
    if age == "medieval":
        slab(tm, X0, Y0, X1, Y1, OAK, "x", knots=2, rng=rng, gaps=((Y1 - Y0) // 2,))
        for sx in (X0 + 10, (X0 + X1) // 2 - 2, X1 - 13):                     # iron straps over the lid with studs
            d.rectangle([sx, Y0 + 1, sx + 4, Y1 - 1], fill=IRON[2], outline=OUT)
            for k in range(Y0 + 5, Y1 - 2, 7): d.point((sx + 2, k), fill=IRON[4])
        d.rectangle([(X0 + X1) // 2 - 5, Y1 - 10, (X0 + X1) // 2 + 5, Y1], fill=IRON[3], outline=OUT); d.point(((X0 + X1) // 2, Y1 - 5), fill=OUT)
    elif age == "early modern":
        d.rectangle([X0, Y0, X1, Y1], fill=paint[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=paint[4])
        d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], outline=BRASS[3])
        mx, my = (X0 + X1) // 2, (Y0 + Y1) // 2
        for a in range(0, 360, 60): r_ = math.radians(a); d.ellipse([mx + math.cos(r_) * 6 - 2, my + math.sin(r_) * 4 - 2, mx + math.cos(r_) * 6 + 2, my + math.sin(r_) * 4 + 2], fill=WHITE[3])
        d.ellipse([mx - 2, my - 2, mx + 2, my + 2], fill=BRASS[4])
        for sx in (-1, 1): d.line([mx + sx * 10, my, mx + sx * 22, my - 3], fill=PAINT_GREEN[3], width=2); d.ellipse([mx + sx * 18 - 2, my - 6, mx + sx * 18 + 2, my - 2], fill=PAINT_GREEN[3])
        d.rectangle([mx - 3, Y1 - 6, mx + 3, Y1], fill=IRON[3], outline=OUT)
    elif age == "1800s":
        d.rounded_rectangle([X0, Y0, X1, Y1], 4, fill=WALNUT[2], outline=OUT); d.line([X0 + 3, Y0 + 2, X1 - 3, Y0 + 2], fill=WALNUT[4])
        for sx in (X0 + (X1 - X0) // 4, X1 - (X1 - X0) // 4):                  # leather straps with buckles
            d.rectangle([sx - 3, Y0, sx + 3, Y1], fill=WOOL_BROWN[1], outline=OUT); d.rectangle([sx - 3, Y1 - 9, sx + 3, Y1 - 4], outline=BRASS[3])
        for cx_, cy_ in ((X0, Y0), (X1 - 6, Y0), (X0, Y1 - 6), (X1 - 6, Y1 - 6)): d.rectangle([cx_, cy_, cx_ + 6, cy_ + 6], fill=BRASS[3], outline=OUT)
        d.rectangle([(X0 + X1) // 2 - 4, Y1 - 8, (X0 + X1) // 2 + 4, Y1], fill=BRASS[2], outline=OUT)
    elif age == "1900s":
        d.rectangle([X0, Y0, X1, Y1], fill=PAINT_GREEN[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=PAINT_GREEN[4])
        d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=PAINT_GREEN[1])
        for cx_, cy_ in ((X0, Y0), (X1 - 7, Y0), (X0, Y1 - 7), (X1 - 7, Y1 - 7)): d.rectangle([cx_, cy_, cx_ + 7, cy_ + 7], fill=STEEL[2], outline=OUT)
        for hx in (X0 - 1, X1 - 3): d.rectangle([hx, (Y0 + Y1) // 2 - 6, hx + 4, (Y0 + Y1) // 2 + 6], fill=IRON[2], outline=OUT)   # handles at the ends
        d.rectangle([(X0 + X1) // 2 - 10, (Y0 + Y1) // 2 - 3, (X0 + X1) // 2 + 10, (Y0 + Y1) // 2 + 3], fill=WHITE[2])        # a stencilled name plate
        d.rectangle([(X0 + X1) // 2 - 3, Y1 - 6, (X0 + X1) // 2 + 3, Y1], fill=STEEL[3], outline=OUT)
    elif age == "modern":
        d.rounded_rectangle([X0, Y0, X1, Y1], 5, fill=PLASTIC_GREY[3], outline=OUT); d.rounded_rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], 4, outline=PLASTIC_GREY[1])
        for cx_ in (X0 + 2, X1 - 8): d.rectangle([cx_, (Y0 + Y1) // 2 - 7, cx_ + 6, (Y0 + Y1) // 2 + 7], fill=PAINT_BLUE[3], outline=OUT)   # blue clip latches
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=COMPOSITE[2], outline=OUT); d.line([X0 + 6, (Y0 + Y1) // 2, X1 - 6, (Y0 + Y1) // 2], fill=COMPOSITE[0])
        d.rectangle([(X0 + X1) // 2 - 5, Y1 - 7, (X0 + X1) // 2 + 5, Y1 - 2], fill=GLOW[1], outline=OUT)


# ---------------------------------------------------------------- cupboards and wardrobes
def cupboard(tm, x, y, w, h, st, v):
    """A cupboard or wardrobe against the wall, seen from above: its top with the cornice round it and the long
    shadow of a tall thing; the doors toward the room, shut with handles, or open: two leaves swung out with the
    shelves and what is kept on them showing between. medieval: an aumbry with iron strap hinges; early: a carved
    oak press with a heavy cornice; 1800s: a painted wardrobe; 1900s: a veneered wardrobe with a mirror door;
    modern: a white flat-pack wardrobe; future: a sliding-front locker with a lit strip."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); rng = tm.rng
    C = {"medieval": OAK, "early modern": WALNUT, "1800s": PAINT_BLUE, "1900s": WALNUT, "modern": PLASTIC_WHITE, "Future Darkness": COMPOSITE}[age]
    dd = 9 if st == "open" else 0
    tm.shade((X0 + 6, Y0 + 8, X1 + 9, Y1 - dd + 10), f=.5)                    # a tall thing's shadow, still short
    top = (X0, Y0, X1, Y1 - dd)
    if age in ("early modern", "1800s", "1900s"):
        d.rectangle([top[0] - 2, top[1], top[2] + 2, top[3]], fill=C[3], outline=OUT); d.line([top[0], top[1] + 1, top[2], top[1] + 1], fill=C[4])   # the cornice, standing proud
        slab(tm, top[0] + 4, top[1] + 4, top[2] - 4, top[3] - 4, C, "x", rng=rng)
    else:
        slab(tm, *top, C, "x", rng=rng)
    if age == "medieval":
        for sy in (Y0 + 5, Y1 - dd - 8): d.rectangle([X0 + 3, sy, X1 - 3, sy + 3], fill=IRON[2], outline=OUT)
    if age == "Future Darkness": d.line([X0 + 6, Y1 - dd - 3, X1 - 6, Y1 - dd - 3], fill=GLOW[1], width=2)
    mx = (X0 + X1) // 2
    if st != "open":
        if age == "Future Darkness": return
        for hx in (mx - 6, mx + 4): knob(tm, hx, Y1 - 3, BRASS if age != "modern" else STEEL, 2)
        d.line([mx, Y1 - 6, mx, Y1], fill=C[0])
        return
    # open: the two leaves swung out from the front corners, and the shelves' contents showing in the gap
    gy = Y1 - dd; d.rectangle([X0 + 4, gy - 8, X1 - 4, gy + 2], fill=tone(C[0], -18), outline=OUT)
    k = 0
    for gx in range(X0 + 8, X1 - 8, 9):
        col = (LINEN, WOOL_RED, WHITE, WOOL_BLUE)[k % 4]; d.rectangle([gx, gy - 6, gx + 7, gy], fill=col[3], outline=OUT); k += 1
    lw = (X1 - X0) // 2; L = min(int(lw * .55), 22)                         # each leaf stands out at an angle from its hinge, about two-fifths open
    for hx, sg in ((X0, 1), (X1, -1)):
        tip = (hx + sg * int(L * .35), gy + int(L * .94))
        d.polygon([(hx, gy), (hx + sg * 5, gy), (tip[0] + sg * 5, tip[1]), tip], fill=C[3], outline=OUT)
        d.line([hx + sg * 2, gy + 1, tip[0] + sg * 2, tip[1] - 1], fill=C[1])
        if age == "1900s": d.line([hx + sg * 3, gy + 2, tip[0] + sg * 3, tip[1] - 2], fill=STEEL[4])     # the mirror on the door
