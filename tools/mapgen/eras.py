"""Era layers for the organic town generator.

A town is first laid out as it stood in the Middle Ages (organic.py). Each later age then changes it, in order, up to
the chosen year, the way London and most old European towns changed: rebuilt in brick after fires, quays and
warehouses on the river, back plots filled with courts, the wall pulled down for a ring road, garden cemeteries,
public parks, a railway cut through to a station, wide boulevards, an embankment, suburbs along the roads out,
bomb damage and its rebuilding, and old docks turned to offices. The dates are a house rule taken from London's
history and are rough: one year per layer, the same for every town.

Only the plan changes. Every building type is still a medieval one (later building packs are not in the asset
list yet), so a Victorian street is drawn with medieval houses on a Victorian plan.
"""
import json, math, os
import geom as G
import ddtown as T
import buildings as B
import eratypes as E
import cddatypes as CD

HERE = os.path.dirname(os.path.abspath(__file__))
ERAS = os.path.join(HERE, "..", "..", "modules", "wodx-chronicle", "data", "eras.json")

# area kinds a town can have, with the year each first appears and the sidecar place kind (the catalogue by era)
AREAS = {
    "market": ("Market", None, "market"), "street": ("Street", None, "street"), "river": ("The river", None, "other"),
    "bridge": ("Bridge", None, "street"), "washing-place": ("The washing place", None, "other"), "landing": ("River stairs", None, "street"),
    "water-gate": ("Water gate", None, "gate"), "burned": ("A burned-out plot", None, "other"),
    "quay": ("Quay", 1690, "street"), "warehouse": ("Warehouse", 1690, "workplace"), "court": ("Court", 1780, "home"),
    "ring-road": ("Ring road", 1800, "street"), "cemetery": ("Cemetery", 1832, "other"), "station": ("Railway station", 1838, "other"),
    "railway": ("Railway", 1838, "other"), "park": ("Public park", 1840, "other"), "boulevard": ("Boulevard", 1853, "street"),
    "embankment": ("Embankment", 1865, "street"), "suburb": ("Suburb", 1920, "home"), "bomb-site": ("Bomb site", 1940, "other"),
    "car-park": ("Car park", 1960, "other"), "offices": ("Offices", 1975, "workplace"),
}
LAYERS = [(1667, "brick"), (1690, "quays"), (1780, "courts"), (1800, "wall-down"), (1832, "cemetery"), (1838, "railway"),
          (1840, "park"), (1853, "boulevards"), (1865, "embankment"), (1920, "suburbs"), (1940, "blitz"), (1975, "docklands")]
HALF = {"rail": 1.0, "quay": 1.0, "ring": 1.4, "boulevard": 2.0}


def era_id(year):
    """The Chronicle era profile for a year: the one whose years hold it (the Wild West is left to American maps),
    else the last one that ended before it."""
    if year is None: return "dark-ages"
    ps = [p for p in json.load(open(ERAS, encoding="utf-8"))["profiles"] if p.get("start") is not None]
    hit = [p for p in ps if p["start"] <= year <= p["end"] and p["id"] != "wild-west"]
    if hit: return min(hit, key=lambda p: p["end"] - p["start"])["id"]
    before = [p for p in ps if p["end"] < year and p["id"] != "wild-west"]
    return max(before, key=lambda p: p["end"])["id"] if before else "dark-ages"


def add_way(t, pts, kind, half, loop=False):
    pts = list(pts) + ([pts[0]] if loop else [])
    new = []
    for a, b in zip(pts, pts[1:]):
        if math.dist(a, b) < .05: continue
        sg = (a, b, half, kind)
        t.segs.append(sg); new.append(sg)
        t.seg_grid.add((min(a[0], b[0]) - half, min(a[1], b[1]) - half, abs(b[0] - a[0]) + 2 * half, abs(b[1] - a[1]) + 2 * half), sg)
    if t.river_line:                                          # a bridge wherever the new way crosses the water
        rl, h = t.river_line, t.river_half
        for a, b, hh, k in new:
            for p, q in zip(rl, rl[1:]):
                x = T_cross(a, b, p, q)
                if not x or any(math.dist(x, br["at"]) < 4 for br in t.bridges): continue
                d, f = (b[0] - a[0], b[1] - a[1]), (q[0] - p[0], q[1] - p[1])
                L_, Lf = math.hypot(*d) or 1, math.hypot(*f) or 1
                sin = abs(d[0] * f[1] - d[1] * f[0]) / L_ / Lf
                t.bridges.append({"at": x, "dir": (d[0] / L_, d[1] / L_), "len": 2 * h / max(sin, .5) + 2.4, "w": 2 * hh + .6})
    return new


