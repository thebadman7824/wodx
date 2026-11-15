"""Quayside, office, tavern, ward and gaol things for the library (B6346), the "trades" family's share that is not a
craft or a farm trade: dock crane, bollard, rope, anchor, nets; server rack, console, monitors, copier, vending
machine, water cooler; pool table, dartboard, jukebox; stretcher, drip stand, restraint chair, morgue drawers; cage,
stocks, gallows, rack, shackles, cell bars; hitching post.

Every drawing is seen from straight above with its front to the south, in every era it spans, and honours wealth
(plainer, fewer parts and coarser stuff for the poor up to carved, inlaid and gilded), the regional style where the
thing was made by local hands (its own woods, paints and stones, a small pattern last) and its own axes. Machines
made the same the world over carry no regional look (global_from). Every variation is drawn sound: wear is the one
shared layer core.render lays on. Each drawing is wrapped by `_obj`, which notes the pixels it drew, gives them the
era's finishing cast, and casts one short shadow south-east from the drawn shape."""
import math

import numpy as np
from PIL import Image

from px import OUT
from library.core import define
from library.art import (tone, mix, ramp, box_px, slab, rivet, knob, cloth, IRON, BRASS, STEEL, WHITE, LINEN,
                         PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW)

PER = {"dark-ages": "M", "long-night": "M", "renaissance": "E", "age-of-reason": "E", "victorian": "V",
       "great-war": "W", "mid-century": "W", "modern": "N", "future-darkness": "F"}
EK = {k: i for i, k in enumerate(PER)}
AGE2ERA = {"medieval": "dark-ages", "early modern": "renaissance", "1800s": "victorian", "1900s": "mid-century",
           "modern": "modern", "Future Darkness": "future-darkness"}

# ---------------------------------------------------------------- the regional styles: woods, paints, stones, cloth, a pattern
# wood, fine wood, paint (the people's own colour), trim, stone, cloth, metal for the rich
STY = {
    "central":       dict(wood=(146, 106, 64), fine=(112, 66, 40), paint=(176, 48, 40), trim=(56, 116, 70), stone=(150, 146, 138), cloth=(140, 40, 36), rich="brass"),
    "atlantic":      dict(wood=(128, 78, 50), fine=(96, 46, 34), paint=(38, 60, 118), trim=(226, 222, 206), stone=(118, 122, 128), cloth=(40, 74, 54), rich="brass"),
    "northern":      dict(wood=(204, 180, 130), fine=(176, 140, 90), paint=(50, 96, 170), trim=(196, 48, 44), stone=(96, 98, 104), cloth=(190, 182, 160), rich="silver"),
    "mediterranean": dict(wood=(110, 72, 48), fine=(84, 52, 36), paint=(206, 112, 58), trim=(40, 90, 170), stone=(222, 210, 180), cloth=(214, 196, 150), rich="brass"),
    "islamic":       dict(wood=(118, 72, 46), fine=(92, 50, 34), paint=(30, 150, 150), trim=(236, 228, 204), stone=(206, 170, 110), cloth=(150, 30, 46), rich="gold"),
    "steppe":        dict(wood=(204, 92, 40), fine=(170, 64, 30), paint=(232, 150, 30), trim=(40, 70, 150), stone=(170, 140, 100), cloth=(120, 90, 60), rich="silver"),
    "southasia":     dict(wood=(160, 104, 50), fine=(120, 60, 50), paint=(236, 184, 40), trim=(190, 50, 100), stone=(176, 90, 70), cloth=(220, 120, 40), rich="gold"),
    "eastasia":      dict(wood=(150, 34, 30), fine=(38, 30, 34), paint=(40, 34, 38), trim=(200, 46, 36), stone=(120, 130, 140), cloth=(60, 80, 130), rich="gold"),
    "seasia":        dict(wood=(206, 174, 104), fine=(130, 90, 50), paint=(60, 150, 70), trim=(60, 50, 120), stone=(170, 90, 60), cloth=(70, 60, 120), rich="gold"),
    "africa":        dict(wood=(84, 52, 34), fine=(60, 36, 26), paint=(214, 160, 40), trim=(40, 120, 60), stone=(184, 104, 60), cloth=(220, 170, 40), rich="gold"),
    "americas":      dict(wood=(170, 120, 80), fine=(120, 80, 56), paint=(180, 40, 90), trim=(50, 170, 160), stone=(200, 150, 110), cloth=(190, 60, 50), rich="silver"),
    "oceania":       dict(wood=(122, 82, 52), fine=(86, 54, 36), paint=(214, 194, 146), trim=(30, 26, 24), stone=(80, 80, 84), cloth=(170, 120, 70), rich="brass"),
    "polar":         dict(wood=(156, 150, 138), fine=(120, 112, 100), paint=(110, 116, 128), trim=(220, 110, 40), stone=(56, 60, 66), cloth=(180, 150, 110), rich="silver"),
}
NEUTRAL = dict(wood=(140, 100, 64), fine=(100, 62, 40), paint=(96, 98, 104), trim=(150, 154, 160), stone=(160, 158, 152), cloth=(110, 110, 116), rich="silver")
GLOWMAKE = {"black": (70, 200, 230), "charcoal": (240, 170, 60), "grey": (190, 210, 250), "putty": (90, 220, 120), "beige": (240, 190, 90),
            "white": (230, 236, 240), "red": (240, 70, 60), "blue": (80, 130, 250), "green": (90, 230, 140), "cream": (250, 130, 40),
            "orange": (250, 140, 40), "walnut": (240, 150, 60), "maple": (250, 230, 90), "mahogany": (230, 60, 90), "chrome": (80, 220, 240)}
METAL = {"brass": BRASS, "gold": ramp((214, 172, 60), 22), "silver": ramp((190, 194, 200), 18)}
RUST = ramp((112, 74, 56), 14)
GREY = (124, 116, 104)


class C:
    """One variation's colours: era, period, wealth, style and the palettes they give."""
    def __init__(s, v, era0):
        s.era = v.get("era") or AGE2ERA.get(v.get("age"), era0)
        s.per = PER[s.era]; s.ek = EK[s.era]
        s.w = int(v.get("wealth", 3)); s.style = v.get("style", "central"); s.cond = v.get("condition", "new"); s.v = v
        S = STY.get(s.style, STY["central"]) if "style" in v or "age" not in v and "era" not in v else NEUTRAL; s.S = S
        s.poor, s.rich = s.w <= 1, s.w >= 4
        f = .3 if s.poor else 0
        s.wood = ramp(mix(S["fine" if s.rich else "wood"], GREY, f + (.12 if s.per == "M" and s.ek == 1 else 0)), 18)
        s.paint = ramp(mix(S["paint"], GREY, f), 22)
        s.trim = ramp(mix(S["trim"], GREY, f), 20)
        s.stone = ramp(S["stone"], 16, (0, 0, 4))
        s.cloth = ramp(mix(S["cloth"], GREY, f), 18)
        s.metal = RUST if s.poor else (METAL[S["rich"]] if s.rich else IRON)
        s.iron = RUST if s.poor else IRON
        s.comp = ramp(mix(COMPOSITE[2], S["paint"], .4), 14)
        s.glow = [mix(GLOW[0], S["trim"], .45), mix(GLOW[1], S["trim"], .45), mix(GLOW[2], S["trim"], .3)]
        gm = GLOWMAKE.get(v.get("make") or v.get("brand"))
        if gm and "style" not in v: s.glow = [tone(gm, -90), gm, tone(gm, 60)]
        s.livery = ramp(mix(S["paint"], (200, 200, 200), .0 if s.w >= 3 else .25), 20)

    def axis(s, k, default): return s.v.get(k, default)


# ---------------------------------------------------------------- a pattern for each people, in a band
def motif(tm, x0, y0, x1, y1, c, n=None):
    """The style's own pattern laid along a band: flowers, stringing, rosemaling, tiles, stars, knots, lotus, fret,
    batik, kente, step, tapa or incised dots. Clusters of two or more pixels, never lone ones."""
    d = tm.d; st = c.style; x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1); W, H = x1 - x0, y1 - y0
    if W < 4 or H < 3: return
    P, T_ = c.paint, c.trim; G = METAL[c.S["rich"]]; cy = (y0 + y1) // 2; s = max(4, min(H, 10))
    horiz = W >= H; L = W if horiz else H
    k = max(1, n or int(L / (s + 3)))
    for i in range(k):
        t = (i + .5) / k
        cx_, cy_ = (x0 + t * W, cy) if horiz else ((x0 + x1) // 2, y0 + t * H); cx_, cy_ = int(cx_), int(cy_); r = max(2, s // 2 - 1)
        if st == "central":
            d.ellipse([cx_ - r, cy_ - r, cx_ + r, cy_ + r], fill=P[3], outline=P[0]); d.rectangle([cx_ - 1, cy_ - 1, cx_, cy_], fill=G[4])
        elif st == "atlantic":
            d.polygon([(cx_, cy_ - r), (cx_ + r, cy_), (cx_, cy_ + r), (cx_ - r, cy_)], fill=T_[3], outline=P[1])
        elif st == "northern":
            d.arc([cx_ - r, cy_ - r, cx_ + r, cy_ + r], 180, 450, fill=T_[2], width=2); d.rectangle([cx_ - 1, cy_ - 1, cx_ + 1, cy_ + 1], fill=P[3])
        elif st == "mediterranean":
            d.rectangle([cx_ - r, cy_ - r, cx_ + r, cy_ + r], fill=WHITE[3], outline=T_[1]); d.rectangle([cx_ - r + 2, cy_ - r + 2, cx_ + r - 2, cy_ + r - 2], fill=T_[2])
        elif st == "islamic":
            d.rectangle([cx_ - r + 1, cy_ - r + 1, cx_ + r - 1, cy_ + r - 1], fill=P[3]); d.polygon([(cx_, cy_ - r), (cx_ + r, cy_), (cx_, cy_ + r), (cx_ - r, cy_)], fill=P[2], outline=G[3])
        elif st == "steppe":
            d.line([cx_ - r, cy_ + r, cx_ - r, cy_ - r, cx_ + r, cy_ - r, cx_ + r, cy_], fill=WHITE[4], width=2)
        elif st == "southasia":
            d.ellipse([cx_ - r, cy_ - 2, cx_ + r, cy_ + 2], fill=T_[3]); d.ellipse([cx_ - 2, cy_ - r, cx_ + 2, cy_ + r], fill=P[3]); d.rectangle([cx_ - 1, cy_ - 1, cx_, cy_], fill=G[4])
        elif st == "eastasia":
            d.line([cx_ - r, cy_ + r, cx_ - r, cy_ - r, cx_ + r, cy_ - r, cx_ + r, cy_ + 1, cx_, cy_ + 1], fill=G[3], width=1)
            d.line([cx_ - r + 1, cy_ + r, cx_ - r + 1, cy_ - r + 1], fill=G[3])
        elif st == "seasia":
            d.ellipse([cx_ - r, cy_ - r, cx_ + r, cy_ + r], outline=T_[3], width=2); d.rectangle([cx_ - 1, cy_ - 1, cx_ + 1, cy_ + 1], fill=P[3])
        elif st == "africa":
            q = max(2, r)
            d.rectangle([cx_ - q, cy_ - q, cx_, cy_ + q], fill=P[3]); d.rectangle([cx_ + 1, cy_ - q, cx_ + q, cy_ + q], fill=T_[2]); d.rectangle([cx_ - q, cy_ - 1, cx_ + q, cy_], fill=(150, 30, 30))
        elif st == "americas":
            d.polygon([(cx_ - r, cy_ + r), (cx_ - r, cy_), (cx_, cy_), (cx_, cy_ - r), (cx_ + r, cy_ - r), (cx_ + r, cy_ + r)], fill=T_[2], outline=P[1])
        elif st == "oceania":
            d.polygon([(cx_ - r, cy_ + r), (cx_, cy_ - r), (cx_ + r, cy_ + r)], fill=(40, 30, 26)); d.rectangle([cx_ - 1, cy_ + 1, cx_ + 1, cy_ + r - 1], fill=P[3])
        else:
            d.rectangle([cx_ - 2, cy_ - 1, cx_ + 1, cy_ + 1], fill=T_[2])


# ---------------------------------------------------------------- the wrapper: wear, damage and the shadow
# each era its own cast, shifted over what the period draws so that every variation keeps its contrasts:
# Long Night soot and smoke (plague years, more wear); Renaissance oiled wood and brass; Age of Reason cool lead paint;
# Victorian mahogany red; Great War khaki issue; Mid-Century bright enamel; Modern cool grey plastic and steel.
# Dark Ages and Future Darkness keep what the period gives.
ERAFIN = {"long-night": (-16, -18, -20), "renaissance": (14, 6, -10), "age-of-reason": (-2, 8, 18), "victorian": (12, -8, -12),
          "great-war": (4, 4, -14), "mid-century": (14, 14, 10), "modern": (-6, 0, 10)}


def _obj(fn, era0, off=4, chip=True, presets=None):
    def draw(tm, x, y, w, h, st, v):
        if presets: v = {**v, **presets[int(v.get("model", 0)) % len(presets)]}
        c = C(v, era0); before = np.asarray(tm.img).copy()
        glows = fn(tm, x, y, w, h, st, v, c) or []
        a = np.asarray(tm.img).astype(np.float32); m = (np.abs(a - before.astype(np.float32)).sum(2) > 0)
        if not m.any(): return
        ys, xs = np.nonzero(m); bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
        fin = ERAFIN.get(c.era)
        if fin:                                                                              # the finish of the age, over the whole body
            a[m] = a[m] + np.array(fin, np.float32)
        sh = np.zeros_like(m); sh[off:, off - 1:] = m[:-off, :-(off - 1)] if off > 1 else m[:-off, :]
        sh &= ~m
        a[sh] = before[sh].astype(np.float32) * np.array([.53, .54, .6], np.float32)
        tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (0, 0))
        for gx, gy, gr, col in glows:                                                       # the light a lit thing throws on the floor
            tm.glow(gx, gy, gr, col=col, power=.8)
    draw.__doc__ = fn.__doc__
    return draw


