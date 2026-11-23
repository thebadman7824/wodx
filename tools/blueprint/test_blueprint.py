"""Tests for the blueprint tool: python3 tools/blueprint/test_blueprint.py (no network, no outside files)."""
import json, os, sys, tempfile, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blueprint as B

WALL = {"move": 20, "sight": 20, "light": 20, "sound": 20, "dir": 0, "door": 0, "ds": 0, "levels": []}


def scene():
    g = 70
    walls = [dict(WALL, c=[c * g for c in seg]) for seg in ([2, 2, 12, 2], [12, 2, 12, 8], [12, 8, 2, 8], [2, 8, 2, 2])]
    walls.append(dict(WALL, c=[6 * g, 8 * g, 7 * g, 8 * g], door=1))
    walls[2]["c"] = [12 * g, 8 * g, 7 * g, 8 * g]; walls.append(dict(WALL, c=[6 * g, 8 * g, 2 * g, 8 * g]))
    return {"name": "Test Cottage", "width": 20 * g, "height": 12 * g, "grid": {"size": g}, "levels": [], "walls": walls,
            "lights": [{"x": 7 * g, "y": 5 * g, "levels": [], "config": {"bright": 5, "dim": 20, "color": "#ff9a3c",
                                                                       "animation": {"type": "torch"}}}],
            "notes": [{"x": 7 * g, "y": 4 * g, "levels": [], "text": "Old Jan lives here (Jan's Cottage)."}],
            "tiles": [{"x": 7 * g, "y": 5 * g, "width": 11 * g, "height": 7 * g, "levels": [],
                       "texture": {"src": "maps/roofs/test--00.webp", "anchorX": 0.5, "anchorY": 0.5}}],
            "regions": [{"name": "The ovens", "levels": [], "shapes": [{"type": "rectangle", "x": 3 * g, "y": 3 * g, "width": 4 * g, "height": 2 * g}]},
                        {"name": "Exit: to-road → road", "levels": [], "shapes": [{"type": "rectangle", "x": 0, "y": 0, "width": g, "height": g}]}]}


class Blueprint(unittest.TestCase):
    def test_words(self):
        self.assertEqual(B.match("The scriptorium desks"), "desk")
        self.assertEqual(B.match("The locked press"), "cupboard")
        self.assertEqual(B.match("Ale cask (the inn)"), "cask")
        self.assertIsNone(B.match("The salon"))

    def test_slot_true_size(self):
        s = B.slot("bed-box", 5, 5)
        self.assertEqual(s["rect"][2:], [0.9, 1.4])
        s = B.slot("bed-box", 5, 5, facing="E")
        self.assertEqual(s["rect"][2:], [1.4, 0.9])

    def test_seed_scene(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "s.json"); json.dump(scene(), open(p, "w"))
            bp = B.seed_scene(p, "test", 1)
            self.assertEqual(bp["cells"], [20, 12])
            self.assertEqual(len(bp["doors"]), 1)
            self.assertEqual(bp["buildings"][0]["rect"], [1.5, 1.5, 11.0, 7.0])     # a tile's x, y is its centre
            self.assertEqual(bp["buildings"][0]["label"], "Jan's Cottage")
            self.assertEqual(bp["buildings"][0]["use"], "home")
            self.assertEqual(bp["exits"][0]["to"], "road")
            self.assertTrue(any(s["obj"] == "oven-bread" for s in bp["slots"]))
            self.assertTrue(any(s["obj"] == "hearth" and s["auto"] for s in bp["slots"]))
            self.assertEqual(B.check(bp), [])
            png = os.path.join(d, "s.png"); B.render(bp, png); self.assertTrue(os.path.getsize(png) > 1000)

    def test_check_catches(self):
        bp = B.blank("t", "T", (10, 10), 1, {})
        bp["walls"].append({"c": [0, 0, 5, 0], "kind": "solid"})
        s = B.slot("chest", 5, 5); s["rect"][2] = 3; bp["slots"].append(s)
        probs = B.check(bp)
        self.assertTrue(any("true size" in p for p in probs))
        self.assertTrue(any("no lights" in p for p in probs))

    def test_plans_pass(self):
        here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plans")
        for root, _, files in os.walk(here):
            for f in files:
                if f.endswith(".json"):
                    self.assertEqual(B.check(json.load(open(os.path.join(root, f)))), [], f)


if __name__ == "__main__":
    unittest.main()
