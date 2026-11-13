"""WoDX map generators: building types. Each type is drawn facing south (its front on the bottom wall) in its own
cells from its top-left corner; place() sets it down anywhere on a map, facing any of the four ways.

A type has: label, size (w, h), wall texture, rooms (name, x, y, w, h, floor), openings (kind, x, y, along) with
along "h" for a wall running east-west and "v" for north-south, partitions, a furnishing list for each room, the
WoDX NPC place kind its region gets, the fill place its containers start from, and the eras it fits.

The farmstead's three buildings (byre-house, barn, coop) were the first; the rest serve the town generator. Every
type here uses the Forgotten Adventures packs, which are medieval, so all of them fit the Dark Ages to the
Renaissance. Later eras need other packs.
"""
from ddcore import Room
import ddcore as C

MEDIEVAL = ["dark-ages", "long-night", "renaissance"]
FLOORS = {"planks": "Wooden_Flooring_H_Ashen.webp", "stone": "Stone_Tiles_A_03.webp", "earth": None}

def floor_tex(f):
    """The pattern texture for a room's floor: a named floor (planks, stone), or a palette's texture path."""
    return FLOORS.get(f) if f in FLOORS else f

OVEN = "Brick_Oven_Gray_A_Hot_2x2.webp"
PIT = "Brick_Cooking_Pit_Gray_A_Hot_1x1.webp"
FORGE = "Brick_Cooking_Pit_Gray_B_Hot_2x1.webp"
BED = "Single_Bed_Colorable_Ashen_A_AB_1x2.png"
BIGBED = "Double_Bed_Frame_Wood_Ashen_A_2x2.webp"
CHEST = "Chest_Wood_Ashen_A_1x1.webp"
TABLE = "Table_Rectangle_Wood_Ashen_E_2x1.webp"
ROUND = "Table_Round_Wood_Ashen_A1_2x2.webp"
BENCH = "Bench_Wood_Ashen_A1_2x1.webp"
STOOL = "Stool_Wood_Ashen_A_1x1.webp"
BARREL = "Barrel_Wood_Ashen_A_1x1.webp"
KEG = "Keg_Wood_Ashen_A_1x1.webp"
SACK = "Sack_Brown_E_Grains_1x1.webp"
CRATE = "Box_Crate_Wood_Ashen_A1_1x1.webp"
WOOD = "Firewood_Pile_A_1x1.webp"