def rope(d, pts, C, w=3):
    """A laid rope along a path: dark edge, its body, and the twist of its strands every few pixels."""
    d.line(pts, fill=C[0], width=w + 2, joint="curve"); d.line(pts, fill=C[2], width=w, joint="curve")
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, by - ay)
        for t in np.arange(0, L, 4):
            u = t / max(L, 1); px_, py_ = ax + (bx - ax) * u, ay + (by - ay) * u
            d.line([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=C[3 if (int(t) // 4) % 2 else 1])


def chain(d, pts, C, step=5):
    """A chain along a path: links laid alternately flat and on edge."""
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / max(L, 1), (by - ay) / max(L, 1)
        for k, t in enumerate(np.arange(0, L, step)):
            px_, py_ = ax + ux * t, ay + uy * t
            if k % 2: d.line([px_ - ux * 3, py_ - uy * 3, px_ + ux * 3, py_ + uy * 3], fill=C[1], width=2)
            else: d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], outline=C[3], width=1); d.point((px_ - 2, py_ - 2), fill=C[4])


def lash(d, x, y, C, n=3, vert=False):
    """A rope lashing of a few turns round a joint."""
    for k in range(n):
        if vert: d.line([x - 3, y + k * 2, x + 3, y + k * 2 + 1], fill=C[3 if k % 2 else 1], width=1)
        else: d.line([x + k * 2, y - 3, x + k * 2 + 1, y + 3], fill=C[3 if k % 2 else 1], width=1)


HEMP = ramp((176, 150, 104), 18)
TAR = ramp((82, 64, 50), 14)
SCREEN = {"lit": [(20, 40, 44), (40, 90, 90), (90, 190, 170), (170, 240, 220)], "out": [(14, 16, 20), (26, 28, 34), (40, 44, 52), (64, 68, 78)]}
HAZ = ((232, 190, 30), (30, 28, 30))


def hazard(d, x0, y0, x1, y1, s=6):
    """Yellow and black hazard stripes."""
    d.rectangle([x0, y0, x1, y1], fill=HAZ[0])
    for k in range(int(x0) - int(y1 - y0), int(x1), s * 2):
        d.polygon([(k, y1), (k + s, y1), (k + s + (y1 - y0), y0), (k + (y1 - y0), y0)], fill=HAZ[1])
    d.rectangle([x0 - 1, y0 - 1, x0 - 1, y1], fill=OUT); d.rectangle([x1 + 1, y0 - 1, x1 + 1, y1], fill=OUT)


def region_mat(c):
    """The wood a people works for poles and frames: bamboo in the east and south-east, palm and timber in Africa
    and the islands, driftwood and bone in the far north, else the style's wood."""
    if c.style in ("eastasia", "seasia"): return ramp((196, 176, 96), 16)
    if c.style == "polar": return ramp((164, 158, 146), 14)
    return c.wood


def S(t): return [t[0], t[1], t[2], t[3]]


# ================================================================ the quay
def _load(d, cx, cy, kind, c, s=16):
    """What hangs on a crane's hook, seen from above: a corded bale, a cask, a crate, a sling of sacks, steel joists
    (a timber bundle before rolled steel) or a bundle of pipes (a dressed stone block before)."""
    cx, cy = int(cx), int(cy)
    if kind == "bale":
        d.rounded_rectangle([cx - s, cy - s * 2 // 3, cx + s, cy + s * 2 // 3], 4, fill=c.cloth[2], outline=OUT)
        for k in (-s // 2, 0, s // 2): d.line([cx + k, cy - s * 2 // 3 + 1, cx + k, cy + s * 2 // 3 - 1], fill=HEMP[1], width=2)
        d.line([cx - s + 2, cy - s * 2 // 3 + 2, cx + s - 2, cy - s * 2 // 3 + 2], fill=c.cloth[4])
    elif kind == "cask":
        d.ellipse([cx - s + 2, cy - s + 2, cx + s - 2, cy + s - 2], fill=c.wood[2], outline=OUT)
        d.ellipse([cx - s + 5, cy - s + 5, cx + s - 5, cy + s - 5], outline=c.iron[1], width=2); d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=c.wood[0])
    elif kind == "crate":
        d.rectangle([cx - s, cy - s + 3, cx + s, cy + s - 3], fill=c.wood[3], outline=OUT)
        for k in range(cx - s + 6, cx + s, 7): d.line([k, cy - s + 4, k, cy + s - 4], fill=c.wood[1])
        d.line([cx - s, cy - s + 3, cx + s, cy + s - 3], fill=c.wood[1], width=2)
    elif kind == "sacks":
        for dx, dy in ((-7, -4), (6, -5), (0, 5)):
            d.rounded_rectangle([cx + dx - 8, cy + dy - 6, cx + dx + 8, cy + dy + 6], 5, fill=LINEN[2], outline=OUT); d.line([cx + dx - 5, cy + dy - 4, cx + dx + 4, cy + dy - 4], fill=LINEN[4])
        d.line([cx - 14, cy, cx + 14, cy], fill=HEMP[1], width=2)
    elif kind == "girders" and c.per in "ME":                                                                 # before rolled steel: a bundle of timber
        for k in (-8, 0, 8): d.rectangle([cx - s - 4, cy + k - 3, cx + s + 4, cy + k + 3], fill=c.wood[2], outline=OUT); d.ellipse([cx + s, cy + k - 3, cx + s + 5, cy + k + 3], fill=c.wood[4], outline=OUT)
    elif kind == "girders":                                                                                   # rolled steel joists in a sling
        for k in (-8, 0, 8): d.rectangle([cx - s - 6, cy + k - 3, cx + s + 6, cy + k + 3], fill=IRON[2], outline=OUT); d.line([cx - s - 5, cy + k, cx + s + 5, cy + k], fill=IRON[0])
    elif kind == "pipes" and c.per in "ME":                                                                   # a dressed stone block on a lewis
        d.rectangle([cx - s, cy - s + 2, cx + s, cy + s - 2], fill=c.stone[3], outline=OUT); d.rectangle([cx - 3, cy - 5, cx + 3, cy + 5], fill=c.stone[0])
    elif kind == "pipes":                                                                                     # a bundle of pipes, their open ends to the east
        for k in (-9, -3, 3, 9): d.rectangle([cx - s - 4, cy + k - 3, cx + s, cy + k + 3], fill=STEEL[2], outline=OUT); d.ellipse([cx + s - 3, cy + k - 3, cx + s + 3, cy + k + 3], fill=(30, 30, 34), outline=STEEL[4])
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=IRON[3], outline=OUT)                                  # the hook


def _jib_lattice(d, x0, y0, x1, y1, C, wide=18):
    """A lattice jib from (x0, y0) to its tip (x1, y1): two rails closing to the tip, braces zigzag between."""
    L = math.hypot(x1 - x0, y1 - y0); ux, uy = (x1 - x0) / L, (y1 - y0) / L; nx, ny = -uy, ux
    a = [(x0 + nx * wide / 2, y0 + ny * wide / 2), (x1 + nx * 3, y1 + ny * 3)]; b = [(x0 - nx * wide / 2, y0 - ny * wide / 2), (x1 - nx * 3, y1 - ny * 3)]
    n = int(L / 12)
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n; side = k % 2
        p0 = (a[0][0] + (a[1][0] - a[0][0]) * t0, a[0][1] + (a[1][1] - a[0][1]) * t0) if side else (b[0][0] + (b[1][0] - b[0][0]) * t0, b[0][1] + (b[1][1] - b[0][1]) * t0)
        p1 = (b[0][0] + (b[1][0] - b[0][0]) * t1, b[0][1] + (b[1][1] - b[0][1]) * t1) if side else (a[0][0] + (a[1][0] - a[0][0]) * t1, a[0][1] + (a[1][1] - a[0][1]) * t1)
        d.line([p0, p1], fill=C[2], width=2)
    for r_ in (a, b): d.line(r_, fill=OUT, width=6); d.line(r_, fill=C[3], width=3); d.line(r_, fill=C[4], width=1)


def crane(tm, x, y, w, h, st, v, c):
    """A dock crane from above, its jib out over the water to the south and a load on its hook. Dark Ages: an open
    treadwheel crane, a great wheel of rungs beside its post on crossed sill beams; Long Night and Renaissance: the
    same in a housing under a pyramid roof of the place's tiles or shingles; Age of Reason: an open post crane with
    two wheels and a braced jib; Victorian: a steam crane, riveted cab and chimney on a stone plinth, a lattice jib;
    Great War: the same, coal-black with wear; Mid-Century: an electric portal crane on four legs; Modern: a hydraulic
    crane with hazard stripes and a glazed cab; Future Darkness: a dark composite gantry with lit seams. From the
    steam crane on these are factory steel, the same the world over: they differ by maker's livery (black, grey, red,
    blue, green, cream), by jib (an open lattice, a plated box, or a luffing jib held up by stays from an A-frame),
    by reach, by load and by whether it travels on quay rails or stands on a pedestal, never by region."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2
    load = c.axis("load", "bale"); per, era = c.per, c.era
    reach = c.axis("reach", "long"); jib = c.axis("jib", "lattice")
    tip = (cx + (8 if c.ek % 2 else -8), Y1 - 20) if per in "ME" else ((cx + (8 if c.ek % 2 else -8), Y1 - 20) if reach == "long" else (cx + (22 if c.ek % 2 else -22), Y1 - 42))
    reg = "style" in c.v                                                                                       # a regional look only while it is still made by local hands
    if per in "MEV": slab(tm, X0, Y0, X1, Y1 - 30, c.stone, None, gaps=range(14, H - 30, 14))                  # the quay's paving
    elif per in "WN":
        Cn = ramp((172, 170, 164), 10); slab(tm, X0, Y0, X1, Y1 - 30, Cn, None, gaps=range(40, H - 30, 40))
        d.rectangle([X0 + 2, Y1 - 38, X1 - 2, Y1 - 33], fill=c.trim[3])
    else: d.rectangle([X0, Y0, X1, Y1 - 30], fill=c.comp[0], outline=OUT); d.line([X0 + 2, Y1 - 33, X1 - 2, Y1 - 33], fill=c.glow[1], width=2)
    if per in "ME" and era in ("dark-ages", "age-of-reason"):
        pcy = Y0 + int(H * .42)
        for (ax, ay, bx, by) in ((X0 + 6, Y0 + 6, X1 - 6, Y1 - 50), (X1 - 6, Y0 + 6, X0 + 6, Y1 - 50)):     # crossed sill beams
            d.line([ax, ay, bx, by], fill=OUT, width=14); d.line([ax, ay, bx, by], fill=c.wood[2], width=11); d.line([ax + 1, ay - 3, bx + 1, by - 3], fill=c.wood[4], width=2)
        for wy in ((Y0 + 14,) if era == "dark-ages" else (Y0 + 10, pcy + 18)):                              # the treadwheel(s)
            wx0, wx1 = X0 + 8, X1 - 8; hh = 40 if era == "dark-ages" else 30
            d.rounded_rectangle([wx0, wy, wx1, wy + hh], 8, fill=c.wood[0], outline=OUT)
            d.rectangle([wx0 + 4, wy + 2, wx1 - 4, wy + 6], fill=c.wood[3]); d.rectangle([wx0 + 4, wy + hh - 6, wx1 - 4, wy + hh - 2], fill=c.wood[1])   # the two rims
            for k in range(wx0 + 6, wx1 - 4, 6): d.line([k, wy + 7, k, wy + hh - 7], fill=c.wood[3], width=3)                                          # the treads
            d.rectangle([cx - 4, wy - 4, cx + 4, wy + hh + 4], fill=c.iron[2], outline=OUT)                    # its axle
        d.ellipse([cx - 11, pcy - 11, cx + 11, pcy + 11], fill=c.wood[2], outline=OUT); d.ellipse([cx - 7, pcy - 7, cx + 7, pcy + 7], fill=c.wood[3]); d.arc([cx - 9, pcy - 9, cx + 9, pcy + 9], 200, 290, fill=c.wood[4], width=2)
        d.line([cx, pcy, tip[0], tip[1]], fill=OUT, width=14); d.line([cx, pcy, tip[0], tip[1]], fill=c.wood[2], width=10); d.line([cx - 3, pcy, tip[0] - 3, tip[1]], fill=c.wood[4], width=2)
        for t in (.35, .7): d.line([cx + (tip[0] - cx) * t - 6, pcy + (tip[1] - pcy) * t, cx + (tip[0] - cx) * t + 6, pcy + (tip[1] - pcy) * t], fill=c.iron[1], width=3)
        if era == "age-of-reason": d.line([X0 + 20, pcy + 6, tip[0], tip[1] - 30], fill=c.wood[1], width=6)        # the brace
        if c.rich: motif(tm, X0 + 16, Y1 - 46, X1 - 16, Y1 - 38, c)
        if c.poor or c.w == 3 and c.style in ("africa", "seasia", "oceania", "polar"): lash(d, cx - 6, pcy + 16, HEMP, 4)
    elif per in "ME":
        rx0, ry0, rx1, ry1 = X0 + 4, Y0 + 4, X1 - 4, Y0 + int(H * .66); mx, my = (rx0 + rx1) // 2, (ry0 + ry1) // 2
        tiles = c.style in ("central", "mediterranean", "islamic", "eastasia", "southasia") or c.rich
        R_ = c.paint if tiles else c.wood
        faces = (((rx0, ry0), (rx1, ry0), (mx, my)), ((rx1, ry0), (rx1, ry1), (mx, my)), ((rx1, ry1), (rx0, ry1), (mx, my)), ((rx0, ry1), (rx0, ry0), (mx, my)))
        for f, lv in zip(faces, (4, 1, 0, 3)): d.polygon(f, fill=R_[lv], outline=OUT)
        for k in range(1, 7):                                                                                  # courses of tile or shingle
            t = k / 7
            for (p, q), lv in zip((((rx0, ry0), (rx1, ry0)), ((rx1, ry0), (rx1, ry1)), ((rx1, ry1), (rx0, ry1)), ((rx0, ry1), (rx0, ry0))), (3, 0, 1, 2)):
                d.line([p[0] + (mx - p[0]) * t, p[1] + (my - p[1]) * t, q[0] + (mx - q[0]) * t, q[1] + (my - q[1]) * t], fill=R_[lv] if lv != 1 else R_[0])
        d.line([rx0, ry0, mx, my, rx1, ry1], fill=R_[2]); d.line([rx1, ry0, mx, my, rx0, ry1], fill=R_[2])
        if c.rich:
            motif(tm, rx0 + 6, ry1 - 7, rx1 - 6, ry1 - 1, c); d.line([mx, my, mx + 10, my - 6], fill=c.metal[2], width=2); d.polygon([(mx + 10, my - 6), (mx + 20, my - 4), (mx + 10, my)], fill=c.trim[3], outline=OUT)
        if era == "long-night":
            for k in (ry0 + 6, ry1 - 8): d.line([rx0 + 4, k, rx1 - 4, k], fill=c.iron[1], width=2)
        d.line([mx, my, tip[0], tip[1]], fill=OUT, width=14); d.line([mx, my, tip[0], tip[1]], fill=c.wood[2], width=10); d.line([mx - 3, my, tip[0] - 3, tip[1]], fill=c.wood[4], width=2)   # the jib out over the roof
        for t in (.3, .6, .9): d.line([mx + (tip[0] - mx) * t - 6, my + (tip[1] - my) * t, mx + (tip[0] - mx) * t + 6, my + (tip[1] - my) * t], fill=c.iron[1], width=3)
        knob(tm, mx, my, c.metal, 5)
    else:
        pc = (cx, Y0 + int(H * .3)); jw = 26
        Lv = liv(c, c.axis("make", "black"), fk=.9)
        if c.axis("mount", "pedestal") == "rails":                                                              # a travelling crane on quay rails
            for yy in range(Y0 + 4, Y1 - 32, 9): d.rectangle([X0 + 6, yy, X1 - 6, yy + 3], fill=(84, 64, 48) if per != "F" else c.comp[1], outline=OUT)
            for rx_ in (X0 + 14, X1 - 18): d.rectangle([rx_, Y0 + 2, rx_ + 4, Y1 - 31], fill=STEEL[3], outline=OUT); d.line([rx_ + 1, Y0 + 3, rx_ + 1, Y1 - 32], fill=STEEL[4])
        if per == "W" and era == "mid-century" or per == "F":
            for lx, ly in ((X0 + 4, Y0 + 4), (X1 - 22, Y0 + 4), (X0 + 4, Y0 + int(H * .62)), (X1 - 22, Y0 + int(H * .62))):
                d.rectangle([lx, ly, lx + 18, ly + 18], fill=Lv[1], outline=OUT)
            d.rectangle([X0 + 8, Y0 + 8, X1 - 8, Y0 + int(H * .62) + 14], outline=Lv[0], width=4)
        elif per == "V":
            d.rectangle([X0 + 12, Y0 + 12, X1 - 12, Y0 + int(H * .7)], fill=c.stone[2], outline=OUT)
            for k in range(Y0 + 24, Y0 + int(H * .7), 14): d.line([X0 + 13, k, X1 - 13, k], fill=c.stone[1])
        else:                                                                                                  # a steel pedestal base in the maker's paint
            if c.axis("mount", "pedestal") == "rails": d.rectangle([X0 + 22, Y0 + 30, X1 - 22, Y0 + int(H * .5)], fill=Lv[1], outline=OUT)   # the travelling bogie frame
            else: d.rectangle([X0 + 12, Y0 + 12, X1 - 12, Y0 + int(H * .7)], fill=Lv[2], outline=OUT); d.rectangle([X0 + 16, Y0 + 16, X1 - 16, Y0 + int(H * .7) - 4], outline=Lv[0])
            for k in ((X0 + 16, X1 - 18) if c.axis("mount", "pedestal") != "rails" else ()):
                for yy in range(Y0 + 20, Y0 + int(H * .7) - 4, 10): rivet(tm, k, yy, IRON) if era == "great-war" else d.point((k, yy), fill=Lv[4])
        r = int(W * .24); d.ellipse([pc[0] - r, pc[1] - r, pc[0] + r, pc[1] + r], fill=Lv[1] if per != "F" else c.comp[2], outline=OUT); d.arc([pc[0] - r + 2, pc[1] - r + 2, pc[0] + r - 2, pc[1] + r - 2], 180, 270, fill=IRON[4], width=2)
        for a_ in range(0, 360, 30): rivet(tm, pc[0] + math.cos(math.radians(a_)) * (r - 4), pc[1] + math.sin(math.radians(a_)) * (r - 4), IRON)
        body = Lv
        if jib == "luffing":                                                                                     # the A-frame and its stays
            ax_ = pc[0] + (-34 if c.ek % 2 else 34)
            d.line([pc[0], pc[1], ax_, pc[1] - 24], fill=OUT, width=6); d.line([pc[0], pc[1], ax_, pc[1] - 24], fill=body[3], width=3)
            d.line([ax_, pc[1] - 24, tip[0], tip[1]], fill=STEEL[1], width=1); d.line([ax_ + 3, pc[1] - 24, tip[0] + 2, tip[1]], fill=STEEL[1], width=1)
            d.rectangle([ax_ - 6, pc[1] - 30, ax_ + 6, pc[1] - 18], fill=IRON[1], outline=OUT)                       # its counterweight
        cx0, cy0, cx1, cy1 = pc[0] - 38, pc[1] - 34, pc[0] + 38, pc[1] + 14
        d.rectangle([cx0, cy0, cx1, cy1], fill=body[2], outline=OUT); d.line([cx0 + 1, cy0 + 1, cx1 - 1, cy0 + 1], fill=body[4]); d.line([cx0 + 1, cy1 - 1, cx1 - 1, cy1 - 1], fill=body[0])
        if per == "V" or (per == "W" and era == "great-war"):
            for k in range(cx0 + 4, cx1, 8): rivet(tm, k, cy0 + 4); rivet(tm, k, cy1 - 4)
            d.ellipse([cx0 + 8, cy0 + 8, cx0 + 26, cy0 + 26], fill=IRON[0], outline=OUT); d.ellipse([cx0 + 12, cy0 + 12, cx0 + 22, cy0 + 22], fill=(16, 14, 16))   # chimney
            d.ellipse([cx1 - 24, cy0 + 8, cx1 - 8, cy0 + 24], fill=c.metal[2] if c.rich else IRON[3], outline=OUT)                                      # steam dome
        elif per == "N":
            hazard(d, cx0 + 2, cy0 + 2, cx1 - 2, cy0 + 9)
            d.rectangle([cx0 + 6, cy1 - 14, cx1 - 6, cy1 - 4], fill=(90, 150, 190), outline=OUT); d.line([cx0 + 8, cy1 - 12, cx0 + 24, cy1 - 12], fill=(200, 230, 240))
        elif per == "F":
            d.line([cx0 + 3, cy1 - 3, cx1 - 3, cy1 - 3], fill=c.glow[1], width=2); d.line([cx0 + 3, cy0 + 3, cx0 + 3, cy1 - 3], fill=c.glow[1]); d.rectangle([cx0 + 18, cy0 + 12, cx1 - 18, cy0 + 26], fill=c.glow[0], outline=c.glow[1])
        else:
            d.rectangle([cx0 + 6, cy1 - 14, cx1 - 6, cy1 - 4], fill=(120, 150, 160), outline=OUT)
        if c.rich and per != "F":
            if reg: motif(tm, cx0 + 4, cy0 + 14 if per != "N" else cy0 + 12, cx1 - 4, cy0 + 22 if per != "N" else cy0 + 20, c)
            else: d.rectangle([pc[0] - 8, cy0 + 12, pc[0] + 8, cy0 + 18], fill=c.metal[3], outline=OUT); d.line([pc[0] - 5, cy0 + 15, pc[0] + 5, cy0 + 15], fill=c.metal[1])   # the maker's plate
        j0 = (pc[0], cy1 - 6)                                                                                  # the jib from the cab's front out over the water
        if per in "VW" and jib == "box": jw = 34                                                               # a heavier double lattice before plated jibs
        if per == "F" and jib != "box": _jib_lattice(d, j0[0], j0[1], tip[0], tip[1], [c.comp[0], c.comp[1], c.comp[3], c.glow[0], c.glow[1]], jw)
        elif per in "NF" and jib == "box":
            d.polygon([(j0[0] - 13, j0[1]), (j0[0] + 13, j0[1]), (tip[0] + 5, tip[1]), (tip[0] - 5, tip[1])], fill=body[2], outline=OUT)
            d.line([j0[0] - 11, j0[1] + 1, tip[0] - 4, tip[1]], fill=body[4], width=2)
            for t in np.arange(.15, .95, .14):
                yy = j0[1] + (tip[1] - j0[1]) * t; xx = j0[0] + (tip[0] - j0[0]) * t; q = 10 - 6 * t; d.line([xx - q, yy - 3, xx, yy + 2, xx + q, yy - 3], fill=WHITE[4], width=2)
        else: _jib_lattice(d, j0[0], j0[1], tip[0], tip[1], body, jw)
    d.line([tip[0], tip[1], tip[0], tip[1] + 6], fill=HEMP[1] if per in "ME" else STEEL[1], width=2)
    if load != "empty": _load(d, tip[0], tip[1] + 6, load, c)
    else: d.ellipse([tip[0] - 3, tip[1] + 3, tip[0] + 3, tip[1] + 9], fill=IRON[3], outline=OUT)


CRANE_MODELS = [dict(make=m, jib=j, reach=r, load=ld, mount=mt) for m, j, r, ld, mt in (
    ("grey", "box", "short", "cask", "pedestal"), ("green", "lattice", "long", "sacks", "pedestal"), ("red", "box", "short", "pipes", "pedestal"),
    ("red", "luffing", "long", "crate", "rails"), ("white", "box", "long", "girders", "rails"), ("white", "luffing", "short", "bale", "pedestal"),
    ("black", "luffing", "long", "pipes", "rails"), ("black", "lattice", "short", "pipes", "pedestal"), ("grey", "luffing", "long", "crate", "rails"),
    ("blue", "box", "long", "crate", "rails"))]

define("crane", draw=_obj(crane, "dark-ages", off=5, presets=CRANE_MODELS), front=True, clear=3, tags=("quay", "warehouse"), global_from=1860,
       axes={"model": list(range(len(CRANE_MODELS)))},
       ref="harbour treadwheel and later steam and electric quay cranes; the working base of a quay crane is about 10 ft square (Gdansk and Bruges crane drawings, dockside crane catalogues)")


def bollard(tm, x, y, w, h, st, v, c):
    """A mooring bollard from above, set in its square coping stone at the quay's edge. Dark Ages and Long Night: a
    squared oak post, its top end-grain worn and an iron cap on the rich ones; Renaissance and Age of Reason: a worn-out
    cannon set muzzle up where a navy left cannon to spare (a squared post elsewhere, turned and iron-capped in the Age
    of Reason) (in the Age of Reason with a shot rammed into the muzzle and a granite collar); Victorian: a cast-iron bollard with its flared cap; Great War: a painted double iron bitt;
    Mid-Century: a single cast mushroom bollard with a horn; Modern: a steel tee bollard in yellow; Future Darkness: a composite post with a lit ring. A mooring line
    may be thrown round it."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2 - 1; per = c.per; r = (X1 - X0) // 2 - 6
    slab(tm, X0, Y0, X1, Y1, c.stone, None)                                                                    # the coping stone
    d.line([X0 + 2, Y1 - 4, X1 - 2, Y1 - 4], fill=c.stone[0])                                                    # the quay's edge
    if c.rich: d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + 5], fill=c.trim[2])
    cannon = c.style in ("central", "atlantic", "northern", "mediterranean", "islamic")
    if per == "E" and not cannon and c.era == "age-of-reason":                                                 # a turned post with an iron cap
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.wood[2], outline=OUT); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=c.iron[2], outline=OUT)
    elif per == "M" or per == "E" and not cannon:
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=c.wood[2], outline=OUT)
        for k in (r - 3, r - 7): d.rectangle([cx - k, cy - k, cx + k, cy + k], outline=c.wood[1 if k % 2 else 3])
        if c.rich or c.ek: d.rectangle([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], outline=c.metal[2], width=2)
    elif per == "E":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.iron[2] if not c.rich else c.metal[1], outline=OUT); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=IRON[0])
        d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 180, 270, fill=IRON[4], width=2)
        if c.era == "age-of-reason":                                                                       # a shot rammed into the muzzle, a granite collar round it
            d.ellipse([cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6], outline=OUT, width=7); d.ellipse([cx - r - 5, cy - r - 5, cx + r + 5, cy + r + 5], outline=c.stone[4], width=4)
            d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=IRON[3], outline=OUT); d.ellipse([cx - 5, cy - 6, cx - 1, cy - 2], fill=IRON[4])
            d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], outline=IRON[1], width=2)
    elif per == "V":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.paint[1] if c.w >= 2 else IRON[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=c.paint[3] if c.w >= 2 else IRON[3])
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=c.paint[4] if c.w >= 2 else IRON[4])
    elif per == "W" and c.era == "mid-century":                                                          # a single cast mushroom bollard with its horn
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.paint[1], outline=OUT); d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], fill=c.paint[3], outline=c.paint[0])
        d.rectangle([cx - 4, cy - r - 2, cx + 4, cy - r + 6], fill=c.paint[2], outline=OUT)
    elif per == "W":
        for bx in (cx - r // 2 - 2, cx + r // 2 + 2):
            d.ellipse([bx - r // 2, cy - r // 2, bx + r // 2, cy + r // 2], fill=c.paint[2], outline=OUT); d.ellipse([bx - 2, cy - 2, bx + 2, cy + 2], fill=c.paint[4])
        d.rectangle([cx - r, cy + r // 2, cx + r, cy + r // 2 + 4], fill=c.paint[1], outline=OUT)
    elif per == "N":
        d.rectangle([cx - r, cy - 4, cx + r, cy + 4], fill=c.livery[2], outline=OUT); d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=c.livery[3], outline=OUT)
        d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=HAZ[1])
    else:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.comp[1], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=c.glow[1]); d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=c.trim[3])
    line = c.axis("line", "none")
    if line != "none":
        C_ = HEMP if line == "rope" else TAR
        d.arc([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], 100, 420, fill=C_[2], width=3)
        rope(d, [(cx + 2, cy + r + 2), (cx + 4, Y1 - 2)], C_, 2)


define("bollard", draw=_obj(bollard, "dark-ages"), tags=("quay",), axes={"line": ["none", "rope", "hawser"]},
       ref="quayside bollards of timber, old cannon and cast iron, 1 to 1 1/2 ft across, set in a coping stone (harbour works drawings)")


def fibre(c):
    """The rope fibre of a people before machine rope: coir and palm in the south and the islands, hide thong and yak
    hair in the far north and the steppe, agave in the Americas, tarred hemp on the Atlantic, hemp or bast elsewhere."""
    st_ = c.style
    if st_ in ("southasia", "seasia", "oceania", "africa"): return (150, 96, 54)
    if st_ in ("polar", "steppe"): return (120, 84, 56) if st_ == "polar" else (70, 56, 48)
    if st_ == "americas": return (200, 196, 150)
    if st_ == "islamic": return (170, 130, 80)
    if st_ == "eastasia": return (190, 170, 120)
    if c.per == "E": return (96, 74, 54) if st_ in ("atlantic", "northern") else (160, 132, 90)
    return (178, 156, 108) if st_ != "northern" else (150, 130, 96)


# how thick each age's rope lies and how many turns its coil takes: thick bast and hide early, finer laid hemp in the
# Age of Reason, heavy wire in the Great War, thin braided nylon in the Modern age
ROPELAY = {"dark-ages": (4, 22), "long-night": (5, 18), "renaissance": (3, 28), "age-of-reason": (2, 37), "victorian": (3, 31),
           "great-war": (5, 16), "mid-century": (3, 27), "modern": (2, 44), "future-darkness": (3, 30)}


def ropecoil(tm, x, y, w, h, st, v, c):
    """A coil of rope on the floor from above, its loose end running off. The fibre follows the age and the land:
    bast, hemp and tarred hemp in the north, coir and palm fibre in the south and the islands, hide thong in the far
    north and the steppe, manila in the Victorian age, sisal and wire rope in the wars, nylon in bright colours in
    the Modern age and dark synthetic with a lit tracer in the Future. A flemish coil is a neat flat spiral; a loose
    coil lies in uneven loops; a hank is bound with ties. The poor have frayed ends."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; R_ = (X1 - X0) // 2 - 2
    per, st_ = c.per, c.style
    if per == "N": base = {"central": (40, 90, 190), "atlantic": (230, 210, 40), "northern": (220, 70, 40), "mediterranean": (240, 240, 230), "islamic": (40, 160, 150),
                           "steppe": (240, 130, 30), "southasia": (230, 190, 40), "eastasia": (200, 40, 40), "seasia": (60, 170, 70), "africa": (120, 80, 40),
                           "americas": (190, 50, 120), "oceania": (210, 180, 120), "polar": (230, 110, 30)}[st_]
    elif per == "F": base = mix((50, 54, 64), c.S["paint"], .3)
    elif per == "W" and c.ek == 5 and c.w >= 4: base = (150, 154, 160)                                      # wire rope
    elif st_ in ("southasia", "seasia", "oceania", "africa"): base = (150, 96, 54)                         # coir and palm fibre
    elif st_ in ("polar", "steppe"): base = (120, 84, 56) if st_ == "polar" else (70, 56, 48)              # hide thong, yak hair
    elif st_ == "americas": base = (200, 196, 150)                                                         # agave fibre
    elif st_ == "islamic": base = (170, 130, 80)
    elif st_ == "eastasia": base = (190, 170, 120)
    elif per == "V": base = (196, 164, 96)                                                                 # manila
    elif per == "E": base = (96, 74, 54) if st_ in ("atlantic", "northern") else (160, 132, 90)            # tarred hemp
    else: base = (178, 156, 108) if st_ != "northern" else (150, 130, 96)
    base = mix(base, c.S["paint"], .18)
    if c.poor: base = mix(base, GREY, .35)
    Cr = ramp(base, 18); kind = c.axis("coil", "flemish"); rng = np.random.default_rng(c.ek * 31 + len(st_))
    rw, turns = ROPELAY[c.era]
    d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], fill=Cr[0])
    if kind == "flemish":
        pts = [(cx + math.cos(t) * (3 + t * R_ / (turns + 2)), cy + math.sin(t) * (3 + t * R_ / (turns + 2))) for t in np.arange(0, turns, .25)]
        rope(d, pts, Cr, rw)
    elif kind == "loose":
        for k in range(max(3, turns // 5)):
            rr = R_ - 2 - k * (rw + 1); ox, oy = rng.uniform(-3, 3), rng.uniform(-3, 3)
            if rr < 4: break
            pts = [(cx + ox + math.cos(t) * rr, cy + oy + math.sin(t) * rr * .92) for t in np.arange(0, 6.4, .3)]; rope(d, pts, Cr, rw)
    else:
        for k in range(max(3, turns // 6)):
            rr = R_ - 3 - k * rw; pts = [(cx + math.cos(t) * rr, cy + math.sin(t) * rr) for t in np.arange(0, 6.4, .3)]; rope(d, pts, Cr, rw)
        for a_ in ((0, 2.1, 4.2) if turns % 2 == 0 else (0, 1.57, 3.14, 4.71)):
            px_, py_ = cx + math.cos(a_) * (R_ - 7), cy + math.sin(a_) * (R_ - 7); d.line([px_ - math.cos(a_) * 8, py_ - math.sin(a_) * 8, px_ + math.cos(a_) * 5, py_ + math.sin(a_) * 5], fill=c.cloth[1] if not c.poor else HEMP[0], width=3)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=Cr[0], outline=OUT)
    end = [(cx + R_ - 4, cy + 2), (X1 - 4, Y1 - 10), (X1 - 10, Y1 - 3)]; rope(d, end, Cr, 3)
    ex, ey = end[-1]
    if c.rich: d.rectangle([ex - 2, ey - 3, ex + 3, ey + 2], fill=c.trim[2], outline=OUT)                    # a whipped end in coloured twine
    elif c.poor:
        for k in range(3): d.line([ex, ey, ex - 5 + k * 2, ey + 3], fill=Cr[3])                             # frayed
    if per == "F": d.arc([cx - R_ + 3, cy - R_ + 3, cx + R_ - 3, cy + R_ - 3], 200, 330, fill=c.glow[1], width=2)


define("ropecoil", draw=_obj(ropecoil, "dark-ages"), tags=("quay", "boat", "store", "warehouse"), axes={"coil": ["flemish", "loose", "hank"]},
       ref="a coil of 30 to 40 fathoms of 1 to 2 in rope lies about 2 ft across (seamanship manuals)")


def anchor(tm, x, y, w, h, st, v, c):
    """An anchor lying on the quay from above, its shank along the length, the ring to the west and the arms to the
    east. Dark Ages and Long Night: a forged iron anchor with curved arms and a wooden stock, or a stone killick in a
    lashed wooden frame where iron is dear (and always in the far north, the islands, Africa and the Americas before
    the settlers); East Asia keeps a four-armed grapnel and a stone-stocked wooden anchor; Renaissance and Age of
    Reason: the Admiralty pattern with broad flukes and an oak stock; Victorian: the iron-stocked Admiralty anchor;
    Great War: the stockless anchor with pivoting flukes; Mid-Century: also the Danforth;
    in the Long Night the arms are straight, meeting the shank in a V, the grapnel has five arms and the killick's
    stone an iron band; in the Age of Reason the ring is puddened; Modern: a galvanised plough anchor; Future
    Darkness: a dark composite claw with a lit tag. Its cable is a rope, a chain or nothing."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2; per, st_ = c.per, c.style
    Fe = c.comp if per == "F" else ramp(mix(c.iron[2] if per != "N" else (168, 172, 176), c.S["paint"], .42 if per in "ME" else .6), 18)
    stone = per in "ME" and (c.poor and per == "M" or st_ in ("polar", "oceania", "africa", "americas" if per == "M" else "-"))
    cable = c.axis("cable", "rope")
    rx = X0 + 10
    if cable == "rope": rope(d, [(rx, cy), (X0 + 4, Y0 + 8), (X0 + 30, Y0 + 3), (X0 + 60, Y0 + 6)], ramp(fibre(c), 18) if per in "ME" else HEMP, 4)
    elif cable == "chain": chain(d, [(rx, cy), (X0 + 4, Y1 - 6), (X0 + 40, Y1 - 4), (X0 + 70, Y1 - 6)], STEEL if per in "NF" else IRON)
    if stone:
        M_ = region_mat(c)
        d.ellipse([X0 + W * .3, cy - H * .32, X0 + W * .72, cy + H * .32], fill=c.stone[2], outline=OUT); d.arc([X0 + W * .3 + 3, cy - H * .32 + 3, X0 + W * .72 - 3, cy + H * .32 - 3], 160, 260, fill=c.stone[4], width=2)
        for yy in (cy - 8, cy + 8): d.line([rx + 4, yy, X1 - 6, yy + (yy - cy) // 2], fill=OUT, width=5); d.line([rx + 4, yy, X1 - 6, yy + (yy - cy) // 2], fill=M_[3], width=3)
        for xx in (X0 + int(W * .3), X0 + int(W * .72)): lash(d, xx, cy - 10, HEMP, 4); lash(d, xx, cy + 6, HEMP, 4)
        if c.era == "long-night": d.ellipse([X0 + W * .3 - 3, cy - H * .32 - 3, X0 + W * .72 + 3, cy + H * .32 + 3], outline=IRON[1], width=3)   # an iron band round the stone
        d.ellipse([rx - 5, cy - 5, rx + 5, cy + 5], outline=HEMP[2], width=3)
        if st_ == "polar" or c.style == "steppe": d.line([X1 - 14, cy - 12, X1 - 6, cy + 12], fill=WHITE[3], width=3)
        return
    si = list(STY).index(st_) + c.w; era_ = c.era
    form = {"M": "admiralty", "E": "admiralty", "V": ("admiralty", "grapnel", "stockless")[si % 3], "W": ("stockless", "admiralty", "grapnel")[si % 3] if era_ == "great-war" else ("danforth", "stockless", "admiralty")[si % 3],
            "N": ("plough", "danforth", "stockless", "grapnel")[si % 4], "F": ("claw", "plough", "danforth")[si % 3]}[per]
    if per in "ME" and st_ in ("eastasia", "islamic", "southasia", "seasia"): form = "grapnel"
    if per == "F": Fe = ramp(mix(c.comp[2], c.S["paint"], .45), 16)
    if form == "grapnel":
        hx = X0 + int(W * .62)                                                                                   # a four-armed grapnel
        d.line([rx, cy, hx, cy], fill=OUT, width=7); d.line([rx, cy, hx, cy], fill=Fe[2], width=5)
        for a_ in ((45, 135, 225, 315) if c.era != "long-night" else (0, 72, 144, 216, 288)):                     # five arms in the Long Night
            ex, ey = hx + math.cos(math.radians(a_)) * 22, cy + math.sin(math.radians(a_)) * 18
            d.line([hx, cy, ex, ey], fill=OUT, width=6); d.line([hx, cy, ex, ey], fill=Fe[3], width=4); d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=Fe[1])
        d.ellipse([rx - 6, cy - 6, rx + 6, cy + 6], outline=Fe[3], width=3)
        if c.era == "age-of-reason": d.ellipse([rx - 8, cy - 8, rx + 8, cy + 8], outline=HEMP[2], width=4)
        if c.rich: motif(tm, rx + 8, cy - 3, hx - 6, cy + 3, c)
        return
    ax = X1 - 8
    d.line([rx + 4, cy, ax, cy], fill=OUT, width=9); d.line([rx + 4, cy, ax, cy], fill=Fe[2], width=6); d.line([rx + 5, cy - 2, ax - 2, cy - 2], fill=Fe[4])   # the shank
    if form == "admiralty":
        if per == "M" and c.era == "long-night":                                                          # straight arms meeting the shank in a V
            for sgn in (-1, 1): d.line([ax, cy, ax - 14, cy + sgn * (H // 2 - 6)], fill=OUT, width=8); d.line([ax, cy, ax - 14, cy + sgn * (H // 2 - 6)], fill=Fe[3], width=5)
            fl = 9
        elif per == "M": d.arc([ax - 34, cy - 30, ax + 4, cy + 30], 300, 60, fill=OUT, width=8); d.arc([ax - 34, cy - 30, ax + 4, cy + 30], 300, 60, fill=Fe[3], width=5); fl = 6
        else: d.arc([ax - 40, cy - 34, ax + 2, cy + 34], 295, 65, fill=OUT, width=8); d.arc([ax - 40, cy - 34, ax + 2, cy + 34], 295, 65, fill=Fe[3], width=5); fl = 11
        for sgn in (-1, 1):                                                                                 # the flukes
            fx, fy = ax - 14, cy + sgn * (H // 2 - 6)
            d.polygon([(fx - fl, fy - sgn * 4), (fx + fl, fy - sgn * 2), (fx, fy + sgn * 4)], fill=Fe[2], outline=OUT)
        sx = rx + 14                                                                                         # the stock across
        if per in "VWN": d.line([sx, Y0 + 3, sx, Y1 - 3], fill=OUT, width=7); d.line([sx, Y0 + 3, sx, Y1 - 3], fill=Fe[3], width=4); knob(tm, sx, Y0 + 4, Fe, 3); knob(tm, sx, Y1 - 4, Fe, 3)
        else:
            Wd = c.paint if c.ek in (1, 3) else c.wood; d.rectangle([sx - 6, Y0 + 2, sx + 6, Y1 - 2], fill=Wd[2], outline=OUT); d.line([sx - 4, Y0 + 4, sx - 4, Y1 - 4], fill=Wd[4])
            for yy in (Y0 + 10, Y1 - 12, cy): d.rectangle([sx - 7, yy - 2, sx + 7, yy + 1], fill=Fe[1])
            if c.rich: motif(tm, sx - 4, Y0 + 14, sx + 4, cy - 6, c, 2)
    elif form == "stockless":
        d.rectangle([ax - 26, cy - H // 2 + 4, ax, cy + H // 2 - 4], fill=Fe[2], outline=OUT)                # the crown and its flukes
        for sgn in (-1, 1): d.polygon([(ax - 26, cy + sgn * (H // 2 - 4)), (ax - 46, cy + sgn * (H // 2 - 10)), (ax - 26, cy + sgn * 8)], fill=Fe[3], outline=OUT)
        d.ellipse([ax - 18, cy - 5, ax - 8, cy + 5], fill=Fe[0])
    elif form == "danforth":
        d.rectangle([ax - 6, Y0 + 4, ax - 1, Y1 - 4], fill=Fe[1], outline=OUT)                                     # the stock bar at the crown
        for sgn in (-1, 1): d.polygon([(ax - 4, cy + sgn * 6), (ax - 44, cy + sgn * 8), (ax - 40, cy + sgn * (H // 2 - 6)), (ax - 4, cy + sgn * (H // 2 - 8))], fill=Fe[3], outline=OUT)
    elif form == "plough":
        d.polygon([(ax - 40, cy), (ax, cy - H // 2 + 6), (ax + 2, cy - 4), (ax + 2, cy + 4), (ax, cy + H // 2 - 6)], fill=Fe[3], outline=OUT)   # the plough share
        d.line([ax - 36, cy, ax, cy - H // 2 + 8], fill=Fe[4]); d.line([ax - 36, cy, ax, cy + H // 2 - 8], fill=Fe[1])
    else:
        d.polygon([(ax - 30, cy), (ax, cy - H // 2 + 4), (ax - 8, cy), (ax, cy + H // 2 - 4)], fill=Fe[2], outline=c.glow[1]); d.rectangle([rx + 20, cy - 2, rx + 30, cy + 2], fill=c.glow[1])
    d.ellipse([rx - 6, cy - 6, rx + 6, cy + 6], outline=OUT, width=4); d.ellipse([rx - 5, cy - 5, rx + 5, cy + 5], outline=Fe[3], width=2)        # the ring
    if c.era == "age-of-reason":                                                                                                              # the ring puddened with old rope, and a buoy rope
        d.ellipse([rx - 8, cy - 8, rx + 8, cy + 8], outline=HEMP[2], width=4)
    if per in "WN" and c.w >= 2: d.rectangle([rx + 22, cy - 5, rx + 40, cy + 5], fill=c.paint[2], outline=OUT)                                    # painted band of the owner


define("anchor", draw=_obj(anchor, "dark-ages"), tags=("quay", "boat"), axes={"cable": ["rope", "chain", "none"]},
       ref="a ship's bower anchor of a coaster or a small merchantman, about 4 ft in the shank (maritime museum collections)")


def nets(tm, x, y, w, h, st, v, c):
    """Fishing nets from above: hung over a drying pole, heaped on the ground, or spread out for mending with the
    netting needle. A float line runs along the north edge and a weighted foot line along the south. Dark Ages to Age
    of Reason: hemp or linen mesh, wooden or cork floats, stone sinkers; gourd floats in Africa and the Americas,
    bamboo floats in the east; the Age of Reason hangs them on a net-rack with cork rings; Victorian: cotton
    barked brown in cutch, the first glass floats; Great War: tarred cotton with big green glass balls in string bags;
    Mid-Century: small pressed floats set close and a marker buoy; Modern: nylon in green, blue or orange with plastic floats;
    Future Darkness: grey monofilament with lit tags."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per, st_ = c.per, c.style
    if per == "N": base = {"central": (40, 110, 80), "atlantic": (40, 80, 150), "northern": (200, 80, 40), "mediterranean": (40, 130, 170), "islamic": (60, 150, 110),
                           "steppe": (150, 120, 60), "southasia": (190, 70, 110), "eastasia": (40, 140, 60), "seasia": (40, 90, 180), "africa": (210, 110, 30),
                           "americas": (180, 50, 50), "oceania": (60, 160, 150), "polar": (220, 120, 40)}[st_]
    elif per == "F": base = mix((120, 124, 132), c.S["paint"], .5)
    elif per == "V": base = mix((130, 76, 46), c.S["paint"], .45)
    elif per == "W": base = mix((70, 56, 46), c.S["paint"], .5)
    else: base = mix((176, 160, 120), c.S["paint"], .5)
    if c.poor: base = mix(base, GREY, .3)
    N_ = ramp(base, 16); M_ = region_mat(c); kind = c.axis("spread", "hung")
    if per in "ME": flt = {"africa": (200, 160, 70), "americas": (200, 160, 70), "eastasia": (200, 180, 100), "seasia": (200, 180, 100)}.get(st_, (176, 120, 70))
    elif per == "V": flt = (176, 120, 70) if c.ek % 2 else (120, 180, 170)
    elif per == "W": flt = (90, 170, 120)
    elif per == "N": flt = (240, 130, 30) if c.w <= 2 else (236, 236, 230)
    else: flt = (70, 200, 220)
    F_ = ramp(flt, 18)
    def mesh(x0, y0, x1, y1, s=5):
        d.rectangle([x0, y0, x1, y1], fill=N_[0]); Hh = y1 - y0
        for k in range(int(x0 - Hh), int(x1), s):
            t0, t1 = max(0, (x0 - k) / Hh), min(1, (x1 - k) / Hh)
            if t1 > t0: d.line([k + Hh * t0, y1 - Hh * t0, k + Hh * t1, y1 - Hh * t1], fill=N_[2])
        for k in range(int(x0), int(x1 + Hh), s):
            t0, t1 = max(0, (k - x1) / Hh), min(1, (k - x0) / Hh)
            if t1 > t0: d.line([k - Hh * t0, y1 - Hh * t0, k - Hh * t1, y1 - Hh * t1], fill=N_[3])
    if kind == "hung":
        mesh(X0 + 6, Y0 + 10, X1 - 6, Y1 - 6)
        for k in range(X0 + 20, X1 - 10, 26): d.line([k, Y0 + 12, k + 4, Y1 - 8], fill=N_[1], width=3)          # its folds
        d.line([X0, Y0 + 8, X1, Y0 + 8], fill=OUT, width=7); d.line([X0, Y0 + 8, X1, Y0 + 8], fill=M_[3], width=5)   # the drying pole
        for px_ in (X0 + 3, X1 - 3): d.ellipse([px_ - 4, Y0 + 4, px_ + 4, Y0 + 12], fill=M_[1], outline=OUT)
    elif kind == "heaped":
        for (ex, ey, rx_, ry_) in ((.4, .5, .36, .4), (.66, .55, .3, .36), (.5, .45, .22, .25)):
            x0_, y0_, x1_, y1_ = X0 + W * (ex - rx_), Y0 + H * (ey - ry_), X0 + W * (ex + rx_), Y0 + H * (ey + ry_)
            d.ellipse([x0_, y0_, x1_, y1_], fill=N_[1], outline=OUT); mesh(x0_ + 6, y0_ + 6, x1_ - 6, y1_ - 6, 4)
    else:
        mesh(X0 + 4, Y0 + 10, X1 - 4, Y1 - 10)
        d.rectangle([X0 + W // 2 - 10, Y0 + H // 2 - 8, X0 + W // 2 + 6, Y0 + H // 2 + 2], fill=N_[0])            # the hole being mended
        d.polygon([(X0 + W // 2 + 8, Y0 + H // 2), (X0 + W // 2 + 22, Y0 + H // 2 - 3), (X0 + W // 2 + 22, Y0 + H // 2 + 3)], fill=M_[3], outline=OUT)   # netting needle
        d.ellipse([X1 - 30, Y1 - 28, X1 - 8, Y1 - 6], fill=c.wood[2], outline=OUT); d.ellipse([X1 - 26, Y1 - 24, X1 - 12, Y1 - 10], fill=c.wood[3])           # the mender's stool
    era = c.era; fsp = {"age-of-reason": 24, "great-war": 24, "mid-century": 11}.get(era, 16)
    if era == "age-of-reason":                                                                                    # the net-rack's trestles at each end
        for tx in (X0 + 1, X1 - 7): d.rectangle([tx, Y0 + 2, tx + 6, Y1 - 2], fill=M_[2], outline=OUT); d.line([tx + 1, Y0 + 3, tx + 1, Y1 - 3], fill=M_[4])
    for k in range(X0 + 10, X1 - 6, fsp):                                                                         # floats along the head
        fy = Y0 + 10 if kind != "heaped" else Y0 + 6 + (k * 7) % 12
        if era == "age-of-reason": d.ellipse([k - 6, fy - 5, k + 6, fy + 5], fill=F_[2], outline=OUT); d.ellipse([k - 2, fy - 2, k + 2, fy + 2], fill=N_[0])   # cork rings
        elif era == "great-war":                                                                                  # big glass balls in their string bags
            d.ellipse([k - 7, fy - 7, k + 7, fy + 7], fill=F_[2], outline=OUT); d.line([k - 7, fy, k + 7, fy], fill=N_[1]); d.line([k, fy - 7, k, fy + 7], fill=N_[1]); d.rectangle([k - 4, fy - 4, k - 2, fy - 2], fill=WHITE[4])
        elif era == "mid-century": d.ellipse([k - 3, fy - 3, k + 3, fy + 3], fill=F_[3], outline=OUT)            # small pressed floats close together
        elif flt[1] > 150 and per in "VW" or per == "F": d.ellipse([k - 4, fy - 4, k + 4, fy + 4], fill=F_[2], outline=OUT); d.rectangle([k - 2, fy - 2, k - 1, fy - 1], fill=WHITE[4])
        else: d.rounded_rectangle([k - 5, fy - 3, k + 5, fy + 3], 2, fill=F_[2], outline=OUT); d.line([k - 3, fy - 2, k + 3, fy - 2], fill=F_[4])
    if era == "mid-century":                                                                                      # the marker buoy and its flag pole
        d.ellipse([X1 - 30, Y1 - 30, X1 - 8, Y1 - 8], fill=(226, 90, 40), outline=OUT); d.ellipse([X1 - 24, Y1 - 24, X1 - 14, Y1 - 14], fill=(240, 236, 226)); d.line([X1 - 19, Y1 - 19, X1 - 40, Y1 - 44], fill=OUT, width=3)
    for k in range(X0 + 14, X1 - 6, 18):                                                                          # sinkers along the foot
        fy = Y1 - 6 if kind != "heaped" else Y1 - 8 - (k * 5) % 10
        d.rectangle([k - 3, fy - 2, k + 3, fy + 2], fill=(110, 108, 104) if per in "ME" else IRON[3], outline=OUT)
    if c.rich: motif(tm, X0 + 10, Y1 - 4, X0 + 60, Y1 - 1, c, 3)


define("nets", draw=_obj(nets, "dark-ages"), tags=("quay", "boat", "riverbank"), axes={"spread": ["hung", "heaped", "mending"]},
       ref="a seine or drift net section hung or heaped to dry, about 6 by 4 ft on the ground (fishing museum photographs)")


# ================================================================ the office, the control room and the station hall
COLD = (1.05, 1.25, 1.45)


def shell(c, k=.45, base=(70, 72, 78)):
    """The enamel or plastic of a machine: the place's colour mixed with a maker's grey, lighter for the well-off."""
    if c.per == "F": return ramp(mix(c.comp[2], c.S["paint"], .3), 14)
    b = (200, 198, 190) if c.w >= 4 and c.per == "N" else base
    return ramp(mix(c.S["paint"], b, k if not c.poor else k + .15), 16)


def feed(d, x0, y0, x1, y1, lit, k, c):
    """A screen: a grey camera picture with a figure and scan lines when lit, dark glass with a gleam when out."""
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if lit:
        tint = (110, 150, 120) if c.per == "W" else (120, 140, 170)
        if c.per == "F": tint = c.glow[1]
        d.rectangle([x0, y0, x1, y1], fill=tone(tint, -40), outline=OUT)
        d.rectangle([x0 + 2, y0 + (y1 - y0) // 2, x1 - 2, y1 - 2], fill=tone(tint, -10))                     # the floor in the picture
        fx = x0 + 3 + (k * 7) % max(1, (x1 - x0 - 8)); d.rectangle([fx, y0 + 2, fx + 2, y1 - 3], fill=tone(tint, 50))   # a figure
        for yy in range(y0 + 2, y1 - 1, 2): d.line([x0 + 1, yy, x1 - 1, yy], fill=tone(tint, -55))
    else:
        d.rectangle([x0, y0, x1, y1], fill=(22, 24, 30), outline=OUT); d.line([x0 + 2, y1 - 2, x0 + 6, y0 + 2], fill=(70, 76, 90), width=2)


# ================================================================ the taproom
BALLS = [(236, 200, 40), (40, 70, 180), (200, 40, 40), (100, 40, 140), (230, 120, 30), (40, 130, 60), (130, 40, 40), (20, 20, 22)]


def pooltable(tm, x, y, w, h, st, v, c):
    """A billiard or pool table from above: broad cushioned rails of the place's wood with ivory or pearl sight
    spots, six pockets, the cloth inside with the balls and a cue lying along it. Age of Reason: a billiard table of
    oak or walnut with narrow rails, net pockets, no sights, two ivory balls and a mace; Victorian: a heavy mahogany
    English billiard table with broad rails, turned corner blocks and three balls; Great War and Mid-Century: a pool table with the fifteen coloured balls; Modern: a coin-op
    bar table; Future Darkness: a dark table with lit pockets. Balls racked, in play or cleared away. The cloth is
    green, or the blue, red or wine the land likes."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; game = c.axis("game", "racked")
    Wd = c.wood if per != "N" else shell(c, .35, (60, 50, 44)); rw = {"E": 9, "V": 16}.get(per, 10)
    if per == "F": Wd = c.comp
    d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=Wd[2], outline=OUT); d.line([X0 + 5, Y0 + 1, X1 - 5, Y0 + 1], fill=Wd[4]); d.line([X0 + 5, Y1 - 1, X1 - 5, Y1 - 1], fill=Wd[0])
    if c.rich and per != "F": motif(tm, X0 + 16, Y0 + 2, X1 - 16, Y0 + rw - 3, c); motif(tm, X0 + 16, Y1 - rw + 3, X1 - 16, Y1 - 2, c)
    felt = mix((40, 120, 60), c.S["paint"], .4)
    if c.poor: felt = mix(felt, GREY, .3)
    F_ = ramp(felt, 12)
    fx0, fy0, fx1, fy1 = X0 + rw, Y0 + rw, X1 - rw, Y1 - rw
    d.rectangle([fx0 - 3, fy0 - 3, fx1 + 3, fy1 + 3], fill=F_[0]); d.rectangle([fx0, fy0, fx1, fy1], fill=F_[2])            # cushions and the bed
    d.line([fx0, fy0, fx1, fy0], fill=F_[0]); d.line([fx0 + W // 4, fy0, fx0 + W // 4, fy1], fill=F_[3])                       # the baulk line
    for px_, py_ in ((X0 + 7, Y0 + 7), (X1 - 7, Y0 + 7), (X0 + 7, Y1 - 7), (X1 - 7, Y1 - 7), (X0 + W // 2, Y0 + 6), (X0 + W // 2, Y1 - 6)):
        if per == "E":                                                                                                         # the net pockets hung under
            d.ellipse([px_ - 7, py_ - 7, px_ + 7, py_ + 7], fill=(150, 140, 120), outline=OUT); d.line([px_ - 5, py_, px_ + 5, py_], fill=(80, 70, 60)); d.line([px_, py_ - 5, px_, py_ + 5], fill=(80, 70, 60))
        else: d.ellipse([px_ - 6, py_ - 6, px_ + 6, py_ + 6], fill=(14, 12, 14) if per != "F" else c.glow[1], outline=c.metal[2] if c.rich else OUT)
    if per == "V":                                                                                                           # the heavy turned corner blocks
        for px_, py_ in ((X0 + 7, Y0 + 7), (X1 - 7, Y0 + 7), (X0 + 7, Y1 - 7), (X1 - 7, Y1 - 7)): d.rectangle([px_ - 8, py_ - 8, px_ + 8, py_ + 8], outline=Wd[0], width=2)
    for k in (range(1, 8) if per != "E" else ()):                                                                           # sight spots
        if k == 4: continue
        sx = X0 + k * W // 8; d.rectangle([sx - 1, Y0 + 3, sx + 1, Y0 + 4], fill=WHITE[4]); d.rectangle([sx - 1, Y1 - 4, sx + 1, Y1 - 3], fill=WHITE[4])
    def ball(bx, by, col): d.ellipse([bx - 3, by - 3, bx + 3, by + 3], fill=col, outline=OUT); d.point((bx - 1, by - 1), fill=WHITE[4])
    cy = (fy0 + fy1) // 2
    if per in "EV":
        if game != "cleared":
            pts = ((fx1 - 30, cy), (fx0 + 20, cy - 8), (fx0 + 26, cy + 10)) if game == "racked" else ((fx0 + W // 2, cy - 10), (fx1 - 20, cy + 12), (fx0 + 40, cy + 4))
            for (bx, by), col in list(zip(pts, ((200, 40, 40), WHITE[4], (230, 220, 160))))[:2 if per == "E" else 3]: ball(bx, by, col)
    elif game == "racked":
        k = 0
        for col_ in range(5):
            for r_ in range(col_ + 1): ball(fx1 - 40 + col_ * 6, cy - col_ * 3.5 + r_ * 7, BALLS[k % 8]); k += 1
        ball(fx0 + W // 4 - 8, cy, WHITE[4])
    elif game == "in play":
        rng = np.random.default_rng(c.ek * 13 + len(c.style) + c.w)
        for k in range(8): ball(int(rng.uniform(fx0 + 8, fx1 - 8)), int(rng.uniform(fy0 + 6, fy1 - 6)), BALLS[k % 8])
        ball(fx0 + W // 3, cy + 6, WHITE[4])
    cue = c.wood if per != "F" else c.comp
    if per == "E":                                                                                                           # the mace, its flat head on the bed
        d.line([fx0 + 30, fy0 + 10, fx1 - 50, fy0 + 18], fill=OUT, width=4); d.line([fx0 + 30, fy0 + 10, fx1 - 50, fy0 + 18], fill=cue[3], width=2)
        d.rectangle([fx1 - 54, fy0 + 12, fx1 - 42, fy0 + 24], fill=cue[2], outline=OUT)
    d.line([fx0 + 10, fy1 - 6, fx1 - 30, fy1 - 14], fill=OUT, width=4); d.line([fx0 + 10, fy1 - 6, fx1 - 30, fy1 - 14], fill=cue[3], width=2)
    d.line([fx0 + 10, fy1 - 6, fx0 + 40, fy1 - 8], fill=(40, 30, 26), width=2)
    if per == "N": d.rectangle([X0 + W // 2 - 10, Y1 - 6, X0 + W // 2 + 10, Y1 - 2], fill=STEEL[3], outline=OUT)                       # coin slide


define("pooltable", draw=_obj(pooltable, "age-of-reason"), clear=5, tags=("taproom", "salon", "parlour"), axes={"game": ["racked", "in play", "cleared"]},
       ref="a bar pool table is 7 to 8 ft by 4 ft, an English billiard table up to 12 by 6 ft; 9 by 4 1/2 ft overall is the usual tournament pool table (billiard makers' sizes)")


def dartboard(tm, x, y, w, h, st, v, c):
    """A dartboard on the wall from above: the board hangs in its cabinet a hand off the wall and tipped a little
    forward, so its face shows foreshortened: the black and cream wedges, the red and green rings, the bull and the
    darts in it. Victorian: an elm board soaked to close its holes, its beds and rings painted in the house paint, in a cabinet of the local wood;
    from the Great War: bristle boards with a wire spider, made the same everywhere, in an oak, mahogany, pine or
    black cabinet with its doors folded open (plain or lined with chalk scoreboards), or hung bare on a nail with a black or cork surround or on a scrap of board;
    Mid-Century: the wire numbers ring round it; Modern: a ring light clipped round the board, or the lit electronic
    board; Future Darkness: a dark board with lit rings. None, two or three darts."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2; per = c.per
    cab = c.axis("cab", "oak"); ring = c.axis("ring", False); n = int(c.axis("darts", 3)); elec = c.axis("elec", False) and per in "NF"
    Wd = {"oak": ramp((150, 112, 70), 18), "mahogany": ramp((110, 52, 38), 16), "pine": ramp((196, 168, 118), 16), "black": ramp((40, 38, 42), 12), "none": None}[cab]
    if c.era == "victorian" and Wd: Wd = ramp(mix(c.wood[2], Wd[2], .15), 16)                                                          # the local joiner's wood
    if per == "F" and Wd: Wd = ramp(mix(COMPOSITE[2], Wd[2], .7), 12)
    by0 = Y0 + 2
    if Wd:
        d.rectangle([X0 + 6, Y0, X1 - 6, Y0 + H // 2], fill=Wd[1], outline=OUT); d.line([X0 + 7, Y0 + 1, X1 - 7, Y0 + 1], fill=Wd[4])       # the cabinet back
        doors = c.axis("doors", "wood")
        for k in (X0, X1 - 7):
            if doors == "chalk":                                                                                                      # the scoreboards inside its doors
                d.rectangle([k, Y0, k + 7, Y0 + H // 2 + 4], fill=(40, 50, 44), outline=Wd[1])
                for t in range(Y0 + 3, Y0 + H // 2 + 2, 3): d.line([k + 2, t, k + 5, t], fill=(210, 214, 206))
            else: d.rectangle([k, Y0, k + 7, Y0 + H // 2 + 2], fill=Wd[3], outline=OUT); d.line([k + 1, Y0 + 1, k + 1, Y0 + H // 2], fill=Wd[4])
        if c.rich: d.rectangle([X0 + 2, Y0 + 3, X0 + 4, Y0 + 5], fill=BRASS[3]); d.rectangle([X1 - 5, Y0 + 3, X1 - 3, Y0 + 5], fill=BRASS[3])
    elif c.era == "victorian": d.rectangle([X0 + 2, Y0, X1 - 2, Y1 - 1], fill=c.wood[2], outline=OUT)                             # a backboard of the local wood
    elif c.poor: d.rectangle([X0 + 8, Y0, X1 - 8, Y0 + H // 2], fill=ramp((130, 116, 96), 12)[1], outline=OUT)                          # a scrap of board
    r = min(W // 2 - 11, 16); cy = Y0 + H // 2; ry = H // 2 - 1
    if ring: d.ellipse([cx - r - 5, cy - ry - 2, cx + r + 5, cy + ry + 2], fill=(196, 150, 96) if ring == "cork" else (26, 26, 28), outline=OUT)   # a black or cork surround
    if elec:
        d.ellipse([cx - r - 1, cy - ry, cx + r + 1, cy + ry], fill=(30, 30, 34), outline=OUT)
        for k in range(16): a0 = 90 - 11.25 + k * 22.5; d.pieslice([cx - r + 1, cy - ry + 1, cx + r - 1, cy + ry - 1], a0, a0 + 22.5, fill=(220, 60, 60) if k % 2 else (60, 120, 230))
        d.rectangle([cx - 8, Y1 - 3, cx + 8, Y1], fill=(30, 30, 34), outline=OUT); d.rectangle([cx - 3, Y1 - 2, cx + 3, Y1 - 1], fill=(120, 230, 140))   # the score display
    else:
        board = (186, 150, 100) if c.era == "victorian" else (30, 28, 26)
        if per == "F": board = c.comp[0]
        d.ellipse([cx - r, cy - ry, cx + r, cy + ry], fill=board, outline=OUT)
        for k in range(20):
            a0 = k * 18 - 9
            if k % 2: d.pieslice([cx - r + 2, cy - ry + 1, cx + r - 2, cy + ry - 1], a0, a0 + 18, fill=(226, 214, 180) if c.era != "victorian" else c.paint[2])
        rc = ((200, 40, 40), (40, 130, 60)) if per != "F" else (c.glow[1], c.glow[0])
        d.ellipse([cx - r + 1, cy - ry + 1, cx + r - 1, cy + ry - 1], outline=rc[0], width=2)
        d.ellipse([cx - r // 2, cy - ry // 2, cx + r // 2, cy + ry // 2], outline=rc[1], width=2)
        d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=rc[0])
        if c.era == "mid-century":                                                                                            # the wire numbers ring round it
            for k in range(20): a_ = math.radians(k * 18); d.rectangle([cx + math.cos(a_) * (r + 2) - 1, cy + math.sin(a_) * (ry + 1) - 1, cx + math.cos(a_) * (r + 2), cy + math.sin(a_) * (ry + 1)], fill=WHITE[4])
    if c.era == "modern":                                                                                                     # the ring light clipped round the board
        d.ellipse([cx - r - 4, cy - ry - 2, cx + r + 4, cy + ry + 2], outline=(30, 30, 34), width=3); d.arc([cx - r - 3, cy - ry - 1, cx + r + 3, cy + ry + 1], 190, 350, fill=(250, 248, 230), width=2)
    fl = ((230, 200, 40), (60, 120, 220), (220, 60, 60), (240, 240, 240))[int(c.axis("flights", 0)) % 4]
    for off in {0: (), 1: (0,), 2: (-r // 3, r // 3), 3: (-r // 2, 0, r // 2)}[min(n, 3)]:
        dx = cx + off; dy = cy - ry // 3 + (3 if off else 0)
        d.line([dx, dy, dx + 1, Y1 - 2], fill=STEEL[4]); d.rectangle([dx - 1, Y1 - 3, dx + 2, Y1], fill=fl, outline=OUT)                  # darts standing out of the board


DARTBOARD_MODELS = [dict(cab=cb, doors=dr, ring=rg, darts=dn, flights=fl, elec=el) for cb, dr, rg, dn, fl, el in (
    ("oak", "wood", "cork", 0, 2, False), ("pine", "wood", "black", 3, 0, False), ("pine", "chalk", "cork", 2, 1, True), ("none", "", "cork", 2, 1, False),
    ("mahogany", "chalk", "cork", 3, 3, False), ("none", "", "black", 3, 0, True), ("pine", "wood", False, 2, 0, True), ("mahogany", "chalk", False, 3, 0, True),
    ("oak", "chalk", "black", 2, 3, False), ("black", "wood", False, 2, 3, False))]


define("dartboard", draw=_obj(dartboard, "victorian", off=3, chip=False, presets=DARTBOARD_MODELS), front=True, clear=8, mount="wall", tags=("taproom", "barracks"),
       global_from=1902, ft=((1.7, 2.3), (.8, 1.2)), axes={"model": list(range(len(DARTBOARD_MODELS)))},
       ref="a dartboard is 18 in across; its cabinet is about 2 ft wide, and with the doors folded open and the board tipped off the wall it takes about 1 ft of depth (pub game rules, dartboard cabinet makers)")


# ================================================================ the ward and the morgue
def stretcher(tm, x, y, w, h, st, v, c):
    """A stretcher from above, its length north and south: two poles with handles past each end and a bed between.
    Age of Reason: wooden poles and linen laced on, leather straps; Victorian: the same with wooden traverses,
    folding iron feet and a canvas pillow; Great War: the army
    stretcher with steel stirrups, khaki canvas and a grey blanket; Mid-Century: an aluminium stretcher; Modern: a
    wheeled ambulance cot with a padded mattress, belts and a yellow frame; Future Darkness: a dark litter with lit
    rails. Empty, with a blanket, or with a body under a sheet."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2; per = c.per; load = c.axis("load", "empty")
    P = c.wood if per in "EV" or c.era == "great-war" else (ramp((170, 176, 180), 16) if per in "WN" else c.comp)
    if per == "N": P = shell(c, .1, (230, 230, 230))
    canvas = c.cloth if per in "EV" else (ramp(mix((120, 116, 80), c.S["cloth"], .6), 14) if per == "W" else (shell(c, .5, (40, 60, 120)) if per == "N" else c.comp))
    if per == "W" and c.ek == 6: canvas = ramp(mix((60, 90, 70), c.S["paint"], .6), 14)
    px_ = (X0 + 3, X1 - 6)
    for k in px_: d.rectangle([k, Y0, k + 3, Y1], fill=P[3], outline=OUT)                                                                # the poles and handles
    d.rectangle([X0 + 5, Y0 + 14, X1 - 5, Y1 - 14], fill=canvas[2], outline=OUT)
    if per in "EV":
        for yy in range(Y0 + 16, Y1 - 14, 6): d.point((X0 + 5, yy), fill=HEMP[3]); d.point((X1 - 5, yy), fill=HEMP[3])                     # lacing
    if per == "N":
        d.rounded_rectangle([X0 + 6, Y0 + 15, X1 - 6, Y1 - 15], 5, fill=canvas[2], outline=OUT)
        for yy in (Y0 + H // 3, Y0 + 2 * H // 3): d.rectangle([X0 + 4, yy, X1 - 4, yy + 4], fill=(30, 30, 34)); d.rectangle([cx - 3, yy, cx + 3, yy + 4], fill=STEEL[4])
        for wy in (Y0 + 4, Y1 - 8): d.rectangle([X0 + 1, wy, X0 + 5, wy + 4], fill=(20, 20, 22)); d.rectangle([X1 - 5, wy, X1 - 1, wy + 4], fill=(20, 20, 22))
    elif per == "F": d.line([X0 + 3, Y0 + 14, X0 + 3, Y1 - 14], fill=c.glow[1], width=2); d.line([X1 - 4, Y0 + 14, X1 - 4, Y1 - 14], fill=c.glow[1], width=2)
    else:
        for yy in (Y0 + H // 3, Y0 + 2 * H // 3): d.rectangle([X0 + 4, yy, X1 - 4, yy + 3], fill=(90, 60, 40) if per != "W" else (70, 66, 50))   # straps
    if per == "W": d.rectangle([X0 + 2, Y0 + 12, X1 - 2, Y0 + 15], fill=STEEL[2]); d.rectangle([X0 + 2, Y1 - 15, X1 - 2, Y1 - 12], fill=STEEL[2])  # stirrups
    if per == "V":                                                                                                            # wooden traverses, folding feet and a canvas pillow
        for yy in (Y0 + 10, Y1 - 14): d.rectangle([X0 + 1, yy, X1 - 1, yy + 4], fill=P[2], outline=OUT)
        for fx_, fy_ in ((X0, Y0 + 30), (X1 - 6, Y0 + 30), (X0, Y1 - 36), (X1 - 6, Y1 - 36)): d.rectangle([fx_, fy_, fx_ + 6, fy_ + 6], fill=IRON[2], outline=OUT)
        d.rounded_rectangle([X0 + 8, Y0 + 16, X1 - 8, Y0 + 28], 4, fill=canvas[3], outline=OUT)
    pil = WHITE if per != "F" else c.comp
    if load == "blanket":
        Bl = ramp(mix((120, 120, 124), c.S["cloth"], .5), 14) if c.w <= 3 else c.cloth
        cloth(tm, X0 + 6, Y0 + H // 3, X1 - 6, Y1 - 18, Bl, folds="x", n=3)
        d.rounded_rectangle([X0 + 8, Y0 + 18, X1 - 8, Y0 + 34], 4, fill=pil[3], outline=OUT)
    elif load == "sheet":
        d.rounded_rectangle([X0 + 6, Y0 + 18, X1 - 6, Y1 - 18], 8, fill=WHITE[3], outline=OUT)                                            # a body under a sheet
        d.ellipse([cx - 8, Y0 + 20, cx + 8, Y0 + 36], fill=WHITE[4], outline=WHITE[1])
        d.line([cx - 4, Y0 + 40, cx - 6, Y1 - 24], fill=WHITE[1]); d.line([cx + 4, Y0 + 40, cx + 6, Y1 - 24], fill=WHITE[1])
    if load != "blanket":                                                                                                         # a folded blanket at the foot
        Fb = c.comp if per == "F" else c.cloth
        by0 = Y0 + int(H * .56) if load == "sheet" else Y1 - 30                                                                    # over the legs when a body lies there
        d.rectangle([X0 + 6, by0, X1 - 6, Y1 - 16], fill=Fb[3], outline=OUT); d.line([X0 + 7, Y1 - 23, X1 - 7, Y1 - 23], fill=Fb[1])
        motif(tm, X0 + 8, Y1 - 29, X1 - 8, Y1 - 24, c, 2)                                                                       # one woven band, small
    if c.rich and per in "EVW": motif(tm, X0 + 6, Y1 - 13, X1 - 6, Y1 - 6, c, 2)


define("stretcher", draw=_obj(stretcher, "age-of-reason"), front=True, clear=1, tags=("ward", "surgery", "morgue", "guardroom"),
       axes={"load": ["empty", "blanket", "sheet"]}, ref="a field stretcher is about 7 ft 9 in by 1 ft 11 in, a litter 6 to 7 ft (army medical manuals)")


def _mirror(tm, before, cx, y0, y1, R):
    """Make what was just drawn exactly symmetric about the column cx, west half onto east half, leaving the floor
    under it alone (PIL rounds slanted wide lines differently on the two sides)."""
    a = np.asarray(tm.img).copy(); b = before
    y0, y1 = max(0, y0), min(a.shape[0], y1); R = min(R, cx, a.shape[1] - cx - 1)
    L, Rt = slice(cx - R, cx), slice(cx + 1, cx + R + 1)
    mL = (a[y0:y1, L] != b[y0:y1, L]).any(2)[:, ::-1]
    right = b[y0:y1, Rt].copy(); right[mL] = a[y0:y1, L][:, ::-1][mL]
    a[y0:y1, Rt] = right; tm.img.paste(Image.fromarray(a), (0, 0))


def ivstand(tm, x, y, w, h, st, v, c):
    """A drip stand from above: its base of feet on castors (a cast-iron ring foot on the early ones), the pole's top
    in the middle, the hooks with the bottles or bags of fluid set evenly round it, and the tube running down to the
    south. Made by hospital suppliers the same the world over. Victorian: a japanned iron stand on a ring foot, a ring on
    ball feet, a cross or a tripod, with glass bottles; Great War: the same enamelled white; Mid-Century: a chrome stand
    on four or five castors, the bottles in wire cradles; Modern and Future Darkness: also a weighted round base;
    Modern: plastic bags and a pump with a lit display; Future
    Darkness: a dark stand with a lit pump. One to three bags or bottles of saline, blood or a drug; some
    stands carry a round instrument tray on the pole."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W = X1 - X0; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; per, era = c.per, c.era
    before = np.asarray(tm.img).copy()
    En = ramp({"victorian": (52, 50, 56), "great-war": (226, 226, 218), "mid-century": (196, 200, 206), "modern": (214, 216, 220)}.get(era, (70, 74, 84)), 16)
    if per == "F": En = c.comp
    r = W // 2 - 2
    fl = {"saline": (190, 220, 230), "blood": (150, 20, 30), "drug": (230, 200, 90)}[c.axis("fluid", "saline")]
    base = c.axis("base", "star5")                                                                                          # four bases in every age, each in its own making
    if per in "VW" and era != "mid-century": base = {"star5": "knobs", "star4": "star4", "ring": "ring", "tripod": "tripod"}[base]
    elif per in "NF" and base == "tripod": base = "disc"
    if base == "knobs":                                                                                                     # a ring foot on three ball feet
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=OUT, width=6); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=En[3], width=4)
        for a_ in (90, 210, 330): ex, ey = cx + math.cos(math.radians(a_)) * (r - 3), cy + math.sin(math.radians(a_)) * (r - 3); d.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=En[2], outline=OUT)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=En[2], outline=OUT)
    elif base == "disc":
        d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(44, 46, 50), outline=OUT); d.ellipse([cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7], outline=En[3], width=2)
    elif base == "ring":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=En[2], outline=OUT); d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=En[1], outline=En[0])
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=En[4])
    else:
        n = {"star5": 5, "star4": 4, "tripod": 3}[base]
        for k in range(n):                                                                                                    # the castor feet
            a_ = math.radians(90 + k * 360 / n); ex, ey = cx + math.cos(a_) * r, cy + math.sin(a_) * r
            d.line([cx, cy, ex, ey], fill=OUT, width=6); d.line([cx, cy, ex, ey], fill=En[3], width=4); d.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=(30, 30, 34), outline=OUT)
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=En[2], outline=OUT)
    if c.axis("tray", False):                                                                                               # a round instrument tray on the pole
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=STEEL[3] if per != "V" else En[3], outline=OUT); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=STEEL[4])
    nb = int(c.axis("bags", 1)); q = int(r * .55)
    spots = {1: [(cx, cy - q)], 2: [(cx - q, cy - 2), (cx + q, cy - 2)], 3: [(cx - q, cy - 2), (cx + q, cy - 2), (cx, cy - q)]}[nb]
    for bx, by in spots: d.line([cx, cy, bx, by], fill=STEEL[3] if per != "F" else c.glow[1], width=2)                         # the hook arms from the pole top
    for bx, by in spots:                                                                                                      # the bottles or bags on their hooks
        if per in "VW": d.ellipse([bx - 4, by - 4, bx + 4, by + 4], fill=tone(fl, 10), outline=OUT); d.point((bx, by), fill=WHITE[4])
        else: d.rounded_rectangle([bx - 3, by - 5, bx + 3, by + 5], 2, fill=fl, outline=OUT); d.line([bx, by - 3, bx, by + 2], fill=tone(fl, 50))
        if era == "mid-century": d.rectangle([bx - 5, by - 5, bx + 5, by + 5], outline=STEEL[3])                            # the wire cradle
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=STEEL[4], outline=OUT)                                                  # the pole's top
    d.line([cx, cy + 3, cx, Y1 - 2], fill=(200, 210, 220), width=1)                                                          # the tube
    if per in "NF":                                                                                                           # the pump clamped to the pole
        d.rectangle([cx - 5, cy + 5, cx + 5, cy + 11], fill=(230, 230, 226) if per == "N" else c.comp[1], outline=OUT); d.rectangle([cx - 3, cy + 7, cx + 3, cy + 9], fill=(80, 200, 120) if per == "N" else c.glow[1])
    _mirror(tm, before, cx, Y0 - 2, Y1 + 2, W // 2 + 2)


IVSTAND_MODELS = [dict(base=b, bags=n, fluid=f, tray=t) for b, n, f, t in (
    ("star5", 1, "saline", False), ("ring", 1, "drug", False), ("star5", 2, "saline", False), ("star4", 1, "blood", False), ("star4", 2, "drug", False),
    ("tripod", 2, "blood", False), ("star4", 2, "blood", True), ("tripod", 3, "saline", False), ("tripod", 1, "blood", True), ("star4", 2, "saline", True))]


define("ivstand", draw=_obj(ivstand, "great-war", presets=IVSTAND_MODELS), tags=("ward", "surgery"), global_from=1837,
       axes={"model": list(range(len(IVSTAND_MODELS)))},
       ref="a drip stand on a five-castor base about 1 1/2 to 2 ft across (hospital equipment catalogues)")


def restraintchair(tm, x, y, w, h, st, v, c):
    """A restraint chair from above: a heavy square chair, its high back to the north, broad arms, and leather
    straps with buckles across the arms, the chest and the feet. Age of Reason: the asylum's tranquilising chair, a
    heavy wooden box chair with a head box; Victorian: a strapped asylum chair of oak; Great War: the same bolted down
    with steel angle plates and a second chest strap; Mid-Century: the electric chair, its head electrode and cable
    and steel ankle cuffs; Modern: a padded black restraint chair on
    wheels; Future Darkness: a moulded dark chair with lit cuffs."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2; per = c.per
    Wd = c.wood if per in "EVW" else (shell(c, .65, (36, 36, 40)) if per == "N" else ramp(mix(c.comp[2], c.S["paint"], .45), 14))
    Lt = ramp(mix((96, 60, 36), c.S["cloth"], .3), 16) if per != "F" else c.comp
    d.rectangle([X0, Y0, X1, Y1], fill=Wd[1], outline=OUT)
    bk = 16 if per != "E" else 22
    d.rectangle([X0, Y0, X1, Y0 + bk], fill=Wd[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Wd[4])           # the back
    if per == "E": d.rectangle([cx - 14, Y0 + 2, cx + 14, Y0 + 26], fill=Wd[2], outline=OUT); d.rectangle([cx - 9, Y0 + 6, cx + 9, Y0 + 22], fill=Wd[0])   # the head box
    for ax in (X0, X1 - 12): d.rectangle([ax, Y0 + bk, ax + 12, Y1 - 10], fill=Wd[3], outline=OUT); d.line([ax + 2, Y0 + bk + 2, ax + 2, Y1 - 12], fill=Wd[4])  # arms
    seat = Wd[2] if per in "EVW" else Wd[3]
    d.rectangle([X0 + 13, Y0 + bk + 1, X1 - 13, Y1 - 10], fill=seat, outline=OUT)
    if per == "N": d.rounded_rectangle([X0 + 15, Y0 + bk + 3, X1 - 15, Y1 - 12], 5, fill=Wd[3], outline=Wd[0])
    d.rectangle([X0 + 8, Y1 - 10, X1 - 8, Y1], fill=Wd[2], outline=OUT)                                                          # the foot board
    def strap(x0_, y0_, x1_, y1_):
        d.rectangle([x0_, y0_, x1_, y1_], fill=Lt[2], outline=OUT); bx = (x0_ + x1_) // 2
        d.rectangle([bx - 2, y0_, bx + 2, y1_], outline=c.metal[3] if per != "F" else c.glow[1])
    for ax in (X0 + 1, X1 - 11): strap(ax, Y1 - 26, ax + 10, Y1 - 20)
    strap(X0 + 12, Y0 + bk + 8, X1 - 12, Y0 + bk + 14)
    strap(X0 + 10, Y1 - 7, X1 - 10, Y1 - 3)
    if c.era == "great-war":                                                                                                 # bolted down with steel angle plates, a second chest strap
        for bx_, by_ in ((X0 + 1, Y0 + bk + 2), (X1 - 9, Y0 + bk + 2), (X0 + 1, Y1 - 9), (X1 - 9, Y1 - 9)): d.rectangle([bx_, by_, bx_ + 8, by_ + 8], fill=STEEL[2], outline=OUT); rivet(tm, bx_ + 4, by_ + 4)
        strap(X0 + 12, Y0 + bk + 20, X1 - 12, Y0 + bk + 26)
    elif c.era == "mid-century":                                                                                            # the head electrode and its cable, ankle cuffs on the foot board
        d.ellipse([cx - 9, Y0 + 2, cx + 9, Y0 + 16], fill=STEEL[2], outline=OUT); d.ellipse([cx - 5, Y0 + 5, cx + 5, Y0 + 13], fill=(40, 40, 44))
        d.line([cx + 9, Y0 + 8, X1 - 3, Y0 + 3], fill=(30, 30, 34), width=3)
        for ax in (cx - 14, cx + 6): d.rectangle([ax, Y1 - 10, ax + 8, Y1 - 2], fill=STEEL[3], outline=OUT)
    if c.rich and per in "EVW": motif(tm, X0 + 4, Y0 + 3, X1 - 4, Y0 + 9, c)
    if per == "N":
        for wx, wy in ((X0 + 2, Y0 + 2), (X1 - 6, Y0 + 2)): d.rectangle([wx, wy, wx + 4, wy + 4], fill=(20, 20, 22))


define("restraintchair", draw=_obj(restraintchair, "age-of-reason"), front=True, clear=2, tags=("cell", "ward", "lab"),
       ref="a restraint chair about 2 1/2 ft square (Rush's tranquilising chair of 1811 and modern custody chairs)")


def morguedrawers(tm, x, y, w, h, st, v, c):
    """A bank of morgue drawers against the wall from above: the cabinet along the back with its rows of square doors
    shown along its front edge with handles and name cards, a tiled floor before it with its drain, and the trolley
    that takes the bodies. Victorian: an oak ice cabinet with brass latches; Great War: three white enamel doors with
    chrome handles; Mid-Century: four narrower doors with long lever latches; Modern: brushed steel; Future Darkness: dark sealed bays with lit seals. Open: a drawer
    slid out on its runners, its tray holding a body under a sheet."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; opn = st == "open"
    D = {"V": c.wood, "W": ramp(mix((226, 226, 218), c.S["paint"], .25), 10), "N": ramp(mix((176, 182, 186), c.S["paint"], .2), 14), "F": c.comp}[per]
    tile = ramp(mix((210, 214, 208), c.S["stone"], .5), 8)
    cd = int(H * .42)
    slab(tm, X0, Y0 + cd, X1, Y1, tile, None, gaps=range(12, H - cd, 12))                                                         # the tiled floor
    for k in range(X0 + 12, X1, 12): d.line([k, Y0 + cd + 2, k, Y1 - 2], fill=tile[0])
    d.ellipse([X0 + W // 2 - 5, Y0 + cd + (H - cd) // 2 - 5, X0 + W // 2 + 5, Y0 + cd + (H - cd) // 2 + 5], fill=(40, 42, 44), outline=STEEL[2])   # the drain
    d.rectangle([X0, Y0, X1, Y0 + cd], fill=D[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=D[4])
    n = 4 if c.era == "mid-century" else 3; dw = (W - 8) // n
    for i in range(n):
        dx0 = X0 + 4 + i * dw
        d.rectangle([dx0 + 2, Y0 + 6, dx0 + dw - 2, Y0 + cd - 6], fill=D[3], outline=D[0])                                          # the door tops of the rows
        if n == 4: d.rectangle([dx0 + dw - 9, Y0 + 8, dx0 + dw - 5, Y0 + cd - 2], fill=STEEL[4], outline=OUT)                         # a long lever latch
        else: d.rectangle([dx0 + dw // 2 - 8, Y0 + cd - 5, dx0 + dw // 2 + 8, Y0 + cd - 1], fill=c.metal[3] if per == "V" else STEEL[4], outline=OUT)   # handle
        d.rectangle([dx0 + 6, Y0 + cd - 12, dx0 + 16, Y0 + cd - 7], fill=WHITE[4] if per != "F" else c.glow[1])                      # name card
    if per == "V":
        for k in range(X0 + 10, X1 - 6, 20): rivet(tm, k, Y0 + 3, BRASS)
    if c.rich and per != "F": motif(tm, X0 + 6, Y0 + 2, X1 - 6, Y0 + 5, c)
    if opn:
        dx0 = X0 + 4 + dw; tray = STEEL if per != "V" else c.wood                                                                    # the middle drawer out
        d.rectangle([dx0 + 4, Y0 + cd, dx0 + dw - 4, Y1 - 4], fill=tray[2], outline=OUT)
        d.rounded_rectangle([dx0 + 8, Y0 + cd + 4, dx0 + dw - 8, Y1 - 8], 8, fill=WHITE[3], outline=OUT); d.ellipse([dx0 + dw // 2 - 9, Y0 + cd + 6, dx0 + dw // 2 + 9, Y0 + cd + 22], fill=WHITE[4], outline=WHITE[1])
        d.rectangle([dx0 + dw // 2 - 4, Y1 - 14, dx0 + dw // 2 + 4, Y1 - 10], fill=(214, 176, 150))                                  # a toe tag's foot
    else:
        tx0, ty0 = X0 + W // 2 + 30, Y0 + cd + 10                                                                                   # the trolley parked
        d.rectangle([tx0, ty0, min(X1 - 6, tx0 + 34), Y1 - 8], fill=STEEL[2], outline=OUT); d.rectangle([tx0 + 3, ty0 + 3, min(X1 - 9, tx0 + 31), Y1 - 11], fill=STEEL[3])


define("morguedrawers", draw=_obj(morguedrawers, "victorian", chip=False), front=True, clear=7, mount="wall", states=("closed", "open"), openable="chest",
       tags=("morgue",), ref="a three-wide mortuary refrigerator about 8 ft long and 3 ft deep, with the floor its 7 ft drawers slide out over (mortuary equipment makers)")


# ================================================================ the gaol, the dungeon and the square
def _bars_mat(c):
    """What a people's bars are made of: squared timber in the Dark Ages and where iron is dear (bamboo in the
    south-east, hardwood in Africa and the islands), wrought iron after, steel in the wars and after, and lit
    composite in the Future."""
    if c.per == "F": return ramp(mix(c.comp[3], c.S["paint"], .4), 14)
    if c.per == "M" and (c.poor or c.style in ("africa", "seasia", "oceania", "eastasia", "americas", "polar")): return region_mat(c)
    if c.style in ("seasia",) and c.per in "ME": return region_mat(c)
    if c.per in "WN": return ramp(mix((96, 100, 108), c.S["paint"], .45 if c.w >= 2 else .25), 18)
    return ramp(mix(c.iron[2], c.S["paint"], .25), 18)


def cage(tm, x, y, w, h, st, v, c):
    """A cage from above: its frame posts at the corners, the bars of its roof running across, its floor of straw,
    bones or bare boards seen between them, and the barred door on the south side, shut with a padlock or swung open.
    Dark Ages: squared timber bars pegged into a frame with iron bands, or lashed bamboo in the east; Long Night: bars
    set closer and iron plates at the corners; Renaissance to Victorian: wrought iron, scrolled at the top on the rich
    ones, the Age of Reason's wider set with three straps; Great War: close steel bars; Mid-Century: a welded mesh roof; Modern: a welded steel kennel or holding cage; Future Darkness: a dark frame with lit bars.
    Something may be shut in it: a beast curled on the floor."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; opn = st == "open"; inside = c.axis("contents", "straw")
    B = _bars_mat(c); Fr = c.wood if per in "ME" else B
    fl = {"straw": ramp((206, 176, 96), 14), "bones": ramp(mix((120, 100, 80), c.S["stone"], .5), 12), "empty": ramp(mix((110, 92, 70), c.S["stone"], .5), 12), "beast": ramp((206, 176, 96), 14)}[inside]
    d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=fl[2], outline=OUT)                                                               # the floor
    rng = np.random.default_rng(c.ek * 7 + len(c.style))
    if inside in ("straw", "beast"):
        for _ in range(40):
            sx, sy = rng.uniform(X0 + 8, X1 - 12), rng.uniform(Y0 + 8, Y1 - 10); d.line([sx, sy, sx + rng.uniform(4, 9), sy + rng.uniform(-2, 2)], fill=fl[int(rng.integers(0, 2)) * 3 + 1])
    elif inside == "bones":
        for _ in range(5):
            sx, sy = rng.uniform(X0 + 14, X1 - 18), rng.uniform(Y0 + 14, Y1 - 16); d.line([sx, sy, sx + 10, sy + 3], fill=WHITE[3], width=3)
            d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=WHITE[4]); d.ellipse([sx + 8, sy + 1, sx + 12, sy + 5], fill=WHITE[4])
        d.ellipse([X0 + W // 2 - 6, Y0 + H // 2 - 6, X0 + W // 2 + 6, Y0 + H // 2 + 6], fill=WHITE[3], outline=WHITE[0]); d.rectangle([X0 + W // 2 - 3, Y0 + H // 2 - 1, X0 + W // 2 - 1, Y0 + H // 2 + 1], fill=(30, 26, 26))
    if inside == "beast":
        bx, by = X0 + W // 2 - 6, Y0 + H // 2
        Fu = ramp(mix((110, 100, 90), c.S["cloth"], .2), 16)
        d.ellipse([bx - 20, by - 12, bx + 16, by + 12], fill=Fu[2], outline=OUT); d.ellipse([bx + 8, by - 10, bx + 22, by + 2], fill=Fu[3], outline=OUT)   # body and head
        d.polygon([(bx + 16, by - 10), (bx + 18, by - 16), (bx + 21, by - 9)], fill=Fu[1]); d.arc([bx - 24, by - 8, bx - 4, by + 16], 90, 200, fill=Fu[1], width=3)
    era = c.era; sp = {"long-night": 7, "age-of-reason": 13, "great-war": 8}.get(era, 10); bw = 4 if per in "ME" else 3
    if era == "mid-century":                                                                                                                # a welded mesh roof
        L_ = H - 8
        for k in range(X0 + 4 - L_, X1 - 4, 7):
            t0, t1 = max(0, (X0 + 4 - k) / L_), min(1, (X1 - 4 - k) / L_)
            if t1 > t0:
                d.line([k + L_ * t0, Y1 - 4 - L_ * t0, k + L_ * t1, Y1 - 4 - L_ * t1], fill=B[3]); d.line([k + L_ * t0, Y0 + 4 + L_ * t0, k + L_ * t1, Y0 + 4 + L_ * t1], fill=B[2])
        d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=B[1], width=3)
    else:
        for k in range(X0 + 8, X1 - 6, sp): d.line([k, Y0 + 4, k, Y1 - 4], fill=OUT, width=bw + 2); d.line([k, Y0 + 4, k, Y1 - 4], fill=B[3], width=bw); d.line([k - 1, Y0 + 5, k - 1, Y1 - 5], fill=B[4])
    straps = {"age-of-reason": (Y0 + H // 4, Y0 + H // 2, Y0 + 3 * H // 4), "mid-century": ()}.get(era, (Y0 + H // 3, Y0 + 2 * H // 3))
    for yy in straps: d.line([X0 + 4, yy, X1 - 4, yy], fill=B[1] if per not in "ME" else c.iron[2], width=4)                              # cross straps
    if era == "long-night":                                                                                                                 # iron corner plates
        for qx, qy in ((X0, Y0), (X1 - 14, Y0), (X0, Y1 - 14), (X1 - 14, Y1 - 14)): d.rectangle([qx, qy, qx + 14, qy + 14], fill=IRON[1], outline=OUT); rivet(tm, qx + 7, qy + 7)
    d.rectangle([X0, Y0, X1, Y0 + 6], fill=Fr[2], outline=OUT); d.rectangle([X0, Y0, X0 + 6, Y1], fill=Fr[3], outline=OUT); d.rectangle([X1 - 6, Y0, X1, Y1], fill=Fr[1], outline=OUT)
    if per in "EV" and c.rich:
        for k in range(X0 + 14, X1 - 10, 20): d.arc([k - 6, Y0 + 1, k + 6, Y0 + 13], 180, 360, fill=c.metal[3], width=2)                     # scrolls
    if per in "MEVW" and c.w >= 3: motif(tm, X0 + 10, Y0 + 1, X1 - 10, Y0 + 5, c)
    dx0, dx1 = X0 + W // 3, X0 + 2 * W // 3                                                                                                 # the door
    if opn:
        d.rectangle([X0, Y1 - 6, dx0, Y1], fill=Fr[2], outline=OUT); d.rectangle([dx1, Y1 - 6, X1, Y1], fill=Fr[2], outline=OUT)
        d.line([dx0, Y1, dx0 - (dx1 - dx0) * .7, Y1 + (dx1 - dx0) * .7], fill=OUT, width=7); d.line([dx0, Y1, dx0 - (dx1 - dx0) * .7, Y1 + (dx1 - dx0) * .7], fill=B[3], width=4)
    else:
        d.rectangle([X0, Y1 - 6, X1, Y1], fill=Fr[2], outline=OUT); d.rectangle([dx0, Y1 - 8, dx1, Y1 + 1], outline=B[1], width=2)
        d.rectangle([dx1 - 6, Y1 - 4, dx1, Y1 + 3], fill=c.metal[2] if per != "F" else c.glow[1], outline=OUT)                                 # the lock
    if per == "F": d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], outline=c.glow[1])
    if c.poor and per in "ME":
        for k in (X0 + 6, X1 - 6): lash(d, k - 3, Y0 + H // 2, HEMP, 3)


define("cage", draw=_obj(cage, "dark-ages", off=5), front=True, clear=3, states=("closed", "open"), openable="chest", tags=("cell", "dungeon", "lab", "barn"),
       axes={"contents": ["straw", "beast", "bones", "empty"]}, ref="a cage for a prisoner or a beast about 4 ft square (gaol inventories and menagerie cages)")


def stocks(tm, x, y, w, h, st, v, c):
    """The stocks from above on a raised base of the square's stone: two heavy boards between two posts with the
    holes for the ankles (and wrists on a pillory board above), a bench behind for the one held, the hasp and lock
    at one end. Dark Ages and Long Night: adzed oak, iron straps, a heavy lock in the plague years; Renaissance and
    Age of Reason: joined and painted in the town's colours, with a pillory for the rich town; in the Age of Reason a whipping post
    beside them and a placard naming the offence; Victorian, its last years: weathered and left standing, weeds through the base. Open: the top board lifted on its hinge."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; opn = st == "open"
    Wd = c.paint if c.rich and per != "M" else c.wood
    if per == "V": Wd = ramp(mix(Wd[2], GREY, .4), 16)
    slab(tm, X0, Y0, X1, Y1, c.stone, None, gaps=range(16, H, 16))                                                                      # the base
    d.rectangle([X0 + 12, Y0 + 8, X1 - 12, Y0 + 22], fill=c.wood[2], outline=OUT); d.line([X0 + 13, Y0 + 9, X1 - 13, Y0 + 9], fill=c.wood[4])   # the bench
    by0 = Y0 + int(H * .5)
    for px_ in (X0 + 6, X1 - 20): d.rectangle([px_, by0 - 8, px_ + 14, by0 + 22], fill=Wd[1], outline=OUT); d.rectangle([px_ + 3, by0 - 5, px_ + 11, by0 - 1], fill=Wd[3])   # the posts
    d.rectangle([X0 + 18, by0 + 6, X1 - 18, by0 + 16], fill=Wd[2], outline=OUT)                                                            # the lower board
    for k in range(2 if c.w <= 3 else 3):
        hx = X0 + 40 + k * 30; d.ellipse([hx - 6, by0 + 4, hx + 6, by0 + 10], fill=(28, 24, 26))
        if k < 2: d.ellipse([hx + 10, by0 + 4, hx + 22, by0 + 10], fill=(28, 24, 26))
    if opn:
        d.rectangle([X0 + 18, by0 - 14, X1 - 18, by0 - 6], fill=Wd[3], outline=OUT); d.line([X0 + 19, by0 - 13, X1 - 19, by0 - 13], fill=Wd[4])   # the top board tipped up
    else:
        d.rectangle([X0 + 18, by0 - 4, X1 - 18, by0 + 6], fill=Wd[3], outline=OUT); d.line([X0 + 19, by0 - 3, X1 - 19, by0 - 3], fill=Wd[4])
        d.rectangle([X1 - 30, by0 - 2, X1 - 22, by0 + 8], fill=c.metal[2] if per != "M" or c.ek == 0 else IRON[1], outline=OUT)             # the hasp and lock
    for k in (X0 + 24, X1 - 26): d.rectangle([k, by0 - 5, k + 3, by0 + 16], fill=c.iron[1])
    if c.ek == 1: d.rectangle([X1 - 34, by0 - 6, X1 - 20, by0 + 10], outline=IRON[0], width=2)                                             # the heavier lock of the plague years
    if c.era == "age-of-reason":                                                                                                         # the whipping post beside them
        d.rectangle([X1 - 22, Y0 + 2, X1 - 4, Y0 + 20], fill=Wd[1], outline=OUT); d.rectangle([X1 - 30, Y0 + 8, X1 - 2, Y0 + 13], fill=Wd[3], outline=OUT)
        d.ellipse([X1 - 18, Y0 + 18, X1 - 8, Y0 + 28], outline=c.iron[3], width=2)
        d.rectangle([X0 + W // 2 - 16, Y0 + 26, X0 + W // 2 + 16, Y0 + 36], fill=(220, 210, 180), outline=OUT)                              # the placard naming the offence
        for k in (Y0 + 29, Y0 + 32): d.line([X0 + W // 2 - 12, k, X0 + W // 2 + 10, k], fill=(60, 50, 44))
    if c.era == "victorian":                                                                                                             # left to the weather: weeds through the base
        for gx, gy in ((X0 + 8, Y1 - 8), (X0 + 22, Y0 + 30), (X1 - 14, Y1 - 12), (X1 - 40, Y0 + 26), (X0 + W // 2, Y1 - 6)):
            for k in range(4): d.line([gx, gy, gx - 3 + k * 2, gy - 6], fill=(70, 110, 50), width=2)
    if c.rich: motif(tm, X0 + 20, Y1 - 10, X1 - 20, Y1 - 4, c)
    if c.rich and per in "EV":
        d.rectangle([X0 + W // 2 - 4, Y0 + 24, X0 + W // 2 + 4, by0 - 8], fill=Wd[1], outline=OUT); d.rectangle([X0 + W // 2 - 22, Y0 + 26, X0 + W // 2 + 22, Y0 + 34], fill=Wd[3], outline=OUT)  # pillory


define("stocks", draw=_obj(stocks, "dark-ages"), front=True, clear=2, mount="ground", states=("closed", "open"), tags=("square", "street", "bailey"),
       ref="village stocks for two, about 6 ft long with their bench (surviving English and German stocks)")


def gallows(tm, x, y, w, h, st, v, c):
    """The gallows from above. Dark Ages and Long Night: a gibbet on a stone mound, two posts and the crossbeam with
    the ladder leant against it and the nooses hanging; Renaissance and Age of Reason: a timber scaffold of boards
    with steps up at the front and the beam over it, a cart's ladder (in the Age of Reason
    the triple tree instead, three beams on three posts in a triangle with the cart drawn under); Victorian: the drop scaffold, painted black,
    its trapdoor under the noose, a rail round it and the lever. One, two or three ropes."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; n = int(c.axis("ropes", 1)); cx = (X0 + X1) // 2
    Wd = c.wood if per != "V" else ramp(mix((44, 40, 40), c.S["paint"], .3), 14)
    if per == "M":
        d.ellipse([X0, Y0 + 4, X1, Y1], fill=c.stone[2], outline=OUT); d.ellipse([X0 + 8, Y0 + 12, X1 - 8, Y1 - 8], fill=c.stone[3])
        for k in range(6): a_ = k * 1.05; d.ellipse([cx + math.cos(a_) * W * .38 - 8, Y0 + H // 2 + math.sin(a_) * H * .36 - 6, cx + math.cos(a_) * W * .38 + 8, Y0 + H // 2 + math.sin(a_) * H * .36 + 6], fill=c.stone[1], outline=OUT)
    else:
        slab(tm, X0 + 4, Y0 + 4, X1 - 4, Y1 - 26, Wd, "y", gaps=None)                                                                       # the scaffold boards
        if per == "E": d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 26], outline=c.cloth[2], width=5)                                            # the drape round its edge
        for k in range(X0 + 16, X1 - 6, 12): d.line([k, Y0 + 6, k, Y1 - 28], fill=Wd[0])
        for i, sy in enumerate(range(Y1 - 24, Y1, 6)): d.rectangle([cx - 24, sy, cx + 24, sy + 5], fill=c.stone[3 - i % 2], outline=OUT)     # the steps
        if per == "V":
            d.rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 26], outline=Wd[3], width=3)                                                          # the rail
            d.rectangle([cx - 24, Y0 + H // 2 - 22, cx + 24, Y0 + H // 2 + 2], fill=Wd[0], outline=OUT); d.line([cx, Y0 + H // 2 - 22, cx, Y0 + H // 2 + 2], fill=OUT)   # the drop
            d.rectangle([X1 - 30, Y0 + H // 2 - 4, X1 - 24, Y0 + H // 2 + 10], fill=IRON[3], outline=OUT)                                    # the lever
    by = Y0 + H // 2 - 10
    if c.era == "age-of-reason":                                                                                                        # the triple tree: three beams on three posts
        tri = [(X0 + 16, by + 30), (X1 - 16, by + 30), (cx, Y0 + 10)]
        for (ax_, ay_), (bx_, by_) in zip(tri, tri[1:] + tri[:1]):
            d.line([ax_, ay_, bx_, by_], fill=OUT, width=9); d.line([ax_, ay_, bx_, by_], fill=Wd[3], width=6)
        for px_, py_ in tri: d.rectangle([px_ - 7, py_ - 7, px_ + 7, py_ + 7], fill=Wd[1], outline=OUT)
        for i in range(n):
            for (ax_, ay_), (bx_, by_) in zip(tri, tri[1:] + tri[:1]):
                mx_, my_ = (ax_ + bx_) / 2 + (i - (n - 1) / 2) * 14, (ay_ + by_) / 2; d.ellipse([mx_ - 5, my_ + 4, mx_ + 5, my_ + 14], outline=HEMP[1], width=2)
        lx = X0 + 30                                                                                                                    # the cart drawn under
        d.rectangle([lx, Y1 - 52, lx + 40, Y1 - 30], fill=c.wood[2], outline=OUT); d.ellipse([lx - 4, Y1 - 50, lx + 4, Y1 - 32], fill=c.wood[1], outline=OUT)
        return
    for px_ in (X0 + 14, X1 - 26): d.rectangle([px_, by - 6, px_ + 12, by + 6], fill=Wd[1], outline=OUT)                                    # the uprights' tops
    d.rectangle([X0 + 14, by - 4, X1 - 14, by + 4], fill=Wd[3], outline=OUT); d.line([X0 + 15, by - 3, X1 - 15, by - 3], fill=Wd[4])        # the beam
    if c.rich: motif(tm, X0 + 30, by - 2, X1 - 30, by + 2, c, 4)
    for i in range(n):
        rx = cx + (i - (n - 1) / 2) * 30; rope(d, [(rx, by), (rx, by + 14)], HEMP, 2); d.ellipse([rx - 6, by + 14, rx + 6, by + 26], outline=HEMP[1], width=3)
    if per in "ME":
        lx = X0 + 30 if c.ek % 2 else X1 - 46                                                                                               # the ladder
        for k in (lx, lx + 14): d.line([k, by + 4, k + 4, Y1 - 30], fill=OUT, width=5); d.line([k, by + 4, k + 4, Y1 - 30], fill=c.wood[3], width=3)
        for t in np.arange(.1, 1, .16): yy = by + 4 + (Y1 - 34 - by) * t; d.line([lx + 1 + 4 * t, yy, lx + 15 + 4 * t, yy], fill=c.wood[2], width=2)


define("gallows", draw=_obj(gallows, "dark-ages", off=5), front=True, clear=3, mount="ground", tags=("square", "field"), axes={"ropes": [1, 2, 3]},
       ref="a town gallows or drop scaffold about 10 by 8 ft (execution scaffold drawings, Tyburn and Montfaucon)")


def rack(tm, x, y, w, h, st, v, c):
    """The rack from above: a long heavy frame of timber with a roller at each end, turned by spoked handles, the
    ropes running from the rollers to the iron cuffs, and the irons of the trade beside it: tongs, a brazier with its
    coals or nothing. Dark Ages: crossed handles at both rollers; Long Night: a great spoked windlass wheel at one
    end; Renaissance: wheels at both ends and a spiked roller across the bed; Age of Reason: the frame bound with
    iron straps. The rich court's rack has carved ends and its frame painted or inlaid in the land's manner."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; cy = (Y0 + Y1) // 2; irons = c.axis("irons", "tongs")
    Wd = ramp(c.S["wood"], 18); Pn = c.paint
    slab(tm, X0, Y0, X1, Y1 - 14, c.stone, None, gaps=range(14, H - 14, 14))                                                          # the flags it stands on
    fy0, fy1 = Y0 + 6, Y1 - 18
    for yy in (fy0, fy1 - 10): d.rectangle([X0 + 4, yy, X1 - 4, yy + 10], fill=Wd[2], outline=OUT); d.line([X0 + 5, yy + 1, X1 - 5, yy + 1], fill=Wd[4])   # the side rails
    for k in range(X0 + 30, X1 - 30, 14): d.rectangle([k, fy0 + 10, k + 8, fy1 - 10], fill=Wd[1], outline=OUT)                            # the slats of its bed
    era = c.era
    for i, rx in enumerate((X0 + 10, X1 - 22)):                                                                                          # rollers and handles
        d.rectangle([rx, fy0 + 4, rx + 12, fy1 - 4], fill=Pn[2], outline=OUT); d.line([rx + 6, fy0 + 6, rx + 6, fy1 - 6], fill=Pn[0])
        if era == "renaissance" or era == "long-night" and i == 1:                                                                      # a great spoked windlass wheel
            wcx, wcy, wr = rx + 6, cy - 4, (fy1 - fy0) // 2 - 2
            d.ellipse([wcx - wr, wcy - wr, wcx + wr, wcy + wr], outline=OUT, width=5); d.ellipse([wcx - wr + 1, wcy - wr + 1, wcx + wr - 1, wcy + wr - 1], outline=Wd[3], width=3)
            for a_ in range(0, 360, 45): d.line([wcx, wcy, wcx + math.cos(math.radians(a_)) * wr, wcy + math.sin(math.radians(a_)) * wr], fill=Wd[2], width=2)
        else:
            for t in (0, 1): d.line([rx - 6 + t * 24, fy0 + 2, rx + 18 - t * 24, fy1 - 2], fill=OUT, width=4); d.line([rx - 6 + t * 24, fy0 + 2, rx + 18 - t * 24, fy1 - 2], fill=Wd[4], width=2)
    if era == "renaissance":                                                                                                              # the spiked roller across the middle
        d.rectangle([X0 + W // 2 - 8, fy0 + 8, X0 + W // 2 + 8, fy1 - 8], fill=c.iron[2], outline=OUT)
        for yy in range(fy0 + 12, fy1 - 10, 6): d.rectangle([X0 + W // 2 - 5, yy, X0 + W // 2 - 2, yy + 2], fill=IRON[4]); d.rectangle([X0 + W // 2 + 2, yy + 3, X0 + W // 2 + 5, yy + 5], fill=IRON[4])
    elif era == "age-of-reason":                                                                                                          # iron straps binding the frame
        for k in range(X0 + 24, X1 - 20, 28): d.rectangle([k, fy0 - 1, k + 5, fy1 + 1], fill=IRON[1], outline=OUT)
    for yy in (cy - 14, cy + 2):
        rope(d, [(X0 + 22, yy), (X0 + 50, yy + 3)], HEMP, 2); rope(d, [(X1 - 22, yy), (X1 - 50, yy + 3)], HEMP, 2)
        for ex in (X0 + 52, X1 - 52): d.ellipse([ex - 5, yy - 2, ex + 5, yy + 8], outline=c.iron[3], width=3)
    if c.rich: motif(tm, X0 + 40, fy0 + 2, X1 - 40, fy0 + 8, c); motif(tm, X0 + 40, fy1 - 8, X1 - 40, fy1 - 2, c)
    if irons == "tongs":
        for k in (0, 1): d.line([X0 + 30 + k * 40, Y1 - 10, X0 + 64 + k * 40, Y1 - 4], fill=OUT, width=4); d.line([X0 + 30 + k * 40, Y1 - 10, X0 + 64 + k * 40, Y1 - 4], fill=c.iron[3], width=2)
    elif irons == "brazier":
        bx, by = X1 - 40, Y1 - 9
        d.ellipse([bx - 12, by - 8, bx + 12, by + 8], fill=c.iron[1], outline=OUT); d.ellipse([bx - 9, by - 6, bx + 9, by + 6], fill=(60, 16, 14))
        for k in range(5): d.rectangle([bx - 7 + k * 3, by - 3 + (k % 2) * 3, bx - 5 + k * 3, by - 1 + (k % 2) * 3], fill=(250, 150 - k * 15, 40))
        d.line([bx - 20, by - 6, bx + 2, by + 1], fill=c.iron[3], width=2)
        return [(bx, by, 60, (1.5, 1.02, .5))]


define("rack", draw=_obj(rack, "dark-ages"), front=True, clear=3, tags=("dungeon",), axes={"irons": ["tongs", "brazier", "none"]},
       ref="a torture rack about 7 to 8 ft long and 3 to 4 ft wide (surviving racks of the Tower of London and German torture chambers)")


def shackles(tm, x, y, w, h, st, v, c):
    """Chains on the wall from above: an iron staple bar set along the foot of the wall in a stone sill, the chains
    hanging from its rings and lying in loops on the floor with their cuffs open at the ends. Dark Ages to Renaissance:
    black forged iron, rust on the poor; Age of Reason: bilboes, the cuffs on a sliding bar on the floor; Victorian:
    ring bolts in the stone and linked handcuffs; Great War: steel chain and cuffs; Mid-Century: short chains and
    handcuffs; Modern: steel chain ending in plastic ties through steel eyes; Future Darkness: lit cuffs. Wrist, neck or ankle irons."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; per = c.per
    Fe = (c.iron if per in "MEV" else STEEL) if per != "F" else c.comp; Fe = ramp(mix(Fe[2], c.S["paint"], .3), 18)
    d.rectangle([X0, Y0, X1, Y0 + H // 2], fill=c.stone[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=c.stone[4])         # the sill at the wall's foot
    era = c.era
    if era == "victorian":                                                                                                                  # ring bolts let into the stone, no bar
        for i in range(3): rx = X0 + (i + 1) * W // 4; d.ellipse([rx - 6, Y0 + 1, rx + 6, Y0 + 9], fill=c.stone[1], outline=Fe[2], width=3)
    else: d.rectangle([X0 + 4, Y0 + 2, X1 - 4, Y0 + 5], fill=Fe[1], outline=OUT)                                                            # the staple bar
    kind = c.axis("cuffs", "wrists"); n = {"wrists": 2, "neck": 1, "ankles": 2}[kind]
    if era == "age-of-reason":                                                                                                              # bilboes: the cuffs on a sliding bar on the floor
        d.rectangle([X0 + 8, Y1 - 7, X1 - 8, Y1 - 3], fill=Fe[2], outline=OUT)
        for i in range(n + 1): kx = X0 + (i + 1) * W // (n + 2); d.ellipse([kx - 6, Y1 - 10, kx + 6, Y1 - 1], outline=Fe[4], width=3)
        chain(d, [(X0 + W // 2, Y0 + 6), (X0 + W // 2 + 4, Y1 - 8)], Fe, 4)
        n = 0
    for i in range(n):
        rx = X0 + (i + 1) * W // (n + 1); d.ellipse([rx - 4, Y0 + 1, rx + 4, Y0 + 7], outline=Fe[3], width=2)
        short = era == "mid-century"; end = (rx + (8 if i else -8), Y0 + H // 2 + 6 if short else Y1 - 4)
        chain(d, [(rx, Y0 + 6), (rx + (6 if i else -6), Y0 + H // 2 + 2), end] if not short else [(rx, Y0 + 6), end], Fe, 4)
        r = 6 if kind != "neck" else 8
        if era == "modern":                                                                                                                 # a plastic tie through a steel eye
            d.rectangle([end[0] - 3, end[1] - 6, end[0] + 3, end[1] - 2], fill=STEEL[3], outline=OUT); d.ellipse([end[0] - r, end[1] - 4, end[0] + r, end[1] + 3], outline=Fe[4], width=2)
        elif era in ("victorian", "mid-century"):                                                                                           # handcuffs: two linked bracelets
            for o in (-r, r): d.ellipse([end[0] + o - 5, end[1] - 4, end[0] + o + 5, end[1] + 4], outline=Fe[4], width=3)
        else: d.ellipse([end[0] - r, end[1] - r // 2 - 1, end[0] + r, end[1] + r // 2 + 1], outline=Fe[4] if per != "F" else c.glow[1], width=3)
    if c.rich: motif(tm, X0 + 4, Y0 + 7, X1 - 4, Y0 + H // 2 - 1, c, 3)


define("shackles", draw=_obj(shackles, "dark-ages", off=3, chip=False), front=True, clear=2, mount="wall", tags=("dungeon", "cell", "cellar", "feeding"),
       axes={"cuffs": ["wrists", "ankles", "neck"]}, ref="wall chains on a staple bar about 4 ft long, the chains 2 to 3 ft (gaol and dungeon fittings)")


def cellbars(tm, x, y, w, h, st, v, c):
    """Cell bars in the wall's place from above: the stone or concrete sill they stand in, the tops of the bars in a
    row, the flat strap that binds them, and the barred gate in the middle with its lock, shut in line or swung open
    into the passage. Dark Ages: squared oak bars banded with iron (timber or bamboo where iron is dear); Long Night
    and Renaissance: wrought iron; Age of Reason: wider set, with flat straps between; Victorian: close round cast
    bars; Great War: riveted steel; Mid-Century: broad flat steel bars; Modern: thin painted steel bars and a sliding
    gate on its track; a food hatch in the gate or a mesh plate on the passage side; Future Darkness: lit bars."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; per = c.per; opn = st == "open"
    B = _bars_mat(c); sill = c.stone if per in "MEV" else ramp(mix((170, 168, 160), c.S["stone"], .4), 10)
    d.rectangle([X0, Y0, X1, Y1], fill=sill[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=sill[4])
    gx0, gx1 = X0 + W * 3 // 8, X0 + W * 5 // 8
    era = c.era; sp, bs = {"dark-ages": (9, 6), "long-night": (9, 5), "renaissance": (9, 5), "age-of-reason": (13, 4), "victorian": (7, 4),
                           "great-war": (9, 5), "mid-century": (12, 6), "modern": (10, 3)}.get(era, (9, 5))
    for k in range(X0 + 5, X1 - 3, sp):
        if opn and gx0 < k < gx1: continue
        if era == "victorian": d.ellipse([k - 3, Y0 + 1, k + 3, Y1 - 1], fill=B[3], outline=OUT)                                           # round cast bars
        else: d.rectangle([k - bs // 2, Y0 + 1, k + bs // 2, Y1 - 1], fill=B[3], outline=OUT); d.point((k - 1, Y0 + 2), fill=B[4])
    if era == "age-of-reason":                                                                                                         # flat straps between
        for k in range(X0 + 5 + sp // 2, X1 - 3, sp): d.rectangle([k - 1, Y0 + 2, k + 1, Y1 - 2], fill=B[1])
    if era == "great-war":
        for k in range(X0 + 5, X1 - 3, sp): rivet(tm, k, Y0 + H // 2)
    if era == "modern": d.rectangle([X0 + 2, Y1 - 2, X1 - 2, Y1], fill=STEEL[1])                                                      # the sliding gate's track
    d.rectangle([X0 + 2, Y0 + H // 2 - 1, X1 - 2, Y0 + H // 2 + 1], fill=B[1])                                                        # the strap
    guard = c.axis("guard", "none")
    if guard == "hatch" and not opn:                                                                                                   # the food hatch in the gate
        hx = (gx0 + gx1) // 2; d.rectangle([hx - 8, Y0 + 1, hx + 8, Y1 - 1], fill=B[2], outline=OUT); d.line([hx - 6, Y0 + H // 2, hx + 6, Y0 + H // 2], fill=B[4])
    elif guard == "mesh":                                                                                                              # a mesh plate on the passage side
        d.rectangle([X0 + 2, Y1 - 3, X1 - 2, Y1 - 1], fill=B[4], outline=OUT)
        for k in range(X0 + 4, X1 - 3, 3): d.point((k, Y1 - 2), fill=B[0])
    if c.rich and per != "F":
        for k in range(X0 + 5, X1 - 3, sp * 2):
            if not (opn and gx0 < k < gx1): d.rectangle([k - 2, Y0 + H // 2 - 2, k + 1, Y0 + H // 2 + 1], fill=c.metal[3])          # finials at the binding strap
    if opn:
        L = gx1 - gx0; d.line([gx0, Y1, gx0 + L * .2, Y1 + L * .95], fill=OUT, width=7); d.line([gx0, Y1, gx0 + L * .2, Y1 + L * .95], fill=B[3], width=4)
    else:
        d.rectangle([gx0, Y0, gx1, Y1], outline=B[0], width=2)
        d.rectangle([gx1 - 8, Y0 + 1, gx1 - 2, Y1 - 1], fill=c.metal[2] if per != "F" else c.glow[1], outline=OUT)                    # the lock
    if per == "F":
        for k in range(X0 + 5, X1 - 3, sp * 2): d.rectangle([k - 1, Y0 + 2, k + 1, Y1 - 2], fill=c.glow[2])


define("cellbars", draw=_obj(cellbars, "dark-ages", off=3, chip=False), front=True, clear=3, states=("closed", "open"), tags=("cell", "dungeon", "guardroom"),
       axes={"guard": ["none", "hatch", "mesh"]},
       ref="a row of cell bars 7 to 9 ft long with a 3 ft gate, set in the wall line (gaol fittings)")


def hitching(tm, x, y, w, h, st, v, c):
    """A hitching rail from above: the long rail on its posts with iron rings, and maybe a horse's rope or halter
    tied to it. Dark Ages to Age of Reason: a split pole lashed or pegged to forked posts, rings on the rich ones
    (iron-banded posts in the Long Night, a stone mounting block in the Renaissance, a water trough in the Age of
    Reason);
    Victorian: a turned rail on squared posts, or cast-iron horse-head posts in the town; Great War and Mid-Century:
    a painted pipe rail on iron posts, on concrete footings with banded paint in the Mid-Century. The trampled ground under it is worn bare."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 0); W, H = X1 - X0, Y1 - Y0; per = c.per; cy = (Y0 + Y1) // 2; tied = c.axis("tied", "none")
    R_ = region_mat(c) if per in "ME" else (c.paint if per == "V" and c.w >= 2 else (ramp(mix((90, 94, 100), c.S["paint"], .55), 18) if per == "W" else c.wood))
    d.rounded_rectangle([X0, Y0 + 2, X1, Y1 - 1], 6, fill=ramp(mix((120, 100, 76), c.S["stone"], .5), 10)[1])                            # trampled ground
    for px_ in (X0 + 6, X1 - 18, X0 + W // 2 - 6) if W > 100 else (X0 + 6, X1 - 18):
        if per == "V" and c.rich:
            d.ellipse([px_ - 2, cy - 8, px_ + 14, cy + 8], fill=IRON[2], outline=OUT); d.ellipse([px_ + 6, cy - 6, px_ + 16, cy + 2], fill=IRON[3], outline=OUT)   # horse-head post
        else:
            d.rectangle([px_, cy - 7, px_ + 12, cy + 7], fill=R_[1], outline=OUT); d.rectangle([px_ + 3, cy - 4, px_ + 9, cy + 4], fill=R_[3])
    d.rectangle([X0 + 2, cy - 3, X1 - 2, cy + 3], fill=R_[2], outline=OUT); d.line([X0 + 3, cy - 2, X1 - 3, cy - 2], fill=R_[4])       # the rail
    if per in "ME" and not c.rich:
        for px_ in (X0 + 12, X1 - 12): lash(d, px_ - 3, cy, HEMP, 3)
    else:
        for k in (X0 + W // 4, X0 + 3 * W // 4): d.ellipse([k - 4, cy - 1, k + 4, cy + 7], outline=c.metal[3], width=2)
    era = c.era
    if era == "long-night":                                                                                       # heavy iron bands round the posts
        for px_ in (X0 + 6, X1 - 18): d.rectangle([px_ - 2, cy - 9, px_ + 14, cy + 9], outline=IRON[1], width=3)
    elif era == "renaissance":                                                                                    # a mounting block of stone steps at the end
        for i in range(3): d.rectangle([X1 - 30 + i * 6, Y0 + 1, X1 - 2, Y1 - 1 - i * 2], fill=c.stone[1 + i], outline=OUT)
    elif era == "age-of-reason":                                                                                  # the water trough along it
        d.rectangle([X0 + 20, cy + 4, X1 - 20, Y1 - 1], fill=c.wood[1], outline=OUT); d.rectangle([X0 + 23, cy + 6, X1 - 23, Y1 - 3], fill=(70, 96, 110))
    elif era == "mid-century":                                                                                    # concrete footings and banded paint
        for px_ in (X0 + 6, X1 - 18): d.rectangle([px_ - 4, Y0 + 1, px_ + 16, Y1 - 1], outline=(176, 172, 164), width=3)
        for k in range(X0 + 10, X1 - 10, 16): d.rectangle([k, cy - 3, k + 7, cy + 3], fill=(230, 226, 214), outline=OUT)
    if c.rich: motif(tm, X0 + 24, cy - 2, X0 + W // 2 - 10, cy + 2, c, 3)
    if tied != "none":
        k = X0 + W // 4; C_ = HEMP if tied == "rope" else ramp((110, 70, 40), 14)
        rope(d, [(k, cy + 3), (k + 6, Y1 - 2), (k + 30, Y1 - 1)], C_, 2)
        if tied == "halter": d.rectangle([k + 26, Y1 - 4, k + 36, Y1], fill=c.metal[3], outline=OUT)


define("hitching", draw=_obj(hitching, "dark-ages", off=3, chip=False), front=True, clear=4, mount="ground", tags=("street", "taproom", "square", "yard"),
       axes={"tied": ["none", "rope", "halter"]}, ref="a hitching rail 6 to 8 ft long on two posts about 3 ft high (frontier and coaching-inn photographs)")


# ================================================================ machines made the same the world over (global_from): no regional look.
# Their looks come from makers' liveries, size, fit-out, what they hold and wear (DRAWING.md: never make up a regional look).
LIVERY = {"black": (36, 36, 40), "charcoal": (72, 74, 80), "grey": (150, 152, 156), "putty": (186, 178, 152), "beige": (208, 198, 170),
          "white": (224, 224, 220), "red": (172, 40, 36), "blue": (44, 72, 134), "green": (70, 104, 84), "cream": (226, 214, 180)}


def liv(c, name, step=14, fk=.45):
    """A maker's livery as a ramp; Future Darkness turns it to dark composite with only a hint of the colour."""
    base = LIVERY.get(name, LIVERY["grey"])
    if c.per == "F": base = mix(COMPOSITE[2], base, fk)
    return ramp(base, step)


def serverrack(tm, x, y, w, h, st, v, c):
    """A server rack from above, its door toward the aisle at the south. The steel top shows its vent mesh and the
    patch leads coming out of the back; the front, foreshortened along the south edge, shows the stacked units as fine
    horizontal lines with their status lights, blanking panels in the empty slots, and the door over them: perforated
    mesh, smoked glass or none. Black, graphite, grey, the putty of the 1990s or white; full or half height; full,
    half or sparse; leads tied in a tray, spilling or in a tangle. Modern; Future Darkness: a dark sealed cabinet with
    lit seams. Lit: green, amber and blue lights; out: dark."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; lit = st != "out"; per = c.per
    C_ = liv(c, c.axis("make", "black")); full = c.axis("height", "full") == "full"; fill = c.axis("fill", "full"); cab = c.axis("cables", "tidy"); door = c.axis("door", "mesh")
    fh = int(H * (.42 if full else .26)); fy = Y1 - fh
    d.rectangle([X0, Y0, X1, fy], fill=C_[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C_[4]); d.line([X0 + 1, Y0 + 1, X0 + 1, fy - 1], fill=C_[3])
    for yy in range(Y0 + 14, fy - 4, 3):                                                                                        # vent mesh on the top
        for xx in range(X0 + 5 + (yy % 2), X1 - 4, 3): d.point((xx, yy), fill=C_[0])
    leads = [(60, 110, 210), (230, 200, 60), (150, 150, 156), (200, 60, 60), (70, 170, 90), (230, 230, 230)]
    if cab == "tidy":
        d.rectangle([X0 + 5, Y0 + 3, X1 - 5, Y0 + 11], fill=STEEL[1], outline=OUT)
        for i, k in enumerate(range(X0 + 7, X1 - 6, 2)): d.line([k, Y0 + 4, k, Y0 + 10], fill=leads[i % len(leads)])
    else:
        n = 6 if cab == "spill" else 9
        for i in range(n):
            x0_ = X0 + 6 + (i * 5) % (W - 10); c_ = leads[i % len(leads)]
            lw_ = 6 + (i % 3) * 3 + (6 if cab == "tangle" else 0)                                                                # a lead looping up out of the top
            d.arc([x0_ - lw_ // 2, Y0 - 2, x0_ + lw_ // 2, Y0 + 12 + i % 2 * 4], 170, 370, fill=OUT, width=4); d.arc([x0_ - lw_ // 2, Y0 - 2, x0_ + lw_ // 2, Y0 + 12 + i % 2 * 4], 170, 370, fill=c_, width=2)
        if cab == "tangle": d.arc([X0 - 2, Y0 + 6, X1 + 2, Y0 + 30], 190, 350, fill=leads[0], width=2); d.arc([X0 + 4, Y0 + 2, X1 - 2, Y0 + 24], 200, 330, fill=leads[1], width=2)
    d.rectangle([X0, fy, X1, Y1], fill=C_[1], outline=OUT)                                                                     # the front, foreshortened
    ux0, ux1 = X0 + 4, X1 - 4; nu = max(4, (fh - 6) // 3)
    used = {"full": nu, "half": nu // 2 + 1, "sparse": max(2, nu // 4)}[fill]
    for i in range(nu):
        yy = fy + 3 + i * 3
        if yy + 2 > Y1 - 3: break
        if i < used or (fill == "half" and i % 3 == 0):
            d.rectangle([ux0, yy, ux1, yy + 2], fill=(52, 54, 60) if per != "F" else c.comp[1]); d.line([ux0, yy + 2, ux1, yy + 2], fill=(20, 20, 24))
            for k in (ux0 + 2, ux0 + 5): d.rectangle([k, yy, k + 1, yy + 1], fill=((70, 230, 110), (240, 180, 40), (80, 160, 250))[(i + k) % 3] if lit else (40, 44, 50))
            d.line([ux0 + 9, yy + 1, ux1 - 3, yy + 1], fill=(84, 86, 94))
        else:
            d.rectangle([ux0, yy, ux1, yy + 2], fill=C_[2]); d.line([ux0, yy + 2, ux1, yy + 2], fill=C_[0])                     # blanking panel
    if door == "mesh":
        for yy in range(fy + 2, Y1 - 1, 2):
            for xx in range(X0 + 2 + (yy % 4) // 2, X1 - 1, 4): d.point((xx, yy), fill=C_[0])
        d.rectangle([X1 - 5, fy + fh // 3, X1 - 3, fy + 2 * fh // 3], fill=STEEL[4])
    elif door == "glass":
        d.rectangle([X0 + 2, fy + 2, X1 - 2, Y1 - 2], outline=(90, 120, 140)); d.line([X0 + 4, fy + 4, X0 + 10, fy + 4], fill=(170, 200, 220), width=2)
        d.rectangle([X1 - 5, fy + fh // 3, X1 - 3, fy + 2 * fh // 3], fill=STEEL[4])
    if per == "F": d.line([X0 + 1, fy, X1 - 1, fy], fill=c.glow[1] if lit else c.comp[3], width=2); d.line([X0 + 1, Y0 + 2, X0 + 1, fy - 2], fill=c.glow[0])
    return [(X0 + W // 2, Y1 + 6, 30, COLD)] if lit else []


SERVERRACK_MODELS = [dict(make=m, height=hh, fill=f, cables=cb, door=dr) for m, hh, f, cb, dr in (
    ("black", "full", "full", "tidy", "mesh"), ("grey", "full", "half", "spill", "glass"), ("putty", "half", "full", "tangle", "open"),
    ("black", "half", "sparse", "spill", "glass"), ("white", "full", "full", "tidy", "glass"), ("charcoal", "full", "sparse", "tangle", "mesh"),
    ("grey", "half", "half", "tidy", "open"), ("black", "full", "half", "tangle", "open"), ("putty", "full", "sparse", "spill", "mesh"),
    ("white", "half", "half", "spill", "mesh"))]


define("serverrack", draw=_obj(serverrack, "modern", off=5, presets=SERVERRACK_MODELS), front=True, clear=3, states=("lit", "out"), tags=("servers", "control", "office"), global_from=1990,
       axes={"model": list(range(len(SERVERRACK_MODELS)))},
       ref="a 42U 19 in rack cabinet is 600 mm wide and 1000 to 1070 mm deep (EIA-310 rack makers' tables)")


def console(tm, x, y, w, h, st, v, c):
    """A control console from above, its sloped desk toward the operator at the south and its upright panel against
    the wall, in a maker's enamel (grey, hammertone green, beige, black or a maker's blue). Mid-Century: rows of round
    dial gauges, toggle switches, coloured lamp buttons and a round green oscilloscope; Modern: a desk of flat screens
    with a keyboard, a mouse, a telephone and a mug; Future Darkness: one curved dark glass surface with lit touch
    panels. Papers, mugs or clean. Lit or out."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; lit = st != "out"; per = c.per
    Sh = liv(c, c.axis("make", "grey")); cl = c.axis("clutter", "papers"); up = Y0 + int(H * .38)
    d.rectangle([X0, Y0, X1, up], fill=Sh[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Sh[4])
    d.rectangle([X0, up, X1, Y1], fill=Sh[2], outline=OUT); d.line([X0 + 1, Y1 - 2, X1 - 1, Y1 - 2], fill=Sh[0])
    if per == "W":
        nd = 6 if c.axis("layout", "dials") == "dials" else 3
        for i in range(nd):
            k = X0 + 12 + i * (W - 24) // max(1, nd - 1) if nd > 1 else X0 + W // 2
            d.ellipse([k - 7, Y0 + 5, k + 7, Y0 + 19], fill=WHITE[3], outline=OUT); d.line([k, Y0 + 12, k + 4 - (i * 3) % 8, Y0 + 7], fill=(160, 30, 30))
        if nd == 3:
            for k in range(X0 + W // 2 + 30, X1 - 8, 8): d.rectangle([k, Y0 + 6, k + 5, Y0 + 18], fill=(30, 30, 30), outline=STEEL[3])   # strip recorders
        sx = X0 + W // 2 - (0 if nd == 6 else 34); d.ellipse([sx - 10, up - 18, sx + 10, up + 2], fill=(20, 60, 30) if lit else (24, 30, 26), outline=STEEL[3])
        if lit: d.line([sx - 7, up - 8, sx - 3, up - 12, sx + 1, up - 5, sx + 6, up - 9], fill=(120, 250, 140))
        for row in range(3):
            yy = up + 8 + row * 12
            for i, k in enumerate(range(X0 + 10, X1 - 8, 10)):
                if row == 1: d.rectangle([k - 1, yy - 3, k + 1, yy + 3], fill=STEEL[4], outline=OUT)
                else:
                    col = ((220, 60, 50), (240, 200, 60), (80, 200, 90), (240, 240, 230))[(i + row) % 4]
                    d.ellipse([k - 3, yy - 3, k + 3, yy + 3], fill=col if lit else tone(col, -110), outline=OUT)
    elif per == "N":
        n = 3 if c.axis("layout", "dials") == "dials" else 2
        for i in range(n):
            sx0 = X0 + 6 + i * (W - 12) // n; sx1 = sx0 + (W - 12) // n - 6
            d.rectangle([sx0 + (sx1 - sx0) // 2 - 5, up - 2, sx0 + (sx1 - sx0) // 2 + 5, up + 4], fill=PLASTIC_GREY[0])
            feed(d, sx0, Y0 + 6, sx1, up - 4, lit, i + c.ek, c)
        kc = (40, 40, 44) if c.axis("make", "grey") in ("black", "charcoal") else PLASTIC_GREY[1]
        d.rectangle([X0 + W // 2 - 26, up + 10, X0 + W // 2 + 26, up + 22], fill=kc, outline=OUT)
        for k in range(X0 + W // 2 - 24, X0 + W // 2 + 24, 4): d.line([k, up + 12, k, up + 20], fill=tone(kc, 30))
        d.ellipse([X0 + W // 2 + 32, up + 12, X0 + W // 2 + 40, up + 22], fill=PLASTIC_GREY[3], outline=OUT)
        d.rectangle([X0 + 8, up + 8, X0 + 26, up + 22], fill=(40, 40, 44), outline=OUT); d.rectangle([X0 + 10, up + 10, X0 + 24, up + 13], fill=(70, 70, 76))
        if lit:
            for k in range(X0 + 40, X0 + W // 2 - 32, 8): d.rectangle([k, up + 14, k + 3, up + 16], fill=((80, 200, 90), (240, 180, 40))[(k // 8) % 2])
    else:
        if c.axis("layout", "dials") == "dials":
            d.rounded_rectangle([X0 + 4, Y0 + 4, X1 - 4, up - 2], 6, fill=c.comp[0], outline=c.glow[1] if lit else c.comp[3])
        else:
            for k in range(3): d.rounded_rectangle([X0 + 4 + k * (W - 8) // 3, Y0 + 4, X0 + 2 + (k + 1) * (W - 8) // 3, up - 2], 4, fill=c.comp[0], outline=c.glow[1] if lit else c.comp[3])
            d.ellipse([X0 + W // 2 - 20, up + 4, X0 + W // 2 + 20, Y1 - 6], fill=c.glow[0] if lit else c.comp[1], outline=c.glow[1] if lit else c.comp[3])   # a round touch table
        if lit:
            for k in range(X0 + 12, X1 - 20, 22): d.rectangle([k, Y0 + 9, k + 16, up - 8], fill=c.glow[0], outline=c.glow[1])
            for k in range(X0 + 14, X1 - 10, 14): d.rectangle([k, up + 10, k + 8, up + 16], fill=c.glow[1])
        d.line([X0 + 3, Y1 - 3, X1 - 3, Y1 - 3], fill=c.glow[1] if lit else c.comp[3], width=2)
    if cl == "mugs":
        for mx_, col in ((X1 - 22, (200, 60, 50)), (X1 - 40, WHITE[3])):
            d.ellipse([mx_ - 5, Y1 - 18, mx_ + 5, Y1 - 8], fill=col, outline=OUT); d.ellipse([mx_ - 3, Y1 - 16, mx_ + 3, Y1 - 10], fill=(70, 40, 24))
    elif cl == "papers":
        for k in range(3): d.rectangle([X1 - 46 + k * 4, Y1 - 24 + k * 2, X1 - 22 + k * 4, Y1 - 6 + k], fill=WHITE[4 - k], outline=OUT)
        for yy in range(Y1 - 20, Y1 - 8, 3): d.line([X1 - 34, yy, X1 - 18, yy], fill=WHITE[1])
    return [(X0 + W // 2, Y1 + 8, 46, COLD if per != "W" else (1.0, 1.3, 1.1))] if lit else []


CONSOLE_MODELS = [dict(make=m, layout=l, clutter=cl) for m, l, cl in (
    ("grey", "dials", "papers"), ("green", "recorders", "mugs"), ("beige", "dials", "clean"), ("black", "recorders", "papers"), ("blue", "dials", "mugs"),
    ("green", "dials", "papers"), ("black", "dials", "clean"), ("blue", "recorders", "papers"), ("white", "dials", "papers"), ("white", "recorders", "mugs"))]


define("console", draw=_obj(console, "mid-century", presets=CONSOLE_MODELS), front=True, clear=3, states=("lit", "out"), tags=("control", "lab", "station"), global_from=1919,
       axes={"model": list(range(len(CONSOLE_MODELS)))},
       ref="a control-room operator console 5 to 7 ft long and about 3 ft deep (broadcast and plant control-room furniture catalogues)")


def monitors(tm, x, y, w, h, st, v, c):
    """A bank of security monitors on a desk from above, each tipped back so its screen shows: Mid-Century (from the
    1970s): deep cased tubes in grey, beige or black with a camera picture each, a video recorder and a camera
    joystick; Modern: thin flat screens on stands, the pictures split into four; Future Darkness: a curved dark panel
    of feeds with lit edges. Two, three or four screens on a grey, wood-grain or black desk. Lit or out."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; lit = st != "out"; per = c.per
    n = int(c.axis("count", 3)); Sh = liv(c, c.axis("make", "grey"))
    Dk = {"grey": ramp((150, 150, 146), 10), "wood": ramp((150, 104, 64), 14), "black": ramp((56, 56, 60), 10), "white": ramp((222, 220, 212), 8),
          "teak": ramp((116, 70, 40), 14), "green": ramp((96, 116, 96), 12), "steel": ramp((96, 110, 132), 12),
          "maple": ramp((196, 156, 104), 14), "red": ramp((178, 52, 46), 12), "cream": ramp((222, 212, 176), 12)}[c.axis("desk", "grey")]
    slab(tm, X0, Y0, X1, Y1, Dk, "x")
    if per == "F":
        d.rounded_rectangle([X0 + 3, Y0 + 3, X1 - 3, Y0 + int(H * .62)], 5, fill=c.comp[0], outline=c.glow[1] if lit else c.comp[3])
        for i in range(n): feed(d, X0 + 7 + i * (W - 14) // n, Y0 + 7, X0 + 3 + (i + 1) * (W - 14) // n, Y0 + int(H * .62) - 4, lit, i + c.ek, c)
    else:
        for i in range(n):
            mx0 = X0 + 3 + i * (W - 6) // n; mx1 = mx0 + (W - 6) // n - 3
            if per == "W":
                d.rectangle([mx0, Y0 + 3, mx1, Y0 + int(H * .7)], fill=Sh[2], outline=OUT); d.line([mx0 + 1, Y0 + 4, mx1 - 1, Y0 + 4], fill=Sh[4])
                for k in range(mx0 + 4, mx1 - 3, 4): d.line([k, Y0 + 7, k, Y0 + 13], fill=Sh[0])
                feed(d, mx0 + 3, Y0 + int(H * .7) - 12, mx1 - 3, Y0 + int(H * .7) - 2, lit, i + c.ek, c)
            else:
                d.rectangle([mx0 + (mx1 - mx0) // 2 - 4, Y0 + 12, mx0 + (mx1 - mx0) // 2 + 4, Y0 + 18], fill=Sh[1])
                d.rectangle([mx0, Y0 + 3, mx1, Y0 + 13], fill=Sh[1], outline=OUT)
                feed(d, mx0 + 1, Y0 + 4, mx1 - 1, Y0 + 12, lit, i + c.ek, c)
                if lit: d.line([(mx0 + mx1) // 2, Y0 + 4, (mx0 + mx1) // 2, Y0 + 12], fill=(30, 34, 40))
    jy = Y1 - 12
    if per == "W":
        d.rectangle([X0 + 6, jy - 4, X0 + 40, jy + 6], fill=(40, 40, 44), outline=OUT); d.rectangle([X0 + 9, jy - 1, X0 + 20, jy + 1], fill=(20, 20, 22))
        d.rectangle([X0 + 30, jy - 2, X0 + 33, jy], fill=(220, 60, 50) if lit else (60, 30, 30))
    d.ellipse([X1 - 24, jy - 6, X1 - 10, jy + 6], fill=(40, 40, 44), outline=OUT); d.ellipse([X1 - 19, jy - 3, X1 - 15, jy + 1], fill=(200, 50, 40))
    return [(X0 + W // 2, Y1 + 6, 34, COLD)] if lit else []


MONITORS_MODELS = [dict(make=m, count=n, desk=dk) for m, n, dk in (
    ("grey", 3, "grey"), ("beige", 2, "wood"), ("black", 4, "black"), ("putty", 3, "white"), ("grey", 4, "teak"), ("beige", 4, "green"),
    ("black", 2, "steel"), ("putty", 3, "maple"), ("beige", 3, "red"), ("black", 3, "cream"))]


define("monitors", draw=_obj(monitors, "mid-century", presets=MONITORS_MODELS), front=True, clear=2, states=("lit", "out"), tags=("control", "guardroom", "reception", "resting"), global_from=1919,
       light={"dim": 1.5, "bright": .5, "color": "#9fc4ff", "kind": "lamp"},
       axes={"model": list(range(len(MONITORS_MODELS)))},
       ref="CCTV monitors of 9 to 14 in on a desk 4 ft long (security equipment catalogues)")


def photocopier(tm, x, y, w, h, st, v, c):
    """A copier from above: a beige, putty, grey or white box with its document lid (a dark hinge strip at the back),
    the control panel with its keys and display at the front right, the paper tray sticking out of the west side
    with paper in it and the output tray on the east side with the copies; a desk model is a smaller box on its
    stand. Mid-Century: a big console copier with a chrome edge, two big dials and one drawer; Modern: an office copier with a
    lit touch screen, paper cassettes and a sorter of stacked bins; Future
    Darkness: a sealed dark printer with a lit slot. Paper stacked, jammed (a side door open and a crumpled sheet) or
    none."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; per = c.per; pap = c.axis("paper", "stack")
    Sh = liv(c, c.axis("make", "beige"), 12); desk = c.axis("size", "floor") == "desk"
    tx0 = X0 + 12; bx1 = X1 - 14
    if desk:
        d.rectangle([X0 + 4, Y0 + 2, X1 - 4, Y1], fill=(90, 92, 96), outline=OUT); d.line([X0 + 5, Y0 + 3, X1 - 5, Y0 + 3], fill=(130, 132, 136))   # the stand
        bx0, by0, bx1, by1 = X0 + 16, Y0 + 6, X1 - 18, Y1 - 6
    else: bx0, by0, by1 = tx0, Y0, Y1
    d.rectangle([X0 + 1, by0 + 10, bx0 + 2, by1 - 14], fill=Sh[1], outline=OUT)                                                     # the paper tray sticking out
    d.rectangle([X0 + 3, by0 + 12, bx0, by1 - 16], fill=WHITE[4] if pap != "none" else Sh[0])
    d.rectangle([bx0, by0, bx1, by1], fill=Sh[2], outline=OUT); d.line([bx0 + 1, by0 + 1, bx1 - 1, by0 + 1], fill=Sh[4]); d.line([bx0 + 1, by1 - 1, bx1 - 1, by1 - 1], fill=Sh[0])
    lx1 = bx1 - 20
    d.rectangle([bx0 + 3, by0 + 3, lx1, by1 - 14], fill=Sh[3], outline=OUT); d.rectangle([bx0 + 4, by0 + 4, lx1 - 1, by0 + 7], fill=(70, 72, 76))   # lid and hinge strip
    if per == "W": d.line([bx0 + 2, by1 - 12, bx1 - 2, by1 - 12], fill=STEEL[4], width=2)
    px0 = lx1 + 3
    d.rectangle([px0, by0 + 4, bx1 - 3, by1 - 14], fill=Sh[1], outline=OUT)
    disp = (80, 150, 120) if per == "N" else (c.glow[1] if per == "F" else (40, 40, 40))
    d.rectangle([px0 + 2, by0 + 6, bx1 - 5, by0 + 12], fill=disp)
    if per == "W":                                                                                                                    # big dials and a single drawer
        for k in (by0 + 18, by0 + 30): d.ellipse([px0 + 2, k, px0 + 12, k + 10], fill=Sh[4], outline=OUT); d.line([px0 + 7, k + 5, px0 + 7, k + 1], fill=OUT)
        d.line([bx0 + 14, by1 - 7, bx1 - 30, by1 - 7], fill=Sh[0], width=3)
    else:
        if per == "N": d.rectangle([px0 + 2, by0 + 6, bx1 - 5, by0 + 18], fill=disp, outline=OUT)                                   # the touch screen
        for k in range(by0 + 15 + 8 * (per == "N"), by1 - 18, 4): d.rectangle([px0 + 2, k, px0 + 5, k + 2], fill=Sh[4]); d.rectangle([px0 + 8, k, px0 + 11, k + 2], fill=Sh[4])
        d.rectangle([px0 + 2, by1 - 20, px0 + 9, by1 - 17], fill=(60, 180, 80))
        for k in (by1 - 10, by1 - 4): d.line([bx0 + 14, k, bx0 + 40, k], fill=Sh[0], width=2)                                        # cassette handles
    d.rectangle([bx1, by0 + 8, X1 - 2, by1 - 8], fill=Sh[1], outline=OUT)                                                            # the output tray
    if per == "N":                                                                                                                    # the sorter's stacked bins
        d.rectangle([bx1, by0 + 2, X1 - 2, by1 - 2], fill=Sh[1], outline=OUT)
        for k in range(by0 + 6, by1 - 4, 5): d.line([bx1 + 1, k, X1 - 3, k], fill=Sh[0])
    if pap == "stack":
        for k in range(3): d.rectangle([bx1 + 2 + k, by0 + 11 + k * 2, X1 - 4, by1 - 11 - k], fill=WHITE[4 - k], outline=WHITE[0])
    elif pap == "jam":
        d.rectangle([bx0 + 2, by1 - 2, bx0 + 34, by1 + 3], fill=Sh[0], outline=OUT)
        d.polygon([(bx0 + 40, by1 - 4), (bx0 + 52, by1 - 10), (bx0 + 58, by1 - 2), (bx0 + 48, by1 + 3)], fill=WHITE[4], outline=WHITE[0])
    if per == "F": d.line([bx0 + 3, by1 - 3, bx1 - 3, by1 - 3], fill=c.glow[1], width=2)


PHOTOCOPIER_MODELS = [dict(make=m, size=sz, paper=pp) for m, sz, pp in (
    ("beige", "floor", "stack"), ("grey", "desk", "jam"), ("white", "floor", "none"), ("putty", "desk", "stack"), ("charcoal", "floor", "jam"),
    ("white", "desk", "none"), ("grey", "floor", "stack"), ("charcoal", "desk", "none"), ("beige", "floor", "jam"), ("white", "floor", "jam"))]


define("photocopier", draw=_obj(photocopier, "mid-century", presets=PHOTOCOPIER_MODELS), front=True, clear=3, tags=("office", "archive", "reception"), global_from=1919,
       axes={"model": list(range(len(PHOTOCOPIER_MODELS)))},
       ref="a floor-standing office copier about 4 ft wide with its trays, 2 1/2 ft deep (Xerox 914 and later office copier sizes)")


def vending(tm, x, y, w, h, st, v, c):
    """A vending machine from above with its front tipped toward the viewer: a tall box in its drinks maker's colour
    (red, blue, black, white, green or orange), the glass window showing rows of cans, snack packets or cups, the
    selection keypad and coin slot down the right, the delivery flap at the foot. Mid-Century: a round-shouldered
    soda machine with chrome and a window of bottles; Modern: a tall glass-front machine; Future Darkness: a dark
    sealed machine with a lit menu. Full, half or empty. Lit or out; the light falls on the floor in front."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; lit = st != "out"; per = c.per
    kind = c.axis("kind", "soda"); fill = c.axis("fill", "full"); brand = c.axis("brand", "red")
    Sh = liv(c, {"orange": "beige"}.get(brand, brand), 18) if brand != "orange" else ramp((220, 120, 30), 18)
    if per == "F": Sh = liv(c, brand)
    rad = 8 if per == "W" else 2
    d.rounded_rectangle([X0, Y0, X1, Y1], rad, fill=Sh[2], outline=OUT); d.line([X0 + rad, Y0 + 1, X1 - rad, Y0 + 1], fill=Sh[4])
    if per == "W": d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], rad, outline=STEEL[4], width=2)
    gy = Y0 + int(H * .24)                                                                                                         # top / front fold
    d.line([X0 + 1, gy, X1 - 1, gy], fill=Sh[0], width=2)
    d.rectangle([X0 + 6, Y0 + 6, X1 - 6, gy - 5], fill=WHITE[4] if lit and per != "F" else Sh[3], outline=Sh[0])                    # the lit header
    d.rectangle([X0 + 10, Y0 + 8, X0 + 10 + W // 3, gy - 7], fill=Sh[1])
    kx = X1 - 13 if per != "W" else X0 + int(W * .5)
    glass = (176, 206, 216) if lit else (44, 54, 64)
    if per == "F": glass = c.comp[0]
    d.rectangle([X0 + 4, gy + 3, kx - 2, Y1 - 9], fill=glass, outline=OUT)
    rows = list(range(gy + 5, Y1 - 13, 6)); filled = {"full": len(rows), "half": (len(rows) + 1) // 2, "empty": 0}[fill]
    goods = {"soda": ((200, 40, 40), (40, 90, 190), (230, 200, 40), (60, 160, 70), (230, 230, 230)), "snack": ((230, 140, 40), (200, 40, 60), (60, 120, 200), (240, 220, 80), (120, 70, 40)),
             "coffee": ((90, 60, 40), (230, 220, 200), (140, 90, 60), (200, 160, 110), (60, 40, 30))}[kind]
    for r_, yy in enumerate(rows):
        if r_ >= len(rows) - filled and per == "F": d.rectangle([X0 + 6, yy, kx - 5, yy + 4], fill=c.glow[1] if lit else c.comp[3])
        elif r_ >= len(rows) - filled:
            for i, k in enumerate(range(X0 + 7, kx - 5, 5 if per == "W" else 6)):
                col = goods[(i // (2 if kind == "soda" else 1) + r_) % 5]
                if per == "F": col = c.glow[1 + (i + r_) % 2] if lit else c.comp[3]
                elif not lit: col = tone(col, -90)
                if kind == "soda": d.ellipse([k, yy, k + 4, yy + 4], fill=col, outline=OUT)
                else: d.rectangle([k, yy, k + 4, yy + 4], fill=col, outline=OUT)
        d.line([X0 + 5, yy + 5, kx - 3, yy + 5], fill=STEEL[2] if kind == "snack" else tone(glass, -30))                           # shelf or spiral rail
    if per == "W":                                                                                                                 # the round-shouldered machine's sign panel
        d.rectangle([kx + 2, gy + 3, X1 - 16, Y1 - 9], fill=Sh[3], outline=OUT); lx_, ly_ = (kx + X1 - 14) // 2, (gy + Y1 - 6) // 2
        d.ellipse([lx_ - 8, ly_ - 8, lx_ + 8, ly_ + 8], fill=WHITE[4] if brand != "white" else (200, 40, 40), outline=OUT); d.rectangle([lx_ - 5, ly_ - 1, lx_ + 5, ly_ + 1], fill=Sh[2])
        kx = X1 - 15
    d.rectangle([kx + 1, gy + 3, X1 - 4, Y1 - 9], fill=Sh[1], outline=OUT)                                                          # keypad and coin slot
    for r_ in range(3):
        for k in range(2): d.rectangle([kx + 3 + k * 4, gy + 6 + r_ * 4, kx + 5 + k * 4, gy + 8 + r_ * 4], fill=STEEL[4])
    d.rectangle([kx + 4, gy + 20, kx + 8, gy + 23], fill=(20, 20, 22)); d.line([kx + 5, gy + 21, kx + 7, gy + 21], fill=STEEL[3])   # coin slot
    if lit: d.rectangle([kx + 3, gy + 26, X1 - 6, gy + 28], fill=(240, 80, 60))
    d.rectangle([X0 + 8, Y1 - 7, kx - 6, Y1 - 3], fill=(20, 20, 24), outline=OUT)                                                  # delivery flap
    if per == "F": d.line([X0 + 4, Y1 - 2, X1 - 4, Y1 - 2], fill=c.glow[1] if lit else c.comp[3], width=2)
    return [(X0 + W // 2, Y1 + 10, 40, (1.15, 1.2, 1.25))] if lit else []


VENDING_MODELS = [dict(brand=b, kind=k, fill=f) for b, k, f in (
    ("red", "soda", "full"), ("black", "coffee", "full"), ("orange", "coffee", "full"), ("blue", "coffee", "full"), ("white", "coffee", "empty"),
    ("green", "snack", "full"), ("orange", "soda", "empty"), ("black", "snack", "empty"), ("white", "snack", "full"), ("green", "coffee", "empty"))]


define("vending", draw=_obj(vending, "mid-century", off=5, presets=VENDING_MODELS), front=True, clear=3, states=("lit", "out"), tags=("station", "hall", "ward", "street"), global_from=1919,
       light={"dim": 1.5, "bright": .5, "color": "#e8f0ff", "kind": "lamp"},
       axes={"model": list(range(len(VENDING_MODELS)))},
       ref="a drinks or snack vending machine about 3 ft wide and 2 1/2 to 3 ft deep (vending makers' specifications)")


def watercooler(tm, x, y, w, h, st, v, c):
    """A water cooler from above: the big upturned bottle on its stand with the water showing through, and the paper
    cups beside it. Great War: a stoneware crock (cream with a blue band, white porcelain or brown salt glaze) on a
    wooden stand; Mid-Century: an enamelled cabinet (white, cream, grey or green) with a glass bottle in a chrome collar;
    Modern: a plastic cabinet (white, grey, beige or black) with a ribbed blue or clear bottle and a drip tray; Future Darkness: a sealed dark
    dispenser with a lit ring. Full, half or empty."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 1); W = X1 - X0; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; per = c.per
    fill_ = c.axis("fill", "full"); mk = c.axis("make", "white")
    if c.era == "great-war":
        Wd = ramp({"white": (150, 104, 64), "cream": (110, 70, 44), "grey": (170, 130, 86), "green": (90, 60, 40), "black": (60, 44, 34)}[mk], 16)
        crock = {"white": (232, 232, 226), "cream": (226, 212, 176), "grey": (150, 110, 70), "green": (96, 136, 104), "black": (92, 62, 42)}[mk]
        band = {"white": (60, 90, 170), "cream": (50, 80, 160), "grey": (226, 212, 176), "green": (226, 212, 176), "black": (200, 170, 110)}[mk]
        d.rectangle([X0, Y0, X1, Y1], fill=Wd[2], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Wd[4])
        d.ellipse([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], fill=crock, outline=OUT); d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], outline=band, width=3)
    else:
        Sh = liv(c, mk, 10, .75)
        d.rounded_rectangle([X0, Y0, X1, Y1], 3, fill=Sh[2], outline=OUT); d.line([X0 + 2, Y0 + 1, X1 - 2, Y0 + 1], fill=Sh[4]); d.line([X1 - 1, Y0 + 2, X1 - 1, Y1 - 2], fill=Sh[0])
    r = W // 2 - 5
    water = {"full": 0, "half": .5, "empty": 1}[fill_]
    if per == "F":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c.comp[0], outline=c.glow[1])
        q = int(r * (1 - water * .55)) - 1
        bt = {"blue": (60, 130, 220), "clear": (200, 210, 214), "green": (90, 170, 110)}[c.axis("bottle", "blue")]
        if q > 1: d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=mix(c.glow[0], bt, .85), outline=c.glow[1])
    else:
        glass = {"blue": (60, 130, 220) if per == "N" else (110, 160, 210), "clear": (176, 200, 206), "green": (90, 160, 120)}[c.axis("bottle", "blue")]
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tone(glass, 55 if water == 1 else -10), outline=tone(glass, -60))
        if water < 1: d.ellipse([cx - r + 2 + int(water * 4), cy - r + 2 + int(water * 4), cx + r - 2 - int(water * 4), cy + r - 2 - int(water * 4)], fill=tone(glass, -70))
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=tone(glass, 40)); d.rectangle([cx - r + 3, cy - r + 4, cx - r + 5, cy - r + 7], fill=WHITE[4])
        if c.era == "mid-century": d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], outline=STEEL[3], width=2)                   # the chrome collar
        if per == "N":                                                                                                          # the moulded ribs of a plastic bottle and the drip tray
            for q in (int(r * .72), int(r * .45)): d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=tone(glass, 30))
            d.rectangle([X0 + 3, Y1 - 7, X1 - 3, Y1 - 2], fill=(50, 52, 56), outline=OUT)
    cups = c.axis("cups", "right")                                                                                              # the paper cup tube on its side
    if cups != "none":
        ux = X1 - 5 if cups == "right" else X0 + 1
        d.rectangle([ux, Y0 + 1, ux + 4, Y1 - 3], fill=WHITE[4], outline=OUT)
        for k in range(Y0 + 4, Y1 - 4, 3): d.line([ux + 1, k, ux + 3, k], fill=WHITE[1])
    if per != "W" or c.era != "great-war":
        for tx, tc in ((cx - 4, (60, 110, 220)), (cx + 2, (220, 60, 50))): d.rectangle([tx, Y1 - 4, tx + 2, Y1 - 1], fill=tc if per != "F" else c.glow[1], outline=OUT)   # cold and hot taps
    else: d.rectangle([cx - 2, Y1 - 4, cx + 2, Y1], fill=BRASS[3], outline=OUT)


WATERCOOLER_MODELS = [dict(make=m, bottle=b, fill=f, cups=("right", "left", "none")[i % 3]) for i, (m, b, f) in enumerate((
    ("white", "blue", "full"), ("cream", "green", "full"), ("grey", "green", "full"), ("green", "clear", "empty"), ("black", "green", "full"),
    ("white", "green", "half"), ("grey", "blue", "half"), ("green", "blue", "full"), ("black", "green", "half"), ("white", "clear", "empty")))]


define("watercooler", draw=_obj(watercooler, "great-war", presets=WATERCOOLER_MODELS), front=True, clear=2, tags=("office", "reception"), global_from=1902,
       axes={"model": list(range(len(WATERCOOLER_MODELS)))},
       ref="a bottled water cooler about 12 to 15 in square (office equipment catalogues)")


def jukebox(tm, x, y, w, h, st, v, c):
    """A jukebox against the wall from above. Mid-Century: the arched hood of figured walnut or maple, or a red,
    black or chrome cabinet with chrome pilasters, its coloured light tubes round the arch and the record carousel under its glass; or the
    flat-topped chrome model with the record rack under a long top window; Modern: a squared cabinet with a CD rack
    window and a lit screen; Future Darkness: a dark cabinet with lit arcs. Lit or out; lit, the coloured light falls
    on the floor."""
    d = tm.d; X0, Y0, X1, Y1 = box_px(x, y, w, h, 2); W, H = X1 - X0, Y1 - Y0; cx = (X0 + X1) // 2; lit = st != "out"; per = c.per
    mk = c.axis("make", "walnut"); model = c.axis("model2", "arch")
    Wd = {"walnut": ramp((110, 70, 44), 16), "maple": ramp((196, 150, 96), 16), "black": ramp((40, 38, 42), 16), "red": ramp((170, 36, 36), 18), "chrome": ramp((190, 194, 200), 18)}[mk]
    if per == "F": Wd = ramp(mix(COMPOSITE[2], Wd[2], .7), 14)
    tube = {"walnut": (240, 120, 40), "maple": (240, 200, 60), "black": (230, 70, 140), "red": (240, 210, 60), "chrome": (60, 160, 220)}[mk]
    if per == "W" and model == "arch":
        d.pieslice([X0, Y0 - H + 10, X1, Y1], 0, 180, fill=Wd[2], outline=OUT); d.rectangle([X0, Y0, X1, Y0 + 10], fill=Wd[2], outline=OUT)
        for ins in (5, 12): d.arc([X0 + ins, Y0 - H + 10 + ins, X1 - ins, Y1 - ins], 5, 175, fill=tone(tube, 20 if lit else -110), width=4)
        d.ellipse([cx - 11, Y0 + 4, cx + 11, Y0 + 22], fill=(50, 54, 60), outline=STEEL[4])
        d.ellipse([cx - 8, Y0 + 6, cx + 8, Y0 + 20], fill=(20, 20, 22)); d.ellipse([cx - 3, Y0 + 11, cx + 3, Y0 + 15], fill=(200, 60, 50))
        d.line([X0 + 4, Y0 + 2, X1 - 4, Y0 + 2], fill=STEEL[4], width=2)
        if mk in ("red", "chrome", "black"):
            for sx in (X0 + 6, X1 - 14): d.rectangle([sx, Y0 + 4, sx + 8, Y0 + H // 2], fill=STEEL[3], outline=OUT); d.line([sx + 2, Y0 + 6, sx + 2, Y0 + H // 2 - 2], fill=STEEL[4])   # chrome pilasters
    elif per == "W":
        d.rounded_rectangle([X0, Y0, X1, Y1], 6, fill=Wd[2], outline=OUT); d.rounded_rectangle([X0 + 2, Y0 + 2, X1 - 2, Y1 - 2], 5, outline=STEEL[4], width=2)
        d.rectangle([X0 + 7, Y0 + 7, X1 - 7, Y0 + H // 2 + 2], fill=(50, 54, 60), outline=STEEL[4])                                  # the long top window
        for k in range(X0 + 9, X1 - 9, 3): d.line([k, Y0 + 9, k, Y0 + H // 2], fill=(20, 20, 22))                                  # records stood in the rack
        d.rectangle([X0 + 4, Y0 + H // 2 + 6, X1 - 4, Y0 + H // 2 + 9], fill=tone(tube, 20 if lit else -110))
    elif model == "arch":
        d.rounded_rectangle([X0, Y0, X1, Y1], 4, fill=Wd[2], outline=OUT); d.line([X0 + 4, Y0 + 1, X1 - 4, Y0 + 1], fill=Wd[4])
        d.rectangle([X0 + 6, Y0 + 6, X1 - 6, Y0 + H // 2], fill=(60, 64, 70), outline=OUT)                                         # the CD rack window
        for k in range(X0 + 8, X1 - 8, 4): d.line([k, Y0 + 8, k, Y0 + H // 2 - 2], fill=(150, 160, 180) if per == "N" else c.glow[0])
        if lit: d.arc([X0 + 3, Y0 + 3, X1 - 3, Y1 + 10], 200, 340, fill=c.glow[1] if per == "F" else tube, width=3)
    else:
        d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=Wd[2], outline=OUT); d.line([X0 + 6, Y0 + 1, X1 - 6, Y0 + 1], fill=Wd[4])  # a squat cabinet with a screen
        d.rectangle([X0 + 6, Y0 + 4, X1 - 6, Y0 + H // 2], fill=(c.glow[0] if lit else (30, 32, 36)) if per == "F" else ((80, 120, 170) if lit else (30, 32, 36)), outline=OUT)   # the touch screen
        if lit:
            for k in range(Y0 + 7, Y0 + H // 2 - 2, 4): d.line([X0 + 9, k, X1 - 9, k], fill=c.glow[1] if per == "F" else (170, 200, 230))
        for sx in (X0 + 4, X1 - 12): d.rectangle([sx, Y0 + H // 2 + 8, sx + 8, Y1 - 14], fill=(30, 30, 34), outline=OUT)            # loudspeakers below
    by = Y1 - 10
    for k in range(X0 + 10, X1 - 8, 6): d.rectangle([k, by, k + 3, by + 4], fill=WHITE[4] if lit else WHITE[0], outline=OUT)
    return [(cx, Y1 + 8, 44, (1.3, 1.05, 1.2))] if lit else []


JUKEBOX_MODELS = [dict(make=m, model2=md) for m, md in (
    ("walnut", "arch"), ("chrome", "flat"), ("maple", "arch"), ("red", "flat"), ("black", "arch"), ("walnut", "flat"),
    ("chrome", "arch"), ("red", "arch"), ("maple", "flat"), ("black", "flat"))]


define("jukebox", draw=_obj(jukebox, "mid-century", off=5, presets=JUKEBOX_MODELS), front=True, clear=3, mount="wall", states=("lit", "out"), tags=("taproom",), global_from=1919,
       light={"dim": 2, "bright": .5, "color": "#ffb070", "kind": "lamp"},
       axes={"model": list(range(len(JUKEBOX_MODELS)))},
       ref="a floor jukebox is about 3 ft wide and 2 ft deep (Wurlitzer 1015 and Seeburg cabinet sizes)")
