"""WoDX pixel map drawer: the object library's machinery (B6330-B6336).

Every object a map may hold is defined once, in catalogue.py, as a Spec: its true size in feet, which side is its front
and how much room it needs there, how it stands against a wall, the years and lands it belongs to, the rooms and
trades it serves, and the drawing of it seen from straight above with its front toward the south. A map places
objects only through put() and by_wall(); each placement is drawn from that one drawing, turned to its facing, and
remembered with the exact pixels it covers so checks.py can test it against the walls, the doors and the other
objects when the map is finished.

Sizes: a square is 5 ft and 94 pixels (px.T)."""
import math
from dataclasses import dataclass, field

import numpy as np
from PIL import Image

import props as pr
from px import T, Map

FT = T / 5.0                                     # pixels to a foot
FACES = "senw"                                   # quarter turns counter-clockwise from south: s=0, e=1, n=2, w=3
YEAR_END = 2200                                  # the far end of the World of Future Darkness


@dataclass
class Spec:
    id: str
    name: str                                    # what a player would call it
    group: str                                   # furniture, fitting, opening, hearth, trade, container, goods, outdoor, plant, vehicle, church
    ft: tuple                                    # (along the front, depth) in feet; ranges allowed: ((min, max), (min, max))
    draw: object = None                          # draw(tm, x, y, w, h, state, var): squares box, front toward the south (y + h)
    front: bool = False                          # has a front or a working side (an oven's mouth, a bed's foot)
    clear: float = 0.0                           # feet that must stay free in front of it
    back: float = 0.0                            # feet left between its back and the wall (a chest's lid needs room to open)
    mount: str = "floor"                         # floor, wall (back to a wall face), opening (in a wall), on (on another object), ground (open land)
    low: bool = False                            # lies flat on the floor (a rug, straw): others may stand on it
    eras: tuple = (1197, YEAR_END)
    regions: tuple = ("all",)                    # land tags (central-europe, mediterranean, steppe ...) or all
    tags: tuple = ()                             # rooms and trades it belongs in: home, kitchen, store, smith, stable, street, wood ...
    states: tuple = ("one",)                     # ("closed", "open") for anything that opens
    openable: str = None                         # scene.CONTAINER kind (chest, barrel, crate, sack) when it opens
    light: dict = None                           # a light it gives: {"dim", "bright", "color", "kind"}
    native: str = "s"                            # which way the drawing's front points as drawn (turned to south first)
    ref: str = ""                                # where the size comes from
    variants: dict = field(default_factory=dict) # var name -> dict of draw options; first is the default
    looks: tuple = ()                            # ((from year, to year, label, draw options), ...): how it looks in each age
    axes: dict = field(default_factory=dict)     # variation axes the drawing honours (variants.py): material, colour, contents ...
    nvar: int = 0                                # variations wanted in each era beyond the minimum of ten
    global_from: int = None                      # from this year the thing looks the same the world over (a server rack, a photocopier): no regional styles, its variations come from its makes, models, loads and wear

    def look(self, year):
        """The draw options for a year: the look whose years hold it (the first look when no year is set)."""
        if not self.looks: return {}
        if year is None: return dict(self.looks[0][3])
        for y0, y1, _, v in self.looks:
            if y0 <= year <= y1: return dict(v)
        raise ValueError(f"{self.id} ({self.name}) has no look for {year}: it belongs to {self.eras[0]} to {self.eras[1]}")

    def size(self, w=None, d=None):
        """(along, depth) in feet: the default, or the given ones checked against the allowed range."""
        out = []
        for k, (given, rng) in enumerate(((w, self.ft[0]), (d, self.ft[1]))):
            lo, hi = rng if isinstance(rng, tuple) else (rng * .9, rng * 1.1)
            v = given if given is not None else (rng if not isinstance(rng, tuple) else (lo + hi) / 2)
            if not (lo - 1e-6 <= v <= hi + 1e-6):
                raise ValueError(f"{self.id}: {('length', 'depth')[k]} {v:.2f} ft is outside its true size {lo:.2f} to {hi:.2f} ft")
            out.append(v)
        return tuple(out)


