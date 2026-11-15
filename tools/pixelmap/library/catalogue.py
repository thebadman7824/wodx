"""The object library (B6330-B6349): every object a WoDX pixel map may hold, defined once.

Each row gives what a player calls it, its true size in feet (a range where real ones vary), whether it has a front
and how much room that front needs, how it stands against a wall, the years it belongs to, the rooms and trades it
serves, and its drawing (seen from straight above, front toward the south). Sizes come from surviving pieces and
period practice; the `ref` says which. Ages, as tools/mapgen/settle.py counts them: medieval 1197, early 1450,
reform 1781, industrial 1851, republic 1919, socialist 1948, modern 1990, future 2030.

Drawings take (tm, x, y, w, h, state, var): the footprint in squares on a scratch map, the state ("one", "closed" or
"open") and the look's options. Anything they draw must stay inside the footprint (the shadow may fall a little
past it); test_library.py measures every drawing against its size."""
import math

import props as pr
import town as tw
import wilds as wl
import dress as dr
from px import R, T, OUT
from library.core import add, YEAR_END
from library import house as hs
from library import kitchen as kt
AGE6 = hs.looks("medieval", "early modern", "1800s", "1900s", "modern", "Future Darkness")

E = YEAR_END
HOME = ("home", "hall", "inn")
P = lambda v: int(round(v * T))


def cpx(x, y, w, h): return P(x + w / 2), P(y + h / 2)


def rpx(w, h, k=.5): return int(min(w, h) * T * k)


# ---------------------------------------------------------------- furniture
add("table", "table", "furniture", ((5, 7.5), (2.5, 3.25)), hs.table, looks=AGE6,
    tags=HOME + ("kitchen", "shop", "work"), ref="boarded and trestle tables of the 13th to 16th c., 5 1/2 to 7 ft by 2 1/2 to 3 ft")
add("table-laid", "table laid for a meal", "furniture", ((6.5, 8), (5, 6)), lambda tm, x, y, w, h, st, v: dr.t_table(tm, x, y, w, h),
    front=True, tags=HOME + ("kitchen",), ref="a 6 ft table with stools drawn up on three sides")
add("table-long", "long table", "furniture", ((8, 12), (2.5, 3.25)), hs.table, looks=AGE6,
    tags=("hall", "inn", "refectory"), ref="hall boards on trestles, 8 to 12 ft")
add("table-small", "small table", "furniture", ((2.5, 3.75), (2, 2.75)), hs.table, looks=AGE6,
    tags=HOME + ("chamber",), ref="side tables and stands, 2 1/2 to 3 1/2 ft")
add("bench", "bench", "furniture", ((4, 8), (1, 1.5)), kt.bench, looks=AGE6,
    tags=HOME + ("kitchen", "street", "yard", "work"), ref="plank benches, a seat 12 to 16 in deep")
add("stool", "stool", "furniture", (1.5, 1.5), kt.stool, looks=AGE6,
    tags=HOME + ("kitchen", "work", "craft"), ref="three-legged stools, a seat about 12 in across, the legs splayed past it")
add("bed", "bed", "furniture", ((4, 5), (6.25, 7)), hs.bed, looks=AGE6,
    front=True, clear=1.5, mount="wall", tags=("home", "chamber", "inn"),
    variants={"red": {"cloth": "red"}, "blue": {"cloth": "blue"}, "green": {"cloth": "green"}, "linen": {"cloth": "linen"}},
    ref="bedsteads for two in inventories and surviving box beds, 4 to 5 ft wide, 6 to 6 1/2 ft long inside")
add("bed-narrow", "narrow bed", "furniture", ((3, 3.75), (6, 6.75)), hs.bed, looks=AGE6,
    front=True, clear=1.5, mount="wall", tags=("home", "chamber", "inn", "barracks"),
    variants={"green": {"cloth": "green"}, "red": {"cloth": "red"}, "blue": {"cloth": "blue"}}, ref="single bedsteads and cots, about 3 by 6 ft")
add("pallet", "straw pallet", "furniture", ((2.75, 3.5), (5.75, 6.5)), lambda tm, x, y, w, h, st, v: dr.t_pallet(tm, x, y, w, h),
    front=True, mount="wall", tags=("home", "stable", "camp", "barracks"), ref="a ticking bag stuffed with straw, laid on the floor")
add("chest", "chest", "container", ((3.5, 5), (1.5, 2.25)),
    hs.chest, looks=AGE6,
    front=True, clear=1.5, back=1.5, mount="wall", states=("closed", "open"), openable="chest", tags=("home", "chamber", "store", "shop"),
    variants={"plain": {}, "red": {"paint": "red"}, "blue": {"paint": "blue"}, "green": {"paint": "green"}},
    ref="boarded and painted chests of the 14th to 19th c., 3 1/2 to 5 ft long, 1 1/2 to 2 ft deep; the lid needs 1 1/2 ft behind to open")
