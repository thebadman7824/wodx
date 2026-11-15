"""The object library's own tests (B6334-B6336): run with  python3 -m unittest library.test_library  from tools/pixelmap."""
import json, os, re, sys, unittest
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE)
import library as lib
from library.core import CATALOGUE
from library.measure import all_problems
from library.checks import run
from scene import Recorder

# maps drawn wholly from the library: no furniture drawn any other way (B6338); the map thread adds each map it moves
MIGRATED = ["maps/farmhouse.py"]
DIRECT = re.compile(r"\b(pr|props|tw|town|wl|wilds|dr|dress)\.(?!REC\b|OPEN\b)\w+\(|\bm\.(table|bench|stool|bed|chest|barrel|sack|shelf|rug|logs|oven|altar|font|tomb|grave|stalls|tree|fir|bush|rock|candle|column|pier)\(")


class Catalogue(unittest.TestCase):
    def test_every_family_module_loads(self):
        from library import catalogue
        self.assertEqual(catalogue.FAILED, {}, f"family modules that failed to load: {catalogue.FAILED}")

    def test_no_object_is_drawn_by_two_families(self):
        from library.core import CLASHES
        self.assertEqual(CLASHES, {}, f"objects defined by more than one family module: {CLASHES}")

    def test_every_object_is_described(self):
        for oid, sp in CATALOGUE.items():
            self.assertTrue(sp.ref, f"{oid} has no size reference"); self.assertTrue(sp.tags, f"{oid} has no rooms or trades")
            self.assertLessEqual(sp.eras[0], sp.eras[1]); sp.size()

    def test_drawings_fit_their_sizes(self):
        base = set(json.load(open(os.path.join(HERE, "library", "redraw-baseline.json"))))
        new = sorted(set(all_problems()) - base)
        self.assertEqual(new, [], f"drawn bigger or smaller than their true size: {new}")

    def test_wrong_size_or_year_is_refused(self):
        rec = Recorder("t", (6, 6)); rec.year = 1200
        with self.assertRaises(ValueError): lib.put(rec, "bed", 1, 1, w=9)
        with self.assertRaises(ValueError): lib.put(rec, "dresser", 1, 1)

    def test_migrated_maps_place_only_library_objects(self):
        for f in MIGRATED:
            for n, line in enumerate(open(os.path.join(HERE, f)), 1):
                code = line.split("#")[0]
                self.assertIsNone(DIRECT.search(code), f"{f}:{n} draws an object outside the library: {line.strip()}")


class Checks(unittest.TestCase):
    def room(self):
        rec = Recorder("t", (10, 8)); rec.year = 1200
        for w in ((2, 2, 8, 2), (2, 6, 8, 6), (2, 2, 2, 6), (8, 2, 8, 6)): rec.wall(*w, th=26, kind="wood")
        return rec

    def test_an_oven_facing_its_wall_fails(self):
        rec = self.room(); lib.put(rec, "oven", 2.2, 2.2, face="n")
        self.assertTrue(any(b.startswith("facing") for b in run(rec, bare=False)))

    def test_an_oven_facing_the_room_passes(self):
        rec = self.room(); lib.by_wall(rec, "oven", (2, 2, 8, 2), 3.2, (5, 4))
        self.assertEqual(run(rec, bare=False), [])

    def test_a_chest_in_the_wall_fails(self):
        rec = self.room(); lib.put(rec, "chest", 4, 1.85, face="s")
        self.assertTrue(any(b.startswith("wall") for b in run(rec, bare=False)))

    def test_a_bed_out_in_the_room_is_not_against_a_wall(self):
        rec = self.room(); lib.put(rec, "bed", 4, 3)
        self.assertTrue(any(b.startswith("against") for b in run(rec, bare=False)))

    def test_shutters_over_a_water_butt_fail(self):
        rec = self.room(); lib.window(rec, (2, 6, 8, 6), 5, toward=(5, 4)); lib.put(rec, "butt", 4.6, 6.16)
        self.assertTrue(any(b.startswith("shutter") or b.startswith("wall") for b in run(rec, bare=False)))

    def test_a_cask_in_a_doorway_fails(self):
        rec = self.room(); lib.door(rec, (2, 6, 8, 6), 5, toward=(5, 4)); lib.put(rec, "cask", 4.8, 5.3)
        self.assertTrue(any(b.startswith("door") for b in run(rec, bare=False)))

    def test_a_bare_room_fails(self):
        rec = self.room(); lib.put(rec, "stool", 4, 4)
        self.assertTrue(any(b.startswith("bare") for b in run(rec)))



class Sacred(unittest.TestCase):
    def test_qibla_and_jerusalem_walls(self):
        from library import sacred
        self.assertEqual(sacred.toward("mecca", "india"), "w")          # Delhi prays west
        self.assertEqual(sacred.toward("mecca", "british-isles"), "e")  # London prays south-east, nearer east
        self.assertEqual(sacred.toward("jerusalem", "moravia"), "e")
        self.assertEqual(sacred.wall_for("altar", "japan"), "e")

    def test_an_altar_is_set_at_the_east_end(self):
        import numpy as np
        from library.placing import furnish
        for seed in range(4):
            rec = Recorder("t", (10, 8)); rec.year = 1400
            for w in ((1, 1, 9, 1), (1, 7, 9, 7), (1, 1, 1, 7), (9, 1, 9, 7)): rec.wall(*w, th=26, kind="stone")
            got = furnish(rec, (1, 1, 9, 7), "church", "chancel", 3, "moravia", rng=np.random.default_rng(seed))
            alt = [p for p in rec.placed if p.spec.id == "altar"]
            self.assertTrue(alt, f"seed {seed}: no altar in {got}")
            self.assertGreater(alt[0].x, 6.5, "the altar stands at the east end"); self.assertEqual(alt[0].face, "w")


if __name__ == "__main__": unittest.main()
