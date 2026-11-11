"""WoDX village, town and city generator, organic layout. The street plan comes from layout.py (a port of the
Medieval Fantasy City Generator's layout steps); the buildings are WoDX's own furnished types from buildings.py,
each turned to face its street, in steps of 15 degrees.

How it decides where things go
  1. The layout gives patches, a market, wards, the curtain wall with its gates, and the arteries (the main
     streets and roads). Every edge between two town patches is a street; arteries and the market's edges are
     wide, the rest narrower. Outside the wall, only the roads are ways.
  2. Each town patch, shrunk back from its streets (and from the wall), is a block. Buildings stand along the
     block's edges, fronts to the street, set back a little, side by side with a gap. Which types a block holds
     depends on its ward: workshops and houses for the craftsmen, houses and shops and storehouses for the
     merchants, crowded cottages for the poor, the watch by the wall, inns and stores at the gates (a house rule,
     not a book table).
  3. The tavern takes the best spot on the market first, then the chapel (in the church ward, or on the market
     when there is none), then the priest's house beside it.
  4. Countryside patches by a road may be farms: a farmhouse and a barn by the road.
  5. Homes get a fenced garden behind them where there is room; woods close in outside the town; households
     are made for every home and trade, as in ddtown.py.
The map's size follows the layout: about 1.5 squares to each of the original's units, with a margin of country.
"""
import math, json

import ddcore as C
from ddcore import obj, wall_with_portals, pattern, path, splat_byte, overlaps, rdist
import buildings as B
import geom as G
import land as LAND
import layout as L
import ddtown as T

ORGANIC = {
    "village": {"n": 5, "walls": 0, "scale": 1.6, "margin": 12, "label": "village", "stalls": 1, "river": .5, "rhalf": 1.3, "sinuosity": 1.4},
    "town": {"n": 10, "walls": .6, "scale": 1.6, "margin": 10, "label": "small town", "stalls": 5, "river": .6, "rhalf": 1.8, "sinuosity": 1.6},
    "city": {"n": 18, "walls": 1, "scale": 1.6, "margin": 10, "label": "city", "stalls": 9, "river": .75, "rhalf": 2.3, "sinuosity": 1.5},
    "metropolis": {"n": 60, "walls": 1, "scale": 1.6, "margin": 10, "label": "metropolis", "stalls": 18, "river": .85, "rhalf": 2.8, "sinuosity": 1.5},
}
STEP = math.radians(15)
HALF = {"main": 1.3, "street": .85, "road": 1.1, "alley": .6}            # half widths of the ways, in squares
INSET = {"main": 1.5, "street": 1.05, "wall": 1.8, "road": 1.4, "none": .3, "river": 3.2}
MIX = {   # (type, weight) by ward; a house rule
    "craftsmen": [("workshop", 4), ("cottage", 3), ("townhouse", 2), ("smithy", .4), ("bakehouse", .5), ("storehouse", .4)],
    "merchant": [("townhouse", 6), ("storehouse", 2), ("workshop", 1), ("tavern", .5)],
    "market": [("townhouse", 5), ("storehouse", 2), ("bakehouse", 1)],
    "patriciate": [("townhouse", 5), ("cottage", 1)],
    "slum": [("cottage", 8), ("workshop", 1)],
    "administration": [("guardhouse", 1), ("townhouse", 4)],
    "military": [("guardhouse", 3), ("storehouse", 1), ("smithy", 1), ("cottage", 2)],
    "gate": [("tavern", 1), ("storehouse", 2), ("smithy", 1), ("cottage", 3), ("guardhouse", 1)],
    "gate-out": [("cottage", 4), ("smithy", 1), ("workshop", 1.5), ("byre-house", 1.5), ("tavern", 1), ("storehouse", .5)],
    "church": [("cottage", 3), ("townhouse", 1)],
    "village": [("cottage", 5), ("byre-house", 3), ("workshop", 1), ("smithy", .5), ("bakehouse", .4)],
}
SPACING = {   # (set back from the street, gap between buildings) by ward
    "slum": (.3, .3), "craftsmen": (.4, .35), "merchant": (.35, .3), "market": (.4, .35), "patriciate": (1.0, 1.4),
    "administration": (.6, .8), "military": (.8, 1.0), "gate": (.6, .8), "gate-out": (1.2, 1.6), "church": (.8, 1.0),
    "village": (1.0, 1.6), "farm": (1.6, 2.5),
}
LOT = {   # the smallest lot, in square squares, by ward
    "slum": 60, "craftsmen": 80, "merchant": 80, "market": 80, "patriciate": 140, "administration": 90, "military": 90,
    "gate": 90, "gate-out": 150, "church": 90, "village": 170,
}
PLOT_DEPTH = {   # how far a house's plot runs back from the street, in squares, by ward (burgage plots; a house rule)
    "slum": (4, 7), "craftsmen": (10, 16), "merchant": (12, 18), "market": (10, 14), "patriciate": (14, 20),
    "administration": (10, 14), "military": (6, 9), "gate": (10, 14), "gate-out": (14, 20), "church": (10, 15), "village": (16, 24),
}
NO_PLOT = {"chapel", "guardhouse", "barn"}
DIRTY_TRADES = ["tanner", "dyer", "butcher", "fuller", "chandler"]     # smell, blood, lye and tallow: kept downstream or out by the wall
CLEAN_TRADES = ["carpenter", "cooper", "weaver", "potter", "cobbler", "wheelwright", "turner", "basket maker"]
WEALTH_WALL = {"rich": "StoneWood_Ashen_A.png", "middling": "PlasterWood_Ashen_A.png", "poor": "Wood_Ashen_A.png"}
COURTS = {"slum", "craftsmen"}   # wards that build on alleys and back to back, packing yards into courts
BACK_TO_BACK = {"village": 24, "gate-out": 22, "patriciate": 20}   # the least depth for two frontages back to back, else 16
TERRACED = {"merchant": 1, "market": 1, "administration": .8, "gate": .6, "craftsmen": .6, "slum": .5}   # chance a frontage is a row
CAPS = {"village": {"smithy": 1, "bakehouse": 1, "tavern": 1, "guardhouse": 0, "storehouse": 1},
        "town": {"smithy": 2, "bakehouse": 2, "tavern": 2, "guardhouse": 2, "storehouse": 3},
        "city": {"smithy": 4, "bakehouse": 5, "tavern": 4, "guardhouse": 5, "storehouse": 7},
        "metropolis": {"smithy": 12, "bakehouse": 15, "tavern": 12, "guardhouse": 14, "storehouse": 20}}
LABELS = {"cottage": "Cottage", "byre-house": "Farmhouse", "smithy": "Smithy", "bakehouse": "Bakehouse", "tavern": "Alehouse",
          "storehouse": "Storehouse", "guardhouse": "Guardhouse", "barn": "Barn", "chapel": "Chapel"}

SLOPE_MAX = .3                                             # rise over run a house can be terraced into (a little more in town)


def snap(a): return round(a / STEP) * STEP

def box_corners(cx, cy, th, w, h):
    c, s = math.cos(th), math.sin(th)
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]

def even_cuts(length, part):
    """Equal parts along one side, as few as keep each within part squares."""
    if not part or length <= part: return [0, length]
    n = math.ceil(length / part)
    return [round(k * length / n) for k in range(n + 1)]

def seg_cross(a, b, p, q):
    """Where two segments cross, or None."""
    d1, d2 = (b[0] - a[0], b[1] - a[1]), (q[0] - p[0], q[1] - p[1])
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-12: return None
    t = ((p[0] - a[0]) * d2[1] - (p[1] - a[1]) * d2[0]) / den
    u = ((p[0] - a[0]) * d1[1] - (p[1] - a[1]) * d1[0]) / den
    return (a[0] + d1[0] * t, a[1] + d1[1] * t) if 0 <= t <= 1 and 0 <= u <= 1 else None


def meander(R, th, length, B, K):
    """A river's middle line by the sine-generated curve (Langbein and Leopold) with Kinoshita's skew and flattening:
    the heading swings as a sine of the distance along the stream. Bends repeat about every 11 widths of water (B),
    their size set by the sinuosity K; each bend varies a little so no two match. A loop that grows back until it
    nearly meets itself is cut off across its neck, as a flood would cut it, and kept as an oxbow.
    Returns the line (points about 2 squares apart, starting at 0, 0, running along heading th) and the oxbows."""
    ds = 2.0
    th0 = math.radians(125 * math.sqrt((K - 1) / K))
    js, jf = R.uniform(.01, .05), R.uniform(.0, .04)          # skew downstream, flattened bend tops
    pts, x, y, ph, s = [(0.0, 0.0)], 0.0, 0.0, R.uniform(0, 2 * math.pi), 0.0
    lam, amp = 11 * B * R.uniform(.85, 1.15), th0 * R.uniform(.85, 1.15)
    n = (-math.sin(th), math.cos(th))
    while s < length * K:
        side = x * n[0] + y * n[1]                            # drift back toward the valley line, gently
        head = th + amp * math.sin(ph) + amp ** 3 * (js * math.cos(3 * ph) - jf * math.sin(3 * ph)) - .004 * side
        x, y = x + ds * math.cos(head), y + ds * math.sin(head)
        pts.append((x, y))
        old = ph
        ph += 2 * math.pi * ds / (lam * K)
        if int(old / math.pi) != int(ph / math.pi):           # a new bend: its own size
            lam, amp = 11 * B * R.uniform(.85, 1.15), th0 * R.uniform(.8, 1.2)
        s += ds
        if (x * math.cos(th) + y * math.sin(th)) > length: break
    oxbows, gap, i = [], 4 * B / ds, 0
    while i < len(pts):                                       # cut-offs: the neck closes to under two widths
        hit = next((j for j in range(len(pts) - 1, int(i + gap), -1) if math.dist(pts[i], pts[j]) < 2 * B), None)
        if hit:
            oxbows.append(pts[i:hit + 1])
            neck = [(pts[i][0] + (pts[hit][0] - pts[i][0]) * t / 4, pts[i][1] + (pts[hit][1] - pts[i][1]) * t / 4) for t in range(1, 4)]
            pts = pts[:i + 1] + neck + pts[hit:]
        i += 1
    return pts, oxbows

def grown_margin(year):
    """Room round the old town for what later eras build outside it: mills and schools on the roads out,
    then estates of panel blocks. None (no era given) keeps the medieval map."""
    if not year: return 0
    return 0 if year < 1840 else 6 if year < 1900 else 12 if year < 1950 else 18


