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
import layout as L
import ddtown as T

ORGANIC = {
    "village": {"n": 5, "walls": 0, "scale": 1.6, "margin": 12, "label": "village", "stalls": 1, "river": .5, "rhalf": 1.3},
    "town": {"n": 10, "walls": .6, "scale": 1.6, "margin": 10, "label": "small town", "stalls": 5, "river": .6, "rhalf": 1.8},
    "city": {"n": 18, "walls": 1, "scale": 1.6, "margin": 10, "label": "city", "stalls": 9, "river": .75, "rhalf": 2.3},
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
    "gate-out": [("cottage", 3), ("smithy", 1), ("workshop", 1), ("byre-house", 2)],
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
COURTS = {"slum", "craftsmen"}   # wards that build on alleys and back to back, packing yards into courts
BACK_TO_BACK = {"village": 24, "gate-out": 22, "patriciate": 20}   # the least depth for two frontages back to back, else 16
TERRACED = {"merchant": 1, "market": 1, "administration": .8, "gate": .6, "craftsmen": .6, "slum": .5}   # chance a frontage is a row
CAPS = {"village": {"smithy": 1, "bakehouse": 1, "tavern": 1, "guardhouse": 0, "storehouse": 1},
        "town": {"smithy": 2, "bakehouse": 2, "tavern": 2, "guardhouse": 2, "storehouse": 3},
        "city": {"smithy": 4, "bakehouse": 5, "tavern": 4, "guardhouse": 5, "storehouse": 7}}
LABELS = {"cottage": "Cottage", "byre-house": "Farmhouse", "smithy": "Smithy", "bakehouse": "Bakehouse", "tavern": "Alehouse",
          "storehouse": "Storehouse", "guardhouse": "Guardhouse", "barn": "Barn", "chapel": "Chapel"}

def snap(a): return round(a / STEP) * STEP

def box_corners(cx, cy, th, w, h):
    c, s = math.cos(th), math.sin(th)
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]

def seg_cross(a, b, p, q):
    """Where two segments cross, or None."""
    d1, d2 = (b[0] - a[0], b[1] - a[1]), (q[0] - p[0], q[1] - p[1])
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-12: return None
    t = ((p[0] - a[0]) * d2[1] - (p[1] - a[1]) * d2[0]) / den
    u = ((p[0] - a[0]) * d1[1] - (p[1] - a[1]) * d1[0]) / den
    return (a[0] + d1[0] * t, a[1] + d1[1] * t) if 0 <= t <= 1 and 0 <= u <= 1 else None