add("dresser", "dresser with plates", "furniture", ((4.5, 6.5), (1.5, 2.25)), kt.dresser, looks=hs.looks("early modern", "1800s", "1900s", "modern", "Future Darkness", start=1),
    front=True, clear=2, mount="wall", eras=(1550, E), tags=("home", "kitchen", "inn"), ref="open-shelved dressers from the later 16th c., 5 to 6 ft long, 18 to 24 in deep")
add("cupboard", "cupboard", "furniture", ((3.5, 5.5), (1.5, 2.25)), hs.cupboard, looks=AGE6, states=("closed", "open"), openable="chest",
    front=True, clear=2, mount="wall", tags=("home", "kitchen", "chamber", "shop", "sacristy"), ref="aumbries and press cupboards, 3 1/2 to 5 ft wide; wardrobes 20 to 24 in deep; the doors need 2 ft before them")
add("chair", "chair", "furniture", ((1.5, 2.25), (1.5, 2.25)), hs.chair, looks=hs.looks("early modern", "1800s", "1900s", "modern", "Future Darkness", start=1),
    front=True, clear=1.5, eras=(1450, E), tags=HOME + ("kitchen", "chamber", "shop", "office"),
    ref="joined chairs from the 15th c., Windsor and bentwood chairs, a seat 16 to 20 in square, the back 18 to 24 in wide")
add("armchair", "armchair", "furniture", ((2.5, 3.25), (2.5, 3.25)), hs.armchair, looks=hs.looks("1800s", "1900s", "modern", "Future Darkness", start=2),
    front=True, clear=2, eras=(1781, E), tags=("home", "parlour", "chamber", "inn", "office"),
    variants={"plain": {}, "red": {"cloth": "red"}, "green": {"cloth": "green"}, "blue": {"cloth": "blue"}}, ref="upholstered easy chairs from the 18th c., 2 1/2 to 3 ft each way")
add("sofa", "sofa", "furniture", ((5, 7.5), (2.75, 3.25)), hs.armchair, looks=hs.looks("1800s", "1900s", "modern", "Future Darkness", start=2),
    front=True, clear=2, eras=(1781, E), tags=("home", "parlour", "inn", "office"),
    variants={"plain": {}, "red": {"cloth": "red"}, "green": {"cloth": "green"}, "blue": {"cloth": "blue"}}, ref="sofas and settees from the later 18th c., 5 to 7 ft by about 3 ft")
add("shelf", "wall shelf", "furniture", ((3, 8), (1, 1.5)),
    kt.shelf, looks=AGE6,
    front=True, clear=1.5, mount="wall", tags=("home", "kitchen", "store", "shop", "craft"),
    variants={"crocks": {}, "linen": {"goods": ["box", "candle", "jug", "box"]}, "stores": {"goods": ["crock", "crock", "cheese", "jug", "loaf"]}},
    ref="boards on brackets about a foot deep")
add("pegrail", "peg rail with clothes", "furniture", ((3, 7), (1.5, 2.25)), lambda tm, x, y, w, h, st, v: dr.t_pegrail(tm, x, y, w, h),
    front=True, mount="wall", tags=("home", "chamber", "inn", "stable"), ref="a peg board with cloaks hung on it, standing out about 18 in")
add("toolrack", "tool rack", "furniture", ((4, 8), (1.75, 2.5)), lambda tm, x, y, w, h, st, v: dr.t_toolrack(tm, x, y, w, h),
    front=True, mount="wall", tags=("work", "stable", "yard", "smith", "store", "brew"), ref="long tools hung head down, a spade blade about 10 in")
add("workbench", "workbench", "trade", ((6, 9), (3, 4.5)), lambda tm, x, y, w, h, st, v: dr.t_workbench(tm, x, y, w, h),
    front=True, clear=2.5, mount="wall", tags=("work", "joinery", "craft", "smith"), ref="joiners' benches 6 to 8 ft by 2 to 2 1/2 ft, with the vice and the worker's place in front")
add("rug", "woven rug", "furniture", ((5, 10), (3, 7)), lambda tm, x, y, w, h, st, v: tm.rug(x, y, w, h, v.get("a", "red"), v.get("b", "gold")),
    low=True, tags=("home", "chamber", "hall"), variants={"red": {"a": "red", "b": "gold"}, "blue": {"a": "blue", "b": "linen"}, "green": {"a": "green", "b": "gold"}},
    ref="woven wool rugs and covers, for better households")
add("ragrug", "rag rug", "furniture", ((3, 5), (2, 3.5)), lambda tm, x, y, w, h, st, v: dr.ragrug(tm, *cpx(x, y, w, h), P(w) - 6, P(h) - 6, v.get("col", "red")),
    low=True, eras=(1750, E), tags=("home", "chamber", "kitchen"), variants={"red": {"col": "red"}, "blue": {"col": "blue"}, "green": {"col": "green"}},
    ref="braided rag rugs, a cottage thing from the 18th c. on")
