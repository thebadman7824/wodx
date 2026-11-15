"""Kitchen, hearth and seating pieces drawn for the library, one look for each age (B6342). Same rules as house.py:
footprint in squares, front toward the south, v["age"] picks the look, nothing drawn past the footprint."""
import math

from px import OUT
from library.art import (tone, slab, rivet, knob, cloth, box_px, OAK, DEAL, WALNUT, PAINT_RED, PAINT_BLUE, PAINT_GREEN, IRON, BRASS,
                         STEEL, WHITE, LINEN, WOOL_RED, WOOL_BLUE, WOOL_BROWN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW, ramp)

STONE = ramp((150, 146, 138), 18, (0, 0, 4))
BRICK = ramp((150, 80, 60), 18)
CLAY = ramp((176, 104, 66), 18)
SLATE = ramp((70, 74, 82), 14, (0, 2, 6))
CREAM = ramp((226, 214, 178), 10)
TILE_GREEN = ramp((66, 112, 96), 16)


def _crock(d, x, y, r, C):
    d.ellipse([x - r, y - r, x + r, y + r], fill=C[2], outline=OUT); d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], fill=C[0]); d.point((x - r + 2, y - r + 2), fill=C[4])


def _plate(d, x, y, r, C=WHITE, rim=PAINT_BLUE):
    d.ellipse([x - r, y - r, x + r, y + r], fill=C[3], outline=OUT); d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], outline=rim[2]); d.point((x - 1, y - 1), fill=C[4])


