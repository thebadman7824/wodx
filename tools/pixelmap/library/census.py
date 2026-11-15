"""The census of world objects (B6343): every kind of thing a WoDX map may hold, from 1197 to Future Darkness, with the
interactable tag it carries in the game, the years it belongs to, the places and rooms it belongs in, the wealth of
household that owns one, and the regional styles it is drawn in. This is the list the drawings are made from and the
list the placement logic (library/placing.py) reads; nothing is placed that is not here.

A row:  O(id, name, family, size, tag, years, where, wealth, styles, mount, note)
  size     "W x D" in feet, the usual one (the catalogue holds the allowed range)
  tag      the WoDX Interactables kind it is adopted as, "family:kind" (container:chest, hide:wardrobe, light:lantern,
           cover:table, hazard:brazier, sacred:altar, watch:mirror, climb:ladder, target:dummy, trap:pit, clue:document,
           mount:cart, opening:door, break:fragile|light|heavy|stone|iron), or "" for plain dressing
  years    "from-to" (a year, or "" for open), the years the thing is found at all
  where    "room weight, ..." rooms from ROOMS, or a kind of place meaning any room of it (weight 1 rare, 2 usual, 3 nearly always)
  wealth   "lo-hi" on WEALTH: who owns one
  styles   "*" for every region, else style families from STYLES that have their own kind of it
  mount    floor | wall | centre | outdoor | on (on a table or shelf) | opening | ceiling
"""
from collections import namedtuple

# the game's eras from the chronicle's start (modules/wodx-library/data/goods.mjs ERA_YEARS), each drawn on its own
ERAS = [("dark-ages", 1197, 1346, "Dark Ages"), ("long-night", 1347, 1449, "Long Night"), ("renaissance", 1450, 1600, "Renaissance"),
        ("age-of-reason", 1601, 1836, "Age of Reason"), ("victorian", 1837, 1901, "Victorian"), ("great-war", 1902, 1918, "Great War"),
        ("mid-century", 1919, 1989, "Mid-Century"), ("modern", 1990, 2009, "Modern"), ("future-darkness", 2010, 2200, "Future Darkness")]
ERA_NOTE = "Time of Judgment (2004) draws as Modern, the Time of Future Judgement as Future Darkness; the Wild West is the frontier look of Victorian."

# who owns it: the household's means, set against the Resources Background (wodx-library VALUES)
WEALTH = {0: "destitute", 1: "poor", 2: "modest", 3: "comfortable", 4: "rich", 5: "princely"}

# regional styles: each world region (wodx-chronicle WORLD_REGIONS) draws its things in one family's manner
STYLES = {
    "central": ("Central Europe", ["moravia", "german-lands", "poland-baltic", "carpathians-balkans"]),
    "atlantic": ("Atlantic Europe", ["british-isles", "france", "low-countries"]),
    "northern": ("Northern Europe and Russia", ["scandinavia", "russia"]),
    "mediterranean": ("The Mediterranean", ["iberia", "italy", "aegean"]),
    "islamic": ("The Islamic world", ["anatolia", "levant", "egypt", "arabia", "maghreb", "persia"]),
    "steppe": ("The steppe and high Asia", ["central-asia", "tibet-himalaya"]),
    "southasia": ("South Asia", ["india"]),
    "eastasia": ("East Asia", ["china", "japan", "korea"]),
    "seasia": ("Southeast Asia and the islands", ["southeast-asia", "nusantara", "philippines"]),
    "africa": ("Africa south of the Sahara", ["west-africa", "east-africa", "southern-africa", "central-africa"]),
    "americas": ("The Americas", ["canada", "north-america-east", "north-america-west", "mexico", "caribbean", "andes", "brazil", "southern-cone"]),
    "oceania": ("Oceania", ["australia", "aotearoa", "pacific-islands"]),
    "polar": ("The far north and south", ["siberia", "arctic", "antarctica"]),
}
# the Americas and Oceania draw in their own peoples' manner until settlers' goods arrive, then in the settlers' style
SETTLED = {"americas": [(1500, "mediterranean", ["mexico", "caribbean", "andes", "brazil", "southern-cone"]), (1607, "atlantic", ["canada", "north-america-east", "north-america-west"])],
           "oceania": [(1788, "atlantic", ["australia", "aotearoa"])]}

# rooms of each kind of place (wodx-npc PLACE_KINDS), each the unit the placement logic furnishes
ROOMS = {
    "home": ["hall", "kitchen", "chamber", "parlour", "nursery", "store", "cellar", "privy", "yard", "garden", "loft"],
    "workplace": ["shop", "workshop", "counting", "store", "yard"],
    "church": ["nave", "chancel", "sacristy", "tower", "crypt", "churchyard", "cloister", "scriptorium", "almshouse"],
    "mosque": ["prayerhall", "ablution", "courtyard", "madrasa"],
    "synagogue": ["prayerhall", "study", "mikveh"],
    "temple": ["shrinehall", "courtyard", "monks", "garden"],
    "tavern": ["taproom", "kitchen", "guestroom", "cellar", "stable", "yard"],
    "haven": ["resting", "hall", "study", "cellar", "feeding"],
    "gate": ["guardroom", "barracks", "armoury", "cell", "yard"],
    "market": ["square", "stalls"],
    "street": ["street"],
    "castle": ["greathall", "solar", "chapel", "kitchen", "armoury", "dungeon", "treasury", "bailey", "stable"],
    "wilds": ["woods", "field", "camp", "riverbank"],
    "caern": ["caern"],
    "alley": ["alley"],
    "yard": ["farmyard", "stable", "barn", "pen"],
    "docks": ["quay", "warehouse", "boat"],
    "park": ["park", "churchyard"],
    "sewer": ["tunnel", "cellar"],
    "hospital": ["ward", "surgery", "office", "cell", "morgue"],
    "station": ["platform", "hall", "office", "depot"],
    "elysium": ["salon", "gallery", "hall"],
    "chantry": ["library", "laboratory", "sanctum", "hall"],
    "office": ["office", "archive", "reception"],
    "courthouse": ["courtroom", "chamber", "cell", "archive"],
    "technocracy": ["lab", "control", "servers", "cell"],
}
ALL_ROOMS = sorted({r for v in ROOMS.values() for r in v})

O = namedtuple("O", "id name family size tag years where wealth styles mount note")
CENSUS = []


def o(id, name, family, size, tag, years, where, wealth="0-5", styles="*", mount="floor", note=""):
    CENSUS.append(O(id, name, family, size, tag, years, where, wealth, styles, mount, note))


# ================================================================ openings (drawn with the walls: library.door/window)
F = "openings"
o("door", "door", F, "3 x 0.5", "opening:door", "-", "* 3", mount="opening", note="plank, panelled, glazed, steel, sliding: by era and wealth")
o("door-double", "double door", F, "6 x 0.5", "opening:door", "-", "nave 3, greathall 3, salon 2, courtroom 2, hall 2, warehouse 2, station 2", "2-5", mount="opening")
o("gate", "gate", F, "8 x 0.5", "opening:gate", "-", "yard 3, farmyard 3, bailey 3, churchyard 2, courtyard 2, park 2, quay 1", mount="opening")
o("portcullis", "portcullis", F, "10 x 1", "opening:gate", "1197-1700", "bailey 3", "4-5", "central,atlantic,northern,mediterranean,islamic", mount="opening")
o("window", "window", F, "3 x 0.5", "opening:window", "-", "* 3", mount="opening", note="open, shuttered, horn, oiled cloth, leaded, sash, steel, sealed")
o("shutter", "shutters", F, "3 x 0.5", "opening:shutter", "-", "* 2", mount="opening")
o("hatch", "trapdoor", F, "3 x 3", "opening:hatch", "-", "cellar 3, loft 3, barn 2, tavern 2, store 2, boat 2, tower 2", mount="floor")
o("doorcurtain", "door curtain or hanging", F, "3 x 0.3", "hide:curtain", "-", "chamber 1, shrinehall 2, prayerhall 1, guestroom 1", styles="islamic,steppe,southasia,seasia,africa,eastasia", mount="opening")
o("shopfront", "shop front with a shutter board", F, "8 x 1", "opening:shutter", "1197-1900", "shop 3", "1-4", mount="opening")
o("shopwindow", "plate-glass shop window", F, "10 x 1", "opening:window", "1830-", "shop 3", "2-5", mount="opening")
o("rollershutter", "roller shutter", F, "10 x 1", "opening:shutter", "1900-", "shop 2, warehouse 2, depot 2", "1-4", mount="opening")

# ================================================================ seating
F = "seating"
o("stool", "stool", F, "1.5 x 1.5", "break:light", "-", "kitchen 3, hall 2, workshop 3, taproom 3, shop 2, stable 1, barracks 2, scriptorium 1", "0-3")
o("bench", "bench", F, "6 x 1.25", "break:light", "-", "hall 3, kitchen 2, taproom 3, barracks 2, street 1, park 2, platform 2, churchyard 1, square 1", "0-4")
o("settle", "high-backed settle", F, "6 x 2", "hide:curtain", "1350-1920", "hall 2, kitchen 2, taproom 2", "1-3", "central,atlantic,northern,americas", "wall")
o("chair", "chair", F, "1.75 x 1.75", "break:light", "1450-", "hall 2, kitchen 3, parlour 3, study 2, office 3, counting 2, taproom 2, salon 2, library 2", "2-5",
  note="a lord's chair alone before 1450; a stool or bench elsewhere")
o("lordchair", "great chair", F, "2.5 x 2.25", "break:light", "1197-1800", "greathall 3, solar 2, hall 1, courtroom 2, chapel 1", "4-5")
o("throne", "throne on its dais", F, "5 x 5", "break:heavy", "-", "greathall 2, elysium 1, salon 1", "5-5")
o("armchair", "armchair", F, "2.75 x 2.75", "hide:bed", "1700-", "parlour 3, salon 3, study 2, library 2, office 1, guestroom 1", "2-5")
o("sofa", "sofa", F, "6 x 3", "hide:bed", "1750-", "parlour 3, salon 3, hall 1, reception 2", "2-5")
o("chaise", "day bed or chaise", F, "6 x 2.5", "", "1650-", "salon 2, parlour 1, solar 1", "4-5")
o("rocking", "rocking chair", F, "2 x 3", "break:light", "1750-", "parlour 2, kitchen 1, yard 1", "1-3", "atlantic,americas,central,northern")
o("officechair", "office chair", F, "2 x 2", "break:light", "1850-", "office 3, counting 2, control 3, lab 2, reception 2", "2-5")
o("barstool", "bar stool", F, "1.25 x 1.25", "break:light", "1900-", "taproom 3, kitchen 1", "1-4")
o("pew", "pew", F, "10 x 2.5", "cover:barricade", "1400-", "nave 3, chapel 2", "1-5", "central,atlantic,northern,mediterranean,americas,oceania,africa")
o("choirstall", "choir stalls", F, "10 x 4.5", "", "1197-", "chancel 3, chapel 1", "3-5", "central,atlantic,northern,mediterranean")
o("cushion", "floor cushion", F, "2 x 2", "", "-", "parlour 2, chamber 2, shrinehall 2, prayerhall 1, salon 1, guestroom 1", "0-5", "islamic,steppe,southasia,eastasia,seasia,africa")
o("divan", "divan along the wall", F, "8 x 3", "hide:bed", "-", "parlour 3, salon 3, guestroom 2", "2-5", "islamic,steppe,southasia", "wall")
o("hammockseat", "hammock", F, "3 x 8", "", "-", "chamber 2, yard 1, boat 1", "0-3", "americas,seasia,africa,oceania", "wall")
o("deckchair", "deck chair or garden chair", F, "2 x 4", "break:light", "1860-", "garden 2, park 1, yard 1, boat 1", "1-4")
o("pewbox", "box pew", F, "8 x 6", "hide:curtain", "1650-1900", "nave 1", "3-5", "atlantic,americas")
o("bench-stone", "stone bench", F, "6 x 1.5", "cover:wall", "-", "cloister 2, courtyard 2, park 2, churchyard 1, garden 1", "2-5", mount="outdoor")

