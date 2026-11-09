"""Illuminated bust generator in the Rothenstein house style, built as paperdoll layers.
Each layer is drawn on its own transparent sheet, then stacked by z order and baked.
Usage: python3 -I illum.py <out dir>"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

S = 1024                      # draw at 2x, bake down to 512
INK = (58, 36, 26, 255)
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(OUT, exist_ok=True)

def sheet(): return Image.new("RGBA", (S, S))
def rgb(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def shade(c, f): return tuple(max(0, min(255, int(v * f))) for v in c[:3])

def noise(seed, scale=1.0, blur=3):
    r = np.random.default_rng(seed).random((S // 4, S // 4))
    im = Image.fromarray((r * 255).astype("uint8")).resize((S, S), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    return im

def textured(mask, color, seed, depth=0.18, fibres=True):
    """Fill a mask with a flat colour carrying a faint paper grain."""
    n = np.asarray(noise(seed, blur=2), dtype=float) / 255.0
    base = np.array(color[:3], dtype=float)
    f = 1 - depth / 2 + n[..., None] * depth
    if fibres:
        fib = np.asarray(noise(seed + 7, blur=0.6), dtype=float) / 255.0
        f *= 0.96 + 0.06 * fib[..., None]
    arr = np.clip(base * f, 0, 255).astype("uint8")
    im = Image.fromarray(arr, "RGB").convert("RGBA"); im.putalpha(mask)
    return im

def poly_mask(pts, smooth=0):
    m = Image.new("L", (S, S)); ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(smooth)) if smooth else m

def ell_mask(box):
    m = Image.new("L", (S, S)); ImageDraw.Draw(m).ellipse(box, fill=255); return m

def outline(layer, mask, width=5):
    edge = mask.filter(ImageFilter.MaxFilter(width | 1))
    ring = ImageChops.subtract(edge, mask)
    ink = Image.new("RGBA", (S, S), INK); ink.putalpha(ring)
    layer.alpha_composite(ink)

def curve(cx, cy, rx, ry, a0, a1, n=40):
    return [(cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a))) for a in np.linspace(a0, a1, n)]

def strands(layer, mask, color, seed, step=14, vertical=True):
    """Fine strand lines inside hair or beard."""
    d = ImageDraw.Draw(layer); rnd = random.Random(seed)
    lines = sheet(); ld = ImageDraw.Draw(lines)
    for x in range(0, S, step):
        x0 = x + rnd.uniform(-4, 4)
        pts = [(x0 + math.sin(y / 60 + x) * 6, y) for y in range(0, S, 16)] if vertical else [(y, x0) for y in range(0, S, 16)]
        ld.line(pts, fill=(*shade(color, 0.72), 150), width=2)
    lines.putalpha(ImageChops.multiply(lines.split()[3], mask))
    layer.alpha_composite(lines)

# ---------------------------------------------------------------- layers

def ground_gold(seed):
    L = sheet()
    m = Image.new("L", (S, S), 255)
    L.alpha_composite(textured(m, rgb("#c9a23a"), seed, depth=0.55, fibres=False))
    # gold leaf: crackle where the leaf squares meet, and a cooler sheen
    d = ImageDraw.Draw(L); rnd = random.Random(seed)
    for _ in range(260):
        x, y = rnd.uniform(0, S), rnd.uniform(0, S); a = rnd.uniform(0, 6.28); r = rnd.uniform(6, 22)
        d.line([(x, y), (x + r * math.cos(a), y + r * math.sin(a))], fill=(120, 88, 24, 40), width=2)
    blot = noise(seed + 11, blur=14).point(lambda v: max(0, 140 - v) * 2)
    dk = Image.new("RGBA", (S, S), (150, 108, 30, 255)); dk.putalpha(blot.point(lambda v: v // 2)); L.alpha_composite(dk)
    sheen = noise(seed + 3, blur=40).point(lambda v: max(0, v - 120) * 2)
    hi = Image.new("RGBA", (S, S), (255, 238, 160, 255)); hi.putalpha(sheen.point(lambda v: v // 3))
    L.alpha_composite(hi)
    return L

def ground_lapis(seed):
    L = sheet()
    L.alpha_composite(textured(Image.new("L", (S, S), 255), rgb("#25336e"), seed, depth=0.3))
    d = ImageDraw.Draw(L); rnd = random.Random(seed)
    for y in range(40, S, 70):
        for x in range(40 + (y // 70 % 2) * 35, S, 70):
            d.regular_polygon((x, y, 7), 4, rotation=45, fill=(214, 176, 74, 230))
    return L

def shoulders(cloth, seed):
    """Upper body: two rounded shoulders and the chest, in the garment's main colour."""
    L = sheet()
    pts = curve(512, 1130, 470, 420, 180, 360)
    m = poly_mask(pts)
    L.alpha_composite(textured(m, rgb(cloth), seed))
    for cx in (120, 904):  # sleeve caps
        sm = ell_mask((cx - 120, 760, cx + 120, 1100))
        L.alpha_composite(textured(sm, shade(rgb(cloth), 0.88), seed + cx))
        outline(L, sm)
    outline(L, m)
    return L

