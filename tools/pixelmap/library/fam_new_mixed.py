"""New mixed objects (B6346), added from a check of a survival game's world objects: heaps, pods, booths, shrines and
the odd pieces of many families, each in every era it spans.

Seen from straight above with the front to the south, light from the north-west. The era picks the form and the
making, wealth the material and ornament, the regional style its own wood, stone, cloth and colour (fam_fighting.STY),
and every variation is drawn sound (wear is one shared layer in core.render). Mass-made things (a shipping container, a display fridge, a bean bag) take
`global_from`: from then on they look the same the world over, and their variations come from makers' liveries,
loads and fittings. The palette helpers are shared with fam_fighting.py."""
import math

import numpy as np

from px import OUT
from library.core import define as _define
from library.census import CENSUS as _CENSUS

_WHERE = {r.id: r.where for r in _CENSUS}


def define(id, **kw):
    """Define one of this module's objects, its rooms and trades taken from its census row as tags."""
    kw.setdefault("tags", tuple(dict.fromkeys(part.strip().rpartition(" ")[0] or part.strip() for part in _WHERE.get(id, "").split(",") if part.strip())))
    return _define(id, **kw)
from library.art import (tone, mix, ramp, shadow, slab, rivet, knob, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY,
                         PLASTIC_WHITE, COMPOSITE, GLOW, WOOL_RED, WOOL_BLUE, WOOL_GREEN, WOOL_BROWN, OAK, WALNUT, DEAL)
from library.fam_fighting import pal, make, makes, rng_of, scuffs, crack, endgrain, lash, ground, glowline, ERA_TONE, STY

GOLD = ramp((206, 166, 64), 22)
COPPER = ramp((176, 102, 62), 20)
VERD = ramp((88, 150, 128), 16)
BLACK = ramp((44, 42, 46), 12)
SHADE_CLR = (16, 14, 18)
FUTC = [(230, 60, 60), (60, 200, 230), (240, 200, 40), (90, 220, 90), (200, 80, 220), (240, 140, 40), (80, 110, 240), (240, 240, 240),
        (40, 160, 120), (230, 100, 160), (150, 150, 60), (120, 60, 40)]                 # Future Darkness accent lights, picked by a variation's colour


REGIONS = ["central", "atlantic", "northern", "mediterranean", "islamic", "steppe", "southasia", "eastasia", "seasia", "africa", "americas", "oceania", "polar"]


def futs(p):
    """A Future Darkness accent colour for a region."""
    return FUTC[(REGIONS.index(p.st) * 5) % len(FUTC)] if p.st in REGIONS else FUTC[0]


def futc(key, table, k=7):
    """A Future Darkness accent colour for a variation, spread across the colour table so near colours get far accents."""
    ki = list(table).index(key) if key in table else 0
    return FUTC[(ki * k) % len(FUTC)]


def gf(year):
    """global_from for a thing made the same the world over from its invention: the start of the era it was invented
    in (the era's whole span then draws without regional styles)."""
    from library.census import ERAS
    return next(a for _, a, b, _ in ERAS if a <= year <= b)


def et(c, e, k=.3):
    """A colour toned toward its age's timber and making (fam_fighting.ERA_TONE)."""
    return mix(c, ERA_TONE[min(max(e, 0), 8)][0], k)


def fade(c, v, k=1.0):
    return mix(c, (128, 120, 110), {"worn": .22, "broken": .32}.get(v.get("condition", "new"), 0) * k)


def rmp(c, s=16): return ramp(tuple(int(x) for x in c), s)


def blob(d, x0, y0, x1, y1, C, out=OUT):
    """A lit rounded lump: fill, a light crescent to the north-west, a dark one to the south-east."""
    d.ellipse([x0, y0, x1, y1], fill=C[2], outline=out)
    if x1 - x0 > 6 and y1 - y0 > 6:
        d.arc([x0 + 1, y0 + 1, x1 - 1, y1 - 1], 150, 280, fill=C[4], width=2)
        d.arc([x0 + 1, y0 + 1, x1 - 1, y1 - 1], 330, 60, fill=C[0], width=2)


def lidbox(d, x0, y0, x1, y1, C, out=OUT):
    """A lit box top: light north and west edges, dark south and east."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=out)
    if x1 - x0 > 4 and y1 - y0 > 4:
        d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[4]); d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=C[3])
        d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=C[0]); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=C[1])


def leds(d, pts, C):
    for x_, y_ in pts: d.rectangle([x_ - 1, y_ - 1, x_ + 1, y_ + 1], fill=C[2]); d.point((x_, y_), fill=C[4] if len(C) > 4 else C[-1])


def lit_of(p, base=None):
    """A Future Darkness lit edge: the glow toned by the thing's own colour."""
    b = base or p.acc[2]
    return [mix(GLOW[0], b, .35), mix(GLOW[1], b, .35), mix(GLOW[2], b, .2), mix(GLOW[2], (255, 255, 255), .4), (240, 255, 255)]


def glyph(d, x, y, k, col, s=3):
    """One small drawn sign (a letter, a sigil or a rune): a few strokes chosen by k."""
    shapes = [[(0, 0, 0, s), (0, 0, s, 0)], [(0, 0, s, s), (s, 0, 0, s)], [(0, s, s // 2, 0), (s // 2, 0, s, s)], [(0, 0, 0, s), (0, s // 2, s, s // 2), (s, 0, s, s)],
              [(0, s, s, s), (s // 2, 0, s // 2, s)], [(0, 0, s, 0), (s, 0, 0, s), (0, s, s, s)], [(0, 0, s, s // 2), (s, s // 2, 0, s)], [(s // 2, 0, s // 2, s), (0, s // 3, s, s // 3)]]
    for a, b, c, e_ in shapes[k % len(shapes)]: d.line([x + a, y + b, x + c, y + e_], fill=col)


SKIN = [(238, 204, 176), (222, 178, 140), (196, 146, 104), (164, 112, 76), (126, 84, 58), (92, 62, 46)]
SKIN_OF = {"central": (0, 1), "atlantic": (0, 1), "northern": (0, 0), "mediterranean": (1, 2), "islamic": (1, 3), "steppe": (1, 2), "southasia": (2, 4),
           "eastasia": (1, 2), "seasia": (2, 3), "africa": (4, 5), "americas": (2, 3), "oceania": (3, 4), "polar": (1, 2)}


def skin(v, k=0):
    a, b = SKIN_OF.get(v.get("style") or "central", (0, 3)) if v.get("style") else (0, 5)
    return rmp(SKIN[a + (k + v.get("wealth", 2)) % (b - a + 1)], 14)


# ================================================================ heap of ash
ASH_FUEL = {"central": (150, 146, 140), "atlantic": (196, 148, 126), "northern": (190, 188, 184), "mediterranean": (176, 172, 164), "islamic": (192, 178, 150),
            "steppe": (176, 160, 124), "southasia": (186, 170, 136), "eastasia": (200, 192, 170), "seasia": (112, 104, 96), "africa": (132, 126, 120),
            "americas": (160, 158, 152), "oceania": (100, 94, 90), "polar": (84, 84, 90)}


def ashpile(tm, x, y, w, h, st, v):
    """A heap of spent ash dumped in a yard or alley, on its scorched patch, with what was burnt showing in it. The fuel
    by region: grey wood ash, the pinkish ash of peat in the Atlantic lands, pale dung ash on the steppe and in South
    Asia, rice-straw ash in East Asia, dark husk ash in the islands, the oily blubber ash of the far north. The age's
    refuse in it: charcoal and bone (Dark Ages), charred straw and rags of plague bedding (Long Night), pot shards and
    nails (Renaissance), curled paper (Age of Reason), coal clinker (Victorian), tins and wire (Great War), burnt
    newsprint and a bottle (Mid-Century), melted plastic and a spray can (Modern), circuit boards (Future Darkness).
    The contents axis is the clue in it: a bone, a buckle, a half-burnt letter, a shoe, or live embers."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    W_, H_ = X1 - X0, Y1 - Y0
    scorch = rmp(mix(p.ground[2], (30, 26, 24), .55), 12)
    d.ellipse([X0, Y0, X1, Y1], fill=scorch[2])
    for k in range(10): a = rng.uniform(0, 6.28); q = rng.uniform(.6, .95); d.ellipse([cx + math.cos(a) * W_ * .45 * q - 4, cy + math.sin(a) * H_ * .45 * q - 3, cx + math.cos(a) * W_ * .45 * q + 4, cy + math.sin(a) * H_ * .45 * q + 3], fill=p.ground[1])
    A = rmp(fade(et(ASH_FUEL.get(p.st, (150, 146, 140)), e, .12), v), 14)
    if e == 4: A = rmp(mix(A[2], (70, 68, 72), .4), 14)                          # Victorian: coal ash, darker
    if e == 8: A = rmp(mix(A[2], (60, 62, 70), .45), 14)
    sp = .78
    lumps = [(0, 0, .5), (-.25, -.12, .32), (.22, -.15, .3), (-.1, .2, .3), (.25, .18, .26), (-.3, .15, .22)]
    if p.w >= 4: lumps = lumps[:4]                                              # a good household's fine white ash: one neat heap
    for ox, oy, r in lumps:
        rx, ry = W_ * r * sp * .55, H_ * r * sp * .5
        blob(d, cx + ox * W_ * sp - rx, cy + oy * H_ * sp - ry, cx + ox * W_ * sp + rx, cy + oy * H_ * sp + ry, A, out=A[0])
    for k in range(int(8 + (1 - p.w / 5) * 10)):                               # ash crumbs and soot flecks round it
        a = rng.uniform(0, 6.28); q = rng.uniform(.3, .9) * sp
        px_, py_ = cx + math.cos(a) * W_ * .42 * q, cy + math.sin(a) * H_ * .42 * q
        d.rectangle([px_, py_, px_ + 2, py_ + 1], fill=A[3] if k % 2 else A[0])
    junk = []
    if e == 0:
        for k in range(5): junk.append(("lump", (28, 24, 24)))
    elif e == 1:
        for k in range(4): junk.append(("straw", (150, 120, 60)))
        junk.append(("rag", (120, 110, 96)))
    elif e == 2:
        for k in range(3): junk.append(("shard", (176, 96, 56)))
        junk += [("nail", IRON[2])] * 2
    elif e == 3:
        for k in range(4): junk.append(("paper", (226, 216, 190)))
    elif e == 4:
        for k in range(6): junk.append(("lump", (52, 40, 40) if k % 2 else (150, 84, 46)))
    elif e == 5:
        junk += [("tin", (150, 156, 160)), ("tin", (120, 110, 80)), ("wire", IRON[3]), ("wire", IRON[3])]
    elif e == 6:
        junk += [("paper", (206, 200, 186)), ("paper", (200, 196, 180)), ("bottle", (60, 120, 70)), ("lump", (30, 26, 26))]
    elif e == 7:
        junk += [("plastic", (40, 90, 180)), ("plastic", (200, 50, 40)), ("can", (220, 210, 40)), ("plastic", (240, 240, 230))]
    else:
        junk += [("board", (40, 110, 60)), ("board", (30, 80, 50)), ("lit", p.lit[1]), ("wire", (200, 120, 60))]
    for k, (kind, c) in enumerate(junk):
        a = k * 2.4 + rng.uniform(-.3, .3); q = rng.uniform(.1, .55)
        jx, jy = cx + math.cos(a) * W_ * .3 * q * 1.5, cy + math.sin(a) * H_ * .3 * q * 1.5
        if kind == "lump": d.rectangle([jx - 3, jy - 2, jx + 3, jy + 2], fill=c, outline=OUT); d.point((jx - 2, jy - 1), fill=tone(c, 40))
        elif kind == "straw": d.line([jx - 6, jy - 2, jx + 6, jy + 2], fill=c, width=2); d.line([jx - 4, jy + 2, jx + 3, jy], fill=tone(c, -40))
        elif kind == "rag": d.polygon([(jx - 6, jy - 3), (jx + 5, jy - 4), (jx + 6, jy + 3), (jx - 4, jy + 4)], fill=c, outline=OUT)
        elif kind == "shard": d.polygon([(jx - 4, jy - 3), (jx + 4, jy - 2), (jx, jy + 4)], fill=c, outline=OUT)
        elif kind == "nail": d.line([jx - 4, jy, jx + 4, jy + 1], fill=c, width=2)
        elif kind == "paper": d.polygon([(jx - 5, jy - 4), (jx + 5, jy - 3), (jx + 4, jy + 4), (jx - 4, jy + 3)], fill=c, outline=(60, 50, 40)); d.line([jx - 3, jy + 2, jx + 3, jy + 3], fill=(40, 34, 30), width=2)
        elif kind == "tin": d.ellipse([jx - 4, jy - 4, jx + 4, jy + 4], fill=c, outline=OUT); d.ellipse([jx - 2, jy - 2, jx + 2, jy + 2], outline=tone(c, -40))
        elif kind == "wire": d.arc([jx - 6, jy - 4, jx + 6, jy + 4], 10, 300, fill=c, width=1)
        elif kind == "bottle": d.rounded_rectangle([jx - 3, jy - 7, jx + 3, jy + 5], 2, fill=c, outline=OUT); d.line([jx - 1, jy - 5, jx - 1, jy + 2], fill=tone(c, 60))
        elif kind == "plastic": d.ellipse([jx - 5, jy - 3, jx + 4, jy + 4], fill=c, outline=OUT); d.point((jx - 2, jy - 1), fill=tone(c, 50))
        elif kind == "can": d.rectangle([jx - 3, jy - 6, jx + 3, jy + 6], fill=c, outline=OUT); d.rectangle([jx - 3, jy - 6, jx + 3, jy - 4], fill=STEEL[3])
        elif kind == "board": d.rectangle([jx - 5, jy - 4, jx + 5, jy + 4], fill=c, outline=OUT); d.line([jx - 3, jy - 2, jx + 3, jy - 2], fill=GOLD[3]); d.line([jx - 3, jy + 1, jx + 1, jy + 1], fill=GOLD[3])
        elif kind == "lit": d.rectangle([jx - 2, jy - 2, jx + 2, jy + 2], fill=c[2] if isinstance(c, list) else c)
    clue = v.get("contents", "cold")
    qx, qy = cx + W_ * .12, cy + H_ * .05
    if clue == "bone":
        d.line([qx - 9, qy - 2, qx + 7, qy + 2], fill=OUT, width=5); d.line([qx - 9, qy - 2, qx + 7, qy + 2], fill=(226, 218, 196), width=3)
        for ex_, ey_ in ((qx - 9, qy - 2), (qx + 7, qy + 2)): d.ellipse([ex_ - 3, ey_ - 3, ex_ + 3, ey_ + 3], fill=(226, 218, 196), outline=OUT)
    elif clue == "buckle":
        M = BRASS if p.w >= 3 or e <= 3 else STEEL
        d.rectangle([qx - 5, qy - 4, qx + 5, qy + 4], outline=M[3], width=2); d.line([qx, qy - 4, qx, qy + 4], fill=M[1]); d.point((qx - 4, qy - 3), fill=M[4])
    elif clue == "letter":
        d.polygon([(qx - 9, qy - 6), (qx + 8, qy - 7), (qx + 9, qy + 6), (qx - 8, qy + 7)], fill=(232, 222, 196), outline=OUT)
        d.polygon([(qx + 2, qy - 7), (qx + 9, qy - 7), (qx + 9, qy + 6), (qx + 4, qy + 3)], fill=(30, 24, 22))
        for k in range(3): d.line([qx - 6, qy - 3 + k * 3, qx + 1, qy - 3 + k * 3], fill=(60, 50, 60))
        if e <= 4: d.ellipse([qx - 8, qy + 2, qx - 4, qy + 6], fill=(170, 30, 30))   # a seal
    elif clue == "shoe":
        Sh = rmp((92, 60, 40) if e < 7 else (220, 220, 214), 14)
        d.rounded_rectangle([qx - 5, qy - 9, qx + 5, qy + 8], 4, fill=Sh[2], outline=OUT); d.ellipse([qx - 3, qy - 6, qx + 3, qy + 1], fill=Sh[0])
    elif clue == "embers":
        for k in range(9):
            a = rng.uniform(0, 6.28); q = rng.uniform(0, .25)
            d.rectangle([cx + math.cos(a) * W_ * q - 2, cy + math.sin(a) * H_ * q - 1, cx + math.cos(a) * W_ * q + 2, cy + math.sin(a) * H_ * q + 1], fill=[(196, 62, 20), (238, 124, 30), (252, 190, 66)][k % 3])
        tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 60, None)]


define("ashpile", draw=ashpile, axes={"contents": ["cold", "bone", "buckle", "letter", "shoe", "embers"]}, low=True,
       ft=((2.5, 3.5), (2.5, 3.5)), ref="ash heaps by the yard midden, a barrow-load or two about 3 ft across (household middens, Museum of London archaeology)")


# ================================================================ prefabricated bathroom pod
POD_SHELL = {"white": (232, 232, 226), "cream": (226, 214, 180), "avocado": (156, 164, 96), "pink": (220, 168, 170), "blue": (150, 182, 206),
             "grey": (170, 172, 176), "beige": (204, 186, 156), "black": (60, 60, 64), "mint": (170, 214, 190), "sand": (214, 196, 160),
             "primrose": (232, 214, 100), "lilac": (190, 160, 210)}


def bathpod(tm, x, y, w, h, st, v):
    """A factory-made bathroom pod craned into a block of flats, a ship or a barracks, seen from above with its roof
    cut away: the moulded glass-fibre shell in one piece, its door at the south, a toilet, a basin and a bath or
    shower tray. The same the world over; its shell colour is the maker's range of the day. Mid-Century: avocado,
    pink, primrose and blue suites, a short bath and a cork floor. Modern: white with a glass shower screen, chrome
    taps and a towel rail. Future Darkness: a dark composite shell, a sensor tap and a lit strip round the ceiling
    edge."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e
    shadow(tm, X0, Y0, X1, Y1, 4)
    col = POD_SHELL.get(v.get("colour", "white"), (232, 232, 226))
    key = v.get("colour", "white"); ki = list(POD_SHELL).index(key) if key in POD_SHELL else 0
    if e == 8: col = mix((54, 58, 66), col, .6)
    S = rmp(fade(col, v), 10)
    d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=S[1], outline=OUT)            # the shell wall, its rounded corners
    d.line([X0 + 4, Y0 + 1, X1 - 4, Y0 + 1], fill=S[3])
    t = 6
    FLR = [(176, 132, 84), (190, 80, 60), (60, 90, 150), (40, 40, 44), (120, 150, 90), (220, 220, 214)]   # cork, quarry tile, blue, black, green and white vinyl
    fl = {6: rmp(FLR[(ki * 5) % 6], 10), 7: rmp(mix((196, 200, 204), FLR[(ki * 5) % 6], .45), 8), 8: rmp(mix((46, 48, 56), futc(key, POD_SHELL), .4), 8)}[e]
    d.rectangle([X0 + t, Y0 + t, X1 - t, Y1 - t], fill=fl[2], outline=S[0])
    step = 10 if e == 6 else 16
    for gx in range(X0 + t + step, X1 - t, step): d.line([gx, Y0 + t + 1, gx, Y1 - t - 1], fill=fl[1])
    for gy in range(Y0 + t + step, Y1 - t, step): d.line([X0 + t + 1, gy, X1 - t - 1, gy], fill=fl[1])
    W_, H_ = X1 - X0, Y1 - Y0
    # the bath (Mid-Century) or the shower tray along the north wall
    bx0, by0, bx1, by1 = X0 + t + 1, Y0 + t + 1, X1 - t - 1, Y0 + t + int(H_ * .42)
    if e == 6 or (e == 7 and p.w >= 4):
        d.rounded_rectangle([bx0, by0, bx1, by1], 6, fill=S[2], outline=OUT); d.rounded_rectangle([bx0 + 5, by0 + 4, bx1 - 5, by1 - 4], 8, fill=S[3], outline=S[0])
        d.ellipse([bx0 + 9, (by0 + by1) // 2 - 2, bx0 + 13, (by0 + by1) // 2 + 2], fill=STEEL[1])   # the plughole
        for tx in (bx0 + 3, bx0 + 3): d.rectangle([tx, (by0 + by1) // 2 - 6, tx + 3, (by0 + by1) // 2 - 3], fill=STEEL[3] if p.w >= 2 else WHITE[2])
    else:
        tw = int(W_ * .45)
        d.rectangle([bx0, by0, bx0 + tw, by1], fill=S[3], outline=OUT)
        for gy in range(by0 + 4, by1 - 2, 4): d.line([bx0 + 3, gy, bx0 + tw - 3, gy], fill=S[1])
        d.ellipse([bx0 + tw // 2 - 3, (by0 + by1) // 2 - 3, bx0 + tw // 2 + 3, (by0 + by1) // 2 + 3], fill=STEEL[1], outline=OUT)
        d.line([bx0 + tw + 1, by0, bx0 + tw + 1, by1], fill=(170, 210, 220), width=2)   # the glass screen
        d.ellipse([bx0 + 3, by0 + 2, bx0 + 9, by0 + 8], fill=STEEL[3], outline=OUT)   # the shower rose
    # toilet at the east, basin at the west of the south half
    tx, ty = X1 - t - 16, Y1 - t - 22
    d.rounded_rectangle([tx + 2, ty - 2, tx + 14, ty + 3], 2, fill=S[3], outline=OUT)                 # cistern
    d.ellipse([tx, ty + 3, tx + 15, ty + 21], fill=S[3], outline=OUT)
    d.ellipse([tx + 3, ty + 6, tx + 12, ty + 18], fill=S[4], outline=S[1])
    d.ellipse([X0 + t + 2, Y1 - t - 22, X0 + t + 20, Y1 - t - 8], fill=S[3], outline=OUT); d.ellipse([X0 + t + 6, Y1 - t - 19, X0 + t + 16, Y1 - t - 11], fill=S[4], outline=S[1])
    d.rectangle([X0 + t + 10, Y1 - t - 24, X0 + t + 12, Y1 - t - 20], fill=STEEL[3] if e < 8 else lit_of(p, col)[2])
    if e >= 7: d.rectangle([X0 + t + 2, Y1 - t - 30, X0 + t + 20, Y1 - t - 27], fill=(190, 214, 224), outline=OUT)   # the mirror shelf
    # the door in the south wall
    dx0 = (X0 + X1) // 2 - 12
    if e == 6: d.rectangle([dx0, Y1 - t, dx0 + 22, Y1], fill=rmp(mix(col, (150, 110, 70), .5), 12)[2], outline=OUT)
    else: d.rectangle([dx0, Y1 - t, dx0 + 22, Y1], fill=S[2], outline=OUT); d.rectangle([dx0 + 18, Y1 - t + 1, dx0 + 20, Y1 - 1], fill=STEEL[4])
    if e == 8:
        L = lit_of(p, col); d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 5, outline=L[1])
    if e == 6 and p.w >= 3: d.rectangle([bx0, by1 + 3, bx1, by1 + 5], fill=(220, 180, 70))   # a towel rail with a towel


define("bathpod", draw=bathpod, global_from=gf(1964), axes={"colour": list(POD_SHELL)}, nvar=12, front=True, clear=2,
       ref="factory-made glass-fibre bathroom pods about 6 by 5 ft (Buckminster Fuller's Dymaxion bathroom; 1960s and 70s pods for flats and ships)")


# ================================================================ bat roost
def batroost(tm, x, y, w, h, st, v):
    """Bats roosting on the wall, seen from above: a ledge, beam or box against the north wall, the bats hanging in a
    clinging cluster under it (small brown bodies with folded wings), their droppings piled on the floor below. Before
    the Mid-Century a beam end or a stone ledge in a loft, tower or cave: adzed timber (Dark Ages), sooted (Long
    Night), a sawn joist (Renaissance), a plaster cornice (Age of Reason), an iron girder (Victorian), a riveted
    beam (Great War). From the Mid-Century a wooden bat box, from Modern a grey woodcrete box, in Future Darkness a
    composite box with a sensor. Fruit bats, large and golden-brown, in the warm south; small brown ones elsewhere."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e
    W_, H_ = X1 - X0, Y1 - Y0
    if e <= 1: B = rmp(et(p.wood[2], e, .3))                                     # an adzed beam end, sooted in the Long Night
    elif e == 2: B = rmp(mix(p.wood[2], (180, 140, 90), .25))                    # a sawn joist
    elif e == 3: B = rmp(mix(p.stone[3], (226, 218, 200), .4), 12)               # a plaster cornice
    elif e == 4: B = rmp(mix(p.stone[2], (150, 70, 50), .3), 14)                 # a brick or stone ledge under the eaves
    elif e == 5: B = rmp(mix(p.wood[2], (96, 70, 56), .3), 14)                   # a riveted beam
    elif e == 6: B = rmp(mix(p.wood[2], (150, 110, 70), .35))                    # a wooden bat box
    elif e == 7: B = rmp(mix(p.wood[2], (150, 150, 146), .65), 12)               # a woodcrete box
    else: B = rmp(mix(p.wood[2] if p.w <= 1 else p.acc[2], (50, 54, 62), .3), 12)   # a composite box
    if p.w >= 2 and e <= 5: B = rmp(mix(B[2], p.acc[2], .45))                    # a beam in a painted loft or tower
    if p.w <= 0: B = rmp(mix(B[2], (100, 90, 80), .3))
    by1 = Y0 + max(5, int(H_ * .42))
    if e <= 5:
        lidbox(d, X0, Y0, X1, by1, B)
        if e == 4 or e == 5:
            for rx in range(X0 + 8, X1 - 4, 14): rivet(tm, rx, (Y0 + by1) // 2)
        elif e <= 2:
            for gx in range(X0 + 10, X1 - 6, 13): d.line([gx, Y0 + 2, gx + 6, Y0 + 2], fill=B[1])
    else:                                                                       # bat boxes on the building's own beam: their roofs and the slots at the foot
        lidbox(d, X0, Y0, X1, by1, rmp(p.wood[2]))
        if e == 7 and p.w <= 1: B = rmp(mix(p.wood[2], (120, 100, 80), .3))     # a home-made box of scrap timber
        boxes = ((X0 + 3, X0 + W_ * .42), (X0 + W_ * .58, X1 - 3)) if e != 7 else ((X0 + W_ * .2, X1 - W_ * .2),)   # a single long woodcrete box in Modern
        for bx0, bx1 in boxes:
            bx0, bx1 = int(bx0), int(bx1)
            lidbox(d, bx0, Y0, bx1, by1 + 4, B); d.line([bx0 + 2, Y0 + 2, bx1 - 2, Y0 + 2], fill=B[4])
            if e == 7: [d.ellipse([hx - 3, by1 - 2, hx + 3, by1 + 3], fill=SHADE_CLR) for hx in (bx0 + (bx1 - bx0) // 4, (bx0 + bx1) // 2, bx1 - (bx1 - bx0) // 4)]   # its round entrance holes
            else: d.rectangle([bx0 + 3, by1 + 1, bx1 - 3, by1 + 3], fill=SHADE_CLR)
            if e == 8: d.rectangle([bx1 - 6, Y0 + 2, bx1 - 3, Y0 + 4], fill=lit_of(p)[2])
    fruit = p.st in ("southasia", "seasia", "africa", "oceania")
    Bt = rmp((150, 104, 56) if fruit else (78, 60, 50), 12)
    if p.st in ("americas",): Bt = rmp((96, 72, 62), 12)
    if p.st in ("islamic", "mediterranean"): Bt = rmp((120, 96, 70), 12)
    if p.st in ("polar", "northern"): Bt = rmp((70, 62, 60), 12)
    col = v.get("contents", "many")
    n = {"many": 9, "few": 4, "none": 0}.get(col, 6) + (0 if p.w >= 2 else 2)
    gu = rmp((96, 84, 70), 14)                                                   # droppings and white urine stain on the wall foot and floor below
    amt = {"many": 1.0, "few": .7, "none": .5}.get(col, .8)
    gy0 = by1 + 2
    d.rectangle([X0 + W_ * (.5 - .48 * amt), gy0, X0 + W_ * (.5 + .48 * amt), Y1 + 1], fill=gu[1])
    for k in range(int(20 * amt)):
        gx = rng.uniform(X0 + W_ * (.5 - .45 * amt), X0 + W_ * (.5 + .45 * amt) - 2); gyy = rng.uniform(gy0 + 1, Y1 - 1)
        d.rectangle([gx, gyy, gx + 1, gyy + 1], fill=(206, 200, 184) if k % 3 == 0 else gu[0])
    r = 5 if fruit else 4
    for k in range(n):                                                          # bats clinging under the ledge or at the box's slot, wings wrapped
        bx = X0 + 6 + (k * 11 % max(1, W_ - 12)); byy = by1 - 2 + (k % 2) * 2
        d.polygon([(bx - r, byy), (bx + r, byy), (bx + r - 1, byy + r + 2), (bx, byy + r + 4), (bx - r + 1, byy + r + 2)], fill=Bt[1], outline=OUT)
        d.line([bx, byy + 1, bx, byy + r + 2], fill=Bt[0])                       # the fold of the wings
        d.point((bx - r + 1, byy + 1), fill=Bt[4]); d.rectangle([bx - 1, byy + r + 2, bx + 1, byy + r + 3], fill=Bt[3])   # the head hanging down


define("batroost", draw=batroost, axes={"contents": ["many", "few", "none"]}, front=True,
       ref="a roost along 3 ft of beam or ledge; bat boxes about 1 ft wide (Schwegler boxes; Bat Conservation Trust guidance)")


# ================================================================ bench metal shear
SHEAR_PAINT = {"black": (40, 40, 44), "green": (78, 104, 82), "grey": (110, 116, 122), "blue": (44, 80, 140), "orange": (214, 110, 40),
               "red": (164, 40, 36), "cream": (210, 200, 170), "yellow": (220, 180, 40), "olive": (100, 100, 60), "teal": (40, 110, 110),
               "maroon": (110, 30, 40), "white": (226, 226, 220), "brown": (120, 80, 50), "silver": (176, 180, 186)}


def benchshear(tm, x, y, w, h, st, v):
    """A floor-standing lever shear for cutting sheet and bar, seen from above: the cast stand and its four feet, the
    heavy frame head across the front with the fixed and moving blades, the long lever swung back over the stand to
    its grip, offcuts of sheet on the floor. Victorian: bare cast iron with a brass maker's plate and a lever cased in
    timber. Great War: black with gilt lettering. Mid-Century: machine green or grey enamel and a maker's plate.
    Modern: a maker's blue, orange or red, with a yellow guard over the blades. Future Darkness: a powered shear in a
    dark shell with a lit guard and a red stop button. The paint is the maker's; the stock in it goes with it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    key = v.get("colour", "black"); ki = list(SHEAR_PAINT).index(key) if key in SHEAR_PAINT else 0
    col = SHEAR_PAINT.get(key, (40, 40, 44))
    if e == 4: col = mix(col, (84, 86, 92), .3)                                 # Victorian: cast iron under a thin coat
    if e == 5: col = mix(col, (40, 40, 44), .2)
    if e == 8: col = mix((50, 54, 62), col, .6)
    C = rmp(fade(col, v), 16)
    shadow(tm, X0 + 2, Y0 + 4, X1, Y1, 3)
    sx0, sx1, sy0 = X0 + 3, X1 - 3, Y0 + int(H_ * .2)                             # the cast stand, its feet splayed
    d.rectangle([sx0, sy0, sx1, Y1 - 1], fill=C[1], outline=OUT)
    for fx, fy in ((X0, Y1 - 6), (X1 - 6, Y1 - 6), (X0, sy0), (X1 - 6, sy0)): d.rectangle([fx, fy, fx + 6, fy + 6], fill=C[0], outline=OUT)
    if e == 6 or e == 7: d.rectangle([sx0 + 3, sy0 + 3, sx1 - 3, Y1 - 4], outline=C[3])
    fy0, fy1 = Y0 + int(H_ * .55), Y0 + int(H_ * .78)                             # the frame head with the blades across the front
    lidbox(d, X0 + 1, fy0, X1 - 1, fy1, C)
    d.rectangle([X0 + 3, fy1 - 4, X1 - 3, fy1 - 1], fill=STEEL[4], outline=OUT)
    if e == 4: d.rectangle([X0 + 5, fy0 + 3, X0 + 15, fy0 + 7], fill=BRASS[3], outline=OUT)   # a brass maker's plate
    elif e == 5: d.rectangle([X0 + 5, fy0 + 3, X1 - 8, fy0 + 5], fill=GOLD[3])    # gilt lettering
    elif e == 6: d.rectangle([X0 + 5, fy0 + 3, X0 + 13, fy0 + 7], fill=STEEL[3], outline=OUT)
    elif e == 7: d.rectangle([X0 + 1, fy1, X1 - 1, fy1 + 4], fill=(230, 200, 40), outline=OUT)   # the yellow guard
    else: d.rectangle([X0 + 1, fy1, X1 - 1, fy1 + 3], fill=lit_of(p, col)[1]); d.ellipse([X1 - 9, fy0 + 2, X1 - 3, fy0 + 8], fill=(220, 50, 40), outline=OUT)
    px_, py_ = X1 - 7, fy0 + 3                                                    # the pivot, the lever swung back over the stand
    if e < 8:
        LC = rmp(mix(C[2], (120, 84, 56), .6)) if e == 4 else C
        ex, ey = X0 + 6, Y0 + 4
        d.line([px_, py_, ex, ey], fill=OUT, width=6); d.line([px_, py_, ex, ey], fill=LC[3], width=4)
        d.ellipse([ex - 5, ey - 4, ex + 5, ey + 4], fill=(40, 34, 30) if e < 7 else (200, 40, 30), outline=OUT)   # the grip
        knob(tm, px_, py_, STEEL, 3)
    else:
        d.rectangle([X0 + 6, Y0 + 3, X1 - 6, sy0 + 8], fill=C[3], outline=OUT); d.rectangle([X0 + 9, Y0 + 6, X1 - 9, Y0 + 10], fill=lit_of(p, col)[2])   # the motor housing
    it = ["sheet", "bar", "copper"][(p.w + ki) % 3]                                # the stock being cut, and its offcuts
    if it == "sheet": d.polygon([(X0 + 4, fy1 - 2), (X1 - 8, fy1 - 2), (X1 - 6, Y1 + 2), (X0 + 2, Y1)], fill=STEEL[3], outline=OUT); d.line([X0 + 6, fy1 + 2, X1 - 10, fy1 + 2], fill=STEEL[4])
    elif it == "bar": d.rectangle([X0 - 1, fy1 - 3, X1 + 1, fy1 + 1], fill=IRON[3], outline=OUT)
    else: d.polygon([(X0 + 6, fy1), (X1 - 6, fy1), (X1 - 9, Y1 - 1), (X0 + 9, Y1 - 1)], fill=COPPER[3], outline=OUT)
    for k in range(3):
        ox, oy = rng.uniform(X0 + 2, X1 - 9), rng.uniform(Y1 - 8, Y1 - 3)
        d.polygon([(ox, oy), (ox + 7, oy + 1), (ox + 2, oy + 4)], fill=STEEL[2] if it != "copper" else COPPER[2], outline=OUT)


define("benchshear", draw=benchshear, global_from=gf(1900), axes={"colour": list(SHEAR_PAINT)}, nvar=14, front=True, clear=2.5,
       ref="lever shears on cast stands about 2 by 3 ft (Pexto and Edwards bench shears, makers' catalogues 1900s to 1950s)")


# ================================================================ bloomery
def bloomery(tm, x, y, w, h, st, v):
    """A bloomery furnace for smelting iron, seen from above: the clay or stone shaft with its round throat, the
    tuyere pipes and bellows at its foot on the south, charcoal and ore heaped by, a slag heap. Lit: the throat glows
    and flames lick out of it. Out: a dark throat with a crust of cinders. By region: a tall clay shaft with many
    tuyeres and no bellows in Africa, the long clay box of a tatara in East Asia, a small clay furnace with goatskin
    bellows in South Asia, a stone-cased shaft in Europe. Dark Ages: a low clay shaft and leather bellows. Long Night:
    a taller shaft bound with iron and a water-driven bellows trough. Renaissance: stone-built and larger. Age of
    Reason: the Catalan forge's stone hearth. Victorian: the last bloomeries, beside a brick chimney stack."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 - 4
    W_, H_ = X1 - X0, Y1 - Y0
    ground(tm, X0, Y0, X1, Y1, rmp(mix(p.ground[2], (50, 40, 36), .15), 12), rng)
    if p.w >= 3:                                                                # a lord's or an abbey's works: a flagged or bricked working floor
        Fl = rmp(mix(p.stone[2], (150, 70, 50), .4 if e >= 3 else 0), 12)
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=Fl[2], outline=OUT)
        for gy in range(Y0 + 10, Y1 - 2, 10): d.line([X0 + 2, gy, X1 - 2, gy], fill=Fl[0])
        for k, gx in enumerate(range(X0 + 8, X1 - 2, 14)):
            for gy in range(Y0 + 2 + (k % 2) * 10, Y1 - 2, 20): d.line([gx, gy, gx, gy + 8], fill=Fl[0])
    clay = {"africa": (176, 96, 58), "southasia": (170, 104, 74), "eastasia": (160, 140, 120), "seasia": (156, 110, 80), "americas": (190, 140, 100),
            "steppe": (160, 130, 100), "islamic": (196, 160, 116), "oceania": (120, 100, 90), "polar": (130, 126, 120)}.get(p.st, None)
    stone = e >= 2 and clay is None or (e == 4 and p.st not in ("africa", "southasia"))
    if clay is None: clay = {"central": (150, 116, 90), "atlantic": (128, 112, 100), "northern": (110, 96, 92), "mediterranean": (200, 150, 110)}.get(p.st, (150, 116, 90))
    S = rmp(et(clay or p.stone[2], e, .18), 14) if not stone else rmp(et(p.stone[2], e, .18), 14)
    if e == 1: S = rmp(mix(S[2], (70, 60, 52), .3), 14)
    tatara = p.st == "eastasia"
    r = int(min(W_, H_) * (.3 if e == 0 else .34 if e <= 2 else .37) * (.85 if p.w <= 1 else 1))
    shadow(tm, cx - r, cy - r, cx + r, cy + r, 4, kind="ellipse")
    if tatara:
        d.rectangle([cx - r * 1.3, cy - r * .6, cx + r * 1.3, cy + r * .6], fill=S[2], outline=OUT); d.line([cx - r * 1.3 + 2, cy - r * .6 + 1, cx + r * 1.3 - 2, cy - r * .6 + 1], fill=S[4])
        mouth = [cx - r * 1.1, cy - r * .3, cx + r * 1.1, cy + r * .3]
    elif stone:
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=S[2], outline=OUT)
        for k in range(1, 4): d.line([cx - r + 1, cy - r + k * r // 2, cx + r - 1, cy - r + k * r // 2], fill=S[0])
        for k in range(4): d.line([cx - r + (k * 9 + 5) % (2 * r), cy - r + 1, cx - r + (k * 9 + 5) % (2 * r), cy + r - 1], fill=S[1])
        mouth = [cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5]
    else:
        blob(d, cx - r, cy - r, cx + r, cy + r, S)
        for k in range(3): d.arc([cx - r + 3 + k * 2, cy - r + 3 + k * 2, cx + r - 3 - k * 2, cy + r - 3 - k * 2], 200, 330, fill=S[1])   # coils of the clay walls
        mouth = [cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45]
    if e == 1 and not tatara:
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=IRON[3], width=2)     # iron bands
    lit = st == "lit"
    if lit:
        d.ellipse(mouth, fill=(120, 26, 18))
        mw, mh = (mouth[2] - mouth[0]) / 2, (mouth[3] - mouth[1]) / 2
        tm.fire(int((mouth[0] + mouth[2]) / 2), int((mouth[1] + mouth[3]) / 2) + 2, int(mw * .9), int(mh * .8), seed=int(tm.rng.integers(0, 99)))
        tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 200, None)]
    else:
        d.ellipse(mouth, fill=(28, 24, 24), outline=OUT)
        for k in range(6): a = k * 1.1; d.rectangle([(mouth[0] + mouth[2]) / 2 + math.cos(a) * 4 - 1, (mouth[1] + mouth[3]) / 2 + math.sin(a) * 3 - 1, (mouth[0] + mouth[2]) / 2 + math.cos(a) * 4 + 2, (mouth[1] + mouth[3]) / 2 + math.sin(a) * 3 + 1], fill=(70, 62, 60))
    # tuyeres and bellows
    many = p.st == "africa"
    nt = 6 if many else (2 if tatara else 1)
    for k in range(nt):
        a = math.pi / 2 + (k - (nt - 1) / 2) * (.6 if many else .5)
        tx0, ty0 = cx + math.cos(a) * r, cy + math.sin(a) * r * (.6 if tatara else 1)
        tx1, ty1 = cx + math.cos(a) * (r + 8), cy + math.sin(a) * (r + 8)
        d.line([tx0, ty0, tx1, ty1], fill=OUT, width=5); d.line([tx0, ty0, tx1, ty1], fill=rmp(clay or (170, 110, 70), 14)[3], width=3)
    if not many:
        Lh = rmp((120, 84, 56) if e <= 3 else (90, 64, 46), 14)
        bys = Y1 - 14
        for sx in ((cx - 22, cx + 6) if (e >= 1 or tatara or p.w >= 3) else (cx - 9,)):     # leather or goatskin bellows, a pair for the better found
            d.polygon([(sx, bys), (sx + 16, bys), (sx + 12, Y1 - 2), (sx + 4, Y1 - 2)], fill=Lh[2], outline=OUT)
            d.line([sx + 3, bys + 4, sx + 13, bys + 4], fill=Lh[0]); d.line([sx + 8, bys, sx + 8, bys - 5], fill=Lh[1], width=2)
        if e == 1 or e == 2:                                                     # a water-driven bellows: the trough and its shaft
            d.rectangle([X0 + 2, Y1 - 6, cx - 24, Y1 - 2], fill=rmp(p.wood[2])[2], outline=OUT); d.line([X0 + 3, Y1 - 4, cx - 25, Y1 - 4], fill=(70, 110, 150))
    # charcoal and ore heaps, slag
    for (hx, hy, c) in ((X0 + 10, Y0 + 10, (34, 30, 30)), (X1 - 12, Y0 + 10, (140, 70, 44)), (X1 - 12, Y1 - 12, (70, 60, 64))):
        for k in range(5): d.ellipse([hx - 7 + k * 3 - 2, hy - 4 + (k % 2) * 3 - 2, hx - 7 + k * 3 + 3, hy - 4 + (k % 2) * 3 + 3], fill=tone(c, (k % 3) * 14), outline=OUT)
    if e == 3 and not clay:                                                     # Catalan hearth: a stone trompe pipe
        d.rectangle([X0 + 2, cy - 3, cx - r, cy + 3], fill=p.stone[1], outline=OUT)
    if e == 4:                                                                  # a brick stack beside it
        Bk = rmp((150, 70, 50), 14); d.rectangle([X0 + 2, Y0 + H_ * .4, X0 + 16, Y0 + H_ * .4 + 14], fill=Bk[2], outline=OUT); d.rectangle([X0 + 5, Y0 + H_ * .4 + 3, X0 + 13, Y0 + H_ * .4 + 11], fill=SHADE_CLR)
    if p.w >= 3 and e <= 2:                                                     # a lord's or an abbey's ironworks: a roofed bloom anvil block
        endgrain(tm, X0 + 12, Y1 - 12, 7, p.wood); d.rectangle([X0 + 8, Y1 - 15, X0 + 16, Y1 - 9], fill=IRON[3], outline=OUT)


define("bloomery", draw=bloomery, states=("lit", "out"), light={"dim": 5, "bright": 1.5, "color": "#ff8a3a", "kind": "fire"}, front=True, clear=3,
       ref="bloomery shafts 3 to 5 ft across with their bellows and heaps (Tylecote, A History of Metallurgy; the Japanese tatara)")


# ================================================================ large cardboard box
BOX_PRINT = {"plain": None, "red": (180, 40, 36), "blue": (40, 70, 150), "green": (40, 120, 60), "black": (36, 36, 40), "yellow": (220, 180, 40),
             "white": (230, 228, 220), "orange": (220, 120, 40), "brown": (110, 70, 40), "purple": (100, 60, 130), "grey": (130, 130, 128)}
# the board: brown kraft for plain boxes, a white-lined or grey recycled board, or one printed all over in the maker's colour
BOX_BOARD = {"plain": (176, 138, 92), "red": (178, 70, 54), "blue": (90, 110, 160), "green": (100, 140, 90), "black": (70, 64, 60), "yellow": (214, 186, 92),
             "white": (226, 222, 210), "orange": (208, 130, 70), "brown": (120, 84, 54), "purple": (130, 100, 140), "grey": (150, 148, 140)}


BOX_HOLD = {"books": [(120, 40, 40), (40, 60, 110), (200, 190, 160), (60, 90, 60)], "clothes": [(110, 120, 150), (200, 190, 170), (150, 60, 60), (60, 60, 64)],
            "tins": [(170, 174, 178), (200, 60, 40), (220, 200, 60)], "junk": [(140, 90, 60), (90, 90, 96), (200, 180, 120), (60, 110, 140)], "cables": [(30, 30, 34), (200, 200, 196), (180, 40, 40)]}


def cardboardbox(tm, x, y, w, h, st, v):
    """A large corrugated cardboard box on the floor, seen from above. Closed: its four flaps folded down and sealed,
    the seam down the middle. Open: the flaps folded out flat round it and its contents showing. Victorian: plain
    brown board tied with twine, a paper label and a big stencilled shipping mark. Great War: string and a printed
    maker's panel. Mid-Century: printed all over, brown gummed tape. Modern: clear tape, a barcode label and the
    recycling sign. Future Darkness: pale recycled board with a printed code and a lit tracking tag. The colour is
    the board and the maker's print; what it holds goes with it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    key = v.get("colour", "plain"); ki = list(BOX_PRINT).index(key) if key in BOX_PRINT else 0
    base = {4: (150, 120, 84), 5: (176, 138, 92), 6: (184, 146, 100), 7: (196, 160, 112), 8: (200, 190, 168)}.get(e, (150, 120, 84))
    base = mix(base, BOX_BOARD.get(key, base), .45)
    if p.w <= 1: base = mix(base, (120, 104, 84), .25)
    C = rmp(fade(base, v), 14)
    pc = BOX_PRINT.get(key) or (60, 50, 40)
    shadow(tm, X0, Y0, X1, Y1, 3)
    if st == "open":
        fl = rmp(tone(C[2], 10), 14); f = H_ // 4
        d.polygon([(X0, Y0 + f), (X1, Y0 + f), (X1 - 3, Y0), (X0 + 3, Y0)], fill=fl[3], outline=OUT)
        d.rectangle([X0, Y0 + f, X1, Y1], fill=C[2], outline=OUT)
        d.rectangle([X0 + 3, Y0 + f + 2, X1 - 3, Y1 - 3], fill=C[0], outline=OUT)
        kind = list(BOX_HOLD)[(ki + p.w) % len(BOX_HOLD)]; cols = BOX_HOLD[kind]
        ix0, iy0, ix1, iy1 = X0 + 5, Y0 + f + 4, X1 - 5, Y1 - 5; cw = (ix1 - ix0) // 3
        for k in range(6):
            gx = ix0 + (k % 3) * cw; gy = iy0 + (k // 3) * (iy1 - iy0) // 2; c = cols[k % len(cols)]; gh = (iy1 - iy0) // 2 - 1
            if kind == "books": d.rectangle([gx, gy, gx + cw - 2, gy + gh], fill=c, outline=OUT); d.line([gx + 1, gy + 1, gx + cw - 3, gy + 1], fill=tone(c, 50))
            elif kind == "tins": d.ellipse([gx, gy, gx + cw - 1, gy + gh], fill=c, outline=OUT); d.point((gx + 2, gy + 2), fill=tone(c, 60))
            elif kind == "cables": d.arc([gx - 2, gy, gx + cw + 2, gy + gh + 2], k * 40, 290 + k * 40, fill=c, width=2)
            else: d.rounded_rectangle([gx, gy, gx + cw - 1, gy + gh], 2, fill=c, outline=OUT)
        return
    lidbox(d, X0, Y0, X1, Y1, C)
    lay = ki % 4                                                                 # where the maker's print sits on the lid
    if e == 4: pc = mix(pc, C[2], .3)                                             # Victorian: a stencilled mark soaked into the board
    if key != "plain":
        if lay == 0: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, cy - 3], fill=pc)
        elif lay == 1: d.rectangle([X0 + 2, cy - H_ // 5, X1 - 2, cy + H_ // 5], fill=pc)
        elif lay == 2: d.polygon([(X0 + 2, Y0 + 2), (X0 + W_ * .4, Y0 + 2), (X0 + 2, Y0 + H_ * .5)], fill=pc); d.polygon([(X1 - 2, Y0 + 2), (X1 - W_ * .4, Y0 + 2), (X1 - 2, Y0 + H_ * .5)], fill=pc)
        else: d.ellipse([cx - W_ * .32, cy - H_ * .32, cx + W_ * .32, cy + H_ * .32], fill=pc)
    if e == 4:                                                                    # Victorian: twine, a label and a stencilled shipping mark
        d.polygon([(cx, Y0 + 4), (X1 - 5, cy), (cx, Y1 - 4), (X0 + 5, cy)], outline=pc if key != "plain" else (50, 40, 34))
        d.line([X0 + 2, cy, X1 - 2, cy], fill=(206, 186, 136), width=2); d.line([cx, Y0 + 2, cx, Y1 - 2], fill=(206, 186, 136), width=2)
        d.rectangle([cx - 5, Y1 - 10, cx + 5, Y1 - 4], fill=(232, 224, 200), outline=OUT)   # the label, centred at the front
    elif e == 5:
        d.line([X0 + 2, cy, X1 - 2, cy], fill=(220, 210, 170)); d.line([cx, Y0 + 2, cx, Y1 - 2], fill=(220, 210, 170))   # string
    elif e == 6:
        d.rectangle([cx - 3, Y0 + 1, cx + 3, Y1 - 1], fill=(150, 112, 64))           # brown gummed tape over the seam
    elif e == 7:
        d.line([cx, Y0 + 2, cx, Y1 - 2], fill=C[0]); d.rectangle([cx - 3, Y0 + 1, cx + 3, Y1 - 1], outline=tone(C[3], 30))   # clear tape catching the light
        d.rectangle([cx - 6, Y1 - 10, cx + 6, Y1 - 4], fill=(240, 240, 236), outline=OUT)   # the barcode label at the front
        for k in range(4): d.line([cx - 4 + k * 3, Y1 - 9, cx - 4 + k * 3, Y1 - 6], fill=(20, 20, 20))
    else:
        d.line([cx, Y0 + 2, cx, Y1 - 2], fill=C[0])
        d.rectangle([cx - 4, Y1 - 12, cx + 4, Y1 - 4], fill=(30, 30, 30)); d.rectangle([cx - 2, Y1 - 10, cx + 2, Y1 - 6], fill=(230, 230, 230))
        d.rectangle([cx - 2, Y0 + 3, cx + 2, Y0 + 6], fill=lit_of(p)[2])
    if p.w >= 4 and e >= 6:                                                        # hand-holes in a heavy double-wall box
        for hx in (X0 + 3, X1 - 7): d.rounded_rectangle([hx, cy - 4, hx + 4, cy + 4], 2, fill=SHADE_CLR)


define("cardboardbox", draw=cardboardbox, global_from=gf(1900), states=("closed", "open"), openable="crate",
       axes={"colour": list(BOX_PRINT)}, nvar=12,
       ref="corrugated shipping boxes about 2 ft square (regular slotted cartons, Robert Gair 1890; carton makers' sizes)")


# ================================================================ cyborg charging booth
BOOTH = {"white": (220, 222, 226), "black": (40, 42, 48), "gunmetal": (86, 90, 98), "red": (150, 36, 40), "blue": (40, 70, 130), "orange": (200, 110, 40),
         "green": (40, 110, 80), "gold": (170, 140, 70), "violet": (90, 60, 130), "teal": (30, 120, 130), "rust": (120, 70, 50)}


def chargebooth(tm, x, y, w, h, st, v):
    """A charging booth for cyborgs and androids against a wall, seen from above: an open-fronted cubicle, its back
    panel with the charging cradle and two cable arms, the floor plate with foot marks and a lit ring, a status panel
    on the side wall. The corporate makers' liveries: white, black, gunmetal and the house colours, a princely one
    trimmed in gilt."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    col = BOOTH.get(v.get("colour", "white"), (220, 222, 226)); C = rmp(fade(col, v), 14); L = lit_of(p, col)
    on = True
    shadow(tm, X0, Y0, X1, Y1, 4)
    lidbox(d, X0, Y0, X1, Y0 + 12, C)                                            # the back panel
    lidbox(d, X0, Y0, X0 + 12, Y1, C); lidbox(d, X1 - 12, Y0, X1, Y1, C)          # the side walls
    Fp = rmp(mix((40, 42, 50), col, .45), 10)
    d.rectangle([X0 + 9, Y0 + 12, X1 - 9, Y1], fill=Fp[1], outline=OUT)        # the floor plate in the maker's colour, dulled by feet
    for gy in range(Y0 + 18, Y1 - 2, 6): d.line([X0 + 11, gy, X1 - 11, gy], fill=Fp[2])
    for fx in (cx - 9, cx + 4): d.rounded_rectangle([fx, Y1 - 24, fx + 6, Y1 - 10], 3, fill=(64, 66, 76), outline=OUT)   # foot marks
    d.ellipse([cx - 18, Y0 + 22, cx + 18, Y1 - 6], outline=L[1] if on else (60, 60, 66), width=2)
    d.rectangle([cx - 10, Y0 + 3, cx + 10, Y0 + 10], fill=(30, 30, 36), outline=OUT)   # the cradle socket
    if on: d.rectangle([cx - 6, Y0 + 5, cx + 6, Y0 + 8], fill=L[2])
    for sx in (-1, 1):                                                          # cable arms
        ax0 = cx + sx * 12; ex = cx + sx * 20; ey = Y0 + 26
        d.line([ax0, Y0 + 10, ex, ey], fill=OUT, width=4); d.line([ax0, Y0 + 10, ex, ey], fill=(70, 72, 80), width=2)
        d.rectangle([ex - 2, ey - 2, ex + 2, ey + 2], fill=L[2] if on else (80, 80, 86))
    d.rectangle([X1 - 8, Y0 + 20, X1 - 2, Y0 + 34], fill=(20, 20, 26), outline=OUT)     # status panel
    for k in range(3): d.rectangle([X1 - 6, Y0 + 22 + k * 4, X1 - 4, Y0 + 24 + k * 4], fill=(L[3] if k == 0 else L[1]) if on else (50, 50, 56))
    if p.w >= 5: d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=GOLD[4])                # a gilt trim for the rich


define("chargebooth", draw=chargebooth, global_from=gf(2050), axes={"colour": list(BOOTH)}, nvar=12, front=True, clear=2.5,
       ref="a standing booth about 3 ft square, the size of a shower cubicle or a photo booth")


# ================================================================ decorated Christmas tree
def _conifer(d, cx, cy, R, G, n=9, tiers=4, rot=0.0):
    """A conifer from straight above: tiers of radial branch tips, darkest and widest at the bottom, lit to the
    north-west."""
    for t in range(tiers):
        r = R * (1 - t * .22); k = min(4, 1 + t)
        pts = []
        for i in range(n * 2):
            a = rot + t * .35 + i * math.pi / n; q = r if i % 2 == 0 else r * .72
            pts.append((cx + math.cos(a) * q, cy + math.sin(a) * q))
        d.polygon(pts, fill=G[max(0, k - 1)], outline=G[0] if t == 0 else None)
        for i in range(0, n * 2, 2):
            a = rot + t * .35 + i * math.pi / n
            if math.cos(a - 3.9) > .3: d.line([cx + math.cos(a) * r * .4, cy + math.sin(a) * r * .4, cx + math.cos(a) * r * .9, cy + math.sin(a) * r * .9], fill=G[min(4, k + 1)])


XMAS_DECO = {"central": [(196, 40, 36), (226, 200, 120), (176, 120, 70)], "atlantic": [(190, 40, 50), (40, 90, 60), (226, 190, 70)],
             "northern": [(200, 36, 40), (240, 236, 226), (214, 180, 110)], "americas": [(240, 236, 220), (180, 30, 40), (60, 120, 200)],
             "oceania": [(226, 196, 80), (210, 210, 220), (200, 60, 60)]}


XMAS_THEME = {"red": (200, 36, 40), "gold": (226, 180, 60), "silver": (206, 210, 220), "blue": (50, 90, 190), "white": (240, 238, 232), "multi": None}


def christmastree(tm, x, y, w, h, st, v):
    """A decorated Christmas tree in a parlour or hall, seen from above: the fir's tiers of branches, a star or angel
    at the top in the middle, the decorations of its land and age, its stand or tub, and presents round its foot.
    Lit: its candles or bulbs burn. By region: red apples, gilt nuts and straw stars in Central Europe; paper chains,
    crackers and holly in the Atlantic lands; red and white flag garlands and straw goats in the North; strings of
    popcorn and cranberries in the Americas; heavy gold and silver tinsel in Oceania. Renaissance: a small fir in a
    hooped tub or a square box hung with apples and wafers, paper roses and gold foil for the rich. Age of Reason: wax candles and sugar ornaments. Victorian: glass baubles,
    tinsel and an angel. Great War: a sparse tree with a few candles. Mid-Century: big coloured bulbs and lametta,
    an aluminium tree for the rich. Modern: strings of small lights and ribbon. Future Darkness: a dark fibre-optic
    tree with lit tips."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = (X1 - X0) / 2 * (.62 if e == 2 else .8 if e == 5 else .92) * (.72 if p.w <= 1 else .86 if p.w <= 3 else 1); lit = st == "lit"
    deco = list(XMAS_DECO.get(p.st, XMAS_DECO["central"]))
    theme = XMAS_THEME.get(v.get("colour", "multi"))
    if theme and e >= 3: deco = [theme, theme, deco[0]] if p.w >= 2 else [theme, deco[0], deco[1]]
    skirt = rmp(p.cloth[2] if p.w >= 2 else mix(p.cloth[2], (140, 120, 100), .5), 14)
    if e == 2: skirt = rmp(mix(p.wood[2], (130, 96, 60), .3))                    # a wooden tub
    elif e == 8: skirt = rmp(mix((50, 54, 62), p.cloth[2], .6), 12)
    if e == 2 and p.st in ("atlantic", "americas"):                                # a square planked box tub
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=skirt[2], outline=OUT)
        for k in (1, 2, 3): yy = Y0 + 2 + (Y1 - Y0 - 4) * k // 4; d.line([X0 + 3, yy, X1 - 3, yy], fill=skirt[0])
    else: d.ellipse([X0, Y0, X1, Y1], fill=skirt[2], outline=OUT)                 # tree skirt, tub or floor cloth
    if e == 2 and p.st not in ("atlantic", "americas"): d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=IRON[1], width=2)   # the tub's iron hoop
    if p.w >= 3 and e >= 4: d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=GOLD[3] if p.w >= 4 else skirt[4], width=2)
    shadow(tm, cx - R, cy - R, cx + R, cy + R, 4, kind="ellipse")
    if e == 6 and p.w >= 4: G = rmp((190, 196, 204), 16)                          # an aluminium tree
    elif e == 8: G = rmp(mix((40, 56, 60), theme or deco[0], .5), 14)              # fibre-optic tips glowing in its colour
    elif e == 7 and p.w <= 2: G = rmp((60, 110, 70), 14)                          # an artificial tree
    else: G = rmp(et((52, 96, 56), e, .12), 16)
    _conifer(d, cx, cy, R, G, n=8 if e != 2 else 7, tiers=4, rot=.2 * e)
    nd = {2: 6, 3: 9, 4: 14, 5: 6, 6: 12, 7: 12, 8: 10}[e] + p.w * 3               # more of everything for the rich
    def spot(i, q):
        a = i * 2.39996 + e; rr = R * (.25 + .65 * ((i * 37 % 11) / 11)) * q
        return cx + math.cos(a) * rr, cy + math.sin(a) * rr
    if e >= 4 and e != 5 or p.st in ("americas", "atlantic", "northern"):        # garlands round the tiers
        gc = {"americas": (240, 236, 220), "atlantic": deco[0], "northern": deco[0], "oceania": GOLD[4]}.get(p.st, GOLD[3])
        if e == 6: gc = (220, 224, 230)                                             # lametta
        if e == 8: gc = lit_of(p)[1]
        for k, rr in enumerate((R * .78, R * .52)):
            d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 20 + k * 90, 300 + k * 90, fill=gc, width=2)
            if p.st == "northern" and e < 8: d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 60 + k * 90, 120 + k * 90, fill=(240, 236, 226), width=2)
    for i in range(nd):                                                            # ornaments
        ox, oy = spot(i, 1); c = deco[i % len(deco)]
        if e == 2:                                                                 # apples and wafers; paper roses and gold foil for the rich
            if i % 3 == 2 and p.w >= 3: d.polygon([(ox - 3, oy), (ox, oy - 3), (ox + 3, oy), (ox, oy + 3)], fill=GOLD[3] if p.w >= 4 else deco[1], outline=OUT)
            elif i % 3 == 1 and p.w >= 2: d.ellipse([ox - 3, oy - 3, ox + 3, oy + 3], fill=deco[0], outline=OUT); d.point((ox, oy), fill=deco[1])
            else: d.ellipse([ox - 3, oy - 3, ox + 3, oy + 3], fill=(196, 40, 36) if i % 2 else (236, 226, 196), outline=OUT)
        elif e == 4 or e == 6 or e == 7: d.ellipse([ox - 4, oy - 4, ox + 4, oy + 4], fill=c, outline=OUT); d.point((ox - 2, oy - 2), fill=(255, 255, 255))   # glass baubles
        elif e == 8:                                                               # lit ornaments, shaped as the land likes them
            lc = lit_of(p, c)[3]
            if p.st == "northern": d.polygon([(ox - 3, oy), (ox, oy - 3), (ox + 3, oy), (ox, oy + 3)], fill=lc)
            elif p.st in ("central", "americas"): d.ellipse([ox - 2, oy - 2, ox + 2, oy + 2], fill=lc)
            else: d.rectangle([ox - 2, oy - 2, ox + 2, oy + 2], fill=lc)
        elif p.st == "northern": d.polygon([(ox - 4, oy), (ox, oy - 4), (ox + 4, oy), (ox, oy + 4)], fill=c, outline=OUT)   # straw stars and hearts
        else: d.rectangle([ox - 3, oy - 3, ox + 3, oy + 3], fill=c, outline=OUT)
    lights = []
    if e in (3, 4, 5): lights = [spot(i, .95) for i in range(5 + p.w * 2 if e != 5 else 4)]   # wax candles
    elif e == 6: lights = [spot(i + 30, 1) for i in range(10 + p.w * 2)]              # big coloured bulbs
    elif e == 7: lights = [spot(i + 60, 1) for i in range(18 + p.w * 3)]              # small lights
    elif e == 8: lights = [(cx + math.cos(a) * R * .9, cy + math.sin(a) * R * .9) for a in np.linspace(0, 6.28, 17)[:-1]]
    for k, (lx, ly) in enumerate(lights):
        if e <= 5:
            d.rectangle([lx - 1, ly - 2, lx + 1, ly + 2], fill=(240, 232, 210), outline=OUT)
            if lit: d.rectangle([lx - 1, ly - 5, lx + 1, ly - 3], fill=(255, 210, 90)); d.point((lx, ly - 6), fill=(255, 250, 220))
        else:
            c = [(230, 50, 40), (60, 120, 230), (240, 200, 40), (60, 190, 90)][k % 4] if (e == 6 or p.w % 2) else (255, 240, 190)
            if e == 8: c = lit_of(p)[3]
            if not lit: c = mix(c, (60, 60, 60), .6)
            r = 2 if e == 6 else 1
            d.ellipse([lx - r, ly - r, lx + r, ly + r], fill=c)
    tc = GOLD if e != 8 else rmp(lit_of(p)[2], 10)                                 # the star or angel at the top
    if e == 4 and p.w >= 3: d.polygon([(cx, cy - 5), (cx + 4, cy + 4), (cx - 4, cy + 4)], fill=(240, 236, 226), outline=OUT); d.ellipse([cx - 2, cy - 6, cx + 2, cy - 2], fill=GOLD[3])
    else: d.polygon([(cx + math.cos(a) * (5 if i % 2 == 0 else 2), cy + math.sin(a) * (5 if i % 2 == 0 else 2)) for i, a in enumerate(np.linspace(-1.57, 4.71, 11)[:-1])], fill=tc[3], outline=OUT)
    nps = p.w - 1 + (2 if e >= 6 else 0)                                           # presents at its foot
    for k in range(max(0, nps)):
        a = .6 + k * 1.1; px_, py_ = cx + math.cos(a) * R * .95, cy + math.sin(a) * R * .95
        c = [deco[0], (60, 90, 160), (220, 200, 120), (60, 130, 80)][k % 4]
        d.rectangle([px_ - 5, py_ - 4, px_ + 5, py_ + 4], fill=c, outline=OUT); d.line([px_, py_ - 4, px_, py_ + 4], fill=GOLD[4]); d.line([px_ - 5, py_, px_ + 5, py_], fill=GOLD[4])
    if lit: tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 90, None)]


define("christmastree", draw=christmastree, axes={"colour": list(XMAS_THEME)}, states=("lit", "out"), light={"dim": 3, "bright": .5, "color": "#ffd27a", "kind": "candle"},
       ref="parlour Christmas trees 4 to 6 ft across at the foot (Strasbourg 1605 account; Illustrated London News 1848)")


# ================================================================ clothes rail
RAIL_SET = {"coats": [(60, 60, 70), (90, 70, 56), (40, 44, 60), (110, 100, 90)], "pastels": [(220, 180, 190), (180, 210, 220), (230, 220, 170), (200, 220, 190)],
            "uniforms": [(110, 104, 72), (96, 96, 70), (120, 112, 80)], "denim": [(60, 84, 130), (80, 110, 160), (50, 66, 100)], "bright": [(220, 40, 60), (40, 160, 200), (250, 200, 30), (120, 200, 60)],
            "shirts": [(236, 236, 232), (200, 220, 240), (240, 230, 214)], "furs": [(150, 110, 70), (200, 180, 150), (90, 66, 46)], "black": [(30, 30, 34), (50, 48, 52), (24, 24, 28)],
            "reds": [(150, 30, 40), (190, 60, 50), (120, 20, 30)], "greens": [(50, 110, 60), (90, 140, 80), (40, 80, 50)], "mixed": [(180, 60, 50), (60, 80, 140), (210, 200, 180), (70, 70, 74), (200, 160, 60)],
            "empty": []}


def clothesrail(tm, x, y, w, h, st, v):
    """A free-standing clothes rail in a shop, a tailor's or a wardrobe room, seen from above: the two end stands with
    their feet, the rail between, and the garments hung on it, each a narrow slab across the rail with its hanger
    hook on top. Victorian: a turned wooden rail on cast-iron stands, wooden hangers, dark woollens. Great War: an
    iron rail and uniform greatcoats. Mid-Century: chrome tube on castors. Modern: chrome with plastic hangers and
    sale tags. Future Darkness: a dark rail with a lit strip. The contents are the stock: coats, pastels, uniforms,
    denim, shirts, furs, or nothing but bare hangers."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cy = (Y0 + Y1) // 2
    M = {4: rmp((120, 84, 56)), 5: IRON, 6: STEEL, 7: rmp((190, 194, 200), 14), 8: rmp((52, 56, 64), 12)}[e]
    for sx in (X0 + 2, X1 - 6):                                                    # the end stands, their feet across
        d.rectangle([sx - 1, Y0 + 1, sx + 5, Y1 - 1], fill=M[1], outline=OUT); d.line([sx, Y0 + 2, sx, Y1 - 2], fill=M[3])
        for fy in (Y0 + 1, Y1 - 5):
            if e >= 6: d.ellipse([sx - 1, fy, sx + 5, fy + 4], fill=(30, 30, 30), outline=OUT)   # castors
    if e == 5: mx_ = (X0 + X1) // 2; d.rectangle([mx_ - 3, Y0 + 1, mx_ + 3, Y1 - 1], fill=M[1], outline=OUT)   # a quartermaster's long rail with a middle stand
    d.line([X0 + 4, cy, X1 - 4, cy], fill=OUT, width=4); d.line([X0 + 4, cy - 1, X1 - 4, cy - 1], fill=M[4] if e != 8 else lit_of(p)[2], width=1)
    key = v.get("contents", "mixed"); cols = RAIL_SET.get(key, RAIL_SET["mixed"])
    if e == 5 and key == "mixed": cols = RAIL_SET["uniforms"]
    n = 0 if not cols else (10 + p.w * 2)
    span = X1 - X0 - 16; step = span / max(1, n) if n else 0
    hl = (Y1 - Y0) // 2 - 2
    rows = (0,)
    if e == 5:                                                                      # a quartermaster's double rail: two rows of greatcoats
        hl = (Y1 - Y0) // 4 - 1; rows = (-hl - 1, hl + 1)
        for oy in rows: d.line([X0 + 4, cy + oy, X1 - 4, cy + oy], fill=OUT, width=3)
    for k in range(n * len(rows)):
        oy = rows[k // n] if n else 0; k = k % n if n else k
        gx = int(X0 + 9 + k * step); c = fade(et(cols[(min(k, n - 1 - k) * 7 + p.w) % len(cols)], e, .1), v)   # evenly hung, the colours matched end to end
        G = rmp(c, 14); gw = max(3, int(step) - 1); gy_ = cy + oy
        d.rectangle([gx, gy_ - hl, gx + gw, gy_ + hl], fill=G[2], outline=OUT)
        d.line([gx + 1, gy_ - hl + 1, gx + 1, gy_ + hl - 1], fill=G[4]); d.line([gx + gw - 1, gy_ - hl + 1, gx + gw - 1, gy_ + hl - 1], fill=G[0])
        if key == "furs": d.line([gx + gw // 2, gy_ - hl + 2, gx + gw // 2, gy_ + hl - 2], fill=G[3])
    hk = {4: (150, 110, 70), 5: (120, 90, 60), 6: (196, 200, 206), 7: (40, 40, 44), 8: (200, 200, 210)}[e]   # hanger hooks
    for k in range(n if n else 8):
        gx = int(X0 + 9 + (k * step if n else k * span / 8)) + 2
        if not n: d.line([gx - 3, cy - hl // 2, gx - 3, cy + hl // 2], fill=hk, width=2)   # bare hangers
        d.point((gx, cy - 1), fill=hk)
    if e == 7 and n:
        for k in (1, n - 2): gx = int(X0 + 9 + k * step); d.rectangle([gx, cy + hl - 3, gx + 3, cy + hl], fill=(240, 60, 40))   # sale tags


define("clothesrail", draw=clothesrail, global_from=gf(1900), axes={"contents": list(RAIL_SET)}, nvar=12, front=True, clear=2,
       ref="shop clothes rails about 5 ft long and 20 in deep (garment rail makers; hanger widths 17 to 19 in)")


# ================================================================ column or pillar
COL_STONE = {"central": (186, 180, 166), "atlantic": (150, 146, 140), "northern": (64, 46, 36), "mediterranean": (232, 226, 214), "islamic": (226, 214, 196),
             "steppe": (196, 98, 42), "southasia": (178, 92, 70), "eastasia": (168, 40, 32), "seasia": (128, 84, 48), "africa": (110, 70, 44),
             "americas": (176, 160, 130), "oceania": (100, 64, 44), "polar": (214, 206, 186)}


WOODEN_COL = ("northern", "steppe", "eastasia", "seasia", "africa", "oceania", "polar")


def column(tm, x, y, w, h, st, v):
    """A column or pillar seen from straight above: its square plinth, the moulded base, the round or shaped shaft,
    and its fluting or carving. By region: limestone in Central Europe, grey granite in the Atlantic lands, a tarred
    timber stave post in the North, white marble round the Mediterranean, slim marble with a striped band in the
    Islamic world, a painted timber post in orange and red on the steppe, an octagonal red sandstone pillar in South
    Asia, a red lacquered timber column on a stone drum in East Asia, a teak post in the islands, a carved hardwood
    veranda post in Africa, carved stone in the Americas, a carved post in Oceania, driftwood or whalebone in the far
    north. Dark Ages: a squat round pier. Long Night: a clustered pier of four shafts. Renaissance: fluted. Age of
    Reason: a fluted shaft on a stepped plinth. Victorian: a slim cast-iron column with a moulded base. Great War: a
    square concrete pier. Mid-Century: a round concrete column. Modern: a painted steel box column on a
    bolted plate, or for the rich a round column clad in polished stone. Future Darkness: an octagonal composite
    shaft, or a round one with lit ribs, ringed by a lit band. The rich gild and polish theirs."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    W_ = X1 - X0; R = W_ / 2
    base = COL_STONE.get(p.st, (186, 180, 166)); wood = p.st in WOODEN_COL
    if e == 4: base = mix(base, (60, 70, 66), .5)                                  # cast iron painted the region's colour
    elif e in (5, 6): base = mix(base, (170, 166, 158), .55)                       # concrete
    elif e == 7: base = mix(base, (120, 126, 136), .45)
    elif e == 8: base = mix(base, (50, 54, 62), .38)
    else: base = et(base, e, .1)
    if e == 1: base = mix(base, (60, 50, 44), .3)                                 # sooted in the plague years
    if p.w >= 4: base = mix(base, (240, 236, 226), .25) if not wood else mix(base, p.acc[2], .3)   # polished marble or lacquer
    S = rmp(fade(base, v), 14)
    Pl = rmp(mix(p.stone[2], S[2], .4), 12)
    shadow(tm, X0, Y0, X1, Y1, 4)
    d.rectangle([X0, Y0, X1, Y1], fill=Pl[2], outline=OUT)                         # the plinth
    d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Pl[4]); d.line([X0 + 1, Y1 - 1, X1 - 1, Y1 - 1], fill=Pl[0])
    if e == 3: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=mix(Pl[3], (236, 230, 214), .6), outline=Pl[0])   # a stepped plinth of pale ashlar
    gold = p.w >= 4 and e <= 6
    rb = R * .86                                                                   # the base mouldings
    d.ellipse([cx - rb, cy - rb, cx + rb, cy + rb], fill=S[1] if not gold else GOLD[2], outline=OUT)
    rs = R * {0: .74, 1: .74, 2: .64, 3: .62, 4: .42, 5: .66, 6: .6, 7: .6, 8: .58}[e]
    if e == 1 and not wood:                                                        # a clustered pier
        for a in (.785, 2.356, 3.927, 5.498): blob(d, cx + math.cos(a) * rs * .45 - rs * .55, cy + math.sin(a) * rs * .45 - rs * .55, cx + math.cos(a) * rs * .45 + rs * .55, cy + math.sin(a) * rs * .45 + rs * .55, S)
    elif e == 7 and p.w >= 4:                                                       # a round column clad in polished stone panels
        blob(d, cx - rs, cy - rs, cx + rs, cy + rs, S)
        for a in (.785, 2.356, 3.927, 5.498): d.line([cx + math.cos(a) * rs * .5, cy + math.sin(a) * rs * .5, cx + math.cos(a) * (rs - 1), cy + math.sin(a) * (rs - 1)], fill=S[0])
        d.ellipse([cx - rs * .5, cy - rs * .5, cx + rs * .5, cy + rs * .5], outline=S[4])
    elif e == 8 and p.w < 4:                                                        # an octagonal composite shaft
        pts = [(cx + math.cos(a) * rs, cy + math.sin(a) * rs) for a in np.linspace(.39, 6.67, 9)[:-1]]
        d.polygon(pts, fill=S[2], outline=OUT)
        d.polygon([(cx + math.cos(a) * rs * .6, cy + math.sin(a) * rs * .6) for a in np.linspace(.39, 6.67, 9)[:-1]], outline=S[0])
    elif e in (5, 7) or (p.st == "southasia" and e <= 4):                           # square or octagonal
        if p.st == "southasia" and e <= 4:
            pts = [(cx + math.cos(a) * rs, cy + math.sin(a) * rs) for a in np.linspace(.39, 6.67, 9)[:-1]]
            d.polygon(pts, fill=S[2], outline=OUT)
            for a in np.linspace(.39, 6.67, 9)[:-1]: d.line([cx, cy, cx + math.cos(a) * rs, cy + math.sin(a) * rs], fill=S[3] if math.cos(a - 3.9) > 0 else S[1])
        else:
            lidbox(d, cx - rs, cy - rs, cx + rs, cy + rs, S)
            if e == 7:                                                             # a bolted base plate under the painted box
                for bx, by in ((cx - rs - 4, cy - rs - 4), (cx + rs + 1, cy - rs - 4), (cx - rs - 4, cy + rs + 1), (cx + rs + 1, cy + rs + 1)): d.rectangle([bx, by, bx + 3, by + 3], fill=S[3], outline=OUT)
                d.rectangle([cx - rs + 3, cy - rs + 3, cx + rs - 3, cy + rs - 3], outline=S[0])
    else:
        blob(d, cx - rs, cy - rs, cx + rs, cy + rs, S)
        if e in (2, 3) and not wood:                                               # fluting
            for a in np.linspace(0, 6.28, 17)[:-1]: d.line([cx + math.cos(a) * rs * .55, cy + math.sin(a) * rs * .55, cx + math.cos(a) * (rs - 1), cy + math.sin(a) * (rs - 1)], fill=S[1])
        if wood and e <= 6:                                                        # the timber's growth rings or its carving
            d.ellipse([cx - rs * .55, cy - rs * .55, cx + rs * .55, cy + rs * .55], outline=S[0])
            if p.st in ("africa", "oceania"):
                for a in np.linspace(0, 6.28, 7)[:-1]: d.line([cx + math.cos(a) * rs * .6, cy + math.sin(a) * rs * .6, cx + math.cos(a + .4) * rs * .9, cy + math.sin(a + .4) * rs * .9], fill=S[0], width=2)
        if p.st == "islamic" and e <= 6: d.ellipse([cx - rs * .7, cy - rs * .7, cx + rs * .7, cy + rs * .7], outline=(140, 50, 50), width=2)   # the striped band
        if p.st == "steppe" and e <= 6: d.ellipse([cx - rs * .6, cy - rs * .6, cx + rs * .6, cy + rs * .6], outline=(40, 90, 160), width=2)
        if e == 4: d.ellipse([cx - rs - 3, cy - rs - 3, cx + rs + 3, cy + rs + 3], outline=S[3], width=2)   # the cast collar
    if gold: d.ellipse([cx - rs + 2, cy - rs + 2, cx + rs - 2, cy + rs - 2], outline=GOLD[4], width=1)
    if e == 8:
        d.ellipse([cx - rs - 2, cy - rs - 2, cx + rs + 2, cy + rs + 2], outline=lit_of(p)[2], width=1)
        if p.w >= 4:                                                                # four lit ribs down the rich one's shaft
            for a in (0, 1.571, 3.142, 4.712): d.line([cx + math.cos(a) * rs * .45, cy + math.sin(a) * rs * .45, cx + math.cos(a) * (rs - 2), cy + math.sin(a) * (rs - 2)], fill=lit_of(p)[3], width=2)


define("column", draw=column, ref="columns and piers about 2 ft through on a 2 ft plinth (Vitruvius's orders; cast-iron columns of 8 to 12 in; Chinese timber columns 1 1/2 to 2 ft)")


# ================================================================ shipping container
LINE_COL = {"blue": (40, 90, 150), "red": (170, 40, 36), "green": (40, 110, 60), "grey": (130, 134, 140), "orange": (210, 110, 40), "brown": (120, 70, 46),
            "white": (226, 226, 220), "yellow": (220, 180, 40), "teal": (30, 120, 130), "maroon": (110, 30, 40), "navy": (30, 44, 80), "silver": (180, 184, 190)}


def container(tm, x, y, w, h, st, v):
    """A shipping container on a quay or in a yard, seen from above along its length, its doors at the south end:
    the corrugated roof, the corner castings, the door end with its locking bars. Open: both doors swung back and the
    cargo showing in the mouth. The same the world over; its colour is the line that owns it. Mid-Century: riveted
    aluminium-sided boxes with flat roof panels. Modern: corrugated steel, rust streaks and dents. Future Darkness:
    dark composite panels and a lit tracking tag. The rich lines keep theirs freshly painted."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    key = v.get("colour", "blue"); col = LINE_COL.get(key, (40, 90, 150)); ki = list(LINE_COL).index(key) if key in LINE_COL else 0
    if e == 6: col = mix(col, (190, 194, 198), .25)
    if e == 8: col = mix((50, 54, 62), col, .55)
    if p.w <= 1: col = mix(col, (130, 90, 60), .2)
    C = rmp(fade(col, v), 14)
    shadow(tm, X0, Y0, X1, Y1, 5)
    lidbox(d, X0, Y0, X1, Y1, C)
    if e == 6:                                                                     # flat roof panels and rivet lines
        for gy in range(Y0 + 30, Y1 - 10, 30): d.line([X0 + 2, gy, X1 - 2, gy], fill=C[0])
        for gy in range(Y0 + 30, Y1 - 10, 30):
            for gx in range(X0 + 6, X1 - 4, 8): d.point((gx, gy + 2), fill=C[4])
    elif e == 8:                                                                   # big flat composite panels, seams along and across
        for gx in (X0 + W_ // 3, X1 - W_ // 3): d.line([gx, Y0 + 3, gx, Y1 - 12], fill=C[0], width=2)
        for gy in range(Y0 + H_ // 4, Y1 - 12, H_ // 4): d.line([X0 + 3, gy, X1 - 3, gy], fill=C[4], width=2)
    else:                                                                          # corrugations across the roof
        stp = 6 if e == 7 else 9
        for gy in range(Y0 + 8, Y1 - 12, stp): d.line([X0 + 3, gy, X1 - 3, gy], fill=C[1]); d.line([X0 + 3, gy + 2, X1 - 3, gy + 2], fill=C[3])
    lay = ki % 3
    if lay == 1: d.rectangle([X0 + 2, Y0 + H_ * .3, X1 - 2, Y0 + H_ * .45], fill=WHITE[2] if key != "white" else (40, 40, 44))   # a band with the line's mark
    elif lay == 2: d.rectangle([X0 + 2, Y0 + 2, X0 + W_ * .3, Y1 - 12], fill=C[0])                    # a darker end-to-end panel of repaint
    for gx, gy in ((X0, Y0), (X1 - 8, Y0), (X0, Y1 - 8), (X1 - 8, Y1 - 8)):          # corner castings
        d.rectangle([gx, gy, gx + 8, gy + 8], fill=C[0], outline=OUT); d.rectangle([gx + 3, gy + 3, gx + 5, gy + 5], fill=SHADE_CLR)
    if st == "open":
        d.rectangle([X0 + 2, Y1 - 10, X1 - 2, Y1], fill=(24, 22, 24), outline=OUT)
        cargo = [(176, 138, 92), (200, 196, 180), (90, 110, 140), (150, 60, 50)][(ki + p.w) % 4]
        for k in range(4): d.rectangle([X0 + 6 + k * (W_ - 12) // 4, Y1 - 9, X0 + 4 + (k + 1) * (W_ - 12) // 4, Y1 - 2], fill=cargo, outline=OUT)
        for sx, dirn in ((X0, -1), (X1, 1)):                                       # the doors swung right back along the sides
            d.rectangle([min(sx, sx + dirn * 6), Y1 - W_ // 2, max(sx, sx + dirn * 6), Y1], fill=C[1], outline=OUT)
    else:
        d.rectangle([X0 + 2, Y1 - 10, X1 - 2, Y1 - 1], fill=C[1], outline=OUT); d.line([cx, Y1 - 10, cx, Y1 - 1], fill=OUT)
        for k in range(4): bx = X0 + 10 + k * (W_ - 20) // 3; d.line([bx, Y1 - 10, bx, Y1], fill=STEEL[3], width=2)   # locking bars
    if e == 8: d.rectangle([X1 - 20, Y0 + 14, X1 - 10, Y0 + 20], fill=lit_of(p, col)[2], outline=OUT)


define("container", draw=container, global_from=gf(1956), states=("closed", "open"), openable="crate", axes={"colour": list(LINE_COL)}, nvar=14, front=True, clear=8,
       ft=((7.6, 8.4), (19, 21)), ref="ISO containers 8 ft wide and 20 ft long (ISO 668; Malcom McLean's 1956 boxes were 33 ft)")


# ================================================================ body on the ground
def corpse(tm, x, y, w, h, st, v):
    """A body lying on the ground, drawn plainly and with respect: clothed in its land and age, and nothing
    worse shown. Head to the west. Europe: a tunic, hose and cloak (Dark Ages), a hooded cloak
    (Long Night), a doublet (Renaissance), a long coat and breeches with a hat dropped by (Age of Reason), a frock
    coat or a long dress (Victorian), a greatcoat (Great War), a suit and trench coat (Mid-Century), jeans and a
    jacket (Modern), a dark synthetic coat with a lit trim (Future Darkness). Long robes and wraps in the Islamic
    world, South and East Asia, Africa and on the steppe; a fur parka in the far north. Poor clothes plain and
    drab, rich ones dyed strong and trimmed in gold. The pose axis lays it on its back, on its side or face down."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    pose = v.get("pose", "back"); robe = p.st in ("islamic", "southasia", "eastasia", "africa", "steppe", "seasia") and e <= 6
    parka = p.st == "polar" and e <= 7
    Sk = skin(v, e)
    if p.w <= 1: cl = mix(p.cloth[2], (110, 100, 86), .45)
    elif p.w >= 4: cl = mix(p.acc[2], p.cloth[2], .3)
    else: cl = p.cloth[2]
    era_cl = {0: None, 1: (70, 60, 56), 2: None, 3: None, 4: (40, 36, 40), 5: (112, 104, 74), 6: (90, 86, 80), 7: (60, 84, 130), 8: (44, 46, 54)}[e]
    if era_cl and not robe: cl = mix(cl, era_cl, {7: .22, 8: .35}.get(e, .55))
    if parka: cl = mix((150, 116, 80), cl, .3)
    C = rmp(fade(cl, v), 16); A = rmp(fade(p.acc[2] if p.w >= 2 else p.wood[2], v), 16)
    fem = (p.w + len(p.st)) % 2 == 1
    hx, hy = X0 + 9, cy                                                            # the head at the west
    if e in (0, 1, 2, 8) or robe or parka or e == 5:                                # a cloak, robe or greatcoat spread under the body
        Cl = rmp(mix(C[2], (60, 56, 52), .3) if not robe else C[2], 14)
        d.polygon([(X0 + 16, Y0 + 1), (X0 + W_ * .75, Y0 + 2), (X0 + W_ * .85, cy), (X0 + W_ * .75, Y1 - 1), (X0 + 16, Y1 - 2)], fill=Cl[1], outline=OUT)
    tx0, tx1 = X0 + 17, X0 + int(W_ * .55)                                          # torso
    body_c = C if not (e == 2 and p.w >= 2) else rmp(mix(C[2], A[2], .5))
    if pose == "side":
        d.rounded_rectangle([tx0, cy - 8, tx1, cy + 6], 5, fill=body_c[2], outline=OUT)
        d.line([tx0 + 3, cy - 6, tx1 - 3, cy - 6], fill=body_c[4])
    else:
        d.rounded_rectangle([tx0, cy - 10, tx1, cy + 10], 5, fill=body_c[2], outline=OUT)
        d.line([tx0 + 3, cy - 8, tx1 - 3, cy - 8], fill=body_c[4]); d.line([tx0 + 3, cy + 8, tx1 - 3, cy + 8], fill=body_c[0])
    if e == 4 and not robe:                                                          # the Victorian frock coat's skirts spread past the hips, a watch chain
        d.polygon([(tx1 - 4, cy - 10), (tx1 + W_ * .16, cy - 14), (tx1 + W_ * .18, cy + 14), (tx1 - 4, cy + 10)], fill=body_c[1], outline=OUT)
        d.line([tx1 + W_ * .08, cy - 12, tx1 + W_ * .08, cy + 12], fill=body_c[0])
        d.arc([tx0 + 8, cy - 4, tx0 + 20, cy + 6], 0, 180, fill=GOLD[3])
    if e == 6 and not robe:                                                          # the trench coat: its skirts past the hips and the belt
        d.polygon([(tx1 - 4, cy - 10), (tx1 + W_ * .1, cy - 12), (tx1 + W_ * .11, cy + 12), (tx1 - 4, cy + 10)], fill=body_c[1], outline=OUT)
        d.rectangle([tx1 - 8, cy - 10, tx1 - 5, cy + 10], fill=body_c[0])
    if e == 2 and not robe: 
        for k in range(3): d.line([tx0 + 6 + k * 6, cy - 9, tx0 + 6 + k * 6, cy + 9], fill=A[4])   # slashed doublet
    if e in (3, 4, 6) and not robe: d.line([tx0 + 2, cy, tx1, cy], fill=body_c[0]); d.polygon([(tx0 + 2, cy - 3), (tx0 + 10, cy), (tx0 + 2, cy + 3)], fill=WHITE[3])   # coat front and shirt
    if p.w >= 4: d.line([tx0 + 2, cy - 10, tx1 - 2, cy - 10], fill=GOLD[3]); d.line([tx0 + 2, cy + 10, tx1 - 2, cy + 10], fill=GOLD[3])
    if e == 8: d.line([tx0 + 2, cy - 9, tx1 - 2, cy - 9], fill=lit_of(p)[2])
    for s_ in ((-1, 1) if pose != "side" else (1,)):                                 # arms at the sides
        ay = cy + s_ * 12 if pose == "back" else cy + s_ * 11
        d.rounded_rectangle([tx0 + 3, min(ay, ay + s_ * 5), tx0 + int((tx1 - tx0) * .9), max(ay, ay + s_ * 5)], 2, fill=body_c[1], outline=OUT)
        d.ellipse([tx0 + int((tx1 - tx0) * .9) - 1, min(ay, ay + s_ * 5) - 1, tx0 + int((tx1 - tx0) * .9) + 6, max(ay, ay + s_ * 5) + 1], fill=Sk[2], outline=OUT)
    long_ = robe or parka or (fem and e <= 6) or e == 1
    if long_:                                                                       # a long robe, dress or cloak to the feet
        Lc = body_c if not (fem and not robe) else rmp(mix(A[2], C[2], .4))
        d.polygon([(tx1 - 2, cy - 10), (X1 - 14, cy - 12), (X1 - 12, cy + 12), (tx1 - 2, cy + 10)], fill=Lc[2], outline=OUT)
        d.line([tx1 + 4, cy - 2, X1 - 14, cy - 3], fill=Lc[1])
    else:                                                                           # two legs
        L = rmp({0: mix(A[2], C[2], .8), 2: A[2], 3: (220, 214, 196), 4: (40, 38, 44), 5: (112, 104, 74), 6: (60, 60, 66), 7: mix((54, 76, 120), A[2], .55), 8: mix((40, 42, 50), A[2], .5)}.get(e, A[2]), 14)
        for s_ in (-1, 1):
            d.rounded_rectangle([tx1 - 2, cy + s_ * 1 - (7 if s_ < 0 else 0), X1 - 14, cy + s_ * 1 + (7 if s_ > 0 else 0)], 3, fill=L[2], outline=OUT)
        if e == 3: d.rounded_rectangle([tx1 - 2, cy - 7, tx1 + 14, cy + 7], 3, fill=C[2], outline=OUT)   # breeches
    shoe = rmp((50, 36, 30) if e < 7 else ((150, 150, 156) if p.w % 2 else (40, 40, 44)), 12)
    if p.st in ("africa", "southasia", "seasia", "oceania") and p.w <= 1 and e <= 6: shoe = Sk   # bare feet
    for s_ in (-1, 1): d.ellipse([X1 - 15, cy + s_ * 4 - 4, X1 - 3, cy + s_ * 4 + 4], fill=shoe[2], outline=OUT)
    hair = rmp([(52, 40, 32), (90, 60, 36), (150, 110, 60), (58, 48, 44), (120, 116, 110)][(p.w + e) % 5], 12)
    if pose == "prone": d.ellipse([hx - 7, hy - 8, hx + 8, hy + 8], fill=hair[2], outline=OUT)   # face down: the back of the head
    else:
        d.ellipse([hx - 7, hy - 8, hx + 8, hy + 8], fill=Sk[2], outline=OUT)
        d.arc([hx - 7, hy - 8, hx + 8, hy + 8], 90, 270, fill=hair[2], width=4)       # hair to the west
        d.line([hx + 1, hy - 2, hx + 1, hy - 1], fill=Sk[0]); d.line([hx + 1, hy + 2, hx + 1, hy + 3], fill=Sk[0])   # closed eyes
    hd = None                                                                       # headgear dropped or worn
    if robe and p.st in ("islamic", "southasia"): hd = rmp(WHITE[2] if p.w >= 2 else (190, 180, 160), 12)
    if parka: d.ellipse([hx - 10, hy - 11, hx + 9, hy + 11], outline=(200, 190, 170), width=3)   # the fur ruff
    elif e == 1 and not robe: d.arc([hx - 10, hy - 11, hx + 9, hy + 11], 70, 290, fill=C[1], width=5)   # the Long Night's hood drawn round the head
    if hd: d.arc([hx - 8, hy - 9, hx + 9, hy + 9], 100, 260, fill=hd[3], width=5)
    if e == 3 or e == 4 or e == 6:                                                  # a hat fallen beside it
        hc = rmp((40, 36, 38) if e != 6 else (96, 86, 70), 12); d.ellipse([X0 + 26, Y0, X0 + 40, Y0 + 9], fill=hc[2], outline=OUT); d.ellipse([X0 + 29, Y0 + 2, X0 + 37, Y0 + 7], fill=hc[3])


define("corpse", draw=corpse, axes={"pose": ["back", "side", "prone"]}, low=True,
       ref="an adult laid at full length, about 5 1/2 to 6 ft, and 1 1/2 to 2 ft across the shoulders")


# ================================================================ cryonic pod
CRYO = {"steel": (176, 180, 186), "white": (226, 228, 230), "chrome": (206, 210, 216), "black": (50, 52, 58), "blue": (60, 100, 160), "green": (90, 130, 110),
        "cream": (220, 208, 176), "grey": (120, 124, 130), "red": (160, 50, 46), "bronze": (150, 110, 70), "teal": (40, 130, 140), "violet": (100, 80, 140)}


def cryopod(tm, x, y, w, h, st, v):
    """A cryonic capsule lying in a laboratory, seen from above, its head to the west: the long insulated shell, a
    frosted window over the face with the sleeper's face dimly behind it, the gauges and the hoses to a tall dewar of
    liquid nitrogen at its foot, frost round the seams. Mid-Century: a riveted steel cylinder with bands and dial
    gauges. Modern: a big polished dewar laid in a cradle with a digital control box. Future Darkness: a sealed pod
    with a clear canopy over the whole sleeper, lit blue inside. The shell is the maker's finish."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    col = CRYO.get(v.get("colour", "steel"), (176, 180, 186))
    if e == 8: col = mix((50, 54, 62), col, .8)
    C = rmp(fade(col, v), 16); L = lit_of(p, (120, 200, 255))
    shadow(tm, X0, Y0, X1, Y1, 4)
    dx = X1 - int(H_ * .9)                                                         # the dewar at the foot, east
    d.ellipse([dx, Y0 + 2, X1, Y1 - 2], fill=C[1], outline=OUT); d.ellipse([dx + 6, Y0 + 8, X1 - 6, Y1 - 8], fill=C[3], outline=C[0])
    knob(tm, (dx + X1) // 2, cy, STEEL, 4)
    sx1 = dx - 4
    if e == 6:                                                                     # a banded steel cylinder
        d.rounded_rectangle([X0, Y0 + 4, sx1, Y1 - 4], 12, fill=C[2], outline=OUT); d.line([X0 + 8, Y0 + 6, sx1 - 8, Y0 + 6], fill=C[4])
        for bx in range(X0 + 18, sx1 - 6, 20):
            d.line([bx, Y0 + 5, bx, Y1 - 5], fill=C[0], width=2)
            for by in range(Y0 + 8, Y1 - 6, 8): d.point((bx + 2, by), fill=C[4])
        for k in range(2): d.ellipse([sx1 - 22 + k * 10, Y0 + 7, sx1 - 14 + k * 10, Y0 + 15], fill=WHITE[3], outline=OUT); d.line([sx1 - 18 + k * 10, Y0 + 11, sx1 - 16 + k * 10, Y0 + 9], fill=(20, 20, 20))
    elif e == 7:
        d.rounded_rectangle([X0, Y0 + 2, sx1, Y1 - 2], 20, fill=C[2], outline=OUT); d.line([X0 + 12, Y0 + 5, sx1 - 12, Y0 + 5], fill=C[4], width=2)
        d.rectangle([sx1 - 26, Y1 - 16, sx1 - 8, Y1 - 6], fill=(30, 32, 36), outline=OUT); d.rectangle([sx1 - 24, Y1 - 14, sx1 - 16, Y1 - 10], fill=(80, 220, 120))
        for cx_ in (X0 + 20, sx1 - 20): d.rectangle([cx_ - 3, Y0, cx_ + 3, Y1], fill=STEEL[1], outline=OUT)   # the cradle
    else:
        d.rounded_rectangle([X0, Y0 + 2, sx1, Y1 - 2], 22, fill=C[2], outline=L[1])
        d.rounded_rectangle([X0 + 6, Y0 + 8, sx1 - 8, Y1 - 8], 16, fill=mix(mix(L[0], (20, 30, 40), .4), col, .7), outline=L[2])   # the canopy over the whole sleeper
        fig = rmp((150, 180, 200), 12)
        d.ellipse([X0 + 12, cy - 7, X0 + 26, cy + 7], fill=fig[3]); d.rounded_rectangle([X0 + 26, cy - 9, sx1 - 24, cy + 9], 6, fill=fig[2])
        for k in range(3): d.line([X0 + 30 + k * 18, Y0 + 10, X0 + 38 + k * 18, Y0 + 10], fill=L[4])
    if e <= 7:                                                                      # the frosted face window
        wx0 = X0 + 8
        d.ellipse([wx0, cy - 11, wx0 + 26, cy + 11], fill=(196, 220, 230), outline=OUT)
        d.ellipse([wx0 + 6, cy - 6, wx0 + 18, cy + 6], fill=(160, 180, 190))
        d.arc([wx0 + 2, cy - 9, wx0 + 24, cy + 9], 180, 270, fill=(250, 255, 255), width=2)
    hc = (60, 60, 66) if e < 8 else L[1]                                           # hoses to the dewar
    for k in (-6, 6): d.line([sx1 - 2, cy + k, dx + 4, cy + k], fill=hc, width=3)
    for k in range(8 if p.w >= 5 else 4):                                          # frost on the seams
        fx = rng.uniform(X0 + 30, sx1 - 10); d.line([fx, Y0 + 3, fx + 4, Y0 + 3], fill=(236, 246, 252), width=2)


define("cryopod", draw=cryopod, global_from=gf(1967), axes={"colour": list(CRYO)}, nvar=12, front=False,
       ref="cryonic capsules and horizontal dewars about 7 ft by 3 ft (Cryo-Care capsule 1967; Alcor and Cryonics Institute dewars)")


# ================================================================ dancing pole
POLE_BASE = {"black": (36, 36, 40), "chrome": (200, 204, 210), "brass": (196, 156, 70), "pink": (220, 110, 170), "red": (180, 30, 40), "white": (234, 234, 230),
             "purple": (110, 50, 150), "blue": (40, 80, 180), "gold": (214, 176, 60), "mirror": (150, 170, 190), "green": (40, 150, 90), "orange": (220, 110, 40)}


def dancepole(tm, x, y, w, h, st, v):
    """A dancing pole in a club, seen from straight above: the polished pole a bright disc at the middle, its base
    flange, and the round podium it stands on. Mid-Century: a brass pole on a carpeted wooden drum. Modern: a chrome
    pole on a steel base plate for the poor, on a stepped podium with a ring of small lights, its top step in mirror
    segments for the rich. Future Darkness: a lit pole on a dark glass disc.
    The podium's finish is the club's."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    col = POLE_BASE.get(v.get("colour", "black"), (36, 36, 40))
    if e == 6: col = mix(col, (120, 40, 50), .1)                                   # carpeted
    if e == 8: col = mix((40, 40, 50), col, .75)
    C = rmp(fade(col, v), 18)
    R = (X1 - X0) / 2
    d.ellipse([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
    d.arc([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], 150, 280, fill=C[4])
    if e == 6:                                                                     # the carpet's seams to the middle
        for a in np.linspace(0, 6.28, 7)[:-1]: d.line([cx, cy, cx + math.cos(a) * R, cy + math.sin(a) * R], fill=C[0])
    if e == 7 and p.w <= 1:                                                         # a portable pole: a steel base plate bolted through a mat
        S_ = rmp((170, 174, 180), 12)
        d.ellipse([cx - R * .42, cy - R * .42, cx + R * .42, cy + R * .42], fill=S_[2], outline=OUT)
        for a in (.785, 2.356, 3.927, 5.498): d.ellipse([cx + math.cos(a) * R * .3 - 1, cy + math.sin(a) * R * .3 - 1, cx + math.cos(a) * R * .3 + 1, cy + math.sin(a) * R * .3 + 1], fill=S_[0])
    elif e == 7:
        d.ellipse([cx - R * .65, cy - R * .65, cx + R * .65, cy + R * .65], fill=C[3], outline=OUT)   # the stepped podium
        for a in np.linspace(0, 6.28, 9)[:-1]: d.point((cx + math.cos(a) * (R - 2), cy + math.sin(a) * (R - 2)), fill=(255, 230, 160) if p.w % 2 else (120, 220, 255))
        if p.w >= 4:                                                                # a mirrored top step in segments, lit round its edge
            for a in np.linspace(0, 6.28, 9)[:-1]: d.line([cx + math.cos(a) * R * .3, cy + math.sin(a) * R * .3, cx + math.cos(a) * R * .65, cy + math.sin(a) * R * .65], fill=C[0])
            d.ellipse([cx - R * .65 + 2, cy - R * .65 + 2, cx + R * .65 - 2, cy + R * .65 - 2], outline=(255, 230, 160))
    if e == 8:
        fc = futc(v.get("colour", "black"), POLE_BASE)
        for q in (.4, .7): d.ellipse([cx - R * q, cy - R * q, cx + R * q, cy + R * q], outline=fc, width=2)
    if e == 8: d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=lit_of(p, col)[2])
    M = BRASS if e == 6 else (STEEL if e == 7 else rmp(lit_of(p, col)[1], 16))
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=M[1], outline=OUT)              # the flange
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=M[3]); d.point((cx - 1, cy - 1), fill=M[4])


define("dancepole", draw=dancepole, global_from=gf(1980), axes={"colour": list(POLE_BASE)}, nvar=12, front=False,
       ref="a 45 to 50 mm pole on a round base flange of about a foot (dance pole makers' specifications)")


# ================================================================ glass-fronted display fridge
FRIDGE = {"red": (190, 30, 36), "white": (232, 232, 228), "blue": (40, 80, 160), "green": (40, 120, 70), "black": (40, 40, 44), "silver": (180, 184, 190),
          "yellow": (226, 190, 40), "orange": (220, 110, 40), "teal": (30, 130, 140), "cream": (226, 214, 180), "brown": (110, 70, 46), "purple": (100, 50, 130)}


FRIDGE_GOODS = [("soda", [(190, 40, 40), (60, 40, 30), (240, 200, 60), (60, 140, 60)]), ("beer", [(120, 70, 30), (60, 100, 50), (200, 170, 80)]),
                ("milk", [(240, 240, 236), (120, 170, 220), (240, 200, 60)]), ("meat", [(176, 60, 60), (200, 120, 110), (230, 210, 200)]),
                ("cakes", [(240, 220, 200), (150, 80, 50), (230, 120, 150)]), ("water", [(170, 210, 240), (220, 236, 250)])]


def displayfridge(tm, x, y, w, h, st, v):
    """A glass-fronted display fridge in a shop or bar, its back to the wall, seen from above. Mid-Century: a chest
    cooler in the drinks maker's colour, its lid down, or lifted to show the bottles stood in iced water. Modern
    and Future Darkness: an upright cabinet with a lit header and a glass door at the front; open, the door swung out
    and the shelves of stock showing. The colour is the maker's or the shop's; the stock goes with it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    key = v.get("colour", "red"); ki = list(FRIDGE).index(key) if key in FRIDGE else 0
    col = FRIDGE.get(key, (190, 30, 36))
    if e == 8: col = mix((48, 50, 58), col, .55)
    C = rmp(fade(col, v), 16)
    gname, goods = FRIDGE_GOODS[(ki + p.w) % len(FRIDGE_GOODS)]
    shadow(tm, X0, Y0, X1, Y1, 4)
    opn = st == "open"
    if e == 6:                                                                     # a chest cooler
        d.rounded_rectangle([X0, Y0, X1, Y1], 5, fill=C[2], outline=OUT)
        d.line([X0 + 4, Y0 + 1, X1 - 4, Y0 + 1], fill=C[4]); d.line([X0 + 4, Y1 - 1, X1 - 4, Y1 - 1], fill=C[0])
        if opn:
            d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=(120, 170, 190), outline=OUT)   # iced water
            for k in range(16):
                bx = X0 + 8 + (k % 6) * (W_ - 14) // 6; by = Y0 + 8 + (k // 6) * (H_ - 14) // 3
                d.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=goods[k % len(goods)], outline=OUT); d.point((bx - 1, by - 1), fill=(240, 240, 240))
            d.rectangle([X0 + 2, Y0 - 6, X1 - 2, Y0], fill=C[3], outline=OUT)       # the lid lifted back against the wall
        else:
            d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 6], fill=C[3], outline=C[0])
            d.rectangle([X0 + 8, Y0 + (H_ // 2) - 4, X1 - 8, Y0 + (H_ // 2) + 4], fill=WHITE[3] if key != "white" else (190, 30, 36))   # the maker's name
            d.rectangle([X0 + W_ // 2 - 4, Y1 - 6, X0 + W_ // 2 + 4, Y1 - 2], fill=STEEL[3], outline=OUT)
    else:
        lidbox(d, X0, Y0, X1, Y1 - 8, C)                                           # the cabinet top
        hd = lit_of(p, col) if e == 8 else rmp(mix(col, (255, 255, 255), .5), 12)
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 10], fill=hd[3], outline=OUT)      # the lit header with the maker's name
        d.line([X0 + 6, Y0 + 6, X0 + 6 + (W_ - 12) * (.4 + .1 * (ki % 3)), Y0 + 6], fill=C[0], width=2)
        for k in range(3): d.rectangle([X0 + 6 + k * (W_ - 12) // 3, Y0 + 13, X0 + 3 + (k + 1) * (W_ - 12) // 3, Y1 - 12], fill=goods[k % len(goods)], outline=OUT)   # stock seen through the top grille
        for gy in range(Y0 + 14, Y1 - 12, 3): d.line([X0 + 4, gy, X1 - 4, gy], fill=C[1])
        if opn:
            d.rectangle([X0, Y1 - 8, X0 + 4, Y1 + W_ - 8], fill=(170, 210, 220), outline=OUT)   # the glass door swung out
            for k in range(4): d.rectangle([X0 + 6 + k * (W_ - 10) // 4, Y1 - 7, X0 + 4 + (k + 1) * (W_ - 10) // 4, Y1 - 1], fill=goods[(k + 1) % len(goods)], outline=OUT)
        else:
            d.rectangle([X0 + 1, Y1 - 8, X1 - 1, Y1], fill=(150, 196, 214), outline=OUT)   # the glass door edge, its handle
            d.line([X0 + 4, Y1 - 6, X0 + 14, Y1 - 3], fill=(240, 250, 250)); d.rectangle([X1 - 8, Y1 - 7, X1 - 5, Y1 - 1], fill=STEEL[3])
    if p.w >= 4 and e < 8: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 2], fill=STEEL[4])


define("displayfridge", draw=displayfridge, global_from=gf(1930), states=("closed", "open"), openable="cabinet", axes={"colour": list(FRIDGE)}, nvar=12, front=True, clear=2.5,
       ref="drinks chest coolers about 3 by 2 ft (Glascock and Westinghouse coolers 1930s); upright one-door merchandisers 2 1/2 to 3 ft wide")


# ================================================================ swimming starting block
BLOCK_TOP = {"white": (232, 232, 228), "blue": (40, 90, 170), "red": (180, 40, 40), "yellow": (226, 190, 40), "green": (40, 140, 80), "black": (40, 40, 44),
             "orange": (220, 110, 40), "grey": (140, 144, 150), "navy": (30, 44, 90), "teal": (30, 140, 150), "sand": (210, 190, 150), "purple": (100, 60, 150),
             "pink": (230, 130, 170), "lime": (160, 210, 50)}


def divingblock(tm, x, y, w, h, st, v):
    """A swimming starting block at the end of a lane, seen from above, the pool to the south: the sloping top with
    its gritted face and the lane number, the grab edge at the front, the backstroke handles, the post under it and
    the pool's edge and gutter. Mid-Century: a cast concrete or timber block with a painted number. Modern: a moulded
    top on a steel post with a kick plate and backstroke bars. Future Darkness: a dark composite block with a lit
    number and a timing light. The top's colour is the pool's."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    key = v.get("colour", "white"); ki = list(BLOCK_TOP).index(key) if key in BLOCK_TOP else 0
    col = BLOCK_TOP.get(key, (232, 232, 228))
    if e == 6: col = mix(col, (180, 176, 166), .15)
    if e == 8: col = mix((46, 48, 56), col, .75)
    C = rmp(fade(col, v), 16)
    d.rectangle([X0, Y1 - 8, X1, Y1], fill=(70, 150, 190), outline=OUT)            # the water and the gutter
    d.line([X0 + 3, Y1 - 4, X0 + 10, Y1 - 3], fill=(200, 236, 250)); d.line([X1 - 12, Y1 - 3, X1 - 5, Y1 - 4], fill=(200, 236, 250))
    d.rectangle([X0, Y1 - 12, X1, Y1 - 8], fill=(220, 220, 214) if e != 8 else (70, 72, 80), outline=OUT)   # the pool edge
    shadow(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 12, 3)
    if e == 6: d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y1 - 12], fill=[(170, 166, 156), (150, 110, 70), (200, 190, 170)][ki % 3] if p.w <= 3 else (150, 110, 70), outline=OUT)   # concrete, timber or tiled block
    else:
        d.rectangle([cx - 4, Y0 + 6, cx + 4, Y1 - 12], fill=STEEL[2], outline=OUT)   # the post
    d.polygon([(X0 + 4, Y0 + 3), (X1 - 4, Y0 + 3), (X1 - 2, Y1 - 14), (X0 + 2, Y1 - 14)], fill=C[2], outline=OUT)   # the sloping top
    d.line([X0 + 5, Y0 + 4, X1 - 5, Y0 + 4], fill=C[4])
    for gy in range(Y0 + 8, Y1 - 15, 3): d.line([X0 + 6, gy, X1 - 6, gy], fill=C[1])   # the gritted face
    num = str(1 + (ki + p.w) % 8)
    nc = (20, 20, 24) if sum(col) > 360 else (240, 240, 236)
    if e == 8: nc = lit_of(p, col)[3]
    ny = Y0 + (H_ - 14) // 2 - 4
    segs = {"1": [(2, 0, 2, 8)], "2": [(0, 0, 4, 0), (4, 0, 4, 4), (0, 4, 4, 4), (0, 4, 0, 8), (0, 8, 4, 8)], "3": [(0, 0, 4, 0), (4, 0, 4, 8), (0, 4, 4, 4), (0, 8, 4, 8)],
            "4": [(0, 0, 0, 4), (0, 4, 4, 4), (4, 0, 4, 8)], "5": [(4, 0, 0, 0), (0, 0, 0, 4), (0, 4, 4, 4), (4, 4, 4, 8), (4, 8, 0, 8)],
            "6": [(4, 0, 0, 0), (0, 0, 0, 8), (0, 8, 4, 8), (4, 8, 4, 4), (4, 4, 0, 4)], "7": [(0, 0, 4, 0), (4, 0, 2, 8)], "8": [(0, 0, 4, 0), (0, 0, 0, 8), (4, 0, 4, 8), (0, 4, 4, 4), (0, 8, 4, 8)]}[num]
    d.rectangle([cx - 5, ny - 2, cx + 5, ny + 10], fill=C[0] if e != 6 else mix(col, (20, 20, 20), .2))
    for a, b, c_, e_ in segs: d.line([cx - 2 + a, ny + b, cx - 2 + c_, ny + e_], fill=nc, width=2)
    if e >= 7:
        for hx in (X0 + 2, X1 - 4): d.rectangle([hx, Y0 + 6, hx + 2, Y1 - 16], fill=STEEL[3], outline=OUT)   # backstroke handles
        d.rectangle([X0 + 6, Y0, X1 - 6, Y0 + 3], fill=C[1], outline=OUT)            # the kick plate behind
    if e == 8: d.rectangle([X1 - 8, Y0 + 2, X1 - 4, Y0 + 6], fill=(240, 60, 60) if p.w % 2 else (60, 240, 120))
    if p.w >= 5 and e < 8: d.rectangle([X0 + 2, Y1 - 12, X1 - 2, Y1 - 10], fill=GOLD[3])


define("divingblock", draw=divingblock, global_from=gf(1936), axes={"colour": list(BLOCK_TOP)}, nvar=14, front=True, clear=2,
       ref="starting platforms with a top about 20 by 20 in, 2 ft above the water (FINA facilities rules; Berlin 1936 blocks)")


# ================================================================ giant spider's egg sac
SILK = {"white": (232, 230, 222), "cream": (226, 212, 176), "grey": (170, 172, 168), "ochre": (196, 160, 96), "green": (170, 186, 140), "brown": (150, 120, 90)}


def eggsac(tm, x, y, w, h, st, v):
    """A giant spider's egg sac on the floor of a tunnel, cellar, crypt or wood, seen from above: a fat lens of layered
    silk, the round eggs pressing through it, guy lines of web spun out to whatever lies about and holding it down.
    The floor and the litter in the web are the place's: its earth, straw and bones in the old ages, rags, paper,
    bottles, plastic bags and cable later on. The rich house's cellar gives it broken furniture and cloth to anchor
    to, the poor one straw, dung and scraps of the land's wood; by region the rubbish is board scraps, sticks of cane
    or bone, or pot shards. Its silk colour is the spider's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    W_, H_ = X1 - X0, Y1 - Y0
    S = rmp(fade(et(SILK.get(v.get("colour", "white"), (232, 230, 222)), e, .15), v), 12)
    G = rmp(mix(p.ground[2] if e <= 3 else mix(p.stone[2], p.ground[2], .4), ERA_TONE[e][2], .45), 12)   # the floor of its age
    ground(tm, X0, Y0, X1, Y1, G, rng)                                             # the floor it is spun on
    if e == 1:                                                                     # a cut tunnel's rough flags
        for k in range(1, 3): d.line([X0, Y0 + k * H_ // 3, X1, Y0 + k * H_ // 3 + 4], fill=G[0], width=2); d.line([X0 + k * W_ // 3, Y0, X0 + k * W_ // 3 - 5, Y1], fill=G[0], width=2)
    elif e == 2: [d.line([X0 + k * W_ // 6, Y0, X0 + k * W_ // 6, Y1], fill=G[0]) for k in range(1, 6)]   # boards
    elif e == 3: [d.line([X0, Y0 + k * H_ // 2, X1, Y0 + k * H_ // 2], fill=G[0], width=2) or d.line([X0 + k * W_ // 2, Y0, X0 + k * W_ // 2, Y1], fill=G[0], width=2) for k in (1,)]   # great flags
    elif e == 4: [d.line([X0, Y0 + k * H_ // 8, X1, Y0 + k * H_ // 8], fill=G[0]) for k in range(1, 8)]   # brick courses
    elif e == 5: d.rectangle([X0, cy + H_ * .38, X1, cy + H_ * .44], fill=G[0])      # a drain channel along the floor
    elif e == 6: [d.line([X0 + k * W_ // 7, Y0, X0 + k * W_ // 7, Y1], fill=G[4]) or d.line([X0, Y0 + k * H_ // 7, X1, Y0 + k * H_ // 7], fill=G[4]) for k in range(1, 7)]   # tiles
    elif e == 7: d.line([X0, Y1 - 4, X1, Y0 + H_ * .6], fill=(30, 30, 34), width=3)   # a cable run across
    elif e == 8: [d.line([X0, Y0 + k * 4, X1, Y0 + k * 4], fill=G[0]) for k in range(1, H_ // 4)]   # a floor grating
    litter = {0: [(176, 150, 90), (226, 218, 196)], 1: [(120, 110, 96), (226, 218, 196)], 2: [(150, 96, 60), (176, 150, 90)], 3: [(226, 216, 190), (150, 96, 60)],
              4: [(60, 50, 50), (226, 216, 190)], 5: [(150, 156, 160), (200, 196, 180)], 6: [(60, 120, 70), (200, 196, 180)], 7: [(220, 220, 230), (40, 90, 180)],
              8: [(40, 40, 44), (200, 120, 60)]}[e]
    if p.w >= 3: litter = [mix(p.acc[2], p.wood[2], .3), p.cloth[2]]               # broken furniture and good cloth
    if p.w < 3: litter = [litter[0], mix(litter[1], p.wood[2], .5)]               # scraps of the land's own wood among the rubbish
    form = list(STY).index(p.st) % 3 if p.st in STY else 0                           # what lies about there: scraps, sticks of cane or bone, or pot shards
    for k in range(5):                                                             # what the guy lines hold to
        a = k * 1.256 + .3 + e * .7; lx, ly = cx + math.cos(a) * W_ * .4, cy + math.sin(a) * H_ * .4; c = litter[k % 2]
        if form == 1: d.line([lx - 6 * math.sin(a), ly + 6 * math.cos(a), lx + 6 * math.sin(a), ly - 6 * math.cos(a)], fill=OUT, width=5); d.line([lx - 5 * math.sin(a), ly + 5 * math.cos(a), lx + 5 * math.sin(a), ly - 5 * math.cos(a)], fill=c, width=3)
        elif form == 2: d.pieslice([lx - 5, ly - 5, lx + 5, ly + 5], math.degrees(a) + 90, math.degrees(a) + 270, fill=c, outline=OUT)
        else: d.polygon([(lx - 4, ly - 3), (lx + 4, ly - 2), (lx + 3, ly + 3), (lx - 3, ly + 3)], fill=c, outline=OUT)
    for a in np.linspace(e * .7, 6.28 + e * .7, 13)[:-1]:                           # guy lines of web
        d.line([cx + math.cos(a) * W_ * .22, cy + math.sin(a) * H_ * .22, cx + math.cos(a + .1) * W_ * .48, cy + math.sin(a + .1) * H_ * .48], fill=S[3])
    for r in (.42, .32):
        d.arc([cx - W_ * r, cy - H_ * r, cx + W_ * r, cy + H_ * r], 0, 360, fill=S[2])
    shadow(tm, cx - W_ * .3, cy - H_ * .26, cx + W_ * .3, cy + H_ * .3, 3, kind="ellipse")
    rx, ry = W_ * .3, H_ * .26
    blob(d, cx - rx, cy - ry, cx + rx, cy + ry, S, out=S[0])
    for k in range(9):                                                        # eggs pressing through the silk
        a = k * 2.4; q = .25 + .45 * ((k * 5) % 9) / 9; ex, ey = cx + math.cos(a) * rx * q, cy + math.sin(a) * ry * q
        d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=S[3], outline=S[1]); d.point((ex - 1, ey - 1), fill=S[4])
    for k in range(3): d.arc([cx - rx + 3 + k * 3, cy - ry + 2 + k * 2, cx + rx - 3 - k * 3, cy + ry - 2 - k * 2], 200 + k * 30, 320 + k * 30, fill=S[4])   # silk wraps


define("eggsac", draw=eggsac, axes={"colour": list(SILK)}, low=True,
       ref="a sac about 3 ft across with its web: the giant spiders of the World of Darkness bestiaries, scaled from a bus-sized spider")


# ================================================================ emergency eyewash and shower
SAFETY = {"green": (40, 150, 70), "yellow": (230, 196, 30), "steel": (180, 184, 190), "orange": (226, 120, 30), "white": (232, 232, 228), "red": (190, 40, 40),
          "blue": (40, 100, 180), "lime": (150, 200, 40), "grey": (120, 124, 130), "black": (44, 44, 48), "teal": (30, 140, 140), "cream": (220, 210, 170),
          "purple": (110, 60, 150), "brown": (120, 76, 46)}


def eyewash(tm, x, y, w, h, st, v):
    """An emergency eyewash and drench shower on a laboratory or factory wall, seen from above: the shower head a
    wide dish on its arm out from the wall, the eyewash bowl below it with its two spray caps, the push paddle and
    the pull rod, the drain grate on the floor and the sign on the wall. Mid-Century: galvanized pipe and a chained
    pull ring. Modern: safety-yellow or green pipework, a plastic bowl and a sign. Future Darkness: a dark unit with
    a lit ring and a sensor plate. The colour is the maker's safety paint."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    key = v.get("colour", "green"); ki = list(SAFETY).index(key) if key in SAFETY else 0
    col = SAFETY.get(key, (40, 150, 70))
    if e == 6: col = mix(col, (170, 174, 170), .35)
    if e == 8: col = mix((46, 48, 56), col, .8)
    C = rmp(fade(col, v), 18)
    d.rectangle([X0 + 2, Y0 + H_ * .45, X1 - 2, Y1], fill=(150, 154, 156) if e < 8 else mix((60, 62, 70), futc(key, SAFETY), .35), outline=OUT)   # the floor drain plate
    for gx in range(X0 + 5, X1 - 3, 4): d.line([gx, Y0 + H_ * .45 + 2, gx, Y1 - 2], fill=(90, 94, 98) if e < 8 else (40, 42, 48))
    lay = ki % 3
    sg = [(40, 150, 70), (240, 240, 236), C[3]][lay]
    d.rectangle([X0, Y0, X1, Y0 + 6], fill=C[1], outline=OUT); d.rectangle([X0 + 4, Y0 + 1, X0 + 16, Y0 + 5], fill=sg, outline=OUT)   # the wall pipe and its sign
    d.line([cx, Y0 + 6, cx, Y0 + H_ * .3], fill=OUT, width=5); d.line([cx, Y0 + 6, cx, Y0 + H_ * .3], fill=C[3], width=3)
    shadow(tm, cx - W_ * .36, Y0 + H_ * .2, cx + W_ * .36, Y0 + H_ * .9, 3, kind="ellipse")
    r = W_ * .36; sy = Y0 + H_ * .55
    d.ellipse([cx - r, sy - r, cx + r, sy + r], fill=C[2], outline=OUT)              # the shower dish
    d.arc([cx - r + 2, sy - r + 2, cx + r - 2, sy + r - 2], 150, 280, fill=C[4], width=2)
    for k in range(10): a = k * .628; d.point((cx + math.cos(a) * r * .55, sy + math.sin(a) * r * .55), fill=C[0])
    bw = r * .55                                                                   # the eyewash bowl showing under its rim
    d.ellipse([cx - bw, sy - bw * .6, cx + bw, sy + bw * .6], fill=C[3] if e != 7 else (240, 200, 40), outline=OUT)
    for sx in (-1, 1): d.ellipse([cx + sx * bw * .45 - 2, sy - 2, cx + sx * bw * .45 + 2, sy + 2], fill=(220, 60, 40) if e >= 7 else STEEL[3], outline=OUT)
    if e == 6: d.line([X1 - 6, Y0 + 6, X1 - 6, Y0 + H_ * .7], fill=STEEL[3]); d.ellipse([X1 - 9, Y0 + H_ * .7, X1 - 3, Y0 + H_ * .7 + 6], outline=STEEL[4], width=2)   # the pull ring
    elif e == 7: d.line([X1 - 6, Y0 + 6, X1 - 6, Y0 + H_ * .75], fill=C[0], width=3); d.rectangle([X1 - 9, Y0 + H_ * .75, X1 - 3, Y0 + H_ * .75 + 4], fill=C[3], outline=OUT)
    else: d.ellipse([cx - r - 1, sy - r - 1, cx + r + 1, sy + r + 1], outline=lit_of(p, col)[2]); d.rectangle([X1 - 8, Y0 + 8, X1 - 3, Y0 + 13], fill=lit_of(p, col)[3])


define("eyewash", draw=eyewash, global_from=gf(1970), axes={"colour": list(SAFETY)}, nvar=14, front=True, clear=3,
       ref="combination drench shower and eyewash units with a 10 in head and a bowl about 2 1/2 ft from the wall (ANSI Z358.1, 1981)")


# ================================================================ fermenting vat or tub
FERMENT = {"wine": (110, 30, 60), "beer": (176, 120, 40), "cider": (214, 176, 80), "mead": (220, 170, 60), "kraut": (196, 200, 140), "palm": (226, 220, 200),
           "stout": (50, 34, 28), "kimchi": (190, 60, 40), "kumis": (214, 214, 200), "chicha": (220, 160, 120), "sake": (230, 226, 206), "toddy": (200, 190, 150),
           "pickle": (120, 150, 70), "vinegar": (150, 90, 50)}
# what each land ferments in its tubs: its everyday brew and a second one
BREWS = {"central": ("beer", "kraut"), "atlantic": ("stout", "cider"), "northern": ("mead", "beer"), "mediterranean": ("wine", "vinegar"),
         "islamic": ("pickle", "vinegar"), "steppe": ("kumis", "beer"), "southasia": ("toddy", "pickle"), "eastasia": ("kimchi", "sake"),
         "seasia": ("toddy", "vinegar"), "africa": ("palm", "beer"), "americas": ("chicha", "wine"), "oceania": ("toddy", "palm"), "polar": ("kumis", "pickle")}


def fermenter(tm, x, y, w, h, st, v):
    """A vat or tub of something fermenting, seen from above, its lid off: the staves and hoops of a wooden tub, or a
    clay jar, a calabash or a cedar vat by region, with the brew working in it under its foam: red wine must, amber
    wort, cider, mead, a crock of kraut or kimchi under its weight stone, white palm wine. Dark Ages to Age of Reason:
    a coopered tub or a clay jar (a big earthenware jar in East Asia, the Islamic world, Africa and the Americas).
    Victorian: an oak vat with iron hoops and a thermometer. Great War: a slate or copper-lined square. Mid-Century:
    a stainless tank, though East Asia, South Asia, the islands and Africa keep the earthenware jar for kimchi,
    toddy and beer into the Modern age. Modern: a plastic fermenting bin with an airlock or a stainless cone. Future Darkness: a sealed
    composite tank with a lit gauge."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = (X1 - X0) / 2 * (.8 if p.w <= 1 else .92 if p.w <= 3 else 1)
    clay = p.st in ("eastasia", "islamic", "africa", "americas", "southasia", "seasia", "oceania") and e <= 5 or p.st in ("eastasia", "africa", "southasia", "seasia") and e in (6, 7)   # earthenware still used for kimchi, beer and toddy
    brew = BREWS.get(p.st, ("beer", "wine"))[0 if v.get("contents", "everyday") == "everyday" else 1]
    if brew == "kimchi": brew = "kraut" if v.get("contents") == "second" else "kimchi"
    B = rmp(et(FERMENT.get(brew, (176, 120, 40)), e, .12 if e != 1 else .3), 14)
    shadow(tm, cx - R, cy - R, cx + R, cy + R, 4, kind="ellipse" if e != 5 else "rect")
    if e == 5:                                                                     # a slate or copper-lined square
        M = rmp(mix((80, 84, 90), COPPER[2], .5 if p.w >= 2 else 0), 14)
        lidbox(d, cx - R, cy - R, cx + R, cy + R, M)
        d.rectangle([cx - R + 5, cy - R + 5, cx + R - 5, cy + R - 5], fill=B[1], outline=OUT); inner = (cx - R + 5, cy - R + 5, cx + R - 5, cy + R - 5); rect = True
    else:
        rect = False
        if clay and e != 4: M = rmp(et(p.stone[2] if p.st != "eastasia" else (120, 80, 50), e, .15), 14)   # an earthenware jar, glazed brown in East Asia
        elif e <= 4: M = rmp(et(p.wood[2], e, .25), 16)
        elif e == 6: M = STEEL
        elif e == 7: M = rmp((226, 226, 220) if p.w <= 2 else (190, 196, 202), 10)
        else: M = rmp(mix((50, 54, 62), p.acc[2], .3), 12)
        if e <= 4 and clay and e == 4: M = rmp(mix(p.stone[2], (150, 90, 60), .3), 14)
        if e == 1: M = rmp(mix(M[2], (60, 50, 44), .35), 14)                     # sooted and grimed
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=M[2], outline=OUT)
        if e <= 4 and not clay:                                                    # staves and hoops
            for a in np.linspace(0, 6.28, 19)[:-1]: d.line([cx + math.cos(a) * R * .8, cy + math.sin(a) * R * .8, cx + math.cos(a) * R, cy + math.sin(a) * R], fill=M[0])
            hc = IRON[3] if (e >= 3 or p.w >= 2) else rmp((150, 120, 70), 14)[2]
            d.ellipse([cx - R + 1, cy - R + 1, cx + R - 1, cy + R - 1], outline=hc, width=2)
        else: d.arc([cx - R + 2, cy - R + 2, cx + R - 2, cy + R - 2], 150, 280, fill=M[4], width=2)
        ri = R * (.78 if not clay or e == 4 else .6)
        inner = (cx - ri, cy - ri, cx + ri, cy + ri)
        d.ellipse(inner, fill=B[1], outline=OUT)
    if brew in ("kraut", "kimchi", "pickle"):                                                            # a board and a weight stone on the kraut
        d.ellipse([cx - R * .4, cy - R * .4, cx + R * .4, cy + R * .4], fill=p.wood[3], outline=OUT); blob(d, cx - 6, cy - 5, cx + 6, cy + 6, p.stone)
    else:                                                                          # the foam working on it
        for k in range(12):
            a = rng.uniform(0, 6.28); q = rng.uniform(0, .6) * (inner[2] - inner[0]) / 2
            fx, fy = cx + math.cos(a) * q, cy + math.sin(a) * q; s_ = rng.integers(2, 5)
            d.ellipse([fx - s_, fy - s_, fx + s_, fy + s_], fill=B[4] if brew not in ("wine",) else (176, 110, 140))
    if e == 3:                                                                     # the Age of Reason's half-lid of boards, drawn back
        d.pieslice([cx - R * .95, cy - R * .95, cx + R * .95, cy + R * .95], 180, 360, fill=rmp(p.wood[2])[3], outline=OUT)
        for k in (-.5, 0, .5): d.line([cx + k * R, cy - R * .9 * math.sqrt(1 - k * k), cx + k * R, cy], fill=rmp(p.wood[2])[1])
    if (e == 4 or e == 6) and not clay: d.rectangle([cx + R * .5, cy - R * .9, cx + R * .5 + 3, cy - R * .3], fill=WHITE[3], outline=OUT)   # a thermometer hung in it
    if e == 7 and not clay: d.ellipse([cx - 4, cy - R + 2, cx + 4, cy - R + 10], fill=(220, 220, 214), outline=OUT)   # the airlock in the lid rim
    if e == 8: d.arc([cx - R + 1, cy - R + 1, cx + R - 1, cy + R - 1], 200, 340, fill=lit_of(p)[2], width=2)
    if p.w >= 4 and e <= 4: d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=BRASS[3], width=2)   # brass-bound


define("fermenter", draw=fermenter, axes={"contents": ["everyday", "second"]},
       ref="fermenting tubs and vats 2 1/2 to 3 1/2 ft across (brewing tubs in medieval inventories; onggi kimchi jars; 30-gallon fermenting bins)")


# ================================================================ fire barrel
DRUM = {"rust": (140, 76, 40), "red": (170, 40, 36), "blue": (40, 80, 150), "black": (44, 44, 48), "green": (50, 110, 60), "yellow": (210, 176, 40),
        "grey": (130, 134, 140), "white": (220, 220, 214), "orange": (210, 110, 40), "olive": (96, 96, 56), "teal": (30, 120, 130), "brown": (110, 70, 46),
        "purple": (100, 50, 130), "pink": (220, 120, 160), "lime": (150, 200, 50), "navy": (30, 40, 90)}


def firebarrel(tm, x, y, w, h, st, v):
    """An oil drum burning rubbish in an alley or camp, seen from above: the rolled rim, the punched air holes round
    its side showing as a ring of dots, the fire in its mouth (lit) or a crust of ash and charred scraps (out).
    Mid-Century: a ribbed steel drum. Modern: the same drum sprayed with tags.
    Future Darkness: a drum burning scrap electronics, its smoke green-tinged. The paint is the drum's maker's or
    what is left of it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    key = v.get("colour", "rust"); ki = list(DRUM).index(key) if key in DRUM else 0
    col = mix(DRUM.get(key, (140, 76, 40)), (140, 76, 40), .25 if p.w == 0 else 0)
    if e == 8: col = mix(col, (60, 64, 72), .1)
    C = rmp(fade(col, v), 16)
    R = (X1 - X0) / 2 * .9
    shadow(tm, cx - R, cy - R, cx + R, cy + R, 3, kind="ellipse")
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=C[2], outline=OUT)
    d.arc([cx - R + 1, cy - R + 1, cx + R - 1, cy + R - 1], 150, 280, fill=C[4], width=2)
    for a in np.linspace(0, 6.28, 13)[:-1]: d.rectangle([cx + math.cos(a) * R * .88 - 1, cy + math.sin(a) * R * .88 - 1, cx + math.cos(a) * R * .88 + 1, cy + math.sin(a) * R * .88 + 1], fill=(20, 16, 16) if st != "lit" else (250, 160, 50))
    ri = R * .4
    if e == 6: d.ellipse([cx - R * .82, cy - R * .82, cx + R * .82, cy + R * .82], outline=C[0])   # the rib
    if st == "lit":
        d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(40, 16, 12))
        tm.fire(cx, cy, int(ri * .85), int(ri * .7), seed=int(tm.rng.integers(0, 99)))
        tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 160, None)]
        if e == 8: d.arc([cx - ri, cy - ri, cx + ri, cy + ri], 200, 300, fill=(90, 200, 120), width=2)
    else:
        d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(70, 66, 64), outline=OUT)
        for k in range(6): a = k * 1.05; d.rectangle([cx + math.cos(a) * ri * .5 - 2, cy + math.sin(a) * ri * .5 - 1, cx + math.cos(a) * ri * .5 + 2, cy + math.sin(a) * ri * .5 + 1], fill=(30, 26, 26))
    if e == 7:                                                                     # a tag sprayed across the rim
        tc = [(220, 40, 120), (40, 200, 220), (240, 220, 40)][ki % 3]; d.ellipse([cx - R * .97, cy - R * .97, cx + R * .97, cy + R * .97], outline=tc, width=3)   # a sprayed band
    if e == 8:
        d.rectangle([X0, Y1 - 6, X0 + 8, Y1], fill=(40, 120, 60), outline=OUT)      # a scrap circuit board
        bc = list(DRUM.values())[(ki * 5 + 3) % len(DRUM)]                         # a printed hazard band in a second colour
        d.arc([cx - R * .78, cy - R * .78, cx + R * .78, cy + R * .78], 0, 360, fill=bc, width=4)


define("firebarrel", draw=firebarrel, global_from=gf(1920), states=("lit", "out"), light={"dim": 4, "bright": 1.5, "color": "#ff9a40", "kind": "fire"},
       axes={"colour": list(DRUM)}, nvar=16, ref="a 55-gallon (200 litre) drum 23 in across (ISO 15750; API drums from the 1920s)")


# ================================================================ flag on a stand
FLAGS = {"tricolour-v": [(230, 120, 30), (240, 240, 236), (230, 120, 30)], "tricolour-h": [(30, 30, 30), (200, 30, 30), (230, 190, 40)],
         "green-white": [(30, 120, 60), (240, 240, 236), (30, 120, 60)], "red-star": [(40, 40, 44), (200, 30, 36), (240, 200, 40)],
         "blue-cross": [(30, 70, 150), (240, 240, 236), (30, 70, 150)], "red-cross": [(240, 240, 236), (200, 30, 40), (240, 240, 236)],
         "crescent": [(190, 30, 40), (190, 30, 40), (240, 240, 236)], "sun": [(240, 200, 60), (200, 30, 40), (240, 200, 60)],
         "stripes": [(190, 30, 40), (240, 240, 236), (30, 50, 120)], "orange-green": [(230, 130, 40), (240, 240, 236), (30, 130, 70)],
         "purple-gold": [(100, 40, 120), (220, 180, 60), (100, 40, 120)], "sky-blue": [(110, 170, 220), (240, 240, 236), (110, 170, 220)]}


def flagstand(tm, x, y, w, h, st, v):
    """A flag on a floor stand in a courtroom, office, hall or chapel, seen from above: the weighted round base at the
    north, the pole's finial at its middle, and the flag hanging from the pole top and spreading in folds toward
    the south, its pattern showing down the drape (generic stripes, crosses, stars and crescents, never a
    real state's arms). Age of Reason: a turned wooden base and a spear finial on a silk flag. Victorian: a mahogany
    base, a brass ball or spread eagle and a gold fringe. Great War: a faded regimental colour on a brass-shod pole.
    Mid-Century: a chrome base and a bright nylon flag. Modern: a gold-fringed flag on a gilt stand. Future
    Darkness: a dark base with a lit ring and a flag with a lit edge."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    key = v.get("colour", "tricolour-v"); F = FLAGS.get(key, FLAGS["tricolour-v"]); ki = list(FLAGS).index(key) if key in FLAGS else 0
    age = {3: ((230, 220, 190), .15), 4: ((60, 30, 30), .12), 5: ((150, 140, 100), .35), 6: ((255, 255, 255), .05), 7: ((255, 255, 255), 0), 8: ((40, 44, 56), .35)}[e]
    F = [fade(mix(c, age[0], age[1]), v) for c in F]
    base = {3: (120, 80, 50), 4: (96, 50, 34), 5: (150, 120, 70), 6: (200, 204, 210), 7: (200, 170, 70), 8: (46, 48, 56)}[e]
    Bc = rmp(base, 16); R = W_ * .2
    bx, by = (X0 + X1) // 2, Y0 + R + 1                                             # the stand at the north, the flag hanging down to the south
    shadow(tm, bx - R, by - R, bx + R, by + R, 3, kind="ellipse")
    d.ellipse([bx - R, by - R, bx + R, by + R], fill=Bc[2], outline=OUT); d.arc([bx - R + 1, by - R + 1, bx + R - 1, by + R - 1], 150, 280, fill=Bc[4], width=2)
    if e == 8: d.ellipse([bx - R - 1, by - R - 1, bx + R + 1, by + R + 1], outline=lit_of(p)[2])
    poly = [(bx - W_ * .18, by + 2), (bx + W_ * .18, by + 2), (X1 - 2, Y1 - 2), (X0 + 2, Y1 - 2)]
    shadow(tm, X0 + 2, by, X1 - 2, Y1, 3)
    d.polygon(poly, fill=F[0], outline=OUT)
    def q(a, b):                                                                  # the pattern, laid on the spreading drape
        yy = by + 3 + (Y1 - 3 - by - 3) * b; hw = W_ * .18 + (W_ / 2 - 3 - W_ * .18) * b
        return (bx - hw + 2 * hw * a, yy)
    kind = ki % 4
    if kind == 0:                                                                 # vertical bands
        d.polygon([q(.34, 0), q(.67, 0), q(.67, 1), q(.34, 1)], fill=F[1])         # a triband, its outer bands alike
    elif kind == 1:                                                               # horizontal bands
        d.polygon([q(0, .34), q(1, .34), q(1, .67), q(0, .67)], fill=F[1]); d.polygon([q(0, .67), q(1, .67), q(1, 1), q(.1, 1)], fill=F[2])
    elif kind == 2:                                                               # a cross
        d.polygon([q(.42, 0), q(.58, 0), q(.58, 1), q(.42, 1)], fill=F[1]); d.polygon([q(0, .42), q(1, .42), q(1, .58), q(0, .58)], fill=F[1])
    else:                                                                         # a canton with its star or crescent
        d.polygon([q(.3, 0), q(.7, 0), q(.7, .45), q(.3, .45)], fill=F[1]); c = q(.5, .22)
        d.ellipse([c[0] - 4, c[1] - 4, c[0] + 4, c[1] + 4], fill=F[2])
        for k in range(3): d.line([*q(0, .55 + k * .15), *q(1, .55 + k * .15)], fill=F[2], width=2)
    for a_ in (.25, .75): d.line([*q(a_, .05), *q(a_, .97)], fill=tone(F[0], -50))   # the folds
    if e in (4, 5, 7) or p.w >= 5: d.line([X0 + 3, Y1 - 2, X1 - 3, Y1 - 2], fill=GOLD[3], width=2)   # a gold fringe
    if e == 8: d.line([X0 + 3, Y1 - 2, X1 - 3, Y1 - 2], fill=lit_of(p)[2], width=2)
    fc = {3: IRON, 4: BRASS, 5: BRASS, 6: STEEL, 7: GOLD, 8: rmp(lit_of(p)[1], 14)}[e]
    if e == 3: d.polygon([(bx, by - 5), (bx + 3, by), (bx, by + 5), (bx - 3, by)], fill=fc[3], outline=OUT)   # spear finial
    elif e == 4 and p.w >= 4: d.polygon([(bx - 6, by - 2), (bx, by - 5), (bx + 6, by - 2), (bx, by + 3)], fill=fc[3], outline=OUT)   # a spread eagle
    else: d.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=fc[3], outline=OUT)


define("flagstand", draw=flagstand, global_from=gf(1800), axes={"colour": list(FLAGS)}, nvar=12, front=True, clear=1,
       ref="indoor flags of 3 by 5 ft on an 8 ft pole in a weighted floor stand about 1 1/2 ft across (flag makers' indoor sets)")


# ================================================================ flax brake and scutching board
FLAX = {"green": (150, 160, 70), "retted": (150, 140, 120), "broken": (196, 180, 130), "fibre": (220, 206, 160)}


def flaxbrake(tm, x, y, w, h, st, v):
    """A flax brake with its scutching board in a barn or farmyard, seen from above: the long trough of blades on its
    legs, the hinged beater blade lying in it with its handle at the east, a handful of flax laid across the brake,
    the upright scutching board with its slot at the west end, and the broken shives littering the floor. The flax
    is green, retted grey, broken, or dressed to pale fibre. Dark Ages: an adzed log trough. Long Night: pegged. Renaissance: a jointed frame with a turned knob. Age of Reason: the timber painted in the region's colour, a
    hand notch and a curved grip. Victorian: an iron-shod blade and an iron ring. Great War: a T-bar and bolted
    brackets. The lands differ in the brake's build: three trough blades in Central Europe and the Americas,
    two with pegged cross bars in the Atlantic lands and the Mediterranean, four in the North. Great War: a frame with a bolted iron jaw. Mid-Century: a small hand-cranked fluted-roller brake.
    The rich farm's is larger and kept in good paint."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    ground(tm, X0, Y0, X1, Y1, p.ground, rng, "rect")                            # the trodden barn floor or yard under it
    W = rmp(et(p.wood[2], e, .15), 16)
    if e == 3 or p.w >= 2: W = rmp(mix(W[2], p.acc[2], .55 if (e == 3 or p.w >= 3) else .35))
    if e == 1: W = rmp(mix(W[2], (70, 60, 50), .3))
    fl = rmp(FLAX.get(v.get("contents", "retted"), (150, 140, 120)), 14)
    for k in range(18):                                                            # shives on the floor
        sx, sy = rng.uniform(X0, X1 - 4), rng.uniform(Y0, Y1 - 2); d.line([sx, sy, sx + 3, sy + 1], fill=fl[3] if k % 2 else fl[1])
    sbx = X0 + int(W_ * .18)                                                       # the scutching board at the west
    SB = rmp(mix(W[2], (190, 170, 130), .25))
    if e == 2: d.rectangle([X0 + 1, Y0 + 1, sbx + 2, Y0 + 7], fill=SB[1], outline=OUT); d.rectangle([X0 + 1, Y1 - 7, sbx + 2, Y1 - 1], fill=SB[1], outline=OUT)   # a jointed foot at each end
    lidbox(d, X0 + 2, Y0 + 2, sbx, Y1 - 2, SB)
    if e == 3: d.pieslice([X0 + 4, cy - 8, sbx - 2, cy + 8], 90, 270, fill=SHADE_CLR)   # a rounded notch for the hand
    else: d.rectangle([X0 + 5, cy - 3, sbx - 4, cy + 3], fill=SHADE_CLR)
    if e == 1:
        for py_ in (Y0 + 6, Y1 - 6): d.ellipse([(X0 + sbx) // 2 - 2, py_ - 2, (X0 + sbx) // 2 + 2, py_ + 2], fill=SB[0])   # pegs through it
    if e == 4: d.rectangle([sbx - 3, Y0 + 3, sbx - 1, Y1 - 3], fill=IRON[3])        # an iron-shod edge
    if e == 5:
        for by in (Y0 + 4, Y1 - 10): d.rectangle([X0 + 3, by, sbx - 1, by + 6], fill=IRON[2], outline=OUT); rivet(tm, (X0 + sbx) // 2, by + 3)   # bolted brackets
    bx0 = sbx + 6
    shadow(tm, bx0, Y0 + 4, X1, Y1 - 2, 3)
    if e == 6:                                                                     # a hand-cranked roller brake
        d.rectangle([bx0, Y0 + 3, X1 - 2, Y1 - 3], fill=W[2], outline=OUT)
        for k in range(3):
            rx = bx0 + 10 + k * (X1 - bx0 - 20) // 3; d.rectangle([rx, Y0 + 5, rx + 12, Y1 - 5], fill=IRON[2], outline=OUT)
            for gy in range(Y0 + 7, Y1 - 6, 3): d.line([rx + 1, gy, rx + 11, gy], fill=IRON[4])
        d.line([X1 - 6, cy, X1 - 2, Y0 + 3], fill=IRON[3], width=3)
    else:
        d.rectangle([bx0, Y0 + 5, X1 - 2, Y1 - 5], fill=W[1], outline=OUT)          # the trough
        nb = {"central": 3, "atlantic": 2, "northern": 4, "mediterranean": 2, "americas": 3}.get(p.st, 3)   # the land's count of trough blades
        for k in range(nb):
            gy = Y0 + 8 + (Y1 - Y0 - 16) * k // max(1, nb - 1) if nb > 1 else cy
            d.line([bx0 + 2, gy, X1 - 8, gy], fill=W[0], width=2)
        if p.st in ("atlantic", "mediterranean"):                                   # a pair of cross bars pegged over the trough
            for qx in (bx0 + (X1 - bx0) // 4, bx0 + (X1 - bx0) * 3 // 4): d.rectangle([qx - 2, Y0 + 4, qx + 2, Y1 - 4], fill=W[3], outline=OUT)
        bc = W if e < 4 else rmp(mix(W[2], IRON[2], .5 if e == 4 else .8))
        d.rectangle([bx0 + 2, cy - 4, X1 - 6, cy + 4], fill=bc[3], outline=OUT); d.line([bx0 + 3, cy - 3, X1 - 7, cy - 3], fill=bc[4])   # the beater blade
        if e == 2: d.ellipse([X1 - 12, cy - 5, X1 - 1, cy + 5], fill=W[2], outline=OUT)   # a turned knob handle
        elif e == 3: d.rectangle([X1 - 12, cy - 3, X1 - 4, cy + 3], fill=W[2], outline=OUT); d.arc([X1 - 9, cy - 7, X1 - 1, cy + 7], 270, 90, fill=W[3], width=3)   # a curved grip
        elif e == 4: d.rectangle([X1 - 12, cy - 3, X1 - 6, cy + 3], fill=W[2], outline=OUT); d.ellipse([X1 - 8, cy - 5, X1, cy + 5], outline=IRON[2], width=2)   # an iron ring
        elif e == 5: d.rectangle([X1 - 12, cy - 2, X1 - 4, cy + 2], fill=IRON[2], outline=OUT); d.rectangle([X1 - 5, cy - 8, X1 - 1, cy + 8], fill=IRON[3], outline=OUT)   # a T-bar
        else: d.rectangle([X1 - 12, cy - 3, X1, cy + 3], fill=W[2], outline=OUT)    # its handle
        if e == 5: 
            for rx in range(bx0 + 8, X1 - 12, 14): rivet(tm, rx, cy)
        if e == 0:
            for k in range(3): d.line([bx0 + 8 + k * 20, Y0 + 6, bx0 + 12 + k * 20, Y0 + 6], fill=W[4])
    nfl = 14 if p.w >= 2 else 8; kind = v.get("contents", "retted")
    for k in range(nfl):                                                           # handfuls of flax laid across
        fx = bx0 + 6 + k * (X1 - bx0 - 20) / nfl
        c = fl[2 + (k % 2)]
        if kind == "broken":                                                       # broken stalks, snapped at the blade and splayed
            d.line([fx, Y0 + 1, fx + 1, cy - 6], fill=c, width=2); d.line([fx + 3, cy + 6, fx + 5, Y1 - 1], fill=c, width=2)
        elif kind == "fibre":                                                      # dressed fibre in soft hanks
            if k % 2 == 0: d.line([fx, Y0 + 1, fx + 3, cy, fx, Y1 - 1], fill=c, width=4, joint="curve")
        else:
            d.line([fx, Y0 + 1, fx + 2, Y1 - 1], fill=c, width=2)
            if kind == "green": d.ellipse([fx - 1, Y0, fx + 3, Y0 + 4], fill=(170, 140, 70), outline=OUT)   # the seed bolls still on


define("flaxbrake", draw=flaxbrake, axes={"contents": list(FLAX)}, nvar=16, front=True, clear=2,
       ref="flax brakes about 5 to 6 ft long on legs, with a scutching board about 3 ft high (open-air museum examples, Skansen and Beamish)")


# ================================================================ gazing ball
BALL = {"silver": (200, 206, 214), "cobalt": (40, 70, 190), "green": (40, 150, 80), "gold": (220, 180, 60), "red": (190, 30, 40), "purple": (120, 50, 160),
        "amber": (210, 130, 40), "teal": (30, 150, 160), "rose": (220, 120, 150)}


def gazingball(tm, x, y, w, h, st, v):
    """A gazing ball on its pedestal in a garden, seen from above: the mirrored glass ball filling the middle, the sky
    and a bright window of light caught in it to the north-west, a dark ring of the garden reflected at its rim, and
    the pedestal's square or round top showing round it. Victorian: silvered glass on a cast-iron or terracotta stand.
    Great War: the same on a stone column. Mid-Century: a cast concrete pedestal. Modern: a stainless steel ball on a
    resin stand. Future Darkness: a dark sphere with a lit band. Central Europe's Rosenkugel sits on a stake in the
    rose bed; the Atlantic lands set it on stone; the North on painted wood; the Americas on concrete."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    ped = {"central": (120, 150, 70), "atlantic": p.stone[2], "northern": mix(p.wood[2], p.acc[2], .5), "americas": (180, 176, 168)}.get(p.st, p.stone[2])
    ped = {4: mix(ped, (150, 90, 60), .3), 5: mix(ped, (110, 120, 110), .55), 6: mix(ped, (190, 186, 176), .5), 7: mix(ped, (230, 226, 216), .4), 8: mix(ped, (50, 54, 62), .6)}[e]
    if p.w >= 4: ped = mix(ped, (236, 230, 214), .3)
    Pc = rmp(fade(ped, v), 14)
    shadow(tm, X0, Y0, X1, Y1, 3, kind="ellipse" if p.st in ("central", "americas") else "rect")
    if p.st in ("central", "americas"): d.ellipse([X0, Y0, X1, Y1], fill=Pc[2], outline=OUT)
    else: lidbox(d, X0, Y0, X1, Y1, Pc)
    if e == 5: d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=Pc[3], outline=Pc[0])   # the stone column's round cap
    if p.st == "central" and e <= 5:
        for a in np.linspace(.3, 6.6, 6)[:-1]: d.ellipse([cx + math.cos(a) * R * .8 - 2, cy + math.sin(a) * R * .8 - 2, cx + math.cos(a) * R * .8 + 2, cy + math.sin(a) * R * .8 + 2], fill=(200, 50, 70))   # roses round the stake
    col = BALL.get(v.get("colour", "silver"), (200, 206, 214))
    if e == 7: col = mix(col, (210, 214, 220), .45)
    if e == 8: col = mix((30, 34, 44), col, .4)
    B = rmp(col, 22); r = R * {4: .72, 5: .56, 6: .66, 7: .8, 8: .7}[e]
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B[2], outline=OUT)
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=B[0], width=2)   # the garden in the rim
    d.ellipse([cx - r * .55, cy - r * .55, cx + r * .1, cy + r * .05], fill=B[4])      # the sky caught in it
    d.rectangle([cx - r * .4, cy - r * .45, cx - r * .15, cy - r * .2], fill=(255, 255, 255))
    if e == 8: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=lit_of(p, col)[2])


define("gazingball", draw=gazingball, axes={"colour": list(BALL)}, nvar=12,
       ref="gazing globes 10 to 14 in across on pedestals about 1 1/2 ft square (Victorian garden catalogues; Lauscha Rosenkugeln)")


# ================================================================ gabion blast wall
HESCO_FILL = {"sand": (206, 180, 130), "earth": (130, 100, 70), "gravel": (150, 146, 140), "rubble": (170, 150, 140), "clay": (176, 100, 70), "snow": (230, 234, 240),
              "black": (60, 56, 52), "red": (150, 76, 50), "grey": (120, 120, 116), "white": (220, 214, 196), "peat": (80, 60, 44), "chalk": (236, 232, 214),
              "ochre": (200, 150, 60), "slate": (90, 96, 110)}


def hesco(tm, x, y, w, h, st, v):
    """A gabion blast-wall unit, seen from above: the square welded-mesh cage, its liner showing at the edges, filled
    with whatever ground it was set on: sand, earth, gravel, rubble, clay or snow. Modern: galvanized mesh and a tan
    or olive geotextile, sandbags on top for the rich post. Future Darkness: a composite cage with a lit tag and a
    sensor. The fill is the place's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e
    key = v.get("colour", "sand"); ki = list(HESCO_FILL).index(key) if key in HESCO_FILL else 0
    Fl = rmp(fade(HESCO_FILL.get(key, (206, 180, 130)), v), 12)
    liner = [(186, 166, 120), (100, 104, 70), (220, 216, 200)][(ki + p.w) % 3]
    shadow(tm, X0, Y0, X1, Y1, 4)
    d.rectangle([X0, Y0, X1, Y1], fill=liner, outline=OUT)
    d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=Fl[2])
    for k in range(int((X1 - X0) * (Y1 - Y0) / 40)):
        sx, sy = rng.uniform(X0 + 4, X1 - 6), rng.uniform(Y0 + 4, Y1 - 5); c = Fl[rng.integers(0, 5)]
        if key in ("gravel", "rubble"): d.rectangle([sx, sy, sx + 2, sy + 2], fill=c)
        else: d.line([sx, sy, sx + 2, sy], fill=c)
    M = STEEL if e == 7 else rmp((70, 74, 84), 12)
    step = (X1 - X0) // 6
    for k in range(7):                                                             # the welded mesh
        gx = X0 + k * step; gy = Y0 + k * step
        d.line([gx, Y0, gx, Y1], fill=M[3]); d.line([X0, gy, X1, gy], fill=M[3])
    d.rectangle([X0, Y0, X1, Y1], outline=M[1], width=2)
    if p.w >= 4 and e == 7:                                                       # sandbags laid on top
        for k in range(3): d.rounded_rectangle([X0 + 6 + k * 18, Y0 + 6, X0 + 22 + k * 18, Y0 + 16], 3, fill=(186, 166, 120), outline=OUT)
    if e == 8: d.rectangle([X1 - 12, Y1 - 10, X1 - 4, Y1 - 4], fill=lit_of(p)[2], outline=OUT); d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 4], fill=lit_of(p)[0])


define("hesco", draw=hesco, global_from=gf(1991), axes={"colour": list(HESCO_FILL)}, nvar=14,
       ref="Hesco Concertainer units about 3 1/2 ft square (Hesco Bastion MIL units, 1991)")


# ================================================================ kitchenette
LAMINATE = {"white": (232, 232, 226), "cream": (226, 214, 176), "yellow": (226, 196, 80), "green": (120, 160, 110), "blue": (110, 150, 196), "red": (190, 60, 50),
            "wood": (170, 120, 76), "grey": (150, 152, 156), "black": (50, 50, 54), "orange": (214, 120, 50), "teal": (60, 150, 150), "pink": (220, 160, 170),
            "avocado": (140, 150, 70), "brown": (110, 76, 50), "lilac": (170, 140, 200), "navy": (40, 50, 90)}


def kitchenette(tm, x, y, w, h, st, v):
    """A kitchenette unit against the wall of a bedsit, office, cabin or barracks room, seen from above: the worktop
    with a small sink and its tap, two cooking rings, a kettle and a cup, a shelf or splashback at the back. Great War:
    a scrubbed board top, a stoneware sink and a two-ring gas burner. Mid-Century: enamel and coloured laminate, a
    chrome-edged top and a little cooker. Modern: a laminate top, a stainless sink, a microwave. Future Darkness: a
    dark composite unit with an induction plate and lit edge. The colour is the laminate or the paint."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    key = v.get("colour", "white"); ki = list(LAMINATE).index(key) if key in LAMINATE else 0
    col = LAMINATE.get(key, (232, 232, 226))
    if e == 5: col = mix(col, (200, 180, 140), .45)
    if e == 8: col = mix((48, 50, 58), col, .7)
    C = rmp(fade(col, v), 12)
    shadow(tm, X0, Y0, X1, Y1, 3)
    lidbox(d, X0, Y0, X1, Y1, C)
    d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 5], fill=C[0])                        # the splashback
    if e == 6: d.line([X0 + 1, Y1 - 1, X1 - 1, Y1 - 1], fill=STEEL[4], width=2)      # the chrome edge
    sx0, sx1 = X0 + 6, X0 + int(W_ * .32)                                           # the sink
    sk = (226, 220, 206) if e == 5 else STEEL if e != 8 else None
    skc = rmp(sk, 12) if isinstance(sk, tuple) else (sk or rmp((70, 74, 84), 12))
    d.rectangle([sx0, Y0 + 8, sx1, Y1 - 6], fill=skc[1], outline=OUT); d.rectangle([sx0 + 3, Y0 + 11, sx1 - 3, Y1 - 9], fill=skc[3])
    d.ellipse([(sx0 + sx1) // 2 - 2, (Y0 + Y1) // 2, (sx0 + sx1) // 2 + 2, (Y0 + Y1) // 2 + 4], fill=skc[0])
    d.rectangle([(sx0 + sx1) // 2 - 1, Y0 + 3, (sx0 + sx1) // 2 + 1, Y0 + 10], fill=STEEL[4], outline=OUT)   # the tap
    hx = X0 + int(W_ * .62)                                                         # the rings
    if e == 8: d.rectangle([hx - 16, Y0 + 8, hx + 16, Y1 - 5], fill=(30, 30, 36), outline=OUT)
    for k in (-8, 8):
        if e == 8: d.ellipse([hx + k - 6, Y0 + 12, hx + k + 6, Y1 - 9], outline=lit_of(p, col)[2])
        else:
            d.ellipse([hx + k - 6, Y0 + 11, hx + k + 6, Y1 - 8], fill=(40, 40, 44), outline=OUT); d.ellipse([hx + k - 3, Y0 + 14, hx + k + 3, Y1 - 11], outline=(90, 90, 96))
    if e == 7: d.rectangle([X1 - 22, Y0 + 3, X1 - 3, Y1 - 4], fill=(40, 40, 44) if ki % 2 else (226, 226, 222), outline=OUT); d.rectangle([X1 - 19, Y0 + 7, X1 - 9, Y1 - 8], fill=(60, 70, 80))   # a microwave
    else:
        kc = {5: (150, 152, 156), 6: (226, 60, 40) if ki % 2 else (220, 210, 170), 8: (60, 62, 70)}[e]
        d.ellipse([X1 - 16, Y0 + 9, X1 - 4, Y1 - 6], fill=kc, outline=OUT); d.line([X1 - 10, Y0 + 9, X1 - 10, Y0 + 5], fill=OUT, width=2)   # the kettle
    if p.w >= 2: d.ellipse([sx1 + 4, Y1 - 12, sx1 + 10, Y1 - 6], fill=[(240, 240, 236), (60, 100, 160), (200, 60, 50)][(ki + p.w) % 3], outline=OUT)   # a cup


define("kitchenette", draw=kitchenette, global_from=gf(1905), axes={"colour": list(LAMINATE)}, nvar=16, front=True, clear=2.5,
       ref="compact kitchen units about 6 ft by 2 ft (Frankfurt and bed-sitter kitchenettes; 1950s Belling and Murphy units)")


# ================================================================ lighthouse lantern and its lens
LENS_TINT = {"clear": (200, 226, 236), "green": (150, 210, 180), "amber": (230, 200, 130), "red-sector": (220, 150, 150), "blue": (160, 190, 230),
             "violet": (196, 176, 226), "smoke": (170, 176, 180), "gold": (226, 210, 150), "white": (236, 240, 240), "aqua": (150, 220, 220)}
# the lantern's paint, in the lighthouse authority's colour, and its lens glass
LANTERN = {"red": ((170, 40, 36), "clear"), "white": ((230, 230, 226), "clear"), "black": ((40, 40, 44), "amber"), "green": ((40, 110, 60), "green"),
           "grey": ((130, 134, 140), "smoke"), "blue": ((40, 70, 140), "blue"), "buff": ((200, 180, 130), "gold"), "teal": ((30, 120, 120), "aqua"),
           "maroon": ((110, 30, 40), "red-sector"), "ochre": ((190, 140, 50), "amber"), "navy": ((30, 40, 80), "violet"), "cream": ((226, 214, 176), "white")}


def lighthouselens(tm, x, y, w, h, st, v):
    """A lighthouse's lantern room seen from above: the round gallery floor, the many-sided lantern of glazing bars,
    and in the middle the great Fresnel lens, its rings of glass prisms in brass panels round the light. Lit: the
    lamp blazes white-gold at the centre and the bull's-eyes flash. Age of Reason: Fresnel's first lens, a brass
    frame round a many-wick oil lamp. Victorian: a tall first-order lens of eight panels on a mercury float, a
    paraffin vapour burner. Great War: an incandescent mantle and a clockwork drive. Mid-Century: an electric lamp
    and a rotating table. Modern: a drum of sealed-beam aerobeacons. Future Darkness: an LED array in a dark housing.
    The lens tint and the frame metal are the maker's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    lit = st == "lit"
    paint, lens = LANTERN.get(v.get("colour", "red"), LANTERN["red"])
    tint = LENS_TINT[lens]; G = rmp(fade(tint, v), 14)
    Fr = {3: BRASS, 4: BRASS, 5: rmp((150, 120, 70), 18), 6: rmp((90, 110, 100), 14), 7: STEEL, 8: rmp((54, 58, 66), 12)}[e]
    if p.w >= 5 and e <= 5: Fr = GOLD
    floor = mix({3: (130, 120, 110), 4: (110, 60, 50), 5: (110, 110, 100), 6: (170, 60, 50), 7: (150, 150, 150), 8: (50, 54, 62)}[e], paint, .7)   # the gallery and lantern in the authority's paint
    if e == 8: floor = mix(floor, futc(v.get("colour", "red"), LANTERN), .45)
    d.ellipse([X0, Y0, X1, Y1], fill=floor, outline=OUT)
    n = {3: 10, 4: 16, 5: 12, 6: 8, 7: 16, 8: 20}[e]                                 # the lantern's glazing: few heavy panes early, helical bars later
    pts = [(cx + math.cos(a) * R * .92, cy + math.sin(a) * R * .92) for a in np.linspace(0, 6.28, n + 1)[:-1]]
    d.polygon(pts, fill=mix(floor, (200, 220, 230), .35), outline=OUT)            # the lantern glazing
    for k, (ax_, ay_) in enumerate(pts):
        if e == 4: bx_, by_ = pts[(k + 1) % n]; d.line([cx + (ax_ - cx) * .78, cy + (ay_ - cy) * .78, bx_, by_], fill=Fr[1], width=2)   # helical bars
        else: d.line([cx + (ax_ - cx) * .78, cy + (ay_ - cy) * .78, ax_, ay_], fill=Fr[1], width=4 if e == 3 else 2)
    rl = R * {3: .5, 4: .66, 5: .56, 6: .44}.get(e, .5)
    if e >= 7: Fr = rmp(mix(Fr[2], paint, .5), 14)
    if e == 7:                                                                     # a drum of sealed-beam lamps
        d.ellipse([cx - rl, cy - rl, cx + rl, cy + rl], fill=mix(G[2], paint, .4), outline=OUT)
        ki = list(LANTERN).index(v.get("colour", "red")) if v.get("colour", "red") in LANTERN else 0
        for a in np.linspace(ki * .3, 6.28 + ki * .3, 5 + ki % 4)[:-1]:
            lx, ly = cx + math.cos(a) * rl * .65, cy + math.sin(a) * rl * .65
            d.ellipse([lx - 7, ly - 7, lx + 7, ly + 7], fill=G[3] if not lit else (255, 246, 210), outline=OUT)
    elif e == 8:
        d.ellipse([cx - rl, cy - rl, cx + rl, cy + rl], fill=mix(Fr[2], tint, .45), outline=OUT)
        d.ellipse([cx - rl * .5, cy - rl * .5, cx + rl * .5, cy + rl * .5], fill=mix(paint, futc(v.get("colour", "red"), LANTERN), .5), outline=OUT)
        for a in np.linspace(0, 6.28, 13)[:-1]:
            lx, ly = cx + math.cos(a) * rl * .75, cy + math.sin(a) * rl * .75
            d.rectangle([lx - 3, ly - 3, lx + 3, ly + 3], fill=mix((250, 250, 255), tint, .45) if lit else G[1], outline=OUT)
        d.ellipse([cx - rl, cy - rl, cx + rl, cy + rl], outline=lit_of(p, tint)[2], width=2)
    else:
        panels = {3: 6, 4: 8, 5: 8, 6: 4}[e]
        d.ellipse([cx - rl, cy - rl, cx + rl, cy + rl], fill=G[2], outline=Fr[0])
        for k in range(1, 6):                                                      # the rings of prisms
            q = rl * k / 6; d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=G[4] if k % 2 else G[1])
        for a in np.linspace(0, 6.28, panels + 1)[:-1]: d.line([cx + math.cos(a) * rl * .3, cy + math.sin(a) * rl * .3, cx + math.cos(a) * rl, cy + math.sin(a) * rl], fill=Fr[2], width=2)
        d.ellipse([cx - rl, cy - rl, cx + rl, cy + rl], outline=Fr[2], width=3)
        if e == 4:                                                                 # the mercury float's trough round the lens, an octagonal frame
            d.polygon([(cx + math.cos(a) * rl * 1.12, cy + math.sin(a) * rl * 1.12) for a in np.linspace(.39, 6.67, 9)[:-1]], outline=Fr[1], width=3)
        if e == 5:                                                                 # the clockwork drive's weight tube and its gear box beside the lens
            d.rectangle([cx + rl * .9, cy - 6, cx + rl * 1.25, cy + 6], fill=Fr[1], outline=OUT); d.ellipse([cx + rl * .95, cy - 4, cx + rl * 1.15, cy + 4], fill=Fr[3])
            d.line([cx - rl, cy, cx + rl, cy], fill=Fr[2], width=4)
        if e == 6:                                                                 # the rotating table's square frame and lamp changer
            d.rectangle([cx - rl, cy - rl, cx + rl, cy + rl], outline=Fr[1], width=3); d.line([cx - rl * .4, cy, cx + rl * .4, cy], fill=Fr[0], width=3); d.line([cx, cy - rl * .4, cx, cy + rl * .4], fill=Fr[0], width=3)
        if e >= 4:                                                                 # bull's-eyes
            for a in np.linspace(.4, 6.68, panels + 1)[:-1]:
                bx, by = cx + math.cos(a) * rl * .62, cy + math.sin(a) * rl * .62
                d.ellipse([bx - 4, by - 4, bx + 4, by + 4], fill=(255, 250, 220) if lit else G[4], outline=G[0])
    lr = R * .14
    if lit:
        d.ellipse([cx - lr * 1.6, cy - lr * 1.6, cx + lr * 1.6, cy + lr * 1.6], fill=(255, 220, 140)); d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=(255, 252, 230))
        tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 200, None)]
    else: d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=Fr[1], outline=OUT); d.point((cx - 1, cy - 1), fill=Fr[4])


define("lighthouselens", draw=lighthouselens, global_from=gf(1823), states=("lit", "out"), light={"dim": 12, "bright": 4, "color": "#fff2c8", "kind": "lantern"},
       axes={"colour": list(LANTERN)}, nvar=12, ref="first-order Fresnel lenses about 6 ft across in a lantern room (Fresnel 1823; Chance Brothers and Henry-Lepaute catalogues)")


# ================================================================ dress form or shop mannequin
MANN_CLOTH = {"bare": None, "black": (36, 34, 40), "red": (170, 30, 40), "blue": (40, 70, 150), "green": (40, 110, 70), "white": (236, 234, 226), "gold": (200, 160, 60),
              "pink": (220, 130, 160), "grey": (140, 140, 144), "tweed": (130, 110, 80), "purple": (100, 50, 120), "denim": (70, 96, 140)}


def mannequin(tm, x, y, w, h, st, v):
    """A dressmaker's form or a shop mannequin, seen from above: the shoulders and torso (or the whole figure's head
    and shoulders) on its stand, with what it wears draped on it. Age of Reason: a wicker or padded linen form on a
    turned wooden pole. Victorian: a papier-mache form in canvas on a cast-iron tripod over a hooped skirt cage. Great War: an adjustable wire
    form. Mid-Century: a fibreglass shop figure with painted hair. Modern: a faceless white or black figure on a
    glass base. Future Darkness: a dark composite figure with lit seams. The garment is the shop's or the tailor's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; W_ = X1 - X0
    body = {3: (200, 180, 140), 4: (210, 196, 166), 5: (120, 120, 126), 6: (226, 196, 170), 7: (236, 236, 232) if p.w % 2 else (44, 44, 48), 8: (54, 58, 66)}[e]
    B = rmp(fade(body, v), 14)
    base = {3: OAK, 4: IRON, 5: IRON, 6: STEEL, 7: rmp((190, 220, 230), 10), 8: rmp((40, 42, 50), 10)}[e]
    if e in (3, 4):
        for a in (1.57, 3.67, 5.76): d.line([cx, cy, cx + math.cos(a) * W_ * .46, cy + math.sin(a) * W_ * .46], fill=OUT, width=4); d.line([cx, cy, cx + math.cos(a) * W_ * .46, cy + math.sin(a) * W_ * .46], fill=base[3], width=2)
    else: d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=base[2], outline=OUT)
    shadow(tm, cx - W_ * .4, cy - W_ * .22, cx + W_ * .4, cy + W_ * .22, 3, kind="ellipse")
    if e == 4:
        for q in (.46, .36): d.ellipse([cx - W_ * q, cy - W_ * q * .6 + W_ * .12, cx + W_ * q, cy + W_ * q * .6 + W_ * .12], outline=IRON[2], width=2)   # the hooped skirt cage under it
    if e == 5:                                                                     # a wire form: open cage
        d.ellipse([cx - W_ * .4, cy - W_ * .2, cx + W_ * .4, cy + W_ * .2], outline=B[2], width=2); d.line([cx - W_ * .4, cy, cx + W_ * .4, cy], fill=B[1])
    elif e == 3: d.ellipse([cx - W_ * .42, cy - W_ * .2, cx + W_ * .42, cy + W_ * .2], fill=B[2], outline=OUT)   # the padded torso
    else: blob(d, cx - W_ * .42, cy - W_ * .2, cx + W_ * .42, cy + W_ * .22, B)       # the shoulders and torso
    if e == 3: 
        for k in range(-3, 4): d.line([cx + k * 4, cy - W_ * .18, cx + k * 4, cy + W_ * .18], fill=B[1])   # the wicker
    gc = MANN_CLOTH.get(v.get("colour", "bare"))
    if gc:
        G = rmp(et(gc, e, .1), 16)
        d.polygon([(cx - W_ * .42, cy - 2), (cx - W_ * .2, cy - W_ * .2), (cx + W_ * .2, cy - W_ * .2), (cx + W_ * .42, cy - 2), (cx + W_ * .35, cy + W_ * .45), (cx - W_ * .35, cy + W_ * .45)], fill=G[2], outline=OUT)
        d.line([cx, cy - W_ * .18, cx, cy + W_ * .4], fill=G[0]); d.line([cx - W_ * .3, cy + 2, cx - W_ * .2, cy + W_ * .4], fill=G[3])
        if p.w >= 4: d.line([cx - W_ * .35, cy + W_ * .44, cx + W_ * .35, cy + W_ * .44], fill=GOLD[3], width=2)
    if e >= 6:                                                                     # the head
        hc = B if e != 6 else rmp((110, 70, 40), 12)
        d.ellipse([cx - 5, cy - 6, cx + 5, cy + 5], fill=hc[2], outline=OUT); d.point((cx - 2, cy - 3), fill=hc[4])
    else:
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=base[3], outline=OUT)   # the knob on top of the pole
    if e == 4: d.line([cx - W_ * .3, cy - 4, cx + W_ * .3, cy - 4], fill=(190, 40, 40))   # a tape measure over the shoulders
    if e == 8: d.line([cx - W_ * .4, cy, cx + W_ * .4, cy], fill=lit_of(p)[2])


define("mannequin", draw=mannequin, global_from=gf(1800), axes={"colour": list(MANN_CLOTH)}, nvar=12, front=True, clear=1.5,
       ref="dress forms and shop figures about 1 1/2 to 2 ft across the shoulders on a stand (Stockman forms 1867; Siegel and Stockman catalogues)")


# ================================================================ mass grave pit
def masspit(tm, x, y, w, h, st, v):
    """A mass grave dug for the dead of a plague, a battle or a massacre, seen from above, drawn plainly and with
    respect: the long pit cut in the ground, its spoil heaped along one side, the dead laid in rows in their shrouds
    or blankets, and lime spread over them. Dark Ages: an earth pit and linen shrouds. Long Night: a plague pit
    heaped with limed shrouds. Renaissance: a few plain coffins among the shrouds. Age of Reason: layer on layer under
    lime. Victorian: a cholera pit with numbered stakes. Great War: soldiers in their grey and khaki blankets by a
    duckboard. Mid-Century: a bulldozed trench. Modern: an exhumation under forensic tape with numbered markers.
    Future Darkness: a dark sealed trench with a lit marker. The shroud cloth and the ground are the land's: white
    linen for the Islamic world's dead, mats in the islands, hides in the far north. Filled: earthed over and marked."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    G = rmp(mix(p.ground[2], ERA_TONE[e][2], .25), 12)
    ground(tm, X0, Y0, X1, Y1, G, rng, "rect")
    fill = v.get("contents", "open")
    sh = rmp({"islamic": (236, 232, 222), "seasia": (190, 170, 120), "polar": (150, 116, 80), "oceania": (200, 180, 140), "africa": (200, 170, 120),
              "eastasia": (220, 216, 200), "southasia": (236, 230, 214)}.get(p.st, (206, 198, 176)), 12)
    if e == 5: sh = rmp((110, 104, 84), 12)
    if e == 1: sh = rmp(mix(sh[2], (130, 120, 100), .35), 12)
    if p.w >= 4: sh = rmp(mix(sh[2], p.cloth[2], .35), 12)                        # a town's or a lord's: dyed palls
    sp = rmp(mix(G[2], (90, 70, 50), .35), 12)
    d.polygon([(X0, Y0), (X1, Y0), (X1 - 6, Y0 + H_ * .22), (X0 + 8, Y0 + H_ * .2)], fill=sp[2], outline=OUT)   # the spoil heap along the north
    for k in range(10): sx = rng.uniform(X0 + 6, X1 - 10); d.ellipse([sx, Y0 + 2, sx + 8, Y0 + 7], fill=sp[3])
    px0, py0, px1, py1 = X0 + 8, Y0 + int(H_ * .26), X1 - 8, Y1 - 8
    d.rectangle([px0, py0, px1, py1], fill=rmp(mix(G[2], (40, 30, 24), .5), 10)[1], outline=OUT)   # the pit
    d.line([px0 + 1, py0 + 1, px1 - 1, py0 + 1], fill=SHADE_CLR, width=3)
    if fill == "filled":
        d.rectangle([px0, py0, px1, py1], fill=sp[3], outline=OUT)
        for k in range(14): sx, sy = rng.uniform(px0 + 2, px1 - 8), rng.uniform(py0 + 2, py1 - 4); d.line([sx, sy, sx + 6, sy], fill=sp[1])
        mk = {0: p.wood, 1: p.wood, 2: p.stone, 3: p.stone, 4: p.wood, 5: WHITE, 6: p.stone, 7: p.stone, 8: COMPOSITE}[e]
        mx = (px0 + px1) // 2
        d.rectangle([mx - 3, py0 - 4, mx + 3, py0 + 16], fill=mk[3], outline=OUT); d.rectangle([mx - 10, py0 + 2, mx + 10, py0 + 7], fill=mk[3], outline=OUT)   # a cross or a marker
        if e == 8: d.rectangle([mx - 2, py0, mx + 2, py0 + 4], fill=lit_of(p)[2])
    else:
        rows = 2 if H_ < 160 else 3; n = max(4, int((px1 - px0) / 22))
        rh = (py1 - py0 - 8) // rows
        for r in range(rows):
            for k in range(n):
                bx = px0 + 6 + k * (px1 - px0 - 12) // n; by = py0 + 5 + r * rh
                bw = (px1 - px0 - 12) // n - 4
                if e == 2 and (k + r) % 3 == 0:                                    # a plain coffin
                    d.polygon([(bx, by + 3), (bx + bw // 2, by), (bx + bw, by + 3), (bx + bw, by + rh - 4), (bx, by + rh - 4)], fill=rmp(p.wood[2])[2], outline=OUT)
                else:
                    d.rounded_rectangle([bx, by, bx + bw, by + rh - 4], 5, fill=sh[2], outline=OUT)
                    d.ellipse([bx + 2, by + 1, bx + bw - 2, by + 9], fill=sh[3])   # the head end
                    d.line([bx + 3, by + 12, bx + bw - 3, by + 12], fill=sh[0])   # the binding cord
        if fill == "limed" or e in (1, 3, 4):
            for k in range(30):                                                    # lime spread over
                lx, ly = rng.uniform(px0 + 2, px1 - 8), rng.uniform(py0 + 2, py1 - 5); d.ellipse([lx, ly, lx + rng.uniform(4, 9), ly + 3], fill=(236, 236, 228))
    if e == 4:
        for k in range(4): sx = px0 + 6 + k * (px1 - px0) // 4; d.rectangle([sx, py1 + 1, sx + 3, py1 + 6], fill=WHITE[2], outline=OUT)   # numbered stakes
    if e == 5: d.rectangle([X0 + 2, Y1 - 7, X1 - 2, Y1 - 1], fill=rmp((120, 96, 66))[2], outline=OUT); [d.line([gx, Y1 - 7, gx, Y1 - 1], fill=OUT) for gx in range(X0 + 8, X1 - 2, 8)]   # a duckboard
    if e == 6: 
        for gy in range(py0 + 4, py1, 12): d.line([px0 + 2, gy, px1 - 2, gy + 2], fill=sp[1])   # bulldozer track marks
    if e == 7:                                                                     # forensic tape and markers
        d.rectangle([X0 + 2, Y0 + H_ * .24, X1 - 2, Y1 - 3], outline=(240, 210, 30), width=2)
        for k in range(5): mx = px0 + 10 + k * (px1 - px0 - 20) // 4; d.rectangle([mx - 3, py1 - 8, mx + 3, py1 - 2], fill=(240, 210, 30), outline=OUT)
    if e == 8: d.rectangle([px0, py0, px1, py1], outline=lit_of(p)[1], width=2)


define("masspit", draw=masspit, axes={"contents": ["open", "limed", "filled"]}, low=True,
       ref="plague and battlefield pits about 12 by 8 ft and deeper, the dead laid in rows (East Smithfield 1348-9 excavation; Wittstock 1636 grave)")


# ================================================================ stack of bricks, timber or pipes
BRICK = {"central": (170, 80, 56), "atlantic": (150, 70, 54), "northern": (156, 70, 50), "mediterranean": (200, 120, 80), "islamic": (206, 170, 120),
         "steppe": (176, 150, 110), "southasia": (180, 90, 64), "eastasia": (120, 124, 126), "seasia": (190, 110, 70), "africa": (176, 110, 70),
         "americas": (196, 150, 110), "oceania": (110, 104, 96), "polar": (150, 152, 160)}


CANE = ("eastasia", "seasia", "southasia", "oceania")


def materials(tm, x, y, w, h, st, v):
    """A stack of building stuff in a yard or depot, seen from above. Bricks: rows of brick ends in a stack, fired red
    in Europe, sun-dried adobe in the Islamic world and the Americas, grey brick in East Asia. Timber: squared beams
    or planks with their end grain showing, bamboo poles in East and South-east Asia. Pipes: lengths of pipe, clay
    drain pipes before the Victorian age, then cast iron, steel, and plastic from Modern on. Stone: dressed blocks.
    Dark Ages: rough-hewn and split. Long Night: the same, in two roped cart loads. Renaissance and Age of Reason:
    sawn and moulded, stacked in stepped tiers in the Age of Reason. Victorian: machine-made bricks with a frog, half
    under a tarpaulin. Great War: steel tube and rails. Mid-Century:
    concrete blocks. Modern: bricks and blocks on a pallet in shrink wrap. Future Darkness: composite panels with a
    lit tag. The rich builder's stack is bigger and neat; the poor one is salvage."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    kind = v.get("material", "bricks")
    if kind == "timber" and p.st in CANE and e <= 6: kind = "bamboo"
    ground(tm, X0, Y0, X1, Y1, rmp(mix(p.ground[2], ERA_TONE[e][2], .3), 12), rng, "rect")   # the yard it is stacked in
    sh = 1 if p.w >= 4 else (.86 if p.w >= 2 else .7)
    X0 = X0 + int(W_ * (1 - sh) / 2); X1 = X0 + int(W_ * sh); Y1 = Y0 + int(H_ * (.8 + .2 * sh)); W_, H_ = X1 - X0, Y1 - Y0   # a smaller stack, centred
    shadow(tm, X0, Y0, X1, Y1, 4)
    if e == 7 or (e == 6 and p.w >= 3):                                            # a pallet under it
        Pl = rmp((176, 140, 96), 14); d.rectangle([X0, Y0, X1, Y1], fill=Pl[2], outline=OUT)
        for gx in range(X0 + 4, X1, 10): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=Pl[0])
        X0, Y0, X1, Y1 = X0 + 3, Y0 + 3, X1 - 3, Y1 - 3
    if kind == "bricks":
        c = BRICK.get(p.st, (170, 80, 56))
        if e == 6: c = mix(c, (170, 168, 160), .45)                                # concrete blocks
        if e == 3: c = mix(c, (220, 190, 150), .3)                                 # soft rubbed bricks
        if e == 5: c = mix(c, (70, 70, 90), .4)                                    # hard blue engineering bricks
        if e == 8: c = mix((60, 64, 72), c, .35)
        B = rmp(fade(et(c, e, .12), v), 14)
        bw, bh = (10, 5) if e != 6 else (16, 8)
        for r, by in enumerate(range(Y0, Y1 - bh + 1, bh)):
            off = (bw // 2) * (r % 2)
            for bx in range(X0 - off, X1 - 2, bw):
                xa = max(X0, bx); xb = min(X1, bx + bw - 1)
                if xb - xa < 3: continue
                d.rectangle([xa, by, xb, by + bh - 1], fill=B[2 + (r + bx // bw) % 2 - (1 if p.w <= 1 and (bx + r) % 3 == 0 else 0)], outline=B[0])
                if e == 4: d.rectangle([xa + 3, by + 2, xb - 3, by + bh - 3], fill=B[1])   # the frog
                if e == 6: d.rectangle([xa + 3, by + 2, xa + 6, by + bh - 3], fill=B[0]); d.rectangle([xb - 6, by + 2, xb - 3, by + bh - 3], fill=B[0])
    elif kind == "stone":
        c = mix(p.stone[2], (200, 196, 186), .2) if e != 8 else (70, 74, 82)
        if e == 3: c = mix(c, (236, 226, 200), .3)
        if e == 5: c = mix(c, (90, 90, 96), .35)
        S = rmp(fade(et(c, e, .12), v), 14)
        for r, by in enumerate(range(Y0, Y1 - 8, 14)):
            nbk = max(1, (W_ + 2) // 22 - (r % 2)); sx0 = X0 + (W_ - (nbk * 22 - 2)) // 2   # each course centred, broken joint on the next
            for bx in range(sx0, sx0 + nbk * 22, 22):
                if e <= 1: d.polygon([(bx, by + 2), (bx + 18, by), (bx + 20, by + 12), (bx + 2, by + 13)], fill=S[2 + r % 2], outline=OUT)
                else: lidbox(d, bx, by, min(X1, bx + 20), by + 12, S)
    elif kind in ("timber", "bamboo"):
        if kind == "bamboo": T_ = rmp((196, 180, 96), 16)
        elif e == 8: T_ = rmp(mix((60, 64, 72), p.wood[2], .3), 12)
        else: T_ = rmp(fade(et(p.wood[2], e, .3 if e != 4 else .1), v), 16)
        if e == 5 and kind == "timber": T_ = rmp(mix(T_[2], (60, 50, 40), .45), 14)   # creosoted
        if e == 3 and kind == "timber": T_ = rmp(mix(T_[2], (200, 150, 70), .3), 16)    # ochre-marked deal
        n = max(3, int(H_ / (7 if kind == "bamboo" else 9)))
        for k in range(n):
            yy = Y0 + k * H_ / n; hh = H_ / n - 1
            if kind == "bamboo":
                d.rounded_rectangle([X0, yy, X1, yy + hh], 3, fill=T_[2 + k % 2], outline=OUT)
                for nx in range(X0 + 12, X1 - 4, 18): d.line([nx, yy + 1, nx, yy + hh - 1], fill=T_[0])
            elif e <= 1:                                                            # split and adzed baulks, uneven
                L = X1 - rng.integers(0, 12); d.polygon([(X0, yy), (L, yy + 1), (L - 2, yy + hh), (X0 + 2, yy + hh)], fill=T_[2 + k % 2], outline=OUT)
                endgrain(tm, X0 + 5, yy + hh / 2, max(3, hh / 2), T_, rings=False)
            else:
                slab(tm, X0, yy, X1, yy + hh, T_, "x", rng=rng)
                d.rectangle([X1 - 5, yy + 1, X1 - 1, yy + hh - 1], fill=T_[4])        # sawn end
        if e == 8: d.rectangle([X1 - 10, Y0 + 3, X1 - 4, Y0 + 7], fill=lit_of(p)[2])
    else:                                                                            # pipes
        pc = {0: (176, 100, 70), 1: (166, 96, 66), 2: (180, 104, 70), 3: (184, 110, 74), 4: (70, 70, 76), 5: (110, 104, 96), 6: (150, 150, 146), 7: (200, 200, 196), 8: (60, 64, 74)}[e]
        if e == 7 and p.w % 2: pc = (210, 110, 50)                                   # orange plastic drain
        Pp = rmp(fade(pc, v), 16); r = 6 if e <= 3 else 5
        n = max(2, int(H_ / (2 * r + 1)))
        for k in range(n):
            yy = Y0 + r + k * (2 * r + 1)
            d.rectangle([X0 + r, yy - r, X1 - r, yy + r], fill=Pp[2], outline=OUT); d.line([X0 + r, yy - r + 2, X1 - r, yy - r + 2], fill=Pp[4])
            d.ellipse([X1 - 2 * r, yy - r, X1, yy + r], fill=Pp[1], outline=OUT); d.ellipse([X1 - 2 * r + 3, yy - r + 3, X1 - 3, yy + r - 3], fill=SHADE_CLR)
            if e <= 3: d.ellipse([X0, yy - r - 1, X0 + 2 * r, yy + r + 1], fill=Pp[3], outline=OUT)   # the spigot ends of clay pipes
    if e == 7: d.rectangle([X0, Y0, X1, Y1], outline=(200, 220, 230))              # shrink wrap
    if e == 1:                                                                       # split into two loads off a cart, roped
        gc = rmp(mix(p.ground[2], ERA_TONE[e][2], .3), 12)[2]; mx = (X0 + X1) // 2
        d.rectangle([mx - 4, Y0, mx + 4, Y1], fill=gc); d.line([mx - 4, Y0, mx - 4, Y1], fill=OUT); d.line([mx + 4, Y0, mx + 4, Y1], fill=OUT)
        d.line([X0, Y1 - 2, X1, Y1 - 4], fill=(80, 70, 60), width=3)
    if e == 3:                                                                       # stacked in neat stepped tiers
        for q in (.2, .38): d.rectangle([X0 + W_ * q, Y0 + H_ * q, X1 - W_ * q, Y1 - H_ * q], outline=OUT, width=2)
    if e == 4:                                                                       # a tarpaulin roped over the north half
        Tp = rmp((86, 88, 70), 12); d.polygon([(X0 - 1, Y0 - 1), (X1 + 1, Y0 - 1), (X1 + 1, Y0 + H_ * .5), (X0 - 1, Y0 + H_ * .55)], fill=Tp[2], outline=OUT)
        for k in range(1, 4): d.line([X0 + k * W_ // 4, Y0, X0 + k * W_ // 4, Y0 + H_ * .52], fill=Tp[0])


define("materials", draw=materials, axes={"material": ["bricks", "timber", "pipes", "stone"]}, nvar=12,
       ref="a builder's stack about 4 by 3 ft: a pallet of 500 bricks, a stack of 12 ft timber, a bundle of pipe (builders' merchants' pallet sizes)")


# ================================================================ mortar in its emplacement
MORTAR_PAINT = {"olive": (96, 100, 60), "tan": (190, 166, 120), "grey": (120, 124, 128), "green": (60, 90, 60), "black": (44, 44, 48), "white": (220, 222, 220),
                "brown": (110, 80, 54), "khaki": (150, 140, 96), "sand": (204, 184, 140), "blue-grey": (96, 110, 130), "field-grey": (110, 116, 104), "rust": (130, 76, 46)}


def mortar(tm, x, y, w, h, st, v):
    """A mortar dug in, seen from above: a ring of sandbags round the pit, the base plate bedded in it, the tube's
    muzzle as a dark mouth at the middle, foreshortened toward the north where it points, its bipod, and the ammunition
    boxes by. Great War: a Stokes mortar in a hessian-bagged pit with wooden ammunition boxes. Mid-Century: an 81 mm
    mortar in olive paint and steel ammunition tins. Modern: a tan or green tube, plastic ammunition cases and a
    sight. Future Darkness: a dark composite tube with a lit fire-control box. The paint is the army's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    col = MORTAR_PAINT.get(v.get("colour", "olive"), (96, 100, 60))
    if e == 8: col = mix((48, 50, 58), col, .5)
    M = rmp(fade(col, v), 16)
    bag = mix({5: (176, 156, 112), 6: (150, 140, 100), 7: (190, 170, 130), 8: (80, 82, 86)}[e], col, .75)   # bags in the same army's issue
    Bg = rmp(bag, 14)
    ki = list(MORTAR_PAINT).index(v.get("colour", "olive")) if v.get("colour", "olive") in MORTAR_PAINT else 0
    terr = [(90, 70, 50), (200, 180, 130), (230, 234, 236), (90, 120, 60), (60, 50, 44), (150, 120, 80)][(ki + ki // 6) % 6]   # mud, sand, snow, grass, ash, clay
    d.rectangle([X0, Y0, X1, Y1], fill=rmp(terr, 10)[2])                            # the ground the pit is dug in
    if e == 5:                                                                      # a square pit revetted with planks and hessian bags
        d.rectangle([cx - R * .9, cy - R * .9, cx + R * .9, cy + R * .9], fill=Bg[2], outline=OUT)
        for k in range(6): d.line([cx - R * .9, cy - R * .9 + k * R * .3, cx + R * .9, cy - R * .9 + k * R * .3], fill=Bg[0])
        d.rectangle([cx - R * .62, cy - R * .62, cx + R * .62, cy + R * .62], fill=rmp((120, 90, 60))[1], outline=OUT)
        for k in range(5): d.line([cx - R * .6, cy - R * .6 + k * R * .3, cx + R * .6, cy - R * .6 + k * R * .3], fill=rmp((120, 90, 60))[3])   # the duckboards
    elif e == 7:                                                                    # a square of filled barrier bags
        d.rectangle([cx - R * .95, cy - R * .95, cx + R * .95, cy + R * .95], fill=Bg[3], outline=OUT)
        for k in range(1, 4): d.line([cx - R * .95 + k * R * .475, cy - R * .95, cx - R * .95 + k * R * .475, cy - R * .6], fill=Bg[0]); d.line([cx - R * .95 + k * R * .475, cy + R * .6, cx - R * .95 + k * R * .475, cy + R * .95], fill=Bg[0])
        d.rectangle([cx - R * .6, cy - R * .6, cx + R * .6, cy + R * .6], fill=rmp(terr, 10)[0], outline=OUT)
    elif e == 8:                                                                    # a low dark composite blast ring
        d.ellipse([cx - R * .95, cy - R * .95, cx + R * .95, cy + R * .95], fill=Bg[2], outline=OUT)
        d.ellipse([cx - R * .6, cy - R * .6, cx + R * .6, cy + R * .6], fill=mix((30, 32, 38), terr, .5), outline=OUT)
        fc = futc(v.get("colour", "olive"), MORTAR_PAINT); d.ellipse([cx - R * .5, cy - R * .5, cx + R * .5, cy + R * .5], outline=fc, width=3)   # the fire-control ring lit
    else:
        for k in range(12):                                                        # the sandbag ring
            a = k * .5236; bx, by = cx + math.cos(a) * R * .8, cy + math.sin(a) * R * .8
            d.rounded_rectangle([bx - 7, by - 5, bx + 7, by + 5], 3, fill=Bg[2 + k % 2], outline=OUT)
        d.ellipse([cx - R * .62, cy - R * .62, cx + R * .62, cy + R * .62], fill=rmp(terr, 10)[0])   # the pit floor
    d.ellipse([cx - 10, cy - 4, cx + 10, cy + 10], fill=M[1], outline=OUT)          # the base plate
    d.line([cx, cy + 2, cx, cy - R * .45], fill=OUT, width=8); d.line([cx, cy + 2, cx, cy - R * .45], fill=M[2], width=6)   # the tube, foreshortened north
    d.line([cx - 2, cy, cx - 2, cy - R * .4], fill=M[4])
    d.ellipse([cx - 5, cy - R * .45 - 5, cx + 5, cy - R * .45 + 5], fill=SHADE_CLR, outline=M[3])   # the muzzle
    for s_ in (-1, 1): d.line([cx, cy - R * .2, cx + s_ * R * .32, cy - R * .02], fill=M[0], width=2)   # the bipod
    ab = {5: rmp((150, 110, 70)), 6: rmp(mix(col, (80, 84, 60), .4)), 7: rmp((60, 66, 50) if p.w % 2 else (40, 40, 40), 12), 8: rmp((40, 42, 50), 10)}[e]
    for k in range(min(4, p.w)): d.rectangle([cx + R * .2 + (k % 2) * 9, cy + R * .2 + (k // 2) * 7, cx + R * .2 + (k % 2) * 9 + 8, cy + R * .2 + (k // 2) * 7 + 6], fill=ab[2], outline=OUT)
    if e == 7: d.rectangle([cx + 4, cy - 6, cx + 10, cy - 2], fill=(30, 30, 30), outline=OUT)   # the sight
    if e == 8: d.rectangle([cx - R * .5, cy + R * .2, cx - R * .25, cy + R * .4], fill=(30, 30, 36), outline=OUT); d.rectangle([cx - R * .46, cy + R * .25, cx - R * .3, cy + R * .3], fill=lit_of(p)[2])


define("mortar", draw=mortar, global_from=gf(1915), axes={"colour": list(MORTAR_PAINT)}, nvar=12, front=True, clear=2,
       ref="a light mortar pit about 3 ft across its sandbags (Stokes 3-inch mortar 1915; 81 mm M1 and L16 drill books)")


# ================================================================ obelisk or monument column
def obelisk(tm, x, y, w, h, st, v):
    """An obelisk, stele or monument in a square, park or churchyard, seen from straight above: its stepped plinth, the
    tapering shaft as a square narrowing to its pyramid tip at the middle, lit on its north and west faces. By
    region: a red granite obelisk in the Islamic world, a white marble one round the Mediterranean, a runestone in
    the North, a carved stele on its tortoise in East Asia, a round pillar with a lion capital in South Asia, a tall
    granite stele in Africa, a carved stela in the Americas, a cairn of stones (an inukshuk) in the far north, a
    standing deer stone on the steppe, a carved post in Oceania and the islands, a plague or memorial column in
    Central and Atlantic Europe. Victorian: iron railings round it. Mid-Century: a memorial with wreaths. Modern:
    a floodlit plinth. Future Darkness: a dark monolith with lit lines. The rich gild its tip and letters."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    mat = {"islamic": (176, 90, 70), "mediterranean": (232, 228, 216), "northern": (120, 120, 126), "eastasia": (90, 96, 100), "southasia": (196, 160, 120),
           "africa": (110, 100, 96), "americas": (176, 160, 120), "polar": (140, 140, 136), "steppe": (110, 112, 104), "oceania": (100, 70, 50),
           "seasia": (150, 130, 100), "central": (196, 190, 176), "atlantic": (150, 148, 144)}.get(p.st, (196, 190, 176))
    if e == 8: mat = mix((40, 44, 52), mat, .92)
    S = rmp(fade(et(mat, e, .1), v), 16)
    Pl = rmp(mix(p.stone[2], ERA_TONE[e][2], .3), 12)
    if e == 8: Pl = rmp(mix(mat, (30, 32, 40), .35), 12)                            # a plinth cut from the same stone
    shadow(tm, X0 + 4, Y0 + 4, X1, Y1, 4)
    for k, q in enumerate({0: (1,), 2: (1, .86, .72)}.get(e, (1, .8))):             # the plinth: one rough step, two, or three in the Renaissance
        r = R * q; lidbox(d, cx - r, cy - r, cx + r, cy + r, Pl if k == 0 else rmp(tone(Pl[2], 12 * k), 12))
    if e == 1:                                                                     # posts and a chain round it
        for gx, gy in ((X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X1 - 3, Y1 - 3), (X0 + 3, Y1 - 3)): d.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=p.wood[1], outline=OUT)
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=IRON[1])
    if e == 3:                                                                     # stone balls on the corners of the plinth
        for gx, gy in ((X0 + 6, Y0 + 6), (X1 - 6, Y0 + 6), (X1 - 6, Y1 - 6), (X0 + 6, Y1 - 6)): d.ellipse([gx - 5, gy - 5, gx + 5, gy + 5], fill=Pl[4], outline=OUT)
    if e == 4:                                                                     # iron railings
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=IRON[1], width=2)
        for gx in range(X0 + 2, X1, 5): d.point((gx, Y0 + 1), fill=IRON[4]); d.point((gx, Y1 - 1), fill=IRON[4])
    r = R * .58
    st_ = p.st
    if st_ == "polar" and e <= 6:                                                  # an inukshuk of stacked stones
        for k, (ox, oy, rr) in enumerate(((-.3, .2, .3), (.3, .2, .3), (0, -.1, .45), (0, -.35, .25))): blob(d, cx + ox * r - rr * r, cy + oy * r - rr * r * .7, cx + ox * r + rr * r, cy + oy * r + rr * r * .7, S)
    elif st_ == "southasia" and e <= 6:                                            # a round pillar with a lion capital
        blob(d, cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8, S)
        for a in np.linspace(0, 6.28, 5)[:-1]: d.ellipse([cx + math.cos(a + .785) * r * .4 - 5, cy + math.sin(a + .785) * r * .4 - 5, cx + math.cos(a + .785) * r * .4 + 5, cy + math.sin(a + .785) * r * .4 + 5], fill=GOLD[2] if p.w >= 4 else S[3], outline=OUT)
    elif st_ in ("northern", "eastasia", "americas", "steppe", "africa", "oceania", "seasia") and e <= 6:   # a slab stele seen on its top edge, its carved face foreshortened
        if st_ == "eastasia": blob(d, cx - r, cy - r * .6, cx + r, cy + r * .9, rmp(mix(S[2], (70, 80, 70), .3)))   # the tortoise
        d.rectangle([cx - r * .7, cy - r * .25, cx + r * .7, cy + r * .45], fill=S[2], outline=OUT)
        d.rectangle([cx - r * .7, cy - r * .25, cx + r * .7, cy - r * .1], fill=S[4])
        for k in range(5): glyph(d, int(cx - r * .55 + k * r * .24), int(cy), k + (st_ == "northern") * 3, S[0], 4)
        if st_ == "northern": d.arc([cx - r * .6, cy - r * .2, cx + r * .6, cy + r * .5], 0, 180, fill=(170, 40, 40), width=2)   # the painted rune band
    else:                                                                          # an obelisk: its four faces to the tip
        pts = [(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r)]
        for (a, b), c in zip(((0, 1), (1, 2), (2, 3), (3, 0)), (S[4], S[1], S[0], S[3])): d.polygon([pts[a], pts[b], (cx, cy)], fill=c, outline=OUT)
        tc = GOLD[3] if p.w >= 4 else S[4]
        d.polygon([(cx - 4, cy), (cx, cy - 4), (cx + 4, cy), (cx, cy + 4)], fill=tc)
        if st_ == "islamic" or p.w >= 4:
            for k in range(4): d.line([cx - r * .7 + k * 3, cy - r * .5, cx - r * .7 + k * 3, cy + r * .5], fill=S[1])   # incised signs on the west face
    if e == 6:                                                                     # wreaths laid at its foot
        for k in range(3): wx = cx - R * .6 + k * R * .6; d.ellipse([wx - 6, Y1 - 12, wx + 6, Y1 - 2], outline=(40, 100, 50), width=3); d.point((wx, Y1 - 3), fill=(200, 30, 40))
    if e == 7:
        for fx, fy in ((X0 + 4, Y0 + 4), (X1 - 8, Y1 - 8)): d.rectangle([fx, fy, fx + 4, fy + 4], fill=(250, 240, 200), outline=OUT)   # floodlights
    if e == 8: fc = futs(p); d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=fc, width=2); d.line([cx - r, cy - r, cx + r, cy + r], fill=fc); d.line([cx - r, cy + r, cx + r, cy - r], fill=fc)
    if e in (1, 3): d.rectangle([cx - R * .8 + 1, Y1 - 6, cx - R * .8 + 9, Y1 - 3], fill=(60, 90, 50))   # moss on the plinth


define("obelisk", draw=obelisk, ref="town obelisks and steles with a plinth about 4 ft square (memorial obelisks; Aksum and Tang steles; runestones)")


# ================================================================ orrery
ORRERY_BASE = {"mahogany": (120, 50, 34), "ebony": (34, 30, 30), "brass": (200, 160, 70), "silver": (200, 204, 210), "oak": (160, 120, 74),
               "ivory": (236, 228, 204), "green": (40, 110, 70), "blue": (40, 70, 150), "red": (170, 40, 40), "white": (248, 248, 246), "teal": (30, 120, 130), "orange": (220, 120, 40)}


def orrery(tm, x, y, w, h, st, v):
    """An orrery on a table, seen from straight above: the round base with its calendar and zodiac ring, the gilt
    sun at the middle, and the planets on their arms at their distances, the earth with its moon. Age of Reason: a
    brass and ebonised model to Saturn on a table base. Victorian: Uranus and Neptune added, on mahogany. Great War:
    a brass tellurion with a lamp for a sun. Mid-Century: a school model in painted metal and coloured balls.
    Modern: a plastic teaching model. Future Darkness: a hologram over a dark disc, its orbits lit lines. The base is
    the maker's wood or metal."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    key = v.get("material", "mahogany"); col = ORRERY_BASE.get(key, (110, 50, 34))
    ki = list(ORRERY_BASE).index(key) if key in ORRERY_BASE else 0
    if e == 8: col = mix((40, 42, 50), col, .7)
    B = rmp(fade(col, v), 16)
    shadow(tm, X0, Y0, X1, Y1, 3, kind="ellipse")
    d.ellipse([X0, Y0, X1, Y1], fill=B[2], outline=OUT)
    face = [(20, 30, 80), (236, 228, 204), (30, 30, 34), (200, 160, 70), (120, 40, 40), (60, 100, 60)][(ki * 5) % 6]   # the face inside the ring
    if e == 8: face = mix((20, 22, 30), face, .3)
    fr = R * (.5 + .1 * (ki % 3))
    d.ellipse([cx - fr, cy - fr, cx + fr, cy + fr], fill=rmp(face, 10)[2])
    ring = WHITE if e <= 5 else rmp((240, 230, 200), 10)
    d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=ring[3] if e != 8 else lit_of(p, col)[1], width=2)   # the calendar ring
    for a in np.linspace(0, 6.28, 13)[:-1]: d.point((cx + math.cos(a) * (R - 4), cy + math.sin(a) * (R - 4)), fill=OUT)
    n = {3: 6, 4: 8, 5: 6, 6: 8, 7: 8, 8: 8}[e]
    PC = [(170, 160, 150), (220, 190, 140), (60, 120, 200), (200, 90, 60), (210, 170, 120), (220, 200, 150), (150, 200, 220), (80, 110, 200)]
    if e <= 4: PC = [mix(c, (200, 170, 90), .6) for c in PC]                          # brass and ivory balls
    for k in range(n):
        rr = R * (.22 + .66 * (k + 1) / n); a = k * 2.1 + e + ki * .9
        if e == 8: d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=lit_of(p, col)[0])
        px_, py_ = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        if e != 8: d.line([cx, cy, px_, py_], fill=BRASS[3] if e <= 5 else STEEL[2])
        s_ = 2 if k not in (4, 5) else 3
        d.ellipse([px_ - s_, py_ - s_, px_ + s_, py_ + s_], fill=PC[k] if e != 8 else lit_of(p, PC[k])[3], outline=OUT if e != 8 else None)
        if k == 2: d.point((px_ + 4, py_), fill=WHITE[4])                              # the moon
    sc = GOLD if e != 5 else rmp((255, 230, 160), 10)
    if e == 8: sc = rmp(lit_of(p, (255, 200, 80))[2], 10)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=sc[3], outline=OUT); d.point((cx - 1, cy - 1), fill=sc[4])


define("orrery", draw=orrery, global_from=gf(1713), axes={"material": list(ORRERY_BASE)}, nvar=12,
       ref="table orreries about 1 1/2 to 2 ft across (Rowley's orrery for the Earl of Orrery, 1713; Troughton and Gilkerson orreries)")


# ================================================================ stone pedestal or plinth
PED_TOP = {"bare": None, "bust": (226, 222, 210), "vase": (60, 90, 150), "idol": (200, 160, 70), "skull": (226, 218, 196), "urn": (110, 80, 50), "cloth": (150, 30, 40)}


def pedestal(tm, x, y, w, h, st, v):
    """A pedestal or plinth in a sanctum, gallery or crypt, seen from above: its square top with the moulding round it,
    and what stands on it: a bust, a vase, an idol, a skull, an urn or a cloth. By region: limestone in Central
    Europe, granite in the Atlantic lands, painted wood in the North, marble round the Mediterranean, a tiled
    pedestal in the Islamic world, a lotus base in South Asia, a carved wooden stand in East Asia and the islands, a
    carved stool-like base in Africa, carved stone in the Americas. Dark Ages: rough-dressed. Renaissance:
    moulded. Victorian: a marble column-plinth with a brass plate. Mid-Century: a painted gallery plinth. Modern: a
    white gallery plinth with an acrylic hood. Future Darkness: a dark plinth with a lit top."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    base = COL_STONE.get(p.st, (186, 180, 166))
    if e == 6: base = mix(base, (210, 206, 196), .35)
    elif e == 7: base = mix(base, (240, 240, 236), .45)
    elif e == 8: base = mix((44, 48, 56), base, .3)
    else: base = et(base, e, .2)
    if p.w >= 4 and e <= 5: base = mix(base, (236, 230, 220), .3)
    if e == 3: base = mix(base, (90, 70, 60), .3)                                  # Age of Reason: a veined, polished dark marble
    S = rmp(fade(base, v), 14)
    shadow(tm, X0, Y0, X1, Y1, 3)
    if p.st == "southasia" and e <= 5:
        d.ellipse([X0, Y0, X1, Y1], fill=S[2], outline=OUT)
        for a in np.linspace(0, 6.28, 13)[:-1]: d.ellipse([cx + math.cos(a) * R * .78 - 4, cy + math.sin(a) * R * .78 - 4, cx + math.cos(a) * R * .78 + 4, cy + math.sin(a) * R * .78 + 4], fill=S[3], outline=S[0])   # lotus petals
    else:
        c_ = R * .3
        if e == 0:                                                                  # rough-dressed: a block with its corners knocked off
            d.polygon([(X0 + c_, Y0), (X1 - c_ * .6, Y0), (X1, Y0 + c_), (X1, Y1 - c_ * .5), (X1 - c_, Y1), (X0 + c_ * .5, Y1), (X0, Y1 - c_), (X0, Y0 + c_ * .7)], fill=S[2], outline=OUT)
        elif e == 1:                                                                # a stepped block, a broad lower step showing round it
            d.rectangle([X0, Y0, X1, Y1], fill=S[1], outline=OUT); lidbox(d, X0 + R * .25, Y0 + R * .25, X1 - R * .25, Y1 - R * .25, S)
        elif e == 3:                                                                # a round column-pedestal with fluting
            d.ellipse([X0, Y0, X1, Y1], fill=S[2], outline=OUT)
            for a in np.linspace(0, 6.28, 17)[:-1]: d.line([cx + math.cos(a) * R * .7, cy + math.sin(a) * R * .7, cx + math.cos(a) * R * .98, cy + math.sin(a) * R * .98], fill=S[0])
        elif e == 4:                                                                # an octagonal top on a square plinth
            d.rectangle([X0, Y0, X1, Y1], fill=S[1], outline=OUT)
            d.polygon([(X0 + c_, Y0 + 2), (X1 - c_, Y0 + 2), (X1 - 2, Y0 + c_), (X1 - 2, Y1 - c_), (X1 - c_, Y1 - 2), (X0 + c_, Y1 - 2), (X0 + 2, Y1 - c_), (X0 + 2, Y0 + c_)], fill=S[3], outline=OUT)
        elif e == 6:                                                                # a slimmer painted gallery plinth, more floor round it
            lidbox(d, X0 + R * .18, Y0 + R * .18, X1 - R * .18, Y1 - R * .18, S)
        else: lidbox(d, X0, Y0, X1, Y1, S)
        if e == 2:
            for q in (3, 6, 9): d.rectangle([X0 + q, Y0 + q, X1 - q, Y1 - q], outline=S[0] if q != 6 else S[4])   # the moulded edge
        elif e == 5: d.polygon([(X0, Y0), (X1, Y0), (X0, Y1)], fill=mix((120, 110, 80), S[2], .45), outline=OUT)   # a drill cloth thrown over half of it
        elif e == 7: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=(250, 252, 255), width=3)   # the acrylic hood's edge
        elif e not in (0, 1, 3, 4): d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=S[0])
        if p.st == "islamic" and e <= 6:
            for k in range(4): d.rectangle([X0 + 5 + (k % 2) * (X1 - X0 - 14), Y0 + 5 + (k // 2) * (Y1 - Y0 - 14), X0 + 9 + (k % 2) * (X1 - X0 - 14), Y0 + 9 + (k // 2) * (Y1 - Y0 - 14)], fill=(40, 130, 140))
    if e == 4: d.rectangle([cx - 6, Y1 - 5, cx + 6, Y1 - 2], fill=BRASS[3], outline=OUT)
    top = v.get("contents", "bare"); tc = PED_TOP.get(top)
    if tc:
        T_ = rmp(tc, 16)
        if top in ("bust", "skull"):
            blob(d, cx - R * .45, cy - R * .3, cx + R * .45, cy + R * .45, T_)
            if top == "skull": d.ellipse([cx - 5, cy - 1, cx - 1, cy + 3], fill=SHADE_CLR); d.ellipse([cx + 1, cy - 1, cx + 5, cy + 3], fill=SHADE_CLR)
            else: d.ellipse([cx - R * .3, cy - R * .4, cx + R * .3, cy + R * .2], fill=T_[3], outline=OUT)
        elif top in ("vase", "urn"):
            d.ellipse([cx - R * .5, cy - R * .5, cx + R * .5, cy + R * .5], fill=T_[2], outline=OUT); d.ellipse([cx - R * .25, cy - R * .25, cx + R * .25, cy + R * .25], fill=T_[0], outline=OUT)
        elif top == "idol":
            d.polygon([(cx, cy - R * .5), (cx + R * .4, cy), (cx, cy + R * .5), (cx - R * .4, cy)], fill=T_[2], outline=OUT); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=T_[4])
        else:
            d.polygon([(X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X1 - 1, Y1 - 1), (X0 + 1, Y1 - 1)], fill=T_[2], outline=OUT); d.line([cx, Y0 + 4, cx, Y1 - 2], fill=T_[0])
    if e == 7: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=(200, 230, 240))   # the acrylic hood
    if e == 8: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=lit_of(p)[2])


define("pedestal", draw=pedestal, axes={"contents": list(PED_TOP)},
       ref="plinths and pedestals 1 1/2 to 2 ft square (gallery plinth makers; Roman and Renaissance statue bases)")


# ================================================================ Umbral rift
REALM = {"wyld": ((120, 220, 110), (240, 210, 90)), "weaver": ((150, 200, 250), (230, 240, 255)), "wyrm": ((120, 60, 140), (110, 170, 60)),
         "penumbra": ((176, 180, 196), (230, 230, 240)), "dark": ((40, 50, 90), (130, 150, 200)), "flame": ((240, 120, 40), (255, 220, 120))}


def rift(tm, x, y, w, h, st, v):
    """An Umbral rift, a tear in the Gauntlet, seen from above: a long ragged lens of light standing in the air with
    the dark of the spirit world at its heart, bright motes drifting off it, and the ground round it changed by what
    leaks through (the place's own earth and floor, frosted, grown over or webbed). Open: wide and blazing. Closed:
    a faint scar of light. Its light is the realm beyond: the green and gold of the Wyld, the cold blue crystal
    lattice of the Weaver, the sick purple and green of the Wyrm, the grey silver of the Penumbra, the black-blue of
    the Dark Umbra, the fire of an elemental realm. The Gauntlet thickens down the ages: Dark Ages rifts are wide and
    raw; the Long Night's bleed red; the Renaissance's are ringed with drawn sigils; the Age of Reason's netted by
    Weaver threads; the Victorian's choked with soot; the Great War's torn and jagged; the Mid-Century's set in
    crystalline geometry; the Modern's thin and glitching; Future Darkness's a flicker of digital shards."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    a_, b_ = REALM.get(v.get("colour", "wyld"), REALM["wyld"])
    if e == 1: a_ = mix(a_, (200, 40, 40), .35)
    if e == 4: a_ = mix(a_, (70, 64, 60), .3)
    L = rmp(a_, 22); Hc = rmp(b_, 16)
    G = rmp(mix(p.ground[2], ERA_TONE[e][2], .3), 12)
    ground(tm, X0, Y0, X1, Y1, G, rng)                                             # the changed ground round it
    k_ = 1.0 if p.w >= 3 else .8
    for i in range(14):                                                            # what has grown or frosted round it
        a = i * .449; q = rng.uniform(.55, .9) * R * k_
        px_, py_ = cx + math.cos(a) * q, cy + math.sin(a) * q * .8
        d.ellipse([px_ - 4, py_ - 3, px_ + 4, py_ + 3], fill=mix(G[2], L[2], .45))
    opn = st != "closed"
    span = R * (.95 if e == 0 else .85 - .04 * e) * k_
    width = (R * (.42 - .025 * e)) * (1 if opn else .18)
    pts = []
    for i in range(17):                                                            # the ragged lens, north-south
        t = i / 16; yy = cy - span + 2 * span * t; ww = width * math.sin(math.pi * t) * (1 + .25 * math.sin(i * 2.3 + e))
        pts.append((cx + ww + rng.uniform(-2, 2), yy))
    pts += [(2 * cx - px_ + rng.uniform(-2, 2), py_) for px_, py_ in reversed(pts)]
    glow = [(px_ + (px_ - cx) * .35, py_) for px_, py_ in pts]
    d.polygon(glow, fill=mix(L[2], G[2], .5))
    d.polygon(pts, fill=L[3], outline=L[4])
    inner = [(cx + (px_ - cx) * .55, cy + (py_ - cy) * .9) for px_, py_ in pts]
    d.polygon(inner, fill=mix(L[0], (10, 8, 20), .6) if opn else L[2])            # the dark of the other side
    if opn:
        for i in range(10):                                                        # motes drifting off it
            a = rng.uniform(0, 6.28); q = rng.uniform(width + 4, R * .9)
            mx, my = cx + math.cos(a) * q * .7, cy + math.sin(a) * q
            d.rectangle([mx - 1, my - 1, mx + 1, my + 1], fill=Hc[4])
        tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 160, None)]
    if e == 2:                                                                     # drawn sigils ringing it
        for i in range(8): a = i * .785; glyph(d, int(cx + math.cos(a) * R * .8), int(cy + math.sin(a) * R * .8), i, Hc[3], 4)
    elif e == 3 or e == 6:                                                         # Weaver threads netting it, crystalline in the Mid-Century
        for i in range(6): yy = cy - span * .8 + i * span * .32; d.line([cx - R * .6, yy, cx + R * .6, yy + (8 if e == 6 else 2)], fill=(200, 220, 240), width=1)
        if e == 6:
            for i in range(4): d.polygon([(cx + R * .5, cy - R * .5 + i * 20), (cx + R * .6, cy - R * .45 + i * 20), (cx + R * .5, cy - R * .4 + i * 20)], fill=(200, 230, 250), outline=OUT)
    elif e == 4:
        d.ellipse([cx - R * .92, cy - R * .92, cx + R * .92, cy + R * .92], outline=(50, 46, 46), width=6)   # a ring of soot scorched round it
    elif e == 5:
        for i in range(4): a = .785 + i * 1.5708; d.line([cx, cy, cx + math.cos(a) * R * .9, cy + math.sin(a) * R * .9], fill=L[4], width=2)   # four rays of light out of it
    elif e == 7:
        for i in range(5): gy = int(cy - span * .6 + i * span * .3); d.rectangle([cx - width - 8, gy, cx + width + 8, gy + 2], fill=Hc[3])   # glitch bands
    elif e == 8:
        for i in range(12): a = i * .5236; sx, sy = cx + math.cos(a) * R * .75, cy + math.sin(a) * R * .75; d.rectangle([sx - 2, sy - 2, sx + 2, sy + 2], fill=L[4] if i % 2 else Hc[2], outline=OUT)   # a ring of lit shards


define("rift", draw=rift, states=("open", "closed"), light={"dim": 4, "bright": 1, "color": "#a8f0ff", "kind": "glow"},
       axes={"colour": list(REALM)}, front=False, clear=2,
       ref="a tear a little taller than a person, its glow 6 ft across (Werewolf: The Apocalypse, the Umbra and the Gauntlet)")


# ================================================================ ritual circle
def ritualcircle(tm, x, y, w, h, st, v):
    """A ritual circle drawn on the floor by a mage, a sorcerer or a priest of the old ways, seen from above: the
    double ring with its signs written between, the figure inside it, and candles at its points (lit or out).
    What it is drawn in goes by age and means: chalk or charcoal for the poor, salt and blood for the desperate,
    paint for the middling, inlaid brass and silver for the rich chantry. Each land draws its own: a Solomonic
    circle with a pentagram and written names in Central and Atlantic Europe, a ring of runes in the North, red
    chalk and a hexagram round the Mediterranean, an eight-pointed star of interlaced squares with a magic square in
    the Islamic world, a coloured-powder mandala with gates and lotus petals in South Asia and the islands, a sand
    mandala in Tibet and on the steppe, the eight trigrams round a yin-yang in East Asia, a Kongo cross in white
    clay in Africa, a medicine wheel of stones in the Americas and the far north, a ring of shells and stones in
    Oceania. Future Darkness: lines of light set in the floor."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    lit = st == "lit"
    med = v.get("material", "chalk")
    if p.w >= 4 and e >= 2: med = "brass"
    inkc = {"chalk": (236, 232, 220), "salt": (210, 214, 216), "blood": (130, 20, 24), "charcoal": (36, 32, 32), "paint": p.acc[2], "brass": (210, 170, 70)}[med]
    if e == 8: inkc = lit_of(p, inkc)[2]
    I = rmp(inkc, 16)
    fl = rmp(mix(p.ground[2] if e <= 3 else p.stone[2], ERA_TONE[e][2], .35), 10)  # the floor it is drawn on
    d.ellipse([X0, Y0, X1, Y1], fill=fl[2])
    def chord(y_, col, wd=1, vert=False):                                           # a floor joint clipped to the round
        q = (R * .99) ** 2 - (y_ - (cx if vert else cy)) ** 2
        if q <= 0: return
        hw = math.sqrt(q)
        if vert: d.line([y_, cy - hw, y_, cy + hw], fill=col, width=wd)
        else: d.line([cx - hw, y_, cx + hw, y_], fill=col, width=wd)
    flo = {2: (R / 2.5, True, True), 3: (R / 7, False, False), 4: (R / 4, True, True), 5: (R / 3, False, False), 6: (R / 6, True, True), 7: (R / 1.5, True, True), 8: (R / 3.5, True, False)}.get(e)
    if flo:                                                                         # the age's floor under it: flags, boards, tiles, linoleum, concrete slabs
        stp, both, dark = flo; k = -R
        while k < R:
            chord(cy + k, fl[0] if dark else fl[4], 2 if e in (5, 7) else 1)
            if both: chord(cx + k, fl[0] if dark else fl[4], 2 if e == 7 else 1, vert=True)
            k += stp
        if e == 4:                                                                  # encaustic tiles: every other one dark
            i = 0; t_ = R / 4
            for gy in np.arange(-R, R, t_):
                for gx in np.arange(-R, R, t_):
                    if (int((gx + R) / t_) + int((gy + R) / t_)) % 2 and (gx + t_ / 2) ** 2 + (gy + t_ / 2) ** 2 < (R * .9) ** 2: d.rectangle([cx + gx + 1, cy + gy + 1, cx + gx + t_ - 1, cy + gy + t_ - 1], fill=fl[1])
    if e == 1:                                                                      # in the Long Night a broad ring of ash and soot laid round it as a ward
        d.ellipse([X0, Y0, X1, Y1], fill=mix(fl[2], (44, 36, 36), .6)); d.ellipse([cx - R * .78, cy - R * .78, cx + R * .78, cy + R * .78], fill=fl[1])
    wid = 3 if med in ("brass", "paint") else 2
    for q in (.96, .8): d.ellipse([cx - R * q, cy - R * q, cx + R * q, cy + R * q], outline=I[2], width=wid)
    if e == 3:                                                                      # the learned circle of the Age of Reason: a third ring and a quartering cross
        d.ellipse([cx - R * .6, cy - R * .6, cx + R * .6, cy + R * .6], outline=I[2], width=3)
        d.line([cx - R * .8, cy, cx + R * .8, cy], fill=I[1], width=2); d.line([cx, cy - R * .8, cx, cy + R * .8], fill=I[1], width=2)
    elif e == 6:                                                                    # a square of protection drawn round inside the ring
        q = R * .66; d.polygon([(cx - q, cy - q), (cx + q, cy - q), (cx + q, cy + q), (cx - q, cy + q)], outline=I[2], width=3)
    elif e == 7:                                                                    # the triangle of art sprayed in, point north
        q = R * .78; d.polygon([(cx, cy - q), (cx + q * .87, cy + q * .5), (cx - q * .87, cy + q * .5)], outline=I[2], width=4)
    for i in range(24 if p.w >= 2 else 14):                                       # the written signs between the rings
        a = i * 6.283 / (24 if p.w >= 2 else 14); gx, gy = cx + math.cos(a) * R * .88 - 2, cy + math.sin(a) * R * .88 - 2
        glyph(d, int(gx), int(gy), i + len(p.st), I[3] if med != "charcoal" else I[1], 4)
    st_ = p.st; r = R * .74
    def star(n, step, rr, col, wd=2, rot=-1.5708):
        pts = [(cx + math.cos(rot + k * 6.283 / n) * rr, cy + math.sin(rot + k * 6.283 / n) * rr) for k in range(n)]
        for k in range(n): d.line([pts[k], pts[(k + step) % n]], fill=col, width=wd)
        return pts
    pts = []
    if st_ in ("central", "atlantic"): pts = star(5, 2, r, I[2])
    elif st_ == "mediterranean": pts = star(6, 2, r, I[2])
    elif st_ == "northern":
        pts = star(8, 3, r, I[2]); [glyph(d, int(cx + math.cos(i * .785) * r * .5), int(cy + math.sin(i * .785) * r * .5), i, I[3], 6) for i in range(8)]
    elif st_ == "islamic":
        for rot in (0, .785): d.polygon([(cx + math.cos(rot + k * 1.5708) * r, cy + math.sin(rot + k * 1.5708) * r) for k in range(4)], outline=I[2], width=2)
        d.rectangle([cx - r * .3, cy - r * .3, cx + r * .3, cy + r * .3], outline=I[2]); [d.line([cx - r * .3 + k * r * .2, cy - r * .3, cx - r * .3 + k * r * .2, cy + r * .3], fill=I[1]) for k in (1, 2)]
        pts = [(cx + math.cos(k * .785) * r, cy + math.sin(k * .785) * r) for k in range(8)]
    elif st_ in ("southasia", "seasia", "steppe"):                                 # a coloured mandala
        cols = [(220, 60, 40), (240, 190, 40), (40, 120, 200), (40, 150, 80)] if med != "charcoal" else [I[2]] * 4
        d.rectangle([cx - r * .7, cy - r * .7, cx + r * .7, cy + r * .7], fill=cols[0], outline=OUT)
        for k, (gx, gy) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0))): d.rectangle([cx + gx * r * .7 - 6, cy + gy * r * .7 - 6, cx + gx * r * .7 + 6, cy + gy * r * .7 + 6], fill=cols[(k + 1) % 4], outline=OUT)
        d.ellipse([cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5], fill=cols[1], outline=OUT)
        for k in range(8): a = k * .785; d.ellipse([cx + math.cos(a) * r * .32 - 6, cy + math.sin(a) * r * .32 - 6, cx + math.cos(a) * r * .32 + 6, cy + math.sin(a) * r * .32 + 6], fill=cols[2], outline=OUT)
        d.ellipse([cx - r * .15, cy - r * .15, cx + r * .15, cy + r * .15], fill=cols[3], outline=OUT)
        pts = [(cx + gx * r * .9, cy + gy * r * .9) for gx, gy in ((0, -1), (1, 0), (0, 1), (-1, 0))]
    elif st_ == "eastasia":                                                        # the eight trigrams round a yin-yang
        for k in range(8):
            a = k * .785; tx, ty = cx + math.cos(a) * r * .7, cy + math.sin(a) * r * .7
            for j in range(3): d.line([tx - 6, ty - 4 + j * 4, tx + 6, ty - 4 + j * 4], fill=I[2], width=2); 
            if k % 2: d.line([tx - 1, ty, tx + 1, ty], fill=fl[2], width=2)
        d.ellipse([cx - r * .35, cy - r * .35, cx + r * .35, cy + r * .35], fill=(236, 232, 220), outline=OUT); d.pieslice([cx - r * .35, cy - r * .35, cx + r * .35, cy + r * .35], 90, 270, fill=(30, 28, 30))
        pts = [(cx + math.cos(k * .785) * r * .95, cy + math.sin(k * .785) * r * .95) for k in range(8)]
    elif st_ == "africa":                                                          # a Kongo cosmogram in white clay
        d.line([cx - r, cy, cx + r, cy], fill=I[2], width=3); d.line([cx, cy - r, cx, cy + r], fill=I[2], width=3)
        for gx, gy in ((cx - r, cy), (cx + r, cy), (cx, cy - r), (cx, cy + r)): d.ellipse([gx - 6, gy - 6, gx + 6, gy + 6], outline=I[2], width=2)
        pts = [(cx - r * .5, cy - r * .5), (cx + r * .5, cy - r * .5), (cx + r * .5, cy + r * .5), (cx - r * .5, cy + r * .5)]
    elif st_ in ("americas", "polar", "oceania"):                                  # a wheel of stones or shells
        S = p.stone if st_ != "oceania" else rmp((230, 220, 200), 12)
        for k in range(28): a = k * 6.283 / 28; blob(d, cx + math.cos(a) * r - 4, cy + math.sin(a) * r - 3, cx + math.cos(a) * r + 4, cy + math.sin(a) * r + 4, S)
        for k in range(4):
            a = k * 1.5708
            for j in range(1, 6): blob(d, cx + math.cos(a) * r * j / 6 - 3, cy + math.sin(a) * r * j / 6 - 3, cx + math.cos(a) * r * j / 6 + 3, cy + math.sin(a) * r * j / 6 + 3, S)
        blob(d, cx - 7, cy - 7, cx + 7, cy + 7, S)
        pts = [(cx + math.cos(k * 1.5708 + .785) * r * .6, cy + math.sin(k * 1.5708 + .785) * r * .6) for k in range(4)]
    if med == "salt":
        for k in range(30): a = rng.uniform(0, 6.28); q = R * rng.uniform(.78, .98); d.point((cx + math.cos(a) * q, cy + math.sin(a) * q), fill=(250, 250, 250))
    if med == "blood": d.ellipse([cx - 6, cy + r * .2, cx + 4, cy + r * .2 + 6], fill=(110, 16, 20))   # a bowl's spill
    nc = len(pts) if p.w >= 2 else min(3, len(pts))
    wax = (236, 226, 196) if p.w >= 2 else (200, 180, 140)
    if e >= 7 and p.w >= 3 or p.st == "eastasia": wax = (190, 40, 40)
    for k in range(nc):                                                            # candles at the points
        px_, py_ = pts[k]; px_, py_ = cx + (px_ - cx) * 1.12, cy + (py_ - cy) * 1.12
        if e == 8: d.rectangle([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=lit_of(p)[3] if lit else (60, 60, 70)); continue
        d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=wax, outline=OUT)
        if lit: d.ellipse([px_ - 1, py_ - 6, px_ + 1, py_ - 2], fill=(255, 220, 110)); d.point((px_, py_ - 6), fill=(255, 250, 220))
        else: d.point((px_, py_), fill=OUT)
    if lit: tm.hearths = getattr(tm, "hearths", []) + [(cx, cy, 120, None)]


define("ritualcircle", draw=ritualcircle, states=("lit", "out"), light={"dim": 3, "bright": .5, "color": "#ffc46b", "kind": "candle"},
       axes={"material": ["chalk", "salt", "blood", "charcoal", "paint"]}, low=True, front=False,
       ref="working circles 8 to 9 ft across (the Key of Solomon's 9 ft circle; Mage: The Ascension and Dark Ages: Vampire sorcery)")


# ================================================================ carved ritual pedestal
def ritualpedestal(tm, x, y, w, h, st, v):
    """A carved pedestal for a rite, in a sanctum, crypt or caern, seen from above: its carved top and rim, and on it
    the tools of the working: a bowl, a blade, candles, a book and a skull, more of them on a rich chantry's. By
    region: carved oak with knotwork in the North and the Atlantic lands, black stone in Central Europe, veined
    marble round the Mediterranean, carved stone with an inlaid star in the Islamic world, a lotus-carved altar in
    South Asia, a lacquered altar table in East Asia, a round carved hardwood drum in Africa and Oceania, basalt in the Americas.
    From the Long Night on an altar runner lies across it in the age's cloth (black, red velvet, green baize, purple,
    khaki drill, a long orange runner laid north to south in the Mid-Century, white, dark), and a rich chantry's top
    is inlaid with coloured stone in a gilt fillet. Dark Ages: rough-hewn and adzed. Long Night: stained dark, with an iron
    ring at each end. Renaissance: a brass bowl and a dagger. Age of Reason: a great open grimoire. Victorian: a
    planchette and a crystal. Great War: a field kit. Mid-Century: a tape machine. Modern: a laptop. Future Darkness:
    a dark plinth with a lit glyph."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    mat = {"northern": p.wood[2], "atlantic": p.wood[2], "central": (60, 58, 62), "mediterranean": (220, 214, 204), "islamic": (196, 170, 130), "southasia": (176, 90, 70),
           "eastasia": (150, 30, 30), "africa": (80, 50, 36), "oceania": (100, 64, 44), "americas": (70, 70, 76), "steppe": (196, 98, 42), "seasia": (128, 84, 48), "polar": (210, 204, 190)}.get(p.st)
    if e == 1: mat = mix(mat, (60, 30, 30), .2)
    if e == 8: mat = mix((40, 42, 50), mat, .6)
    S = rmp(fade(et(mat, e, .12), v), 14)
    shadow(tm, X0, Y0, X1, Y1, 3)
    drum = p.st in ("africa", "oceania")                                            # a round carved drum of hardwood
    if drum:
        d.ellipse([X0, Y0, X1, Y1], fill=S[2], outline=OUT); d.arc([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], 150, 280, fill=S[4]); d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=S[0])
    else:
        lidbox(d, X0, Y0, X1, Y1, S)
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=S[0])
    if p.st == "eastasia": [d.rectangle([qx, Y0, qx + 4, Y1], fill=S[0], outline=OUT) for qx in (X0, X1 - 4)]   # the altar table's rolled ends
    if p.w >= 4:                                                                    # a rich chantry's top inlaid with a panel of coloured stone in a gilt fillet
        d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=mix(S[3], p.acc[2], .55), outline=GOLD[3], width=2)
    cloth = {0: None, 1: mix((24, 20, 22), mat, .35), 2: (150, 24, 36), 3: (40, 100, 60), 4: (90, 40, 110), 5: (120, 110, 70), 6: (220, 120, 40), 7: (236, 236, 232), 8: (20, 22, 30)}[e]
    if cloth:                                                                      # the altar runner laid across it, the era's cloth
        Cl = rmp(mix(cloth, p.acc[2], .3 if e != 1 else .55), 12); ry = (Y1 - Y0) * .13
        if e == 6: d.rectangle([cx - ry, Y0 + 1, cx + ry, Y1 - 1], fill=Cl[2], outline=OUT)   # laid north to south, a long modern runner
        else: d.rectangle([X0 + 1, cy - ry, X1 - 1, cy + ry], fill=Cl[2], outline=OUT)
        if (p.w >= 3 or e == 8) and e != 6: d.line([X0 + 1, cy - ry + 2, X1 - 1, cy - ry + 2], fill=GOLD[3] if e != 8 else futs(p)); d.line([X0 + 1, cy + ry - 2, X1 - 1, cy + ry - 2], fill=GOLD[3] if e != 8 else futs(p))
    else:
        for k in range(4): d.line([X0 + 4, Y0 + 6 + k * 7, X1 - 4, Y0 + 8 + k * 7], fill=S[0])   # adze marks on the rough top
    if p.st in ("northern", "atlantic") and e <= 6:
        for k in range(0, X1 - X0 - 6, 6): d.arc([X0 + 3 + k, Y0, X0 + 9 + k, Y0 + 6], 0, 180, fill=S[4])   # carved knotwork rim
    if drum and e <= 6:
        for a in np.linspace(0, 6.28, 13)[:-1]: d.line([cx + math.cos(a) * (R - 5), cy + math.sin(a) * (R - 5), cx + math.cos(a) * (R - 1), cy + math.sin(a) * (R - 1)], fill=S[4])   # carved notches round the rim
    if p.st == "islamic": d.polygon([(cx, cy - 8), (cx + 8, cy), (cx, cy + 8), (cx - 8, cy)], outline=(40, 130, 140), width=2)
    items = 2 + p.w
    # the bowl
    bc = BRASS if (e >= 2 and p.w >= 3) else rmp((150, 90, 60), 14)
    if e == 8: bc = rmp(lit_of(p)[1], 14)
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=bc[2], outline=OUT); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(110, 20, 24) if e != 8 else bc[4])
    if items >= 3: d.line([X0 + 5, Y1 - 7, X0 + 18, Y1 - 12], fill=STEEL[4], width=2); d.rectangle([X0 + 3, Y1 - 8, X0 + 7, Y1 - 5], fill=(60, 40, 30))   # the blade
    if items >= 4:
        for k in range(2): kx = X1 - 7 - k * 6; d.ellipse([kx - 2, Y0 + 4, kx + 2, Y0 + 8], fill=(236, 226, 196), outline=OUT)   # candles
    if items >= 5:
        tool = {3: ((120, 70, 40), "book"), 4: ((200, 220, 240), "crystal"), 5: ((110, 104, 74), "kit"), 6: ((60, 60, 64), "tape"), 7: ((40, 40, 44), "laptop")}.get(e, ((90, 30, 30), "book"))
        d.rectangle([X0 + 4, Y0 + 4, X0 + 14, Y0 + 12], fill=tool[0], outline=OUT); d.line([X0 + 9, Y0 + 5, X0 + 9, Y0 + 11], fill=tone(tool[0], 50))
    if items >= 6: d.ellipse([X1 - 12, Y1 - 12, X1 - 4, Y1 - 4], fill=(226, 218, 196), outline=OUT); d.point((X1 - 9, Y1 - 9), fill=OUT); d.point((X1 - 7, Y1 - 9), fill=OUT)   # a skull
    if e == 3:                                                                     # a great open grimoire laid across the north of the top
        for sg in (-1, 1): d.rectangle([cx + min(0, sg * R * .6), Y0 + 4, cx + max(0, sg * R * .6), cy - 6], fill=(236, 226, 196), outline=OUT)
        for k in range(3): d.line([cx - R * .5, Y0 + 7 + k * 3, cx - 3, Y0 + 7 + k * 3], fill=(90, 70, 60)); d.line([cx + 3, Y0 + 7 + k * 3, cx + R * .5, Y0 + 7 + k * 3], fill=(90, 70, 60))
    if e == 1:                                                                     # an iron ring at each end, the plague years' heavy ironwork
        for qx in (X0 + 2, X1 - 2): d.ellipse([qx - 3, cy - 3, qx + 3, cy + 3], outline=IRON[3], width=2)
    if e == 8: glyph(d, X0 + 5, Y1 - 10, 3, lit_of(p)[3], 5)


define("ritualpedestal", draw=ritualpedestal, front=True, clear=2,
       ref="altar pedestals about 2 ft square and 3 ft high (church credence tables; chantry altars of the Order of Hermes)")


# ================================================================ rack of robot parts
ROBO = {"white": (226, 228, 230), "black": (44, 46, 52), "gunmetal": (86, 90, 98), "yellow": (226, 190, 40), "orange": (220, 110, 40), "red": (170, 40, 40),
        "blue": (40, 80, 160), "green": (50, 130, 80), "teal": (30, 130, 140), "violet": (100, 70, 150), "silver": (190, 194, 200), "rust": (130, 76, 46)}


def robotrack(tm, x, y, w, h, st, v):
    """A rack of robot parts against a laboratory or workshop wall, seen from above: the steel shelving's uprights and
    shelf edges, and laid along it arms, a head with its sensor eyes, a hand, servos, cable looms and boards, tagged
    for repair. The parts' shells are the maker's livery; the poorer shop's are scavenged and mismatched."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0
    key = v.get("colour", "white"); col = ROBO.get(key, (226, 228, 230)); ki = list(ROBO).index(key) if key in ROBO else 0
    C = rmp(fade(col, v), 16); L = lit_of(p, col)
    shadow(tm, X0, Y0, X1, Y1, 3)
    d.rectangle([X0, Y0, X1, Y1], fill=mix((50, 52, 58), col, .4), outline=OUT)      # the shelf, lined in the maker's colour
    for gx in (X0, X1 - 4): d.rectangle([gx, Y0, gx + 4, Y1], fill=STEEL[1], outline=OUT)
    d.line([X0 + 4, Y1 - 2, X1 - 4, Y1 - 2], fill=STEEL[3])
    order = [(ki + k) % 5 for k in range(5)]
    slot = (W_ - 10) / 5
    for j, part in enumerate(order):
        sx = X0 + 5 + j * slot; ex = sx + slot - 2; my = (Y0 + Y1) // 2
        Pc = C if (p.w >= 4 or j % 2 == 0) else rmp(mix(col, (150, 140, 120), .5), 14)   # mismatched in a poorer shop
        if part == 0:                                                              # an arm
            d.rounded_rectangle([sx, my - 5, ex, my + 5], 4, fill=Pc[2], outline=OUT); d.ellipse([sx + slot / 2 - 4, my - 4, sx + slot / 2 + 4, my + 4], fill=(40, 40, 44), outline=OUT)
        elif part == 1:                                                            # a head
            d.ellipse([sx + 2, Y0 + 4, ex - 2, Y1 - 4], fill=Pc[2], outline=OUT)
            for k in (-1, 1): d.ellipse([sx + slot / 2 + k * 5 - 2, my - 3, sx + slot / 2 + k * 5 + 2, my + 1], fill=L[3])
        elif part == 2:                                                            # a hand
            d.rectangle([sx + 2, my - 6, sx + slot * .5, my + 6], fill=Pc[2], outline=OUT)
            for k in range(4): d.line([sx + slot * .5, my - 5 + k * 3, ex - 1, my - 6 + k * 4], fill=Pc[1], width=2)
        elif part == 3:                                                            # servos and a cable loom
            for k in range(3): d.rectangle([sx + 2 + k * (slot / 3), my - 4, sx + k * (slot / 3) + slot / 3, my + 4], fill=(40, 40, 46), outline=OUT)
            d.arc([sx, Y0 + 2, ex, Y1 - 2], 200, 340, fill=(200, 60, 40) if ki % 2 else (40, 140, 200), width=2)
        else:                                                                      # boards
            d.rectangle([sx + 2, Y0 + 4, ex - 2, Y1 - 4], fill=(30, 100, 60), outline=OUT); d.line([sx + 4, my, ex - 4, my], fill=GOLD[3]); d.rectangle([sx + 5, Y0 + 7, sx + 9, Y0 + 11], fill=(30, 30, 30))
        d.rectangle([ex - 5, Y1 - 6, ex - 1, Y1 - 3], fill=(240, 240, 236))   # a repair tag


define("robotrack", draw=robotrack, global_from=gf(2020), axes={"colour": list(ROBO)}, nvar=12, front=True, clear=2.5,
       ref="steel parts shelving 6 ft long and 2 ft deep (industrial shelving units)")


# ================================================================ sacred tree hung with offerings
TREE_RAG = {"central": [(200, 40, 40), (240, 236, 220)], "atlantic": [(200, 190, 160), (110, 130, 90)], "northern": [(200, 40, 40), (226, 196, 80)],
            "mediterranean": [(236, 230, 214), (60, 100, 170)], "islamic": [(40, 140, 80), (240, 236, 220)], "steppe": [(40, 90, 190), (240, 236, 226)],
            "southasia": [(220, 40, 40), (240, 170, 30)], "eastasia": [(240, 240, 236), (200, 40, 40)], "seasia": [(240, 170, 30), (200, 40, 40)],
            "africa": [(240, 236, 220), (200, 60, 40)], "americas": [(200, 40, 40), (240, 220, 60)], "oceania": [(214, 190, 150), (60, 40, 30)], "polar": [(40, 90, 190), (200, 40, 40)]}


def sacredtree(tm, x, y, w, h, st, v):
    """A great sacred tree hung with offerings, seen from above: its spreading crown of leaf bundles, the trunk and
    roots showing through at the middle, a shrine, altar or cairn at its foot, and the offerings tied and hung through
    its branches in the colours its people use: rags at a clootie tree in the Atlantic lands, red and white ribbons
    in Central Europe and the North, green cloths at an Islamic saint's tree, blue khatas and prayer flags on the
    steppe, red threads and saffron cloth on a peepal or banyan in South Asia, a shimenawa rope with white paper at
    an East Asian shrine tree, saffron cloth round a spirit tree in the islands, white cloth on an African tree,
    the blue and red ribbons of the far north's larches. The offerings and the ground round it change with the ages:
    undyed rags and a ring of stones in the Dark Ages, a wooden fence in the Renaissance, a square stone kerb with benches in the Age of Reason, iron railings in the
    Victorian age, nylon ribbon and a concrete ring in the Mid-Century (whitewashed stones for the poor, a paved apron for
    the rich), plastic flowers, photographs and coins in
    Modern, small lit tokens in Future Darkness. The poor keep a small cairn at its foot, the middling a stone shrine, the rich a carved shrine house with
    steps and a great many offerings."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    G = rmp(mix(p.ground[2], ERA_TONE[e][2], .3), 12)
    ground(tm, X0, Y0, X1, Y1, G, rng)
    leaf = {"africa": (110, 120, 60), "polar": (60, 90, 70), "northern": (60, 100, 70), "steppe": (90, 120, 70), "islamic": (100, 130, 70), "mediterranean": (110, 130, 90),
            "southasia": (60, 120, 60), "seasia": (50, 120, 60), "oceania": (60, 120, 70), "eastasia": (70, 110, 70), "americas": (80, 120, 60), "atlantic": (46, 104, 52), "central": (96, 124, 48)}.get(p.st, (70, 116, 60))
    leaf = mix(leaf, {0: (60, 120, 50), 1: (50, 60, 50), 2: (110, 140, 50), 3: (140, 120, 50), 4: (50, 90, 50), 5: (110, 100, 70), 6: (150, 150, 90), 7: (70, 150, 70), 8: (40, 70, 80)}[e], .4 if e != 6 else .2)   # the season and air of the age
    if e == 1: leaf = mix(leaf, (40, 34, 30), .3)                                   # half dead in the Long Night
    L = rmp(leaf, 16)
    shadow(tm, cx - R * .9, cy - R * .9, cx + R * .9, cy + R * .9, 8, kind="ellipse")
    for i in range(22):                                                            # leaf bundles round the crown, open in the middle
        if e == 1 and i % 3 == 0: continue                                          # gaps in the thinned crown
        a = i * 2.39996; q = R * (.4 + .32 * ((i * 7) % 11) / 11)
        bx, by = cx + math.cos(a) * q, cy + math.sin(a) * q; br = R * .24
        d.ellipse([bx - br, by - br, bx + br, by + br], fill=L[1], outline=L[0])
        d.ellipse([bx - br * .8, by - br * .8, bx + br * .5, by + br * .5], fill=L[2]); d.ellipse([bx - br * .6, by - br * .6, bx, by], fill=L[3])
    Tk = rmp(et(p.wood[2] if p.st != "africa" else (150, 140, 120), e, .1), 14)       # the trunk and great limbs
    for a in np.linspace(0, 6.28, 6)[:-1]: d.line([cx, cy, cx + math.cos(a + .3) * R * .5, cy + math.sin(a + .3) * R * .5], fill=Tk[1], width=7)
    blob(d, cx - R * .16, cy - R * .16, cx + R * .16, cy + R * .16, Tk)
    rag = TREE_RAG.get(p.st, TREE_RAG["central"])
    if e <= 1: rag = [mix(c, (170, 160, 140), .5) for c in rag]                     # undyed and faded rags
    if e == 6: rag = [mix(c, (255, 60, 120), .25) for c in rag]                     # nylon ribbon
    if e == 5: rag = [mix(c, (150, 140, 96), .4) for c in rag]                       # khaki strips and tags left by soldiers
    n = 18 + p.w * 10
    for i in range(n):                                                             # the offerings through the branches
        a = i * 2.39996 + 1; q = R * (.3 + .6 * ((i * 5) % 13) / 13)
        ox, oy = cx + math.cos(a) * q, cy + math.sin(a) * q; c = rag[i % 2]
        if e == 7 and i % 4 == 0: d.rectangle([ox - 4, oy - 3, ox + 4, oy + 3], fill=(240, 240, 236), outline=OUT); d.rectangle([ox - 2, oy - 1, ox + 2, oy + 1], fill=(90, 120, 160))   # a photograph
        elif e == 8 and i % 3 == 0: d.rectangle([ox - 2, oy - 2, ox + 2, oy + 2], fill=lit_of(p, c)[3])
        else: d.line([ox - 3, oy - 4, ox + 2, oy + 6], fill=c, width=3)
    if p.st == "steppe" or p.st == "polar":                                         # prayer-flag lines across the crown
        for k in range(3):
            y_ = cy - R * .5 + k * R * .5; [d.rectangle([x_, y_, x_ + 6, y_ + 5], fill=[(40, 90, 190), (240, 236, 226), (200, 40, 40), (40, 150, 70), (240, 200, 40)][(x_ // 7) % 5]) for x_ in range(int(cx - R * .7), int(cx + R * .7), 8)]
    if p.st == "eastasia": d.ellipse([cx - R * .22, cy - R * .22, cx + R * .22, cy + R * .22], outline=(220, 200, 150), width=5)   # the shimenawa rope round the trunk
    Sh = rmp(mix(p.stone[2], p.acc[2], .3 if p.w >= 3 else 0), 14)                  # the shrine at its foot, south
    sw = R * (.12 + .04 * p.w); sy0 = cy + R * .28
    if p.w <= 1:                                                                   # the poor keep a small cairn of stones
        for k, (ox, oy) in enumerate(((-1, 0), (1, 0), (0, -.7), (0, .8))): blob(d, cx + ox * sw * .6 - 5, sy0 + sw * .5 + oy * sw * .5 - 4, cx + ox * sw * .6 + 5, sy0 + sw * .5 + oy * sw * .5 + 4, p.stone)
    else:
        lidbox(d, cx - sw, sy0, cx + sw, sy0 + sw * 1.2, Sh)
        if p.w >= 4:                                                               # a carved shrine house: its roof ridge, gilt eaves and steps before it
            d.line([cx, sy0 + 2, cx, sy0 + sw * 1.2 - 2], fill=Sh[4], width=2)
            d.rectangle([cx - sw + 3, sy0 + 3, cx + sw - 3, sy0 + 6], fill=GOLD[3])
            for k in (1, 2): d.rectangle([cx - sw + k * 3, sy0 + sw * 1.2 + (k - 1) * 4, cx + sw - k * 3, sy0 + sw * 1.2 + k * 4], fill=Sh[3 - k], outline=OUT)
    ring = {0: None, 1: None, 2: p.wood, 3: p.wood, 4: IRON, 5: IRON, 6: rmp((170, 168, 160), 12), 7: rmp((190, 186, 176), 12), 8: rmp((50, 54, 62), 12)}[e]
    if e == 6 and p.w <= 1:                                                         # whitewashed stones in place of the concrete ring
        for k in range(16): a = k * .3927; blob(d, cx + math.cos(a) * R * .95 - 6, cy + math.sin(a) * R * .95 - 5, cx + math.cos(a) * R * .95 + 6, cy + math.sin(a) * R * .95 + 5, rmp((236, 234, 226), 10))
    elif e == 6 and p.w >= 4:                                                       # a wide paved apron inside the concrete ring
        d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=ring[2], width=18); d.ellipse([X0 + 10, Y0 + 10, X1 - 10, Y1 - 10], outline=ring[0])
    elif ring is None:
        for k in range(16): a = k * .3927; blob(d, cx + math.cos(a) * R * .95 - 6, cy + math.sin(a) * R * .95 - 5, cx + math.cos(a) * R * .95 + 6, cy + math.sin(a) * R * .95 + 5, p.stone)
    elif e == 3:                                                                   # a square dressed-stone kerb with a bench at each side
        Sk = p.stone; q = R * .97; d.rectangle([cx - q * .74, cy - q * .74, cx + q * .74, cy + q * .74], outline=Sk[3], width=6)
        for gx, gy in ((0, -1), (1, 0), (0, 1), (-1, 0)): lidbox(d, cx + gx * q * .74 - 10 - abs(gy) * 12, cy + gy * q * .74 - 6 - abs(gx) * 12, cx + gx * q * .74 + 10 + abs(gy) * 12, cy + gy * q * .74 + 6 + abs(gx) * 12, Sk)
    else: d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=ring[2], width=4 if e <= 5 else 8)
    if e == 8: d.ellipse([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], outline=lit_of(p)[1])


define("sacredtree", draw=sacredtree, front=False,
       ref="old yews, oaks, peepals and banyans with crowns 18 to 25 ft across (clootie wells of Scotland; Bodhi trees; shinboku)")


# ================================================================ folding security gate
GATE_PAINT = {"black": (40, 40, 44), "brass": (200, 160, 70), "chrome": (206, 210, 216), "galvanised": (170, 176, 180), "green": (40, 100, 60), "grey": (120, 124, 130),
              "red": (160, 40, 40), "blue": (40, 70, 140), "white": (226, 226, 222), "bronze": (150, 110, 70), "orange": (220, 120, 40), "purple": (90, 60, 130)}


def scissorgate(tm, x, y, w, h, st, v):
    """A folding scissor gate across a shop front, a counting-house door or a lift, seen from above in its opening:
    the floor track, the end posts, and the lattice of crossed bars. Closed: the lattice drawn right across, its
    diamonds plain, a padlock at the meeting post. Open: folded up against one jamb into a tight bundle of bars,
    the track clear. Victorian: wrought iron with brass knobs. Great War: a bronze lift gate. Mid-Century: chrome or
    black steel. Modern: galvanized steel with a heavy padlock. Future Darkness: a composite gate with a lit lock.
    The paint is the maker's."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    col = GATE_PAINT.get(v.get("colour", "black"), (40, 40, 44))
    if e == 8: col = mix((46, 48, 56), col, .8)
    C = rmp(fade(col, v), 18)
    trk = {4: (110, 110, 112), 5: (170, 140, 80), 6: (196, 198, 200), 7: (90, 92, 96), 8: mix((30, 32, 38), futc(v.get("colour", "black"), GATE_PAINT), .55)}.get(e, (110, 110, 112))
    d.rectangle([X0, Y0, X1, Y1], fill=trk, outline=OUT)                             # the track, brass-shod or chromed or plain by age
    d.line([X0 + 2, cy, X1 - 2, cy], fill=(60, 60, 64))
    for px_ in (X0, X1 - 5): d.rectangle([px_, Y0 - 1, px_ + 5, Y1 + 1], fill=C[1], outline=OUT)   # end posts
    if st == "open":
        bx1 = X0 + 5 + max(10, W_ // 7)
        d.rectangle([X0 + 5, Y0, bx1, Y1], fill=C[2], outline=OUT)                    # the folded bundle
        for gx in range(X0 + 6, bx1, 2): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=C[4] if gx % 4 else C[0])
        return
    pitch = {4: 8, 5: 7, 6: 5, 7: 10, 8: 12}.get(e, 8)
    nb = (X1 - X0 - 10) // pitch; gx0 = X0 + 5 + ((X1 - X0 - 10) - nb * pitch) // 2
    for gx in range(gx0, gx0 + nb * pitch, pitch):                                  # the crossed bars, centred in the opening, each drawn with its mirror
        for o in (0, 1):
            d.line([gx + o, Y0, gx + pitch + o, Y1], fill=C[3 - o]); d.line([X0 + X1 - gx - o, Y0, X0 + X1 - gx - pitch - o, Y1], fill=C[3 - o])
        d.point((gx + pitch // 2, cy), fill=C[4])
        if e == 4 and p.w >= 3: d.rectangle([gx - 1, Y0 - 1, gx + 1, Y0 + 1], fill=BRASS[4])   # brass knobs
    d.line([X0 + 5, Y0, X1 - 5, Y0], fill=C[1]); d.line([X0 + 5, Y1, X1 - 5, Y1], fill=C[1])
    lx = (X0 + X1) // 2                                                             # the padlock at the meeting posts in the middle
    d.rectangle([lx - 3, cy - 3, lx + 3, cy + 3], fill=(BRASS if e < 7 else STEEL)[3] if e != 8 else lit_of(p)[2], outline=OUT)   # the padlock
    if e == 8: d.line([X0 + 5, cy, X1 - 5, cy], fill=lit_of(p, col)[1])


define("scissorgate", draw=scissorgate, global_from=gf(1880), states=("closed", "open"), openable="gate", axes={"colour": list(GATE_PAINT)}, nvar=12, front=False,
       ref="collapsible gates 4 to 10 ft wide in a floor track (Bostwick Gate and Shutter Co. patents 1880s; lift gates)")


# ================================================================ secret door in the panelling or wall
SECRET_WALL = {"central": (200, 180, 150), "atlantic": (120, 112, 104), "northern": (150, 100, 60), "mediterranean": (236, 232, 220), "islamic": (70, 130, 170),
               "steppe": (180, 70, 40), "southasia": (200, 90, 60), "eastasia": (120, 30, 30), "seasia": (150, 100, 50), "africa": (170, 110, 70),
               "americas": (210, 170, 120), "oceania": (90, 70, 50), "polar": (210, 210, 214)}


def secretdoor(tm, x, y, w, h, st, v):
    """A secret door in a wall, seen from above in its opening. Shut, it is a plain piece of the wall: the panelling,
    the bookcase's top and the book tops along it, or the dressed stone, in the wall's own material and colour, a
    hair-line joint the only sign. Open, the bookcase or panel stands ajar on its hidden pivot, swung into the room
    at an angle, the dark passage showing in the gap behind it. The wall by region and age: ashlar or brick before
    the Renaissance, oak or painted panelling after, a lacquer screen in East Asia, plaster in the Islamic world and
    round the Mediterranean, mud plaster in Africa; Victorian wallpaper, Mid-Century plasterboard, a Modern steel
    panel, a Future Darkness composite seam with a lit lock."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; W_, H_ = X1 - X0, Y1 - Y0
    kind = v.get("material", "panel")
    base = SECRET_WALL.get(p.st, (200, 180, 150))
    if kind == "stone": base = mix(p.stone[2], base, .3)
    eb = {0: (150, 140, 120), 1: (60, 52, 50), 2: (170, 120, 70), 3: (226, 220, 200), 4: (140, 60, 70), 5: (110, 124, 100), 6: (224, 220, 210), 7: (150, 156, 164), 8: (40, 44, 52)}[e]
    base = mix(base, eb, .42)                                                       # the age's wall finish over the land's
    if p.w <= 1: base = mix(base, (130, 120, 110), .3)
    if p.w >= 5: base = mix(base, p.acc[2], .3)
    Wc = rmp(fade(base, v), 14)
    def wallpiece(x0, x1):
        d.rectangle([x0, Y0, x1, Y1], fill=Wc[2], outline=OUT); d.line([x0 + 1, Y0 + 1, x1 - 1, Y0 + 1], fill=Wc[4])
        if p.w >= 4: d.rectangle([x0 + 1, Y0 + 1, x1 - 1, Y0 + 2], fill=GOLD[3])     # a gilt moulding on a rich wall
        elif p.w <= 1: [d.line([gx, Y0 + 1, gx, Y1 - 1], fill=Wc[0]) for gx in range(x0 + 5, x1, 7)]   # rough boards
        pt = {0: 16, 1: 9, 2: 12, 3: 20, 4: 7, 5: 14, 6: 28, 7: 18, 8: 10}[e]        # the rhythm of the age's joints, panels and bindings
        if kind == "stone":
            for gx in range(x0 + pt // 2, x1, pt): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=Wc[0], width=2 if e <= 1 else 1)
            if e in (2, 3, 5): d.line([x0 + 1, (Y0 + Y1) // 2, x1 - 1, (Y0 + Y1) // 2], fill=Wc[0])   # coursed
        elif kind == "bookcase":
            Bk = [(120, 40, 40), (40, 60, 110), (60, 90, 60), (150, 120, 70), (90, 60, 40)]
            d.rectangle([x0 + 2, Y0 + 2, x1 - 2, Y1 - 2], fill=Wc[0])
            bw_ = 2 + e % 3
            for k, gx in enumerate(range(x0 + 3, x1 - 3, bw_ + 1)): d.rectangle([gx, Y0 + 3 + (k % 2) * (e % 2), gx + bw_, Y1 - 3], fill=Bk[(k * 3 + p.w) % 5])
            for gx in range(x0 + pt, x1 - 3, pt * 2): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=Wc[3], width=2)   # the case's uprights
        else:
            for gx in range(x0 + 4, x1 - 4, pt): d.rectangle([gx, Y0 + 2, gx + pt - 4, Y1 - 2], outline=Wc[1] if e != 4 else Wc[4])
            if e == 4: d.line([x0 + 1, (Y0 + Y1) // 2, x1 - 1, (Y0 + Y1) // 2], fill=Wc[0], width=2)   # the dado rail
        if e == 6: d.rectangle([x0 + 1, Y1 - 3, x1 - 1, Y1 - 1], fill=Wc[4])          # a deep painted skirting
        if e == 7:                                                                  # a ribbed steel facing with its bolts
            for yy in (Y0 + 3, Y1 - 3): d.line([x0 + 1, yy, x1 - 1, yy], fill=Wc[0], width=2)
            for gx in range(x0 + 5, x1 - 3, 9): d.point((gx, (Y0 + Y1) // 2), fill=Wc[4])
    if st != "open":
        wallpiece(X0, X1)
        d.line([X0 + 3, Y0, X0 + 3, Y1], fill=Wc[1])                                 # the hair-line joint
        if e == 8: d.rectangle([X1 - 6, Y0 + 2, X1 - 3, Y1 - 2], fill=lit_of(p)[1])
        return
    d.rectangle([X0, Y0, X1, Y1], fill=(14, 12, 16), outline=OUT)                    # the dark passage behind
    ang = math.radians(40); L = W_ - 2
    pts = [(X0 + 1, Y0 + H_ // 2), (X0 + 1 + math.cos(ang) * L, Y0 + H_ // 2 + math.sin(ang) * L),
           (X0 + 1 + math.cos(ang) * L + math.sin(ang) * H_, Y0 + H_ // 2 + math.sin(ang) * L - math.cos(ang) * H_), (X0 + 1 + math.sin(ang) * H_, Y0 + H_ // 2 - math.cos(ang) * H_)]
    tm.shade((X0 + 4, Y1, X0 + L * .8, Y1 + L * .65), f=.6, kind="poly", pts=[(px_ + 3, py_ + 3) for px_, py_ in pts])
    d.polygon(pts, fill=Wc[2], outline=OUT)                                         # the panel or bookcase ajar on its pivot
    if kind == "bookcase":
        for k in range(1, 8):
            t = k / 8; a0 = (pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t)
            d.line([a0, (a0[0] + math.sin(ang) * (H_ - 2), a0[1] - math.cos(ang) * (H_ - 2))], fill=[(120, 40, 40), (40, 60, 110), (150, 120, 70)][k % 3], width=2)
    d.line([pts[0], pts[1]], fill=Wc[0], width=2)
    for k in range(5): d.point((X0 + 4 + k * 3, Y0 + H_ // 2), fill=(70, 66, 60))   # the step down into the passage


define("secretdoor", draw=secretdoor, states=("closed", "open"), openable="door", axes={"material": ["panel", "bookcase", "stone"]}, front=False,
       ref="hidden doors about 2 1/2 to 3 ft wide in panelling or bookcases (priest holes; Harvington Hall; Victorian jib doors)")


# ================================================================ shop or inn sign
SIGN_TRADE = ["boot", "loaf", "key", "tankard", "scissors", "bush", "fish", "pot"]


def shopsign(tm, x, y, w, h, st, v):
    """A shop or inn sign on its wall, seen from above: an iron bracket at each end and the board hung between them,
    leaning a little so its painted face shows foreshortened, with the trade's emblem: a boot, a loaf, a key, a
    tankard, scissors, an ale-stake bush, a fish or a pot. Dark Ages: a plain board with the emblem alone. Long
    Night: heavier ironwork and darker paint. Renaissance: a carved and painted board. Age of Reason: gilt letters
    and a scrolled bracket. Victorian: a painted fascia with lettering. Great War: an enamel sign. Mid-Century: neon
    tubes. Modern: a plastic lightbox. Future Darkness: a thin lit panel. Each land paints its own: calligraphy on
    green in the Islamic world, characters on black lacquer in East Asia, saffron and red in South Asia, a carved
    and painted board in the North."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    board = {"islamic": (40, 110, 70), "eastasia": (30, 26, 28), "southasia": (220, 140, 30), "northern": (150, 40, 34), "mediterranean": (230, 220, 200),
             "steppe": (196, 98, 42), "africa": (200, 130, 50), "seasia": (110, 140, 56), "americas": (56, 128, 150), "oceania": (110, 76, 50), "polar": (190, 186, 176),
             "central": (60, 90, 60), "atlantic": (40, 50, 90)}.get(p.st, (60, 90, 60))
    if p.w <= 1: board = mix(board, p.wood[2], .5)
    ink = {"eastasia": (220, 180, 70), "islamic": (240, 230, 200), "mediterranean": (40, 40, 60)}.get(p.st, (236, 226, 190) if p.w < 3 else (226, 190, 80))
    eb = {5: (30, 50, 120), 6: (30, 30, 40), 7: (236, 236, 230), 8: (40, 42, 50)}.get(e)
    if eb: board = mix(board, eb, {5: .2, 7: (.5 if p.w <= 1 else 0)}.get(e, .45))
    else: board = et(board, e, .15 if e != 1 else .25)
    B = rmp(fade(board, v), 16)
    for px_ in (X0, X1 - 4): d.rectangle([px_, Y0, px_ + 4, Y1], fill=IRON[2] if e < 8 else B[1], outline=OUT)   # the brackets' wall plates at both ends
    d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=IRON[1 if e != 3 else 3], width=2 if e != 1 else 3)   # the bar the board hangs from
    if e == 3:
        for ax_ in (X0 + 2, X1 - 14): d.arc([ax_, Y0 - 2, ax_ + 12, Y0 + 6], 0, 180, fill=IRON[3])   # scrolled brackets
    bx0, bx1 = X0 + 6, X1 - 6
    d.rectangle([bx0, Y0 + 2, bx1, Y1], fill=B[2], outline=OUT)                       # the board's leaning face
    d.line([bx0 + 1, Y0 + 3, bx1 - 1, Y0 + 3], fill=B[4])
    trade = SIGN_TRADE[(p.w + len(p.st) + e) % len(SIGN_TRADE)] if not v.get("contents") else v["contents"]
    cx = (X0 + X1) // 2; ex = cx - 5; em = (180, 140, 70) if e != 6 else (255, 90, 160)
    if e == 6: em = [(255, 80, 150), (80, 220, 255), (255, 200, 60)][p.w % 3]
    if e == 8: em = lit_of(p)[3]
    if trade == "boot": d.polygon([(ex, Y0 + 3), (ex + 4, Y0 + 3), (ex + 4, Y1 - 3), (ex + 9, Y1 - 2), (ex, Y1 - 2)], fill=em)
    elif trade == "loaf": d.ellipse([ex, Y0 + 3, ex + 10, Y1 - 2], fill=(200, 150, 80))
    elif trade == "key": d.ellipse([ex, Y0 + 3, ex + 4, Y1 - 3], outline=em); d.line([ex + 4, cy, ex + 11, cy], fill=em)
    elif trade == "tankard": d.rectangle([ex, Y0 + 3, ex + 6, Y1 - 2], fill=STEEL[3]); d.arc([ex + 5, Y0 + 3, ex + 9, Y1 - 3], 270, 90, fill=STEEL[3])
    elif trade == "scissors": d.line([ex, Y0 + 3, ex + 10, Y1 - 2], fill=STEEL[4]); d.line([ex, Y1 - 2, ex + 10, Y0 + 3], fill=STEEL[4])
    elif trade == "bush": d.ellipse([ex, Y0 + 2, ex + 10, Y1], fill=(60, 110, 50))
    elif trade == "fish": d.polygon([(ex, cy), (ex + 7, Y0 + 3), (ex + 10, cy), (ex + 7, Y1 - 2)], fill=(150, 170, 190))
    else: d.ellipse([ex, Y0 + 3, ex + 9, Y1 - 2], fill=(60, 60, 64))
    if e >= 2:                                                                       # the lettering, either side of the emblem
        for la, lb in ((bx0 + 3, cx - 9), (cx + 9, bx1 - 3)):
            if p.st in ("islamic", "southasia"): d.arc([la, Y0 + 2, lb, Y1 + 4], 200, 340, fill=ink, width=1)
            elif p.st == "eastasia": [glyph(d, gx, Y0 + 3, gx, ink, 3) for gx in range(la, lb - 3, 6)]
            else:
                for gx in range(la, lb, 4): d.line([gx, Y0 + 4, gx, Y1 - 3], fill=ink if e != 6 else em)
    if e == 6: d.rectangle([bx0, Y0 + 2, bx1, Y1], outline=em)                       # the neon tube round it
    if e == 7:
        d.rectangle([bx0 + 1, Y0 + 3, bx1 - 1, Y1 - 1], outline=(255, 255, 240) if p.w >= 2 else B[1])
        if p.w >= 4: d.rectangle([bx0 + 2, (Y0 + Y1) // 2 + 1, bx1 - 2, Y1 - 2], fill=p.acc[3])   # a second colour band on a chain's sign
    if e == 5:
        d.rectangle([bx0, Y0 + 2, bx1, Y1], outline=(240, 240, 236))                # the enamel sign's white rim
        if p.w >= 4: [d.rectangle([la, Y0 + 3, lb, Y1 - 2], outline=(240, 240, 236)) for la, lb in ((bx0 + 2, cx - 8), (cx + 8, bx1 - 2))]   # framed panels either side
    elif p.w >= 4 and e != 6: d.rectangle([bx0 + 1, Y0 + 3, bx1 - 1, Y1 - 1], outline=GOLD[3])   # a gilt edge on a rich house's board
    if p.w <= 1 and e <= 3: d.line([bx0 + 2, (Y0 + Y1) // 2, bx1 - 2, (Y0 + Y1) // 2], fill=B[0])   # a poor board of two planks


define("shopsign", draw=shopsign, front=True, clear=0,
       ref="hanging signs and fascia boards about 3 to 4 ft long (London sign regulations 1762; inn signs)")


# ================================================================ parabolic solar cooker
SOLAR = {"foil": (206, 210, 216), "steel": (176, 182, 190), "mirror": (190, 214, 230), "gold": (220, 196, 120), "black": (50, 52, 58), "red": (180, 50, 40),
         "blue": (60, 100, 170), "green": (60, 130, 80), "orange": (220, 120, 40), "white": (230, 230, 226), "copper": (190, 120, 80), "grey": (130, 134, 140)}


def solarcooker(tm, x, y, w, h, st, v):
    """A parabolic solar cooker in a yard, camp or on a roof, seen from above: the great dish of reflecting petals
    on its stand, the pot held at the focus on its arm, the glare where the sun meets it and steam from the pot when
    it is cooking. Mid-Century: bare aluminium sheet petals riveted to a steel frame. Modern: polished panels or a
    foil umbrella dish. Future Darkness: a dark-framed mirror dish with a lit tracker. The petals' backs and frame are
    the maker's colour."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    key = v.get("colour", "foil"); col = SOLAR.get(key, (206, 210, 216))
    rim = rmp(fade(col, v), 16)
    M = rmp(fade(mix((210, 214, 220), col, .6), v), 22)
    M2 = rmp(fade(mix((214, 218, 224), futc(key, SOLAR, 5), .5), v), 22)            # petals of a second colour between the others on the later kits
    if e == 8: M = rmp(mix((150, 180, 210), col, .55), 22); rim = rmp(mix((40, 42, 50), futc(key, SOLAR), .6), 14); M2 = rmp(mix((30, 34, 44), futc(key, SOLAR), .3), 10)
    shadow(tm, X0, Y0, X1, Y1, 4, kind="ellipse")
    d.ellipse([X0, Y0, X1, Y1], fill=rim[1], outline=OUT)
    n = {6: 8, 7: 12, 8: 16}[e]
    for k in range(n):                                                             # the petals, lit to the north-west
        a0 = k * 360 / n; t = math.cos(math.radians(a0 + 180 / n) - 3.93)
        MM = M2 if (e >= 7 and k % 2) else M
        c = MM[2 + int(round(t * 1.4))] if abs(t) > .1 else MM[2]
        d.pieslice([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], a0, a0 + 360 / n - 1.5, fill=c)
    for k in range(n): a = math.radians(k * 360 / n); d.line([cx, cy, cx + math.cos(a) * (R - 3), cy + math.sin(a) * (R - 3)], fill=rim[0] if e == 6 else M[0])
    if e == 6:
        for k in range(n): a = math.radians(k * 360 / n + 10); d.point((cx + math.cos(a) * R * .7, cy + math.sin(a) * R * .7), fill=OUT)   # rivets
    d.line([cx, cy + R * .1, cx, Y1 - 3], fill=OUT, width=3)                          # the pot arm
    pr_ = R * .2; cooking = st == "lit"
    pc = rmp((40, 40, 44) if p.w <= 1 else (60, 60, 70), 12)
    d.ellipse([cx - pr_ * 1.6, cy - pr_ * 1.6, cx + pr_ * 1.6, cy + pr_ * 1.6], fill=(255, 250, 200) if cooking else M[3])   # the glare at the focus
    d.ellipse([cx - pr_, cy - pr_, cx + pr_, cy + pr_], fill=pc[2], outline=OUT); d.ellipse([cx - pr_ * .6, cy - pr_ * .6, cx + pr_ * .6, cy + pr_ * .6], fill=pc[1])
    if cooking:
        for k in range(3): d.arc([cx - 6 + k * 4, cy - pr_ - 10, cx + k * 4, cy - pr_ - 2], 200, 340, fill=(240, 240, 240), width=2)
    if e == 8: d.rectangle([X1 - 10, Y1 - 10, X1 - 4, Y1 - 4], fill=lit_of(p, col)[2], outline=OUT)


define("solarcooker", draw=solarcooker, global_from=gf(1955), states=("lit", "out"), axes={"colour": list(SOLAR)}, nvar=12,
       ref="parabolic solar cookers with dishes about 4 ft across (Ghai's Indian dish cooker 1950s; SK-14 cooker)")


# ================================================================ terrarium or vivarium
TERRA = {"ferns": [(60, 130, 60), (90, 160, 80)], "moss": [(90, 140, 60), (120, 160, 70)], "lizard": [(140, 120, 70), (100, 170, 60)], "snake": [(170, 140, 90), (60, 50, 40)],
         "frog": [(70, 120, 60), (240, 110, 40)], "orchid": [(60, 120, 60), (220, 120, 200)], "cactus": [(200, 180, 130), (80, 140, 80)], "spider": [(150, 120, 80), (40, 34, 30)],
         "beetles": [(110, 90, 60), (40, 110, 120)], "seedlings": [(110, 80, 60), (130, 200, 90)], "fish": [(90, 150, 190), (240, 150, 40)], "empty": [(130, 110, 90), (130, 110, 90)]}


def terrarium(tm, x, y, w, h, st, v):
    """A terrarium or vivarium on a table, seen from above through its glass: the frame, the soil or sand bed and what
    lives in it, ferns and moss, an orchid or a cactus, or a lizard, snake, frog or spider with its rock and water
    dish. Victorian: a Wardian case with an iron and glass ridge roof over ferns. Great War: a brass-framed case.
    Mid-Century: an aquarium-type tank with a hood and lamp. Modern: a glass vivarium with a mesh top and a heat
    lamp. Future Darkness: a sealed dark tank with a lit edge."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    key = v.get("contents", "ferns"); a_, b_ = TERRA.get(key, TERRA["ferns"])
    Fr = {4: IRON, 5: BRASS, 6: rmp((60, 60, 64), 12), 7: rmp((30, 30, 34), 10), 8: rmp((44, 46, 54), 10)}[e]
    soil = {"ferns": (70, 50, 36), "moss": (120, 100, 60), "lizard": (210, 180, 120), "snake": (150, 70, 40), "frog": (40, 70, 50), "orchid": (170, 110, 70),
            "cactus": (236, 220, 180), "spider": (110, 70, 40), "beetles": (60, 46, 40), "seedlings": (40, 34, 30), "fish": (70, 140, 180), "empty": (180, 170, 160)}.get(key, (90, 66, 46))
    ki = list(TERRA).index(key) if key in TERRA else 0
    d.rectangle([X0, Y0, X1, Y1], fill=Fr[2], outline=OUT)
    d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=soil)
    A = rmp(a_, 14); B = rmp(b_, 16)
    if key != "empty":
        nb = 1 + ki % 4
        for k in range(nb): bx = X0 + 4 + k * (X1 - X0 - 8) / 4; d.ellipse([bx, Y0 + 3, bx + 7, Y1 - 3], fill=A[2 + k % 2], outline=A[0])
        if key in ("lizard", "snake", "frog", "spider", "beetles", "fish"):
            if key == "snake": d.arc([cx - 8, cy - 5, cx + 4, cy + 5], 0, 300, fill=B[2], width=3)
            else: d.ellipse([cx - 4, cy - 3, cx + 4, cy + 3], fill=B[2], outline=OUT); d.line([cx + 4, cy, cx + 8, cy + 1], fill=B[2], width=2)
        else: d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=B[3])
    if e == 4: d.line([X0 + 1, cy, X1 - 1, cy], fill=Fr[3], width=2)                # the ridge of the Wardian case
    if e == 6: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 5], fill=Fr[2]); d.rectangle([cx - 4, Y0 + 1, cx + 4, Y0 + 4], fill=(250, 240, 200))   # hood and lamp
    if e == 7: d.ellipse([X1 - 9, Y0 + 2, X1 - 3, Y0 + 8], fill=(250, 140, 60), outline=OUT)   # the heat lamp
    if e == 8: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=lit_of(p)[2])
    d.line([X0 + 3, Y0 + 3, X0 + 9, Y0 + 3], fill=(240, 250, 255))                     # glint on the glass


define("terrarium", draw=terrarium, global_from=gf(1842), axes={"contents": list(TERRA)}, nvar=12, front=False,
       ref="Wardian cases and vivaria about 2 ft by 1 ft (Nathaniel Ward, On the Growth of Plants in Closely Glazed Cases, 1842)")


# ================================================================ trip hammer or power hammer
HAMMER_PAINT = {"black": (40, 40, 44), "green": (60, 100, 70), "grey": (120, 124, 130), "red": (160, 40, 40), "blue": (40, 70, 140), "cream": (210, 200, 170),
                "maroon": (110, 30, 40), "olive": (100, 100, 60), "orange": (210, 110, 40), "teal": (30, 110, 110), "brown": (110, 76, 50), "yellow": (210, 180, 50)}


def triphammer(tm, x, y, w, h, st, v):
    """A trip hammer or power hammer in a smithy, mill or works, seen from above, its anvil end to the south. Dark Ages
    to Age of Reason: a water-driven helve hammer: the long timber helve with its iron head over the anvil block at
    the south, the pivot in its timber frame, and the cam shaft from the wheel across the north end, its cams
    lifting the helve's tail. By region: a heavy oak frame with a cap beam in Europe, lashed round posts like a rice
    pounder's in South, East and South-east Asia and Oceania, thin posts and a stone anvil block in the dry lands. Dark Ages: rough timber. Long Night: iron-banded. Renaissance: a larger frame
    with a second hammer. Age of Reason: an iron-shod helve and a stone anvil base. The rich mill adds a forge hearth and a quench tub beside the
    anvil. From the Victorian age a factory
    machine the same the world over: a steam hammer with its cylinder (a treadle Oliver with a spring pole in a small shop, a single
    arched frame for a middling one, two standards for a big one), a belt-driven spring hammer, a
    pneumatic hammer in machine paint, a modern guarded hammer, a Future Darkness hydraulic press-hammer (four columns for the big ones). The paint
    is the maker's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    ground(tm, X0, Y0, X1, Y1, rmp(mix(p.ground[2], (60, 50, 44), .3), 12), rng, "rect")
    if e <= 3:
        Wd = rmp(et(p.wood[2], e, .25 if e != 1 else .45), 16)
        if p.w >= 4: Wd = rmp(mix(Wd[2], p.acc[2], .3))
        ay = Y0 + int(H_ * .12)
        d.rectangle([X0 + 2, ay - 6, X1 - 2, ay + 6], fill=Wd[1], outline=OUT)       # the cam shaft across the north
        endgrain(tm, X0 + 6, ay, 6, Wd); endgrain(tm, X1 - 6, ay, 6, Wd)
        for k in range(4 if e != 2 else 6): d.rectangle([cx - 10 + (k % 2) * 14, ay - 9, cx - 4 + (k % 2) * 14, ay + 9], fill=Wd[3], outline=OUT)   # the cams
        helves = [cx] if e != 2 else [cx - W_ // 5, cx + W_ // 5]
        if e == 2:
            d.rectangle([X0 + 2, ay - 6, X1 - 2, ay + 6], fill=Wd[1], outline=OUT)
        for hx in helves:
            py_ = Y0 + int(H_ * .45)
            if p.st in ("central", "atlantic", "northern"):                         # a heavy oak frame: two posts and a cap beam across
                d.rectangle([hx - 16, py_ - 3, hx + 16, py_ + 3], fill=Wd[1], outline=OUT)
                for fx in (hx - 13, hx + 9): d.rectangle([fx, py_ - 9, fx + 4, py_ + 9], fill=Wd[2], outline=OUT)
            elif p.st in ("southasia", "eastasia", "seasia", "oceania"):          # lashed round posts, the rice pounder's frame
                for fx in (hx - 10, hx + 10):
                    d.ellipse([fx - 4, py_ - 4, fx + 4, py_ + 4], fill=Wd[2], outline=OUT); d.line([fx - 4, py_, fx + 4, py_], fill=(170, 150, 100), width=2)
            else:                                                                  # a lighter frame of the dry lands: thin posts
                for fx in (hx - 10, hx + 8): d.rectangle([fx, py_ - 6, fx + 2, py_ + 6], fill=Wd[2], outline=OUT)
            d.rectangle([hx - 4, ay + 6, hx + 4, Y1 - int(H_ * .2)], fill=Wd[3], outline=OUT)   # the helve
            d.line([hx - 3, ay + 7, hx - 3, Y1 - int(H_ * .2) - 1], fill=Wd[4])
            if e == 1: [d.rectangle([hx - 5, yy, hx + 5, yy + 3], fill=IRON[2]) for yy in range(ay + 20, Y1 - int(H_ * .2), 25)]
            if e == 3: d.rectangle([hx - 5, ay + 6, hx + 5, ay + 30], fill=IRON[2], outline=OUT)
            hy = Y1 - int(H_ * .2)
            d.rectangle([hx - 9, hy - 4, hx + 9, hy + 8], fill=IRON[2], outline=OUT); d.line([hx - 8, hy - 3, hx + 8, hy - 3], fill=IRON[4])   # the iron head
            An = p.stone if e == 3 or p.st not in ("central", "atlantic", "northern", "southasia", "eastasia", "seasia", "oceania") else Wd   # a stone anvil block where timber is short
            d.rectangle([hx - 12, hy + 10, hx + 12, Y1 - 2], fill=An[1], outline=OUT); d.rectangle([hx - 8, hy + 12, hx + 8, Y1 - 5], fill=IRON[3], outline=OUT)   # the anvil on its block
        if p.st in ("eastasia", "seasia"): d.rectangle([X0 + 4, Y1 - 18, X0 + 22, Y1 - 4], fill=rmp((150, 120, 70))[2], outline=OUT)   # a mortar trough beside
        elif p.w >= 4:                                                              # the rich mill's forge hearth and quench tub either side of the anvil
            hy = Y1 - int(H_ * .2)
            d.rectangle([X0 + 4, hy - 2, X0 + 24, hy + 18], fill=p.stone[2], outline=OUT); d.rectangle([X0 + 8, hy + 2, X0 + 20, hy + 14], fill=(60, 40, 34)); d.rectangle([X0 + 11, hy + 5, X0 + 17, hy + 11], fill=(230, 120, 40))
            d.ellipse([X1 - 24, hy - 2, X1 - 4, hy + 18], fill=Wd[2], outline=OUT); d.ellipse([X1 - 20, hy + 2, X1 - 8, hy + 14], fill=(50, 70, 80))
        d.rectangle([X0, ay - 2, X0 + 3, ay + 2], fill=(70, 110, 150))               # the wheel's water race end
    else:
        key = v.get("colour", "black"); col = HAMMER_PAINT.get(key, (40, 40, 44))
        if e == 8: col = mix((44, 46, 54), col, .85)
        C = rmp(fade(col, v), 16)
        shadow(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, 4)
        model = list(HAMMER_PAINT).index(key) % 4 // 2 if key in HAMMER_PAINT else 0   # the maker's model
        if e == 4 and p.w <= 2:                                                     # a small shop's treadle Oliver: a spring pole over a timber frame
            Wd = rmp((120, 86, 56), 14)
            if model: d.rectangle([cx - 30, Y0 + 18, cx + 30, Y1 - 12], fill=C[1], outline=OUT)   # this make stands on a cast bed plate
            d.rectangle([X0 + 6, Y0 + 8, X1 - 6, Y0 + 16], fill=Wd[2], outline=OUT); d.line([X0 + 8, Y0 + 9, X1 - 8, Y0 + 9], fill=Wd[4])   # the spring pole
            for sx in (cx - 24, cx + 18): d.rectangle([sx, Y0 + 16, sx + 6, Y1 - 34], fill=Wd[1] if model == 0 else C[1], outline=OUT)   # the frame posts, timber or the maker's cast iron
            d.rectangle([cx - 3, Y0 + 16, cx + 3, Y1 - 40], fill=C[2], outline=OUT)   # the hammer arm in the maker's paint
            d.rectangle([cx - 28, Y1 - 10, cx + 28, Y1 - 5], fill=Wd[2], outline=OUT)   # the treadle bar
        elif e == 4 and p.w <= 3:                                                   # a small single-frame steam hammer: one arched standard behind
            if model: d.rounded_rectangle([cx - 22, Y0 + 30, cx + 22, Y1 - 2], 8, fill=C[1], outline=OUT)   # this make's open-fronted C-frame down to the anvil bed
            d.rounded_rectangle([cx - 26, Y0 + 10, cx + 26, Y0 + 44], 12, fill=C[2], outline=OUT); d.line([cx - 20, Y0 + 12, cx + 20, Y0 + 12], fill=C[4])
            d.ellipse([cx - 14, Y0 + 36, cx + 14, Y0 + 64], fill=C[3], outline=OUT); d.ellipse([cx - 7, Y0 + 43, cx + 7, Y0 + 57], fill=C[1], outline=OUT)
            d.line([cx, Y0 + 10, cx, Y0 + 2], fill=STEEL[2], width=3)                  # the steam pipe
            if model: d.rectangle([cx - 10, Y0 + 16, cx + 10, Y0 + 30], fill=C[1], outline=OUT); d.line([cx - 8, Y0 + 18, cx + 8, Y0 + 18], fill=C[4])   # this make's square valve chest
        elif e == 4:                                                                # a double-frame steam hammer: two standards, the cylinder above
            for sx in (X0 + 6, X1 - 22): lidbox(d, sx, Y0 + 20, sx + 16, Y1 - 20, C)
            d.ellipse([cx - 20, Y0 + 30, cx + 20, Y0 + 70], fill=C[3], outline=OUT); d.ellipse([cx - 10, Y0 + 40, cx + 10, Y0 + 60], fill=C[1], outline=OUT)
            d.line([X1 - 6, Y0 + 40, X1 - 2, Y0 + 4], fill=STEEL[2], width=3)          # the steam pipe
        else:
            frame = (X0 + 14, Y0 + 14, X1 - 14, Y1 - 30)
            d.rounded_rectangle(frame, 10, fill=C[2], outline=OUT); d.line([frame[0] + 6, frame[1] + 2, frame[2] - 6, frame[1] + 2], fill=C[4])
            if e == 5:                                                              # belt drive and flywheel at the top
                d.ellipse([cx - 22, Y0 + 2, cx + 22, Y0 + 30], fill=C[1], outline=OUT); d.ellipse([cx - 6, Y0 + 10, cx + 6, Y0 + 22], fill=STEEL[3])
                d.line([cx + 20, Y0 + 16, X1 - 2, Y0 + 2], fill=(110, 80, 50), width=3)
            elif e == 6: d.ellipse([cx - 18, Y0 + 24, cx + 18, Y0 + 60], fill=C[3], outline=OUT)   # the compressor cylinder
            elif e == 7: d.rectangle([frame[0] - 6, frame[3] - 6, frame[2] + 6, frame[3] + 6], fill=(230, 196, 40), outline=OUT)   # the guard
            else:
                d.rectangle([frame[0] + 4, frame[1] + 10, frame[2] - 4, frame[1] + 16], fill=lit_of(p, col)[2])
                if p.w >= 4:                                                        # a four-column hydraulic press-hammer
                    for qx, qy in ((frame[0] + 4, frame[1] + 22), (frame[2] - 14, frame[1] + 22), (frame[0] + 4, frame[3] - 14), (frame[2] - 14, frame[3] - 14)): d.ellipse([qx, qy, qx + 10, qy + 10], fill=STEEL[3], outline=OUT)
                else: d.rectangle([cx - 10, frame[1] + 26, cx + 10, frame[3] - 8], fill=C[1], outline=OUT)   # a single ram housing
        d.rectangle([cx - 14, Y1 - 28, cx + 14, Y1 - 4], fill=IRON[1], outline=OUT); d.rectangle([cx - 9, Y1 - 24, cx + 9, Y1 - 10], fill=IRON[3], outline=OUT)   # the anvil die
        d.rectangle([cx - 8, Y1 - 40, cx + 8, Y1 - 28], fill=STEEL[2], outline=OUT)     # the tup
    if p.st != "eastasia" and e <= 5: d.ellipse([cx + 16, Y1 - 14, cx + 26, Y1 - 6], fill=(240, 140, 40))   # a glowing bar on the floor


define("triphammer", draw=triphammer, global_from=gf(1840), axes={"colour": list(HAMMER_PAINT)}, nvar=12, front=True, clear=3, states=("one",),
       ref="helve hammers with an 8 ft helve and a 5 ft frame (Agricola, De re metallica 1556; Nasmyth steam hammer 1840; Massey power hammers)")


# ================================================================ entertainment centre or TV cabinet
TVCAB = {"teak": (150, 96, 56), "black": (40, 40, 44), "white": (230, 230, 226), "oak": (170, 130, 80), "walnut": (100, 66, 44), "grey": (140, 144, 150),
         "cherry": (140, 60, 44), "beech": (210, 180, 130), "red": (170, 40, 40), "blue": (50, 80, 140), "silver": (190, 194, 200), "green": (60, 100, 70)}


def tvcabinet(tm, x, y, w, h, st, v):
    """An entertainment centre or TV cabinet against a parlour wall, seen from above: the long low cabinet, the
    television on it, the players and speakers beside it. Mid-Century: a teak or walnut console with a deep CRT set,
    its vent grille on top, a speaker grille either side. Modern: a black-ash unit with a big CRT then a flat screen,
    a video or DVD player, a games console and speakers. Future Darkness: a long low dark unit with a thin lit
    screen and a soundbar. Open: the doors at the front swung out, the discs and tapes inside showing. The finish
    is the maker's."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    key = v.get("colour", "teak"); col = TVCAB.get(key, (150, 96, 56)); ki = list(TVCAB).index(key) if key in TVCAB else 0
    if e == 8: col = mix((40, 42, 50), col, .55)
    C = rmp(fade(col, v), 16)
    shadow(tm, X0, Y0, X1, Y1, 3)
    slab(tm, X0, Y0, X1, Y1, C, "x" if e < 8 else None, rng=rng)
    if e == 6:                                                                      # a deep CRT set and its vents
        tw = int(W_ * .42); d.rectangle([cx - tw // 2, Y0 + 2, cx + tw // 2, Y1 - 4], fill=(60, 50, 44) if ki % 2 else (110, 80, 54), outline=OUT)
        for gy in range(Y0 + 6, Y1 - 8, 3): d.line([cx - tw // 2 + 6, gy, cx + tw // 2 - 6, gy], fill=(30, 26, 24))
        for sx0 in (X0 + 4, X1 - 26):                                               # the speaker grilles either side of the set
            d.rectangle([sx0, Y0 + 4, sx0 + 22, Y1 - 6], fill=C[1], outline=OUT)
            for gx in range(sx0 + 3, sx0 + 21, 3): d.line([gx, Y0 + 6, gx, Y1 - 8], fill=C[0])
    elif e == 7:
        flat = p.w >= 3
        if flat: d.rectangle([cx - W_ * .3, Y0 + 3, cx + W_ * .3, Y0 + 8], fill=(20, 20, 24), outline=OUT); d.rectangle([cx - 8, Y0 + 8, cx + 8, Y0 + 14], fill=(40, 40, 44), outline=OUT)
        else: d.rectangle([cx - W_ * .22, Y0 + 2, cx + W_ * .22, Y1 - 4], fill=(40, 40, 44), outline=OUT); [d.line([cx - W_ * .2, gy, cx + W_ * .2, gy], fill=(24, 24, 28)) for gy in range(Y0 + 5, Y1 - 6, 3)]
        for px0_ in (X0 + 4, X1 - 30): d.rectangle([px0_, Y1 - 14, px0_ + 26, Y1 - 6], fill=(30, 30, 34), outline=OUT); d.point((px0_ + 13, Y1 - 10), fill=(60, 220, 80))   # the video player and the games console
        for sx in (X0 + 2, X1 - 14): d.rectangle([sx, Y0 + 2, sx + 12, Y0 + 14], fill=(30, 30, 34), outline=OUT); d.ellipse([sx + 3, Y0 + 5, sx + 9, Y0 + 11], fill=(70, 70, 76))   # speakers
    else:
        d.rectangle([X0 + 6, Y0 + 2, X1 - 6, Y0 + 5], fill=(14, 14, 18), outline=OUT); d.line([X0 + 8, Y0 + 4, X1 - 8, Y0 + 4], fill=lit_of(p, col)[2])   # the thin screen
        d.rectangle([cx - 20, Y1 - 10, cx + 20, Y1 - 6], fill=(30, 30, 36), outline=OUT); d.line([cx - 18, Y1 - 8, cx + 18, Y1 - 8], fill=lit_of(p)[1])   # soundbar
    if st == "open":
        for sx, sg in ((X0 + 2, 1), (X1 - 2, -1)):                                  # doors swung out at the front
            d.rectangle([min(sx, sx + sg * 4), Y1, max(sx, sx + sg * 4), Y1 + W_ // 4], fill=C[1], outline=OUT)
        for k in range(10): d.rectangle([X0 + 10 + k * 8, Y1 - 4, X0 + 15 + k * 8, Y1 - 1], fill=[(200, 40, 40), (40, 80, 160), (230, 230, 226), (30, 30, 34)][k % 4])
    if p.w >= 4 and e < 8: d.ellipse([cx + W_ * .32, Y1 - 12, cx + W_ * .32 + 8, Y1 - 4], fill=GOLD[3], outline=OUT)   # an ornament


define("tvcabinet", draw=tvcabinet, global_from=gf(1970), states=("closed", "open"), openable="cabinet", axes={"colour": list(TVCAB)}, nvar=12, front=True, clear=2,
       ref="TV cabinets and entertainment units 5 to 6 ft long, 1 1/2 to 2 ft deep (G-Plan, Ercol and IKEA catalogues)")


# ================================================================ weather vane
VANE_FIG = {"central": "cock", "atlantic": "cock", "northern": "flag", "mediterranean": "arrow", "islamic": "crescent", "steppe": "flag", "southasia": "flag",
            "eastasia": "fish", "seasia": "flag", "africa": "arrow", "americas": "horse", "oceania": "fish", "polar": "arrow"}


def weathervane(tm, x, y, w, h, st, v):
    """A weather vane on a roof ridge, a tower or a barn, seen from above: the compass arms with their letters, the
    spindle, the vane's arrow swung to the wind with its tail, and the figure on it, which from above shows mostly as
    its cast shadow on the roof. The figure by land: a cockerel in Central and Atlantic Europe, a Viking vane flag
    in the North, an arrow round the Mediterranean, in Africa and the far north, a crescent in the Islamic world, a
    prayer-flag pennant on the steppe and in South Asia, a fish in East Asia and Oceania, a running horse in the
    Americas. Dark Ages and Long Night: a wrought iron flag or cock. Renaissance: a gilt cock. Age of Reason: a copper
    arrow with letters. Victorian: an ornate copper figure gone green. Great War: a painted tin vane. Mid-Century:
    a cup anemometer beside it. Modern: an aluminium vane and anemometer. Future Darkness: a sensor mast with a lit
    beacon."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R = (X1 - X0) / 2
    roof = rmp(mix(p.stone[2] if e >= 2 else p.wood[2], ERA_TONE[e][2], .3), 12)    # the roof under it
    d.rectangle([X0, Y0, X1, Y1], fill=roof[2])
    for gy in range(Y0 + 4, Y1, 6): d.line([X0 + 1, gy, X1 - 1, gy], fill=roof[1])
    d.line([X0, cy, X1, cy], fill=roof[4], width=2)                                  # the ridge
    M = {0: IRON, 1: IRON, 2: GOLD, 3: COPPER, 4: VERD, 5: rmp(mix(p.acc[2], (150, 150, 150), .3), 16), 6: STEEL, 7: rmp((200, 204, 210), 12), 8: rmp((50, 54, 62), 12)}[e]
    if p.w >= 4 and e <= 4: M = GOLD
    if p.w <= 1 and e >= 2 and e <= 4: M = IRON
    for (dx, dy), lt in zip(((0, -1), (1, 0), (0, 1), (-1, 0)), "NESW"):            # the compass arms and letters
        ex, ey = cx + dx * R * .8, cy + dy * R * .8
        d.line([cx, cy, ex, ey], fill=OUT, width=3); d.line([cx, cy, ex, ey], fill=M[3], width=1)
        if e >= 3 or p.w >= 3: glyph(d, int(ex - 2), int(ey - 2), "NESW".index(lt) * 2 + 1, M[4], 4)
    fig = VANE_FIG.get(p.st, "arrow")
    a = -2.3 + (p.w * .4) + e * .2                                                   # the vane swung to the wind
    tx, ty = cx + math.cos(a) * R * .7, cy + math.sin(a) * R * .7; hx, hy = cx - math.cos(a) * R * .7, cy - math.sin(a) * R * .7
    sh = [(px_ + 5, py_ + 6) for px_, py_ in ((tx, ty), (hx, hy), (hx + 3, hy + 3), (tx + 3, ty + 3))]
    if fig == "cock": sh = [(cx + 5 - 9, cy + 6 + 2), (cx + 5 - 4, cy + 6 - 9), (cx + 5 + 2, cy + 6 - 6), (cx + 5 + 9, cy + 6 - 10), (cx + 5 + 7, cy + 6 + 4), (cx + 5 - 2, cy + 6 + 6)]
    elif fig == "horse": sh = [(cx - 6, cy + 10), (cx - 4, cy), (cx + 8, cy - 2), (cx + 13, cy - 7), (cx + 14, cy + 2), (cx + 10, cy + 12)]
    elif fig == "fish": sh = [(cx - 8, cy + 6), (cx + 4, cy + 1), (cx + 14, cy + 6), (cx + 4, cy + 11)]
    elif fig == "flag": sh = [(cx + 4, cy + 4), (cx + 16, cy + 6), (cx + 13, cy + 14), (cx + 4, cy + 13)]
    elif fig == "crescent": sh = [(cx + 2, cy + 2), (cx + 12, cy + 6), (cx + 14, cy + 14), (cx + 6, cy + 10)]
    tm.shade((X0, Y0, X1 + 5, Y1 + 5), f=.6, kind="poly", pts=sh)                   # the figure's shadow on the roof
    d.line([tx, ty, hx, hy], fill=OUT, width=4); d.line([tx, ty, hx, hy], fill=M[3], width=2)   # the arrow
    d.polygon([(tx + math.cos(a) * 5, ty + math.sin(a) * 5), (tx + math.cos(a + 2.3) * 5, ty + math.sin(a + 2.3) * 5), (tx + math.cos(a - 2.3) * 5, ty + math.sin(a - 2.3) * 5)], fill=M[3], outline=OUT)
    d.line([hx, hy, hx + math.cos(a + 1.57) * 5, hy + math.sin(a + 1.57) * 5], fill=M[2], width=3); d.line([hx, hy, hx - math.cos(a + 1.57) * 5, hy - math.sin(a + 1.57) * 5], fill=M[2], width=3)   # the tail
    if fig == "flag" and e <= 1: d.rectangle([cx + 1, cy - 2, cx + 9, cy + 3], fill=p.acc[3] if p.w >= 2 else M[3], outline=OUT)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=M[4] if fig != "crescent" else GOLD[3], outline=OUT)   # the spindle top
    if e >= 6:                                                                      # an anemometer's cups beside it, or the sensor mast
        ax, ay = X1 - 9, Y0 + 9
        if e == 8: d.ellipse([ax - 4, ay - 4, ax + 4, ay + 4], fill=lit_of(p)[2], outline=OUT)
        else:
            for b in (0, 2.09, 4.19): d.line([ax, ay, ax + math.cos(b) * 6, ay + math.sin(b) * 6], fill=M[1]); d.ellipse([ax + math.cos(b) * 6 - 2, ay + math.sin(b) * 6 - 2, ax + math.cos(b) * 6 + 2, ay + math.sin(b) * 6 + 2], fill=M[3], outline=OUT)


define("weathervane", draw=weathervane, front=False,
       ref="weather vanes about 2 to 3 ft across the compass arms (church cocks; Viking vane flags of Heggen and Källunge; Cushing and White vanes)")


# ================================================================ wreath
def wreath(tm, x, y, w, h, st, v):
    """A wreath or garland hung on a wall or door, seen from above as a ring foreshortened against the wall: its
    greenery or flowers, the bow or ribbon, and the berries or tokens in it. Dark Ages: ivy and laurel. Long Night:
    dried and blackened for mourning. Renaissance: bay and fruit with ribbons. Age of Reason: a della Robbia ring of
    fruit and gilt. Victorian: a funeral wreath with a black bow. Great War: a laurel wreath with a regimental ribbon.
    Mid-Century: a red remembrance poppy wreath. Modern: an artificial wreath with small lights. Future Darkness: a
    lit ring. Always a ring with its hole; each land winds its own: marigold heads in South Asia and the islands,
    jasmine buds in the Islamic world, twisted straw with white paper streamers in East Asia, a blue khata tied round
    it on the steppe, lei flowers in Oceania, woven palm in Africa, dried flowers in the Americas, rowan berries in
    the North, laurel round the Mediterranean, holly in the Atlantic lands."""
    d = tm.d; p = pal(v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    base = {"southasia": (240, 150, 30), "seasia": (250, 200, 40), "islamic": (240, 236, 220), "eastasia": (210, 190, 130), "steppe": (90, 140, 230),
            "oceania": (230, 90, 120), "africa": (170, 160, 80), "americas": (190, 110, 150), "northern": (150, 170, 120), "polar": (180, 160, 120),
            "central": (40, 100, 50), "atlantic": (90, 130, 60), "mediterranean": (110, 120, 60)}.get(p.st, (60, 110, 60))
    eb = {1: (60, 50, 40), 4: (40, 70, 40), 6: (190, 30, 40), 8: (60, 64, 74)}.get(e)
    if eb: base = mix(base, eb, .15)
    if p.w <= 1: base = mix(base, (150, 128, 90), .2)                                 # a poor wreath of dried stuff
    G = rmp(fade(base, v), 18)
    W_ = X1 - X0
    hole = {0: (120, 100, 80), 1: (40, 34, 34), 2: (200, 170, 120), 3: (230, 224, 210), 4: (90, 40, 50), 5: (120, 120, 100), 6: (220, 210, 190), 7: (170, 170, 176), 8: (30, 32, 40)}[e]
    d.rectangle([X0, Y0, X1, Y0 + 2], fill=hole)                                    # the wall face behind
    hw = {0: 5, 1: 7, 2: 6, 3: 4, 4: 9, 5: 6, 6: 9, 7: 5, 8: 6}[e] - (2 if p.st == "polar" else 0)   # how thick the ring is wound in each age
    d.ellipse([X0, Y0 + 1, X1, Y1], fill=G[2], outline=OUT)                          # the ring itself, always: its wound body and the hole
    d.ellipse([X0 + hw, Y0 + 3, X1 - hw, Y1 - 3], fill=hole, outline=G[0])
    for k in range(6): d.point((round(X0 + 3 + k * (W_ - 6) / 5), Y0 + 3 + min(k, 5 - k) % 2 * 3), fill=G[4])
    def round_dots(n, cols, r=2):                                                   # heads or buds set round the ring
        for k in range(n // 2 + 1):                                                 # each one drawn with its exact mirror
            a = -1.5708 + 6.283 * k / n; fx = (X0 + X1) / 2 + math.cos(a) * (W_ / 2 - hw / 2 - 1); fy = round((Y0 + Y1) / 2 + math.sin(a) * ((Y1 - Y0) / 2 - 2))
            l0 = math.floor(fx - r); l1 = l0 + 2 * r
            for bx0_, bx1_ in ((l0, l1), (X0 + X1 - l1, X0 + X1 - l0)): d.rectangle([bx0_, fy - r + 1, bx1_, fy + r - 1], fill=cols[k % len(cols)])
    if p.st == "africa":                                                            # the palm weave, crossed both ways
        for k in range(0, W_ + 1, 6): d.line([X0 + k, Y0 + 1, X0 + k + 4, Y1], fill=G[0]); d.line([X1 - k, Y0 + 1, X1 - k - 4, Y1], fill=G[0])
    elif p.st == "americas": round_dots(8, [(220, 60, 120), (240, 180, 40), (150, 60, 200)])   # dried flowers
    elif p.st == "northern": [d.ellipse([fx - 2, Y1 - 5, fx + 2, Y1 - 1], fill=(200, 40, 30)) for fx in (X0 + 4, X0 + 8, X1 - 8, X1 - 4)]   # rowan berries
    elif p.st == "mediterranean": round_dots(14, [G[4], G[0]], 1)                  # laurel leaves, light and dark
    elif p.st == "atlantic": [d.ellipse([fx - 2, Y1 - 4, fx + 2, Y1], fill=(200, 30, 30)) for fx in (cx - 9, cx + 9)]   # holly berries either side of the bow
    elif p.st in ("southasia", "seasia"): round_dots(10, [(250, 150, 20), (250, 210, 40)])   # marigold heads
    elif p.st == "islamic": round_dots(12, [(252, 252, 244)], 1)                    # jasmine buds
    elif p.st == "oceania": round_dots(10, [(240, 90, 130), (250, 250, 240), (250, 180, 40)])   # lei flowers
    elif p.st == "eastasia":                                                        # a twisted straw ring with white paper shide hung from it
        for k in range(0, W_ // 2 - 2, 4): d.line([X0 + k, Y0 + 2, X0 + k + 3, Y0 + 5], fill=G[0]); d.line([X1 - k, Y0 + 2, X1 - k - 3, Y0 + 5], fill=G[0])
        d.line([(cx - 1, Y1 - 4), (cx + 2, Y1 - 3), (cx - 1, Y1 - 1), (cx + 2, Y1)], fill=(250, 250, 246), width=2)
    elif p.st == "steppe": d.polygon([(cx - 8, Y1 - 5), (cx + 8, Y1 - 5), (cx + 5, Y1), (cx - 5, Y1)], fill=(90, 140, 230), outline=OUT)   # a blue khata tied round it
    if e == 1: round_dots(12, [(30, 26, 26)], 1)                                    # thorns and black twigs wound in
    if e == 3: [d.rectangle([fx - 1, fy - 1, fx + 1, fy + 1], fill=(200, 50, 50) if k < 2 else (220, 180, 70)) for k, (fx, fy) in enumerate(((X0 + 3, cy), (X1 - 3, cy), (cx - 6, Y1 - 2), (cx + 6, Y1 - 2)))]   # della Robbia fruit
    if e == 5:                                                                      # the regimental ribbon tied across its foot, both tails down
        for sg in (-1, 1): d.line([cx, Y1 - 3, cx + sg * W_ * .3, Y1 - 1], fill=p.acc[3], width=3)
    if e == 6:                                                                      # the poppies along its foot
        for k in (-1, 1): d.rectangle([cx + k * 6 - 1, Y1 - 4, cx + k * 6 + 1, Y1 - 2], fill=(210, 30, 40))
    if p.w >= 4:                                                                    # a rich one thick with gilt fruit and flowers
        for k in range(7): fx = cx + (k - 3) * (W_ - 8) / 6; d.rectangle([fx - 1, Y0 + 2 + (k % 2) * 4, fx + 1, Y0 + 4 + (k % 2) * 4], fill=GOLD[3] if k % 2 else (200, 40, 50))
    if e != 8:
        bow = {4: (30, 28, 30), 5: p.acc[3], 2: p.acc[3], 6: (30, 30, 30), 7: (200, 30, 40)}.get(e, p.acc[3] if p.w >= 2 else G[1])
        by = Y0 + 1 if e == 2 else Y1 - 4                                           # the Renaissance ties its ribbons at the top
        d.rectangle([cx - 3, by, cx + 3, by + 4], fill=bow, outline=OUT)
        if e == 4: d.line([cx - 2, by + 2, cx - 5, Y1], fill=bow, width=2); d.line([cx + 2, by + 2, cx + 5, Y1], fill=bow, width=2)   # mourning ribbon tails
    if e == 7: [d.point((X0 + 3 + k * 4, cy), fill=(255, 240, 160)) for k in range((W_ - 4) // 4)]
    if e == 8: d.ellipse([X0 + 1, Y0 + 1, X1 - 1, Y1], outline=futs(p), width=2)


define("wreath", draw=wreath, front=True, clear=0,
       ref="door and wall wreaths 12 to 18 in across (Advent and funeral wreaths; Indian toran garlands)")


# ================================================================ fleshcrafted growth
FLESH = {"pale": (226, 190, 176), "ruddy": (200, 120, 110), "dark": (130, 80, 66), "bruised": (150, 100, 130), "grey": (160, 150, 150), "sallow": (200, 180, 120)}


def fleshgrowth(tm, x, y, w, h, st, v):
    """A fleshcrafter's living growth on the wall of a vampire's haven, seen from above where it bulges out from the
    wall: a lumpen mass of skin and muscle grown into the masonry, veined, ribbed with bone, a few lidded eyes or a
    mouth in it, and sinews spread out into the cracks of the wall round it. No gore beyond its own colour. The wall
    it has grown into is the haven's: stone or timber in the old ages, brick, plaster and tile later, concrete and
    composite at the last. The flesh colour is its own."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    wall = {0: p.stone[2], 1: mix(p.stone[2], (60, 50, 44), .3), 2: p.wood[2], 3: (226, 218, 200), 4: (150, 70, 50), 5: mix(p.stone[2], (120, 110, 100), .4),
            6: (196, 190, 176), 7: (170, 168, 160), 8: (50, 54, 62)}[e]
    land = SECRET_WALL.get(p.st, (200, 180, 150))                                   # the land's own wall finish
    Wl = rmp(mix(wall, land, .5), 12)
    fl = rmp(mix(p.ground[2] if e <= 2 else p.stone[2], land, .55), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=fl[1])                                       # the haven floor it spreads onto
    if e in (0, 1): [blob(d, X0 + (k * 13) % (W_ - 10), Y0 + 12 + (k * 7) % (H_ - 20), X0 + (k * 13) % (W_ - 10) + 9, Y0 + 18 + (k * 7) % (H_ - 20), fl) for k in range(9)]   # rough flags and earth
    elif e in (2, 3): [d.line([X0 + k * W_ // 5, Y0 + 9, X0 + k * W_ // 5, Y1], fill=fl[0]) for k in range(1, 5)]   # floorboards
    elif e == 4: [d.line([X0, Y0 + 9 + k * (H_ - 9) // 5, X1, Y0 + 9 + k * (H_ - 9) // 5], fill=fl[0]) or d.line([X0 + k * W_ // 5, Y0 + 9, X0 + k * W_ // 5, Y1], fill=fl[0]) for k in range(1, 5)]   # tiles
    elif e == 5:
        for k in range(3): d.rectangle([X0 + 2, Y0 + 14 + k * 12, X1 - 2, Y0 + 18 + k * 12], fill=rmp((120, 96, 66))[2], outline=OUT)   # duckboards over a wet floor
        d.line([X0 + 4, Y1 - 4, X1 - 4, Y1 - 4], fill=IRON[2], width=3)            # a pipe along the floor
    elif e == 6:                                                                    # a diagonal linoleum pattern
        for k in range(0, W_, 9): t = min(k, H_ - 9); d.line([X0 + k, Y0 + 9, X0 + k - t, Y0 + 9 + t], fill=fl[0])
        for j in range(9 - W_ % 9, H_ - 9, 9): t = min(W_, H_ - 9 - j); d.line([X1, Y0 + 9 + j, X1 - t, Y0 + 9 + j + t], fill=fl[0])
    elif e == 7:
        d.rectangle([X0 + 3, Y0 + 10, X1 - 3, Y1 - 2], fill=(200, 208, 212), outline=OUT)   # a plastic sheet put down under it
        d.line([X0 + 2, Y1 - 3, X1 - 2, Y0 + 12], fill=(30, 30, 34), width=2)      # a cable across
    d.rectangle([X0, Y0, X1, Y0 + 8], fill=Wl[2], outline=OUT)                       # the wall it grows from
    for gx in range(X0 + 8, X1, 12): d.line([gx, Y0 + 1, gx, Y0 + 7], fill=Wl[0])
    Fc = FLESH.get(v.get("colour", "ruddy"), (200, 120, 110))
    F = rmp(Fc, 18)
    for k in range(7):                                                             # sinews into the wall
        sx = X0 + 4 + k * (W_ - 8) / 6; d.line([sx, Y0 + 2, cx + (sx - cx) * .4, Y0 + H_ * .4], fill=F[1], width=2)
    tm.shade((X0 + 6, Y0 + 10, X1, Y1 + 3), f=.6, kind="ellipse")
    ri = REGIONS.index(p.st) if p.st in REGIONS else 0; sx_ = ((ri * 5) % 7 - 3) * .03   # where on the wall it took hold
    lumps = [(sx_, .5, .34), (sx_ - .25, .45, .2), (sx_ + .27, .5, .2), (sx_ - .12 - .05 * (ri % 3), .72, .16), (sx_ + .15, .74 - .04 * (ri % 2), .16)]
    if p.w >= 3: lumps += [(-.35, .7, .15), (.36, .72, .15)]                          # a rich haven's grown larger
    for ox, oy, r in lumps:
        bx, by = cx + ox * W_, Y0 + oy * H_; rr = r * W_
        blob(d, bx - rr, by - rr * .8, bx + rr, by + rr * .8, F)
    for k in range(5):                                                             # veins
        a = rng.uniform(0, 6.28); vx, vy = cx + math.cos(a) * W_ * .2, Y0 + H_ * .55 + math.sin(a) * H_ * .15
        d.line([vx, vy, vx + rng.uniform(-8, 8), vy + rng.uniform(-6, 6)], fill=mix(F[0], (80, 40, 120), .4))
    d.arc([cx - W_ * .3, Y0 + H_ * .35, cx + W_ * .3, Y0 + H_ * .8], 200, 340, fill=(230, 220, 200), width=2)   # a rib of bone through it
    if e == 1:                                                                      # bound to the wall with iron chains in the Long Night
        for k in (.42, .66): d.line([X0 + 2, Y0 + k * H_, X1 - 2, Y0 + k * H_ + 4], fill=IRON[1], width=3)
    era_eye = e % 3
    if era_eye == 0: d.ellipse([cx - 4, Y0 + H_ * .52, cx + 4, Y0 + H_ * .6], fill=(236, 230, 210), outline=OUT); d.ellipse([cx - 1, Y0 + H_ * .53, cx + 2, Y0 + H_ * .59], fill=(40, 30, 30))   # an eye
    elif era_eye == 1: d.arc([cx - 6, Y0 + H_ * .5, cx + 6, Y0 + H_ * .62], 20, 160, fill=(90, 30, 40), width=2)   # a mouth
    else: [d.ellipse([cx - 10 + k * 8, Y0 + H_ * .55, cx - 6 + k * 8, Y0 + H_ * .59], fill=F[0]) for k in range(3)]   # closed eyelids
    if e == 8: d.line([X0 + 2, Y0 + 8, X1 - 2, Y0 + 8], fill=lit_of(p, (200, 60, 80))[1])   # grown round the haven's lit seam


define("fleshgrowth", draw=fleshgrowth, axes={"colour": list(FLESH)}, front=True, clear=1,
       ref="a growth about 3 ft across out from a wall (Vampire: The Masquerade, Vicissitude and Tzimisce havens)")
