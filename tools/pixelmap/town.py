"""WoDX pixel map drawer (B5744): a town's own pieces, each drawn to be named by sight from straight above.
Cobbles, market stalls under striped awnings, lantern posts, the market cross on its steps, horse stalls, an
apothecary's jars, a hatter's hats, hams in a smokehouse, a pen of hurdles."""
import math

import numpy as np

from px import R, T, OUT

P = lambda v: int(round(v * T))


def cobbles(m, mask):
    """Rounded cobbles laid in the street wherever mask (a boolean picture-sized array) is true: stones of mixed
    size and shade with dark joints, worn smoother down the middle of the ways."""
    H, W = mask.shape
    a = m.blocks(H, W, 22, 17, "stone", jitter=1, lo=1, hi=3)
    w = m.noise(H, W, 60) > .62                                                        # worn patches, a shade paler
    a[w] = np.minimum(a[w].astype(int) + 10, 255).astype(np.uint8)
    m.put(a, 0, 0, mask=mask)


def stall(m, x, y, w=2.7, h=1.2, stripe="red", goods="loaf", rec=None, label="Market stall"):
    """A market stall seen from above: a striped awning on four poles over a trestle, the goods on the trestle
    showing along its open front (south), and its shadow."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); rng = m.rng
    m.shade((X0 + 8, Y0 + 12, X1 + 12, Y1 + 16), f=.6)
    m.box(X0 + 6, Y1 - 22, X1 - 6, Y1 + 10, "wood", 3)                                    # the trestle, its front edge
    for i in range(int((X1 - X0 - 20) / 18)):                                              # goods along the front
        gx = X0 + 18 + i * 18; gy = Y1 - 4
        if goods == "loaf": d.ellipse([gx - 8, gy - 5, gx + 8, gy + 6], fill=(176, 128, 66), outline=OUT)
        elif goods == "cloth": d.rectangle([gx - 8, gy - 6, gx + 8, gy + 6], fill=R[("red", "blue", "gold", "green")[i % 4]][3], outline=OUT)
        elif goods == "pots": d.ellipse([gx - 7, gy - 7, gx + 7, gy + 7], fill=R["clay"][2], outline=OUT); d.ellipse([gx - 3, gy - 3, gx + 3, gy + 3], fill=R["clay"][0])
        elif goods == "fish": d.polygon([(gx - 9, gy), (gx + 6, gy - 4), (gx + 9, gy), (gx + 6, gy + 4)], fill=R["iron"][3], outline=OUT)
        else: d.ellipse([gx - 6, gy - 6, gx + 6, gy + 6], fill=(R["red"][3] if i % 2 else R["lime"][3]), outline=OUT)   # apples, cabbages
    C1, C2 = R[stripe][3], R["linen"][4]                                                    # the awning, striped, lit north half
    sw = max(14, (X1 - X0) // 8)
    for k, xx in enumerate(range(X0, X1, sw)):
        col = C1 if k % 2 == 0 else C2
        d.rectangle([xx, Y0, min(X1, xx + sw), Y1 - 26], fill=col)
        d.rectangle([xx, (Y0 + Y1 - 26) // 2, min(X1, xx + sw), Y1 - 26], fill=tuple(int(v * .82) for v in col))
    d.rectangle([X0, Y0, X1, Y1 - 26], outline=OUT)
    for k, xx in enumerate(range(X0, X1, sw)):                                            # the scalloped valance at the front
        d.pieslice([xx, Y1 - 34, min(X1, xx + sw), Y1 - 18], 0, 180, fill=C1 if k % 2 == 0 else C2, outline=OUT)
    for px_, py_ in ((X0 + 3, Y0 + 3), (X1 - 3, Y0 + 3), (X0 + 3, Y1 - 26), (X1 - 3, Y1 - 26)): m.disc(px_, py_, 5, "dwood", 2)
    if rec: rec.note(label.lower(), x + w / 2, y + h / 2)


def lantern_post(m, x, y, rec=None, label="Lantern post"):
    """A lantern on a post: the post's foot and its long shadow, the iron lantern on its bracket, lit."""
    d = m.d; cx, cy = P(x), P(y)
    m.shade((0, 0, m.W, m.H), f=.6, kind="poly", pts=[(cx - 4, cy), (cx + 4, cy), (cx + 40, cy + 60), (cx + 32, cy + 60)])
    m.disc(cx, cy, 8, "dwood", 2)
    d.line([cx, cy, cx + 16, cy - 10], fill=R["iron"][1], width=3)
    d.rectangle([cx + 10, cy - 20, cx + 26, cy - 4], fill=R["iron"][1], outline=OUT); d.rectangle([cx + 14, cy - 16, cx + 22, cy - 8], fill=(255, 210, 120))
    m.hearths = getattr(m, "hearths", []) + [(cx + 18, cy - 12, 160, None)]
    if rec: rec.light(label, label, (x - .4, y - .4, .8, .8), dim=6, bright=1.5, color="#ffb35a", kind="lantern"); rec.note("lantern post", x, y)


