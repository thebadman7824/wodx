"""Fighting, training and danger (B6346), and the gates that keep a place: practice posts, quintains, butts, bottles
set up to shoot at, barricades, sandbags, parapets, caltrops and broken glass, live wires, snares, pits, tripwires,
spring blades, jaw traps, powder kegs, cannon, the portcullis and the yard gate.

Each drawing is seen from straight above with its front to the south, light from the north-west. The era picks the
form and the making; wealth the timber, iron and paint; the regional style its own wood, stone, cloth and colour
(STY below); condition wears it or breaks it. The palette helpers here are shared with fam_climbing.py."""
import math
import zlib
from types import SimpleNamespace

import numpy as np

from px import OUT
from library.core import define
from library.art import (P, tone, mix, ramp, shadow, slab, rivet, knob, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY,
                         PLASTIC_WHITE, COMPOSITE, GLOW)

ERA_KEYS = ["dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "great-war", "mid-century", "modern", "future-darkness"]

# each style family's own timber, its paint or dye, its building stone or earth, and its cloth (base colours)
STY = {
    "central":       ((178, 140, 90), (150, 50, 40), (150, 146, 136), (64, 104, 64), (96, 80, 62)),       # pine, red paint, limestone, green; loam
    "atlantic":      ((136, 98, 60), (52, 80, 138), (122, 118, 112), (128, 40, 40), (92, 106, 76)),      # oak, blue, grey granite, red; turf
    "northern":      ((204, 180, 132), (128, 36, 30), (104, 106, 118), (44, 74, 140), (62, 58, 54)),     # birch and pine, Falu red, dark granite, blue; needles
    "mediterranean": ((106, 66, 44), (198, 112, 56), (214, 204, 182), (40, 108, 140), (196, 180, 148)),  # walnut, terracotta, whitewash, blue; dust
    "islamic":       ((88, 56, 40), (36, 138, 136), (204, 172, 120), (140, 38, 60), (216, 190, 136)),    # cedar, turquoise, sandstone, crimson; sand
    "steppe":        ((196, 98, 42), (204, 56, 40), (152, 132, 112), (226, 184, 60), (168, 150, 108)),   # painted orange wood, red, loess, gold felt; steppe
    "southasia":     ((128, 82, 46), (232, 150, 28), (184, 110, 84), (190, 40, 96), (164, 92, 62)),      # teak, saffron, red sandstone, magenta; laterite
    "eastasia":      ((44, 32, 34), (176, 36, 30), (118, 124, 120), (58, 78, 140), (128, 126, 116)),     # black lacquer, vermilion, grey brick, indigo; packed earth
    "seasia":        ((206, 184, 104), (110, 140, 56), (150, 140, 118), (144, 60, 112), (88, 92, 52)),   # bamboo and rattan, green, laterite, batik; wet earth
    "africa":        ((76, 46, 32), (204, 128, 46), (172, 98, 60), (214, 196, 140), (184, 110, 62)),     # dark hardwood, ochre, red earth, mud-cloth; red earth
    "americas":      ((166, 118, 80), (56, 128, 150), (198, 146, 112), (230, 180, 50), (200, 156, 124)),  # pine, turquoise, adobe, maize yellow; adobe dust
    "oceania":       ((112, 76, 48), (36, 28, 26), (110, 104, 96), (212, 190, 150), (60, 56, 54)),       # carved wood, black, basalt, tapa; volcanic
    "polar":         ((210, 204, 190), (122, 90, 58), (150, 152, 160), (96, 72, 60), (226, 230, 236)),   # bone and driftwood, hide, grey stone, fur; snow
}
HERALDRY = {"gules": (170, 34, 34), "azure": (40, 70, 160), "vert": (36, 120, 60), "sable": (36, 34, 38), "or": (222, 180, 50), "purpure": (110, 50, 120)}


def ei(v): return ERA_KEYS.index(v.get("era", "dark-ages")) if v.get("era", "dark-ages") in ERA_KEYS else 0


ERA_TONE = (((118, 108, 92), .12, (92, 76, 54), .12),     # Dark Ages: weathered adzed timber, mud
            ((70, 58, 48), .12, (70, 62, 50), .12),      # Long Night: sooted and grimed, trodden straw and filth
            ((168, 118, 62), .12, (150, 132, 100), .12),  # Renaissance: oiled and waxed joinery, gravel
            ((196, 168, 128), .12, (176, 160, 128), .12), # Age of Reason: light deal and paint, sanded yards
            ((104, 48, 34), .12, (66, 64, 66), .12),      # Victorian: mahogany and machine-cut pine, cinders and soot
            ((112, 108, 74), .12, (96, 84, 60), .12),     # Great War: drab, churned mud
            ((176, 132, 88), .12, (128, 126, 120), .12),  # Mid-Century: veneer, tarmac and concrete
            ((184, 180, 172), .12, (160, 158, 152), .12),  # Modern: pale board and steel, clean concrete
            ((40, 44, 52), .12, (44, 46, 52), .12))       # Future Darkness: dark composites and grime


def pal(v):
    """The palette of one variation: wood, acc (paint or dye), stone, cloth (five-tone ramps) and metal, faded for
    worn and broken, dulled and mended for the poor, brightened and brass-fitted for the rich, and toned for the
    age: its timber and the ground it stands on as that age had them (see ERA_TONE)."""
    st = v.get("style", "central"); w = v.get("wealth", 2); cond = v.get("condition", "new")
    wood, acc, stone, cloth, earth = STY.get(st, STY["central"])
    if w <= 1: wood = mix(wood, (116, 102, 86), .22); acc = mix(acc, (120, 108, 94), .45); cloth = mix(cloth, (130, 118, 100), .5)
    elif w >= 4: acc = tone(acc, 12); cloth = tone(cloth, 8)
    e = ei(v); tw, kw, tg, kg = ERA_TONE[min(max(e, 0), 8)]
    wood = mix(wood, tw, kw); earth = mix(earth, tg, kg); stone = mix(stone, tg, kg * .5)
    f = {"worn": .2, "broken": .3}.get(cond, 0) + (.08 if e == 1 else 0)          # the Long Night wears everything harder
    fd = lambda c: mix(c, (128, 120, 110), f)
    metal = BRASS if w >= 4 else IRON
    if e >= 6: metal = STEEL if w >= 2 else IRON
    return SimpleNamespace(wood=ramp(fd(wood), 18), acc=ramp(fd(acc), 20), stone=ramp(fd(stone), 14), cloth=ramp(fd(cloth), 16),
                           metal=metal, gold=ramp((206, 166, 64), 22), ground=ramp(fd(earth), 12),
                           comp=ramp(mix((58, 64, 74), wood, .3), 14), lit=[mix(GLOW[0], acc, .35), mix(GLOW[1], acc, .35), mix(GLOW[2], acc, .2)], w=w, st=st, cond=cond, e=ei(v), worn=cond != "new", broken=cond == "broken")


def paint(p, base, k=.5):
    """Metal or timber as a household of this wealth keeps it: the poor's rusted or grimy and bare, the middling
    painted in the region's colour, the rich in a deeper coat of it."""
    if p.w <= 1: return ramp(mix(mix(base, (124, 74, 46), .35), p.ground[2], .25), 16)
    return ramp(mix(base, p.acc[2], k if p.w <= 3 else min(.85, k + .2)), 16)


def make(v, default):
    """The two words of a make axis value ("olive high", "red bag"): the finish, then the model."""
    a, _, b = str(v.get("material", default)).partition(" ")
    return a, b or default.partition(" ")[2]


def makes(finishes, models, extra):
    """Make axis values: every finish with every model, then the extra ones, so that the variation spread covers
    them all (sixteen to nineteen values with nvar 20 suit it at any wealth range)."""
    return [f"{f} {m}" for m in models for f in finishes] + list(extra)


def rng_of(tm, v):
    """A generator fixed by the variation (and the scratch map's own seed), so the same thing draws the same way."""
    key = "|".join(str(v.get(k, "")) for k in ("era", "style", "wealth", "condition", "material", "colour"))
    return np.random.default_rng(zlib.crc32(key.encode()) + int(tm.rng.integers(0, 1000)))


def scuffs(tm, X0, Y0, X1, Y1, C, rng, n=6):
    """Wear: short pale and dark strokes, a stain."""
    d = tm.d
    for k in range(n):
        x, y = rng.uniform(X0 + 2, max(X0 + 3, X1 - 8)), rng.uniform(Y0 + 2, max(Y0 + 3, Y1 - 3))
        d.line([x, y, x + rng.uniform(3, 7), y + rng.uniform(-1, 1)], fill=C[4] if k % 2 else C[0])
    x, y = rng.uniform(X0 + 3, max(X0 + 4, X1 - 8)), rng.uniform(Y0 + 2, max(Y0 + 3, Y1 - 5))
    d.ellipse([x, y, x + 6, y + 3], fill=tone(C[1], -10))


def crack(tm, x0, y0, x1, y1, rng, col=OUT):
    """A jagged split from (x0, y0) toward (x1, y1)."""
    d = tm.d; n = 6; px_, py_ = x0, y0
    for k in range(1, n + 1):
        t = k / n; nx, ny = x0 + (x1 - x0) * t + rng.uniform(-2, 2), y0 + (y1 - y0) * t + rng.uniform(-2, 2)
        d.line([px_, py_, nx, ny], fill=col, width=2 if k < n - 1 else 1); px_, py_ = nx, ny


def endgrain(tm, cx, cy, r, C, rings=True):
    """The top of a post or log seen from above: a disc with rings and a split."""
    d = tm.d
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT)
    if r > 4 and rings:
        d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 290, fill=C[4])
        d.ellipse([cx - r * .5, cy - r * .5, cx + r * .5, cy + r * .5], outline=C[1])
        d.point((cx, cy), fill=C[0])


def lash(tm, x, y, C, horiz=True):
    """A rope lashing over a joint."""
    d = tm.d
    for k in (-2, 0, 2):
        if horiz: d.line([x + k, y - 3, x + k, y + 3], fill=C[3]); d.point((x + k, y - 3), fill=C[4])
        else: d.line([x - 3, y + k, x + 3, y + k], fill=C[3]); d.point((x - 3, y + k), fill=C[4])


def ground(tm, X0, Y0, X1, Y1, C, rng, kind="ellipse"):
    """A patch of trodden ground or floor the thing stands on (its own earth, sand or flags)."""
    d = tm.d
    if kind == "ellipse": d.ellipse([X0, Y0, X1, Y1], fill=C[1])
    else: d.rectangle([X0, Y0, X1, Y1], fill=C[1])
    for _ in range(int((X1 - X0) * (Y1 - Y0) / 60)):
        x, y = rng.uniform(X0 + 4, X1 - 4), rng.uniform(Y0 + 4, Y1 - 4)
        if kind != "ellipse" or ((x - (X0 + X1) / 2) / ((X1 - X0) / 2)) ** 2 + ((y - (Y0 + Y1) / 2) / ((Y1 - Y0) / 2)) ** 2 < .8:
            d.line([x, y, x + 2, y], fill=C[0] if rng.random() < .5 else C[2])


def glowline(tm, pts, C=GLOW):
    d = tm.d; d.line(pts, fill=C[0], width=3); d.line(pts, fill=C[2], width=1)