CATALOGUE = {}


def add(id, name, group, ft, draw, **kw):
    if id in CATALOGUE: raise ValueError(f"object {id} defined twice")
    CATALOGUE[id] = Spec(id, name, group, ft, draw, **kw); return CATALOGUE[id]


OWNERS, CLASHES = {}, {}                                      # which family module drew each object; objects two modules drew


def define(id, name=None, group=None, ft=None, draw=None, **kw):
    """Define or redefine an object (the family modules, B6346). An object already in the catalogue keeps every field
    not given; a new one takes its name, size and family from the census when they are not given (its usual size,
    15 percent either way). Two family modules defining the same object is recorded in OWNERS clashes (a test fails)."""
    import inspect
    mod = inspect.stack()[1].frame.f_globals.get("__name__", "")
    if mod.startswith("library.fam_") or mod.startswith("fam_"):
        prev = OWNERS.setdefault(id, mod)
        if prev != mod: CLASHES.setdefault(id, {prev}).add(mod)
    if id in CATALOGUE:
        sp = CATALOGUE[id]
        for k, v in dict(name=name, group=group, ft=ft, draw=draw, **kw).items():
            if v is not None: setattr(sp, k, v)
        return sp
    from library.census import CENSUS
    row = next((r for r in CENSUS if r.id == id), None)
    if row is None and (name is None or ft is None): raise KeyError(f"{id} is not in the census (library/census.py): add it there first")
    if ft is None:
        a, b = (float(t) for t in row.size.split("x"))
        ft = ((round(a * .85, 2), round(a * 1.15, 2)), (round(b * .85, 2), round(b * 1.15, 2)))
    if row is not None:
        kw.setdefault("mount", {"outdoor": "ground", "centre": "floor", "ceiling": "on"}.get(row.mount, row.mount))
        ya, _, yb = row.years.partition("-"); kw.setdefault("eras", (int(ya) if ya else 1197, int(yb) if yb else YEAR_END))
    return add(id, name or row.name, group or (row.family if row else "furniture"), ft, draw, **kw)


def spec(oid):
    if oid not in CATALOGUE: raise KeyError(f"{oid} is not in the object library (tools/pixelmap/library/catalogue.py)")
    return CATALOGUE[oid]


# ---------------------------------------------------------------- drawing one object
def _steps(native, face): return (FACES.index(face) - FACES.index(native)) % 4


def _turn_pt(u, v, k):
    for _ in range(k): u, v = v, -u                          # a quarter turn counter-clockwise on the picture (y down)
    return u, v


BG_A, BG_B = np.array([214, 206, 196], np.float32), np.array([70, 66, 64], np.float32)


def _draw_on(sp, bg, lw, lh, state, var, seed, margin):
    tm = Map(int(math.ceil(lw)) + 2 * margin + 1, int(math.ceil(lh)) + 2 * margin + 1, seed=1)
    tm.rng = np.random.default_rng(seed)
    tm.img.paste(tuple(int(v) for v in bg), (0, 0, tm.img.size[0], tm.img.size[1]))
    old = pr.REC; pr.REC = None
    try: sp.draw(tm, margin, margin, lw, lh, state, dict(var))
    finally: pr.REC = old
    return tm


