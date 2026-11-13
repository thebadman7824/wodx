"""Tests for the furnishing work: catalogue, palettes, purposes, set pieces and filling rooms.
Run: cd tools/mapgen && python3 -m unittest test_furnishing -v"""
import unittest

import catalogue as K

FA_SHELF = "w4GH4hnv/textures/objects/Decor/Furniture/Shelves/Bookshelves/Bookshelf_Wood_Ashen_A_2x1.webp"
TYGER_COUCH = "bsj2I8JP/textures/objects/ModernFurnature/Colorable/Couch01.png"
FA_BARREL = "w4GH4hnv/textures/objects/Decor/Storage/Barrels/Barrel_Wood_Ashen_A_1x1.webp"


class CatalogueTest(unittest.TestCase):
    def test_fa_bookshelf(self):
        t = K.tag(FA_SHELF)
        self.assertEqual(t["piece"], "shelf")
        self.assertIn("medieval", t["bands"])
        self.assertNotIn("modern", t["bands"])
        self.assertEqual(t["cells"], (2, 1))

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
        self.assertEqual(pal.wall, "modern_wall.png")
        self.assertEqual(pal.floor["living"], "modern_wood_floor.png")

    def test_same_seed_same_palette(self):
        import random
        a = self.P.choose(1650, "moravia", "rich", random.Random(9), self.cat)
        b = self.P.choose(1650, "moravia", "rich", random.Random(9), self.cat)
        self.assertEqual(a.sets, b.sets)


if __name__ == "__main__":
    unittest.main()