def neck(skin, seed):
    L = sheet(); m = poly_mask([(440, 560), (584, 560), (596, 760), (428, 760)])
    L.alpha_composite(textured(m, shade(rgb(skin), 0.88), seed)); outline(L, m); return L

def face(skin, eye, seed):
    L = sheet(); c = rgb(skin)
    for ex in (282, 742):  # ears
        em = ell_mask((ex - 34, 330, ex + 34, 460)); L.alpha_composite(textured(em, shade(c, .94), seed)); outline(L, em)
    fm = ell_mask((300, 180, 724, 700))
    L.alpha_composite(textured(fm, c, seed))
    blush = Image.new("RGBA", (S, S), (205, 110, 96, 0)); bd = ImageDraw.Draw(blush)
    for cx in (390, 634): bd.ellipse((cx - 55, 440, cx + 55, 500), fill=(205, 110, 96, 60))
    L.alpha_composite(blush.filter(ImageFilter.GaussianBlur(18)))
    outline(L, fm)
    d = ImageDraw.Draw(L)
    for cx, sgn in ((418, -1), (606, 1)):  # eyes
        d.ellipse((cx - 50, 360, cx + 50, 410), fill=(244, 238, 226, 255), outline=INK, width=4)
        d.ellipse((cx - 24, 361, cx + 24, 409), fill=(*rgb(eye), 255))
        d.ellipse((cx - 12, 373, cx + 12, 397), fill=(20, 14, 12, 255))
        d.ellipse((cx - 14, 368, cx - 4, 378), fill=(255, 255, 255, 230))
        d.arc((cx - 54, 350, cx + 54, 412), 195, 345, fill=INK, width=6)   # upper lid
    d.line([(512, 400), (500, 500), (520, 520)], fill=(*shade(c, .7), 255), width=4)  # nose
    d.arc((486, 492, 538, 528), 20, 160, fill=(*shade(c, .7), 255), width=3)
    d.chord((462, 560, 562, 600), 0, 180, fill=(196, 104, 98, 255))  # mouth
    d.line([(462, 566), (562, 566)], fill=(140, 70, 64, 255), width=3)
    return L

def brows(hair):
    L = sheet(); d = ImageDraw.Draw(L)
    for x0, x1 in ((360, 470), (554, 664)): d.line(curve((x0 + x1) / 2, 350, (x1 - x0) / 2, 18, 200, 340), fill=(*shade(rgb(hair), .85), 255), width=12)
    return L

def hair_long(hair, seed):
    L = sheet(); c = rgb(hair)
    m = poly_mask(curve(512, 330, 222, 250, 180, 360) + [(734, 330), (740, 470), (705, 470), (700, 330)] + curve(512, 330, 188, 110, 0, -180) + [(324, 330), (320, 470), (284, 470), (290, 330)])
    L.alpha_composite(textured(m, c, seed)); strands(L, m, c, seed); outline(L, m); return L