def render(sp, face, w_ft, d_ft, state="one", var=None, seed=7, margin=1):
    """Draw one object and turn it to face `face`. It is drawn twice, on a light and on a dark scratch floor: where
    the two agree is the object itself; elsewhere what it did to the floor (its shadow, the light of its fire) is
    kept as a factor to lay on the real floor. Returns a dict: rgb (H x W x 3 uint8), body (True on the object),
    mult (H x W x 3 factor on the floor elsewhere), pad (pixels round the footprint), fw, fh (footprint in squares
    after turning), hearths (glows, relative to the crop's centre)."""
    var = dict(var or {}); W, D = w_ft / 5.0, d_ft / 5.0
    cond = var.get("condition", "new"); var["condition"] = "new"  # drawn sound; wear is one shared layer (below)
    if not isinstance(seed, (int, np.integer)): seed = int(seed.integers(1, 1 << 30))
    lw, lh = (W, D) if sp.native in "ns" else (D, W)
    ta = _draw_on(sp, BG_A, lw, lh, state, var, seed, margin); tb = _draw_on(sp, BG_B, lw, lh, state, var, seed, margin)
    pad = int(T * .45)
    X0, Y0, X1, Y1 = int(margin * T) - pad, int(margin * T) - pad, int(round((margin + lw) * T)) + pad, int(round((margin + lh) * T)) + pad
    k = _steps(sp.native, face); rot = (None, Image.ROTATE_90, Image.ROTATE_180, Image.ROTATE_270)[k]
    ca, cb = ta.img.crop((X0, Y0, X1, Y1)), tb.img.crop((X0, Y0, X1, Y1))
    if rot is not None: ca, cb = ca.transpose(rot), cb.transpose(rot)
    a = np.asarray(ca).astype(np.float32); b = np.asarray(cb).astype(np.float32)
    body = np.abs(a - b).sum(2) < 14
    mult = np.clip(a / BG_A, 0, 1.8); mult[body] = 1.0
    cx0, cy0 = (X0 + X1) / 2, (Y0 + Y1) / 2; glows = []
    for hx, hy, hr, cone in getattr(ta, "hearths", []):
        u, v = _turn_pt(hx - cx0, hy - cy0, k); t = -k * math.pi / 2
        glows.append((u, v, hr, (cone[0] + t, cone[1]) if cone else None))
    if cond in ("worn", "damaged", "broken"): a, body, mult = wear_layer(a, body, mult, cond, seed)
    if cond == "broken": glows = []  # a heap of rubble gives no light
    fw, fh = (W, D) if face in "ns" else (D, W)
    return {"rgb": a.astype(np.uint8), "body": body, "mult": mult, "pad": pad, "fw": fw, "fh": fh, "hearths": glows}


def wear_layer(a, body, mult, cond, seed=7):
    """The one damaged and broken look every object shares (the owner, 2026-11-15: "add a crack over items that are
    damaged and show a pile of rubble for things that are broken"). Damaged ("worn" or "damaged"): one clear crack
    across the object, the same shape on everything, scaled to it. Broken: the object is gone, and a pile of rubble
    in its own colours lies where it stood."""
    a = a.copy(); body = body.copy(); mult = mult.copy()
    ys, xs = np.nonzero(body)
    if not len(xs): return a, body, mult
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); w, h = x1 - x0 + 1, y1 - y0 + 1
    H, W = body.shape
    if cond in ("worn", "damaged"):
        # a jagged crack from the upper left to the lower right, through the middle, with a lit edge below it
        pts = [(.18, .22), (.34, .38), (.30, .50), (.50, .58), (.62, .74), (.80, .80)]
        th = 1 if min(w, h) < 24 else 2
        for (u0, v0), (u1, v1) in zip(pts, pts[1:]):
            n = int(max(abs(u1 - u0) * w, abs(v1 - v0) * h)) + 1
            for t in np.linspace(0, 1, n):
                cx = int(x0 + (u0 + (u1 - u0) * t) * w); cy = int(y0 + (v0 + (v1 - v0) * t) * h)
                for d in range(th):
                    if 0 <= cy + d < H and 0 <= cx < W and body[cy + d, cx]: a[cy + d, cx] = (28, 22, 20)
                if 0 <= cy + th < H and 0 <= cx < W and body[cy + th, cx]: a[cy + th, cx] = np.minimum(a[cy + th, cx] * 1.25 + 18, 255)
        return a, body, mult
    # broken: a pile of rubble in the object's own colours, lower and smaller than the object was
    cols = a[body]; order = cols.mean(1).argsort(); ramp = [cols[order[int(q * (len(order) - 1))]] for q in (.15, .35, .55, .75)]
    body[:] = False; mult[:] = 1.0
    rng = np.random.default_rng(seed); cx, cy = x0 + w / 2, y0 + h / 2
    rx, ry = max(4, w * .38), max(4, h * .34)
    n = int(np.clip(w * h / 25, 14, 160))
    for k in range(n):
        ang = rng.uniform(0, 2 * np.pi); r = np.sqrt(rng.uniform(0, 1))
        px, py = cx + np.cos(ang) * rx * r, cy + np.sin(ang) * ry * r
        s = max(2, int((1.3 - r) * min(w, h) / 7)); c = ramp[min(3, int(rng.integers(0, 3) + (1 - r) * 1.5))]
        for dy in range(-s, s + 1):
            for dx in range(-s, s + 1):
                if abs(dx) + abs(dy) * 1.3 > s * 1.4: continue
                yy, xx = int(py + dy), int(px + dx)
                if 0 <= yy < H and 0 <= xx < W:
                    shade = 1.15 if (dx < 0 and dy < 0) else (0.75 if (dx > 0 and dy > 0) else 1.0)
                    a[yy, xx] = np.clip(c * shade, 0, 255); body[yy, xx] = True
    edge = body & ~np.roll(body, 1, 0) | body & ~np.roll(body, -1, 0) | body & ~np.roll(body, 1, 1) | body & ~np.roll(body, -1, 1)
    a[edge] *= 0.55
    sh = np.zeros_like(body); sh[3:, 3:] = body[:-3, :-3]; sh &= ~body; mult[sh] = np.minimum(mult[sh], 0.72)
    return a, body, mult


