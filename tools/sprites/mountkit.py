# The painter for mounts and vehicles (B4970): flat shapes in five-tone ramps, lit from the top, with a dark outline,
# in the manner of the figures (crinos.py, rig.py) but on a frame of any size. Own art, no outside pictures.
# Paint, trim and cloth are drawn in three key ramps (KA, KB, KC) that the game swaps for a colour scheme.
import numpy as np, math
from PIL import Image, ImageDraw
PPM = 37.14            # pixels to the metre, as the people are drawn (batch.ppm)
KA = [(40, 0, 40), (90, 0, 90), (140, 0, 140), (190, 0, 190), (240, 0, 240)]      # paint or coat
KB = [(0, 40, 40), (0, 90, 90), (0, 140, 140), (0, 190, 190), (0, 240, 240)]      # trim, mane, roof
KC = [(40, 40, 0), (90, 90, 0), (140, 140, 0), (190, 190, 0), (240, 240, 0)]      # cloth, canvas, stripe


def ramp(b):
    b = np.array(b, float)
    f = lambda k, sh=(0, 0, 0): tuple(int(v) for v in np.clip(b * k + np.array(sh), 0, 255))
    return [f(.30, (-4, -4, 6)), f(.62), f(.86), f(1.0), f(1.16, (6, 6, 4))]


TYRE = ramp((58, 56, 60)); STEEL = ramp((150, 154, 162)); IRON = ramp((92, 94, 102)); CHROME = ramp((196, 202, 210))
BRASS = ramp((196, 160, 70)); WOOD = ramp((132, 96, 60)); DARKWOOD = ramp((92, 64, 42)); PALEWOOD = ramp((176, 142, 96))
LEATHER = ramp((96, 62, 40)); BLACKLEATHER = ramp((48, 42, 42)); CANVAS = ramp((186, 172, 140)); ROPE = ramp((168, 146, 100))
GLASS = [(16, 20, 28), (28, 36, 50), (42, 54, 72), (74, 94, 118), (160, 186, 204)]
REDL = ramp((200, 44, 36)); AMBER = ramp((226, 150, 40)); LAMP = ramp((240, 226, 160)); WHITE = ramp((224, 224, 220))
BLACK = ramp((44, 42, 46)); WATER = ramp((70, 110, 140)); BONE = ramp((214, 206, 180)); FLESH = ramp((170, 96, 92))
RUST = ramp((120, 72, 48)); NEON = ramp((90, 220, 230)); SOLAR = ramp((40, 52, 96))


def _dist(m, up=True):
    """for each pixel of a mask, how far it is from the mask's edge above (or below) it in its column, 1 at the edge"""
    d = np.zeros(m.shape, int); prev = np.zeros(m.shape[1], int)
    for y in (range(m.shape[0]) if up else range(m.shape[0] - 1, -1, -1)):
        prev = (prev + 1) * m[y]; d[y] = prev
    d[~m] = 9999
    return d