TYPES = {
    # ---------------------------------------------------------------- the farmstead's buildings
    "byre-house": {
        "label": "Byre-house", "size": (12, 5), "wall": "Wood_Ashen_A.png", "place": "home", "fill": "home", "eras": MEDIEVAL,
        # living room (Stube) at the west end, a cross-passage with a door each side, the byre at the east end;
        # the oven stands against the passage wall so the living room is heated from it
        "rooms": [("Living room", 0, 0, 5, 5, "planks"), ("Passage", 5, 0, 3, 5, "earth"), ("Byre", 8, 0, 4, 5, "earth")],
        "openings": [
            ("door", 6.5, 5, "h"), ("door", 6.5, 0, "h"),                     # passage, yard side and back
            ("doorway", 5, 1, "v"), ("doorway", 8, 1, "v"),                   # passage into each end
            ("double", 9.5, 5, "h"),                                          # byre doors for the beasts
            ("window", 1.5, 5, "h"), ("window", 0, 2.5, "v"), ("window", 2.5, 0, "h"), ("window", 10, 0, "h"),
        ],
        "partitions": [((5, 0), (5, 5)), ((8, 0), (8, 5))],
        "furnish": {
            "Living room": [
                (OVEN, "wall:SE", 1),                     # in the corner by the passage wall, fed from the passage
                (WOOD, "hearth", 1),
                (BED, "wall:W", 2),                       # beds along the far gable wall
                (CHEST, "beside:bed", 1),
                (TABLE, "window", 1),                     # table under a window for the light
                (BENCH, "beside:table", 1),
                (STOOL, "beside:table", 1),
            ],
            "Passage": [(BARREL, "wall", 2, .75), (SACK, "wall", 1, .75), ("Broom_Wood_Ashen_A_1x1.webp", "corner", 1, .7),
                        ("Firewood_Stacked_A_1x1.webp", "wall", 1, .75)],
            "Byre": [("Trough_Wood_Ashen_Grain_A_2x1.webp", "wall:E", 2), ("Hay_Bale_A_01_1x1.webp", "wall", 2, .75),
                     ("Bucket_Wood_Ashen_B_1x1.webp", "wall", 1, .7)],
        },
    },
    "barn": {
        "label": "Barn", "size": (6, 5), "wall": "Wood_Ashen_B.png", "place": "workplace", "fill": "workshop", "eras": MEDIEVAL,
        "rooms": [("Barn floor", 0, 0, 6, 5, "earth")],
        "openings": [("double", 3, 5, "h"), ("window", 3, 0, "h")],
        "partitions": [],
        "furnish": {"Barn floor": [("Hay_Pile_A_01_2x2.webp", "corner", 2), ("Hay_Bale_A_01_1x1.webp", "wall", 2),
                                   ("Sack_Brown_D_Grain_1x1.webp", "wall", 2, .8)]},
    },
    "coop": {
        "label": "Coop", "size": (2, 2), "wall": "Wood_Ashen_C.png", "place": None, "fill": "home", "eras": MEDIEVAL,
        "rooms": [("Coop", 0, 0, 2, 2, "earth")],
        "openings": [("door", 1, 0, "h")],
        "partitions": [],
        "furnish": {"Coop": [("Hay_Bale_A_02_1x1.webp", "corner", 1, .6)]},
    },
    # ---------------------------------------------------------------- village and town
    "cottage": {
        "label": "Cottage", "size": (6, 5), "wall": "Wood_Ashen_C.png", "place": "home", "fill": "home", "eras": MEDIEVAL,
        "rooms": [("Cottage", 0, 0, 6, 5, "earth")],
        "openings": [("door", 2.5, 5, "h"), ("window", 4.5, 5, "h"), ("window", 0, 2.5, "v"), ("window", 3, 0, "h")],
        "partitions": [],
        "furnish": {"Cottage": [(PIT, "wall:N", 1), (WOOD, "hearth", 1, .8), (BED, "wall:E", 2), (CHEST, "beside:bed", 1),
                                (TABLE, "window", 1), (BENCH, "beside:table", 1), (BARREL, "wall", 1, .75)]},
    },
    "smithy": {
        "label": "Smithy", "size": (8, 5), "wall": "Stone_A.png", "place": "workplace", "fill": "workshop", "eras": MEDIEVAL,
        "rooms": [("Forge", 0, 0, 5, 5, "earth"), ("Smith's room", 5, 0, 3, 5, "planks")],
        "openings": [("double", 2.5, 5, "h"), ("doorway", 5, 3.5, "v"), ("window", 2.5, 0, "h"), ("window", 8, 2.5, "v")],
        "partitions": [((5, 0), (5, 5))],
        "furnish": {
            "Forge": [(FORGE, "wall:N", 1), ("Anvil_Metal_Gray_A1_1x1.webp", "hearth", 1), ("Bellows_Wood_Ashen_1x1.webp", "hearth", 1, .8),
                      ("Weapon_Rack_Metal_Gray_A1_1x2.webp", "wall:W", 1), ("Sack_Brown_E_Coals_1x1.webp", "wall", 1, .75),
                      (BARREL, "wall", 1, .75), (CHEST, "corner", 1)],
            "Smith's room": [(BED, "wall:E", 1), (STOOL, "corner", 1, .8)],
        },
    },
    "tavern": {
        "label": "Tavern", "size": (10, 8), "wall": "Wood_Ashen_A.png", "place": "tavern", "fill": "home", "eras": MEDIEVAL,
        "rooms": [("Taproom", 0, 0, 7, 8, "planks"), ("Kitchen", 7, 0, 3, 4, "earth"), ("Cellar store", 7, 4, 3, 4, "earth")],
        "openings": [("double", 3.5, 8, "h"), ("window", 1.5, 8, "h"), ("window", 5.5, 8, "h"), ("window", 0, 4, "v"),
                     ("window", 3.5, 0, "h"), ("doorway", 7, 2, "v"), ("door", 7, 6, "v"), ("door", 10, 3, "v")],
        "partitions": [((7, 0), (7, 8)), ((7, 4), (10, 4))],
        "furnish": {
            "Taproom": [("Bar_Wood_Ashen_A2_3x1.webp", "wall:N", 1), (KEG, "beside:bar", 2, .8), (ROUND, "corner:W", 2),
                        (STOOL, "beside:table", 3, .8), (BENCH, "wall:S", 1)],
            "Kitchen": [(OVEN, "corner:NE", 1, .8), (WOOD, "hearth", 1, .7), (BARREL, "wall", 1, .7)],
            "Cellar store": [(KEG, "wall", 3, .8), (BARREL, "wall", 2, .8), (CHEST, "corner", 1, .9)],
        },
    },
    "chapel": {
        "label": "Chapel", "size": (6, 10), "wall": "Stone_A.png", "place": "church", "fill": "church", "eras": MEDIEVAL,
        "rooms": [("Chancel", 0, 0, 6, 3, "stone"), ("Nave", 0, 3, 6, 7, "stone")],
        "openings": [("double", 3, 10, "h"), ("arch", 3, 3, "h"), ("window", 0, 5, "v"), ("window", 0, 8, "v"),
                     ("window", 6, 5, "v"), ("window", 6, 8, "v"), ("window", 3, 0, "h")],
        "partitions": [((0, 3), (6, 3))],
        "furnish": {
            "Chancel": [("Altar_Stone_01_A_2x1.webp", "wall:N", 1), ("Candle_Colorable_A_1x1.png", "beside:altar", 2, .5), (CHEST, "corner", 1, .9)],
            "Nave": [("Pew_Wood_Ashen_A_2x1.webp", "end:W", 3, .9), ("Pew_Wood_Ashen_A_2x1.webp", "end:E", 3, .9)],
        },
    },
    "townhouse": {
        "label": "House and shop", "size": (6, 7), "wall": "BrickWood_Ashen_A.png", "place": "home", "fill": "home", "eras": MEDIEVAL,
        "rooms": [("Back room", 0, 0, 6, 3, "planks"), ("Shop", 0, 3, 6, 4, "planks")],
        "openings": [("door", 2, 7, "h"), ("window", 4.5, 7, "h"), ("doorway", 2, 3, "h"), ("window", 0, 1.5, "v"),
                     ("window", 6, 5, "v"), ("window", 2, 0, "h")],
        "partitions": [((0, 3), (6, 3))],
        "furnish": {
            "Back room": [(BIGBED, "corner:E", 1), (CHEST, "beside:bed", 1), (PIT, "wall:N", 1)],
            "Shop": [(TABLE, "wall:E", 1), (CRATE, "corner", 2), (BARREL, "wall", 1, .75), (SACK, "wall", 1, .75)],
        },
    },
    "workshop": {
        "label": "Workshop", "size": (7, 5), "wall": "Wood_Ashen_B.png", "place": "workplace", "fill": "workshop", "eras": MEDIEVAL,
        "rooms": [("Workshop", 0, 0, 7, 5, "earth")],
        "openings": [("door", 2.5, 5, "h"), ("window", 5, 5, "h"), ("window", 0, 2.5, "v"), ("window", 3.5, 0, "h")],
        "partitions": [],
        "furnish": {"Workshop": [(TABLE, "wall:N", 2), (STOOL, "beside:table", 1), (CRATE, "corner", 2), (SACK, "wall", 1, .75),
                                 (BED, "wall:E", 1), (CHEST, "beside:bed", 1), (PIT, "wall:W", 1)]},
    },
    "bakehouse": {
        "label": "Bakehouse", "size": (6, 5), "wall": "Stone_A.png", "place": "workplace", "fill": "workshop", "eras": MEDIEVAL,
        "rooms": [("Bakehouse", 0, 0, 6, 5, "earth")],
        "openings": [("door", 2, 5, "h"), ("window", 4.5, 5, "h"), ("window", 3, 0, "h")],
        "partitions": [],
        "furnish": {"Bakehouse": [(OVEN, "corner:N", 1), (WOOD, "hearth", 1, .8), ("Firewood_Stacked_A_1x1.webp", "wall", 1, .75),
                                  ("Sack_Brown_E_Wheat_1x1.webp", "wall", 2, .75), (TABLE, "window", 1),
                                  (BED, "wall:W", 1), (CHEST, "beside:bed", 1)]},
    },
    "storehouse": {
        "label": "Storehouse", "size": (6, 5), "wall": "Wood_Ashen_B.png", "place": "workplace", "fill": "workshop", "eras": MEDIEVAL,
        "rooms": [("Store", 0, 0, 6, 5, "earth")],
        "openings": [("double", 3, 5, "h"), ("window", 3, 0, "h")],
        "partitions": [],
        "furnish": {"Store": [(CRATE, "wall", 4), (SACK, "wall", 3, .8), (BARREL, "corner", 2, .8), (KEG, "wall", 2, .8)]},
    },
    "guardhouse": {
        "label": "Guardhouse", "size": (5, 5), "wall": "Stone_A.png", "place": "gate", "fill": "armory", "eras": MEDIEVAL,
        "rooms": [("Guardroom", 0, 0, 5, 5, "stone")],
        "openings": [("door", 2.5, 5, "h"), ("window", 0, 2.5, "v"), ("window", 5, 2.5, "v"), ("window", 2.5, 0, "h")],
        "partitions": [],
        "furnish": {"Guardroom": [("Weapon_Rack_Metal_Gray_A1_1x2.webp", "wall:W", 2), (TABLE, "wall:N", 1), (STOOL, "beside:table", 2, .8),
                                  ("Brazier_A_1x1.webp", "corner", 1), (BED, "wall:E", 1), (CHEST, "beside:bed", 1)]},
    },
}

