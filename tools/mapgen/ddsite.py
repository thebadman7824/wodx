"""WoDX single-site map generator, Dungeondraft edition: a castle, a mine or an arcology deck.

Each run writes a .dungeondraft_map, a WoDX sidecar (.wodx.json, for "Adopt a generated map" in Foundry) and a
plan-view SVG, like the town generator. Buildings and rooms are building types (buildings.py and the types below)
furnished by ddcore's room rules; every footprint is checked against every other one and against the ways, and
the script stops on any overlap.

  castle    a stone castle on a rise: an irregular curtain wall with round towers, a gatehouse and drawbridge over
            a moat, and in the bailey a keep, great hall, chapel, kitchen, smithy, stables, barracks, store and well.
  mine      a drift mine: the pithead yard at the surface, an adit into the hill, a main haulage gallery with rails,
            cross-cuts to the working faces, a shaft, a sump, a miners' rest and a tool store.
  building  one big building on its own grounds (--type, any building type: the hospital, the mansion, the cathedral),
            for a type too big for the town map or wanted at full size: a lawn and trees round it, a path from the
            front door to the road along the bottom edge, and a car park beside it from 1950 on.
  floors    every level of one building (--type) as its own map: the ground floor on its grounds, the upper floors
            and the cellar (floors.py), the stair in the same spot on each, and an index <name>-levels.json.
  arcology  one deck of an arcology: a square hull round a planted atrium with the lift core, a ring corridor, four
            axial corridors and a perimeter corridor; the four quarters hold housing pods, hydroponics, a market
            commons and the services (clinic, security, engineering). The asset packs are medieval, so the
            furniture stands in for later kit until later packs are added.

Run: python3 ddsite.py --kind castle|mine|arcology|building [--type KEY] [--seed N] [--name NAME] [--assets LIST] [--out DIR] [--day]
"""
import argparse, json, math, re

import ddcore as C
from ddcore import obj, wall_with_portals, pattern, path, splat_byte
import buildings as B
import geom as G

STONE, PLANKS = B.FLOORS["stone"], B.FLOORS["planks"]
MARBLE, SQUARE = "Marble_Tiles_A_White.webp", "Square_Tiles_A_01.webp"
BED, CHEST, TABLE, BENCH, STOOL = B.BED, B.CHEST, B.TABLE, B.BENCH, B.STOOL
BARREL, CRATE, SACK, KEG = B.BARREL, B.CRATE, B.SACK, B.KEG
CHAIR, PLANT, BIGPLANT = "Chair_Wood_Ashen_A_1x1.webp", "Potted_Plant_A_1x1.webp", "Potted_Plant_C_2x2.webp"
TREES = [f"Tree_Green_A{i}_{s}.webp" for i, s in ((1, "6x6"), (3, "6x5"), (6, "5x5"), (10, "5x5"))]

# ------------------------------------------------------------------ building types for the castle (house rules)
CASTLE = {
    "keep": {"label": "Keep", "size": (12, 10), "wall": "Stone_A.png", "place": "castle", "fill": "home", "eras": B.MEDIEVAL,
             "rooms": [("Great chamber", 0, 0, 7, 6, "planks"), ("Solar", 7, 0, 5, 6, "planks"), ("Undercroft store", 0, 6, 5, 4, "stone"),
                       ("Stair and guard", 5, 6, 7, 4, "stone")],
             "openings": [("door", 8.5, 10, "h"), ("doorway", 7, 3, "v"), ("door", 5, 8, "v"), ("doorway", 6, 6, "h"),
                          ("window", 3.5, 0, "h"), ("window", 9.5, 0, "h"), ("window", 0, 3, "v"), ("window", 12, 3, "v")],
             "partitions": [((7, 0), (7, 6)), ((0, 6), (12, 6)), ((5, 6), (5, 10))],
             "furnish": {"Great chamber": [(B.BIGBED, "wall:N", 1), (CHEST, "beside:bed", 2), (TABLE, "window", 1), (BENCH, "beside:table", 1)],
                         "Solar": [(TABLE, "window", 1), (CHAIR, "beside:table", 2), (CHEST, "corner", 1)],
                         "Undercroft store": [(BARREL, "wall", 3, .8), (SACK, "wall", 2, .8), (CRATE, "corner", 1)],
                         "Stair and guard": [(BENCH, "wall:E", 1), ("Weapon_Rack_Metal_Gray_A1_1x2.webp", "wall:N", 1)]}},
    "hall": {"label": "Great hall", "size": (12, 7), "wall": "Stone_A.png", "place": "castle", "fill": "home", "eras": B.MEDIEVAL,
             "rooms": [("Great hall", 0, 0, 9, 7, "planks"), ("Buttery", 9, 0, 3, 3.5, "stone"), ("Pantry", 9, 3.5, 3, 3.5, "stone")],
             "openings": [("double", 4.5, 7, "h"), ("doorway", 9, 1.75, "v"), ("doorway", 9, 5.25, "v"), ("window", 2, 0, "h"),
                          ("window", 6.5, 0, "h"), ("window", 0, 3.5, "v")],
             "partitions": [((9, 0), (9, 7)), ((9, 3.5), (12, 3.5))],
             "furnish": {"Great hall": [(TABLE, "centre", 2), (BENCH, "beside:table", 3), ("Brazier_A_1x1.webp", "wall:W", 1)],
                         "Buttery": [(KEG, "wall", 2, .8), (BARREL, "wall", 1, .8)], "Pantry": [(SACK, "wall", 2, .8), (CRATE, "corner", 1)]}},
    "gatehouse": {"label": "Gatehouse", "size": (7, 5), "wall": "Stone_A.png", "place": "gate", "fill": "workshop", "eras": B.MEDIEVAL,
                  "rooms": [("Guard room west", 0, 0, 2.5, 5, "stone"), ("Gate passage", 2.5, 0, 2, 5, "stone"), ("Guard room east", 4.5, 0, 2.5, 5, "stone")],
                  "openings": [("arch", 3.5, 5, "h"), ("double", 3.5, 0, "h"), ("door", 2.5, 2.5, "v"), ("door", 4.5, 2.5, "v")],
                  "partitions": [((2.5, 0), (2.5, 5)), ((4.5, 0), (4.5, 5))],
                  "furnish": {"Guard room west": [(STOOL, "corner", 1, .8), (CHEST, "wall:W", 1)], "Guard room east": [(BENCH, "wall:E", 1)],
                              "Gate passage": []}},
}


