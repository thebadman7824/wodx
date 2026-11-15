"""Placement logic (B6345): what goes in a room, which variation of it, and where, decided from the census by the kind
of place, the room, the household's wealth, the world region and the year.

    import library as lib
    from library.placing import furnish
    furnish(rec, (4, 3, 11, 10), place="home", room="hall", wealth=2, region="moravia")

How it decides:
  1. Choose. Every census row whose rooms name this room (or this kind of place, or any room), whose years hold the
     map's year, whose wealth range holds the household's, and whose styles include the region's (or every region),
     and which the library can draw. Weight 3 is always taken; weight 2 most of the time; weight 1 now and then, more
     often in a richer house. Counts grow with the floor: seats with the tables, beds with the chamber.
  2. Pick the look. Each chosen thing takes the variation (variants.pick) of the era, the region's style and the
     household's wealth; a poorer house's things are more often worn.
  3. Set it down. Things that stand against a wall go along the walls, largest first, keeping clear of every door
     and its swing and of the windows where they are tall; things that stand free go in the floor, the hearth and the
     table toward the middle, each with its working side to the room and its clearance kept; small goods go on the
     tables, shelves and counters; nothing blocks the way between the doors.
  4. Check. The recorder's own checks (checks.py) then test every piece against the walls, doors, windows and each other.
Every choice is returned as a list of (id, variation label, where) so a map's sidecar and a desk can show why."""
import math

import numpy as np

from library.census import CENSUS, ROOMS
from library.core import CATALOGUE, put, by_wall, spec
from library import variants as V

SEATS = {"chair", "stool", "bench", "barstool", "armchair", "sofa", "cushion", "lordchair", "officechair", "rocking", "settle", "chaise"}
SURFACES = {"table", "table-small", "table-round", "table-low", "dininglong", "desk", "counter", "bar", "workbench", "shelf", "dresser", "sideboard",
            "labbench", "writingslope", "coffeetable", "dressingtable", "washstand", "chest", "drawers"}
TALL = {"cupboard", "bookcase", "dresser", "longcase", "scrollrack", "apothecary", "guncabinet", "fridge", "locker", "filing", "toolrack", "weaponrack", "boxbed",
        "serverrack", "morguedrawers", "iconostasis", "torahark", "settle", "pegrail", "coatstand"}
# how many of a thing a room holds: one for each so many squares of floor (where it is usual or always there)
PER_AREA = {"stool": 8, "chair": 7, "bench": 14, "bed-narrow": 10, "pallet": 12, "pew": 4, "crate": 5, "cask": 5, "sack": 4, "basket": 12, "barstool": 6,
            "bunk": 10, "hospitalbed": 8, "locker": 6, "headstone": 2, "grave": 3, "table": 30, "candle": 15, "lantern": 30, "torch": 20, "hayheap": 12,
            "trough": 30, "horsestall": 6, "manger": 12, "bookcase": 10, "filing": 10, "desk": 12, "crock": 10, "jar": 10, "cup": 12, "bowl": 12, "plate": 12}
_ROW = {r.id: r for r in CENSUS}


def _weight(row, place, room):
    best = 0
    for part in row.where.split(","):
        nm, _, w = part.strip().rpartition(" ")
        w = int(w) if w.isdigit() else 1
        if nm == room or nm == place or nm == "*": best = max(best, w)
    return best


def _years_ok(row, year):
    a, _, b = row.years.partition("-")
    return (not a or int(a) <= year) and (not b or year <= int(b))


def candidates(place, room, year, wealth, style):
    """Every census row that may stand in this room: [(row, weight)], heaviest first."""
    out = []
    for row in CENSUS:
        if row.id not in CATALOGUE: continue
        sp = CATALOGUE[row.id]
        if sp.mount == "opening": continue
        w = _weight(row, place, room)
        if not w or not _years_ok(row, year) or not (sp.eras[0] <= year <= sp.eras[1]): continue
        lo, _, hi = row.wealth.partition("-")
        if not (int(lo) <= wealth <= int(hi or lo)): continue
        if row.styles != "*" and style not in row.styles.split(","): continue
        out.append((row, w))
    return sorted(out, key=lambda t: -t[1])


