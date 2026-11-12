"""WoDX village, town and city generator, Dungeondraft edition.

Writes a .dungeondraft_map of a village, small town or city of the Dark Ages, its WoDX sidecar (doors, shutters,
chests, beds, hearths, the well, a region for every building and the market, and the households who live there)
and a plan-view SVG to check the logic by eye. Everything is WoDX's own code; the building types are in buildings.py.

How it decides where things go
  1. Roads: a main road runs east to west across the map. A village has lanes off it; a town has a crossroads and
     back streets; a city has a grid of back streets and cross lanes. The market (a village green in a village)
     sits where the main road and the lane meet.
  2. Population: a village aims at 70 to 120 people, a small town at 190 to 260, a city at 500 to 700; what the
     plots hold decides the real count (the summary and the sidecar give it). Households of one to eight.
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
  8. Parts: a place wider or taller than --part squares (64 by default, about the size of Rothenstein's maps) is
     cut into a grid of smaller maps, so a slower computer only loads one part at a time. The cuts run between
     buildings, never through one. Each part is its own Dungeondraft map and sidecar; trigger regions along each
     cut name the part next door, and <name>-parts.json lists every part, where it sits and what it borders.
     --part 0 keeps the whole place on one map.

Night: the map's ambient light is a night blue (Rothenstein's maps are drawn as night). --day keeps daylight.

Run: python3 ddtown.py [--seed N] [--size village|town|city|metropolis] [--name NAME] [--part SQUARES] [--assets LIST] [--day]
The asset list is every asset path in the Forgotten Adventures packs, one a line (the farmstead's copy:
/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt).
"""
import argparse, json, math, re

import ddcore as C
from ddcore import obj, wall_with_portals, pattern, path, splat_byte, overlaps, rdist
import buildings as B

SIZES = {
    "village": {"cols": 64, "rows": 48, "pop": (70, 120), "grid": 0, "market": (13, 8), "label": "village", "trades": 1, "stalls": 1},
    "town": {"cols": 96, "rows": 72, "pop": (190, 260), "grid": 1, "market": (17, 11), "label": "small town", "trades": 2.5, "stalls": 5},
    "city": {"cols": 168, "rows": 124, "pop": (500, 700), "grid": 3, "market": (21, 13), "label": "city", "trades": 2.5, "stalls": 9},
    "metropolis": {"cols": 560, "rows": 560, "pop": (5000, 7000), "grid": 0, "market": (30, 20), "label": "metropolis", "trades": 2.5, "stalls": 18},   # organic only
}
ROAD_HALF = 1.2
NIGHT, DAY = "ff6a7aa8", "ffffffff"
TERRAIN = ["Grass_A_03.webp", "Dirt_A_01.webp", "Cracked_Dirt_A_01.webp", "Forest_Floor_Needles_A_01.webp"]
PART = 64             # the largest side of one part, in squares, unless --part says otherwise

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

class Grid:
    """Rects in buckets of a few cells, so "what is near here" looks at the neighbourhood, not the whole map."""
    def __init__(self, cell=8): self.cell, self.b = cell, {}
    def _keys(self, x, y, w, h, pad=0):
        c = self.cell
        for i in range(math.floor((x - pad) / c), math.floor((x + w + pad) / c) + 1):
            for j in range(math.floor((y - pad) / c), math.floor((y + h + pad) / c) + 1): yield (i, j)
    def add(self, rect, item):
        for k in self._keys(*rect): self.b.setdefault(k, []).append((rect, item))
    def near(self, rect, pad=0):
        seen, out = set(), []
        for k in self._keys(*rect, pad):
            for r, it in self.b.get(k, ()):
                if id(it) not in seen: seen.add(id(it)); out.append((r, it))
        return out

def clip(rect, win):
    """A rect cut to a window, in the window's own cells, or None when they do not meet."""
    x0, y0 = max(rect[0], win[0]), max(rect[1], win[1])
    x1, y1 = min(rect[0] + rect[2], win[0] + win[2]), min(rect[1] + rect[3], win[1] + win[3])
    if x1 - x0 <= .05 or y1 - y0 <= .05: return None
    return [round(x0 - win[0], 3), round(y0 - win[1], 3), round(x1 - x0, 3), round(y1 - y0, 3)]

