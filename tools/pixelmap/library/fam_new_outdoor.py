"""The new outdoor objects (B6346, added from a check of the world objects another game lays out): wild things of the
bank and the wood (a beaver lodge, a burrow, reeds, water lilies, wild flowers, seaweed, a dead tree, a tumbleweed, a
cactus), the yard and the field (a heap, a midden, a stook, a fruit tree, a planter, a tarpaulin, a sunshade, a
topiary bush), stones and marks (a standing stone, a dead drop, a flagpole), the made things of streets, parks and
railways (bollards, bicycle racks, a boom barrier, a buffer stop, a crossing sign, a utility pole, a mail box, a
glasshouse, play things and sports things) and the Wyrm's blight.

Wild things are the region's own kind: the plants and soils of the place. Each era tells by what people of the age
leave round a wild thing and how they tend it (era_litter): a snare stake, a broken pot, a wicker trap, a clay pipe,
a green bottle, a shell case, a paper wrapper and can, a plastic bottle and bag, a dark shard with a lit seam. Things
that are made in factories the same the world over take `global_from=` and vary by their makes, paint, load and wear.

Drawing helpers shared with the outdoor family come from fam_outdoor.py (ctx, Body, lit_ellipse and the rest)."""
import math
import zlib

import numpy as np

from px import OUT
from library.core import define, CATALOGUE
from library.census import CENSUS
from library.art import (box_px, tone, mix, shadow, OAK, DEAL, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY,
                         PLASTIC_WHITE, COMPOSITE, GLOW, WOOL_RED, WOOL_BLUE, WOOL_GREEN, WOOL_BROWN)
from library.fam_outdoor import (ctx, Body, era_looks, poly, pshadow, eshadow, lit_ellipse, lit_rect, rp, dots, limb,
                                 crown, sector_tint, rock, BARK, ROCK, STYLE_PAINT)

# ================================================================ shared ground and wear
SOIL = {"central": (104, 82, 60), "atlantic": (88, 74, 58), "northern": (70, 60, 54), "mediterranean": (158, 104, 66),
        "islamic": (196, 166, 118), "steppe": (156, 136, 98), "southasia": (156, 86, 56), "eastasia": (128, 104, 74),
        "seasia": (134, 74, 52), "africa": (172, 86, 50), "americas": (146, 106, 70), "oceania": (180, 92, 52), "polar": (130, 130, 128)}
GRASS = {"central": (74, 108, 52), "atlantic": (66, 112, 56), "northern": (86, 106, 62), "mediterranean": (130, 132, 76),
         "islamic": (150, 140, 84), "steppe": (150, 146, 88), "southasia": (96, 120, 52), "eastasia": (80, 116, 66),
         "seasia": (60, 120, 52), "africa": (156, 138, 70), "americas": (110, 124, 64), "oceania": (150, 136, 82), "polar": (120, 124, 96)}
WATER = {"northern": (52, 62, 60), "polar": (60, 80, 100), "atlantic": (54, 80, 90), "central": (58, 86, 88),
         "mediterranean": (50, 104, 120), "islamic": (70, 104, 96), "steppe": (80, 100, 96), "southasia": (78, 98, 72),
         "eastasia": (58, 92, 90), "seasia": (60, 104, 84), "africa": (96, 96, 70), "americas": (56, 88, 84), "oceania": (50, 110, 120)}
SAND = {"central": (206, 186, 140), "atlantic": (204, 190, 150), "northern": (180, 172, 150), "mediterranean": (222, 200, 150),
        "islamic": (226, 200, 140), "steppe": (200, 180, 130), "southasia": (214, 186, 140), "eastasia": (196, 182, 150),
        "seasia": (236, 226, 196), "africa": (220, 186, 130), "americas": (214, 196, 156), "oceania": (240, 230, 204), "polar": (110, 108, 106)}


def soil(c): return SOIL.get(c.s, SOIL["central"])
def grass(c): return GRASS.get(c.s, GRASS["central"])


def era_litter(tm, c, px_, py_, q, k=0):
    """What people of the age leave beside a wild thing, so each era has its own look: a hazel snare stake and its
    loop (Dark Ages), shards of a broken pot and a bone (Long Night), a wicker basket trap (Renaissance), a white clay
    pipe and an iron gin trap (Age of Reason), a green glass bottle and a tin (Victorian), a brass shell case and a
    twist of wire (Great War), a paper wrapper and a red can (Mid-Century), a clear plastic bottle and a carrier bag
    (Modern), a dark composite shard with a lit seam in grey ash (Future Darkness)."""
    d = tm.d; e = c.e; q = max(5, q)
    if e == 0:
        d.ellipse([px_ - q, py_ - q * .7, px_ + q, py_ + q * .7], outline=OUT, width=4); d.ellipse([px_ - q + 1, py_ - q * .7 + 1, px_ + q - 1, py_ + q * .7 - 1], outline=(176, 150, 96), width=2)
        lit_ellipse(tm, px_ - q, py_, 4, 4, rp((120, 86, 56)))
    elif e == 1:
        for j, (u, w_) in enumerate(((-.6, -.3), (.2, -.5), (.4, .4), (-.3, .5))):
            poly(tm, [(px_ + u * q, py_ + w_ * q), (px_ + u * q + q * .5, py_ + w_ * q - 2), (px_ + u * q + q * .3, py_ + w_ * q + q * .4)], rp((170, 96, 66)), 2 + j % 2)
        d.line([px_ - q, py_ + q * .9, px_ + q * .6, py_ + q * .7], fill=OUT, width=5); d.line([px_ - q, py_ + q * .9, px_ + q * .6, py_ + q * .7], fill=(226, 218, 196), width=3)
    elif e == 2:
        lit_ellipse(tm, px_, py_, q * 1.1, q * .65, rp((186, 156, 92), 16))
        for j in range(-2, 3): d.line([px_ + j * q * .35, py_ - q * .55, px_ + j * q * .35, py_ + q * .55], fill=rp((186, 156, 92))[0], width=1)
        d.ellipse([px_ + q * .6, py_ - q * .25, px_ + q * 1.05, py_ + q * .25], fill=(40, 30, 24))
    elif e == 3:
        d.line([px_ - q, py_ - q * .4, px_ + q * .5, py_ + q * .1], fill=OUT, width=4); d.line([px_ - q, py_ - q * .4, px_ + q * .5, py_ + q * .1], fill=(236, 232, 222), width=2)
        lit_ellipse(tm, px_ + q * .6, py_ + q * .15, 4, 4, rp((230, 224, 210), 12))
        d.arc([px_ - q * .8, py_ + q * .1, px_ + q * .4, py_ + q * 1.0], 0, 360, fill=IRON[1], width=3)
    elif e == 4:
        poly(tm, [(px_ - q, py_ - 3), (px_ + q * .5, py_ - 4), (px_ + q * .9, py_ - 1), (px_ + q * .9, py_ + 1), (px_ + q * .5, py_ + 4), (px_ - q, py_ + 3)], rp((40, 96, 60), 22), 2)
        d.line([px_ - q + 2, py_ - 1, px_ + q * .4, py_ - 2], fill=(150, 210, 160), width=1)
        lit_rect(tm, px_ - q * .5, py_ + q * .45, px_ + q * .3, py_ + q * 1.05, rp((150, 150, 156)))
    elif e == 5:
        lit_rect(tm, px_ - q, py_ - 3, px_ + q * .6, py_ + 3, rp((200, 160, 70), 22), r=2)
        d.arc([px_ - q * .5, py_ + q * .2, px_ + q * .9, py_ + q * 1.1], 0, 330, fill=(120, 116, 110), width=2)
        d.arc([px_ - q * .2, py_ + q * .1, px_ + q * 1.1, py_ + q * 1.0], 40, 300, fill=(90, 86, 84), width=2)
    elif e == 6:
        poly(tm, [(px_ - q, py_ - q * .5), (px_, py_ - q * .8), (px_ + q * .3, py_), (px_ - q * .7, py_ + q * .3)], [(0, 0, 0), (0, 0, 0), (236, 234, 226)], 2)
        d.line([px_ - q * .8, py_ - q * .3, px_ - q * .1, py_ - q * .55], fill=(190, 60, 50), width=2)
        lit_rect(tm, px_ + q * .2, py_ + q * .2, px_ + q * 1.0, py_ + q * .7, rp((200, 40, 40), 22), r=2)
        d.line([px_ + q * .4, py_ + q * .2, px_ + q * .4, py_ + q * .7], fill=(236, 236, 236), width=2)
    elif e == 7:
        poly(tm, [(px_ - q, py_ - 3), (px_ + q * .4, py_ - 4), (px_ + q * .7, py_ - 2), (px_ + q * .7, py_ + 2), (px_ + q * .4, py_ + 4), (px_ - q, py_ + 3)], [(0, 0, 0), (120, 170, 200), (176, 214, 232)], 2)
        d.rectangle([px_ + q * .7, py_ - 2, px_ + q * .95, py_ + 2], fill=(40, 90, 200), outline=OUT)
        poly(tm, [(px_ - q * .7, py_ + q * .4), (px_ + q * .3, py_ + q * .3), (px_ + q * .6, py_ + q * 1.1), (px_ - q * .4, py_ + q * 1.2)], [(0, 0, 0), (200, 200, 196), (238, 238, 234)], 2)
        d.line([px_ - q * .4, py_ + q * .7, px_ + q * .4, py_ + q * .65], fill=(40, 70, 170), width=2)
    else:
        d.ellipse([px_ - q * 1.1, py_ - q * .8, px_ + q * 1.1, py_ + q * .8], fill=(92, 92, 98), outline=OUT)
        poly(tm, [(px_ - q * .6, py_ - q * .4), (px_ + q * .7, py_ - q * .1), (px_ - q * .1, py_ + q * .5)], rp((50, 54, 66), 14), 2)
        d.line([px_ - q * .5, py_ - q * .32, px_ + q * .55, py_ - q * .08], fill=GLOW[2], width=2)
        for j in range(3): d.rectangle([px_ + q * .3 + j * 4, py_ + q * .4, px_ + q * .3 + j * 4 + 2, py_ + q * .4 + 2], fill=GLOW[1])


def corners(X0, Y0, X1, Y1, q, n=2, salt=0):
    """Free corners in mirror pairs (south-west and south-east, then north-west and north-east), so a pair of things
    left lying sits evenly either side."""
    pts = [(X0 + q * 1.2, Y1 - q * 1.2), (X1 - q * 1.2, Y1 - q * 1.2), (X0 + q * 1.2, Y0 + q * 1.2), (X1 - q * 1.2, Y0 + q * 1.2)]
    if salt % 2: pts = pts[2:] + pts[:2]
    return pts[:n]


def litter(tm, c, X0, Y0, X1, Y1, n=2, k=.15, salt=0):
    """era_litter in the footprint's free corners."""
    q = max(6, min(18, min(X1 - X0, Y1 - Y0) * k))
    for i, (px_, py_) in enumerate(corners(X0, Y0, X1, Y1, q, n, salt)): era_litter(tm, c, px_, py_, q, i)


def blobpts(c, cx, cy, rx, ry, n=12, jag=.15):
    a0 = c.rng.uniform(0, 1)
    return [(cx + math.cos(a) * rx * c.rng.uniform(1 - jag, 1), cy + math.sin(a) * ry * c.rng.uniform(1 - jag, 1)) for a in np.linspace(0, 2 * math.pi, n, endpoint=False) + a0]


def mound(tm, c, cx, cy, rx, ry, col, jag=.15, step=18, sh=True):
    """A heap from above: a ragged outline, its body, and lighter rings stepped toward the north-west light."""
    d = tm.d; C = rp(col, step); pts = blobpts(c, cx, cy, rx, ry, 14, jag)
    if sh: pshadow(tm, pts, 4, 6, .6)
    d.polygon(pts, fill=C[1], outline=OUT)
    for t, k in ((.78, 2), (.5, 3), (.24, 4)):
        d.polygon([(cx + (x - cx) * t - rx * (1 - t) * .28, cy + (y - cy) * t - ry * (1 - t) * .3) for x, y in pts], fill=C[k])
    return pts


def scatter(tm, c, cx, cy, rx, ry, cols, n, sz=(3, 5), ang=None, kind="leaf"):
    """Many small pieces over an oval (leaves, straw, shells): each a short cluster in one of cols, never a lone pixel."""
    d = tm.d
    for _ in range(n):
        a, t = c.rng.uniform(0, 2 * math.pi), math.sqrt(c.rng.uniform(0, 1))
        x, y = cx + math.cos(a) * rx * t, cy + math.sin(a) * ry * t; s = c.rng.uniform(*sz); col = cols[int(c.rng.integers(0, len(cols)))]
        if kind == "leaf": d.ellipse([x - s, y - s * .6, x + s, y + s * .6], fill=col, outline=tone(col, -50))
        elif kind == "stick":
            b = ang if ang is not None else c.rng.uniform(0, math.pi); d.line([x - math.cos(b) * s, y - math.sin(b) * s, x + math.cos(b) * s, y + math.sin(b) * s], fill=col, width=2)
        else: d.rectangle([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=col)


def water(tm, c, X0, Y0, X1, Y1, r=None, col=None, ice=False, out=None):
    """Open water from above: a body of the region's water with one-pixel wavy lines and a few glints."""
    d = tm.d; W_ = rp(col or WATER.get(c.s, WATER["central"]), 16)
    if ice: W_ = rp((196, 206, 214), 12)
    r = int(r if r is not None else min(X1 - X0, Y1 - Y0) * .3)
    d.rounded_rectangle([X0, Y0, X1, Y1], r, fill=W_[2], outline=out or tone(W_[0], -20))
    for k in range(int((Y1 - Y0) / 14)):
        yy = Y0 + 8 + k * 14 + c.rng.uniform(-3, 3); xs = X0 + c.rng.uniform(6, (X1 - X0) * .4); L_ = c.rng.uniform(12, 30)
        if ice: d.line([xs, yy, xs + L_, yy + 4], fill=W_[4], width=1); continue
        d.line([xs, yy, xs + L_ * .5, yy - 2, xs + L_, yy], fill=W_[3], width=1)
    return W_


def _row(oid):
    return next((r for r in CENSUS if r.id == oid), None)


def clipped(draw):
    """The drawing kept to its footprint: anything that strays past it (a stray stick, a long frond) is wiped, leaving
    room only for the short shadow south-east."""
    def f(tm, x, y, w, h, st, v):
        a0 = np.asarray(tm.img).copy()
        draw(tm, x, y, w, h, st, v)
        X0, Y0, X1, Y1 = box_px(x, y, w, h, 0)
        a1 = np.asarray(tm.img).copy(); keep = np.zeros(a1.shape[:2], bool)
        keep[max(0, Y0 - 2):Y1 + 3, max(0, X0 - 2):X1 + 3] = True
        a1[~keep] = a0[~keep]
        from PIL import Image
        tm.img.paste(Image.fromarray(a1), (0, 0))
    f.__doc__ = draw.__doc__; f.__name__ = draw.__name__
    return f


def _def(oid, draw, axes=None, **kw):
    """Define one object with a look for each era it spans, its rooms from the census and a size reference."""
    draw = clipped(draw)
    row = _row(oid)
    ya, _, yb = row.years.partition("-"); a, b = int(ya) if ya else 1197, int(yb) if yb else 2200
    kw.setdefault("looks", era_looks(a, b))
    if oid not in CATALOGUE: kw.setdefault("tags", tuple(t.split()[0] for t in row.where.split(",")))
    return define(oid, draw=draw, axes=axes or {}, **kw)


# ================================================================ wild things of the bank and the wood
LODGEWOOD = {"central": (112, 92, 64), "atlantic": (96, 74, 58), "northern": (206, 200, 190), "americas": (176, 170, 146), "polar": (128, 106, 84)}


def beaverlodge(tm, x, y, w, h, st, v):
    """A beaver lodge from above: a dome of gnawed sticks and plastered mud standing in its pond, the pale peeled sticks
    showing, a feed pile of leafy branches sunk in the water beside it and a pencil-gnawed stump on the bank. The wood
    is the region's: willow in Central Europe, alder in the west, white birch in the north, aspen in the Americas,
    willow scrub on the tundra. A big old colony (high wealth) has a broad lodge and a big feed pile. Water: open,
    autumn (fresh mud and a heaped feed pile) or iced (snow on the dome, the vent open)."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    wat = v.get("water", "open"); ice = wat == "ice"
    water(tm, c, X0, Y0, X1, Y1, R_ * .6, ice=ice)
    wood = rp(LODGEWOOD.get(c.s, LODGEWOOD["central"]), 18); peel = rp((222, 204, 160), 14); mud = rp(mix(soil(c), (60, 50, 40), .3), 14)
    lx, ly = cx - R_ * .12, cy - R_ * .1; rl = R_ * (.5 + .05 * c.w)
    eshadow(tm, lx, ly, rl, rl * .9, 5, 7, .55)
    lit_ellipse(tm, lx, ly, rl, rl * .9, mud)
    n = int(rl * .9)
    for k in range(n):
        a, t = c.rng.uniform(0, 2 * math.pi), c.rng.uniform(.15, .95)
        sx, sy = lx + math.cos(a) * rl * t, ly + math.sin(a) * rl * .9 * t; b = a + math.pi / 2 + c.rng.uniform(-.6, .6); L_ = c.rng.uniform(8, 18)
        C = peel if k % 3 == 0 else wood
        lit = (math.cos(a) + math.sin(a)) < 0
        limb(tm, sx - math.cos(b) * L_ / 2, sy - math.sin(b) * L_ / 2, sx + math.cos(b) * L_ / 2, sy + math.sin(b) * L_ / 2, [C[0], C[1], C[3] if lit else C[2], C[4], C[4]], 3)
    if wat == "autumn":
        for k in range(5): a = c.rng.uniform(3.4, 5.4); d.ellipse([lx + math.cos(a) * rl * .5 - 8, ly + math.sin(a) * rl * .5 - 5, lx + math.cos(a) * rl * .5 + 8, ly + math.sin(a) * rl * .5 + 5], fill=mud[3], outline=mud[1])
    if ice:
        d.polygon(blobpts(c, lx, ly, rl * .62, rl * .55, 16, .08), fill=(230, 234, 240), outline=(176, 186, 200))     # the snow cap
        d.ellipse([lx - 4, ly - 3, lx + 3, ly + 3], fill=(70, 62, 58))
    fx, fy = cx + R_ * .55, cy + R_ * .5; fr = R_ * (.16 + .03 * c.w + (.08 if wat == "autumn" else 0))
    for k in range(9):
        b = c.rng.uniform(0, math.pi); L_ = fr * c.rng.uniform(.8, 1.4)
        limb(tm, fx - math.cos(b) * L_, fy - math.sin(b) * L_, fx + math.cos(b) * L_, fy + math.sin(b) * L_, wood, 2)
    if not ice: dots(tm, c, fx, fy, fr, (90, 130, 60) if wat != "autumn" else (196, 150, 50), 14, 3, dark=(40, 60, 30))
    sx, sy = X1 - R_ * .22, Y0 + R_ * .22
    lit_ellipse(tm, sx, sy, R_ * .1, R_ * .1, rp((210, 180, 130), 14)); d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=wood[0])
    era_litter(tm, c, X0 + R_ * .3, Y1 - R_ * .3, R_ * .2)
    era_litter(tm, c, X0 + R_ * .3, Y0 + R_ * .3, R_ * .2, 1)


def burrow(tm, x, y, w, h, st, v):
    """A den or burrow from above: a dark hole under a lip of earth, the fan of dug spoil spread out from its mouth
    and the worn runs leading off. The soil is the region's (dark peat in the north, red earth in Africa, India and
    Australia, pale sand in the Islamic lands, loess on the steppe) and so is the digger: a fox or badger sett in
    Europe with its bedding straw, a prairie-dog mound in the Americas, a wombat hole in Australia, an aardvark hole in
    Africa, a lemming run in snow in the far north. A big old sett (high wealth) has a second hole."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    S = soil(c); G = rp(grass(c), 16)
    snow = c.s == "polar"
    d.ellipse([X0, Y0, X1, Y1], fill=(G[2] if not snow else (200, 206, 214)), outline=None)
    for k in range(12):
        a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.5, .95)
        px_, py_ = cx + math.cos(a) * R_ * t, cy + math.sin(a) * R_ * t
        if not snow: d.line([px_, py_, px_ + 2, py_ - 6], fill=G[3], width=2); d.line([px_ + 3, py_, px_ + 5, py_ - 5], fill=G[1], width=2)
    spoil = S
    kind = v.get("mouth", "single")
    mound(tm, c, cx + R_ * .15, cy + R_ * .2, R_ * .62, R_ * .5, spoil, .2, 16)
    jx, jy = 0, c.rng.uniform(-.25, .2) * R_
    holes = [(cx - R_ * .1 + jx, cy - R_ * .15 + jy, R_ * .26)]
    if c.w >= 4 or kind == "twin": holes = [(cx - R_ * .32, cy - R_ * .15 + jy, R_ * .2), (cx + R_ * .32, cy - R_ * .15 + jy, R_ * .2)]
    if kind == "mound": holes = [(cx + R_ * .1, cy + R_ * .05, R_ * .16)]
    for hx, hy, hr in holes:
        d.ellipse([hx - hr - 3, hy - hr * .8 - 3, hx + hr + 3, hy + hr * .8 + 3], fill=rp(S)[0], outline=OUT)
        d.ellipse([hx - hr, hy - hr * .75, hx + hr, hy + hr * .75], fill=(22, 16, 18))
        d.arc([hx - hr - 2, hy - hr * .8 - 2, hx + hr + 2, hy + hr * .8 + 2], 200, 330, fill=rp(S)[4], width=2)
    if kind == "run":
        for k in (-1, 0, 1): d.line([cx, cy, cx + k * R_ * .6, cy + R_ * .9], fill=rp(S)[1], width=4)
    if c.s in ("central", "atlantic"):
        scatter(tm, c, cx + R_ * .2, cy + R_ * .4, R_ * .3, R_ * .15, [(200, 170, 90), (170, 140, 70)], 8, (4, 7), kind="stick")
    if c.s in ("africa", "oceania", "southasia"):
        for k in range(4): d.rectangle([cx + R_ * (.3 + k * .12), cy + R_ * (.5 - k * .1), cx + R_ * (.3 + k * .12) + 4, cy + R_ * (.5 - k * .1) + 3], fill=rp(S)[4])
    litter(tm, c, X0, Y0, X1, Y1, 2, .2, salt=1)


CACTUS = {"americas": [("saguaro", (88, 124, 72)), ("prickly pear", (104, 140, 70)), ("barrel", (96, 128, 66))],
          "africa": [("candelabra euphorbia", (78, 112, 66)), ("aloe", (110, 130, 90)), ("euphorbia", (90, 120, 70))],
          "islamic": [("prickly pear", (110, 136, 80)), ("resin spurge", (120, 136, 96)), ("prickly pear", (100, 130, 80))],
          "mediterranean": [("prickly pear", (112, 140, 82)), ("agave", (120, 150, 130)), ("prickly pear", (102, 132, 76))]}


def cactus(tm, x, y, w, h, st, v):
    """A cactus or spiny succulent from above. In the Americas a saguaro's ribbed round top and arms, a clump of
    prickly-pear pads or a ribbed barrel cactus; in Africa a candelabra euphorbia's ribbed stems or an aloe rosette;
    round the Mediterranean and in the Maghreb the prickly pear only after it came from the Americas (from the 1500s),
    before that the native spurges and agave-like aloes. Spines show as pale clusters; fruit (red tunas) or flowers
    with the season. A rich garden's stands in a raked bed ringed with stones; a poor one is wild in the scrub."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    opts = CACTUS.get(c.s, CACTUS["americas"]); name, col = opts[(c.w + int(c.rng.integers(0, 2))) % len(opts)]
    if c.s in ("islamic", "mediterranean") and c.e <= 2 and name == "prickly pear": name, col = ("resin spurge", (120, 136, 96)) if c.s == "islamic" else ("aloe", (116, 138, 96))
    fl = v.get("bloom", "none")
    G = rp(col, 18)
    ground = rp(SAND.get(c.s, SAND["americas"]) if c.s != "africa" else soil(c), 14)
    if c.rich:
        d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=ground[3], outline=ground[0])
        for a in np.linspace(0, 6.28, 14, endpoint=False): lit_ellipse(tm, cx + math.cos(a) * R_ * .9, cy + math.sin(a) * R_ * .9, 5, 4, rp((170, 160, 150), 14))
        for k in range(4): d.arc([cx - R_ * (.3 + k * .12), cy - R_ * (.3 + k * .12), cx + R_ * (.3 + k * .12), cy + R_ * (.3 + k * .12)], 0, 360, fill=ground[2], width=1)
    else:
        d.ellipse([X0 + R_ * .2, Y0 + R_ * .3, X1 - R_ * .1, Y1 - R_ * .1], fill=ground[2])
    spine = (236, 230, 200)
    if name == "saguaro":
        for a in (c.rng.uniform(0, 1.5), c.rng.uniform(3, 4.5)) if c.w >= 2 else (c.rng.uniform(0, 6),):
            ex, ey = cx + math.cos(a) * R_ * .6, cy + math.sin(a) * R_ * .6
            eshadow(tm, ex, ey, R_ * .2, R_ * .2, 5, 6); lit_ellipse(tm, ex, ey, R_ * .2, R_ * .2, G)
            d.line([cx, cy, ex, ey], fill=OUT, width=int(R_ * .22)); d.line([cx, cy, ex, ey], fill=G[2], width=int(R_ * .16))
        eshadow(tm, cx, cy, R_ * .38, R_ * .38, 6, 8); lit_ellipse(tm, cx, cy, R_ * .36, R_ * .36, G)
        for a in np.linspace(0, 6.28, 12, endpoint=False): d.line([cx + math.cos(a) * 4, cy + math.sin(a) * 4, cx + math.cos(a) * R_ * .34, cy + math.sin(a) * R_ * .34], fill=G[1], width=1)
        dots(tm, c, cx, cy, R_ * .3, spine, 10, 2)
    elif name == "prickly pear":
        pads = [(cx + c.rng.uniform(-.5, .5) * R_, cy + c.rng.uniform(-.5, .5) * R_, c.rng.uniform(0, 3.14)) for _ in range(5 + c.w)]
        for px_, py_, a in pads:
            ca, sa = math.cos(a), math.sin(a); pts = [(px_ + ca * math.cos(t) * R_ * .3 - sa * math.sin(t) * R_ * .2, py_ + sa * math.cos(t) * R_ * .3 + ca * math.sin(t) * R_ * .2) for t in np.linspace(0, 6.28, 14, endpoint=False)]
            pshadow(tm, pts, 3, 4, .65); poly(tm, pts, G, 2)
            d.ellipse([px_ - R_ * .14, py_ - R_ * .1, px_ + R_ * .05, py_ + R_ * .02], fill=G[3])
            for k in range(4): d.rectangle([px_ + c.rng.uniform(-R_ * .2, R_ * .2), py_ + c.rng.uniform(-R_ * .12, R_ * .12), px_ + c.rng.uniform(-R_ * .2, R_ * .2) + 1, py_ + c.rng.uniform(-R_ * .12, R_ * .12) + 1], fill=spine)
            if fl != "none":
                for t in (-.6, 0, .6): fx, fy = px_ + math.cos(a + t - 1.57) * R_ * .3, py_ + math.sin(a + t - 1.57) * R_ * .3; d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=(200, 40, 70) if fl == "fruit" else (240, 210, 60), outline=OUT)
    elif name == "barrel":
        eshadow(tm, cx, cy, R_ * .55, R_ * .55, 5, 7); lit_ellipse(tm, cx, cy, R_ * .55, R_ * .55, G)
        for a in np.linspace(0, 6.28, 16, endpoint=False): d.line([cx + math.cos(a) * 5, cy + math.sin(a) * 5, cx + math.cos(a) * R_ * .53, cy + math.sin(a) * R_ * .53], fill=G[0], width=2)
        for a in np.linspace(0, 6.28, 16, endpoint=False): d.rectangle([cx + math.cos(a) * R_ * .4 - 1, cy + math.sin(a) * R_ * .4 - 1, cx + math.cos(a) * R_ * .4 + 1, cy + math.sin(a) * R_ * .4 + 1], fill=(220, 120, 80))
        if fl != "none": dots(tm, c, cx, cy, R_ * .18, (240, 200, 60) if fl == "flower" else (220, 60, 60), 8, 3)
    elif name in ("candelabra euphorbia", "euphorbia", "resin spurge"):
        n = 7 if name == "candelabra euphorbia" else 12
        for k in range(n):
            a = k * 6.28 / n + c.rng.uniform(-.2, .2); L_ = R_ * c.rng.uniform(.55, .9)
            ex, ey = cx + math.cos(a) * L_, cy + math.sin(a) * L_
            d.line([cx, cy, ex, ey], fill=OUT, width=11 if n == 7 else 8); d.line([cx, cy, ex, ey], fill=G[2], width=7 if n == 7 else 5)
            d.line([cx - 1, cy - 1, ex - 1, ey - 1], fill=G[3], width=2)
            lit_ellipse(tm, ex, ey, 5, 5, G)
            if fl != "none": d.rectangle([ex - 2, ey - 2, ex + 2, ey + 2], fill=(220, 60, 40) if fl == "fruit" else (240, 210, 70))
        lit_ellipse(tm, cx, cy, R_ * .16, R_ * .16, G)
    else:                                                                   # aloe or agave rosette
        for k in range(14):
            a = k * 6.28 / 14 + c.rng.uniform(-.1, .1); L_ = R_ * c.rng.uniform(.6, .92)
            pts = [(cx + math.cos(a - .18) * 6, cy + math.sin(a - .18) * 6), (cx + math.cos(a) * L_, cy + math.sin(a) * L_), (cx + math.cos(a + .18) * 6, cy + math.sin(a + .18) * 6)]
            poly(tm, pts, G, 2 + (math.cos(a + 2.36) > 0))
            d.line([cx + math.cos(a) * L_ * .4, cy + math.sin(a) * L_ * .4, cx + math.cos(a) * L_ * .8, cy + math.sin(a) * L_ * .8], fill=(220, 200, 130) if "agave" in name else G[4], width=1)
        if fl != "none":
            d.line([cx, cy, cx + R_ * .7, cy - R_ * .5], fill=OUT, width=5); d.line([cx, cy, cx + R_ * .7, cy - R_ * .5], fill=(120, 140, 70), width=3)
            dots(tm, c, cx + R_ * .7, cy - R_ * .5, R_ * .14, (230, 100, 40), 8, 3)
    litter(tm, c, X0, Y0, X1, Y1, 1, .15, salt=2)


DEADWOOD = {"central": "grey", "atlantic": "dark", "northern": "birch", "mediterranean": "pale", "islamic": "pale", "steppe": "pale",
            "southasia": "dark", "eastasia": "grey", "seasia": "dark", "africa": "pale", "americas": "red", "oceania": "birch", "polar": "grey"}
DEADHABIT = {"central": "spread", "atlantic": "spread", "northern": "spire", "mediterranean": "gnarl", "islamic": "gnarl", "steppe": "spire",
             "southasia": "spread", "eastasia": "gnarl", "seasia": "spread", "africa": "flat", "americas": "spire", "oceania": "gnarl", "polar": "spire"}


def _branch(tm, c, x0, y0, a, L_, wd, C, depth, spread):
    if depth == 0 or L_ < 6: return
    x1, y1 = x0 + math.cos(a) * L_, y0 + math.sin(a) * L_
    limb(tm, x0, y0, x1, y1, C, max(1, int(wd)))
    for s in (-1, 1):
        if c.rng.random() < .88: _branch(tm, c, x1, y1, a + s * spread * c.rng.uniform(.6, 1.2), L_ * c.rng.uniform(.55, .72), wd * .62, C, depth - 1, spread)


def deadtree(tm, x, y, w, h, st, v):
    """A dead tree from above: bare grey limbs forking out from the trunk, the twigs fine at their ends, its shadow a web
    on the ground. The tree and its habit are the region's: a spreading oak or lime in Europe, a white birch or a
    spire of a spruce in the north and the Americas, a twisted olive or juniper round the Mediterranean and in the
    East, a flat-topped thorn in Africa, a pale ghost gum in Australia. Kind: standing, lightning-struck (a black
    scar down one limb), hollow (an open dark bole), ivy-clad (green clumps up the limbs), or with a bracket fungus."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    C = BARK[DEADWOOD.get(c.s, "grey")]; habit = DEADHABIT.get(c.s, "spread"); kind = v.get("kind", "standing")
    if DEADWOOD.get(c.s) == "birch": C = rp(mix(C[2], (150, 150, 146), .35), 16)       # dead birch greys as it weathers
    G = rp(soil(c), 12)
    d.ellipse([cx - R_ * .3, cy - R_ * .25, cx + R_ * .35, cy + R_ * .35], fill=G[2])
    n = {"spread": 6, "spire": 10, "gnarl": 5, "flat": 7}[habit]; spread = {"spread": .5, "spire": .35, "gnarl": .8, "flat": .45}[habit]
    depth = 4 if habit != "spire" else 3; L0 = R_ * {"spread": .42, "spire": .48, "gnarl": .4, "flat": .5}[habit]
    # shadow web: the same limbs once, dark and offset
    seed = int(c.rng.integers(1, 1 << 30))
    for pass_ in (0, 1):
        c.rng = np.random.default_rng(seed)
        for k in range(n):
            a = k * 6.28 / n + c.rng.uniform(-.25, .25)
            if pass_ == 0:
                Cs = [(0, 0, 0)] * 5; x0_, y0_ = cx + 5, cy + 7
                _branch_shadow(tm, c, x0_, y0_, a, L0, 6, depth, spread)
            else:
                _branch(tm, c, cx, cy, a, L0, 7 if habit != "spire" else 4, C, depth, spread)
    lit_ellipse(tm, cx, cy, R_ * .12, R_ * .12, C)
    if kind == "hollow": d.ellipse([cx - R_ * .07, cy - R_ * .06, cx + R_ * .05, cy + R_ * .06], fill=(20, 16, 18))
    if kind == "struck":
        a = 6.28 / n * 2; d.line([cx, cy, cx + math.cos(a) * L0, cy + math.sin(a) * L0], fill=(24, 20, 22), width=4)
        d.line([cx, cy, cx + math.cos(a) * L0 * .8, cy + math.sin(a) * L0 * .8], fill=(230, 220, 190), width=1)
    if kind == "ivy":
        for k in range(7):
            a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.1, .6)
            dots(tm, c, cx + math.cos(a) * R_ * t, cy + math.sin(a) * R_ * t, 8, (40, 80, 40), 6, 3, dark=(20, 40, 24))
    if kind == "fungus":
        for t in (.12, .25): d.pieslice([cx + R_ * t - 8, cy - 6, cx + R_ * t + 8, cy + 8], 180, 360, fill=(214, 170, 100), outline=OUT)
    litter(tm, c, X0, Y0, X1, Y1, 2, .08, salt=0)