def blend(floor, r):
    """The object laid on a floor picture of its crop's size (float array): itself where it is, its shadow elsewhere."""
    return np.where(r["body"][..., None], r["rgb"].astype(np.float32), floor * r["mult"])


def composite(m, r, x, y):
    """Lay a rendered object on the map with its footprint's top-left corner at (x, y) squares."""
    pad = r["pad"]; dx, dy = int(round(x * T)) - pad, int(round(y * T)) - pad; Hh, Ww = r["rgb"].shape[:2]
    dst = np.asarray(m.img).astype(np.float32)
    sy0, sx0 = max(0, -dy), max(0, -dx); ey, ex = min(Hh, dst.shape[0] - dy), min(Ww, dst.shape[1] - dx)
    if ey <= sy0 or ex <= sx0: return
    sub = {k_: (v[sy0:ey, sx0:ex] if isinstance(v, np.ndarray) else v) for k_, v in r.items()}
    dst[dy + sy0:dy + ey, dx + sx0:dx + ex] = blend(dst[dy + sy0:dy + ey, dx + sx0:dx + ex], sub)
    m.img.paste(Image.fromarray(dst.clip(0, 255).astype(np.uint8)), (0, 0))
    ox, oy = dx + Ww / 2, dy + Hh / 2
    for u, v, hr, cone in r["hearths"]: m.hearths = getattr(m, "hearths", []) + [(ox + u, oy + v, hr, cone)]


# ---------------------------------------------------------------- placing
@dataclass
class Placed:
    spec: Spec
    x: float                                     # footprint, squares
    y: float
    w: float
    h: float
    face: str
    name: str
    on: object = None                            # the Placed it stands on
    masks: dict = field(default_factory=dict)    # state -> (body bool array, px x0, px y0)
    wall: tuple = None                           # the wall line it was set against


def _placed(rec):
    if not hasattr(rec, "placed"): rec.placed = []
    return rec.placed


