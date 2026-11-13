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
    ASSETS = list(dict.fromkeys(l.strip() for f in str(asset_list).split(",") if f for l in open(f, encoding="utf-8-sig") if "/textures/" in l))
    USED.clear()
    LIGHTS.clear()
    return R

def asset(name, kind="objects"):
    if "/textures/" in name:                       # a full path (the furnishing catalogue gives these)
        USED.add(name.split("/")[0])
        return "res://packs/" + name
    hits = [a for a in ASSETS if a.endswith("/" + name) and f"/textures/{kind}/" in a]
    if len(hits) > 1 and len({h.split("/")[0] for h in hits}) > 1:   # the same file in two packs: Forgotten Adventures first
        fa = [h for h in hits if h.split("/")[0] in PACKS]
        hits = fa[:1] if len(fa) == 1 else hits
    if len(hits) != 1: raise SystemExit(f"asset {name!r}: {len(hits)} matches")
    USED.add(hits[0].split("/")[0])
    return "res://packs/" + hits[0]


def pack_info(pid):
    """(name, version, author) of a pack: Forgotten Adventures' from PACKS, the rest from the PC's pack table (the
    newest copy where Ben has several)."""
    if pid in PACKS: return PACKS[pid] + ("Forgotten Adventures",)
    try:
        rows = [l.rstrip("\n").split("\t") for l in open(PACK_TABLE, encoding="utf-8-sig")][1:]
    except OSError: rows = []
    def ver(v):
        try: return tuple(int(x) for x in re.findall(r"\d+", v))
        except ValueError: return ()
    mine = sorted((r for r in rows if r and r[0] == pid), key=lambda r: ver(r[2] if len(r) > 2 else ""))
    if not mine: return (pid, "1", "")
    r = mine[-1] + ["", "", ""]
    return (r[1], r[2] or "1", r[3])

SIZES = {}                    # cells of assets whose names carry no size (eratypes.py fills it)
USED = set()                  # pack ids the map refers to, for its asset manifest
LIGHTS = []                   # Dungeondraft lights made with the dressing since the last level(); level() takes them
PACK_TABLE = "/mnt/project-files/dd-pack-ids.tsv"   # id, name, version, author, file (read off each pack on the PC)

def cells_of(name):
    if name in SIZES: return SIZES[name]
    if name.rsplit("/", 1)[-1] in SIZES: return SIZES[name.rsplit("/", 1)[-1]]      # a name given with its folder
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
BESIDE = {"bed": "Bed", "table": "Table", "anvil": "Anvil", "altar": "Altar", "bar": "Bar_", "desk": "Desk", "couch": "Couch", "stove": "Stove", "counter": "Cabinet"}
HEARTH = re.compile(r"Oven|Cooking_Pit|Brazier")