def runs_clear(t, pts, half):
    """A line broken where it would run through the chapel or the market tavern (a way stops short of them)."""
    keep = [hb for b in t.blds if b.type == "chapel" or b.label == "Tavern" for hb in b.hulls]
    out, cur = [], []
    for a, b in zip(pts, pts[1:]):
        if any(G.seg_poly_dist(a, b, hb) < half + .3 for hb in keep):
            if len(cur) > 1: out.append(cur)
            cur = []
            continue
        if not cur: cur = [a]
        cur.append(b)
    if len(cur) > 1: out.append(cur)
    return out


def T_cross(a, b, p, q):
    import organic
    return organic.seg_cross(a, b, p, q)


def clear(t, keep=("chapel",), why="cleared"):
    """Takes away every building, plot and garden that now stands on a way (the new streets were cut through)."""
    gone = set()
    for b in list(t.blds):
        if b.type in keep or b.label in ("Tavern",): continue
        if not t.off_ways(b.hulls, b.rect, .1): gone.add(b.key)
    drop(t, gone)
    t.gardens = [g for g in t.gardens if t.off_ways([g["poly"]], g["rect"], 0)]
    for pl in list(t.plots):
        if not t.off_ways([pl["poly"]], pl["rect"], 0): t.plots.remove(pl); pl["b"].plot = None
    regrid(t)
    t.cleared = getattr(t, "cleared", 0) + len(gone)
    return len(gone)


def drop(t, keys):
    if not keys: return
    # Remembered for the Shadowlands: a building pulled down by a later age can stand there again as a relic
    if not hasattr(t, "gone"): t.gone = []
    for b in t.blds:
        if b.key in keys:
            t.gone.append({"key": b.key, "label": b.label, "type": b.type, "outline": list(b.outline),
                           "year": getattr(t, "layer_year", t.year), "why": getattr(t, "layer_name", "")})
    t.blds = [b for b in t.blds if b.key not in keys]
    t.households = [h for h in t.households if h["building"] not in keys]
    t.gardens = [g for g in t.gardens if g.get("of") not in keys]
    t.plots = [pl for pl in t.plots if pl["b"].key not in keys]
    if t.mill is not None and t.mill.key in keys: t.mill = None


def regrid(t):
    t.bgrid, t.ggrid = T.Grid(), T.Grid()
    for b in t.blds: t.bgrid.add(b.rect, b)
    for g in t.gardens: t.ggrid.add(g["rect"], g)


def household(t, b, trade, extra=()):
    R = t.R
    roles = [trade] + (["partner"] if R.random() < .8 else []) + ["child"] * R.choice((0, 1, 1, 2, 3)) + list(extra)
    t.households.append({"id": f"{b.key}-household", "building": b.key, "label": f"{b.label} household", "trade": trade,
                         "people": [{"role": r} for r in roles], "wealth": getattr(b, "wealth", "middling")})


def offset_line(pts, d):
    out = []
    for i, q in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        L_ = math.dist(a, b) or 1
        out.append((q[0] - (b[1] - a[1]) / L_ * d, q[1] + (b[0] - a[0]) / L_ * d))
    return out


def town_side(t):
    """+1 or -1: the side of the river (left of its flow) the market stands on."""
    pts = t.river_line
    k = min(range(len(pts) - 1), key=lambda k: math.dist(pts[k], (t.xc, t.yc)))
    a, b = pts[k], pts[k + 1]
    return 1 if (b[0] - a[0]) * (t.yc - a[1]) - (b[1] - a[1]) * (t.xc - a[0]) > 0 else -1


def bank_way(t, side, kind, label):
    """A way along one bank, as far as the town reaches (a quay or an embankment)."""
    d = side * (1.25 * t.river_half + HALF["quay"] + .3)
    line = offset_line(t.river_line, d)
    r = t.town_r() * 1.1
    runs, cur = [], []
    for q in line:
        if math.dist(q, (t.xc, t.yc)) < r and 1 < q[0] < t.cols - 1 and 1 < q[1] < t.rows - 1: cur.append(q)
        elif cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    runs = [x for x in runs if len(x) > 3]
    if not runs: return []
    run = max(runs, key=len)
    for piece in runs_clear(t, run, HALF["quay"]):
        add_way(t, piece, kind, HALF["quay"])
        t.era_ways.append({"kind": kind, "label": label, "line": piece, "half": HALF["quay"]})
    return run


def layer_brick(t):
    for b in t.blds:
        if getattr(b, "wealth", "") == "rich" or getattr(b, "wall_tex", "") == "Stone_A.png": continue
        if t.year >= 1800 or t.R.random() < .7: b.wall_tex = "BrickWood_Ashen_A.png"


