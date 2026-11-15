"""The tables family (B6346): tables of every size and shape, low tables, dining tables, desks and writing slopes,
lecterns, counters and bars, workbenches, dressing tables and washstands, sideboards, coffee, card and map tables,
surgery and laboratory benches, the judge's bench and the dock, and the communion table, each drawn from straight
above in every era it spans.

A table seen from above is its top, so what names it is the top's make and what lies on it: the trestle boards of
a hall, a scrubbed pine kitchen table, a mahogany top with its cloth, a formica top with a chrome edge, a desk with
its blotter, inkstand and later its typewriter or screen, a bar with its pumps and the shelves of bottles behind.
The era sets the make, the household's means the wood, the cloth and how much is set out, the region its own
patterns and its own wares (a brass tray and tea glasses, a blue-and-white teapot, a calabash), and the upkeep how
scrubbed or scarred it is. The shared machinery is in fam_seating."""
import math

import numpy as np

from px import OUT
from library.core import YEAR_END
from library.art import (tone, mix, ramp, shadow, slab, knob, cloth, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE)
from library.fam_seating import (Look, sdef, motif, border, pad, weave, fringe, tassel, leg, wear, cut, chip, finish, era_mark, plank, frame,
                                 DA, LN, RE, AR, VI, GW, MC, MO, FD, GOLD, SILVER, CHROME, BONE, STONE, MATERIALS, COLOURS, STY, MAKE_LIST)

GLASS = ramp((150, 196, 206), 14, (-4, 0, 6))
PAPER = ramp((226, 214, 180), 10)
INK = (34, 30, 40)


# ---------------------------------------------------------------- what lies on a table
def ware(L):
    """The region's tableware at the household's means: (body ramp, accent ramp)."""
    st, w, e = L.st, L.w, L.e
    if e >= MC: return (L.R((236, 236, 230), 8), L.dye()) if w >= 2 else (L.R((200, 200, 196), 10), L.plastic)
    if w <= 1: return (L.R({"eastasia": (120, 100, 76), "polar": (128, 136, 126), "africa": (200, 160, 84), "seasia": (190, 182, 110), "oceania": (110, 76, 50)}.get(st, (150, 112, 74)), 14), L.wood)
    if st in ("islamic", "southasia", "steppe"): return (L.fade(BRASS) if w <= 3 else L.fade(GOLD), L.dye())
    if st == "eastasia": return (L.R((232, 234, 236), 8), L.R((40, 64, 150), 18))
    if st == "africa": return (L.R((204, 164, 84), 16), L.R((60, 40, 30), 8))
    if st in ("mediterranean", "americas"): return (L.R((226, 212, 180), 10), L.R((40, 80, 160), 18))
    if e <= LN: return (L.R((150, 152, 150), 14), L.wood)                        # pewter and treen
    return (L.fade(SILVER) if w >= 4 else L.R((150, 152, 150), 14), L.R((236, 232, 220), 8))


def thing(tm, kind, x, y, L, s=1.0):
    """One small thing on a table, about 8 to 16 px: plate, cup, jug, candle, bread, bowl, book, lamp, bottle, glass,
    tray, teapot, papers, inkwell, apple."""
    d = tm.d; B_, A_ = ware(L); r = int(6 * s)
    if kind == "plate":
        d.ellipse([x - r, y - r, x + r, y + r], fill=B_[3], outline=OUT); d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], outline=A_[2]); d.point((x - 2, y - 2), fill=B_[4])
    elif kind == "cup":
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B_[2], outline=OUT); d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(90, 50, 30)); d.rectangle([x + 3, y - 1, x + 5, y + 1], fill=B_[1])
    elif kind == "jug":
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=B_[2], outline=OUT); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=B_[0]); d.polygon([(x - 5, y - 1), (x - 8, y), (x - 5, y + 1)], fill=B_[3])
        d.arc([x + 3, y - 4, x + 9, y + 4], 270, 90, fill=OUT, width=2)
    elif kind == "candle":
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=L.metal[2], outline=OUT); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=WHITE[4]); d.point((x, y), fill=(250, 200, 80))
    elif kind == "bread":
        bc = L.R((190, 130, 70), 14); d.ellipse([x - 7, y - 4, x + 7, y + 4], fill=bc[2], outline=OUT); d.line([x - 3, y - 2, x - 1, y + 2], fill=bc[0]); d.line([x + 2, y - 2, x + 4, y + 2], fill=bc[0]); d.arc([x - 6, y - 3, x + 6, y + 3], 190, 260, fill=bc[4])
    elif kind == "bowl":
        d.ellipse([x - r, y - r, x + r, y + r], fill=B_[2], outline=OUT); d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], fill=L.R((180, 120, 60), 14)[2]); d.point((x - 2, y - 2), fill=B_[4])
    elif kind == "book":
        bc = L.dye2() if L.w >= 2 else L.R((90, 60, 40), 12); d.rectangle([x - 6, y - 8, x + 6, y + 8], fill=bc[2], outline=OUT); d.line([x - 5, y - 7, x - 5, y + 7], fill=bc[4]); d.line([x + 5, y - 7, x + 5, y + 7], fill=PAPER[3])
    elif kind == "openbook":
        d.rectangle([x - 11, y - 7, x + 11, y + 7], fill=PAPER[4], outline=OUT); d.line([x, y - 7, x, y + 7], fill=PAPER[1])
        for ly in range(y - 4, y + 6, 3): d.line([x - 9, ly, x - 2, ly], fill=(110, 100, 90)); d.line([x + 2, ly, x + 9, ly], fill=(110, 100, 90))
    elif kind == "lamp":
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=L.metal[2], outline=OUT); d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(250, 226, 150)); d.point((x - 1, y - 1), fill=WHITE[4])
    elif kind == "bottle":
        bc = L.R((60, 110, 70), 14) if (x // 7) % 2 else L.R((110, 50, 40), 14); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=bc[2], outline=OUT); d.point((x - 1, y - 1), fill=bc[4])
    elif kind == "glass":
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=GLASS[3], outline=GLASS[0]); d.point((x - 1, y - 1), fill=WHITE[4])
    elif kind == "tray":
        M = L.fade(BRASS); d.ellipse([x - 12, y - 10, x + 12, y + 10], fill=M[2], outline=OUT); d.ellipse([x - 10, y - 8, x + 10, y + 8], outline=M[4])
        for k in (-6, 0, 6): d.ellipse([x + k - 2, y - 2, x + k + 2, y + 2], fill=GLASS[2], outline=(120, 50, 30))
    elif kind == "teapot":
        d.ellipse([x - 6, y - 5, x + 6, y + 5], fill=B_[3], outline=OUT); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=A_[2]); d.line([x + 6, y, x + 10, y - 2], fill=B_[2], width=2); d.arc([x - 10, y - 4, x - 4, y + 4], 90, 270, fill=OUT, width=2)
    elif kind == "papers":
        d.rectangle([x - 8, y - 10, x + 6, y + 8], fill=PAPER[3], outline=OUT); d.rectangle([x - 5, y - 8, x + 9, y + 10], fill=PAPER[4], outline=OUT)
        for ly in range(y - 5, y + 8, 3): d.line([x - 3, ly, x + 6, ly], fill=(120, 112, 100))
    elif kind == "inkwell":
        d.rectangle([x - 4, y - 4, x + 4, y + 4], fill=L.metal[2], outline=OUT); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=INK); d.line([x + 3, y - 3, x + 10, y - 9], fill=WHITE[4])
    elif kind == "apple":
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(170, 40, 34), outline=OUT); d.point((x - 1, y - 1), fill=(230, 120, 90))
    elif kind == "calabash":
        cb = L.R((204, 164, 84), 16); d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=cb[2], outline=OUT); d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=cb[0]); d.arc([x - 6, y - 6, x + 6, y + 6], 190, 260, fill=cb[4])


def setting(L, n=4):
    """What a table holds at this era, means and region, as a list of things."""
    st, e = L.st, L.e
    if st in ("islamic", "steppe") and e <= MC: base = ["tray", "bread", "bowl", "cup"]
    elif st == "eastasia" and e <= MC: base = ["teapot", "cup", "bowl", "cup"]
    elif st in ("africa", "oceania") and e <= VI: base = ["calabash", "bowl", "bowl", "calabash"]
    elif e <= LN: base = ["bread", "bowl", "jug", "plate"]
    elif e <= AR: base = ["plate", "candle", "jug", "plate"]
    elif e <= GW: base = ["plate", "lamp", "jug", "cup"]
    elif e <= MO: base = ["plate", "cup", "glass", "bottle"]
    else: base = ["cup", "glass", "plate", "cup"]
    if L.poor: base = base[:2]
    if L.rich: base = base + ["candle", "apple"]
    return (base * 3)[:n]


# ---------------------------------------------------------------- tops
def top_kind(L, big=True):
    """The make of a table top for its era, means and region."""
    e, w = L.e, L.w
    if e == FD: return "composite"
    if e == MO: return "glass" if w >= 4 else "veneer"
    if e == MC: return "teak" if w >= 4 else "formica"
    if e == GW: return "oak" if w >= 3 else "pine"
    if e == VI: return "mahogany" if w >= 4 else "pine"
    if e in (RE, AR) or L.st == "eastasia": return "joined"
    return "trestle" if big else "plank"


