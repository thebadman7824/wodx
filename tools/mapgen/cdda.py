"""Turns building layouts from Cataclysm: Dark Days Ahead (CDDA) into WoDX building types.

CDDA draws each building as rows of characters, one character to a square metre, with palettes saying what each
character is (a wall, a door, a bed). This reads those rows and writes a type the WoDX map generator already
knows how to build and furnish: rooms as rectangles, inner walls as partitions, doors and windows as openings
on the walls, and each piece of furniture on its own square ("at:" rules), with WoDX's own assets.

CDDA's data is CC BY-SA 3.0 (https://github.com/CleverRaven/Cataclysm-DDA). The types this writes
(cdda_types.json) are adapted from it and keep that licence and credit; see cdda_types.json's "credit".

Run: python3 cdda.py <CDDA checkout> [om_terrain ...]  ->  cdda_types.json
"""
import glob, json, math, os, sys, collections

K = 1 / 1.524          # WoDX squares (5 ft) to a CDDA square (1 m)

# ------------------------------------------------------------------ CDDA ids to WoDX
def kind_of(ter):
    t = ter or ""
    if "window" in t or "glass" in t and "door" not in t: return "window"
    if t in ("t_concrete", "") or "column" in t or "curtain" in t: return "unknown"     # floor if walled in, else yard
    if "door" in t or "gate" in t and "wall" not in t: return "door"
    if "wall" in t or t in ("t_rock", "t_reinforced_glass", "t_chainfence"): return "wall"
    if "stairs" in t or "ladder" in t: return "stair"
    if any(w in t for w in ("sidewalk", "pavement", "road", "parking")): return "street"
    if any(w in t for w in ("floor", "carpet", "tile", "linoleum", "concrete", "thconc", "vat")): return "floor"
    return "outside"

# furniture: CDDA id -> (era-neutral tag). The tags are turned into assets by the era's kit (MODERN below).
FURN = {
    "f_bed": "bed", "f_makeshift_bed": "twin", "f_straw_bed": "twin", "f_bunk_bed": "twin", "f_sofa": "couch", "f_armchair": "armchair",
    "f_chair": "chair", "f_stool": "chair", "f_camp_chair": "chair", "f_office_chair": "chair", "f_table": "table", "f_tourist_table": "table",
    "f_coffee_table": "coffee", "f_desk": "desk", "f_counter": "counter", "f_counter_gate_c": "counter", "f_counter_gate_o": "counter",
    "f_fridge": "fridge", "f_glass_fridge": "chiller", "f_freezer": "freezer", "f_oven": "stove", "f_woodstove": "stove", "f_sink": "sink",
    "f_toilet": "wc", "f_bathtub": "bath", "f_shower": "shower", "f_bookcase": "shelf", "f_rack": "display", "f_rack_wood": "display",
    "f_utility_shelf": "display", "f_warehouse_shelf": "display", "f_displaycase": "case", "f_glass_cabinet": "case", "f_locker": "locker",
    "f_cupboard": "cupboard", "f_filing_cabinet": "cupboard", "f_dresser": "dresser", "f_wardrobe": "dresser", "f_safe_l": "safe", "f_safe_c": "safe",
    "f_gunsafe_ml": "safe", "f_console": "console", "f_console_broken": "console", "f_control_station": "console", "f_washer": "washer",
    "f_dryer": "drier", "f_dishwasher": "cupboard", "f_entertainment_center": "tv", "f_pool_table": "table", "f_bench": "bench",
    "f_metal_bench": "bench", "f_pew": "bench", "f_altar": "altar", "f_crate_c": "crate", "f_crate_o": "crate", "f_cardboard_box": "crate",
    "f_indoor_plant": "plant", "f_indoor_plant_y": "plant", "f_workbench": "table", "f_lab_bench": "table", "f_autopsy_table": "slab",
    "f_IV_pole": "drip", "f_dialysis": "machine", "f_exercise": "machine", "f_arcade_machine": "machine", "f_pinball_machine": "machine",
    "f_vending_c": "chiller", "f_vending_o": "chiller", "f_atm_off": "machine", "f_atm": "machine", "f_piano": "cupboard", "f_coffin_c": "coffin",
    "f_coffin_o": "coffin", "f_statue": "statue", "f_mannequin": "statue", "f_clothing_rail": "display", "f_rack_coat": "display",
}
# what a room with these is called (the first tag found wins)
NAMES = [("altar", "Sanctuary"), ("slab", "Mortuary"), ("coffin", "Coffin room"), ("safe", "Vault"), ("drip", "Ward"), ("bath", "Bathroom"),
         ("shower", "Bathroom"), ("wc", "Toilet"), ("stove", "Kitchen"), ("bed", "Bedroom"), ("twin", "Bedroom"), ("bench", "Hall"),
         ("display", "Shop floor"), ("case", "Gallery"), ("counter", "Counter"), ("desk", "Office"), ("console", "Control room"),
         ("couch", "Lounge"), ("locker", "Locker room"), ("shelf", "Library"), ("table", "Dining room"), ("crate", "Store")]

