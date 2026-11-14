"""Building types that fill the later ages' gaps (2026-11-12): until now a Victorian street had no shop or pub of its
own age, the years 1650 to 1860 and 1950 to 1990 had no ordinary house, and the World of Future Darkness had three
types in all. Each is a house design after a kind of building that stood in Moravian towns in those years (the
future ones after what is being built or proposed now). eratypes.py adds them to its list.

The plans are house designs, not surveys: rooms on the half-square grid, the front to the south.
"""
import buildings as B


def types(M, SF, MODERN, FUTURE):
    return {
        # ------------------------------------------------------------ Age of Reason, 1601 on
        "passage-house": {
            "label": "Gate-passage house", "model": "single-storey suburb houses with a carriage passage to the yard", "built": (1650, 1860),
            "role": "home", "storeys": 1, "size": (9, 8), "wall": "Solid_C.png", "place": "home", "fill": "home",
            # the passage runs from the street gate to the yard; the room faces the street, the black kitchen and chamber the yard
            "rooms": [("Kitchen", 0, 0, 3, 4, "stone"), ("Chamber", 3, 0, 3, 4, "planks"), ("Room", 0, 4, 6, 4, "planks"), ("Passage", 6, 0, 3, 8, "stone")],
            "openings": [("double", 7.5, 8, "h"), ("double", 7.5, 0, "h"), ("window", 1.5, 8, "h"), ("window", 4.5, 8, "h"), ("door", 6, 6, "v"),
                         ("doorway", 1.5, 4, "h"), ("door", 4.5, 4, "h"), ("window", 4.5, 0, "h"), ("window", 0, 2, "v")],
            "partitions": [((6, 0), (6, 8)), ((0, 4), (6, 4)), ((3, 0), (3, 4))],
            "furnish": {"Room": [(B.TABLE, "window", 1), (B.BENCH, "beside:table", 1), (B.CHEST, "wall", 1)],
                        "Kitchen": [(B.PIT, "wall", 1), (B.WOOD, "hearth", 1, .8), (B.BARREL, "wall", 1, .7)],
                        "Chamber": [(B.BED, "corner:E", 1), (B.CHEST, "wall", 1)], "Passage": [(B.CRATE, "wall", 1, .5)]},
        },
        "prayer-house": {
            "label": "Prayer house", "model": "the Protestant prayer houses allowed from 1781: no tower, no bell, no door on the street",
            "built": (1781, 1861), "role": "civic", "storeys": 1, "size": (8, 12), "wall": "Solid_A.png", "place": "church", "fill": "church",
            "rooms": [("Prayer hall", 0, 0, 8, 9, "planks"), ("Porch", 0, 9, 8, 3, "stone")],
            "openings": [("door", 8, 10.5, "v"), ("double", 4, 9, "h"), ("window", 0, 3, "v"), ("window", 0, 6, "v"), ("window", 8, 3, "v"), ("window", 8, 6, "v")],
            "partitions": [((0, 9), (8, 9))],
            "furnish": {"Prayer hall": [(B.BENCH, "end:W", 3, .9), (B.BENCH, "end:E", 3, .9), (B.TABLE, "wall:N", 1)], "Porch": [(B.BENCH, "wall", 1, .7)]},
        },
        # ------------------------------------------------------------ Victorian, 1837 on
        "colony-house": {
            "label": "Colony house", "model": "the workers' colonies beside the mills and pits: a kitchen and one room", "built": (1850, 1930),
            "role": "home", "storeys": 1, "wealth": ("poor", "middling"), "size": (5, 8), "wall": "Brick_A.png", "place": "home", "fill": "home",
            "rooms": [("Kitchen", 0, 4, 5, 4, "planks"), ("Room", 0, 0, 5, 4, "planks")],
            "openings": [("door", 1.5, 8, "h"), ("window", 3.5, 8, "h"), ("doorway", 2.5, 4, "h"), ("window", 2.5, 0, "h")],
            "partitions": [((0, 4), (5, 4))],
            "furnish": {"Kitchen": [(B.PIT, "wall", 1), (B.WOOD, "hearth", 1, .8), (B.TABLE, "window", 1), (B.STOOL, "beside:table", 2)],
                        "Room": [(B.BIGBED, "corner:W", 1), (B.BED, "corner:E", 1), (B.CHEST, "wall", 1)]},
        },
        "shop-house": {
            "label": "Shop house", "model": "main-street houses of the 1880s: a shop below, flats above", "built": (1850, 1940),
            "role": "shop", "storeys": 3, "size": (7, 11), "wall": "Brick_C.png", "place": "home", "fill": "home",
            "rooms": [("Shop", 0, 7, 5, 4, "tiles"), ("Stair hall", 5, 7, 2, 4, "tiles"), ("Store room", 0, 4, 7, 3, "planks"),
                      ("Kitchen", 0, 0, 3, 4, "tiles"), ("Back room", 3, 0, 4, 4, "planks")],
            "openings": [("double", 2.5, 11, "h"), ("window", .75, 11, "h"), ("window", 4.25, 11, "h"), ("door", 6, 11, "h"), ("door", 5, 9, "v"),
                         ("doorway", 2.5, 7, "h"), ("door", 6, 7, "h"), ("doorway", 1.5, 4, "h"), ("door", 5, 4, "h"), ("window", 1.5, 0, "h"), ("window", 5, 0, "h")],
            "partitions": [((0, 7), (7, 7)), ((5, 7), (5, 11)), ((0, 4), (7, 4)), ((3, 0), (3, 4))],
            "furnish": {"Shop": [(B.TABLE, "wall:W", 1), (B.CRATE, "corner", 2), (B.BARREL, "wall", 1, .8), (B.SACK, "wall", 1, .7)], "Stair hall": [],
                        "Store room": [(B.CRATE, "wall", 1), (B.BARREL, "corner", 1)],
                        "Kitchen": [(B.PIT, "wall", 1), (B.TABLE, "window", 1), (B.STOOL, "beside:table", 1)],
                        "Back room": [(B.BIGBED, "corner:E", 1), (B.CHEST, "beside:bed", 1), (B.BENCH, "wall", 1)]},
        },
        "pub": {
            "label": "Pub", "model": "the village and suburb pub with its dance hall", "built": (1850, 2029),
            "role": "inn", "storeys": 1, "size": (12, 10), "wall": "Brick_D.png", "place": "tavern", "fill": "home",
            "rooms": [("Taproom", 0, 5, 7, 5, "planks"), ("Hall", 7, 0, 5, 10, "light-planks"), ("Kitchen", 0, 0, 4, 5, "tiles"), ("Beer store", 4, 0, 3, 5, "stone")],
            "openings": [("double", 3.5, 10, "h"), ("window", 1, 10, "h"), ("window", 6, 10, "h"), ("window", 9.5, 10, "h"), ("double", 7, 7.5, "v"),
                         ("doorway", 2, 5, "h"), ("door", 5.5, 5, "h"), ("window", 0, 2.5, "v"), ("window", 12, 3, "v"), ("door", 12, 7, "v"), ("window", 9.5, 0, "h")],
            "partitions": [((0, 5), (7, 5)), ((7, 0), (7, 10)), ((4, 0), (4, 5))],
            "furnish": {"Taproom": [(B.TABLE, "wall:W", 1), (B.BENCH, "beside:table", 1), (B.KEG, "wall:N", 1)],
                        "Hall": [(B.BENCH, "wall:E", 2), (B.BENCH, "wall:N", 1)],
                        "Kitchen": [(B.OVEN, "wall", 1), (B.TABLE, "wall", 1), (B.BARREL, "corner", 1)],
                        "Beer store": [(B.KEG, "wall", 2), (B.BARREL, "wall", 1)]},
        },
        # ------------------------------------------------------------ Mid-century, 1919 on
        "bus-station": {
            "label": "Bus station", "model": "the country bus stations of the 1930s on: a waiting hall, a ticket window, stands behind",
            "built": (1930, 2098), "role": "civic", "storeys": 1, "size": (12, 6), "wall": "Solid_C.png", "place": "station", "fill": "office", "portals": MODERN,
            "rooms": [("Waiting hall", 0, 0, 8, 6, "terrazzo"), ("Ticket office", 8, 3, 4, 3, "lino"), ("Drivers' room", 8, 0, 4, 3, "lino")],
            "openings": [("double", 4, 6, "h"), ("window", 1.5, 6, "h"), ("window", 6.5, 6, "h"), ("double", 4, 0, "h"), ("door", 8, 4.5, "v"), ("door", 8, 1.5, "v"),
                         ("window", 10, 6, "h"), ("door", 12, 1.5, "v")],
            "partitions": [((8, 0), (8, 6)), ((8, 3), (12, 3))],
            "furnish": {"Waiting hall": [(M["chair2"], "wall:W", 3, .9), (M["chair2"], "wall:E", 2, .9), (M["mags"], "wall", 1, .6)],
                        "Ticket office": [(M["smalldesk"], "wall", 1), (M["chair2"], "beside:desk", 1), (M["till"], "wall", 1)],
                        "Drivers' room": [(M["table"], "wall", 1), (M["chair2"], "beside:table", 2), (M["fridge"], "corner", 1)]},
        },
        "coop-store": {
            "label": "Co-op store", "model": "the self-service co-operative stores of the 1960s", "built": (1955, 1989),
            "role": "shop", "storeys": 1, "size": (10, 8), "wall": "Tyger_wall.png", "place": "workplace", "fill": "shop", "portals": MODERN,
            "rooms": [("Sales floor", 0, 3, 10, 5, "lino"), ("Store", 0, 0, 6, 3, "terrazzo"), ("Office", 6, 0, 4, 3, "lino")],
            "openings": [("double", 5, 8, "h"), ("window", 2, 8, "h"), ("window", 8, 8, "h"), ("double", 3, 3, "h"), ("door", 8, 3, "h"), ("double", 3, 0, "h")],
            "partitions": [((0, 3), (10, 3)), ((6, 0), (6, 3))],
            "furnish": {"Sales floor": [(M["shelf"], "end:W", 2, .9), (M["chiller"], "wall:N", 1), (M["till"], "wall:E", 1), (M["display"], "wall:W", 1)],
                        "Store": [(B.CRATE, "wall", 3)], "Office": [(M["smalldesk"], "wall", 1), (M["chair2"], "beside:desk", 1)]},
        },
        "family-house": {
            "label": "Family house", "model": "the two-storey family houses built to one plan across Czechoslovakia from the 1960s",
            "built": (1960, 1991), "role": "home", "storeys": 2, "size": (8, 9), "wall": "Solid_B.png", "place": "home", "fill": "home", "portals": MODERN,
            # the ground floor: the garage and the hall with the stair to the front, the living room and kitchen to the garden
            "rooms": [("Garage", 0, 5, 3, 4, "terrazzo"), ("Hall", 3, 5, 5, 4, "tiles"), ("Living room", 0, 0, 5, 5, "light-planks"), ("Kitchen", 5, 0, 3, 5, "tiles")],
            "openings": [("double", 1.5, 9, "h"), ("door", 4.5, 9, "h"), ("window", 6.75, 9, "h"), ("door", 3, 7, "v"), ("doorway", 4, 5, "h"), ("door", 6.5, 5, "h"),
                         ("doorway", 5, 2.5, "v"), ("window", 2.5, 0, "h"), ("window", 6.5, 0, "h"), ("window", 0, 2.5, "v")],
            "partitions": [((0, 5), (8, 5)), ((3, 5), (3, 9)), ((5, 0), (5, 5))],
            "furnish": {"Living room": [(M["couch"], "wall:W", 1), (M["coffee"], "beside:couch", 1, .8), (M["armchair"], "beside:couch", 1), (M["tv"], "wall:N", 1)],
                        "Kitchen": [(M["gas"], "wall:N", 1), (M["sink2"], "beside:stove", 1), (M["fridge"], "corner", 1), (M["table"], "wall:E", 1), (M["chair2"], "beside:table", 2)],
                        "Hall": [(M["hutch"], "wall", 1, .7)], "Garage": [(M["washer"], "wall", 1), (B.CRATE, "wall", 1, .7)]},
        },
        # ------------------------------------------------------------ Modern, 1990 on
        "corner-shop": {
            "label": "Convenience store", "model": "the late-opening corner shops of the 1990s on", "built": (1990, 2098),
            "role": "shop", "storeys": 1, "size": (6, 6), "wall": "Solid_C.png", "place": "workplace", "fill": "shop", "portals": MODERN,
            "rooms": [("Shop", 0, 2, 6, 4, "lino"), ("Back room", 0, 0, 6, 2, "lino")],
            "openings": [("door", 1.5, 6, "h"), ("window", 4, 6, "h"), ("door", 4.5, 2, "h"), ("door", 6, 1, "v")],
            "partitions": [((0, 2), (6, 2))],
            "furnish": {"Shop": [(M["chiller"], "wall:N", 1), (M["till"], "wall:E", 1), (M["mags"], "wall:W", 1), (M["shelf"], "wall:W", 1, .9), (M["freezer"], "wall", 1, .7)],
                        "Back room": [(M["smalldesk"], "wall", 1), (M["cab"], "wall", 1)]},
        },
        "distribution-shed": {
            "label": "Distribution shed", "model": "the logistics sheds on the motorway junctions, from about 2000", "built": (2000, 2098),
            "role": "industry", "storeys": 1, "size": (22, 12), "wall": "Tyger_wall.png", "place": "workplace", "fill": "workshop", "portals": MODERN,
            "rooms": [("Shed floor", 0, 0, 22, 9, "terrazzo"), ("Loading dock", 0, 9, 16, 3, "terrazzo"), ("Office", 16, 9, 6, 3, "lino")],
            "openings": [("double", 4, 12, "h"), ("double", 10, 12, "h"), ("door", 18, 12, "h"), ("window", 20.5, 12, "h"), ("double", 4, 9, "h"), ("double", 10, 9, "h"),
                         ("door", 19, 9, "h"), ("double", 22, 4.5, "v")],
            "partitions": [((0, 9), (22, 9)), ((16, 9), (16, 12))],
            "furnish": {"Shed floor": [(SF["pallet"], "end:W", 4, .9), (B.CRATE, "wall:N", 5), (M["shelf"], "end:E", 3, .9)],
                        "Loading dock": [(B.CRATE, "wall", 3)], "Office": [(M["smalldesk"], "wall", 1), (M["chair2"], "beside:desk", 1), (M["cab"], "wall", 1)]},
        },
        # ------------------------------------------------------------ Future Darkness, 2010 on
        "vending-hall": {
            "label": "Vending hall", "model": "unstaffed shops: walls of machines and collection lockers", "built": (2030, 2098),
            "role": "shop", "storeys": 1, "size": (8, 6), "wall": "Tyger_wall.png", "place": "workplace", "fill": "shop", "portals": FUTURE,
            "rooms": [("Hall", 0, 2, 8, 4, "deck"), ("Stock room", 0, 0, 8, 2, "deck")],
            "openings": [("door", 4, 6, "h"), ("window", 1.5, 6, "h"), ("window", 6.5, 6, "h"), ("door", 6, 2, "h"), ("door", 8, 1, "v")],
            "partitions": [((0, 2), (8, 2))],
            "furnish": {"Hall": [(SF["csmall"], "wall:W", 2), (SF["csmall"], "wall:E", 2), (SF["locker"], "wall:N", 2), (SF["bench"], "wall", 1, .6)],
                        "Stock room": [(SF["crate"], "wall:N", 1), (SF["box"], "wall", 2)]},
        },
        "counter-bar": {
            "label": "Counter bar", "model": "the small standing bars of crowded cities: a counter, a few seats", "built": (2030, 2098),
            "role": "inn", "storeys": 1, "size": (8, 6), "wall": "Solid_G.png", "place": "tavern", "fill": "home", "portals": FUTURE,
            "rooms": [("Bar", 0, 2, 8, 4, "deck"), ("Kitchen", 0, 0, 5, 2, "deck"), ("Wash room", 5, 0, 3, 2, "deck")],
            "openings": [("door", 4, 6, "h"), ("window", 1.5, 6, "h"), ("window", 6.5, 6, "h"), ("door", 2.5, 2, "h"), ("door", 6.5, 2, "h")],
            "partitions": [((0, 2), (8, 2)), ((5, 0), (5, 2))],
            "furnish": {"Bar": [(SF["table2"], "wall:W", 1), (SF["chair"], "beside:table", 2), (SF["chair2"], "wall:E", 2), (SF["csmall"], "wall", 1, .7)],
                        "Kitchen": [(SF["galley"], "wall:N", 1), (SF["box"], "wall", 1)], "Wash room": [(SF["wc"], "corner:E", 1), (SF["sink2"], "wall", 1)]},
        },
        "street-clinic": {
            "label": "Street clinic", "model": "walk-in clinics run by a company or a charity", "built": (2030, 2098),
            "role": "civic", "storeys": 1, "size": (9, 8), "wall": "Tyger_wall.png", "place": "hospital", "fill": "office", "portals": FUTURE,
            "rooms": [("Waiting room", 0, 5, 9, 3, "terrazzo"), ("Treatment room", 0, 0, 5, 5, "deck"), ("Recovery", 5, 0, 4, 5, "deck")],
            "openings": [("door", 4.5, 8, "h"), ("window", 1.5, 8, "h"), ("window", 7.5, 8, "h"), ("door", 2.5, 5, "h"), ("door", 7, 5, "h"), ("doorway", 5, 2.5, "v")],
            "partitions": [((0, 5), (9, 5)), ((5, 0), (5, 5))],
            "furnish": {"Waiting room": [(SF["chair2"], "wall:W", 2), (SF["chair2"], "wall:E", 2), (SF["csmall"], "wall", 1)],
                        "Treatment room": [(SF["pod"], "wall:N", 1), (SF["locker"], "wall", 1), (SF["sink2"], "wall", 1)],
                        "Recovery": [(SF["bed"], "wall:E", 1), (SF["monitor"], "corner", 1), (SF["box"], "wall", 1)]},
        },
        "security-post": {
            "label": "Security post", "model": "the company guard posts at the edge of a managed district", "built": (2035, 2098),
            "role": "civic", "storeys": 1, "size": (6, 5), "wall": "Tyger_wall.png", "place": "gate", "fill": "armory", "portals": FUTURE,
            "rooms": [("Post", 0, 2, 6, 3, "deck"), ("Holding cell", 0, 0, 3, 2, "deck"), ("Locker room", 3, 0, 3, 2, "deck")],
            "openings": [("door", 3, 5, "h"), ("window", 1, 5, "h"), ("window", 5, 5, "h"), ("door", 1.5, 2, "h"), ("door", 4.5, 2, "h")],
            "partitions": [((0, 2), (6, 2)), ((3, 0), (3, 2))],
            "furnish": {"Post": [(SF["csmall"], "wall:W", 1), (SF["chair2"], "wall", 1)],
                        "Holding cell": [(SF["bench"], "wall", 1)], "Locker room": [(SF["locker"], "wall", 2)]},
        },
        "pod-station": {
            "label": "Pod station", "model": "the small stations of an automated transit line: a hall, gates, a platform behind", "built": (2040, 2098),
            "role": "civic", "storeys": 1, "size": (10, 6), "wall": "Tyger_wall.png", "place": "station", "fill": "office", "portals": FUTURE,
            "rooms": [("Concourse", 0, 2, 10, 4, "terrazzo"), ("Platform hall", 0, 0, 7, 2, "deck"), ("Service room", 7, 0, 3, 2, "deck")],
            "openings": [("double", 5, 6, "h"), ("window", 2, 6, "h"), ("window", 8, 6, "h"), ("double", 3.5, 2, "h"), ("door", 8.5, 2, "h"), ("double", 3.5, 0, "h")],
            "partitions": [((0, 2), (10, 2)), ((7, 0), (7, 2))],
            "furnish": {"Concourse": [(SF["csmall"], "wall:W", 2), (SF["bench"], "wall:E", 2), (SF["chair2"], "wall", 2, .8)], "Platform hall": [(SF["bench"], "wall", 1, .7)],
                        "Service room": [(SF["locker"], "wall", 1), (SF["box"], "wall", 1)]},
        },
        "data-hall": {
            "label": "Data hall", "model": "the windowless server halls at a town's edge", "built": (2030, 2098),
            "role": "industry", "storeys": 1, "size": (10, 14), "wall": "Tyger_wall.png", "place": "workplace", "fill": "workshop", "portals": FUTURE,
            "rooms": [("Server hall", 0, 0, 10, 10, "deck"), ("Control room", 0, 10, 6, 4, "deck"), ("Entry", 6, 10, 4, 4, "terrazzo")],
            "openings": [("door", 8, 14, "h"), ("window", 3, 14, "h"), ("door", 6, 12, "v"), ("door", 8, 10, "h"), ("door", 3, 10, "h"), ("door", 10, 5, "v")],
            "partitions": [((0, 10), (10, 10)), ((6, 10), (6, 14))],
            "furnish": {"Server hall": [(SF["locker"], "end:W", 5, .9), (SF["locker"], "end:E", 5, .9), (SF["box"], "wall:N", 3)],
                        "Control room": [(SF["cwide"], "wall:W", 1), (SF["chair2"], "wall", 2), (SF["twinmon"], "wall:S", 1)], "Entry": [(SF["locker"], "wall", 1)]},
        },
    }