# ================================================================ practice post or dummy
def pell(tm, x, y, w, h, st, v):
    """A practice post. Dark Ages: a stout post (its hacked top seen from above) in a ring of trodden earth, a wooden
    waster and a buckler at its foot; the East Asian wooden man has three arms. Long Night: a heavier iron-banded post
    and a heater shield. Renaissance: a padded leather target, a rapier and dagger. Age of Reason: a white canvas
    target ring and a smallsword. Great War: two khaki sacks for the bayonet course. Victorian and Great
    War: a stuffed bayonet sack on a gallows frame with a painted ring. From Mid-Century it is factory gear, the same
    the world over, its make axis picking colour and model: Mid-Century a leather heavy bag on a chain, a pear speed bag or a
    canvas bag on a stand; Modern a vinyl heavy bag, a free-standing bag or a moulded torso dummy; Future Darkness a
    sensor pylon, a lit strike wall or a sparring drone. Their colour is the maker's livery."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    e = p.e
    ground(tm, X0, Y0, X1, Y1, p.ground, rng)
    if e <= 3:
        r = (7, 9, 8, 7)[e] + (1 if p.w >= 3 else 0)                         # the Long Night's post the stoutest
        shadow(tm, cx - r, cy - r, cx + r, cy + r, 3, kind="ellipse")
        if e == 2: d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(124, 84, 52), outline=OUT)   # a padded leather target round it
        if e == 3: d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(222, 214, 192), outline=OUT); d.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], outline=(150, 40, 36), width=2)   # a white canvas target ring
        if p.st == "eastasia" or p.st == "southasia":                       # the wooden man's arms or the mallakhamb pole's oiled top
            for a in (-.5, .5, 0):
                L = 13 if a else 11; ex, ey = cx + math.sin(a) * L, cy + math.cos(a) * L
                d.line([cx, cy, ex, ey], fill=OUT, width=5); d.line([cx, cy, ex, ey], fill=p.wood[3], width=3)
        endgrain(tm, cx, cy, r, p.wood)
        for a in (.4, 1.9, 3.6, 5.1):                                       # the hack marks cut into it
            d.line([cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4), cx + math.cos(a) * (r + 1), cy + math.sin(a) * (r + 1)], fill=p.wood[4], width=2)
        if p.w >= 4:                                                         # a painted band and a straw-stuffed jack
            d.arc([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], 0, 360, fill=p.acc[3], width=2)
        if e == 1:
            for q in (r - 2, r - 5): d.arc([cx - q, cy - q, cx + q, cy + q], 0, 360, fill=IRON[3])   # iron bands round the hacked post
        if e <= 1:
            d.line([X0 + 5, Y1 - 7, X0 + 22, Y1 - 12], fill=OUT, width=4); d.line([X0 + 5, Y1 - 7, X0 + 22, Y1 - 12], fill=p.wood[4], width=2)   # the waster
            d.line([X0 + 9, Y1 - 4, X0 + 9, Y1 - 13], fill=OUT, width=1)
        else:                                                                # a rapier or smallsword laid by
            d.line([X0 + 4, Y1 - 5, X1 - 14, Y1 - 9], fill=OUT, width=3); d.line([X0 + 4, Y1 - 5, X1 - 14, Y1 - 9], fill=STEEL[4], width=1)
            d.ellipse([X0 + 3, Y1 - 9, X0 + 9, Y1 - 3], outline=BRASS[3] if p.w >= 3 else IRON[3])
        bx, by = X1 - 9, Y1 - 9
        if e == 0:                                                           # the buckler
            d.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=p.acc[2] if p.w >= 2 else p.wood[1], outline=OUT); knob(tm, bx, by, p.metal, 2)
        elif e == 1:                                                         # a heater shield
            d.polygon([(bx - 6, by - 7), (bx + 6, by - 7), (bx + 6, by), (bx, by + 7), (bx - 6, by)], fill=p.acc[2] if p.w >= 2 else p.wood[1], outline=OUT)
        elif e == 2:                                                         # the parrying dagger
            d.line([bx - 6, by + 4, bx + 5, by - 5], fill=OUT, width=3); d.line([bx - 6, by + 4, bx + 5, by - 5], fill=STEEL[4], width=1)
        for k in range(4): a = rng.uniform(0, 6.28); q = rng.uniform(r + 3, 15); d.line([cx + math.cos(a) * q, cy + math.sin(a) * q, cx + math.cos(a) * q + 2, cy + math.sin(a) * q + 1], fill=p.wood[4])
    elif e <= 5:
        if p.w >= 4: d.ellipse([X0 + 2, cy - 6, X1 - 2, Y1 - 1], fill=(206, 186, 140))   # a well-found depot: a sawdust bed under it
        d.rectangle([X0 + 3, cy - 13, X1 - 3, cy - 9], fill=p.wood[2] if p.w < 4 else p.acc[2], outline=OUT); d.line([X0 + 4, cy - 12, X1 - 4, cy - 12], fill=p.wood[4])   # the gallows beam
        for sx in (X0 + 3, X1 - 7): endgrain(tm, sx + 2, cy - 11, 4, p.wood, rings=False)
        shadow(tm, cx - 9, cy - 9, cx + 9, cy + 13, 3, kind="ellipse")
        d.line([cx, cy - 11, cx, cy - 6], fill=STEEL[1])
        C = ramp(mix(p.cloth[2], (170, 150, 100), .6), 16)                   # the hessian sack body
        if e == 4:
            d.ellipse([cx - 9, cy - 8, cx + 9, cy + 13], fill=C[2], outline=OUT); d.arc([cx - 7, cy - 6, cx + 7, cy + 11], 160, 280, fill=C[4])
            d.ellipse([cx - 4, cy - 1, cx + 4, cy + 7], outline=p.acc[3], width=2)   # the painted ring to aim at
            for k in range(3): d.line([cx - 6 + k * 5, cy + 4, cx - 4 + k * 5, cy + 9], fill=OUT)   # bayonet rents
        else:                                                                # Great War: two khaki sacks for the bayonet course
            C = ramp(mix(C[2], (128, 120, 80), .15), 16)
            for sx in (cx - 8, cx + 8):
                d.line([sx, cy - 11, sx, cy - 6], fill=STEEL[1]); d.ellipse([sx - 6, cy - 7, sx + 6, cy + 11], fill=C[2], outline=OUT)
                for k in range(2): d.line([sx - 3 + k * 4, cy + 2, sx - 2 + k * 4, cy + 7], fill=OUT)
        if e == 5: d.rectangle([X0 + 3, Y1 - 6, X0 + 16, Y1 - 3], fill=(96, 92, 60), outline=OUT)   # a rifle laid by
    else:                                                                    # factory goods: the same the world over
        cl, m = make(v, "red bag"); w = p.w
        LIV = {6: [(110, 30, 30), (156, 122, 78), (40, 58, 104), (36, 36, 40), (204, 196, 176), (78, 90, 52)],     # oxblood or tan leather, navy, black, white or olive canvas
               7: [(176, 30, 30), (180, 140, 92), (36, 76, 164), (30, 30, 34), (226, 224, 216), (40, 124, 60)],    # makers' vinyl
               8: [(230, 60, 90), (240, 170, 40), (60, 170, 240), (96, 96, 108), (232, 234, 242), (100, 230, 110)]}[min(e, 8)]   # the lights of a composite shell
        li = LIV[PELL_KEYS.index(cl)]
        C = ramp(mix(li, (128, 120, 110), {"worn": .25, "broken": .35}.get(p.cond, 0)), 16)
        k = (min(X1 - X0, Y1 - Y0) / 2 - 1) / 15                             # drawn to fill its footprint
        if e == 6:
            if m == "maize":                                                 # a pear speed bag under its round board
                d.ellipse([cx - 15 * k, cy - 15 * k, cx + 15 * k, cy + 15 * k], fill=C[1], outline=OUT); d.arc([cx - 13 * k, cy - 13 * k, cx + 13 * k, cy + 13 * k], 200, 300, fill=C[3])
                d.ellipse([cx - 11 * k, cy - 11 * k, cx + 11 * k, cy + 11 * k], fill=p.wood[2], outline=OUT)
                shadow(tm, cx - 5 * k, cy - 3 * k, cx + 5 * k, cy + 9 * k, 3, kind="ellipse"); d.ellipse([cx - 5 * k, cy - 3 * k, cx + 5 * k, cy + 9 * k], fill=C[2], outline=OUT); d.point((cx - 2 * k, cy), fill=C[4])
            elif m == "standing":                                            # a canvas bag on a three-legged stand
                for a in (1.57, 3.67, 5.76): d.line([cx, cy, cx + math.cos(a) * 15 * k, cy + math.sin(a) * 15 * k], fill=OUT, width=4); d.line([cx, cy, cx + math.cos(a) * 15 * k, cy + math.sin(a) * 15 * k], fill=IRON[3], width=2)
                CV = C; shadow(tm, cx - 8 * k, cy - 8 * k, cx + 8 * k, cy + 8 * k, 3, kind="ellipse")
                d.ellipse([cx - 8 * k, cy - 8 * k, cx + 8 * k, cy + 8 * k], fill=CV[2], outline=OUT); d.line([cx - 8 * k, cy, cx + 8 * k, cy], fill=C[2], width=3)
            else:                                                            # a leather heavy bag on its chain from a beam
                d.rectangle([X0 + 4, cy - 14 * k, X1 - 4, cy - 11 * k], fill=IRON[2], outline=OUT); d.line([cx, cy - 11 * k, cx, cy - 7 * k], fill=STEEL[3], width=2)
                shadow(tm, cx - 10 * k, cy - 10 * k, cx + 10 * k, cy + 10 * k, 3, kind="ellipse"); d.ellipse([cx - 10 * k, cy - 10 * k, cx + 10 * k, cy + 10 * k], fill=C[2], outline=OUT)
                d.arc([cx - 8 * k, cy - 8 * k, cx + 8 * k, cy + 8 * k], 180, 280, fill=C[4], width=2); d.ellipse([cx - 4 * k, cy - 4 * k, cx + 4 * k, cy + 4 * k], fill=C[1], outline=OUT)
        elif e == 7:
            if m == "standing":                                              # a free-standing bag on a water-filled base
                d.ellipse([cx - 15 * k, cy - 15 * k, cx + 15 * k, cy + 15 * k], fill=C[0], outline=OUT); d.arc([cx - 13 * k, cy - 13 * k, cx + 13 * k, cy + 13 * k], 180, 270, fill=PLASTIC_GREY[2])
                shadow(tm, cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k, 3, kind="ellipse"); d.ellipse([cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k], fill=C[2], outline=OUT)
                d.arc([cx - 7 * k, cy - 7 * k, cx + 7 * k, cy + 7 * k], 180, 280, fill=C[4], width=2); d.line([cx - 8 * k, cy, cx + 8 * k, cy], fill=PLASTIC_WHITE[2])
            elif m == "maize":                                               # a body-opponent dummy: a moulded torso on its base
                d.ellipse([cx - 15 * k, cy - 15 * k, cx + 15 * k, cy + 15 * k], fill=C[1], outline=OUT)
                SK = ramp((196, 150, 116), 14); shadow(tm, cx - 11 * k, cy - 6 * k, cx + 11 * k, cy + 8 * k, 3, kind="ellipse")
                d.ellipse([cx - 11 * k, cy - 6 * k, cx + 11 * k, cy + 8 * k], fill=SK[2], outline=OUT); d.ellipse([cx - 5 * k, cy - 12 * k, cx + 5 * k, cy - 2 * k], fill=SK[3], outline=OUT)
                d.line([cx - 9 * k, cy + 4 * k, cx + 9 * k, cy + 4 * k], fill=C[2], width=3)
            else:                                                            # a vinyl heavy bag hung on four chains from a bracket
                d.rectangle([X0 + 3, cy - 15 * k, X1 - 3, cy - 12 * k], fill=STEEL[1], outline=OUT)
                shadow(tm, cx - 10 * k, cy - 10 * k, cx + 10 * k, cy + 10 * k, 3, kind="ellipse"); d.ellipse([cx - 10 * k, cy - 10 * k, cx + 10 * k, cy + 10 * k], fill=C[2], outline=OUT)
                for a in (.8, 2.4, 3.9, 5.5): d.line([cx, cy, cx + math.cos(a) * 8 * k, cy + math.sin(a) * 8 * k], fill=STEEL[3])
                d.ellipse([cx - 3 * k, cy - 3 * k, cx + 3 * k, cy + 3 * k], fill=STEEL[2], outline=OUT); d.arc([cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k], 30, 120, fill=PLASTIC_WHITE[2], width=2)
        else:
            G = ramp(li, 20)
            if m == "standing":                                              # a strike wall: a lit pad panel
                d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 12], fill=p.comp[1], outline=OUT)
                for k in range(4): px_ = X0 + 6 + k * (X1 - X0 - 12) // 4; d.rectangle([px_, Y0 + 5, px_ + 5, Y0 + 10], fill=G[3] if (k + w) % 2 else G[1], outline=OUT)
                d.rectangle([X0 + 6, Y1 - 10, X1 - 6, Y1 - 6], outline=G[2])
            elif m == "maize":                                               # a hovering sparring drone in its lit ring
                d.ellipse([cx - 15 * k, cy - 15 * k, cx + 15 * k, cy + 15 * k], outline=G[2], width=2)
                shadow(tm, cx - 6 * k, cy - 6 * k, cx + 6 * k, cy + 6 * k, 3, kind="ellipse"); d.ellipse([cx - 6 * k, cy - 6 * k, cx + 6 * k, cy + 6 * k], fill=p.comp[2], outline=OUT)
                for a in (.8, 2.4, 3.9, 5.5): d.ellipse([cx + math.cos(a) * 10 * k - 3, cy + math.sin(a) * 10 * k - 3, cx + math.cos(a) * 10 * k + 3, cy + math.sin(a) * 10 * k + 3], fill=p.comp[0], outline=OUT)
                d.point((cx, cy), fill=G[4])
            else:                                                            # a dark sensor pylon with lit strike rings
                d.ellipse([cx - 14 * k, cy - 14 * k, cx + 14 * k, cy + 14 * k], fill=p.comp[1], outline=OUT)
                shadow(tm, cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k, 3, kind="ellipse")
                d.ellipse([cx - 9 * k, cy - 9 * k, cx + 9 * k, cy + 9 * k], fill=p.comp[2], outline=OUT); d.ellipse([cx - 11 * k, cy - 11 * k, cx + 11 * k, cy + 11 * k], outline=G[1])
                d.ellipse([cx - 4 * k, cy - 4 * k, cx + 4 * k, cy + 4 * k], fill=G[0], outline=G[2])
                for a in (0, 2.1, 4.2): d.rectangle([cx + math.cos(a) * 7 * k - 1, cy + math.sin(a) * 7 * k - 1, cx + math.cos(a) * 7 * k + 1, cy + math.sin(a) * 7 * k + 1], fill=G[4])
        if p.cond == "worn": d.rectangle([cx + 2 * k, cy - 2 * k, cx + 7 * k, cy + 1 * k], fill=(170, 170, 176), outline=OUT)   # a strip of tape over a split
    if p.worn: scuffs(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, p.wood, rng, 4)
    if p.broken: crack(tm, cx - 6, cy - 8, cx + 4, cy + 9, rng)


PELL_KEYS = ["red", "tan", "blue", "black", "white", "green"]


define("pell", draw=pell, axes={"material": makes(PELL_KEYS, ["bag", "standing", "maize"], ["blue bag"])}, nvar=20, global_from=1919, ref="medieval pells about 6 ft high and 9 in thick (Vegetius, Christine de Pizan); heavy bags 14 in across",
       ft=((1.75, 2.5), (1.75, 2.5)), tags=("bailey", "yard", "barracks", "guardroom"))


# ================================================================ quintain
def quintain(tm, x, y, w, h, st, v):
    """A tilting quintain in its ring. Dark Ages: a post with a turning arm, a kite shield on one end and a sandbag on
    the other. Long Night: a heater shield and an iron-shod arm. Renaissance: the carved Saracen with a shield and
    flail. Age of Reason: the ring tilt, a gallows with a ring hung for the lance. The ring the horses have worn
    round it, the colour of its shield from the heraldry axis."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    H = ramp(HERALDRY.get(v.get("colour", "gules")), 22)
    R_ = (X1 - X0) // 2
    d.ellipse([X0, Y0, X1, Y1], fill=p.ground[1])                             # the ring the horses have worn
    inner = {"sand": (212, 192, 140), "turf": (88, 116, 62), "straw": (190, 168, 96), "earth": (110, 88, 66)}.get(v.get("material", "sand"))
    d.ellipse([X0 + 14, Y0 + 14, X1 - 14, Y1 - 14], fill=mix(inner, p.ground[3], .15))
    for k in range(40):
        a = k / 40 * 6.283; q = R_ - 7; d.line([cx + math.cos(a) * q, cy + math.sin(a) * q, cx + math.cos(a + .06) * q, cy + math.sin(a + .06) * q], fill=p.ground[0])
    if p.e <= 2:
        ang = (-.35, .3, -.05)[p.e] if not p.broken else .55                 # where the arm last came to rest
        ux, uy = math.cos(ang), math.sin(ang); L = R_ - 12
        ax_, ay_, bx_, by_ = cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L
        d.line([ax_ + 3, ay_ + 4, bx_ + 3, by_ + 4], fill=tone(p.stone[0], -20), width=6)
        d.line([ax_, ay_, bx_, by_], fill=OUT, width=7); d.line([ax_, ay_, bx_, by_], fill=H[2], width=5); d.line([ax_, ay_ - 2, bx_, by_ - 2], fill=H[4])
        for t in np.linspace(.1, .9, 6):                                     # the arm painted in bands of its colours
            d.line([ax_ + (bx_ - ax_) * t, ay_ + (by_ - ay_) * t - 2, ax_ + (bx_ - ax_) * (t + .06), ay_ + (by_ - ay_) * (t + .06) - 2], fill=WHITE[3], width=4)
        if p.e >= 1:
            for t in (.15, .85): d.rectangle([ax_ + (bx_ - ax_) * t - 2, ay_ + (by_ - ay_) * t - 3, ax_ + (bx_ - ax_) * t + 2, ay_ + (by_ - ay_) * t + 3], fill=IRON[3])
        if p.e == 2:                                                         # the Saracen's head and shoulders on the post
            d.ellipse([cx - 13, cy - 9, cx + 13, cy + 9], fill=p.acc[2], outline=OUT); d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=WHITE[3], outline=OUT)
            d.arc([cx - 5, cy - 5, cx + 5, cy + 5], 180, 360, fill=H[2], width=2)
        else: endgrain(tm, cx, cy, 8, p.wood)
        sx_, sy_ = ax_, ay_                                                  # the shield
        if p.e == 0: d.polygon([(sx_ - 13, sy_ - 14), (sx_ + 13, sy_ - 14), (sx_ + 13, sy_ + 3), (sx_, sy_ + 19), (sx_ - 13, sy_ + 3)], fill=H[2], outline=OUT)
        else: d.polygon([(sx_ - 14, sy_ - 13), (sx_ + 14, sy_ - 13), (sx_ + 14, sy_ + 3), (sx_, sy_ + 16), (sx_ - 14, sy_ + 3)], fill=H[2], outline=OUT)
        for k in range(3):                                                    # pennons on the lances stood round the ring
            a = 2.2 + k * 1.3; px_, py_ = cx + math.cos(a) * (R_ - 5), cy + math.sin(a) * (R_ - 5)
            d.polygon([(px_, py_), (px_ + 12, py_ + 3), (px_, py_ + 7)], fill=H[3], outline=OUT); d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_ + 8], fill=p.wood[1])
        d.line([sx_ - 8, sy_ - 9, sx_ + 8, sy_ - 9], fill=H[4])
        ch = ramp(HERALDRY["or"] if v.get("colour") != "or" else HERALDRY["sable"], 20)
        if p.w >= 5: d.polygon([(sx_ - 6, sy_ - 6), (sx_ + 6, sy_ - 6), (sx_, sy_ + 6)], fill=ch[3])      # a charge on it
        else: d.rectangle([sx_ - 2, sy_ - 9, sx_ + 2, sy_ + 8], fill=ch[3])
        bx2, by2 = bx_ + ux * 4, by_ + uy * 4 + 8                             # the sandbag swinging on its chain
        d.line([bx_, by_, bx2, by2 - 6], fill=IRON[3], width=2)
        d.ellipse([bx2 - 9, by2 - 7, bx2 + 9, by2 + 9], fill=LINEN[1], outline=OUT); d.arc([bx2 - 7, by2 - 5, bx2 + 7, by2 + 7], 170, 280, fill=LINEN[3]); d.line([bx2 - 3, by2 - 6, bx2 + 3, by2 - 6], fill=OUT, width=2)
    else:                                                                    # the ring tilt: a gallows across the run, the ring hung from it
        d.rectangle([X0 + 10, cy - 4, X1 - 10, cy + 3], fill=p.wood[2], outline=OUT); d.line([X0 + 11, cy - 3, X1 - 11, cy - 3], fill=p.wood[4])
        for sx in (X0 + 12, X1 - 12): endgrain(tm, sx, cy, 7, p.wood)
        d.ellipse([cx - 6, cy + 4, cx + 6, cy + 16], outline=OUT, width=3); d.ellipse([cx - 5, cy + 5, cx + 5, cy + 15], outline=p.gold[3])
        d.line([cx, cy + 3, cx, cy + 5], fill=IRON[3])
        for sx in (X0 + 30, X1 - 30):                                       # streamers in its colour
            d.polygon([(sx, cy - 3), (sx + 8, cy - 26), (sx + 16, cy - 24), (sx + 8, cy - 3)], fill=H[3], outline=OUT)
            d.polygon([(sx, cy + 4), (sx + 8, cy + 26), (sx + 16, cy + 24), (sx + 8, cy + 4)], fill=H[2], outline=OUT)
        d.rectangle([X0 + 10, cy - 4, X1 - 10, cy + 3], fill=H[2], outline=OUT)
        d.line([X0 + 18, Y1 - 22, X1 - 30, Y1 - 34], fill=OUT, width=4); d.line([X0 + 18, Y1 - 22, X1 - 30, Y1 - 34], fill=H[3], width=2)   # a lance laid by
    if p.worn: scuffs(tm, X0 + 20, Y0 + 20, X1 - 20, Y1 - 20, p.stone, rng, 6)
    if p.broken: crack(tm, cx - 20, cy + 14, cx + 22, cy + 22, rng)


