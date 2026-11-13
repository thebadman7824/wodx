"""Tests for the furnishing work: catalogue, palettes, purposes, set pieces and filling rooms.
Run: cd tools/mapgen && python3 -m unittest test_furnishing -v"""
import random
import unittest

import catalogue as K

FA_SHELF = "w4GH4hnv/textures/objects/Decor/Furniture/Shelves/Bookshelves/Bookshelf_Wood_Ashen_A_2x1.webp"
TYGER_COUCH = "bsj2I8JP/textures/objects/ModernFurnature/Colorable/Couch01.png"
FA_BARREL = "w4GH4hnv/textures/objects/Decor/Storage/Barrels/Barrel_Wood_Ashen_A_1x1.webp"
import ddcore as _C
needs_pack_table = unittest.skipUnless(__import__("os").path.exists(_C.PACK_TABLE), "needs the pack table (names of packs other than FA)")


class CatalogueTest(unittest.TestCase):
    def test_fa_bookshelf(self):
        t = K.tag(FA_SHELF)
        self.assertEqual(t["piece"], "shelf")
        self.assertIn("medieval", t["bands"])
        self.assertNotIn("modern", t["bands"])
        self.assertEqual(t["cells"], (2, 1))

    @needs_pack_table
    def test_no_inventions_before_their_age(self):
        for p, first in [("WFWMFRDX/textures/objects/[WFW] Anniversary Megapack/[WFW] Fantasy/[WFW] Artificial/[WFW] Clutter/[WFW] Clutter - Misc/Field_Phone_Closed_01_A_Ashen.webp", "industrial"),
                         ("ae7QH77Z/textures/objects/TC_Town Hall Asset Pack_Grammophone.png", "industrial")]:
            t = K.tag(p)
            self.assertIsNotNone(t, p)
            self.assertNotIn("medieval", t["bands"], p)
            self.assertIn(first, t["bands"], p)

    @needs_pack_table
    def test_modern_couch(self):
        t = K.tag(TYGER_COUCH)
        self.assertEqual(t["piece"], "seat")
        self.assertIn("modern", t["bands"])
        self.assertNotIn("medieval", t["bands"])

    def test_unknown_is_none(self):
        self.assertIsNone(K.tag("zzzzzzzz/textures/objects/Whatever/Thingamajig_01.png"))

    def test_barrel_lasting(self):
        self.assertTrue(K.tag(FA_BARREL)["lasting"])

    def test_wood_finish_sets_style_and_eras(self):
        dark = K.tag(FA_SHELF.replace("Ashen", "Dark"))
        self.assertEqual(dark["style"], "fa-dark")
        self.assertIn("industrial", dark["bands"])
        self.assertNotIn("medieval", dark["bands"])

    def test_light_wood_is_not_a_light(self):
        self.assertEqual(K.tag(FA_SHELF.replace("Ashen", "Light"))["piece"], "shelf")
        self.assertEqual(K.tag("w4GH4hnv/textures/objects/Decor/Furniture/Cupboards_and_Wardrobes/Dresser_Wood_Light_A_2x1.webp")["piece"], "cupboard")

    def test_worth_words(self):
        plain = K.tag("w4GH4hnv/textures/objects/Decor/Furniture/Seating/Chair_Wood_Ashen_A_1x1.webp")["worth"]
        gold = K.tag("w4GH4hnv/textures/objects/Decor/Furniture/Seating/Throne_Gold_A_1x1.webp")["worth"]
        self.assertGreater(gold, plain)
        self.assertTrue(0 <= plain <= 5 and 0 <= gold <= 5)


def _e(name, piece, bands, worth=1, style="s", lasting=False, kind="objects", regions=None):
    return {"path": "x/textures/" + kind + "/" + name, "name": name, "pack": "x", "kind": kind, "piece": piece, "style": style,
            "bands": bands, "worth": worth, "lasting": lasting, "cells": (1, 1), "regions": regions}


def _small_catalogue():
    out = []
    for b, st in (("medieval", "fa-ashen"), ("industrial", "fa-dark"), ("modern", "tyger"), ("future", "scifi")):
        for w in range(6):
            for piece in ("table", "seat", "light", "shelf"):
                out.append(_e(f"{b}_{piece}_{w}.png", piece, [b], w, st))
        out.append(_e(f"{b}_wall.png", "wall", [b], 1, st, kind="walls"))
        out.append(_e(f"{b}_wood_floor.png", "floor", [b], 1, st, kind="patterns"))
    out.append(_e("medieval_stove.png", "stove", ["medieval"], 1, "fa-ashen"))
    out.append(_e("medieval_bed_3.png", "bed", ["medieval"], 3, "fa-ashen"))     # no noble (3-5) bed above 3
    out.append(_e("Barrel_1.png", "store", ["medieval"], 1, "fa", lasting=True))
    return out