def layer_quays(t):
    if not t.river_line or t.size == "village": return
    run = bank_way(t, town_side(t), "quay", "Quay")
    clear(t)
    if not run: return
    side = town_side(t)
    n, want = 0, {"town": 3, "city": 6, "metropolis": 14}[t.size]
    for i in range(0, len(run) - 3, 2):
        a, b = run[i], run[i + 3]
        L_ = math.dist(a, b) or 1
        u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
        inw = (-u[1] * side, u[0] * side)                    # away from the water
        A = (a[0] + inw[0] * (HALF["quay"] + .4), a[1] + inw[1] * (HALF["quay"] + .4))
        s = t.try_at("storehouse", A, u, inw, 0, .2, .8, None)
        if s and t.put("storehouse", "Warehouse", s):
            t.blds[-1].era_area = "warehouse"; n += 1
            if n >= want: break


def layer_courts(t):
    """The back plots fill up: a cottage built at the back fence of a poor or middling plot, facing the house across
    a narrow yard (the courts and yards of Georgian London)."""
    if t.size == "village": return
    R = t.R
    for pl in list(t.plots):
        b = pl["b"]
        if getattr(b, "wealth", "middling") == "rich" or b.type in ("chapel", "tavern") or R.random() < .35: continue
        c, s_ = math.cos(b.theta), math.sin(b.theta)
        o = b.world(0, 0)
        lx = lambda q: (q[0] - o[0]) * c + (q[1] - o[1]) * s_
        ly = lambda q: -(q[0] - o[0]) * s_ + (q[1] - o[1]) * c
        P = pl["poly"]
        yb = min(map(ly, P))
        y0 = min(ly(q) for hb in b.hulls for q in hb)          # the house's back wall
        xs = sorted(map(lx, P))
        lo, hi = xs[1], xs[-2]
        lw, lh = B_size("cottage")
        if hi - lo < lw + .4: continue
        yf = yb + .3 + lh                                        # the cottage's front, facing the house
        if y0 - yf < 1.6: continue
        gs = [g for g in t.gardens if g.get("b") is b]
        for g in gs: t.gardens.remove(g)
        regrid(t)
        mid = (lo + hi) / 2
        A = b.world(mid - lw / 2, yf)
        u, inw = (c, s_), (s_, -c)
        spot = t.try_at("cottage", A, u, inw, 0, 0, .3, P)
        ct = t.put("cottage", "Court cottage", spot) if spot else None
        if ct:
            ct.era_area = "court"; ct.wealth = "poor"
            household(t, ct, R.choice(["labourer", "porter", "washer", "weaver", "hawker"]))
        else:
            t.gardens += gs; regrid(t)


def B_size(k):
    import buildings as B
    return B.TYPES[k]["size"]


def layer_wall_down(t):
    if not t.wall: return
    ring = list(t.wall)
    for piece in runs_clear(t, ring + ring[:1], HALF["ring"]):
        add_way(t, piece, "ring", HALF["ring"])
        t.era_ways.append({"kind": "ring-road", "label": "Ring road (where the wall stood)", "line": piece, "half": HALF["ring"]})
    t.wall, t.old_gates, t.gates = None, t.gates, []
    t._walls = ([], [])
    t.grates = []
    clear(t)


def open_box(t, w, h, taken=()):
    """A w by h piece of open ground outside the old town, as near to it as may be, clear of ways and buildings
    (where a cemetery or a park was laid out on the fields)."""
    win = (3, 3, t.cols - 6, t.rows - 6)
    best = None
    for p in t.patches:
        if p["inner"] or p["ward"] not in ("country", "farm"): continue
        poly = G.clip_poly(p["poly"], win)
        if not poly or abs(G.area(poly)) < w * h: continue
        poly = G.inset(poly, [1.5] * len(poly)) if G.convex(poly) else poly
        if not poly: continue
        c = G.centroid(poly)
        for k in range(11):
            f = k / 10
            q = (c[0] + ((t.xc - c[0]) * f), c[1] + ((t.yc - c[1]) * f))
            box = [(q[0] - w / 2, q[1] - h / 2), (q[0] + w / 2, q[1] - h / 2), (q[0] + w / 2, q[1] + h / 2), (q[0] - w / 2, q[1] + h / 2)]
            if not all(G.inside(v, poly) for v in box): continue
            bb = G.bbox(box)
            if not t.off_ways([box], bb, .5): continue
            if any(G.separation(box, hb) < .8 for _, b in t.bgrid.near(bb, 1) for hb in b.hulls): continue
            if any(G.separation(box, g["poly"]) < .3 for g in t.gardens) or any(G.separation(box, o) < 1 for o in taken): continue
            if t.river_line and t.river_seg_dist(box[0], box[2]) < 1.25 * t.river_half + w: continue
            d = math.dist(q, (t.xc, t.yc))
            if best is None or d < best[0]: best = (d, box)
    return best[1] if best else None


def layer_cemetery(t):
    box = open_box(t, {"village": 10, "town": 14, "city": 18, "metropolis": 26}[t.size], {"village": 8, "town": 10, "city": 14, "metropolis": 20}[t.size])
    if box: t.era_areas.append({"kind": "cemetery", "label": "Cemetery", "poly": box})


