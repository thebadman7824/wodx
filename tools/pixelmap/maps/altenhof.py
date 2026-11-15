"""Rothenstein valley: The Ruins of Altenhof (58 x 46 squares), redrawn in WoDX's own pixel art on the old map's
layout (the Whole World desk, r1 to r3). A manor abandoned forty years: a broken curtain wall round a grassed-over
court, the roofless hall heaped with fallen stone, and one chamber still whole, where Lady Adelheid's bed is made and
her candles burn. A small chapel stands roofless in the south-west, the dry well in the court, and the tower that fell
inward lies in a heap in the south-east. The road goes out east to the Ford.

    python3 tools/pixelmap/maps/altenhof.py OUTDIR

Walls, doors, windows, lights and the exit sit on the old scene's own (the testbed export, 80 px a square), so the
scene's notes, Ways and lights still fit. Daylight colours; Foundry's clock darkens."""
import math, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from px import R, T, OUT
import props as pr
import land
import wilds as wl
import dress as dr
import buildings as B
from scene import Recorder

W, H = 58, 46
rec = Recorder("The Ruins of Altenhof", (W, H), seed=1157, place="ruin")
m = rec.m; note = rec.note; d = m.d
road = [(59, 24.0), (52, 24.2), (46, 24.6), (40.6, 25.0)]
court = [(40.6, 25.0), (37.4, 24.0), (34.6, 21.6), (33.0, 17.6)]                        # trodden to the hall's broken side
dt, db = land.ground(m, roads=[(road, 66), (court, 26)], floor="forest")
X0, Y0, X1, Y1 = int(12 * T), int(6 * T), int(40 * T), int(40 * T)                     # the court inside the curtain: rough grass
g = m.grass(Y1 - Y0, X1 - X0); keep = dt[Y0:Y1, X0:X1] >= 0; m.put(g, X0, Y0, mask=keep)
dr.snap(m)

# ---- floors: the roofless hall's flags under fallen stone, the chamber's boards, the chapel's flags ----
B._floor(m, 16, 10, 16, 12, "flags"); B._floor(m, 22, 22, 10, 8, "planks"); B._floor(m, 14, 26, 6, 10, "flags")
rng = m.rng
for x0_, y0_, w_, h_ in ((16, 10, 16, 12), (14, 26, 6, 10)):                            # grass and earth pushing up through the flags
    X0_, Y0_ = int(x0_ * T), int(y0_ * T); gh, gw = int(h_ * T), int(w_ * T)
    nz = m.noise(gh, gw, 46); mk = nz > .56
    m.put(m.grass(gh, gw), X0_, Y0_, mask=mk); m.put((m.dirt(gh, gw) * .8).astype(np.uint8), X0_, Y0_, mask=(nz > .5) & ~mk)
for _ in range(70):                                                                    # weeds and moss in the hall's joints
    x, y = rng.uniform(16.3, 31.7), rng.uniform(10.3, 21.7); d.rectangle([x * T, y * T, x * T + 4, y * T + 2], fill=R["green"][int(rng.integers(1, 4))])
for _ in range(26):                                                                    # fallen stone from the hall's roof and walls
    x, y = rng.uniform(16.6, 31.4), rng.uniform(10.6, 21.4); s_ = rng.uniform(16, 34); m.rock(x * T, y * T, s_, s_ * .75)
for hx, hy in ((17.2, 11.2), (30.6, 11.0), (17.4, 20.8), (23.0, 10.8), (31.0, 16.0)):     # heaps where the walls came down inside
    for _ in range(9): wl.boulder(m, hx + rng.uniform(-.9, .9), hy + rng.uniform(-.6, .6), rng.uniform(.45, .9), rng.uniform(.35, .7), moss=True)
note("fallen stone (the hall)", 24, 16)
for x, y in ((18.4, 12.2), (29.6, 19.6), (21.2, 18.4)): m.crack(int(x * T), int(y * T), 14)
wl.trunk(m, 19.0, 15.0, 23.6, 13.4, 16); note("fallen roof beam", 21.3, 14.2)
wl.trunk(m, 26.4, 19.6, 30.2, 20.8, 14); note("fallen roof beam", 28.3, 20.2)