def inside(x, y, win, pad=0): return win[0] - pad <= x < win[0] + win[2] + pad and win[1] - pad <= y < win[1] + win[3] + pad

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
        n = cfg["grid"]
        bottom = self.rows + 2 if n else self.yc
        self.roads.append(("lane", (self.xc - g, -2, 2 * g, bottom + 2)))
        if n:
            # back streets behind the main road's plots, every so many squares, joined by cross lanes
            off = 18 + R.choice((0, 1, 2))
            x0, x1 = 10, self.cols - 10
            ys = [self.yc + s * off * k for k in range(1, n + 1) for s in (-1, 1) if 8 < self.yc + s * off * k < self.rows - 8]
            for yy in ys:
                side = "north" if yy < self.yc else "south"
                k = round(abs(yy - self.yc) / off)
                self.roads.append((f"back-{side}" + (f"-{k}" if k > 1 else ""), (x0, yy - g * .8, x1 - x0, 1.6 * g)))
            top, low = min(ys), max(ys)
            for k in range(1, n + 2):
                for side, s in (("west", -1), ("east", 1)):
                    xx = self.xc + s * 22 * k + R.uniform(-2, 2)
                    if not 12 < xx < self.cols - 12: continue
                    self.roads.append((f"cross-{side}" + (f"-{k}" if k > 1 else ""), (xx - g * .8, top, 1.6 * g, low - top)))
        else:
            # back lanes off the main road: one south on each side, and one more north
            side = R.choice((-1, 1))
            for nm, xx, north in (("lane-south-1", self.xc + side * (14 + R.uniform(0, 3)), False),
                                  ("lane-south-2", self.xc - side * (15 + R.uniform(0, 3)), False),
                                  ("lane-north", self.xc - side * (17 + R.uniform(0, 3)), True)):
                y0, y1 = (-2, self.yc) if north else (self.yc, self.rows + 2)
                self.roads.append((nm, (xx - g * .8, y0, 1.6 * g, y1 - y0)))
        self.blds, self.gardens, self.households, self.notes = [], [], [], []
        self.bgrid, self.ggrid = Grid(), Grid()

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
        for r, b in self.bgrid.near(rect, gap):
            if overlaps(rect, r, gap): return b.label
        for r, _ in self.ggrid.near(rect, .5):
            if overlaps(rect, r, .5): return "a garden"
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
        self.bgrid.add(b.rect, b)
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
        self.ggrid.add(rect, g)
        return g

    # ------------------------------------------------------------ the plan of the place
    def lay_out(self):
        R = self.R
        people = self.pop_target
        homes_needed = max(8, round(people / 4.8))
        big = self.cfg["trades"]
        # the chapel and the main tavern face the market first
        tavern = self.add("tavern", "Tavern", "middle", only={"market"})
        if not tavern: raise SystemExit("no room for the tavern on the market")
        chapel = self.add("chapel", "Chapel", "middle", only={"market"})
        if not chapel: raise SystemExit("no room for the chapel on the market")
        priest = self.add("cottage", "Priest's house", "middle")
        trade_blds = [tavern]
        if priest: priest.extra["priest"] = True
        for t, label, per, lo, hi, want in TRADES:
            if t in ("townhouse", "workshop"): per /= big        # a town lives by its trades
            if self.size == "city": hi *= 3
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
            farmer = R.random() < (.55 if self.size == "village" else .3 if self.size == "town" else .15)
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

    def population(self, keys=None):
        return sum(len(h["people"]) for h in self.households if keys is None or h["building"] in keys)

    # ------------------------------------------------------------ the square, trees and scatter (drawn once, placed per part)
    def well_spot(self):
        mx, my, mw, mh = self.market
        for fx, fy in ((.25, .25), (.75, .25), (.25, .75), (.75, .75)):
            x, y = mx + mw * fx, my + mh * fy
            if not any(overlaps((x - .9, y - .9, 1.8, 1.8), r) for _, r in self.roads): return (x, y)
        return (mx + 1.2, my + 1.2)

    def market_things(self):
        """Stalls (a table with crates, sacks and barrels) on the market; stocks by the chapel."""
        R = self.R
        out, taken = [], []
        wx, wy = self.well
        taken.append((wx - 1.2, wy - 1.2, 2.4, 2.4))
        mx, my, mw, mh = self.market
        n = self.cfg["stalls"]
        for _ in range(300):
            if len(out) >= n: break
            x, y = R.uniform(mx + .5, mx + mw - 3), R.uniform(my + .5, my + mh - 2)
            r = (x, y, 2.6, 1.8)
            if any(overlaps(r, rr, .2) for _, rr in self.roads) or any(overlaps(r, t, .4) for t in taken): continue
            taken.append(r)
            out.append(("stall", x, y))
        return out

    def tree_ok(self, x, y, rad):
        pt = (x, y, 0, 0)
        if any(rdist(x, y, *r) < rad * .7 + .5 for r, _ in self.bgrid.near(pt, rad + 1)): return False
        if any(rdist(x, y, *r) < rad * .6 for r, _ in self.ggrid.near(pt, rad + 1)): return False
        if any(rdist(x, y, *r) < rad * .5 + .3 for _, r in self.roads): return False
        if rdist(x, y, *self.market) < rad + .5: return False
        return True

    def edge_wood(self, x, y):
        """How far into the woods a point is, 0 in the settled middle to 1 well outside it."""
        near = [rdist(x, y, *r) for r, _ in self.bgrid.near((x, y, 0, 0), 9.5)] + [rdist(x, y, *self.market)]
        return max(0, min(1, (min(near) - 3) / 6))

    def scatter(self):
        """Everything placed by chance outside the buildings, as (asset, x, y, turn, scale, layer, reach). Drawn once,
        so every part of a split place shows the same trees where two parts meet. reach: how far it spreads."""
        R = self.R
        out = []
        for g in self.gardens:
            x, y, w, h = g["rect"]
            for row in range(int((h - .3) / .9)):
                for col in range(int((w - .3) / .8)):
                    out.append((R.choice([f"Bush_Green_B{i}_1x1.webp" for i in (1, 2, 3)]), x + .5 + col * .8, y + .55 + row * .9, R.uniform(0, 6.3), .5, 100, .3))
        for kind, x, y in self.stalls:
            out.append(("Table_Rectangle_Wood_Ashen_E_2x1.webp", x + 1.3, y + .5, 0, 1, 100, 1))
            for k, a in enumerate(R.sample(["Box_Crate_Wood_Ashen_A1_1x1.webp", "Sack_Brown_E_Wheat_1x1.webp", "Barrel_Wood_Ashen_A_1x1.webp", "Sack_Brown_E_Grains_1x1.webp"], 2)):
                out.append((a, x + .6 + k * 1.3, y + 1.4, R.uniform(-.3, .3), .75, 100, .4))
        wx, wy = self.well
        out.append(("Bucket_Wood_Ashen_A_1x1.webp", wx + .9, wy + .3, 0, .8, 100, .4))
        sx, sy = self.stocks
        out.append(("Stocks_Wood_Ashen_A1_1x1.webp", sx, sy, 0, 1, 100, .5))
        pines = [f"Pine_Green_Shadow_A{i}_5x5.webp" for i in range(1, 13)]
        broad = [f"Tree_Green_A{i}_{s}.webp" for i, s in ((1, "6x6"), (3, "6x5"), (5, "6x6"), (6, "5x5"), (9, "6x6"), (10, "5x5"))]
        placed = Grid(6)
        for _ in range(self.cols * self.rows * 3):
            x, y = R.uniform(-1.5, self.cols + 1.5), R.uniform(-1.5, self.rows + 1.5)
            wood = self.edge_wood(x, y)
            if R.random() > wood * .95 + .02: continue
            s = R.uniform(.75, 1.3); rad = 1.9 * s
            if not self.tree_ok(x, y, rad): continue
            if any(math.hypot(x - a, y - b) < (rad + c) * .55 for (a, b, _, _), c in placed.near((x, y, 0, 0), 2 * rad + 3)): continue
            placed.add((x, y, 0, 0), rad)
            big = wood > .5
            out.append((R.choice(pines if big else broad), x, y, R.uniform(-math.pi, math.pi), s if big else s * .45, 400, rad if big else rad * .6))
        for _ in range(self.cols * 3):                          # bushes and stones along the gaps
            x, y = R.uniform(1, self.cols - 1), R.uniform(1, self.rows - 1)
            if not self.tree_ok(x, y, .8) or self.edge_wood(x, y) > .6: continue
            if R.random() < .7: out.append((R.choice([f"Bush_Green_{c}{i}_1x1.webp" for c in "ABC" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), R.uniform(.7, 1.2), 100, .6))
            else: out.append((f"Rocks_Small_A{R.randint(1, 5)}_2x2.webp", x, y, R.uniform(0, 6.3), R.uniform(.4, .7), 100, .6))
        return out

    # ------------------------------------------------------------ parts: where to cut
    def cuts(self, length, part, across):
        """Cut lines along one side, on whole squares: as few parts as keep each about part squares, each cut moved
        to the nearby line that crosses the fewest buildings, without making the parts too uneven. across: "x" for cuts at x
        (vertical lines), "y" for cuts at y."""
        if not part or length <= part: return [0, length]
        n = math.ceil(length / part)
        lines = [0]
        for k in range(1, n):
            ideal = k * length / n
            lo, hi = max(lines[-1] + 12, math.floor(ideal - part / 4)), min(lines[-1] + part, math.ceil(ideal + part / 4))
            best = None
            for c in range(lo, hi + 1):
                if length - c > (n - k) * part: continue
                hit = sum(1 for b in self.blds if ((b.x - .4 < c < b.x + b.w + .4) if across == "x" else (b.y - .4 < c < b.y + b.h + .4)))
                key = hit * 6 + abs(c - ideal)       # a building crossed is worth six squares of evenness
                if best is None or key < best[0]: best = (key, c)
            lines.append(best[1] if best else round(ideal))
        return lines + [length]

    def parts(self, part):
        """The grid of parts. Each building belongs to the part its middle stands in; where a cut could not miss
        every building, that part reaches a little past the cut to hold the whole building ("win"), so the two
        parts overlap there and each shows it."""
        xs, ys = self.cuts(self.cols, part, "x"), self.cuts(self.rows, part, "y")
        out = []
        for j in range(len(ys) - 1):
            for i in range(len(xs) - 1):
                pid = f"{chr(65 + j)}{i + 1}" if (len(xs) - 1) * (len(ys) - 1) > 1 else ""
                cell = (xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j])
                x0, y0, x1, y1 = cell[0], cell[1], cell[0] + cell[2], cell[1] + cell[3]
                for b in self.blds:
                    if inside(b.x + b.w / 2, b.y + b.h / 2, cell):
                        x0, y0 = min(x0, math.floor(b.x - .5)), min(y0, math.floor(b.y - .5))
                        x1, y1 = max(x1, math.ceil(b.x + b.w + .5)), max(y1, math.ceil(b.y + b.h + .5))
                x0, y0, x1, y1 = max(0, x0), max(0, y0), min(self.cols, x1), min(self.rows, y1)
                out.append({"id": pid, "row": j, "col": i, "cell": cell, "win": (x0, y0, x1 - x0, y1 - y0),
                            "nrows": len(ys) - 1, "ncols": len(xs) - 1})
        return out

    # ------------------------------------------------------------ Dungeondraft, one part
    def mine(self, b, pt): return inside(b.x + b.w / 2, b.y + b.h / 2, pt["cell"])

    def build(self, pt):
        """Walls, floors, objects and fences for one part. Every building that reaches into it is drawn, so a
        building just over a cut still shows at the edge; only the part's own buildings get doors and households
        in the sidecar."""
        win = pt["win"]
        C.set_origin(win[0], win[1])
        walls, patterns, objects, paths = [], [], [], []
        for b in self.blds:
            if not overlaps(b.rect, win): continue
            walls.append(wall_with_portals(b.outline, b.t["wall"], b.openings, True))
            for a, c in b.partitions: walls.append(wall_with_portals([a, c], b.t["wall"], b.openings, False))
            for r in b.rooms:
                if B.FLOORS.get(r.floor):
                    patterns.append(pattern([(r.x, r.y), (r.x + r.w, r.y), (r.x + r.w, r.y + r.h), (r.x, r.y + r.h)], B.FLOORS[r.floor]))
                objects.extend(C.dressing_objects(r, True))
                for it in r.items:
                    rot = it.get("angle", 0.0 if not it["rot"] else math.pi / 2)
                    objects.append(obj(it["asset"], *C.centre(it), rot, it["scale"], 100))
                objects.extend(C.dressing_objects(r, False))
        for g in self.gardens:
            x, y, w, h = g["rect"]
            if not inside(x + w / 2, y + h / 2, win, 2): continue
            gate = next(b for b in self.blds if b.key == g["of"]).facing     # the gate is on the side toward the house
            corners = {"N": [(x, y), (x + w, y)], "E": [(x + w, y), (x + w, y + h)], "S": [(x + w, y + h), (x, y + h)], "W": [(x, y + h), (x, y)]}
            for side, (a, c) in corners.items():
                if side == gate:
                    m0 = (a[0] + (c[0] - a[0]) * .4, a[1] + (c[1] - a[1]) * .4); m1 = (a[0] + (c[0] - a[0]) * .6, a[1] + (c[1] - a[1]) * .6)
                    paths.append(path([a, m0], "Fence-Wood-Ashen-A.png", 64)); paths.append(path([m1, c], "Fence-Wood-Ashen-A.png", 64))
                else: paths.append(path([a, c], "Fence-Wood-Ashen-A.png", 64))
        wx, wy = self.well
        if inside(wx, wy, win, .6):
            ring = [(wx + .5 * math.cos(a * math.pi / 6), wy + .5 * math.sin(a * math.pi / 6)) for a in range(12)]
            walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
        for asset, x, y, rot, sc, layer, reach in self.deco:
            if inside(x, y, win, reach): objects.append(obj(asset, x, y, rot, sc, layer=layer))
        C.set_origin(0, 0)
        return walls, patterns, objects, paths

    def splat(self, win):
        """4 texels a cell: 1 grass, 2 road, 3 trodden (market and the ground at each door), 4 forest floor."""
        out, woods = [], {}
        ox, oy, cw, ch = win
        doors = [b.front()[1] for b in self.blds if inside(*b.front()[1], win, 2)]
        roads = [r for _, r in self.roads if overlaps(r, win, 1)]
        for ty in range(int(ch) * 4):
            for tx in range(int(cw) * 4):
                x, y = ox + (tx + .5) / 4, oy + (ty + .5) / 4
                dr = min([rdist(x, y, *r) for r in roads] or [9])
                road = min(1, max(0, (.35 - dr) / .35)) if dr > 0 else 1
                dm = rdist(x, y, *self.market)
                trod = min(1, max(0, (.6 - dm) / .6)) * .9
                for dx, dy in doors:
                    dd = math.hypot(x - dx, y - dy)
                    if dd < 1.6: trod = max(trod, (1.6 - dd) / 1.6 * .8)
                key = (math.floor(x * 2), math.floor(y * 2))         # woods change slowly: one reading for each half cell
                if key not in woods: woods[key] = self.edge_wood((key[0] + .5) / 2, (key[1] + .5) / 2)
                wood = woods[key]
                grass = 1 - wood
                wgt = [grass * (1 - road) * (1 - trod), road, trod * (1 - road), wood * (1 - road) * (1 - trod)]
                out.extend(splat_byte(wgt))
        return out

    # ------------------------------------------------------------ the WoDX sidecar, one part
    def sidecar(self, map_name, pt, base):
        win = pt["win"]
        ox, oy = win[0], win[1]
        sh = lambda pts: [round(v - (ox if i % 2 == 0 else oy), 3) for i, v in enumerate(pts)]
        openings, features, regions, keys = [], [], [], set()
        for b in self.blds:
            if not self.mine(b, pt): continue
            keys.add(b.key)
            for o in C.opening_entries(b.key, b.label, b.openings, b.centre):
                o["c"], o["inside"] = sh(o["c"]), sh(o["inside"]); openings.append(o)
            for r in b.rooms:
                for f in C.feature_entries(f"{b.key}-", r, b.t["fill"]):
                    f["rect"] = sh(f["rect"][:2]) + f["rect"][2:]; features.append(f)
            if b.t["place"]:
                regions.append({"id": b.key, "label": b.label, "rect": clip(b.rect, win), "place": {"kind": b.t["place"]}})
        wx, wy = self.well
        if inside(wx, wy, win):
            features.append({"id": "well", "label": "Well", "rect": sh([wx - .5, wy - .5]) + [1, 1],
                             "flags": {"climb": True, "climbKind": "rope", "height": 30, "depth": 30, "title": "Down the well on the bucket rope"}})
        m = clip(self.market, win)
        if m: regions.append({"id": "market", "label": "Village green" if self.size == "village" else "Market", "rect": m, "place": {"kind": "market"}})
        whole = (0, 0, self.cols, self.rows)
        for rid, r in self.roads:
            rc = clip(clip_whole(r, whole), win)
            if rc: regions.append({"id": f"street-{rid}", "label": {"main": "Main road", "lane": "Lane"}.get(rid, "Back street"), "rect": rc,
                                 "place": {"kind": "street" if rid in ("main", "lane") else "alley"}})
        # where each road leaves the whole place, and where this part meets the next
        for end in self.road_ends():
            side, rid, rect = end
            rc = clip(rect, win)
            if rc: regions.append({"id": f"road-{side}-{rid}", "label": f"Road in from the {side}", "rect": rc,
                                   "behaviors": [{"type": "trigger", "system": {"label": f"the road into {self.name} from the {side}", "does": "note", "who": "pcs"}}]})
        nb = self.neighbours(pt)
        for side, other in nb.items():
            x, y, w, h = 0, 0, win[2], win[3]
            rect = {"north": [x, y, w, 1], "south": [x, h - 1, w, 1], "west": [x, y, 1, h], "east": [w - 1, y, 1, h]}[side]
            regions.append({"id": f"edge-{side}", "label": f"To {self.name} {other}", "rect": rect,
                            "behaviors": [{"type": "trigger", "system": {"label": f"the way into {self.name} {other} ({side})", "does": "note", "who": "pcs"}}]})
        out = {"format": "wodx-map", "version": 1, "name": f"{self.name} {pt['id']}".strip(), "map": map_name, "cells": [int(win[2]), int(win[3])], "seed": self.seed,
               "place": {"kind": "yard" if self.size == "village" else "street"},
               "kind": self.size, "era": "dark-ages", "population": self.population(keys),
               "openings": openings, "features": features, "regions": regions, "households": [h for h in self.households if h["building"] in keys]}
        if pt["id"]:
            out["part"] = {"of": self.name, "id": pt["id"], "origin": [win[0], win[1]], "whole": [self.cols, self.rows], "neighbours": nb, "index": f"{base}-parts.json"}
        return out

    def road_ends(self):
        ends = []
        for rid, (x, y, w, h) in self.roads:
            if x < 0: ends.append(("west", rid, (0, y - .3, 2, h + .6)))
            if x + w > self.cols: ends.append(("east", rid, (self.cols - 2, y - .3, 2, h + .6)))
            if y < 0: ends.append(("north", rid, (x - .3, 0, w + .6, 2)))
            if y + h > self.rows: ends.append(("south", rid, (x - .3, self.rows - 2, w + .6, 2)))
        return ends

    def neighbours(self, pt):
        r, c, nr, nc = pt["row"], pt["col"], pt["nrows"], pt["ncols"]
        out = {}
        if r > 0: out["north"] = f"{chr(64 + r)}{c + 1}"
        if r < nr - 1: out["south"] = f"{chr(66 + r)}{c + 1}"
        if c > 0: out["west"] = f"{chr(65 + r)}{c}"
        if c < nc - 1: out["east"] = f"{chr(65 + r)}{c + 2}"
        return out

    # ------------------------------------------------------------ plan view, the whole place with its cuts
    def plan_svg(self, path_out, parts=()):
        s = 12 if self.cols <= 100 else 8
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
        for pt in parts:
            if not pt["id"]: continue
            o.append(rect(pt["cell"], fill="none", stroke="#7a1fa2", stroke_width=3, stroke_dasharray="10 6"))
            o.append(f'<text x="{pt["cell"][0] * s + 6}" y="{pt["cell"][1] * s + 22}" font-size="20" font-weight="bold" fill="#7a1fa2">{pt["id"]}</text>')
        o.append(f'<text x="6" y="{self.rows * s - 8}" font-size="11" font-weight="bold">{self.name}, a {self.cfg["label"]} of {self.population()} people in {len(self.households)} households'
                 + (f', in {len(parts)} parts' if len(parts) > 1 else "") + '</text>')
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
        self.deco = self.scatter()
        return self

