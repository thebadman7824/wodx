"""The goods family (B6346): the small things set on tables and shelves, from cooking pots and bread trenchers to
telephones, computers and blood bags, drawn from straight above in every era each one spans.

They are 10 to 20 px across at true size, so each is a strong simple shape and one or two telling details: a cup is a
ring with its handle nub, a jug has its spout and loop handle, a book its spine and page edges. What changes between
variations is what a household would see: the material (clay, wood, pewter, brass, silver, porcelain, glass,
plastic), its glaze or paint, its pattern and what it holds. Each regional style has its own ware at each band of
wealth (WARE), so a princely Islamic cup is inlaid brass and a poor Northern one is turned birch. Condition shows as
a faded, chipped piece (worn) or a cracked one with a piece out and its contents spilt (broken).

Light from the north-west; a tight shadow south-east; nothing drawn past the footprint but the shadow."""
import math
import zlib

import numpy as np
from PIL import Image, ImageChops

from px import OUT
from library.core import define
from library.census import CENSUS, ERAS
from library.art import ramp, tone, mix, box_px, IRON, BRASS, STEEL, WHITE, LINEN, PLASTIC_GREY, PLASTIC_WHITE, COMPOSITE, GLOW

EI = {k: i for i, (k, _, _, _) in enumerate(ERAS)}
DA, LN, RE, AR, VI, GW, MC, MO, FD = range(9)          # era indices: dark-ages .. future-darkness
_ROW = {r.id: r for r in CENSUS}

# ---------------------------------------------------------------- materials, each a five-tone ramp
M = {
    "greyware": ramp((118, 110, 100), 16), "clay": ramp((152, 92, 62), 18), "terracotta": ramp((196, 108, 64), 18),
    "buff": ramp((200, 172, 124), 14), "blackware": ramp((54, 46, 44), 12), "stoneware": ramp((112, 74, 46), 14),
    "glaze_green": ramp((84, 128, 64), 18), "glaze_brown": ramp((128, 80, 38), 18), "glaze_yellow": ramp((210, 172, 64), 16),
    "glaze_turq": ramp((52, 150, 160), 18), "glaze_cobalt": ramp((40, 64, 150), 18), "celadon": ramp((146, 182, 150), 14),
    "porcelain": ramp((234, 234, 228), 8), "maiolica": ramp((230, 220, 196), 10), "lustre": ramp((222, 196, 150), 12),
    "treen": ramp((178, 140, 94), 16), "darkwood": ramp((92, 60, 40), 14), "birch": ramp((214, 200, 164), 12),
    "mazer": ramp((140, 96, 56), 16), "lacq_red": ramp((168, 40, 32), 18), "lacq_black": ramp((40, 34, 36), 12),
    "pewter": ramp((150, 152, 150), 16, (0, 0, 2)), "brass": BRASS, "copper": ramp((190, 102, 62), 20), "silver": ramp((200, 204, 212), 14, (0, 0, 2)),
    "gold": ramp((222, 182, 60), 18), "bronze": ramp((150, 112, 60), 18), "iron": IRON,
    "calabash": ramp((204, 164, 84), 16), "coconut": ramp((104, 72, 46), 14), "bamboo": ramp((196, 188, 112), 14),
    "soapstone": ramp((128, 138, 126), 14), "ivory": ramp((228, 218, 186), 10), "bark": ramp((176, 100, 54), 16),
    "leather": ramp((124, 82, 50), 16), "paint_red": ramp((170, 48, 40), 18), "paint_blue": ramp((50, 82, 150), 18),
    "paint_orange": ramp((214, 112, 40), 18), "ochre_wood": ramp((150, 64, 40), 16), "polychrome": ramp((206, 128, 74), 16),
    "whiteware": ramp((222, 214, 196), 10), "enamel": ramp((226, 228, 224), 8), "enamel_blue": ramp((60, 96, 160), 16),
    "glass": ramp((170, 204, 210), 14, (-4, 0, 6)), "glass_green": ramp((80, 132, 92), 16), "chrome": ramp((186, 192, 200), 22),
    "aluminium": ramp((176, 178, 182), 14), "steel": STEEL, "bakelite": ramp((60, 38, 28), 12),
    "plastic_red": ramp((200, 50, 44), 16), "plastic_cream": ramp((226, 214, 176), 10), "plastic_white": PLASTIC_WHITE,
    "plastic_grey": PLASTIC_GREY, "plastic_black": ramp((44, 44, 48), 12), "composite": COMPOSITE,
    "coral": ramp((196, 70, 60), 16), "turq": ramp((64, 176, 170), 14), "shell": ramp((226, 222, 206), 10),
    "slip_yellow": ramp((226, 190, 90), 12), "enamel_red": ramp((180, 40, 44), 16), "darkline": ramp((44, 34, 30), 8),
    "linen": LINEN, "white": WHITE,
}

# each style's ware at each band of wealth: (body, accent, pattern). Used for vessels, and as the style's colours elsewhere.
WARE = {
    "central": [("greyware", "darkline", "none"), ("glaze_green", "slip_yellow", "dots"), ("gold", "enamel_blue", "band")],
    "atlantic": [("treen", "darkwood", "rings"), ("glaze_brown", "slip_yellow", "band"), ("silver", "pewter", "rings")],
    "northern": [("birch", "bark", "none"), ("paint_blue", "paint_red", "flowers"), ("mazer", "silver", "band")],
    "mediterranean": [("terracotta", "terracotta", "none"), ("maiolica", "glaze_cobalt", "flowers"), ("lustre", "copper", "geo")],
    "islamic": [("buff", "glaze_turq", "none"), ("glaze_turq", "glaze_cobalt", "geo"), ("brass", "silver", "geo")],
    "steppe": [("leather", "leather", "stitch"), ("paint_orange", "paint_blue", "band"), ("silver", "coral", "dots")],
    "southasia": [("clay", "darkline", "none"), ("copper", "brass", "rings"), ("gold", "enamel_red", "flowers")],
    "eastasia": [("stoneware", "blackware", "none"), ("lacq_red", "lacq_black", "band"), ("porcelain", "glaze_cobalt", "blue")],
    "seasia": [("bamboo", "bamboo", "rings"), ("celadon", "glaze_brown", "none"), ("lacq_black", "gold", "flowers")],
    "africa": [("calabash", "darkline", "lines"), ("blackware", "buff", "geo"), ("bronze", "copper", "band")],
    "americas": [("whiteware", "darkline", "lines"), ("polychrome", "whiteware", "geo"), ("turq", "gold", "band")],
    "oceania": [("coconut", "coconut", "none"), ("darkwood", "shell", "band"), ("ochre_wood", "shell", "geo")],
    "polar": [("soapstone", "soapstone", "none"), ("bark", "darkline", "lines"), ("ivory", "bark", "lines")],
}
# the style's plastic and enamel colour in the machine age (goods made for that market)
PLASTIC = {"central": (226, 214, 176), "atlantic": (90, 120, 200), "northern": (200, 50, 44), "mediterranean": (236, 200, 60),
           "islamic": (52, 160, 150), "steppe": (230, 120, 40), "southasia": (210, 70, 140), "eastasia": (44, 44, 48),
           "seasia": (90, 170, 70), "africa": (120, 70, 170), "americas": (240, 240, 236), "oceania": (60, 180, 220), "polar": (150, 152, 156)}
PLASTIC_RGB = dict(PLASTIC)
for _k, _c in PLASTIC.items(): M["plastic_" + _k] = ramp(_c, 14)
PLASTIC = {k: "plastic_" + k for k in PLASTIC}
# the liveries mass-made goods come in, the same the world over: a variation takes one by its own id, never by region
LIVERY = [ramp(c, 14) for c in ((236, 234, 226), (226, 214, 176), (200, 186, 150), (150, 152, 156), (44, 44, 48), (200, 50, 44),
                                 (60, 96, 180), (70, 150, 80), (236, 200, 60), (230, 120, 40), (90, 180, 200), (120, 70, 50))]

LIQ = {"water": (70, 112, 150), "milk": (232, 228, 214), "wine": (112, 22, 40), "ale": (176, 116, 42), "oil": (196, 170, 64),
       "tea": (150, 84, 40), "coffee": (62, 38, 26), "broth": (168, 124, 60), "stew": (124, 74, 44), "porridge": (206, 184, 140),
       "rice": (238, 234, 222), "beans": (120, 70, 50), "soup": (170, 140, 50), "kumis": (220, 216, 196), "kvass": (110, 66, 30),
       "blood": (120, 10, 18), "yogurt": (240, 238, 228), "spirits": (200, 210, 214), "empty": None}


EURO = ("central", "atlantic", "northern", "mediterranean", "americas", "oceania")
WOODS = ("treen", "darkwood", "birch", "mazer", "bamboo", "coconut", "calabash", "leather", "bark", "ochre_wood")
# metal goods (pots, kettles, samovars) where the style's ware is wood or gourd
METAL_FOR = {"atlantic": "iron", "northern": "copper", "seasia": "bronze", "africa": "brass", "oceania": "aluminium", "steppe": "pewter",
             "polar": "soapstone", "central": "iron"}
# what is cooked and eaten in each style
FOOD = {"central": (112, 120, 60), "atlantic": (150, 110, 64), "northern": (210, 196, 150), "mediterranean": (170, 60, 40),
        "islamic": (222, 176, 60), "steppe": (180, 140, 100), "southasia": (214, 156, 40), "eastasia": (240, 238, 228),
        "seasia": (120, 150, 60), "africa": (226, 214, 180), "americas": (190, 160, 40), "oceania": (130, 90, 140), "polar": (90, 50, 44)}


import colorsys
HUE = {"northern": 0, "steppe": 27, "mediterranean": 50, "seasia": 80, "central": 112, "africa": 140, "islamic": 168,
       "oceania": 192, "atlantic": 218, "polar": 245, "americas": 275, "southasia": 305, "eastasia": 335}


def sigil(style, b):
    """The style's own colour at a band of wealth: a hue for each region, duller for the poor and deeper for the
    rich, for dyed, painted and printed things (paper, cloth, bindings, plastics)."""
    sat, val = ((.5, .6), (.6, .76), (.72, .5))[b]
    order = sorted(HUE, key=HUE.get).index(style) if style in HUE else 0
    val = min(.95, max(.25, val + (-.12 if style == "eastasia" else (.14, -.12, 0)[order % 3])))
    r, g_, bl = colorsys.hsv_to_rgb(HUE.get(style, 0) / 360, sat, val)
    return ramp((int(r * 255), int(g_ * 255), int(bl * 255)), 16)


def band(w): return 0 if w <= 1 else (1 if w <= 3 else 2)


# each age's patina, laid over the finished drawing: soot and grime in the Long Night, warm polish in the
# Renaissance, pale paint and porcelain light in the Age of Reason, coal smoke in Victorian times, wartime drab,
# cool electric light in Mid-Century, bright clean plastics in Modern, the grime of Future Darkness
ERA_GRADE = {LN: (1.0, (-16, -18, -20)), RE: (1.0, (22, 10, -10)), AR: (.96, (24, 24, 28)), VI: (1.0, (-14, -8, 8)),
             GW: (1.0, (8, 8, -12)), MC: (1.0, (-8, -2, 10)), MO: (1.0, (10, 10, 10)), FD: (.9, (-4, 2, 10))}


class G:
    """One drawing's context: the footprint in pixels and the variation's axes, with small helpers."""

    def __init__(s, tm, x, y, w, h, st, v):
        s.tm, s.d, s.st, s.v = tm, tm.d, st, v
        s.x0, s.y0, s.x1, s.y1 = box_px(x, y, w, h)
        s.W, s.H = s.x1 - s.x0, s.y1 - s.y0
        s.cx, s.cy = (s.x0 + s.x1) // 2, (s.y0 + s.y1) // 2
        s.era = v.get("era", "dark-ages"); s.e = EI.get(s.era, 0)
        s.w = v.get("wealth", 2); s.b = band(s.w); s.style = v.get("style", "central"); s.cond = v.get("condition", "new")
        s.L = LIVERY[zlib.crc32(str(v.get("vid", "")).encode()) % len(LIVERY)]      # this variation's maker's colour
        s.glob = "style" not in v                                                   # one look worldwide (global_from)
        s.rng = np.random.default_rng(zlib.crc32(f"{s.style}{s.w}{s.era}{v.get('vid', '')}".encode()))
        s.trad = s.e < MO or (s.e == FD and s.w < 4)
        s.spill = None; s.shape = None; s.custom_break = False
        body, acc, pat = WARE.get(s.style, WARE["central"])[s.b]
        if s.style == "eastasia" and s.b == 2 and s.e == DA: body, pat = "celadon", "none"
        s.S = sigil(s.style, s.b)
        dye = {LN: ((30, 26, 24), .25), AR: ((236, 230, 220), .22), VI: ((110, 30, 120), .18), GW: ((120, 110, 80), .28)}.get(s.e)
        if dye: s.S = ramp(mix(s.S[2], dye[0], dye[1]), 16)                         # the dyes of the age
        s.ware0 = body; s.C0 = M[body]; s.A0 = M[acc] if acc else M[body]
        C = M[body]; A = M[acc] if acc else None
        # the making of each age (DRAWING: era): soot and wear in the Long Night, lead and tin glazes and polish in the
        # Renaissance, slipware, creamware and porcelain in the Age of Reason, stoneware and electroplate in Victorian
        # times, enamel and gilt edges in the Great War
        ET = {LN: [((78, 66, 54), .3)] * 3,
              RE: [((176, 120, 60), .3), ((232, 226, 206), .4), ((250, 236, 200), .25)],
              AR: [((214, 176, 96), .32), ((236, 226, 186), .5), ((240, 240, 236), .38)],
              VI: [((150, 140, 120), .38), ((220, 214, 200), .35), ((206, 208, 214), .38)],
              GW: [((226, 228, 224), .45), ((236, 236, 230), .6), ((210, 180, 100), .35)]}.get(s.e)
        if ET and not s.glob:
            tc, k_ = ET[s.b]; C = ramp(mix(C[2], tc, k_), 14)
            if A is not None and s.e != LN: A = ramp(mix(A[2], tc, k_ * .5), 14)
            if s.e == LN: A = ramp(mix(A[2], tc, .3), 14) if A is not None else None
        if s.e == VI and s.style in EURO and s.b == 1:                                   # printed and transfer wares
            A, body, pat = C, "whiteware", "blue"; C = ramp(mix(M["whiteware"][2], C[2], .3), 10)
        if s.e == GW and s.b == 1: pat = "band"                                          # white ironstone with a coloured band
        if s.e == MC and s.b == 1: A, body, pat = C, "pyrex", "band"; C = ramp(mix(C[2], s.L[2], .55), 14)   # a maker's coloured ware
        if s.e == MC and s.b == 0: A, body, pat = M["enamel"], "enamel", "band"; C = ramp(mix(M["enamel"][2], s.L[2], .7), 12)
        if s.e == MO and s.b == 0: body, pat = "plastic_grey", "none"; C = s.L; A = ramp(tone(C[2], -40), 12)
        if s.e == FD:                                                              # dark sealed composites, a lit edge
            A = M[acc] if acc else M["turq"]; C = ramp(mix(COMPOSITE[2], C[2], .74), 14); body, pat = "composite", "band"
        s.wname, s.aname, s.pat = body, acc, pat
        s.C = C; s.A = A
        s.GL = [tone(A[2], 30), tone(A[3], 60), tone(A[4], 90)] if (s.e == FD and A is not None) else GLOW

    # -- drawing helpers
    def shadow(s, x0, y0, x1, y1, off=2, kind="ellipse", f=.6):
        s.tm.shade((x0 + off, y0 + off, x1 + off + 1, y1 + off + 1), f=f, kind=kind)

    def disc(s, cx, cy, rx, ry=None, C=None, out=OUT, lit=True):
        ry = rx if ry is None else ry; C = C or s.C; d = s.d
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C[2], outline=out)
        if lit and min(rx, ry) < 6:
            d.line([cx - rx + 2, cy - ry + 1, cx - rx + 3, cy - ry + 1], fill=C[4]); d.line([cx - rx + 1, cy - ry + 2, cx - rx + 1, cy - ry + 2], fill=C[4])
            d.line([cx + rx - 2, cy + ry - 1, cx + rx - 3, cy + ry - 1], fill=C[0]); d.point((cx + rx - 1, cy + ry - 2), fill=C[0])
        elif lit:
            d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 165, 285, fill=C[4])
            d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], -15, 105, fill=C[0])

    def tint(s, base, k=.35):
        """A material tinted toward the style's own colour (machine-made goods sold to that market)."""
        return ramp(mix(base[2], s.C[2], k), 16)

    def hard(s):
        """The ware's colours for a thing that must be metal or fired (a pot, a kettle): wood and gourd become the
        style's metal."""
        if s.wname in WOODS: return M[METAL_FOR.get(s.style, "iron")]
        return s.C

    def glint(s, x, y, c=(250, 248, 236), n=2):
        s.d.line([x, y, x + n - 1, y], fill=c)

    def pattern(s, cx, cy, r, pat=None, A=None):
        """A ware's pattern laid on a round face of radius r."""
        d = s.d; pat = pat or s.pat; A = A or s.A or s.C
        if r < 3 or pat == "none": return
        if pat == "band":
            d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[2], width=2 if r > 6 else 1)
        elif pat == "rings":
            d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=A[1] if A is not s.C else s.C[1])
            if r > 7: d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], outline=s.C[1])
        elif pat == "dots":
            for k in range(8):
                a = k * math.pi / 4; px_, py_ = cx + math.cos(a) * (r - 2.5), cy + math.sin(a) * (r - 2.5)
                d.rectangle([px_ - 1, py_ - 1, px_, py_], fill=A[2])
        elif pat == "flowers":
            for k in range(5):
                a = k * 2 * math.pi / 5 + .3; px_, py_ = cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3)
                d.rectangle([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=A[3]); d.point((px_, py_), fill=M["slip_yellow"][3])
        elif pat == "geo":
            d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[1])
            for k in range(8):
                a = k * math.pi / 4; d.line([cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4), cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=A[2])
        elif pat == "lines":
            for k in range(6):
                a = k * math.pi / 3 + .2; d.line([cx + math.cos(a) * r * .35, cy + math.sin(a) * r * .35, cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=A[2])
        elif pat == "blue":
            d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[2], width=2)
            d.ellipse([cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45], fill=A[3])
        elif pat == "stitch":
            for k in range(10):
                a = k * math.pi / 5; d.point((cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)), fill=s.C[4])

    def gild(s, cx, cy, r):
        """The princely touch: a gilt or silver rim."""
        if s.w >= 5 and r >= 4:
            G_ = M["gold"] if s.wname not in ("gold", "lustre", "brass") else M["silver"]
            s.d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=G_[3])

    def liquid(s, name, cx, cy, r):
        c = LIQ.get(name)
        if c is None or r < 1: return
        s.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
        if r >= 4: s.d.line([cx - r + 2, cy - r // 2, cx - r // 3, cy - r // 2], fill=tone(c, 46))
        s.spill = c

    # -- condition, applied after the drawing
    def finish(s, snap):
        tm = s.tm
        box = (s.x0 - 1, s.y0 - 1, s.x1 + 2, s.y1 + 2)
        cur = tm.img.crop(box); old = snap.crop(box)
        drawn = np.asarray(ImageChops.difference(cur, old).convert("L")) > 6
        a = np.asarray(cur).astype(np.float32)
        gr = ERA_GRADE.get(s.e) if not s.glob else None
        if gr is not None:                                                         # the light and patina of the age
            k_, add = gr; a = np.where(drawn[..., None], a * k_ + np.array(add, np.float32), a)
            tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), box[:2]); cur = tm.img.crop(box)
        if s.cond == "worn":
            g = a.mean(2, keepdims=True); a2 = a * .6 + g * .2 + np.array([40, 32, 20], np.float32)      # faded, greyed and grimed
            a = np.where(drawn[..., None], a2, a)
            tm.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), box[:2])
            ox, oy = s.shape[2] - 3 if s.shape else s.x1 - 4, (s.shape[1] + 2) if s.shape else s.y0 + 3
            s.d.rectangle([ox - 1, oy, ox, oy + 1], fill=OUT)                                # a chip in the rim
            sx, sy = (s.cx - 2, s.cy + 2)
            s.d.line([sx, sy, sx + 3, sy + 1], fill=tone(tuple(int(c) for c in a[min(a.shape[0] - 1, sy - box[1]), min(a.shape[1] - 1, sx - box[0])]), -34))
        elif s.cond == "broken" and not s.custom_break:
            x0, y0, x1, y1 = s.shape or (s.x0, s.y0, s.x1, s.y1)
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            wedge = [(cx + 1, cy + 1), (x1 + 1, cy - (y1 - y0) // 6), (x1 + 1, y1 + 1), (cx + (x1 - x0) // 8, y1 + 1)]
            m = Image.new("L", tm.img.size, 0)
            from PIL import ImageDraw
            ImageDraw.Draw(m).polygon(wedge, fill=255)
            tm.img.paste(snap, (0, 0), m)
            if s.spill is not None:                                                        # what it held, run out
                s.d.polygon([(cx + 2, cy + 3), (x1 - 1, cy + 2), (x1, y1 - 1), (cx + 3, y1)], fill=s.spill)
            s.d.line([cx + 1, cy + 1, x0 + (x1 - x0) // 4, y0 + (y1 - y0) // 4], fill=OUT)          # the crack
            s.d.line([cx + 1, cy + 1, cx - 1, y1 - 2], fill=OUT)
            sh = max(2, (x1 - x0) // 6)                                                    # the piece that fell out
            px_, py_ = x1 - sh - 1, y1 - sh - 1
            s.d.polygon([(px_, py_), (px_ + sh, py_ + 1), (px_ + 1, py_ + sh)], fill=s.C[3], outline=OUT)


def goods(fn, gf=None):
    e0 = next((n for n, a, b, _ in ERAS if a >= gf), ERAS[-1][0]) if gf else None   # first era of the one worldwide look
    def draw(tm, x, y, w, h, st, v):
        if e0 and "style" not in v and "era" not in v: v = dict(v, era=e0)          # a bare look with no era: draw the worldwide one
        g = G(tm, x, y, w, h, st, v); snap = tm.img.copy()
        fn(g); g.finish(snap)
    draw.__doc__ = fn.__doc__; draw.__name__ = fn.__name__
    return draw


def tags_of(oid):
    row = _ROW[oid]
    return tuple(p.strip().rsplit(" ", 1)[0] for p in row.where.split(",") if p.strip())


def gdef(oid, fn, ft=None, ref=None, **kw):
    if ft is not None: kw["ft"] = ft
    if ref is not None: kw["ref"] = ref
    from library.core import CATALOGUE
    if oid not in CATALOGUE: kw.setdefault("tags", tags_of(oid))
    return define(oid, draw=goods(fn, kw.get("global_from")), **kw)


# ================================================================ kitchen and table ware
EUF = ("central", "atlantic", "northern", "mediterranean")          # the European forms


def _modern_form(g):
    """Machine-age goods of one pattern sold everywhere: Europe and the settled lands from Mid-Century."""
    return g.e >= MC and (g.style in EUF or (g.style in ("americas", "oceania") and g.b >= 1))


def _food(g, cx, cy, fr, c=None):
    c = c or FOOD[g.style]; d = g.d
    d.ellipse([cx - fr, cy - fr, cx + fr, cy + fr], fill=c); g.spill = c
    if fr >= 3: d.rectangle([cx - fr // 2, cy - fr // 2, cx - fr // 2 + 1, cy - fr // 2], fill=tone(c, 40)); d.rectangle([cx + 1, cy + 1, cx + 2, cy + 2], fill=tone(c, -36))


def _stones(g, cx, cy, r, n=3, C=None):
    C = C or ramp((130, 128, 120), 14)
    for k in range(n):
        a = -math.pi / 2 + k * 2 * math.pi / n; sx, sy = cx + math.cos(a) * r, cy + math.sin(a) * r
        g.d.ellipse([sx - 3, sy - 2, sx + 3, sy + 2], fill=C[2], outline=OUT); g.d.point((sx - 1, sy - 1), fill=C[4])


def pot(g):
    """A cooking pot from above, its food showing, in its people's form. Europe: a round iron or bronze cauldron on
    a bail in the Middle Ages, lugged copper and iron pots later, an aluminium or steel saucepan on a long handle from
    Mid-Century; the Islamic world: a tinned copper pot with its lid pushed half off; the steppe: a broad kazan with
    ring handles; South Asia: a round handi with a narrow mouth; East Asia: a wok with loop handles; Southeast Asia:
    a clay pot on three hearth stones; Africa: an incised clay pot on a grass ring; the Americas: a painted olla
    with a flared rim; Oceania: a wooden bowl of food boiled with hot stones; the far north: a square soapstone pot.
    Future Darkness: a dark sealed pot with a lit band."""
    d = g.d; v = g.v; full = v.get("contents", "full"); st = g.style
    r = min(g.W, g.H) // 2 - 2; cx, cy = g.cx, g.cy
    C = g.hard(); A = g.A or C
    fr = r - 3 if full != "half" else r - 5
    if _modern_form(g):                                                                   # saucepan on a long handle
        r = min(r, (g.W - 9) // 2); cx = g.x0 + 1 + r
        g.shadow(cx - r, cy - r, g.x1, cy + r)
        d.rectangle([cx + r - 1, cy - 1, g.x1 - 1, cy + 2], fill=A[1] if g.e < FD else COMPOSITE[1], outline=OUT)
        g.disc(cx, cy, r, C=C); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[0])
        _food(g, cx, cy + 1, r - 3 if full != "half" else r - 5)
        if full == "simmering": d.ellipse([cx - r + 1, cy - r + 1, cx - 1, cy + r - 1], fill=C[3], outline=OUT)        # a lid set half on
        if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 120, 240, fill=g.GL[1])
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "polar":                                                                     # square soapstone pot
        g.shadow(cx - r, cy - r + 2, cx + r, cy + r - 2, kind="rect")
        d.rounded_rectangle([cx - r, cy - r + 2, cx + r, cy + r - 2], 3, fill=C[2], outline=OUT); d.line([cx - r + 2, cy - r + 3, cx + r - 2, cy - r + 3], fill=C[4])
        d.rounded_rectangle([cx - r + 3, cy - r + 5, cx + r - 3, cy + r - 5], 2, fill=FOOD[st]); g.spill = FOOD[st]
        for sx in (cx - r, cx + r - 2): d.rectangle([sx, cy - 1, sx + 2, cy + 1], fill=C[0])
        g.shape = (cx - r, cy - r + 2, cx + r, cy + r - 2); return
    if st == "steppe": r = min(g.W, g.H) // 2 - 3
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st == "africa":                                                                    # on a grass ring
        Gr = ramp((200, 176, 110), 12); d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=Gr[2], outline=Gr[0])
    if st == "seasia": _stones(g, cx, cy, r + 1)
    if st == "steppe":                                                                   # ring handles
        for sx in (-1, 1): d.ellipse([cx + sx * (r + 1) - 2, cy - 2, cx + sx * (r + 1) + 2, cy + 2], outline=OUT, width=2)
    if st == "oceania":
        g.disc(cx, cy, r + 1, r - 1, C=C); d.ellipse([cx - r + 2, cy - r + 3, cx + r - 2, cy + r - 3], fill=C[0])
        _food(g, cx, cy, r - 4); _stones(g, cx, cy, r - 5, 3, ramp((96, 92, 90), 12))
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    g.disc(cx, cy, r, C=C)
    if st in ("southasia",):                                                              # narrow mouth on a round belly
        mr = int(r * .6); d.ellipse([cx - mr - 1, cy - mr - 1, cx + mr + 1, cy + mr + 1], fill=A[2], outline=OUT)
        d.ellipse([cx - mr + 1, cy - mr + 1, cx + mr - 1, cy + mr - 1], fill=C[0]); _food(g, cx, cy, mr - 2)
    elif st == "eastasia":                                                                # shallow wok
        d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=C[1]); _food(g, cx + 1, cy + 1, r - 5 if full != "half" else r - 7)
        for sx in (-1, 1): d.arc([cx + sx * r - 3, cy - 3, cx + sx * r + 3, cy + 3], 0, 360, fill=A[3], width=2)
    else:
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[0])
        if st == "americas": d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[3], width=2)
        _food(g, cx, cy + 1, fr)
        if st == "africa":
            for k in range(12):
                a = k * math.pi / 6; d.point((cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)), fill=A[0] if g.A else C[0])
        if st == "islamic" or full == "simmering":                                       # the lid pushed half off
            lr = int(r * .7); lx, ly = cx - r + lr - 1, cy - r + lr - 1
            d.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=A[2], outline=OUT); d.arc([lx - lr + 1, ly - lr + 1, lx + lr - 1, ly + lr - 1], 170, 280, fill=A[4])
            d.rectangle([lx - 1, ly - 1, lx + 1, ly + 1], fill=A[0])
        if st in EUF and g.e <= RE: _lugs(g, cx, cy, r, C, "bail")
        elif st in EUF: _lugs(g, cx, cy, r, C, "lugs")
    if g.b == 2 and st not in ("islamic",): d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=A[3])
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 120, 240, fill=g.GL[1])
    g.shape = (cx - r, cy - r, cx + r, cy + r)


def _lugs(g, cx, cy, r, C, kind="lugs"):
    d = g.d
    if kind == "lugs":
        for sx in (-1, 1): d.rectangle([cx + sx * r - (2 if sx < 0 else 0), cy - 1, cx + sx * r + (2 if sx > 0 else 0), cy + 1], fill=C[1], outline=OUT)
    else:
        d.arc([cx - r, cy - r, cx + r, cy + r], 200, 340, fill=IRON[0], width=2); d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 210, 330, fill=IRON[4])


def kettle(g):
    """A kettle from above: a round body, a spout, a handle. Europe and the far north: a copper, brass or iron
    kettle on a bail, its spout to the west (a whistling kettle in Mid-Century, an electric jug kettle on its base
    in Modern); the Islamic world: a beaked brass dallah; the steppe: a tall copper kumgan with a long spout; South
    Asia: a brass kettle with a side handle; East Asia: an iron tetsubin with its knobbed skin; Southeast Asia: a
    clay kendi with its spout to the south; Africa: a painted enamel kettle; the Americas: a speckled enamel coffee
    pot; Oceania: a billy can on its wire bail. Polished ones gleam, plain ones are sooted."""
    d = g.d; C = g.hard(); A = g.A or C; st = g.style
    if st == "eastasia" and g.e <= VI and g.b == 0: C = IRON
    if st == "africa" or (st == "americas" and g.b < 2): C = M["enamel"] if g.b else M["enamel_blue"]
    r = min(g.W - 5, g.H - 1) // 2; cx, cy = g.x1 - 1 - r, g.cy
    pol = g.v.get("finish", "plain") == "polished"
    if g.e == MO and (st in EUF or st == "polar"):                                         # electric jug kettle on its base
        C = g.L if g.b < 2 else g.tint(M["steel"], .45)
        g.shadow(cx - r, cy - r, cx + r, cy + r)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=M["plastic_eastasia"][2], outline=OUT)
        d.rounded_rectangle([cx - r + 2, cy - r + 1, cx + r - 2, cy + r - 1], 3, fill=C[2], outline=C[0])
        d.rectangle([cx + r - 3, cy - 2, cx + r, cy + 2], fill=C[1])
        d.line([cx - r + 3, cy - r + 2, cx + r - 4, cy - r + 2], fill=C[4]); d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=C[0])
        d.polygon([(cx - r + 1, cy - 2), (g.x0 + 1, cy), (cx - r + 1, cy + 2)], fill=C[1], outline=OUT)
        d.rectangle([cx + r - 2, cy - 1, cx + r - 1, cy], fill=(90, 200, 120) if g.b else (220, 60, 40))
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "oceania":                                                                   # a billy can: no spout, wire bail
        cx = g.cx; r = min(g.W, g.H) // 2 - 1; C = M["aluminium"] if g.e >= GW else M["pewter"]
        g.shadow(cx - r, cy - r, cx + r, cy + r); g.disc(cx, cy, r, C=C)
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=tone(C[0], -30)); g.liquid("tea", cx, cy, r - 3)
        d.line([cx - r, cy, cx + r, cy - 3], fill=IRON[1]); d.ellipse([cx + r - 4, cy - r + 1, cx + r - 1, cy - r + 4], fill=A[2])
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "seasia":                                                                    # kendi, spout to the south
        cx = g.cx; r = min(g.W, g.H - 4) // 2
        cy = g.y0 + 1 + r
        g.shadow(cx - r, cy - r, cx + r, cy + r)
        d.polygon([(cx - 2, cy + r - 2), (cx, g.y1), (cx + 2, cy + r - 2)], fill=C[3], outline=OUT)
        g.disc(cx, cy, r, C=C); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=A[1], outline=OUT); d.point((cx, cy), fill=OUT)
        if g.b: g.pattern(cx, cy, r)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "steppe":                                                                    # kumgan: oval body, long spout NW
        rx, ry = r - 1, r + 1
        g.shadow(cx - rx, cy - ry, cx + rx, cy + ry)
        d.line([cx - rx + 1, cy - 2, g.x0 + 1, g.y0 + 2], fill=OUT, width=3); d.line([cx - rx + 1, cy - 2, g.x0 + 1, g.y0 + 2], fill=C[3])
        d.arc([cx + rx - 3, cy - ry + 1, cx + rx + 3, cy + ry - 1], 270, 90, fill=OUT, width=2)
        g.disc(cx, cy, rx, ry, C=C); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=A[2], outline=OUT); g.pattern(cx, cy, min(rx, ry), "dots", A)
        g.shape = (cx - rx, cy - ry, cx + rx, cy + ry); return
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st == "islamic":                                                                   # dallah: long beak spout
        d.polygon([(cx - r + 1, cy - 3), (g.x0, cy - 6), (g.x0 + 1, cy - 4), (cx - r + 1, cy + 2)], fill=C[3], outline=OUT)
    elif st == "americas":                                                                # coffee pot: short spout and side handle
        d.polygon([(cx - r + 1, cy - 2), (g.x0 + 2, cy), (cx - r + 1, cy + 2)], fill=C[2], outline=OUT)
    elif st != "southasia" or True:
        d.polygon([(cx - r + 1, cy - 1), (g.x0, cy + 2), (cx - r + 2, cy + 3)], fill=C[2], outline=OUT)
    if g.e == MC: d.rectangle([g.x0, cy + 1, g.x0 + 1, cy + 3], fill=OUT)                # the whistle
    if st in ("southasia", "americas"): d.rectangle([cx + r - 1, cy - 2, g.x1, cy + 2], fill=A[1], outline=OUT)
    g.disc(cx, cy, r, C=C)
    if st == "eastasia" and g.e <= VI:
        for k in range(-r + 2, r - 1, 2):
            for j in range(-r + 2, r - 1, 2):
                if k * k + j * j < (r - 1) ** 2 and (k // 2 + j // 2) % 2 == 0: d.point((cx + k, cy + j), fill=C[3])
    elif st == "americas":
        for k in range(-r + 2, r - 1, 3):
            for j in range(-r + 2, r - 1, 3):
                if k * k + j * j < (r - 1) ** 2: d.point((cx + k + (j % 2), cy + j), fill=C[4] if g.b == 0 else C[0])
    elif st == "africa":
        for k in range(4):
            a = k * math.pi / 2 + .6; fx, fy = cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3)
            d.rectangle([fx - 1, fy - 1, fx + 1, fy + 1], fill=M["enamel_red"][2]); d.point((fx, fy), fill=M["gold"][3])
    elif g.b: d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=A[2])
    lr = max(2, r // 2)
    d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=C[3], outline=C[0])                     # the lid
    knob = M["darkwood"] if g.e >= VI else C
    d.rectangle([cx - 1, cy - 1, cx, cy], fill=knob[1] if g.e < FD else g.GL[2])
    if st not in ("southasia", "americas"):
        d.line([cx - r + 1, cy - r // 2, cx + r - 1, cy - r // 2], fill=knob[0] if g.e >= VI else OUT)     # the handle over
    if pol: d.line([cx - r + 2, cy + 1, cx - r + 2, cy + r - 3], fill=C[4]); d.line([cx - r + 3, cy + r - 2, cx - 1, cy + r - 2], fill=C[4])
    else: d.ellipse([cx + 1, cy + 1, cx + r - 1, cy + r - 1], fill=tone(C[0], -12))       # soot from the fire
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=g.GL[1])
    g.spill = LIQ["water"]
    g.shape = (cx - r, cy - r, cx + r, cy + r)


def jug(g):
    """A jug or water vessel from above, in its people's form. Europe: a round belly, a narrow mouth, a pinched
    spout to the west and a loop handle east (green-glazed in the Middle Ages, salt-glazed stoneware with its mask in
    the Renaissance, pewter or faience, printed ironstone, glass or enamel, a plastic jug with a flip lid in Modern);
    the Islamic world: a long-spouted ewer; the steppe: a flat leather flask with its stopper; South Asia: a round
    lota with a flared lip; East Asia: a bottle-necked ewer with a side spout; Southeast Asia: a kendi with its
    spout to the south; Africa: a two-lobed gourd bottle; the Americas: a stirrup-spout jar; Oceania: a coconut
    water bottle in its sling; the far north: a skin water bag. What it holds shows in the mouth."""
    d = g.d; C = g.C; A = g.A or C; liq = g.v.get("contents", "water"); st = g.style
    if g.e == RE and st in ("central", "atlantic") and g.b == 1: C = M["glaze_brown"]
    if g.e == AR and g.b == 1 and st in ("atlantic", "central"): C = M["pewter"]
    R0 = min(g.W, g.H) // 2
    if st == "steppe" and g.e < MC:
        rx, ry = R0 - 4, R0 - 1; cx, cy = g.cx, g.cy
        g.shadow(cx - rx, cy - ry, cx + rx, cy + ry)
        d.rounded_rectangle([cx - rx, cy - ry, cx + rx, cy + ry], 5, fill=C[2], outline=OUT)
        d.rounded_rectangle([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], 4, outline=A[1])
        d.rectangle([cx - 1, cy - ry - 1, cx + 1, cy - ry + 2], fill=M["darkwood"][3], outline=OUT); g.spill = LIQ.get("milk")
        if g.b == 2: g.pattern(cx, cy, min(rx, ry), "dots", A)
        g.shape = (cx - rx, cy - ry, cx + rx, cy + ry); return
    if st == "africa" and g.trad:                                                      # gourd bottle: two lobes
        r1 = R0 - 2; r2 = max(3, r1 // 2 + 1); cx, cy = g.x0 + 1 + r1, g.y1 - 1 - r1
        g.shadow(cx - r1, cy - r1, cx + r1, cy + r1)
        g.disc(cx + r1 - 1, cy - r1 + 1, r2, C=C); g.disc(cx, cy, r1, C=C)
        g.pattern(cx, cy, r1, "lines", A); d.ellipse([cx + r1 - 2, cy - r1, cx + r1, cy - r1 + 2], fill=OUT)
        g.spill = LIQ.get(liq); g.shape = (cx - r1, cy - r1 - r2, cx + r1 + r2, cy + r1); return
    if st == "polar":
        cx, cy = g.cx, g.cy; rx, ry = R0 - 1, R0 - 3
        g.shadow(cx - rx, cy - ry, cx + rx, cy + ry)
        d.polygon([(cx - rx, cy), (cx - rx + 3, cy - ry), (cx + rx - 4, cy - ry + 1), (cx + rx, cy - 2), (cx + rx - 2, cy + ry), (cx - rx + 2, cy + ry - 1)], fill=C[2], outline=OUT)
        d.line([cx - rx + 3, cy - ry + 2, cx + rx - 5, cy - ry + 2], fill=C[4]); d.ellipse([cx + rx - 4, cy - 3, cx + rx, cy + 1], fill=A[1], outline=OUT)
        g.spill = LIQ.get(liq); g.shape = (cx - rx, cy - ry, cx + rx, cy + ry); return
    if st == "oceania" and g.b < 2:                                                       # coconut water bottle in a sling
        r = R0 - 1; cx, cy = g.cx, g.cy; g.shadow(cx - r, cy - r, cx + r, cy + r)
        g.disc(cx, cy, r, C=M["coconut"])
        for k in range(-r + 2, r - 1, 3): d.line([cx + k, cy - r + 2, cx + k + 1, cy + r - 2], fill=M["bamboo"][1])
        d.ellipse([cx - 2, cy - 2, cx + 1, cy + 1], fill=OUT); g.spill = LIQ.get(liq)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "seasia" and g.trad:                                                       # kendi: spout to the south
        r = min(g.W, g.H - 4) // 2; cx, cy = g.cx, g.y0 + 1 + r
        g.shadow(cx - r, cy - r, cx + r, cy + r)
        d.polygon([(cx - 2, cy + r - 2), (cx - 1, g.y1), (cx + 1, g.y1), (cx + 2, cy + r - 2)], fill=C[3], outline=OUT)
        g.disc(cx, cy, r, C=C); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=A[2], outline=OUT); g.liquid(liq, cx, cy, 1)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "southasia" and g.trad:                                                    # lota: round, a wide flared lip
        r = R0 - 1; cx, cy = g.cx, g.cy; g.shadow(cx - r, cy - r, cx + r, cy + r)
        g.disc(cx, cy, r, C=C); mr = r // 2 + 1
        d.ellipse([cx - mr, cy - mr, cx + mr, cy + mr], fill=C[4], outline=C[0]); d.ellipse([cx - mr + 2, cy - mr + 2, cx + mr - 2, cy + mr - 2], fill=(18, 14, 18))
        g.liquid(liq, cx, cy, mr - 3); g.gild(cx, cy, r)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st == "americas" and g.e < MC:                                                     # stirrup-spout jar
        r = R0 - 2; cx, cy = g.cx, g.cy + 1; g.shadow(cx - r, cy - r, cx + r, cy + r)
        g.disc(cx, cy, r, C=C); g.pattern(cx, cy, r, "geo", A)
        d.arc([cx - r + 3, cy - r - 1, cx + r - 3, cy + 2], 180, 360, fill=OUT, width=3); d.arc([cx - r + 3, cy - r - 1, cx + r - 3, cy + 2], 185, 355, fill=C[3])
        d.rectangle([cx - 1, cy - r - 2, cx + 1, cy - r], fill=C[1], outline=OUT); g.spill = LIQ.get(liq)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    r = R0 - 2; cx, cy = g.x0 + 2 + r, g.cy
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st == "islamic":                                                                   # ewer: long spout NW, handle E
        d.line([cx - r + 2, cy - 2, g.x0, g.y0 + 1], fill=OUT, width=3); d.line([cx - r + 2, cy - 2, g.x0, g.y0 + 1], fill=C[3])
    elif st == "eastasia":
        d.line([cx - r + 1, cy + 1, g.x0, cy + 4], fill=OUT, width=3); d.line([cx - r + 1, cy + 1, g.x0, cy + 4], fill=C[3])
    if st != "eastasia" or g.e >= MC:
        d.rectangle([cx + r - 2, cy - 3, g.x1, cy + 3], fill=C[1], outline=OUT); d.rectangle([cx + r, cy - 1, g.x1 - 2, cy + 1], fill=OUT)
    g.disc(cx, cy, r, C=C)
    if g.e != MO and r >= 5 and st not in ("eastasia",): d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=A[2])
    if st == "eastasia" and g.b: g.pattern(cx, cy, r, g.pat, A)
    if g.e == RE and st in ("central", "atlantic") and g.b == 1:                         # the bearded mask
        d.ellipse([cx - 2, cy + r - 5, cx + 1, cy + r - 2], fill=C[4], outline=C[0])
    mr = max(2, r // 2 - (1 if g.e <= LN or st == "eastasia" else 0))
    if st in EUF or st in ("americas", "oceania") or not g.trad:
        d.polygon([(cx - mr + 1, cy - 2), (g.x0, cy), (cx - mr + 1, cy + 2)], fill=C[3], outline=OUT)    # pinched spout
    if g.e == MO:
        d.ellipse([cx - mr - 1, cy - mr - 1, cx + mr + 1, cy + mr + 1], fill=A[1], outline=OUT); d.rectangle([cx + mr - 1, cy - 1, cx + mr + 2, cy + 1], fill=A[3])
        g.spill = LIQ.get(liq); g.shape = (cx - r, cy - r, cx + r, cy + r); return
    d.ellipse([cx - mr, cy - mr, cx + mr, cy + mr], fill=(18, 14, 18), outline=C[0])
    g.liquid(liq, cx, cy, mr - 1)
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 100, 260, fill=g.GL[1])
    g.gild(cx, cy, r)
    g.shape = (cx - r, cy - r, cx + r, cy + r)