class OrganicTown(T.Town):
    def __init__(self, seed, size, name=None, night=True, walls=None, river=None):
        self.R = R = C.R
        cfg = dict(ORGANIC[size])
        self.size, self.cfg, self.seed, self.night = size, cfg, seed, night
        self.name = name or (R.choice(T.NAME_A) + R.choice(T.NAME_B))
        self.pop_target = R.randint(*T.SIZES[size]["pop"])
        want_walls = (R.random() < cfg["walls"]) if walls is None else walls
        self.L = lay = L.Layout(cfg["n"], want_walls, size)
        s = cfg["scale"]
        inner_pts = [lay.pt(v) for p in lay.inner for v in p["v"]]
        x0, x1 = min(p[0] for p in inner_pts), max(p[0] for p in inner_pts)
        y0, y1 = min(p[1] for p in inner_pts), max(p[1] for p in inner_pts)
        m = cfg["margin"]
        self.cols, self.rows = math.ceil((x1 - x0) * s + 2 * m), math.ceil((y1 - y0) * s + 2 * m)
        to = lambda p: (round((p[0] - x0) * s + m, 4), round((p[1] - y0) * s + m, 4))
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
        if (R.random() < cfg["river"]) if river is None else river: self.pick_river()
        self.ways()
        self.roads = []                                       # the grid generator's road rects: none here
        self.blds, self.gardens, self.households, self.notes = [], [], [], []
        self.plots, self.frontages = [], {}
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
        self.river_line, self.bridges = [], []
        if self.river_v: self.lay_river()

    def in_town(self, p): return G.inside(p, self.outline)

    # ------------------------------------------------------------ the river
    def pick_river(self):
        """A river across the whole map, winding gently, passing to one side of the market (towns grow beside their
        rivers, not over them). It is not tied to the patches: buildings, plots and gardens keep off its banks, and
        each way that crosses it gets a bridge."""
        R = self.R
        h = self.river_half = self.cfg["rhalf"]
        mr = max(math.dist((self.xc, self.yc), q) for q in self.market_poly)
        town_r = max(math.dist((self.xc, self.yc), q) for q in self.outline) if self.outline else 30
        th = R.uniform(0, math.pi)
        u, n = (math.cos(th), math.sin(th)), (-math.sin(th), math.cos(th))
        amp, wave, ph = R.uniform(2, 6), R.uniform(35, 70), R.uniform(0, 2 * math.pi)
        off = R.choice((-1, 1)) * R.uniform(mr + h + 4, max(mr + h + 5, town_r * .55))
        far = math.hypot(self.cols, self.rows)
        for _ in range(12):
            pts = []
            for k in range(int(2 * far / 2) + 1):
                t = -far + k * 2
                w = off + amp * math.sin(t / wave * 2 * math.pi + ph)
                pts.append((self.xc + u[0] * t + n[0] * w, self.yc + u[1] * t + n[1] * w))
            if min(G.seg_dist(q, a, b) for q in self.market_poly for a, b in zip(pts, pts[1:])) > h + 3: break
            off *= 1.15
        else: return
        self.river_v = pts                                    # the flow runs from the first point to the last

    def lay_river(self):
        """The river's line, its banks kept clear, and bridges where a way crosses it."""
        pts = self.river_line = self.river_v
        h = self.river_half
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
        if blk is not None and not all(G.inside(q, blk) for q in pts): return False
        for _, b in self.bgrid.near((x, y, w, h), gap + .5):
            if any(G.separation(poly, hb) < gap for poly in polys for hb in b.hulls): return False
        for _, g in self.ggrid.near((x, y, w, h), .8):
            if any(G.separation(poly, g["poly"]) < .4 for poly in polys): return False
        if not self.off_ways(polys, (x, y, w, h), .25): return False
        if self.wall and any(G.seg_dist(q, self.wall[i - 1], self.wall[i]) < 1.4 for q in pts for i in range(len(self.wall))): return False
        if any(G.separation(poly, self.market_poly) < .3 for poly in polys): return False
        return True

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
                    b = self.put(tk, self.label_for(tk), spot)
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
        if self.river_line: self.put_mill(blocks)
        self.count["tavern"] = 1
        order = ["gate", "merchant", "market", "administration", "church", "military", "patriciate", "craftsmen", "village", "slum", "gate-out"]
        for ward in order:
            for p, blk, kinds in blocks.values():
                if p["ward"] != ward: continue
                self.lots(blk, kinds, ward)                    # cuts the alleys through a big block
                es = self.edges_of(blk, kinds)
                es.sort(key=lambda e: (e["kind"] != "main", -e["len"]))
                done = []
                for e in es + (self.alley_edges() if ward in COURTS else []):
                    # burgage plots: a frontage backing on to one already built leaves the land between as their yards
                    if ward not in COURTS and any(e["in"][0] * f["in"][0] + e["in"][1] * f["in"][1] < -.6 and
                                                  (e["mid"][0] - f["mid"][0]) * f["in"][0] + (e["mid"][1] - f["mid"][1]) * f["in"][1] < BACK_TO_BACK.get(ward, 16)
                                                  for f in done): continue
                    self.fill_edge(e, ward, blk); done.append(e)
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
        self.make_plots()
        for b in self.blds:
            if getattr(b, "plot", None) or b.type not in ("cottage", "byre-house", "townhouse"): continue
            if R.random() < .8: self.garden_behind(b)
        self.people()
        if not any(b.type == "cottage" for b in self.blds): self.notes.append("no cottages")

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

    def market_things(self):
        R = self.R
        out = []
        wx, wy = self.well
        mx, my, mw, mh = self.market
        taken = [box_corners(wx, wy, 0, 2.4, 2.4)]
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
        if self.washing:
            (x, y), th = self.washing["at"], self.washing["th"]
            for dx, a, sc in ((-.8, "Trough_Wood_Ashen_Water_A_2x1.webp", 1), (.9, "Bucket_Wood_Ashen_A_1x1.webp", .8), (1.5, "Barrel_Wood_Ashen_A_1x1.webp", .8)):
                out.append((a, x + dx * math.cos(th), y + dx * math.sin(th), th, sc, 100, .6))
        wx, wy = self.well
        out.append(("Bucket_Wood_Ashen_A_1x1.webp", wx + .9, wy + .3, 0, .8, 100, .4))
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
        return runs, towers

    # ------------------------------------------------------------ Dungeondraft, one part
    def build(self, pt):
        win = pt["win"]
        C.set_origin(win[0], win[1])
        walls, patterns, objects, paths = [], [], [], []
        bw = (win[0] - 2, win[1] - 2, win[2] + 4, win[3] + 4)
        for b in self.blds:
            if not overlaps(b.rect, win): continue
            ops = [(k, x, y, None) for k, x, y, _ in b.openings_world()]
            walls.append(wall_with_portals(b.outline, b.t["wall"], ops, True))
            for a, c in b.partitions_world(): walls.append(wall_with_portals([a, c], b.t["wall"], ops, False))
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
        for tx, ty in towers:
            if T.inside(tx, ty, win, 1.5):
                ring = [(tx + 1.1 * math.cos(a * math.pi / 6), ty + 1.1 * math.sin(a * math.pi / 6)) for a in range(12)]
                walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
        wx, wy = self.well
        if T.inside(wx, wy, win, .6):
            ring = [(wx + .5 * math.cos(a * math.pi / 6), wy + .5 * math.sin(a * math.pi / 6)) for a in range(12)]
            walls.append(wall_with_portals(ring, "Stone_A.png", [], True))
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
        if self.river_line:
            for j, piece in enumerate(G.clip_line(self.river_line, win)):
                step = max(1, math.ceil(len(piece) / 60))             # an outline of at most 200 points
                piece = piece[::step] + ([piece[-1]] if (len(piece) - 1) % step else [])
                rs = region_shape(G.buffer_line(piece, self.river_half))
                if rs: regions.append({"id": f"river-{j + 1}", "label": "The river", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}})
        if self.washing:
            rs = region_shape(self.washing["poly"])
            if rs: regions.append({"id": "washing-place", "label": "The washing place", "rect": rs[0], "points": rs[1], "place": {"kind": "other"}})
        for k, br in enumerate(self.bridges):
            rs = region_shape(self.bridge_poly(br))
            if rs: regions.append({"id": f"bridge-{k + 1}", "label": "Bridge", "rect": rs[0], "points": rs[1], "place": {"kind": "street"}})
        for pl in self.plots:
            rs = region_shape(pl["poly"])
            b = pl["b"]
            if rs: regions.append({"id": pl["id"], "label": f"Yard of the {b.label.lower()}", "rect": rs[0], "points": rs[1],
                                   "place": {"kind": "home" if b.t["place"] in ("home", None) else b.t["place"], "owner": b.key, "private": True}})
        wx, wy = self.well
        if T.inside(wx, wy, win):
            features.append({"id": "well", "label": "Well", "rect": [round(wx - .5 - ox, 3), round(wy - .5 - oy, 3), 1, 1],
                             "flags": {"climb": True, "climbKind": "rope", "height": 30, "depth": 30, "title": "Down the well on the bucket rope"}})
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
                    if rc: regions.append({"id": f"road-{side}-{k + 1}", "label": f"Road in from the {side}", "rect": rc,
                                           "behaviors": [{"type": "trigger", "system": {"label": f"the road into {self.name} from the {side}", "does": "note", "who": "pcs"}}]})
        nb = self.neighbours(pt)
        for side, other in nb.items():
            w, h = win[2], win[3]
            rect = {"north": [0, 0, w, 1], "south": [0, h - 1, w, 1], "west": [0, 0, 1, h], "east": [w - 1, 0, 1, h]}[side]
            regions.append({"id": f"edge-{side}", "label": f"To {self.name} {other}", "rect": rect,
                            "behaviors": [{"type": "trigger", "system": {"label": f"the way into {self.name} {other} ({side})", "does": "note", "who": "pcs"}}]})
        out = {"format": "wodx-map", "version": 1, "name": f"{self.name} {pt['id']}".strip(), "map": map_name, "cells": [int(win[2]), int(win[3])], "seed": self.seed,
               "kind": self.size, "layout": "organic", "walled": bool(self.wall), "era": "dark-ages", "population": self.population(keys),
               "openings": openings, "features": features, "regions": regions, "households": [h for h in self.households if h["building"] in keys]}
        if pt["id"]:
            out["part"] = {"of": self.name, "id": pt["id"], "origin": [win[0], win[1]], "whole": [self.cols, self.rows], "neighbours": nb, "index": f"{base}-parts.json"}
        return out

    # ------------------------------------------------------------ plan view
    def plan_svg(self, path_out, parts=()):
        s = 12 if self.cols <= 100 else 7
        f = lambda p: f"{p[0] * s:.1f},{p[1] * s:.1f}"
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.cols * s}" height="{self.rows * s}" font-family="DejaVu Sans" font-size="6">',
             '<rect width="100%" height="100%" fill="#e9efe0"/>']
        for p in self.patches:
            if p["inner"]: o.append(f'<polygon points="{" ".join(map(f, p["poly"]))}" fill="#f1efe4" stroke="#cfc6ae"/>')
        for a, b, h, k in self.segs:
            o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{b[0] * s:.1f}" y2="{b[1] * s:.1f}" stroke="#c9b48a" stroke-width="{2 * h * s:.1f}" stroke-linecap="round"/>')
        if self.river_line:
            o.append(f'<polyline points="{" ".join(map(f, self.river_line))}" fill="none" stroke="#7fa7c9" stroke-width="{2 * self.river_half * s:.1f}" stroke-linejoin="round"/>')
        if self.washing: o.append(f'<polygon points="{" ".join(map(f, self.washing["poly"]))}" fill="#cfe0ee" stroke="#456"/>')
        for br in self.bridges: o.append(f'<polygon points="{" ".join(map(f, self.bridge_poly(br)))}" fill="#a07a4c" stroke="#5a3d1e"/>')
        o.append(f'<polygon points="{" ".join(map(f, self.market_poly))}" fill="#d8c9a3" stroke="#8a7650" stroke-dasharray="3 2"/>')
        for pl in self.plots: o.append(f'<polygon points="{" ".join(map(f, pl["poly"]))}" fill="#ebe4cf" stroke="none"/>')
        for g in self.gardens: o.append(f'<polygon points="{" ".join(map(f, g["poly"]))}" fill="#b9d3a0" stroke="{"none" if g.get("fence") is False else "#6b4f2a"}"/>')
        for pl in self.plots:
            for a, c in self.plot_fences(pl): o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{c[0] * s:.1f}" y2="{c[1] * s:.1f}" stroke="#6b4f2a" stroke-width="1"/>')
        runs, towers = self.wall_pieces()
        for run in runs: o.append(f'<polyline points="{" ".join(map(f, run))}" fill="none" stroke="#444" stroke-width="{.6 * s}"/>')
        for t in towers: o.append(f'<circle cx="{t[0] * s:.1f}" cy="{t[1] * s:.1f}" r="{1.1 * s}" fill="#666"/>')
        for b in self.blds:
            o.append(f'<polygon points="{" ".join(map(f, b.outline))}" fill="#fffdf8" stroke="#333" stroke-width="2"/>')
            for a, c in b.partitions_world(): o.append(f'<line x1="{a[0] * s:.1f}" y1="{a[1] * s:.1f}" x2="{c[0] * s:.1f}" y2="{c[1] * s:.1f}" stroke="#333"/>')
            for r in b.rooms:
                for it, cx, cy, rot in b.items_world(r):
                    w, h = (it["h"], it["w"]) if it["rot"] else (it["w"], it["h"])
                    o.append(f'<polygon points="{" ".join(map(f, box_corners(cx, cy, rot, w, h)))}" fill="#9cc79a" stroke="#2c5a2a" stroke-width=".5"/>')
            for kind, x, y, seg in b.openings_world():
                o.append(f'<line x1="{seg[0] * s:.1f}" y1="{seg[1] * s:.1f}" x2="{seg[2] * s:.1f}" y2="{seg[3] * s:.1f}" stroke="{C.OPENING_COLOURS[kind]}" stroke-width="3"/>')
            o.append(f'<text x="{b.cx * s:.1f}" y="{b.cy * s:.1f}" text-anchor="middle" font-size="{6 if s > 8 else 4}" fill="#123">{b.label.split(" (")[0]}</text>')
        wx, wy = self.well
        o.append(f'<circle cx="{wx * s}" cy="{wy * s}" r="{.5 * s}" fill="#8db3d9" stroke="#333"/>')
        for _, x, y, th in self.stalls: o.append(f'<polygon points="{" ".join(map(f, box_corners(x, y, th, 2.6, 1.8)))}" fill="none" stroke="#a30" stroke-dasharray="2 2"/>')
        for pt in parts:
            if not pt["id"]: continue
            c = pt["cell"]
            o.append(f'<rect x="{c[0] * s}" y="{c[1] * s}" width="{c[2] * s}" height="{c[3] * s}" fill="none" stroke="#7a1fa2" stroke-width="3" stroke-dasharray="10 6"/>')
            o.append(f'<text x="{c[0] * s + 6}" y="{c[1] * s + 22}" font-size="20" font-weight="bold" fill="#7a1fa2">{pt["id"]}</text>')
        o.append(f'<text x="6" y="{self.rows * s - 8}" font-size="12" font-weight="bold">{self.name}, a {"walled " if self.wall else ""}{self.cfg["label"]} of {self.population()} people in {len(self.households)} households'
                 + (f', in {len(parts)} parts' if len(parts) > 1 else "") + '</text>')
        o.append("</svg>")
        open(path_out, "w").write("\n".join(o))

    def make(self):
        self.mill = None
        self.lay_out()
        self.washing = self.washing_spot() if self.river_line else None
        self.well = self.well_spot()
        self.stalls = self.market_things()
        ch = next(b for b in self.blds if b.type == "chapel")
        self.stocks = ch.world(ch.lw / 2 + 2.2, ch.lh + .8)
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