# ---- walls: what still stands, on the old scene's own lines; broken ends spill rubble ----
WALLS = [(12.0, 6.0, 12.71, 6.0), (12.0, 6.0, 12.0, 6.41), (14.62, 6.0, 18.61, 6.0), (19.65, 6.0, 24.99, 6.0), (26.0, 6.0, 27.68, 6.0),
         (28.57, 6.0, 29.64, 6.0), (32.04, 6.0, 40.0, 6.0), (40.0, 6.0, 40.0, 14.39), (12.0, 7.67, 12.0, 14.59), (16.0, 10.0, 16.0, 18.29),
         (16.0, 10.0, 24.41, 10.0), (26.2, 10.0, 32.0, 10.0), (32.0, 10.0, 32.0, 10.65), (32.0, 12.95, 32.0, 14.25), (12.0, 15.95, 12.0, 23.6),
         (40.0, 16.05, 40.0, 20.29), (32.0, 16.81, 32.0, 18.99), (16.0, 20.32, 16.0, 22.0), (32.0, 21.05, 32.0, 22.0), (40.0, 21.41, 40.0, 22.6),
         (16.0, 22.0, 22.0, 22.0), (22.0, 22.0, 22.0, 25.7), (22.0, 22.0, 24.5, 22.0), (25.5, 22.0, 28.4, 22.0), (29.0, 22.0, 32.0, 22.0),
         (32.0, 22.0, 32.0, 25.7), (12.0, 25.54, 12.0, 28.94), (14.0, 26.0, 14.0, 32.15), (14.0, 26.0, 20.0, 26.0), (20.0, 26.0, 20.0, 26.71),
         (22.0, 26.3, 22.0, 30.0), (32.0, 26.3, 32.0, 30.0), (40.0, 27.4, 40.0, 37.9), (20.0, 28.38, 20.0, 33.01), (12.0, 29.9, 12.0, 36.67),
         (22.0, 30.0, 25.0, 30.0), (25.6, 30.0, 28.4, 30.0), (29.0, 30.0, 32.0, 30.0), (14.0, 34.45, 14.0, 36.0), (20.0, 35.16, 20.0, 36.0),
         (12.0, 38.5, 12.0, 40.0), (40.0, 38.96, 40.0, 40.0), (12.0, 40.0, 12.38, 40.0), (14.12, 40.0, 21.61, 40.0), (23.82, 40.0, 28.26, 40.0),
         (29.2, 40.0, 30.75, 40.0), (33.25, 40.0, 34.62, 40.0), (36.5, 40.0, 40.0, 40.0)]
whole = lambda x, y: 21.9 <= x <= 32.1 and 21.9 <= y <= 30.1                               # the chamber still stands whole
for x0, y0, x1, y1 in WALLS: rec.wall(x0, y0, x1, y1, th=40 if whole((x0 + x1) / 2, (y0 + y1) / 2) else 56, kind="stone")
ends = {}
for x0, y0, x1, y1 in WALLS:
    for p in ((x0, y0), (x1, y1)): ends[p] = ends.get(p, 0) + 1
for (x, y), n in ends.items():
    if n > 1 or whole(x, y) or (y == 22.0 and 24 < x < 26): continue
    for _ in range(6): wl.boulder(m, x + rng.uniform(-.7, .7), y + rng.uniform(-.7, .7), rng.uniform(.4, .8), rng.uniform(.3, .6), moss=rng.random() < .5)   # a broken end: its fallen stones
for _ in range(80):                                                                    # moss and ivy along the wall tops
    x0, y0, x1, y1 = WALLS[int(rng.integers(0, len(WALLS)))]
    if whole((x0 + x1) / 2, (y0 + y1) / 2): continue
    t = rng.uniform(0, 1); x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
    d.rectangle([x * T - 6, y * T - 5, x * T + 6, y * T + 3], fill=R["green"][int(rng.integers(1, 4))])
note("curtain wall, broken", 12, 20); note("hall, roofless", 24, 11)

# ---- Lady Adelheid's chamber: still whole, the bed made, fresh candles burning ----
rec.roof("chamber-roof", "Roof (Lady Adelheid's chamber)", (21.29, 21.29, 11.4125, 9.4125), "slate")
pr.door(m, 24.5, 22, 25.5, 22, 40, centre=(27, 26), swing=-1, hinge="a", exterior=True, name="Door (Lady Adelheid's chamber)")
for c in ((28.4, 22, 29, 22), (22, 25.7, 22, 26.3), (32, 25.7, 32, 26.3), (25, 30, 25.6, 30), (28.4, 30, 29, 30)):
    pr.window(m, *c, th=40, centre=(27, 26), glass=False, name="Window (Lady Adelheid's chamber)")