def market_cross(m, x0, y0, x1, y1):
    """The market cross: a stone shaft on three steps, the cross's arms seen from above, its shadow south-east."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    m.shade((X0 + 10, Y0 + 14, X1 + 16, Y1 + 20), f=.6)
    for k, lv in enumerate((2, 3, 4)):
        i = k * 30; m.box(X0 + i, Y0 + i, X1 - i, Y1 - i, "stone", lv)
    m.shade((0, 0, m.W, m.H), f=.62, kind="poly", pts=[(cx - 8, cy), (cx + 8, cy), (cx + 90, cy + 130), (cx + 74, cy + 130)])
    m.box(cx - 9, cy - 46, cx + 9, cy + 30, "pale", 3); m.box(cx - 32, cy - 26, cx + 32, cy - 12, "pale", 3)
    d.point((cx - 5, cy - 42), fill=R["pale"][4])


def horse_stall(m, x, y, w=1.5, h=2.0, open_side="s"):
    """A horse's stall: plank partitions either side, a manger at the back with hay in it, straw bedding."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); rng = m.rng
    for _ in range(int((X1 - X0) * (Y1 - Y0) / 30)):
        px_, py_ = rng.uniform(X0, X1), rng.uniform(Y0, Y1); d.line([px_, py_, px_ + rng.uniform(-5, 5), py_ + rng.uniform(-3, 3)], fill=R["straw"][int(rng.integers(2, 5))])
    for xx in (X0, X1): m.box(xx - 5, Y0, xx + 5, Y1 - 10, "dwood", 2)
    m.box(X0 + 8, Y0 + 2, X1 - 8, Y0 + 22, "dwood", 2)                                      # the manger
    for _ in range(14): px_ = rng.uniform(X0 + 12, X1 - 12); d.line([px_, Y0 + 6, px_ + rng.uniform(-6, 6), Y0 + 18], fill=R["straw"][3])


def hats(m, x, y, n=4, along="x"):
    """Hats on a shelf or a counter: felt crowns with brims, in their own colours."""
    d = m.d; cols = ("red", "blue", "dwood", "green", "gold", "iron")
    for i in range(n):
        cx, cy = (P(x) + i * 26, P(y)) if along == "x" else (P(x), P(y) + i * 26)
        C = R[cols[i % len(cols)]]
        d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=C[1], outline=OUT); d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=C[3], outline=C[0])
        d.point((cx - 3, cy - 3), fill=C[4])


def hams(m, x0, y, x1):
    """Hams and sausages hung in the smoke from a pole: dark smoked joints in a row, sausages in loops."""
    d = m.d; X0, X1, Y = P(x0), P(x1), P(y)
    d.line([X0, Y, X1, Y], fill=R["dwood"][1], width=4)
    for i, xx in enumerate(range(X0 + 14, X1 - 8, 22)):
        if i % 3 == 2:
            for k in range(3): d.ellipse([xx - 4, Y + 2 + k * 7, xx + 4, Y + 9 + k * 7], fill=(120, 50, 40), outline=OUT)
        else:
            d.ellipse([xx - 9, Y + 2, xx + 9, Y + 26], fill=(110, 58, 38), outline=OUT); d.ellipse([xx - 5, Y + 5, xx + 3, Y + 15], fill=(150, 86, 56))


def jars(m, x, y, n=6, along="x"):
    """An apothecary's jars in a row on a shelf board: glazed pots of different colours, each stoppered."""
    d = m.d; cols = ("blue", "green", "red", "gold", "clay", "linen")
    X0, Y0 = P(x) - 13, P(y) - 13; X1, Y1 = (P(x) + (n - 1) * 20 + 13, P(y) + 13) if along == "x" else (P(x) + 13, P(y) + (n - 1) * 20 + 13)
    m.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 4), f=.6); m.box(X0, Y0, X1, Y1, "dwood", 3)
    for i in range(n):
        cx, cy = (P(x) + i * 20, P(y)) if along == "x" else (P(x), P(y) + i * 20)
        C = R[cols[i % len(cols)]]
        d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=C[2], outline=OUT); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=R["dwood"][2])
        d.point((cx - 5, cy - 5), fill=C[4])


