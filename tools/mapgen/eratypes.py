"""Building types for the later eras, each after a real building kind in Moravian towns or, for the Future Darkness,
a published speculative design (the building-designs-by-era doc). Same shape as buildings.TYPES, plus:

  built     (first year, last year) the type was put up; it stands on after that
  role      what it replaces or where it goes: home, shop, inn, civic, church, industry, block (a big type placed on
            open or cleared ground), farm
  model     the real or speculative model, for the plan's key and the doc
  portals   the door and window set (ddcore.PORTALS keys), when not the medieval one
  storeys   for the label and households (a map shows the ground floor)

Footprints are in squares (1 square = 1.5 m), front on the south wall. The plans are the usual layout of each kind,
not drawings of any one building. Assets: Forgotten Adventures up to the Victorian age; Tyger_purr's modern packs from
the mid-century on; Mog's sci-fi pack for the Future Darkness.
"""
import buildings as B
import ddcore as C

# ------------------------------------------------------------------ furniture and fittings by period
FA = dict(bed=B.BED, bigbed=B.BIGBED, chest=B.CHEST, table=B.TABLE, round=B.ROUND, bench=B.BENCH, stool=B.STOOL,
          barrel=B.BARREL, crate=B.CRATE, sack=B.SACK, oven=B.OVEN, pit=B.PIT, wood=B.WOOD)
M = dict(bed="BedDouble01.png", twin="BedTwin01.png", bunk="BedBunk01.png", couch="Couch01.png", coffee="TableCoffeeA01.png",
         table="Table01.png", chair="Chair01.png", fridge="ApplianceRefrigerator01.png", stove="ApplianceStove.png",
         sink="kitchenSinkSingle.png", wc="BathToilet1.png", basin="BathSink.png", bath="Bathtub.png", desk="DeskL01.png",
         till="Register01.png", shelf="StoreShelf100.png", chiller="StoreRefrigerator01.png", cabinet="Cabinet10.png",
         tv="EntertainmentSystem01.png", stair="StairUp01.png", washer="ApplianceWasher.png")
SF = dict(bed="Bed single.png", bigbed="Bed double.png", table="table circular with chairs.png", galley="Galley.png",
          wc="Mog Misc/Colorable/Toilet.png", shower="Mog Misc/Colorable/Shower.png", sink="sink 1.png", console="small terminal.png", medbay="medbay.png",
          crate="Closed compartment.png", monitor="monitor.png")
# sizes in squares of the assets whose names carry none (checked on the PC: pc-job-dd-asset-sizes)
# Cells from each image's own size at 256 px a cell (measured on the PC, 2026-11-11), so the furniture's
# footprint matches what Dungeondraft draws.
PX = 256
C.SIZES.update({name: (max(.25, round(w / PX * 4) / 4), max(.25, round(h / PX * 4) / 4)) for name, (w, h) in {
    "ApplianceRefrigerator01.png": (160, 143),
    "ApplianceStove.png": (160, 128),
    "ApplianceWasher.png": (129, 150),
    "BathSink.png": (80, 80),
    "BathToilet1.png": (96, 144),
    "Bathtub.png": (288, 144),
    "Bed double.png": (354, 163),
    "Bed single.png": (351, 152),
    "BedBunk01.png": (160, 352),
    "BedDouble01.png": (256, 334),
    "BedTwin01.png": (192, 336),
    "Cabinet10.png": (512, 256),
    "Chair01.png": (192, 160),
    "Closed compartment.png": (552, 149),
    "Couch01.png": (416, 160),
    "DeskL01.png": (267, 267),
    "EntertainmentSystem01.png": (422, 93),
    "Galley.png": (554, 151),
    "Register01.png": (96, 64),
    "Shower.png": (264, 164),
    "StairUp01.png": (288, 544),
    "StoreRefrigerator01.png": (268, 153),
    "StoreShelf100.png": (140, 95),
    "Table01.png": (177, 195),
    "TableCoffeeA01.png": (216, 114),
    "Toilet.png": (79, 116),
    "kitchenSinkSingle.png": (96, 96),
    "medbay.png": (776, 1024),
    "monitor.png": (335, 132),
    "sink 1.png": (120, 93),
    "small terminal.png": (64, 41),
    "table circular with chairs.png": (994, 1000),
    "BedTwin02.png": (192, 336),
    "BedQueen01.png": (288, 368),
    "Chair02.png": (160, 160),
    "ChairA01.png": (98, 104),
    "Couch02.png": (384, 160),
    "TableEndA01.png": (114, 114),
    "DeskS01.png": (268, 140),
    "Hutch01.png": (268, 89),
    "TableCoffeeB01.png": (216, 114),
    "KitchenSinkDouble.png": (143, 96),
    "ApplianceMicrowave.png": (111, 96),
    "ApplianceStoveGas.png": (160, 128),
    "Cabinet05.png": (256, 256),
    "Cabinet15.png": (768, 256),
    "CabinetCorner01.png": (256, 256),
    "BathShower.png": (176, 176),
    "BathSink02.png": (96, 80),
    "BathToilet2.png": (96, 144),
    "Urinal01.png": (95, 67),
    "ApplianceDrier.png": (127, 150),
    "ShoppingCart01.png": (224, 128),
    "StoreRefrigerator02.png": (267, 152),
    "StoreDisplay01.png": (268, 153),
    "StoreDisplay02.png": (267, 153),
    "StoreFreezer01.png": (268, 165),
    "StoreMagazine01.png": (268, 95),
    "StoreLotto01.png": (108, 81),
    "Register02.png": (64, 64),
    "CardReader01.png": (48, 64),
    "ElevatorShaft01.png": (608, 608),
    "PillarT02.png": (64, 64),
    "Mog Seating/chair.png": (154, 129),
    "Mog Seating/bench.png": (63, 468),
    "Mog Seating/Colorable/Chair 2.png": (140, 96),
    "Mog Misc/Colorable/table.png": (246, 491),
    "Mog Misc/Colorable/sink2.png": (127, 70),
    "Mog Misc/Colorable/Bed hammock.png": (135, 514),
    "Mog Storage/Colorable/locker red.png": (256, 90),
    "Mog Storage/Colorable/Pallette.png": (326, 326),
    "Mog Storage/Container locked above.png": (139, 70),
    "Mog Storage/sleep chamber closed.png": (256, 483),
    "Mog Consoles/Colorable/console small.png": (128, 128),
    "Mog Consoles/Colorable/wide console.png": (768, 256),
    "Mog Consoles/Colorable/twin monitor.png": (390, 238),
    "Mog Consoles/holotable active.png": (1024, 1024),
    "Mog Misc/Colorable/Extinguisher.png": (43, 31),
}.items()})
C.PORTALS.update({"m-door": ("TDoorKnob36.png", 1), "m-double": ("TDoorGPushPullDouble01.png", 2), "m-window": ("TWindowWide01.png", 2),
                  "s-door": ("Blast door small Closed.png", 1), "s-window": ("dome window.png", 1)})
