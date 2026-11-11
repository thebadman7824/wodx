"""WoDX map generators: an organic layout for a village, town or city. A Python port, in WoDX's own shape, of the
layout steps of Oleg Dolya's Medieval Fantasy City Generator (released CC0; github.com/watabou/TownGeneratorOS):

  1. Patches: points on a spiral, their Voronoi regions, the middle few smoothed. The first patch is the market;
     the next ones (as many as the size asks) are the town, the rest the countryside.
  2. Junctions closer than a few units are merged, so streets do not meet at slivers.
  3. A curtain wall (when the place has one) runs round the town patches, smoothed, with gates where two town
     patches meet the wall, never two gates side by side.
  4. Streets run from each gate to the market's nearest corner along patch edges, by the shortest way through the
     town; roads run from the countryside to each gate the same way outside it. Streets and roads that share
     their way are joined into arteries, and the arteries smoothed, which bends every patch along them.
  5. Wards: each town patch is given a kind (craftsmen, merchants, the church, ...), each kind taking the patch
     its rule likes best: the church and the merchants by the market, the poor far from it, the watch by the wall.
     Patches at a gate may become gate wards. Countryside patches by a road may become farms.

Units are the original's; the town generator scales them to map cells. Everything draws from ddcore.R.
"""
import math
import ddcore as C
import geom as G

# Ward lists in the order they are handed out, as in the original (its list, cut to what WoDX has buildings for).
WARDS = {
    "village": ["church", "village", "village", "village", "village", "village", "village", "village"],
    "town": ["craftsmen", "craftsmen", "merchant", "church", "craftsmen", "craftsmen", "slum", "craftsmen", "patriciate",
             "craftsmen", "military", "craftsmen", "slum", "merchant", "craftsmen", "park"],
    "city": ["craftsmen", "craftsmen", "merchant", "craftsmen", "craftsmen", "church", "craftsmen", "craftsmen", "craftsmen",
             "craftsmen", "craftsmen", "craftsmen", "craftsmen", "administration", "craftsmen", "slum", "craftsmen", "slum",
             "patriciate", "market", "slum", "craftsmen", "craftsmen", "craftsmen", "slum", "craftsmen", "craftsmen",
             "craftsmen", "military", "slum", "craftsmen", "park", "patriciate", "market", "merchant"],
    # a metropolis: the city's list with more of everything, three cities' worth of wards (a house rule)
    "metropolis": ["craftsmen", "merchant", "craftsmen", "church", "administration", "craftsmen", "market", "craftsmen", "slum",
                   "patriciate", "craftsmen", "merchant", "craftsmen", "slum", "church", "craftsmen", "military", "craftsmen",
                   "market", "craftsmen", "slum", "patriciate", "craftsmen", "merchant", "park", "craftsmen", "slum", "craftsmen",
                   "administration", "craftsmen", "church", "slum", "craftsmen", "merchant", "craftsmen", "market", "craftsmen",
                   "military", "slum", "patriciate", "craftsmen", "craftsmen", "park", "merchant", "slum", "craftsmen", "church",
                   "craftsmen", "market", "craftsmen", "slum", "craftsmen", "patriciate", "craftsmen", "merchant", "park"],
}