def furnish_safely(b):
    """Furnishes a building; an item that will not fit is dropped (last first) rather than stopping the run."""
    for r in b.rooms:
        while True:
            try: r.furnish(tries=30); break
            except SystemExit:
                if not r.furnish_list: raise
                r.furnish_list.pop()
    import furnishing as F
    if F.DEFAULT: F.apply(b, **F.DEFAULT)
    return b


class Site:
    def __init__(self, name, cols, rows, seed, night=True):
        self.name, self.cols, self.rows, self.seed, self.night = name, cols, rows, seed, night
        self.R = C.R
        self.blds, self.walls, self.patterns, self.objects, self.paths = [], [], [], [], []
        self.regions, self.openings, self.features, self.households = [], [], [], []
        self.svg, self.svg_top = [], []
        self.taken = []                                       # footprints (polygons) nothing else may touch

    # ---------------------------------------------------------------- footprints
    def clear_of(self, poly, gap=0.0):
        return all(G.separation(poly, q) >= gap for q in self.taken)

    def take(self, poly): self.taken.append(poly)

    # ---------------------------------------------------------------- drawing
    def building(self, b, place=None, household=None):
        bx = b.outline
        for q in self.taken:
            if G.separation(bx, q) < -.01: raise SystemExit(f"{b.label} ({b.key}) stands on another building or a way")
        self.walls.append(wall_with_portals(bx, getattr(b, "wall_tex", None) or b.t["wall"], b.openings, True))
        for a, c in b.partitions: self.walls.append(wall_with_portals([a, c], getattr(b, "wall_tex", None) or b.t["wall"], b.openings, False))
        for r in b.rooms:
            if B.floor_tex(r.floor):
                tex = B.floor_tex(r.floor)
                self.patterns.append(pattern([(r.x, r.y), (r.x + r.w, r.y), (r.x + r.w, r.y + r.h), (r.x, r.y + r.h)], tex))
            self.objects.extend(C.dressing_objects(r, True))
            for it in r.items:
                rot = it.get("angle", math.pi / 2 if it["rot"] else 0.0)
                self.objects.append(obj(C.drawn(it)[0], *C.centre(it), rot, C.drawn(it)[1], 100))
            self.objects.extend(C.dressing_objects(r, False))
            self.features += C.feature_entries(f"{b.key}-", r, b.t["fill"])
        self.openings += C.opening_entries(b.key, b.label, b.openings, (b.x + b.w / 2, b.y + b.h / 2))
        kind = place or b.t["place"]
        if kind: self.regions.append({"id": b.key, "label": b.label, "rect": [round(v, 3) for v in b.rect], "place": {"kind": kind}})
        if household: self.households.append({"id": f"{b.key}-household", "building": b.key, "label": f"{b.label} household",
                                              "trade": household[0], "people": [{"role": r} for r in household]})
        self.blds.append(b)
        self.take(bx)
        self.svg += C.svg_rooms(b.rooms, S) + C.svg_openings(b.openings, S)

    def ring(self, cx, cy, r, tex, n=12, door_to=None, floor=STONE):
        """A round tower or well: a closed wall ring, a floor, and a door on the side facing door_to."""
        pts = [(cx + r * math.cos(a * 2 * math.pi / n), cy + r * math.sin(a * 2 * math.pi / n)) for a in range(n)]
        ops = []
        if door_to:
            k = min(range(n), key=lambda i: math.dist(((pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2), door_to))
            m = ((pts[k][0] + pts[(k + 1) % n][0]) / 2, (pts[k][1] + pts[(k + 1) % n][1]) / 2)
            ops = [("door", m[0], m[1], None)]
        self.walls.append(wall_with_portals(pts, tex, ops, True))
        if floor: self.patterns.append(pattern(pts, floor))
        self.take(pts)
        self.svg.append(f'<polygon points="{pl(pts)}" fill="#ddd" stroke="#333" stroke-width="2"/>')
        return pts

    def region(self, rid, label, poly, kind="other", **extra):
        bb = G.bbox(poly)
        pts = [round(v, 3) for q in poly for v in q]
        r = {"id": rid, "label": label, "rect": [round(v, 3) for v in bb], "points": pts[:400]}
        if kind: r["place"] = {"kind": kind}
        r.update(extra)
        self.regions.append(r)

    def trigger(self, rid, label, rect, note):
        self.regions.append({"id": rid, "label": label, "rect": [round(v, 3) for v in rect],
                             "behaviors": [{"type": "trigger", "system": {"label": note, "does": "note", "who": "pcs"}}]})

    # ---------------------------------------------------------------- output
    def write(self, out, kind, era, terrain, weights, ambient):
        W, H = self.cols * 4, self.rows * 4
        spl = []
        for ty in range(H):
            for tx in range(W): spl.extend(splat_byte(weights((tx + .5) / 4, (ty + .5) / 4)))
        lvl = C.level(self.cols, self.rows, self.walls, self.patterns, self.objects, self.paths, terrain, spl, ambient)
        base = re.sub(r"[^a-z0-9]+", "-", self.name.lower().replace("ö", "o").replace("ü", "u").replace("ä", "a")).strip("-")
        C.write_map(f"{out}/{base}.dungeondraft_map", self.cols, self.rows, self.seed, lvl)
        people = sum(len(h["people"]) for h in self.households)
        sc = {"format": "wodx-map", "version": 1, "name": self.name, "map": f"{base}.dungeondraft_map", "cells": [self.cols, self.rows],
              "seed": self.seed, "kind": kind, "layout": "site", "era": era, "population": people,
              # the whole map's kind of place (WoDX NPC place tag), for passers-by, sounds and the Masquerade
              "place": {"kind": {"castle": "castle", "mine": "workplace", "arcology": "street"}.get(kind) or next(
                  (r["place"]["kind"] for r in self.regions if (r.get("place") or {}).get("kind")), "home" if kind in ("building", "floors") else "other")},
              "openings": self.openings, "features": self.features, "regions": self.regions, "households": self.households}
        json.dump(sc, open(f"{out}/{base}.wodx.json", "w"), indent=1)
        o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.cols * S}" height="{self.rows * S}" font-family="DejaVu Sans" font-size="7">',
             f'<rect width="100%" height="100%" fill="{BG[kind]}"/>'] + self.svg + self.svg_top
        o.append(f'<text x="8" y="{self.rows * S - 10}" font-size="16" font-weight="bold">{self.name}: {LABEL[kind]}, {people} people in {len(self.households)} households</text></svg>')
        open(f"{out}/{base}-plan.svg", "w").write("\n".join(o))
        print(f"ok: {self.name}, {LABEL[kind]}, {self.cols} x {self.rows} squares, {len(self.blds)} buildings or rooms, {people} people")
        print(f"  {len(self.walls)} walls, {sum(len(w['portals']) for w in self.walls)} portals, {len(self.objects)} objects, {len(self.regions)} regions")
        return base