class Pt:
    """A frame being painted. y grows downward, as on the screen."""
    def __init__(s, w, h):
        s.w = w; s.h = h; s.c = np.zeros((h, w, 4), np.uint8); s.dk = np.zeros((h, w, 3), np.uint8)

    def _mask(s, fn):
        im = Image.new('L', (s.w, s.h), 0); fn(ImageDraw.Draw(im)); return np.array(im) > 0

    def fill(s, mask, rp, tone=2, vol=None, edge=None, gloss=False):
        """paint a mask. vol=(top, bottom): so many pixels under its upper edge go a tone lighter and above its lower edge a tone darker"""
        if not mask.any(): return mask
        k = np.full(mask.shape, tone)
        if vol:
            t, b = vol
            if b: k[_dist(mask, False) <= b] = max(1, tone - 1)
            if t: k[_dist(mask, True) <= t] = min(4, tone + 1)
            if gloss: k[_dist(mask, True) == 1] = 4
        if edge is not None:
            e = mask.copy(); e[1:] &= mask[:-1]; e[:-1] &= mask[1:]; e[:, 1:] &= mask[:, :-1]; e[:, :-1] &= mask[:, 1:]
            e[0] = e[-1] = False; e[:, 0] = e[:, -1] = False
            k[mask & ~e] = edge
        arr = np.array(rp, np.uint8)
        s.c[mask, :3] = arr[k[mask]]; s.c[mask, 3] = 255; s.dk[mask] = arr[0]
        return mask

    def poly(s, pts, rp, tone=2, **kw):
        pts = [(int(round(x)), int(round(y))) for x, y in pts]
        return s.fill(s._mask(lambda d: d.polygon(pts, fill=255, outline=255)), rp, tone, **kw)

    def rect(s, x0, y0, x1, y1, rp, tone=2, **kw):
        x0, x1 = sorted((int(round(x0)), int(round(x1)))); y0, y1 = sorted((int(round(y0)), int(round(y1))))
        return s.fill(s._mask(lambda d: d.rectangle((x0, y0, x1, y1), fill=255)), rp, tone, **kw)

    def ell(s, cx, cy, rx, ry, rp, tone=2, **kw):
        box = (int(round(cx - rx)), int(round(cy - ry)), int(round(cx + rx)), int(round(cy + ry)))
        return s.fill(s._mask(lambda d: d.ellipse(box, fill=255)), rp, tone, **kw)

    def line(s, pts, rp, tone=2, w=1):
        pts = [(int(round(x)), int(round(y))) for x, y in pts]
        return s.fill(s._mask(lambda d: d.line(pts, fill=255, width=w)), rp, tone)

    def arc(s, cx, cy, rx, ry, a0, a1, rp, tone=2, w=1):
        box = (int(round(cx - rx)), int(round(cy - ry)), int(round(cx + rx)), int(round(cy + ry)))
        return s.fill(s._mask(lambda d: d.arc(box, a0, a1, fill=255, width=w)), rp, tone)

    def px(s, x, y, rp, tone=2):
        x = int(round(x)); y = int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h: s.c[y, x] = (*rp[tone], 255); s.dk[y, x] = rp[0]

    def paste(s, arr, ox=0, oy=0, under=False):
        """lay another picture (h, w, 4) on this one at (ox, oy); under: only where nothing is painted yet"""
        h, w = arr.shape[:2]
        x0 = max(0, ox); y0 = max(0, oy); x1 = min(s.w, ox + w); y1 = min(s.h, oy + h)
        if x1 <= x0 or y1 <= y0: return
        src = arr[y0 - oy:y1 - oy, x0 - ox:x1 - ox]; m = src[..., 3] > 0
        if under: m &= s.c[y0:y1, x0:x1, 3] == 0
        s.c[y0:y1, x0:x1][m] = src[m]; s.dk[y0:y1, x0:x1][m] = (30, 26, 28)

    def wheel(s, cx, cy, r, kind='disc', ph=0, hub=None, rim=None):
        """a wheel seen from the side. kind: spoke (wood), wire, disc, alloy, white (whitewall), solid (a cart's plank wheel), track"""
        if kind == 'spoke':
            rp = rim or WOOD
            s.ell(cx, cy, r, r, IRON, 1); s.ell(cx, cy, r - 1.2, r - 1.2, rp, 2, vol=(1, 1)); s.ell(cx, cy, r - 3.2, r - 3.2, BLACK, 0)
            n = 8 if r < 12 else 10
            for i in range(n):
                a = ph + i * 2 * math.pi / n
                s.line([(cx, cy), (cx + math.cos(a) * (r - 2.5), cy + math.sin(a) * (r - 2.5))], rp, 3)
            s.ell(cx, cy, max(1.5, r * .2), max(1.5, r * .2), hub or IRON, 2)
        elif kind == 'solid':
            rp = rim or WOOD
            s.ell(cx, cy, r, r, IRON, 1); s.ell(cx, cy, r - 1, r - 1, rp, 2, vol=(2, 2))
            for i in range(2):
                a = ph + i * math.pi / 2
                s.line([(cx - math.cos(a) * (r - 2), cy - math.sin(a) * (r - 2)), (cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2))], rp, 1)
            s.ell(cx, cy, 2, 2, IRON, 2)
        elif kind == 'wire':
            s.ell(cx, cy, r, r, TYRE, 2 if r > 6 else 1); s.ell(cx, cy, r - 1.6, r - 1.6, STEEL, 1); s.ell(cx, cy, r - 2.4, r - 2.4, BLACK, 0)
            n = 6 if r < 9 else 8
            for i in range(n):
                a = ph + i * math.pi / n
                s.line([(cx - math.cos(a) * (r - 2), cy - math.sin(a) * (r - 2)), (cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2))], STEEL, 2)
            s.ell(cx, cy, 1.2, 1.2, hub or STEEL, 3)
        else:
            s.ell(cx, cy, r, r, TYRE, 2, vol=(1, 2))
            if kind == 'white': s.ell(cx, cy, r - 2, r - 2, WHITE, 3)
            hr = r * (.62 if kind in ('disc', 'white') else .68)
            rp = hub or (CHROME if kind == 'alloy' else STEEL)
            s.ell(cx, cy, hr, hr, rp, 2, vol=(1, 1))
            if kind == 'alloy':
                for i in range(5):
                    a = ph + i * 2 * math.pi / 5
                    s.line([(cx, cy), (cx + math.cos(a) * hr, cy + math.sin(a) * hr)], rp, 0)
            else:
                for i in range(4):
                    a = ph + i * math.pi / 2
                    s.px(cx + math.cos(a) * hr * .6, cy + math.sin(a) * hr * .6, rp, 0)
            s.ell(cx, cy, max(1, r * .16), max(1, r * .16), rp, 3)

    def tyre_front(s, x0, x1, y0, y1):
        """a wheel seen end on: a dark upright block with a tread"""
        s.rect(x0, y0, x1, y1, TYRE, 2, vol=(1, 2))
        for y in range(int(y0) + 2, int(y1), 3): s.line([(x0 + 1, y), (x1 - 1, y)], TYRE, 1)

    def outline(s):
        a = s.c[..., 3] > 0; out = s.c.copy()
        for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
            n = np.zeros_like(a); src = np.zeros_like(s.dk)
            ys = slice(max(0, -dy), s.h - max(0, dy)); yd = slice(max(0, dy), s.h - max(0, -dy))
            xs = slice(max(0, -dx), s.w - max(0, dx)); xd = slice(max(0, dx), s.w - max(0, -dx))
            n[ys, xs] = a[yd, xd]; src[ys, xs] = s.dk[yd, xd]
            sel = n & ~a & (out[..., 3] == 0)
            out[sel, :3] = src[sel]; out[sel, 3] = 255
        return out

    def shadow(s, cx, cy, rx, ry=3):
        """a soft ground shadow under the thing, only where nothing is painted"""
        m = s._mask(lambda d: d.ellipse((int(cx - rx), int(cy - ry), int(cx + rx), int(cy + ry)), fill=255)) & (s.c[..., 3] == 0)
        s.c[m] = (10, 10, 14, 70)


