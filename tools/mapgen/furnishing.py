"""Filling rooms: Dwarf Fortress's room value with Cataclysm's palettes and set pieces.

A room's value is the total worth of what is in it. Its tier (meagre, plain, decent, fine, grand, royal) comes from
that value against thresholds for its kind of room, scaled by age (rooms of the 1890s are crowded, a 1197 hall bare).
Each room gets a target tier from its role, the building's side purposes and the owner's wealth; set pieces from the
building's palette are added until the room reaches it, or is full (its doorways and walkways stay clear, and a share
of its floor stays open). The type's own furniture (room.items, which the WoDX file reads) is kept, and drawn with
the palette's assets of the same piece ("draw").

Dressing has its own random generator (from the room's name and place), so it never moves the furniture or the
WoDX file; it goes in room.dressing and room.lights, as before."""
import math
import random
import re

import catalogue as K
import ddcore as C
import palettes as PAL
import purposes as U
import setpieces as SP

TIERS = ["meagre", "plain", "decent", "fine", "grand", "royal"]
BASE = [0, 6, 14, 24, 36, 50]
KIND_SCALE = {"hall": 1.0, "sleep": .7, "study": .8, "kitchen": .6, "store": .4, "shop": .9, "tavern": .9, "worship": 1.2,
              "cell": .3, "bath": .4, "ward": .7, "passage": .4, "work": .6, "outdoor": .3}
BAND_SCALE = {"medieval": .6, "early": .8, "reform": 1.0, "industrial": 1.3, "republic": 1.0, "socialist": .8, "modern": .8, "future": .9}
WEALTH_TIER = {"poor": 1, "middling": 2, "rich": 3, "noble": 4}
LIGHT_RANGE = {"rushlight": 2, "candle": 3, "oil": 4, "gas": 5, "electric": 6}
FULL = {"store": .8, "outdoor": .15}           # share of a room's floor that pieces may cover; the rest .55
FULL_DEFAULT = .55
NO_FILL = {"passage"}
DENSE, COVER = 1.6, .25      # lived in: a piece or a thing on it for every 1.6 squares of floor, furniture on a quarter of it


def thresholds(kind, band):
    f = KIND_SCALE.get(kind, .8) * BAND_SCALE.get(band, 1.0)
    return [round(b * f) for b in BASE]


def tier_of(value, kind, band):
    t = thresholds(kind, band)
    return TIERS[max(i for i, v in enumerate(t) if value >= v)]


def target_tier(role, wealth, lifts, show_off, band, kind):
    n = WEALTH_TIER.get(wealth, 2)
    if role == "front": n += lifts
    if role == "service": n -= 1
    if show_off and wealth == "poor":
        if role == "front": n += 1
        if role == "private": n -= 1
    return TIERS[max(0, min(5, n))]


def room_value(room, palette):
    things = list(room.items) + [d for d in getattr(room, "dressing", []) if d.get("layer", 100) in (50, 100, 150, 400)]
    return sum(palette.worth(i.get("draw", i["asset"])) for i in things)


def context_for(b, year, region, wealth, trade, catalogue, seed=0):
    """Per-room furnishing contexts for a placed building: one palette for all its rooms, roles, lifts."""
    t = getattr(b, "type_key", None) or getattr(b, "type", None)
    tdef = getattr(b, "t", None) or {}
    purpose = U.purpose_of(t, tdef.get("fill", "home"))
    rng = random.Random(f"{seed}|{getattr(b, 'key', '')}|{year}|{wealth}")
    pal = PAL.choose(year, region, wealth, rng, catalogue)
    roles = U.room_roles(b)
    out = {}
    for r in b.rooms:
        lifts = sum(s["steps"] for s in purpose["side"] if re.search(s["lifts"], r.name))
        prefers = [p for s in purpose["side"] if re.search(s["lifts"], r.name) for p in s["prefers"]]
        out[r.name] = {"palette": pal, "role": roles[r.name], "wealth": wealth, "trade": trade, "band": pal.key[0], "lifts": lifts,
                       "show_off": purpose["show_off"], "prefers": prefers,
                       "open_floor": bool(purpose["open_floor"] and re.search(purpose["open_floor"], r.name))}
    return out


