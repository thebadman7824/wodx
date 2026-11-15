"""Rothenstein valley: Lower Town, the Market Square (64 x 44 squares), redrawn in WoDX's own pixel art on the old
map's layout (the Whole World desk, r1 to r3). The cobbled square with its market cross, well, stalls and lantern
posts, and round it the Inn at the Crossing and its stables, the bakery, Richter Graff's house with its strongroom,
the chandler's house, Master Voss the apothecary, the barber-surgeon, the Lame Ox tavern, a house, the butcher's shop
and smokehouse, the general store and the hatter and glover. Streets go out west to the West Gate, north to Church
Close, north-east to the Keep Road, east to Craftsmen's Lane and south to the Riverside Quay.

    python3 tools/pixelmap/maps/lt_market.py OUTDIR

Every wall, door, window, fence, light, roof and exit sits on the old scene's own (the testbed export, 80 px a
square), so the scene's notes, Ways and lights still fit. Daylight colours; Foundry's clock darkens."""
import math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T, OUT
import props as pr
import land
import wilds as wl
import town as tw
import roofs as RF
import buildings as B
from scene import Recorder

W, H = 64, 44
rec = Recorder("Lower Town, the Market Square", (W, H), seed=1260, place="town")
m = rec.m; note = rec.note; d = m.d; rng = m.rng
land.ground(m, floor="grass")

# ---- the old scene's lines (squares) ----
WALLS = [(34.0, 1.4, 37.15, 1.4), (37.75, 1.4, 44.6, 1.4), (34.0, 1.4, 34.0, 5.2), (44.6, 1.4, 44.6, 5.0), (2.0, 1.6, 5.6, 1.6), (6.2, 1.6, 10.2, 1.6),
         (10.8, 1.6, 14.8, 1.6), (15.4, 1.6, 19.0, 1.6), (2.0, 1.6, 2.0, 5.7), (12.0, 1.6, 12.0, 3.7), (19.0, 1.6, 19.0, 4.1), (20.4, 2.2, 23.5, 2.2),
         (24.3, 2.2, 27.4, 2.2), (20.4, 2.2, 20.4, 9.4), (27.4, 2.2, 27.4, 9.4), (52.4, 2.4, 55.6, 2.4), (56.4, 2.4, 59.6, 2.4), (52.4, 2.4, 52.4, 4.9),
         (59.6, 2.4, 59.6, 4.8), (40.6, 1.4, 40.6, 2.8), (40.6, 3.8, 40.6, 9.2), (44.6, 5.6, 44.6, 9.2), (37.8, 5.6, 40.6, 5.6), (34.0, 5.6, 36.8, 5.6),
         (12.0, 4.7, 12.0, 7.7), (12.0, 6.2, 14.5, 6.2), (15.5, 6.2, 19.0, 6.2), (19.0, 5.1, 19.0, 10.4), (20.4, 6.2, 23.4, 6.2), (24.4, 6.2, 27.4, 6.2),
         (59.6, 5.6, 59.6, 8.0), (52.4, 8.0, 55.6, 8.0), (56.4, 8.0, 59.6, 8.0), (52.4, 5.9, 52.4, 8.0), (34.0, 6.2, 34.0, 9.2), (34.0, 9.2, 36.8, 9.2),
         (37.8, 9.2, 44.6, 9.2), (2.0, 6.3, 2.0, 10.4), (2.0, 10.4, 5.6, 10.4), (60.6, 6.6, 63.4, 6.6), (60.6, 8.8, 63.4, 8.8), (60.6, 6.6, 60.6, 8.8),
         (63.4, 6.6, 63.4, 8.8), (12.0, 8.7, 12.0, 10.4), (10.8, 10.4, 14.8, 10.4), (6.2, 10.4, 7.5, 10.4), (8.5, 10.4, 10.2, 10.4), (15.4, 10.4, 17.0, 10.4),
         (18.0, 10.4, 19.0, 10.4), (20.4, 9.4, 23.4, 9.4), (24.4, 9.4, 27.4, 9.4), (50.4, 11.4, 53.2, 11.4), (54.0, 11.4, 56.4, 11.4), (57.2, 11.4, 60.0, 11.4),
         (50.4, 11.4, 50.4, 14.9), (55.6, 11.4, 55.6, 13.1), (60.0, 11.4, 60.0, 19.2), (2.0, 12.2, 10.0, 12.2), (2.0, 12.2, 2.0, 18.2), (10.0, 12.2, 10.0, 18.2),
         (2.0, 18.2, 10.0, 18.2), (4.6, 12.2, 4.6, 14.4), (7.3, 12.2, 7.3, 14.4), (55.6, 14.1, 55.6, 16.9), (55.6, 15.6, 57.3, 15.6), (58.3, 15.6, 60.0, 15.6),
         (50.4, 15.9, 50.4, 19.2), (50.4, 19.2, 52.1, 19.2), (55.6, 17.9, 55.6, 19.2), (53.1, 19.2, 56.4, 19.2), (57.2, 19.2, 60.0, 19.2),
         (30.9, 21.3, 33.1, 21.3), (30.9, 23.5, 33.1, 23.5), (30.9, 21.3, 30.9, 23.5), (33.1, 21.3, 33.1, 23.5), (51.0, 25.6, 53.5, 25.6), (54.5, 25.6, 56.85, 25.6),
         (57.65, 25.6, 60.4, 25.6), (51.0, 25.6, 51.0, 28.6), (60.4, 25.6, 60.4, 28.6), (56.4, 25.6, 56.4, 28.5), (2.4, 26.2, 6.4, 26.2), (7.4, 26.2, 9.7, 26.2),
         (10.3, 26.2, 13.6, 26.2), (2.4, 26.2, 2.4, 29.15), (13.6, 26.2, 13.6, 28.7), (51.0, 29.4, 51.0, 32.4), (60.4, 29.4, 60.4, 32.4), (56.4, 29.5, 56.4, 32.4),
         (51.0, 32.4, 53.75, 32.4), (54.55, 32.4, 56.85, 32.4), (57.65, 32.4, 60.4, 32.4), (13.6, 29.7, 13.6, 36.0), (2.4, 29.75, 2.4, 36.0),
         (2.4, 32.4, 4.9, 32.4), (5.9, 32.4, 10.5, 32.4), (11.5, 32.4, 13.6, 32.4), (8.0, 32.4, 8.0, 36.0), (2.4, 36.0, 5.7, 36.0), (6.3, 36.0, 9.7, 36.0),
         (10.3, 36.0, 13.6, 36.0), (47.0, 35.6, 48.5, 35.6), (49.5, 35.6, 52.8, 35.6), (47.0, 35.6, 47.0, 38.1), (52.8, 35.6, 52.8, 38.1), (35.0, 36.2, 37.8, 36.2),
         (38.8, 36.2, 45.6, 36.2), (35.0, 36.2, 35.0, 39.2), (45.6, 36.2, 45.6, 39.2), (41.6, 36.2, 41.6, 39.1), (17.6, 36.4, 21.1, 36.4), (22.1, 36.4, 26.0, 36.4),
         (17.6, 36.4, 17.6, 43.0), (26.0, 36.4, 26.0, 43.0), (17.6, 39.6, 23.6, 39.6), (24.6, 39.6, 26.0, 39.6), (26.6, 36.6, 27.4, 36.6), (28.4, 36.6, 29.2, 36.6),
         (26.6, 36.6, 26.6, 42.6), (29.2, 36.6, 29.2, 42.6), (26.6, 42.6, 29.2, 42.6), (2.4, 37.4, 5.7, 37.4), (6.5, 37.4, 9.8, 37.4), (2.4, 37.4, 2.4, 39.8),
         (9.8, 37.4, 9.8, 39.5), (47.0, 38.9, 47.0, 41.4), (52.8, 38.9, 52.8, 41.4), (47.0, 41.4, 49.5, 41.4), (50.3, 41.4, 52.8, 41.4), (35.0, 40.0, 35.0, 43.0),
         (35.0, 43.0, 38.05, 43.0), (45.6, 40.0, 45.6, 40.7), (38.85, 43.0, 45.6, 43.0), (45.6, 41.7, 45.6, 43.0), (41.6, 40.1, 41.6, 43.0), (9.8, 40.5, 9.8, 43.0),
         (6.5, 43.0, 9.8, 43.0), (2.4, 40.6, 2.4, 43.0), (2.4, 43.0, 5.7, 43.0), (17.6, 43.0, 20.1, 43.0), (20.9, 43.0, 22.7, 43.0), (23.5, 43.0, 26.0, 43.0)]