def bowl(g):
    """A bowl from above, its food showing, in its people's form and with what it is eaten with: a round bowl and a
    spoon in Europe; a footed bowl with a torn piece of flatbread in the Islamic world; a wooden bowl with a silver
    rim on the steppe; a brass katori with a chapati beside it in South Asia; a bowl with chopsticks across it in East
    Asia; half a coconut shell with a shell spoon in Southeast Asia; an oval half calabash in Africa; a painted clay
    bowl with a tortilla in the Americas; an oval carved bowl with lug ends in Oceania; an oval soapstone or wooden
    bowl in the far north. Enamel and plastic in the machine age; a dark sealed bowl in Future Darkness."""
    d = g.d; C = g.C; A = g.A or C; food = g.v.get("contents", "food"); st = g.style
    r = min(g.W, g.H) // 2 - 1; cx, cy = g.cx, g.cy; rx, ry = r, r
    if st in ("africa", "oceania", "polar") and g.trad: ry = r - 3; rx = r
    if st in ("islamic", "southasia", "americas") and g.trad: r = rx = ry = r - 2; cx = g.x0 + 1 + r; cy = g.y0 + 1 + r
    g.shadow(cx - rx, cy - ry, cx + rx, cy + ry)
    if st == "oceania" and g.trad:
        for sx in (-1, 1): d.rectangle([cx + sx * rx - 2, cy - 1, cx + sx * rx + 2, cy + 1], fill=C[1], outline=OUT)
    g.disc(cx, cy, rx, ry, C=C)
    if st == "seasia" and g.b == 0:
        for k in range(8): a = k * math.pi / 4 + .3; d.point((cx + math.cos(a) * (rx - 1), cy + math.sin(a) * (ry - 1)), fill=C[4])
    d.ellipse([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], fill=A[1] if g.b and st not in ("africa",) else C[1])
    if food != "empty":
        fc = FOOD[st] if food == "food" else LIQ.get(food, FOOD[st])
        _food_ell(g, cx, cy + 1, rx - 3, ry - 3, fc)
    else: g.pattern(cx, cy, min(rx, ry) - 2, g.pat, A)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=OUT)
    if g.b == 2 and st == "steppe": d.ellipse([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], outline=M["silver"][3])
    if st == "eastasia" or (st == "seasia" and g.e >= VI):
        sc = M["lacq_red"] if g.b == 2 else M["bamboo"]
        d.line([cx - rx + 2, cy - 2, g.x1 - 1, cy - 5], fill=sc[2]); d.line([cx - rx + 2, cy + 1, g.x1 - 1, cy - 2], fill=sc[2])
    elif st in ("islamic", "southasia", "americas") and g.trad:                       # a piece of flatbread beside
        Bc = ramp((214, 180, 120), 12) if st != "americas" else ramp((226, 206, 120), 12)
        bx, by = g.x1 - 4, g.y1 - 4; d.ellipse([bx - 4, by - 4, bx + 3, by + 3], fill=Bc[2], outline=OUT); d.point((bx - 1, by - 1), fill=Bc[0])
    elif st == "seasia":
        d.ellipse([g.x1 - 6, cy - 2, g.x1 - 1, cy + 2], fill=M["shell"][2], outline=OUT)
    elif st in EUF or st == "steppe" or not g.trad:
        sp = M["silver"] if g.b == 2 else (M["pewter"] if g.e >= RE and g.b == 1 else M["treen"])
        if g.e >= VI and g.b < 2: sp = M["steel"]
        d.line([cx + 1, cy + 1, g.x1 - 1, g.y1 - 2], fill=OUT, width=2); d.line([cx + 1, cy, g.x1 - 1, g.y1 - 3], fill=sp[3])
        d.ellipse([cx - 2, cy - 1, cx + 2, cy + 2], fill=sp[3], outline=OUT)
    if g.e == FD: d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 0, 360, fill=g.GL[1])
    g.gild(cx, cy, r)
    g.shape = (cx - rx, cy - ry, cx + rx, cy + ry)


def _food_ell(g, cx, cy, rx, ry, c):
    if rx < 1 or ry < 1: return
    g.d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=c); g.spill = c
    if rx >= 3: g.d.rectangle([cx - rx // 2, cy - ry // 2, cx - rx // 2 + 1, cy - ry // 2], fill=tone(c, 40)); g.d.rectangle([cx + 1, cy + 1, cx + 2, cy + 1], fill=tone(c, -36))


def cup(g):
    """A cup from above, in its people's form, with the drink in the middle. Europe: a turned wooden beaker in the
    Middle Ages, then cups with a handle nub (a pewter or silver tankard in the Renaissance, a porcelain cup on its
    saucer in the Age of Reason and Victorian, an enamel mug in the Great War, a china mug, a paper coffee cup with
    its lid in Modern); the Islamic world: a small handleless cup, then a tea glass in its silver holder; the steppe: a
    broad shallow piala; South Asia: a little unglazed kulhad or a brass tumbler; East Asia: a handleless tea bowl;
    Southeast Asia and Oceania: a polished coconut cup; Africa: an oval calabash cup; the Americas: a painted beaker;
    the far north: a horn cup. Future Darkness: a dark cup with a lit rim."""
    d = g.d; C = g.C; A = g.A or C; liq = g.v.get("contents", "ale"); st = g.style
    R_ = min(g.W, g.H) // 2; cx, cy = g.cx, g.cy
    if st == "polar" and g.trad:                                                        # a horn cup: a curved crescent
        g.shadow(g.x0 + 1, cy - 3, g.x1 - 1, cy + 3)
        Hn = M["leather"] if g.b < 2 else M["ivory"]
        d.polygon([(g.x0 + 1, cy - 2), (cx, cy - 4), (g.x1 - 1, cy - 3), (g.x1 - 2, cy + 3), (cx, cy + 3), (g.x0 + 2, cy + 1)], fill=Hn[2], outline=OUT)
        d.ellipse([g.x1 - 5, cy - 3, g.x1 - 1, cy + 2], fill=OUT); g.liquid(liq, g.x1 - 3, cy, 1); d.line([g.x0 + 2, cy - 1, cx, cy - 3], fill=Hn[4])
        g.shape = (g.x0 + 1, cy - 4, g.x1 - 1, cy + 3); return
    if st == "africa" and g.trad:
        rx, ry = R_ - 1, R_ - 3
        g.shadow(cx - rx, cy - ry, cx + rx, cy + ry); g.disc(cx, cy, rx, ry, C=C); _food_ell(g, cx, cy, rx - 2, ry - 2, LIQ.get(liq) or C[0])
        d.line([cx - rx + 2, cy - ry + 1, cx + rx - 2, cy - ry + 1], fill=A[3]); g.shape = (cx - rx, cy - ry, cx + rx, cy + ry); return
    handle = (st in EUF and g.e >= RE) or (g.e >= GW and st in ("americas", "oceania", "polar"))
    saucer = g.e in (AR, VI, MC) and g.b >= 1 and st in EUF + ("eastasia",)
    glass = st == "islamic" and g.e >= AR and g.b >= 1
    wide = st == "steppe" and g.trad
    if handle and not saucer: cx = g.x0 + R_ - 1
    r = R_ - (1 if handle and not saucer else 0) - (1 if not wide and not saucer and st in ("southasia", "islamic", "eastasia") else 0)
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if g.e == RE and st in ("central", "atlantic", "northern") and g.b >= 1: C = M["pewter"] if g.b == 1 else M["silver"]
    if g.e == GW and g.b < 2 and st in EUF: C = M["enamel"] if g.b else M["enamel_blue"]
    if saucer:
        S = C if not glass else M["silver"]
        d.ellipse([cx - R_, cy - R_, cx + R_, cy + R_], fill=S[3], outline=OUT); d.point((cx - R_ + 2, cy - R_ + 2), fill=S[4])
        r = R_ - 3
    if handle:
        d.rectangle([cx + r - 1, cy - 1, cx + r + (2 if not saucer else 1), cy + 1], fill=C[1], outline=OUT)
    if glass:
        d.rectangle([cx + r - 1, cy - 1, cx + r + 1, cy + 1], fill=M["silver"][2], outline=OUT)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=M["silver"][2], outline=OUT)
        d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=M["glass"][3])
        g.liquid("tea" if liq in ("ale", "wine") else liq, cx, cy, r - 2); d.point((cx - r + 2, cy - r + 2), fill=(255, 255, 255))
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if g.e == MO and g.b < 2 and st in EUF:                                               # paper coffee cup with its lid
        Pc = M["whiteware"] if g.b else M["buff"]
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Pc[2], outline=OUT)
        d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=M["plastic_eastasia"][2] if g.b else PLASTIC_WHITE[1])
        d.rectangle([cx - 1, cy - r + 2, cx, cy - r + 2], fill=OUT); g.spill = LIQ["coffee"]
        g.shape = (cx - R_, cy - R_, cx + R_, cy + R_); return
    if st in ("seasia", "oceania") and g.trad: C = M["coconut"] if g.b < 2 else C
    g.disc(cx, cy, r, C=C)
    lr = max(1, r // 2 + (1 if wide else 0) - (1 if g.e == FD else 0))
    if st == "southasia" and g.b == 0: d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=C[3])
    if st == "southasia" and g.b: d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=A[3])
    if liq == "empty": d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=C[0])
    else: g.liquid(liq, cx, cy, lr)
    if g.b and r >= 4 and st not in ("southasia",): d.point((cx - r + 1, cy), fill=A[2]); d.point((cx, cy - r + 1), fill=A[2]); d.point((cx + r - 1, cy), fill=A[2]); d.point((cx, cy + r - 1), fill=A[2])
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 150, 300, fill=g.GL[2])
    g.gild(cx, cy, r)
    g.shape = (cx - R_, cy - R_, cx + R_, cy + R_)


def plate(g):
    """A plate or platter from above, with what is served on it, in its people's form: a round plate with a broad
    rim in Europe (pewter, maiolica, faience, printed ironstone, china, paper); a round brass tray with its incised
    star in the Islamic world; a brass thali with its little bowls of dal and curd in South Asia; a square dish in
    East Asia; a woven tray lined with leaf in Southeast Asia; a coiled grass tray in Africa; a painted clay plate in
    the Americas; an oval wooden platter in Oceania; a wooden board in the far north; a felt-edged wooden dish on the
    steppe. Future Darkness: a dark plate with a lit rim."""
    d = g.d; C = g.C; A = g.A or C; food = g.v.get("contents", "bread"); st = g.style
    if g.e == RE and g.b == 1 and st in ("central", "atlantic", "northern"): C = M["pewter"]
    r = min(g.W, g.H) // 2 - 1; cx, cy = g.cx, g.cy
    fc = {"bread": (190, 140, 76), "meat": (140, 64, 44), "fish": (196, 200, 196), "fruit": (190, 40, 40), "rice": FOOD[st]}.get(food)
    trad = g.trad
    if st == "southasia" and trad:                                                        # thali with its katoris
        T_ = M["brass"] if g.b < 2 else M["silver"]
        if g.b == 0: T_ = ramp((80, 140, 60), 16)                                            # a leaf plate
        g.shadow(cx - r, cy - r, cx + r, cy + r); g.disc(cx, cy, r, C=T_)
        for k, kc in enumerate(((214, 156, 40), (240, 238, 228), (150, 60, 30))):
            a = -math.pi * .8 + k * .9; kx, ky = cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4)
            d.ellipse([kx - 3, ky - 3, kx + 3, ky + 3], fill=T_[3], outline=OUT); d.ellipse([kx - 1, ky - 1, kx + 1, ky + 1], fill=kc)
        d.ellipse([cx - 1, cy, cx + 5, cy + 5], fill=FOOD[st]); g.spill = FOOD[st]
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if st in ("eastasia", "polar", "seasia") and trad:                                   # square dish, board or tray
        q = r - (1 if st != "polar" else 0)
        g.shadow(cx - q, cy - q, cx + q, cy + q, kind="rect")
        B = C if st != "polar" else M["darkwood"]
        d.rectangle([cx - q, cy - q, cx + q, cy + q], fill=B[2], outline=OUT); d.line([cx - q + 1, cy - q + 1, cx + q - 1, cy - q + 1], fill=B[4]); d.line([cx + q - 1, cy - q + 1, cx + q - 1, cy + q - 1], fill=B[0])
        if st == "seasia":
            for k in range(cx - q + 2, cx + q - 1, 3): d.line([k, cy - q + 1, k, cy + q - 1], fill=B[1])
            d.ellipse([cx - q + 2, cy - q + 2, cx + q - 2, cy + q - 2], fill=ramp((80, 140, 60), 14)[2])
        elif st == "eastasia": d.rectangle([cx - q + 2, cy - q + 2, cx + q - 2, cy + q - 2], outline=A[2])
        if fc: d.ellipse([cx - 3, cy - 3, cx + 3, cy + 2], fill=fc, outline=OUT); g.spill = fc
        g.shape = (cx - q, cy - q, cx + q, cy + q); return
    rx, ry = r, r
    if st == "oceania" and trad: ry = r - 3
    g.shadow(cx - rx, cy - ry, cx + rx, cy + ry, off=2, f=.7)
    if st == "africa" and trad:
        Gr = ramp((206, 176, 112), 12); g.disc(cx, cy, r, C=Gr)
        for k in range(2, r, 2): d.ellipse([cx - k, cy - k, cx + k, cy + k], outline=Gr[1 if k % 4 else 3])
        d.ellipse([cx - r + 3, cy - r + 3, cx - r + 7, cy - r + 7], fill=A[2] if g.b else Gr[0])
    else:
        g.disc(cx, cy, rx, ry, C=C)
        if st == "islamic" and trad:
            for k in range(8): a = k * math.pi / 4; d.line([cx, cy, cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)], fill=A[2])
            d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[1])
        else:
            g.pattern(cx, cy, min(rx, ry), g.pat if g.pat != "blue" else "band", A)
            wr = int(min(rx, ry) * .6)
            d.ellipse([cx - wr, cy - wr * ry // rx, cx + wr, cy + wr * ry // rx], fill=C[3], outline=C[1])
            if g.pat == "blue": d.ellipse([cx - wr + 2, cy - wr + 2, cx + wr - 2, cy + wr - 2], fill=A[2])
    if fc:
        if food == "fish":
            d.polygon([(cx - 5, cy), (cx + 3, cy - 2), (cx + 3, cy + 2)], fill=fc, outline=OUT); d.polygon([(cx + 3, cy), (cx + 6, cy - 2), (cx + 6, cy + 2)], fill=fc)
        elif food == "fruit":
            for dx, dy in ((-2, -1), (2, 0), (0, 2)): d.ellipse([cx + dx - 2, cy + dy - 2, cx + dx + 1, cy + dy + 1], fill=fc, outline=OUT)
        else:
            d.ellipse([cx - 4, cy - 3, cx + 4, cy + 3], fill=fc, outline=OUT); d.line([cx - 2, cy - 1, cx + 1, cy - 2], fill=tone(fc, 40))
        g.spill = fc
    if g.e == FD: d.arc([cx - rx, cy - ry, cx + rx, cy + ry], 0, 360, fill=g.GL[1])
    g.gild(cx, cy, r)
    g.shape = (cx - rx, cy - ry, cx + rx, cy + ry)


def trencher(g):
    """A trencher from above: in Europe a thick square slice of stale bread soaked with gravy, on a square board for
    the poor and a round pewter or silver charger for the rich; in the Islamic world and on the steppe a round flat
    loaf on a copper or brass tray; in South Asia a banana leaf; in Southeast Asia a leaf on a woven tray; in East
    Asia a lacquer tray; in Africa a round of injera with its stews; in the Americas a tortilla on its clay griddle;
    in Oceania food on a leaf over an oval platter; in the far north a plank. From the Long Night the better-off
    European eats from the wooden or pewter trencher itself, with a heel of bread beside, and only the poor keep the
    bread slice."""
    d = g.d; C = g.C; A = g.A or C; cx, cy = g.cx, g.cy; r = min(g.W, g.H) // 2 - 1; st = g.style
    food = g.v.get("contents", "meat")
    fcol = {"meat": (130, 56, 40), "fish": (200, 204, 196), "pottage": FOOD[st], "fowl": (200, 150, 90)}.get(food)
    L = ramp((70, 130, 50), 18)
    if st in ("southasia",):
        g.shadow(g.x0, g.y0 + 2, g.x1, g.y1 - 2)
        d.polygon([(g.x0, cy - 2), (g.x0 + 3, g.y0 + 2), (g.x1 - 1, g.y0 + 3), (g.x1, cy + 2), (g.x1 - 3, g.y1 - 2), (g.x0 + 1, g.y1 - 3)], fill=L[2], outline=OUT)
        d.line([g.x0 + 1, cy, g.x1 - 1, cy], fill=L[4])
        for k in range(g.x0 + 3, g.x1 - 2, 3): d.line([k, cy - 1, k + 2, cy - 4], fill=L[1])
        for dx, kc in ((-4, (240, 238, 228)), (0, FOOD[st]), (4, (150, 60, 30))): d.ellipse([cx + dx - 2, cy + 1, cx + dx + 2, cy + 4], fill=kc)
        g.spill = FOOD[st]; g.shape = (g.x0, g.y0 + 2, g.x1, g.y1 - 2); return
    if st in ("seasia", "eastasia", "polar"):
        B = {"seasia": M["bamboo"], "eastasia": C, "polar": M["darkwood"]}[st]
        g.shadow(g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1, kind="rect")
        d.rectangle([g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1], fill=B[2], outline=OUT); d.line([g.x0 + 2, g.y0 + 2, g.x1 - 2, g.y0 + 2], fill=B[4])
        if st == "seasia":
            for k in range(g.x0 + 3, g.x1 - 1, 3): d.line([k, g.y0 + 2, k, g.y1 - 2], fill=B[1])
            d.polygon([(cx - r + 3, cy), (cx, cy - r + 3), (cx + r - 3, cy), (cx, cy + r - 3)], fill=L[2], outline=L[0])
        elif st == "eastasia": d.rectangle([g.x0 + 3, g.y0 + 3, g.x1 - 3, g.y1 - 3], outline=A[2]); d.ellipse([cx - 4, cy - 4, cx + 1, cy + 1], fill=FOOD[st], outline=OUT)
        else: d.line([g.x0 + 2, cy, g.x1 - 2, cy + 1], fill=B[1])
        if fcol: d.ellipse([cx - 1, cy - 2, cx + 4, cy + 3], fill=fcol, outline=OUT); g.spill = fcol
        g.shape = (g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1); return
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st in ("islamic", "steppe", "africa", "americas", "oceania"):
        if st == "oceania":
            d.ellipse([cx - r, cy - r + 2, cx + r, cy + r - 2], fill=C[2], outline=OUT); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=L[2], outline=L[0])
        else:
            T_ = C if st != "americas" else M["blackware"]
            g.disc(cx, cy, r, C=T_)
            bread = {"africa": (150, 120, 100), "americas": (226, 206, 120)}.get(st, (214, 176, 116))
            d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=bread, outline=tone(bread, -50))
            if st == "africa":
                for dx, dy, kc in ((-3, -3, (170, 60, 30)), (3, -2, (200, 160, 60)), (0, 3, (90, 110, 50))): d.ellipse([cx + dx - 2, cy + dy - 2, cx + dx + 2, cy + dy + 2], fill=kc)
            else:
                for k in range(4): d.point((cx - 3 + k * 2, cy - 2 + (k % 2) * 3), fill=tone(bread, -40))
            if g.b and st in ("islamic", "steppe"): d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=A[3])
    else:
        Bd = C if g.b else M["treen"]
        if g.b == 0: d.rectangle([g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1], fill=Bd[2], outline=OUT); d.line([g.x0 + 2, g.y0 + 2, g.x1 - 2, g.y0 + 2], fill=Bd[4])
        else: g.disc(cx, cy, r, C=Bd); g.pattern(cx, cy, r, g.pat, A)
        bread = {"central": (120, 80, 50), "atlantic": (170, 120, 64), "northern": (150, 110, 70), "mediterranean": (196, 150, 90)}.get(st, (160, 112, 60))
        if g.e >= LN and g.b >= 1:                                                     # from the Long Night the better-off eat off the board itself
            q = r - 3; d.ellipse([cx - q, cy - q + 1, cx + q, cy + q - 1], fill=tone(bread, -44)); d.rectangle([cx + 1, cy + 1, cx + q - 1, cy + q - 2], fill=bread, outline=OUT)
        else:
            q = r - 3; d.rectangle([cx - q, cy - q, cx + q, cy + q], fill=bread, outline=OUT); d.line([cx - q + 1, cy - q + 1, cx + q - 1, cy - q + 1], fill=tone(bread, 34))
            d.ellipse([cx - q + 2, cy - 1, cx + 1, cy + q - 1], fill=tone(bread, -44))              # the gravy soaked in
    if fcol and st != "africa":
        d.ellipse([cx - 2, cy - 3, cx + 3, cy + 1], fill=fcol, outline=OUT); d.point((cx - 1, cy - 2), fill=tone(fcol, 40)); g.spill = fcol
    g.shape = (g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1)


def loaf(g):
    """A loaf from above, the bread of its people: a dark rye round with its slashes in Central Europe, a white
    manchet in the Atlantic lands, a ring of crispbread in the North, a ring loaf in the Mediterranean, a sesame ring
    or flat loaf in the Islamic world, a stamped round of steppe bread, a stack of chapatis in South Asia, steamed
    buns in East Asia, rice wrapped in leaf in Southeast Asia, a ball of kenkey in Africa, tortillas in the Americas,
    a breadfruit in Oceania and bannock in the far north. The poor's bread is darker and smaller; from Mid-Century the
    Atlantic lands, the Americas and Oceania buy a sliced loaf in its paper or plastic wrapper, while the rest of
    Europe keeps its bakers' bread; in Modern it comes home half in the baker's paper bag, in Future Darkness on a
    dark tray."""
    d = g.d; cx, cy = g.cx, g.cy; rx, ry = g.W // 2 - 1, g.H // 2 - 1; bake = g.v.get("bake", "well")
    B = ramp({"pale": (210, 170, 110), "well": (170, 116, 60), "dark": (120, 76, 44)}[bake], 18)
    if g.b == 0: B = ramp(tone(B[2], -26), 16)
    if g.b == 2: B = ramp(tone(B[2], 18), 18)
    g.shadow(cx - rx, cy - ry, cx + rx, cy + ry)
    st = g.style
    if g.e >= MC and st in ("atlantic", "americas", "oceania") and g.b >= 1:            # the sliced loaf in its wrapper, where sliced bread won
        Wr = M["plastic_white"] if g.e >= MO else M["whiteware"]
        if g.e == FD: Wr = ramp(mix(COMPOSITE[2], (200, 200, 210), .3), 12)
        d.rounded_rectangle([cx - rx, cy - ry + 1, cx + rx, cy + ry - 1], 3, fill=Wr[2], outline=OUT)
        for k in range(cx - rx + 3, cx + rx - 2, 3): d.line([k, cy - ry + 2, k, cy + ry - 2], fill=B[3])
        lab = g.L if g.b == 1 else M["enamel_red"]
        d.rectangle([cx - 3, cy - ry + 2, cx + 3, cy + ry - 2], fill=lab[2]); d.rectangle([cx + rx - 3, cy - 2, cx + rx - 1, cy + 2], fill=M["plastic_red"][3] if g.b == 2 else BRASS[3])
        g.shape = (cx - rx, cy - ry, cx + rx, cy + ry); return
    if st in ("central", "atlantic", "polar") or (st == "americas" and g.e >= RE and False):
        if st == "central": B = ramp(tone(B[2], -30), 16)
        if st == "polar": B = ramp(mix(B[2], (200, 190, 160), .4), 14)
        g.disc(cx, cy, rx, ry, C=B)
        if st == "central":
            for k in (-4, 0, 4): d.line([cx + k - 2, cy - ry + 3, cx + k + 2, cy + ry - 3], fill=B[0])
        elif st == "atlantic": d.line([cx - rx + 3, cy, cx + rx - 3, cy], fill=B[4]); d.line([cx, cy - ry + 3, cx, cy + ry - 3], fill=B[4])
        else:
            for dx, dy in ((-3, -2), (2, 1), (-1, 3)): d.rectangle([cx + dx, cy + dy, cx + dx + 1, cy + dy], fill=B[0])
    elif st in ("northern", "mediterranean", "islamic"):
        if st == "islamic" and g.b < 1:                                                  # a flat round
            g.disc(cx, cy, rx, ry, C=ramp((214, 180, 120), 14))
            for k in range(5): d.point((cx - 4 + k * 2, cy - 2 + (k % 2) * 3), fill=(150, 100, 50))
        else:
            C_ = ramp((200, 170, 110), 14) if st == "northern" else B
            g.disc(cx, cy, rx, ry, C=C_)
            hole = max(2, min(rx, ry) // 2 - 1); d.ellipse([cx - hole, cy - hole, cx + hole, cy + hole], fill=tuple(int(c) for c in np.asarray(g.tm.img)[g.y0 + 1, g.x0 + 1]) if False else C_[0], outline=OUT)
            if st == "northern":
                for k in range(8): a = k * math.pi / 4; d.point((cx + math.cos(a) * (hole + 3), cy + math.sin(a) * (hole + 2)), fill=C_[0])
            if st == "islamic":
                for k in range(10): a = k * math.pi / 5; d.point((cx + math.cos(a) * (hole + 2), cy + math.sin(a) * (hole + 2)), fill=(240, 226, 180))
    elif st == "steppe":
        C_ = ramp((214, 170, 104), 14); g.disc(cx, cy, rx, ry, C=C_)
        d.ellipse([cx - rx // 2, cy - ry // 2, cx + rx // 2, cy + ry // 2], fill=C_[1])
        for k in range(6): a = k * math.pi / 3; d.point((cx + math.cos(a) * 2, cy + math.sin(a) * 2), fill=C_[0])
    elif st in ("southasia", "americas"):
        C_ = ramp((222, 190, 130), 12) if st == "southasia" else ramp((226, 206, 120), 12)
        for k in (2, 1, 0): d.ellipse([cx - rx + k, cy - ry + k, cx + rx - 2 + k, cy + ry - 2 + k], fill=C_[2 + (k == 0)], outline=OUT)
        for dx, dy in ((-3, -2), (2, -1), (0, 2), (-2, 3)): d.rectangle([cx + dx, cy + dy, cx + dx + 1, cy + dy + 1], fill=(130, 80, 40))
    elif st == "eastasia":
        C_ = ramp((236, 232, 220), 8)
        br = max(3, min(rx, ry) // 2 + 1)
        for dx, dy in ((-rx + br, -ry + br), (rx - br, -ry + br), (0, ry - br)): g.disc(cx + dx, cy + dy, br, C=C_); d.point((cx + dx, cy + dy), fill=C_[0])
    elif st == "seasia":
        L = ramp((80, 130, 60), 16); d.rounded_rectangle([cx - rx, cy - ry + 1, cx + rx, cy + ry - 1], 3, fill=L[2], outline=OUT)
        d.line([cx - rx + 2, cy, cx + rx - 2, cy], fill=L[0]); d.line([cx - 2, cy - ry + 1, cx - 2, cy + ry - 1], fill=M["bamboo"][1]); d.line([cx + 3, cy - ry + 1, cx + 3, cy + ry - 1], fill=M["bamboo"][1])
    elif st == "africa":
        L = ramp((150, 140, 90), 14); g.disc(cx, cy, min(rx, ry) + 1, C=L)
        d.line([cx - 3, cy - 3, cx + 3, cy + 3], fill=L[0]); d.line([cx - 3, cy + 3, cx + 3, cy - 3], fill=L[0])
    else:                                                                                # oceania: a breadfruit
        Gf = ramp((120, 150, 60), 16); g.disc(cx, cy, min(rx, ry) + 1, C=Gf)
        for k in range(-4, 5, 3):
            for j in range(-4, 5, 3): d.point((cx + k, cy + j), fill=Gf[0])
        d.rectangle([cx - 1, cy - min(rx, ry) - 1, cx, cy - min(rx, ry) + 1], fill=M["darkwood"][2])
    if g.b == 2 and st in EURO: d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 190, 260, fill=(250, 230, 170))   # the glaze
    if g.e == MO:                                                                        # half in the baker's paper bag
        Pb = (226, 214, 190) if g.b else (190, 160, 120)
        d.rectangle([cx - rx, cy - ry, cx - 1, cy + ry], fill=Pb, outline=OUT); d.line([cx - 2, cy - ry + 1, cx - 2, cy + ry - 1], fill=tone(Pb, -30))
        d.rectangle([cx - rx + 2, cy - 2, cx - 4, cy + 1], fill=g.L[2])
    elif g.e == FD: d.rectangle([cx - rx, cy + ry - 2, cx + rx, cy + ry], fill=COMPOSITE[1]); d.line([cx - rx, cy + ry - 2, cx + rx, cy + ry - 2], fill=g.GL[1])   # on a dark tray
    g.shape = (cx - rx, cy - ry, cx + rx, cy + ry)


def cheese(g):
    """A cheese from above, of its land: a waxed or rinded wheel with a wedge cut in Central and Atlantic Europe, a
    brown whey block in the North, white brined cheese in its dish in the Mediterranean and the Islamic world, dried
    curd balls on a cloth on the steppe, paneer in South Asia, a block of bean curd in East and Southeast Asia, a
    red-rinded wagashi in Africa, fresh white cheese in the Americas, and toasted bread cheese in the far north.
    Mid-Century on, the wheel may be red wax; Modern cheese comes from the shop in cling film with a price label,
    Future Darkness cheese in a sealed tray."""
    d = g.d; cx, cy = g.cx, g.cy; r = min(g.W, g.H) // 2 - 1; st = g.style; kind = g.v.get("cut", "cut")
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st in ("central", "atlantic", "oceania", "americas") or (st == "polar" and False):
        rind = ramp((176, 140, 60), 14) if g.b < 2 else ramp((196, 160, 70), 16)
        if st == "atlantic": rind = ramp((214, 150, 50), 16)
        if st == "americas": rind = ramp((236, 232, 216), 8)
        if g.e >= MC and g.b >= 1 and st in ("central", "atlantic"): rind = ramp((190, 30, 30), 16)       # red wax
        pas = ramp((236, 206, 110), 10) if st != "americas" else ramp((246, 244, 236), 6)
        g.disc(cx, cy, r, C=rind)
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=pas[2])
        if kind == "cut": d.pieslice([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], 10, 70, fill=pas[3], outline=OUT); d.line([cx, cy, cx + r, cy + 2], fill=OUT)
        if st == "central":
            for dx, dy in ((-3, -2), (2, -3), (-1, 3)): d.rectangle([cx + dx, cy + dy, cx + dx + 1, cy + dy + 1], fill=pas[0])
    elif st in ("northern", "southasia", "eastasia", "seasia"):
        C_ = {"northern": ramp((160, 100, 50), 14), "southasia": ramp((240, 236, 222), 6), "eastasia": ramp((236, 234, 218), 6), "seasia": ramp((220, 206, 160), 10)}[st]
        Pl = M[WARE[st][g.b][0]]
        g.disc(cx, cy, r, C=Pl)
        q = r - 3; d.rectangle([cx - q, cy - q + 1, cx + q, cy + q - 1], fill=C_[2], outline=OUT); d.line([cx - q + 1, cy - q + 2, cx + q - 1, cy - q + 2], fill=C_[4])
        if kind == "cut": d.line([cx, cy - q + 1, cx, cy + q - 1], fill=C_[0])
    elif st in ("mediterranean", "islamic"):
        Pl = M[WARE[st][g.b][0]]; g.disc(cx, cy, r, C=Pl)
        d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=ramp((200, 210, 200), 6)[1])          # the brine
        for dx, dy in ((-3, -3), (1, -2), (-2, 1), (2, 2)): d.rectangle([cx + dx, cy + dy, cx + dx + 2, cy + dy + 2], fill=(246, 244, 236), outline=(170, 170, 160))
        g.spill = (200, 210, 200)
    elif st == "steppe":
        Cl = M["paint_orange"] if g.b else M["leather"]
        d.rectangle([g.x0 + 1, g.y0 + 2, g.x1 - 1, g.y1 - 2], fill=Cl[2], outline=OUT)
        for dx, dy in ((-4, -2), (0, -3), (4, -1), (-2, 2), (2, 3)): d.ellipse([cx + dx - 2, cy + dy - 2, cx + dx + 1, cy + dy + 1], fill=(236, 230, 210), outline=(160, 150, 130))
    elif st == "africa":
        C_ = ramp((180, 50, 40), 16); g.disc(cx, cy, r, C=C_); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(240, 230, 210))
    else:                                                                                # polar: toasted bread cheese
        C_ = ramp((236, 214, 160), 10); g.disc(cx, cy, r, C=C_)
        for dx, dy in ((-3, -2), (2, -3), (-1, 2), (3, 2)): d.ellipse([cx + dx - 1, cy + dy - 1, cx + dx + 1, cy + dy + 1], fill=(150, 90, 40))
    if g.b == 2: d.line([g.x1 - 3, g.y0 + 2, g.x1 - 1, g.y1 - 4], fill=M["silver"][3])                    # a cheese knife
    if g.e == MO:                                                                        # shop cheese in cling film with its price label
        d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=(236, 240, 244)); d.line([cx - r + 2, cy - r + 4, cx - r + 5, cy - r + 1], fill=(250, 252, 255))
        d.rectangle([cx + 1, cy + r - 4, cx + r - 1, cy + r - 1], fill=g.L[3], outline=OUT)
    elif g.e == FD:                                                                      # in a sealed dark tray
        d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=g.GL[1]); d.rectangle([cx - r, cy + r - 2, cx + r, cy + r], fill=COMPOSITE[1])
    g.shape = (cx - r, cy - r, cx + r, cy + r)