def layer_railway(t):
    if t.size == "village": return
    R = t.R
    inner = [q for p in t.patches if p["inner"] for q in p["poly"]]
    r = sum(math.dist(q, (t.xc, t.yc)) for q in inner) / len(inner) * 1.25   # about where the old town ends
    far = math.hypot(t.cols, t.rows)
    best = None
    for k in range(12):
        th = k * math.pi / 12
        u, n = (math.cos(th), math.sin(th)), (-math.sin(th), math.cos(th))
        for off in (-1, 1):
            for f in (.8, .9, 1.0, 1.1):
                o = (t.xc + n[0] * off * r * f, t.yc + n[1] * off * r * f)
                if not (12 < o[0] < t.cols - 12 and 12 < o[1] < t.rows - 12): continue
                a, b = (o[0] - u[0] * far, o[1] - u[1] * far), (o[0] + u[0] * far, o[1] + u[1] * far)
                hit = sum(1 for bd in t.blds if any(G.seg_poly_dist(a, b, hb) < HALF["rail"] + .1 for hb in bd.hulls))
                bad = any(bd.type == "chapel" or bd.label == "Tavern" for bd in t.blds if any(G.seg_poly_dist(a, b, hb) < HALF["rail"] + .1 for hb in bd.hulls))
                bad = bad or G.poly_dist(o, t.market_poly) < 4 or any(G.seg_poly_dist(a, b, t.market_poly) < 2 for _ in (0,))
                st = (o[0] - n[0] * off * 5, o[1] - n[1] * off * 5)   # where the station would stand
                if t.river_line and t.river_near(st)[1] < 1.25 * t.river_half + 7: bad = True
                pc = G.clip_line([a, b], (0, 0, t.cols, t.rows))
                if not pc or math.dist(pc[0][0], pc[0][-1]) < .6 * min(t.cols, t.rows): bad = True   # it must cross the map, not clip a corner
                score = hit * .5 + (1000 if bad else 0) + R.random() * .5
                if best is None or score < best[0]: best = (score, a, b, o, u, n, off)
    if not best or best[0] >= 1000: return
    _, a, b, o, u, n, off = best
    piece = G.clip_line([a, b], (0, 0, t.cols, t.rows))
    if not piece: return
    a, b = piece[0][0], piece[0][-1]
    add_way(t, [a, b], "rail", HALF["rail"])
    t.era_ways.append({"kind": "railway", "label": "Railway", "line": [a, b], "half": HALF["rail"]})
    clear(t)
    # the station: on the town side of the line, at its nearest to the market
    side = (-n[0] * off, -n[1] * off)
    L_ = math.dist(a, b) or 1
    t0 = (o[0] - a[0]) * u[0] + (o[1] - a[1]) * u[1]
    for _ in range(2):
        if station(t, a, u, side, t0, L_): return
        # no room: the houses where the station is wanted are pulled down for it
        g = HALF["rail"] + 1.6
        site = [(a[0] + u[0] * (t0 - 7) + side[0] * g, a[1] + u[1] * (t0 - 7) + side[1] * g),
                (a[0] + u[0] * (t0 + 3) + side[0] * g, a[1] + u[1] * (t0 + 3) + side[1] * g),
                (a[0] + u[0] * (t0 + 3) + side[0] * (g + 7), a[1] + u[1] * (t0 + 3) + side[1] * (g + 7)),
                (a[0] + u[0] * (t0 - 7) + side[0] * (g + 7), a[1] + u[1] * (t0 - 7) + side[1] * (g + 7))]
        drop(t, {b.key for b in t.blds if b.type != "chapel" and b.label != "Tavern" and any(G.separation(site, hb) < 1 for hb in b.hulls)})
        t.gardens = [x for x in t.gardens if G.separation(site, x["poly"]) > .3]
        t.plots = [x for x in t.plots if G.separation(site, x["poly"]) > .1]
        regrid(t)


def station(t, a, u, side, t0, L_=None):
    """The station beside the line, as near the market as it will go: the town side first, then the other."""
    L_ = L_ or 200
    g = HALF["rail"] + 1.6
    for sd in (side, (-side[0], -side[1])):
        A = (a[0] + sd[0] * g, a[1] + sd[1] * g)
        spots = sorted(range(2, int(L_) - 8, 2), key=lambda tt: math.dist((A[0] + u[0] * (tt + 3), A[1] + u[1] * (tt + 3)), (t.xc, t.yc)))
        for tt in spots[:40]:
            s = t.try_at("storehouse", A, u, sd, tt, .1, .8, None)
            if not s: continue
            st = t.put("storehouse", "Railway station", s)
            if not st: continue
            st.era_area = "station"
            plat = [(A[0] + u[0] * (tt - 2) - sd[0] * 1.5, A[1] + u[1] * (tt - 2) - sd[1] * 1.5),
                    (A[0] + u[0] * (tt + 12) - sd[0] * 1.5, A[1] + u[1] * (tt + 12) - sd[1] * 1.5),
                    (A[0] + u[0] * (tt + 12), A[1] + u[1] * (tt + 12)), (A[0] + u[0] * (tt - 2), A[1] + u[1] * (tt - 2))]
            t.era_areas.append({"kind": "station", "label": "Railway platform", "poly": plat, "floor": "stone"})
            household(t, st, "stationmaster", ["porter", "clerk"])
            return True
    return False


