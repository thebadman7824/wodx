"""WoDX pixel map drawer (B5737): whole buildings, laid out the same way each time so a generic village can be made
of them. Each takes the Recorder, a place in squares and a size, and records its walls, doors, windows, things that
open, the hearth's light and the building as a place. Central European peasant building of about 1200: log walls,
an earth floor, a bread oven in a back corner, small unglazed windows with shutters."""
import numpy as np
from px import R, T, OUT
import props as pr

TH = 26


def _floor(m, x, y, w, h, kind):
    """Lay a floor; if the map is being dressed (dress.snap), the new floor counts as bare."""
    _floor0(m, x, y, w, h, kind)
    if getattr(m, "_snap", None) is not None:
        import dress; dress.resnap(m, (x, y, w, h))


def _floor0(m, x, y, w, h, kind):
    X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
    if kind == "earth":                                                         # beaten earth with straw trodden in
        st = (m.dirt(Y1 - Y0, X1 - X0) * .86).astype(np.uint8); m.put(st, X0, Y0)
        for _ in range(int(w * h * 9)):
            px_, py_ = m.rng.integers(X0 + 6, X1 - 10), m.rng.integers(Y0 + 6, Y1 - 6); k = int(m.rng.integers(0, 3))
            m.d.line([px_, py_, px_ + (5, 3, -4)[k], py_ + (1, 4, 3)[k]], fill=R["straw"][int(m.rng.integers(2, 5))])
    elif kind == "flags":
        m.put(m.blocks(Y1 - Y0, X1 - X0, 40, 28, "stone", lo=2, hi=3), X0, Y0)          # close tones: a busy floor reads as noise
    else:
        m.put(m.planks(Y1 - Y0, X1 - X0, "wood", bh=18), X0, Y0)


def _walls(rec, x, y, w, h):
    for sg in ((x, y, x + w, y), (x, y + h, x + w, y + h), (x, y, x, y + h), (x + w, y, x + w, y + h)): rec.wall(*sg, th=TH, kind="wood")


def cottage(rec, x, y, w=7, h=5, door="s", cloth="red", paint="red", name="Cottage", glass=False, floor="earth", mirror=False):
    """A one-room log house. The door is in the middle of the long wall on the side given ("s" or "n"); the oven
    stands in a back corner, the bed in the other, the table by a front window. mirror swaps left and right, so a
    row of houses is not one house copied. Returns the house's middle."""
    m = rec.m; cx, cy = x + w / 2, y + h / 2
    flip = (door == "n") != mirror
    fy = lambda v, hh=0: (y + v) if door == "s" else (y + h - v - hh)            # from the back wall, into the room
    fx = lambda v, ww=0: (x + v) if not flip else (x + w - v - ww)               # from the oven's side wall
    _floor(m, x, y, w, h, floor)
    ox = fx(.14, 1.4); oy = fy(.14, 1.4)
    m.oven(ox, oy, 1.4, 1.4, side="n" if door == "s" else "s")
    rec.light(f"{name}-oven", f"The oven ({name})", (ox, oy, 1.4, 1.4), dim=4, bright=1.5); rec.note("bread oven", ox + .7, oy + .7)
    bx = fx(w - 1.1, .95)                                                       # a bed for two: 4 1/2 by 7 ft
    pr.bed(m, bx, fy(.15, 1.4), .95, 1.4, head="n" if door == "s" else "s", cloth=cloth); rec.note("bed", bx + .48, fy(.85))
    sx = fx(1.8, 1.6); pr.shelf(m, sx, fy(.16, .44), 1.6, .44, ["jug", "bowl", "loaf", "cheese", "pot", "bowl"]); rec.note("shelf of crockery", sx + .8, fy(.38))
    pr.painted_chest(m, fx(w - 2.4, 1.0), fy(.2, .62), 1.0, .62, paint, name=f"Painted chest ({name})")
    tx = fx(w - 3.1, 1.8); ty = fy(h - 2.2, .9)                                 # the table by the front window, benches each side
    m.table(tx, ty, 1.8, .9, things=False); rec.note("table", tx + .9, ty + .45)
    pr.bench(m, tx + .1, ty - .42, 1.6, .34); pr.bench(m, tx + .1, ty + .98, 1.6, .34)
    ttx, tty = int((tx + .5) * T), int(ty * T)
    pr.bowl(m, ttx, tty + 30, 9, food=(150, 128, 76), spoon=True); pr.loaf(m, ttx + 70, tty + 40, 12, 8); pr.jug(m, ttx + 120, tty + 30, 8)
    pr.barrel(m, fx(.9), fy(h - .75), 24, holds="water", name=f"Water cask ({name})")
    pr.stool(m, fx(2.4), fy(h - 1.6)); rec.note("stool", fx(2.4), fy(h - 1.6))
    pr.basket(m, int(fx(1.0) * T), int(fy(2.2) * T), 16, "wool"); pr.distaff(m, int(fx(1.35) * T), int(fy(2.05) * T), .4); rec.note("basket of wool and a spindle", fx(1.0), fy(2.2))
    _walls(rec, x, y, w, h)
    front = y + h if door == "s" else y
    dx = round(cx - .5, 2)
    pr.door(rec.m, dx, front, dx + 1, front, TH, centre=(cx, cy), swing=-1, hinge="a", exterior=True, name=f"Door ({name})")
    for wx in (x + 1.2, x + w - 2.0):
        pr.window(rec.m, wx, front, wx + .8, front, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
    ex = x + w if not flip else x                                               # a window in the end wall by the table
    pr.window(rec.m, ex, cy - .4, ex, cy + .4, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
    for px_, py_ in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)): m.post(px_, py_, 30)
    lx = x - .62 if not flip else x + w + .14                                   # firewood stacked against the oven's end wall outside
    pr.logpile(m, lx, y + .6, .48, h - 1.2, upright=True); rec.note("woodpile", lx + .24, cy)
    rec.region(f"{name}-home", name, (x, y, w, h), "home")
    return cx, cy