define("quintain", draw=quintain, nvar=16, axes={"colour": list(HERALDRY), "material": ["sand", "turf", "straw", "earth"]},
       ref="tilting quintains with a turning arm 5 to 6 ft long (Matthew Paris; Strutt, Sports and Pastimes)", tags=("bailey", "field"))


# ================================================================ archery butt
def butts(tm, x, y, w, h, st, v):
    """An archery butt, its face leaned back so it is seen foreshortened from above. Dark Ages to Renaissance: a bank
    of cut turves with a white peg-mark and a few arrows in it; the Long Night faces it with timber and pegs a straw
    clout on it. Age of Reason: a straw boss on a trestle. Victorian: a painted target of gold, red, blue, black and
    white rings on a straw boss and easel. Great War: a square card target pinned on the boss. Mid-Century
    and Modern: a rifle-range target board, then a foam block with a paper face. Future Darkness: a dark frame with a
    lit target in it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    e = p.e
    def arrows(n, tx, ty, spread):
        fl = p.acc if p.w >= 2 else ramp((200, 196, 186), 14)
        for k in range(n):
            ax_, ay_ = tx + rng.uniform(-spread, spread), ty + rng.uniform(-spread * .4, spread * .4)
            d.line([ax_, ay_, ax_ + 2, ay_ + 8], fill=p.wood[4] if e < 6 else (40, 40, 44), width=1)
            d.rectangle([ax_ + 1, ay_ + 6, ax_ + 3, ay_ + 9], fill=fl[3])
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    if e <= 2:
        shadow(tm, X0, Y0 + 4, X1, Y1, 4)
        G = ramp(mix((86, 112, 56), p.ground[2], .3), 16) if p.st in ("central", "atlantic", "northern") else ramp(mix(p.ground[3], (60, 50, 40), .15), 16)
        d.rounded_rectangle([X0, Y0 + 4, X1, Y1], 6, fill=G[2], outline=OUT)
        for k in range(4):                                                   # the courses of turves
            yy = Y0 + 8 + k * (Y1 - Y0 - 10) / 4; d.line([X0 + 3, yy, X1 - 3, yy], fill=G[0])
            for xx in range(int(X0 + 6 + (k % 2) * 7), X1 - 4, 14): d.line([xx, yy, xx, yy + (Y1 - Y0 - 10) / 4 - 1], fill=G[1])
        d.line([X0 + 3, Y0 + 6, X1 - 3, Y0 + 6], fill=G[4])
        if e == 1:                                                           # Long Night: a timber facing pegged over the turves, a straw clout
            d.rectangle([X0 + 3, Y0 + 6, X1 - 3, Y0 + 14], fill=p.wood[2], outline=OUT)
            for xx in range(X0 + 8, X1 - 4, 10): d.point((xx, Y0 + 10), fill=IRON[4])
            d.ellipse([cx - 11, cy - 7, cx + 11, cy + 7], fill=(196, 170, 96), outline=OUT)
        mk = WHITE if p.w < 4 else ramp(p.acc[3], 14)
        d.ellipse([cx - 5, cy - 3, cx + 5, cy + 3], fill=mk[3], outline=OUT); d.point((cx, cy), fill=OUT)
        if p.w >= 4:                                                         # a painted board set in a rich man's butt
            d.rectangle([cx - 12, cy - 7, cx + 12, cy + 7], outline=p.acc[3])
        arrows(3 + p.w // 2, cx, cy, 12)
    elif e <= 5:
        for lx in (X0 + 6, X1 - 6): d.line([lx, Y1 - 2, cx + (lx - cx) * .5, Y0 + 4], fill=OUT, width=4); d.line([lx, Y1 - 2, cx + (lx - cx) * .5, Y0 + 4], fill=p.wood[3], width=2)   # the easel legs
        ry = (Y1 - Y0) // 2 - 2; rx = min((X1 - X0) // 2 - 10, ry * 2)
        shadow(tm, cx - rx, cy - ry, cx + rx, cy + ry, 4, kind="ellipse")
        S = ramp((196, 170, 96), 16)
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=S[2], outline=OUT)
        for k in range(0, 360, 30): a = math.radians(k); d.line([cx + math.cos(a) * rx * .85, cy + math.sin(a) * ry * .85, cx + math.cos(a) * rx * .98, cy + math.sin(a) * ry * .98], fill=S[0])
        if e == 3:
            d.ellipse([cx - rx * .5, cy - ry * .5, cx + rx * .5, cy + ry * .5], fill=WHITE[2], outline=OUT); d.ellipse([cx - 4, cy - 2, cx + 4, cy + 2], fill=p.acc[2])
        elif e == 5:                                                         # Great War: a square card target pinned on the boss
            d.rectangle([cx - rx * .6, cy - ry * .7, cx + rx * .6, cy + ry * .7], fill=WHITE[3], outline=OUT)
            d.ellipse([cx - rx * .3, cy - ry * .35, cx + rx * .3, cy + ry * .35], fill=(40, 40, 46)); d.ellipse([cx - 3, cy - 2, cx + 3, cy + 2], fill=WHITE[4])
        else:
            rings = [WHITE[3], (40, 40, 46), p.cloth[2] if p.st in ("eastasia", "southasia") else (52, 90, 170), (190, 40, 40), (230, 190, 50)]
            for k, c in enumerate(rings):
                f = .9 - k * .18; d.ellipse([cx - rx * f, cy - ry * f, cx + rx * f, cy + ry * f], fill=c, outline=OUT if k == 0 else None)
        arrows(2 + p.w // 2, cx, cy, rx * .5)
    elif e <= 7:
        shadow(tm, X0 + 6, Y0 + 4, X1 - 6, Y1, 3)
        if e == 6:
            d.rectangle([X0 + 6, Y0 + 4, X1 - 6, Y1 - 4], fill=p.wood[2], outline=OUT); d.line([X0 + 7, Y0 + 5, X1 - 7, Y0 + 5], fill=p.wood[4])
            d.rectangle([cx - 16, Y0 + 7, cx + 16, Y1 - 7], fill=LINEN[3], outline=OUT)                  # a man-shaped figure target
            d.ellipse([cx - 5, Y0 + 8, cx + 5, Y0 + 14], fill=(40, 40, 46)); d.rectangle([cx - 10, Y0 + 14, cx + 10, Y1 - 8], fill=(40, 40, 46))
            d.ellipse([cx - 4, cy - 1, cx + 4, cy + 4], outline=WHITE[4])
        else:
            F = ramp(mix(p.acc[2], (60, 60, 60), .2), 16)                     # a foam block, its paper face
            d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=F[2], outline=OUT); d.line([X0 + 5, Y0 + 5, X1 - 5, Y0 + 5], fill=F[4])
            d.rectangle([cx - 13, Y0 + 7, cx + 13, Y1 - 7], fill=WHITE[4], outline=OUT)
            for k, c in enumerate(((230, 190, 50), (190, 40, 40), (52, 90, 170))): f = 11 - k * 3.5; d.ellipse([cx - f, cy - f * .6, cx + f, cy + f * .6], fill=c)
        for k in range(3 + p.w):
            hx, hy = cx + rng.uniform(-12, 12), cy + rng.uniform(-5, 5); d.rectangle([hx, hy, hx + 1, hy + 1], fill=OUT)   # shot holes
    else:
        d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=p.comp[1], outline=OUT); d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], outline=mix(GLOW[1], p.acc[3], .3))
        for k, f in enumerate((12, 8, 4)): d.ellipse([cx - f * 1.4, cy - f * .7, cx + f * 1.4, cy + f * .7], outline=GLOW[2 if k % 2 else 1])
        d.rectangle([X0 + 8, Y1 - 8, X0 + 20, Y1 - 6], fill=p.acc[3])
    if p.worn: scuffs(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, p.wood, rng, 5)
    if p.broken: crack(tm, X0 + 10, Y0 + 6, X0 + 30, Y1 - 4, rng)


define("butts", draw=butts, ref="butts of turf about 6 ft long (Ascham, Toxophilus 1545); 4 ft straw bosses on easels (Royal Toxophilite Society)",
       tags=("field", "bailey", "yard"))


# ================================================================ bottles or cans in a row
def bottlerow(tm, x, y, w, h, st, v):
    """Bottles or cans set along a rail to shoot at: the rail's top, the bottles' necks and shoulders in green and
    brown glass with a glint, a broken one in shards. Age of Reason: squat onion bottles. Victorian: tall wine and
    beer bottles and stone jars. Great War: plain ration tins gone rusty. Mid-Century: labelled cans and brown beer
    bottles. Modern: drinks cans and
    plastic bottles. Future Darkness: dented canisters on a scrap rail."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cy = (Y0 + Y1) // 2; e = p.e
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    shadow(tm, X0, Y0 + 3, X1, Y1 - 2, 3)
    rail = p.wood if e < 8 else ramp((86, 76, 70), 14)
    slab(tm, X0, Y0 + 3, X1, Y1 - 2, rail, "x", rng=rng)
    for px_ in (X0 + 6, X1 - 6): d.rectangle([px_ - 3, Y0 + 2, px_ + 3, Y1 - 1], fill=rail[1], outline=OUT)   # the posts' tops
    n = 4 + min(3, p.w); xs = np.linspace(X0 + 16, X1 - 16, n)
    kinds = {3: "onion", 4: "bottle", 5: "can", 6: "can", 7: "drink"}.get(e, "canister")
    gl = [ramp((54, 112, 60), 18), ramp((120, 70, 34), 18), ramp((150, 176, 176), 16), ramp((40, 70, 120), 16)]
    for k, bx in enumerate(xs):
        bx = int(bx); kk = kinds
        if p.st in ("islamic", "southasia", "africa") and k % 3 == 1: kk = "pot"
        if e == 6 and k % 2: kk = "bottle"                                   # Mid-Century: beer bottles among the cans
        if p.broken and k == 1:                                              # the one shot to pieces
            for j in range(5): sx, sy = bx + rng.uniform(-8, 8), cy + rng.uniform(-6, 6); d.polygon([(sx, sy), (sx + 3, sy + 1), (sx + 1, sy + 3)], fill=gl[k % 2][3])
            continue
        if kk == "onion": G = gl[k % 2]; d.ellipse([bx - 7, cy - 7, bx + 7, cy + 7], fill=G[1], outline=OUT); d.ellipse([bx - 3, cy - 3, bx + 3, cy + 3], fill=G[2], outline=OUT); d.point((bx - 4, cy - 4), fill=G[4])
        elif kk == "bottle": G = gl[k % 3]; d.ellipse([bx - 6, cy - 6, bx + 6, cy + 6], fill=G[1], outline=OUT); d.ellipse([bx - 2, cy - 2, bx + 2, cy + 2], fill=G[3], outline=OUT); d.line([bx - 4, cy - 3, bx - 3, cy - 4], fill=G[4])
        elif kk == "pot": d.ellipse([bx - 7, cy - 7, bx + 7, cy + 7], fill=p.stone[2], outline=OUT); d.ellipse([bx - 3, cy - 3, bx + 3, cy + 3], fill=OUT)
        elif kk == "can":
            L = [(176, 40, 36), (210, 190, 90), (60, 100, 60)][k % 3] if p.w >= 2 else (150, 150, 150)
            if e == 5: L = (130, 80, 50)                                     # Great War: plain ration tins gone rusty
            d.ellipse([bx - 6, cy - 6, bx + 6, cy + 6], fill=STEEL[2], outline=OUT); d.ellipse([bx - 4, cy - 4, bx + 4, cy + 4], outline=L); d.point((bx - 2, cy - 2), fill=STEEL[4])
        elif kk == "drink":
            L = [p.acc[3], (200, 30, 40), (40, 90, 190), (240, 240, 240)][k % 4]
            d.ellipse([bx - 6, cy - 6, bx + 6, cy + 6], fill=L, outline=OUT); d.ellipse([bx - 3, cy - 3, bx + 3, cy + 3], fill=STEEL[3]); d.point((bx, cy - 1), fill=OUT)
        else:
            d.rectangle([bx - 6, cy - 6, bx + 6, cy + 6], fill=p.comp[2], outline=OUT); d.ellipse([bx - 3, cy - 3, bx + 3, cy + 3], fill=GLOW[0] if k % 2 else p.acc[2])
    if p.worn: scuffs(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, rail, rng, 5)


define("bottlerow", draw=bottlerow, ref="bottles 3 to 4 in across set on a fence rail or plank about 4 ft long", tags=("yard", "field", "alley"))


