"""WoDX farmstead generator, Dungeondraft edition.

Writes a .dungeondraft_map (Dungeondraft 1.0 JSON) for a small farmstead in the woods, placed from Ben's
Forgotten Adventures packs, plus a plan-view SVG that shows every footprint so the logic can be checked by eye.

How it decides where things go
  1. Site: the clearing, the track and the brook are laid first.
  2. Buildings and yard features have footprints; every footprint must keep clear of the track, the brook, the
     map edge and every other footprint, or the script stops.
  3. Each building is a list of rooms from a building type (a byre-house: living room, cross-passage, byre).
     Partitions, doors and windows come from the room list.
  4. Each room has a furnishing list. Every item has a rule (against a wall, in a corner, by the hearth, by a
     window, in the middle) and a footprint. Items may not overlap each other, sit in a doorway's clear zone,
     block the walkway between doors, or cross a wall. An item that cannot be placed stops the script.
  5. Trees, bushes, stumps and stones fill what is left, outside every footprint and clear zone.
  6. A WoDX sidecar (kessler-steading.wodx.json) lists the doors, shutters, chests, beds, hay, oven, well, places and
     trigger regions in grid cells. In Foundry, after the map is imported, right-click the scene and choose
     "Adopt a generated map" (WoDX Interactables 0.19.0) to set them all up.

Rooms, furnishing and the Dungeondraft writer are shared with the town generator (ddcore.py); the three buildings
are building types from buildings.py.

Run: python3 ddfarm.py [seed] [asset list] [year]. The asset list is every asset path in the packs (one a line); the copy
used for the sample is /mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt.
"""
import json, math, os, sys

import ddcore as C
from ddcore import obj, wall_with_portals, pattern, path, seg_pts, rdist, splat_byte
import buildings as B

DEBUG = bool(os.environ.get("DEBUG"))
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1197
R = C.init(SEED, sys.argv[2] if len(sys.argv) > 2 else "../all.txt")
YEAR = int(sys.argv[3]) if len(sys.argv) > 3 else 1197
import furnishing as FURN
if not FURN.DEFAULT:                    # furnished by purpose, the age's palette and room value (furnishing.py)
    FURN.DEFAULT.update(year=YEAR, region="moravia", wealth=None, trade=None, seed=SEED)
COLS, ROWS = 50, 36

# ------------------------------------------------------------------ site
TRACK = [(-1, 26.5), (7, 24.6), (13, 22.6), (19, 21.6), (25, 21.1), (31, 19.6), (35, 17.8), (38.4, 16.4), (44, 14.4), (51, 13.2)]
TRACK_HALF = 1.15
BROOK = [(36.6, -1), (37.2, 5), (38.7, 10), (38.3, 16.4), (39.6, 23), (41.8, 30), (42.8, 37)]
BROOK_HALF = 0.6
BRIDGE = (38.4, 16.4)
CLEAR_C, CLEAR_R = (24, 17), (14.5, 10.5)

# yard features: kind, name, x, y, w, h (cells)
FEATURES = [
    ("house", "Longhouse", 13, 10, 12, 5),
    ("barn", "Barn", 27.5, 10, 6, 5),
    ("garden", "Kitchen garden", 8.5, 16, 6, 3),
    ("field", "Rye field", 3.5, 4.5, 8, 7),
    ("sty", "Sty", 27, 22.5, 4, 2.6),
    ("coop", "Coop", 21, 23, 2, 2),
    ("paddock", "Paddock", 32, 22, 5, 5),
    ("well", "Well", 24, 17, 1, 1),
    ("rick", "Haystack", 34.8, 11.2, 2.2, 2.2),
    ("woodpile", "Woodpile", 25.4, 10.6, .8, 3.2),
    ("block", "Chopping block", 26.0, 15.6, .7, .7),
]
F = {f[0]: f for f in FEATURES}

