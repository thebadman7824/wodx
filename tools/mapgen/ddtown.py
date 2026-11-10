"""WoDX village and town generator, Dungeondraft edition.

Writes a .dungeondraft_map of a village or small town of the Dark Ages, its WoDX sidecar (doors, shutters, chests,
beds, hearths, the well, a region for every building and the market, and the households who live there) and a
plan-view SVG to check the logic by eye. Everything is WoDX's own code; the building types are in buildings.py.

How it decides where things go
  1. Roads: a main road runs east to west across the map. A village has a lane north from it; a town has a
     crossroads. The market (a village green in a village) sits where they meet.
  2. Population: a village aims at 70 to 120 people, a small town at 190 to 260; what the plots hold decides the
     real count (the summary and the sidecar give it). Households of one to eight.
  3. Trades from demand: each kind of building has a "one for so many people" rate (a house rule, not a book
     table), so a bigger place gets more and rarer trades. The chapel and the tavern always come first and face
     the market; the rest are placed in order of standing.
  4. Plots: every building fronts a road or the market, set back a little, facing it. A spot is scored by how near
     it is to the market (the trades want the middle; farmers, the smithy and the watch the edges) and a little
     chance. Buildings keep a clear gap from each other, the roads, the market and the map edge, or are not placed.
  5. A home gets a fenced kitchen garden behind it where there is room.
  6. Woods close in around the edges; trees keep off every footprint, road and garden.
  7. Households: every home and every trade building has a household (the trade's master, partner, children,
     elders, an apprentice or a servant); the chapel's priest lives in a cottage beside it. They are listed in the
     sidecar for WoDX NPC to seed later. Roles only, no names.

Night: the map's ambient light is a night blue (Rothenstein's maps are drawn as night). --day keeps daylight.

Run: python3 ddtown.py [--seed N] [--size village|town] [--name NAME] [--assets LIST] [--day]
The asset list is every asset path in the Forgotten Adventures packs, one a line (the farmstead's copy:
/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt).
"""
import argparse, json, math, re

import ddcore as C
from ddcore import obj, wall_with_portals, pattern, path, splat_byte, overlaps, rdist
import buildings as B

SIZES = {
    "village": {"cols": 64, "rows": 48, "pop": (70, 120), "cross": False, "market": (13, 8), "label": "village"},
    "town": {"cols": 96, "rows": 72, "pop": (190, 260), "cross": True, "market": (17, 11), "label": "small town"},
}
ROAD_HALF = 1.2
NIGHT, DAY = "ff6a7aa8", "ffffffff"
TERRAIN = ["Grass_A_03.webp", "Dirt_A_01.webp", "Cracked_Dirt_A_01.webp", "Forest_Floor_Needles_A_01.webp"]

# Trades: (type, label, one for so many people, at least, at most, where it wants to be: "middle" or "edge").
# A house rule for WoDX, from the usual shape of a medieval village; no book gives these numbers.
TRADES = [
    ("smithy", "Smithy", 250, 1, 3, "edge"),
    ("bakehouse", "Bakehouse", 220, 0, 3, "middle"),
    ("tavern", "Alehouse", 350, 0, 2, "middle"),          # a second tavern in a town
    ("townhouse", "House and shop", 70, 0, 10, "middle"),
    ("workshop", "Workshop", 90, 1, 8, "middle"),
    ("storehouse", "Storehouse", 280, 0, 3, "middle"),
    ("guardhouse", "Guardhouse", 400, 0, 2, "edge"),
]
WORKSHOP_TRADES = ["carpenter", "cooper", "weaver", "potter", "tanner", "cobbler", "chandler", "wheelwright", "turner", "dyer"]
SHOP_TRADES = ["draper", "spicer", "cutler", "saddler", "glover", "butcher", "fishmonger", "goldsmith", "mercer", "salter"]
MASTER = {"smithy": "smith", "bakehouse": "baker", "tavern": "alehouse keeper"}
NAME_A = ["Alt", "Eich", "Hasel", "Lin", "Wald", "Stein", "Mühl", "Brun", "Kreuz", "Rot", "Hohen", "Bir", "Erl", "Schön"]
NAME_B = ["dorf", "bach", "feld", "hausen", "heim", "au", "rode", "brück", "stadt", "berg"]

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("ü", "u").replace("ö", "o").replace("ä", "a")).strip("-")