# ================================================================ drink and smoke
GLASS = {"central": (70, 150, 80), "atlantic": (40, 56, 40), "northern": (130, 70, 30), "mediterranean": (190, 200, 150),
         "islamic": (40, 90, 190), "steppe": (110, 90, 60), "southasia": (200, 140, 40), "eastasia": (220, 222, 214),
         "seasia": (60, 170, 150), "africa": (196, 156, 80), "americas": (160, 70, 110), "oceania": (90, 180, 210), "polar": (160, 170, 190)}


def bottle(g):
    """A bottle laid on its side, seen from above: body, shoulder, neck and stopper. Age of Reason: a squat onion
    bottle of dark glass with a long neck; Victorian: a tall wine bottle or a stoneware ginger-beer bottle; Great War
    and Mid-Century: a brown beer bottle with its paper label and crown cap; Modern: a clear plastic bottle with a
    coloured cap and label; Future Darkness: a slim dark flask with a lit seam. The glass is the region's own: green
    forest glass in Central Europe, black glass in the Atlantic lands, a straw-wrapped flask in the Mediterranean,
    blue in the Islamic world, a white sake flask in East Asia; a gourd in Africa, leather on the steppe. What it
    holds shows through the glass."""
    if g.glob: return _bottle_glob(g)
    d = g.d; st = g.style; liq = g.v.get("contents", "wine")
    x0, x1 = g.x0 + 1, g.x1 - 1; cy = g.cy; ry = g.H // 2 - 1
    Gc = ramp(GLASS[st], 16)
    if g.e >= MO and g.e != FD: Gc = ramp(mix((200, 216, 220), GLASS[st], .3), 12)
    if g.e == FD: Gc = ramp(mix(COMPOSITE[2], GLASS[st], .6), 14)
    opaque = st in ("eastasia", "africa", "steppe", "americas") and g.e < GW
    if opaque: Gc = {"eastasia": M["porcelain"], "africa": M["calabash"], "steppe": M["leather"], "americas": M["clay"]}[st]
    neck = (x1 - x0) // 3 if g.e in (AR, VI) else (x1 - x0) // 4
    if g.e == AR: body = (x0, cy - ry, x0 + (x1 - x0) // 2, cy + ry)
    else: body = (x0, cy - ry, x1 - neck, cy + ry)
    g.shadow(body[0], body[1], x1, body[3], kind="rect")
    nr = max(1, ry // 2)
    d.rectangle([body[2] - 2, cy - nr, x1 - 2, cy + nr], fill=Gc[2], outline=Gc[0])                      # the neck
    stop = {"wine": M["treen"], "spirits": M["treen"], "water": M["treen"], "oil": M["treen"], "beer": M["gold"]}.get(liq, M["treen"])
    if g.e >= GW and g.e < MO: stop = M["gold"] if g.b < 2 else M["silver"]
    if g.e == MO: stop = g.L
    d.rectangle([x1 - 2, cy - nr, x1, cy + nr], fill=stop[2], outline=stop[0])
    if g.e == AR: d.ellipse([body[0], body[1], body[2], body[3]], fill=Gc[2], outline=Gc[0])
    else: d.rounded_rectangle(list(body), max(1, ry // 2), fill=Gc[2], outline=Gc[0])
    lc = LIQ.get(liq if liq != "beer" else "ale")
    if lc and not opaque and g.e != FD:                                                   # the liquid lies along the bottom
        d.line([body[0] + 2, body[3] - 1, body[2] - 2, body[3] - 1], fill=mix(lc, Gc[2], .3))
    d.line([body[0] + 2, body[1] + 1, body[2] - 3, body[1] + 1], fill=Gc[4])                  # the glint along it
    if st == "mediterranean" and g.e < MO:                                                 # the straw wrapping
        Sw = ramp((206, 176, 100), 12); d.rectangle([body[0], body[1], body[0] + (body[2] - body[0]) // 2, body[3]], fill=Sw[2], outline=OUT)
        for k in range(body[0] + 2, body[0] + (body[2] - body[0]) // 2, 2): d.line([k, body[1] + 1, k, body[3] - 1], fill=Sw[1])
    lb = g.L if g.e >= MC else (g.A or M["whiteware"])                          # a label or a wax seal
    if g.b == 0 and g.e < MC: lb = M["linen"]
    lx = (body[0] + body[2]) // 2 + (2 if g.b == 2 else 0); lw = 3 if g.b < 2 else 4
    if g.b or g.e >= GW: d.rectangle([lx - lw, body[1] + 1, lx + lw - 1, body[3] - 1], fill=lb[2])
    else: d.line([lx - 3, body[1] + 1, lx - 3, body[3] - 1], fill=M["leather"][1]); d.line([lx - 2, body[1] + 1, lx - 2, body[3] - 1], fill=M["leather"][3])
    if g.e == FD: d.line([body[0] + 1, cy, x1 - 1, cy], fill=g.GL[1])
    if opaque and st == "eastasia" and g.b: d.line([body[0] + 3, cy - 1, body[2] - 3, cy + 1], fill=M["glaze_cobalt"][2])
    g.spill = lc; g.shape = (x0, cy - ry, x1, cy + ry)


def wineglass(g):
    """A wine glass from above: a thin bright rim round the wine, the foot showing as a pale ring to one side.
    Renaissance: a Venetian glass with a gilt rim; Age of Reason: a plain lead-crystal glass; Victorian: cut crystal
    with its facets; Great War and Mid-Century: a pressed or stemmed glass; Modern: a plain wide glass; Future
    Darkness: a dark glass with a lit rim. The rich in some lands drink from silver or gilt goblets; the glass is
    tinted in its region's way (ruby in Central Europe, green in the North, blue in the Islamic world). From 1919
    machine-made glasses are the same everywhere and vary by model (coupe, flute, tumbler, tinted goblet, cut tumbler,
    smoked glass) and what is in them; Modern ones add stemless and big-bowled glasses."""
    if g.glob: return _wineglass_glob(g)
    d = g.d; st = g.style; liq = g.v.get("contents", "wine")
    r = min(g.W, g.H) // 2; cx, cy = g.cx, g.cy
    Gc = ramp(mix((210, 226, 230), GLASS[st], .85), 14)
    if g.e == FD: Gc = ramp(mix(COMPOSITE[2], GLASS[st], .8), 14)
    metal = g.b == 2 and st not in EUF and st != "americas"
    if metal: Gc = g.C
    g.shadow(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, off=2, f=.75)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Gc[1] if not metal else Gc[2], outline=Gc[0] if not metal else OUT)
    lc = LIQ.get({"red": "wine", "white": "oil"}.get(liq, liq)) if liq != "white" else (226, 210, 120)
    lr = r - 2
    if lc: d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=lc)
    else: d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=Gc[3])
    rim = M["gold"][3] if (g.e == RE or g.w == 5) else Gc[4]
    d.arc([cx - r, cy - r, cx + r, cy + r], 160, 300, fill=rim)
    if g.e == VI and not metal:
        for k in range(6): a = k * math.pi / 3; d.point((cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)), fill=(250, 250, 255))
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 160, fill=g.GL[2])
    d.point((cx - lr + 1, cy - lr + 1), fill=(255, 255, 255)); g.spill = lc
    g.shape = (cx - r, cy - r, cx + r, cy + r)


def _wineglass_glob(g):
    d = g.d; liq = g.v.get("contents", "red"); k = _mi(g); R = min(g.W, g.H) // 2; cx, cy = g.cx, g.cy
    tint = {MC: [(210, 226, 230), (220, 230, 220), (210, 226, 230), (120, 160, 80), (226, 234, 238), (150, 110, 70)],
            MO: [(220, 232, 236), (226, 236, 240), (200, 220, 226), (90, 130, 200), (236, 240, 244), (90, 90, 96)],
            FD: [(70, 76, 90), (210, 222, 230), (60, 64, 72), (110, 60, 120), (200, 214, 224), (40, 44, 50)]}[g.e][k]
    Gc = ramp(tint, 14); r = [R, R - 3, R - 1, R - 1, R - 1, R][k]
    lc = LIQ.get({"red": "wine", "white": "oil"}.get(liq, liq)) if liq != "white" else (226, 210, 120)
    if k == 1 and liq != "empty": lc = (236, 214, 130)                                # a flute of sparkling wine
    un = g.v.get("under", "none")                                                   # a paper napkin or a cork or silver coaster
    if un == "napkin": d.rectangle([g.x0, g.y0, g.x1 - 1, g.y1 - 1], fill=_pk(g, [WHITEP, REDP, BLUEP, YELLOWP], "nap")[3], outline=OUT)
    elif un == "coaster": d.ellipse([g.x0, g.y0, g.x1 - 1, g.y1 - 1], fill=(_R((170, 130, 80), 12) if g.w < 5 else M["silver"])[2], outline=OUT)
    r = min(r, R - 2) if un != "none" else r
    g.shadow(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, off=2, f=.75)
    sq = k in (2, 4) if g.e != MO else k in (3, 5)                                   # Modern: stemless glasses and big-bowled ones swap in
    if not sq and not (g.e == MO and k in (0, 2)): d.ellipse([cx - R + 1, cy - R + 1, cx + R - 1, cy + R - 1], outline=Gc[3])   # the foot below
    if sq: d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=Gc[1], outline=Gc[0])   # tumblers, square-cut
    else: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=Gc[1], outline=Gc[0])
    lr = r - 1 if g.e != MO else r - 3
    if g.e == MO: d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=Gc[4])   # a thin bright modern rim
    if lc: d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=mix(lc, tint, .15))
    else: d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=Gc[3])
    if k == 4:
        for a in range(0, 360, 45): d.point((cx + math.cos(math.radians(a)) * (r - 1), cy + math.sin(math.radians(a)) * (r - 1)), fill=(250, 250, 255))
        if liq != "empty": d.rectangle([cx - 1, cy - 2, cx + 1, cy], fill=(236, 246, 250))      # an ice cube
    d.arc([cx - r, cy - r, cx + r, cy + r], 160, 300, fill=Gc[4] if g.w < 5 else M["gold"][3])
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 160, fill=g.GL[2])
    d.point((cx - lr + 1, cy - lr + 1), fill=(255, 255, 255)); g.spill = lc
    g.shape = (cx - R, cy - R, cx + R, cy + R)


def teapot(g):
    """A tea service from above on its tray: the pot with spout and handle and two cups, in its people's way. Europe:
    a porcelain or silver pot with cups on saucers (a brown earthenware pot for the poor, printed china later, a
    steel pot and mugs in Modern); the Islamic world: a silver Moroccan pot with two tea glasses of mint tea; the
    steppe: a kettle-pot and broad piala bowls; South Asia: a steel kettle and clay kulhads of chai; East Asia: a
    brown clay pot with a side handle and tiny handleless cups on a bamboo tray; Southeast Asia: a celadon pot and
    cups; Africa: an enamel pot and small glasses for strong sweet tea; the Americas: a mate gourd with its silver
    straw beside a kettle; Oceania: a billy and enamel mugs; the far north: a pot with tea glasses in holders."""
    d = g.d; st = g.style; C = g.hard(); A = g.A or C
    tray = M["silver"] if g.b == 2 else (M["brass"] if st in ("islamic", "southasia", "africa") else (M["bamboo"] if st in ("eastasia", "seasia") else M["darkwood"]))
    if st in EUF and g.b < 2: tray = M["treen"] if g.b == 0 else M["lacq_black"]
    if g.e == FD: tray = COMPOSITE
    g.shadow(g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1, kind="rect")
    if st in ("islamic", "steppe", "africa") or g.b == 2: d.ellipse([g.x0, g.y0, g.x1, g.y1], fill=tray[2], outline=OUT); d.arc([g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1], 170, 280, fill=tray[4])
    else: d.rounded_rectangle([g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1], 2, fill=tray[2], outline=OUT); d.line([g.x0 + 2, g.y0 + 2, g.x1 - 2, g.y0 + 2], fill=tray[4])
    if st in ("eastasia", "seasia") and g.b < 2:
        for k in range(g.x0 + 3, g.x1 - 2, 3): d.line([k, g.y0 + 2, k, g.y1 - 2], fill=tray[1])
    r = min(g.W // 2, g.H) // 2 - 1; px_, py_ = g.x0 + 4 + r, g.cy
    if st == "americas" and g.trad:                                                         # mate gourd and its bombilla
        mr = r - 1; g.disc(px_, py_, mr, C=M["calabash"] if g.b < 2 else M["silver"])
        d.ellipse([px_ - mr + 3, py_ - mr + 3, px_ + mr - 3, py_ + mr - 3], fill=(90, 130, 50))
        d.line([px_, py_, px_ + mr + 2, py_ - mr - 1], fill=M["silver"][3], width=1)
    else:
        if st in EUF or st in ("africa", "polar", "southasia", "oceania"):
            d.polygon([(px_ - r + 1, py_ - 1), (g.x0 + 1, py_ - 3), (px_ - r + 1, py_ + 2)], fill=C[2], outline=OUT)
        if st == "eastasia":
            d.line([px_, py_ + r - 1, px_ + 1, g.y1 - 2], fill=OUT, width=3); d.line([px_, py_ + r - 1, px_ + 1, g.y1 - 2], fill=C[3])
            d.polygon([(px_ - r + 1, py_ - 1), (g.x0 + 2, py_ - 3), (px_ - r + 1, py_ + 2)], fill=C[2], outline=OUT)
        elif st == "islamic":
            d.line([px_ - r + 1, py_, g.x0 + 1, py_ - 4], fill=OUT, width=3); d.line([px_ - r + 1, py_, g.x0 + 1, py_ - 4], fill=M["silver"][3])
        if st not in ("eastasia",): d.rectangle([px_ + r - 1, py_ - 2, px_ + r + 3, py_ + 2], fill=C[1], outline=OUT)
        PC = M["silver"] if st == "islamic" and g.b >= 1 else C
        if st == "eastasia" and g.b < 2: PC = M["stoneware"]
        g.disc(px_, py_, r, C=PC); g.pattern(px_, py_, r, g.pat, A)
        lr = max(2, r // 2); d.ellipse([px_ - lr, py_ - lr, px_ + lr, py_ + lr], fill=PC[3], outline=PC[0])
        d.rectangle([px_ - 1, py_ - 1, px_, py_], fill=PC[4] if st != "islamic" else M["silver"][4])
    # two cups or glasses
    cr = max(2, min(g.H // 4, (g.x1 - (px_ + r + 4)) // 2) - 1)
    drink = {"islamic": (130, 150, 50), "southasia": (190, 140, 90), "africa": (110, 50, 20), "steppe": (200, 170, 130)}.get(st, LIQ["tea"])
    if st == "americas" and g.trad: drink = (90, 130, 50)
    for k, cyy in enumerate((g.y0 + 2 + cr, g.y1 - 2 - cr)):
        ccx = g.x1 - 2 - cr - (k * 2)
        if st in ("islamic", "africa", "polar"):
            d.ellipse([ccx - cr, cyy - cr, ccx + cr, cyy + cr], fill=M["glass"][3], outline=M["silver"][1] if st == "polar" else M["glass"][0])
            d.ellipse([ccx - cr + 1, cyy - cr + 1, ccx + cr - 1, cyy + cr - 1], fill=drink)
        else:
            Cc = C if st not in ("southasia",) else M["clay"]
            if st in EUF and g.e in (AR, VI) and g.b: d.ellipse([ccx - cr - 1, cyy - cr - 1, ccx + cr + 1, cyy + cr + 1], fill=Cc[3], outline=OUT)
            d.ellipse([ccx - cr, cyy - cr, ccx + cr, cyy + cr], fill=Cc[2], outline=OUT)
            d.ellipse([ccx - cr + 2, cyy - cr + 2, ccx + cr - 2, cyy + cr - 2], fill=drink)
            if st in EUF or st == "oceania": d.rectangle([ccx + cr, cyy - 1, ccx + cr + 1, cyy], fill=Cc[1])
    if g.e == FD: d.rectangle([g.x0 + 2, g.y1 - 2, g.x1 - 2, g.y1 - 2], fill=g.GL[1])
    g.spill = drink; g.shape = (g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1)


def samovar(g):
    """A samovar from above: the round urn with its chimney in the middle under a pronged crown, loop handles east
    and west, and the spout with its tap key at the front. Cold, the little teapot sits on the crown; lit, the
    chimney mouth glows with embers and a wisp of smoke drifts off. Age of Reason: a brass urn; Victorian
    and Great War: a Tula samovar of copper, brass or nickel, round, barrel or vase-shaped; Mid-Century and Modern:
    an electric samovar with a flat lid and its cord; Future Darkness: a dark urn with a lit band. In the Islamic
    world a silver Persian samovar with enamel panels; on the steppe a copper one; elsewhere the style's metal."""
    d = g.d; st = g.style; C = g.hard(); A = g.A or C; lit = g.st == "lit"
    if st == "northern" and g.e < FD: C = (M["copper"], M["brass"], M["silver"])[g.b]
    if st == "islamic" and g.b == 2: C = M["silver"]
    r = min(g.W, g.H) // 2 - 3; cx, cy = g.cx, g.cy - 1
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    Hd = C
    for sx in (-1, 1):                                                                    # loop handles east and west
        hx = cx + sx * (r + 2)
        d.rectangle([min(hx, cx + sx * r), cy - 3, max(hx, cx + sx * r), cy - 3], fill=OUT); d.rectangle([min(hx, cx + sx * r), cy + 2, max(hx, cx + sx * r), cy + 2], fill=OUT)
        d.rectangle([hx - 1, cy - 3, hx + 1, cy + 2], fill=Hd[2], outline=OUT)
        if g.e >= VI and g.e != FD: d.line([hx, cy - 2, hx, cy + 1], fill=M["darkwood"][2])   # the wooden grip
    # the spout and its tap at the front
    d.rectangle([cx - 1, cy + r - 2, cx + 1, g.y1 - 2], fill=C[2], outline=OUT); d.point((cx, cy + r), fill=C[4])
    d.rectangle([cx - 3, g.y1 - 4, cx + 3, g.y1 - 3], fill=C[3], outline=OUT)                                         # the tap key
    d.rectangle([cx - 1, g.y1 - 2, cx + 1, g.y1 - 1], fill=C[1], outline=OUT)
    if st in ("central", "steppe") and g.trad:                                             # faceted barrel
        pts = [(cx + math.cos(k * math.pi / 4 + math.pi / 8) * r, cy + math.sin(k * math.pi / 4 + math.pi / 8) * r) for k in range(8)]
        d.polygon(pts, fill=C[2], outline=OUT)
        for k in range(8): d.line([cx + (pts[k][0] - cx) // 2, cy + (pts[k][1] - cy) // 2, pts[k][0], pts[k][1]], fill=C[1])
    else: g.disc(cx, cy, r, C=C)
    if st == "islamic" and g.b:
        for k in range(4): a = k * math.pi / 2 + math.pi / 4; ex, ey = cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2); d.rectangle([ex - 1, ey - 1, ex + 1, ey + 1], fill=A[2])
    elif g.pat != "none" and g.b: d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=A[2])
    cr = max(3, r // 2)
    if g.e >= MC and g.e != FD:                                                           # electric: a flat lid, a knob and the cord
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=C[4], outline=C[0]); d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=BLACK[2])
        d.line([cx + r, cy + 2, g.x1 - 1, g.y1 - 2], fill=OUT)
        d.rectangle([cx + r - 4, cy + r - 5, cx + r - 2, cy + r - 3], fill=(240, 60, 40) if lit else (70, 30, 30), outline=OUT)   # pilot lamp
        if lit:
            g.tm.glow(cx + r - 3, cy + r - 4, 8, power=.2)
            for k in range(3): d.point((cx - 2 + k, cy - cr - 2 - k), fill=(236, 236, 240))   # steam from the lid
    else:
        d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=C[3], outline=C[0])           # the crown, with its prongs
        for a in range(4):
            px_, py_ = cx + round(math.cos(a * math.pi / 2 + math.pi / 4) * cr), cy + round(math.sin(a * math.pi / 2 + math.pi / 4) * cr)
            d.rectangle([px_ - 1, py_ - 1, px_, py_], fill=C[4], outline=OUT)
        hr = max(1, cr // 2)                                                              # the chimney mouth
        d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(24, 18, 16) if not lit else (220, 90, 24), outline=OUT)
        if lit:
            d.point((cx, cy), fill=(255, 230, 140)); d.point((cx - 1, cy), fill=(250, 170, 60))
            g.tm.glow(cx, cy, 22, power=.35)
            for k, (dx, dy) in enumerate(((1, -2), (2, -3), (2, -4), (3, -5), (3, -6))):   # a wisp of smoke drifting off
                d.point((cx + dx, cy - hr + dy), fill=(200, 200, 204) if k % 2 else (170, 170, 176))
        else:
            tp = M[WARE[st][1][0]] if g.b < 2 else M["porcelain"]                         # the teapot set on the crown to keep warm
            ty = cy - cr // 2 - 1
            d.line([cx + 4, ty, cx + 6, ty - 1], fill=OUT, width=2); d.ellipse([cx - 4, ty - 3, cx + 4, ty + 3], fill=tp[2], outline=OUT)
            d.ellipse([cx - 2, ty - 1, cx + 2, ty + 1], fill=tp[3], outline=tp[0]); d.point((cx, ty), fill=tp[4])
            if g.pat != "none": d.arc([cx - 3, ty - 2, cx + 3, ty + 2], 20, 160, fill=A[2])
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=g.GL[1])
    g.spill = LIQ["tea"]; g.shape = (cx - r, cy - r, cx + r, cy + r)


HOOKAH_BASE = {"central": ("glaze_green", "glaze_green"), "atlantic": ("pewter", "pewter"), "northern": ("copper", "copper"),
               "mediterranean": ("maiolica", "maiolica"), "islamic": ("glass", "glass"), "steppe": ("copper", "brass"),
               "southasia": ("brass", "blackware"), "eastasia": ("brass", "brass"), "seasia": ("coconut", "bamboo"),
               "africa": ("calabash", "calabash"), "americas": ("clay", "clay"), "oceania": ("coconut", "coconut"),
               "polar": ("soapstone", "soapstone")}


def hookah(g):
    """A water pipe from above: the round water vase, the stem's metal tray standing clear of it, the clay bowl on top
    with its coals (glowing when lit), and one or two hoses lying loose on the floor to their mouthpieces. The
    tray is brass, copper or steel. Its vase is tinted or clear glass in the
    Islamic world, black bidri inlaid with silver in South Asia (brass for the poor), a brass box-pipe in East Asia, a
    coconut or bamboo in Southeast Asia and Oceania, a gourd in Africa, glazed or painted pottery, pewter, copper or
    soapstone elsewhere. The hose is wrapped in the region's cloth. From 1990 the factory shisha is the same everywhere: a glass
    vase in one of a maker's colours, a steel stem and a plastic hose; Future Darkness ones are darker, with a lit
    band."""
    d = g.d; st = g.style; A = g.A or g.C; lit = g.st == "lit"
    C = M[HOOKAH_BASE[st][min(g.b, 1)]]
    if st == "southasia" and g.b: A = M["silver"]
    if st == "islamic": C = ramp(mix((200, 220, 230), GLASS[st], .6 if g.b < 2 else .3), 14)
    if g.glob:                                                                  # a factory shisha: a coloured glass vase, model by model
        C = ramp([(206, 222, 230), (60, 110, 200), (190, 40, 60), (50, 150, 90), (210, 150, 50), (40, 40, 46)][_mi(g)], 14); A = C
    if g.e == FD: C = ramp(mix(C[2], COMPOSITE[2], .35), 14)
    r = int(min(g.W, g.H) * .36); cx, cy = g.x0 + 1 + r, g.y0 + 1 + r
    hose = ramp(mix(M["leather"][2], g.S[2], .3 + .3 * g.b), 16)               # the cloth-wrapped hose
    if g.glob: hose = g.L                                                       # a plastic hose
    mp = M["ivory"] if g.b else M["treen"]
    def lay(pts, end):                                                         # a hose lying loose on the floor, its mouthpiece at the end
        d.line(pts, fill=OUT, width=3); d.line(pts, fill=hose[2], width=1)
        ex, ey = end; d.rectangle([ex - 2, ey - 1, ex + 2, ey + 1], fill=mp[2], outline=OUT); d.point((ex - 1, ey - 1), fill=mp[4])
    lk = _mi(g, 3)                                                              # how the hose was dropped
    if lk == 0: lay([(cx + r - 1, cy + 1), (g.x1 - 3, cy + 3), (g.x1 - 3, g.y1 - 5), (cx + r - 2, g.y1 - 3)], (cx + r - 4, g.y1 - 3))
    elif lk == 1: lay([(cx + r - 1, cy - 2), (g.x1 - 3, g.y0 + 3), (g.x1 - 2, cy + 2)], (g.x1 - 3, cy + 4))
    else: lay([(cx + r - 1, cy + 2), (g.x1 - 6, g.y1 - 6), (g.x1 - 3, g.y1 - 3)], (g.x1 - 4, g.y1 - 2))
    if g.v.get("hoses") == "two": lay([(cx - 1, cy + r - 1), (cx - 3, g.y1 - 4), (g.x0 + 3, g.y1 - 3)], (g.x0 + 3, g.y1 - 3))   # a second hose for company
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if st == "eastasia" and g.trad:
        d.rounded_rectangle([cx - r, cy - r + 3, cx + r, cy + r - 3], 2, fill=M["brass"][2], outline=OUT); d.line([cx - r + 1, cy - r + 4, cx + r - 1, cy - r + 4], fill=M["brass"][4])
    elif st == "seasia" and g.trad:
        g.disc(cx, cy, r - 2, C=M["bamboo"]); d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], outline=M["bamboo"][0])
    else:                                                                      # the vase holding the water, a shine on its shoulder
        Bc = C; sh = _pk(g, [0, 1, 2], "vase") if g.glob else 0
        if sh == 1:                                                             # a cut-glass vase
            hx = lambda rr: [(cx + math.cos(a * math.pi / 3) * rr, cy + math.sin(a * math.pi / 3) * rr) for a in range(6)]
            d.polygon(hx(r), fill=Bc[2], outline=OUT); d.polygon(hx(r - 2), outline=Bc[3])
        elif sh == 2: d.rounded_rectangle([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 2, fill=Bc[2], outline=OUT); d.rectangle([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=Bc[3])
        else: g.disc(cx, cy, r, C=Bc)
        if g.glob and g.b == 2: d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=GILT[3])   # gilt decoration
        if g.glob and g.b == 0: d.line([cx - r + 2, cy + r - 3, cx + r - 2, cy + r - 3], fill=(240, 240, 240))   # a plain printed band on cheap glass
        if g.e < MC: g.pattern(cx, cy, r, g.pat, A)
        d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 200, 250, fill=(250, 250, 250))
    tr = max(3, r // 2 - (1 if g.glob else 0))                                  # the stem's tray, standing clear of the vase
    d.ellipse([cx - tr - 1, cy - tr - 1, cx + tr + 1, cy + tr + 1], fill=OUT)
    Tr = {"brass": M["brass"], "copper": M["copper"], "steel": M["pewter"]}[g.v.get("tray", "brass")]
    d.ellipse([cx - tr, cy - tr, cx + tr, cy + tr], fill=Tr[2], outline=Tr[0]); d.arc([cx - tr + 1, cy - tr + 1, cx + tr - 1, cy + tr - 1], 190, 280, fill=Tr[4])
    br = max(2, tr - 2)                                                        # the clay bowl with its coals
    d.ellipse([cx - br - 1, cy - br - 1, cx + br + 1, cy + br + 1], fill=OUT)                         # a dark gap: the bowl stands above the tray
    d.ellipse([cx - br, cy - br, cx + br, cy + br], fill=(96, 54, 40), outline=(60, 34, 26))
    d.ellipse([cx - br + 1, cy - br + 1, cx + br - 1, cy + br - 1], fill=(64, 60, 58) if not lit else (220, 80, 20))   # the coals' bed
    coal = ((-1, -1), (1, 0), (-1, 1)) if br > 2 else ((0, 0),)
    for k, (dx, dy) in enumerate(coal):
        box = [cx + dx - 1 + (dx > 0), cy + dy - 1 + (dy > 0), cx + dx + (dx > 0), cy + dy + (dy > 0)]
        if lit: d.rectangle(box, fill=(255, 150 + 40 * (k % 2), 40)); d.point((cx + dx, cy + dy), fill=(255, 240, 170))
        else: d.rectangle(box, fill=(40, 38, 38) if k % 2 else (110, 106, 100))
    if lit: g.tm.glow(cx, cy, 24, power=.5)
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 30, 150, fill=g.GL[1])
    g.spill = (120, 150, 170); g.shape = (cx - r, cy - r, cx + r, cy + r)


# ================================================================ writing, reckoning and money
PAGE = ramp((226, 214, 180), 10)
VELLUM = ramp((222, 204, 160), 10)
INK = (40, 32, 36)


def _lines(g, x0, y0, x1, y1, step=2, col=None, vertical=False):
    col = col or tone(PAGE[1], -60)
    if vertical:
        for x in range(x1, x0, -step): g.d.line([x, y0, x, y1 - (x * 7) % 3], fill=col)
    else:
        for y in range(y0, y1 + 1, step): g.d.line([x0, y, x1 - (y * 5) % 4, y], fill=col)


def _cover(g):
    """A binding's colour: leather, cloth or board in the style's own colour, plainer for the poor."""
    C = g.C
    if g.b == 0 and g.e < MC: C = ramp(mix(M["leather"][2], C[2], .4), 14)
    return C