def _branch_shadow(tm, c, x0, y0, a, L_, wd, depth, spread):
    if depth == 0 or L_ < 6: return
    x1, y1 = x0 + math.cos(a) * L_, y0 + math.sin(a) * L_
    tm.shade((min(x0, x1) - wd, min(y0, y1) - wd, max(x0, x1) + wd, max(y0, y1) + wd), f=.72, kind="poly",
             pts=[(x0 - wd / 2, y0), (x1 - wd / 4, y1), (x1 + wd / 4, y1 + 1), (x0 + wd / 2, y0 + 1)])
    for s in (-1, 1):
        if c.rng.random() < .88: _branch_shadow(tm, c, x1, y1, a + s * spread * c.rng.uniform(.6, 1.2), L_ * c.rng.uniform(.55, .72), wd * .62, depth - 1, spread)


# the region's fruit trees: (name, leaf, fruit, blossom, habit)
FRUIT = {"central": [("apple", (78, 116, 52), (200, 50, 40), (246, 220, 226)), ("pear", (70, 108, 52), (200, 190, 80), (246, 246, 236)), ("plum", (66, 100, 50), (90, 50, 110), (246, 240, 240))],
         "atlantic": [("apple", (74, 114, 54), (190, 60, 40), (246, 216, 222)), ("pear", (68, 106, 54), (190, 180, 90), (246, 246, 236)), ("cherry", (70, 104, 50), (170, 20, 40), (250, 232, 236))],
         "northern": [("apple", (84, 116, 58), (210, 80, 50), (246, 220, 226)), ("rowan", (82, 118, 52), (220, 80, 40), (240, 236, 220)), ("cherry", (76, 108, 54), (170, 20, 40), (250, 232, 236))],
         "mediterranean": [("orange", (40, 86, 44), (236, 140, 30), (250, 250, 240)), ("fig", (86, 126, 50), (110, 60, 90), None), ("lemon", (46, 92, 46), (240, 220, 60), (250, 250, 240))],
         "islamic": [("pomegranate", (70, 110, 50), (200, 50, 50), (230, 80, 50)), ("fig", (82, 122, 48), (110, 60, 90), None), ("apricot", (88, 124, 56), (236, 160, 60), (246, 220, 226))],
         "steppe": [("wild apple", (90, 120, 58), (200, 80, 50), (246, 220, 226)), ("apricot", (90, 126, 58), (236, 160, 60), (246, 220, 226)), ("mulberry", (70, 110, 50), (60, 30, 50), None)],
         "southasia": [("mango", (34, 82, 44), (230, 170, 50), (220, 200, 130)), ("jackfruit", (36, 86, 40), (160, 170, 60), None), ("guava", (70, 110, 52), (200, 210, 110), (246, 246, 236))],
         "eastasia": [("persimmon", (66, 100, 44), (240, 120, 30), (240, 230, 190)), ("peach", (76, 116, 56), (240, 170, 140), (246, 180, 200)), ("loquat", (44, 86, 50), (240, 180, 60), (246, 240, 220))],
         "seasia": [("mango", (34, 84, 44), (230, 170, 50), (220, 200, 130)), ("rambutan", (40, 90, 44), (210, 40, 40), None), ("durian", (40, 90, 40), (150, 150, 60), None)],
         "africa": [("mango", (34, 82, 44), (230, 160, 50), (220, 200, 130)), ("marula", (80, 116, 54), (220, 210, 90), None), ("shea", (60, 100, 46), (150, 170, 80), (246, 240, 220))],
         "americas": [("avocado", (40, 84, 44), (60, 90, 40), None), ("guava", (70, 112, 52), (200, 210, 110), (246, 246, 236)), ("papaya", (70, 120, 50), (240, 160, 50), None)],
         "oceania": [("breadfruit", (50, 100, 44), (150, 180, 70), None), ("banana", (90, 140, 60), (230, 210, 80), None), ("mango", (36, 84, 44), (230, 170, 50), None)],
         "polar": [("crab apple", (90, 116, 60), (200, 60, 40), (246, 220, 226)), ("rowan", (82, 118, 52), (220, 80, 40), (240, 236, 220)), ("bird cherry", (80, 110, 56), (40, 30, 40), (246, 246, 236))]}
SETTLER_FRUIT = {"americas": [("apple", (78, 116, 52), (200, 50, 40), (246, 220, 226)), ("orange", (40, 86, 44), (236, 140, 30), (250, 250, 240)), ("peach", (76, 116, 56), (240, 170, 140), (246, 180, 200))],
                 "oceania": [("apple", (78, 116, 52), (200, 50, 40), (246, 220, 226)), ("lemon", (46, 92, 46), (240, 220, 60), (250, 250, 240)), ("mango", (36, 84, 44), (230, 170, 50), None)]}


def fruittree(tm, x, y, w, h, st, v):
    """A fruit tree from above, the region's own: apple, pear, plum or cherry in Europe, orange, lemon and fig round
    the Mediterranean, pomegranate, fig and apricot in the Islamic lands, wild apple and apricot on the steppe, mango
    and jackfruit in India, persimmon, peach and loquat in East Asia, rambutan and durian in Southeast Asia, mango and
    marula in Africa, avocado and guava in the Americas (apple and orange after the settlers), breadfruit and banana in
    the Pacific, crab apple and rowan in the north. Season: blossom, leaf, fruit (the crown dotted with it and windfalls
    under) or bare. A poor tree is old and unpruned with a lopped limb; a rich one is pruned open in a mown circle,
    from the 1800s with its trunk limewashed and a grease band, a ladder or a basket by it at fruit time. Each age's
    tending shows round it."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    table = FRUIT.get(c.s, FRUIT["central"])
    if c.s == "americas" and c.e >= 3 and c.w % 2: table = SETTLER_FRUIT["americas"]
    if c.s == "oceania" and c.e >= 4 and c.w % 2: table = SETTLER_FRUIT["oceania"]
    name, leaf, fruit, bloom = table[(c.w // 2) % len(table)]
    season = v.get("season", "fruit")
    if season == "blossom" and bloom is None: season = "leaf"
    r = R_ * (.72 + .05 * min(c.w, 4)) if not c.poor else R_ * .8
    if c.rich:
        d.ellipse([cx - R_ * .98, cy - R_ * .98, cx + R_ * .98, cy + R_ * .98], fill=rp(grass(c), 14)[3])
        d.ellipse([cx - R_ * .3, cy - R_ * .3, cx + R_ * .3, cy + R_ * .3], fill=rp(soil(c), 14)[2])
    L = rp(leaf, 20)
    if name in ("banana", "papaya"):
        for k in range(8):
            a = k * .785 + c.rng.uniform(-.2, .2); ex, ey = cx + math.cos(a) * r, cy + math.sin(a) * r
            pts = [(cx, cy), (cx + math.cos(a - .25) * r * .6, cy + math.sin(a - .25) * r * .6), (ex, ey), (cx + math.cos(a + .25) * r * .6, cy + math.sin(a + .25) * r * .6)]
            pshadow(tm, pts, 4, 6, .65); poly(tm, pts, L, 2 + (math.cos(a + 2.36) > 0))
            d.line([cx, cy, ex, ey], fill=L[4], width=1)
        if season == "fruit": dots(tm, c, cx, cy, r * .25, fruit, 8, 4, dark=tone(fruit, -70))
    elif season == "bare":
        seed = int(c.rng.integers(1, 1 << 30))
        d.ellipse([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], fill=rp(grass(c), 12)[1])
        for k in range(6): _branch(tm, c, cx, cy, k * 1.05 + c.rng.uniform(-.2, .2), r * .48, 6, BARK["dark"], 3, .55)
        for k in range(10):                                                 # short fruiting spurs and a few shrivelled fruit left on
            a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.3, .8); sx_, sy_ = cx + math.cos(a) * r * t, cy + math.sin(a) * r * t
            d.ellipse([sx_ - 2, sy_ - 2, sx_ + 2, sy_ + 2], fill=(150, 120, 90) if k % 3 else tone(fruit, -60), outline=OUT)
        lit_ellipse(tm, cx, cy, r * .1, r * .1, BARK["dark"])
    else:
        eshadow(tm, cx, cy, r, r, 5, 7, .62)
        crown(tm, c, cx, cy, r, L, n=7 if not c.rich else 8, spread=.55, q=(.34, .45), size=4, jag=.12 if c.poor else 0)
        if season == "blossom": dots(tm, c, cx - r * .05, cy - r * .05, r * .85, bloom, 60, 3, dark=tone(bloom, -60))
        if season == "fruit": dots(tm, c, cx, cy, r * .82, fruit, 26 + 4 * c.w, 4, dark=tone(fruit, -80))
        if c.poor: limb(tm, cx + r * .2, cy - r * .1, cx + r * .95, cy - r * .5, BARK["grey"], 4)
    if c.rich and c.e >= 4:
        lit_ellipse(tm, cx + r * .1, cy + r * .9, 7, 7, rp((236, 234, 224), 10))
        d.ellipse([cx + r * .1 - 7, cy + r * .9 - 7, cx + r * .1 + 7, cy + r * .9 + 7], outline=(40, 34, 30), width=2)
    if season == "fruit" and c.w >= 3:
        lx, ly = cx - R_ * .85, cy + R_ * .25
        for s in (0, 9): d.line([lx + s, ly, lx + s + R_ * .35, ly + R_ * .6], fill=OUT, width=4); d.line([lx + s, ly, lx + s + R_ * .35, ly + R_ * .6], fill=OAK[3], width=2)
        for t in np.linspace(.15, .85, 4): d.line([lx + R_ * .35 * t, ly + R_ * .6 * t, lx + 9 + R_ * .35 * t, ly + R_ * .6 * t], fill=OAK[2], width=2)
    litter(tm, c, X0, Y0, X1, Y1, 2, .08, salt=3)


HEAPS = {"earth": None, "sand": "sand", "gravel": (150, 146, 140), "clay": (170, 110, 80), "coal": (40, 38, 44), "manure": (90, 70, 46)}


def heap(tm, x, y, w, h, st, v):
    """A heap of earth, sand or gravel from above: a rounded cone lit on its north-west flank, the stuff's own grain
    on it (crumbs of earth, smooth sand with ripples, gravel in grey clusters), its foot spread and the tool of the
    age stuck in it or left by it: a wooden spade or a mattock (Middle Ages), an iron-shod spade, an iron shovel and
    a barrow, then a steel shovel, a wheelbarrow, a builder's bag, and in Future Darkness a dark plastic bin. Earth is
    the region's soil. Rich (a builder's yard): a heap under a sheet or in a bay; poor: a scrape of a heap."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    mat = v.get("material", "earth"); col = HEAPS.get(mat)
    col = soil(c) if col is None else SAND.get(c.s, SAND["central"]) if col == "sand" else col
    if mat == "gravel": col = mix(col, ROCK.get(c.s, (128, 126, 124)), .6)
    if mat == "clay": col = mix(col, soil(c), .45)
    r = R_ * (.72 + .05 * min(c.w, 4))
    if c.rich and c.e >= 4:
        for s in (-1, 1): lit_rect(tm, cx + s * R_ * .92 - 5, cy - R_ * .9, cx + s * R_ * .92 + 5, cy + R_ * .7, rp((150, 146, 140) if c.e >= 6 else (130, 90, 60), 14))
        lit_rect(tm, cx - R_ * .92, cy - R_ * .97, cx + R_ * .92, cy - R_ * .85, rp((150, 146, 140) if c.e >= 6 else (130, 90, 60), 14))
    pts = mound(tm, c, cx, cy, r, r * .88, col, .1, 16 if mat != "coal" else 12)
    C = rp(col, 16)
    if mat == "gravel":
        for k in range(int(r * 1.4)):
            a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * r * .85
            gx, gy = cx + math.cos(a) * t, cy + math.sin(a) * t; d.ellipse([gx - 2, gy - 2, gx + 2, gy + 1], fill=C[int(c.rng.integers(1, 5))])
    elif mat == "sand":
        for k in range(5): d.arc([cx - r * (.3 + k * .14), cy - r * (.3 + k * .12), cx + r * (.3 + k * .14), cy + r * (.3 + k * .12)], 190, 300, fill=C[4], width=1)
    elif mat == "coal":
        for k in range(int(r * .9)):
            a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * r * .85
            gx, gy = cx + math.cos(a) * t, cy + math.sin(a) * t; d.polygon([(gx - 3, gy), (gx, gy - 3), (gx + 3, gy + 1)], fill=C[int(c.rng.integers(2, 5))])
    else:
        for k in range(int(r * .9)):
            a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * r * .85
            gx, gy = cx + math.cos(a) * t, cy + math.sin(a) * t; d.rectangle([gx - 2, gy - 1, gx + 2, gy + 2], fill=C[0] if k % 2 else C[3])
        if mat == "manure": scatter(tm, c, cx, cy, r * .7, r * .6, [(200, 170, 90), (170, 140, 70)], 16, (4, 7), kind="stick")
    if c.rich and c.e >= 6:
        lit_rect(tm, cx - r * .5, cy - r * .45, cx + r * .4, cy + r * .1, rp((90, 110, 70) if c.e == 6 else (40, 80, 170), 14), r=4)
    _tool(tm, c, cx + r * .55, cy + r * .45, r * .7)
    litter(tm, c, X0, Y0, X1, Y1, 1, .13, salt=1)


def _tool(tm, c, x, y, L_):
    """The digging tool of the age left in a heap: wooden spade, iron-shod spade, iron shovel, steel shovel, plastic."""
    d = tm.d; e = c.e
    shaft = OAK if e < 7 else rp((60, 60, 64))
    if e >= 6 and c.w >= 2:                                                  # a wheelbarrow beside it
        bx, by = x - L_ * .2, y + 6
        tray = rp((60, 110, 60) if e == 6 else (200, 120, 30) if e == 7 else (50, 54, 66), 18)
        lit_rect(tm, bx - 18, by - 12, bx + 14, by + 12, tray, r=5); d.rectangle([bx - 12, by - 6, bx + 8, by + 6], fill=tray[1])
        d.ellipse([bx + 14, by - 4, bx + 24, by + 4], fill=(30, 30, 34), outline=OUT)
        for s in (-1, 1): d.line([bx - 18, by + s * 8, bx - 32, by + s * 10], fill=OUT, width=4); d.line([bx - 18, by + s * 8, bx - 32, by + s * 10], fill=shaft[3], width=2)
        return
    a = -.9; ex, ey = x + math.cos(a) * L_ * .7, y + math.sin(a) * L_ * .7
    d.line([x, y, ex, ey], fill=OUT, width=5); d.line([x, y, ex, ey], fill=shaft[3], width=3)
    blade = OAK if e <= 1 else IRON if e <= 4 else STEEL
    if e <= 1: lit_rect(tm, x - 6, y - 4, x + 6, y + 6, rp((150, 112, 70), 16))
    else: poly(tm, [(x - 7, y - 3), (x + 6, y - 6), (x + 9, y + 6), (x - 4, y + 9)], blade, 3)
    if e == 1: d.line([x - 6, y + 6, x + 6, y + 6], fill=IRON[3], width=2)
    if e >= 3: d.line([ex - 5, ey - 2, ex + 5, ey + 2], fill=OUT, width=4); d.line([ex - 5, ey - 2, ex + 5, ey + 2], fill=shaft[4], width=2)


LEAVES = {"central": [(170, 110, 40), (140, 70, 30), (200, 150, 60)], "atlantic": [(160, 100, 40), (120, 76, 40), (190, 140, 60)],
          "northern": [(220, 190, 60), (200, 160, 40), (170, 120, 40)], "mediterranean": [(150, 130, 70), (120, 100, 60), (170, 150, 90)],
          "islamic": [(190, 160, 80), (160, 120, 60), (120, 100, 50)], "steppe": [(210, 180, 60), (180, 150, 50), (150, 120, 40)],
          "southasia": [(170, 120, 60), (120, 80, 40), (190, 150, 80)], "eastasia": [(210, 60, 30), (230, 170, 40), (170, 40, 30)],
          "seasia": [(150, 110, 60), (110, 80, 40), (90, 100, 50)], "africa": [(170, 130, 60), (140, 100, 50), (110, 90, 50)],
          "americas": [(220, 80, 30), (230, 160, 40), (180, 50, 30)], "oceania": [(160, 140, 110), (130, 110, 90), (180, 150, 110)],
          "polar": [(200, 170, 60), (170, 120, 50), (140, 140, 110)]}


def leafpile(tm, x, y, w, h, st, v):
    """A raked heap of fallen leaves from above, the region's leaves: brown oak and beech in Europe, yellow birch in the
    north, red and gold maple in East Asia and the Americas, grey-green eucalyptus strips in Australia, big brown teak
    and palm leaves in the tropics. The rake or brush of the age is left by it: a wooden rake, a birch besom, a bamboo
    rake, a steel spring-tine rake, a plastic rake and a sack, a leaf blower; Future Darkness grey ash in it. Rich (a
    park or an estate): a neat heap with a barrow; poor: a scuffed drift."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    cols = LEAVES.get(c.s, LEAVES["central"])
    if c.e == 8: cols = [mix(k, (110, 110, 110), .35) for k in cols]
    big = c.s in ("seasia", "southasia", "africa")
    r = R_ * (.6 + .06 * min(c.w, 4))
    mound(tm, c, cx - R_ * .05, cy - R_ * .05, r, r * .85, mix(cols[0], (60, 40, 30), .3), .2, 14)
    scatter(tm, c, cx - R_ * .05, cy - R_ * .05, r * .92, r * .8, cols + [tone(cols[0], 30)], int(r * 2.2), (3, 6) if not big else (6, 10))
    scatter(tm, c, cx + R_ * .2, cy + R_ * .3, R_ * .7, R_ * .5, cols, 14, (3, 5))
    if c.s == "oceania":
        for k in range(10): a = c.rng.uniform(0, 3.14); px_, py_ = cx + c.rng.uniform(-.6, .6) * R_, cy + c.rng.uniform(-.6, .6) * R_; d.line([px_, py_, px_ + math.cos(a) * 10, py_ + math.sin(a) * 10], fill=(150, 160, 140), width=2)
    _rake(tm, c, X0 + R_ * .25, Y0 + R_ * .2, R_ * .8)
    litter(tm, c, X0, Y0, X1, Y1, 1, .12, salt=2)


def _rake(tm, c, x, y, L_):
    """The rake or brush of the age, lying north-west of the heap."""
    d = tm.d; e = c.e; a = .55
    ex, ey = x + math.cos(a) * L_, y + math.sin(a) * L_
    shaft = OAK if e < 7 else rp((70, 70, 76))
    if e == 7 and c.w >= 3:                                                  # a leaf blower
        lit_rect(tm, x - 10, y - 8, x + 10, y + 8, rp((220, 120, 30), 18), r=4); d.line([x + 8, y + 4, x + L_ * .5, y + L_ * .35], fill=OUT, width=7); d.line([x + 8, y + 4, x + L_ * .5, y + L_ * .35], fill=(60, 60, 64), width=5)
        return
    d.line([x, y, ex, ey], fill=OUT, width=5); d.line([x, y, ex, ey], fill=shaft[3], width=3)
    if c.s == "eastasia" and e < 7 or (c.s in ("seasia", "southasia") and e < 6):
        for t in np.linspace(-.7, .7, 7): d.line([x, y, x - math.cos(a + t) * 16, y - math.sin(a + t) * 16], fill=(200, 180, 110), width=2)
    elif e <= 1:                                                             # a birch besom
        for t in np.linspace(-.35, .35, 6): d.line([x, y, x - math.cos(a + t) * 16, y - math.sin(a + t) * 16], fill=(150, 110, 70), width=2)
    else:
        hx, hy = x, y; px_, py_ = -math.sin(a), math.cos(a)
        col = OAK[2] if e <= 3 else IRON[3] if e <= 5 else (60, 130, 60) if e == 6 else (40, 90, 200) if e == 7 else (60, 64, 76)
        d.line([hx - px_ * 12, hy - py_ * 12, hx + px_ * 12, hy + py_ * 12], fill=OUT, width=5); d.line([hx - px_ * 12, hy - py_ * 12, hx + px_ * 12, hy + py_ * 12], fill=col, width=3)
        for t in np.linspace(-11, 11, 6): d.line([hx + px_ * t, hy + py_ * t, hx + px_ * t - math.cos(a) * 6, hy + py_ * t - math.sin(a) * 6], fill=col, width=2)
    if e >= 6 and c.w >= 2:
        sx, sy = ex + 6, ey - 16; lit_rect(tm, sx - 10, sy - 8, sx + 10, sy + 10, rp((200, 190, 150) if e == 6 else (40, 120, 60) if e == 7 else (50, 54, 60), 16), r=4)
        d.ellipse([sx - 7, sy - 6, sx + 7, sy + 2], fill=(30, 24, 22))


MIDDEN = {"central": [(170, 150, 130)], "atlantic": [(220, 216, 206), (60, 60, 70)], "northern": [(220, 210, 190)], "mediterranean": [(80, 110, 50), (60, 40, 50)],
          "islamic": [(120, 70, 40), (200, 170, 120)], "steppe": [(200, 190, 170)], "southasia": [(160, 130, 70), (210, 190, 120)],
          "eastasia": [(220, 200, 140), (200, 190, 160)], "seasia": [(140, 100, 60), (200, 170, 110)], "africa": [(200, 170, 100), (120, 80, 50)],
          "americas": [(230, 200, 60), (200, 170, 100)], "oceania": [(140, 100, 60), (220, 210, 190)], "polar": [(226, 220, 206), (110, 90, 70)]}


def midden(tm, x, y, w, h, st, v):
    """A midden or compost heap from above: dung and straw forked up in a heap, the household's leavings on it, and what
    each age throws away: bones and broken pottery in the Middle Ages, white clay pipe stems and green bottle glass
    from the 1600s, tins and blue-and-white china in the 1800s, newspaper, cans and bottles in the 1900s, plastic bags
    and wrappers from the 1990s. The leavings are the region's food: oyster and mussel shells on the Atlantic, fish bones
    in the north, olive stones and vine cuttings round the Mediterranean, date stones in the Islamic lands, rice husk
    in Asia, coconut husks in the tropics, maize husks in the Americas. Rich (from the 1800s): a slatted compost bay or
    a plastic bin. Contents: dung, kitchen, ash."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    kind = v.get("contents", "dung")
    base = {"dung": (96, 74, 50), "kitchen": (110, 96, 60), "ash": (130, 126, 122)}[kind]
    base = mix(base, soil(c), .4)
    r = R_ * (.95 if not c.poor else .8)
    bay = c.rich and c.e >= 4
    if bay:
        col = OAK if c.e < 7 else rp((50, 70, 50), 14)
        if c.e >= 7:
            lit_rect(tm, cx - r, cy - r, cx + r, cy + r, rp((40, 52, 40), 14), r=10); d.ellipse([cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8], fill=rp(base)[1], outline=OUT)
        else:
            for s in range(3):
                d.rectangle([cx - r, cy - r + s * r * .7, cx + r, cy - r + s * r * .7 + 6], fill=col[2], outline=OUT)
            for s in (-1, 1): d.rectangle([cx + s * r - 4, cy - r, cx + s * r + 4, cy + r], fill=col[1], outline=OUT)
    mound(tm, c, cx, cy, r * (.9 if bay else 1), r * (.85 if bay else .9), base, .22, 14)
    straw = [(190, 160, 80), (160, 130, 60)] if kind != "ash" else [(80, 76, 74), (150, 146, 140)]
    scatter(tm, c, cx, cy, r * .8, r * .7, straw, int(r * 1.0), (4, 8), kind="stick")
    if kind == "kitchen": scatter(tm, c, cx, cy, r * .6, r * .5, [(120, 150, 60), (200, 120, 40), (210, 190, 120)], 14, (2, 4))
    loc = MIDDEN.get(c.s, MIDDEN["central"])
    scatter(tm, c, cx - r * .1, cy, r * .7, r * .6, loc, 18, (4, 7), kind="leaf")
    if c.s in ("seasia", "oceania"):
        for k in range(3): a = c.rng.uniform(0, 6.28); lit_ellipse(tm, cx + math.cos(a) * r * .45, cy + math.sin(a) * r * .45, 9, 7, rp((130, 90, 50), 16))
    if c.s in ("americas",): scatter(tm, c, cx, cy, r * .6, r * .5, [(230, 210, 120), (200, 180, 90)], 8, (8, 12), kind="stick")
    if c.s in ("eastasia", "southasia", "seasia"): scatter(tm, c, cx, cy, r * .7, r * .6, [(226, 210, 150)], 40, (1.5, 2.5), kind="dot")
    e = c.e
    for k in range(3 + (c.w >= 2)):
        a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.1, .55); px_, py_ = cx + math.cos(a) * r * t, cy + math.sin(a) * r * t
        if e <= 2:
            if k % 2: d.line([px_ - 6, py_, px_ + 6, py_ + 2], fill=OUT, width=4); d.line([px_ - 6, py_, px_ + 6, py_ + 2], fill=(230, 222, 200), width=2)
            else: poly(tm, [(px_, py_ - 5), (px_ + 7, py_), (px_ + 1, py_ + 5)], rp((170, 96, 66)), 3)
        elif e == 3:
            if k % 2: d.line([px_ - 8, py_, px_ + 7, py_ - 3], fill=(240, 238, 230), width=2)
            else: poly(tm, [(px_, py_ - 5), (px_ + 7, py_), (px_ + 1, py_ + 5)], rp((50, 100, 70), 20), 3)
        elif e == 4:
            if k % 2: lit_ellipse(tm, px_, py_, 5, 5, rp((150, 150, 156)))
            else: poly(tm, [(px_, py_ - 5), (px_ + 8, py_), (px_ + 1, py_ + 6)], [(0, 0, 0), (0, 0, 0), (236, 236, 240)], 2); d.line([px_ + 1, py_ - 1, px_ + 5, py_ + 1], fill=(40, 60, 160), width=2)
        elif e <= 6:
            if k % 2: d.rectangle([px_ - 6, py_ - 5, px_ + 6, py_ + 5], fill=(220, 216, 200), outline=OUT); d.line([px_ - 4, py_ - 2, px_ + 4, py_ - 2], fill=(90, 90, 90))
            else: lit_rect(tm, px_ - 3, py_ - 6, px_ + 3, py_ + 6, rp((200, 50, 40) if e == 6 else (150, 150, 150), 20))
        elif e == 7:
            if k % 2: poly(tm, [(px_ - 7, py_ - 4), (px_ + 6, py_ - 6), (px_ + 8, py_ + 5), (px_ - 6, py_ + 6)], [(0, 0, 0), (0, 0, 0), (230, 230, 226)], 2); d.line([px_ - 4, py_, px_ + 5, py_], fill=(40, 90, 200), width=2)
            else: poly(tm, [(px_ - 5, py_ - 4), (px_ + 6, py_ - 3), (px_ + 4, py_ + 4)], [(0, 0, 0), (0, 0, 0), (250, 200, 40)], 2)
        else:
            poly(tm, [(px_ - 6, py_ - 4), (px_ + 6, py_ - 2), (px_, py_ + 6)], rp((50, 54, 66)), 2); d.line([px_ - 4, py_ - 3, px_ + 4, py_ - 1], fill=GLOW[2], width=1)
    if not bay: litter(tm, c, X0, Y0, X1, Y1, 1, .12, salt=2)


REEDS = {"central": [("reed", (130, 140, 80), (150, 110, 70)), ("bulrush", (90, 120, 60), (110, 70, 40))],
         "atlantic": [("reed", (120, 136, 76), (150, 110, 70)), ("bulrush", (84, 116, 60), (110, 70, 40))],
         "northern": [("reed", (140, 140, 90), (160, 130, 90)), ("sedge", (110, 130, 80), None)],
         "mediterranean": [("giant cane", (130, 150, 90), (200, 190, 160)), ("reed", (140, 140, 90), (160, 120, 80))],
         "islamic": [("papyrus", (90, 140, 60), (150, 170, 80)), ("reed", (150, 146, 90), (170, 130, 90))],
         "steppe": [("reed", (160, 150, 100), (170, 130, 90)), ("sedge", (130, 136, 90), None)],
         "southasia": [("elephant grass", (110, 140, 60), (220, 210, 190)), ("lotus reed", (90, 130, 60), (160, 120, 70))],
         "eastasia": [("reed", (130, 140, 90), (200, 180, 160)), ("rush", (90, 120, 70), None)],
         "seasia": [("nipa", (70, 120, 50), (150, 100, 50)), ("rush", (80, 130, 60), None)],
         "africa": [("papyrus", (90, 140, 60), (150, 170, 80)), ("reed", (150, 146, 90), (170, 130, 90))],
         "americas": [("cattail", (100, 130, 60), (110, 70, 40)), ("tule", (90, 120, 70), (150, 110, 70))],
         "oceania": [("raupo", (100, 124, 66), (110, 70, 40)), ("flax", (70, 100, 60), (160, 60, 40))],
         "polar": [("cotton grass", (120, 130, 80), (240, 240, 236)), ("sedge", (120, 126, 80), None)]}


