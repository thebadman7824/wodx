"""Check a generated .dungeondraft_map the way a person would look at it, before it is sent to anyone.

It reads the map as Dungeondraft will draw it: every object at its real picture size (from a table of measured
picture sizes, else the size in its file name, else one square), turned and scaled as written. Then it reports:

  across a wall   a piece inside a building whose picture crosses a wall (doorways and windows excepted)
  overlap         two pieces of furniture covering each other by more than a fifth of the smaller one
  askew           furniture inside a building that is not square to the walls
  in a doorway    furniture standing in the square inside a door
  outside         a piece whose middle is off the map
  tree over a building  a tree whose crown is drawn over a room (it hides what is inside)
  bare            a room whose furniture covers less than its share of the floor (see BARE), or that has too few
                  pieces for its size while covering less than .45 of it

Rooms are found from the walls themselves (a flood fill between walls), so the check works on any generated map.
It also draws a picture of what it measured (plan view: walls, doors, every picture's box, problems in red), so the
map can be looked at by eye.

Run: python3 check_map.py <map> [--sizes sizes.tsv] [--png out.png] [--json out.json] [--strict]
--strict ends with exit code 1 when anything is found (for the harness and before an export).
"""
import argparse, json, math, re, sys

import ddcore as C

CELL = 256
STEP = .25                         # flood fill resolution, in squares
BARE = .2                          # least share of a room's floor that its furniture should cover
PER_PIECE = 2.0                    # and at least one piece or thing (rugs, furniture, what stands on it) for every this many squares
YARD = {"Haystack", "Hay_Pile", "Woodpile"}

def nums(s): return [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", s.split("(", 1)[1])]

def load_sizes(path):
    out = {}
    if not path: return out
    for line in open(path, encoding="utf-8-sig"):
        p = line.rstrip("\n").split("\t")
        if len(p) < 3 or p[0] == "path": continue
        try: out[p[0]] = (int(p[1]) / CELL, int(p[2]) / CELL)
        except ValueError: pass
    return out

def picture_cells(path, sizes):
    """(w, h) in squares at scale 1, and how it was known."""
    if path in sizes: return sizes[path], "measured"
    name = path.rsplit("/", 1)[-1]
    if re.search(r"_(\d+)x(\d+)(?:_\w+)?\.(?:webp|png)$", name): return C.cells_of(name), "name"
    return (1.0, 1.0), "guessed"

def box(o, sizes):
    x, y = nums(o["position"]); sx = nums(o["scale"])[0]
    path = o["texture"].replace("res://packs/", "")
    (w, h), how = picture_cells(path, sizes)
    w, h = w * sx, h * sx
    if C.INSET.search(path): h = h / 2                         # drawn one square deep in the middle of a 2 by 2 square
    a = float(o.get("rotation", 0))
    c, s = math.cos(a), math.sin(a)
    cx, cy = x / CELL, y / CELL
    pts = [(cx + dx * c - dy * s, cy + dx * s + dy * c) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    return {"path": path, "name": path.rsplit("/", 1)[-1], "cx": cx, "cy": cy, "w": w, "h": h, "rot": a, "pts": pts,
            "layer": o.get("layer", 100), "how": how}

def walls_of(level):
    segs, gaps = [], []
    for wl in level.get("walls", []):
        p = nums(wl["points"]); pts = [(p[i] / CELL, p[i + 1] / CELL) for i in range(0, len(p), 2)]
        if wl.get("loop"): pts.append(pts[0])
        segs += list(zip(pts, pts[1:]))
        for po in wl.get("portals", []):
            px, py = nums(po["position"]); r = float(po.get("radius", 128)) / CELL
            kind = "window" if "Window" in po.get("texture", "") else "door"
            gaps.append((px / CELL, py / CELL, r, kind, float(po.get("rotation", 0))))
    return segs, gaps

def seg_hits_poly(a, b, pts, inset=.06):
    """Does the wall segment a-b pass through the box (shrunk by inset so a piece touching a wall is fine)?"""
    cx = sum(p[0] for p in pts) / 4; cy = sum(p[1] for p in pts) / 4
    q = [(cx + (x - cx) * (1 - inset / max(.01, math.hypot(x - cx, y - cy))), cy + (y - cy) * (1 - inset / max(.01, math.hypot(x - cx, y - cy)))) for x, y in pts]
    n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) / .05))
    for k in range(n + 1):
        x, y = a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n
        if inside(x, y, q): return (x, y)
    return None

