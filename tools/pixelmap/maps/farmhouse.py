"""The three-room timber farmhouse and its yard (20 x 14 squares), about 1200: the drawer's first map and the gate's
fixture, drawn from the object library (B6338).

    python3 tools/pixelmap/maps/farmhouse.py [OUTDIR]       default tools/gate/fixtures/pixel-farmhouse

Ground, floors and walls are laid first; every object then comes from tools/pixelmap/library, set by its true size,
facing the room it serves, and checked against the walls, doors and windows before the map is written."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import numpy as np
from px import R, T
from bits import dist, curve
import library as lib
from scene import Recorder

W, H = 20, 14
rec = Recorder("Farmhouse", (W, H), seed=77, place="yard"); rec.year = 1200
m = rec.m
rng, d = m.rng, m.d
TH = 26
px = lambda v: int(v * T)
put, wall_put = lib.put, lib.by_wall

# ---- yard ground ----
a = m.grass(m.H, m.W)
path = curve([(7.5, 15), (7.7, 12.4), (7.5, 10.4)]); side = curve([(7.5, 11.6), (11, 11.9), (15, 11.6), (17.2, 9.6), (17.0, 8.5)])
dt = np.minimum(dist(path, m.W, m.H) - 40, dist(side, m.W, m.H) - 22) + (m.noise(m.H, m.W, 30) - .5) * 22 + (m.noise(m.H, m.W, 8) - .5) * 12
dirt = m.dirt(m.H, m.W)
a[(dt < 12) & (dt >= 0)] = R["grass"][1]; a[dt < 0] = dirt[dt < 0]
m.put(a, 0, 0)

# ---- floors ----
def floor(x0, y0, arr): m.put(arr, x0 * T, y0 * T)
floor(4, 3, m.planks(px(7), px(7), "wood", bh=18))
floor(11, 3, m.planks(px(4), px(5), "dwood", bh=16, vertical=True))
st = m.dirt(px(3), px(5)); st = (st * .86).astype(np.uint8); floor(11, 7, st)
for _ in range(260):                                                            # straw trodden into the store's earth floor
    x, y = rng.integers(px(11) + 6, px(16) - 10), rng.integers(px(7) + 6, px(10) - 6); k = rng.integers(0, 3)
    d.line([x, y, x + (5, 3, -4)[k], y + (1, 4, 3)[k]], fill=R["straw"][int(rng.integers(2, 5))])

# ---- walls first, so every object is set against them ----
N, S_, Wst, E_ = (4, 3, 16, 3), (4, 10, 16, 10), (4, 3, 4, 10), (16, 3, 16, 10)
MID, STORE = (11, 3, 11, 10), (11, 7, 16, 7)
for sg in (N, S_, Wst, E_, MID, STORE): rec.wall(*sg, th=TH, kind="wood")
for x, y in ((4, 3), (16, 3), (4, 10), (16, 10), (11, 3), (11, 10), (11, 7), (16, 7)): m.post(x, y, 30)
MAIN, CHAMBER, STOREROOM = (7.5, 6.5), (13.5, 5), (13.5, 8.5)

# ---- doors and windows, at the walls' own thickness ----
lib.door(rec, S_, 7.5, toward=MAIN, exterior=True, swing=-1, hinge="a", name="Front door")
lib.door(rec, E_, 8.5, toward=STOREROOM, exterior=True, swing=1, hinge="b", name="Store door")
lib.door(rec, MID, 4.9, toward=CHAMBER, swing=1, hinge="b", name="Chamber door")
lib.door(rec, MID, 8.6, toward=STOREROOM, swing=-1, hinge="a", name="Door to the store")
lib.door(rec, STORE, 13.7, toward=STOREROOM, swing=-1, hinge="a", name="Door between chamber and store")
for line, at, room in ((S_, 5.5, MAIN), (S_, 9.9, MAIN), (N, 8.1, MAIN), (N, 13.4, CHAMBER), (Wst, 6.3, MAIN), (E_, 4.9, CHAMBER), (S_, 12.9, STOREROOM)):
    lib.window(rec, line, at, toward=room, name="Window")

# ---- main room: oven, hearth corner, table, bed ----
wall_put(rec, "oven", N, 5.05, MAIN, name="Bake oven")
wall_put(rec, "woodpile", N, 6.55, MAIN, w=4.5, name="Firewood")
wall_put(rec, "shelf", N, 9.75, MAIN, w=6, name="Shelf of crockery and food")
wall_put(rec, "pegrail", Wst, 5.2, MAIN, w=4.5, name="Peg rail with cloaks")
put(rec, "rug", 6.45, 5.25, w=9.5, d=5.5, var="red")
tbl = put(rec, "table", 6.85, 5.85, w=7, d=3)
for oid, dx, dy in (("bowl", .1, .08), ("bowl", 1.05, .32), ("loaf", .5, .12), ("jug", 1.15, .05), ("cup", .35, .38), ("candle", .8, .1), ("cheese", .6, .35)):
    put(rec, oid, tbl.x + dx, tbl.y + dy, on=tbl)
put(rec, "bench", 6.95, 5.5, w=6, d=1.25); put(rec, "bench", 6.95, 6.52, w=6, d=1.25)
put(rec, "stool", 8.35, 6.0)
wall_put(rec, "bed", Wst, 8.65, MAIN, w=4.5, d=6.5, var="blue")
wall_put(rec, "chest", S_, 6.45, MAIN, w=4, d=2, var="red", name="Red painted chest")
put(rec, "cask", 9.65, 9.25, face="n", var="water", name="Water cask")
put(rec, "cask", 9.15, 9.35, face="n", w=1.75, d=1.75, var="kraut", name="Sauerkraut crock")
put(rec, "bucket", 8.65, 9.45, name="Water bucket")
wall_put(rec, "bench", MID, 6.3, MAIN, w=6, d=1.25, name="Wall bench")
put(rec, "basket", 4.35, 7.05, var="wool", name="Wool basket"); put(rec, "distaff", 4.75, 7.15)
put(rec, "stool", 5.15, 7.35)
put(rec, "broom", 9.8, 3.8, face="e")

# ---- chamber ----
wall_put(rec, "bed", N, 15.0, CHAMBER, w=5, d=6.75, var="red", name="Great bed")
wall_put(rec, "chest", E_, 6.2, CHAMBER, w=4.25, d=2, var="blue", name="Blue painted chest")
wall_put(rec, "bed-narrow", MID, 6.15, CHAMBER, w=3.25, d=6.25, var="green", name="Cot")
st_ = wall_put(rec, "table-small", N, 12.05, CHAMBER, w=3.25, d=2.25, name="Small table")
put(rec, "candle", st_.x + .26, st_.y + .2, on=st_)
wall_put(rec, "shelf", MID, 3.85, CHAMBER, w=3.5, var="linen", name="Shelf of linen")
put(rec, "rug", 12.2, 4.35, w=7, d=4.5, var="blue")
put(rec, "boots", 13.9, 3.35)

# ---- store ----
wall_put(rec, "casks", STORE, 12.25, STOREROOM, w=4.5, name="Casks of grain and apples")
for x in (14.4, 14.9): put(rec, "sack", x, 7.2, w=2.25, d=1.75, name="Grain sack")
wall_put(rec, "shelf", S_, 14.3, STOREROOM, w=6, var="stores", name="Shelf of stores")
put(rec, "crate", 11.2, 9.3, face="n", var="apples", name="Crate of apples"); put(rec, "crate", 11.75, 9.3, face="n", var="jars", name="Crate of jars")
put(rec, "basket", 13.05, 8.35, var="onions", name="Basket of onions"); put(rec, "basket", 13.45, 8.65, w=1.5, d=1.5, var="turnips", name="Basket of turnips")
put(rec, "hayheap", 12.35, 7.95, w=3, d=3, name="Hay and pitchfork")
put(rec, "cask", 15.35, 7.2, var="grain", face="s", name="Cask of grain"); put(rec, "bucket", 14.6, 8.0, var="empty")
put(rec, "rope", 12.9, 9.35); put(rec, "tool", 14.55, 9.2, var="fork", name="Pitchfork")

# ---- yard ----
put(rec, "washline", 4.2, 11.55, w=12.5, d=2, name="Washing line")
wall_put(rec, "woodpile", Wst, 4.25, (2, 6), w=9, d=2.5, name="Woodpile")
put(rec, "chopping", 2.55, 6.55, name="Chopping block and axe")
put(rec, "well", 1.6, 10.4, name="Well")
put(rec, "garden", 9.2, 12.3, w=32, d=7, name="Kitchen garden")
put(rec, "wattle", 9.1, 12.12, w=33, d=.9, name="Wattle fence")
for x in (9.0, 15.55): put(rec, "wattle", x, 12.25, face="e", w=7.5, d=.9, name="Wattle fence")
wall_put(rec, "trough", E_, 7.0, (18, 7), w=7, d=2.25, name="Water trough")
wall_put(rec, "butt", N, 10.4, (10, 1), name="Water butt")
for x, y, r_, var in ((1.5, 1.6, 6, "red berries"), (17.0, 2.0, 6, "plain"), (17.8, 10.4, 5.5, "plain"), (0.8, 8.1, 5, "plain"), (16.6, 12.5, 4.5, "plain")):
    put(rec, "bush", x, y, w=r_, d=r_, var=var)
for x, y in ((18.4, 4.6), (5.2, 12.5), (0.9, 12.9)): put(rec, "stones", x, y)
put(rec, "tree", 16.9, -1.4, w=20, d=20); put(rec, "tree", -1.6, -1.8, w=20, d=20); put(rec, "fir", 17.5, 11.6, w=18, d=18); put(rec, "tree", -1.5, 3.2, w=18, d=18)

for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)   # the fire lights the floor before it
rec.region("house", "Farmhouse", (4, 3, 12, 7), "home")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "gate", "fixtures", "pixel-farmhouse")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