def tabletop(tm, box, L, kind=None, round_=False, big=True):
    """Draw a table top from above and return its ramp."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box); kind = kind or top_kind(L, big); rng = tm.rng
    C = L.wood
    if kind == "trestle":
        for fx in (x0 + 10, x1 - 18):                                            # the trestle feet past the boards
            d.rectangle([fx, y0, fx + 8, y1], fill=C[1], outline=OUT); d.line([fx + 1, y0 + 1, fx + 1, y1 - 1], fill=C[3])
        n = 3; bh = (y1 - y0 - 8) / n
        for i in range(n): slab(tm, x0 + (i % 2) * 3, y0 + 4 + i * bh, x1 - ((i + 1) % 2) * 3, y0 + 4 + (i + 1) * bh - 2, C, "x", knots=1, rng=rng)
        for fx in (x0 + 14, x1 - 14):
            for i in range(n): d.rectangle([fx - 1, int(y0 + 4 + i * bh + bh / 2 - 2), fx + 1, int(y0 + 4 + i * bh + bh / 2)], fill=IRON[3])
        return C
    if kind == "joined":
        if L.st in ("eastasia",) and L.w >= 2: C = L.paint
        if round_: d.ellipse([x0, y0, x1, y1], fill=C[2], outline=OUT); d.arc([x0 + 3, y0 + 3, x1 - 3, y1 - 3], 180, 270, fill=C[4], width=2)
        else:
            slab(tm, x0 + 10, y0, x1 - 10, y1, C, "x", knots=2, rng=rng, gaps=((y1 - y0) // 2,))
            for ex in (x0, x1 - 10): slab(tm, ex, y0, ex + 10, y1, C, "y", rng=rng)     # the breadboard ends
        return C
    if kind == "plank":
        if round_: d.ellipse([x0, y0, x1, y1], fill=C[2], outline=OUT); d.line([x0 + 6, (y0 + y1) // 2, x1 - 6, (y0 + y1) // 2], fill=C[0])
        else: slab(tm, x0, y0, x1, y1, C, "x", knots=2, rng=rng, gaps=((y1 - y0) // 2,))
        return C
    if kind in ("pine", "oak", "mahogany", "teak"):
        C = {"pine": L.R(L.mt(mix(mix((196, 176, 132), L.S["wood"], .3), L.S["paint"], .38)), 16), "oak": L.tw, "mahogany": L.R(L.mt(mix((110, 46, 32), L.S["wood2"], .3)), 18), "teak": L.R(L.mt(mix((150, 96, 56), L.S["paint"], .2)), 18)}[kind]
        if round_: d.ellipse([x0, y0, x1, y1], fill=C[2], outline=OUT); d.arc([x0 + 3, y0 + 3, x1 - 3, y1 - 3], 180, 270, fill=C[4], width=2)
        else: slab(tm, x0, y0, x1, y1, C, "x", knots=2 if kind == "pine" else 0, rng=rng, gaps=((y1 - y0) // 3, 2 * (y1 - y0) // 3) if kind == "pine" else ())
        if kind == "pine":
            for _ in range(int((x1 - x0) / 14)):                                 # scrub marks
                sx, sy = rng.uniform(x0 + 8, max(x0 + 9, x1 - 16)), rng.uniform(y0 + 6, max(y0 + 7, y1 - 6)); d.arc([sx, sy - 3, sx + 10, sy + 3], 200, 340, fill=C[4])
        if kind == "mahogany": d.line([x0 + 6, y0 + 4, x0 + (x1 - x0) // 3, y0 + 4], fill=C[4], width=2)                 # the polish's gleam
        return C
    if kind == "formica":
        C = L.plastic
        if round_: d.ellipse([x0, y0, x1, y1], fill=CHROME[2], outline=OUT); d.ellipse([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=C[2])
        else: d.rounded_rectangle([x0, y0, x1, y1], 4, fill=CHROME[2], outline=OUT); d.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], 3, fill=C[2])
        for k in range(x0 + 6, x1 - 6, 11): d.line([k, y0 + 5 + (k % 7), k + 3, y0 + 5 + (k % 7)], fill=C[3])          # the boomerang flecks
        return C
    if kind == "veneer":
        C = L.R(L.mt(mix((200, 176, 136), L.S["paint"], .55)), 14)
        if round_: d.ellipse([x0, y0, x1, y1], fill=C[3], outline=OUT)
        else: d.rounded_rectangle([x0, y0, x1, y1], 6, fill=C[3], outline=OUT)
        for k in range(y0 + 6, y1 - 4, 5): d.line([x0 + 5, k, x1 - 5, k], fill=C[2])
        return C
    if kind == "glass":
        C = L.R(mix(GLASS[2], L.S["paint"], .3), 12)
        for lx, ly in ((x0 + 6, y0 + 6), (x1 - 6, y0 + 6), (x0 + 6, y1 - 6), (x1 - 6, y1 - 6)): d.rectangle([lx - 2, ly - 2, lx + 2, ly + 2], fill=CHROME[2])
        if round_: d.ellipse([x0, y0, x1, y1], fill=C[3], outline=C[0], width=2)
        else: d.rounded_rectangle([x0, y0, x1, y1], 3, fill=C[3], outline=C[0], width=2)
        for lx, ly in ((x0 + 6, y0 + 6), (x1 - 6, y0 + 6), (x0 + 6, y1 - 6), (x1 - 6, y1 - 6)): d.rectangle([lx - 2, ly - 2, lx + 2, ly + 2], fill=C[1])   # the legs seen through it
        d.line([x0 + 6, y0 + 4, x0 + (x1 - x0) // 3, y0 + 4], fill=WHITE[4]); d.line([x0 + 4, y0 + 7, x0 + (x1 - x0) // 5, y0 + 7], fill=GLASS[4])
        d.rectangle([(x0 + x1) // 2 - 10, (y0 + y1) // 2 - 3, (x0 + x1) // 2 + 10, (y0 + y1) // 2 + 3], fill=L.plastic[2], outline=OUT)   # the rug or runner seen through
        return L.plastic
    C = L.comp                                                                     # the far future's dark slab with its lit edge
    if round_: d.ellipse([x0, y0, x1, y1], fill=C[1], outline=OUT); d.ellipse([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=L.glow[1])
    else: d.rounded_rectangle([x0, y0, x1, y1], 5, fill=C[1], outline=OUT); d.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], 4, outline=L.glow[1])
    return C


def tablecloth(tm, box, L, round_=False):
    """A cloth over the top, its corners hanging, in the region's weave, with a runner in rich houses."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box)
    C = L.cover(L.paint, .25) if not L.poor else L.R(L.S["undyed"], 12)
    if L.e >= GW and L.st in ("central", "atlantic", "northern", "americas") and L.w <= 3: C = L.R(L.mt((230, 226, 214)), 8)   # white or checked
    if round_: d.ellipse([x0, y0, x1, y1], fill=C[2], outline=OUT); d.ellipse([x0 + 4, y0 + 4, x1 - 4, y1 - 4], outline=C[3])
    else: cloth(tm, x0, y0, x1, y1, C, folds="y", n=0, pattern="check" if (L.e in (GW, MC) and L.w <= 3) else None, rng=tm.rng)
    if not round_:
        for cx_ in (x0 + 3, x1 - 3):
            for cy_ in (y0 + 3, y1 - 3): d.polygon([(cx_ - 3, cy_ - 3), (cx_ + 3, cy_ - 3), (cx_, cy_ + 3)], fill=C[1])
    if L.w >= 2:
        if round_: motif(tm, (x0 + (x1 - x0) // 4, (y0 + y1) // 2 - 5, x1 - (x1 - x0) // 4, (y0 + y1) // 2 + 5), L, C=L.dye2(), A=L.metal)
        else: motif(tm, (x0 + 5, y0 + 3, x1 - 5, y0 + 9), L, C=L.dye2(), A=L.metal, dense=1.3); motif(tm, (x0 + 5, y1 - 9, x1 - 5, y1 - 3), L, C=L.dye2(), A=L.metal, dense=1.3)
    if L.w >= 4 and not round_: fringe(tm, x0 + 2, x1 - 2, y1 - 2, L.metal, 2)


def lay(tm, box, L, n=None, round_=False):
    """Set things out on a top: a row along each long side and something in the middle."""
    x0, y0, x1, y1 = (int(t) for t in box); W, H = x1 - x0, y1 - y0
    if round_:
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; R = min(W, H) // 2 - 10; items = setting(L, n or 5)
        thing(tm, items[0], cx, cy, L)
        for k, it in enumerate(items[1:]):
            a = math.radians(45 + 360 * k / max(1, len(items) - 1)); thing(tm, it, int(cx + math.cos(a) * R), int(cy + math.sin(a) * R * .8), L, .8)
        return
    n = n or max(2, W // 26); items = setting(L, n + 2)
    for i in range(n):
        x = int(x0 + (i + .5) * W / n)
        if H >= 40: thing(tm, items[i] if items[i] in ("plate", "bowl", "calabash", "tray") else "plate", x, y0 + 10, L, .9); thing(tm, items[(i + 1) % len(items)], x, y1 - 10, L, .9)
        else: thing(tm, items[i], x, (y0 + y1) // 2, L, .8)


def legs4(tm, box, C, inset=3, r=2):
    x0, y0, x1, y1 = (int(t) for t in box)
    for lx, ly in ((x0 + inset, y0 + inset), (x1 - inset, y0 + inset), (x0 + inset, y1 - inset), (x1 - inset, y1 - inset)): leg(tm, lx, ly, C, r)


# ---------------------------------------------------------------- tables
COVER = ["bare", "cloth", "laid"]


WEST = ("central", "atlantic", "northern", "mediterranean", "polar")


def spread(tm, B, L, round_=False):
    """Where a people did not eat at a high table: the meal laid on the floor or on low trays, from above. The Islamic
    world: a leather or cloth sufra spread on the floor, and in a rich house round engraved brass trays on folding
    stands set on it; the steppe: a felt dastarkhan with its border and a low painted table; South Asia: a mat with a
    brass thali at each place, or banana leaves for the poor; Southeast Asia: a pandanus mat and a low round wooden
    tray of rice bowls; Africa: a mat with a carved low table and calabashes; the Americas: a reed mat with
    calabashes and a griddle; Oceania: a mat with a long wooden bowl and leaves. Long Night: the cloth darker and
    mended, the dishes fewer."""
    d = tm.d; X0, Y0, X1, Y1 = B; st_ = L.st; W, H = X1 - X0, Y1 - Y0; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    ln = L.e == LN
    if st_ in ("islamic", "steppe"):                                             # a cloth or leather spread with its border
        C = (L.R(mix((150, 100, 60), L.S["dyes"][L.col], .25), 14) if st_ == "islamic" else L.cover(L.paint, .3)) if not L.poor else L.R(L.S["undyed"], 12)
        if ln: C = L.R(mix(C[2], (90, 84, 76), .3), 14)
        (d.ellipse if round_ else d.rectangle)([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        if not round_: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], outline=C[0] if L.poor else L.dye2()[2], width=2)
        if L.w >= 2 and not round_: motif(tm, (X0 + 6, Y0 + 6, X1 - 6, Y0 + 11), L, C=L.dye2(), A=L.metal, dense=1.3)
    else:                                                                       # a woven mat
        mc = L.R(mix((196, 176, 120), L.S["paint"], .2), 12) if not ln else L.R((150, 136, 104), 12)
        if round_: d.ellipse([X0, Y0, X1, Y1], fill=mc[2], outline=OUT)
        else: weave(tm, (X0, Y0, X1, Y1), mc, 4); d.rectangle([X0, Y0, X1, Y1], outline=OUT)
        if L.w >= 2 and not round_: d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], outline=L.dye()[2], width=2)
    if ln and W > 30: d.rectangle([X0 + W // 5, Y0 + H // 3, X0 + W // 5 + 9, Y0 + H // 3 + 7], fill=L.R((110, 96, 80), 10)[2], outline=OUT)   # a mended patch
    n = max(1, round(W / max(H, 1)))                                             # the trays, tables or dishes on it
    R_ = min(H, W // n) // 2 - 4
    for i in range(n):
        tx = int(X0 + (i + .5) * W / n)
        if st_ == "islamic" and L.w >= 3:                                        # a brass tray on its folding stand
            M = L.fade(GOLD) if L.prince else L.fade(BRASS)
            d.line([tx - R_ + 4, cy - R_ + 4, tx + R_ - 4, cy + R_ - 4], fill=L.wood[0], width=3); d.line([tx + R_ - 4, cy - R_ + 4, tx - R_ + 4, cy + R_ - 4], fill=L.wood[0], width=3)
            d.ellipse([tx - R_, cy - R_, tx + R_, cy + R_], fill=M[2], outline=OUT); d.ellipse([tx - R_ + 3, cy - R_ + 3, tx + R_ - 3, cy + R_ - 3], outline=M[4])
            motif(tm, (tx - R_ // 2, cy - R_ // 3, tx + R_ // 2, cy + R_ // 3), L, C=M, A=L.dye(), dense=1.4)
            thing(tm, "bowl", tx, cy, L, .9)
            if not ln:
                for a in (30, 150, 270): ra = math.radians(a); thing(tm, "glass", int(tx + math.cos(ra) * R_ * .6), int(cy + math.sin(ra) * R_ * .6), L, .7)
        elif st_ == "steppe" and L.w >= 2:                                       # a low painted table
            P = L.paint; d.rectangle([tx - R_, cy - R_ + 3, tx + R_, cy + R_ - 3], fill=P[2], outline=OUT); motif(tm, (tx - R_ + 3, cy - R_ + 6, tx + R_ - 3, cy + R_ - 6), L, C=L.dye2(), A=GOLD)
            thing(tm, "bowl", tx, cy, L)
        elif st_ == "southasia":                                                 # thalis or banana leaves at the places
            for yy in (cy - H // 4, cy + H // 4):
                if L.w >= 2: M = L.fade(BRASS); d.ellipse([tx - 8, yy - 6, tx + 8, yy + 6], fill=M[2], outline=OUT); d.ellipse([tx - 3, yy - 2, tx + 1, yy + 2], fill=L.dye()[3])
                else: d.polygon([(tx - 10, yy), (tx, yy - 6), (tx + 10, yy), (tx, yy + 6)], fill=(70, 130, 60), outline=OUT); d.line([tx - 9, yy, tx + 9, yy], fill=(120, 170, 90))
        elif st_ in ("seasia", "africa") and L.w >= 2:                          # a low round wooden tray-table
            C = L.wood; d.ellipse([tx - R_, cy - R_, tx + R_, cy + R_], fill=C[2], outline=OUT); d.arc([tx - R_ + 3, cy - R_ + 3, tx + R_ - 3, cy + R_ - 3], 190, 260, fill=C[4])
            thing(tm, "calabash" if st_ == "africa" else "bowl", tx, cy, L)
        elif st_ == "oceania":                                                   # a long carved wooden food bowl on leaves
            d.polygon([(tx - R_ - 4, cy), (tx - R_, cy - 6), (tx + R_, cy - 6), (tx + R_ + 4, cy), (tx + R_, cy + 6), (tx - R_, cy + 6)], fill=(70, 130, 60), outline=OUT)
            d.ellipse([tx - R_ + 2, cy - 5, tx + R_ - 2, cy + 5], fill=L.wood[2], outline=OUT); d.ellipse([tx - R_ + 6, cy - 2, tx + R_ - 6, cy + 2], fill=L.wood[0])
        else:
            thing(tm, "calabash" if st_ in ("americas", "africa") else "bowl", tx - 8, cy, L); (thing(tm, "bread", tx + 9, cy, L) if not ln else None)
            if st_ == "americas" and L.w >= 2: d.ellipse([tx + 2, cy - 12, tx + 16, cy - 2], fill=(60, 56, 54), outline=OUT)   # the comal


def _table(tm, B, st, L, snap, round_=False, big=True, low=False):
    """A table from above. Dark Ages and Long Night: loose boards on trestles whose feet show at the ends;
    Renaissance and Age of Reason: a joined table with breadboard ends; Victorian: a scrubbed pine kitchen table, or a
    polished mahogany one; Great War: deal or stained oak, a checked or white cloth; Mid-Century: a formica top with a
    chrome edge, or teak; Modern: pale veneer, or glass on chrome legs in a rich house; Future Darkness: a dark slab
    with a lit edge. A cloth in the region's weave and the region's ware laid out on it, as the variation says."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cv = L.v.get("cover", "bare")
    if e <= AR and L.st not in WEST and L.st not in ("eastasia",) and not (L.st == "americas" and e >= RE):
        spread(tm, B, L, round_=round_); finish(tm, snap, (X0, Y0, X1, Y1), L, corner=0); return
    shadow(tm, X0, Y0, X1, Y1, 5 if not low else 3, kind="ellipse" if round_ else "rect")
    C = tabletop(tm, B, L, round_=round_, big=big)
    if e == LN and not round_ and top_kind(L, big) in ("trestle", "plank"):     # Long Night: heavy iron straps across the boards, the trestles painted
        for sx in range(X0 + 22, X1 - 20, 34): d.rectangle([sx, Y0 + 1, sx + 3, Y1 - 1], fill=L.fade(IRON)[1], outline=OUT); d.point((sx + 1, Y0 + 4), fill=IRON[4]); d.point((sx + 1, Y1 - 4), fill=IRON[4])
        if L.w >= 2:
            for fx in (X0 + 1, X1 - 7): d.rectangle([fx, Y0 + 2, fx + 6, Y1 - 2], fill=L.paint[2], outline=OUT); d.line([fx + 2, Y0 + 4, fx + 2, Y1 - 4], fill=L.dye()[3])
    if cv == "cloth" and top_kind(L) not in ("glass", "composite", "trestle") or (cv == "cloth" and e <= LN and L.w >= 3):
        tablecloth(tm, (X0 + 1, Y0 + 1, X1 - 1, Y1 - 1), L, round_)
    elif cv == "bare" and L.w >= 3 and e < MO:
        if round_: motif(tm, (X0 + (X1 - X0) // 4, (Y0 + Y1) // 2 - 4, X1 - (X1 - X0) // 4, (Y0 + Y1) // 2 + 4), L, C=C, A=L.metal, dense=1.2)
        else: border(tm, (X0 + 4, Y0 + 4, X1 - 4, Y1 - 4), L.metal if L.w >= 4 else C)
    if cv != "bare" or L.rich: lay(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), L, round_=round_)
    elif e == VI and not round_: knob(tm, (X0 + X1) // 2, Y1 - 3, L.wood, 3)            # the drawer's knob
    finish(tm, snap, (X0, Y0, X1, Y1), L)


sdef("table", lambda tm, B, st, L, snap: _table(tm, B, st, L, snap), axes={"material": MATERIALS, "colour": COLOURS, "cover": COVER},
     ref="boarded and trestle tables of the 13th to 16th c., 5 1/2 to 7 ft by 2 1/2 to 3 ft")
sdef("table-small", lambda tm, B, st, L, snap: _table(tm, B, st, L, snap, big=False), axes={"material": MATERIALS, "colour": COLOURS, "cover": COVER},
     ref="side tables and stands, 2 1/2 to 3 1/2 ft")
sdef("table-round", lambda tm, B, st, L, snap: _table(tm, B, st, L, snap, round_=True, big=False), axes={"material": MATERIALS, "colour": COLOURS, "cover": COVER},
     front=False, ref="round and tilt-top tables, 3 1/2 to 4 1/2 ft across")


def _dininglong(tm, B, st, L, snap):
    """A long dining table from above, set for a meal: Dark Ages and Long Night, the hall's boards on trestles under a
    white cloth with trenchers, bread, a salt and candles; Renaissance and Age of Reason, a long refectory or
    draw-leaf table with pewter or silver, a runner and candlesticks; Victorian, mahogany with a white damask cloth,
    silver and a centrepiece; later eras, polished wood, glass or a dark lit slab with places laid. The region lays its
    own ware: brass trays, blue-and-white, calabashes."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0
    shadow(tm, X0, Y0, X1, Y1, 5)
    C = tabletop(tm, B, L)
    cv = L.v.get("cover", "laid")
    if cv != "bare" and e < MO:
        tablecloth(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), L)
    n = max(3, W // 40)
    for i in range(n):                                                          # the places along both sides
        x = int(X0 + (i + .5) * W / n)
        for y, sg in ((Y0 + 11, 1), (Y1 - 11, -1)):
            thing(tm, "plate" if not (L.st in ("africa", "oceania") and e <= VI) else "calabash", x, y, L, .95)
            if L.w >= 4: thing(tm, "glass", x + 10, y + sg * 2, L)
    cy = (Y0 + Y1) // 2                                                          # down the middle: candles, dishes, a centrepiece
    if L.w >= 4: d.rectangle([X0 + 20, cy - 4, X1 - 20, cy + 4], fill=L.dye()[2], outline=L.metal[3]); motif(tm, (X0 + 22, cy - 3, X1 - 22, cy + 3), L, C=L.dye2(), A=L.metal, dense=1.4)
    for k, x in enumerate(range(X0 + 30, X1 - 20, 44)):
        thing(tm, ("candle", "bowl", "bread", "jug", "tray", "teapot")[(k + (2 if L.st in ("islamic", "eastasia") else 0)) % 6] if cv != "bare" else "candle", x, cy, L)
    if e == LN: era_mark(tm, (X0, Y0, X1, Y1), L, "wood")
    finish(tm, snap, (X0, Y0, X1, Y1), L)


sdef("dininglong", _dininglong, axes={"material": MATERIALS, "colour": COLOURS, "cover": ["laid", "cloth", "bare"]}, front=False,
     ref="hall and refectory tables, 10 to 14 ft long and 3 to 3 1/2 ft wide")
sdef("table-long", _dininglong, axes={"material": MATERIALS, "colour": COLOURS, "cover": ["laid", "cloth", "bare"]},
     looks=tuple((a, b, lab, v) for a, b, lab, v in __import__("library.fam_seating", fromlist=["era_looks"]).era_looks("dininglong")),
     ref="hall boards on trestles, 8 to 12 ft")


def _tablelow(tm, B, st, L, snap):
    """A low table from above. The Islamic world: a round engraved brass tray on a folding stand with tea glasses;
    the steppe: a painted low table in orange and red with bowls; South Asia: a carved chowki with a brass thali; East
    Asia: a lacquered kang table with a tea set; Southeast Asia: a teak or rattan table on a woven mat; Africa: a
    carved table from one log with calabashes. Poor ones are plain wood or a mat with a bowl; modern ones veneer or
    plastic; future ones a dark lit slab."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; st_ = L.st; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    shadow(tm, X0, Y0, X1, Y1, 3)
    if e >= MO:
        tabletop(tm, B, L); lay(tm, B, L, n=2); finish(tm, snap, B, L); return
    if st_ == "islamic" and L.w >= 2:                                              # the brass tray table on its stand
        for lx, ly in ((X0 + 8, Y0 + 4), (X1 - 8, Y0 + 4), (X0 + 8, Y1 - 4), (X1 - 8, Y1 - 4)): leg(tm, lx, ly, L.wood, 2)
        M = L.fade(BRASS) if L.w <= 3 else L.fade(GOLD); R = min(X1 - X0, Y1 - Y0) // 2 - 1
        d.ellipse([cx - int(R * 1.5), cy - R, cx + int(R * 1.5), cy + R], fill=M[2], outline=OUT)
        d.ellipse([cx - int(R * 1.5) + 4, cy - R + 4, cx + int(R * 1.5) - 4, cy + R - 4], outline=M[4])
        motif(tm, (cx - R, cy - R // 2, cx + R, cy + R // 2), L, C=M, A=L.dye(), dense=1.2)
        for k in (-2, 2): thing(tm, "glass", cx + k * 12, cy - 4, L)
        thing(tm, "teapot", cx, cy + 6, L)
    elif st_ in ("steppe",) or (st_ == "eastasia" and L.w >= 2):
        C = L.paint
        d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4]); d.line([X0 + 1, Y1 - 1, X1 - 1, Y1 - 1], fill=C[0])
        motif(tm, (X0 + 4, Y0 + 4, X1 - 4, Y1 - 4), L, C=L.dye2() if L.w >= 2 else C, A=GOLD, dense=1)
        for lx in (X0 + 1, X1 - 5): d.rectangle([lx, Y0 + 3, lx + 4, Y1 - 3], fill=C[1])
        lay(tm, (X0 + 8, Y0 + 2, X1 - 8, Y1 - 2), L, n=3)
    elif st_ == "southasia":                                                       # a carved chowki with a thali
        C = L.wood; d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)
        for k in range(X0 + 3, X1 - 2, 6): d.arc([k, Y0 + 1, k + 6, Y0 + 7], 0, 180, fill=C[0]); d.arc([k, Y1 - 7, k + 6, Y1 - 1], 180, 360, fill=C[0])
        d.rectangle([X0 + 5, Y0 + 7, X1 - 5, Y1 - 7], fill=C[3], outline=C[0])
        if L.w >= 2:
            M = L.fade(BRASS); R = min(X1 - X0, Y1 - Y0) // 2 - 9; d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=M[2], outline=OUT)
            for a in range(0, 360, 60): ra = math.radians(a); d.ellipse([cx + math.cos(ra) * R * .6 - 3, cy + math.sin(ra) * R * .6 - 3, cx + math.cos(ra) * R * .6 + 3, cy + math.sin(ra) * R * .6 + 3], fill=(M[4] if a % 120 else L.dye()[2]), outline=OUT)
        else: thing(tm, "bowl", cx, cy, L)
    elif st_ in ("seasia",):
        mc = L.R((196, 176, 120), 12); weave(tm, (X0, Y0, X1, Y1), mc, 4)          # the mat under it
        C = L.wood; d.rectangle([X0 + 8, Y0 + 5, X1 - 8, Y1 - 5], fill=C[2], outline=OUT); d.line([X0 + 9, Y0 + 6, X1 - 9, Y0 + 6], fill=C[4])
        if L.w >= 2: motif(tm, (X0 + 11, Y0 + 8, X1 - 11, Y1 - 8), L, C=L.dye(), A=GOLD, dense=1)
        lay(tm, (X0 + 10, Y0 + 5, X1 - 10, Y1 - 5), L, n=2)
    else:                                                                          # Africa, and plain low tables
        C = L.wood; d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=C[2], outline=OUT); d.arc([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], 180, 270, fill=C[4], width=2)
        for k in range(X0 + 6, X1 - 6, 8): d.line([k, Y0 + 2, k + 4, Y0 + 2], fill=C[0]); d.line([k, Y1 - 2, k + 4, Y1 - 2], fill=C[0])   # adze marks round the edge
        if L.w >= 2: motif(tm, (X0 + 6, Y0 + 5, X1 - 6, Y0 + 11), L, dense=1.2)
        lay(tm, (X0 + 6, Y0 + 2, X1 - 6, Y1 - 2), L, n=2)
    if e == FD: d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=L.glow[2])
    finish(tm, snap, B, L)


sdef("table-low", _tablelow, nvar=20, front=False, ref="Ottoman sini trays on stands, Chinese kang tables, Indian chowkis, 3 to 4 ft by 2 to 3 ft, a foot high")


def _coffeetable(tm, B, st, L, snap):
    """A coffee table from above: Mid-Century, a kidney-shaped or boomerang top in teak or formica with a magazine and
    an ashtray; Modern, a glass or pale wood top with a remote and mugs; Future Darkness, a dark slab with a lit panel.
    Great War (from 1920): a low oak table with a lace runner. The region's cloth or tray on it."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    shadow(tm, X0, Y0, X1, Y1, 3)
    sh = L.v.get("shape", "oblong")
    if e == MC and sh == "kidney":
        C = L.R(L.mt(mix((150, 96, 56), L.S["paint"], .25)), 18) if L.w >= 3 else L.plastic
        pts = [(X0 + 4, Y0 + 6), (cx, Y0 + 2), (X1 - 4, Y0 + 4), (X1 - 1, cy), (X1 - 6, Y1 - 2), (cx + 6, Y1 - 6), (cx - 10, Y1 - 1), (X0 + 2, Y1 - 6)]
        for lx, ly in ((X0 + 8, Y0 + 8), (X1 - 8, Y0 + 8), (cx, Y1 - 6)): leg(tm, lx, ly, C, 2, round_=True)
        d.polygon(pts, fill=C[2], outline=OUT); d.line([X0 + 8, Y0 + 6, cx, Y0 + 4], fill=C[4])
    else:
        C = tabletop(tm, B, L, big=False, round_=sh == "round")
    if L.st in ("islamic", "southasia", "steppe") and e <= MO: thing(tm, "tray", cx - 8, cy, L)
    elif L.w >= 2: d.rectangle([cx - 20, cy - 6, cx + 4, cy + 8], fill=L.dye()[2], outline=OUT); d.line([cx - 18, cy - 3, cx + 2, cy - 3], fill=WHITE[3]); d.line([cx - 18, cy + 1, cx - 2, cy + 1], fill=L.dye2()[3])   # a magazine
    thing(tm, "cup", cx + 14, cy - 4, L)
    if e == MC: d.ellipse([cx + 8, cy + 4, cx + 16, cy + 10], fill=GLASS[2], outline=OUT); d.line([cx + 12, cy + 7, cx + 18, cy + 6], fill=WHITE[4])   # an ashtray and a cigarette
    elif e == MO: d.rounded_rectangle([cx + 6, cy + 4, cx + 22, cy + 9], 2, fill=(40, 40, 44), outline=OUT)                                         # the remote
    if L.w >= 4 and e <= MC: motif(tm, (X0 + 6, Y0 + 3, X1 - 6, Y0 + 9), L, dense=1.3)
    finish(tm, snap, B, L)


sdef("coffeetable", _coffeetable, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "shape": ["oblong", "kidney", "round"]}, front=False,
     ref="coffee tables from the 1920s, 3 1/2 to 4 1/2 ft long, 18 to 24 in deep")


GAMES = {"central": "chess", "atlantic": "cards", "northern": "tafl", "mediterranean": "cards", "islamic": "tavla", "steppe": "dice", "southasia": "pachisi",
         "eastasia": "mahjong", "seasia": "dice", "africa": "mancala", "americas": "cards", "oceania": "dice", "polar": "dice"}


def game(tm, box, L, kind):
    """The game laid out on a card or gaming table, each region its own: cards and counters, chess, hnefatafl,
    backgammon, pachisi on its cross of cloth, mahjong tiles, a mancala board, dice and a cup."""
    d = tm.d; x0, y0, x1, y1 = (int(t) for t in box); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; s = min(x1 - x0, y1 - y0)
    if kind in ("chess", "tafl"):
        n = 8 if kind == "chess" else 9; q = max(2, (s - 8) // n); ox, oy = cx - n * q // 2, cy - n * q // 2
        for i in range(n):
            for j in range(n): d.rectangle([ox + i * q, oy + j * q, ox + i * q + q - 1, oy + j * q + q - 1], fill=(WHITE[3] if (i + j) % 2 else (60, 44, 34)) if kind == "chess" else (L.wood[3] if (i + j) % 2 else L.wood[1]))
        for i in (0, 1, n - 2, n - 1):
            for j in range(0, n, 2): d.rectangle([ox + j * q + 1, oy + i * q + 1, ox + j * q + q - 2, oy + i * q + q - 2], fill=(INK if i < 2 else WHITE[4]))
    elif kind == "tavla":
        d.rectangle([cx - s // 2 + 4, cy - s // 3, cx + s // 2 - 4, cy + s // 3], fill=L.wood[3], outline=OUT); d.line([cx, cy - s // 3, cx, cy + s // 3], fill=OUT, width=2)
        for k in range(6):
            for side in (-1, 1):
                px_ = cx - s // 2 + 7 + k * (s // 13) if side < 0 else cx + 3 + k * (s // 13)
                d.polygon([(px_, cy - s // 3 + 1), (px_ + 3, cy - 3), (px_ + 6, cy - s // 3 + 1)], fill=(L.dye()[2] if k % 2 else WHITE[3]))
                d.polygon([(px_, cy + s // 3 - 1), (px_ + 3, cy + 3), (px_ + 6, cy + s // 3 - 1)], fill=(WHITE[3] if k % 2 else L.dye()[2]))
    elif kind == "pachisi":
        w_ = s // 6; C = L.dye()
        d.rectangle([cx - w_, y0 + 3, cx + w_, y1 - 3], fill=C[2], outline=OUT); d.rectangle([x0 + 3, cy - w_, x1 - 3, cy + w_], fill=C[2], outline=OUT)
        for k in range(y0 + 6, y1 - 4, 5): d.line([cx - w_ + 1, k, cx + w_ - 1, k], fill=C[0])
        for k in range(x0 + 6, x1 - 4, 5): d.line([k, cy - w_ + 1, k, cy + w_ - 1], fill=C[0])
        d.rectangle([cx - w_, cy - w_, cx + w_, cy + w_], fill=GOLD[2], outline=OUT)
    elif kind == "mahjong":
        for side in range(4):
            for k in range(6):
                tx, ty = [(cx - 18 + k * 6, y0 + 4), (cx - 18 + k * 6, y1 - 12), (x0 + 4, cy - 18 + k * 6), (x1 - 12, cy - 18 + k * 6)][side]
                tw_, th_ = (5, 8) if side < 2 else (8, 5); d.rectangle([tx, ty, tx + tw_, ty + th_], fill=WHITE[3], outline=OUT); d.point((tx + 2, ty + 2), fill=(40, 120, 60) if k % 2 else (170, 40, 40))
    elif kind == "mancala":
        bc = L.wood; d.rounded_rectangle([x0 + 4, cy - 12, x1 - 4, cy + 12], 6, fill=bc[2], outline=OUT)
        for k in range(6):
            for yy in (cy - 6, cy + 6): hx = x0 + 10 + k * (x1 - x0 - 20) // 6; d.ellipse([hx - 3, yy - 3, hx + 3, yy + 3], fill=bc[0]); d.point((hx, yy), fill=WHITE[4])
    elif kind == "cards":
        for k, (dx, dy) in enumerate(((-14, -10), (8, -12), (-10, 10), (12, 8))):
            d.rectangle([cx + dx - 4, cy + dy - 6, cx + dx + 4, cy + dy + 6], fill=WHITE[4] if k % 2 else L.dye()[2], outline=OUT)
        for k in range(5): d.ellipse([cx - 4 + k * 2, cy - 2, cx + k * 2, cy + 2], fill=L.metal[3], outline=OUT)
    else:
        d.ellipse([cx - 8, cy - 8, cx + 4, cy + 4], fill=L.R((110, 80, 50), 14)[2], outline=OUT); d.ellipse([cx - 5, cy - 5, cx + 1, cy + 1], fill=OUT)
        for k, (dx, dy) in enumerate(((8, 4), (12, -4), (4, 10))): d.rectangle([cx + dx, cy + dy, cx + dx + 4, cy + dy + 4], fill=BONE[3], outline=OUT); d.point((cx + dx + 2, cy + dy + 2), fill=OUT)


def _cardtable(tm, B, st, L, snap):
    """A card or gaming table from above: a square top with a baize or leather playing surface, a candle or lamp at
    the corners in older eras, coins or counters, and the region's game laid out: cards, chess, hnefatafl,
    backgammon, pachisi, mahjong tiles, a mancala board or dice. Victorian and later: a folding card table with green
    baize; Mid-Century: a vinyl-topped bridge table; Future Darkness: a dark top with a lit game grid."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e
    shadow(tm, X0, Y0, X1, Y1, 4)
    C = tabletop(tm, B, L, kind=("mahogany" if L.w >= 4 else "oak") if AR <= e <= GW else None, big=False)
    if e < FD:
        bz = L.R(L.mt((44, 100, 60) if L.st in ("atlantic", "central", "northern", "americas", "mediterranean") else mix(L.S["paint"], (40, 40, 40), .3)), 12)
        d.rectangle([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], fill=bz[2], outline=bz[0])
    else: d.rectangle([X0 + 7, Y0 + 7, X1 - 7, Y1 - 7], fill=L.comp[0], outline=L.glow[2])
    game(tm, (X0 + 8, Y0 + 8, X1 - 8, Y1 - 8), L, L.v.get("game") or GAMES[L.st])
    if e <= GW:
        for cx_, cy_ in ((X0 + 4, Y0 + 4), (X1 - 4, Y1 - 4)): thing(tm, "candle" if e <= AR else "lamp", cx_, cy_, L, .7)
    if L.w >= 4: border(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), L.metal)
    if L.e == GW: era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("cardtable", _cardtable, nvar=26, axes={"material": MATERIALS, "colour": COLOURS, "game": [None, "cards", "dice"]}, front=False,
     ref="card and games tables, about 3 ft square")


def _maptable(tm, B, st, L, snap):
    """A map table from above: a big top with a map spread on it, held flat by weights, dividers and a rule laid on
    it, a candle or lamp. Dark Ages to Age of Reason: a vellum or paper chart with its coastlines and a compass rose,
    drawn in the region's manner (a portolan, an Islamic world map, a Chinese grid map); Victorian and the wars: a
    printed staff map with pins and flags; Mid-Century: a plotting table under glass; Modern: a light table with a
    printout and a laptop; Future Darkness: a lit plan table with a glowing city plan."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 5)
    tabletop(tm, B, L, kind="joined" if e <= AR else None)
    m = (X0 + 10, Y0 + 8, X1 - 10, Y1 - 8)
    if e == FD:
        d.rectangle(list(m), fill=(20, 40, 50), outline=L.glow[2])
        for gx in range(m[0] + 6, m[2], 10): d.line([gx, m[1] + 2, gx, m[3] - 2], fill=L.glow[0])
        for gy in range(m[1] + 6, m[3], 10): d.line([m[0] + 2, gy, m[2] - 2, gy], fill=L.glow[0])
        for k in range(max(1, (m[2] - m[0] - 24) // 22)): bx = m[0] + 10 + k * 22; d.rectangle([bx, m[1] + 10 + (k % 3) * 9, bx + 14, m[1] + 18 + (k % 3) * 9], outline=L.glow[2])
    else:
        P_ = L.R(mix((226, 210, 170) if e <= AR else (230, 226, 210), L.S["paint"], .3), 10)
        d.rectangle(list(m), fill=P_[3], outline=OUT)
        sea = L.R(mix((150, 186, 196) if e >= VI else (190, 196, 170), L.S["dyes"][L.col], .35), 10)
        d.polygon([(m[0] + 1, m[1] + 1), (m[0] + W // 3, m[1] + 1), (m[0] + W // 4, m[1] + H // 3), (m[0] + W // 3, m[3] - 1), (m[0] + 1, m[3] - 1)], fill=sea[2])   # the sea and the coast
        d.line([(m[0] + W // 3, m[1] + 1), (m[0] + W // 4, m[1] + H // 3), (m[0] + W // 3, m[3] - 1)], fill=(110, 80, 60), width=2)
        rx, ry = m[0] + W // 6, m[1] + H // 3                                    # the compass rose and rhumb lines
        if e <= AR:
            RR = min(W // 6, H // 3) - 3
            for a in range(0, 360, 45): ra = math.radians(a); d.line([rx, ry, rx + math.cos(ra) * RR, ry + math.sin(ra) * RR], fill=L.dye()[2])
        d.ellipse([rx - 5, ry - 5, rx + 5, ry + 5], fill=L.dye()[3], outline=OUT); d.line([rx, ry - 8, rx, ry + 8], fill=OUT)
        for k in range(4):                                                       # towns, roads, pins
            tx, ty = m[0] + W // 2 + k * (W // 12), m[1] + 12 + (k * 13) % max(1, H - 34)
            d.rectangle([tx, ty, tx + 3, ty + 3], fill=(150, 40, 40)); d.line([tx + 2, ty + 2, tx + 10, ty + 9], fill=(130, 100, 70))
        if e in (VI, GW, MC):
            for k in range(5): fx, fy = m[0] + W // 3 + (k * 23) % max(1, W // 2 - 20), m[1] + 10 + (k * 17) % max(1, H - 30); d.line([fx, fy, fx, fy - 6], fill=OUT); d.rectangle([fx, fy - 6, fx + 5, fy - 3], fill=(L.dye() if k % 2 else L.dye2())[3])
        if L.st == "eastasia": [d.line([gx, m[1] + 2, gx, m[3] - 2], fill=P_[1]) for gx in range(m[0] + 8, m[2], 10)]
        if L.st == "islamic": d.ellipse([m[0] + W // 2 - 20, m[1] + 6, m[0] + W // 2 + 20, m[3] - 6], outline=L.dye()[2], width=2)
        if L.w >= 4: border(tm, m, L.metal)
        for wx, wy in ((m[0] + 2, m[1] + 2), (m[2] - 2, m[3] - 2)): d.ellipse([wx - 4, wy - 4, wx + 4, wy + 4], fill=L.metal[2], outline=OUT)   # weights
        d.line([m[2] - 30, m[1] + 10, m[2] - 14, m[1] + 30], fill=L.metal[3], width=2); d.line([m[2] - 30, m[1] + 10, m[2] - 22, m[1] + 32], fill=L.metal[3], width=2)   # the dividers
    thing(tm, "candle" if e <= AR else "lamp", X1 - 8, Y0 + 8, L)
    if e == MO: d.rectangle([X0 + 6, Y1 - 22, X0 + 34, Y1 - 6], fill=(50, 50, 56), outline=OUT); d.rectangle([X0 + 8, Y1 - 20, X0 + 32, Y1 - 12], fill=L.glow[1])   # a laptop
    if L.e in (LN, RE): era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("maptable", _maptable, nvar=20, front=False, ref="chart and plan tables, 5 to 7 ft by 3 1/2 to 4 1/2 ft")


# ---------------------------------------------------------------- desks and readers
def _desk(tm, B, st, L, snap):
    """A desk from above, the writer's side toward the south. Renaissance: a table desk with a sloped writing box,
    papers, an inkhorn and quill; Age of Reason: a slant-front bureau, its fall shut, or open on its pigeonholes;
    Victorian: a pedestal desk with a tooled leather top, a brass inkstand and a lamp; Great War: an oak roll-top with
    a typewriter; Mid-Century: a steel or teak desk with a telephone, a typewriter and a blotter; Modern: a computer
    screen, keyboard and mouse on a laminate top; Future Darkness: a dark desk with a lit screen set in it. Open: the
    drawers pulled out toward the south and what they keep (papers, a purse, a pistol, a bottle). From 1990 the desk is mass-made and the same the world over: a computer workstation, a steel office desk or a laptop on a mat, in the maker's finish."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    shadow(tm, X0, Y0, X1, Y1, 5)
    dr_ = 10 if st == "open" else 0
    top = (X0, Y0, X1, Y1 - dr_)
    kind = {RE: "joined", AR: "joined", VI: "mahogany", GW: "oak", MC: "teak" if L.w >= 4 else "formica", MO: "veneer", FD: "composite"}[e]
    if e == MC and L.w <= 3: kind = "steel"
    if kind == "steel": C = L.R(L.mt(mix((120, 130, 120), L.S["paint"], .4)), 14); d.rounded_rectangle(list(top), 3, fill=C[2], outline=OUT); d.line([X0 + 3, Y0 + 2, X1 - 3, Y0 + 2], fill=C[4])
    else: C = tabletop(tm, top, L, kind=kind)
    if st == "open":                                                             # the drawers pulled out, their goods showing
        for dx0 in (X0 + 4, X1 - W // 3 - 2):
            d.rectangle([dx0, Y1 - dr_ - 4, dx0 + W // 3 - 2, Y1], fill=C[1], outline=OUT); d.rectangle([dx0 + 2, Y1 - dr_ - 2, dx0 + W // 3 - 4, Y1 - 2], fill=tone(C[0], -20))
            d.rectangle([dx0 + 4, Y1 - dr_ - 1, dx0 + 12, Y1 - 3], fill=PAPER[3]); d.ellipse([dx0 + 15, Y1 - dr_ - 1, dx0 + 21, Y1 - 3], fill=L.metal[3] if dx0 < cx else (60, 90, 60))
    if e in (VI, GW) and L.w >= 3:                                              # the tooled leather writing surface
        lc = L.R(L.mt(mix((60, 90, 60), L.S["paint"], .4)), 14); d.rectangle([X0 + W // 6, Y0 + 6, X1 - W // 6, Y1 - dr_ - 6], fill=lc[2], outline=GOLD[1])
    if e == RE:
        d.polygon([(cx - 18, Y0 + 4), (cx + 18, Y0 + 4), (cx + 20, Y0 + 22), (cx - 20, Y0 + 22)], fill=C[3], outline=OUT); thing(tm, "papers", cx, Y0 + 30, L); thing(tm, "inkwell", X1 - 14, Y0 + 10, L)
    elif e == AR:
        if L.v.get("fall", "shut") == "open":
            d.rectangle([X0 + 4, Y0 + 2, X1 - 4, Y0 + 14], fill=C[1], outline=OUT)
            for gx in range(X0 + 8, X1 - 8, 9): d.rectangle([gx, Y0 + 4, gx + 6, Y0 + 12], fill=tone(C[0], -18), outline=C[3]); d.rectangle([gx + 1, Y0 + 6, gx + 5, Y0 + 11], fill=PAPER[3])
            thing(tm, "papers", cx, Y0 + 28, L); thing(tm, "inkwell", X1 - 12, Y0 + 24, L)
        else:
            d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y0 + H // 2], fill=C[3], outline=OUT); d.line([X0 + 4, Y0 + 3, X1 - 4, Y0 + 3], fill=C[4]); knob(tm, cx, Y0 + H // 2 - 3, L.metal, 2)
            if L.w >= 4: motif(tm, (X0 + 8, Y0 + 6, X1 - 8, Y0 + H // 2 - 6), L, C=L.dye(), A=L.metal, dense=1.2)
    elif e == VI:
        thing(tm, "inkwell", cx - 10, Y0 + 9, L); thing(tm, "lamp", X0 + 10, Y0 + 10, L); thing(tm, "papers", cx + 14, Y0 + 24, L); thing(tm, "book", X1 - 12, Y0 + 14, L)
    elif e == GW:
        d.rectangle([X0 + 2, Y0 + 1, X1 - 2, Y0 + 10], fill=C[1], outline=OUT)                 # the roll-top's tambour
        for gx in range(X0 + 4, X1 - 3, 3): d.line([gx, Y0 + 2, gx, Y0 + 9], fill=C[3])
        d.rectangle([cx - 14, Y0 + 16, cx + 14, Y0 + 34], fill=(40, 40, 44), outline=OUT)          # the typewriter: keys and roller
        d.rectangle([cx - 16, Y0 + 14, cx + 16, Y0 + 18], fill=(70, 70, 76), outline=OUT)
        for kx in range(cx - 11, cx + 12, 4):
            for ky in (Y0 + 23, Y0 + 28): d.point((kx, ky), fill=WHITE[3])
        thing(tm, "papers", X1 - 18, Y0 + 26, L)
    elif e == MC:
        d.rectangle([X0 + 8, Y0 + 8, X0 + 36, Y0 + 24], fill=L.dye()[2], outline=OUT)            # the blotter
        d.rounded_rectangle([X1 - 26, Y0 + 6, X1 - 8, Y0 + 20], 3, fill=(36, 34, 36), outline=OUT); d.ellipse([X1 - 21, Y0 + 9, X1 - 13, Y0 + 17], fill=WHITE[2])   # the telephone's dial
        d.rectangle([cx - 10, Y0 + 24, cx + 14, Y0 + 38], fill=L.plastic[1], outline=OUT); d.line([cx - 8, Y0 + 27, cx + 12, Y0 + 27], fill=WHITE[3])
    elif e == MO and L.pick(["workstation", "steel", "laptop"], "model") == "steel":   # a steel office desk: in-tray, telephone, files
        d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - dr_ - 2], fill=L.R(mix((150, 152, 150), L.S["paint"], .5), 12)[2], outline=OUT)
        d.rectangle([X0 + 6, Y0 + 5, X0 + 26, Y0 + 19], fill=L.plastic[1], outline=OUT); d.rectangle([X0 + 8, Y0 + 7, X0 + 24, Y0 + 15], fill=PAPER[3])
        d.rounded_rectangle([X1 - 24, Y0 + 5, X1 - 8, Y0 + 17], 3, fill=(36, 34, 36), outline=OUT); thing(tm, "papers", cx, Y0 + 26, L)
        for k in range(3): d.rectangle([cx + 16 + k * 3, Y0 + 20, cx + 18 + k * 3, Y0 + 36], fill=L.dye()[2 + k % 2], outline=OUT)
    elif e == MO and L.pick(["workstation", "steel", "laptop"], "model") == "laptop":   # a laptop on a desk mat, a lamp
        d.rounded_rectangle([X0 + 10, Y0 + 6, X1 - 10, Y1 - dr_ - 6], 4, fill=L.plastic[2], outline=OUT)
        d.rectangle([cx - 14, Y0 + 10, cx + 14, Y0 + 28], fill=(60, 62, 66), outline=OUT); d.rectangle([cx - 12, Y0 + 12, cx + 12, Y0 + 26], fill=(150, 152, 156))
        d.ellipse([X0 + 4, Y0 + 3, X0 + 16, Y0 + 15], fill=L.plastic[3], outline=OUT); thing(tm, "cup", X1 - 14, Y0 + 14, L)
    elif e == MO:
        d.rectangle([cx - 20, Y0 + 3, cx + 20, Y0 + 9], fill=(30, 30, 34), outline=OUT); d.rectangle([cx - 18, Y0 + 4, cx + 18, Y0 + 7], fill=L.R((90, 140, 190), 12)[3])   # the screen seen from above
        d.rectangle([cx - 16, Y0 + 20, cx + 16, Y0 + 28], fill=PLASTIC_GREY[2] if L.w >= 3 else (40, 40, 44), outline=OUT)
        for kx in range(cx - 14, cx + 15, 3): d.line([kx, Y0 + 22, kx, Y0 + 26], fill=PLASTIC_GREY[0] if L.w >= 3 else (80, 80, 86))
        d.ellipse([cx + 22, Y0 + 21, cx + 28, Y0 + 28], fill=PLASTIC_GREY[3], outline=OUT); thing(tm, "cup", X0 + 12, Y0 + 14, L)
    else:                                                                       # a screen set in the top, a lit slab, or a curved screen with a mat
        m = {"workstation": "inset", "steel": "slab", "laptop": "curved"}[L.pick(["workstation", "steel", "laptop"], "model")]
        if m == "slab": d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - dr_ - 4], fill=L.plastic[1], outline=L.glow[2]); d.rectangle([cx - 14, Y0 + 10, cx + 14, Y0 + 24], fill=L.glow[0], outline=L.glow[2])
        elif m == "curved":
            d.arc([X0 + 6, Y0 + 2, X1 - 6, Y0 + 30], 200, 340, fill=L.glow[2], width=4); d.rounded_rectangle([X0 + 14, Y0 + 20, X1 - 14, Y1 - dr_ - 6], 4, fill=L.plastic[2], outline=OUT)
        else:
            d.rectangle([X0 + 8, Y0 + 6, X1 - 8, Y0 + 22], fill=L.glow[0], outline=L.glow[2])
            for k in range(Y0 + 9, Y0 + 20, 3): d.line([X0 + 11, k, X0 + 11 + (k * 7) % 40, k], fill=L.glow[2])
    if L.rich and e <= VI: border(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - dr_ - 2), L.metal)
    finish(tm, snap, top, L)


sdef("desk", _desk, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "fall": ["shut", "open"], "model": ["workstation", "steel", "laptop"]}, global_from=1990, states=("closed", "open"), openable="chest",
     front=True, clear=2, ref="writing desks and pedestal desks, 4 to 5 ft by 2 to 2 1/2 ft")


def _writingslope(tm, B, st, L, snap):
    """A scriptorium desk or writing slope from above: its tilted board (seen foreshortened, darker at the top
    edge), a manuscript pinned on it with its ruled lines and a coloured initial, the inkhorn in its hole, quills and a
    penknife, a candle. The Islamic world: a low rahle with a Qur'an and a reed pen; East Asia: a writing table with
    inkstone, brush and scroll; South Asia: a low desk with palm-leaf pages."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx = (X0 + X1) // 2
    shadow(tm, X0, Y0, X1, Y1, 5)
    C = L.paint if L.st in ("eastasia", "steppe") and L.w >= 3 else (L.tw if L.w >= 2 else L.wood)
    slab(tm, X0, Y0, X1, Y1, C, "x", rng=tm.rng)
    if L.st == "eastasia":                                                      # an inkstone, brushes and a scroll
        d.rectangle([X0 + 8, Y0 + 8, X0 + 22, Y0 + 24], fill=(50, 50, 56), outline=OUT); d.ellipse([X0 + 11, Y0 + 11, X0 + 19, Y0 + 17], fill=INK)
        for k in range(3): d.line([X0 + 28 + k * 4, Y0 + 6, X0 + 28 + k * 4, Y0 + 24], fill=L.R((180, 150, 90), 12)[2], width=2)
        d.rectangle([cx - 4, Y0 + 26, X1 - 6, Y1 - 6], fill=PAPER[4], outline=OUT)
        for gx in range(cx, X1 - 8, 5): d.line([gx, Y0 + 29, gx, Y1 - 10], fill=INK)
    elif L.st == "southasia":
        for k in range(3): d.rounded_rectangle([X0 + 8, Y0 + 10 + k * 10, X1 - 8, Y0 + 16 + k * 10], 2, fill=L.R((200, 176, 110), 10)[2 + k % 2], outline=OUT); d.line([X0 + 12, Y0 + 13 + k * 10, X1 - 12, Y0 + 13 + k * 10], fill=INK)
    else:
        sl = (X0 + 6, Y0 + 4, X1 - 6, Y1 - 12)                                  # the slope, a lip along its foot
        d.rectangle(list(sl), fill=C[3], outline=OUT); d.line([sl[0] + 1, sl[1] + 1, sl[2] - 1, sl[1] + 1], fill=C[1]); d.rectangle([sl[0], sl[3] - 3, sl[2], sl[3]], fill=C[1], outline=OUT)
        pg = (sl[0] + 6, sl[1] + 4, sl[2] - 6, sl[3] - 5); d.rectangle(list(pg), fill=PAPER[4], outline=OUT)
        for ly in range(pg[1] + 4, pg[3] - 2, 3): d.line([pg[0] + 4, ly, pg[2] - 4, ly], fill=(120, 110, 100) if L.st != "islamic" else (60, 50, 50))
        if L.w >= 3: d.rectangle([pg[0] + 3, pg[1] + 3, pg[0] + 10, pg[1] + 10], fill=L.dye()[3], outline=GOLD[2])               # the coloured initial
        if L.st == "islamic": border(tm, pg, GOLD)
        if L.w >= 4: motif(tm, (sl[0] + 1, sl[3] - 3, sl[2] - 1, sl[3] - 1), L, dense=1.6)
    thing(tm, "inkwell", X1 - 10, Y1 - 6, L, .8); d.line([X0 + 8, Y1 - 5, X0 + 26, Y1 - 9], fill=WHITE[4], width=2)    # the inkhorn and a quill
    thing(tm, "candle", X0 + 8, Y0 + 8, L, .7)
    era_mark(tm, (X0, Y1 - 12, X1, Y1), L, "wood")
    finish(tm, snap, B, L)


sdef("writingslope", _writingslope, nvar=26, front=True, clear=2, ref="medieval scriptorium desks and writing slopes, about 2 1/2 to 3 ft wide")


def _lectern(tm, B, st, L, snap):
    """A lectern from above: the sloped book rest on its post with the great book open on it, its ribbon markers
    hanging. Rich churches have a brass eagle whose spread wings carry the book; others a wooden desk lectern, or a
    turned post with a stone foot. The Islamic world: a folding rahle in carved and inlaid wood holding the Qur'an; East
    Asia: a lacquered sutra stand; the synagogue's reading desk is draped. Modern: a light wooden or perspex lectern
    with a microphone; Future Darkness: a dark stand with a lit page."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    shadow(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 2, 4)
    base = L.wood if e < MO else (L.plastic if e == MO else L.comp)
    d.ellipse([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=base[1], outline=OUT); d.arc([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], 190, 260, fill=base[3])   # the foot
    if L.w >= 4 and L.st in ("atlantic", "central", "northern", "mediterranean") and e <= GW:
        M = L.fade(BRASS) if not L.prince else L.fade(GOLD)                      # the eagle: wings spread under the book, the head to the south
        d.polygon([(X0 + 2, cy - 2), (cx - 4, Y0 + 6), (cx + 4, Y0 + 6), (X1 - 2, cy - 2), (cx + 6, cy + 8), (cx - 6, cy + 8)], fill=M[2], outline=OUT)
        for k in range(4): d.line([X0 + 6 + k * 4, cy - 2 - k, cx - 4, Y0 + 8 + k], fill=M[1]); d.line([X1 - 6 - k * 4, cy - 2 - k, cx + 4, Y0 + 8 + k], fill=M[1])
        d.ellipse([cx - 4, cy + 6, cx + 4, cy + 14], fill=M[3], outline=OUT); d.point((cx, cy + 14), fill=M[0])
        bk = (cx - 13, Y0 + 6, cx + 13, cy + 4)
    else:
        if L.st == "islamic":                                                    # the X of a rahle
            d.line([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=OUT, width=5); d.line([X1 - 6, Y0 + 6, X0 + 6, Y1 - 6], fill=OUT, width=5)
            d.line([X0 + 6, Y0 + 6, X1 - 6, Y1 - 6], fill=L.wood[3], width=3); d.line([X1 - 6, Y0 + 6, X0 + 6, Y1 - 6], fill=L.wood[3], width=3)
        C = L.paint if L.st in ("eastasia",) or L.w >= 3 else (L.tw if e < MC else (L.plastic if e < FD else base))
        d.rectangle([X0 + 5, Y0 + 4, X1 - 5, Y1 - 10], fill=C[3], outline=OUT); d.line([X0 + 6, Y0 + 5, X1 - 6, Y0 + 5], fill=C[1]); d.rectangle([X0 + 5, Y1 - 13, X1 - 5, Y1 - 10], fill=C[1], outline=OUT)
        if L.w >= 3 and e < MO: motif(tm, (X0 + 6, Y1 - 12, X1 - 6, Y1 - 10), L, dense=2)
        bk = (X0 + 10, Y0 + 7, X1 - 10, Y0 + 7 + (Y1 - Y0) * 2 // 5)
    if L.v.get("fall", "fall") == "fall" and e < FD:                            # the fall: a cloth hung down the front in the cover colour
        fc = L.cover(L.paint, .3); d.rectangle([cx - 9, Y1 - 13, cx + 9, Y1 - 2], fill=fc[2], outline=OUT); fringe(tm, cx - 8, cx + 8, Y1 - 3, L.dye2(), 2)
        if L.w >= 2: d.line([cx, Y1 - 12, cx, Y1 - 4], fill=L.metal[3]); d.line([cx - 3, Y1 - 9, cx + 3, Y1 - 9], fill=L.metal[3])
    if e == MO:
        d.rectangle(list(bk), fill=L.dye()[2], outline=OUT); d.rectangle([bk[0] + 3, bk[1] + 2, bk[2] - 3, bk[3] - 2], fill=PAPER[4]); d.line([cx, Y1 - 12, cx + 2, Y0 + 2], fill=(40, 40, 44), width=2); d.ellipse([cx, Y0, cx + 5, Y0 + 5], fill=(40, 40, 44))   # notes and a microphone
    elif e == FD: d.rectangle(list(bk), fill=L.glow[0], outline=L.glow[2]); [d.line([bk[0] + 3, k, bk[2] - 3, k], fill=L.glow[2]) for k in range(bk[1] + 3, bk[3] - 2, 3)]
    else:
        d.rectangle(list(bk), fill=PAPER[4], outline=OUT); d.line([(bk[0] + bk[2]) // 2, bk[1], (bk[0] + bk[2]) // 2, bk[3]], fill=PAPER[0])   # the open book
        for ly in range(bk[1] + 3, bk[3] - 2, 3): d.line([bk[0] + 2, ly, (bk[0] + bk[2]) // 2 - 2, ly], fill=(110, 100, 90)); d.line([(bk[0] + bk[2]) // 2 + 2, ly, bk[2] - 2, ly], fill=(110, 100, 90))
        if L.w >= 3: border(tm, bk, GOLD if L.st == "islamic" or L.prince else L.dye())
        for k, mk in enumerate((L.dye(), L.dye2())): d.line([(bk[0] + bk[2]) // 2 - 2 + k * 3, bk[3], (bk[0] + bk[2]) // 2 - 3 + k * 4, bk[3] + 8], fill=mk[2], width=2)   # ribbon markers
    if e <= VI: era_mark(tm, (X0 + 5, Y0 + 4, X1 - 5, Y1 - 10), L, "wood")
    if e == GW:                                                                  # an electric reading lamp, its green glass shade
        d.line([X0 + 6, Y0 + 6, X0 + 12, Y0 + 10], fill=BRASS[3], width=2); d.ellipse([X0 + 2, Y0 + 1, X0 + 12, Y0 + 9], fill=(50, 120, 70), outline=OUT); d.point((X0 + 5, Y0 + 3), fill=(150, 220, 160))
    elif e == MC:                                                                # a gooseneck microphone
        d.line([X1 - 8, Y1 - 12, X1 - 12, Y0 + 6], fill=CHROME[3], width=2); d.ellipse([X1 - 16, Y0 + 2, X1 - 8, Y0 + 9], fill=(40, 40, 44), outline=OUT)
    finish(tm, snap, (X0 + 4, Y0 + 4, X1 - 4, Y1 - 4), L, corner=0)


sdef("lectern", _lectern, nvar=39, axes={"material": MATERIALS, "colour": COLOURS, "fall": ["fall", "bare", "fall"]}, front=True, clear=2, ref="desk and eagle lecterns, the book rest about 2 ft across")


# ---------------------------------------------------------------- counters and bars
def counter_top(tm, box, L):
    """A long counter's top for its era: boards, polished wood, marble, glass case, laminate, composite."""
    d = tm.d; x0, y0, x1, y1 = box; e = L.e
    if e <= LN: return tabletop(tm, box, L, kind="plank")
    if e <= AR: return tabletop(tm, box, L, kind="joined" if L.w >= 3 else "plank")
    if e in (VI, GW):
        if L.w >= 4:                                                            # a marble top
            M = L.R(L.mt(mix((226, 222, 212), L.S["paint"], .2)), 10); d.rectangle(list(box), fill=M[3], outline=OUT)
            for k in range(x0 + 8, x1 - 8, 17): d.line([k, y0 + 3, k + 9, y1 - 3], fill=M[1])
            return M
        return tabletop(tm, box, L, kind="mahogany" if L.w >= 3 else "pine")
    return tabletop(tm, box, L, kind={MC: "formica", MO: "veneer", FD: "composite"}[e])


def _counter(tm, B, st, L, snap):
    """A shop counter from above, the customer's side toward the south: Dark Ages and Long Night, a shutter board let
    down on trestles with goods set out; Renaissance and Age of Reason, a joined counter with scales and coin; Victorian
    and Great War, mahogany or marble with brass scales, a glass case of goods and a till; Mid-Century, formica with a
    cash register; Modern, a laminate counter with a till screen and card reader; Future Darkness, a dark counter with
    a lit pay panel. Each region weighs its own goods: spices, cloth, tea, brass."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0
    shadow(tm, X0, Y0, X1, Y1, 4)
    C = counter_top(tm, B, L)
    if e >= VI and L.w >= 2:                                                    # a glass case of goods at one end
        gx0, gx1 = X1 - W // 3, X1 - 4; d.rectangle([gx0, Y0 + 3, gx1, Y1 - 3], fill=GLASS[2], outline=OUT)
        for k, gx in enumerate(range(gx0 + 5, gx1 - 4, 9)): d.rectangle([gx, Y0 + 8, gx + 6, Y1 - 8], fill=(L.dye(), L.dye2(), L.R((210, 180, 90), 12))[k % 3][2], outline=OUT)
        d.line([gx0 + 2, Y0 + 5, gx0 + 12, Y0 + 5], fill=WHITE[4])
    if e <= GW:                                                                 # the scales: beam and two pans
        sx = X0 + W // 3; M = L.metal
        d.line([sx - 12, (Y0 + Y1) // 2, sx + 12, (Y0 + Y1) // 2], fill=M[3], width=2)
        for px_ in (sx - 12, sx + 12): d.ellipse([px_ - 6, (Y0 + Y1) // 2 - 6, px_ + 6, (Y0 + Y1) // 2 + 6], fill=M[2], outline=OUT)
        d.ellipse([sx + 8, (Y0 + Y1) // 2 - 3, sx + 15, (Y0 + Y1) // 2 + 3], fill=L.dye()[3])                # what is weighed
    if e in (VI, GW, MC):                                                       # the till or cash register
        tx = X0 + 10; d.rectangle([tx, Y0 + 4, tx + 18, Y0 + 20], fill=(L.fade(BRASS) if e <= GW else CHROME)[2], outline=OUT)
        for kx in range(tx + 3, tx + 16, 4): d.point((kx, Y0 + 14), fill=WHITE[4])
    elif e == MO: d.rectangle([X0 + 10, Y0 + 4, X0 + 30, Y0 + 16], fill=(40, 40, 44), outline=OUT); d.rectangle([X0 + 12, Y0 + 6, X0 + 28, Y0 + 12], fill=L.R((90, 150, 190), 12)[3])
    elif e == FD: d.rectangle([X0 + 10, Y0 + 4, X0 + 30, Y0 + 16], fill=L.glow[0], outline=L.glow[2])
    else:                                                                       # coin and a tally stick
        for k in range(4): d.ellipse([X0 + 10 + k * 5, Y0 + 6, X0 + 14 + k * 5, Y0 + 10], fill=L.metal[3], outline=OUT)
        d.line([X0 + 10, Y1 - 8, X0 + 34, Y1 - 8], fill=L.wood[4], width=3)
    for k, x in enumerate(range(X0 + W // 2 - 10, X1 - W // 3 - 6 if e >= VI else X1 - 10, 14)):   # goods on the counter
        thing(tm, ("bowl", "bottle", "book", "bread", "jug", "apple")[(k + len(L.st)) % 6], x, (Y0 + Y1) // 2, L, .8)
    if L.w >= 3 and e < MO: motif(tm, (X0 + 4, Y1 - 6, X1 - 4, Y1 - 3), L, dense=1.4)
    era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("counter", _counter, front=True, clear=2.5, ref="shop counters and boards, 6 to 10 ft long, 2 to 3 ft deep")


def _bar(tm, B, st, L, snap):
    """A bar with its shelves from above: the long counter toward the room (south), the barman's walk behind it, and
    against the north wall the back bar's shelves of bottles and glasses. Victorian: a mahogany bar with a brass foot
    rail, beer engine pulls and a mirror-backed gantry; Great War: the same, darker; Mid-Century: a formica and chrome
    bar with taps and a till; Modern: a lit back bar and steel taps; Future Darkness: a dark lit counter and glowing
    shelves. Each region pours its own: raki, sake, palm wine, tea."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; H = Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 4)
    sh = (X0, Y0, X1, Y0 + int(H * .28))                                         # the back bar's shelves
    C = L.tw if e <= GW else (L.plastic if e < FD else L.comp)
    d.rectangle(list(sh), fill=C[1], outline=OUT); d.line([X0 + 1, sh[3] - 2, X1 - 1, sh[3] - 2], fill=C[3])
    if e <= GW: d.rectangle([X0 + 3, Y0 + 2, X1 - 3, Y0 + 4], fill=GLASS[3])        # the mirror's top edge
    for k, bx in enumerate(range(X0 + 5, X1 - 4, 6)):                              # bottles and glasses in rows
        if k % 5 == 4: thing(tm, "glass", bx, sh[1] + 7, L); continue
        bc = (L.R((60, 110, 70), 14), L.R((140, 70, 30), 14), L.R((200, 200, 190), 10), L.dye())[k % 4]
        d.ellipse([bx - 2, sh[1] + 5, bx + 2, sh[1] + 9], fill=bc[2], outline=OUT); d.point((bx - 1, sh[1] + 6), fill=WHITE[4])
        d.ellipse([bx - 2, sh[1] + 11, bx + 2, sh[1] + 15], fill=(L.dye2() if k % 3 == 0 else bc)[2], outline=OUT)
    if e == FD: d.line([X0 + 2, sh[3] - 1, X1 - 2, sh[3] - 1], fill=L.glow[2])
    ct = (X0, Y0 + int(H * .55), X1, Y1 - 4)                                        # the counter itself
    counter_top(tm, ct, L)
    fp = L.cover(L.paint, .5) if e <= GW else L.plastic                            # the counter's panelled face toward the room
    d.rectangle([X0, ct[3] - 7, X1, ct[3]], fill=fp[2], outline=OUT)
    for px_ in range(X0 + 6, X1 - 6, 16): d.rectangle([px_, ct[3] - 6, px_ + 12, ct[3] - 1], outline=fp[0])
    d.rectangle([X0 + 1, sh[3] + 1, X1 - 1, ct[1] - 1], fill=L.R(L.mt(mix((120, 100, 80), L.S["paint"], .35)), 10)[1])   # the barman's walk
    rail = L.fade(BRASS) if e <= GW else (CHROME if e < FD else L.glow)
    d.line([X0 + 2, Y1 - 2, X1 - 2, Y1 - 2], fill=rail[2], width=2)                 # the foot rail
    for k, px_ in enumerate(range(X0 + 20, X0 + (X1 - X0) // 2, 12)):               # pulls or taps
        d.rectangle([px_, ct[1] + 2, px_ + 3, ct[1] + 8], fill=(BRASS[3] if e <= GW else CHROME[3]), outline=OUT)
        d.ellipse([px_ - 1, ct[1] - 2, px_ + 4, ct[1] + 3], fill=(L.dye() if k % 2 else L.dye2())[3] if e <= GW else (30, 30, 34), outline=OUT)
    for k, gx in enumerate(range(X0 + (X1 - X0) // 2 + 10, X1 - 10, 22)): thing(tm, "glass" if k % 2 else "cup", gx, (ct[1] + ct[3]) // 2, L)
    if L.w >= 3 and e <= MC: motif(tm, (X0 + 4, ct[3] - 5, X1 - 4, ct[3] - 2), L, dense=1.4)
    era_mark(tm, ct, L, "wood")
    finish(tm, snap, ct, L)


sdef("bar", _bar, front=True, clear=3, mount="wall", ref="public-house bars with their back bar, 10 to 14 ft long, about 3 ft from the shelves to the counter's face")


def _workbench(tm, B, st, L, snap):
    """A workbench against the wall, from above: a thick two-plank top with dog holes, a vice at the front left with
    its handle out toward the worker, tools laid ready (saw, plane, mallet, chisels), shavings on the floor before it.
    Dark Ages and Long Night: a split-log bench with pegs and a holdfast; Victorian on: a joiner's bench with an iron
    vice; Mid-Century: a steel bench with a pegboard of tools and a vice; Modern: a steel bench with power tools;
    Future Darkness: a dark bench with a lit tool rail. The region's own trades and tools lie on it."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; rng = tm.rng; H = Y1 - Y0
    Yt = Y1 - 12                                                                # the front strip is the floor with its shavings
    for _ in range(14):
        px_, py_ = rng.uniform(X0 + 4, X1 - 8), rng.uniform(Yt + 3, Y1 - 3); d.arc([px_ - 4, py_ - 3, px_ + 4, py_ + 3], 0, 250, fill=L.R((224, 200, 150), 10)[3])
    shadow(tm, X0, Y0, X1, Yt, 5)
    if e <= LN: C = L.wood; plank(tm, (X0, Y0, X1, Yt), L, C, "split")
    elif e <= GW: C = L.tw if e >= RE else L.wood; slab(tm, X0, Y0, X1, Yt, C, "x", knots=2, rng=rng, gaps=((Yt - Y0) // 2,))
    elif e < FD: C = L.R(L.mt(mix((110, 120, 126), L.S["paint"], .4)), 14); d.rectangle([X0, Y0, X1, Yt], fill=C[2], outline=OUT); d.line([X0 + 2, Y0 + 2, X1 - 2, Y0 + 2], fill=C[4])
    else: C = L.comp; d.rectangle([X0, Y0, X1, Yt], fill=C[1], outline=OUT); d.line([X0 + 2, Yt - 2, X1 - 2, Yt - 2], fill=L.glow[2])
    for xx in range(X0 + 20, X1 - 30, 26): d.rectangle([xx, Yt - 9, xx + 3, Yt - 6], fill=OUT)        # dog holes
    vx = X0 + 6; V_ = L.wood if e <= AR else IRON                                  # the vice and its handle
    d.rectangle([vx, Yt - 4, vx + 24, Yt + 4], fill=V_[2], outline=OUT); d.line([vx + 12, Yt + 4, vx + 12, Yt + 10], fill=V_[3], width=3); d.line([vx + 4, Yt + 9, vx + 20, Yt + 9], fill=V_[3], width=2)
    cx = (X0 + X1) // 2; Ir = L.fade(IRON); Wd = L.wood
    tools = L.v.get("trade", "joiner")
    if e >= MC:                                                                   # a pegboard strip at the back with tools on it
        d.rectangle([X0 + 2, Y0 + 1, X1 - 2, Y0 + 9], fill=L.R((170, 140, 100), 10)[2], outline=OUT)
        for k, tx in enumerate(range(X0 + 8, X1 - 6, 10)): d.line([tx, Y0 + 2, tx, Y0 + 8], fill=(L.dye() if k % 3 == 0 else Ir)[2], width=2)
    if tools == "joiner":
        d.polygon([(cx - 8, Y0 + 12), (cx + 26, Y0 + 12), (cx + 26, Y0 + 20), (cx - 8, Y0 + 24)], fill=Ir[3], outline=OUT); d.rectangle([cx - 18, Y0 + 12, cx - 8, Y0 + 24], fill=Wd[2], outline=OUT)   # saw
        d.rectangle([X1 - 40, Y0 + 12, X1 - 14, Y0 + 21], fill=Wd[3], outline=OUT); d.rectangle([X1 - 31, Y0 + 14, X1 - 25, Y0 + 19], fill=Ir[2])   # plane
        for k in range(3): d.line([cx + 6 + k * 7, Y0 + 27, cx + 6 + k * 7, Y0 + 38], fill=Ir[3], width=2); d.rectangle([cx + 5 + k * 7, Y0 + 36, cx + 8 + k * 7, Y0 + 41], fill=Wd[2])
    elif tools == "smith":
        d.polygon([(cx - 14, Y0 + 14), (cx + 10, Y0 + 14), (cx + 16, Y0 + 20), (cx + 10, Y0 + 26), (cx - 14, Y0 + 26)], fill=Ir[2], outline=OUT)        # tongs, hammers, a horseshoe
        d.line([cx + 20, Y0 + 16, cx + 40, Y0 + 30], fill=Wd[3], width=3); d.rectangle([cx + 16, Y0 + 12, cx + 26, Y0 + 18], fill=Ir[3], outline=OUT)
        d.arc([X0 + 40, Y0 + 14, X0 + 54, Y0 + 28], 30, 330, fill=Ir[3], width=3)
    else:                                                                         # a leatherworker's or tailor's: a hide, an awl, thread
        hc = L.R((160, 110, 70), 14); d.polygon([(cx - 24, Y0 + 12), (cx + 20, Y0 + 10), (cx + 28, Y0 + 30), (cx - 20, Y0 + 34)], fill=hc[2], outline=OUT)
        d.line([cx + 34, Y0 + 14, cx + 42, Y0 + 30], fill=Wd[3], width=2); d.ellipse([X1 - 30, Y0 + 14, X1 - 20, Y0 + 24], fill=L.dye()[2], outline=OUT)
    if e == MO: d.rectangle([X1 - 44, Yt - 18, X1 - 22, Yt - 6], fill=L.R((200, 120, 30), 14)[2] if L.st != "atlantic" else L.R((40, 90, 160), 14)[2], outline=OUT)   # a drill in its colours
    if e >= MC: era_mark(tm, (X0, Y0, X1, Yt), L, "wood")
    finish(tm, snap, (X0, Y0, X1, Yt), L)


sdef("workbench", _workbench, axes={"material": MATERIALS, "colour": COLOURS, "trade": ["joiner", "smith", "leather"]},
     ref="joiners' benches 6 to 8 ft by 2 to 2 1/2 ft, with the vice and the worker's place in front")


# ---------------------------------------------------------------- chamber and dining-room pieces
def _dressingtable(tm, B, st, L, snap):
    """A dressing table against the wall, from above: the mirror standing at the back (its glass edge-on, a bright
    line, in a carved, gilt or chrome frame), and on the top a hairbrush, a comb, scent bottles, a powder box and a
    jewel box on a runner. Age of Reason: a lacquered or veneered toilet table with a skirt; Victorian: mahogany with
    a swing mirror; Great War and Mid-Century: a kidney table or a veneered vanity with a triple mirror; Modern: a
    white laminate vanity; Future Darkness: a dark vanity with a lit mirror. The region's cosmetics: kohl pots, henna,
    rice powder."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0; cx = (X0 + X1) // 2
    shadow(tm, X0, Y0, X1, Y1, 4)
    kind = {AR: "joined", VI: "mahogany", GW: "oak", MC: "veneer", MO: "veneer", FD: "composite"}[e]
    C = tabletop(tm, B, L, kind=kind) if not (e == AR and L.w >= 4 and L.st in ("eastasia", "atlantic", "islamic")) else L.paint
    if C is L.paint: d.rectangle(list(B), fill=C[2], outline=OUT); motif(tm, (X0 + 4, Y0 + 4, X1 - 4, Y1 - 4), L, C=GOLD, A=GOLD, dense=1)
    if e in (AR, VI) and L.w >= 3: d.rectangle([X0 + 1, Y1 - 5, X1 - 1, Y1], fill=L.dye()[2], outline=OUT); fringe(tm, X0 + 2, X1 - 2, Y1 - 3, L.dye2(), 2)   # the skirt
    fw = W // 2 if e not in (GW, MC) else W - 16                                  # the mirror: a frame and its glass, the triple mirror wider
    F = L.metal if L.w >= 4 else (C if e < MO else CHROME)
    d.rectangle([cx - fw // 2, Y0 + 1, cx + fw // 2, Y0 + 7], fill=F[2], outline=OUT); d.line([cx - fw // 2 + 2, Y0 + 4, cx + fw // 2 - 2, Y0 + 4], fill=WHITE[4] if e < FD else L.glow[2], width=2)
    if e in (GW, MC):
        for k in (-1, 1): d.line([cx + k * fw // 6, Y0 + 2, cx + k * fw // 6, Y0 + 6], fill=OUT)
    rx0, rx1 = X0 + 6, X1 - 6                                                       # the runner and the things on it
    d.rectangle([rx0, Y0 + 11, rx1, Y1 - 7], fill=WHITE[3] if L.w <= 3 else L.dye2()[3], outline=WHITE[0])
    by = (Y0 + Y1) // 2 + 3
    d.rounded_rectangle([rx0 + 4, by - 3, rx0 + 22, by + 3], 2, fill=L.wood[3] if e < MC else L.dye()[3], outline=OUT); d.line([rx0 + 6, by, rx0 + 14, by], fill=L.wood[0])   # hairbrush
    for k, bx in enumerate(range(cx - 6, cx + 16, 7)): d.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=(GLASS if k % 2 else L.R(L.S["dyes"][COLOURS[k % 3]], 14))[3], outline=OUT); d.point((bx - 1, by - 1), fill=WHITE[4])   # scent bottles
    d.ellipse([rx1 - 16, by - 5, rx1 - 4, by + 5], fill=L.metal[2], outline=OUT); d.ellipse([rx1 - 13, by - 2, rx1 - 7, by + 2], fill=WHITE[4])   # the powder box
    finish(tm, snap, B, L)


sdef("dressingtable", _dressingtable, nvar=20, front=True, clear=2, ref="toilet tables and vanities, 3 to 4 1/2 ft wide, 18 to 24 in deep")


def _washstand(tm, B, st, L, snap):
    """A washstand against the wall, from above: its top (marble in a rich house, painted pine in a modest one) with
    the basin set in it or on it and the ewer beside, a soap dish, a towel on the rail at the side, a splashback along
    the wall. Full: water in the basin; empty: the basin dry, the ewer stood in it. Age of Reason: a corner or tripod
    stand holding a small bowl; Victorian and Great War: a marble-topped stand with a flowered set; Mid-Century: an
    enamel basin on a steel stand. The region's own ware: brass in the Islamic world and South Asia, blue-and-white in
    East Asia."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 + 2
    shadow(tm, X0, Y0, X1, Y1, 4)
    if L.w >= 4 and e >= VI: C = L.R(L.mt(mix((226, 222, 212), L.S["paint"], .4)), 10); d.rectangle(list(B), fill=C[3], outline=OUT); d.line([X0 + 6, Y0 + 3, X1 - 10, Y1 - 3], fill=C[1])
    elif e == MC: C = L.plastic; d.rectangle(list(B), fill=C[2], outline=OUT)
    else: C = L.tw if L.w >= 2 else L.wood; slab(tm, X0, Y0, X1, Y1, C, "x", rng=tm.rng)
    d.rectangle([X0, Y0, X1, Y0 + 5], fill=C[1], outline=OUT)                      # the splashback
    if L.w >= 3: motif(tm, (X0 + 2, Y0 + 1, X1 - 2, Y0 + 4), L, dense=1.8)
    d.line([X1 - 1, Y0 + 8, X1 - 1, Y1 - 4], fill=L.wood[3], width=2); cloth(tm, X1 - 6, Y0 + 10, X1 + 1, Y1 - 6, WHITE if L.w >= 2 else L.R(L.S["undyed"], 12), folds="x", n=1, rng=tm.rng)   # the towel
    B_, A_ = ware(L)
    if e == MC: B_, A_ = L.R(mix((236, 236, 232), L.S["paint"], .25), 6), L.dye()
    R = min(X1 - X0, Y1 - Y0) // 2 - 6
    d.ellipse([cx - R - 6, cy - R, cx + R - 6, cy + R], fill=B_[3], outline=OUT); d.ellipse([cx - R - 3, cy - R + 3, cx + R - 9, cy + R - 3], fill=B_[2], outline=A_[2])   # the basin
    if st == "full": d.ellipse([cx - R, cy - R + 5, cx + R - 12, cy + R - 5], fill=L.R((110, 150, 170), 10)[2]); d.arc([cx - R + 3, cy - R + 7, cx + R - 15, cy + R - 7], 200, 250, fill=WHITE[4])
    else: d.ellipse([cx - R + 2, cy - R + 6, cx + R - 14, cy + R - 6], fill=B_[1])
    ex, ey = (cx + R + 2, cy - 4) if st == "full" else (cx - 6, cy)                # the ewer: beside, or stood in the empty basin
    d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=B_[3], outline=OUT); d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=B_[1]); d.polygon([(ex - 6, ey - 1), (ex - 9, ey), (ex - 6, ey + 1)], fill=B_[2])
    if L.w >= 2: d.arc([ex - 4, ey - 4, ex + 4, ey + 4], 300, 60, fill=A_[3], width=2)
    d.rectangle([X0 + 3, Y1 - 9, X0 + 11, Y1 - 4], fill=B_[2], outline=OUT); d.rectangle([X0 + 5, Y1 - 8, X0 + 9, Y1 - 5], fill=L.R((230, 210, 160), 8)[3])   # soap
    era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("washstand", _washstand, nvar=24, states=("full", "empty"), front=True, clear=1.5, ref="washstands of the 18th to 20th c., 2 to 3 ft wide, 16 to 22 in deep")


def _sideboard(tm, B, st, L, snap):
    """A sideboard against the wall, from above: its long top with a runner and the dining room's silver and glass
    (decanters, a tureen, candlesticks, a fruit bowl), the doors toward the room. Open: the two doors swung out and the
    shelves of plates and linen showing between. Age of Reason: a serpentine mahogany sideboard with inlay; Victorian:
    a heavy carved one with a mirrored back; Mid-Century: a long low teak credenza; Modern: a lacquered board; Future
    Darkness: a dark unit with a lit seam. The region's own: brass trays, blue-and-white, carved teak."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0; cx = (X0 + X1) // 2
    dd = 9 if st == "open" else 0
    shadow(tm, X0, Y0, X1, Y1 - dd, 5)
    kind = {AR: "mahogany", VI: "mahogany", GW: "oak", MC: "teak", MO: "veneer", FD: "composite"}[e]
    C = tabletop(tm, (X0, Y0, X1, Y1 - dd), L, kind=kind)
    if e == VI: d.rectangle([X0 + 2, Y0, X1 - 2, Y0 + 5], fill=C[1], outline=OUT); d.line([X0 + 4, Y0 + 2, X1 - 4, Y0 + 2], fill=WHITE[4])   # the mirror back
    if e == AR and L.w >= 4: d.line([X0 + 3, Y1 - dd - 4, X1 - 3, Y1 - dd - 4], fill=L.metal[3]); motif(tm, (X0 + 6, Y1 - dd - 9, X1 - 6, Y1 - dd - 5), L, dense=1.4)
    d.rectangle([X0 + 10, Y0 + 7, X1 - 10, Y1 - dd - 7], fill=L.dye()[2] if L.w >= 4 else WHITE[3], outline=OUT)   # the runner
    my = (Y0 + Y1 - dd) // 2 + 1
    thing(tm, "candle", X0 + 16, my, L); thing(tm, "candle", X1 - 16, my, L)
    if L.st in ("islamic", "southasia", "steppe"): thing(tm, "tray", cx, my, L)
    elif L.st == "eastasia": thing(tm, "teapot", cx - 10, my, L); thing(tm, "bowl", cx + 12, my, L)
    else:
        thing(tm, "bowl", cx, my, L, 1.3)
        for a in range(0, 360, 90): ra = math.radians(a); thing(tm, "apple", int(cx + math.cos(ra) * 3), int(my + math.sin(ra) * 3), L)
        thing(tm, "bottle", cx - 22, my, L); thing(tm, "glass", cx + 22, my, L)
    if st == "open":                                                             # the doors swung out, plates and linen inside
        gy = Y1 - dd; d.rectangle([X0 + 4, gy - 8, X1 - 4, gy + 2], fill=tone(C[0], -18), outline=OUT)
        for k, gx in enumerate(range(X0 + 8, X1 - 8, 9)): (thing(tm, "plate", gx + 3, gy - 3, L, .5) if k % 3 else d.rectangle([gx, gy - 6, gx + 7, gy], fill=LINEN[3], outline=OUT))
        L_ = min(W // 4, 13)
        for hx, sg in ((X0, 1), (X1, -1)): d.polygon([(hx, gy), (hx + sg * 5, gy), (hx + sg * (5 + L_ // 3), gy + L_ - 4), (hx + sg * (L_ // 3), gy + L_ - 4)], fill=C[3], outline=OUT)
    else:
        for hx in (cx - 6, cx + 4): knob(tm, hx, Y1 - 3, L.metal, 2)
        d.line([cx, Y1 - 6, cx, Y1], fill=C[0])
    finish(tm, snap, (X0, Y0, X1, Y1 - dd), L)


sdef("sideboard", _sideboard, nvar=24, states=("closed", "open"), openable="chest", front=True, clear=2, back=0,
     ref="sideboards and credenzas, 5 to 7 ft long, 18 to 24 in deep")


# ---------------------------------------------------------------- tables of trades and offices
def _surgerytable(tm, B, st, L, snap):
    """A surgery or dissecting table from above: a long narrow top, a sheet or a stained board, the straps across it,
    the instruments laid on a cloth at its side, a bucket of sawdust beneath its foot. Dark Ages to Age of Reason: a
    scrubbed board on trestles, saws and knives, blood-stained; Victorian and Great War: a leather-padded table with
    a head rest, and a carbolic spray; Mid-Century: an enamelled steel table under its lamp; Modern: a steel morgue
    table with drain channels; Future Darkness: a dark table with a lit scan panel. From 1990 it is mass-made and the same the world over: a steel morgue table, an operating table or an examination couch."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cy = (Y0 + Y1) // 2
    shadow(tm, X0, Y0, X1, Y1, 4)
    if e <= AR: C = tabletop(tm, B, L, kind="plank")
    elif e <= GW: C = L.R(L.mt(mix((90, 50, 36), L.S["paint"], .5)), 14); legs4(tm, B, L.wood); d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 5, fill=C[2], outline=OUT); pad(tm, (X0 + 6, Y0 + 4, X0 + 26, Y1 - 4), C, r=4)   # the head rest
    elif e < FD:
        m = "-"; C = L.R(L.mt(mix((196, 200, 204), L.S["paint"], .45)), 16); d.rectangle(list(B), fill=C[2], outline=OUT); d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=C[0])
        m = L.pick(["morgue", "operating", "exam"], "model") if e == MO else "morgue"
        if m == "operating":                                                    # a padded top on its column, the arm boards out
            P_ = L.R(mix(L.S["paint"], (40, 40, 44), .3), 14); pad(tm, (X0 + 2, Y0 + 3, X1 - 2, Y1 - 3), P_, r=4, dimple=False)
            for ax in (X0 + (X1 - X0) // 3,): d.rectangle([ax, Y0 - 3, ax + 10, Y1 + 3], fill=P_[1], outline=OUT)
        elif m == "exam":                                                       # an examination couch, its paper roll down the middle
            P_ = L.plastic; pad(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), P_, r=5); pad(tm, (X0 + 2, Y0 + 2, X0 + 26, Y1 - 2), P_, r=5)
            d.rectangle([X0 + 8, Y0 + 7, X1 - 4, Y1 - 7], fill=WHITE[4], outline=WHITE[1]); d.ellipse([X1 - 8, Y0 + 5, X1 - 1, Y1 - 5], fill=WHITE[3], outline=OUT)
        elif e == MO:
            for gy in range(Y0 + 8, Y1 - 6, 6): d.line([X0 + 8, gy, X1 - 8, gy], fill=C[1])
            d.ellipse([X1 - 10, cy - 3, X1 - 4, cy + 3], fill=OUT)                # the drain
    else: C = L.comp; d.rounded_rectangle(list(B), 6, fill=C[1], outline=OUT); d.rectangle([X0 + 10, Y0 + 5, X1 - 10, Y1 - 5], outline=L.glow[2])
    if L.v.get("sheet", "sheet") == "sheet" and not (e == MO and m != "morgue"):                                     # a sheet over (the outline of what lies under it)
        cloth(tm, X0 + 20, Y0 + 3, X1 - 6, Y1 - 3, L.R(L.mt((214, 214, 204)) if e >= VI else (190, 180, 150), 10), folds="x", n=2, rng=tm.rng)
        d.ellipse([X0 + 22, cy - 6, X0 + 34, cy + 6], fill=L.R((214, 214, 204), 10)[3], outline=OUT)
    elif e <= GW:
        for bx in range(X0 + 20, X1 - 20, 26): tm.shade((bx, Y0 + 6, bx + 14, Y1 - 6), f=.6, kind="ellipse")                 # old stains
    for sx in (X0 + (X1 - X0) // 3, X1 - (X1 - X0) // 4):                          # the straps
        d.rectangle([sx, Y0 + 1, sx + 4, Y1 - 1], fill=L.R((90, 60, 40), 12)[2], outline=OUT); d.rectangle([sx, Y1 - 6, sx + 4, Y1 - 3], fill=STEEL[3])
    tx = X1 - 34                                                                  # instruments laid at the side
    d.rectangle([tx, Y1 - 12, tx + 26, Y1 - 2], fill=L.dye()[3] if L.w >= 3 else LINEN[2], outline=OUT)
    for k in range(4): d.line([tx + 3 + k * 6, Y1 - 10, tx + 3 + k * 6, Y1 - 4], fill=STEEL[4])
    era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("surgerytable", _surgerytable, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "sheet": ["sheet", "bare"], "model": ["morgue", "operating", "exam"]}, global_from=1990, front=False,
     ref="operating and dissecting tables, about 6 to 7 ft by 2 to 2 1/2 ft")


def _labbench(tm, B, st, L, snap):
    """A laboratory bench against the wall, from above. Age of Reason: an alchemist's or natural philosopher's
    bench with retorts, an alembic on its little furnace, flasks and a mortar; Victorian and Great War: a teak-topped
    bench with gas taps, Bunsen burners, test tubes in their rack, glass flasks; Mid-Century: black slate with a
    sink and a fume cupboard's edge; Modern: grey resin with a microscope and a computer; Future Darkness: a dark
    bench with lit sample bays. From 1990 it is mass-made and the same the world over: a wet bench, a dry bench of instruments or one with a fume hood."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0; cy = (Y0 + Y1) // 2
    shadow(tm, X0, Y0, X1, Y1, 5)
    if e <= AR: C = tabletop(tm, B, L, kind="joined")
    elif e <= GW: C = tabletop(tm, B, L, kind="oak" if e == VI else "teak")
    elif e == MC: C = L.R(L.mt(mix((50, 54, 60), L.S["paint"], .3)), 12); d.rectangle(list(B), fill=C[2], outline=OUT)
    elif e == MO: C = L.R(L.mt(mix((150, 156, 160), L.S["paint"], .55 if L.glob else .3)), 12); d.rectangle(list(B), fill=C[2], outline=OUT)
    else: C = L.comp; d.rectangle(list(B), fill=C[1], outline=OUT)
    if e >= VI:                                                                  # gas taps or services along the back
        for gx in range(X0 + 10, X1 - 6, 24): d.rectangle([gx, Y0 + 2, gx + 4, Y0 + 6], fill=(L.fade(BRASS) if e <= GW else CHROME)[3], outline=OUT)
    gl = L.R(mix((150, 200, 200), L.S["dyes"][L.col], .3), 14)
    if e <= AR:
        fx = X0 + 16; d.ellipse([fx - 10, cy - 10, fx + 10, cy + 10], fill=L.R((150, 80, 60), 14)[2], outline=OUT); d.ellipse([fx - 4, cy - 4, fx + 4, cy + 4], fill=(240, 150, 60))   # the furnace
        d.ellipse([fx + 4, cy - 8, fx + 18, cy + 4], fill=gl[2], outline=gl[0]); d.line([fx + 16, cy - 4, fx + 40, cy + 4], fill=gl[1], width=3)   # the retort's beak
        d.ellipse([fx + 36, cy, fx + 46, cy + 10], fill=gl[3], outline=gl[0])
        d.ellipse([X1 - 24, Y0 + 8, X1 - 8, Y0 + 22], fill=STONE[2], outline=OUT); d.ellipse([X1 - 20, Y0 + 12, X1 - 12, Y0 + 18], fill=STONE[0])   # mortar
        thing(tm, "book", X1 - 40, cy + 4, L); thing(tm, "candle", X0 + W // 2, Y0 + 9, L)
    else:
        rx = X0 + 12; d.rectangle([rx, cy - 5, rx + 24, cy + 5], fill=L.wood[2] if e <= MC else CHROME[2], outline=OUT)   # the test tube rack
        for k in range(5): d.ellipse([rx + 2 + k * 5, cy - 2, rx + 5 + k * 5, cy + 2], fill=(gl if k % 2 else L.R(L.S["dyes"][COLOURS[k % 3]], 14))[3])
        for k, fx in enumerate(range(X0 + W // 2 - 10, X0 + W // 2 + 30, 14)): d.ellipse([fx - 5, cy - 5, fx + 5, cy + 5], fill=gl[2], outline=gl[0]); d.ellipse([fx - 2, cy - 2, fx + 2, cy + 2], fill=(L.dye() if k % 2 else gl)[3])
        if e <= MC: d.ellipse([X1 - 30, Y0 + 10, X1 - 22, Y0 + 18], fill=IRON[2], outline=OUT); d.ellipse([X1 - 28, Y0 + 12, X1 - 24, Y0 + 16], fill=(80, 140, 230))   # a burner
        if e >= MC: d.rectangle([X1 - 22, cy + 2, X1 - 6, Y1 - 4], fill=STEEL[1], outline=OUT); d.ellipse([X1 - 16, cy + 8, X1 - 12, cy + 12], fill=OUT)   # the sink
        if e == MO: d.rectangle([X0 + W // 2 + 34, Y0 + 6, X0 + W // 2 + 48, Y0 + 18], fill=(40, 40, 44), outline=OUT); d.ellipse([X0 + W // 2 + 38, Y0 + 9, X0 + W // 2 + 44, Y0 + 15], fill=STEEL[3])   # microscope
        if e == FD:
            for bx in range(X0 + 8, X1 - 14, 20): d.rectangle([bx, Y1 - 12, bx + 12, Y1 - 4], fill=L.glow[0], outline=L.glow[2])
    if e >= MO:                                                                  # the fit-out: a wet bench as it is, a dry bench of instruments, a fume hood
        m = L.pick(["wet", "dry", "fume"], "model"); H = Y1 - Y0
        if m == "fume":
            d.rectangle([X0 + 2, Y0 + 1, X0 + W // 2, Y0 + H * 2 // 3], fill=L.plastic[1], outline=OUT); d.rectangle([X0 + 5, Y0 + H // 3, X0 + W // 2 - 3, Y0 + H * 2 // 3 - 2], fill=GLASS[2], outline=OUT)
            d.line([X0 + 8, Y0 + H // 3 + 2, X0 + 24, Y0 + H // 3 + 2], fill=WHITE[4])
        elif m == "dry":
            for k, bx in enumerate(range(X0 + 6, X1 - 30, 30)):
                d.rectangle([bx, Y0 + 4, bx + 24, Y0 + H // 2], fill=(L.plastic if k % 2 else L.R((210, 210, 204), 8))[2], outline=OUT); d.rectangle([bx + 4, Y0 + 7, bx + 14, Y0 + 12], fill=(40, 40, 44))
    if L.w >= 4 and e <= GW: border(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), L.metal)
    era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("labbench", _labbench, nvar=20, axes={"material": MATERIALS, "colour": COLOURS, "model": ["wet", "dry", "fume"]}, global_from=1990, front=True, clear=2.5, ref="laboratory benches 6 to 10 ft long, 2 1/2 to 3 ft deep")


def _judgebench(tm, B, st, L, snap):
    """The judge's bench from above: a long raised desk on its dais, the panelled front toward the court (south),
    the judge's great chair behind it at the middle with lesser chairs either side, and on the desk the papers, the
    inkstand, a gavel or a rod, a book of law. The arms of the court hang on the wall behind. Each era its make; each
    region its own cloth and wood: a carpet-covered divan for a qadi, a lacquered table for a magistrate."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    shadow(tm, X0, Y0, X1, Y1, 5)
    da = L.R(L.mt(mix((150, 140, 124), L.S["paint"], .2)), 12) if e < FD else L.comp
    d.rectangle(list(B), fill=da[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=da[4])                  # the dais
    if L.st == "islamic" and e <= VI:                                            # a qadi's carpeted platform
        d.rectangle([X0 + 6, Y0 + 4, X1 - 6, Y1 - 6], fill=L.dye()[2], outline=OUT); motif(tm, (X0 + 8, Y0 + 6, X1 - 8, Y1 - 8), L, C=L.dye2(), A=L.metal)
        pad(tm, (cx - 30, Y0 + 6, cx + 30, Y0 + 20), L.dye2(), r=4); thing(tm, "book", cx, Y0 + 30, L)
    else:
        for k, (chx, cw) in enumerate(((cx, 34), (cx - W // 3, 24), (cx + W // 3, 24))):   # the chairs behind
            C = frame(L) if e >= MC else (L.paint if L.st == "eastasia" else L.wood)
            d.rectangle([chx - cw // 2, Y0 + 3, chx + cw // 2, Y0 + 9 + (4 if k == 0 else 0)], fill=C[3], outline=OUT)
            pad(tm, (chx - cw // 2 + 3, Y0 + 9, chx + cw // 2 - 3, Y0 + 26), L.cover(C, .2), r=3)
        dk = (X0 + 4, Y0 + int(H * .55), X1 - 4, Y1 - 3)
        C = tabletop(tm, dk, L, kind={DA: "plank", LN: "plank", RE: "joined", AR: "joined", VI: "mahogany", GW: "oak", MC: "teak", MO: "veneer", FD: "composite"}[e])
        d.rectangle([dk[0], dk[3] - 4, dk[2], dk[3]], fill=C[1], outline=OUT)                                         # the panelled front's top
        if e <= GW and L.w >= 3: d.rectangle([dk[0] + 10, dk[1] + 3, dk[2] - 10, dk[3] - 6], fill=L.dye()[2], outline=L.metal[2])   # the green or red cloth
        thing(tm, "papers", cx - 24, (dk[1] + dk[3]) // 2, L); thing(tm, "inkwell", cx + 30, (dk[1] + dk[3]) // 2 - 2, L); thing(tm, "book", dk[0] + 18, (dk[1] + dk[3]) // 2, L)
        gx, gy = cx + 4, (dk[1] + dk[3]) // 2                                    # the gavel on its block
        d.ellipse([gx - 4, gy - 3, gx + 4, gy + 3], fill=L.wood[1], outline=OUT); d.rectangle([gx - 2, gy - 9, gx + 6, gy - 5], fill=L.wood[3], outline=OUT); d.line([gx + 2, gy - 5, gx + 12, gy + 2], fill=L.wood[3], width=2)
        if e >= MO: d.line([cx - 6, dk[1] + 2, cx - 10, dk[1] - 8], fill=(40, 40, 44), width=2)          # a microphone
    if L.w >= 4: motif(tm, (cx - 14, Y0 + 1, cx + 14, Y0 + 3), L, dense=2)
    if e != MC: era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("judgebench", _judgebench, nvar=20, front=True, clear=4, mount="wall", ref="courtroom benches, 8 to 12 ft long on a dais 3 to 4 ft deep")


def _dock(tm, B, st, L, snap):
    """The dock from above: a railed pen open at the back to the cells' stair, its rail of wood or iron with spikes
    along the top in the older courts, a bench inside for the accused, a gate. Renaissance and Age of Reason: an oak
    bar and a spiked rail; Victorian: a panelled box with an iron rail and spikes, the trapdoor to the cells; later: a
    glazed dock; Future Darkness: a lit cage."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; th = 5
    tm.shade((X0 + 5, Y0 + 5, X1 + 5, Y1 + 5), f=.6)
    C = L.wood if e <= GW else (L.tw if e < FD else L.comp)
    fl = L.R(L.mt(mix((120, 100, 80), L.S["paint"], .4)), 10)
    d.rectangle(list(B), fill=fl[2], outline=OUT)
    for gx in range(X0 + 6, X1 - 4, 9): d.line([gx, Y0 + th, gx, Y1 - th], fill=fl[1])
    if e >= VI and e <= MC:                                                       # the trapdoor to the cells
        d.rectangle([X0 + 10, Y0 + 8, X0 + 34, Y0 + 26], fill=fl[1], outline=OUT); d.ellipse([X0 + 20, Y0 + 15, X0 + 24, Y0 + 19], fill=IRON[3])
    slab(tm, X0 + th + 2, Y1 - th - 14, X1 - th - 2, Y1 - th - 2, C, "x", rng=tm.rng)                                  # the bench
    for x0_, y0_, x1_, y1_ in ((X0, Y0 + 10, X0 + th, Y1), (X1 - th, Y0 + 10, X1, Y1), (X0, Y1 - th, X1, Y1)):         # the rails, open at the back
        d.rectangle([x0_, y0_, x1_, y1_], fill=C[3], outline=OUT); d.line([x0_ + 1, y0_ + 1, x1_ - 1, y0_ + 1], fill=C[4])
    if e in (AR, VI, GW):                                                         # iron spikes along the front rail
        for sx in range(X0 + 4, X1 - 2, 5): d.rectangle([sx, Y1 - th - 2, sx + 1, Y1 - th + 2], fill=IRON[4])
    if e >= MC: d.rectangle([X0 + 2, Y1 - th - 3, X1 - 2, Y1 - th - 1], fill=GLASS[3]); d.line([X0 + 6, Y1 - th - 2, X0 + 30, Y1 - th - 2], fill=WHITE[4])   # glass screen
    if e == FD: d.rectangle([X0 + 1, Y0 + 10, X1 - 1, Y1 - 1], outline=L.glow[2])
    gx = X1 - th - 20; d.rectangle([gx, Y1 - th, gx + 16, Y1], fill=C[1], outline=OUT); knob(tm, gx + 3, Y1 - 3, IRON, 2)   # the gate
    if L.w >= 4: motif(tm, (X0 + th + 4, Y1 - th - 12, X1 - th - 4, Y1 - th - 4), L, dense=1.4)
    era_mark(tm, B, L, "wood")
    finish(tm, snap, B, L)


sdef("dock", _dock, nvar=20, front=True, clear=2, ref="the dock of English and colonial courts, 5 to 8 ft by 4 to 5 ft")


def _altartable(tm, B, st, L, snap):
    """The communion table from above: a plain table of the Reformed churches under its fair linen cloth hanging at
    the ends, a frontal of the season's colour (red, green, violet or white), the chalice and paten set on it under a
    veil, an open Bible or prayer book, and in richer or later churches two candlesticks and a cross. Renaissance:
    oak, the cloth plain; Age of Reason: the railed table with a velvet carpet; Victorian: the gothic altar-table with
    its embroidered frontal; later: lighter wood, then plain modern work. Oceania and Africa: carved island wood, a
    tapa or kente frontal."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; H = Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 4)
    tabletop(tm, B, L, kind={RE: "oak", AR: "oak", VI: "oak", GW: "oak", MC: "teak", MO: "veneer", FD: "composite"}[e])
    SEASON = {"green": (50, 110, 60), "red": (170, 36, 40), "violet": (100, 50, 120)}
    fr = L.R(L.mt(mix(SEASON[L.v.get("season", "green")], L.S["paint"], .25 if e < MC else .45)), 14) if not L.poor else L.R(mix(L.S["undyed"], SEASON[L.v.get("season", "green")], .35), 12)
    if L.v.get("cloth", "carpet") == "carpet":                                    # the carpet of the season over the whole table
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fill=fr[2], outline=OUT)
        if L.w >= 2: border(tm, (X0 + 3, Y0 + 3, X1 - 3, Y1 - 3), L.metal if L.w >= 3 else L.dye2())
    else:                                                                         # the frontal hanging down the front only
        d.rectangle([X0 + 1, Y1 - H // 3, X1 - 1, Y1 - 1], fill=fr[2], outline=OUT)
    if L.w >= 3: motif(tm, (X0 + 6, Y1 - H // 3 + 2, X1 - 6, Y1 - 3), L, C=L.dye2(), A=L.metal)
    ly0, ly1 = Y0 + H // 5, Y0 + H // 5 + H // 3                                  # the fair linen, a band across the top, its ends hanging
    d.rectangle([X0 - 2, ly0, X1 + 2, ly1], fill=WHITE[4], outline=WHITE[0])
    for ex in (X0 - 2, X1 - 3): d.line([ex + 2, ly0 + 1, ex + 2, ly1 - 1], fill=WHITE[2])
    d.rectangle([cx - 7, ly0 + 1, cx + 7, ly1 - 1], fill=fr[3], outline=OUT); d.ellipse([cx - 3, ly0 + 3, cx + 3, ly1 - 3], fill=L.metal[3], outline=OUT)   # the veiled chalice
    d.ellipse([cx + 10, ly0 + 1, cx + 20, ly1 - 1], fill=L.metal[2], outline=OUT)                                       # the paten
    thing(tm, "openbook", cx - 26, (ly0 + ly1) // 2, L, .9)
    if L.w >= 3 or e >= VI:
        for kx in (X0 + 12, X1 - 12): thing(tm, "candle", kx, (ly0 + ly1) // 2, L)
        d.line([cx + 34, ly0, cx + 34, ly1], fill=L.metal[3], width=2); d.line([cx + 30, ly0 + 3, cx + 38, ly0 + 3], fill=L.metal[3], width=2)   # the cross
    era_mark(tm, (X0 + 2, Y1 - H // 3, X1 - 2, Y1 - 2), L, "cloth")
    finish(tm, snap, B, L, corner=0)


sdef("altar-table", _altartable, nvar=30, axes={"material": MATERIALS, "season": ["green", "red", "violet"], "cloth": ["carpet", "frontal", "carpet"]}, front=True, clear=3, ref="communion tables of English and Scottish churches, 5 to 7 ft long, 2 to 3 ft deep")


# ---------------------------------------------------------------- the gaming room and the barber's
def _roulette(tm, B, st, L, snap):
    """A roulette table from above: the wheel sunk in its bowl (red and black pockets round a turned centre, the
    green zero, or zeros), and the baize layout with its grid of numbers in red and black and the dozens; stakes on
    the numbers, the croupier's rake. Age of Reason (from 1796, the Palais-Royal): a mahogany table, the wheel at one
    end, gold coin staked; Victorian: the double-ended Monte Carlo table, the wheel in the middle and a layout to
    either side, gold louis staked; Great War: the same with mother-of-pearl plaques; Mid-Century: a padded rail,
    chrome and round chips; Modern: a casino table, the same the world over, in the house's baize; Future Darkness: a
    dark table with a lit wheel. A region's house shows in its wood, carving and baize."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W, H = X1 - X0, Y1 - Y0
    shadow(tm, X0, Y0, X1, Y1, 5)
    rim = (L.tw if L.w <= 3 else L.R(L.mt(mix((110, 50, 34), L.S["wood2"], .4)), 16)) if e < MO else (L.R((40, 30, 30), 10) if e == MO else L.comp)
    if e == MC: rim = L.R(mix(L.dye()[2], (60, 40, 30), .5), 14)                           # the padded vinyl rail
    d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=rim[2], outline=OUT); d.line([X0 + 6, Y0 + 2, X1 - 6, Y0 + 2], fill=rim[4])
    bz = L.R(mix((40, 110, 60), L.S["paint"], .5), 12) if e < FD else L.R((30, 60, 70), 10)
    if e >= MO: bz = L.R(mix((40, 110, 60), MAKES_BAIZE[L.pick(list(MAKES_BAIZE), "baize")], .7), 12)
    d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=bz[2], outline=OUT)
    M = L.fade(BRASS) if e <= GW else CHROME; R_ = H // 2 - 6; wy = (Y0 + Y1) // 2
    m = L.pick(["single", "double", "electronic"], "model") if e >= MO else "-"
    if e >= MO: rim = L.R(mix((40, 30, 30), L.S["paint"], .5), 12)
    double = e in (VI, GW) or m == "double"
    wx = (X0 + X1) // 2 if double else X0 + 6 + R_
    d.ellipse([wx - R_, wy - R_, wx + R_, wy + R_], fill=rim[1], outline=OUT); d.ellipse([wx - R_ + 3, wy - R_ + 3, wx + R_ - 3, wy + R_ - 3], fill=M[2], outline=OUT)
    n = 37 if L.v.get("zero", "single") == "single" else 38
    for k in range(n):
        a0 = 360 * k / n; c = (40, 140, 60) if k == 0 or (n == 38 and k == 19) else ((180, 30, 30) if k % 2 else (24, 22, 24))
        d.pieslice([wx - R_ + 5, wy - R_ + 5, wx + R_ - 5, wy + R_ - 5], a0, a0 + 360 / n, fill=c)
    d.ellipse([wx - R_ // 2, wy - R_ // 2, wx + R_ // 2, wy + R_ // 2], fill=rim[3] if e < MC else M[3], outline=OUT)
    d.line([wx - R_ // 3, wy, wx + R_ // 3, wy], fill=M[4], width=2); d.line([wx, wy - R_ // 3, wx, wy + R_ // 3], fill=M[4], width=2)
    d.ellipse([wx + R_ - 9, wy - 2, wx + R_ - 6, wy + 1], fill=WHITE[4])
    if e == FD: d.ellipse([wx - R_ + 1, wy - R_ + 1, wx + R_ - 1, wy + R_ - 1], outline=L.glow[2], width=2)
    spans = [(X0 + 10, wx - R_ - 6), (wx + R_ + 6, X1 - 10)] if double else [(wx + R_ + 8, X1 - 12)]
    gy0, gy1 = Y0 + 10, Y1 - 16
    if m == "electronic":                                                         # a glass dome over the wheel, the layout a lit screen
        d.ellipse([wx - R_ - 2, wy - R_ - 2, wx + R_ + 2, wy + R_ + 2], outline=WHITE[4], width=2)
        bz = L.R((24, 30, 40), 8)
    for si, (gx0, gx1) in enumerate(spans):                                                   # the layouts: three rows of twelve
        cols = 12 if not double else 6; cw, ch = (gx1 - gx0) / cols, (gy1 - gy0) / 3
        for i in range(cols):
            for j in range(3):
                num = i * 3 + (3 - j); red = num in (1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36)
                d.rectangle([gx0 + i * cw, gy0 + j * ch, gx0 + (i + 1) * cw, gy0 + (j + 1) * ch], fill=bz[2], outline=WHITE[3])
                d.rectangle([gx0 + i * cw + 2, gy0 + j * ch + 2, gx0 + (i + 1) * cw - 2, gy0 + (j + 1) * ch - 2], fill=(170, 34, 34) if red else (30, 28, 30))
        for k in range(3): d.rectangle([gx0 + k * (gx1 - gx0) / 3, gy1 + 1, gx0 + (k + 1) * (gx1 - gx0) / 3, gy1 + 7], fill=bz[1], outline=WHITE[3])
        for k in range(4 + L.w * 2):                                                          # the stakes: gold coin, plaques, chips
            cx_, cy_ = gx0 + ((k * 7 + si * 3) % cols + .5) * cw, gy0 + ((k * 5) % 3 + .5) * ch
            if e <= VI: d.ellipse([cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3], fill=GOLD[3], outline=OUT)
            elif e == GW: d.rectangle([cx_ - 4, cy_ - 2, cx_ + 4, cy_ + 2], fill=(226, 222, 210), outline=OUT); d.point((cx_ - 2, cy_ - 1), fill=(170, 200, 220))
            else:
                c = (L.dye(), L.dye2(), L.R((230, 230, 220), 8), L.R((20, 20, 20), 8))[(k + L.w) % 4]
                d.ellipse([cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3], fill=c[2], outline=OUT); d.point((cx_ - 1, cy_ - 1), fill=WHITE[4])
    d.line([X1 - 30, Y1 - 4, X1 - 8, Y1 - 12], fill=L.wood[3], width=2); d.line([X1 - 30, Y1 - 6, X1 - 26, Y1 - 2], fill=L.wood[3], width=3)   # the rake
    if L.w >= 4 and e <= GW: border(tm, (X0 + 2, Y0 + 2, X1 - 2, Y1 - 2), GOLD); motif(tm, (X0 + 12, Y1 - 5, X1 - 12, Y1 - 2), L, C=GOLD, A=GOLD, dense=2)
    finish(tm, snap, B, L, corner=0)


MAKES_BAIZE = {"green": (40, 110, 60), "blue": (40, 70, 130), "red": (130, 36, 40)}

sdef("roulette", _roulette, nvar=33, axes={"material": MATERIALS, "colour": COLOURS, "zero": ["single", "double", "single"], "baize": list(MAKES_BAIZE)},
     global_from=1990, front=False, clear=3, ref="roulette tables of the Palais-Royal and Monte Carlo, about 8 ft by 4 ft with the wheel at one end")


def _stylingstation(tm, B, st, L, snap):
    """A hairdresser's or barber's station against the wall, from above: the long mirror along the wall (its glass
    edge-on, a bright line) in its frame, the counter below it with the tools of the trade laid out: scissors and
    combs, a razor and strop, a shaving mug and brush, bottles of tonic, and from Mid-Century the blue jar of
    disinfectant, the clippers on their cord and a hair dryer. Victorian: a marble counter on carved wood with a
    porcelain basin; Great War: oak and nickel; Mid-Century: chrome, glass shelves and pastel formica; Modern: black
    laminate and spotlights, the same the world over; Future Darkness: a dark counter with a lit mirror. A
    region's barber keeps its own: a brass bowl, a cut-throat razor, henna, a hot towel steamer."""
    d = tm.d; X0, Y0, X1, Y1 = B; e = L.e; W = X1 - X0
    shadow(tm, X0, Y0, X1, Y1, 4)
    if e in (VI, GW) and L.w >= 3: C = L.R(L.mt(mix((226, 222, 212), L.S["paint"], .3)), 10); d.rectangle(list(B), fill=C[3], outline=OUT); d.line([X0 + 8, Y0 + 6, X1 - 30, Y1 - 3], fill=C[1])   # marble
    elif e == MC: C = tabletop(tm, B, L, kind="formica")
    elif e == MO:                                                                 # the salon's makes: black barber's counter, white salon counter, oak-look spa counter
        m = L.pick(["barber", "salon", "spa"], "model")
        base = {"barber": (40, 40, 44), "salon": (226, 224, 218), "spa": (176, 140, 96)}[m]
        C = L.R(mix(base, L.S["paint"], .45), 10); d.rectangle(list(B), fill=C[2], outline=OUT); d.line([X0 + 2, Y0 + 2, X1 - 2, Y0 + 2], fill=C[4])
        if m == "salon":
            for k in range(2): d.ellipse([X0 + W // 4 + k * W // 2 - 10, Y0, X0 + W // 4 + k * W // 2 + 10, Y0 + 7], fill=WHITE[4], outline=OUT)
    elif e == FD: C = L.comp; d.rectangle(list(B), fill=C[1], outline=OUT)
    else: C = tabletop(tm, B, L, kind="oak")
    F = L.metal if L.w >= 4 and e <= GW else (C if e != MC else CHROME)                      # the mirror's frame and glass
    d.rectangle([X0, Y0, X1, Y0 + 6], fill=F[2], outline=OUT); d.line([X0 + 3, Y0 + 3, X1 - 3, Y0 + 3], fill=WHITE[4] if e < FD else L.glow[2], width=2)
    if e == MO:
        for lx in range(X0 + 12, X1 - 8, 24): d.ellipse([lx - 3, Y0 + 1, lx + 3, Y0 + 6], fill=(250, 240, 200), outline=OUT)   # spotlights over the mirror
    cy = (Y0 + Y1) // 2 + 3
    if e <= GW and L.w >= 2:                                                                  # the basin let into the counter
        d.ellipse([X0 + 6, cy - 7, X0 + 24, cy + 7], fill=WHITE[3], outline=OUT); d.ellipse([X0 + 10, cy - 4, X0 + 20, cy + 4], fill=WHITE[1]); d.rectangle([X0 + 13, cy - 10, X0 + 17, cy - 7], fill=L.metal[3])
    else: d.rectangle([X0 + 6, cy - 6, X0 + 24, cy + 6], fill=WHITE[2], outline=OUT)        # folded towels
    sx = X0 + 30; u = (W - 70) / 70                                                          # the tools spread to the counter's length
    d.line([sx, cy - 4, sx + 10, cy + 3], fill=STEEL[4], width=2); d.line([sx, cy + 3, sx + 10, cy - 4], fill=STEEL[4], width=2); d.ellipse([sx - 3, cy + 2, sx + 1, cy + 6], outline=OUT)   # scissors
    d.rectangle([sx + 14, cy - 5, sx + 30, cy - 2], fill=(L.dye() if e >= MC else L.R((60, 40, 30), 10))[2], outline=OUT)   # a comb
    for k in range(sx + 15, sx + 30, 2): d.point((k, cy - 1), fill=OUT)
    if e <= GW:
        d.ellipse([sx + 36, cy - 6, sx + 46, cy + 4], fill=WHITE[3], outline=OUT); d.ellipse([sx + 39, cy - 3, sx + 43, cy + 1], fill=L.R((200, 170, 120), 10)[3])   # shaving mug and brush
        if sx + 66 < X1 - 4: d.line([sx + 50, cy + 4, sx + 64, cy - 2], fill=L.R((120, 70, 40), 10)[1], width=3)    # the strop
    else:
        d.rectangle([sx + 36, cy - 9, sx + 46, cy + 5], fill=(60, 120, 200), outline=OUT); d.line([sx + 38, cy - 6, sx + 38, cy + 2], fill=(150, 200, 240))   # the disinfectant jar with its combs
        if sx + 68 < X1 - 4: d.rounded_rectangle([sx + 52, cy - 4, sx + 66, cy + 2], 2, fill=(L.plastic if e < FD else L.comp)[1], outline=OUT)   # the clippers
    for k, bx in enumerate(range(X1 - 34, X1 - 6, 7)):                                         # bottles of tonic along the mirror's foot
        bc = (L.dye(), L.dye2(), L.R((200, 160, 60), 12), L.R((60, 120, 80), 12))[k % 4]; d.ellipse([bx - 3, Y0 + 8, bx + 3, Y0 + 14], fill=bc[2], outline=OUT); d.point((bx - 1, Y0 + 9), fill=WHITE[4])
    if L.w >= 3 and e <= MC: motif(tm, (X0 + 4, Y1 - 5, X1 - 4, Y1 - 2), L, dense=1.4)
    if e in (VI, GW): era_mark(tm, (X0, Y0 + 7, X1, Y1), L, "wood")
    if e == MO:                                                                  # what each make of station carries
        m = L.pick(["barber", "salon", "spa"], "model"); H = Y1 - Y0
        if m == "salon":                                                         # a hood dryer's dome at the end
            d.ellipse([X1 - 30, Y0 + 6, X1 - 4, Y1 - 2], fill=L.plastic[3], outline=OUT); d.ellipse([X1 - 24, Y0 + 11, X1 - 10, Y1 - 7], fill=L.plastic[1])
        elif m == "spa":                                                         # a wash basin and a stack of towels
            d.ellipse([X0 + W // 2 - 14, Y0 + 8, X0 + W // 2 + 14, Y1 - 3], fill=WHITE[4], outline=OUT); d.ellipse([X0 + W // 2 - 8, Y0 + 12, X0 + W // 2 + 8, Y1 - 7], fill=WHITE[1])
            for k in range(3): d.rectangle([X1 - 26, Y0 + 8 + k * 6, X1 - 6, Y0 + 13 + k * 6], fill=L.dye()[2 + k % 2], outline=OUT)
        else:                                                                    # a hot-towel cabinet in steel
            d.rectangle([X1 - 30, Y0 + 7, X1 - 4, Y1 - 3], fill=STEEL[2], outline=OUT); d.rectangle([X1 - 27, Y0 + 10, X1 - 7, Y1 - 6], fill=STEEL[1]); d.rectangle([X1 - 12, Y0 + 12, X1 - 9, Y0 + 15], fill=(220, 60, 40))
    finish(tm, snap, B, L)


sdef("stylingstation", _stylingstation, nvar=30, global_from=1990, front=True, clear=4,
     ref="barbers' and hairdressers' stations, 4 to 6 ft of counter about 2 ft deep under a wall mirror")