def layer_park(t):
    """The town's common, or a field by it, laid out as a public park (towns and cities)."""
    if t.size == "village": return
    for p in t.patches:
        if p["ward"] == "park":
            poly = G.inset(p["poly"], [2.3] * len(p["poly"]))
            if poly: t.era_areas.append({"kind": "park", "label": "Public park", "poly": poly}); return
    box = open_box(t, {"town": 16, "city": 24, "metropolis": 30}[t.size], {"town": 12, "city": 18, "metropolis": 22}[t.size], [a["poly"] for a in t.era_areas])
    if box: t.era_areas.append({"kind": "park", "label": "Public park", "poly": box})


def layer_boulevards(t):
    if t.size not in ("city", "metropolis"): return
    out = []
    for sg in t.segs:
        a, b, h, k = sg
        near = [hb for bd in t.blds if bd.type == "chapel" or bd.label == "Tavern" for hb in bd.hulls]
        wide = k == "main" and not any(G.seg_poly_dist(a, b, hb) < HALF["boulevard"] + .2 for hb in near)
        if wide and t.river_line:                             # a street that stops at the bank keeps its width there
            vh = 1.25 * t.river_half + HALF["boulevard"] + .2
            crosses = t.river_seg_dist(a, b) == 0
            if not crosses and min(t.river_near(a)[1], t.river_near(b)[1]) < vh: wide = False
        out.append((a, b, HALF["boulevard"], "boulevard") if wide else sg)
    t.segs = out
    t.seg_grid = T.Grid(6)
    for a, b, h, k in t.segs:
        t.seg_grid.add((min(a[0], b[0]) - h, min(a[1], b[1]) - h, abs(b[0] - a[0]) + 2 * h, abs(b[1] - a[1]) + 2 * h), (a, b, h, k))
    if t.river_line:
        for a, b in zip(t.river_line, t.river_line[1:]):
            h = t.river_half
            t.seg_grid.add((min(a[0], b[0]) - h, min(a[1], b[1]) - h, abs(b[0] - a[0]) + 2 * h, abs(b[1] - a[1]) + 2 * h), (a, b, h + .4, "river"))
    for l in t.landings:
        q, u, ln = l["at"], l["dir"], l["len"]
        e = (q[0] + u[0] * ln, q[1] + u[1] * ln)
        t.seg_grid.add((min(q[0], e[0]) - 2, min(q[1], e[1]) - 2, abs(e[0] - q[0]) + 4, abs(e[1] - q[1]) + 4), (q, e, l["half"], "landing"))
    clear(t)


def layer_embankment(t):
    if not t.river_line or t.size not in ("city", "metropolis"): return
    bank_way(t, -town_side(t), "quay", "Embankment")
    clear(t)


def layer_suburbs(t):
    R = t.R
    n = 0
    want = {"village": 6, "town": 14, "city": 24, "metropolis": 60}[t.size]
    drop(t, {b.key for b in t.blds if b.type in ("byre-house", "barn") and not t.in_town(b.centre)})   # the farms near town are sold for building
    regrid(t)
    lines = list(t.road_lines) + [w["line"] for w in t.era_ways if w["kind"] == "ring-road"]
    for line in lines:
        for a, b in zip(line, line[1:]):
            L_ = math.dist(a, b)
            if L_ < 4: continue
            u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
            for side in (1, -1):
                inw = (-u[1] * side, u[0] * side)
                hw = max((h for a_, b_, h, k in t.segs if (a_, b_) == (a, b)), default=1.4)
                A = (a[0] + inw[0] * (hw + .3), a[1] + inw[1] * (hw + .3))
                tt = 1.0
                while tt < min(L_, 90) - 8 and n < want:
                    q = (A[0] + u[0] * tt, A[1] + u[1] * tt)
                    if t.in_town(q) or not (3 < q[0] < t.cols - 3 and 3 < q[1] < t.rows - 3):
                        tt += 2; continue
                    s = t.try_at("cottage", A, u, inw, tt, 1.2, 2.2, None)
                    if s and (c := t.put("cottage", "Suburban house", s)):
                        c.era_area = "suburb"; c.wall_tex = "BrickWood_Ashen_A.png"; c.wealth = "middling"; n += 1
                        household(t, c, R.choice(["clerk", "shopkeeper", "teacher", "engine driver", "nurse", "factory hand"]))
                        tt += 9
                    else: tt += 2