def hurdles(m, x0, y0, x1, y1):
    """A fence of woven hurdles on stakes, thick enough to read from above: a band of woven withies with the
    stakes standing up through it every few feet, its shadow on the ground."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1); horiz = Y0 == Y1; S = R["straw"]; t = 7
    if horiz: m.shade((X0, Y0 + 2, X1 + 4, Y0 + 14), f=.6); d.rectangle([X0, Y0 - t, X1, Y0 + t], fill=S[2], outline=OUT)
    else: m.shade((X0 + 2, Y0, X0 + 14, Y1 + 4), f=.6); d.rectangle([X0 - t, Y0, X0 + t, Y1], fill=S[2], outline=OUT)
    L = (X1 - X0) if horiz else (Y1 - Y0)
    for k in range(0, L, 8):                                                              # the weave
        a, b = (X0 + k, Y0) if horiz else (X0, Y0 + k)
        if horiz: d.line([a, b - t + 2, a + 6, b + t - 2], fill=S[1 if (k // 8) % 2 else 3])
        else: d.line([a - t + 2, b, a + t - 2, b + 6], fill=S[1 if (k // 8) % 2 else 3])
    for k in range(0, L + 1, 40):                                                         # the stakes
        a, b = (X0 + k, Y0) if horiz else (X0, Y0 + k); m.disc(a, b, 6, "dwood", 2)


def forge(m, x, y, w=1.6, h=1.2, rec=None, label="Forge"):
    """A smith's forge seen from above: a waist-high block of stone with a bed of glowing coals in its top, a heap of
    charcoal beside, the leather bellows against its side with the handle out, and its glow."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h)
    m.box(X0, Y0, X1, Y1, "stone", 2, sh=10)
    cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    d.ellipse([cx - 30, cy - 22, cx + 30, cy + 22], fill=(40, 30, 28), outline=OUT); m.fire(cx, cy, 24, 16, seed=int(x * 7))
    for k in range(7): d.ellipse([X0 + 6 + k * 6, Y1 - 18, X0 + 14 + k * 6, Y1 - 10], fill=(34, 30, 30))      # charcoal ready on the rim
    bx = X1 + 4; d.polygon([(bx, cy - 22), (bx + 44, cy - 8), (bx + 44, cy + 8), (bx, cy + 22)], fill=(118, 72, 46), outline=OUT)   # the bellows
    for k in range(3): d.line([bx + 8 + k * 11, cy - 18 + k * 4, bx + 8 + k * 11, cy + 18 - k * 4], fill=(90, 54, 34))
    d.line([bx + 44, cy, bx + 66, cy], fill=R["dwood"][2], width=5)
    m.hearths = getattr(m, "hearths", []) + [(cx, cy, 150, None)]
    if rec: rec.light(label, label, (x, y, w, h), dim=5, bright=1.5, color="#ff8a30", kind="fire"); rec.note(label.lower(), x + w / 2, y + h / 2)


def anvil(m, x, y, rec=None):
    """An anvil on its wooden block: the iron face with its horn to the east, a hammer and tongs laid by."""
    d = m.d; cx, cy = P(x), P(y)
    m.disc(cx, cy, 26, "dwood", 2, sh=6)
    m.shade((cx - 18, cy - 6, cx + 34, cy + 16), f=.55)
    pts = [(cx - 24, cy - 10), (cx + 12, cy - 10), (cx + 34, cy - 2), (cx + 12, cy + 4), (cx + 12, cy + 10), (cx - 24, cy + 10)]
    d.polygon(pts, fill=R["iron"][2], outline=OUT); d.line([cx - 22, cy - 8, cx + 12, cy - 8], fill=R["iron"][4])
    d.line([cx - 10, cy + 22, cx + 6, cy + 32], fill=R["dwood"][3], width=4); d.rectangle([cx + 2, cy + 28, cx + 14, cy + 36], fill=R["iron"][1], outline=OUT)   # hammer
    if rec: rec.note("anvil", x, y)