def reeds(tm, x, y, w, h, st, v):
    """A stand of reeds at the water's edge from above: the shallows and the bank, the reed stems as crowded upright
    blades (seen nearly end on, so short strokes with their leaves splaying), and the heads of the region's kind: the
    brown sausages of bulrush and cattail in Europe and the Americas, feathery reed plumes, the starburst tops of
    papyrus on the Nile and in Africa, giant cane round the Mediterranean, nipa palm fronds in Southeast Asia, raupo
    and flax in Aotearoa, white cotton-grass tufts on the tundra. Season: green, flowering or winter (dry, straw coloured
    and snapped). A rich bank is cut back by a landing stage; a poor one is choked."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    season = v.get("season", "green")
    opts = REEDS.get(c.s, REEDS["central"]); name, col, head = opts[c.w % 2]
    if season == "winter": col = mix(col, (190, 160, 100), .6 if season == "winter" else .4)
    water(tm, c, X0, cy - R_ * .1, X1, Y1, R_ * .3)
    d.polygon([(X0, Y0), (X1, Y0), (X1, cy - R_ * .25), (cx + R_ * .3, cy - R_ * .05), (cx - R_ * .4, cy - R_ * .2), (X0, cy)], fill=rp(soil(c), 14)[2], outline=None)
    G = rp(col, 18)
    n = 26 + 6 * min(c.w, 3)
    stems = [(cx + c.rng.uniform(-.85, .85) * R_, cy + c.rng.uniform(-.75, .7) * R_) for _ in range(n)]
    stems.sort(key=lambda p: p[0] + p[1])
    for k, (sx, sy) in enumerate(stems):
        if name in ("papyrus",):
            for a in np.linspace(0, 6.28, 9, endpoint=False): d.line([sx, sy, sx + math.cos(a) * 9, sy + math.sin(a) * 9], fill=G[1 + (math.cos(a + 2.36) > 0) * 2], width=1)
            d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=G[4])
            continue
        if name in ("nipa", "flax"):
            a = c.rng.uniform(0, 6.28); d.line([sx, sy, sx + math.cos(a) * 16, sy + math.sin(a) * 16], fill=OUT, width=4); d.line([sx, sy, sx + math.cos(a) * 16, sy + math.sin(a) * 16], fill=G[2 + k % 2], width=2)
            continue
        for a in (c.rng.uniform(0, 6.28), c.rng.uniform(0, 6.28)):
            L_ = c.rng.uniform(7, 13); d.line([sx, sy, sx + math.cos(a) * L_, sy + math.sin(a) * L_], fill=G[1 if math.cos(a + 2.36) < 0 else 3], width=2)
        d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=G[2], outline=G[0])
        if head and season != "green" or (head and k % 3 == 0 and season == "green"):
            if name in ("bulrush", "cattail", "raupo"): lit_rect(tm, sx - 2, sy - 6, sx + 3, sy + 2, rp(head, 16), r=2)
            elif name == "cotton grass": d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=head, outline=(190, 190, 186))
            else: d.polygon([(sx, sy), (sx - 4, sy - 9), (sx + 3, sy - 8)], fill=head, outline=tone(head, -60))
    if c.rich:
        lit_rect(tm, X0 + 4, Y0 + 4, X0 + R_ * .7, Y0 + R_ * .5, rp((150, 120, 80), 14))
        for k in range(1, 4): d.line([X0 + 4 + k * R_ * .16, Y0 + 6, X0 + 4 + k * R_ * .16, Y0 + R_ * .5 - 2], fill=rp((150, 120, 80))[0])
    litter(tm, c, X0, Y0, X1, Y1, 1, .13, salt=1)


WRACK = {"central": [(110, 96, 40), (90, 76, 36)], "atlantic": [(100, 86, 36), (70, 66, 30)], "northern": [(90, 80, 40), (70, 60, 34)],
         "mediterranean": [(80, 110, 60), (60, 90, 50)], "islamic": [(130, 110, 60), (100, 90, 50)], "steppe": [(110, 110, 70), (90, 90, 60)],
         "southasia": [(120, 100, 50), (90, 80, 40)], "eastasia": [(40, 60, 40), (80, 90, 50)], "seasia": [(170, 130, 50), (140, 100, 40)],
         "africa": [(140, 110, 50), (100, 90, 40)], "americas": [(170, 130, 40), (90, 80, 34)], "oceania": [(110, 80, 40), (70, 60, 30)],
         "polar": [(90, 70, 40), (60, 50, 30)]}
KELP = {"northern", "polar", "americas", "oceania", "atlantic", "africa"}


def seaweed(tm, x, y, w, h, st, v):
    """A line of seaweed and wrack thrown up on the shore, from above: tangled brown fronds and bladders along the
    strandline on wet sand, the region's weed (bladderwrack in the North Sea and the Atlantic, the thick stipes and
    blades of kelp on the cold coasts of the Americas, the Cape and Aotearoa, golden sargassum in the tropics, the
    green posidonia balls of the Mediterranean, dark kombu in Japan), shells and a crab caught in it, and what the sea
    of each age throws up with it: a cork float and spar, a glass float, a tarred rope end, a tin, then plastic bottles
    and blue net."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
    S = rp(SAND.get(c.s, SAND["atlantic"]), 12)
    d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=S[2])
    d.rectangle([X0, Y1 - (Y1 - Y0) * .3, X1, Y1], fill=mix(S[1], (90, 110, 120), .3))
    for k in range(4): xx = X0 + 6 + k * (X1 - X0) / 4; d.line([xx, Y0 + 6, xx + 16, Y0 + 4], fill=S[4], width=1)
    cols = WRACK.get(c.s, WRACK["atlantic"])
    n = 12 + 3 * min(c.w, 3)
    spread = 1
    for k in range(n):
        px_, py_ = X0 + 10 + c.rng.uniform(0, 1) * (X1 - X0 - 20), cy + c.rng.uniform(-.25, .25) * (Y1 - Y0) * spread
        a = c.rng.uniform(0, 6.28); col = cols[k % 2]
        if c.s in KELP and k % 3 == 0:
            L_ = c.rng.uniform(20, 34); pts = [(px_ + math.cos(a) * L_ * t + math.sin(t * 6) * 3, py_ + math.sin(a) * L_ * t + math.cos(t * 6) * 3) for t in np.linspace(0, 1, 6)]
            d.line(pts, fill=OUT, width=7); d.line(pts, fill=col, width=5); d.line(pts, fill=tone(col, 40), width=1)
        elif c.s in ("seasia", "americas") and k % 2:
            dots(tm, c, px_, py_, 7, tone(col, 20), 6, 3, dark=tone(col, -60))
        elif c.s == "mediterranean" and k % 3 == 0:
            lit_ellipse(tm, px_, py_, 5, 5, rp((140, 110, 70), 16))
        else:
            for t in (-.5, 0, .5):
                ex, ey = px_ + math.cos(a + t) * 12, py_ + math.sin(a + t) * 12
                d.line([px_, py_, ex, ey], fill=OUT, width=5); d.line([px_, py_, ex, ey], fill=col, width=3)
                d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], fill=tone(col, 30), outline=OUT)
        if k % 4 == 0: d.point((px_, py_ - 1), fill=(230, 236, 230))
    for k in range(3 + c.w // 2):
        sx, sy = X0 + c.rng.uniform(.1, .9) * (X1 - X0), cy + c.rng.uniform(-.35, .35) * (Y1 - Y0)
        d.pieslice([sx - 4, sy - 4, sx + 4, sy + 4], 180, 360, fill=(236, 226, 214), outline=OUT)
    if c.w >= 3:
        kx, ky = X1 - (X1 - X0) * .2, Y0 + (Y1 - Y0) * .3; lit_ellipse(tm, kx, ky, 6, 5, rp((200, 80, 50), 18))
        for s in (-1, 1): d.line([kx + s * 6, ky, kx + s * 10, ky - 4], fill=OUT, width=3)
    era_litter(tm, c, X0 + (X1 - X0) * .25, cy, min(14, (Y1 - Y0) * .22))




# ================================================================ stones, plants of the garden and the field
STONE = {"central": ((132, 124, 112), (70, 110, 50)), "atlantic": ((128, 130, 132), (190, 180, 100)), "northern": ((150, 130, 128), (190, 170, 80)),
         "mediterranean": ((200, 192, 172), None), "islamic": ((196, 160, 110), None), "steppe": ((120, 120, 116), (170, 160, 90)),
         "southasia": ((150, 86, 60), None), "eastasia": ((110, 110, 112), (80, 110, 60)), "seasia": ((70, 72, 76), (60, 100, 50)),
         "africa": ((150, 76, 50), None), "americas": ((170, 100, 70), (170, 170, 110)), "oceania": ((60, 60, 66), (110, 120, 80)), "polar": ((96, 96, 100), (200, 160, 70))}


def standingstone(tm, x, y, w, h, st, v):
    """A standing stone from above: its weathered top, the upper part of its south face foreshortened below it and a
    short shadow, in the region's stone and with its own marks: grey granite with yellow lichen and ogham notches on
    the edge in the British Isles, a runestone in the north with its red-painted serpent band, a deer stone on the
    steppe cut with stags, a laterite hero stone in India smeared with vermilion and hung with marigolds, a sacred
    stone in Japan girdled with a straw rope and paper streamers, a laterite pillar of the Senegambian circles, a dark
    basalt menhir in the Pacific, an inuksuk of stacked slabs in the far north. Rich: offerings at its foot; poor:
    nettles round it. Each age's care shows: an iron railing from the 1800s, a plaque on a plinth in the 1900s, a
    gravel path and a sign board, then glowing tags."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; W_, H_ = X1 - X0, Y1 - Y0
    col, moss = STONE.get(c.s, STONE["central"]); S = rp(col, 18); e = c.e
    if c.e >= 4 and c.w >= 3:                                                # the age's care round it
        if e <= 5: d.rounded_rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], 6, outline=(30, 30, 34), width=3)
        elif e <= 7: d.rounded_rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], 6, fill=rp((180, 176, 166), 10)[2] if e == 6 else rp((200, 190, 160), 10)[2])
        else: d.rounded_rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], 6, outline=GLOW[1], width=2)
    if c.s == "polar":                                                      # an inuksuk of stacked slabs
        for k, (u, w_, hh) in enumerate(((0, .4, .3), (-.1, .32, .24), (.08, .36, .2), (0, .2, .16))):
            px_, py_ = cx + u * W_ * .5, cy + (k - 1.5) * H_ * .18
            pshadow(tm, [(px_ - w_ * W_, py_ - hh * H_), (px_ + w_ * W_, py_ - hh * H_), (px_ + w_ * W_, py_ + hh * H_), (px_ - w_ * W_, py_ + hh * H_)], 3, 4)
            lit_rect(tm, px_ - w_ * W_, py_ - hh * H_ * .7, px_ + w_ * W_, py_ + hh * H_ * .7, rp(tone(col, k * 10), 16), r=3)
        if moss: dots(tm, c, cx - 4, cy - 4, 8, moss, 6, 2)
    else:
        tilt = 0
        rx, ry = W_ * .36, H_ * .2; tx, ty = cx - W_ * .04 + tilt, Y0 + H_ * .26
        top = [(tx + math.cos(a) * rx * c.rng.uniform(.78, 1), ty + math.sin(a) * ry * c.rng.uniform(.75, 1)) for a in np.linspace(0, 6.28, 7, endpoint=False) + c.rng.uniform(0, .5)]
        face = [p for p in top if p[1] >= ty - 2]
        face = sorted(face, key=lambda p: p[0])
        fh = H_ * .5
        fpts = face + [(p[0] + 2, p[1] + fh) for p in reversed(face)]
        d.ellipse([X0 + 2, Y1 - H_ * .3, X1 - 2, Y1 - 1], fill=rp(soil(c), 12)[2])
        tm.shade((face[0][0] + 4, ty, face[-1][0] + 8, ty + fh + 6), f=.6, kind="poly", pts=[(p[0] + 6, p[1] + 5) for p in fpts])
        poly(tm, fpts, S, 1)
        for k in range(1, 4):
            gx = face[0][0] + (face[-1][0] - face[0][0]) * k / 4; d.line([gx, ty + ry * .6, gx + 1, ty + fh * .9], fill=S[0], width=1)
        d.line([face[0][0] + 2, ty + 2, face[0][0] + 3, ty + fh - 2], fill=S[2], width=2)
        d.polygon(top, fill=S[2], outline=OUT)
        d.polygon([(tx + (p[0] - tx) * .6 - 3, ty + (p[1] - ty) * .6 - 2) for p in top], fill=S[3])
        d.line([tx - rx * .4, ty - ry * .1, tx + rx * .3, ty + ry * .3], fill=S[0], width=1)
        fy = ty + ry + H_ * .12
        if c.s == "atlantic" and c.w >= 2:
            for k in range(5): d.line([tx - rx * .9 + k * 5, ty - ry * .3 + k * 2, tx - rx * .9 + k * 5 - 4, ty - ry * .3 + k * 2 - 3], fill=S[0], width=2)
        if c.s == "northern":
            d.arc([tx - rx * .9, fy - 7, tx + rx * .9, fy + 9], 180, 360, fill=(190, 40, 30), width=3); d.arc([tx - rx * .6, fy - 4, tx + rx * .6, fy + 6], 180, 360, fill=(30, 30, 30), width=1)
        if c.s == "steppe":
            for k in (-1, 1): d.line([tx + k * rx * .35, fy - 3, tx + k * rx * .35 + 6, fy + 3], fill=S[0], width=2); d.line([tx + k * rx * .35 + 6, fy + 3, tx + k * rx * .35 + 10, fy - 2], fill=S[0], width=2)
        if c.s == "southasia":
            d.ellipse([tx - rx * .5, ty - ry * .5, tx + rx * .5, ty + ry * .5], fill=(220, 60, 30)); dots(tm, c, tx, fy, rx * .8, (240, 160, 30), 10, 3, ry=5)
        if c.s == "eastasia":
            d.line([face[0][0], face[0][1] + 6, face[-1][0], face[-1][1] + 6], fill=OUT, width=5); d.line([face[0][0], face[0][1] + 6, face[-1][0], face[-1][1] + 6], fill=(210, 190, 120), width=3)
            for k in (-1, 0, 1): d.polygon([(tx + k * rx * .5, fy - 3), (tx + k * rx * .5 + 4, fy - 3), (tx + k * rx * .5 + 2, fy + 6)], fill=(246, 246, 240), outline=OUT)
        if c.s == "americas": d.ellipse([tx - 6, ty - 4, tx + 4, ty + 4], outline=S[0], width=2)
        if c.s == "seasia": d.ellipse([tx - rx * .6, ty - ry * .6, tx + rx * .2, ty + ry * .1], fill=S[1])
        if moss: dots(tm, c, tx - rx * .3, ty - ry * .2, min(rx, ry) * .7, moss, 6, 2)
        if c.rich:
            for k in range(3): ox, oy = X0 + W_ * (.15 + k * .1), Y1 - H_ * .14; d.ellipse([ox - 3, oy - 3, ox + 3, oy + 3], fill=((230, 200, 60), (200, 40, 60), (240, 240, 230))[k], outline=OUT)
        if c.poor:
            for k in range(4): dots(tm, c, X0 + W_ * (.1 + k * .27), Y1 - H_ * .1, 5, (60, 100, 50), 4, 3)
    if e == 6 and c.w >= 3: lit_rect(tm, X1 - W_ * .22, Y1 - H_ * .3, X1 - 3, Y1 - 3, rp((110, 90, 60), 14)); d.rectangle([X1 - W_ * .2 + 2, Y1 - H_ * .26, X1 - 6, Y1 - 6], fill=(180, 150, 70))
    if e == 7 and c.w >= 3: lit_rect(tm, X1 - W_ * .26, Y1 - H_ * .26, X1 - 3, Y1 - 4, rp((40, 70, 100), 14))
    era_litter(tm, c, X0 + W_ * .12, Y0 + H_ * .2, min(W_, H_) * .13)


STOOK = {"central": ("rye", (206, 178, 100)), "atlantic": ("oats", (214, 196, 130)), "northern": ("barley", (220, 200, 120)),
         "mediterranean": ("wheat", (226, 190, 100)), "islamic": ("wheat", (230, 196, 110)), "steppe": ("millet", (210, 180, 110)),
         "southasia": ("rice", (200, 176, 90)), "eastasia": ("rice", (196, 172, 96)), "seasia": ("rice", (190, 170, 90)),
         "africa": ("sorghum", (196, 160, 90)), "americas": ("maize", (200, 176, 110)), "oceania": ("wheat", (220, 186, 100)), "polar": ("barley", (200, 186, 120))}
HEADS = {"rye": (160, 130, 70), "oats": (230, 220, 170), "barley": (220, 190, 110), "wheat": (190, 140, 60), "millet": (220, 200, 120),
         "rice": (220, 190, 80), "sorghum": (150, 50, 30), "maize": (230, 200, 90)}


def stook(tm, x, y, w, h, st, v):
    """A stook (shock) of sheaves from above: six to ten sheaves stood butt-down and leant together, their bound ears
    meeting in a tight bunch in the middle and their cut butts splayed out in a ring, on a field of stubble. The crop is
    the region's: rye in Central Europe, oats in the west, barley in the north, wheat round the Mediterranean, millet on
    the steppe, small rice sheaves in Asia, red-headed sorghum in Africa, and in the Americas a tall maize shock tied at
    the top with pumpkins by it. Bound with a twist of straw until the binder's twine of the 1870s; the stubble high
    and ragged from the sickle, lower from the scythe, short and even from the reaper. Rich: big stooks with a cap
    sheaf; poor: a few thin sheaves."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    crop, col = STOOK.get(c.s, STOOK["central"])
    if v.get("crop") and c.s in ("central", "atlantic", "northern", "mediterranean", "oceania", "polar"): crop = v["crop"]; col = {"rye": (206, 178, 100), "oats": (214, 196, 130), "barley": (220, 200, 120), "wheat": (226, 190, 100)}[crop]
    S = rp(col, 18); head = HEADS[crop]; e = c.e
    stub = rp(mix(col, soil(c), .45), 12)
    d.ellipse([X0, Y0, X1, Y1], fill=stub[2])
    gap = 9 if e <= 1 else 7 if e <= 3 else 5
    for k, yy in enumerate(np.arange(Y0 + 4, Y1 - 2, gap)):
        span = math.sqrt(max(0, R_ ** 2 - (yy - cy) ** 2)) * .92
        for xx in np.arange(cx - span + (k % 2) * 3, cx + span, 6 if e <= 3 else 4): d.line([xx, yy, xx + (2 if e <= 1 else 1), yy - (4 if e <= 1 else 3 if e <= 3 else 2)], fill=stub[4 if k % 2 else 0], width=1)
    n = 6 + min(c.w, 3) * 2 if crop != "maize" else 14
    if c.poor: n = 5
    if crop == "rice": n += 2
    eshadow(tm, cx, cy, R_ * .7, R_ * .7, 5, 6, .62)
    L_ = R_ * (.9 if crop == "maize" else .72 if not c.poor else .6)
    for k in range(n):
        a = k * 6.28 / n + c.rng.uniform(-.1, .1); ex, ey = cx + math.cos(a) * L_, cy + math.sin(a) * L_
        wd = 12 if crop not in ("maize", "rice") else 7 if crop == "maize" else 9
        lit = math.cos(a + 2.36) > 0
        d.line([cx, cy, ex, ey], fill=OUT, width=wd + 2); d.line([cx, cy, ex, ey], fill=S[3 if lit else 1], width=wd)
        for t in (-wd * .25, wd * .25): d.line([cx + math.sin(a) * t, cy - math.cos(a) * t, ex + math.sin(a) * t, ey - math.cos(a) * t], fill=S[2 if lit else 0], width=1)
        if crop == "maize":
            for t in (.4, .7): bx, by = cx + math.cos(a) * L_ * t, cy + math.sin(a) * L_ * t; d.line([bx, by, bx + math.cos(a + .8) * 10, by + math.sin(a + .8) * 10], fill=S[1], width=3)
        else:
            bx, by = cx + math.cos(a) * L_ * .45, cy + math.sin(a) * L_ * .45
            band = (230, 220, 190) if e >= 4 else S[0]
            d.line([bx - math.sin(a) * wd * .55, by + math.cos(a) * wd * .55, bx + math.sin(a) * wd * .55, by - math.cos(a) * wd * .55], fill=band, width=2)
        d.ellipse([ex - 2, ey - 2, ex + 2, ey + 2], fill=S[0])
    hr = R_ * .26
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=tone(head, -40), outline=OUT)
    for k in range(14):
        a, t = c.rng.uniform(0, 6.28), c.rng.uniform(0, hr * .85); hx, hy = cx + math.cos(a) * t, cy + math.sin(a) * t
        d.line([hx, hy, hx + math.cos(a) * 5, hy + math.sin(a) * 5], fill=head if (math.cos(a) + math.sin(a)) < .4 else tone(head, -25), width=2)
    if c.rich and crop not in ("maize",):
        d.ellipse([cx - hr * .9, cy - hr * .6, cx + hr * .9, cy + hr * .6], fill=S[3], outline=OUT); d.line([cx - hr * .8, cy, cx + hr * .8, cy], fill=S[1])
    if crop == "maize":
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(230, 220, 190), outline=OUT)
        if c.w >= 2: lit_ellipse(tm, cx + R_ * .65, cy + R_ * .55, R_ * .17, R_ * .15, rp((220, 120, 30), 20))
    era_litter(tm, c, X0 + R_ * .25, Y1 - R_ * .25, R_ * .16)


SHADE = {"central": ("linen", (214, 204, 176), None), "atlantic": ("sailcloth", (210, 200, 180), None), "northern": ("wadmal", (150, 130, 110), None),
         "mediterranean": ("sailcloth", (220, 206, 176), (40, 90, 140)), "islamic": ("stripe", (226, 214, 190), (150, 40, 40)),
         "steppe": ("felt", (200, 186, 160), (170, 40, 40)), "southasia": ("shamiana", (230, 200, 150), (170, 40, 60)),
         "eastasia": ("hemp", (200, 186, 150), (40, 40, 60)), "seasia": ("palm mat", (180, 150, 90), None), "africa": ("grass mat", (190, 160, 100), (110, 60, 40)),
         "americas": ("ramada", (160, 140, 80), None), "oceania": ("pandanus", (200, 176, 120), (120, 70, 40)), "polar": ("hide", (170, 140, 110), None)}


def sunshade(tm, x, y, w, h, st, v):
    """A sunshade from above: its cover stretched over four or six poles, sagging between them, the guy ropes running
    out to pegs, and the shade it throws. The cover is the region's own: undyed linen in Central Europe, sailcloth on
    the Atlantic and the Mediterranean, a striped tent cloth in the Islamic lands, a block-printed shamiana with its
    border in India, felt on the steppe, hemp cloth on bamboo in East Asia, a woven palm-leaf or grass mat on poles in
    the tropics and Africa, a brush-roofed ramada in the Americas, pandanus in the Pacific, hide in the far north. Rich:
    strong dyes, a scalloped fringe; poor: plain sacking. The making of the age shows in poles and fittings: rough
    poles and rope, turned poles, iron, then aluminium and nylon, then dark composite."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; W_, H_ = X1 - X0, Y1 - Y0
    kind, col, acc = SHADE.get(c.s, SHADE["central"]); e = c.e
    if acc is None and kind in ("linen", "sailcloth", "wadmal", "hide"): acc = STYLE_PAINT.get(c.s, STYLE_PAINT["central"])[0]
    if e >= 7 and kind in ("linen", "sailcloth", "wadmal"): col = (230, 230, 226) if c.w % 2 else (40, 110, 160)
    if e == 6 and kind in ("linen", "sailcloth"): acc = (40, 110, 70)
    if e == 8: col = mix(col, (60, 64, 72), .55)
    if c.poor: col, acc = mix(col, (150, 130, 100), .6), None
    C = rp(col, 16)
    pole = OAK if e <= 3 else IRON if e <= 5 else STEEL if e <= 7 else COMPOSITE
    ins = W_ * .12
    corner = [(X0 + ins, Y0 + ins), (X1 - ins, Y0 + ins), (X1 - ins, Y1 - ins), (X0 + ins, Y1 - ins)]
    for k, (px_, py_) in enumerate(corner):
        ox, oy = (-1 if k in (0, 3) else 1), (-1 if k < 2 else 1)
        gx, gy = px_ + ox * ins * .8, py_ + oy * ins * .8
        d.line([px_, py_, gx, gy], fill=(230, 220, 190) if e < 6 else (240, 140, 40), width=1)
        lit_rect(tm, gx - 2, gy - 2, gx + 2, gy + 2, pole)
    sg = [c.rng.uniform(2, 14) for _ in range(3)]; sg.append(sg[1])           # the cloth sags alike on east and west
    sy_ = c.rng.uniform(-8, 8)
    pts = [corner[0], (cx, Y0 + ins + sg[0]), corner[1], (X1 - ins - sg[1], cy + sy_), corner[2], (cx, Y1 - ins - sg[2]), corner[3], (X0 + ins + sg[3], cy + sy_)]
    tm.shade((X0 + ins + 4, Y0 + ins + 5, X1 - ins + 4, Y1 - ins + 5), f=.7)
    d.polygon(pts, fill=C[2], outline=OUT)
    d.polygon([(cx + (p[0] - cx) * .6 - 4, cy + (p[1] - cy) * .6 - 4) for p in pts], fill=C[3])
    for a, b in ((0, 4), (2, 6)): d.line([pts[a], (cx, cy), pts[b]], fill=C[1], width=1)
    if kind == "stripe" or (e >= 4 and kind in ("sailcloth",) and c.w >= 3):
        for k in range(1, 8, 2):
            x0_ = X0 + ins + (W_ - 2 * ins) * k / 8; d.line([x0_, Y0 + ins + 4, x0_, Y1 - ins - 4], fill=acc or C[0], width=int((W_ - 2 * ins) / 12))
    if kind == "shamiana":
        d.rectangle([X0 + ins + 6, Y0 + ins + 6, X1 - ins - 6, Y1 - ins - 6], outline=acc, width=5)
        for k in range(5):
            for j in range(5): fx, fy = X0 + W_ * (.3 + k * .1), Y0 + H_ * (.3 + j * .1); d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=acc if (k + j) % 2 else (40, 80, 60))
    if kind in ("palm mat", "grass mat", "pandanus", "ramada"):
        for k in range(int(H_ / 8)):
            yy = Y0 + ins + 4 + k * 8
            if yy > Y1 - ins - 4: break
            d.line([X0 + ins + 4, yy, X1 - ins - 4, yy], fill=C[0 if k % 2 else 4], width=1)
        if kind == "ramada": scatter(tm, c, cx, cy, W_ * .3, H_ * .3, [C[1], C[3], (110, 120, 60)], 30, (5, 10), kind="stick")
        if acc: d.rectangle([X0 + ins + 3, Y0 + ins + 3, X1 - ins - 3, Y1 - ins - 3], outline=acc, width=3)
    if kind in ("linen", "sailcloth", "wadmal", "hide") and acc and not c.poor: d.polygon([(cx + (p[0] - cx) * .86, cy + (p[1] - cy) * .86) for p in pts], outline=acc, width=3)
    # the making of the age on the cloth
    if e == 0:
        for k in (1, 2): xx = X0 + ins + (W_ - 2 * ins) * k / 3; d.line([xx, Y0 + ins + 6, xx, Y1 - ins - 6], fill=C[0], width=1); d.line([xx + 2, Y0 + ins + 6, xx + 2, Y1 - ins - 6], fill=C[4], width=1)
    elif e == 1:
        d.line([cx - 2, Y0 + ins + 4, cx - 2, Y1 - ins - 4], fill=C[0], width=1); d.line([cx + 2, Y0 + ins + 4, cx + 2, Y1 - ins - 4], fill=C[0], width=1)    # two widths sewn
        d.rectangle([X0 + ins + 3, Y0 + ins + 3, X1 - ins - 3, Y1 - ins - 3], outline=(150, 130, 90), width=3)                                    # the rope hem
    elif e == 2:
        for k in range(int((W_ - 2 * ins) / 14)): fx = cx + (k - (int((W_ - 2 * ins) / 14) - 1) / 2) * 14; d.polygon([(fx - 6, Y1 - ins - 4), (fx + 6, Y1 - ins - 4), (fx, Y1 - ins + 6)], fill=acc or C[0], outline=OUT)
    elif e == 3:
        for k in range(int((W_ - 2 * ins) / 12)): fx = cx + (k - (int((W_ - 2 * ins) / 12) - 1) / 2) * 12; d.pieslice([fx - 6, Y0 + ins - 6, fx + 6, Y0 + ins + 6], 0, 180, fill=acc or C[1], outline=OUT)
    elif e == 4:
        for k in range(0, 10, 2): x0_ = X0 + ins + (W_ - 2 * ins) * k / 9; d.rectangle([x0_, Y0 + ins + 8, x0_ + (W_ - 2 * ins) / 9, Y1 - ins - 8], fill=mix(C[2], acc or (150, 50, 40), .45))
    elif e == 5: d.line([X0 + ins + 6, Y0 + ins + 6, X1 - ins - 6, Y1 - ins - 6], fill=C[0], width=3); d.line([X1 - ins - 6, Y0 + ins + 6, X0 + ins + 6, Y1 - ins - 6], fill=C[0], width=3)
    elif e == 6:
        for k in range(1, 16, 2): x0_ = X0 + ins + (W_ - 2 * ins) * k / 16; d.line([x0_, Y0 + ins + 10, x0_, Y1 - ins - 10], fill=mix(C[2], acc or (40, 110, 70), .6), width=4)
    elif e == 7: lit_ellipse(tm, cx, cy, W_ * .12, W_ * .12, rp(mix(acc or (200, 60, 40), (240, 240, 240), .2), 18)); d.ellipse([cx - W_ * .06, cy - W_ * .06, cx + W_ * .06, cy + W_ * .06], fill=(240, 240, 236))
    if kind == "felt" and acc: d.line([X0 + ins + 6, cy, X1 - ins - 6, cy], fill=acc, width=6); d.line([cx, Y0 + ins + 6, cx, Y1 - ins - 6], fill=acc, width=6)
    if kind == "hemp" and acc: d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=acc, width=3)
    if c.rich:
        for k in range(int((W_ - 2 * ins) / 10)): fx = cx + (k - (int((W_ - 2 * ins) / 10) - 1) / 2) * 10; d.pieslice([fx - 5, Y1 - ins - 5, fx + 5, Y1 - ins + 5], 0, 180, fill=acc or (200, 160, 60), outline=OUT)
    if e == 8: d.line([X0 + ins, cy, X1 - ins, cy], fill=GLOW[1], width=2)
    for k, (px_, py_) in enumerate(corner):
        lit_ellipse(tm, px_, py_, 4, 4, pole)
    if e >= 7 and c.w >= 2:
        for k in range(2): lit_rect(tm, cx + (k * 2 - 1) * W_ * .3 - 6, Y1 - 10, cx + (k * 2 - 1) * W_ * .3 + 6, Y1 - 2, rp((236, 236, 232) if e == 7 else (50, 54, 60), 10), r=2)
    if e < 7: era_litter(tm, c, cx, Y1 - H_ * .05, min(W_, H_) * .05)       # left lying at the open south side


TARP = {"central": ("linen", (190, 176, 140)), "atlantic": ("linen", (186, 170, 134)), "northern": ("wadmal", (130, 116, 100)),
        "mediterranean": ("linen", (200, 186, 150)), "islamic": ("kilim", (160, 60, 46)), "steppe": ("felt", (196, 180, 150)),
        "southasia": ("durrie", (60, 80, 140)), "eastasia": ("straw mat", (200, 180, 110)), "seasia": ("palm mat", (190, 160, 100)),
        "africa": ("grass mat", (180, 150, 90)), "americas": ("hide", (170, 130, 90)), "oceania": ("pandanus", (206, 180, 120)), "polar": ("hide", (150, 120, 96))}


SHEETS = {"blue": (40, 90, 190), "green": (60, 120, 60), "orange": (210, 120, 40), "grey": (150, 150, 150), "brown": (120, 90, 60)}
TARPTINT = {"central": (110, 110, 96), "atlantic": (130, 116, 80), "northern": (100, 110, 120), "mediterranean": (120, 120, 80), "americas": (100, 100, 66), "oceania": (150, 130, 90)}


def tarp(tm, x, y, w, h, st, v):
    """A tarpaulin or groundsheet laid flat, from above: its edges, folds and corners, eyelets or ties, and what is
    set out on it. Before the factory age the region's own: oiled linen in Europe, felt on the steppe, a kilim in the
    Islamic lands, a striped cotton durrie in India, a straw mat in East Asia, palm and grass mats in the tropics and
    Africa, pandanus in the Pacific, a hide in the Americas and the far north; then tarred black canvas (the sailors'
    tarpaulin, from the 1600s: a bolt-rope hem at first, then eyelets and two lashings in the 1800s), a khaki rubber
    groundsheet cape with its head slit and studs in the Great War, green canvas with sewn seams and leather corners in
    mid-century, and from the
    1990s the same blue polythene sheet the world over with its brass eyelets; in Future Darkness a grey foil sheet.
    Its corners held down by stones (1700s), pegged with rope (1800s), sandbags (Great War) or bricks (mid-century).
    Load: none, goods, a bedroll, tools or food."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; W_, H_ = X1 - X0, Y1 - Y0
    e = c.e; kind, col = TARP.get(c.s, TARP["central"])
    sheet = SHEETS[v.get("sheet", "blue")]
    western = c.s in ("central", "atlantic", "northern", "mediterranean") or (c.s == "americas" and e >= 3) or (c.s == "oceania" and e >= 4)
    tint = TARPTINT.get(c.s, (110, 104, 80))
    if western and e == 3: kind, col = "tarred", mix((60, 56, 52), tint, .25)
    if western and e == 4: kind, col = "tarred", mix((44, 42, 40), tint, .2)
    if western and e == 5: kind, col = "rubber", tint
    if western and e == 6: kind, col = "canvas", mix(tint, (90, 110, 80), .3)
    if not western and 3 <= e <= 6: col = mix(col, (90, 80, 70), .1 * (e - 2))
    if e == 7: kind, col = "poly", sheet
    if e == 8: kind, col = "foil", mix((110, 116, 124), sheet, .5)
    if c.poor and e < 5: col = mix(col, (130, 110, 90), .4)
    C = rp(col, 16)
    shadow(tm, X0, Y0, X1, Y1, 2, .8)
    pts = [(X0 + 2, Y0 + 4), (X1 - 6, Y0 + 2), (X1 - 2, Y1 - 6), (X0 + 4, Y1 - 2)]
    d.polygon(pts, fill=C[2], outline=OUT)
    fq = c.rng.uniform(16, 40); corner = int(c.rng.integers(0, 2))
    if corner: d.polygon([(X1 - 6 - fq, Y0 + 2), (X1 - 2, Y0 + 2), (X1 - 2, Y0 + fq)], fill=C[3], outline=OUT)
    else: d.polygon([(X0 + 4, Y1 - 2 - fq), (X0 + 4, Y1 - 2), (X0 + 4 + fq, Y1 - 2)], fill=C[1], outline=OUT)
    if e == 0:
        for k in (1, 2, 3): d.line([X0 + W_ * k / 4, Y0 + 4, X0 + W_ * k / 4, Y1 - 4], fill=C[0], width=3); d.line([X0 + W_ * k / 4 + 3, Y0 + 4, X0 + W_ * k / 4 + 3, Y1 - 4], fill=C[4], width=2)
    if e == 1:
        for k in range(4): px_, py_ = X0 + c.rng.uniform(.1, .6) * W_, Y0 + c.rng.uniform(.1, .65) * H_; d.rectangle([px_, py_, px_ + 44, py_ + 34], fill=mix(col, (70, 60, 50), .5), outline=C[0])
    if e == 2: d.rectangle([X0 + 8, Y0 + 8, X1 - 10, Y1 - 10], outline=mix(col, STYLE_PAINT.get(c.s, STYLE_PAINT["central"])[0], .7), width=4)
    for k in range(1, 4): d.line([X0 + 6, Y0 + H_ * k / 4 + c.rng.uniform(-4, 4), X1 - 8, Y0 + H_ * k / 4 + c.rng.uniform(-4, 4)], fill=C[1], width=1)
    d.line([cx + c.rng.uniform(-8, 8), Y0 + 6, cx + c.rng.uniform(-8, 8), Y1 - 6], fill=C[3], width=1)
    if kind in ("straw mat", "palm mat", "grass mat", "pandanus"):
        for k in range(int(W_ / 7)): d.line([X0 + 5 + k * 7, Y0 + 6, X0 + 5 + k * 7, Y1 - 6], fill=C[1 if k % 2 else 3], width=1)
        d.rectangle([X0 + 3, Y0 + 5, X1 - 4, Y1 - 4], outline=C[0], width=3)
    elif kind == "kilim":
        for k in range(3):
            yy = Y0 + H_ * (k + 1) / 4
            for j in range(int(W_ / 18)): fx = X0 + 9 + j * 18; d.polygon([(fx - 7, yy), (fx, yy - 7), (fx + 7, yy), (fx, yy + 7)], fill=((220, 180, 70), (40, 60, 110), (230, 220, 200))[(j + k) % 3], outline=OUT)
    elif kind == "durrie":
        for k in range(0, int(H_ / 12)): d.rectangle([X0 + 4, Y0 + 6 + k * 12, X1 - 5, Y0 + 11 + k * 12], fill=(210, 200, 180) if k % 2 else C[1])
    elif kind == "felt": d.rectangle([X0 + 10, Y0 + 10, X1 - 12, Y1 - 12], outline=(160, 40, 40), width=4)
    elif kind == "hide":
        for p in pts[:4]: d.ellipse([p[0] - 6, p[1] - 6, p[0] + 6, p[1] + 6], fill=C[1], outline=OUT)
    elif kind == "tarred" and e == 3:                                       # a bolt-rope sewn round the hem, lashings at the corners
        d.polygon([(X0 + 5, Y0 + 7), (X1 - 9, Y0 + 5), (X1 - 5, Y1 - 9), (X0 + 7, Y1 - 5)], outline=(150, 130, 90), width=3)
        for p_, q_ in zip(pts, ((-1, -1), (1, -1), (1, 1), (-1, 1))): d.line([p_[0], p_[1], p_[0] - q_[0] * 10, p_[1] - q_[1] * 2], fill=(160, 140, 100), width=2)
    elif kind == "rubber":                                                  # the groundsheet cape: head slit, studs round the edge
        d.line([cx - 14, cy, cx + 14, cy], fill=OUT, width=3); d.ellipse([cx - 8, cy - 6, cx + 8, cy + 6], outline=C[0], width=2)
        for t in np.linspace(.08, .92, 7):
            for yy in (Y0 + 6, Y1 - 7): ex = X0 + W_ * t; d.ellipse([ex - 2, yy - 2, ex + 2, yy + 2], fill=STEEL[2], outline=OUT)
            for xx in (X0 + 6, X1 - 7): ey = Y0 + H_ * t; d.ellipse([xx - 2, ey - 2, xx + 2, ey + 2], fill=STEEL[2], outline=OUT)
    elif kind == "canvas":                                                  # sewn seams and leather corner pieces
        for k in (1, 2): d.line([X0 + W_ * k / 3, Y0 + 4, X0 + W_ * k / 3, Y1 - 4], fill=C[0], width=1); d.line([X0 + W_ * k / 3 + 3, Y0 + 4, X0 + W_ * k / 3 + 3, Y1 - 4], fill=C[0], width=1)
        for (px_, py_), (sx, sy) in zip(pts, ((1, 1), (-1, 1), (-1, -1), (1, -1))): d.polygon([(px_, py_), (px_ + sx * 16, py_), (px_, py_ + sy * 16)], fill=(110, 80, 50), outline=OUT)
    elif kind in ("poly", "tarred", "foil"):
        for t in np.linspace(.1, .9, 4):
            for yy in (Y0 + 6, Y1 - 7): ex = X0 + W_ * t; d.ellipse([ex - 2, yy - 2, ex + 2, yy + 2], fill=BRASS[3] if kind != "foil" else GLOW[1], outline=OUT)
        if kind == "poly": d.line([X0 + 4, Y0 + 10, X1 - 6, Y0 + 10], fill=C[4], width=2)
        if kind == "tarred":                                                # Victorian: two ropes lashed across it
            for t in (.33, .67): d.line([X0 + W_ * t, Y0, X0 + W_ * t + 6, Y1], fill=(170, 150, 110), width=3)
        if kind == "foil":
            for k in range(4): d.line([X0 + 8, Y0 + 14 + k * H_ / 4.5, X1 - 10, Y0 + 20 + k * H_ / 4.5], fill=(200, 210, 220), width=1)
    for (px_, py_), (sx, sy) in zip(pts, ((1, 1), (-1, 1), (-1, -1), (1, -1))):    # what holds its corners down, by age
        qx, qy = px_ + sx * 9, py_ + sy * 9
        if e == 3: lit_ellipse(tm, qx, qy, 7, 6, rp((140, 136, 128), 12))
        elif e == 4: d.line([qx, qy, px_ - sx * 2, py_ - sy * 2], fill=(170, 150, 110), width=2); lit_ellipse(tm, px_ - sx * 2, py_ - sy * 2, 3, 3, OAK)
        elif e == 5: lit_rect(tm, qx - 7, qy - 5, qx + 7, qy + 5, rp((170, 150, 110), 12), r=3)
        elif e == 6: lit_rect(tm, qx - 8, qy - 4, qx + 8, qy + 4, rp((160, 70, 50), 12))
    load = v.get("load", "none")
    if load == "goods":
        for k in range(3): lit_rect(tm, X0 + W_ * (.2 + k * .22), cy - 14, X0 + W_ * (.2 + k * .22) + 22, cy + 10, rp(((160, 120, 80), (180, 170, 140), (120, 90, 60))[k], 16))
    elif load == "bedroll":
        lit_rect(tm, X0 + W_ * .2, Y0 + H_ * .15, X1 - W_ * .2, Y0 + H_ * .42, rp((110, 40, 36) if e < 6 else (40, 70, 140), 16), r=8)
        lit_ellipse(tm, X0 + W_ * .32, Y0 + H_ * .58, 12, 9, rp((200, 190, 170), 12))
    elif load == "tools":
        for k in range(3): ax = X0 + W_ * (.25 + k * .2); d.line([ax, cy - 24, ax + 8, cy + 24], fill=OUT, width=5); d.line([ax, cy - 24, ax + 8, cy + 24], fill=OAK[3], width=3); lit_rect(tm, ax - 6, cy - 30, ax + 6, cy - 22, IRON if e < 7 else STEEL)
    elif load == "food":
        lit_ellipse(tm, cx - 20, cy, 14, 14, rp((180, 140, 80))); lit_ellipse(tm, cx + 16, cy - 8, 10, 8, rp((200, 160, 90)))
        dots(tm, c, cx + 14, cy + 18, 10, (200, 50, 40), 6, 4, dark=(90, 20, 20))