def inside(x, y, pts):
    s = None
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        cr = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
        if abs(cr) < 1e-12: continue
        if s is None: s = cr > 0
        elif (cr > 0) != s: return False
    return True

def area_overlap(p, q, step=.05):
    """Shared area of two boxes, by sampling (they are small)."""
    xs = [v[0] for v in p]; ys = [v[1] for v in p]
    x0, x1 = max(min(xs), min(v[0] for v in q)), min(max(xs), max(v[0] for v in q))
    y0, y1 = max(min(ys), min(v[1] for v in q)), min(max(ys), max(v[1] for v in q))
    if x1 <= x0 or y1 <= y0: return 0.0
    n = 0; t = 0
    y = y0 + step / 2
    while y < y1:
        x = x0 + step / 2
        while x < x1:
            if inside(x, y, p) and inside(x, y, q): n += 1
            x += step
        y += step
    return n * step * step

def rooms_of(W, H, segs, gaps):
    """Flood-fill the map between walls (doors and windows closed) at STEP. Returns a list of rooms (sets of
    cells), leaving out the open ground (the region that reaches the map's edge)."""
    nx, ny = int(W / STEP), int(H / STEP)
    wall = [[False] * ny for _ in range(nx)]
    for (ax, ay), (bx, by) in segs:
        L2 = (bx - ax) ** 2 + (by - ay) ** 2
        i0, i1 = max(0, int(min(ax, bx) / STEP) - 1), min(nx - 1, int(max(ax, bx) / STEP) + 1)
        j0, j1 = max(0, int(min(ay, by) / STEP) - 1), min(ny - 1, int(max(ay, by) / STEP) + 1)
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                x, y = (i + .5) * STEP, (j + .5) * STEP
                t = 0 if L2 < 1e-12 else max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2))
                if math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)) <= STEP * .5 + 1e-9: wall[i][j] = True
    seen = [[False] * ny for _ in range(nx)]
    rooms = []
    for i in range(nx):
        for j in range(ny):
            if seen[i][j] or wall[i][j]: continue
            stack, cells, edge = [(i, j)], [], False
            seen[i][j] = True
            while stack:
                a, b = stack.pop(); cells.append((a, b))
                if a in (0, nx - 1) or b in (0, ny - 1): edge = True
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if 0 <= c < nx and 0 <= d < ny and not seen[c][d] and not wall[c][d]:
                        seen[c][d] = True; stack.append((c, d))
            if not edge and len(cells) * STEP * STEP >= 1.0: rooms.append(set(cells))
    return rooms

def room_names(path):
    """Room names from the map's WoDX file (feature ids are <building>-<room>-<n>): {(x, y): name} at each feature."""
    import os
    side = re.sub(r"\.dungeondraft_map$", ".wodx.json", path)
    if not os.path.exists(side): return []
    out = []
    for f in json.load(open(side)).get("features", []):
        m = re.match(r"(?:[a-z0-9]+(?:-[a-z0-9]+)*?-)?([a-z]+(?:-[a-z]+)*)-\d+$", f.get("id", ""))
        if m and f.get("rect"):
            x, y, w, h = f["rect"]
            out.append((x + w / 2, y + h / 2, m.group(1).replace("-", " ")))
    return out

OPEN_AIR = re.compile(r"court|yard|garden|cloister|terrace|courtyard", re.I)

RUG = re.compile(r"Rug_|Carpet", re.I)


def seg_dist(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy or 1)))
    return math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)


def wall_angle(o, segs):
    """The direction of the wall nearest a piece; 0 when there is none within 4 squares (open ground)."""
    best = min(segs, key=lambda s: seg_dist(o["cx"], o["cy"], *s), default=None)
    if best is None or seg_dist(o["cx"], o["cy"], *best) > 4: return 0.0
    return math.atan2(best[1][1] - best[0][1], best[1][0] - best[0][0])