# ------------------------------------------------------------------ rooms and their furnishing
class Room:
    """A room in map cells. openings: (kind, x, y, along) in map cells; furnish: [(asset, rule, count[, scale])].
    Rules: wall[:sides], corner[:sides], end[:sides] (touches those walls, never turned; endt: always turned),
    window, centre, at:x:y[:1] (that spot, from the room's corner, turned if :1; left empty if it will not fit),
    hearth (by an oven, cooking pit or brazier), beside:<tag> (see BESIDE)."""
    def __init__(self, name, x, y, w, h, floor, openings, furnish=()):
        self.name, self.x, self.y, self.w, self.h, self.floor = name, x, y, w, h, floor
        self.furnish_list = list(furnish)
        self.ctx = None               # a furnishing context (furnishing.context_for): palette, role, wealth...
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

    def fits(self, r, open_floor=True):
        x, y, w, h = r
        if x < self.ix - 1e-6 or y < self.iy - 1e-6 or x + w > self.ix + self.iw + 1e-6 or y + h > self.iy + self.ih + 1e-6: return False
        blocked = self.blocked if open_floor else [b for b in self.blocked if b[4] == "door clear zone"]   # fixed spots keep only the doorways clear
        for bx, by, bw, bh, *_ in blocked + [(i["x"], i["y"], i["w"], i["h"]) for i in self.items]:
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
            ref = [i for i in self.items if (HEARTH.search(i["asset"]) if kind == "hearth" else BESIDE[arg].lower() in i["asset"].lower())]
            if ref:
                d = min(rdist(cx, cy, i["x"], i["y"], i["w"], i["h"]) for i in ref)
                s += 10 - 4 * d + 2 * (walls >= 1)
                if arg == "table" and w != h: s += 4 * any((i["w"] > i["h"]) == (w > h) for i in ref)
        # a long item lies along the wall it touches
        if walls == 1 and max(w, h) > min(w, h) and ((touch["N"] or touch["S"]) != (w > h)) and kind not in ("end", "endt"): s -= 3
        return s

    def furnish(self, tries=80):
        """Greedy placement by rule; if an item cannot be placed, start the room again with more shuffle.
        Only when every try fails does the script stop. Then the room is dressed (see dress())."""
        for t in range(tries):
            self.items, self.noise = [], .1 + t * .08
            if self.try_furnish():
                dress(self)
                orient(self)
                return
        raise SystemExit(f"cannot furnish {self.name}: {self.last_fail} has no room after {tries} tries")

    def try_furnish(self):
        for entry in self.furnish_list:
            name, rule, count = entry[:3]; sc = entry[3] if len(entry) > 3 else 1.0
            fw, fh = (round(v * sc, 3) for v in cells_of(name))
            if rule.startswith("at:"):                         # a fixed spot: aisles of shelves, rows of seats
                _, ax, ay, *turn = rule.split(":")
                rot = int(turn[0]) if turn else 0
                for shrink in (1, .8, .65):                    # as given, else a little smaller about its middle
                    w, h = ((fh, fw) if rot else (fw, fh))
                    w, h = w * shrink, h * shrink
                    x = self.x + float(ax) + (1 - shrink) * w / shrink / 2
                    y = self.y + float(ay) + (1 - shrink) * h / shrink / 2
                    x = min(max(x, self.ix), self.ix + self.iw - w); y = min(max(y, self.iy), self.iy + self.ih - h)
                    if w <= self.iw and h <= self.ih and self.fits((x, y, w, h), open_floor=False):
                        self.items.append({"asset": name, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": round(sc * shrink, 3)})
                        break
                continue                                       # a spot that will not take it is left empty
            for _ in range(count):
                c = self.candidates(fw, fh, rule)
                if not c: self.last_fail = name; return False
                _, x, y, w, h, rot = c[0]
                self.items.append({"asset": name, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": sc})
        return True

# ------------------------------------------------------------------ dressing: what makes a room look lived in
# After the furniture a room's type asks for, each room gets a rug, things on its tables, pieces along its walls and
# lights, by what the room is for. Best effort: a piece with no room is left out. Dressing has its own random
# generator (from the room's name and place), so it never moves the furniture or the WoDX file, and it is kept apart
# (room.dressing, room.lights) from room.items, which the WoDX file reads.
OUTDOOR = ("Yard", "Court", "Garden", "Open to", "Arcade", "Gateway", "Porch", "Loading", "Pen", "Paddock", "Lot", "Field")
STORE = ("Store", "Cellar", "Barn", "Byre", "Stable", "Granary", "Loft", "Shed", "Vault", "Warehouse", "Larder", "Pantry",
         "Crypt", "Morgue", "Coop", "Garage", "Workshop", "Smithy", "Forge", "Mill", "Press", "Bay", "Lock-up")
KITCHEN = ("Kitchen", "Bakehouse", "Bakery", "Brewhouse", "Scullery", "Cook")
STUDY = ("Study", "Office", "Counting", "Library", "Clerk", "Chancery", "Archive", "School", "Scriptorium", "Desk")
SLEEP = ("Bed", "Chamber", "Guest", "Dormitory", "Ward", "Cell", "Sleeping", "Solar")
FA_RUGS = [f"Rug_Rectangle_{c}{n}_Colorable_3x2.webp" for c in "CDEFGH" for n in range(1, 7)] + ["Rug_Rectangle_A_Colorable_3x2.webp"]
FA_FURS = [f"Rug_Fur_A_0{n}_2x2.webp" for n in range(1, 7)]
FA_DRESS = {
    "table": ["Candle_Colorable_A_1x1.png", "Bottle_Glass_A_Colorable_1x1.png", "Book_A_Colorable_1x1.png", "Candelabra_Metal_Grey_Colorable_A_1x1.png"],
    "kitchen": ["Bread_Loaf_A_1x1.webp", "Cheese_Wheel_A1_1x1.webp", "Bottle_Glass_A_Colorable_1x1.png", "Basket_Lid_Wood_Ashen_A_1x1.webp"],
    "study": ["Paper_White_Sheet_A_1x1.webp", "Quill_A_Black_1x1.webp", "Book_B_Colorable_1x1.png", "Candle_Colorable_A_1x1.png"],
    "wall": ["Bookshelf_Wood_Ashen_A_2x1.webp", "Cupboard_Wood_Ashen_A_2x1.webp", "Bench_Wood_Ashen_A1_2x1.webp", "Mirror_Wood_Ashen_B_2x1.webp"],
    "wall_study": ["Bookshelf_Wood_Ashen_A_2x1.webp", "Bookshelf_Wood_Ashen_B_2x1.webp", "Desk_Rectangle_Wood_Ashen_A1_2x1.webp"],
    "wall_sleep": ["Cupboard_Wood_Ashen_B_2x1.webp", "Mirror_Wood_Ashen_A_1x1.webp", "Armchair_Wood_Ashen_Fabric_Colorable_A_1x1.png"],
    "wall_store": ["Box_Crate_Wood_Ashen_A1_1x1.webp", "Barrel_Wood_Ashen_A_1x1.webp", "Sack_Brown_E_Grains_1x1.webp", "Basket_Lid_Wood_Ashen_A_1x1.webp"],
    "corner": ["Plant_Pot_Clay_Brown_A_1x1.webp", "Armchair_Wood_Ashen_Fabric_Colorable_B_1x1.png", "Basket_Lid_Wood_Ashen_A_1x1.webp"],
    "sconce": "Sconce_Red_A_Lit_1x1.webp", "chandelier": "Chandelier_Wood_Ashen_A_Lit_2x2.webp",
}
MOD_DRESS = {
    "table": ["MugFull.png", "SFPlate.png"], "kitchen": ["MugFull.png", "SFPlate.png"], "study": ["MugFull.png"],
    "wall": ["Couch01.png", "Hutch01.png", "TableEndA01.png"], "wall_study": ["DeskS01.png", "Hutch01.png"],
    "wall_sleep": ["TableEndB01.png", "Hutch01.png"], "wall_store": ["Box_Crate_Wood_Ashen_A1_1x1.webp"],
    "corner": ["Plant_Pot_Clay_Brown_A_1x1.webp", "TableEndC01.png"], "centre": ["TableCoffeeA01.png"],
}
TABLES = re.compile(r"Table|Desk|Counter|Bench_|Workbench", re.I)

def have(name): return any(a.endswith("/" + name) for a in ASSETS)

def kind_of(room):
    n = room.name
    has = lambda words: any(re.search(rf"\b{re.escape(w)}", n) for w in words)
    if has(OUTDOOR): return "outdoor"
    if has(KITCHEN): return "kitchen"
    if has(STORE): return "store"
    if has(STUDY): return "study"
    if has(SLEEP) and not re.search(r"\bCellar", n): return "sleep"
    return "living"

def dress(room):
    global R
    if getattr(room, "ctx", None):                 # furnished by purpose, palette and room value (furnishing.py)
        import furnishing
        furnishing.fill_room(room)
        return
    room.dressing, room.lights = [], []
    kind = kind_of(room)
    if room.iw < 1.5 or room.ih < 1.5: return
    keep, R = R, random.Random(f"{room.name}|{room.x:.2f}|{room.y:.2f}")
    if kind == "outdoor":                                   # a court or yard: plants in its corners, a bench on a wall
        try:
            if re.search(r"\b(Court|Garden)", room.name):
                n0 = len(room.items)
                for a, rule in (("Potted_Plant_C_2x2.webp", "corner"), ("Potted_Plant_D_2x2.webp", "corner"), ("Bench_Wood_Ashen_A1_2x1.webp", "wall")):
                    if not have(a): continue
                    fw, fh = cells_of(a)
                    c = room.candidates(fw * .7, fh * .7, rule) if a.startswith("Potted") else room.candidates(fw, fh, rule)
                    if c:
                        _, x, y, w, h, rot = c[0]
                        room.items.append({"asset": a, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": .7 if a.startswith("Potted") else 1.0})
                room.dressing += [dict(i, layer=100) for i in room.items[n0:]]
                del room.items[n0:]
        finally:
            R = keep
        return
    modern = any(re.fullmatch(r"[A-Za-z]+\d+\.png", i["asset"]) for i in room.items)
    D = MOD_DRESS if modern else FA_DRESS
    n0 = len(room.items)
    area = room.iw * room.ih
    try:
        # pieces along the walls and in the corners, one for every 4 squares or so
        wall = D.get({"study": "wall_study", "sleep": "wall_sleep", "store": "wall_store"}.get(kind, "wall"), [])
        for k in range(min(10, int(area // 4))):
            choice = [a for a in (wall if k % 3 or kind == "store" else D.get("corner", [])) if have(a)]
            if not choice: continue
            a = R.choice(choice)
            fw, fh = cells_of(a)
            c = room.candidates(fw, fh, "corner" if k % 3 == 0 else "wall")
            if c:
                _, x, y, w, h, rot = c[0]
                room.items.append({"asset": a, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": 1.0})
        if modern and kind == "living" and area >= 12:
            for a in (x for x in D.get("centre", []) if have(x)):
                fw, fh = cells_of(a); c = room.candidates(fw, fh, "corner")
                if c:
                    _, x, y, w, h, rot = c[0]
                    room.items.append({"asset": a, "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": 1.0})
        placed = room.items[n0:]
        del room.items[n0:]
        for it in placed: room.dressing.append(dict(it, layer=100))
        # a rug under the middle of the room (the open floor), below the furniture
        if kind in ("living", "study", "sleep") and room.iw >= 2.4 and room.ih >= 2.4:
            rugs = [r for r in (FA_FURS if kind == "sleep" and area < 16 else FA_RUGS) if have(r)]
            if rugs:
                a = R.choice(rugs); fw, fh = cells_of(a)
                long_w = room.iw >= room.ih
                rw, rh = (fw, fh) if long_w or fw == fh else (fh, fw)
                sc = min((room.iw - 1.2) / rw, (room.ih - 1.2) / rh, 1.8)
                if sc >= .6:
                    w, h = rw * sc, rh * sc
                    room.dressing.append({"asset": a, "x": room.ix + (room.iw - w) / 2, "y": room.iy + (room.ih - h) / 2,
                                          "w": w, "h": h, "rot": 0 if (long_w or fw == fh) else 1, "scale": round(sc, 3), "layer": 50})
        # things on each table or desk
        pool = [a for a in D.get(kind if kind in ("kitchen", "study") else "table", []) if have(a)]
        for t in [i for i in room.items + room.dressing if TABLES.search(i["asset"])]:
            if not pool: break
            for k in range(min(3, max(1, int(t["w"] * t["h"])))):
                a = R.choice(pool)
                room.dressing.append({"asset": a, "x": t["x"] + R.uniform(.1, max(.1, t["w"] - .5)), "y": t["y"] + R.uniform(.1, max(.1, t["h"] - .5)),
                                      "w": .4, "h": .4, "rot": 0, "scale": .45, "layer": 150, "spin": R.uniform(0, 6.28)})
        # light: a lit sconce on a wall in every room, a chandelier in a big one; the spots also become Dungeondraft lights
        if not modern and kind != "store":
            if area >= 30 and have(D["chandelier"]):
                cx, cy = room.ix + room.iw / 2, room.iy + room.ih / 2
                room.dressing.append({"asset": D["chandelier"], "x": cx - 1, "y": cy - 1, "w": 2, "h": 2, "rot": 0, "scale": 1.0, "layer": 400})
                room.lights.append((cx, cy, 7))
            if have(D["sconce"]):
                side = R.choice("NSEW")
                cx = room.ix + room.iw / 2 if side in "NS" else (room.ix + .25 if side == "W" else room.ix + room.iw - .25)
                cy = room.iy + room.ih / 2 if side in "EW" else (room.iy + .25 if side == "N" else room.iy + room.ih - .25)
                room.dressing.append({"asset": D["sconce"], "x": cx - .3, "y": cy - .3, "w": .6, "h": .6, "rot": 0, "scale": .6, "layer": 400})
                room.lights.append((cx, cy, 4))
        elif kind != "store" or area >= 9:
            room.lights.append((room.ix + room.iw / 2, room.iy + room.ih / 2, 5))
    finally:
        R = keep

# ------------------------------------------------------------------ which way things face
# Forgotten Adventures draws furniture facing down the page (south): a bed's head, a shelf's back, a chair's back
# and an oven's back at the top. So a piece against a wall is turned to put its back to that wall, and a seat is
# turned to face its table (else the middle of the room). The turn keeps the piece's footprint: a piece laid along
# a side wall (rot) is turned a quarter either way, one along the top or bottom wall none or a half.
SEATS = re.compile(r"Chair|Stool|Armchair|Couch|Sofa|Throne", re.I)
INSET = re.compile(r"Brick_Oven_.*_2x2")     # drawn 2 squares wide and 1 deep in a 2 by 2 square
NO_FACE = re.compile(r"Table|Desk|Counter|Rug_|Stairs|Stair|Barrel|Keg|Sack|Crate|Basket|Plant|Pot_|Tree|Bush|Hay|Bucket|Firewood|Lift|StairUp", re.I)

def drawn(it):
    """(asset, scale) to draw a room item with: the palette's piece when furnishing chose one, else its own."""
    return it.get("draw", it["asset"]), it.get("draw_scale", it["scale"])

def centre(it):
    """Where a piece's picture goes: the middle of its square, moved to its wall when the picture is shallower."""
    nx, ny = it.get("nudge", (0, 0))
    return it["x"] + it["w"] / 2 + nx, it["y"] + it["h"] / 2 + ny

def facing_angle(dx, dy):
    """The turn that points a south-facing piece along (dx, dy), on screen (y down, turns clockwise)."""
    return math.atan2(-dx, dy)

def orient(room):
    tables = [i for i in room.items + getattr(room, "dressing", []) if TABLES.search(i["asset"]) and not SEATS.search(i["asset"])]
    mx, my = room.ix + room.iw / 2, room.iy + room.ih / 2
    for it in room.items + getattr(room, "dressing", []):
        if it.get("layer", 100) != 100 or "spin" in it: continue
        it.pop("nudge", None)                                        # worked out again: the picture may have changed
        a = it["asset"]
        cx, cy = it["x"] + it["w"] / 2, it["y"] + it["h"] / 2
        if SEATS.search(a) and it["w"] == it["h"] or re.search(r"Chair|Stool", a, re.I):
            near = min(tables, key=lambda t: rdist(cx, cy, t["x"], t["y"], t["w"], t["h"]), default=None)
            if near and rdist(cx, cy, near["x"], near["y"], near["w"], near["h"]) < 1.5:
                tx = min(max(cx, near["x"]), near["x"] + near["w"]); ty = min(max(cy, near["y"]), near["y"] + near["h"])
                it["angle"] = facing_angle(tx - cx, ty - cy)
            else:
                it["angle"] = facing_angle(mx - cx, my - cy)
            # square to the room: a quarter turn at a time (a long seat also keeps its footprint)
            it["angle"] = snap(it["angle"], it["rot"]) if it["w"] != it["h"] else round(it["angle"] / (math.pi / 2)) * (math.pi / 2)
            continue
        if NO_FACE.search(a): continue
        t = room.touching(it["x"], it["y"], it["w"], it["h"], .06)
        long_h = it["w"] >= it["h"]                                  # lies along the top or bottom wall
        order = (("N", "S", "W", "E") if long_h else ("W", "E", "N", "S")) if it["w"] != it["h"] else ("N", "S", "W", "E")
        # the first wall it stands against that it can put its back to without changing its footprint
        side = next((d for d in order if t[d] and (it["w"] == it["h"] or (d in "NS") == (not it["rot"]))), None)
        if side:
            it["angle"] = {"N": 0.0, "S": math.pi, "W": -math.pi / 2, "E": math.pi / 2}[side]
            if INSET.search(drawn(it)[0]):                           # the picture is half its square deep: move it to the wall
                it["nudge"] = {"N": (0, -.5), "S": (0, .5), "W": (-.5, 0), "E": (.5, 0)}[side]

def snap(angle, rot):
    """The nearest turn that keeps a long piece's footprint (rot: laid along a side wall)."""
    opts = (-math.pi / 2, math.pi / 2) if rot else (0.0, math.pi)
    return min(opts, key=lambda o: abs(math.atan2(math.sin(angle - o), math.cos(angle - o))))

def dressing_objects(room, under):
    """Dungeondraft objects for a room's dressing. under=True: the rugs, to write before the furniture on the same
    layer (Dungeondraft draws later objects on top); under=False: pieces, then clutter (layer 300) and lamps (400)."""
    out = []
    for it in sorted(getattr(room, "dressing", []), key=lambda i: i.get("layer", 100)):
        lay = it.get("layer", 100)
        if (lay < 100) != under: continue
        rot = it.get("spin", it.get("angle", math.pi / 2 if it["rot"] else 0.0))
        out.append(obj(it["asset"], *centre(it), rot, it["scale"],
                       {50: 100, 150: 300}.get(lay, lay), shadow=lay >= 100 and lay < 400))
    if not under:
        for x, y, rng in getattr(room, "lights", []): light(x, y, rng)
    return out

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

def light(cx, cy, rng, colour="ffeccd8b", intensity=.7):
    """A Dungeondraft light (as Dungeondraft writes one): range in squares, colour alpha first. It waits in LIGHTS
    for the next level()."""
    LIGHTS.append({"position": v2(*at(cx, cy)), "range": rng, "intensity": intensity, "color": colour,
                   "texture": "res://textures/lights/fragments.png", "shadows": True, "node_id": NID()})

def wall_with_portals(points, texture, openings, loop, kinds=None, textures=None):
    """points in cells; openings (kind, x, y) that lie on this wall become portals with wall_distance = segment + t.
    textures: {opening kind: asset} from the building's palette (the age's doors and windows), else PORTALS."""
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
                k = (kinds or {}).get(kind, kind)
                tex, width = PORTALS[k]
                tex = (textures or {}).get(k) or tex
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
    lights = list(LIGHTS); LIGHTS.clear()
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
            "water": {}, "materials": {}, "paths": paths, "objects": objects, "lights": lights}

def write_map(fname, cols, rows, seed, lvl):
    manifest = [{"name": n, "id": i, "version": v, "author": a} for i in list(PACKS) + sorted(USED - set(PACKS)) for n, v, a in [pack_info(i)]]
    # editor state copied from a saved Dungeondraft map, so the editor finds every key it expects
    sample = json.load(open(SAMPLE))["header"]
    editor = dict(sample["editor_state"], current_level=0, camera_position=v2(P(cols / 2), P(rows / 2)), camera_zoom=1, trace_image=None)
    if isinstance(editor.get("object_library_memory"), dict):     # the sample's last pick named a pack the maps do not use
        editor["object_library_memory"] = dict(editor["object_library_memory"], selected=[])
    doc = {"header": {"creation_build": "1.0.1.0", "creation_date": sample["creation_date"], "uses_default_assets": True,
                      "asset_manifest": manifest, "editor_state": editor},
           "world": {"format": 2, "width": cols, "height": rows, "next_node_id": format(NID.n + 1, "x"),
                     "msi": {"offset_map_size": 512, "max_offset_distance": .2, "cell_size": 64, "seed": format(seed, "08x")},
                     "grid": {"color": "7f000000"}, "embedded": {}, "levels": {"0": lvl}}}
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