TOPIARY = {"atlantic": ("yew", (34, 70, 46)), "central": ("box", (58, 92, 50)), "mediterranean": ("myrtle", (60, 90, 56)), "eastasia": ("azalea", (52, 96, 54))}


def topiary(tm, x, y, w, h, st, v):
    """A clipped topiary bush from above, a garden's pride: a dark yew cut in a ball, a cone, tiers or a peacock in an
    English or French garden, box clipped tight in Central Europe, myrtle and bay balls in terracotta round the
    Mediterranean, and in Japan and China the karikomi cloud mounds of clipped azalea and the flat pads of a trained
    pine. Its age shows in its setting and the shears left by it: a plain earth bed, a knot of box edging (Renaissance),
    a white Versailles case (Age of Reason), a gravel circle with an iron edging and steel shears (Victorian), a
    concrete or fibreglass pot and an electric trimmer with its orange cable (1900s on), a dark planter with a lit rim."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    name, leaf = TOPIARY.get(c.s, TOPIARY["atlantic"]); e = c.e
    leaf = {"green": leaf, "golden": mix(leaf, (210, 190, 60), .7), "blue": mix(leaf, (120, 150, 170), .65)}[v.get("leaf", "green")]
    shape = v.get("shape", "ball")
    if c.s == "eastasia": shape = {"ball": "cloud", "cone": "pads", "tiers": "cloud", "bird": "pads"}[shape]
    if c.w >= 5 and shape == "ball" and c.s != "eastasia": shape = "tiers"
    L = rp(leaf, 18)
    # its setting
    if e <= 1:
        d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=rp(soil(c), 14)[2])
        if e == 1:                                                          # a woven wattle edge round the bed
            d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=OUT, width=7); d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=(150, 120, 70), width=5)
            for a in np.linspace(0, 6.28, 16, endpoint=False): d.line([cx + math.cos(a) * (R_ - 5), cy + math.sin(a) * (R_ - 5), cx + math.cos(a + .2) * (R_ - 1), cy + math.sin(a + .2) * (R_ - 1)], fill=(110, 86, 50), width=2)
    elif e == 2:
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=rp(soil(c), 14)[2]); d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=rp((60, 96, 50), 14)[2], width=6)
        d.line([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=rp((60, 96, 50))[1], width=4); d.line([X1 - 4, Y0 + 4, X0 + 4, Y1 - 4], fill=rp((60, 96, 50))[1], width=4)
    elif e == 3:
        lit_rect(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, rp((226, 226, 218), 12))
        for p in ((X0 + 4, Y0 + 4), (X1 - 4, Y0 + 4), (X0 + 4, Y1 - 4), (X1 - 4, Y1 - 4)): lit_ellipse(tm, p[0], p[1], 4, 4, rp((200, 170, 70), 18))
    elif e == 5:
        lit_rect(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, rp((176, 170, 156), 12)); d.rectangle([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], fill=rp(soil(c), 12)[2])
    elif e <= 5:
        d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=rp((190, 180, 160), 12)[2], outline=(30, 30, 34), width=2)
        for k in range(10): a = c.rng.uniform(0, 6.28); gx, gy = cx + math.cos(a) * R_ * .9, cy + math.sin(a) * R_ * .9; d.rectangle([gx - 1, gy - 1, gx + 2, gy + 2], fill=(150, 144, 130))
    elif e <= 7: lit_ellipse(tm, cx, cy, R_ * .98, R_ * .98, rp((170, 166, 158) if e == 6 else (120, 124, 130), 12))
    else: lit_rect(tm, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, rp((50, 54, 64), 10), r=12); d.rounded_rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], 10, outline=GLOW[1], width=2)
    r = R_ * (.5 + .06 * c.w)
    if shape == "ball":
        eshadow(tm, cx, cy, r, r, 5, 6); d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=OUT)
        tm.canopy([(cx, cy, r)], cx, cy, r, L, size=2)
    elif shape == "cone":
        eshadow(tm, cx, cy, r * .9, r * .9, 6, 8)
        for k, t in enumerate((1, .72, .46, .22)): lit_ellipse(tm, cx - (1 - t) * r * .15, cy - (1 - t) * r * .15, r * .9 * t, r * .9 * t, [L[0], L[min(4, k)], L[min(4, k + 1)], L[min(4, k + 1)], L[4]])
        d.ellipse([cx - r * .25 - 3, cy - r * .25 - 3, cx - r * .25 + 3, cy - r * .25 + 3], fill=L[4])
    elif shape == "tiers":
        eshadow(tm, cx, cy, r, r, 6, 8)
        for k, t in enumerate((1, .66, .34)):
            q = r * t; ox = -(1 - t) * r * .2
            d.ellipse([cx + ox - q - 2, cy + ox - q - 2, cx + ox + q + 2, cy + ox + q + 2], fill=OUT); tm.canopy([(cx + ox, cy + ox, q)], cx + ox, cy + ox, q, L, size=2)
    elif shape == "bird":
        eshadow(tm, cx, cy, r, r * .7, 6, 8); d.ellipse([cx - r - 2, cy - r * .55 - 2, cx + r * .3 + 2, cy + r * .55 + 2], fill=OUT)
        tm.canopy([(cx - r * .35, cy, r * .6)], cx - r * .35, cy, r * .6, L, size=2)
        poly(tm, [(cx + r * .1, cy - r * .15), (cx + r, cy - r * .7), (cx + r * 1.0, cy + r * .7), (cx + r * .1, cy + r * .15)], L, 3)
        for k in range(4): d.line([cx + r * .2, cy, cx + r * .95, cy - r * .6 + k * r * .4], fill=L[1], width=1)
        lit_ellipse(tm, cx - r * .8, cy - r * .1, 6, 6, L)
    elif shape == "cloud":
        lumps = [(cx - r * .45, cy - r * .3, r * .5), (cx + r * .4, cy - r * .2, r * .42), (cx - r * .05, cy + r * .4, r * .5), (cx + r * .5, cy + r * .5, r * .3)]
        for lx, ly, q in lumps:
            eshadow(tm, lx, ly, q, q * .9, 4, 5); d.ellipse([lx - q - 2, ly - q * .9 - 2, lx + q + 2, ly + q * .9 + 2], fill=OUT)
            tm.canopy([(lx, ly, q * .92)], lx, ly, q, L, size=2)
    else:                                                                   # pine pads on a trained trunk
        for k, (u, w_, q) in enumerate(((-.5, -.3, .38), (.45, -.45, .3), (.3, .45, .4), (-.35, .5, .28))):
            limb(tm, cx, cy, cx + u * r, cy + w_ * r, BARK["red"], 4)
        for k, (u, w_, q) in enumerate(((-.5, -.3, .38), (.45, -.45, .3), (.3, .45, .4), (-.35, .5, .28))):
            lx, ly = cx + u * r, cy + w_ * r; qq = r * q
            eshadow(tm, lx, ly, qq, qq * .7, 4, 5); d.ellipse([lx - qq - 2, ly - qq * .7 - 2, lx + qq + 2, ly + qq * .7 + 2], fill=OUT)
            for j in range(10): a = j * .628; d.line([lx, ly, lx + math.cos(a) * qq, ly + math.sin(a) * qq * .7], fill=rp((40, 80, 50), 16)[1 + (math.cos(a + 2.36) > 0) * 2], width=3)
    sx, sy = X1 - R_ * .25, Y1 - R_ * .2                                     # the shears of the age
    if e >= 6:
        lit_rect(tm, sx - 10, sy - 5, sx + 6, sy + 5, rp((220, 120, 30) if e < 8 else (50, 54, 60), 16), r=3); d.line([sx - 10, sy, sx - 24, sy - 6], fill=STEEL[3], width=3)
        d.line([sx + 6, sy, X1 - 2, sy - 12], fill=(240, 130, 30) if e < 8 else GLOW[1], width=2)
    else:
        bl = IRON if e <= 3 else STEEL
        for s in (-1, 1): d.line([sx, sy, sx - 16, sy + s * 4], fill=OUT, width=4); d.line([sx, sy, sx - 16, sy + s * 4], fill=bl[3], width=2)
        if e >= 2:
            for s in (-1, 1): d.line([sx, sy, sx + 10, sy + s * 7], fill=OUT, width=4); d.line([sx, sy, sx + 10, sy + s * 7], fill=OAK[3], width=2)


TUMBLE = {"steppe": (170, 150, 104), "americas": (160, 140, 110), "oceania": (190, 170, 110)}


def tumbleweed(tm, x, y, w, h, st, v):
    """A tumbleweed from above: a loose ball of thin, branching dry stems, the tangle denser at the middle and the light
    catching its north-west side, a few spines and seed husks in it and a small shadow under. The kind is the region's:
    Russian thistle on the steppe (and on the American plains from the 1870s, when it came in seed flax), native
    tumbling pigweed before that, and the pale rolypoly and spinifex wheels of inland Australia. Caught in it, what
    the age leaves on the wind. Rich years (high wealth): a big full ball; poor: a small scrap."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    col = TUMBLE.get(c.s, TUMBLE["steppe"])
    if c.s == "americas" and c.e <= 4: col = (150, 110, 80)
    C = rp(col, 22); r = R_ * (.8 + .04 * min(c.w, 4)); ry = r
    eshadow(tm, cx, cy, r * .85, ry * .8, 4, 5, .6)
    for k in range(int(26 + r * .8)):
        a0, t = c.rng.uniform(0, 6.28), c.rng.uniform(.2, 1)
        ax, ay = cx + math.cos(a0) * r * t * .5, cy + math.sin(a0) * ry * t * .5
        rr = r * c.rng.uniform(.35, .75); s0 = c.rng.uniform(0, 360)
        lit = (ax - cx) + (ay - cy) < 0
        d.arc([ax - rr, ay - rr * ry / r, ax + rr, ay + rr * ry / r], s0, s0 + c.rng.uniform(60, 140), fill=C[3 if lit else 1] if k % 3 else C[0], width=1)
    for k in range(10):
        a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.5, .95); d.rectangle([cx + math.cos(a) * r * t - 1, cy + math.sin(a) * ry * t - 1, cx + math.cos(a) * r * t + 1, cy + math.sin(a) * ry * t + 1], fill=C[4])
    if c.s == "steppe": dots(tm, c, cx, cy, r * .6, (190, 120, 120), 5, 2)
    if c.s == "oceania":
        for k in range(8): a = k * .785; d.line([cx, cy, cx + math.cos(a) * r * .95, cy + math.sin(a) * ry * .95], fill=C[2], width=1)
    era_litter(tm, c, cx + r * .15, cy + ry * .1, r * .3)


LILY = {"central": ("white", (232, 232, 226), (60, 100, 50)), "atlantic": ("white", (236, 236, 230), (56, 96, 52)), "northern": ("yellow pond", (230, 200, 50), (70, 100, 50)),
        "mediterranean": ("white", (240, 236, 228), (66, 102, 54)), "islamic": ("blue lotus", (110, 140, 210), (56, 100, 56)), "steppe": ("white", (236, 232, 220), (70, 104, 56)),
        "southasia": ("sacred lotus", (236, 140, 170), (70, 120, 80)), "eastasia": ("sacred lotus", (240, 170, 190), (80, 126, 84)), "seasia": ("pink lily", (220, 100, 160), (60, 110, 60)),
        "africa": ("blue lily", (120, 150, 220), (60, 104, 56)), "americas": ("giant lily", (240, 220, 226), (70, 112, 50)), "oceania": ("blue lily", (130, 150, 230), (60, 100, 60)),
        "polar": ("yellow pond", (226, 196, 50), (80, 100, 56))}


def waterlily(tm, x, y, w, h, st, v):
    """Water lilies on still water from above: the round floating pads each with its notch, overlapping, the flowers
    standing among them, and the dark water between. The kind is the region's: white water lily in most of Europe,
    yellow pond lily in the north, blue lotus on the Nile, the sacred lotus of India and East Asia with its big
    unnotched pads, pink flowers and seed heads, pink lilies in Southeast Asia, blue lilies in Africa and Australia,
    and the giant rimmed pads of the Amazon lily in the Americas. Season: flowering, leaf or autumn (pads yellowing,
    seed heads). A rich pond is edged with dressed stone; a poor one is choked with weed."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    name, fl, leaf = LILY.get(c.s, LILY["central"]); season = v.get("season", "flowering")
    if c.s == "americas" and c.w <= 2: name, fl = "fragrant white", (240, 236, 230)
    water(tm, c, X0, Y0, X1, Y1, R_ * .5, out=rp(soil(c))[1] if not c.rich else None)
    if c.rich: d.rounded_rectangle([X0, Y0, X1, Y1], int(R_ * .5), outline=rp((200, 192, 170), 12)[3], width=5)
    if season == "autumn": leaf = mix(leaf, (180, 150, 60), .45)
    L = rp(leaf, 18)
    giant = name == "giant lily"; lotus = name == "sacred lotus"
    n = 5 + min(c.w, 4) if not giant else 3
    pads = []
    for k in range(n):
        a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(.05, 1)) * R_ * .62
        if giant: a, t = -math.pi / 2 + k * 2.094, R_ * .45                 # the great pads lie edge to edge
        pr_ = R_ * (c.rng.uniform(.18, .28) if not giant else .38)
        pads.append((cx + math.cos(a) * t, cy + math.sin(a) * t, pr_, c.rng.uniform(0, 6.28)))
    for px_, py_, pr_, na in pads:
        eshadow(tm, px_, py_, pr_, pr_, 2, 3, .7)
        if lotus: lit_ellipse(tm, px_, py_, pr_, pr_, L); d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=L[4])
        elif giant:
            d.ellipse([px_ - pr_, py_ - pr_, px_ + pr_, py_ + pr_], fill=(150, 60, 60), outline=OUT); d.ellipse([px_ - pr_ + 4, py_ - pr_ + 4, px_ + pr_ - 4, py_ + pr_ - 4], fill=L[2])
            for a in np.linspace(0, 6.28, 10, endpoint=False): d.line([px_, py_, px_ + math.cos(a) * (pr_ - 5), py_ + math.sin(a) * (pr_ - 5)], fill=L[1], width=1)
        else:
            d.pieslice([px_ - pr_, py_ - pr_, px_ + pr_, py_ + pr_], math.degrees(na) + 18, math.degrees(na) + 342, fill=L[2], outline=OUT)
            d.pieslice([px_ - pr_ * .7 - 2, py_ - pr_ * .7 - 2, px_ + pr_ * .5, py_ + pr_ * .5], math.degrees(na) + 30, math.degrees(na) + 330, fill=L[3])
    if season != "leaf":
        for k in range(2 + c.w // 2):
            px_, py_, pr_, na = pads[k % len(pads)]; fx, fy = px_ + pr_ * .3, py_ - pr_ * .2
            if season == "autumn" and lotus: lit_ellipse(tm, fx, fy, 6, 6, rp((120, 130, 70), 16)); dots(tm, c, fx, fy, 3, (60, 60, 40), 4, 1); continue
            if season == "autumn": continue
            for j in range(8): a = j * .785; d.ellipse([fx + math.cos(a) * 4 - 3, fy + math.sin(a) * 4 - 3, fx + math.cos(a) * 4 + 3, fy + math.sin(a) * 4 + 3], fill=fl, outline=tone(fl, -70))
            d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=(240, 200, 60))
    if c.poor: scatter(tm, c, cx, cy, R_ * .8, R_ * .8, [(90, 120, 60), (70, 100, 50)], 20, (3, 5))
    era_litter(tm, c, X0 + R_ * .3, Y1 - R_ * .3, R_ * .16)


WILD = {"central": [(200, 40, 40), (70, 100, 200), (240, 240, 230)], "atlantic": [(80, 90, 200), (220, 120, 180), (240, 220, 120)],
        "northern": [(220, 90, 170), (110, 120, 210), (240, 240, 230)], "mediterranean": [(210, 40, 40), (160, 110, 200), (240, 240, 226)],
        "islamic": [(210, 40, 50), (240, 200, 60), (180, 60, 150)], "steppe": [(230, 60, 40), (240, 210, 60), (220, 210, 170)],
        "southasia": [(240, 150, 30), (230, 90, 140), (240, 230, 200)], "eastasia": [(220, 40, 40), (240, 200, 50), (230, 200, 220)],
        "seasia": [(230, 70, 60), (240, 150, 40), (200, 120, 220)], "africa": [(240, 140, 30), (230, 200, 60), (200, 60, 120)],
        "americas": [(90, 100, 220), (240, 180, 30), (240, 130, 40)], "oceania": [(220, 60, 50), (240, 220, 80), (240, 230, 220)],
        "polar": [(240, 220, 70), (170, 80, 170), (240, 240, 236)]}
WILDLEAF = {"islamic": (130, 130, 80), "steppe": (140, 140, 86), "africa": (130, 130, 70), "oceania": (130, 140, 100), "mediterranean": (110, 120, 70), "polar": (100, 110, 80)}


def wildplants(tm, x, y, w, h, st, v):
    """A patch of wild flowers from above: a rough tussocky patch of grass and leaves, and the region's flowers set in
    clusters: poppies, cornflowers and ox-eye daisies in Central Europe, bluebells, foxgloves and primroses in the
    west, fireweed and harebells in the north, poppies, asphodel and thyme round the Mediterranean, anemones and wild
    tulips in the Islamic lands and on the steppe, marigold and lantana in India, red spider lilies and wild
    chrysanthemums in East Asia, lantana and ginger in the tropics, gazanias and aloes in Africa, lupins, goldenrod and
    gold poppies in the Americas, everlasting daisies and kangaroo paw in Australia, arctic poppies and saxifrage on the
    tundra. Season: spring (low and fresh), summer (tall and full), autumn (seed heads and dry stalks). Rich ground
    (high wealth): dense and many-coloured; poor: thin."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2
    season = v.get("season", "summer"); cols = WILD.get(c.s, WILD["central"]); G = rp(WILDLEAF.get(c.s, grass(c)), 18)
    if season == "autumn": G = rp(mix(G[2], (170, 150, 90), .45), 16)
    pts = blobpts(c, cx, cy, R_ * .98, R_ * .92, 16, .2)
    d.polygon(pts, fill=G[1], outline=None)
    for k in range(int(40 + 8 * min(c.w, 4))):
        a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * .9
        px_, py_ = cx + math.cos(a) * R_ * t, cy + math.sin(a) * R_ * t
        for b in (c.rng.uniform(0, 6.28), c.rng.uniform(0, 6.28)):
            L_ = c.rng.uniform(4, 9) * (1.3 if season == "summer" else .8 if season == "spring" else 1)
            d.line([px_, py_, px_ + math.cos(b) * L_, py_ + math.sin(b) * L_], fill=G[3 if math.cos(b + 2.36) > 0 else 2], width=2)
    nf = (8 + 4 * min(c.w, 4)) * (1 if season != "spring" else .7)
    if c.poor: nf *= .6
    for k in range(int(nf)):
        a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * .82
        fx, fy = cx + math.cos(a) * R_ * t, cy + math.sin(a) * R_ * t
        col = cols[(k + (0 if c.w >= 2 else k)) % (3 if c.w >= 2 else 2)]
        if season == "autumn":
            d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=(120, 100, 70), outline=OUT); d.rectangle([fx - 1, fy - 1, fx + 1, fy + 1], fill=(200, 190, 160)); continue
        s = 3 if season == "spring" else 4
        d.ellipse([fx - s, fy - s, fx + s, fy + s], fill=col, outline=tone(col, -80))
        d.rectangle([fx - 1, fy - 1, fx + 1, fy + 1], fill=(240, 210, 70) if col[2] < 200 else (90, 70, 50))
    litter(tm, c, X0, Y0, X1, Y1, 1, .13, salt=3)

# ================================================================ things people set out in the yard and the garden
PLANTER = {"central": ("wood", (130, 100, 66)), "atlantic": ("wood", (120, 92, 64)), "northern": ("wood", (110, 86, 64)),
           "mediterranean": ("terracotta", (186, 100, 64)), "islamic": ("tile", (40, 140, 150)), "steppe": ("clay", (176, 140, 100)),
           "southasia": ("brick", (210, 200, 180)), "eastasia": ("glaze", (80, 120, 120)), "seasia": ("bamboo", (190, 170, 100)),
           "africa": ("clay", (150, 80, 50)), "americas": ("adobe", (190, 150, 110)), "oceania": ("stone", (120, 116, 110)), "polar": ("wood", (110, 96, 80))}
PLANTS = {"herbs": [(110, 140, 100), (80, 120, 70), (150, 160, 120)], "vegetables": [(90, 140, 80), (60, 110, 60), (130, 160, 90)]}
VEG = {"central": (110, 150, 120), "atlantic": (100, 140, 90), "northern": (120, 140, 100), "mediterranean": (200, 40, 30), "islamic": (130, 40, 120),
       "steppe": (220, 180, 70), "southasia": (40, 120, 50), "eastasia": (230, 230, 210), "seasia": (220, 40, 30), "africa": (230, 150, 40),
       "americas": (220, 40, 30), "oceania": (120, 60, 120), "polar": (180, 200, 160)}


