"""Climbing (B6346): ladders, stairs, spiral stairs, trellises and drainpipes, scaffolding, fire escapes and knotted
ropes; and the openings that are placed objects rather than cut in a wall: the trapdoor, the door curtain, the
shutter-board shop front, the plate-glass shop window and the roller shutter.

Seen from straight above, front to the south, light from the north-west. A leaning or rising thing (a ladder, a
stair) shows its foreshortened face: rungs and treads closer together and lighter toward the top. The palette
helpers (style, wealth and condition) are shared with fam_fighting.py."""
import math

import numpy as np

from px import OUT
from library.core import define
from library.art import tone, mix, ramp, shadow, slab, rivet, knob, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, GLOW
from library.fam_fighting import make, makes, pal, paint, rng_of, scuffs, crack, endgrain, lash, ground, glowline

ALU = ramp((176, 182, 188), 14)


def _rails(tm, X0, Y0, X1, Y1, C, n, lit=None, rung=None, notched=False, rw=4):
    """A ladder seen leaning from above: two rails running north (top, at the wall) to south (foot), the rungs closer
    together toward the top, lighter where they are higher."""
    d = tm.d; L = Y1 - Y0; rw = rw if not notched else (X1 - X0) // 2
    if notched:                                                               # a notched log: one trunk with steps cut in it
        cx = (X0 + X1) // 2; d.rectangle([cx - rw, Y0, cx + rw, Y1], fill=C[2], outline=OUT); d.line([cx - rw + 1, Y0 + 1, cx - rw + 1, Y1 - 1], fill=C[4])
        for k in range(n):
            t = (k + .5) / n; yy = Y0 + L * (t ** 1.25)
            d.polygon([(cx - rw + 2, yy), (cx + rw - 2, yy), (cx + rw - 2, yy + 4), (cx - rw + 2, yy + 1)], fill=C[0]); d.line([cx - rw + 2, yy + 5, cx + rw - 2, yy + 5], fill=C[4])
        return
    for k in range(n):
        t = (k + .5) / n; yy = int(Y0 + L * (t ** 1.25)); c = (rung or C)[3 if t < .5 else 2]
        d.rectangle([X0 + 2, yy - 2, X1 - 2, yy + 2], fill=c, outline=OUT); d.line([X0 + 3, yy - 1, X1 - 3, yy - 1], fill=(rung or C)[4])
    for rx in (X0, X1 - rw):
        d.rectangle([rx, Y0, rx + rw, Y1], fill=C[2], outline=OUT); d.line([rx + 1, Y0 + 1, rx + 1, Y1 - 1], fill=C[4])
    if lit: d.line([X0 + 1, Y0 + 2, X0 + 1, Y1 - 2], fill=lit[2]); d.line([X1 - 1, Y0 + 2, X1 - 1, Y1 - 2], fill=lit[2])