def hair_short(hair, seed):
    L = sheet(); c = rgb(hair)
    m = poly_mask(curve(512, 300, 214, 170, 180, 360) + [(726, 300), (722, 390), (704, 390), (700, 310)] + curve(512, 310, 188, 96, 0, -180) + [(324, 310), (320, 390), (302, 390), (298, 300)])
    L.alpha_composite(textured(m, c, seed)); strands(L, m, c, seed, step=12); outline(L, m); return L

def beard_long(hair, seed):
    L = sheet(); c = rgb(hair)
    m = poly_mask([(304, 420), (346, 560), (420, 640), (440, 760), (512, 800), (584, 760), (604, 640), (678, 560), (720, 420), (690, 600), (600, 620), (512, 610), (424, 620), (334, 600)])
    m = ImageChops.lighter(m, poly_mask([(330, 520), (430, 600), (594, 600), (694, 520), (640, 780), (512, 812), (384, 780)]))
    hole = ell_mask((462, 548, 562, 604))
    m = ImageChops.subtract(m, hole)
    L.alpha_composite(textured(m, c, seed)); strands(L, m, c, seed + 1, step=11); outline(L, m); return L

def beard_trim(hair, seed):
    L = sheet(); c = rgb(hair)
    m = poly_mask([(306, 430), (350, 600), (430, 680), (512, 700), (594, 680), (674, 600), (718, 430), (680, 560), (600, 610), (512, 616), (424, 610), (344, 560)])
    m = ImageChops.subtract(m, ell_mask((462, 548, 562, 604)))
    L.alpha_composite(textured(m, c, seed)); strands(L, m, c, seed + 1, step=10); outline(L, m); return L

def moustache(hair, seed):
    L = sheet(); c = rgb(hair)
    m = poly_mask([(512, 520), (470, 530), (420, 560), (380, 610), (360, 600), (392, 548), (450, 512), (512, 504), (574, 512), (632, 548), (664, 600), (644, 610), (604, 560), (554, 530)])
    L.alpha_composite(textured(m, c, seed)); outline(L, m, 4); return L

# --- era clothing -------------------------------------------------------

def gown_dark_ages(seed):
    """Red surcoat with an ermine collar, round brooch and stamped rosettes."""
    L = shoulders("#8e2a2a", seed)
    cm = poly_mask(curve(512, 700, 190, 110, 0, 180)); cm = ImageChops.lighter(cm, poly_mask(curve(512, 690, 190, 40, 180, 360)))
    L.alpha_composite(textured(cm, rgb("#efe9dc"), seed + 9)); outline(L, cm)
    d = ImageDraw.Draw(L)
    for x in range(350, 690, 48): d.line([(x, 752), (x, 772)], fill=(30, 20, 20, 255), width=5)  # ermine tails
    d.ellipse((470, 900, 554, 984), fill=(214, 176, 74, 255), outline=INK, width=5); d.ellipse((494, 924, 530, 960), fill=(180, 30, 40, 255))
    for cx in (262, 760):
        for a in range(0, 360, 72): d.ellipse((cx + 26 * math.cos(math.radians(a)) - 20, 880 + 26 * math.sin(math.radians(a)) - 20, cx + 26 * math.cos(math.radians(a)) + 20, 880 + 26 * math.sin(math.radians(a)) + 20), fill=(230, 170, 170, 180))
    return L