DOORS = [(40.6, 2.8, 40.6, 3.8), (12.0, 3.7, 12.0, 4.7), (19.0, 4.1, 19.0, 5.1), (52.4, 4.9, 52.4, 5.9), (34.0, 5.2, 34.0, 6.2), (36.8, 5.6, 37.8, 5.6),
         (14.5, 6.2, 15.5, 6.2), (23.4, 6.2, 24.4, 6.2), (12.0, 7.7, 12.0, 8.7), (36.8, 9.2, 37.8, 9.2), (23.4, 9.4, 24.4, 9.4), (7.5, 10.4, 8.5, 10.4),
         (17.0, 10.4, 18.0, 10.4), (55.6, 13.1, 55.6, 14.1), (50.4, 14.9, 50.4, 15.9), (57.3, 15.6, 58.3, 15.6), (55.6, 16.9, 55.6, 17.9), (52.1, 19.2, 53.1, 19.2),
         (53.5, 25.6, 54.5, 25.6), (6.4, 26.2, 7.4, 26.2), (56.4, 28.5, 56.4, 29.5), (13.6, 28.7, 13.6, 29.7), (4.9, 32.4, 5.9, 32.4), (10.5, 32.4, 11.5, 32.4),
         (48.5, 35.6, 49.5, 35.6), (37.8, 36.2, 38.8, 36.2), (21.1, 36.4, 22.1, 36.4), (27.4, 36.6, 28.4, 36.6), (41.6, 39.1, 41.6, 40.1), (9.8, 39.5, 9.8, 40.5),
         (23.6, 39.6, 24.6, 39.6), (45.6, 40.7, 45.6, 41.7)]