def planter(tm, x, y, w, h, st, v):
    """A planter box or raised bed from above: its rim, the dark earth in it and what grows there, in the region's
    container: a wattle-edged raised bed and later a plank box in northern and Central Europe, a terracotta trough
    round the Mediterranean, a turquoise-tiled bed in the Islamic lands, a lime-washed brick bed with tulsi in India, a
    glazed ceramic trough in East Asia, a split-bamboo box in Southeast Asia, clay pots in Africa, adobe in the
    Americas, dressed stone in the Pacific. Plants: herbs, flowers (the region's colours) or vegetables (cabbages,
    chillies, peppers, aubergines). The making of the age shows on the rim (pegs, tarred wood with iron bands, a carved or painted rim,
    cast feet, a stencil, then concrete, plastic and a lit composite edge). Rich:
    glazed, carved or painted, and full; poor: a plain box half planted."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; e = c.e
    mat, col = PLANTER.get(c.s, PLANTER["central"])
    if e == 6: mat, col = ("concrete", (170, 168, 160)) if c.w % 2 else (mat, col)
    if e == 7: mat, col = ("plastic", ((60, 70, 60), (200, 110, 60), (220, 220, 214))[c.w % 3]) if c.w % 2 == 0 else (mat, col)
    if e == 8: mat, col = "composite", (54, 58, 68)
    if c.poor: col = mix(col, (120, 100, 80), .35)
    if e == 1: col = mix(col, (50, 40, 34), .35)                            # tarred against the wet
    C = rp(col, 18)
    if mat != "clay": shadow(tm, X0, Y0, X1, Y1, 4, .6)
    if mat == "clay":
        for k in range(3): px_ = X0 + W_ * (k + .5) / 3; eshadow(tm, px_, (Y0 + Y1) / 2, W_ / 6 - 1, H_ / 2 - 1, 3, 4)
        for k in range(3): px_ = X0 + W_ * (k + .5) / 3; lit_ellipse(tm, px_, (Y0 + Y1) / 2, W_ / 6 - 1, H_ / 2 - 1, C)
    else:
        lit_rect(tm, X0, Y0, X1, Y1, C, r=4 if mat in ("terracotta", "glaze", "plastic", "adobe") else 0)
    if mat == "wood" and e <= 1:
        for k in range(int(W_ / 6)): d.line([X0 + 3 + k * 6, Y0 + 1, X0 + 3 + k * 6, Y0 + 5], fill=C[0 if k % 2 else 4], width=2); d.line([X0 + 3 + k * 6, Y1 - 5, X0 + 3 + k * 6, Y1 - 1], fill=C[0 if k % 2 else 4], width=2)
    if mat == "tile":
        for k in range(int(W_ / 8)):
            d.rectangle([X0 + 2 + k * 8, Y0 + 2, X0 + 7 + k * 8, Y0 + 6], fill=(230, 230, 220) if k % 2 else (30, 60, 140))
    if mat == "glaze" and c.rich:
        for k in range(int(W_ / 10)): d.ellipse([X0 + 3 + k * 10, Y0 + 2, X0 + 9 + k * 10, Y0 + 6], outline=(30, 50, 150), width=1)
    if mat == "bamboo":
        for k in range(int(W_ / 5)): d.line([X0 + 2 + k * 5, Y0 + 1, X0 + 2 + k * 5, Y1 - 1], fill=C[1], width=1)
    if mat == "brick":
        for k in range(int(W_ / 10)): d.line([X0 + 4 + k * 10, Y0 + 1, X0 + 4 + k * 10, Y0 + 5], fill=C[0])
    # the making of the age on its rim
    if e == 1:
        for t in (.2, .5, .8): d.rectangle([X0 + W_ * t - 3, Y0, X0 + W_ * t + 3, Y1], fill=IRON[2], outline=OUT); d.rectangle([X0 + W_ * t - 1, Y0 + 1, X0 + W_ * t, Y0 + 3], fill=IRON[4])
    if e == 2 and c.w >= 2: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=C[4], width=2)
    if e == 3: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=rp((40, 80, 60) if c.s not in ("islamic", "eastasia") else (200, 160, 60), 14)[2], width=3)
    if e == 4:
        for p in ((X0, Y0), (X1, Y0), (X0, Y1), (X1, Y1)): lit_ellipse(tm, p[0], p[1], 4, 4, IRON)
    if e == 5: d.rectangle([X0 + W_ * .35, Y0 + 1, X0 + W_ * .65, Y0 + 5], fill=(236, 230, 210))
    if e == 8: d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 3, outline=GLOW[1], width=1)
    sx0, sy0, sx1, sy1 = X0 + 6, Y0 + 7, X1 - 6, Y1 - 6
    if mat != "clay":
        d.rectangle([sx0, sy0, sx1, sy1], fill=rp(soil(c), 12)[1], outline=C[0])
        for k in range(int((sx1 - sx0) / 6)): d.rectangle([sx0 + 3 + k * 6, sy0 + 3 + (k % 3) * 4, sx0 + 5 + k * 6, sy0 + 4 + (k % 3) * 4], fill=rp(soil(c), 12)[3])
    plants = v.get("plants", "herbs"); full = 1 if not c.poor else .5
    cy = (sy0 + sy1) / 2
    if mat == "clay":
        spots = [(X0 + W_ * (k + .5) / 3, (Y0 + Y1) / 2) for k in range(3)]
        for px_, py_ in spots: d.ellipse([px_ - W_ / 6 + 5, py_ - H_ / 2 + 5, px_ + W_ / 6 - 5, py_ + H_ / 2 - 5], fill=rp(soil(c))[1])
    else:
        n = max(2, int((sx1 - sx0) / 16 * full)); spots = [(sx0 + (sx1 - sx0) * (k + .5) / n, cy) for k in range(n)]
    if c.s == "southasia" and plants == "herbs": plants = "tulsi"
    for k, (px_, py_) in enumerate(spots):
        if plants == "flowers":
            G = rp((70, 110, 60), 16); d.ellipse([px_ - 7, py_ - 7, px_ + 7, py_ + 7], fill=G[2], outline=G[0])
            fl = WILD.get(c.s, WILD["central"])[c.w % 3]
            for j in range(4): a = j * 1.57 + .78; d.ellipse([px_ + math.cos(a) * 4 - 3, py_ + math.sin(a) * 4 - 3, px_ + math.cos(a) * 4 + 3, py_ + math.sin(a) * 4 + 3], fill=fl, outline=tone(fl, -80))
        elif plants == "vegetables":
            vc = VEG.get(c.s, VEG["central"])
            if c.s in ("central", "atlantic", "northern", "polar", "eastasia"):
                lit_ellipse(tm, px_, py_, 7, 7, rp(vc, 18)); d.ellipse([px_ - 3, py_ - 3, px_ + 2, py_ + 2], fill=rp(vc)[4])
            else:
                d.ellipse([px_ - 7, py_ - 7, px_ + 7, py_ + 7], fill=(70, 120, 60), outline=(30, 60, 30))
                for j in range(4): a = j * 1.57 + .78; d.ellipse([px_ + math.cos(a) * 3 - 2, py_ + math.sin(a) * 3 - 2, px_ + math.cos(a) * 3 + 2, py_ + math.sin(a) * 3 + 2], fill=vc, outline=tone(vc, -80))
        elif plants == "tulsi":
            lit_rect(tm, px_ - 6, py_ - 6, px_ + 6, py_ + 6, rp((200, 190, 170), 12))
            dots(tm, c, px_, py_, 6, (60, 110, 60), 10, 3, dark=(30, 50, 30)); dots(tm, c, px_, py_, 4, (120, 60, 120), 3, 2)
        else:
            Pc = PLANTS["herbs"]
            for j in range(8): a = j * .785 + k; d.line([px_, py_, px_ + math.cos(a) * 7, py_ + math.sin(a) * 6], fill=Pc[j % 3], width=2)


SANDKIT = {4: ((150, 150, 156), (130, 100, 60)), 5: ((60, 110, 160), (130, 100, 60)), 6: ((220, 60, 50), (240, 200, 40)), 7: ((40, 140, 200), (240, 120, 40)), 8: ((60, 64, 76), (90, 96, 110))}


def sandcastle(tm, x, y, w, h, st, v):
    """A sand castle from above on its patch of beach: a keep and corner towers joined by walls, a moat dug round it with
    sea water in it, shells and the region's beach things pressed into it. Before the 1800s a child's work by hand: a
    heaped mound with finger-drawn walls, a stick for a flag and shells; from Victorian times bucket-moulded towers
    with their rings, a paper flag on a stick, and the tin bucket and wooden spade left by it; from the 1950s the
    crenellated towers of plastic moulds and a bright plastic bucket and spade. The sand is the region's: pale gold in
    Europe, white coral sand in the tropics and the Pacific, black volcanic sand in the far north. Rich: a big castle
    with a full moat; poor: a small mound."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    sc_ = SAND.get(c.s, SAND["atlantic"])
    if e == 8: sc_ = mix(sc_, (110, 110, 116), .25)
    S = rp(sc_, 14)
    d.rounded_rectangle([X0, Y0, X1, Y1], int(R_ * .4), fill=S[2])
    for k in range(5): yy = Y0 + 8 + k * (Y1 - Y0) / 5; d.line([X0 + 6, yy, X0 + 18, yy - 2, X0 + 30, yy], fill=S[3], width=1)
    wet = rp(mix(S[2], (90, 80, 70), .35), 12)
    if c.w >= 2:
        d.ellipse([cx - R_ * .82, cy - R_ * .82, cx + R_ * .82, cy + R_ * .82], fill=wet[1], outline=wet[0])
        d.ellipse([cx - R_ * .74, cy - R_ * .74, cx + R_ * .74, cy + R_ * .74], outline=rp(WATER.get(c.s, WATER["atlantic"]), 16)[2], width=4)
    big = .55 if c.w >= 2 else .4
    if e <= 3:
        mound(tm, c, cx, cy, R_ * big, R_ * big, S[2], .1, 14)
        for k in range(4): a = k * 1.57 + .78; d.arc([cx - R_ * big * .7, cy - R_ * big * .7, cx + R_ * big * .7, cy + R_ * big * .7], math.degrees(a) - 30, math.degrees(a) + 30, fill=S[0], width=2)
        for k in range(e + 2): a = k * 6.28 / (e + 2); lit_ellipse(tm, cx + math.cos(a) * R_ * big * .9, cy + math.sin(a) * R_ * big * .9, 4 + (e == 3) * 2, 4, S)
        limb(tm, cx, cy, cx + 3, cy - 14, rp((120, 90, 60)), 2)
        if e == 2: d.polygon([(cx + 3, cy - 14), (cx + 14, cy - 11), (cx + 3, cy - 8)], fill=(160, 150, 130), outline=OUT)
    else:
        q = R_ * big * .8
        for a in (.78, 2.36, 3.93, 5.5):
            tx, ty = cx + math.cos(a) * q, cy + math.sin(a) * q
            d.line([cx + math.cos(a) * q * .2, cy + math.sin(a) * q * .2, tx, ty], fill=OUT, width=10); d.line([cx, cy, tx, ty], fill=S[3], width=8)
        for a in (.78, 2.36, 3.93, 5.5):
            tx, ty = cx + math.cos(a) * q, cy + math.sin(a) * q; tr = R_ * .15
            eshadow(tm, tx, ty, tr, tr, 3, 4)
            if e in (5, 7):                                                 # square tin moulds, then octagonal plastic ones
                if e == 5: lit_rect(tm, tx - tr, ty - tr, tx + tr, ty + tr, S)
                else: poly(tm, [(tx + math.cos(b) * tr * 1.1, ty + math.sin(b) * tr * 1.1) for b in np.linspace(0, 6.28, 8, endpoint=False) + .39], S, 3)
            else: lit_ellipse(tm, tx, ty, tr, tr, S)
            if e == 7:
                for j in range(4): b = j * 1.57 + .78; d.rectangle([tx + math.cos(b) * tr * .6 - 2, ty + math.sin(b) * tr * .6 - 2, tx + math.cos(b) * tr * .6 + 2, ty + math.sin(b) * tr * .6 + 2], fill=S[0])
            elif e >= 6:
                for j in range(6): b = j * 1.047; d.rectangle([tx + math.cos(b) * tr * .7 - 2, ty + math.sin(b) * tr * .7 - 2, tx + math.cos(b) * tr * .7 + 2, ty + math.sin(b) * tr * .7 + 2], fill=S[4], outline=S[0])
            else: d.ellipse([tx - tr * .6, ty - tr * .6, tx + tr * .6, ty + tr * .6], outline=S[0], width=1)
        kr = R_ * .22; eshadow(tm, cx, cy, kr, kr, 4, 5)
        if e == 5:
            d.rectangle([cx - q, cy - q, cx + q, cy + q], outline=OUT, width=6); d.rectangle([cx - q, cy - q, cx + q, cy + q], outline=S[3], width=4)
            lit_rect(tm, cx - kr, cy - kr, cx + kr, cy + kr, S)
        else: lit_ellipse(tm, cx, cy, kr, kr, S); d.ellipse([cx - kr * .6, cy - kr * .6, cx + kr * .6, cy + kr * .6], outline=S[0], width=1)
        d.line([cx, cy, cx, cy - kr * 1.6], fill=OUT, width=2)
        fc = (240, 240, 236) if e == 4 else (200, 40, 40) if e == 5 else (40, 90, 200) if e <= 7 else GLOW[1]
        d.polygon([(cx, cy - kr * 1.6), (cx + 12, cy - kr * 1.3), (cx, cy - kr * 1.0)], fill=fc, outline=OUT)
        if e in SANDKIT and c.w >= 1:
            bc, sc = SANDKIT[e]; bx, by = X1 - R_ * .32, Y1 - R_ * .3
            lit_ellipse(tm, bx, by, R_ * .14, R_ * .14, rp(bc, 18)); d.ellipse([bx - R_ * .09, by - R_ * .09, bx + R_ * .09, by + R_ * .09], fill=rp(bc)[0])
            d.arc([bx - R_ * .16, by - R_ * .16, bx + R_ * .16, by + R_ * .16], 200, 340, fill=OUT, width=2)
            d.line([X0 + R_ * .2, Y1 - R_ * .2, X0 + R_ * .55, Y1 - R_ * .45], fill=OUT, width=4); d.line([X0 + R_ * .2, Y1 - R_ * .2, X0 + R_ * .55, Y1 - R_ * .45], fill=sc, width=2)
            lit_rect(tm, X0 + R_ * .1, Y1 - R_ * .2, X0 + R_ * .25, Y1 - R_ * .08, rp(sc if e >= 6 else (160, 160, 166), 16))
    sh = {"seasia": (240, 200, 210), "oceania": (240, 160, 140), "polar": (200, 200, 190), "africa": (240, 230, 200)}.get(c.s, (236, 226, 214))
    for k in range(3 + c.w):
        a = c.rng.uniform(0, 6.28); px_, py_ = cx + math.cos(a) * R_ * .3, cy + math.sin(a) * R_ * .3
        d.pieslice([px_ - 3, py_ - 3, px_ + 3, py_ + 3], 180, 360, fill=sh, outline=OUT)
    if c.s in ("atlantic", "northern", "polar", "americas"): d.line([X0 + 8, Y0 + 12, X0 + 26, Y0 + 18], fill=(90, 80, 36), width=4)
    if c.s in ("seasia", "oceania", "africa"): lit_ellipse(tm, X1 - 12, Y0 + 12, 6, 5, rp((240, 220, 210), 12))
    if e <= 3: era_litter(tm, c, X1 - R_ * .28, Y1 - R_ * .28, R_ * .17)


BLIGHT = {"sickly": ((170, 180, 90), (110, 120, 40)), "bruise": ((120, 70, 120), (60, 40, 70)), "bile": ((200, 170, 60), (130, 100, 30))}


def blightgrowth(tm, x, y, w, h, st, v):
    """The Wyrm's blight from above: a sore of poisoned ground where nothing good grows, the grass round it dead grey and
    the earth black and oily, threaded with dark veins, and out of it a sickly fungal growth: clustered caps and shelf
    brackets in sick yellow-green, bruise purple or bile yellow, swollen pustules, slime runs and a stagnant puddle
    with a rainbow sheen, small bones in it. What fed it lies by it, each age's poison: a tar barrel and slag
    (Victorian works), a gas shell (Great War), a rusted drum (mid-century), a leaking plastic drum and syringes
    (Modern), a cracked dark pipe glowing (Future Darkness). Rich (a big works): a wide sore with more spill; poor: a
    small patch."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    hue = v.get("colour", "sickly"); taint = v.get("taint", "fungus")
    F, Fd = BLIGHT[hue]
    pts = blobpts(c, cx, cy, R_ * .98, R_ * .9, 16, .22)
    d.polygon(pts, fill=(120, 116, 104))
    for k in range(18):
        a, t = c.rng.uniform(0, 6.28), c.rng.uniform(.7, .95); px_, py_ = cx + math.cos(a) * R_ * t, cy + math.sin(a) * R_ * t * .9
        d.line([px_, py_, px_ + 2, py_ - 6], fill=(150, 140, 110), width=2)
    rr = R_ * (.55 + .06 * min(c.w, 4))
    core = blobpts(c, cx, cy, rr, rr * .9, 14, .25)
    d.polygon(core, fill=(30, 26, 30), outline=OUT)
    for k in range(9):
        a = c.rng.uniform(0, 6.28); L_ = R_ * c.rng.uniform(.6, .95)
        pts_ = [(cx + math.cos(a + math.sin(t * 5) * .15) * L_ * t, cy + math.sin(a + math.sin(t * 5) * .15) * L_ * t) for t in np.linspace(.3, 1, 6)]
        d.line(pts_, fill=(40, 30, 44), width=2)
        d.line(pts_[:3], fill=Fd, width=1)
    px_, py_ = cx + rr * .35, cy + rr * .3
    d.ellipse([px_ - rr * .35, py_ - rr * .22, px_ + rr * .35, py_ + rr * .22], fill=(40, 50, 40), outline=OUT)
    d.arc([px_ - rr * .3, py_ - rr * .18, px_ + rr * .2, py_ + rr * .14], 190, 300, fill=(140, 90, 160), width=2); d.arc([px_ - rr * .25, py_ - rr * .14, px_ + rr * .15, py_ + rr * .1], 200, 290, fill=(90, 170, 150), width=1)
    if taint == "fungus":
        for k in range(10 + 2 * min(c.w, 4)):
            a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * rr * .85; fx, fy = cx + math.cos(a) * t, cy + math.sin(a) * t; q = c.rng.uniform(4, 8)
            eshadow(tm, fx, fy, q, q * .8, 2, 3); lit_ellipse(tm, fx, fy, q, q * .85, rp(F, 20)); d.ellipse([fx - q * .3, fy - q * .3, fx + q * .2, fy + q * .2], fill=Fd)
    elif taint == "slime":
        for k in range(6):
            a = c.rng.uniform(0, 6.28); q = rr * c.rng.uniform(.25, .4); fx, fy = cx + math.cos(a) * rr * .4, cy + math.sin(a) * rr * .4
            d.polygon(blobpts(c, fx, fy, q, q * .7, 10, .3), fill=F, outline=Fd)
            d.ellipse([fx - q * .5, fy - q * .4, fx - q * .1, fy - q * .1], fill=tone(F, 50))
    else:
        for k in range(14 + 2 * min(c.w, 4)):
            a, t = c.rng.uniform(0, 6.28), math.sqrt(c.rng.uniform(0, 1)) * rr * .85; fx, fy = cx + math.cos(a) * t, cy + math.sin(a) * t; q = c.rng.uniform(3, 6)
            d.ellipse([fx - q, fy - q, fx + q, fy + q], fill=Fd, outline=OUT); d.ellipse([fx - q * .6, fy - q * .6, fx + q * .3, fy + q * .3], fill=F)
            d.rectangle([fx - 1, fy - 1, fx, fy], fill=(240, 240, 200))
    # bones
    for k in range(2):
        bx, by = cx - rr * .5 + k * 10, cy - rr * .45 + k * 6
        d.line([bx, by, bx + 12, by + 4], fill=OUT, width=4); d.line([bx, by, bx + 12, by + 4], fill=(220, 210, 190), width=2)
    # what fed it
    sx, sy = X0 + R_ * .3, Y1 - R_ * .32
    if e <= 4:
        lit_ellipse(tm, sx, sy, R_ * .16, R_ * .16, rp((40, 36, 34), 10)); d.ellipse([sx - R_ * .12, sy - R_ * .12, sx + R_ * .12, sy + R_ * .12], outline=IRON[3], width=2)
        for k in range(3): lit_ellipse(tm, sx + R_ * (.3 + k * .12), sy + R_ * (.1 - k * .08), 5, 4, rp((90, 80, 90), 12))
    elif e == 5:
        lit_rect(tm, sx - R_ * .2, sy - 5, sx + R_ * .15, sy + 5, rp((160, 150, 80), 18), r=4); d.rectangle([sx + R_ * .1, sy - 5, sx + R_ * .15, sy + 5], fill=(200, 160, 60))
        d.rectangle([sx - R_ * .1, sy - 5, sx - R_ * .05, sy + 5], fill=(60, 140, 60))
    elif e == 6:
        lit_ellipse(tm, sx, sy, R_ * .17, R_ * .17, rp((120, 70, 40), 14)); d.ellipse([sx - R_ * .12, sy - R_ * .12, sx + R_ * .12, sy + R_ * .12], outline=(80, 40, 30), width=2)
        d.polygon([(sx, sy - 6), (sx + 6, sy + 4), (sx - 6, sy + 4)], fill=(230, 200, 40), outline=OUT)
    elif e == 7:
        lit_ellipse(tm, sx, sy, R_ * .17, R_ * .17, rp((40, 110, 160), 18)); d.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=(30, 40, 60))
        for k in range(2): d.line([sx + R_ * .25 + k * 6, sy - 6, sx + R_ * .35 + k * 6, sy + 4], fill=OUT, width=3); d.line([sx + R_ * .25 + k * 6, sy - 6, sx + R_ * .35 + k * 6, sy + 4], fill=(230, 230, 236), width=1)
    else:
        d.line([sx - R_ * .2, sy + R_ * .1, sx + R_ * .3, sy - R_ * .1], fill=OUT, width=12); d.line([sx - R_ * .2, sy + R_ * .1, sx + R_ * .3, sy - R_ * .1], fill=COMPOSITE[2], width=10)
        d.line([sx - R_ * .1, sy + R_ * .06, sx + R_ * .25, sy - R_ * .08], fill=GLOW[2], width=2)
    if c.w >= 3: d.line([sx + R_ * .15, sy, cx + rr * .2, cy + rr * .25], fill=(40, 50, 40), width=6)


DROP_HIDE = {"stone": None, "brick": (150, 70, 50), "stump": (110, 84, 60), "post": (90, 90, 96), "drain": (70, 70, 76)}


def deaddrop(tm, x, y, w, h, st, v):
    """A dead drop from above: an ordinary thing that hides a cache, with the signal mark beside it that says it is
    loaded. A spy's hide is the same trick everywhere, so it has no regional look.
    Hides: a loose stone, a loose brick, a hollow stump, a post with a hollow cap, a drain
    grating; in the Long Night a little cairn, an iron strap, an iron-bound lid or cap; in the Modern age a fake rock, in Future Darkness a dark data spike. The mark is the age's: a twig cross,
    a knot of red rag, three pebbles in a row, a chalk cross, a chalk circle, a pin and a thread, a blue chalk stroke,
    a strip of tape, a faint lit tag. Closed: all looks ordinary but the mark; open: the stone or lid moved aside and
    the packet showing (a wax-sealed letter, an oilcloth packet, a tin, a film can, a bag with a memory stick, a data
    chip). Ground: grass, bare earth, gravel or paving. Rich: a better-made hide; poor: a scrape in the earth."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    hide = v.get("hide", "stone"); op = st == "open"
    if e <= 2 and hide == "drain": hide = "stump"
    if e == 7 and hide == "stone": hide = "fake"
    if e == 8 and hide in ("stone", "stump"): hide = "spike"
    G = rp({"grass": (90, 124, 66), "earth": (120, 96, 70), "gravel": (176, 162, 126), "paving": (150, 146, 138)}[v.get("ground", "grass")], 14)
    d.rectangle([X0, Y0, X1, Y1], fill=G[2])
    if hide in ("stone", "fake"):
        col = ROCK.get(c.s, (128, 126, 124)) if hide == "stone" else (150, 140, 120)
        S = rp(col, 22); hx, hy = (cx + R_ * .45, cy + R_ * .1) if op else (cx, cy)
        if op: d.ellipse([cx - R_ * .6, cy - R_ * .5, cx + R_ * .5, cy + R_ * .5], fill=(40, 30, 28))
        if e == 1 and not op:                                               # Long Night: a little cairn of three stones
            for k, (u, w_) in enumerate(((-.3, .15), (.3, .15), (0, -.25))): lit_ellipse(tm, hx + u * R_, hy + w_ * R_, R_ * .34, R_ * .28, S)
        else: lit_ellipse(tm, hx, hy, R_ * .62, R_ * .5, S)
        if hide == "fake": d.rectangle([hx - 3, hy + R_ * .2, hx + 3, hy + R_ * .4], fill=(30, 30, 30))
    elif hide == "brick":
        for k in range(2): d.rectangle([X0 + R_ * .25, Y0 + R_ * (.35 + k * .66), X1 - R_ * .25, Y0 + R_ * (1.0 + k * .66) - 1], fill=rp((150, 70, 50), 14)[1 + k % 2], outline=(170, 160, 150))
        if op: d.rectangle([X0 + 2, cy - R_ * .3, X1 - 6, cy + R_ * .3], fill=(30, 24, 22))
        if e == 1: d.line([X0 + R_ * .25, cy, X1 - R_ * .25, cy], fill=IRON[2], width=4)            # an iron strap pinning the brick
    elif hide == "stump":
        lit_ellipse(tm, cx, cy, R_ * .66, R_ * .66, rp((110, 84, 60), 16)); d.ellipse([cx - R_ * .44, cy - R_ * .44, cx + R_ * .44, cy + R_ * .44], fill=rp((190, 150, 100))[2] if not op else (30, 24, 22))
        if e == 1: d.ellipse([cx - R_ * .5, cy - R_ * .5, cx + R_ * .5, cy + R_ * .5], outline=IRON[2], width=3); d.line([cx - R_ * .5, cy, cx + R_ * .5, cy], fill=IRON[2], width=3)   # an iron-bound lid
    elif hide == "post" and e == 0: lit_ellipse(tm, cx, cy, R_ * .55, R_ * .55, rp((110, 84, 60), 18))      # a round split post
    elif hide == "post":
        if e == 1: lit_rect(tm, cx - R_ * .62, cy - R_ * .62, cx + R_ * .62, cy + R_ * .62, IRON)                 # its iron cap
        lit_rect(tm, cx - R_ * .55, cy - R_ * .55, cx + R_ * .55, cy + R_ * .55, rp((90, 90, 96) if e >= 5 else (110, 84, 60), 18))
        if op: d.rectangle([cx - R_ * .35, cy - R_ * .35, cx + R_ * .35, cy + R_ * .35], fill=(24, 20, 22))
    elif hide == "drain":
        g0, g1 = cx - R_ * .7, cx + R_ * .7
        d.rectangle([g0, cy - R_ * .7, g1, cy + R_ * .7], fill=(40, 40, 46), outline=OUT)
        for k in range(4): xx = g0 + (g1 - g0) * (k + .5) / 4; d.line([xx, cy - R_ * .68, xx, cy + R_ * .68], fill=IRON[3], width=2)
        if op: d.line([X0 + 3, Y0 + 2, X0 + 3, Y1 - 2], fill=(24, 20, 22), width=4)
    else:                                                                   # a data spike
        lit_ellipse(tm, cx, cy, R_ * .4, R_ * .4, COMPOSITE); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=GLOW[2])
    if op:
        pc = [(220, 200, 150), (220, 200, 150), (220, 200, 150), (130, 120, 70), (160, 160, 166), (160, 160, 166), (30, 30, 30), (60, 120, 220), (60, 64, 76)][e]
        lit_rect(tm, cx - R_ * .35, cy - R_ * .25, cx + R_ * .2, cy + R_ * .2, rp(pc, 18))
        if e <= 2: d.ellipse([cx - 3, cy - 3, cx + 2, cy + 2], fill=(170, 30, 30))
        if e == 8: d.line([cx - R_ * .3, cy, cx + R_ * .1, cy], fill=GLOW[2], width=1)
    # the signal mark of the age, in the north-west corner
    mx, my = X0 + 2, Y0 + 2
    mark = [((120, 90, 60), "x"), ((200, 40, 40), "knot"), ((170, 170, 160), "pebbles"), ((240, 240, 236), "x"), ((240, 240, 236), "o"),
            ((220, 60, 60), "pin"), ((80, 120, 230), "stroke"), ((240, 220, 60), "tape"), (GLOW[2], "stroke")][e]
    col, kind = mark; q = max(10, R_ * .55)
    if kind == "x": d.line([mx, my, mx + q, my + q], fill=OUT, width=5); d.line([mx + q, my, mx, my + q], fill=OUT, width=5); d.line([mx, my, mx + q, my + q], fill=col, width=3); d.line([mx + q, my, mx, my + q], fill=col, width=3)
    elif kind == "knot":                                                    # a rag knotted round a stake
        lit_ellipse(tm, mx + q * .5, my + q * .5, 3, 3, OAK); d.polygon([(mx + q * .5, my + q * .3), (mx + q * 1.2, my), (mx + q * 1.3, my + q * .5), (mx + q * .5, my + q * .7)], fill=col, outline=OUT)
    elif kind == "pebbles":
        for k in range(3): d.ellipse([mx + k * 6, my, mx + k * 6 + 5, my + 5], fill=col, outline=OUT)
    elif kind == "o": d.ellipse([mx, my, mx + q, my + q], outline=col, width=3)
    elif kind == "pin": d.ellipse([mx, my, mx + 6, my + 6], fill=col, outline=OUT); d.line([mx + 6, my + 6, X1 - 2, my + 4], fill=(230, 230, 230), width=1)
    elif kind == "stroke": d.line([mx, my + 4, mx + 14, my], fill=col, width=4)
    else: d.rectangle([mx, my, mx + 14, my + 5], fill=col, outline=OUT)


def flag(tm, c, fx, fy, L_, H_, kind):
    """A flag flying east from the pole top, its cloth waving (foreshortened from above), its design from the age."""
    d = tm.d; a, b = STYLE_PAINT.get(c.s, STYLE_PAINT["central"]); e = c.e
    if e == 8: a, b = mix(a, (40, 44, 54), .45), mix(b, (60, 64, 76), .3)
    pts_top = [(fx + L_ * t, fy - H_ / 2 + math.sin(t * 7) * 2) for t in np.linspace(0, 1, 8)]
    pts_bot = [(fx + L_ * t, fy + H_ / 2 + math.sin(t * 7) * 2) for t in np.linspace(1, 0, 8)]
    if kind == "pennant": pts_top, pts_bot = pts_top, [(fx + L_, fy)] + pts_bot[4:]
    if kind == "swallow": pts_bot = [(fx + L_ * .75, fy)] + pts_bot[1:]
    if kind == "rag":
        pts_top = [(fx + L_ * .6 * t, fy - H_ / 3 + math.sin(t * 9) * 2) for t in np.linspace(0, 1, 6)]; pts_bot = [(fx + L_ * .5 * t, fy + H_ / 3) for t in np.linspace(1, 0, 4)]
    shp = pts_top + pts_bot
    pshadow(tm, shp, 4, 5, .7)
    d.polygon(shp, fill=a, outline=OUT)
    if kind == "rag": d.polygon(shp, fill=(150, 130, 110), outline=OUT); return
    # the design of the age
    if e in (0, 2):                                                          # per pale, or quartered
        d.polygon([(fx + 1, fy - H_ / 2 + 1), (fx + L_ * .5, fy - H_ / 2 + 1), (fx + L_ * .5, fy + H_ / 2 - 1), (fx + 1, fy + H_ / 2 - 1)], fill=b)
        if e == 2: d.rectangle([fx + L_ * .5, fy, fx + L_ * .85, fy + H_ / 2 - 2], fill=b); d.rectangle([fx + 1, fy, fx + L_ * .5, fy + H_ / 2 - 1], fill=a)
    elif e == 1: d.line([fx + 2, fy - H_ / 2 + 2, fx + L_ * .9, fy + H_ / 2 - 2], fill=b, width=4); d.line([fx + 2, fy + H_ / 2 - 2, fx + L_ * .9, fy - H_ / 2 + 2], fill=b, width=4)
    elif e == 3: d.rectangle([fx + 1, fy - H_ / 2 + 1, fx + L_ * .4, fy], fill=b)
    elif e == 4:
        for k in range(3): d.rectangle([fx + 1 + k * L_ / 3, fy - H_ / 2 + 2, fx + (k + 1) * L_ / 3 - 1, fy + H_ / 2 - 2], fill=(a, (236, 232, 222), b)[k])
    elif e == 5:
        for k in range(3): d.rectangle([fx + 1, fy - H_ / 2 + 1 + k * H_ / 3, fx + L_ * .95, fy - H_ / 2 + (k + 1) * H_ / 3], fill=(b, (236, 232, 222), a)[k])
    else:                                                                    # the region's own national pattern
        t_, b_ = fy - H_ / 2 + 1, fy + H_ / 2 - 1; pk = zlib.crc32(c.s.encode()) % 3
        if pk == 0:
            for k in range(3): d.rectangle([fx + 1 + k * L_ / 3, t_, fx + (k + 1) * L_ / 3 - 1, b_], fill=(a, (236, 232, 222), b)[k])
        elif pk == 1: d.rectangle([fx + 1, fy, fx + L_ * .95, b_], fill=b)
        else:
            for k in range(3): d.rectangle([fx + 1, t_ + k * H_ / 3, fx + L_ * .95, t_ + (k + 1) * H_ / 3], fill=(a, b, a)[k])
        if e == 7:                                                           # a white hoist band and a company disc
            d.rectangle([fx + 1, t_, fx + L_ * .18, b_], fill=(240, 240, 236)); d.ellipse([fx + L_ * .55, fy - H_ * .22, fx + L_ * .8, fy + H_ * .22], fill=(240, 240, 236), outline=OUT)
        if e == 8:
            d.polygon([(fx + 1, t_), (fx + L_ * .45, fy), (fx + 1, b_)], fill=(40, 44, 54)); d.ellipse([fx + L_ * .5, fy - H_ * .25, fx + L_ * .75, fy + H_ * .25], outline=GLOW[1], width=2)
    d.line([fx + 2, fy - H_ / 2 + 2, fx + L_ * .9, fy - H_ / 2 + 2], fill=(255, 255, 255), width=1)


