"""Cellars and upper floors of a building type, as types of their own, so each level can be drawn as its own map
(ddsite.py --kind floors --type KEY).

Every level keeps the ground floor's outline and inner walls, so the stair stands in the same spot on every map.
  upper floor  the same rooms upstairs: outer doors become windows, rooms furnished by what the building is for
               (a home sleeps upstairs, a workplace has offices and stores, an inn has guest rooms)
  cellar       under the whole building, the walls carried down; no windows, and the rooms are cellars, a crypt
               (churches), a vault (banks, counting houses) or a morgue (hospitals, funeral homes)
House rules: any building of more than one storey gets its upper floors; every building except barns, coops, huts,
sheds and the like gets a cellar.
"""
import buildings as B

FA = dict(bed=B.BED, bigbed=B.BIGBED, chest=B.CHEST, table=B.TABLE, stool=B.STOOL, barrel=B.BARREL, crate=B.CRATE, sack=B.SACK,
          shelf="Shelf_Wood_Ashen_A_2x1.webp", coffin="Coffin_Wood_Ashen_A_1x2.webp", stair="Stairs_Wood_Ashen_B_1x2.webp")
MOD = dict(bed="BedTwin01.png", bigbed="BedDouble01.png", chest="Cabinet10.png", table="Table01.png", stool="Chair01.png",
           barrel="StoreShelf100.png", crate=B.CRATE, sack=B.CRATE, shelf="StoreShelf100.png", coffin="Coffin_Wood_Ashen_A_1x2.webp",
           stair="StairUp01.png")
NO_CELLAR = ("barn", "coop", "hut", "goods-shed", "granary", "cdda-warehouse", "cdda-empty-warehouse", "cdda-empty-warehouse-2", "lift")
OPEN_ROOMS = ("Yard", "Court", "Arcade", "Gateway", "Stage", "Loading bay", "Porch")


def kit(t):
    return MOD if t.get("portals") or t.get("built", (0,))[0] >= 1919 else FA


def stair_spot(t):
    """A corner of the biggest closed room, clear of every doorway: (room name, x, y) in the room's own cells."""
    rooms = sorted((r for r in t["rooms"] if not any(w in r[0] for w in OPEN_ROOMS) and r[3] >= 1.5 and r[4] >= 2.5),
                   key=lambda r: -r[3] * r[4])
    for gap in (1.6, 1.0, .6):                               # as far from the doors as the rooms allow
        for name, rx, ry, rw, rh, _ in rooms:
            for x, y in ((.2, .2), (rw - 1.2, .2), (.2, rh - 2.2), (rw - 1.2, rh - 2.2)):
                X, Y = rx + x, ry + y
                if all(not (X - gap < o[1] < X + 1 + gap and Y - gap < o[2] < Y + 2 + gap) for o in t["openings"] if o[0] != "window"):
                    return name, x, y
    return None


def _base(t, key, label, rooms, openings, furnish, floor_wall=None):
    d = {k: v for k, v in t.items() if k not in ("rooms", "openings", "furnish", "label")}
    d.update(label=label, rooms=rooms, openings=openings, furnish=furnish, storeys=1, level_of=key)
    if floor_wall: d["wall"] = floor_wall
    return d


def on_outline(t, o):
    w, h = t["size"]
    ol = t.get("outline") or [(0, 0), (w, 0), (w, h), (0, h)]
    for a, b in zip(ol, ol[1:] + ol[:1]):
        if o[3] == "h" and abs(a[1] - b[1]) < .01 and abs(o[2] - a[1]) < .05 and min(a[0], b[0]) - .05 <= o[1] <= max(a[0], b[0]) + .05: return True
        if o[3] == "v" and abs(a[0] - b[0]) < .01 and abs(o[1] - a[0]) < .05 and min(a[1], b[1]) - .05 <= o[2] <= max(a[1], b[1]) + .05: return True
    return False


def with_stair(t, furnish, spot, up, down):
    if spot:
        name, x, y = spot
        K = kit(t)
        furnish = dict(furnish)
        furnish[name] = [(K["stair"], f"at:{x:.2f}:{y:.2f}", 1)] + list(furnish.get(name, []))
    return furnish