def layer_blitz(t):
    R = t.R
    if t.size == "village" or (t.size == "town" and R.random() < .5): return
    hits = {"town": 1, "city": 3, "metropolis": 8}[t.size]
    cand = [b for b in t.blds if b.type not in ("chapel",) and b.label not in ("Tavern", "Railway station")]
    for _ in range(hits):
        if not cand: break
        b = R.choice(cand)
        c, rad = b.centre, R.uniform(3.5, 5.5)
        ring = [(c[0] + rad * math.cos(k * math.pi / 6), c[1] + rad * math.sin(k * math.pi / 6)) for k in range(12)]
        keep = {"chapel"}
        gone = {o.key for o in t.blds if o.type not in keep and o.label not in ("Tavern", "Railway station") and any(G.separation(ring, hb) < 0 for hb in o.hulls)}
        drop(t, gone); regrid(t)
        t.era_areas.append({"kind": "bomb-site" if t.year < 1960 else "car-park", "label": "Bomb site" if t.year < 1960 else "Car park (built over a bomb site)", "poly": ring})
        cand = [o for o in cand if o.key not in gone]


def layer_docklands(t):
    for b in t.blds:
        if getattr(b, "era_area", "") == "warehouse":
            b.label = "Offices (old warehouse)"; b.era_area = "offices"


# ------------------------------------------------------------------ each era's own buildings (the building-designs doc)
# At the start of each era some of the town's houses are rebuilt in that era's types, as real towns were: plot by plot,
# a house now and then taking in its neighbour's plot. The shares are a house rule, rough rates of renewal.
REBUILDS = [(1450, "renaissance", .30), (1601, "age-of-reason", .30), (1837, "victorian", .25), (1919, "mid-century", .12),
            (1990, "modern", .08), (2010, "future-darkness", .15)]
KEEP = {"chapel", "town-hall", "tenement", "mill", "panel-block", "dept-store", "culture-house", "hypermarket", "capsule-tower", "vertical-farm", "school"}


def types_for(year, upto, role):
    """Era types of a role first built by `upto` and still being built at `year`."""
    return [k for k, v in E.ERA_TYPES.items() if v["role"] == role and v["built"][0] <= upto and v["built"][1] >= year]


def replace(t, olds, tk, label=None, trade=None, extra=2):
    """Pulls down the buildings `olds` (the first is the one whose front line the new building keeps) and puts up a
    type tk in their place, its front on the same line. Puts them back and returns None if it will not fit."""
    b = olds[0]
    tdef = B.TYPES[tk]
    lw, lh = tdef["size"]
    n = b.normal
    F = b.world(b.lw / 2, b.lh)                               # the middle of the old front
    cx, cy = F[0] - n[0] * lh / 2, F[1] - n[1] * lh / 2
    th = b.theta
    import organic as O
    cs = O.box_corners(cx, cy, th, lw, lh)
    gone = {o.key for o in olds}
    keep_h = [h for h in t.households if h["building"] in gone]
    saved = (list(t.blds), list(t.households), list(t.gardens), list(t.plots))
    # whatever else the new footprint would stand on comes down too (a plot taken in), but never a kept building
    for o in t.blds:
        if o.key in gone: continue
        if any(G.separation(cs, hb) < .3 for hb in o.hulls):
            if o.type in KEEP or o.type in ("smithy", "bakehouse", "guardhouse") or o is getattr(t, "mill", None) or len(gone) >= len(olds) + extra: return None
            gone.add(o.key); keep_h += [h for h in t.households if h["building"] == o.key]
    drop(t, gone); regrid(t)
    spot = (cx, cy, th, cs, tdef) if t.free([cs], .3, None) else None
    nb = t.put(tk, label or tdef["label"], spot) if spot else None
    if not nb:
        t.blds, t.households, t.gardens, t.plots = saved
        regrid(t)
        return None
    nb.built_era = tdef.get("era")
    nb.wealth = getattr(b, "wealth", "middling")
    for h in keep_h[:1]:                                      # the old household moves in; a block gets its flats
        t.households.append(dict(h, id=f"{nb.key}-household", building=nb.key, label=f"{nb.label} household"))
    for i in range(min(tdef.get("flats", 1), 60) - len(keep_h[:1])):
        household(t, nb, trade or t.R.choice(["clerk", "shopkeeper", "teacher", "factory hand", "nurse", "driver", "pensioner"]))
        t.households[-1]["id"] = f"{nb.key}-household-{i + 2}"
    return nb