add("wheel", "spinning wheel", "trade", ((3.5, 4.5), (3, 4)), lambda tm, x, y, w, h, st, v: dr.t_wheel(tm, x, y, w, h * .72),
    front=True, clear=1, eras=(1280, 1960), tags=("home", "craft", "weaver"), ref="Saxony and great wheels about 3 ft long; the spinner's stool before the treadle")
add("churn", "butter churn", "goods", ((1.25, 2), (1.25, 2)), lambda tm, x, y, w, h, st, v: dr.t_churn(tm, x, y, w, h),
    eras=(1197, 1960), tags=("home", "kitchen", "dairy"), ref="plunge churns about 12 to 16 in across")
add("quern", "hand quern", "trade", ((2, 2.75), (2, 2.75)), lambda tm, x, y, w, h, st, v: dr.t_quern(tm, x, y, w, h),
    eras=(1197, 1850), tags=("home", "kitchen", "mill"), ref="rotary querns about 16 to 20 in across, on a board or the floor")
add("washtub", "wash tub", "goods", ((2.75, 4), (2, 3)), lambda tm, x, y, w, h, st, v: dr.t_washtub(tm, x, y, w, h),
    tags=("home", "yard", "dye", "laundry"), ref="staved tubs 2 1/2 to 3 1/2 ft across")
add("loom", "floor loom", "trade", ((7, 9.5), (5, 6.5)), lambda tm, x, y, w, h, st, v: tw.loom(tm, x, y, w, h, v.get("cloth", "blue")),
    front=True, clear=1, eras=(1197, 1960), tags=("craft", "weaver", "home"), variants={"blue": {"cloth": "blue"}, "red": {"cloth": "red"}, "green": {"cloth": "green"}},
    ref="treadle looms with their bench, about 9 by 6 ft")

# ---------------------------------------------------------------- fittings and fires
def _oven(tm, x, y, w, h, st, v): tm.oven(x, y, w, h, side="n")


add("oven", "bread oven", "hearth", ((6, 7.5), (6, 7.5)), _oven, front=True, clear=3, mount="wall", tags=("home", "kitchen", "bakery"),
    light={"dim": 4, "bright": 1.5, "color": "#ff9a40", "kind": "fire"},
    ref="household clay and brick bake ovens about 7 ft across with the stoking floor in front of the mouth")
add("hearth", "open hearth", "hearth", ((4.5, 6), (4.5, 6)), lambda tm, x, y, w, h, st, v: wl.hearth(tm, x + w / 2, y + h / 2, r=min(w, h) / 2 - .02),
    clear=2, tags=("home", "hut", "hall"), eras=(1197, 1900), light={"dim": 5, "bright": 1, "color": "#ff9a40", "kind": "fire"},
    ref="a stone hearth slab about 5 ft square in the middle of the floor")

add("fireplace", "fireplace", "hearth", ((5, 7), (2.5, 3.5)), kt.fireplace, looks=AGE6, states=("lit", "out"),
    front=True, clear=3, mount="wall", tags=("home", "hall", "inn", "parlour", "chamber"), light={"dim": 5, "bright": 1.5, "color": "#ff9a40", "kind": "fire"},
    ref="wall fireplaces with hoods from the 12th c., hearths 4 to 6 ft wide; Victorian grates and tiled surrounds about 5 ft; stoves on a 3 ft slate hearth")
add("cooker", "kitchen range", "hearth", ((3, 4.5), (2, 2.5)), kt.cooker, looks=hs.looks("1800s", "1900s", "modern", "Future Darkness", start=2),
    front=True, clear=3, mount="wall", eras=(1781, E), tags=("home", "kitchen", "inn"),
    ref="cast-iron ranges 3 to 4 1/2 ft wide; gas and electric cookers about 2 by 2 ft")
add("sink", "sink", "fitting", ((2.5, 4.5), (1.5, 2.25)), kt.sink, looks=hs.looks("1800s", "1900s", "modern", "Future Darkness", start=2),
    front=True, clear=2, mount="wall", eras=(1781, E), tags=("home", "kitchen", "inn", "scullery"),
    ref="shallow stone sinks about 3 ft by 20 in; Belfast sinks 2 ft with a 2 ft draining board; sink units 3 1/2 to 4 ft")

def _forge(tm, x, y, w, h, st, v):
    """The forge block in the left of the footprint, the bellows inside it on the right (B6331): nothing past the box."""
    fw = w * .68; tw.forge(tm, x, y + .04, fw - .5, h - .08)


add("forge", "smith's forge", "trade", ((8, 10), (5, 6.5)), _forge, front=True, clear=3, mount="wall", tags=("smith",),
    light={"dim": 5, "bright": 1.5, "color": "#ff8a30", "kind": "fire"}, ref="a waist-high hearth 5 to 6 ft long with its great bellows beside it")
add("brewfurnace", "brew furnace with its copper", "trade", ((5, 7), (5, 7.5)),
    lambda tm, x, y, w, h, st, v: tw.brew_furnace(tm, x, y, w - .2, h), front=True, clear=2.5, native="e", tags=("brew",),
    light={"dim": 5, "bright": 1.5, "color": "#ff9a40", "kind": "fire"}, ref="a brick-set copper of the brewhouse, 5 to 7 ft")