class PaletteTest(unittest.TestCase):
    def setUp(self):
        import palettes as P
        self.P, self.cat = P, _small_catalogue()

    def test_one_palette_one_band(self):
        import random
        from settle import age_of
        for year in (1197, 1650, 1890, 1995, 2050):
            for wealth in ("poor", "middling", "rich", "noble"):
                pal = self.P.choose(year, "moravia", wealth, random.Random(year), self.cat)
                for piece in ("table", "seat", "light", "shelf", "store", "bed"):
                    for _ in range(5):
                        e = pal.pick(piece, random.Random(_))
                        if e: self.assertTrue(age_of(year) in e["bands"] or e["lasting"], (year, wealth, piece, e["name"]))

    def test_missing_piece_left_out(self):
        import random
        pal = self.P.choose(2050, "moravia", "rich", random.Random(1), self.cat)
        self.assertIsNone(pal.pick("stove", random.Random(1)))

    def test_lasting_crosses_eras(self):
        import random
        pal = self.P.choose(1890, "moravia", "middling", random.Random(1), self.cat + [_e("Barrel_2.png", "store", ["medieval"], 1, "fa", lasting=True)])
        self.assertIsNotNone(pal.pick("store", random.Random(1)))

    def test_lasting_never_goes_back(self):
        import random
        cat = self.cat + [_e("Crate_Modern.png", "store", ["modern"], 1, "tyger", lasting=True)]
        pal = self.P.choose(1197, "moravia", "middling", random.Random(1), cat)
        self.assertNotIn("Crate_Modern.png", [e["name"] for e in pal.sets.get("store", [])])

    def test_wealth_fallback(self):
        import random
        pal = self.P.choose(1197, "moravia", "noble", random.Random(1), self.cat)
        self.assertEqual(pal.pick("bed", random.Random(1))["name"], "medieval_bed_3.png")
        poor = self.P.choose(1197, "moravia", "poor", random.Random(1), self.cat)
        self.assertLessEqual(poor.pick("table", random.Random(1))["worth"], 1)

    def test_unknown_region_and_year(self):
        import random
        self.assertEqual(self.P.choose(1100, "atlantis", "rich", random.Random(1), self.cat).key, ("medieval", "moravia", "rich"))
        self.assertEqual(self.P.choose(2150, "moravia", "rich", random.Random(1), self.cat).key[0], "future")

    def test_lights_by_band(self):
        import random
        r = random.Random(1)
        self.assertIn(self.P.choose(1197, "moravia", "poor", r, self.cat).lights, ("rushlight", "candle"))
        self.assertEqual(self.P.choose(1890, "moravia", "rich", r, self.cat).lights, "gas")
        self.assertEqual(self.P.choose(1995, "moravia", "rich", r, self.cat).lights, "electric")

    def test_walls_and_floors_from_band(self):
        import random
        pal = self.P.choose(1995, "moravia", "middling", random.Random(1), self.cat)
        self.assertEqual(pal.wall.rsplit("/", 1)[-1], "modern_wall.png")
        self.assertEqual(pal.floor["living"].rsplit("/", 1)[-1], "modern_wood_floor.png")

    def test_same_seed_same_palette(self):
        import random
        a = self.P.choose(1650, "moravia", "rich", random.Random(9), self.cat)
        b = self.P.choose(1650, "moravia", "rich", random.Random(9), self.cat)
        self.assertEqual(a.sets, b.sets)


def _all_types():
    import buildings as B, eratypes, firstgroup, latertypes, cddatypes  # noqa: F401  (they register their types)
    return B


