"""The trades, the turning years and the building names of a generated town outside the Bohemian lands (B3295 to
B3299, Ben's picks on the Town Households desk, 13 November 2026).

  YEARS       each region's own turning points from 1781: when its trades become those of the industrial age, the
              years between the wars, a colonial age under a foreign power, the socialist years, the post-war years,
              the present day and the World of Future Darkness
  LISTS       for each way of life outside Western Christendom and the Eastern church, its own crafts, shops, homes
              and offices, once for the old trades (before about 1880) and once for the later ones
  COLONIAL    the offices a colonial power brings to a town
  RENAMES     names changed by way of life at every year from 1197, the medieval households too
  BUILDINGS   the names a building takes by way of life; the footprint and the furnishing stay the same

A house reading of history, rounded for play, in WoDX's own words; the books give no such lists. A key with no entry
falls back to the Bohemian tables in settle.py.
"""

# ------------------------------------------------------------------ the turning years
# (first year, trade age). Every region runs from "reform" in 1781 (the old trades of the early modern town) unless its
# list starts otherwise; "modern" from 1990 and "future" from 2030 unless given.
YEARS = {
    "moravia": [(1781, "reform"), (1851, "industrial"), (1919, "republic"), (1948, "socialist"), (1990, "modern")],
    "german-lands": [(1781, "reform"), (1850, "industrial"), (1919, "republic"), (1946, "postwar")],
    "british-isles": [(1781, "industrial"), (1919, "republic"), (1946, "postwar")],
    "france": [(1781, "reform"), (1840, "industrial"), (1919, "republic"), (1946, "postwar")],
    "iberia": [(1781, "reform"), (1870, "industrial"), (1919, "republic"), (1946, "postwar")],
    "italy": [(1781, "reform"), (1880, "industrial"), (1919, "republic"), (1946, "postwar")],
    "low-countries": [(1781, "reform"), (1830, "industrial"), (1919, "republic"), (1946, "postwar")],
    "scandinavia": [(1781, "reform"), (1870, "industrial"), (1919, "republic"), (1946, "postwar")],
    "poland-baltic": [(1781, "reform"), (1870, "industrial"), (1919, "republic"), (1948, "socialist"), (1990, "modern")],
    "carpathians-balkans": [(1781, "reform"), (1880, "industrial"), (1919, "republic"), (1946, "socialist"), (1990, "modern")],
    "russia": [(1781, "reform"), (1861, "industrial"), (1918, "socialist"), (1992, "modern")],
    "siberia": [(1781, "reform"), (1891, "industrial"), (1918, "socialist"), (1992, "modern")],
    "central-asia": [(1781, "reform"), (1865, "colonial"), (1920, "socialist"), (1992, "modern")],
    "aegean": [(1781, "reform"), (1880, "industrial"), (1919, "republic"), (1946, "postwar")],
    "anatolia": [(1781, "reform"), (1880, "industrial"), (1923, "republic"), (1946, "postwar")],
    "levant": [(1781, "reform"), (1880, "industrial"), (1919, "colonial"), (1946, "postwar")],
    "egypt": [(1781, "reform"), (1850, "industrial"), (1882, "colonial"), (1952, "postwar")],
    "arabia": [(1781, "reform"), (1950, "postwar")],
    "maghreb": [(1781, "reform"), (1830, "colonial"), (1956, "postwar")],
    "persia": [(1781, "reform"), (1900, "industrial"), (1925, "republic"), (1946, "postwar")],
    "tibet-himalaya": [(1781, "reform"), (1959, "socialist"), (1990, "modern")],
    "india": [(1781, "reform"), (1857, "colonial"), (1947, "postwar"), (1991, "modern")],
    "china": [(1781, "reform"), (1895, "industrial"), (1912, "republic"), (1949, "socialist"), (1979, "modern")],
    "korea": [(1781, "reform"), (1910, "colonial"), (1946, "postwar")],
    "japan": [(1781, "reform"), (1868, "industrial"), (1919, "republic"), (1946, "postwar")],
    "southeast-asia": [(1781, "reform"), (1886, "colonial"), (1947, "postwar"), (1975, "socialist"), (1990, "modern")],
    "nusantara": [(1781, "reform"), (1800, "colonial"), (1946, "postwar")],
    "west-africa": [(1781, "reform"), (1885, "colonial"), (1960, "postwar")],
    "east-africa": [(1781, "reform"), (1885, "colonial"), (1960, "postwar"), (1974, "socialist"), (1991, "modern")],
    "southern-africa": [(1781, "colonial"), (1870, "industrial"), (1919, "republic"), (1946, "postwar")],
    "central-africa": [(1781, "reform"), (1885, "colonial"), (1960, "postwar")],
    "canada": [(1781, "colonial"), (1860, "industrial"), (1919, "republic"), (1946, "postwar")],
    "north-america-east": [(1781, "reform"), (1840, "industrial"), (1919, "republic"), (1946, "postwar")],
    "north-america-west": [(1781, "colonial"), (1850, "industrial"), (1919, "republic"), (1946, "postwar")],
    "mexico": [(1781, "colonial"), (1821, "reform"), (1880, "industrial"), (1919, "republic"), (1946, "postwar")],
    "caribbean": [(1781, "colonial"), (1902, "republic"), (1959, "socialist"), (1992, "modern")],
    "andes": [(1781, "colonial"), (1825, "reform"), (1890, "industrial"), (1919, "republic"), (1946, "postwar")],
    "brazil": [(1781, "colonial"), (1822, "reform"), (1890, "industrial"), (1919, "republic"), (1946, "postwar")],
    "southern-cone": [(1781, "colonial"), (1816, "reform"), (1880, "industrial"), (1919, "republic"), (1946, "postwar")],
    "australia": [(1781, "reform"), (1788, "colonial"), (1851, "industrial"), (1919, "republic"), (1946, "postwar")],
    "aotearoa": [(1781, "reform"), (1840, "colonial"), (1880, "industrial"), (1919, "republic"), (1946, "postwar")],
    "pacific-islands": [(1781, "reform"), (1820, "colonial"), (1970, "postwar")],
    "arctic": [(1781, "colonial"), (1953, "postwar")],
    "antarctica": [(1781, "reform"), (1946, "postwar")],
}
SOVIET = {"russia", "siberia", "central-asia"}          # the collective farm and the village soviet