m.rug(25.2, 24.2, 3.6, 3.1, a="red", b="gold"); note("rug", 27, 27.6)


def state_bed(x, y, w=1.5, h=1.9):
    """A lady's bed under a half-tester: the bed made up, posts at the foot with the curtains gathered round them, and
    the canopy of red cloth over the head end, its fringe and its shadow on the pillows."""
    pr.bed(m, x, y, w, h, head="n", cloth="blue")
    X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
    m.shade((X0, Y0 + 40, X1, Y0 + 58), f=.7)
    m.box(X0 - 4, Y0 - 4, X1 + 4, Y0 + 40, "red", 2)                                     # the canopy over the head
    for xx in range(X0, X1, 8): d.line([xx, Y0 + 40, xx + 3, Y0 + 46], fill=R["gold"][3])
    for px_ in (X0 + 2, X1 - 2):                                                          # foot posts, the curtains tied to them
        m.disc(px_, Y1 - 2, 9, "dwood", 3); d.polygon([(px_ - 12, Y1 - 30), (px_ + 12, Y1 - 30), (px_ + 8, Y1 + 8), (px_ - 8, Y1 + 8)], fill=R["red"][1], outline=OUT)
        m.disc(px_, Y1 - 2, 7, "dwood", 3)
    note("curtained bed, made up", x + w / 2, y + h / 2)


state_bed(26.25, 24.3)
for cx_, cy_, lab in ((25.7, 24.5, "Candle by the bed (west)"), (28.3, 24.5, "Candle by the bed (east)"), (22.45, 24.9, "Candle on the wall bracket")):
    m.disc(int(cx_ * T), int(cy_ * T), 15, "iron", 2); m.candle(cx_, cy_); rec.light(lab, lab, (cx_ - .4, cy_ - .4, .8, .8), dim=3, bright=1, color="#ffc46b", kind="candle"); note("candle, fresh, burning", cx_, cy_)
pr.chest(m, 26.5, 26.9, 1.0, .6); note("chest at the bed's foot", 27, 27.2)
m.table(22.4, 28.2, .9, .9, things=False); pr.jug(m, int(22.7 * T), int(28.55 * T)); pr.bowl(m, int(23.0 * T), int(28.8 * T)); note("washstand", 22.85, 28.65)
pr.stool(m, 31.0, 28.8); note("stool", 31.2, 29.0)
pr.shelf(m, 31.4, 22.4, .44, 1.4, ["jug", "bowl", "pot"]); note("shelf", 31.6, 23.1)

# ---- the chapel, south-west: roofless, its altar still there with two cold candles ----
m.altar(15.6, 26.35, 2.8, .9, cloth="linen", trim="red", cross=True); note("altar", 17, 26.8)
for cx_ in (15.9, 18.1): d.rectangle([cx_ * T - 4, 26.55 * T - 4, cx_ * T + 4, 26.55 * T + 4], fill=R["pale"][4], outline=OUT)
note("cold candles", 17, 26.55)
for _ in range(12): x, y = rng.uniform(14.4, 19.6), rng.uniform(28, 35.6); s_ = rng.uniform(12, 24); m.rock(x * T, y * T, s_, s_ * .75)
note("chapel, roofless", 17, 31)

# ---- the dry well, the old footings, the fallen tower ----
cx_, cy_ = int(26.0 * T), int(35.6 * T)
m.shade((cx_ - 76, cy_ - 70, cx_ + 92, cy_ + 92), kind="ellipse", f=.6)
for a in np.linspace(0, 2 * math.pi, 18, endpoint=False):                                # the curb of fitted stones
    m.box(int(cx_ + math.cos(a) * 66) - 12, int(cy_ + math.sin(a) * 66) - 10, int(cx_ + math.cos(a) * 66) + 12, int(cy_ + math.sin(a) * 66) + 10, "stone", 3)