# ------------------------------------------------------------------ reading CDDA
NESTED = {}   # nested chunk id -> its mapgen object (rooms set into a bigger map, as in the motel)

def load(src):
    pal, gens = {}, collections.defaultdict(list)
    for f in glob.glob(os.path.join(src, "data/json/mapgen_palettes/**/*.json"), recursive=True):
        for e in json.load(open(f, encoding="utf-8")):
            if e.get("type") == "palette": pal[e["id"]] = e
    for f in glob.glob(os.path.join(src, "data/json/mapgen/**/*.json"), recursive=True):
        try: data = json.load(open(f, encoding="utf-8"))
        except ValueError: continue
        for e in data if isinstance(data, list) else []:
            if e.get("type") == "palette": pal.setdefault(e["id"], e)          # some palettes live beside their maps
            if e.get("type") == "mapgen" and e.get("nested_mapgen_id") and "object" in e: NESTED.setdefault(e["nested_mapgen_id"], e["object"])
            if e.get("type") != "mapgen" or e.get("method", "json") != "json" or "object" not in e: continue
            om = e.get("om_terrain")
            if isinstance(om, str): gens[om].append(e)
            elif isinstance(om, list) and om and all(isinstance(x, str) for x in om):
                for x in om: gens[x].append(e)
            elif isinstance(om, list) and om and all(isinstance(x, list) for x in om):    # one drawing of several tiles
                for r, row in enumerate(om):
                    for c, x in enumerate(row): gens[x].append(dict(e, part=(r, c, len(om), len(row))))
    return pal, gens

def pick(v, params):
    """A palette value as one id: the commonest of a weighted list, a parameter's fallback or default."""
    if isinstance(v, str): return v
    if isinstance(v, list):
        best = max((x if isinstance(x, list) else [x, 1] for x in v), key=lambda x: x[1])
        return pick(best[0], params)
    if isinstance(v, dict):
        if "param" in v: return params.get(v["param"]) or v.get("fallback")
        if "switch" in v: return pick(v.get("default") or next(iter(v.get("cases", {}).values()), None), params)
        if "distribution" in v: return pick(v["distribution"], params)
        if "fallback" in v: return v["fallback"]
    return None

def palette(obj, pal, seen=None):
    """Character -> (terrain id, furniture id) for a mapgen object, its palettes merged in order (its own last)."""
    seen = seen or set()
    ter, fur, params = {}, {}, {}
    for pid in obj.get("palettes", []):
        pid = pick(pid, {}) if not isinstance(pid, str) else pid
        if pid in pal and pid not in seen:
            t, f, p = palette(pal[pid], pal, seen | {pid})
            ter.update(t); fur.update(f); params.update(p)
    for name, p in (obj.get("parameters") or {}).items():
        params[name] = pick(p.get("default"), params)
    for ch, v in (obj.get("terrain") or {}).items(): ter[ch] = pick(v, params)
    for ch, v in (obj.get("furniture") or {}).items(): fur[ch] = pick(v, params)
    for ch in (obj.get("toilets") or {}): fur[ch] = "f_toilet"
    for ch in (obj.get("computers") or {}): fur[ch] = "f_console"
    for ch in (obj.get("vendingmachines") or {}): fur[ch] = "f_vending_c"
    return ter, fur, params