# ---------------------------------------------------------------- seats
def bench(tm, x, y, w, h, st, v):
    """A bench from above. medieval: a split plank on stake legs whose ends poke through; early: a joined form with a
    moulded edge; 1800s: a settle with a high back along the north edge; 1900s: a painted kitchen bench; modern: a
    slatted bench on steel legs; future: a moulded bench with a lit strip."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); rng = tm.rng
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56)
    if age == "medieval":
        slab(tm, X0, Y0 + 1, X1, Y1 - 1, OAK, "x", knots=2, rng=rng)
        d.line([X0 + 2, Y1 - 3, X1 - 2, Y1 - 3], fill=OAK[0])                                          # the split's rough edge
        for lx in (X0 + 8, X1 - 10):
            for ly in (Y0 + 4, Y1 - 6): d.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=OAK[0], outline=OUT); d.point((lx - 1, ly - 1), fill=OAK[3])
    elif age == "early modern":
        slab(tm, X0, Y0, X1, Y1, WALNUT, "x", rng=rng); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=WALNUT[3]); d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=WALNUT[0])
        for lx in (X0 + 1, X1 - 5): d.rectangle([lx, Y0 + 1, lx + 4, Y1 - 1], fill=WALNUT[1], outline=OUT)
    elif age == "1800s":
        bk = max(6, (Y1 - Y0) // 3)
        slab(tm, X0, Y0 + bk, X1, Y1, OAK, "x", rng=rng)
        d.rectangle([X0, Y0, X1, Y0 + bk], fill=OAK[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=OAK[4])   # the settle's high back
        for k in range(X0 + 12, X1 - 6, 12): d.line([k, Y0 + 2, k, Y0 + bk - 1], fill=OAK[1])
        for ax in (X0, X1 - 5): d.rectangle([ax, Y0 + bk, ax + 5, Y1], fill=OAK[3], outline=OUT)
        cloth(tm, X0 + 8, Y0 + bk + 2, X0 + 8 + (X1 - X0) // 3, Y1 - 2, WOOL_RED, folds="x", n=1, rng=rng)        # a cushion
    elif age == "1900s":
        d.rectangle([X0, Y0, X1, Y1], fill=PAINT_GREEN[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=PAINT_GREEN[4]); d.line([X0 + 1, Y1 - 1, X1 - 1, Y1 - 1], fill=PAINT_GREEN[0])
        for k in range(X0 + 20, X1 - 10, 40): d.line([k, Y0 + 2, k, Y1 - 2], fill=PAINT_GREEN[1])                   # the board joints
        for lx in (X0 + 6, X1 - 6): d.point((lx, (Y0 + Y1) // 2), fill=IRON[4])
    elif age == "modern":
        n = 3; sh = (Y1 - Y0) / n
        for i in range(n): d.rectangle([X0, Y0 + i * sh, X1, Y0 + (i + 1) * sh - 2], fill=DEAL[3 - i % 2], outline=OUT)
        for lx in (X0 + 10, X1 - 12): d.rectangle([lx, Y0 - 1, lx + 2, Y1 + 1], fill=STEEL[2])
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 5, fill=COMPOSITE[2], outline=OUT); d.line([X0 + 6, Y1 - 2, X1 - 6, Y1 - 2], fill=GLOW[1])


def stool(tm, x, y, w, h, st, v):
    """A stool from above: a round seat with the legs splayed past it. medieval: three stake legs through a rough
    round; early: a joint stool, square with turned legs at the corners; 1800s: a milking stool, round with three
    legs; 1900s: a kitchen stool, painted; modern: a bar stool, steel ring and a black seat; future: a lit pod."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 3
    tm.shade((cx - r + 3, cy - r + 4, cx + r + 4, cy + r + 4), f=.56, kind="ellipse")
    if age in ("medieval", "1800s"):
        C = OAK if age == "medieval" else WALNUT
        for a in (90, 210, 330):                                                                             # legs splayed past the seat
            ra = math.radians(a); lx, ly = cx + math.cos(ra) * (r + 2), cy + math.sin(ra) * (r + 2); d.ellipse([lx - 3, ly - 3, lx + 3, ly + 3], fill=C[0], outline=OUT)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 270, fill=C[4])
        for a in (90, 210, 330): ra = math.radians(a); d.ellipse([cx + math.cos(ra) * r * .55 - 2, cy + math.sin(ra) * r * .55 - 2, cx + math.cos(ra) * r * .55 + 2, cy + math.sin(ra) * r * .55 + 2], fill=C[0])
        d.line([cx - r + 4, cy, cx + r - 4, cy - 2], fill=C[1])
    elif age == "early modern":
        slab(tm, cx - r, cy - r, cx + r, cy + r, WALNUT, "x", rng=tm.rng)
        for lx, ly in ((cx - r, cy - r), (cx + r - 4, cy - r), (cx - r, cy + r - 4), (cx + r - 4, cy + r - 4)): d.rectangle([lx, ly, lx + 4, ly + 4], fill=WALNUT[0], outline=OUT)
    elif age == "1900s":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=PAINT_BLUE[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 270, fill=PAINT_BLUE[4])
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=PAINT_BLUE[1])
    elif age == "modern":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=STEEL[3], width=2)
        d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=PLASTIC_GREY[0], outline=OUT); d.arc([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], 190, 260, fill=PLASTIC_GREY[3])
    else:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=COMPOSITE[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=GLOW[1])


# ---------------------------------------------------------------- shelves and dressers
GOODS = {
    "medieval": ("crock", "loaf", "jug", "bowl", "crock", "cheese"),
    "early modern": ("plate", "jug", "crock", "loaf", "plate", "candle"),
    "1800s": ("jar", "plate", "jug", "jar", "tin", "candle"),
    "1900s": ("tin", "jar", "tin", "plate", "jar", "tin"),
    "modern": ("box", "jar", "box", "tin", "plant", "box"),
    "Future Darkness": ("cell", "box", "cell", "box", "cell", "box"),
}