def clip_whole(r, whole):
    """A road cut to the map, in map cells."""
    c = clip(r, whole)
    return tuple(c) if c else (0, 0, 0, 0)

def street_plan(t, pt):
    """The ways of one part as centre lines in its own squares, with the river and the brooks: what runs under
    the streets (sewers, culverts) is laid from this (ddwarren.py). Only written when --plan asks for it."""
    import geom as G
    win = pt["win"]
    loc = lambda q: [round(q[0] - win[0], 2), round(q[1] - win[1], 2)]
    def lines(pts):
        return [[loc(q) for q in piece] for piece in G.clip_line(list(pts), win) if len(piece) >= 2]
    streets = []
    for a, b, half, kind in t.segs:
        for piece in lines([a, b]): streets.append({"kind": kind, "half": half, "line": piece[0] + piece[-1]})
    return {"streets": streets, "river": lines(t.river_line) if t.river_line else [], "riverHalf": round(getattr(t, "river_half", 0), 2),
            "brooks": [l for st in t.streams for l in lines(st["line"])]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1197)
    ap.add_argument("--size", choices=sorted(SIZES), default="village", help="metropolis: organic layout only, about 560 squares across and 1,400 households, in some 80 part maps")
    ap.add_argument("--name")
    ap.add_argument("--part", type=int, default=PART, help="the largest side of one map, in squares; 0 keeps one map")
    ap.add_argument("--assets", default="/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt")
    ap.add_argument("--layout", choices=("organic", "grid"), default="organic", help="organic: winding streets, wards and walls (organic.py); grid: straight streets")
    ap.add_argument("--walls", choices=("random", "yes", "no"), default="random", help="organic layout only: a curtain wall round the town")
    ap.add_argument("--river", choices=("random", "yes", "no"), default="random", help="organic layout only: a river across the map")
    ap.add_argument("--land", choices=("random", "plain", "hills", "upland", "foothills", "mountain", "karst"), default="random", help="organic layout only: the landform the town stands in (land.py); random picks by Moravian odds")
    ap.add_argument("--year", type=int, help="organic layout only: grow the medieval town through every later age up to this year (eras.py)")
    ap.add_argument("--at", help="organic layout only: where the town stands on the country map, as town, or town:km:DIR (brno:12:NE). The landform and the river then come from the country there, unless --land or --river says otherwise")
    ap.add_argument("--plan", action="store_true", help="organic layout only: add the street plan (centre lines of the ways, the river and the brooks) to each sidecar, for ddwarren.py to lay sewers and culverts under")
    ap.add_argument("--settle", action="store_true", help="organic layout only: also write <name>.settlement.json, the record of the whole place (households, trades, ties) that WoDX NPC's Settlements window reviews; household ids then carry the settlement's id")
    ap.add_argument("--day", action="store_true")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    where = None
    if a.at:
        import country
        try: where = country.land_at(a.at, a.year or 1197)
        except ValueError as e: raise SystemExit(str(e))
        if a.land == "random": a.land = where["landform"]
        if a.river == "random": a.river = "yes" if where["river"] and where["river"]["km"] <= 5 else "no"
    if a.part and a.part < 24: raise SystemExit("--part must be 24 squares or more (or 0 for one map)")
    if a.size == "metropolis" and a.layout != "organic": raise SystemExit("a metropolis needs the organic layout")
    C.init(a.seed, a.assets)
    if a.layout == "organic":
        import organic
        t = organic.OrganicTown(a.seed, a.size, a.name, not a.day, {"random": None, "yes": True, "no": False}[a.walls], {"random": None, "yes": True, "no": False}[a.river], a.year, a.part, None if a.land == "random" else a.land).make()
    else:
        t = Town(a.seed, a.size, a.name, not a.day).make()
    base = slug(t.name)
    settled = None
    if a.settle:
        if a.layout != "organic": raise SystemExit("--settle needs the organic layout")
        import settle
        settled = {"id": settle.stamp(t), "parts": []}
    parts = t.parts(a.part)
    index = {"format": "wodx-map-parts", "version": 1, "name": t.name, "kind": t.size, "seed": a.seed, "whole": [t.cols, t.rows],
             "population": t.population(), "parts": []}
    totals = [0, 0, 0]
    for pt in parts:
        stem = f"{base}-{pt['id'].lower()}" if pt["id"] else base
        mapname = f"{stem}.dungeondraft_map"
        walls, patterns, objects, paths = t.build(pt)
        cw, ch = int(pt["win"][2]), int(pt["win"][3])
        lvl = C.level(cw, ch, walls, patterns, objects, paths, TERRAIN, t.splat(pt["win"]), NIGHT if t.night else DAY)
        C.write_map(f"{a.out}/{mapname}", cw, ch, a.seed, lvl)
        sc = t.sidecar(mapname, pt, base)
        if where:
            # The country the map stands in, and where a paid ride is taken from in this year (B2339).
            sc["country"] = {"at": a.at, **where}
            stops = []
            for r in sc.get("regions", []):
                if r.get("label") == "Tavern" and not any(x["mode"] == "hire:coach" for x in stops) and (a.year or 1197) <= 1945: stops.append({"mode": "hire:coach", "region": r["id"], "label": "Coach stand at the tavern"})
                if r.get("label") == "Railway station" and not any(x["mode"] == "hire:train" for x in stops): stops.append({"mode": "hire:train", "region": r["id"], "label": "Railway station"})
                if r.get("label") == "Bus station" and not any(x["mode"] == "hire:bus" for x in stops): stops.append({"mode": "hire:bus", "region": r["id"], "label": "Bus station"})
                if r.get("label") == "Pod station" and not any(x["mode"] == "hire:pod" for x in stops): stops.append({"mode": "hire:pod", "region": r["id"], "label": "Pod station"})
            sc["transit"] = stops
        if a.plan and a.layout == "organic": sc["plan"] = street_plan(t, pt)
        if settled:
            sc["settlement"] = {"id": settled["id"], "name": t.name, "year": t.year or 1197}
            settled["parts"].append({"id": pt["id"], "name": sc["name"], "map": mapname, "sidecar": f"{stem}.wodx.json", "household_ids": [h["id"] for h in sc["households"]]})
        json.dump(sc, open(f"{a.out}/{stem}.wodx.json", "w"), indent=1)
        totals[0] += len(walls); totals[1] += sum(len(w["portals"]) for w in walls); totals[2] += len(objects)
        index["parts"].append({"id": pt["id"], "map": mapname, "sidecar": f"{stem}.wodx.json", "origin": list(pt["win"][:2]), "cells": [cw, ch], "cut": list(pt["cell"]),
                               "neighbours": sc.get("part", {}).get("neighbours", {}), "households": len(sc["households"]), "population": sc["population"]})
        if len(parts) > 1: print(f"  part {pt['id']}: {cw} x {ch} squares, {len(sc['households'])} households, {len(walls)} walls, {len(objects)} objects")
    if len(parts) > 1: json.dump(index, open(f"{a.out}/{base}-parts.json", "w"), indent=1)
    t.plan_svg(f"{a.out}/{base}-plan.svg", parts)
    if settled:
        import settle, eras
        rec = settle.record(t, settled["parts"], B.TYPES, eras.era_id(t.year), {"at": a.at, **where} if where else None)
        settle.write(f"{a.out}/{base}.settlement.json", rec)
        print(f"  settlement: {rec['id']}, {rec['population']} people in {len(rec['households'])} households, {len(rec['ties'])} ties, {len(rec['notables'])} offices -> {base}.settlement.json")
    kinds = {}
    for b in t.blds: kinds[b.label.split(" (")[0]] = kinds.get(b.label.split(" (")[0], 0) + 1
    print(f"ok: {t.name}, {'walled ' if getattr(t, 'wall', None) else ''}{t.cfg['label']}, {t.population()} people in {len(t.households)} households (aimed at {t.pop_target})"
          + (f", in {len(parts)} parts" if len(parts) > 1 else ""))
    print("  " + ", ".join(f"{k} {v}" for k, v in sorted(kinds.items())))
    print(f"  {totals[0]} walls, {totals[1]} portals, {totals[2]} objects, {len(t.gardens)} gardens")
    for n in t.notes: print("  note:", n)
    if where: print(f"  country: {where['km'] or ''}{' km ' + where['dir'] + ' of ' if where['km'] else 'at '}{where['town']}, {where['land']}" + (f" ({where['landName']})" if where["landName"] else "")
                    + (f", {where['river']['name']} {where['river']['km']} km off" if where["river"] else "") + f"; drawn as {a.land}, river {a.river}")

if __name__ == "__main__":
    main()
