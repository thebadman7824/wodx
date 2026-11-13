"""Palettes: one per building, so every room of it shares one look. A palette is keyed by age (settle.py's), world
region and wealth, and turns each general piece (table, seat, bed...) into a few real assets of one style from the
catalogue (catalogue.py), along with the building's wall texture, its floors by room kind, its doors and its light.

A piece the age has no asset for is left out: an asset is never borrowed from another age unless it lasts through
every age (a barrel, a sack)."""
import json
import os
import re

from settle import age_of

WEALTH = ["poor", "middling", "rich", "noble"]
WORTH = {"poor": (0, 1), "middling": (1, 2), "rich": (2, 4), "noble": (3, 5)}
# the styles each age reaches for first; the building's main style is drawn from these
STYLES = {
    "medieval": ["fa-ashen", "skront", "wfw", "tc"], "early": ["fa-light", "skront", "tc", "wfw", "fa-ashen"],
    "reform": ["fa-dark", "tc-period", "skront-fine", "fa-light"], "industrial": ["tc-period", "fa-dark", "skront-fine"],
    "republic": ["tc-period", "mid-century", "fa-dark", "ada-museum"], "socialist": ["mid-century", "tyger", "eighties", "ada-military"],
    "modern": ["tyger", "ada", "wfw-modern", "ada-office"], "future": ["scifi", "ada-future", "wfw-scifi", "ada-office"],
}
NEUTRAL = {"fa", "wfw", "tc", "skront", "ada"}        # styles that sit with any main style of their age
LIGHTS = {"medieval": "candle", "early": "candle", "reform": "oil", "industrial": "gas", "republic": "electric",
          "socialist": "electric", "modern": "electric", "future": "electric"}
FLOOR_WORDS = {"living": r"Wood|Plank|Parquet|Carpet|Marble|Board", "sleep": r"Wood|Plank|Carpet|Board",
               "study": r"Wood|Plank|Parquet|Carpet", "kitchen": r"Stone|Tile|Brick|Flag|Cobble|concrete",
               "store": r"Stone|Brick|Dirt|Flag|concrete|Plank", "outdoor": r"Cobble|Stone|paving|Gravel|Dirt",
               "worship": r"Stone|Marble|Tile|Flag"}
WALL_WORDS = {"medieval": r"PlasterWood|Wood|Stone|Log", "early": r"PlasterWood|Brick|Stone", "reform": r"Brick|Plaster|Stone",
              "industrial": r"Brick|Plaster", "republic": r"Brick|Plaster|stucco", "socialist": r"concrete|stucco|Plaster|simple",
              "modern": r"wall|concrete|Tyger", "future": r"hull|metal|Hivehall|interior|Bulkhead"}
NOT_FLOOR = re.compile(r"Grate|Grill|Overlay|Shadow|Water|Snow|Slime|Rain|Hole|Spike|Roof|Fields|Background|transparent|tileset|Cracked|Damaged|Broken|Destroyed", re.I)
HOME = "moravia"
_SET = 4                                               # assets a palette keeps for each piece


def load(path):
    return json.load(open(path, encoding="utf-8"))


def region_key(region, catalogue):
    known = {HOME} | {r for e in catalogue for r in (e.get("regions") or [])}
    return region if region in known else HOME


class Palette:
    def __init__(self, key, sets, worths, wall, floor, door, lights, style):
        self.key, self.sets, self.worths = key, sets, worths
        self.wall, self.floor, self.door, self.lights, self.style = wall, floor, door, lights, style

    def pick(self, piece, rng):
        s = self.sets.get(piece)
        return rng.choice(s) if s else None

    def worth(self, asset_name):
        return self.worths.get(asset_name, 1)


ORDER = ["medieval", "early", "reform", "industrial", "republic", "socialist", "modern", "future"]

def _fits(e, band, region):
    if band not in e["bands"]:
        # a lasting thing (a barrel, a sack) carries on into later ages, never back into earlier ones
        if not e["lasting"] or ORDER.index(band) < min(ORDER.index(b) for b in e["bands"]): return False
    regs = e.get("regions")
    return not regs or region in regs


def choose(year, region, wealth, rng, catalogue):
    """The palette for one building (draws from rng, so a seed gives the same palette)."""
    band = age_of(max(year or 1197, 1))
    reg = region_key(region, catalogue)
    wealth = wealth if wealth in WORTH else "middling"
    pool = [e for e in catalogue if _fits(e, band, reg)]
    own = [e for e in pool if band in e["bands"]]
    styles = [s for s in STYLES.get(band, []) if any(e["style"] == s for e in own)] or sorted({e["style"] for e in own})
    main = rng.choice(styles[:2]) if styles else None
    ranked = [main] + [s for s in styles if s != main]
    order = sorted(WEALTH, key=lambda w: abs(WEALTH.index(w) - WEALTH.index(wealth)))
    sets = {}
    for piece in sorted({e["piece"] for e in pool if e["kind"] == "objects"}):
        cands = [e for e in pool if e["piece"] == piece and e["kind"] == "objects"]
        got = []
        for w in order:                                # own wealth first, then the nearest
            lo, hi = WORTH[w]
            inw = [e for e in cands if lo <= e["worth"] <= hi]
            for s in ranked + [None]:                  # the main style, the age's others, then anything of the age
                got = [e for e in inw if (s is None or e["style"] == s or (e["style"] in NEUTRAL and s == main))]
                if got: break
            if got: break
        if got:
            got = sorted(got, key=lambda e: e["path"])
            sets[piece] = rng.sample(got, min(_SET, len(got)))
    def texture(kind, words=None):
        c = sorted((e for e in own if e["kind"] in kind and not (kind != ("walls",) and NOT_FLOOR.search(e["name"]))), key=lambda e: e["path"])
        styled = [e for e in c if e["style"] in ranked[:1]] or c
        if words:
            hit = lambda l: [e for e in l if re.search(words, e["name"], re.I)]
            styled = hit(styled) or hit(c) or styled
        return rng.choice(styled)["path"] if styled else None
    wall = texture(("walls",), WALL_WORDS.get(band))
    floor = {k: texture(("patterns", "tilesets"), w) for k, w in FLOOR_WORDS.items()}
    door = texture(("portals",))
    lights = "rushlight" if band == "medieval" and wealth == "poor" else LIGHTS[band]
    worths = {k: e["worth"] for v in sets.values() for e in v for k in (e["name"], e["path"])}
    return Palette((band, reg, wealth), sets, worths, wall, floor, door, lights, main)