def flagpole(tm, x, y, w, h, st, v):
    """A flagpole from above: the round foot set in its base, the pole top with its finial, and the flag flying out east
    on the wind, its cloth foreshortened in waves. Each age has its pole and its flag: a spear-headed staff of ash in a
    stone socket flying a heraldic banner per pale or a swallow-tailed pennon (Middle Ages), a banner with a saltire
    (Long Night), a quartered banner (Renaissance), a pole on a stepped stone base with a cantoned flag (Age of
    Reason), a tricolour on a cast-iron base (1800s), a horizontal tricolour on a steel mast (Great War), the
    region's own national pattern (a tricolour or bicolour) on a concrete plinth (mid-century), the same
    with a white hoist band and a company disc on an aluminium mast (Modern), a darkened one with a black hoist
    triangle and a lit ring on a composite mast (Future Darkness), in the colours the region favours. Rich: a gilded finial
    and a dressed base; poor: a rag on a stick."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    px_, py_ = X0 + R_ * .5, cy
    gd = rp({"grass": (90, 130, 70), "gravel": (176, 160, 120), "flags": (170, 164, 150), "earth": (120, 96, 70)}[v.get("ground", "grass")], 10)
    d.rectangle([X0, Y0, X1, Y1], fill=gd[2])
    base = [rp((130, 126, 120), 16), rp((120, 116, 112), 16), rp((170, 160, 140), 16), rp((200, 194, 180), 14), IRON, rp((90, 96, 90), 16), rp((176, 172, 164), 14), STEEL, COMPOSITE][e]
    if e == 3 or (c.rich and e in (0, 1, 2)):
        lit_rect(tm, px_ - R_ * .45, py_ - R_ * .45, px_ + R_ * .45, py_ + R_ * .45, base); lit_rect(tm, px_ - R_ * .3, py_ - R_ * .3, px_ + R_ * .3, py_ + R_ * .3, base)
    elif e in (4, 6, 8): lit_ellipse(tm, px_, py_, R_ * .42, R_ * .42, base)
    else: lit_rect(tm, px_ - R_ * .32, py_ - R_ * .32, px_ + R_ * .32, py_ + R_ * .32, base)
    pole = OAK if e <= 3 else IRON if e == 4 else STEEL if e <= 7 else COMPOSITE
    lit_ellipse(tm, px_, py_, 4, 4, pole)
    fin = rp((220, 180, 60), 20) if c.rich else pole
    if e <= 1: d.polygon([(px_ - 3, py_ - 3), (px_ + 3, py_ - 3), (px_, py_ - 9)], fill=fin[3], outline=OUT)
    else: lit_ellipse(tm, px_, py_, 3, 3, fin)
    kind = v.get("flag", "banner")
    if c.poor: kind = "rag"
    if e <= 1 and kind == "ensign": kind = "swallow"
    H_ = R_ * 1.35 if kind != "pennant" else R_ * 1.1
    flag(tm, c, px_ + 3, py_, X1 - px_ - 4, H_, kind)
    d.line([px_, py_ + 2, px_ + 3, py_ + R_ * .45], fill=(230, 226, 210), width=1)



# ================================================================ made things of the street, the park and the railway
def bike(tm, c, bx, by, L_, col, e, k=0):
    """A bicycle from above, front to the north: tyres seen edge on, the frame between, the handlebar across the front
    and the saddle, in the make of the age (a black roadster with a leather saddle, a coloured tourer, a mountain bike
    with a U-lock, an e-bike with its lit battery)."""
    d = tm.d; F = rp(col, 22); tyre = (24, 22, 26)
    fw0, fw1 = by, by + L_ * .36; rw0, rw1 = by + L_ * .64, by + L_
    for y0_, y1_ in ((fw0, fw1), (rw0, rw1)):
        d.line([bx, y0_, bx, y1_], fill=tyre, width=4 if e < 7 else 5)
        if e >= 6: d.line([bx, y0_ + 3, bx, y1_ - 3], fill=STEEL[4], width=1)
    d.line([bx, by + L_ * .2, bx, by + L_ * .78], fill=OUT, width=5); d.line([bx, by + L_ * .2, bx, by + L_ * .78], fill=F[2], width=3)
    d.line([bx, by + L_ * .2, bx + 1, by + L_ * .2], fill=F[4], width=1)
    hb = 9 if e < 7 else 11
    if e <= 5: d.arc([bx - hb, by + L_ * .1, bx + hb, by + L_ * .3], 180, 360, fill=STEEL[3] if e >= 5 else IRON[3], width=2)
    else: d.line([bx - hb, by + L_ * .18, bx + hb, by + L_ * .18], fill=OUT, width=4); d.line([bx - hb, by + L_ * .18, bx + hb, by + L_ * .18], fill=(40, 40, 44) if e >= 7 else STEEL[3], width=2)
    d.ellipse([bx - 3, by + L_ * .6, bx + 3, by + L_ * .7], fill=(110, 70, 40) if e <= 5 else (30, 30, 34), outline=OUT)
    if e == 5 and k % 2 == 0: lit_rect(tm, bx - 6, by + 2, bx + 6, by + L_ * .14, rp((170, 140, 90), 14))
    if e == 8: d.rectangle([bx - 3, by + L_ * .4, bx + 3, by + L_ * .55], fill=COMPOSITE[1], outline=OUT); d.line([bx, by + L_ * .42, bx, by + L_ * .53], fill=GLOW[2], width=1)
    if e == 7 and k % 2: d.ellipse([bx - 5, by + L_ * .4, bx + 5, by + L_ * .5], outline=(240, 200, 40), width=2)


BIKECOL = {4: [(30, 30, 34), (60, 40, 40), (40, 40, 60)], 5: [(30, 30, 34), (50, 60, 40), (60, 40, 30)], 6: [(180, 40, 40), (40, 90, 170), (60, 130, 70), (200, 190, 170)],
           7: [(220, 220, 40), (40, 200, 200), (230, 60, 140), (40, 40, 44), (230, 120, 30)], 8: [(50, 54, 64), (70, 70, 84), (40, 44, 50)]}


GROUNDS = {"flags": (170, 164, 150), "asphalt": (70, 70, 76), "brick": (150, 70, 50), "gravel": (176, 160, 120), "concrete": (196, 196, 190)}


def bikerack(tm, x, y, w, h, st, v):
    """A bicycle rack from above with the cycles left in it, front wheels in the rack to the north: a cast-iron stand of
    slotted uprights (1890s), a timber rail with iron hoops (Great War), a galvanised tube toast-rack (mid-century),
    steel Sheffield hoops with U-locks (Modern), a dark composite stand with lit charging points (Future Darkness), the
    same the world over. The cycles are the age's: black roadsters with leather saddles, a baker's basket, bright
    tourers, neon mountain bikes, e-bikes. Load: empty, one, a few, full. Rich (a station or college): a long rack
    under a roof edge; poor: a bent rail."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; e = c.e
    kind = v.get("rack", "toast")
    pave = rp(mix(GROUNDS[v.get("ground", "flags")], ([(0, 0, 0)] * 4 + [(160, 150, 136), (140, 136, 130), (120, 120, 122), (96, 98, 102), (54, 56, 62)])[max(4, e)], .3), 10)
    d.rectangle([X0, Y0, X1, Y1], fill=pave[2])
    if e <= 6:
        for yy in np.arange(Y0 + 18, Y1, 22): d.line([X0, yy, X1, yy], fill=pave[1])
        for k, xx in enumerate(np.arange(X0 + 22, X1, 30)): d.line([xx, Y0, xx, Y1], fill=pave[1])
    else:
        for k in range(1, 6): d.line([X0 + W_ * k / 6, Y1 - 6, X0 + W_ * k / 6, Y1 - 1], fill=(236, 236, 230) if e == 7 else GLOW[0], width=2)
    met = IRON if e <= 5 else STEEL if e <= 7 else COMPOSITE
    if c.rich: d.rectangle([X0, Y0, X1, Y0 + 8], fill=rp((90, 96, 100), 12)[2], outline=OUT)
    ry = Y0 + H_ * .2
    n = max(4, int(W_ / 24)); slots = [X0 + W_ * (k + .5) / n for k in range(n)]
    if e == 4 or (kind == "wall" and e < 7):
        lit_rect(tm, X0 + 2, ry - 5, X1 - 2, ry + 5, met)
        for sx in slots: d.rectangle([sx - 4, ry - 9, sx - 2, ry + 9], fill=met[1], outline=OUT); d.rectangle([sx + 2, ry - 9, sx + 4, ry + 9], fill=met[1], outline=OUT)
    elif e == 5:
        lit_rect(tm, X0 + 2, ry - 4, X1 - 2, ry + 4, OAK)
        for sx in slots: d.arc([sx - 6, ry - 8, sx + 6, ry + 8], 0, 360, fill=met[3], width=2)
    elif e == 6 or kind == "toast":
        for yy in (ry - 8, ry + 8): d.line([X0 + 2, yy, X1 - 2, yy], fill=OUT, width=5); d.line([X0 + 2, yy, X1 - 2, yy], fill=met[3], width=3)
        for sx in slots: d.line([sx - 5, ry - 8, sx - 5, ry + 8], fill=met[2], width=2); d.line([sx + 5, ry - 8, sx + 5, ry + 8], fill=met[2], width=2)
    else:
        for sx in slots[::1]:
            hx = sx + 10
            d.line([hx, ry - 14, hx, ry + 14], fill=OUT, width=6); d.line([hx, ry - 14, hx, ry + 14], fill=met[3], width=4); d.line([hx - 1, ry - 13, hx - 1, ry + 13], fill=met[4], width=1)
            if e == 8: d.ellipse([hx - 3, ry - 3, hx + 3, ry + 3], fill=GLOW[2])
    load = v.get("load", "few"); nb = {"empty": 0, "one": 1, "few": max(2, n // 2), "full": n}[load]
    cols = BIKECOL[min(8, max(4, e))]
    order = [0, 2, 1, 3, 4, 5, 6][:n]
    for j, k in enumerate(sorted(order[:nb])):
        col = cols[(k + c.w) % len(cols)]
        bike(tm, c, slots[k], Y0 + 4, H_ - 10, col, e, k)
def birdbath(tm, x, y, w, h, st, v):
    """A birdbath from above: the round bowl on its pedestal, the rim lit north-west, the water in it and the pedestal's
    short shadow. Each age's make: a carved stone baluster with an acanthus-scalloped bowl (Victorian), a cast-iron
    lily-pad bowl (Great War), a plain cast concrete bowl (mid-century), a glazed blue ceramic or resin bowl (Modern),
    a dark composite dish with a lit ring and a heater (Future Darkness). Shape: round, scalloped, square, shell or
    octagonal. Contents: water, ice, fallen leaves, a bird bathing, or bird seed put out in the dry bowl. Rich: on a stepped plinth in a bed; poor: a dish on a stump."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    col = [None] * 4 + [(200, 194, 178), (70, 70, 76), (176, 172, 162), (60, 120, 170), (54, 58, 68)]
    B = rp(col[min(8, max(4, e))], 18)
    if c.poor: B = rp((150, 140, 120), 16)
    shape = v.get("shape", "round"); cont = v.get("contents", "water")
    if c.rich:
        lit_rect(tm, X0, Y0, X1, Y1, rp((190, 184, 170) if e < 8 else (60, 64, 74), 12))
    else: eshadow(tm, cx, cy, R_ * .9, R_ * .9, 4, 5)
    r = R_ * .9
    if shape == "square": lit_rect(tm, cx - r, cy - r, cx + r, cy + r, B, r=3)
    elif shape == "octagon": poly(tm, [(cx + math.cos(a) * r, cy + math.sin(a) * r) for a in np.linspace(0, 6.28, 8, endpoint=False) + .39], B, 2)
    elif shape == "scalloped":
        for pass_ in (0, 1):                                                # outlines first, then the fills, so only the outer edge shows
            for k in range(10):
                a = k * .628; px_, py_ = cx + math.cos(a) * r * .8, cy + math.sin(a) * r * .8; q = r * .28 + (1 if pass_ == 0 else 0)
                d.ellipse([px_ - q, py_ - q, px_ + q, py_ + q], fill=OUT if pass_ == 0 else B[2])
        lit_ellipse(tm, cx, cy, r * .82, r * .82, B)
    elif shape == "shell":
        d.pieslice([cx - r, cy - r, cx + r, cy + r], 160, 380, fill=B[2], outline=OUT)
        for k in range(5): a = math.radians(170 + k * 40); d.line([cx, cy + r * .2, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=B[1], width=1)
    else: lit_ellipse(tm, cx, cy, r, r, B)
    ir = r * .68
    if e == 4: d.ellipse([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], outline=B[4], width=1)
    W_ = rp((80, 120, 140), 16)
    if cont == "leaves": d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=B[0])
    elif cont == "seed":                                                    # bird seed put out in the dry bowl
        d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=B[1]); d.ellipse([cx - ir * .6, cy - ir * .6, cx + ir * .6, cy + ir * .6], fill=(200, 170, 110), outline=(150, 120, 70))
    elif cont == "ice": d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=(214, 226, 236), outline=(150, 170, 190)); d.line([cx - ir * .5, cy - ir * .2, cx + ir * .4, cy + ir * .3], fill=(255, 255, 255))
    else:
        d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=W_[2], outline=B[0]); d.arc([cx - ir * .7, cy - ir * .7, cx + ir * .5, cy + ir * .5], 200, 260, fill=W_[4], width=2)
    if cont == "leaves":                                                    # fallen leaves drifted round the bowl
        for k in range(6): a = k * 1.047 + .52; lx, ly = cx + math.cos(a) * ir * .55, cy + math.sin(a) * ir * .55; d.ellipse([lx - 3, ly - 2, lx + 3, ly + 2], fill=((170, 110, 40), (200, 150, 60))[k % 2], outline=(110, 70, 30))
    if cont == "birds":
        bc = (120, 90, 70)                                                  # a bird bathing in the middle, head to the north
        d.ellipse([cx - 4, cy - 2, cx + 4, cy + 7], fill=bc, outline=OUT); d.ellipse([cx - 3, cy - 6, cx + 3, cy], fill=tone(bc, 20), outline=OUT)
        d.line([cx - 7, cy + 2, cx - 4, cy + 4], fill=(200, 220, 230)); d.line([cx + 7, cy + 2, cx + 4, cy + 4], fill=(200, 220, 230))
    if e == 8: d.ellipse([cx - r * .85, cy - r * .85, cx + r * .85, cy + r * .85], outline=GLOW[1], width=1)


BOOMSTRIPE = {"red": ((200, 40, 40), (236, 236, 230)), "black": ((236, 200, 40), (30, 30, 34)), "blue": ((40, 70, 160), (236, 236, 230))}


def boombarrier(tm, x, y, w, h, st, v):
    """A boom barrier with its control box, from above: the pivot housing at the west end, the counterweight behind it,
    and the striped boom reaching east to its forked rest post. Closed: the boom down across the way; open: the boom
    raised upright, seen from above as a short foreshortened stub over the housing with its shadow. The age's make: a
    timber pole with a stone counterweight box and a hand rope (1900s), a striped timber pole by a sentry hut (Great
    War), a steel boom on a grey motor housing (mid-century), an aluminium boom with red reflective bands and a yellow
    housing with lamps (Modern), a composite boom with a lit strip (Future Darkness). Stripes red and white, black and
    yellow, or blue and white. Rich: a booth or ticket kiosk by it; poor: a bare pole on a post."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) / 2; e = c.e
    a, b = BOOMSTRIPE[v.get("stripe", "red")]
    gr = rp(mix(GROUNDS[v.get("ground", "asphalt")], ([(0, 0, 0)] * 4 + [(130, 120, 100), (120, 110, 96), (90, 90, 94), (70, 70, 74), (50, 52, 58)])[max(4, e)], .3), 10)
    d.rectangle([X0, Y0 + 3, X1, Y1 - 3], fill=gr[2])
    if e == 4: 
        for xx in np.arange(X0 + 6, X1, 12): d.line([xx, Y0 + 4, xx, Y1 - 4], fill=gr[1])
    if e >= 6: d.line([X0 + 2, Y1 - 6, X1 - 2, Y1 - 6], fill=(236, 236, 230) if e < 8 else GLOW[0], width=2)
    if e == 7:
        for xx in np.arange(X0 + 20, X1 - 10, 24): d.line([xx, Y0 + 5, xx + 10, Y0 + 5], fill=(240, 200, 40), width=2)
    if e <= 5 and v.get("stripe") == "black": a, b = (236, 236, 230), (30, 30, 34)
    hx = X0 + H_ * .55; hw = H_ * .72
    hc = {"grey": (130, 136, 140), "yellow": (230, 190, 40), "orange": (220, 110, 40), "green": (60, 110, 70)}[v.get("housing", "grey")]
    hous = [rp(mix((120, 110, 100), hc, .4), 14), rp(mix((96, 80, 60), hc, .4), 14), rp(hc, 14), rp(hc, 18), rp(mix((54, 58, 68), hc, .7), 12)][min(4, max(0, e - 4))]
    if c.rich:
        lit_rect(tm, X0 + 1, Y0 + 1, X0 + H_ * .95, Y1 - 1, rp((170, 160, 140) if e < 6 else (200, 200, 200), 14)); d.rectangle([X0 + 5, Y0 + 5, X0 + H_ * .9 - 4, Y0 + 9], fill=(120, 180, 220))
    lit_rect(tm, hx - hw * .7, cy - hw * .7, hx + hw * .7, cy + hw * .7, hous, r=2 if e >= 6 else 0)
    if e == 5:                                                              # the sentry's striped box beside it
        sx0 = hx + hw * .9; lit_rect(tm, sx0, Y0 + 1, sx0 + H_ * .9, Y1 - 1, rp((236, 236, 230), 10))
        for k in range(3): d.polygon([(sx0 + 2 + k * H_ * .3, Y0 + 2), (sx0 + 2 + k * H_ * .3 + H_ * .15, Y0 + 2), (sx0 + 2 + k * H_ * .3 + H_ * .15, Y1 - 2), (sx0 + 2 + k * H_ * .3, Y1 - 2)], fill=(30, 30, 34))
    if e == 4:
        for k in range(3): rock(tm, c, hx - hw * .6 + k * hw * .55, cy + hw * .55, 5, 4, (150, 146, 140))
    if e == 7:
        for s_ in (-1, 1): d.ellipse([hx - 3, cy + s_ * hw * .45 - 3, hx + 3, cy + s_ * hw * .45 + 3], fill=(240, 60, 40), outline=OUT)
        lit_rect(tm, hx - hw * .35, cy - hw * .95, hx + hw * .35, cy - hw * .7, rp((60, 60, 64), 10))         # the card reader on its post
    if e == 4: d.line([hx, cy, hx + 30, cy + hw * .8], fill=(200, 180, 130), width=1)
    lit_rect(tm, hx - hw * 1.1, cy - 5, hx - hw * .6, cy + 5, rp((110, 110, 110) if e >= 6 else (130, 126, 120), 12))
    thick = 8 if e <= 5 else 7
    if st == "open":
        L_ = H_ * .45
        tm.shade((hx, cy + 4, hx + W_ * .35, cy + 10), f=.72)
        d.rectangle([hx - thick / 2, cy - L_, hx + thick / 2, cy], fill=a, outline=OUT)
        for k in range(3): d.rectangle([hx - thick / 2 + 1, cy - L_ + k * L_ / 3 + 1, hx + thick / 2 - 1, cy - L_ + k * L_ / 3 + L_ / 6], fill=b)
        lit_ellipse(tm, hx, cy, 4, 4, IRON)
    else:
        end = X1 - 6
        d.rectangle([hx, cy - thick / 2, end, cy + thick / 2], fill=a, outline=OUT)
        seg = 22 if e >= 6 else 28
        for k, xx in enumerate(np.arange(hx + seg, end - 4, seg)):
            if k % 2 == 0: d.rectangle([xx, cy - thick / 2 + 1, min(end - 1, xx + seg), cy + thick / 2 - 1], fill=b)
        d.line([hx, cy - thick / 2 + 1, end, cy - thick / 2 + 1], fill=(255, 255, 255) if e >= 6 else tone(a, 30), width=1)
        tm.shade((hx + 2, cy + thick / 2 + 1, end + 3, cy + thick / 2 + 4), f=.7)
        if e == 8: d.line([hx + 4, cy, end - 4, cy], fill=GLOW[2], width=1)
        if e == 7:                                                          # the hanging skirt of the boom
            for xx in np.arange(hx + 14, end - 6, 9): d.line([xx, cy + thick / 2, xx, cy + thick / 2 + 7], fill=b, width=2)
            d.line([hx + 14, cy + thick / 2 + 7, end - 8, cy + thick / 2 + 7], fill=OUT, width=1)
        lit_ellipse(tm, hx, cy, 4, 4, IRON)
    rx = X1 - 6
    d.rectangle([rx - 3, cy - 7, rx + 3, cy + 7], fill=hous[1], outline=OUT)
    d.line([rx - 3, cy - 7, rx - 3, cy - 2], fill=hous[3]); d.line([rx + 3, cy - 7, rx + 3, cy - 2], fill=hous[3])


BOX_PRINT = [((200, 40, 40), "FRAGILE"), ((40, 40, 40), "arrows"), ((40, 90, 170), "logo"), ((30, 120, 60), "logo")]


def boxshelter(tm, x, y, w, h, st, v):
    """A rough sleeper's shelter of cardboard from above: a flattened box laid as a floor, an upright carton as the
    head-end tunnel open to the south, the bedding over it and the few belongings. Each age's make: a wooden packing
    crate and sacking (the 1910s), corrugated cartons with their printed marks and newspaper (mid-century), cartons with
    a blue tarp tied over the head end (Modern), a silver foil blanket and a dark plastic crate (Future Darkness). Cover:
    blanket, sleeping bag or newspaper. Goods: a shopping cart, bags or bottles. Shelter: the head-end tunnel,
    cartons stood along both sides, or open."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) / 2; e = c.e
    card = rp((180, 140, 90), 16) if e >= 6 else rp((150, 120, 80), 16)
    shadow(tm, X0, Y0, X1, Y1, 3, .7)
    lit_rect(tm, X0, Y0 + H_ * .05, X1, Y1, card)
    for k in range(int(W_ / 6)): d.line([X0 + 3 + k * 6, Y0 + H_ * .06, X0 + 3 + k * 6, Y1 - 2], fill=card[1], width=1)
    lay = v.get("shelter", "tunnel")
    if lay == "walled":                                                     # cartons stood on edge along both sides
        for xx in (X0, X1 - 7): lit_rect(tm, xx, Y0 + H_ * .05, xx + 7, Y1, card if e != 8 else COMPOSITE)
    if lay == "open": pass
    elif e == 5:
        lit_rect(tm, X0 + 1, Y0, X1 - 1, Y0 + H_ * .38, rp((150, 110, 70), 16))
        for k in range(3): d.line([X0 + 2, Y0 + 3 + k * H_ * .12, X1 - 2, Y0 + 3 + k * H_ * .12], fill=OUT, width=1)
    elif e == 8:
        lit_rect(tm, X0 + 1, Y0, X1 - 1, Y0 + H_ * .35, COMPOSITE, r=3); d.line([X0 + 4, Y0 + H_ * .32, X1 - 4, Y0 + H_ * .32], fill=GLOW[1])
    else:
        lit_rect(tm, X0 + 1, Y0, X1 - 1, Y0 + H_ * .4, card); d.rectangle([X0 + 4, Y0 + H_ * .4 - 6, X1 - 4, Y0 + H_ * .4 - 1], fill=card[0])
        pc, mk = BOX_PRINT[(c.w + e) % 4 if c.w >= 0 else 0]
        if mk == "FRAGILE":
            for k in range(3): d.rectangle([X0 + 6 + k * 8, Y0 + 8, X0 + 11 + k * 8, Y0 + 12], fill=pc)
        elif mk == "arrows":
            for k in range(2): ax = X0 + 12 + k * 14; d.polygon([(ax, Y0 + 6), (ax + 5, Y0 + 12), (ax - 5, Y0 + 12)], fill=pc)
        else: d.ellipse([cx - 7, Y0 + 6, cx + 7, Y0 + 16], fill=pc)
    cover = v.get("cover", "blanket")
    if e == 8 and cover == "blanket": cover = "foil"
    if e == 5 and cover == "sleeping bag": cover = "sacking"
    bc = {"red": (170, 50, 50), "blue": (50, 80, 170), "green": (70, 130, 70), "grey": (150, 150, 150), "brown": (120, 90, 60)}[v.get("bedding", "red")]
    if cover in ("sacking", "foil"): cc_ = mix(bc, (160, 130, 90) if cover == "sacking" else (200, 204, 210), .45)
    cc = {"blanket": bc, "sleeping bag": mix(bc, (230, 120, 30), .3) if e == 7 else bc, "newspaper": (220, 216, 200), "sacking": (160, 130, 90), "foil": (200, 204, 210)}[cover]
    if cover in ("sacking", "foil"): cc = cc_
    by0 = Y0 + H_ * .3
    if cover == "newspaper":
        for k in range(5): d.rectangle([X0 + 3 + (k % 2) * 8, by0 + k * 12, X1 - 3 - (k % 2) * 6, by0 + k * 12 + 14], fill=(220, 216, 200), outline=(120, 120, 120))
        for k in range(8): d.line([X0 + 8, by0 + 4 + k * 7, X1 - 10, by0 + 4 + k * 7], fill=(120, 120, 120), width=1)
    else:
        from library.art import cloth
        cloth(tm, X0 + 2, by0, X1 - 2, Y1 - H_ * .14, rp(cc, 16), folds="x", n=3, rng=c.rng)
        if cover == "foil":
            for k in range(4): d.line([X0 + 5, by0 + 6 + k * 12, X1 - 5, by0 + 10 + k * 12], fill=(250, 250, 250), width=1)
        if cover == "sleeping bag": d.line([X1 - 6, by0 + 4, X1 - 6, Y1 - H_ * .16], fill=(200, 200, 200), width=1)
    if e == 7:                                      # a blue tarp tied over the head carton
        tp = rp(mix((40, 90, 170), bc, .25), 14)
        d.polygon([(X0 - 1, Y0 + 2), (X1 + 1, Y0), (X1, Y0 + H_ * .46), (cx, Y0 + H_ * .42), (X0, Y0 + H_ * .47)], fill=tp[2], outline=OUT)
        d.line([cx, Y0 + 1, cx, Y0 + H_ * .42], fill=tp[0], width=2)
        for s_ in (X0 + 3, X1 - 3): d.line([s_, Y0 + H_ * .45, s_, Y0 + H_ * .55], fill=(220, 210, 190), width=1)
    goods = v.get("goods", "bags")
    gx, gy = cx, Y1 - H_ * .07
    if goods == "bags":
        for k, gc in enumerate(((220, 220, 216) if e >= 6 else (160, 130, 90), (40, 90, 170) if e >= 7 else (110, 90, 60))): lit_ellipse(tm, X0 + W_ * (.3 + k * .4), gy, 8, 6, rp(gc, 14))
    elif goods == "bottles":
        for k in range(3): bx = X0 + W_ * (.2 + k * .3); d.line([bx, gy - 6, bx + 3, gy + 4], fill=OUT, width=5); d.line([bx, gy - 6, bx + 3, gy + 4], fill=(50, 110, 60) if k % 2 else (130, 80, 30), width=3)
    else:
        if e >= 6: d.rectangle([X0 + 4, gy - 6, X1 - 4, Y1 - 1], outline=STEEL[3], width=2); d.line([X0 + 8, gy - 6, X0 + 8, Y1 - 1], fill=STEEL[2], width=1)
        else: lit_rect(tm, X0 + 4, gy - 6, X1 - 4, Y1 - 1, OAK)
BUFPAINT = {"red": (180, 40, 36), "black": (40, 40, 44), "yellow": (230, 190, 40), "white": (226, 226, 220)}


def bufferstop(tm, x, y, w, h, st, v):
    """A railway buffer stop from above at the end of its line: the two rails and their sleepers running in from the
    south, and across them the stop's beam with its two buffers facing the train, its frame of bent rails or timber
    behind. The age's make: a timber baulk banked with earth and stone (1830s), a timber beam on a rail-built frame with
    sprung buffers (Victorian), a beam on a crib of old sleepers with a lamp (Great War), a steel beam with white
    chevrons (mid-century), a hydraulic stop with black chevrons and long buffers (Modern), a dark composite stop with lit faces
    (Future Darkness). Paint: red, black, yellow or white. Ground: ballast, sand drag or earth. Rich (a terminus):
    stone-flagged surround; poor: a sleeper laid across."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) / 2; e = c.e
    gnd = v.get("ground", "ballast")
    G = rp((120, 116, 110) if gnd == "ballast" else (200, 180, 130) if gnd == "sand" else (110, 90, 70), 14)
    vg = {"grass": (90, 130, 70), "cinder": (60, 58, 60), "flags": (170, 164, 150), "weeds": (120, 130, 80), "concrete": (196, 196, 190)}[v.get("verge", "grass")]
    if c.rich: vg = (170, 164, 150)
    d.rectangle([X0, Y0, X1, Y1], fill=rp(vg, 10)[2])
    d.rectangle([X0 + W_ * .15, Y0, X1 - W_ * .15, Y1], fill=G[2])
    for k in range(int(W_ * .7 / 3)): d.rectangle([X0 + W_ * .16 + (k * 7) % (W_ * .68), Y0 + 3 + (k * 11) % (H_ - 6), X0 + W_ * .16 + (k * 7) % (W_ * .68) + 2, Y0 + 5 + (k * 11) % (H_ - 6)], fill=G[3 + k % 2])
    gauge = H_ * .76; r0, r1 = cx - gauge / 2, cx + gauge / 2
    by = Y0 + H_ * .42
    for yy in np.arange(by + 10, Y1, 14): lit_rect(tm, r0 - 12, yy, r1 + 12, yy + 7, OAK if e < 6 or e == 7 and c.w < 3 else rp((150, 146, 140), 12))
    for rx in (r0, r1): d.line([rx, by, rx, Y1], fill=OUT, width=5); d.line([rx, by, rx, Y1], fill=STEEL[3], width=3); d.line([rx, by, rx, Y1], fill=STEEL[4], width=1)
    paint = BUFPAINT[v.get("paint", "red")]
    if e == 8: paint = mix(paint, (54, 58, 68), .5)
    P_ = rp(paint, 20)
    if e == 3:                                                              # an earth and stone bank with a baulk
        mound(tm, c, cx, Y0 + H_ * .25, W_ * .4, H_ * .25, (110, 90, 70), .15, 14)
        lit_rect(tm, X0 + W_ * .12, by - 8, X1 - W_ * .12, by + 4, rp(mix(OAK[2], paint, .35), 14))
        for k in range(2 + (c.w + 1) % 4): rock(tm, c, X0 + W_ * (.2 + k * .18), Y0 + H_ * (.12 + .08 * (k % 2)), 8, 6, (140, 136, 130))
    elif e == 5:                                                            # a crib of old sleepers filled with earth
        for k in range(3): lit_rect(tm, X0 + W_ * .12, Y0 + 3 + k * (by - Y0 - 10) / 3, X1 - W_ * .12, Y0 + 3 + k * (by - Y0 - 10) / 3 + 7, OAK)
        for xx in (X0 + W_ * .12, X1 - W_ * .12 - 7): lit_rect(tm, xx, Y0 + 2, xx + 7, by - 4, OAK)
        lit_rect(tm, X0 + W_ * .1, by - 9, X1 - W_ * .1, by + 3, P_)
        for k, rx in enumerate((r0, r1)):
            d.rectangle([rx - 6, by + 3, rx + 6, by + 9], fill=OAK[1], outline=OUT)
        lit_ellipse(tm, cx, by - 4, 6, 6, rp((200, 40, 30), 18)); d.ellipse([cx - 3, by - 7, cx + 1, by - 3], fill=(250, 220, 160))
    else:
        for rx in (r0, r1):                                                 # the frame of bent rails or struts behind
            d.line([rx, by, rx + (8 if rx > cx else -8), Y0 + 4], fill=OUT, width=7); d.line([rx, by, rx + (8 if rx > cx else -8), Y0 + 4], fill=(STEEL if e >= 6 else IRON)[2], width=5)
        lit_rect(tm, X0 + W_ * .1, by - 9, X1 - W_ * .1, by + 3, P_)
        if e == 5:
            for xx in np.arange(X0 + W_ * .1 + 14, X1 - W_ * .1, 14): d.line([xx, by - 8, xx, by + 2], fill=OUT, width=1)
            d.rectangle([X0 + W_ * .1, by - 16, X1 - W_ * .1, by - 10], fill=rp((120, 110, 90), 12)[2], outline=OUT)
        if e == 6:
            for k in range(6): xx = X0 + W_ * .1 + k * W_ * .8 / 6; d.polygon([(xx, by - 8), (xx + 10, by - 8), (xx + 4, by + 2), (xx - 6, by + 2)], fill=(236, 236, 230) if paint != BUFPAINT["white"] else (30, 30, 34)) if k % 2 else None
        if e == 7:
            for k in range(8): xx = X0 + W_ * .12 + k * W_ * .76 / 8; d.polygon([(xx, by - 8), (xx + 8, by - 8), (xx + 2, by + 2), (xx - 6, by + 2)], fill=(30, 30, 34) if paint != BUFPAINT["black"] else (230, 190, 40)) if k % 2 else None
        bl = 10 if e < 7 else 18
        for k, rx in enumerate((r0, r1)):
            d.rectangle([rx - 4, by + 3, rx + 4, by + 3 + bl], fill=STEEL[2] if e < 8 else COMPOSITE[2], outline=OUT)
            lit_ellipse(tm, rx, by + 3 + bl, 10, 4, rp((60, 60, 66), 14) if e < 8 else rp((60, 64, 76), 10))
            if e == 8: d.line([rx - 7, by + 3 + bl, rx + 7, by + 3 + bl], fill=GLOW[2], width=2)
        if e == 5 or (e == 4 and c.w >= 4): lit_ellipse(tm, cx, by - 4, 6, 6, rp((200, 40, 30), 18)); d.ellipse([cx - 3, by - 7, cx + 1, by - 3], fill=(250, 220, 160))
    if c.poor: lit_rect(tm, r0 - 14, Y1 - 12, r1 + 14, Y1 - 4, rp((90, 70, 50), 12))


FRAMECOL = {"red": (190, 50, 40), "green": (50, 120, 60), "blue": (40, 80, 170), "yellow": (230, 190, 40)}


def climbingframe(tm, x, y, w, h, st, v):
    """A climbing frame or monkey bars from above: two side rails with the rungs across between them, the end ladders
    and the corner posts on their feet, on the playground's ground. Kinds: straight bars, an arched ladder, a
    geodesic dome. The age's make: painted steel pipe on gravel or tarmac (mid-century), galvanised steel and bright
    primary plastic over bark chips or a rubber mat (Modern), dark composite with lit grips over dark rubber (Future
    Darkness), the same the world over. Colour: red, green, blue or yellow. Rich: a soft-fall surround; poor: bare
    earth."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e
    kind = v.get("kind", "bars"); col = FRAMECOL[v.get("colour", "red")]
    gnd = {6: (120, 116, 110), 7: (150, 100, 60), 8: (50, 50, 56)}[min(8, max(6, e))]
    gnd = mix(gnd, {"gravel": (180, 170, 140), "bark": (130, 84, 50), "grass": (80, 120, 60), "rubber": (60, 110, 150)}[v.get("ground", "gravel")], .7)
    if e == 7 and c.rich: gnd = (60, 110, 70)
    if c.poor: gnd = (130, 100, 70)
    d.rounded_rectangle([X0, Y0, X1, Y1], 10, fill=rp(gnd, 12)[2])
    if e == 7: scatter(tm, c, cx, cy, W_ * .45, H_ * .4, [rp(gnd, 14)[1], rp(gnd, 14)[3]], 40, (2, 4), kind="stick")
    if e == 6:
        for k in range(30): px_, py_ = X0 + c.rng.uniform(4, W_ - 4), Y0 + c.rng.uniform(4, H_ - 4); d.rectangle([px_, py_, px_ + 2, py_ + 1], fill=rp(gnd, 12)[3])
    if e == 8: d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 9, outline=GLOW[0], width=2)
    M = rp(col, 22) if e != 8 else rp(mix(col, (54, 58, 68), .55), 12)
    rail = STEEL if e == 7 else M
    if kind == "dome":
        r = min(W_, H_) * .48
        eshadow(tm, cx, cy, r, r, 5, 6, .7)
        for k in range(3): d.ellipse([cx - r * (1 - k * .3), cy - r * (1 - k * .3), cx + r * (1 - k * .3), cy + r * (1 - k * .3)], outline=OUT, width=5)
        for k in range(3): d.ellipse([cx - r * (1 - k * .3), cy - r * (1 - k * .3), cx + r * (1 - k * .3), cy + r * (1 - k * .3)], outline=M[2 + (k == 0)], width=3)
        for a in np.linspace(0, 6.28, 10, endpoint=False): d.line([cx + math.cos(a) * r * .4, cy + math.sin(a) * r * .4, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=M[3], width=3)
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=M[4], outline=OUT)
        for a in np.linspace(0, 6.28, 6, endpoint=False) + .3: lit_ellipse(tm, cx + math.cos(a) * (r - 6), cy + math.sin(a) * (r - 6), 4, 4, rp((240, 200, 40), 14) if e == 7 else M)
        return
    ry0, ry1 = cy - H_ * .28, cy + H_ * .28; xa, xb = X0 + W_ * .06, X1 - W_ * .06
    tm.shade((xa + 5, ry0 + 6, xb + 6, ry1 + 8), f=.78)
    for yy in (ry0, ry1): d.line([xa, yy, xb, yy], fill=OUT, width=7); d.line([xa, yy, xb, yy], fill=rail[2], width=5); d.line([xa, yy - 1, xb, yy - 1], fill=rail[4], width=1)
    n = int((xb - xa) / 18)
    for k in range(1, n):
        xx = xa + (xb - xa) * k / n
        rc = M if e != 7 else rp(((230, 60, 40), (40, 100, 200), (240, 200, 40))[k % 3], 20)
        d.line([xx, ry0, xx, ry1], fill=OUT, width=5); d.line([xx, ry0, xx, ry1], fill=rc[3], width=3)
        if e == 8: d.line([xx, cy - 4, xx, cy + 4], fill=GLOW[2], width=1)
    if kind == "arch": d.line([cx - W_ * .15, ry0 - 1, cx + W_ * .15, ry0 - 1], fill=rail[4], width=2); d.line([cx - W_ * .15, ry1 - 1, cx + W_ * .15, ry1 - 1], fill=rail[4], width=2)
    for xx in (xa, xb):
        for yy in (ry0, ry1): d.line([xx, yy, xx + (-10 if xx == xa else 10), yy + (-8 if yy == ry0 else 8)], fill=OUT, width=6); d.line([xx, yy, xx + (-10 if xx == xa else 10), yy + (-8 if yy == ry0 else 8)], fill=M[1], width=4)
        for k in range(3): ly = ry0 + (ry1 - ry0) * (k + 1) / 4; d.line([xx + (-8 if xx == xa else 8), ly, xx, ly], fill=M[3], width=3)
        for yy in (ry0, ry1): lit_ellipse(tm, xx, yy, 5, 5, M if e != 7 else rp((240, 200, 40), 18))


def crossingsignal(tm, x, y, w, h, st, v):
    """A railway crossing sign from above: the post's top and, leaning back from it, the sign's face foreshortened, so
    its shape and colours read. In the Americas a white crossbuck lettered in black; in Central Europe the red and white
    striped St Andrew's cross; in the north a white cross edged red; in Britain a red-bordered warning triangle with a
    gate or a locomotive on it, the Victorian cast-iron notice before it; in Australia and Aotearoa a crossbuck over a
    STOP plate from mid-century. From mid-century twin red lamps under the sign in a black backplate and a bell; Modern
    with hooded LED lamps and a reflective post; Future Darkness a dark panel with lit edges. Lit: the lamps glow red
    (a lantern either side on the Victorian post). Verge: grass, cinders, gravel or concrete. Rich: a pair of signs and a gate arm; poor: a plain board thinly painted."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e; s_ = c.s
    lit = st == "lit"
    post = OAK if e <= 4 else IRON if e == 5 else STEEL if e <= 7 else COMPOSITE
    tm.d.rectangle([X0, Y0, X1, Y1], fill=rp({"grass": (96, 128, 70), "cinder": (70, 66, 64), "gravel": (170, 156, 124), "concrete": (186, 186, 180)}[v.get("verge", "grass")], 10)[2])
    if e == 7: post = rp((230, 230, 226), 10)
    hy = H_ * .42; top, bot = cy - hy, cy + hy
    sw = W_ * .3 if s_ == "atlantic" else W_ * .5                           # the shade of the sign board
    tm.shade((cx - sw + 4, cy + 2, cx + sw + 4, cy + 6), f=.75)
    cx_ = cx
    lamps = e >= 6 or (e == 4 and c.w >= 3)
    if s_ == "atlantic":
        if e <= 5:
            lit_rect(tm, cx_ - W_ * .32, top, cx_ + W_ * .32, bot, rp((40, 40, 44) if e == 4 else (30, 50, 120), 12)); d.rectangle([cx_ - W_ * .28, top + 2, cx_ + W_ * .28, bot - 2], fill=(230, 226, 214) if e == 4 else (40, 70, 160))
            for k in range(3): d.line([cx_ - W_ * .22, top + 3 + k * 4, cx_ + W_ * .22, top + 3 + k * 4], fill=(40, 40, 44), width=1)
        else:
            rd, wh = ((200, 30, 30), (240, 240, 236)) if e < 8 else ((110, 40, 50), mix((240, 240, 236), GLOW[1], .4))
            d.polygon([(cx_, top - 1), (cx_ + W_ * .3, bot), (cx_ - W_ * .3, bot)], fill=rd, outline=OUT)
            d.polygon([(cx_, top + 4), (cx_ + W_ * .2, bot - 2), (cx_ - W_ * .2, bot - 2)], fill=wh)
            d.rectangle([cx_ - W_ * .1, bot - 5, cx_ + W_ * .1, bot - 3], fill=OUT) if e >= 6 else d.line([cx_ - W_ * .1, bot - 4, cx_ + W_ * .1, bot - 6], fill=OUT, width=2)
    else:
        bw = W_ * .46
        if s_ == "central": A, B = (200, 30, 30), (240, 240, 236)
        elif s_ == "northern": A, B = (240, 240, 236), (200, 30, 30)
        elif s_ == "oceania": A, B = (240, 240, 236), (20, 20, 24)
        else: A, B = (236, 236, 228) if e > 5 else (200, 196, 180) if e == 4 else (246, 246, 240), (30, 30, 34)
        if e == 8: A, B = mix(A, (60, 64, 76), .55), mix(B, GLOW[1], .5)
        if c.poor: A, B = mix(A, (150, 120, 90), .4), mix(B, (110, 90, 70), .3)          # a plain board, its paint thin
        for sg in (-1, 1):
            p0, p1 = (cx_ - bw, top), (cx_ + bw, bot)
            if sg > 0: p0, p1 = (cx_ - bw, bot), (cx_ + bw, top)
            d.line([p0, p1], fill=OUT, width=9); d.line([p0, p1], fill=A, width=7)
            if s_ == "central":
                for t in (.06, .26, .46, .66, .86): d.line([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[0] + (p1[0] - p0[0]) * (t + .08), p0[1] + (p1[1] - p0[1]) * (t + .08)], fill=B, width=7)
            elif s_ in ("northern", "oceania"):
                d.line([p0, p1], fill=B, width=7); d.line([p0, p1], fill=A, width=3)
            else:
                for t in (.15, .3, .7, .85): d.rectangle([p0[0] + (p1[0] - p0[0]) * t - 1, p0[1] + (p1[1] - p0[1]) * t - 1, p0[0] + (p1[0] - p0[0]) * t + 1, p0[1] + (p1[1] - p0[1]) * t + 1], fill=B)
        if s_ == "oceania" and e >= 6:
            ox, oy = cx_, cy - hy * .6; d.regular_polygon((ox, oy, 5), 8, fill=(200, 30, 30), outline=OUT) if hasattr(d, "regular_polygon") else d.ellipse([ox - 5, oy - 5, ox + 5, oy + 5], fill=(200, 30, 30), outline=OUT)
            d.line([ox - 3, oy, ox + 3, oy], fill=(240, 240, 240), width=1)
    lit_ellipse(tm, cx_, cy, 3, 3, post)
    if lamps:
        if e == 4:
            for lx in (cx_ - W_ * .4, cx_ + W_ * .4): lit_rect(tm, lx - 4, cy - 4, lx + 4, cy + 4, rp((40, 40, 44), 10)); d.rectangle([lx - 2, cy - 2, lx + 2, cy + 2], fill=(250, 200, 90) if lit else (90, 70, 50))
        else:
            d.rectangle([cx_ - W_ * .2, cy + hy * .25, cx_ + W_ * .2, cy + hy * .9], fill=(24, 22, 26) if e < 8 else COMPOSITE[1], outline=OUT)
            for sg in (-1, 1):
                lx = cx_ + sg * W_ * .12; on = lit and (sg < 0 or e >= 7)
                d.ellipse([lx - 4, cy + hy * .3, lx + 4, cy + hy * .85], fill=(250, 60, 40) if on else (110, 30, 30), outline=(40, 10, 10) if e < 7 else (230, 230, 226))
            if e == 6: lit_ellipse(tm, cx_, cy - hy * .9, 3, 3, BRASS)
    if lit and lamps: tm.hearths = getattr(tm, "hearths", []) + [(cx_, cy + hy * .5, 30, None)]
    if c.rich:                                                              # the gate bars either side
        for a_, b_ in ((cx_ + 4, X1 - 1), (X0 + 1, cx_ - 4)): d.line([a_, cy + 4, b_, cy + 4], fill=OUT, width=5); d.line([a_, cy + 4, b_, cy + 4], fill=(200, 30, 30) if e >= 6 else (236, 232, 220), width=3)
GOLFFLAG = {"red": (210, 40, 40), "yellow": (240, 210, 40), "white": (240, 240, 236), "blue": (40, 80, 200)}


def golfhole(tm, x, y, w, h, st, v):
    """A golf hole from above: a disc of close-cut green, the hole in it and the flagstick standing in the hole with its
    flag flying east, foreshortened. The age's make: a rough hole cut in links turf with no flag, a feather ball by it
    (Renaissance), a hole marked with a twig and a white rag (Age of Reason), an iron cup and a red flag on a wooden
    pin (Victorian), a numbered flag (Great War), a painted cup lip and a yellow flag (mid-century), a white plastic cup
    and a fibreglass pin with a checked flag (Modern), a dark pin with a lit flag (Future Darkness). Flag: red, yellow,
    white or blue. Ball: none, near the hole, or in it. Turf:
    plain, striped, sanded or dark; its edge a lighter collar or a ring of rough. Rich: a smooth striped green; poor: rough turf with daisies."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    G = rp(([(0, 0, 0)] * 2 + [(120, 130, 80), (100, 130, 70), (90, 140, 66), (80, 130, 76), (90, 156, 70), (70, 160, 80), (60, 90, 80)])[e], 12)
    turf = v.get("turf", "plain")
    if turf == "dark": G = rp(mix(G[2], (20, 60, 30), .7), 12)
    if turf == "sanded": G = rp(mix(G[2], (200, 180, 120), .65), 12)
    d.ellipse([X0, Y0, X1, Y1], fill=G[2])
    if turf == "striped":
        for k in range(0, 6, 2): d.rectangle([X0 + k * (X1 - X0) / 6, Y0 + 2, X0 + (k + 1) * (X1 - X0) / 6, Y1 - 2], fill=tone(G[2], 45))
    fr_ = v.get("fringe", "none"); rw = (X1 - X0) * .2
    if fr_ == "collar": d.ellipse([X0, Y0, X1, Y1], outline=tone(G[2], 35), width=int(rw))
    if fr_ == "rough": d.ellipse([X0, Y0, X1, Y1], outline=mix(G[2], (70, 90, 40), .6), width=int(rw))
    if turf == "sanded":
        for k in range(5): gx, gy = X0 + 3 + (k * 7) % 14, Y0 + 3 + (k * 5) % 13; d.rectangle([gx, gy, gx + 2, gy + 1], fill=(220, 200, 150))
    if c.rich and e >= 4: d.rectangle([X0 + R_ * .5, Y0 + 2, X0 + R_ * .9, Y1 - 2], fill=G[3])
    if c.poor:
        for k in range(3): d.rectangle([X0 + 3 + k * 5, Y1 - 6 - (k % 2) * 4, X0 + 5 + k * 5, Y1 - 4 - (k % 2) * 4], fill=(240, 240, 230))
    hx, hy = cx - R_ * .2, cy + R_ * .1; hr = 3
    lip = [G[0], G[0], G[0], G[0], (200, 200, 200), (200, 200, 200), (240, 240, 240), (250, 250, 250), GLOW[1]][e]
    d.ellipse([hx - hr - 1, hy - hr - 1, hx + hr + 1, hy + hr + 1], fill=lip)
    d.ellipse([hx - hr + 1, hy - hr + 1, hx + hr - 1, hy + hr - 1], fill=(14, 12, 14))
    ball = v.get("ball", "none")
    if ball == "near": bx, by = cx + R_ * .5, cy + R_ * .4; d.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(246, 246, 240) if e != 2 else (220, 200, 160), outline=OUT)
    if ball == "in": d.ellipse([hx - 2, hy - 2, hx + 1, hy + 1], fill=(246, 246, 240))
    fc = GOLFFLAG[v.get("flag", "red")]
    if e == 2:
        d.line([hx + 2, hy - 2, hx + 12, hy - 6], fill=OUT, width=3); d.line([hx + 2, hy - 2, hx + 12, hy - 6], fill=(150, 120, 80), width=1)
        d.rectangle([hx + 9, hy - 8, hx + 12, hy - 4], fill=mix(fc, (150, 130, 100), .5)); return
    pin = (120, 90, 60) if e <= 5 else (240, 240, 236) if e <= 7 else (50, 54, 64)
    d.ellipse([hx - 1, hy - 1, hx + 1, hy + 1], fill=pin)
    if e == 3: d.polygon([(hx, hy - 1), (hx + 9, hy - 4), (hx + 8, hy + 3)], fill=mix(fc, (236, 236, 226), .4), outline=OUT); return
    fl = fc if e != 8 else mix(fc, GLOW[2], .5)
    if e == 4: d.polygon([(hx + 1, hy - 4), (X1 - 1, hy - 4), (X1 - 5, hy - 1), (X1 - 1, hy + 1), (hx + 1, hy + 1)], fill=fl, outline=OUT); return
    d.polygon([(hx + 1, hy - 4), (X1 - 1, hy - 5), (X1 - 2, hy + 1), (hx + 1, hy + 1)], fill=fl, outline=OUT)
    if e == 5: d.rectangle([hx + 5, hy - 3, hx + 7, hy], fill=(250, 250, 250))
    if e == 6: d.polygon([(X1 - 1, hy - 5), (X1 - 1, hy + 2), (X1 - 6, hy - 2)], fill=G[2])
    if e == 7:
        for k in range(3): d.rectangle([hx + 3 + k * 4, hy - 4 + (k % 2) * 2, hx + 4 + k * 4, hy - 3 + (k % 2) * 2], fill=(30, 30, 30))
        d.ellipse([hx - 6, hy - 6, hx + 6, hy + 6], outline=(240, 240, 236), width=1)


GREEN_CROP = {"tomatoes": ((40, 120, 40), (230, 40, 30)), "vines": ((90, 140, 40), (80, 30, 100)), "seedlings": ((130, 190, 80), None),
              "flowers": ((50, 100, 60), (240, 200, 40)), "empty": (None, None)}


def greenhouse(tm, x, y, w, h, st, v):
    """A glasshouse or a cold frame from above: the glazed roof with its glazing bars and ridge, the north slope a shade
    darker than the south, glints on the glass and the crop showing green through it, on its low wall. The age's make
    (the same wherever the glass came): a timber frame of small panes, the free-standing kind an orangery with a slated north roof (to the 1830s), a
    white-painted cast-iron curvilinear house with its vents propped (Victorian), a white timber house (Great War),
    an aluminium house with big panes (mid-century), a polythene tunnel on hoops or aluminium (Modern), a dark
    composite house lit purple by grow lamps (Future Darkness). Kind: a free-standing glasshouse, a lean-to on a wall or
    a low cold frame of glass lights. Crop: tomatoes, vines, seedlings, flowers or empty. Rich: a big house with a
    boiler flue; poor: a plain timber frame."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e
    kind = v.get("kind", "glasshouse"); crop = v.get("crop", "tomatoes")
    leaf, fruit = GREEN_CROP[crop]
    paint = {"white": (236, 236, 230), "green": (50, 100, 60), "black": (40, 40, 44), "natural": (150, 120, 80)}[v.get("paint", "white")]
    poly_ = e == 7 and kind == "glasshouse" and c.w <= 3
    bar = [None, None, None, rp((150, 120, 80), 14), rp((230, 230, 224), 10), rp((120, 96, 66), 14), rp((180, 184, 190), 12), rp((60, 100, 70), 14), COMPOSITE][max(3, e)]
    if 3 <= e <= 7: bar = rp(mix(bar[2], paint, .7), 12)
    if e == 8: bar = rp(mix(bar[2], paint, .35), 10)
    wall = rp((160, 70, 50), 14) if e <= 5 else rp((170, 168, 160), 12) if e <= 7 else COMPOSITE
    glass = (150, 190, 200) if e != 8 else (120, 110, 150)
    if kind == "frame":
        fy0, fy1 = Y0 + H_ * .2, Y1 - H_ * .2
        shadow(tm, X0, fy0, X1, fy1, 4, .6); lit_rect(tm, X0, fy0, X1, fy1, wall)
        n = 3 if c.w < 3 else 4; cw = (W_ - 8) / n
        for k in range(n):
            lx0 = X0 + 4 + k * cw
            d.rectangle([lx0, fy0 + 4, lx0 + cw - 3, fy1 - 4], fill=mix(glass, leaf or (90, 80, 60), .45) if leaf else mix(glass, (90, 70, 50), .5), outline=bar[1], width=2)
            if leaf: dots(tm, c, lx0 + cw / 2, (fy0 + fy1) / 2, min(cw, fy1 - fy0) * .35, mix(leaf, glass, .3), 8, 3)
            d.line([lx0 + 4, fy0 + 7, lx0 + cw * .5, fy0 + 7], fill=(240, 250, 250), width=1)
            d.line([lx0 + cw * .5, fy0 + 4, lx0 + cw * .5, fy0 - 6], fill=bar[2], width=3)
        return
    lean = kind == "leanto"
    if lean: lit_rect(tm, X0, Y0, X1, Y0 + 10, rp((150, 70, 50), 14)); gy0 = Y0 + 10
    else: gy0 = Y0
    shadow(tm, X0, gy0, X1, Y1, 5, .62)
    d.rectangle([X0, gy0, X1, Y1], fill=wall[2], outline=OUT)
    ix0, iy0, ix1, iy1 = X0 + 5, gy0 + 5, X1 - 5, Y1 - 5
    d.rectangle([ix0, iy0, ix1, iy1], fill=rp(soil(c), 12)[1])
    if leaf:
        for row in (iy0 + (iy1 - iy0) * .25, iy0 + (iy1 - iy0) * .75):
            d.rectangle([ix0 + 3, row - (iy1 - iy0) * .18, ix1 - 3, row + (iy1 - iy0) * .18], fill=tone(leaf, -25))        # the bed of the crop
            nc = int((ix1 - ix0) / 14)
            for k in range(nc):
                px_ = ix0 + (ix1 - ix0) * (k + .5) / nc; dots(tm, c, px_, row, 6, leaf, 5, 3, dark=tone(leaf, -40))
                if fruit: d.ellipse([px_ - 2, row - 2, px_ + 2, row + 2], fill=fruit)
    gl = rp(glass, 14)
    a = np.asarray(tm.img).astype(np.float32)
    sub = a[int(iy0):int(iy1), int(ix0):int(ix1)]
    tint = np.array(glass, np.float32)
    ridge = (iy0 + iy1) / 2 if not lean else iy0
    for r_ in range(sub.shape[0]):
        north = (iy0 + r_) < ridge
        t = (.35 if e != 8 else .3) if not poly_ else .6
        tc = tint * (.82 if north else 1.0)
        sub[r_] = sub[r_] * (1 - t) + tc * t
    a[int(iy0):int(iy1), int(ix0):int(ix1)] = sub
    from PIL import Image
    tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
    if poly_:
        for k in range(int((ix1 - ix0) / 22) + 1): xx = ix0 + k * 22; d.line([xx, iy0, xx, iy1], fill=(236, 236, 230), width=2)
        d.line([ix0, ridge, ix1, ridge], fill=(240, 240, 236), width=1)
    else:
        step = 9 if e == 3 else 14 if e <= 5 else 22
        for xx in np.linspace(ix0, ix1, max(2, round((ix1 - ix0) / step)) + 1): d.line([xx, iy0, xx, iy1], fill=bar[2], width=2 if e >= 4 else 1)
        if e == 3:
            for yy in np.arange(iy0, iy1, 9): d.line([ix0, yy, ix1, yy], fill=bar[1], width=1)
            if not lean:                                                    # an orangery: a solid slated north roof, glass to the south
                lit_rect(tm, ix0 - 2, iy0 - 2, ix1 + 2, ridge, rp((90, 96, 104), 10))
                for yy in np.arange(iy0 + 4, ridge - 2, 6): d.line([ix0, yy, ix1, yy], fill=(70, 74, 82), width=1)
        d.line([ix0, ridge, ix1, ridge], fill=OUT, width=5); d.line([ix0, ridge, ix1, ridge], fill=bar[3], width=3)
        if e == 4:
            for k in range(1, 3): d.line([ix0, ridge - (ridge - iy0) * k / 3, ix1, ridge - (ridge - iy0) * k / 3], fill=bar[0], width=1); d.line([ix0, ridge + (iy1 - ridge) * k / 3, ix1, ridge + (iy1 - ridge) * k / 3], fill=bar[4], width=1)
            for xx in (ix0 + (ix1 - ix0) * .3, ix0 + (ix1 - ix0) * .7): d.rectangle([xx - 6, ridge - 12, xx + 6, ridge - 3], fill=mix(glass, (255, 255, 255), .3), outline=bar[1])
        if e == 4:                                                          # the curved hipped ends of the curvilinear house
            for xe, sg in ((ix0, 1), (ix1, -1)):
                for k in range(4): d.line([xe, ridge, xe + sg * 18, iy0 + (iy1 - iy0) * k / 3], fill=bar[1], width=1)
                d.arc([xe - 18, iy0, xe + 18, iy1], 270 if sg < 0 else 90, 90 if sg < 0 else 270, fill=OUT, width=2)
        if e == 7:                                                          # transoms and ridge vents
            for yy in (iy0 + (iy1 - iy0) * .25, iy0 + (iy1 - iy0) * .75): d.line([ix0, yy, ix1, yy], fill=bar[2], width=2)
            for xx in (ix0 + (ix1 - ix0) * .3, ix0 + (ix1 - ix0) * .7): d.rectangle([xx - 7, ridge - 9, xx + 7, ridge - 2], fill=mix(glass, (40, 40, 40), .3), outline=bar[0])
        if e == 8:
            for xx in np.arange(ix0 + 10, ix1, 30): d.line([xx, iy0 + 4, xx, iy1 - 4], fill=(200, 120, 230), width=2)
        for k in range(4):
            gx = ix0 + (ix1 - ix0) * (k + .5) / 4; d.line([gx - 4, iy0 + 6, gx + 4, iy0 + 6], fill=(250, 255, 255), width=2)
    if c.rich and e <= 6: lit_ellipse(tm, cx, gy0 + 10, 5, 5, IRON); d.ellipse([cx - 3, gy0 + 7, cx + 3, gy0 + 13], fill=(20, 20, 20))
    if c.rich and kind == "glasshouse" and e >= 4: lit_rect(tm, cx - 8, Y1 - 6, cx + 8, Y1 - 1, bar)


def hoop(tm, x, y, w, h, st, v):
    """A basketball hoop from above: the support at the back, the backboard as a narrow lit board seen from above, the
    orange rim reaching toward the court with the net hanging in it, and the painted key below. The age's make: a peach
    basket nailed to a board on a balcony rail (the 1890s), an iron hoop with a closed cord net on a wooden board
    (Great War), a steel pole with a fan board and a chain net (mid-century), a portable base with its black water
    tank and a clear acrylic board with the red shooting square (Modern), a dark composite post with a lit rim (Future
    Darkness), the same the world over. Base: pole, portable or wall. Net: cord, chain or torn. Rich (a gym or
    court): a painted key; poor: a bent rim on a garage."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) / 2; e = c.e
    base = v.get("base", "pole"); net = v.get("net", "cord")
    if e <= 5: base = "wall" if base == "portable" else base
    court = rp({"red": (170, 90, 60), "green": (70, 120, 80), "blue": (60, 100, 150), "grey": (130, 130, 128), "tan": (190, 160, 110)}[v.get("court", "red")], 12)
    if e == 4: court = rp(mix(court[2], (150, 130, 100), .5), 10)
    if e == 8: court = rp(mix(court[2], (40, 44, 50), .35), 10)
    d.rectangle([X0, Y0 + H_ * .3, X1, Y1], fill=court[2]); d.arc([cx - W_ * .3, Y1 - H_ * .3, cx + W_ * .3, Y1 + H_ * .3], 180, 360, fill=(240, 240, 236), width=2)
    d.rectangle([cx - W_ * .18, Y0 + H_ * .3, cx + W_ * .18, Y1 - 2], outline=(240, 240, 236), width=2)
    by = Y0 + H_ * .28
    if base == "wall": lit_rect(tm, X0, Y0, X1, Y0 + H_ * .14, rp((150, 70, 50) if e < 7 else (170, 168, 160), 14))
    elif base == "portable" and e >= 7:
        lit_rect(tm, cx - W_ * .3, Y0, cx + W_ * .3, Y0 + H_ * .22, rp((40, 40, 44), 10), r=6); d.line([cx, Y0 + H_ * .1, cx, by], fill=OUT, width=7); d.line([cx, Y0 + H_ * .1, cx, by], fill=STEEL[2], width=5)
    else:
        pc = OAK if e <= 5 else STEEL if e <= 7 else COMPOSITE
        lit_ellipse(tm, cx, Y0 + 8, 6, 6, pc); d.line([cx, Y0 + 8, cx, by], fill=OUT, width=7); d.line([cx, Y0 + 8, cx, by], fill=pc[2], width=5)
    bw = W_ * .42
    board = [None, None, None, None, rp((150, 120, 80), 14), rp((190, 170, 130), 14), rp((236, 236, 230), 10), rp((190, 214, 226), 10), COMPOSITE][max(4, e)]
    if e == 6 and c.w >= 3: d.pieslice([cx - bw, by - 8, cx + bw, by + 8], 0, 180, fill=board[2], outline=OUT)
    else: lit_rect(tm, cx - bw, by - 4, cx + bw, by + 4, board)
    if e == 7: d.rectangle([cx - 8, by - 3, cx + 8, by + 3], outline=(220, 40, 30), width=1)
    rr = H_ * .16; rcx, rcy = cx, by + 6 + rr
    if e == 4:
        lit_ellipse(tm, rcx, rcy, rr, rr, rp((180, 150, 90), 16)); d.ellipse([rcx - rr * .65, rcy - rr * .65, rcx + rr * .65, rcy + rr * .65], fill=(80, 60, 40))
        for k in range(8): a = k * .785; d.line([rcx + math.cos(a) * rr * .65, rcy + math.sin(a) * rr * .65, rcx + math.cos(a) * rr, rcy + math.sin(a) * rr], fill=rp((180, 150, 90))[0], width=1)
        return
    d.line([cx, by + 4, rcx, rcy - rr], fill=OUT, width=4)
    nc = (240, 240, 236) if net == "cord" else (170, 170, 176) if net == "chain" else (200, 200, 196)
    if e == 5: d.ellipse([rcx - rr * .7, rcy - rr * .7, rcx + rr * .7, rcy + rr * .7], fill=(220, 214, 200))
    if (net != "torn" or c.w >= 3):
        d.ellipse([rcx - rr * .55, rcy - rr * .4, rcx + rr * .55, rcy + rr * .7], outline=nc, width=1)
        for k in range(8): a = k * .785; d.line([rcx + math.cos(a) * rr, rcy + math.sin(a) * rr, rcx + math.cos(a) * rr * .5, rcy + math.sin(a) * rr * .5 + rr * .15], fill=nc, width=1)
    elif net == "torn": d.line([rcx - rr * .6, rcy + rr * .6, rcx - rr * .3, rcy + rr * 1.1], fill=nc, width=1)
    rim = (230, 100, 30) if e < 8 else GLOW[1]
    d.ellipse([rcx - rr - 1, rcy - rr - 1, rcx + rr + 1, rcy + rr + 1], outline=OUT, width=4); d.ellipse([rcx - rr, rcy - rr, rcx + rr, rcy + rr], outline=rim, width=2)


MAILPAINT = {"grey": (150, 150, 156), "black": (36, 36, 40), "red": (170, 40, 36), "green": (50, 110, 60), "blue": (50, 80, 150)}


def mailbox(tm, x, y, w, h, st, v):
    """A letter box on its post from above. In the Americas the rural mailbox: from 1915 the round-topped tin
    Joroleman box with its red flag (raised when there is mail to go), before it a home-made wooden box; painted
    mid-century, black plastic or steel from the 1990s, dark with a lit indicator in Future Darkness. In Australia and
    Aotearoa a box on a post or a little brick pillar with its slot and a name plate, an old drum or milk can on poor
    farms. Closed: the door shut (the flag up or down); open: the door dropped and the letters showing. Rich: a stone
    or brick pillar, a brass plate; poor: a battered can."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e
    op = st == "open"; flag_up = v.get("flag", "down") == "up"
    if c.s == "oceania":
        if c.poor:
            lit_ellipse(tm, cx, cy, W_ * .42, H_ * .42, rp((120, 120, 126) if e < 7 else (60, 120, 60), 16)); d.ellipse([cx - W_ * .2, cy - H_ * .2, cx + W_ * .2, cy + H_ * .2], outline=OUT)
            if op: d.ellipse([cx - W_ * .3, cy - H_ * .3, cx + W_ * .3, cy + H_ * .3], fill=(30, 26, 26)); d.rectangle([cx - 4, cy - 3, cx + 4, cy + 2], fill=(240, 236, 220))
            return
        pc = rp(mix((160, 70, 50), MAILPAINT[v.get("paint", "grey")], .55), 14) if c.w >= 3 or e <= 5 else rp(mix((200, 190, 170), MAILPAINT[v.get("paint", "grey")], .6), 12)
        if e == 8: pc = COMPOSITE
        lit_rect(tm, X0, Y0, X1, Y1, pc)
        if c.w >= 3 or e <= 5:
            for k in range(3): d.line([X0 + 1, Y0 + 4 + k * 5, X1 - 1, Y0 + 4 + k * 5], fill=pc[1], width=1)
        d.rectangle([cx - W_ * .3, Y1 - 5, cx + W_ * .3, Y1 - 3], fill=(20, 18, 20))
        if c.rich: d.rectangle([cx - 4, cy - 3, cx + 4, cy], fill=BRASS[3], outline=OUT)
        if op: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 6], fill=(30, 26, 26)); d.rectangle([cx - 4, cy - 3, cx + 3, cy + 2], fill=(240, 236, 220))
        if e == 8: d.line([X0 + 2, Y0 + 2, X1 - 2, Y0 + 2], fill=GLOW[2], width=1)
        return
    pc = MAILPAINT[v.get("paint", "grey")]
    col = [None] * 4 + [mix((130, 100, 70), pc, .65), pc, mix(pc, (230, 226, 210), .2), mix(pc, (30, 30, 34), .25), mix(pc, (54, 58, 68), .4)]
    B = rp(col[max(4, e)], 18)
    mount = v.get("mount", "post")
    if c.rich or mount == "pillar": lit_rect(tm, X0, Y0, X1, Y1, rp((150, 140, 130) if c.rich else (160, 80, 60), 14))
    elif mount == "bracket": lit_rect(tm, X0, cy - 3, X1, cy + 3, IRON if e < 7 else STEEL)
    else: lit_ellipse(tm, cx, cy + 2, 4, 4, OAK)
    bx0, bx1 = cx - W_ * .3, cx + W_ * .3
    if e == 4:
        lit_rect(tm, bx0 - 2, Y0 + 1, bx1 + 2, Y1 - 2, B); d.polygon([(bx0 - 2, Y0 + 1), (bx1 + 2, Y0 + 1), (cx, Y0 + 6)], fill=B[3], outline=OUT)
    elif e == 5: lit_rect(tm, bx0, Y0 + 1, bx1, Y1 - 2, B, r=4); d.line([cx, Y0 + 3, cx, Y1 - 4], fill=B[4], width=1)
    elif e == 6:
        lit_rect(tm, bx0 - 1, Y0 + 1, bx1 + 1, Y1 - 2, B, r=4); d.rectangle([bx0 + 1, cy - 2, bx1 - 1, cy + 2], fill=(240, 236, 220), outline=OUT)
    elif e == 7:
        lit_rect(tm, bx0 - 2, Y0 + 2, bx1 + 2, Y1 - 3, B, r=2)
        for k in range(3): d.line([bx0, Y0 + 5 + k * 4, bx1, Y0 + 5 + k * 4], fill=B[0], width=1)
    else:
        lit_ellipse(tm, cx, cy, W_ * .36, H_ * .42, B); d.line([cx, Y0 + 3, cx, Y1 - 3], fill=GLOW[1], width=1)
    if op:
        d.rectangle([bx0 + 1, Y1 - 3, bx1 - 1, Y1 + 1], fill=B[1], outline=OUT); d.rectangle([bx0 + 2, Y1 - 8, bx1 - 2, Y1 - 3], fill=(240, 236, 220))
    if e >= 5:
        fx = bx1 + 1
        if flag_up: d.rectangle([fx, Y0 + 2, fx + 2, Y0 + 9], fill=(220, 40, 30), outline=OUT)
        else: d.rectangle([fx, Y1 - 6, fx + 2, Y1 - 2], fill=(150, 40, 30), outline=OUT)
    if e == 8: d.rectangle([cx - 1, Y0 + 3, cx + 1, Y0 + 5], fill=GLOW[2])