def _good(d, k, x, y, s):
    """One thing on a shelf seen from above, s pixels across, centred at x, y."""
    r = s // 2
    if k == "crock": _crock(d, x, y, r, CLAY)
    elif k == "jug": _crock(d, x, y, r - 1, CREAM); d.line([x + r - 2, y, x + r + 2, y], fill=CREAM[1], width=2)
    elif k == "bowl": d.ellipse([x - r, y - r + 2, x + r, y + r - 2], fill=WALNUT[2], outline=OUT); d.ellipse([x - r + 3, y - r + 4, x + r - 3, y + r - 4], fill=CREAM[2])
    elif k == "loaf": d.ellipse([x - r, y - r + 3, x + r, y + r - 3], fill=CLAY[3], outline=OUT); d.line([x - 2, y - 2, x + 2, y + 2], fill=CLAY[1]); d.line([x + 1, y - 3, x + 4, y], fill=CLAY[1])
    elif k == "cheese": d.ellipse([x - r, y - r, x + r, y + r], fill=(222, 186, 80), outline=OUT); d.pieslice([x - r, y - r, x + r, y + r], 300, 340, fill=(246, 222, 130))
    elif k == "plate": _plate(d, x, y, r)
    elif k == "candle": d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=BRASS[2], outline=OUT); d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=WHITE[4])
    elif k == "jar": d.rectangle([x - r + 1, y - r + 1, x + r - 1, y + r - 1], fill=(120, 150, 150), outline=OUT); d.rectangle([x - r + 3, y - r + 3, x + r - 3, y + r - 3], fill=PAINT_RED[2])
    elif k == "tin": d.ellipse([x - r + 1, y - r + 1, x + r - 1, y + r - 1], fill=STEEL[2], outline=OUT); d.ellipse([x - r + 3, y - r + 3, x + r - 3, y + r - 3], outline=STEEL[4])
    elif k == "box": d.rectangle([x - r, y - r + 1, x + r, y + r - 1], fill=(PAINT_RED, PAINT_BLUE, CREAM)[(x // 7) % 3][3], outline=OUT); d.line([x - r + 1, y - r + 2, x + r - 1, y - r + 2], fill=WHITE[4])
    elif k == "plant": d.ellipse([x - r, y - r, x + r, y + r], fill=(60, 120, 60), outline=OUT); d.ellipse([x - 2, y - 3, x + 3, y + 2], fill=(110, 170, 90))
    elif k == "cell": d.rectangle([x - r + 1, y - r + 1, x + r - 1, y + r - 1], fill=COMPOSITE[1], outline=GLOW[1])


def shelf(tm, x, y, w, h, st, v):
    """A wall shelf seen from above: a board standing off the wall on brackets, the things kept on it in a row along
    its front. Each age has its board and its goods (crocks and loaves; pewter and jugs; jars and tins; packets;
    sealed cells). A variant may name the goods."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2)
    C = {"medieval": OAK, "early modern": WALNUT, "1800s": DEAL, "1900s": PAINT_GREEN, "modern": PLASTIC_WHITE, "Future Darkness": COMPOSITE}[age]
    tm.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 3), f=.6)
    slab(tm, X0, Y0, X1, Y1, C, "x", rng=tm.rng)
    for bx in (X0 + 6, X1 - 8): d.rectangle([bx, Y0, bx + 2, Y0 + 4], fill=IRON[2] if age != "Future Darkness" else GLOW[1])
    goods = v.get("goods") or GOODS[age]; s = min(16, Y1 - Y0 - 4); n = max(2, int((X1 - X0 - 6) / (s + 3)))
    for i in range(n):
        gx = X0 + 4 + s // 2 + i * (X1 - X0 - 8 - s) / max(1, n - 1); _good(d, goods[i % len(goods)], int(gx), (Y0 + Y1) // 2, s)


def dresser(tm, x, y, w, h, st, v):
    """A dresser against the wall: plates stood up on its back rack along the wall, its worktop toward the room with a
    jug and a bowl on it, drawer knobs on its front edge. early: oak with pewter; 1800s: painted pine with blue and
    white plates; 1900s: a cream kitchen cabinet with glass doors above; modern: fitted kitchen units, a worktop with
    a kettle; future: a sealed wall unit with a lit panel."""
    d = tm.d; age = v.get("age", "early modern"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); rng = tm.rng
    C = {"early modern": OAK, "1800s": PAINT_BLUE, "1900s": CREAM, "modern": PLASTIC_WHITE, "Future Darkness": COMPOSITE}[age]
    tm.shade((X0 + 4, Y0 + 6, X1 + 7, Y1 + 6), f=.52)
    rk = (Y1 - Y0) * 2 // 5
    if age == "modern":
        slab(tm, X0, Y0, X1, Y1, ramp((120, 116, 110), 12), "x", rng=rng)                                      # the worktop
        d.rectangle([X0 + 8, Y0 + 4, X0 + 22, Y0 + 16], fill=STEEL[3], outline=OUT); d.line([X0 + 22, Y0 + 8, X0 + 26, Y0 + 8], fill=STEEL[1], width=2)   # a kettle
        _good(d, "plant", X1 - 16, Y0 + 12, 14); _good(d, "box", X0 + 40, Y0 + 10, 12)
        for k in range(X0 + 2, X1 - 2, 28): d.line([k, Y1 - 2, k + 26, Y1 - 2], fill=PLASTIC_WHITE[4]); d.rectangle([k + 10, Y1 - 4, k + 16, Y1 - 3], fill=STEEL[2])
        return
    if age == "Future Darkness":
        d.rectangle([X0, Y0, X1, Y1], fill=COMPOSITE[2], outline=OUT); d.rectangle([X0 + (X1 - X0) // 3, Y0 + 4, X1 - (X1 - X0) // 3, Y0 + rk], fill=GLOW[0], outline=GLOW[1])
        d.line([X0 + 4, Y1 - 3, X1 - 4, Y1 - 3], fill=GLOW[1]); return
    d.rectangle([X0, Y0, X1, Y0 + rk], fill=C[1], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[3])   # the rack's top board
    pr = (rk - 4) // 2
    if age == "1900s":
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + rk - 3], fill=(150, 176, 186), outline=C[0])                       # glass doors over the cups
        d.line([(X0 + X1) // 2, Y0 + 3, (X0 + X1) // 2, Y0 + rk - 3], fill=C[0]); d.line([X0 + 6, Y0 + 5, X0 + 12, Y0 + rk - 5], fill=WHITE[4])
    else:
        for px_ in range(X0 + 4 + pr, X1 - pr - 2, 2 * pr + 2):                                                  # plates stood up along the wall
            _plate(d, px_, Y0 + rk // 2, pr, STEEL if age == "early modern" else WHITE, STEEL if age == "early modern" else PAINT_BLUE)
    slab(tm, X0, Y0 + rk, X1, Y1, C, "x", rng=rng)                                                            # the worktop
    _good(d, "jug", X0 + 14, Y0 + rk + (Y1 - Y0 - rk) // 2, 14); _good(d, "bowl", X1 - 18, Y0 + rk + (Y1 - Y0 - rk) // 2, 16)
    for k in range(X0 + (X1 - X0) // 6, X1 - 4, (X1 - X0) // 3): knob(tm, k, Y1 - 3, BRASS, 2)


# ---------------------------------------------------------------- fires and cooking
def _fire(tm, cx, cy, w, h, glow=170):
    tm.fire(int(cx), int(cy), int(w), int(h), seed=int(tm.rng.integers(0, 99))); tm.hearths = getattr(tm, "hearths", []) + [(int(cx), int(cy), glow, None)]


def fireplace(tm, x, y, w, h, st, v):
    """A fireplace built against the wall, its fire burning in the back of the hearth with the stone or tiles round
    it, the hearthstone stepping out toward the room. medieval: a stone hood over a raised hearth with firedogs;
    early: a wide brick hearth with a crane holding a pot over the fire; 1800s: an iron grate with a brass fender;
    1900s: a tiled surround with a small coal grate and a scuttle; modern: a wood-burning stove on a slate hearth;
    future: a heat panel with a lit grille. Lit: the fire throws light on the floor in front."""
    d = tm.d; age = v.get("age", "medieval"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx = (X0 + X1) // 2; W_ = X1 - X0; H_ = Y1 - Y0
    lit = st != "out"
    if age in ("medieval", "early modern"):
        C = STONE if age == "medieval" else BRICK
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)                                                    # the hearth floor
        for k in range(Y0 + 10, Y1 - 2, 10): d.line([X0 + 2, k, X1 - 2, k], fill=C[1])
        for k in range(X0 + 14, X1 - 2, 14): d.line([k, Y0 + 2, k, Y1 - 2], fill=C[1])
        d.rectangle([X0, Y0, X1, Y0 + H_ // 3], fill=C[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])   # the hood or chimney breast
        for jx in (X0, X1 - W_ // 6): d.rectangle([jx, Y0, jx + W_ // 6, Y1 - H_ // 5], fill=C[3], outline=OUT)   # the cheeks
        bx0, by0, bx1, by1 = X0 + W_ // 6 + 2, Y0 + H_ // 3, X1 - W_ // 6 - 2, Y1 - H_ // 5
        d.rectangle([bx0, by0, bx1, by1], fill=(36, 30, 28)); d.ellipse([cx - W_ // 6, (by0 + by1) // 2 - 6, cx + W_ // 6, (by0 + by1) // 2 + 6], fill=(70, 64, 62))   # ash
        for fx in (cx - W_ // 6, cx + W_ // 6 - 4): d.rectangle([fx, by0 + 3, fx + 4, by1 - 2], fill=IRON[2], outline=OUT)   # firedogs
        if lit: _fire(tm, cx, (by0 + by1) // 2, W_ // 4, (by1 - by0) // 2)
        if age == "early modern":
            d.line([bx0 + 2, by0 + 4, cx + 4, by0 + 4], fill=IRON[1], width=3)                                      # the crane and its pot
            d.ellipse([cx - 9, by0 + 3, cx + 9, by0 + 18], fill=IRON[1], outline=OUT); d.ellipse([cx - 6, by0 + 6, cx + 6, by0 + 14], fill=(110, 80, 50))
    elif age == "1800s":
        d.rectangle([X0, Y0, X1, Y0 + H_ * 2 // 3], fill=STONE[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=STONE[4])   # the mantel
        d.rectangle([X0 + W_ // 4, Y0 + H_ // 4, X1 - W_ // 4, Y0 + H_ * 2 // 3], fill=(36, 30, 28), outline=OUT)
        d.rectangle([X0 + 4, Y0 + H_ * 2 // 3, X1 - 4, Y1], fill=STONE[2], outline=OUT)                           # the hearthstone
        gx0, gx1 = X0 + W_ // 4 + 4, X1 - W_ // 4 - 4; gy = Y0 + H_ // 2
        if lit: _fire(tm, cx, gy, (gx1 - gx0) // 2, H_ // 6, 140)
        for k in range(gx0, gx1, 4): d.line([k, gy - 6, k, gy + 8], fill=IRON[1])                                 # the grate bars
        d.line([X0 + 8, Y1 - 4, X1 - 8, Y1 - 4], fill=BRASS[3], width=2); d.line([X0 + 8, Y0 + H_ * 2 // 3 + 4, X0 + 8, Y1 - 4], fill=BRASS[3], width=2); d.line([X1 - 8, Y0 + H_ * 2 // 3 + 4, X1 - 8, Y1 - 4], fill=BRASS[3], width=2)
        _good(d, "candle", X0 + 10, Y0 + 6, 6); _good(d, "candle", X1 - 10, Y0 + 6, 6)
    elif age == "1900s":
        d.rectangle([X0, Y0, X1, Y0 + H_ * 2 // 3], fill=TILE_GREEN[2], outline=OUT)
        for k in range(X0 + 8, X1, 8): d.line([k, Y0 + 2, k, Y0 + H_ * 2 // 3 - 2], fill=TILE_GREEN[1])
        d.rectangle([X0, Y0, X1, Y0 + 6], fill=WALNUT[3], outline=OUT)                                          # the shelf on top
        d.rectangle([cx - W_ // 6, Y0 + H_ // 3, cx + W_ // 6, Y0 + H_ * 2 // 3], fill=(36, 30, 28), outline=OUT)
        if lit: _fire(tm, cx, Y0 + H_ // 2, W_ // 8, H_ // 8, 120)
        d.rectangle([X0 + 4, Y0 + H_ * 2 // 3, X1 - 4, Y1], fill=TILE_GREEN[3], outline=OUT)
        d.ellipse([X1 - 22, Y1 - 18, X1 - 6, Y1 - 3], fill=IRON[2], outline=OUT); d.ellipse([X1 - 19, Y1 - 15, X1 - 9, Y1 - 6], fill=(30, 30, 34))   # the coal scuttle
    elif age == "modern":
        d.rectangle([X0, Y0, X1, Y1], fill=SLATE[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=SLATE[4])
        sx0, sx1, sy0, sy1 = cx - W_ // 4, cx + W_ // 4, Y0 + 4, Y0 + H_ * 3 // 5
        d.rectangle([sx0, sy0, sx1, sy1], fill=IRON[1], outline=OUT); d.line([sx0 + 2, sy0 + 2, sx1 - 2, sy0 + 2], fill=IRON[4])   # the stove
        d.ellipse([cx - 5, sy0 + 4, cx + 5, sy0 + 14], fill=IRON[0], outline=IRON[3])                             # its flue
        d.rectangle([sx0 + 4, sy1 - 10, sx1 - 4, sy1 - 2], fill=(255, 170, 70) if lit else (40, 34, 32), outline=OUT)   # the glass door
        if lit: tm.hearths = getattr(tm, "hearths", []) + [(cx, sy1, 110, None)]
        d.rectangle([X1 - 18, Y1 - 22, X1 - 4, Y1 - 4], fill=WALNUT[2], outline=OUT); d.line([X1 - 16, Y1 - 13, X1 - 6, Y1 - 13], fill=WALNUT[0])   # a log basket
    else:
        d.rectangle([X0, Y0, X1, Y0 + H_ // 2], fill=COMPOSITE[2], outline=OUT)
        for k in range(X0 + 6, X1 - 4, 5): d.line([k, Y0 + 6, k, Y0 + H_ // 2 - 4], fill=(GLOW[1] if lit else COMPOSITE[0]))
        if lit: tm.hearths = getattr(tm, "hearths", []) + [(cx, Y0 + H_ // 2, 100, None)]


def cooker(tm, x, y, w, h, st, v):
    """A kitchen range against the wall, its hot plates or rings on top, its oven door and handles along the front
    edge. 1800s: a black cast-iron range with round lids, a brass rail and the fire glowing through its grate; 1900s: a
    cream enamel gas cooker with four burners; modern: a white electric cooker with four black rings and knobs;
    future: a dark induction top with lit rings."""
    d = tm.d; age = v.get("age", "1800s"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0
    tm.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 5), f=.5)
    C = {"1800s": IRON, "1900s": CREAM, "modern": PLASTIC_WHITE, "Future Darkness": COMPOSITE}[age]
    d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
    rr = min(W_ // 5, H_ // 4)
    spots = [(X0 + W_ // 4, Y0 + H_ // 3), (X1 - W_ // 4, Y0 + H_ // 3), (X0 + W_ // 4, Y0 + H_ * 2 // 3 - 2), (X1 - W_ // 4, Y0 + H_ * 2 // 3 - 2)]
    if age == "1800s":
        d.rectangle([X0, Y0, X1, Y0 + 6], fill=IRON[3], outline=OUT)                                            # the flue back
        for sx, sy in spots[:2]: d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=IRON[1], outline=OUT); d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=IRON[3])
        d.rectangle([X0 + W_ // 3, Y0 + H_ * 3 // 5, X1 - W_ // 3, Y1 - 6], fill=(255, 140, 50), outline=OUT)       # the fire behind its bars
        for k in range(X0 + W_ // 3 + 3, X1 - W_ // 3, 4): d.line([k, Y0 + H_ * 3 // 5, k, Y1 - 6], fill=IRON[0])
        d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=BRASS[3], width=2)
        tm.hearths = getattr(tm, "hearths", []) + [((X0 + X1) // 2, Y1 - 6, 110, None)]
    elif age == "1900s":
        for sx, sy in spots: d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=IRON[1], outline=OUT); d.ellipse([sx - rr + 3, sy - rr + 3, sx + rr - 3, sy + rr - 3], outline=IRON[3])
        for k in range(4): knob(tm, X0 + W_ * (k + 1) // 5, Y1 - 3, IRON, 2)
    elif age == "modern":
        for sx, sy in spots: d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=(24, 24, 28), outline=OUT); d.ellipse([sx - rr + 3, sy - rr + 3, sx + rr - 3, sy + rr - 3], outline=(60, 60, 66))
        for k in range(4): knob(tm, X0 + W_ * (k + 1) // 5, Y1 - 3, STEEL, 2)
    else:
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=(20, 22, 28))
        for sx, sy in spots: d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], outline=GLOW[1] if st != "out" else COMPOSITE[3])


def sink(tm, x, y, w, h, st, v):
    """A sink against the wall: its basin toward the room, the drain dark at the bottom, the water source on the wall
    side. 1800s: a shallow stone sink with an iron hand pump; 1900s: a deep white glazed sink on a wooden draining
    board with two brass taps; modern: a steel sink set in a counter with a mixer tap; future: a dark basin with a
    sensor spout."""
    d = tm.d; age = v.get("age", "1800s"); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.55)
    if age == "1800s":
        d.rectangle([X0, Y0, X1, Y1], fill=STONE[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=STONE[4])
        d.rectangle([X0 + 5, Y0 + 10, X1 - 5, Y1 - 4], fill=STONE[1], outline=STONE[0]); d.ellipse([X1 - 16, Y1 - 12, X1 - 10, Y1 - 6], fill=(30, 28, 30))
        d.rectangle([X0 + 6, Y0, X0 + 16, Y0 + 10], fill=IRON[2], outline=OUT); d.line([X0 + 11, Y0 + 10, X0 + 11, Y0 + 16], fill=IRON[1], width=3)   # the pump and its spout
        d.line([X0 + 16, Y0 + 4, X0 + 34, Y0 + 2], fill=IRON[3], width=3)                                         # its handle
    elif age == "1900s":
        bw = W_ * 3 // 5
        slab(tm, X0 + bw, Y0 + 4, X1, Y1, DEAL, "y", rng=tm.rng)                                                  # the draining board, fluted
        for k in range(X0 + bw + 5, X1 - 3, 5): d.line([k, Y0 + 8, k, Y1 - 4], fill=DEAL[1])
        d.rectangle([X0, Y0 + 2, X0 + bw, Y1], fill=WHITE[3], outline=OUT); d.rectangle([X0 + 5, Y0 + 9, X0 + bw - 5, Y1 - 5], fill=WHITE[1], outline=WHITE[0])
        d.ellipse([X0 + bw // 2 - 3, Y1 - 13, X0 + bw // 2 + 3, Y1 - 7], fill=(40, 40, 44))
        for tx in (X0 + bw // 3, X0 + bw * 2 // 3): knob(tm, tx, Y0 + 4, BRASS, 3)
    elif age == "modern":
        slab(tm, X0, Y0, X1, Y1, ramp((120, 116, 110), 12), "x", rng=tm.rng)
        bx0, bx1 = X0 + W_ // 5, X1 - W_ // 5
        d.rounded_rectangle([bx0, Y0 + 7, bx1, Y1 - 5], 5, fill=STEEL[3], outline=OUT); d.rounded_rectangle([bx0 + 3, Y0 + 10, bx1 - 3, Y1 - 8], 4, fill=STEEL[1])
        d.ellipse([(bx0 + bx1) // 2 - 3, Y1 - 15, (bx0 + bx1) // 2 + 3, Y1 - 9], fill=STEEL[0])
        d.line([(bx0 + bx1) // 2, Y0 + 3, (bx0 + bx1) // 2, Y0 + 13], fill=STEEL[4], width=3); knob(tm, (bx0 + bx1) // 2, Y0 + 3, STEEL, 3)
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=COMPOSITE[2], outline=OUT); d.rounded_rectangle([X0 + 6, Y0 + 8, X1 - 6, Y1 - 5], 6, fill=(20, 22, 28))
        d.rectangle([(X0 + X1) // 2 - 4, Y0 + 2, (X0 + X1) // 2 + 4, Y0 + 6], fill=GLOW[1])