# ================================================================ tables and desks
F = "tables"
o("table", "table", F, "6 x 3", "cover:table", "-", "hall 3, kitchen 3, taproom 3, shop 1, workshop 1, barracks 2, guardroom 2, greathall 3", "0-5", note="trestle, joined, scrubbed, clothed, veneer, composite")
o("table-small", "small table", F, "3 x 2.5", "cover:table", "-", "chamber 2, parlour 2, guestroom 2, salon 2, study 1", "1-5")
o("table-round", "round table", F, "4 x 4", "cover:table", "1500-", "taproom 2, parlour 2, salon 2, kitchen 1", "2-5")
o("table-low", "low table", F, "4 x 2.5", "cover:table", "-", "parlour 3, chamber 2, shrinehall 1, guestroom 1", "0-5", "islamic,steppe,southasia,eastasia,seasia,africa")
o("dininglong", "long dining table", F, "12 x 3.5", "cover:table", "-", "greathall 3, hall 2, refectory 3, salon 1", "3-5")
o("desk", "desk", F, "4.5 x 2.5", "container:drawers", "1500-", "study 3, office 3, counting 3, library 2, reception 2, ward 1, chamber 1", "2-5")
o("writingslope", "writing slope or scriptorium desk", F, "3 x 2.5", "clue:document", "1197-1600", "scriptorium 3, library 2, study 2, counting 1", "2-5")
o("lectern", "lectern", F, "2 x 2", "clue:document", "-", "chancel 3, nave 1, library 2, scriptorium 2, prayerhall 2, study 1", "2-5")
o("counter", "counter", F, "8 x 2.5", "cover:counter", "-", "shop 3, taproom 3, counting 2, reception 3, station 2, office 1", "1-5")
o("bar", "bar with its shelves", F, "12 x 3", "cover:counter", "1800-", "taproom 3", "1-5")
o("workbench", "workbench", F, "7 x 3", "cover:table", "-", "workshop 3, carpenter 3, garage 3, factory 2, smithy 2, studio 1, barn 1, store 1, lab 2, yard 1", "1-4", mount="wall")
o("dressingtable", "dressing table with its mirror", F, "4 x 2", "watch:mirror", "1700-", "chamber 2, guestroom 1, solar 2", "3-5", mount="wall")
o("washstand", "washstand with basin and ewer", F, "2.5 x 1.75", "break:fragile", "1700-1960", "chamber 2, guestroom 3, ward 1", "1-5", mount="wall")
o("sideboard", "sideboard", F, "6 x 2", "container:cabinet", "1700-", "parlour 2, salon 2, hall 2, greathall 1", "3-5", mount="wall")
o("coffeetable", "coffee table", F, "4 x 2", "cover:table", "1920-", "parlour 3, reception 2, salon 1", "1-5")
o("cardtable", "card or gaming table", F, "3 x 3", "cover:table", "1600-", "salon 2, taproom 1, parlour 1, guardroom 1", "2-5")
o("maptable", "map table", F, "6 x 4", "clue:document", "-", "solar 1, guardroom 1, control 2, study 1, office 1", "3-5")
o("surgerytable", "surgery or dissecting table", F, "6.5 x 2.5", "", "-", "surgery 3, morgue 3, lab 2, laboratory 2", "2-5")
o("labbench", "laboratory bench", F, "8 x 3", "cover:counter", "1600-", "laboratory 3, lab 3, surgery 1", "3-5", mount="wall")
o("judgebench", "judge's bench", F, "10 x 4", "cover:counter", "-", "courtroom 3", "3-5")
o("dock", "dock for the accused", F, "6 x 4", "cover:wall", "1500-", "courtroom 3", "3-5")
o("altar-table", "communion table", F, "6 x 2.5", "sacred:altar", "1530-", "chancel 3", "1-4", "atlantic,northern,central,americas,oceania")

# ================================================================ beds and sleeping
F = "beds"
o("bed", "bed", F, "4.5 x 6.5", "hide:bed", "-", "chamber 3, guestroom 3, solar 3, resting 1", "2-5", mount="wall")
o("bed-narrow", "narrow bed or cot", F, "3 x 6.25", "hide:bed", "-", "chamber 3, guestroom 2, nursery 2, monks 3, barracks 3, cell 2, ward 3, almshouse 3", "1-4", mount="wall")
o("pallet", "straw pallet", F, "3 x 6", "", "-", "chamber 2, loft 3, stable 2, barn 2, cell 3, camp 2, hall 1", "0-2", mount="wall")
o("boxbed", "box bed with doors", F, "5 x 6.5", "hide:wardrobe", "1400-1900", "hall 2, chamber 2, kitchen 1", "1-3", "atlantic,northern,central", "wall")
o("bunk", "bunk beds", F, "3 x 6.5", "hide:bed", "1700-", "barracks 3, boat 3, cell 2, guestroom 1", "0-3", mount="wall")
o("cradle", "cradle or cot", F, "2 x 3.5", "", "-", "chamber 2, nursery 3, kitchen 1", "0-5")
o("hammock", "sleeping hammock", F, "3 x 8", "", "-", "chamber 2, boat 3", "0-3", "americas,seasia,africa,oceania", "wall")
o("mat", "sleeping mat or futon", F, "3 x 6.5", "", "-", "chamber 3, monks 3, guestroom 2", "0-4", "eastasia,seasia,southasia,africa,islamic,steppe,oceania")
o("kang", "heated sleeping platform", F, "8 x 6", "hide:crawl", "-", "chamber 3, hall 2", "1-4", "eastasia", "wall")
o("hospitalbed", "hospital bed", F, "3 x 6.5", "hide:bed", "1860-", "ward 3, surgery 1", "2-5", mount="wall")
o("coffin", "coffin", F, "2 x 6.5", "container:box", "-", "resting 3, crypt 2, morgue 2, chapel 1, cellar 1", "1-5", note="a Cainite's resting place; also the dead awaiting burial")
o("sarcophagus", "sarcophagus", F, "3.5 x 7.5", "container:box", "-", "crypt 3, resting 2", "4-5")
o("bedroll", "bedroll", F, "2.5 x 6", "", "-", "camp 3, barracks 1", "0-3")
o("pod", "sleep pod", F, "4 x 7.5", "hide:bed", "2030-", "chamber 2, lab 1, control 1", "2-5")

# ================================================================ storage and containers
F = "storage"
o("chest", "chest", F, "4 x 2", "container:chest", "-", "chamber 3, hall 2, store 2, solar 2, treasury 2, sacristy 2, guestroom 1, boat 1", "1-5", mount="wall")
o("strongbox", "strongbox", F, "2 x 1.5", "container:strongbox", "-", "treasury 3, counting 3, study 1, solar 2, office 1", "3-5")
o("safe", "safe", F, "2.5 x 2.5", "container:safe", "1830-", "office 2, counting 3, study 1, treasury 2", "3-5", mount="wall")
o("casket", "casket or box", F, "1.5 x 1", "container:box", "-", "chamber 2, solar 2, study 2, sacristy 2", "1-5", mount="on")
o("cupboard", "cupboard or wardrobe", F, "4.5 x 2", "container:cabinet", "-", "chamber 3, kitchen 2, hall 2, guestroom 2, sacristy 2", "1-5", mount="wall")
o("drawers", "chest of drawers", F, "3.5 x 1.75", "container:drawers", "1650-", "chamber 3, guestroom 2, parlour 1", "2-5", mount="wall")
o("filing", "filing cabinet", F, "1.5 x 2.25", "container:drawers", "1890-", "office 3, archive 3, counting 2, ward 1", "2-5", mount="wall")
o("shelf", "wall shelf", F, "4 x 1", "", "-", "kitchen 3, store 3, shop 3, workshop 3, hall 2, chamber 1, cellar 2", "0-5", mount="wall")
o("bookcase", "bookcase", F, "4 x 1.25", "clue:document", "1450-", "study 3, library 3, parlour 2, office 2, salon 1, archive 3", "2-5", mount="wall")
o("scrollrack", "scroll and book press", F, "4 x 1.5", "clue:document", "-", "scriptorium 3, library 3, sacristy 1, study 2, madrasa 2", "2-5", mount="wall")
o("dresser", "dresser with plates", F, "5.5 x 2", "break:fragile", "1550-", "kitchen 3, hall 2, taproom 1", "1-4", mount="wall")
o("pegrail", "peg rail with clothes", F, "4 x 1.5", "", "-", "chamber 2, hall 2, guestroom 2, barracks 2, stable 1", "0-3", mount="wall")
o("coatstand", "coat stand", F, "1.5 x 1.5", "", "1830-", "hall 2, office 2, reception 2, taproom 1", "2-5")
o("toolrack", "tool rack", F, "6 x 2", "", "-", "workshop 3, barn 2, store 2, stable 1", "1-4", mount="wall")
o("weaponrack", "weapon rack", F, "6 x 1.5", "", "-", "armoury 3, guardroom 3, barracks 2, greathall 1", "2-5", mount="wall")
o("armourstand", "armour stand", F, "2 x 2", "", "-", "armoury 3, greathall 1, solar 1, gallery 1", "3-5")
o("guncabinet", "gun cabinet", F, "3 x 1.5", "container:cabinet", "1650-", "armoury 3, study 1, guardroom 2, hall 1", "2-5", mount="wall")
o("displaycase", "display case", F, "4 x 2", "break:fragile", "1700-", "gallery 3, shop 2, salon 1, library 1", "3-5")
o("locker", "locker", F, "1.25 x 1.5", "container:cabinet", "1880-", "barracks 3, station 2, ward 1, guardroom 2, lab 1", "1-4", mount="wall")
o("cask", "cask", F, "2 x 2", "container:box", "-", "cellar 3, store 3, taproom 2, warehouse 3, kitchen 1, boat 2, quay 2", "0-5")
o("crate", "crate", F, "2.5 x 2.5", "container:box", "-", "store 3, warehouse 3, quay 3, shop 2, yard 1, depot 3, boat 2", "0-5")
o("sack", "sack", F, "2 x 1.75", "container:pile", "-", "store 3, barn 3, warehouse 2, kitchen 1, mill 3, quay 2", "0-4")
o("basket", "basket", F, "1.5 x 1.5", "container:box", "-", "kitchen 3, store 2, stalls 3, hall 1, garden 2, shop 1", "0-4")
o("jar", "storage jar or amphora", F, "2 x 2", "container:box", "-", "store 3, kitchen 2, cellar 2, courtyard 1", "0-4", "mediterranean,islamic,southasia,eastasia,seasia,africa,americas")
o("crock", "crock", F, "1.5 x 1.5", "container:box", "-", "kitchen 3, cellar 3, store 2", "0-3")
o("pile", "gear set down on the ground", F, "2 x 2", "container:pile", "-", "camp 3, * 1", "0-5")
o("trunk", "travelling trunk", F, "3.5 x 2", "container:chest", "1700-", "guestroom 3, chamber 2, station 2, boat 2, loft 2", "2-5")
o("suitcase", "suitcase", F, "2.25 x 1", "container:box", "1880-", "guestroom 2, station 3, chamber 1", "1-5")
o("wardrobe-hide", "priest hole behind panelling", F, "4 x 3", "hide:priesthole", "1550-1700", "hall 1, solar 1, chamber 1", "3-5", "atlantic,central", "wall")
o("fridge", "refrigerator", F, "2.5 x 2.5", "container:cabinet", "1925-", "kitchen 3, feeding 2, lab 2, morgue 3", "2-5", mount="wall")
o("chestfreezer", "chest freezer", F, "4 x 2.5", "container:chest", "1950-", "cellar 2, store 2, feeding 2", "2-5", mount="wall")