def choose(place, room, year, wealth, style, area_sq, rng):
    """What goes in: [(id, count)]. area_sq: the floor in 5 ft squares."""
    out = []
    for row, w in candidates(place, room, year, wealth, style):
        p = {3: 1.0, 2: .7, 1: .2 + .06 * wealth}[w]
        if row.family == "decor": p = min(1.0, p + .08 * (wealth - 2))
        if rng.random() > p: continue
        n = 1
        if row.id in PER_AREA and w > 1: n = max(1, int(round(area_sq / PER_AREA[row.id])))
        out.append((row.id, min(n, 12)))
    return out


def _rect_hit(r, rects):
    x0, y0, x1, y1 = r
    return any(x0 < b[2] and b[0] < x1 and y0 < b[3] and b[1] < y1 for b in rects)


def _front_rect(x, y, W, D, face, clear):
    c = clear / 5.0
    if face == "s": return (x, y + D, x + W, y + D + c)
    if face == "n": return (x, y - c, x + W, y)
    if face == "e": return (x + W, y, x + W + c, y + D)
    return (x - c, y, x, y + D)


def furnish(rec, box, place, room, wealth=2, region="moravia", rng=None, th=None, keep_clear=(), extra=()):
    """Furnish the room inside the wall lines box = (x0, y0, x1, y1) squares. keep_clear: more rects (squares) to keep
    free (a path, a hearth's floor). extra: [(id, count)] to add to the choice. Returns the list of what was placed."""
    rng = rng or rec.m.rng; year = rec.year if rec.year is not None else 1200
    era, style = V.era_of(year), V.style_of(region, year)
    x0, y0, x1, y1 = box; t = (th or 26) / 2 / 94 + .02
    ix0, iy0, ix1, iy1 = x0 + t, y0 + t, x1 - t, y1 - t                         # the floor inside the walls' faces
    area = (ix1 - ix0) * (iy1 - iy0)
    taken = list(keep_clear)
    walls = {"n": (x0, y0, x1, y0), "s": (x0, y1, x1, y1), "w": (x0, y0, x0, y1), "e": (x1, y0, x1, y1)}
    # doors and windows in these walls: their spans, and each door's swing into the room
    opens = {k: [] for k in walls}
    for p in getattr(rec, "placed", []):
        if p.spec.mount != "opening" or not p.wall: continue
        for k, ln in walls.items():
            if tuple(p.wall) == ln or _on_line(p, ln):
                door = p.spec.id.startswith("door")
                a = (p.x if k in "ns" else p.y); b = a + (p.w if k in "ns" else p.h)
                opens[k].append((a - (.15 if door else .05), b + (.15 if door else .05), door))
                if door:
                    dw = b - a
                    taken.append({"n": (a - .1, iy0, b + .1, iy0 + dw + .2), "s": (a - .1, iy1 - dw - .2, b + .1, iy1),
                                  "w": (ix0, a - .1, ix0 + dw + .2, b + .1), "e": (ix1 - dw - .2, a - .1, ix1, b + .1)}[k])
    wants = choose(place, room, year, wealth, style, area, rng) + list(extra)
    placed, record = [], []
    order = sorted(wants, key=lambda t: (CATALOGUE[t[0]].mount == "on", t[0] not in GROUPS, -_area(t[0])))
    pool = {oid: n for oid, n in order}
    for oid, n in order:
        n = pool.get(oid, 0)
        sp = spec(oid)
        for _ in range(n):
            v = V.pick(oid, era, wealth, style, rng, condition=("worn" if wealth <= 1 and rng.random() < .5 else None))
            name = sp.name[0].upper() + sp.name[1:]
            got = None
            if sp.mount == "on":
                got = _on_surface(rec, oid, v, placed, rng, name)
            elif sp.mount == "wall":
                got = _along_wall(rec, oid, v, walls, opens, (ix0, iy0, ix1, iy1), taken, rng, name, box)
            if got is None and sp.mount != "on":
                got = _in_floor(rec, oid, v, (ix0, iy0, ix1, iy1), taken, rng, name)
            if got is None: continue
            pool[oid] = pool.get(oid, 1) - 1
            placed.append(got); record.append((oid, V.label(v), (round(float(got.x), 2), round(float(got.y), 2))))
            for sat in _group(rec, got, pool, era, wealth, style, rng, taken, (ix0, iy0, ix1, iy1)):
                placed.append(sat); record.append((sat.spec.id, "with " + oid, (round(float(sat.x), 2), round(float(sat.y), 2))))
    # no bare floor: while under COVER of the floor is furnished, add more of what this room usually holds
    usual = [r.id for r, w in candidates(place, room, year, wealth, style) if w >= 2 and CATALOGUE[r.id].mount != "on" and r.id not in ONE_ONLY]
    tries = 0
    while usual and _cover(placed, area) < COVER and tries < 40:
        tries += 1; oid = usual[int(rng.integers(0, len(usual)))]; sp = spec(oid)
        v = V.pick(oid, era, wealth, style, rng); name = sp.name[0].upper() + sp.name[1:]
        got = (_along_wall(rec, oid, v, walls, opens, (ix0, iy0, ix1, iy1), taken, rng, name, box) if sp.mount == "wall" else None) or \
              _in_floor(rec, oid, v, (ix0, iy0, ix1, iy1), taken, rng, name)
        if got is not None: placed.append(got); record.append((oid, V.label(v), (round(float(got.x), 2), round(float(got.y), 2))))
    return record