def loom(m, x, y, w=1.8, h=1.1, cloth="blue", rec=None):
    """A floor loom from above: the heavy frame, the warp threads running from the back beam, the cloth woven so far
    rolled on the front beam in its colour, the bench for the weaver on the south side."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); C = R[cloth]
    m.shade((X0 + 8, Y0 + 10, X1 + 10, Y1 + 12), f=.6)
    for xx in (X0, X1 - 10): m.box(xx, Y0, xx + 10, Y1 - 16, "dwood", 2)                  # the side frames
    m.box(X0, Y0, X1, Y0 + 10, "dwood", 3)                                                   # back beam
    for xx in range(X0 + 14, X1 - 12, 4): d.line([xx, Y0 + 11, xx, Y0 + (Y1 - Y0) // 2], fill=R["linen"][3])   # the warp
    d.rectangle([X0 + 12, Y0 + (Y1 - Y0) // 2, X1 - 12, Y1 - 30], fill=C[3], outline=OUT)   # cloth woven so far
    for yy in range(Y0 + (Y1 - Y0) // 2 + 3, Y1 - 30, 4): d.line([X0 + 13, yy, X1 - 13, yy], fill=C[2])
    m.box(X0 + 4, Y1 - 30, X1 - 4, Y1 - 20, "dwood", 3)                                      # front beam with the cloth on it
    m.box(X0 + 16, Y1 - 12, X1 - 16, Y1, "wood", 2)                                          # the bench
    if rec: rec.note("loom", x + w / 2, y + h / 2)


def vat(m, x, y, r=.6, liquid="blue", rec=None, label="Dye vat"):
    """A great open vat of staves and iron hoops, the liquid inside in its own colour with ripples and a stick across
    it, so a dyer's vat or a brewer's mash tun is named by what is in it."""
    d = m.d; cx, cy = P(x), P(y); rr = int(r * T); rng = m.rng
    m.disc(cx, cy, rr, "wood", 2, sh=10)
    d.ellipse([cx - rr + 4, cy - rr + 4, cx + rr - 4, cy + rr - 4], outline=R["iron"][1], width=4)      # the top hoop
    for a in range(0, 360, 14):
        t = math.radians(a); d.line([cx + (rr - 3) * math.cos(t), cy + (rr - 3) * math.sin(t), cx + (rr - 10) * math.cos(t), cy + (rr - 10) * math.sin(t)], fill=R["wood"][1])
    L = R[liquid] if isinstance(liquid, str) else liquid
    d.ellipse([cx - rr + 11, cy - rr + 11, cx + rr - 11, cy + rr - 11], fill=L[2], outline=OUT)
    d.ellipse([cx - rr + 16, cy - rr + 14, cx + rr - 22, cy + rr - 24], fill=L[3])
    for k in range(4):
        ry_ = rng.uniform(-rr * .4, rr * .4); rx_ = rng.uniform(-rr * .3, rr * .2); d.arc([cx + rx_ - 14, cy + ry_ - 4, cx + rx_ + 14, cy + ry_ + 4], 200, 340, fill=L[4])
    d.line([cx - rr + 6, cy + rr * .3, cx + rr - 6, cy - rr * .1], fill=R["dwood"][3], width=5)        # the stirring pole
    if rec: rec.note(label.lower(), x, y)


def staves(m, x, y, w=1.6, h=.6, rec=None):
    """A stack of cut oak staves, pale ends showing, ready for the cooper."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h)
    m.shade((X0 + 4, Y0 + 6, X1 + 6, Y1 + 8), f=.6)
    for k, yy in enumerate(range(Y0, Y1 - 6, 9)):
        d.rectangle([X0 + (k % 2) * 4, yy, X1 - ((k + 1) % 2) * 4, yy + 8], fill=R["wood"][3 + k % 2], outline=OUT)
        d.line([X0 + 6, yy + 4, X1 - 6, yy + 4], fill=R["wood"][2])
    if rec: rec.note("stack of staves", x + w / 2, y + h / 2)


def hoops(m, x, y, n=5):
    """Iron barrel hoops stood in a row against the wall."""
    d = m.d
    for i in range(n):
        cx, cy = P(x) + i * 18, P(y); d.ellipse([cx - 12, cy - 9, cx + 12, cy + 9], outline=R["iron"][1], width=4); d.arc([cx - 12, cy - 9, cx + 12, cy + 9], 200, 280, fill=R["iron"][4])


