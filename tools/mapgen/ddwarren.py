"""WoDX underground map generator, Dungeondraft edition: a warren under a town, or the town's sewers.

Like the other generators, each run writes a .dungeondraft_map, a WoDX sidecar (.wodx.json) and a plan-view SVG.
With --under <town sidecar> the map has the same squares as the town map above it, so a way up comes out in the
building (or the street) that stands over it.

  warren   a warren put together from our own kit of square pieces (PIECES below: passages, bends, junctions,
           chambers, dens, flooded pieces, a fall, ways up and two caps), ten squares a side, every way out in the
           middle of a side. The pieces are laid on a grid as a connected run; a way out that leads nowhere is
           capped. Under a town the ways up are picked so that each stair stands inside a building above, and the
           pieces under the river or a brook are the flooded ones. What the kit is called and built of follows the
           year (DRESS): joined cellars and old workings, brick vaults, service tunnels and shelters, the
           under-levels of an arcology. Two dresses belong to no year: the Labyrinth and a Black Spiral cavern.
  sewer    laid from the town's street plan (ddtown.py --plan), not from a kit: a main under each main street and
           road, side sewers under the streets, a round chamber where they meet, every run falling to the river
           and leaving by a grated outfall. Before the town has sewers (SEWER_FROM, a house rule) there are only
           the covered brooks, and the cesspits behind the houses.

Run: python3 ddwarren.py --kind warren|sewer [--under TOWN.wodx.json] [--year N] [--dress NAME] [--pieces N]
                         [--cols N --rows N] [--seed N] [--name NAME] [--assets LIST] [--out DIR] [--day]
"""
import argparse, json, math

import ddcore as C
from ddcore import obj, wall_with_portals, splat_byte
import ddsite as DS
import geom as G

P = 10                                                        # a piece is P squares a side
MID = (4, 5)                                                  # a way out takes these two squares of its side
DIRS = "NESW"
STEP = {"N": (0, -1), "E": (1, 0), "S": (0, 1), "W": (-1, 0)}
OPP = {"N": "S", "S": "N", "E": "W", "W": "E"}

# ------------------------------------------------------------------ the kit (our own pieces; a house rule)
# '#' rock, '.' floor, '~' standing water, ':' fallen rock to crawl over, '<' the way up. Each piece is drawn with
# its ways out toward the sides named; turning it gives the other facings.
def _p(kind, outs, rows):
    rows = rows.split()
    assert len(rows) == P and all(len(r) == P for r in rows), (kind, outs)
    return {"kind": kind, "outs": outs, "rows": rows}

PIECES = {
    "s1": _p("passage", "NS", "####..#### ####..#### ####..#### ####..#### ####..#### ####..#### ####..#### ####..#### ####..#### ####..####"),
    "s2": _p("passage", "NS", "####..#### ####..#### ##....#### ##....#### ####..#### ####..#### ####....## ####....## ####..#### ####..####"),
    "s3": _p("passage", "NS", "####..#### ####..#### ####...### #####..### #####..### ###....### ###..##### ###...#### ####..#### ####..####"),
    "b1": _p("passage", "NE", "####..#### ####..#### ####..#### ####..#### ####...... ####...... ########## ########## ########## ##########"),
    "b2": _p("chamber", "NE", "####..#### ####..#### ##......## ##......## ##........ ##........ ##......## ########## ########## ##########"),
    "t1": _p("passage", "NEW", "####..#### ####..#### ####..#### ####..#### .......... .......... ########## ########## ########## ##########"),
    "t2": _p("chamber", "NEW", "####..#### ####..#### ####..#### ####..#### .......... .......... ###....### ###....### ###....### ##########"),
    "t3": _p("passage", "NEW", "####..#### ###...#### ###..##### ###..##### .....#.... .......... #####..### ########## ########## ##########"),
    "x1": _p("passage", "NESW", "####..#### ####..#### ####..#### ####..#### .......... .......... ####..#### ####..#### ####..#### ####..####"),
    "x2": _p("chamber", "NESW", "####..#### ####..#### ###....### ##......## .......... .......... ##......## ###....### ####..#### ####..####"),
    "c1": _p("chamber", "NESW", "####..#### #........# #........# #..#..#..# .......... .......... #..#..#..# #........# #........# ####..####"),
    "c2": _p("chamber", "NS", "####..#### #........# #........# #........# ####..#### ####..#### #........# #........# #........# ####..####"),
    "c3": _p("vault", "N", "####..#### ####..#### ##......## ##......## ##......## ##......## ##......## ########## ########## ##########"),
    "d1": _p("den", "N", "####..#### ####..#### #####.#### #####.#### ###.....## ##......## ##......## ###....### ########## ##########"),
    "d2": _p("den", "NS", "####..#### ####..#### ####..#### ####..#### ####.....# ####..#..# ####..#..# ####..#### ####..#### ####..####"),
    "f1": _p("flooded", "NS", "####..#### ####..#### ####..#### ####~~#### ###~~~~### ###~~~~### ####~~#### ####..#### ####..#### ####..####"),
    "f2": _p("flooded", "NE", "####..#### ####..#### ####..#### ###~~~~### ###~~~~... ###~~~~... ###~~~#### ########## ########## ##########"),
    "f3": _p("flooded", "NEW", "####..#### ####..#### ##......## ##.~~~~.## ...~~~~... ...~~~~... ##.~~~~.## ##......## ########## ##########"),
    "f4": _p("flooded", "N", "####..#### ####..#### ####..#### ###.~~.### ###~~~~### ###~~~~### ####~~#### ########## ########## ##########"),
    "k1": _p("collapse", "NS", "####..#### ####..#### ###...#### ###.::#### ####::#### ####::.### ####...### ####..#### ####..#### ####..####"),
    "u1": _p("way-up", "N", "####..#### ####..#### ####..#### ###....### ###....### ###.<..### ########## ########## ########## ##########"),
    "u2": _p("way-up", "NS", "####..#### ####..#### ####..#### ####..#### ##<...#### ##....#### ####..#### ####..#### ####..#### ####..####"),
    "e1": _p("cap", "N", "####..#### ####..#### ####..#### ########## ########## ########## ########## ########## ########## ##########"),
    "e2": _p("cap", "N", "####..#### ####..#### ####::#### ####::#### ########## ########## ########## ########## ########## ##########"),
}

def turned(rows, n):
    """A piece's rows turned n quarter turns clockwise."""
    for _ in range(n % 4): rows = ["".join(rows[P - 1 - c][r] for c in range(P)) for r in range(P)]
    return rows

