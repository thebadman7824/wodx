"""Why each building exists: its main purpose, and the other chances it gives its owner (side purposes). A burgher's
palace is a home and a place of trade, but it is also there to show wealth, to make rivals feel small and to win
clients over; its front rooms are furnished for that. Each side purpose names the rooms it lifts (one tier step
each), the set pieces it prefers, and the rooms it wants left open.

Room roles: front (where visitors are shown), work (where the trade is done), private (the household's own rooms),
service (kitchens, stores, servants). From the room's kind, then how far it is from the street door."""
import re

# room kinds, by the words in a room's name (first match wins)
KINDS = [
    ("outdoor", r"Yard|Court|Garden|Gateway|Porch|Carriage way|Arcade|Loading|Pen\b|Paddock|Lot\b|Field"),
    ("bath", r"Bath|Toilet|Wash|Wet room|Shower"),
    ("kitchen", r"Kitchen|Bakehouse|Bakery|Brewhouse|Scullery|Cook"),
    ("store", r"Store|Cellar|Barn|Byre|Stable|Granary|Loft|Shed|Vault|Warehouse|Larder|Pantry|Crypt|Coffin|Bone|Coop|"
              r"Garage|Stock|Plant room|Boiler|Server hall|Water plant|Engine|Packing"),
    ("cell", r"(?<!Librarian's )\bCells?\b|Holding|Lock-up|Second cell"),
    ("worship", r"Nave|Chancel|Chapel|Prayer|Women's section|Altar"),
    ("tavern", r"Taproom|Bar\b|Restaurant|Café|Club|Dance|Card room|Lounge|Beer"),
    ("shop", r"Shop|Sales|Counter|Banking hall|Ticket|Market"),
    ("study", r"Study|Office|Counting|Library|Clerk|Chancery|Archive|Scriptorium|Desk|Reading|Stacks|Librarian|Classroom|"
              r"Control|Council|Court room|Director"),
    ("work", r"Workshop|Forge|Smithy|Weaving|Spinning|Mill|Press|Growing|Surgery|Treatment|Mortuary|Recovery|Stage|Smith"),
    ("ward", r"Ward|Dormitory|Capsule|Quarters|Locker"),
    ("sleep", r"Bed|Chamber|Guest|Sleeping|Solar|Dressing"),
    ("passage", r"Corridor|Passage|Stair|Entry|Entrance|Vestibule|Lift|Core|Porter|Lodge|Post\b|Guard|Concourse|Platform"),
    ("hall", r"Hall|Salon|Dining|Lobby|Foyer|Gallery|Waiting|Living|Front room|Parlour|Room|Flat|Space|Cottage|Tower|Strongroom"),
]
_KINDS = [(k, re.compile(rx)) for k, rx in KINDS]
SERVICE_WORDS = re.compile(r"Servant|Porter|Kitchen|Scullery|Staff|Drivers|Orderly|Service|Boiler|Plant")

def kind_of_name(name):
    if "Strongroom" in name: return "store"
    return next((k for k, rx in _KINDS if rx.search(name)), "hall")

ROLE_OF_KIND = {"kitchen": "service", "store": "service", "bath": "private", "sleep": "private", "ward": "private",
                "study": "work", "work": "work", "shop": "front", "tavern": "front", "worship": "front", "cell": "work",
                "outdoor": "front", "passage": "front", "hall": None}


def S(id_, lifts, prefers=(), steps=1):
    return {"id": id_, "lifts": lifts, "prefers": list(prefers), "steps": steps}

SHOW_WEALTH = S("show-wealth", r"Salon|Hall|Dining|Gallery|Stair|Entrance|Foyer|Front", ["plate-display", "portrait-wall", "carpet-and-chairs"])
GOSSIP = S("gather-gossip", r"Taproom|Bar|Lounge|Café|Club|Card", ["corner-booth", "fireside-seats"])
SHOW_HOUSE = S("show-the-house", r"Taproom|Restaurant|Dining|Lounge|Foyer|Lobby", ["hearth-and-settle", "long-table"])
AWE = S("awe-the-faithful", r"Nave|Chancel|Prayer|Chapel", ["altar-and-candles", "pews"], 2)
PATRONS = S("show-the-patrons", r"Nave|Chancel|Chapel", ["tomb-and-gift"])
WARN = S("warn-the-street", r"Guard|Office|Entrance|Gaoler|Warden|Post", ["stocks-and-bench"])
SQUEEZE = S("squeeze-the-prisoners", r"Second cell|Cell", ["paid-cell"])
SOLID = S("look-solid", r"Banking|Counting|Counter|Strongroom|Hall", ["strong-counter", "ledger-desk"])
TEMPT = S("tempt-buyers", r"Shop|Sales|Counter", ["shop-display", "counter-and-goods"])
GUESTS = S("impress-guests", r"Foyer|Lobby|Restaurant|Dining|Lounge|Salon", ["carpet-and-chairs", "plate-display"])
CIVIC = S("show-civic-power", r"Council|Hall|Court room", ["council-table", "portrait-wall"])
COLLECTION = S("show-the-collection", r"Hall|Gallery", ["display-cases"], 2)
MOURNERS = S("comfort-mourners", r"Chapel|Room|Hall|Waiting", ["fireside-seats"])

MAIN_OF_FILL = {"home": "home", "workshop": "work", "office": "office", "shop": "trade", "armory": "guard", "storage": "storage",
                "church": "worship"}

def P(main, side=(), open_floor=None, show_off=False):
    return {"main": main, "side": list(side), "open_floor": open_floor, "show_off": show_off}

