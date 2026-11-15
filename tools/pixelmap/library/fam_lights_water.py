"""Lights, and water, washing and privies (B6346): every census row of the "lights" and "water" families, drawn in
every era it spans, seen from straight above, front toward the south.

Lights have two states, "lit" (a flame or a glowing pane or bulb, its own light warming the thing, and a small glow
for the map in tm.hearths) and "out" (a black wick, dark glass, a grey bulb), and a `light` the game lights them by.
Vessels of water have "full" and "empty". Every drawing honours era, wealth, regional style and condition, and its
own axes (wax, finish, shade, contents), using the shared kit in fam_hearths.py."""
import math

import numpy as np

from px import OUT
from library.core import define, YEAR_END
from library.art import ramp, tone, mix, slab, rivet, knob, box_px, OAK, DEAL, WALNUT, IRON, BRASS, STEEL, WHITE, LINEN, COMPOSITE, GLOW, PLASTIC_WHITE
from library.fam_hearths import (K, reg, LOOKS, pattern, rim, wear, flame, halo, glow_for_map, lit_glass, stone_blob, block, bricks, warm, fire, pot_on,
                                 STONE, BRICK, CLAY, SLATE, CREAM, COPPER, SOOT, ASH, WATER, FIREC, GOLD, SILVER, CHROME, ENAMELS, METALS, LIVERY)

E = YEAR_END
PEWTER = ramp((150, 152, 150), 16, (0, 1, 3))
TIN = ramp((176, 180, 184), 18, (0, 1, 3))
HORN = ramp((206, 170, 110), 14)
WAXES = {"tallow": (226, 210, 160), "beeswax": (224, 190, 100), "white": (240, 238, 228), "red": (180, 50, 44), "green": (90, 140, 90), "black": (50, 46, 50), "blue": (80, 110, 170)}


def holder_metal(k, tint=.4):
    """The holder's stuff (see _holder), tinted toward the region's own dye so each land's piece has its colour."""
    C = _holder(k)
    return ramp(mix(C[2], k.P["acc"], tint), 18) if tint else C


def _holder(k):
    """What a small light's holder is made of: clay or wood for the poor, iron, pewter or tin for the middling, brass,
    silver or gilt for the rich; East Asia bronze or porcelain, South Asia brass, Africa and the Americas clay."""
    f = k.get("finish")
    if f == "clay": return ramp(mix((176, 108, 68), k.P["plaster"], .3), 16)
    if f == "wood": return k.wood
    if f == "painted": return k.acc
    if f == "glazed": return k.tile
    if k.w <= 1:
        return {"africa": CLAY, "americas": CLAY, "southasia": CLAY, "seasia": ramp(k.P["wood"], 16), "oceania": k.wood, "polar": k.stone, "eastasia": ramp((170, 160, 140), 14),
                "islamic": CLAY, "mediterranean": CLAY, "steppe": IRON}.get(k.style, IRON)
    if k.w <= 3:
        return {"central": PEWTER, "atlantic": PEWTER, "northern": IRON, "mediterranean": IRON, "islamic": BRASS, "southasia": BRASS, "eastasia": ramp((150, 110, 60), 20),
                "steppe": ramp((150, 110, 60), 20), "seasia": BRASS, "africa": ramp((150, 110, 60), 20), "americas": TIN, "oceania": k.wood, "polar": k.stone}.get(k.style, PEWTER)
    return GOLD if k.w >= 5 else {"eastasia": ramp((232, 236, 244), 8), "central": SILVER, "atlantic": SILVER, "northern": SILVER}.get(k.style, BRASS)


def lightglow(tm, k, cx, cy, r_body, r_map, col=(255, 214, 130)):
    """A lit light: its own warm halo on its body and a small glow for the map."""
    if k.lit:
        halo(tm, cx, cy, r_body, col, .3); glow_for_map(tm, cx, cy, r_map)


def disc(tm, cx, cy, r, C, out=OUT):
    d = tm.d; cx, cy, r = int(cx), int(cy), max(2, int(r))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=out)
    if r > 3: d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 160, 280, fill=C[4])


def lampmat(tm, k, X0, Y0, X1, Y1):
    """What a small lamp stands on: a board for the poor, a dyed or woven mat, a tile or a brass tray for the
    better off, in the region's colours (it keeps the oil and the wax off the table)."""
    d = tm.d
    if k.w <= 1: C = ramp(mix(k.P["wood"], k.P["acc2"], .5), 14)
    elif k.w <= 3: C = ramp(mix(k.P["acc2"], k.P["tile"], .4), 14)
    else: C = ramp(mix(BRASS[2], k.P["acc"], .35), 16)
    if k.e == 8: C = ramp(mix(k.fd[2], k.P["acc2"], .6), 12)
    d.rounded_rectangle([X0, Y0, X1, Y1], 3, fill=C[2], outline=OUT); d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=C[4])
    if k.w >= 2: d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 2, outline=C[0])


def small_shadow(tm, cx, cy, r, kind="ellipse"):
    tm.shade((cx - r + 2, cy - r + 3, cx + r + 3, cy + r + 3), f=.56, kind=kind)


LIGHT = {"torch": {"dim": 4, "bright": 1, "color": "#ffaa50", "kind": "torch"}, "candle": {"dim": 3, "bright": 1, "color": "#ffc46b", "kind": "candle"},
         "lantern": {"dim": 4, "bright": 1.5, "color": "#ffbb66", "kind": "lantern"}, "lamp": {"dim": 3, "bright": 1, "color": "#ffc46b", "kind": "lamp"}}
LS = ("lit", "out")


# ---------------------------------------------------------------- torch in a sconce
def torch(tm, x, y, w, h, st, v):
    """A torch in an iron sconce on the wall (north), seen from above: the wall plate, the ring that holds it, the
    stick leaning out into the room and its pitch-soaked head, burning or charred. The rich have a brass or gilt
    sconce on a carved plate. From the Modern age a flame-shaped electric bulb on a sconce; in Future Darkness a lit
    rod. The region gives the plate's stone or wood and the sconce's shape."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    M = holder_metal(k) if k.w >= 2 else IRON
    Pl = k.stone if k.style not in ("eastasia", "seasia", "oceania", "northern") else k.wood
    Pl = ramp(mix(Pl[2], k.P["acc"], .5), 14)
    if k.get("finish") in ("painted", "glazed"): Pl = k.acc if k.get("finish") == "painted" else k.tile
    d.rectangle([X0, Y0, X1, Y0 + H_], fill=Pl[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Pl[4])     # the wall plate
    if k.w >= 3: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y0 + H_ - 2], outline=M[3])
    d.line([cx, Y0 + H_ // 3, cx, Y0 + H_ // 2], fill=M[2], width=3)                                                                   # the arm
    if k.e >= 7:
        Cb = ramp(mix((240, 220, 170), k.P["acc"], .2), 10) if k.e == 7 else ramp(k.fdglow, 10)
        d.ellipse([cx - 4, Y0 + H_ // 2 - 2, cx + 4, Y0 + H_ // 2 + 6], fill=(Cb[4] if k.lit else (120, 120, 116)), outline=M[1])
        if k.e == 8: d.line([cx - 5, Y1 - 3, cx + 5, Y1 - 3], fill=Cb[3] if k.lit else COMPOSITE[1], width=2)
        lightglow(tm, k, cx, Y0 + H_ // 2 + 2, 3, 60, (255, 230, 170) if k.e == 7 else k.fdglow)
    else:
        d.ellipse([cx - 4, Y0 + H_ // 2 - 4, cx + 4, Y0 + H_ // 2 + 4], outline=M[3], width=2)                                         # the ring
        d.line([cx, Y0 + H_ // 2 - 2, cx + 1, Y1 - 5], fill=k.wood[2], width=3)                                                         # the stick
        hx, hy = cx + 1, Y1 - 5
        d.ellipse([hx - 3, hy - 3, hx + 3, hy + 2], fill=((60, 40, 30) if k.lit else SOOT[1]), outline=OUT)                             # the head
        if k.lit: flame(tm, hx, hy - 1, 2); halo(tm, hx, hy, 4, (255, 200, 110), .3); glow_for_map(tm, hx, hy, 80)
    wear(tm, k, X0, Y0, X1, Y0 + H_, Pl)


reg("torch", torch, axes={"finish": ["plain", "painted", "glazed", "plain", "wood"]}, states=LS, light=LIGHT["torch"], mount="wall",
    tags=("greathall", "dungeon", "tunnel", "crypt", "guardroom", "bailey", "hall", "nave"), ref="iron torch sconces with a ring about 4 in across on a wall plate, the torch about 2 ft (castle and church fittings)")


# ---------------------------------------------------------------- rushlight holder
def rushlight(tm, x, y, w, h, st, v):
    """A rushlight holder: a round wooden block with an iron upright whose pincer jaws hold a peeled rush dipped in fat,
    burning at its end, and a candle socket on the counterweight. The poor have a split stick for the rush; the
    region gives the wood and the block's carving."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    f = k.get("finish")
    Cw = {"painted": k.acc, "glazed": k.tile, "clay": ramp(mix((176, 108, 68), k.P["plaster"], .5), 16)}.get(f) or ramp(mix(k.P["wood"], k.P["acc2"], .6), 16)
    small_shadow(tm, cx, cy, r); r += 1
    disc(tm, cx, cy, r, Cw)
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=(k.acc if f != "painted" else k.acc2)[1 if k.w < 2 else 3], width=2)   # a carved or painted band
    if k.w >= 2:                                                                                        # the iron upright and jaws
        d.point((cx, cy), fill=IRON[3]); d.line([cx, cy, cx + r - 2, cy - r + 3], fill=IRON[3], width=1)
        d.point((cx - r + 4, cy + 3), fill=IRON[1])                                                    # the candle socket
    else: d.line([cx - 1, cy + 2, cx + 2, cy - 3], fill=k.wood[0], width=2)                             # a split stick
    d.line([cx - r + 2, cy + r - 3, cx + r - 1, cy - r + 1], fill=(220, 206, 150))                         # the rush
    fx, fy = cx + r - 1, cy - r + 1
    flame(tm, fx, fy, 2, k.lit)
    if k.lit: halo(tm, fx, fy, 6, (255, 210, 130), .5); glow_for_map(tm, fx, fy, 40)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, Cw)


reg("rushlight", rushlight, axes={"finish": ["plain", "painted", "clay", "plain", "glazed"]}, states=LS, light={"dim": 2, "bright": .5, "color": "#ffc46b", "kind": "candle"},
    mount="on", tags=("hall", "kitchen", "chamber"), ref="rushlight holders on a turned block 4 to 6 in across (folk museum pieces, 17th to 19th c.)")


# ---------------------------------------------------------------- candle in a holder
def candle(tm, x, y, w, h, st, v):
    """A candle in its holder, seen from above: the holder's dish (clay, iron, pewter, brass, silver, gilt, porcelain
    by wealth and region) with its finger ring, the candle's round top of tallow or beeswax or coloured wax, and the
    wick, burning or black. Lit: a bright flame and its warm light on the dish."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2
    M = holder_metal(k); wax = WAXES[k.get("wax", "tallow")]
    small_shadow(tm, cx, cy, r)
    d.ellipse([cx + r - 2, cy - 2, cx + r + 2, cy + 2], outline=M[1], width=2)                             # the finger ring
    disc(tm, cx - 1, cy, r, M)
    cr = 2
    d.ellipse([cx - 1 - cr, cy - cr, cx - 1 + cr, cy + cr], fill=wax, outline=tone(wax, -60))
    if k.cond == "broken": d.polygon([(cx - 1, cy), (cx + cr, cy + cr + 1), (cx - cr, cy + cr + 1)], fill=tone(wax, -30))   # melted and guttered
    if k.lit: d.point((cx - 1, cy), fill=FIREC[5]); d.point((cx - 1, cy - 1), fill=FIREC[4]); d.point((cx - 2, cy - 1), fill=FIREC[3]); glow_for_map(tm, cx, cy, 40)
    else: d.point((cx - 1, cy), fill=SOOT[0])
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("candle", candle, axes={"wax": ["tallow", "beeswax", "white", "red", "green", "blue", "black"], "finish": ["metal", "clay", "glazed", "metal", "painted"]}, states=LS,
    light=LIGHT["candle"], mount="on", tags=("home", "chamber", "church", "inn"), ref="a candle in its chamberstick, the dish about 5 to 7 in across")


# ---------------------------------------------------------------- candelabrum
def candelabrum(tm, x, y, w, h, st, v):
    """A branched candlestick on a table, seen from above: its foot, the arms reaching out from the stem and a candle in
    each socket. Three branches in a line for the middling, five or seven in a ring for the rich; silver, gilt or
    brass by wealth and region (in East Asia bronze cranes, in South Asia brass lamps with many wicks)."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 2
    M = holder_metal(k); wax = WAXES[k.get("wax", "beeswax")]; n = {3: 3, 4: 5, 5: 7}.get(k.w, 3)
    if k.get("form") == "line": n = 3 if k.w < 5 else 5
    lampmat(tm, k, X0, Y0, X1, Y1)
    disc(tm, cx, cy, r // 2, M)
    if k.rich: pattern(tm, cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3, k, C1=M, step=4, pat="dots")
    pts = []
    if k.get("form") == "line":
        for i in range(n): pts.append((cx - r + 3 + i * (2 * r - 6) / (n - 1), cy))
    else:
        for i in range(n - (1 if n > 3 else 0)): a = -math.pi / 2 + i * 2 * math.pi / (n - (1 if n > 3 else 0)); pts.append((cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3)))
        if n > 3: pts.append((cx, cy))
    for px_, py_ in pts:
        d.line([cx, cy, px_, py_], fill=M[1], width=3); d.line([cx, cy - 1, px_, py_ - 1], fill=M[3])
    for px_, py_ in pts:
        d.ellipse([px_ - 4, py_ - 4, px_ + 4, py_ + 4], fill=M[2], outline=OUT); d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=wax)
        flame(tm, px_, py_, 2, k.lit)
    if k.lit: halo(tm, cx, cy, r // 2, (255, 214, 130), .25); glow_for_map(tm, cx, cy, 70)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("candelabrum", candelabrum, axes={"wax": ["beeswax", "white", "red", "tallow", "green"], "form": ["ring", "line", "ring", "line"]}, states=LS, nvar=16,
    light={"dim": 5, "bright": 2, "color": "#ffc46b", "kind": "candle"}, mount="on", tags=("salon", "greathall", "chancel", "solar", "elysium"),
    ref="candelabra with three to seven branches 12 to 20 in across (silversmiths' pattern books, 18th c.)")


# ---------------------------------------------------------------- floor candle stand
def candlestand(tm, x, y, w, h, st, v):
    """A floor stand for candles, seen from above. A pricket stand: three claw feet, the drip pan and one great candle
    on its spike; a votive stand: a tiered rack of small candles in cups, as before an icon or shrine; an oil-lamp
    stand: a brass dish of wicks on a tall stem (South Asia's deepa, the Islamic world's lamp stand). Iron for the
    church, brass and silver for the rich, lacquer in East Asia."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    M = holder_metal(k) if k.w >= 4 or k.style in ("islamic", "southasia", "eastasia") else IRON
    kind = k.get("kind", "pricket")
    if k.style in ("southasia", "islamic") and kind == "pricket": kind = "lamp"
    small_shadow(tm, cx, cy, r)
    Pb = ramp(mix(k.P["stone"] if k.w < 4 else k.P["wood"], k.P["acc"], .4), 14)
    if kind != "votive":                                                                   # the plinth the stand is fixed to
        d.rounded_rectangle([X0, Y0, X1, Y1], 4, fill=Pb[2], outline=OUT); d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=Pb[4])
        if k.w >= 4: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, k, C1=Pb, step=5)
    if kind == "votive":
        d.rectangle([X0 + 1, Y0 + 3, X1 - 1, Y1 - 3], fill=Pb[2], outline=OUT); d.rectangle([X0 + 3, Y0 + 5, X1 - 3, Y1 - 5], outline=M[3])
        for row in range(3):
            yy = Y0 + 7 + row * (Y1 - Y0 - 10) // 3; d.line([X0 + 2, yy + 5, X1 - 2, yy + 5], fill=M[0])
            for i in range(4):
                xx = X0 + 6 + i * (X1 - X0 - 10) // 4; d.ellipse([xx - 3, yy - 2, xx + 3, yy + 4], fill=(k.acc if k.rich else ramp((200, 60, 50), 14))[2], outline=OUT)
                flame(tm, xx, yy + 1, 1 + (row == 1), k.lit and (i + row) % 3 != 2)
        if k.lit: glow_for_map(tm, cx, cy, 80)
    else:
        for a in (90, 210, 330): ra = math.radians(a); d.line([cx, cy, cx + math.cos(ra) * r, cy + math.sin(ra) * r], fill=M[1], width=4); d.ellipse([cx + math.cos(ra) * r - 3, cy + math.sin(ra) * r - 3, cx + math.cos(ra) * r + 3, cy + math.sin(ra) * r + 3], fill=M[2], outline=OUT)
        pr = r * 2 // 3; disc(tm, cx, cy, pr, M)
        if k.w >= 4: pattern(tm, cx - pr + 3, cy - pr // 3, cx + pr - 3, cy + pr // 3, k, C1=M, step=4)
        if kind == "lamp":
            d.ellipse([cx - pr + 3, cy - pr + 3, cx + pr - 3, cy + pr - 3], fill=(200, 170, 70))
            for i in range(5): a = i * 2 * math.pi / 5; flame(tm, cx + math.cos(a) * (pr - 4), cy + math.sin(a) * (pr - 4), 2, k.lit)
        else:
            wax = WAXES[k.get("wax", "beeswax")]; d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=wax, outline=tone(wax, -50)); flame(tm, cx, cy, 3, k.lit)
        if k.lit: halo(tm, cx, cy, r // 3, (255, 214, 130), .3); glow_for_map(tm, cx, cy, 70)
    wear(tm, k, X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, M)


reg("candlestand", candlestand, axes={"kind": ["pricket", "votive", "lamp", "pricket"], "wax": ["beeswax", "white", "red", "tallow", "green"]}, states=LS, nvar=16,
    light={"dim": 4, "bright": 1.5, "color": "#ffc46b", "kind": "candle"}, tags=("chancel", "nave", "solar", "shrinehall"),
    ref="pricket stands and votive racks about 18 in across (church furnishings)")


# ---------------------------------------------------------------- lantern
def lantern(tm, x, y, w, h, st, v):
    """A hand lantern, seen from above: its cap with vents and the ring handle, the panes showing round the cap's
    edge, glowing when lit. Dark Ages to Renaissance: a horn lantern, tin and amber horn, or a pierced tin lantern
    (light in dots); Age of Reason: a glazed brass or tin lantern; Victorian to Mid-Century: a hurricane lantern, its
    round glass globe in a wire cage, red, green or tin; Modern: a plastic camping lantern; Future Darkness: a lit
    cell. Paper lanterns in East Asia; pierced brass in the Islamic world."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2
    M = holder_metal(k) if k.w >= 2 else TIN
    if k.e >= 4 and k.e <= 6: M = ramp(mix(k.P["acc"], (120, 120, 120), .2), 16) if k.get("finish") != "metal" else ramp(mix(TIN[2], k.P["acc"], .4), 16)
    if k.e == 7: M = ramp(mix((90, 90, 94), k.P["acc"], .6), 14)
    if k.e == 8: M = k.fd if k.w < 3 else ramp(mix(k.fd[2], k.P["acc2"], .4), 12)
    lampmat(tm, k, X0, Y0, X1, Y1); r -= 2
    round_ = k.e >= 4 or k.style in ("eastasia", "seasia", "islamic")
    horn = k.e <= 2 and k.style not in ("islamic",)
    pierced = k.e in (2, 3) and k.get("finish") == "metal"
    if round_: d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=SOOT[2], outline=OUT)
    else: d.rectangle([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=SOOT[2], outline=OUT)
    q = r - 1
    if pierced:
        d.rectangle([cx - q, cy - q, cx + q, cy + q], fill=M[2], outline=OUT)
        for i in range(-q + 2, q - 1, 3):
            for j in (-q + 2, q - 2): d.point((cx + i, cy + j), fill=(FIREC[4] if k.lit else M[0])); d.point((cx + j, cy + i), fill=(FIREC[4] if k.lit else M[0]))
    elif round_:
        d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=((255, 220, 140) if k.lit else (70, 80, 92)), outline=M[1])
        if k.e in (4, 5, 6): d.line([cx - q, cy, cx + q, cy], fill=M[1]); d.line([cx, cy - q, cx, cy + q], fill=M[1])   # the wire guard
    else:
        lit_glass(tm, cx - q, cy - q, cx + q, cy + q, k.lit, frame=M[1], horn=horn)
    cr = r * 2 // 3                                                                                    # the cap and its handle
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=M[2], outline=OUT); d.point((cx - 1, cy - 1), fill=M[4])
    d.arc([cx - cr - 2, cy - cr - 4, cx + cr + 2, cy + cr], 200, 340, fill=M[3])
    if k.rich: d.ellipse([cx - cr + 1, cy - cr + 1, cx + cr - 1, cy + cr - 1], outline=GOLD[3])
    lightglow(tm, k, cx, cy, r // 2 + 1, 60, (255, 214, 130) if k.e < 8 else k.fdglow)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("lantern", lantern, axes={"finish": ["metal", "painted", "metal", "glazed", "clay"]}, states=LS, light=LIGHT["lantern"], mount="on",
    tags=("stable", "barn", "boat", "cellar", "yard", "quay", "camp", "tunnel"), ref="hand lanterns 6 to 9 in across (horn lanterns, pierced tin lanterns, Dietz hurricane lanterns)")