COVER = .14                                                                  # a little over the bare check's tenth
ONE_ONLY = {"hearth", "fireplace", "oven", "range", "tiledstove", "bed", "throne", "altar", "font", "pulpit", "bar", "counter", "judgebench", "dock",
            "mihrab", "minbar", "torahark", "bimah", "iconostasis", "organ", "piano", "pooltable", "forge", "well", "lordchair", "bathtub", "toilet"}


def _cover(placed, area):
    return sum(p.w * p.h for p in placed if p.spec.mount != "on" and not p.spec.low) / max(area, 1e-6)


# things that stand together: an anchor and what is drawn up round it, facing it. sides: which of the anchor's sides
# take satellites (long: its two long sides; ends: its two ends; front: before its working side; around: all four)
GROUPS = {
    "table": [("bench", "long", 1), ("chair", "long", 4), ("stool", "long", 4), ("cushion", "long", 4)],
    "dininglong": [("bench", "long", 2), ("chair", "long", 8), ("lordchair", "ends", 1), ("stool", "long", 6)],
    "table-round": [("chair", "around", 4), ("stool", "around", 4), ("barstool", "around", 3)],
    "table-low": [("cushion", "around", 4), ("mat", "long", 1)],
    "cardtable": [("chair", "around", 4)],
    "coffeetable": [("sofa", "long", 1), ("armchair", "ends", 2)],
    "desk": [("chair", "front", 1), ("officechair", "front", 1)],
    "writingslope": [("stool", "front", 1)],
    "fireplace": [("armchair", "front", 2), ("rocking", "front", 1), ("settle", "front", 1)],
    "bed": [("chest", "foot", 1), ("table-small", "side", 1), ("chamberpot", "side", 1)],
    "pooltable": [],
    "altar": [("candlestand", "front", 2), ("priedieu", "front", 1)],
    "counter": [("barstool", "front", 3)],
    "bar": [("barstool", "front", 5)],
}


def _group(rec, a, pool, era, wealth, style, rng, taken, inner):
    """Draw up the anchor's satellites round it, each facing it, taking them from what was chosen for the room."""
    out = []
    for sid, sides, most in GROUPS.get(a.spec.id, []):
        have = pool.get(sid, 0)
        if have <= 0: continue
        sp = spec(sid); wf, df = sp.size(); W, D = wf / 5.0, df / 5.0
        slots = _slots(a, sides, W, D)
        k = 0
        for (x, y, face) in slots:
            if k >= min(have, most): break
            Wr, Dr = (W, D) if face in "ns" else (D, W)
            r = (x, y, x + Wr, y + Dr); ix0, iy0, ix1, iy1 = inner
            if r[0] < ix0 or r[1] < iy0 or r[2] > ix1 or r[3] > iy1 or _rect_hit(r, taken): continue
            v = V.pick(sid, era, wealth, style, rng)
            try: p = put(rec, sid, x, y, face=face, var=v, name=sp.name[0].upper() + sp.name[1:])
            except ValueError: continue
            taken.append(r); out.append(p); k += 1; pool[sid] = pool.get(sid, 1) - 1
    return out