# ------------------------------------------------------------------ one layout to a WoDX type
def tile(e, pal):
    """One CDDA map tile as two grids of squares: what each square is, and the furniture on it."""
    o = e["object"]
    rows = o.get("rows") or []
    if not rows: return None
    ter, fur, _ = palette(o, pal)
    fill = kind_of(o.get("fill_ter")) if o.get("fill_ter") else "unknown"
    H, W = len(rows), max(len(r) for r in rows)
    grid = [[None] * W for _ in range(H)]
    furn = [[None] * W for _ in range(H)]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r.ljust(W)):
            k = kind_of(ter.get(ch)) if ch in ter else (fill if ch != " " else "outside")   # a mark with no terrain stands on the fill
            grid[y][x] = k
            furn[y][x] = FURN.get(fur.get(ch) or "")
    nest = {}
    for pid in o.get("palettes", []):                       # chunks set on a mark ("nested"), palettes' first
        if isinstance(pid, str) and pid in pal: nest.update(pal[pid].get("nested") or {})
    nest.update(o.get("nested") or {})
    marks = [dict(v, x=x, y=y) for y, r in enumerate(rows) for x, c in enumerate(r) if c in nest for v in (nest[c],)]
    for pn in (o.get("place_nested") or []) + marks:                # chunks set into the map: the likeliest one, at its first spot
        ch_ = pn.get("chunks") or []
        if not ch_ or pn.get("neighbors") or pn.get("joins"): continue
        best = max(ch_, key=lambda c: c[1] if isinstance(c, list) else 1)
        n = NESTED.get(best[0] if isinstance(best, list) else best)
        if not n or not n.get("rows"): continue
        nt, nf, _ = palette(n, pal)
        ox, oy = (v[0] if isinstance(v, list) else v for v in (pn.get("x", 0), pn.get("y", 0)))
        for y, r in enumerate(n["rows"]):
            for x, c in enumerate(r):
                X, Y = ox + x, oy + y
                if c == " " or not (0 <= X < W and 0 <= Y < H): continue
                if c in nt: grid[Y][X] = kind_of(nt[c])
                if c in nf: furn[Y][X] = FURN.get(nf[c])
    return grid, furn

