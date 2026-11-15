"""WoDX pixel map drawer (B5730): the pixel toolkit. Maps are drawn by code in our own pixel art, 94 art pixels to a
5 ft square at one screen pixel each (the grain of the character sprites), in the World of Darkness palette, lit from
the north-west and painted in daylight colours for Foundry's clock to darken (rule 9). No pack pictures.
Callers think in pixels of the full-size picture (T = 94 to a square). PIXELMAP_COARSE=1 draws the older 47 px look
(each art pixel 2 x 2); PIXELMAP_BRIGHT=1 the plain palette. Drawing rules: RULES.md beside this file."""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

T = 94
Q = 2 if os.environ.get("PIXELMAP_COARSE") else 1      # screen pixels to an art pixel: 1 = the sprites' grain, 2 = the 47 px look
OUT = (28, 22, 30)
R = {  # ramps, dark to light, hue leaning cool in shadow and warm in light
    "grass": [(38, 70, 52), (52, 92, 52), (70, 112, 54), (92, 132, 58), (124, 152, 66)],
    "dirt": [(84, 62, 52), (108, 82, 58), (130, 102, 68), (150, 122, 82), (170, 144, 100)],
    "water": [(30, 52, 96), (38, 74, 120), (52, 98, 140), (84, 136, 164), (168, 208, 214)],
    "wood": [(60, 40, 40), (88, 60, 44), (114, 82, 52), (140, 104, 62), (168, 132, 80)],
    "dwood": [(42, 30, 34), (62, 44, 40), (82, 58, 44), (104, 76, 52), (128, 98, 66)],
    "stone": [(62, 62, 78), (88, 88, 100), (112, 112, 120), (138, 136, 138), (166, 162, 156)],
    "pale": [(120, 112, 110), (150, 142, 132), (176, 168, 152), (198, 190, 170), (220, 214, 194)],
    "clay": [(96, 60, 50), (128, 82, 58), (156, 106, 70), (180, 132, 88), (204, 160, 112)],
    "leaf": [(26, 52, 48), (36, 74, 50), (52, 98, 52), (78, 124, 54), (112, 148, 62)],
    "fir": [(20, 44, 50), (28, 62, 58), (40, 82, 64), (58, 104, 70), (84, 126, 80)],
    "linen": [(128, 120, 122), (164, 156, 150), (196, 190, 178), (222, 218, 204), (240, 238, 228)],
    "red": [(78, 26, 40), (116, 34, 42), (152, 46, 44), (184, 70, 50), (210, 104, 66)],
    "blue": [(32, 40, 88), (44, 60, 124), (58, 86, 156), (86, 122, 184), (130, 164, 210)],
    "gold": [(110, 74, 34), (150, 106, 38), (188, 142, 46), (220, 180, 64), (244, 220, 120)],
    "iron": [(34, 34, 44), (52, 52, 62), (74, 74, 84), (100, 100, 108), (136, 136, 140)],
    "straw": [(120, 96, 50), (150, 124, 60), (178, 152, 74), (202, 178, 94), (224, 204, 124)],
    "green": [(30, 60, 48), (44, 86, 56), (62, 112, 62), (90, 138, 70), (128, 164, 86)],
}

WOD = not os.environ.get("PIXELMAP_BRIGHT")
if WOD:   # the World of Darkness palette: cold stone, bone, oxblood, tarnish, sick greens; darks pushed toward violet-black
    OUT = (12, 9, 16)
    R.update({
        "grass": [(18, 26, 30), (28, 38, 36), (40, 50, 40), (54, 62, 44), (76, 80, 54)],
        "dirt": [(34, 28, 34), (52, 42, 42), (70, 58, 52), (90, 76, 62), (112, 98, 78)],
        "water": [(10, 16, 34), (16, 28, 50), (26, 44, 66), (48, 74, 92), (110, 140, 150)],
        "wood": [(26, 18, 24), (46, 30, 30), (66, 44, 36), (88, 62, 44), (112, 84, 56)],
        "dwood": [(18, 13, 20), (32, 22, 26), (46, 32, 30), (62, 44, 36), (82, 60, 46)],
        "stone": [(26, 26, 40), (44, 44, 60), (64, 64, 80), (88, 88, 100), (116, 116, 124)],
        "pale": [(58, 54, 64), (86, 80, 86), (114, 108, 106), (142, 136, 126), (172, 166, 150)],
        "leaf": [(12, 20, 26), (18, 30, 30), (26, 42, 34), (40, 56, 40), (58, 72, 46)],
        "fir": [(8, 16, 24), (12, 26, 30), (18, 36, 36), (28, 48, 42), (44, 62, 50)],
        "green": [(16, 26, 28), (24, 38, 32), (36, 52, 38), (52, 66, 44), (74, 84, 54)],
        "linen": [(74, 70, 80), (108, 102, 104), (140, 134, 128), (170, 164, 150), (198, 192, 174)],
        "red": [(30, 8, 18), (58, 12, 22), (88, 18, 26), (120, 28, 30), (156, 48, 40)],
        "blue": [(14, 18, 44), (22, 32, 70), (32, 50, 96), (52, 78, 124), (92, 120, 156)],
        "gold": [(52, 38, 26), (84, 62, 30), (118, 90, 36), (152, 122, 50), (190, 164, 84)],
        "iron": [(14, 14, 22), (26, 26, 36), (42, 42, 52), (62, 62, 72), (90, 90, 98)],
        "straw": [(60, 50, 34), (84, 70, 42), (108, 92, 54), (132, 116, 70), (158, 142, 92)],
        "clay": [(48, 30, 32), (72, 44, 38), (96, 60, 46), (120, 80, 58), (146, 104, 76)],
        "lime": [(92, 90, 96), (130, 128, 128), (164, 162, 154), (192, 190, 176), (214, 212, 196)],
    })

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - .47