add("campfire", "camp fire", "hearth", ((4, 5.5), (4, 5.5)), lambda tm, x, y, w, h, st, v: wl.campfire(tm, x + w / 2, y + h / 2),
    clear=2, mount="ground", tags=("camp", "wood"), light={"dim": 6, "bright": 2, "color": "#ff9a40", "kind": "fire"}, ref="a ring of stones about 3 ft across")
add("kiln", "charcoal kiln", "trade", ((15, 20), (15, 20)), lambda tm, x, y, w, h, st, v: wl.kiln(tm, x + w / 2, y + h / 2, r=rpx(w, h, .48)),
    mount="ground", eras=(1197, 1950), tags=("wood", "camp"), light={"dim": 4, "bright": 1, "color": "#ff7a30", "kind": "fire"},
    ref="earth-clamp kilns 15 to 20 ft across")
add("lanternpost", "lantern post", "fitting", (1.25, 1.25), lambda tm, x, y, w, h, st, v: tw.lantern_post(tm, x + w / 2, y + h / 2),
    tags=("street", "market", "yard"), eras=(1400, 1900), light={"dim": 4, "bright": 1, "color": "#ffbb66", "kind": "torch"}, ref="an iron lantern a foot across on a post")
add("well", "draw well", "fitting", ((4.5, 5.5), (4.5, 5.5)), lambda tm, x, y, w, h, st, v: pr.well(tm, x + w / 2, y + h / 2),
    mount="ground", clear=2, eras=(1197, 1960), tags=("yard", "street", "market", "village"), ref="stone well heads about 4 ft with the windlass posts beside")

# ---------------------------------------------------------------- openings (drawn by library.door and library.window in a recorded wall)
add("door-inner", "door", "opening", (5, 1), None, mount="opening", states=("closed", "open"), tags=("all",),
    ref="one square opening; a plank leaf on strap hinges")
add("door-outer", "outer door", "opening", (5, 1), None, mount="opening", states=("closed", "open"), tags=("all",),
    ref="one square opening with a stone threshold and step outside")
add("window-shuttered", "shuttered window", "opening", (5, 1), None, mount="opening", states=("closed", "open"), tags=("all",),
    ref="an unglazed opening with two plank shutters that fold back along the outside wall")
add("window-glazed", "glazed window", "opening", (5, 1), None, mount="opening", states=("closed", "open"), eras=(1400, E), tags=("all",),
    ref="glass panes in a wooden frame, with shutters outside; glass in country houses from about 1500")

# ---------------------------------------------------------------- containers and goods
add("cask", "cask", "container", ((1.75, 2.5), (1.75, 2.5)),
    lambda tm, x, y, w, h, st, v: pr.barrel(tm, x + w / 2, y + h / 2, rpx(w, h, .48), holds=v.get("holds", "water"), head="s", state=st if st != "one" else "closed"),
    front=True, clear=1, mount="floor", states=("closed", "open"), openable="barrel", tags=("store", "kitchen", "brew", "shop", "inn", "cellar", "street"),
    variants={"water": {"holds": "water"}, "grain": {"holds": "grain"}, "apples": {"holds": "apples"}, "kraut": {"holds": "kraut"}},
    ref="standing casks 2 to 2 1/2 ft across; the head, lifted out, leans in front")
add("crate", "crate", "container", ((2, 2.75), (2, 2.75)),
    lambda tm, x, y, w, h, st, v: pr.crate(tm, x, y, P(min(w, h)), goods=v.get("goods", "apples"), lid="s", state=st if st != "one" else "closed"),
    front=True, clear=1, states=("closed", "open"), openable="crate", tags=("store", "shop", "market", "street", "cellar"),
    variants={"apples": {"goods": "apples"}, "jars": {"goods": "jars"}}, ref="slatted crates 2 to 2 1/2 ft; the lid, taken off, leans in front")
add("sack", "grain sack", "container", ((1.75, 2.75), (1.5, 2.25)),
    lambda tm, x, y, w, h, st, v: pr.sack(tm, x + w / 2, y + h / 2, rpx(w, h, .42), state=st if st != "one" else "closed"),
    states=("closed", "open"), openable="sack", tags=("store", "mill", "shop", "market", "stable", "brew"), ref="a bushel sack about 2 1/2 ft long lying down")
add("crates", "stack of crates", "goods", ((4, 8), (2, 2.75)), lambda tm, x, y, w, h, st, v: dr.f_crates(tm, P(x), P(y), P(x + w), P(y + h), 1.0, True),
    mount="wall", tags=("store", "shop", "market", "street"), ref="crates of 2 1/4 ft in a row")
add("casks", "row of casks", "goods", ((4, 8), (2, 2.5)), lambda tm, x, y, w, h, st, v: dr.f_casks(tm, P(x), P(y), P(x + w), P(y + h), 1.0, True),
    mount="wall", tags=("store", "brew", "cellar", "inn", "shop"), ref="small casks about 2 ft across set in a row")