# ================================================================ hearths, heat and cooking
F = "hearths"
o("hearth", "open hearth", F, "5 x 5", "hazard:fire", "-1900", "hall 3, kitchen 2, camp 2", "0-3", mount="centre")
o("fireplace", "fireplace", F, "6 x 3", "hazard:fire", "-", "hall 3, greathall 3, parlour 3, chamber 2, solar 3, taproom 3, salon 2, study 2, guestroom 1", "1-5", mount="wall")
o("oven", "bread oven", F, "7 x 7", "hazard:fire", "-", "kitchen 2, bakehouse 3, yard 1", "1-4", mount="wall")
o("tiledstove", "tiled stove", F, "4 x 4", "hazard:fire", "1400-1950", "hall 3, parlour 3, chamber 2, study 2", "2-5", "central,northern", "wall")
o("range", "kitchen range", F, "4 x 2.25", "hazard:fire", "1781-", "kitchen 3, taproom 1", "1-5", mount="wall")
o("stove-iron", "iron stove", F, "2.5 x 2.5", "hazard:fire", "1750-", "hall 2, kitchen 2, guardroom 2, office 1, station 2, barracks 2, workshop 2", "1-3")
o("brazier", "brazier", F, "2 x 2", "hazard:brazier", "-", "hall 1, guardroom 2, courtyard 1, street 1, camp 1, shrinehall 1, alley 1", "0-5")
o("tandoor", "clay oven", F, "3 x 3", "hazard:fire", "-", "kitchen 2, courtyard 2, yard 2", "0-3", "islamic,southasia,steppe,africa")
o("cookstove-asia", "clay cooking stove", F, "4 x 2.5", "hazard:fire", "-", "kitchen 3", "0-4", "eastasia,seasia,southasia", "wall")
o("campfire", "camp fire", F, "4.5 x 4.5", "hazard:fire", "-", "camp 3, woods 1, field 1, riverbank 1", "0-3", mount="outdoor")
o("cauldron", "cauldron on a tripod", F, "3 x 3", "hazard:fire", "-", "camp 2, kitchen 1, yard 1, laboratory 1", "0-3")
o("spit", "roasting spit", F, "5 x 3", "hazard:fire", "-1900", "kitchen 2, greathall 1, camp 1", "1-5")
o("radiator", "radiator", F, "3 x 0.75", "break:iron", "1880-", "* 2", "2-5", mount="wall")
o("heater", "electric or gas heater", F, "2 x 1", "hazard:brazier", "1910-", "chamber 1, office 1, parlour 1", "1-4", mount="wall")
o("forge", "smith's forge", F, "9 x 6", "hazard:fire", "-", "smithy 3", "1-4", mount="wall")
o("kiln", "potter's kiln", F, "6 x 6", "hazard:fire", "-", "pottery 3, yard 1", "1-3")
o("still", "still", F, "4 x 3", "hazard:fire", "1300-", "laboratory 2, cellar 1, barn 1, workshop 1", "1-4")

# ================================================================ lights
F = "lights"
o("torch", "torch in a sconce", F, "1 x 1", "light:torch", "-", "greathall 3, dungeon 3, tunnel 2, crypt 2, guardroom 2, bailey 2, hall 1, nave 1", "1-5", mount="wall")
o("rushlight", "rushlight holder", F, "0.75 x 0.75", "light:candle", "-1900", "hall 2, kitchen 2, chamber 1", "0-2", mount="on")
o("candle", "candle in a holder", F, "0.5 x 0.5", "light:candle", "-", "* 2", "1-5", mount="on")
o("candelabrum", "candelabrum", F, "1.5 x 1.5", "light:candle", "-", "salon 3, greathall 2, chancel 3, solar 2, elysium 3", "3-5")
o("candlestand", "floor candle stand", F, "1.5 x 1.5", "hazard:brazier", "-", "chancel 2, nave 2, solar 1, shrinehall 2", "3-5")
o("lantern", "lantern", F, "0.75 x 0.75", "light:lantern", "-", "stable 3, barn 2, boat 2, cellar 2, yard 1, quay 2, camp 2, tunnel 1", "0-5", mount="on")
o("oillamp", "oil lamp", F, "0.75 x 0.75", "light:lamp", "-", "* 2", "0-5", mount="on", note="clay lamp, brass lamp, paraffin lamp by era and region")
o("gaslamp", "gas lamp", F, "1 x 1", "light:lamp", "1810-1950", "parlour 2, salon 2, office 2, street 2, station 2, hall 1", "2-5", mount="wall")
o("electriclamp", "electric lamp", F, "1 x 1", "light:switch", "1880-", "* 2", "1-5", mount="on")
o("ceilinglight", "ceiling light", F, "1.5 x 1.5", "light:switch", "1880-", "* 2", "1-5", mount="ceiling")
o("chandelier", "chandelier", F, "4 x 4", "light:chandelier", "-", "greathall 2, salon 3, elysium 3, nave 1, hall 1, gallery 2", "4-5", mount="ceiling")
o("lanternpost", "lantern post or street lamp", F, "1.25 x 1.25", "light:lantern", "1400-", "street 2, square 2, quay 2, park 2, platform 2, alley 1", "1-5", mount="outdoor")
o("paperlantern", "paper lantern", F, "1 x 1", "light:lantern", "-", "street 2, courtyard 2, shrinehall 2, taproom 1", "0-4", "eastasia,seasia", "ceiling")
o("neon", "neon sign", F, "4 x 0.5", "light:switch", "1920-", "street 2, taproom 1, shop 1", "1-4", mount="wall")
o("floodlight", "floodlight", F, "1.5 x 1.5", "light:switch", "1920-", "depot 2, yard 1, quay 1, control 1, bailey 1", "2-5")

# ================================================================ water, washing and privies
F = "water"
o("well", "draw well", F, "5 x 5", "climb:rope", "-", "yard 2, farmyard 3, square 2, courtyard 2, bailey 2", "0-4", mount="outdoor")
o("pump", "water pump", F, "2 x 2", "", "1700-1950", "yard 2, farmyard 2, square 2, kitchen 1", "1-3", mount="outdoor")
o("sink", "sink", F, "3.5 x 2", "", "1781-", "kitchen 3, scullery 3, surgery 2, lab 2, ward 1", "1-5", mount="wall")
o("basin", "basin and ewer", F, "1.5 x 1.5", "break:fragile", "-", "chamber 2, guestroom 2, ablution 1, sacristy 1", "1-5", mount="on")
o("bathtub", "bathtub", F, "5.5 x 2.5", "", "1850-", "bathroom 3, chamber 1", "3-5", mount="wall")
o("washtub", "wash tub", F, "3 x 2.5", "", "-", "kitchen 2, yard 2, scullery 2", "0-3")
o("privy", "privy", F, "3 x 4", "hide:crawl", "-", "privy 3, yard 1", "0-3", mount="outdoor")
o("toilet", "toilet", F, "1.5 x 2.5", "", "1880-", "privy 3, bathroom 3", "1-5", mount="wall")
o("chamberpot", "chamber pot", F, "1 x 1", "break:fragile", "-1950", "chamber 2, guestroom 2, cell 2", "0-5", mount="floor")
o("washline", "washing line", F, "12 x 2", "", "-", "yard 2, garden 1, alley 2", "0-3", mount="outdoor")
o("trough", "water trough", F, "6 x 2", "", "-", "farmyard 3, stable 3, street 1, square 1, pen 2", "0-3", mount="outdoor")
o("butt", "water butt", F, "2.5 x 2.5", "container:box", "-", "yard 2, garden 2, farmyard 2, alley 1", "0-3", mount="outdoor")
o("fountain", "fountain", F, "8 x 8", "", "-", "square 2, courtyard 3, park 2, cloister 2, garden 1", "3-5", mount="outdoor")
o("ablutionbasin", "ablution fountain", F, "8 x 8", "", "-", "ablution 3, courtyard 2", "2-5", "islamic", "outdoor")
o("mikveh", "ritual bath", F, "8 x 6", "", "-", "mikveh 3", "2-5", "*")
o("cistern", "cistern or rain tank", F, "6 x 6", "", "-", "yard 1, courtyard 1, cellar 1", "2-4", mount="outdoor")
o("shower", "shower", F, "3 x 3", "", "1900-", "bathroom 2, barracks 2, ward 1", "2-5", mount="wall")
o("hydrant", "fire hydrant", F, "1 x 1", "", "1850-", "street 2", "1-5", mount="outdoor")
o("sprinkler", "fire sprinklers", F, "1 x 1", "watch:sprinkler", "1874-", "office 1, warehouse 2, lab 2, station 1, salon 1", "3-5", mount="ceiling")