def upper(key, t, n, spot):
    K = kit(t)
    place = t.get("place")
    ops = [("window", o[1], o[2], o[3]) if on_outline(t, o) and o[0] != "window" else o for o in t["openings"]]
    rooms, furnish = [], {}
    for i, (name, x, y, w, h, fl) in enumerate(t["rooms"]):
        area = w * h
        if any(o in name for o in OPEN_ROOMS):                # open to the sky: a gallery round it upstairs, nothing in it
            rooms.append((f"Open to the {name.split()[0].lower()}", x, y, w, h, fl)); furnish[rooms[-1][0]] = []
            continue
        if place == "home": new = "Bedroom" if area >= 8 else "Store room"
        elif place == "tavern": new = "Guest room" if area >= 8 else "Linen store"
        else: new = "Office" if area >= 8 else "Store room"
        nm = f"{new} {i + 1}"
        rooms.append((nm, x, y, w, h, "lino" if K is MOD else "planks"))
        if new in ("Bedroom", "Guest room"):
            furnish[nm] = [(K["bigbed"] if area >= 12 else K["bed"], "corner", 1), (K["chest"], "wall", 1)] + ([(K["table"], "wall", 1)] if area >= 16 else [])
        elif new == "Office":
            furnish[nm] = [(K["table"], "wall", 1 + (area >= 20)), (K["stool"], "beside:table", 1), (K["shelf"], "wall", 1)]
        else:
            furnish[nm] = [(K["chest"], "corner", 1), (K["crate"], "corner", 1)]
    first = {r: f"{rooms[i][0]}" for i, r in enumerate(r[0] for r in t["rooms"])}
    sp = (first[spot[0]], spot[1], spot[2]) if spot else None
    return _base(t, key, f"{t['label']}, floor {n}", rooms, ops, with_stair(t, furnish, sp, True, n < t.get("storeys", 1)))


def cellar(key, t, spot):
    K = kit(t)
    label = t["label"]
    what = ("Crypt" if any(w in label for w in ("Church", "Chapel", "Cathedral", "Synagogue")) else
            "Vault" if any(w in label for w in ("Bank", "Counting", "Palace")) else
            "Morgue" if any(w in label for w in ("Hospital", "Funeral", "Lazar", "Cemetery")) else "Cellar")
    ops = [("doorway", o[1], o[2], o[3]) for o in t["openings"] if o[0] != "window" and not on_outline(t, o)]
    rooms, furnish = [], {}
    for i, (name, x, y, w, h, fl) in enumerate(t["rooms"]):
        nm = f"{what} {i + 1}"
        rooms.append((nm, x, y, w, h, "stone"))
        big = w * h >= 10
        if what in ("Crypt", "Morgue"): furnish[nm] = [(K["coffin"], "wall", 1 + big)]
        elif what == "Vault": furnish[nm] = [(K["chest"], "wall", 1 + big)]
        else: furnish[nm] = [(K["barrel"], "corner", 1 + big), (K["crate"], "wall", 1), (K["sack"], "corner", 1)] if K is FA else [(K["shelf"], "wall", 1 + big), (K["crate"], "corner", 1)]
    names = {r[0]: rooms[i][0] for i, r in enumerate(t["rooms"])}
    sp = (names[spot[0]], spot[1], spot[2]) if spot else None
    return _base(t, key, f"{label}, {what.lower() if what != 'Cellar' else 'cellar'}", rooms, ops, with_stair(t, furnish, sp, True, False))


def levels(key):
    """[(level name, type)] for a building type: the ground floor (with its stair), the upper floors, the cellar."""
    t = B.TYPES[key]
    spot = stair_spot(t)
    ground = dict(t, furnish=with_stair(t, t["furnish"], spot, True, True), level_of=key)
    out = [("ground", ground)]
    for n in range(2, min(t.get("storeys", 1), 5) + 1): out.append((f"floor-{n}", upper(key, t, n, spot)))
    if key not in NO_CELLAR and t.get("role") not in ("farm",) and t["size"][0] * t["size"][1] >= 12: out.append(("cellar", cellar(key, t, spot)))
    return out, spot