add("sacks", "row of sacks", "goods", ((4, 7), (1.75, 2.25)), lambda tm, x, y, w, h, st, v: dr.f_sacks(tm, P(x), P(y), P(x + w), P(y + h), 1.0, True),
    mount="wall", tags=("store", "mill", "shop", "brew", "stable"), ref="sacks about 1 3/4 ft across stood in a row")
add("woodpile", "firewood stack", "goods", ((3, 10), (1.75, 3)), lambda tm, x, y, w, h, st, v: pr.logpile(tm, x, y, w, h),
    mount="wall", tags=("home", "kitchen", "yard", "joinery", "brew", "camp"), ref="billets about 18 in long stacked against a wall")
add("basket", "basket", "goods", ((1.25, 2), (1.25, 2)), lambda tm, x, y, w, h, st, v: pr.basket(tm, *cpx(x, y, w, h), rpx(w, h, .45), fill=v.get("fill", "wool")),
    tags=("home", "kitchen", "store", "shop", "market", "craft"),
    variants={k: {"fill": k} for k in ("wool", "apples", "onions", "eggs", "turnips")}, ref="willow baskets 14 to 20 in across")
add("bucket", "bucket", "goods", ((1, 1.5), (1, 1.5)), lambda tm, x, y, w, h, st, v: pr.bucket(tm, *cpx(x, y, w, h), rpx(w, h, .42), water=v.get("water", True)),
    tags=("home", "kitchen", "stable", "yard", "smith", "dye", "brew"), variants={"water": {"water": True}, "empty": {"water": False}}, ref="staved buckets about 12 in across")
add("jug", "jug", "goods", (.9, .9), lambda tm, x, y, w, h, st, v: pr.jug(tm, *cpx(x, y, w, h), rpx(w, h, .36)), tags=("home", "kitchen", "inn"),
    ref="earthen jugs 7 to 9 in across, with the handle")
add("pot", "cooking pot", "goods", (1.4, 1.4), lambda tm, x, y, w, h, st, v: dr.pot(tm, *cpx(x, y, w, h), rpx(w, h, .3)), tags=("home", "kitchen", "camp"),
    ref="iron cauldrons about 10 in across on three feet")
add("butt", "water butt", "goods", ((2.25, 2.75), (2.25, 2.75)), lambda tm, x, y, w, h, st, v: dr.butt(tm, *cpx(x, y, w, h)),
    mount="wall", tags=("yard", "street"), ref="a big cask about 2 1/2 ft across under the eaves")
add("bundle", "bundle of kindling", "goods", (2.5, 1), lambda tm, x, y, w, h, st, v: dr.bundle(tm, *cpx(x, y, w, h), 0),
    tags=("home", "kitchen", "yard", "camp"), ref="faggots about 2 ft long")
add("hayheap", "heap of hay with a pitchfork", "goods", ((2.5, 3.5), (2.5, 3.5)), lambda tm, x, y, w, h, st, v: pr.hay(tm, x + w / 2, y + h / 2, rpx(w, h, .4)),
    tags=("stable", "store", "yard"), ref="a forkful heap 2 1/2 to 3 ft across")
add("hayrick", "haystack", "outdoor", ((10, 12), (10, 12)), lambda tm, x, y, w, h, st, v: pr.hay(tm, x + w / 2, y + h / 2, rpx(w, h, .46)),
    mount="ground", eras=(1197, 1960), tags=("yard", "field"), ref="field ricks 10 to 12 ft across")
add("trough", "water trough", "fitting", ((5, 8), (1.75, 2.5)), lambda tm, x, y, w, h, st, v: pr.trough(tm, x + .05, y + .05, w - .1, h - .1),
    native="e", tags=("stable", "yard", "street"), ref="hewn log troughs 5 to 8 ft long")

