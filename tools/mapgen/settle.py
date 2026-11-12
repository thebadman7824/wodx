"""The settlement behind a generated town: who lives there in the year asked for, how the households are tied to
one another, and one record of the whole place for the Storyteller to review in Foundry (WoDX NPC's Settlements).

The medieval generator gives every building a household of roles (ddtown.py, organic.py). That holds from 1197 to
about 1780. From 1781 this file gives every household the trades and the make-up of its own age instead: the
schoolmaster and the postmaster arrive, then the mill hands, the gendarme and the stationmaster, the national
committee and the co-operative farm, the commuters, and the contract workers of the World of Future Darkness.

Everything here is a house rule for WoDX (PENDING-REVIEW): the ages, the trades in each, the share of each kind of
household and the ties. The ages follow the Bohemian crown lands: the school reform of 1774 and the Toleration and
serfdom patents of 1781, the end of the guilds in 1859, the republic of 1918, February 1948, November 1989.
"""
import json, math, random, re

# (first year, key): the age a year falls in
AGES = [(0, "medieval"), (1450, "early"), (1781, "reform"), (1851, "industrial"), (1919, "republic"), (1948, "socialist"), (1990, "modern"), (2030, "future")]
ORDER = [k for _, k in AGES]


def age_of(year):
    y = year or 1197
    return [k for f, k in AGES if f <= y][-1]


def since(age, first):
    return ORDER.index(age) >= ORDER.index(first)