# ---------------------------------------------------------------- oil lamp
def oillamp(tm, x, y, w, h, st, v):
    """An oil lamp, seen from above. Dark Ages to Age of Reason: a clay lamp, an oval body with the filling hole, a
    nozzle with the wick at the front and a handle at the back (in the Islamic world and South Asia often brass;
    in South Asia a diya, a small saucer); in the far north a soapstone lamp, a half-moon dish of oil with its long
    wick; Victorian to Mid-Century: a paraffin lamp, a round foot, the brass burner and the glass chimney inside its
    shade; Modern: a hurricane-style oil lamp; Future Darkness: a sealed fuel cell lamp."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2
    M = holder_metal(k)
    lampmat(tm, k, X0, Y0, X1, Y1); r -= 2
    if k.e <= 3:
        if k.style == "polar":
            d.pieslice([cx - r + 1, cy - r + 3, cx + r - 1, cy + r + 3], 180, 360, fill=k.stone[2], outline=OUT); d.pieslice([cx - r + 4, cy - r + 6, cx + r - 4, cy + r], 180, 360, fill=(190, 170, 80))
            for i in range(3): flame(tm, cx - r + 5 + i * (r - 4), cy + 1, 2, k.lit)
            fx, fy = cx, cy
        elif k.style in ("southasia",) and k.w <= 3:
            disc(tm, cx, cy, r - 2, M); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=(200, 170, 70))
            fx, fy = cx, cy - r + 4; flame(tm, fx, fy, 2, k.lit)
        else:
            d.ellipse([cx - r + 1, cy - r + 3, cx + r - 3, cy + r - 1], fill=M[2], outline=OUT); d.arc([cx - r + 2, cy - r + 4, cx + r - 4, cy + r - 2], 160, 280, fill=M[4])
            d.ellipse([cx - 2, cy - 1, cx + 1, cy + 2], fill=SOOT[1])                                 # the filling hole
            d.polygon([(cx + r - 5, cy - 2), (cx + r, cy - r + 2), (cx + r - 1, cy + 1)], fill=M[2], outline=OUT)   # the nozzle
            d.line([cx - r + 1, cy + r - 3, cx - r - 1, cy + r], fill=M[1], width=2)                    # the handle
            if k.w >= 3: pattern(tm, cx - r + 3, cy - r + 5, cx + r - 5, cy + r - 3, k, C1=M, pat="dots", step=4)
            fx, fy = cx + r - 1, cy - r + 3; flame(tm, fx, fy, 2, k.lit)
    elif k.e <= 6 or k.e == 7:
        Cs = {"glass": ramp(mix((210, 220, 210), k.P["acc"], .5), 10), "painted": k.acc, "glazed": k.tile}.get(k.get("finish"), M)
        disc(tm, cx, cy, r - 1, Cs)                                                                     # the foot or the shade
        if k.w >= 3: pattern(tm, cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3, k, C1=ramp(Cs[4], 8), pat="dots", step=4)
        q = r // 3; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=((255, 226, 150) if k.lit else (160, 170, 176)), outline=(200, 204, 210))   # the chimney
        d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(FIREC[5] if k.lit else SOOT[1]))
        fx, fy = cx, cy
    else:
        if k.w >= 3: d.rectangle([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=k.fd[3], outline=OUT)
        else: disc(tm, cx, cy, r - 1, k.fd)
        d.ellipse([cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3], fill=(k.fdglow if k.lit else k.fd[0]), outline=OUT); fx, fy = cx, cy
    if k.lit: halo(tm, fx, fy, r // 2 + 1, (255, 214, 130), .3); glow_for_map(tm, fx, fy, 50)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("oillamp", oillamp, axes={"finish": ["metal", "clay", "glass", "painted", "glazed"]}, states=LS, light=LIGHT["lamp"], mount="on",
    tags=("home", "chamber", "kitchen", "shop", "shrinehall"), ref="clay lamps 3 to 5 in long; paraffin table lamps with a foot 6 to 9 in across")


# ---------------------------------------------------------------- gas lamp
def gaslamp(tm, x, y, w, h, st, v):
    """A gas lamp on the wall (north), seen from above: the bracket arm with its tap, the frosted or etched globe round
    the mantle, glowing white-gold when lit. The rich have a two-armed bracket in brass with cut-glass globes; the
    region gives the globe's tint and etching and the bracket's metal."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    M = holder_metal(k) if k.w >= 3 else IRON
    tint = {"frosted": (236, 236, 228), "amber": (230, 190, 120), "etched": (220, 230, 236), "green": (170, 210, 170), "rose": (236, 196, 196)}[k.get("globe", "frosted")]
    G = ramp(mix(tint, k.P["acc"], .4), 10)
    Bp = ramp(mix(k.P["plaster"], k.P["acc2"], .45), 12)
    d.rounded_rectangle([X0, Y0, X1, Y0 + H_ // 2], 3, fill=Bp[2], outline=OUT); d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=Bp[4])   # the back plate
    d.rectangle([cx - W_ // 3, Y0, cx + W_ // 3, Y0 + 4], fill=M[2], outline=OUT)                        # the wall rose
    arms = [cx] if k.w < 4 else [X0 + W_ // 4, X1 - W_ // 4]
    for ax in arms:
        gy = Y1 - W_ // 4 - 1; gr = W_ // 4 if len(arms) > 1 else W_ // 3
        d.line([cx, Y0 + 4, ax, gy - gr + 2], fill=M[2], width=2)
        small_shadow(tm, ax, gy, gr)
        d.ellipse([ax - gr, gy - gr, ax + gr, gy + gr], fill=(G[4] if k.lit else G[1]), outline=G[0])
        if k.get("globe") == "etched" or k.rich: d.ellipse([ax - gr + 2, gy - gr + 2, ax + gr - 2, gy + gr - 2], outline=G[2])
        d.ellipse([ax - 2, gy - 2, ax + 2, gy + 2], fill=((255, 250, 220) if k.lit else (200, 200, 190)), outline=(G[2] if k.lit else OUT))   # the mantle
        if k.lit: halo(tm, ax, gy, gr // 2, (255, 240, 190), .3); glow_for_map(tm, ax, gy, 60)
    wear(tm, k, X0, Y0, X1, Y1, M)


reg("gaslamp", gaslamp, axes={"globe": ["frosted", "amber", "etched", "green", "rose"]}, states=LS, mount="wall",
    light={"dim": 5, "bright": 2, "color": "#fff0c0", "kind": "lamp"}, tags=("parlour", "salon", "office", "street", "station", "hall"),
    ref="gas wall brackets with globes 6 to 8 in across standing 8 to 12 in off the wall (Victorian gasfitters' catalogues)")


# ---------------------------------------------------------------- electric lamp
def electriclamp(tm, x, y, w, h, st, v):
    """An electric table or desk lamp, seen from above: the shade (a drum, a cone or a fringed bell in the region's
    cloth or glass; a green glass banker's shade; a chrome dome; a lacquered paper shade in East Asia), the bulb
    showing through its top, white-hot when lit, and the flex. Victorian: fringed silk or glass; Great War and Mid-
    Century: parchment, glass, chrome; Modern: plain fabric or a steel desk lamp; Future Darkness: a ring of light."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    sh = k.get("shade", "drum")
    C = {"drum": ramp(mix(k.P["plaster"], k.P["acc"], .55), 12), "cloth": k.acc, "glass": ramp(mix((90, 150, 100), k.P["tile"], .5), 14), "chrome": ramp(mix(CHROME[2], k.P["acc"], .4), 16), "paper": ramp(mix((236, 228, 206), k.P["acc2"], .45), 8)}[sh]
    if k.e == 8: C = k.fd
    if k.style == "global":
        C = {"drum": ramp(mix(k.P["acc"], (220, 214, 200), .3), 12), "cloth": ramp(k.P["acc"], 14), "glass": ramp(mix((90, 150, 100), k.P["acc"], .3), 14), "chrome": ramp(mix(CHROME[2], k.P["acc"], .5), 16), "paper": ramp((238, 234, 222), 6)}[sh]
        if k.e == 8: C = ramp(mix((40, 44, 52), k.P["acc"], .75), 12)
        if sh == "chrome":                                                                        # an angled desk lamp: base, arm and head
            d.ellipse([X0 + 1, Y1 - 10, X0 + 11, Y1 - 1], fill=C[1], outline=OUT); d.line([X0 + 6, Y1 - 6, cx + 2, Y0 + 6], fill=C[3], width=2)
            d.ellipse([cx - 4, Y0 + 1, X1 - 1, Y0 + 12], fill=C[2], outline=OUT); d.ellipse([cx, Y0 + 4, cx + 6, Y0 + 9], fill=((255, 250, 220) if k.lit else C[0]))
            if k.lit: glow_for_map(tm, cx, cy, 60)
            wear(tm, k, X0, Y0, X1, Y1, C); return
    else: lampmat(tm, k, X0, Y0, X1, Y1)                                                              # the doily or mat under it
    small_shadow(tm, cx, cy, r)
    d.line([cx, cy, X1, Y1], fill=SOOT[2])                                                                # the flex
    if sh == "glass" and k.e <= 6: d.rounded_rectangle([cx - r, cy - r // 2, cx + r, cy + r // 2], 4, fill=C[2], outline=OUT)   # a banker's lamp
    else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT)
    d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 160, 280, fill=C[4])
    if k.w >= 4 and sh in ("drum", "cloth"):                                                               # a fringe and a band
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=GOLD[3])
        pattern(tm, cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2, k, step=4)
    q = max(2, r // 3)
    d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=((255, 250, 220) if k.lit else (130, 130, 126)), outline=(C[1] if k.lit else OUT))   # the bulb through the top
    if k.lit:
        halo(tm, cx, cy, r // 2, (255, 246, 210) if k.e < 8 else k.fdglow, .3); glow_for_map(tm, cx, cy, 60)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, C)


reg("electriclamp", electriclamp, axes={"shade": ["drum", "cloth", "glass", "chrome", "paper"], "livery": ["white", "black", "chrome", "beige", "red", "grey", "blue"]}, states=LS, mount="on", global_from=1990, nvar=26,
    light={"dim": 4, "bright": 2, "color": "#fff2d0", "kind": "switch"}, tags=("home", "parlour", "study", "office", "chamber"),
    ref="table lamp shades 10 to 16 in across (lamp makers' catalogues, 1900 to 2000)")


# ---------------------------------------------------------------- ceiling light
def ceilinglight(tm, x, y, w, h, st, v):
    """A light hung from the ceiling, seen from above (drawn over everything): its ceiling rose and flex, the shade, a
    glass bowl, an enamel dish, a paper globe or a fluorescent tube in its fitting, lit white or out. Victorian: an
    etched glass bowl on chains; Great War and Mid-Century: an enamel dish or an alabaster bowl; Modern: a fabric
    drum or a tube; Future Darkness: a lit ring. The region gives the shade's colour and pattern."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    sh = k.get("shade", "bowl")
    C = {"bowl": ramp(mix((236, 232, 220), k.P["tile"], .5), 10), "enamel": k.enam, "paper": ramp(mix((240, 236, 222), k.P["acc"], .45), 8), "drum": ramp(mix(k.P["plaster"], k.P["acc"], .6), 12), "tube": ramp(mix((220, 222, 226), k.P["acc"], .4), 8)}[sh]
    if k.e == 8: C = k.fd
    if k.style == "global":                                                                       # a maker's fitting in its livery
        C = {"bowl": ramp((226, 230, 232), 8), "enamel": ramp(k.P["acc"], 14), "paper": ramp((240, 238, 230), 6), "drum": ramp(mix(k.P["acc"], (200, 196, 186), .3), 12), "tube": ramp(mix((220, 222, 226), k.P["acc"], .5), 8)}[sh]
        if k.e == 8: C = ramp(mix((40, 44, 52), k.P["acc"], .75), 12)
        Lv = ramp(k.P["acc"], 14); d.ellipse([X0, Y0, X1, Y1], fill=Lv[2], outline=OUT)                 # the maker's trim ring or canopy
        if sh == "drum": d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=C[2], outline=OUT); d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=((255, 250, 230) if k.lit else C[0]))   # a square panel
        elif sh == "enamel":                                                                       # a track of three spots
            d.rectangle([X0 + 1, cy - 2, X1 - 1, cy + 2], fill=C[1], outline=OUT)
            for sx in (X0 + 5, cx, X1 - 5): d.ellipse([sx - 4, cy - 4, sx + 4, cy + 4], fill=C[2], outline=OUT); d.ellipse([sx - 2, cy - 2, sx + 2, cy + 2], fill=((255, 250, 230) if k.lit else C[0]))
        if sh in ("drum", "enamel"):
            if k.lit: glow_for_map(tm, cx, cy, 80)
            wear(tm, k, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, C); return
    else:                                                                                          # the ceiling rose round it, in the house's plasterwork
        Cr = ramp(mix(k.P["plaster"], k.P["acc2"], .5), 12)
        d.ellipse([X0, Y0, X1, Y1], fill=Cr[2], outline=OUT); d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=Cr[4])
    if sh == "tube" and k.e >= 6:
        d.rectangle([X0 + 1, cy - 6, X1 - 1, cy + 6], fill=C[2], outline=OUT)
        for oy in (-3, 3): d.line([X0 + 4, cy + oy, X1 - 4, cy + oy], fill=((255, 255, 240) if k.lit else (170, 176, 180)), width=2)
        if k.lit: glow_for_map(tm, cx, cy, 70)
    else:
        if k.e == 4 or k.rich:
            for a in (30, 150, 270): ra = math.radians(a); d.line([cx, cy, cx + math.cos(ra) * r, cy + math.sin(ra) * r], fill=(BRASS if k.w >= 3 else IRON)[3])   # its chains
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=C[3 if k.lit else 1], outline=OUT); d.arc([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], 160, 280, fill=C[4])
        if sh in ("paper",):
            for q in range(4, r - 3, 4): d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=C[1])
        if k.w >= 3 and sh in ("bowl", "drum", "enamel"): pattern(tm, cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2, k, C1=ramp(C[0], 8), step=5)
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(BRASS if k.w >= 3 else C)[2], outline=OUT)        # the rose and flex
        if k.lit: halo(tm, cx, cy, r // 2, (255, 246, 214) if k.e < 8 else k.fdglow, .3); glow_for_map(tm, cx, cy, 80)
    wear(tm, k, X0 + 3, Y0 + 3, X1 - 3, Y1 - 3, C)


reg("ceilinglight", ceilinglight, axes={"shade": ["bowl", "enamel", "paper", "drum", "tube"], "livery": ["white", "black", "chrome", "beige", "red", "grey", "blue"]}, states=LS, mount="on", global_from=1990, nvar=16,
    light={"dim": 6, "bright": 3, "color": "#fff6e0", "kind": "switch"}, tags=("home", "office", "hall", "shop", "ward", "lab"),
    ref="pendant shades and bowls 12 to 18 in across; fluorescent fittings 2 to 5 ft")


# ---------------------------------------------------------------- chandelier
def chandelier(tm, x, y, w, h, st, v):
    """A chandelier hung over the room, seen from above. Dark Ages and Long Night: a wooden or iron wheel (a corona)
    with candles round its rim; Renaissance: a Dutch brass chandelier, its arms curving out from a great ball;
    Age of Reason: crystal, strings of drops round tiers of candles; Victorian: a gasolier with glass globes; Great
    War and Mid-Century: electric crystal or Art Deco glass; Modern: a designer ring of lamps; Future Darkness: lit
    rings. Islamic lands: pierced brass lanterns in a ring; East Asia: a ring of lacquered lanterns."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = (X1 - X0) // 2 - 2
    M = ramp(mix((GOLD if k.w >= 5 else BRASS)[2], k.P["acc"], .35), 18)
    if k.e <= 1: M = ramp(mix((IRON[3] if k.w < 5 else BRASS[2]), k.P["acc"], .35), 16)
    if k.e == 8: M = k.fd
    n = 8 + 4 * (k.w >= 5) + (4 if k.get("tiers") == "two" else 0)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=M[3], outline=OUT)
    def bulb(px_, py_, s=3):
        if k.e <= 3 or (k.e == 4 and k.get("tiers") == "candles"):
            d.ellipse([px_ - s, py_ - s, px_ + s, py_ + s], fill=M[2], outline=OUT); flame(tm, px_, py_, max(1, s - 1), k.lit)
        else:
            c = ((255, 248, 220) if k.e < 8 else k.fdglow) if k.lit else (150, 150, 146)
            d.ellipse([px_ - s, py_ - s, px_ + s, py_ + s], fill=c, outline=M[1])
    if k.e <= 1:                                                                                         # the wheel
        C = ramp(mix(k.P["wood"], k.P["acc"], .4), 16) if k.w < 5 else M
        d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], outline=OUT, width=12); d.ellipse([cx - R_ + 1, cy - R_ + 1, cx + R_ - 1, cy + R_ - 1], outline=C[2], width=10); d.ellipse([cx - R_ + 2, cy - R_ + 2, cx + R_ - 2, cy + R_ - 2], outline=C[4], width=2)
        for i in range(4): a = i * math.pi / 2 + .4; d.line([cx, cy, cx + math.cos(a) * R_, cy + math.sin(a) * R_], fill=k.acc2[2], width=4)    # the chains, dressed in cloth
        hb = R_ // 4; d.ellipse([cx - hb, cy - hb, cx + hb, cy + hb], fill=k.acc[2], outline=OUT)                                            # the hub
        if k.w >= 5: pattern(tm, cx - R_ // 2, cy - R_ // 2, cx + R_ // 2, cy + R_ // 2, k, C1=M, step=8)
        for i in range(n): a = i * 2 * math.pi / n; bulb(cx + math.cos(a) * (R_ - 2), cy + math.sin(a) * (R_ - 2))
    elif k.e == 8 or (k.e == 7 and k.get("tiers") != "candles"):
        Cg = ramp(mix(k.fdglow, k.P["acc2"], .45), 12) if k.e == 8 else ramp(mix((220, 220, 224), k.P["acc2"], .5), 12)
        Cd = ramp(mix(k.P["acc"], (40, 40, 44) if k.e == 8 else (230, 228, 222), .2), 14)
        d.ellipse([cx - R_ // 2, cy - R_ // 2, cx + R_ // 2, cy + R_ // 2], fill=Cd[2], outline=OUT)                 # the canopy disc
        rings = {"one": (R_,), "two": (R_, int(R_ * .62)), "crystal": (int(R_ * .8),), "candles": (R_, int(R_ * .75))}.get(k.get("tiers"), (R_, int(R_ * .62)))
        if k.get("tiers") == "crystal":                                                                   # a sheet of hanging glass rods
            for gx in range(cx - R_ + 6, cx + R_ - 4, 6):
                for gy in range(cy - R_ + 6, cy + R_ - 4, 6):
                    if (gx - cx) ** 2 + (gy - cy) ** 2 < (R_ - 4) ** 2: d.point((gx, gy), fill=Cg[4] if k.lit else Cg[1])
        for q in rings: d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=OUT, width=7); d.ellipse([cx - q + 1, cy - q + 1, cx + q - 1, cy + q - 1], outline=(Cg[3] if k.lit else Cg[0]), width=5)
        for i in range(n // 2): a = i * 4 * math.pi / n; bulb(cx + math.cos(a) * R_, cy + math.sin(a) * R_, 2)
    else:
        lat = k.style in ("islamic", "eastasia", "southasia") and k.e <= 6
        for i in range(n):                                                                                # the arms curving out
            a = i * 2 * math.pi / n; ex, ey = cx + math.cos(a) * (R_ - 4), cy + math.sin(a) * (R_ - 4)
            mx, my = cx + math.cos(a + .25) * R_ * .6, cy + math.sin(a + .25) * R_ * .6
            d.line([cx, cy, mx, my, ex, ey], fill=M[1], width=5); d.line([cx, cy - 1, mx, my - 1, ex, ey - 1], fill=M[3], width=2)
            if lat: d.rectangle([ex - 5, ey - 5, ex + 5, ey + 5], fill=(k.acc if k.style == "eastasia" else M)[2], outline=OUT); bulb(ex, ey, 2)
            else: d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=k.acc2[2], outline=OUT); bulb(ex, ey)          # the drip pan under each light
        if k.get("tiers") == "two" or k.e >= 3:                                                          # an inner tier
            for i in range(n // 2): a = i * 4 * math.pi / n + .2; bulb(cx + math.cos(a) * R_ * .45, cy + math.sin(a) * R_ * .45, 2)
        if k.e in (3, 5, 6) or k.get("tiers") == "crystal":                                                  # strings of crystal drops
            for i in range(n * 2):
                a = i * math.pi / n; px_, py_ = cx + math.cos(a) * R_ * .75, cy + math.sin(a) * R_ * .75
                d.point((px_, py_), fill=(236, 246, 255)); d.point((px_ + 1, py_), fill=(170, 200, 230))
        bw_ = R_ // 2; Cbw = ramp(mix(M[2], k.P["acc2"], .45), 14)
        d.ellipse([cx - bw_, cy - bw_, cx + bw_, cy + bw_], fill=Cbw[2], outline=OUT); d.arc([cx - bw_ + 1, cy - bw_ + 1, cx + bw_ - 1, cy + bw_ - 1], 160, 280, fill=Cbw[4], width=2)   # the ball or bowl
        pattern(tm, cx - bw_ + 3, cy - bw_ + 3, cx + bw_ - 3, cy + bw_ - 3, k, step=5)
    if k.lit: glow_for_map(tm, cx, cy, 200)
    wear(tm, k, cx - R_, cy - R_, cx + R_, cy + R_, M)


reg("chandelier", chandelier, axes={"tiers": ["one", "two", "crystal", "candles", "one"]}, nvar=26, states=LS, mount="on",
    light={"dim": 8, "bright": 4, "color": "#ffe0a0", "kind": "chandelier"}, tags=("greathall", "salon", "elysium", "nave", "hall", "gallery"),
    ref="chandeliers and coronae 3 to 5 ft across (Dutch brass chandeliers, Georgian crystal, Hildesheim wheel chandelier)")


# ---------------------------------------------------------------- lantern post or street lamp
def lanternpost(tm, x, y, w, h, st, v):
    """A lantern on a post or a street lamp, seen from above (the lamp's top hides the post): Renaissance and Age of
    Reason: a square iron lantern with glass sides on a wooden post with its ladder bar; Victorian: a cast-iron gas
    lamp, a four-sided glass lantern under its crown and the ladder bar crossways; Great War and Mid-Century: an
    electric lamp, an enamel or glass bowl; Modern: a sodium lamp's flat head on its arm, orange; Future Darkness:
    a white-blue LED head. The region gives the paint and the crown's ornament. Lit: the panes glow."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    paint = k.get("paint", "black")
    M = {"black": ramp(mix((50, 52, 58), k.P["acc"], .7), 14), "green": ramp(mix((50, 96, 70), k.P["acc"], .7), 14), "acc": k.acc, "grey": ramp(mix((120, 124, 130), k.P["acc"], .7), 14), "wood": ramp(mix(k.P["wood"], k.P["acc2"], .6), 14)}[paint]
    if k.style == "global": M = ramp({"black": (50, 52, 58), "green": (50, 96, 70), "acc": (196, 198, 200), "grey": (120, 124, 130), "wood": (150, 110, 70)}[paint], 14)
    if k.w >= 4 and k.e <= 6: M = ramp(mix(M[2], BRASS[2], .4), 16)
    small_shadow(tm, cx, cy, r, "rect")
    if k.e <= 4:
        d.line([cx - r, cy + r // 2, cx + r, cy + r // 2], fill=M[1], width=3)                            # the ladder bar
        d.rectangle([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=M[2], outline=OUT)
        lit_glass(tm, cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5, k.lit, frame=M[0], horn=k.e <= 2)
        q = r - 6; Rf = ramp(mix(k.P["acc"], M[2], .15), 14); d.rectangle([cx - q, cy - q, cx + q, cy + q], fill=Rf[2], outline=OUT)                     # the roof, seen from above
        d.line([cx - q, cy - q, cx + q, cy + q], fill=Rf[0]); d.line([cx - q, cy + q, cx + q, cy - q], fill=Rf[0]); d.line([cx - q + 1, cy - q + 1, cx, cy], fill=Rf[4])
        if k.w >= 3: d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(GOLD if k.rich else M)[4])
        pattern(tm, cx - r + 2, cy - r + 2, cx + r - 2, cy - r + 5, k, C1=M, step=4) if k.w >= 3 else None
        col = (255, 214, 130)
    elif k.e <= 6:
        Cb = ramp(mix((236, 232, 220), k.P["acc"], .75), 10) if paint != "acc" else ramp(mix((236, 232, 220), k.P["acc2"], .75), 10)
        d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=Cb[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 160, 280, fill=Cb[4])
        q = r // 2; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=M[2], outline=OUT)
        if k.lit: d.ellipse([cx - r // 2 - 2, cy - r // 2 - 2, cx + r // 2 + 2, cy + r // 2 + 2], outline=(255, 240, 190), width=1)   # the lit glass shows round the reflector
        col = (255, 240, 200)
    else:
        col = (255, 170, 70) if k.e == 7 else k.fdglow
        hd = k.get("head", "cobra")
        if hd == "globe":                                                                          # a post-top globe
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(col if k.lit else (200, 200, 196)), outline=OUT); d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=M[2], outline=OUT)   # the globe under its cap
        elif hd == "twin":                                                                         # two heads on a cross arm
            d.line([cx - r, cy, cx + r, cy], fill=M[1], width=3)
            for hx in (cx - r // 2 - 2, cx + r // 2 + 2): d.rectangle([hx - 5, cy - 7, hx + 5, cy + 7], fill=M[2], outline=OUT); d.rectangle([hx - 3, cy - 4, hx + 3, cy + 4], fill=(col if k.lit else (90, 90, 96)))
        elif hd == "shoebox":                                                                      # a flat box head
            d.rectangle([cx - r, cy - r + 2, cx + r, cy + r - 2], fill=M[2], outline=OUT); d.rectangle([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=(col if k.lit else (90, 90, 96)))
        else:                                                                                      # a cobra head on its arm
            d.line([cx, cy + r, cx, cy - r + 6], fill=M[1], width=3)
            d.rounded_rectangle([cx - r + 1, cy - r, cx + r - 1, cy + 3], 3, fill=M[2], outline=OUT)
            d.rectangle([cx - r // 2, cy - r + 4, cx + r // 2, cy - 2], fill=(col if k.lit else (90, 90, 96)))
    if k.lit: glow_for_map(tm, cx, cy, 90)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("lanternpost", lanternpost, axes={"paint": ["black", "green", "acc", "grey", "wood"], "head": ["cobra", "globe", "shoebox", "twin", "cobra", "globe", "shoebox"]}, states=LS, global_from=1990, nvar=16, eras=(1400, E), group="lights",
    light={"dim": 6, "bright": 2, "color": "#ffbb66", "kind": "lantern"}, tags=("street", "market", "yard", "square", "quay", "park", "platform"),
    ref="street lanterns about a foot across on posts (Augsburg and London lamp posts); lamp heads 1 to 1 1/2 ft")


# ---------------------------------------------------------------- paper lantern
def paperlantern(tm, x, y, w, h, st, v):
    """A paper lantern hung from the eaves or the ceiling, seen from above: a round paper globe stretched on bamboo
    ribs (the rings show from above), its wooden or lacquered cap; red for a feast or a shop, white with black
    characters for a shrine or an inn, yellow or patterned. Lit: the paper glows from within."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    base = {"red": (196, 50, 40), "white": (236, 232, 218), "yellow": (226, 190, 90), "blue": (70, 100, 160), "pattern": (230, 220, 196), "black": (60, 50, 50)}[k.get("colour", "red")]
    P_ = ramp(mix(base, k.P["acc"], .2), 16)
    if k.e == 8: P_ = ramp(mix(base, k.fd[2], .45), 12)
    small_shadow(tm, cx, cy, r)
    shp = k.get("shape", "globe")
    if shp == "box":                                                                              # a square frame lantern (andon)
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=P_[3] if k.lit else P_[1], outline=OUT); d.rectangle([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=k.wood[1])
        d.line([cx - r, cy - r, cx + r, cy + r], fill=k.wood[1]); d.line([cx - r, cy + r, cx + r, cy - r], fill=k.wood[1])
    elif shp == "drum":                                                                           # a tall drum lantern with broad black caps
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=P_[3] if k.lit else P_[1], outline=P_[0]); d.ellipse([cx - r // 2 - 2, cy - r // 2 - 2, cx + r // 2 + 2, cy + r // 2 + 2], fill=SOOT[1], outline=OUT)
    else:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=P_[3] if k.lit else P_[1], outline=P_[0])
        for q in range(3, r - 1, 3): d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=P_[2 if k.lit else 0])                 # the ribs
    if k.get("colour") in ("white", "pattern", "yellow"): d.line([cx + 2, cy - r + 3, cx + 2, cy + r - 3], fill=SOOT[2] if k.get("colour") != "pattern" else k.acc2[2], width=2)   # a character or a band
    cap = k.acc if k.w >= 3 else k.wood
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=cap[2], outline=OUT)
    if k.lit: halo(tm, cx, cy, r // 2, (255, 230, 170), .3); glow_for_map(tm, cx, cy, 60)
    if k.broken: d.polygon([(cx + 1, cy + 1), (cx + r, cy + 2), (cx + r - 2, cy + r - 2)], fill=SOOT[1])                          # a torn panel
    elif k.worn: d.ellipse([cx - r + 2, cy + 1, cx - r + 6, cy + 5], fill=tone(P_[1], -20))


reg("paperlantern", paperlantern, axes={"colour": ["red", "white", "yellow", "blue", "pattern", "black", "red"], "shape": ["globe", "box", "drum"]}, states=LS, nvar=16, mount="on",
    light={"dim": 4, "bright": 1.5, "color": "#ffb070", "kind": "lantern"}, tags=("street", "courtyard", "shrinehall", "taproom"),
    ref="chochin and Chinese paper lanterns 8 to 14 in across")


# ---------------------------------------------------------------- neon sign
def neon(tm, x, y, w, h, st, v):
    """A neon sign on the wall, seen from above: its backing box along the wall and the bent glass tubes on its face
    (shown laid along it so a player sees them), spelling a word or a shape: BAR, HOTEL, OPEN, a cocktail glass, an
    arrow, a heart. Lit: the tubes blaze pink, red, blue or green; out: grey glass. The region gives the colour; the
    rich have more tubes and a chrome frame; the worn flicker with a dead letter."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W_, H_ = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2
    col = {"pink": (255, 80, 170), "red": (255, 60, 60), "blue": (80, 170, 255), "green": (90, 255, 140), "gold": (255, 200, 80)}[k.get("colour", "pink")]
    B = ramp((40, 40, 46) if not k.rich else (60, 62, 70), 10) if k.e < 8 else ramp((30, 34, 44), 10)
    d.rectangle([X0, Y0, X1, Y1], fill=B[2], outline=(CHROME[3] if k.rich else OUT))
    word = k.get("word", "BAR")
    on = col if k.lit else (120, 124, 128)
    glyph = {"B": [(0, 0, 0, 1), (0, 0, 1, 0), (0, .5, 1, .5), (0, 1, 1, 1), (1, 0, 1, 1)], "A": [(0, 1, .5, 0), (.5, 0, 1, 1), (.2, .6, .8, .6)], "R": [(0, 0, 0, 1), (0, 0, 1, 0), (1, 0, 1, .5), (0, .5, 1, .5), (.4, .5, 1, 1)],
             "O": [(0, 0, 1, 0), (1, 0, 1, 1), (0, 1, 1, 1), (0, 0, 0, 1)], "P": [(0, 0, 0, 1), (0, 0, 1, 0), (1, 0, 1, .5), (0, .5, 1, .5)], "E": [(0, 0, 0, 1), (0, 0, 1, 0), (0, .5, .8, .5), (0, 1, 1, 1)],
             "N": [(0, 1, 0, 0), (0, 0, 1, 1), (1, 1, 1, 0)], "H": [(0, 0, 0, 1), (1, 0, 1, 1), (0, .5, 1, .5)], "T": [(0, 0, 1, 0), (.5, 0, .5, 1)], "L": [(0, 0, 0, 1), (0, 1, 1, 1)],
             "I": [(.5, 0, .5, 1)], "X": [(0, 0, 1, 1), (0, 1, 1, 0)], "S": [(1, 0, 0, 0), (0, 0, 0, .5), (0, .5, 1, .5), (1, .5, 1, 1), (1, 1, 0, 1)], "*": [(0, .5, 1, .5), (.5, 0, .5, 1), (0, 0, 1, 1), (0, 1, 1, 0)]}
    n = len(word); gw = (W_ - 8) / n; gh = H_ - 4
    for i, ch in enumerate(word):
        gx0 = X0 + 4 + i * gw + 1; gx1 = gx0 + gw - 3; dead = k.worn and i == 1
        for a, b, c, e in glyph.get(ch, glyph["*"]):
            d.line([gx0 + a * (gx1 - gx0), Y0 + 2 + b * gh, gx0 + c * (gx1 - gx0), Y0 + 2 + e * gh], fill=((110, 110, 116) if dead else on), width=2)
    if k.broken: d.line([X0 + W_ // 2, Y0, X0 + W_ // 2 + 4, Y1], fill=SOOT[0], width=2)
    if k.lit: halo(tm, (X0 + X1) // 2, cy, W_ // 2, col, .25); glow_for_map(tm, (X0 + X1) // 2, Y1, 70)


reg("neon", neon, axes={"colour": ["pink", "red", "blue", "green", "gold"], "word": ["BAR", "HOTEL", "OPEN", "**", "TAXI", "INN", "PHO"]}, states=LS, mount="wall", global_from=1919, nvar=14,
    light={"dim": 3, "bright": 1, "color": "#ff4080", "kind": "switch"}, tags=("street", "taproom", "shop"), ref="projecting and wall neon signs 3 to 6 ft long, 4 to 8 in deep")


# ---------------------------------------------------------------- floodlight
def floodlight(tm, x, y, w, h, st, v):
    """A floodlight on its stand or pole, seen from above: the tripod or base, one to four square lamp heads tilted
    toward the south, their glass faces blazing white when lit. Great War and Mid-Century: a round carbon-arc or
    searchlight drum; Modern: square halogen heads; Future Darkness: LED panels. The region and its owner give the
    paint (army green, safety yellow, grey, the house colour)."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = (X1 - X0) // 2 - 1
    paint = {"green": (70, 90, 60), "yellow": (220, 180, 40), "grey": (130, 134, 140), "black": (50, 50, 56), "white": (226, 226, 222)}[k.get("paint", "grey")]
    M = ramp(paint, 14) if k.e < 8 else ramp(mix((58, 64, 74), paint, .4), 14)
    Bs = ramp(mix((120, 120, 118), paint, .3), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=Bs[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Bs[4])    # the ballast base plate
    for a in (90, 210, 330): ra = math.radians(a); d.line([cx, cy, cx + math.cos(ra) * r, cy + math.sin(ra) * r], fill=M[1], width=3)   # the tripod
    n = 1 + (k.w >= 3) + (k.w >= 4) * 2
    spots = [(cx, cy)] if n == 1 else [(cx - r // 2, cy), (cx + r // 2, cy)] if n == 2 else [(cx - r // 2, cy - r // 2), (cx + r // 2, cy - r // 2), (cx - r // 2, cy + r // 2), (cx + r // 2, cy + r // 2)]
    s = r // 2 if n == 1 else r // 3
    for px_, py_ in spots:
        if k.e <= 6:
            d.ellipse([px_ - s, py_ - s, px_ + s, py_ + s], fill=M[2], outline=OUT); d.ellipse([px_ - s + 2, py_ - s // 3, px_ + s - 2, py_ + s - 1], fill=((250, 250, 236) if k.lit else (90, 100, 110)))
        else:
            d.rectangle([px_ - s, py_ - s, px_ + s, py_ + s], fill=M[2], outline=OUT); d.rectangle([px_ - s + 2, py_ - s // 3, px_ + s - 2, py_ + s - 2], fill=((250, 252, 255) if k.lit else (90, 100, 110)) if k.e < 8 else (k.fdglow if k.lit else k.fd[0]))
            for gy in range(py_ - s + 2, py_ - s // 3, 2): d.line([px_ - s + 2, gy, px_ + s - 2, gy], fill=M[0])     # the cooling fins
    if k.lit: glow_for_map(tm, cx, cy + r, 140, (math.pi / 2, .8))
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, M)


reg("floodlight", floodlight, axes={"paint": ["grey", "green", "yellow", "black", "white"]}, states=LS, global_from=1919, nvar=20,
    light={"dim": 12, "bright": 6, "color": "#f0f4ff", "kind": "switch"}, tags=("depot", "yard", "quay", "control", "bailey"),
    ref="floodlights on tripods and stands, heads 8 to 14 in across, about 1 1/2 ft for the stand")


# ================================================================ water, washing and privies
FE = ("full", "empty")
DRY = ramp((120, 104, 84), 14)


def water(tm, k, x0, y0, x1, y1, full, shape="rect", bottom=None, murk=0.0, tint=None):
    """The water in a vessel, seen from above: full, a still dark surface with a lit glint and a ripple ring; empty, the
    dry or damp bottom with a tide line and a few dregs. murk greens or browns it (a trough, a butt, a cistern)."""
    d = tm.d; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 - x0 < 3 or y1 - y0 < 3: return
    f = d.ellipse if shape == "ellipse" else d.rectangle
    if full:
        Wc = ramp(mix(WATER[2], (70, 96, 50), murk), 14)
        if tint: Wc = ramp(mix(Wc[2], tint, .45), 14)                                      # shallow water shows the vessel through it
        f([x0, y0, x1, y1], fill=Wc[2]); f([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=Wc[1])
        d.line([x0 + (x1 - x0) // 5, y0 + (y1 - y0) // 4, x0 + (x1 - x0) * 2 // 5, y0 + (y1 - y0) // 4], fill=Wc[4], width=2)   # the glint
        if x1 - x0 > 16: d.arc([x0 + (x1 - x0) // 2, y0 + (y1 - y0) // 2, x0 + (x1 - x0) * 3 // 4, y0 + (y1 - y0) * 3 // 4], 200, 340, fill=Wc[3])
    else:
        B = bottom or DRY
        f([x0, y0, x1, y1], fill=B[1]); f([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=B[0])                                     # the tide line
        rng = k.rng
        for _ in range(3): px_, py_ = rng.uniform(x0 + 3, max(x0 + 4, x1 - 4)), rng.uniform(y0 + 3, max(y0 + 4, y1 - 4)); d.point((px_, py_), fill=B[3])


def staves(tm, k, cx, cy, rx, ry, C, hoops=2, H=None, n=14):
    """A coopered vessel from above: the rim of staves round the mouth and its iron or willow hoops."""
    d = tm.d; H = H or IRON
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C[2], outline=OUT)
    for a in np.linspace(0, 2 * math.pi, n, endpoint=False):
        d.line([cx + math.cos(a) * (rx - 4), cy + math.sin(a) * (ry - 4), cx + math.cos(a) * rx, cy + math.sin(a) * ry], fill=C[0])
    for i in range(hoops): q = i * 2; d.ellipse([cx - rx + q, cy - ry + q, cx + rx - q, cy + ry - q], outline=H[1 + (i % 2)])


def vmat(k, plastic=None):
    """What a vessel is made of in its age: wood or clay, then cast iron, zinc and enamel, then plastic in the maker's
    livery or the region's colour, then dark composite."""
    if k.e == 8: return ramp(mix((52, 56, 66), k.P["acc"], .8 if k.style == "global" else .35), 14)
    if k.e == 7: return ramp(plastic or mix((90, 140, 90), k.P["acc"], .5), 14)
    if k.e in (5, 6): return ramp(mix((170, 176, 178), k.P["acc"], .5 if k.style == "global" else .25), 18)   # galvanised zinc, or painted
    return ramp(mix(k.P["wood"], k.P["acc2"], .25), 18)


# ---------------------------------------------------------------- the draw well
def well(tm, x, y, w, h, st, v):
    """A draw well seen from above: a round curb of the region's stone, brick, render or clay round the dark shaft,
    the water a glint far down when full, a dry bottom when empty; over it the winding gear: a windlass on two posts
    with its crank and rope, a sweep pole (shaduf) on a forked post, a pulley on a cross beam, a little roof on posts,
    or nothing but a bucket on the curb. Victorian and later an iron wheel or a cast-iron pump on a slab cap;
    Mid-Century a precast concrete ring; Modern a concrete cap with an electric pump box; Future Darkness a sealed
    dark cap with a lit gauge. The poor have a rough fieldstone ring; the rich a carved curb and a painted canopy."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = min(X1 - X0, Y1 - Y0) // 2 - 2; full = k.lit; top = k.get("top", "windlass")
    Cm, kind = k.mat()
    if k.poor: Cm = ramp(mix(k.P["stone"], (120, 110, 96), .3), 16); kind = "field"
    if k.e in (6, 7): Cm = ramp(mix((176, 172, 164), k.P["acc2"], .2), 10); kind = "concrete"
    if k.e == 8: Cm = ramp(mix((60, 64, 74), k.P["acc"], .3), 12); kind = "composite"
    tm.shade((cx - R + 4, cy - R + 5, cx + R + 6, cy + R + 6), f=.56, kind="ellipse")
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=Cm[2], outline=OUT)
    if kind == "field":
        for i in range(12):
            a = i * math.pi / 6; stone_blob(tm, cx + math.cos(a) * (R - 6), cy + math.sin(a) * (R - 6), 7, 6, Cm, k.rng)
    elif kind in ("brick", "stone", "render", "mud"):
        for a in np.linspace(0, 2 * math.pi, 16 if kind != "render" else 4, endpoint=False):
            d.line([cx + math.cos(a) * (R * .62), cy + math.sin(a) * (R * .62), cx + math.cos(a) * R, cy + math.sin(a) * R], fill=Cm[0])
        if k.rich: pattern(tm, cx - R // 3, cy + R * 2 // 3, cx + R // 3, cy + R - 3, k, step=6)
    elif kind == "concrete":
        d.ellipse([cx - R + 4, cy - R + 4, cx + R - 4, cy + R - 4], outline=Cm[0])
    ri = int(R * .6)
    if k.e >= 7:                                                                                     # the capped well and its pump box
        d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=Cm[3], outline=OUT); d.rectangle([cx - 6, cy - 6, cx + 6, cy + 6], fill=Cm[1], outline=OUT)
        Pb = ramp(LIVERY.get(k.get("paint"), (60, 110, 160)) if k.style == "global" else mix((60, 110, 160), k.P["acc"], .5), 14)
        d.rectangle([cx + ri // 2, cy - ri // 2, cx + ri + 4, cy + ri // 2], fill=Pb[2], outline=OUT)
        if k.e == 8: d.line([cx - ri + 4, cy + ri - 6, cx - 4, cy + ri - 6], fill=k.fdglow if full else k.fd[1], width=2)
        d.line([cx + ri + 4, cy, X1, cy], fill=SOOT[2], width=2)
    else:
        d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(16, 18, 22), outline=OUT)                 # the shaft
        water(tm, k, cx - ri // 2, cy - ri // 2, cx + ri // 2, cy + ri // 2, full, "ellipse", ramp((60, 56, 50), 10))
        Wd = ramp(mix(k.P["wood"], k.P["acc"], .15 if k.w < 3 else .4), 18); M = IRON if k.e >= 4 else Wd
        if top == "windlass" or (top == "wheel" and k.e < 4):
            for px_ in (cx - R + 2, cx + R - 6): d.rectangle([px_, cy - 4, px_ + 5, cy + 4], fill=Wd[1], outline=OUT)   # the posts
            d.rectangle([cx - R + 6, cy - 4, cx + R - 6, cy + 3], fill=Wd[2], outline=OUT); d.line([cx - R + 7, cy - 3, cx + R - 7, cy - 3], fill=Wd[4])  # the drum
            d.line([cx + R - 2, cy, cx + R + 4, cy + 8], fill=M[2], width=3)                                         # the crank
            d.line([cx, cy + 3, cx, cy + ri - 4], fill=(200, 180, 130))
        elif top == "sweep":
            d.line([cx - R - 6, cy + R // 2, cx + R // 3, cy - R // 3], fill=Wd[1], width=5); d.line([cx - R - 6, cy + R // 2 - 1, cx + R // 3, cy - R // 3 - 1], fill=Wd[4])
            stone_blob(tm, cx - R - 4, cy + R // 2 + 2, 7, 6, STONE, k.rng); d.ellipse([cx + R // 3 - 6, cy - R // 3 - 6, cx + R // 3 + 6, cy - R // 3 + 6], fill=Wd[2], outline=OUT)
        elif top == "wheel":                                                                          # an iron wheel and its chain
            d.rectangle([cx - R + 2, cy - 3, cx + R - 2, cy + 3], fill=IRON[2], outline=OUT)
            d.ellipse([cx + R // 3, cy - R // 2, cx + R // 3 + 8, cy + R // 2], fill=IRON[3], outline=OUT)
            for gy in range(cy - R // 2 + 4, cy + R // 2 - 2, 6): d.line([cx + R // 3, gy, cx + R // 3 + 8, gy], fill=IRON[1])
        elif top == "roof":                                                                           # a little roof on posts, its two slopes
            Rf = ramp(mix(k.P["tile"], k.P["acc"], .3), 16) if k.w >= 2 else ramp((170, 150, 100), 14)
            d.polygon([(cx - R + 2, cy - R // 2), (cx + R - 2, cy - R // 2), (cx + R - 2, cy), (cx - R + 2, cy)], fill=Rf[3], outline=OUT)
            d.polygon([(cx - R + 2, cy), (cx + R - 2, cy), (cx + R - 2, cy + R // 2), (cx - R + 2, cy + R // 2)], fill=Rf[1], outline=OUT)
            for gx in range(cx - R + 6, cx + R - 4, 5): d.line([gx, cy - R // 2 + 1, gx, cy + R // 2 - 1], fill=Rf[0])
            if k.rich: pattern(tm, cx - R + 4, cy - R // 2 + 2, cx + R - 4, cy - 3, k, step=6)
        d.ellipse([cx + ri - 2, cy + ri - 6, cx + ri + 10, cy + ri + 6], fill=vmat(k)[2], outline=OUT)        # the bucket on the curb
        if full: d.ellipse([cx + ri + 1, cy + ri - 3, cx + ri + 7, cy + ri + 3], fill=WATER[2])
    wear(tm, k, cx - R, cy - R, cx + R, cy + R, Cm)


reg("well", well, axes={"top": ["windlass", "sweep", "roof", "wheel", "open"], "paint": ["blue", "green", "red", "grey", "white", "black", "yellow"]}, states=FE, clear=2,
    tags=("yard", "farmyard", "square", "courtyard", "bailey"), ref="well curbs 3 to 5 ft across with their windlass posts, about 5 ft in all (village wells; Agricola's De re metallica windlasses)")


# ---------------------------------------------------------------- the pump
def pump(tm, x, y, w, h, st, v):
    """A hand pump in the yard or by the sink, seen from above: its slab or stone (north), the pump (a square wooden
    case in the Age of Reason; a fluted cast-iron column from the Victorian age, painted), the handle swung out to
    one side and the spout over a stone basin, a trough or a bucket at the front. The region gives the slab and the
    paint; the rich have a carved basin and a brass spout; the worn are rusted and the basin cracked."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0
    Cm, _kind = k.mat()
    Cs = ramp(mix(Cm[2], k.P["acc2"], .25), 14)
    d.rectangle([X0, Y0, X1, Y1], fill=Cs[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Cs[4])            # the slab
    paint = {"green": (60, 100, 70), "black": (46, 46, 50), "red": (150, 50, 40), "blue": (60, 90, 140), "grey": (130, 132, 136)}[k.get("paint", "green")]
    M = ramp(mix(paint, k.P["acc"], .35), 14) if k.e >= 4 else ramp(mix(k.P["wood"], k.P["acc"], .3), 16)
    py = Y0 + H_ // 3
    if k.e >= 4:
        d.ellipse([cx - 8, py - 8, cx + 8, py + 8], fill=M[2], outline=OUT); d.ellipse([cx - 4, py - 4, cx + 4, py + 4], fill=M[4], outline=OUT)
        for a in np.linspace(0, 2 * math.pi, 8, endpoint=False): d.point((cx + math.cos(a) * 6, py + math.sin(a) * 6), fill=M[0])   # the fluting
    else:
        d.rectangle([cx - 8, py - 8, cx + 8, py + 8], fill=M[2], outline=OUT); d.line([cx - 7, py - 7, cx + 7, py - 7], fill=M[4])
    side = 1 if k.get("catch") != "bucket" else -1
    d.line([cx, py, cx + side * (W_ // 2 - 2), py - 6], fill=IRON[2] if k.e >= 4 else k.wood[1], width=3)            # the handle
    Sp = BRASS if k.w >= 3 else (IRON if k.e >= 4 else k.wood)
    d.line([cx, py + 8, cx, py + 14], fill=Sp[3], width=4)                                                             # the spout
    catch = k.get("catch", "basin"); by = Y1 - H_ // 4
    if catch == "basin":
        Cb = ramp(mix(k.P["stone"], k.P["acc2"], .2), 14); d.rounded_rectangle([X0 + 3, by - 9, X1 - 3, Y1 - 2], 3, fill=Cb[2], outline=OUT)
        water(tm, k, X0 + 6, by - 6, X1 - 6, Y1 - 5, True, bottom=Cb)
    elif catch == "trough":
        Ct = vmat(k); d.rectangle([X0 + 1, by - 7, X1 - 1, Y1 - 1], fill=Ct[2], outline=OUT); water(tm, k, X0 + 4, by - 4, X1 - 4, Y1 - 4, True, murk=.25)
    else:
        Ck = vmat(k); staves(tm, k, cx, by, 9, 8, Ck, 2); water(tm, k, cx - 6, by - 5, cx + 6, by + 5, True, "ellipse")
    if k.rich: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y0 + 6, k, step=4)
    wear(tm, k, X0, Y0, X1, Y1, Cs)


reg("pump", pump, axes={"paint": ["green", "black", "red", "blue", "grey"], "catch": ["basin", "trough", "bucket", "basin", "trough", "bucket", "basin"]}, clear=1.5,
    tags=("yard", "farmyard", "square", "kitchen"), ref="cast-iron yard pumps on a 2 ft slab with a stone basin under the spout (ironfounders' catalogues, 1850s to 1900s)")


# ---------------------------------------------------------------- the sink
def sink(tm, x, y, w, h, st, v):
    """A sink against the wall, seen from above: the basin (a shallow brown stone slop-stone in the Age of Reason;
    a deep white glazed fireclay sink on brick piers in the Victorian age; enamel with a wooden draining board in the
    Great War; a sink unit with chrome taps at Mid-Century; a stainless steel sink and drainer from the Modern age;
    a dark composite trough in Future Darkness), its taps or pump at the wall (north), the plughole, and what is in
    it: dishes, pots, washing, vegetables or nothing. The region gives the splash-back tiles and the drainer's wood;
    full, the basin holds water; empty, the plughole shows."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; full = k.lit
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56)
    Tl = ramp(mix(k.P["tile"], (236, 232, 222), .2), 16)                                                    # the splash-back along the wall
    d.rectangle([X0, Y0, X1, Y0 + 5], fill=Tl[2], outline=OUT)
    for gx in range(X0 + 6, X1, 6): d.line([gx, Y0 + 1, gx, Y0 + 4], fill=Tl[0])
    if k.e == 3: C = ramp(mix(k.P["stone"], k.P["acc2"], .3), 14)
    elif k.e == 4: C = ramp((236, 234, 226), 8)
    elif k.e in (5, 6): C = ramp(mix((232, 230, 222), k.P["tile"], .25 if k.e == 6 else .1), 10)
    elif k.e == 7: C = ramp(k.P["acc"], 16, (0, 2, 5))
    else: C = ramp(mix((50, 54, 64), k.P["acc"], .5), 12)
    bw = W_ * (5 if k.e >= 5 else 7) // 10 if k.e != 3 else W_ - 4
    bx0, by0, bx1, by1 = X0 + 2, Y0 + 6, X0 + 2 + bw, Y1 - 2
    if k.e >= 5:                                                                                           # the drainer
        Dr = (ramp(mix(k.P["wood"], k.P["acc2"], .2), 18) if k.e <= 6 else C)
        d.rectangle([bx1, Y0 + 6, X1 - 1, Y1 - 2], fill=Dr[2], outline=OUT)
        for gy in range(Y0 + 9, Y1 - 3, 4): d.line([bx1 + 3, gy, X1 - 4, gy], fill=Dr[0])
    elif k.e == 4:                                                                                         # the brick or wooden stand either side
        Ws = ramp(mix(k.P["wood"], k.P["acc2"], .25), 18); d.rectangle([bx1, Y0 + 6, X1 - 1, Y1 - 2], fill=Ws[2], outline=OUT)
        if k.rich: pattern(tm, bx1 + 2, Y0 + 8, X1 - 3, Y1 - 4, k, step=6)
    d.rectangle([bx0, by0, bx1, by1], fill=C[2], outline=OUT); d.line([bx0 + 1, by0 + 1, bx1 - 1, by0 + 1], fill=C[4])
    ix0, iy0, ix1, iy1 = bx0 + 3, by0 + 3, bx1 - 3, by1 - 3
    if k.e >= 6 and k.w >= 4:                                                                              # a double bowl
        d.line([(ix0 + ix1) // 2 + 4, by0, (ix0 + ix1) // 2 + 4, by1], fill=C[4], width=3); d.line([(ix0 + ix1) // 2 + 3, by0, (ix0 + ix1) // 2 + 3, by1], fill=OUT)
    if k.e >= 7 and k.w <= 1: d.rectangle([bx0, by1 - 6, X1 - 1, by1], fill=ramp(mix((200, 180, 150), k.P["acc"], .2), 10)[2], outline=OUT)   # a cheap worktop edge
    if full: water(tm, k, ix0, iy0, ix1, iy1, True)
    else:
        d.rectangle([ix0, iy0, ix1, iy1], fill=C[1]); d.ellipse([(ix0 + ix1) // 2 - 2, iy1 - 6, (ix0 + ix1) // 2 + 2, iy1 - 2], fill=SOOT[0])   # the plughole
    tx = (bx0 + bx1) // 2                                                                                  # the taps or the pump
    if k.e == 3: d.rectangle([tx - 3, Y0, tx + 3, Y0 + 6], fill=IRON[2], outline=OUT); d.line([tx, Y0 + 6, tx, Y0 + 10], fill=IRON[3], width=2)
    else:
        Tp = (BRASS if k.e <= 5 or k.rich else CHROME) if k.e < 8 else ramp(k.fdglow, 10)
        for ox in (-6, 6): knob(tm, tx + ox, Y0 + 4, Tp, 2)
        d.line([tx, Y0 + 3, tx, Y0 + 10], fill=Tp[3], width=2)
    what = k.get("contents", "none")
    mx, my = (ix0 + ix1) // 2, (iy0 + iy1) // 2
    if what == "dishes":
        for i in range(3): d.ellipse([ix0 + 3 + i * 6, my - 5 + i, ix0 + 13 + i * 6, my + 5 + i], fill=(230, 228, 220) if k.e >= 4 else CLAY[3], outline=OUT)
    elif what == "pots": pot_on(tm, mx, my, min(8, (iy1 - iy0) // 2), k, C=(IRON if k.e < 6 else STEEL), contents="lid")
    elif what == "washing":
        Cl = ramp(mix((200, 200, 190), k.P["acc"], .5), 12); d.polygon([(ix0 + 2, my), (mx, iy0 + 2), (ix1 - 2, my + 2), (mx, iy1 - 2)], fill=Cl[2], outline=Cl[0])
    elif what == "veg":
        for i in range(4): d.ellipse([ix0 + 3 + i * 6, my - 3, ix0 + 9 + i * 6, my + 3], fill=[(200, 120, 40), (110, 150, 70), (220, 200, 140), (150, 60, 60)][i], outline=OUT)
    wear(tm, k, bx0, by0, bx1, by1, C)


reg("sink", sink, axes={"contents": ["dishes", "none", "pots", "washing", "veg"], "livery": ["chrome", "white", "black", "beige", "grey", "blue", "red"]}, states=FE, global_from=1990, nvar=22, front=True, clear=2,
    tags=("kitchen", "scullery", "surgery", "lab", "ward"), ref="Belfast and London fireclay sinks 24 to 36 in long, 16 to 20 in deep; sink units with drainers 3 1/2 to 4 ft (Doulton and Twyford catalogues)")


# ---------------------------------------------------------------- the basin and ewer
def basin(tm, x, y, w, h, st, v):
    """A wash basin and its ewer on a stand or table, seen from above: the round basin with its rim, water in it when
    full, and the jug standing in it or beside it, a towel or a cake of soap. Clay for the poor; pewter, tin or brass
    for the middling; painted faience, porcelain or silver for the rich; enamel tin from the Great War; plastic in the
    Modern age; a dark composite bowl in Future Darkness. The region gives the glaze and its painted band."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 1
    full = k.lit; ewer = k.get("ewer", "in")
    if k.e == 8: C = ramp(mix((60, 64, 76), k.P["acc"], .35), 12)
    elif k.e == 7: C = ramp(mix((220, 220, 214), k.P["acc"], .45), 10)
    elif k.e in (5, 6): C = ramp(mix((234, 232, 224), k.P["tile"], .3), 10)
    elif k.w <= 1: C = ramp(mix(CLAY[2], k.P["plaster"], .3), 16)
    elif k.w <= 3: C = holder_metal(k, .35)
    else: C = ramp(mix((236, 234, 228), k.P["tile"], .35), 12)
    small_shadow(tm, cx, cy, r)
    disc(tm, cx, cy, r, C); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=(k.tile if k.w >= 2 else C)[1], width=2)   # the painted band
    q = r - 4
    water(tm, k, cx - q, cy - q, cx + q, cy + q, full, "ellipse", C)
    if ewer in ("in", "beside"):                                                                         # the ewer, its spout and handle
        ex, ey = (cx + 2, cy + 1) if ewer == "in" else (X1 - 5, Y1 - 5); er = max(4, r // 2)
        d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=C[3], outline=OUT); d.ellipse([ex - er // 2, ey - er // 2, ex + er // 2, ey + er // 2], fill=C[0])
        d.line([ex - er, ey, ex - er - 3, ey - 2], fill=C[3], width=2)
    elif ewer == "towel":
        Ct = ramp(mix((236, 232, 220), k.P["acc"], .35), 10); d.rectangle([X0, cy - 3, X1, cy + 4], fill=Ct[2], outline=OUT); d.line([X0, cy + 2, X1, cy + 2], fill=k.acc[2])
    elif ewer == "soap":
        d.rounded_rectangle([cx + q // 2 - 2, cy - 3, cx + q // 2 + 6, cy + 3], 2, fill=(230, 214, 170), outline=OUT)
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, C)


reg("basin", basin, axes={"ewer": ["in", "beside", "towel", "soap", "none"]}, states=FE, nvar=14,
    tags=("chamber", "guestroom", "ablution", "sacristy"), ref="wash basins 12 to 16 in across with their ewers (Staffordshire toilet sets; pewter and brass ewers and basins)")


# ---------------------------------------------------------------- the bathtub
def bathtub(tm, x, y, w, h, st, v):
    """A bath along the wall, seen from above: its rolled rim and deep basin, the taps at the head (west), the plug at
    the foot. Victorian: a cast-iron roll-top on claw feet, its outside painted, brass taps; Great War: a white
    enamelled tub; Mid-Century: a boxed-in bath in a coloured enamel (the region's or the fashion's), chrome taps;
    Modern: an acrylic bath in the maker's colour; Future Darkness: a dark sealed tub with a lit strip. Full, water
    with a glint; empty, the white bottom and the plughole. A duck, a towel, a brush or foam on it."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; full = k.lit; cy = (Y0 + Y1) // 2
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56)
    if k.e == 4: Out = ramp(mix(k.P["acc"], (40, 40, 44), .2), 16); In = ramp((238, 236, 228), 8)
    elif k.e == 5: Out = ramp(mix((232, 230, 222), k.P["acc2"], .55), 12); In = ramp(mix((240, 238, 232), k.P["acc2"], .2), 8)
    elif k.e == 6: Out = ramp(mix(k.P["tile"], (230, 226, 214), .2), 14); In = Out
    elif k.e == 7: Out = ramp(k.P["acc"], 12); In = ramp(mix(k.P["acc"], (240, 240, 236), .5), 8)
    else: Out = ramp(mix((44, 48, 58), k.P["acc"], .45), 12); In = ramp(mix((70, 76, 90), k.P["acc"], .4), 10)
    if k.e == 4:                                                                                             # the claw feet
        for fx, fy in ((X0 + 6, Y0 + 2), (X0 + 6, Y1 - 2), (X1 - 6, Y0 + 2), (X1 - 6, Y1 - 2)): d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=(GOLD if k.rich else BRASS if k.w >= 4 else IRON)[3], outline=OUT)
        d.rounded_rectangle([X0 + 1, Y0 + 2, X1 - 1, Y1 - 2], H_ // 2 - 2, fill=Out[2], outline=OUT)
        if k.rich: pattern(tm, X0 + H_ // 3, Y0 + 3, X1 - H_ // 3, Y0 + 6, k, step=5)
    elif k.style == "global":                                                                     # the bath set in a tiled surround
        Su = ramp(LIVERY.get(k.get("surround"), (230, 230, 226)), 10); d.rectangle([X0, Y0, X1, Y1], fill=Su[2], outline=OUT)
        for gx in range(X0 + 8, X1, 8): d.line([gx, Y0 + 1, gx, Y1 - 1], fill=Su[0])
        d.rounded_rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], 6, fill=Out[2], outline=OUT)
    elif k.e == 6 and k.w >= 3: Tl = k.tile; d.rectangle([X0, Y0, X1, Y1], fill=Tl[2], outline=OUT); pattern(tm, X0 + 1, Y0 + 1, X1 - 1, Y0 + 5, k, step=4)   # the tiled box
    else: d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=Out[2], outline=OUT)
    ix0, iy0, ix1, iy1 = X0 + 6, Y0 + 6, X1 - 6, Y1 - 6
    d.rounded_rectangle([ix0, iy0, ix1, iy1], (iy1 - iy0) // 2, fill=In[1], outline=Out[0])
    if full: water(tm, k, ix0 + 2, iy0 + 2, ix1 - 2, iy1 - 2, True, "ellipse", tint=Out[2])
    else: d.ellipse([ix1 - 12, cy - 2, ix1 - 8, cy + 2], fill=SOOT[0])
    if k.e == 8: d.line([ix0, iy1 + 2, ix1, iy1 + 2], fill=k.fdglow if full else k.fd[1], width=2)
    Tp = BRASS if k.e <= 5 else (CHROME if k.e < 8 else ramp(k.fdglow, 10))
    for oy in (-5, 5): knob(tm, X0 + 3, cy + oy, Tp, 2)
    d.line([X0 + 2, cy, X0 + 8, cy], fill=Tp[3], width=3)
    x_ = k.get("extras", "none")
    if x_ == "duck": d.ellipse([ix0 + 14, cy - 4, ix0 + 22, cy + 4], fill=(240, 200, 40), outline=OUT); d.point((ix0 + 13, cy), fill=(230, 120, 30))
    elif x_ == "towel": Ct = ramp(mix((236, 232, 220), k.P["acc2"], .5), 10); d.rectangle([X0 + W_ // 2, Y0, X0 + W_ // 2 + 12, Y1], fill=Ct[2], outline=OUT)
    elif x_ == "brush": d.line([ix0 + 6, iy0 + 4, ix0 + 26, iy0 + 10], fill=k.wood[2], width=3); d.ellipse([ix0 + 22, iy0 + 6, ix0 + 30, iy0 + 13], fill=k.wood[1], outline=OUT)
    elif x_ == "foam" and full:
        for i in range(8): px_, py_ = ix0 + 8 + i * (ix1 - ix0 - 16) // 8, cy + (i % 3 - 1) * 4; d.ellipse([px_ - 4, py_ - 3, px_ + 4, py_ + 3], fill=(244, 246, 248), outline=(200, 210, 220))
    wear(tm, k, X0, Y0, X1, Y1, Out)


reg("bathtub", bathtub, axes={"extras": ["duck", "none", "towel", "foam", "brush"], "livery": ["white", "beige", "blue", "green", "grey", "black", "red"], "surround": ["white", "grey", "beige", "black", "blue"]}, states=FE, global_from=1990, nvar=22, front=True, clear=2.5,
    tags=("bathroom", "chamber"), ref="baths 5 to 6 ft long and 2 1/2 ft wide (cast-iron roll-top baths, Shanks and Doulton catalogues, 1880s to 1930s)")


# ---------------------------------------------------------------- the wash tub
def washtub(tm, x, y, w, h, st, v):
    """A wash tub on the floor or a bench, seen from above: an oval coopered tub of staves and hoops (a clay or copper
    basin in the south and east; a woven-and-pitched tub in the steppe), from the Great War a ribbed zinc bath, from
    the Modern age a plastic one; the washboard leaning in it and the wash under the suds: shirts, sheets, wool, a
    child's clothes. Full, soapy water; empty, the wet bottom and a cake of soap."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    rx, ry = (X1 - X0) // 2 - 1, (Y1 - Y0) // 2 - 1; full = k.lit
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56, kind="ellipse")
    C = vmat(k, LIVERY.get(k.get("livery")) if k.style == "global" else None)
    if k.style == "global" and k.e in (5, 6): C = ramp(mix((170, 176, 178), LIVERY.get(k.get("livery"), (120, 124, 130)), .5), 16)   # zinc, or enamelled in the maker's colour
    if k.e <= 4 and k.style in ("southasia", "seasia", "africa", "americas"): C = ramp(mix(CLAY[2], k.P["acc2"], .3), 16)
    if k.e <= 4 and k.rich: C = ramp(mix(COPPER[2], k.P["acc"], .2), 18)
    if k.e <= 4 and C not in (COPPER,) and k.style not in ("southasia", "seasia", "africa", "americas"): staves(tm, k, cx, cy, rx, ry, C, 2, n=18)
    else:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C[2], outline=OUT); d.ellipse([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], outline=C[4])
        if k.e in (5, 6):
            for i in range(3): q = 5 + i * 3; d.ellipse([cx - rx + q, cy - ry + q, cx + rx - q, cy + ry - q], outline=C[1])
    for hx in (cx - rx + 2, cx + rx - 2): d.rectangle([hx - 3, cy - 4, hx + 3, cy + 4], fill=C[1], outline=OUT)        # the lugs
    ix0, iy0, ix1, iy1 = cx - rx + 6, cy - ry + 6, cx + rx - 6, cy + ry - 6
    if full:
        water(tm, k, ix0, iy0, ix1, iy1, True, "ellipse", tint=C[2])
        Cl = ramp(mix((220, 214, 196), k.P["acc"], .55), 12) if k.style != "global" else ramp(LIVERY.get(k.get("cloth"), (220, 214, 196)), 12)
        load = k.get("load", "shirts")
        if load != "none": d.polygon([(ix0 + 6, cy + 2), (cx - 4, iy0 + 4), (cx + 10, cy - 2), (cx + 4, iy1 - 4)], fill=Cl[2], outline=Cl[0])
        if load == "sheets": d.polygon([(cx, cy), (ix1 - 4, cy - 6), (ix1 - 6, cy + 8)], fill=(236, 234, 226), outline=OUT)
        for i in range(6): bx, by = ix0 + 4 + i * (ix1 - ix0) // 6, cy + (i % 2) * 6 - 3; d.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(246, 248, 250))   # suds
    else:
        water(tm, k, ix0, iy0, ix1, iy1, False, "ellipse", C)
        d.rounded_rectangle([cx - 4, cy - 3, cx + 4, cy + 3], 2, fill=(226, 210, 160), outline=OUT)
    if k.get("board", "yes") == "yes":                                                                                # the washboard leaning in it
        Bd = k.wood if k.e < 5 else ramp((180, 184, 186), 14)
        d.rectangle([cx + rx // 3, cy - ry + 2, cx + rx // 3 + 12, cy + 2], fill=Bd[2], outline=OUT)
        for gy in range(cy - ry + 5, cy, 3): d.line([cx + rx // 3 + 2, gy, cx + rx // 3 + 10, gy], fill=Bd[0])
    wear(tm, k, cx - rx, cy - ry, cx + rx, cy + ry, C)


reg("washtub", washtub, axes={"load": ["shirts", "sheets", "none", "shirts", "wool"], "board": ["yes", "no", "yes"], "livery": ["blue", "grey", "red", "green", "white", "black", "yellow"], "cloth": ["white", "blue", "red", "yellow", "black"]}, states=FE, global_from=1902, nvar=22, clear=1.5,
    tags=("kitchen", "yard", "scullery"), ref="oval wash tubs 2 1/2 to 3 ft long (coopers' wash tubs; galvanised zinc baths, 1900s)")


# ---------------------------------------------------------------- the privy
def privy(tm, x, y, w, h, st, v):
    """A privy, an earth closet over its pit, seen from above: its little roof (thatch, bark or reed in the Dark Ages
    and Long Night; plank, shingle or the region's tiles from the Renaissance; corrugated iron in the Great War and
    after; a plastic portable cabin with its vent from the Modern age; a dark sealed pod in Future Darkness), the door
    on the south with its cut-out and the path. In the south and east a screen of matting round a squat pit; the poor
    have a patched roof and a sack for a door; the worn lean and gap."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    tm.shade((X0 + 4, Y0 + 5, X1 + 6, Y1 + 6), f=.5)
    roof = k.get("roof", "plank")
    if k.e <= 1: roof = {"plank": "thatch", "tile": "bark", "tin": "reed"}.get(roof, roof)
    if k.e in (5, 6) and roof == "tile": roof = "tin"
    if k.e >= 7: roof = "cabin"
    C = {"thatch": ramp((176, 150, 90), 16), "bark": ramp((110, 80, 56), 18), "reed": ramp((190, 170, 110), 14), "plank": ramp(mix(k.P["wood"], k.P["acc2"], .25), 18),
         "tile": k.tile, "tin": ramp(mix((160, 166, 170), k.P["acc"], .2), 18), "mat": ramp(mix((196, 170, 110), k.P["acc2"], .3), 14),
         "cabin": ramp(LIVERY.get(k.get("livery"), (60, 110, 160)) if k.style == "global" else mix((60, 120, 90), k.P["acc"], .5), 14)}[roof]
    if k.e == 8: C = ramp(mix((48, 52, 62), k.P["acc"], .4), 12)
    if k.style != "global" and roof not in ("tile",): C = ramp(mix(C[2], k.P["wood"] if roof in ("plank", "bark") else k.P["plaster"], .45), 16)   # the local stuff
    d.rectangle([X0, Y0, X1, Y1 - 6], fill=C[2], outline=OUT)
    if roof in ("thatch", "reed"):
        for gx in range(X0 + 2, X1 - 1, 3): d.line([gx, Y0 + 1, gx + k.rng.integers(-1, 2), Y1 - 8], fill=C[k.rng.integers(0, 2)])
    elif roof in ("plank", "bark"):
        for gx in range(X0 + 7, X1, 8): d.line([gx, Y0 + 1, gx, Y1 - 7], fill=C[0])
    elif roof == "tile":
        for gy in range(Y0 + 5, Y1 - 6, 5): d.line([X0 + 1, gy, X1 - 1, gy], fill=C[0])
        for gx in range(X0 + 4, X1, 7): d.line([gx, Y0 + 1, gx, Y1 - 7], fill=C[1])
    elif roof in ("tin", "cabin"):
        for gx in range(X0 + 3, X1, 4): d.line([gx, Y0 + 1, gx, Y1 - 7], fill=C[3 if gx % 8 else 1])
        if roof == "cabin":
            Rc = ramp(LIVERY.get(k.get("roofcol"), (236, 236, 230)), 10); d.rectangle([X0 + 3, Y0 + 3, X1 - 3, (Y0 + Y1) // 2], fill=Rc[2], outline=OUT)   # the translucent roof
            d.ellipse([cx - 4, Y0 + 4, cx + 4, Y0 + 12], fill=C[0], outline=OUT)
    elif roof == "mat":
        for gx in range(X0 + 2, X1, 5):
            for gy in range(Y0 + 2, Y1 - 7, 5): d.point((gx + (gy // 5) % 2 * 2, gy), fill=C[0])
    d.line([X0 + 1, (Y0 + Y1 - 6) // 2, X1 - 1, (Y0 + Y1 - 6) // 2], fill=C[4])                                          # the ridge
    Dr = ramp(mix(k.P["wood"], k.P["acc"], .6 if k.w >= 2 else .25), 16) if k.e < 7 else ramp(mix(C[2], (236, 236, 230), .6), 10)                              # the door on the south
    if k.poor and k.e < 7: Dr = ramp((150, 130, 96), 12)
    d.rectangle([X0 + 2, Y1 - 9, X1 - 2, Y1], fill=Dr[2], outline=OUT)
    if k.e < 7 and not k.poor: d.ellipse([cx - 2, Y1 - 5, cx + 2, Y1 - 2], fill=SOOT[0])                                # the cut-out
    if k.rich: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y0 + 6, k, step=5)
    wear(tm, k, X0, Y0, X1, Y1 - 6, C)


reg("privy", privy, axes={"roof": ["plank", "tile", "tin", "thatch", "mat"], "livery": ["blue", "green", "grey", "orange", "white", "red", "black"], "roofcol": ["white", "grey", "beige", "blue", "green"]}, global_from=1990, nvar=22, clear=2,
    tags=("privy", "yard"), ref="earth closets and outhouses about 3 by 4 ft (rural privies; Moule's earth closet, 1860s)")


# ---------------------------------------------------------------- the toilet
def toilet(tm, x, y, w, h, st, v):
    """A flush toilet against the wall, seen from above: the cistern on the wall (north; high on the wall with its
    pull chain in the Victorian age, low and close from the Great War), the pan with its seat and lid, open or shut.
    In East and South Asia, the Islamic world and South-East Asia a squat pan set in the floor with its foot treads
    and a water jug or a hose. Modern: the maker's white or coloured suite; Future Darkness: a sealed dark unit with a
    lit button. The rich have a mahogany seat and a painted pan; the worn are stained and the seat cracked."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    squat = k.style in ("eastasia", "southasia", "islamic", "seasia") or k.get("kind") == "squat"
    P = ramp((240, 238, 232), 8) if k.style != "global" else ramp(mix((240, 238, 232), k.P["acc"], .6), 10)
    if k.e == 8: P = ramp(mix((56, 60, 72), k.P["acc"], .4), 12)
    if k.e == 6 and k.style != "global": P = ramp(mix((236, 232, 222), k.P["tile"], .45), 10)
    if squat:
        Fl = ramp(mix(k.P["tile"], (220, 216, 206), .3), 14)
        d.rectangle([X0, Y0, X1, Y1], fill=Fl[2], outline=OUT)
        for gy in range(Y0 + 8, Y1, 8): d.line([X0 + 1, gy, X1 - 1, gy], fill=Fl[0])
        d.rounded_rectangle([cx - W_ // 3, Y0 + H_ // 4, cx + W_ // 3, Y1 - 4], W_ // 3, fill=P[2], outline=OUT)
        d.ellipse([cx - W_ // 6, Y0 + H_ // 3, cx + W_ // 6, Y0 + H_ * 2 // 3], fill=WATER[1] if k.e < 8 else P[0])
        for ox in (-W_ // 3 - 2, W_ // 3 - 4): d.rectangle([cx + ox, Y0 + H_ // 2, cx + ox + 6, Y0 + H_ // 2 + 10], fill=P[3], outline=OUT)   # the treads
        Jg = ramp(mix(BRASS[2], k.P["acc"], .3), 16) if k.w >= 3 else ramp(mix((90, 150, 200), k.P["acc"], .4), 14)
        d.ellipse([X1 - 9, Y0 + 2, X1 - 1, Y0 + 10], fill=Jg[2], outline=OUT)
    else:
        if k.style != "global":                                                                   # a pedestal mat or the boards round it
            Mt = ramp(mix(k.P["acc2"], k.P["tile"], .3), 14) if k.w >= 2 else ramp(mix(k.P["wood"], (120, 100, 80), .3), 16)
            d.rounded_rectangle([X0, Y0 + H_ // 3, X1, Y1], 4, fill=Mt[2], outline=OUT)
        ch = Y0 + (6 if k.e <= 4 else 9)
        d.rectangle([cx - W_ // 2 + 1, Y0, cx + W_ // 2 - 1, ch], fill=(P if k.e != 4 else ramp(mix(k.P["wood"], k.P["acc"], .2), 16))[2], outline=OUT)   # the cistern
        if k.e == 4: d.line([cx + W_ // 3, ch, cx + W_ // 3, ch + 8], fill=IRON[2]); d.ellipse([cx + W_ // 3 - 2, ch + 7, cx + W_ // 3 + 2, ch + 11], fill=k.wood[3], outline=OUT)
        d.ellipse([cx - W_ // 2 + 2, ch + 2, cx + W_ // 2 - 2, Y1 - 1], fill=P[2], outline=OUT)
        if k.e == 4 and k.w >= 2: d.ellipse([cx - W_ // 2 + 3, ch + 3, cx + W_ // 2 - 3, Y1 - 2], outline=k.acc[2], width=3)   # a transfer-printed pan
        seat = k.get("seat", "down")
        Ss = (ramp(mix((120, 70, 40), k.P["wood"], .5), 18) if k.e <= 5 and k.w >= 3 else ramp(mix((30, 30, 32) if k.e <= 6 else (240, 240, 236), k.P["acc"], .6), 12))
        if seat == "lid": d.ellipse([cx - W_ // 2 + 3, ch + 3, cx + W_ // 2 - 3, Y1 - 2], fill=Ss[2], outline=OUT)
        else:
            d.ellipse([cx - W_ // 2 + 3, ch + 3, cx + W_ // 2 - 3, Y1 - 2], fill=Ss[2] if seat == "down" else P[3], outline=OUT)
            d.ellipse([cx - W_ // 4, ch + 8, cx + W_ // 4, Y1 - 6], fill=WATER[2] if k.e < 8 else P[0], outline=OUT)
        if k.e == 8: d.ellipse([cx - 2, Y0 + 2, cx + 2, Y0 + 6], fill=k.fdglow)
    wear(tm, k, X0, Y0, X1, Y1, P)


reg("toilet", toilet, axes={"seat": ["down", "lid", "up", "down", "lid"], "kind": ["pedestal", "squat", "pedestal", "pedestal", "squat"], "livery": ["white", "beige", "grey", "black", "blue", "green", "red"]},
    global_from=1990, nvar=22, front=True, clear=2, tags=("privy", "bathroom"),
    ref="water closets about 15 by 28 in with their cisterns (Twyford's Unitas, 1880s; Thomas Crapper catalogues)")


# ---------------------------------------------------------------- the chamber pot
def chamberpot(tm, x, y, w, h, st, v):
    """A chamber pot under the bed, seen from above: the round pot with its broad rim and handle, a lid or a cloth
    over it or open (full, a dull yellow; empty, the clean glaze). Clay for the poor; pewter or tin for the middling;
    painted faience or porcelain with a band for the rich; white enamel with a blue rim from the Great War."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 1
    full = k.lit
    if k.e == 5: C = ramp((236, 236, 230), 8); B = ramp(mix((50, 80, 150), k.P["acc"], .8), 14)
    elif k.e == 6: C = ramp(mix((236, 236, 230), k.P["acc2"], .5), 12); B = ramp(mix((40, 40, 44), k.P["acc"], .5), 14)
    elif k.w <= 1: C = ramp(mix(CLAY[2], k.P["plaster"], .35), 16); B = ramp(mix(CLAY[1], k.P["acc2"], .4), 14)
    elif k.w <= 3: C = holder_metal(k, .4); B = C
    else: C = ramp(mix((236, 234, 226), k.P["tile"], .3), 10); B = k.acc
    small_shadow(tm, cx, cy, r)
    d.line([cx + r - 2, cy, X1, cy], fill=C[1], width=3)                                                        # the handle
    disc(tm, cx, cy, r, C); d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=B[2], width=3)
    lid = k.get("lid", "none"); q = r - 4
    if lid == "lid": d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=C[3], outline=OUT); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=B[2], outline=OUT)
    elif lid == "cloth": Ct = ramp(mix((226, 220, 200), k.P["acc2"], .45), 10); d.polygon([(cx - r, cy - 2), (cx, cy - r), (cx + r, cy + 2), (cx, cy + r)], fill=Ct[2], outline=Ct[0])
    else: d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=((176, 160, 70) if full else C[1]), outline=C[0])
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, C)


reg("chamberpot", chamberpot, axes={"lid": ["none", "lid", "cloth", "none", "lid"]}, states=FE, nvar=14,
    tags=("chamber", "guestroom", "cell"), ref="chamber pots 8 to 10 in across (Staffordshire and pewter chamber pots)")


# ---------------------------------------------------------------- the washing line
def washline(tm, x, y, w, h, st, v):
    """A washing line strung between two posts across the yard, seen from above: the posts at the ends, the line and
    its prop, and what hangs on it, pegged: shirts and shifts, sheets, small clothes and clouts, a row of the same, or
    nothing. Cloth is undyed or the region's own dyes (wealth gives more and stronger colours). Dark Ages to Age of
    Reason: forked wooden posts and a hemp rope, the wash laid over it; Victorian on: pegs; Mid-Century: iron T-posts
    and wire; Modern: a plastic line and coloured pegs; Future Darkness: a dark cable from a lit post. The worn line
    sags and a garment has fallen."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W_, H_ = X1 - X0, Y1 - Y0; cy = Y0 + H_ // 4
    Pc = (ramp(mix(k.P["wood"], k.P["acc"], .5 if k.w >= 2 else .2), 16) if k.e <= 5 else ramp(mix((120, 124, 128), k.P["acc"], .2), 14)) if k.e < 8 else ramp(mix((50, 54, 64), k.P["acc"], .4), 12)
    for px_ in (X0 + 5, X1 - 5):                                                                           # the posts and their cross-trees
        d.rectangle([px_ - 2, Y0 + 2, px_ + 2, Y1 - 2], fill=Pc[1], outline=OUT)
        d.ellipse([px_ - 4, cy - 4, px_ + 4, cy + 4], fill=Pc[2], outline=OUT)
        if k.e == 8: d.point((px_, cy), fill=k.fdglow)
    sag = 3 if k.worn else 1
    Ln = (220, 200, 150) if k.e <= 3 else ((210, 210, 206) if k.e < 8 else (40, 44, 52))
    d.line([X0 + 6, cy, (X0 + X1) // 2, cy + sag, X1 - 6, cy], fill=Ln, width=1 if k.e >= 5 else 2)
    load = k.get("load", "mixed")
    if load == "none":                                                                                      # nothing on it yet: the basket waits under it
        Bk = ramp(mix((190, 160, 100), k.P["acc"], .35), 16) if k.e < 7 else ramp(mix((200, 200, 196), k.P["acc"], .6), 12)
        bx = (X0 + X1) // 2; d.rounded_rectangle([bx - 22, Y0 + H_ // 3, bx + 22, Y1 - 2], 5, fill=Bk[2], outline=OUT)
        for gx in range(bx - 19, bx + 20, 4): d.line([gx, Y0 + H_ // 3 + 2, gx, Y1 - 4], fill=Bk[0])
        d.rectangle([bx - 16, Y0 + H_ // 3 + 4, bx + 16, Y1 - 6], fill=ramp(mix((226, 220, 200), k.P["acc2"], .3), 10)[2])
        wear(tm, k, X0, Y0, X1, Y1, Pc); return
    dyes = [mix((214, 204, 180), k.P["plaster"], .5), mix((200, 190, 168), k.P["wood"], .4)]
    if k.w >= 1: dyes += [k.P["acc2"]]
    if k.w >= 2: dyes += [k.P["acc"], mix(k.P["acc"], (240, 236, 226), .4)]
    if k.w >= 4: dyes += [k.P["tile"], mix(k.P["acc2"], (30, 30, 40), .3)]
    gx = X0 + 10; i = 0
    while gx < X1 - 16:
        kind = {"mixed": ["shirt", "sheet", "small", "shirt", "small"][i % 5], "sheets": "sheet", "shirts": "shirt", "small": "small"}[load]
        gw = {"sheet": 34, "shirt": 18, "small": 10}[kind]; gh = {"sheet": H_ * 3 // 4 - 2, "shirt": H_ * 3 // 5, "small": H_ // 2}[kind]
        if gx + gw > X1 - 8: break
        col = dyes[(i * 3 + k.w) % len(dyes)] if kind != "sheet" else (mix((236, 234, 226), k.P["acc2"], .25) if k.w >= 2 else mix((210, 200, 176), k.P["plaster"], .4))
        C = ramp(col, 12)
        if not (k.broken and i == 2):
            d.rectangle([gx, cy - 1, gx + gw, cy - 1 + gh], fill=C[2], outline=OUT); d.line([gx + 1, cy, gx + gw - 1, cy], fill=C[4])
            if kind == "shirt": d.rectangle([gx - 3, cy, gx + 2, cy + gh // 2], fill=C[1], outline=OUT); d.rectangle([gx + gw - 2, cy, gx + gw + 3, cy + gh // 2], fill=C[1], outline=OUT)
            if k.e >= 4:                                                                                    # the pegs
                Pg = ramp(LIVERY[["red", "blue", "yellow", "green"][i % 4]], 10) if k.e >= 7 else k.wood
                for px_ in (gx + 2, gx + gw - 2): d.rectangle([px_ - 1, cy - 3, px_ + 1, cy + 1], fill=Pg[3])
        else:
            d.rectangle([gx, cy + gh // 2, gx + gw, cy + gh], fill=C[1], outline=OUT)                         # fallen in the dirt
        gx += gw + 6; i += 1
    if k.e <= 5 and W_ > 120: d.line([(X0 + X1) // 2, cy + sag, (X0 + X1) // 2 + 6, Y1 - 2], fill=k.wood[1], width=2)   # the prop
    wear(tm, k, X0, Y0, X1, Y1, Pc)


reg("washline", washline, axes={"load": ["mixed", "sheets", "shirts", "small", "none"]}, clear=1,
    tags=("yard", "garden", "alley"), ref="clothes lines 10 to 20 ft between posts or a prop and two hooks (cottage yards)")


# ---------------------------------------------------------------- the water trough
def trough(tm, x, y, w, h, st, v):
    """A long water trough for beasts, seen from above: a hollowed log or a plank box in the Dark Ages and Long Night;
    a dressed stone trough from the Renaissance (or the region's brick and render); a cast-iron one in the Victorian
    age; galvanised steel in the Great War and Mid-Century; plastic or concrete from the Modern age; a dark composite
    tank in Future Darkness. Full, green-brown water with weed, a skin of ice or straw on it; empty, the mucky bottom.
    The rich have a carved front and a spout; the worn are cracked and mossy."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; full = k.lit
    tm.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 4), f=.56)
    if k.e <= 1: C = ramp(mix(k.P["wood"], (110, 90, 64), .2), 18) if k.w <= 1 else ramp(mix(k.P["stone"], k.P["acc2"], .2), 16)
    elif k.e <= 3: C, _k = k.mat(); C = ramp(mix(C[2], k.P["stone"], .3), 16)
    elif k.e == 4: C = ramp(mix(IRON[3], k.P["acc"], .6), 14)
    elif k.e in (5, 6): C = ramp(mix((170, 176, 178), k.P["acc"], .55), 16)
    elif k.e == 7: C = ramp(mix((60, 70, 64), k.P["acc"], .6), 14) if k.w <= 1 else ramp(mix((176, 172, 164), k.P["acc2"], .55), 10)
    else: C = ramp(mix((50, 54, 64), k.P["acc"], .6), 12)
    rim_ = 4 if k.e <= 3 else 2
    if k.e <= 1 and k.w <= 1: d.rounded_rectangle([X0, Y0, X1, Y1], H_ // 2, fill=C[2], outline=OUT)                    # the log
    else: d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
    d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=C[4])
    if k.e <= 1 and k.w <= 1:
        for gx in range(X0 + 10, X1 - 6, 14): d.arc([gx - 6, Y0 + 1, gx + 6, Y0 + 7], 200, 340, fill=C[0])
    ix0, iy0, ix1, iy1 = X0 + rim_ + 1, Y0 + rim_ + 1, X1 - rim_ - 1, Y1 - rim_ - 1
    edge = k.get("edge", "none")
    water(tm, k, ix0, iy0, ix1, iy1, full, "rect", ramp((90, 80, 60), 12), murk=.35 if edge != "ice" else 0, tint=C[2])
    if full and edge == "ice": d.rectangle([ix0, iy0, ix1, iy1], fill=(206, 222, 230)); d.line([ix0 + 4, iy0 + 3, ix1 - 8, iy1 - 2], fill=(160, 186, 200))
    elif full and edge == "straw":
        for i in range(10): sx = ix0 + 3 + (i * 37) % max(4, ix1 - ix0 - 6); d.line([sx, iy0 + 2 + i % 3, sx + 6, iy0 + 4 + i % 4], fill=(214, 190, 110))
    elif full and edge == "weed":
        for i in range(6): sx = ix0 + 4 + (i * 29) % max(4, ix1 - ix0 - 8); d.ellipse([sx, iy1 - 5, sx + 6, iy1 - 1], fill=(80, 120, 50))
    if k.rich and k.e >= 2: pattern(tm, X0 + 6, Y1 - rim_, X1 - 6, Y1, k, step=4)
    if k.get("spout") == "yes" or k.rich:
        Sp = BRASS if k.w >= 3 else IRON; d.line([X0 + W_ // 6, Y0 - 2, X0 + W_ // 6, Y0 + 5], fill=Sp[3], width=3)
    wear(tm, k, X0, Y0, X1, Y1, C)


reg("trough", trough, axes={"edge": ["none", "weed", "ice", "straw", "none"], "spout": ["no", "yes", "no"]}, states=FE, clear=1.5, nvar=16,
    tags=("farmyard", "stable", "street", "square", "pen"), ref="horse and cattle troughs 5 to 8 ft long and about 2 ft wide (granite and cast-iron troughs; Metropolitan Drinking Fountain and Cattle Trough Association, 1860s)")


# ---------------------------------------------------------------- the water butt
def butt(tm, x, y, w, h, st, v):
    """A water butt under the downpipe, seen from above: a coopered barrel with its hoops (a great clay jar in the
    south and east and the Mediterranean; a hide or wicker bin in the steppe), from the Great War a galvanised tank,
    from the Modern age a plastic butt with its lid and tap in the maker's green or black, in Future Darkness a dark
    sealed drum with a lit level. Full, dark water with leaves; empty, the damp bottom. A board, a lid or a dipper."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 1
    full = k.lit; jar = k.e <= 4 and k.style in ("mediterranean", "islamic", "southasia", "eastasia", "seasia", "africa", "americas")
    tm.shade((cx - r + 3, cy - r + 4, cx + r + 4, cy + r + 4), f=.56, kind="ellipse")
    if jar: C = ramp(mix(CLAY[2], k.P["tile"] if k.w >= 3 else k.P["plaster"], .35), 16)
    else: C = vmat(k, LIVERY.get(k.get("livery")) if k.style == "global" else None)
    if jar:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 160, 280, fill=C[4], width=2)
        if k.w >= 2: d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=k.acc[1], width=2)
        q = r * 2 // 3
    else:
        if k.e <= 4: staves(tm, k, cx, cy, r, r, C, 2)
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT)
            for i in range(2 if k.e in (5, 6) else 1): q_ = 3 + i * 4; d.ellipse([cx - r + q_, cy - r + q_, cx + r - q_, cy + r - q_], outline=C[1])
        q = r - 6
    top = k.get("cover", "open")
    if top == "lid" or (k.e >= 7 and top != "open"):
        d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=C[3], outline=OUT); d.line([cx - q + 3, cy, cx + q - 3, cy], fill=C[1], width=2)
        if k.e >= 7 and top == "board": d.rectangle([cx - q // 2, cy - q // 2, cx + q // 2, cy + q // 2], fill=C[1], outline=OUT)   # a square hatch in the lid
        if k.e >= 7 and top == "dipper":                                                                   # a downpipe diverter and its hose
            d.rectangle([cx - 4, cy - r, cx + 4, cy - q // 2], fill=(120, 124, 128), outline=OUT); d.arc([cx - q // 2, cy - q // 3, cx + q // 2, cy + q * 2 // 3], 0, 300, fill=(40, 120, 60), width=3)
    else:
        water(tm, k, cx - q, cy - q, cx + q, cy + q, full, "ellipse", C, murk=.3)
        if k.e >= 7:                                                                                         # the leaf mesh over the mouth
            for g in range(cx - q + 3, cx + q - 2, 4): d.line([g, cy - q + 3, g, cy + q - 3], fill=C[1])
        if full:
            for i in range(3): a = i * 2.1 + .5; d.ellipse([cx + math.cos(a) * q / 2 - 2, cy + math.sin(a) * q / 2 - 1, cx + math.cos(a) * q / 2 + 2, cy + math.sin(a) * q / 2 + 2], fill=(170, 130, 60))   # leaves
        if top == "board": Bd = k.wood; d.rectangle([cx - q, cy - 4, cx + q, cy + 4], fill=Bd[2], outline=OUT)
        if top == "dipper": d.ellipse([cx + 2, cy - 6, cx + 12, cy + 4], fill=(k.wood if k.e < 5 else TIN)[3], outline=OUT); d.line([cx + 12, cy - 1, cx + r, cy + 6], fill=k.wood[2], width=2)
    if k.e == 8: d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 300, 360, fill=k.fdglow if full else k.fd[1], width=2)
    if k.e >= 5: knob(tm, cx, cy + r - 2, BRASS if k.e < 7 else CHROME, 2)                                  # the tap
    wear(tm, k, cx - r, cy - r, cx + r, cy + r, C)


reg("butt", butt, axes={"cover": ["open", "lid", "board", "dipper", "open"], "livery": ["green", "black", "grey", "blue", "beige", "red", "white"]}, states=FE, global_from=1902, nvar=22, clear=1,
    tags=("yard", "garden", "farmyard", "alley"), ref="rain-water butts of 40 to 100 gallons, about 2 to 3 ft across (coopered butts; galvanised tanks)")


# ---------------------------------------------------------------- the fountain
def fountain(tm, x, y, w, h, st, v):
    """A fountain in a square, a cloister or a garden, seen from above: its basin (round, eight-sided, square or
    four-lobed) with a broad lit rim of the region's stone, the pool, and in the middle the pillar or bowl the water
    springs from, falling in rings. The Islamic world: a star-shaped basin lined with glazed tile and a low jet; East
    Asia: a rough stone basin fed by a bamboo pipe; the Mediterranean and Europe: a carved column and upper bowl, a
    figure on top for the rich. Victorian: cast iron, painted; Mid-Century and Modern: concrete or steel with jets;
    Future Darkness: a dark basin with lit jets. Full, rippling water; empty, a dry stained basin and leaves."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = min(X1 - X0, Y1 - Y0) // 2 - 1; full = k.lit; shp = k.get("basin", "round")
    Cs = ramp(mix(k.P["stone"], k.P["acc2"], .2), 16)
    if k.e == 4 and k.w <= 4: Cs = ramp(mix(IRON[3], k.P["acc"], .45), 14)
    if k.e in (6, 7): Cs = ramp(mix((196, 192, 182), k.P["acc2"], .5), 12)
    if k.e == 8: Cs = ramp(mix((52, 56, 68), k.P["acc"], .55), 12)
    if k.w >= 5 and k.e < 8: Cs = ramp(mix((232, 228, 220), k.P["stone"], .3), 10)                        # marble
    if k.style == "islamic" and k.e <= 6: shp = "star"
    if k.style == "eastasia" and k.e <= 6: shp = "rough"
    def outline(q):
        if shp == "round" or shp == "rough": return [(cx + math.cos(a) * q, cy + math.sin(a) * q) for a in np.linspace(0, 2 * math.pi, 32, endpoint=False)]
        if shp == "octagon": return [(cx + math.cos(a) * q, cy + math.sin(a) * q) for a in np.linspace(math.pi / 8, 2 * math.pi + math.pi / 8, 8, endpoint=False)]
        if shp == "square": return [(cx - q * .86, cy - q * .86), (cx + q * .86, cy - q * .86), (cx + q * .86, cy + q * .86), (cx - q * .86, cy + q * .86)]
        if shp == "quatrefoil": return [(cx + math.cos(a) * q * (.82 + .18 * abs(math.cos(2 * a))), cy + math.sin(a) * q * (.82 + .18 * abs(math.cos(2 * a)))) for a in np.linspace(0, 2 * math.pi, 48, endpoint=False)]
        return [(cx + math.cos(a) * q * (1 if i % 2 == 0 else .78), cy + math.sin(a) * q * (1 if i % 2 == 0 else .78)) for i, a in enumerate(np.linspace(0, 2 * math.pi, 16, endpoint=False))]   # a star
    tm.shade((cx - R + 4, cy - R + 5, cx + R + 6, cy + R + 6), f=.6, kind="ellipse")
    d.polygon(outline(R), fill=Cs[2], outline=OUT)
    if shp == "rough":
        for i in range(10): a = i * .63; stone_blob(tm, cx + math.cos(a) * (R - 8), cy + math.sin(a) * (R - 8), 9, 7, Cs, k.rng)
    inner = outline(R - 9)
    if shp == "star" or k.w >= 4:                                                                        # a tiled lining or a carved inner rim
        Tl = ramp(mix(k.P["tile"], (236, 232, 222), .15), 16); d.polygon(outline(R - 6), fill=Tl[2], outline=OUT)
        pattern(tm, cx - R // 2, cy + R - 14, cx + R // 2, cy + R - 8, k, step=5)
    Lw = mix(k.P["tile"], k.P["acc"], .3) if k.w >= 2 else k.P["stone"]                                     # the lining shows through the water
    Wf = ramp(mix(WATER[2], Lw, .5), 14)
    d.polygon(inner, fill=(Wf[2] if full else DRY[1]), outline=OUT)
    if full:
        for q in range(8, R - 12, 9): d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=Wf[3])
        d.line([cx - R // 2, cy - R // 2 + 4, cx - R // 4, cy - R // 2 + 2], fill=WATER[4], width=2)
    else:
        for i in range(6): a = i * 1.1; d.ellipse([cx + math.cos(a) * R * .5 - 2, cy + math.sin(a) * R * .5 - 1, cx + math.cos(a) * R * .5 + 3, cy + math.sin(a) * R * .5 + 2], fill=(150, 110, 50))
    piece = k.get("piece", "column")
    if shp == "rough":                                                                                   # the bamboo spout
        d.line([cx + R - 2, cy - R // 2, cx + 4, cy - 2], fill=(150, 170, 90), width=5); d.line([cx + R - 2, cy - R // 2 - 1, cx + 4, cy - 3], fill=(200, 210, 130))
    elif piece == "column" or k.rich:
        Cc = Cs if k.e != 8 else ramp(k.fdglow, 10)
        d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=Cc[2], outline=OUT); d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=Cc[3], outline=OUT)
        if k.rich: d.ellipse([cx - 4, cy - 6, cx + 4, cy + 4], fill=(GOLD if k.w >= 5 else Cs)[4], outline=OUT)        # the figure
    elif piece == "bowl":
        d.ellipse([cx - R // 3, cy - R // 3, cx + R // 3, cy + R // 3], fill=Cs[3], outline=OUT); d.ellipse([cx - R // 3 + 4, cy - R // 3 + 4, cx + R // 3 - 4, cy + R // 3 - 4], fill=WATER[2] if full else DRY[1])
    elif piece == "jets":
        for a in np.linspace(0, 2 * math.pi, 6, endpoint=False): d.ellipse([cx + math.cos(a) * R * .4 - 2, cy + math.sin(a) * R * .4 - 2, cx + math.cos(a) * R * .4 + 2, cy + math.sin(a) * R * .4 + 2], fill=(k.fdglow if k.e == 8 else (230, 240, 250)) if full else Cs[0])
    if full and shp != "rough": d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(236, 244, 250))
    wear(tm, k, cx - R, cy - R, cx + R, cy + R, Cs)


reg("fountain", fountain, axes={"basin": ["round", "octagon", "square", "quatrefoil", "round"], "piece": ["column", "bowl", "jets", "column", "bowl"]}, states=FE, nvar=16, clear=2,
    tags=("square", "courtyard", "park", "cloister", "garden"), ref="town and cloister fountains with basins 6 to 10 ft across (Italian piazza fountains; cloister lavabos)")


# ---------------------------------------------------------------- the ablution fountain
def ablutionbasin(tm, x, y, w, h, st, v):
    """An ablution fountain (shadirvan) in a mosque's court, seen from above: an eight-sided pavilion (its domed or
    pyramid roof of lead or tile, or open under a canopy), the water basin within, a ring of taps round its sides,
    each with its low stone seat and drain, the paving round it. Dark Ages to Age of Reason: marble and tile with
    bronze taps; Victorian to Mid-Century: brass taps and painted wood; Modern: steel taps and stone cladding;
    Future Darkness: dark stone and lit taps. Full, the drains run; empty, dry."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = min(X1 - X0, Y1 - Y0) // 2 - 1; full = k.lit
    glz = {"blue": (40, 100, 170), "green": (40, 130, 90), "turquoise": (40, 160, 170), "white": (230, 230, 222), "red": (170, 50, 40), "yellow": (210, 170, 50), "black": (40, 40, 46)}[k.get("tiles", "blue")]
    Pv = ramp(mix(mix(k.P["stone"], (236, 230, 216), .3), glz, .25 if k.w >= 3 else .1), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=Pv[2], outline=OUT)                                                 # the paving, with a tiled border for the rich
    for g in range(X0 + 12, X1, 12): d.line([g, Y0 + 1, g, Y1 - 1], fill=Pv[1])
    for g in range(Y0 + 12, Y1, 12): d.line([X0 + 1, g, X1 - 1, g], fill=Pv[1])
    oct_ = lambda q: [(cx + math.cos(a) * q, cy + math.sin(a) * q) for a in np.linspace(math.pi / 8, 2 * math.pi + math.pi / 8, 8, endpoint=False)]
    glaze = {"blue": (40, 100, 170), "green": (40, 130, 90), "turquoise": (40, 160, 170), "white": (230, 230, 222), "red": (170, 50, 40), "yellow": (210, 170, 50), "black": (40, 40, 46)}[k.get("tiles", "blue")]
    Tl = ramp(glaze, 16); Mt = BRASS if k.e < 7 else (CHROME if k.e == 7 else ramp(k.fdglow, 10))
    if k.e == 8: Tl = ramp(mix((50, 54, 66), glaze, .45), 14)
    for i, (px_, py_) in enumerate(oct_(R - 6)):                                                          # the seats and drains
        d.ellipse([px_ - 6, py_ - 6, px_ + 6, py_ + 6], fill=Pv[3], outline=OUT)
        if full: d.point((px_, py_), fill=WATER[3])
    d.polygon(oct_(R - 14), fill=Tl[2], outline=OUT)
    for i, (px_, py_) in enumerate(oct_(R - 14)): knob(tm, int(px_), int(py_), Mt, 2)                   # the taps
    pav = k.get("pavilion", "dome")
    if pav == "open":
        d.polygon(oct_(R - 20), fill=(WATER[2] if full else DRY[1]), outline=OUT); pattern(tm, cx - 8, cy - 8, cx + 8, cy + 8, k, step=4)
    elif pav == "canopy":
        Cn = ramp(mix(k.P["wood"], k.P["acc"], .3), 16); d.polygon(oct_(R - 12), fill=Cn[2], outline=OUT)
        for px_, py_ in oct_(R - 12): d.line([cx, cy, px_, py_], fill=Cn[0])
    elif pav == "tiled":
        d.polygon(oct_(R - 12), fill=Tl[3], outline=OUT); pattern(tm, cx - R // 2, cy - R // 2, cx + R // 2, cy + R // 2, k, C1=Tl, step=7)
    else:
        Ld = ramp((150, 156, 160), 14) if pav == "dome" else ramp(mix(k.P["tile"], (90, 60, 50), .3), 16)
        d.ellipse([cx - R + 12, cy - R + 12, cx + R - 12, cy + R - 12], fill=Ld[2], outline=OUT); d.arc([cx - R + 14, cy - R + 14, cx + R - 14, cy + R - 14], 150, 290, fill=Ld[4], width=3)
        for px_, py_ in oct_(R - 12): d.line([cx, cy, px_, py_], fill=Ld[1])
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(GOLD if k.w >= 4 else Ld)[3], outline=OUT)   # the finial
    wear(tm, k, X0, Y0, X1, Y1, Pv)


reg("ablutionbasin", ablutionbasin, axes={"pavilion": ["dome", "open", "canopy", "tiled", "pyramid"], "tiles": ["blue", "green", "turquoise", "white", "red", "yellow", "black"]}, states=FE, nvar=28, clear=2,
    tags=("ablution", "courtyard"), ref="shadirvan ablution fountains 6 to 9 ft across with their ring of taps (Ottoman mosque courts)")


# ---------------------------------------------------------------- the ritual bath
def mikveh(tm, x, y, w, h, st, v):
    """A ritual bath (mikveh), seen from above: a deep rectangular pool cut in the floor, its stairs going down
    along one side, the stone or tile lining, the rim and the rail, the channel from the rain cistern (the bor) at
    the head. Dark Ages to Age of Reason: dressed stone, the steps worn; Victorian: tiled; Mid-Century: tile and
    a steel rail; Modern: mosaic and lights in the walls; Future Darkness: dark stone and a lit edge. The region gives
    the stone and its tile; full, still water over the lower steps; empty, the dry steps to the bottom."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W_, H_ = X1 - X0, Y1 - Y0; full = k.lit
    lining = k.get("lining", "stone")
    Cl = {"stone": ramp(mix(k.P["stone"], k.P["acc2"], .2), 16), "tile": ramp(mix(k.P["tile"], (236, 232, 222), .2), 16), "plaster": ramp(mix(k.P["plaster"], k.P["acc"], .25), 12),
          "marble": ramp(mix((232, 228, 220), k.P["stone"], .3), 10), "mosaic": ramp(mix(k.P["acc"], (230, 230, 230), .3), 16)}[lining]
    if k.e <= 3 and lining in ("tile", "mosaic"): Cl = ramp(mix(k.P["stone"], k.P["tile"], .35), 16)
    if k.e == 8: Cl = ramp(mix((50, 54, 66), k.P["acc"], .35), 12)
    Fl = ramp(mix(Cl[2], (200, 196, 186), .3), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=Fl[2], outline=OUT)                                                  # the floor round it
    px0, py0, px1, py1 = X0 + 8, Y0 + 8, X1 - 8, Y1 - 8
    d.rectangle([px0, py0, px1, py1], fill=Cl[1], outline=OUT)
    side = k.get("steps", "west"); n = 6
    if side in ("west", "east"):
        sw = (px1 - px0) // 2 // n
        for i in range(n):
            sx = px0 + i * sw if side == "west" else px1 - (i + 1) * sw
            d.rectangle([sx, py0, sx + sw, py1], fill=Cl[4 - min(4, i * 4 // n)], outline=Cl[0])
        wx0, wx1 = (px0 + n * sw, px1) if side == "west" else (px0, px1 - n * sw)
        wy0, wy1 = py0, py1
    else:
        sh = (py1 - py0) // 2 // n
        for i in range(n): d.rectangle([px0, py0 + i * sh, px1, py0 + (i + 1) * sh], fill=Cl[4 - min(4, i * 4 // n)], outline=Cl[0])
        wx0, wx1, wy0, wy1 = px0, px1, py0 + n * sh, py1
    water(tm, k, wx0 + 1, wy0 + 1, wx1 - 1, wy1 - 1, full, bottom=Cl, tint=Cl[2])
    if k.e >= 4:                                                                                             # the hand rail
        Rl = BRASS if k.e < 6 else (CHROME if k.e < 8 else ramp(k.fdglow, 10)); d.line([px0 + 2, py0 - 3, px0 + (px1 - px0) // 2, py0 - 3], fill=Rl[3], width=2)
    d.rectangle([X1 - 22, Y0 + 1, X1 - 8, Y0 + 7], fill=(WATER[1] if full else DRY[1]), outline=OUT)        # the channel from the cistern
    if k.e == 7: 
        for gx in range(px0 + 10, px1 - 4, 20): d.ellipse([gx - 2, py1 - 4, gx + 2, py1], fill=(255, 250, 220) if full else (140, 140, 140))
    if k.e == 8: d.rectangle([px0, py0, px1, py1], outline=k.fdglow if full else k.fd[1])
    if k.w >= 4: pattern(tm, X0 + 2, Y0 + 2, X1 - 2, Y0 + 7, k, step=5)
    wear(tm, k, X0, Y0, X1, Y1, Cl)


reg("mikveh", mikveh, axes={"lining": ["stone", "tile", "plaster", "marble", "mosaic"], "steps": ["west", "north", "east", "west", "north"]}, states=FE, clear=1,
    tags=("mikveh",), ref="mikva'ot pools about 4 by 6 ft holding at least 40 se'ah, with their stairs (Speyer and Worms mikva'ot, 12th century)")


# ---------------------------------------------------------------- the cistern or rain tank
def cistern(tm, x, y, w, h, st, v):
    """A cistern or rain tank, seen from above. Dark Ages to Age of Reason: a vaulted stone or brick cistern under
    the yard, all that shows its well-head and the stone cover over the vault, the gutter channels running to it;
    Victorian to Mid-Century: a round corrugated-iron rain tank on a stand, its lid and tap; Modern: a plastic tank
    in the maker's colour; Future Darkness: a dark sealed tank with a lit gauge. In the Islamic world and the
    Mediterranean a domed, whitewashed cistern; in Africa a clay or mortar jar. Full or empty shows at the hatch."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    R = min(X1 - X0, Y1 - Y0) // 2 - 1; full = k.lit; cover = k.get("cover", "slab")
    if k.e <= 3:
        Cm, kind = k.mat()
        if k.style in ("islamic", "mediterranean"):                                                        # the whitewashed dome
            Wh = ramp(mix((240, 236, 226), k.P["plaster"], .3), 8); d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=Wh[2], outline=OUT); d.arc([cx - R + 3, cy - R + 3, cx + R - 3, cy + R - 3], 150, 290, fill=Wh[4], width=3)
            Cm = Wh
        else:
            d.rectangle([X0, Y0, X1, Y1], fill=Cm[2], outline=OUT)
            if kind == "brick": bricks(tm, X0 + 1, Y0 + 1, X1 - 1, Y1 - 1, Cm, 12, 6)
            else:
                for g in range(X0 + 14, X1, 14): d.line([g, Y0 + 1, g, Y1 - 1], fill=Cm[0])
        hr = R // 3
        if cover == "grate": d.rectangle([cx - hr, cy - hr, cx + hr, cy + hr], fill=SOOT[0], outline=OUT); water(tm, k, cx - hr + 3, cy - hr + 3, cx + hr - 3, cy + hr - 3, full)
        else:
            Cv = ramp(mix(k.P["stone"], k.P["acc2"], .25), 14) if cover == "slab" else k.wood
            d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=Cv[2], outline=OUT); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=IRON[2])
        for gy in (Y0 + 6, Y1 - 6): d.line([X0 + 2, gy, cx - hr, gy], fill=Cm[0], width=3)                 # the gutters running in
        Cw = Cm
    else:
        C = ramp(mix((170, 176, 180), k.P["acc"], .3), 18) if k.e <= 6 else (ramp(LIVERY.get(k.get("livery"), (60, 100, 70)) if k.style == "global" else mix((60, 100, 70), k.P["acc"], .4), 14) if k.e == 7 else ramp(mix((50, 54, 66), k.P["acc"], .75 if k.style == "global" else .4), 12))
        tm.shade((cx - R + 4, cy - R + 5, cx + R + 6, cy + R + 6), f=.56, kind="ellipse")
        if k.w <= 2 and k.e >= 7:                                                                          # the stand it sits on
            St = ramp((150, 120, 84), 14) if k.w <= 1 else ramp((176, 172, 164), 10); d.rectangle([X0, Y0, X1, Y1], fill=St[2], outline=OUT)
            for g in range(X0 + 8, X1, 10): d.line([g, Y0 + 1, g, Y1 - 1], fill=St[0])
            R = R * 4 // 5
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=C[2], outline=OUT)
        if k.e <= 6:
            for i in range(0, R - 4, 5): d.ellipse([cx - R + i, cy - R + i, cx + R - i, cy + R - i], outline=C[1 + (i // 5) % 3])
        else: d.arc([cx - R + 3, cy - R + 3, cx + R - 3, cy + R - 3], 150, 290, fill=C[4], width=3)
        hr = R // 3
        if cover == "grate" or cover == "open": d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=SOOT[0], outline=OUT); water(tm, k, cx - hr + 3, cy - hr + 3, cx + hr - 3, cy + hr - 3, full, "ellipse")
        elif cover == "wood" and k.e >= 7: d.rectangle([cx - hr, cy - hr, cx + hr, cy + hr], fill=C[1], outline=OUT); d.line([cx - hr + 2, cy, cx + hr - 2, cy], fill=C[4], width=2)
        else: d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=C[3], outline=OUT)
        if k.e == 8: d.line([cx - R // 2, cy + R - 6, cx + R // 2, cy + R - 6], fill=k.fdglow if full else k.fd[1], width=2)
        d.line([cx + R - 6, cy - R + 4, X1, Y0], fill=(120, 124, 130), width=4)                           # the downpipe
        knob(tm, cx, cy + R - 3, BRASS if k.e < 7 else CHROME, 2)
        Cw = C
    wear(tm, k, X0, Y0, X1, Y1, Cw)


reg("cistern", cistern, axes={"cover": ["slab", "grate", "wood", "open", "slab"], "livery": ["green", "black", "blue", "grey", "beige", "white", "red"]}, states=FE, global_from=1990, nvar=22, clear=1.5,
    tags=("yard", "courtyard", "cellar"), ref="rain-water tanks of 400 to 1000 gallons, 5 to 6 ft across (corrugated iron tanks, 1880s on; vaulted yard cisterns)")


# ---------------------------------------------------------------- the shower
def shower(tm, x, y, w, h, st, v):
    """A shower stall against the wall, seen from above: the tray or tiled floor with its drain, the rose and its pipe
    on the wall (north), and the curtain on its rail, a glass screen or a door at the front. Great War: a tiled stall
    with a brass rose (in barracks a row of open roses); Mid-Century: an enamel tray and a printed curtain; Modern:
    the maker's tray and a glass screen; Future Darkness: a dark sealed cubicle with a lit rose. On, water falls in
    a spray on the tray; off, the tray is dry."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx = (X0 + X1) // 2; W_, H_ = X1 - X0, Y1 - Y0; on = k.lit
    if k.style == "global": Tr = ramp(mix((236, 236, 232), k.P["acc"], .8), 12)
    elif k.e <= 5: Tr = ramp(mix(k.P["tile"], (236, 232, 222), .25), 16)
    else: Tr = ramp(mix((232, 230, 222), k.P["tile"], .45), 12)
    if k.e == 8: Tr = ramp(mix((50, 54, 66), k.P["acc"], .55), 12)
    d.rectangle([X0, Y0, X1, Y1], fill=Tr[2], outline=OUT)
    if k.e <= 5 or k.style == "global" and k.w >= 3:                                                     # tiles
        for g in range(X0 + 9, X1, 9): d.line([g, Y0 + 1, g, Y1 - 1], fill=Tr[0])
        for g in range(Y0 + 9, Y1, 9): d.line([X0 + 1, g, X1 - 1, g], fill=Tr[0])
    else: d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=Tr[4])
    d.ellipse([cx - 3, (Y0 + Y1) // 2 - 3, cx + 3, (Y0 + Y1) // 2 + 3], fill=SOOT[1], outline=OUT)         # the drain
    Mt = BRASS if k.e <= 5 else (CHROME if k.e < 8 else ramp(k.fdglow, 10))
    d.line([cx, Y0, cx, Y0 + 10], fill=Mt[2], width=3); d.ellipse([cx - 7, Y0 + 7, cx + 7, Y0 + 19], fill=Mt[3], outline=OUT)   # the rose
    if on:
        for i in range(18):
            a = i * 2.4; rr = 6 + (i * 7) % (H_ // 2); px_, py_ = cx + math.cos(a) * rr * .8, Y0 + 13 + abs(math.sin(a)) * rr
            d.point((px_, py_), fill=(200, 226, 240)); d.point((px_ + 1, py_), fill=(150, 196, 222))
        d.ellipse([cx - W_ // 4, Y1 - H_ // 3, cx + W_ // 4, Y1 - 6], fill=ramp(mix(WATER[3], Tr[2], .5), 10)[2])
    if k.w >= 4: Sb = ramp((150, 104, 64), 16); d.rectangle([X0 + 2, Y0 + 2, X0 + W_ // 3, Y0 + H_ // 3], fill=Sb[2], outline=OUT)   # a teak corner seat
    elif k.w <= 1: d.ellipse([X1 - 16, Y0 + 3, X1 - 4, Y0 + 15], fill=ramp(mix((90, 140, 200), k.P["acc2"], .4), 12)[2], outline=OUT)   # a bucket and dipper
    scr = k.get("screen", "curtain")
    if scr == "curtain":
        Cu = ramp(mix((220, 220, 214), k.P["acc"], .6), 14)
        d.line([X0, Y1 - 2, X1, Y1 - 2], fill=Mt[3], width=2)
        for gx in range(X0 + 2, X1 - 2, 4): d.line([gx, Y1 - 6, gx + 2, Y1 - 1], fill=Cu[2 + (gx // 4) % 2], width=2)
        if k.w >= 3 and k.style != "global": pattern(tm, X0 + 2, Y1 - 8, X1 - 2, Y1 - 1, k, step=4)
    elif scr in ("glass", "door"):
        d.line([X0, Y1 - 2, X1 - (W_ // 3 if scr == "door" else 0), Y1 - 2], fill=(190, 220, 230), width=3); d.line([X0, Y1 - 1, X1, Y1 - 1], fill=Mt[2])
        if scr == "door": d.line([X1 - W_ // 3, Y1 - 2, X1 - W_ // 6, Y1 - W_ // 4], fill=(190, 220, 230), width=3)
    elif scr == "rail":
        d.line([X0 + 2, Y1 - 3, X1 - 2, Y1 - 3], fill=Mt[3], width=2)
        Tw = ramp(mix((236, 232, 220), k.P["acc2"], .5), 10); d.rectangle([X0 + W_ // 4, Y1 - 6, X0 + W_ // 2, Y1], fill=Tw[2], outline=OUT)
    wear(tm, k, X0, Y0, X1, Y1, Tr)


reg("shower", shower, axes={"screen": ["curtain", "glass", "none", "door", "rail"], "livery": ["white", "grey", "beige", "blue", "black", "green", "red"]}, states=("on", "off"),
    global_from=1990, nvar=28, front=True, clear=1, tags=("bathroom", "barracks", "ward"), ref="shower trays and stalls 30 to 36 in square (Edwardian shower baths; enamel trays)")


# ---------------------------------------------------------------- the fire hydrant
def hydrant(tm, x, y, w, h, st, v):
    """A fire hydrant at the kerb, seen from above: the cast-iron pillar's round cap with its operating nut, the
    outlets either side and its painted body; the cap's colour marks the main's flow. Victorian: a tall fluted
    pillar with a domed cap; Great War and Mid-Century: the squat standard post; Modern: a modern post with a quick
    coupling; Future Darkness: a dark post with a lit band. The worn are chipped and rusted, the broken knocked aslant
    and leaking."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 1
    B = ramp(LIVERY.get(k.get("livery"), (176, 36, 32)), 16)
    if k.e == 8: B = ramp(mix((50, 54, 66), B[2], .9), 14); Cp_lit = True
    Cp = ramp(LIVERY.get(k.get("cap"), (232, 232, 228)), 12)
    for ox in (-1, 1): d.rectangle([cx + ox * (r - 3) - 3, cy - 3, cx + ox * (r - 3) + 3, cy + 3], fill=B[1], outline=OUT)   # the outlets
    d.rectangle([cx - 3, cy + r - 6, cx + 3, cy + r], fill=B[1], outline=OUT)
    rb = r - 1
    d.ellipse([cx - rb, cy - rb, cx + rb, cy + rb], fill=B[2], outline=OUT)
    if k.e == 4:
        for a in np.linspace(0, 2 * math.pi, 10, endpoint=False): d.point((cx + math.cos(a) * (rb - 2), cy + math.sin(a) * (rb - 2)), fill=B[0])   # the fluting
    q = rb - 3; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=Cp[2], outline=OUT); d.arc([cx - q + 1, cy - q + 1, cx + q - 1, cy + q - 1], 150, 280, fill=Cp[4])
    Nt = (IRON if k.e < 8 else ramp(k.fdglow, 10))[3]; d.polygon([(cx + math.cos(a) * 3, cy + math.sin(a) * 3) for a in np.linspace(-math.pi / 2, 1.5 * math.pi, 5, endpoint=False)][:3], fill=Nt) if k.e >= 6 else d.point((cx, cy), fill=Nt)               # the operating nut
    if k.e == 8: d.arc([cx - rb + 1, cy - rb + 1, cx + rb - 1, cy + rb - 1], 20, 160, fill=k.fdglow, width=2)
    if k.broken: d.ellipse([cx + 2, cy + 3, X1, Y1], fill=WATER[2])
    wear(tm, k, X0, Y0, X1, Y1, B)


reg("hydrant", hydrant, axes={"livery": ["red", "yellow", "chrome", "green", "blue", "white", "black"], "cap": ["white", "blue", "green", "orange", "red"]}, global_from=1837, nvar=26, clear=1,
    tags=("street",), ref="pillar hydrants 7 to 10 in across the barrel, about 1 ft with the outlets (Birdsill Holly and Mueller post hydrants; NFPA 291 cap colours)")


# ---------------------------------------------------------------- the fire sprinklers
def sprinkler(tm, x, y, w, h, st, v):
    """A ceiling sprinkler on its branch pipe, seen from above (drawn over everything): the painted pipe across the
    square, the head's round deflector and its glass bulb, coloured by the heat it bursts at (orange, red, yellow,
    green, blue), on a round escutcheon plate. Victorian: a Grinnell head with its fusible link on a black iron
    pipe; Great War to Modern: the bulb heads; Future Darkness: a dark mist nozzle with a lit ring."""
    k = K(v, st); d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; r = min(X1 - X0, Y1 - Y0) // 2 - 1
    pipe = ramp(LIVERY.get(k.get("pipe"), (176, 36, 32)), 14)
    bulb = {"orange": (240, 130, 40), "red": (220, 40, 40), "yellow": (240, 210, 40), "green": (60, 180, 80), "blue": (60, 110, 220)}[k.get("bulb", "red")]
    Es = ramp(mix((226, 226, 222), pipe[2], .6), 10)
    d.ellipse([X0, Y0, X1, Y1], fill=Es[2], outline=OUT)                                                  # the escutcheon plate
    d.rectangle([X0, cy - 3, X1, cy + 3], fill=pipe[2], outline=OUT); d.line([X0 + 1, cy - 2, X1 - 1, cy - 2], fill=pipe[4])
    if k.e == 4:
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=bulb, width=3); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=BRASS[3], outline=OUT); d.line([cx - 3, cy + 3, cx + 3, cy - 3], fill=(200, 200, 190), width=2)   # the frame, coded by its rating, and the fusible link
    elif k.e == 8:
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(50, 54, 66), outline=OUT); d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=bulb, width=2); d.point((cx, cy), fill=k.fdglow)
    else:
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=(BRASS if k.e <= 6 else CHROME)[3], width=2)          # the deflector
        d.ellipse([cx - 4, cy - 5, cx + 4, cy + 5], fill=bulb, outline=OUT)
    wear(tm, k, X0, Y0, X1, Y1, pipe)


reg("sprinkler", sprinkler, axes={"bulb": ["red", "orange", "yellow", "green", "blue"], "pipe": ["red", "black", "grey", "white", "chrome", "yellow", "green"]}, global_from=1837, nvar=24, clear=0,
    tags=("office", "warehouse", "lab", "station", "salon"), ref="sprinkler heads on 1 in branch pipes, deflectors about 1 1/2 in, spaced 10 to 15 ft (Grinnell, 1880s; NFPA 13 bulb colours)")
