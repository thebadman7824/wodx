"""What a made map's shelves, desks and barrels hold (B4670): a WoDX Interactables stock list for each, by the
building's trade, the year and the region. On Adopt each becomes a container with that list and "Draw the stock" set,
so the first turn of the clock fills it and it is drawn again every week (a trade) or every month (a home). The
Storyteller can change or clear any list on the tile.

A line is (odds, count, item, from year, until year): odds "always", "1 in 3" or "40%"; count "1" or "2-6".
"""
import re

ALWAYS, END = 1197, 9999

# goods every household keeps, by where the container stands
HOME = {
    "shelf": [("always", "1", "a loaf of bread", ALWAYS, END), ("1 in 2", "1", "a crock of salt", ALWAYS, END),
              ("1 in 2", "2-4", "onions", ALWAYS, END), ("1 in 3", "1", "a candle stub", ALWAYS, 1930),
              ("1 in 3", "1", "a tin of coffee", 1850, END), ("1 in 4", "1", "a box of matches", 1850, END),
              ("1 in 4", "1", "a prayer book", 1460, END), ("1 in 3", "1", "a jar of honey", ALWAYS, END),
              ("1 in 4", "1", "a tin of soup", 1900, END), ("1 in 5", "1", "a torch (flashlight)", 1925, END)],
    "desk":  [("1 in 2", "1", "a letter", 1500, END), ("1 in 3", "1", "a household account book", 1600, END),
              ("1 in 3", "1", "a pencil", 1800, END), ("1 in 4", "1", "a quill and ink", ALWAYS, 1880),
              ("1 in 4", "1", "a fountain pen", 1880, 1990), ("1 in 4", "1", "a ballpoint pen", 1950, END),
              ("1 in 5", "1", "a newspaper", 1700, END), ("1 in 6", "1-5", "small coins", ALWAYS, END)],
    "store": [("always", "1", "a sack of flour", ALWAYS, 1950), ("1 in 2", "1", "a barrel of salted cabbage", ALWAYS, 1950),
              ("1 in 2", "2-6", "turnips", ALWAYS, END), ("1 in 3", "1", "a cask of small beer", ALWAYS, 1900),
              ("1 in 3", "6-20", "potatoes", 1700, END), ("1 in 4", "1", "a coil of rope", ALWAYS, END),
              ("1 in 4", "1", "a crate of empty bottles", 1880, END)],
}