def mirror(arr): return arr[:, ::-1].copy()


def bbox(arr):
    ys, xs = np.nonzero(arr[..., 3] > 0)
    return (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None


def recolour(arr, scheme):
    """swap the key ramps for a scheme's: {'a': five colours, 'b': ..., 'c': ...}"""
    out = arr.copy()
    for key, ks in (('a', KA), ('b', KB), ('c', KC)):
        to = scheme.get(key)
        if not to: continue
        for i, kc in enumerate(ks):
            m = (arr[..., 0] == kc[0]) & (arr[..., 1] == kc[1]) & (arr[..., 2] == kc[2]) & (arr[..., 3] > 0)
            out[m, :3] = to[i]
    return out


# ---- where a rider sits, in the mount's frame ----
# A person's frame is 96 by 112: standing, the head is centred near row 43, the shoulders at 51, the hips at 70, the feet
# at 103. Folded in the saddle (the ride sheet), the figure is 11 rows lower: head near 54, hips near 81.
def seat_head(x, y, below=10):
    """a head seen through a window, centred on (x, y); so many rows under the head's middle still show"""
    return dict(x=round(x), y=round(y + 60), cut=44 + below, pose='sit')


def seat_sit(x, y, below=2):
    """seated on a bench with the hips at (x, y), the legs out of sight"""
    return dict(x=round(x), y=round(y + 33), cut=70 + below, pose='sit')


def seat_astride(x, y, cut=112):
    """in a saddle with the hips at (x, y), legs folded"""
    return dict(x=round(x), y=round(y + 22), cut=cut, pose='ride')


def seat_hidden(x, y):
    """inside, out of sight"""
    return dict(x=round(x), y=round(y), cut=0, pose='sit')