# ================================================================ barricade
def barricade(tm, x, y, w, h, st, v):
    """A barricade across a way. Dark Ages: sharpened stakes and a cart on its side with a barrel; the Long Night
    chains barrels across instead of stakes.
    Renaissance: wicker gabions filled with earth. Age of Reason and Victorian: a revolutionary barricade of paving
    setts, a wheel and barrels and a table on its back. Great War: barbed wire on timber knife-rests. Mid-Century:
    a car body, doors and sandbags. Modern: concrete jersey barriers and a steel crowd fence. Future Darkness: a
    composite wall section with a lit warning strip, or among the poor welded scrap sheet."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cy = (Y0 + Y1) // 2; e = p.e
    L = X1 - X0
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    if e <= 1:
        shadow(tm, X0, Y0, X1, Y1, 4)
        d.rectangle([X0 + L * .3, Y0 + 2, X1 - 4, Y1 - 4], fill=p.wood[1], outline=OUT)                     # the cart on its side: its bed
        for gx in range(int(X0 + L * .3) + 8, X1 - 6, 10): d.line([gx, Y0 + 3, gx, Y1 - 5], fill=p.wood[0])
        d.line([X0 + L * .3 + 1, Y0 + 3, X1 - 5, Y0 + 3], fill=p.wood[3])
        wx = int(X0 + L * .62); d.ellipse([wx - 14, Y0, wx + 14, Y0 + 9], fill=p.wood[2], outline=OUT); d.line([wx - 12, Y0 + 4, wx + 12, Y0 + 4], fill=p.wood[0])   # a wheel up
        if e == 0:
            for k in range(6):                                               # stakes, sharpened, pointing outward
                sx = X0 + 6 + k * 9; d.polygon([(sx, Y1 - 4), (sx + 4, Y1 - 4), (sx + 2, Y0 + 6)], fill=p.wood[3], outline=OUT); d.point((sx + 2, Y0 + 7), fill=p.wood[4])
        else:                                                                # Long Night: barrels chained across the gap
            for k in range(3): endgrain(tm, X0 + 10 + k * 18, cy, 8, p.wood); d.ellipse([X0 + 2 + k * 18, cy - 8, X0 + 18 + k * 18, cy + 8], outline=IRON[2])
            d.line([X0 + 4, cy + 9, X0 + L * .3, cy + 9], fill=IRON[3], width=2)
        d.line([X0 + 4, cy, X0 + L * .3, cy + 2], fill=(150, 120, 70), width=2)                              # their rope
        endgrain(tm, X1 - 14, Y1 - 12, 8, p.wood)
    elif e == 2:
        for k in range(int(L // 32)):                                         # gabions, wicker baskets of earth
            gx = X0 + 16 + k * 32; r = min(15, (Y1 - Y0) // 2)
            shadow(tm, gx - r, cy - r, gx + r, cy + r, 4, kind="ellipse")
            d.ellipse([gx - r, cy - r, gx + r, cy + r], fill=p.wood[2], outline=OUT)
            for a in range(0, 360, 20): ar = math.radians(a); d.line([gx + math.cos(ar) * (r - 3), cy + math.sin(ar) * (r - 3), gx + math.cos(ar) * r, cy + math.sin(ar) * r], fill=p.wood[4] if a % 40 else p.wood[0])
            d.ellipse([gx - r + 4, cy - r + 4, gx + r - 4, cy + r - 4], fill=p.stone[1]); d.arc([gx - r + 5, cy - r + 5, gx + r - 5, cy + r - 5], 190, 260, fill=p.stone[3])
    elif e <= 4:
        shadow(tm, X0, Y0, X1, Y1, 4)
        d.polygon([(X0, Y1 - 2), (X0 + 10, Y0 + 3), (X1 - 10, Y0 + 2), (X1, Y1 - 3)], fill=p.stone[1], outline=OUT)   # the heap of setts
        for k in range(int(L * (Y1 - Y0) / 50)):
            sx, sy = rng.uniform(X0 + 8, X1 - 12), rng.uniform(Y0 + 5, Y1 - 8); c = p.stone[int(rng.integers(2, 5))]
            d.rectangle([sx, sy, sx + 6, sy + 4], fill=c, outline=OUT)
        tx = X0 + L * .55; d.rectangle([tx, Y0 + 2, tx + 30, Y0 + 14], fill=p.wood[2], outline=OUT); d.line([tx + 1, Y0 + 3, tx + 29, Y0 + 3], fill=p.wood[4])   # a table on its back, legs up
        for lx, ly in ((tx + 2, Y0 + 2), (tx + 26, Y0 + 2), (tx + 2, Y0 + 10), (tx + 26, Y0 + 10)): d.rectangle([lx, ly, lx + 3, ly + 3], fill=p.wood[4], outline=OUT)
        endgrain(tm, X0 + 20, cy, 9, p.wood); d.ellipse([X0 + 13, cy - 7, X0 + 27, cy + 7], outline=IRON[2])   # a barrel end on
        if p.w >= 3 or e == 4:                                                # a flag on a pole
            d.line([X1 - 20, Y1 - 4, X1 - 20, Y0 + 4], fill=OUT, width=2); d.polygon([(X1 - 19, Y0 + 4), (X1 - 4, Y0 + 7), (X1 - 19, Y0 + 11)], fill=p.acc[3], outline=OUT)
    elif e == 5:
        for k in range(int(L // 40)):                                         # knife-rests: timber crosses with wire coiled on them
            gx = X0 + 20 + k * 40
            for s in (-1, 1): d.line([gx - 14, cy + s * 10, gx + 14, cy - s * 10], fill=OUT, width=4); d.line([gx - 14, cy + s * 10, gx + 14, cy - s * 10], fill=p.wood[3], width=2)
            d.line([gx - 18, cy, gx + 18, cy], fill=OUT, width=3); d.line([gx - 18, cy, gx + 18, cy], fill=p.wood[2])
        if p.w >= 3:                                                          # a sandbagged end
            for k in range(2): d.rounded_rectangle([X1 - 22, Y0 + 2 + k * 12, X1 - 2, Y0 + 12 + k * 12], 4, fill=ramp(mix((150, 132, 96), p.cloth[2], .3), 14)[2], outline=OUT)
        for k in range(int(L / 5)):                                          # the coils of barbed wire
            t = k * 5; xx = X0 + 4 + t; d.arc([xx - 5, Y0 + 3, xx + 5, Y1 - 3], 0, 360, fill=IRON[3] if k % 2 else IRON[4])
            if k % 3 == 0: d.point((xx, Y0 + 4), fill=STEEL[4])
    elif e == 6:
        shadow(tm, X0 + L * .35, Y0, X1, Y1, 4)
        C = ramp(mix(p.acc[2], (90, 96, 90), .4), 18)                        # a car body pushed across
        d.rounded_rectangle([X0 + L * .35, Y0 + 1, X1 - 2, Y1 - 1], 9, fill=C[2], outline=OUT)
        d.rounded_rectangle([X0 + L * .5, Y0 + 5, X1 - 20, Y1 - 5], 6, fill=C[3], outline=OUT); d.rectangle([X0 + L * .5 + 4, Y0 + 7, X0 + L * .5 + 14, Y1 - 7], fill=(60, 80, 96))
        for k in range(3):                                                    # sandbags and a door at its end
            sx = X0 + 4 + k * 20; d.rounded_rectangle([sx, cy - 8, sx + 18, cy + 8], 5, fill=ramp((170, 150, 104), 14)[2], outline=OUT)
    elif e == 7:
        for k in range(int(L // 46)):                                         # concrete jersey barriers
            gx = X0 + 2 + k * 46; shadow(tm, gx, Y0 + 4, gx + 44, Y1 - 4, 4)
            Cc = ramp(mix(p.stone[2], (176, 174, 168), .5), 12)
            d.rectangle([gx, Y0 + 4, gx + 44, Y1 - 4], fill=Cc[1], outline=OUT); d.rectangle([gx + 3, cy - 4, gx + 41, cy + 3], fill=Cc[3])
            if p.w >= 2: d.rectangle([gx + 4, Y0 + 6, gx + 12, Y0 + 9], fill=(230, 60, 40)); d.rectangle([gx + 32, Y0 + 6, gx + 40, Y0 + 9], fill=WHITE[3])
        d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=STEEL[3], width=2)
        for gx in range(X0 + 4, X1 - 2, 6): d.line([gx, Y1 - 4, gx, Y1], fill=STEEL[2])
    elif p.w <= 1:                                                           # Future Darkness, poor: welded scrap sheet
        shadow(tm, X0, Y0 + 3, X1, Y1 - 3, 4)
        for k in range(int(L // 14)):
            gx = X0 + k * 14; c = ramp(mix((124, 74, 46), p.comp[2], rng.uniform(.2, .7)), 12)
            d.rectangle([gx, Y0 + 3 + rng.uniform(0, 4), gx + 16, Y1 - 3 - rng.uniform(0, 4)], fill=c[2], outline=OUT)
    else:
        shadow(tm, X0, Y0 + 3, X1, Y1 - 3, 4)
        d.rectangle([X0, Y0 + 3, X1, Y1 - 3], fill=p.comp[1], outline=OUT)
        for gx in range(X0 + 20, X1, 24): d.line([gx, Y0 + 4, gx, Y1 - 4], fill=p.comp[0])
        d.line([X0 + 3, cy, X1 - 3, cy], fill=mix(p.acc[3], (230, 60, 40), .5), width=2); d.line([X0 + 3, Y0 + 5, X1 - 3, Y0 + 5], fill=p.comp[3])
    if p.worn: scuffs(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, p.stone, rng, 7)
    if p.broken:
        for k in range(6): sx, sy = rng.uniform(X0 + 4, X1 - 8), rng.uniform(Y0 + 2, Y1 - 4); d.rectangle([sx, sy, sx + 4, sy + 3], fill=p.wood[1], outline=OUT)
        crack(tm, X0 + L * .4, Y0 + 2, X0 + L * .45, Y1 - 2, rng)


define("barricade", draw=barricade, ref="street barricades of setts and carts 6 to 10 ft long (Paris 1830, 1848); jersey barriers 10 ft by 2 ft",
       tags=("street", "quay", "gate", "alley"))


# ================================================================ sandbags
def sandbags(tm, x, y, w, h, st, v):
    """Sandbags laid in courses, each bag a filled pillow with its tied neck, the joints broken like brickwork. Age of
    Reason and Victorian: undyed sacking of the region's fibre, the Victorian's stencilled with a store mark (hemp, flax, cotton, jute, sisal, agave, coir, rice straw
    and the like). Great War: hessian bags gone grey and brown. Mid-Century: khaki. Modern:
    woven polypropylene, white or green. Mid-Century lays them as headers, ends out. Future Darkness: grey composite cells and a mesh-faced filled barrier.
    From the Great War they are issue stores, the same the world over: the make axis is the bag (jute, weathered
    grey, olive, new sand-coloured, tarred or black, white) and the height of the wall (two, three or four courses).
    A broken run has burst bags and sand spilt in front."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    if e <= 4: base = SACK.get(p.st, (180, 160, 116))                           # the region's own sacking fibre
    else: fab, mdl = make(v, "hessian wall"); base = BAGS[min(e, 8)][BAG_KEYS.index(fab)]
    if e == 4: base = mix(base, (140, 106, 66), .45)                              # Victorian: Dundee jute, darker and machine-woven
    C = ramp(base, 14)
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    shadow(tm, X0, Y0, X1, Y1, 4)
    rows = {"low": 2, "wall": 3, "high": 4}[make(v, "hessian wall")[1]]; bh = (Y1 - Y0) / rows; bw = (24 if rows < 4 else 18) if e != 6 else 13   # Mid-Century lays them as headers, ends out
    for r in range(rows):
        y0 = Y0 + r * bh; off = (r % 2) * bw // 2
        for bx in range(int(X0 - off), X1, bw):
            a, b = max(X0, bx), min(X1, bx + bw - 1)
            if b - a < 6: continue
            if p.broken and r == rows - 1 and abs(bx - (X0 + X1) // 2) < bw:      # a burst bag and spilt sand
                d.polygon([(a, y0 + 2), (b, y0 + 4), (b - 2, y0 + bh), (a + 3, y0 + bh - 2)], fill=C[1], outline=OUT)
                d.ellipse([a - 4, y0 + bh - 6, b + 4, Y1 + 2], fill=mix(p.stone[3], (200, 180, 130), .5)); continue
            d.rounded_rectangle([a, y0 + 1, b, y0 + bh - 1], 5, fill=C[2], outline=OUT)
            d.line([a + 3, y0 + 2, b - 3, y0 + 2], fill=C[4]); d.line([a + 3, y0 + bh - 3, b - 3, y0 + bh - 3], fill=C[0])
            d.line([b - 5, y0 + 4, b - 5, y0 + bh - 4], fill=C[1])                # the tied neck folded under
            if e == 4 and b - a > 14: d.polygon([(a + 6, y0 + bh - 4), (a + 9, y0 + 3), (a + 12, y0 + bh - 4)], outline=C[0])   # the store's stencilled mark
            if e == 7: d.line([a + 4, y0 + bh / 2, b - 8, y0 + bh / 2], fill=C[3])   # the weave
            if e >= 8: d.rectangle([a + 3, y0 + 4, b - 7, y0 + bh - 4], outline=C[1])
    if e >= 8: d.line([X0 + 2, Y0 + 2, X1 - 2, Y0 + 2], fill=mix(GLOW[1], p.acc[3], .4))
    if p.w >= 4:                                                              # a well-kept post: a revetment of planks behind
        d.rectangle([X0, Y0, X1, Y0 + 3], fill=p.wood[2], outline=OUT)
    if p.worn: scuffs(tm, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, C, rng, 7)


SACK = {"central": (176, 156, 112), "atlantic": (196, 184, 150), "northern": (150, 140, 116), "mediterranean": (206, 190, 150),
        "islamic": (214, 200, 166), "steppe": (140, 118, 92), "southasia": (178, 140, 84), "eastasia": (200, 178, 112),
        "seasia": (160, 150, 92), "africa": (206, 186, 126), "americas": (188, 172, 120), "oceania": (124, 92, 58),
        "polar": (112, 90, 70)}   # hemp, flax, tow, cotton, cotton, felted wool, jute, rice straw, pandanus, sisal, agave, coir, hide
BAG_KEYS = ["hessian", "grey", "olive", "sand", "black", "white"]
BAGS = {5: [(176, 156, 112), (140, 136, 124), (118, 112, 84), (196, 176, 132), (72, 66, 56), (206, 200, 184)],    # jute, weathered, mud-caked, new, tarred, limewashed
        6: [(170, 150, 108), (140, 136, 124), (100, 104, 70), (196, 176, 132), (72, 66, 56), (206, 200, 184)],
        7: [(176, 156, 112), (150, 150, 146), (88, 108, 72), (214, 210, 196), (56, 58, 56), (232, 230, 222)],     # jute or woven polypropylene
        8: [(150, 140, 116), (100, 104, 110), (78, 90, 76), (176, 170, 158), (46, 48, 54), (200, 204, 210)]}


define("sandbags", draw=sandbags, global_from=1902, axes={"material": makes(BAG_KEYS, ["low", "wall", "high"], ["sand wall"])}, nvar=20, ref="sandbags about 2 ft by 1 ft filled (British Field Service Pocket Book 1914), laid in courses",
       tags=("gate", "street", "depot"))


# ================================================================ low wall or parapet
def parapet(tm, x, y, w, h, st, v):
    """A low wall seen from above: its coping. Dark Ages: rubble or ashlar with merlons and crenels (stepped merlons
    in the Islamic lands, tiled coping in East Asia, adobe in the Americas and Africa); the Long Night's merlons
    broader, each with an arrow slit; the Renaissance's a thick gun parapet with splayed embrasures. Age of Reason:
    dressed stone with a moulded coping. Victorian: brick with a stone coping and iron railing; the Great War lays
    sandbags along it.
    Mid-Century: concrete. Modern: concrete with a steel rail. Future Darkness: a dark composite wall with a lit edge."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; L = X1 - X0
    shadow(tm, X0, Y0, X1, Y1, 4)
    S = p.stone
    if e <= 2:
        d.rectangle([X0, Y0 + 2, X1, Y1 - 2], fill=S[1], outline=OUT)
        n = (5, 4, 3)[e]; mw = L / (2 * n)                                   # merlons and the crenels between: broader in the Long Night
        for k in range(n):
            mx = X0 + k * 2 * mw + mw / 2
            if p.broken and k == 2: continue
            if p.st == "islamic":
                d.polygon([(mx, Y0), (mx + mw, Y0), (mx + mw, Y1), (mx, Y1)], fill=S[3], outline=OUT); d.rectangle([mx + 3, Y0 + 3, mx + mw - 3, Y1 - 3], fill=S[4])
            elif p.st == "eastasia":
                d.rectangle([mx, Y0, mx + mw, Y1], fill=(80, 90, 96), outline=OUT)
                for gx in range(int(mx) + 2, int(mx + mw) - 1, 4): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=(120, 130, 136))
            elif e == 2:                                                     # Renaissance: a thick gun parapet, the embrasures splayed
                d.polygon([(mx - mw * .3, Y0), (mx + mw * 1.3, Y0), (mx + mw, Y1), (mx, Y1)], fill=S[3], outline=OUT); d.line([mx - mw * .25, Y0 + 1, mx + mw * 1.25, Y0 + 1], fill=S[4])
            else:
                d.rectangle([mx, Y0, mx + mw, Y1], fill=S[3], outline=OUT); d.line([mx + 1, Y0 + 1, mx + mw - 1, Y0 + 1], fill=S[4])
                d.line([mx + mw / 2, Y0 + 2, mx + mw / 2, Y1 - 2], fill=S[1])
                if e == 1: d.rectangle([mx + mw / 2 - 2, Y0 + 3, mx + mw / 2 + 2, Y1 - 3], fill=(16, 12, 14))   # the arrow slit
        if p.w <= 1:
            for k in range(int(L / 10)): sx = X0 + k * 10 + rng.uniform(0, 4); d.ellipse([sx, Y0 + 3, sx + 6, Y1 - 3], outline=S[0])
    elif e == 3:
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=S[3], outline=OUT); d.line([X0 + 1, Y0 + 2, X1 - 1, Y0 + 2], fill=S[4]); d.line([X0 + 1, Y1 - 3, X1 - 1, Y1 - 3], fill=S[1])
        for gx in range(X0 + 28, X1, 28): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=S[1])
        if p.w >= 4:
            for gx in range(X0 + 14, X1, 28): d.ellipse([gx - 5, (Y0 + Y1) // 2 - 5, gx + 5, (Y0 + Y1) // 2 + 5], fill=S[4], outline=OUT)   # urns on the piers
    elif e <= 5:
        B = ramp(mix((150, 70, 50), S[2], .5), 14)
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=B[2], outline=OUT)
        for gx in range(X0 + 4, X1, 12): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=B[0])
        d.rectangle([X0, Y0 + 3, X1, Y1 - 3], fill=S[3], outline=OUT)
        for gx in range(X0 + 20, X1, 20): d.line([gx, Y0 + 4, gx, Y1 - 4], fill=S[1])
        if p.w >= 2:
            for gx in range(X0 + 6, X1 - 2, 7): d.rectangle([gx, (Y0 + Y1) // 2 - 1, gx + 2, (Y0 + Y1) // 2 + 1], fill=IRON[1])
            d.line([X0 + 2, (Y0 + Y1) // 2, X1 - 2, (Y0 + Y1) // 2], fill=IRON[3])
        if e == 5:                                                            # Great War: sandbags of the local sacking laid along the coping
            SB = ramp(SACK.get(p.st, (176, 156, 112)), 14)
            for gx in range(X0 + 1, X1 - 10, 40): d.rounded_rectangle([gx, Y0 + 2, gx + 15, Y1 - 2], 4, fill=SB[2], outline=OUT); d.line([gx + 3, Y0 + 3, gx + 12, Y0 + 3], fill=SB[4])
    elif e <= 7:
        Cc = ramp(mix(S[2], (170, 168, 162), .3), 12)
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=mix(S[3], p.acc[2], .4), outline=OUT)        # the rendered wall under its coping
        d.rectangle([X0 + 1, Y0 + 4, X1 - 1, Y1 - 4], fill=Cc[2], outline=OUT); d.line([X0 + 2, Y0 + 5, X1 - 2, Y0 + 5], fill=Cc[4])
        if p.w <= 1:                                                          # bottle glass set in the coping against climbers
            for gx in range(X0 + 4, X1 - 4, 5): d.polygon([(gx, Y1 - 6), (gx + 2, Y0 + 6), (gx + 4, Y1 - 6)], fill=[(70, 130, 80), (140, 90, 40), (180, 200, 200)][gx % 3])
        elif p.w >= 4:
            for gx in range(X0 + 8, X1 - 4, 16): d.rectangle([gx - 2, Y0 + 3, gx + 2, Y1 - 3], fill=p.acc[3], outline=OUT)
        for gx in range(X0 + 40, X1, 40): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=Cc[0])
        if e == 7:
            d.line([X0 + 2, (Y0 + Y1) // 2, X1 - 2, (Y0 + Y1) // 2], fill=STEEL[3], width=3)
            for gx in range(X0 + 6, X1, 30): d.ellipse([gx - 2, (Y0 + Y1) // 2 - 2, gx + 2, (Y0 + Y1) // 2 + 2], fill=STEEL[4], outline=OUT)
            if p.w <= 1: d.line([X0 + 30, Y0 + 3, X0 + 60, Y0 + 5], fill=p.acc[3], width=2)   # a tag sprayed on it
    else:
        F = ramp(mix(S[2], (58, 64, 74), .35), 12)
        if p.w <= 1: F = ramp(mix(F[2], (120, 80, 60), .3), 12)
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=F[2], outline=OUT); d.line([X0 + 1, Y0 + 2, X1 - 1, Y0 + 2], fill=p.lit[1])
        for gx in range(X0 + 30, X1, 30): d.rectangle([gx - 1, Y0 + 3, gx + 1, Y1 - 3], fill=F[4])
        d.line([X0 + 2, Y1 - 4, X1 - 2, Y1 - 4], fill=p.acc[2])
        if p.w >= 4: d.rectangle([X0 + 2, Y0 + 5, X1 - 2, Y1 - 6], outline=p.acc[3])
    if p.st in ("mediterranean", "southasia", "islamic") and e >= 3 and e < 8:   # a plant pot on the coping
        d.ellipse([X1 - 20, Y0 + 1, X1 - 10, Y1 - 1], fill=(170, 90, 60), outline=OUT); d.ellipse([X1 - 18, Y0 + 2, X1 - 12, Y1 - 3], fill=(70, 120, 60))
    if p.worn: scuffs(tm, X0 + 3, Y0 + 2, X1 - 3, Y1 - 2, S, rng, 8)
    if p.broken:
        d.polygon([(X0 + L * .6, Y0), (X0 + L * .7, Y0), (X0 + L * .66, Y1)], fill=S[0], outline=OUT)
        for k in range(4): sx = X0 + L * .6 + rng.uniform(-6, 16); d.rectangle([sx, Y1 - 3, sx + 4, Y1], fill=S[2], outline=OUT)


define("parapet", draw=parapet, ref="parapets 18 in to 2 ft thick and about 3 ft high; merlons 5 to 6 ft wide (Viollet-le-Duc, Dictionnaire)",
       tags=("bailey", "tower", "courtyard", "park", "quay"))


# ================================================================ caltrops or broken glass
def caltrops(tm, x, y, w, h, st, v):
    """A scatter that hurts the feet. Dark Ages to Age of Reason: iron caltrops, four points each, one always up.
    Victorian: broken bottle glass in green, brown and clear. Great War: nails and wire ends. Mid-Century: glass from a
    smashed window. Modern: a police spike strip across the scatter. Future Darkness: small dark smart caltrops with
    lit tips. Each region's ground shows under it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    ground(tm, X0, Y0, X1, Y1, p.ground, rng)
    n = 10 + p.w * 2
    pts = [(rng.uniform(X0 + 8, X1 - 8), rng.uniform(Y0 + 8, Y1 - 8)) for _ in range(n)]
    for k, (cx, cy) in enumerate(pts):
        if e <= 3:
            M = p.metal if p.w >= 4 else (IRON if not p.worn else ramp((120, 74, 48), 14))
            a = rng.uniform(0, 6.28)
            for j in range(3):
                b = a + j * 2.094; d.line([cx, cy, cx + math.cos(b) * 6, cy + math.sin(b) * 6], fill=OUT, width=3); d.line([cx, cy, cx + math.cos(b) * 5, cy + math.sin(b) * 5], fill=M[3])
            d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=M[4])
        elif e in (4, 6):
            G = [ramp((54, 112, 60), 18), ramp((120, 70, 34), 18), ramp((170, 196, 200), 16)][k % 3]
            s = rng.uniform(3, 7); a = rng.uniform(0, 6.28)
            d.polygon([(cx, cy), (cx + math.cos(a) * s, cy + math.sin(a) * s), (cx + math.cos(a + 1.2) * s * .6, cy + math.sin(a + 1.2) * s * .6)], fill=G[2], outline=G[0])
            d.point((cx + 1, cy), fill=G[4])
        elif e == 5:
            a = rng.uniform(0, 6.28); d.line([cx, cy, cx + math.cos(a) * 7, cy + math.sin(a) * 7], fill=IRON[3], width=1); d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=IRON[4])
        elif e == 7:
            pass
        else:
            d.polygon([(cx, cy - 5), (cx + 5, cy + 3), (cx - 5, cy + 3)], fill=p.comp[2], outline=OUT); d.point((cx, cy - 4), fill=mix(GLOW[2], p.acc[3], .3))
    if e == 7:                                                                # the spike strip, a folding lattice of spikes
        cy = (Y0 + Y1) // 2; Y = (Y1 - Y0) // 3
        for k in range(int((X1 - X0 - 8) // 10)):
            sx = X0 + 4 + k * 10; d.line([sx, cy - Y, sx + 10, cy + Y], fill=OUT, width=3); d.line([sx, cy + Y, sx + 10, cy - Y], fill=OUT, width=3)
            d.line([sx, cy - Y, sx + 10, cy + Y], fill=(230, 190, 40) if p.w >= 2 else STEEL[3]); d.line([sx, cy + Y, sx + 10, cy - Y], fill=STEEL[3])
            for yy in (cy - Y, cy, cy + Y): d.rectangle([sx + 4, yy - 1, sx + 6, yy + 1], fill=STEEL[4], outline=OUT)
        for k in range(6): cx, cy2 = rng.uniform(X0 + 8, X1 - 8), rng.uniform(Y0 + 6, Y1 - 6); d.polygon([(cx, cy2), (cx + 4, cy2 + 1), (cx + 1, cy2 + 4)], fill=(170, 196, 200))
    if p.broken:
        d.ellipse([X0 + 10, Y1 - 24, X0 + 26, Y1 - 12], fill=(110, 20, 24))   # blood where someone trod
        d.ellipse([X0 + 14, Y1 - 20, X0 + 20, Y1 - 16], fill=(150, 30, 30))


define("caltrops", draw=caltrops, ref="caltrops with 1 1/2 to 2 in points, strewn over a few yards (Royal Armouries)", tags=("gate", "alley", "street"))


# ================================================================ live wire
def livewire(tm, x, y, w, h, st, v):
    """A cable down across the floor, its cut end spitting sparks over a scorched patch. Victorian: a cloth-wrapped
    copper wire off a porcelain insulator. Great War: a twisted pair of field telephone wire. Mid-Century: black
    rubber cable. Modern: an orange site cable or a thick power line. Future Darkness: a split glowing conduit. A
    puddle round the end in a wet place.
    Factory cable, the same the world over: the make axis is its sheath (plain, black, red, grey) and the floor
    it lies on (dry earth, boards, flags, a puddle)."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cy = (Y0 + Y1) // 2; H = (Y1 - Y0) // 2 - 2
    cl, wet = make(v, "plain dry"); col = CABLE[min(max(e, 4), 8)][CABLE_KEYS.index(cl)]
    if wet == "boards":
        slab(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.wood, "x", rng=rng, gaps=[(Y1 - Y0) * k // 3 for k in (1, 2)])
    elif wet == "flags":
        d.rectangle([X0 - 1, Y0 - 1, X1 + 1, Y1 + 1], fill=p.stone[3], outline=OUT)
        for gx in range(X0 + 18, X1, 22): d.line([gx, Y0, gx, Y1], fill=p.stone[0])
        d.line([X0, cy, X1, cy], fill=p.stone[0])
    else: ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    if wet == "puddle":
        d.ellipse([X1 - 30, Y0, X1 - 2, Y1], fill=(50, 70, 100)); d.arc([X1 - 26, Y0 + 2, X1 - 8, Y1 - 3], 190, 270, fill=(130, 170, 200))
    d.ellipse([X1 - 24, Y0 + 1, X1 - 6, Y1 - 1], fill=(34, 26, 24))          # scorched floor
    pts = [(X0 + 2 + t * (X1 - X0 - 18), cy + math.sin(t * 7 + p.w) * H) for t in np.linspace(0, 1, 14)]
    if e == 5:                                                                # Great War: a twisted pair of field telephone wire
        p2 = [(a, b + math.sin(k * 1.6) * 3) for k, (a, b) in enumerate(pts)]; p3 = [(a, b - math.sin(k * 1.6) * 3) for k, (a, b) in enumerate(pts)]
        for q in (p2, p3): d.line(q, fill=OUT, width=3); d.line(q, fill=col, width=1)
    else: d.line(pts, fill=OUT, width=5); d.line(pts, fill=col, width=3); d.line([(a, b - 1) for a, b in pts], fill=tone(col, 40))
    if e <= 5:
        d.ellipse([X0 + 1, cy - 5, X0 + 10, cy + 4], fill=WHITE[3], outline=OUT)   # the porcelain insulator
        for k in range(1, 13, 2): a, b = pts[k]; d.line([a - 1, b - 2, a + 1, b + 2], fill=tone(col, -30))   # its cloth wrap
    if e >= 8: glowline(tm, pts[-6:], [mix(GLOW[0], p.acc[2], .3), GLOW[1], GLOW[2]])
    ex, ey = pts[-1]
    copper = (210, 130, 60)
    for a in (-.6, 0, .6): d.line([ex, ey, ex + math.cos(a) * 6, ey + math.sin(a) * 5], fill=copper)   # the frayed strands
    if not p.worn:                                                            # live: the sparks (worn: it lies dead)
        for k in range(8):
            a = rng.uniform(0, 6.28); q = rng.uniform(3, 9); sx, sy = ex + 4 + math.cos(a) * q, ey + math.sin(a) * q * .6
            d.line([ex + 4, ey, sx, sy], fill=(255, 240, 160) if k % 2 else (150, 200, 255))
        d.rectangle([ex + 3, ey - 1, ex + 5, ey + 1], fill=(255, 255, 230))
        tm.hearths = getattr(tm, "hearths", []) + [(ex + 4, ey, 30, None)]


CABLE_KEYS = ["plain", "black", "red", "grey", "bright", "white", "green", "blue"]
CABLE = {4: [(110, 88, 60), (40, 36, 34), (130, 44, 36), (120, 116, 104), (150, 120, 70), (196, 188, 166), (60, 84, 52), (50, 60, 96)],    # cloth-braided copper
         5: [(120, 100, 70), (40, 36, 34), (130, 44, 36), (120, 116, 104), (160, 140, 90), (196, 188, 166), (60, 84, 52), (50, 60, 96)],
         6: [(36, 34, 36), (60, 58, 60), (140, 40, 34), (130, 130, 128), (190, 170, 120), (206, 200, 186), (50, 96, 60), (50, 70, 120)],    # rubber
         7: [(230, 120, 30), (32, 32, 36), (200, 40, 36), (150, 152, 156), (220, 200, 40), (226, 226, 222), (40, 140, 70), (40, 90, 180)],   # PVC site and flex cables
         8: [(40, 44, 56), (24, 24, 30), (170, 40, 60), (110, 116, 130), (60, 180, 210), (210, 214, 224), (80, 200, 120), (90, 110, 230)]}


define("livewire", draw=livewire, global_from=1837, axes={"material": makes(CABLE_KEYS[:4], ["dry", "boards", "flags", "puddle"], [])}, nvar=20, ref="service cables 1/2 to 1 in across; a 4 ft run of it down on the floor",
       tags=("tunnel", "lab", "depot", "street"))


# ================================================================ snare
def snare(tm, x, y, w, h, st, v):
    """A snare set in a run: a noose standing open between two pegs, its line tied off to a bent sapling's stake.
    Cords of sinew, horsehair or twisted bark before the Victorian age; brass wire then; steel cable and a lock since
    the Great War; a monofilament loop with a tag in Future Darkness. Each age sets it its own way: the Long Night
    with a figure-four trigger, the Renaissance under a propped deadfall stone, the Age of Reason as a springe on a
    bent bow, the Victorian with a cleft tealer stick, the Great War on an iron stake and chain, Mid-Century in
    galvanized wire on a forked peg, Modern as a stop-snare with a swivel and a tag. The run worn through the ground cover of its
    region."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    G = p.ground
    d.ellipse([X0, Y0, X1, Y1], fill=G[2])
    d.line([X0 + 4, Y1 - 4, X1 - 4, Y0 + 4], fill=G[0], width=6)               # the run
    for k in range(5): a = rng.uniform(0, 6.28); q = rng.uniform(8, 14); d.line([cx + math.cos(a) * q, cy + math.sin(a) * q, cx + math.cos(a) * q + 2, cy + math.sin(a) * q - 2], fill=G[4])
    cord = {0: (150, 120, 80), 4: BRASS[3], 5: STEEL[3]}.get(min(e, 5) if e < 4 else (4 if e == 4 else 5), (150, 120, 80))
    if e < 4: cord = mix(cord, p.cloth[2], .5)
    if e >= 8: cord = GLOW[2]
    if e < 4 and p.st in ("africa", "seasia", "southasia", "oceania"): cord = (120, 100, 50)
    for sx, sy in ((cx - 9, cy - 1), (cx + 9, cy + 1)): d.rectangle([sx - 2, sy - 2, sx + 2, sy + 2], fill=p.wood[3], outline=OUT)   # the pegs
    d.ellipse([cx - 6, cy - 7, cx + 6, cy + 5], outline=cord, width=1 if e >= 4 else 2)   # the noose
    d.line([cx + 6, cy - 1, X1 - 4, Y0 + 4], fill=cord)
    d.rectangle([X1 - 7, Y0 + 2, X1 - 2, Y0 + 7], fill=p.wood[2], outline=OUT)   # the stake it is tied to
    if e >= 5: d.rectangle([cx + 4, cy - 2, cx + 7, cy], fill=STEEL[4], outline=OUT)   # the lock
    if e == 1:                                                                # Long Night: a figure-four trigger by the loop
        for a_, b_ in (((X0 + 5, cy + 2), (X0 + 5, cy - 12)), ((X0 + 2, cy - 8), (X0 + 16, cy - 8)), ((X0 + 4, cy - 2), (X0 + 15, cy - 13))): d.line([a_, b_], fill=OUT, width=4); d.line([a_, b_], fill=p.wood[3], width=2)
    elif e == 2:                                                              # Renaissance: a deadfall stone propped over the run
        d.polygon([(cx - 14, cy - 15), (cx + 6, cy - 17), (cx + 9, cy - 5), (cx - 12, cy - 3)], fill=p.stone[3], outline=OUT); d.line([cx - 8, cy - 3, cx - 6, cy + 4], fill=p.wood[3], width=2)
    elif e == 3:                                                              # Age of Reason: a springe, a bent bow of hazel over the loop
        d.arc([cx - 15, cy - 16, cx + 15, cy + 14], 190, 350, fill=OUT, width=4); d.arc([cx - 15, cy - 16, cx + 15, cy + 14], 190, 350, fill=p.wood[3], width=2)
    elif e == 4:                                                              # Victorian: a cleft tealer stick holding the brass wire up
        d.line([cx - 1, cy + 10, cx - 1, cy - 2], fill=OUT, width=4); d.line([cx - 1, cy + 10, cx - 1, cy - 2], fill=p.wood[4], width=2); d.line([cx - 4, cy - 4, cx + 2, cy - 4], fill=p.wood[4])
    elif e == 5:                                                              # Great War: an iron stake and a short chain
        d.rectangle([X1 - 8, Y0 + 2, X1 - 3, Y0 + 7], fill=IRON[3], outline=OUT); d.line([X1 - 6, Y0 + 7, cx + 7, cy - 1], fill=IRON[4], width=2)
    elif e == 6:                                                              # Mid-Century: galvanized wire round a forked hazel peg
        d.ellipse([cx - 8, cy - 9, cx + 8, cy + 7], outline=(176, 180, 184), width=1); d.line([cx - 10, cy + 12, cx - 4, cy + 4], fill=p.wood[3], width=3)
    elif e == 7:                                                              # Modern: a stop-snare with a swivel and an orange tag
        d.ellipse([cx + 6, cy - 4, cx + 11, cy + 1], fill=STEEL[3], outline=OUT); d.rectangle([cx + 2, cy + 4, cx + 8, cy + 9], fill=(232, 120, 30), outline=OUT)
    if e >= 8: d.rectangle([X1 - 9, Y0 + 8, X1 - 5, Y0 + 11], fill=p.acc[3])
    if v.get("contents") == "bait":                                           # a scatter of grain or a bit of bait in the loop
        for k in range(5): d.rectangle([cx - 4 + k * 2, cy - 2 + (k % 2) * 2, cx - 3 + k * 2, cy - 1 + (k % 2) * 2], fill=(220, 190, 90))
    if v.get("contents") == "sapling":                                        # the bent sapling the line runs to, its leaves
        for k in range(4): d.ellipse([X1 - 14 + k * 3, Y0 + 1 + (k % 2) * 3, X1 - 8 + k * 3, Y0 + 6 + (k % 2) * 3], fill=ramp(mix((70, 110, 50), p.ground[2], .3), 14)[3], outline=OUT)
    if p.broken:                                                              # sprung: a rabbit or bird caught in it
        d.ellipse([cx - 6, cy - 4, cx + 4, cy + 4], fill=(120, 96, 70) if p.st != "polar" else (230, 230, 230), outline=OUT); d.point((cx - 4, cy - 2), fill=OUT)
    if p.worn: d.line([cx - 8, cy + 6, cx + 6, cy + 8], fill=G[0], width=2)


define("snare", draw=snare, axes={"contents": ["plain", "bait", "sapling"]}, ref="rabbit snares with a loop 4 to 5 in across set a hand above the run", tags=("woods", "field"))


# ================================================================ pit trap
def pit(tm, x, y, w, h, st, v):
    """A pit trap. Closed: its cover of laid sticks, leaves or straw (or a hinged floor flag in a dungeon or tunnel)
    a shade off the ground round it. Open: the square hole, its sides dark, sharpened stakes at the bottom. Dark Ages
    to Age of Reason: brushwood and earth; Victorian on: boards and a trapdoor; Mid-Century: boards under rubble; Modern: a
    sheet of OSB under rubble and a blue tarpaulin; Future Darkness: a hinged floor plate with a dark seam."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); e = p.e
    G = p.ground
    built = e >= 4 or v.get("material") == "dungeon"
    d.rectangle([X0, Y0, X1, Y1], fill=G[1] if not built else p.stone[2])
    if built:
        for gy in range(Y0, Y1, 18): d.line([X0, gy, X1, gy], fill=p.stone[0])
        for gx in range(X0, X1, 24): d.line([gx, Y0, gx, Y1], fill=p.stone[0])
    i0, j0, i1, j1 = X0 + 8, Y0 + 8, X1 - 8, Y1 - 8
    if st == "open" or p.broken:
        d.rectangle([i0, j0, i1, j1], fill=(16, 12, 14), outline=OUT)
        d.polygon([(i0, j0), (i1, j0), (i1 - 10, j0 + 10), (i0 + 10, j0 + 10)], fill=tone(G[0], -30) if not built else p.stone[0])   # the far wall lit
        d.polygon([(i0, j0), (i0 + 10, j0 + 10), (i0 + 10, j1 - 10), (i0, j1)], fill=tone(G[0], -40) if not built else tone(p.stone[0], -10))
        for k in range(9 if e < 8 else 0):                                     # the stakes at the bottom
            sx, sy = i0 + 16 + (k % 3) * (i1 - i0 - 32) / 2, j0 + 16 + (k // 3) * (j1 - j0 - 32) / 2
            M = p.wood if e < 6 else STEEL
            d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=M[2], outline=OUT); d.point((sx - 1, sy - 1), fill=M[4])
        if e >= 8: d.rectangle([i0 + 12, j0 + 12, i1 - 12, j1 - 12], outline=GLOW[1])
        if p.broken and st != "open":                                         # fallen in: the cover's sticks broken down into it
            for k in range(7): a = rng.uniform(-.6, .6); sx = rng.uniform(i0, i1); d.line([sx, j0 + 2, sx + math.sin(a) * 20, j1 - 4], fill=p.wood[2], width=2)
        return
    if e <= 3:
        for k in range(14):                                                    # the laid sticks
            yy = j0 + k * (j1 - j0) / 14; d.line([i0 - 4, yy, i1 + 4, yy + rng.uniform(-3, 3)], fill=p.wood[1 + k % 3], width=2)
        for k in range(40 + p.w * 6):                                          # leaves or straw strewn over
            sx, sy = rng.uniform(i0, i1), rng.uniform(j0, j1); c = (G[3] if k % 3 else ramp(p.cloth[2], 12)[3]) if p.st != "polar" else (230, 232, 236)
            d.ellipse([sx, sy, sx + 4, sy + 2], fill=c)
    elif e <= 7:
        Bd = p.wood if e <= 5 else ramp(mix((170, 150, 110), p.wood[2], .5), 12)
        d.rectangle([i0, j0, i1, j1], fill=Bd[2], outline=Bd[0])
        for gx in range(i0 + 12, i1, 12): d.line([gx, j0 + 1, gx, j1 - 1], fill=Bd[1])
        if e == 7:                                                             # Modern: a sheet of OSB, a blue tarpaulin dragged half over it
            d.rectangle([i0, j0, i1, j1], fill=(196, 166, 110), outline=OUT)
            for k in range(60): sx, sy = rng.uniform(i0, i1 - 5), rng.uniform(j0, j1 - 3); d.rectangle([sx, sy, sx + 5, sy + 2], fill=[(170, 136, 84), (214, 186, 130)][k % 2])
            d.polygon([(i0, j0), (i0 + (i1 - i0) * .5, j0), (i0 + (i1 - i0) * .4, j1), (i0, j1)], fill=(44, 84, 156), outline=OUT)
        for k in range(18): sx, sy = rng.uniform(i0, i1 - 6), rng.uniform(j0, j1 - 4); d.rectangle([sx, sy, sx + 5, sy + 3], fill=p.stone[int(rng.integers(1, 4))])
    else:
        d.rectangle([i0, j0, i1, j1], fill=p.comp[2], outline=p.comp[0]); d.line([i0, (j0 + j1) // 2, i1, (j0 + j1) // 2], fill=OUT)
        d.rectangle([i1 - 10, j0 + 4, i1 - 4, j0 + 7], fill=mix(GLOW[0], p.acc[2], .3))
    if p.worn: scuffs(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 4, G, rng, 6)


define("pit", draw=pit, states=("closed", "open"), axes={"material": ["earth", "dungeon"]},
       ref="game and man traps about 4 to 6 ft square and 6 ft deep (Gaston Phebus, Livre de la chasse)", tags=("woods", "tunnel", "dungeon", "caern"))


# ================================================================ tripwire
def tripwire(tm, x, y, w, h, st, v):
    """A tripwire across a way between two pegs or nails. Dark Ages: a cord with little bells; the Long Night hangs
    a rattle of bones on it, the Renaissance runs it to a box of powder, the Age of Reason to a spring-gun, the
    Victorian to a can of stones. Great War: a wire to a Mills grenade on a stake. Mid-Century: a trip flare. Modern: a
    thin wire to a flat mine. The poor use a tin of stones or a string of cans. Future Darkness: a red beam between two small emitters."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cy = (Y0 + Y1) // 2
    G = p.ground; ground(tm, X0, Y0, X1, Y1, G, rng, "rect")
    for sx in (X0 + 1, X1 - 10): d.rectangle([sx, Y0, sx + 9, Y1], fill=p.wood[3] if e < 8 else p.comp[2], outline=OUT)
    d.rectangle([X0 + 30, Y0 + 1, X0 + 36, Y1 - 1], fill=p.cloth[3], outline=OUT)   # a rag tied on to find it again
    if e >= 8:
        bm = mix((255, 80, 70), p.acc[3], .45)
        d.line([X0 + 8, cy, X1 - 8, cy], fill=tone(bm, -90), width=3); d.line([X0 + 8, cy, X1 - 8, cy], fill=bm)
        d.point((X0 + 5, cy), fill=(255, 200, 200)); d.point((X1 - 5, cy), fill=(255, 200, 200)); return
    cord = (170, 150, 110) if e <= 4 else STEEL[4]
    if p.st in ("africa", "seasia", "oceania") and e <= 4: cord = (130, 110, 60)
    d.line([X0 + 8, cy, X1 - 8, cy], fill=cord)
    if e <= 4:
        for bx in range(X0 + 22, X1 - 14, 16 if p.w >= 3 else 30):          # bells or rattles on the cord
            if e == 1: d.rectangle([bx - 4, cy - 3, bx + 4, cy + 3], fill=(226, 218, 196), outline=OUT); continue   # Long Night: a rattle of bones
            B = p.metal if p.w >= 2 else ramp((150, 120, 80), 14); d.ellipse([bx - 2, cy - 2, bx + 2, cy + 2], fill=B[3], outline=OUT)
        if e == 2: d.rectangle([X1 - 24, Y0, X1 - 10, Y1], fill=p.wood[1], outline=OUT); d.rectangle([X1 - 20, Y0 + 1, X1 - 14, Y1 - 1], fill=(40, 36, 40))   # a box of powder to flash
        elif e == 3:                                                          # Age of Reason: a spring-gun laid along the way
            d.line([X0 + 40, Y0 + 1, X1 - 12, Y0 + 1], fill=OUT, width=3); d.line([X0 + 40, Y0 + 1, X1 - 12, Y0 + 1], fill=IRON[3]); d.rectangle([X1 - 26, Y0, X1 - 10, Y1], fill=p.wood[2], outline=OUT)
        else: d.rectangle([X1 - 16, Y0, X1 - 10, Y1], fill=STEEL[2] if e >= 4 else p.wood[1], outline=OUT)   # the can of stones
    elif e <= 6 and p.w <= 1:                                                # the poor: a ration tin of stones
        d.rectangle([X1 - 18, Y0, X1 - 9, Y1], fill=(130, 80, 50), outline=OUT)
    elif e == 5:
        d.ellipse([X1 - 18, Y0, X1 - 9, Y1], fill=(80, 96, 64), outline=OUT); d.line([X1 - 14, Y0, X1 - 14, Y1], fill=(50, 60, 40))   # a Mills grenade on the stake
    elif e == 6:
        d.rectangle([X1 - 26, Y0, X1 - 9, Y1], fill=(220, 214, 196), outline=OUT); d.rectangle([X1 - 12, Y0, X1 - 9, Y1], fill=(220, 120, 30))   # a trip flare
    elif p.w <= 1:                                                           # the poor: a string of drinks cans
        for k, bx in enumerate(range(X0 + 40, X1 - 12, 14)): d.rectangle([bx, Y0, bx + 6, Y1], fill=[(200, 30, 40), (40, 90, 190), (230, 230, 230)][k % 3], outline=OUT)
    else:
        d.rectangle([X1 - 22, Y0, X1 - 9, Y1], fill=(86, 96, 70), outline=OUT)
    if p.broken: d.line([X0 + 40, cy, X0 + 46, cy + 3], fill=G[1], width=2)  # snapped


define("tripwire", draw=tripwire, ref="cord or wire across a 5 ft way at shin height, a peg each side", tags=("tunnel", "alley", "resting", "woods"))


# ================================================================ spring blade
def springblade(tm, x, y, w, h, st, v):
    """A spring blade in a floor: a flag or board with a slot, the blade's edge just showing (sprung when broken).
    Dark Ages: a scythe blade in a slotted flag; the Long Night straps the flag with iron, the Renaissance sets a pair
    of blades, the Age of Reason a diagonal one. Victorian: a steel blade in an iron plate with its pressure plate.
    Great War: a riveted drab steel housing. Mid-Century: grey chequer plate. Modern: stainless with hazard edging. Future Darkness: a seamless plate with a lit slot.
    The flags are the region's stone, the boards its timber; the rich have it chased in brass."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    floor = p.wood if v.get("material") == "boards" else p.stone
    d.rectangle([X0, Y0, X1, Y1], fill=floor[2])                               # the floor round it
    if v.get("material") == "boards":
        for gy in range(Y0 + 9, Y1, 9): d.line([X0, gy, X1, gy], fill=floor[0])
    else: d.line([X0, (Y0 + Y1) // 2 - 12, X1, (Y0 + Y1) // 2 - 12], fill=floor[0])
    plate = floor if e <= 3 else (IRON if e < 8 else p.comp)
    if e == 5: plate = ramp(mix(IRON[2], (110, 116, 80), .85), 14)            # Great War: a drab steel housing
    if e == 6: plate = ramp((120, 122, 124), 14)                               # Mid-Century: grey chequer plate
    if e == 7: plate = ramp((186, 190, 194), 12)                               # Modern: stainless
    ins = 5 if e <= 3 else 9                                                   # later plates set in more of the floor
    X0, Y0, X1, Y1 = X0 + ins, Y0 + ins, X1 - ins, Y1 - ins
    d.rectangle([X0, Y0, X1, Y1], fill=plate[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=plate[4]); d.line([X0 + 1, Y0 + 1, X0 + 1, Y1 - 1], fill=plate[3])
    if e == 3: d.polygon([(X0 + 3, Y1 - 6), (X0 + 7, Y1 - 3), (X1 - 3, Y0 + 6), (X1 - 7, Y0 + 3)], fill=(10, 8, 10))   # a diagonal slot
    else: d.rectangle([X0 + 3, cy - 2, X1 - 3, cy + 2], fill=(10, 8, 10))     # the slot
    if e == 2: d.rectangle([X0 + 3, cy - 10, X1 - 3, cy - 7], fill=(10, 8, 10))   # Renaissance: a pair of blades
    if e == 1:
        for gx in (X0 + 6, X1 - 9): d.rectangle([gx, Y0 + 1, gx + 3, Y1 - 1], fill=IRON[2], outline=OUT)   # Long Night: iron straps across the flag
    if e == 6:
        for gy in range(Y0 + 3, Y1 - 2, 4):
            for gx in range(X0 + 3 + (gy // 4) % 2 * 3, X1 - 3, 6): d.line([gx, gy, gx + 2, gy + 1], fill=plate[4])
    if e == 7:
        for gx in range(X0, X1 - 3, 6): d.line([gx, Y0, gx + 3, Y0], fill=(230, 190, 30)); d.line([gx + 3, Y0, gx + 6, Y0], fill=OUT)   # hazard edging
    if p.broken:                                                              # sprung: the blade stands up, foreshortened
        d.polygon([(X0 + 8, cy), (X1 - 8, cy), (X1 - 12, cy - 9), (X0 + 12, cy - 9)], fill=STEEL[3], outline=OUT); d.line([X0 + 12, cy - 9, X1 - 12, cy - 9], fill=STEEL[4])
        d.ellipse([cx - 4, cy + 4, cx + 6, cy + 10], fill=(120, 20, 24))
    else: d.line([X0 + 7, cy, X1 - 7, cy], fill=STEEL[4])
    pp = mix(plate[1], (0, 0, 0), .1); d.rectangle([cx - 6, Y1 - 9, cx + 6, Y1 - 3], fill=pp, outline=OUT)   # the pressure plate
    if p.w >= 4: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=p.gold[3])
    if e >= 4 and e < 8:
        for rx_, ry_ in ((X0 + 4, Y0 + 4), (X1 - 4, Y0 + 4), (X0 + 4, Y1 - 4), (X1 - 4, Y1 - 4)): rivet(tm, rx_, ry_)
    if e >= 8: d.line([X0 + 6, cy, X1 - 6, cy], fill=mix(GLOW[1], p.acc[3], .3))
    if p.worn: scuffs(tm, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, plate, rng, 4)


define("springblade", draw=springblade, axes={"material": ["flags", "boards"]}, ref="a blade about 18 in long sprung from a floor slot (tomb traps of legend; 19th c. man traps)",
       tags=("resting", "treasury", "crypt", "dungeon"))


# ================================================================ jaw trap
def beartrap(tm, x, y, w, h, st, v):
    """A jaw trap set open: two toothed half-rings laid flat round the pan, the springs out each side and the chain to
    its stake, on the region's ground (leaf litter, sand, snow). Renaissance and Age of Reason: hand-forged with long
    leaf springs; in the Age of Reason the big toothed man-trap. Victorian: a factory trap with a maker's pan. Great
    War: a small jump trap with one spring under it. Mid-Century: a square body-grip trap on its coil spring. Modern: a
    foothold trap with rubber-padded jaws, a galvanized chain. Future Darkness: a black composite trap with a lit pan. Sprung when broken."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    G = p.ground
    d.ellipse([X0, Y0, X1, Y1], fill=G[2])
    for k in range(24): sx, sy = rng.uniform(X0 + 4, X1 - 8), rng.uniform(Y0 + 4, Y1 - 6); d.ellipse([sx, sy, sx + 6, sy + 4], fill=G[int(rng.integers(0, 5))])
    M = IRON if e < 8 else p.comp
    if p.worn and e < 8: M = ramp((124, 70, 44), 14)                           # rusted
    r = {3: 13, 5: 8, 7: 10}.get(e, 11)                                       # the Age of Reason's man-trap the biggest, the Great War's jump trap small
    if e == 6 and not p.broken:                                               # Mid-Century: a square body-grip trap
        d.rectangle([cx - 11, cy - 11, cx + 11, cy + 11], outline=OUT, width=4); d.rectangle([cx - 10, cy - 10, cx + 10, cy + 10], outline=STEEL[3], width=2)
        d.line([cx - 10, cy - 10, cx + 10, cy + 10], fill=STEEL[2], width=2); d.line([cx - 10, cy + 10, cx + 10, cy - 10], fill=STEEL[2], width=2)
        d.ellipse([cx + 10, cy - 4, cx + 20, cy + 6], outline=STEEL[4], width=2)                              # the coil spring
        r = -1
    sl = 21 if e == 3 else 17
    for s in ((-1, 1) if e != 5 else (1,)):
        if r < 0: break
        d.line([cx + s * 6, cy, cx + s * sl, cy], fill=OUT, width=5); d.line([cx + s * 6, cy, cx + s * sl, cy], fill=M[3], width=3)   # the springs
    if r < 0: pass
    elif p.broken:
        d.line([cx - abs(r), cy, cx + abs(r), cy], fill=OUT, width=5); d.line([cx - r, cy - 1, cx + r, cy - 1], fill=M[4], width=2)
        for k in range(-r + 2, r, 4): d.line([k + cx, cy - 3, k + cx, cy + 3], fill=M[2])
    else:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OUT, width=4); d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=M[3] if e != 7 else (30, 30, 34), width=2 if e != 7 else 3)
        if e == 5: d.line([cx - r, cy + r + 2, cx + r, cy + r + 2], fill=M[2], width=2)   # the jump spring under the jaws
        for a in range(0, 360, 30 if e != 3 else 20): ar = math.radians(a); d.line([cx + math.cos(ar) * (r - 2), cy + math.sin(ar) * (r - 2), cx + math.cos(ar) * (r - 5), cy + math.sin(ar) * (r - 5)], fill=M[4])
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=M[2] if e < 8 else GLOW[0], outline=OUT)   # the pan
        if e == 4 and p.w >= 2: d.point((cx, cy), fill=BRASS[4])
    for k in range(5): d.ellipse([cx + 2 + k * 3, cy + 6 + k * 2, cx + 6 + k * 3, cy + 9 + k * 2], outline=M[3] if e < 7 else STEEL[4])   # the chain
    d.rectangle([X1 - 10, Y1 - 9, X1 - 5, Y1 - 4], fill=p.wood[3], outline=OUT)


