"""A country road of about 1200 (36 x 20 squares): a rutted road out of the fields and into the wood, a track
forking off south by a stone wayside cross, a ford through a brook with stepping stones for walkers, a cart left
at the verge with a sack and casks on it, a felled trunk and a woodcutter's stack.

    python3 tools/pixelmap/maps/road.py OUTDIR

One of the sample maps for Ben's review before the larger map work (the Whole World desk)."""
import math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T, OUT
import props as pr
import land
import wilds as wl
from scene import Recorder

W, H = 36, 20
rec = Recorder("Country road, about 1200", (W, H), seed=1203, place="road")
m = rec.m; note = rec.note; d = m.d
road = [(-1, 13.0), (5, 12.4), (11, 11.0), (16, 10.6), (21.4, 9.6), (26, 8.2), (31, 7.6), (37, 6.4)]
track = [(11.2, 11.0), (10.4, 14.5), (11.6, 17.5), (10.8, 21)]
brook = [(23.4, -1), (22.6, 4), (23.8, 8), (22.4, 12), (23.2, 16), (22.0, 21)]
dt, db = land.ground(m, roads=[(road, 42), (track, 22)], brooks=[brook], wide=44)

# the ford: where road and brook meet the water runs shallow over gravel, pale and broken
ford = (dt < 4) & (db < 44)
gv = m.ramp(m.noise(m.H, m.W, 5) * .6 + .3, "water", 2, 4)
peb = ford & (m.noise(m.H, m.W, 3) > .62)
a = np.array(m.img); a[ford] = gv[ford]; a[peb] = R["stone"][3]; a[peb & (m.noise(m.H, m.W, 2) > .7)] = R["stone"][4]
m.put(a, 0, 0); note("ford", 22.9, 9.5)
for sx, sy in ((21.9, 13.0), (22.5, 13.5), (23.15, 13.1), (23.8, 13.55)):            # stepping stones for walkers, below the ford
    m.rock(sx * T, sy * T, 26, 20)
note("stepping stones", 23.0, 13.2)

land.strips(m, 1, 14.6, 9.2, 19.6, crops=("rye", "fallow", "oats")); note("ploughed strips", 5, 17)
land.strips(m, 12.8, 13.6, 20.8, 19.6, crops=("flax", "rye", "oats")); note("ploughed strips", 16.8, 16.6)

# the wayside cross at the fork: a stone shaft on a stepped base, its arms seen from above, a shadow to the south-east
cx_, cy_ = int(12.3 * T), int(12.2 * T)
m.shade((cx_ - 30, cy_ - 30, cx_ + 46, cy_ + 46), f=.7)
m.box(cx_ - 30, cy_ - 30, cx_ + 30, cy_ + 30, "stone", 2); m.box(cx_ - 20, cy_ - 20, cx_ + 20, cy_ + 20, "stone", 3)
m.shade((cx_ - 4, cy_ - 30, cx_ + 14, cy_ + 50), f=.62, kind="poly", pts=[(cx_ + 2, cy_ - 32), (cx_ + 14, cy_ - 32), (cx_ + 34, cy_ + 52), (cx_ + 22, cy_ + 52)])
m.box(cx_ - 5, cy_ - 34, cx_ + 5, cy_ + 22, "pale", 3); m.box(cx_ - 22, cy_ - 16, cx_ + 22, cy_ - 7, "pale", 3)
m.disc(cx_ + 14, cy_ + 16, 5, "red", 3); d.point((cx_ + 13, cy_ + 15), fill=R["pale"][4])  # a posy laid on the step
note("wayside cross", 12.3, 12.2)