def coat_victorian(seed):
    """Black frock coat with lapels, waistcoat, white wing collar and a dark cravat."""
    L = shoulders("#26242b", seed)
    d = ImageDraw.Draw(L)
    vm = poly_mask([(420, 740), (604, 740), (640, 1024), (384, 1024)])
    L.alpha_composite(textured(vm, rgb("#5b4a37"), seed + 2)); outline(L, vm)
    sm = poly_mask([(448, 720), (576, 720), (560, 870), (464, 870)])
    L.alpha_composite(textured(sm, rgb("#f1ede4"), seed + 4)); outline(L, sm)
    for sgn in (-1, 1):  # wing collar points and lapels
        wm = poly_mask([(512, 724), (512 + sgn * 92, 700), (512 + sgn * 70, 770)])
        L.alpha_composite(textured(wm, rgb("#f6f3ec"), seed + 5)); outline(L, wm, 4)
        lm = poly_mask([(512 + sgn * 100, 720), (512 + sgn * 190, 760), (512 + sgn * 120, 1024), (512 + sgn * 70, 1024), (512 + sgn * 60, 860)])
        L.alpha_composite(textured(lm, rgb("#1b1a1f"), seed + 6)); outline(L, lm)
    cr = poly_mask([(470, 760), (554, 760), (536, 800), (560, 880), (512, 900), (464, 880), (488, 800)])
    L.alpha_composite(textured(cr, rgb("#5a1b26"), seed + 8)); outline(L, cr, 4)
    d.ellipse((502, 810, 522, 830), fill=(214, 176, 74, 255), outline=INK, width=3)  # stick pin
    for y in (920, 980): d.ellipse((504, y, 520, y + 16), fill=(214, 176, 74, 255), outline=INK, width=2)
    return L

# --- frames (WoDX era rings, from Atmosphere's token frames) -------------
FRAMES = {"dark-ages": ("round", "#4f4943", True), "victorian": ("square", "#a07a3a", True), "modern": ("square", "#9aa3ad", False)}

def bake(layers, era, size=512):
    img = sheet()
    for z, L in sorted(layers, key=lambda t: t[0]): img.alpha_composite(L)
    shape, col, double = FRAMES[era]; col = rgb(col)
    lw = round(S * 0.045); inset = lw
    mask = Image.new("L", (S, S)); md = ImageDraw.Draw(mask); rr = round(S * .08)
    if shape == "round": md.ellipse((inset, inset, S - inset, S - inset), fill=255)
    else: md.rounded_rectangle((inset, inset, S - inset, S - inset), rr, fill=255)
    tok = sheet(); tok.paste(img, (0, 0), mask)
    d = ImageDraw.Draw(tok)
    box = (lw / 2, lw / 2, S - lw / 2, S - lw / 2); ibox = (lw * 1.6,) * 2 + (S - lw * 1.6,) * 2
    if shape == "round":
        d.ellipse(box, outline=(*col, 245), width=lw)
        if double: d.ellipse(ibox, outline=(*shade(col, 1.35), 200), width=lw // 4)
    else:
        d.rounded_rectangle(box, rr, outline=(*col, 245), width=lw)
        if double: d.rounded_rectangle(ibox, rr, outline=(*shade(col, 1.35), 200), width=lw // 4)
    return tok.resize((size, size), Image.LANCZOS)

def character(era, look):
    """The paperdoll recipe: one list of (z, layer). The body and face stay; the era swaps ground and clothes."""
    s = look["seed"]
    ground = ground_gold(s) if era == "dark-ages" else ground_lapis(s)
    clothes = {"dark-ages": gown_dark_ages, "victorian": coat_victorian}[era](s)
    hair = look["hair"]
    beard = beard_long if era == "dark-ages" else beard_trim
    hairdo = hair_long if era == "dark-ages" else hair_short
    return [(0, ground), (10, clothes), (5, neck(look["skin"], s)), (20, face(look["skin"], look["eye"], s)), (25, brows(hair)),
            (30, beard(hair, s)), (32, moustache(hair, s)), (40, hairdo(hair, s))]

REINHOLD = {"seed": 7, "skin": "#e0b496", "eye": "#5a3a22", "hair": "#d8bf72"}

if __name__ == "__main__":
    for era in ("dark-ages", "victorian"):
        bake(character(era, REINHOLD), era).save(f"{OUT}/reinhold-{era}.png")
        bake(character(era, REINHOLD), era).save(f"{OUT}/reinhold-{era}.webp", quality=90)
    print("ok")