# ------------------------------------------------------------------ trades
# What the head of a household does, by the kind of building and the age. Each list is drawn from in turn, so a town
# gets a spread before any trade comes twice.
SMITH = {"reform": "smith", "industrial": "smith", "republic": "smith", "socialist": "machine fitter", "modern": "car mechanic", "future": "repair technician"}
BAKER = {"reform": "baker", "industrial": "baker", "republic": "baker", "socialist": "baker", "modern": "baker", "future": "baker"}
INN = {"reform": "innkeeper", "industrial": "innkeeper", "republic": "innkeeper", "socialist": "pub manager", "modern": "publican", "future": "bartender"}
FARM = {"reform": "farmer", "industrial": "farmer", "republic": "farmer", "socialist": "co-operative farm worker", "modern": "farmer", "future": "farm technician"}
CRAFT = {
    "reform": ["weaver", "carpenter", "cooper", "shoemaker", "tailor", "potter", "tanner", "wheelwright", "linen bleacher", "glazier"],
    "industrial": ["carpenter", "shoemaker", "tailor", "tinsmith", "cooper", "wheelwright", "locksmith", "bookbinder", "saddler", "clockmaker"],
    "republic": ["carpenter", "shoemaker", "tailor", "locksmith", "electrician", "motor mechanic", "printer", "plumber", "upholsterer", "radio repairer"],
    "socialist": ["joiner", "machine fitter", "electrician", "plumber", "shoe repairer", "television repairer", "tailor", "welder"],
    "modern": ["joiner", "electrician", "plumber", "car mechanic", "builder", "computer repairer", "tiler", "locksmith"],
    "future": ["repair technician", "printer operator", "drone mechanic", "electrician", "salvager", "implant fitter"],
}
SHOP = {
    "reform": ["grocer", "draper", "butcher", "chandler", "ironmonger", "apothecary", "tobacconist", "haberdasher"],
    "industrial": ["grocer", "draper", "butcher", "ironmonger", "apothecary", "tobacconist", "stationer", "confectioner", "milliner", "greengrocer"],
    "republic": ["grocer", "butcher", "draper", "chemist", "tobacconist", "stationer", "confectioner", "ironmonger", "hairdresser", "photographer"],
    "socialist": ["shop manager", "butcher", "greengrocer", "hairdresser", "chemist", "newsagent", "shop assistant"],
    "modern": ["shopkeeper", "butcher", "hairdresser", "pharmacist", "newsagent", "florist", "phone shop keeper", "estate agent"],
    "future": ["shopkeeper", "pharmacist", "street vendor", "pawnbroker", "phone shop keeper", "hairdresser"],
}
# Ordinary homes, by how well the house is kept: (trade, weight)
HOME = {
    "reform": {"rich": [("merchant", 3), ("estate steward", 2), ("brewer", 2), ("physician", 1), ("cloth factor", 2)],
               "middling": [("farmer", 4), ("weaver", 4), ("carter", 2), ("miller's hand", 1), ("clerk", 1), ("shoemaker", 1), ("tailor", 1)],
               "poor": [("day labourer", 5), ("spinner", 4), ("cottager", 3), ("herder", 1), ("widowed spinner", 2), ("pedlar", 1)]},
    "industrial": {"rich": [("mill owner", 2), ("merchant", 3), ("physician", 2), ("lawyer", 2), ("brewer", 1), ("engineer", 1)],
                   "middling": [("clerk", 3), ("railwayman", 2), ("foreman", 2), ("farmer", 3), ("teacher", 1), ("carter", 2), ("weaver", 2), ("mason", 1)],
                   "poor": [("mill hand", 6), ("day labourer", 4), ("washerwoman", 2), ("seamstress", 2), ("carter", 1), ("widow", 1), ("bricklayer", 2)]},
    "republic": {"rich": [("factory owner", 2), ("merchant", 2), ("physician", 2), ("lawyer", 2), ("engineer", 2), ("bank manager", 1)],
                 "middling": [("clerk", 4), ("railwayman", 2), ("teacher", 2), ("foreman", 2), ("farmer", 2), ("driver", 2), ("postal clerk", 1), ("shop assistant", 2)],
                 "poor": [("factory hand", 6), ("labourer", 3), ("seamstress", 2), ("washerwoman", 1), ("pensioner", 2), ("bricklayer", 2), ("unemployed", 2)]},
    "socialist": {"rich": [("works director", 2), ("physician", 2), ("engineer", 3), ("national committee official", 2)],
                  "middling": [("factory worker", 6), ("clerk", 3), ("teacher", 2), ("driver", 2), ("nurse", 2), ("engineer", 1), ("railwayman", 1), ("shop assistant", 2),
                               ("co-operative farm worker", 2), ("pensioner", 3)],
                  "poor": [("factory worker", 5), ("labourer", 3), ("pensioner", 4), ("cleaner", 2), ("co-operative farm worker", 2)]},
    "modern": {"rich": [("business owner", 3), ("physician", 2), ("lawyer", 2), ("manager", 3), ("developer", 1)],
               "middling": [("office worker", 5), ("factory worker", 3), ("teacher", 2), ("driver", 2), ("nurse", 2), ("builder", 2), ("shop assistant", 2), ("pensioner", 4),
                            ("programmer", 1), ("student", 1)],
               "poor": [("pensioner", 5), ("warehouse worker", 3), ("unemployed", 3), ("cleaner", 2), ("labourer", 2), ("care worker", 1)]},
    "future": {"rich": [("company manager", 3), ("physician", 2), ("lawyer", 1), ("data broker", 2), ("landlord", 2)],
               "middling": [("contract worker", 5), ("technician", 3), ("nurse", 2), ("teacher", 1), ("driver", 1), ("security guard", 2), ("pensioner", 3), ("programmer", 2)],
               "poor": [("day contractor", 5), ("unemployed", 4), ("pensioner", 3), ("warehouse worker", 2), ("salvager", 2), ("cleaner", 2), ("courier", 2)]},
}
# A building kind that names its own trade: type or label (lower case) -> trade by age, or one trade for every age
BY_TYPE = {
    "smithy": SMITH, "bakehouse": BAKER, "tavern": INN, "pub": INN, "post-inn": INN, "counter-bar": INN, "coffeehouse": "coffeehouse keeper",
    "byre-house": FARM, "corner-shop": "shopkeeper", "cdda-bar": INN,
}
# A building nobody lives in as a family has a keeper on the premises and staff who come in to work
KEEPER = {
    "town-gaol": "gaoler", "lazar-house": "hospital warden", "charnel-house": "sexton", "monastery-library": "librarian", "counting-house": "bookkeeper",
    "old-synagogue": "rabbi", "granary": "granary keeper", "general-hospital": "hospital porter", "cemetery-chapel": "gravedigger", "museum-hall": "curator",
    "goods-shed": "goods clerk", "gendarmerie": "gendarme", "savings-bank": "bank manager", "grand-hotel": "hotel manager", "waterworks": "waterworks engineer",
    "dance-hall": "dance hall keeper", "public-library": "librarian", "hospital-entrance": "hospital porter", "cdda-bank": "bank manager", "cdda-library": "librarian",
    "cdda-funeral-home": "undertaker", "cdda-museum": "curator", "cdda-art-gallery": "gallery owner", "cdda-police-station": "police officer", "cdda-church": "priest",
    "cdda-country-church": "priest", "cdda-cathedral": "priest", "cdda-synagogue": "rabbi", "cdda-warehouse": "warehouse keeper", "cdda-empty-warehouse": "watchman",
    "cdda-sewer-station": "pump attendant", "cdda-hospital": "hospital porter", "cdda-motel": "motel keeper", "cdda-music-club": "club owner", "school": "school caretaker",
    "mill": "mill watchman", "manufactory": "manufactory master", "dept-store": "store manager", "culture-house": "caretaker", "hypermarket": "store manager",
    "town-hall": "town hall caretaker", "prayer-house": "pastor", "bus-station": "ticket clerk", "distribution-shed": "shift manager", "street-clinic": "medic",
    "security-post": "security guard", "data-hall": "technician", "pod-station": "station attendant", "vertical-farm": "farm technician", "hut": "caretaker",
    "petrol-station": "petrol station keeper", "coop-store": "shop manager", "vending-hall": "vending hall keeper",
}
STAFFED = {"gendarmerie": (1, 2), "cdda-police-station": (2, 4), "general-hospital": (2, 4), "cdda-hospital": (3, 5), "school": (2, 4), "mill": (0, 0), "dept-store": (2, 4),
           "hypermarket": (2, 4), "grand-hotel": (2, 4), "savings-bank": (1, 2), "cdda-bank": (1, 3), "town-hall": (1, 3), "street-clinic": (1, 2), "security-post": (1, 2)}