for k, (c, r_) in enumerate(((OUT, 56), ((30, 26, 28), 52), ((16, 12, 14), 38), ((8, 6, 8), 22))): d.ellipse([cx_ - r_, cy_ - r_, cx_ + r_, cy_ + r_], fill=c)
d.rectangle([cx_ + 5, cy_ + 4, cx_ + 7, cy_ + 6], fill=R["gold"][4]); d.point((cx_ + 6, cy_ + 5), fill=(255, 255, 230))   # something down there catches the light
note("dry well", 26, 35.6)
for yy in (33.0, 35.4):                                                                # old footings: one course of stones in the grass
    for xx in np.arange(21.6, 25.6, .5): m.box(int(xx * T), int(yy * T) - 16, int(xx * T) + 42, int(yy * T) + 16, "stone", 2)
note("old footings", 23.6, 34.2)
for a in np.linspace(0, 2 * math.pi, 64, endpoint=False):                               # the tower's footing: a broken ring of wall
    if math.sin(a * 3 + .7) > .55: continue
    x, y = 36.0 + math.cos(a) * 3.2, 35.2 + math.sin(a) * 4.0
    m.box(int(x * T) - 22, int(y * T) - 22, int(x * T) + 22, int(y * T) + 22, "stone", int(rng.integers(2, 4)))
for _ in range(60):                                                                    # the tower fell inward: a heap of its stones
    a = rng.uniform(0, 2 * math.pi); q = rng.uniform(0, 1) ** .5; x, y = 36.0 + math.cos(a) * q * 2.9, 35.2 + math.sin(a) * q * 3.9
    if math.hypot(x - 35.5, y - 33.6) < .85: continue
    s_ = rng.uniform(.5, 1.1) * (1.3 - q * .5); wl.boulder(m, x, y, s_, s_ * .8, moss=rng.random() < .4)
sx, sy = int(35.5 * T), int(33.6 * T)                                                   # a stair going down between the stones
d.rectangle([sx - 40, sy - 34, sx + 40, sy + 34], fill=(14, 10, 12), outline=OUT)
for k in range(5): d.rectangle([sx - 36, sy - 30 + k * 13, sx + 36, sy - 24 + k * 13], fill=R["stone"][max(0, 3 - k)])   # each step lower and darker
note("fallen tower", 36, 36); note("steps going down under the rubble", 35.5, 33.6)

# ---- the court's scrub, the ground outside ----
for _ in range(26):
    x, y = rng.uniform(32.8, 39.2), rng.uniform(7.2, 20.4)
    if x < 33.6 and 10 < y < 22: continue
    m.bush(x * T, y * T, int(rng.uniform(.35, .6) * T), (46, 52, 92) if rng.random() < .3 else None)
note("scrub grown up in the court", 36, 12)
for x, y, w_, h_ in ((5.8, 33.8, 1.0, .8), (8.1, 32.9, .5, .4), (51.6, 29.0, .7, .55)): wl.boulder(m, x, y, w_, h_); note("boulder", x, y)
wl.trunk(m, 49.2, 25.9, 51.4, 28.3, 18); note("fallen log", 50.3, 27.1)


def clear(x, y, r):
    """No tree inside the curtain wall, on the road, or close against the wall."""
    if 12 - r * .55 < x < 40 + r * .55 and 6 - r * .55 < y < 40 + r * .55: return True
    px_, py_ = min(max(int(x * T), 0), m.W - 1), min(max(int(y * T), 0), m.H - 1)
    return dt[py_, px_] < r * T * .4


# ---- dressing (B5746): what lies about the ruin, the chamber kept as a home, the wood floor ----
dr.rooms(m, rec, (22, 22, 10, 8), WALLS, "home")
dr.dress(m, rec, (16, 10, 16, 12), "ruin", n=26); dr.dress(m, rec, (14, 26, 6, 10), "ruin", n=8)
dr.dress(m, rec, (12, 6, 28, 34), "ruin", n=40)
dr.dress(m, rec, (0, 0, W, H), "wood", n=150)
land.trees(m, W, H, clear, n=1500, fir=.4, gap=.56)
for hx, hy, hr, cone in getattr(m, "hearths", []): m.glow(hx, hy, hr, cone=cone, power=.55); m.glow(hx, hy, 70, power=.5)
rec.region("chamber", "Lady Adelheid's chamber", (22, 22, 10, 8), "home")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "altenhof")
side = rec.finish(out)
print(f"{side['name']}: {len(side['openings'])} doors and windows, {len(side['features'])} things, {len(side['key'])} named, in {os.path.normpath(out)}")