# ------------------------------------------------------------------ placing a type on a map
FACINGS = {"S": 0, "W": 1, "N": 2, "E": 3}     # quarter turns clockwise from facing south
_TURN = {0: {}, 1: dict(zip("NESW", "ESWN")), 2: dict(zip("NESW", "SWNE")), 3: dict(zip("NESW", "WNES"))}

def _pt(k, w, h, x, y):
    """A point of a w x h type, turned k quarter turns clockwise about its corner box."""
    if k == 0: return (x, y)
    if k == 1: return (h - y, x)
    if k == 2: return (w - x, h - y)
    return (y, w - x)

def _rect(k, w, h, x, y, rw, rh):
    a, b = _pt(k, w, h, x, y), _pt(k, w, h, x + rw, y + rh)
    return (min(a[0], b[0]), min(a[1], b[1]), abs(a[0] - b[0]), abs(a[1] - b[1]))

def _rule(k, rule):
    kind, sep, arg = rule.partition(":")
    if not sep or kind == "beside" or k == 0: return rule
    if kind == "end" and k % 2: kind = "endt"            # a pew still faces the altar in a building turned a quarter
    return kind + ":" + "".join(_TURN[k].get(c, c) for c in arg)

class Building:
    """A building type set down at (x, y) facing a way. Everything is in map cells."""
    def __init__(self, key, type_key, x, y, facing="S", label=None, extra=None, t=None):
        t = t or TYPES[type_key]
        self.key, self.type, self.t = key, type_key, t
        self.label = label or t["label"]
        self.extra = extra or {}
        k = FACINGS[facing]
        self.facing = facing
        w, h = t["size"]
        ow, oh = (h, w) if k % 2 else (w, h)
        self.x, self.y, self.w, self.h = x, y, ow, oh
        off = lambda p: (x + p[0], y + p[1])
        self.openings = []
        for kind, ox, oy, along in t["openings"]:
            px, py = off(_pt(k, w, h, ox, oy))
            self.openings.append((kind, px, py, along if k % 2 == 0 else {"h": "v", "v": "h"}[along]))
        self.partitions = [(off(_pt(k, w, h, *a)), off(_pt(k, w, h, *b))) for a, b in t["partitions"]]
        self.rooms = []
        for rname, rx, ry, rw, rh, floor in t["rooms"]:
            ax, ay, aw, ah = _rect(k, w, h, rx, ry, rw, rh)
            furn = [(e[0], _rule(k, e[1]), *e[2:]) for e in t["furnish"].get(rname, [])]
            self.rooms.append(Room(rname, x + ax, y + ay, aw, ah, floor, self.openings, furn))

    @property
    def rect(self): return (self.x, self.y, self.w, self.h)

    @property
    def outline(self): return [(self.x, self.y), (self.x + self.w, self.y), (self.x + self.w, self.y + self.h), (self.x, self.y + self.h)]

    @property
    def centre(self): return (self.x + self.w / 2, self.y + self.h / 2)

    def front(self):
        """The middle of the front wall, and a point one cell outside it."""
        cx, cy = self.centre
        return {"S": ((cx, self.y + self.h), (cx, self.y + self.h + 1)), "N": ((cx, self.y), (cx, self.y - 1)),
                "E": ((self.x + self.w, cy), (self.x + self.w + 1, cy)), "W": ((self.x, cy), (self.x - 1, cy))}[self.facing]

    def furnish(self):
        for r in self.rooms: r.furnish()
        import furnishing as F
        if F.DEFAULT: F.apply(self, **F.DEFAULT)
        return self

