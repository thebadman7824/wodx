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