def outs_turned(outs, n): return frozenset(DIRS[(DIRS.index(d) + n) % 4] for d in outs)

def piece_outs(rows):
    """The sides a drawn piece really opens on (the check that every piece is what it says)."""
    o = set()
    if all(rows[0][c] != "#" for c in MID): o.add("N")
    if all(rows[P - 1][c] != "#" for c in MID): o.add("S")
    if all(rows[r][0] != "#" for r in MID): o.add("W")
    if all(rows[r][P - 1] != "#" for r in MID): o.add("E")
    return frozenset(o)

def check_kit():
    """Every piece opens only where it says, only in the middle two squares of a side, and is one connected space."""
    errs = []
    for key, pc in PIECES.items():
        rows = pc["rows"]
        if piece_outs(rows) != frozenset(pc["outs"]): errs.append(f"{key}: opens on {''.join(sorted(piece_outs(rows)))}, says {pc['outs']}")
        rim = [(r, c) for r in range(P) for c in range(P) if (r in (0, P - 1) or c in (0, P - 1)) and rows[r][c] != "#"]
        if any(not ((r in (0, P - 1) and c in MID) or (c in (0, P - 1) and r in MID)) for r, c in rim): errs.append(f"{key}: open on its rim away from a way out")
        cells = {(r, c) for r in range(P) for c in range(P) if rows[r][c] != "#"}
        seen, todo = set(), [next(iter(sorted(cells)))]
        while todo:
            q = todo.pop()
            if q in seen or q not in cells: continue
            seen.add(q); todo += [(q[0] + 1, q[1]), (q[0] - 1, q[1]), (q[0], q[1] + 1), (q[0], q[1] - 1)]
        if seen != cells: errs.append(f"{key}: not one connected space")
        if pc["kind"] == "way-up" and sum(r.count("<") for r in rows) != 1: errs.append(f"{key}: a way up needs one stair")
    return errs

# ------------------------------------------------------------------ what the kit is called and built of, by year
ROCK, FLOOR, RUBBLE, WATER = "Rock_A_01.webp", "Cave_Floor_A.webp", "Rocky_Dirt_01_A.webp", "Water_Still_A_01.webp"
DRESS = {
    "cellars": {"years": (0, 1499), "label": "joined cellars and old workings", "wall": "Cellar_A.png", "water": WATER, "stair": "stair",
                "names": {"passage": "Cellar passage", "chamber": "Undercroft", "vault": "Store vault", "den": "Den in the old workings", "flooded": "Flooded cellar",
                          "collapse": "Fallen passage", "way-up": "Cellar stair", "cap": "Walled-up arch"},
                "up": "Up the cellar stair into the {0}"},
    "vaults": {"years": (1500, 1849), "label": "brick vaults and casemates", "wall": "Brick_A.png", "water": WATER, "stair": "stair",
               "names": {"passage": "Vaulted passage", "chamber": "Casemate", "vault": "Ice cellar", "den": "Den behind the vaults", "flooded": "Flooded vault",
                         "collapse": "Fallen vault", "way-up": "Vault stair", "cap": "Bricked-up arch"},
               "up": "Up the vault stair into the {0}"},
    "service": {"years": (1850, 2039), "label": "service tunnels, coal cellars and shelters", "wall": "Brick_C.png", "water": WATER, "stair": "ladder",
                "names": {"passage": "Service tunnel", "chamber": "Shelter room", "vault": "Coal cellar", "den": "Den off the tunnels", "flooded": "Flooded tunnel",
                          "collapse": "Fallen tunnel", "way-up": "Ladder shaft", "cap": "Sealed bulkhead"},
                "up": "Up the rungs into the {0}"},
    "underlevels": {"years": (2040, 9999), "label": "the under-levels", "wall": "Stone_D.png", "water": WATER, "stair": "ladder",
                    "names": {"passage": "Maintenance run", "chamber": "Plant room", "vault": "Dead store", "den": "Squat in the under-levels", "flooded": "Flooded run",
                              "collapse": "Buckled run", "way-up": "Service shaft", "cap": "Welded hatch"},
                    "up": "Up the service shaft into the {0}"},
    # two dresses of no year, for the Otherworlds (a house rule; the layouts of the realms themselves are not made here)
    "labyrinth": {"years": None, "label": "a reach of the Labyrinth", "wall": "Cellar_C.png", "water": "Space_01.webp", "stair": "rope",
                  "names": {"passage": "Labyrinth tunnel", "chamber": "Hollow", "vault": "Sealed hollow", "den": "Spectres' nest", "flooded": "Tunnel drowned in the dark",
                            "collapse": "Tunnel fallen in on itself", "way-up": "Nihil above", "cap": "Tunnel that closes"},
                  "up": "Up through the Nihil"},
    "spiral": {"years": None, "label": "a Black Spiral cavern", "wall": "Cellar_B.png", "water": "Acid_A_01.webp", "stair": "rope",
               "names": {"passage": "Spiral tunnel", "chamber": "Cavern", "vault": "Trophy hole", "den": "Hive den", "flooded": "Balefire pool",
                         "collapse": "Fallen tunnel", "way-up": "Shaft to the pit", "cap": "Choked tunnel"},
               "up": "Up the shaft to the pit"},
}

def dress_for(year):
    return next(k for k, d in DRESS.items() if d["years"] and d["years"][0] <= year <= d["years"][1])

# The year a place of each size gets sewers (a house rule for Moravia: the cities from the middle of the 19th
# century, the towns a generation later, the villages after the war). For the first thirty years only the mains.
SEWER_FROM = {"metropolis": 1850, "city": 1850, "town": 1890, "village": 1950}
COVERED_BROOKS_FROM = 1500                                    # before this a brook through the town runs open


def try_obj(st, name, x, y, rot=0.0, scale=1.0):
    """An object if the packs have it (exactly once); the map does without it otherwise."""
    try: st.objects.append(obj(name, x, y, rot, scale, 100))
    except SystemExit: pass


def above(path_):
    """The town map a warren or sewer lies under: its sidecar, with what stands where."""
    sc = json.load(open(path_, encoding="utf-8"))
    if sc.get("format") != "wodx-map": raise SystemExit(f"{path_} is not a WoDX map sidecar")
    return sc

def poly_of(r):
    pts = r.get("points")
    if pts and len(pts) >= 6: return [(pts[i], pts[i + 1]) for i in range(0, len(pts) - 1, 2)]
    x, y, w, h = r["rect"]
    return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]