S = 14
BG = {"castle": "#e3ead6", "mine": "#5d5850", "arcology": "#d9dde2"}
LABEL = {"castle": "castle", "mine": "drift mine", "arcology": "arcology deck"}
pl = lambda pts: " ".join(f"{q[0] * S:.1f},{q[1] * S:.1f}" for q in pts)


# ================================================================== the castle
def castle(seed, name):
    R = C.R
    st = Site(name or R.choice(["Burg Falkenstein", "Burg Hohenfels", "Burg Eschenau", "Burg Rabenstein"]), 70, 68, seed)
    cx, cy = 35, 33
    n = 8
    rad = [R.uniform(21, 24) for _ in range(n)]
    rad[1] = rad[2]                                           # the south face is level, for the gatehouse
    ang = [(22.5 + 45 * k) * math.pi / 180 for k in range(n)]
    wall = [(cx + r * math.cos(a), cy + r * math.sin(a)) for r, a in zip(rad, ang)]
    gy = wall[1][1]
    gx = (wall[1][0] + wall[2][0]) / 2
    # moat: the wall pushed out four squares, as a water path round it, with the drawbridge over it at the gate
    moat = [(cx + (r + 4.2) * math.cos(a), cy + (r + 4.2) * math.sin(a)) for r, a in zip(rad, ang)]
    st.paths.append(path(moat + moat[:1], "River_Bank_Blue.webp", int(2.6 * C.CELL), layer=50))
    st.svg.append(f'<polygon points="{pl(moat)}" fill="none" stroke="#7fa7c9" stroke-width="{2.6 * S}" stroke-linejoin="round"/>')
    bridge = [(gx - 1.5, gy + 2.5), (gx + 1.5, gy + 2.5), (gx + 1.5, gy + 8.2), (gx - 1.5, gy + 8.2)]
    st.patterns.append(pattern(bridge, PLANKS, math.pi / 2))
    st.svg_top.append(f'<polygon points="{pl(bridge)}" fill="#a07a4c" stroke="#5a3d1e"/>')
    st.region("drawbridge", "The drawbridge", bridge, "street")
    st.region("moat", "The moat", G.buffer_line(moat + moat[:1], 1.3)[:100], "other")
    # the bailey ground and the curtain wall, cut for the gatehouse
    st.svg.append(f'<polygon points="{pl(wall)}" fill="#d6c9a7" stroke="none"/>')
    gh = B.Building("gatehouse-1", "gatehouse", gx - 3.5, gy - 2.5, "S", None, None, CASTLE["gatehouse"])
    st.building(furnish_safely(gh), "gate", ("gate warden", "guard", "guard"))
    run = wall[2:] + wall[:2]                                 # from the gate's east side round to its west side
    run = [(gx + 3.5, gy)] + run + [(gx - 3.5, gy)]
    st.walls.append(wall_with_portals(run, "Stone_A.png", [], False))
    st.svg.append(f'<polyline points="{pl(run)}" fill="none" stroke="#444" stroke-width="{.7 * S}"/>')
    for k, (x, y) in enumerate(wall):
        st.ring(x, y, 1.9, "Stone_A.png", door_to=(cx, cy))
        st.region(f"tower-{k + 1}", "Tower", [(x - 1.9, y - 1.9), (x + 1.9, y - 1.9), (x + 1.9, y + 1.9), (x - 1.9, y + 1.9)], "castle")
    st.trigger("gate", "The castle gate", (gx - 1.5, gy + 2.5, 3, 2), f"the gate of {st.name}")
    inner = G.inset(wall, [2.0] * n)
    st.region("bailey", "The bailey", inner, "castle")
    # the way from the gate to the keep stays open: nobody builds on it
    keep_at = (cx, cy - 12)
    lane = G.buffer_line([(gx, gy - 2.5), (gx, keep_at[1] + 6)], 1.8)
    st.svg.append(f'<polygon points="{pl(lane)}" fill="#c9b48a" opacity=".6"/>')
    st.take(lane)
    order = [("keep", "keep", "Keep", lambda p: p[1] * 2, ("lord", "lady", "child", "steward", "servant", "servant")),
             ("hall", "hall", "Great hall", lambda p: math.dist(p, keep_at), None),
             ("chapel", "chapel", "Castle chapel", lambda p: G.edge_dist(p, inner) + abs(p[1] - cy) * .3, ("chaplain",)),
             ("bakehouse", "bakehouse", "Kitchen", lambda p: math.dist(p, keep_at) * .7, ("cook", "scullion")),
             ("guardhouse", "guardhouse", "Barracks", lambda p: G.edge_dist(p, inner) * 2 + .3 * math.dist(p, (gx, gy)), ("sergeant", "man-at-arms", "man-at-arms", "man-at-arms")),
             ("barn", "barn", "Stables", lambda p: G.edge_dist(p, inner) * 2 + .3 * math.dist(p, (gx, gy)) * .8, ("groom",)),
             ("barn", "barn", "Stables", lambda p: G.edge_dist(p, inner) * 2 + .3 * math.dist(p, (gx, gy)) * .8, None),
             ("smithy", "smithy", "Smithy", lambda p: G.edge_dist(p, inner) * 2 + .3 * math.dist(p, (gx, gy)), ("smith", "apprentice")),
             ("storehouse", "storehouse", "Storehouse", lambda p: G.edge_dist(p, inner) * 2 + .3 * math.dist(p, (gx, gy)) * .2, None)]
    count = {}
    for key, tk, label, pref, hh in order:
        tdef = CASTLE.get(tk) or B.TYPES[tk]
        best = None
        for _ in range(4000):
            # the front door faces into the bailey, toward the middle
            mx_, my_ = R.uniform(cx - 21, cx + 21), R.uniform(cy - 21, cy + 21)
            facing = "N" if abs(my_ - cy) > abs(mx_ - cx) and my_ > cy else "S" if abs(my_ - cy) > abs(mx_ - cx) else "W" if mx_ > cx else "E"
            w, h = tdef["size"] if facing in "NS" else tdef["size"][::-1]
            x, y = mx_ - w / 2, my_ - h / 2
            box = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
            if not all(G.inside(q, inner) for q in box) or not st.clear_of(box, 1.2): continue
            mid = (mx_, my_)
            sc = pref(mid) + R.random()
            if best is None or sc < best[0]: best = (sc, x, y, facing)
        if not best: print("  note: no room for", label); continue
        count[tk] = count.get(tk, 0) + 1
        b = B.Building(f"{tk}-{count[tk]}", tk, best[1], best[2], best[3], label, None, tdef)
        st.building(furnish_safely(b), None, hh)
    # the well in the open middle of the bailey
    for _ in range(400):
        x, y = R.uniform(cx - 8, cx + 8), R.uniform(cy - 6, cy + 8)
        ring = [(x + .6 * math.cos(a * math.pi / 6), y + .6 * math.sin(a * math.pi / 6)) for a in range(12)]
        if st.clear_of(ring, 1.5):
            st.ring(x, y, .6, "Stone_A.png", floor=None)
            st.features.append({"id": "well", "label": "Well", "rect": [round(x - .6, 3), round(y - .6, 3), 1.2, 1.2],
                                "flags": {"climb": True, "climbKind": "rope", "height": 40, "depth": 40, "title": "Down the castle well"}})
            break
    def weights(x, y):
        if G.inside((x, y), wall): return [0, .25, .75, 0]   # the trodden bailey
        d = math.dist((x, y), (cx, cy))
        return [1, 0, 0, 0] if d < 36 else [.4, 0, 0, .6]
    return st, ["Grass_A_03.webp", "Dirt_A_01.webp", "Cracked_Dirt_A_01.webp", "Forest_Floor_Needles_A_01.webp"], weights, "dark-ages"