MODERN = {"door": "m-door", "double": "m-double", "window": "m-window"}
FUTURE = {"door": "s-door", "double": "m-double", "window": "s-window"}
B.FLOORS.update({"marble": "Marble_Tiles_A_White.webp", "tiles": "Square_Tiles_A_01.webp", "light-planks": "Wooden_Flooring_H_Light.webp",
                 "lino": "TTile01.png", "terrazzo": "TTile02.png", "deck": "TygerSFFloor.png"})

ERA_TYPES = {
    # ---------------------------------------------------------------- Renaissance, 1450 on
    "arcade-house": {
        "label": "Arcaded house", "model": "the houses on Telč square", "built": (1450, 1700), "role": "shop", "storeys": 2,
        "size": (7, 12), "wall": "Stone_B.png", "place": "home", "fill": "home",
        # the arcade (podloubí) runs along the front, open to the square; behind it the vaulted hall (mázhaus) with the
        # shop, then the black kitchen and the back room on the yard
        "rooms": [("Back room", 0, 0, 7, 4, "planks"), ("Kitchen", 0, 4, 3, 3, "stone"), ("Hall", 3, 4, 4, 3, "stone"),
                  ("Shop", 0, 7, 7, 3, "stone"), ("Arcade", 0, 10, 7, 2, "stone")],
        "openings": [("arch", 2, 12, "h"), ("arch", 5, 12, "h"), ("double", 3.5, 10, "h"), ("window", 1.5, 10, "h"), ("window", 6, 10, "h"),
                     ("doorway", 5, 7, "h"), ("doorway", 3, 5.5, "v"), ("door", 5, 4, "h"), ("window", 3.5, 0, "h"), ("window", 0, 2, "v")],
        "partitions": [((0, 10), (7, 10)), ((0, 7), (7, 7)), ((0, 4), (7, 4)), ((3, 4), (3, 7))],
        "furnish": {"Back room": [(B.BIGBED, "corner:E", 1), (B.CHEST, "beside:bed", 1), (B.TABLE, "window", 1), (B.BENCH, "beside:table", 1)],
                    "Kitchen": [(B.PIT, "wall", 1), (B.WOOD, "hearth", 1, .8)],
                    "Hall": [(B.BARREL, "wall", 2, .8)],
                    "Shop": [(B.TABLE, "wall:W", 1), (B.CRATE, "corner", 2), (B.SACK, "wall", 1, .8)],
                    "Arcade": []},
    },
    "sgraffito-house": {
        "label": "Sgraffito house", "model": "Slavonice square", "built": (1500, 1650), "role": "home", "storeys": 2,
        "size": (6, 10), "wall": "Stone_C.png", "place": "home", "fill": "home",
        "rooms": [("Back room", 0, 0, 6, 4, "planks"), ("Black kitchen", 0, 4, 2, 3, "stone"), ("Hall", 2, 4, 4, 6, "stone"), ("Front room", 0, 7, 2, 3, "planks")],
        "openings": [("double", 4, 10, "h"), ("window", 1, 10, "h"), ("doorway", 2, 9.4, "v"), ("doorway", 2, 6.4, "v"), ("door", 4, 4, "h"),
                     ("window", 3, 0, "h"), ("window", 6, 2, "v")],
        "partitions": [((0, 4), (6, 4)), ((2, 4), (2, 10)), ((0, 7), (2, 7))],
        "furnish": {"Back room": [(B.BIGBED, "corner:E", 1), (B.CHEST, "beside:bed", 1)], "Black kitchen": [(B.PIT, "wall", 1)],
                    "Hall": [(B.TABLE, "wall:E", 1), (B.BENCH, "beside:table", 1), (B.BARREL, "corner", 1, .8)],
                    "Front room": [(B.CHEST, "wall", 1)]},
    },
    "town-hall": {
        "label": "Town hall", "model": "town halls with towers: Olomouc, Brno's old town hall", "built": (1450, 1800), "role": "civic", "storeys": 2,
        "size": (12, 14), "wall": "Stone_A.png", "place": "workplace", "fill": "office",
        "rooms": [("Council hall", 0, 0, 12, 6, "planks"), ("Court room", 0, 6, 6, 5, "stone"), ("Cells", 6, 6, 3, 5, "stone"),
                  ("Tower", 9, 6, 3, 5, "stone"), ("Arcade", 0, 11, 12, 3, "stone")],
        "openings": [("arch", 3, 14, "h"), ("arch", 6, 14, "h"), ("arch", 9, 14, "h"), ("double", 3, 11, "h"), ("door", 10.5, 11, "h"),
                     ("door", 7.5, 11, "h"), ("doorway", 3, 6, "h"), ("window", 0, 3, "v"), ("window", 12, 3, "v"), ("window", 6, 0, "h")],
        "partitions": [((0, 11), (12, 11)), ((0, 6), (12, 6)), ((6, 6), (6, 11)), ((9, 6), (9, 11))],
        "furnish": {"Council hall": [(B.TABLE, "wall:N", 2), (B.BENCH, "beside:table", 3), (B.CHEST, "corner", 2)],
                    "Court room": [(B.TABLE, "wall:N", 1), (B.BENCH, "wall", 2)], "Cells": [(B.BED, "wall:E", 1)],
                    "Tower": [], "Arcade": []},
    },
    "ghetto-house": {
        "label": "House in the Jewish quarter", "model": "the Jewish quarters of Třebíč and Mikulov", "built": (1450, 1850), "role": "home", "storeys": 3,
        "size": (5, 8), "wall": "Stone_D.png", "place": "home", "fill": "home",
        "rooms": [("Living room", 0, 0, 5, 4, "planks"), ("Kitchen", 0, 4, 2, 4, "stone"), ("Shop", 2, 4, 3, 4, "planks")],
        "openings": [("door", 3.5, 8, "h"), ("window", 1, 8, "h"), ("doorway", 2, 6, "v"), ("doorway", 3.5, 4, "h"), ("window", 2.5, 0, "h")],
        "partitions": [((0, 4), (5, 4)), ((2, 4), (2, 8))],
        "furnish": {"Living room": [(B.BIGBED, "corner:E", 1), (B.TABLE, "window", 1), (B.STOOL, "beside:table", 1)],
                    "Kitchen": [(B.PIT, "wall:W", 1)], "Shop": [(B.CRATE, "wall", 1, .7)]},
    },
    # ---------------------------------------------------------------- Age of Reason, 1601 on
    "baroque-house": {
        "label": "Baroque burgher house", "model": "the re-fronted houses on Brno's Zelný trh", "built": (1650, 1820), "role": "shop", "storeys": 3,
        "size": (7, 11), "wall": "Solid_A.png", "place": "home", "fill": "home",
        "rooms": [("Back room", 0, 0, 7, 4, "planks"), ("Staircase", 0, 4, 2, 3, "stone"), ("Kitchen", 2, 4, 5, 3, "tiles"),
                  ("Shop", 0, 7, 4, 4, "planks"), ("Gateway", 4, 7, 3, 4, "stone")],
        "openings": [("double", 5.5, 11, "h"), ("door", 1, 11, "h"), ("window", 3, 11, "h"), ("doorway", 4, 9, "v"),
                     ("door", 5.5, 7, "h"), ("doorway", 1, 7, "h"), ("doorway", 2, 6.4, "v"), ("door", 1, 4, "h"), ("window", 3.5, 0, "h")],
        "partitions": [((0, 7), (7, 7)), ((0, 4), (7, 4)), ((2, 4), (2, 7)), ((4, 7), (4, 11))],
        "furnish": {"Back room": [(B.BIGBED, "corner:E", 1), (B.CHEST, "beside:bed", 1), (B.ROUND, "corner:W", 1)],
                    "Staircase": [], "Kitchen": [(B.OVEN, "wall", 1, .8), (B.TABLE, "wall", 1)],
                    "Shop": [(B.TABLE, "wall:N", 1), (B.CRATE, "corner", 1), (B.BARREL, "wall", 1, .7)], "Gateway": []},
    },
    "post-inn": {
        "label": "Post inn", "model": "post stations on the imperial roads", "built": (1600, 1860), "role": "inn", "storeys": 2,
        "size": (12, 12), "wall": "Solid_B.png", "place": "tavern", "fill": "home",
        "rooms": [("Stables", 0, 0, 12, 4, "earth"), ("Yard", 4, 4, 8, 4, "earth"), ("Kitchen", 0, 4, 4, 4, "tiles"),
                  ("Taproom", 0, 8, 8, 4, "planks"), ("Gateway", 8, 8, 4, 4, "stone")],
        "openings": [("double", 10, 12, "h"), ("double", 4, 12, "h"), ("window", 1.5, 12, "h"), ("window", 6.5, 12, "h"), ("doorway", 10, 8, "h"),
                     ("door", 6, 8, "h"), ("door", 4, 6, "v"), ("double", 8, 4, "h"), ("window", 12, 2, "v")],
        "partitions": [((0, 8), (12, 8)), ((0, 4), (12, 4)), ((4, 4), (4, 8)), ((8, 8), (8, 12))],
        "furnish": {"Stables": [("Trough_Wood_Ashen_Grain_A_2x1.webp", "wall:N", 3), ("Hay_Bale_A_01_1x1.webp", "wall", 3, .8)], "Yard": [],
                    "Kitchen": [(B.OVEN, "corner:W", 1), (B.BARREL, "wall", 1, .8)],
                    "Taproom": [("Bar_Wood_Ashen_A2_3x1.webp", "wall:N", 1), (B.KEG, "beside:bar", 1, .8), (B.STOOL, "front:bar", 3, .8), (B.ROUND, "wall", 2), (B.STOOL, "beside:table", 3, .8)], "Gateway": []},
    },
    "manufactory": {
        "label": "Cloth manufactory", "model": "Brno's fine-cloth works of the 1760s", "built": (1700, 1840), "role": "industry", "storeys": 2,
        "size": (10, 20), "wall": "Brick_A.png", "place": "workplace", "fill": "workshop",
        "rooms": [("Store", 0, 0, 10, 5, "earth"), ("Weaving room", 0, 5, 10, 10, "planks"), ("Counting room", 0, 15, 5, 5, "planks"), ("Master's flat", 5, 15, 5, 5, "planks")],
        "openings": [("double", 2.5, 20, "h"), ("door", 7.5, 20, "h"), ("window", 0, 8, "v"), ("window", 0, 12, "v"), ("window", 10, 8, "v"),
                     ("window", 10, 12, "v"), ("doorway", 2.5, 15, "h"), ("door", 7.5, 15, "h"), ("double", 5, 5, "h"), ("double", 5, 0, "h")],
        "partitions": [((0, 15), (10, 15)), ((5, 15), (5, 20)), ((0, 5), (10, 5))],
        "furnish": {"Store": [(B.CRATE, "wall", 4), (B.SACK, "wall", 3, .8)],
                    "Weaving room": [(B.TABLE, "end:W", 3, .9), (B.STOOL, "wall:E", 2, .8), (B.CRATE, "corner", 2)],
                    "Counting room": [(B.TABLE, "wall:W", 1), (B.STOOL, "beside:table", 1), (B.CHEST, "corner", 1)],
                    "Master's flat": [(B.BIGBED, "corner", 1, .9), (B.CHEST, "beside:bed", 1), (B.PIT, "wall:N", 1)]},
    },
    # ---------------------------------------------------------------- Victorian, 1837 on
    "tenement": {
        "label": "Courtyard tenement", "model": "Brno's ring-road tenements (činžovní dům)", "built": (1860, 1914), "role": "block", "storeys": 4, "flats": 12,
        "size": (14, 12), "wall": "Solid_C.png", "place": "home", "fill": "home",
        # ground floor: two shops on the street either side of the carriage way, then the courtyard with the stair and
        # the gallery flats round it (the galleries, pavlač, run above)
        "rooms": [("Shop", 0, 8, 6, 4, "planks"), ("Carriage way", 6, 8, 2, 4, "stone"), ("Second shop", 8, 8, 6, 4, "planks"),
                  ("Courtyard", 3, 3, 8, 5, "stone"), ("Flat", 0, 0, 3, 8, "planks"), ("Back flat", 3, 0, 8, 3, "planks"), ("Corner flat", 11, 0, 3, 8, "planks")],
        "openings": [("double", 7, 12, "h"), ("door", 3, 12, "h"), ("door", 11, 12, "h"), ("window", 1.2, 12, "h"), ("window", 4.8, 12, "h"),
                     ("window", 9.2, 12, "h"), ("window", 12.8, 12, "h"), ("doorway", 7, 8, "h"), ("door", 3, 5.5, "v"), ("door", 11, 5.5, "v"),
                     ("door", 7, 3, "h"), ("window", 7, 0, "h"), ("window", 0, 4, "v"), ("window", 14, 4, "v")],
        "partitions": [((0, 8), (3, 8)), ((11, 8), (14, 8)), ((3, 8), (6, 8)), ((8, 8), (11, 8)), ((6, 8), (6, 12)), ((8, 8), (8, 12)),
                       ((3, 0), (3, 8)), ((11, 0), (11, 8)), ((3, 3), (11, 3))],
        "furnish": {"Shop": [(B.TABLE, "wall:W", 1), (B.CRATE, "corner", 2)], "Carriage way": [], "Second shop": [(B.TABLE, "wall:E", 1), (B.BARREL, "corner", 1)],
                    "Courtyard": [(B.BARREL, "corner", 1, .5)],
                    "Flat": [(B.BED, "wall:W", 1), (B.TABLE, "wall", 1), (B.PIT, "corner", 1)],
                    "Back flat": [(B.BIGBED, "corner:W", 1), (B.ROUND, "corner:E", 1)],
                    "Corner flat": [(B.BED, "wall:E", 1), (B.TABLE, "wall", 1), (B.PIT, "corner", 1)]},
    },
    "mill": {
        "label": "Textile mill", "model": "Brno's mills, the \"Moravian Manchester\"", "built": (1840, 1960), "role": "industry", "storeys": 4,
        "size": (14, 28), "wall": "Brick_B.png", "place": "workplace", "fill": "workshop",
        "rooms": [("Boiler house", 0, 0, 6, 6, "stone"), ("Store", 6, 0, 8, 6, "earth"), ("Spinning floor", 0, 6, 14, 12, "planks"),
                  ("Weaving shed", 0, 18, 10, 10, "planks"), ("Office", 10, 18, 4, 10, "planks")],
        "openings": [("double", 5, 28, "h"), ("door", 12, 28, "h"), ("window", 0, 9, "v"), ("window", 0, 13, "v"), ("window", 14, 9, "v"),
                     ("window", 14, 13, "v"), ("window", 0, 22, "v"), ("double", 4, 18, "h"), ("door", 10, 23, "v"), ("double", 9, 6, "h"),
                     ("door", 3, 6, "h"), ("double", 10, 0, "h")],
        "partitions": [((0, 18), (14, 18)), ((10, 18), (10, 28)), ((0, 6), (14, 6)), ((6, 0), (6, 6))],
        "furnish": {"Boiler house": [(B.FORGE, "wall:N", 1), ("Sack_Brown_E_Coals_1x1.webp", "wall", 3, .8)],
                    "Store": [(B.CRATE, "wall", 5), (B.SACK, "wall", 3, .8)],
                    "Spinning floor": [(B.STOOL, "end:W", 4, .9), (B.STOOL, "end:E", 4, .9)],
                    "Weaving shed": [(B.TABLE, "end:W", 3, .9), (B.TABLE, "end:E", 2, .9)],
                    "Office": [(B.TABLE, "wall:E", 1), (B.STOOL, "beside:table", 1), (B.CHEST, "corner", 1)]},
    },
    "villa": {
        "label": "Villa", "model": "the Black Fields villas in Brno", "built": (1860, 1914), "role": "home", "storeys": 2,
        "size": (10, 10), "wall": "Solid_D.png", "place": "home", "fill": "home",
        "rooms": [("Salon", 0, 5, 6, 5, "light-planks"), ("Hall", 6, 5, 4, 5, "marble"), ("Dining room", 0, 0, 6, 5, "light-planks"), ("Kitchen", 6, 0, 4, 5, "tiles")],
        "openings": [("double", 8, 10, "h"), ("window", 1.5, 10, "h"), ("window", 4.5, 10, "h"), ("window", 0, 7.5, "v"), ("window", 0, 2.5, "v"),
                     ("doorway", 6, 7.5, "v"), ("doorway", 3, 5, "h"), ("door", 9.3, 5, "h"), ("door", 10, 2.5, "v"), ("window", 3, 0, "h")],
        "partitions": [((0, 5), (10, 5)), ((6, 0), (6, 10))],
        "furnish": {"Salon": [(B.ROUND, "corner:W", 1), (B.BENCH, "wall:N", 1)], "Hall": [],
                    "Dining room": [(B.TABLE, "wall:N", 2), (B.BENCH, "beside:table", 2)], "Kitchen": [(B.OVEN, "wall", 1), (B.BARREL, "wall", 1, .7)]},
    },
    "school": {
        "label": "School", "model": "imperial school buildings", "built": (1870, 1960), "role": "civic", "storeys": 2,
        "size": (20, 10), "wall": "Brick_C.png", "place": "workplace", "fill": "office",
        "rooms": [("Classroom", 0, 0, 7, 7, "planks"), ("Second classroom", 7, 0, 6, 7, "planks"), ("Third classroom", 13, 0, 7, 7, "planks"), ("Corridor", 0, 7, 20, 3, "tiles")],
        "openings": [("double", 10, 10, "h"), ("window", 2, 10, "h"), ("window", 17, 10, "h"), ("door", 3.5, 7, "h"), ("door", 10, 7, "h"), ("door", 16.5, 7, "h"),
                     ("window", 2, 0, "h"), ("window", 5, 0, "h"), ("window", 10, 0, "h"), ("window", 15, 0, "h"), ("window", 18, 0, "h")],
        "partitions": [((0, 7), (20, 7)), ((7, 0), (7, 7)), ((13, 0), (13, 7))],
        "furnish": {"Classroom": [(B.TABLE, "end:W", 3, .9), (B.BENCH, "end:E", 3, .9)], "Second classroom": [(B.TABLE, "end:W", 3, .9), (B.BENCH, "end:E", 2, .9)],
                    "Third classroom": [(B.TABLE, "end:W", 3, .9), (B.BENCH, "end:E", 3, .9)], "Corridor": [(B.BENCH, "wall:N", 2, .8)]},
    },
    # ---------------------------------------------------------------- Great War, 1914 on
    "hut": {
        "label": "Army hut", "model": "wartime hutted barracks and field hospitals", "built": (1914, 1950), "role": "block", "storeys": 1,
        "size": (16, 5), "wall": "Wood_Dark_A.png", "place": "workplace", "fill": "armory",
        "rooms": [("Ward", 0, 0, 13, 5, "planks"), ("Orderly room", 13, 0, 3, 5, "planks")],
        "openings": [("door", 6.5, 5, "h"), ("window", 2, 5, "h"), ("window", 10, 5, "h"), ("window", 2, 0, "h"), ("window", 10, 0, "h"), ("doorway", 13, 2.5, "v"), ("door", 16, 2.5, "v")],
        "partitions": [((13, 0), (13, 5))],
        "furnish": {"Ward": [(B.BED, "end:N", 5, .9), (B.BED, "end:S", 4, .9), ("Brazier_A_1x1.webp", "hearth", 1)],
                    "Orderly room": [(B.TABLE, "wall", 1), (B.STOOL, "beside:table", 1), (B.CHEST, "corner", 1)]},
    },
    # ---------------------------------------------------------------- Mid-century, 1919 on
    "bata-house": {
        "label": "Baťa house", "model": "the Zlín workers' houses (Baťa's 6.15 m module)", "built": (1924, 1950), "role": "home", "storeys": 2, "flats": 2,
        "size": (8, 5), "wall": "Brick_D.png", "place": "home", "fill": "home", "portals": MODERN,
        # a pair of houses under one flat roof, each four squares wide (the module), living room and kitchen below
        "rooms": [("Living room", 0, 0, 4, 5, "light-planks"), ("Neighbours' living room", 4, 0, 4, 5, "light-planks")],
        "openings": [("door", 1, 5, "h"), ("door", 7, 5, "h"), ("window", 2.8, 5, "h"), ("window", 5.2, 5, "h"), ("window", 2, 0, "h"), ("window", 6, 0, "h")],
        "partitions": [((4, 0), (4, 5))],
        "furnish": {"Living room": [(M["couch"], "wall:W", 1), (M["table"], "window", 1), (M["chair"], "beside:table", 1), (M["stove"], "corner:E", 1)],
                    "Neighbours' living room": [(M["couch"], "wall:E", 1), (M["table"], "window", 1), (M["chair"], "beside:table", 1), (M["stove"], "corner:W", 1)]},
    },
    "func-villa": {
        "label": "Functionalist villa", "model": "Villa Tugendhat, Brno (1930)", "built": (1928, 1948), "role": "home", "storeys": 2,
        "size": (14, 9), "wall": "Solid_G.png", "place": "home", "fill": "home", "portals": MODERN,
        "rooms": [("Living space", 0, 0, 10, 9, "light-planks"), ("Kitchen", 10, 0, 4, 5, "lino"), ("Entrance", 10, 5, 4, 4, "marble")],
        "openings": [("door", 12, 9, "h"), ("window", 2.5, 9, "h"), ("window", 6.5, 9, "h"), ("window", 2.5, 0, "h"), ("window", 6.5, 0, "h"), ("window", 0, 4.5, "v"),
                     ("doorway", 10, 7, "v"), ("door", 12, 5, "h")],
        "partitions": [((10, 0), (10, 9)), ((10, 5), (14, 5))],
        "furnish": {"Living space": [(M["couch"], "wall:W", 2), (M["coffee"], "beside:couch", 1, .9), (M["table"], "window", 1), (M["chair"], "beside:table", 2), (M["desk"], "corner:E", 1)],
                    "Kitchen": [(M["stove"], "wall:N", 1), (M["fridge"], "corner", 1), (M["sink"], "wall:E", 1)], "Entrance": []},
    },
    "dept-store": {
        "label": "Department store", "model": "the Baťa stores of Zlín and Brno", "built": (1930, 1990), "role": "block", "storeys": 5,
        "size": (14, 12), "wall": "Tyger_wall.png", "place": "workplace", "fill": "shop", "portals": MODERN,
        "rooms": [("Sales floor", 0, 4, 14, 8, "terrazzo"), ("Stair and lifts", 0, 0, 5, 4, "terrazzo"), ("Stock room", 5, 0, 9, 4, "lino")],
        "openings": [("double", 4, 12, "h"), ("double", 10, 12, "h"), ("window", 1.5, 12, "h"), ("window", 7, 12, "h"), ("window", 12.5, 12, "h"),
                     ("window", 0, 8, "v"), ("window", 14, 8, "v"), ("doorway", 2.5, 4, "h"), ("door", 9.5, 4, "h"), ("double", 9.5, 0, "h")],
        "partitions": [((0, 4), (14, 4)), ((5, 0), (5, 4))],
        "furnish": {"Sales floor": [(M["shelf"], "end:W", 3, .9), (M["shelf"], "end:E", 3, .9), (M["till"], "wall:S", 2)],
                    "Stair and lifts": [(M["stair"], "corner:W", 1)], "Stock room": [(B.CRATE, "wall", 5), (M["shelf"], "wall:N", 1)]},
    },
    "panel-block": {
        "label": "Panel block", "model": "Brno-Lesná, 1960s (T06B system)", "built": (1958, 1990), "role": "block", "storeys": 8, "flats": 48,
        "size": (30, 8), "wall": "Tyger_wall.png", "place": "home", "fill": "home", "portals": MODERN,
        # one entrance and stair core to each four flats a floor; the ground floor shows two flats beside each core
        "rooms": [("Flat", 0, 0, 7, 8, "lino"), ("Stair core", 7, 0, 3, 8, "terrazzo"), ("Second flat", 10, 0, 5, 8, "lino"),
                  ("Third flat", 15, 0, 5, 8, "lino"), ("Second stair core", 20, 0, 3, 8, "terrazzo"), ("Fourth flat", 23, 0, 7, 8, "lino")],
        "openings": [("door", 8.5, 8, "h"), ("door", 21.5, 8, "h"), ("door", 7, 6.8, "v"), ("door", 10, 6.8, "v"), ("door", 20, 6.8, "v"), ("door", 23, 6.8, "v"),
                     ("window", 3.5, 8, "h"), ("window", 12.5, 8, "h"), ("window", 17.5, 8, "h"), ("window", 26.5, 8, "h"),
                     ("window", 3.5, 0, "h"), ("window", 12.5, 0, "h"), ("window", 17.5, 0, "h"), ("window", 26.5, 0, "h")],
        "partitions": [((7, 0), (7, 8)), ((10, 0), (10, 8)), ((15, 0), (15, 8)), ((20, 0), (20, 8)), ((23, 0), (23, 8))],
        "furnish": {"Flat": [(M["bed"], "corner:W", 1), (M["couch"], "wall", 1), (M["stove"], "wall:N", 1), (M["fridge"], "beside:stove", 1)],
                    "Stair core": [(M["stair"], "wall", 1)],
                    "Second flat": [(M["twin"], "wall:E", 1), (M["table"], "window", 1), (M["stove"], "wall:N", 1)],
                    "Third flat": [(M["twin"], "wall:W", 1), (M["table"], "window", 1), (M["stove"], "wall:N", 1)],
                    "Second stair core": [(M["stair"], "wall", 1)],
                    "Fourth flat": [(M["bed"], "corner:E", 1), (M["couch"], "wall", 1), (M["stove"], "wall:N", 1), (M["fridge"], "beside:stove", 1)]},
    },
    "culture-house": {
        "label": "House of culture", "model": "the town houses of culture", "built": (1950, 1990), "role": "civic", "storeys": 2,
        "size": (18, 16), "wall": "Tyger_wall.png", "place": "tavern", "fill": "office", "portals": MODERN,
        "rooms": [("Hall", 0, 0, 18, 10, "light-planks"), ("Foyer", 0, 10, 10, 6, "terrazzo"), ("Club room", 10, 10, 8, 6, "lino")],
        "openings": [("double", 5, 16, "h"), ("window", 2, 16, "h"), ("window", 8, 16, "h"), ("window", 14, 16, "h"), ("double", 5, 10, "h"),
                     ("door", 10, 13, "v"), ("door", 18, 5, "v")],
        "partitions": [((0, 10), (18, 10)), ((10, 10), (10, 16))],
        "furnish": {"Hall": [(M["chair"], "end:S", 6, .9), (M["chair"], "end:N", 4, .9)], "Foyer": [(M["couch"], "wall:W", 1)],
                    "Club room": [(M["table"], "wall", 2), (M["chair"], "beside:table", 3), (M["tv"], "wall:E", 1)]},
    },
    # ---------------------------------------------------------------- Modern, 1990 on
    "hypermarket": {
        "label": "Supermarket", "model": "1990s supermarkets and retail parks on the roads out of town", "built": (1995, 2098), "role": "block", "storeys": 1,
        "size": (22, 14), "wall": "Tyger_wall.png", "place": "workplace", "fill": "shop", "portals": MODERN,
        "rooms": [("Sales floor", 0, 4, 22, 10, "lino"), ("Store and loading bay", 0, 0, 16, 4, "terrazzo"), ("Staff room", 16, 0, 6, 4, "lino")],
        "openings": [("double", 6, 14, "h"), ("double", 16, 14, "h"), ("double", 8, 4, "h"), ("door", 19, 4, "h"), ("double", 4, 0, "h"), ("double", 12, 0, "h")],
        "partitions": [((0, 4), (22, 4)), ((16, 0), (16, 4))],
        "furnish": {"Sales floor": [(M["shelf"], "end:W", 4, .9), (M["shelf"], "end:E", 4, .9), (M["chiller"], "wall:N", 2), (M["till"], "wall:S", 3)],
                    "Store and loading bay": [(B.CRATE, "wall", 5), (M["shelf"], "wall:N", 1)],
                    "Staff room": [(M["table"], "wall", 1), (M["chair"], "beside:table", 2), (M["fridge"], "corner", 1)]},
    },
    "petrol-station": {
        "label": "Petrol station shop", "model": "1990s roadside stations", "built": (1990, 2060), "role": "shop", "storeys": 1,
        "size": (8, 6), "wall": "Tyger_wall.png", "place": "workplace", "fill": "shop", "portals": MODERN,
        "rooms": [("Shop", 0, 2, 8, 4, "lino"), ("Back office", 0, 0, 8, 2, "lino")],
        "openings": [("double", 4, 6, "h"), ("window", 1.5, 6, "h"), ("window", 6.5, 6, "h"), ("door", 6, 2, "h")],
        "partitions": [((0, 2), (8, 2))],
        "furnish": {"Shop": [(M["shelf"], "end:W", 2, .9), (M["chiller"], "wall:N", 1), (M["till"], "wall:E", 1)], "Back office": [(M["desk"], "wall", 1, .6)]},
    },
    "suburban-house": {
        "label": "Entrepreneur's house", "model": "1990s suburban houses (\"entrepreneur baroque\")", "built": (1992, 2098), "role": "home", "storeys": 2,
        "size": (9, 8), "wall": "Solid_B.png", "place": "home", "fill": "home", "portals": MODERN,
        "rooms": [("Living room", 0, 3, 6, 5, "light-planks"), ("Kitchen", 0, 0, 6, 3, "tiles"), ("Garage", 6, 0, 3, 8, "terrazzo")],
        "openings": [("door", 3, 8, "h"), ("window", 1, 8, "h"), ("window", 5, 8, "h"), ("double", 7.5, 8, "h"), ("doorway", 3, 3, "h"), ("door", 6, 1.5, "v"), ("window", 3, 0, "h")],
        "partitions": [((0, 3), (6, 3)), ((6, 0), (6, 8))],
        "furnish": {"Living room": [(M["couch"], "wall:W", 1), (M["tv"], "wall:E", 1), (M["coffee"], "beside:couch", 1, .8)],
                    "Kitchen": [(M["stove"], "wall:N", 1), (M["fridge"], "corner", 1), (M["sink"], "wall:N", 1), (M["table"], "wall:S", 1, .7)], "Garage": []},
    },
    # ---------------------------------------------------------------- Future Darkness, 2010 on
    "printed-house": {
        "label": "Printed house", "model": "3D-printed concrete houses, built since about 2018", "built": (2020, 2098), "role": "home", "storeys": 1,
        "size": (8, 8), "wall": "Solid_G.png", "place": "home", "fill": "home", "portals": FUTURE,
        "rooms": [("Living room", 0, 3, 8, 5, "terrazzo"), ("Bedroom", 0, 0, 4, 3, "terrazzo"), ("Wet room", 4, 0, 4, 3, "deck")],
        "openings": [("door", 4, 8, "h"), ("window", 1.5, 8, "h"), ("window", 6.5, 8, "h"), ("door", 3.3, 3, "h"), ("door", 6, 3, "h"), ("window", 2, 0, "h")],
        "partitions": [((0, 3), (8, 3)), ((4, 0), (4, 3))],
        "furnish": {"Living room": [(SF["table"], "wall", 1, .5), (SF["galley"], "wall:E", 1)], "Bedroom": [(SF["bigbed"], "corner:W", 1)],
                    "Wet room": [(SF["wc"], "corner:E", 1), (SF["shower"], "corner:W", 1)]},
    },
    "capsule-tower": {
        "label": "Capsule tower", "model": "Kurokawa's Nakagin Capsule Tower (1972)", "built": (2030, 2098), "role": "block", "storeys": 12, "flats": 60,
        "size": (12, 12), "wall": "Tyger_wall.png", "place": "home", "fill": "home", "portals": FUTURE,
        # a core of stair and lifts with capsules plugged on round it; each capsule is a bed, a desk and a wet cell
        "rooms": [("Core", 4, 4, 4, 4, "deck"), ("Capsule", 0, 0, 4, 4, "deck"), ("Capsule two", 8, 0, 4, 4, "deck"), ("Capsule three", 0, 8, 4, 4, "deck"),
                  ("Capsule four", 8, 8, 4, 4, "deck"), ("Lobby", 4, 8, 4, 4, "deck"), ("Plant room", 4, 0, 4, 4, "deck"),
                  ("Capsule five", 0, 4, 4, 4, "deck"), ("Capsule six", 8, 4, 4, 4, "deck")],
        "openings": [("door", 6, 12, "h"), ("doorway", 6, 8, "h"), ("door", 4, 6, "v"), ("door", 8, 6, "v"), ("door", 6, 4, "h"),
                     ("door", 4, 2, "v"), ("door", 8, 2, "v"), ("door", 4, 10, "v"), ("door", 8, 10, "v"),
                     ("window", 0, 2, "v"), ("window", 12, 2, "v"), ("window", 0, 10, "v"), ("window", 12, 10, "v"), ("window", 0, 6, "v"), ("window", 12, 6, "v")],
        "partitions": [((4, 0), (4, 12)), ((8, 0), (8, 12)), ((0, 4), (12, 4)), ((0, 8), (12, 8))],
        "furnish": {"Core": [(SF["console"], "corner", 1)], "Lobby": [], "Plant room": [(SF["crate"], "wall:N", 1)],
                    "Capsule": [(SF["bed"], "wall:W", 1), (SF["monitor"], "corner", 1)], "Capsule two": [(SF["bed"], "wall:E", 1), (SF["monitor"], "corner", 1)],
                    "Capsule three": [(SF["bed"], "wall:W", 1), (SF["wc"], "corner", 1)], "Capsule four": [(SF["bed"], "wall:E", 1), (SF["wc"], "corner", 1)],
                    "Capsule five": [(SF["bed"], "wall:W", 1)], "Capsule six": [(SF["bed"], "wall:E", 1)]},
    },
    "vertical-farm": {
        "label": "Vertical farm", "model": "Despommier's vertical farm proposals", "built": (2035, 2098), "role": "block", "storeys": 10,
        "size": (14, 14), "wall": "Tyger_wall.png", "place": "workplace", "fill": "workshop", "portals": FUTURE,
        "rooms": [("Growing floor", 0, 0, 14, 10, "deck"), ("Packing hall", 0, 10, 9, 4, "deck"), ("Water plant", 9, 10, 5, 4, "deck")],
        "openings": [("double", 4, 14, "h"), ("door", 11.5, 14, "h"), ("double", 4, 10, "h"), ("door", 11.5, 10, "h"), ("window", 0, 5, "v"), ("window", 14, 5, "v"), ("window", 7, 0, "h")],
        "partitions": [((0, 10), (14, 10)), ((9, 10), (9, 14))],
        "furnish": {"Growing floor": [("Plant_Pot_Clay_Brown_A_1x1.webp", "end:W", 4, .9), ("Plant_Pot_Clay_Brown_A_1x1.webp", "end:E", 4, .9)],
                    "Packing hall": [(SF["crate"], "wall", 4), (SF["console"], "corner", 1)], "Water plant": [(SF["console"], "wall:E", 1), (SF["crate"], "corner", 1)]},
    },
}
# ---------------------------------------------------------------- fuller furnishing for the later eras
# Real-size furniture is small beside a room (a double bed is 1 x 1.25 squares), so the later types get full sets:
# whole kitchens and living rooms, and shops and halls laid out in rows on fixed spots ("at:" rules).
M.update(queen="BedQueen01.png", twin2="BedTwin02.png", chair2="Chair02.png", armchair="ChairA01.png", couch2="Couch02.png",
         endtable="TableEndA01.png", smalldesk="DeskS01.png", hutch="Hutch01.png", coffee2="TableCoffeeB01.png",
         sink2="KitchenSinkDouble.png", micro="ApplianceMicrowave.png", gas="ApplianceStoveGas.png", cab="Cabinet05.png",
         counter="Cabinet15.png", cabcorner="CabinetCorner01.png", shower="BathShower.png", basin2="BathSink02.png",
         wc2="BathToilet2.png", urinal="Urinal01.png", drier="ApplianceDrier.png", cart="ShoppingCart01.png",
         chiller2="StoreRefrigerator02.png", display="StoreDisplay01.png", display2="StoreDisplay02.png",
         freezer="StoreFreezer01.png", mags="StoreMagazine01.png", lotto="StoreLotto01.png", till2="Register02.png")
