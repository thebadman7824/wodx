"""Variations (B6344): every library object is drawn in at least ten variations in every era it spans.

A variation is a set of draw options a drawing honours, chosen along the object's axes:
    era        the census era key (dark-ages ... future-darkness); also passed as the older "age" look
    wealth     0 destitute .. 5 princely (census.WEALTH): plainer or richer materials, ornament, upkeep
    style      the regional style family (census.STYLES): its own shapes, patterns and colours
    material   what it is made of (an axis list of the object's own: oak, pine, walnut, iron, brass, cane ...)
    colour     dye, paint or glaze (the object's own list)
    condition  new, worn, broken (and burnt, bloodied where an object lists them)
    contents   what it holds or carries (empty, half, full, or named goods)
An object declares its axes on its Spec (`axes`); the census gives the wealth range and styles it is found in.
variations(oid, era) spreads a deterministic set of at least MIN_VARIANTS over those axes, as far apart as possible,
and every one is checked to look different from the others (test_variants.py)."""
import itertools
import random
import zlib
import math

from library.census import ERAS, WEALTH, STYLES, CENSUS
from library.core import spec

MIN_VARIANTS = 10
CONDITIONS = ("new", "worn", "broken")
ERA_AGE = {"dark-ages": "medieval", "long-night": "medieval", "renaissance": "early modern", "age-of-reason": "early modern",
           "victorian": "1800s", "great-war": "1900s", "mid-century": "1900s", "modern": "modern", "future-darkness": "Future Darkness"}
_ROW = {r.id: r for r in CENSUS}


def era_of(year):
    """The census era key for a year (the last era runs on to the end)."""
    for k, a, b, _ in ERAS:
        if a <= year <= b: return k
    return ERAS[-1][0] if year > ERAS[-1][2] else ERAS[0][0]


def era_span(key):
    for k, a, b, _ in ERAS:
        if k == key: return a, b
    raise KeyError(key)


def eras_for(oid):
    """The eras an object is found in: its Spec years cut by its census years."""
    sp = spec(oid); a, b = sp.eras
    row = _ROW.get(oid)
    if row:
        ya, _, yb = row.years.partition("-")
        a, b = max(a, int(ya) if ya else a), min(b, int(yb) if yb else b)
    return [k for k, ea, eb, _ in ERAS if ea <= b and eb >= a]


def wealth_range(oid):
    row = _ROW.get(oid)
    if not row: return list(WEALTH)
    lo, _, hi = row.wealth.partition("-"); return list(range(int(lo), int(hi or lo) + 1))


def styles_for(oid, era=None):
    """The style families that have their own look of it ("*" in the census: every family)."""
    row = _ROW.get(oid)
    st = list(STYLES) if (not row or row.styles == "*") else row.styles.split(",")
    return st


def axes(oid, era):
    """The axes of an object in an era: the Spec's own, with wealth and style from the census."""
    sp = spec(oid); ax = dict(getattr(sp, "axes", None) or {})
    ax.setdefault("wealth", wealth_range(oid))
    ax.setdefault("style", styles_for(oid, era))
    gf = getattr(sp, "global_from", None)
    if gf is not None and era_span(era)[0] >= gf: ax["style"] = [None]  # one look worldwide: no made-up regional ornament
    if not ax.get("condition"): ax["condition"] = list(CONDITIONS)
    return {k: list(v) for k, v in ax.items() if v and v != [None] or k == "style"}


BANDS = ((0, 1), (2, 3), (4, 5))                             # poor, middling, rich: each style is drawn at each band it is found at


def _spread(ax, n):
    """Option sets that cover every style at every wealth band the object is found at (so a place of any region and
    means finds its own), then the other axes cycled through them so each value is used about evenly; at least n.
    Deterministic: the same object and era always give the same list."""
    styles, wealth = ax.get("style", [None]), ax.get("wealth", [None])
    others = [k for k in sorted(ax) if k not in ("style", "wealth")]
    cells = []
    for st in styles:
        for lo, hi in BANDS:
            ws = [w for w in wealth if w is not None and lo <= w <= hi]
            if ws: cells.append((st, ws))
    if not cells: cells = [(st, [w for w in wealth]) for st in styles]
    # the object's own axes: every combination of their values, in a fixed shuffled order, so no two axes move in step
    free = [k for k in others if k != "condition"]
    combos = list(itertools.islice(itertools.product(*[range(len(ax[k])) for k in free]), 5000)) if free else []
    random.Random(zlib.crc32(repr([(k, len(ax[k])) for k in free]).encode())).shuffle(combos)
    out, seen, i = [], set(), 0
    while len(out) < max(n, len(cells)) and i < max(n, len(cells)) * 6:
        st, ws = cells[i % len(cells)]; r = i // len(cells)
        v = {}
        if st is not None: v["style"] = st
        if ws and ws[0] is not None: v["wealth"] = ws[r % len(ws)] if r else ws[len(ws) // 2]
        combo = combos[i % len(combos)] if combos else ()
        for j, k in enumerate(free):
            v[k] = ax[k][combo[j]]
        if "condition" in ax:
            L = len(ax["condition"]); v["condition"] = ax["condition"][0 if (i + r) % 4 else (1 + (i // 4) % (L - 1) if L > 1 else 0)]
        key = tuple(sorted((k, str(x)) for k, x in v.items()))
        if key not in seen: seen.add(key); out.append(v)
        i += 1
    return out


def label(v):
    """What a variation is, in words: "rich, Islamic, walnut, red, worn"."""
    bits = []
    if "wealth" in v: bits.append(WEALTH[v["wealth"]])
    if "style" in v: bits.append(STYLES[v["style"]][0])
    for k in ("material", "colour", "contents"):
        if k in v: bits.append(str(v[k]))
    if v.get("condition", "new") != "new": bits.append(v["condition"])
    return ", ".join(bits)


def variations(oid, era, n=None):
    """At least MIN_VARIANTS draw-option sets for an object in an era, each with its era and older age look set."""
    ax = axes(oid, era); n = max(MIN_VARIANTS, n or 0, getattr(spec(oid), "nvar", 0) or 0)
    out = []
    for k, v in enumerate(_spread(ax, n)):
        v = dict(v); v["era"] = era; v["age"] = ERA_AGE[era]; v["vid"] = f"{oid}.{era}.{k:02d}"; out.append(v)
    return out


def pick(oid, era, wealth=None, style=None, rng=None, condition=None):
    """One variation for a placement: those matching the place's wealth and style first, then the nearest wealth, then any."""
    vs = variations(oid, era)
    def score(v):
        s = 0
        if wealth is not None and "wealth" in v: s += abs(v["wealth"] - wealth) * 2
        if style is not None and "style" in v and v["style"] != style: s += 3
        if condition is not None and v.get("condition") != condition: s += 1
        return s
    best = min(score(v) for v in vs); pool = [v for v in vs if score(v) == best]
    return dict(pool[int(rng.integers(0, len(pool)))] if rng is not None else pool[0])


def style_of(region, year=None):
    """The style family a world region draws in, in a year (settlers' goods change the Americas and Oceania)."""
    from library.census import SETTLED
    for fam, (_, regs) in STYLES.items():
        if region in regs:
            for y0, other, which in SETTLED.get(fam, []):
                if year is not None and year >= y0 and region in which: return other
            return fam
    return "central"