def chapel(rec, x, y, w=8, h=5, name="Chapel", glass=False):
    """A small timber chapel, door in the west wall, the altar at the east end with a cross and two candles, a font
    by the door, plank benches for the old along the walls, a stone-flagged floor."""
    m = rec.m; cx, cy = x + w / 2, y + h / 2
    _floor(m, x, y, w, h, "flags")
    X1 = x + w
    sx0, sy0, sx1, sy1 = int((X1 - 1.6) * T), int((y + .3) * T), int((X1 - .05) * T), int((y + h - .3) * T)
    m.shade((sx0 - 8, sy0 + 4, sx1, sy1 + 8), f=.7)                                 # the raised sanctuary: a step down to the nave
    m.put(m.blocks(sy1 - sy0, sx1 - sx0, 30, 30, "pale", lo=2, hi=4), sx0, sy0); m.d.rectangle([sx0, sy0, sx1, sy1], outline=OUT)
    m.d.line([sx0 + 1, sy0 + 1, sx0 + 1, sy1 - 1], fill=R["pale"][4]); m.d.line([sx0 - 6, sy0, sx0 - 6, sy1], fill=R["stone"][1], width=4)
    m.altar(X1 - 1.15, cy - .8, .8, 1.6); rec.note("altar", X1 - .75, cy)
    m.font(x + 1.3, y + h - 1.2, 34); rec.note("font", x + 1.3, y + h - 1.2)
    pr.bench(m, x + 1.0, y + .2, 4.4, .34); pr.bench(m, x + 2.2, y + h - .54, 3.2, .34); rec.note("bench", x + 3.2, y + .37)
    pr.candle(m, int((X1 - 1.9) * T), int((y + .7) * T)); pr.candle(m, int((X1 - 1.9) * T), int((y + h - .7) * T))
    rec.light(f"{name}-altar", f"The altar candles ({name})", (X1 - 1.2, cy - .9, .9, 1.8), dim=3, bright=.5, color="#ffc46b", kind="candle")
    _walls(rec, x, y, w, h)
    pr.door(rec.m, x, cy - .5, x, cy + .5, TH, centre=(cx, cy), swing=-1, hinge="a", exterior=True, name=f"Door ({name})")
    for wx in (x + 2.4, x + w - 3.2):
        pr.window(rec.m, wx, y, wx + .8, y, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
        pr.window(rec.m, wx, y + h, wx + .8, y + h, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
    for px_, py_ in ((x, y), (X1, y), (x, y + h), (X1, y + h)): m.post(px_, py_, 30)
    rec.region(f"{name}-church", name, (x, y, w, h), "church")
    return cx, cy


def hut(rec, x, y, w, h, doors=(), windows=(), floor="earth", name="Hut", place="home", glass=False, woodpile=None):
    """A plain log hut whose contents the map draws itself. doors and windows: (side, offset in squares from the
    wall's west or north end), side one of n s e w. Draw the floor first with this, the furniture after, then call
    the returned finish() to put up the walls, doors and windows over it."""
    m = rec.m; cx, cy = x + w / 2, y + h / 2
    _floor(m, x, y, w, h, floor)

    def finish():
        _walls(rec, x, y, w, h)
        for side, off in doors:
            if side in "ns":
                yy = y if side == "n" else y + h; pr.door(m, x + off, yy, x + off + 1, yy, TH, centre=(cx, cy), swing=-1, hinge="a", exterior=True, name=f"Door ({name})")
            else:
                xx = x if side == "w" else x + w; pr.door(m, xx, y + off, xx, y + off + 1, TH, centre=(cx, cy), swing=-1, hinge="a", exterior=True, name=f"Door ({name})")
        for side, off in windows:
            if side in "ns":
                yy = y if side == "n" else y + h; pr.window(m, x + off, yy, x + off + .8, yy, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
            else:
                xx = x if side == "w" else x + w; pr.window(m, xx, y + off, xx, y + off + .8, th=TH, centre=(cx, cy), glass=glass, name=f"Window ({name})")
        for px_, py_ in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)): m.post(px_, py_, 30)
        if woodpile:
            lx, ly, lw, lh = woodpile; pr.logpile(m, lx, ly, lw, lh, upright=lh > lw); rec.note("woodpile", lx + lw / 2, ly + lh / 2)
        rec.region(f"{name}-{place}", name, (x, y, w, h), place)
    return finish
