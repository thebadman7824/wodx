"""Tests for sort-downloads.py. Run from the repo root: python3 -m unittest tools/atmosphere/test_sort_downloads.py"""
import importlib.util, json, os, re, shutil, subprocess, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sorter", os.path.join(HERE, "sort-downloads.py"))
S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
RULES = os.path.join(HERE, "..", "..", "modules", "wodx-atmosphere", "scripts", "kits-rules.mjs")


def row(**k):
    base = {"file": "a.mp3", "kit": "victorian", "slot": "calm", "source": "kevin-macleod", "title": "Night Walk",
            "author": "", "license": "", "url": ""}
    base.update(k); return base


class Sorter(unittest.TestCase):
    def test_lists_match_atmosphere(self):
        js = open(RULES, encoding="utf-8").read()
        places = re.findall(r'"([a-z]+)"', re.search(r"PLACE_KINDS = \[(.*?)\]", js).group(1))
        weather = re.findall(r'"([a-z]+)"', re.search(r"WEATHER_LOOPS = \[(.*?)\]", js).group(1))
        kits = re.findall(r'^  "?([a-z-]+)"?: \{name:', js, re.M)
        self.assertEqual(places, S.PLACE_KINDS)
        self.assertEqual(weather, S.WEATHER_LOOPS)
        self.assertEqual(sorted(kits), sorted(S.KITS))

    def test_destinations(self):
        self.assertEqual(S.dest_for(row()), "victorian/music/calm/night-walk")
        self.assertEqual(S.dest_for(row(slot="Tavern")), "victorian/ambience/tavern-night-walk")
        self.assertEqual(S.dest_for(row(slot="rain")), "victorian/ambience/rain-night-walk")
        self.assertEqual(S.dest_for(row(slot="scene")), "victorian/scene/night-walk")
        with self.assertRaises(ValueError): S.dest_for(row(slot="party"))
        with self.assertRaises(ValueError): S.dest_for(row(kit="steampunk"))

    def test_credits(self):
        c = S.credit_for(row())
        self.assertEqual(c["license"], "CC BY 4.0")
        self.assertIn('"Night Walk" Kevin MacLeod (incompetech.com)', c["credit"])
        self.assertEqual(S.credit_for(row(source="musopen", author="Chopin"))["credit"],
                         '"Night Walk" (Chopin), Musopen (musopen.org), public domain')
        self.assertIn("Tabletop Audio", S.credit_for(row(source="tabletop-audio"))["credit"])

    def test_refusals(self):
        with self.assertRaises(ValueError): S.credit_for(row(source="epidemic-sound"))
        with self.assertRaises(ValueError): S.credit_for(row(source="freesound", author="x"))  # no licence
        with self.assertRaises(ValueError): S.credit_for(row(source="freesound", author="x", license="CC BY-NC-ND 4.0"))
        with self.assertRaises(ValueError): S.credit_for(row(source="fma", author="x", license="FMA-Limited"))
        with self.assertRaises(ValueError): S.credit_for(row(source="pixabay"))  # no author
        for lic in ["CC0", "CC0 1.0", "CC BY 3.0", "CC BY-NC 4.0"]:
            self.assertEqual(S.credit_for(row(source="freesound", author="x", license=lic))["license"], lic)

    def test_run_copies_and_merges_credits(self):
        with tempfile.TemporaryDirectory() as d:
            src, kits = os.path.join(d, "dl"), os.path.join(d, "kits")
            os.makedirs(src); os.makedirs(os.path.join(kits, "victorian"))
            for n in ["a.ogg", "b.ogg", "c.ogg"]: open(os.path.join(src, n), "wb").write(b"OggS")
            json.dump({"old.ogg": {"source": "x"}}, open(os.path.join(kits, "victorian", "credits.json"), "w"))
            plan = os.path.join(d, "plan.csv")
            with open(plan, "w", newline="") as f:
                f.write("file,kit,slot,source,title,author,license,url\n")
                f.write("a.ogg,victorian,calm,kevin-macleod,Night Walk,,,\n")
                f.write("b.ogg,victorian,tavern,tabletop-audio,The Inn,,,https://tabletopaudio.com/\n")
                f.write("c.ogg,victorian,tavern,tabletop-audio,Second Inn,,,\n")
                f.write("d.ogg,victorian,calm,epidemic-sound,Nope,,,\n")
            self.assertEqual(S.run(plan, src, kits), 1)  # one refused
            self.assertTrue(os.path.isfile(os.path.join(kits, "victorian/music/calm/night-walk.ogg")))
            self.assertTrue(os.path.isfile(os.path.join(kits, "victorian/ambience/tavern-the-inn.ogg")))
            cr = json.load(open(os.path.join(kits, "victorian", "credits.json")))
            self.assertIn("old.ogg", cr)
            self.assertEqual(cr["tavern-the-inn.ogg"]["url"], "https://tabletopaudio.com/")
            self.assertNotIn("nope.ogg", cr)

    def test_dry_run_writes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, "a.ogg"), "wb").write(b"OggS")
            plan = os.path.join(d, "plan.csv")
            open(plan, "w").write("file,kit,slot,source,title\na.ogg,modern,tension,soundimage,Dark Hall\n")
            self.assertEqual(S.run(plan, d, os.path.join(d, "kits"), dry=True), 0)
            self.assertFalse(os.path.exists(os.path.join(d, "kits")))

    @unittest.skipUnless(shutil.which("ffmpeg"), "no ffmpeg")
    def test_converts_to_ogg(self):
        with tempfile.TemporaryDirectory() as d:
            wav = os.path.join(d, "a.wav")
            subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "sine=d=1", wav], check=True)
            plan = os.path.join(d, "plan.csv")
            open(plan, "w").write("file,kit,slot,source,title\na.wav,future-darkness,combat,soundimage,Neon Run\n")
            self.assertEqual(S.run(plan, d, os.path.join(d, "kits")), 0)
            self.assertTrue(os.path.isfile(os.path.join(d, "kits/future-darkness/music/combat/neon-run.ogg")))


if __name__ == "__main__":
    unittest.main()
