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

Run: python3 ddfarm.py [seed] [asset list]. The asset list is every asset path in the packs (one a line); the copy
used for the sample is /mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt.
"""
import json, math, random, re, sys

import os
DEBUG = bool(os.environ.get("DEBUG"))
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1197
R = random.Random(SEED)
CELL = 256                    # Dungeondraft pixels per grid square
COLS, ROWS = 50, 36
ASSETS = [l.strip() for l in open(sys.argv[2] if len(sys.argv) > 2 else "../all.txt", encoding="utf-8-sig") if "/textures/" in l]

SAMPLE = "/mnt/project-files/maps-ref/scripts/sample-walls-cottage inside.dungeondraft_map"
PACKS = {   # id: (name, version)
    "w4GH4hnv": ("FA_Artificial_A_v2.05", "2.05"),
    "gCzbBqXO": ("FA_Natural_A_v2.04", "2.04"),
    "z2pnS3Kp": ("FA_Natural_Terrains_A_v2.02", "2.02"),
    "H37W5Oj8": ("FA_Artificial_Floors_A_v2.02", "2.02"),
}

def asset(name, kind="objects"):
    hits = [a for a in ASSETS if a.endswith("/" + name) and f"/textures/{kind}/" in a]
    if len(hits) != 1: raise SystemExit(f"asset {name!r}: {len(hits)} matches")
    return "res://packs/" + hits[0]

def cells_of(name):
    m = re.search(r"_(\d+)x(\d+)(?:_\w+)?\.(?:webp|png)$", name)
    return (int(m.group(1)), int(m.group(2))) if m else (1, 1)

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

# ------------------------------------------------------------------ buildings: rooms, openings
# A byre-house of the region: living room (Stube) at the west end, a cross-passage with a door each side,
# the byre at the east end. The oven stands against the passage wall so the living room is heated from it.
BUILDINGS = {
    "house": {
        "wall": "Wood_Ashen_A.png",
        "rooms": [("Living room", 13, 10, 5, 5, "planks"), ("Passage", 18, 10, 3, 5, "earth"), ("Byre", 21, 10, 4, 5, "earth")],
        # openings: (kind, x, y, along) with along "h" for a wall running east-west, "v" north-south; x,y = centre
        "openings": [
            ("door", 19.5, 15, "h"), ("door", 19.5, 10, "h"),                   # passage, yard side and back
            ("doorway", 18, 11, "v"), ("doorway", 21, 11, "v"),         # passage into each end
            ("double", 22.5, 15, "h"),                                        # byre doors for the beasts
            ("window", 14.5, 15, "h"), ("window", 13, 12.5, "v"), ("window", 15.5, 10, "h"), ("window", 23, 10, "h"),
        ],
        "partitions": [((18, 10), (18, 15)), ((21, 10), (21, 15))],
    },
    "barn": {
        "wall": "Wood_Ashen_B.png",
        "rooms": [("Barn floor", 27.5, 10, 6, 5, "earth")],
        "openings": [("double", 30.5, 15, "h"), ("window", 30.5, 10, "h")],
        "partitions": [],
    },
    "coop": {
        "wall": "Wood_Ashen_C.png",
        "rooms": [("Coop", 21, 23, 2, 2, "earth")],
        "openings": [("door", 22, 23, "h")],
        "partitions": [],
    },
}

PORTALS = {"door": ("Door_Wood_Ashen_A1_1x1.webp", 1), "double": ("DoubleDoor_Wood_Ashen_A1_2x1.webp", 2),
           "doorway": ("Doorway_Wood_Ashen_A.png", 1), "window": ("Window_Wood_Ashen_A1_1x1.webp", 1)}

# ------------------------------------------------------------------ furnishing lists
# (asset, rule, count) ; rules: wall, corner, hearth, window, centre, beside:<asset>
FURNISH = {
    "Living room": [
        ("Brick_Oven_Gray_A_Hot_2x2.webp", "wall:SE", 1),         # in the corner by the passage wall, fed from the passage
        ("Firewood_Pile_A_1x1.webp", "hearth", 1),
        ("Single_Bed_Colorable_Ashen_A_AB_1x2.png", "wall:W", 2),  # beds along the far gable wall
        ("Chest_Wood_Ashen_A_1x1.webp", "beside:bed", 1),
        ("Table_Rectangle_Wood_Ashen_E_2x1.webp", "window", 1),   # table under a window for the light
        ("Bench_Wood_Ashen_A1_2x1.webp", "beside:table", 1),
        ("Stool_Wood_Ashen_A_1x1.webp", "beside:table", 1),
    ],
    "Passage": [
        ("Barrel_Wood_Ashen_A_1x1.webp", "wall", 2, .75),
        ("Sack_Brown_E_Grains_1x1.webp", "wall", 1, .75),
        ("Broom_Wood_Ashen_A_1x1.webp", "corner", 1, .7),
        ("Firewood_Stacked_A_1x1.webp", "wall", 1, .75),
    ],
    "Byre": [
        ("Trough_Wood_Ashen_Grain_A_2x1.webp", "wall:E", 2),
        ("Hay_Bale_A_01_1x1.webp", "wall", 2, .75),
        ("Bucket_Wood_Ashen_B_1x1.webp", "wall", 1, .7),
    ],
    "Barn floor": [
        ("Hay_Pile_A_01_2x2.webp", "corner", 2),
        ("Hay_Bale_A_01_1x1.webp", "wall", 2),
        ("Sack_Brown_D_Grain_1x1.webp", "wall", 2, .8),
    ],
    "Coop": [("Hay_Bale_A_02_1x1.webp", "corner", 1, .6)],
}

class Room:
    def __init__(self, name, x, y, w, h, floor, openings):
        self.name, self.x, self.y, self.w, self.h, self.floor = name, x, y, w, h, floor
        self.items, self.blocked = [], []
        inset = .18   # wall half-thickness plus a little air
        self.ix, self.iy, self.iw, self.ih = x + inset, y + inset, w - 2 * inset, h - 2 * inset
        # clear zones: one cell inside each door, and a walkway joining the doors
        self.doors = []
        for kind, ox, oy, along in openings:
            on_edge = (abs(ox - x) < .01 or abs(ox - (x + w)) < .01) and y <= oy <= y + h or \
                      (abs(oy - y) < .01 or abs(oy - (y + h)) < .01) and x <= ox <= x + w
            if not on_edge: continue
            half = PORTALS[kind][1] / 2
            if kind == "window":
                self.windows = getattr(self, "windows", []) + [(ox, oy, along)]
                continue
            if along == "h":
                zy = oy if abs(oy - y) < .01 else oy - 1.1
                self.blocked.append((ox - half, zy, 2 * half, 1.1, "door clear zone"))
            else:
                zx = ox if abs(ox - x) < .01 else ox - 1.1
                self.blocked.append((zx, oy - half, 1.1, 2 * half, "door clear zone"))
            self.doors.append((ox, oy, along))
        if not hasattr(self, "windows"): self.windows = []
        ow, oh = w - 4.4, h - 4.4                                        # keep the middle of a big room open
        if ow > .5 and oh > .5: self.blocked.append((x + (w - ow) / 2, y + (h - oh) / 2, ow, oh, "open floor"))
        if len(self.doors) > 1:                                          # walkways: each door to the first, in an L
            (ax, ay, _) = self.doors[0]
            for (bx, by, along) in self.doors[1:]:
                corner = (bx, ay) if along == "h" else (ax, by)
                for (p, q) in (((bx, by), corner), (corner, (ax, ay))):
                    x0, x1 = sorted((p[0], q[0])); y0, y1 = sorted((p[1], q[1]))
                    rx0, ry0 = max(x0 - .5, x), max(y0 - .5, y); rx1, ry1 = min(x1 + .5, x + w), min(y1 + .5, y + h)
                    if rx1 > rx0 and ry1 > ry0: self.blocked.append((rx0, ry0, rx1 - rx0, ry1 - ry0, "walkway"))

    def fits(self, r):
        x, y, w, h = r
        if x < self.ix - 1e-6 or y < self.iy - 1e-6 or x + w > self.ix + self.iw + 1e-6 or y + h > self.iy + self.ih + 1e-6: return False
        for bx, by, bw, bh, *_ in self.blocked + [(i["x"], i["y"], i["w"], i["h"]) for i in self.items]:
            if x < bx + bw - 1e-6 and bx < x + w - 1e-6 and y < by + bh - 1e-6 and by < y + h - 1e-6: return False
        return True

    def candidates(self, fw, fh, rule):
        """Spots on a quarter-cell grid, plus spots flush with each wall and with each placed item or clear zone,
        for both turns of the item. Wall and corner rules are hard: the item must touch a wall."""
        out = []
        edges = self.blocked + [(i["x"], i["y"], i["w"], i["h"]) for i in self.items]
        for (w, h, rot) in ((fw, fh, 0), (fh, fw, 1)):
            xs = {round(self.ix + k * .25, 4) for k in range(int((self.iw - w) / .25) + 1)} | {self.ix, round(self.ix + self.iw - w, 4)}
            ys = {round(self.iy + k * .25, 4) for k in range(int((self.ih - h) / .25) + 1)} | {self.iy, round(self.iy + self.ih - h, 4)}
            for bx, by, bw, bh, *_ in edges:
                xs |= {round(bx + bw, 4), round(bx - w, 4)}; ys |= {round(by + bh, 4), round(by - h, 4)}
            for x in xs:
                for y in ys:
                    if not self.fits((x, y, w, h)): continue
                    kind, _, arg = rule.partition(":")
                    t = self.touching(x, y, w, h)
                    if kind in ("wall", "corner", "window") and not (all(t[c] for c in arg) if arg else any(t.values())): continue
                    if kind == "corner" and sum(t.values()) < 2: continue
                    if kind in ("wall", "window") and w != h and sum(t.values()) == 1 and ((t["N"] or t["S"]) != (w > h)): continue
                    if kind == "wall" and len(arg) == 1 and w != h and ((arg in "NS") != (w > h)): continue
                    out.append((self.score(x, y, w, h, rule, rot), x, y, w, h, rot))
        out.sort(key=lambda c: -c[0])
        return out

    def touching(self, x, y, w, h, e=.02):
        return {"W": abs(x - self.ix) < e, "E": abs(x + w - self.ix - self.iw) < e,
                "N": abs(y - self.iy) < e, "S": abs(y + h - self.iy - self.ih) < e}

    def score(self, x, y, w, h, rule, rot):
        e = .02
        touch = {"W": abs(x - self.ix) < e, "E": abs(x + w - self.ix - self.iw) < e,
                 "N": abs(y - self.iy) < e, "S": abs(y + h - self.iy - self.ih) < e}
        walls = sum(touch.values())
        cx, cy = x + w / 2, y + h / 2
        s = R.random() * getattr(self, "noise", .1)
        kind, _, arg = rule.partition(":")
        if kind == "wall":                                   # pack along the wall from a corner or a neighbour
            s += 10 + 1.5 * (walls >= 2)
            s += 1.5 * any(abs(x - (i["x"] + i["w"])) < .02 or abs(x + w - i["x"]) < .02 or abs(y - (i["y"] + i["h"])) < .02 or abs(y + h - i["y"]) < .02 for i in self.items)
        if kind == "corner": s += 6 * (walls >= 2) + 3 * (walls == 1)
        if kind == "centre": s -= abs(cx - (self.ix + self.iw / 2)) + abs(cy - (self.iy + self.ih / 2))
        if kind == "window" and self.windows:
            s += 8 * (walls >= 1) - min(math.hypot(cx - wx, cy - wy) for wx, wy, _ in self.windows)
        if kind in ("hearth", "beside"):
            tag = "Oven" if kind == "hearth" else {"bed": "Bed", "table": "Table"}[arg]
            ref = [i for i in self.items if tag in i["asset"]]
            if ref:
                d = min(rdist(cx, cy, i["x"], i["y"], i["w"], i["h"]) for i in ref)
                s += 10 - 4 * d + 2 * (walls >= 1)
                if arg == "table" and w != h: s += 4 * any((i["w"] > i["h"]) == (w > h) for i in ref)
        # a long item lies along the wall it touches
        if walls == 1 and max(w, h) > min(w, h) and ((touch["N"] or touch["S"]) != (w > h)): s -= 3
        return s

    def furnish(self, tries=80):
        """Greedy placement by rule; if an item cannot be placed, start the room again with more shuffle.
        Only when every try fails does the script stop."""
        for t in range(tries):
            self.items, self.noise = [], .1 + t * .08
            if self.try_furnish(): return
        raise SystemExit(f"cannot furnish {self.name}: {self.last_fail} has no room after {tries} tries")

    def try_furnish(self):
        for entry in FURNISH.get(self.name, []):
            name, rule, count = entry[:3]; sc = entry[3] if len(entry) > 3 else 1.0
            fw, fh = (round(v * sc, 3) for v in cells_of(name))
            for _ in range(count):
                c = self.candidates(fw, fh, rule)
                if not c: self.last_fail = name; return False
                _, x, y, w, h, rot = c[0]
                self.items.append({"asset": name, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": sc})
        return True

def build_rooms():
    rooms = []
    for key, b in BUILDINGS.items():
        _, _, fx, fy, fw, fh = F[key]
        for rname, x, y, w, h, floor in b["rooms"]:
            if x < fx or y < fy or x + w > fx + fw or y + h > fy + fh: raise SystemExit(f"{rname} lies outside its building")
            r = Room(rname, x, y, w, h, floor, b["openings"]); r.furnish(); rooms.append((key, r))
    return rooms

# ------------------------------------------------------------------ Dungeondraft writer
class Ids:
    def __init__(self): self.n = 0x10
    def __call__(self): self.n += 1; return format(self.n, "x")
NID = Ids()

def v2(x, y): return f"Vector2( {x:.6g}, {y:.6g} )"
def pool(nums, kind="PoolVector2Array"): return f"{kind}( " + ", ".join(f"{n:.6g}" if isinstance(n, float) else str(n) for n in nums) + " )"
P = lambda c: c * CELL

def obj(name, cx, cy, rot=0.0, scale=1.0, layer=100, shadow=True, kind="objects"):
    return {"position": v2(P(cx), P(cy)), "rotation": rot, "scale": v2(scale, scale), "mirror": False,
            "texture": asset(name, kind), "layer": layer, "shadow": shadow, "node_id": NID()}

def wall_with_portals(points, texture, openings, loop):
    """points in cells; openings (kind, x, y) that lie on this wall become portals with wall_distance = segment + t."""
    nid = NID()
    pts = points + ([points[0]] if loop else [])
    portals = []
    for kind, ox, oy, _ in openings:
        for si, ((ax, ay), (bx, by)) in enumerate(zip(pts, pts[1:])):
            L = math.hypot(bx - ax, by - ay)
            t = ((ox - ax) * (bx - ax) + (oy - ay) * (by - ay)) / (L * L)
            px_, py_ = ax + t * (bx - ax), ay + t * (by - ay)
            if 0 < t < 1 and math.hypot(px_ - ox, py_ - oy) < .01:
                tex, width = PORTALS[kind]
                d = ((bx - ax) / L, (by - ay) / L)
                portals.append({"position": v2(P(ox), P(oy)), "rotation": math.atan2(d[1], d[0]), "scale": v2(1, 1),
                                "direction": v2(*d), "texture": asset(tex, "portals"), "radius": CELL * width / 2,
                                "wall_id": int(nid, 16), "wall_distance": si + t, "closed": True, "node_id": NID()})
                break
    flat = [P(c) for p in points for c in p]
    return {"points": pool(flat), "texture": asset(texture, "walls"), "color": "ffffffff", "loop": loop, "type": 1,
            "joint": 1, "normalize_uv": True, "shadow": True, "node_id": nid, "portals": portals}

def pattern(points, texture, rot=0.0):
    return {"position": v2(0, 0), "points": pool([P(c) for p in points for c in p]), "layer": 100, "color": "ffffffff",
            "outline": False, "texture": asset(texture, "tilesets"), "rotation": rot, "node_id": NID()}

def path(points, texture, width, layer=100):
    x0, y0 = points[0]
    rel = [c for (x, y) in points for c in (P(x - x0), P(y - y0))]
    return {"position": v2(P(x0), P(y0)), "rotation": 0, "scale": v2(1, 1), "edit_points": pool(rel), "smoothness": 0,
            "texture": asset(texture, "paths"), "width": width, "layer": layer, "fade_in": False, "fade_out": False,
            "grow": False, "shrink": False, "loop": False, "node_id": NID()}

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
            s = sum(wgt) or 1
            b = [int(round(255 * v / s)) for v in wgt]; b[0] += 255 - sum(b)
            out.extend(b)
    return out

def trees_and_scatter(blocked):
    objs, placed = [], []
    pines = [f"Pine_Green_Shadow_A{i}_5x5.webp" for i in range(1, 13)]
    for _ in range(9000):
        x, y = R.uniform(-1.5, COLS + 1.5), R.uniform(-1.5, ROWS + 1.5)
        s = R.uniform(.75, 1.35); rad = 1.9 * s                    # canopy radius in cells
        if in_clearing(x, y, -.05): continue
        if any(rdist(x, y, *b) < rad * .7 for b in blocked): continue
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
    rooms = build_rooms()
    walls, patterns, objects, paths = [], [], [], []
    floors = {"planks": "Wooden_Flooring_H_Ashen.webp", "earth": "Square_Tiles_B_Dirt.webp"}
    for key, b in BUILDINGS.items():
        _, _, x, y, w, h = next(f for f in FEATURES if f[0] == key)
        walls.append(wall_with_portals([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], b["wall"], b["openings"], True))
        for a, c in b["partitions"]:
            walls.append(wall_with_portals([a, c], b["wall"], b["openings"], False))
    for key, r in rooms:
        if r.floor == "planks":
            patterns.append(pattern([(r.x, r.y), (r.x + r.w, r.y), (r.x + r.w, r.y + r.h), (r.x, r.y + r.h)], floors[r.floor]))
        for it in r.items:
            fw, fh = cells_of(it["asset"])
            # a turned item: the asset's own size turned a quarter; pick the turn that faces into the room
            rot = 0.0 if not it["rot"] else math.pi / 2
            objects.append(obj(it["asset"], it["x"] + it["w"] / 2, it["y"] + it["h"] / 2, rot, it["scale"], 100))
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
    return rooms, walls, patterns, objects, paths

def level(walls, patterns, objects, paths):
    n = COLS * ROWS
    return {"label": "Ground", "environment": {"baked_lighting": True, "ambient_light": "ffffffff"},
            "layers": {"-400": "Below Ground", "-100": "Below Water", "100": "User Layer 1", "200": "User Layer 2",
                       "300": "User Layer 3", "400": "User Layer 4", "700": "Above Walls"},
            "shapes": {"polygons": [], "walls": []},
            "tiles": {"cells": pool([-1] * n, "PoolIntArray"), "colors": ["ffffffff"] * n},
            "patterns": patterns, "walls": walls, "portals": [],
            "cave": {"bitmap": pool([0] * CAVE_LEN, "PoolByteArray"), "ground_color": "ff7f7e71", "wall_color": "ff7f7e71",
                     "entrance_bitmap": pool([0] * CAVE_LEN, "PoolByteArray")},
            "terrain": {"enabled": True, "texture_1": asset("Grass_A_03.webp", "terrain"), "texture_2": asset("Forest_Floor_Needles_A_01.webp", "terrain"),
                        "texture_3": asset("Dirt_A_01.webp", "terrain"), "texture_4": asset("Water_Calm_A_Blue.webp", "terrain"),
                        "splat": pool(terrain_splat(), "PoolByteArray")},
            "water": {}, "materials": {}, "paths": paths, "objects": objects, "lights": []}

# cave bitmap size: ceil((4w+3)(4h+3)/8) matches the 20 x 14 sample (613); checked against other saved maps
CAVE_LEN = math.ceil((4 * COLS + 3) * (4 * ROWS + 3) / 8)


# ------------------------------------------------------------------ WoDX sidecar: what each thing is, for "Adopt this map"
# Positions are in grid cells from the map's top-left corner, so the import scale does not matter.
OPENING_FLAGS = {
    "door": {"kind": "door", "material": "wood", "lock": "none"},
    "double": {"kind": "door", "material": "heavy", "lock": "none"},
    "window": {"kind": "shutter", "material": "wood", "lock": "none"},
}
BARRED_INSIDE = {"door", "double", "window"}     # a bar or peg on the inside, not set
TILE_RULES = [   # (asset prefix, label, flags)
    ("Chest_", "Chest", {"container": True, "kind": "chest", "lock": "cheap", "items": "", "fillPlace": "home"}),
    ("Single_Bed", "Box bed", {"hide": True, "hideKind": "bed", "title": "Under the box bed"}),
    ("Hay_Pile", "Hay pile", {"hide": True, "hideKind": "crawl", "room": 2, "title": "Down in the hay"}),
    ("Brick_Oven", "Oven", {"light": True, "lightKind": "torch", "title": "The bread oven"}),
]
def wodx_sidecar(rooms):
    openings = []
    for key, b in BUILDINGS.items():
        _, name, fx, fy, fw, fh = F[key]
        inside = (fx + fw / 2, fy + fh / 2)
        for n, (kind, ox, oy, along) in enumerate(b["openings"]):
            if kind not in OPENING_FLAGS: continue        # an open doorway has no leaf to set
            half = PORTALS[kind][1] / 2
            seg = [ox - half, oy, ox + half, oy] if along == "h" else [ox, oy - half, ox, oy + half]
            openings.append({"id": f"{key}-{kind}-{n}", "label": f"{name} {kind}", "c": seg, "inside": list(inside),
                             "barInside": kind in BARRED_INSIDE, "flags": dict(OPENING_FLAGS[kind])})
    features = []
    for key, r in rooms:
        for i, it in enumerate(r.items):
            rule = next((t for t in TILE_RULES if it["asset"].startswith(t[0])), None)
            if not rule: continue
            f = {"id": f"{r.name.lower().replace(' ', '-')}-{i}", "label": f"{rule[1]} ({r.name})",
                 "rect": [round(it["x"], 3), round(it["y"], 3), round(it["w"], 3), round(it["h"], 3)], "flags": dict(rule[2])}
            if rule[2].get("light"): f["light"] = {"dim": 3, "bright": 1, "color": "#ff9a3c", "on": True}
            features.append(f)
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
            "cells": [COLS, ROWS], "seed": SEED, "openings": openings, "features": features, "regions": regions}

# ------------------------------------------------------------------ plan view, to check the logic by eye
def plan_svg(rooms, path_out):
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
    for key, r in rooms:
        o.append(f'<rect x="{r.x * s}" y="{r.y * s}" width="{r.w * s}" height="{r.h * s}" fill="#fffdf8" stroke="#333" stroke-width="3"/>')
        for bx, by, bw, bh, why in r.blocked:
            o.append(f'<rect x="{bx * s}" y="{by * s}" width="{bw * s}" height="{bh * s}" fill="{"#f6c" if why == "walkway" else "#fb6"}" opacity=".35"/>')
        for it in r.items:
            o.append(f'<rect x="{it["x"] * s}" y="{it["y"] * s}" width="{it["w"] * s}" height="{it["h"] * s}" fill="#9cc79a" stroke="#2c5a2a"/>')
            short = re.sub(r"(_Wood_Ashen|_Colorable|_Ashen|_Brown|_Gray|_A_AB|_E_Grains|_D_Grain|_Hot)|_[A-Z]\d?_\d+x\d+|_\d+x\d+|\.webp|\.png", "", it["asset"]).replace("_", " ")
            o.append(f'<text x="{(it["x"] + .06) * s}" y="{(it["y"] + .4) * s}" font-size="7">{short[:14]}</text>')
        o.append(f'<text x="{r.x * s + 3}" y="{(r.y + r.h) * s - 4}" font-weight="bold">{r.name}</text>')
    for key, b in BUILDINGS.items():
        for kind, ox, oy, along in b["openings"]:
            wdt = PORTALS[kind][1] * s
            c = {"window": "#39f", "doorway": "#c60", "door": "#a30", "double": "#a30"}[kind]
            if along == "h": o.append(f'<line x1="{ox * s - wdt / 2}" y1="{oy * s}" x2="{ox * s + wdt / 2}" y2="{oy * s}" stroke="{c}" stroke-width="6"/>')
            else: o.append(f'<line x1="{ox * s}" y1="{oy * s - wdt / 2}" x2="{ox * s}" y2="{oy * s + wdt / 2}" stroke="{c}" stroke-width="6"/>')
    o.append("</svg>")
    open(path_out, "w").write("\n".join(o))

if __name__ == "__main__":
    rooms, walls, patterns, objects, paths = build()
    manifest = [{"name": n, "id": i, "version": v, "author": "Forgotten Adventures"} for i, (n, v) in PACKS.items()]
    # editor state copied from a saved Dungeondraft map, so the editor finds every key it expects
    sample = json.load(open(SAMPLE))["header"]
    editor = dict(sample["editor_state"], current_level=0, camera_position=v2(P(COLS / 2), P(ROWS / 2)), camera_zoom=1, trace_image=None)
    doc = {"header": {"creation_build": "1.0.1.0", "creation_date": sample["creation_date"], "uses_default_assets": True,
                      "asset_manifest": manifest, "editor_state": editor},
           "world": {"format": 2, "width": COLS, "height": ROWS, "next_node_id": format(NID.n + 1, "x"),
                     "msi": {"offset_map_size": 512, "max_offset_distance": .2, "cell_size": 64, "seed": format(SEED, "08x")},
                     "grid": {"color": "7f000000"}, "embedded": [], "levels": {"0": level(walls, patterns, objects, paths)}}}
    json.dump(doc, open("kessler-steading.dungeondraft_map", "w"), indent="\t")
    plan_svg(rooms, "plan.svg")
    json.dump(wodx_sidecar(rooms), open("kessler-steading.wodx.json", "w"), indent=1)
    print(f"ok: {len(walls)} walls, {sum(len(w['portals']) for w in walls)} portals, {len(objects)} objects, {len(paths)} paths, cave {CAVE_LEN}")
    for key, r in rooms: print(f"  {r.name}: " + ", ".join(i["asset"].split("_")[0] for i in r.items))