SF.update(chair="Mog Seating/chair.png", bench="Mog Seating/bench.png", chair2="Mog Seating/Colorable/Chair 2.png",
          table2="Mog Misc/Colorable/table.png", sink2="Mog Misc/Colorable/sink2.png", hammock="Mog Misc/Colorable/Bed hammock.png",
          locker="Mog Storage/Colorable/locker red.png", pallet="Mog Storage/Colorable/Pallette.png", box="Mog Storage/Container locked above.png",
          pod="Mog Storage/sleep chamber closed.png", csmall="Mog Consoles/Colorable/console small.png",
          cwide="Mog Consoles/Colorable/wide console.png", twinmon="Mog Consoles/Colorable/twin monitor.png")


def row(asset, x0, x1, y, step, turn=0, gaps=(), sc=1.0):
    """Fixed spots along a line (room cells from the room's corner): a shop aisle, a row of seats or of pots.
    gaps: (from, to) stretches left open for a cross aisle."""
    out, x = [], x0
    while x <= x1 + 1e-6:
        if not any(a <= x <= b for a, b in gaps):
            out.append((asset, f"at:{x:.2f}:{y:.2f}" + (":1" if turn else ""), 1, sc))
        x += step
    return out


def rows(asset, x0, x1, ys, step, **kw):
    return [e for y in ys for e in row(asset, x0, x1, y, step, **kw)]


