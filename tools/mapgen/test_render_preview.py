"""The preview renderer draws a map with stand-in pack pictures: floor inside, wall on the edge, the door gap, a piece
at its place and size, and a picture that is not there drawn as a magenta box and listed."""
import json, os, tempfile, unittest

try:
    from PIL import Image
    import render_preview as R
except ImportError:                       # needs Pillow and numpy
    R = None

def pool(kind, vals): return f"{kind}( {', '.join(str(v) for v in vals)} )"

@unittest.skipIf(R is None, "needs Pillow and numpy")
class RenderPreview(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        pics = os.path.join(self.dir, "pics")
        def pic(rel, size, colour):
            dest = os.path.join(pics, *os.path.splitext(rel)[0].split("/")) + ".webp"
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            Image.new("RGBA", (size[0] // 4, size[1] // 4), colour).save(dest)
            return rel
        sizes = {pic("P/textures/terrain/Grass.png", (256, 256), (0, 200, 0, 255)): (256, 256),
                 pic("P/textures/tilesets/Wood.png", (256, 256), (150, 90, 30, 255)): (256, 256),
                 pic("P/textures/walls/Wall.png", (256, 64), (90, 90, 90, 255)): (256, 64),
                 pic("P/textures/objects/Table_2x1.png", (512, 256), (0, 0, 200, 255)): (512, 256)}
        json.dump({"scale": .25, "sizes": sizes}, open(os.path.join(pics, "original-sizes.json"), "w"))
        W, H = 10, 8
        lvl = {"terrain": {"enabled": True, "texture_1": "res://packs/P/textures/terrain/Grass.png", "texture_2": "", "texture_3": "", "texture_4": "",
                           "splat": pool("PoolByteArray", [255, 0, 0, 0] * (W * H * 16))},
               "patterns": [{"points": pool("PoolVector2Array", [512, 512, 2048, 512, 2048, 1536, 512, 1536]), "layer": 100,
                             "color": "ffffffff", "texture": "res://packs/P/textures/tilesets/Wood.png"}],
               "walls": [{"points": pool("PoolVector2Array", [512, 512, 2048, 512, 2048, 1536, 512, 1536]), "loop": True,
                          "texture": "res://packs/P/textures/walls/Wall.png",
                          "portals": [{"position": "Vector2( 1280, 1536 )", "rotation": 0, "radius": 128, "texture": "res://packs/P/textures/portals/Door.png"}]}],
               "objects": [{"position": "Vector2( 1280, 1024 )", "rotation": 0, "scale": "Vector2( 1, 1 )", "texture": "res://packs/P/textures/objects/Table_2x1.png", "layer": 100},
                           {"position": "Vector2( 1792, 768 )", "rotation": 0, "scale": "Vector2( 1, 1 )", "texture": "res://packs/P/textures/objects/Gone.png", "layer": 100}],
               "paths": [], "lights": [], "environment": {"ambient_light": "ffffffff"}}
        self.map = os.path.join(self.dir, "t.dungeondraft_map")
        json.dump({"world": {"width": W, "height": H, "grid": {"color": "00000000"}, "levels": {"0": lvl}}}, open(self.map, "w"))
        self.res = R.render(self.map, os.path.join(self.dir, "t.png"), pics, px=64, grid=False)
        self.im = Image.open(os.path.join(self.dir, "t.png")).convert("RGB")

    def px(self, x, y):
        """The colour there, rounded to tens (WebP is lossy)."""
        return tuple(round(v / 10) * 10 for v in self.im.getpixel((round(x * 64), round(y * 64))))

    def test_layers(self):
        self.assertEqual(self.px(.5, .5), (0, 200, 0))                  # grass outside
        self.assertEqual(self.px(2.5, 4.5), (150, 90, 30))               # wooden floor inside
        self.assertEqual(self.px(5, 4), (0, 0, 200))                     # the table at its place
        self.assertEqual(self.px(5.9, 4), (0, 0, 200))                   # two squares wide
        self.assertNotEqual(self.px(6.2, 4), (0, 0, 200))
        self.assertEqual(self.px(3, 2), (90, 90, 90))                    # wall on the edge
        self.assertNotEqual(self.px(5, 6), (90, 90, 90))                 # the door's gap

    def test_missing_listed(self):
        self.assertIn("P/textures/objects/Gone.png", self.res["missing"])
        self.assertIn("P/textures/portals/Door.png", self.res["missing"])
        self.assertEqual(self.res["objects"], 1)

if __name__ == "__main__": unittest.main()
