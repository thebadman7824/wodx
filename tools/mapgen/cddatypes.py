"""Building types adapted from Cataclysm: Dark Days Ahead's layouts (see cdda.py, which writes cdda_types.json).

Each layout keeps its rooms, walls, doors and windows; its furniture is put on the squares the layout gives,
in WoDX's modern assets. They are present-day buildings, so they stand in towns from 1960 on.
Credit: Cataclysm: Dark Days Ahead, CC BY-SA 3.0 (https://github.com/CleverRaven/Cataclysm-DDA).
"""
import json, os
import buildings as B
import ddcore as C
import eratypes as E

M, SF = E.M, E.SF
K = 1 / 1.524
# tag -> (asset, one piece a square or one piece for the whole run)
KIT = {
    "bed": (M["twin2"], False), "twin": (M["twin2"], False), "couch": (M["couch2"], False), "armchair": (M["armchair"], False),
    "chair": (M["chair2"], False), "table": (M["table"], False), "coffee": (M["coffee2"], False), "desk": (M["smalldesk"], False),
    "counter": (M["cab"], True), "fridge": (M["fridge"], False), "chiller": (M["chiller2"], True), "freezer": (M["freezer"], True),
    "stove": (M["gas"], False), "sink": (M["sink2"], False), "wc": (M["wc2"], False), "bath": (M["bath"], False),
    "shower": (M["shower"], False), "shelf": (M["hutch"], True), "display": (M["display"], True), "case": (M["display2"], True),
    "locker": (SF["locker"], True), "cupboard": (M["cab"], True), "dresser": (M["hutch"], False), "safe": (M["cab"], True),
    "console": (SF["csmall"], False), "washer": (M["washer"], False), "drier": (M["drier"], False), "tv": (M["tv"], False),
    "bench": (B.BENCH, True), "altar": ("Altar_Stone_01_A_2x1.webp", False), "crate": (B.CRATE, True),
    "plant": ("Plant_Pot_Clay_Brown_A_1x1.webp", False), "slab": (M["table"], False), "coffin": ("Coffin_Wood_Ashen_A_1x2.webp", False),
    "machine": (SF["csmall"], False), "statue": ("Plant_Pot_Clay_Red_A_1x1.webp", False),
}
FLOOR = lambda name: ("terrazzo" if any(w in name for w in ("Hall", "Sanctuary", "Gallery", "Counter", "Vault", "Store", "Shop"))
                      else "tiles" if any(w in name for w in ("Bathroom", "Toilet", "Kitchen", "Mortuary", "Ward")) else "lino")
ROLE = {"Bank": "shop", "Bar": "inn", "Music club": "inn", "Motel": "inn", "Library": "civic", "Museum": "civic", "Art gallery": "civic",
        "Police station": "civic", "Church": "civic", "Country church": "civic", "Synagogue": "civic", "Cathedral": "civic",
        "Funeral home": "shop", "Hospital": "civic", "Warehouse": "industry", "Sewer pumping station": "industry"}
PLACE = {"inn": "tavern", "shop": "shop", "civic": "workplace", "industry": "workplace"}

def piece_rules(pieces):
    out = []
    for tag, cx, cy, n, turn in pieces:
        if tag not in KIT: continue
        asset, each = KIT[tag]
        w, h = C.cells_of(asset)
        if each:                                          # one piece a square along the run, sized to the square
            sc = round(K / max(w, h), 3)
            pw, ph = (h * sc, w * sc) if turn else (w * sc, h * sc)
            for i in range(n):
                off = (i - (n - 1) / 2) * K
                x, y = (cx - pw / 2, cy + off - ph / 2) if turn else (cx + off - pw / 2, cy - ph / 2)
                out.append((asset, f"at:{x:.2f}:{y:.2f}" + (":1" if turn else ""), 1, sc))
        else:                                             # one piece for the run (a bed, a table), at its middle
            long_run = n > 1
            t = turn if long_run else 0
            pw, ph = (h, w) if t else (w, h)
            out.append((asset, f"at:{cx - pw / 2:.2f}:{cy - ph / 2:.2f}" + (":1" if t else ""), 1))
    return out

HOMELIKE = ("Motel", "Mansion")
def rename(name, label):
    """Room names come from the furniture; outside homes a room of tables and chairs is a staff room, not a dining room."""
    if label in HOMELIKE: return name
    for a, b in (("Dining room", "Staff room"), ("Shop floor", "Side room" if label in ("Church", "Country church", "Cathedral", "Synagogue") else "Shop floor")):
        if name.startswith(a): name = b + name[len(a):]
    return name

def load():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cdda_types.json")
    if not os.path.exists(path): return {}
    doc = json.load(open(path, encoding="utf-8"))
    out = {}
    for key, t in doc["types"].items():
        role = ROLE.get(t["label"], "civic")
        v = {"label": t["label"], "model": f"{t['model']} (layout adapted from Cataclysm: Dark Days Ahead)", "built": (1960, 2098),
             "role": "block" if t["size"][0] * t["size"][1] > 400 else role, "storeys": 1, "size": tuple(t["size"]),
             "outline": [tuple(p) for p in t["outline"]], "parts": [tuple(p) for p in t["parts"]],
             "wall": "Tyger_wall.png", "place": PLACE.get(role, "workplace"), "fill": "office", "portals": E.MODERN,
             "rooms": [(rename(n, t["label"]), x, y, w, h, FLOOR(n)) for n, x, y, w, h, _ in t["rooms"]],
             "openings": [tuple(o) for o in t["openings"]], "partitions": [tuple(map(tuple, p)) for p in t["partitions"]],
             "furnish": {rename(n, t["label"]): piece_rules(p) for n, p in t["furnish"].items()}, "cdda": t["cdda"], "credit": doc["credit"],
             "era": "mid-century", "eras": [e for e, y in E.ERA_STARTS if y >= 1919]}
        out[key] = v
    return out

CDDA_TYPES = load()
B.TYPES.update(CDDA_TYPES)