# ================================================================== the mine
def mine(seed, name):
    R = C.R
    st = Site(name or R.choice(["Grube Glückauf", "Silberstollen", "Grube Bergsegen", "Rote Zeche"]), 64, 48, seed)
    surface = 12                                              # x below this is the pithead yard in the open
    open_ = set()                                             # half-square cells cut out of the rock
    def cells(x0, y0, x1, y1):
        return {(i, j) for i in range(int(min(x0, x1) * 2), int(max(x0, x1) * 2)) for j in range(int(min(y0, y1) * 2), int(max(y0, y1) * 2))}
    def cut(x0, y0, x1, y1): open_.update(cells(x0, y0, x1, y1))
    rooms = []                                                # (id, label, rect, kind, area)
    y0 = R.randint(20, 27)
    # the adit and the main haulage gallery, stepping up and down a little as it follows the seam
    x, y, pts = surface, y0, [(surface - 2, y0 + 1.5)]
    while x < 47:
        L_ = R.randint(7, 12)
        cut(x, y, x + L_ + 3, y + 3)
        pts.append((x + L_ + 1.5, y + 1.5))
        x += L_
        if x < 44 and R.random() < .5:
            ny = max(8, min(36, y + R.choice((-4, 4))))
            cut(x, min(y, ny), x + 3, max(y, ny) + 3)
            pts.append((x + 1.5, ny + 1.5)); y = ny
    rooms.append(("adit", "The adit", (surface - 2, y0, 4, 3), "street", "adit"))
    rails = [pts[0]] + pts[1:]
    # cross-cuts north and south to the working faces, each ending in a stope
    faces = 0
    for k, (px, py) in enumerate(pts[1:-1]):
        for dirn in (-1, 1, -1, 1):
            if R.random() < .2: continue
            Ln = R.randint(5, 12)
            ex = px + R.uniform(-2, 2)
            ya, yb = (py - 1.5 - Ln, py - 1.5) if dirn < 0 else (py + 1.5, py + 1.5 + Ln)
            if ya < 3 or yb > st.rows - 3: continue
            sw, sh = R.randint(5, 8), R.randint(4, 6)
            sx, sy = ex - sw / 2, (ya - sh) if dirn < 0 else yb
            if sy < 2 or sy + sh > st.rows - 2 or sx + sw > st.cols - 2: continue
            # the new working keeps two squares of rock between it and every other working
            far = (ya, yb - 1) if dirn < 0 else (ya + 1, yb)
            near_ = cells(sx - 2, sy - 2, sx + sw + 2, sy + sh + 2) | cells(ex - 3, far[0], ex + 3, far[1])
            if near_ & open_: continue
            cut(ex - 1, ya, ex + 1, yb)
            cut(sx, sy, sx + sw, sy + sh)
            faces += 1
            rooms.append((f"stope-{faces}", f"Working face {faces}", (sx, sy, sw, sh), "workplace", "stope"))
    # the shaft (a round sump of a chamber with the ladder way up), the sump, the rest room and the tool store
    end = pts[-1]
    cut(end[0] + 1, end[1] - 3, end[0] + 7, end[1] + 3)
    rooms.append(("shaft", "Shaft bottom", (end[0] + 1, end[1] - 3, 6, 6), "workplace", "shaft"))
    low = max(pts[1:], key=lambda q: q[1])
    cut(low[0] - 2, low[1] + 1.5, low[0] + 2, low[1] + 5.5)
    rooms.append(("sump", "The sump", (low[0] - 2, low[1] + 1.5, 4, 4), "other", "sump"))
    def side_room(rid, label, area, w, h):
        for _ in range(200):
            px, py = R.choice(pts[1:-1])
            dirn = R.choice((-1, 1))
            rx = px + R.uniform(-3, 3)
            ry = py - 1.5 - h - 1 if dirn < 0 else py + 1.5 + 1
            cells = {(i, j) for i in range(int(rx * 2) - 2, int((rx + w) * 2) + 2) for j in range(int(ry * 2) - 2, int((ry + h) * 2) + 2)}
            if ry < 2 or ry + h > st.rows - 2 or cells & open_: continue
            cut(rx, ry, rx + w, ry + h)
            cut(rx + w / 2 - .75, min(ry + h, py - 1.5) if dirn < 0 else py + 1.5, rx + w / 2 + .75, py - 1.5 if dirn < 0 else ry)
            rooms.append((rid, label, (rx, ry, w, h), "workplace", area))
            return
    side_room("rest", "Miners' rest", "rest", 6, 4)
    side_room("tools", "Tool and powder store", "store", 4, 4)
    # walls: every edge between cut and solid rock, joined into straight runs
    edges = []
    for (i, j) in open_:
        for di, dj, a, b in ((0, -1, (i, j), (i + 1, j)), (0, 1, (i, j + 1), (i + 1, j + 1)), (-1, 0, (i, j), (i, j + 1)), (1, 0, (i + 1, j), (i + 1, j + 1))):
            if (i + di, j + dj) not in open_:
                if a[0] / 2 < surface and b[0] / 2 <= surface and di == 0: continue     # no rock face out in the yard
                if a[0] / 2 < surface and di != 0 and a[0] / 2 < surface: continue
                edges.append((a, b))
    runs = merge(edges)
    for a, b in runs:
        st.walls.append(wall_with_portals([(a[0] / 2, a[1] / 2), (b[0] / 2, b[1] / 2)], "Cellar_A.png", [], False))
        st.svg.append(f'<line x1="{a[0] / 2 * S}" y1="{a[1] / 2 * S}" x2="{b[0] / 2 * S}" y2="{b[1] / 2 * S}" stroke="#222" stroke-width="3"/>')
    st.svg.insert(0, f'<rect x="0" y="0" width="{surface * S}" height="{st.rows * S}" fill="#b9a47f"/>')
    for (i, j) in open_:
        st.svg.insert(1, f'<rect x="{i / 2 * S}" y="{j / 2 * S}" width="{S / 2 + .5}" height="{S / 2 + .5}" fill="#a99f8e"/>')
    # rails down the haulage gallery, timber sets along it, kit in the rooms
    st.paths.append(path(rails, "Road_Tracks_A.png", int(1.6 * C.CELL)))
    st.svg_top.append(f'<polyline points="{pl(rails)}" fill="none" stroke="#333" stroke-width="{.8 * S}" stroke-dasharray="{.3 * S} {.3 * S}"/>')
    st.region("haulage", "Main haulage gallery", G.buffer_line(rails, 1.5)[:200], "street", area="gallery")
    for a, b in zip(rails[1:], rails[2:]):
        L_ = math.dist(a, b)
        for t in range(2, int(L_) - 1, 4):
            q = (a[0] + (b[0] - a[0]) * t / L_, a[1] + (b[1] - a[1]) * t / L_)
            if abs(b[1] - a[1]) < .1:
                for s_ in (-1, 1): st.objects.append(obj("Retaining_Wall_Wood_Ashen_A1_2x1.webp", q[0], q[1] + s_ * 1.3, 0, .6, 100))
    kit = {"stope": [("Pickaxe_Ashen_B_1x1.webp", 2), ("Sack_Brown_E_Coals_1x1.webp", 2), (BARREL, 1)], "shaft": [(CRATE, 2), (BARREL, 1)],
           "rest": [(BENCH, 2), (TABLE, 1), (KEG, 1)], "store": [(CHEST, 2), (BARREL, 2), ("Pickaxe_Ashen_A_1x1.webp", 1)], "sump": [], "adit": []}
    for rid, label, (rx, ry, rw, rh), kind, area in rooms:
        poly = [(rx, ry), (rx + rw, ry), (rx + rw, ry + rh), (rx, ry + rh)]
        st.region(rid, label, poly, kind, area=area)
        st.svg_top.append(f'<text x="{(rx + .3) * S}" y="{(ry + rh / 2) * S}" font-weight="bold" fill="#123">{label}</text>')
        n_ = 0
        for asset, cnt in kit.get(area, []):
            for _ in range(cnt):
                ax, ay = rx + .8 + (n_ % max(1, int(rw - 1.5))) , ry + .8 + (n_ // max(1, int(rw - 1.5))) * (rh - 1.6)
                st.objects.append(obj(asset, ax, ay, R.uniform(0, 6.3), .8, 100)); n_ += 1
        if area == "stope": st.features.append({"id": f"{rid}-ore", "label": f"Ore face ({label})", "rect": [round(rx, 3), round(ry, 3), 1, round(rh, 3)],
                                                "flags": {"hide": True, "hideKind": "crawl", "room": 1, "title": "Into the narrow workings"}})
        if area == "shaft": st.features.append({"id": "shaft-ladder", "label": "Shaft ladder", "rect": [round(rx + rw / 2 - .5, 3), round(ry + rh / 2 - .5, 3), 1, 1],
                                                "flags": {"climb": True, "climbKind": "ladder", "height": 120, "title": "Up the shaft ladders to the winding house"}})
    st.trigger("adit-mouth", "The mine entrance", (surface - 3, y0 - .5, 2, 4), f"the mouth of {st.name}")
    # the pithead yard: a store and a smithy for the tools, and the miners' cottages
    count = {}
    for tk, label, hh in (("storehouse", "Pithead store", None), ("smithy", "Tool smithy", ("smith",)),
                          ("cottage", "Miners' cottage", ("miner", "partner", "child", "child")), ("cottage", "Miners' cottage", ("miner", "miner", "partner"))):
        for _ in range(3000):
            facing = "E"
            w, h = B.TYPES[tk]["size"][::-1]
            x, y = R.uniform(1, surface - 1.5 - w), R.uniform(1.5, st.rows - 1.5 - h)
            box = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
            if abs(y + h / 2 - (y0 + 1.5)) < h / 2 + 2.5 or not st.clear_of(box, 1.0): continue
            count[tk] = count.get(tk, 0) + 1
            st.building(furnish_safely(B.Building(f"{tk}-{count[tk]}", tk, x, y, facing, label)), None, hh)
            break
    for r in rooms:
        if r[4] == "stope": st.households and None
    def weights(x, y):
        i, j = int(x * 2), int(y * 2)
        if x < surface: return [0, 0, 1, 0]                   # the yard
        if (i, j) in open_:
            for rid, label, (rx, ry, rw, rh), kind, area in rooms:
                if area == "sump" and rx <= x <= rx + rw and ry <= y <= ry + rh: return [0, 0, 0, 1]
            return [0, 1, 0, 0]
        return [1, 0, 0, 0]
    return st, ["Rock_A_01.webp", "Cave_Floor_A.webp", "Rocky_Dirt_01_A.webp", "Water_Still_A_01.webp"], weights, "dark-ages"


def merge(edges):
    """Unit edges (in half squares) joined into the longest straight runs."""
    hor, ver = {}, {}
    for a, b in edges:
        if a[1] == b[1]: hor.setdefault(a[1], []).append(min(a[0], b[0]))
        else: ver.setdefault(a[0], []).append(min(a[1], b[1]))
    out = []
    for y, xs in hor.items():
        xs = sorted(set(xs)); s = xs[0]; p = s
        for x in xs[1:] + [None]:
            if x is not None and x == p + 1: p = x; continue
            out.append(((s, y), (p + 1, y)))
            if x is not None: s = p = x
    for x, ys in ver.items():
        ys = sorted(set(ys)); s = ys[0]; p = s
        for y in ys[1:] + [None]:
            if y is not None and y == p + 1: p = y; continue
            out.append(((x, s), (x, p + 1)))
            if y is not None: s = p = y
    return out


# ================================================================== the arcology deck
def arcology(seed, name):
    R = C.R
    st = Site(name or R.choice(["Arcology Kessler, deck 41", "Helios Spire, deck 12", "Neue Hanse Arcology, deck 7"]), 64, 64, seed)
    W = st.cols
    hull = (2, 2, W - 4, W - 4)
    c = W / 2
    a0, a1 = c - 10, c + 10                                   # the atrium
    ring = 3                                                  # corridor widths
    edge = 3
    # the deck floor, the hull and the atrium
    st.patterns.append(pattern([(2, 2), (W - 2, 2), (W - 2, W - 2), (2, W - 2)], SQUARE))
    st.walls.append(wall_with_portals([(2, 2), (W - 2, 2), (W - 2, W - 2), (2, W - 2)], "Solid_A.png", [], True))
    st.svg.append(f'<rect x="{2 * S}" y="{2 * S}" width="{(W - 4) * S}" height="{(W - 4) * S}" fill="#eef0f3" stroke="#333" stroke-width="5"/>')
    atr = [(a0, a0), (a1, a0), (a1, a1), (a0, a1)]
    st.svg.append(f'<polygon points="{pl(atr)}" fill="#bfe0a8"/>')
    st.region("atrium", "The atrium garden", atr, "other", area="park")
    # the lift core in the middle of the atrium: four cars round a stair
    core = B.Building("lift-core", "lift", c - 3, c - 3, "S", "Lift core", None, {
        "label": "Lift core", "size": (6, 6), "wall": "Solid_A.png", "place": "street", "fill": "workshop", "eras": [],
        "rooms": [("Lift A", 0, 0, 3, 3, MARBLE), ("Lift B", 3, 0, 3, 3, MARBLE), ("Lift C", 0, 3, 3, 3, MARBLE), ("Lift D", 3, 3, 3, 3, MARBLE)],
        "openings": [("double", 1.5, 0, "h"), ("double", 4.5, 0, "h"), ("double", 1.5, 6, "h"), ("double", 4.5, 6, "h")],
        "partitions": [((3, 0), (3, 6)), ((0, 3), (6, 3))], "furnish": {}})
    st.building(core, "street")
    st.features += [{"id": f"lift-{k}", "label": f"Lift {k}", "rect": [x_, y_, 3, 3], "flags": {"climb": True, "climbKind": "ladder", "height": 400,
                     "title": "The lift to the other decks"}} for k, x_, y_ in (("A", c - 3, c - 3), ("B", c, c - 3), ("C", c - 3, c), ("D", c, c))]
    for _ in range(14):                                       # trees and beds of plants in the atrium
        x, y = R.uniform(a0 + 2, a1 - 2), R.uniform(a0 + 2, a1 - 2)
        if abs(x - c) < 5 and abs(y - c) < 5: continue
        st.objects.append(obj(R.choice(TREES), x, y, R.uniform(0, 6.3), .45, 200))
        st.svg.append(f'<circle cx="{x * S}" cy="{y * S}" r="{1.3 * S}" fill="#6f9e5a" stroke="#3d6b2d"/>')
    # corridors: the ring round the atrium, four axial corridors, the perimeter corridor; kept clear
    corr = [(a0 - ring, a0 - ring, a1 - a0 + 2 * ring, ring), (a0 - ring, a1, a1 - a0 + 2 * ring, ring), (a0 - ring, a0, ring, a1 - a0), (a1, a0, ring, a1 - a0),
            (c - 1.5, 2 + edge, 3, a0 - ring - 2 - edge), (c - 1.5, a1 + ring, 3, W - 2 - edge - a1 - ring), (2 + edge, c - 1.5, a0 - ring - 2 - edge, 3),
            (a1 + ring, c - 1.5, W - 2 - edge - a1 - ring, 3), (2, 2, W - 4, edge), (2, W - 2 - edge, W - 4, edge), (2, 2 + edge, edge, W - 4 - 2 * edge),
            (W - 2 - edge, 2 + edge, edge, W - 4 - 2 * edge)]
    for k, (x, y, w, h) in enumerate(corr):
        st.svg.append(f'<rect x="{x * S}" y="{y * S}" width="{w * S}" height="{h * S}" fill="#c8ccd3"/>')
        st.region(f"corridor-{k + 1}", "Ring corridor" if k < 4 else "Axial corridor" if k < 8 else "Perimeter corridor",
                  [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], "street", area="corridor")
    mag = [(W - 2 - edge, c - 4), (W - 2, c - 4), (W - 2, c + 4), (W - 2 - edge, c + 4)]
    st.region("maglev", "Maglev platform (east axis)", mag, "other", area="transit")
    st.patterns.append(pattern(mag, MARBLE))
    st.paths.append(path([(W - 2.6, c - 4), (W - 2.6, c + 4)], "Road_Tracks_A.png", int(1.2 * C.CELL)))
    st.svg_top.append(f'<polygon points="{pl(mag)}" fill="#9fb3c8" stroke="#345"/><text x="{(W - 2 - edge) * S}" y="{(c - 4.4) * S}" font-weight="bold">Maglev</text>')
    # the four quarters, each a sector of its own: rows of rooms, every door on a corridor
    lo = 2 + edge                                             # a quarter runs from the perimeter corridor to the axial corridors
    quarters = ["NW", "NE", "SW", "SE"]
    sectors = dict(zip(R.sample(quarters, 4), ["housing", "hydroponics", "commons", "services"]))
    for q in quarters:
        kind = sectors[q]
        x0, x1 = (lo, c - 1.5) if q in ("NW", "SW") else (c + 1.5, W - 2 - edge)
        y0, y1 = (lo, c - 1.5) if q in ("NW", "NE") else (c + 1.5, W - 2 - edge)
        # the quarter's corner touching the atrium ring is cut out; rooms keep to the L that is left
        sector(st, kind, q, x0, y0, x1, y1, (a0 - ring, a0 - ring, a1 + ring, a1 + ring), R)
    def weights(x, y): return [0, 0, 1, 0] if a0 < x < a1 and a0 < y < a1 else [1, 0, 0, 0]
    return st, ["Gravel_Light_A.webp", "Dirt_A_01.webp", "Grass_A_03.webp", "Space_01.webp"], weights, "future-darkness"


class Placed(B.Building):
    """A building type set down facing south whose outer wall follows the type's outline (Cataclysm's layouts are
    not all boxes)."""
    @property
    def outline(self):
        return [(self.x + p[0], self.y + p[1]) for p in self.t.get("outline") or [(0, 0), (self.w, 0), (self.w, self.h), (0, self.h)]]


def building_site(seed, name, tk):
    import cddatypes, firstgroup, eratypes          # noqa: F401  (they add their types to buildings.TYPES)
    if tk not in B.TYPES: raise SystemExit(f"no building type {tk!r}")
    R = C.R
    tdef = B.TYPES[tk]
    w, h = tdef["size"]
    m = 8
    st = Site(name or tdef["label"], int(w + 2 * m + .99), int(h + 2 * m + 4.99), seed)
    x0, y0 = (st.cols - w) / 2, m
    b = Placed(tk, tk, x0, y0, "S", tdef["label"], None, tdef)
    furnish_safely(b)
    st.building(b, tdef.get("place"), ("staff",) if tdef.get("place") != "home" else ("owner", "household"))
    # the way in: from the front door (the street-side door nearest the middle) to the road along the bottom
    fronts = [o for o in b.openings if o[0] in ("door", "double") and abs(o[2] - (y0 + h)) < .05] or [("door", x0 + w / 2, y0 + h, "h")]
    fx = min(fronts, key=lambda o: abs(o[1] - (x0 + w / 2)))[1]
    road_y = st.rows - 2.5
    walk = [(fx - 1, y0 + h), (fx + 1, y0 + h), (fx + 1, road_y), (fx - 1, road_y)]
    st.patterns.append(pattern(walk, STONE)); st.take(walk)
    st.svg.append(f'<polygon points="{pl(walk)}" fill="#c9c2b4"/>')
    road = [(0, road_y), (st.cols, road_y), (st.cols, st.rows), (0, st.rows)]
    st.region("road", "Road", road, "street", area="street")
    st.svg.append(f'<polygon points="{pl(road)}" fill="#b3aa98"/>')
    era = tdef.get("era") or "dark-ages"
    if tdef["built"][1] >= 1950 and tdef["built"][0] >= 1900:      # a car park beside the way in
        px = fx + 3 if fx < st.cols / 2 else fx - 3 - 12
        lot = [(px, y0 + h + 2), (px + 12, y0 + h + 2), (px + 12, road_y), (px, road_y)]
        if all(0 <= q[0] <= st.cols for q in lot) and st.clear_of(lot, .5):
            st.take(lot); st.region("car-park", "Car park", lot, "street", area="parking")
            st.svg.append(f'<polygon points="{pl(lot)}" fill="#a9a9a9"/>')
    for _ in range(40):                                        # trees on the lawn, clear of everything
        x, y = R.uniform(2, st.cols - 2), R.uniform(2, road_y - 2)
        ring = [(x - 2, y - 2), (x + 2, y - 2), (x + 2, y + 2), (x - 2, y + 2)]
        if not st.clear_of(ring, .5): continue
        st.take(ring)
        st.objects.append(obj(R.choice(TREES), x, y, R.uniform(0, 6.3), .45, 200))
        st.svg.append(f'<circle cx="{x * S}" cy="{y * S}" r="{1.3 * S}" fill="#6f9e5a" stroke="#3d6b2d"/>')
    grounds = [(0, 0), (st.cols, 0), (st.cols, road_y), (0, road_y)]
    st.region("grounds", f"{tdef['label']} grounds", grounds, "other", area="grounds")
    BG["building"], LABEL["building"] = "#dfe8d2", tdef["label"].lower()
    def weights(x, y): return [0, 0, 1, 0] if y < road_y else [1, 0, 0, 0]
    return st, ["Gravel_Light_A.webp", "Dirt_A_01.webp", "Grass_A_03.webp", "Grass_A_03.webp"], weights, era


def floors_site(seed, name, tk, out, assets_day):
    """Every level of one building as its own map: the ground floor on its grounds, each upper floor and the cellar
    on a bare map of the same size, the stair in the same spot on each, plus an index (<name>-levels.json)."""
    import cddatypes, firstgroup, eratypes          # noqa: F401
    import floors as FL
    if tk not in B.TYPES: raise SystemExit(f"no building type {tk!r}")
    lv, spot = FL.levels(tk)
    base_name = name or B.TYPES[tk]["label"]
    index = {"format": "wodx-levels", "version": 1, "name": base_name, "type": tk, "levels": []}
    for i, (lname, tdef) in enumerate(lv):
        C.R.seed(seed + i)
        B.TYPES[f"{tk}--{lname}"] = tdef
        if lname == "ground":
            st, terrain, weights, era = building_site(seed, f"{base_name}", f"{tk}--{lname}")
        else:
            w, h = tdef["size"]
            st = Site(f"{base_name}, {tdef['label'].split(', ')[-1]}", int(w + 4.99), int(h + 4.99), seed + i)
            b = Placed(f"{tk}--{lname}", f"{tk}--{lname}", 2, 2, "S", tdef["label"], None, tdef)
            furnish_safely(b)
            st.building(b, tdef.get("place"))
            BG["building"], LABEL["building"] = ("#4a4640" if lname == "cellar" else "#e8e4dc"), tdef["label"].lower()
            era = tdef.get("era") or "dark-ages"
            terrain = ["Gravel_Light_A.webp", "Dirt_A_01.webp", "Grass_A_03.webp", "Grass_A_03.webp"]
            weights = (lambda x, y: [0, 1, 0, 0]) if lname == "cellar" else (lambda x, y: [1, 0, 0, 0])
        ox, oy = (st.cols - tdef["size"][0]) / 2 if lname == "ground" else 2, 8 if lname == "ground" else 2
        if spot:
            r = [r_ for r_ in tdef["rooms"]][[n_ for n_, *_ in B.TYPES[tk]["rooms"]].index(spot[0])]
            sx, sy = ox + r[1] + spot[1], oy + r[2] + spot[2]
            ups = i < len(lv) - 1 and lv[i + 1][0] != "cellar"
            st.features.append({"id": "stair", "label": "Stairs", "rect": [round(sx, 2), round(sy, 2), 1, 2],
                                "flags": {"climb": True, "climbKind": "ladder", "height": 10,
                                          "title": "Stairs " + ("up and down" if ups and lname != "cellar" else "up" if lname == "cellar" else "down")}})
        base = st.write(out, "building", era, terrain, weights, assets_day)
        index["levels"].append({"level": lname, "map": f"{base}.dungeondraft_map", "sidecar": f"{base}.wodx.json"})
    slug = re.sub(r"[^a-z0-9]+", "-", base_name.lower()).strip("-")
    json.dump(index, open(f"{out}/{slug}-levels.json", "w"), indent=1)
    print(f"  levels: {', '.join(l['level'] for l in index['levels'])} ({slug}-levels.json)")


SECTOR = {
    "housing": ("Housing pod", 4, 4, "home", [(BED, "wall", 1), (CHEST, "corner", 1), (CHAIR, "corner", 1, .8)], ("resident", "partner")),
    "hydroponics": ("Hydroponics bay", 8, 5, "workplace", [(BIGPLANT, "wall", 4), (PLANT, "wall", 2)], ("grower",)),
    "commons": ("Commons shop", 5, 5, "market", [(TABLE, "wall", 1), (CRATE, "corner", 2, .8), (CHAIR, "corner", 1, .8)], ("trader",)),
    "services": (None, 6, 5, "workplace", [(TABLE, "wall", 1), (CHAIR, "beside:table", 2), (CHEST, "corner", 1)], ("officer",)),
}
SERVICE = ["Clinic", "Security post", "Engineering", "Clinic ward", "Life-support plant", "Records office"]


def sector(st, kind, q, x0, y0, x1, y1, cut, R):
    label, rw, rh, place, furn, hh = SECTOR[kind]
    n = 0
    cx0, cy0, cx1, cy1 = cut
    y = y0 + .3
    rows_ = []
    while y + rh <= y1 - .3:
        rows_.append(y); y += rh + (2.2 if (len(rows_) % 2 == 0) else 0)   # every second row has a service lane behind it
    for ry in rows_:
        x = x0 + .3
        while x + rw <= x1 - .3:
            box = (x, ry, rw, rh)
            if not (x + rw <= cx0 or x >= cx1 or ry + rh <= cy0 or ry >= cy1): x += rw; continue   # the ring and atrium
            n += 1
            # the door goes on whichever side of the room faces a corridor or lane
            near = {"N": ry - y0, "S": y1 - (ry + rh), "W": x - x0, "E": x1 - (x + rw)}
            facing = min(near, key=near.get) if min(near.values()) < 1 else ("N" if rows_.index(ry) % 2 == 0 else "S")
            lab = label or SERVICE[(n - 1) % len(SERVICE)]
            t = {"label": lab, "size": (rw, rh), "wall": "Solid_A.png", "place": place, "fill": "home" if kind == "housing" else "workshop", "eras": [],
                 "rooms": [(lab, 0, 0, rw, rh, MARBLE if kind != "hydroponics" else SQUARE)],
                 "openings": [("door", rw / 2, rh, "h")], "partitions": [], "furnish": {lab: furn}}
            if facing in "EW": t["size"] = (rh, rw); t["rooms"] = [(lab, 0, 0, rh, rw, t["rooms"][0][5])]; t["openings"] = [("door", rh / 2, rw, "h")]
            b = B.Building(f"{kind}-{n}", kind, x, ry, facing, lab, None, t)
            st.building(furnish_safely(b), place, hh if kind != "hydroponics" or n % 3 == 1 else None)
            x += rw
    lx = x0 + .5 if q in ("NW", "SW") else x1 - 8
    ly = y0 - .6 if q in ("NW", "NE") else y1 + 2.2
    st.svg_top.append(f'<text x="{lx * S}" y="{ly * S}" font-size="14" font-weight="bold" fill="#345">{kind.title()}</text>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=("castle", "mine", "arcology", "building", "floors"), required=True)
    ap.add_argument("--type", help="--kind building: the building type, e.g. cdda-hospital, cdda-mansion, cdda-cathedral, general-hospital")
    ap.add_argument("--seed", type=int, default=1197)
    ap.add_argument("--name")
    ap.add_argument("--assets", default="/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt")
    ap.add_argument("--out", default=".")
    ap.add_argument("--day", action="store_true")
    ap.add_argument("--year", type=int, help="furnish by purpose, era palette and room value for this year (1197-2099)")
    ap.add_argument("--wealth", choices=("poor", "middling", "rich", "noble"), help="with --year: the owner's wealth (else the type's usual)")
    ap.add_argument("--region", default="moravia", help="with --year: the world region (WORLD_REGIONS id)")
    ap.add_argument("--trade", help="with --year: the owner's trade, e.g. 'cloth merchant'")
    a = ap.parse_args()
    C.init(a.seed, a.assets)
    if a.year:
        import furnishing as F
        F.DEFAULT.update(year=a.year, region=a.region, wealth=a.wealth, trade=a.trade, seed=a.seed)
    if a.kind == "floors":
        return floors_site(a.seed, a.name, a.type or "burgher-palace", a.out, "ffffffff" if a.day else "ff6a7aa8")
    if a.kind == "building": st, terrain, weights, era = building_site(a.seed, a.name, a.type or "cdda-hospital")
    else: st, terrain, weights, era = {"castle": castle, "mine": mine, "arcology": arcology}[a.kind](a.seed, a.name)
    amb = "ffffffff" if a.day else {"castle": "ff6a7aa8", "mine": "ff3a3a48", "arcology": "ffc8d0e0"}.get(a.kind, "ff6a7aa8")
    st.write(a.out, a.kind, era, terrain, weights, amb)


if __name__ == "__main__":
    main()