def place(key, type_key, x, y, facing="S", label=None, extra=None):
    return Building(key, type_key, x, y, facing, label, extra)

# ------------------------------------------------------------------ a type set down at any angle (organic towns)
import math as _m

class Angled:
    """A building type turned to any angle: built and furnished in its own cells facing south, then turned by
    theta (radians, clockwise on the map, 0 = facing south) and set with its middle at (cx, cy). Furnishing happens
    before the turn, so a type that furnishes facing south furnishes at every angle.
    Gives the same names the town code reads off a Building: key, type, t, label, extra, rooms (local), x, y, w, h
    (the box around it), centre, plus corners, world(), openings_world(), front()."""
    def __init__(self, key, type_key, cx, cy, theta, label=None, extra=None, t=None):
        self.local = Building(key, type_key, 0, 0, "S", label, extra, t)
        self.key, self.type, self.t, self.label, self.extra = key, type_key, self.local.t, self.local.label, self.local.extra
        self.theta, self.cx, self.cy = theta, cx, cy
        self.lw, self.lh = self.local.w, self.local.h
        self.c, self.s = _m.cos(theta), _m.sin(theta)
        xs, ys = zip(*self.corners)
        self.x, self.y = min(xs), min(ys)
        self.w, self.h = max(xs) - self.x, max(ys) - self.y
        self.facing = "S"

    def world(self, x, y):
        """A point in the building's own cells, on the map."""
        dx, dy = x - self.lw / 2, y - self.lh / 2
        return (self.cx + dx * self.c - dy * self.s, self.cy + dx * self.s + dy * self.c)

    @property
    def corners(self): return [self.world(0, 0), self.world(self.lw, 0), self.world(self.lw, self.lh), self.world(0, self.lh)]

    @property
    def outline(self):
        """The building's outer wall on the map: its box, or an L or T where it has a wing or lean-to."""
        pts = []
        for q in self.t.get("outline") or [(0, 0), (self.lw, 0), (self.lw, self.lh), (0, self.lh)]:
            if not pts or abs(pts[-1][0] - q[0]) > 1e-6 or abs(pts[-1][1] - q[1]) > 1e-6: pts.append(q)
        if len(pts) > 1 and abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6: pts.pop()
        # drop corners that lie on a straight run (a wing flush with an end wall)
        keep = [p for i, p in enumerate(pts) if abs((p[0] - pts[i - 1][0]) * (pts[(i + 1) % len(pts)][1] - p[1]) - (p[1] - pts[i - 1][1]) * (pts[(i + 1) % len(pts)][0] - p[0])) > 1e-9]
        return [self.world(*q) for q in keep]

    @property
    def hulls(self):
        """The building as one or more rectangles on the map (its main range and any wing), for spacing checks."""
        return [[self.world(x, y), self.world(x + w, y), self.world(x + w, y + h), self.world(x, y + h)]
                for x, y, w, h in self.t.get("parts") or [(0, 0, self.lw, self.lh)]]

    def drop_side(self, side):
        """Take the windows out of one end wall (W or E), where a neighbour's wall now stands against it."""
        x = 0 if side == "W" else self.lw
        self.local.openings[:] = [o for o in self.local.openings if not (o[0] == "window" and o[3] == "v" and abs(o[1] - x) < .01)]

    @property
    def rect(self): return (self.x, self.y, self.w, self.h)

    @property
    def centre(self): return (self.cx, self.cy)

    @property
    def rooms(self): return self.local.rooms

    @property
    def normal(self): return (-self.s, self.c)            # the way the front faces

    def front(self):
        """The middle of the front wall, and a point one cell outside it."""
        a = self.world(self.lw / 2, self.lh)
        n = self.normal
        return a, (a[0] + n[0], a[1] + n[1])

    def openings_world(self):
        """(kind, x, y, (ax, ay, bx, by)): each opening on the map, with the two ends of its gap."""
        out = []
        from ddcore import PORTALS
        for kind, ox, oy, along in self.local.openings:
            half = PORTALS[kind][1] / 2
            a, b = ((ox - half, oy), (ox + half, oy)) if along == "h" else ((ox, oy - half), (ox, oy + half))
            p, q = self.world(*a), self.world(*b)
            out.append((kind, *self.world(ox, oy), (p[0], p[1], q[0], q[1])))
        return out

    def partitions_world(self): return [(self.world(*a), self.world(*b)) for a, b in self.local.partitions]

    def room_poly(self, r): return [self.world(r.x, r.y), self.world(r.x + r.w, r.y), self.world(r.x + r.w, r.y + r.h), self.world(r.x, r.y + r.h)]

    def items_world(self, r, picture=False):
        """(item, cx, cy, rotation) for each item in a room, on the map. picture=True: where its picture goes
        (moved to its wall when the picture is shallower than its square, see ddcore.centre)."""
        for it in r.items:
            cx, cy = self.world(*(C.centre(it) if picture else (it["x"] + it["w"] / 2, it["y"] + it["h"] / 2)))
            yield it, cx, cy, self.theta + it.get("angle", _m.pi / 2 if it["rot"] else 0.0)

    def dressing_world(self, r, under):
        """Dungeondraft objects for a room's dressing (see ddcore.dress), on the map."""
        out = []
        for it in sorted(getattr(r, "dressing", []), key=lambda i: i.get("layer", 100)):
            lay = it.get("layer", 100)
            if (lay < 100) != under: continue
            cx, cy = self.world(it["x"] + it["w"] / 2, it["y"] + it["h"] / 2)
            rot = it.get("spin", self.theta + it.get("angle", _m.pi / 2 if it["rot"] else 0.0))
            out.append(C.obj(it["asset"], cx, cy, rot, it["scale"], {50: 100, 150: 300}.get(lay, lay), shadow=100 <= lay < 400))
        if not under:
            for x, y, rng in getattr(r, "lights", []): C.light(*self.world(x, y), rng)
        return out

    def furnish(self):
        import furnishing as F
        keep, F.DEFAULT = dict(F.DEFAULT), {}
        try: self.local.furnish()
        finally: F.DEFAULT.update(keep)
        if F.DEFAULT: F.apply(self, **F.DEFAULT)
        return self