def _slots(a, sides, W, D):
    """Places round anchor a for a W x D (squares, front to the south) satellite, each (x, y, face) facing a."""
    x0, y0, x1, y1 = a.x, a.y, a.x + a.w, a.y + a.h; gap = .04; out = []
    horiz = a.w >= a.h
    def along_x(y, face, n):
        for i in range(n): out.append((x0 + (i + .5) * (x1 - x0) / n - W / 2, y, face))
    def along_y(x, face, n):
        for i in range(n): out.append((x, y0 + (i + .5) * (y1 - y0) / n - W / 2, face))
    if sides in ("long", "around"):
        if horiz:
            n = max(1, int((x1 - x0) / (W + .1)))
            along_x(y0 - D - gap, "s", n); along_x(y1 + gap, "n", n)
        else:
            n = max(1, int((y1 - y0) / (W + .1)))
            along_y(x0 - D - gap, "e", n); along_y(x1 + gap, "w", n)
    if sides in ("ends", "around"):
        if horiz: out.append((x0 - D - gap, (y0 + y1) / 2 - W / 2, "e")); out.append((x1 + gap, (y0 + y1) / 2 - W / 2, "w"))
        else: out.append(((x0 + x1) / 2 - W / 2, y0 - D - gap, "s")); out.append(((x0 + x1) / 2 - W / 2, y1 + gap, "n"))
    if sides in ("front", "foot", "side"):
        f = a.face; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; off = .35 if sides == "front" else .04
        back = {"s": "n", "n": "s", "e": "w", "w": "e"}[f]
        if sides == "side":
            if f in "ns": out += [(x0 - W - gap, cy - D / 2, f), (x1 + gap, cy - D / 2, f)]
            else: out += [(cx - W / 2, y0 - W - gap, f), (cx - W / 2, y1 + gap, f)]
        else:
            n = 2 if sides == "front" else 1
            for i in range(n):
                t = (i + .5) / n
                if f == "s": out.append((x0 + t * (x1 - x0) - W / 2, y1 + off, back))
                elif f == "n": out.append((x0 + t * (x1 - x0) - W / 2, y0 - off - D, back))
                elif f == "e": out.append((x1 + off, y0 + t * (y1 - y0) - W / 2, back))
                else: out.append((x0 - off - D, y0 + t * (y1 - y0) - W / 2, back))
    return out


def _area(oid):
    w, d = spec(oid).size(); return w * d


def _on_line(p, ln):
    a, b, c, d = ln
    if abs(b - d) < 1e-6: return abs(p.y - b) < .3 and a - 1e-6 <= p.x <= c + 1e-6 and p.h < .5
    return abs(p.x - a) < .3 and b - 1e-6 <= p.y <= d + 1e-6 and p.w < .5


def _along_wall(rec, oid, v, walls, opens, inner, taken, rng, name, box):
    sp = spec(oid); W, D = (s / 5.0 for s in sp.size()); ix0, iy0, ix1, iy1 = inner; cx, cy = (ix0 + ix1) / 2, (iy0 + iy1) / 2
    sides = list(walls); rng.shuffle(sides)
    for k in sides:
        if not _has_wall(rec, walls[k]): continue
        lo, hi = (ix0, ix1) if k in "ns" else (iy0, iy1)
        blocked = [(a, b) for a, b, door in opens[k] if door or oid in TALL]
        steps = np.arange(lo + W / 2 + .05, hi - W / 2 - .05 + 1e-6, .1)
        if not len(steps): continue
        rng.shuffle(steps)
        for at in steps:
            if any(at + W / 2 > a and at - W / 2 < b for a, b in blocked): continue
            fx, fy, face = _wall_rect(k, at, W, D, sp, inner)
            r = (fx, fy, fx + (W if k in "ns" else D), fy + (D if k in "ns" else W))
            fr = _front_rect(r[0], r[1], r[2] - r[0], r[3] - r[1], face, sp.clear if sp.front else 0)
            if _rect_hit(r, taken) or (sp.front and _rect_hit(fr, taken)): continue
            if fr[0] < ix0 - 1e-6 or fr[2] > ix1 + 1e-6 or fr[1] < iy0 - 1e-6 or fr[3] > iy1 + 1e-6: continue
            try: p = by_wall(rec, oid, walls[k], float(at), (cx, cy), var=v, name=name)
            except ValueError: return None
            taken.append((p.x, p.y, p.x + p.w, p.y + p.h))
            if sp.front: taken.append(_front_rect(p.x, p.y, p.w, p.h, p.face, sp.clear))
            return p
    return None