SANDFRAME = {"boards": OAK, "tyre": rp((40, 40, 44), 10), "shell": rp((60, 150, 80), 18), "stone": rp((180, 176, 166), 12)}


def sandpit(tm, x, y, w, h, st, v):
    """A children's sandpit from above: its frame and the raked or dug sand in it with the toys left. The age's make: a
    board frame with corner seats and a wooden spade (Victorian kindergarten), a board frame and a tin bucket (Great
    War), a concrete or tyre ring with a red tin lorry (mid-century), a green plastic shell or turtle with bright
    plastic moulds (Modern), a dark composite tray with a lit rim (Future Darkness), the same the world over. Frame:
    boards, a tyre, a plastic shell or stone kerbs. Toys: none, a bucket and spade, a digger, moulds. Rich: a lid
    stood by it and clean sand; poor: grey sand with litter."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e
    fr = v.get("frame", "boards")
    if fr == "tyre" and e < 6: fr = "stone"
    if fr == "shell" and e < 7: fr = "boards"
    if e == 8: fr = "composite"
    toyc = {"red": (200, 40, 40), "blue": (40, 100, 210), "yellow": (240, 200, 40), "green": (50, 140, 60)}[v.get("colour", "red")]
    F = SANDFRAME.get(fr, COMPOSITE)
    if fr == "boards": F = [OAK, OAK, OAK, OAK, OAK, rp(mix((60, 100, 70), toyc, .45), 16), rp((176, 172, 164), 12), rp((90, 70, 50), 14), COMPOSITE][e]
    S = rp({"yellow": (220, 196, 130), "white": (232, 226, 210), "grey": (170, 164, 150), "red": (200, 140, 100)}[v.get("sand", "yellow")], 12)
    shadow(tm, X0, Y0, X1, Y1, 4, .62)
    if fr in ("tyre", "shell"):
        r = min(W_, H_) / 2
        if fr == "shell":
            pts = [(cx + math.cos(a) * r * (1 + .06 * math.sin(a * 8)), cy + math.sin(a) * r * (1 + .06 * math.sin(a * 8))) for a in np.linspace(0, 6.28, 32, endpoint=False)]
            poly(tm, pts, F, 2); d.ellipse([cx - r * .82, cy - r * .82, cx + r * .82, cy + r * .82], fill=S[2], outline=F[0])
            lit_ellipse(tm, X0 + 10, cy, 9, 8, F)
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=F[1], outline=OUT); d.ellipse([cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8], fill=S[2], outline=OUT)
            for a in np.linspace(0, 6.28, 24, endpoint=False): d.line([cx + math.cos(a) * r * .82, cy + math.sin(a) * r * .82, cx + math.cos(a) * r * .97, cy + math.sin(a) * r * .97], fill=F[3], width=2)
        ix0, iy0, ix1, iy1 = cx - r * .6, cy - r * .6, cx + r * .6, cy + r * .6
    else:
        bw = 9 if not (fr == "boards" and e == 7) else 15
        lit_rect(tm, X0, Y0, X1, Y1, F, r=8 if fr == "composite" else 18 if (fr == "boards" and e == 6) else 0)
        if fr == "boards" and e == 7:
            for p_ in ((X0, Y0), (X1 - 15, Y0), (X0, Y1 - 15), (X1 - 15, Y1 - 15)): d.ellipse([p_[0] + 2, p_[1] + 2, p_[0] + 13, p_[1] + 13], outline=F[0])
        if fr == "boards" and e == 5:
            for t in np.arange(X0 + 20, X1, 20): d.line([t, Y0, t, Y0 + bw], fill=F[0]); d.line([t, Y1 - bw, t, Y1], fill=F[0])
        d.rectangle([X0 + bw, Y0 + bw, X1 - bw, Y1 - bw], fill=S[2], outline=F[0])
        if fr == "boards":
            for k in range(4): d.line([X0 + 2, Y0 + 3 + k * 2, X1 - 2, Y0 + 3 + k * 2], fill=F[1]) if k == 1 else None
            if e == 4:
                for p in ((X0, Y0), (X1 - 24, Y0), (X0, Y1 - 24), (X1 - 24, Y1 - 24)): lit_rect(tm, p[0], p[1], p[0] + 24, p[1] + 24, F)
        if fr == "stone":
            for k in range(int(W_ / 20)): d.line([X0 + k * 20, Y0, X0 + k * 20, Y0 + bw], fill=F[0]); d.line([X0 + k * 20, Y1 - bw, X0 + k * 20, Y1], fill=F[0])
        if fr == "composite": d.rounded_rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], 6, outline=GLOW[1], width=2)
        ix0, iy0, ix1, iy1 = X0 + bw + 4, Y0 + bw + 4, X1 - bw - 4, Y1 - bw - 4
    for k in range(6): yy = iy0 + (iy1 - iy0) * k / 6; d.line([ix0 + 4, yy, ix0 + 20, yy - 3, ix1 - 6, yy], fill=S[3], width=1)
    toys = v.get("toys", "bucket")
    if toys != "none":
        tc = ([None] * 4 + [(120, 90, 60), mix((150, 150, 156), toyc, .4), toyc, toyc, mix(toyc, (60, 64, 76), .5)])[max(4, e)]
        T_ = rp(tc, 18)
        if toys == "bucket":
            bx, by = ix0 + (ix1 - ix0) * .3, iy0 + (iy1 - iy0) * .35; lit_ellipse(tm, bx, by, 9, 9, T_); d.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=T_[0])
            d.line([ix1 - 20, iy1 - 10, ix1 - 6, iy1 - 24], fill=OUT, width=4); d.line([ix1 - 20, iy1 - 10, ix1 - 6, iy1 - 24], fill=rp((240, 200, 40) if e >= 6 else (130, 100, 70))[3], width=2)
        elif toys == "digger":
            bx, by = cx, cy; lit_rect(tm, bx - 14, by - 8, bx + 10, by + 8, T_, r=2); lit_rect(tm, bx - 6, by - 6, bx + 4, by + 4, rp((240, 200, 40) if e >= 6 else (160, 160, 166), 14))
            for p in ((bx - 12, by - 10), (bx + 6, by - 10), (bx - 12, by + 8), (bx + 6, by + 8)): d.rectangle([p[0], p[1], p[0] + 5, p[1] + 2], fill=(30, 30, 30))
        else:
            for k in range(3):
                mx, my = ix0 + (ix1 - ix0) * (.25 + k * .25), iy0 + (iy1 - iy0) * (.55 + (k % 2) * .15)
                lit_ellipse(tm, mx, my, 7, 7, rp(S[2], 12)); d.ellipse([mx - 4, my - 4, mx + 4, my + 4], outline=S[0])
            lit_rect(tm, ix1 - 22, iy0 + 4, ix1 - 6, iy0 + 18, T_, r=3)
    if c.rich: lit_rect(tm, X1 - 12, Y0 + 4, X1 - 2, Y1 - 4, F if fr != "shell" else rp((60, 150, 80), 18))
    if c.poor and e >= 6: era_litter(tm, c, ix0 + 10, iy1 - 10, 9)


JUMPCOL = {"red": (200, 40, 40), "blue": (40, 80, 180), "green": (50, 130, 60), "yellow": (230, 200, 40)}


def showjump(tm, x, y, w, h, st, v):
    """A show jump from above: the two wings (stands) at its ends, the poles laid across in their cups, striped in
    their colours, and the filler under them. Kinds: an upright of poles, an oxer of two rows of poles, a painted
    wall of blocks, or a gate. The age's make, the same wherever horses jump: rustic natural poles with coloured ends
    (Victorian), white army poles banded in colour (Great War), painted striped poles on lattice wings with flower boxes
    (mid-century), bright sponsor wings with plastic fillers and flower troughs (Modern), dark composite poles with lit
    ends (Future Darkness). Colour: red, blue, green or yellow. Rich (a show ground): flowers at its foot; poor: a
    bare rail on drums."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) / 2; e = c.e
    kind = v.get("kind", "upright"); A = JUMPCOL[v.get("colour", "red")]; B = (240, 240, 236)
    if e == 4: A, B = (170, 140, 100), mix(A, (170, 140, 100), .4)
    if e == 5: A, B = (236, 236, 230), A
    if e == 4: B = JUMPCOL[v.get("colour", "red")]
    if e == 8: A, B = mix(A, (54, 58, 68), .6), (80, 84, 96)
    ww = H_ * .7 if e >= 6 else H_ * .45
    wing = rp(mix(A, (240, 240, 236), .3) if e >= 6 else mix((130, 100, 70), JUMPCOL[v.get("colour", "red")], .35) if e == 4 else (130, 100, 70), 16)
    if e == 7: wing = rp(((40, 90, 170), (230, 120, 30), (60, 140, 70), (200, 40, 60))[c.w % 4], 18)
    for wx in (X0 + 2, X1 - 2 - ww):
        if c.poor: lit_ellipse(tm, wx + ww / 2, cy, ww / 2, ww / 2, rp((60, 90, 140), 14)); continue
        if e == 5:                                                          # an army trestle: two posts and a cross brace
            for yy in (Y0 + 4, Y1 - 4 - ww * .5): lit_rect(tm, wx + ww * .25, yy, wx + ww * .75, yy + ww * .5, wing)
            d.line([wx + ww / 2, Y0 + 6, wx + ww / 2, Y1 - 6], fill=OUT, width=4); d.line([wx + ww / 2, Y0 + 6, wx + ww / 2, Y1 - 6], fill=wing[3], width=2); continue
        shadow(tm, wx, Y0 + 2, wx + ww, Y1 - 2, 3, .62); lit_rect(tm, wx, Y0 + 2, wx + ww, Y1 - 2, wing)
        if e == 6:
            for k in range(3): d.line([wx + 2, Y0 + 4 + k * H_ * .3, wx + ww - 2, Y0 + 4 + k * H_ * .3 + 6], fill=wing[0])
        if e == 7: d.rectangle([wx + 3, cy - 4, wx + ww - 3, cy + 4], fill=(240, 240, 236))
    px0, px1 = X0 + ww, X1 - ww
    rows = [cy] if kind in ("upright", "gate") else [cy - H_ * .2, cy + H_ * .2]
    fill_ = v.get("filler", "none")
    if fill_ == "brush":
        for xx in np.arange(px0, px1, 6): d.line([xx, cy - H_ * .35, xx, cy + H_ * .35], fill=rp((70, 100, 50))[1 + (int(xx) // 6) % 3], width=3)
    elif fill_ == "flowers":
        for xx in np.arange(px0 + 4, px1 - 10, 26): lit_rect(tm, xx, cy + H_ * .05, xx + 22, cy + H_ * .4, rp((120, 90, 60), 12)); dots(tm, c, xx + 11, cy + H_ * .2, 9, (230, 60, 80) if e != 8 else GLOW[1], 5, 3)
    elif fill_ == "planks":
        lit_rect(tm, px0, cy - H_ * .3, px1, cy + H_ * .3, rp(mix(A, (200, 190, 170), .5), 14))
        for xx in np.arange(px0 + 20, px1, 20): d.line([xx, cy - H_ * .3, xx, cy + H_ * .3], fill=OUT)
    if kind == "wall":
        lit_rect(tm, px0, cy - H_ * .25, px1, cy + H_ * .25, rp((200, 60, 50) if e != 8 else (60, 64, 74), 16))
        for xx in np.arange(px0 + 14, px1, 14): d.line([xx, cy - H_ * .25 + 1, xx, cy + H_ * .25 - 1], fill=(236, 230, 220) if e != 8 else GLOW[0], width=1)
        rows = [cy - H_ * .32]
    if kind == "gate":
        lit_rect(tm, px0, cy - H_ * .18, px1, cy + H_ * .18, rp(mix(A, (255, 255, 255), .2), 14))
        for xx in np.arange(px0 + 10, px1, 10): d.line([xx, cy - H_ * .18, xx, cy + H_ * .18], fill=OUT, width=1)
        rows = []
    for k, ry in enumerate(rows):
        off = 0
        d.line([px0 - 2 + off, ry, px1 + 2 - off, ry], fill=OUT, width=8)
        d.line([px0 - 1 + off, ry, px1 + 1 - off, ry], fill=A, width=6)
        if e != 4:
            for xx in np.arange(px0 + 16 + off, px1 - off, 32 if e != 5 else 48): d.line([xx, ry, xx + (16 if e != 5 else 24), ry], fill=B, width=6)
        else:
            for xx in (px0 + 4, px1 - 10): d.line([xx, ry, xx + 6, ry], fill=B, width=6)          # the colour at the pole ends
        d.line([px0 + off, ry - 2, px1 - off, ry - 2], fill=tone(A, 40), width=1)
        if e == 8: d.ellipse([px0 - 3, ry - 3, px0 + 3, ry + 3], fill=GLOW[2]); d.ellipse([px1 - 3, ry - 3, px1 + 3, ry + 3], fill=GLOW[2])
    if c.rich and e >= 6:
        for xx in (px0 + 10, px1 - 30): lit_rect(tm, xx, Y1 - 10, xx + 20, Y1 - 2, rp((120, 90, 60), 12)); dots(tm, c, xx + 10, Y1 - 6, 8, (230, 60, 80), 5, 3)


def slide(tm, x, y, w, h, st, v):
    """A children's slide from above, its ladder at the north end, the platform at the top and the chute running down to
    the south with its run-out, its shadow lying beside it. The age's make, the same the world over: a polished steel
    chute on a painted steel frame (from the 1920s), a moulded plastic chute in a bright colour on a galvanised or
    timber tower, straight, wavy or a closed tube (from the 1990s), a dark composite chute with lit edges (Future
    Darkness). Colour: red, blue, yellow or green. Rich: a soft-fall mat at the foot; poor: worn earth."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) / 2; e = c.e
    col = FRAMECOL[v.get("colour", "red")]; kind = v.get("kind", "straight")
    if e == 6 and kind == "tube": kind = "wave"
    F = rp(col, 20) if e < 8 else rp(mix(col, (50, 54, 64), .65), 12)
    gnd = rp({"gravel": (176, 160, 120), "grass": (80, 120, 60), "bark": (130, 90, 60), "rubber": (50, 90, 130)}[v.get("ground", "gravel")], 12)
    d.rectangle([X0, Y0, X1, Y1], fill=gnd[2])
    if e == 6: d.rectangle([X0 + 1, Y0, X1 - 1, Y0 + H_ * .24], fill=rp(col, 20)[1], outline=OUT)
    ly0, ly1 = Y0 + 2, Y0 + H_ * .22
    for xx in (X0 + 4, X1 - 4): d.line([xx, ly0, xx, ly1], fill=OUT, width=6); d.line([xx, ly0, xx, ly1], fill=F[2], width=4)
    for k in range(5):
        yy = ly0 + 4 + k * (ly1 - ly0 - 6) / 4; d.line([X0 + 4, yy, X1 - 4, yy], fill=OUT, width=4); d.line([X0 + 4, yy, X1 - 4, yy], fill=STEEL[3] if e < 8 else COMPOSITE[3], width=2)
    lit_rect(tm, X0 + 2, ly1, X1 - 2, ly1 + H_ * .1, F if e == 6 else rp((150, 110, 70), 14) if e == 7 else COMPOSITE)
    cy0, cy1 = ly1 + H_ * .1, Y1 - 6
    tm.shade((cx - W_ * .25 + 5, cy0 + 6, cx + W_ * .25 + 8, cy1 + 6), f=.7)
    chute = rp((200, 204, 210), 16) if e == 6 else rp(col, 22) if e == 7 else rp(mix(col, (60, 64, 76), .6), 12)
    hw = W_ * .3
    if kind == "wave" and e >= 7:
        pts = [(cx + math.sin(t * 9) * 3, cy0 + (cy1 - cy0) * t) for t in np.linspace(0, 1, 12)]
        for k, (px_, py_) in enumerate(pts[:-1]):
            q = pts[k + 1]; shade_ = 3 if k % 3 == 0 else 2
            d.rectangle([min(px_, q[0]) - hw, py_, max(px_, q[0]) + hw, q[1]], fill=chute[shade_])
        d.rectangle([cx - hw - 3, cy0, cx - hw, cy1], fill=chute[0], outline=OUT); d.rectangle([cx + hw, cy0, cx + hw + 3, cy1], fill=chute[1], outline=OUT)
    elif kind == "tube" and e >= 7:
        lit_rect(tm, cx - hw - 3, cy0, cx + hw + 3, cy1, chute, r=int(hw))
        for yy in np.arange(cy0 + 10, cy1, 16): d.line([cx - hw - 2, yy, cx + hw + 2, yy], fill=chute[1], width=2)
    else:
        d.rectangle([cx - hw - 3, cy0, cx + hw + 3, cy1], fill=F[1] if e == 6 else chute[1], outline=OUT)
        d.rectangle([cx - hw, cy0, cx + hw, cy1], fill=chute[3])
        d.line([cx - hw * .4, cy0 + 4, cx - hw * .4, cy1 - 4], fill=chute[4], width=2)
        if kind == "wave":                                                  # the humps of a wave slide, as bands of light and shade
            for t in (.33, .66): yy = cy0 + (cy1 - cy0) * t; d.rectangle([cx - hw, yy - 5, cx + hw, yy], fill=chute[1]); d.rectangle([cx - hw, yy, cx + hw, yy + 5], fill=chute[4])
    d.rectangle([cx - hw - 3, cy1 - 6, cx + hw + 3, cy1], fill=chute[2], outline=OUT)
    if e == 8: d.line([cx - hw - 2, cy0, cx - hw - 2, cy1], fill=GLOW[1], width=1); d.line([cx + hw + 2, cy0, cx + hw + 2, cy1], fill=GLOW[1], width=1)


BOLLARDCOL = {"black": (40, 40, 44), "green": (40, 80, 56), "grey": (140, 140, 146), "white": (226, 226, 220)}


def streetbollard(tm, x, y, w, h, st, v):
    """A street bollard from above, its round top and short shadow. The age's make, the same in every port and town that
    had one: an old cannon set muzzle-up with a ball in its mouth (Age of Reason), a cast-iron bollard with a crown cap
    and a crest band (Victorian), a plain iron post (Great War), a concrete post or dome (mid-century), a steel tube with
    a reflective band (Modern), a dark retractable bollard with a lit ring (Future Darkness). Colour: black, green, grey
    or white. Rich: a pair of chains between, polished; poor: a stone stub."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; R_ = min(X1 - X0, Y1 - Y0) / 2; e = c.e
    col = BOLLARDCOL[v.get("colour", "black")]
    if e == 6: col = mix(col, (170, 168, 160), .55)
    if e == 7: col = mix(col, (170, 174, 180), .4)
    if e == 8: col = mix(col, (54, 58, 68), .25)
    shape = v.get("kind", "round")
    B = rp(col, 22)
    r = R_ * .7
    gp = rp(GROUNDS[v.get("ground", "flags")], 10); d.rectangle([X0, Y0, X1, Y1], fill=gp[2])
    if v.get("ground") in ("flags", "brick"): d.line([X0, cy, X1, cy], fill=gp[0]); d.line([cx + 3, Y0, cx + 3, cy], fill=gp[0])
    eshadow(tm, cx, cy, r, r, 3, 4, .6)
    if c.poor and e <= 5:
        lit_rect(tm, cx - r, cy - r, cx + r, cy + r, rp((150, 146, 136), 14), r=3); return
    if e == 3 and shape == "square":
        lit_rect(tm, cx - r, cy - r, cx + r, cy + r, rp((170, 166, 156), 14))
    elif e == 3:
        lit_ellipse(tm, cx, cy, r, r, B); d.ellipse([cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55], fill=(20, 18, 20)); lit_ellipse(tm, cx, cy, r * .4, r * .4, IRON)
    elif e == 4 and shape == "square":
        pts = [(cx + math.cos(a) * r, cy + math.sin(a) * r) for a in np.linspace(0, 6.28, 8, endpoint=False) + .39]; poly(tm, pts, B, 2); lit_ellipse(tm, cx, cy, r * .4, r * .4, B)
    elif e == 4:
        lit_ellipse(tm, cx, cy, r, r, B); d.ellipse([cx - r * .65, cy - r * .65, cx + r * .65, cy + r * .65], outline=B[4] if not c.rich else BRASS[3], width=2); lit_ellipse(tm, cx, cy, r * .3, r * .3, B)
    elif e == 5:
        if shape == "square": lit_rect(tm, cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8, B)
        else: lit_ellipse(tm, cx, cy, r * .85, r * .85, B)
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=B[0])
    elif e == 6:
        if shape == "square": lit_rect(tm, cx - r, cy - r, cx + r, cy + r, B, r=2)
        elif shape == "dome": lit_ellipse(tm, cx, cy, r, r, B); lit_ellipse(tm, cx - 1, cy - 1, r * .5, r * .5, B)
        else: lit_ellipse(tm, cx, cy, r * .8, r * .8, B); d.ellipse([cx - r * .4, cy - r * .4, cx + r * .4, cy + r * .4], outline=B[0])
    elif e == 7:
        if shape == "square": lit_rect(tm, cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8, B, r=2); d.rectangle([cx - r * .8, cy - r * .2, cx + r * .8, cy + r * .2], fill=(240, 240, 236))
        else: lit_ellipse(tm, cx, cy, r * .8, r * .8, B); d.ellipse([cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8], outline=(240, 240, 236) if shape == "round" else (240, 200, 40), width=2)
        d.ellipse([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], fill=B[0])
    else:
        if shape == "square": d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=rp((90, 90, 96), 10)[1], outline=OUT)
        else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rp((90, 90, 96), 10)[1], outline=OUT)
        lit_ellipse(tm, cx, cy, r * (.7 if shape != "dome" else .5), r * (.7 if shape != "dome" else .5), B)
        d.ellipse([cx - r * .7, cy - r * .7, cx + r * .7, cy + r * .7], outline=GLOW[1], width=1)
    if c.rich and e in (4, 5): d.line([X0, cy, cx - r, cy], fill=IRON[3], width=2); d.line([cx + r, cy, X1, cy], fill=IRON[3], width=2)


