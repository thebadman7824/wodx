"""Rothenstein valley: Lower Town, Craftsmen's Lane (66 x 40 squares), redrawn in WoDX's own pixel art on the old
map's layout (the Whole World desk, r1 to r3). The cobbled lane runs east from the Market Square to a plank bridge
over the town ditch and on to the East Road and the Ashfield. North of it stand the stables, the smithy, the Weiss
cooperage, the Weavers' Hall and the Shuttered House; south of it the Dyers' Workshop and its yard of vats, the
Brewhouse and three cottages with their gardens.

    python3 tools/pixelmap/maps/lt_crafts.py OUTDIR

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
import dress as dr
import buildings as B
from scene import Recorder

W, H = 66, 40
rec = Recorder("Lower Town, Craftsmen's Lane", (W, H), seed=1270, place="town")
m = rec.m; note = rec.note; d = m.d; rng = m.rng

# ---- the old scene's lines (squares) ----
WALLS = [(2.0, 2.2, 14.6, 2.2), (2.0, 28.6, 2.0, 30.2), (5.85, 33.4, 12.6, 33.4), (24.2, 33.6, 27.55, 33.6), (43.4, 28.3, 43.4, 31.0), (54.7, 26.0, 57.0, 26.0),
         (31.6, 31.7, 31.6, 33.6), (12.6, 28.6, 12.6, 30.2), (43.4, 24.8, 43.4, 27.5), (42.6, 12.84, 42.6, 15.6), (12.6, 31.0, 12.6, 33.4), (17.4, 12.55, 17.4, 15.6),
         (45.0, 10.0, 47.7, 10.0), (33.06, 15.6, 35.2, 15.6), (42.6, 3.0, 42.6, 5.76), (2.0, 33.4, 5.05, 33.4), (2.0, 12.9, 2.0, 16.2), (48.7, 15.4, 56.4, 15.4),
         (44.2, 24.8, 44.2, 27.6), (27.4, 8.85, 27.4, 11.75), (51.4, 13.1, 51.4, 15.4), (17.4, 5.0, 20.3, 5.0), (29.4, 3.0, 29.4, 5.76), (2.0, 31.0, 2.0, 33.4),
         (2.0, 25.4, 2.0, 27.8), (40.9, 31.0, 43.4, 31.0), (14.6, 6.1, 14.6, 8.2), (51.4, 31.0, 53.8, 31.0), (31.6, 24.6, 31.6, 26.3), (37.6, 24.8, 39.67, 24.8),
         (23.3, 15.6, 27.4, 15.6), (34.6, 3.0, 34.6, 8.6), (2.0, 9.0, 2.0, 12.3), (6.6, 9.0, 10.6, 9.0), (2.0, 9.0, 6.0, 9.0), (47.4, 31.0, 50.0, 31.0),
         (51.4, 7.5, 51.4, 12.1), (31.6, 27.3, 31.6, 30.7), (53.05, 4.0, 56.4, 4.0), (45.0, 12.05, 45.0, 15.4), (44.2, 31.0, 46.8, 31.0), (36.4, 3.0, 42.6, 3.0),
         (2.0, 2.2, 2.0, 8.2), (45.0, 15.4, 47.7, 15.4), (29.4, 12.84, 29.4, 15.6), (50.0, 28.2, 50.0, 31.0), (45.0, 7.95, 45.0, 11.45), (9.0, 25.4, 9.0, 26.9),
         (31.6, 29.0, 35.6, 29.0), (51.4, 26.0, 51.4, 28.1), (23.4, 5.0, 23.4, 9.6), (44.2, 24.8, 47.67, 24.8), (48.95, 4.0, 52.45, 4.0), (45.0, 4.0, 45.0, 7.35),
         (2.0, 25.4, 5.3, 25.4), (44.2, 28.2, 44.2, 31.0), (9.0, 29.4, 12.6, 29.4), (25.9, 9.6, 27.4, 9.6), (38.6, 3.0, 38.6, 8.6), (40.67, 24.8, 43.4, 24.8),
         (50.0, 24.8, 50.0, 27.6), (51.4, 28.9, 51.4, 31.0), (17.4, 15.6, 21.5, 15.6), (29.4, 8.6, 31.5, 8.6), (48.7, 10.0, 56.4, 10.0), (9.0, 31.9, 9.0, 33.4),
         (57.0, 26.0, 57.0, 28.1), (36.8, 15.6, 38.94, 15.6), (9.0, 27.9, 9.0, 30.9), (27.4, 12.55, 27.4, 15.6), (32.5, 8.6, 36.1, 8.6), (24.2, 29.4, 24.2, 33.6),
         (17.4, 5.0, 17.4, 8.05), (39.74, 15.6, 42.6, 15.6), (14.6, 2.2, 14.6, 4.3), (37.6, 24.8, 37.6, 27.5), (28.15, 33.6, 35.6, 33.6), (41.1, 8.6, 42.6, 8.6),
         (28.6, 24.6, 35.6, 24.6), (48.67, 24.8, 50.0, 24.8), (27.4, 5.0, 27.4, 8.05), (17.4, 8.85, 17.4, 11.75), (29.4, 6.56, 29.4, 12.04), (37.6, 31.0, 40.1, 31.0),
         (35.6, 24.6, 35.6, 33.6), (56.4, 4.0, 56.4, 7.35), (21.1, 5.0, 27.4, 5.0), (54.6, 31.0, 57.0, 31.0), (33.06, 3.0, 35.6, 3.0), (7.9, 16.2, 10.6, 16.2),
         (29.4, 3.0, 32.26, 3.0), (51.4, 26.0, 53.7, 26.0), (20.5, 9.6, 24.9, 9.6), (29.4, 15.6, 32.26, 15.6), (24.2, 24.6, 24.2, 28.8), (37.6, 28.3, 37.6, 31.0),
         (6.7, 25.4, 12.6, 25.4), (56.4, 7.95, 56.4, 15.4), (45.0, 4.0, 48.35, 4.0), (24.2, 24.6, 27.0, 24.6), (10.6, 12.9, 10.6, 16.2), (2.0, 16.2, 4.7, 16.2),
         (12.6, 25.4, 12.6, 27.8), (37.1, 8.6, 40.1, 8.6), (57.0, 28.9, 57.0, 31.0), (10.6, 9.0, 10.6, 12.3), (17.4, 9.6, 19.5, 9.6), (2.0, 8.2, 14.6, 8.2),
         (51.4, 4.0, 51.4, 6.5), (42.6, 6.56, 42.6, 12.04)]
DOORS = [(9.0, 26.9, 9.0, 27.9), (40.1, 8.6, 41.1, 8.6), (51.4, 6.5, 51.4, 7.5), (21.5, 15.6, 23.3, 15.6), (39.67, 24.8, 40.67, 24.8), (5.3, 25.4, 6.7, 25.4),
         (31.6, 30.7, 31.6, 31.7), (24.9, 9.6, 25.9, 9.6), (47.7, 15.4, 48.7, 15.4), (36.1, 8.6, 37.1, 8.6), (47.7, 10.0, 48.7, 10.0), (53.7, 26.0, 54.7, 26.0),
         (31.5, 8.6, 32.5, 8.6), (47.67, 24.8, 48.67, 24.8), (31.6, 26.3, 31.6, 27.3), (19.5, 9.6, 20.5, 9.6), (9.0, 30.9, 9.0, 31.9), (35.2, 15.6, 36.8, 15.6),
         (27.0, 24.6, 28.6, 24.6), (51.4, 12.1, 51.4, 13.1)]
WINDOWS = [(24.2, 28.8, 24.2, 29.4), (57.0, 28.1, 57.0, 28.9), (56.4, 7.35, 56.4, 7.95), (53.8, 31.0, 54.6, 31.0), (52.45, 4.0, 53.05, 4.0), (44.2, 27.6, 44.2, 28.2),
           (38.94, 15.6, 39.74, 15.6), (45.0, 7.35, 45.0, 7.95), (42.6, 5.76, 42.6, 6.56), (2.0, 30.2, 2.0, 31.0), (17.4, 11.75, 17.4, 12.55), (2.0, 27.8, 2.0, 28.6),
           (45.0, 11.45, 45.0, 12.05), (37.6, 27.5, 37.6, 28.3), (12.6, 30.2, 12.6, 31.0), (32.26, 15.6, 33.06, 15.6), (10.6, 12.3, 10.6, 12.9), (48.35, 4.0, 48.95, 4.0),
           (46.8, 31.0, 47.4, 31.0), (32.26, 3.0, 33.06, 3.0), (2.0, 12.3, 2.0, 12.9), (20.3, 5.0, 21.1, 5.0), (40.1, 31.0, 40.9, 31.0), (43.4, 27.5, 43.4, 28.3),
           (17.4, 8.05, 17.4, 8.85), (51.4, 28.1, 51.4, 28.9), (29.4, 12.04, 29.4, 12.84), (50.0, 27.6, 50.0, 28.2), (5.05, 33.4, 5.85, 33.4), (27.4, 11.75, 27.4, 12.55),
           (6.0, 9.0, 6.6, 9.0), (27.4, 8.05, 27.4, 8.85), (27.55, 33.6, 28.15, 33.6), (42.6, 12.04, 42.6, 12.84), (35.6, 3.0, 36.4, 3.0), (29.4, 5.76, 29.4, 6.56),
           (12.6, 27.8, 12.6, 28.6)]
FENCES = [(59.0, 0.0, 59.0, 18.0), (59.0, 22.0, 59.0, 40.0), (21.6, 34.6, 21.6, 23.0), (13.0, 34.6, 21.6, 34.6)]
# name: (x, y, w, h), wall kind, floors [(x, y, w, h, kind)]
BLD = {"The Stables": ((2, 2.2, 12.6, 6.0), "wood", [(2, 2.2, 12.6, 6.0, "earth")]),
       "The Smithy": ((2, 9, 8.6, 7.2), "stone", [(2, 9, 8.6, 7.2, "earth")]),
       "The Weiss Cooperage": ((17.4, 5, 10, 10.6), "wood", [(17.4, 5, 10, 4.6, "planks"), (17.4, 9.6, 10, 6.0, "earth")]),
       "The Weavers' Hall": ((29.4, 3, 13.2, 12.6), "wood", [(29.4, 3, 13.2, 12.6, "planks")]),
       "The Shuttered House": ((45, 4, 11.4, 11.4), "stone", [(45, 4, 11.4, 11.4, "flags")]),
       "The Dyers' Workshop": ((2, 25.4, 10.6, 8), "wood", [(2, 25.4, 7, 8, "earth"), (9, 25.4, 3.6, 8, "planks")]),
       "The Brewhouse": ((24.2, 24.6, 11.4, 9), "stone", [(24.2, 24.6, 11.4, 9, "flags")]),
       "Cottage (west)": ((37.6, 24.8, 5.8, 6.2), "wood", [(37.6, 24.8, 5.8, 6.2, "earth")]),
       "Cottage (middle)": ((44.2, 24.8, 5.8, 6.2), "stone", [(44.2, 24.8, 5.8, 6.2, "earth")]),
       "Cottage (east)": ((51.4, 26, 5.6, 5), "wood", [(51.4, 26, 5.6, 5, "earth")])}
ROOFS = [("The Smithy", (6.3125, 12.6, 9.8125, 8.4125), "slate", None), ("The Stables", (8.3, 5.2125, 13.675, 7.0625), "thatch", None),
         ("The Weiss Cooperage", (22.4, 10.3, 11.0625, 11.65), "shingle", (20.4, 5.6)), ("The Weavers' Hall", (36.0, 9.3, 14.2625, 13.65), "shingle", (31.6, 3.6)),
         ("The Shuttered House", (50.7, 9.7, 12.6, 12.6), "slate", (48.2, 4.5)), ("The Dyers' Workshop", (7.3, 29.4, 11.675, 9.0625), "shingle", None),
         ("The Brewhouse", (29.9, 29.1, 12.6125, 10.2), "slate", (24.9, 29.2)), ("Cottage (west)", (40.5, 27.9, 6.85, 7.25), "thatch", (40.5, 27.9)),
         ("Cottage (middle)", (47.1, 27.9, 7.0, 7.4), "thatch", (47.1, 27.9)), ("Cottage (east)", (54.2, 28.5, 6.65, 6.0625), "thatch", (54.2, 28.5))]


def inside(px_, py_, r, e=.15):
    x, y, w, h = r; return x - e <= px_ <= x + w + e and y - e <= py_ <= y + h + e


def owner(c):
    mx, my = (c[0] + c[2]) / 2, (c[1] + c[3]) / 2
    for name, (r, kind, fl) in BLD.items():
        if inside(mx, my, r): return name, r, kind
    return None, None, "wood"


# ---- the ground: grass, the town ditch down the east side, the cobbled lane ----
land.ground(m, brooks=[[(60.6, -1), (60.5, 10), (60.7, 20), (60.5, 30), (60.6, 41)]], wide=108, floor="grass")
yy, xx = np.mgrid[0:m.H, 0:m.W]; sx, sy = xx / T, yy / T
edge = (m.noise(m.H, m.W, 40) - .5) * .7
lane = (sy > 17.4 + edge) & (sy < 22.4 + edge) & (sx < 59.2)
tw.cobbles(m, lane); note("Craftsmen's Lane, cobbled", 30, 20)
yard = (sx > 13.0) & (sx < 21.6) & (sy > 23.0) & (sy < 34.6)
a = m.dirt(m.H, m.W); m.put(a, 0, 0, mask=yard)                                          # the dye yard, trodden earth stained by spills
for _ in range(30):
    x, y = rng.uniform(13.4, 21.2), rng.uniform(23.4, 30.6); c = R[("blue", "red", "gold", "green")[int(rng.integers(0, 4))]][1]
    d.ellipse([x * T - 14, y * T - 8, x * T + 14, y * T + 8], fill=c)
land.bridge(m, 58.6, 18.0, 62.4, 22.0); note("plank bridge over the town ditch", 60.5, 20.0); note("the town ditch", 60.6, 30)

# ---- floors, walls, doors, windows, fences ----
for name, (r, kind, fl) in BLD.items():
    for x, y, w, h, k in fl: B._floor(m, x, y, w, h, k)
dr.snap(m)
for c in WALLS:
    _, r, kind = owner(c); rec.wall(*c, th=26, kind=kind)
for c in DOORS:
    name, r, _ = owner(c); ctr = (r[0] + r[2] / 2, r[1] + r[3] / 2)
    outside = any(abs(v - e) < .05 for v in (c[0], c[2]) for e in (r[0], r[0] + r[2])) and c[0] == c[2] or any(abs(v - e) < .05 for v in (c[1], c[3]) for e in (r[1], r[1] + r[3])) and c[1] == c[3]
    pr.door(m, *c, 26, centre=ctr, swing=-1, hinge="a", exterior=outside, name=f"Door ({name})")
for c in WINDOWS:
    name, r, _ = owner(c); pr.window(m, *c, th=26, centre=(r[0] + r[2] / 2, r[1] + r[3] / 2), glass=False, name=f"Window ({name})")
for c in FENCES: tw.hurdles(m, *c)
note("hurdle fence along the ditch", 59.0, 10); note("dye yard fence", 17.3, 34.6)
for name, (r, kind, fl) in BLD.items():
    for px_, py_ in ((r[0], r[1]), (r[0] + r[2], r[1]), (r[0], r[1] + r[3]), (r[0] + r[2], r[1] + r[3])): m.post(px_, py_, 30, "stone" if kind == "stone" else "dwood")
    rec.region(name, name, r, "home" if name.startswith("Cottage") or name == "The Shuttered House" else "shop")
for name, (cx, cy, w, h), kind, smoke in ROOFS:
    rec.roof(f"roof-{name}", f"Roof ({name})", (cx - w / 2, cy - h / 2, w, h), kind, smoke=smoke)


def light(x, y, label, kind="candle", dim=3, color="#ffc46b"):
    rec.light(label, label, (x - .4, y - .4, .8, .8), dim=dim, bright=1, color=color, kind=kind)


# ---- the stables: six stalls along the back, open to the yard ----
for k in range(6): tw.horse_stall(m, 2.15 + k * 1.95, 2.3, 1.8, 2.4)
note("horse stalls", 8, 3.4)
pr.hay(m, 7.0, 7.3, 40); note("hay", 7.0, 7.3)
pr.trough(m, 2.4, 7.3, 1.4, .5); note("water trough", 3.1, 7.55)
wl.ladder(m, 11.6, 7.6, 13.6, 7.6, 30); note("saddle rack", 12.6, 7.6)
pr.sack(m, 10.0, 7.5, 20, name="Oats sack (stables)")
m.tree(14.4 * T, 2.6 * T, int(1.1 * T)); note("tree", 14.4, 2.6)

# ---- the smithy ----
tw.forge(m, 5.5, 9.3, 1.6, 1.2, rec=rec, label="Forge")
pr.trough(m, 2.6, 9.4, 1.3, .45); note("quench trough", 3.25, 9.6)
pr.barrel(m, 7.7, 9.7, 20, holds="water", name="Water cask (smithy)"); pr.barrel(m, 8.4, 9.7, 20, holds="grain", name="Charcoal cask (smithy)")
tw.anvil(m, 6.3, 11.9, rec=rec)
m.table(2.4, 15.2, 1.4, .7, things=False); note("workbench", 3.1, 15.5)
for k in range(5): d.line([(2.6 + k * .25) * T, 15.35 * T, (2.6 + k * .25) * T + 6, 15.75 * T], fill=R["iron"][2], width=3)
wl.ladder(m, 6.6, 15.75, 8.6, 15.75, 30); note("rack of bar iron", 7.6, 15.75)
for k in range(4): d.line([6.8 * T + k * 40, 15.6 * T, 6.8 * T + k * 40 + 30, 15.9 * T], fill=R["iron"][1], width=4)
pr.barrel(m, 9.9, 15.6, 18, holds="water", name="Cask (smithy)"); pr.bucket(m, int(2.6 * T), int(13.6 * T))
tw.horseshoes(m, 10.2, 10.4, 5)
note("horseshoes on pegs", 9.8, 11.4)
pr.trough(m, 11.3, 9.6, 1.9, .5); note("water trough", 12.25, 9.85)
tw.handcart(m, 13.2, 12.6, along="y", load="hay", rec=rec)

# ---- the Weiss cooperage: hall and loft north, workshop south ----
wl.hearth(m, 20.4, 5.6, rec=rec, label="Hearth (cooperage hall)", r=.5)
m.table(19.3, 6.4, 2.6, .9, things=True); pr.bench(m, 19.4, 6.05, 2.4, .3); pr.bench(m, 19.4, 7.35, 2.4, .3); note("table", 20.6, 6.85)
pr.barrel(m, 17.9, 5.5, 20, holds="water", name="Water cask (cooperage)"); pr.barrel(m, 22.9, 6.0, 20, holds="grain", name="Meal cask (cooperage)")
tw.hoops(m, 20.7, 9.2, 5); note("barrel hoops", 21.1, 9.2)
pr.chest(m, 22.2, 5.4, .9, .55); pr.stool(m, 22.8, 7.6)
pr.bed(m, 23.7, 5.3, .95, 1.8, head="n", cloth="linen"); note("bed", 24.2, 6.2)
pr.hay(m, 26.1, 7.6, 30); note("straw bed in the loft store", 26.1, 7.6)
pr.crate(m, 26.2, 5.6, 44, goods="jars", name="Crate (cooperage store)"); pr.crate(m, 24.4, 8.5, 44, goods="apples", name="Crate (cooperage store)")
wl.ladder(m, 26.6, 8.2, 26.6, 9.4, 26); note("ladder to the loft", 26.6, 8.8)
tw.staves(m, 21.4, 9.8, 1.8, .5, rec=rec)
wl.hearth(m, 22.4, 12.4, rec=rec, label="Cresset fire for bending staves (cooperage)", r=.5)
m.table(17.8, 11.4, .7, 2.4, things=False); note("shaving horse and bench", 18.15, 12.6)
for x, y in ((19.2, 10.3), (24.0, 10.6), (19.9, 13.2), (21.1, 14.3), (23.0, 14.6), (26.2, 10.4), (26.3, 12.8)):
    pr.barrel(m, x, y, 22, holds=("water", "grain")[int(x) % 2], name="Cask (cooperage)")
for x in (24.6, 25.3, 26.0): pr.barrel(m, x, 15.0, 22, holds="water", name="New cask (cooperage)")
note("new casks", 25.3, 15.0); tw.hoops(m, 24.0, 12.0, 3)
pr.axe(m, int(25.0 * T), int(13.4 * T), ang=.4, L=30); note("adze and drawknife", 25.0, 13.4)

# ---- the Weavers' Hall: kitchen and two rooms north, the loom hall south ----
wl.hearth(m, 31.6, 3.6, rec=rec, label="Hearth (weavers' kitchen)", r=.55)
m.table(30.9, 4.5, 1.4, .8, things=True); note("table", 31.6, 4.9)
for k, y in enumerate((5.2, 5.8)): pr.barrel(m, 33.8, y, 20, holds=("water", "grain")[k], name="Cask (weavers' kitchen)")
pr.shelf(m, 29.6, 3.3, .44, 2.0, ["plates", "bowl", "jug", "bowl"]); note("shelf of crockery", 29.8, 4.3)
pr.basket(m, int(33.2 * T), int(7.6 * T), 15, "wool"); pr.basket(m, int(33.7 * T), int(7.3 * T), 15, "wool"); note("baskets of wool", 33.4, 7.5)
pr.bed(m, 36.2, 3.3, .95, 1.8, head="n", cloth="red"); note("Lenka's bed", 36.7, 4.2)
pr.chest(m, 35.0, 7.6, .9, .55); pr.stool(m, 37.3, 5.8)
pr.bed(m, 40.1, 3.3, .95, 1.8, head="n", cloth="green"); note("Hynek's bed", 40.6, 4.2)
pr.chest(m, 41.4, 7.6, .9, .55); pr.stool(m, 40.2, 6.0); pr.distaff(m, int(39.2 * T), int(4.0 * T))
for x, y, c in ((33.2, 9.0, "blue"), (37.6, 9.0, "red"), (32.3, 13.6, "gold"), (40.4, 13.6, "green")):
    tw.loom(m, x, y, 1.9, 1.3, c, rec=rec)
note("a half-finished red robe on the loom", 38.55, 9.6)
pr.shelf(m, 29.6, 10.8, .44, 2.8, ["linen", "linen", "linen", "linen", "linen", "linen"]); note("bolts of cloth", 29.8, 12.2)
for k, c in enumerate(("blue", "red", "gold", "green", "linen", "blue")): d.rectangle([29.75 * T, (10.9 + k * .45) * T, 30.2 * T, (10.9 + k * .45) * T + 30], fill=R[c][3], outline=OUT)
pr.distaff(m, int(36.5 * T), int(12.2 * T))
m.table(30.4, 14.6, 1.2, .6, things=False); pr.basket(m, int(41.6 * T), int(10.2 * T), 15, "wool"); pr.basket(m, int(41.8 * T), int(11.9 * T), 15, "wool")
light(30.0, 6.2, "Candle (weavers' kitchen)"); light(41.9, 13.0, "Candle (loom hall)")

# ---- the Shuttered House: hall and Tomas's room north, kitchen and the shuttered room south ----
wl.hearth(m, 48.2, 4.5, rec=rec, label="Hearth (Shuttered House hall)", r=.5)
m.table(46.6, 5.6, 3.6, .9, things=True); pr.bench(m, 46.7, 5.2, 3.4, .3); pr.bench(m, 46.7, 6.6, 3.4, .3); note("long table", 48.4, 6.05)
pr.barrel(m, 45.6, 5.3, 20, holds="water", name="Cask (Shuttered House)"); pr.chest(m, 49.6, 4.25, .9, .55)
pr.shelf(m, 45.2, 9.2, 1.8, .44, ["jug", "jug", "bowl", "jug"])
pr.bed(m, 54.4, 6.4, 1.8, .95, head="e", cloth="blue"); note("Tomas's bed", 55.3, 6.9)
pr.chest(m, 54.6, 4.3, .9, .55); pr.stool(m, 53.2, 6.4)
wl.hearth(m, 45.75, 12.4, rec=rec, label="Kitchen hearth (Shuttered House)", r=.5); note("kitchen hearth", 45.75, 12.4)
m.table(47.6, 12.2, 1.4, .8, things=True); note("kitchen table", 48.3, 12.6)
pr.barrel(m, 49.4, 14.8, 20, holds="water", name="Cask (Shuttered House kitchen)"); pr.barrel(m, 50.1, 14.8, 20, holds="grain", name="Cask (Shuttered House kitchen)")
pr.crate(m, 49.8, 10.9, 44, goods="apples", name="Crate (Shuttered House kitchen)"); pr.sack(m, 46.3, 14.6, 20, name="Sack (Shuttered House kitchen)")
m.rug(52.2, 10.8, 2.6, 4.0, a="red", b="gold"); note("rug", 53.5, 12.8)
pr.bed(m, 54.4, 10.6, 1.8, .95, head="e", cloth="blue"); pr.bed(m, 54.4, 14.0, 1.8, .95, head="e", cloth="red"); note("day-rest beds, no window", 55.3, 12.8)
d.rectangle([52.0 * T, 10.2 * T, 52.0 * T + 40, 10.2 * T + 8], fill=R["iron"][1], outline=OUT); note("a bar on the inside of the door", 52.2, 10.2)
light(56.0, 12.4, "Candle (the shuttered room)")

# ---- the Dyers' Workshop: vats round a fire, Jakub's loft and a store east ----
for x, y, c in ((4.8, 27.0, "gold"), (5.8, 29.3, "red"), (5.6, 31.2, "blue"), (7.1, 32.2, "green")): tw.vat(m, x, y, .55, c, rec=rec, label="dye vat")
wl.hearth(m, 6.7, 27.6, rec=rec, label="Fire under the dye kettle", r=.45)
d.ellipse([6.7 * T - 22, 27.6 * T - 22, 6.7 * T + 22, 27.6 * T + 22], outline=R["iron"][1], width=5); note("dye kettle on the fire", 6.7, 27.6)
pr.barrel(m, 2.6, 26.3, 20, holds="water", name="Mordant cask (dyers)"); pr.barrel(m, 2.6, 27.0, 20, holds="grain", name="Madder cask (dyers)")
for k, c in enumerate(("blue", "gold", "red", "green")): d.rectangle([2.4 * T, (28.0 + k * .6) * T, 3.3 * T, (28.0 + k * .6) * T + 12], fill=R[c][3], outline=OUT)
note("dyed hanks on the pegs", 2.85, 29.0)
pr.sack(m, 2.7, 31.3, 20, name="Woad sack (dyers)"); pr.sack(m, 3.2, 31.8, 20, name="Weld sack (dyers)")
pr.bed(m, 10.3, 26.0, 1.8, .95, head="e", cloth="blue"); note("Jakub's bed", 11.2, 26.5)
pr.stool(m, 10.4, 27.9); pr.chest(m, 11.3, 28.3, .9, .55)
pr.bed(m, 10.4, 29.8, 1.8, .95, head="e", cloth="linen"); note("cot", 11.3, 30.3)
pr.crate(m, 11.6, 31.9, 44, goods="jars", name="Crate (dyers' store)"); pr.crate(m, 9.6, 32.6, 44, goods="apples", name="Crate (dyers' store)")
light(9.2, 27.5, "Candle (Jakub's loft)")
for x, y, c in ((14.6, 25.3, "blue"), (17.1, 25.3, "red"), (19.6, 25.3, "gold"), (14.6, 28.6, "green"), (17.1, 28.6, "blue")): tw.vat(m, x, y, .8, c, rec=rec, label="big dye vat in the yard")
for y, cs in ((31.4, ("gold", "blue", "red", "blue", "green", "red")), (32.5, ("red", "gold", "green", "red", "blue", "gold")), (33.6, ("blue", "red", "gold", "blue", "red", "green"))):
    tw.dyeline(m, 13.6, y, 20.9, cs)
note("dyed cloth drying on lines", 17.2, 32.4)

# ---- the Brewhouse ----
tw.vat(m, 29.4, 26.4, .85, "gold", rec=rec, label="mash tun")
tw.vat(m, 27.1, 31.9, .85, (R["dwood"][0], R["dwood"][1], (128, 88, 40), (150, 108, 52), (190, 150, 80)), rec=rec, label="wort cooling tun")
tw.brew_furnace(m, 24.4, 28.4, 1.3, 1.6, rec=rec)
for k in range(4): pr.barrel(m, 24.75, 30.7 + k * .7, 22, holds=("water", "grain")[k % 2], name="Ale cask (brewhouse)")
note("ale casks", 24.75, 31.7)
pr.sack(m, 26.0, 25.4, 20, name="Malt sack (brewhouse)"); pr.sack(m, 26.6, 25.2, 20, name="Malt sack (brewhouse)"); pr.sack(m, 26.3, 25.9, 20, name="Malt sack (brewhouse)")
note("malt sacks", 26.3, 25.5)
pr.bed(m, 33.3, 25.3, 1.8, .95, head="e", cloth="green"); note("bed", 34.2, 25.8)
pr.chest(m, 34.4, 27.6, .9, .55); pr.stool(m, 32.4, 27.0)
for x, y in ((33.0, 31.0), (33.0, 31.7), (34.9, 30.0), (34.9, 30.7), (34.9, 31.4)): pr.barrel(m, x, y, 22, holds="grain", name="Cask (brewhouse store)")
pr.crate(m, 32.6, 29.6, 44, goods="jars", name="Crate (brewhouse store)"); pr.crate(m, 34.6, 32.9, 44, goods="apples", name="Crate (brewhouse store)")
light(32.2, 25.2, "Candle (brewer's room)")

# ---- three cottages round their hearths, gardens behind ----
def cottage(x0, hx, hy, beds, rest):
    wl.hearth(m, hx, hy, rec=rec, label=f"Hearth (cottage at {x0:.0f})", r=.5)
    for bx, by, c in beds: pr.bed(m, bx, by, .95, 1.6, head="s", cloth=c); note("bed", bx + .45, by + .8)
    for f in rest: f()


cottage(37.6, 40.5, 27.9, [(37.9, 28.9, "red")], [lambda: pr.bench(m, 37.9, 25.9, .34, 1.6), lambda: pr.barrel(m, 38.2, 25.3, 20, holds="water", name="Cask (cottage)"),
        lambda: pr.shelf(m, 42.7, 25.5, .44, 1.6, ["plates", "bowl", "jug"]), lambda: pr.stool(m, 39.4, 28.6), lambda: pr.stool(m, 41.5, 28.6),
        lambda: pr.chest(m, 40.0, 30.3, .8, .5), lambda: pr.distaff(m, int(41.6 * T), int(25.6 * T))])
cottage(44.2, 47.1, 27.9, [(44.5, 28.8, "green"), (48.9, 28.8, "green")], [lambda: m.table(44.6, 25.2, 1.8, .7, things=True), lambda: pr.bench(m, 44.5, 25.9, .34, 1.4),
        lambda: pr.shelf(m, 49.4, 25.5, .44, 1.6, ["plates", "bowl", "jug"]), lambda: pr.stool(m, 46.0, 28.6), lambda: pr.stool(m, 48.2, 28.4),
        lambda: pr.chest(m, 46.5, 30.2, .8, .5)])
cottage(51.4, 54.2, 28.5, [(51.8, 29.1, "blue")], [lambda: pr.bench(m, 51.7, 26.9, .34, 1.4), lambda: pr.barrel(m, 54.9, 26.6, 20, holds="water", name="Cask (cottage)"),
        lambda: pr.barrel(m, 55.6, 26.6, 20, holds="grain", name="Cask (cottage)"), lambda: pr.stool(m, 53.2, 29.4), lambda: pr.stool(m, 55.6, 29.0),
        lambda: pr.shelf(m, 55.0, 30.5, 1.6, .44, ["jug", "bowl", "plates"])])
pr.garden(m, 37.8, 31.8, 43.2, 36.4); pr.garden(m, 44.4, 31.8, 49.8, 36.4); pr.garden(m, 51.6, 31.6, 57.2, 36.2)
note("vegetable garden", 40.5, 34.1); note("vegetable garden", 47.1, 34.1); note("vegetable garden", 54.4, 33.9)
m.bush(int(57.6 * T), int(35.0 * T), 50); note("bush", 57.6, 35.0)

# ---- the lane and its edges ----
for x, y in ((11.0, 23.6), (23.4, 18.0), (36.4, 22.4), (52.6, 22.9)): tw.lantern_post(m, x, y, rec=rec, label=f"Lantern post ({x:.0f}, {y:.0f})")
for x, y in ((22.2, 16.2), (26.8, 16.4), (43.6, 16.6), (31.0, 23.3)): pr.barrel(m, x, y, 21, holds="water", name="Cask by the lane")
pr.logpile(m, 43.6, 16.0, 1.8, .5); note("woodpile", 44.5, 16.25)
for x, y, r in ((14.0, 1.4, 1.0), (43.8, 1.2, 1.2), (57.9, 2.4, 1.5), (3.0, 38.4, 1.6), (30.6, 38.8, 1.4), (62.6, 37.0, 1.4), (63.4, 6.0, 1.3)):
    m.tree(x * T, y * T, int(r * T))
for _ in range(30):
    x, y = rng.uniform(1, 58), rng.uniform(17.8, 22.0)
    if rng.random() < .2:
        rx, ry = rng.uniform(20, 46), rng.uniform(12, 26); d.ellipse([x * T - rx, y * T - ry, x * T + rx, y * T + ry], fill=R["water"][1]); d.line([x * T - rx * .4, y * T - ry * .3, x * T, y * T - ry * .3], fill=R["water"][3])
    else:
        for k in range(8): d.line([x * T + rng.uniform(-20, 20), y * T + rng.uniform(-12, 12), x * T + rng.uniform(-20, 20), y * T + rng.uniform(-12, 12)], fill=R["straw"][int(rng.integers(1, 4))])
# ---- dressing: the small things of daily use in every room, the yards and the lane (B5746) ----
KINDS = {"The Stables": ("stable", ()), "The Smithy": ("smith", ()), "The Weiss Cooperage": ("joinery", [(20, 7, "home"), (25.4, 7, "store")]),
         "The Weavers' Hall": ("craft", [(32, 5, "home"), (36.6, 5, "home"), (40.6, 5, "home")]), "The Shuttered House": ("home", [(48, 12.6, "home")]),
         "The Dyers' Workshop": ("dye", [(10.8, 27, "home"), (10.8, 31, "store")]), "The Brewhouse": ("brew", [(33.6, 26.6, "home"), (33.6, 31.3, "store")])}
LINES = WALLS + DOORS + WINDOWS
for name, (r, kind, fl) in BLD.items():
    k, at = KINDS.get(name, ("home", ())); dr.rooms(m, rec, r, LINES, k, at)
dr.dress(m, rec, (0, 17.4, 59, 5.0), "street", n=36)
dr.dress(m, rec, (13.0, 23.0, 8.6, 11.6), "yard", n=10)
for gx in (37.6, 44.2, 51.4): dr.dress(m, rec, (gx - .3, 23.0, 6.6, 1.6), "yard", n=3)
dr.dress(m, rec, (15.0, 1.0, 14.0, 15.0), "yard", n=8); dr.dress(m, rec, (42.8, 1.0, 2.2, 15.0), "yard", n=4)
dr.dress(m, rec, (0, 34.6, 59, 5.4), "wood", n=14); dr.dress(m, rec, (62.0, 0, 4, 40), "wood", n=10)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.5); m.glow(hx, hy, 60, power=.45)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "lt-crafts")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, {len(side.get('roofs', []))} roofs, in {os.path.normpath(out)}")