def check(path, sizes_path=None):
    m = json.load(open(path))
    names = room_names(path)
    W, H = m["world"]["width"], m["world"]["height"]
    found, rooms_out, levels = [], [], []
    sizes = load_sizes(sizes_path)
    for lk, level in m["world"]["levels"].items():
        segs, gaps = walls_of(level)
        rooms = rooms_of(W, H, segs, gaps)
        cell_room = {}
        for n, r in enumerate(rooms):
            for c in r: cell_room[c] = n
        objs = [box(o, sizes) for o in level.get("objects", [])]
        def room_at(x, y): return cell_room.get((int(x / STEP), int(y / STEP)))
        for o in objs: o["room"] = room_at(o["cx"], o["cy"])
        furn = [o for o in objs if o["layer"] == 100 and o["room"] is not None]
        for o in objs:
            if not (0 <= o["cx"] <= W and 0 <= o["cy"] <= H) and not re.search(r"Tree|Pine|Bush|Stone|Rock|Stump|Pebble|Grass|Leaves|Twig", o["name"]): found.append(("outside", o, ""))
        for o in objs:                                         # a tree's crown drawn over a room hides what is in it
            if not re.search(r"Tree|Pine|Oak|Birch|Fir_|Canopy", o["name"]) or o["room"] is not None: continue
            r = .38 * max(o["w"], o["h"])
            hit = next((n for n in range(len(rooms)) for c in ((o["cx"] + r * math.cos(k * math.pi / 4), o["cy"] + r * math.sin(k * math.pi / 4)) for k in range(8))
                        if room_at(*c) == n), None)
            if hit is not None: found.append(("tree over a building", o, "room %d" % hit))
        for o in furn:
            for a, b in segs:
                hit = seg_hits_poly(a, b, o["pts"])
                if hit and not any(math.hypot(hit[0] - g[0], hit[1] - g[1]) <= g[2] + .05 for g in gaps):
                    found.append(("across a wall", o, "at %.1f, %.1f" % hit)); break
            q = ((o["rot"] - wall_angle(o, segs)) / (math.pi / 2)) % 1    # square to the nearest wall (a town's houses stand at angles)
            if min(q, 1 - q) > .02 and not re.search(C.SEATS.pattern + "|Rug|Plant|Pot_", o["name"], re.I):
                found.append(("askew", o, "turned %.0f degrees" % math.degrees(o["rot"])))
            if RUG.search(o["name"]): continue                  # a rug lies on the floor: under furniture and doors is where it belongs
            for g in gaps:                                     # the generator's clear zone: the door's width, 1.1 deep each side
                if g[3] != "door": continue
                c, sn = math.cos(g[4]), math.sin(g[4])          # in the door's own frame: u along its wall, v across it
                us = [(p[0] - g[0]) * c + (p[1] - g[1]) * sn for p in o["pts"]]
                vs = [-(p[0] - g[0]) * sn + (p[1] - g[1]) * c for p in o["pts"]]
                hw = g[2] - .05                                 # a touch at the edge is not in the way
                if min(us) < hw and max(us) > -hw and min(vs) < 1.0 and max(vs) > -1.0:
                    found.append(("in a doorway", o, "")); break
        solid = [o for o in furn if not RUG.search(o["name"])]
        for i, o in enumerate(solid):
            for p in solid[i + 1:]:
                if math.hypot(o["cx"] - p["cx"], o["cy"] - p["cy"]) > (o["w"] + o["h"] + p["w"] + p["h"]) / 2: continue
                sh = area_overlap(o["pts"], p["pts"])
                if sh > .2 * min(o["w"] * o["h"], p["w"] * p["h"]): found.append(("overlap", o, "with " + p["name"]))
        for n, r in enumerate(rooms):
            area = len(r) * STEP * STEP
            mine = [o for o in objs if o["room"] == n and o["layer"] in (50, 100, 300)]
            cover = sum(min(o["w"] * o["h"], area) for o in mine if o["layer"] == 100)
            xs = [c[0] for c in r]; ys = [c[1] for c in r]
            named = [nm for x, y, nm in names if room_at(x, y) == n]
            info = {"level": lk, "room": n, "name": named[0] if named else None, "area": round(area, 1), "pieces": len(mine), "cover": round(cover / area, 2),
                    "box": [min(xs) * STEP, min(ys) * STEP, (max(xs) + 1) * STEP, (max(ys) + 1) * STEP],
                    "guessed": sum(1 for o in mine if o["how"] == "guessed")}
            rooms_out.append(info)
            need = max(1, int(area / PER_PIECE))
            bar = BARE
            if not named: need, bar = max(1, int(area / (2 * PER_PIECE))), BARE / 2     # a room the WoDX file names nothing in: a court, a hall
            if OPEN_AIR.search(" ".join(named)): need, bar = 1, .05
            if area >= 3 and (cover / area < bar or len(mine) < need and cover / area < .45):   # few but big pieces are not bare
                found.append(("bare", {"name": "%s (%.0f squares)" % (named[0] if named else "room %d" % n, area), "cx": (info["box"][0] + info["box"][2]) / 2,
                              "cy": (info["box"][1] + info["box"][3]) / 2, "pts": None, "how": ""},
                              "%d pieces cover %d%% (wants %d and %d%%)" % (len(mine), 100 * cover / area, need, 100 * BARE)))
        levels.append((lk, segs, gaps, objs, rooms))
    return {"map": path, "width": W, "height": H, "found": found, "rooms": rooms_out, "levels": levels}