def in_quarter(t, b):
    """Houses of the Jewish quarter stand together in one street or two, as in Mikulov, Třebíč or Boskovice, off the
    market. About half of towns have one (the royal towns expelled their Jews in 1454)."""
    if not hasattr(t, "quarter"):
        r = max(math.dist((t.xc, t.yc), q) for q in t.outline) if t.outline else 20
        spots = [o.centre for o in t.blds if t.in_town(o.centre) and .45 * r < math.dist(o.centre, (t.xc, t.yc)) < .9 * r]
        t.quarter = t.R.choice(spots) if spots and t.R.random() < .5 else None
    return t.quarter is not None and math.dist(b.centre, t.quarter) < 12


def rebuild(t, y0, era, share):
    """One era's renewal of the town's houses and shops."""
    R = t.R
    upto = min(t.year, next((y for y, e, _ in REBUILDS if y > y0), 2099) - 1)
    olds = [b for b in t.blds if b.type in sum((E.REPLACES[r] for r in E.REPLACES), ()) + tuple(E.ERA_TYPES)
            and b.type not in KEEP and (t.in_town(b.centre) or era in ("mid-century", "modern", "future-darkness"))]
    R.shuffle(olds)
    n = 0
    for b in olds[:int(len(olds) * share * 1.6)]:
        if n >= len(olds) * share: break
        if b not in t.blds: continue
        role = next((r for r, ks in E.REPLACES.items() if b.type in ks), None) or B.TYPES[b.type].get("role", "home")
        if role in ("block", "civic", "industry", "farm"): continue
        cands = types_for(y0, upto, role) or types_for(y0, upto, "home")
        if "ghetto-house" in cands and not in_quarter(t, b): cands.remove("ghetto-house")
        if not cands: continue
        if replace(t, [b], R.choice(cands)): n += 1
    return n


def place_blocks(t, tk, n, where, fallback=True):
    """Big types: on the main streets near the market ("core"), along the roads out of town ("edge").
    Whatever will not fit where it is meant to go is tried in the other place."""
    made = _place_blocks(t, tk, n, where)
    if made < n and fallback: made += _place_blocks(t, tk, n - made, "edge" if where == "core" else "core")
    if made < n and fallback and B.TYPES[tk]["role"] in ("block", "industry", "civic"): made += estate(t, tk, n - made)
    return made


def estate(t, tk, n):
    """A housing estate (sídliště): blocks set square to each other on open ground just outside the old town, with
    lawns between them, as at Brno-Lesná or Ostrava-Poruba. Each block needs nothing but free ground."""
    import organic as O
    tdef = B.TYPES[tk]
    lw, lh = tdef["size"]
    made, step = 0, 3
    spots = [(i, j) for j in range(4, t.rows - 4, step) for i in range(4, t.cols - 4, step) if not t.in_town((i, j))]
    spots.sort(key=lambda q: math.dist(q, (t.xc, t.yc)))
    th0 = t.R.choice((0.0, math.pi / 2))
    for (cx, cy) in spots:
        if made >= n: break
        for th in (th0, th0 + math.pi / 2):
            cs = O.box_corners(cx, cy, th, lw, lh)
            if not t.free([cs], 3.0 if tdef.get("place") == "home" else 1.5, None): continue
            nb = t.put(tk, tdef["label"], (cx, cy, th, cs, tdef))
            if not nb: continue
            made += 1
            nb.built_era = tdef.get("era")
            for i in range(min(tdef.get("flats", 1), 60)):
                household(t, nb, t.R.choice(["clerk", "factory hand", "nurse", "driver", "teacher", "pensioner", "student"]))
                t.households[-1]["id"] = f"{nb.key}-household-{i + 1}"
            break
    return made


def _place_blocks(t, tk, n, where):
    R = t.R
    made = 0
    if where == "estate": return estate(t, tk, n)
    if where == "core":
        cands = sorted((b for b in t.blds if b.type not in KEEP and t.in_town(b.centre)), key=lambda b: math.dist(b.centre, (t.xc, t.yc)))
        for b in cands[:60]:
            if made >= n: break
            if b in t.blds and replace(t, [b], tk, extra=6): made += 1
        return made
    lines = list(t.road_lines) + [w["line"] for w in t.era_ways if w["kind"] in ("ring-road", "boulevard")]
    lw, lh = B.TYPES[tk]["size"]
    for line in lines:
        for a, b in zip(line, line[1:]):
            L_ = math.dist(a, b)
            if L_ < lw + 4: continue
            u = ((b[0] - a[0]) / L_, (b[1] - a[1]) / L_)
            for side in (1, -1):
                inw = (-u[1] * side, u[0] * side)
                A = (a[0] + inw[0] * 2.2, a[1] + inw[1] * 2.2)
                tt = 2.0
                while tt < min(L_, 160) - lw and made < n:
                    q = (A[0] + u[0] * tt, A[1] + u[1] * tt)
                    if t.in_town(q) or not (4 < q[0] < t.cols - 4 and 4 < q[1] < t.rows - 4): tt += 3; continue
                    s_ = t.try_at(tk, A, u, inw, tt, 2.0, 2.5, None)
                    if s_ and (nb := t.put(tk, B.TYPES[tk]["label"], s_)):
                        made += 1
                        for i in range(min(B.TYPES[tk].get("flats", 1), 60)):
                            household(t, nb, R.choice(["clerk", "factory hand", "nurse", "driver", "teacher", "pensioner", "student"]))
                            t.households[-1]["id"] = f"{nb.key}-household-{i + 1}"
                        tt += lw + 4
                    else: tt += 3
    return made