# (trade words, restock, lines for any container in it); the trade's goods sit on its shelves, in its desk and barrels
TRADES = [
    (r"smith|forge|farrier|nailer|armou?rer|cutler|locksmith", "week", [
        ("always", "10-40", "iron nails", ALWAYS, END), ("1 in 2", "2-6", "horseshoes", ALWAYS, 1960),
        ("1 in 2", "1", "a bar of iron stock", ALWAYS, END), ("1 in 3", "1", "a pair of tongs", ALWAYS, END),
        ("1 in 3", "1", "a sack of charcoal", ALWAYS, 1850), ("1 in 3", "1", "a sack of coke", 1850, END),
        ("1 in 4", "1", "a knife blade, unhandled", ALWAYS, END), ("1 in 5", "1-3", "padlocks", 1500, END)]),
    (r"bake|bakehouse|bakery|baker", "dawn", [
        ("always", "4-12", "loaves of bread", ALWAYS, END), ("always", "1", "a sack of flour", ALWAYS, END),
        ("1 in 2", "6-20", "bread rolls", ALWAYS, END), ("1 in 3", "1", "a crock of lard", ALWAYS, END),
        ("1 in 3", "1", "a twist of salt", ALWAYS, END), ("1 in 4", "2-6", "sweet pastries", 1600, END)]),
    (r"butcher|shambles|slaughter", "dawn", [
        ("always", "2-6", "joints of meat", ALWAYS, END), ("1 in 2", "1-3", "strings of sausages", ALWAYS, END),
        ("1 in 2", "1", "a cleaver", ALWAYS, END), ("1 in 3", "1", "a tub of salt", ALWAYS, END),
        ("1 in 4", "1", "a side of bacon", ALWAYS, END)]),
    (r"tavern|inn\b|inn-|alehouse|pub\b|beer|hostel|hotel|wine|cafe|coffee|brew", "week", [
        ("always", "1", "a cask of ale", ALWAYS, 1850), ("always", "4-12", "bottles of beer", 1850, END),
        ("1 in 2", "1-3", "jugs of wine", ALWAYS, END), ("1 in 2", "1", "a bottle of brandy", 1500, END),
        ("1 in 2", "6-12", "tankards", ALWAYS, 1900), ("1 in 3", "1", "a round of cheese", ALWAYS, END),
        ("1 in 3", "1", "a tally of who owes what", ALWAYS, END), ("1 in 4", "1", "a pack of playing cards", 1400, END),
        ("1 in 4", "1", "a bottle of slivovice", 1600, END)]),
    (r"apothec|pharmac|chemist|herbal|physician|surgeon|doctor|clinic", "month", [
        ("always", "3-8", "jars of dried herbs", ALWAYS, END), ("1 in 2", "1", "a pot of salve", ALWAYS, END),
        ("1 in 2", "2-6", "rolls of linen bandage", ALWAYS, END), ("1 in 3", "1", "a bottle of laudanum", 1680, 1920),
        ("1 in 3", "1", "a bottle of iodine", 1830, END), ("1 in 3", "1", "a box of aspirin", 1900, END),
        ("1 in 4", "1", "a lancet", ALWAYS, END), ("1 in 5", "1", "a jar of leeches", ALWAYS, 1900)]),
    (r"alchem|laborator|scholar|study|library|school|universit", "month", [
        ("1 in 2", "1-4", "books", ALWAYS, END), ("1 in 2", "1", "a bundle of notes", ALWAYS, END),
        ("1 in 3", "1", "a glass flask", ALWAYS, END), ("1 in 3", "1", "a jar of quicksilver", ALWAYS, 1900),
        ("1 in 4", "1", "a box of chalk", ALWAYS, END), ("1 in 4", "1", "a magnifying glass", 1600, END)]),
    (r"grocer|shop|store|market|merchant|mercer|chandler|general|trader|kiosk|supermarket", "week", [
        ("always", "2-6", "candles", ALWAYS, 1930), ("always", "1", "a sack of dried peas", ALWAYS, END),
        ("1 in 2", "1", "a cone of sugar", 1500, 1900), ("1 in 2", "2-6", "bags of sugar", 1900, END),
        ("1 in 2", "1-3", "bars of soap", ALWAYS, END), ("1 in 2", "2-6", "tins of food", 1880, END),
        ("1 in 3", "1", "a bolt of plain cloth", ALWAYS, END), ("1 in 3", "1", "a packet of tea", 1700, END),
        ("1 in 3", "2-6", "packets of cigarettes", 1880, END), ("1 in 4", "1", "a coil of rope", ALWAYS, END),
        ("1 in 4", "1", "a box of matches", 1850, END)]),
    (r"tailor|draper|weaver|cloth|seamstress|dress", "week", [
        ("always", "1-3", "bolts of cloth", ALWAYS, END), ("1 in 2", "1", "a pair of shears", ALWAYS, END),
        ("1 in 2", "1", "a paper of pins", 1500, END), ("1 in 3", "1-3", "spools of thread", ALWAYS, END),
        ("1 in 3", "1", "a coat, half made", ALWAYS, END)]),
    (r"cobbler|shoe|tanner|saddler|leather", "week", [
        ("always", "1-3", "hides", ALWAYS, END), ("1 in 2", "1-3", "pairs of shoes", ALWAYS, END),
        ("1 in 2", "1", "an awl", ALWAYS, END), ("1 in 3", "1", "a pot of tallow", ALWAYS, END),
        ("1 in 4", "1", "a bridle", ALWAYS, 1950)]),
    (r"cooper|carpenter|joiner|wheelwright|wright|sawmill", "week", [
        ("always", "4-10", "planks", ALWAYS, END), ("1 in 2", "1", "a saw", ALWAYS, END),
        ("1 in 2", "1", "an adze", ALWAYS, 1900), ("1 in 3", "2-6", "barrel hoops", ALWAYS, END),
        ("1 in 3", "1", "a pot of glue", ALWAYS, END)]),
    (r"church|chapel|monaster|abbey|priory|cathedral|temple|mosque|synagogue|shrine", "month", [
        ("always", "4-12", "candles", ALWAYS, END), ("1 in 2", "1", "a book of prayers", ALWAYS, END),
        ("1 in 3", "1", "a vestment", ALWAYS, END), ("1 in 3", "1", "a flask of oil", ALWAYS, END),
        ("1 in 4", "1", "the parish register", 1560, END), ("1 in 5", "1", "an alms box", ALWAYS, END)]),
    (r"office|bank|clerk|notary|scribe|court|town hall|townhall|council|police|station|post", "week", [
        ("always", "1", "a ledger", ALWAYS, END), ("1 in 2", "1", "a bundle of letters", ALWAYS, END),
        ("1 in 2", "1", "a stamp and ink pad", 1800, END), ("1 in 3", "1", "a box of forms", 1850, END),
        ("1 in 3", "1", "a seal and wax", ALWAYS, 1900), ("1 in 4", "1", "a typewriter ribbon", 1880, 1995),
        ("1 in 4", "1", "a box of floppy disks", 1980, 2005), ("1 in 5", "2-20", "coins", ALWAYS, END)]),
    (r"guard|barrack|armou?ry|garrison|watch|castle|keep", "month", [
        ("1 in 2", "1-3", "spears", ALWAYS, 1700), ("1 in 2", "6-24", "crossbow bolts", ALWAYS, 1550),
        ("1 in 2", "1", "a powder horn", 1450, 1860), ("1 in 2", "1", "a box of cartridges", 1860, END),
        ("1 in 3", "1-3", "lanterns", ALWAYS, END), ("1 in 3", "1", "a set of shackles", ALWAYS, END),
        ("1 in 4", "1", "a whetstone", ALWAYS, END)]),
    (r"farm|byre|barn|stable|granary|mill", "month", [
        ("always", "1", "a sack of grain", ALWAYS, END), ("1 in 2", "1", "a sickle", ALWAYS, END),
        ("1 in 2", "1", "a bale of hay", ALWAYS, END), ("1 in 3", "1", "a pitchfork", ALWAYS, END),
        ("1 in 3", "1", "a bucket of feed", ALWAYS, END), ("1 in 4", "1", "a can of diesel", 1920, END)]),
]

