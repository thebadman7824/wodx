"""Rothenstein valley: The Forest Road (66 x 46 squares), redrawn in WoDX's own pixel art on the old map's layout
(the Whole World desk, r1 to r3). The road comes in from Dolany in the west and runs south-east to the West Gate,
with a track north to the Old Grove. On it: the abandoned charcoal burner's hut, the woodcutters' hut with its
bunks, their log stacks and two charcoal kilns burning, and a camp of tents under a rock scarp in the north-east.

    python3 tools/pixelmap/maps/forest_road.py OUTDIR

Walls, doors, windows, lights and exits sit on the old scene's own (the testbed export, 80 px a square), so the
scene's notes, Ways and lights still fit. Daylight colours; Foundry's clock darkens."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T
import props as pr
import land
import wilds as wl
import buildings as B
from scene import Recorder

W, H = 66, 46
rec = Recorder("The Forest Road", (W, H), seed=1197, place="wild")
m = rec.m; note = rec.note
road = [(-1, 14.0), (5, 14.4), (10, 16.0), (16, 18.6), (22, 21.4), (28, 24.4), (33, 26.4), (38, 29.4), (42, 32.6), (45.5, 36.5), (48.5, 41.0), (50.0, 47)]
grove = [(30.0, -1), (29.4, 6.2), (30.2, 12.4), (31.8, 19.6), (32.8, 25.6)]
trail = [(42.0, 28.0), (43.4, 24.6), (45.2, 21.4), (46.0, 19.4)]               # the hidden trail up to the bandits' ladder
burner = [(5.8, 7.9), (6.4, 10.5), (7.4, 14.6)]
work = [(13.0, 17.0), (14.4, 24.0), (15.8, 32.5)]
dt, db = land.ground(m, roads=[(road, 118), (grove, 80), (trail, 18), (burner, 30), (work, 44)], floor="forest")

# ---- the abandoned charcoal burner's hut, north-west: nobody has lived here for a while ----
fin = B.hut(rec, 3.4, 3.4, 5.0, 4.2, doors=[("s", 1.9)], name="Abandoned burner's hut")          # it has no window
pr.bed(m, 3.5, 3.5, .85, 1.35, head="n", cloth="blue"); note("bed, its blanket mouldering", 3.92, 4.2)
pr.chest(m, 5.1, 3.5, .95, .6); note("chest", 5.6, 3.8)
pr.barrel(m, 6.75, 3.85, 21, holds="water", name="Empty cask (burner's hut)"); pr.barrel(m, 7.45, 3.85, 21, holds="grain", name="Cask (burner's hut)")
for a in range(9):                                                                   # the cold hearth: a ring of stones, ash
    ang = a * 2 * math.pi / 9; m.rock((5.9 + math.cos(ang) * .45) * T, (5.5 + math.sin(ang) * .45) * T, 9, 8)
m.d.ellipse([5.9 * T - 30, 5.5 * T - 30, 5.9 * T + 30, 5.5 * T + 30], fill=(92, 88, 90)); note("cold hearth", 5.9, 5.5)
for dx, dy in ((-10, 4), (8, -6), (2, 12)): m.d.line([5.9 * T + dx, 5.5 * T + dy, 5.9 * T + dx + 12, 5.5 * T + dy + 3], fill=(38, 30, 30), width=4)   # charred ends
pr.bench(m, 3.6, 5.5, .34, 1.4); pr.stool(m, 4.6, 6.8); note("bench", 3.77, 6.2)
pr.shelf(m, 7.8, 4.9, .44, 1.5, ["jug", "bowl", "pot"]); note("shelf", 8.0, 5.6)
for lx, ly in ((4.2, 7.2), (7.4, 7.1), (6.9, 4.8)):                                  # dead leaves blown in under the door
    for k in range(14): m.d.rectangle([lx * T + (k * 37) % 60 - 30, ly * T + (k * 23) % 30 - 15, lx * T + (k * 37) % 60 - 27, ly * T + (k * 23) % 30 - 13], fill=R["red"][2] if k % 3 else R["straw"][2])
rec.light("Burner's hearth", "Hearth in the burner's hut", (5.42, 5.03, 1, 1), dim=4, bright=1, color="#ff9a40", kind="fire", on=False)
fin()

# ---- the woodcutters' hut, south-west: eight bunks, a lamp burning ----
fin = B.hut(rec, 8.0, 30.0, 7.0, 5.0, doors=[("e", 2.0)], windows=[("n", 3.1), ("s", 3.1), ("w", 2.1)], floor="planks", name="Woodcutters' hut")
for k, bx in enumerate((9.0, 12.15, 13.4)): pr.bed(m, bx, 30.2, .85, 1.35, head="n", cloth=("blue", "red", "green")[k])
for k, bx in enumerate((8.6, 9.75, 10.9, 12.05)): pr.bed(m, bx, 33.5, .85, 1.35, head="s", cloth=("green", "blue", "red", "blue")[k])
note("bunks", 11.5, 30.9); note("bunks", 10.9, 34.2)
pr.shelf(m, 10.2, 30.2, 1.0, .44, ["jug", "bowl"]); note("shelf", 10.7, 30.4)
m.table(13.4, 31.9, 1.1, 1.0, things=False); pr.stool(m, 13.1, 33.05); note("table", 13.95, 32.4)
pr.candle(m, int(14.82 * T), int(33.27 * T)); rec.light("Lamp (woodcutters' hut)", "Lamp by the door", (14.42, 32.87, .8, .8), dim=4, bright=1, color="#ffc46b", kind="candle")
pr.candle(m, int(11.85 * T), int(30.4 * T)); rec.light("Lamp (bunks)", "Lamp over the bunks", (11.45, 30.0, .8, .8), dim=4, bright=1, color="#ffc46b", kind="candle")
pr.chest(m, 13.6, 34.25, .95, .6); note("chest", 14.07, 34.55)
for k in range(3): pr.axe(m, int(8.35 * T), int((30.6 + k * .35) * T), ang=0.1, L=30)
note("axes on pegs", 8.5, 31.0)
fin()

# their yard: log stacks, the chopping block, a fire with seats, two kilns burning
pr.logpile(m, 17.7, 30.6, 3.8, 1.1); note("stack of cut logs", 19.6, 31.15)
pr.logpile(m, 22.25, 33.1, 1.1, 2.9, upright=True); note("stack of cut logs", 22.8, 34.55)
pr.chopping(m, 18.4, 33.6); note("chopping block", 18.4, 33.6)
wl.campfire(m, 16.6, 36.6, rec=rec, label="Woodcutters' fire", seats=0)
for sx, sy in ((15.2, 36.0), (17.9, 37.4), (10.0, 36.9), (23.0, 37.0), (23.0, 29.7), (14.9, 37.9)): wl.stump(m, sx, sy, 18)
note("stumps for seats", 16.6, 37.4)
wl.kiln(m, 20.0, 39.0, 190, lit=True, rec=rec, label="Charcoal kiln")
wl.kiln(m, 12.6, 40.6, 150, lit=True, rec=rec, label="Charcoal kiln, the smaller")
wl.trunk(m, 17.3, 42.8, 21.6, 43.7, 20); note("felled trunk", 19.4, 43.2)

# ---- the camp under the scarp, north-east ----
wl.outcrop(m, [(43.6, 2.0), (44.2, 6.0), (44.6, 10.0), (44.3, 14.0), (43.8, 19.8)], 1.15, face="e"); note("rock scarp", 44.2, 11)
wl.outcrop(m, [(62.6, 1.0), (63.0, 5.5), (63.4, 10.0), (63.1, 15.0), (62.8, 20.0)], .9, face="w")
wl.ladder(m, 45.9, 19.6, 46.4, 17.2); note("ladder against the rocks", 46.15, 18.4)
wl.tent(m, 46.8, 7.0, 1.4, 2.4, "x", cloth="linen"); wl.tent(m, 54.6, 6.0, 1.4, 2.4, "x", cloth="linen"); wl.tent(m, 48.8, 14.2, 1.4, 2.4, "x", cloth="linen")
note("tent", 48.0, 7.7); note("tent", 55.8, 6.7); note("tent", 50.0, 14.9)
wl.campfire(m, 53.0, 11.0, rec=rec, label="Camp fire", seats=7)
pr.crate(m, 57.6, 11.9, 44, goods="apples", name="Crate (camp)"); pr.crate(m, 57.1, 13.1, 44, goods="jars", lid="n", name="Crate of jars (camp)")
pr.barrel(m, 59.3, 12.9, 22, holds="water", name="Water cask (camp)")
wl.leanto(m, 57.0, 13.8, 3.0, 1.8, low="s"); note("lean-to shelter", 58.5, 14.7)
rec.region("camp", "Camp in the ravine", (45.0, 1.0, 17.4, 19.0), "camp")

# ---- the wood ----
for x, y, w_, h_ in ((3.2, 40.5, .9, .7), (27.6, 9.0, .7, .5), (40.0, 26.0, .8, .6), (60.4, 30.0, 1.0, .8), (33.2, 40.0, .7, .55), (9.8, 24.6, .6, .5)):
    wl.boulder(m, x, y, w_, h_); note("boulder", x, y)
wl.trunk(m, 4.6, 10.4, 5.4, 13.0, 18); note("fallen log", 5, 11.7)
wl.trunk(m, 52.6, 22.4, 56.8, 21.6, 20); note("fallen log", 54.7, 22)
clearings = [((16.2, 36.0), (9.6, 8.2)), ((53.6, 10.4), (9.4, 10.6)), ((5.9, 5.5), (3.8, 3.6)), ((33.0, 24.0), (3.6, 3.0)), ((5.0, 12.0), (2.6, 2.0))]


def shrine(x, y, s=.9):
    """A wooden wayside shrine at the fork: a post under a little shingled roof seen from above (two pitches, the
    west one in the light, a ridge), its shadow to the south-east, a posy and a candle stub left at its foot."""
    X0, Y0, X1, Y1 = int((x - s / 2) * T), int((y - s / 2) * T), int((x + s / 2) * T), int((y + s / 2) * T); mx = (X0 + X1) // 2
    m.shade((X0 + 10, Y0 + 12, X1 + 22, Y1 + 24), f=.6)
    m.box(X0, Y0, mx, Y1, "dwood", 3); m.box(mx, Y0, X1, Y1, "dwood", 1)
    for yy in range(Y0 + 9, Y1 - 2, 11):                                                  # shingle courses
        m.d.line([X0 + 3, yy, mx - 2, yy], fill=R["dwood"][2]); m.d.line([mx + 2, yy, X1 - 3, yy], fill=R["dwood"][0])
    m.box(mx - 4, Y0 - 4, mx + 4, Y1 + 4, "wood", 3, bevel=False)                       # the ridge board
    m.disc(mx - 6, Y1 + 14, 6, "red", 3); m.disc(mx - 1, Y1 + 18, 4, "straw", 4)            # posy
    m.box(mx + 10, Y1 + 10, mx + 15, Y1 + 18, "pale", 4, bevel=False)                      # candle stub
    m.box(mx - 3, Y0 - 16, mx + 3, Y0 + 14, "pale", 3, bevel=False); m.box(mx - 11, Y0 - 8, mx + 11, Y0 - 3, "pale", 3, bevel=False)   # its little cross
    note("wayside shrine", x, y)


def lookout(x, y):
    """The bandits' lookout oak: a broad crown with a ladder leaning up into it from the trail side."""
    m.tree(x * T, y * T, int(2.7 * T * .78))
    wl.ladder(m, x - 1.9, y + 1.2, x - .9, y + .55); note("ladder up into a big oak", x - 1.4, y + .9)


built = [(3.4, 3.4, 5.0, 4.2), (8.0, 30.0, 7.0, 5.0)]                                # the huts: no crown over a roof


def clear(x, y, r):
    """No tree in a clearing, on the road, over a hut, a kiln or the camp."""
    for (cx, cy), (rx, ry) in clearings:
        if ((x - cx) / (rx + r * .3)) ** 2 + ((y - cy) / (ry + r * .3)) ** 2 < 1: return True
    if any(bx - r * .55 < x < bx + bw + r * .55 and by - r * .55 < y < by + bh + r * .55 for bx, by, bw, bh in built): return True
    px_, py_ = min(max(int(x * T), 0), m.W - 1), min(max(int(y * T), 0), m.H - 1)
    return dt[py_, px_] < r * T * .45


oak = (46.9, 21.6)                                                                   # the lookout's oak over the trail
shrine(33.0, 23.85)
land.trees(m, W, H, lambda x, y, r: clear(x, y, r) or math.hypot(x - oak[0], y - oak[1]) < 3.2 + r * .5, n=1500, fir=.5, gap=.6)
lookout(*oak)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "forest-road")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