# ------------------------------------------------------------------ variants: no two houses alike (organic towns)
import copy as _copy

STRETCH = {   # extra length (at the east end) and depth (at the front), in squares, by type
    "cottage": ((0, 0, 1, 2), (0, 0, 1)), "townhouse": ((0, 1, 2), (0, 0, 1)), "workshop": ((0, 1, 2), (0, 0, 1)),
    "bakehouse": ((0, 1), (0, 1)), "storehouse": ((0, 1, 2), (0, 1)), "byre-house": ((0, 1, 2), (0, 0, 1)),
    "smithy": ((0, 1), (0, 1)), "tavern": ((0, 1, 2), (0, 1)), "guardhouse": ((0, 1), (0,)), "chapel": ((0,), (0, 1, 2)),
}
ANNEX = {     # a wing or lean-to: its name, width and depth choices, what is in it
    "cottage": ("Lean-to", (3, 4), (2.5, 3), [(WOOD, "wall", 1, .8), (BARREL, "corner", 1, .75)]),
    "townhouse": ("Store", (3, 4), (3,), [(CRATE, "corner", 2, .8), (SACK, "wall", 1, .75)]),
    "workshop": ("Shed", (3, 4), (3,), [("Firewood_Stacked_A_1x1.webp", "wall", 1, .75), (CRATE, "corner", 1, .8)]),
    "bakehouse": ("Flour store", (3,), (3,), [("Sack_Brown_E_Wheat_1x1.webp", "wall", 2, .75)]),
    "smithy": ("Coal store", (3,), (3,), [("Sack_Brown_E_Coals_1x1.webp", "wall", 2, .75)]),
    "tavern": ("Brewhouse", (4,), (3, 4), [(KEG, "wall", 2, .8), (BARREL, "corner", 1, .8)]),
    "byre-house": ("Shed", (3, 4), (3,), [(WOOD, "wall", 1, .8), ("Hay_Bale_A_01_1x1.webp", "corner", 1, .75)]),
    "chapel": ("Vestry", (3,), (3,), [(CHEST, "corner", 1, .9)]),
}