def _frame(x, y, W, H, side, part):
    """A set piece part (dx, dy, w, h in the piece's frame, wall at the top) placed in the room at x, y."""
    dx, dy, pw, ph = part
    if side == "N": return (x + dx, y + dy, pw, ph)
    if side == "S": return (x + W - dx - pw, y + H - dy - ph, pw, ph)
    if side == "W": return (x + dy, y + dx, ph, pw)
    if side == "E": return (x + H - dy - ph, y + dx, ph, pw)
    if side == "NE": return (x + W - dx - pw, y + dy, pw, ph)
    if side == "SW": return (x + dx, y + H - dy - ph, pw, ph)
    return (x + dx, y + dy, pw, ph)


def _side(room, x, y, w, h, place, rot):
    t = room.touching(x, y, w, h)
    if place == "corner":
        return {(True, True): "N", (True, False): "NE"}.get((t["N"], t["W"]), "SW" if t["W"] else "S")
    if place == "centre": return "W" if rot else "N"
    if rot: return "W" if t["W"] else "E"
    return "N" if t["N"] else "S"


def _drawn(entry, rect, piece, layer=100):
    """An item for a catalogue entry fitted into rect (x, y, w, h)."""
    x, y, w, h = rect
    aw, ah = entry["cells"]
    rot = 1 if aw != ah and (w > h) != (aw > ah) else 0
    ew, eh = (ah, aw) if rot else (aw, ah)
    sc = min(1.0, min(w / ew, h / eh))                    # never drawn past its own size, nor past its spot
    if sc < .5: return None                                 # a three-square bench squeezed into one square: not this one
    return {"asset": entry["path"], "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": round(sc, 3), "layer": layer, "piece": piece}


def _place(room, sp, pal, R):
    """Try one set piece; returns the items placed (base first), or [] when its base will not go."""
    W, H = sp["size"]
    base = next(p for p in sp["parts"] if p[5] == "base")
    entry = pal.pick(base[0], R)
    if not entry: return []
    if W > room.iw + 1e-6 and W > room.ih + 1e-6: return []
    rules = {"wall": ["wall"], "corner": ["corner", "wall"], "centre": ["centre"]}[sp["place"]]
    sizes = [1, .75] if W * H <= 2 else [1]                     # a small piece may shrink to fit between walkways
    cands, k = [], 1
    for k in sizes:
        cands = next((c for c in (room.candidates(W * k, H * k, r) for r in rules) if c), [])
        if cands: break
    if not cands: return []
    if k != 1:
        W, H = W * k, H * k
        sp = dict(sp, parts=[(p, dx * k, dy * k, pw * k, ph * k, r) for p, dx, dy, pw, ph, r in sp["parts"]])
    _, x, y, w, h, rot = cands[0]
    side = _side(room, x, y, w, h, sp["place"], rot)
    placed, base_item = [], None
    for piece, dx, dy, pw, ph, prule in sp["parts"]:
        if prule.startswith("on:"):
            if base_item is None: continue
            e = pal.pick(piece, R)
            if not e: continue
            b = base_item
            it = {"asset": e["path"], "x": b["x"] + R.uniform(.05, max(.05, b["w"] - .45)), "y": b["y"] + R.uniform(.05, max(.05, b["h"] - .45)),
                  "w": .4, "h": .4, "rot": 0, "scale": .45, "layer": 150, "spin": R.uniform(0, 6.28), "piece": piece}
            placed.append(it)
            if piece == "light": room.lights.append((it["x"] + .2, it["y"] + .2, LIGHT_RANGE.get(pal.lights, 3) - 1))
            continue
        e = entry if prule == "base" else pal.pick(piece, R)
        if not e:
            if prule == "base": return []
            continue
        rect = _frame(x, y, W, H, side, (dx, dy, pw, ph))
        layer = 50 if piece == "rug" else 100
        if layer == 100 and not room.fits(rect):
            if prule == "base": return []
            continue
        it = _drawn(e, rect, piece, layer)
        if it is None:
            if prule == "base": return []
            continue
        placed.append(it)
        if layer == 100: room.items.append(it)                 # so later parts and pieces keep clear of it
        if prule == "base": base_item = it
    return placed