HOMES = {"byre-house", "cottage", "townhouse", "workshop", "smithy", "bakehouse", "tavern"}
KEEPS = re.compile(r"priest|rabbi|almshouse|miller$|ferryman|sexton|hermit|stationmaster")   # trades that stay as the generator gave them
# Who a town has by office in each age: (trade, the smallest size that has one, wealth of the house they take)
SIZES = ["village", "town", "city", "metropolis"]
NOTABLES = {
    "reform": [("reeve", 0, "rich"), ("schoolmaster", 0, "middling"), ("postmaster", 1, "middling"), ("physician", 1, "rich"), ("magistrate's clerk", 1, "middling"), ("surgeon", 2, "middling")],
    "industrial": [("mayor", 0, "rich"), ("schoolteacher", 0, "middling"), ("gendarme", 1, "middling"), ("postmaster", 1, "middling"), ("physician", 1, "rich"),
                   ("notary", 2, "rich"), ("newspaper editor", 2, "middling")],
    "republic": [("mayor", 0, "rich"), ("schoolteacher", 0, "middling"), ("gendarme", 0, "middling"), ("postmaster", 1, "middling"), ("physician", 1, "rich"),
                 ("notary", 2, "rich"), ("journalist", 2, "middling")],
    "socialist": [("national committee chairman", 0, "middling"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("co-operative farm chairman", 0, "middling"),
                  ("district doctor", 1, "middling"), ("Party secretary", 1, "middling"), ("postal clerk", 1, "middling"), ("journalist", 2, "middling")],
    "modern": [("mayor", 0, "middling"), ("schoolteacher", 0, "middling"), ("police officer", 1, "middling"), ("doctor", 1, "rich"), ("postal clerk", 1, "middling"),
               ("journalist", 2, "middling")],
    "future": [("district manager", 0, "rich"), ("security guard", 0, "middling"), ("teacher", 1, "middling"), ("clinic medic", 1, "middling"), ("journalist", 2, "poor")],
}
# Trades that go out to work, and the kind of building that takes them on (the tie "works at")
WORKS = [(re.compile(r"mill hand|factory hand|factory worker|foreman|machine fitter|welder"), ("mill", "manufactory", "dept-store")),
         (re.compile(r"warehouse worker|courier|day contractor|contract worker"), ("distribution-shed", "cdda-warehouse", "hypermarket", "data-hall", "vertical-farm")),
         (re.compile(r"shop assistant"), ("dept-store", "hypermarket", "coop-store")), (re.compile(r"nurse|care worker|medic"), ("cdda-hospital", "general-hospital", "hospital-entrance", "street-clinic")),
         (re.compile(r"teacher|schoolmaster"), ("school",)), (re.compile(r"railwayman"), ("Railway station",)), (re.compile(r"police|gendarme"), ("gendarmerie", "cdda-police-station")),
         (re.compile(r"technician|programmer"), ("data-hall", "vertical-farm")), (re.compile(r"clerk$|office worker"), ("town-hall", "savings-bank", "cdda-bank", "counting-house"))]
# The make-up of a household by age: chance of a partner, numbers of children to draw from, chance of an elder,
# of a servant by wealth, of an apprentice in a craft, of a lodger, and of someone living alone
COMP = {
    "reform": dict(partner=.8, kids=(0, 1, 1, 2, 2, 3, 3, 4), elder=.25, servant={"rich": .9, "middling": .3}, apprentice=.6, lodger=.1, alone=.04),
    "industrial": dict(partner=.8, kids=(0, 1, 2, 2, 3, 3, 4, 5), elder=.2, servant={"rich": .9, "middling": .25}, apprentice=.4, lodger=.25, alone=.05),
    "republic": dict(partner=.78, kids=(0, 1, 1, 2, 2, 3), elder=.2, servant={"rich": .6, "middling": .08}, apprentice=.3, lodger=.15, alone=.08),
    "socialist": dict(partner=.8, kids=(0, 1, 2, 2, 2, 3), elder=.2, servant={}, apprentice=0, lodger=.03, alone=.12),
    "modern": dict(partner=.65, kids=(0, 0, 1, 1, 2, 2, 3), elder=.08, servant={}, apprentice=0, lodger=.06, alone=.2),
    "future": dict(partner=.55, kids=(0, 0, 0, 1, 1, 2), elder=.1, servant={}, apprentice=0, lodger=.2, alone=.3),
}
ALONE = re.compile(r"pensioner|widow|student|unemployed")
CRAFTS = {t for ts in CRAFT.values() for t in ts} | {"smith", "baker"}


def _draw(R, pairs):
    total = sum(w for _, w in pairs)
    x = R.random() * total
    for v, w in pairs:
        x -= w
        if x <= 0: return v
    return pairs[-1][0]


def _role(b, types):
    return types.get(b.type, {}).get("role", "home")


def _base(type_key):
    return type_key.rstrip("0123456789").rstrip("-") if type_key.startswith("cdda-") else type_key


def lived_in(b, types):
    """Is this a building a family lives in (a house, a shop with rooms, an inn, a block of flats)?"""
    if b.type in HOMES or _base(b.type) in ("cdda-mansion", "burgher-palace"): return True
    if _base(b.type) in KEEPER: return False
    d = types.get(b.type, {})
    return d.get("place") in ("home", "tavern") or d.get("role") in ("home", "shop", "inn")


def trade_for(b, old, age, R, turn, types):
    """The trade of the household in building b in this age. old: the trade the generator gave it."""
    if KEEPS.search(old or ""): return old
    key = b.type if b.type in BY_TYPE else _base(b.type) if _base(b.type) in BY_TYPE else None
    if key:
        v = BY_TYPE[key]
        if isinstance(v, dict): return v[age]
        if v: return v
    wealth = getattr(b, "wealth", None) or "middling"
    role = "shop" if b.type == "townhouse" else "craft" if b.type == "workshop" else _role(b, types)
    if role == "craft":
        turn["craft"] += 1
        return CRAFT[age][(turn["craft"] - 1) % len(CRAFT[age])]
    if role == "shop":
        turn["shop"] += 1
        return SHOP[age][(turn["shop"] - 1) % len(SHOP[age])]
    if role == "inn": return INN[age]
    return _draw(R, HOME[age].get(wealth) or HOME[age]["middling"])


def roles_for(trade, b, age, R):
    """The people of one household, as roles, for the age."""
    c = COMP[age]
    wealth = getattr(b, "wealth", None) or "middling"
    if ALONE.search(trade) and R.random() < .5: return [trade]
    if R.random() < c["alone"]: return [trade]
    roles = [trade]
    if R.random() < c["partner"]: roles.append("partner")
    roles += ["child"] * R.choice(c["kids"])
    if R.random() < c["elder"]: roles.append("elder")
    if R.random() < c["servant"].get(wealth, 0): roles.append("servant")
    if trade in CRAFTS and R.random() < c["apprentice"]: roles.append("apprentice")
    if trade in ("farmer",) and age in ("reform", "industrial", "republic") and R.random() < .35: roles.append("farmhand")
    if R.random() < c["lodger"] * (1.5 if wealth == "poor" else 1): roles.append("lodger")
    return roles


def repeople(t, types):
    """From 1781, every household gets the trade and the make-up of the town's year. Earlier towns are left as the
    medieval generator made them. Its own random source, so the map itself is the same with or without this."""
    age = age_of(t.year)
    if not since(age, "reform"): return age
    R = random.Random(f"{t.seed}:{t.year}:people")
    byk = {b.key: b for b in t.blds}
    turn = {"craft": 0, "shop": 0}
    for h in t.households:
        b = byk.get(h["building"])
        if not b: continue
        if b.label == "Almshouse" and age in ("reform", "industrial", "republic"): continue
        if b.label == "Railway station":
            continue
        if not lived_in(b, types):                            # a keeper on the premises, and the staff who come in
            if any(o is not h and o["building"] == h["building"] and o.get("kept") for o in t.households): h["drop"] = True; continue
            trade = KEEPER.get(_base(b.type), "caretaker")
            if trade == "gendarme" and since(age, "socialist"): trade = "police officer"
            lo, hi = STAFFED.get(_base(b.type), (0, 2))
            h["trade"], h["people"], h["kept"] = trade, [{"role": trade}] + [{"role": "staff"}] * R.randint(lo, hi), True
            h["wealth"] = getattr(b, "wealth", None) or h.get("wealth") or "middling"
            continue
        trade = trade_for(b, h.get("trade", ""), age, R, turn, types)
        if KEEPS.search(trade) and trade == h.get("trade"):
            roles = [p["role"] for p in h["people"]]
            if re.search(r"priest", trade): roles = [trade] + (["housekeeper"] if since(age, "industrial") and R.random() < .6 else [r for r in roles[1:] if r in ("servant", "clerk")])
        else:
            roles = roles_for(trade, b, age, R)
        h["trade"], h["people"] = trade, [{"role": r} for r in roles]
        h["wealth"] = getattr(b, "wealth", None) or h.get("wealth") or "middling"
    t.households[:] = [h for h in t.households if not h.pop("drop", False)]
    for h in t.households: h.pop("kept", None)
    # the offices of the age, each given to a household in an ordinary home of the right standing
    k = SIZES.index(t.size) if t.size in SIZES else 0
    homes = [h for h in t.households if h["building"] in byk and _role(byk[h["building"]], types) == "home" and not KEEPS.search(h["trade"])
             and lived_in(byk[h["building"]], types)
             and byk[h["building"]].type not in BY_TYPE and types.get(byk[h["building"]].type, {}).get("flats", 1) == 1]
    R.shuffle(homes)
    t.notables = []
    for trade, least, wealth in NOTABLES[age]:
        if k < least: continue
        pick = next((h for h in homes if h.get("wealth") == wealth), None) or (homes[0] if homes else None)
        if not pick: break
        homes.remove(pick)
        pick["trade"] = trade
        pick["people"] = [{"role": r} for r in roles_for(trade, byk[pick["building"]], age, R)]
        t.notables.append({"role": trade, "household": pick["id"]})
    return age


# ------------------------------------------------------------------ ties
def ties(t, types):
    """Who is tied to whom, household to household: kin in another house, a rival in the same trade, a debt, a friend
    or a feud next door, and the workplace a trade goes out to. A kind says what the second household is to the first
    (WoDX NPC's settlement-rules.mjs TIE_KINDS)."""
    R = random.Random(f"{t.seed}:{t.year}:ties")
    age = age_of(t.year)
    byk = {b.key: b for b in t.blds}
    hs = [h for h in t.households if h["building"] in byk]
    if len(hs) < 2: return []
    at = {h["id"]: byk[h["building"]].centre for h in hs}
    out, seen = [], set()

    def add(a, b, kind, note):
        k = (min(a["id"], b["id"]), max(a["id"], b["id"]), kind)
        if a["id"] == b["id"] or k in seen: return
        seen.add(k); out.append({"a": a["id"], "b": b["id"], "kind": kind, "note": note})

    def near(h, n=4):
        return sorted((o for o in hs if o["building"] != h["building"]), key=lambda o: math.dist(at[h["id"]], at[o["id"]]))[:n]

    kin_share = {"medieval": .35, "early": .35, "reform": .35, "industrial": .3, "republic": .25, "socialist": .2, "modern": .1, "future": .05}[age]
    for h in hs:
        if R.random() < kin_share:
            o = R.choice(hs)
            if R.random() < .5: add(h, o, "sibling", "brothers or sisters")
            else: add(h, o, "child", "a grown child with a house of their own")
        if R.random() < .15:
            o = R.choice(near(h))
            add(h, o, "friend", "neighbours who help each other")
        elif R.random() < .05:
            o = R.choice(near(h))
            add(h, o, "rival", R.choice(["a quarrel over a boundary", "an old insult", "a broken promise", "a quarrel over an inheritance"]))
    by_trade = {}
    for h in hs: by_trade.setdefault(h["trade"], []).append(h)
    for trade, group in by_trade.items():
        if len(group) < 2 or len(group) > 6 or trade in ("pensioner", "unemployed", "labourer", "day labourer", "cottager"): continue
        if not (trade in CRAFTS or any(trade in v for v in SHOP.values()) or any(trade == v for v in INN.values()) or trade in ("alehouse keeper", "smith", "baker")
                or re.search(r"draper|spicer|cutler|saddler|glover|butcher|fishmonger|goldsmith|mercer|salter|carpenter|cooper|weaver|potter|tanner|cobbler|chandler|wheelwright|turner|dyer", trade)): continue
        for a, b in zip(group, group[1:]):
            if R.random() < .5: add(a, b, "rival", f"both in the {trade}'s trade")
    rich = [h for h in hs if h.get("wealth") == "rich" or re.search(r"innkeeper|alehouse|grocer|merchant|shopkeeper|publican|pawnbroker|landlord", h["trade"])]
    for h in hs:
        if h.get("wealth") == "poor" and rich and R.random() < .12:
            add(h, R.choice(rich), "owes", R.choice(["rent in arrears", "a loan not yet repaid", "credit at the counter"]))
    # the place a trade goes out to work at: the nearest building of the right kind
    for h in hs:
        for rx, kinds in WORKS:
            if not rx.search(h["trade"]): continue
            spots = [b for b in t.blds if (b.type.rstrip("-0123456789") in kinds or b.type in kinds or b.label in kinds) and b.key != h["building"]]
            if spots:
                b = min(spots, key=lambda b: math.dist(at[h["id"]], b.centre))
                out.append({"a": h["id"], "place": b.key, "kind": "works-at", "note": b.label})
            break
    return out


# ------------------------------------------------------------------ the record
def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("ü", "u").replace("ö", "o").replace("ä", "a")).strip("-")