def cart(x, y, w=.95, L=1.75):                                                   # an 8 by 4 1/2 ft bed
    """A two-wheeled farm cart from above, shafts to the west and down on the ground: a plank bed with side
    boards, the wheels as narrow iron-shod rims beside it with their hubs, the shafts reaching out ahead."""
    X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + L) * T), int((y + w) * T)
    m.shade((X0 + 6, Y0 + 8, X1 + 8, Y1 + 10), f=.62)
    for yy in (Y0 + 10, Y1 - 14):                                                    # the shafts
        m.box(X0 - 150, yy, X0 + 4, yy + 5, "wood", 2, bevel=False)
    m.box(X0 - 156, Y0 + 8, X0 - 146, Y1 - 8, "wood", 2, bevel=False)              # the crossbar at the shafts' end
    m.put(np.transpose(m.planks(X1 - X0, Y1 - Y0, "wood", bh=16), (1, 0, 2)), X0, Y0)
    d.rectangle([X0, Y0, X1, Y1], outline=OUT)
    for x0, y0, x1, y1 in ((X0, Y0, X1, Y0 + 8), (X0, Y1 - 8, X1, Y1), (X0, Y0, X0 + 8, Y1), (X1 - 8, Y0, X1, Y1)):
        m.box(x0, y0, x1, y1, "dwood", 3, bevel=False)
    mx = (X0 + X1) // 2 + 10
    for yy, sg in ((Y0 - 14, -1), (Y1 + 2, 1)):                                     # wheels: rim, spokes' shadow, hub
        m.box(mx - 46, yy, mx + 46, yy + 12, "dwood", 2)
        d.line([mx - 44, yy + (1 if sg < 0 else 10), mx + 44, yy + (1 if sg < 0 else 10)], fill=R["iron"][3])
        m.disc(mx, yy + 6, 9, "iron", 2)
    pr.sack(m, x + .45, y + .48, 20, name="Sack on the cart")
    pr.barrel(m, x + 1.05, y + .48, 20, holds="grain", head="s", name="Cask on the cart")
    pr.barrel(m, x + 1.45, y + .48, 17, holds="water", name="Small cask on the cart")
    note("cart", x + L / 2, y + w / 2)


cart(4.6, 10.7)


wl.trunk(m, 28.6, 3.4, 33.6, 1.6); note("felled trunk", 31, 2.6)
pr.logpile(m, 27.4, 4.4, 2.6, .6); note("woodcutter's stack", 28.7, 4.7)
pr.chopping(m, 30.4, 4.9) if hasattr(pr, "chopping") else None
for x, y, r, b in ((9.2, 9.4, 22, None), (19.6, 12.4, 24, R["red"][3]), (14.8, 8.8, 20, None), (25.4, 11.6, 26, None)):
    m.bush(x * T, y * T, r, b)
for x, y, w_, h_ in ((17.6, 9.0, 20, 14), (26.6, 10.4, 24, 16), (2.6, 9.4, 16, 12)): m.rock(x * T, y * T, w_, h_)
m.deadtree(34.2 * T, 12.2 * T, 120); note("dead tree", 34.2, 12.2)
for x, y in ((34.0, 11.8), (34.6, 12.5)): m.raven(int(x * T), int(y * T))
built = [(3.0, 9.4, 4.6, 2.2), (11.2, 11.2, 2.2, 2.2), (27.2, 1.0, 7, 4.4), (33.4, 11.4, 1.6, 1.6)]


def clear(x, y, r):
    """No tree on the road, the ford, a field, the cart or the cross; the wood is thick north of the road and east of the brook."""
    if 12.4 < y and x < 22.4: return True                                          # no crown over the strips
    if y > 10.4 and x < 22 and m.rng.random() < .75: return True                   # open ground south of the road, a tree here and there
    px_, py_ = min(max(int(x * T), 0), m.W - 1), min(max(int(y * T), 0), m.H - 1)
    if dt[py_, px_] < r * T * .6 or db[py_, px_] < 44 + r * T * .6: return True
    return any(bx - r * .6 < x < bx + bw + r * .6 and by - r * .6 < y < by + bh + r * .6 for bx, by, bw, bh in built)


land.trees(m, W, H, clear, n=700, fir=.6, gap=.58)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "road")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
