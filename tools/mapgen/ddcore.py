"""WoDX map generators, the shared part: assets, rooms and their furnishing, the Dungeondraft writer and the WoDX
sidecar pieces. ddfarm.py (the farmstead) and ddtown.py (a village or small town) build on it; building types are
in buildings.py.

Call init(seed, asset list) first: it sets the one random generator every step draws from, so a seed always gives
the same map.
"""
import json, math, random, re

CELL = 256                    # Dungeondraft pixels per grid square
SAMPLE = "/mnt/project-files/maps-ref/scripts/sample-walls-cottage inside.dungeondraft_map"
PACKS = {   # id: (name, version)
    "w4GH4hnv": ("FA_Artificial_A_v2.05", "2.05"),
    "gCzbBqXO": ("FA_Natural_A_v2.04", "2.04"),
    "z2pnS3Kp": ("FA_Natural_Terrains_A_v2.02", "2.02"),
    "H37W5Oj8": ("FA_Artificial_Floors_A_v2.02", "2.02"),
}
R = random.Random(0)
ASSETS = []

def init(seed, asset_list):
    """Set the seed and read the asset list (every asset path in the packs, one a line). Returns the generator."""
    global R, ASSETS
    R = random.Random(seed)
    ASSETS = [l.strip() for l in open(asset_list, encoding="utf-8-sig") if "/textures/" in l]
    return R

def asset(name, kind="objects"):
    hits = [a for a in ASSETS if a.endswith("/" + name) and f"/textures/{kind}/" in a]
    if len(hits) != 1: raise SystemExit(f"asset {name!r}: {len(hits)} matches")
    return "res://packs/" + hits[0]

def cells_of(name):
    m = re.search(r"_(\d+)x(\d+)(?:_\w+)?\.(?:webp|png)$", name)
    return (int(m.group(1)), int(m.group(2))) if m else (1, 1)