class OrganicTown(T.Town):
    def __init__(self, seed, size, name=None, night=True, walls=None, river=None, year=None, part=None, land=None):
        self.R = R = C.R
        cfg = dict(ORGANIC[size])
        self.size, self.cfg, self.seed, self.night = size, cfg, seed, night
        self.year, self.era_ways, self.era_areas, self.layers = year, [], [], []
        self.part, self.cut_xs, self.cut_ys = part, [], []
        self.name = name or (R.choice(T.NAME_A) + R.choice(T.NAME_B))
        self.pop_target = R.randint(*T.SIZES[size]["pop"])
        want_walls = (R.random() < cfg["walls"]) if walls is None else walls
        self.L = lay = L.Layout(cfg["n"], want_walls, size)
        s = cfg["scale"]
        inner_pts = [lay.pt(v) for p in lay.inner for v in p["v"]]
        x0, x1 = min(p[0] for p in inner_pts), max(p[0] for p in inner_pts)
        y0, y1 = min(p[1] for p in inner_pts), max(p[1] for p in inner_pts)
        m = cfg["margin"] + grown_margin(year)
        self.cols, self.rows = math.ceil((x1 - x0) * s + 2 * m), math.ceil((y1 - y0) * s + 2 * m)
        mx = my = m
        if part:                                              # even parts: shift the town so no line crosses the market
            mk = [((lay.pt(v)[0] - x0) * s, (lay.pt(v)[1] - y0) * s) for v in lay.plaza["v"]]
            def shift(size, lo, hi):
                n0 = math.ceil(size / part)
                for d in sorted(range(0, part), key=lambda d: (math.ceil((size + d) / part) > n0, d)):   # no extra part if it can be helped
                    L_ = size + d
                    cs = even_cuts(L_, part)
                    if not any(lo + m + d - 2 < c < hi + m + d + 2 for c in cs[1:-1]): return d
                return 0
            dx = shift(self.cols, min(q[0] for q in mk), max(q[0] for q in mk))
            dy = shift(self.rows, min(q[1] for q in mk), max(q[1] for q in mk))
            self.cols, self.rows, mx, my = self.cols + dx, self.rows + dy, m + dx, m + dy
        to = lambda p: (round((p[0] - x0) * s + mx, 4), round((p[1] - y0) * s + my, 4))
        self.P = {v: to(xy) for v, xy in lay.V.items()}
        self.patches = lay.patches
        for p in self.patches: p["poly"] = [self.P[v] for v in p["v"]]
        self.plaza = lay.plaza
        self.market_poly = self.plaza["poly"]
        self.market = G.bbox(self.market_poly)
        self.xc, self.yc = G.centroid(self.market_poly)
        self.wall = [self.P[v] for v in lay.wall] if lay.wall else None
        self.gates = [self.P[g] for g in lay.gates]
        self.outline = [self.P[v] for v in lay.border]
        self.arteries = [[self.P[v] for v in a] for a in lay.arteries]
        self.river_e, self.river_v = set(), []
        self.land_kind = land or LAND.pick_kind(R)            # the landform the town stands in (the landform study)
        self.land, self.streams, self.sinks = None, [], []
        if (R.random() < cfg["river"]) if river is None else river: self.pick_river()
        self.ways()
        self.settle_land()
        self.roads = []                                       # the grid generator's road rects: none here
        self.blds, self.gardens, self.households, self.notes = [], [], [], []
        self.plots, self.frontages, self.burned = [], {}, []
        self.bgrid, self.ggrid = T.Grid(), T.Grid()
        self.count = {}

    # ------------------------------------------------------------ streets, roads and blocks
    def ways(self):
        lay = self.L
        owners = {}
        for p in self.patches:
            vs = p["v"]
            for i in range(len(vs)):
                owners.setdefault(frozenset((vs[i], vs[(i + 1) % len(vs)])), []).append(p)
        wall_e = {frozenset((lay.wall[i], lay.wall[(i + 1) % len(lay.wall)])) for i in range(len(lay.wall))} if lay.wall else set()
        plaza_v = set(self.plaza["v"])
        self.edge_kind, self.segs = {}, []
        for e, ps in owners.items():
            inner = [p for p in ps if p["inner"]]
            if e in wall_e: k = "wall"
            elif e in lay.art_edges: k = "main" if inner else "road"
            elif inner and len(e & plaza_v) == 2: k = "main"
            elif inner: k = "street"
            else: k = "none"
            self.edge_kind[e] = k
            if k in HALF:
                a, b = (self.P[v] for v in e)
                self.segs.append((a, b, HALF[k], k))
        # lead the roads off the map: carry each road's outer end on in its own direction
        self.road_lines = []
        for art in self.arteries:
            if len(art) < 2: continue
            pts = list(art)
            for end in (0, -1):
                a, b = (pts[0], pts[1]) if end == 0 else (pts[-1], pts[-2])
                if self.in_town(a): continue
                d = (a[0] - b[0], a[1] - b[1]); L_ = math.hypot(*d) or 1
                far = (a[0] + d[0] / L_ * 400, a[1] + d[1] / L_ * 400)
                if end == 0: pts.insert(0, far)
                else: pts.append(far)
                self.segs.append((a, far, HALF["road"], "road"))
            self.road_lines.append(pts)
        self.seg_grid = T.Grid(6)
        for sg in self.segs:
            (ax, ay), (bx, by), h, _ = sg
            self.seg_grid.add((min(ax, bx) - h, min(ay, by) - h, abs(bx - ax) + 2 * h, abs(by - ay) + 2 * h), sg)
        self.river_line, self.bridges, self.landings, self.grates = [], [], [], []
        if self.river_v: self.lay_river()

    def in_town(self, p): return G.inside(p, self.outline)

    def settle_land(self):
        """The ground worn down by water once the river is laid: side valleys, brooks running to the river, karst
        sinkholes. Houses keep off the brooks, the sinkholes and slopes too steep to build on."""
        if not self.land:                                     # no river: the same landform, with no main valley
            town_r = max(math.dist((self.xc, self.yc), q) for q in self.outline) if self.outline else 30
            self.land = LAND.Land(self.R, self.cols, self.rows, self.R.uniform(0, 2 * math.pi), (self.xc, self.yc, max(town_r, 20)), None, 40, self.land_kind)
        self.land.erode(self.river_line or None, getattr(self, "river_half", 0), self.in_town)
        self.streams, self.sinks = self.land.streams, self.land.sinks
        self.wet_grid = T.Grid(8)                             # brooks and sinkholes, padded by what a house keeps off
        for st in self.streams:
            r = st["half"] + 1.5
            for a, b in zip(st["line"], st["line"][1:]):
                self.wet_grid.add((min(a[0], b[0]) - r, min(a[1], b[1]) - r, abs(b[0] - a[0]) + 2 * r, abs(b[1] - a[1]) + 2 * r), (a, b, r))
        for x, y, rad in self.sinks:
            self.wet_grid.add((x - rad - 2, y - rad - 2, 2 * rad + 4, 2 * rad + 4), ((x, y), (x, y), rad + 2))

    # ------------------------------------------------------------ the river
    def pick_river(self):
        """A river across the whole map, winding gently, passing to one side of the market (towns grow beside their
        rivers, not over them). It is not tied to the patches: buildings, plots and gardens keep off its banks, and
        each way that crosses it gets a bridge."""
        R = self.R
        h = self.river_half = self.cfg["rhalf"]
        mr = max(math.dist((self.xc, self.yc), q) for q in self.market_poly)
        town_r = max(math.dist((self.xc, self.yc), q) for q in self.outline) if self.outline else 30
        far = math.hypot(self.cols, self.rows)
        cands = []
        B = 2.5 * h                                           # the water's width on the map
        K = self.cfg.get("sinuosity", 1.6)
        cx, cy = self.xc, self.yc
        def avoid(x, y):                                      # the water keeps off the market and its streets
            d = math.hypot(x - cx, y - cy)
            return 400.0 if d < mr + h + 4 else (60.0 if d < mr + h + 10 else 0.0)
        for _ in range(5):                                    # several valleys; the one whose river runs along the fewest ways wins
            th = R.uniform(0, 2 * math.pi)
            n = (-math.sin(th), math.cos(th))
            off = R.choice((-1, 1)) * R.uniform(mr + h + 6, max(mr + h + 7, town_r * .55))
            for _ in range(6):
                vp = (cx + n[0] * off, cy + n[1] * off)
                ground = LAND.Land(R, self.cols, self.rows, th, (cx, cy, max(town_r, 20)), vp, max(18, 4 * B), self.land_kind)
                course = ground.course(avoid)
                if len(course) < 3: off *= 1.2; continue
                pts, oxbows = LAND.shape(R, ground, course, B, K, meander)
                inside = sum(math.dist(a_, b_) for a_, b_ in zip(pts, pts[1:]) if 0 < a_[0] < self.cols and 0 < a_[1] < self.rows)
                if inside < .7 * min(self.cols, self.rows): off *= 1.2; continue   # a river across the map, not past a corner
                if min(G.seg_dist(q, a_, b_) for q in self.market_poly for a_, b_ in zip(pts, pts[1:])) > h + 3: break
                off *= 1.2
            else: continue
            cands.append((pts, oxbows, ground))
        if not cands: return
        self.river_cands = cands
        pts = cands[0][0]
        self.river_v = pts                                    # the flow runs from the first point to the last

    def lay_river(self):
        """The river's line, its banks kept clear, and bridges where a way crosses it."""
        h = self.river_half
        def along(pts):
            """How much of the ways would lie in the water: squares of way within the river's band, less the crossings."""
            n = 0
            for a, b, hh, k in self.segs:
                L_ = math.dist(a, b)
                for i in range(int(L_) + 1):
                    q = (a[0] + (b[0] - a[0]) * i / max(L_, 1), a[1] + (b[1] - a[1]) * i / max(L_, 1))
                    if abs(q[0] - self.xc) > self.cols or abs(q[1] - self.yc) > self.rows: continue
                    if min(G.seg_dist(q, p_, q_) for p_, q_ in zip(pts, pts[1:])) < h + hh: n += 1
                if not any(seg_cross(a, b, p_, q_) for p_, q_ in zip(pts, pts[1:])):
                    for q in (a, b):                          # a way that stops in the water costs the most
                        if min(G.seg_dist(q, p_, q_) for p_, q_ in zip(pts, pts[1:])) < 1.25 * h + hh: n += 30
            for g in self.gates:                              # nor through a town gate
                if min(G.seg_dist(g, p_, q_) for p_, q_ in zip(pts, pts[1:])) < 1.25 * h + 4: n += 50
            return n
        pts, oxbows, self.land = min(getattr(self, "river_cands", [(self.river_v, [], None)]), key=lambda c: along(c[0]))
        self.river_v = self.river_line = pts
        self.limit_bridges()
        # the water's own edges (a width that changes, ragged banks, gravel bars in the bends) and the floodplain
        self.banks = LAND.banks(self.R, pts, 1.25 * h, self.land.noise) if self.land else None
        self.fp_half = (6 if self.size == "village" else 10) * h if self.land else 0             # meadow either side, about four widths of water
        self.fp_grid = T.Grid(8)
        for a, b in zip(pts, pts[1:]):
            r = self.fp_half
            self.fp_grid.add((min(a[0], b[0]) - r, min(a[1], b[1]) - r, abs(b[0] - a[0]) + 2 * r, abs(b[1] - a[1]) + 2 * r), (a, b))
        # an old loop the river cut off: still water where no way comes near it, else silted up to a wet meadow hollow
        self.oxbows, self.old_loops = [], []
        for ox in oxbows:
            ox = G.clip_line(ox, (2, 2, self.cols - 4, self.rows - 4))
            for piece in ox:
                if len(piece) < 4: continue
                near = any(G.seg_dist(q, a, b) < h + hh + 1.5 for q in piece[::2] for a, b, hh, k in self.segs)
                (self.old_loops if near else self.oxbows).append(piece)
        for piece in self.oxbows:
            for a, b in zip(piece, piece[1:]):
                sg = (a, b, h + .4, "oxbow")                  # nothing is built on it, as on the river
                self.seg_grid.add((min(a[0], b[0]) - h, min(a[1], b[1]) - h, abs(b[0] - a[0]) + 2 * h, abs(b[1] - a[1]) + 2 * h), sg)
        self.trim_to_banks()
        for a, b in zip(pts, pts[1:]):
            sg = (a, b, h + .4, "river")                     # in the way grid (so nothing is built on it), not a way
            self.seg_grid.add((min(a[0], b[0]) - h, min(a[1], b[1]) - h, abs(b[0] - a[0]) + 2 * h, abs(b[1] - a[1]) + 2 * h), sg)
        cand = []
        for a, b, hh, k in self.segs:
            for p, q in zip(pts, pts[1:]):
                x = seg_cross(a, b, p, q)
                if x: cand.append((x, (b[0] - a[0], b[1] - a[1]), k, (q[0] - p[0], q[1] - p[1])))
        for x, d, k, f in cand:
            if any(math.dist(x, br["at"]) < 4 for br in self.bridges): continue
            L_, Lf = math.hypot(*d) or 1, math.hypot(*f) or 1
            sin = abs(d[0] * f[1] - d[1] * f[0]) / L_ / Lf                 # the way's slant across the stream
            self.bridges.append({"at": x, "dir": (d[0] / L_, d[1] / L_), "len": 2 * h / max(sin, .5) + 2.4, "w": 2.8 if k in ("main", "road") else 2.0})

    def limit_bridges(self):
        """Bridges only where they are needed, as in a real town, where a bridge was a costly work kept up by tolls:
        the roads through the town (its arteries) keep their crossings unless another road's bridge is close by,
        and a lesser street gets one only where no bridge stands within a long walk. Any other way that met the
        river is cut at the crossing; trim_to_banks() then ends both halves on the banks with stairs down to the
        water."""
        pts = self.river_line
        gap = {"village": 40, "town": 60, "city": 90, "metropolis": 120}.get(self.size, 60)
        art = {frozenset((a, b)) for line in self.arteries for a, b in zip(line, line[1:])}
        cross = []
        for sg in self.segs:
            a, b, hh, k = sg
            rank = 0 if (k == "road" or frozenset((a, b)) in art) else 1
            for p_, q_ in zip(pts, pts[1:]):                  # every crossing: a bend may cross one way twice
                x = seg_cross(a, b, p_, q_)
                if x: cross.append((rank, math.dist(x, (self.xc, self.yc)), sg, x))
        kept, cut = [], {}
        for rank, _, sg, x in sorted(cross, key=lambda c: (c[0], c[1])):   # the crossings nearest the market first
            if all(math.dist(x, y) > (gap * .5 if rank == 0 else gap) for y in kept): kept.append(x)
            else: cut.setdefault(id(sg), []).append(x)
        if not cut: return
        segs = []
        for sg in self.segs:
            xs = cut.get(id(sg))
            if not xs: segs.append(sg); continue
            a, b, hh, k = sg
            L_ = math.dist(a, b) or 1
            u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
            ps = [a]
            for x in sorted(xs, key=lambda q: math.dist(a, q)):   # a hair short of the crossing on each side
                ps += [(x[0] - u[0] * .3, x[1] - u[1] * .3), (x[0] + u[0] * .3, x[1] + u[1] * .3)]
            ps.append(b)
            segs += [(ps[i], ps[i + 1], hh, k) for i in range(0, len(ps) - 1, 2)]
        self.segs = segs
        self.seg_grid = T.Grid(6)
        for sg in self.segs:
            (ax, ay), (bx, by), hh, _ = sg
            self.seg_grid.add((min(ax, bx) - hh, min(ay, by) - hh, abs(bx - ax) + 2 * hh, abs(by - ay) + 2 * hh), sg)

    def river_near(self, q):
        """The nearest point on the river's middle line, and the distance to it."""
        best = None
        for a, b in zip(self.river_line, self.river_line[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            L2 = dx * dx + dy * dy or 1
            t = max(0, min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2))
            c = (a[0] + dx * t, a[1] + dy * t)
            d = math.dist(q, c)
            if best is None or d < best[1]: best = (c, d)
        return best

    def river_seg_dist(self, a, b):
        """How near a straight way from a to b comes to the river's middle line."""
        best = 1e9
        for p, q in zip(self.river_line, self.river_line[1:]):
            if seg_cross(a, b, p, q): return 0.0
            best = min(best, G.seg_dist(a, p, q), G.seg_dist(b, p, q), G.seg_dist(p, a, b), G.seg_dist(q, a, b))
        return best

    def trim_to_banks(self):
        """A way that runs down to the river without crossing it stops on the bank, with stone stairs down to the
        water (a landing for boats and buckets); one lying wholly in the water is dropped."""
        vh = 1.25 * self.river_half                           # the water as drawn
        pts, keep, self.landings = self.river_line, [], []
        for a, b, hh, k in self.segs:
            if any(seg_cross(a, b, p, q) for p, q in zip(pts, pts[1:])): keep.append((a, b, hh, k)); continue
            ends = [a, b]
            L_ = math.dist(a, b) or 1
            for i in (0, 1):
                o = ends[1 - i]
                d = ((o[0] - ends[i][0]) / L_, (o[1] - ends[i][1]) / L_)
                q, t = ends[i], 0.0
                while self.river_near(q)[1] < vh + hh + .1 and t < L_:
                    t += .25; q = (ends[i][0] + d[0] * t, ends[i][1] + d[1] * t)
                if t >= L_: ends = None; break
                if t > 0:
                    ends[i] = q
                    if 2 < q[0] < self.cols - 2 and 2 < q[1] < self.rows - 2 and not any(math.dist(q, l["at"]) < 3 for l in self.landings):
                        c, dd = self.river_near(q)
                        u = ((c[0] - q[0]) / dd, (c[1] - q[1]) / dd)
                        ln = dd - vh + .4
                        mid = (q[0] + u[0] * ln / 2, q[1] + u[1] * ln / 2)
                        self.landings.append({"at": q, "dir": u, "poly": box_corners(mid[0], mid[1], math.atan2(u[1], u[0]), ln, max(1.6, 2 * hh)),
                                              "mid": mid, "len": ln, "half": hh})
                L_ = math.dist(*ends) if ends else 0
            if ends and math.dist(*ends) > .5: keep.append((ends[0], ends[1], hh, k))
        self.segs = keep
        self.seg_grid = T.Grid(6)
        for sg in self.segs:
            (ax, ay), (bx, by), hh, _ = sg
            self.seg_grid.add((min(ax, bx) - hh, min(ay, by) - hh, abs(bx - ax) + 2 * hh, abs(by - ay) + 2 * hh), sg)
        for l in self.landings:                               # kept clear like a way, but not drawn as one
            q, u, ln = l["at"], l["dir"], l["len"]
            e = (q[0] + u[0] * ln, q[1] + u[1] * ln)
            sg = (q, e, l["half"], "landing")
            self.seg_grid.add((min(q[0], e[0]) - 2, min(q[1], e[1]) - 2, abs(e[0] - q[0]) + 4, abs(e[1] - q[1]) + 4), sg)

    def river_dist(self, q):
        return min(G.seg_dist(q, a, b) for a, b in zip(self.river_line, self.river_line[1:])) - self.river_half

    def put_mill(self, blocks):
        """A watermill on the bank: the block frontage nearest the river, the mill as close to the water as it may stand."""
        best = None
        for p, blk, kinds in blocks.values():
            if not (p["inner"] or p["ward"] == "gate-out"): continue
            for e in self.edges_of(blk, kinds):
                if self.river_dist(e["mid"]) > 14: continue
                t = .3
                while t < e["len"] - 2:
                    sp = self.try_at("workshop", e["A"], e["u"], e["in"], t, *SPACING.get(p["ward"], (.6, .8)), blk, B.TYPES["workshop"])
                    if sp:
                        d = self.river_dist((sp[0], sp[1]))
                        if best is None or d < best[0]: best = (d, sp, e, blk, p["ward"])
                    t += .7
        if not best: return
        b = self.put("workshop", "Workshop (miller)", best[1])
        if b:
            b.lot = best[3]
            tt = [(q[0] - best[2]["A"][0]) * best[2]["u"][0] + (q[1] - best[2]["A"][1]) * best[2]["u"][1] for q in best[1][3]]
            b.front_on = (min(tt), max(tt))
            self.frontages.setdefault(id(best[2]), (best[2], best[3], best[4], []))[3].append(b)
            self.mill = b

    def washing_spot(self):
        """The washing place: on the town's bank, upstream of the middle of town (the dirty trades go downstream)."""
        pts, h = self.river_line, self.river_half
        k0 = min(range(len(pts)), key=lambda k: math.dist(pts[k], (self.xc, self.yc)))
        for k in list(range(k0 - 3, max(0, k0 - 30), -1)):
            a, b = pts[k], pts[k + 1]
            d = (b[0] - a[0], b[1] - a[1]); L_ = math.hypot(*d) or 1
            n = (-d[1] / L_, d[0] / L_)
            if (self.xc - a[0]) * n[0] + (self.yc - a[1]) * n[1] < 0: n = (-n[0], -n[1])
            q = (a[0] + n[0] * (h + 1.3), a[1] + n[1] * (h + 1.3))
            if not (3 < q[0] < self.cols - 3 and 3 < q[1] < self.rows - 3): continue
            box = box_corners(q[0], q[1], math.atan2(d[1], d[0]), 3, 1.6)
            bb = G.bbox(box)
            if any(G.separation(box, hb) < .6 for _, o in self.bgrid.near(bb, 1) for hb in o.hulls): continue
            if any(G.separation(box, g["poly"]) < .3 for _, g in self.ggrid.near(bb, 1)): continue
            if any(G.separation(box, pl["poly"]) < .1 for pl in self.plots if overlaps(pl["rect"], bb, .2)): continue
            if any(G.seg_poly_dist(a_, c_, box) < hh for _, (a_, c_, hh, kk) in self.seg_grid.near(bb, 2) if kk != "river"): continue
            return {"at": q, "th": math.atan2(d[1], d[0]), "poly": box}
        return None

    def bridge_poly(self, br):
        (x, y), (dx, dy) = br["at"], br["dir"]
        th = math.atan2(dy, dx)
        return box_corners(x, y, th, br["len"], br["w"])

    def block(self, p):
        """The patch shrunk back from its streets, walls and roads: where its buildings may stand."""
        vs = p["v"]
        d = [INSET[self.edge_kind[frozenset((vs[i], vs[(i + 1) % len(vs)]))]] for i in range(len(vs))]
        b = G.inset(p["poly"], d)
        if b is None: return None, None
        return b, [self.edge_kind[frozenset((vs[i], vs[(i + 1) % len(vs)]))] for i in range(len(vs))]

    def way_dist(self, x, y, pad=3):
        best = 9.0
        for (a, b, h, k) in (it for _, it in self.seg_grid.near((x, y, 0, 0), pad)):
            best = min(best, G.seg_dist((x, y), a, b) - h)
        return best

    # ------------------------------------------------------------ setting buildings down
    def free(self, polys, gap, blk=None):
        """polys: the building as convex pieces (its main range and any wing)."""
        pts = [q for poly in polys for q in poly]
        x, y, w, h = G.bbox(pts)
        if x < 1.5 or y < 1.5 or x + w > self.cols - 1.5 or y + h > self.rows - 1.5: return False
        if self.on_cut(x, y, w, h, .2): return False
        if getattr(self, "fp_half", 0):                       # no house out on the floodplain, outside the town
            c = (x + w / 2, y + h / 2)
            if not self.in_town(c) and any(G.seg_dist(c, a, b) < self.fp_half for _, (a, b) in self.fp_grid.near((x, y, w, h), 1)): return False
        if self.land and self.land.z:                         # not on a brook, in a sinkhole or up a steep slope
            c = (x + w / 2, y + h / 2)
            if any(G.seg_poly_dist(a, b, poly) < r for poly in polys for _, (a, b, r) in self.wet_grid.near((x, y, w, h), 1)): return False
            if max(self.land.slope(*q) for q in (c, (x, y), (x + w, y + h))) > (SLOPE_MAX + .08 if self.in_town(c) else SLOPE_MAX): return False
        if getattr(self, "mind_plots", False) and any(G.separation(poly, q["poly"]) < .1 for poly in polys for q in self.plots if overlaps(q["rect"], (x, y, w, h), .2)): return False
        if blk is not None and not all(G.inside(q, blk) for q in pts): return False
        for _, b in self.bgrid.near((x, y, w, h), gap + .5):
            if any(G.separation(poly, hb) < gap for poly in polys for hb in b.hulls): return False
        for _, g in self.ggrid.near((x, y, w, h), .8):
            if any(G.separation(poly, g["poly"]) < .4 for poly in polys): return False
        if not self.off_ways(polys, (x, y, w, h), .25): return False
        if self.wall and any(G.seg_dist(q, self.wall[i - 1], self.wall[i]) < 1.4 for q in pts for i in range(len(self.wall))): return False
        if any(G.separation(poly, self.market_poly) < .3 for poly in polys): return False
        if any(G.separation(poly, q) < .3 for poly in polys for q in self.burned): return False
        return True

    def on_cut(self, x, y, w, h, pad=0):
        """True when a box would lie across a line between two part maps."""
        return any(x - pad < c < x + w + pad for c in self.cut_xs[1:-1]) or any(y - pad < c < y + h + pad for c in self.cut_ys[1:-1])

    def off_ways(self, polys, box, clear):
        """True when no street, road or alley band comes within clear of any piece (whole sides, not just corners:
        the ways must stay open for people walking them)."""
        return not any(G.seg_poly_dist(a, c, poly) < hh + clear for _, (a, c, hh, k) in self.seg_grid.near(box, 2) for poly in polys)

    def try_at(self, type_key, A, u, inward, t, setback, gap, blk, tdef=None):
        """A building of a type (or a variant of one, tdef) with its front on the block edge from A along u, starting
        t along it; or None."""
        tdef = tdef or B.TYPES[type_key]
        lw, lh = tdef["size"]
        n = (-inward[0], -inward[1])
        th = snap(math.atan2(-n[0], n[1]))
        nf = (-math.sin(th), math.cos(th))
        F = (A[0] + u[0] * (t + lw / 2), A[1] + u[1] * (t + lw / 2))
        cx, cy = F[0] - nf[0] * lh / 2, F[1] - nf[1] * lh / 2
        cs = box_corners(cx, cy, th, lw, lh)
        dmin = min((q[0] - A[0]) * inward[0] + (q[1] - A[1]) * inward[1] for q in cs)
        sh = setback - dmin
        cx, cy = cx + inward[0] * sh, cy + inward[1] * sh
        cs = box_corners(cx, cy, th, lw, lh)
        c, s_ = math.cos(th), math.sin(th)
        wd = lambda x, y: (cx + (x - lw / 2) * c - (y - lh / 2) * s_, cy + (x - lw / 2) * s_ + (y - lh / 2) * c)
        polys = [[wd(x, y), wd(x + w, y), wd(x + w, y + h), wd(x, y + h)] for x, y, w, h in tdef.get("parts") or [(0, 0, lw, lh)]]
        if not self.free(polys, gap, blk): return None
        return (cx, cy, th, cs, tdef)

    def put(self, type_key, label, spot, extra=None):
        if spot is None: return None
        cx, cy, th, _, tdef = spot
        n = self.count.get(type_key, 0) + 1
        try: b = B.Angled(f"{type_key}-{n}", type_key, cx, cy, th, label, extra, tdef).furnish()
        except SystemExit: return None                     # a variant whose rooms will not furnish: try another
        if self.on_cut(*b.rect): return None
        self.count[type_key] = n
        self.blds.append(b)
        self.bgrid.add(b.rect, b)
        return b

    def edges_of(self, blk, kinds, want=("main", "street", "road")):
        s = 1 if G.area(blk) > 0 else -1
        out = []
        for i in range(len(blk)):
            if kinds[i] not in want: continue
            A, Bp = blk[i], blk[(i + 1) % len(blk)]
            Lx = math.dist(A, Bp)
            if Lx < 4: continue
            u = ((Bp[0] - A[0]) / Lx, (Bp[1] - A[1]) / Lx)
            inward = (-u[1] * s, u[0] * s)
            out.append({"i": i, "A": A, "u": u, "in": inward, "len": Lx, "kind": kinds[i], "mid": ((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2)})
        return out

    def label_for(self, t):
        n = self.count.get(t, 0)
        if t == "workshop": return f"Workshop ({T.WORKSHOP_TRADES[n % len(T.WORKSHOP_TRADES)]})"
        if t == "townhouse": return f"House and shop ({T.SHOP_TRADES[n % len(T.SHOP_TRADES)]})"
        return LABELS[t]

    def choose(self, ward):
        R = self.R
        caps = CAPS[self.size]
        opts = [(t, w) for t, w in MIX[ward] if self.count.get(t, 0) < caps.get(t, 999)]
        tot = sum(w for _, w in opts)
        r = R.uniform(0, tot)
        for t, w in opts:
            r -= w
            if r <= 0: return t
        return opts[-1][0] if opts else "cottage"

    def fill_edge(self, e, ward, blk):
        R = self.R
        sb, gap = SPACING[ward]
        row = ward in TERRACED and R.random() < TERRACED[ward]     # a terraced row: walls against walls
        if row: gap = .05
        t = R.uniform(.2, 1.0)
        prev = None
        while t < e["len"] - 3:
            placed = False
            for tk in dict.fromkeys((self.choose(ward), "cottage", "workshop")):
                if tk not in dict(MIX[ward]) and tk != "cottage": continue
                tdef = B.variant(tk, R, sides=not row)
                spot = self.try_at(tk, e["A"], e["u"], e["in"], t, sb + R.uniform(0, .25 if row else .4), gap, blk, tdef)
                if spot:
                    lab = self.label_for(tk)
                    if ward == "gate-out" and tk == "tavern": lab = "Inn"
                    if ward == "gate-out" and tk == "cottage" and self.count.get("hospital", 0) < {"village": 0, "town": 1, "city": 2, "metropolis": 5}[self.size]:
                        lab = "Almshouse"; self.count["hospital"] = self.count.get("hospital", 0) + 1
                    b = self.put(tk, lab, spot)
                    if not b: continue
                    b.lot = blk
                    tt = [(q[0] - e["A"][0]) * e["u"][0] + (q[1] - e["A"][1]) * e["u"][1] for q in spot[3]]
                    b.front_on = (min(tt), max(tt))
                    self.frontages.setdefault(id(e), (e, blk, ward, []))[3].append(b)
                    if row and prev and min(G.separation(prev.hulls[0], b.hulls[0]), 9) < .25:
                        ax = (math.cos(b.theta), math.sin(b.theta))
                        left = (prev.cx - b.cx) * ax[0] + (prev.cy - b.cy) * ax[1] < 0
                        b.drop_side("W" if left else "E"); prev.drop_side("E" if left else "W")
                    prev = b
                    t = max((q[0] - e["A"][0]) * e["u"][0] + (q[1] - e["A"][1]) * e["u"][1] for q in spot[3]) + gap + R.uniform(0, .6 if ward != "slum" else .2)
                    placed = True
                    break
            if not placed: t += .5; prev = None

    def lots(self, blk, kinds, ward):
        """A block cut into lots, as the original does: each piece split across its longest side, a little off the
        middle, until it is small enough; big pieces leave an alley along the cut. Returns [(lot, frontages)],
        frontages being (edge index, kind) for the lot's edges on a street, the block's edge or an alley."""
        R = self.R
        minsq = LOT[ward]
        alleys = []
        def cut(poly, depth):
            A = abs(G.area(poly))
            if A < minsq * R.uniform(1.3, 2.2) or depth > 9: out.append(poly); return
            n = len(poly)
            i = max(range(n), key=lambda k: math.dist(poly[k], poly[(k + 1) % n]))
            a, b = poly[i], poly[(i + 1) % n]
            r = R.uniform(.4, .6)
            p = (a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r)
            L_ = math.dist(a, b)
            u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
            ang = R.uniform(-.12, .12)
            nrm = (u[0] * math.cos(ang) - u[1] * math.sin(ang), u[0] * math.sin(ang) + u[1] * math.cos(ang))
            gap = 1.2 if A > minsq * 7 else 0.0
            if gap:
                ch = G.chord(poly, p, (-nrm[1], nrm[0]))
                if ch:
                    band = G.buffer_line(list(ch), gap / 2)
                    if any(G.separation(band, hb) < .2 for _, o in self.bgrid.near(G.bbox(band), 1) for hb in o.hulls): gap = 0.0
                    elif self.river_line and self.river_seg_dist(*ch) < 1.25 * self.river_half + gap: gap = 0.0   # no alley into the water
                    else: alleys.append((ch[0], ch[1], gap / 2))
                else: gap = 0.0
            p1 = G.half_plane(poly, p, nrm, gap / 2)
            p2 = G.half_plane(poly, p, (-nrm[0], -nrm[1]), gap / 2)
            if not p1 or not p2: out.append(poly); return
            cut(p1, depth + 1); cut(p2, depth + 1)
        out = []
        cut(blk, 0)
        self.last_alleys = alleys
        for a, b, h in alleys:
            sg = (a, b, h, "alley")
            self.segs.append(sg)
            self.seg_grid.add((min(a[0], b[0]) - h, min(a[1], b[1]) - h, abs(b[0] - a[0]) + 2 * h, abs(b[1] - a[1]) + 2 * h), sg)
        res = []
        rank = {"main": 0, "street": 1, "road": 2, "alley": 3}
        for lot in out:
            fr = []
            for i in range(len(lot)):
                m = ((lot[i][0] + lot[(i + 1) % len(lot)][0]) / 2, (lot[i][1] + lot[(i + 1) % len(lot)][1]) / 2)
                if math.dist(lot[i], lot[(i + 1) % len(lot)]) < 3: continue
                if G.edge_dist(m, blk) < .05:
                    k = min(range(len(blk)), key=lambda j: G.seg_dist(m, blk[j], blk[(j + 1) % len(blk)]))
                    if kinds[k] in rank: fr.append((i, kinds[k]))
                elif any(abs(G.seg_dist(m, a, b) - h) < .06 for a, b, h in alleys): fr.append((i, "alley"))
            fr.sort(key=lambda f: (rank[f[1]], -math.dist(lot[f[0]], lot[(f[0] + 1) % len(lot)])))
            res.append((lot, fr))
        return res

    def alley_edges(self):
        """Both sides of each alley cut through the last block, as frontages."""
        out = []
        for a, b, h in self.last_alleys:
            L_ = math.dist(a, b)
            if L_ < 5: continue
            u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
            for sgn in (1, -1):
                inward = (-u[1] * sgn, u[0] * sgn)
                A = (a[0] + inward[0] * h, a[1] + inward[1] * h)
                out.append({"i": -1, "A": A, "u": u, "in": inward, "len": L_, "kind": "alley", "mid": ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)})
        return out

    def fill_lot(self, lotfr, ward):
        """Buildings side by side along each of the lot's frontages, best frontage first, facing the way."""
        lot, fr = lotfr
        es = {e["i"]: e for e in self.edges_of(lot, ["street"] * len(lot), ("street",))}
        for i, kind in fr:
            if i in es: self.fill_edge(es[i], ward, lot)

    def best_spot(self, type_key, edges, blkfor, want="middle", plain=False):
        """The spot nearest the market (or farthest) on any of the edges, for one special building. plain: the type as
        it stands, not a variant."""
        best = None
        tdef = B.TYPES[type_key] if plain else B.variant(type_key, self.R)
        for e, blk, ward in edges:
            sb, gap = SPACING.get(ward, (.6, .8))
            t = .3
            while t < e["len"] - 2:
                s = self.try_at(type_key, e["A"], e["u"], e["in"], t, sb, gap, blk, tdef)
                if s:
                    d = math.hypot(s[0] - self.xc, s[1] - self.yc)
                    if best is None or d < best[0]: best = (d, s)
                t += .5
        return best[1] if best else None

    def lay_out(self):
        R = self.R
        blocks = {}
        for p in self.patches:
            if p["ward"] in ("plaza", "country", "park") or (not p["inner"] and p["ward"] not in ("gate-out", "farm")): continue
            blk, kinds = self.block(p)
            if blk: blocks[id(p)] = (p, blk, kinds)
        plaza_v = set(self.plaza["v"])
        def plaza_edges(p, blk, kinds):
            return [e for e in self.edges_of(blk, kinds, ("main",)) if G.poly_dist(e["mid"], self.market_poly) < 3.5]
        facing = [(e, blk, p["ward"]) for p, blk, kinds in blocks.values() if p["inner"] for e in plaza_edges(p, blk, kinds)]
        s = self.best_spot("tavern", facing, None)
        if not s: raise SystemExit("no room for the tavern on the market")
        tavern = self.put("tavern", "Tavern", s) or self.put("tavern", "Tavern", self.best_spot("tavern", facing, None, plain=True))
        church = [(e, blk, p["ward"]) for p, blk, kinds in blocks.values() if p["ward"] == "church" for e in self.edges_of(blk, kinds)]
        s = self.best_spot("chapel", church, None) or self.best_spot("chapel", facing, None)
        if not s:
            any_e = [(e, blk, p["ward"]) for p, blk, kinds in blocks.values() if p["inner"] for e in self.edges_of(blk, kinds)]
            s = self.best_spot("chapel", any_e, None)
        if not s: raise SystemExit("no room for the chapel")
        chapel = self.put("chapel", "Chapel", s) or self.put("chapel", "Chapel", self.best_spot("chapel", church or facing, None, plain=True))
        near = [(e, blk, p["ward"]) for p, blk, kinds in blocks.values() if p["inner"] for e in self.edges_of(blk, kinds)
                if math.dist(e["mid"], chapel.centre) < 30]
        s = self.best_spot("cottage", sorted(near, key=lambda x: math.dist(x[0]["mid"], chapel.centre))[:4], None)
        if s:
            pr = self.put("cottage", "Priest's house", s, {"priest": True})
        if self.size == "metropolis":   # a parish church in every other church ward (a house rule; smaller places keep one)
            for p, blk, kinds in blocks.values():
                if p["ward"] != "church" or G.inside(chapel.centre, p["poly"]): continue
                s = self.best_spot("chapel", [(e, blk, p["ward"]) for e in self.edges_of(blk, kinds)], None)
                if s: self.put("chapel", "Parish church", s)
        if self.river_line: self.put_mill(blocks)
        self.count["tavern"] = 1
        # fire history: now and then a great fire took one block; it was rebuilt in stone, all but one plot left in ash
        self.fire_p, self.filled = None, []
        hot = [p for p, blk, kinds in blocks.values() if p["ward"] in ("craftsmen", "merchant", "market", "slum", "village")]
        if hot and R.random() < {"village": .2, "town": .4, "city": .6, "metropolis": .7}[self.size]: self.fire_p = R.choice(hot)
        order = ["gate", "merchant", "market", "administration", "church", "military", "patriciate", "craftsmen", "village", "slum", "gate-out"]
        for ward in order:
            for p, blk, kinds in blocks.values():
                if p["ward"] != ward: continue
                self.lots(blk, kinds, ward)                    # cuts the alleys through a big block
                if p is self.fire_p:
                    es0 = [e for e in self.edges_of(blk, kinds) if e["len"] > 9]
                    if es0:
                        for _ in range(10):
                            e0 = R.choice(es0)
                            g0 = R.uniform(1, e0["len"] - 7)
                            g1 = g0 + R.uniform(4, 6)
                            A, u, inw = e0["A"], e0["u"], e0["in"]
                            q = G.clip_convex([(A[0] + u[0] * g0, A[1] + u[1] * g0), (A[0] + u[0] * g1, A[1] + u[1] * g1),
                                               (A[0] + u[0] * g1 + inw[0] * 5, A[1] + u[1] * g1 + inw[1] * 5), (A[0] + u[0] * g0 + inw[0] * 5, A[1] + u[1] * g0 + inw[1] * 5)], blk)
                            if q and self.plot_free(q, None): self.burned.append(q); break
                es = self.edges_of(blk, kinds)
                es.sort(key=lambda e: (e["kind"] != "main", -e["len"]))
                done = []
                for e in es + (self.alley_edges() if ward in COURTS else []):
                    # burgage plots: a frontage backing on to one already built leaves the land between as their yards
                    if ward not in COURTS and any(e["in"][0] * f["in"][0] + e["in"][1] * f["in"][1] < -.6 and
                                                  (e["mid"][0] - f["mid"][0]) * f["in"][0] + (e["mid"][1] - f["mid"][1]) * f["in"][1] < BACK_TO_BACK.get(ward, 16)
                                                  for f in done): continue
                    self.fill_edge(e, ward, blk); done.append(e)
                    self.filled.append((e, ward, blk))
        if self.cut_xs[1:-1] or self.cut_ys[1:-1]:           # a second pass along the frontages a part line crossed,
            for e, ward, blk in self.filled:                  # so the houses slide up to the line on both sides
                a, b = e["A"], (e["A"][0] + e["u"][0] * e["len"], e["A"][1] + e["u"][1] * e["len"])
                bx = (min(a[0], b[0]) - 8, min(a[1], b[1]) - 8, abs(b[0] - a[0]) + 16, abs(b[1] - a[1]) + 16)
                if self.on_cut(*bx): self.fill_edge(e, ward, blk)
        for p, blk, kinds in blocks.values():                 # farms: a farmhouse and a barn by the road
            if p["ward"] != "farm": continue
            for e in self.edges_of(blk, kinds, ("road",)):
                s = self.try_at("byre-house", e["A"], e["u"], e["in"], R.uniform(.5, 3), *SPACING["farm"], blk)
                if not s: continue
                fh = self.put("byre-house", "Farmhouse", s)
                end = max((q[0] - e["A"][0]) * e["u"][0] + (q[1] - e["A"][1]) * e["u"][1] for q in s[3])
                s2 = self.try_at("barn", e["A"], e["u"], e["in"], end + 2, *SPACING["farm"], blk)
                if s2: self.put("barn", "Barn", s2)
                break
        if self.fire_p:
            for b in self.blds:
                if G.inside(b.centre, self.fire_p["poly"]): b.rebuilt = True
        self.make_plots()
        for b in self.blds:
            if getattr(b, "plot", None) or b.type not in ("cottage", "byre-house", "townhouse"): continue
            if R.random() < .8: self.garden_behind(b)
        self.place_trades()
        self.wealth()
        self.people()
        for h in self.households:
            b = next(x for x in self.blds if x.key == h["building"])
            h["wealth"] = getattr(b, "wealth", "middling")
            if b.label == "Almshouse":                          # the hospital outside the gate: its keeper and the poor it shelters
                h["trade"] = "almshouse keeper"
                h["people"] = [{"role": "almshouse keeper"}] + [{"role": "almsman"}] * self.R.randint(2, 5)
            if b.label == "Inn": h["trade"] = "innkeeper"; h["people"][0] = {"role": "innkeeper"}
        if not any(b.type == "cottage" for b in self.blds): self.notes.append("no cottages")

    def town_r(self):
        return max(math.dist((self.xc, self.yc), q) for q in self.outline) if self.outline else 30

    def place_trades(self):
        """The trades that stink (tanning, dyeing, butchering, fulling, tallow) go where a town put them: downstream
        on the river, else against the wall or out past it, else as far from the market as may be. The clean trades
        take the rest."""
        shops = [b for b in self.blds if b.type == "workshop" and "miller" not in b.label]
        if not shops: return
        rr = self.town_r()
        mid = None
        if self.river_line:
            mid = min(range(len(self.river_line)), key=lambda k: math.dist(self.river_line[k], (self.xc, self.yc)))
        def dirt(b):
            x, y = b.centre
            sc = math.dist((x, y), (self.xc, self.yc)) / rr
            if mid is not None:
                k = min(range(len(self.river_line)), key=lambda k: math.dist(self.river_line[k], (x, y)))
                if k > mid and self.river_dist((x, y)) < 14: sc += 3 - self.river_dist((x, y)) / 7
            if self.wall:
                dw = min(G.seg_dist((x, y), self.wall[i - 1], self.wall[i]) for i in range(len(self.wall)))
                if dw < 7 or not G.inside((x, y), self.wall): sc += 1.5
            return sc
        ranked = sorted(shops, key=dirt, reverse=True)
        n_dirty = max(1, round(len(shops) * .3)) if len(shops) > 1 else 0
        for i, b in enumerate(ranked):
            trade = DIRTY_TRADES[i % len(DIRTY_TRADES)] if i < n_dirty else CLEAN_TRADES[(i - n_dirty) % len(CLEAN_TRADES)]
            b.label = f"Workshop ({trade})"
            b.dirty = i < n_dirty

    def wealth(self):
        """Rich by the market and in the rich wards, poor at the walls, in the slums, by the dirty trades and outside
        the gates. Rich houses are stone below and timber above, with boarded floors; middling ones timber and
        plaster; poor ones plain timber on bare earth."""
        rr = self.town_r()
        ward_of = {}
        for p in self.patches:
            for b in self.blds:
                if b.key not in ward_of and G.inside(b.centre, p["poly"]): ward_of[b.key] = p.get("ward")
        dirty = [b for b in self.blds if getattr(b, "dirty", False)]
        for b in self.blds:
            if b.type in ("chapel", "guardhouse", "barn", "storehouse", "smithy"): continue
            w = ward_of.get(b.key)
            r = math.dist(b.centre, (self.xc, self.yc)) / rr
            r += {"patriciate": -.3, "merchant": -.2, "market": -.15, "administration": -.1, "slum": .4, "gate-out": .3, "farm": .3}.get(w, 0)
            if any(math.dist(b.centre, d.centre) < 10 for d in dirty if d is not b): r += .2
            b.wealth = "rich" if r < .35 else "poor" if r > .75 else "middling"
            if b.type in ("byre-house",): continue                  # a farmhouse keeps its own walls
            b.wall_tex = "Stone_A.png" if getattr(b, "rebuilt", False) else WEALTH_WALL[b.wealth]
            if b.wealth == "rich":
                for rm in b.rooms:
                    if rm.floor == "earth" and rm.name not in ("Byre", "Store", "Shed", "Lean-to"): rm.floor = "planks"

    def make_plots(self):
        """Burgage plots: each house on a frontage gets a strip of land running back from the street, as wide as its
        share of the frontage, to the ward's plot depth or until it meets another plot, a building or a way. Behind
        the house: a yard, then a garden or croft to the back fence."""
        R = self.R
        for e, blk, ward, row in self.frontages.values():
            if not G.convex(blk): continue
            row = sorted(row, key=lambda b: b.front_on[0])
            for k, b in enumerate(row):
                if b.type in NO_PLOT: continue
                # in the building's own frame (x along its front, y back from the street is negative): rows on one
                # frontage share the same turn, so the plot lines between neighbours run straight back
                c, s_ = math.cos(b.theta), math.sin(b.theta)
                o = b.world(0, 0)
                lx = lambda q: (q[0] - o[0]) * c + (q[1] - o[1]) * s_
                ly = lambda q: -(q[0] - o[0]) * s_ + (q[1] - o[1]) * c
                mine = [q for hb in b.hulls for q in hb]
                x0, x1 = min(map(lx, mine)), max(map(lx, mine))
                y0 = min(map(ly, mine))                         # the back wall
                lo, hi = x0 - .4, x1 + .4
                for j in (k - 1, k + 1):
                    if not 0 <= j < len(row): continue
                    qs = [q for hb in row[j].hulls for q in hb]
                    if j < k:
                        m = max(map(lx, qs))
                        if x0 - m < 2: lo = max(min((m + x0) / 2, x0), m) if m < x0 else x0
                    else:
                        m = min(map(lx, qs))
                        if m - x1 < 2: hi = min(max((m + x1) / 2, x1), m) if m > x1 else x1
                d = R.uniform(*PLOT_DEPTH.get(ward, (8, 12)))
                at = lambda x, y: b.world(x, y)
                front, poly = b.lh + 2.5, None
                for lo, hi in ((lo, hi), (max(lo, x0 - .1), min(hi, x1 + .1))):   # its share of the frontage, else its own width
                    dd = d
                    while dd > b.lh - y0 + .8:
                        poly = G.clip_convex([at(lo, front), at(hi, front), at(hi, b.lh - dd), at(lo, b.lh - dd)], blk)
                        if poly and self.plot_free(poly, b, row): break
                        poly = None
                        dd -= .5
                    if poly: break
                if not poly: continue
                d = dd
                A, inw = e["A"], e["in"]
                bb = G.bbox(poly)
                pl = {"id": f"{b.key}-plot", "poly": poly, "rect": bb, "b": b, "A": A, "in": inw}
                self.plots.append(pl); b.plot = pl
                gy = y0 - R.uniform(1.2, 2.2)                   # the yard by the back door, then the garden
                yb = b.lh - d + .25
                if gy - yb > 1.8 and b.type in ("cottage", "byre-house", "townhouse", "workshop"):
                    gp = G.clip_convex([at(lo + .25, gy), at(hi - .25, gy), at(hi - .25, yb), at(lo + .25, yb)], poly)
                    if gp and all(G.separation(gp, hb) > .3 for hb in b.hulls):
                        bush = []
                        for r_ in range(int((gy - yb - .3) / .9)):
                            for c_ in range(int((hi - lo - 1.2) / .8)):
                                q = at(lo + .85 + c_ * .8, gy - .6 - r_ * .9)
                                if G.inside(q, gp): bush.append(q)
                        g = {"id": f"{b.key}-garden", "rect": G.bbox(gp), "poly": gp, "of": b.key, "b": b, "d": gy - yb, "bushes": bush, "fence": False}
                        self.gardens.append(g); self.ggrid.add(g["rect"], g)

    def plot_fences(self, pl):
        """A plot's fence lines: every side but the street front, and a side shared with the plot next door only once."""
        P, A, inw = pl["poly"], pl["A"], pl["in"]
        dep = lambda q: (q[0] - A[0]) * inw[0] + (q[1] - A[1]) * inw[1]
        out = []
        for a, c in zip(P, P[1:] + P[:1]):
            if dep(a) < .3 and dep(c) < .3: continue
            if math.dist(a, c) < .3: continue
            out.append((a, c))
        return out

    def plot_free(self, poly, own, row=()):
        bb = G.bbox(poly)
        for _, o in self.bgrid.near(bb, .5):
            if o is not own and any(G.separation(poly, hb) < .05 for hb in o.hulls): return False
        if any(G.separation(poly, q["poly"]) < -.01 for q in self.plots if q["b"] is not own and overlaps(q["rect"], bb, .1)): return False
        if any(G.separation(poly, q) < .1 for q in getattr(self, "burned", [])): return False
        return self.off_ways([poly], bb, 0)

    def garden_behind(self, b):
        R = self.R
        d = R.choice((2.5, 3, 3.5))
        # in the building's own cells: behind its back wall (local y < 0)
        loc = [(.5, -.8 - d), (b.lw - .5, -.8 - d), (b.lw - .5, -.8), (.5, -.8)]
        poly = [b.world(*q) for q in loc]
        blk = getattr(b, "lot", None) or next((self.block(p)[0] for p in self.patches if G.inside(b.centre, p["poly"])), None)
        if blk is None or not all(G.inside(q, blk) for q in poly): return None
        x, y, w, h = G.bbox(poly)
        for _, o in self.bgrid.near((x, y, w, h), 1):
            if o is not b and any(G.separation(poly, hb) < .5 for hb in o.hulls): return None
        for _, g in self.ggrid.near((x, y, w, h), 1):
            if G.separation(poly, g["poly"]) < .5: return None
        if not self.off_ways([poly], (x, y, w, h), .2): return None
        g = {"id": f"{b.key}-garden", "rect": (x, y, w, h), "poly": poly, "of": b.key, "b": b, "d": d}
        self.gardens.append(g)
        self.ggrid.add((x, y, w, h), g)
        return g

    # ------------------------------------------------------------ the square, trees and scatter
    def well_spot(self):
        cx, cy = self.xc, self.yc
        for dx, dy in ((0, 0), (2, 1), (-2, 1), (1, -2), (-1, -2)):
            x, y = cx + dx, cy + dy
            if G.inside((x, y), self.market_poly) and G.edge_dist((x, y), self.market_poly) > 1.5: return (x, y)
        return (cx, cy)

    def cross_spot(self):
        """The market cross: a landmark in the open market, a few squares from the well."""
        wx, wy = self.well
        for r in (3.5, 3, 4.5, 2.5):
            for k in range(12):
                a = k * math.pi / 6
                q = (wx + r * math.cos(a), wy + r * math.sin(a))
                if G.inside(q, self.market_poly) and G.edge_dist(q, self.market_poly) > 2: return q
        return None

    def node_wells(self):
        """A public well by the busier junctions away from the market, one to each quarter of the town, set back off
        the ways so they stay clear; each is a landmark and a meeting place."""
        want = {"village": 0, "town": 2, "city": 6, "metropolis": 16}[self.size]
        if not want: return []
        deg = {}
        for a, b, h, k in self.segs:
            for q in (a, b): deg[(round(q[0], 3), round(q[1], 3))] = deg.get((round(q[0], 3), round(q[1], 3)), 0) + 1
        nodes = [q for q, n in deg.items() if n >= 3 and self.in_town(q) and G.poly_dist(q, self.market_poly) > 10]
        self.R.shuffle(nodes)
        out = []
        for q in sorted(nodes, key=lambda q: -deg[q]):
            if len(out) >= want: break
            if any(math.dist(q, w) < 22 for w in out + [self.well]): continue
            for r in (2.4, 2.9, 3.4):
                spot = None
                for k in range(16):
                    a = k * math.pi / 8
                    w = (q[0] + r * math.cos(a), q[1] + r * math.sin(a))
                    box = box_corners(w[0], w[1], 0, 1.6, 1.6)
                    bb = G.bbox(box)
                    if not self.off_ways([box], bb, .1): continue
                    if any(G.separation(box, hb) < .5 for _, o in self.bgrid.near(bb, 1) for hb in o.hulls): continue
                    if any(G.separation(box, g["poly"]) < .2 for _, g in self.ggrid.near(bb, 1)): continue
                    if any(G.separation(box, pl["poly"]) < 0 for pl in self.plots if overlaps(pl["rect"], bb, .2)): continue
                    spot = w; break
                if spot: out.append(spot); break
        return out

    def market_things(self):
        R = self.R
        out = []
        wx, wy = self.well
        mx, my, mw, mh = self.market
        taken = [box_corners(wx, wy, 0, 2.4, 2.4)] + ([box_corners(*self.cross, 0, 2, 2)] if self.cross else [])
        for _ in range(400):
            if len(out) >= self.cfg["stalls"]: break
            x, y = R.uniform(mx, mx + mw), R.uniform(my, my + mh)
            th = snap(R.uniform(0, math.pi))
            cs = box_corners(x, y, th, 2.6, 1.8)
            if not all(G.inside(q, self.market_poly) and G.edge_dist(q, self.market_poly) > .6 for q in cs): continue
            if any(G.separation(cs, t) < .5 for t in taken): continue
            taken.append(cs)
            out.append(("stall", x, y, th))
        return out

    def tree_ok(self, x, y, rad):
        pt = (x, y, 0, 0)
        if any(G.poly_dist((x, y), hb) < rad * .7 + .5 for _, b in self.bgrid.near(pt, rad + 1) for hb in b.hulls): return False
        if any(G.poly_dist((x, y), g["poly"]) < rad * .6 for _, g in self.ggrid.near(pt, rad + 1)): return False
        if self.way_dist(x, y, rad + 2) < rad * .5 + .3: return False
        if G.poly_dist((x, y), self.market_poly) < rad + .5: return False
        if any(math.dist((x, y), w) < rad * .6 + 1.2 for w in self.more_wells): return False
        if any(G.poly_dist((x, y), q) < rad * .6 for q in self.burned): return False
        if getattr(self, "washing", None) and math.dist((x, y), self.washing["at"]) < rad * .6 + 2: return False
        if self.wall and min(G.seg_dist((x, y), self.wall[i - 1], self.wall[i]) for i in range(len(self.wall))) < rad * .6 + 1: return False
        return True

    def edge_wood(self, x, y):
        if self.in_town((x, y)): return 0.0
        near = [rdist(x, y, *r) for r, _ in self.bgrid.near((x, y, 0, 0), 10)]
        d = min(near + [G.edge_dist((x, y), self.outline) + 2])
        return max(0, min(1, (d - 4) / 8))

    def scatter(self):
        R = self.R
        out = []
        for g in self.gardens:
            if "bushes" in g:
                for x, y in g["bushes"]: out.append((R.choice([f"Bush_Green_B{i}_1x1.webp" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), .5, 100, .3))
                continue
            b, d = g["b"], g["d"]
            for row in range(int((d - .3) / .9)):
                for col in range(int((b.lw - 1.3) / .8)):
                    x, y = b.world(.5 + .5 + col * .8, -.8 - d + .55 + row * .9)
                    out.append((R.choice([f"Bush_Green_B{i}_1x1.webp" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), .5, 100, .3))
        for kind, x, y, th in self.stalls:
            out.append(("Table_Rectangle_Wood_Ashen_E_2x1.webp", x, y, th, 1, 100, 1.3))
            for k, a in enumerate(R.sample(["Box_Crate_Wood_Ashen_A1_1x1.webp", "Sack_Brown_E_Wheat_1x1.webp", "Barrel_Wood_Ashen_A_1x1.webp", "Sack_Brown_E_Grains_1x1.webp"], 2)):
                dx, dy = -.65 + k * 1.3, .9
                out.append((a, x + dx * math.cos(th) - dy * math.sin(th), y + dx * math.sin(th) + dy * math.cos(th), th + R.uniform(-.3, .3), .75, 100, .4))
        for q in self.burned:                                 # charred timbers left where the fire took the houses
            bx, by, bw_, bh_ = G.bbox(q)
            for _ in range(6):
                x, y = R.uniform(bx, bx + bw_), R.uniform(by, by + bh_)
                if G.inside((x, y), q) and G.edge_dist((x, y), q) > .6:
                    out.append(("Firewood_Stacked_A_1x1.webp", x, y, R.uniform(0, 6.3), R.uniform(.7, 1.1), 100, .5))
        if self.washing:
            (x, y), th = self.washing["at"], self.washing["th"]
            for dx, a, sc in ((-.8, "Trough_Wood_Ashen_Water_A_2x1.webp", 1), (.9, "Bucket_Wood_Ashen_A_1x1.webp", .8), (1.5, "Barrel_Wood_Ashen_A_1x1.webp", .8)):
                out.append((a, x + dx * math.cos(th), y + dx * math.sin(th), th, sc, 100, .6))
        wx, wy = self.well
        out.append(("Bucket_Wood_Ashen_A_1x1.webp", wx + .9, wy + .3, 0, .8, 100, .4))
        if self.stocks:
            sx, sy = self.stocks
            out.append(("Stocks_Wood_Ashen_A1_1x1.webp", sx, sy, self.stocks_th, 1, 100, .5))
        pines = [f"Pine_Green_Shadow_A{i}_5x5.webp" for i in range(1, 13)]
        broad = [f"Tree_Green_A{i}_{s}.webp" for i, s in ((1, "6x6"), (3, "6x5"), (5, "6x6"), (6, "5x5"), (9, "6x6"), (10, "5x5"))]
        placed = T.Grid(6)
        for _ in range(self.cols * self.rows * 3):
            x, y = R.uniform(-1.5, self.cols + 1.5), R.uniform(-1.5, self.rows + 1.5)
            wood = self.edge_wood(x, y)
            if R.random() > wood * .95 + (.004 if self.in_town((x, y)) else .02): continue
            s = R.uniform(.75, 1.3); rad = 1.9 * s
            big = wood > .5
            if not big: rad *= .6
            if not self.tree_ok(x, y, rad): continue
            if any(math.hypot(x - a, y - b) < (rad + c) * .55 for (a, b, _, _), c in placed.near((x, y, 0, 0), 2 * rad + 3)): continue
            placed.add((x, y, 0, 0), rad)
            out.append((R.choice(pines if big else broad), x, y, R.uniform(-math.pi, math.pi), s if big else s * .45, 400, rad))
        for _ in range(self.cols * 3):
            x, y = R.uniform(1, self.cols - 1), R.uniform(1, self.rows - 1)
            if not self.tree_ok(x, y, .8) or self.edge_wood(x, y) > .6: continue
            if R.random() < .7: out.append((R.choice([f"Bush_Green_{c}{i}_1x1.webp" for c in "ABC" for i in (1, 2, 3)]), x, y, R.uniform(0, 6.3), R.uniform(.7, 1.2), 100, .6))
            else: out.append((f"Rocks_Small_A{R.randint(1, 5)}_2x2.webp", x, y, R.uniform(0, 6.3), R.uniform(.4, .7), 100, .6))
        return out

    # ------------------------------------------------------------ the wall
    def wall_pieces(self):
        """The wall runs and towers, cut where the river passes through (self.grates: the water gates)."""
        if getattr(self, "_walls", None): return self._walls
        self._walls = self.cut_walls()
        return self._walls

    def cut_walls(self):
        runs, towers = self.wall_runs()
        self.grates = []
        if not self.river_line or not runs: return runs, towers
        h = 1.25 * self.river_half + .3
        wet = lambda q: self.river_near(q)[1] < h
        towers = [t for t in towers if self.river_near(t)[1] > h + .9]     # none standing in the stream
        out = []
        for run in runs:
            cur, inside, entry, prev = [], False, None, None
            for a, b in zip(run, run[1:]):
                n = max(1, int(math.dist(a, b) / .1))
                for k in range(n + (1 if b is run[-1] else 0)):
                    q = (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
                    w = wet(q)
                    if w and not inside:
                        if cur: cur.append(q); out.append(cur)
                        cur, inside, entry = [], True, prev or q
                    elif not w and inside:
                        self.grates.append((entry, q)); inside, cur = False, [q]
                        L_ = math.dist(entry, q) or 1
                        u = ((q[0] - entry[0]) / L_, (q[1] - entry[1]) / L_)
                        towers += [(entry[0] - u[0] * 1.1, entry[1] - u[1] * 1.1), (q[0] + u[0] * 1.1, q[1] + u[1] * 1.1)]
                    elif not w and (not cur or k == 0): cur.append(q)
                    prev = q
            if b is not None and not inside and cur and cur[-1] != run[-1]: cur.append(run[-1])
            if cur: out.append(cur)
        return [r for r in out if len(r) > 1 and sum(math.dist(a, b) for a, b in zip(r, r[1:])) > .3], towers

    def wall_runs(self):
        """The curtain wall as open runs between the gates, each gate a gap of three squares; and the towers."""
        if not self.wall: return [], []
        ring = self.wall
        n = len(ring)
        gi = [i for i, p in enumerate(ring) if any(math.dist(p, g) < 1e-6 for g in self.gates)]
        towers = [p for i, p in enumerate(ring) if i not in gi]
        if not gi: return [ring + ring[:1]], towers
        runs = []
        for k, g in enumerate(gi):
            nxt = gi[(k + 1) % len(gi)]
            idx = [(g + j) % n for j in range((nxt - g) % n + 1)] if len(gi) > 1 else [(g + j) % n for j in range(n + 1)]
            pts = [ring[i] for i in idx]
            def cut(a, b, d=1.6):
                L_ = math.dist(a, b)
                return (a[0] + (b[0] - a[0]) * d / L_, a[1] + (b[1] - a[1]) * d / L_) if L_ > d else a
            pts[0] = cut(pts[0], pts[1]); pts[-1] = cut(pts[-1], pts[-2])
            runs.append(pts)
            for a, b in ((pts[0], pts[1]), (pts[-1], pts[-2])):    # a tower each side of the gate, clear of the street
                towers.append(cut(a, b, 1.1))
        return runs, towers

    # ------------------------------------------------------------ cutting a big place into parts
    def cuts(self, length, part, across):
        """As the grid town's cuts, but a cut weighs what it would split: the market most of all, then a park,
        cemetery or bomb site, a bridge, a well or the cross, a building, and a yard least. A cut that runs down a
        street splits nothing, so cuts tend to follow the streets."""
        if not part or length <= part: return [0, length]
        planned = self.cut_xs if across == "x" else self.cut_ys
        if planned and part == self.part: return planned
        if part == self.part: return even_cuts(length, part)          # even parts (B652)
        ax = 0 if across == "x" else 1
        span = lambda poly: (min(q[ax] for q in poly), max(q[ax] for q in poly))
        things = [(span(hb), 8) for b in self.blds for hb in b.hulls]
        things.append((span(self.market_poly), 400))
        things += [(span(a["poly"]), 60) for a in self.era_areas]
        things += [(span(self.bridge_poly(br)), 30) for br in self.bridges]
        things += [(span(pl["poly"]), 1) for pl in self.plots] + [(span(g["poly"]), 1) for g in self.gardens]
        marks = [getattr(self, "well", None)] + getattr(self, "more_wells", []) + [getattr(self, "cross", None)]
        things += [((q[ax] - 1, q[ax] + 1), 20) for q in marks if q]
        cost = [sum(w for (a, b), w in things if a - .4 < c < b + .4) for c in range(length + 1)]
        other = self.rows if across == "x" else self.cols
        for c in range(1, length):                            # building land the line would run through: a line down
            for v in range(1, other, 2):                      # a street or out in the fields loses no houses
                q = (c, v) if across == "x" else (v, c)
                if self.in_town(q) and self.way_dist(*q) > .3: cost[c] += 1.5
        least = min(24, part // 2)
        # the cheapest set of cuts over the whole side, each part from least to part squares wide; every extra
        # part costs as much as splitting a few buildings, so there are no more parts than needed
        best = {0: (0.0, [0])}
        for c in range(least, length + 1):
            opts = [(best[p][0] + (cost[c] if c < length else 0) + 30 + max(0, .8 * part - (c - p)) * 2, best[p][1] + [c]) for p in range(max(0, c - part), c - least + 1) if p in best]
            if opts: best[c] = min(opts)
        if length not in best: return T.Town.cuts(self, length, part, across)
        return best[length][1]

    def part_line(self, c, across, s):
        """The plan's line between two parts, stepping round each house it would cross on the side of the part
        that does not hold it."""
        ax = 0 if across == "x" else 1
        far = self.rows if ax == 0 else self.cols
        hits = []
        for b in self.blds:
            x, y, w, h = b.rect
            lo, hi = (x, x + w) if ax == 0 else (y, y + h)
            if lo < c < hi:
                a0, a1 = (y, y + h) if ax == 0 else (x, x + w)
                mine = (b.cx if ax == 0 else b.cy) < c            # it is the lower part's: go round its far side
                hits.append((a0 - .3, a1 + .3, hi + .3 if mine else lo - .3))
        pts, v = [(c, 0)], 0
        for a0, a1, d in sorted(hits):
            a0 = max(a0, v)
            pts += [(c, a0), (d, a0), (d, a1), (c, a1)]
            v = a1
        pts.append((c, far))
        if ax == 1: pts = [(q[1], q[0]) for q in pts]
        return f'<polyline points="{" ".join(f"{q[0] * s:.1f},{q[1] * s:.1f}" for q in pts)}" fill="none" stroke="#7a1fa2" stroke-width="3" stroke-dasharray="10 6"/>'

    # ------------------------------------------------------------ Dungeondraft, one part
    def build(self, pt):
        win = pt["win"]
        C.set_origin(win[0], win[1])
        walls, patterns, objects, paths = [], [], [], []
        bw = (win[0] - 2, win[1] - 2, win[2] + 4, win[3] + 4)
        for b in self.blds:                                    # each building whole, on its own part only
            if not overlaps(b.rect, win) or not (self.mine(b, pt) or T.inside(b.rect[0], b.rect[1], win, .01) and T.inside(b.rect[0] + b.rect[2], b.rect[1] + b.rect[3], win, .01)): continue
            ops = [(k, x, y, None) for k, x, y, _ in b.openings_world()]
            wt = getattr(b, "wall_tex", None) or b.t["wall"]
            pk = b.t.get("portals")                            # a later era's doors and windows
            walls.append(wall_with_portals(b.outline, wt, ops, True, pk))
            for a, c in b.partitions_world(): walls.append(wall_with_portals([a, c], wt, ops, False, pk))
            for r in b.rooms:
                if B.FLOORS.get(r.floor): patterns.append(pattern(b.room_poly(r), B.FLOORS[r.floor], b.theta))
                for it, cx, cy, rot in b.items_world(r):
                    objects.append(obj(it["asset"], cx, cy, rot, it["scale"], 100))
        for pl in self.plots:                                  # plot fences: the sides and back, open to the street
            if not overlaps(pl["rect"], win, 2): continue
            for a, c in self.plot_fences(pl): paths.append(path([a, c], "Fence-Wood-Ashen-A.png", 64))
        if self.river_line:
            for piece in G.clip_line(self.river_line, bw):
                paths.append(path(piece, "River_Bank_Blue.webp", int(2 * self.river_half * C.CELL * 1.25), layer=50))
        for ox in getattr(self, "oxbows", []):
            for piece in G.clip_line(ox, bw):
                if len(piece) > 1: paths.append(path(piece, "River_Bank_Blue.webp", int(2 * self.river_half * C.CELL * 1.25), layer=50))
        for st in self.streams:                               # brooks: a narrow run of the same water
            for piece in G.clip_line(st["line"], bw):
                if len(piece) > 1: paths.append(path(piece, "River_Bank_Blue.webp", max(48, int(2 * st["half"] * C.CELL * 1.25)), layer=50))
        for br in self.bridges:
            bp = self.bridge_poly(br)
            if not overlaps(G.bbox(bp), win, 1): continue
            patterns.append(pattern(bp, B.FLOORS["planks"], math.atan2(br["dir"][1], br["dir"][0])))
            for a, c in ((bp[0], bp[1]), (bp[2], bp[3])): walls.append(wall_with_portals([a, c], "Wood_Ashen_A.png", [], False))
        for g in self.gardens:
            if g.get("fence") is False or not overlaps(g["rect"], win, 2): continue
            p = g["poly"]                                     # edge 2 to 3 faces the house: the gate is there
            for i in range(4):
                a, c = p[i], p[(i + 1) % 4]
                if i == 2:
                    m0 = (a[0] + (c[0] - a[0]) * .4, a[1] + (c[1] - a[1]) * .4); m1 = (a[0] + (c[0] - a[0]) * .6, a[1] + (c[1] - a[1]) * .6)
                    paths.append(path([a, m0], "Fence-Wood-Ashen-A.png", 64)); paths.append(path([m1, c], "Fence-Wood-Ashen-A.png", 64))
                else: paths.append(path([a, c], "Fence-Wood-Ashen-A.png", 64))
        runs, towers = self.wall_pieces()
        for run in runs:
            for piece in G.clip_line(run, bw): walls.append(wall_with_portals(piece, "Stone_A.png", [], False))
        for w in self.era_ways:                                # later ages: rails on the railway, stone on quays and embankments
            for piece in G.clip_line(w["line"], bw):
                if w["kind"] == "railway": paths.append(path(piece, "Road_Tracks_A.png", int(2 * w["half"] * C.CELL)))
                elif w["kind"] == "quay": patterns.append(pattern(G.buffer_line(piece, w["half"]), B.FLOORS["stone"]))
        for a in self.era_areas:
            if not overlaps(G.bbox(a["poly"]), win, 1): continue
            if a.get("floor"): patterns.append(pattern(a["poly"], B.FLOORS[a["floor"]]))
            if a["kind"] == "cemetery":
                P = a["poly"]
                paths.append(path(P + P[:1], "Fence-Wood-Dark-A.png", 64))
        for p0, p1 in getattr(self, "grates", []):            # the water gates: iron bars across the stream
            for piece in G.clip_line([p0, p1], bw): walls.append(wall_with_portals(piece, "Cell-Bars-Ribbon-A-wall.png", [], False))
        for l in self.landings:                                # river stairs: stone steps down to the water
            if overlaps(G.bbox(l["poly"]), win, 1): patterns.append(pattern(l["poly"], B.FLOORS["stone"], math.atan2(l["dir"][1], l["dir"][0])))
        for tx, ty in towers:
            if T.inside(tx, ty, win, 1.5):
                ring = [(tx + 1.1 * math.cos(a * math.pi / 6), ty + 1.1 * math.sin(a * math.pi / 6)) for a in range(12)]
                walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
        for wx, wy in [self.well] + self.more_wells:
            if T.inside(wx, wy, win, .6):
                ring = [(wx + .5 * math.cos(a * math.pi / 6), wy + .5 * math.sin(a * math.pi / 6)) for a in range(12)]
                walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
        if self.cross and T.inside(*self.cross, win, 1): objects.append(obj("Pillar_Marble_White_A1_1x1.webp", *self.cross, 0, 1.2, 100))
        for asset, x, y, rot, sc, layer, reach in self.deco:
            if T.inside(x, y, win, reach): objects.append(obj(asset, x, y, rot, sc, layer=layer))
        C.set_origin(0, 0)
        return walls, patterns, objects, paths

    def splat(self, win):
        """4 texels a square: grass, way (streets and roads), trodden (the market and by each door), forest floor."""
        ox, oy, cw, ch = win
        W, H = int(cw) * 4, int(ch) * 4
        road = [0.0] * (W * H)
        trod = [0.0] * (W * H)
        def each(x0, y0, x1, y1):
            for ty in range(max(0, int((y0 - oy) * 4)), min(H, int((y1 - oy) * 4) + 1)):
                for tx in range(max(0, int((x0 - ox) * 4)), min(W, int((x1 - ox) * 4) + 1)):
                    yield tx, ty, ox + (tx + .5) / 4, oy + (ty + .5) / 4
        for a, b, h, k in self.segs:
            ex = h + .35
            for tx, ty, x, y in each(min(a[0], b[0]) - ex, min(a[1], b[1]) - ex, max(a[0], b[0]) + ex, max(a[1], b[1]) + ex):
                d = G.seg_dist((x, y), a, b) - h
                v = 1 if d <= 0 else max(0, (.35 - d) / .35)
                if v > road[ty * W + tx]: road[ty * W + tx] = v
        mx, my, mw, mh = self.market
        for tx, ty, x, y in each(mx - .6, my - .6, mx + mw + .6, my + mh + .6):
            d = G.poly_dist((x, y), self.market_poly)
            v = min(1, max(0, (.6 - d) / .6)) * .9
            if v > trod[ty * W + tx]: trod[ty * W + tx] = v
        for b in self.blds:
            dx, dy = b.front()[1]
            for tx, ty, x, y in each(dx - 1.6, dy - 1.6, dx + 1.6, dy + 1.6):
                dd = math.hypot(x - dx, y - dy)
                if dd < 1.6: trod[ty * W + tx] = max(trod[ty * W + tx], (1.6 - dd) / 1.6 * .8)
        out, woods = [], {}
        for ty in range(H):
            for tx in range(W):
                x, y = ox + (tx + .5) / 4, oy + (ty + .5) / 4
                key = (math.floor(x), math.floor(y))
                if key not in woods: woods[key] = self.edge_wood(key[0] + .5, key[1] + .5)
                wood = woods[key]
                r, t = road[ty * W + tx], trod[ty * W + tx]
                out.extend(splat_byte([(1 - wood) * (1 - r) * (1 - t), r, t * (1 - r), wood * (1 - r) * (1 - t)]))
        return out

    # ------------------------------------------------------------ the WoDX sidecar, one part
    def sidecar(self, map_name, pt, base):
        win = pt["win"]
        ox, oy = win[0], win[1]
        loc = lambda p: [round(p[0] - ox, 3), round(p[1] - oy, 3)]
        lpoly = lambda poly: [loc(q) for q in poly]
        def region_shape(poly):
            c = G.clip_poly(poly, win)
            if not c: return None
            pts = [round(v, 3) for q in c for v in (q[0] - ox, q[1] - oy)]
            bx = G.bbox(c)
            return [round(bx[0] - ox, 3), round(bx[1] - oy, 3), round(bx[2], 3), round(bx[3], 3)], pts
        openings, features, regions, keys = [], [], [], set()
        for b in self.blds:
            if not self.mine(b, pt): continue
            keys.add(b.key)
            for n, (kind, x, y, seg) in enumerate(b.openings_world()):
                if kind not in C.OPENING_FLAGS: continue
                openings.append({"id": f"{b.key}-{kind}-{n}", "label": f"{b.label} {kind}", "c": loc(seg[:2]) + loc(seg[2:]),
                                 "inside": loc(b.centre), "barInside": kind in C.BARRED_INSIDE, "flags": dict(C.OPENING_FLAGS[kind])})
            for r in b.rooms:
                ents = C.feature_entries(f"{b.key}-", r, b.t["fill"])
                byid = {f"{b.key}-{r.name.lower().replace(' ', '-').replace(chr(39), '')}-{i}": (it, cx, cy, rot) for i, (it, cx, cy, rot) in enumerate(b.items_world(r))}
                for f in ents:
                    it, cx, cy, rot = byid[f["id"]]
                    w, h = it["w"], it["h"]
                    if it["rot"]: w, h = h, w                    # the picture's own size, before its quarter turn
                    f["rect"] = [round(cx - w / 2 - ox, 3), round(cy - h / 2 - oy, 3), round(w, 3), round(h, 3)]
                    f["rotation"] = round(math.degrees(rot) % 360, 2)
                    features.append(f)
            if b.t["place"]:
                rs = region_shape(b.outline)
                regions.append({"id": b.key, "label": b.label, "rect": rs[0], "points": rs[1], "place": {"kind": b.t["place"]}})
                if getattr(b, "era_area", None): regions[-1]["area"] = b.era_area
        if self.river_line:
            for j, piece in enumerate(G.clip_line(self.river_line, win)):
                step = max(1, math.ceil(len(piece) / 60))             # an outline of at most 200 points
                piece = piece[::step] + ([piece[-1]] if (len(piece) - 1) % step else [])
                rs = region_shape(G.buffer_line(piece, self.river_half))
                if rs: regions.append({"id": f"river-{j + 1}", "label": "The river", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}})
            for kind, label, lines in (("oxbow", "Oxbow lake", getattr(self, "oxbows", [])), ("old-loop", "Old river bed (wet meadow)", getattr(self, "old_loops", []))):
                for k, loop in enumerate(lines):              # (not ox: that is the window's corner)
                    for j2, piece in enumerate(G.clip_line(loop, win)):
                        if len(piece) < 2: continue
                        step = max(1, math.ceil(len(piece) / 60))
                        piece = piece[::step] + ([piece[-1]] if (len(piece) - 1) % step else [])
                        rs = region_shape(G.buffer_line(piece, self.river_half))
                        if rs: regions.append({"id": f"{kind}-{k + 1}-{j2 + 1}", "label": label, "rect": rs[0], "points": rs[1], "place": {"kind": "other"}, "area": kind})
        for k, st in enumerate(self.streams):
            for j2, piece in enumerate(G.clip_line(st["line"], win)):
                if len(piece) < 2: continue
                step = max(1, math.ceil(len(piece) / 60))
                piece = piece[::step] + ([piece[-1]] if (len(piece) - 1) % step else [])
                rs = region_shape(G.buffer_line(piece, st["half"] + .5))
                if rs: regions.append({"id": f"brook-{k + 1}-{j2 + 1}", "label": "Brook" + (" (sinks into the ground)" if st["into"] == "sink" else ""), "rect": rs[0], "points": rs[1], "place": {"kind": "other"}, "area": "brook"})
        for k, (x, y, rad) in enumerate(self.sinks):
            ring = [(x + rad * math.cos(t * math.pi / 8), y + rad * math.sin(t * math.pi / 8)) for t in range(16)]
            if overlaps(G.bbox(ring), win, 0):
                rs = region_shape(ring)
                if rs: regions.append({"id": f"sinkhole-{k + 1}", "label": "Sinkhole", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}, "area": "sinkhole"})
        for k, q in enumerate(self.burned):
            rs = region_shape(q)
            if rs: regions.append({"id": f"burned-{k + 1}", "label": "A burned-out plot", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}})
        if self.washing:
            rs = region_shape(self.washing["poly"])
            if rs: regions.append({"id": "washing-place", "label": "The washing place", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}})
        for k, w in enumerate(self.era_ways):
            for j, piece in enumerate(G.clip_line(w["line"], win)):
                step = max(1, math.ceil(len(piece) / 60))
                piece = piece[::step] + ([piece[-1]] if (len(piece) - 1) % step else [])
                rs = region_shape(G.buffer_line(piece, w["half"]))
                if rs: regions.append({"id": f"{w['kind']}-{k + 1}-{j + 1}", "label": w["label"], "rect": rs[0], "points": rs[1],
                                       "place": {"kind": "other" if w["kind"] == "railway" else "street"}, "area": w["kind"]})
        for k, a in enumerate(self.era_areas):
            rs = region_shape(a["poly"])
            if rs: regions.append({"id": f"{a['kind']}-{k + 1}", "label": a["label"], "rect": rs[0], "points": rs[1], "place": {"kind": "other"}, "area": a["kind"]})
        for k, l in enumerate(self.landings):
            rs = region_shape(l["poly"])
            if rs: regions.append({"id": f"landing-{k + 1}", "label": "River stairs", "rect": rs[0], "points": rs[1], "place": {"kind": "street"}})
        if self.wall: self.wall_pieces()
        for k, (p0, p1) in enumerate(getattr(self, "grates", [])):
            rs = region_shape(G.buffer_line([p0, p1], 1))
            if rs: regions.append({"id": f"water-gate-{k + 1}", "label": "Water gate", "rect": rs[0], "points": rs[1], "place": {"kind": "gate"},
                                   "behaviors": [{"type": "trigger", "system": {"label": f"the water gate of {self.name}, an iron grate over the river", "does": "note", "who": "pcs"}}]})
        for k, br in enumerate(self.bridges):
            rs = region_shape(self.bridge_poly(br))
            if rs: regions.append({"id": f"bridge-{k + 1}", "label": "Bridge", "rect": rs[0], "points": rs[1], "place": {"kind": "street"}})
        for pl in self.plots:
            rs = region_shape(pl["poly"])
            b = pl["b"]
            if rs: regions.append({"id": pl["id"], "label": f"Yard of the {b.label.lower()}", "rect": rs[0], "points": rs[1],
                                   "place": {"kind": "home" if b.t["place"] in ("home", None) else b.t["place"], "owner": b.key, "private": True}})
        for k, (wx, wy) in enumerate([self.well] + self.more_wells):
            if T.inside(wx, wy, win):
                features.append({"id": "well" if k == 0 else f"well-{k + 1}", "label": "Well" if k == 0 else "Public well", "rect": [round(wx - .5 - ox, 3), round(wy - .5 - oy, 3), 1, 1],
                                 "flags": {"climb": True, "climbKind": "rope", "height": 30, "depth": 30, "title": "Down the well on the bucket rope"}})
        if self.cross and T.inside(*self.cross, win):
            cx_, cy_ = self.cross
            regions.append({"id": "market-cross", "label": "The market cross", "rect": [round(cx_ - 1 - ox, 3), round(cy_ - 1 - oy, 3), 2, 2], "place": {"kind": "market"}})
        m = region_shape(self.market_poly)
        if m: regions.append({"id": "market", "label": "Village green" if self.size == "village" else "Market", "rect": m[0], "points": m[1], "place": {"kind": "market"}})
        for k, line in enumerate(self.road_lines):
            for j, piece in enumerate(G.clip_line(line, win)):
                rs = region_shape(G.buffer_line(piece, HALF["main"]))
                if rs: regions.append({"id": f"street-{k + 1}-{j + 1}", "label": "Main street" if any(self.in_town(q) for q in piece) else "Road",
                                       "rect": rs[0], "points": rs[1], "place": {"kind": "street"}})
        dirs = lambda p: ("north" if abs(p[1] - self.yc) > abs(p[0] - self.xc) and p[1] < self.yc else "south" if abs(p[1] - self.yc) > abs(p[0] - self.xc)
                          else "west" if p[0] < self.xc else "east")
        if self.wall:
            for k, g in enumerate(self.gates):
                if not T.inside(g[0], g[1], win): continue
                rect = T.clip((g[0] - 1.5, g[1] - 1.5, 3, 3), win)     # a gate by a part's edge keeps to its own map
                if not rect: continue
                regions.append({"id": f"gate-{k + 1}", "label": f"The {dirs(g)} gate", "rect": rect,
                                "behaviors": [{"type": "trigger", "system": {"label": f"the {dirs(g)} gate of {self.name}", "does": "note", "who": "pcs"}}]})
        whole = (0, 0, self.cols, self.rows)
        for k, line in enumerate(self.road_lines):
            for piece in G.clip_line(line, whole):
                for end in (piece[0], piece[-1]):
                    on_edge = min(end[0], end[1], self.cols - end[0], self.rows - end[1]) < .01
                    if not on_edge or not T.inside(end[0], end[1], win, .01): continue
                    side = "west" if end[0] < .01 else "east" if end[0] > self.cols - .01 else "north" if end[1] < .01 else "south"
                    x = min(max(end[0] - 1.5, 0), self.cols - 3); y = min(max(end[1] - 1.5, 0), self.rows - 3)
                    rc = T.clip((x, y, 3, 3), win)
                    rid = f"road-{side}-{k + 1}"
                    while any(r["id"] == rid for r in regions): rid += "b"     # a road that leaves by the same side twice
                    if rc: regions.append({"id": rid, "label": f"Road in from the {side}", "rect": rc,
                                           "behaviors": [{"type": "trigger", "system": {"label": f"the road into {self.name} from the {side}", "does": "note", "who": "pcs"}}]})
        nb = self.neighbours(pt)
        for side, other in nb.items():
            w, h = win[2], win[3]
            rect = {"north": [0, 0, w, 1], "south": [0, h - 1, w, 1], "west": [0, 0, 1, h], "east": [w - 1, 0, 1, h]}[side]
            regions.append({"id": f"edge-{side}", "label": f"To {self.name} {other}", "rect": rect,
                            "behaviors": [{"type": "trigger", "system": {"label": f"the way into {self.name} {other} ({side})", "does": "note", "who": "pcs"}}]})
        # For the Umbral twins (Otherworlds' reflection): what each building means, and what later ages pulled down
        places = {b.key: {"type": b.type, "wealth": getattr(b, "wealth", None), "dirty": bool(getattr(b, "dirty", False)),
                          "rebuilt": bool(getattr(b, "rebuilt", False))} for b in self.blds if b.key in keys}
        gone = []
        for g in getattr(self, "gone", []):
            rs = region_shape(g["outline"])
            if rs: gone.append({"id": f"gone-{g['key']}", "label": g["label"], "type": g["type"], "year": g["year"], "why": g["why"], "rect": rs[0], "points": rs[1]})
        out = {"format": "wodx-map", "version": 1, "name": f"{self.name} {pt['id']}".strip(), "map": map_name, "cells": [int(win[2]), int(win[3])], "seed": self.seed,
               "kind": self.size, "layout": "organic", "walled": bool(self.wall), "era": self.era_id(), "population": self.population(keys),
               "openings": openings, "features": features, "regions": regions, "households": [h for h in self.households if h["building"] in keys],
               "umbral": {"year": self.year, "places": places, "gone": gone}}
        if pt["id"]:
            out["part"] = {"of": self.name, "id": pt["id"], "origin": [win[0], win[1]], "whole": [self.cols, self.rows], "neighbours": nb, "index": f"{base}-parts.json"}
        return out

    def era_id(self):
        import eras
        return eras.era_id(self.year)

    # ------------------------------------------------------------ plan view
    def plan_svg(self, path_out, parts=()):
        s = 12 if self.cols <= 100 else 7
        f = lambda p: f"{p[0] * s:.1f},{p[1] * s:.1f}"
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.cols * s}" height="{self.rows * s}" font-family="DejaVu Sans" font-size="6">',
             '<rect width="100%" height="100%" fill="#e9efe0"/>']
        if getattr(self, "land", None) and self.land.z:      # the lie of the land: hill shading and contour lines
            px = 1 if self.cols <= 260 else 2
            url, w_, h_ = self.land.picture(px)
            o.append(f'<image href="{url}" x="0" y="0" width="{w_ * s}" height="{h_ * s}" preserveAspectRatio="none"/>')
            for n, (lv, segs) in enumerate(self.land.contours(2 if self.cols <= 260 else 3)):
                if not segs: continue
                major = round(lv / self.land.k["contour"]) % 5 == 0
                d = "".join(f"M{a_[0] * s:.0f} {a_[1] * s:.0f}L{b_[0] * s:.0f} {b_[1] * s:.0f}" for a_, b_ in segs)
                o.append(f'<path d="{d}" fill="none" stroke="#8a7650" stroke-opacity="{.65 if major else .4}" stroke-width="{1.5 if major else .8}"/>')
            for x, y, rad in self.sinks:
                o.append(f'<circle cx="{x * s:.0f}" cy="{y * s:.0f}" r="{rad * s:.0f}" fill="#b9c79b" fill-opacity=".5" stroke="#6b5a3a" stroke-dasharray="4 3"/>')
        if getattr(self, "fp_half", 0):
            o.append(f'<polyline points="{" ".join(map(f, self.river_line))}" fill="none" stroke="#dce6bf" stroke-opacity=".45" stroke-width="{2 * self.fp_half * s:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')
        for st in self.streams:
            o.append(f'<polyline points="{" ".join(map(f, st["line"]))}" fill="none" stroke="#7fa7c9" stroke-width="{2 * st["half"] * s:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')
        for p in self.patches:
            if p["inner"]: o.append(f'<polygon points="{" ".join(map(f, p["poly"]))}" fill="#f1efe4" stroke="#cfc6ae"/>')
        for a, b, h, k in self.segs:
            o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{b[0] * s:.1f}" y2="{b[1] * s:.1f}" stroke="#c9b48a" stroke-width="{2 * h * s:.1f}" stroke-linecap="round"/>')
        if self.river_line:
            for ox in getattr(self, "old_loops", []):
                o.append(f'<polyline points="{" ".join(map(f, ox))}" fill="none" stroke="#b9cfa2" stroke-width="{2.5 * self.river_half * s:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')
            for ox in getattr(self, "oxbows", []):
                o.append(f'<polyline points="{" ".join(map(f, ox))}" fill="none" stroke="#7fa7c9" stroke-width="{2.5 * self.river_half * s:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')
            if self.banks:
                le, ri, bars, _ = self.banks
                o.append(f'<polygon points="{" ".join(map(f, le + ri[::-1]))}" fill="#7fa7c9" stroke="#6a8fb0" stroke-width="1"/>')
                for b in bars: o.append(f'<polygon points="{" ".join(map(f, b))}" fill="#d9c9a0" stroke="#bfae84" stroke-width=".6"/>')
            else:
                o.append(f'<polyline points="{" ".join(map(f, self.river_line))}" fill="none" stroke="#7fa7c9" stroke-width="{2.5 * self.river_half * s:.1f}" stroke-linejoin="round"/>')
        for a in self.era_areas:
            o.append(f'<polygon points="{" ".join(map(f, a["poly"]))}" fill="{ {"cemetery": "#a9b99a", "park": "#9fcf8a", "bomb-site": "#8a817a", "car-park": "#9a9a9a", "station": "#b8b2a6"}.get(a["kind"], "#ccc")}" stroke="#555"/>')
        for w in self.era_ways:
            if w["kind"] == "railway": o.append(f'<polyline points="{" ".join(map(f, w["line"]))}" fill="none" stroke="#333" stroke-width="{1.2 * s:.1f}" stroke-dasharray="{.4 * s:.1f} {.4 * s:.1f}"/>')
        for q in self.burned: o.append(f'<polygon points="{" ".join(map(f, q))}" fill="#6d6259" stroke="#333"/>')
        if self.washing: o.append(f'<polygon points="{" ".join(map(f, self.washing["poly"]))}" fill="#cfe0ee" stroke="#456"/>')
        for br in self.bridges: o.append(f'<polygon points="{" ".join(map(f, self.bridge_poly(br)))}" fill="#a07a4c" stroke="#5a3d1e"/>')
        o.append(f'<polygon points="{" ".join(map(f, self.market_poly))}" fill="#d8c9a3" stroke="#8a7650" stroke-dasharray="3 2"/>')
        for pl in self.plots: o.append(f'<polygon points="{" ".join(map(f, pl["poly"]))}" fill="#ebe4cf" stroke="none"/>')
        for g in self.gardens: o.append(f'<polygon points="{" ".join(map(f, g["poly"]))}" fill="#b9d3a0" stroke="{"none" if g.get("fence") is False else "#6b4f2a"}"/>')
        for pl in self.plots:
            for a, c in self.plot_fences(pl): o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{c[0] * s:.1f}" y2="{c[1] * s:.1f}" stroke="#6b4f2a" stroke-width="1"/>')
        runs, towers = self.wall_pieces()
        for run in runs: o.append(f'<polyline points="{" ".join(map(f, run))}" fill="none" stroke="#444" stroke-width="{.6 * s}"/>')
        for p0, p1 in getattr(self, "grates", []): o.append(f'<line x1="{p0[0] * s:.1f}" y1="{p0[1] * s:.1f}" x2="{p1[0] * s:.1f}" y2="{p1[1] * s:.1f}" stroke="#222" stroke-width="{.5 * s}" stroke-dasharray="{.25 * s} {.25 * s}"/>')
        for l in self.landings: o.append(f'<polygon points="{" ".join(map(f, l["poly"]))}" fill="#b8b2a6" stroke="#555"/>')
        for t in towers: o.append(f'<circle cx="{t[0] * s:.1f}" cy="{t[1] * s:.1f}" r="{1.1 * s}" fill="#666"/>')
        for b in self.blds:
            fill = {"rich": "#fff4d8", "poor": "#efe9e0"}.get(getattr(b, "wealth", ""), "#fffdf8")
            o.append(f'<polygon points="{" ".join(map(f, b.outline))}" fill="{fill}" stroke="{"#555" if getattr(b, "rebuilt", False) else "#333"}" stroke-width="{3 if getattr(b, "rebuilt", False) else 2}"/>')
            for a, c in b.partitions_world(): o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{c[0] * s:.1f}" y2="{c[1] * s:.1f}" stroke="#333"/>')
            for r in b.rooms:
                for it, cx, cy, rot in b.items_world(r):
                    w, h = (it["h"], it["w"]) if it["rot"] else (it["w"], it["h"])
                    o.append(f'<polygon points="{" ".join(map(f, box_corners(cx, cy, rot, w, h)))}" fill="#9cc79a" stroke="#2c5a2a" stroke-width=".5"/>')
            for kind, x, y, seg in b.openings_world():
                o.append(f'<line x1="{seg[0] * s:.1f}" y1="{seg[1] * s:.1f}" x2="{seg[2] * s:.1f}" y2="{seg[3] * s:.1f}" stroke="{C.OPENING_COLOURS[kind]}" stroke-width="3"/>')
            o.append(f'<text x="{b.cx * s:.1f}" y="{b.cy * s:.1f}" text-anchor="middle" font-size="{6 if s > 8 else 4}" fill="#123">{b.label.split(" (")[0]}</text>')
        for wx, wy in [self.well] + self.more_wells: o.append(f'<circle cx="{wx * s:.1f}" cy="{wy * s:.1f}" r="{.5 * s}" fill="#8db3d9" stroke="#333"/>')
        if self.cross: o.append(f'<rect x="{(self.cross[0] - .4) * s:.1f}" y="{(self.cross[1] - .4) * s:.1f}" width="{.8 * s}" height="{.8 * s}" fill="#ddd" stroke="#333"/>')
        for _, x, y, th in self.stalls: o.append(f'<polygon points="{" ".join(map(f, box_corners(x, y, th, 2.6, 1.8)))}" fill="none" stroke="#a30" stroke-dasharray="2 2"/>')
        if any(pt["id"] for pt in parts):                       # each part line steps round the houses it passes: a
            for c in sorted({pt["cell"][0] for pt in parts} - {0}):    # house belongs to the part its middle is in
                o.append(self.part_line(c, "x", s))
            for c in sorted({pt["cell"][1] for pt in parts} - {0}):
                o.append(self.part_line(c, "y", s))
        for pt in parts:
            if not pt["id"]: continue
            c = pt["cell"]
            o.append(f'<text x="{c[0] * s + 6}" y="{c[1] * s + 22}" font-size="20" font-weight="bold" fill="#7a1fa2">{pt["id"]}</text>')
        o.append(f'<text x="6" y="{self.rows * s - 8}" font-size="12" font-weight="bold">{self.name}{f" in {self.year}" if self.year else ""}, a {"walled " if self.wall else ""}{self.cfg["label"]} of {self.population()} people in {len(self.households)} households'
                 + (f', in {len(parts)} parts' if len(parts) > 1 else "")
                 + (f'; {self.land.k["label"]}, {self.land.zmax:.0f} m of rise, contours every {self.land.k["contour"]} m' if self.land and self.land.z else "") + '</text>')
        o.append("</svg>")
        open(path_out, "w").write("\n".join(o))

    def make(self):
        self.mill = None
        if self.part:                                         # the part lines first, down streets and round the market
            self.cut_xs = even_cuts(self.cols, self.part)
            self.cut_ys = even_cuts(self.rows, self.part)
        self.lay_out()
        if self.year:
            import eras
            eras.grow(self, self.year)
        self.washing = self.washing_spot() if self.river_line and (self.year or 0) < 1900 else None
        self.well = self.well_spot()
        self.cross = self.cross_spot()
        self.more_wells = self.node_wells()
        self.stalls = self.market_things()
        ch = next(b for b in self.blds if b.type == "chapel")
        self.stocks = ch.world(ch.lw / 2 + 2.2, ch.lh + .8) if (self.year or 0) < 1837 else None   # the stocks went out of use
        self.stocks_th = ch.theta
        self.deco = self.scatter()
        self.check_ways()
        return self

    def check_ways(self):
        """Stops if any building or garden stands on a street, road or alley: townsfolk walk these on their rounds."""
        for b in self.blds:
            if not self.off_ways(b.hulls, b.rect, 0): raise SystemExit(f"{b.key} stands on a way")
        for g in self.gardens:
            if not self.off_ways([g["poly"]], g["rect"], 0): raise SystemExit(f"{g['id']} stands on a way")
        if self.river_line:                                   # no way runs on into the water without a bridge
            vh, rl = 1.25 * self.river_half, self.river_line
            key = lambda q: (round(q[0], 3), round(q[1], 3))
            bridged = {key(q) for a, b, hh, k in self.segs if any(seg_cross(a, b, p, q) for p, q in zip(rl, rl[1:])) for q in (a, b)}
            for a, b, hh, k in self.segs:
                if any(seg_cross(a, b, p, q) for p, q in zip(rl, rl[1:])): continue
                for q in (a, b):                              # an end carried on over a bridge by the next stretch is fine
                    if key(q) not in bridged and self.river_near(q)[1] < vh + hh: raise SystemExit(f"a {k} runs into the river at {a}, {b}")