# small things of daily use (pixels about a foot or two)
_SMALL = [
    ("broom", "broom", (3, 1.25), lambda tm, x, y, w, h, st, v: dr.broom(tm, *cpx(x, y, w, h), 0), ("home", "kitchen", "shop", "work", "stable"), "a birch broom about 4 ft with its handle"),
    ("boots", "pair of boots", (1.25, 1.5), lambda tm, x, y, w, h, st, v: dr.boots(tm, *cpx(x, y, w, h)), ("home", "chamber", "inn"), "a pair of boots side by side"),
    ("cloak", "cloak on a peg", (1.75, 2), lambda tm, x, y, w, h, st, v: dr.cloak(tm, *cpx(x, y, w, h), v.get("col", "red")), ("home", "chamber", "inn"), "a wool cloak hung from a wall peg"),
    ("tool", "spade", (4.5, 1), lambda tm, x, y, w, h, st, v: dr.tool(tm, *cpx(x, y, w, h), 0, v.get("kind", "spade"), L=P(w) * .4), ("yard", "stable", "store", "work"), "long tools with 4 ft hafts"),
    ("straw", "loose straw", (2.5, 2), lambda tm, x, y, w, h, st, v: dr.straw(tm, *cpx(x, y, w, h), rpx(w, h, .45)), ("stable", "street", "store", "market", "yard"), "a scatter of straw"),
    ("dung", "horse dung", (1.25, 1), lambda tm, x, y, w, h, st, v: dr.dung(tm, *cpx(x, y, w, h)), ("stable", "street", "market", "yard"), "a dropping with straw"),
    ("rope", "coil of rope", (1.5, 1.5), lambda tm, x, y, w, h, st, v: dr.rope(tm, *cpx(x, y, w, h)), ("store", "stable", "yard", "camp", "shop"), "a coil about 16 in across"),
    ("shavings", "wood shavings", (2, 1.5), lambda tm, x, y, w, h, st, v: dr.shavings(tm, *cpx(x, y, w, h)), ("joinery", "work"), "curls of shavings under the bench"),
    ("stones", "loose stones", (2, 1.5), lambda tm, x, y, w, h, st, v: dr.stones(tm, *cpx(x, y, w, h)), ("street", "yard", "wood", "ruin"), "a few fist to head-sized stones"),
    ("cup", "cup", (.5, .5), lambda tm, x, y, w, h, st, v: pr.cup(tm, *cpx(x, y, w, h)), ("home", "inn"), "a wooden cup about 4 in"),
    ("distaff", "distaff with wool", (1.5, 1.5), lambda tm, x, y, w, h, st, v: pr.distaff(tm, *cpx(x, y, w, h)), ("home", "craft"), "a distaff about 3 ft with its puff of wool"),
    ("bowl", "bowl", (.75, .75), lambda tm, x, y, w, h, st, v: pr.bowl(tm, *cpx(x, y, w, h), rpx(w, h, .45)), ("home", "inn", "kitchen"), "a turned bowl 6 to 8 in"),
    ("loaf", "loaf of bread", (1, .75), lambda tm, x, y, w, h, st, v: pr.loaf(tm, *cpx(x, y, w, h), P(w) * .45, P(h) * .45), ("home", "kitchen", "bakery", "inn"), "a round loaf about 10 in"),
    ("cheese", "cheese", (.75, .75), lambda tm, x, y, w, h, st, v: pr.cheese(tm, *cpx(x, y, w, h), rpx(w, h, .45)), ("home", "kitchen", "dairy"), "a small round cheese"),
    ("candle", "candle", (.6, .6), lambda tm, x, y, w, h, st, v: pr.candle(tm, *cpx(x, y, w, h)), ("home", "chamber", "church", "inn"), "a tallow candle in its holder"),
    ("plates", "stack of plates", (.75, .75), lambda tm, x, y, w, h, st, v: pr.plates(tm, *cpx(x, y, w, h), rpx(w, h, .45)), ("home", "kitchen", "inn"), "wooden or earthen plates 7 to 9 in"),
]
for oid, name, ft, fn, tags, ref in _SMALL:
    add(oid, name, "goods", ft, fn, tags=tags, low=oid in ("straw", "dung", "shavings"), ref=ref,
        mount="on" if oid in ("cup", "bowl", "loaf", "cheese", "candle", "plates") else "floor",
        variants={"red": {"col": "red"}, "blue": {"col": "blue"}, "green": {"col": "green"}} if oid == "cloak" else
                 {"spade": {"kind": "spade"}, "rake": {"kind": "rake"}, "fork": {"kind": "fork"}} if oid == "tool" else {})

# ---------------------------------------------------------------- trades
add("anvil", "anvil on its block", "trade", ((2.25, 3), (1.75, 2.5)), lambda tm, x, y, w, h, st, v: tw.anvil(tm, x + w / 2 - .05, y + h / 2 - .1),
    clear=2, tags=("smith",), ref="an anvil about 2 ft long with its horn, on an oak block")
add("vat", "dye vat", "trade", ((7, 9), (7, 9)), lambda tm, x, y, w, h, st, v: tw.vat(tm, x + w / 2, y + h / 2, r=min(w, h) / 2 - .05, liquid=v.get("liquid", "blue")),
    clear=1.5, tags=("dye", "brew", "tannery"), variants={"blue": {"liquid": "blue"}, "red": {"liquid": "red"}, "gold": {"liquid": "gold"}}, ref="open vats about 8 ft across")
add("staves", "stack of staves", "trade", ((6, 9), (2.5, 3.5)), lambda tm, x, y, w, h, st, v: tw.staves(tm, x, y, w, h), mount="wall", tags=("cooper", "joinery"),
    ref="riven oak staves about 3 ft long, stacked")
add("handcart", "handcart", "vehicle", ((9, 10), (4, 4.75)), lambda tm, x, y, w, h, st, v: tw.handcart(tm, x + .62, y + h / 2, along="y", load=v.get("load", "hay")),
    native="s", tags=("street", "market", "yard"), variants={"hay": {"load": "hay"}, "empty": {"load": "none"}}, ref="a two-wheeled cart, bed about 6 by 3 1/2 ft, shafts out in front")