WINDOWS = [(37.15, 1.4, 37.75, 1.4), (5.6, 1.6, 6.2, 1.6), (10.2, 1.6, 10.8, 1.6), (14.8, 1.6, 15.4, 1.6), (23.5, 2.2, 24.3, 2.2), (55.6, 2.4, 56.4, 2.4),
           (59.6, 4.8, 59.6, 5.6), (44.6, 5.0, 44.6, 5.6), (2.0, 5.7, 2.0, 6.3), (55.6, 8.0, 56.4, 8.0), (5.6, 10.4, 6.2, 10.4), (10.2, 10.4, 10.8, 10.4),
           (14.8, 10.4, 15.4, 10.4), (53.2, 11.4, 54.0, 11.4), (56.4, 11.4, 57.2, 11.4), (56.4, 19.2, 57.2, 19.2), (56.85, 25.6, 57.65, 25.6), (9.7, 26.2, 10.3, 26.2),
           (51.0, 28.6, 51.0, 29.4), (60.4, 28.6, 60.4, 29.4), (2.4, 29.15, 2.4, 29.75), (53.75, 32.4, 54.55, 32.4), (56.85, 32.4, 57.65, 32.4), (5.7, 36.0, 6.3, 36.0),
           (9.7, 36.0, 10.3, 36.0), (5.7, 37.4, 6.5, 37.4), (47.0, 38.1, 47.0, 38.9), (52.8, 38.1, 52.8, 38.9), (35.0, 39.2, 35.0, 40.0), (45.6, 39.2, 45.6, 40.0),
           (2.4, 39.8, 2.4, 40.6), (49.5, 41.4, 50.3, 41.4), (5.7, 43.0, 6.5, 43.0), (20.1, 43.0, 20.9, 43.0), (22.7, 43.0, 23.5, 43.0), (38.05, 43.0, 38.85, 43.0)]
FENCES = [(51.0, 9.4, 63.8, 9.4), (60.4, 10.6, 63.8, 10.6), (63.8, 10.6, 63.8, 19.4), (60.4, 19.4, 63.8, 19.4),
          (42.4, 16.2, 46.2, 16.2), (42.4, 16.2, 42.4, 19.4), (46.2, 16.2, 46.2, 19.4), (42.4, 19.4, 46.2, 19.4)]
# name: (x, y, w, h), wall kind, floors [(x, y, w, h, kind)]
BLD = {"Inn at the Crossing": ((2, 1.6, 17, 8.8), "stone", [(2, 1.6, 10, 8.8, "flags"), (12, 1.6, 7, 4.6, "flags"), (12, 6.2, 7, 4.2, "planks")]),
       "Bakery": ((20.4, 2.2, 7, 7.2), "stone", [(20.4, 2.2, 7, 4, "flags"), (20.4, 6.2, 7, 3.2, "planks")]),
       "Richter Graff's house": ((34, 1.4, 10.6, 7.8), "stone", [(34, 1.4, 10.6, 7.8, "flags")]),
       "Chandler's house": ((52.4, 2.4, 7.2, 5.6), "wood", [(52.4, 2.4, 7.2, 5.6, "planks")]),
       "Woodshed": ((60.6, 6.6, 2.8, 2.2), "wood", [(60.6, 6.6, 2.8, 2.2, "earth")]),
       "Master Voss, apothecary": ((50.4, 11.4, 9.6, 7.8), "wood", [(50.4, 11.4, 9.6, 7.8, "planks")]),
       "Inn stables": ((2, 12.2, 8, 6), "wood", [(2, 12.2, 8, 6, "earth")]),
       "Barber-surgeon": ((51, 25.6, 9.4, 6.8), "wood", [(51, 25.6, 9.4, 6.8, "planks")]),
       "Lame Ox tavern": ((2.4, 26.2, 11.2, 9.8), "stone", [(2.4, 26.2, 11.2, 9.8, "flags")]),
       "House by the tavern": ((2.4, 37.4, 7.4, 5.6), "wood", [(2.4, 37.4, 7.4, 5.6, "planks")]),
       "Hatter and glover": ((47, 35.6, 5.8, 5.8), "wood", [(47, 35.6, 5.8, 5.8, "planks")]),
       "General store": ((35, 36.2, 10.6, 6.8), "wood", [(35, 36.2, 10.6, 6.8, "planks")]),
       "Butcher's shop": ((17.6, 36.4, 8.4, 6.6), "stone", [(17.6, 36.4, 8.4, 6.6, "flags")]),
       "Smokehouse": ((26.6, 36.6, 2.6, 6), "wood", [(26.6, 36.6, 2.6, 6, "earth")])}
ROOFS = [("Inn at the Crossing", (10.5, 6.01, 18.2, 10.01), "shingle", (2.77, 6.05)), ("Inn stables", (6.0, 15.2, 9.07, 7.06), "thatch", None),
         ("Bakery", (23.9, 5.81, 8.06, 8.26), "shingle", (26.0, 4.2)), ("Richter Graff's house", (39.3, 5.3, 11.8, 9.01), "slate", (39.99, 7.34)),
         ("Master Voss, apothecary", (55.2, 15.3, 10.65, 8.86), "shingle", None), ("Barber-surgeon", (55.7, 29.0, 10.45, 7.85), "shingle", None),
         ("Butcher's shop", (21.8, 39.7, 9.45, 7.65), "shingle", None), ("Smokehouse", (27.9, 39.6, 3.65, 7.05), "shingle", (27.88, 42.0)),
         ("General store", (40.3, 39.6, 11.65, 7.85), "shingle", None), ("Hatter and glover", (49.9, 38.5, 6.85, 6.85), "shingle", None),
         ("Lame Ox tavern", (8.0, 31.1, 12.4, 11.01), "shingle", (3.1, 29.45)), ("House by the tavern", (6.11, 40.2, 8.46, 6.65), "thatch", (6.12, 40.23)),
         ("Chandler's house", (56.0, 5.21, 8.25, 6.66), "shingle", (56.02, 5.22))]


def inside(px_, py_, r, e=.15):
    x, y, w, h = r; return x - e <= px_ <= x + w + e and y - e <= py_ <= y + h + e


def owner(c):
    mx, my = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
    for name, (r, kind, fl) in BLD.items():
        if inside(mx, my, r): return name, r, kind
    return None, None, "wood"