def seg_pts(poly, step=.1):
    for (ax, ay), (bx, by) in zip(poly, poly[1:]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for k in range(n + 1): yield ax + (bx - ax) * k / n, ay + (by - ay) * k / n

def rdist(px, py, x, y, w, h):
    return math.hypot(max(x - px, 0, px - (x + w)), max(y - py, 0, py - (y + h)))

def site_check(margin=.35):
    bad = []
    for _, n, x, y, w, h in FEATURES:
        for line, half, lab in ((TRACK, TRACK_HALF, "the track"), (BROOK, BROOK_HALF, "the brook")):
            d = min(rdist(a, b, x, y, w, h) for a, b in seg_pts(line))
            if d < half + margin: bad.append(f"{n} is {d - half:.2f} cells from {lab}")
        if x < 0 or y < 0 or x + w > COLS or y + h > ROWS: bad.append(f"{n} is off the map")
    for i, a in enumerate(FEATURES):
        for b in FEATURES[i + 1:]:
            gx = max(b[2] - (a[2] + a[4]), a[2] - (b[2] + b[4])); gy = max(b[3] - (a[3] + a[5]), a[3] - (b[3] + b[5]))
            if max(gx, gy) < .15: bad.append(f"{a[1]} touches {b[1]}")
    return bad

# ------------------------------------------------------------------ buildings
# Each building is a type from buildings.py, set on its yard footprint facing south.
BUILDINGS = {"house": "byre-house", "barn": "barn", "coop": "coop"}

def build_rooms():
    blds = []
    for key, tkey in BUILDINGS.items():
        _, name, fx, fy, fw, fh = F[key]
        b = B.place(key, tkey, fx, fy, "S", name)
        if (b.w, b.h) != (fw, fh): raise SystemExit(f"{name}: the {tkey} type is {b.w} x {b.h}, its footprint {fw} x {fh}")
        blds.append(b.furnish())
    return blds

def in_clearing(x, y, pad=0.0):
    a = math.atan2(y - CLEAR_C[1], x - CLEAR_C[0])
    k = 1 + .09 * math.sin(3 * a + 1.1) + .05 * math.sin(7 * a + .3)
    return math.hypot((x - CLEAR_C[0]) / CLEAR_R[0], (y - CLEAR_C[1]) / CLEAR_R[1]) < k - pad

def near(x, y, poly, d): return any(math.hypot(x - a, y - b) < d for a, b in seg_pts(poly, .3))

def terrain_splat():
    """4 texels a cell, RGBA weights: 1 grass, 2 forest floor, 3 dirt (track, yard, garden, field), 4 water (brook)."""
    W4, H4 = COLS * 4, ROWS * 4
    out = []
    track_pts = list(seg_pts(TRACK, .25)); brook_pts = list(seg_pts(BROOK, .2))
    for ty in range(H4):
        for tx in range(W4):
            x, y = (tx + .5) / 4, (ty + .5) / 4
            wgt = [0, 0, 0, 0]
            a = math.atan2(y - CLEAR_C[1], x - CLEAR_C[0])
            k = 1 + .09 * math.sin(3 * a + 1.1) + .05 * math.sin(7 * a + .3)
            r = math.hypot((x - CLEAR_C[0]) / CLEAR_R[0], (y - CLEAR_C[1]) / CLEAR_R[1]) / k
            g = min(1, max(0, (1.08 - r) / .16))                     # grass inside, forest floor outside, soft edge
            wgt[0], wgt[1] = g, 1 - g
            dt = min(math.hypot(x - a_, y - b_) for a_, b_ in track_pts if abs(x - a_) < 2.5) if any(abs(x - a_) < 2.5 for a_, _ in track_pts) else 9
            dirt = min(1, max(0, (TRACK_HALF + .25 - dt) / .5))
            for kind in ("garden", "field"):
                _, _, fx, fy, fw, fh = F[kind]
                if fx <= x <= fx + fw and fy <= y <= fy + fh: dirt = max(dirt, .85)
            yard = math.hypot((x - 23.5) / 6.5, (y - 17.3) / 2.6)
            dirt = max(dirt, min(.75, max(0, (1 - yard) / .35)))
            db = min((math.hypot(x - a_, y - b_) for a_, b_ in brook_pts if abs(y - b_) < 1.5), default=9)
            water = min(1, max(0, (BROOK_HALF + .1 - db) / .25))
            wgt = [v * (1 - dirt) for v in wgt]; wgt[2] = dirt
            wgt = [v * (1 - water) for v in wgt]; wgt[3] = water
            out.extend(splat_byte(wgt))
    return out

def trees_and_scatter(blocked):
    objs, placed = [], []
    pines = [f"Pine_Green_Shadow_A{i}_5x5.webp" for i in range(1, 13)]
    for _ in range(9000):
        x, y = R.uniform(-1.5, COLS + 1.5), R.uniform(-1.5, ROWS + 1.5)
        s = R.uniform(.75, 1.35); rad = 1.9 * s                    # canopy radius in cells
        if in_clearing(x, y, -.05): continue
        if any(rdist(x, y, *b) < rad * 1.05 for b in blocked): continue   # no canopy over a roof or a yard
        if near(x, y, TRACK, TRACK_HALF + rad * .5) or near(x, y, BROOK, BROOK_HALF + rad * .45): continue
        if any(math.hypot(x - a, y - b) < (rad + c) * .55 for a, b, c in placed): continue
        placed.append((x, y, rad)); objs.append(obj(R.choice(pines), x, y, R.uniform(-math.pi, math.pi), s, layer=400))
    for _ in range(260):                                                 # undergrowth along the edge of the clearing
        a = R.uniform(0, 2 * math.pi); k = R.uniform(.9, 1.12)
        x, y = CLEAR_C[0] + CLEAR_R[0] * k * math.cos(a), CLEAR_C[1] + CLEAR_R[1] * k * math.sin(a)
        if any(rdist(x, y, *b) < 1 for b in blocked) or near(x, y, TRACK, TRACK_HALF + .6) or near(x, y, BROOK, BROOK_HALF + .5): continue
        pick = R.random()
        if pick < .5: objs.append(obj(R.choice([f"Bush_Green_{c}{i}_1x1.webp" for c in "ABC" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), R.uniform(.8, 1.3)))
        elif pick < .75: objs.append(obj(R.choice([f"Fern_Green_A{i}_2x2.webp" for i in range(1, 6)]), x, y, R.uniform(0, 6.3), R.uniform(.5, .8)))
        elif pick < .9: objs.append(obj(f"Stump_Dark_A{R.randint(1, 7)}_4x4.webp", x, y, R.uniform(0, 6.3), R.uniform(.2, .3)))
        else: objs.append(obj(f"Rocks_Small_A{R.randint(1, 5)}_2x2.webp", x, y, R.uniform(0, 6.3), R.uniform(.5, .8)))
    for _ in range(40):                                                  # stones along the brook banks
        a, b = R.choice(list(seg_pts(BROOK, .5)))
        if abs(b - BRIDGE[1]) < 1.8: continue
        objs.append(obj(f"Pebbles_A{R.randint(1, 6)}_2x1.webp", a + R.choice((-1, 1)) * (BROOK_HALF + .25), b, R.uniform(0, 6.3), R.uniform(.5, .8)))
    return objs

def build():
    bad = site_check()
    if bad: raise SystemExit("SITE OVERLAPS:\n  " + "\n  ".join(bad))
    blds = build_rooms()
    walls, patterns, objects, paths = [], [], [], []
    for b in blds:
        walls.append(wall_with_portals(b.outline, getattr(b, "wall_tex", None) or b.t["wall"], b.openings, True, textures=getattr(b, "portal_tex", None)))
        for a, c in b.partitions:
            walls.append(wall_with_portals([a, c], getattr(b, "wall_tex", None) or b.t["wall"], b.openings, False, textures=getattr(b, "portal_tex", None)))
    for b in blds:
        for r in b.rooms:
            if B.floor_tex(r.floor):                           # a named floor or the age's palette floor (furnishing.apply)
                patterns.append(pattern([(r.x, r.y), (r.x + r.w, r.y), (r.x + r.w, r.y + r.h), (r.x, r.y + r.h)], B.floor_tex(r.floor)))
            objects.extend(C.dressing_objects(r, True))
            for it in r.items:
                # a turned item: the asset's own size turned a quarter
                rot = it.get("angle", 0.0 if not it["rot"] else math.pi / 2)
                objects.append(obj(C.drawn(it)[0], *C.centre(it), rot, C.drawn(it)[1], 100))
            objects.extend(C.dressing_objects(r, False))
    # yard: fences, well, woodpile, block, haystack, sty, garden crops
    def fence_box(x, y, w, h, gap_side, g0, g1):
        sides = {"N": [(x, y), (x + w, y)], "E": [(x + w, y), (x + w, y + h)], "S": [(x + w, y + h), (x, y + h)], "W": [(x, y + h), (x, y)]}
        for s, (a, b) in sides.items():
            if s == gap_side:
                m0 = (a[0] + (b[0] - a[0]) * g0, a[1] + (b[1] - a[1]) * g0); m1 = (a[0] + (b[0] - a[0]) * g1, a[1] + (b[1] - a[1]) * g1)
                paths.append(path([a, m0], "Fence-Wood-Ashen-A.png", 64)); paths.append(path([m1, b], "Fence-Wood-Ashen-A.png", 64))
            else:
                paths.append(path([a, b], "Fence-Wood-Ashen-A.png", 64))
    for k, side, g0, g1 in (("field", "E", .55, .75), ("garden", "N", .7, .88), ("sty", "N", .1, .35), ("paddock", "W", .2, .45)):
        fence_box(*F[k][2:], side, g0, g1)
    gx, gy, gw, gh = F["garden"][2:]
    for row in range(3):
        for col in range(int(gw / .8)):
            objects.append(obj(R.choice([f"Bush_Green_B{i}_1x1.webp" for i in (1, 2, 3)]), gx + .45 + col * .8, gy + .55 + row * .95, R.uniform(0, 6.3), .55))
    sx, sy, sw, sh = F["sty"][2:]
    objects.append(obj("Trough_Wood_Ashen_Water_A_2x1.webp", sx + 1.2, sy + sh - .6, 0, .9))
    objects.append(obj("Hay_Pile_A_02_2x2.webp", sx + sw - 1, sy + 1, 0, .8))
    wx, wy = F["well"][2] + .5, F["well"][3] + .5
    ring = [(wx + .5 * math.cos(a * math.pi / 6), wy + .5 * math.sin(a * math.pi / 6)) for a in range(12)]
    walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
    objects.append(obj("Bucket_Wood_Ashen_A_1x1.webp", wx + .9, wy + .3, 0, .8))
    px_, py_, pw, ph = F["woodpile"][2:]
    for k in range(3): objects.append(obj("Firewood_Stacked_A_1x1.webp", px_ + pw / 2, py_ + .55 + k * 1.05, math.pi / 2, 1))
    bx_, by_ = F["block"][2] + .35, F["block"][3] + .35
    objects.append(obj("Stump_Dark_A1_4x4.webp", bx_, by_, 0, .17))
    rx, ry, rw, _ = F["rick"][2:]
    objects.append(obj("Hay_Pile_A_01_2x2.webp", rx + rw / 2, ry + rw / 2, R.uniform(0, 6.3), rw / 2))
    # footbridge: a plank deck over the brook, turned to the track
    ang = math.atan2(TRACK[8][1] - TRACK[6][1], TRACK[8][0] - TRACK[6][0])
    hw, hd = 1.6, 1.0
    corners = [(BRIDGE[0] + c * hw * math.cos(ang) - s * hd * math.sin(ang), BRIDGE[1] + c * hw * math.sin(ang) + s * hd * math.cos(ang))
               for c, s in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    patterns.append(pattern(corners, "Wooden_Flooring_H_Ashen.webp", ang))
    # trees and scatter, kept off every footprint and clear zone
    blocked = [tuple(f[2:]) for f in FEATURES] + [(BRIDGE[0] - 2, BRIDGE[1] - 1.5, 4, 3)]
    objects += trees_and_scatter(blocked)
    return blds, walls, patterns, objects, paths

TERRAIN = ["Grass_A_03.webp", "Forest_Floor_Needles_A_01.webp", "Dirt_A_01.webp", "Water_Calm_A_Blue.webp"]

CAVE_LEN = C.cave_len(COLS, ROWS)


# ------------------------------------------------------------------ WoDX sidecar: what each thing is, for "Adopt this map"
# Positions are in grid cells from the map's top-left corner, so the import scale does not matter.
def wodx_sidecar(blds):
    openings, features = [], []
    for b in blds:
        openings += C.opening_entries(b.key, b.label, b.openings, b.centre)
    for b in blds:
        for r in b.rooms: features += C.feature_entries("", r, b.t["fill"])
    wx, wy = F["well"][2:4]
    features.append({"id": "well", "label": "Well", "rect": [wx, wy, 1, 1],
                     "flags": {"climb": True, "climbKind": "rope", "height": 25, "depth": 25, "title": "Down the well on the bucket rope"}})
    rx, ry, rw, rh = F["rick"][2:]
    features.append({"id": "rick", "label": "Haystack", "rect": [rx, ry, rw, rh],
                     "flags": {"hide": True, "hideKind": "crawl", "room": 2, "title": "Inside the haystack"}})
    regions = []
    for key, kind in (("house", "home"), ("barn", "workplace")):
        _, name, x, y, w, h = F[key]
        regions.append({"id": key, "label": name, "rect": [x, y, w, h], "place": {"kind": kind}})
    # where the track comes into the clearing from the west, and the footbridge to the east
    regions.append({"id": "track-west", "label": "Track into the steading", "rect": [8.5, 21.6, 2, 3.4],
                    "behaviors": [{"type": "trigger", "system": {"label": "the track into the steading", "does": "note", "who": "pcs"}}]})
    regions.append({"id": "bridge", "label": "Footbridge", "rect": [BRIDGE[0] - 1.5, BRIDGE[1] - 1.2, 3, 2.4],
                    "behaviors": [{"type": "trigger", "system": {"label": "the footbridge over the brook", "does": "note", "who": "pcs"}}]})
    return {"format": "wodx-map", "version": 1, "name": "Kessler steading", "map": "kessler-steading.dungeondraft_map",
            "cells": [COLS, ROWS], "seed": SEED, "place": {"kind": "yard"}, "openings": openings, "features": features, "regions": regions}

# ------------------------------------------------------------------ plan view, to check the logic by eye
def plan_svg(blds, path_out):
    s = 24
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{COLS * s}" height="{ROWS * s}" viewBox="0 0 {COLS * s} {ROWS * s}" font-family="DejaVu Sans" font-size="9">',
         f'<rect width="100%" height="100%" fill="#f4f1ea"/>']
    def poly(pts, **a):
        return "<polyline points='" + " ".join(f"{x * s:.1f},{y * s:.1f}" for x, y in pts) + "' " + " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in a.items()) + "/>"
    o.append(poly(list(seg_pts(TRACK, .5)), fill="none", stroke="#c9b48a", stroke_width=TRACK_HALF * 2 * s))
    o.append(poly(list(seg_pts(BROOK, .5)), fill="none", stroke="#8db3d9", stroke_width=BROOK_HALF * 2 * s))
    for _, n, x, y, w, h in FEATURES:
        o.append(f'<rect x="{x * s}" y="{y * s}" width="{w * s}" height="{h * s}" fill="none" stroke="#777" stroke-dasharray="4 3"/>')
        if n not in ("Longhouse", "Barn", "Coop"): o.append(f'<text x="{x * s + 3}" y="{y * s + 11}" fill="#555">{n}</text>')
    for b in blds:
        o += C.svg_rooms(b.rooms, s)
    for b in blds:
        o += C.svg_openings(b.openings, s)
    o.append("</svg>")
    open(path_out, "w").write("\n".join(o))

if __name__ == "__main__":
    blds, walls, patterns, objects, paths = build()
    C.write_map("kessler-steading.dungeondraft_map", COLS, ROWS, SEED, C.level(COLS, ROWS, walls, patterns, objects, paths, TERRAIN, terrain_splat()))
    plan_svg(blds, "plan.svg")
    json.dump(wodx_sidecar(blds), open("kessler-steading.wodx.json", "w"), indent=1)
    print(f"ok: {len(walls)} walls, {sum(len(w['portals']) for w in walls)} portals, {len(objects)} objects, {len(paths)} paths, cave {CAVE_LEN}")
    for b in blds:
        for r in b.rooms: print(f"  {r.name}: " + ", ".join(i["asset"].split("_")[0] for i in r.items))