def _reskin(room, pal, R):
    """Draw the type's own furniture with the palette's assets of the same piece (the WoDX file keeps the name).
    A picture is drawn at most at its own size (never blown up past it, so never across a wall) and at least at
    half of it; the palette's piece nearest the square's size wins."""
    for it in room.items:
        piece = K.piece_of(it["asset"])
        if not piece: continue
        r, w, h = it.get("rot", 0), it["w"], it["h"]
        opts = list(pal.sets.get(piece) or [])
        R.shuffle(opts)
        best = None
        for e in opts:
            aw, ah = e["cells"]
            fw, fh = (ah, aw) if r else (aw, ah)
            if aw != ah and abs(w - h) > 1e-6 and (fw > fh) != (w > h): continue
            fit = min(w / fw, h / fh)
            if fit >= .5 and (best is None or abs(1 - min(fit, 2)) < abs(1 - min(best[1], 2)) - .2): best = (e, fit)
        if best:
            e, fit = best
            it["draw"], it["draw_scale"], it["draw_rot"] = e["path"], round(min(1.0, fit), 3), r


SURFACE = {"table", "desk", "counter", "chest", "shelf", "cupboard", "bed"}     # never a barrel on a barrel
ON_IT = {"table": "tableware", "desk": "clutter", "counter": "tableware", "shelf": "tableware", "cupboard": "tableware",
         "chest": "clutter", "store": "store", "seat": "clutter", "bed": "rug"}


def _things_on(room, pal, R, added):
    """Small things on the room's furniture until it looks lived in: crockery and food on tables and shelves, a
    blanket on a bed, a sack by a barrel. They stand on their piece (layer 300), so they never touch a wall."""
    out = []
    need = max(2, int(room.iw * room.ih / DENSE)) - len(room.items) - sum(1 for x in added if x["layer"] != 400)
    hosts = [] if ANIMALS.search(room.name) else [it for it in room.items if (it.get("piece") or K.piece_of(it["asset"])) in SURFACE]
    R.shuffle(hosts)
    k = 0
    while need > 0 and hosts and k < 4 * len(hosts):
        b = hosts[k % len(hosts)]; k += 1
        piece = ON_IT[b.get("piece") or K.piece_of(b["asset"])]
        if piece == "rug" and any(o.get("host") is b for o in out): continue
        e = None
        for _try in range(10):                                 # crockery and food on a table, cloth on a bed
            e = pal.pick(piece if piece != "rug" else "clutter", R) or pal.pick("clutter", R)
            if e and FITS_ON.get(piece_b := (b.get("piece") or K.piece_of(b["asset"])), re.compile("")).search(e["name"]): break
            e = None
        if not e or (room.ctx["wealth"] == "poor" or room.ctx["band"] == "medieval") and LETTERED.search(e["name"]) and room.ctx["wealth"] != "noble": continue
        sz = min(.45, b["w"] * .45, b["h"] * .45)
        out.append({"asset": e["path"], "x": b["x"] + R.uniform(.08, max(.08, b["w"] - sz - .08)),
                    "y": b["y"] + R.uniform(.08, max(.08, b["h"] - sz - .08)), "w": sz, "h": sz, "rot": 0,
                    "scale": round(sz / max(e["cells"]), 3), "layer": 150, "spin": R.uniform(0, 6.28), "piece": piece, "host": b})
        need -= 1
    for o in out: o.pop("host", None)
    return out


TABLEWARE = PAL.TABLEWARE
FITS_ON = {"table": TABLEWARE, "counter": TABLEWARE, "desk": re.compile(r"Book|Paper|Quill|Ink|Pen|Candle|Scroll|Letter|Map", re.I),
           "bed": re.compile(r"Blanket|Cloth|Pillow|Fur|Pelt", re.I), "shelf": TABLEWARE, "cupboard": TABLEWARE,
           "chest": re.compile(r"Cloth|Blanket|Basket|Candle|Fur|Pelt|Bowl|Jug", re.I)}