define("beartrap", draw=beartrap, ref="jaw traps with 6 to 12 in jaws and leaf springs (Newhouse traps, Oneida 1850s)", tags=("woods", "field"))


# ================================================================ powder kegs
def powder(tm, x, y, w, h, st, v):
    """Powder kegs, small casks bound with copper or wooden hoops (never iron, which sparks). Long Night: rough kegs
    and a leather budge barrel. Renaissance: stencilled kegs, a copper scoop, on flags. Age of Reason: the same on a boarded floor,
    copper-nailed against sparks. Victorian: kegs with a
    maker's mark and cartridge boxes. Open: one keg's head off, the black grains showing and the scoop in it."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    r = int(min(X1 - X0, Y1 - Y0) * .24)
    hoop = ramp((178, 104, 60), 18) if p.w >= 2 else ramp((150, 120, 70), 14)
    spots = [(X0 + r + 1, Y0 + r + 1), (X1 - r - 1, Y0 + r + 1), (X0 + r + 1, Y1 - r - 1), (X1 - r - 1, Y1 - r - 1)]
    if p.w <= 1: spots = spots[:3]
    if e == 3:                                                                 # Age of Reason: a boarded magazine floor, copper-nailed against sparks
        slab(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, ramp(mix(p.wood[2], (196, 168, 128), .3), 16), "x", rng=rng, gaps=[(Y1 - Y0) * k // 5 for k in range(1, 5)])
        for gx in range(X0 + 6, X1, 16): d.point((gx, Y0 + 3), fill=(190, 110, 60))
    else:
        d.rectangle([X0 - 1, Y0 - 1, X1 + 1, Y1 + 1], fill=p.stone[1])             # the flags of the magazine floor
        for gx in range(X0 + 18, X1, 18): d.line([gx, Y0, gx, Y1], fill=p.stone[0])
        for gy in range(Y0 + 18, Y1, 18): d.line([X0, gy, X1, gy], fill=p.stone[0])
    for k, (cx, cy) in enumerate(spots):
        shadow(tm, cx - r, cy - r, cx + r, cy + r, 3, kind="ellipse")
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=p.wood[2], outline=OUT)
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=hoop[2], width=2)
        if (st == "open" and k == 1) or (p.broken and k == 2):
            d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=(24, 22, 26))
            for j in range(10): gx, gy = cx + rng.uniform(-r + 8, r - 8), cy + rng.uniform(-r + 8, r - 8); d.point((gx, gy), fill=(70, 70, 76))
            if st == "open": d.line([cx - 2, cy, cx + r - 2, cy - r + 4], fill=hoop[3], width=3)   # the copper scoop
            if p.broken: d.ellipse([cx + r - 4, cy + r - 8, cx + r + 6, cy + r + 2], fill=(30, 28, 32))
            continue
        d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=p.wood[3])
        d.line([cx - r + 7, cy, cx + r - 7, cy], fill=p.wood[1])
        if e >= 2:                                                           # a stencilled mark on the head
            mk = p.acc[1] if p.w >= 2 else OUT
            if p.st == "eastasia": d.rectangle([cx - 3, cy - 4, cx + 3, cy + 4], outline=mk)
            elif p.st == "islamic": d.arc([cx - 4, cy - 4, cx + 4, cy + 4], 30, 300, fill=mk)
            else: d.line([cx - 4, cy - 3, cx + 4, cy - 3], fill=mk); d.line([cx, cy - 3, cx, cy + 4], fill=mk)
        d.point((cx + 3, cy + 2), fill=OUT)                                   # the bung
    if e == 1:
        d.ellipse([X0 + r * 2 - 4, Y0 + r * 2 - 4, X0 + r * 2 + 8, Y0 + r * 2 + 8], fill=ramp((110, 70, 40), 14)[2], outline=OUT)   # a leather budge bag
    if e >= 4 and p.w >= 2:
        d.rectangle([X0 + r * 2 - 6, Y0 + r * 2 - 4, X0 + r * 2 + 6, Y0 + r * 2 + 4], fill=ramp((150, 120, 80), 12)[3], outline=OUT)   # a box of cartridges
    if p.worn: scuffs(tm, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, p.wood, rng, 5)
    if p.broken:
        for j in range(30): gx, gy = rng.uniform(X0 + 4, X1 - 4), rng.uniform(Y1 - 18, Y1 - 2); d.point((gx, gy), fill=(40, 40, 44))


define("powder", draw=powder, states=("closed", "open"), openable="barrel",
       ref="gunpowder kegs of 25 lb about 12 in across, bound with copper or wood (Board of Ordnance)", tags=("armoury", "boat", "cellar"))


# ================================================================ cannon
def cannon(tm, x, y, w, h, st, v):
    """A cannon from above, its muzzle to the south. Long Night: a hooped wrought-iron bombard bedded in a timber
    sledge, its stone shot by it. Renaissance: a cast-bronze gun on a two-wheeled carriage with a long trail, its
    dolphins and reinforces. Age of Reason: an iron gun on a carriage, its quoin, rammer and pyramid of shot.
    Victorian: a rifled gun on spoked wheels with a limber pole. The carriage takes the region's timber and paint;
    the rich have bronze guns, chased."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    native_w, native_h = X1 - X0, Y1 - Y0                                     # 8 x 4 ft: the barrel runs east-west in the footprint
    cy = (Y0 + Y1) // 2
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")
    bronze = ramp((168, 120, 60), 22); gun = bronze if (p.w >= 5 or (e == 2 and p.w >= 4) or v.get("material") == "bronze") else IRON
    if p.worn and gun is IRON: gun = ramp((110, 70, 46), 16)
    if e == 1:
        shadow(tm, X0 + 6, Y0 + 6, X1 - 4, Y1 - 6, 4)
        slab(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, p.wood, "x", rng=rng)        # the timber bed
        bx0, bx1 = X0 + 14, X1 - 12
        d.rounded_rectangle([bx0, cy - 12, bx1, cy + 12], 4, fill=gun[2], outline=OUT)
        for hx in range(bx0 + 6, bx1, 9): d.line([hx, cy - 11, hx, cy + 11], fill=gun[0], width=2); d.line([hx + 1, cy - 10, hx + 1, cy - 4], fill=gun[4])   # the hoops
        d.ellipse([bx1 - 10, cy - 10, bx1 + 4, cy + 10], fill=gun[1], outline=OUT); d.ellipse([bx1 - 6, cy - 7, bx1 + 2, cy + 7], fill=(14, 12, 14))
        for gx in (X0 + 8, X0 + 20): d.ellipse([gx, Y1 - 12, gx + 10, Y1 - 2], fill=p.stone[3], outline=OUT)   # stone shot
        if p.w >= 4: d.rectangle([bx0 + 2, cy - 2, bx0 + 20, cy + 2], fill=p.acc[3])
    else:
        wr = 13 if e < 4 else 16                                              # the wheels, seen edge on from above
        tx0 = X0 + 4; ax = X0 + int(native_w * .58)
        shadow(tm, tx0, cy - 8, ax + 10, cy + 8, 4)
        C = p.wood if not (p.w >= 3 and e >= 3) else ramp(mix(p.acc[2], p.wood[2], .3), 18)
        d.polygon([(tx0, cy - 4), (ax, cy - 11), (ax, cy + 11), (tx0, cy + 4)], fill=C[2], outline=OUT)   # the trail and cheeks
        d.line([tx0 + 2, cy - 3, ax - 2, cy - 10], fill=C[4])
        d.ellipse([tx0 - 2, cy - 4, tx0 + 6, cy + 4], fill=IRON[2], outline=OUT)
        for s in (-1, 1):
            wy = cy + s * (native_h // 2 - 4)
            shadow(tm, ax - wr, wy - 3, ax + wr, wy + 3, 3)
            d.rounded_rectangle([ax - wr, wy - 4, ax + wr, wy + 4], 3, fill=C[1], outline=OUT); d.line([ax - wr + 2, wy - 3, ax + wr - 2, wy - 3], fill=IRON[3])
            if e >= 4:
                for k in range(-wr + 4, wr, 5): d.line([ax + k, wy - 3, ax + k, wy + 3], fill=C[3])
            d.rectangle([ax - 3, wy - (5 if s < 0 else -1), ax + 3, wy + (1 if s < 0 else 5)], fill=IRON[3], outline=OUT)   # the hub
        d.line([ax, cy - native_h // 2 + 6, ax, cy + native_h // 2 - 6], fill=OUT, width=4); d.line([ax, cy - native_h // 2 + 6, ax, cy + native_h // 2 - 6], fill=IRON[3], width=2)   # the axle
        bx0, bx1 = X0 + int(native_w * .32), X1 - 2; br = 8 if e < 4 else 9
        shadow(tm, bx0, cy - br, bx1, cy + br, 3)
        d.polygon([(bx0, cy - br - 2), (bx1 - 6, cy - br + 3), (bx1 - 6, cy + br - 3), (bx0, cy + br + 2)], fill=gun[2], outline=OUT)   # the tapering barrel
        d.line([bx0 + 2, cy - br, bx1 - 8, cy - br + 4], fill=gun[4])
        d.ellipse([bx0 - 7, cy - 5, bx0 + 1, cy + 5], fill=gun[2], outline=OUT)   # the cascabel
        d.rectangle([bx1 - 8, cy - br + 1, bx1, cy + br - 1], fill=gun[3], outline=OUT); d.line([bx1, cy - 3, bx1, cy + 3], fill=(14, 12, 14), width=2)   # the muzzle swell
        for t in (.25, .5):                                                   # the reinforce rings
            rx = bx0 + (bx1 - bx0) * t; d.line([rx, cy - br + 1, rx, cy + br - 1], fill=gun[0], width=2)
        if gun is bronze and e <= 3:                                          # the dolphins on a bronze gun
            for s in (-1, 1): d.arc([bx0 + 20, cy + s * 2 - 3, bx0 + 30, cy + s * 2 + 3], 180 if s < 0 else 0, 360 if s < 0 else 180, fill=gun[4])
        if e == 3:
            for k, (sx, sy) in enumerate(((X0 + 6, Y1 - 12), (X0 + 15, Y1 - 12), (X0 + 10, Y1 - 18))): d.ellipse([sx, sy, sx + 8, sy + 8], fill=IRON[2], outline=OUT); d.point((sx + 2, sy + 2), fill=IRON[4])
            d.line([X0 + 4, Y0 + 6, X0 + native_w * .5, Y0 + 6], fill=p.wood[4], width=2); d.ellipse([X0 + native_w * .5, Y0 + 3, X0 + native_w * .5 + 6, Y0 + 9], fill=ramp((150, 130, 90), 12)[2], outline=OUT)   # the rammer
        if e == 4:
            d.line([tx0, cy, X0, cy], fill=p.wood[2], width=3)
            d.rectangle([bx0 + 6, cy - 3, bx0 + 14, cy + 3], fill=STEEL[3], outline=OUT)   # the breech block
        if p.st == "eastasia" or p.st == "southasia":                         # painted bands on the carriage
            d.line([tx0 + 14, cy - 6, tx0 + 14, cy + 6], fill=p.acc[3], width=2)
    if p.worn: scuffs(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 6, p.wood, rng, 6)
    if p.broken:
        crack(tm, X0 + native_w * .5, cy - 8, X0 + native_w * .6, cy + 9, rng)
        d.rectangle([X0 + native_w * .58 - 12, Y1 - 6, X0 + native_w * .58 + 12, Y1 - 2], fill=p.wood[0], outline=OUT)   # a wheel off its hub, flat


define("cannon", draw=cannon, axes={"material": ["iron", "bronze"]},
       ref="field guns of 6 to 12 pounds about 6 ft long, carriages 8 to 10 ft with the trail (Gribeauval; Napoleon 12-pdr 1857)",
       tags=("bailey", "tower", "quay", "boat"))


# ================================================================ portcullis
def portcullis(tm, x, y, w, h, st, v):
    """A portcullis in its grooves across a gateway. Closed: the grid of timber bars shod in iron, its spiked foot
    resting in the passage, seen from above as the top of the lattice between the two stone grooves. Open: drawn up
    into the chamber above, only its spiked foot showing at the slot and the dark grooves either side. Dark Ages: oak
    grid with iron straps. Long Night: heavier iron-sheathed bars set close with three iron bands. Renaissance: wider-set bars braced
    corner to corner. Age of Reason: a slim iron grille with spear finials. The Islamic gate an all-iron grille."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e; cy = (Y0 + Y1) // 2
    S = p.stone
    d.rectangle([X0, Y0, X1, Y1], fill=S[2], outline=OUT)                     # the gateway's floor slabs and the slot
    for gx in range(X0 + 20, X1, 24): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=S[1])
    for gx in (X0, X1 - 10): d.rectangle([gx, Y0, gx + 10, Y1], fill=S[3], outline=OUT); d.rectangle([gx + 3, cy - 4, gx + 7, cy + 4], fill=(12, 10, 14))   # the grooves in the jambs
    d.line([X0 + 10, cy, X1 - 10, cy], fill=(20, 16, 20), width=3)
    mat = v.get("material", "oak")
    allin = p.st == "islamic" or mat == "iron"
    B = IRON if allin else (p.wood if mat == "oak" else ramp(mix(p.wood[2], IRON[2], .5), 16))
    if mat == "painted": B = ramp(mix(p.acc[2], p.wood[2], .15), 18)
    if mat == "plated": B = ramp(mix(STEEL[2], p.wood[2], .3), 16)
    if p.worn: B = ramp(mix(B[2], (120, 80, 50), .45), 16)                    # weathered, rust-streaked
    if st == "open":
        for bx in range(X0 + 14, X1 - 10, 12):
            d.polygon([(bx - 2, cy - 1), (bx + 2, cy - 1), (bx, cy + 3)], fill=IRON[3], outline=OUT)   # the spiked feet just showing
        return
    ee = min(e, 3); sp = (12, 9, 14, 7)[ee]; gap = (3, 2, 4, 3)[ee]               # bar pitch and the gap: light, heavy, braced, a slim grille
    if ee == 3 and not allin: B = ramp(mix(IRON[2], B[2], .35), 16)              # the Age of Reason's gate is mostly iron
    if ee == 1 and not allin: B = ramp(mix(B[2], IRON[1], .45), 16)              # the Long Night sheathes its bars in iron
    d.rectangle([X0 + 9, Y0 + 1, X1 - 9, Y1 - 4], fill=B[2], outline=OUT)
    for bx in range(X0 + 14, X1 - 10, sp):                                    # upright bars, the gaps between them dark
        d.rectangle([bx + sp - gap - 1, Y0 + 2, bx + sp - 2, Y1 - 5], fill=tone(B[0], -10)); d.line([bx - 3, Y0 + 2, bx + 3, Y0 + 2], fill=B[4])
        d.polygon([(bx - 2, Y1 - 4), (bx + 2, Y1 - 4), (bx, Y1)], fill=IRON[3], outline=OUT)
        if ee == 3: d.polygon([(bx - 2, Y0 + 3), (bx + 2, Y0 + 3), (bx, Y0)], fill=IRON[4], outline=OUT)   # spear finials
    bars = {0: (cy - 4, cy + 2), 1: (Y0 + 4, cy - 1, Y1 - 8), 2: (cy - 1,), 3: (Y0 + 5, cy - 3, cy + 1, Y1 - 9)}[ee]
    for yy in bars: d.line([X0 + 10, yy, X1 - 10, yy], fill=IRON[2] if not allin else IRON[4], width=4 if ee == 1 else 2)   # the cross bars and iron bands
    if ee == 2:                                                               # the Renaissance lattice: braces corner to corner
        d.line([X0 + 10, Y0 + 2, X1 - 10, Y1 - 5], fill=B[4], width=2); d.line([X0 + 10, Y1 - 5, X1 - 10, Y0 + 2], fill=B[4], width=2)
    if e >= 1 and not allin:
        for bx in range(X0 + 14, X1 - 10, 24): rivet(tm, bx, cy - 1)
    if p.w >= 5:                                                              # a lord's gate: a painted rail and gilt caps on the bars
        d.rectangle([X0 + 10, cy - 2, X1 - 10, cy + 1], fill=p.acc[3])
        for bx in range(X0 + 14, X1 - 10, 12): d.rectangle([bx - 2, Y0 + 2, bx + 2, Y0 + 4], fill=p.gold[3])
    if p.worn:
        for bx in range(X0 + 16, X1 - 12, 24): d.rectangle([bx, Y0 + 2, bx + 2, Y1 - 5], fill=(150, 84, 44))
    if p.broken: d.rectangle([X0 + (X1 - X0) * .4, Y0 + 1, X0 + (X1 - X0) * .55, Y1 - 4], fill=(12, 10, 14))   # bars burst out


define("portcullis", draw=portcullis, nvar=16, axes={"material": ["oak", "iron", "plated", "painted"]}, states=("closed", "open"), openable="gate", mount="wall", front=False,
       ref="portcullises 8 to 12 ft wide of 6 to 8 in oak bars shod with iron, running in 6 in grooves (Caernarfon, Bodiam)", tags=("bailey",))


# ================================================================ gate
def gate(tm, x, y, w, h, st, v):
    """A yard gate between its two posts. Closed: across the way. Open: swung back about a right angle on its hinge
    post. Dark Ages: a woven wattle hurdle or a boarded gate on a harr; the Long Night's heavier, with more ledges and
    iron strap hinges. Renaissance: a five-barred oak gate with its brace; the Age of Reason paints it white. Victorian:
    wrought-iron double gates with scrolls, on stone piers. Great War: a single riveted angle-iron gate.
    Mid-Century: a tubular steel field gate or a chain-link gate. Modern: a galvanized steel palisade gate. Future
    Darkness: a dark composite security gate with a lit lock."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cy = (Y0 + Y1) // 2
    pr_ = 6 if e < 4 else 8
    ground(tm, X0, Y0, X1, Y1, p.ground, rng, "rect")                            # the worn way under it
    piers = p.stone if (e >= 4 and e < 8) or p.w >= 4 else p.wood
    for sx in (X0 + pr_, X1 - pr_):
        if piers is p.wood: endgrain(tm, sx, cy, pr_, p.wood)
        else: d.rectangle([sx - pr_, cy - pr_, sx + pr_, cy + pr_], fill=piers[3], outline=OUT); d.line([sx - pr_ + 1, cy - pr_ + 1, sx + pr_ - 1, cy - pr_ + 1], fill=piers[4])
    a0, a1 = X0 + 2 * pr_ + 1, X1 - 2 * pr_ - 1; L = a1 - a0
    if e <= 1: M = p.wood if v.get("material") != "wattle" else ramp((150, 120, 74), 14)
    elif e == 2: M = p.wood
    elif e == 3: M = ramp(mix(p.wood[2], (226, 222, 210), .6), 16) if p.w >= 2 else p.wood   # the Age of Reason's gate painted white
    elif e <= 5: M = ramp((116, 70, 46), 14) if p.w < 2 else ramp(mix(IRON[2], p.acc[2], .45), 16)
    elif e <= 7: M = STEEL if e == 7 else ramp(mix((96, 120, 100), p.acc[2], .3), 16)
    else: M = p.comp
    def leaf(u0, v0, ang, ln):
        """One leaf from its hinge at (u0, v0), at angle ang (0 = across the way)."""
        ex, ey = u0 + math.cos(ang) * ln, v0 + math.sin(ang) * ln
        nx, ny = -math.sin(ang), math.cos(ang)
        if e <= 3 or e == 8:
            d.line([u0 + 2, v0 + 3, ex + 2, ey + 3], fill=(20, 16, 20), width=5)
            lw = 8 if e == 1 else 6                                            # the Long Night's heavier leaf
            d.line([u0, v0, ex, ey], fill=OUT, width=lw); d.line([u0, v0, ex, ey], fill=M[3], width=lw - 2)
            if e == 1:                                                         # iron strap hinges
                for t in (.0, .5): d.line([u0 + (ex - u0) * t, v0 + (ey - v0) * t, u0 + (ex - u0) * (t + .2), v0 + (ey - v0) * (t + .2)], fill=IRON[2], width=2)
            if v.get("material") == "wattle" and e <= 1:
                for k in range(0, int(ln), 4): t = k / ln; d.point((u0 + (ex - u0) * t + nx * (1 if k % 8 else -1), v0 + (ey - v0) * t + ny * (1 if k % 8 else -1)), fill=M[1])
            else:
                nl = 8 if e == 1 else 5
                for k in range(1, nl): t = k / nl; d.line([u0 + (ex - u0) * t - nx * 2, v0 + (ey - v0) * t - ny * 2, u0 + (ex - u0) * t + nx * 2, v0 + (ey - v0) * t + ny * 2], fill=M[1])
            if e == 8: d.line([u0 + (ex - u0) * .45, v0 + (ey - v0) * .45, u0 + (ex - u0) * .55, v0 + (ey - v0) * .55], fill=mix(GLOW[2], p.acc[3], .3), width=2)
        else:
            d.line([u0, v0, ex, ey], fill=OUT, width=4); d.line([u0, v0, ex, ey], fill=M[3], width=2)
            for k in range(1, int(ln / 6)):                                    # bars or palings, their tops
                t = k * 6 / ln; px_, py_ = u0 + (ex - u0) * t, v0 + (ey - v0) * t
                if e == 5: rivet(tm, px_, py_)                                    # Great War: angle iron, riveted
                elif e <= 5: d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=M[4] if p.w < 4 else p.gold[3])
                elif e == 6: d.point((px_, py_), fill=M[4])
                else: d.rectangle([px_ - 1, py_ - 2, px_ + 1, py_ + 2], fill=M[4], outline=OUT)
            if e == 4 and p.w >= 3:                                            # a scroll at the leaf's middle
                mx, my = u0 + (ex - u0) * .5, v0 + (ey - v0) * .5; d.arc([mx - 5, my - 4, mx + 5, my + 4], 0, 300, fill=M[4])
        d.rectangle([u0 - 2, v0 - 2, u0 + 2, v0 + 2], fill=IRON[3], outline=OUT)
        return ex, ey
    double = e == 4 or (e >= 7 and p.w >= 3)
    if st == "open":
        if double:
            leaf(a0, cy, math.pi / 2 * .96, L / 2 - 2); leaf(a1, cy, math.pi - math.pi / 2 * .96, L / 2 - 2)
        else: leaf(a0, cy, math.pi / 2 * .96, L - 4)
    else:
        if double: leaf(a0, cy, 0, L / 2 - 1); leaf(a1, cy, math.pi, L / 2 - 1); d.rectangle([a0 + L // 2 - 2, cy - 3, a0 + L // 2 + 2, cy + 3], fill=IRON[4], outline=OUT)
        else:
            ex, ey = leaf(a0, cy, 0 if not p.broken else .04, L - 1 if not p.broken else L * .8)
            if e <= 3 and not p.broken: d.line([a0 + 3, cy - 1, a1 - 3, cy + 1], fill=M[4])   # the brace
            d.rectangle([a1 - 4, cy - 3, a1, cy + 3], fill=IRON[3], outline=OUT)   # the latch
    if p.worn: d.line([X0 + 2, Y1, X1 - 2, Y1], fill=(90, 80, 70))


define("gate", draw=gate, states=("closed", "open"), openable="gate", mount="ground", front=False, ft=((7, 10), (.9, 1.25)), axes={"material": ["boards", "wattle"]},
       ref="field and yard gates 8 to 10 ft between the posts (five-bar gates, Board of Agriculture reports 1790s)", tags=("yard", "farmyard", "bailey", "churchyard", "courtyard", "park", "quay"))