# ---- the streets: cobbles everywhere but the gardens ----
yy, xx = np.mgrid[0:m.H, 0:m.W]; sx, sy = xx / T, yy / T
green = ((sx > 53.4) & (sy > 34.6)) | ((sx > 60.2) & (sy > 9.6) & (sy < 20.2)) | (sy < .9) | ((sx < 1.6) & ((sy < 11) | (sy > 25))) | (sy > 43.4)
edge = m.noise(m.H, m.W, 40) * 1.2                                                     # the cobbles' edge breaks up into the grass
green = green | ((sy < .9 + edge) & (sx > 45) & (sx < 51))
tw.cobbles(m, ~green)
note("market square, cobbled", 32, 27)
pr.garden(m, 60.6, 10.9, 63.6, 19.1); note("herb garden", 62.1, 15)
pr.garden(m, 54.4, 35.6, 63.2, 43.2); note("vegetable garden", 58.8, 39.4)

# ---- floors, walls, doors, windows, fences ----
for name, (r, kind, fl) in BLD.items():
    for x, y, w, h, k in fl: B._floor(m, x, y, w, h, k)
for c in WALLS:
    _, r, kind = owner(c); rec.wall(*c, th=26, kind=kind)
for c in DOORS:
    name, r, _ = owner(c); ctr = (r[0] + r[2] / 2, r[1] + r[3] / 2)
    outside = c[0] in (r[0], r[0] + r[2]) or c[1] in (r[1], r[1] + r[3]) or abs(c[0] - r[0]) < .05 or abs(c[0] - r[0] - r[2]) < .05 or abs(c[1] - r[1]) < .05 or abs(c[1] - r[1] - r[3]) < .05
    pr.door(m, *c, 26, centre=ctr, swing=-1, hinge="a", exterior=outside, name=f"Door ({name})")
for c in WINDOWS:
    name, r, _ = owner(c); pr.window(m, *c, th=26, centre=(r[0] + r[2] / 2, r[1] + r[3] / 2), glass=name in ("Richter Graff's house", "Inn at the Crossing"), name=f"Window ({name})")
for c in FENCES: tw.hurdles(m, *c)
note("hurdle fence", 57, 9.4); note("sheep pen", 44.3, 17.8)
for name, (r, kind, fl) in BLD.items():
    for px_, py_ in ((r[0], r[1]), (r[0] + r[2], r[1]), (r[0], r[1] + r[3]), (r[0] + r[2], r[1] + r[3])): m.post(px_, py_, 30, "stone" if kind == "stone" else "dwood")
    rec.region(name, name, r, "home" if name in ("Chandler's house", "House by the tavern") else "shop")
for name, (cx, cy, w, h), kind, smoke in ROOFS:
    rec.roof(f"roof-{name}", f"Roof ({name})", (cx - w / 2, cy - h / 2, w, h), kind, smoke=smoke)


def light(x, y, label, kind="candle", dim=3, color="#ffc46b"):
    rec.light(label, label, (x - .4, y - .4, .8, .8), dim=dim, bright=1, color=color, kind=kind)


# ---- the Inn at the Crossing: taproom west, kitchen north-east, store and stairs south-east ----
wl.hearth(m, 2.75, 6.05, rec=rec, label="Hearth (the inn)", r=.6)
for i in range(7): pr.barrel(m, 2.6 + i * .62, 2.05, 20, holds=("water", "grain")[i % 2], name="Ale cask (the inn)")
note("ale casks", 4.5, 2.05)
m.table(2.4, 2.75, 4.6, .55, things=False); note("the bar", 4.7, 3.0)
for tx, ty in ((4.2, 4.1), (4.0, 6.2), (4.0, 8.2), (8.0, 2.2), (7.2, 4.8), (10.3, 2.2), (2.6, 8.0)):
    m.table(tx, ty, 1.0, .9, things=False); pr.stool(m, tx - .25, ty + .2); pr.stool(m, tx + 1.0, ty + .2); pr.stool(m, tx + .3, ty + .95)
    pr.jug(m, int((tx + .3) * T), int((ty + .35) * T)); pr.cup(m, int((tx + .7) * T), int((ty + .5) * T))