LETTERED = re.compile(r"Book|Scroll|Quill|Ink|Pen_|Paper|Letter|Ledger|Map|Coin|Glass|Bottle|Goblet|Silver|Gold|Potion", re.I)   # not in a peasant's house
WALL_PIECES = {"store": ("store", "store", "chest", "shelf"), "ward": ("chest", "store", "seat", "shelf"),
               "sleep": ("chest", "seat", "cupboard", "store"), "kitchen": ("store", "shelf", "store", "seat"),
               "work": ("store", "shelf", "chest", "store"), "outdoor": ("store", "seat", "store", "store")}


def _beside_any(room, r, e=.05):
    """True when a spot touches one of the room's pieces (a sack by the oven, a basket by a chest)."""
    x, y, w, h = r
    return any(x <= i["x"] + i["w"] + e and i["x"] <= x + w + e and y <= i["y"] + i["h"] + e and i["y"] <= y + h + e for i in room.items)


def _along_walls(room, pal, R, dense):
    """Small pieces against the walls (a chest, a barrel, a stool, a shelf) until the room looks lived in; each one
    keeps clear of doors, walkways and other pieces like any furniture (room.fits)."""
    order = WALL_PIECES.get(room.kind, ("chest", "store", "seat", "shelf"))
    for k in range(max(12, int(room.iw * room.ih / 3))):          # a big shed takes more tries
        if dense(): return
        e = pal.pick(order[k % len(order)], R)
        if not e: continue
        aw, ah = e["cells"]
        if max(aw, ah) > (3 if room.iw * room.ih >= 40 else 2): continue      # a big hall or shed takes bigger pieces
        sc = .75 if max(aw, ah) <= 1 and room.iw * room.ih < 40 else 1.0
        fw, fh = aw * sc, ah * sc
        spots = room.candidates(fw, fh, "wall")
        if not spots and STACKED.search(room.name):           # a shed's stacks go on across the floor, each by another
            spots = [c for c in room.candidates(fw, fh, "free") if _beside_any(room, c[1:5])]
        if not spots: continue
        _, x, y, w, h, rot = spots[R.randrange(min(4, len(spots)))]
        room.items.append({"asset": e["path"], "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": sc, "layer": 100,
                           "piece": order[k % len(order)]})
    for k in range(10):                                        # a small room with no wall left: half-square things (a sack, a
        if dense() or len(room.items) >= max(2, int(room.iw * room.ih / DENSE)): break   # bucket, a basket) by the walls
        e = pal.pick(("store", "clutter")[k % 2], R)
        if not e or max(e["cells"]) > 1: continue
        spots = room.candidates(.5, .5, "wall") or [c for c in room.candidates(.5, .5, "free") if _beside_any(room, c[1:5])]
        if not spots: break
        _, x, y, w, h, rot = spots[R.randrange(min(4, len(spots)))]
        room.items.append({"asset": e["path"], "x": x, "y": y, "w": w, "h": h, "rot": rot, "scale": round(.5 / max(e["cells"]), 3),
                           "layer": 100, "piece": ("store", "clutter")[k % 2]})
    C.orient(room)


ANIMALS = re.compile(r"Byre|Barn|Stable|Coop|Sty|Hay|Loft|Granary|Kennel|Mews", re.I)
GRAND_LIGHT = re.compile(r"Chandelier|Candelabra", re.I)
STACKED = re.compile(r"Shed|Warehouse|Store", re.I)
STREET_LIGHT = re.compile(r"street|traffic|road|lamp_?post|pole|signal", re.I)        # out of doors, never on a room's wall
ODD_FLAME = re.compile(r"Blue|Purple|Green|Pink|Gem|Teal|Cyan|Skull", re.I)          # coloured or uncanny flames