BUILDING_KINDS = ("home", "tavern", "church", "workplace", "castle", "hospital", "station", "haven", "chantry", "elysium")

def buildings_above(sc):
    """The buildings a stair can come up in: places of a roofed kind that are nobody's yard."""
    out = []
    for r in sc.get("regions", []):
        pl = r.get("place") or {}
        if pl.get("kind") in BUILDING_KINDS and not pl.get("private") and not r.get("area"): out.append((r["id"], r.get("label") or r["id"], poly_of(r), r["rect"]))
    return out

def wet_above(sc):
    return [(poly_of(r), r["rect"]) for r in sc.get("regions", []) if str(r["id"]).startswith("river-") or r.get("area") in ("brook", "oxbow", "old-loop")]


# ================================================================== the warren
def warren(seed, name, under, year, dress, want, cols, rows):
    R = C.R
    errs = check_kit()
    if errs: raise SystemExit("the piece kit is broken: " + "; ".join(errs))
    dk = dress or dress_for(year)
    D = DRESS[dk]
    blds, wet = (buildings_above(under), wet_above(under)) if under else ([], [])
    if under: cols, rows = under["cells"]
    if cols < 2 * P or rows < 2 * P: raise SystemExit("a warren needs a map of at least 20 by 20 squares")
    if not name: name = f"{under['name']} underground" if under else R.choice(["The Old Workings", "The Rat Runs", "The Low Cellars", "The Under-Town"])
    st = DS.Site(name, cols, rows, seed)
    gw, gh = cols // P, rows // P
    want = max(4, min(want, gw * gh * 2 // 3))
    # where the pieces sit: under a town, the offset that puts the most stairs inside buildings
    ups = [(k, n) for k, pc in PIECES.items() if pc["kind"] == "way-up" for n in range(4)]
    def stair(k, n, gx, gy, off):
        rows_ = turned(PIECES[k]["rows"], n)
        r = next(i for i in range(P) if "<" in rows_[i])
        return off[0] + gx * P + rows_[r].index("<"), off[1] + gy * P + r
    def candidates(off):
        """Grid cells where some way-up piece, turned some way, puts its stair wholly inside a building above."""
        out = {}
        for gx in range(gw):
            for gy in range(gh):
                for k, n in ups:
                    x, y = stair(k, n, gx, gy, off)
                    for bid, label, poly, rect in blds:
                        if not (rect[0] <= x and x + 1 <= rect[0] + rect[2] and rect[1] <= y and y + 1 <= rect[1] + rect[3]): continue
                        if all(G.inside(q, poly) for q in ((x + .1, y + .1), (x + .9, y + .1), (x + .9, y + .9), (x + .1, y + .9))):
                            out.setdefault((gx, gy), []).append((k, n, bid, label)); break
        return out
    base_off = ((cols - gw * P) // 2, (rows - gh * P) // 2)
    off, cand = base_off, {}
    if blds:
        best = (-1, None, None)
        for dx in (0, 2, 4, 6, 8):
            for dy in (0, 2, 4, 6, 8):
                o = (base_off[0] + dx - 4, base_off[1] + dy - 4)
                if o[0] < 0 or o[1] < 0 or o[0] + gw * P > cols or o[1] + gh * P > rows: continue
                c = candidates(o)
                if len(c) > best[0]: best = (len(c), o, c)
        if best[1] is not None: off, cand = best[1], best[2]
    n_up = max(2, min(6, want // 6))
    # the heart of the warren: under a town, the middle of the buildings; else the middle of the map
    if cand:
        hx = sorted(c[0] for c in cand)[len(cand) // 2]; hy = sorted(c[1] for c in cand)[len(cand) // 2]
    else: hx, hy = gw // 2, gh // 2
    reach = max(2, int(math.sqrt(want) * 1.1))
    near = lambda c: abs(c[0] - hx) <= reach and abs(c[1] - hy) <= reach
    fixed = {}                                                # cell -> (piece, turn, building id, building label)
    if cand:
        pool = sorted(c for c in cand if near(c)) or sorted(cand)
        picked = [min(pool, key=lambda c: (abs(c[0] - hx) + abs(c[1] - hy), c))]
        while len(picked) < n_up and len(picked) < len(pool):
            picked.append(max((c for c in pool if c not in picked), key=lambda c: (min(abs(c[0] - q[0]) + abs(c[1] - q[1]) for q in picked), c)))
        for c in picked: fixed[c] = R.choice(sorted(cand[c]))
    else:
        cells_ = [(x, y) for x in range(gw) for y in range(gh) if near((x, y))]
        picked = [R.choice(cells_)]
        while len(picked) < n_up and len(picked) < len(cells_):
            picked.append(max((c for c in cells_ if c not in picked), key=lambda c: (min(abs(c[0] - q[0]) + abs(c[1] - q[1]) for q in picked), R.random())))
        for c in picked:
            k, n = R.choice(ups)
            fixed[c] = (k, n, None, None)
    may = lambda c: outs_turned(PIECES[fixed[c][0]]["outs"], fixed[c][1]) if c in fixed else frozenset(DIRS)
    on_grid = lambda c: 0 <= c[0] < gw and 0 <= c[1] < gh
    links = {}                                                # cell -> set of sides it is joined on
    def join(a, d):
        b = (a[0] + STEP[d][0], a[1] + STEP[d][1])
        links.setdefault(a, set()).add(d); links.setdefault(b, set()).add(OPP[d])
    def can(a, d):
        b = (a[0] + STEP[d][0], a[1] + STEP[d][1])
        return on_grid(b) and d in may(a) and OPP[d] in may(b)
    # join every way up to the first by a wandering shortest way (random step costs)
    start = picked[0]
    links[start] = set()
    cost = {}
    def w(c):
        if c not in cost: cost[c] = R.uniform(1, 3)
        return cost[c]
    for goal in picked[1:]:
        dist, prev, todo = {goal: 0}, {}, [goal]
        hit = None
        while todo:
            todo.sort(key=lambda c: dist[c]); a = todo.pop(0)
            if a in links and a != goal: hit = a; break
            for d in DIRS:
                if not can(a, d): continue
                b = (a[0] + STEP[d][0], a[1] + STEP[d][1])
                nd = dist[a] + (0.2 if b in links else w(b))
                if b not in dist or nd < dist[b]:
                    dist[b] = nd; prev[b] = (a, d)
                    if b not in todo: todo.append(b)
        if hit is None: fixed.pop(goal, None); continue        # walled in by other stairs: it stays out
        b = hit
        while b != goal:
            a, d = prev[b]; join(a, d); b = a
    # grow side runs until the warren is as big as asked
    tries = 0
    while len(links) < want and tries < 4000:
        tries += 1
        a = R.choice(sorted(links))
        d = R.choice(DIRS)
        b = (a[0] + STEP[d][0], a[1] + STEP[d][1])
        if b in links or b in fixed or not can(a, d) or not near(b): continue
        join(a, d)
        for _ in range(R.randint(0, 2)):
            d2 = R.choice(DIRS); c = (b[0] + STEP[d2][0], b[1] + STEP[d2][1])
            if c in links or c in fixed or not can(b, d2) or not near(c) or len(links) >= want: break
            join(b, d2); b = c
    # a few ways round
    for a in sorted(links):
        for d in "ES":
            b = (a[0] + STEP[d][0], a[1] + STEP[d][1])
            if b in links and d not in links[a] and a not in fixed and b not in fixed and R.random() < .12: join(a, d)
    # which cells lie under water above
    def is_wet(c):
        x0, y0 = off[0] + c[0] * P, off[1] + c[1] * P
        for poly, rect in wet:
            if rect[0] > x0 + P or rect[0] + rect[2] < x0 or rect[1] > y0 + P or rect[1] + rect[3] < y0: continue
            if any(G.inside((x0 + fx * P, y0 + fy * P), poly) for fx in (.2, .5, .8) for fy in (.2, .5, .8)): return True
        return False
    wet_cells = {c for c in links if is_wet(c)}
    if not wet and len(links) > 6:                            # no town above: the lowest corner of the warren stands in water
        low = max(links, key=lambda c: (c[1], c[0]))
        wet_cells = {c for c in links if abs(c[0] - low[0]) + abs(c[1] - low[1]) <= 1}
    # pick a piece for every cell
    far = {}                                                  # steps from the nearest way up, through the warren
    todo = [(c, 0) for c in fixed if c in links]
    while todo:
        c, n = todo.pop(0)
        if c in far: continue
        far[c] = n
        for d in links[c]: todo.append(((c[0] + STEP[d][0], c[1] + STEP[d][1]), n + 1))
    counts = {}
    limit = {"den": max(1, len(links) // 9), "collapse": max(1, len(links) // 14), "vault": max(1, len(links) // 8)}
    placed = {}
    for c in sorted(links, key=lambda c: (-far.get(c, 0), c)):
        need = frozenset(links[c])
        if c in fixed:
            placed[c] = (fixed[c][0], fixed[c][1]); continue
        opts = []
        for k, pc in PIECES.items():
            kind = pc["kind"]
            if kind == "way-up": continue
            for n in range(4):
                have = outs_turned(pc["outs"], n)
                if not need <= have: continue
                extra = len(have) - len(need)
                if extra > 1 or (extra and kind != "chamber"): continue
                wgt = 1.0 if not extra else .12
                if kind == "flooded": wgt *= 9 if c in wet_cells else .08
                elif c in wet_cells: wgt *= .4
                if kind in limit:
                    if counts.get(kind, 0) >= limit[kind]: continue
                    if kind == "den": wgt *= 1 + far.get(c, 0)
                    if kind == "collapse": wgt *= .5
                if kind == "cap": wgt *= .7
                opts.append((wgt, k, n))
                break                                         # one facing of a piece is enough
        if not opts: raise SystemExit(f"no piece of the kit fits a cell joined on {''.join(sorted(need))}")
        t = R.uniform(0, sum(o[0] for o in opts))
        for wgt, k, n in opts:
            t -= wgt
            if t <= 0: break
        placed[c] = (k, n)
        counts[PIECES[k]["kind"]] = counts.get(PIECES[k]["kind"], 0) + 1
    # stamp the pieces; cap a way out that leads nowhere
    grid = {}                                                 # square -> '.', '~', ':' or '<'
    pieces, caps = [], []
    seq = {}
    for c in sorted(placed):
        k, n = placed[c]
        pc = PIECES[k]
        rows_ = [list(r) for r in turned(pc["rows"], n)]
        have = outs_turned(pc["outs"], n)
        for d in have - links[c]:                             # the cap: the outermost two squares of that way out go back to rock
            for i in MID:
                for depth in (0, 1):
                    r_, c_ = {"N": (depth, i), "S": (P - 1 - depth, i), "W": (i, depth), "E": (i, P - 1 - depth)}[d]
                    rows_[r_][c_] = "#"
            r_, c_ = {"N": (2, 4), "S": (P - 3, 4), "W": (4, 2), "E": (4, P - 3)}[d]
            caps.append((off[0] + c[0] * P + c_, off[1] + c[1] * P + r_, d))
        x0, y0 = off[0] + c[0] * P, off[1] + c[1] * P
        sq = [(x0 + cc, y0 + rr, rows_[rr][cc]) for rr in range(P) for cc in range(P) if rows_[rr][cc] != "#"]
        for x, y, ch in sq: grid[(x, y)] = ch
        kind = pc["kind"]
        seq[kind] = seq.get(kind, 0) + 1
        xs, ys = [q[0] for q in sq], [q[1] for q in sq]
        pieces.append({"cell": list(c), "piece": k, "turn": n, "kind": kind, "id": f"{kind}-{seq[kind]}", "wet": c in wet_cells,
                       "rect": [min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1], "squares": sq})
    # walls: every edge between open and rock, joined into straight runs
    edges = []
    for (i, j) in grid:
        for di, dj, a, b in ((0, -1, (i, j), (i + 1, j)), (0, 1, (i, j + 1), (i + 1, j + 1)), (-1, 0, (i, j), (i, j + 1)), (1, 0, (i + 1, j), (i + 1, j + 1))):
            if (i + di, j + dj) not in grid: edges.append((a, b))
    S = DS.S
    for a, b in DS.merge(edges):
        st.walls.append(wall_with_portals([a, b], D["wall"], [], False))
        st.svg.append(f'<line x1="{a[0] * S}" y1="{a[1] * S}" x2="{b[0] * S}" y2="{b[1] * S}" stroke="#222" stroke-width="3"/>')
    tint = {".": "#a99f8e", "~": "#5f86a8", ":": "#7d6f5c", "<": "#e3c66a"}
    for (i, j), ch in sorted(grid.items()):
        st.svg.insert(0, f'<rect x="{i * S}" y="{j * S}" width="{S + .5}" height="{S + .5}" fill="{tint[ch]}"/>')
    # regions, the kit in each piece, and the ways up
    ways_up = []
    names = D["names"]
    for pz in pieces:
        kind, rid = pz["kind"], pz["id"]
        x, y, w_, h_ = pz["rect"]
        label = names[kind] + (f" {rid.split('-')[-1]}" if seq[kind] > 1 else "")
        place = {"kind": "home", "private": True} if kind == "den" else {"kind": "sewer"}
        st.regions.append({"id": rid, "label": label, "rect": [x, y, w_, h_], "place": place, "area": kind})
        st.svg_top.append(f'<text x="{(x + .2) * S}" y="{(y + h_ / 2) * S}" font-weight="bold" fill="#fff">{label}</text>')
        floor = sorted((sx, sy) for sx, sy, ch in pz["squares"] if ch == "." and not any((sx + dx, sy + dy) not in grid for dx in (-1, 0, 1) for dy in (-1, 0, 1)))
        edge_ = sorted((sx, sy) for sx, sy, ch in pz["squares"] if ch == "." and sx - x not in (0, w_ - 1) and sy - y not in (0, h_ - 1)
                       and sum((sx + dx, sy + dy) not in grid for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 1)
        spots = list(edge_)
        R.shuffle(spots)
        def spot():
            return spots.pop() if spots else None
        if kind == "den":
            q = spot()
            if q:
                try_obj(st, "Bedroll_Colorable_A_1x2.png", q[0] + .5, q[1] + .5, R.uniform(0, 6.3), .9)
                st.features.append({"id": f"{rid}-nest", "label": f"Nest ({label})", "rect": [q[0], q[1], 1, 1], "flags": {"hide": True, "hideKind": "bed", "title": "Down in the nest"}})
            q = spot()
            if q:
                try_obj(st, DS.CHEST, q[0] + .5, q[1] + .5, 0, .8)
                st.features.append({"id": f"{rid}-hoard", "label": f"Hoard ({label})", "rect": [q[0], q[1], 1, 1],
                                    "flags": {"container": True, "kind": "chest", "lock": "cheap", "items": "", "fillPlace": "den"}})
            q = spot()
            if q: try_obj(st, "Skull_Decor_Black_1x1.webp", q[0] + .5, q[1] + .5, R.uniform(0, 6.3), .7)
        elif kind == "vault":
            for asset in (DS.BARREL, DS.CRATE, DS.BARREL):
                q = spot()
                if q: try_obj(st, asset, q[0] + .5, q[1] + .5, R.uniform(0, 6.3), .8)
            q = spot()
            if q:
                try_obj(st, DS.CHEST, q[0] + .5, q[1] + .5, 0, .8)
                st.features.append({"id": f"{rid}-chest", "label": f"Chest ({label})", "rect": [q[0], q[1], 1, 1],
                                    "flags": {"container": True, "kind": "chest", "lock": "cheap", "items": "", "fillPlace": "home"}})
        elif kind == "chamber" and floor:
            for _ in range(R.randint(0, 2)):
                q = spot()
                if q: try_obj(st, R.choice((DS.CRATE, DS.SACK, DS.BARREL)), q[0] + .5, q[1] + .5, R.uniform(0, 6.3), .8)
        rub = sorted((sx, sy) for sx, sy, ch in pz["squares"] if ch == ":")
        if rub:
            bx, by = min(q[0] for q in rub), min(q[1] for q in rub)
            bw, bh = max(q[0] for q in rub) - bx + 1, max(q[1] for q in rub) - by + 1
            for q in rub[::2]: try_obj(st, "Rock_A1_4x4.webp", q[0] + .5, q[1] + .5, R.uniform(0, 6.3), .22)
            st.features.append({"id": f"{rid}-fall", "label": f"The fall ({label})", "rect": [bx, by, bw, bh],
                                "flags": {"hide": True, "hideKind": "crawl", "room": 1, "title": "Over the fallen rock on hands and knees"}})
        for sx, sy, ch in pz["squares"]:
            if ch != "<": continue
            c = tuple(pz["cell"])
            bid, blabel = (fixed[c][2], fixed[c][3]) if c in fixed else (None, None)
            n_ = len(ways_up) + 1
            title = D["up"].format(blabel.lower()) if blabel else D["up"].format("house above") if "{0}" in D["up"] else D["up"]
            st.features.append({"id": f"stair-{n_}", "label": f"{names['way-up']}" + (f" to the {blabel.lower()}" if blabel else ""), "rect": [sx, sy, 1, 1],
                                "flags": {"climb": True, "climbKind": D["stair"], "height": 12, "title": title}})
            try_obj(st, "Trapdoor_Metal_Rusty_A1_Closed_1x1.webp", sx + .5, sy + .5, 0, .9)
            ways_up.append({"id": f"stair-{n_}", "at": [sx, sy], "piece": rid, "building": bid, "label": blabel})
    for n_, (cx, cy, d) in enumerate(caps):
        st.regions.append({"id": f"cap-end-{n_ + 1}", "label": names["cap"], "rect": [cx, cy, 2, 2], "place": {"kind": "sewer"}, "area": "cap"})
    for pz in pieces: del pz["squares"]
    def weights(x, y):
        ch = grid.get((int(x), int(y)))
        return [1, 0, 0, 0] if ch is None else [0, 0, 0, 1] if ch == "~" else [0, 0, 1, 0] if ch == ":" else [0, 1, 0, 0]
    extra = {"underground": True, "dress": dk, "year": year, "layout": "pieces", "place": {"kind": "sewer"},
             "pieces": [{k: v for k, v in pz.items()} for pz in pieces], "waysUp": ways_up,
             "umbral": {"year": year, "places": {}, "gone": []}}
    if under: extra["under"] = {"name": under.get("name"), "map": under.get("map"), "cells": under.get("cells")}
    kinds = {}
    for pz in pieces: kinds[pz["kind"]] = kinds.get(pz["kind"], 0) + 1
    note = (f"{len(pieces)} pieces ({', '.join(f'{k} {v}' for k, v in sorted(kinds.items()))}), {len(caps)} capped ways, {len(ways_up)} ways up"
            + (f", {sum(1 for w_ in ways_up if w_['building'])} into buildings above" if under else "") + f"; dressed as {D['label']}")
    return st, [ROCK, FLOOR, RUBBLE, D["water"]], weights, extra, note


# ================================================================== the sewers
def seg_d(p, a, b): return G.seg_dist(p, a, b)

def line_dist(p, line):
    return min(seg_d(p, a, b) for a, b in zip(line, line[1:])) if len(line) > 1 else math.dist(p, line[0])

def sewer(seed, name, under, year):
    R = C.R
    plan = (under or {}).get("plan")
    if not plan: raise SystemExit("sewers are laid from a town's street plan: make the town with ddtown.py --plan and pass its sidecar with --under")
    cols, rows = under["cells"]
    size = under.get("kind") if under.get("kind") in SEWER_FROM else "town"
    year = year or int((under.get("umbral") or {}).get("year") or 1197)
    since = SEWER_FROM[size]
    age = "sewers" if year >= since else "before"
    if not name: name = f"{under['name']} sewers" if age == "sewers" else f"Under {under['name']}"
    st = DS.Site(name, cols, rows, seed)
    S = DS.S
    rivers = [[tuple(q) for q in l] for l in plan.get("river") or []]
    rhalf = float(plan.get("riverHalf") or 0)
    def river_d(p): return min((line_dist(p, l) for l in rivers), default=1e9)
    # the runs: (a, b, kind, half width)
    runs = []
    if age == "sewers":
        for s_ in plan["streets"]:
            k = s_["kind"]
            cls = "main" if k in ("main", "road") else "side" if k in ("street", "quay") else None
            if not cls or (cls == "side" and year < since + 30): continue
            a, b = tuple(s_["line"][:2]), tuple(s_["line"][2:])
            runs.append((a, b, cls))
    if age == "before" and year >= COVERED_BROOKS_FROM or age == "sewers":
        houses = [poly_of(r) for r in under.get("regions", []) if (r.get("place") or {}).get("kind") in BUILDING_KINDS and not (r.get("place") or {}).get("private")]
        for l in plan.get("brooks") or []:
            for a, b in zip(l, l[1:]):
                a, b = tuple(a), tuple(b)
                m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                # a brook is covered where the town has closed round it: a house within eight squares
                if any(G.poly_dist(m, h) < 8 for h in houses): runs.append((a, b, "culvert"))
    # keep out from under the river: cut every run where it would pass below it
    keep = rhalf + 2.2
    cut = []
    for a, b, cls in runs:
        L_ = math.dist(a, b)
        if L_ < .5: continue
        n = max(2, int(L_ / .5))
        pts = [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]
        ok = [river_d(q) > keep and 1 <= q[0] <= cols - 1 and 1 <= q[1] <= rows - 1 for q in pts]
        i = 0
        while i <= n:
            if not ok[i]: i += 1; continue
            j = i
            while j < n and ok[j + 1]: j += 1
            if math.dist(pts[i], pts[j]) >= 3: cut.append((pts[i], pts[j], cls))
            i = j + 1
    # one node where ends meet (within two and a half squares)
    nodes = []
    def node(p):
        for i, q in enumerate(nodes):
            if math.dist(p, q) < 2.5: return i
        nodes.append((round(p[0], 2), round(p[1], 2))); return len(nodes) - 1
    HALF = {"main": 1.5, "side": 1.0, "culvert": 1.0, "outfall": 1.5}
    segs, seen = [], set()
    for a, b, cls in sorted(cut, key=lambda s_: (s_[2] != "main", s_[0], s_[1])):
        i, j = node(a), node(b)
        if i == j or (min(i, j), max(i, j)) in seen: continue
        seen.add((min(i, j), max(i, j)))
        segs.append([i, j, cls])
    if not segs and age == "sewers": raise SystemExit("the street plan gives no run a sewer could follow")
    # the parts that hang together, and where each one leaves: its node nearest the river, or else nearest the map's edge
    comp = list(range(len(nodes)))
    def find(i):
        while comp[i] != i: comp[i] = comp[comp[i]]; i = comp[i]
        return i
    for i, j, _ in segs: comp[find(i)] = find(j)
    groups = {}
    for i in range(len(nodes)):
        if any(i in (s_[0], s_[1]) for s_ in segs): groups.setdefault(find(i), []).append(i)
    edge_d = lambda p: min(p[0], p[1], cols - p[0], rows - p[1])
    outfalls, leaves = [], []
    for g in sorted(groups.values(), key=len, reverse=True):
        if rivers:
            i = min(g, key=lambda i: (river_d(nodes[i]), i))
            if river_d(nodes[i]) < 45:
                p = nodes[i]
                l = min(rivers, key=lambda l: line_dist(p, l))
                best = min(((math.dist(p, (a[0] + (b[0] - a[0]) * t / 8, a[1] + (b[1] - a[1]) * t / 8)), (a[0] + (b[0] - a[0]) * t / 8, a[1] + (b[1] - a[1]) * t / 8))
                            for a, b in zip(l, l[1:]) for t in range(9)), key=lambda q: q[0])
                d, q = best
                if d > rhalf + .5:
                    f = (d - rhalf - .2) / d
                    mouth = (round(p[0] + (q[0] - p[0]) * f, 2), round(p[1] + (q[1] - p[1]) * f, 2))
                    if 1 <= mouth[0] <= cols - 1 and 1 <= mouth[1] <= rows - 1 and math.dist(p, mouth) >= 1.5:
                        nodes.append(mouth); segs.append([i, len(nodes) - 1, "outfall"]); outfalls.append((len(nodes) - 1, i)); continue
        i = min(g, key=lambda i: (edge_d(nodes[i]), i))
        leaves.append(i)
    deg = {}
    for i, j, cls in segs:
        deg.setdefault(i, []).append(cls); deg.setdefault(j, []).append(cls)
    mouths = {m for m, _ in outfalls}
    def radius(i):
        if i in mouths: return 0.0
        h = max(HALF[c] for c in deg[i])
        if len(deg[i]) >= 3 and "main" in deg[i]: return 2.8          # a junction chamber
        return round(h * 1.3, 2)
    rad = {i: radius(i) for i in deg}
    # the fall: every run drains toward its part's way out
    down = {}
    todo = [m for m, _ in outfalls] + leaves
    order = {i: 0 for i in todo}
    while todo:
        i = todo.pop(0)
        for k, (a, b, cls) in enumerate(segs):
            if k in down or i not in (a, b): continue
            o = b if a == i else a
            down[k] = (o, i)
            if o not in order: order[o] = order[i] + 1; todo.append(o)
    # walls: two sides to each run, and an arc round each node between the runs that enter it
    def wall(pts, colour="#222"):
        st.walls.append(wall_with_portals([(round(x, 3), round(y, 3)) for x, y in pts], "Brick_A.png" if year < 1945 else "Stone_D.png", [], False))
        st.svg.append(f'<polyline points="{DS.pl(pts)}" fill="none" stroke="{colour}" stroke-width="2"/>')
    for a, b, cls in segs:
        A, B = nodes[a], nodes[b]
        L_ = math.dist(A, B); h = HALF[cls]
        u = ((B[0] - A[0]) / L_, (B[1] - A[1]) / L_); nrm = (-u[1], u[0])
        ta = math.sqrt(max(0, rad[a] ** 2 - h * h)); tb = math.sqrt(max(0, rad[b] ** 2 - h * h))
        if L_ - ta - tb < .2: continue
        for sgn in (-1, 1):
            wall([(A[0] + u[0] * ta + nrm[0] * h * sgn, A[1] + u[1] * ta + nrm[1] * h * sgn), (B[0] - u[0] * tb + nrm[0] * h * sgn, B[1] - u[1] * tb + nrm[1] * h * sgn)])
    off_map = []
    for i, classes in sorted(deg.items()):
        r = rad[i]
        p = nodes[i]
        if i in mouths:                                       # the grated mouth: a bar across the end of the outfall
            a, b, cls = next(s_ for s_ in segs if s_[1] == i and s_[2] == "outfall")
            A = nodes[a]; L_ = math.dist(A, p); u = ((p[0] - A[0]) / L_, (p[1] - A[1]) / L_); nrm = (-u[1], u[0]); h = HALF["outfall"]
            wall([(p[0] + nrm[0] * h, p[1] + nrm[1] * h), (p[0] - nrm[0] * h, p[1] - nrm[1] * h)], "#06c")
            continue
        gaps = []
        for a, b, cls in segs:
            if i not in (a, b): continue
            q = nodes[b if a == i else a]
            ang = math.atan2(q[1] - p[1], q[0] - p[0]); half = math.asin(min(1, HALF[cls] / r))
            gaps.append(((ang - half) % (2 * math.pi), 2 * half))
        if len(classes) == 1 and edge_d(p) < 3: off_map.append(i); continue          # the run goes on under the next map: no end wall
        gaps.sort()
        for n_, (g0, gw_) in enumerate(gaps):
            nxt = gaps[(n_ + 1) % len(gaps)][0]
            a0 = g0 + gw_
            if len(gaps) > 1 and (nxt - g0) % (2 * math.pi) <= gw_: continue            # the next gap overlaps this one
            span = (nxt - a0) % (2 * math.pi) if len(gaps) > 1 else 2 * math.pi - gw_
            if span < .05: continue
            k = max(1, int(span / (math.pi / 8)))
            wall([(p[0] + r * math.cos(a0 + span * t / k), p[1] + r * math.sin(a0 + span * t / k)) for t in range(k + 1)])
    # ground: rock, the walk, and the water down the middle
    buckets = {}
    for k, (a, b, cls) in enumerate(segs):
        A, B = nodes[a], nodes[b]; h = HALF[cls] + .3
        for x in range(int(min(A[0], B[0]) - h), int(max(A[0], B[0]) + h) + 1):
            for y in range(int(min(A[1], B[1]) - h), int(max(A[1], B[1]) + h) + 1): buckets.setdefault((x, y), []).append(k)
    nb = {}
    for i in deg:
        p = nodes[i]; r = rad[i]
        for x in range(int(p[0] - r), int(p[0] + r) + 1):
            for y in range(int(p[1] - r), int(p[1] + r) + 1): nb.setdefault((x, y), []).append(i)
    CHANNEL = {"main": .5, "outfall": .5, "side": .26, "culvert": .7}
    def weights(x, y):
        inside, wet_ = False, False
        for k in buckets.get((int(x), int(y)), ()):
            a, b, cls = segs[k]
            d = seg_d((x, y), nodes[a], nodes[b])
            if d <= HALF[cls]: inside = True
            if d <= CHANNEL[cls]: wet_ = True
        if not wet_:
            for i in nb.get((int(x), int(y)), ()):
                d = math.dist((x, y), nodes[i])
                if d <= rad[i]: inside = True
                if d <= .5: wet_ = True
        return [0, 0, 0, 1] if wet_ else [0, 1, 0, 0] if inside else [1, 0, 0, 0]
    # regions, manholes, the outfalls, the cesspits
    LABEL = {"main": "Main sewer", "side": "Side sewer", "culvert": "Covered brook", "outfall": "Outfall"}
    AREA = {"main": "main-sewer", "side": "side-sewer", "culvert": "culvert", "outfall": "outfall"}
    COL = {"main": "#8c8474", "side": "#a39a88", "culvert": "#6f8fa6", "outfall": "#5f86a8"}
    cnt = {}
    flow = []
    for k, (a, b, cls) in enumerate(segs):
        A, B = nodes[a], nodes[b]
        cnt[cls] = cnt.get(cls, 0) + 1
        poly = [(max(0, min(cols, x)), max(0, min(rows, y))) for x, y in G.buffer_line([A, B], HALF[cls])]
        st.region(f"{AREA[cls]}-{cnt[cls]}", LABEL[cls], poly, "sewer", area=AREA[cls])
        st.svg.insert(0, f'<line x1="{A[0] * S}" y1="{A[1] * S}" x2="{B[0] * S}" y2="{B[1] * S}" stroke="{COL[cls]}" stroke-width="{2 * HALF[cls] * S}" stroke-linecap="round"/>')
        st.svg_top.append(f'<line x1="{A[0] * S}" y1="{A[1] * S}" x2="{B[0] * S}" y2="{B[1] * S}" stroke="#2b5d86" stroke-width="{max(2, 2 * CHANNEL[cls] * S)}"/>')
        if k in down:
            hi, lo = down[k]
            flow.append({"run": f"{AREA[cls]}-{cnt[cls]}", "from": list(nodes[hi]), "to": list(nodes[lo])})
    manholes, chambers = [], 0
    for i, classes in sorted(deg.items()):
        p, r = nodes[i], rad[i]
        if i in mouths:
            st.regions.append({"id": f"outfall-mouth-{len([m for m in mouths if m <= i])}", "label": "The grated mouth of the outfall", "rect": [round(p[0] - 1.5, 3), round(p[1] - 1.5, 3), 3, 3],
                               "behaviors": [{"type": "trigger", "system": {"label": f"the outfall of {st.name}, an iron grate over the river", "does": "note", "who": "pcs"}}]})
            try_obj(st, "Grate_A1_1x1.webp", p[0], p[1], 0, 1.4)
            continue
        st.svg.insert(0, f'<circle cx="{p[0] * S}" cy="{p[1] * S}" r="{r * S}" fill="#8c8474"/>')
        if r >= 2.8:
            chambers += 1
            ring = [(p[0] + r * math.cos(t * math.pi / 8), p[1] + r * math.sin(t * math.pi / 8)) for t in range(16)]
            st.region(f"junction-{chambers}", "Junction chamber", [(max(0, min(cols, x)), max(0, min(rows, y))) for x, y in ring], "sewer", area="junction")
        if "culvert" in classes and set(classes) == {"culvert"}: continue                  # a covered brook has no shaft of its own
        if edge_d(p) < 2: continue
        n_ = len(manholes) + 1
        rect = [round(p[0] - .5 + (1 if r >= 2 else 0), 3), round(p[1] - .5 - (1 if r >= 2 else 0), 3), 1, 1]
        st.features.append({"id": f"manhole-{n_}", "label": "Manhole shaft", "rect": rect,
                            "flags": {"climb": True, "climbKind": "ladder", "height": 12, "title": "Up the rungs to the street"}})
        try_obj(st, "Trapdoor_Metal_Rusty_A1_Closed_1x1.webp", rect[0] + .5, rect[1] + .5, 0, .8)
        st.svg_top.append(f'<circle cx="{(rect[0] + .5) * S}" cy="{(rect[1] + .5) * S}" r="{.4 * S}" fill="#e3c66a" stroke="#333"/>')
        manholes.append({"id": f"manhole-{n_}", "at": rect[:2]})
    # cesspits: before the sewers every house has one; afterwards the houses off the sewered streets still do
    pits = []
    yards = [r for r in under.get("regions", []) if (r.get("place") or {}).get("private") and (r.get("place") or {}).get("owner")]
    R.shuffle(yards)
    def clear(x, y):
        if not (2 <= x <= cols - 4 and 2 <= y <= rows - 4): return False
        if any(weights(x + dx, y + dy) != [1, 0, 0, 0] for dx in (-.5, 1, 2.5) for dy in (-.5, 1, 2.5)): return False
        return all(abs(x - q[0]) > 4 or abs(y - q[1]) > 4 for q in pits) and river_d((x + 1, y + 1)) > rhalf + 2
    for r in yards:
        if len(pits) >= (24 if age == "before" else 6): break
        x, y, w_, h_ = r["rect"]
        px, py = int(x + w_ / 2 - 1), int(y + h_ / 2 - 1)
        if not G.inside((px + 1, py + 1), poly_of(r)) or not clear(px, py): continue
        pits.append((px, py))
        n_ = len(pits)
        box = [(px, py), (px + 2, py), (px + 2, py + 2), (px, py + 2)]
        st.walls.append(wall_with_portals(box, "Cellar_A.png", [], True))
        st.svg.append(f'<rect x="{px * S}" y="{py * S}" width="{2 * S}" height="{2 * S}" fill="#6b5d3f" stroke="#222" stroke-width="2"/>')
        st.regions.append({"id": f"cesspit-{n_}", "label": "Cesspit", "rect": [px, py, 2, 2], "place": {"kind": "sewer", "owner": r["place"]["owner"], "private": True}, "area": "cesspit"})
        st.features.append({"id": f"cesspit-{n_}-shaft", "label": "Privy shaft", "rect": [px + .5, py + .5, 1, 1],
                            "flags": {"climb": True, "climbKind": "rope", "height": 8, "title": "Up the privy shaft into the yard"}})
    pit_set = {(px + dx, py + dy) for px, py in pits for dx in (0, 1) for dy in (0, 1)}
    tunnel = weights
    def weights2(x, y):
        return [0, 0, 1, 0] if (int(x), int(y)) in pit_set else tunnel(x, y)
    extra = {"underground": True, "dress": "sewers" if age == "sewers" else "before-sewers", "year": year, "layout": "streets", "place": {"kind": "sewer"},
             "under": {"name": under.get("name"), "map": under.get("map"), "cells": under.get("cells")},
             "waysUp": manholes, "flow": flow, "sewersFrom": since, "umbral": {"year": year, "places": {}, "gone": []}}
    note = (f"{cnt.get('main', 0)} main runs, {cnt.get('side', 0)} side runs, {cnt.get('culvert', 0)} covered brook runs, {chambers} junction chambers, "
            f"{len(outfalls)} outfalls to the river, {len(off_map)} runs going on off the map, {len(manholes)} manholes, {len(pits)} cesspits; "
            + (f"sewers since {since}" if age == "sewers" else f"no sewers before {since}"))
    return st, [ROCK, FLOOR, "Dirt_A_01.webp", WATER], weights2, extra, note


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=("warren", "sewer"), required=True)
    ap.add_argument("--under", help="the sidecar of the town map above (for sewers, one made with ddtown.py --plan)")
    ap.add_argument("--year", type=int, help="the year the place is drawn for; under a town, the town's own year unless given")
    ap.add_argument("--dress", choices=sorted(DRESS), help="warren only: what the kit is dressed as, whatever the year (labyrinth and spiral have no year)")
    ap.add_argument("--pieces", type=int, help="warren only: about how many pieces")
    ap.add_argument("--cols", type=int, default=60)
    ap.add_argument("--rows", type=int, default=50)
    ap.add_argument("--seed", type=int, default=1197)
    ap.add_argument("--name")
    ap.add_argument("--assets", default="/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt")
    ap.add_argument("--out", default=".")
    ap.add_argument("--day", action="store_true")
    a = ap.parse_args()
    C.init(a.seed, a.assets)
    under = above(a.under) if a.under else None
    year = a.year or (int((under.get("umbral") or {}).get("year") or 1197) if under else 1197)
    if a.kind == "warren":
        want = a.pieces or ({"village": 10, "town": 18, "city": 28, "metropolis": 28}.get(under.get("kind"), 18) if under else 16)
        st, terrain, weights, extra, note = warren(a.seed, a.name, under, year, a.dress, want, a.cols, a.rows)
    else:
        st, terrain, weights, extra, note = sewer(a.seed, a.name, under, a.year)
    DS.BG[a.kind], DS.LABEL[a.kind] = "#3d3a36", "warren" if a.kind == "warren" else "sewers"
    import eras
    base = st.write(a.out, a.kind, eras.era_id(extra["year"]), terrain, weights, "ffffffff" if a.day else "ff30303c")
    p = f"{a.out}/{base}.wodx.json"
    sc = json.load(open(p))
    sc.update(extra)
    json.dump(sc, open(p, "w"), indent=1)
    print("  " + note)


if __name__ == "__main__":
    main()