def variant(type_key, R, sides=True, chance=.6):
    """A copy of a type, made a little longer or deeper and perhaps given a wing or lean-to at the back or one end
    (an L or T). sides: False keeps wings off the end walls (a house in a terraced row). Always drawn facing south
    with its front on the bottom wall; every room is a rectangle, so it furnishes as the plain type does."""
    t = _copy.deepcopy(TYPES[type_key])
    W, H = t["size"]
    dws, dhs = STRETCH.get(type_key, ((0,), (0,)))
    dw, dh = R.choice(dws), R.choice(dhs)
    if dw or dh:
        t["rooms"] = [(n, x, y, w + (dw if abs(x + w - W) < .01 else 0), h + (dh if abs(y + h - H) < .01 else 0), f) for n, x, y, w, h, f in t["rooms"]]
        t["openings"] = [(k, x + (dw if abs(x - W) < .01 else 0), y + (dh if abs(y - H) < .01 else 0), a) for k, x, y, a in t["openings"]]
        mv = lambda p: (p[0] + (dw if abs(p[0] - W) < .01 else 0), p[1] + (dh if abs(p[1] - H) < .01 else 0))
        t["partitions"] = [(mv(a), mv(b)) for a, b in t["partitions"]]
        W, H = W + dw, H + dh
    t["size"] = (W, H)
    t["outline"] = [(0, 0), (W, 0), (W, H), (0, H)]
    t["parts"] = [(0, 0, W, H)]
    if type_key not in ANNEX or R.random() > chance: return t
    name, ws, ds, furn = ANNEX[type_key]
    where = R.choice(("back", "back", "east", "west") if sides else ("back",))
    aw, ad = R.choice(ws), R.choice(ds)
    if where == "back":
        if aw > W - 1: return t
        ax = R.choice([k / 2 for k in range(0, int((W - aw) * 2) + 1)])
        shift = lambda x, y: (x, y + ad)
        wall_has = lambda o: o[3] == "h" and abs(o[2]) < .01 and ax - .01 <= o[1] <= ax + aw + .01
        conn, inner, outer = ("doorway", ax + aw / 2, ad, "h"), (ax, 0, aw, ad), ("window", ax + aw / 2, 0, "h")
        part, new_size = ((ax, ad), (ax + aw, ad)), (W, H + ad)
        outline = [(0, ad), (ax, ad), (ax, 0), (ax + aw, 0), (ax + aw, ad), (W, ad), (W, H + ad), (0, H + ad)]
        main = (0, ad, W, H)
    else:
        ah = min(ad + 1, H - 1)
        aw = min(aw, 3)
        if where == "east":
            shift = lambda x, y: (x, y)
            wall_has = lambda o: o[3] == "v" and abs(o[1] - W) < .01 and o[2] <= ah + .01
            conn, inner, outer = ("doorway", W, ah / 2, "v"), (W, 0, aw, ah), ("window", W + aw, ah / 2, "v")
            part, new_size = ((W, 0), (W, ah)), (W + aw, H)
            outline = [(0, 0), (W + aw, 0), (W + aw, ah), (W, ah), (W, H), (0, H)]
            main = (0, 0, W, H)
        else:
            shift = lambda x, y: (x + aw, y)
            wall_has = lambda o: o[3] == "v" and abs(o[1]) < .01 and o[2] <= ah + .01
            conn, inner, outer = ("doorway", aw, ah / 2, "v"), (0, 0, aw, ah), ("window", 0, ah / 2, "v")
            part, new_size = ((aw, 0), (aw, ah)), (W + aw, H)
            outline = [(0, 0), (W + aw, 0), (W + aw, H), (aw, H), (aw, ah), (0, ah)]
            main = (aw, 0, W, H)
    # windows in the wall the wing now covers go; a door there already becomes the way into the wing
    hits = [o for o in t["openings"] if wall_has(o)]
    t["openings"] = [o for o in t["openings"] if not (wall_has(o) and o[0] == "window")]
    doors = [o for o in hits if o[0] != "window"]
    t["rooms"] = [(n, *shift(x, y), w, h, f) for n, x, y, w, h, f in t["rooms"]]
    t["openings"] = [(k, *shift(x, y), a) for k, x, y, a in t["openings"]]
    t["partitions"] = [(shift(*a), shift(*b)) for a, b in t["partitions"]]
    if not doors: t["openings"].append(conn)
    t["openings"].append(outer)
    t["rooms"].append((name, *inner, "earth"))
    t["partitions"].append(part)
    t["furnish"] = dict(t["furnish"]); t["furnish"][name] = list(furn)
    t["size"], t["outline"], t["parts"] = new_size, outline, [main, inner]
    return t