PURPOSES = {
    "burgher-palace": P("home and trade", [SHOW_WEALTH, S("intimidate", r"Salon|Dining", ["long-table", "portrait-wall"]),
                                           S("impress-clients", r"Salon|Dining|Counting", ["plate-display", "ledger-desk"])], show_off=True),
    "townhouse": P("home and trade", [SHOW_WEALTH], show_off=True), "baroque-house": P("home", [SHOW_WEALTH], show_off=True),
    "sgraffito-house": P("home and trade", [SHOW_WEALTH], show_off=True), "villa": P("home", [SHOW_WEALTH, GUESTS], show_off=True),
    "func-villa": P("home", [SHOW_WEALTH]), "cdda-mansion": P("home", [SHOW_WEALTH, GUESTS], show_off=True),
    "shop-house": P("home and trade", [TEMPT]), "passage-house": P("trade", [TEMPT]), "arcade-house": P("trade", [TEMPT]),
    "tavern": P("drink and lodging", [GOSSIP, SHOW_HOUSE]), "post-inn": P("lodging", [GOSSIP, SHOW_HOUSE]),
    "pub": P("drink", [GOSSIP]), "coffeehouse": P("drink and news", [GOSSIP]), "counter-bar": P("drink", [GOSSIP]),
    "cdda-bar": P("drink", [GOSSIP]), "cdda-bar-2": P("drink", [GOSSIP]), "cdda-music-club": P("music and drink", [GOSSIP], r"Dance|Stage"),
    "cdda-music-club-2": P("music and drink", [GOSSIP], r"Dance|Stage"), "dance-hall": P("dancing", [GOSSIP], r"Dance|Hall"),
    "chapel": P("worship", [AWE, PATRONS]), "cemetery-chapel": P("worship", [AWE, MOURNERS]), "cdda-church": P("worship", [AWE, PATRONS]),
    "cdda-church-2": P("worship", [AWE, PATRONS]), "cdda-country-church": P("worship", [AWE]), "cdda-cathedral": P("worship", [AWE, PATRONS]),
    "cdda-synagogue": P("worship", [AWE]), "old-synagogue": P("worship", [AWE]), "prayer-house": P("worship", [AWE]),
    "town-gaol": P("holding prisoners", [WARN, SQUEEZE]), "gendarmerie": P("policing", [WARN]), "guardhouse": P("guarding the gate", [WARN]),
    "cdda-police-station": P("policing", [WARN]), "cdda-police-station-2": P("policing", [WARN]), "cdda-police-station-3": P("policing", [WARN]),
    "savings-bank": P("banking", [SOLID]), "cdda-bank": P("banking", [SOLID]), "cdda-bank-2": P("banking", [SOLID]),
    "counting-house": P("trade and accounts", [SOLID, S("impress-clients", r"Counting|Hall", ["ledger-desk", "plate-display"])]),
    "grand-hotel": P("lodging", [GUESTS, SHOW_HOUSE]), "cdda-motel": P("lodging"), "town-hall": P("governing", [CIVIC]),
    "corner-shop": P("trade", [TEMPT]), "dept-store": P("trade", [TEMPT], r"Sales|Shop floor"), "hypermarket": P("trade", [TEMPT], r"Sales|Shop floor"),
    "vending-hall": P("trade", [TEMPT]), "museum-hall": P("showing the collection", [COLLECTION], r"Hall|Gallery"),
    "cdda-museum": P("showing the collection", [COLLECTION], r"Hall|Gallery"), "cdda-art-gallery": P("showing the collection", [COLLECTION], r"Gallery"),
    "cdda-funeral-home": P("burying the dead", [MOURNERS]), "barn": P("storage", open_floor=r"Barn floor|Threshing"),
    "granary": P("storage", open_floor=r"Granary floor"), "mill": P("milling"), "public-library": P("lending books", [S("quiet-study", r"Reading|Library", ["reading-tables"])]),
    "monastery-library": P("keeping books", [S("quiet-study", r"Scriptorium|Library", ["reading-tables"])]),
    "school": P("teaching", [S("order-and-discipline", r"Classroom", ["school-desks"])]), "culture-house": P("gathering", [CIVIC], r"Hall|Stage"),
}


def purpose_of(type_key, fill="home"):
    p = PURPOSES.get(type_key)
    if p is None and type_key:                                     # a numbered variant ("cdda-bank-3") takes its base's
        base = re.sub(r"-\d+$", "", type_key)
        p = PURPOSES.get(base)
    return p or P(MAIN_OF_FILL.get(fill, "home"))


def _touches(room, x, y, e=.05):
    return room.x - e <= x <= room.x + room.w + e and room.y - e <= y <= room.y + room.h + e


def room_roles(b):
    """{room name: role} for a placed building (buildings.Building)."""
    rooms = b.rooms
    bx, by, bw, bh = b.x, b.y, b.w, b.h
    on_edge = lambda x, y: abs(x - bx) < .05 or abs(x - bx - bw) < .05 or abs(y - by) < .05 or abs(y - by - bh) < .05
    doors = [(ox, oy) for kind, ox, oy, _ in b.openings if kind != "window"]
    links = {r.name: set() for r in rooms}
    start = set()
    for ox, oy in doors:
        at = [r for r in rooms if _touches(r, ox, oy)]
        if on_edge(ox, oy): start |= {r.name for r in at}
        for r in at:
            links[r.name] |= {q.name for q in at if q is not r}
    dist, todo = {n: 0 for n in start}, list(start)
    while todo:
        n = todo.pop(0)
        for m in links[n]:
            if m not in dist: dist[m] = dist[n] + 1; todo.append(m)
    roles = {}
    for r in rooms:
        k = kind_of_name(r.name)
        role = "service" if SERVICE_WORDS.search(r.name) and k != "shop" else ROLE_OF_KIND.get(k)
        if role is None: role = "front" if dist.get(r.name, 9) <= 2 else "private"
        roles[r.name] = role
    return roles