def trade_age(region, year):
    """The trade age of a region in a year from 1781 (YEARS, with modern from 1990 and future from 2030)."""
    rows = YEARS.get(region) or YEARS["france"]
    y = year or 1197
    out = rows[0][1]
    for f, k in rows:
        if y >= f: out = k
    if y >= 2030: return "future"
    if y >= 1990 and not any(k == "modern" for _, k in rows): return "modern"
    return out


def one_party(region):
    """Had the region socialist years (a house of culture, the Panel block's name)?"""
    return any(k == "socialist" for _, k in YEARS.get(region, []))


# ------------------------------------------------------------------ trades by way of life
def _w(*pairs):
    return [(t, w) for t, w in pairs]


LISTS = {
    "islamic": {
        "early": dict(
            craft=["coppersmith", "weaver", "potter", "leatherworker", "carpenter", "dyer", "tile maker", "saddler"],
            shop=["spice seller", "cloth merchant", "butcher", "perfumer", "sweet seller", "bookseller", "grocer"],
            home={"rich": _w(("merchant", 3), ("landowner", 2), ("caravan master", 2), ("physician", 1)),
                  "middling": _w(("farmer", 4), ("weaver", 3), ("camel driver", 1), ("scribe", 1), ("potter", 1), ("water carrier", 1)),
                  "poor": _w(("day labourer", 5), ("porter", 3), ("water carrier", 2), ("herder", 2), ("beggar", 1))},
            notables=[("headman", 0, "rich"), ("Quran teacher", 0, "middling"), ("qadi", 1, "rich"), ("market inspector", 1, "middling"),
                      ("physician", 1, "rich"), ("governor's agent", 2, "rich")],
            inn="caravanserai keeper", farm="farmer", smith="smith", baker="baker"),
        "later": dict(
            craft=["coppersmith", "carpenter", "tailor", "shoemaker", "mechanic", "electrician", "tinsmith", "weaver"],
            shop=["grocer", "cloth merchant", "butcher", "pharmacist", "tobacconist", "sweet seller", "ironmonger", "barber"],
            home={"rich": _w(("merchant", 3), ("landowner", 2), ("physician", 2), ("lawyer", 1), ("factory owner", 1)),
                  "middling": _w(("clerk", 3), ("teacher", 2), ("farmer", 3), ("driver", 2), ("tailor", 1), ("police officer", 1), ("shop assistant", 1)),
                  "poor": _w(("day labourer", 5), ("porter", 3), ("factory hand", 2), ("street seller", 2), ("water carrier", 1), ("pensioner", 1))},
            notables=[("mayor", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("qadi", 1, "rich"),
                      ("physician", 1, "rich"), ("journalist", 2, "middling")],
            inn="café owner", farm="farmer", smith="smith", baker="baker"),
    },
    "indic": {
        "early": dict(
            craft=["weaver", "potter", "goldsmith", "carpenter", "oil presser", "leatherworker", "brass worker", "dyer"],
            shop=["grain dealer", "cloth merchant", "sweet seller", "spice seller", "moneylender", "betel seller", "perfumer"],
            home={"rich": _w(("merchant", 3), ("landholder", 3), ("moneylender", 2), ("court scribe", 1)),
                  "middling": _w(("farmer", 5), ("weaver", 3), ("potter", 1), ("barber", 1), ("launderer", 1), ("cowherd", 1)),
                  "poor": _w(("field labourer", 5), ("porter", 2), ("herder", 2), ("sweeper", 2), ("water carrier", 1))},
            notables=[("village headman", 0, "rich"), ("village accountant", 0, "middling"), ("schoolmaster", 1, "middling"),
                      ("physician", 1, "rich"), ("magistrate", 2, "rich")],
            inn="rest house keeper", farm="farmer", smith="blacksmith", baker="flatbread baker"),
        "later": dict(
            craft=["tailor", "carpenter", "goldsmith", "cycle repairer", "weaver", "potter", "electrician", "mechanic"],
            shop=["grocer", "cloth merchant", "sweet seller", "chemist", "tea stall keeper", "betel seller", "ironmonger", "barber"],
            home={"rich": _w(("merchant", 3), ("landholder", 2), ("lawyer", 2), ("physician", 2), ("mill owner", 1)),
                  "middling": _w(("clerk", 4), ("farmer", 4), ("teacher", 2), ("railwayman", 2), ("driver", 1), ("shop assistant", 1)),
                  "poor": _w(("field labourer", 5), ("mill hand", 3), ("rickshaw puller", 2), ("porter", 2), ("sweeper", 2), ("street seller", 1))},
            notables=[("village headman", 0, "rich"), ("schoolteacher", 0, "middling"), ("police constable", 0, "middling"), ("postmaster", 1, "middling"),
                      ("physician", 1, "rich"), ("magistrate", 2, "rich")],
            inn="lodging-house keeper", farm="farmer", smith="blacksmith", baker="baker"),
    },
    "sinic": {
        "early": dict(
            craft=["carpenter", "potter", "silk weaver", "lacquerer", "tailor", "bamboo worker", "papermaker", "stonemason"],
            shop=["rice dealer", "tea merchant", "silk merchant", "herbalist", "pawnbroker", "salt dealer", "bookseller"],
            home={"rich": _w(("merchant", 3), ("landlord", 3), ("retired official", 2), ("physician", 1)),
                  "middling": _w(("rice farmer", 5), ("weaver", 2), ("carpenter", 1), ("clerk", 1), ("boatman", 1), ("tutor", 1)),
                  "poor": _w(("field labourer", 5), ("porter", 3), ("boatman", 2), ("tenant farmer", 3), ("peddler", 1))},
            notables=[("village elder", 0, "rich"), ("tutor", 0, "middling"), ("magistrate's clerk", 1, "middling"), ("physician", 1, "rich"),
                      ("county magistrate", 2, "rich")],
            inn="innkeeper", farm="rice farmer", smith="blacksmith", baker="bun maker"),
        "later": dict(
            craft=["tailor", "carpenter", "bicycle repairer", "electrician", "potter", "mechanic", "printer", "weaver"],
            shop=["rice dealer", "tea merchant", "herbalist", "grocer", "pawnbroker", "cloth merchant", "photographer", "barber"],
            home={"rich": _w(("merchant", 3), ("landlord", 2), ("factory owner", 2), ("physician", 1), ("banker", 1)),
                  "middling": _w(("clerk", 3), ("rice farmer", 4), ("teacher", 2), ("railwayman", 1), ("shop assistant", 2), ("driver", 1)),
                  "poor": _w(("field labourer", 4), ("rickshaw puller", 3), ("factory hand", 3), ("porter", 2), ("dock worker", 2), ("peddler", 1))},
            notables=[("village head", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("postmaster", 1, "middling"),
                      ("physician", 1, "rich"), ("journalist", 2, "middling")],
            inn="teahouse keeper", farm="rice farmer", smith="blacksmith", baker="bun maker"),
    },
    "japanese": {
        "early": dict(
            craft=["carpenter", "potter", "swordsmith", "lacquerer", "weaver", "tatami maker", "cooper", "papermaker"],
            shop=["rice dealer", "sake brewer", "tea merchant", "kimono dealer", "pawnbroker", "soy sauce maker", "bookseller"],
            home={"rich": _w(("merchant", 3), ("sake brewer", 2), ("samurai retainer", 2), ("physician", 1)),
                  "middling": _w(("rice farmer", 5), ("samurai retainer", 2), ("carpenter", 1), ("weaver", 2), ("fisher", 1), ("clerk", 1), ("sake brewer", 1)),
                  "poor": _w(("tenant farmer", 4), ("day labourer", 3), ("porter", 2), ("fisher", 2), ("peddler", 1))},
            notables=[("village headman", 0, "rich"), ("temple school teacher", 0, "middling"), ("domain official", 1, "rich"),
                      ("physician", 1, "rich"), ("town magistrate", 2, "rich")],
            inn="innkeeper", farm="rice farmer", smith="blacksmith", baker="rice cake maker"),
        "later": dict(
            craft=["carpenter", "tailor", "bicycle repairer", "electrician", "mechanic", "printer", "potter", "tatami maker"],
            shop=["rice dealer", "grocer", "kimono dealer", "pharmacist", "bookseller", "photographer", "barber", "tobacconist"],
            home={"rich": _w(("company owner", 3), ("landlord", 2), ("physician", 2), ("banker", 1), ("merchant", 2)),
                  "middling": _w(("office worker", 3), ("rice farmer", 3), ("teacher", 2), ("railwayman", 2), ("factory worker", 2), ("shop assistant", 1)),
                  "poor": _w(("factory hand", 4), ("day labourer", 3), ("tenant farmer", 2), ("dock worker", 2), ("peddler", 1))},
            notables=[("mayor", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("postmaster", 1, "middling"),
                      ("doctor", 1, "rich"), ("journalist", 2, "middling")],
            inn="innkeeper", farm="rice farmer", smith="blacksmith", baker="baker"),
    },
    "theravada": {
        "early": dict(
            craft=["weaver", "potter", "lacquerer", "carpenter", "silversmith", "boat builder", "umbrella maker", "basket maker"],
            shop=["rice dealer", "cloth seller", "fish paste seller", "betel seller", "herbalist", "salt dealer"],
            home={"rich": _w(("merchant", 3), ("landholder", 2), ("court official", 2)),
                  "middling": _w(("rice farmer", 6), ("fisher", 2), ("weaver", 2), ("boatman", 1), ("potter", 1)),
                  "poor": _w(("field labourer", 5), ("boatman", 2), ("fisher", 2), ("porter", 2), ("peddler", 1))},
            notables=[("village headman", 0, "rich"), ("scribe", 0, "middling"), ("herbal doctor", 1, "middling"), ("district governor", 2, "rich")],
            inn="rest house keeper", farm="rice farmer", smith="blacksmith", baker="sweet maker"),
        "later": dict(
            craft=["tailor", "carpenter", "bicycle repairer", "mechanic", "silversmith", "electrician", "weaver"],
            shop=["rice dealer", "grocer", "cloth seller", "pharmacist", "noodle seller", "betel seller", "barber"],
            home={"rich": _w(("rice miller", 2), ("merchant", 3), ("landholder", 2), ("physician", 1)),
                  "middling": _w(("rice farmer", 5), ("clerk", 2), ("teacher", 2), ("driver", 1), ("fisher", 1), ("shop assistant", 1)),
                  "poor": _w(("field labourer", 5), ("rickshaw puller", 2), ("dock worker", 2), ("porter", 2), ("street seller", 2))},
            notables=[("village headman", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("postmaster", 1, "middling"),
                      ("doctor", 1, "rich"), ("journalist", 2, "middling")],
            inn="rest house keeper", farm="rice farmer", smith="blacksmith", baker="baker"),
    },
    "tibetan": {
        "early": dict(
            craft=["weaver", "metalworker", "thangka painter", "carpenter", "leatherworker", "potter", "felt maker"],
            shop=["tea merchant", "salt trader", "wool trader", "butter seller", "cloth seller"],
            home={"rich": _w(("landholder", 3), ("trader", 3), ("estate steward", 2)),
                  "middling": _w(("barley farmer", 5), ("herder", 3), ("weaver", 2), ("carpenter", 1)),
                  "poor": _w(("tenant farmer", 4), ("herder", 3), ("porter", 2), ("day labourer", 2))},
            notables=[("village headman", 0, "rich"), ("district official", 1, "rich"), ("physician", 1, "middling")],
            inn="innkeeper", farm="barley farmer", smith="metalworker", baker="barley bread baker"),
        "later": dict(
            craft=["weaver", "metalworker", "thangka painter", "carpenter", "tailor", "mechanic", "felt maker"],
            shop=["tea merchant", "salt trader", "wool trader", "grocer", "cloth seller"],
            home={"rich": _w(("landholder", 2), ("trader", 3), ("estate steward", 1)),
                  "middling": _w(("barley farmer", 5), ("herder", 3), ("weaver", 1), ("driver", 1), ("teacher", 1)),
                  "poor": _w(("tenant farmer", 3), ("herder", 3), ("porter", 2), ("day labourer", 2))},
            notables=[("village headman", 0, "rich"), ("schoolteacher", 0, "middling"), ("district official", 1, "rich"), ("physician", 1, "middling")],
            inn="innkeeper", farm="barley farmer", smith="metalworker", baker="baker"),
    },
    "malay": {
        "early": dict(
            craft=["boat builder", "weaver", "goldsmith", "kris maker", "potter", "carpenter", "mat weaver", "batik maker"],
            shop=["spice trader", "rice dealer", "cloth trader", "fish seller", "betel seller"],
            home={"rich": _w(("merchant", 3), ("court noble", 2), ("shipowner", 2)),
                  "middling": _w(("rice farmer", 5), ("fisher", 3), ("weaver", 2), ("boat builder", 1)),
                  "poor": _w(("field labourer", 4), ("fisher", 3), ("porter", 2), ("peddler", 1))},
            notables=[("village headman", 0, "rich"), ("Quran teacher", 0, "middling"), ("harbour master", 1, "rich"), ("healer", 1, "middling"),
                      ("district chief", 2, "rich")],
            inn="lodging-house keeper", farm="rice farmer", smith="blacksmith", baker="cake maker"),
        "later": dict(
            craft=["tailor", "carpenter", "batik maker", "mechanic", "boat builder", "electrician", "bicycle repairer"],
            shop=["grocer", "cloth trader", "spice trader", "pharmacist", "coffee shop keeper", "barber"],
            home={"rich": _w(("merchant", 3), ("planter", 2), ("shipowner", 1), ("physician", 1)),
                  "middling": _w(("rice farmer", 4), ("clerk", 3), ("teacher", 2), ("fisher", 2), ("driver", 1)),
                  "poor": _w(("rubber tapper", 4), ("field labourer", 3), ("dock worker", 2), ("fisher", 2), ("street seller", 2))},
            notables=[("village headman", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("postmaster", 1, "middling"),
                      ("doctor", 1, "rich")],
            inn="lodging-house keeper", farm="rice farmer", smith="blacksmith", baker="baker"),
    },
    "sahel": {
        "early": dict(
            craft=["weaver", "leatherworker", "potter", "dyer", "goldsmith", "woodcarver", "mat maker"],
            shop=["salt trader", "cloth trader", "kola nut seller", "grain seller", "spice trader"],
            home={"rich": _w(("merchant", 3), ("caravan master", 2), ("scholar", 1)),
                  "middling": _w(("millet farmer", 5), ("herder", 3), ("weaver", 2), ("potter", 1), ("griot", 1)),
                  "poor": _w(("field labourer", 4), ("herder", 3), ("porter", 2), ("water carrier", 2))},
            notables=[("village chief", 0, "rich"), ("Quran teacher", 0, "middling"), ("market chief", 1, "middling"), ("qadi", 2, "rich")],
            inn="lodging-house keeper", farm="millet farmer", smith="blacksmith", baker="millet cake seller"),
        "later": dict(
            craft=["weaver", "tailor", "leatherworker", "mechanic", "bicycle repairer", "dyer", "goldsmith"],
            shop=["cloth trader", "grain seller", "kola nut seller", "grocer", "pharmacist"],
            home={"rich": _w(("merchant", 3), ("trader", 2), ("physician", 1)),
                  "middling": _w(("millet farmer", 4), ("groundnut farmer", 2), ("herder", 2), ("clerk", 2), ("teacher", 1)),
                  "poor": _w(("field labourer", 4), ("herder", 2), ("porter", 2), ("water carrier", 1), ("street seller", 2))},
            notables=[("village chief", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("qadi", 1, "rich"),
                      ("doctor", 1, "rich")],
            inn="lodging-house keeper", farm="millet farmer", smith="blacksmith", baker="baker"),
    },
    "swahili": {
        "early": dict(
            craft=["boat builder", "carpenter", "weaver", "woodcarver", "goldsmith", "mat maker", "potter"],
            shop=["spice trader", "cloth trader", "fish seller", "coffee seller", "grain seller"],
            home={"rich": _w(("merchant", 3), ("shipowner", 2), ("landowner", 2)),
                  "middling": _w(("farmer", 4), ("fisher", 3), ("sailor", 2), ("weaver", 1)),
                  "poor": _w(("porter", 4), ("fisher", 2), ("field labourer", 3), ("water carrier", 1))},
            notables=[("town elder", 0, "rich"), ("Quran teacher", 0, "middling"), ("qadi", 1, "rich"), ("harbour master", 1, "rich")],
            inn="lodging-house keeper", farm="farmer", smith="blacksmith", baker="baker"),
        "later": dict(
            craft=["tailor", "carpenter", "woodcarver", "mechanic", "boat builder", "bicycle repairer"],
            shop=["grocer", "cloth trader", "spice trader", "pharmacist", "coffee seller", "barber"],
            home={"rich": _w(("merchant", 3), ("planter", 2), ("physician", 1)),
                  "middling": _w(("farmer", 3), ("clerk", 3), ("teacher", 2), ("fisher", 2), ("driver", 1)),
                  "poor": _w(("dock worker", 4), ("porter", 3), ("sisal worker", 2), ("field labourer", 3))},
            notables=[("town elder", 0, "rich"), ("schoolteacher", 0, "middling"), ("police officer", 0, "middling"), ("qadi", 1, "rich"),
                      ("doctor", 1, "rich")],
            inn="lodging-house keeper", farm="farmer", smith="blacksmith", baker="baker"),
    },
    "bantu": {
        "early": dict(
            craft=["ironworker", "potter", "basket maker", "woodcarver", "weaver", "leatherworker"],
            shop=["cattle trader", "salt trader", "cloth trader", "grain seller"],
            home={"rich": _w(("cattle owner", 3), ("trader", 2)),
                  "middling": _w(("farmer", 5), ("herder", 3), ("potter", 1)),
                  "poor": _w(("field labourer", 4), ("herder", 3), ("porter", 2))},
            notables=[("headman", 0, "rich"), ("healer", 0, "middling"), ("chief's councillor", 1, "rich")],
            inn="beer hall keeper", farm="farmer", smith="ironworker", baker="grain seller"),
        "later": dict(
            craft=["carpenter", "tailor", "mechanic", "bricklayer", "bicycle repairer", "potter"],
            shop=["general dealer", "butcher", "cloth trader", "grain seller"],
            home={"rich": _w(("trader", 2), ("cattle owner", 2)),
                  "middling": _w(("farmer", 4), ("mine worker", 3), ("clerk", 2), ("teacher", 1), ("driver", 1)),
                  "poor": _w(("mine worker", 4), ("field labourer", 3), ("domestic worker", 2), ("porter", 2))},
            notables=[("headman", 0, "rich"), ("mission teacher", 0, "middling"), ("police constable", 1, "middling"), ("clinic nurse", 1, "middling")],
            inn="beer hall keeper", farm="farmer", smith="blacksmith", baker="baker"),
    },
    "polynesian": {
        "early": dict(
            craft=["canoe builder", "tapa maker", "carver", "mat weaver", "net maker"],
            shop=["canoe builder", "carver", "net maker"],
            home={"rich": _w(("high-born landholder", 2), ("navigator", 1)),
                  "middling": _w(("taro farmer", 5), ("fisher", 4)),
                  "poor": _w(("fisher", 3), ("field worker", 3))},
            notables=[("chief", 0, "rich"), ("navigator", 0, "middling"), ("orator", 1, "middling")],
            inn="guest house keeper", farm="taro farmer", smith="carver", baker="oven keeper"),
    },
    "northern": {
        "early": dict(
            craft=["hide worker", "carver", "net maker", "sled maker", "bow maker"],
            shop=["fur trader", "hide worker", "carver"],
            home={"rich": _w(("trader", 2), ("hunter", 2)),
                  "middling": _w(("hunter", 5), ("fisher", 4)),
                  "poor": _w(("hunter", 3), ("fisher", 3))},
            notables=[("elder", 0, "rich"), ("healer", 0, "middling")],
            inn="guest house keeper", farm="hunter", smith="carver", baker="fisher"),
    },
}
# the Andes and Mesoamerica follow Western Christendom by 1781 in every region WoDX has; their own lists wait until
# a chronicle goes there before the settlers
LISTS["mesoamerican"] = LISTS["andean"] = LISTS["northern"]

# The offices a colonial power brings: (trade, the smallest size that has one, wealth), after the town's own head
COLONIAL = [("mission teacher", 0, "middling"), ("police constable", 0, "middling"), ("district officer", 1, "rich"), ("customs clerk", 1, "middling"),
            ("plantation overseer", 1, "middling"), ("doctor", 2, "rich")]


def lists_for(sphere, age, year):
    """The way of life's own lists for a trade age, or None for the Bohemian tables (socialist, modern, future, and
    Western Christendom and the Eastern church)."""
    L = LISTS.get(sphere)
    if not L or age not in ("reform", "industrial", "republic", "postwar", "colonial"): return None
    period = "early" if age == "reform" or (age == "colonial" and (year or 0) < 1880) else "later"
    return L.get(period) or L["early"]


# ------------------------------------------------------------------ names at every year from 1197
_DRY = {"brewer": "merchant", "publican": "café owner", "pub manager": "tea house manager", "bartender": "café attendant",
        "innkeeper": "caravanserai keeper", "alehouse keeper": "caravanserai keeper", "dance hall keeper": "café owner", "swineherd": "herder"}
_RICE = {"farmer": "rice farmer", "alehouse keeper": "innkeeper", "brewer": "rice wine brewer", "coffeehouse keeper": "teahouse keeper"}
RENAMES = {
    "islamic": _DRY, "sahel": {**_DRY, "farmer": "millet farmer", "innkeeper": "lodging-house keeper", "alehouse keeper": "lodging-house keeper"},
    "swahili": {**_DRY, "innkeeper": "lodging-house keeper", "alehouse keeper": "lodging-house keeper"},
    "malay": {**_RICE, "innkeeper": "lodging-house keeper", "alehouse keeper": "lodging-house keeper"},
    "sinic": _RICE, "japanese": {**_RICE, "brewer": "sake brewer"}, "theravada": {**_RICE, "alehouse keeper": "rest house keeper"},
    "tibetan": {"farmer": "barley farmer", "alehouse keeper": "innkeeper", "brewer": "barley beer brewer"},
    "indic": {"alehouse keeper": "rest house keeper", "draper": "cloth merchant", "spicer": "spice seller", "coffeehouse keeper": "tea house keeper"},
    "bantu": {"alehouse keeper": "beer hall keeper"}, "polynesian": {"farmer": "taro farmer", "alehouse keeper": "guest house keeper"},
    "northern": {"farmer": "hunter", "alehouse keeper": "guest house keeper"},
}
RENAMES["mesoamerican"] = RENAMES["andean"] = RENAMES["northern"]

# ------------------------------------------------------------------ building names
# The name a building takes by way of life (the label before any "(trade)"); the footprint and the furnishing stay
# those of the Bohemian building. Faith decides the house of worship (settle.worship_name).
_EAST = {"Byre-house": "Farmhouse", "House and shop": "Shophouse", "Alehouse": "Inn", "Tavern": "Inn", "Pub": "Teahouse", "Post inn": "Post station",
         "Baroque burgher house": "Merchant's house", "Sgraffito house": "Painted house", "Gate-passage house": "Courtyard house",
         "Arcaded house": "Arcaded shophouse", "Printed house": "Painted house", "Burgher palace": "Mansion", "Charnel house": "Bone house",
         "Cemetery chapel and mortuary": "Cemetery mortuary", "Monastery library": "Temple library", "Prayer house": "Shrine", "Lazar house": "Sick house",
         "Coffeehouse": "Teahouse"}
_ISLAM = {"Byre-house": "Farmhouse", "House and shop": "Shop house", "Alehouse": "Caravanserai", "Tavern": "Caravanserai", "Pub": "Café", "Post inn": "Post station",
          "Counter bar": "Café", "Baroque burgher house": "Merchant's house", "Gate-passage house": "Courtyard house", "Sgraffito house": "Tiled house",
          "Printed house": "Tiled house", "Arcaded house": "Arcaded house", "Burgher palace": "Mansion", "Charnel house": "Mortuary",
          "Cemetery chapel and mortuary": "Cemetery mortuary", "Monastery library": "Madrasa library", "Prayer house": "Prayer room", "Lazar house": "Sick house",
          "Dance hall": "Café", "Coffeehouse": "Coffeehouse"}
_AFRICA = {"Byre-house": "Homestead", "House and shop": "Store", "Alehouse": "Beer hall", "Tavern": "Beer hall", "Pub": "Beer hall",
           "Baroque burgher house": "Trader's house", "Gate-passage house": "Compound", "Sgraffito house": "Painted house", "Burgher palace": "Mansion",
           "Charnel house": "Mortuary", "Cemetery chapel and mortuary": "Cemetery mortuary", "Monastery library": "Mission library"}
_OCEAN = {"Byre-house": "Homestead", "House and shop": "Store", "Alehouse": "Guest house", "Tavern": "Guest house", "Pub": "Guest house",
          "Baroque burgher house": "Trader's house", "Burgher palace": "Chief's house", "Charnel house": "Burial house"}
BUILDINGS = {
    "islamic": _ISLAM, "sahel": {**_ISLAM, "Alehouse": "Lodging house", "Tavern": "Lodging house", "Byre-house": "Compound"},
    "swahili": {**_ISLAM, "Alehouse": "Lodging house", "Tavern": "Lodging house"},
    "malay": {**_EAST, "Alehouse": "Lodging house", "Tavern": "Lodging house", "Pub": "Coffee shop", "Byre-house": "Stilt house"},
    "indic": {**_EAST, "Alehouse": "Rest house", "Tavern": "Rest house", "Pub": "Tea stall", "Byre-house": "Farmstead"},
    "sinic": _EAST, "japanese": {**_EAST, "Pub": "Izakaya", "House and shop": "Townhouse shop"},
    "theravada": {**_EAST, "Alehouse": "Rest house", "Tavern": "Rest house", "Byre-house": "Stilt house"},
    "tibetan": {**_EAST, "Byre-house": "Farmhouse with byre"},
    "bantu": _AFRICA, "polynesian": _OCEAN, "northern": _OCEAN, "mesoamerican": _OCEAN, "andean": _OCEAN,
}
# Outside the Bohemian lands, wherever the way of life: names that belong only there
OUTSIDE_BUILDINGS = {"Baťa house": "Company house", "Sgraffito house": "Painted house", "Gendarmerie post": "Police post"}
WORSHIP = {"islamic": "Mosque", "sahel": "Mosque", "swahili": "Mosque", "indic": "Temple", "sinic": "Temple", "japanese": "Temple",
           "theravada": "Temple", "tibetan": "Temple", "polynesian": "Shrine", "northern": "Shrine", "mesoamerican": "Temple", "andean": "Temple"}
FAITH_WORSHIP = {"islamic": "Mosque", "jewish": "Synagogue", "hindu": "Temple", "theravada": "Temple", "tibetan": "Temple", "chinese": "Temple",
                 "own": "Shrine", "orthodox": "Church", "western": "Church"}


# ------------------------------------------------------------------ which of the first group's buildings a town gets
# The older public buildings of the Bohemian towns (firstgroup.py) by where they belong (B3460):
#   a Jewish quarter and its synagogue only in Christendom and the lands of Islam;
#   the charnel house, the cemetery chapel, the monastery library and the Protestant prayer house only in Christendom;
#   the hospital, museum, savings bank, gendarmerie, library, hotel, waterworks and dance hall elsewhere only once the
#   region's trades have left the old ones (its industrial, colonial or later age)
QUARTER_SPHERES = {"latin", "orthodox", "islamic"}
CHRISTIAN_ONLY = {"charnel-house", "cemetery-chapel", "monastery-library", "prayer-house"}
MODERN_ONLY = {"general-hospital", "museum-hall", "savings-bank", "gendarmerie", "public-library", "grand-hotel", "waterworks", "dance-hall",
               "goods-shed", "counting-house"}


def first_group_ok(tk, region, sphere, year):
    """Does a town of this region and way of life get this older public building by the year?"""
    if region == "moravia" or sphere in ("latin", "orthodox"): return True
    if tk in CHRISTIAN_ONLY: return False
    if tk in ("old-synagogue", "ghetto-house"): return sphere in QUARTER_SPHERES
    if tk in MODERN_ONLY: return trade_age(region, year) != "reform"
    return True