# ================================================================ kitchen goods and small things (on tables and shelves)
F = "goods"
for gid, gname, gyears, gwhere, gw in (
        ("pot", "cooking pot", "-", "kitchen 3, camp 2", "0-4"), ("kettle", "kettle", "1600-", "kitchen 3, parlour 1", "1-5"),
        ("jug", "jug", "-", "kitchen 3, taproom 3, hall 2", "0-5"), ("bowl", "bowl", "-", "kitchen 3, hall 2, taproom 2", "0-5"),
        ("cup", "cup or tankard", "-", "taproom 3, kitchen 2, hall 2", "0-5"), ("plate", "plate", "1400-", "kitchen 3, hall 2, salon 2", "1-5"),
        ("trencher", "bread trencher", "1197-1500", "hall 3, greathall 3", "0-5"), ("loaf", "loaf", "-", "kitchen 3, shop 1, stalls 2", "0-5"),
        ("cheese", "cheese", "-", "kitchen 2, store 2, stalls 2", "0-5"), ("bottle", "bottle", "1600-", "taproom 3, cellar 2, kitchen 2", "0-5"),
        ("wineglass", "wine glass", "1500-", "salon 3, taproom 1, parlour 2", "3-5"), ("teapot", "teapot and cups", "1650-", "parlour 2, kitchen 1", "1-5"),
        ("samovar", "samovar", "1750-", "parlour 3, kitchen 2, taproom 1", "1-5"), ("hookah", "water pipe", "1550-", "parlour 2, taproom 1, salon 1", "1-5"),
        ("book", "book", "-", "study 3, library 3, scriptorium 3, chamber 1", "2-5"), ("scroll", "scroll", "-", "scriptorium 2, library 2, study 2, madrasa 2", "2-5"),
        ("letter", "letter", "-", "study 2, office 2, chamber 1", "1-5"), ("inkwell", "ink and quill or pen", "-", "study 3, scriptorium 3, office 2, counting 3", "2-5"),
        ("ledger", "account book", "1300-", "counting 3, office 2, shop 2", "2-5"), ("coins", "coins", "-", "counting 3, treasury 3, taproom 1", "1-5"),
        ("knife", "kitchen knife", "-", "kitchen 3, workshop 1", "0-5"), ("cleaver", "cleaver", "-", "kitchen 2, butchery 3", "0-4"),
        ("herbs", "drying herbs", "-", "kitchen 2, laboratory 1, garden 1", "0-3"), ("pipe", "tobacco pipe", "1560-", "parlour 2, taproom 2", "0-5"),
        ("dice", "dice and cards", "-", "taproom 2, guardroom 2, barracks 2", "0-4"), ("chessboard", "chess or board game", "-", "parlour 2, salon 2, solar 2", "2-5"),
        ("toy", "toy", "-", "nursery 3, chamber 1, yard 1", "0-5"), ("sewing", "sewing basket", "-", "parlour 2, chamber 2", "0-4"),
        ("flowers", "vase of flowers", "1500-", "parlour 2, salon 2, chancel 2", "2-5"), ("ashtray", "ashtray", "1880-", "office 2, taproom 2, parlour 1", "1-5"),
        ("phone", "telephone", "1890-", "office 3, hall 2, reception 3, counting 1, guardroom 1, ward 1", "2-5"),
        ("radio", "radio", "1925-", "parlour 2, kitchen 1, guardroom 1, control 2", "1-5"), ("tv", "television", "1950-", "parlour 3, taproom 1, reception 1", "1-5"),
        ("computer", "computer", "1975-", "office 3, control 3, lab 2, study 2, reception 2", "2-5"), ("typewriter", "typewriter", "1875-1995", "office 3, counting 2, study 1", "2-5"),
        ("gramophone", "gramophone or record player", "1900-", "parlour 2, salon 2", "2-5"), ("clock", "mantel clock", "1650-", "parlour 2, salon 2, study 2", "2-5"),
        ("skull", "skull", "-", "laboratory 2, study 1, crypt 2, sanctum 2", "0-5"), ("specimen", "specimen jar", "1600-", "laboratory 3, lab 2, surgery 1, morgue 1", "2-5"),
        ("bloodbag", "blood bag or bottle of blood", "1940-", "feeding 3, surgery 2, ward 1", "1-5"), ("needle", "syringe and dressings", "1850-", "surgery 3, ward 3", "1-5")):
    o(gid, gname, F, "1 x 1", "break:fragile" if gid in ("jug", "bowl", "cup", "plate", "bottle", "wineglass", "teapot", "specimen", "tv", "computer", "gramophone", "clock") else ("clue:document" if gid in ("book", "scroll", "letter", "ledger") else ("watch:phone" if gid == "phone" else ("watch:radio" if gid == "radio" else ""))),
      gyears, gwhere, gw, mount="on")

# ================================================================ trades and work
F = "trades"
for tid, tname, tsize, ttag, tyears, twhere, tw, tst, tmount in (
        ("anvil", "anvil on its block", "2.5 x 2", "break:iron", "-", "smithy 3, workshop 1", "1-4", "*", "floor"),
        ("grindstone", "grindstone", "4 x 3", "break:stone", "-", "smithy 2, workshop 2, yard 1", "1-4", "*", "floor"),
        ("bellows", "great bellows", "4 x 2", "", "-", "smithy 3", "1-4", "*", "floor"),
        ("loom", "floor loom", "8 x 6", "break:heavy", "-", "workshop 2, hall 1, weaver 3", "1-4", "*", "floor"),
        ("backstrap", "backstrap loom", "4 x 6", "", "-", "yard 2, hall 2", "0-3", "americas,seasia,africa,eastasia", "floor"),
        ("wheel", "spinning wheel", "4 x 3", "break:light", "1280-1960", "hall 2, parlour 1, kitchen 1, workshop 1", "1-3", "*", "floor"),
        ("distaff", "distaff and spindle", "1 x 1", "", "-", "hall 2, kitchen 1, yard 1", "0-3", "*", "on"),
        ("potterswheel", "potter's wheel", "3 x 3", "", "-", "pottery 3, workshop 1", "1-3", "*", "floor"),
        ("lathe", "lathe", "6 x 2.5", "break:heavy", "-", "workshop 2, carpenter 3", "1-4", "*", "floor"),
        ("sawpit", "saw pit with its trestle", "12 x 4", "trap:pit", "-1900", "yard 1, carpenter 2", "1-3", "*", "outdoor"),
        ("sawhorse", "sawhorse with a log", "4 x 2.5", "", "-", "yard 2, carpenter 3, workshop 1", "0-3", "*", "floor"),
        ("chopping", "chopping block and axe", "2.5 x 2.5", "", "-", "yard 3, farmyard 2, kitchen 1", "0-3", "*", "floor"),
        ("butcherblock", "butcher's block", "3 x 3", "", "-", "butchery 3, kitchen 1", "1-3", "*", "floor"),
        ("meathooks", "meat hooks with carcasses", "6 x 1.5", "", "-", "butchery 3, cellar 1, feeding 1", "1-3", "*", "wall"),
        ("vat", "dye or tanning vat", "8 x 8", "", "-1950", "tannery 3, dyer 3, yard 1", "1-3", "*", "floor"),
        ("mashtun", "mash tun", "8 x 8", "", "-", "brewhouse 3", "1-4", "*", "floor"),
        ("winepress", "wine or oil press", "8 x 6", "break:heavy", "-", "cellar 1, barn 2, press 3", "2-4", "mediterranean,central,islamic,atlantic", "floor"),
        ("quern", "hand quern", "2.5 x 2.5", "break:stone", "-1900", "kitchen 2, yard 1", "0-2", "*", "floor"),
        ("millstones", "millstones", "8 x 8", "break:stone", "-", "mill 3", "2-4", "*", "floor"),
        ("churn", "butter churn", "1.5 x 1.5", "", "-1950", "kitchen 2, dairy 3, yard 1", "0-3", "*", "floor"),
        ("press-print", "printing press", "6 x 4", "break:heavy", "1450-", "workshop 2, printer 3, office 1", "2-4", "*", "floor"),
        ("sewingmachine", "sewing machine", "3 x 2", "break:light", "1850-", "workshop 2, parlour 1, tailor 3", "1-4", "*", "floor"),
        ("scales", "balance scales", "1.5 x 1", "", "-", "shop 3, counting 2, stalls 2, laboratory 2", "1-5", "*", "on"),
        ("stall", "market stall", "13 x 6", "cover:barricade", "-", "stalls 3, square 2, street 1", "1-3", "*", "outdoor"),
        ("handcart", "handcart", "5 x 8", "mount:cart", "-", "street 2, stalls 2, yard 1, quay 2, alley 1", "0-3", "*", "outdoor"),
        ("apothecary", "apothecary's drawers and jars", "6 x 1.5", "container:drawers", "1300-", "shop 2, laboratory 2, surgery 1", "2-4", "*", "wall"),
        ("alembic", "alembic and retorts", "3 x 2", "break:fragile", "-", "laboratory 3, sanctum 1", "2-5", "*", "on"),
        ("easel", "easel and canvas", "3 x 2", "", "1450-", "studio 3, salon 1, gallery 1", "2-5", "*", "floor"),
        ("piano", "piano", "5 x 2.5", "break:heavy", "1750-", "salon 3, parlour 2, taproom 1", "3-5", "*", "wall"),
        ("organ", "church organ", "10 x 6", "break:heavy", "1300-", "nave 2, chancel 2", "3-5", "central,atlantic,northern,mediterranean,americas", "wall"),
        ("harp", "harp or lute", "2 x 2", "break:light", "-", "solar 2, salon 2, greathall 1", "3-5", "*", "floor"),
        ("drum", "drum", "2 x 2", "watch:bell", "-", "yard 1, hall 1, shrinehall 2, square 1", "0-4", "africa,americas,oceania,seasia,southasia,eastasia,steppe", "floor"),
        ("beehive", "beehive or skep", "2 x 2", "", "-", "garden 3, field 1", "0-3", "*", "outdoor"),
        ("dovecote", "dovecote", "4 x 4", "", "-", "farmyard 1, garden 1, bailey 1", "3-5", "*", "outdoor"),
        ("coop", "hen coop", "5 x 4", "", "-", "farmyard 3, yard 2", "0-3", "*", "outdoor"),
        ("pigsty", "pigsty", "8 x 8", "", "-", "farmyard 2, pen 3", "0-3", "*", "outdoor"),
        ("haystack", "haystack", "11 x 11", "hide:shadows", "-", "field 2, farmyard 2", "0-3", "*", "outdoor"),
        ("hayheap", "heap of hay with a pitchfork", "3 x 3", "hide:shadows", "-", "barn 3, stable 3", "0-3", "*", "floor"),
        ("woodpile", "firewood stack", "8 x 2.5", "cover:barricade", "-", "yard 3, farmyard 2, kitchen 1, hall 1", "0-3", "*", "wall"),
        ("plough", "plough", "8 x 3", "", "-", "barn 2, field 2, farmyard 1", "0-3", "*", "floor"),
        ("tractor", "tractor", "12 x 6", "mount:truck", "1920-", "farmyard 2, field 2, barn 1", "1-4", "*", "outdoor"),
        ("horsestall", "horse stall", "7 x 10", "", "-", "stable 3", "1-5", "*", "floor"),
        ("manger", "manger with hay", "6 x 2", "", "-", "stable 3, barn 2, pen 2", "0-3", "*", "wall"),
        ("saddlerack", "saddle and harness rack", "4 x 1.5", "", "-", "stable 3, barn 1", "1-5", "*", "wall"),
        ("crane", "dock crane", "10 x 10", "climb:ladder", "1300-", "quay 3, warehouse 1", "3-5", "*", "outdoor"),
        ("bollard", "mooring bollard", "1.25 x 1.25", "", "-", "quay 3", "1-5", "*", "outdoor"),
        ("ropecoil", "coil of rope", "2 x 2", "climb:rope", "-", "quay 3, boat 3, store 1, warehouse 2", "0-4", "*", "floor"),
        ("anchor", "anchor", "4 x 3", "", "-", "quay 2, boat 2", "1-5", "*", "outdoor"),
        ("nets", "fishing nets", "6 x 4", "trap:snare", "-", "quay 3, boat 2, riverbank 2", "0-3", "*", "outdoor"),
        ("serverrack", "server rack", "2 x 3.5", "break:iron", "1990-", "servers 3, control 2, office 1", "3-5", "*", "wall"),
        ("console", "control console", "6 x 3", "break:iron", "1950-", "control 3, lab 2, station 1", "3-5", "*", "wall"),
        ("monitors", "security monitors", "4 x 2", "watch:mirror", "1970-", "control 3, guardroom 2, reception 2, resting 1", "3-5", "*", "wall"),
        ("photocopier", "copier", "4 x 2.5", "break:iron", "1960-", "office 2, archive 1, reception 1", "2-5", "*", "floor"),
        ("vending", "vending machine", "3 x 2.5", "break:iron", "1950-", "station 2, hall 1, ward 1, street 1", "2-5", "*", "wall"),
        ("watercooler", "water cooler", "1.25 x 1.25", "", "1910-", "office 2, reception 2", "2-5", "*", "wall"),
        ("pooltable", "billiard or pool table", "9 x 4.5", "cover:table", "1650-", "taproom 2, salon 1, parlour 1", "2-5", "*", "floor"),
        ("dartboard", "dartboard", "2 x 0.5", "target:mark", "1850-", "taproom 2, barracks 1", "1-4", "atlantic,americas,oceania,central,northern", "wall"),
        ("jukebox", "jukebox", "3 x 2", "break:fragile", "1930-", "taproom 2", "1-4", "*", "wall"),
        ("stretcher", "stretcher", "2 x 6.5", "", "1700-", "ward 1, surgery 1, morgue 2, guardroom 1", "1-5", "*", "floor"),
        ("ivstand", "drip stand", "1.5 x 1.5", "", "1900-", "ward 3, surgery 2", "2-5", "*", "floor"),
        ("restraintchair", "restraint chair", "2.5 x 2.5", "", "1800-", "cell 2, ward 1, lab 1", "2-5", "*", "floor"),
        ("morguedrawers", "morgue drawers", "8 x 7", "container:cabinet", "1880-", "morgue 3", "3-5", "*", "wall"),
        ("cage", "cage", "4 x 4", "container:strongbox", "-", "cell 2, dungeon 2, lab 2, barn 1", "1-5", "*", "floor"),
        ("stocks", "stocks or pillory", "6 x 3", "", "1197-1840", "square 2, street 1, bailey 1", "2-5", "central,atlantic,northern,mediterranean,americas", "outdoor"),
        ("gallows", "gallows", "10 x 8", "climb:ladder", "1197-1900", "square 1, field 1", "3-5", "*", "outdoor"),
        ("rack", "rack and irons", "8 x 4", "", "1197-1800", "dungeon 2", "4-5", "*", "floor"),
        ("shackles", "chains on the wall", "4 x 1", "", "-", "dungeon 3, cell 2, cellar 1, feeding 1", "1-5", "*", "wall"),
        ("cellbars", "cell bars", "8 x 0.5", "opening:gate", "-", "cell 3, dungeon 3, guardroom 1", "2-5", "*", "opening"),
        ("hitching", "hitching post or rail", "6 x 1", "", "-1950", "street 2, taproom 1, square 2, yard 1", "1-4", "*", "outdoor")):
    o(tid, tname, F, tsize, ttag, tyears, twhere, tw, tst, tmount)

