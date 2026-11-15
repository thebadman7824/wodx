"""Rothenstein valley: The High Woods (66 x 48 squares), redrawn in WoDX's own pixel art on the old map's layout
(the Whole World desk, r1 to r3). Old beech and fir on the slopes above the valley. Egon the hermit's lodge stands
in a clearing to the north with a warning rope across the path below it; the wolves den under a heap of boulders
to the west; the game-reeve's two-room lodge sits in the south-west; Old Tusk's blackthorn thicket and wallow lie
to the south-east. Paths run out east to the Mountain Trail and south to Dolany and the Old Grove.

    python3 tools/pixelmap/maps/high_woods.py OUTDIR

Walls, doors, windows, lights and exits sit on the old scene's own (the testbed export, 80 px a square), so the
scene's notes, Ways and lights still fit. Daylight colours; Foundry's clock darkens."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T
import props as pr
import land
import wilds as wl
import dress as dr
import buildings as B
from scene import Recorder

W, H = 66, 48
rec = Recorder("The High Woods", (W, H), seed=1241, place="wild")
m = rec.m; note = rec.note
main = [(67, 10.0), (60, 10.6), (55, 13.2), (48, 17.0), (42, 20.6), (37.4, 24.0), (34.6, 27.4), (36.2, 33.0), (40.0, 38.4), (43.6, 43.6), (46.0, 49)]
lodge = [(26.0, 10.8), (28.2, 13.0), (31.6, 15.0), (34.6, 17.6), (36.6, 21.4), (37.4, 24.0)]
west = [(34.6, 27.4), (28.0, 28.6), (22.4, 29.6), (19.6, 32.4), (19.8, 38.4), (20.0, 49)]
reeve = [(19.8, 38.6), (17.4, 39.6), (15.2, 40.2)]
denp = [(22.4, 29.6), (18.6, 25.6), (14.4, 20.0), (11.6, 14.6)]
dt, db = land.ground(m, roads=[(main, 82), (lodge, 54), (west, 66), (reeve, 30), (denp, 34)], floor="forest")
dr.snap(m)

# ---- Egon's lodge, north: one room round an open hearth; a bell by the east window on the warning rope ----
rec.roof("egons-lodge-roof", "Roof (Egon's lodge)", (19.47, 4.08, 9.0625, 7.0625), "shingle", smoke=(24.02, 7.62))
fin = B.hut(rec, 20.0, 4.6, 8.0, 6.0, doors=[("s", 5.5)], windows=[("n", 2.4), ("n", 4.8), ("s", 2.4), ("e", 2.6), ("w", 2.6)], name="Egon's lodge")
pr.bed(m, 20.35, 4.95, .95, 1.4, head="n", cloth="red"); note("bed", 20.8, 5.6)
m.table(23.6, 5.0, 1.8, .9, things=False); pr.bench(m, 23.7, 6.0, 1.6, .34); note("table", 24.5, 5.45)
pr.jug(m, int(24.0 * T), int(5.35 * T)); pr.bowl(m, int(24.9 * T), int(5.4 * T))
pr.barrel(m, 26.55, 5.15, 22, holds="water", name="Water cask (Egon's lodge)"); pr.barrel(m, 27.35, 5.15, 22, holds="grain", name="Meal cask (Egon's lodge)")
wl.hearth(m, 24.02, 7.62, rec=rec, label="Hearth (Egon's lodge)")
pr.stool(m, 22.9, 7.9); pr.stool(m, 25.2, 8.3); note("stools by the fire", 24.0, 8.4)
pr.shelf(m, 20.3, 6.9, .44, 1.6, ["jug", "bowl", "pot"]); note("shelf", 20.5, 7.7)
pr.herbs(m, 21.6, 9.9, 23.8); note("herbs drying", 22.7, 10.0)
wl.pelt(m, 25.7, 6.3, .9, 1.2, "grey"); wl.pelt(m, 21.6, 8.3, .8, 1.1, "brown", "s"); note("wolf pelt on the floor", 26.15, 6.9); note("deer hide on the floor", 22.0, 8.85)
pr.chest(m, 26.8, 9.7, .95, .6)
pr.basket(m, int(27.4 * T), int(8.7 * T), 15, fill="wool"); note("basket", 27.4, 8.7)
fin()
wl.rope(m, 32.4, 15.2, 36.2, 17.4, bell=None); note("rope stretched low across the path", 34.0, 16.3)
wl.rope(m, 28.0, 7.6, 28.6, 7.6, bell=(28.62, 7.6)); note("cow-bell on a rope", 28.62, 7.6)
wl.pit_trap(m, 30.5, 14.0, 1.2, 1.2)                                                 # no key entry: a player has to spot it
wl.hide_rack(m, 20.8, 12.6, 2.6, 3); wl.hide_rack(m, 24.4, 12.8, 2.4, 2, "grey"); note("hides drying on racks", 23.4, 12.7)
wl.bones(m, 29.4, 8.6, 5, .5); wl.bones(m, 18.9, 12.3, 6, .6); note("gnawed bones", 29.4, 8.6); note("gnawed bones", 18.9, 12.3)
wl.stump(m, 22.0, 11.6, 19); pr.chopping(m, 27.6, 11.8); note("chopping block", 27.6, 11.8)
pr.logpile(m, 28.6, 9.2, .9, 1.4, upright=True); note("woodpile", 29.05, 9.9)

# ---- the wolf den, west ----
wl.den(m, 7.8, 12.0, 2.8, 2.6, mouth=(-.2, -.6)); note("wolf den under the rocks", 7.6, 10.6)
wl.bones(m, 9.0, 13.2, 7, .7); note("bones by the den", 9.0, 13.2)
wl.boulder(m, 19.0, 15.3, 1.1, .9); note("boulder", 19.0, 15.3)

# ---- the game-reeve's lodge, south-west: a living room and a sleeping room ----
rec.roof("game-reeves-lodge-roof", "Roof (game-reeve's lodge)", (7.48, 37.08, 8.0625, 6.45), "slate", smoke=(10.07, 42.3))
fin = B.hut(rec, 8.0, 37.6, 7.0, 5.4, doors=[("w", 1.81), ("e", 2.06)], floor="planks", name="Game-reeve's lodge")
rec.wall(12.1, 37.6, 12.1, 39.8); rec.wall(12.1, 40.8, 12.1, 43.0)
wl.hearth(m, 10.07, 42.3, rec=rec, label="Hearth (game-reeve's lodge)", r=.5)
m.table(9.2, 38.1, 1.6, .85, things=False); pr.bench(m, 9.3, 39.05, 1.4, .34); note("table", 10.0, 38.5)
pr.shelf(m, 11.5, 38.0, .44, 1.4, ["jug", "bowl"]); note("shelf", 11.7, 38.7)
wl.bow(m, 8.5, 41.0); note("bow and quiver on the wall", 8.5, 41.4)
pr.bed(m, 13.85, 41.4, .95, 1.4, head="s", cloth="red"); note("bed", 14.3, 42.1)
pr.chest(m, 12.4, 37.9, .95, .6); note("chest", 12.9, 38.2)
pr.barrel(m, 14.5, 38.2, 21, holds="water", name="Water cask (game-reeve's lodge)")
wl.pelt(m, 12.5, 41.6, .8, 1.1, "red"); note("fox pelt", 12.9, 42.15)
pr.door(m, 12.1, 39.8, 12.1, 40.8, B.TH, centre=(10.0, 40.3), swing=-1, hinge="a", exterior=False, name="Door (the reeve's room)")
fin()
pr.logpile(m, 8.5, 44.2, 3.4, 1.0); note("woodpile", 10.2, 44.7)
wl.hide_rack(m, 8.8, 35.6, 3.6, 4); note("hides drying on a rack", 10.6, 35.6)
wl.stump(m, 16.4, 41.8, 19); wl.stump(m, 16.1, 38.4, 17)

# ---- Old Tusk's thicket and wallow, south-east ----
wl.wallow(m, 51.6, 34.6, 1.5, 1.0); note("muddy wallow, churned by a boar", 51.6, 34.6)
wl.thicket(m, 47.4, 29.0, 57.8, 40.4, keep=[(51.6, 34.6, 2.6, 2.0), (50.2, 31.4, .9, 2.4)], n=120); note("blackthorn thicket", 54.0, 31.0)

# ---- the wood ----
for x, y, w_, h_ in ((56.0, 9.6, .8, .6), (44.0, 24.2, .7, .5), (40.2, 41.0, .8, .6), (19.2, 24.6, .6, .5), (60.4, 22.0, 1.0, .8), (3.2, 30.0, .9, .7)):
    wl.boulder(m, x, y, w_, h_); note("boulder", x, y)
wl.trunk(m, 54.6, 17.2, 56.8, 17.6, 20); note("fallen log", 55.7, 17.4)
wl.trunk(m, 57.8, 9.0, 60.4, 8.6, 18); note("fallen log", 59.1, 8.8)
clearings = [((24.0, 8.4), (7.4, 6.4)), ((8.0, 12.0), (5.6, 5.4)), ((11.6, 40.4), (6.4, 5.6)), ((52.6, 34.6), (6.2, 6.6))]
built = [(20.0, 4.6, 8.0, 6.0), (8.0, 37.6, 7.0, 5.4)]


def clear(x, y, r):
    """No tree in a clearing, on a path, over a lodge or in the thicket."""
    for (cx, cy), (rx, ry) in clearings:
        if ((x - cx) / (rx + r * .3)) ** 2 + ((y - cy) / (ry + r * .3)) ** 2 < 1: return True
    if any(bx - r * .55 < x < bx + bw + r * .55 and by - r * .55 < y < by + bh + r * .55 for bx, by, bw, bh in built): return True
    px_, py_ = min(max(int(x * T), 0), m.W - 1), min(max(int(y * T), 0), m.H - 1)
    return dt[py_, px_] < r * T * .4


# ---- dressing (B5746): both lodges, their yards and the wood floor ----
dr.dress(m, rec, (20.0, 4.6, 8.0, 6.0), "home")
dr.rooms(m, rec, (8.0, 37.6, 7.0, 5.4), [(12.1, 37.6, 12.1, 43.0)], "home")
dr.dress(m, rec, (17.0, 2.0, 14.0, 13.0), "yard", n=16); dr.dress(m, rec, (5.0, 33.6, 13.0, 12.0), "yard", n=14)
dr.dress(m, rec, (0, 0, W, H), "wood", n=180)
land.trees(m, W, H, clear, n=1700, fir=.45, gap=.56)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "high-woods")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
