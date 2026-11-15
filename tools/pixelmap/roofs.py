"""WoDX pixel map drawer (B5743): roofs. A roofed building's roof is its own picture, laid over the map as a
Foundry roof tile that fades when someone goes inside. Every redrawn map gives each roof a new picture, so no
old roof art is ever left over a new map.

    rec.roof("woodcutters-hut", "Woodcutters' hut", (7.48, 29.48, 8.06, 6.05), kind="shingle", smoke=(11.5, 32.5))

The rect is in squares (the old scene's tile rect where there is one, eaves and all). Kinds: shingle (split wooden
shingles), thatch (straw, combed, a turf ridge), slate (stone slates). Seen from straight above with the ridge
running along the longer side, the northern (or western) slope in the light and the far one in shade."""
import math

import numpy as np
from PIL import Image, ImageDraw

from px import Map, R, T, OUT

KINDS = {"shingle": ("wood", 16, 26), "thatch": ("straw", 0, 0), "slate": ("stone", 28, 18)}


def draw(rect, kind="shingle", seed=7, smoke=None, moss=.06):
    """The roof as an RGBA picture of exactly rect's size in pixels. smoke: (x, y) in squares on the map for a smoke
    hole or chimney, if the building has a hearth."""
    x, y, w, h = rect; PW, PH = int(round(w * T)), int(round(h * T))
    m = Map(math.ceil(w) + 1, math.ceil(h) + 1, seed=seed); rng = m.rng
    along_x = PW >= PH; ramp, bw, bh = KINDS[kind]
    L = PH if along_x else PW                                                          # across the ridge
    if kind == "thatch":
        a = m.ramp(np.clip(m.noise(PH, PW, 30) * .25 + .45, 0, .999), "straw", 2, 4)
        yy, xx = np.mgrid[0:PH, 0:PW]
        comb = ((xx + (yy // 3) * 2) % 7 == 0) if along_x else ((yy + (xx // 3) * 2) % 7 == 0)   # combed strands down the slope
        a[comb & (m.noise(PH, PW, 6) > .3)] = R["straw"][1]
    else:
        a = m.blocks(PH, PW, bw, bh, ramp, lo=2, hi=3) if along_x else np.transpose(m.blocks(PW, PH, bw, bh, ramp, lo=2, hi=3), (1, 0, 2))
    a = a.astype(np.float32)
    if kind == "shingle": a = a * .72 + np.array([128, 118, 104], np.float32) * .28         # oak shingles weather silver-brown
    t = (np.arange(L) / max(1, L - 1))                                                   # 0 at the north (west) eave, 1 at the south (east)
    lit = np.where(t < .5, 1.18 - t * .2, .7 - (t - .5) * .14)                          # the sunny slope bright, the far one in shade
    a *= (lit[:, None, None] if along_x else lit[None, :, None])
    if moss:                                                                            # moss and weathering in patches
        mk = (m.noise(PH, PW, 40) > 1 - moss * 4) & (rng.random((PH, PW)) < .35)          # specks, thicker in a few damp spots
        a[mk] = a[mk] * .55 + np.array(R["green"][2], np.float32) * .45
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert("RGBA"); d = ImageDraw.Draw(img)
    mid = L // 2
    ridge = R["dwood"][2] if kind != "thatch" else R["green"][1]                         # a board ridge, or a turf one on thatch
    if along_x:
        d.rectangle([0, mid - 7, PW, mid + 7], fill=ridge, outline=OUT); d.line([0, mid - 5, PW, mid - 5], fill=R["dwood"][4] if kind != "thatch" else R["green"][3])
    else:
        d.rectangle([mid - 7, 0, mid + 7, PH], fill=ridge, outline=OUT); d.line([mid - 5, 0, mid - 5, PH], fill=R["dwood"][4] if kind != "thatch" else R["green"][3])
    d.rectangle([0, 0, PW - 1, PH - 1], outline=OUT); d.rectangle([1, 1, PW - 2, PH - 2], outline=tuple(int(v * .6) for v in R[ramp][1]))   # the eaves
    if smoke:
        sx, sy = int((smoke[0] - x) * T), int((smoke[1] - y) * T)
        if along_x: sy = mid
        else: sx = mid
        for k in range(8):                                                                  # soot round the smoke hole
            px_, py_ = sx + rng.uniform(-32, 32), sy + rng.uniform(-32, 32); d.ellipse([px_ - 8, py_ - 8, px_ + 8, py_ + 8], fill=(52, 46, 46, 255))
        d.rectangle([sx - 18, sy - 18, sx + 18, sy + 18], fill=R["stone"][2], outline=OUT)   # its stone hood
        d.rectangle([sx - 10, sy - 10, sx + 10, sy + 10], fill=(24, 20, 20))
    return img