class PurposeTest(unittest.TestCase):
    def test_burgher_palace(self):
        import purposes as U
        B = _all_types()
        p = U.purpose_of("burgher-palace", "home")
        self.assertEqual({s["id"] for s in p["side"]}, {"show-wealth", "intimidate", "impress-clients"})
        roles = U.room_roles(B.place("bp", "burgher-palace", 0, 0, "S"))
        self.assertEqual(roles["Salon"], "front")
        self.assertEqual(roles["Dining hall"], "front")
        self.assertEqual(roles["Kitchen"], "service")
        self.assertEqual(roles["Bedchamber"], "private")
        self.assertEqual(roles["Servants' room"], "service")

    def test_roles_follow_facing(self):
        import purposes as U
        B = _all_types()
        for f in "NESW":
            self.assertEqual(U.room_roles(B.place("bp", "burgher-palace", 3, 4, f))["Salon"], "front", f)

    def test_every_type_has_purpose(self):
        import purposes as U
        B = _all_types()
        for k, t in B.TYPES.items():
            p = U.purpose_of(k, t.get("fill", "home"))
            self.assertTrue(p["main"], k)
            roles = U.room_roles(B.place("x", k, 0, 0, "S"))
            self.assertTrue(set(roles.values()) <= {"front", "work", "private", "service"}, k)

    def test_unknown_falls_back(self):
        import purposes as U
        p = U.purpose_of("no-such", "workshop")
        self.assertEqual(p["main"], "work")
        self.assertEqual(p["side"], [])

    def test_room_kinds(self):
        import purposes as U
        self.assertEqual(U.kind_of_name("Cellar store"), "store")
        self.assertEqual(U.kind_of_name("Counting room"), "study")
        self.assertEqual(U.kind_of_name("Nave"), "worship")
        self.assertEqual(U.kind_of_name("Taproom"), "tavern")
        self.assertEqual(U.kind_of_name("Holding cell"), "cell")
        self.assertEqual(U.kind_of_name("Bathroom 3"), "bath")


class SetPieceTest(unittest.TestCase):
    def test_writing_corner(self):
        import setpieces as SP
        got = {sp["id"]: sp for sp in SP.fitting("study", "work", None, "reform", [])}
        self.assertIn("writing-corner", got)
        parts = [(p[0], p[5]) for p in got["writing-corner"]["parts"]]
        self.assertIn(("desk", "base"), parts)
        self.assertIn(("seat", "face:base"), parts)
        self.assertIn(("light", "on:base"), parts)
        self.assertIn(("clutter", "on:base"), parts)

    def test_trade_pieces(self):
        import setpieces as SP
        self.assertEqual(SP.fitting("shop", "front", "cloth merchant", "early", [])[0]["id"], "cloth-display")
        self.assertEqual(SP.fitting("hall", "front", "vintner", "early", [])[0]["id"], "tasting-table")
        self.assertNotIn("cloth-display", [s["id"] for s in SP.fitting("shop", "front", "baker", "early", [])])

    def test_era_tied(self):
        import setpieces as SP
        self.assertIn("office-desk-computer", [s["id"] for s in SP.fitting("study", "work", None, "modern", [])])
        self.assertNotIn("office-desk-computer", [s["id"] for s in SP.fitting("study", "work", None, "reform", [])])

    def test_prefers_first(self):
        import setpieces as SP
        self.assertEqual(SP.fitting("hall", "front", None, "early", ["plate-display"])[0]["id"], "plate-display")

    def test_purposes_name_real_set_pieces(self):
        import purposes as U, setpieces as SP
        ids = {sp["id"] for sp in SP.SET_PIECES}
        for k, p in U.PURPOSES.items():
            for side in p["side"]:
                for want in side["prefers"]: self.assertIn(want, ids, (k, side["id"]))

    def test_parts_inside_size(self):
        import setpieces as SP
        self.assertGreaterEqual(len(SP.SET_PIECES), 40)
        for sp in SP.SET_PIECES:
            w, h = sp["size"]
            for piece, dx, dy, pw, ph, rule in sp["parts"]:
                if rule.startswith("on:"): continue
                self.assertTrue(0 <= dx and dx + pw <= w + 1e-9 and 0 <= dy and dy + ph <= h + 1e-9, (sp["id"], piece))


CAT_PATH = "/mnt/project-files/map-furnishing/catalogue.json"
_CAT = []

def _cat():
    import os, palettes as P
    if not _CAT and os.path.exists(CAT_PATH): _CAT.extend(P.load(CAT_PATH))
    return _CAT


def _furnished(type_key, year, wealth="rich", facing="S", seed=1, trade=None):
    import ddcore as C, furnishing as F
    B = _all_types()
    C.R.seed(seed)
    b = B.place("t", type_key, 0, 0, facing)
    ctx = F.context_for(b, year, "moravia", wealth, trade, _cat(), seed)
    for r in b.rooms: r.ctx = ctx[r.name]
    b.furnish()
    return b