# ================================================================ ladder
def ladder(tm, x, y, w, h, st, v):
    """A ladder leaning on the wall to the north, its foot to the south, seen foreshortened from above. Dark Ages to
    Age of Reason: a split pole ladder with rungs pegged through, lashed in the East and South-east Asia in bamboo,
    a notched log among poor households of Africa, the Americas, Oceania, the steppe and the far north. Victorian and
    Great War: sawn rails and turned rungs, a painted ladder for the rich; the Long Night lashes its rungs, the Age
    of Reason shoes their ends in iron, the Great War bands its rails. Mid-Century: a timber ladder with steel tie
    rods. From Modern on a factory ladder, the same the world over: its make axis gives the rails (bare aluminium,
    the makers' yellow, orange, blue, red, green or grey fibreglass, or an old timber ladder kept on) and whether it is
    a single or an extension ladder; in Future Darkness composite rails with lit rung edges."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    shadow(tm, X0 + 2, Y0 + 6, X1 + 2, Y1, 3)
    bamboo = (p.st in ("seasia", "southasia") and e <= 7) or (p.st == "eastasia" and e <= 6)
    notched = p.st in ("africa", "americas", "oceania", "steppe", "polar") and p.w <= 1 and e <= 4
    timber = {"northern": (222, 214, 196), "polar": (176, 172, 160), "islamic": (150, 120, 90), "mediterranean": (124, 84, 56),
              "atlantic": (150, 140, 120), "steppe": (196, 98, 42), "americas": (178, 112, 66), "africa": (96, 62, 40),
              "oceania": (206, 182, 140)}.get(p.st, p.wood[2])   # birch, driftwood, palm, chestnut, weathered ash, painted, cedar, ironwood, pale hardwood
    fin, mdl = make(v, "aluminium single")
    if e >= 7 and fin == "timber": C = ramp(mix(timber, (100, 92, 84), .35), 16)   # an old timber ladder kept on
    elif e >= 8: C = ramp(mix(p.comp[2], RAILS[fin], .6), 16)
    elif e == 7: C = ramp(RAILS[fin], 14)                                       # fibreglass rails in a maker's colour, or bare aluminium
    elif e >= 5 and not bamboo: C = paint(p, p.wood[2], .7) if p.w != 2 else p.wood
    elif bamboo: C = ramp(mix((196, 180, 96), p.wood[2], .3), 16)
    elif p.w >= 4: C = ramp(mix(p.acc[2], timber, .35), 18)
    elif p.w <= 1: C = ramp(mix(timber, (110, 100, 88), .3), 16)
    else: C = ramp(timber, 16)
    G = p.ground                                                               # where its feet have dug in
    ground(tm, X0 - 1, Y1 - (Y1 - Y0) // 6, X1 + 1, Y1 + 1, G, rng, "rect")       # the ground its foot stands on
    for fx in (X0 - 1, X1 - 7): d.ellipse([fx, Y1 - 6, fx + 8, Y1 + 1], fill=G[0])
    n = (8, 10, 9, 11, 12, 10, 13, 11, 12)[e]                                   # the rung pitch of each age's ladders
    if p.broken: n -= 3
    Rg = None
    if e >= 7 and fin == "timber": Rg = None
    elif e >= 7: Rg = ramp(ALU[2] if fin != "aluminium" else (60, 62, 66), 14)  # ribbed aluminium rungs, or black grip treads
    elif (p.w >= 4 or e >= 5) and not bamboo: Rg = ramp(mix(C[2], p.cloth[2], .55 if e < 8 else .9), 16)   # a painted ladder: the rungs in a second colour
    _rails(tm, X0, Y0, X1, Y1, C, n, lit=p.lit if e >= 8 else None, notched=notched, rung=Rg, rw=6 if e >= 7 and fin != "timber" else 4)
    if bamboo and not notched:
        for k in range(1, 6): yy = Y0 + (Y1 - Y0) * k / 6; d.line([X0, yy, X0 + 3, yy], fill=C[0]); d.line([X1 - 3, yy, X1, yy], fill=C[0])   # the nodes
        for k in range(n): t = (k + .5) / n; lash(tm, X0 + 1, int(Y0 + (Y1 - Y0) * t ** 1.25), ramp((150, 120, 70), 14), horiz=False)
    if e == 1 and not bamboo and not notched:                                  # Long Night: the rung ends lashed as well as pegged
        for k in range(0, n, 2): t = (k + .5) / n; lash(tm, X0 + 1, int(Y0 + (Y1 - Y0) * t ** 1.25), ramp((150, 120, 70), 14), horiz=False)
    if e == 3 and not bamboo and not notched:                                  # Age of Reason: iron ferrules on the rung ends
        for k in range(n): t = (k + .5) / n; yy = int(Y0 + (Y1 - Y0) * t ** 1.25); d.rectangle([X0 + 3, yy - 2, X0 + 6, yy + 2], fill=IRON[3]); d.rectangle([X1 - 6, yy - 2, X1 - 3, yy + 2], fill=IRON[3])
    if e == 5 and not bamboo:                                                  # Great War: iron bands round the rails
        for t in (.2, .5, .8): yy = int(Y0 + (Y1 - Y0) * t); d.rectangle([X0 - 1, yy - 2, X1 + 1, yy + 2], fill=IRON[2], outline=OUT)
    if e == 6:                                                                 # Mid-Century: steel tie rods under the rungs, nutted at each rail
        for t in (.3, .6, .85):
            yy = int(Y0 + (Y1 - Y0) * t); d.line([X0 + 3, yy, X1 - 3, yy], fill=OUT, width=3); d.line([X0 + 3, yy, X1 - 3, yy], fill=STEEL[3])
            for nx in (X0 + 1, X1 - 4): d.rectangle([nx, yy - 2, nx + 3, yy + 2], fill=STEEL[2], outline=OUT)
    if e >= 7 and mdl == "extension":                                         # the fly section over the top half, its guides and halyard
        ym = Y0 + (Y1 - Y0) * 11 // 20; F = ramp(tone(C[2], 26), 14)
        for rx in (X0 + 6, X1 - 11): d.rectangle([rx, Y0, rx + 5, ym], fill=F[2], outline=OUT); d.line([rx + 1, Y0 + 1, rx + 1, ym - 1], fill=F[4])
        d.rectangle([X0, ym - 3, X1, ym + 2], fill=(30, 30, 34), outline=OUT)                 # the guide brackets
        d.line([X0 + 13, Y0 + 4, X0 + 13, Y1 - 8], fill=OUT, width=3); d.line([X0 + 13, Y0 + 4, X0 + 13, Y1 - 8], fill=(214, 186, 96))   # the halyard rope
    if e >= 7 and fin != "timber":                                             # rubber feet
        for fx in (X0, X1 - 4): d.rectangle([fx - 1, Y1 - 4, fx + 4, Y1], fill=(30, 30, 34), outline=OUT)
    if e <= 3 and not bamboo and not notched:
        for k in range(n): t = (k + .5) / n; yy = int(Y0 + (Y1 - Y0) * t ** 1.25); d.point((X0 + 1, yy), fill=C[0]); d.point((X1 - 2, yy), fill=C[0])   # the pegs
    if p.w <= 1 and not notched and (e < 7 or fin == "timber"):                # mended: a rung bound on with rope and rag
        for t in (.3, .7): yy = int(Y0 + (Y1 - Y0) * t ** 1.25); d.rectangle([X0, yy - 3, X0 + 5, yy + 3], fill=p.cloth[3], outline=OUT); d.rectangle([X1 - 5, yy - 3, X1, yy + 3], fill=(170, 150, 110), outline=OUT)
    if p.w >= 4 and e < 7: d.rectangle([X0, Y0, X1, Y0 + 5], fill=p.gold[3] if e >= 4 else p.metal[3], outline=OUT)   # iron or brass hooks at the head
    if p.worn: scuffs(tm, X0, Y0 + 10, X1, Y1 - 10, C, rng, 4)
    if p.broken:
        yy = Y0 + (Y1 - Y0) * .55; d.line([X0 + 2, yy, X1 - 2, yy + 6], fill=C[1], width=2); crack(tm, X1 - 2, yy - 6, X1 - 2, yy + 12, rng)


RAILS = {"aluminium": (178, 182, 186), "yellow": (222, 184, 40), "orange": (226, 118, 34), "blue": (44, 86, 164),
         "red": (176, 40, 36), "green": (52, 124, 72), "grey": (96, 98, 104), "timber": (150, 120, 84)}


define("ladder", draw=ladder, global_from=1990, axes={"material": makes(RAILS, ["single", "extension"], [])}, nvar=20, ft=((1.25, 2), (8.5, 11.5)), front=False,
       ref="ladders 14 to 18 in between the rails, 10 to 16 ft long, leaning about one in four (Moxon, Mechanick Exercises; BS 1129)",
       tags=("barn", "loft", "store", "quay", "yard", "tower", "workshop"))


# ================================================================ stairs
def stairs(tm, x, y, w, h, st, v):
    """A straight flight rising to the north, seen from above: the treads as bands, each with its lit nosing, darker
    toward the foot. Dark Ages and Long Night: solid baulks of timber or stone block steps. Renaissance and Age of
    Reason: joined stairs with turned balusters and a moulded handrail. Long Night: rushes strewn on the treads and a
    rope rail on the wall. Victorian: a carpet runner held by brass stair rods. Great War: brown linoleum with steel
    nosings. Mid-Century: linoleum or terrazzo with a steel nosing. Modern: concrete with a steel tube rail
    and grip strips. Future Darkness: composite with lit nosings. The region's stone or timber, a poor stair worn
    hollow, a broken one with a tread gone."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e
    stone = p.st in ("mediterranean", "islamic", "southasia", "americas", "africa") or v.get("material") == "stone"
    C = p.stone if stone else p.wood
    if e == 5: C = ramp(mix((122, 92, 64), C[2], .65), 14)                       # brown linoleum laid over the treads
    if e == 6: C = ramp(mix((150, 140, 120), p.acc[2], .45), 12)                 # linoleum or terrazzo in the region's colour
    elif e == 7: C = ramp(mix((158, 156, 150), p.cloth[2], .4), 10)             # carpet tiles or painted concrete
    elif e >= 8: C = ramp(mix(p.comp[2], C[2], .45), 14)                       # composite faced in the local stone or timber
    shadow(tm, X0, Y0, X1, Y1, 4)
    rail = 6 if e >= 2 else 0
    a0, a1 = X0, X1 - rail
    n = (12, 14, 13, 15, 14, 16, 13, 15, 14)[e]; L = Y1 - Y0                     # each age's rise: steep early stairs, easy later ones
    d.rectangle([a0, Y0, a1, Y1], fill=C[0], outline=OUT)
    for k in range(n):                                                          # top step at the north, lit; the foot to the south
        y0, y1 = Y0 + L * k / n, Y0 + L * (k + 1) / n - 1
        if p.broken and k == 7: d.rectangle([a0 + 1, y0, a1 - 1, y1], fill=(14, 12, 14)); continue
        lv = 3 if k < n // 3 else (2 if k < 2 * n // 3 else 1)
        d.rectangle([a0 + 1, y0, a1 - 1, y1], fill=C[lv]); d.line([a0 + 1, y1, a1 - 1, y1], fill=C[4] if e < 8 else p.lit[1])   # the nosing
        if p.worn and k % 2: d.ellipse([(a0 + a1) / 2 - 8, y0 + 2, (a0 + a1) / 2 + 8, y1 - 1], fill=C[min(4, lv + 1)])   # dished by feet
        if e == 7: d.line([a0 + 4, y1 - 2, a1 - 4, y1 - 2], fill=(220, 190, 40) if p.w >= 2 else (60, 60, 60))
    if e == 5:                                                                  # steel nosings screwed along each tread
        for k in range(n): yy = Y0 + L * (k + 1) / n - 1; d.line([a0 + 1, yy, a1 - 1, yy], fill=STEEL[3], width=2)
    if e == 1:                                                                  # rushes strewn on the treads, a rope rail on the wall
        for k in range(30): rx, ry = rng.uniform(a0 + 3, a1 - 3), rng.uniform(Y0 + 2, Y1 - 2); d.line([rx, ry, rx + 4, ry + 1], fill=(186, 170, 100))
        d.line([a0 + 2, Y0, a0 + 2, Y1], fill=OUT, width=4); d.line([a0 + 2, Y0, a0 + 2, Y1], fill=(170, 140, 90), width=2)
    if e == 4 or (e == 3 and p.w >= 4) or (p.w >= 4 and e < 8 and p.st in ("islamic", "southasia")):   # the runner and its rods
        R_ = ramp(p.cloth[2], 16); m = (a1 - a0) // 5
        d.rectangle([a0 + m, Y0, a1 - m, Y1], fill=R_[2]); d.line([a0 + m + 2, Y0, a0 + m + 2, Y1], fill=R_[4]); d.line([a1 - m - 2, Y0, a1 - m - 2, Y1], fill=R_[0])
        for k in range(n): yy = Y0 + L * (k + 1) / n - 1; d.line([a0 + m - 2, yy, a1 - m + 2, yy], fill=BRASS[3] if p.w >= 2 else IRON[3])
    if rail:                                                                    # the open side: balusters and handrail, or a tube rail
        H = p.wood if e < 6 else (paint(p, STEEL[2], .6) if e < 8 else p.comp)
        d.rectangle([a1, Y0, X1, Y1], fill=H[1], outline=OUT); d.line([a1 + 2, Y0 + 1, a1 + 2, Y1 - 1], fill=H[4])
        if e <= 5:
            for k in range(n): yy = int(Y0 + L * (k + .5) / n); d.ellipse([a1 + 1, yy - 2, X1 - 1, yy + 2], fill=H[3], outline=OUT)
        knob(tm, (a1 + X1) // 2, Y1 - 4, BRASS if p.w >= 3 else H, 3)            # the newel post
    if p.st == "eastasia" and e <= 5: d.rectangle([a0, Y0, a0 + 3, Y1], fill=p.acc[2])
    if p.worn: scuffs(tm, a0 + 2, Y0 + 4, a1 - 2, Y1 - 4, C, rng, 5)


define("stairs", draw=stairs, axes={"material": ["timber", "stone"]}, ft=((2.5, 4), (8.5, 11.5)), front=True, clear=3,
       ref="domestic stairs about 3 ft wide, 12 to 14 risers of 7 to 8 in over 9 to 11 ft (Moxon; building acts)", tags=("hall",))


# ================================================================ spiral stair
def spiralstairs(tm, x, y, w, h, st, v):
    """A newel stair seen from above in its drum: the central newel, the wedge treads turning clockwise, lighter as
    they rise, the way down a dark gap. Dark Ages to Age of Reason: stone treads in a stone drum, a rope handrail on
    iron staples for the richer. Victorian: a cast-iron spiral with pierced treads and a twisted rail. Great War: plain steel chequer-plate treads.
    Mid-Century and Modern: steel, then galvanized with grip plates. Future Darkness: composite with lit edges."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R_ = min(X1 - X0, Y1 - Y0) // 2
    if e <= 3: C = p.stone if v.get("material") != "timber" else p.wood
    elif e == 4: C = paint(p, IRON[2], .45)
    elif e == 5: C = paint(p, mix(STEEL[2], (96, 98, 92), .4), .4)              # Great War: plain steel chequer plate, painted
    elif e <= 7: C = paint(p, STEEL[2], .5)
    else: C = ramp(mix(p.comp[2], p.acc[2], .55), 14)
    shadow(tm, X0, Y0, X1, Y1, 4, kind="ellipse")
    if e <= 3:
        d.ellipse([X0, Y0, X1, Y1], fill=p.stone[1], outline=OUT)            # the drum wall
        d.ellipse([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=(18, 14, 16))
    else:
        d.ellipse([X0, Y0, X1, Y1], fill=p.stone[2], outline=OUT)            # the floor slab with the well cut in it
        d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=(18, 14, 16), outline=OUT)
    n = (14, 12, 15, 16, 12, 14, 13, 15, 14)[e]; r0, r1 = 8, R_ - (7 if e <= 3 else 5)   # treads to the turn in each age
    for k in range(n - 2):                                                      # the treads, rising clockwise from the south
        if p.broken and k == 6: continue
        a0 = math.pi / 2 + k * 2 * math.pi / n; a1 = a0 + 2 * math.pi / n - .03
        lv = 1 + min(3, k * 4 // n)
        pts = [(cx + math.cos(a0) * r0, cy + math.sin(a0) * r0), (cx + math.cos(a0) * r1, cy + math.sin(a0) * r1),
               (cx + math.cos(a1) * r1, cy + math.sin(a1) * r1), (cx + math.cos(a1) * r0, cy + math.sin(a1) * r0)]
        d.polygon(pts, fill=C[lv], outline=OUT)
        d.line([pts[2], pts[3]], fill=C[4] if e < 8 else p.lit[2])
        if e == 5:
            for f in (.35, .55, .75): mx, my = cx + math.cos((a0 + a1) / 2) * r1 * f, cy + math.sin((a0 + a1) / 2) * r1 * f; d.line([mx - 2, my, mx + 2, my + 1], fill=C[0])
        if e == 4:
            for f in (.45, .75): mx, my = cx + math.cos((a0 + a1) / 2) * r1 * f, cy + math.sin((a0 + a1) / 2) * r1 * f; d.ellipse([mx - 1, my - 1, mx + 1, my + 1], fill=(18, 14, 16))
        if e == 7: d.line([pts[1][0] * .9 + cx * .1, pts[1][1] * .9 + cy * .1, pts[3][0] * .5 + pts[2][0] * .5, pts[3][1] * .5 + pts[2][1] * .5], fill=C[3])
    endgrain(tm, cx, cy, 8, C if e > 3 else p.stone)                            # the newel
    if p.w >= 4 and e <= 3: d.arc([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], 100, 420, fill=(170, 140, 90), width=2)   # the rope rail
    elif e >= 4: d.arc([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], 100, 420, fill=C[4] if e < 8 else p.lit[1], width=2)
    if p.st in ("islamic", "southasia", "mediterranean") and e <= 3 and p.w >= 4:
        for a in range(0, 360, 45): ar = math.radians(a); d.rectangle([cx + math.cos(ar) * (R_ - 3) - 1, cy + math.sin(ar) * (R_ - 3) - 1, cx + math.cos(ar) * (R_ - 3) + 1, cy + math.sin(ar) * (R_ - 3) + 1], fill=p.acc[3])
    if p.worn: scuffs(tm, cx - R_ // 2, cy - R_ // 2, cx + R_ // 2, cy + R_ // 2, C, rng, 6)


define("spiralstairs", draw=spiralstairs, axes={"material": ["stone", "timber"]}, front=True, clear=2,
       ref="newel stairs 5 to 7 ft across inside the drum (castle and church towers); cast-iron spirals 4 to 6 ft",
       tags=("tower", "castle", "greathall"))


# ================================================================ trellis or drainpipe
def trellis(tm, x, y, w, h, st, v):
    """A climbable thing on a wall face, seen from above as it stands out from the wall to the north. Renaissance and
    Age of Reason: a timber trellis with a vine, rose, jasmine or bougainvillea on it by region. Victorian and Great
    War: a cast-iron drainpipe on its brackets with a hopper head, ivy up it. Mid-Century: a painted iron pipe.
    Modern: a grey plastic pipe. Future Darkness: a composite conduit with a lit seam."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cy = (Y0 + Y1) // 2
    flower = {"mediterranean": (200, 60, 150), "americas": (200, 60, 150), "islamic": (240, 240, 230), "southasia": (240, 240, 230), "eastasia": (150, 120, 200),
              "atlantic": (200, 60, 70), "central": (120, 40, 110), "northern": (230, 180, 190), "seasia": (240, 150, 40), "africa": (240, 150, 40),
              "steppe": (220, 200, 80), "oceania": (240, 120, 120), "polar": (230, 230, 240)}[p.st]
    leaf = ramp(mix((60, 110, 50), p.ground[2], .2), 14)
    if e <= 3 or v.get("material") == "trellis":
        T_ = p.wood if p.w < 4 else ramp(mix(p.acc[2], WHITE[2], .4), 14)
        d.rectangle([X0, Y0 + 1, X1, Y1 - 1], fill=T_[1], outline=OUT)
        for k in range(X0 + 2, X1, 5): d.line([k, Y0 + 1, k + 3, Y1 - 1], fill=T_[3])
        for k in range(int((X1 - X0) / 4)):
            lx = X0 + 2 + k * 4 + rng.uniform(-1, 1); ly = cy + rng.uniform(-3, 2); d.ellipse([lx - 2, ly - 2, lx + 2, ly + 2], fill=leaf[2 + k % 3], outline=leaf[0])
        for k in range(3 + p.w): fx = rng.uniform(X0 + 3, X1 - 3); d.rectangle([fx, cy - 1, fx + 1, cy], fill=flower)
        if e <= 1: d.line([X0 + 3, cy + 2, X1 - 3, cy - 2], fill=(150, 110, 60))
    else:
        if e <= 6: M = paint(p, IRON[2], .5)
        elif e == 7: M = ramp(mix((120, 124, 128), p.acc[2], .3), 12)
        else: M = ramp(mix(p.comp[2], p.acc[2], .3), 14)
        d.rectangle([X0, Y0, X1, Y0 + 3], fill=p.stone[2])                      # the wall face it is fixed to
        for bx in (X0 + 3, X1 - 6): d.rectangle([bx, Y0, bx + 3, Y1 - 1], fill=M[1], outline=OUT)   # brackets to the wall
        d.ellipse([X0 + 8, Y0 + 1, X1 - 8, Y1 - 1], fill=M[2], outline=OUT); d.arc([X0 + 9, Y0 + 2, X1 - 9, Y1 - 2], 180, 270, fill=M[4])   # the pipe
        if e <= 5 and p.w >= 2: d.rectangle([X0 + 12, Y0, X1 - 12, Y1], fill=M[3], outline=OUT); d.rectangle([X0 + 14, Y0 + 2, X1 - 14, Y1 - 3], fill=(16, 14, 18))   # the hopper head
        if e >= 8: d.line([X0 + 9, cy, X1 - 9, cy], fill=p.lit[1])
        if e <= 6 or p.w <= 1:                                                  # ivy or a creeper over it
            for k in range(5): lx = X0 + 2 + k * 8 + rng.uniform(-2, 2); d.ellipse([lx - 2, cy - 3, lx + 2, cy + 1], fill=leaf[1 + k % 3], outline=leaf[0])
    if p.broken: d.line([X0 + (X1 - X0) * .4, Y0, X0 + (X1 - X0) * .55, Y1], fill=(14, 12, 14), width=2)


define("trellis", draw=trellis, axes={"material": ["pipe", "trellis"]}, ft=((1.5, 3), (.4, .75)),
       ref="garden trellises 2 to 3 ft wide; cast-iron rainwater pipes 3 to 4 in on brackets (Macfarlane's Castings, 1880s)",
       tags=("garden", "street", "alley", "courtyard"))


# ================================================================ scaffolding
def scaffold(tm, x, y, w, h, st, v):
    """Scaffolding against a building front, seen from above: its working platform of planks or hurdles between the
    standards. Dark Ages to Age of Reason: poles lashed with rope, putlogs into the wall, woven hurdles for a deck, a
    ladder up; the Long Night's smaller hurdles spattered with lime. East and South-east Asia in every age: bamboo lashed with rattan. Victorian: poles and ropes and
    scaffold boards. Great War to Modern: steel tube with clamps, boards and a toe board, and netting late on. Future
    Darkness: a composite frame with lit edges."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e
    bamboo = p.st in ("eastasia", "seasia", "southasia")
    if e >= 8: Pl = p.comp
    elif e >= 5 and not bamboo: Pl = ramp(mix(STEEL[2], p.acc[2], .12), 14)
    elif bamboo: Pl = ramp((196, 178, 96), 16)
    else: Pl = p.wood
    deck = ramp(mix((170, 140, 92), p.wood[2], .6), 16) if not (e <= 1 and not bamboo) else ramp(mix((150, 120, 70), p.wood[2], .5), 14)
    if p.w <= 1: deck = ramp(mix(deck[2], (110, 100, 90), .3), 14)
    elif p.w >= 4: deck = ramp(tone(deck[2], 16), 16)
    ground(tm, X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, p.ground, rng, "rect")                # the trodden ground and mortar droppings under it
    shadow(tm, X0, Y0, X1, Y1, 4)
    d0, d1 = Y0 + 4, Y1 - 4
    if e <= 1 and not bamboo:                                                    # woven hurdles for a deck
        hw_ = 30 if e == 0 else 21                                                # big Dark Age hurdles, smaller Long Night ones
        for hx in range(X0 + 2, X1 - 10, hw_):
            d.rectangle([hx, d0, hx + hw_ - 2, d1], fill=deck[1], outline=OUT)
            for k in range(d0 + 2, d1, 3): d.line([hx + 1, k, hx + hw_ - 3, k], fill=deck[3] if (k // 3) % 2 else deck[2])
        if e == 1:
            for k in range(26): lx, ly = rng.uniform(X0 + 3, X1 - 3), rng.uniform(d0 + 2, d1 - 2); d.ellipse([lx, ly, lx + 3, ly + 2], fill=(222, 218, 204))   # lime mortar dropped
    else:
        nb = (4, 4, 4, 3, 5, 4, 3, 5, 4)[e]                                       # boards across the platform, wider or narrower by age
        for k in range(nb):
            by0 = d0 + (d1 - d0) * k / nb; by1 = d0 + (d1 - d0) * (k + 1) / nb - 1
            if p.broken and k == 2: continue
            slab(tm, X0 + 2, by0, X1 - 2, by1, deck, "x", rng=rng)
            if e >= 5 and not bamboo:
                for bx in (X0 + 4, X1 - 6): d.rectangle([bx, by0 + 1, bx + 2, by1 - 1], fill=STEEL[2])   # the board end hoops
    sp_ = 36 if not bamboo else 28
    for sx in range(X0 + 4, X1, sp_):                                            # the standards, inner and outer
        for sy in (Y0 + 3, Y1 - 3):
            d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=Pl[2], outline=OUT); d.point((sx - 1, sy - 1), fill=Pl[4])
            if e <= 4 or bamboo: lash(tm, sx, sy, ramp((150, 120, 70), 14) if not bamboo else ramp((120, 96, 50), 14))
            elif e < 8: d.rectangle([sx - 4, sy - 2, sx + 4, sy + 2], outline=Pl[0])
        d.line([sx, Y0 + 3, sx, Y1 - 3], fill=Pl[1], width=2)                    # the transom across
    for sy in (Y0 + 3, Y1 - 3): d.line([X0 + 2, sy, X1 - 2, sy], fill=OUT, width=4); d.line([X0 + 2, sy, X1 - 2, sy], fill=Pl[3], width=2)   # the ledgers
    if e >= 8: d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=p.lit[1])
    if e == 6 and not bamboo: d.rectangle([X0 + 1, Y1 - 6, X1 - 1, Y1 - 3], fill=p.wood[3], outline=OUT)   # Mid-Century: the toe board
    if e == 7 and p.w >= 2:                                                      # the netting hung on the outer face
        N = ramp(((40, 90, 160), (60, 120, 70), (200, 196, 186), (210, 120, 40))[p.w % 4], 12)   # debris netting in its stock colours
        d.rectangle([X0 + 1, Y1 - 5, X1 - 1, Y1 - 1], fill=N[2])
        for gx in range(X0 + 2, X1, 4): d.point((gx, Y1 - 3), fill=N[4])
    lx = X1 - 26                                                                 # the ladder through the deck
    d.rectangle([lx, d0 + 2, lx + 12, d1 - 2], fill=(20, 16, 18))
    for k in range(d0 + 5, d1 - 2, 5): d.line([lx + 1, k, lx + 11, k], fill=p.wood[3] if e < 7 else ALU[3])
    if p.w >= 3 and e <= 4:                                                      # a bucket and a hod
        d.ellipse([X0 + 40, d0 + 4, X0 + 50, d0 + 14], fill=p.wood[1], outline=OUT); d.ellipse([X0 + 42, d0 + 6, X0 + 48, d0 + 12], fill=(170, 164, 150))
    if p.worn: scuffs(tm, X0 + 3, d0 + 2, X1 - 3, d1 - 2, deck, rng, 8)


define("scaffold", draw=scaffold, ft=((8.5, 11.5), (3.5, 4.75)),
       ref="scaffold lifts about 4 ft wide, standards 6 to 8 ft apart (medieval putlog scaffolds; BS 1139 tube and fitting)",
       tags=("street", "nave", "square"))


# ================================================================ fire escape
def fireescape(tm, x, y, w, h, st, v):
    """An iron fire escape on an outside wall, seen from above: the landing's slatted or grated floor, its rail round
    the outer edge, the stair dropping to the next landing and the drop ladder. Founders' work, the same the world over:
    Victorian and Great War wrought iron with bar treads and scrolls under the rail, then steel grating, in Future
    Darkness a composite landing with lit nosings. The make axis is its paint (black, green, oxide red, grey, cream,
    white) and its build (a long landing and short stair, a landing with a ladder hatch, a short balcony and
    long stair). Poor streets let it rust and hang washing on it. Each age its own: fine wrought slats and scrolls
    (Victorian), riveted chequer plate (Great War), square grating (Mid-Century), galvanized expanded mesh (Modern)."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); e = p.e
    cl, model = make(v, "black stair"); M = ramp(ESCAPE_PAINT[cl], 16)
    if p.w <= 1: M = ramp(mix(M[2], (120, 70, 46), .3), 16)                      # paint gone to rust in a poor street
    if p.worn and e < 8: M = ramp(mix(M[2], (130, 70, 40), .45), 16)
    if e == 7: M = ramp(mix(M[2], (172, 176, 178), .35), 16)                     # Modern: hot-dip galvanized under thin paint
    if e >= 8: M = ramp(mix(p.comp[2], M[2], .5), 14)
    d.rectangle([X0, Y0, X1, Y0 + 3], fill=p.stone[2], outline=OUT)            # the wall's sill it is bolted to
    shadow(tm, X0, Y0, X1, Y1, 4)
    sx0 = X1 - 2 if model == "ladder" else X0 + (X1 - X0) * (2 if model == "stair" else 1) // 3
    d.rectangle([X0, Y0, sx0, Y1], fill=M[1], outline=OUT)                     # the landing
    if e <= 5:
        if e == 4:
            for gx in range(X0 + 3, sx0, 4): d.line([gx, Y0 + 2, gx, Y1 - 2], fill=M[3])   # fine wrought bar slats
        else:                                                                     # Great War: riveted chequer plate
            d.rectangle([X0 + 2, Y0 + 2, sx0 - 1, Y1 - 2], fill=M[3])
            for gy in range(Y0 + 4, Y1 - 2, 4):
                for gx in range(X0 + 4 + (gy // 4) % 2 * 3, sx0 - 2, 6): d.line([gx, gy, gx + 2, gy + 1], fill=M[1])
            for gx in range(X0 + 8, sx0, 16): rivet(tm, gx, Y0 + 3); rivet(tm, gx, Y1 - 4)
    elif e == 7:                                                                  # expanded-metal mesh
        for gy in range(Y0 + 2, Y1, 5):
            for gx in range(X0 + 2 + (gy // 5) % 2 * 3, sx0, 6): d.polygon([(gx, gy + 2), (gx + 3, gy), (gx + 6, gy + 2), (gx + 3, gy + 4)], outline=M[0])
    else:
        for gy in range(Y0 + 2, Y1, 4):
            for gx in range(X0 + 2, sx0, 4): d.rectangle([gx, gy, gx + 2, gy + 2], fill=M[0])
    if model == "ladder":                                                        # no stair: a hatch in the landing and a ladder down
        d.rectangle([X1 - 22, Y0 + 5, X1 - 6, Y1 - 5], fill=(18, 14, 16), outline=OUT)
        for k in range(Y0 + 8, Y1 - 5, 4): d.line([X1 - 20, k, X1 - 8, k], fill=M[4])
    else: d.rectangle([sx0, Y0, X1, Y1], fill=(18, 14, 16), outline=OUT)        # the stair going down
    nt = 0 if model == "ladder" else (8, 10, 9, 11, 10)[min(e, 8) - 4]
    for k in range(nt):
        tx = sx0 + (X1 - sx0) * k / nt; c = M[3 - min(2, k * 3 // nt)]
        d.rectangle([tx + 1, Y0 + 4, tx + (X1 - sx0) / nt - 2, Y1 - 4], fill=c)
        if e >= 8: d.line([tx + 1, Y0 + 4, tx + 1, Y1 - 4], fill=p.lit[1])
    for yy in (Y0 + 1, Y1 - 2): d.line([X0, yy, X1, yy], fill=OUT, width=3); d.line([X0, yy, X1, yy], fill=M[4])   # the rails
    d.line([X0 + 1, Y0, X0 + 1, Y1], fill=M[4], width=2)
    if e <= 5 and p.w >= 2:
        for gx in range(X0 + 6, sx0, 12): d.arc([gx - 4, Y1 - 6, gx + 4, Y1 + 2], 180, 360, fill=M[4])   # scrolls under the rail
    lx = X0 + 6                                                                  # the drop ladder hooked up
    d.rectangle([lx, Y0 + 6, lx + 10, Y1 - 6], fill=M[2], outline=OUT)
    for k in range(Y0 + 9, Y1 - 6, 4): d.line([lx + 1, k, lx + 9, k], fill=M[4])
    if p.w <= 3:                                                                 # washing hung over the rail
        for k, wx in enumerate(range(X0 + 18, sx0 - 8, 14)):
            c = ramp([(200, 60, 60), (60, 90, 170), (210, 206, 196), (220, 180, 50)][(k + p.w) % 4], 10); d.rectangle([wx, Y1 - 9, wx + 10, Y1], fill=c[3], outline=OUT); d.line([wx + 1, Y1 - 6, wx + 9, Y1 - 6], fill=c[1])
    if p.w <= 1 and e >= 6 and model != "ladder":                              # a potted plant out on it
        d.ellipse([sx0 - 14, Y0 + 5, sx0 - 4, Y0 + 15], fill=(160, 80, 50), outline=OUT); d.ellipse([sx0 - 12, Y0 + 7, sx0 - 6, Y0 + 13], fill=(60, 120, 60))
    if p.broken and model != "ladder": d.line([sx0 + 6, Y0 + 2, X1 - 4, Y1 - 2], fill=(18, 14, 16), width=4)
    if p.broken: crack(tm, X0 + 20, Y0 + 2, X0 + 30, Y1 - 2, rng)


ESCAPE_PAINT = {"black": (38, 38, 42), "green": (42, 76, 54), "oxide": (122, 54, 40), "grey": (132, 136, 138), "cream": (196, 186, 156), "white": (222, 222, 216)}


define("fireescape", draw=fireescape, global_from=1837, axes={"material": makes(ESCAPE_PAINT, ["stair", "ladder", "balcony"], ["white stair"])}, nvar=20, ft=((5, 7), (2.5, 3.5)), front=False,
       ref="fire escape landings about 3 ft deep and 6 to 8 ft long, stairs 22 in wide (New York tenement laws 1867-1901)",
       tags=("alley", "street"))


# ================================================================ knotted rope
def knotrope(tm, x, y, w, h, st, v):
    """A knotted climbing rope hung from an iron ring or hook at the wall to the north, its knots a foot apart, the
    tail flaked on the floor in loose loops. Hemp before the Mid-Century (coir in South and South-east Asia, plaited
    hide in the steppe and the far north): tarred in the Long Night, thick and cable-laid in the Age of Reason, golden
    manila for the Victorians, weathered grey in the Great War; then nylon in a colour, braided polypropylene in Modern, then a dark synthetic line with a lit thread in
    Future Darkness. A broken rope is frayed through above the coil."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cx = (X0 + X1) // 2
    base = {"central": (176, 150, 104), "atlantic": (96, 78, 60), "northern": (206, 186, 140), "mediterranean": (196, 178, 92),
            "islamic": (150, 106, 70), "steppe": (92, 64, 50), "southasia": (136, 78, 44), "eastasia": (214, 200, 164), "seasia": (168, 128, 56),
            "africa": (186, 120, 84), "americas": (226, 210, 160), "oceania": (122, 92, 64), "polar": (70, 52, 44)}[p.st]   # hemp, tarred, bast, esparto, palm, horsehair, coir, rice straw, abaca, bark, agave, sennit, hide
    era_fibre = {1: ((60, 48, 36), .35), 4: ((204, 170, 96), .3), 5: ((132, 128, 118), .3)}   # tarred, manila, weathered
    if e in era_fibre: base = mix(base, *era_fibre[e])
    if e == 6 and p.w >= 2: base = ((222, 220, 210), (50, 90, 170), (180, 50, 40), (210, 180, 40))[p.w - 2]   # nylon in its stock colours for those who can buy it; the poor keep the old fibre
    if e == 7 and p.w >= 2: base = ((40, 96, 200), (230, 120, 30), (60, 150, 70), (226, 226, 220))[p.w - 2]   # braided polypropylene
    if e >= 8 and p.w >= 2: base = mix(p.comp[2], p.acc[2] if p.w <= 3 else p.cloth[2], .85)
    Rp = ramp(mix(base, p.cloth[2], .2) if e < 6 or p.w < 2 else base, 16)
    K = ramp(p.cloth[2] if e < 8 else p.acc[2], 16) if p.w >= 2 else Rp           # the knots whipped with dyed thread (lit collars late on)
    if e >= 8 and p.w >= 2: K = ramp(mix(p.cloth[2], GLOW[1], .3), 16)
    if p.w >= 4: K = ramp(p.acc[2], 18)
    Wp = p.stone if e != 0 else p.wood                                            # the block the ring is leaded into
    d.rectangle([X0, Y0, X1, Y0 + 10], fill=Wp[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Wp[4])
    d.ellipse([cx - 5, Y0 + 3, cx + 5, Y0 + 13], outline=OUT, width=3); d.ellipse([cx - 4, Y0 + 4, cx + 4, Y0 + 12], outline=IRON[4] if p.w < 4 else BRASS[3], width=1)   # the ring
    end = Y0 + int((Y1 - Y0) * (.45 if not p.broken else .35))                    # the hanging run, then the tail flaked in loose loops
    pts = [(cx + math.sin(t * 9) * 1.5, Y0 + 8 + t * (end - Y0 - 8)) for t in np.linspace(0, 1, 16)]
    hw = (X1 - X0) // 2 - 4
    loops = (7, 5, 8, 6, 9, 5, 8, 6, 7)[e]                                        # how it is flaked down in each age's gymnasium or hold
    tail = [(cx + hw * math.sin(t * math.pi * loops), end + t * (Y1 - 6 - end)) for t in np.linspace(0, 1, 60)]
    if p.broken: tail = [(cx + hw * math.sin(t * math.pi * 5) * .8, end + 18 + t * (Y1 - 24 - end)) for t in np.linspace(0, 1, 50)]
    ground(tm, X0, end - 4, X1, Y1, p.ground, rng, "rect")                        # the floor the tail lies on
    for run in ((pts + tail) if not p.broken else pts, tail if p.broken else []):
        if not run: continue
        rw_ = 9 if e == 3 else 7                                                 # the Age of Reason's thick cable-laid rope
        d.line(run, fill=OUT, width=rw_); d.line(run, fill=Rp[2], width=rw_ - 2); d.line([(a - 1, b_ - 1) for a, b_ in run], fill=Rp[3])
    for k in range(1, 20):                                                        # the lay of the strands
        t = k / 20; yy = Y0 + 8 + t * (end - Y0 - 8); d.line([cx - 1, yy, cx + 1, yy + 2], fill=Rp[0])
    for yy in range(Y0 + 22, int(end), (19, 17, 21, 19, 23, 17, 20, 18, 16)[e]):     # a knot about each foot
        d.ellipse([cx - 6, yy - 4, cx + 6, yy + 4], fill=K[3], outline=OUT); d.point((cx - 2, yy - 2), fill=K[4])
    for k in range(4, len(tail), 9):
        tx, ty = tail[k]; d.ellipse([tx - 5, ty - 4, tx + 5, ty + 4], fill=K[3], outline=OUT)
    if e >= 8: d.line([cx, Y0 + 9, cx, end], fill=p.lit[1])
    if p.broken:                                                                  # frayed through, the rest fallen in a heap
        for a in (-.5, 0, .5): d.line([cx, end, cx + math.sin(a) * 6, end + 6], fill=Rp[3])
    if p.w >= 4 and e < 6: d.rectangle([cx - 3, end - 4, cx + 3, end], fill=p.acc[3], outline=OUT)   # a whipped and dyed end
    if p.worn: d.line([cx + 3, Y0 + 30, cx + 3, Y0 + 50], fill=Rp[4])


define("knotrope", draw=knotrope, ft=((.75, 1.25), (8.5, 11.5)), front=False,
       ref="climbing ropes 1 1/2 in thick with knots about a foot apart (gymnasium and ship's ropes)", tags=("tower", "boat", "dungeon", "cellar"))


# ================================================================ trapdoor
def hatch(tm, x, y, w, h, st, v):
    """A trapdoor in a floor. Closed: its leaf flush in its frame with a ring or handle to lift it. Open: the leaf
    thrown back flat on the floor to the north past its hinges, the dark hole with a ladder or the top of a stair going
    down. Dark Ages to Age of Reason: planks on battens with strap hinges and an iron ring. Victorian: a cast-iron coal
    plate or a panelled hatch. Mid-Century: a chequer-plate steel hatch. Modern: a steel access hatch with a recessed
    handle. Future Darkness: a composite iris with a lit rim."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 3); e = p.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    if e <= 3: C = p.wood
    elif e == 4: C = IRON if v.get("material") == "iron" else p.wood
    elif e <= 6: C = paint(p, STEEL[1], .35)
    elif e == 7: C = paint(p, (120, 124, 128), .35)
    else: C = ramp(mix(p.comp[2], p.acc[2], .3), 14)
    if e == 4 and C is IRON: C = paint(p, IRON[2], .3)
    F = p.stone if v.get("material") == "stone" or C is not p.wood else p.wood       # the frame
    d.rectangle([X0 - 2, Y0 - 2, X1 + 2, Y1 + 2], fill=F[1], outline=OUT)
    if st == "open":
        d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=(14, 10, 14))         # the hole
        d.polygon([(X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X1 - 12, Y0 + 12), (X0 + 12, Y0 + 12)], fill=(34, 28, 30))
        if v.get("contents") == "stair":
            for k in range(5): yy = Y0 + 16 + k * 10; d.rectangle([X0 + 12, yy, X1 - 12, yy + 7], fill=mix(F[2], (14, 10, 14), .2 + k * .15))
        else:
            for rx in (cx - 12, cx + 10): d.rectangle([rx, Y0 + 10, rx + 3, Y1 - 3], fill=p.wood[2], outline=OUT)   # the ladder's rails
            for k in range(4): yy = Y0 + 18 + k * 14; d.rectangle([cx - 10, yy, cx + 10, yy + 2], fill=p.wood[3 - k // 2])
        ly0 = Y0 - (Y1 - Y0) + 4                                                   # the leaf thrown back on the floor beyond
        d.rectangle([X0 + 1, ly0, X1 - 1, Y0 - 3], fill=C[2], outline=OUT)
        if C is p.wood:
            for gx in range(X0 + 12, X1, 12): d.line([gx, ly0 + 1, gx, Y0 - 4], fill=C[0])
            for by in (ly0 + 10, Y0 - 14): d.rectangle([X0 + 4, by, X1 - 4, by + 5], fill=C[1], outline=OUT)   # the battens underneath
        return
    if C is p.wood:
        nbd = (4, 6, 5, 3)[min(e, 3)]                                             # boards by age, the Age of Reason's few wide ones panelled
        slab(tm, X0, Y0, X1, Y1, C, "y", rng=rng, gaps=[(X1 - X0) * k // nbd for k in range(1, nbd)])
        if e == 3: d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], outline=C[0], width=2)
        if e == 1:                                                                # Long Night: studded, a bolt shot across
            for gx in range(X0 + 5, X1 - 3, 7): d.point((gx, (Y0 + Y1) // 2), fill=IRON[4])
            d.rectangle([X1 - 14, (Y0 + Y1) // 2 - 6, X1 - 4, (Y0 + Y1) // 2 - 2], fill=IRON[2], outline=OUT)
        for sy in (Y0 + 8, Y1 - 10):                                               # strap hinges from the north edge
            d.rectangle([X0 + 6, sy, X1 - 6, sy + 3], fill=p.metal[2] if p.w >= 4 else IRON[2], outline=OUT)
            for k in range(X0 + 10, X1 - 6, 10): d.point((k, sy + 1), fill=IRON[4])
        d.ellipse([cx - 6, Y1 - 18, cx + 6, Y1 - 6], outline=OUT, width=3); d.ellipse([cx - 5, Y1 - 17, cx + 5, Y1 - 7], outline=IRON[4] if p.w < 4 else BRASS[3])   # the ring
    elif e == 4:
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        rr = (min(X1 - X0, Y1 - Y0) / 2 - 3) / 3
        for k in range(1, 4): d.ellipse([cx - k * rr, cy - k * rr, cx + k * rr, cy + k * rr], outline=C[4] if k % 2 else C[0])   # the cast pattern
        for gx in range(X0 + 6, X1 - 4, 8):
            for gy in range(Y0 + 6, Y1 - 4, 8): d.point((gx, gy), fill=C[3])
    elif e <= 7:
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
        if e == 6:
            for gx in range(X0 + 4, X1 - 4, 8):
                for gy in range(Y0 + 4 + (gx // 8) % 2 * 4, Y1 - 4, 8): d.line([gx, gy, gx + 3, gy + 2], fill=C[4])   # chequer plate
        else: d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=C[0]); d.rectangle([cx - 8, Y1 - 12, cx + 8, Y1 - 7], fill=(20, 18, 20), outline=C[0])
        for rx, ry in ((X0 + 4, Y0 + 4), (X1 - 4, Y0 + 4), (X0 + 4, Y1 - 4), (X1 - 4, Y1 - 4)): rivet(tm, rx, ry)
        if e == 7 and p.w >= 2: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + 5], fill=(220, 190, 40))
    else:
        d.rectangle([X0, Y0, X1, Y1], fill=C[1], outline=OUT); d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=C[2], outline=p.lit[1])
        for a in range(0, 360, 60): ar = math.radians(a); d.line([cx, cy, cx + math.cos(ar) * (X1 - X0) / 2.4, cy + math.sin(ar) * (Y1 - Y0) / 2.4], fill=C[0])
    if p.st in ("eastasia",) and e <= 5: d.rectangle([X0 - 2, Y0 - 2, X1 + 2, Y1 + 2], outline=p.acc[2])
    if p.worn: scuffs(tm, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, C, rng, 6)
    if p.broken: crack(tm, X0 + 10, Y0 + 4, X0 + 30, Y1 - 4, rng); d.polygon([(X1 - 18, Y1 - 4), (X1 - 4, Y1 - 4), (X1 - 4, Y1 - 18)], fill=(14, 10, 14))


define("hatch", draw=hatch, states=("closed", "open"), openable="hatch", mount="floor", front=False, ft=((2.5, 3.5), (2.5, 3.5)),
       axes={"material": ["boards", "stone", "iron"], "contents": ["ladder", "stair"]},
       ref="cellar and loft trapdoors 2 1/2 to 3 1/2 ft square on strap hinges; coal plates 14 to 18 in", tags=("cellar", "loft", "barn", "tavern", "store", "boat", "tower"))


# ================================================================ door curtain or hanging
def doorcurtain(tm, x, y, w, h, st, v):
    """A hanging across a doorway, seen from above as its rod and the top of the cloth in folds. Closed: drawn across
    the opening. Open: gathered to one side and tied. The cloth by region: a kilim in red and indigo for the Islamic
    lands, appliqued felt for the steppe, block-printed cotton for South Asia, batik for South-east Asia, mud-cloth for
    Africa, a split noren for East Asia. Each age its own cloth: undyed and coarsely folded in the Dark Ages, dark and
    heavy in the Long Night, bright dyes in the Renaissance, light printed cotton on rings in the Age of Reason,
    deep-toned velvet with a fringe and brass rod for the Victorians, faded cotton in the Great War. Mid-Century: a bead,
    strip or wooden-bead curtain; Modern: the region's curtain again in bright synthetic print; Future Darkness: a curtain of lit filaments."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e; cy = (Y0 + Y1) // 2
    C = ramp(p.cloth[2] if e < 6 else p.acc[2], 18); B = ramp(p.acc[2] if e < 6 else p.cloth[2], 18)
    mat = v.get("material", "wool")
    if mat == "silk": C = ramp(tone(C[2], 18), 20)
    elif mat == "cotton": C = ramp(mix(C[2], LINEN[3], .35), 16)
    if p.w >= 4: C, B = B, ramp(mix(p.gold[2], C[2], .3), 18)                  # the rich: the strong dye, gold in the pattern
    elif p.w <= 1: C = ramp(mix(C[2], (150, 130, 100), .45), 16); B = ramp(mix(B[2], (110, 96, 80), .5), 14)
    era_cloth = {0: lambda c: mix(c, (150, 130, 100), .1), 1: lambda c: tone(c, -24), 2: lambda c: tone(c, 16),
                 3: lambda c: mix(c, (226, 216, 196), .2), 4: lambda c: tone(c, -16), 5: lambda c: mix(c, (150, 140, 110), .2),
                 7: lambda c: tone(c, 24)}
    if e in era_cloth: C = ramp(era_cloth[e](C[2]), 18); B = ramp(era_cloth[e](B[2]), 18)
    rod = p.metal if p.w >= 4 or e == 4 else p.wood
    d.line([X0, Y0 + 1, X1, Y0 + 1], fill=OUT, width=3); d.line([X0, Y0 + 1, X1, Y0 + 1], fill=rod[3])
    for ex in (X0 + 1, X1 - 1): d.ellipse([ex - 2, Y0 - 1, ex + 2, Y0 + 3], fill=rod[4], outline=OUT)
    if st == "open": a1 = X0 + (X1 - X0) // 5
    else: a1 = X1 - 2
    mat = v.get("material", "wool")
    if e >= 6 and e != 7:                                                         # strands of beads or strips, close together
        L_ = [mix(GLOW[0], p.acc[2], .6), mix(GLOW[1], p.acc[3], .6), mix(GLOW[2], p.acc[4], .4)]
        d.rectangle([X0 + 1, Y0 + 2, a1, Y1], fill=mix(C[1], B[1], .5) if e < 8 else mix(p.comp[1], p.cloth[1], .4))   # the shade behind the strands
        kind = {"wool": "strips", "cotton": "wood", "silk": "glass"}[mat]
        for k, sx in enumerate(range(X0 + 2, a1, 2 if st != "open" else 1)):
            if e >= 8:
                c = L_ if (k // 3) % 2 else ramp(p.cloth[2], 14)
                if p.w <= 1 and k % 4: c = p.comp                                 # a cheap one, half its filaments dead
                if p.w >= 4 and k % 5 == 0: c = p.gold
                d.line([sx, Y0 + 2, sx, Y1], fill=c[1 + k % 2]); continue
            if kind == "strips": d.line([sx, Y0 + 2, sx, Y1], fill=(C, B)[(k // 3) % 2][3])
            elif kind == "wood":
                for yy in range(Y0 + 2, Y1 + 1, 2): d.point((sx, yy), fill=p.wood[3 + (yy // 2 + k) % 2])
            else:
                for yy in range(Y0 + 2, Y1 + 1, 2): d.point((sx, yy), fill=(B[4] if (yy + k) % 4 else WHITE[4]))
        return
    d.rectangle([X0 + 1, Y0 + 2, a1, Y1], fill=C[2], outline=OUT)
    pitch = (6, 5, 4, 3, 4, 5, 4, 3)[e]                                         # coarse folds early, fine pleats later
    for k, sx in enumerate(range(X0 + 3, a1 - 1, pitch)): d.line([sx, Y0 + 3, sx, Y1 - 1], fill=C[0] if k % 2 else C[4])   # the folds
    if e == 3:
        for sx in range(X0 + 2, a1, 6): d.ellipse([sx - 1, Y0, sx + 1, Y0 + 2], outline=rod[4])   # rings on the rod
    if e == 4: d.line([X0 + 1, Y1, a1, Y1], fill=p.gold[3])                       # a fringe along the hem
    pat = p.st
    for sx in range(X0 + 6, a1 - 4, 10):                                          # the region's pattern along it
        if pat in ("islamic", "steppe"): d.polygon([(sx, cy), (sx + 3, Y0 + 3), (sx + 6, cy), (sx + 3, Y1 - 1)], fill=B[3])
        elif pat == "africa": d.line([sx, Y0 + 3, sx + 5, Y1 - 1], fill=B[0], width=2)
        elif pat == "eastasia": d.line([sx + 4, Y0 + 2, sx + 4, Y1], fill=OUT)    # the noren's splits
        else: d.ellipse([sx, cy - 2, sx + 4, cy + 2], fill=B[3])
    if st == "open": d.rectangle([a1 - 3, Y0 + 1, a1, Y1], fill=B[2], outline=OUT)   # the tie-back
    if p.worn: d.line([X0 + 10, Y1, X0 + 20, Y1], fill=C[0])
    if p.broken: d.rectangle([X0 + (X1 - X0) // 2, Y0 + 2, X0 + (X1 - X0) // 2 + 6, Y1], fill=(20, 16, 20))


define("doorcurtain", draw=doorcurtain, nvar=24, axes={"material": ["wool", "cotton", "silk"]}, states=("closed", "open"), openable="curtain", mount="wall", front=False, ft=((2.5, 4), (.25, .4)),
       ref="door hangings 3 ft wide on a rod across the opening (purdah, kilim and felt door covers; noren)", tags=("chamber", "shrinehall", "prayerhall", "guestroom"))


# ================================================================ shop front with a shutter board
def shopfront(tm, x, y, w, h, st, v):
    """A medieval and early modern shop front, seen from above along the street. Closed: the two shutter boards up and
    barred across the opening. Open: the lower board let down on its legs as a counter with goods on it, the upper
    propped out as a pentice over it (its edge seen at the north). The timber, paint and goods by region and wealth.
    Closed, each age its own: wide planks and a timber bar (Dark Ages), close boards with iron straps, studs and a
    padlock (Long Night), painted boards (Renaissance), panelled shutters with bolts (Age of Reason), and the
    Victorian's painted fascia board."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e
    C = p.wood if p.w < 3 else ramp(mix(p.acc[2], p.wood[2], .45), 18)
    d.rectangle([X0, Y0, X1, Y0 + 5], fill=p.stone[2], outline=OUT)                # the sill in the wall line
    for jx in (X0, X1 - 5): d.rectangle([jx, Y0, jx + 5, Y1], fill=p.wood[1], outline=OUT)   # the jambs
    if st != "open":
        if e == 2 and p.w >= 2: C = ramp(mix(p.acc[2], p.wood[2], .3), 18)       # Renaissance: the boards painted
        d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 2], fill=C[2], outline=OUT)
        if e >= 3:                                                                # panelled shutters
            for gx in range(X0 + 8, X1 - 14, 18): d.rectangle([gx, Y0 + 7, gx + 14, Y1 - 4], outline=C[0]); d.line([gx + 1, Y0 + 8, gx + 13, Y0 + 8], fill=C[4])
        else:
            for gx in range(X0 + 16, X1 - 6, (16, 9, 12)[e]): d.line([gx, Y0 + 6, gx, Y1 - 3], fill=C[0])
        if e == 0: d.line([X0 + 6, (Y0 + Y1) // 2 + 2, X1 - 6, (Y0 + Y1) // 2 + 2], fill=p.wood[0], width=4)   # a timber bar across
        else: d.line([X0 + 6, (Y0 + Y1) // 2 + 2, X1 - 6, (Y0 + Y1) // 2 + 2], fill=IRON[3], width=2)   # the iron bar across
        if e == 1:                                                                # Long Night: iron straps, studs and a padlock
            for hx in range(X0 + 14, X1 - 10, 16): d.rectangle([hx - 2, Y0 + 6, hx + 2, Y1 - 3], fill=IRON[2])
            for hx in range(X0 + 10, X1 - 8, 8): d.point((hx, Y0 + 7), fill=IRON[4])
            cxm = (X0 + X1) // 2; d.rectangle([cxm - 3, Y0 + 7, cxm + 3, Y1 - 3], fill=IRON[1], outline=OUT)
        elif e <= 2:
            for hx in (X0 + 20, X1 - 20): d.rectangle([hx - 2, Y0 + 6, hx + 2, Y1 - 3], fill=IRON[2])
        else:
            for hx in (X0 + 9, X1 - 12): d.rectangle([hx, Y0 + 9, hx + 3, Y1 - 5], fill=BRASS[3] if p.w >= 3 else IRON[3])   # the bolts
        if e >= 4: d.rectangle([X0 + 30, Y0 + 7, X1 - 30, Y0 + 10], fill=p.gold[3] if p.w >= 3 else WHITE[2])   # the name on the board
        if p.worn: scuffs(tm, X0 + 6, Y0 + 6, X1 - 6, Y1 - 3, C, rng, 5)
        return
    slab(tm, X0 + 5, Y0 + 5, X1 - 5, Y1 - 1, C, "x", rng=rng)                     # the counter board let down
    goods = {"islamic": [(200, 140, 60), (150, 40, 60), (40, 120, 120)], "southasia": [(232, 150, 28), (190, 40, 96), (200, 60, 40)],
             "eastasia": [(220, 220, 210), (60, 80, 140), (176, 36, 30)], "seasia": [(240, 180, 40), (110, 140, 56), (144, 60, 112)],
             "africa": [(204, 128, 46), (214, 196, 140), (60, 40, 30)]}.get(p.st, [(170, 110, 60), (200, 190, 160), (100, 130, 70)])
    k = 0
    for gx in range(X0 + 10, X1 - 12, 14 if p.w >= 2 else 22):                    # goods laid out
        c = goods[k % 3]; k += 1
        if k % 2: d.ellipse([gx, Y0 + 7, gx + 9, Y1 - 3], fill=c, outline=OUT)
        else: d.rectangle([gx, Y0 + 7, gx + 10, Y1 - 3], fill=c, outline=OUT); d.line([gx + 1, Y0 + 8, gx + 9, Y0 + 8], fill=tone(c, 30))
    if p.broken: crack(tm, X0 + (X1 - X0) * .6, Y0 + 5, X0 + (X1 - X0) * .65, Y1, rng)


define("shopfront", draw=shopfront, states=("closed", "open"), openable="shutter", mount="wall", front=True, clear=2, ft=((6, 10), (.85, 1.25)),
       ref="shop fronts with a fall-down counter board and lift-up pentice, 6 to 10 ft (medieval Shrewsbury, Lavenham; Salzman, Building in England)",
       tags=("shop",))


# ================================================================ plate-glass shop window
def shopwindow(tm, x, y, w, h, st, v):
    """A plate-glass shop window from above: the stall riser's top, the great sheet of glass in a slim frame with its
    glint, the display bed behind it with goods in rows. Age of Reason: small panes in glazing bars. Victorian: a
    mahogany or painted frame, larger panes. Great War and Mid-Century: bronze or chrome frames, the display on velvet. Modern: an aluminium frame and a
    sticker in the glass. Future Darkness: a frameless pane with a lit display edge."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e
    if e <= 5: Fr = ramp(mix(p.acc[2], p.wood[2], .4), 16) if p.w >= 3 else p.wood
    elif e <= 6: Fr = ramp(mix((200, 200, 204), p.acc[2], .2), 16)
    elif e == 7: Fr = ramp(mix(ALU[2], p.acc[2], .4), 12)
    else: Fr = ramp(mix(p.comp[2], p.acc[2], .4), 14)
    G = [(34, 52, 72), (62, 94, 118), (104, 144, 164), (160, 196, 204), (226, 240, 240)]
    d.rectangle([X0, Y0, X1, Y1], fill=Fr[1], outline=OUT)
    d.rectangle([X0 + 3, Y1 - 6, X1 - 3, Y1 - 2], fill=G[1], outline=OUT)        # the glass, its glints
    for gx in range(X0 + 10, X1 - 10, 40): d.line([gx, Y1 - 5, gx + 6, Y1 - 3], fill=G[4])
    if e <= 4:                                                                    # glazing bars: small panes, then larger ones
        for gx in range(X0 + 12, X1 - 6, 12 if e <= 3 else 30): d.rectangle([gx - 1, Y1 - 6, gx + 1, Y1 - 2], fill=Fr[3])
    if e == 5: d.rectangle([X0 + 1, Y1 - 8, X1 - 1, Y1 - 6], fill=BRASS[3])       # Great War: one plate in a bronze frame
    bed = ramp(p.cloth[2] if p.w >= 3 else mix(p.cloth[2], (170, 160, 140), .5), 14)
    if e >= 7: bed = ramp(mix(p.acc[2], p.cloth[2], .5), 14)
    if e == 5: bed = ramp(mix(bed[2], (110, 24, 40), .35), 16)                   # the display on velvet
    if e == 3: bed = ramp(mix(bed[2], (200, 184, 150), .3), 14)                   # bare boards behind small panes
    d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 8], fill=bed[2], outline=OUT)
    gcol = [p.acc[3], WHITE[3], p.gold[3], p.cloth[4], (60, 60, 70)]
    for k, gx in enumerate(range(X0 + 7, X1 - 8, 9 if p.w >= 3 else 13)):          # the goods in the window
        c = gcol[(k + p.w) % len(gcol)]
        if k % 3 == 0: d.ellipse([gx, Y0 + 4, gx + 6, Y1 - 10], fill=c, outline=OUT)
        else: d.rectangle([gx, Y0 + 4, gx + 6, Y1 - 10], fill=c, outline=OUT)
    if e >= 8: d.line([X0 + 3, Y1 - 7, X1 - 3, Y1 - 7], fill=p.lit[1])
    if e == 7 and p.w <= 2: d.rectangle([X1 - 16, Y1 - 6, X1 - 10, Y1 - 2], fill=(230, 60, 40))   # a sale sticker
    if p.broken:                                                                   # the glass smashed, shards on the pavement side
        d.rectangle([X0 + 30, Y1 - 6, X0 + 60, Y1 - 2], fill=(16, 14, 18))
        for k in range(8): sx = rng.uniform(X0 + 26, X0 + 66); d.polygon([(sx, Y1 - 3), (sx + 3, Y1 - 1), (sx + 1, Y1)], fill=G[3])
    elif p.worn: d.line([X0 + 50, Y1 - 6, X0 + 64, Y1 - 2], fill=G[0])


define("shopwindow", draw=shopwindow, mount="wall", front=True, clear=2, ft=((8, 12), (.85, 1.25)),
       ref="shop windows of polished plate glass 8 to 12 ft, available from about 1830 (Chance Brothers; Dan Cruickshank, The Shopfront)",
       tags=("shop",))


# ================================================================ roller shutter
def rollershutter(tm, x, y, w, h, st, v):
    """A roller shutter across a shop or warehouse front, seen from above. Closed: its slats down in their side guides
    across the opening, the bottom rail locked to the ground. Open: rolled up into the box, only the box, the guides and
    the clear threshold showing. Factory-made and the same the world over: wooden laths in the Victorian age, steel
    over red-lead primer in the Great War, painted steel, then galvanized with an electric motor in Modern, in Future
    Darkness composite. The make axis is its paint (bare or galvanized, white, green, blue, oxide red, grey)
    and its laths (narrow ribbed, wide flat, open grille). Tags sprayed on it in poor Modern streets."""
    d = tm.d; p = pal(v); rng = rng_of(tm, v); X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); e = p.e
    cl, model = make(v, "galvanised ribbed"); col = SHUTTER_PAINT[cl]
    if e <= 4: M = p.wood if col is None else ramp(mix(col, p.wood[2], .2), 16)   # Victorian: wooden laths, painted or bare
    elif e == 5: M = ramp(mix(col or (150, 154, 158), (150, 64, 44), .3), 14)    # Great War: steel laths over red-lead primer
    elif e == 6: M = ramp(col or (150, 154, 158), 14)
    elif e == 7: M = ramp(mix(col or (150, 154, 158), (178, 182, 186), .3), 14)  # Modern: galvanized under a thin coat
    else: M = ramp(mix(p.comp[2], col or (150, 154, 158), .45), 14)
    M = ramp(mix(M[2], (128, 120, 110), {"worn": .2, "broken": .3}.get(p.cond, 0)), 14)
    Bx = ramp(mix(M[2], (40, 40, 44), .5), 14)
    d.rectangle([X0, Y0, X1, Y0 + 7], fill=Bx[1], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Bx[4])   # the roll box
    if e >= 7: d.rectangle([X1 - 16, Y0, X1 - 4, Y0 + 7], fill=(40, 40, 46), outline=OUT)   # the electric motor at its end
    if e >= 6 and p.w >= 2: d.rectangle([X0 + 30, Y0 + 2, X1 - 30, Y0 + 5], fill=Bx[3] if p.w < 4 else p.gold[3])   # the shop's name on it
    for gx in (X0, X1 - 5): d.rectangle([gx, Y0, gx + 5, Y1], fill=STEEL[1], outline=OUT)   # the guides
    if st == "open":
        d.rectangle([X0 + 5, Y0 + 8, X1 - 5, Y1], fill=p.stone[2], outline=OUT)
        for gx in range(X0 + 20, X1 - 5, 20): d.line([gx, Y0 + 9, gx, Y1 - 1], fill=p.stone[0])
        return
    d.rectangle([X0 + 5, Y0 + 7, X1 - 5, Y1 - 1], fill=M[2], outline=OUT)
    if model == "slat":                                                         # wide flat laths
        d.rectangle([X0 + 6, Y0 + 8, X1 - 6, Y1 - 2], fill=M[4])                   # flat laths catch the light
        for gx in range(X0 + 13, X1 - 5, 9): d.line([gx, Y0 + 8, gx, Y1 - 2], fill=M[0]); d.line([gx + 1, Y0 + 8, gx + 1, Y1 - 2], fill=M[3])
    elif model == "grille":                                                     # an open grille: the dark shop seen through it
        d.rectangle([X0 + 6, Y0 + 8, X1 - 6, Y1 - 2], fill=(22, 20, 24))
        for gx in range(X0 + 7, X1 - 5, 5): d.line([gx, Y0 + 8, gx, Y1 - 2], fill=M[3])
        for gy in range(Y0 + 10, Y1 - 2, 4): d.line([X0 + 6, gy, X1 - 6, gy], fill=M[1])
    else:
        for gx in range(X0 + 7, X1 - 5, 3): d.line([gx, Y0 + 8, gx, Y1 - 2], fill=M[3] if (gx // 3) % 2 else M[1])   # narrow ribbed laths
    d.rectangle([X0 + 5, Y1 - 4, X1 - 5, Y1 - 1], fill=M[0], outline=OUT)          # the bottom rail
    for lx in (X0 + 24, X1 - 24): d.rectangle([lx - 3, Y1 - 6, lx + 3, Y1], fill=BRASS[3] if e < 8 else p.lit[1], outline=OUT)   # padlocks
    if e == 7 and p.w <= 1:
        for k in range(3): sx = X0 + 20 + k * 40; d.line([sx, Y0 + 9, sx + 18, Y1 - 3], fill=[(220, 40, 120), (40, 200, 220), (240, 220, 40)][k], width=2)
    if p.worn: scuffs(tm, X0 + 6, Y0 + 8, X1 - 6, Y1 - 2, M, rng, 6)
    if p.broken: d.polygon([(X0 + 40, Y1 - 1), (X0 + 70, Y1 - 1), (X0 + 60, Y0 + 9)], fill=(16, 14, 18))


SHUTTER_PAINT = {"galvanised": None, "white": (214, 212, 204), "green": (56, 104, 66), "blue": (48, 78, 136), "oxide": (128, 58, 42), "grey": (90, 92, 98)}


define("rollershutter", draw=rollershutter, global_from=1837, axes={"material": makes(SHUTTER_PAINT, ["ribbed", "slat", "grille"], ["grey slat"])}, nvar=20, states=("closed", "open"), openable="shutter", mount="wall", front=False, ft=((8, 12), (.85, 1.25)),
       ref="roller shutters of steel laths 8 to 12 ft wide in side guides with the roll box over (Clark and Co. patent 1880s)",
       tags=("shop", "warehouse", "depot"))