SCALE = {"village": 0, "town": 1, "city": 2, "metropolis": 5}


def layer_era(t, y0, era, share):
    k = SCALE[t.size]
    rebuild(t, y0, era, share)
    y = t.year
    if era == "renaissance" and k and not any(b.type == "town-hall" for b in t.blds): place_blocks(t, "town-hall", 1, "core")
    if era == "age-of-reason" and y >= 1700 and k: place_blocks(t, "manufactory", k, "edge")
    if era == "victorian":
        if y >= 1840 and k: place_blocks(t, "mill", k, "edge")
        if y >= 1860 and k: place_blocks(t, "tenement", 2 * k, "core")
        if y >= 1870: place_blocks(t, "school", max(1, k), "edge")
    if era == "mid-century":
        if y >= 1930 and k: place_blocks(t, "dept-store", max(1, k // 2), "core")
        if y >= 1950 and k: place_blocks(t, "culture-house", 1, "edge")
        if y >= 1958: place_blocks(t, "panel-block", 2 + 3 * k, "estate", fallback=False)
    if era == "modern" and y >= 1995 and k: place_blocks(t, "hypermarket", max(1, k // 2), "estate", fallback=False)
    if era in ("mid-century", "modern", "future-darkness") and y >= 1960 and k: civic_set(t, k)
    if era == "future-darkness":
        if y >= 2030 and k: place_blocks(t, "capsule-tower", k, "core")
        if y >= 2035 and k: place_blocks(t, "vertical-farm", k, "edge")


# Present-day public buildings, from the layouts adapted from Cataclysm (cddatypes.py): (kind, how many per town scale, where)
CIVIC = [("cdda-police-station", 1, "core"), ("cdda-bank", 1, "core"), ("cdda-library", 1, "core"), ("cdda-funeral-home", 1, "edge"),
         ("cdda-bar", 1, "core"), ("cdda-music-club", .5, "core"), ("cdda-museum", .5, "core"), ("cdda-art-gallery", .3, "core"),
         ("cdda-warehouse", 1, "edge"), ("cdda-sewer-station", .5, "edge"), ("cdda-hospital", .5, "estate")]


def civic_set(t, k):
    """Puts up the town's present-day public buildings once (the first era layer from 1960 that runs), each kind in one
    of its Cataclysm variants. Kinds the town already has are left alone. No new churches: few were built in
    Czechoslovakia after 1948, so the church layouts are there for a Storyteller to place by hand."""
    if getattr(t, "civic_done", False): return
    t.civic_done = True
    have = {b.type.rstrip("-0123456789") for b in t.blds}
    for kind, per, where in CIVIC:
        n = int(per * k + .5) or (1 if t.R.random() < per * k else 0)
        variants = [v for v in CD.CDDA_TYPES if v == kind or (v.startswith(kind + "-") and v[len(kind) + 1:].isdigit())]
        if not n or not variants or kind in have: continue
        tk = t.R.choice(variants)
        made = place_blocks(t, tk, n, where, fallback=where != "estate")
        if made < n and where != "estate" and B.TYPES[tk]["role"] in ("shop", "inn"): estate(t, tk, n - made)


FUNCS = {"brick": layer_brick, "quays": layer_quays, "courts": layer_courts, "wall-down": layer_wall_down, "cemetery": layer_cemetery,
         "railway": layer_railway, "park": layer_park, "boulevards": layer_boulevards, "embankment": layer_embankment,
         "suburbs": layer_suburbs, "blitz": layer_blitz, "docklands": layer_docklands}


def grow(t, year):
    """Applies every layer up to the year, in order. Records what was done in t.layers."""
    t.year, t.era_ways, t.era_areas, t.layers = year, [], [], []
    t.gone, t.civic_done = [], False
    steps = sorted([(y, 1, name) for y, name in LAYERS] + [(y, 0, (y, e, sh)) for y, e, sh in REBUILDS], key=lambda s_: (s_[0], s_[1]))
    for y, kind, what in steps:
        if year < y: break
        t.layer_year, t.layer_name = y, (what if kind else f"rebuild-{what[1]}")
        if kind: FUNCS[what](t); t.layers.append(what)
        else: layer_era(t, *what); t.layers.append(f"rebuild-{what[1]}")
    return t
