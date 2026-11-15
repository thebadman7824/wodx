"""A generic Moravian village of about 1200 (40 x 28 squares): a road with a brook and a plank bridge, five log
cottages with their gardens, a timber chapel, a well on the green, open-field strips north and south.

    python3 tools/pixelmap/maps/village.py OUTDIR

One of the sample maps for Ben's review before the larger map work (the Whole World desk, p1: generic villages per
building style and age)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T
import props as pr
import land
import buildings as B
from scene import Recorder

W, H = 40, 28
rec = Recorder("Village, about 1200", (W, H), seed=1197, place="street")
m = rec.m; note = rec.note
road = [(-1, 15.2), (6, 14.6), (14, 13.6), (22, 13.8), (30, 13.4), (36, 12.6), (41, 12.4)]
brook = [(31.2, -1), (30.4, 4), (31.6, 8), (30.6, 13.5), (29.6, 18), (30.8, 23), (30.2, 29)]
dt, db = land.ground(m, roads=[(road, 44)], brooks=[brook], wide=46)
land.strips(m, 1, .4, 27.5, 3.4); note("ploughed strips", 14, 1.9)
land.strips(m, 1, 25.2, 28.5, 27.9, crops=("oats", "rye", "flax", "fallow")); note("ploughed strips", 14, 26)

homes = [("Cottage of the smith's family", 3, 6.2, "s", "blue", "red", False), ("Cottage by the chapel", 22.4, 6.4, "s", "red", "blue", True),
         ("Cottage at the west end", 3, 17.4, "n", "green", "blue", True), ("Cottage of the reeve", 12.5, 17.6, "n", "red", "red", False),
         ("Cottage by the brook", 21.2, 17.4, "n", "blue", "red", True), ("Cottage over the bridge", 32.6, 15.6, "n", "green", "blue", False)]
built = []
for name, x, y, door, cloth, paint, mir in homes:
    B.cottage(rec, x, y, 7, 5, door=door, cloth=cloth, paint=paint, name=name, mirror=mir)
    gy0, gy1 = (y - 2.4, y - .3) if door == "s" else (y + 5.3, y + 7.4)       # the garden behind, fenced with wattle
    if 0 < gy0 and gy1 < H - 3.2:
        pr.garden(m, x + .4, gy0, x + 6.6, gy1); note("kitchen garden", x + 3.5, (gy0 + gy1) / 2)
        for sg in ((x + .33, gy0 - .06, x + 6.67, gy0 - .06), (x + .33, gy1 + .06, x + 6.67, gy1 + .06), (x + .33, gy0 - .06, x + .33, gy1 + .06), (x + 6.67, gy0 - .06, x + 6.67, gy1 + .06)):
            pr.wattle(m, *sg)
        built.append((x, gy0 - .2, 7, gy1 - gy0 + .4))
    built.append((x - .8, y - .2, 8.6, 5.4))
B.chapel(rec, 12.4, 5.6, 8, 5, name="The chapel"); built.append((12.2, 5.4, 8.4, 5.4))
pr.well(m, 18.4, 11.6); note("well", 18.4, 11.6); built.append((17.6, 10.8, 1.8, 1.8))
pr.trough(m, 19.6, 11.1, .46, 1.3); note("water trough", 19.83, 11.75)
land.bridge(m, 29.4, 12.6, 32.0, 14.2); note("bridge", 30.7, 13.4)
pr.hay(m, 36.4, 25.8, 105); note("haystack", 36.4, 25.8); built.append((35.0, 24.6, 2.8, 2.6))   # a stack about 11 ft across
pr.washline(m, 9.6, 23.4, 12.2, 23.1, [("linen", 34), ("red", 20), ("linen", 30)]); note("washing line", 10.9, 23.3)


def clear(x, y, r):
    """No tree on the road, in the brook, on a field or a garden, or crowding a house."""
    if y < 3.9 and x < 28.2 or y > 24.1 and x < 29.2: return True
    px_, py_ = min(max(int(x * T), 0), m.W - 1), min(max(int(y * T), 0), m.H - 1)
    if dt[py_, px_] < r * T * .6 or db[py_, px_] < 46 + r * T * .6: return True   # crowns may reach the verge, not cover the road
    return any(bx - r * .6 < x < bx + bw + r * .6 and by - r * .6 < y < by + bh + r * .6 for bx, by, bw, bh in built)


for x, y, r, b in ((10.6, 11.6, 24, R["red"][3]), (26.6, 11.2, 26, None), (8.8, 16.4, 22, None), (35.6, 10.6, 28, R["blue"][2]), (2.2, 12.0, 24, None)):
    m.bush(x * T, y * T, r, b)
for x, y, w_, h_ in ((27.6, 15.8, 20, 15), (33.4, 8.2, 26, 18), (1.4, 22.4, 18, 13)): m.rock(x * T, y * T, w_, h_)
land.trees(m, W, H, clear, n=520)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "village")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