# ================================================================ worship and the sacred (WoDX SACRED kinds)
F = "sacred"
o("altar", "altar", F, "7 x 3.5", "sacred:altar", "-", "chancel 3, chapel 3, sacristy 1", "1-5", "central,atlantic,northern,mediterranean,americas,oceania,africa")
o("altarrail", "altar rail", F, "12 x 1", "", "1550-", "chancel 3", "1-5", "central,atlantic,northern,mediterranean,americas")
o("iconostasis", "icon screen", F, "16 x 1.5", "sacred:altar", "-", "chancel 3", "2-5", "northern,central,mediterranean,islamic", "wall")
o("pulpit", "pulpit", F, "4 x 4", "", "1197-", "nave 3", "2-5", "central,atlantic,northern,mediterranean,americas,oceania,africa")
o("font", "font", F, "4 x 4", "", "-", "nave 3, chapel 1", "1-5", "central,atlantic,northern,mediterranean,americas,oceania,africa")
o("priedieu", "prie-dieu", F, "2 x 2", "", "1300-", "chapel 2, chamber 1, chancel 1, solar 1", "3-5")
o("sanctuarylamp", "sanctuary lamp", F, "1 x 1", "light:lamp", "-", "chancel 3", "1-5", mount="ceiling")
o("bell", "bell and bell rope", F, "2 x 2", "watch:bell", "-", "tower 3, square 1, gate 1, shrinehall 2, courtyard 1", "1-5")
o("mihrab", "prayer niche", F, "6 x 2", "sacred:altar", "-", "prayerhall 3", "1-5", "islamic,southasia,seasia,africa,steppe", "wall")
o("minbar", "minbar", F, "4 x 10", "", "-", "prayerhall 3", "2-5", "islamic,southasia,seasia,africa,steppe")
o("prayermat", "prayer rug", F, "2.5 x 4", "", "-", "prayerhall 3, chamber 2, parlour 1", "0-5", "islamic,southasia,seasia,africa,steppe")
o("torahark", "Torah ark", F, "6 x 2.5", "sacred:altar", "-", "prayerhall 3", "1-5", mount="wall", note="every region with a Jewish community")
o("bimah", "bimah", F, "8 x 6", "", "-", "prayerhall 3", "1-5")
o("buddha", "image of the Buddha on its altar", F, "6 x 4", "sacred:altar", "-", "shrinehall 3, chamber 1", "1-5", "eastasia,seasia,southasia,steppe", "wall")
o("hindushrine", "household or temple shrine", F, "4 x 3", "sacred:shrine", "-", "shrinehall 3, parlour 2, chamber 1", "0-5", "southasia,seasia")
o("ancestors", "ancestor altar", F, "4 x 2", "sacred:shrine", "-", "hall 3, parlour 2, shrinehall 2", "0-5", "eastasia,seasia", "wall")
o("kamidana", "household spirit shelf", F, "3 x 1", "sacred:shrine", "-", "hall 2, kitchen 1, shop 2", "0-5", "eastasia", "wall")
o("incense", "incense burner", F, "1.5 x 1.5", "hazard:brazier", "-", "shrinehall 3, chancel 1, parlour 1, temple 3", "0-5")
o("icon", "icon corner", F, "2 x 1", "sacred:shrine", "-", "hall 2, chamber 2, parlour 2", "0-5", "northern,central,mediterranean", "wall")
o("crucifix", "crucifix", F, "1.5 x 0.5", "sacred:shrine", "-", "chamber 1, hall 1, chapel 2, ward 1, cell 1", "0-5", "central,atlantic,northern,mediterranean,americas,oceania,africa", "wall")
o("wayside", "wayside shrine or cross", F, "4.5 x 4.5", "sacred:shrine", "-", "street 1, field 2, woods 1, square 1", "0-4", mount="outdoor")
o("holywell", "holy well", F, "6 x 6", "sacred:shrine", "-", "woods 1, churchyard 1, field 1", "0-4", mount="outdoor")
o("reliquary", "reliquary", F, "1.5 x 1", "sacred:relic", "-", "chancel 2, sacristy 2, treasury 1, crypt 1", "3-5", mount="on")
o("fetish", "fetish in its resting place", F, "1.5 x 1.5", "sacred:fetish", "-", "caern 2, sanctum 1, chamber 1", "0-5")
o("caernstone", "caern stone", F, "6 x 6", "sacred:caern", "-", "caern 3", "0-5", mount="outdoor")
o("fetter", "a wraith's fetter", F, "1.5 x 1.5", "sacred:fetter", "-", "* 1", "0-5", note="any object can be a fetter; this marks one")
o("node", "node", F, "6 x 6", "sacred:node", "-", "sanctum 3, caern 1, woods 1", "0-5")
o("grave", "grave", F, "3.5 x 7", "", "-", "churchyard 3", "0-5", mount="outdoor")
o("headstone", "headstone or grave cross", F, "2 x 1", "break:stone", "-", "churchyard 3", "0-5", mount="outdoor")
o("tomb", "tomb with an effigy", F, "8 x 3.5", "container:box", "-", "chancel 1, crypt 3, churchyard 1, chapel 2", "4-5")
o("mausoleum", "mausoleum", F, "12 x 16", "opening:door", "1600-", "churchyard 2, park 1", "4-5", mount="outdoor")
o("ossuary", "stacked bones", F, "6 x 2", "", "-", "crypt 3, charnel 3", "0-5", mount="wall")
o("lychgate", "lych gate with coffin rest", F, "10 x 6", "opening:gate", "1197-", "churchyard 2", "1-5", "atlantic,central,northern", "outdoor")
o("torii", "shrine gate", F, "12 x 2", "", "-", "courtyard 3, street 1", "1-5", "eastasia", "outdoor")
o("stupa", "stupa or prayer wheel", F, "6 x 6", "sacred:shrine", "-", "courtyard 2, shrinehall 2, street 1", "0-5", "steppe,southasia,seasia,eastasia", "outdoor")