class Half:
    """A drawing pen that halves every coordinate, so shapes are rasterised at the small size."""
    def __init__(s, d): s.d = d
    def c(s, xy):
        xy = list(xy)
        if xy and isinstance(xy[0], (tuple, list)): return [(math.floor(x / Q), math.floor(y / Q)) for x, y in xy]
        return [math.floor(v / Q) for v in xy]
    def w(s, kw):
        if "width" in kw: kw["width"] = max(1, round(kw["width"] / Q))
        return kw
    def rectangle(s, xy, **kw):
        x0, y0, x1, y1 = s.c(xy); s.d.rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], **s.w(kw))
    def ellipse(s, xy, **kw):
        x0, y0, x1, y1 = s.c(xy); s.d.ellipse([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], **s.w(kw))
    def line(s, xy, **kw): s.d.line(s.c(xy), **s.w(kw))
    def point(s, xy, **kw): s.d.point(tuple(s.c(xy)), **kw)
    def polygon(s, xy, **kw): s.d.polygon(s.c(xy), **s.w(kw))
    def arc(s, xy, a0, a1, **kw):
        x0, y0, x1, y1 = s.c(xy)
        if x1 > x0 and y1 > y0: s.d.arc([x0, y0, x1, y1], a0, a1, **s.w(kw))
    def pieslice(s, xy, a0, a1, **kw): s.d.pieslice(s.c(xy), a0, a1, **s.w(kw))
    def rounded_rectangle(s, xy, r=0, **kw):
        x0, y0, x1, y1 = s.c(xy); x0, x1 = min(x0, x1), max(x0, x1); y0, y1 = min(y0, y1), max(y0, y1)
        r = max(0, min(round(r / Q), (x1 - x0) // 2, (y1 - y0) // 2)); s.d.rounded_rectangle([x0, y0, x1, y1], r, **s.w(kw))


class Map:
    def __init__(s, w, h, seed=1197):
        s.w, s.h, s.W, s.H = w, h, w * T, h * T
        s.img = Image.new("RGB", (s.W // Q, s.H // Q), R["grass"][2]); s.d = Half(ImageDraw.Draw(s.img))
        s.rng = np.random.default_rng(seed); s.lights, s.glass = [], []

    # ---------- fields and textures (numpy) ----------
    def grid(s):
        """Row and column of every art pixel, counted in 94ths like everything else."""
        yy, xx = np.mgrid[0:s.H // Q, 0:s.W // Q]; return yy * Q, xx * Q

    def noise(s, h, w, cell, px=1):
        """Noise 0..1 on the art-pixel grid: a random grid, smoothed. Sizes come in 94ths."""
        h, w, cell = h // Q, w // Q, max(1, cell // Q)
        hh, ww = h // px + 2, w // px + 2; c = max(1, cell // px)
        g = s.rng.random((hh // c + 3, ww // c + 3))
        n = np.array(Image.fromarray((g * 255).astype(np.uint8)).resize((ww, hh), Image.BILINEAR), np.float32) / 255
        n = np.clip((n - .5) * 2.0 + .5, 0, 1)
        return np.repeat(np.repeat(n, px, 0), px, 1)[:h, :w]

    def ramp(s, lv, name, lo=0, hi=None, dither=.7):
        """Levels 0..1 to a colour ramp; where two bands meet they are woven with an ordered dither."""
        p = np.array(R[name][lo:hi], np.uint8)
        if dither and lv.ndim == 2:
            h, w = lv.shape; lv = lv + np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] * dither / len(p)
        return p[np.clip((lv * len(p)).astype(int), 0, len(p) - 1)]

    def speck(s, a, n, cols, shape=((0, 0),)):
        """Stamp n small pixel shapes at random spots of array a (h, w, 3)."""
        h, w = a.shape[:2]
        ys, xs = s.rng.integers(3, h - 4, n), s.rng.integers(3, w - 4, n); k = s.rng.integers(0, len(cols), n)
        cols = np.array(cols, np.uint8)
        for dy, dx in shape: a[ys + dy, xs + dx] = cols[k]
        return ys, xs

    def grass(s, h, w):
        lv = .55 * s.noise(h, w, 70) + .3 * s.noise(h, w, 18) + .15 * s.noise(h, w, 4)
        a = s.ramp(np.clip((lv - .22) * 1.5, 0, .999), "grass", 1, 4)
        g = R["grass"]
        n = a.shape[0] * a.shape[1]
        if Q == 1:
            busy = s.noise(h, w, 46) > .5                                           # busy patches and quiet ones
            H_, W_ = a.shape[:2]; rng = s.rng; G = np.array(g, np.uint8)
            ys, xs = rng.integers(4, H_ - 4, n // 60), rng.integers(4, W_ - 4, n // 60)
            keep = busy[ys, xs] | (rng.random(len(ys)) < .18); ys, xs = ys[keep], xs[keep]
            for y, x in zip(ys, xs):                                                # a tuft: three blades and the shade under them
                c = a[y, x]; k = int(np.argmin(np.abs(G.astype(int) - c.astype(int)).sum(1)))
                hi_, lo_ = G[min(4, k + 1)], G[max(0, k - 1)]
                a[y, x] = hi_; a[y - 1, x - 1] = hi_; a[y - 2, x - 1] = hi_; a[y - 1, x + 1] = hi_; a[y + 1, x] = lo_; a[y + 1, x + 1] = lo_
            for _ in range(n // 9000):                                              # flowers in small drifts, not scattered singly
                y0, x0 = int(rng.integers(8, H_ - 8)), int(rng.integers(8, W_ - 8)); col = [(190, 184, 150), (176, 146, 66), (150, 112, 150)][int(rng.integers(0, 3))]
                for _ in range(int(rng.integers(2, 6))):
                    y, x = y0 + int(rng.integers(-6, 7)), x0 + int(rng.integers(-6, 7)); a[y, x] = col; a[y, x + 1] = col; a[y + 1, x] = g[0]
            return a
        s.speck(a, n // 150, [g[4], g[3]], ((0, 0), (-1, 1), (-2, 0), (-1, -1)))            # tufts
        s.speck(a, n // 170, [g[0], g[1]], ((0, 0), (0, 1)))                                 # shade under them
        s.speck(a, n // 2600, [(232, 226, 190), (226, 190, 80), (196, 150, 190)], ((0, 0), (0, 1), (-1, 0), (1, 0), (0, -1)))  # flowers
        return a

    def dirt(s, h, w):
        lv = .6 * s.noise(h, w, 50) + .4 * s.noise(h, w, 8)
        a = s.ramp(np.clip((lv - .2) * 1.5, 0, .999), "dirt", 1, 4)
        dd = R["dirt"]
        h, w = a.shape[:2]
        ys, xs = s.speck(a, h * w // 260, [dd[4], R["stone"][3]], ((0, 0), (0, 1)))                 # pebbles
        a[np.clip(ys + 1, 0, h - 1), xs] = dd[0]; a[np.clip(ys + 1, 0, h - 1), np.clip(xs + 1, 0, w - 1)] = dd[0]
        return a

    def blocks(s, h, w, bw, bh, name, stagger=None, lo=1, hi=4, joint=None, bevel=True, jitter=0, dither=.7):
        """Courses of blocks (planks, flags, cobbles, ashlar): per-block shade, dark joints, lit top-left edges."""
        h, w, bw, bh = max(1, h // Q), max(1, w // Q), max(2, bw // Q), max(2, bh // Q)
        if Q == 1: dither = 0
        stagger = bw // 2 if stagger is None else stagger // Q
        yy, xx = np.mgrid[0:h, 0:w]
        row = yy // bh
        off = (s.rng.integers(0, bw, h // bh + 2) if jitter else (np.arange(h // bh + 2) % 2) * stagger)[row]
        col = (xx + off) // bw
        tab = s.rng.random((h // bh + 2, w // bw + 3))
        a = s.ramp(tab[row, col] * .999, name, lo, hi, dither=dither)
        jx, jy = (xx + off) % bw, yy % bh
        if bevel:
            if bh > 4 and bw > 4:
                top = (jy == 1) & (jx > 0); a[top] = np.minimum(a[top].astype(int) + 16, 255).astype(np.uint8)
                m = ((jx == bw - 1) | (jy == bh - 1)) & (jx > 0) & (jy > 0); a[m] = (a[m] * .84).astype(np.uint8)
        if Q == 1 and bw > 8 and bh > 5 and h * w > 300:                            # wear: small two-pixel marks, kept off the joints
            n = h * w // 70; ys, xs = s.rng.integers(0, h, n), s.rng.integers(0, w - 2, n); k = s.rng.integers(0, 2, n) * 16 - 9
            ok = (jy[ys, xs] > 1) & (jy[ys, xs] < bh - 1) & (jx[ys, xs] > 1) & (jx[ys, xs] < bw - 3)
            for dx in (0, 1): a[ys[ok], xs[ok] + dx] = np.clip(a[ys[ok], xs[ok] + dx].astype(np.int16) + k[ok, None], 0, 255).astype(np.uint8)
        a[(jx == 0) | (jy == 0)] = joint or R[name][0]
        return a

    def planks(s, h, w, name="wood", bh=16, vertical=False):
        if vertical: return np.transpose(s.planks(w, h, name, bh), (1, 0, 2))
        if Q == 1: return s.fineplanks(h, w, name, bh)
        a = s.blocks(h, w, 150, bh, name, jitter=1, lo=1, hi=4)
        n = a.shape[0] * a.shape[1]
        if n > 400:
            s.speck(a, n // 160, [R[name][1]], ((0, 0), (0, 1), (0, 2)))                           # grain
            s.speck(a, n // 1500, [R[name][0]], ((0, 0), (0, 1)))                                  # knots
        return a

    def fineplanks(s, h, w, name, bh):
        """Boards at the fine grain: three close tones a board (no dither, which reads as noise), grain drawn as short
        strokes one tone down that run with the board, a worn lighter streak, a knot here and there, nails at the ends."""
        a = s.blocks(h, w, 170, bh, name, jitter=1, lo=1, hi=4, dither=0)
        P = np.array(R[name], np.int16); rng = s.rng; H, W = a.shape[:2]
        tone = lambda c, k: np.clip(c.astype(np.int16) + k, 0, 255).astype(np.uint8)
        for y0 in range(0, H, bh):
            for _ in range(W // 9):                                                # grain strokes
                x, y, L = int(rng.integers(1, W - 14)), y0 + int(rng.integers(3, max(4, bh - 2))), int(rng.integers(4, 13))
                if y >= H - 1: continue
                seg = a[y, x:x + L]
                if (seg == seg[0]).all(): a[y, x:x + L] = tone(seg, -9); 
                if rng.random() < .3 and y + 1 < H and (a[y + 1, x + 2:x + L - 2] == seg[0]).all(): a[y + 1, x + 2:x + L - 2] = tone(a[y + 1, x + 2:x + L - 2], 7)
            for _ in range(max(1, W // 150)):                                      # knots: a dark eye with a ring round it
                x, y = int(rng.integers(4, W - 6)), y0 + int(rng.integers(4, max(5, bh - 4)))
                if y + 2 >= H: continue
                a[y - 1:y + 2, x - 2:x + 3] = tone(a[y - 1:y + 2, x - 2:x + 3], -10); a[y, x - 1:x + 2] = P[0]
        jx = (a == np.array(R[name][0], np.uint8)).all(2)                          # joints: put a nail each side of an end joint
        ends = jx & np.roll(jx, 1, 0) & np.roll(jx, -1, 0)
        ys, xs = np.nonzero(ends[:, 3:-3]); xs = xs + 3
        for y, x in zip(ys, xs):
            if y % bh == bh // 2: a[y, x - 2] = R["iron"][1]; a[y, x + 2] = R["iron"][1]; a[y - 1, x - 2] = tone(a[y - 1, x - 2], 14)
        return a

    def glow(s, cx, cy, r, col=(1.5, 1.02, .5), power=1.0, cone=None):
        """Warm light thrown on whatever is already drawn: stepped rings, woven where they meet. cone = (angle, half-width)."""
        cx, cy, r = cx / Q, cy / Q, r / Q; W, H = s.img.size
        x0, y0, x1, y1 = max(0, int(cx - r)), max(0, int(cy - r)), min(W, int(cx + r) + 1), min(H, int(cy + r) + 1)
        if x1 <= x0 or y1 <= y0: return
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        f = np.clip(1 - np.hypot(xx - cx, yy - cy) / r, 0, 1) ** 1.25
        if cone:
            an = np.abs((np.arctan2(yy - cy, xx - cx) - cone[0] + math.pi) % (2 * math.pi) - math.pi); f = f * np.clip(1.25 - an / cone[1], 0, 1)
        dth = np.tile(BAYER, ((y1 - y0) // 4 + 1, (x1 - x0) // 4 + 1))[:y1 - y0, :x1 - x0]
        f = np.clip(np.floor(f * 5 + dth * .8 + .5) / 5, 0, 1)[..., None] * power
        a = np.array(s.img.crop((x0, y0, x1, y1)), np.float32)
        a = a * (1 + f * (np.array(col, np.float32) - 1)) + f * np.array([26, 9, 0], np.float32)
        s.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (x0, y0))

    def dome(s, cx, cy, r, name="clay"):
        """A rounded clay dome from above: tones step down from a lit spot north-west, band edges broken into clumps,
        hairline cracks, and a rim shadow south-east."""
        P = np.array(R[name], np.uint8); r = int(r); rng = s.rng
        yy, xx = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
        inside = np.hypot(xx, yy) <= r
        lv = 1 - np.hypot(xx + r * .3, yy + r * .3) / (r * 1.32)
        n = np.array(Image.fromarray((rng.random((r // 3 + 2, r // 3 + 2)) * 255).astype(np.uint8)).resize((2 * r + 1, 2 * r + 1), Image.BILINEAR), np.float32) / 255
        lv = np.clip(lv + (n - .5) * .07, 0, .999)                                  # clumps break the bands
        a = P[1 + np.clip((lv * 4).astype(int), 0, 3)]
        rim = (np.hypot(xx, yy) > r - 3) & (xx + yy > 0); a[rim] = P[0]
        m = Image.fromarray((inside * 255).astype(np.uint8))
        s.d.ellipse([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], fill=OUT)
        s.img.paste(Image.fromarray(a), (cx - r, cy - r), m)
        for _ in range(5):                                                          # cracks
            a0 = rng.uniform(0, 2 * math.pi); q = rng.uniform(.25, .8) * r; x, y = cx + math.cos(a0) * q, cy + math.sin(a0) * q
            for _ in range(int(rng.integers(5, 12))):
                nx, ny = x + rng.integers(-1, 3), y + rng.integers(0, 3)
                if math.hypot(nx - cx, ny - cy) < r - 3: s.d.line([x, y, nx, ny], fill=tuple(P[0])); x, y = nx, ny

    def fire(s, cx, cy, w, h, seed=3):
        """A bed of fire seen from above: charred logs, a bed of embers in broken clusters, tongues of flame with a
        hot core. Colours climb dark red, red, orange, yellow, near white; no outline, the fire is its own light."""
        rng = np.random.default_rng(seed); d = s.d
        F = [(58, 12, 14), (124, 26, 18), (196, 62, 20), (238, 124, 30), (252, 190, 66), (255, 236, 164)]
        d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=(16, 10, 12))
        for k in range(3):                                                         # charred logs laid across
            a = -.5 + k * .55 + rng.uniform(-.1, .1); L = w * .82; ox, oy = math.cos(a) * L, math.sin(a) * L * h / w
            d.line([cx - ox, cy - oy, cx + ox, cy + oy], fill=(36, 24, 24), width=max(2, int(h * .32)))
            d.line([cx - ox * .9, cy - oy * .9 - 1, cx + ox * .9, cy + oy * .9 - 1], fill=(64, 40, 34))
            for t in np.linspace(-.7, .7, 5): d.point((cx + ox * t, cy + oy * t + 1), fill=F[2])     # the glowing cracks
        for _ in range(int(w * h / 5)):                                            # embers, in clusters
            a, q = rng.uniform(0, 2 * math.pi), rng.uniform(0, 1) ** .7
            x, y = cx + math.cos(a) * q * w * .8, cy + math.sin(a) * q * h * .75; k = 1 + int((1 - q) * 2.4 + rng.uniform(0, .9))
            d.rectangle([x, y, x + rng.integers(1, 3), y + rng.integers(0, 2)], fill=F[min(k, 4)])
        for i in range(max(3, int(w / 4))):                                        # tongues of flame, tallest in the middle
            t = (i + .5) / max(3, int(w / 4)) * 2 - 1; fx = cx + t * w * .62 + rng.uniform(-1.5, 1.5); fy = cy + h * .25
            ht = h * (1.5 - abs(t) * .8) * rng.uniform(.8, 1.15); lean = rng.uniform(-2.5, 2.5); bw = max(2.0, w * .2)
            for k, (sc, c) in enumerate(((1, F[2]), (.72, F[3]), (.46, F[4]), (.22, F[5]))):
                d.polygon([(fx - bw * sc, fy), (fx - bw * sc * .7, fy - ht * sc * .45), (fx + lean * sc, fy - ht * sc), (fx + bw * sc * .8, fy - ht * sc * .4), (fx + bw * sc, fy)], fill=c)
        for _ in range(max(3, int(w / 3))):                                        # sparks
            d.point((cx + rng.uniform(-w, w) * .8, cy - h * rng.uniform(.9, 1.9)), fill=F[int(rng.integers(3, 6))])

    def put(s, a, x, y, mask=None):
        """Paste array a at pixel x, y (through a boolean mask if given)."""
        x, y = math.floor(x / Q), math.floor(y / Q)
        if mask is None: s.img.paste(Image.fromarray(a), (x, y))
        else: s.img.paste(Image.fromarray(a), (x, y), Image.fromarray((mask * 255).astype(np.uint8)))

    def shade(s, box, f=.66, kind="rect", pts=None):
        """A hard-edged shadow: darken and cool everything under the shape."""
        x0, y0, x1, y1 = (math.floor(v / Q) for v in box)
        if pts:
            pts = [(px / Q, py / Q) for px, py in pts]                               # work only over the shape itself
            x0, y0 = max(x0, math.floor(min(p[0] for p in pts))), max(y0, math.floor(min(p[1] for p in pts)))
            x1, y1 = min(x1, math.ceil(max(p[0] for p in pts)) + 1), min(y1, math.ceil(max(p[1] for p in pts)) + 1)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(s.W // Q, x1), min(s.H // Q, y1)
        if x1 <= x0 or y1 <= y0: return
        m = Image.new("L", (x1 - x0, y1 - y0), 0); md = ImageDraw.Draw(m)
        if kind == "rect": md.rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], fill=255)
        elif kind == "ellipse": md.ellipse([0, 0, x1 - x0 - 1, y1 - y0 - 1], fill=255)
        else: md.polygon([(px - x0, py - y0) for px, py in pts], fill=255)
        a = np.array(s.img.crop((x0, y0, x1, y1))); mm = np.array(m) > 0
        a[mm] = (a[mm] * np.array([f * .94, f * .96, f * 1.06])).clip(0, 255).astype(np.uint8)
        s.img.paste(Image.fromarray(a), (x0, y0))

    # ---------- small drawing helpers (pixels) ----------
    def box(s, x0, y0, x1, y1, name, lv=2, out=OUT, bevel=True, sh=0):
        """An outlined block lit from the north-west. Coordinates in pixels, inclusive."""
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); p = R[name] if isinstance(name, str) else name
        if sh: s.shade((x0 + sh, y0 + sh, x1 + sh + 1, y1 + sh + 1))
        s.d.rectangle([x0, y0, x1, y1], fill=p[lv], outline=out)
        if bevel and x1 - x0 > 5 and y1 - y0 > 5:
            s.d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=p[min(4, lv + 1)]); s.d.line([x0 + 1, y0 + 1, x0 + 1, y1 - 1], fill=p[min(4, lv + 1)])
            s.d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=p[max(0, lv - 1)]); s.d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=p[max(0, lv - 1)])

    def disc(s, cx, cy, r, name, lv=2, out=OUT, sh=0, ry=None):
        """An outlined round thing with a lit crescent north-west and a dark one south-east."""
        ry = ry or r; p = R[name] if isinstance(name, str) else name; cx, cy = int(cx), int(cy)
        if sh: s.shade((cx - r + sh, cy - ry + sh, cx + r + sh + 1, cy + ry + sh + 1), kind="ellipse")
        s.d.ellipse([cx - r, cy - ry, cx + r, cy + ry], fill=p[max(0, lv - 1)], outline=out)
        if r > 4:
            s.d.ellipse([cx - r + 1, cy - ry + 1, cx + r - 3, cy + ry - 3], fill=p[lv])
            s.d.arc([cx - r + 3, cy - ry + 3, cx + r - 4, cy + ry - 4], 180, 270, fill=p[min(4, lv + 1)])
            s.d.ellipse([cx - r, cy - ry, cx + r, cy + ry], outline=out)

    def dots(s, pts, col):
        for x, y in pts: s.d.point((int(x), int(y)), fill=col)

    # ---------- outdoors ----------
    def canopy(s, lumps, cx, cy, r, L, size=4, shadow=True):
        """Foliage built from leaf bundles: each a small clump with a lit top-left and a dark underside, stacked from
        the shaded side toward the light so lit bundles overlap dark ones. Tone follows the crown's roundness."""
        rng = s.rng; d = s.d
        for x, y, q in lumps: d.ellipse([x - q - 1, y - q - 1, x + q + 1, y + q + 1], fill=L[0])
        pts = []
        for x, y, q in lumps:
            for _ in range(int(q * q / (size * size * .55))):
                a, t = rng.uniform(0, 2 * math.pi), math.sqrt(rng.uniform(0, 1)) * q * .96
                bx, by = x + math.cos(a) * t, y + math.sin(a) * t
                lit = -((bx - x) + (by - y)) / (q * 1.5) * .55 - ((bx - cx) + (by - cy)) / (r * 1.5) * .6 + rng.uniform(-.14, .14)
                pts.append((bx, by, lit))
        for bx, by, lit in sorted(pts, key=lambda p: -(p[0] + p[1])):
            k = 1 + int(np.clip((lit + .62) * 2.6, 0, 2.99)); w = size + int(rng.integers(0, 2)); h = size - 1
            d.ellipse([bx - w, by - h, bx + w, by + h], fill=L[k - 1])                 # the underside shows south-east
            d.ellipse([bx - w, by - h, bx + w - 2, by + h - 2], fill=L[k])
            d.line([bx - w + 2, by - h + 1, bx, by - h + 1], fill=L[k + 1])           # a lit edge toward the light

    def tree(s, cx, cy, r):
        rng = s.rng; cx, cy = int(cx), int(cy); L = R["leaf"]
        if Q == 1:
            s.shade((cx - r + r * .22, cy - r + r * .3, cx + r + r * .22, cy + r + r * .3), f=.7, kind="ellipse")
            lumps = [(cx, cy, r * .62)] + [(cx + math.cos(a) * r * .56, cy + math.sin(a) * r * .56, r * rng.uniform(.36, .48))
                                           for a in np.linspace(0, 2 * math.pi, 9, endpoint=False) + rng.uniform(0, .6)]
            for x, y, q in lumps: s.d.ellipse([x - q - 3, y - q - 3, x + q + 3, y + q + 3], fill=OUT)
            s.canopy(lumps, cx, cy, r, L, size=5); return
        s.shade((cx - r + r * .22, cy - r + r * .3, cx + r + r * .22, cy + r + r * .3), f=.7, kind="ellipse")
        lumps = [(cx, cy, r * .62)] + [(cx + math.cos(a) * r * .56, cy + math.sin(a) * r * .56, r * rng.uniform(.36, .48))
                                       for a in np.linspace(0, 2 * math.pi, 9, endpoint=False) + rng.uniform(0, .6)]
        for x, y, q in lumps: s.d.ellipse([x - q - 2, y - q - 2, x + q + 2, y + q + 2], fill=OUT)
        for x, y, q in lumps: s.d.ellipse([x - q, y - q, x + q, y + q], fill=L[1])
        for x, y, q in sorted(lumps, key=lambda l: -(l[0] + l[1])):               # south-east lumps first, lit ones on top
            s.d.arc([x - q, y - q, x + q, y + q], 20, 110, fill=L[0], width=2)
            s.d.ellipse([x - q * .78 - 2, y - q * .78 - 2, x + q * .55, y + q * .55], fill=L[2])
            s.d.ellipse([x - q * .62 - 3, y - q * .62 - 3, x + q * .12, y + q * .12], fill=L[3])
            s.d.ellipse([x - q * .42 - 3, y - q * .42 - 3, x - q * .12, y - q * .12], fill=L[4])
        for _ in range(int(r * r / (30 if Q == 1 else 26))):                      # leaf marks
            a, q = rng.uniform(0, 2 * math.pi), r * .9 * math.sqrt(rng.uniform(0, 1)); x, y = int(cx + math.cos(a) * q), int(cy + math.sin(a) * q)
            c = s.img.getpixel((min(max(x // Q, 0), s.W // Q - 1), min(max(y // Q, 0), s.H // Q - 1)))
            if c in L[1:4] and Q == 1:
                k = L.index(c)                                                      # a leaf bundle: a small lit clump with its shade south-east
                s.d.rectangle([x, y, x + 3, y + 2], fill=L[k + 1]); s.d.point((x, y), fill=L[k]); s.d.point((x + 3, y + 2), fill=L[k])
                s.d.line([x + 1, y + 3, x + 4, y + 3], fill=L[k - 1]); s.d.line([x + 4, y + 1, x + 4, y + 3], fill=L[k - 1])
            elif c in L[1:4]:
                k = L.index(c); s.d.line([x, y, x + 2, y + 1], fill=L[k - 1]); s.d.point((x, y - 1), fill=L[k + 1])

    def fir(s, cx, cy, r):
        rng = s.rng; cx, cy = int(cx), int(cy); F = R["fir"]; n = 11; rot = rng.uniform(0, 1)
        s.shade((cx - r + r * .22, cy - r + r * .3, cx + r + r * .22, cy + r + r * .3), f=.7, kind="ellipse")
        def star(q, ox, oy, k):
            return [(cx + ox + math.cos((i + rot + k * .5) * math.pi / n) * q * (1 if i % 2 == 0 else .62),
                     cy + oy + math.sin((i + rot + k * .5) * math.pi / n) * q * (1 if i % 2 == 0 else .62)) for i in range(2 * n)]
        s.d.polygon(star(r + 2, 0, 0, 0), fill=OUT)
        for k, (q, c) in enumerate([(r, 1), (r * .78, 2), (r * .56, 3), (r * .34, 4)]):
            pts = star(q, -k * 2, -k * 2, k)
            s.d.polygon(pts, fill=F[c], outline=F[c - 1])
        s.d.rectangle([cx - 8, cy - 8, cx - 5, cy - 5], fill=R["dwood"][1])

    def bush(s, cx, cy, r, berries=None):
        L = R["green"]; rng = s.rng
        s.shade((cx - r + 4, cy - r + 6, cx + r + 6, cy + r + 8), f=.66, kind="ellipse")
        lumps = [(cx + rng.uniform(-r * .5, r * .5), cy + rng.uniform(-r * .4, r * .4), r * rng.uniform(.45, .65)) for _ in range(5)]
        for x, y, q in lumps: s.d.ellipse([x - q - 2, y - q - 2, x + q + 2, y + q + 2], fill=OUT)
        if Q == 1:
            s.canopy(lumps, cx, cy, r, L, size=3)
            if berries:
                for x, y, q in lumps:
                    for _ in range(3): bx, by = x + rng.uniform(-q, q) * .6, y + rng.uniform(-q, q) * .6; s.d.rectangle([bx, by, bx + 1, by + 1], fill=berries)
            return
        for x, y, q in lumps:
            s.d.ellipse([x - q, y - q, x + q, y + q], fill=L[1]); s.d.ellipse([x - q, y - q, x + q * .6, y + q * .6], fill=L[2])
            s.d.ellipse([x - q * .8, y - q * .8, x + q * .1, y + q * .1], fill=L[3]); s.d.point((x - q * .5, y - q * .5), fill=L[4])
        if berries:
            for x, y, q in lumps:
                for _ in range(3): bx, by = x + rng.uniform(-q, q) * .6, y + rng.uniform(-q, q) * .6; s.d.rectangle([bx, by, bx + 1, by + 1], fill=berries)

    def rock(s, cx, cy, w, h, name="stone"):
        rng = s.rng; P = R[name]
        pts = [(cx + math.cos(a) * w * rng.uniform(.8, 1), cy + math.sin(a) * h * rng.uniform(.8, 1)) for a in np.linspace(0, 2 * math.pi, 9, endpoint=False)]
        s.shade((cx - w + 4, cy - h + 6, cx + w + 6, cy + h + 7), kind="ellipse")
        s.d.polygon(pts, fill=P[1], outline=OUT)
        inner = [(cx + (x - cx) * .78 - 2, cy + (y - cy) * .78 - 2) for x, y in pts]; s.d.polygon(inner, fill=P[2])
        top = [(cx + (x - cx) * .5 - w * .16, cy + (y - cy) * .5 - h * .18) for x, y in pts]; s.d.polygon(top, fill=P[3])
        s.d.line([cx - w * .1, cy + h * .1, cx + w * .3, cy + h * .45], fill=P[0]); s.d.point((cx - w * .3, cy - h * .35), fill=P[4])
        s.d.polygon(pts, outline=OUT)

    # ---------- walls ----------
    def wall(s, x0, y0, x1, y1, th=22, kind="stone"):
        """A straight wall between two points in squares (axis-aligned), th pixels thick."""
        ax, ay, bx, by = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T); t = th // 2
        X0, Y0, X1, Y1 = min(ax, bx) - t, min(ay, by) - t, max(ax, bx) + t, max(ay, by) + t
        if WOD:   # grime gathered at the foot of the wall, then a long cold shadow
            s.shade((X0 - 14, Y0 - 14, X1 + 14, Y1 + 14), f=.84); s.shade((X0 - 6, Y0 - 6, X1 + 6, Y1 + 6), f=.84)
            s.shade((X0 + 12, Y0 + 16, X1 + 22, Y1 + 30), f=.72)
        s.shade((X0 + 7, Y0 + 9, X1 + 7, Y1 + 9), f=.62 if not WOD else .55)
        w, h = X1 - X0, Y1 - Y0; horiz = w >= h
        if kind == "stone":
            a = s.blocks(h, w, 26, max(8, th // 2), "stone", lo=1, hi=4) if horiz else np.transpose(s.blocks(w, h, 26, max(8, th // 2), "stone", lo=1, hi=4), (1, 0, 2))
        elif kind == "pale":
            a = s.blocks(h, w, 30, max(8, th // 3), "pale", lo=1, hi=4) if horiz else np.transpose(s.blocks(w, h, 30, max(8, th // 3), "pale", lo=1, hi=4), (1, 0, 2))
        else:
            a = s.blocks(h, w, 400, max(6, th // 2), "dwood", jitter=1, lo=1, hi=4) if horiz else np.transpose(s.blocks(w, h, 400, max(6, th // 2), "dwood", jitter=1, lo=1, hi=4), (1, 0, 2))
        s.put(a, X0, Y0)
        s.d.rectangle([X0, Y0, X1 - 1, Y1 - 1], outline=OUT); s.d.rectangle([X0 - 1, Y0 - 1, X1, Y1], outline=OUT)
        hi = R["pale" if kind == "pale" else ("stone" if kind == "stone" else "dwood")][4]
        s.d.line([X0 + 1, Y0 + 1, X1 - 2, Y0 + 1], fill=hi); s.d.line([X0 + 1, Y0 + 1, X0 + 1, Y1 - 2], fill=hi)

    def post(s, x, y, th=32, name="dwood"):
        cx, cy = int(x * T), int(y * T); t = th // 2
        s.box(cx - t, cy - t, cx + t, cy + t, name, 2)
        s.d.rectangle([cx - t + 4, cy - t + 4, cx + t - 4, cy + t - 4], outline=R[name][1]); s.d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=R[name][1])

    def door(s, x0, y0, x1, y1, th=22, floor=None, double=False, sill="stone", leaf="dwood"):
        """A doorway in a wall already drawn: a worn sill and a shut door leaf with iron straps."""
        ax, ay, bx, by = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T); t = th // 2 + 1; horiz = ay == by
        X0, Y0, X1, Y1 = (ax, ay - t, bx, by + t) if horiz else (ax - t, ay, bx + t, by)
        s.box(X0, Y0, X1, Y1, sill, 3)
        l = 6
        X0, Y0, X1, Y1 = (ax + 3, ay - l, bx - 3, by + l) if horiz else (ax - l, ay + 3, bx + l, by - 3)
        s.box(X0, Y0, X1, Y1, "wood" if leaf == "dwood" else leaf, 4)
        n = 4 if double else 2
        for i in range(n):                                                                 # iron straps
            f = (i + .5) / n
            if horiz: xx = int(X0 + (X1 - X0) * f); s.d.rectangle([xx - 1, Y0 + 1, xx + 1, Y1 - 1], fill=R["iron"][1])
            else: yy = int(Y0 + (Y1 - Y0) * f); s.d.rectangle([X0 + 1, yy - 1, X1 - 1, yy + 1], fill=R["iron"][1])
        if double:
            if horiz: mx = (X0 + X1) // 2; s.d.line([mx, Y0, mx, Y1], fill=OUT)
            else: my = (Y0 + Y1) // 2; s.d.line([X0, my, X1, my], fill=OUT)
        if horiz: s.d.rectangle([X1 - 9, Y1 - 4, X1 - 7, Y1 - 2], fill=R["gold"][3])
        else: s.d.rectangle([X1 - 4, Y1 - 9, X1 - 2, Y1 - 7], fill=R["gold"][3])

    def window(s, x0, y0, x1, y1, th=22, glass=None, frame="dwood"):
        """A window in a wall already drawn: a frame, then shutters (wood) or leaded coloured glass."""
        ax, ay, bx, by = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T); t = th // 2 - 3; horiz = ay == by
        X0, Y0, X1, Y1 = (ax, ay - t, bx, by + t) if horiz else (ax - t, ay, bx + t, by)
        s.box(X0, Y0, X1, Y1, frame, 1, bevel=False)
        if glass: s.glass.append((X0, Y0, X1, Y1, horiz))
        cols = glass or [R["wood"][3], R["wood"][2]]
        n = max(2, (max(X1 - X0, Y1 - Y0) - 4) // 7)
        for i in range(n):
            c = cols[int(s.rng.integers(0, len(cols)))] if glass else cols[i % 2]
            if horiz:
                xa = X0 + 2 + i * (X1 - X0 - 4) // n; xb = X0 + 2 + (i + 1) * (X1 - X0 - 4) // n - 2
                s.d.rectangle([xa, Y0 + 2, xb, Y1 - 2], fill=c); s.d.point((xa, Y0 + 2), fill=(240, 240, 230) if glass else R["wood"][4])
            else:
                ya = Y0 + 2 + i * (Y1 - Y0 - 4) // n; yb = Y0 + 2 + (i + 1) * (Y1 - Y0 - 4) // n - 2
                s.d.rectangle([X0 + 2, ya, X1 - 2, yb], fill=c); s.d.point((X0 + 2, ya), fill=(240, 240, 230) if glass else R["wood"][4])

    # ---------- furniture (top-down, pixel coordinates from squares) ----------
    def table(s, x, y, w, h, name="wood", things=True):
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
        s.shade((X0 + 6, Y0 + 8, X1 + 6, Y1 + 8))
        a = s.blocks(Y1 - Y0, X1 - X0, 4000, 15, name, jitter=1, lo=3, hi=5)
        if h > w: a = np.transpose(s.blocks(X1 - X0, Y1 - Y0, 4000, 15, name, jitter=1, lo=3, hi=5), (1, 0, 2))
        s.put(a, X0, Y0)
        s.d.rectangle([X0, Y0, X1 - 1, Y1 - 1], outline=OUT); s.d.rectangle([X0 - 1, Y0 - 1, X1, Y1], outline=OUT)
        s.d.line([X0 + 1, Y0 + 1, X1 - 2, Y0 + 1], fill=(196, 164, 110)); s.d.line([X0 + 1, Y1 - 2, X1 - 2, Y1 - 2], fill=R[name][1]); s.d.line([X0 + 1, Y1 - 3, X1 - 2, Y1 - 3], fill=R[name][2])
        if things:
            rng = s.rng
            for _ in range(max(2, int(w * h * 2.2))):
                cx, cy = rng.integers(X0 + 12, X1 - 12), rng.integers(Y0 + 12, Y1 - 12); k = rng.integers(0, 5)
                if k == 0: s.disc(cx, cy, 10, "clay", 3, sh=3); s.d.ellipse([cx - 6, cy - 6, cx + 5, cy + 5], fill=R["straw"][3], outline=R["clay"][1])   # bowl of pottage
                elif k == 1: s.disc(cx, cy, 12, "straw", 2, sh=3, ry=9); s.d.line([cx - 5, cy - 3, cx + 1, cy + 3], fill=R["straw"][0]); s.d.line([cx, cy - 4, cx + 6, cy + 2], fill=R["straw"][0])   # loaf
                elif k == 2: s.disc(cx, cy, 7, "dwood", 3, sh=3); s.d.ellipse([cx - 4, cy - 4, cx + 3, cy + 3], fill=R["red"][1]); s.d.rectangle([cx + 7, cy - 1, cx + 10, cy + 1], fill=R["dwood"][2])  # cup
                elif k == 3: s.disc(cx, cy, 6, "iron", 2, sh=3); s.d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=R["linen"][4]); s.d.point((cx - 1, cy - 1), fill=(255, 190, 70))              # candle
                else: s.box(cx - 6, cy - 2, cx + 6, cy + 1, "iron", 3, bevel=False); s.d.rectangle([cx - 10, cy - 1, cx - 6, cy], fill=R["dwood"][2])  # knife

    def bench(s, x, y, w, h, name="wood"):
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
        s.box(X0, Y0, X1, Y1, name, 2, sh=4)
        if w > h:
            for xx in (X0 + 8, X1 - 10): s.d.rectangle([xx, Y0 + 2, xx + 2, Y1 - 2], fill=R[name][1])
            s.d.line([X0 + 12, (Y0 + Y1) // 2, X1 - 12, (Y0 + Y1) // 2], fill=R[name][1])
        else:
            for yy in (Y0 + 8, Y1 - 10): s.d.rectangle([X0 + 2, yy, X1 - 2, yy + 2], fill=R[name][1])
            s.d.line([(X0 + X1) // 2, Y0 + 12, (X0 + X1) // 2, Y1 - 12], fill=R[name][1])

    def stool(s, x, y):
        cx, cy = int(x * T), int(y * T); s.disc(cx, cy, 15, "wood", 3, sh=4)
        for dx, dy in ((-8, -8), (8, -8), (-8, 8), (8, 8)): s.d.rectangle([cx + dx - 1, cy + dy - 1, cx + dx + 1, cy + dy + 1], fill=R["wood"][1])

    def bed(s, x, y, w, h, head="n", cloth="red", name="dwood"):
        X0, Y0, X1, Y1 = int(x * T) + 4, int(y * T) + 4, int((x + w) * T) - 4, int((y + h) * T) - 4
        s.box(X0, Y0, X1, Y1, name, 2, sh=6)
        s.d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=R["linen"][3], outline=R["linen"][1])
        C = R[cloth]; vert = head in "ns"; L = (Y1 - Y0) if vert else (X1 - X0)
        if head == "n": pil = (X0 + 10, Y0 + 8, X1 - 10, Y0 + 30); bl = (X0 + 4, Y0 + int(L * .38), X1 - 4, Y1 - 4)
        elif head == "s": pil = (X0 + 10, Y1 - 30, X1 - 10, Y1 - 8); bl = (X0 + 4, Y0 + 4, X1 - 4, Y1 - int(L * .38))
        elif head == "w": pil = (X0 + 8, Y0 + 10, X0 + 30, Y1 - 10); bl = (X0 + int(L * .38), Y0 + 4, X1 - 4, Y1 - 4)
        else: pil = (X1 - 30, Y0 + 10, X1 - 8, Y1 - 10); bl = (X0 + 4, Y0 + 4, X1 - int(L * .38), Y1 - 4)
        s.box(*pil, "linen", 4); s.d.line([pil[0] + 3, pil[3] - 2, pil[2] - 3, pil[3] - 2], fill=R["linen"][2])
        s.d.rectangle(bl, fill=C[2], outline=C[0])
        bx0, by0, bx1, by1 = bl
        for i in range(by0 + 6, by1 - 2, 12) if vert else range(bx0 + 6, bx1 - 2, 12):       # woven stripes
            if vert: s.d.line([bx0 + 2, i, bx1 - 2, i], fill=C[3]); s.d.line([bx0 + 2, i + 1, bx1 - 2, i + 1], fill=C[1])
            else: s.d.line([i, by0 + 2, i, by1 - 2], fill=C[3]); s.d.line([i + 1, by0 + 2, i + 1, by1 - 2], fill=C[1])
        # the turned-back fold at the pillow end
        if head == "n": s.d.rectangle([bx0, by0, bx1, by0 + 7], fill=R["linen"][4], outline=R["linen"][1])
        elif head == "s": s.d.rectangle([bx0, by1 - 7, bx1, by1], fill=R["linen"][4], outline=R["linen"][1])
        elif head == "w": s.d.rectangle([bx0, by0, bx0 + 7, by1], fill=R["linen"][4], outline=R["linen"][1])
        else: s.d.rectangle([bx1 - 7, by0, bx1, by1], fill=R["linen"][4], outline=R["linen"][1])
        for px_, py_ in ((X0, Y0), (X1 - 6, Y0), (X0, Y1 - 6), (X1 - 6, Y1 - 6)): s.box(px_, py_, px_ + 6, py_ + 6, name, 3, bevel=False)

    def chest(s, x, y, w=1, h=.6, name="wood"):
        X0, Y0, X1, Y1 = int(x * T) + 6, int(y * T) + 4, int((x + w) * T) - 6, int((y + h) * T) - 4
        s.box(X0, Y0, X1, Y1, name, 2, sh=5)
        s.d.line([X0 + 2, Y0 + (Y1 - Y0) // 3, X1 - 2, Y0 + (Y1 - Y0) // 3], fill=R[name][1])
        for xx in (X0 + 10, X1 - 12): s.d.rectangle([xx, Y0 + 1, xx + 2, Y1 - 1], fill=R["iron"][2]); s.d.point((xx + 1, Y0 + 4), fill=R["iron"][4])
        mx = (X0 + X1) // 2; s.d.rectangle([mx - 3, Y1 - 9, mx + 3, Y1 - 3], fill=R["iron"][3], outline=OUT); s.d.point((mx, Y1 - 6), fill=OUT)

    def barrel(s, x, y, r=30, name="wood"):
        cx, cy = int(x * T), int(y * T)
        s.disc(cx, cy, r, name, 2, sh=6); s.d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=R[name][3], outline=R["iron"][1])
        for dx in range(-r + 12, r - 8, 9): s.d.line([cx + dx, cy - int(math.sqrt(max(0, (r - 6) ** 2 - dx * dx))) + 1, cx + dx, cy + int(math.sqrt(max(0, (r - 6) ** 2 - dx * dx))) - 1], fill=R[name][2])
        s.d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=R[name][0]); s.d.arc([cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7], 190, 260, fill=R[name][4])

    def sack(s, x, y, r=24):
        cx, cy = int(x * T), int(y * T); P = R["straw"]
        if Q == 1:
            """A full grain sack lying on its side, tied at the neck: a slumped cloth shape, not a disc."""
            rng = s.rng; C = R["linen"] if not WOD else [(52, 46, 40), (84, 74, 58), (116, 104, 80), (146, 132, 102), (172, 158, 124)]
            a0 = rng.uniform(-.5, .5); L, Wd = r * 1.25, r * .78; ca, sa = math.cos(a0), math.sin(a0)
            def P_(u, v): return (cx + u * ca - v * sa, cy + u * sa + v * ca)
            body = [P_(-L * .95, -Wd * .55), P_(-L * .6, -Wd), P_(L * .35, -Wd * .95), P_(L * .72, -Wd * .5), P_(L * .72, Wd * .5), P_(L * .35, Wd * .95), P_(-L * .6, Wd), P_(-L * .95, Wd * .55)]
            s.shade((cx - L + 2, cy - Wd + 4, cx + L + 4, cy + Wd + 5), kind="ellipse", f=.6)
            s.d.polygon(body, fill=C[2], outline=OUT)
            s.d.polygon([P_(-L * .8, -Wd * .5), P_(-L * .5, -Wd * .82), P_(L * .3, -Wd * .78), P_(L * .55, -Wd * .35), P_(-L * .2, -Wd * .1)], fill=C[3])   # the lit shoulder
            s.d.line([P_(-L * .85, Wd * .55), P_(-L * .5, Wd * .85), P_(L * .3, Wd * .8)], fill=C[1])                 # the dark underside
            s.d.line([P_(-L * .9, 0), P_(L * .6, 0)], fill=C[1])                                                       # the seam
            for u in (-.5, -.1, .3): s.d.line([P_(L * u, Wd * .15), P_(L * (u + .08), Wd * .55)], fill=C[1])             # folds where it sags
            neck = [P_(L * .72, -Wd * .3), P_(L * 1.0, -Wd * .5), P_(L * 1.12, 0), P_(L * 1.0, Wd * .5), P_(L * .72, Wd * .3)]
            s.d.polygon(neck, fill=C[3], outline=OUT); s.d.line([P_(L * .74, -Wd * .34), P_(L * .74, Wd * .34)], fill=R["dwood"][1], width=2)   # the tie
            s.d.point(P_(-L * .4, -Wd * .6), fill=C[4]); s.d.point(P_(0, -Wd * .62), fill=C[4])
            return
        s.disc(cx, cy, r, P, 2, sh=5, ry=int(r * .8)); s.d.line([cx - r + 8, cy + 3, cx + r - 8, cy + 5], fill=P[1])
        s.d.rectangle([cx - 4, cy - int(r * .8) - 3, cx + 3, cy - int(r * .8) + 4], fill=P[3], outline=OUT); s.d.line([cx - 5, cy - int(r * .8) + 5, cx + 4, cy - int(r * .8) + 5], fill=R["dwood"][1])

    def shelf(s, x, y, w, h):
        """Shelves against a wall, with crocks and jars seen from above."""
        X0, Y0, X1, Y1 = int(x * T) + 2, int(y * T) + 2, int((x + w) * T) - 2, int((y + h) * T) - 2
        s.box(X0, Y0, X1, Y1, "dwood", 3, sh=4); rng = s.rng; horiz = w > h
        n = int((X1 - X0 if horiz else Y1 - Y0) // 19)
        for i in range(n):
            cx = X0 + 11 + i * 19 if horiz else (X0 + X1) // 2; cy = (Y0 + Y1) // 2 if horiz else Y0 + 11 + i * 19
            k = rng.integers(0, 4)
            if k == 0: s.disc(cx, cy, 7, "clay", 3); s.d.ellipse([cx - 3, cy - 3, cx + 2, cy + 2], fill=R["clay"][0])
            elif k == 1: s.disc(cx, cy, 6, "stone", 3); s.d.point((cx - 2, cy - 2), fill=R["stone"][4])
            elif k == 2: s.box(cx - 6, cy - 5, cx + 6, cy + 5, "straw", 3)
            else: s.disc(cx, cy, 5, "green", 2)

    def rug(s, x, y, w, h, a="red", b="gold"):
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T); A, B = R[a], R[b]
        s.d.rectangle([X0, Y0, X1, Y1], fill=A[1], outline=A[0]); s.d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=B[2])
        s.d.rectangle([X0 + 8, Y0 + 8, X1 - 8, Y1 - 8], fill=A[2], outline=A[0])
        for cx in range(X0 + 26, X1 - 16, 28):
            for cy in range(Y0 + 26, Y1 - 16, 28):
                s.d.polygon([(cx, cy - 9), (cx + 9, cy), (cx, cy + 9), (cx - 9, cy)], fill=B[2], outline=A[0]); s.d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=A[3])
        if Q == 1:
            for yy in range(Y0 + 10, Y1 - 8, 3): s.d.line([X0 + 9, yy, X1 - 9, yy], fill=tuple(max(0, v - 9) for v in A[2]))     # the weave
            for cx in range(X0 + 26, X1 - 16, 28):
                for cy in range(Y0 + 26, Y1 - 16, 28):
                    s.d.polygon([(cx, cy - 9), (cx + 9, cy), (cx, cy + 9), (cx - 9, cy)], fill=B[1], outline=A[0]); s.d.polygon([(cx, cy - 6), (cx + 6, cy), (cx, cy + 6), (cx - 6, cy)], fill=B[2])
                    s.d.polygon([(cx, cy - 3), (cx + 3, cy), (cx, cy + 3), (cx - 3, cy)], fill=A[3]); s.d.point((cx, cy), fill=B[4])
            for xx in range(X0 + 14, X1 - 12, 7): s.d.point((xx, Y0 + 6), fill=B[3]); s.d.point((xx, Y1 - 6), fill=B[3])
            for yy in range(Y0 + 14, Y1 - 12, 7): s.d.point((X0 + 6, yy), fill=B[3]); s.d.point((X1 - 6, yy), fill=B[3])
        for xx in range(X0 + 2, X1, 4): s.d.line([xx, Y0 - 3, xx, Y0], fill=B[3]); s.d.line([xx, Y1, xx, Y1 + 3], fill=B[3])   # fringe

    def logs(s, x, y, w, h):
        X0, Y0 = int(x * T), int(y * T); s.shade((X0 + 4, Y0 + 6, X0 + int(w * T) + 6, Y0 + int(h * T) + 8))
        for j in range(int(h * T) // 14):
            for i in range(int(w * T) // 14):
                cx, cy = X0 + 7 + i * 14 + (j % 2) * 3, Y0 + 7 + j * 14
                s.d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=R["wood"][3], outline=OUT); s.d.ellipse([cx - 4, cy - 4, cx + 3, cy + 3], outline=R["wood"][2]); s.d.point((cx, cy), fill=R["wood"][1])

    def oven(s, x, y, w, h, side="n"):
        """A bread oven built into a wall: plastered block, clay dome, a mouth with embers and a stone sill to the room."""
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
        s.shade((X0 + 8, Y0 + 10, X1 + 8, Y1 + 10))
        s.put(s.blocks(Y1 - Y0, X1 - X0, 34, 17, "pale", lo=1, hi=4), X0, Y0); s.d.rectangle([X0, Y0, X1 - 1, Y1 - 1], outline=OUT); s.d.rectangle([X0 - 1, Y0 - 1, X1, Y1], outline=OUT)
        cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 + (-8 if side == "n" else 8 if side == "s" else 0); r = int(min(X1 - X0, Y1 - Y0) * .40)
        C = R["clay"]; s.d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=OUT)
        if Q == 1:
            s.dome(cx, cy, r, "lime" if "lime" in R else "clay")                # a limewashed dome, as such ovens were
            my_ = Y1 if side == "n" else Y0                                      # soot blackening the dome above the mouth, fading upward
            X_, Y_ = cx - r, cy - r; a_ = np.array(s.img.crop((X_, Y_, X_ + 2 * r + 1, Y_ + 2 * r + 1)), np.float32)
            yy_, xx_ = np.mgrid[Y_:Y_ + 2 * r + 1, X_:X_ + 2 * r + 1].astype(np.float32)
            dd_ = np.hypot((xx_ - cx) * 1.25, yy_ - my_) / (r * 1.05); inside_ = np.hypot(xx_ - cx, yy_ - cy) < r - 1
            dth_ = np.tile(BAYER, ((2 * r + 1) // 4 + 1, (2 * r + 1) // 4 + 1))[:2 * r + 1, :2 * r + 1]
            k_ = np.clip(np.floor((1 - dd_ * .8) * 4 + dth_ * .9 + .5) / 4, 0, .95) * inside_
            a_ = a_ * (1 - k_[..., None] * .78) + k_[..., None] * np.array([10, 8, 10], np.float32)
            s.img.paste(Image.fromarray(a_.clip(0, 255).astype(np.uint8)), (X_, Y_))
        else:
          for q, c, o in ((r, 1, 0), (r - 3, 2, -2), (int(r * .7), 3, -5), (int(r * .36), 4, -8)): s.d.ellipse([cx - q + o, cy - q + o, cx + q + o, cy + q + o], fill=C[c])
        if Q == 2:
          for a in np.linspace(.3, 5.9, 13): s.d.point((cx + math.cos(a) * r * .8, cy + math.sin(a) * r * .8), fill=C[1])
        my = Y1 if side == "n" else Y0
        s.d.pieslice([cx - 22, my - 22, cx + 22, my + 22], 180 if side == "n" else 0, 360 if side == "n" else 180, fill=(22, 14, 16), outline=OUT)
        if Q == 1:
            sg = 1 if side == "n" else -1
            s.d.pieslice([cx - 30, my - 30, cx + 30, my + 30], 180 if side == "n" else 0, 360 if side == "n" else 180, fill=(14, 8, 10), outline=OUT)
            for k, c in enumerate((R["pale"][1], R["pale"][2], R["pale"][1], R["pale"][3], R["pale"][2], R["pale"][1], R["pale"][2])):   # the arch stones round the mouth
                a0 = math.pi + k * math.pi / 7 if side == "n" else k * math.pi / 7
                p = [(cx + math.cos(a0 + j * math.pi / 7) * q, my + math.sin(a0 + j * math.pi / 7) * q) for j, q in ((0, 24), (0, 32), (1, 32), (1, 24))]
                s.d.polygon(p, fill=c, outline=OUT)
            s.fire(cx, my - sg * 9, 19, 8)
            s.box(cx - 36, my - 2 if side == "n" else my - 10, cx + 36, my + 10 if side == "n" else my + 2, "stone", 3)
            s.d.line([cx - 30, my + sg * 3, cx + 30, my + sg * 3], fill=(150, 92, 60)); s.d.line([cx - 20, my + sg * 2, cx + 20, my + sg * 2], fill=(206, 140, 76))   # firelight on the sill
            s.hearths = getattr(s, "hearths", []) + [(cx, my + sg * 6, 250, (math.pi / 2 * sg, 1.05))]
            return
        ey = my - 9 if side == "n" else my + 6
        for dx, c in ((-9, (150, 46, 30)), (-4, (226, 110, 36)), (1, (250, 190, 80)), (6, (226, 110, 36)), (11, (150, 46, 30))): s.d.rectangle([cx + dx, ey, cx + dx + 3, ey + 3], fill=c)
        s.box(cx - 30, my - 3 if side == "n" else my - 9, cx + 30, my + 9 if side == "n" else my + 3, "stone", 3)

    # ---------- church things ----------
    def column(s, x, y, r=26, name="pale", plinth=True):
        cx, cy = int(x * T), int(y * T)
        if WOD: s.shade((cx - r, cy - r + 10, cx + r + 70, cy + r + 96), f=.74, kind="poly", pts=[(cx - r, cy + r * .4), (cx + r * .6, cy - r), (cx + r + 70, cy + 60), (cx + 50, cy + r + 96)])
        s.shade((cx - r + 4, cy - r + 6, cx + r + 16, cy + r + 20), f=.62, kind="ellipse")
        if plinth: s.box(cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6, "stone", 3)
        s.disc(cx, cy, r, name, 3); s.d.ellipse([cx - r + 6, cy - r + 6, cx + r - 9, cy + r - 9], fill=R[name][4]); s.d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OUT)
        s.d.arc([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], 10, 100, fill=R[name][1], width=3)

    def pier(s, x, y, r=40):
        """A great crossing pier: a square core with four attached shafts."""
        cx, cy = int(x * T), int(y * T)
        s.shade((cx - r + 10, cy - r + 12, cx + r + 12, cy + r + 16), f=.62)
        s.box(cx - r, cy - r, cx + r, cy + r, "stone", 3)
        s.box(cx - r + 8, cy - r + 8, cx + r - 8, cy + r - 8, "pale", 3)
        for dx, dy in ((0, -r + 4), (0, r - 4), (-r + 4, 0), (r - 4, 0)): s.disc(cx + dx, cy + dy, 13, "pale", 3)
        for dx, dy in ((-r + 9, -r + 9), (r - 9, -r + 9), (-r + 9, r - 9), (r - 9, r - 9)): s.disc(cx + dx, cy + dy, 7, "pale", 3)

    def candle(s, x, y, tall=True):
        cx, cy = int(x * T), int(y * T)
        s.lights.append((cx, cy, 300 if tall else 220))
        s.disc(cx, cy, 9 if tall else 6, "gold", 2, sh=3); s.d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=R["linen"][4])
        s.d.point((cx - 1, cy - 1), fill=(255, 170, 50)); s.d.point((cx, cy - 1), fill=(255, 236, 150))

    def altar(s, x, y, w, h, cloth="linen", trim="gold", cross=True):
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T)
        s.box(X0, Y0, X1, Y1, "pale", 2, sh=7)
        L, G = R[cloth], R[trim]
        s.d.rectangle([X0 + 5, Y0 + 5, X1 - 5, Y1 - 5], fill=L[3], outline=L[1]); s.d.rectangle([X0 + 8, Y0 + 8, X1 - 8, Y1 - 8], outline=G[3])
        horiz = w > h
        for i in range(X0 + 12, X1 - 10, 8) if horiz else range(Y0 + 12, Y1 - 10, 8):
            if horiz: s.d.point((i, Y0 + 11), fill=G[2]); s.d.point((i, Y1 - 11), fill=G[2])
            else: s.d.point((X0 + 11, i), fill=G[2]); s.d.point((X1 - 11, i), fill=G[2])
        cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
        if cross:
            s.d.rectangle([cx - 2, cy - 12, cx + 2, cy + 12], fill=G[3], outline=G[0]); s.d.rectangle([cx - 9, cy - 6, cx + 9, cy - 2], fill=G[3], outline=G[0]); s.d.point((cx, cy - 4), fill=R["red"][3])
        for k in (-1, 1):
            if horiz: s.candle((cx + k * (X1 - X0) * .34) / T, cy / T)
            else: s.candle(cx / T, (cy + k * (Y1 - Y0) * .34) / T)

    def stalls(s, x, y, w, h, back="n"):
        """Choir stalls: a carved back to the wall side, seats with arm rests, a desk in front."""
        X0, Y0, X1, Y1 = int(x * T), int(y * T), int((x + w) * T), int((y + h) * T); W = R["dwood"]
        s.box(X0, Y0, X1, Y1, "dwood", 2, sh=6)
        if back in "ns":
            by0, by1 = (Y0, Y0 + 12) if back == "n" else (Y1 - 12, Y1); dy0, dy1 = (Y1 - 14, Y1) if back == "n" else (Y0, Y0 + 14)
            s.box(X0, by0, X1, by1, "dwood", 1); s.box(X0, dy0, X1, dy1, "dwood", 3)
            for xx in range(X0, X1 - 8, 31):
                s.d.rectangle([xx, min(by1, dy1), xx + 3, max(by0, dy0)], fill=W[1], outline=OUT)
                s.d.rectangle([xx + 7, min(by1, dy1) + 3, xx + 27, max(by0, dy0) - 3], fill=R["red"][1], outline=W[0]); s.d.point((xx + 9, min(by1, dy1) + 5), fill=R["red"][3])
                s.d.point((xx + 16, (by0 + by1) // 2), fill=R["gold"][3])
        else:
            bx0, bx1 = (X0, X0 + 12) if back == "w" else (X1 - 12, X1); dx0, dx1 = (X1 - 14, X1) if back == "w" else (X0, X0 + 14)
            s.box(bx0, Y0, bx1, Y1, "dwood", 1); s.box(dx0, Y0, dx1, Y1, "dwood", 3)
            for yy in range(Y0, Y1 - 8, 31):
                s.d.rectangle([min(bx1, dx1), yy, max(bx0, dx0), yy + 3], fill=W[1], outline=OUT)
                s.d.rectangle([min(bx1, dx1) + 3, yy + 7, max(bx0, dx0) - 3, yy + 27], fill=R["red"][1], outline=W[0])

    def font(s, x, y, r=40):
        cx, cy = int(x * T), int(y * T)
        pts = lambda q: [(cx + math.cos(a + math.pi / 8) * q, cy + math.sin(a + math.pi / 8) * q) for a in np.linspace(0, 2 * math.pi, 8, endpoint=False)]
        s.shade((cx - r + 8, cy - r + 10, cx + r + 10, cy + r + 12), kind="ellipse")
        s.d.polygon(pts(r + 12), fill=R["stone"][2], outline=OUT); s.d.polygon(pts(r), fill=R["pale"][3], outline=OUT); s.d.polygon(pts(r - 5), outline=R["pale"][4])
        s.d.ellipse([cx - r + 12, cy - r + 12, cx + r - 12, cy + r - 12], fill=R["water"][2], outline=OUT)
        s.d.arc([cx - r + 16, cy - r + 16, cx + r - 16, cy + r - 16], 190, 250, fill=R["water"][4]); s.d.line([cx + 2, cy + 6, cx + 10, cy + 6], fill=R["water"][3])

    def tomb(s, x, y, w, h, knight=True):
        X0, Y0, X1, Y1 = int(x * T) + 6, int(y * T) + 6, int((x + w) * T) - 6, int((y + h) * T) - 6
        s.box(X0, Y0, X1, Y1, "stone", 2, sh=6); s.box(X0 + 5, Y0 + 5, X1 - 5, Y1 - 5, "pale", 2)
        P = R["pale"]; horiz = w > h; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
        if horiz:   # head to the west
            s.d.ellipse([X0 + 12, cy - 9, X0 + 30, cy + 9], fill=P[4], outline=P[1]); s.d.rectangle([X0 + 32, cy - 13, X1 - 22, cy + 13], fill=P[3], outline=P[1])
            s.d.rectangle([X1 - 22, cy - 9, X1 - 12, cy + 9], fill=P[4], outline=P[1]); s.d.line([X0 + 40, cy, X1 - 30, cy], fill=P[1])
            if knight: s.d.rectangle([X0 + 44, cy - 2, X1 - 40, cy + 1], fill=R["iron"][3]); s.d.rectangle([X0 + 50, cy - 7, X0 + 53, cy + 6], fill=R["iron"][3])
        else:
            s.d.ellipse([cx - 9, Y0 + 12, cx + 9, Y0 + 30], fill=P[4], outline=P[1]); s.d.rectangle([cx - 13, Y0 + 32, cx + 13, Y1 - 22], fill=P[3], outline=P[1])
            s.d.rectangle([cx - 9, Y1 - 22, cx + 9, Y1 - 12], fill=P[4], outline=P[1]); s.d.line([cx, Y0 + 40, cx, Y1 - 30], fill=P[1])
            if knight: s.d.rectangle([cx - 2, Y0 + 44, cx + 1, Y1 - 40], fill=R["iron"][3]); s.d.rectangle([cx - 7, Y0 + 50, cx + 6, Y0 + 53], fill=R["iron"][3])

    def grave(s, x, y):
        cx, cy = int(x * T), int(y * T)
        s.d.ellipse([cx - 22, cy - 2, cx + 22, cy + 70], fill=R["grass"][3], outline=R["grass"][1])
        s.box(cx - 16, cy - 12, cx + 16, cy - 2, "stone", 3, sh=5); s.d.rectangle([cx - 2, cy - 10, cx + 1, cy - 4], fill=R["stone"][1]); s.d.line([cx - 5, cy - 8, cx + 4, cy - 8], fill=R["stone"][1])

    def save(s, path, grid=False):
        im = s.img.resize((s.W, s.H), Image.NEAREST)
        if grid:
            im = im.copy(); a = np.array(im).astype(np.float32)
            a[::T, :, :] *= .82; a[:, ::T, :] *= .82; im = Image.fromarray(a.astype(np.uint8))
        im.save(path, optimize=True)
        return im

    # ---------- World of Darkness pieces ----------
    def crack(s, x, y, n=9, col=None):
        """A crack wandering across paving, in pixels of 94ths."""
        col = col or R["stone"][0]; a = s.rng.uniform(0, 6.28)
        for _ in range(n):
            a += s.rng.uniform(-.9, .9); L = s.rng.uniform(10, 26); nx, ny = x + math.cos(a) * L, y + math.sin(a) * L
            s.d.line([x, y, nx, ny], fill=col)
            if s.rng.random() < .3: s.d.line([x, y, x + math.cos(a + 1.3) * L * .6, y + math.sin(a + 1.3) * L * .6], fill=col)
            x, y = nx, ny

    def deadtree(s, cx, cy, r):
        """A bare tree from above: a trunk and clawing branches, with their shadow thrown beside them."""
        rng = s.rng; cx, cy = int(cx), int(cy); W_ = R["dwood"]
        def limb(x, y, a, L, w, dx, dy, col):
            nx, ny = x + math.cos(a) * L, y + math.sin(a) * L
            s.d.line([x + dx, y + dy, nx + dx, ny + dy], fill=col, width=w)
            if L > r * .16:
                for k in (-1, 1): limb(nx, ny, a + k * rng.uniform(.3, .9), L * rng.uniform(.58, .74), max(2, w - 2), dx, dy, col)
        st = rng.bit_generator.state
        for dx, dy, col in ((14, 20, None), (0, 0, 1)):
            rng.bit_generator.state = st
            for k in range(5):
                a = k * 2 * math.pi / 5 + .4
                if col is None:
                    # shadow pass: draw into a mask-like darkening by painting very dark, low contrast lines
                    limb(cx, cy, a, r * .42, 6, dx, dy, tuple(int(v * .5) for v in R["grass"][1]))
                else: limb(cx, cy, a, r * .42, 6, 0, 0, W_[1])
        s.disc(cx, cy, max(8, r // 9), "dwood", 2); s.d.point((cx - 2, cy - 2), fill=W_[4])

    def raven(s, x, y):
        s.d.ellipse([x - 5, y - 3, x + 5, y + 3], fill=(8, 8, 14)); s.d.line([x - 9, y - 4, x - 4, y], fill=(8, 8, 14), width=2); s.d.line([x + 4, y, x + 9, y - 4], fill=(8, 8, 14), width=2)
        s.d.point((x, y - 4), fill=(8, 8, 14)); s.d.point((x + 1, y - 5), fill=(120, 110, 80))

    def rubble(s, x, y, n=9, spread=40):
        for _ in range(n):
            s.rock(x + s.rng.uniform(-spread, spread), y + s.rng.uniform(-spread, spread) * .7, s.rng.uniform(6, 16), s.rng.uniform(5, 12))

    def night(s, path, darkness=(.26, .28, .46), moon=(.46, .54, .80)):
        """SIMULATION of the clock's night with Foundry lights on: candles as warm banded pools, moonlight through the
        coloured glass as cold slanted patches. Banded and dithered so it stays pixel art. Not a Foundry screenshot."""
        a = np.array(s.img, np.float32) / 255; h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        warm = np.zeros((h, w), np.float32)
        for cx, cy, r in s.lights:
            cx, cy, r = cx / Q, cy / Q, r / Q
            x0, x1, y0, y1 = max(0, int(cx - r)), min(w, int(cx + r) + 1), max(0, int(cy - r)), min(h, int(cy + r) + 1)
            f = np.clip(1 - np.hypot(xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy) / r, 0, 1) ** 1.4
            warm[y0:y1, x0:x1] = 1 - (1 - warm[y0:y1, x0:x1]) * (1 - f)
        cold = Image.new("L", (w, h), 0); cd = ImageDraw.Draw(cold)
        for X0, Y0, X1, Y1, horiz in s.glass:                                     # the moon stands low in the south-west
            X0, Y0, X1, Y1 = X0 / Q, Y0 / Q, X1 / Q, Y1 / Q
            if horiz and Y0 > h / 2: cd.polygon([(X0, Y0), (X1, Y0), (X1 + 44, Y0 - 150), (X0 + 44, Y0 - 150)], fill=255)
            elif not horiz and X0 < w / 3: cd.polygon([(X1, Y0), (X1, Y1), (X1 + 170, Y1 - 50), (X1 + 170, Y0 - 50)], fill=255)
        cold = np.array(cold, np.float32) / 255
        dth = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
        band = lambda v, n: np.clip(np.floor(v * n + dth * .9 + .5) / n, 0, 1)                # stepped, dithered light
        wv, cv = band(warm, 6), band(cold * .8, 3)
        lm = np.array(darkness, np.float32)[None, None] * np.ones((h, w, 1), np.float32)
        lm = lm + cv[..., None] * (np.array(moon, np.float32) - np.array(darkness, np.float32))
        lm = np.maximum(lm, lm + wv[..., None] * (np.array([1.12, .78, .42], np.float32) - lm))
        out = Image.fromarray((a * lm).clip(0, 1).__mul__(255).astype(np.uint8)).resize((s.W, s.H), Image.NEAREST)
        out.save(path, optimize=True); return out