def book(g):
    """A book from above, closed or lying open. Dark Ages and Long Night: a codex in leather-covered boards with
    corner bosses and clasps (a jewelled treasure binding for the princely); Renaissance: tooled leather with clasps;
    Age of Reason: calf with gilt spine bands; Victorian and Great War: gilt-titled cloth; Mid-Century: a dust jacket;
    Modern: a glossy paperback with its picture; Future Darkness: a dark slate reader with a lit screen. In the
    Islamic world a leather binding with its envelope flap and gilt medallion; in East Asia a thread-stitched book
    with its title slip; in South and Southeast Asia a palm-leaf book between boards; on the steppe a long pecha
    wrapped in cloth; in the Americas a painted screenfold; in Oceania a carved wooden tablet. Open, it shows its
    two pages of writing."""
    d = g.d; st = g.style; C = _cover(g); A = g.A or C; op = g.st == "open"
    x0, y0, x1, y1 = g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1
    if st in ("southasia", "seasia", "steppe") and g.trad:                                # long leaves between boards
        cy = g.cy; h = max(4, (y1 - y0) // 3) + (2 if st == "steppe" else 0)
        y0, y1 = cy - h, cy + h
        g.shadow(x0, y0, x1, y1, kind="rect")
        if st == "steppe" and not op:
            Wr = ramp((220, 170, 40), 14) if g.b < 2 else ramp((200, 60, 40), 14)
            d.rectangle([x0, y0, x1, y1], fill=Wr[2], outline=OUT); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=Wr[4])
            d.line([cx_ := (x0 + x1) // 2, y0, cx_, y1], fill=Wr[0]); g.shape = (x0, y0, x1, y1); return
        d.rectangle([x0, y0, x1, y1], fill=(VELLUM if st != "seasia" else ramp((200, 170, 110), 12))[2], outline=OUT)
        if op: _lines(g, x0 + 2, y0 + 2, x1 - 2, y1 - 2, 2)
        else:
            d.rectangle([x0, y0, x1, y0 + 1], fill=C[2]); d.rectangle([x0, y1 - 1, x1, y1], fill=C[2])
            for k in range(y0 + 3, y1 - 1, 2): d.line([x0 + 1, k, x1 - 1, k], fill=VELLUM[1])
        d.line([(x0 + x1) // 2 - 3, y0, (x0 + x1) // 2 - 3, y1], fill=M["darkline"][2])           # the string through it
        if g.b == 2: d.rectangle([x0 + 1, y0, x1 - 1, y0 + 1], fill=M["gold"][3])
        g.shape = (x0, y0, x1, y1); return
    g.shadow(x0, y0, x1, y1, kind="rect")
    if op:                                                                                # two pages, a gutter, the boards showing
        d.rectangle([x0 - 0, y0, x1, y1], fill=C[1], outline=OUT)
        mx = (x0 + x1) // 2; pg = PAGE if g.e >= RE else VELLUM
        d.rectangle([x0 + 1, y0 + 1, mx - 1, y1 - 1], fill=pg[3]); d.rectangle([mx + 1, y0 + 1, x1 - 1, y1 - 1], fill=pg[2])
        d.line([mx, y0 + 1, mx, y1 - 1], fill=pg[0])
        vert = st == "eastasia"
        _lines(g, x0 + 3, y0 + 3, mx - 2, y1 - 3, 2, vertical=vert); _lines(g, mx + 2, y0 + 3, x1 - 3, y1 - 3, 2, vertical=vert)
        if g.e <= RE and g.b >= 1: d.rectangle([x0 + 3, y0 + 3, x0 + 5, y0 + 5], fill=M["paint_red"][2])        # an illuminated initial
        if g.e == FD: d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=COMPOSITE[1]); d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=mix(g.GL[0], (20, 30, 40), .5)); _lines(g, x0 + 3, y0 + 3, x1 - 3, y1 - 3, 2, col=g.GL[2])
        g.shape = (x0, y0, x1, y1); return
    if g.e == FD and g.b >= 1:                                                            # a slate reader
        d.rounded_rectangle([x0, y0, x1, y1], 2, fill=C[1], outline=OUT); d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 4], fill=mix(g.GL[0], (20, 30, 40), .4))
        _lines(g, x0 + 3, y0 + 3, x1 - 3, y1 - 5, 2, col=g.GL[2]); g.shape = (x0, y0, x1, y1); return
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT)
    d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[4]); d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=PAGE[2])     # page edges east
    d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=PAGE[1])
    d.rectangle([x0, y0, x0 + 2, y1], fill=C[0])                                              # the spine
    if st == "islamic" and g.trad:
        d.polygon([(x1, y0 + 2), (x1 + 0, y1 - 2), (x1 - 4, (y0 + y1) // 2)], fill=C[1], outline=OUT)            # the flap
        d.ellipse([(x0 + x1) // 2 - 3, (y0 + y1) // 2 - 4, (x0 + x1) // 2 + 2, (y0 + y1) // 2 + 4], fill=M["gold"][2] if g.b else C[3], outline=C[0])
    elif st == "eastasia" and g.trad:
        for k in range(y0 + 2, y1 - 1, 3): d.point((x0 + 3, k), fill=PAGE[4])                  # the stitching
        d.rectangle([x1 - 5, y0 + 2, x1 - 3, y0 + 8], fill=PAGE[3], outline=C[0])
    elif st == "americas" and g.trad:
        for k in range(y0 + 3, y1 - 1, 4): d.line([x0 + 3, k, x1 - 2, k], fill=M["darkline"][2])
        d.rectangle([x0 + 4, y0 + 4, x0 + 7, y0 + 7], fill=M["turq"][2]); d.rectangle([x1 - 6, y1 - 7, x1 - 3, y1 - 4], fill=M["paint_red"][2])
    elif st == "oceania" and g.trad:
        for k in range(y0 + 3, y1 - 1, 3): d.line([x0 + 4, k, x1 - 3, k], fill=C[0])
    elif g.e >= MO:                                                                       # paperback: a picture block
        d.rectangle([x0 + 4, y0 + 3, x1 - 3, (y0 + y1) // 2 + 2], fill=A[2]); d.line([x0 + 4, y1 - 4, x1 - 4, y1 - 4], fill=C[4])
    elif g.e in (VI, GW, MC):
        d.rectangle([x0 + 4, y0 + 4, x1 - 4, y0 + 6], fill=M["gold"][3] if g.b else C[4])           # the gilt title
        for k in (y0 + 3, y1 - 4): d.line([x0, k, x0 + 2, k], fill=M["gold"][3])
    elif g.e == AR:
        for k in range(y0 + 3, y1 - 2, 4): d.line([x0, k, x0 + 2, k], fill=M["gold"][3])
        d.rectangle([x0 + 5, y0 + 3, x1 - 3, y1 - 3], outline=C[3])
    else:                                                                                 # boards, bosses and clasps
        Bs = M["gold"] if g.b == 2 else (M["brass"] if g.b == 1 else IRON)
        for bx, by in ((x0 + 4, y0 + 2), (x1 - 3, y0 + 2), (x0 + 4, y1 - 3), (x1 - 3, y1 - 3)): d.rectangle([bx - 1, by - 1, bx, by], fill=Bs[3])
        if g.b >= 1: d.rectangle([x1 - 1, (y0 + y1) // 2 - 3, x1 + 0, (y0 + y1) // 2 + 2], fill=Bs[2])
        if g.b == 2:
            mx, my = (x0 + x1) // 2 + 1, (y0 + y1) // 2
            d.rectangle([mx - 3, my - 3, mx + 3, my + 3], fill=M["gold"][2], outline=M["gold"][0]); d.rectangle([mx - 1, my - 1, mx + 1, my + 1], fill=M["paint_red"][3])
    g.shape = (x0, y0, x1, y1)


def scroll(g):
    """Scrolls from above: either open between their two rollers, the writing showing, or two rolled and tied lying
    side by side. Europe: parchment with turned rollers, tied with ribbon and a hanging seal; the Islamic world: paper
    with silver roller ends; East Asia: a handscroll in brocade with jade ends and its writing in columns; Africa: a
    leather amulet roll; the Americas: painted deerskin. Victorian on, a rolled diploma or map with its leather or
    card tube; Modern, a blueprint; Future Darkness, a rolled sheet screen with a lit line. The paper is tinted in
    the region's way and the ties are its colour."""
    d = g.d; st = g.style; C = g.C; A = g.A or C; op = g.v.get("open", "rolled") != "rolled"
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    paper = VELLUM if g.e <= RE else PAGE
    paper = ramp(mix(paper[2], g.S[2], .7), 10)
    if g.e == MO: paper = ramp(mix((60, 100, 170), g.L[2], .25), 14)                       # a blueprint
    if g.e == FD: paper = ramp(mix(COMPOSITE[2], g.L[2], .55), 12)
    if st == "americas" and g.trad: paper = ramp(mix(M["buff"][2], g.S[2], .3), 12)
    if st == "africa" and g.trad: paper = ramp(mix(M["leather"][2], g.S[2], .3), 12)
    knob = M["darkwood"] if g.b < 2 else (M["gold"] if st not in ("islamic",) else M["silver"])
    if st == "eastasia": knob = M["celadon"]
    g.shadow(x0, y0, x1, y1, kind="rect")
    if op:
        rw = 4
        d.rectangle([x0 + rw - 1, y0 + 1, x1 - rw + 1, y1 - 1], fill=paper[3], outline=paper[0])
        _lines(g, x0 + rw + 2, y0 + 3, x1 - rw - 2, y1 - 3, 2, col=paper[0] if g.e != MO else paper[4], vertical=st == "eastasia")
        for rx in (x0, x1 - rw):
            Rl = C if (st == "eastasia" and g.trad) or g.b == 2 else paper
            d.rectangle([rx, y0 + 1, rx + rw, y1 - 1], fill=Rl[2], outline=OUT); d.line([rx + 1, y0 + 2, rx + 1, y1 - 2], fill=Rl[4])
            d.rectangle([rx + 1, y0, rx + rw - 1, y0 + 1], fill=knob[2]); d.rectangle([rx + 1, y1 - 1, rx + rw - 1, y1], fill=knob[2])
        if g.e == FD: d.line([x0 + rw + 2, (y0 + y1) // 2, x1 - rw - 2, (y0 + y1) // 2], fill=g.GL[2])
        g.shape = (x0, y0, x1, y1); return
    h = (y1 - y0 - 1) // 2
    for k, (ya, yb) in enumerate(((y0, y0 + h), (y0 + h + 1, y1))):
        xa = x0 + (2 if k else 0); xb = x1 - (0 if k else 2)
        Rl = C if st == "eastasia" and g.trad else paper
        d.rounded_rectangle([xa, ya, xb, yb], 2, fill=Rl[2], outline=Rl[0]); d.line([xa + 2, ya + 1, xb - 2, ya + 1], fill=Rl[4])
        if g.trad and g.b: d.rectangle([xb - 1, ya + 1, xb, yb - 1], fill=knob[2]); d.rectangle([xa, ya + 1, xa + 1, yb - 1], fill=knob[2])
        tie = (A if g.b else M["linen"]) if g.e < FD else g.GL
        mx = (xa + xb) // 2 + (3 if k else -3); d.rectangle([mx - 1, ya, mx + 1, yb], fill=tie[2])
        if g.e == FD: d.line([xa + 2, (ya + yb) // 2, xb - 2, (ya + yb) // 2], fill=g.GL[1])
    if g.e <= AR and g.b and st in EUF:                                                   # the hanging seal
        sc = (M["paint_red"], M["glaze_green"], M["brass"])[g.b]
        d.ellipse([(x0 + x1) // 2 - 6, y1 - 4, (x0 + x1) // 2 - 1, y1], fill=sc[2], outline=OUT)
    if g.e >= VI and g.e != FD and g.b >= 1:                                              # the tube
        Tb = M["leather"] if g.e < MC else g.L
        d.rectangle([x0, y0, x0 + 5, y0 + h], fill=Tb[2], outline=OUT); d.line([x0 + 1, y0 + 1, x0 + 1, y0 + h - 1], fill=Tb[4])
    g.shape = (x0, y0, x1, y1)


LETTER_STUFF = {"northern": [(200, 160, 110), (214, 176, 120), (226, 196, 140)], "eastasia": [(236, 232, 214), (240, 236, 222), (246, 240, 226)],
                "southasia": [(200, 176, 110), (214, 190, 120), (226, 200, 130)], "seasia": [(190, 170, 100), (206, 186, 116), (220, 200, 130)],
                "americas": [(150, 130, 100), (170, 150, 116), (190, 170, 130)], "oceania": [(170, 140, 100), (190, 160, 120), (120, 70, 40)],
                "polar": [(180, 150, 110), (200, 170, 130), (220, 196, 160)], "steppe": [(160, 130, 90), (200, 190, 160), (230, 220, 190)],
                "africa": [(214, 200, 160), (222, 210, 170), (230, 216, 176)], "islamic": [(226, 216, 190), (232, 222, 196), (236, 226, 200)],
                # Europe's paper mills: blue-grey German paper, cream laid paper, grey rag paper, white Italian paper
                "mediterranean": [(236, 232, 220), (242, 238, 228), (246, 244, 236)], "central": [(184, 192, 204), (196, 204, 214), (206, 212, 222)],
                "atlantic": [(222, 204, 160), (230, 214, 172), (236, 222, 184)]}
NORTH_PAPER = [(176, 176, 170), (190, 188, 180), (204, 200, 192)]
SEAL = {"central": M["paint_red"], "atlantic": ramp((230, 150, 60), 14), "northern": M["glaze_green"], "mediterranean": ramp((40, 34, 34), 8)}


def _letter_glob(g):
    """Post from Victorian times on: an envelope or card of the kind the post used everywhere, its stamp and mark."""
    d = g.d; x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1; k = _mi(g); mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    kinds = {VI: ["white", "cream", "black-edged", "blue", "pink", "telegram"], GW: ["white", "field", "cream", "telegram", "black-edged", "blue"],
             MC: ["airmail", "manila", "white", "postcard", "telegram", "blue"], MO: ["manila", "window", "postcard", "white", "padded", "red"],
             FD: ["dark", "card", "window", "red", "padded", "manila"]}[g.e]
    kind = kinds[k]
    col = {"white": (240, 238, 230), "cream": (232, 220, 190), "black-edged": (240, 238, 230), "blue": (170, 190, 220), "telegram": (220, 200, 140),
           "field": (200, 190, 150), "airmail": (236, 236, 232), "manila": (214, 176, 110), "postcard": (230, 220, 200), "window": (240, 240, 236),
           "padded": (220, 200, 150), "red": (200, 60, 50), "dark": (60, 64, 74), "card": (200, 204, 214), "pink": (236, 200, 200)}[kind]
    P = ramp(col, 10)
    g.shadow(x0, y0, x1, y1, kind="rect", off=1)
    d.rectangle([x0, y0, x1, y1], fill=P[2], outline=P[0]); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=P[4])
    if kind == "black-edged": d.rectangle([x0, y0, x1, y1], outline=(20, 20, 20)); d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=(20, 20, 20))
    if kind == "airmail":
        for kk in range(x0 + 1, x1, 4): d.line([kk, y0 + 1, kk + 1, y0 + 1], fill=M["paint_red"][2]); d.line([kk + 2, y1 - 1, kk + 3, y1 - 1], fill=M["paint_blue"][2])
    if kind == "window": d.rectangle([x0 + 3, my - 1, mx + 3, y1 - 3], fill=M["glass"][3], outline=P[0])
    if kind == "postcard": d.rectangle([x0 + 1, y0 + 1, mx - 1, y1 - 1], fill=_pk(g, [(90, 150, 200), (200, 120, 60), (90, 160, 90)], "pic"))
    if kind in ("white", "cream", "blue", "black-edged", "field", "red", "pink"): d.line([x0 + 1, y0 + 1, mx, my], fill=P[0]); d.line([x1 - 1, y0 + 1, mx, my], fill=P[0])
    if kind == "padded":
        for kk in range(y0 + 2, y1 - 1, 2): d.line([x0 + 1, kk, x1 - 1, kk], fill=P[1])
    if kind in ("dark", "card"): d.line([x0 + 2, my, x1 - 2, my], fill=g.GL[1])
    elif kind != "telegram":
        stamp = _pk(g, [REDP, BLUEP, GREENP, PINKP, YELLOWP], "stamp")
        d.rectangle([x1 - 5, y0 + 2, x1 - 2, y0 + 5], fill=stamp[2]); d.arc([x1 - 9, y0 + 1, x1 - 4, y0 + 6], 0, 360, fill=INK)
    else: d.rectangle([x0 + 3, y0 + 3, x1 - 3, y0 + 5], fill=(240, 236, 220))         # the printed strip
    _lines(g, x0 + 4, my + 1, x1 - 6, y1 - 2, 2)
    if g.v.get("fold") == "opened":                                                    # slit open, the letter drawn half out
        d.rectangle([x0 + 2, y0 - 0, x1 - 4, my], fill=(244, 242, 234), outline=(150, 146, 130)); _lines(g, x0 + 4, y0 + 2, x1 - 6, my - 1, 2)
    g.shape = (x0, y0, x1, y1)


def letter(g):
    """A letter from above. Dark Ages to Renaissance: folded parchment tied with a thong and sealed in red or green
    wax; Age of Reason: a folded sheet with its address and wax wafer; Victorian and Great War: an envelope with its
    stamp and postmark; Mid-Century: an airmail envelope with its striped border; Modern: a window envelope; Future
    Darkness: a dark card with a lit strip. Before the post each people writes on its own stuff: birch bark in the
    medieval North, washi in East Asia, palm leaf in South and Southeast Asia, bark paper in the Americas, barkcloth
    in Oceania, hide in the far north, felt-wrapped paper on the steppe. Some peoples send it in their own way: palm-
    leaf strips on a cord in South and Southeast Asia, a notched message stick in Oceania, a rolled letter tied with
    a thong in the medieval North and on the steppe, a red goatskin wallet in Africa. In East Asia the writing runs in columns, in
    the Islamic world the letter rides in a silk pouch for the rich. From Victorian times envelopes and stamps are
    the same everywhere and vary by kind (white, manila, airmail, a postcard, a telegram) and stamp."""
    d = g.d; st = g.style; A = g.A or g.C
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    if g.glob: return _letter_glob(g)
    paper = (VELLUM if g.e <= RE else PAGE)
    mat = LETTER_STUFF.get(st)                                                          # what each people wrote on
    if mat: paper = ramp(mat[min(g.b, len(mat) - 1)] if not (st == "northern" and g.e > LN) else NORTH_PAPER[g.b], 10)
    g.shadow(x0, y0, x1, y1, kind="rect", off=1)
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    if st in ("southasia", "seasia"):                                               # palm-leaf strips on their cord
        for k in range(3):
            sy = y0 + 1 + k * (y1 - y0) // 3; d.rounded_rectangle([x0 + k, sy, x1 - 2 + k, sy + (y1 - y0) // 3 - 2], 2, fill=paper[2 + (k % 2)], outline=paper[0])
            d.line([x0 + 3 + k, sy + 2, x1 - 5, sy + 2], fill=INK)
        d.line([mx, y0, mx + 2, y1], fill=(170, 40, 30) if g.b else (150, 120, 70))
        g.shape = (x0, y0, x1, y1); return
    if st == "oceania" and g.e <= AR:                                               # a message stick
        d.rectangle([x0 + 1, my - 2, x1 - 1, my + 2], fill=paper[2], outline=OUT)
        for k in range(x0 + 3, x1 - 2, 2): d.line([k, my - 2, k, my + (1 if k % 4 else 2)], fill=paper[0])
        if g.b: d.rectangle([x0 + 1, my - 2, x0 + 4, my + 2], fill=M["ochre_wood"][2])
        g.shape = (x0, y0, x1, y1); return
    if (st == "northern" and g.e <= LN) or st == "steppe":                         # a rolled letter tied with a thong
        d.rounded_rectangle([x0, my - 4, x1, my + 4], 4, fill=paper[2], outline=OUT); d.line([x0 + 2, my - 3, x1 - 2, my - 3], fill=paper[4])
        d.ellipse([x1 - 6, my - 4, x1, my + 4], fill=paper[1], outline=OUT); d.line([mx, my - 4, mx, my + 4], fill=(150, 40, 30) if g.b else M["leather"][1], width=2)
        g.shape = (x0, my - 4, x1, my + 4); return
    if st == "africa" and g.trad:                                                     # a red goatskin wallet with its flap
        Lw = ramp((150, 50, 40), 14) if g.b else M["leather"]
        d.rectangle([x0, y0 + 1, x1, y1], fill=Lw[2], outline=OUT); d.polygon([(x0, y0 + 1), (x1, y0 + 1), (mx, my + 1)], fill=Lw[1], outline=OUT)
        for k in range(x0 + 2, x1 - 1, 3): d.point((k, y1 - 2), fill=(230, 200, 80) if g.b == 2 else Lw[4])
        g.shape = (x0, y0, x1, y1); return
    if st == "islamic" and g.b == 2 and g.trad:
        d.rounded_rectangle([x0, y0, x1, y1], 3, fill=A[2], outline=OUT); d.line([x0 + 2, y0 + 1, x1 - 2, y0 + 1], fill=A[4])
        d.line([x0 + 3, y0 + 3, x1 - 3, y0 + 3], fill=M["gold"][3]); d.rectangle([(x0 + x1) // 2 - 1, y0 + 3, (x0 + x1) // 2 + 1, y1 - 2], fill=M["gold"][2])
        g.shape = (x0, y0, x1, y1); return
    d.rectangle([x0, y0, x1, y1], fill=paper[2], outline=paper[0]); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=paper[4])
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    if g.e <= RE or (g.e == AR):
        d.line([x0 + 1, my, x1 - 1, my], fill=paper[0])                                   # the fold
        if g.e <= RE: d.rectangle([mx - 1, y0 + 1, mx + 1, y1 - 1], fill=(A if g.b else M["leather"])[2])                  # the tie
        _lines(g, x0 + 3, y0 + 3, x1 - 4, my - 2, 2, vertical=st == "eastasia")
        sc = {0: M["leather"], 1: SEAL.get(st, M["paint_red"]), 2: SEAL.get(st, M["gold"]) if st in EUF else M["gold"]}[g.b]     # the custom of the chancery
        if g.b == 0 and g.e >= AR: sc = SEAL.get(st, M["paint_red"])
        d.ellipse([mx - 2, my - 1, mx + 2, my + 3], fill=sc[2], outline=OUT); d.point((mx - 1, my), fill=sc[4])
    elif g.e in (VI, GW):
        d.line([x0 + 1, y0 + 1, mx, my], fill=paper[0]); d.line([x1 - 1, y0 + 1, mx, my], fill=paper[0])       # the flap
        stamp = M["paint_red"] if g.b < 2 else M["paint_blue"]
        stamp = g.A0
        d.rectangle([x1 - 5, y0 + 2, x1 - 2, y0 + 5], fill=stamp[2]); d.arc([x1 - 9, y0 + 1, x1 - 4, y0 + 6], 0, 360, fill=INK)
        _lines(g, x0 + 4, my + 1, x1 - 6, y1 - 2, 2)
    elif g.e == MC:
        for k in range(x0 + 1, x1, 4): d.line([k, y0 + 1, k + 1, y0 + 1], fill=M["paint_red"][2]); d.line([k + 2, y0 + 1, k + 3, y0 + 1], fill=M["paint_blue"][2])
        for k in range(x0 + 1, x1, 4): d.line([k, y1 - 1, k + 1, y1 - 1], fill=M["paint_red"][2]); d.line([k + 2, y1 - 1, k + 3, y1 - 1], fill=M["paint_blue"][2])
        d.rectangle([x1 - 5, y0 + 3, x1 - 2, y0 + 6], fill=A[2]); _lines(g, x0 + 4, my, x1 - 6, y1 - 3, 2)
    elif g.e == MO:
        d.rectangle([x0 + 3, my - 1, mx + 3, y1 - 3], fill=M["glass"][3], outline=paper[0]); _lines(g, x0 + 4, my, mx + 1, y1 - 4, 2)
        d.rectangle([x1 - 5, y0 + 2, x1 - 2, y0 + 4], fill=A[2])
    else:
        d.line([x0 + 2, my, x1 - 2, my], fill=g.GL[1]); d.rectangle([x1 - 4, y0 + 2, x1 - 2, y0 + 4], fill=g.GL[2])
    g.shape = (x0, y0, x1, y1)


def inkwell(g):
    """Writing things from above: the ink pot and the pen beside it. Dark Ages and Long Night: a horn of ink and a
    goose quill; Renaissance and Age of Reason: a pewter or brass well with its quill (a silver standish with ink and
    sand pots for the rich); Victorian: a glass well and a steel dip pen; Great War and Mid-Century: an ink bottle and
    a fountain pen; Modern: pens in a cup; Future Darkness: a stylus on a dark pad. In the Islamic world a lacquered
    pen box of reed pens; in East Asia an ink stone with its brush and ink stick; in South Asia a brass pot and reed
    pen; in Africa ink in a small gourd with a reed."""
    d = g.d; st = g.style; C = g.C; A = g.A or C
    x0, y0, x1, y1 = g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1
    if st == "eastasia" and g.trad:                                                       # ink stone, ink stick and brush
        S = ramp((60, 62, 70), 12)
        g.shadow(x0, y0, x0 + (x1 - x0) * 2 // 3, y1, kind="rect")
        d.rectangle([x0, y0, x0 + (x1 - x0) * 2 // 3, y1], fill=S[2], outline=OUT); d.line([x0 + 1, y0 + 1, x0 + (x1 - x0) * 2 // 3 - 1, y0 + 1], fill=S[4])
        d.ellipse([x0 + 2, y0 + 2, x0 + (x1 - x0) * 2 // 3 - 2, y0 + (y1 - y0) // 2], fill=(14, 12, 16))
        bx = x1 - 2; d.line([bx, y0 + 1, bx, y1 - 3], fill=M["bamboo"][2] if g.b < 2 else C[2], width=2); d.line([bx, y1 - 3, bx, y1], fill=INK, width=2)
        d.rectangle([bx - 4, y0 + 2, bx - 3, y0 + 7], fill=(30, 26, 28) if g.b < 2 else M["gold"][2])
        g.shape = (x0, y0, x1, y1); return
    if st == "islamic" and g.trad:                                                        # qalamdan pen box and its inkpot
        g.shadow(x0, y0, x1, y1, kind="rect")
        d.rectangle([x0, y0, x1, y1], fill=g.S[2], outline=g.S[0])
        d.rounded_rectangle([x0 + 1, y0 + 1, x1 - 1, y0 + 5], 2, fill=C[2], outline=OUT); d.line([x0 + 3, y0 + 2, x1 - 3, y0 + 2], fill=C[4])
        for k in range(x0 + 3, x1 - 2, 3): d.point((k, y0 + 4), fill=A[3])
        d.ellipse([x0 + 1, y1 - 6, x0 + 6, y1 - 1], fill=M["brass"][2], outline=OUT); d.rectangle([x0 + 3, y1 - 4, x0 + 4, y1 - 3], fill=INK)
        d.line([x0 + 8, y1 - 2, x1 - 1, y1 - 4], fill=M["bamboo"][0], width=1)
        g.shape = (x0, y0, x1, y1); return
    g.shadow(x0, y0, x1, y1, kind="rect")
    Tr = ramp(mix(PAGE[2], g.S[2], .6), 10) if g.b == 0 else g.S                         # a sheet, or a baize-lined tray
    d.rectangle([x0, y0, x1, y1], fill=Tr[2], outline=Tr[0]); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=Tr[4])
    if g.b == 2: d.rectangle([x0, y0, x1, y1], outline=C[3])
    r = min(x1 - x0, y1 - y0) // 2 - 1; cx, cy = x0 + r + 1, y0 + r + 1
    if g.e <= LN or (st == "africa" and g.trad):                                          # a horn or gourd of ink
        Hn = M["calabash"] if st == "africa" else (M["leather"] if g.b < 2 else M["ivory"])
        g.disc(cx, cy, r, C=Hn)
    elif g.e in (RE, AR):
        Mt = (M["pewter"], M["brass"], M["silver"])[g.b]
        if g.b == 2:                                                                       # the sand pot of a standish
            d.ellipse([x1 - 6, cy - 2, x1 - 2, cy + 2], fill=Mt[3], outline=OUT); d.point((x1 - 4, cy), fill=(200, 180, 130))
        g.disc(cx, cy, r, C=Mt)
    elif g.e == VI:
        g.disc(cx, cy, r, C=ramp(mix((200, 220, 226), C[2], .3), 12), out=M["glass"][0])
    elif g.e in (GW, MC):
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=ramp(mix((60, 70, 90), C[2], .4), 12)[2], outline=OUT)
        d.rectangle([cx - r + 2, cy - r + 2, cx + r - 2, cy - r + 3], fill=A[3])
    elif g.e == MO:
        g.disc(cx, cy, r, C=C)                                                             # a pen cup
        for k, pc in enumerate((M["paint_blue"], M["paint_red"], M["plastic_eastasia"])):
            d.rectangle([cx - 3 + k * 2, cy - 2 + (k % 2), cx - 2 + k * 2, cy - 1 + (k % 2)], fill=pc[3])
    else:
        d.rounded_rectangle([x0, y0 + 1, x1, y1 - 1], 2, fill=C[1], outline=OUT); d.line([x0 + 2, y1 - 2, x1 - 2, y1 - 2], fill=g.GL[1])
    if g.e < MO:
        ir = max(1, r - 2); d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=INK); d.point((cx - ir + 1, cy - ir + 1), fill=(120, 120, 150))
    # the pen
    if g.e == FD: d.line([cx + r + 1, y1 - 2, x1 - 1, y0 + 2], fill=g.GL[2], width=1)
    elif g.e <= AR or (st in ("africa", "southasia", "steppe") and g.trad):
        Fq = ramp((236, 232, 220), 8) if st in EUF or g.e >= RE else M["bamboo"]
        d.line([cx + 1, cy, x1 - 1, y0 + 1], fill=Fq[0], width=1); d.polygon([(x1 - 1, y0), (x1, y0 + 2), (cx + r, cy - 1), (cx + r - 1, cy - 2)], fill=Fq[3])
    elif g.e < MO:
        pc = M["plastic_eastasia"] if g.e >= GW else M["darkwood"]
        if g.b == 2: pc = M["gold"]
        d.line([cx + r + 1, y1 - 1, x1 - 1, y0 + 2], fill=OUT, width=2); d.line([cx + r + 1, y1 - 2, x1 - 2, y0 + 2], fill=pc[3])
    g.spill = INK; g.shape = (x0, y0, x1, y1)


LEDGER_SKIN = {"central": [(200, 180, 150), (214, 190, 150), (226, 206, 170)], "atlantic": [(130, 84, 50), (150, 96, 56), (110, 60, 40)],
               "northern": [(90, 86, 80), (120, 100, 80), (70, 70, 76)], "mediterranean": [(150, 60, 40), (170, 50, 40), (130, 30, 40)],
               "americas": [(160, 110, 70), (120, 80, 50), (90, 40, 40)], "islamic": [(130, 80, 50), (110, 60, 40), (40, 90, 70)],
               "steppe": [(180, 150, 110), (200, 170, 120), (220, 196, 150)], "polar": [(200, 190, 160), (190, 170, 130), (226, 216, 190)],
               "oceania": [(150, 110, 70), (170, 120, 70), (120, 70, 40)], "africa": [(160, 120, 70), (140, 90, 50), (120, 60, 40)]}


def ledger(g):
    """An account book from above, closed or lying open on its ruled columns. Long Night and Renaissance: a tall book
    in limp vellum with its flap and long stitches; Age of Reason: half-bound in calf with marbled boards; Victorian
    and Great War: a tall ledger with leather spine and corners on cloth; Mid-Century: a cloth-bound account book;
    Modern: a ring binder; Future Darkness: a dark slate with lit columns. Each land binds in its own skin: pigskin in
    Central Europe, brown calf in the Atlantic lands, sealskin and birch boards in the North, red goatskin in the
    Mediterranean. Elsewhere accounts take their own forms: the red cloth bahi-khata tied with cord in South Asia, a
    thick stitched account book in East Asia, a long daftar in its leather flap in the Islamic world, palm-leaf strips
    in Southeast Asia, bundles of notched tally sticks on the steppe, in Africa and the far north, knotted record cords (the
    Andean quipu, plain fibre cords in Oceania)."""
    d = g.d; st = g.style; C = _cover(g); A = g.A or C; op = g.st == "open"
    x0, y0, x1, y1 = g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1
    g.shadow(x0, y0, x1, y1, kind="rect")
    lea = LEDGER_SKIN.get(st)
    if lea and g.e < MO: C = ramp(lea[g.b], 14)                                       # each trade's own skin or cloth
    if not op and (g.trad or g.e <= RE) and st in ("southasia", "eastasia", "islamic", "steppe", "polar", "oceania", "africa", "seasia", "americas"):
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2
        if st in ("americas", "oceania"):                                                    # knotted record cords: quipu, or plain fibre in Oceania
            d.line([x0 + 1, y0 + 2, x1 - 1, y0 + 2], fill=C[1], width=2)
            cols = [(200, 60, 40), (230, 200, 90), (60, 90, 150), (240, 236, 220), (120, 80, 50)] if st == "americas" else [(196, 170, 110), (170, 140, 90)]
            for k, xx in enumerate(range(x0 + 2, x1 - 1, 2)):
                c = cols[(k + g.b) % len(cols)]; ln = y1 - 1 - (k * 3 % 5)
                d.line([xx, y0 + 3, xx, ln], fill=c)
                for yy in range(y0 + 5 + k % 3, ln - 1, 4): d.point((xx, yy), fill=OUT)
        elif st in ("steppe", "polar", "africa"):                                 # a bundle of notched tally sticks
            for k in range(3 + g.b):
                sx = x0 + 2 + k * 3; d.rectangle([sx, y0 + 1, sx + 2, y1 - 1], fill=C[2 + (k % 2)], outline=OUT)
                for yy in range(y0 + 3, y1 - 2, 3): d.point((sx + 1, yy), fill=C[0])
            d.line([x0 + 1, my, x0 + 4 + (3 + g.b) * 3, my], fill=(170, 40, 30) if g.b else M["leather"][1], width=2)
        elif st == "seasia":                                                             # palm-leaf strips on their cords
            for k in range(4): d.rounded_rectangle([x0 + 1, y0 + 1 + k * (y1 - y0) // 4, x1 - 1, y0 + (k + 1) * (y1 - y0) // 4 - 1], 2, fill=(210, 186, 120) if k % 2 else (196, 170, 104), outline=OUT)
            d.line([x0 + 4, y0, x0 + 4, y1], fill=(150, 40, 30)); d.line([x1 - 4, y0, x1 - 4, y1], fill=(150, 40, 30))
        elif st == "southasia":                                                          # the red cloth bahi-khata tied with its cord
            d.rectangle([x0, y0 + 2, x1, y1 - 2], fill=REDP[2], outline=OUT); d.line([x0, my, x1, my], fill=(240, 220, 120), width=2)
            d.rectangle([mx - 2, y0 + 4, mx + 2, y0 + 7], fill=(240, 220, 120) if g.b else (250, 250, 240))
        elif st == "eastasia":                                                           # a thick stitched account book
            d.rectangle([x0, y0, x1, y1], fill=(220, 200, 130) if g.b < 2 else (70, 80, 120), outline=OUT)
            for yy in range(y0 + 2, y1 - 1, 3): d.point((x0 + 2, yy), fill=OUT)
            d.rectangle([mx - 2, y0 + 3, mx + 3, y1 - 3], fill=(244, 240, 226)); _lines(g, mx - 1, y0 + 5, mx + 2, y1 - 5, 2, vertical=True)
        else:                                                                            # a long daftar in its leather flap
            d.rectangle([x0 + 3, y0, x1 - 3, y1], fill=C[2], outline=OUT); d.polygon([(x0 + 3, y1 - 6), (x1 - 3, y1 - 6), (mx, y1 + 1)], fill=C[1], outline=OUT)
            if g.b: d.rectangle([mx - 2, y0 + 3, mx + 2, y0 + 6], fill=M["gold"][3])
        g.shape = (x0, y0, x1, y1); return
    if op:
        d.rectangle([x0, y0, x1, y1], fill=C[1], outline=OUT); mx = (x0 + x1) // 2
        pg = PAGE if g.e < FD else ramp(mix(COMPOSITE[2], g.GL[0], .3), 10)
        d.rectangle([x0 + 1, y0 + 1, mx - 1, y1 - 1], fill=pg[3]); d.rectangle([mx + 1, y0 + 1, x1 - 1, y1 - 1], fill=pg[2])
        for k in range(y0 + 3, y1 - 1, 2): d.line([x0 + 1, k, x1 - 1, k], fill=pg[1] if g.e < FD else g.GL[0])
        for cxx in (mx - 4, mx - 2, x1 - 4, x1 - 2): d.line([cxx, y0 + 1, cxx, y1 - 1], fill=M["paint_red"][3] if g.e < FD else g.GL[2])
        d.line([mx, y0 + 1, mx, y1 - 1], fill=OUT); g.shape = (x0, y0, x1, y1); return
    if g.e >= MO and g.e != FD or (g.e == FD and g.b < 1):                                # ring binder
        d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT); d.rectangle([x0, y0, x0 + 3, y1], fill=C[0])
        d.rectangle([x0 + 6, y0 + 4, x1 - 3, y0 + 9], fill=PAGE[3], outline=C[0]); g.shape = (x0, y0, x1, y1); return
    if g.e == FD:
        d.rounded_rectangle([x0, y0, x1, y1], 2, fill=C[1], outline=OUT)
        for k in range(y0 + 3, y1 - 2, 3): d.line([x0 + 3, k, x1 - 3, k], fill=g.GL[1])
        g.shape = (x0, y0, x1, y1); return
    d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=C[4])
    d.line([x1 - 1, y0 + 1, x1 - 1, y1 - 1], fill=PAGE[2])
    if g.e <= RE:                                                                         # limp vellum, flap and stitches
        Vl = ramp(mix(VELLUM[2], C[2], .35), 10)
        d.rectangle([x0, y0, x1, y1], fill=Vl[2], outline=OUT); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=Vl[4])
        d.polygon([(x1, y0 + 3), (x1, y1 - 3), (x1 - 5, y1 - 6), (x1 - 5, y0 + 6)], fill=Vl[1], outline=OUT)
        for k in range(y0 + 3, y1 - 2, 4): d.line([x0 + 2, k, x0 + 2, k + 2], fill=C[2])
        d.rectangle([x0 + 5, y0 + 4, x1 - 7, y0 + 7], fill=C[2])
    else:
        Lc = M["leather"] if g.b < 2 else M["paint_red"]
        if g.e == AR:
            for k in range(x0 + 4, x1 - 2, 3):
                for j in range(y0 + 3, y1 - 2, 3): d.point((k + (j % 2), j), fill=A[3])
        d.rectangle([x0, y0, x0 + 3, y1], fill=Lc[1])
        for cx_, cy_ in ((x1, y0), (x1, y1)): d.polygon([(cx_, cy_), (cx_ - 4, cy_), (cx_, cy_ + (4 if cy_ == y0 else -4))], fill=Lc[1])
        d.rectangle([(x0 + x1) // 2 - 2, y0 + 4, (x0 + x1) // 2 + 4, y0 + 8], fill=M["gold"][3] if g.b else PAGE[3], outline=Lc[0])
    g.shape = (x0, y0, x1, y1)


def coins(g):
    """Money on a table from above: stacks and a scatter of coins, or a purse for the poor. Copper for the poor,
    silver for the comfortable, gold for the princely. The Islamic world's coins carry a script ring; East Asia's
    are holed cash strung on a cord; Africa reckons in cowrie shells; Oceania in strings of shell discs; the Americas
    before the settlers in cacao beans and copper axe-money. Mid-Century on, banknotes lie under the coins; Modern
    adds a bank card; Future Darkness, credit chips glow."""
    d = g.d; st = g.style; A = g.A or g.C
    Cm = (M["copper"], M["silver"], M["gold"])[g.b]
    x0, y0, x1, y1 = g.x0 + 1, g.y0 + 1, g.x1 - 1, g.y1 - 1
    rng = g.rng; cr = max(2, (x1 - x0) // 7)
    g.shadow(x0 + 1, y0 + 1, x1 - 1, y1 - 1)
    if g.e >= MC and g.e != FD:                                                           # banknotes under them
        Nt = g.S
        d.rectangle([x0, y0, x1 - 2, y1 - 3], fill=Nt[2], outline=Nt[0]); d.rectangle([x0 + 2, y0 + 2, x1 - 4, y1 - 5], outline=Nt[3]); d.ellipse([x0 + 3, y0 + 3, x0 + 6, y0 + 6], fill=Nt[0])
    if g.e == FD and g.b == 2:
        d.rectangle([x0, y0, x1, y1], fill=g.S[1], outline=OUT)
        for k in range(3):
            cx_, cy_ = x0 + 3 + k * (x1 - x0 - 6) // 2, y0 + 3 + (k % 2) * (y1 - y0 - 7)
            d.rounded_rectangle([cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3], 1, fill=g.S[2], outline=OUT); d.line([cx_ - 1, cy_, cx_ + 2, cy_], fill=g.GL[2])
        Nt = ramp(mix(COMPOSITE[2], g.L[2], .5), 12); d.rectangle([x0 + 2, (y0 + y1) // 2 - 1, x1 - 2, (y0 + y1) // 2 + 1], fill=Nt[3])
        g.shape = (x0, y0, x1, y1); return
    if st == "eastasia" and g.trad:                                                       # strings of holed cash
        for k, yy in enumerate((y0 + 4, (y0 + y1) // 2 + 1, y1 - 3)):
            d.line([x0 + 1, yy, x1 - 1, yy], fill=M["paint_red"][2] if g.b else M["linen"][1])
            for xx in range(x0 + 2 + k, x1 - 2, cr * 2 + 1):
                d.ellipse([xx - cr, yy - cr, xx + cr, yy + cr], fill=Cm[2], outline=Cm[0]); d.point((xx, yy), fill=OUT)
        g.shape = (x0, y0, x1, y1); return
    if st == "africa" and g.trad and g.b < 2:                                            # cowries
        for _ in range(9 + 3 * g.b):
            cx_, cy_ = rng.integers(x0 + 2, x1 - 2), rng.integers(y0 + 2, y1 - 2)
            d.ellipse([cx_ - 2, cy_ - 1, cx_ + 2, cy_ + 2], fill=M["shell"][3], outline=M["shell"][0]); d.point((cx_, cy_ + 1), fill=M["shell"][0])
        g.shape = (x0, y0, x1, y1); return
    if st == "oceania" and g.trad:                                                        # shell-disc money on a cord
        pts = [(x0 + 2, y0 + 3), (x1 - 2, y0 + 5), (x1 - 3, y1 - 3), (x0 + 3, y1 - 4)]
        for i in range(4):
            ax, ay = pts[i]; bx, by = pts[(i + 1) % 4]
            for t in np.linspace(0, 1, 5, endpoint=False):
                px_, py_ = ax + (bx - ax) * t, ay + (by - ay) * t
                d.ellipse([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=(M["shell"] if g.b < 2 else M["coral"])[3])
        g.shape = (x0, y0, x1, y1); return
    if st == "americas" and g.trad and g.b < 2 and g.e <= RE:                             # cacao beans
        for _ in range(10):
            cx_, cy_ = rng.integers(x0 + 2, x1 - 2), rng.integers(y0 + 2, y1 - 2)
            d.ellipse([cx_ - 2, cy_ - 1, cx_ + 2, cy_ + 1], fill=(110, 60, 40), outline=OUT)
        g.shape = (x0, y0, x1, y1); return
    if g.e < MC or g.e == FD:                                                             # a counting cloth or a bowl-dish under them
        Cl = g.S
        d.rounded_rectangle([x0, y0 + 1, x1, y1], 2, fill=Cl[2], outline=Cl[0])
        if g.b == 2 or st == "atlantic": 
            for k in range(x0 + 3, x1 - 1, 4): d.line([k, y0 + 2, k, y1 - 1], fill=Cl[1])
    if g.b == 0 and g.e < MO:                                                             # a purse with a few coins out of it
        Pu = ramp(mix(M["leather"][2], g.S[2], .75), 14)
        d.ellipse([x0, y0, x0 + (x1 - x0) * 2 // 3, y1 - 2], fill=Pu[2], outline=OUT); d.line([x0 + 2, y0 + 3, x0 + 6, y0 + 2], fill=Pu[4])
        d.line([x0 + (x1 - x0) // 3 - 2, y0 + 2, x0 + (x1 - x0) // 3 + 2, y0 + 2], fill=Pu[0])
    stacks = (g.b > 0) + (g.b == 2) if g.e < MC else int(g.b == 2 and g.e == MC)
    for k in range(stacks):                                                               # stacks: a rim and a lit face
        sx, sy = x1 - 3 - cr - k * (cr * 2 + 1), y0 + 2 + cr + (k % 2) * 3
        hgt = 1 + g.w // 2
        d.ellipse([sx - cr, sy - cr + hgt, sx + cr, sy + cr + hgt], fill=Cm[0])
        d.rectangle([sx - cr, sy, sx + cr, sy + hgt], fill=Cm[1])
        d.ellipse([sx - cr, sy - cr, sx + cr, sy + cr], fill=Cm[3], outline=Cm[0]); d.point((sx - 1, sy - 1), fill=Cm[4])
        if st == "islamic": d.ellipse([sx - cr + 1, sy - cr + 1, sx + cr - 1, sy + cr - 1], outline=Cm[1])
    slots = [(x0 + cr + k * (2 * cr + 2) + (j % 2) * (cr + 1), y1 - cr - 1 - j * (2 * cr + 1)) for j in range(2) for k in range(4)]
    for k in range(min(len(slots), 1 + g.b if g.e < MC else 1 + (g.b > 0))):                                             # loose coins, each one apart
        cx_, cy_ = slots[(k * 3) % len(slots)]
        if cx_ + cr > x1: continue
        d.ellipse([cx_ - cr, cy_ - cr, cx_ + cr, cy_ + cr], fill=Cm[2], outline=Cm[0]); d.point((cx_ - 1, cy_ - 1), fill=Cm[4])
        if st == "islamic" and cr >= 3: d.point((cx_ + 1, cy_), fill=Cm[0])
    if g.e == MO:                                                                         # a bank card beside them
        if g.b:
            Cd = ramp(g.L[2], 12) if g.b == 1 else ramp((30, 30, 34), 10)
            d.rounded_rectangle([x0, y1 - 5, x0 + 7, y1], 1, fill=Cd[2], outline=OUT); d.rectangle([x0 + 2, y1 - 3, x0 + 3, y1 - 2], fill=M["gold"][3])
    g.shape = (x0, y0, x1, y1)


# ================================================================ kitchen blades, herbs, pastimes
def _blade(g):
    """Blade steel by era: dark iron, bright steel, stainless, a dark ceramic with a lit edge."""
    if g.e == FD: return ramp((50, 54, 62), 12)
    if g.e <= LN: return ramp((120, 124, 132), 16)
    return M["steel"] if g.e < MO else ramp((196, 202, 210), 14)


def _handle(g):
    """A handle of wood, bone, horn or brass in the region's colour; plastic from Mid-Century."""
    base = {0: M["treen"], 1: M["darkwood"], 2: M["ivory"]}[g.b]
    if g.e >= MC and g.e != FD: return g.L if g.b < 2 else ramp(mix(M["darkwood"][2], g.L[2], .6), 14)
    return ramp(mix(base[2], g.S[2], .75), 14)


def _chopped(g, x0, y0, x1, y1):
    """What the blade was cutting, heaped beside it: the region's own food."""
    c = ramp(FOOD[g.style], 16); d = g.d
    for k, (dx, dy) in enumerate(((0, 0), (3, 1), (6, 0), (1, 3), (4, 3), (7, 2))):
        px_, py_ = x0 + dx, y0 + dy
        if px_ + 2 > x1 or py_ + 2 > y1: continue
        d.rectangle([px_, py_, px_ + 2, py_ + 1], fill=c[2 + (k % 2)], outline=c[0])


# what each people cut on: (poor, middling, rich) boards
BOARD = {"central": ((150, 110, 70), (196, 160, 110), (120, 80, 50)), "atlantic": ((170, 130, 80), (200, 170, 120), (226, 222, 214)),
         "northern": ((214, 196, 150), (180, 120, 70), (200, 60, 50)), "mediterranean": ((150, 120, 80), (226, 220, 200), (110, 90, 70)),
         "islamic": ((176, 150, 110), (200, 140, 60), (60, 140, 140)), "steppe": ((130, 100, 70), (170, 120, 70), (190, 60, 50)),
         "southasia": ((80, 130, 60), (110, 150, 70), (200, 160, 60)), "eastasia": ((200, 176, 120), (150, 40, 40), (40, 30, 30)),
         "seasia": ((200, 190, 120), (90, 150, 80), (60, 40, 30)), "africa": ((170, 130, 70), (110, 70, 40), (190, 120, 40)),
         "americas": ((120, 116, 110), (160, 100, 60), (80, 140, 150)), "oceania": ((90, 140, 70), (150, 110, 80), (210, 200, 180)),
         "polar": ((128, 138, 126), (220, 214, 190), (90, 70, 60))}


def _board(g, x0, y0, x1, y1, round_=False):
    """The board, block, leaf or slab the blade lies on, in its people's material."""
    B = ramp(BOARD.get(g.style, BOARD["central"])[g.b], 14)
    if g.e >= MO and g.b == 2: B = ramp(mix(g.L[2], (236, 236, 230), .4), 10)             # a plastic board
    (g.d.ellipse if round_ else g.d.rounded_rectangle)([x0, y0, x1, y1], *(() if round_ else (2,)), fill=B[2], outline=OUT)
    g.d.line([x0 + 2, y0 + 1, x1 - 2, y0 + 1], fill=B[4])
    for k in range(y0 + 3, y1 - 1, 3): g.d.line([x0 + 2, k, x1 - 2, k], fill=B[1])


def knife(g):
    """A kitchen knife from above: blade and handle. Dark Ages and Long Night: a dark iron blade on a wooden or bone
    handle; later bright steel with riveted scales; Modern: stainless with a moulded plastic handle; Future Darkness:
    a dark ceramic blade with a lit edge. The far north's is the crescent ulu; the Americas before the settlers knap
    a black obsidian blade; East Asia's is a broad, square-tipped vegetable knife; the Islamic world's has a curved
    blade; Southeast Asia's a heavy parang; Oceania's a shell or shark-tooth edged blade on wood. It lies on its
    people's board: beech, birch or painted wood in Europe, brass trays and tiles in the Islamic world, a banana leaf
    in South Asia, lacquer or bamboo in East Asia, soapstone in the far north; a plastic board for the better-off
    from Modern."""
    d = g.d; st = g.style; Bl = _blade(g); Hd = _handle(g)
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1; L = x1 - x0
    g.shadow(x0, y0, x1, y1, kind="rect"); _board(g, x0, y0, x1, y1)
    _chopped(g, x0 + L // 2, y1 - 4, x1 - 1, y1 - 1)
    x0, x1 = x0 + 1, x1 - 1; L = x1 - x0
    y1 = y1 - 5; cy = (y0 + y1) // 2
    g.shadow(x0 + 1, cy - 2, x1 - 1, cy + 2, kind="rect", off=1)
    if st == "polar" and g.trad:                                                          # ulu: a crescent and a T handle
        cx = g.cx
        d.pieslice([cx - L // 3, y0 - (y1 - y0) // 2, cx + L // 3, y1], 20, 160, fill=Bl[2], outline=Bl[0])
        d.rectangle([cx - L // 4, y0, cx + L // 4, y0 + 3], fill=Hd[2], outline=OUT); d.line([cx - L // 4 + 1, y0 + 1, cx + L // 4 - 1, y0 + 1], fill=Hd[4])
        g.shape = (x0, y0, x1, y1); return
    if st == "americas" and g.e <= LN: Bl = ramp((40, 40, 50), 10)                           # obsidian
    hl = int(L * .42)
    d.rectangle([x0, cy - 2, x0 + hl, cy + 2], fill=Hd[2], outline=Hd[0]); d.line([x0 + 1, cy - 1, x0 + hl - 1, cy - 1], fill=Hd[4])
    if g.e >= RE and g.e < MO and st in EUF: 
        for rx in (x0 + 3, x0 + hl - 3): d.point((rx, cy), fill=M["brass"][4])
    bx = x0 + hl + 1
    if st == "eastasia":                                                                  # broad, square-tipped
        d.rectangle([bx, cy - 3, x1, cy + 3], fill=Bl[2], outline=Bl[0]); d.line([bx, cy + 3, x1, cy + 3], fill=Bl[4])
    elif st == "islamic":
        d.polygon([(bx, cy - 2), (x1 - 3, cy - 2), (x1, cy - 4), (x1 - 2, cy + 1), (bx, cy + 2)], fill=Bl[2], outline=Bl[0])
    elif st == "seasia":
        d.polygon([(bx, cy - 2), (x1 - 2, cy - 4), (x1, cy - 1), (x1 - 1, cy + 3), (bx, cy + 2)], fill=Bl[2], outline=Bl[0])
    else:
        d.polygon([(bx, cy - 2), (x1 - 4, cy - 2), (x1, cy), (x1 - 4, cy + 2), (bx, cy + 2)], fill=Bl[2], outline=Bl[0])
    d.line([bx + 1, cy + 1, x1 - 4, cy + 1], fill=Bl[4] if g.e != FD else g.GL[2])               # the edge's gleam
    if g.b == 2 and g.e < MC: d.rectangle([bx - 1, cy - 3, bx, cy + 3], fill=M["brass"][3])      # a bolster
    g.shape = (x0, cy - 3, x1, cy + 3)


def cleaver(g):
    """A cleaver from above: a deep square blade on a short stout handle, lying by what it chopped. Iron in the
    Middle Ages, steel later with a hole to hang it by; East Asia's is the broad thin Chinese cleaver; Modern
    stainless with a plastic handle; Future Darkness a dark blade with a lit edge. The handle is wood, horn or brass
    in the region's colour; the chopped heap is the region's food, on its people's board or a round log block."""
    d = g.d; st = g.style; Bl = _blade(g); Hd = _handle(g)
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1; L = x1 - x0
    g.shadow(x0, y0, x1, y1, kind="rect"); _board(g, x0, y0, x1, y1, round_=st in ("central", "steppe", "eastasia", "africa"))   # board or log block
    x0, y0, x1, y1 = x0 + 1, y0 + 1, x1 - 1, y1 - 1; L = x1 - x0
    hl = int(L * .4); by1 = y0 + (y1 - y0) * 3 // 5
    c = ramp(FOOD[st], 16)                                                                # the chopped heap
    d.rounded_rectangle([x0 + hl - 2, by1 - 1, x1, y1], 2, fill=c[2], outline=c[0])
    for k in range(x0 + hl, x1 - 1, 3): d.line([k, by1 + 2, k + 1, y1 - 1], fill=c[1 + (k % 2) * 2])
    g.shadow(x0 + 1, y0 + 1, x1, by1, kind="rect", off=1)
    cy = (y0 + by1) // 2
    d.rectangle([x0, cy - 3, x0 + hl, cy + 2], fill=Hd[2], outline=Hd[0]); d.line([x0 + 1, cy - 2, x0 + hl - 1, cy - 2], fill=Hd[4])
    for rx in (x0 + 3, x0 + hl - 3): d.point((rx, cy), fill=Hd[0])
    by0 = y0 if st == "eastasia" else y0 + 1
    d.rectangle([x0 + hl + 1, by0, x1, by1], fill=Bl[2], outline=Bl[0])
    d.line([x0 + hl + 2, by1 - 1, x1 - 1, by1 - 1], fill=Bl[4] if g.e != FD else g.GL[2]); d.line([x0 + hl + 2, by0 + 1, x1 - 1, by0 + 1], fill=Bl[3])
    if st != "eastasia" and g.e >= RE: d.ellipse([x1 - 4, by0 + 2, x1 - 2, by0 + 4], fill=OUT)
    if g.b == 0: d.rectangle([x0 + hl + 4, by0 + 2, x0 + hl + 7, by0 + 3], fill=ramp((150, 80, 40), 10)[2])     # rust
    g.spill = None; g.shape = (x0, y0, x1, y1)


HERB = {"central": [(90, 120, 80), (110, 140, 90)], "atlantic": [(130, 100, 170), (90, 120, 80)], "northern": [(150, 170, 70), (110, 140, 60)],
        "mediterranean": [(60, 90, 60), (190, 40, 30)], "islamic": [(80, 150, 80), (220, 140, 40)], "steppe": [(160, 170, 160), (130, 140, 120)],
        "southasia": [(60, 110, 40), (200, 40, 30)], "eastasia": [(196, 160, 110), (120, 140, 70)], "seasia": [(190, 200, 120), (90, 160, 80)],
        "africa": [(120, 100, 60), (180, 150, 70)], "americas": [(200, 40, 30), (170, 30, 30)], "oceania": [(150, 130, 100), (90, 140, 70)],
        "polar": [(170, 180, 150), (140, 120, 90)]}


def herbs(g):
    """Bunches of herbs drying from above, stems tied, of the region: sage and thyme in Central Europe, lavender in
    the Atlantic lands, dill in the North, rosemary and red chillies in the Mediterranean, mint and saffron in the
    Islamic world, silver wormwood on the steppe, curry leaves and chillies in South Asia, ginseng roots and leaves
    in East Asia, lemongrass in Southeast Asia, bark and roots in Africa, a red chilli string in the Americas, kava
    root in Oceania, lichen in the far north. Tied with string, or ribbon for the better off; Modern ones in a
    plastic bag; Mid-Century ones drying on a spread newspaper;
    Future Darkness ones under a lit grow-tray."""
    d = g.d; st = g.style; cols = HERB[st]
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    n = 2 + (g.b > 0)
    g.shadow(x0 + 1, y0 + 1, x1, y1, kind="rect", off=1)
    if g.e == FD: d.rectangle([x0, y0, x1, y1], fill=COMPOSITE[1], outline=OUT); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=g.GL[2])
    if g.e == MO: d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=ramp((220, 228, 230), 8)[2], outline=(170, 180, 190))
    if g.e == MC:                                                                         # drying on a spread newspaper
        d.rectangle([x0, y0, x1, y1], fill=(222, 218, 202), outline=(150, 146, 136))
        for xx in range(x0 + 2, x1 - 1, 4):
            for yy in range(y0 + 2, y1 - 1, 2): d.line([xx, yy, xx + 2, yy], fill=(150, 146, 140))
        d.rectangle([x0 + 2, y0 + 1, x1 - 2, y0 + 2], fill=(70, 66, 64))
    h = (y1 - y0) // n
    for k in range(n):
        by0 = y0 + k * h + 1; by1 = by0 + h - 1; cyy = (by0 + by1) // 2; c = ramp(cols[k % 2], 16)
        stem = M["bamboo"][1]
        d.line([x0 + 1, cyy, x0 + (x1 - x0) // 3, cyy], fill=stem, width=1)                 # the stems
        if st == "americas":                                                              # chillies on a string
            for j in range(x0 + (x1 - x0) // 3, x1 - 1, 3): d.ellipse([j, cyy - 2, j + 3, cyy + 1], fill=c[2], outline=c[0])
        else:
            d.polygon([(x0 + (x1 - x0) // 3, cyy - 1), (x1 - 2, by0), (x1, cyy), (x1 - 2, by1), (x0 + (x1 - x0) // 3, cyy + 1)], fill=c[2], outline=c[0])
            for j in range(x0 + (x1 - x0) // 3 + 3, x1 - 2, 3): d.line([j, cyy, j + 2, cyy - 2], fill=c[3]); d.point((j + 1, cyy + 2), fill=c[1])
        tie = g.S if g.b else ramp((170, 150, 110), 10)
        d.rectangle([x0 + (x1 - x0) // 3 - 1, cyy - 2, x0 + (x1 - x0) // 3 + 1, cyy + 2], fill=tie[2])
    g.spill = None; g.shape = (x0, y0, x1, y1)


def pipe(g):
    """A tobacco pipe from above, with its tobacco pouch: a long white clay pipe in Europe (a churchwarden for the
    better off, carved meerschaum for the rich), a briar from the Victorian age; a long chibouk with an amber
    mouthpiece in the Islamic world; a slender kiseru or brass-bowled long pipe in East Asia; a long wooden pipe in
    Africa; a feathered calumet or later a corncob in the Americas; a bone pipe in the far north. The pouch is
    leather or cloth in the region's colour; Mid-Century with a box of matches, Modern rolled beside a plastic
    lighter, Future Darkness an electric pipe and its lit charging puck."""
    d = g.d; st = g.style
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    Pu = g.S                                                                            # the pouch, south-east
    px0 = x0 + (x1 - x0) // 3
    g.shadow(px0, (y0 + y1) // 2 - 1, x1, y1, off=1)
    my = (y0 + y1) // 2
    if g.e == FD:                                                                         # a pouch with a lit charging puck on it
        d.rounded_rectangle([px0, my - 1, x1, y1], 2, fill=Pu[2], outline=Pu[0]); d.line([px0 + 2, my, x1 - 2, my], fill=Pu[4])
        d.ellipse([x1 - 6, my + 1, x1 - 1, y1 - 1], fill=COMPOSITE[1], outline=OUT); d.point((x1 - 4, (my + y1) // 2 + 1), fill=g.GL[2])
    elif g.e == MO:                                                                       # a rolled pouch and a plastic lighter
        d.rounded_rectangle([px0, my - 1, x1 - 5, y1], 3, fill=Pu[1], outline=OUT); d.line([px0 + 2, my + 1, x1 - 7, my + 1], fill=Pu[3])
        Lt = ramp(g.L[2], 12); d.rounded_rectangle([x1 - 3, my - 1, x1, y1], 1, fill=Lt[3], outline=OUT); d.point((x1 - 2, my), fill=NICKEL[3])
    else:
        d.rounded_rectangle([px0, my - 1, x1, y1], 2, fill=Pu[2], outline=Pu[0]); d.line([px0 + 2, my, x1 - 2, my], fill=Pu[4])
        d.line([px0 + 1, my + 2, x1 - 1, my + 2], fill=Pu[0])
        if g.e == MC:                                                                     # a box of matches on the pouch
            Mb = ramp(g.L[2], 12); d.rectangle([x1 - 6, my + 1, x1 - 1, y1 - 1], fill=Mb[3], outline=OUT); d.line([x1 - 5, my + 2, x1 - 2, my + 2], fill=(120, 60, 40))
    stem = {"atlantic": ramp((236, 232, 222), 8), "central": M["darkwood"], "northern": M["birch"], "mediterranean": M["mazer"],
            "islamic": M["darkwood"], "steppe": M["copper"], "southasia": M["brass"], "eastasia": M["bamboo"], "seasia": M["bamboo"],
            "africa": M["ochre_wood"], "americas": M["treen"], "oceania": M["darkwood"], "polar": M["ivory"]}[st]
    if g.e >= VI and st in EUF: stem = M["mazer"] if g.b < 2 else M["ivory"]
    bowl = stem
    if st in ("eastasia", "southasia") or g.b == 2: bowl = M["brass"] if st != "atlantic" else M["ivory"]
    if st == "islamic": bowl = M["terracotta"]
    if st == "americas" and g.e >= AR: bowl = ramp((220, 200, 120), 12)                   # a corncob
    cy = y0 + 2
    d.line([x0 + 3, cy + 1, x1 - 1, cy], fill=stem[0], width=3); d.line([x0 + 3, cy, x1 - 1, cy - 1], fill=stem[3], width=1)
    d.ellipse([x0, cy - 2, x0 + 5, cy + 3], fill=bowl[2], outline=OUT); d.point((x0 + 2, cy), fill=(40, 30, 26))
    if st == "islamic" and g.b: d.rectangle([x1 - 3, cy - 1, x1, cy + 1], fill=ramp((220, 160, 50), 12)[3])   # amber mouthpiece
    if st == "americas" and g.trad and g.b:                                               # feathers on the calumet
        for k in range(3): d.line([x0 + 8 + k * 3, cy + 1, x0 + 7 + k * 3, cy + 5], fill=(240, 240, 236) if k % 2 else (40, 30, 30))
    sp = g.v.get("spill", "none")
    if sp == "ash":                                                                       # knocked-out dottle
        for k in range(3): d.point((x0 + 2 + k, y1 - 1 - k % 2), fill=(90, 86, 82))
        d.rectangle([x0 + 1, y1 - 3, x0 + 4, y1 - 1], fill=(120, 116, 110))
    elif sp == "tobacco":                                                                 # a pinch of shag ready to fill
        for k in range(6): d.point((x0 + 1 + k % 3, y1 - 4 + k // 3 * 2), fill=(130, 84, 40) if k % 2 else (96, 60, 30))
    if g.st == "lit" and g.e != FD:                                                       # an ember in the bowl
        d.point((x0 + 2, cy), fill=(250, 140, 40)); d.point((x0 + 3, cy + 1), fill=(200, 60, 20))
    if g.e == FD:                                                                         # an electric pipe: a lit band and a lit bowl
        d.line([x0 + 6, cy, x1 - 2, cy - 1], fill=g.GL[1]); d.ellipse([x0 + 1, cy - 1, x0 + 4, cy + 2], fill=g.GL[2])
    g.shape = (x0, y0, x1, y1)


def dice(g):
    """Dice and cards from above, on a gaming cloth in the region's colour. Dark Ages: bone dice, knucklebones and a
    leather dice cup; from the Long Night a hand of playing cards fanned beside the dice; Modern: a pack and poker
    chips; Future Darkness: glowing dice. East Asia plays with dominoes or flower cards, the Islamic world and South
    Asia with cowries and long pachisi dice, Africa and Oceania with cast cowries and seeds."""
    d = g.d; st = g.style; S = g.S
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    g.shadow(x0, y0, x1, y1, kind="rect", off=1)
    Cl = S if g.b else ramp(mix(M["linen"][2], S[2], .45), 10)
    d.rectangle([x0, y0, x1, y1], fill=Cl[2], outline=Cl[0])
    if g.b == 2: d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=M["gold"][2])
    Bn = M["ivory"] if g.b else ramp((206, 196, 170), 10)
    def die(x, y, n=3, C=Bn):
        d.rectangle([x, y, x + 4, y + 4], fill=C[3], outline=C[0])
        for (dx, dy) in ((1, 1), (2, 2), (3, 3))[:n]: d.point((x + dx, y + dy), fill=OUT)
    cardgame = g.e >= LN and st in EUF + ("americas", "polar", "islamic")
    if st == "eastasia" and g.e >= LN:                                                     # dominoes or flower cards
        for k in range(3):
            tx = x0 + 3 + k * 5; d.rectangle([tx, y0 + 3, tx + 3, y0 + 9], fill=Bn[3], outline=OUT); d.point((tx + 1, y0 + 5), fill=M["paint_red"][2]); d.point((tx + 2, y0 + 7), fill=OUT)
    elif cardgame:
        back = g.L if g.e >= MC else ramp(mix(PAGE[2], S[2], .3), 10)
        for k in range(3 + g.b):
            cx_ = x0 + 3 + k * 3; d.rectangle([cx_, y0 + 2 + (k % 2), cx_ + 5, y0 + 9 + (k % 2)], fill=PAGE[3] if k < 2 + g.b else back[2], outline=OUT)
            d.point((cx_ + 1, y0 + 3 + (k % 2)), fill=M["paint_red"][2] if k % 2 else OUT)
    else:                                                                                 # knucklebones or cowries
        for k in range(4):
            kx, ky = x0 + 3 + k * 3, y0 + 3 + (k % 2) * 3
            if st in ("africa", "oceania", "southasia", "seasia", "islamic"): d.ellipse([kx - 2, ky - 1, kx + 2, ky + 2], fill=M["shell"][3], outline=M["shell"][0])
            else: d.rectangle([kx - 1, ky - 1, kx + 2, ky + 1], fill=Bn[2], outline=Bn[0])
    die(x1 - 6, y1 - 6, 3); die(x1 - 12, y1 - 5, 2)
    if g.e <= LN and g.b == 1: d.ellipse([x0 + 2, y1 - 6, x0 + 7, y1 - 1], fill=M["leather"][2], outline=OUT); d.ellipse([x0 + 4, y1 - 4, x0 + 5, y1 - 3], fill=OUT)
    if g.e >= MO and g.e != FD:
        for k, cc in enumerate((M["paint_red"], M["paint_blue"], M["white"])): d.ellipse([x0 + 2 + k * 3, y1 - 5, x0 + 5 + k * 3, y1 - 2], fill=cc[2], outline=OUT)
    if g.e == FD: d.rectangle([x1 - 6, y1 - 6, x1 - 2, y1 - 2], outline=g.GL[2])
    g.shape = (x0, y0, x1, y1)


def chessboard(g):
    """A board game from above, the game of its people: chess on a chequered board in Europe; backgammon with its
    long points in the Islamic world; the cross-shaped chaupar cloth with cowries in South Asia; go, its grid and
    black and white stones, in East Asia; a congklak board of two rows of pits in Southeast Asia; an oware board
    with its seeds in Africa; patolli on its cross in the Americas before the settlers and draughts after; konane
    holes and pebbles in Oceania; draughts of ivory and horn in the far north; shagai knucklebones on felt on the
    steppe. In Europe: chess in Central Europe, hnefatafl in the North in the Middle Ages and fox and geese after,
    nine men's morris in the Atlantic lands and draughts later, tables (backgammon) in the Mediterranean. The board is
    its people's wood, plain for the modest, inlaid or lacquered for the rich; card and plastic in Modern."""
    d = g.d; st = g.style; C = g.C; A = g.A or C
    x0, y0, x1, y1 = g.x0 + 1, g.y0 + 1, g.x1 - 2, g.y1 - 2
    g.shadow(x0, y0, x1, y1, kind="rect")
    Bd = ramp(BOARD.get(st, BOARD["central"])[g.b], 14)                                   # the board in its people's wood
    if g.e >= MO and g.e != FD: Bd = ramp(mix((210, 200, 170), g.L[2], .7), 12)
    if g.e == FD: Bd = ramp(mix(COMPOSITE[2], g.L[2], .65), 12)
    W, H = x1 - x0, y1 - y0; Lt, Dk = (230, 218, 186), (70, 46, 36)
    if g.e >= MO: Lt, Dk = mix(Lt, g.L[3], .4), mix(Dk, g.L[1], .5)
    if g.b == 2: Lt, Dk = M["ivory"][3], M["blackware"][2]
    if st == "southasia":                                                                 # chaupar cross cloth
        Cl = g.S; t = W // 3
        d.rectangle([x0 + t, y0, x1 - t, y1], fill=Cl[2], outline=OUT); d.rectangle([x0, y0 + t, x1, y1 - t], fill=Cl[2], outline=OUT)
        d.rectangle([x0 + t + 1, y0 + t + 1, x1 - t - 1, y1 - t - 1], fill=Cl[3])
        for k in range(y0 + 2, y1 - 1, 3): d.line([x0 + t + 2, k, x1 - t - 2, k], fill=Cl[1])
        for k in range(x0 + 2, x1 - 1, 3): d.line([k, y0 + t + 2, k, y1 - t - 2], fill=Cl[1])
        for k in range(4): d.ellipse([x0 + t + 2 + k * 2, y0 + t + 3, x0 + t + 4 + k * 2, y0 + t + 5], fill=M["shell"][3])
        g.shape = (x0, y0, x1, y1); return
    if st == "americas" and g.trad and g.e <= RE:                                          # patolli on a mat
        Mt = ramp((200, 176, 110), 12); d.rectangle([x0, y0, x1, y1], fill=Mt[2], outline=Mt[0])
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        d.rectangle([x0 + 2, cy - 2, x1 - 2, cy + 2], fill=g.S[2], outline=OUT); d.rectangle([cx - 2, y0 + 2, cx + 2, y1 - 2], fill=g.S[2], outline=OUT)
        for k in range(x0 + 4, x1 - 2, 3): d.line([k, cy - 2, k, cy + 2], fill=OUT)
        for k in range(y0 + 4, y1 - 2, 3): d.line([cx - 2, k, cx + 2, k], fill=OUT)
        g.shape = (x0, y0, x1, y1); return
    if st == "steppe" and g.trad:                                                          # shagai on felt
        Fe = ramp(mix((220, 210, 190), g.S[2], .4), 10); d.rectangle([x0, y0, x1, y1], fill=Fe[2], outline=Fe[0])
        d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=g.S[1])
        for k in range(8): d.rectangle([x0 + 4 + (k % 4) * 5, y0 + 5 + (k // 4) * 8, x0 + 6 + (k % 4) * 5, y0 + 7 + (k // 4) * 8], fill=M["ivory"][2], outline=OUT)
        g.shape = (x0, y0, x1, y1); return
    d.rectangle([x0, y0, x1, y1], fill=Bd[2], outline=OUT); d.line([x0 + 1, y0 + 1, x1 - 1, y0 + 1], fill=Bd[4])
    m = 2
    if st == "eastasia":                                                                  # go
        for k in range(x0 + m + 1, x1 - m, 3): d.line([k, y0 + m, k, y1 - m], fill=Bd[0])
        for k in range(y0 + m + 1, y1 - m, 3): d.line([x0 + m, k, x1 - m, k], fill=Bd[0])
        for k in range(9):
            sx, sy = x0 + m + 1 + ((k * 5) % 7) * 3, y0 + m + 1 + ((k * 3) % 6) * 3
            d.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(240, 240, 236) if k % 2 else (20, 20, 24))
    elif st == "northern" and g.trad:                                                    # hnefatafl, later fox and geese
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        if g.e <= LN:
            for k in range(9):
                d.line([x0 + m + k * (W - 2 * m) / 8, y0 + m, x0 + m + k * (W - 2 * m) / 8, y1 - m], fill=Bd[0]); d.line([x0 + m, y0 + m + k * (H - 2 * m) / 8, x1 - m, y0 + m + k * (H - 2 * m) / 8], fill=Bd[0])
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): d.ellipse([cx + dx * 3 - 1, cy + dy * 3 - 1, cx + dx * 3 + 1, cy + dy * 3 + 1], fill=(240, 236, 220))
            d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=M["gold"][3] if g.b else (240, 236, 220), outline=OUT)
            for k in (-2, 0, 2): d.point((cx + k * 2, y0 + 3), fill=OUT); d.point((cx + k * 2, y1 - 3), fill=OUT); d.point((x0 + 3, cy + k * 2), fill=OUT); d.point((x1 - 3, cy + k * 2), fill=OUT)
        else:
            t = W // 3
            d.rectangle([x0 + t, y0 + 2, x1 - t, y1 - 2], fill=Bd[1]); d.rectangle([x0 + 2, y0 + t, x1 - 2, y1 - t], fill=Bd[1])
            for k in range(13): d.point((x0 + t + 2 + (k % 3) * 3, y0 + 3 + (k // 3) * 3), fill=(240, 236, 220))
            d.ellipse([x0 + 3, y0 + t + 2, x0 + 6, y0 + t + 5], fill=(170, 40, 30), outline=OUT)
    elif st == "atlantic" and g.trad and g.e <= RE:                                       # nine men's morris
        for k in range(3):
            q = 2 + k * (min(W, H) // 6); d.rectangle([x0 + q, y0 + q, x1 - q, y1 - q], outline=Bd[0])
        d.line([(x0 + x1) // 2, y0 + 2, (x0 + x1) // 2, y0 + min(W, H) // 3], fill=Bd[0]); d.line([(x0 + x1) // 2, y1 - 2, (x0 + x1) // 2, y1 - min(W, H) // 3], fill=Bd[0])
        for k, (px_, py_) in enumerate(((x0 + 2, y0 + 2), (x1 - 2, y0 + 2), (x0 + 2, y1 - 2), ((x0 + x1) // 2, y1 - 2), (x0 + 2 + W // 6, y0 + 2 + H // 6), (x1 - 2 - W // 6, y1 - 2 - H // 6))):
            d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=(240, 236, 220) if k % 2 else (40, 30, 26), outline=OUT)
    elif st in ("islamic", "mediterranean"):                                              # backgammon (tables, tavli)
        mx = (x0 + x1) // 2; d.line([mx, y0 + 1, mx, y1 - 1], fill=OUT)
        for k in range(12):
            px_ = x0 + 2 + k * (W - 4) // 12 + (1 if k >= 6 else 0); c = A[2] if k % 2 else Bd[4]
            d.polygon([(px_, y0 + 2), (px_ + 2, y0 + 2), (px_ + 1, y0 + H // 2 - 2)], fill=c); d.polygon([(px_, y1 - 2), (px_ + 2, y1 - 2), (px_ + 1, y1 - H // 2 + 2)], fill=c)
        for k in range(4): d.ellipse([x0 + 3 + k * 3, y0 + 2, x0 + 5 + k * 3, y0 + 4], fill=(240, 236, 220) if k < 2 else (40, 30, 30))
    elif st in ("seasia", "africa"):                                                      # mancala: two rows of pits
        for row in (0, 1):
            for k in range(6 if st == "africa" else 7):
                n = 6 if st == "africa" else 7; px_ = x0 + 3 + k * (W - 6) // (n - 1); py_ = y0 + H // 3 + row * H // 3
                d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=Bd[0]); d.point((px_, py_), fill=(220, 210, 160) if st == "africa" else M["shell"][3])
        for ex in (x0 + 2, x1 - 4): d.ellipse([ex, (y0 + y1) // 2 - 3, ex + 2, (y0 + y1) // 2 + 3], fill=Bd[0])
    elif st == "oceania" and g.trad:                                                      # konane: holes and pebbles
        for k in range(6):
            for j in range(6):
                px_, py_ = x0 + 3 + k * (W - 6) // 5, y0 + 3 + j * (H - 6) // 5
                d.ellipse([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=(20, 20, 24) if (k + j) % 2 else (240, 240, 230))
    else:                                                                                 # chess or draughts
        n = 8; sq = (min(W, H) - 2 * m) / n
        for i in range(n):
            for j in range(n):
                if (i + j) % 2: d.rectangle([x0 + m + i * sq, y0 + m + j * sq, x0 + m + (i + 1) * sq - 1, y0 + m + (j + 1) * sq - 1], fill=Dk)
                else: d.rectangle([x0 + m + i * sq, y0 + m + j * sq, x0 + m + (i + 1) * sq - 1, y0 + m + (j + 1) * sq - 1], fill=Lt)
        chess = st in ("central", "northern") or (st in EUF and g.b >= 1 and st != "atlantic") or (st not in EUF and g.b >= 1)
        for i in range(n):
            for j in (0, 1, 6, 7) if chess else (0, 1, 2, 5, 6, 7):
                if not chess and (i + j) % 2 == 0: continue
                px_, py_ = x0 + m + (i + .5) * sq, y0 + m + (j + .5) * sq
                c = (240, 230, 200) if j > 3 else (40, 26, 22)
                if g.e >= MO and not chess: c = (220, 40, 30) if j > 3 else (30, 30, 30)
                d.ellipse([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=c)
    if g.b == 2: d.rectangle([x0, y0, x1, y1], outline=M["gold"][2])
    g.shape = (x0, y0, x1, y1)


def toy(g):
    """A child's toy from above, of its time and people: a wooden horse on wheels, a spinning top or a rag doll in the
    Middle Ages; a painted doll and a ball later; tin soldiers in the Victorian age; a teddy bear and a tin car in
    Mid-Century; a plastic robot in Modern; a little lit drone in Future Darkness. The North paints its red Dala
    horse, East Asia its round red daruma or a kite, South Asia its wooden elephant, Africa its wire car and clay
    figures, the Americas their wheeled clay dog, Oceania its spinning top and carved canoe, the far north its ivory
    animals, the steppe its felt camel, Southeast Asia its shadow puppet. Wood goes unpainted in the Dark Ages and
    is painted more brightly age by age; Victorian tin soldiers wear their own nation's coats; from Modern, toys are
    the same the world over (a robot, a plastic car, a fashion doll, building bricks, a ball, a hand-held game) and
    vary by make and colour. In the Long Night a toy is mended with a rag, in the Renaissance it trails a pull cord;
    some lie in their basket or box."""
    d = g.d; st = g.style; S = g.S
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1; cx, cy = g.cx, g.cy
    g.shadow(x0 + 1, y0 + 1, x1, y1, off=1)
    if g.v.get("box") == "box":                                                      # kept in its box or basket
        Bx = (_R((200, 170, 120), 10) if g.e < MO else ramp(mix(g.L[2], (240, 236, 220), .5), 10)) if g.e >= VI else _R((170, 130, 70), 12)
        d.rectangle([x0, y0, x1, y1], fill=Bx[1], outline=OUT); d.rectangle([x0 + 1, y0 + 1, x1 - 1, y0 + 2], fill=Bx[3])
    W = ramp(mix(M["treen"][2], S[2], {DA: .15, LN: .4, RE: .6}.get(g.e, .75)), 14)     # bare wood first, painted brighter later
    kind = {"northern": "horse", "eastasia": "daruma", "southasia": "elephant", "africa": "car", "americas": "dog",
            "oceania": "canoe", "polar": "animal", "steppe": "camel", "seasia": "puppet", "islamic": "top",
            "central": "horse", "atlantic": "doll", "mediterranean": "doll"}[st]
    if g.e == VI and st in EURO: kind = "soldiers"
    if g.e == GW and st in EURO: kind = {"central": "horse", "northern": "horse", "mediterranean": "doll"}.get(st, "teddy")
    if g.e == MC and st in EURO: kind = {"northern": "horse", "mediterranean": "doll", "central": "train", "oceania": "teddy"}.get(st, "car")
    if g.glob: kind = ["robot", "car", "doll", "bricks", "ball", "game"][_mi(g)] if g.e == MO else ["drone", "car", "doll", "bricks", "ball", "game"][_mi(g)]
    if kind == "horse":
        d.ellipse([x0 + 3, cy - 3, x1 - 4, cy + 3], fill=W[2], outline=OUT)                    # body
        d.ellipse([x1 - 6, y0 + 1, x1 - 1, cy], fill=W[2], outline=OUT)                         # head
        for wx in (x0 + 4, x1 - 6):
            for wy in (y0 + 1, y1 - 2): d.rectangle([wx - 1, wy - 1, wx + 1, wy + 1], fill=M["darkwood"][2])
        d.line([x0 + 5, cy - 1, x1 - 6, cy - 1], fill=W[4])
        if st == "northern": d.point((cx, cy), fill=M["paint_blue"][3]); d.point((cx + 2, cy + 1), fill=M["slip_yellow"][3])
    elif kind == "doll":
        Dr = S if not g.glob else _pk(g, [PINKP, BLUEP, YELLOWP, REDP], "dress")
        if g.e == AR and g.b: d.rectangle([x0, y1 - 1, x1, y1], fill=M["gold"][2])        # on a gilt stand
        d.polygon([(cx - 4, y1 - 1), (cx + 4, y1 - 1), (cx + 2, cy - 1), (cx - 2, cy - 1)], fill=Dr[2], outline=OUT)
        d.ellipse([cx - 3, y0 + 1, cx + 3, cy], fill=(226, 190, 160), outline=OUT); d.rectangle([cx - 3, y0 + 1, cx + 3, y0 + 3], fill=M["mazer"][2])
        d.line([cx - 5, cy + 1, cx + 5, cy + 1], fill=(226, 190, 160))
    elif kind == "daruma":
        r = min(x1 - x0, y1 - y0) // 2 - 1; d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=M["paint_red"][2] if g.b < 2 else M["gold"][2], outline=OUT)
        d.ellipse([cx - r + 3, cy - r + 2, cx + r - 3, cy + 1], fill=(240, 232, 214)); d.point((cx - 1, cy - 2), fill=OUT); d.point((cx + 2, cy - 2), fill=OUT)
        d.line([cx - r + 2, cy + r - 3, cx + r - 2, cy + r - 3], fill=M["gold"][3])
    elif kind == "elephant":
        d.ellipse([x0 + 2, cy - 4, x1 - 5, cy + 4], fill=W[2], outline=OUT); d.ellipse([x1 - 7, cy - 3, x1 - 1, cy + 3], fill=W[3], outline=OUT)
        d.line([x1 - 2, cy, x1, cy + 3], fill=W[1]); d.rectangle([cx - 2, cy - 3, cx + 2, cy + 3], fill=M["gold"][2] if g.b else M["paint_red"][2])
    elif kind == "car":
        Wi = ramp((150, 150, 156), 12) if st == "africa" and g.e < MC else (g.L if g.e >= MC else S)   # tin cars in a maker's colour
        d.rectangle([x0 + 2, cy - 3, x1 - 2, cy + 3], fill=Wi[1] if st == "africa" else Wi[2], outline=Wi[0] if st == "africa" else OUT)
        if st == "africa": d.line([x0 + 3, cy, x1 - 3, cy], fill=Wi[0])
        for wx in (x0 + 4, x1 - 5):
            for wy in (cy - 4, cy + 4): d.ellipse([wx - 2, wy - 1, wx + 2, wy + 1], fill=OUT)
        d.rectangle([cx - 2, cy - 2, cx + 3, cy + 2], fill=M["glass"][3] if st != "africa" else Wi[1])
    elif kind == "dog":
        Cl = ramp(mix(M["terracotta"][2], S[2], .3), 14)
        d.ellipse([x0 + 3, cy - 3, x1 - 5, cy + 3], fill=Cl[2], outline=OUT); d.ellipse([x1 - 6, cy - 2, x1 - 1, cy + 2], fill=Cl[3], outline=OUT)
        for wx in (x0 + 4, x1 - 7):
            for wy in (cy - 4, cy + 4): d.ellipse([wx - 1, wy - 1, wx + 1, wy + 1], fill=Cl[0])
    elif kind == "canoe":
        Cw = ramp(mix(M["darkwood"][2], S[2], .4), 14)
        d.polygon([(x0 + 1, cy), (x0 + 4, cy - 3), (x1 - 4, cy - 3), (x1, cy), (x1 - 4, cy + 3), (x0 + 4, cy + 3)], fill=Cw[2], outline=OUT)
        d.line([x0 + 4, cy, x1 - 4, cy], fill=Cw[0]); d.line([cx, cy - 3, cx, y1 - 1], fill=Cw[1]); d.rectangle([cx - 1, y1 - 2, cx + 1, y1], fill=Cw[2])
    elif kind == "animal":
        Iv = M["ivory"] if g.b else ramp((200, 190, 160), 10)
        for k, (ax, ay) in enumerate(((x0 + 4, cy - 2), (cx + 2, cy + 2))):
            d.ellipse([ax - 3, ay - 2, ax + 3, ay + 2], fill=Iv[2], outline=Iv[0]); d.ellipse([ax + 2, ay - 2, ax + 5, ay + 1], fill=Iv[3], outline=Iv[0])
        d.point((x0 + 5, cy - 2), fill=OUT)
    elif kind == "camel":
        Fe = ramp(mix((210, 180, 130), S[2], .35), 12)
        d.ellipse([x0 + 3, cy - 3, x1 - 5, cy + 3], fill=Fe[2], outline=OUT); d.ellipse([cx - 4, cy - 2, cx - 1, cy + 1], fill=Fe[3]); d.ellipse([cx + 1, cy - 2, cx + 4, cy + 1], fill=Fe[3])
        d.line([x1 - 5, cy, x1 - 1, cy - 3], fill=Fe[1], width=2); d.rectangle([x1 - 3, cy - 4, x1, cy - 2], fill=Fe[2], outline=OUT)
        d.rectangle([cx - 2, cy + 2, cx + 2, cy + 3], fill=S[2])
    elif kind == "puppet":
        Lh = ramp(mix((180, 130, 80), S[2], .4), 12)
        d.polygon([(cx, y0), (cx + 4, cy - 1), (cx + 2, y1 - 2), (cx - 2, y1 - 2), (cx - 4, cy - 1)], fill=Lh[2], outline=OUT)
        for k in range(y0 + 3, y1 - 2, 2): d.point((cx, k), fill=M["gold"][3])
        d.line([cx, y1 - 2, cx + 1, y1], fill=M["bamboo"][1]); d.line([cx - 4, cy - 1, x0 + 1, y1 - 2], fill=M["bamboo"][1])
    elif kind == "top":
        r = min(x1 - x0, y1 - y0) // 2 - 1
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=S[2], outline=OUT)
        for k in range(4): a = k * math.pi / 2; d.line([cx, cy, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=S[4] if k % 2 else M["gold"][2])
        d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=M["darkwood"][1])
    elif kind == "soldiers":                                                         # each nation's coat
        Un = ramp({"atlantic": (190, 40, 40), "central": (40, 50, 90), "northern": (60, 110, 60), "mediterranean": (120, 150, 210),
                   "americas": (130, 130, 140), "oceania": (180, 160, 110)}[st], 14)
        Pa = {"atlantic": (240, 240, 230), "central": (30, 30, 30), "northern": (200, 60, 50), "mediterranean": (200, 40, 40), "americas": (200, 190, 140), "oceania": (240, 240, 230)}[st]
        Bs = {"atlantic": (80, 120, 60), "central": (150, 130, 90), "northern": (200, 200, 190), "mediterranean": (190, 160, 100), "americas": (120, 90, 60), "oceania": (200, 180, 120)}[st]
        d.rectangle([x0 + 1, cy + 2, x1 - 1, y1 - 1], fill=Bs, outline=OUT)                                       # their painted base
        for k in range(3 + g.b):
            sx = x0 + 2 + k * (x1 - x0 - 4) // (2 + g.b); d.rectangle([sx - 1, cy - 3, sx + 1, cy + 2], fill=Un[2], outline=OUT); d.point((sx, cy - 4), fill=Pa); d.point((sx, cy), fill=Pa)
        d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=M["darkwood"][2])
    elif kind == "teddy":
        Fu = ramp(_pk(g, [(200, 160, 90), (170, 120, 70), (120, 80, 50), (226, 214, 190)], "fur"), 14)          # mohair
        d.ellipse([cx - 4, cy - 1, cx + 4, y1 - 1], fill=Fu[2], outline=OUT); d.ellipse([cx - 3, y0 + 1, cx + 3, cy + 1], fill=Fu[3], outline=OUT)
        for ex in (cx - 3, cx + 3): d.ellipse([ex - 1, y0, ex + 1, y0 + 2], fill=Fu[1], outline=OUT)
        d.line([cx - 2, cy + 1, cx + 2, cy + 1], fill=_pk(g, [(200, 40, 40), (60, 90, 170), (230, 200, 60)], "bow"), width=2)
    elif kind == "robot":
        Pl = g.L
        d.rectangle([cx - 4, cy - 2, cx + 4, y1 - 1], fill=Pl[2], outline=OUT); d.rectangle([cx - 3, y0 + 1, cx + 3, cy - 2], fill=M["chrome"][2], outline=OUT)
        d.point((cx - 1, y0 + 3), fill=(230, 40, 30)); d.point((cx + 1, y0 + 3), fill=(230, 40, 30)); d.rectangle([cx - 6, cy, cx - 5, cy + 3], fill=Pl[1]); d.rectangle([cx + 5, cy, cx + 6, cy + 3], fill=Pl[1])
    elif kind == "train":                                                            # a tin train, engine and two wagons
        for k, C_ in enumerate((BLACK, g.L, _pk(g, [REDP, GREENP, BLUEP], "w2"))):
            wx = x0 + 1 + k * (x1 - x0) // 3; d.rectangle([wx, cy - 3, wx + (x1 - x0) // 3 - 2, cy + 3], fill=C_[2], outline=OUT)
        d.line([x0 + 1, cy + 4, x1 - 1, cy + 4], fill=NICKEL[2])
    elif kind == "bricks":
        for k, (bx, by) in enumerate(((x0 + 1, y0 + 1), (cx, y0 + 2), (x0 + 3, cy), (cx + 1, cy + 1))):
            C_ = [REDP, YELLOWP, BLUEP, GREENP][(k + _mi(g)) % 4]; d.rectangle([bx, by, bx + 5, by + 3], fill=C_[2], outline=OUT); d.point((bx + 1, by + 1), fill=C_[4]); d.point((bx + 4, by + 1), fill=C_[4])
    elif kind == "ball":
        r = min(x1 - x0, y1 - y0) // 2 - 1; C_ = _pk(g, [REDP, BLUEP, YELLOWP, WHITEP], "ball")
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C_[2], outline=OUT); d.line([cx - r + 1, cy, cx + r - 1, cy], fill=WHITEP[2] if C_ is not WHITEP else BLACK[2]); d.point((cx - 2, cy - 2), fill=C_[4])
    elif kind == "game":
        C_ = _pk(g, [GREYP, BLACK, REDP, BLUEP], "game"); d.rounded_rectangle([x0 + 2, cy - 4, x1 - 2, cy + 4], 2, fill=C_[2], outline=OUT)
        _screen(g, (cx - 3, cy - 3, cx + 3, cy + 2), g.e == FD, (120, 200, 140)); d.point((x0 + 4, cy), fill=OUT); d.point((x1 - 4, cy - 1), fill=REDP[2])
    else:                                                                                 # drone
        Dr = ramp(mix(COMPOSITE[2], g.L[2], .5), 12)
        d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=Dr[2], outline=OUT)
        for ax, ay in ((x0 + 3, y0 + 3), (x1 - 3, y0 + 3), (x0 + 3, y1 - 3), (x1 - 3, y1 - 3)):
            d.line([cx, cy, ax, ay], fill=Dr[0]); d.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], outline=g.GL[1])
        d.point((cx, cy), fill=g.GL[2])
    if g.e == LN and g.trad and kind not in ("soldiers",):                         # mended: a rag bound round it
        d.line([cx - 1, y0 + 2, cx - 1, y1 - 1], fill=(200, 190, 160), width=2)
    if g.e == RE and g.trad: d.line([x0, y1, cx, cy], fill=(150, 120, 80))           # its pull cord
    g.shape = (x0, y0, x1, y1)


def sewing(g):
    """A sewing basket from above, lidded, or open on its spools of thread, pincushion and scissors. Wicker in Europe,
    birch bark in the North and the far north, palm or bamboo in the South and East (a lacquer box in East Asia),
    a printed tin in Mid-Century and a plastic box in Modern; Future Darkness a dark case with a lit clasp. The
    lining, threads and cushion take the region's colours."""
    d = g.d; st = g.style; S = g.S; op = g.st == "open"
    x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    Bk = {"eastasia": M["lacq_black"] if g.b == 2 else M["lacq_red"], "northern": M["bark"], "polar": M["bark"],
          "seasia": M["bamboo"], "southasia": M["bamboo"], "oceania": ramp((200, 180, 120), 12), "africa": ramp((190, 160, 100), 12)}.get(st, M["treen"])
    Bk = ramp(mix(Bk[2], S[2], .5), 14)
    if g.e == MC and st in EUF: Bk = ramp(mix((200, 60, 50), S[2], .5), 14)
    if g.e == MO: Bk = g.L
    if g.e == FD: Bk = ramp(mix(COMPOSITE[2], g.L[2], .4), 12)
    g.shadow(x0, y0, x1, y1, kind="ellipse")
    d.rounded_rectangle([x0, y0, x1, y1], 4, fill=Bk[2], outline=OUT)
    weave = st in EUF + ("oceania", "africa", "seasia", "southasia")
    if not op:
        d.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], 3, fill=Bk[3], outline=Bk[0])
        if weave:
            for k in range(x0 + 3, x1 - 2, 3): d.line([k, y0 + 3, k, y1 - 3], fill=Bk[1])
        d.rectangle([(x0 + x1) // 2 - 2, y1 - 3, (x0 + x1) // 2 + 2, y1 - 1], fill=M["brass"][3] if g.e < FD else g.GL[2])
        d.rounded_rectangle([x0 + 4, y0 + 4, x1 - 4, y0 + 7], 1, fill=S[2])                # a ribbon or painted band on the lid
        g.shape = (x0, y0, x1, y1); return
    Ln = S
    d.rounded_rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], 3, fill=Ln[1])
    cols = [S, M["paint_red"], M["paint_blue"], M["slip_yellow"], M["white"]]
    for k in range(2 + g.b):                                                              # spools of thread
        sx, sy = x0 + 4 + k * 4, y0 + 4
        d.rectangle([sx - 1, sy - 1, sx + 2, sy + 3], fill=cols[k][3], outline=M["treen"][1])
    d.ellipse([x1 - 8, y0 + 3, x1 - 3, y0 + 8], fill=M["paint_red"][2], outline=OUT); d.point((x1 - 6, y0 + 5), fill=M["silver"][4])   # pincushion
    d.line([x0 + 4, y1 - 4, x0 + 10, y1 - 6], fill=M["steel"][3]); d.line([x0 + 4, y1 - 6, x0 + 10, y1 - 4], fill=M["steel"][3])      # scissors
    d.ellipse([x0 + 2, y1 - 6, x0 + 4, y1 - 4], outline=OUT)
    d.rectangle([(x0 + x1) // 2, y1 - 6, x1 - 3, y1 - 3], fill=ramp(mix(LINEN[2], S[2], .3), 10)[3])                         # a folded piece of cloth
    g.shape = (x0, y0, x1, y1)


BLOOM = {"central": [(200, 40, 40), (240, 210, 60)], "atlantic": [(230, 150, 170), (250, 250, 240)], "northern": [(250, 250, 240), (150, 130, 210)],
         "mediterranean": [(240, 120, 40), (200, 30, 60)], "islamic": [(220, 40, 50), (250, 240, 230)], "steppe": [(240, 220, 120), (200, 80, 160)],
         "southasia": [(240, 150, 190), (250, 160, 30)], "eastasia": [(250, 220, 60), (250, 250, 240)], "seasia": [(170, 80, 200), (250, 250, 240)],
         "africa": [(240, 140, 160), (250, 200, 60)], "americas": [(250, 150, 20), (220, 60, 40)], "oceania": [(230, 40, 50), (250, 230, 120)],
         "polar": [(250, 250, 250), (230, 220, 120)]}


def flowers(g):
    """Flowers from above, set out the way their people set them: a vase with its bouquet in Europe, the Islamic
    world, the steppe, Africa, the Americas and the far north; a shallow ikebana dish in East Asia with a few stems
    leaning out over the water; a ring of marigolds on a brass dish in South Asia; blooms floating in a water bowl in
    Southeast Asia; a lei of hibiscus in Oceania. The blooms are the region's: red tulips and yellow in Central
    Europe, pink roses in the Atlantic lands, white and lilac in the North, orange and carnation red in the
    Mediterranean, red tulips in the Islamic world, steppe poppies, pink lotus and marigolds in South Asia,
    chrysanthemums in East Asia, orchids in Southeast Asia, protea in Africa, marigolds in the Americas, hibiscus in
    Oceania, cotton grass in the far north. A poor household's jar holds a few wild flowers; a rich one's vase is
    crowded. Modern bouquets come in the florist's cellophane with a ribbon; Future Darkness ones are half dried.
    Wilted when worn, spilt when broken."""
    d = g.d; st = g.style; C = g.C; A = g.A or C
    r = min(g.W, g.H) // 2 - 1; cx, cy = g.cx, g.cy
    cols = BLOOM[st][::(1 if g.w % 2 else -1)]; n = 3 + 2 * g.b + (g.w % 2)
    wilt = g.cond == "worn"; cnt = [0]
    def bloom(bx, by, c, br):
        cnt[0] += 1
        if wilt or (g.e == FD and cnt[0] % 2): c = mix(c, (130, 100, 70), .5)
        d.ellipse([bx - br, by - br, bx + br, by + br], fill=c, outline=tone(c, -70)); d.point((bx, by), fill=(250, 220, 80) if c[2] > 150 or c[0] > 200 else (60, 40, 20))
    Lf = ramp((70, 120, 60), 14); Wt = (90, 130, 170)
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    form = {"eastasia": "ikebana", "southasia": "garland", "seasia": "float", "oceania": "lei"}.get(st, "vase")
    if form == "ikebana":
        d.rounded_rectangle([cx - r, cy - r // 2, cx + r, cy + r // 2], 3, fill=C[2], outline=OUT); d.rectangle([cx - r + 2, cy - r // 2 + 2, cx + r - 2, cy + r // 2 - 2], fill=Wt)
        d.line([cx - 2, cy, cx + r - 1, cy - r + 1], fill=M["darkwood"][1], width=2); d.line([cx - 2, cy, cx - r + 2, cy - r + 3], fill=Lf[1])
        for k in range(1 + g.b): bloom(cx + r - 2 - k * 4, cy - r + 2 + k * 3, cols[k % 2], 2)
        g.spill = Wt; g.shape = (cx - r, cy - r, cx + r, cy + r // 2); return
    if form == "garland":
        Br = M["brass"]; g.disc(cx, cy, r, C=Br); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=Br[1])
        m = 8 + 2 * g.b
        for k in range(m): a = k * 2 * math.pi / m; bloom(cx + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3), cols[k % 2], 2)
        if g.b: bloom(cx, cy, cols[1], 3)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if form == "float":
        g.disc(cx, cy, r, C=C); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=Wt)
        for k in range(n): a = k * 2.4; rr = (r - 4) * (.2 + .8 * (k % 3) / 2); bloom(cx + math.cos(a) * rr, cy + math.sin(a) * rr, cols[k % 2], 2)
        g.spill = Wt; g.shape = (cx - r, cy - r, cx + r, cy + r); return
    if form == "lei":
        m = 10 + 2 * g.b
        for k in range(m): a = k * 2 * math.pi / m; bloom(cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2), cols[k % 2] if k % 3 else Lf[3], 2)
        g.shape = (cx - r, cy - r, cx + r, cy + r); return
    g.disc(cx, cy, r, C=C); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[0])
    for k in range(6):
        a = k * math.pi / 3 + .4; lx, ly = cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)
        d.ellipse([lx - 2, ly - 1, lx + 2, ly + 1], fill=Lf[2 + (k % 2)])
    for k in range(n):
        a = k * 2 * math.pi / n + .2; rr = (r - 4) * (.3 + .7 * ((k * 7) % 5) / 4)
        bloom(cx + math.cos(a) * rr, cy + math.sin(a) * rr, cols[k % 2], 2 if g.b < 2 else 3)
    if g.e == MO and g.b:                                                                # the florist's cellophane and ribbon
        d.polygon([(cx - r, cy - r), (cx + r, cy - r), (cx + 2, cy + r), (cx - 2, cy + r)], outline=(236, 242, 248))
        d.line([cx - 3, cy + r - 2, cx + 3, cy + r - 2], fill=g.L[3], width=2)
    g.spill = LIQ["water"]; g.shape = (cx - r, cy - r, cx + r, cy + r)


def ashtray(g):
    """An ashtray from above: a round tray with its cigarette rests, ash and stubs. Victorian: a brass or ceramic
    dish in the style's ware; Great War: a shell-case brass tray; Mid-Century: heavy glass or chrome on a stand;
    Modern: a cheap plastic or printed tin tray; Future Darkness: a dark tray with a lit ring. Clean, with a few
    stubs, or full."""
    if g.glob: return _ashtray_glob(g)
    d = g.d; st = g.style; C = g.C; A = g.A or C; full = g.v.get("contents", "few")
    r = min(g.W, g.H) // 2 - 1; cx, cy = g.cx, g.cy
    if g.e == GW and g.b == 0: C = M["brass"]                                               # a shell-case tray
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    g.disc(cx, cy, r, C=C, out=C[0])
    g.pattern(cx, cy, r, g.pat if g.pat != "blue" else "band", A)
    ir = r - 2; d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=C[1])
    for k in range(3 if g.e != GW else 2): a = k * 2 * math.pi / 3 - math.pi / 2; d.rectangle([cx + math.cos(a) * r - 1, cy + math.sin(a) * r - 1, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=C[0])
    if full != "clean":
        ar = 2 if full == "few" else ir - 2
        d.ellipse([cx - ar, cy - ar + 1, cx + ar, cy + ar + 1], fill=(150, 146, 140))
        n = 2 if full == "few" else 5
        for k in range(n):
            a = k * 2.2 + .5; sx, sy = cx + math.cos(a) * (ir - 3), cy + math.sin(a) * (ir - 3)
            d.line([sx, sy, sx + 2, sy + 1], fill=(240, 236, 226), width=1); d.point((sx + 2, sy + 1), fill=(220, 140, 60))
    if g.e == FD: d.arc([cx - r, cy - r, cx + r, cy + r], 200, 300, fill=g.GL[1])
    g.spill = (150, 146, 140); g.shape = (cx - r, cy - r, cx + r, cy + r)


# ================================================================ machines and mass-made goods (one look worldwide)
MODEL = ["a", "b", "c", "d", "e", "f"]                  # which of the era's makes and models a variation shows


def _mi(g, n=6):
    """The variation's make or model, one of n."""
    return MODEL.index(g.v.get("model", "a")) % n


def _pk(g, lst, salt=""):
    """A livery or finish for this variation, picked by its own id (makers' colours, never a region's)."""
    return lst[zlib.crc32(f"{g.v.get('vid', '')}{salt}".encode()) % len(lst)]


def _R(c, k=14): return ramp(c, k)


BLACK, IVORYP, BEIGE, GREYP, WHITEP = _R((40, 40, 44), 12), _R((226, 216, 186), 10), _R((206, 194, 160), 10), _R((150, 152, 156), 14), _R((232, 232, 228), 8)
WALNUT, OAK, MAHOG = _R((110, 70, 42), 14), _R((186, 140, 82), 14), _R((128, 46, 34), 14)
NICKEL, GILT = _R((196, 198, 200), 18), _R((214, 178, 76), 18)
REDP, BLUEP, GREENP, YELLOWP, PINKP, TEALP = _R((200, 50, 44), 16), _R((60, 96, 180), 16), _R((70, 140, 80), 16), _R((236, 196, 60), 14), _R((226, 140, 160), 12), _R((70, 170, 160), 14)
CASE50 = [REDP, TEALP, IVORYP, BLUEP, YELLOWP, PINKP]   # the bright plastics of the 1950s
CASE90 = [BLACK, GREYP, BEIGE, WHITEP]
CASEFD = [_R((30, 32, 36), 10), _R((210, 212, 216), 10), _R((70, 76, 90), 12), _R((200, 160, 120), 12)]
CASES = [REDP, BLUEP, GREENP, PINKP, YELLOWP, TEALP]    # phone cases and bright gadgets


def _box(g, b, C, r=1, out=OUT):
    g.d.rounded_rectangle([int(v) for v in b], r, fill=C[2], outline=out)
    g.d.line([b[0] + 1, b[1] + 1, b[2] - 1, b[1] + 1], fill=C[3])


def _screen(g, b, on, col=(120, 190, 220)):
    """A screen or dial: dark when off; lit, with a few lines of picture, when on."""
    d = g.d; b = [int(v) for v in b]
    d.rectangle(b, fill=(28, 34, 36) if not on else col, outline=OUT)
    if on:
        for y in range(b[1] + 2, b[3] - 1, 2): d.line([b[0] + 2, y, b[2] - 2, y], fill=mix(col, (255, 255, 255), .4))
    else: d.line([b[0] + 1, b[1] + 1, b[0] + 2, b[1] + 1], fill=(90, 100, 104))


def _keys(g, b, Ck, kc=None):
    d = g.d; b = [int(v) for v in b]
    d.rectangle(b, fill=Ck[2], outline=OUT)
    for yy in range(b[1] + 2, b[3] - 1, 2):
        for xx in range(b[0] + 2, b[2] - 1, 2): d.point((xx, yy), fill=kc or Ck[0])


def _under(g, felt=False, late=False):
    """What a household sets a machine on, by its means: nothing for the plain, a notepad beside it for the
    comfortable, a lace doily (a leather blotter in Modern) for the rich, a crimson velvet mat for the princely, a
    green felt pad under a typewriter."""
    d = g.d; x0, y0, x1, y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1
    if late != (g.w == 3 or (g.w == 4 and g.e == FD)): return
    if late:
        d.rectangle([x1 - 5, y1 - 4, x1, y1], fill=(244, 240, 220), outline=(150, 146, 130)); d.line([x1 - 4, y1 - 2, x1 - 1, y1 - 2], fill=(90, 90, 110)); return
    if g.w < 4: return
    if felt: d.rectangle([x0, y0, x1, y1], fill=(60, 110, 70), outline=(40, 80, 50)); return
    if g.w == 5 and g.e == FD: d.rectangle([x0, y0, x1, y1], fill=(36, 38, 44), outline=g.GL[1]); return     # a dark mat with a lit edge
    if g.w == 5: d.rectangle([x0, y0, x1, y1], fill=(130, 24, 36), outline=GILT[1]); return
    if g.e == MO: d.rectangle([x0, y0, x1, y1], fill=(40, 70, 50), outline=(20, 40, 30)); return
    d.ellipse([x0, y0, x1, y1], fill=(240, 238, 228), outline=(200, 196, 182))
    for a in range(0, 360, 30):
        ex, ey = (x0 + x1) / 2 + math.cos(math.radians(a)) * (x1 - x0) / 2.6, (y0 + y1) / 2 + math.sin(math.radians(a)) * (y1 - y0) / 2.6
        d.point((ex, ey), fill=(200, 196, 182))


def _clutter(g):
    """What lies about on or by a set: a folded newspaper or listings magazine, or a cup."""
    c = g.v.get("clutter", "none"); d = g.d
    if c == "papers":
        x, y = g.x0 + 1, g.y0 + 1; d.rectangle([x, y, x + 7, y + 5], fill=(232, 228, 210), outline=(140, 136, 120))
        d.line([x + 1, y + 2, x + 6, y + 2], fill=(90, 90, 96)); d.line([x + 1, y + 4, x + 4, y + 4], fill=(90, 90, 96))
    elif c == "cup":
        x, y = g.x1 - 5, g.y0 + 3; cc = _pk(g, [WHITEP, REDP, BLUEP, YELLOWP], "cup")
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=cc[2], outline=OUT); d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(70, 44, 30))


def _xy(g, i=0):
    return g.x0 + i, g.y0 + i, g.x1 - 1 - i, g.y1 - 1 - i


def phone(g):
    """A telephone on a table, from above. Victorian: a wooden box set with its bells and crank, a Scandinavian
    skeleton set of black and nickel, or an early brass candlestick; Great War: black and nickel candlestick sets, a
    field telephone in its leather case, a skeleton set; Mid-Century: a black, ivory or red desk set with the handset
    across the cradle and the round dial in front, a one-piece upright set or a push-button office set; Modern: an
    office key set, a cordless phone, a brick mobile or a fax; Future Darkness: a glass slab phone in its case, face
    up or face down, a folding phone or a tablet. Made by a few firms for every market, so it varies by maker,
    model, colour and wear, not by region."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; W, H = x1 - x0, y1 - y0; k = _mi(g)
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g)
    if g.e <= GW:
        form = (["box", "box", "skeleton", "candle", "box", "skeleton"] if g.e == VI else ["candle", "candle", "field", "skeleton", "candle", "box"])[k]
        C = ([WALNUT, OAK, BLACK, BRASS, _R((50, 76, 54), 12), NICKEL] if g.e == VI else [BLACK, NICKEL, _R((96, 90, 50), 12), BLACK, BLACK, OAK])[k]
        if form == "candle":
            if k == 4: d.rectangle([x0, y0 + 3, x1, y1], fill=(236, 232, 214), outline=(150, 146, 130))      # its message pad
            g.disc(cx - 1, cy + 1, min(W, H) // 2 - (1 if k == 4 else 0), C=C)
            d.ellipse([cx - 4, cy - 2, cx + 1, cy + 3], fill=NICKEL[2] if C is not NICKEL else BLACK[2], outline=OUT)
            d.rounded_rectangle([x0, y0, x0 + 5, y0 + 3], 1, fill=BLACK[2], outline=OUT)
        elif form == "skeleton":
            d.polygon([(x0, y1), (cx, y0 + 3), (x1, y1)], fill=C[1], outline=OUT); d.line([cx, y0 + 3, cx, y1 - 1], fill=NICKEL[3])
            d.rounded_rectangle([x0, y0, x1, y0 + 3], 1, fill=BLACK[2], outline=NICKEL[3]); d.line([x1 - 2, cy, x1, cy + 3], fill=NICKEL[4])
        elif form == "field":                                                       # field telephone in its case
            _box(g, (x0, y0, x1, y1), C, 1); d.rectangle([x0 + 2, y0 + 2, x1 - 2, cy], fill=_R((70, 54, 36), 10)[2], outline=OUT)
            d.rounded_rectangle([x0 + 1, cy + 1, x1 - 1, cy + 4], 1, fill=BLACK[2], outline=OUT); d.line([x0, y0 + 1, x1, y0 + 1], fill=_R((70, 54, 36), 10)[0])
        else:                                                                       # wooden box set with bells
            _box(g, (x0, y0, x1, y1), C)
            for sx in (cx - 3, cx + 3): d.ellipse([sx - 2, y0 + 2, sx + 2, y0 + 6], fill=NICKEL[3], outline=OUT)
            d.rounded_rectangle([x0 + 2, y1 - 4, x1 - 2, y1 - 1], 1, fill=BLACK[2], outline=OUT); d.line([x1, cy, x1 + 1, cy + 2], fill=NICKEL[4])
        if g.b == 2: d.point((x0 + 2, y1 - 2), fill=GILT[4])
    elif g.e == MC:
        if k == 3:                                                                     # one-piece upright set
            C = _pk(g, CASE50); g.disc(cx, cy, min(W, H) // 2, C=C); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=C[4], outline=C[0])
        else:
            C = [BLACK, IVORYP, REDP, None, _pk(g, [PINKP, BLUEP, GREENP]), _pk(g, [GREYP, BEIGE])][k]
            if k == 4: x0, x1 = x0 + 2, x1 - 2
            d.polygon([(x0 + 1, y1), (x0 + 3, y0 + 3), (x1 - 3, y0 + 3), (x1 - 1, y1)], fill=C[2], outline=OUT)
            d.rounded_rectangle([x0, y0, x1, y0 + 4], 2, fill=C[3], outline=OUT)
            if k < 5:
                r = min(3, (y1 - y0 - 5) // 2); dc = (cx, y1 - r - 1)
                d.ellipse([dc[0] - r, dc[1] - r, dc[0] + r, dc[1] + r], fill=WHITEP[2] if k else NICKEL[2], outline=OUT)
            else:
                d.rectangle([x0 + 2, y1 - 2, x1 - 2, y1 - 1], fill=(240, 240, 236))
                for kx in range(3): d.point((cx - 2 + kx * 2, y1 - 4), fill=BLACK[1])
    elif g.e == MO:
        if k == 3:                                                                     # a brick mobile on a desk pad
            d.rectangle([x0, y0, x1, y1], fill=_pk(g, [BLUEP, GREENP, REDP], "pad")[1], outline=OUT)
            _box(g, (cx - 3, y0 + 1, cx + 3, y1 - 1), BLACK); d.line([cx + 2, y0 - 1, cx + 2, y0 + 2], fill=OUT)
            d.rectangle([cx - 2, y0 + 3, cx + 2, y0 + 5], fill=(150, 190, 120))
        elif k == 4:                                                                   # fax phone with its paper
            _box(g, (x0, y0 + 2, x1, y1), GREYP, 1); d.rectangle([cx - 4, y0, cx + 4, y0 + 4], fill=(246, 244, 236), outline=OUT)
            d.rounded_rectangle([x0, y0 + 3, x0 + 3, y1 - 1], 1, fill=BLACK[2], outline=OUT)
        else:
            C = [BLACK, BEIGE, WHITEP, None, None, REDP][k]
            _box(g, (x0, y0 + 2, x1, y1), C, 2)
            if k != 2: d.rounded_rectangle([x0, y0, x0 + 4, y1 - 1], 2, fill=C[3], outline=OUT)
            else: d.rounded_rectangle([cx - 2, y0, cx + 2, y1 - 2], 2, fill=C[1], outline=OUT)
            for kx in range(3):
                for ky in range(3): d.point((x1 - 7 + kx * 2, y0 + 5 + ky * 2), fill=C[0] if C is not BLACK else GREYP[3])
    else:
        on = g.st == "on"; sc = _pk(g, [(90, 150, 220), (220, 120, 90), (110, 200, 140)], "s")
        if k == 0:                                                                     # on a wooden charging pad
            d.ellipse([x0, y0, x1, y1], fill=_pk(g, [WALNUT, OAK], "pad")[2], outline=OUT)
            d.rounded_rectangle([cx - 3, y0 + 1, cx + 3, y1 - 1], 2, fill=CASEFD[0][1], outline=OUT); _screen(g, (cx - 2, y0 + 3, cx + 2, y1 - 3), on, sc)
        elif k in (1, 5):                                                              # face down in a bright case, the camera showing
            C = _pk(g, CASES, str(k)); d.rounded_rectangle([cx - 4, y0, cx + 4, y1], 2, fill=C[2], outline=OUT)
            d.rounded_rectangle([cx - 3, y0 + 1, cx, y0 + 4], 1, fill=C[0]); d.point((cx - 2, y0 + 2), fill=(30, 30, 34))
            if k == 5: d.rounded_rectangle([x1 - 4, y1 - 4, x1, y1], 1, fill=WHITEP[2], outline=OUT)     # the earbuds' case
        elif k == 2:                                                                   # white phone face up, lit
            d.rounded_rectangle([cx - 4, y0, cx + 4, y1], 2, fill=WHITEP[2], outline=OUT); _screen(g, (cx - 3, y0 + 2, cx + 3, y1 - 2), True, sc)
        elif k == 3:                                                                   # folding phone, open
            d.rounded_rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], 2, fill=NICKEL[1], outline=OUT); _screen(g, (x0 + 2, y0 + 2, x1 - 2, y1 - 2), on, sc); d.line([cx, y0 + 1, cx, y1 - 1], fill=NICKEL[3])
        else:                                                                          # a tablet in its cover
            C = _pk(g, [GREYP, BLUEP, _R((150, 60, 50))], "cov"); d.rectangle([x0, y0, x1, y1], fill=C[2], outline=OUT); d.line([x0 + 3, y0, x0 + 3, y1], fill=C[0])
    _under(g, late=True); g.shape = (x0, y0, x1, y1)


def radio(g):
    """A wireless set on a table, seen from above with its front to the south: dial, knobs and speaker cloth.
    Mid-Century: a walnut cabinet with its cloth grille, a brown bakelite set, a bright plastic set of the fifties, a
    leather-cased transistor with its aerial or a grey service set; Modern: a black or silver radio cassette player
    with two speakers, a clock radio, a hi-fi tuner or a little sports radio; Future Darkness: a smart speaker with a
    lit ring, a pair of them or a wood-fronted digital set. Lit when on."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; on = g.st == "on"; k = _mi(g); W, H = x1 - x0, y1 - y0
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g, felt=False)
    lamp = (250, 200, 110)
    if g.e == MC:
        C = [WALNUT, _R((80, 52, 36), 12), _pk(g, CASE50), _pk(g, [_R((150, 90, 50)), BLACK, REDP]), _pk(g, [YELLOWP, IVORYP, GREENP]), GREYP][k]
        if k == 3: x0, x1 = cx - W // 3, cx + W // 3
        _box(g, (x0, y0, x1, y1), C, 3 if k in (1, 2, 4) else 1)
        if k == 0:
            gr = (196, 168, 116); d.rectangle([x0 + 2, y0 + 2, cx - 1, y1 - 2], fill=gr, outline=C[0])
            for xx in range(x0 + 3, cx - 1, 2): d.line([xx, y0 + 3, xx, y1 - 3], fill=tone(gr, -30))
            dial = (cx + 1, y0 + 2, x1 - 2, cy + 1)
        elif k == 3:
            for yy in range(y0 + 2, cy, 2): d.line([x0 + 2, yy, x1 - 2, yy], fill=C[0])
            d.line([x1 - 2, y0, x1, y0 - 3], fill=NICKEL[4]); dial = (x0 + 2, cy + 1, x1 - 2, y1 - 2)
        elif k == 5:
            for sx in (x0 + 4, x1 - 4): d.ellipse([sx - 3, cy - 3, sx + 3, cy + 3], fill=BLACK[1], outline=OUT)
            dial = (cx - 3, y0 + 2, cx + 3, y1 - 2)
        else:
            for yy in range(y0 + 2, cy, 2): d.line([x0 + 3, yy, x1 - 3, yy], fill=C[1])
            dial = (x0 + 3, cy + 1, x1 - 3, y1 - 2)
            if k == 4: d.ellipse([x1 - 5, cy, x1 - 2, cy + 3], fill=REDP[2], outline=OUT)
        d.rectangle(list(dial), fill=lamp if on else IVORYP[1], outline=OUT); d.line([dial[0] + 2, dial[1], dial[0] + 2, dial[3]], fill=(180, 30, 20))
        if on: g.tm.glow((dial[0] + dial[2]) / 2, (dial[1] + dial[3]) / 2, 14, power=.2)
    elif g.e == MO:
        if k <= 1:                                                                    # radio cassette player
            C = [BLACK, NICKEL][k]; _box(g, (x0, y0 + 1, x1, y1), C, 1); r = H // 2 - 2
            for sx in (x0 + r + 2, x1 - r - 2): d.ellipse([sx - r, cy - r + 1, sx + r, cy + r + 1], fill=BLACK[1], outline=OUT); d.ellipse([sx - 1, cy, sx + 1, cy + 2], fill=NICKEL[3])
            d.rectangle([cx - 3, y0 + 3, cx + 3, y1 - 3], fill=BLACK[0] if not on else (60, 90, 140), outline=OUT)
            d.line([x0 + 2, y0, x1 - 2, y0], fill=NICKEL[4])
        elif k == 2:                                                                  # clock radio
            C = _pk(g, CASE90); _box(g, (x0 + 2, y0 + 1, x1 - 2, y1), C, 2)
            d.rectangle([x0 + 3, cy, x1 - 3, y1 - 2], fill=(26, 20, 20), outline=OUT)
            for kk in range(4): d.rectangle([x0 + 5 + kk * 3, cy + 1, x0 + 6 + kk * 3, y1 - 3], fill=(240, 40, 30))
        elif k == 3:                                                                  # hi-fi tuner, wide and flat
            C = _pk(g, [NICKEL, BLACK]); _box(g, (x0, y0 + 2, x1, y1), C, 0)
            d.rectangle([x0 + 2, y1 - 4, cx + 2, y1 - 2], fill=(110, 190, 230) if on else BLACK[0]); d.ellipse([x1 - 6, y1 - 6, x1 - 2, y1 - 2], fill=C[3], outline=OUT)
        elif k == 4:                                                                  # sports radio with headphones
            C = YELLOWP; _box(g, (cx - 4, y0 + 1, cx + 4, y1 - 1), C, 2); d.rectangle([cx - 2, y0 + 3, cx + 2, cy], fill=BLACK[1])
            d.arc([x0, y0, cx - 2, y1], 90, 270, fill=BLACK[1], width=2); d.ellipse([x0 + 1, y0 + 1, x0 + 5, y0 + 5], fill=BLACK[2], outline=OUT); d.ellipse([x0 + 1, y1 - 5, x0 + 5, y1 - 1], fill=BLACK[2], outline=OUT)
        else:                                                                         # shortwave portable
            C = GREYP; _box(g, (x0, y0 + 1, x1, y1), C, 1)
            for yy in range(y0 + 3, y1 - 1, 2): d.line([x0 + 2, yy, cx - 1, yy], fill=C[0])
            d.rectangle([cx + 1, y0 + 3, x1 - 2, cy + 1], fill=(200, 200, 160) if not on else lamp); d.line([x0, y0, x1, y0], fill=NICKEL[4])
    else:
        C = [CASEFD[0], CASEFD[1], CASEFD[2], OAK, _pk(g, CASES), CASEFD[3]][k]
        if k == 3:                                                                    # wood-fronted digital set
            _box(g, (x0, y0 + 1, x1, y1), C, 2); d.rectangle([x0 + 2, y0 + 3, cx, y1 - 2], fill=BLACK[1]); _screen(g, (cx + 2, y0 + 3, x1 - 2, cy), on)
        elif k == 2 or k == 5:                                                        # a pair of speakers
            r = min(W // 4, H // 2) - 1
            for sx in (x0 + r + 1, x1 - r - 1):
                d.ellipse([sx - r, cy - r, sx + r, cy + r], fill=C[2], outline=OUT); d.ellipse([sx - r + 2, cy - r + 2, sx + r - 2, cy + r - 2], outline=(80, 170, 240) if on else C[0])
        else:
            r = H // 2 - 1
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT)
            for yy in range(cy - r + 2, cy + r - 1, 2): d.line([cx - r + 2, yy, cx + r - 2, yy], fill=C[1])
            d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=(80, 170, 240) if on else C[3])
    _under(g, late=True); _clutter(g); g.shape = (x0, y0, x1, y1)


def tv(g):
    """A television from above with its screen to the south. Mid-Century: a walnut, oak or mahogany cabinet set with
    the round-cornered tube showing at the front, knobs beside it and a rabbit-ear aerial, a console with its doors
    open, a bright plastic portable or a white ball-shaped set; Modern: a big black, grey or silver tube set, perhaps
    over a video recorder, with a games console or a little white portable; Future Darkness: a thin flat screen on
    its foot or feet, with a sound bar, a console or a media unit. The picture glows when on."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; on = g.st == "on"; k = _mi(g)
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g, felt=False); W, H = x1 - x0, y1 - y0
    pic = _pk(g, [(110, 170, 220), (150, 200, 200), (190, 200, 210)], "pic") if g.e > MC else (190, 200, 196)
    if g.e == MC and k == 4:                                                        # the ball set
        C = _pk(g, [WHITEP, REDP, YELLOWP]); r = min(W, H) // 2 - 1
        g.disc(cx, cy, r, C=C); d.ellipse([cx - r + 3, cy, cx + r - 3, cy + r - 1], fill=(28, 34, 36) if not on else pic, outline=OUT)
        d.rectangle([cx - 2, y0, cx + 2, y0 + 2], fill=C[0])
    elif g.e < FD:
        if g.e == MC: C = [WALNUT, OAK, MAHOG, _pk(g, CASE50), None, BLACK][k]
        else: C = [BLACK, GREYP, NICKEL, WALNUT, WHITEP, BLACK][k]
        if (g.e == MC and k == 3) or (g.e == MO and k == 4): x0, x1 = cx - W // 3, cx + W // 3; y0 = y0 + H // 4
        if g.e == MC and k == 2: d.rectangle([x0, y1 - 3, x0 + 3, y1], fill=C[1], outline=OUT); d.rectangle([x1 - 3, y1 - 3, x1, y1], fill=C[1], outline=OUT); x0, x1 = x0 + 3, x1 - 3   # the open doors
        if g.e == MO and k == 2: d.rectangle([x0, y0, x1, y0 + 4], fill=BLACK[2], outline=OUT); d.rectangle([cx - 4, y0 + 2, cx + 4, y0 + 3], fill=BLACK[0]); y0 += 5
        _box(g, (x0, y0, x1, y1), C, 2)
        d.rounded_rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 6], 3, fill=C[1])
        _screen(g, (x0 + 2, y1 - 5, x1 - (6 if g.e == MC else 3), y1 - 1), on, pic)
        if g.e == MC:
            for ky in (y1 - 4, y1 - 2): d.point((x1 - 3, ky), fill=GILT[3] if g.b == 2 else NICKEL[3])
            if k in (1, 3): d.line([cx, y0 + 2, cx - 6, y0 - 3], fill=NICKEL[4]); d.line([cx, y0 + 2, cx + 6, y0 - 3], fill=NICKEL[4])
        if g.e == MO and k == 5:                                                     # a games console and its pads
            d.rectangle([x0 + 3, y0 + 3, x0 + 10, y0 + 7], fill=GREYP[2], outline=OUT); d.line([x0 + 10, y0 + 5, x1 - 4, y0 + 6], fill=OUT)
            d.rectangle([x1 - 7, y0 + 4, x1 - 3, y0 + 7], fill=_pk(g, [GREYP, BLACK, REDP], "pad")[2], outline=OUT)
    else:
        C = [CASEFD[0], NICKEL, OAK, CASEFD[0], WHITEP, CASEFD[2]][k]
        sw = W - (2 if g.b else 6)
        if k == 2:                                                                    # on an easel of three legs
            for lx, ly in ((x0 + 3, y0 + 2), (x1 - 3, y0 + 2), (cx, y1)): d.line([cx, cy, lx, ly], fill=C[1], width=2)
        elif k in (0, 3, 4, 5):                                                       # its media unit
            U = [CASEFD[0], None, None, WALNUT, WHITEP, GREYP][k]
            d.rectangle([x0, y0 + 2, x1, cy + 3], fill=U[2], outline=OUT); d.line([x0 + 1, y0 + 3, x1 - 1, y0 + 3], fill=U[4])
            d.line([cx, y0 + 3, cx, cy + 2], fill=U[0])
        elif k == 1:
            for fx in (cx - sw // 2 + 3, cx + sw // 2 - 3): d.line([fx, cy + 3, fx - 2, cy - 4], fill=C[3], width=2)   # splayed feet
        if k in (0, 3, 5): d.rounded_rectangle([cx - 5, cy - 3, cx + 5, cy + 4], 2, fill=C[1], outline=OUT)      # the foot
        if k == 3: d.arc([cx - sw // 2, cy, cx + sw // 2, cy + 10], 200, 340, fill=C[2], width=3)                 # a curved panel
        else: d.rectangle([cx - sw // 2, cy + 3, cx + sw // 2, cy + 6], fill=C[0] if k != 4 else BLACK[0], outline=OUT)
        _screen(g, (cx - sw // 2 + 1, cy + 4, cx + sw // 2 - 1, cy + 5), on, pic)
        if k in (0, 5): d.rectangle([cx - sw // 3, y1 - 3, cx + sw // 3, y1], fill=C[2], outline=OUT)            # a sound bar
        if k == 5: d.rectangle([x0 + 2, y0 + 2, x0 + 8, y0 + 7], fill=_pk(g, [WHITEP, BLACK], "c")[2], outline=OUT)   # a console
        if on: g.tm.glow(cx, cy + 8, 18, col=(.6, .9, 1.5), power=.3)
    _under(g, late=True); _clutter(g); g.shape = (x0, y0, x1, y1)


def computer(g):
    """A desk computer from above: the monitor at the back with its screen to the south, keyboard and mouse in front.
    Mid-Century (from 1975): a beige box with its monitor on top, a green-screen terminal, a home computer that is all
    keyboard with a television for a screen, or a compact beige box with its own little screen; Modern: a beige,
    grey or black tube monitor and keyboard with the tower beside, a coloured see-through all-in-one or a laptop;
    Future Darkness: thin dark or silver screens, a pair of them, an open laptop or a tablet on a keyboard. Lit when
    on."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; on = g.st == "on"; k = _mi(g)
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g, felt=False); W, H = x1 - x0, y1 - y0
    scr = {MC: (60, 200, 80), MO: (90, 140, 210), FD: (120, 170, 230)}[g.e]
    def desk(C, mh, Kc=None, mouse=False, slim=False):
        if slim:
            d.rectangle([x0 + 4, y0 + mh // 2, cx - 2 + 2, y0 + mh // 2 + 2], fill=C[1], outline=OUT)
            d.rectangle([x0 + 2, y0 + 1, x1 - 2, y0 + 4], fill=C[0], outline=OUT); _screen(g, (x0 + 3, y0 + 2, x1 - 3, y0 + 3), on, scr)
        else:
            _box(g, (x0 + 3, y0, x1 - 3, y0 + mh), C, 2); _screen(g, (x0 + 5, y0 + mh - 4, x1 - 5, y0 + mh - 1), on, scr)
        _keys(g, (x0 + 2, y0 + mh + 2, x1 - 6, y1 - 1), Kc or C)
        if mouse: d.ellipse([x1 - 4, y1 - 6, x1, y1 - 1], fill=(Kc or C)[3], outline=OUT); d.line([x1 - 2, y1 - 6, x1 - 2, y0 + mh + 1], fill=OUT)
    def laptop(C, lw):
        b = (cx - lw // 2, y0 + 2, cx + lw // 2, y1 - 2); mid = (b[1] + b[3]) // 2
        d.rectangle([b[0], b[1], b[2], mid], fill=C[1], outline=OUT); _screen(g, (b[0] + 1, b[1] + 1, b[2] - 1, mid - 1), on, scr)
        _keys(g, (b[0], mid + 1, b[2], b[3]), C); d.rectangle([cx - 3, b[3] - 3, cx + 3, b[3] - 1], fill=C[3])
    if g.e == MC:
        if k == 0: desk(BEIGE, H // 2 + 2); d.rectangle([x1 - 9, y0 + 2, x1 - 5, y0 + 4], fill=BLACK[1])
        elif k == 1: scr = (240, 160, 40) if g.b else scr; desk(GREYP, H // 2 + 2, BLACK)                  # a terminal
        elif k == 2:                                                                  # home computer and a television
            _keys(g, (x0 + 2, cy, x1 - 2, y1 - 2), _pk(g, [BLACK, _R((120, 96, 70), 12), BEIGE], "hk"))
            d.rectangle([x0 + 2, y0 + 1, x1 - 4, cy - 3], fill=_pk(g, [WALNUT, OAK], "tv")[2], outline=OUT); _screen(g, (x0 + 3, cy - 5, x1 - 5, cy - 3), on, (120, 140, 240))
        elif k == 3: _box(g, (cx - 6, y0, cx + 6, cy + 3), BEIGE, 2); _screen(g, (cx - 4, cy - 3, cx + 4, cy + 1), on, (220, 226, 220)); _keys(g, (x0 + 3, cy + 5, x1 - 3, y1 - 1), BEIGE)
        elif k == 4: _keys(g, (x0 + 1, y0 + 4, x1 - 1, y1 - 4), _R((70, 60, 54), 10), REDP[3]); d.rectangle([x0 + 2, y0 + 1, x1 - 2, y0 + 4], fill=BLACK[2], outline=OUT)   # a wedge keyboard computer
        else: desk(BLACK, H // 2, GREYP); d.rectangle([x1 - 3, y0 + 2, x1, y0 + H // 2], fill=BLACK[1], outline=OUT)
    elif g.e == MO:
        if k == 3:                                                                    # see-through coloured all-in-one
            C = _pk(g, [BLUEP, _R((240, 140, 40)), _R((150, 210, 70)), PINKP, TEALP])
            d.rounded_rectangle([x0 + 4, y0, x1 - 4, cy + 3], 5, fill=C[2], outline=OUT); _screen(g, (x0 + 7, y0 + 3, x1 - 7, cy), on, scr)
            _keys(g, (x0 + 4, cy + 5, x1 - 6, y1 - 1), C, WHITEP[2]); d.ellipse([x1 - 4, y1 - 5, x1, y1 - 1], fill=C[3], outline=OUT)
        elif k in (2, 4): laptop([BLACK, GREYP][k // 4], W - 4 - (2 - g.b) * 2)
        else:
            C = [BEIGE, GREYP, None, None, None, BLACK][k]; desk(C, H // 2, mouse=True, slim=k == 5)
            if k == 1: d.rectangle([x0, y0 + 2, x0 + 3, y0 + H // 2], fill=C[1], outline=OUT)
    else:
        if k in (0, 1): laptop([CASEFD[0], CASEFD[1]][k], W - 4 - (2 - g.b) * 2)
        elif k == 2: desk(WHITEP, H // 2, WHITEP, mouse=True, slim=True)
        elif k == 3:                                                                  # two screens
            for sx0, sx1 in ((x0, cx - 1), (cx + 1, x1)): d.rectangle([sx0, y0 + 1, sx1, y0 + 4], fill=BLACK[0], outline=OUT); _screen(g, (sx0 + 1, y0 + 2, sx1 - 1, y0 + 3), on, scr)
            _keys(g, (x0 + 4, cy, x1 - 6, y1 - 3), BLACK)
        elif k == 4: _box(g, (x0 + 2, y0, x1 - 2, cy + 2), NICKEL, 1); _screen(g, (x0 + 4, y0 + 2, x1 - 4, cy), on, scr); _keys(g, (x0 + 5, cy + 5, x1 - 5, y1 - 2), NICKEL, WHITEP[3])
        else:
            C = _pk(g, CASES); d.rounded_rectangle([x0 + 3, y0 + 2, x1 - 3, cy], 2, fill=CASEFD[0][1], outline=OUT); _screen(g, (x0 + 4, y0 + 3, x1 - 4, cy - 1), on, scr)
            _keys(g, (x0 + 3, cy + 2, x1 - 3, y1 - 2), C)
    if on and g.e != MC: g.tm.glow(cx, cy, 16, col=(.7, .9, 1.4), power=.2)
    _under(g, late=True); g.shape = (x0, y0, x1, y1)


def typewriter(g):
    """A typewriter from above, the platen across the back and the rows of round keys in front. Victorian: blind
    up-strike machines whose carriage hides the sheet, in black with gilt lines, the painted early machine on its
    own table, an olive-green down-strike machine, a little nickel portable or a curved-key machine in its wooden
    case; Great War: front-strike office machines with their open fan of type bars and the sheet standing up, a
    folding portable or a field machine in its box; Mid-Century: black office machines, red, green or cream
    portables, grey and blue electrics with their type ball; Modern (to 1995): beige, grey or black electronic
    machines and word processors with a strip screen."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx = g.cx; H = y1 - y0; k = _mi(g); py = y0 + H // 4
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g, felt=True)
    if g.e == VI: C = [BLACK, IVORYP, _R((110, 120, 70), 14), NICKEL, OAK, _R((70, 40, 36), 10)][k]
    elif g.e == GW: C = [BLACK, BLACK, _R((60, 66, 50), 12), BLACK, NICKEL, OAK][k]
    elif g.e == MC: C = [BLACK, GREENP, REDP, GREYP, BLUEP, IVORYP][k]
    else: C = [BEIGE, GREYP, BLACK, WHITEP, BLUEP, _R((60, 64, 74), 12)][k]
    bx0, bx1 = x0 + 2, x1 - 2
    if (g.e == VI and k == 3) or (g.e == GW and k in (1, 4)) or (g.e == MC and k in (1, 2, 5)): bx0, bx1 = x0 + 4, x1 - 4
    if (g.e == VI and k == 4) or (g.e == GW and k in (2, 5)): d.rounded_rectangle([x0, py - 1, x1, y1], 3, fill=(OAK if k != 2 else _R((90, 80, 50), 12))[1], outline=OUT); bx0, bx1 = x0 + 3, x1 - 3
    if g.e == VI and k == 1: d.rectangle([x0, y0, x1, y1], fill=WALNUT[1], outline=OUT)
    _box(g, (bx0, py, bx1, y1 - 1), C, 2)
    d.rounded_rectangle([bx0 - 2, py - 2, bx1 + 2, py + 2], 2, fill=BLACK[1], outline=OUT)
    d.rectangle([bx0 - 2, py - 1, bx0 - 1, py + 1], fill=NICKEL[3])
    paper = g.v.get("contents", "sheet")
    if g.e == VI:                                                                  # the carriage hides the sheet
        if paper != "none": d.rectangle([cx - 6, y0, cx + 6, y0 + 4], fill=(244, 242, 232) if paper == "sheet" else (110, 130, 200), outline=(150, 146, 130))   # the sheet curling out at the back
        d.rectangle([bx0, y0 + 4, bx1, py + 3], fill=C[1], outline=OUT); d.line([bx0 + 2, y0 + 6, bx1 - 2, y0 + 6], fill=GILT[3])
        if k == 1:
            for fx in (bx0 + 2, bx1 - 3): d.point((fx, py + 5), fill=(220, 80, 80)); d.point((fx + 1, py + 6), fill=GILT[4])
    else:
        if paper != "none":
            pc = (244, 242, 232) if paper == "sheet" else (110, 130, 200)
            d.rectangle([cx - 5, y0, cx + 5, py - 2], fill=pc, outline=(180, 176, 164))
            for yy in range(y0 + 2, py - 2, 2): d.line([cx - 4, yy, cx + 2, yy], fill=(120, 120, 130))
        if (g.e == GW and k in (0, 3)) or (g.e == MC and k == 0): d.pieslice([cx - 6, py, cx + 6, py + 10], 0, 180, fill=C[0], outline=OUT)
    if (g.e == MC and k in (3, 4)) or (g.e == MO and k == 4): d.ellipse([cx - 2, py + 2, cx + 2, py + 6], fill=NICKEL[3], outline=OUT)
    if g.e == MO and k in (3, 5): d.rectangle([cx - 6, py + 3, cx + 6, py + 5], fill=(150, 190, 140) if k == 3 else (60, 200, 220), outline=OUT)
    kc = (236, 232, 220) if g.e <= MC else C[0]
    for row in range(3):
        yy = y1 - 3 - row * 2
        for xx in range(bx0 + 2 + row % 2, bx1 - 1, 2): d.point((xx, yy), fill=kc)
    _under(g, late=True); g.shape = (x0, y0, x1, y1)


def gramophone(g):
    """A record player from above. Victorian: a wooden box with its turntable, crank and a great flower horn of
    brass or painted tin, or a cylinder phonograph with its small horn; Great War: a cabinet set with its lid up and
    doors at the front over the hidden horn, or a table set with its flower horn; Mid-
    Century: a cabinet set, a cloth-covered portable with its lid up, a two-tone portable or a radiogram; Modern: a
    hi-fi turntable under a smoked lid, in black, silver or on a wooden plinth, or beside its amplifier; Future
    Darkness: a deck in black, white or wood, perhaps with a mixer. The record's label is the maker's colour."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; k = _mi(g)
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g); W, H = x1 - x0, y1 - y0
    lab = _pk(g, [(200, 40, 40), (40, 70, 160), (230, 200, 60), (230, 230, 220), (60, 130, 70)], "lab")
    if g.e == VI: form = ["horn", "horn", "horn", "cyl", "horn", "cyl"][k]; C = [OAK, MAHOG, WALNUT, BLACK, OAK, _R((60, 80, 60), 12)][k]
    elif g.e == GW:
        form = ["cabinet", "horn", "cabinet", "horn", "cabinet", "horn"][k]; C = [MAHOG, OAK, OAK, BLACK, WALNUT, MAHOG][k]
        if g.b == 0: C = _R(mix(C[2], (176, 136, 84), .55), 14)                  # a cheap stained-pine case
    elif g.e == MC: form = ["flat", "case", "case", "radiogram", "flat", "case"][k]; C = [WALNUT, _pk(g, CASE50), _pk(g, [REDP, BLUEP, TEALP]), MAHOG, OAK, IVORYP][k]
    elif g.e == MO: form = ["smoked", "smoked", "smoked", "amp", "flat", "flat"][k]; C = [BLACK, NICKEL, WALNUT, BLACK, GREYP, OAK][k]
    else: form = ["flat", "flat", "flat", "flat", "amp", "flat"][k]; C = [CASEFD[0], WHITEP, OAK, CASEFD[2], CASEFD[0], _pk(g, CASES)][k]
    hl = form == "horn" and g.e == GW and k in (3, 5)                             # some horns swing to the left
    if form == "horn": bb = (x0, cy - H // 4, cx + 4, y1) if not hl else (cx - 4, cy - H // 4, x1, y1)
    elif form in ("case", "lid"): bb = (x0, y0 + H // 4, x1, y1)
    elif form == "cabinet": bb = (x0, y0 + H // 4, x1, y1 - H // 4)
    elif form == "amp": bb = (x0, y0 + 2, cx + 3, y1)
    else: bb = (x0, y0, x1, y1) if g.e < FD else (x0 + 3, y0 + 3, x1 - 3, y1 - 3)
    _box(g, bb, C, 1)
    if g.e == GW and g.b == 2: d.rectangle([bb[0] + 1, bb[1] + 1, bb[2] - 1, bb[3] - 1], outline=GILT[3])   # gilt beading
    if form == "cyl":                                                              # cylinder phonograph
        d.rectangle([x0 + 3, cy - 3, x1 - 3, cy + 3], fill=(40, 30, 26), outline=OUT); d.line([x0 + 4, cy - 2, x1 - 4, cy - 2], fill=(110, 90, 70))
        hn = BRASS if g.e == VI else NICKEL
        d.ellipse([cx - 5, y0, cx + 5, y0 + 7], fill=hn[2], outline=OUT); d.ellipse([cx - 2, y0 + 2, cx + 2, y0 + 5], fill=hn[0])
        _under(g, late=True); g.shape = (x0, y0, x1, y1); return
    r = min(bb[2] - bb[0], bb[3] - bb[1]) // 2 - 2; tc = ((bb[0] + bb[2]) // 2 - (2 if form != "horn" else 0), (bb[1] + bb[3]) // 2)
    d.ellipse([tc[0] - r, tc[1] - r, tc[0] + r, tc[1] + r], fill=(26, 24, 26), outline=OUT)
    d.arc([tc[0] - r + 2, tc[1] - r + 2, tc[0] + r - 2, tc[1] + r - 2], 200, 260, fill=(90, 90, 96))
    lr_ = 2 if r >= 6 else 1; d.ellipse([tc[0] - lr_, tc[1] - lr_, tc[0] + lr_, tc[1] + lr_], fill=lab)
    d.line([bb[2] - 2, bb[1] + 2, tc[0] + 2, tc[1] - 2], fill=NICKEL[4] if g.e < FD else (90, 170, 240))
    if form == "horn":
        Hn = [BRASS, _pk(g, [GREENP, REDP, BLUEP], "horn"), BLACK, BRASS, _pk(g, [GREENP, REDP], "h2"), BRASS][k] if g.b < 2 else GILT
        hr = max(4, min(x1 - cx, cy - y0) * 3 // 4); hc = (x1 - hr - 1, y0 + hr) if not hl else (x0 + hr + 1, y0 + hr)
        d.line([tc[0] + 2, tc[1] - 2, hc[0], hc[1]], fill=Hn[1], width=3)
        d.ellipse([hc[0] - hr, hc[1] - hr, hc[0] + hr, hc[1] + hr], fill=Hn[2], outline=OUT)
        for kk in range(1, 4): d.ellipse([hc[0] - hr * kk // 4, hc[1] - hr * kk // 4, hc[0] + hr * kk // 4, hc[1] + hr * kk // 4], outline=Hn[0 if kk % 2 else 3])
        d.ellipse([hc[0] - 1, hc[1] - 1, hc[0] + 1, hc[1] + 1], fill=(30, 24, 20))   # the dark throat
    elif form == "cabinet":                                                        # a cabinet: lid up behind, doors to the horn at the front
        d.rectangle([x0, y0, x1, bb[1] - 1], fill=C[1], outline=OUT); d.line([x0 + 2, y0 + 2, x1 - 2, y0 + 2], fill=C[3])
        d.rectangle([x0, bb[3] + 1, x1, y1], fill=C[2], outline=OUT); mx = (x0 + x1) // 2
        d.line([mx, bb[3] + 1, mx, y1], fill=OUT)
        if k == 2:                                                                 # fretwork grille doors
            for xx in range(x0 + 2, x1 - 1, 2): d.line([xx, bb[3] + 2, xx, y1 - 2], fill=C[0])
        else:
            for xx in (x0 + 2, mx + 2): d.rectangle([xx, bb[3] + 2, xx + (x1 - x0) // 2 - 5, y1 - 2], outline=C[0])   # door panels
        if k == 4: d.rectangle([x0 + 2, y0 + 1, x1 - 2, bb[1] - 2], fill=_R((150, 30, 40), 10)[2])   # the lid lined in baize
        for xx in (mx - 2, mx + 2): d.point((xx, (bb[3] + y1) // 2 + 1), fill=BRASS[4] if g.b < 2 else GILT[4])
    elif form in ("case", "lid"):                                                  # the lid standing up behind
        d.rectangle([x0, y0, x1, y0 + H // 4 - 1], fill=C[1], outline=OUT)
        if form == "case" and g.e == MC: d.rectangle([x0, y0, x1, y0 + 2], fill=IVORYP[2])
        if form == "case" and g.e == GW: d.line([x0 + 2, y0 + 2, x1 - 2, y0 + 2], fill=NICKEL[3])
    elif form == "smoked": d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], outline=(110, 110, 120))
    elif form == "amp":
        d.rectangle([cx + 5, y0 + 2, x1, y1], fill=BLACK[1], outline=OUT)
        for yy in range(y0 + 4, y1 - 1, 3): d.point((cx + 7, yy), fill=(240, 60, 40)); d.point((x1 - 3, yy), fill=NICKEL[3])
    elif form == "radiogram" or (form == "flat" and g.e <= MC):
        for xx in range(x1 - 6, x1 - 1, 2): d.line([xx, y0 + 2, xx, y1 - 2], fill=C[0])
    sl = g.v.get("records", "none")                                              # records out of their sleeves
    if sl != "none":
        sc = _pk(g, [(230, 200, 60), (200, 60, 50), (60, 110, 180), (230, 226, 210), (70, 140, 80)], "sleeve") if g.e >= MC else (200, 180, 140)
        n = 1 if sl == "sleeve" else 3
        if g.e == GW:                                                              # laid on the lid or by the horn, clear of the turntable
            rx, ry = (x0 + 1, y0) if form == "cabinet" else ((x1 - 10, y1 - 9) if not hl else (x0, y1 - 9))
            if sl == "sleeve": d.rectangle([rx, ry, rx + 9, ry + 8], fill=(226, 214, 180), outline=OUT); d.ellipse([rx + 3, ry + 2, rx + 6, ry + 5], fill=(30, 28, 30))
            else:
                for j_ in range(3): d.ellipse([rx + j_, ry + j_ // 2, rx + 7 + j_, ry + 7 + j_ // 2], fill=(28, 26, 28), outline=OUT)
                d.point((rx + 5, ry + 4), fill=lab)
        else:
            for j_ in range(n): d.rectangle([x0 + j_ * 2, y1 - 12 + j_, x0 + 11 + j_ * 2, y1 - 1 + j_ // 2], fill=tone(sc, -20 * j_), outline=OUT)
            d.ellipse([x0 + 3, y1 - 9, x0 + 8, y1 - 4], fill=(30, 28, 30))
    _under(g, late=True); g.shape = (x0, y0, x1, y1)


def clock(g):
    """A table or mantel clock from above with its dial to the south. Age of Reason: an ebony, walnut or mahogany
    bracket clock with a brass handle and dial, a brass lantern clock, a red tortoiseshell and brass case or a gilt
    one; Victorian: a black marble, gilt, white porcelain or wooden mantel clock or a brass carriage clock with glass
    sides; Great War: a nickel or painted alarm clock with twin bells, an oak mantel clock or a wrist-watch on its
    stand; Mid-Century: a chrome, walnut or bright plastic electric clock, an arched mantel clock or a squat alarm
    clock; Modern: a digital clock with red, green or blue numerals; Future Darkness: a dark or light slab with lit
    numerals. Clocks of every age came from a few great makers for every market."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx, cy = g.cx, g.cy; W, H = x1 - x0, y1 - y0; k = _mi(g)
    g.shadow(x0, y0, x1, y1, kind="rect"); _under(g)
    def dial(cx_, r, face=(240, 236, 220), C=BLACK):
        d.ellipse([cx_ - r, y1 - 2 * r, cx_ + r, y1], fill=face, outline=OUT)
        d.line([cx_, y1 - r, cx_, y1 - 2 * r + 1], fill=C[0]); d.line([cx_, y1 - r, cx_ + r - 1, y1 - r], fill=C[0])
    if g.e <= VI:
        if g.e == AR: C = [_R((40, 34, 32), 12), WALNUT, BRASS, MAHOG, _R((170, 70, 30), 16), GILT][k]
        else: C = [_R((30, 30, 34), 14), GILT, BRASS, OAK, WHITEP, _R((90, 110, 90), 12)][k]
        glass = k == 2
        hw = int(W * [.32, .4, .25, .48, .36, .44][k]); x0, x1 = cx - hw, cx + hw         # each model its own width
        _box(g, (x0, y0 + 1, x1, y1), C, 1 if not glass else 0)
        if glass:
            d.rectangle([x0 + 2, y0 + 3, x1 - 2, y1 - 3], fill=(150, 180, 190)); d.line([cx, y0 + 1, cx, y1 - 3], fill=C[1])
            d.arc([x0 + 3, y0 - 1, x1 - 3, y0 + 5], 180, 360, fill=C[3])
        else: d.rectangle([cx - 4, y0, cx + 4, y0 + 2], fill=BRASS[3] if C is not BRASS else BLACK[2], outline=OUT)
        if g.e == AR and k != 2:
            for sx in (x0 + 1, x1 - 2): d.rectangle([sx, y0 + 2, sx + 1, y1 - 1], fill=BRASS[2])         # brass corner mounts
        if g.e == VI and k == 0:
            for xx in range(x0 + 2, x1 - 1, 4): d.line([xx, y0 + 3, xx + 2, y0 + 5], fill=(90, 90, 96))      # the marble's veins
        dial(cx, min(3, H // 2), (230, 200, 120) if g.e == AR else (240, 236, 222))
    elif g.e <= MC:
        if g.e == GW: form = ["alarm", "alarm", "arch", "watch", "alarm", "box"][k]; C = [NICKEL, _pk(g, [REDP, BLUEP, GREENP]), OAK, WALNUT, BRASS, MAHOG][k]
        else: form = ["box", "arch", "box", "squat", "box", "sun"][k]; C = [NICKEL, WALNUT, _pk(g, CASE50), _pk(g, [REDP, IVORYP, GREENP]), BLACK, GILT][k]
        if form == "alarm":
            r = H // 2 - 1
            for sx in (cx - r, cx + r): d.ellipse([sx - 2, y0, sx + 2, y0 + 4], fill=NICKEL[3], outline=OUT)
            d.ellipse([cx - r - 1, y1 - 2 * r - 1, cx + r + 1, y1], fill=C[2], outline=OUT); dial(cx, r - 3)
        elif form == "watch":                                                       # a wrist-watch laid on the shelf
            d.rectangle([x0 + 2, cy - 2, x1 - 2, cy + 2], fill=_R((120, 76, 40), 12)[2], outline=OUT)
            for xx in range(x0 + 4, x1 - 3, 3): d.point((xx, cy), fill=_R((120, 76, 40), 12)[0])
            d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=NICKEL[2], outline=OUT); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(240, 236, 222))
        elif form == "squat":
            d.rounded_rectangle([cx - H // 2 - 2, y0 + 1, cx + H // 2 + 2, y1], 3, fill=C[2], outline=OUT); dial(cx, H // 2 - 1)
        elif form == "sun":                                                         # a sunburst wall clock laid on the shelf
            for a in range(0, 360, 30): d.line([cx, cy, cx + math.cos(math.radians(a)) * (W // 2), cy + math.sin(math.radians(a)) * (H // 2)], fill=C[2])
            d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(250, 248, 240), outline=OUT)
        else:
            hw = int(W * [.5, .42, .36, .5, .3, .46][k]); x0, x1 = cx - hw, cx + hw
            _box(g, (x0, y0 + 2, x1, y1), C, 3 if form == "arch" else 1)
            if form == "arch": d.arc([x0, y0, x1, y0 + 8], 180, 360, fill=C[3])
            if g.e == MC and form == "box": d.line([x0 + 1, cy, x1 - 1, cy], fill=C[0])
            dial(cx, min(3, H // 2), (240, 236, 222) if form == "arch" else (250, 250, 246))
    else:
        C = (CASE90 + [REDP, _R((60, 64, 74), 12)] if g.e == MO else CASEFD + [OAK, _pk(g, CASES)])[k]
        hw = int(W * [.5, .3, .44, .36, .5, .26][k]); x0, x1 = cx - hw, cx + hw
        _box(g, (x0, y0 + 1 + (k % 3) * 2, x1, y1), C, 2 if k % 2 else 1)
        nc = _pk(g, [(240, 40, 30), (80, 230, 90), (110, 180, 250)], "led")
        d.rectangle([x0 + 2, y1 - 4, x1 - 2, y1 - 1], fill=(20, 18, 18), outline=OUT)
        for kk in range(4): d.rectangle([x0 + 3 + kk * (W - 4) // 4, y1 - 3, x0 + 3 + kk * (W - 4) // 4 + 1, y1 - 2], fill=nc)
        if g.e == FD and k in (0, 2): d.rectangle([x0 + 3, y0 + 3, x1 - 3, y0 + 5], fill=g.GL[1])            # a lit strip
    _under(g, late=True); g.shape = (x0, y0, x1, y1)


BONE = [_R((240, 238, 230), 8), _R((228, 200, 136), 10), _R((180, 140, 90), 12), _R((130, 90, 56), 12), _R((90, 70, 56), 10), _R((176, 188, 168), 10)]


def skull(g):
    """A human skull from above, its face to the south: the round dome with its seams, the dark eye holes and the
    teeth, and the jaw lying apart. White, yellowed, brown from the earth, dark from a bog or green with moss; some
    hold a candle stuck on with old wax, some lie on crossed bones, some are cracked, drilled or written on. A skull
    is a skull anywhere, so it varies by age, colour and what was done with it."""
    d = g.d; X0, Y0, X1, Y1 = g.x0, g.y0, g.x1 - 1, g.y1 - 1; cx = g.cx
    kind = g.v.get("kind", "bare"); B = BONE[_mi(g)]
    if kind == "mossy": B = ramp(mix(B[2], (70, 140, 50), .7), 12)
    if g.e == LN: B = ramp(mix(B[2], (240, 240, 232), .45), 8)                     # limed in a plague pit
    if g.e == MO: B = ramp(mix(B[2], (246, 244, 236), .6), 6)                      # a cast teaching skull
    g.shadow(X0, Y0, X1, Y1)
    x0, y0, x1, y1 = X0, Y0, X1, Y1; W, H = x1 - x0, y1 - y0
    # what it lies on in each age: earth, a sack, a vanitas book, a turned stand, a phrenologist's cloth, a
    # helmet beside it, a black teaching base, a clear stand, a dark plinth
    under = {DA: [(76, 56, 38), (190, 160, 90), (140, 30, 40)], LN: [(210, 206, 190), (150, 130, 96), (40, 36, 40)],
             RE: [(150, 110, 70), (110, 70, 40), (150, 30, 40)], AR: [(200, 186, 150), (150, 104, 60), (120, 30, 50)],
             VI: [(220, 214, 196), (40, 60, 90), (90, 40, 100)], GW: [(160, 140, 100), (90, 92, 64), (60, 110, 70)],
             MC: [(190, 150, 100), (34, 32, 32), (200, 204, 210)], MO: [(180, 150, 110), (190, 214, 220), (236, 236, 232)],
             FD: [(90, 94, 100), (40, 42, 48), (40, 42, 48)]}[g.e][g.b]
    if under is not None and g.w % 2: under = tone(under, 40) if sum(under) < 450 else tone(under, -50)   # the next household's, lighter or darker
    if under is not None:
        if g.e in (DA, LN) and g.b == 0: d.polygon([(x0, y1), (x0 + 1, y0 + 3), (cx, y0), (x1, y0 + 4), (x1, y1)], fill=under)
        elif g.e in (RE,) and g.b: d.rectangle([x0, y0 + H // 4, x1, y1], fill=under, outline=OUT); d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=(236, 226, 196))   # a book
        elif (g.e in (AR, MC) and g.b == 1) or (g.e == FD and g.b == 1): d.ellipse([x0, y0 + H // 4, x1, y1], fill=under, outline=OUT)                                   # a stand
        elif g.e == GW and g.b == 1: d.ellipse([x0 - 1, y0 + H // 3, x1 + 1, y1 + 1], fill=under, outline=OUT); d.ellipse([x0 + 1, y0 + H // 3 + 2, x1 - 1, y1 - 1], fill=tone(under, 20))   # a tin helmet
        else: d.rectangle([x0, y0, x1, y1], fill=under, outline=tone(under, -30))                                                                  # a cloth, sack or board
        if g.b == 2 and g.e not in (FD,): d.rectangle([x0, y0, x1, y1], outline=GILT[2])
        if g.e == FD and g.b == 2: d.rectangle([x0, y0, x1, y1], outline=g.GL[1])
    x0, y0, x1, y1 = X0 + 2, Y0 + 1, X1 - 2, Y1 - 2; W, H = x1 - x0, y1 - y0           # the skull itself, on its bed
    if kind == "bones":
        for a, b_ in (((x0, y0 + 2), (x1, y1)), ((x1, y0 + 2), (x0, y1))): d.line([a, b_], fill=B[1], width=2)
    rx = W // 2; dh = H * 3 // 4 if kind != "jaw" else H * 2 // 3
    d.ellipse([cx - rx, y0, cx + rx, y0 + dh], fill=B[2], outline=OUT)
    fy1 = y0 + dh + 2
    d.rounded_rectangle([cx - rx + 2, y0 + dh // 2 + 1, cx + rx - 2, fy1], 2, fill=B[1], outline=OUT)
    d.line([cx, y0 + 1, cx, y0 + dh // 3], fill=B[0]); d.line([cx - rx + 2, y0 + dh // 3, cx + rx - 2, y0 + dh // 3], fill=B[0])
    d.point((cx - 2, y0 + 2), fill=B[4]); d.point((cx - 3, y0 + 3), fill=B[4])
    ey = y0 + dh // 2 + 2
    for sx in (cx - 3, cx + 1): d.rectangle([sx, ey, sx + 1, ey + 1], fill=(20, 14, 12))
    for xx in range(cx - 2, cx + 3): d.point((xx, fy1 - 1), fill=B[4] if xx % 2 else B[0])
    if kind == "jaw": d.arc([cx - rx + 1, fy1, cx + rx - 1, y1 + 3], 180, 360, fill=B[1], width=2)
    if kind == "candle":
        Cw = _pk(g, [(236, 228, 200), (200, 60, 50), (40, 36, 34)], "wax")
        d.ellipse([cx - 3, y0, cx + 3, y0 + 5], fill=Cw, outline=OUT); d.ellipse([cx - 1, y0 + 1, cx + 1, y0 + 3], fill=(240, 220, 160))
        d.line([cx + 2, y0 + 4, cx + 3, ey], fill=Cw); d.line([cx - 3, y0 + 3, cx - 4, y0 + 7], fill=Cw)
    elif kind == "drilled": d.ellipse([cx + 1, y0 + 2, cx + 3, y0 + 4], fill=(20, 14, 12)); d.line([cx - 4, y0 + 3, cx - 1, y0 + 6], fill=OUT)
    elif kind == "inscribed":
        for yy in (y0 + 3, y0 + 5): d.line([cx - rx + 2, yy, cx + rx - 2, yy], fill=(150, 40, 30))
    if g.e == VI:                                                                  # phrenology lines inked on the dome
        d.line([cx - rx + 2, y0 + 4, cx + rx - 2, y0 + 4], fill=(30, 30, 40)); d.point((cx - 2, y0 + 6), fill=(30, 30, 40))
    if g.e == FD:
        for sx in (cx - 3, cx + 1): d.point((sx, ey), fill=g.GL[2])
    if g.b == 2 and kind in ("bare", "inscribed"): d.rectangle([x0, y1 + 1, x1, y1 + 2], fill=GILT[2])
    g.shape = (X0, Y0, X1, Y1)


def specimen(g):
    """A specimen jar from above: the rim and cover, and through the spirit what it keeps: a curled snake, a heart, a
    brain, a fish, an eye or a hand. Renaissance: green forest glass, its bladder cover untied and laid by; Age of Reason: clear glass
    sealed with red wax; Victorian: a paper label in ink; Great War: a clamped glass lid on its wire; Mid-Century: a
    square museum jar with a black lid; Modern: a plastic tub with a white screw lid and printed label; Future
    Darkness: a dark sealed cylinder with a lit rim. The well-kept stand on a wooden plinth, the poor are bare.
    Cabinets and laboratories everywhere used the same jars."""
    d = g.d; cx, cy = g.cx, g.cy; R = min(g.W, g.H) // 2; what = g.v.get("contents", "snake"); k = _mi(g)
    fl = [(214, 180, 80), (150, 210, 120), (240, 236, 220), (120, 170, 210), (200, 110, 60), (110, 100, 50)][k]
    g.shadow(cx - R, cy - R, cx + R, cy + R)
    if g.w >= 4:                                                                   # the corners of its plinth
        for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)): d.rectangle([cx + sx * R - (3 if sx > 0 else 0), cy + sy * R - (3 if sy > 0 else 0), cx + sx * R + (0 if sx > 0 else 3), cy + sy * R + (0 if sy > 0 else 3)], fill=(WALNUT if g.w == 5 else GILT)[2], outline=OUT)
    r = R if g.w >= 2 else R - 2                                                   # the poor keep smaller jars
    if g.e == FD: fl = mix(fl, (40, 44, 50), .4)
    rim = {RE: (60, 110, 70), AR: (170, 196, 200), VI: (150, 180, 186), GW: (130, 150, 150), MC: (100, 110, 120), MO: (236, 236, 232), FD: (40, 44, 50)}[g.e]
    shp = ["round", "square", "oct"][(k + (g.e == MC)) % 3]               # cylinder, square or eight-sided jars
    def jar(rr, col, out=None):
        if shp == "round": d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col, outline=out)
        elif shp == "square": d.rectangle([cx - rr, cy - rr, cx + rr, cy + rr], fill=col, outline=out)
        else: d.polygon([(cx + math.cos(math.pi / 8 + a * math.pi / 4) * rr * 1.08, cy + math.sin(math.pi / 8 + a * math.pi / 4) * rr * 1.08) for a in range(8)], fill=col, outline=out)
    jar(r, rim, OUT); ir = r - 2; jar(ir, fl)
    pc = {"snake": (90, 110, 50), "heart": (150, 40, 40), "brain": (236, 196, 190), "fish": (160, 170, 180), "eye": (246, 240, 230), "hand": (226, 190, 160)}[what]
    if what == "snake": d.arc([cx - ir + 1, cy - ir + 1, cx + ir - 1, cy + ir - 1], 30, 330, fill=pc, width=2); d.arc([cx - 2, cy - 2, cx + 2, cy + 2], 0, 270, fill=pc)
    elif what == "fish": d.ellipse([cx - ir + 1, cy - 2, cx + ir - 1, cy + 2], fill=pc, outline=tone(pc, -60)); d.point((cx - ir + 3, cy - 1), fill=OUT)
    elif what == "eye": d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=pc, outline=(150, 60, 60)); d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=_pk(g, [(60, 100, 150), (90, 60, 30), (70, 120, 80)], "iris"))
    elif what == "hand":
        d.rectangle([cx - 2, cy, cx + 2, cy + ir - 1], fill=pc)
        for kk in range(4): d.line([cx - 3 + kk * 2, cy, cx - 3 + kk * 2, cy - ir + 1], fill=pc)
    else:
        d.ellipse([cx - ir + 1, cy - ir + 1, cx + ir - 1, cy + ir - 1], fill=pc, outline=tone(pc, -50))
        if what == "brain": d.line([cx, cy - ir + 2, cx, cy + ir - 2], fill=tone(pc, -60)); d.arc([cx - 3, cy - 3, cx + 1, cy + 1], 0, 180, fill=tone(pc, -50))
        else: d.line([cx - 1, cy - ir + 1, cx + 1, cy - ir - 1], fill=(220, 220, 230), width=2)
    if g.e == RE:                                                                  # the bladder, untied and laid aside
        d.ellipse([cx + r - 6, cy - r - 1, cx + r + 1, cy - r + 6], fill=(210, 190, 150), outline=(120, 90, 50))
    elif g.e == AR: d.ellipse([cx + r - 5, cy - r - 1, cx + r + 1, cy - r + 5], fill=(170, 30, 30), outline=OUT)        # the wax seal
    elif g.e == VI: d.rectangle([cx - 3, cy + r - 3, cx + 3, cy + r - 1], fill=(240, 232, 206), outline=(120, 110, 90))
    elif g.e == GW: d.line([cx - r, cy, cx + r, cy], fill=NICKEL[1]); d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=NICKEL[3])   # the clamp
    elif g.e == MC: d.rectangle([cx + r - 5, cy - r - 1, cx + r + 1, cy - r + 5], fill=BLACK[2], outline=OUT)
    elif g.e == MO: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=WHITEP[2], width=2); d.rectangle([cx - 3, cy + r - 3, cx + 3, cy + r - 1], fill=(60, 120, 200))
    else: d.arc([cx - r, cy - r, cx + r, cy + r], 0, 180, fill=g.GL[1])
    if g.w == 3: d.rectangle([cx - R, cy + R - 3, cx - R + 4, cy + R], fill=(240, 236, 220), outline=OUT)   # a tag on a string
    g.spill = fl; g.shape = (cx - R, cy - R, cx + R, cy + R)


def bloodbag(g):
    """A unit of blood: from 1940 a glass bottle with a rubber bung and a paper label; from the 1950s a flat plastic
    bag, its label banded in the blood group's colour (yellow A, pink B, blue O, white AB), a tube coiled from its
    port, sometimes two or three bags in a stack or a tray; packed cells darker, plasma yellow. Full, half used or
    drained; Future Darkness bags carry a lit tag. Blood banks everywhere use the same bags."""
    d = g.d; x0, y0, x1, y1 = _xy(g); cx = g.cx; H = y1 - y0; k = _mi(g)
    fill = g.v.get("contents", "full"); grp = _pk(g, [(236, 204, 60), (236, 140, 170), (80, 130, 210), (240, 240, 236)], "grp")
    red = [(120, 12, 20), (90, 8, 14), (120, 12, 20), (220, 190, 80), (140, 20, 30), (110, 10, 18)][k]
    lvl = {"full": 1.0, "half": .5, "drained": .15}[fill]
    g.shadow(x0, y0, x1, y1, kind="rect")
    if g.e == MC and k in (0, 4):                                                   # the glass bottle, laid down
        bb = (x0 + 1, y0 + 3, x1 - 1, y1)
        d.rounded_rectangle(list(bb), 3, fill=(190, 210, 214), outline=(70, 90, 96))
        d.rounded_rectangle([bb[0] + 1, bb[3] - int((bb[3] - bb[1]) * lvl), bb[2] - 1, bb[3] - 1], 2, fill=red)
        d.rectangle([cx - 2, y0, cx + 2, y0 + 3], fill=(150, 60, 40), outline=OUT)
        d.rectangle([bb[0] + 2, bb[1] + 3, bb[2] - 2, bb[1] + 6], fill=(240, 236, 220))
    else:
        if k == 2: d.rectangle([x0 - 1, y0 + 1, x1 + 1, y1 + 1], fill=_pk(g, [(80, 120, 200), (230, 230, 226), (200, 200, 60)], "tray"), outline=OUT)   # a tray
        Bc = (200, 214, 214) if g.e < FD else (70, 76, 90)
        n = 2 if k == 5 else 1
        for j in range(n):
            ox = j * 2
            d.rounded_rectangle([x0 + ox, y0 + 3 + ox, x1 - (n - 1 - j) * 2, y1], 2, fill=Bc, outline=(80, 90, 96))
        top = y1 - 1 - int((H - 5) * lvl)
        d.rectangle([x0 + 1, top, x1 - 1, y1 - 1], fill=red); d.line([x0 + 1, top, x1 - 1, top], fill=tone(red, 50))
        ly = y0 + 5 + (2 if lvl < .6 else 0)
        lab = (244, 242, 236) if g.e < FD else (30, 32, 38)
        d.rectangle([x0 + 2, ly, x1 - 2, ly + 4], fill=lab, outline=grp); d.rectangle([x0 + 2, ly, x0 + 4, ly + 4], fill=grp)
        if g.e == FD: d.line([x0 + 5, ly + 2, x1 - 3, ly + 2], fill=g.GL[2])
        for px_ in (cx - 2, cx + 2): d.rectangle([px_ - 1, y0, px_, y0 + 3], fill=(210, 214, 210), outline=OUT)
        if k in (1, 3): d.arc([x1 - 6, y0 - 2, x1 + 1, y0 + 6], 270, 90, fill=red if fill != "drained" else (200, 200, 196))
        if g.e == FD: d.rectangle([x1 - 3, y0 + 4, x1 - 2, y0 + 5], fill=g.GL[2])
    g.spill = red; g.shape = (x0, y0, x1, y1)


def needle(g):
    """A syringe laid in its case, a kidney dish or on a cloth: a glass barrel in nickel fittings with finger rings
    and a long steel needle, in Victorian times in a velvet-lined case, in the Great War in a steel or khaki field
    case, in Mid-Century in an enamel or steel dish, with a cotton swab; Modern a clear plastic one
    with an orange or blue cap, on a paper towel or a blue tray; Future Darkness a dark auto-injector with a lit
    window. What it holds shows in the barrel: clear, blood, a yellow or a dark drug, or nothing."""
    d = g.d; x0, y0, x1, y1 = g.x0, g.y0 + 1, g.x1 - 1, g.y1 - 1; cy = g.cy; k = _mi(g)
    held = {"clear": (200, 220, 226), "blood": (130, 14, 22), "yellow": (220, 190, 60), "dark": (70, 50, 70), "empty": None}[g.v.get("contents", "clear")]
    case = False
    if g.e == VI: dish = [_R((120, 24, 40), 12), _R((40, 50, 110), 12), _R((40, 90, 60), 12), _R((60, 40, 30), 10), M["enamel"], STEEL][k]; case = k < 4   # a velvet-lined case
    elif g.e == GW: dish = [_R((96, 96, 60), 12), STEEL, M["enamel"], _R((236, 236, 230), 6), _R((110, 70, 40), 12), STEEL][k]; case = k in (0, 1, 4)   # a field case
    elif g.e == MC: dish = [M["enamel"], STEEL, _R((222, 226, 222), 8), M["enamel_blue"], _R((236, 236, 230), 6), STEEL][k]
    elif g.e == MO: dish = [STEEL, _R((140, 170, 200), 12), WHITEP, _R((80, 130, 200), 12), _R((230, 230, 226), 6), GREENP][k]
    else: dish = [_R((60, 64, 70), 12), STEEL, WHITEP, _R((40, 50, 70), 10), _R((200, 200, 210), 8), _R((60, 64, 70), 12)][k]
    g.shadow(x0, y0, x1, y1)
    if case:                                                                          # the open case, its lid behind
        d.rectangle([x0, y0, x1, y1], fill=dish[2], outline=OUT); d.rectangle([x0, y0, x1, y0 + 2], fill=dish[0])
        d.rectangle([x0 + 2, cy - 3, x1 - 2, cy + 3], fill=dish[1])
    elif k in (4, 5):                                                                 # on a cloth or a towel, not a dish
        d.rectangle([x0, y0, x1, y1], fill=dish[2], outline=dish[0]); d.line([x0 + 1, cy + 2, x1 - 1, cy + 2], fill=dish[1])
    else:
        d.pieslice([x0, y0 - (y1 - y0) // 2, x1, y1], 0, 180, fill=dish[2], outline=dish[0])
        d.arc([x0 + 1, y0 - (y1 - y0) // 2 + 1, x1 - 1, y1 - 1], 20, 160, fill=dish[3])
    bx0, bx1 = x0 + 3, x1 - (x1 - x0) // 3; by = cy
    if g.e == FD:
        Cc = _pk(g, CASEFD + CASES); d.rounded_rectangle([bx0, by - 2, bx1 + 2, by + 2], 2, fill=Cc[1], outline=OUT)
        d.rectangle([bx0 + 3, by - 1, bx0 + 6, by], fill=held or g.GL[1]); d.rectangle([bx1 + 2, by - 1, bx1 + 3, by], fill=(240, 160, 40))
    else:
        d.rectangle([bx0, by - 3, bx1, by + 2], fill=(226, 236, 238), outline=(80, 96, 100))
        if held: d.rectangle([bx0 + 2, by - 2, bx1 - 1, by + 1], fill=held)
        d.line([bx1, by, x1 - 2, by], fill=STEEL[3]); d.line([bx0 - 2, by - 1, bx0 + 2, by - 1], fill=OUT)
        if g.e < MO:
            for sy in (by - 4, by + 2): d.ellipse([bx0 + 1, sy, bx0 + 4, sy + 2], outline=NICKEL[2])
        else: d.rectangle([x1 - 5, by - 1, x1 - 1, by], fill=_pk(g, [(240, 140, 40), (60, 120, 220), (240, 240, 236)], "cap"))
    if k in (0, 3): d.ellipse([x1 - 5, y0 + 1, x1 - 1, y0 + 4], fill=(246, 246, 240), outline=(170, 170, 160))      # a cotton swab
    if g.w >= 4:                                                                      # spare ampoules for the well-stocked
        for j in range(g.w - 1): d.rectangle([x0 + 2 + j * 3, y1 - 3, x0 + 3 + j * 3, y1], fill=(150, 90, 40) if g.e < MO else (220, 226, 230), outline=OUT)
    elif g.w <= 1: d.line([x0 + 1, y1 - 1, x1 - 1, y1 - 1], fill=(120, 110, 90))                                   # a stained edge
    g.spill = held; g.shape = (x0, y0, x1, y1)


def _bottle_glob(g):
    """Machine-made bottles from 1903, the same in every market: they vary by what they are for, the glass, the cap
    and the maker's label."""
    d = g.d; x0, x1 = g.x0 + 1, g.x1 - 1; cy = g.cy; ry = g.H // 2 - 1; k = _mi(g, 6)
    kinds = {GW: ["beer", "wine", "milk", "medicine", "soda", "spirits"], MC: ["beer", "wine", "soda", "spirits", "milk", "medicine"],
             MO: ["water", "soda", "beer", "wine", "spirits", "medicine"], FD: ["water", "soda", "beer", "wine", "flask", "spirits"]}[g.e]
    kind = kinds[k]
    glass = {"beer": (110, 70, 30), "wine": (50, 90, 50), "milk": (226, 230, 226), "medicine": (40, 70, 160), "soda": (120, 170, 150),
             "spirits": (200, 212, 214), "water": (170, 200, 220), "flask": (50, 56, 64)}[kind]
    held = {"beer": LIQ["ale"], "wine": LIQ["wine"], "milk": LIQ["milk"], "medicine": (150, 60, 40), "soda": (70, 40, 26),
            "spirits": (200, 150, 70), "water": LIQ["water"], "flask": None}[kind]
    if kind == "soda" and g.e >= MO: glass = (200, 214, 220); held = _pk(g, [(70, 40, 26), (230, 140, 40), (200, 220, 120)], "pop")
    Gc = ramp(glass, 14)
    neck = (x1 - x0) // (3 if kind in ("wine", "spirits") else 4)
    if kind == "medicine": x1 = x0 + (x1 - x0) * 2 // 3
    body = (x0, cy - ry, x1 - neck, cy + ry)
    g.shadow(body[0], body[1], x1, body[3], kind="rect")
    nr = max(1, ry // 2) + (1 if kind in ("milk", "water", "soda") else 0)
    d.rectangle([body[2] - 2, cy - nr, x1 - 2, cy + nr], fill=Gc[2], outline=Gc[0])
    cap = {"beer": GILT, "wine": _pk(g, [_R((150, 30, 40)), GILT, BLACK], "foil"), "milk": _pk(g, [NICKEL, GILT, _R((60, 100, 200))], "top"),
           "medicine": OAK, "soda": _pk(g, [_R((200, 40, 40)), NICKEL, _R((40, 120, 60))], "cap"), "spirits": BLACK,
           "water": _pk(g, [_R((60, 110, 210)), WHITEP, _R((90, 200, 220))], "cap"), "flask": _pk(g, CASEFD, "cap")}[kind]
    d.rectangle([x1 - 2 - (3 if kind == "wine" else 0), cy - nr, x1, cy + nr], fill=cap[2], outline=cap[0])
    d.rounded_rectangle(list(body), max(1, ry // 2), fill=Gc[2], outline=Gc[0])
    if held and kind != "milk": d.rectangle([body[0] + 1, cy + 1, body[2] - 2, body[3] - 1], fill=mix(held, Gc[2], .35))
    if kind in ("water", "soda") and g.e >= MO:
        for xx in range(body[0] + 3, body[2] - 1, 3): d.line([xx, body[1] + 1, xx, body[3] - 1], fill=Gc[3])   # the ribs of a plastic bottle
    d.line([body[0] + 2, body[1] + 1, body[2] - 3, body[1] + 1], fill=Gc[4])
    lw = 3 + g.b; lx = (body[0] + body[2]) // 2
    if kind not in ("milk",): d.rectangle([lx - lw, body[1] + 1, lx + lw - 1, body[3] - 1], fill=g.L[2]); d.line([lx - lw + 1, cy, lx + lw - 2, cy], fill=g.L[0])
    if g.e == FD and g.b == 2: d.line([body[0] + 1, cy, x1 - 1, cy], fill=g.GL[1])
    g.spill = held; g.shape = (x0, cy - ry, x1, cy + ry)


def _ashtray_glob(g):
    """Ashtrays from 1902 were the same everywhere. Great War: a brass tray beaten from a shell case, pressed glass,
    a maker's printed tin or a white hotel dish; Mid-Century: thick glass, a chrome bowl on its stand, black
    bakelite, a coloured art-glass dish or a printed tin; Modern: glass, a black or red plastic bar ashtray, a steel
    bowl or a ceramic one; Future Darkness: steel, dark composite or a sand-topped bin lid. Clean, a few stubs, or
    full."""
    d = g.d; full = g.v.get("contents", "few"); r = min(g.W, g.H) // 2; cx, cy = g.cx, g.cy; k = _mi(g)
    glass = ramp((180, 206, 210), 18, (-4, 0, 6))
    T = {GW: [("shell", BRASS), ("square", glass), ("round", g.L), ("round", WHITEP), ("hex", glass), ("shell", NICKEL)],
         MC: [("square", glass), ("stand", M["chrome"]), ("round", BLACK), ("round", _pk(g, [_R((40, 120, 160)), _R((200, 120, 40)), _R((60, 150, 80))], "art")), ("round", g.L), ("hex", _R((110, 50, 40)))],
         MO: [("round", glass), ("square", BLACK), ("square", REDP), ("round", STEEL), ("hex", WHITEP), ("round", _pk(g, [GREENP, BLUEP, YELLOWP], "pl"))],
         FD: [("round", STEEL), ("square", CASEFD[0]), ("bin", CASEFD[2]), ("round", glass), ("square", CASEFD[1]), ("bin", STEEL)]}[g.e]
    shape, C = T[k]
    g.shadow(cx - r, cy - r, cx + r, cy + r)
    if shape == "square": d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=C[0]); d.rectangle([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[1])
    elif shape == "hex":
        pts = [(cx + math.cos(a * math.pi / 3) * r, cy + math.sin(a * math.pi / 3) * r) for a in range(6)]
        d.polygon(pts, fill=C[2], outline=C[0]); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=C[1])
    elif shape == "bin":
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[1], outline=OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=(214, 200, 160))   # the sand top
    else:
        if shape == "stand": d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[0], outline=OUT); r -= 2
        g.disc(cx, cy, r, C=C, out=C[0] if C is not BLACK else OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=C[1])
        if shape == "shell":
            for a in range(0, 360, 45): d.point((cx + math.cos(math.radians(a)) * (r - 1), cy + math.sin(math.radians(a)) * (r - 1)), fill=C[4])
    if C is g.L: d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 0, 360, fill=_pk(g, [(240, 236, 220), (200, 40, 40), (230, 190, 60)], "print"))
    if shape != "bin":
        for a in ((0, -1), (1, 0), (0, 1), (-1, 0))[: 3 if k % 2 else 4]: d.rectangle([cx + a[0] * r - 1, cy + a[1] * r - 1, cx + a[0] * r, cy + a[1] * r], fill=C[0])
    if full == "few":                                                              # a lit cigarette laid across the rest
        d.line([cx - r - 1, cy - 1, cx + 1, cy - 1], fill=(244, 240, 230), width=2); d.line([cx - r - 1, cy - 1, cx - r + 1, cy - 1], fill=(210, 150, 80), width=2)
    if full != "clean":
        ir = r - 2; ar = 2 if full == "few" else ir - 1
        d.ellipse([cx - ar, cy - ar + 1, cx + ar, cy + ar + 1], fill=(150, 146, 140))
        for kk in range(2 if full == "few" else 5):
            a = kk * 2.2 + .5; sx, sy = cx + math.cos(a) * (ir - 3), cy + math.sin(a) * (ir - 3)
            d.line([sx, sy, sx + 2, sy + 1], fill=(240, 236, 226)); d.point((sx + 2, sy + 1), fill=(220, 140, 60))
    g.spill = (150, 146, 140); g.shape = (cx - r, cy - r, cx + r, cy + r)


# ================================================================ definitions
FULL = ["full", "half", "water", "empty"]
DRINK = ["ale", "wine", "milk", "water", "tea", "empty"]
gdef("pot", pot, axes={"contents": ["full", "half", "simmering"]})
gdef("kettle", kettle, ft=((0.85, 1.2), (0.75, 1.05)), axes={"finish": ["plain", "polished"]},
     ref="copper and iron kettles 8 to 12 in across the body, the spout and handle beyond (kitchen inventories and surviving pieces)")
gdef("jug", jug, axes={"contents": ["water", "ale", "milk", "wine", "oil", "empty"]})
gdef("bowl", bowl, axes={"contents": ["food", "porridge", "milk", "broth", "empty"]})
gdef("cup", cup, ft=((0.45, 0.65), (0.45, 0.65)), axes={"contents": DRINK},
     ref="cups and tankards 3 to 4 1/2 in across, saucers 5 to 6 in (surviving treen, pewter and porcelain)")
gdef("plate", plate, ft=((0.7, 0.9), (0.7, 0.9)), axes={"contents": ["bread", "meat", "fish", "fruit", "rice", "empty"]},
     ref="pewter and earthenware plates 8 to 10 in across (period plate sizes)")
gdef("trencher", trencher, ft=((0.55, 0.8), (0.55, 0.8)), axes={"contents": ["meat", "fish", "pottage", "fowl", "none"]},
     ref="bread trenchers about 6 in square, cut from a four-day-old loaf; wooden trenchers 6 to 9 in (household books)")
gdef("loaf", loaf, axes={"bake": ["well", "pale", "dark"]})
gdef("cheese", cheese, axes={"cut": ["cut", "whole"]})
gdef("bottle", bottle, ft=((0.9, 1.15), (0.36, 0.5)), axes={"contents": ["wine", "spirits", "water", "oil", "beer"], "model": MODEL},
     global_from=1902, nvar=14,
     ref="wine and spirit bottles 10 to 13 in long and 3 to 4 in across, laid on their side (surviving bottles)")
gdef("wineglass", wineglass, ft=((0.4, 0.6), (0.4, 0.6)), axes={"contents": ["red", "white", "water", "empty"], "model": MODEL, "under": ["none", "napkin", "coaster"]}, global_from=1919, nvar=20,
     ref="goblet bowls 3 to 4 in across (Venetian and lead-crystal glasses), with the foot and a napkin or coaster under")
gdef("teapot", teapot, ft=((1.25, 1.6), (0.85, 1.15)), axes={"service": ["two", "two"]},
     ref="a teapot 6 to 8 in across with two cups on a tray about 15 by 11 in")
gdef("samovar", samovar, ft=((1.0, 1.35), (1.0, 1.35)), states=("out", "lit"), axes={"finish": ["plain", "polished"]},
     ref="Tula samovars 12 to 15 in across the body with handles and tap (surviving pieces)")
gdef("hookah", hookah, ft=((1.3, 1.7), (1.2, 1.6)), states=("out", "lit"), axes={"hoses": ["one", "two"], "tray": ["brass", "copper", "steel"], "model": MODEL},
     global_from=1990, nvar=26,
     ref="water pipes with a base 8 to 10 in across, the hose coiled beside (nargile of the 16th to 19th c.)")
gdef("book", book, ft=((0.6, 0.95), (0.75, 1.15)), states=("closed", "open"), axes={"size": ["octavo", "quarto"]},
     ref="bound books 7 to 12 in tall (octavo to quarto), palm-leaf books 12 to 20 in long")
gdef("scroll", scroll, ft=((0.9, 1.3), (0.42, 0.6)), axes={"open": ["rolled", "open"]},
     ref="rolls 12 to 15 in wide, 2 to 3 1/2 in thick rolled, a pair or one open between its rollers (charters, handscrolls, diplomas)")
gdef("letter", letter, ft=((0.55, 0.8), (0.42, 0.6)), axes={"fold": ["sealed", "opened"], "model": MODEL}, global_from=1837, nvar=20,
     ref="folded letters and envelopes 6 to 9 in by 4 to 6 in (letter packets and postal envelopes)")
gdef("inkwell", inkwell, ft=((0.55, 0.85), (0.45, 0.7)), axes={"pen": ["quill"]},
     ref="ink pots 2 to 3 in with a 7 to 10 in pen; standish trays 8 by 5 in; ink stones 5 by 3 in")
gdef("ledger", ledger, ft=((0.75, 1.1), (1.0, 1.4)), states=("closed", "open"), axes={"binding": ["half"]},
     ref="tall account books 12 to 16 in by 8 to 11 in (counting-house ledgers)")
gdef("coins", coins, ft=((0.6, 0.85), (0.5, 0.75)), axes={"heap": ["stacks"]},
     ref="coins about 1 in across, a heap and stacks over a hand's breadth or two")
gdef("knife", knife, ft=((0.7, 1.0), (0.45, 0.6)), axes={"grip": ["scales"]},
     ref="kitchen knives 8 to 12 in long, blades 1 to 2 in deep (surviving knives), with what it cut beside it")
gdef("cleaver", cleaver, ft=((0.8, 1.1), (0.55, 0.7)), axes={"grip": ["scales"]},
     ref="cleavers 10 to 13 in long with blades 4 to 6 in deep, with what it cut beside it")
gdef("herbs", herbs, ft=((0.8, 1.3), (0.5, 0.8)), axes={"bunches": ["two"]},
     ref="bunches of herbs 10 to 15 in long, two or three laid together")
gdef("pipe", pipe, ft=((0.6, 1.0), (0.4, 0.55)), axes={"pouch": ["leather"], "spill": ["none", "ash", "tobacco"]}, states=("out", "lit"), nvar=26,
     ref="clay and wooden pipes 7 to 13 in long (churchwardens longer) with a tobacco pouch about 5 in")
gdef("dice", dice, ft=((0.75, 1.0), (0.55, 0.8)), axes={"game": ["hand"]},
     ref="dice about 1/2 in, cards about 2 by 3 1/2 in, laid on a gaming cloth about 11 by 8 in")
gdef("chessboard", chessboard, ft=((1.2, 1.6), (1.2, 1.6)), axes={"set": ["laid"]},
     ref="chess and backgammon boards 14 to 20 in, go boards about 18 in (surviving boards)")
gdef("toy", toy, ft=((0.6, 0.95), (0.5, 0.8)), global_from=1990, nvar=14, axes={"model": MODEL, "box": ["none", "box"]},
     ref="hobby and pull toys, dolls and tops 6 to 11 in")
gdef("sewing", sewing, ft=((1.0, 1.4), (0.75, 1.05)), states=("closed", "open"), axes={"lining": ["lined"]},
     ref="work baskets about 14 by 10 in")
gdef("flowers", flowers, ft=((0.6, 0.95), (0.6, 0.95)), axes={"water": ["fresh"]},
     ref="vases with their flowers spread 7 to 11 in across")
gdef("ashtray", ashtray, ft=((0.5, 0.8), (0.5, 0.8)), axes={"contents": ["clean", "few", "full"], "model": MODEL},
     global_from=1902, nvar=14,
     ref="ashtrays 4 to 9 in across (pressed-glass and hotel ashtrays)")
# machines and mass-made goods: global_from is the first era from which they look the same in every market
gdef("phone", phone, ft=((0.7, 1.0), (0.55, 0.85)), axes={"model": MODEL}, global_from=1837, nvar=14,
     ref="candlestick sets with a 4 1/2 in base and their bell box, desk sets about 9 by 7 in, office key sets 9 by 8 in (Western Electric and Ericsson catalogues)")
gdef("radio", radio, ft=((0.9, 1.3), (0.5, 0.8)), states=("off", "on"), axes={"model": MODEL, "clutter": ["none", "papers", "cup"]}, global_from=1919, nvar=14,
     ref="table wireless sets 12 to 16 in wide and 7 to 9 in deep (1930s maker's catalogues); radio cassette players 15 to 20 in")
gdef("tv", tv, ft=((1.4, 2.0), (1.1, 1.6)), states=("off", "on"), axes={"model": MODEL, "clutter": ["none", "papers", "cup"]}, global_from=1919, nvar=14,
     ref="table television sets of 17 to 21 in tubes, about 20 in wide and 16 to 18 in deep (1950s to 1990s sets)")
gdef("computer", computer, ft=((1.4, 1.9), (1.2, 1.7)), states=("off", "on"), axes={"model": MODEL}, global_from=1919, nvar=14,
     ref="desk computers with a 12 to 15 in monitor about 15 in wide and a keyboard 18 by 7 in (IBM PC 5150 and its kind)")
gdef("typewriter", typewriter, ft=((1.0, 1.4), (1.0, 1.3)), axes={"model": MODEL, "contents": ["sheet", "none", "carbon"]}, global_from=1837, nvar=14,
     ref="office typewriters about 15 in wide and 14 in deep (Underwood No. 5); portables 12 by 12 in")
gdef("gramophone", gramophone, ft=((1.2, 1.6), (1.1, 1.5)), axes={"model": MODEL, "records": ["none", "sleeve", "pile"]}, global_from=1837, nvar=14,
     ref="horn gramophones with a 12 in square case and a 17 to 22 in horn; turntables about 17 by 14 in")
gdef("clock", clock, ft=((0.8, 1.3), (0.42, 0.6)), axes={"model": MODEL}, global_from=1601, nvar=14,
     ref="bracket and mantel clocks 10 to 16 in wide and 5 to 7 in deep (surviving English and French clocks); alarm clocks stand on the same shelf space")
gdef("skull", skull, ft=((0.55, 0.8), (0.65, 0.9)), axes={"model": MODEL, "kind": ["bare", "jaw", "candle", "mossy", "drilled", "inscribed", "bones"]},
     global_from=1197, nvar=20, ref="an adult human skull about 5 1/2 in wide and 7 1/2 in long (anatomy texts), on the book, stand or cloth it lies on")
gdef("specimen", specimen, ft=((0.5, 0.8), (0.5, 0.8)), axes={"model": MODEL, "contents": ["snake", "heart", "brain", "fish", "eye", "hand"]},
     global_from=1450, nvar=26, ref="anatomy and natural-history jars 5 to 8 in across, some on a plinth (Hunterian and Ruysch collections)")
gdef("bloodbag", bloodbag, ft=((0.45, 0.65), (0.65, 0.9)), axes={"model": MODEL, "contents": ["full", "half", "drained"]}, global_from=1919, nvar=20,
     ref="a 450 to 500 ml unit: a bag about 6 by 9 in, a blood bottle 3 in across and 8 in long (blood bank practice)")
gdef("needle", needle, ft=((0.7, 0.95), (0.4, 0.6)), axes={"model": MODEL, "contents": ["clear", "blood", "yellow", "dark", "empty"]},
     global_from=1837, nvar=14, ref="a kidney dish about 10 by 5 in holding a 2 to 10 ml syringe 4 to 6 in long (surgical catalogues)")