def seg_pts(poly, step=.1):
    for (ax, ay), (bx, by) in zip(poly, poly[1:]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for k in range(n + 1): yield ax + (bx - ax) * k / n, ay + (by - ay) * k / n

def rdist(px, py, x, y, w, h):
    return math.hypot(max(x - px, 0, px - (x + w)), max(y - py, 0, py - (y + h)))

def overlaps(a, b, gap=0.0):
    """Two rects (x, y, w, h) closer than gap on both axes."""
    return a[0] < b[0] + b[2] + gap and b[0] < a[0] + a[2] + gap and a[1] < b[1] + b[3] + gap and b[1] < a[1] + a[3] + gap

# openings: asset and width in cells
PORTALS = {"door": ("Door_Wood_Ashen_A1_1x1.webp", 1), "double": ("DoubleDoor_Wood_Ashen_A1_2x1.webp", 2),
           "doorway": ("Doorway_Wood_Ashen_A.png", 1), "window": ("Window_Wood_Ashen_A1_1x1.webp", 1),
           "arch": ("DoubleDoorway_Wood_Ashen_A_Wide.png", 2)}
LEAFLESS = {"doorway", "arch"}

# What "beside:<tag>" and "hearth" look for among the items already placed in the room.
BESIDE = {"bed": "Bed", "table": "Table", "anvil": "Anvil", "altar": "Altar", "bar": "Bar_", "desk": "Desk"}
HEARTH = re.compile(r"Oven|Cooking_Pit|Brazier")

# ------------------------------------------------------------------ rooms and their furnishing
class Room:
    """A room in map cells. openings: (kind, x, y, along) in map cells; furnish: [(asset, rule, count[, scale])].
    Rules: wall[:sides], corner[:sides], end[:sides] (touches those walls, never turned; endt: always turned),
    window, centre,
    hearth (by an oven, cooking pit or brazier), beside:<tag> (see BESIDE)."""
    def __init__(self, name, x, y, w, h, floor, openings, furnish=()):
        self.name, self.x, self.y, self.w, self.h, self.floor = name, x, y, w, h, floor
        self.furnish_list = list(furnish)
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
        kind, _, arg = rule.partition(":")
        turns = ((fw, fh, 0),) if kind == "end" else ((fh, fw, 1),) if kind == "endt" else ((fw, fh, 0), (fh, fw, 1))
        for (w, h, rot) in turns:
            xs = {round(self.ix + k * .25, 4) for k in range(int((self.iw - w) / .25) + 1)} | {self.ix, round(self.ix + self.iw - w, 4)}
            ys = {round(self.iy + k * .25, 4) for k in range(int((self.ih - h) / .25) + 1)} | {self.iy, round(self.iy + self.ih - h, 4)}
            for bx, by, bw, bh, *_ in edges:
                xs |= {round(bx + bw, 4), round(bx - w, 4)}; ys |= {round(by + bh, 4), round(by - h, 4)}
            for x in xs:
                for y in ys:
                    if not self.fits((x, y, w, h)): continue
                    t = self.touching(x, y, w, h)
                    if kind in ("wall", "corner", "window", "end", "endt") and not (all(t[c] for c in arg) if arg else any(t.values())): continue
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
        if kind in ("wall", "end", "endt"):                        # pack along the wall from a corner or a neighbour
            s += 10 + 1.5 * (walls >= 2)
            s += 1.5 * any(abs(x - (i["x"] + i["w"])) < .02 or abs(x + w - i["x"]) < .02 or abs(y - (i["y"] + i["h"])) < .02 or abs(y + h - i["y"]) < .02 for i in self.items)
        if kind == "corner": s += 6 * (walls >= 2) + 3 * (walls == 1)
        if kind == "centre": s -= abs(cx - (self.ix + self.iw / 2)) + abs(cy - (self.iy + self.ih / 2))
        if kind == "window" and self.windows:
            s += 8 * (walls >= 1) - min(math.hypot(cx - wx, cy - wy) for wx, wy, _ in self.windows)
        if kind in ("hearth", "beside"):
            ref = [i for i in self.items if (HEARTH.search(i["asset"]) if kind == "hearth" else BESIDE[arg] in i["asset"])]
            if ref:
                d = min(rdist(cx, cy, i["x"], i["y"], i["w"], i["h"]) for i in ref)
                s += 10 - 4 * d + 2 * (walls >= 1)
                if arg == "table" and w != h: s += 4 * any((i["w"] > i["h"]) == (w > h) for i in ref)
        # a long item lies along the wall it touches
        if walls == 1 and max(w, h) > min(w, h) and ((touch["N"] or touch["S"]) != (w > h)) and kind not in ("end", "endt"): s -= 3
        return s

    def furnish(self, tries=80):
        """Greedy placement by rule; if an item cannot be placed, start the room again with more shuffle.
        Only when every try fails does the script stop."""
        for t in range(tries):
            self.items, self.noise = [], .1 + t * .08
            if self.try_furnish(): return
        raise SystemExit(f"cannot furnish {self.name}: {self.last_fail} has no room after {tries} tries")

    def try_furnish(self):
        for entry in self.furnish_list:
            name, rule, count = entry[:3]; sc = entry[3] if len(entry) > 3 else 1.0
            fw, fh = (round(v * sc, 3) for v in cells_of(name))
            for _ in range(count):
                c = self.candidates(fw, fh, rule)
                if not c: self.last_fail = name; return False
                _, x, y, w, h, rot = c[0]
                self.items.append({"asset": name, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": sc})
        return True

# ------------------------------------------------------------------ Dungeondraft writer
class Ids:
    def __init__(self): self.n = 0x10
    def __call__(self): self.n += 1; return format(self.n, "x")
NID = Ids()

def v2(x, y): return f"Vector2( {x:.6g}, {y:.6g} )"
def pool(nums, kind="PoolVector2Array"): return f"{kind}( " + ", ".join(f"{n:.6g}" if isinstance(n, float) else str(n) for n in nums) + " )"
P = lambda c: c * CELL
ORIGIN = [0, 0]     # the top-left corner, in map cells, of the part of a map being written (a town split in parts)

def at(x, y):
    """A point in map cells as Dungeondraft pixels, from the part's own corner."""
    ox, oy = ORIGIN
    return (P(x - ox), P(y - oy)) if (ox or oy) else (P(x), P(y))

def set_origin(x=0, y=0):
    ORIGIN[0], ORIGIN[1] = x, y

def obj(name, cx, cy, rot=0.0, scale=1.0, layer=100, shadow=True, kind="objects"):
    return {"position": v2(*at(cx, cy)), "rotation": rot, "scale": v2(scale, scale), "mirror": False,
            "texture": asset(name, kind), "layer": layer, "shadow": shadow, "node_id": NID()}

def wall_with_portals(points, texture, openings, loop):
    """points in cells; openings (kind, x, y) that lie on this wall become portals with wall_distance = segment + t."""
    nid = NID()
    pts = points + ([points[0]] if loop else [])
    portals = []
    for kind, ox, oy, _ in openings:
        for si, ((ax, ay), (bx, by)) in enumerate(zip(pts, pts[1:])):
            L = math.hypot(bx - ax, by - ay)
            if L < 1e-9: continue
            t = ((ox - ax) * (bx - ax) + (oy - ay) * (by - ay)) / (L * L)
            px_, py_ = ax + t * (bx - ax), ay + t * (by - ay)
            if 0 < t < 1 and math.hypot(px_ - ox, py_ - oy) < .01:
                tex, width = PORTALS[kind]
                d = ((bx - ax) / L, (by - ay) / L)
                portals.append({"position": v2(*at(ox, oy)), "rotation": math.atan2(d[1], d[0]), "scale": v2(1, 1),
                                "direction": v2(*d), "texture": asset(tex, "portals"), "radius": CELL * width / 2,
                                "wall_id": int(nid, 16), "wall_distance": si + t, "closed": True, "node_id": NID()})
                break
    flat = [c for p in points for c in at(*p)]
    return {"points": pool(flat), "texture": asset(texture, "walls"), "color": "ffffffff", "loop": loop, "type": 1,
            "joint": 1, "normalize_uv": True, "shadow": True, "node_id": nid, "portals": portals}

def pattern(points, texture, rot=0.0):
    return {"position": v2(0, 0), "points": pool([c for p in points for c in at(*p)]), "layer": 100, "color": "ffffffff",
            "outline": False, "texture": asset(texture, "tilesets"), "rotation": rot, "node_id": NID()}

def path(points, texture, width, layer=100):
    x0, y0 = points[0]
    rel = [c for (x, y) in points for c in (P(x - x0), P(y - y0))]
    return {"position": v2(*at(x0, y0)), "rotation": 0, "scale": v2(1, 1), "edit_points": pool(rel), "smoothness": 0,
            "texture": asset(texture, "paths"), "width": width, "layer": layer, "fade_in": False, "fade_out": False,
            "grow": False, "shrink": False, "loop": False, "node_id": NID()}

def cave_len(cols, rows):
    """Cave bitmap size: ceil((4w+3)(4h+3)/8) matches the 20 x 14 sample (613); checked against other saved maps."""
    return math.ceil((4 * cols + 3) * (4 * rows + 3) / 8)

def level(cols, rows, walls, patterns, objects, paths, terrain, splat, ambient="ffffffff"):
    """terrain: the four terrain texture names, in splat order."""
    n = cols * rows
    cl = cave_len(cols, rows)
    return {"label": "Ground", "environment": {"baked_lighting": True, "ambient_light": ambient},
            "layers": {"-400": "Below Ground", "-100": "Below Water", "100": "User Layer 1", "200": "User Layer 2",
                       "300": "User Layer 3", "400": "User Layer 4", "700": "Above Walls"},
            "shapes": {"polygons": [], "walls": []},
            "tiles": {"cells": pool([-1] * n, "PoolIntArray"), "colors": ["ffffffff"] * n},
            "patterns": patterns, "walls": walls, "portals": [],
            "cave": {"bitmap": pool([0] * cl, "PoolByteArray"), "ground_color": "ff7f7e71", "wall_color": "ff7f7e71",
                     "entrance_bitmap": pool([0] * cl, "PoolByteArray")},
            "terrain": {"enabled": True, **{f"texture_{i + 1}": asset(t, "terrain") for i, t in enumerate(terrain)},
                        "splat": pool(splat, "PoolByteArray")},
            "water": {}, "materials": {}, "paths": paths, "objects": objects, "lights": []}

def write_map(fname, cols, rows, seed, lvl):
    manifest = [{"name": n, "id": i, "version": v, "author": "Forgotten Adventures"} for i, (n, v) in PACKS.items()]
    # editor state copied from a saved Dungeondraft map, so the editor finds every key it expects
    sample = json.load(open(SAMPLE))["header"]
    editor = dict(sample["editor_state"], current_level=0, camera_position=v2(P(cols / 2), P(rows / 2)), camera_zoom=1, trace_image=None)
    doc = {"header": {"creation_build": "1.0.1.0", "creation_date": sample["creation_date"], "uses_default_assets": True,
                      "asset_manifest": manifest, "editor_state": editor},
           "world": {"format": 2, "width": cols, "height": rows, "next_node_id": format(NID.n + 1, "x"),
                     "msi": {"offset_map_size": 512, "max_offset_distance": .2, "cell_size": 64, "seed": format(seed, "08x")},
                     "grid": {"color": "7f000000"}, "embedded": [], "levels": {"0": lvl}}}
    json.dump(doc, open(fname, "w"), indent="\t")

def splat_byte(wgt):
    """Four weights to four bytes that add up to 255."""
    s = sum(wgt) or 1
    b = [int(round(255 * v / s)) for v in wgt]; b[0] += 255 - sum(b)
    return b

# ------------------------------------------------------------------ WoDX sidecar pieces
# Positions are in grid cells from the map's top-left corner, so the import scale does not matter.
OPENING_FLAGS = {
    "door": {"kind": "door", "material": "wood", "lock": "none"},
    "double": {"kind": "door", "material": "heavy", "lock": "none"},
    "window": {"kind": "shutter", "material": "wood", "lock": "none"},
}
BARRED_INSIDE = {"door", "double", "window"}     # a bar or peg on the inside, not set
TILE_RULES = [   # (asset prefix, label, flags); a container's fill place comes from its building
    ("Chest_", "Chest", {"container": True, "kind": "chest", "lock": "cheap", "items": "", "fillPlace": "home"}),
    ("Single_Bed", "Box bed", {"hide": True, "hideKind": "bed", "title": "Under the box bed"}),
    ("Double_Bed", "Bed", {"hide": True, "hideKind": "bed", "title": "Under the bed"}),
    ("Hay_Pile", "Hay pile", {"hide": True, "hideKind": "crawl", "room": 2, "title": "Down in the hay"}),
    ("Brick_Oven", "Oven", {"light": True, "lightKind": "torch", "title": "The bread oven"}),
    ("Brick_Cooking_Pit", "Hearth", {"light": True, "lightKind": "torch", "title": "The hearth"}),
    ("Brazier_", "Brazier", {"light": True, "lightKind": "torch", "title": "The brazier"}),
    ("Box_Crate", "Crates", {"hide": True, "hideKind": "crawl", "room": 1, "title": "Behind the crates"}),
]

def opening_entries(key, name, openings, inside):
    """Sidecar openings for one building. openings: (kind, x, y, along) in map cells; inside: a point inside."""
    out = []
    for n, (kind, ox, oy, along) in enumerate(openings):
        if kind not in OPENING_FLAGS: continue        # an open doorway has no leaf to set
        half = PORTALS[kind][1] / 2
        seg = [ox - half, oy, ox + half, oy] if along == "h" else [ox, oy - half, ox, oy + half]
        out.append({"id": f"{key}-{kind}-{n}", "label": f"{name} {kind}", "c": seg, "inside": list(inside),
                    "barInside": kind in BARRED_INSIDE, "flags": dict(OPENING_FLAGS[kind])})
    return out

def feature_entries(prefix, room, fill="home"):
    """Sidecar features (chests, beds, hay, ovens...) for one furnished room. prefix: an id prefix, "" for none."""
    out = []
    for i, it in enumerate(room.items):
        rule = next((t for t in TILE_RULES if it["asset"].startswith(t[0])), None)
        if not rule: continue
        flags = dict(rule[2])
        if flags.get("container"): flags["fillPlace"] = fill
        f = {"id": f"{prefix}{room.name.lower().replace(' ', '-').replace(chr(39), '')}-{i}", "label": f"{rule[1]} ({room.name})",
             "rect": [round(it["x"], 3), round(it["y"], 3), round(it["w"], 3), round(it["h"], 3)], "flags": flags}
        if flags.get("light"): f["light"] = {"dim": 3, "bright": 1, "color": "#ff9a3c", "on": True}
        out.append(f)
    return out

# ------------------------------------------------------------------ plan view, to check the logic by eye
OPENING_COLOURS = {"window": "#39f", "doorway": "#c60", "arch": "#c60", "door": "#a30", "double": "#a30"}

def svg_rooms(rooms, s):
    o = []
    for r in rooms:
        o.append(f'<rect x="{r.x * s}" y="{r.y * s}" width="{r.w * s}" height="{r.h * s}" fill="#fffdf8" stroke="#333" stroke-width="3"/>')
        for bx, by, bw, bh, why in r.blocked:
            o.append(f'<rect x="{bx * s}" y="{by * s}" width="{bw * s}" height="{bh * s}" fill="{"#f6c" if why == "walkway" else "#fb6"}" opacity=".35"/>')
        for it in r.items:
            o.append(f'<rect x="{it["x"] * s}" y="{it["y"] * s}" width="{it["w"] * s}" height="{it["h"] * s}" fill="#9cc79a" stroke="#2c5a2a"/>')
            short = re.sub(r"(_Wood_Ashen|_Colorable|_Ashen|_Brown|_Gray|_A_AB|_E_Grains|_D_Grain|_Hot)|_[A-Z]\d?_\d+x\d+|_\d+x\d+|\.webp|\.png", "", it["asset"]).replace("_", " ")
            o.append(f'<text x="{(it["x"] + .06) * s}" y="{(it["y"] + .4) * s}" font-size="7">{short[:14]}</text>')
        o.append(f'<text x="{r.x * s + 3}" y="{(r.y + r.h) * s - 4}" font-weight="bold">{r.name}</text>')
    return o

def svg_openings(openings, s):
    o = []
    for kind, ox, oy, along in openings:
        wdt = PORTALS[kind][1] * s
        c = OPENING_COLOURS[kind]
        if along == "h": o.append(f'<line x1="{ox * s - wdt / 2}" y1="{oy * s}" x2="{ox * s + wdt / 2}" y2="{oy * s}" stroke="{c}" stroke-width="6"/>')
        else: o.append(f'<line x1="{ox * s}" y1="{oy * s - wdt / 2}" x2="{ox * s}" y2="{oy * s + wdt / 2}" stroke="{c}" stroke-width="6"/>')
    return o
