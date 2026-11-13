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


if __name__ == "__main__":
    unittest.main()