add("stall", "market stall", "trade", ((12, 14), (5.5, 6.5)),
    lambda tm, x, y, w, h, st, v: tw.stall(tm, x, y, w, h, v.get("stripe", "red"), v.get("goods", "loaf")), front=True, clear=3, tags=("market", "street"),
    variants={"bread": {"stripe": "red", "goods": "loaf"}, "cloth": {"stripe": "blue", "goods": "cloth"}, "pots": {"stripe": "green", "goods": "pots"},
              "fish": {"stripe": "blue", "goods": "fish"}, "apples": {"stripe": "gold", "goods": "apples"}}, ref="trestle stalls with an awning, about 13 by 6 ft")
add("horsestall", "horse stall", "trade", ((6.5, 7.5), (9.5, 10.5)), lambda tm, x, y, w, h, st, v: tw.horse_stall(tm, x, y, w, h, open_side="s"),
    front=True, clear=4, mount="wall", tags=("stable",), ref="stalls 5 to 6 ft wide, 9 to 10 ft long with the manger at the head")
add("sawhorse", "sawhorse with a log", "trade", ((3.5, 4.5), (2.25, 3)), lambda tm, x, y, w, h, st, v: dr.f_sawhorse(tm, P(x), P(y), P(x + w), P(y + h), 1.0, True),
    clear=1.5, tags=("joinery", "yard", "work"), ref="a trestle about 3 ft long with a log on it")
add("grindstone", "grindstone", "trade", ((3.5, 4.5), (2.5, 3.25)), lambda tm, x, y, w, h, st, v: dr.f_grindstone(tm, P(x), P(y), P(x + w), P(y + h), 1.0, True),
    clear=1.5, tags=("smith", "joinery", "work", "yard"), ref="a 2 ft stone in a frame with its crank and water trough")
add("chopping", "chopping block and axe", "trade", ((2, 2.75), (2, 2.75)), lambda tm, x, y, w, h, st, v: pr.chopping(tm, x + w / 2 - .25, y + h / 2 - .25),
    tags=("yard", "kitchen", "camp"), ref="a round of trunk about 18 in with the axe in it")

# ---------------------------------------------------------------- outdoor and plants
add("tent", "ridge tent", "outdoor", ((11, 13), (6.5, 7.5)), lambda tm, x, y, w, h, st, v: wl.tent(tm, x, y, h, w, along="x", cloth=v.get("cloth", "linen")),
    mount="ground", tags=("camp",), variants={"linen": {"cloth": "linen"}, "dwood": {"cloth": "dwood"}}, ref="soldiers' and pedlars' ridge tents about 12 by 7 ft")
add("leanto", "lean-to", "outdoor", ((14, 16), (8.5, 9.5)), lambda tm, x, y, w, h, st, v: wl.leanto(tm, x, y, w, h, low="s"),
    front=True, clear=2, mount="ground", tags=("camp", "wood", "yard"), ref="a board shelter about 15 by 9 ft, open on its low side")
add("boulder", "boulder", "outdoor", ((3, 5), (2.5, 4)), lambda tm, x, y, w, h, st, v: wl.boulder(tm, x + w / 2, y + h / 2, w * .9, h * .9),
    mount="ground", tags=("wood", "field", "ruin"), ref="field boulders 3 to 5 ft")
add("stump", "tree stump", "outdoor", ((1.75, 2.5), (1.75, 2.5)), lambda tm, x, y, w, h, st, v: wl.stump(tm, x + w / 2, y + h / 2, rpx(w, h, .42)),
    mount="ground", tags=("wood", "camp", "yard"), ref="sawn stumps about 2 ft")
add("pelt", "pelt laid flat", "outdoor", ((4, 4.75), (5.5, 6.25)), lambda tm, x, y, w, h, st, v: wl.pelt(tm, x + w / 2, y + h / 2, w * .9, h * .9, fur=v.get("fur", "brown")),
    low=True, tags=("camp", "hut", "home", "tannery"), variants={"deer": {"fur": "brown"}, "wolf": {"fur": "grey"}, "fox": {"fur": "red"}}, ref="a deer or wolf skin about 4 by 6 ft")
add("bones", "gnawed bones", "outdoor", ((2.5, 4), (2.5, 4)), lambda tm, x, y, w, h, st, v: wl.bones(tm, x + w / 2, y + h / 2, spread=min(w, h) * .3),
    low=True, tags=("wood", "den", "ruin"), ref="a scatter of long bones and a skull")
add("bush", "bush", "plant", ((3, 6), (3, 6)), lambda tm, x, y, w, h, st, v: tm.bush(*cpx(x, y, w, h), rpx(w, h, .42), v.get("berries")),
    mount="ground", tags=("yard", "wood", "garden", "field"), variants={"plain": {}, "red berries": {"berries": R["red"][3]}}, ref="shrubs 3 to 6 ft across")
