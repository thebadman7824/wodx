"""The three-room timber farmhouse and its yard (20 x 14 squares): the drawer's first map and the gate's fixture.

    python3 tools/pixelmap/maps/farmhouse.py [OUTDIR]       default tools/gate/fixtures/pixel-farmhouse

Every object is drawn to be named at a glance by a player (RULES.md); every door, window, chest, cask, crate and sack
is an openable with a closed and an open picture (scene.py)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import numpy as np
from px import R, T, OUT
from bits import dist, curve
import props as pr
from scene import Recorder

W, H = 20, 14
rec = Recorder("Farmhouse", (W, H), seed=77, place="yard")
m = rec.m
rng, d = m.rng, m.d
TH = 26
px = lambda v: int(v * T)
note = rec.note                                                                  # what stands where: the key a player's eye and later game logic read

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

# ---- main room ----
m.rug(6.3, 5.2, 3.0, 2.1, "red", "gold"); note("rug", 7.8, 6.25)
m.table(6.7, 5.75, 2.2, 1.0, things=False); note("table", 7.8, 6.25)
tx, ty = px(6.7), px(5.75)
pr.bowl(m, tx + 30, ty + 26, 9, food=(150, 128, 76), spoon=True); pr.bowl(m, tx + 150, ty + 66, 9, food=(150, 128, 76), spoon=True); pr.bowl(m, tx + 34, ty + 70, 9, food=(150, 128, 76))
pr.loaf(m, tx + 96, ty + 34, 13, 9); pr.knife(m, tx + 118, ty + 40, .3); pr.jug(m, tx + 176, ty + 26, 9); pr.cup(m, tx + 70, ty + 60); pr.cup(m, tx + 132, ty + 22); pr.cheese(m, tx + 100, ty + 70, 8)
pr.candle(m, tx + 60, ty + 24)
pr.bench(m, 6.8, 5.22, 2.0, .36); pr.bench(m, 6.8, 6.9, 2.0, .36); note("bench", 7.8, 5.4); note("bench", 7.8, 7.08)
pr.stool(m, 9.35, 6.25); note("stool", 9.35, 6.25)
pr.bed(m, 4.25, 8.4, .95, 1.4, head="s", cloth="blue"); note("bed", 4.72, 8.8)
pr.painted_chest(m, 5.35, 9.2, 1.0, .62, "red", name="Red painted chest")
pr.shelf(m, 8.3, 3.16, 2.5, .44, ["jug", "bowl", "plates", "loaf", "cheese", "cups", "pot", "eggs", "bowl", "jug"]); note("shelf of crockery and food", 9.55, 3.4)
pr.logpile(m, 5.7, 3.22, .95, .44); note("firewood", 6.2, 3.45)
pr.barrel(m, 10.45, 9.4, 30, holds="water", name="Water cask"); pr.barrel(m, 9.75, 9.5, 22, holds="kraut", name="Sauerkraut crock")
pr.bucket(m, px(8.6), px(9.45), 14); note("water bucket", 8.6, 9.45)
pr.bench(m, 10.5, 5.7, .36, 2.2); pr.fleece(m, 10.48, 6.0, .4, .7); note("wall bench with a sheepskin", 10.68, 6.8)
pr.basket(m, px(4.55), px(6.3), 17, "wool"); pr.distaff(m, px(4.9), px(6.15), .4); note("wool basket and spindle", 4.6, 6.3)
pr.stool(m, 5.25, 6.75); note("stool", 5.25, 6.75)

# ---- chamber ----
m.rug(11.5, 4.2, 2.3, 1.5, "blue", "linen"); note("rug", 12.65, 4.95)
pr.bed(m, 14.4, 3.2, 1.3, 1.5, head="n", cloth="red"); note("great bed", 15.07, 4.3)
pr.painted_chest(m, 14.55, 5.6, 1.05, .62, "blue", name="Blue painted chest")
pr.bed(m, 11.3, 5.95, 1.35, .8, head="w", cloth="green"); note("cot", 12.07, 6.32)
m.table(12.6, 3.2, .9, .6, things=False); pr.candle(m, px(13.2), px(3.5)); note("small table with a candle", 13.05, 3.5)
cx_, cy_ = px(12.85), px(3.5); L_ = R["linen"]; d.rectangle([cx_ - 12, cy_ - 9, cx_ + 6, cy_ + 9], fill=L_[3], outline=OUT)        # a folded shift
for k in (-4, 1, 6): d.line([cx_ - 11, cy_ + k, cx_ + 5, cy_ + k], fill=L_[1])
d.line([cx_ - 11, cy_ - 8, cx_ + 5, cy_ - 8], fill=L_[4])
pr.shelf(m, 11.2, 3.2, .44, 1.1, ["linen", "candle", "jug", "linen"]); note("shelf of linen", 11.42, 3.75)

# ---- store ----
for (x, y, r), hd in zip(((11.5, 7.5, 32), (12.25, 7.5, 32), (13.0, 7.45, 28), (11.45, 8.5, 24)), ("grain", "grain", "apples", "water")): pr.barrel(m, x, y, r, holds=hd, head="e" if x > 12.9 or y > 8 else "s", name={"grain": "Cask of grain", "apples": "Cask of apples", "water": "Water cask"}[hd])
for x, y in ((15.3, 7.5), (14.5, 7.5), (15.3, 8.15), (14.6, 8.1)): pr.sack(m, x, y, 24, name="Grain sack")
pr.shelf(m, 11.8, 9.5, 2.6, .42, ["pot", "pot", "cheese", "cheese", "jug", "apples", "eggs", "bowl", "pot", "loaf"]); note("shelf of stores", 13.1, 9.7)
pr.crate(m, 14.55, 9.3, goods="apples", name="Crate of apples"); pr.crate(m, 15.22, 9.3, goods="jars", lid="n", name="Crate of jars")
pr.basket(m, px(13.7), px(8.75), 17, "onions"); pr.basket(m, px(14.15), px(8.95), 14, "turnips"); note("baskets of onions and turnips", 13.9, 8.85)
pr.hay(m, 11.75, 9.05, 24); note("hay and pitchfork", 11.75, 9.05)

# ---- walls, then openings, then posts ----
for sg in [(4, 3, 16, 3), (4, 10, 16, 10), (4, 3, 4, 10), (16, 3, 16, 10), (11, 3, 11, 10), (11, 7, 16, 7)]: rec.wall(*sg, th=TH, kind="wood")
m.oven(4.14, 3.14, 1.4, 1.4, side="n"); note("bake oven", 4.84, 3.84); rec.light("bake-oven", "The bake oven", (4.14, 3.14, 1.4, 1.4), dim=4, bright=1.5)
pr.door(m, 7, 10, 8, 10, TH, swing=-1, hinge="a", exterior=True, name="Front door")
pr.door(m, 16, 8, 16, 9, TH, swing=1, hinge="b", exterior=True, name="Store door")
pr.door(m, 11, 4.4, 11, 5.4, TH, swing=1, hinge="b", name="Chamber door")
pr.door(m, 11, 8.1, 11, 9.1, TH, swing=-1, hinge="a", name="Door to the store")
pr.door(m, 13.2, 7, 14.2, 7, TH, swing=-1, hinge="a", name="Door between chamber and store")
for w_ in ((5, 10, 6, 10), (9.4, 10, 10.4, 10), (7.6, 3, 8.6, 3), (12.9, 3, 13.9, 3), (4, 5.8, 4, 6.8), (16, 4.4, 16, 5.4), (12.4, 10, 13.4, 10)): pr.window(m, *w_, th=TH, name="Window")
for x, y in ((4, 3), (16, 3), (4, 10), (16, 10), (11, 3), (11, 10), (11, 7), (16, 7)): m.post(x, y, 30)

# ---- yard ----
pr.washline(m, 4.2, 12.0, 6.7, 11.7, [("linen", 34), ("red", 20), ("linen", 38), ("blue", 18)]); note("washing line", 5.45, 11.85)
pr.logpile(m, 2.75, 4.0, .9, 2.2, upright=True); note("woodpile", 3.2, 5.1)
pr.chopping(m, 3.15, 6.95); note("chopping block and axe", 3.15, 6.95)
pr.well(m, 2.6, 11.4); note("well", 2.6, 11.4)
pr.garden(m, 9.2, 12.3, 15.6, 13.75); note("kitchen garden", 12.4, 13.0)
pr.wattle(m, 9.13, 12.24, 15.67, 12.24); pr.wattle(m, 9.13, 12.24, 9.13, 13.82); pr.wattle(m, 15.67, 12.24, 15.67, 13.82); note("wattle fence", 15.67, 13.0)
pr.bench(m, 8.3, 10.38, 1.5, .34); note("bench", 9.05, 10.55)
pr.trough(m, 17.3, 6.2, .46, 1.4); note("water trough", 17.53, 6.9)
for x, y, r, b in ((2.0, 2.2, 28, R["red"][3]), (17.6, 2.6, 30, None), (18.3, 11.0, 26, None), (1.3, 8.6, 24, None), (17.0, 12.9, 22, R["blue"][2])): m.bush(px(x), px(y), r, b)
for x, y, w_, h_ in ((18.6, 4.8, 20, 15), (5.4, 12.6, 16, 12), (1.1, 13.1, 24, 16)): m.rock(px(x), px(y), w_, h_)
m.tree(px(18.9), px(0.6), 104); m.tree(px(0.4), px(0.2), 96); m.fir(px(19.3), px(13.4), 92); m.tree(px(0.2), px(4.9), 84)

pr.herbs(m, 8.05, 9.62, 9.35); note("herbs and onions on the beam", 8.7, 9.75)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)   # the fire lights the floor before it
rec.region("house", "Farmhouse", (4, 3, 12, 7), "home")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "gate", "fixtures", "pixel-farmhouse")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