class Town:
    def __init__(self, seed, size, name=None, night=True):
        self.R = C.R
        cfg = SIZES[size]
        self.size, self.cfg, self.seed, self.night = size, cfg, seed, night
        self.cols, self.rows = cfg["cols"], cfg["rows"]
        R = self.R
        self.name = name or (R.choice(NAME_A) + R.choice(NAME_B))
        self.pop_target = R.randint(*cfg["pop"])
        self.yc = round(self.rows / 2 + R.uniform(-2, 2)) + .5
        self.xc = round(self.cols / 2 + R.uniform(-4, 4)) + .5
        mw, mh = cfg["market"]
        # the market sits a little off the crossing, so one side of it has room for the tavern or the chapel
        mo = R.choice((-1, 1)) * mw / 4
        self.market = (self.xc + mo - mw / 2, self.yc - mh / 2, mw, mh)
        g = ROAD_HALF
        self.roads = [("main", (-2, self.yc - g, self.cols + 4, 2 * g))]
        bottom = self.rows + 2 if cfg["cross"] else self.yc
        self.roads.append(("lane", (self.xc - g, -2, 2 * g, bottom + 2)))
        if cfg["cross"]:
            # back streets behind the main road's plots, joined by two cross lanes
            off = 18 + R.choice((0, 1, 2))
            x0, x1 = 10, self.cols - 10
            for n, yy in (("back-north", self.yc - off), ("back-south", self.yc + off)):
                self.roads.append((n, (x0, yy - g * .8, x1 - x0, 1.6 * g)))
            for n, xx in (("cross-west", self.xc - 22 + R.uniform(-2, 2)), ("cross-east", self.xc + 22 + R.uniform(-2, 2))):
                self.roads.append((n, (xx - g * .8, self.yc - off, 1.6 * g, 2 * off)))
        else:
            # back lanes off the main road: one south on each side, and one more north
            side = R.choice((-1, 1))
            for n, xx, north in (("lane-south-1", self.xc + side * (14 + R.uniform(0, 3)), False),
                                 ("lane-south-2", self.xc - side * (15 + R.uniform(0, 3)), False),
                                 ("lane-north", self.xc - side * (17 + R.uniform(0, 3)), True)):
                y0, y1 = (-2, self.yc) if north else (self.yc, self.rows + 2)
                self.roads.append((n, (xx - g * .8, y0, 1.6 * g, y1 - y0)))
        self.blds, self.gardens, self.households, self.notes = [], [], [], []

    # ------------------------------------------------------------ fronts: lines a building may face
    def fronts(self):
        """(line, facing, lo, hi, on): a building's front wall lies on the line, between lo and hi along it."""
        mx, my, mw, mh = self.market
        out = []
        for rid, (x, y, w, h) in self.roads:
            on = "main" if rid == "main" else "lane"
            if w > h: out += [(y, "S", x, x + w, on), (y + h, "N", x, x + w, on)]
            else: out += [(x, "E", y, y + h, on), (x + w, "W", y, y + h, on)]
        # a building on the market may run past its corner a little
        out += [(my, "S", mx - 4, mx + mw + 4, "market"), (my + mh, "N", mx - 4, mx + mw + 4, "market"),
                (mx, "E", my - 4, my + mh + 4, "market"), (mx + mw, "W", my - 4, my + mh + 4, "market")]
        return out

    def blocked_by(self, rect, gap=1.0):
        x, y, w, h = rect
        if x < 1.5 or y < 1.5 or x + w > self.cols - 1.5 or y + h > self.rows - 1.5: return "the map edge"
        for _, r in self.roads:
            if overlaps(rect, r, .45): return "a road"
        if overlaps(rect, self.market, .45): return "the market"
        for b in self.blds:
            if overlaps(rect, b.rect, gap): return b.label
        for gd in self.gardens:
            if overlaps(rect, gd["rect"], .5): return "a garden"
        return None

    def spot(self, type_key, want="middle", only=None, setback=None):
        """The best free spot for a type, or None. want: middle (near the market) or edge (far from it)."""
        R = self.R
        sb = setback if setback is not None else R.choice((.7, 1.0, 1.3, 1.6))
        best = None
        tw, th = B.TYPES[type_key]["size"]
        for line, facing, lo, hi, on in self.fronts():
            if only and on not in only: continue
            k = B.FACINGS[facing]
            w, h = (th, tw) if k % 2 else (tw, th)
            horiz = facing in "NS"
            span = w if horiz else h
            # every building sits on the half-cell grid, so its rooms furnish the same way wherever it stands
            dn, up = (lambda v: math.floor(v * 2) / 2), (lambda v: math.ceil(v * 2) / 2)
            a = up(lo)
            while a + span <= hi + 1e-6:
                if facing == "S": rect = (a, dn(line - sb - h), w, h)
                elif facing == "N": rect = (a, up(line + sb), w, h)
                elif facing == "E": rect = (dn(line - sb - w), a, w, h)
                else: rect = (up(line + sb), a, w, h)
                a += .5
                if self.blocked_by(rect): continue
                cx, cy = rect[0] + w / 2, rect[1] + h / 2
                d = math.hypot((cx - self.xc) / self.cols, (cy - self.yc) / self.rows)
                score = (d if want == "middle" else -d) + R.uniform(0, .06) + (.04 if on == "market" and want == "edge" else 0)
                if best is None or score < best[0]: best = (score, rect, facing)
        return best

    def add(self, type_key, label, want="middle", only=None, extra=None):
        s = self.spot(type_key, want, only)
        if not s: return None
        _, rect, facing = s
        n = sum(1 for b in self.blds if b.type == type_key) + 1
        b = B.place(f"{type_key}-{n}", type_key, rect[0], rect[1], facing, label, extra).furnish()
        self.blds.append(b)
        return b

    def garden_behind(self, b):
        """A fenced kitchen garden behind a home, where there is room."""
        R = self.R
        d = R.choice((2.5, 3, 3.5))
        x, y, w, h = b.rect
        rect = {"S": (x + .5, y - .8 - d, w - 1, d), "N": (x + .5, y + h + .8, w - 1, d),
                "E": (x - .8 - d, y + .5, d, h - 1), "W": (x + w + .8, y + .5, d, h - 1)}[b.facing]
        if self.blocked_by(rect, gap=.6): return None
        g = {"id": f"{b.key}-garden", "rect": rect, "of": b.key}
        self.gardens.append(g)
        return g

    # ------------------------------------------------------------ the plan of the place
    def lay_out(self):
        R = self.R
        people = self.pop_target
        homes_needed = max(8, round(people / 4.8))
        # the chapel and the main tavern face the market first
        tavern = self.add("tavern", "Tavern", "middle", only={"market"})
        if not tavern: raise SystemExit("no room for the tavern on the market")
        chapel = self.add("chapel", "Chapel", "middle", only={"market"})
        if not chapel: raise SystemExit("no room for the chapel on the market")
        priest = self.add("cottage", "Priest's house", "middle")
        trade_blds = [tavern]
        if priest: priest.extra["priest"] = True
        for t, label, per, lo, hi, want in TRADES:
            if self.size == "town" and t in ("townhouse", "workshop"): per /= 2.5     # a town lives by its trades
            n = max(lo, min(hi, round(people / per)))
            if t == "tavern": n = max(0, n - 1)
            if t == "guardhouse" and self.size == "village": n = 0
            for i in range(n):
                if t == "workshop": lab = f"Workshop ({WORKSHOP_TRADES[i % len(WORKSHOP_TRADES)]})"
                elif t == "townhouse": lab = f"House and shop ({SHOP_TRADES[i % len(SHOP_TRADES)]})"
                else: lab = label
                only = {"main"} if t == "guardhouse" else None
                b = self.add(t, lab, want, only)
                if b: trade_blds.append(b)
                else: self.notes.append(f"no room for {lab}")
        # the rest are homes: byre-houses for the farmers out toward the edges, cottages nearer in
        made = sum(1 for b in trade_blds if b.type not in ("storehouse", "guardhouse")) + (1 if priest else 0)
        while made < homes_needed:
            farmer = R.random() < (.55 if self.size == "village" else .3)
            b = self.add("byre-house" if farmer else "cottage", "Farmhouse" if farmer else "Cottage", "edge" if farmer else "middle")
            if not b:
                b = self.add("cottage", "Cottage", "middle")
                if not b: self.notes.append(f"room for {made} households of {homes_needed}"); break
            made += 1
        for b in self.blds:
            if b.type in ("cottage", "byre-house", "townhouse") and R.random() < .8: self.garden_behind(b)
        self.people()

    def people(self):
        """Households: roles only, no names. A house rule for the mix; most households were small."""
        R = self.R
        for b in self.blds:
            if b.type in ("chapel", "storehouse", "guardhouse", "barn", "coop"): continue
            if b.extra.get("priest"):
                roles = ["priest"] + R.choice([[], ["servant"], ["clerk"]])
                trade = "priest"
            else:
                trade = {"byre-house": "farmer", "cottage": R.choice(["labourer", "cottager", "herder", "carter", "widowed spinner"])}.get(b.type)
                if b.type == "workshop": trade = b.label.split("(")[1].rstrip(")")
                if b.type == "townhouse": trade = b.label.split("(")[1].rstrip(")")
                trade = trade or MASTER.get(b.type, b.label.lower())
                roles = [trade]
                if R.random() < .8: roles.append("partner")
                roles += ["child"] * R.choice((0, 1, 1, 2, 2, 3, 4))
                if R.random() < .25: roles.append("elder")
                if b.type in ("smithy", "workshop", "bakehouse") and R.random() < .6: roles.append("apprentice")
                if b.type in ("tavern", "townhouse") and R.random() < .6: roles.append("servant")
                if b.type == "byre-house" and R.random() < .3: roles.append("farmhand")
                if b.type == "tavern" and R.random() < .5: roles.append("lodger")
            self.households.append({"id": f"{b.key}-household", "building": b.key, "label": f"{b.label} household",
                                    "trade": trade, "people": [{"role": r} for r in roles]})

    def population(self): return sum(len(h["people"]) for h in self.households)

    # ------------------------------------------------------------ Dungeondraft
    def well_spot(self):
        mx, my, mw, mh = self.market
        for fx, fy in ((.25, .25), (.75, .25), (.25, .75), (.75, .75)):
            x, y = mx + mw * fx, my + mh * fy
            if not any(overlaps((x - .9, y - .9, 1.8, 1.8), r) for _, r in self.roads): return (x, y)
        return (mx + 1.2, my + 1.2)

    def market_things(self):
        """Stalls (a table with crates, sacks and barrels) in a town's market; stocks by the chapel in either."""
        R = self.R
        out, taken = [], []
        wx, wy = self.well
        taken.append((wx - 1.2, wy - 1.2, 2.4, 2.4))
        mx, my, mw, mh = self.market
        n = 5 if self.size == "town" else 1
        for _ in range(300):
            if len(out) >= n: break
            x, y = R.uniform(mx + .5, mx + mw - 3), R.uniform(my + .5, my + mh - 2)
            r = (x, y, 2.6, 1.8)
            if any(overlaps(r, rr, .2) for _, rr in self.roads) or any(overlaps(r, t, .4) for t in taken): continue
            taken.append(r)
            out.append(("stall", x, y))
        return out

    def build(self):
        R = self.R
        walls, patterns, objects, paths = [], [], [], []
        for b in self.blds:
            walls.append(wall_with_portals(b.outline, b.t["wall"], b.openings, True))
            for a, c in b.partitions: walls.append(wall_with_portals([a, c], b.t["wall"], b.openings, False))
            for r in b.rooms:
                if B.FLOORS.get(r.floor):
                    patterns.append(pattern([(r.x, r.y), (r.x + r.w, r.y), (r.x + r.w, r.y + r.h), (r.x, r.y + r.h)], B.FLOORS[r.floor]))
                for it in r.items:
                    rot = 0.0 if not it["rot"] else math.pi / 2
                    objects.append(obj(it["asset"], it["x"] + it["w"] / 2, it["y"] + it["h"] / 2, rot, it["scale"], 100))
        for g in self.gardens:
            x, y, w, h = g["rect"]
            gate = {"S": "S", "N": "N", "E": "E", "W": "W"}[next(b for b in self.blds if b.key == g["of"]).facing]
            corners = {"N": [(x, y), (x + w, y)], "E": [(x + w, y), (x + w, y + h)], "S": [(x + w, y + h), (x, y + h)], "W": [(x, y + h), (x, y)]}
            for side, (a, c) in corners.items():
                if side == gate:      # the gate is on the side toward the house
                    m0 = (a[0] + (c[0] - a[0]) * .4, a[1] + (c[1] - a[1]) * .4); m1 = (a[0] + (c[0] - a[0]) * .6, a[1] + (c[1] - a[1]) * .6)
                    paths.append(path([a, m0], "Fence-Wood-Ashen-A.png", 64)); paths.append(path([m1, c], "Fence-Wood-Ashen-A.png", 64))
                else: paths.append(path([a, c], "Fence-Wood-Ashen-A.png", 64))
            for row in range(int((h - .3) / .9)):
                for col in range(int((w - .3) / .8)):
                    objects.append(obj(R.choice([f"Bush_Green_B{i}_1x1.webp" for i in (1, 2, 3)]), x + .5 + col * .8, y + .55 + row * .9, R.uniform(0, 6.3), .5))
        # the well, the stalls, the stocks
        wx, wy = self.well
        ring = [(wx + .5 * math.cos(a * math.pi / 6), wy + .5 * math.sin(a * math.pi / 6)) for a in range(12)]
        walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
        objects.append(obj("Bucket_Wood_Ashen_A_1x1.webp", wx + .9, wy + .3, 0, .8))
        for kind, x, y in self.stalls:
            objects.append(obj("Table_Rectangle_Wood_Ashen_E_2x1.webp", x + 1.3, y + .5, 0, 1))
            for k, a in enumerate(R.sample(["Box_Crate_Wood_Ashen_A1_1x1.webp", "Sack_Brown_E_Wheat_1x1.webp", "Barrel_Wood_Ashen_A_1x1.webp", "Sack_Brown_E_Grains_1x1.webp"], 2)):
                objects.append(obj(a, x + .6 + k * 1.3, y + 1.4, R.uniform(-.3, .3), .75))
        sx, sy = self.stocks
        objects.append(obj("Stocks_Wood_Ashen_A1_1x1.webp", sx, sy, 0, 1))
        objects += self.trees()
        return walls, patterns, objects, paths

    def tree_ok(self, x, y, rad):
        if any(rdist(x, y, *b.rect) < rad * .7 + .5 for b in self.blds): return False
        if any(rdist(x, y, *g["rect"]) < rad * .6 for g in self.gardens): return False
        if any(rdist(x, y, *r) < rad * .5 + .3 for _, r in self.roads): return False
        if rdist(x, y, *self.market) < rad + .5: return False
        return True

    def edge_wood(self, x, y):
        """How far into the woods a point is, 0 in the settled middle to 1 well outside it."""
        if not self.blds: return 1
        d = min([rdist(x, y, *b.rect) for b in self.blds] + [rdist(x, y, *self.market)])
        return max(0, min(1, (d - 3) / 6))

    def trees(self):
        R = self.R
        objs, placed = [], []
        pines = [f"Pine_Green_Shadow_A{i}_5x5.webp" for i in range(1, 13)]
        broad = [f"Tree_Green_A{i}_{s}.webp" for i, s in ((1, "6x6"), (3, "6x5"), (5, "6x6"), (6, "5x5"), (9, "6x6"), (10, "5x5"))]
        for _ in range(self.cols * self.rows * 3):
            x, y = R.uniform(-1.5, self.cols + 1.5), R.uniform(-1.5, self.rows + 1.5)
            wood = self.edge_wood(x, y)
            if R.random() > wood * .95 + .02: continue
            s = R.uniform(.75, 1.3); rad = 1.9 * s
            if not self.tree_ok(x, y, rad): continue
            if any(math.hypot(x - a, y - b) < (rad + c) * .55 for a, b, c in placed): continue
            placed.append((x, y, rad))
            objs.append(obj(R.choice(pines if wood > .5 else broad), x, y, R.uniform(-math.pi, math.pi), s if wood > .5 else s * .45, layer=400))
        for _ in range(self.cols * 3):                          # bushes and stones along the gaps
            x, y = R.uniform(1, self.cols - 1), R.uniform(1, self.rows - 1)
            if not self.tree_ok(x, y, .8) or self.edge_wood(x, y) > .6: continue
            if R.random() < .7: objs.append(obj(R.choice([f"Bush_Green_{c}{i}_1x1.webp" for c in "ABC" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), R.uniform(.7, 1.2)))
            else: objs.append(obj(f"Rocks_Small_A{R.randint(1, 5)}_2x2.webp", x, y, R.uniform(0, 6.3), R.uniform(.4, .7)))
        return objs

    def splat(self):
        """4 texels a cell: 1 grass, 2 road, 3 trodden (market and the ground at each door), 4 forest floor."""
        out, woods = [], {}
        doors = [b.front()[1] for b in self.blds]
        for ty in range(self.rows * 4):
            for tx in range(self.cols * 4):
                x, y = (tx + .5) / 4, (ty + .5) / 4
                dr = min(rdist(x, y, *r) for _, r in self.roads)
                road = min(1, max(0, (.35 - dr) / .35)) if dr > 0 else 1
                dm = rdist(x, y, *self.market)
                trod = min(1, max(0, (.6 - dm) / .6)) * .9
                for dx, dy in doors:
                    dd = math.hypot(x - dx, y - dy)
                    if dd < 1.6: trod = max(trod, (1.6 - dd) / 1.6 * .8)
                key = (tx // 2, ty // 2)                 # woods change slowly: one reading for each half cell
                if key not in woods: woods[key] = self.edge_wood((key[0] + .5) / 2, (key[1] + .5) / 2)
                wood = woods[key]
                grass = 1 - wood
                wgt = [grass * (1 - road) * (1 - trod), road, trod * (1 - road), wood * (1 - road) * (1 - trod)]
                out.extend(splat_byte(wgt))
        return out

    # ------------------------------------------------------------ the WoDX sidecar
    def sidecar(self, map_name):
        openings, features, regions = [], [], []
        for b in self.blds:
            openings += C.opening_entries(b.key, b.label, b.openings, b.centre)
            for r in b.rooms: features += C.feature_entries(f"{b.key}-", r, b.t["fill"])
            kind = b.t["place"]
            if kind:
                regions.append({"id": b.key, "label": b.label, "rect": [round(v, 3) for v in b.rect], "place": {"kind": kind}})
        wx, wy = self.well
        features.append({"id": "well", "label": "Well", "rect": [round(wx - .5, 3), round(wy - .5, 3), 1, 1],
                         "flags": {"climb": True, "climbKind": "rope", "height": 30, "depth": 30, "title": "Down the well on the bucket rope"}})
        regions.append({"id": "market", "label": "Market" if self.size == "town" else "Village green", "rect": [round(v, 3) for v in self.market], "place": {"kind": "market"}})
        mx, my, mw, mh = self.market
        for rid, r in self.roads:
            regions.append({"id": f"street-{rid}", "label": {"main": "Main road", "lane": "Lane"}.get(rid, "Back street"), "rect": [round(max(0, r[0]), 3), round(max(0, r[1]), 3),
                            round(min(self.cols, r[0] + r[2]) - max(0, r[0]), 3), round(min(self.rows, r[1] + r[3]) - max(0, r[1]), 3)], "place": {"kind": "street"}})
        ends = []
        for rid, (x, y, w, h) in self.roads:
            if x < 0: ends.append(("west", rid, (0, y - .3, 2, h + .6)))
            if x + w > self.cols: ends.append(("east", rid, (self.cols - 2, y - .3, 2, h + .6)))
            if y < 0: ends.append(("north", rid, (x - .3, 0, w + .6, 2)))
            if y + h > self.rows: ends.append(("south", rid, (x - .3, self.rows - 2, w + .6, 2)))
        for side, rid, rect in ends:
            regions.append({"id": f"road-{side}-{rid}", "label": f"Road in from the {side}", "rect": [round(v, 3) for v in rect],
                            "behaviors": [{"type": "trigger", "system": {"label": f"the road into {self.name} from the {side}", "does": "note", "who": "pcs"}}]})
        return {"format": "wodx-map", "version": 1, "name": self.name, "map": map_name, "cells": [self.cols, self.rows], "seed": self.seed,
                "kind": self.size, "era": "dark-ages", "population": self.population(),
                "openings": openings, "features": features, "regions": regions, "households": self.households}

    # ------------------------------------------------------------ plan view
    def plan_svg(self, path_out):
        s = 12
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.cols * s}" height="{self.rows * s}" font-family="DejaVu Sans" font-size="6">',
             '<rect width="100%" height="100%" fill="#e9efe0"/>']
        rect = lambda r, **a: f'<rect x="{r[0] * s:.1f}" y="{r[1] * s:.1f}" width="{r[2] * s:.1f}" height="{r[3] * s:.1f}" ' + " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in a.items()) + "/>"
        for _, r in self.roads: o.append(rect(r, fill="#c9b48a"))
        o.append(rect(self.market, fill="#d8c9a3", stroke="#8a7650", stroke_dasharray="3 2"))
        for g in self.gardens: o.append(rect(g["rect"], fill="#b9d3a0", stroke="#6b4f2a"))
        for b in self.blds:
            o += C.svg_rooms(b.rooms, s) + C.svg_openings(b.openings, s)
            o.append(f'<text x="{b.x * s + 2}" y="{b.y * s + 8}" font-size="7" fill="#123">{b.label}</text>')
        wx, wy = self.well
        o.append(f'<circle cx="{wx * s}" cy="{wy * s}" r="{.5 * s}" fill="#8db3d9" stroke="#333"/>')
        for _, x, y in self.stalls: o.append(rect((x, y, 2.6, 1.8), fill="none", stroke="#a30", stroke_dasharray="2 2"))
        o.append(f'<text x="6" y="{self.rows * s - 8}" font-size="11" font-weight="bold">{self.name}, a {self.cfg["label"]} of {self.population()} people in {len(self.households)} households</text>')
        o.append("</svg>")
        open(path_out, "w").write("\n".join(o))

    def make(self):
        self.lay_out()
        self.well = self.well_spot()
        self.stalls = self.market_things()
        ch = next(b for b in self.blds if b.type == "chapel")
        (fx, fy), _ = ch.front()
        self.stocks = (fx + (2.2 if ch.facing in "NS" else 0), fy + (0 if ch.facing in "NS" else 2.2))
        self.stocks = (self.stocks[0], self.stocks[1] + {"S": .8, "N": -.8, "E": 0, "W": 0}[ch.facing])
        return self

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1197)
    ap.add_argument("--size", choices=sorted(SIZES), default="village")
    ap.add_argument("--name")
    ap.add_argument("--assets", default="/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt")
    ap.add_argument("--day", action="store_true")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    C.init(a.seed, a.assets)
    t = Town(a.seed, a.size, a.name, not a.day).make()
    walls, patterns, objects, paths = t.build()
    base = slug(t.name)
    mapname = f"{base}.dungeondraft_map"
    lvl = C.level(t.cols, t.rows, walls, patterns, objects, paths, TERRAIN, t.splat(), NIGHT if t.night else DAY)
    C.write_map(f"{a.out}/{mapname}", t.cols, t.rows, a.seed, lvl)
    json.dump(t.sidecar(mapname), open(f"{a.out}/{base}.wodx.json", "w"), indent=1)
    t.plan_svg(f"{a.out}/{base}-plan.svg")
    kinds = {}
    for b in t.blds: kinds[b.label.split(" (")[0]] = kinds.get(b.label.split(" (")[0], 0) + 1
    print(f"ok: {t.name}, {t.cfg['label']}, {t.population()} people in {len(t.households)} households (aimed at {t.pop_target})")
    print("  " + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))
    print(f"  {len(walls)} walls, {sum(len(w['portals']) for w in walls)} portals, {len(objects)} objects, {len(paths)} paths, {len(t.gardens)} gardens")
    for n in t.notes: print("  note:", n)

if __name__ == "__main__":
    main()