# the same goods in other lands: whole-word swaps of the item text, by the palette's region group
REGION_SWAPS = {
    "east-asia": [("a loaf of bread", "a bag of rice"), ("loaves of bread", "bags of rice"), ("bread rolls", "rice cakes"),
                  ("a cask of ale", "a cask of rice wine"), ("bottles of beer", "bottles of rice wine"),
                  ("jugs of wine", "jars of rice wine"), ("a bottle of brandy", "a bottle of shochu"),
                  ("a bottle of slivovice", "a jar of plum wine"), ("a round of cheese", "a crock of pickles"),
                  ("a barrel of salted cabbage", "a barrel of pickled radish"), ("a cask of small beer", "a jar of soy sauce"),
                  ("a sack of flour", "a sack of rice"), ("turnips", "daikon"), ("a prayer book", "a sutra scroll"),
                  ("tankards", "sake cups"), ("a book of prayers", "a sutra"), ("a vestment", "a monk's robe"),
                  ("a jar of honey", "a tin of tea")],
}
ISLAMIC = re.compile(r"egypt|arab|ottoman|turk|persia|iran|maghreb|morocco|syria|levant|islam", re.I)
NO_DRINK = re.compile(r"\b(ale|beer|wine|brandy|slivovice|small beer)\b")


def _line(odds, count, item):
    return f"{odds}: {item}" if count == "1" else f"{odds}: {count} {item}"


def stock_for(piece, trade, year, region=""):
    """(restock, stock text) for a container of this piece ("shelf", "desk", "store") in a building with this trade
    word (its type and label when it has none), or (None, "") when nothing fits."""
    year = int(year or ALWAYS)
    words = trade or ""
    rule = next((t for t in TRADES if re.search(t[0], words, re.I)), None)
    restock, lines = (rule[1], rule[2]) if rule else ("month", HOME.get(piece, HOME["shelf"]))
    if rule and piece == "desk":                       # a trade's desk keeps its papers; the goods stay on the shelves
        lines = [l for l in lines if re.search(r"ledger|letter|tally|notes|book|register|forms|stamp|seal|ribbon|disk|coins", l[2])] \
            or HOME["desk"]
    got = [l for l in lines if l[3] <= year <= l[4]]
    swaps = REGION_SWAPS.get(region, [])
    out = []
    for odds, count, item, *_ in got:
        for a, b in swaps:
            if item == a: item = b
        if ISLAMIC.search(region or "") and NO_DRINK.search(item): continue
        out.append(_line(odds, count, item))
    return (restock, "\n".join(out)) if out else (None, "")