# ================================================================ decor and soft furnishing
F = "decor"
o("rug", "woven rug", F, "8 x 5", "", "1197-", "hall 2, parlour 3, solar 3, chamber 2, salon 3, study 2", "2-5")
o("ragrug", "rag rug", F, "4 x 3", "", "1750-", "kitchen 2, chamber 2, hall 1", "0-3")
o("rushes", "rushes strewn on the floor", F, "8 x 8", "", "1197-1650", "hall 3, greathall 3, taproom 2", "0-4", "central,atlantic,northern")
o("tatami", "tatami mats", F, "6 x 3", "", "1300-", "chamber 3, hall 3, guestroom 3", "1-5", "eastasia")
o("tapestry", "tapestry or wall hanging", F, "8 x 0.5", "hide:curtain", "1197-", "greathall 3, solar 3, salon 2, chamber 1", "4-5", mount="wall")
o("curtains", "curtains", F, "5 x 0.5", "hide:curtain", "1500-", "chamber 2, parlour 2, salon 3, resting 3, guestroom 2", "2-5", mount="wall")
o("screen", "folding screen", F, "5 x 1", "hide:curtain", "-", "chamber 2, salon 2, ward 2, solar 1", "2-5")
o("painting", "painting", F, "3 x 0.25", "clue:object", "1400-", "parlour 2, salon 3, gallery 3, study 2, hall 1", "2-5", mount="wall")
o("mirror", "mirror", F, "2 x 0.25", "watch:mirror", "1500-", "chamber 2, salon 2, hall 1, guestroom 1, bathroom 3", "2-5", mount="wall", note="polished metal before glass mirrors")
o("longcase", "longcase clock", F, "1.75 x 1.25", "", "1680-", "hall 2, parlour 2, study 1", "3-5", mount="wall")
o("statue", "statue", F, "3 x 3", "break:stone", "-", "gallery 2, park 2, square 2, garden 2, courtyard 2, nave 1, salon 1", "3-5")
o("bust", "bust on a plinth", F, "1.5 x 1.5", "break:stone", "1450-", "library 2, gallery 2, salon 1, study 1", "3-5")
o("pottedplant", "potted plant", F, "2 x 2", "", "1700-", "parlour 2, salon 2, office 2, reception 2, courtyard 2", "1-5")
o("trophy", "antlers or a mounted head", F, "3 x 1", "", "-", "greathall 2, hall 1, study 1, taproom 1", "2-5", mount="wall")
o("bearskin", "pelt laid as a rug", F, "5 x 6", "", "-", "solar 2, greathall 1, study 1, camp 1", "2-5")
o("globe", "globe", F, "2 x 2", "", "1500-", "study 2, library 2, salon 1", "3-5")
o("telescope", "telescope", F, "3 x 3", "", "1610-", "study 1, tower 2, library 1", "3-5")
o("birdcage", "birdcage", F, "1.5 x 1.5", "", "-", "parlour 1, salon 1, courtyard 1", "1-5", mount="on")
o("banners", "banners and heraldry", F, "4 x 0.5", "", "1197-1800", "greathall 3, bailey 1, chapel 1", "4-5", "central,atlantic,northern,mediterranean,islamic", "wall")
o("noticeboard", "notice board", F, "4 x 0.5", "clue:writing", "1800-", "station 2, office 2, barracks 2, reception 2, street 1", "1-5", mount="wall")
o("chalkboard", "blackboard", F, "6 x 0.5", "clue:writing", "1800-", "madrasa 2, study 1, lab 2, office 1", "1-5", mount="wall")
o("bloodstain", "bloodstain", F, "3 x 3", "clue:mark", "-", "* 1", "0-5")
o("graffiti", "writing on the wall", F, "4 x 0.5", "clue:writing", "-", "alley 2, street 1, cell 2, tunnel 2", "0-5", mount="wall")
o("tracks", "tracks", F, "6 x 2", "clue:trail", "-", "woods 2, field 1, riverbank 2, street 1", "0-5", mount="outdoor")

# ================================================================ fighting, training and danger
F = "fighting"
o("pell", "practice post or dummy", F, "2 x 2", "target:dummy", "-", "bailey 2, yard 1, barracks 1, guardroom 1", "2-5", mount="outdoor")
o("quintain", "quintain", F, "6 x 6", "target:dummy", "1197-1650", "bailey 1, field 1", "4-5", "central,atlantic,northern,mediterranean", "outdoor")
o("butts", "archery butt", F, "4 x 2", "target:mark", "-", "field 2, bailey 2, yard 1", "1-5", mount="outdoor")
o("bottlerow", "bottles or cans in a row", F, "4 x 1", "target:bottles", "1650-", "yard 1, field 1, alley 1", "0-4", mount="outdoor")
o("barricade", "barricade", F, "8 x 2", "cover:barricade", "-", "street 1, quay 1, gate 1, alley 1", "0-5", mount="outdoor")
o("sandbags", "sandbags", F, "8 x 2", "cover:wall", "1700-", "gate 2, street 1, depot 1", "0-5", mount="outdoor")
o("parapet", "low wall or parapet", F, "10 x 1.5", "cover:wall", "-", "bailey 2, tower 2, courtyard 1, park 1, quay 1", "0-5", mount="outdoor")
o("caltrops", "caltrops or broken glass", F, "4 x 4", "hazard:sharp", "-", "gate 1, alley 1, street 1", "0-5")
o("livewire", "live wire", F, "4 x 1", "hazard:shock", "1880-", "tunnel 1, lab 1, depot 1, street 1", "0-5")
o("snare", "snare", F, "1.5 x 1.5", "trap:snare", "-", "woods 2, field 1", "0-5", mount="outdoor")
o("pit", "pit trap", F, "5 x 5", "trap:pit", "-", "woods 1, tunnel 1, dungeon 1, caern 1", "0-5")
o("tripwire", "tripwire", F, "5 x 0.5", "trap:tripwire", "-", "tunnel 1, alley 1, resting 1, woods 1", "0-5")
o("springblade", "spring blade", F, "2 x 2", "trap:blade", "-", "resting 1, treasury 1, crypt 1, dungeon 1", "3-5")
o("beartrap", "jaw trap", F, "2 x 2", "trap:snare", "1500-", "woods 2, field 1", "0-4", mount="outdoor")
o("powder", "powder kegs", F, "3 x 3", "hazard:fire", "1350-1900", "armoury 2, boat 1, cellar 1", "2-5")
o("cannon", "cannon", F, "8 x 4", "break:iron", "1350-1900", "bailey 2, tower 2, quay 1, boat 2", "3-5", mount="outdoor")

# ================================================================ climbing
F = "climbing"
o("ladder", "ladder", F, "1.5 x 10", "climb:ladder", "-", "barn 3, loft 3, store 1, quay 1, yard 1, tower 2, workshop 1", "0-5", mount="wall")
o("stairs", "stairs", F, "3 x 10", "climb:ladder", "-", "hall 2, * 1", "0-5", mount="wall")
o("spiralstairs", "spiral stair", F, "6 x 6", "climb:ladder", "1197-", "tower 3, castle 2, greathall 1", "3-5")
o("trellis", "trellis or drainpipe", F, "2 x 0.5", "climb:tree", "1500-", "garden 1, street 1, alley 2, courtyard 1", "1-5", mount="wall")
o("scaffold", "scaffolding", F, "10 x 4", "climb:ladder", "-", "street 1, nave 1, square 1", "1-5", mount="outdoor")
o("fireescape", "fire escape", F, "6 x 3", "climb:ladder", "1860-", "alley 2, street 1", "1-4", mount="wall")
o("knotrope", "knotted rope", F, "1 x 10", "climb:rope", "-", "tower 1, boat 1, dungeon 1, cellar 1", "0-5", mount="wall")

# ================================================================ outdoors, streets and the wild
F = "outdoor"
for oid, oname, osize, otag, oyears, owhere, ow, ost in (
        ("tree", "broadleaf tree", "18 x 18", "climb:tree", "-", "woods 3, field 1, park 3, churchyard 2, yard 1, square 1, garden 1", "0-5", "*"),
        ("fir", "conifer", "14 x 14", "climb:tree", "-", "woods 3, park 1, churchyard 1", "0-5", "central,northern,atlantic,steppe,eastasia,americas,polar"),
        ("palm", "palm tree", "14 x 14", "climb:tree", "-", "courtyard 2, park 2, street 1, garden 2, riverbank 2", "0-5", "islamic,southasia,seasia,africa,americas,oceania,mediterranean"),
        ("bamboo", "bamboo stand", "8 x 8", "hide:shadows", "-", "garden 2, woods 2, riverbank 2", "0-5", "eastasia,seasia,southasia"),
        ("bush", "bush", "4 x 4", "hide:shadows", "-", "garden 2, woods 2, yard 2, park 2, field 1, churchyard 1", "0-5", "*"),
        ("hedge", "hedge", "10 x 2", "cover:barricade", "-", "garden 2, field 2, park 2, churchyard 1", "0-5", "*"),
        ("fern", "bracken", "3 x 3", "", "-", "woods 3, riverbank 1", "0-5", "*"),
        ("flowerbed", "flower bed", "8 x 3", "", "1500-", "garden 3, park 3, courtyard 2", "2-5", "*"),
        ("garden", "kitchen garden", "20 x 8", "", "-", "garden 3, yard 2, farmyard 2, cloister 2", "0-4", "*"),
        ("fieldstrip", "field strip", "30 x 9", "", "-", "field 3", "0-4", "*"),
        ("vines", "vineyard rows", "20 x 10", "", "-", "field 2", "1-4", "mediterranean,central,atlantic,islamic,americas,oceania,africa"),
        ("paddy", "rice paddy", "30 x 15", "", "-", "field 3", "0-3", "eastasia,seasia,southasia"),
        ("boulder", "boulder", "4 x 3", "cover:wall", "-", "woods 2, field 1, riverbank 2, caern 2", "0-5", "*"),
        ("stump", "tree stump", "2 x 2", "", "-", "woods 2, yard 1, field 1", "0-5", "*"),
        ("log", "fallen log", "10 x 2", "cover:wall", "-", "woods 2, riverbank 1", "0-5", "*"),
        ("branch", "fallen branch", "4 x 1.5", "", "-", "woods 2, park 1", "0-5", "*"),
        ("mushrooms", "toadstools", "1.5 x 1.25", "", "-", "woods 2", "0-5", "*"),
        ("rubble", "rubble", "3 x 2.5", "cover:barricade", "-", "street 1, alley 2, tunnel 2, field 1", "0-5", "*"),
        ("pond", "pond", "12 x 8", "", "-", "park 2, farmyard 1, garden 1, woods 1", "0-5", "*"),
        ("fence-wattle", "wattle fence", "10 x 1", "cover:barricade", "-1900", "yard 2, garden 2, farmyard 2, pen 2", "0-3", "*"),
        ("fence-picket", "picket or rail fence", "10 x 0.5", "", "1600-", "yard 2, garden 2, farmyard 2, pen 2", "1-4", "atlantic,americas,oceania,northern,central"),
        ("wall-stone", "dry-stone or garden wall", "10 x 2", "cover:wall", "-", "field 2, garden 2, churchyard 3, farmyard 1, park 1", "0-5", "*"),
        ("railings", "iron railings", "10 x 0.5", "", "1700-", "park 2, street 2, churchyard 2, square 1", "2-5", "*"),
        ("barbedwire", "barbed wire", "10 x 1", "hazard:sharp", "1870-", "field 1, gate 2, depot 1", "0-5", "*"),
        ("signpost", "signpost or milestone", "1.5 x 1.5", "clue:writing", "-", "street 2, field 1, square 1", "0-5", "*"),
        ("marketcross", "market cross", "9 x 9", "sacred:shrine", "1197-1900", "square 2", "1-5", "central,atlantic,northern"),
        ("bandstand", "bandstand", "20 x 20", "", "1850-", "park 1", "2-5", "atlantic,central,americas,oceania"),
        ("postbox", "post box", "1.5 x 1.5", "", "1850-", "street 2, square 1, station 1", "1-5", "*"),
        ("phonebox", "telephone box", "3 x 3", "watch:phone", "1920-2010", "street 2, square 1, station 1", "1-5", "*"),
        ("busstop", "bus or tram stop", "8 x 4", "", "1900-", "street 2, square 1", "1-5", "*"),
        ("bin", "rubbish bin", "2 x 2", "container:box", "1850-", "street 2, alley 3, yard 1, park 1", "0-5", "*"),
        ("dumpster", "skip or dumpster", "6 x 4", "container:box", "1940-", "alley 3, depot 1, street 1", "0-5", "*"),
        ("manhole", "manhole or drain", "2.5 x 2.5", "opening:hatch", "1850-", "street 2, alley 2", "0-5", "*"),
        ("billboard", "billboard or poster wall", "12 x 1", "clue:writing", "1850-", "street 2, station 1, square 1", "1-5", "*"),
        ("tent", "tent", "12 x 7", "hide:shadows", "-", "camp 3, field 1", "0-5", "*"),
        ("yurt", "yurt", "16 x 16", "opening:door", "-", "camp 3, field 2", "0-4", "steppe"),
        ("tipi", "tipi or lodge", "14 x 14", "opening:door", "-1900", "camp 3, field 2", "0-4", "americas"),
        ("leanto", "lean-to", "15 x 9", "hide:shadows", "-", "camp 2, woods 1", "0-2", "*"),
        ("charcoalkiln", "charcoal kiln", "18 x 18", "hazard:fire", "-1950", "woods 2", "0-3", "*"),
        ("bones", "gnawed bones", "3 x 3", "clue:object", "-", "woods 1, caern 1, dungeon 1, tunnel 1", "0-5", "*"),
        ("pelt", "pelt laid flat", "4.5 x 6", "", "-", "camp 2, woods 1", "0-3", "*")):
    o(oid, oname, F, osize, otag, oyears, owhere, ow, ost, "outdoor")

