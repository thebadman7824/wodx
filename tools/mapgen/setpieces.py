"""Set pieces: small arrangements that fill a corner, a stretch of wall or the middle of a room, written in general
pieces (table, seat, light...) that the building's palette turns into real assets. Like Cataclysm's nested chunks.

Each set piece: id; the room kinds and roles it suits (None = any role); the trades it belongs to (None = any; a set
piece with trades is only used by those trades); the ages it fits (None = every age); where it goes (wall: its top
edge against a wall; corner: top and left edges against walls; centre: free standing); its size in squares, and its
parts as (piece, dx, dy, w, h, rule) in that frame. Rules: base (the anchor), face:base (a seat turned to the base),
on:base (small things laid on the base), beside (stands by the base), back (back to the wall)."""
import re

LATER = ["republic", "socialist", "modern", "future"]
LATEST = ["modern", "future"]
EARLY = ["medieval", "early", "reform", "industrial"]


def SP(id_, kinds, place, size, parts, roles=None, trades=None, bands=None):
    return {"id": id_, "kinds": kinds, "roles": roles, "trades": trades, "bands": bands, "place": place, "size": size, "parts": parts}

def on(piece="clutter", n=1): return [(piece, 0, 0, .4, .4, "on:base")] * n

HOMEY = ["hall", "sleep", "study"]
SET_PIECES = [
    # writing and work
    SP("writing-corner", ["study", "hall", "sleep"], "wall", (2, 2), [("desk", 0, 0, 2, 1, "base"), ("seat", .5, 1, 1, 1, "face:base"), *on("light"), *on("clutter", 2)]),
    SP("ledger-desk", ["study", "shop", "hall"], "wall", (3, 2), [("desk", 0, 0, 2, 1, "base"), ("seat", .5, 1, 1, 1, "face:base"), ("chest", 2, 0, 1, 1, "back"), *on("clutter", 3), *on("light")]),
    SP("office-desk-computer", ["study", "hall", "shop"], "wall", (3, 2), [("desk", 0, 0, 2, 1, "base"), ("seat", .5, 1, 1, 1, "face:base"), ("cupboard", 2, 0, 1, 1, "back"), *on("machine"), *on("clutter")], bands=LATEST),
    SP("filing-wall", ["study"], "wall", (3, 1), [("cupboard", 0, 0, 1, 1, "base"), ("cupboard", 1, 0, 1, 1, "back"), ("cupboard", 2, 0, 1, 1, "back")], bands=LATER),
    SP("bookshelf-wall", ["study", "hall"], "wall", (4, 1), [("shelf", 0, 0, 2, 1, "base"), ("shelf", 2, 0, 2, 1, "back")]),
    SP("reading-tables", ["study", "hall"], "centre", (3, 3), [("table", 0, 1, 3, 1, "base"), ("seat", .25, 0, 1, 1, "face:base"), ("seat", 1.75, 0, 1, 1, "face:base"), ("seat", .25, 2, 1, 1, "face:base"), ("seat", 1.75, 2, 1, 1, "face:base"), *on("light"), *on("clutter", 2)]),
    SP("school-desks", ["study"], "centre", (4, 3), [("desk", 0, 0, 1, 1, "base"), ("desk", 1.5, 0, 1, 1, "beside"), ("desk", 3, 0, 1, 1, "beside"), ("seat", 0, 1, 1, 1, "face:base"), ("seat", 1.5, 1, 1, 1, "beside"), ("seat", 3, 1, 1, 1, "beside")]),
    SP("council-table", ["study", "hall"], "centre", (5, 3), [("table", .5, 1, 4, 1, "base"), ("seat", .5, 0, 1, 1, "face:base"), ("seat", 2, 0, 1, 1, "face:base"), ("seat", 3.5, 0, 1, 1, "face:base"), ("seat", .5, 2, 1, 1, "face:base"), ("seat", 2, 2, 1, 1, "face:base"), ("seat", 3.5, 2, 1, 1, "face:base"), *on("clutter", 3)]),
    SP("workbench", ["work", "store"], "wall", (3, 2), [("table", 0, 0, 2, 1, "base"), ("seat", .5, 1, 1, 1, "face:base"), ("store", 2, 0, 1, 1, "back"), *on("clutter", 3)]),
    # show
    SP("plate-display", ["hall", "shop"], "wall", (3, 1), [("cupboard", 0, 0, 2, 1, "base"), ("display", 2, 0, 1, 1, "back"), *on("clutter", 3)]),
    SP("portrait-wall", ["hall", "study", "worship"], "wall", (3, 1), [("display", 0, 0, 1, 1, "base"), ("display", 2, 0, 1, 1, "back"), ("plant", 1, 0, 1, 1, "back")]),
    SP("carpet-and-chairs", ["hall", "sleep"], "centre", (4, 3), [("rug", 0, 0, 4, 3, "base"), ("seat", .5, .5, 1, 1, "face:base"), ("seat", 2.5, .5, 1, 1, "face:base"), ("table", 1.5, 1.5, 1, 1, "beside")]),
    SP("display-cases", ["hall", "shop"], "centre", (4, 2), [("display", 0, 0, 1, 1, "base"), ("display", 1.5, 0, 1, 1, "beside"), ("display", 3, 0, 1, 1, "beside"), ("display", 1.5, 1, 1, 1, "beside")]),
    SP("display-wall", ["hall", "shop"], "wall", (2, 1), [("display", 0, 0, 1, 1, "base"), ("display", 1, 0, 1, 1, "back")]),
    SP("tomb-and-gift", ["worship"], "wall", (3, 2), [("display", 0, 0, 3, 1, "base"), ("light", 0, 1, 1, 1, "beside"), ("light", 2, 1, 1, 1, "beside")]),
    # living and eating
    SP("long-table", ["hall", "tavern", "kitchen"], "centre", (5, 3), [("table", .5, 1, 4, 1, "base"), ("seat", .5, 0, 1, 1, "face:base"), ("seat", 2, 0, 1, 1, "face:base"), ("seat", 3.5, 0, 1, 1, "face:base"), ("seat", .5, 2, 1, 1, "face:base"), ("seat", 2, 2, 1, 1, "face:base"), ("seat", 3.5, 2, 1, 1, "face:base"), *on("clutter", 4), *on("light")]),
    SP("dining-table", ["hall", "kitchen"], "centre", (3, 3), [("table", .5, 1, 2, 1, "base"), ("seat", .5, 0, 1, 1, "face:base"), ("seat", 1.5, 2, 1, 1, "face:base"), ("seat", 1.5, 0, 1, 1, "face:base"), ("seat", .5, 2, 1, 1, "face:base"), *on("clutter", 2)]),
    SP("hearth-and-settle", ["hall", "tavern", "kitchen"], "wall", (3, 3), [("hearth", .5, 0, 2, 1, "base"), ("rug", .5, 1, 2, 1, "under"), ("seat", 0, 2, 2, 1, "face:base"), ("seat", 2, 1.5, 1, 1, "face:base")], bands=EARLY),
    SP("fireside-seats", ["hall", "tavern", "study"], "wall", (3, 2), [("hearth", .5, 0, 2, 1, "base"), ("rug", .5, 1, 2, 1, "under"), ("seat", 0, 1, 1, 1, "face:base"), ("seat", 2, 1, 1, 1, "face:base")], bands=EARLY + ["republic"]),
    SP("sofa-and-tv", ["hall"], "wall", (3, 3), [("machine", 1, 0, 1, 1, "base"), ("seat", 0, 2, 3, 1, "face:base"), ("table", 1, 1.2, 1, .8, "beside")], bands=["socialist", "modern", "future"]),
    SP("armchair-corner", ["hall", "sleep", "study"], "corner", (2, 2), [("seat", 0, 0, 1, 1, "base"), ("light", 1, 0, 1, 1, "back"), ("plant", 0, 1, 1, 1, "back")]),
    SP("side-table-lamp", HOMEY, "wall", (2, 1), [("table", 0, 0, 1, 1, "base"), *on("light"), ("seat", 1, 0, 1, 1, "back")]),
    SP("cupboard-wall", ["hall", "sleep", "kitchen"], "wall", (2, 1), [("cupboard", 0, 0, 2, 1, "base"), *on("clutter")]),
    SP("plant-corner", ["hall", "study", "shop", "sleep"], "corner", (1, 1), [("plant", 0, 0, 1, 1, "base")]),
    SP("rug-centre", ["hall", "sleep", "study"], "centre", (3, 2), [("rug", 0, 0, 3, 2, "base")]),
    # sleep
    SP("bed-and-chest", ["sleep", "ward"], "wall", (2, 3), [("bed", 0, 0, 2, 2, "base"), ("chest", .5, 2, 1, 1, "beside")]),
    SP("bed-and-side", ["sleep"], "wall", (3, 2), [("bed", 0, 0, 2, 2, "base"), ("table", 2, 0, 1, 1, "back"), *on("light")]),
    SP("wardrobe-wall", ["sleep"], "wall", (2, 1), [("cupboard", 0, 0, 2, 1, "base")]),
    SP("ward-beds", ["ward"], "wall", (3, 3), [("bed", 0, 0, 1, 2, "base"), ("chest", 0, 2, 1, 1, "beside"), ("bed", 2, 0, 1, 2, "back"), ("chest", 2, 2, 1, 1, "beside")]),   # chests at the beds' feet
    SP("washstand", ["sleep", "bath"], "wall", (1, 1), [("bath", 0, 0, 1, 1, "base")]),
    SP("bath-tub", ["bath"], "wall", (2, 1), [("bath", 0, 0, 2, 1, "base")]),
    # kitchens and stores
    SP("kitchen-hearth", ["kitchen"], "wall", (3, 2), [("hearth", .5, 0, 2, 1, "base"), ("store", 0, 1, 1, 1, "beside"), ("store", 2, 1, 1, 1, "beside")], bands=EARLY),
    SP("kitchen-stove", ["kitchen"], "wall", (3, 1), [("stove", 0, 0, 1, 1, "base"), ("cupboard", 1, 0, 2, 1, "back")], bands=["industrial"] + LATER),
    SP("kitchen-table", ["kitchen"], "centre", (3, 2), [("table", .5, 0, 2, 1, "base"), ("seat", .5, 1, 1, 1, "face:base"), *on("tableware", 4)]),
    SP("store-barrels", ["store", "kitchen", "tavern", "work"], "corner", (2, 2), [("store", 0, 0, 1, 1, "base"), ("store", 1, 0, 1, 1, "back"), ("store", 0, 1, 1, 1, "back")]),
    SP("store-crates", ["store", "work", "shop"], "wall", (3, 1), [("store", 0, 0, 1, 1, "base"), ("store", 1, 0, 1, 1, "back"), ("store", 2, 0, 1, 1, "back")]),
    SP("shelf-store", ["store", "kitchen", "shop"], "wall", (2, 1), [("shelf", 0, 0, 2, 1, "base"), *on("clutter", 2)]),
    SP("strongbox", ["store", "study"], "corner", (1, 1), [("chest", 0, 0, 1, 1, "base")]),
    # trade and drink
    SP("cloth-display", ["shop", "hall", "work"], "wall", (3, 2), [("table", 0, 0, 3, 1, "base"), *on("clutter", 3), ("shelf", 0, 1, 1, 1, "beside")], trades=r"cloth|draper|weaver|tailor|mercer|linen"),
    SP("tasting-table", ["hall", "shop", "tavern", "store"], "centre", (3, 2), [("table", .5, 0, 2, 1, "base"), ("store", 0, 1, 1, 1, "beside"), ("store", 2, 1, 1, 1, "beside"), *on("clutter", 3)], trades=r"vintner|wine|brewer|innkeeper"),
    SP("shop-display", ["shop"], "wall", (3, 1), [("shelf", 0, 0, 2, 1, "base"), ("display", 2, 0, 1, 1, "back"), *on("clutter", 3)]),
    SP("counter-and-goods", ["shop", "tavern"], "wall", (4, 2), [("counter", 0, 1, 3, 1, "base"), ("shelf", 0, 0, 2, 1, "back"), ("store", 3, 0, 1, 1, "back"), *on("clutter", 2)]),
    SP("strong-counter", ["shop", "study"], "wall", (4, 2), [("counter", 0, 1, 4, 1, "base"), ("chest", 0, 0, 1, 1, "back"), ("cupboard", 2, 0, 2, 1, "back"), *on("clutter", 2)]),
    SP("bar-counter", ["tavern"], "wall", (5, 3), [("counter", 0, 1, 4, 1, "base"), ("store", 0, 0, 1, 1, "back"), ("shelf", 1, 0, 2, 1, "back"),   # one end open to walk behind
                                                ("seat", 0, 2, 1, 1, "face:base"), ("seat", 1.5, 2, 1, 1, "face:base"), ("seat", 3, 2, 1, 1, "face:base")]),
    SP("tavern-table", ["tavern", "hall"], "centre", (3, 3), [("table", 1, 1, 1, 1, "base"), ("seat", 1, 0, 1, 1, "face:base"), ("seat", 1, 2, 1, 1, "face:base"), ("seat", 0, 1, 1, 1, "face:base"), ("seat", 2, 1, 1, 1, "face:base"), *on("clutter", 2)]),
    SP("corner-booth", ["tavern"], "corner", (3, 3), [("seat", 0, 0, 3, 1, "base"), ("table", .5, 1, 2, 1, "beside"), ("seat", 0, 2, 3, 1, "face:base")]),
    # worship
    SP("altar-and-candles", ["worship"], "wall", (4, 2), [("worship", 1, 0, 2, 1, "base"), ("light", 0, 0, 1, 1, "back"), ("light", 3, 0, 1, 1, "back")]),
    SP("pews", ["worship"], "centre", (4, 4), [("seat", 0, 0, 4, 1, "base"), ("seat", 0, 1.5, 4, 1, "beside"), ("seat", 0, 3, 4, 1, "beside")]),
    # small pieces that fit round walkways
    SP("tea-table", ["hall", "sleep", "study", "tavern"], "centre", (2, 1), [("table", 1, 0, 1, 1, "base"), ("seat", 0, 0, 1, 1, "face:base"), *on("clutter")]),
    SP("chair-pair", ["hall", "study", "sleep", "tavern", "shop"], "wall", (2, 1), [("seat", 0, 0, 1, 1, "base"), ("seat", 1, 0, 1, 1, "back")]),
    SP("bench-wall", ["hall", "kitchen", "tavern", "passage", "work"], "wall", (2, 1), [("seat", 0, 0, 2, 1, "base")]),
    SP("chest-wall", ["sleep", "hall", "store", "study", "work"], "wall", (1, 1), [("chest", 0, 0, 1, 1, "base")]),
    SP("kitchen-worktable", ["kitchen", "work"], "wall", (2, 1), [("table", 0, 0, 2, 1, "base"), *on("clutter", 3)]),
    SP("store-cluster", ["store", "work"], "corner", (3, 2), [("store", 0, 0, 1, 1, "base"), ("store", 1, 0, 1, 1, "back"), ("store", 2, 0, 1, 1, "back"),
                                                         ("store", 0, 1, 1, 1, "back"), ("store", 1, 1, 1, 1, "back")]),   # goods stacked together, corner first
    SP("store-sacks", ["store", "kitchen", "work"], "wall", (2, 1), [("store", 0, 0, 1, 1, "base"), ("store", 1, 0, 1, 1, "back")]),
    SP("barrel-corner", ["store", "kitchen", "outdoor", "work", "tavern"], "corner", (1, 1), [("store", 0, 0, 1, 1, "base")]),
    SP("court-bench", ["outdoor"], "wall", (3, 1), [("seat", 0, 0, 2, 1, "base"), ("plant", 2, 0, 1, 1, "back")]),
    SP("court-planter", ["outdoor"], "corner", (1, 1), [("plant", 0, 0, 1, 1, "base")]),
    # holding
    SP("cell-cot", ["cell"], "wall", (2, 2), [("bed", 0, 0, 1, 2, "base"), ("store", 1, 0, 1, 1, "back")]),
    SP("paid-cell", ["cell"], "wall", (3, 2), [("bed", 0, 0, 2, 2, "base"), ("table", 2, 0, 1, 1, "back"), *on("light")]),
    SP("stocks-and-bench", ["passage", "hall", "study"], "wall", (3, 1), [("seat", 0, 0, 2, 1, "base"), ("chest", 2, 0, 1, 1, "back")]),
    SP("guard-table", ["passage", "study"], "centre", (2, 2), [("table", 0, 0, 1, 1, "base"), ("seat", 1, 0, 1, 1, "face:base"), *on("light"), *on("clutter")]),
]
BY_ID = {sp["id"]: sp for sp in SET_PIECES}


def fitting(kind, role, trade, band, prefers):
    """The set pieces a room can take, best first: preferred (a side purpose's), then the owner's trade, then the rest."""
    out = []
    for sp in SET_PIECES:
        if kind not in sp["kinds"]: continue
        if sp["roles"] and role not in sp["roles"]: continue
        if sp["bands"] and band not in sp["bands"]: continue
        if sp["trades"] and not (trade and re.search(sp["trades"], trade, re.I)): continue
        score = (100 if sp["id"] in prefers else 0) + (50 if sp["trades"] else 0) + (10 if sp["kinds"][0] == kind else 0)
        out.append((-score, len(out), sp))
    return [sp for _, _, sp in sorted(out)]