LIVING = lambda side: [(M["couch2"], f"wall:{side}", 1), (M["coffee2"], "beside:couch", 1), (M["armchair"], "beside:couch", 2),
                       (M["hutch"], "wall", 1), (M["endtable"], "beside:couch", 1)]
KITCHEN = [(M["gas"], "wall:N", 1), (M["sink2"], "beside:stove", 1), (M["fridge"], "beside:stove", 1), (M["cab"], "wall", 1)]
FULLER = {
    "bata-house": {
        "Living room": [(M["stove"], "corner:E", 1), (M["sink2"], "beside:stove", 1), (M["table"], "window", 1), (M["chair2"], "beside:table", 2),
                        (M["couch"], "wall:W", 1), (M["hutch"], "wall", 1), (M["armchair"], "beside:couch", 1)],
        "Neighbours' living room": [(M["stove"], "corner:W", 1), (M["sink2"], "beside:stove", 1), (M["table"], "window", 1), (M["chair2"], "beside:table", 2),
                                    (M["couch"], "wall:E", 1), (M["hutch"], "wall", 1), (M["armchair"], "beside:couch", 1)]},
    "func-villa": {
        "Living space": [(M["couch2"], "wall:W", 2), (M["coffee2"], "beside:couch", 1), (M["armchair"], "beside:couch", 3), (M["endtable"], "beside:couch", 2),
                         (M["table"], "window", 2), (M["chair2"], "beside:table", 6), (M["desk"], "corner:E", 1), (M["chair2"], "beside:desk", 1),
                         (M["hutch"], "wall", 2), (M["tv"], "wall", 1)],
        "Kitchen": KITCHEN + [(M["counter"], "wall", 1), (M["micro"], "wall", 1), (M["table"], "wall", 1), (M["chair2"], "beside:table", 2)],
        "Entrance": [(M["hutch"], "wall", 1), (M["armchair"], "wall", 2), (M["endtable"], "wall", 1)]},
    "dept-store": {
        "Sales floor": rows(M["display"], 1.2, 12.6, (1.3, 3.1), 1.05, gaps=((6.2, 7.4),)) + rows(M["display2"], 1.2, 12.6, (4.9,), 1.05, gaps=((2.8, 4.9), (8.9, 10.9)))
                       + [(M["chiller2"], "wall:W", 2), (M["counter"], "wall:E", 1), (M["till2"], "beside:counter", 1), (M["mags"], "wall", 1)],
        "Stair and lifts": [(M["stair"], "corner:W", 1), ("ElevatorShaft01.png", "corner:E", 1)],
        "Stock room": [(B.CRATE, "wall", 6), (M["counter"], "wall:N", 1), (M["shelf"], "wall", 4, 2)]},
    "panel-block": {
        "Flat": [(M["queen"], "corner:W", 1), (M["hutch"], "wall", 1)] + KITCHEN + [(M["table"], "window", 1), (M["chair2"], "beside:table", 3),
                 (M["couch2"], "wall", 1), (M["coffee2"], "beside:couch", 1), (M["tv"], "wall", 1), (M["washer"], "corner", 1)],
        "Stair core": [(M["stair"], "wall", 1), ("Mog Misc/Colorable/Extinguisher.png", "wall", 1)],
        "Second flat": [(M["twin2"], "wall:E", 1), (M["hutch"], "wall", 1), (M["gas"], "wall:N", 1), (M["sink2"], "beside:stove", 1), (M["fridge"], "beside:stove", 1),
                        (M["table"], "window", 1), (M["chair2"], "beside:table", 2), (M["couch"], "wall", 1)],
        "Third flat": [(M["twin2"], "wall:W", 1), (M["hutch"], "wall", 1), (M["gas"], "wall:N", 1), (M["sink2"], "beside:stove", 1), (M["fridge"], "beside:stove", 1),
                       (M["table"], "window", 1), (M["chair2"], "beside:table", 2), (M["couch"], "wall", 1)],
        "Second stair core": [(M["stair"], "wall", 1), ("Mog Misc/Colorable/Extinguisher.png", "wall", 1)],
        "Fourth flat": [(M["queen"], "corner:E", 1), (M["hutch"], "wall", 1)] + KITCHEN + [(M["table"], "window", 1), (M["chair2"], "beside:table", 3),
                        (M["couch2"], "wall", 1), (M["coffee2"], "beside:couch", 1), (M["tv"], "wall", 1), (M["washer"], "corner", 1)]},
    "culture-house": {
        "Hall": [(M["counter"], "wall:N", 3)] + rows(M["chair2"], 1.5, 16.0, (3.6, 4.6, 5.6, 6.6, 7.6), .85, gaps=((8.0, 9.6),)),
        "Foyer": [(M["counter"], "wall:W", 1), (M["couch"], "wall", 2), (M["coffee2"], "beside:couch", 1), (M["armchair"], "beside:couch", 2), (M["hutch"], "wall", 1)],
        "Club room": [(M["table"], "wall", 2), (M["chair2"], "beside:table", 6), (M["tv"], "wall:E", 1), (M["couch2"], "wall", 1), (M["counter"], "wall", 1)]},
    "hypermarket": {
        "Sales floor": rows(M["display"], 1.3, 20.2, (1.6, 3.2), 1.05, gaps=((6.6, 8.0), (13.6, 15.0))) + rows(M["display2"], 1.3, 20.2, (4.8,), 1.05, gaps=((6.6, 8.0), (13.6, 15.0)))
                       + [(M["freezer"], "wall:N", 6), (M["chiller2"], "wall:W", 3), (M["chiller2"], "wall:E", 3)]
                       + row(M["counter"], 2.0, 18.0, 6.9, 4.0, gaps=((4.5, 8.5), (14.5, 17.5))) + [(M["cart"], "wall:S", 4), (M["mags"], "wall", 1), (M["lotto"], "wall", 1)],
        "Store and loading bay": [(SF["pallet"], "wall", 5), (B.CRATE, "wall", 6), (M["counter"], "wall:N", 1)],
        "Staff room": [(M["table"], "wall", 1), (M["chair2"], "beside:table", 3), (M["fridge"], "corner", 1), (M["micro"], "wall", 1), (M["sink2"], "wall", 1), (M["hutch"], "wall", 1)]},
    "petrol-station": {
        "Shop": row(M["display"], 1.2, 4.4, 1.2, 1.05) + [(M["freezer"], "wall:N", 2), (M["counter"], "wall:E", 1), (M["till2"], "beside:counter", 1),
                 (M["mags"], "wall:W", 1), (M["lotto"], "wall", 1)],
        "Back office": [(M["smalldesk"], "wall", 1), (M["chair2"], "beside:desk", 1), (M["cab"], "wall", 1), (M["wc2"], "corner", 1), (M["basin2"], "wall", 1)]},
    "suburban-house": {
        "Living room": LIVING("W") + [(M["tv"], "wall:E", 1), (M["couch"], "wall", 1)],
        "Kitchen": KITCHEN + [(M["micro"], "wall", 1), (M["table"], "wall:S", 1), (M["chair2"], "beside:table", 3)],
        "Garage": [(M["washer"], "wall", 1), (M["drier"], "wall", 1), (B.CRATE, "wall", 1, .7)]},
    "printed-house": {
        "Living room": [(SF["table2"], "wall", 1), (SF["chair"], "beside:table", 3), (SF["galley"], "wall:E", 1), (SF["bench"], "wall", 1), (SF["twinmon"], "wall", 1),
                        (SF["locker"], "wall", 1)],
        "Bedroom": [(SF["bigbed"], "corner:W", 1), (SF["locker"], "wall", 1), (SF["box"], "wall", 1)],
        "Wet room": [(SF["wc"], "corner:E", 1), (SF["shower"], "corner:W", 1), (SF["sink2"], "wall", 1)]},
    "capsule-tower": {
        "Core": [(SF["csmall"], "corner", 1), (SF["locker"], "wall", 1)], "Lobby": [(SF["chair2"], "wall", 2), (SF["csmall"], "wall", 1)],
        "Plant room": [(SF["crate"], "wall:N", 1), (SF["locker"], "wall", 2), (SF["box"], "wall", 2), ("Mog Misc/Colorable/Extinguisher.png", "wall", 1)],
        **{name: [(SF["bed"], f"wall:{side}", 1), (SF["monitor"], "corner", 1), (SF["chair2"], "wall", 1), (SF["sink2"], "wall", 1), (SF["box"], "wall", 1)]
           + ([(SF["wc"], "corner", 1)] if i % 2 else [])
           for i, (name, side) in enumerate((("Capsule", "W"), ("Capsule two", "E"), ("Capsule three", "W"), ("Capsule four", "E"), ("Capsule five", "W"), ("Capsule six", "E")))}},
    "vertical-farm": {
        "Growing floor": rows("Plant_Pot_Clay_Brown_A_1x1.webp", 1.2, 12.4, (1.4, 2.4, 4.2, 5.2, 7.0), .9, gaps=((6.2, 7.6),), sc=.8),
        "Packing hall": [(SF["pallet"], "wall", 2), (SF["crate"], "wall", 2), (SF["box"], "wall", 3), (SF["csmall"], "corner", 1), (SF["table2"], "wall", 1)],
        "Water plant": [(SF["cwide"], "wall:E", 1, .6), (SF["locker"], "wall", 1), (SF["csmall"], "corner", 1)]},
}
import latertypes
ERA_TYPES.update(latertypes.types(M, SF, MODERN, FUTURE))      # the later ages' gaps (2026-11-12)
for _k, _f in FULLER.items():
    assert set(_f) == {r[0] for r in ERA_TYPES[_k]["rooms"]}, (_k, set(_f) ^ {r[0] for r in ERA_TYPES[_k]["rooms"]})
    ERA_TYPES[_k]["furnish"] = _f

ERA_STARTS = [("renaissance", 1450), ("age-of-reason", 1601), ("victorian", 1837), ("great-war", 1914), ("mid-century", 1919),
              ("modern", 1990), ("time-of-judgment", 2004), ("future-darkness", 2010), ("time-of-future-judgement", 2099)]
for k, v in ERA_TYPES.items():
    v["era"] = max((e for e, y in ERA_STARTS if y <= v["built"][0]), key=lambda e: dict(ERA_STARTS)[e])
    v["eras"] = [e for e, y in ERA_STARTS if y >= dict(ERA_STARTS)[v["era"]]]   # it stands on in every later era
    B.TYPES[k] = v

# the medieval types the era rebuilds replace, by role
REPLACES = {"home": ("cottage", "byre-house"), "shop": ("townhouse", "workshop"), "inn": ("tavern",)}