# ================================================================ mounts and vehicles (WoDX MOUNTS kinds), standing or parked
F = "vehicles"
for vid, vname, vsize, vyears, vwhere, vw, vst in (
        ("horse", "horse", "3 x 8", "-", "stable 3, street 2, bailey 2, farmyard 2, field 1, camp 2", "1-5", "*"),
        ("mule", "mule or donkey", "2.5 x 6", "-", "stable 2, street 2, farmyard 2, stalls 1, camp 1", "0-3", "*"),
        ("camel", "camel", "3 x 9", "-", "courtyard 2, street 1, camp 3, stalls 1", "0-4", "islamic,steppe,southasia,africa"),
        ("ox", "ox", "3 x 8", "-", "farmyard 2, field 2, barn 2", "0-3", "*"),
        ("cart", "cart", "5 x 9", "-", "farmyard 3, street 2, yard 2, quay 2, field 1, stalls 1", "0-4", "*"),
        ("carriage", "carriage or coach", "6 x 14", "1550-1930", "street 2, bailey 2, yard 1, station 2", "3-5", "*"),
        ("sled", "sled or sleigh", "4 x 9", "-", "farmyard 1, street 1, camp 1", "0-4", "northern,central,polar,americas,steppe"),
        ("boat", "boat", "6 x 18", "-", "quay 3, riverbank 2", "0-5", "*"),
        ("bicycle", "bicycle", "2 x 6", "1885-", "street 2, yard 1, station 1, hall 1", "1-4", "*"),
        ("car", "motor car", "6 x 15", "1900-", "street 3, yard 1, depot 2, station 2", "2-5", "*"),
        ("motorbike", "motorcycle", "2.5 x 7", "1910-", "street 2, yard 1, depot 1", "1-4", "*"),
        ("truck", "lorry or truck", "8 x 22", "1910-", "depot 3, quay 2, street 1, farmyard 1", "2-5", "*"),
        ("bus", "bus", "8 x 35", "1900-", "street 2, depot 2, station 2", "2-5", "*"),
        ("motorboat", "motorboat", "7 x 20", "1890-", "quay 3", "2-5", "*"),
        ("armoured", "armoured car", "8 x 18", "1914-", "depot 1, gate 1", "4-5", "*"),
        ("tank", "tank", "11 x 26", "1916-", "depot 1, field 1", "5-5", "*"),
        ("snowmobile", "snow machine", "4 x 10", "1960-", "street 1, yard 1, camp 1", "2-4", "northern,polar,americas"),
        ("tram", "tram", "8 x 45", "1880-", "street 2", "2-5", "*"),
        ("train", "railway carriage", "10 x 60", "1830-", "platform 3, depot 2", "2-5", "*"),
        ("balloon", "balloon or airship", "30 x 30", "1783-", "field 1", "4-5", "*"),
        ("plane", "aeroplane", "35 x 28", "1910-", "field 1, depot 1", "4-5", "*"),
        ("helicopter", "helicopter", "40 x 10", "1940-", "field 1, depot 1, roof 1", "4-5", "*")):
    o(vid, vname, F, vsize, "mount:" + vid, vyears, vwhere, vw, vst, "outdoor")