def settlement_id(t):
    return f"{slug(t.name)}-{t.year or 1197}-{t.seed}"


def stamp(t):
    """Marks every household with the settlement it belongs to, so two towns never share a household id: the
    settlement's id, a full stop, the household's own id (the characters WoDX Interactables takes in an id)."""
    sid = settlement_id(t)
    ren = {}
    for h in t.households:
        if not h["id"].startswith(sid + "."):
            ren[h["id"]] = f"{sid}.{h['id']}"
            h["id"] = ren[h["id"]]
    for n in getattr(t, "notables", []): n["household"] = ren.get(n["household"], n["household"])
    return sid


# The part of the world these tables describe. The building types, the ages and their boundaries, the trades and the
# offices are those of Moravia and the Bohemian crown lands. WoDX covers the whole world: another region needs its own
# building types (buildings.py, eratypes.py, latertypes.py), ages (AGES) and trade tables, and is not built yet.
REGION = "moravia"
REGIONS = (REGION,)


def record(t, parts_index, types, era, where=None):
    """The settlement record: everything the Storyteller reviews before the place enters the world."""
    byk = {b.key: b for b in t.blds}
    part_of = {}
    for p in parts_index:
        for hid in p["household_ids"]: part_of[hid] = p["id"]
    hs = []
    for h in t.households:
        b = byk.get(h["building"])
        if not b: continue
        hs.append({"id": h["id"], "building": h["building"], "label": h["label"], "type": b.type, "trade": h["trade"], "wealth": h.get("wealth") or getattr(b, "wealth", None) or "middling",
                   "people": [p["role"] for p in h["people"]], "map": part_of.get(h["id"], ""), "at": [round(b.centre[0], 1), round(b.centre[1], 1)]})
    trades, kinds = {}, {}
    for h in hs: trades[h["trade"]] = trades.get(h["trade"], 0) + 1
    for b in t.blds:
        k = b.label.split(" (")[0]
        kinds[k] = kinds.get(k, 0) + 1
    return {"format": "wodx-settlement", "version": 1, "id": settlement_id(t), "name": t.name, "seed": t.seed, "kind": t.size, "label": t.cfg["label"],
            "year": t.year or 1197, "era": era, "age": age_of(t.year), "region": REGION, "walled": bool(getattr(t, "wall", None)), "country": where,
            "population": sum(len(h["people"]) for h in hs), "whole": [t.cols, t.rows],
            "maps": [{"id": p["id"], "name": p["name"], "map": p["map"], "sidecar": p["sidecar"], "households": len(p["household_ids"])} for p in parts_index],
            "layers": list(getattr(t, "layers", [])), "buildings": dict(sorted(kinds.items())), "trades": dict(sorted(trades.items(), key=lambda kv: (-kv[1], kv[0]))),
            "notables": list(getattr(t, "notables", [])), "households": hs, "ties": ties(t, types)}


def write(path, rec):
    json.dump(rec, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