def _wall_rect(k, at, W, D, sp, inner):
    ix0, iy0, ix1, iy1 = inner; g = sp.back / 5.0 + 5 / 94
    if k == "n": return at - W / 2, iy0 + g, "s"
    if k == "s": return at - W / 2, iy1 - g - D, "n"
    if k == "w": return ix0 + g, at - W / 2, "e"
    return ix1 - g - D, at - W / 2, "w"


def _has_wall(rec, ln):
    a, b, c, d = ln
    for (p, q, r, s) in rec.walls:
        if abs(b - d) < 1e-6 and abs(q - s) < 1e-6 and abs(q - b) < 1e-6 and min(p, r) <= a + 1e-6 and max(p, r) >= c - 1e-6: return True
        if abs(a - c) < 1e-6 and abs(p - r) < 1e-6 and abs(p - a) < 1e-6 and min(q, s) <= b + 1e-6 and max(q, s) >= d - 1e-6: return True
    return False


def _in_floor(rec, oid, v, inner, taken, rng, name):
    sp = spec(oid); ix0, iy0, ix1, iy1 = inner; cx, cy = (ix0 + ix1) / 2, (iy0 + iy1) / 2
    wf, df = sp.size(); W, D = wf / 5.0, df / 5.0
    cands = []
    for x in np.arange(ix0 + .1, ix1 - .1, .1):
        for y in np.arange(iy0 + .1, iy1 - .1, .1): cands.append((x, y))
    central = sp.mount == "centre" or oid in ("table", "dininglong", "table-round", "hearth", "rug")
    anchors = [p for p in getattr(rec, "placed", []) if p.spec.id in GROUPS and p.spec.mount != "opening"] if oid in SEATS else []
    def near(p):                                          # the anchor a seat turns to, and how far off it would sit
        best = None
        for a in anchors:
            ax, ay = a.x + a.w / 2, a.y + a.h / 2
            dx = max(a.x - p[0], 0, p[0] - (a.x + a.w)); dy = max(a.y - p[1], 0, p[1] - (a.y + a.h))
            dd = math.hypot(dx, dy)
            if best is None or dd < best[0]: best = (dd, ax, ay)
        return best
    if central: cands.sort(key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
    elif anchors: cands.sort(key=lambda p: abs(near(p)[0] - (.35 + max(W, D) / 2)) + rng.random() * .05)
    else: rng.shuffle(cands)
    for x, y in cands[:4000]:
        tx, ty = (near((x, y))[1:] if anchors else (cx, cy))
        dx, dy = tx - x, ty - y
        face = ("s" if dy > 0 else "n") if abs(dy) >= abs(dx) else ("e" if dx > 0 else "w")
        if not sp.front: face = "s"
        Wr, Dr = (W, D) if face in "ns" else (D, W)
        X, Y = x - Wr / 2, y - Dr / 2
        r = (X, Y, X + Wr, Y + Dr)
        if r[0] < ix0 + .05 or r[1] < iy0 + .05 or r[2] > ix1 - .05 or r[3] > iy1 - .05: continue
        if not sp.low and _rect_hit(r, taken): continue
        fr = _front_rect(X, Y, Wr, Dr, face, sp.clear) if sp.front else None
        if fr and (_rect_hit(fr, taken) or fr[0] < ix0 or fr[2] > ix1 or fr[1] < iy0 or fr[3] > iy1): continue
        try: p = put(rec, oid, X, Y, face=face, var=v, name=name)
        except ValueError: return None
        if not sp.low: taken.append(r)
        if fr: taken.append(fr)
        return p
    return None


def _on_surface(rec, oid, v, placed, rng, name):
    tops = [p for p in placed if p.spec.id in SURFACES]
    if not tops: return None
    rng.shuffle(tops)
    wf, df = spec(oid).size(); W, D = wf / 5.0, df / 5.0
    for t in tops:
        used = getattr(t, "_used", []); t._used = used
        for _ in range(12):
            x = t.x + .04 + rng.random() * max(0, t.w - W - .08); y = t.y + .04 + rng.random() * max(0, t.h - D - .08)
            r = (x, y, x + W, y + D)
            if _rect_hit(r, used): continue
            try: p = put(rec, oid, x, y, var=v, name=name, on=t)
            except ValueError: return None
            used.append(r); return p
    return None
