"""Draw a preview of a Dungeondraft map with the packs' own pictures, as near as can be to how Dungeondraft draws it:
terrain blend, floor patterns, paths and fences, objects by layer (real size, turn, mirror, drop shadow), walls with
their doors and windows, then light. Dungeondraft itself cannot be driven from outside, so this is how a generated
map is looked at by eye before it goes to the PC.

The pictures come from the slim packs, shrunk to a quarter (64 px a square) by extract_pack_pictures.py; they are
private and live outside the repo (default /mnt/project-files/map-furnishing/preview/pictures, or WODX_PACK_PICTURES).
A picture that is not there is drawn as a magenta box and listed, so nothing missing goes unseen.

Run: python3 render_preview.py MAP.dungeondraft_map OUT.png [--pictures DIR] [--px 64] [--no-grid]
"""
import argparse, json, math, os, re, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CELL = 256
PICTURES = os.environ.get("WODX_PACK_PICTURES", "/mnt/project-files/map-furnishing/preview/pictures")
MISSING = (255, 0, 255, 200)

def nums(s): return [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", s.split("(", 1)[1])] if "(" in s else []

def argb(s):
    """Dungeondraft colours are aarrggbb hex."""
    v = int(s, 16); return ((v >> 16) & 255, (v >> 8) & 255, v & 255, (v >> 24) & 255)


class Pictures:
    """Pack pictures by the path a map uses, scaled to the preview: k preview pixels for every world unit."""

    def __init__(self, root, k):
        self.root, self.k, self.cache, self.missing = root, k, {}, set()
        meta = os.path.join(root, "original-sizes.json")
        m = json.load(open(meta)) if os.path.exists(meta) else {"scale": 1, "sizes": {}}
        self.scale, self.sizes = m["scale"], m["sizes"]

    def get(self, texture, zoom=1.0):
        """The picture at its drawn size (zoom on top of the world size), or None when it is not in the copy."""
        rel = texture.replace("res://packs/", "")
        key = (rel, round(zoom, 3))
        if key in self.cache: return self.cache[key]
        im = None
        if not texture.startswith("res://textures/"):            # Dungeondraft's own defaults are not in the packs
            stem = os.path.join(self.root, *os.path.splitext(rel)[0].split("/"))
            for ext in (".webp", ".png", ".jpg"):
                if os.path.exists(stem + ext):
                    im = Image.open(stem + ext).convert("RGBA"); break
        if im is None:
            self.missing.add(rel); self.cache[key] = None; return None
        ow, oh = self.sizes.get(rel, (im.width / self.scale, im.height / self.scale))
        w, h = max(1, round(ow * self.k * zoom)), max(1, round(oh * self.k * zoom))
        if (w, h) != im.size: im = im.resize((w, h), Image.LANCZOS)
        self.cache[key] = im
        return im


def tiled(im, W, H):
    out = Image.new("RGBA", (W, H))
    for y in range(0, H, im.height):
        for x in range(0, W, im.width): out.paste(im, (x, y))
    return out


def strip(im, length, width):
    """A picture stretched to the given width across and repeated along the length, as paths and walls are drawn."""
    tw = max(1, round(im.width * width / im.height))
    piece = im.resize((tw, max(1, round(width))), Image.LANCZOS)
    out = Image.new("RGBA", (max(1, round(length)), piece.height))
    for x in range(0, out.width, tw): out.paste(piece, (x, 0))
    return out


def paste_turned(canvas, im, cx, cy, angle, shadow=False):
    """Paste im centred on (cx, cy), turned clockwise by angle (radians, y down as in Dungeondraft)."""
    r = im.rotate(-math.degrees(angle), resample=Image.BICUBIC, expand=True)
    x, y = round(cx - r.width / 2), round(cy - r.height / 2)
    if shadow:
        a = r.split()[3].point(lambda v: v * .45)
        sh = Image.new("RGBA", r.size, (0, 0, 0, 0)); sh.putalpha(a)
        sh = sh.filter(ImageFilter.GaussianBlur(max(1, r.width // 40 + 1)))
        off = max(2, round(canvas.info.get("px", 64) / 24))
        canvas.paste(sh, (x + off, y + off), sh)
    canvas.paste(r, (x, y), r)          # the canvas is opaque, so pasting through the picture's own alpha blends it


def missing_box(draw, cx, cy, w, h, angle):
    c, s = math.cos(angle), math.sin(angle)
    pts = [(cx + dx * c - dy * s, cy + dx * s + dy * c) for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    draw.polygon(pts, outline=MISSING, width=2)
    draw.line([pts[0], pts[2]], fill=MISSING, width=1)


def render(path, out, pictures=PICTURES, px=64, grid=True, sizes=None):
    doc = json.load(open(path))
    W, H = doc["world"]["width"], doc["world"]["height"]
    px = min(px, max(16, 6000 // max(W, H)))               # a big town is drawn smaller so it fits in memory
    k = px / CELL                                            # preview pixels for one world unit
    P = Pictures(pictures, k)
    if sizes: P.sizes = {**{p: (w * CELL, h * CELL) for p, (w, h) in sizes.items()}, **P.sizes}
    lv = doc["world"]["levels"]["0"]
    canvas = Image.new("RGBA", (W * px, H * px), (40, 38, 34, 255)); canvas.info["px"] = px
    draw = ImageDraw.Draw(canvas)
    counts = {"objects": 0, "patterns": 0, "walls": 0, "portals": 0, "paths": 0, "lights": 0}

    # terrain: four textures blended by the splat (4 x 4 weights a square)
    t = lv.get("terrain", {})
    spl = nums(t.get("splat", ""))
    if t.get("enabled") and len(spl) == W * H * 64:
        wts = np.array(spl, dtype=np.float32).reshape(H * 4, W * 4, 4) / 255
        big = np.stack([np.array(Image.fromarray((wts[..., i] * 255).astype(np.uint8)).resize((W * px, H * px), Image.BILINEAR), dtype=np.float32) / 255
                        for i in range(4)], -1)
        acc = np.zeros((H * px, W * px, 3), np.float32)
        for i in range(4):
            im = P.get(t.get(f"texture_{i + 1}", ""))
            tex = np.array(tiled(im, W * px, H * px), np.float32)[..., :3] if im else np.full((H * px, W * px, 3), (60, 70, 50), np.float32)
            acc += tex * big[..., i:i + 1]
        canvas.paste(Image.fromarray(acc.clip(0, 255).astype(np.uint8)).convert("RGBA"))

    def obj_draw(o):
        x, y = (v * k for v in nums(o["position"]))
        sc = nums(o.get("scale", "Vector2( 1, 1 )")) or [1]
        im = P.get(o["texture"], sc[0])
        if im is None:
            rel = o["texture"].replace("res://packs/", "")
            ow, oh = P.sizes.get(rel, (CELL, CELL))
            missing_box(draw, x, y, ow * k * sc[0], oh * k * sc[0], float(o.get("rotation", 0)))
            return
        if o.get("mirror"): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        paste_turned(canvas, im, x, y, float(o.get("rotation", 0)), shadow=o.get("shadow", False))
        counts["objects"] += 1

    def path_draw(pa):
        ox, oy = nums(pa["position"])
        rot = float(pa.get("rotation", 0)); c, s = math.cos(rot), math.sin(rot)
        p = nums(pa["edit_points"]); pts = [((ox + p[i] * c - p[i + 1] * s) * k, (oy + p[i] * s + p[i + 1] * c) * k) for i in range(0, len(p), 2)]
        if pa.get("loop"): pts.append(pts[0])
        im = P.get(pa["texture"])
        width = float(pa.get("width", 64)) * k
        for a, b in zip(pts, pts[1:]):
            L = math.dist(a, b)
            if L < 1: continue
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            if im is None: draw.line([a, b], fill=MISSING, width=max(1, round(width / 2))); continue
            paste_turned(canvas, strip(im, L + width * .1, width), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, ang)
        counts["paths"] += 1

    by_layer = lambda items, lo, hi: [i for i in items if lo <= int(i.get("layer", 100)) < hi]
    patterns, objects, paths = lv.get("patterns", []), lv.get("objects", []), lv.get("paths", [])

    # floors and anything below them, then the user layers; walls go over user layers, Above Walls over walls
    for layer in sorted({int(i.get("layer", 100)) for i in patterns + objects + paths if int(i.get("layer", 100)) < 700}):
        for pa in by_layer(patterns, layer, layer + 1):
            p = nums(pa["points"]); pts = [(p[i] * k, p[i + 1] * k) for i in range(0, len(p), 2)]
            im = P.get(pa["texture"])
            mask = Image.new("L", canvas.size, 0); ImageDraw.Draw(mask).polygon(pts, fill=255)
            if im is None:
                draw.polygon(pts, outline=MISSING, width=2)
            else:
                fill = tiled(im, *canvas.size)
                col = argb(pa.get("color", "ffffffff"))
                if col[:3] != (255, 255, 255):
                    fill = Image.fromarray((np.array(fill, np.float32) * np.array([*col[:3], 255], np.float32) / 255).astype(np.uint8))
                canvas.paste(fill, (0, 0), mask)
            counts["patterns"] += 1
        for pa in by_layer(paths, layer, layer + 1): path_draw(pa)
        for o in by_layer(objects, layer, layer + 1): obj_draw(o)

    for wl in lv.get("walls", []):
        p = nums(wl["points"]); pts = [(p[i] * k, p[i + 1] * k) for i in range(0, len(p), 2)]
        if wl.get("loop"): pts.append(pts[0])
        im = P.get(wl["texture"])
        portals = [(tuple(v * k for v in nums(po["position"])), float(po.get("radius", 128)) * k, po) for po in wl.get("portals", [])]
        thick = max(4, min(px * .32, (im.height if im else px * .25)))
        for a, b in zip(pts, pts[1:]):
            L = math.dist(a, b)
            if L < 1: continue
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            cuts = []
            for (qx, qy), r, _ in portals:
                along = (qx - a[0]) * ux + (qy - a[1]) * uy; off = abs((qx - a[0]) * -uy + (qy - a[1]) * ux)
                if -r <= along <= L + r and off < px * .2: cuts.append((along - r, along + r))
            runs, s0 = [], 0.0
            for c0, c1 in sorted(cuts):
                if c0 > s0: runs.append((s0, c0))
                s0 = max(s0, c1)
            if s0 < L: runs.append((s0, L))
            ang = math.atan2(uy, ux)
            for r0, r1 in runs:
                seg = r1 - r0 + thick * .5
                mx, my = a[0] + ux * (r0 + r1) / 2, a[1] + uy * (r0 + r1) / 2
                if im is None:
                    draw.line([(a[0] + ux * r0, a[1] + uy * r0), (a[0] + ux * r1, a[1] + uy * r1)], fill=MISSING, width=round(thick))
                else:
                    paste_turned(canvas, strip(im, seg, thick), mx, my, ang, shadow=wl.get("shadow", False))
        for (qx, qy), r, po in portals:
            pim = P.get(po["texture"])
            if pim is None: missing_box(draw, qx, qy, 2 * r, thick, float(po.get("rotation", 0)))
            else: paste_turned(canvas, pim, qx, qy, float(po.get("rotation", 0)))
            counts["portals"] += 1
        counts["walls"] += 1

    for pa in by_layer(paths, 700, 10 ** 6): path_draw(pa)
    for o in by_layer(objects, 700, 10 ** 6): obj_draw(o)

    # light: the ambient colour darkens everything, each light adds its colour back within its range
    amb = argb(lv.get("environment", {}).get("ambient_light", "ffffffff"))
    lights = lv.get("lights", [])
    counts["lights"] = len(lights)
    if amb[:3] != (255, 255, 255):
        lm = np.ones((H * px, W * px, 3), np.float32) * np.array(amb[:3], np.float32) / 255
        yy, xx = np.mgrid[0:H * px, 0:W * px].astype(np.float32)
        for li in lights:
            x, y = (v * k for v in nums(li["position"]))
            r = float(li.get("range", 2)) * px
            col = np.array(argb(li.get("color", "ffffffff"))[:3], np.float32) / 255
            x0, x1, y0, y1 = (max(0, int(x - r)), min(W * px, int(x + r) + 1), max(0, int(y - r)), min(H * px, int(y + r) + 1))
            if x0 >= x1 or y0 >= y1: continue
            d = np.hypot(xx[y0:y1, x0:x1] - x, yy[y0:y1, x0:x1] - y) / r
            fall = np.clip(1 - d, 0, 1) ** 1.5 * float(li.get("intensity", 1))
            lm[y0:y1, x0:x1] += fall[..., None] * col
        rgb = np.array(canvas, np.float32)[..., :3] * np.clip(lm, 0, 1.15)
        canvas = Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).convert("RGBA")

    if grid:
        g = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
        gc = argb(doc["world"].get("grid", {}).get("color", "7f000000"))
        col = (gc[0], gc[1], gc[2], max(20, gc[3] // 3))
        for i in range(W + 1): gd.line([(i * px, 0), (i * px, H * px)], fill=col)
        for j in range(H + 1): gd.line([(0, j * px), (W * px, j * px)], fill=col)
        canvas.alpha_composite(g)

    canvas.convert("RGB").save(out)
    return {"map": path, "out": out, "size": [W, H], "px": px, **counts, "missing": sorted(P.missing)}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("map"); ap.add_argument("out")
    ap.add_argument("--pictures", default=PICTURES); ap.add_argument("--px", type=int, default=64)
    ap.add_argument("--no-grid", action="store_true")
    a = ap.parse_args()
    if not os.path.isdir(a.pictures): sys.exit(f"no pack pictures at {a.pictures}")
    res = render(a.map, a.out, a.pictures, a.px, not a.no_grid)
    print(json.dumps({k: (v if k != "missing" else len(v)) for k, v in res.items()}))
    for m in res["missing"][:40]: print("missing picture:", m)


if __name__ == "__main__": main()