def draw(res, out, scale=24):
    from PIL import Image, ImageDraw
    W, H = res["width"], res["height"]
    im = Image.new("RGB", (int(W * scale), int(H * scale)), (24, 26, 30))
    d = ImageDraw.Draw(im)
    bad = {id(o) for _, o, _ in res["found"]}
    lk, segs, gaps, objs, rooms = res["levels"][0]
    for r in rooms:
        for i, j in r: d.rectangle([i * STEP * scale, j * STEP * scale, (i + 1) * STEP * scale, (j + 1) * STEP * scale], fill=(44, 40, 36))
    for o in objs:
        if o["room"] is None and o["layer"] == 100: continue
        col = {50: (90, 70, 110), 100: (150, 130, 90), 300: (100, 140, 120), 400: (230, 200, 80)}.get(o["layer"], (120, 120, 120))
        if id(o) in bad: col = (230, 50, 50)
        if o["how"] == "guessed" and id(o) not in bad: col = (200, 120, 40)
        d.polygon([(x * scale, y * scale) for x, y in o["pts"]], outline=col)
    for a, b in segs: d.line([a[0] * scale, a[1] * scale, b[0] * scale, b[1] * scale], fill=(230, 230, 230), width=3)
    for x, y, r, kind, _ in gaps:
        d.ellipse([(x - r) * scale, (y - r) * scale, (x + r) * scale, (y + r) * scale], outline=(80, 160, 255) if kind == "door" else (120, 200, 200))
    for kind, o, why in res["found"]:
        if kind == "bare": d.text((o["cx"] * scale - 20, o["cy"] * scale), "BARE", fill=(255, 90, 90))
    im.save(out)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("map"); ap.add_argument("--sizes"); ap.add_argument("--png"); ap.add_argument("--json")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()
    res = check(a.map, a.sizes)
    kinds = {}
    for kind, o, why in res["found"]: kinds.setdefault(kind, []).append((o, why))
    guessed = sorted({o["name"] for _, _, _, objs, _ in res["levels"] for o in objs if o["how"] == "guessed" and o["room"] is not None})
    print(f"{a.map}: {len(res['rooms'])} rooms, {sum(len(v) for v in kinds.values())} problems")
    for kind, v in kinds.items():
        print(f"  {kind}: {len(v)}")
        for o, why in v[:12]: print(f"    {o['name']} at {o['cx']:.1f}, {o['cy']:.1f} {why}")
    if guessed: print(f"  size guessed for {len(guessed)} pictures indoors (no measured size): " + ", ".join(guessed[:8]))
    if a.png: draw(res, a.png)
    if a.json:
        json.dump({"rooms": res["rooms"], "found": [{"kind": k, "name": o["name"], "x": round(o["cx"], 2), "y": round(o["cy"], 2), "why": w}
                                                    for k, o, w in res["found"]], "guessed": guessed}, open(a.json, "w"), indent=1)
    if a.strict and res["found"]: sys.exit(1)

if __name__ == "__main__":
    main()