def put(rec, oid, x, y, face="s", state=None, name=None, var=None, w=None, d=None, on=None, wall=None):
    """Place one library object with the top-left corner of its footprint at (x, y) squares, its front toward face.
    w and d (feet) choose a size inside the object's true range. on: the Placed it stands on (a jug on a table).
    Anything that opens becomes an openable (a picture for each state). Returns the Placed."""
    sp = spec(oid)
    if face not in FACES: raise ValueError(f"{oid}: face must be one of n, s, e, w")
    if sp.mount == "opening": raise ValueError(f"{oid} goes in a wall: use library.door() or library.window()")
    wf, df = sp.size(w, d); m = rec.m
    yr = getattr(rec, "year", None)
    if yr is not None and not (sp.eras[0] <= yr <= sp.eras[1]):
        raise ValueError(f"{oid} ({sp.name}) belongs to {sp.eras[0]} to {sp.eras[1]}, not to this map's year {yr}")
    v = sp.look(yr)
    v.update(next(iter(sp.variants.values())) if sp.variants else {})
    if isinstance(var, str):
        if var not in sp.variants: raise KeyError(f"{oid} has no variant {var} (has {', '.join(sp.variants)})")
        v.update(sp.variants[var])
    elif var: v.update(var)
    seed = int(m.rng.integers(1, 1 << 30)); shots = {}
    for st in sp.states:
        shots[st] = render(sp, face, wf, df, st, v, seed)
    r0 = shots[sp.states[0]]
    p = Placed(sp, x, y, r0["fw"], r0["fh"], face, name or sp.name, on=on, wall=wall)
    for st, r in shots.items(): p.masks[st] = (r["body"], int(round(x * T)) - r["pad"], int(round(y * T)) - r["pad"])
    _placed(rec).append(p)
    if getattr(m, "_occ", None) is not None:                                    # dress.py's occupancy grid, when it is in use
        C = 12; m._occ[max(0, int(y * T) // C):int((y + p.h) * T) // C + 1, max(0, int(x * T) // C):int((x + p.w) * T) // C + 1] = True
    if sp.openable and len(sp.states) > 1:
        pad = r0["pad"]; H_, W_ = r0["rgb"].shape[:2]; bx, by = int(round(x * T)) - pad, int(round(y * T)) - pad
        def draw(state=None, _s=shots, _x=x, _y=y):
            composite(m, _s.get(state, _s[sp.states[0]]), _x, _y)
        rec.openable(sp.openable, (bx, by, bx + W_, by + H_), draw, name=p.name)
    else:
        composite(m, r0, x, y); rec.note(p.name, x + p.w / 2, y + p.h / 2)
    if sp.light:
        L = sp.light; rec.light(p.name, p.name, (x, y, p.w, p.h), dim=L.get("dim", 4), bright=L.get("bright", 1.5), color=L.get("color", "#ff9a40"), kind=L.get("kind", "fire"))
    return p


def wall_th(rec, line):
    """The thickness (pixels) of the recorded wall that holds this line, else 26."""
    x0, y0, x1, y1 = line
    for (a, b, c, d_), th in zip(rec.walls, getattr(rec, "wall_th", [26] * len(rec.walls))):
        if abs(a - c) < 1e-6 and abs(x0 - a) < 1e-6 and abs(x1 - a) < 1e-6 and min(b, d_) - 1e-6 <= min(y0, y1) and max(y0, y1) <= max(b, d_) + 1e-6: return th
        if abs(b - d_) < 1e-6 and abs(y0 - b) < 1e-6 and abs(y1 - b) < 1e-6 and min(a, c) - 1e-6 <= min(x0, x1) and max(x0, x1) <= max(a, c) + 1e-6: return th
    return 26


def by_wall(rec, oid, line, at, toward, gap=None, **kw):
    """Set an object with its back to a wall and its front to the room. line: the wall's middle line (x0, y0, x1, y1)
    in squares, as given to rec.wall; at: where along the wall its middle goes (squares, x for a wall running east-west,
    y for one running north-south); toward: a point (x, y) in the room it serves, which tells the side. The back sits
    `gap` feet (the object's own back room if not given) off the wall's face, never in it."""
    sp = spec(oid); x0, y0, x1, y1 = line; th = wall_th(rec, line) / T; horiz = abs(y0 - y1) < 1e-6
    wf, df = sp.size(kw.get("w"), kw.get("d")); W, D = wf / 5.0, df / 5.0
    g = (sp.back if gap is None else gap) / 5.0 + 5 / T                          # a hand's breadth off the wall face
    if horiz:
        side = 1 if toward[1] > y0 else -1; face = "s" if side > 0 else "n"
        y = y0 + th / 2 + g if side > 0 else y0 - th / 2 - g - D
        x = at - W / 2
    else:
        side = 1 if toward[0] > x0 else -1; face = "e" if side > 0 else "w"
        x = x0 + th / 2 + g if side > 0 else x0 - th / 2 - g - D
        y = at - W / 2
    return put(rec, oid, x, y, face=face, wall=tuple(line), **kw)


def _centre(rec, line, toward):
    return toward if toward else (rec.cells[0] / 2, rec.cells[1] / 2)


def _look(rec, kind, wealth, style, condition, era):
    """The look of a door or window (props.door_kind, props.window_kind): its era from `era` or the map's year, its
    household's wealth and style from the arguments or the recorder (rec.wealth, rec.style), its condition, and a kind
    to choose one outright. None when nothing is known: the plain plank door and casement window."""
    yr = getattr(rec, "year", None)
    look = {"kind": kind, "wealth": wealth if wealth is not None else getattr(rec, "wealth", None),
            "style": style or getattr(rec, "style", None), "condition": condition or "new"}
    if era is None and yr is not None:
        from library.variants import era_of
        era = era_of(yr)
    if era is None and not any(v for k, v in look.items() if k != "condition") and look["condition"] == "new": return None
    look["era"] = era or "dark-ages"
    return look


def door(rec, line, at, width=1.0, toward=None, exterior=False, swing=-1, hinge="a", name=None, oid=None,
         kind=None, wealth=None, style=None, condition=None, era=None):
    """A door in a recorded wall: its opening `width` squares wide centred at `at` along the wall line, drawn at the
    wall's own thickness so its frame fills the wall exactly. toward: a point inside the room (the door's inner side).
    kind (props.DOOR_KINDS: plank, ironbound, panelled, glazed, flush, steel, sliding, sealed), wealth (0 to 5),
    style (a census style family), condition (new, worn, broken) and era (a census era key; the map's year when not
    given) choose how it looks; left out, a door of the map's age and a middling household."""
    sp = spec(oid or ("door-outer" if exterior else "door-inner")); x0, y0, x1, y1 = line; horiz = abs(y0 - y1) < 1e-6; th = wall_th(rec, line)
    c = (at - width / 2, y0, at + width / 2, y0) if horiz else (x0, at - width / 2, x0, at + width / 2)
    pr.door(rec.m, *c, th=th, centre=_centre(rec, line, toward), swing=swing, hinge=hinge, exterior=exterior, name=name or sp.name,
            look=_look(rec, kind, wealth, style, condition, era))
    _placed(rec).append(Placed(sp, min(c[0], c[2]), min(c[1], c[3]), abs(c[2] - c[0]), abs(c[3] - c[1]), "s", name or sp.name, wall=tuple(line)))


def window(rec, line, at, width=1.0, toward=None, glass=None, name=None, oid=None,
           kind=None, wealth=None, style=None, condition=None, era=None):
    """A window in a recorded wall, at the wall's own thickness, its shutters folded back along the outside face.
    glass: None takes it from the map's year (rec.year) and the library's windows. kind (props.WINDOW_KINDS: open,
    cloth, horn, leaded, glazed, sash, steel, plate, paper, jali, sealed), wealth, style, condition and era choose how it
    looks, as for door(); windows without shutters draw a blind inside the glass when shut."""
    if oid is None:
        yr = getattr(rec, "year", None)
        oid = "window-glazed" if (glass if glass is not None else (yr is not None and yr >= 1500)) else "window-shuttered"
    sp = spec(oid); x0, y0, x1, y1 = line; horiz = abs(y0 - y1) < 1e-6; th = wall_th(rec, line)
    c = (at - width / 2, y0, at + width / 2, y0) if horiz else (x0, at - width / 2, x0, at + width / 2)
    pr.window(rec.m, *c, th=th, centre=_centre(rec, line, toward), glass=oid == "window-glazed", name=name or sp.name,
              look=_look(rec, kind, wealth, style, condition, era))
    _placed(rec).append(Placed(sp, min(c[0], c[2]), min(c[1], c[3]), abs(c[2] - c[0]), abs(c[3] - c[1]), "s", name or sp.name, wall=tuple(line)))