note("tables and stools", 6, 6)
pr.bench(m, 3.6, 9.65, 1.9, .34); note("bench", 4.5, 9.8)
pr.shelf(m, 13.0, 2.0, 1.8, .44, ["plates", "bowl", "jug", "plates"]); note("shelf of plates", 13.9, 2.2)
m.oven(14.6, 1.8, 1.4, 1.2, side="s"); rec.light("Oven (the inn)", "The inn's oven", (14.6, 1.8, 1.4, 1.2), dim=4, bright=1.5); note("oven", 15.3, 2.4)
m.table(14.6, 3.6, 1.8, .9, things=True); note("kitchen table", 15.5, 4.05)
pr.crate(m, 12.5, 2.9, 44, goods="apples", name="Crate (inn kitchen)")
pr.barrel(m, 16.9, 5.7, 21, holds="water", name="Water cask (inn kitchen)"); pr.barrel(m, 17.6, 5.7, 21, holds="grain", name="Flour cask (inn kitchen)")
pr.sack(m, 12.7, 5.6, 20, name="Sack (inn kitchen)")
light(11.86, 6.12, "Candle (the inn)")
d.rectangle([16.6 * T, 6.6 * T, 18.6 * T, 8.4 * T], fill=R["dwood"][1], outline=OUT)        # the stair up to the guest rooms
for k in range(7): d.line([16.6 * T + 4, 6.6 * T + 8 + k * 22, 18.6 * T - 4, 6.6 * T + 8 + k * 22], fill=R["dwood"][3], width=4)
note("stairs up", 17.6, 7.5)
d.rectangle([12.4 * T, 8.6 * T, 14.2 * T, 10.1 * T], fill=(20, 16, 16), outline=OUT)
for k in range(5): d.line([12.4 * T + 4, 8.6 * T + 10 + k * 22, 14.2 * T - 4, 8.6 * T + 10 + k * 22], fill=R["dwood"][2 - min(k, 2) // 2], width=3)
note("steps down to the cellar", 13.3, 9.3)
pr.crate(m, 14.6, 9.4, 44, goods="jars", name="Crate (inn store)"); pr.crate(m, 15.5, 9.4, 44, goods="apples", name="Crate (inn store)")
pr.barrel(m, 18.4, 8.9, 21, holds="water", name="Cask (inn store)")

# ---- the inn stables ----
for k, sx_ in enumerate((2.2, 4.8, 7.5)): tw.horse_stall(m, sx_, 12.3, 2.2, 2.1)
note("horse stalls", 6, 13.4)
pr.hay(m, 3.3, 17.2, 40); note("hay", 3.3, 17.2)
pr.trough(m, 7.6, 17.2, 1.2, .5); note("water trough", 8.2, 17.45)
pr.sack(m, 9.3, 15.0, 20, name="Oats sack (stables)")
for k in range(3): d.line([2.4 * T + k * 30, 16.0 * T, 2.4 * T + k * 30 + 40, 16.2 * T], fill=R["iron"][2], width=2)   # tack hung on pegs
note("harness on pegs", 2.9, 16.1)

# ---- the bakery ----
m.oven(25.1, 2.5, 2.1, 2.1, side="w"); rec.light("Bake oven (bakery)", "The bake oven", (25.1, 2.5, 2.1, 2.1), dim=5, bright=1.5); note("bake oven", 26.15, 3.55)
m.table(21.4, 3.5, 2.2, 1.0, things=False); note("kneading trough", 22.5, 4.0)
for k in range(3): pr.sack(m, 21.0 + k * .5, 2.75, 19, name="Flour sack (bakery)")
pr.barrel(m, 20.95, 4.95, 20, holds="water", name="Water cask (bakery)")
pr.shelf(m, 20.6, 5.6, 2.4, .44, ["loaf", "loaf", "loaf", "loaf", "loaf"]); note("loaves", 21.8, 5.8)
pr.shelf(m, 20.6, 6.6, .44, 2.0, ["loaf", "loaf", "loaf", "loaf"]); pr.shelf(m, 26.8, 6.6, .44, 2.4, ["loaf", "loaf", "loaf", "loaf", "loaf"])
m.table(24.8, 7.0, .9, 1.4, things=False); note("counter", 25.25, 7.7)
for k in range(5): pr.loaf(m, int((24.9 + k * .3) * T), int(8.95 * T), 10, 7)
pr.barrel(m, 21.5, 8.85, 20, holds="grain", name="Flour cask (bakery shop)")

# ---- Richter Graff's house: study, hall, strongroom ----
m.rug(35.0, 2.4, 4.6, 2.4, a="blue", b="gold"); m.table(36.3, 3.1, 2.0, 1.0, things=False)
for k in range(4): d.rectangle([(36.5 + k * .4) * T, 3.3 * T, (36.5 + k * .4) * T + 18, 3.3 * T + 14], fill=R["linen"][4], outline=OUT)
note("writing table with papers", 37.3, 3.6)
pr.stool(m, 37.2, 4.3)
pr.shelf(m, 34.4, 1.7, 3.0, .44, ["linen", "linen", "candle", "linen", "linen"]); note("shelf of ledgers", 35.9, 1.9)
wl.hearth(m, 35.9, 5.05, r=.45, rec=rec, label="Hearth (Graff's study)")
pr.crate(m, 41.6, 1.8, 44, goods="jars", name="Crate (strongroom)"); pr.crate(m, 42.8, 1.8, 44, goods="jars", name="Crate (strongroom)")
pr.chest(m, 43.2, 3.2, 1.0, .6); pr.chest(m, 41.5, 7.9, 1.0, .6); note("strongroom", 42.6, 5.3)
for k in range(5): m.d.rectangle([41.4 * T, (5.4 + k * .6) * T, 41.4 * T + 40, (5.4 + k * .6) * T + 40], outline=R["stone"][1])   # the flags, one of them loose
d.line([43.8 * T, 5.6 * T, 44.3 * T, 5.6 * T], fill=(20, 16, 16), width=2); note("a floor flag sits a little proud", 44.0, 5.6)
d.rectangle([34.9 * T, 6.0 * T, 36.6 * T, 7.6 * T], fill=R["dwood"][1], outline=OUT)
for k in range(6): d.line([34.9 * T + 4, 6.0 * T + 8 + k * 22, 36.6 * T - 4, 6.0 * T + 8 + k * 22], fill=R["dwood"][3], width=4)
note("stairs up", 35.75, 6.8)
m.table(38.3, 6.1, 1.2, .7, things=False); pr.stool(m, 38.6, 6.9)
m.oven(39.4, 6.9, 1.0, 1.0, side="w"); light(39.99, 7.34, "Stove (Graff's hall)", "fire", 5, "#ff9a40"); note("stove", 39.9, 7.4)
for k in range(5): pr.barrel(m, 40.1, 5.9 + k * .62, 20, holds=("water", "grain")[k % 2], name="Cask (Graff's hall)")
pr.shelf(m, 34.4, 8.5, 1.6, .44, ["linen", "linen", "jug"]); light(34.25, 7.28, "Candle (Graff's hall)")

# ---- the chandler's house: one room round its hearth, candles everywhere ----
wl.hearth(m, 56.02, 5.22, rec=rec, label="Hearth (chandler)", r=.6)
pr.bed(m, 57.5, 2.7, 1.4, .95, head="e", cloth="green"); note("bed", 58.2, 3.2)
m.table(52.8, 2.7, 1.8, .7, things=False)
for k in range(5): pr.candle(m, int((53.0 + k * .32) * T), int(3.0 * T), lit=k % 2 == 0)
note("candles drying on the table", 53.7, 3.05)
pr.barrel(m, 55.3, 3.0, 20, holds="water", name="Tallow tub (chandler)"); pr.barrel(m, 56.0, 3.0, 20, holds="grain", name="Wax cask (chandler)")
pr.bench(m, 56.6, 7.25, 1.6, .34); pr.stool(m, 55.0, 6.0); pr.stool(m, 57.1, 6.0)
pr.shelf(m, 53.6, 7.4, 1.8, .44, ["candle", "candle", "candle", "candle", "candle"]); note("candles for sale", 54.5, 7.6)
for k in range(4): d.line([59.2 * T, (3.6 + k * .5) * T, 59.4 * T, (3.6 + k * .5) * T + 30], fill=R["linen"][4], width=3)   # wicks hung to dry
note("wicks hung to dry", 59.3, 4.4)

# ---- Master Voss, apothecary ----
tw.jars(m, 51.2, 11.8, 9); tw.jars(m, 56.2, 11.8, 4); note("jars on shelves", 52.8, 11.8)
m.table(51.6, 12.6, 2.6, .7, things=False); note("counter", 52.9, 12.95)
d.ellipse([52.0 * T - 10, 12.9 * T - 10, 52.0 * T + 10, 12.9 * T + 10], fill=R["stone"][3], outline=OUT); d.line([52.0 * T, 12.9 * T, 52.0 * T + 14, 12.9 * T - 10], fill=R["wood"][3], width=3)
note("mortar and pestle", 52.0, 12.9)
pr.herbs(m, 51.0, 16.0, 54.6); note("herbs drying", 52.8, 16.1)
tw.jars(m, 50.75, 17.0, 6, "y"); tw.jars(m, 53.9, 18.85, 4); tw.jars(m, 55.25, 14.6, 4, "y")
light(50.58, 16.77, "Candle (Voss's shop)"); light(59.83, 12.78, "Candle (Voss's back room)")
d.rectangle([58.2 * T, 11.9 * T, 59.6 * T, 13.4 * T], fill=(20, 16, 16), outline=OUT)
d.rectangle([58.2 * T, 11.9 * T, 59.6 * T, 12.3 * T], fill=R["dwood"][2], outline=OUT); d.ellipse([58.85 * T - 5, 12.05 * T - 5, 58.85 * T + 5, 12.05 * T + 5], fill=R["iron"][3])
for k in range(4): d.line([58.3 * T, 12.5 * T + k * 18, 59.5 * T, 12.5 * T + k * 18], fill=R["dwood"][1], width=3)
note("trapdoor and stair down", 58.9, 12.65)
pr.chest(m, 56.2, 14.7, .9, .6)
pr.bed(m, 57.3, 17.1, .95, 1.9, head="s", cloth="blue"); note("bed", 57.8, 18.0)
pr.stool(m, 58.9, 16.4); pr.bucket(m, int(59.4 * T), int(18.7 * T))

# ---- the barber-surgeon ----
m.table(53.2, 28.5, 2.0, .9, things=False); note("operating table", 54.2, 28.95)
pr.bed(m, 54.3, 26.9, 1.8, .9, head="e", cloth="linen"); note("cot", 55.2, 27.35)
tw.jars(m, 51.45, 27.9, 6, "y"); note("jars of salves", 51.45, 28.9)
d.ellipse([51.6 * T - 16, 31.2 * T - 16, 51.6 * T + 16, 31.2 * T + 16], fill=R["iron"][1], outline=OUT); m.fire(int(51.6 * T), int(31.2 * T), 10, 9)
light(51.6, 31.2, "Brazier (barber-surgeon)", "fire", 3, "#ff9a40"); note("brazier for the irons", 51.6, 31.2)
pr.bucket(m, int(52.6 * T), int(31.6 * T)); pr.barrel(m, 55.6, 31.6, 20, holds="water", name="Water cask (surgeon)")
d.ellipse([53.6 * T - 10, 31.0 * T - 10, 53.6 * T + 10, 31.0 * T + 10], fill=R["clay"][2], outline=OUT); note("bleeding bowl", 53.6, 31.0)
pr.bed(m, 57.0, 28.4, 1.8, .9, head="e", cloth="red"); note("bed", 57.9, 28.85)
m.table(56.7, 26.0, .8, .8, things=False); pr.stool(m, 57.6, 26.8)
light(58.88, 25.77, "Candle (surgeon's room)")
d.rectangle([57.0 * T, 30.4 * T, 58.6 * T, 31.8 * T], fill=(20, 16, 16), outline=OUT)
for k in range(5): d.line([57.0 * T + 4, 30.4 * T + 10 + k * 22, 58.6 * T - 4, 30.4 * T + 10 + k * 22], fill=R["dwood"][2], width=3)
note("steps down to the cellar", 57.8, 31.1)

# ---- the Lame Ox tavern ----
wl.hearth(m, 3.1, 29.45, rec=rec, label="Hearth (Lame Ox)", r=.6)
for i in range(7): pr.barrel(m, 7.6 + i * .7, 26.75, 20, holds=("water", "grain")[i % 2], name="Ale cask (Lame Ox)")
m.table(7.4, 27.6, 5.0, .55, things=False); note("the bar", 9.9, 27.85); note("ale casks", 9.7, 26.75)
for tx, ty in ((4.2, 27.4), (7.6, 29.0), (9.5, 29.0), (5.6, 30.6), (8.4, 30.6), (11.1, 30.0)):
    m.table(tx, ty, 1.0, .8, things=False); pr.stool(m, tx - .25, ty + .2); pr.stool(m, tx + 1.0, ty + .2); pr.cup(m, int((tx + .4) * T), int((ty + .4) * T))
note("tables and stools", 8, 30)
pr.bench(m, 4.0, 26.6, 2.0, .34)
pr.crate(m, 3.0, 33.2, 44, goods="apples", name="Crate (tavern store)"); pr.crate(m, 6.6, 32.9, 44, goods="jars", name="Crate (tavern store)"); pr.crate(m, 7.0, 33.8, 44, goods="apples", name="Crate (tavern store)")
pr.sack(m, 5.3, 33.6, 20, name="Sack (tavern store)")
for i in range(3): pr.barrel(m, 2.95 + i * .7, 35.4, 20, holds="water", name="Cask (tavern store)")
for i in range(3): pr.barrel(m, 6.0 + i * .7, 35.4, 20, holds="grain", name="Cask (tavern store)")
pr.bed(m, 10.1, 33.6, .95, 1.8, head="s", cloth="green"); note("the keeper's bed", 10.6, 34.5)
pr.chest(m, 12.4, 34.4, .9, .6); pr.barrel(m, 9.5, 33.3, 18, holds="water", name="Cask (keeper's room)")

# ---- the house by the tavern ----
wl.hearth(m, 6.12, 40.23, rec=rec, label="Hearth (the house)", r=.6)
pr.bed(m, 2.7, 37.7, 1.9, .95, head="w", cloth="blue"); note("bed", 3.65, 38.2)
m.table(4.9, 37.75, 1.9, .7, things=True); note("table", 5.85, 38.1)
pr.barrel(m, 7.6, 38.0, 20, holds="water", name="Water cask (the house)"); pr.barrel(m, 8.3, 38.0, 20, holds="grain", name="Meal cask (the house)")
pr.bench(m, 2.7, 39.4, .34, 1.6); pr.stool(m, 5.0, 41.4); pr.stool(m, 7.0, 41.4)
pr.shelf(m, 5.2, 42.5, 1.6, .44, ["plates", "bowl", "jug"]); pr.basket(m, int(9.1 * T), int(42.2 * T), 15, "wool")

# ---- the butcher's shop and its smokehouse ----
m.table(19.6, 37.6, 1.2, 1.2, things=False); note("chopping block", 20.2, 38.2)
pr.axe(m, int(20.2 * T), int(38.2 * T), ang=.7, L=30)
m.table(21.9, 37.3, 1.8, .7, things=False)
for k in range(4): d.ellipse([(22.0 + k * .4) * T, 37.45 * T, (22.0 + k * .4) * T + 20, 37.45 * T + 16], fill=(170, 60, 56), outline=OUT)
note("cuts of meat on the counter", 22.8, 37.65)
tw.hams(m, 18.0, 36.7, 21.0); note("meat hung on hooks", 19.5, 36.9)
pr.bucket(m, int(18.3 * T), int(38.8 * T), water=False); d.ellipse([18.3 * T - 6, 38.8 * T - 6, 18.3 * T + 6, 38.8 * T + 6], fill=(110, 30, 30))
note("bucket of blood", 18.3, 38.8)
pr.crate(m, 18.0, 40.0, 44, goods="apples", name="Crate (butcher)"); pr.crate(m, 18.9, 40.0, 44, goods="jars", name="Crate (butcher)")
pr.sack(m, 20.0, 40.3, 20, name="Salt sack (butcher)")
for i, bx in enumerate((18.7, 19.4, 20.1, 23.4, 24.1)): pr.barrel(m, bx, 42.3, 20, holds=("water", "grain")[i % 2], name="Salting cask (butcher)")
light(22.7, 36.58, "Candle (butcher)")
tw.hams(m, 26.8, 38.0, 29.0); tw.hams(m, 26.8, 39.2, 29.0); tw.hams(m, 26.8, 40.4, 29.0); note("hams in the smoke", 27.9, 39.2)
wl.hearth(m, 27.88, 41.95, rec=rec, label="Smoking fire", r=.5)
light(27.77, 36.77, "Candle (smokehouse)")

# ---- the general store ----
tw.jars(m, 35.5, 36.7, 4); pr.shelf(m, 35.3, 37.4, .44, 3.2, ["jug", "pot", "bowl", "jug", "pot", "bowl"]); note("shelves of pots", 35.5, 39)
m.table(36.8, 37.2, .6, 3.0, things=False); note("counter", 37.1, 38.7)
for i in range(2): pr.barrel(m, 38.9 + i * .7, 36.75, 20, holds=("water", "grain")[i], name="Cask (general store)")
pr.barrel(m, 40.2, 37.3, 20, holds="grain", name="Cask (general store)"); pr.barrel(m, 40.2, 38.0, 20, holds="water", name="Cask (general store)")
for x, y in ((42.2, 36.6), (43.3, 36.6), (43.6, 38.2), (41.8, 39.6), (43.4, 39.6), (42.4, 42.0), (43.4, 42.0)):
    pr.crate(m, x, y, 44, goods=("apples", "jars")[int(x * 10) % 2], name="Crate (general store)")
tw.jars(m, 38.0, 42.4, 5); pr.sack(m, 37.0, 41.8, 20, name="Sack (general store)"); pr.sack(m, 40.6, 41.6, 20, name="Sack (general store)")
pr.basket(m, int(39.2 * T), int(40.6 * T), 15, "apples")

# ---- the hatter and glover ----
tw.hats(m, 49.8, 36.0, 4); note("hats on a shelf", 50.2, 36.0)
pr.barrel(m, 51.5, 37.0, 20, holds="water", name="Dye tub (hatter)"); pr.barrel(m, 51.5, 37.7, 20, holds="grain", name="Felt cask (hatter)")
m.table(48.4, 38.6, 2.8, .6, things=False); tw.hats(m, 48.7, 38.9, 3); note("work table with hats", 49.8, 38.9)
for k in range(5): d.polygon([((48.5 + k * .5) * T, 40.75 * T), ((48.5 + k * .5) * T + 20, 40.75 * T), ((48.5 + k * .5) * T + 22, 40.75 * T + 22), ((48.5 + k * .5) * T - 2, 40.75 * T + 22)], fill=R[("red", "dwood", "gold", "blue", "dwood")[k]][2], outline=OUT)
note("gloves laid out", 49.6, 40.9)
pr.shelf(m, 47.3, 36.8, .44, 1.2, ["linen", "linen"]); pr.shelf(m, 52.2, 39.5, .44, 1.4, ["linen", "linen", "linen"])
light(53.25, 38.5, "Lamp (hatter)", "candle", 3, "#ffb060")

# ---- the square: the market cross, the well, the stalls, lanterns, the pen, carts and crates ----
tw.market_cross(m, 30.9, 21.3, 33.1, 23.5); note("market cross", 32, 22.4)
pr.well(m, 24.6, 16.2); note("well", 24.6, 16.2)
for x, y, c, g in ((18.4, 12.5, "red", "loaf"), (22.2, 12.3, "blue", "cloth"), (36.0, 12.2, "green", "apples"), (39.6, 12.0, "red", "pots"),
                   (43.0, 12.0, "green", "fish"), (17.6, 24.6, "gold", "cloth"), (43.2, 23.7, "blue", "apples"), (18.2, 30.0, "red", "pots"),
                   (21.8, 30.1, "blue", "loaf"), (36.4, 30.3, "red", "apples")):
    tw.stall(m, x, y, 2.7, 1.2, c, g, rec=rec, label="Market stall")
for x, y in ((28.0, 10.6), (48.6, 18.6), (48.8, 25.2)): tw.lantern_post(m, x, y, rec=rec, label=f"Lantern post ({x:.0f}, {y:.0f})")
for _ in range(16):
    x, y = rng.uniform(42.7, 45.9), rng.uniform(16.5, 19.1); d.line([x * T, y * T, x * T + rng.uniform(-8, 8), y * T + rng.uniform(-4, 4)], fill=R["straw"][3])
pr.trough(m, 42.8, 16.6, 1.2, .45)
wl.ladder(m, 38.6, 20.0, 40.4, 20.9, 40); note("handcart", 39.5, 20.5)                 # a handcart with its shafts, sacks on it
pr.sack(m, 39.3, 20.3, 18, name="Sack on the handcart"); pr.sack(m, 39.8, 20.6, 18, name="Sack on the handcart")
for x, y in ((29.6, 12.7), (27.2, 25.9), (26.3, 26.4), (17.3, 29.3), (41.0, 29.0), (41.7, 29.6), (29.8, 28.0), (37.0, 26.4)):
    pr.crate(m, x, y, 44, goods=("apples", "jars")[int(y) % 2], name="Crate in the square")
for x, y in ((26.4, 17.6), (34.9, 25.8), (46.4, 13.2), (19.8, 23.8), (44.7, 14.0)): pr.barrel(m, x, y, 21, holds="water", name="Cask in the square")
m.tree(16.5 * T, 33.3 * T, int(1.4 * T)); m.tree(46.6 * T, 31.1 * T, int(1.9 * T)); m.tree(47.3 * T, 3.8 * T, int(1.0 * T)); m.tree(61.3 * T, 4.4 * T, int(1.7 * T))
note("tree", 16.5, 33.3); note("tree", 46.6, 31.1)
X0_, Y0_, X1_, Y1_ = int(60.6 * T), int(6.6 * T), int(63.4 * T), int(8.8 * T)                 # the woodshed: no inside to show, its own roof
img = RF.draw((60.6, 6.6, 2.8, 2.2), "shingle", seed=3); m.img.paste(img.convert("RGB"), (X0_, Y0_)); note("woodshed", 62, 7.7)
pr.logpile(m, 60.7, 8.95, 2.6, .5)

for _ in range(40):                                                                    # straw and muck trodden into the square, a puddle or two
    x, y = rng.uniform(14, 50), rng.uniform(11.5, 34)
    if any(inside(x, y, r, .6) for r, _, _ in BLD.values()): continue
    if rng.random() < .15:
        rx, ry = rng.uniform(20, 46), rng.uniform(12, 26); d.ellipse([x * T - rx, y * T - ry, x * T + rx, y * T + ry], fill=R["water"][1]); d.line([x * T - rx * .4, y * T - ry * .3, x * T, y * T - ry * .3], fill=R["water"][3])
    else:
        for k in range(8): d.line([x * T + rng.uniform(-20, 20), y * T + rng.uniform(-12, 12), x * T + rng.uniform(-20, 20), y * T + rng.uniform(-12, 12)], fill=R["straw"][int(rng.integers(1, 4))])
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.5); m.glow(hx, hy, 60, power=.45)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "lt-market")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, {len(side.get('roofs', []))} roofs, in {os.path.normpath(out)}")