def _wall_lights(room, pal, tier, R):
    if ANIMALS.search(room.name): return                       # no open flame among hay and beasts
    fine = TIERS.index(tier) >= TIERS.index("fine")
    e = None
    for _try in range(6):
        e = pal.pick("light", R)
        if not e or (fine or not GRAND_LIGHT.search(e["name"])) and not ODD_FLAME.search(e["name"]) and not STREET_LIGHT.search(e["name"]): break
        e = None
    n = 1 + TIERS.index(tier) // 2
    rng = LIGHT_RANGE.get(pal.lights, 3)
    for k in range(n):
        for _try in range(8):                                  # spread out: no two lights within two squares
            side = R.choice("NSEW")
            cx = room.ix + room.iw * R.uniform(.25, .75) if side in "NS" else (room.ix + .25 if side == "W" else room.ix + room.iw - .25)
            cy = room.iy + room.ih * R.uniform(.25, .75) if side in "EW" else (room.iy + .25 if side == "N" else room.iy + room.ih - .25)
            if all(math.hypot(cx - x, cy - y) >= 2 for x, y, _ in room.lights): break
        else:
            continue
        if e: room.dressing.append({"asset": e["path"], "x": cx - .3, "y": cy - .3, "w": .6, "h": .6, "rot": 0,
                                    "scale": round(min(1.0, .6 / max(e["cells"])), 3), "layer": 400, "piece": "light"})   # drawn .6 across
        room.lights.append((cx, cy, rng))


def fill_room(room):
    ctx = room.ctx
    pal = ctx["palette"]
    room.dressing, room.lights = [], []
    keep_R, R = C.R, random.Random(f"{room.name}|{room.x:.2f}|{room.y:.2f}")
    kind = U.kind_of_name(room.name)
    room.kind, room.full = kind, False
    target = target_tier(ctx["role"], ctx["wealth"], ctx["lifts"], ctx["show_off"], ctx["band"], kind)
    room.target = target
    n0 = len(room.items)
    saved = room.blocked
    try:
        C.R = R                                                # room.candidates draws its noise from ddcore.R
        _reskin(room, pal, R)
        if room.iw < 1.5 or room.ih < 1.5 or kind in NO_FILL:
            room.tier = tier_of(room_value(room, pal), kind, ctx["band"])
            if kind not in ("outdoor",) and room.iw * room.ih >= 4: _wall_lights(room, pal, "meagre", R)
            return
        if not ctx["open_floor"] or STACKED.search(room.name):  # a shed or warehouse is stacked across its floor, along its
                                                               # walkways (a barn keeps its threshing floor open)
            room.blocked = [b for b in room.blocked if b[4] != "open floor"]
        limit = FULL.get(kind, FULL_DEFAULT) * room.iw * room.ih
        options = SP.fitting(kind, ctx["role"], ctx["trade"], ctx["band"], ctx["prefers"])
        used, added = {}, []
        def dense():                                           # lived in, however poor: enough pieces for the floor
            if kind == "passage": return True                  # a gateway or stair hall stays open
            if kind == "outdoor":                              # a court stays mostly open: a barrel, a bench, a cart's load
                return len(room.items) + sum(1 for x in added if x["layer"] != 400) >= max(2, int(room.iw * room.ih / 8))
            n = len(room.items) + sum(1 for x in added if x["layer"] != 400)
            return n >= max(2, int(room.iw * room.ih / DENSE)) and sum(i["w"] * i["h"] for i in room.items) >= COVER * room.iw * room.ih
        def reached():
            v = room_value(room, pal) + sum(pal.worth(x["asset"]) for x in added)
            return TIERS.index(tier_of(v, kind, ctx["band"])) >= TIERS.index(target) and dense()
        done = False
        for _round in range(3):                                # each round tries every fitting set piece once
            placed_any = False
            for sp in options:
                if reached(): done = True; break
                if sum(i["w"] * i["h"] for i in room.items) >= limit: room.full = done = True; break
                if used.get(sp["id"], 0) >= (2 if sp["place"] == "centre" else 3): continue
                got = _place(room, sp, pal, R)
                if got:
                    used[sp["id"]] = used.get(sp["id"], 0) + 1
                    added += [g for g in got if g["layer"] != 100]
                    placed_any = True
            if done: break
            if not placed_any: room.full = True; break
        if not dense(): added += _things_on(room, pal, R, added)
        if not dense(): _along_walls(room, pal, R, dense)
        mine = room.items[n0:]
        del room.items[n0:]
        room.dressing += mine + added
        room.tier = tier_of(room_value(room, pal), kind, ctx["band"])
        if kind != "outdoor": _wall_lights(room, pal, room.tier, R)    # no chandelier hung in a court
    finally:
        room.blocked = saved
        C.R = keep_R