add("tree", "broadleaf tree", "plant", ((14, 23), (14, 23)), lambda tm, x, y, w, h, st, v: tm.tree(*cpx(x, y, w, h), rpx(w, h, .46)),
    mount="ground", tags=("yard", "wood", "field", "street"), ref="field trees with crowns 14 to 23 ft across")
add("fir", "fir tree", "plant", ((10, 18), (10, 18)), lambda tm, x, y, w, h, st, v: tm.fir(*cpx(x, y, w, h), rpx(w, h, .46)),
    mount="ground", tags=("wood", "field", "yard"), ref="spruce and fir crowns 10 to 18 ft")
add("fern", "bracken", "plant", ((2, 4), (2, 4)), lambda tm, x, y, w, h, st, v: dr.fern(tm, *cpx(x, y, w, h), rpx(w, h, .45)),
    low=True, mount="ground", tags=("wood", "ruin"), ref="a clump of bracken 2 to 4 ft")
add("branch", "fallen branch", "outdoor", (4, 1.5), lambda tm, x, y, w, h, st, v: dr.branch(tm, *cpx(x, y, w, h), 0), low=True, mount="ground",
    tags=("wood", "ruin", "camp"), ref="a dead branch about 4 ft")
add("mushrooms", "toadstools", "plant", (1.5, 1.25), lambda tm, x, y, w, h, st, v: dr.mushrooms(tm, *cpx(x, y, w, h)), low=True, mount="ground",
    tags=("wood",), ref="a few toadstools in the litter")
add("rubble", "rubble", "outdoor", ((2, 4), (2, 3)), lambda tm, x, y, w, h, st, v: dr.rubble(tm, *cpx(x, y, w, h)), mount="ground", tags=("ruin",),
    ref="fallen stones from a wall")

# ---------------------------------------------------------------- church
add("altar", "altar", "church", ((6, 8), (3, 3.75)), lambda tm, x, y, w, h, st, v: tm.altar(x, y, w, h), front=True, clear=4, mount="wall",
    tags=("church", "chapel"), ref="stone altars 6 to 8 ft long, about 3 1/2 ft deep, with the step in front")
add("font", "font", "church", ((3.5, 4.5), (3.5, 4.5)), lambda tm, x, y, w, h, st, v: tm.font(x + w / 2, y + h / 2, rpx(w, h, .45)), clear=2,
    tags=("church",), ref="stone fonts about 3 1/2 to 4 ft across on their step")
add("tomb", "tomb with an effigy", "church", ((7, 8), (3, 3.75)), lambda tm, x, y, w, h, st, v: tm.tomb(x, y, w, h), tags=("church", "crypt"),
    ref="tomb chests about 7 by 3 ft with the figure on the lid")
add("grave", "grave", "church", ((3, 3.5), (6.5, 7.5)), lambda tm, x, y, w, h, st, v: tm.grave(x + w / 2, y + h / 2), mount="ground", tags=("churchyard",),
    ref="a grave about 3 by 7 ft with its marker")
add("choirstalls", "choir stalls", "church", ((8, 12), (4, 5)), lambda tm, x, y, w, h, st, v: tm.stalls(x, y, w, h, back="n"), front=True, clear=2, mount="wall",
    tags=("church",), ref="a row of stalls with the desk before them")

# ---------------------------------------------------------------- yard lines and beds
add("washline", "washing line", "outdoor", ((8, 16), (1.5, 2.5)),
    lambda tm, x, y, w, h, st, v: pr.washline(tm, x + .06, y + h * .35, x + w - .06, y + h * .35, [("linen", 34), ("red", 20), ("linen", 38), ("blue", 18)]),
    mount="ground", tags=("yard", "dye", "laundry"), ref="a rope between two posts with washing hung on it")
add("garden", "kitchen garden", "plant", ((10, 40), (5, 12)), lambda tm, x, y, w, h, st, v: pr.garden(tm, x, y, x + w, y + h),
    low=True, mount="ground", tags=("yard", "garden"), ref="raised beds, one crop to a row")
add("wattle", "wattle fence", "outdoor", ((5, 40), (.75, 1.25)), lambda tm, x, y, w, h, st, v: pr.wattle(tm, x, y + h / 2, x + w, y + h / 2),
    mount="ground", tags=("yard", "garden", "field"), ref="woven withies on stakes, about a hand thick, drawn a little wider so it reads")


# ---------------------------------------------------------------- the family modules (B6346): each draws one or more census families in every era,
# with ten or more variations, and defines or redefines its objects with library.core.define
import importlib as _il, pkgutil as _pk, library as _lib  # noqa: E402
import os as _os, sys as _sys, traceback as _tb  # noqa: E402
FAILED = {}                                       # a family module that does not load is reported, and the others still load
for _m in sorted(m.name for m in _pk.iter_modules(_lib.__path__) if m.name.startswith("fam_")):
    try: _il.import_module("library." + _m)
    except Exception as _e:
        FAILED[_m] = _tb.format_exc(limit=3)
        if not _os.environ.get("LIBRARY_QUIET"): print(f"library: {_m} did not load: {_e!r}", file=_sys.stderr)