class Layout:
    def __init__(self, n_patches, walls, size, tries=40):
        for _ in range(tries):
            try:
                self.build(n_patches, walls, size)
                return
            except ValueError as e:
                self.why = str(e)
        raise SystemExit(f"no layout after {tries} tries: {self.why}")

    # ------------------------------------------------------------ patches
    def build(self, n, walls, size):
        R = C.R
        self.n, self.walls_wanted, self.size = n, walls, size
        sa = R.random() * 2 * math.pi
        pts = []
        for i in range(n * 8):
            a = sa + math.sqrt(i) * 5
            r = 0 if i == 0 else 10 + i * (2 + R.random())
            pts.append((math.cos(a) * r, math.sin(a) * r))
        regions, verts = G.voronoi(pts)
        for _ in range(3):                                   # relax the middle patches
            for j in [0, 1, 2, n]:
                if j in regions: pts[j] = G.centroid([verts[v] for v in regions[j]])
            regions, verts = G.voronoi(pts)
        order = sorted(regions, key=lambda i: math.hypot(*pts[i]))
        self.V = {k: list(v) for k, v in verts.items()}
        self.patches = []
        for k, i in enumerate(order):
            self.patches.append({"id": k, "v": list(regions[i]), "inner": k < n, "ward": None})
        if len(self.patches) < n + 4: raise ValueError("too few closed patches")
        self.plaza = self.patches[0]
        self.inner = [p for p in self.patches if p["inner"]]
        self.optimize_junctions()
        self.build_walls()
        self.build_streets()
        self.assign_wards()

    def pt(self, v): return tuple(self.V[v])
    def poly(self, p): return [self.pt(v) for v in p["v"]]
    def by_vertex(self, v): return [p for p in self.patches if v in p["v"]]
    def borders(self, a, b): return a is not b and len(set(a["v"]) & set(b["v"])) >= 2

    def optimize_junctions(self):
        for w in self.inner:
            i = 0
            while i < len(w["v"]):
                v0, v1 = w["v"][i], w["v"][(i + 1) % len(w["v"])]
                if v0 != v1 and math.dist(self.pt(v0), self.pt(v1)) < 8:
                    for p in self.patches:
                        p["v"] = [v0 if v == v1 else v for v in p["v"]]
                    a, b = self.V[v0], self.V.pop(v1)
                    self.V[v0] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
                i += 1
        for p in self.patches:
            out = []
            for v in p["v"]:
                if not out or out[-1] != v: out.append(v)
            while len(out) > 1 and out[0] == out[-1]: out.pop()
            p["v"] = out
        self.patches = [p for p in self.patches if len(p["v"]) >= 3]
        self.inner = [p for p in self.patches if p["inner"]]
        if self.plaza not in self.patches: raise ValueError("the market patch folded away")

    # ------------------------------------------------------------ the wall and gates
    def circumference(self, wards):
        edges = {}
        all_e = {(p["v"][i], p["v"][(i + 1) % len(p["v"])]) for p in wards for i in range(len(p["v"]))}
        for a, b in all_e:
            if (b, a) not in all_e: edges[a] = b
        if not edges: raise ValueError("no outline")
        start = next(iter(edges))
        ring, v = [start], edges[start]
        while v != start:
            ring.append(v)
            v = edges.get(v)
            if v is None or len(ring) > len(edges): raise ValueError("the outline does not close")
        if len(ring) != len(edges): raise ValueError("the town is in more than one piece")
        return ring

    def build_walls(self):
        R = C.R
        ring = self.circumference(self.inner)
        self.border = ring
        if self.walls_wanted:
            f = min(1, 40 / len(self.inner))
            new = {}
            for i, v in enumerate(ring):
                a, b, c = self.pt(ring[i - 1]), self.pt(v), self.pt(ring[(i + 1) % len(ring)])
                new[v] = [(a[0] + b[0] * f + c[0]) / (2 + f), (a[1] + b[1] * f + c[1]) / (2 + f)]
            self.V.update(new)
        entrances = [v for v in ring if sum(1 for p in self.inner if v in p["v"]) > 1]
        if len(entrances) < 2 and not self.walls_wanted: entrances = list(ring)
        if len(entrances) < 2: raise ValueError("no room for gates")
        every = list(entrances)
        gates = []
        while len(entrances) >= 3 or not gates:
            k = R.randrange(len(entrances))
            gates.append(entrances[k])
            near = {entrances[k - 1], entrances[k], entrances[(k + 1) % len(entrances)]}
            entrances = [e for e in entrances if e not in near]
            if not entrances: break
        if len(gates) < 2:                                    # at least a road in and a road out
            gates.append(max((e for e in every if e not in gates), key=lambda e: math.dist(self.pt(e), self.pt(gates[0]))))
        if self.walls_wanted:
            for g in gates:                                   # a road needs a way out: split the one field outside a gate
                outer = [p for p in self.by_vertex(g) if not p["inner"]]
                if len(outer) != 1 or len(outer[0]["v"]) <= 3: continue
                op = outer[0]
                i = ring.index(g)
                a, b = self.pt(ring[i - 1]), self.pt(ring[(i + 1) % len(ring)])
                out_d = (b[1] - a[1], -(b[0] - a[0]))
                gx, gy = self.pt(g)
                if out_d[0] * gx + out_d[1] * gy < 0: out_d = (-out_d[0], -out_d[1])
                def score(v):
                    if v in ring: return -math.inf
                    dx, dy = self.V[v][0] - gx, self.V[v][1] - gy
                    return (dx * out_d[0] + dy * out_d[1]) / (math.hypot(dx, dy) or 1)
                far = max(op["v"], key=score)
                if score(far) == -math.inf: continue
                vs = op["v"]; i0, i1 = vs.index(g), vs.index(far)
                if i0 > i1: i0, i1 = i1, i0
                h1, h2 = vs[i0:i1 + 1], vs[i1:] + vs[:i0 + 1]
                if len(h1) < 3 or len(h2) < 3: continue
                k = self.patches.index(op)
                self.patches[k:k + 1] = [{"id": op["id"], "v": h1, "inner": False, "ward": None}, {"id": op["id"] + .5, "v": h2, "inner": False, "ward": None}]
            for g in gates:
                i = ring.index(g)
                a, b, c = self.pt(ring[i - 1]), self.pt(g), self.pt(ring[(i + 1) % len(ring)])
                self.V[g] = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
        self.gates = gates
        self.wall = ring if self.walls_wanted else None
        radius = max(math.hypot(*self.pt(v)) for v in ring)
        self.patches = [p for p in self.patches if min(math.hypot(*q) for q in self.poly(p)) < radius * 3]

    # ------------------------------------------------------------ streets and roads
    def graph(self):
        blocked = set(self.wall or []) - set(self.gates)
        adj = {}
        for p in self.patches:
            vs = p["v"]
            for i in range(len(vs)):
                a, b = vs[i], vs[(i + 1) % len(vs)]
                if a in blocked or b in blocked: continue
                d = math.dist(self.pt(a), self.pt(b))
                adj.setdefault(a, {})[b] = d; adj.setdefault(b, {})[a] = d
        border = set(self.border)
        inner_n = {v for p in self.patches if p["inner"] for v in p["v"]} - border
        outer_n = {v for p in self.patches if not p["inner"] for v in p["v"]} - border
        return adj, inner_n, outer_n

    @staticmethod
    def shortest(adj, a, b, exclude):
        import heapq
        dist, prev, q = {a: 0}, {}, [(0, a)]
        while q:
            d, v = heapq.heappop(q)
            if v == b:
                out = [b]
                while out[-1] != a: out.append(prev[out[-1]])
                return out[::-1]
            if d > dist.get(v, math.inf): continue
            for w, l in adj.get(v, {}).items():
                if w in exclude and w != b: continue
                nd = d + l
                if nd < dist.get(w, math.inf): dist[w] = nd; prev[w] = v; heapq.heappush(q, (nd, w))
        return None

    def build_streets(self):
        adj, inner_n, outer_n = self.graph()
        self.streets, self.roads = [], []
        plaza = set(self.plaza["v"])
        for g in self.gates:
            end = min(self.plaza["v"], key=lambda v: math.dist(self.pt(v), self.pt(g)))
            s = self.shortest(adj, g, end, outer_n)
            if not s: raise ValueError("a gate has no street")
            self.streets.append(s)
            gx, gy = self.pt(g)
            L = math.hypot(gx, gy) or 1
            far = (gx / L * 1000, gy / L * 1000)
            start = min((v for v in adj if v not in inner_n), key=lambda v: math.dist(self.pt(v), far))
            r = self.shortest(adj, start, g, inner_n)
            if r: self.roads.append(r)
        # join shared ways into arteries
        segs = []
        for s in self.streets + self.roads:
            for a, b in zip(s, s[1:]):
                if a in plaza and b in plaza: continue
                if (a, b) not in segs and (b, a) not in segs: segs.append((a, b))
        arts = []
        while segs:
            a, b = segs.pop()
            for art in arts:
                if art[0] == b: art.insert(0, a); break
                if art[-1] == a: art.append(b); break
            else: arts.append([a, b])
        self.arteries = arts
        for art in arts:                                      # smooth them, which bends the patches along them
            new = {}
            for i in range(1, len(art) - 1):
                a, b, c = self.pt(art[i - 1]), self.pt(art[i]), self.pt(art[i + 1])
                if art[i] in (self.wall or []): continue
                new[art[i]] = [(a[0] + b[0] * 3 + c[0]) / 5, (a[1] + b[1] * 3 + c[1]) / 5]
            self.V.update(new)
        self.art_edges = {frozenset(e) for art in arts for e in zip(art, art[1:])}

    # ------------------------------------------------------------ wards
    def rate(self, kind, p):
        pc = G.centroid(self.poly(self.plaza))
        d = math.dist(G.centroid(self.poly(p)), pc)
        A = abs(G.area(self.poly(p)))
        if kind in ("merchant",): return d
        if kind == "church": return -1 / A if self.borders(p, self.plaza) else d * A
        if kind == "administration": return 0 if self.borders(p, self.plaza) else d
        if kind == "slum": return -d
        if kind == "market":
            if any(q["ward"] == "market" and self.borders(p, q) for q in self.inner): return math.inf
            return A / abs(G.area(self.poly(self.plaza)))
        if kind == "military":
            if self.wall and len(set(p["v"]) & set(self.wall)) >= 2: return 1
            return 0 if not self.wall else math.inf
        if kind == "patriciate":
            return sum(-1 if q["ward"] == "park" else 1 if q["ward"] == "slum" else 0 for q in self.patches if q["ward"] and self.borders(p, q))
        return C.R.random()                                   # craftsmen, park, village: anywhere

    def assign_wards(self):
        R = C.R
        self.plaza["ward"] = "plaza"
        left = [p for p in self.inner if p is not self.plaza]
        for g in self.gates:
            for p in self.by_vertex(g):
                if p in left and R.random() < (.5 if self.wall else .2):
                    p["ward"] = "gate"; left.remove(p)
        kinds = list(WARDS[self.size])
        for _ in range(len(kinds) // 10):
            i = R.randrange(len(kinds) - 1)
            kinds[i], kinds[i + 1] = kinds[i + 1], kinds[i]
        while left:
            kind = kinds.pop(0) if kinds else ("village" if self.size == "village" else "slum")
            best = min(left, key=lambda p: self.rate(kind, p))
            best["ward"] = kind; left.remove(best)
        road_v = {v for r in self.roads for v in r}
        for p in self.patches:
            if p["inner"] or p["ward"]: continue
            if self.wall and any(g in p["v"] for g in self.gates) and R.random() < .85: p["ward"] = "gate-out"   # suburbs grow outside the gates
            elif set(p["v"]) & road_v and R.random() < (.8 if self.size == "village" else .5): p["ward"] = "farm"
            else: p["ward"] = "country"