def handcart(m, x, y, along="x", load="hay", rec=None):
    """A two-wheeled handcart: its plank bed with a load on it, the wheels either side and the shafts out in front."""
    d = m.d; cx, cy = P(x), P(y); bw, bh = (110, 66) if along == "x" else (66, 110)
    m.shade((cx - bw // 2 + 8, cy - bh // 2 + 10, cx + bw // 2 + 10, cy + bh // 2 + 12), f=.6)
    if along == "x":
        for s in (-1, 1): d.rectangle([cx - 22, cy + s * (bh // 2 + 5) - 6, cx + 22, cy + s * (bh // 2 + 5) + 6], fill=R["dwood"][1], outline=OUT)
        for s in (-1, 1): d.line([cx + bw // 2, cy + s * 22, cx + bw // 2 + 70, cy + s * 22], fill=R["wood"][2], width=5)
    else:
        for s in (-1, 1): d.rectangle([cx + s * (bw // 2 + 5) - 6, cy - 22, cx + s * (bw // 2 + 5) + 6, cy + 22], fill=R["dwood"][1], outline=OUT)
        for s in (-1, 1): d.line([cx + s * 22, cy + bh // 2, cx + s * 22, cy + bh // 2 + 70], fill=R["wood"][2], width=5)
    m.box(cx - bw // 2, cy - bh // 2, cx + bw // 2, cy + bh // 2, "wood", 2)
    for k in range(-bw // 2 + 8, bw // 2, 10) if along == "x" else range(-bh // 2 + 8, bh // 2, 10):
        if along == "x": d.line([cx + k, cy - bh // 2 + 2, cx + k, cy + bh // 2 - 2], fill=R["wood"][1])
        else: d.line([cx - bw // 2 + 2, cy + k, cx + bw // 2 - 2, cy + k], fill=R["wood"][1])
    if load == "hay":
        rng = m.rng
        d.ellipse([cx - bw // 2 + 4, cy - bh // 2 + 2, cx + bw // 2 - 4, cy + bh // 2 - 2], fill=R["straw"][3], outline=OUT)
        for _ in range(60): px_, py_ = cx + rng.uniform(-bw / 2 + 8, bw / 2 - 8), cy + rng.uniform(-bh / 2 + 6, bh / 2 - 6); d.line([px_, py_, px_ + rng.uniform(-6, 6), py_ + rng.uniform(-3, 3)], fill=R["straw"][int(rng.integers(1, 5))])
    if rec: rec.note("handcart", x, y)


def dyeline(m, x0, y, x1, cols):
    """Dyed cloth hung to dry on a line between two posts: long lengths of cloth draped over the line, each in its
    colour with the fold along the line, so the yard reads as a dyer's from above."""
    d = m.d; X0, X1, Y = P(x0), P(x1), P(y); n = len(cols); L = X1 - X0
    for px_ in (X0, X1): m.disc(px_, Y, 7, "dwood", 2, sh=4)
    for i, c in enumerate(cols):
        a = X0 + 12 + i * (L - 24) // n; b = a + (L - 24) // n - 8; C = R[c]
        m.shade((a + 6, Y - 8, b + 10, Y + 22), f=.55)
        d.rectangle([a, Y - 14, b, Y + 14], fill=C[3], outline=OUT); d.line([a + 1, Y, b - 1, Y], fill=C[1], width=2)
        d.line([a + 1, Y - 13, b - 1, Y - 13], fill=C[4])
        for k in range(a + 6, b - 2, 9): d.line([k, Y - 12, k + 1, Y + 12], fill=C[2])
    d.line([X0, Y, X1, Y], fill=R["straw"][1])


def brew_furnace(m, x, y, w=1.0, h=1.4, rec=None, label="Brew furnace"):
    """A brewer's furnace: a brick block against the wall with its fire-mouth glowing, the great copper set in its top."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    m.box(X0, Y0, X1, Y1, "clay", 2, sh=10)
    for yy in range(Y0 + 8, Y1, 12): d.line([X0 + 2, yy, X1 - 2, yy], fill=R["clay"][1])
    r = int(min(X1 - X0, Y1 - Y0) * .42)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(150, 84, 44), outline=OUT); d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=(120, 82, 40))
    d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 200, 290, fill=(214, 140, 80), width=3)
    d.rectangle([X1 - 6, cy + r - 4, X1 + 6, Y1 - 6], fill=(30, 22, 20)); m.fire(X1, cy + r + 8, 10, 8)
    m.hearths = getattr(m, "hearths", []) + [(X1, cy + r + 8, 120, None)]
    if rec: rec.light(label, label, (x, y, w, h), dim=5, bright=1.5, color="#ff9a40", kind="fire"); rec.note("brew furnace with its copper", x + w / 2, y + h / 2)


def horseshoes(m, x, y, n=4, along="y"):
    """Horseshoes hung on pegs: iron U shapes, open end down."""
    d = m.d
    for i in range(n):
        cx, cy = (P(x), P(y) + i * 22) if along == "y" else (P(x) + i * 22, P(y))
        d.arc([cx - 9, cy - 9, cx + 9, cy + 9], 180, 360, fill=OUT, width=6); d.arc([cx - 8, cy - 8, cx + 8, cy + 8], 180, 360, fill=R["iron"][3], width=4)
        d.line([cx - 8, cy, cx - 8, cy + 8], fill=R["iron"][3], width=4); d.line([cx + 8, cy, cx + 8, cy + 8], fill=R["iron"][3], width=4)