# ================================================================ machines and works (B6349): the plant, appliances, services and big works of a
# place, from the water-wheel to the scanner, filled out against the world furniture of Cataclysm: Dark Days Ahead (its ideas only; own names)
F = "machines"
for mid, mname, msize, mtag, myears, mwhere, mw, mst, mmount in (
        # power and plant
        ("generator", "petrol or diesel generator", "3 x 2", "hazard:shock", "1910-", "workshop 1, depot 2, camp 1, control 2, cellar 1, yard 1, garage 1", "1-5", "*", "floor"),
        ("steamengine", "steam engine and its flywheel", "10 x 6", "hazard:fire", "1780-1960", "factory 3, mill 2, depot 2", "2-5", "*", "floor"),
        ("boiler", "boiler", "5 x 4", "hazard:fire", "1840-", "cellar 2, factory 3, utility 2, depot 2, ward 1", "2-5", "*", "wall"),
        ("coalfurnace", "coal furnace with its ducts", "4 x 4", "hazard:fire", "1880-1975", "cellar 2, utility 2", "2-5", "central,atlantic,northern,americas,oceania", "floor"),
        ("waterheater", "water heater", "2 x 2", "", "1890-", "utility 3, bathroom 1, kitchen 1, scullery 1", "2-5", "*", "wall"),
        ("fusebox", "fuse box or breaker panel", "1.5 x 0.5", "hazard:shock", "1890-", "utility 2, cellar 2, hall 1, office 1, servers 2, factory 2", "1-5", "*", "wall"),
        ("transformer", "electrical transformer", "4 x 4", "hazard:shock", "1900-", "street 1, yard 1, depot 2, forecourt 1, factory 1", "1-5", "*", "outdoor"),
        ("batterybank", "battery bank", "3 x 2", "hazard:shock", "1990-", "utility 1, control 2, servers 2, camp 1", "2-5", "*", "wall"),
        ("solarpanel", "solar panels", "6 x 3", "", "1975-", "roof 2, yard 1, camp 1, field 1", "2-5", "*", "outdoor"),
        ("aircon", "air-conditioning unit", "3 x 2", "", "1950-", "roof 2, office 1, servers 3, utility 1, chamber 1", "2-5", "*", "wall"),
        ("ceilingfan", "ceiling fan", "4 x 4", "", "1890-", "hall 1, parlour 1, office 2, taproom 2, ward 1, guestroom 1", "2-5", "*", "ceiling"),
        ("deskfan", "electric fan", "1.5 x 1.5", "", "1900-", "office 1, chamber 1, hall 1, counting 1", "1-5", "*", "on"),
        ("antenna", "radio mast or aerial", "2 x 2", "", "1900-", "roof 2, control 1, quay 1", "1-5", "*", "outdoor"),
        ("satellitedish", "satellite dish", "3 x 3", "", "1980-", "roof 2, control 2, yard 1", "2-5", "*", "outdoor"),
        # the house
        ("washingmachine", "washing machine", "2.5 x 2.5", "", "1910-", "utility 3, scullery 2, bathroom 1, laundry 3, kitchen 1", "2-5", "*", "wall"),
        ("dryer", "clothes dryer", "2.5 x 2.5", "", "1940-", "utility 2, laundry 3, bathroom 1", "3-5", "*", "wall"),
        ("mangle", "wringer mangle", "3 x 2", "", "1840-1965", "scullery 2, laundry 3, yard 1, utility 1", "1-4", "central,atlantic,northern,americas,oceania,mediterranean", "floor"),
        ("dishwasher", "dishwasher", "2 x 2", "", "1950-", "kitchen 2", "3-5", "*", "wall"),
        ("microwave", "microwave oven", "2 x 1.3", "", "1970-", "kitchen 2, office 1, taproom 1, ward 1", "2-5", "*", "on"),
        ("toaster", "toaster or kettle", "1 x 0.7", "", "1920-", "kitchen 2, office 1", "2-5", "*", "on"),
        ("television", "television", "3 x 1.5", "", "1938-", "parlour 3, hall 2, taproom 1, guestroom 2, reception 1, ward 1, chamber 1", "1-5", "*", "wall"),
        ("wireless", "wireless set", "1.5 x 1", "watch:radio", "1922-", "parlour 2, kitchen 1, guardroom 2, taproom 1, control 1", "1-5", "*", "on"),
        ("telephone", "telephone", "0.8 x 0.8", "watch:phone", "1880-", "hall 1, office 2, reception 2, counting 2, guardroom 1, ward 1", "2-5", "*", "on"),
        ("printer", "printer", "2 x 1.5", "", "1985-", "office 2, study 1, reception 1", "2-5", "*", "on"),
        ("switchboard", "telephone switchboard", "6 x 2.5", "watch:phone", "1880-1985", "office 1, station 1, control 1, reception 1", "2-5", "*", "wall"),
        # streets and services
        ("cashmachine", "cash machine", "2.5 x 1", "container:safe", "1970-", "street 2, station 2, forecourt 1, shop 1", "2-5", "*", "wall"),
        ("payphone", "public telephone", "1.5 x 1", "watch:phone", "1890-2015", "street 2, station 3, taproom 1, hall 1, ward 1", "1-4", "*", "wall"),
        ("newsbox", "newspaper box", "1.5 x 1.5", "", "1920-", "street 1, station 1, forecourt 1", "1-4", "atlantic,americas,oceania,central,northern", "outdoor"),
        ("parkingmeter", "parking meter", "0.7 x 0.7", "", "1935-", "street 2", "2-5", "*", "outdoor"),
        ("trafficlight", "traffic light", "1 x 1", "", "1920-", "street 2", "2-5", "*", "outdoor"),
        ("firealarm", "fire alarm bell and pull", "0.7 x 0.3", "watch:bell", "1880-", "hall 1, ward 2, office 2, station 2, platform 1, factory 2, lab 1", "2-5", "*", "wall"),
        ("extinguisher", "fire extinguisher", "0.7 x 0.7", "", "1905-", "kitchen 1, office 2, ward 2, depot 2, platform 1, lab 2, garage 2, factory 2", "2-5", "*", "wall"),
        ("fuelpump", "petrol pump", "2 x 2", "hazard:fire", "1915-", "forecourt 3, depot 1, garage 1", "1-5", "*", "outdoor"),
        ("turnstile", "turnstile", "3 x 1", "", "1890-", "platform 2, station 2, reception 1, gate 1", "2-5", "*", "floor"),
        ("lift", "lift shaft and its doors", "6 x 6", "climb:ladder", "1880-", "hall 1, office 2, ward 2, reception 2, station 1, warehouse 1", "2-5", "*", "wall"),
        ("escalator", "escalator", "4 x 12", "", "1900-", "station 2, shop 1, platform 1", "3-5", "*", "floor"),
        ("securitycamera", "security camera", "1 x 0.7", "", "1970-", "reception 2, shop 2, counting 2, street 1, gate 2, control 1, servers 2, warehouse 1", "2-5", "*", "wall"),
        # shops and stores
        ("shoppingcart", "shopping trolley", "2 x 3", "", "1937-", "shop 2, street 1, alley 1, forecourt 1", "0-5", "*", "floor"),
        ("cashregister", "cash register or till", "1.5 x 1.5", "container:box", "1880-", "shop 3, taproom 2, counting 1, reception 1", "1-5", "*", "on"),
        ("checkout", "checkout counter", "6 x 3", "cover:counter", "1930-", "shop 3, forecourt 1", "2-5", "*", "floor"),
        ("shelving", "steel shelving", "4 x 1.5", "container:cabinet", "1920-", "shop 3, store 2, warehouse 3, depot 2, archive 2, garage 2, utility 1", "1-5", "*", "wall"),
        ("goodspallet", "pallet of goods", "4 x 3.3", "container:pile", "1930-", "warehouse 3, depot 2, quay 2, store 1, factory 2", "1-5", "*", "floor"),
        ("forklift", "forklift", "4 x 8", "", "1920-", "warehouse 2, depot 2, quay 2, factory 1", "2-5", "*", "floor"),
        # workshops and factories
        ("drillpress", "drill press", "2 x 2", "", "1890-", "workshop 2, factory 2, garage 1", "1-5", "*", "floor"),
        ("powerloom", "power loom", "8 x 5", "break:heavy", "1800-1990", "factory 3, weaver 1", "2-5", "*", "floor"),
        ("conveyor", "conveyor belt", "3 x 12", "", "1900-", "factory 2, depot 2, warehouse 1", "2-5", "*", "floor"),
        ("carlift", "car lift", "8 x 14", "", "1930-", "garage 2", "2-5", "*", "floor"),
        ("toolchest", "rolling tool chest", "2.5 x 1.5", "container:drawers", "1920-", "garage 3, workshop 2, factory 1", "1-5", "*", "wall"),
        ("welder", "welding set", "2 x 2", "hazard:fire", "1920-", "garage 1, workshop 1, factory 2", "1-5", "*", "floor"),
        ("typecase", "printer's type case", "3 x 2", "", "1450-1980", "printer 3, workshop 1", "1-4", "*", "wall"),
        # laboratories and medicine
        ("centrifuge", "laboratory centrifuge", "2 x 2", "", "1900-", "lab 2, laboratory 1, surgery 1, morgue 1", "3-5", "*", "floor"),
        ("fumehood", "fume cupboard", "5 x 2.5", "", "1920-", "lab 3, laboratory 1", "3-5", "*", "wall"),
        ("microscope", "microscope", "1 x 1", "clue:object", "1650-", "lab 2, laboratory 2, study 1, surgery 1", "3-5", "*", "on"),
        ("autoclave", "autoclave", "2 x 2", "", "1880-", "surgery 2, lab 2", "3-5", "*", "floor"),
        ("incubator", "incubator", "2 x 1.5", "", "1890-", "ward 1, lab 2", "3-5", "*", "floor"),
        ("operatingtable", "operating table", "3 x 7", "cover:table", "1846-", "surgery 3", "2-5", "*", "centre"),
        ("examtable", "examination couch", "2.5 x 6", "", "1880-", "surgery 2, ward 1, office 1", "2-5", "*", "wall"),
        ("xray", "X-ray machine", "6 x 8", "hazard:shock", "1896-", "surgery 1, ward 1", "3-5", "*", "floor"),
        ("scanner", "body scanner", "7 x 14", "hazard:shock", "1980-", "surgery 1", "4-5", "*", "floor"),
        ("ventilator", "ventilator and monitors", "2 x 2", "", "1950-", "ward 2, surgery 2", "3-5", "*", "floor"),
        ("dentalchair", "dentist's chair", "3 x 6", "", "1870-", "surgery 1, office 1", "2-5", "*", "floor"),
        ("embalming", "embalming table", "3 x 7", "", "1860-", "morgue 3", "2-5", "*", "centre"),
        ("cremator", "cremation furnace", "8 x 10", "hazard:fire", "1874-", "morgue 1", "3-5", "*", "wall"),
        # trades and pleasures of the town
        ("barberchair", "barber's chair", "2.5 x 4", "", "1880-", "barber 3", "1-5", "*", "floor"),
        ("arcade", "arcade cabinet", "2.5 x 3", "", "1971-", "taproom 1, club 3, shop 1", "1-4", "*", "wall"),
        ("pinball", "pinball table", "2.5 x 5", "", "1931-", "taproom 2, club 2", "1-4", "*", "floor"),
        ("slotmachine", "slot machine", "2 x 2", "", "1895-", "taproom 1, club 2", "1-5", "*", "wall"),
        ("djbooth", "DJ booth and decks", "6 x 3", "cover:counter", "1975-", "club 3", "2-5", "*", "wall"),
        ("speakers", "loudspeaker stack", "2 x 2", "", "1960-", "club 3, hall 1, square 1", "2-5", "*", "floor"),
        ("treadmill", "treadmill", "3 x 6", "", "1990-", "gym 3, chamber 1", "2-5", "*", "floor"),
        ("weightbench", "weight bench and bar", "4 x 6", "", "1950-", "gym 3, barracks 1, cellar 1", "1-5", "*", "floor"),
        ("punchbag", "punching bag", "2 x 2", "target:dummy", "1880-", "gym 3, barracks 1, cellar 1, club 1", "1-5", "*", "ceiling"),
        ("kennel", "dog kennel", "3 x 4", "", "-", "yard 1, farmyard 1, haven 1, gate 1", "1-5", "*", "outdoor"),
        # security and war
        ("vaultdoor", "vault door", "8 x 2", "container:safe", "1860-", "treasury 2, counting 2, cellar 1", "4-5", "*", "wall"),
        ("razorwire", "coil of razor wire", "10 x 2", "trap:blade", "1935-", "yard 1, gate 2, street 1, field 1", "1-5", "*", "outdoor"),
        ("chainlink", "chain-link fence", "10 x 0.3", "climb:wall", "1900-", "yard 2, depot 2, park 1, alley 1, gate 1", "1-5", "*", "outdoor"),
        ("tanktrap", "concrete or steel tank trap", "4 x 4", "cover:barricade", "1914-", "street 1, field 1", "0-5", "*", "outdoor"),
        ("searchlight", "searchlight", "3 x 3", "light:lamp", "1890-", "gate 2, yard 1, roof 1, quay 1", "2-5", "*", "outdoor"),
        ("siren", "air-raid or warning siren", "2 x 2", "watch:bell", "1900-", "roof 2, gate 1, street 1", "2-5", "*", "outdoor"),
        # the old works
        ("waterwheel", "water-wheel", "6 x 14", "", "1197-1950", "mill 3, riverbank 1", "1-4", "*", "outdoor"),
        ("smokerack", "smoking and drying rack", "4 x 3", "", "-", "camp 2, riverbank 1, yard 1, store 1, kitchen 1", "0-4", "*", "floor"),
        ("limekiln", "lime kiln", "10 x 10", "hazard:fire", "1197-1950", "field 1, yard 1", "1-4", "*", "outdoor"),
        ("tenter", "tenter frame with cloth", "20 x 4", "", "1197-1900", "weaver 1, field 1", "1-4", "central,atlantic,northern,mediterranean", "outdoor"),
        ("tanpits", "tanning pits", "10 x 8", "trap:pit", "-1950", "tannery 3", "0-3", "*", "outdoor"),
        ("brewcopper", "brewing copper", "5 x 5", "hazard:fire", "-", "brewhouse 3", "1-4", "*", "floor"),
        ("glassfurnace", "glass furnace", "8 x 8", "hazard:fire", "-", "workshop 1, factory 1", "2-5", "*", "floor"),
        ):
    o(mid, mname, F, msize, mtag, myears, mwhere, mw, mst, mmount)

def rows(family=None):
    return [r for r in CENSUS if family is None or r.family == family]


def check():
    """The census's own test: no duplicate ids, every room it names is a room of some place, every style known, every
    interactable tag of a known family, every year span readable."""
    bad, seen = [], set()
    rooms = {r for v in ROOMS.values() for r in v} | set(ROOMS) | {"*"}
    fams = {"opening", "container", "hide", "light", "cover", "hazard", "sacred", "watch", "climb", "target", "trap", "clue", "mount", "break"}
    for r in CENSUS:
        if r.id in seen: bad.append(f"{r.id}: listed twice")
        seen.add(r.id)
        for part in r.where.split(","):
            room = part.strip().rsplit(" ", 1)[0]
            if room not in rooms: bad.append(f"{r.id}: unknown room {room}")
        if r.styles != "*":
            for s in r.styles.split(","):
                if s not in STYLES: bad.append(f"{r.id}: unknown style {s}")
        if r.tag and r.tag.split(":")[0] not in fams: bad.append(f"{r.id}: unknown tag {r.tag}")
        a, _, b = r.years.partition("-")
        for v in (a, b):
            if v and not v.isdigit(): bad.append(f"{r.id}: bad years {r.years}")
    return bad


EXTRA_ROOMS = ["bakehouse", "smithy", "pottery", "weaver", "carpenter", "butchery", "tannery", "dyer", "brewhouse", "press", "mill", "dairy", "printer", "tailor",
               "studio", "scullery", "bathroom", "refectory", "charnel", "roof"]
ROOMS["workplace"] += ["bakehouse", "smithy", "pottery", "weaver", "carpenter", "butchery", "tannery", "dyer", "brewhouse", "press", "mill", "dairy", "printer", "tailor", "studio"]
ROOMS["home"] += ["scullery", "bathroom"]
ROOMS["church"] += ["refectory", "charnel"]
ROOMS["street"] += ["roof", "forecourt"]
ROOMS["workplace"] += ["factory", "garage", "laundry", "barber", "gym"]
ROOMS["home"] += ["utility"]
ROOMS["tavern"] += ["club"]
ALL_ROOMS = sorted({r for v in ROOMS.values() for r in v})

if __name__ == "__main__":
    probs = check()
    print(f"{len(CENSUS)} kinds of object in {len({r.family for r in CENSUS})} families; {len(ALL_ROOMS)} rooms; {len(STYLES)} styles; {len(ERAS)} eras")
    print("\n".join(probs) or "census checks pass")