@unittest.skipUnless(__import__("os").path.exists(CAT_PATH), "needs the catalogue")
class FillTest(unittest.TestCase):
    def test_court_with_four_doors_is_not_bare(self):
        b = _furnished("burgher-palace", 1890, "rich")
        court = next(r for r in b.rooms if r.name == "Court")
        self.assertGreaterEqual(len([i for i in court.dressing if i.get("piece") != "light"]), 2)

    def test_target_tiers(self):
        import furnishing as F
        T = F.TIERS.index
        front = T(F.target_tier("front", "rich", 2, False, "reform", "hall"))
        self.assertEqual(front - T(F.target_tier("private", "rich", 0, False, "reform", "hall")), 2)
        self.assertEqual(T(F.target_tier("service", "rich", 0, False, "reform", "kitchen")), T("fine") - 1)
        self.assertGreater(T(F.target_tier("front", "poor", 0, True, "reform", "hall")), T(F.target_tier("front", "poor", 0, False, "reform", "hall")))
        self.assertLess(T(F.target_tier("private", "poor", 0, True, "reform", "hall")), T(F.target_tier("private", "poor", 0, False, "reform", "hall")))

    def test_fill_reaches_target(self):
        import furnishing as F
        b = _furnished("burgher-palace", 1650)
        salon = next(r for r in b.rooms if r.name == "Salon")
        self.assertTrue(F.TIERS.index(salon.tier) >= F.TIERS.index(salon.target) or salon.full, (salon.tier, salon.target))
        self.assertGreaterEqual(len([d for d in salon.dressing if d["layer"] == 100]), 4)

    def test_doors_clear(self):
        B = _all_types()
        for k in sorted(B.TYPES):
            for facing in "SE":
                for seed in (1, 2):
                    b = _furnished(k, 1890, "middling", facing, seed)
                    for r in b.rooms:
                        for d in r.dressing:
                            if d["layer"] != 100: continue
                            for bx, by, bw, bh, why in r.blocked:
                                if why not in ("door clear zone", "walkway"): continue
                                hit = d["x"] < bx + bw - 1e-6 and bx < d["x"] + d["w"] - 1e-6 and d["y"] < by + bh - 1e-6 and by < d["y"] + d["h"] - 1e-6
                                self.assertFalse(hit, (k, facing, seed, r.name, d["asset"], why))

    def test_tiny_room(self):
        import ddcore as C, furnishing as F, palettes as P
        r = C.Room("Corridor", 0, 0, 1.4, 3, "wood", [])
        r.ctx = {"palette": P.choose(1890, "moravia", "rich", random.Random(1), _cat()), "role": "front", "wealth": "rich", "trade": None,
                 "band": "industrial", "lifts": 0, "show_off": False, "prefers": [], "open_floor": False}
        r.furnish()
        self.assertEqual([d for d in r.dressing if d["layer"] == 100], [])

    def test_open_floor_kept(self):
        b = _furnished("barn", 1650, "middling")
        for r in b.rooms:
            if not r.ctx["open_floor"]: continue
            ow, oh = r.w - 4.4, r.h - 4.4
            if ow <= .5 or oh <= .5: continue
            ox, oy = r.x + (r.w - ow) / 2, r.y + (r.h - oh) / 2
            for d in r.dressing:
                if d["layer"] != 100: continue
                self.assertFalse(d["x"] < ox + ow and ox < d["x"] + d["w"] and d["y"] < oy + oh and oy < d["y"] + d["h"], (r.name, d["asset"]))
            return
        self.fail("the barn has no open floor room")

    def test_era_contrast(self):
        lasting = {e["name"] for e in _cat() if e["lasting"]}
        names = lambda b: {d.get("draw", d["asset"]).rsplit("/", 1)[-1] for r in b.rooms for d in r.dressing + r.items if d.get("layer", 100) in (50, 100)} - lasting
        a, c = names(_furnished("burgher-palace", 1197)), names(_furnished("burgher-palace", 1890))
        self.assertEqual(a & c, set())

    def test_lights_follow_era(self):
        b = _furnished("burgher-palace", 1890)
        self.assertEqual(b.rooms[0].ctx["palette"].lights, "gas")
        self.assertEqual(_furnished("burgher-palace", 1995).rooms[0].ctx["palette"].lights, "electric")


if __name__ == "__main__":
    unittest.main()