def settle(grid):
    """Squares of unknown ground are floor when walls close them in, else outside; so is floor open to the map edge
    (a concrete yard, a car park, a patio)."""
    H, W = len(grid), len(grid[0])
    out, st = set(), [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    while st:
        x, y = st.pop()
        if (x, y) in out or not (0 <= x < W and 0 <= y < H) or grid[y][x] not in ("unknown", "outside", "street", "floor"): continue
        out.add((x, y)); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    for y in range(H):
        for x in range(W):
            if grid[y][x] == "unknown": grid[y][x] = "outside" if (x, y) in out else "floor"
            elif grid[y][x] == "outside" and (x, y) not in out: grid[y][x] = "floor"
            elif grid[y][x] == "floor" and (x, y) in out: grid[y][x] = "outside"     # a yard, car park or patio open to the edge
    return grid

def stitch(tiles):
    """Tiles laid out in rows (a building of several CDDA tiles) as one pair of grids."""
    grid, furn = [], []
    for row in tiles:
        h = max(len(t[0]) for t in row)
        for y in range(h):
            grid.append(sum((t[0][y] if y < len(t[0]) else ["outside"] * len(t[0][0]) for t in row), []))
            furn.append(sum((t[1][y] if y < len(t[1]) else [None] * len(t[1][0]) for t in row), []))
    return grid, furn

def rotate(grid):
    """A grid turned a quarter clockwise."""
    return [list(r) for r in zip(*grid[::-1])]

def convert(grid, furn, label, model, source):
    grid = settle([list(r) for r in grid])
    solid = lambda k: k in ("wall", "door", "window")
    inside = lambda k: k in ("floor", "stair")
    # the building: the largest connected mass of wall and floor squares
    H, W = len(grid), len(grid[0])
    seen, mass = set(), set()
    for y in range(H):
        for x in range(W):
            if (x, y) in seen or not (solid(grid[y][x]) or inside(grid[y][x])): continue
            comp, st = set(), [(x, y)]
            while st:
                p = st.pop()
                if p in comp or not (0 <= p[0] < W and 0 <= p[1] < H): continue
                k = grid[p[1]][p[0]]
                if not (solid(k) or inside(k)): continue
                comp.add(p); st += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
            seen |= comp
            if len(comp) > len(mass): mass = comp
    if len(mass) < 20: return None, "empty"
    # its street side goes to the bottom, as every WoDX type is drawn: the side with the most pavement, else the main door
    def street(gr, ms):
        y1 = max(p[1] for p in ms)
        return sum(1 for y in range(y1 + 1, len(gr)) for k in gr[y] if k == "street") + \
               3 * sum(1 for (x, y) in ms if y == y1 and gr[y][x] == "door")
    best, turn = -1, 0
    g, f_, m_ = grid, furn, mass
    for t in range(4):
        sc = street(g, m_)
        if sc > best: best, turn = sc, t
        Hh = len(g); g, f_ = rotate(g), rotate(f_); m_ = {(Hh - 1 - y, x) for (x, y) in m_}
    for _ in range(turn):
        Hh = len(grid); grid, furn = rotate(grid), rotate(furn); mass = {(Hh - 1 - y, x) for (x, y) in mass}
    x0, x1 = min(p[0] for p in mass), max(p[0] for p in mass)
    y0, y1 = min(p[1] for p in mass), max(p[1] for p in mass)
    at = lambda x, y: grid[y][x] if (x, y) in mass else "outside"
    outer = {p for p in mass if any((p[0] + dx, p[1] + dy) not in mass for dx in (-1, 0, 1) for dy in (-1, 0, 1))}
    ring = [p for p in outer]
    if sum(solid(at(*p)) for p in ring) < .9 * len(ring): return None, "outer wall has gaps"
    to = lambda v, lo: round((v - lo) * K, 2)
    ox, oy = x0 + .5, y0 + .5                                  # wall middles are the building's edge
    # rooms: each run of floor, cut into rectangles (largest first)
    seen, rects = set(), []
    for (x, y) in sorted(mass, key=lambda p: (p[1], p[0])):
        if (x, y) in seen or not inside(at(x, y)): continue
        region, st = set(), [(x, y)]
        while st:
            p = st.pop()
            if p in region or not inside(at(*p)): continue
            region.add(p); st += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
        seen |= region
        rects += cut(region)
    if not rects: return None, "no rooms"
    rooms, furnish, parts = [], {}, []
    names = collections.Counter()
    for (rx0, ry0, rx1, ry1, tiles) in rects:
        wl = all(solid(at(rx0 - 1, y)) for y in range(ry0, ry1 + 1))
        wr = all(solid(at(rx1 + 1, y)) for y in range(ry0, ry1 + 1))
        wt = all(solid(at(x, ry0 - 1)) for x in range(rx0, rx1 + 1))
        wb = all(solid(at(x, ry1 + 1)) for x in range(rx0, rx1 + 1))
        ax, bx = (rx0 - .5) if wl else rx0, (rx1 + 1.5) if wr else rx1 + 1
        ay, by = (ry0 - .5) if wt else ry0, (ry1 + 1.5) if wb else ry1 + 1
        X, Y = to(ax, ox), to(ay, oy)
        Wd, Hd = round(to(bx, ox) - X, 2), round(to(by, oy) - Y, 2)
        tags = {furn[y][x] for x, y in tiles if furn[y][x]}
        name = next((n for t, n in NAMES if t in tags), "Hall" if Wd * Hd > 40 else "Room")
        names[name] += 1
        if names[name] > 1: name = f"{name} {names[name]}"
        rooms.append((name, X, Y, Wd, Hd, "floor"))
        parts.append((X, Y, Wd, Hd))
        furnish[name] = pieces(tiles, furn, ox, oy, X, Y)
    outline = trace(mass, outer, ox, oy)
    partitions, openings = walls(at, mass, outer, solid, to, ox, oy, x0, y0, x1, y1, list(zip(outline, outline[1:] + outline[:1])))
    size = (to(x1 + .5, ox), to(y1 + .5, oy))
    return {"label": label, "model": model, "size": size, "outline": outline, "parts": parts, "rooms": rooms,
            "openings": openings, "partitions": partitions, "furnish": furnish, "cdda": source}, None

def trace(mass, outer, ox, oy):
    """The outer wall's middle line as a polygon: the edge of the building's squares, pulled in by half a square."""
    # edges of the mass on square borders, walked as one loop
    edges = {}
    for (x, y) in mass:
        for (dx, dy), a, b in (((0, -1), (x, y), (x + 1, y)), ((1, 0), (x + 1, y), (x + 1, y + 1)),
                               ((0, 1), (x + 1, y + 1), (x, y + 1)), ((-1, 0), (x, y + 1), (x, y))):
            if (x + dx, y + dy) not in mass: edges[a] = b
    start = min(edges); loop, p = [start], edges[start]
    while p != start and len(loop) < 10000: loop.append(p); p = edges[p]
    pts = [q for i, q in enumerate(loop) if (loop[i - 1][0] == q[0]) != (q[0] == loop[(i + 1) % len(loop)][0]) or
           (loop[i - 1][1] == q[1]) != (q[1] == loop[(i + 1) % len(loop)][1])]
    out = []
    n = len(pts)
    for i, q in enumerate(pts):                               # each corner moved half a square inward (clockwise loop)
        a, b = pts[i - 1], pts[(i + 1) % n]
        d1 = (q[0] - a[0], q[1] - a[1]); d2 = (b[0] - q[0], b[1] - q[1])
        u1 = (math.copysign(1, d1[0]) if d1[0] else 0, math.copysign(1, d1[1]) if d1[1] else 0)
        u2 = (math.copysign(1, d2[0]) if d2[0] else 0, math.copysign(1, d2[1]) if d2[1] else 0)
        n1, n2 = (-u1[1], u1[0]), (-u2[1], u2[0])             # inward for a clockwise loop in screen axes
        out.append((round((q[0] + .5 * (n1[0] + n2[0]) - ox) * K, 2), round((q[1] + .5 * (n1[1] + n2[1]) - oy) * K, 2)))
    return out

def cut(region):
    """A set of squares as rectangles, largest first: (x0, y0, x1, y1, squares)."""
    left, out = set(region), []
    while left:
        best = None
        for (x, y) in left:
            w = 0
            while (x + w, y) in left: w += 1
            h, ww = 0, w
            while True:
                row = 0
                while row < ww and (x + row, y + h) in left: row += 1
                if row == 0: break
                ww = min(ww, row); h += 1
                if best is None or ww * h > best[0]: best = (ww * h, x, y, ww, h)
        _, x, y, w, h = best
        sq = {(x + i, y + j) for i in range(w) for j in range(h)}
        left -= sq
        out.append((x, y, x + w - 1, y + h - 1, sq))
    return [r for r in out if len(r[4]) >= 2]

def pieces(tiles, furn, ox, oy, X, Y):
    """Furniture on its squares: runs of one tag merged into one piece (a bed of two squares, a counter of five)."""
    done, out = set(), []
    for (x, y) in sorted(tiles, key=lambda p: (p[1], p[0])):
        t = furn[y][x]
        if not t or (x, y) in done: continue
        run = [(x, y)]
        while (run[-1][0] + 1, y) in tiles and furn[y][run[-1][0] + 1] == t and len(run) < 6: run.append((run[-1][0] + 1, y))
        turn = 0
        if len(run) == 1:
            while (x, run[-1][1] + 1) in tiles and furn[run[-1][1] + 1][x] == t and len(run) < 6: run.append((x, run[-1][1] + 1))
            turn = 1 if len(run) > 1 else 0
        done |= set(run)
        cx = (sum(p[0] for p in run) / len(run) + .5 - ox) * K - X
        cy = (sum(p[1] for p in run) / len(run) + .5 - oy) * K - Y
        out.append([t, round(cx, 2), round(cy, 2), len(run), turn])
    return out

def walls(at, mass, outer, solid, to, ox, oy, x0, y0, x1, y1, edges=()):
    """Inner walls as segments on the middles of wall squares; doors and windows on them or on the outer wall."""
    parts, opens = [], []
    inner = lambda x, y: (x, y) in mass and (x, y) not in outer and solid(at(x, y))
    for y in range(y0, y1 + 1):
        x = x0
        while x <= x1:
            if inner(x, y) or (solid(at(x, y)) and inner(x + 1, y)):
                s_ = x
                while x + 1 <= x1 and solid(at(x + 1, y)) and (inner(x + 1, y) or inner(x, y)): x += 1
                if x - s_ >= 1: parts.append(((to(s_ + .5, ox), to(y + .5, oy)), (to(x + .5, ox), to(y + .5, oy))))
            x += 1
    for x in range(x0, x1 + 1):
        y = y0
        while y <= y1:
            if inner(x, y) or (solid(at(x, y)) and inner(x, y + 1)):
                s_ = y
                while y + 1 <= y1 and solid(at(x, y + 1)) and (inner(x, y + 1) or inner(x, y)): y += 1
                if y - s_ >= 1: parts.append(((to(x + .5, ox), to(s_ + .5, oy)), (to(x + .5, ox), to(y + .5, oy))))
            y += 1
    last = {}
    for (x, y) in sorted(mass, key=lambda p: (p[1], p[0])):
        k = at(x, y)
        if k not in ("door", "window"): continue
        h = solid(at(x - 1, y)) or solid(at(x + 1, y))
        v = solid(at(x, y - 1)) or solid(at(x, y + 1))
        along = "v" if v and not h else "h"
        px, py = to(x + .5, ox), to(y + .5, oy)
        key = (k, along, py if along == "h" else px)
        prev = last.get(key)
        if prev and abs((px if along == "h" else py) - prev[1]) < 1.6 * K:     # neighbouring squares: one opening
            if k == "door" and opens[prev[0]][0] == "door":
                _, ox_, oy_, al = opens[prev[0]]
                opens[prev[0]] = ("double", round((ox_ + px) / 2, 2), round((oy_ + py) / 2, 2), al)
            last[key] = (prev[0], px if along == "h" else py)
            continue
        last[key] = (len(opens), px if along == "h" else py)
        opens.append(("door" if k == "door" else "window", px, py, along))
    # a door or window standing alone (a glass screen, a door in a run of counter): give it its own short wall
    on = lambda o, a, b: (abs(a[1] - b[1]) < .01 and abs(o[2] - a[1]) < .05 and min(a[0], b[0]) - .05 <= o[1] <= max(a[0], b[0]) + .05) if o[3] == "h" \
        else (abs(a[0] - b[0]) < .01 and abs(o[1] - a[0]) < .05 and min(a[1], b[1]) - .05 <= o[2] <= max(a[1], b[1]) + .05)
    for o in opens:
        if any(on(o, a, b) for a, b in parts + edges): continue
        h = K * .75
        parts.append(((round(o[1] - h, 2), o[2]), (round(o[1] + h, 2), o[2])) if o[3] == "h" else ((o[1], round(o[2] - h, 2)), (o[1], round(o[2] + h, 2))))
    return parts, opens

# ------------------------------------------------------------------ which buildings, and as what
WANT = {   # name -> (label, model, CDDA tiles in rows)
    "bank": ("Bank", "a town bank branch with its vault", [["bank"]]),
    "bank-2": ("Bank", "a town bank branch with its vault", [["bank_1"]]),
    "bar": ("Bar", "a town bar", [["bar"]]),
    "bar-2": ("Bar", "a town bar", [["bar_1"]]),
    "library": ("Library", "a public library", [["s_library"]]),
    "library-2": ("Library", "a public library", [["s_library_1"]]),
    "funeral-home": ("Funeral home", "a funeral home with its embalming room", [["mortuary"]]),
    "museum": ("Museum", "a town museum", [["museum"]]),
    "art-gallery": ("Art gallery", "a private gallery", [["art_gallery"]]),
    "police-station": ("Police station", "a town police station with its cells", [["police"]]),
    "police-station-2": ("Police station", "a town police station with its cells", [["police_1"]]),
    "police-station-3": ("Police station", "a town police station with its cells", [["police_2"]]),
    "church": ("Church", "a parish church", [["church"]]),
    "church-2": ("Church", "a parish church", [["church_1"]]),
    "country-church": ("Country church", "a village church", [["rural_church"]]),
    "synagogue": ("Synagogue", "a town synagogue", [["synagogue"]]),
    "warehouse": ("Warehouse", "a town warehouse", [["warehouse"]]),
    "empty-warehouse": ("Empty warehouse", "a disused warehouse", [["abandonedwarehouse"]]),
    "empty-warehouse-2": ("Empty warehouse", "a disused warehouse", [["abandonedwarehouse_1"]]),
    "music-club": ("Music club", "a music venue and nightclub", [["music_venue"]]),
    "music-club-2": ("Music club", "a music venue and nightclub", [["music_venue_1"]]),
    "motel": ("Motel", "a roadside motel", [["motel_entrance", "motel_1"]]),
    "hospital": ("Hospital", "a town hospital with its wards, theatre and blood store",
                 [["hospital_1", "hospital_2", "hospital_3"], ["hospital_4", "hospital_5", "hospital_6"], ["hospital_7", "hospital_8", "hospital_9"]]),
    "mansion": ("Mansion", "a great house", [["mansion_c5_north", "mansion_e2_north", "mansion_c3_east"], ["mansion_t2_east", "mansion_+2_north", "mansion_t6_west"],
                                             ["mansion_c4_west", "mansion_t7_north", "mansion_c1_south"]]),
    "cathedral": ("Cathedral", "a cathedral", [["cathedral_1_NW", "cathedral_1_NE"], ["cathedral_1_SW", "cathedral_1_SE"]]),
    "sewer-station": ("Sewer pumping station", "a sewer sub-station", [["sewer_sub_station"]]),
}

FACINGS = {"north": 0, "east": 1, "south": 2, "west": 3}

def facing(om):
    """A tile named with the way it faces in a special (mansion_c5_east) as its id and quarter turns clockwise."""
    base, _, f = om.rpartition("_")
    return (base, FACINGS[f]) if f in FACINGS and base else (om, 0)

def turned(t, q):
    if t is None: return None
    g, f = t
    for _ in range(q): g, f = rotate(g), rotate(f)
    return g, f

def main():
    src = sys.argv[1]
    want = sys.argv[2:] or list(WANT)
    pal, gens = load(src)
    out, report = {}, []
    for key in want:
        label, model, layout = WANT[key]
        layout = [[facing(om) for om in row] for row in layout]   # (id, quarter turns) for tiles named with a facing
        missing = [om for row in layout for om, _ in row if om not in gens]
        if missing: report.append(f"{key}: not found {missing}"); continue
        first = gens[layout[0][0][0]][0]
        if "part" in first:                                   # the whole drawing at once
            tiles = [[tile(first, pal)]]
        else:
            tiles = [[turned(tile(gens[om][0], pal), q) for om, q in row] for row in layout]
        if any(t is None for row in tiles for t in row): report.append(f"{key}: a tile has no rows"); continue
        t, why = convert(*stitch(tiles), label, model, ", ".join(om for row in layout for om, _ in row))
        if t: out[f"cdda-{key}"] = t; report.append(f"{key}: ok {t['size']}, {len(t['rooms'])} rooms, {sum(len(v) for v in t['furnish'].values())} pieces")
        else: report.append(f"{key}: {why}")
    doc = {"credit": "Adapted from Cataclysm: Dark Days Ahead (https://github.com/CleverRaven/Cataclysm-DDA), CC BY-SA 3.0. "
                     "These layouts keep that licence.", "types": out}
    json.dump(doc, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cdda_types.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("\n".join(report))

if __name__ == "__main__": main()