# ------------------------------------------------------------------ using it from the generators
DEFAULT = {}           # set by a command line (--year...): every building furnished afterwards uses it
_CATALOGUE = []
USUAL_WEALTH = {"burgher-palace": "rich", "villa": "rich", "cdda-mansion": "rich", "grand-hotel": "rich", "baroque-house": "rich",
                "func-villa": "rich", "town-hall": "rich", "savings-bank": "rich", "cdda-bank": "rich", "counting-house": "rich",
                "cottage": "poor", "hut": "poor", "tenement": "poor", "ghetto-house": "poor", "byre-house": "poor", "lazar-house": "poor",
                "colony-house": "poor", "panel-block": "middling"}
FLOOR_KIND = {"kitchen": "kitchen", "store": "store", "worship": "worship", "sleep": "sleep", "study": "study", "outdoor": "outdoor",
              "bath": "kitchen", "cell": "store", "work": "store"}


MATERIALS = [("timber", r"PlasterWood"), ("stonewood", r"StoneWood"), ("wood", r"Wood|Log|Plank"), ("stone", r"Stone|Castle|Rock"),
             ("brick", r"Brick"), ("render", r"Solid|Plaster|Stucco|Tyger|Concrete")]


def material(wall):
    """The building material a wall texture stands for (timber frame, wood, stone, brick, render), or None."""
    name = (wall or "").rsplit("/", 1)[-1]
    return next((m for m, rx in MATERIALS if re.search(rx, name, re.I)), None)


def catalogue():
    """The catalogue of every asset the map may use (ddcore.ASSETS, the lists given with --assets), built once."""
    if not _CATALOGUE: _CATALOGUE.extend(K.build(C.ASSETS))
    return _CATALOGUE


def apply(b, year, region="moravia", wealth=None, trade=None, seed=0):
    """Furnish a built building again by purpose, palette and room value: its rooms' dressing, its walls and floors.
    The type's own furniture and the WoDX file do not change. b: a Building or an Angled one (its rooms are local)."""
    local = getattr(b, "local", b)
    wealth = wealth or getattr(b, "wealth", None) or USUAL_WEALTH.get(re.sub(r"--.*$", "", local.type or ""), "middling")
    trade = trade or getattr(b, "trade", None)
    ctx = context_for(local, year, region, wealth, trade, catalogue(), seed)
    pal = None
    for r in local.rooms:
        r.ctx = ctx[r.name]; pal = r.ctx["palette"]
        C.dress(r)
        C.orient(r)
        f = pal.floor.get(FLOOR_KIND.get(U.kind_of_name(r.name), "living"))
        if f and r.floor not in (None, "earth"): r.floor = f
    own = getattr(b, "wall_tex", None) or getattr(local, "t", {}).get("wall")
    wall = pal.wall if pal else None
    ok = lambda w: w and material(w) == material(own) and ("Castle" not in w or wealth == "noble")
    if pal and not ok(wall):                                   # another wall of the age in the building's own material
        band = pal.key[0]
        same = sorted(e["path"] for e in catalogue() if e["kind"] == "walls" and band in e["bands"] and ok(e["path"]))
        wall = same[random.Random(f"{seed}|{local.type}|{year}").randrange(len(same))] if same else None
    if wall:
        b.wall_tex = wall                                      # the age's look, the building's own material
        if local is not b: local.wall_tex = wall
    if pal and pal.portals:                                    # the age's doors and windows
        b.portal_tex = pal.portals
        if local is not b: local.portal_tex = pal.portals
    b.palette = pal
    return b