INSUL = {4: (80, 160, 120), 5: (120, 180, 150), 6: (130, 80, 50), 7: (150, 150, 150), 8: (60, 64, 76)}


def utilitypole(tm, x, y, w, h, st, v):
    """A telegraph or power pole from above: the pole's top, its crossarm or arms and the insulators on them, the wires
    running off north and south, and its shadow. The age's make, the same the world over: crossarms with four
    green glass insulators each and an iron weather cap on a tarred pole (Victorian), arms of six insulators on iron
    braces with a cable box (Great War), a power pole
    with brown porcelain insulators and a grey transformer can (mid-century), a pole with a street lamp arm, bundled
    black cable and junction boxes (Modern), a dark composite pole with a sealed lit box (Future Darkness). Kind:
    telegraph, power or with a street lamp. Pole: creosoted, weathered grey or concrete. Rich (a main road): more
    arms and lines; poor: a leaning pole with a single wire."""
    c = ctx(tm, v); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2; e = c.e
    kind = v.get("kind", "power"); wood = v.get("pole", "creosote")

    P_ = rp((70, 52, 40), 14) if wood == "creosote" else rp((150, 140, 126), 12) if wood == "grey" else rp((170, 168, 160), 12)
    if e == 8: P_ = rp(mix(P_[2], (54, 58, 68), .5), 10)
    arms = int(v.get("arms", 1))
    if e == 4 and kind == "light": arms = 1
    ins = INSUL[max(4, e)]; wire = (30, 30, 34)
    gaps = [[H_ * .32], [H_ * .18, H_ * .5], [H_ * .1, H_ * .36, H_ * .62]][arms - 1]
    armc = (P_ if wood != "concrete" else STEEL) if e < 8 else rp(mix(P_[2], (54, 58, 68), .5), 10)
    aw = 7 if kind == "power" else 5                                        # power arms are heavier
    for k, gy in enumerate(gaps):
        ay = Y0 + gy + 3
        d.line([X0 + 2, ay, X1 - 2, ay], fill=OUT, width=aw + 2); d.line([X0 + 2, ay, X1 - 2, ay], fill=armc[2], width=aw); d.line([X0 + 2, ay - 2, X1 - 2, ay - 2], fill=armc[4], width=1)
        n = 4 if e == 4 else 6 if e == 5 else 3
        if kind == "telegraph": n += 2
        if e == 5:                                                          # the arm's two iron braces
            for sg in (-1, 1): d.line([cx, cy, cx + sg * W_ * .22, ay + 1], fill=IRON[2], width=2)
        for j in range(n):
            ix = X0 + 8 + (W_ - 16) * j / (n - 1)
            d.line([ix, Y0, ix, Y1], fill=wire, width=1)
            ir = 4 if kind == "power" else 3
            d.ellipse([ix - ir, ay - ir, ix + ir, ay + ir], fill=ins, outline=OUT); d.point((ix - 1, ay - 1), fill=(240, 250, 250))
    lit_ellipse(tm, cx, cy, 5, 5, P_)
    if e == 4: d.polygon([(cx - 5, cy), (cx, cy - 5), (cx + 5, cy), (cx, cy + 5)], fill=IRON[2], outline=OUT)     # the iron weather cap
    if kind == "power" and e >= 6:
        tx = cx + W_ * .12; lit_ellipse(tm, tx, Y1 - H_ * .3, 7, 7, rp((150, 156, 160), 16)); d.ellipse([tx - 3, Y1 - H_ * .3 - 3, tx + 3, Y1 - H_ * .3 + 3], fill=rp((150, 156, 160))[1])
    if kind == "light" and e <= 5:                                          # an arc or gas lamp hung on the pole
        lit_ellipse(tm, cx - W_ * .25, Y1 - 6, 5, 5, rp((60, 60, 64), 10)); d.ellipse([cx - W_ * .25 - 2, Y1 - 8, cx - W_ * .25 + 2, Y1 - 4], fill=(250, 230, 170))
        d.line([cx, cy, cx - W_ * .25, Y1 - 6], fill=IRON[2], width=2)
    if e == 5: d.rectangle([cx - 3, cy + 4, cx + 3, Y1 - 2], fill=IRON[2], outline=OUT)
    if kind == "light" and e >= 6:
        d.line([cx, cy, cx - W_ * .3, Y1 - 4], fill=OUT, width=4); d.line([cx, cy, cx - W_ * .3, Y1 - 4], fill=STEEL[3], width=2)
        lit_rect(tm, cx - W_ * .3 - 6, Y1 - 8, cx - W_ * .3 + 6, Y1 - 1, rp((200, 200, 196) if e < 8 else (60, 64, 76), 12), r=2)
        d.rectangle([cx - W_ * .3 - 3, Y1 - 3, cx - W_ * .3 + 3, Y1 - 1], fill=(250, 220, 140) if e < 8 else GLOW[2])
    if e == 7: d.line([X0 + 4, cy + 5, X1 - 4, cy + 7], fill=(10, 10, 12), width=3); lit_rect(tm, cx + 6, cy - 3, cx + 14, cy + 3, rp((90, 96, 100), 12))
    if e == 8: lit_rect(tm, cx + 6, cy - 4, cx + 16, cy + 4, COMPOSITE); d.line([cx + 8, cy, cx + 14, cy], fill=GLOW[2], width=1)


# ================================================================ definitions
_def("beaverlodge", beaverlodge, axes={"water": ["open", "autumn", "ice"]}, nvar=24, ref="beaver lodges 10 to 16 ft across at the waterline (North American and Eurasian beaver studies)")
_def("burrow", burrow, axes={"mouth": ["single", "twin", "mound", "run"]}, ref="badger sett and fox earth entrances 8 to 12 in across with spoil heaps 3 to 5 ft")
_def("cactus", cactus, axes={"bloom": ["none", "flower", "fruit"]}, ref="prickly pear clumps and saguaro crowns 3 to 5 ft across")
_def("deadtree", deadtree, axes={"kind": ["standing", "struck", "hollow", "ivy", "fungus"]}, ref="field and woodland trees with crowns 8 to 12 ft once the twigs are gone")
_def("fruittree", fruittree, axes={"season": ["blossom", "leaf", "fruit", "bare"]}, ref="orchard standards and half-standards 10 to 14 ft across the crown (orchard planting guides)")
_def("heap", heap, axes={"material": ["earth", "sand", "gravel", "clay"]}, ref="a cart or lorry load tipped, 5 to 7 ft across")
_def("leafpile", leafpile, ref="a raked heap of leaves 3 to 5 ft across")
_def("midden", midden, axes={"contents": ["dung", "kitchen", "ash"]}, ref="farm middens and compost bays about 6 ft square")
_def("reeds", reeds, axes={"season": ["green", "flowering", "winter"]}, ref="a reed or bulrush stand 3 to 5 ft across at the bank")
_def("seaweed", seaweed, ref="a strandline of wrack 3 to 5 ft long, 1 1/2 to 2 1/2 ft wide")
_def("standingstone", standingstone, ref="menhirs and runestones 2 to 4 ft across the top, 1 1/2 to 2 1/2 ft thick")
_def("stook", stook, axes={"crop": ["wheat", "rye", "oats", "barley"]}, ref="a stook of eight to twelve sheaves about 3 ft across")
_def("sunshade", sunshade, ref="market and courtyard awnings 8 to 12 ft square on four to six poles")
_def("tarp", tarp, axes={"load": ["none", "goods", "bedroll", "tools", "food"], "sheet": ["blue", "green", "orange", "grey", "brown"]}, nvar=26, low=True, global_from=1990, ref="tarpaulins and groundsheets 6 by 8 to 10 by 12 ft")
_def("topiary", topiary, axes={"shape": ["ball", "cone", "tiers", "bird"], "leaf": ["green", "golden", "blue"]}, nvar=30, ref="clipped yew and box pieces 3 to 5 ft across")
_def("tumbleweed", tumbleweed, ref="Russian thistle balls 2 to 3 ft across")
_def("waterlily", waterlily, axes={"season": ["flowering", "leaf", "autumn"]}, ref="a clump of lily pads 2 to 4 ft across, pads 6 to 12 in (Amazon lily pads to 3 ft)")
_def("wildplants", wildplants, axes={"season": ["spring", "summer", "autumn"]}, ref="a patch of wild flowers about 3 ft across")
_def("planter", planter, axes={"plants": ["herbs", "flowers", "vegetables"]}, ref="raised beds and window-sill troughs 3 to 5 ft long, 1 1/2 to 2 1/2 ft wide")
_def("sandcastle", sandcastle, ref="a child's sand castle with its moat about 3 ft across")
_def("blightgrowth", blightgrowth, axes={"colour": ["sickly", "bruise", "bile"], "taint": ["fungus", "slime", "pustule"]}, global_from=1837, ref="a blighted sore 3 to 5 ft across (Werewolf: the Apocalypse, Wyrm-tainted sites)")
_def("deaddrop", deaddrop, states=("closed", "open"), openable="crate", axes={"hide": ["stone", "brick", "stump", "post", "drain"], "ground": ["grass", "earth", "gravel", "paving"]}, global_from=1197, nvar=30, ft=((1.6, 2.2), (1.6, 2.2)), ref="a dead drop hide about a foot across (a loose brick, a stone, a hollow spike), drawn with the ground round it and the signal mark beside it, about 2 ft square")
_def("flagpole", flagpole, axes={"flag": ["banner", "pennant", "swallow", "ensign"], "ground": ["grass", "gravel", "flags", "earth"]}, nvar=36, ref="flagpole bases 1 1/2 to 2 1/2 ft across; flags drawn flying within the base's square")
_def("bikerack", bikerack, axes={"rack": ["toast", "hoops", "wall"], "load": ["empty", "one", "few", "full"], "ground": ["flags", "asphalt", "brick", "gravel", "concrete"]}, global_from=1837, nvar=30, ft=((5, 8), (5, 6.5)),
     ref="a rack for five or six cycles about 6 ft long, with the cycles in it 5 1/2 to 6 ft deep (a safety bicycle is about 68 in long)")
_def("birdbath", birdbath, axes={"shape": ["round", "scalloped", "square", "shell", "octagon"], "contents": ["water", "ice", "leaves", "birds", "seed"]}, global_from=1837, nvar=30, ref="garden birdbath bowls 18 in to 2 ft across")
_def("boombarrier", boombarrier, states=("closed", "open"), axes={"stripe": ["red", "black", "blue"], "housing": ["grey", "yellow", "orange", "green"], "ground": ["asphalt", "flags", "gravel", "concrete", "brick"]}, global_from=1837, nvar=30, ref="boom barriers for one lane, arm 10 to 13 ft with its housing about 2 ft square")
_def("boxshelter", boxshelter, axes={"cover": ["blanket", "sleeping bag", "newspaper"], "goods": ["bags", "bottles", "cart"], "bedding": ["red", "blue", "green", "grey", "brown"], "shelter": ["tunnel", "walled", "open"]}, global_from=1902, nvar=30, ref="a sleeper's laid-out cartons about 3 by 6 ft")
_def("bufferstop", bufferstop, axes={"paint": ["red", "black", "yellow", "white"], "ground": ["ballast", "sand", "earth"], "verge": ["grass", "cinder", "flags", "weeds", "concrete"]}, global_from=1601, nvar=30, ref="standard-gauge buffer stops, beam 8 to 11 ft over a 4 ft 8 1/2 in track")
_def("climbingframe", climbingframe, axes={"kind": ["bars", "arch", "dome"], "colour": ["red", "green", "blue", "yellow"], "ground": ["gravel", "bark", "grass", "rubber"]}, global_from=1919, nvar=30, ref="playground monkey bars 8 to 12 ft long, 3 to 5 ft wide")
_def("crossingsignal", crossingsignal, states=("out", "lit"), axes={"verge": ["grass", "cinder", "gravel", "concrete"]}, nvar=30, ref="railway crossbucks with boards 4 ft long; warning triangles about 3 ft")
_def("golfhole", golfhole, axes={"flag": ["red", "yellow", "white", "blue"], "ball": ["none", "near", "in"], "turf": ["plain", "striped", "sanded", "dark"], "fringe": ["none", "collar", "rough"]}, global_from=1450, nvar=30, ref="the hole 4 1/4 in across (R&A rule of 1891) with its flagstick, about a foot of green round it")
_def("greenhouse", greenhouse, axes={"kind": ["glasshouse", "leanto", "frame"], "crop": ["tomatoes", "vines", "seedlings", "flowers", "empty"], "paint": ["white", "green", "black", "natural"]}, global_from=1601, nvar=30, ref="amateur glasshouses 8 by 6 to 12 by 10 ft; cold frames 6 by 3 ft")
_def("hoop", hoop, axes={"base": ["pole", "portable", "wall"], "net": ["cord", "chain", "torn"], "court": ["red", "green", "blue", "grey", "tan"]}, global_from=1837, nvar=30, ref="backboard 6 ft wide, rim 18 in across standing 15 in off it (basketball rules)")
_def("mailbox", mailbox, states=("closed", "open"), axes={"flag": ["down", "up"], "paint": ["grey", "black", "red", "green", "blue"], "mount": ["post", "pillar", "bracket"]}, nvar=30, ref="rural mailboxes about 6 by 19 in on a post (US Post Office 1915 standard)")
_def("sandpit", sandpit, axes={"frame": ["boards", "tyre", "shell", "stone"], "toys": ["none", "bucket", "digger", "moulds"], "colour": ["red", "blue", "yellow", "green"], "sand": ["yellow", "white", "grey", "red"]}, global_from=1837, nvar=30, ref="children's sandpits 5 to 7 ft square")
_def("showjump", showjump, axes={"kind": ["upright", "oxer", "wall", "gate"], "colour": ["red", "blue", "green", "yellow"], "filler": ["none", "brush", "flowers", "planks"]}, global_from=1837, nvar=30, ref="show-jumping poles 12 ft long between wings (FEI rules)")
_def("slide", slide, axes={"colour": ["red", "blue", "yellow", "green"], "kind": ["straight", "wave", "tube"], "ground": ["gravel", "grass", "bark", "rubber"]}, global_from=1919, nvar=30, ref="playground slides 2 1/2 to 3 ft wide, 8 to 12 ft long with the ladder")
_def("streetbollard", streetbollard, axes={"colour": ["black", "green", "grey", "white"], "kind": ["round", "square", "dome"], "ground": ["flags", "asphalt", "brick", "gravel"]}, global_from=1601, nvar=30, ref="street bollards 8 to 12 in across (cannon bollards about 1 ft at the muzzle)")
_def("utilitypole", utilitypole, axes={"kind": ["telegraph", "power", "light"], "pole": ["creosote", "grey", "concrete"], "arms": [1, 2, 3]}, global_from=1837, nvar=30, ft=((4.5, 8), (1, 1.6)),
     ref="telegraph and power poles about a foot across with crossarms 4 to 8 ft long")
