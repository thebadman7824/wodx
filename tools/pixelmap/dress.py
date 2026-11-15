"""WoDX pixel map drawer (B5746): dressing. After a map's big furniture is down, dress() fills each room, yard,
street and wood with the small things of daily use for its kind of place, so no room or road looks bare: baskets,
buckets, jugs and pots, firewood, brooms, rag rugs, boots and cloaks, tools, sacks and crates, straw, dung, ferns,
fallen branches and the like. Every piece is drawn at its true size and to be named by sight.

    dr.snap(m)                       # once the floors and ground are laid, before any furniture
    ... walls, doors, furniture ...
    dr.dress(m, rec, (x, y, w, h), "home")          # a room
    dr.dress(m, rec, (x, y, w, h), "street", n=40)  # a street, yard or road

dress() places a piece only where the picture is still bare floor or ground (it compares with the snapshot) and
clear of anything that opens, so it never lands on furniture, walls or doors. Kinds: home, shop, work, store,
stable, hall, yard, street, wood, camp, ruin."""
import math

import numpy as np

import props as pr
from px import R, T, OUT

DEBUG = False
P = lambda v: int(round(v * T))
C = 12                                                                                 # occupancy cell in pixels


def snap(m):
    """Remember the bare floor and ground, so dress() can tell where things already stand."""
    m._snap = np.asarray(m.img).astype(np.int16).copy()


def resnap(m, rect):
    """Count what is now in rect (squares) as bare: for a floor laid after the snapshot."""
    x, y, w, h = rect; X0, Y0, X1, Y1 = max(0, int(x * T)), max(0, int(y * T)), int((x + w) * T), int((y + h) * T)
    m._snap[Y0:Y1, X0:X1] = np.asarray(m.img)[Y0:Y1, X0:X1]; m._occ = None


def _grid(m, rec):
    """Occupied cells: wherever the picture has changed since the snapshot, and every openable's box."""
    if getattr(m, "_occ", None) is not None: return m._occ
    a = np.asarray(m.img).astype(np.int16); diff = np.abs(a - m._snap).sum(2) > 60
    gh, gw = diff.shape[0] // C, diff.shape[1] // C
    occ = diff[:gh * C, :gw * C].reshape(gh, C, gw, C).mean((1, 3)) > .04
    for o in rec.things:
        x0, y0, x1, y1 = o["box"]; k = min(26, (x1 - x0) / 2 - 8, (y1 - y0) / 2 - 8); x0, y0, x1, y1 = x0 + k, y0 + k, x1 - k, y1 - k
        occ[max(0, int(y0) // C):int(y1) // C + 1, max(0, int(x0) // C):int(x1) // C + 1] = True
    m._occ = occ
    if DEBUG:
        from PIL import Image; Image.fromarray((occ * 255).astype(np.uint8)).save('/tmp/pm/occ.png')
    return occ


def _free(occ, cx, cy, r):
    y0, y1, x0, x1 = int(cy - r) // C - 1, int(cy + r) // C + 1, int(cx - r) // C - 1, int(cx + r) // C + 1
    if y0 < 0 or x0 < 0 or y1 >= occ.shape[0] or x1 >= occ.shape[1]: return False
    return not occ[y0:y1 + 1, x0:x1 + 1].any()


def _take(occ, cx, cy, r):
    occ[max(0, int(cy - r) // C):int(cy + r) // C + 1, max(0, int(cx - r) // C):int(cx + r) // C + 1] = True


# ---------- turning a piece to face its room ----------
def turned(m, x, y, w, h, face, fn, margin=1):
    """Draw a piece facing the room. fn(tm, lx, ly, lw, lh) draws it on a scratch map with its front (an oven's
    mouth, a cupboard's doors, a chest's lock, a bench's seat edge, a bed's foot) toward the south; it is then turned
    so the front faces `face` (n, s, e or w) and laid into the box (x, y, w, h), squares. Its shadow and any glow
    it throws come with it. Openables drawn this way are laid as plain pictures."""
    from px import Map
    from PIL import Image
    lw, lh = (w, h) if face in "ns" else (h, w)
    tm = Map(int(math.ceil(lw)) + 2 * margin + 1, int(math.ceil(lh)) + 2 * margin + 1, seed=int(m.rng.integers(1, 1 << 30)))
    KEY = (255, 0, 255); tm.img.paste(KEY, (0, 0, tm.img.size[0], tm.img.size[1])); tm.rng = m.rng
    old = pr.REC; pr.REC = None
    try: fn(tm, margin, margin, lw, lh)
    finally: pr.REC = old
    pad = int(T * .45); X0, Y0, X1, Y1 = int(margin * T) - pad, int(margin * T) - pad, int((margin + lw) * T) + pad, int((margin + lh) * T) + pad
    crop = tm.img.crop((X0, Y0, X1, Y1))
    rot = {"s": None, "n": Image.ROTATE_180, "e": Image.ROTATE_90, "w": Image.ROTATE_270}[face]
    if rot is not None: crop = crop.transpose(rot)
    a = np.asarray(crop).astype(np.int16); R_, G_, B_ = a[..., 0], a[..., 1], a[..., 2]
    key = (G_ < 40) & (np.abs(R_ - B_) < 26) & (R_ > 90)
    dx, dy = int(x * T) - pad, int(y * T) - pad; Hh, Ww = a.shape[:2]
    dst = np.asarray(m.img).astype(np.float32)
    sy0, sx0 = max(0, -dy), max(0, -dx); ey, ex = min(Hh, dst.shape[0] - dy), min(Ww, dst.shape[1] - dx)
    reg = dst[dy + sy0:dy + ey, dx + sx0:dx + ex]; aa = a[sy0:ey, sx0:ex]; kk = key[sy0:ey, sx0:ex]
    f = (aa[..., 0].astype(np.float32) / 255.0)[..., None]                                    # a shadow fallen on the key darkens the floor
    out = np.where(kk[..., None], reg * np.where(f < .97, .45 + .55 * f, 1.0), aa.astype(np.float32))
    dst[dy + sy0:dy + ey, dx + sx0:dx + ex] = out
    m.img.paste(Image.fromarray(dst.clip(0, 255).astype(np.uint8)), (0, 0))
    cx0, cy0 = (X0 + X1) / 2, (Y0 + Y1) / 2; ox, oy = dx + Ww / 2, dy + Hh / 2
    for hx, hy, hr, cone in getattr(tm, "hearths", []):
        u, v = hx - cx0, hy - cy0
        if face == "n": u, v, t = -u, -v, math.pi
        elif face == "e": u, v, t = v, -u, -math.pi / 2
        elif face == "w": u, v, t = -v, u, math.pi / 2
        else: t = 0
        m.hearths = getattr(m, "hearths", []) + [(ox + u, oy + v, hr, (cone[0] + t, cone[1]) if cone else None)]
    if getattr(m, "_occ", None) is not None:
        m._occ[max(0, int(y * T) // C):int((y + h) * T) // C + 1, max(0, int(x * T) // C):int((x + w) * T) // C + 1] = True


def oven(m, x, y, w, h, face, rec=None, label="Oven"):
    """A bread oven or stove against a wall with its mouth and sill facing `face`, out to the room where it is worked."""
    turned(m, x, y, w, h, face, lambda tm, lx, ly, lw, lh: tm.oven(lx, ly, lw, lh, side="n"))
    if rec: rec.light(label, label, (x, y, w, h), dim=5, bright=1.5, color="#ff9a40", kind="fire")


# ---------- small pieces (pixels; each returns nothing, drawn at cx, cy) ----------
def broom(m, cx, cy, ang):
    """A birch broom leant on the floor: a pale handle and a fanned head of twigs."""
    d = m.d; dx, dy = math.cos(ang), math.sin(ang)
    d.line([cx - dx * 30, cy - dy * 30, cx + dx * 14, cy + dy * 14], fill=R["wood"][3], width=4)
    for k in range(-5, 6):
        a = ang + k * .07; d.line([cx + dx * 12, cy + dy * 12, cx + math.cos(a) * 34, cy + math.sin(a) * 34], fill=R["straw"][1 + (k % 3)], width=2)


def ragrug(m, cx, cy, w, h, col):
    """A braided rag rug, an oval of coloured rings."""
    d = m.d; m.shade((cx - w / 2 + 3, cy - h / 2 + 4, cx + w / 2 + 3, cy + h / 2 + 4), kind="ellipse", f=.8)
    cols = (R[col][2], R[col][3], R["dwood"][3], R[col][2], R["gold"][3], R[col][3], R["linen"][3])
    for k, c in enumerate(cols):
        i = k * min(w, h) / 15; e = [cx - w / 2 + i, cy - h / 2 + i, cx + w / 2 - i, cy + h / 2 - i]
        if e[2] - e[0] < 6: break
        d.ellipse(e, fill=c, outline=OUT if k == 0 else None)
        for t in np.linspace(0, 2 * math.pi, int((e[2] - e[0]) / 3), endpoint=False):          # the braid of each ring
            px_, py_ = cx + math.cos(t) * (e[2] - e[0]) / 2 * .97, cy + math.sin(t) * (e[3] - e[1]) / 2 * .97; d.point((px_, py_), fill=tuple(max(0, v - 30) for v in c))


def boots(m, cx, cy):
    """A pair of leather boots stood together."""
    d = m.d
    for s in (-7, 7):
        d.rounded_rectangle([cx + s - 6, cy - 12, cx + s + 6, cy + 12], 5, fill=(84, 56, 36), outline=OUT) if hasattr(d, "rounded_rectangle") else d.ellipse([cx + s - 6, cy - 12, cx + s + 6, cy + 12], fill=(84, 56, 36), outline=OUT)
        d.ellipse([cx + s - 4, cy - 10, cx + s + 4, cy - 2], fill=(40, 28, 20))


def cloak(m, cx, cy, col):
    """A cloak or coat hung on a wall peg: a long folded drape of wool."""
    d = m.d; C_ = R[col]
    d.polygon([(cx - 10, cy - 14), (cx + 10, cy - 14), (cx + 16, cy + 18), (cx - 16, cy + 18)], fill=C_[2], outline=OUT)
    for k in (-8, 0, 8): d.line([cx + k * .6, cy - 12, cx + k * 1.4, cy + 16], fill=C_[1])
    d.ellipse([cx - 4, cy - 18, cx + 4, cy - 10], fill=R["dwood"][2], outline=OUT)


def bundle(m, cx, cy, ang):
    """A bundle of kindling tied with withy."""
    d = m.d; dx, dy = math.cos(ang), math.sin(ang)
    for k in range(-3, 4):
        ox, oy = -dy * k * 3, dx * k * 3; d.line([cx - dx * 22 + ox, cy - dy * 22 + oy, cx + dx * 22 + ox, cy + dy * 22 + oy], fill=R["wood"][1 + (k % 3)], width=3)
    d.line([cx - dy * 12, cy + dx * 12, cx + dy * 12, cy - dx * 12], fill=R["straw"][2], width=3)


def pot(m, cx, cy, r=12):
    """An iron cooking pot on its three feet: the black rim, a bail handle over it, pottage inside with a ladle."""
    d = m.d
    for a in (.5, 2.6, 4.7): d.line([cx, cy, cx + math.cos(a) * (r + 5), cy + math.sin(a) * (r + 5)], fill=R["iron"][0], width=3)
    m.disc(cx, cy, r, "iron", 1, sh=3); d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=(120, 90, 50)); d.ellipse([cx - r + 6, cy - r + 6, cx, cy], fill=(150, 116, 66))
    d.arc([cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3], 200, 340, fill=R["iron"][3], width=2)
    d.line([cx - 2, cy + 2, cx + r + 10, cy - r - 2], fill=R["wood"][3], width=3); d.ellipse([cx - 6, cy - 2, cx + 2, cy + 6], fill=R["wood"][3], outline=OUT)


def tool(m, cx, cy, ang, kind="spade", L=40):
    """A long-handled tool laid down: spade, rake, pitchfork or hoe, the iron head at the far end."""
    d = m.d; dx, dy = math.cos(ang), math.sin(ang); ex, ey = cx + dx * L, cy + dy * L
    d.line([cx - dx * L, cy - dy * L, ex, ey], fill=R["wood"][3], width=4); d.line([cx - dx * L, cy - dy * L, ex, ey], fill=R["wood"][4], width=1)
    px_, py_ = -dy, dx
    if kind == "spade": d.polygon([(ex + px_ * 8, ey + py_ * 8), (ex - px_ * 8, ey - py_ * 8), (ex - px_ * 7 + dx * 18, ey - py_ * 7 + dy * 18), (ex + px_ * 7 + dx * 18, ey + py_ * 7 + dy * 18)], fill=R["iron"][3], outline=OUT)
    else:
        d.line([ex + px_ * 12, ey + py_ * 12, ex - px_ * 12, ey - py_ * 12], fill=R["iron"][2], width=3)
        for k in ((-12, -4, 4, 12) if kind == "rake" else (-8, 0, 8)): d.line([ex + px_ * k, ey + py_ * k, ex + px_ * k + dx * 12, ey + py_ * k + dy * 12], fill=R["iron"][3], width=2)


def straw(m, cx, cy, r=22):
    """Loose straw or rushes strewn on the floor."""
    d = m.d; rng = m.rng
    for _ in range(int(r * 1.2)):
        x, y = cx + rng.uniform(-r, r), cy + rng.uniform(-r * .7, r * .7); d.line([x, y, x + rng.uniform(-9, 9), y + rng.uniform(-4, 4)], fill=R["straw"][int(rng.integers(1, 5))])


def dung(m, cx, cy):
    """A heap of horse dung: dark lumps with straw in it."""
    d = m.d; rng = m.rng
    for _ in range(6):
        x, y = cx + rng.uniform(-9, 9), cy + rng.uniform(-6, 6); d.ellipse([x - 5, y - 4, x + 5, y + 4], fill=(78, 60, 36), outline=(48, 36, 22))
    for _ in range(5): x, y = cx + rng.uniform(-10, 10), cy + rng.uniform(-6, 6); d.line([x, y, x + 5, y + 2], fill=R["straw"][2])


def fern(m, cx, cy, r=26):
    """A clump of bracken: fronds fanned out from the middle, each a feathered green stroke."""
    d = m.d; rng = m.rng; G = R["green"]
    for k in range(7):
        a = rng.uniform(0, 6.28); L = r * rng.uniform(.6, 1); ex, ey = cx + math.cos(a) * L, cy + math.sin(a) * L
        d.line([cx, cy, ex, ey], fill=G[1], width=2)
        for t in np.linspace(.2, .9, 5):
            x, y = cx + (ex - cx) * t, cy + (ey - cy) * t; s = (1 - t) * 8 + 2
            d.line([x - math.sin(a) * s, y + math.cos(a) * s, x + math.sin(a) * s, y - math.cos(a) * s], fill=G[2 + (k % 2)])


def branch(m, cx, cy, ang):
    """A fallen branch with a twig or two off it."""
    d = m.d; dx, dy = math.cos(ang), math.sin(ang)
    m.shade((cx - 30, cy - 4, cx + 34, cy + 10), f=.7)
    d.line([cx - dx * 36, cy - dy * 36, cx + dx * 36, cy + dy * 36], fill=R["dwood"][2], width=6); d.line([cx - dx * 34, cy - dy * 34 - 1, cx + dx * 34, cy + dy * 34 - 1], fill=R["dwood"][3], width=2)
    for t, s in ((-.3, 1), (.4, -1)):
        x, y = cx + dx * 36 * t, cy + dy * 36 * t; d.line([x, y, x + (dx - dy * s) * 18, y + (dy + dx * s) * 18], fill=R["dwood"][2], width=3)


def mushrooms(m, cx, cy):
    """A ring of pale toadstools in the leaf litter."""
    d = m.d; rng = m.rng
    for _ in range(5):
        x, y = cx + rng.uniform(-12, 12), cy + rng.uniform(-9, 9); d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(214, 196, 160), outline=OUT); d.point((x - 1, y - 1), fill=(240, 230, 200))


def stones(m, cx, cy):
    """A few loose stones."""
    rng = m.rng
    for _ in range(3): m.rock(int(cx + rng.uniform(-14, 14)), int(cy + rng.uniform(-10, 10)), int(rng.uniform(8, 14)), int(rng.uniform(6, 10)))


def butt(m, cx, cy):
    """A water butt under the eaves: a big cask, its head off, full of rainwater."""
    m.disc(cx, cy, 24, "wood", 2, sh=6); m.d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], outline=R["iron"][1], width=3); m.d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=R["water"][2])
    m.d.arc([cx - 10, cy - 8, cx + 6, cy + 2], 200, 330, fill=R["water"][4])


def rope(m, cx, cy):
    """A coil of rope."""
    for r in (14, 10, 6): m.d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=R["straw"][1], width=3); m.d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=R["straw"][3], width=1)


def shavings(m, cx, cy):
    """Wood shavings curled on the floor."""
    d = m.d; rng = m.rng
    for _ in range(10): x, y = cx + rng.uniform(-16, 16), cy + rng.uniform(-10, 10); d.arc([x - 4, y - 3, x + 4, y + 3], 0, 250, fill=R["wood"][4])


def rubble(m, cx, cy):
    m.rubble(cx, cy, n=6, spread=18)


# ---------- furniture and fittings set along a wall (pixel box; horiz: the wall runs east-west) ----------
q = lambda v: v / T


def shelfgoods(a): return [("jug", "bowl", "plates", "pot", "loaf", "cheese", "candle", "linen")[int(a * 7 + k * 3) % 8] for k in range(6)]


def f_shelf(m, X0, Y0, X1, Y1, a, hz): pr.shelf(m, q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0), shelfgoods(a)[:max(2, int(max(X1 - X0, Y1 - Y0) / 34))])


def f_cupboard(m, X0, Y0, X1, Y1, a, hz):
    """A tall cupboard or dresser against the wall: its top, the door line and a latch."""
    m.box(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, "dwood", 2, sh=8); d = m.d
    if hz: d.line([(X0 + X1) // 2, Y0 + 5, (X0 + X1) // 2, Y1 - 5], fill=R["dwood"][1]); d.rectangle([(X0 + X1) // 2 - 6, (Y0 + Y1) // 2 - 2, (X0 + X1) // 2 - 2, (Y0 + Y1) // 2 + 2], fill=R["iron"][3])
    else: d.line([X0 + 5, (Y0 + Y1) // 2, X1 - 5, (Y0 + Y1) // 2], fill=R["dwood"][1]); d.rectangle([(X0 + X1) // 2 - 2, (Y0 + Y1) // 2 - 6, (X0 + X1) // 2 + 2, (Y0 + Y1) // 2 - 2], fill=R["iron"][3])
    for k in range(3): pr.jug(m, X0 + 14 + k * 18, Y0 + 12, 6) if hz and X1 - X0 > 70 else None


def f_bench(m, X0, Y0, X1, Y1, a, hz): pr.bench(m, q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0))


def f_chest(m, X0, Y0, X1, Y1, a, hz): pr.chest(m, q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0)) if hz else pr.chest(m, q(X0) - .2, q(Y0) + .2, q(Y1 - Y0), q(X1 - X0))


def f_crates(m, X0, Y0, X1, Y1, a, hz):
    """Crates stacked against the wall."""
    n = max(1, int(max(X1 - X0, Y1 - Y0) / 46))
    for k in range(n): pr.crate(m, q(X0 + (k * 46 if hz else 0)), q(Y0 + (0 if hz else k * 46)), 42, goods=("apples", "jars")[(k + int(a * 10)) % 2])


def f_casks(m, X0, Y0, X1, Y1, a, hz):
    """A row of casks against the wall."""
    n = max(1, int(max(X1 - X0, Y1 - Y0) / 44))
    for k in range(n): pr.barrel(m, q(X0 + 22 + (k * 44 if hz else 0)), q(Y0 + 22 + (0 if hz else k * 44)), 20, holds=("water", "grain")[(k + int(a * 10)) % 2])


def f_sacks(m, X0, Y0, X1, Y1, a, hz):
    n = max(1, int(max(X1 - X0, Y1 - Y0) / 36))
    for k in range(n): pr.sack(m, q(X0 + 18 + (k * 36 if hz else 0)), q(Y0 + 18 + (0 if hz else k * 36)), 18)


def f_woodpile(m, X0, Y0, X1, Y1, a, hz): pr.logpile(m, q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0))


def f_workbench(m, X0, Y0, X1, Y1, a, hz):
    """A workbench with tools laid on it: a mallet, a chisel, a saw."""
    m.table(q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0), things=False); d = m.d; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    d.rectangle([cx - 30, cy - 6, cx - 14, cy + 6], fill=R["dwood"][2], outline=OUT); d.line([cx - 14, cy, cx + 4, cy], fill=R["wood"][3], width=3)   # mallet
    d.polygon([(cx + 10, cy - 8), (cx + 40, cy - 8), (cx + 40, cy + 2), (cx + 10, cy + 6)], fill=R["iron"][3], outline=OUT); d.rectangle([cx + 2, cy - 8, cx + 10, cy + 6], fill=R["wood"][2])  # saw


def f_rack(m, X0, Y0, X1, Y1, a, hz):
    """Tools hung on pegs along the wall: spade, rake, fork and axe."""
    kinds = ("spade", "rake", "fork"); n = max(2, int(max(X1 - X0, Y1 - Y0) / 26))
    for k in range(n):
        x, y = (X0 + 13 + k * 26, (Y0 + Y1) // 2) if hz else ((X0 + X1) // 2, Y0 + 13 + k * 26)
        tool(m, x, y, (math.pi / 2 if hz else 0) + (k % 2) * .08, kinds[k % 3], L=26)


def f_table(m, X0, Y0, X1, Y1, a, hz):
    """A small table with stools round it and something on it."""
    m.table(q(X0) + .15, q(Y0) + .15, q(X1 - X0) - .3, q(Y1 - Y0) - .3, things=True)
    pr.stool(m, q(X0) + .05, q(Y0 + Y1) / 2); pr.stool(m, q(X1) - .05, q(Y0 + Y1) / 2)


def f_wheel(m, X0, Y0, X1, Y1, a, hz):
    """A spinning wheel: the great wheel seen edge-on from above as a long rim, its stand and the spindle."""
    d = m.d; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    m.shade((cx - 30, cy - 6, cx + 34, cy + 16), f=.6); d.rectangle([cx - 30, cy - 4, cx + 30, cy + 4], fill=R["dwood"][2], outline=OUT)
    d.ellipse([cx - 28, cy - 22, cx + 4, cy + 22], outline=R["wood"][3], width=3); d.line([cx - 12, cy - 22, cx - 12, cy + 22], fill=R["wood"][2], width=2)
    d.line([cx + 10, cy, cx + 30, cy - 10], fill=R["wood"][4], width=3); d.ellipse([cx + 24, cy - 14, cx + 32, cy - 6], fill=R["linen"][3])


def f_sawhorse(m, X0, Y0, X1, Y1, a, hz):
    """A sawhorse with a log on it and sawdust under it."""
    d = m.d; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    for k in range(14): d.point((cx + m.rng.uniform(-24, 24), cy + m.rng.uniform(-14, 14) + 8), fill=R["wood"][4])
    m.box(cx - 30, cy - 4, cx + 30, cy + 4, "wood", 2, sh=4)
    for s in (-24, 24): d.line([cx + s - 6, cy - 12, cx + s + 6, cy + 12], fill=R["dwood"][2], width=4); d.line([cx + s + 6, cy - 12, cx + s - 6, cy + 12], fill=R["dwood"][2], width=4)
    pr.logpile(m, q(cx - 34), q(cy - 9), q(68), q(18))


def f_grindstone(m, X0, Y0, X1, Y1, a, hz):
    """A grindstone in its frame with its crank and a trough of water under it."""
    d = m.d; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    m.box(cx - 26, cy - 14, cx + 26, cy + 14, "dwood", 2, sh=6); d.rectangle([cx - 20, cy - 8, cx + 20, cy + 8], fill=R["water"][2])
    d.rectangle([cx - 6, cy - 18, cx + 6, cy + 18], fill=R["stone"][3], outline=OUT); d.line([cx, cy - 18, cx, cy + 18], fill=R["stone"][4])
    d.line([cx + 6, cy, cx + 34, cy], fill=R["iron"][2], width=3); d.line([cx + 34, cy, cx + 34, cy + 12], fill=R["wood"][3], width=4)


def f_cart(m, X0, Y0, X1, Y1, a, hz):
    import town as tw
    tw.handcart(m, q(X0 + X1) / 2, q(Y0 + Y1) / 2, along="x" if hz else "y", load=("hay", "none")[int(a * 10) % 2])


def f_stall(m, X0, Y0, X1, Y1, a, hz):
    import town as tw
    tw.stall(m, q(X0), q(Y0), q(X1 - X0), q(Y1 - Y0), ("red", "blue", "green", "gold")[int(a * 10) % 4], ("loaf", "cloth", "pots", "fish", "apples")[int(a * 7) % 5])


def f_heap(m, X0, Y0, X1, Y1, a, hz):
    """Goods set out on the cobbles on a cloth: baskets and sacks round a heap of cabbages or turnips."""
    d = m.d; cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; c = R[("linen", "blue", "red")[int(a * 10) % 3]]
    m.shade((X0 + 6, Y0 + 8, X1 + 8, Y1 + 10), f=.65); d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=c[3], outline=OUT)
    for k in range(9): pr.cabbage(m, int(cx - 24 + (k % 3) * 16), int(cy - 14 + (k // 3) * 14), 8)
    pr.basket(m, X0 + 20, Y1 - 20, 14, fill="eggs"); pr.basket(m, X1 - 20, Y0 + 20, 14, fill="onions")


def f_hayrick(m, X0, Y0, X1, Y1, a, hz): pr.hay(m, q(X0 + X1) / 2, q(Y0 + Y1) / 2, int(min(X1 - X0, Y1 - Y0) * .45))


def f_trough(m, X0, Y0, X1, Y1, a, hz): pr.trough(m, q(X0) + .05, q(Y0) + .05, q(X1 - X0) - .1, q(Y1 - Y0) - .1)


def f_washline(m, X0, Y0, X1, Y1, a, hz):
    if hz: pr.washline(m, q(X0), q(Y0 + Y1) / 2, q(X1), q(Y0 + Y1) / 2, [(c, 26) for c in ("linen", "blue", "linen", "red")])


def f_bed(m, X0, Y0, X1, Y1, a, hz): pr.bed(m, q(X0) + .05, q(Y0) + .05, q(X1 - X0) - .1, q(Y1 - Y0) - .1, head=("w" if hz else "n"), cloth=("red", "blue", "green", "linen")[int(a * 10) % 4])


def f_pallet(m, X0, Y0, X1, Y1, a, hz):
    """A straw pallet on the floor with a blanket thrown over it."""
    d = m.d; m.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 6), f=.65)
    d.rectangle([X0 + 3, Y0 + 3, X1 - 3, Y1 - 3], fill=R["straw"][2], outline=OUT); straw(m, (X0 + X1) // 2, (Y0 + Y1) // 2, 14)
    c = R[("red", "blue", "green", "dwood")[int(a * 10) % 4]]
    if hz: d.rectangle([(X0 + X1) // 2 - 6, Y0 + 3, X1 - 3, Y1 - 3], fill=c[2], outline=OUT)
    else: d.rectangle([X0 + 3, (Y0 + Y1) // 2 - 6, X1 - 3, Y1 - 3], fill=c[2], outline=OUT)


def f_fern(m, X0, Y0, X1, Y1, a, hz): fern(m, (X0 + X1) // 2, (Y0 + Y1) // 2, min(X1 - X0, Y1 - Y0) // 2)


def f_bush(m, X0, Y0, X1, Y1, a, hz): m.bush((X0 + X1) // 2, (Y0 + Y1) // 2, min(X1 - X0, Y1 - Y0) // 2, berries=("red" if a > 4 else None))


def f_small(fn):
    return lambda m, X0, Y0, X1, Y1, a, hz: fn(m, (X0 + X1) // 2, (Y0 + Y1) // 2, a)


SMALL = {
    "basket": (16, 16, lambda m, x, y, a: pr.basket(m, x, y, 15, fill=("wool", "apples", "onions", "eggs", "turnips")[int(a * 10) % 5])),
    "bucket": (14, 14, lambda m, x, y, a: pr.bucket(m, x, y, 13, water=a > 1)), "jug": (10, 10, lambda m, x, y, a: pr.jug(m, x, y, 8)),
    "pot": (14, 14, lambda m, x, y, a: pot(m, x, y)), "bundle": (24, 24, lambda m, x, y, a: bundle(m, x, y, a)), "broom": (32, 32, lambda m, x, y, a: broom(m, x, y, a)),
    "rug": (46, 32, lambda m, x, y, a: ragrug(m, x, y, 90, 60, ("red", "blue", "green", "gold")[int(a * 10) % 4])), "boots": (16, 14, lambda m, x, y, a: boots(m, x, y)),
    "cloak": (18, 20, lambda m, x, y, a: cloak(m, x, y, ("red", "blue", "dwood", "green")[int(a * 10) % 4])),
    "stool": (16, 16, lambda m, x, y, a: pr.stool(m, x / T, y / T)), "distaff": (14, 14, lambda m, x, y, a: pr.distaff(m, x, y, a)),
    "sack": (22, 22, lambda m, x, y, a: pr.sack(m, x / T, y / T, 18)), "straw": (24, 18, lambda m, x, y, a: straw(m, x, y)), "dung": (14, 12, lambda m, x, y, a: dung(m, x, y)),
    "tool": (40, 40, lambda m, x, y, a: tool(m, x, y, a, ("spade", "rake", "fork")[int(a * 10) % 3])), "rope": (16, 16, lambda m, x, y, a: rope(m, x, y)),
    "shavings": (20, 14, lambda m, x, y, a: shavings(m, x, y)), "stones": (18, 14, lambda m, x, y, a: stones(m, x, y)), "butt": (26, 26, lambda m, x, y, a: butt(m, x, y)),
    "crate": (26, 26, lambda m, x, y, a: pr.crate(m, x / T - .22, y / T - .22, 42, goods=("apples", "jars")[int(a * 10) % 2])),
    "cask": (22, 22, lambda m, x, y, a: pr.barrel(m, x / T, y / T, 20, holds=("water", "grain")[int(a * 10) % 2])),
    "fernsm": (24, 24, lambda m, x, y, a: fern(m, x, y)), "branch": (36, 14, lambda m, x, y, a: branch(m, x, y, a)), "mush": (14, 12, lambda m, x, y, a: mushrooms(m, x, y)),
    "rubble": (22, 18, lambda m, x, y, a: rubble(m, x, y)), "cup": (8, 8, lambda m, x, y, a: pr.cup(m, x, y)),
}
# big pieces: (length along the wall, depth) in squares, and how they are drawn
BIG = {"stall": (2.7, 1.2, f_stall), "heap": (1.1, .9, f_heap), "shelf": (1.6, .42, f_shelf), "cupboard": (1.3, .55, f_cupboard), "bench": (1.6, .36, f_bench), "chest": (.95, .58, f_chest),
       "crates": (1.4, .5, f_crates), "casks": (1.4, .48, f_casks), "sacks": (1.2, .4, f_sacks), "woodpile": (1.6, .5, f_woodpile),
       "workbench": (1.8, .7, f_workbench), "rack": (1.4, .4, f_rack), "table": (1.3, .9, f_table), "wheel": (.9, .7, f_wheel),
       "sawhorse": (.9, .55, f_sawhorse), "grindstone": (.9, .6, f_grindstone), "cart": (1.6, 1.1, f_cart), "hayrick": (1.3, 1.3, f_hayrick),
       "trough": (1.4, .5, f_trough), "washline": (2.6, .5, f_washline), "bed": (1.8, .95, f_bed), "pallet": (1.7, .8, f_pallet),
       "fern": (.8, .8, f_fern), "bush": (1.0, 1.0, f_bush)}

# what each kind of place has: [(weight, piece, where)], where: wall (along a side), floor (in the open), any
MENU = {
    "home": [(3, "shelf", "wall"), (3, "dresser", "wall"), (2, "bench", "wall"), (2, "chest", "wall"), (2, "pegrail", "wall"), (1, "woodpile", "wall"), (1, "pallet", "wall"),
             (1, "wheel", "any"), (1, "churn", "wall"), (1, "quern", "wall"), (1, "washtub", "any"), (2, "table", "floor"), (1, "rug", "floor"),
             (3, "basket", "wall"), (3, "bucket", "wall"), (2, "pot", "wall"), (2, "bundle", "wall"), (2, "broom", "wall"), (2, "boots", "wall"),
             (2, "stool", "any"), (1, "distaff", "any"), (1, "sack", "wall"), (1, "straw", "floor"), (1, "jug", "wall")],
    "shop": [(3, "shelf", "wall"), (3, "crates", "wall"), (2, "casks", "wall"), (2, "sacks", "wall"), (1, "dresser", "wall"), (1, "bench", "wall"), (1, "chest", "wall"),
             (1, "table", "floor"), (3, "basket", "wall"), (2, "crate", "any"), (2, "sack", "wall"), (1, "broom", "wall"), (1, "bucket", "wall"), (1, "rope", "any"),
             (1, "stool", "any"), (1, "jug", "wall")],
    "work": [(3, "workbench", "wall"), (2, "rack", "wall"), (2, "shelf", "wall"), (2, "crates", "wall"), (2, "casks", "wall"), (1, "woodpile", "wall"), (1, "chest", "wall"),
             (2, "sawhorse", "floor"), (1, "grindstone", "floor"), (3, "shavings", "floor"), (2, "bucket", "wall"), (2, "tool", "wall"), (2, "bundle", "wall"),
             (2, "sack", "wall"), (1, "rope", "any"), (1, "broom", "wall"), (1, "stool", "any")],
    "joinery": [(3, "workbench", "wall"), (2, "rack", "wall"), (2, "woodpile", "wall"), (1, "shelf", "wall"), (2, "sawhorse", "floor"), (1, "grindstone", "floor"),
                (4, "shavings", "floor"), (2, "bundle", "wall"), (2, "bucket", "wall"), (1, "tool", "wall"), (1, "broom", "wall"), (1, "stool", "any"), (1, "rope", "any")],
    "smith": [(2, "workbench", "wall"), (3, "rack", "wall"), (2, "casks", "wall"), (1, "crates", "wall"), (1, "sacks", "wall"), (1, "grindstone", "floor"),
              (2, "bucket", "wall"), (2, "tool", "wall"), (1, "stones", "floor"), (1, "broom", "wall"), (1, "stool", "any")],
    "craft": [(3, "shelf", "wall"), (2, "bench", "wall"), (2, "wheel", "any"), (1, "chest", "wall"), (1, "dresser", "wall"), (1, "sacks", "wall"), (1, "pegrail", "wall"),
              (1, "table", "floor"), (4, "basket", "wall"), (2, "distaff", "any"), (2, "stool", "any"), (1, "broom", "wall"), (1, "jug", "wall")],
    "dye": [(2, "shelf", "wall"), (2, "casks", "wall"), (2, "sacks", "wall"), (1, "rack", "wall"), (1, "bench", "wall"), (1, "washtub", "floor"), (3, "bucket", "any"),
            (3, "basket", "wall"), (1, "broom", "wall"), (1, "stool", "any"), (1, "pot", "wall"), (1, "bundle", "wall")],
    "brew": [(3, "casks", "wall"), (2, "sacks", "wall"), (1, "crates", "wall"), (1, "shelf", "wall"), (1, "rack", "wall"), (1, "woodpile", "wall"), (3, "bucket", "any"),
             (2, "tool", "wall"), (1, "broom", "wall"), (1, "sack", "any"), (1, "cask", "any"), (1, "straw", "floor")],
    "stable": [(2, "trough", "wall"), (2, "rack", "wall"), (1, "pegrail", "wall"), (1, "sacks", "wall"), (1, "hayrick", "floor"), (4, "straw", "floor"), (2, "dung", "floor"),
               (2, "bucket", "wall"), (2, "tool", "wall"), (1, "rope", "any"), (1, "broom", "wall")],
    "store": [(3, "crates", "wall"), (3, "casks", "wall"), (3, "sacks", "wall"), (1, "shelf", "wall"), (1, "chest", "wall"), (2, "crate", "any"), (2, "cask", "any"),
              (2, "sack", "any"), (1, "rope", "any"), (1, "basket", "wall")],
    "hall": [(2, "bench", "wall"), (3, "table", "floor"), (2, "dresser", "wall"), (1, "casks", "wall"), (2, "shelf", "wall"), (1, "pegrail", "wall"), (3, "stool", "any"),
             (1, "jug", "wall"), (1, "straw", "floor"), (1, "basket", "wall"), (1, "broom", "wall")],
    "market": [(3, "stall", "floor"), (2, "heap", "floor"), (2, "crates", "floor"), (2, "casks", "floor"), (2, "sacks", "floor"), (1, "cart", "floor"),
               (3, "basket", "floor"), (2, "crate", "floor"), (2, "sack", "floor"), (1, "cask", "floor"), (2, "straw", "floor"), (1, "dung", "floor")],
    "street": [(3, "straw", "floor"), (2, "dung", "floor"), (2, "cask", "wall"), (2, "crates", "wall"), (1, "cart", "any"), (1, "sack", "wall"), (1, "butt", "wall"),
               (1, "bucket", "wall"), (2, "stones", "floor"), (1, "basket", "wall"), (1, "bench", "wall")],
    "yard": [(2, "woodpile", "wall"), (1, "sawhorse", "any"), (1, "cart", "any"), (1, "washline", "floor"), (1, "trough", "any"), (2, "bundle", "any"), (2, "bucket", "any"),
             (2, "tool", "any"), (1, "butt", "wall"), (2, "straw", "floor"), (1, "dung", "floor"), (1, "stones", "floor"), (1, "bench", "wall"), (1, "crates", "wall")],
    "wood": [(4, "fern", "floor"), (3, "fernsm", "floor"), (3, "branch", "floor"), (2, "mush", "floor"), (2, "stones", "floor"), (2, "bush", "floor")],
    "camp": [(2, "bucket", "any"), (2, "bundle", "any"), (2, "pot", "any"), (1, "sacks", "any"), (1, "rope", "any"), (2, "branch", "floor"), (1, "tool", "any"),
             (1, "jug", "any"), (1, "woodpile", "any"), (1, "pallet", "any"), (1, "crate", "any")],
    "ruin": [(4, "rubble", "floor"), (2, "fern", "floor"), (2, "branch", "floor"), (2, "stones", "floor"), (2, "bush", "floor"), (1, "mush", "floor")],
}
DENSITY = {"market": .1, "joinery": .6, "smith": .5, "craft": .6, "dye": .55, "brew": .55, "home": .7, "shop": .7, "work": .6, "stable": .5, "store": .8, "hall": .45, "street": .09, "yard": .22, "wood": .1, "camp": .4, "ruin": .14}


def dress(m, rec, rect, kind, n=None):
    """Dress one room, yard or stretch of road (rect in squares) for its kind of place: first its furniture set square
    along the sides (about one big piece to every 2 1/2 squares of wall), then the small things of daily use, about
    DENSITY to the square square. Only bare floor or ground is used. Returns how many pieces were laid."""
    x, y, w, h = rect; menu = MENU[kind]
    big = [e for e in menu if (e[1] in BIG or e[1] in TURN) and e[2] != "floor"]; rest = [e for e in menu if not (e[1] in BIG or e[1] in TURN) or e[2] == "floor"]
    nb = 0 if n is not None else int(2 * (w + h) / 2.5 * BIGFRAC[kind])
    ns = n if n is not None else max(3, int(round(w * h * DENSITY[kind])))
    used = {}
    return _lay(m, rec, rect, big, nb, used=used) + _lay(m, rec, rect, rest if nb else menu, ns, used=used)


BIGFRAC = {"market": 0, "joinery": 1.5, "smith": 1.3, "craft": 1.5, "dye": 1.4, "brew": 1.4, "home": 1.6, "shop": 1.6, "work": 1.5, "stable": 1, "store": 1.6, "hall": 1.3, "street": .25, "yard": .5, "wood": 0, "camp": .3, "ruin": 0}



# ---------- detailed pieces drawn facing south (front toward +y), squares box on a scratch map; turned() sets them ----------
def t_dresser(tm, x, y, w, h):
    """A kitchen dresser against the wall: its plank top, a plate rack at the back with plates stood on edge, jugs and
    bowls along the top, the front edge with two drawer pulls toward the room."""
    d = tm.d; X0, Y0, X1, Y1 = P(x) + 3, P(y) + 3, P(x + w) - 3, P(y + h) - 3; W = R["dwood"]
    tm.shade((X0 + 6, Y0 + 8, X1 + 8, Y1 + 10), f=.55)
    d.rectangle([X0, Y0, X1, Y1], fill=W[2], outline=OUT)
    for yy in range(Y0 + 10, Y1 - 10, 9): d.line([X0 + 2, yy, X1 - 2, yy], fill=W[1])
    d.rectangle([X0, Y0, X1, Y0 + 12], fill=W[1], outline=OUT)                               # the plate rack at the back
    for xx in range(X0 + 8, X1 - 6, 12): d.ellipse([xx - 5, Y0 + 2, xx + 5, Y0 + 11], fill=R["linen"][4] if (xx // 12) % 3 else R["blue"][4], outline=OUT); d.line([xx - 3, Y0 + 6, xx + 3, Y0 + 6], fill=R["blue"][2])
    cx = (X0 + X1) // 2
    pr.jug(tm, X0 + 16, Y0 + 26, 8); pr.bowl(tm, cx - 6, Y0 + 26, 8); pr.jug(tm, X1 - 18, Y0 + 26, 7, col="blue")
    d.rectangle([X0, Y1 - 9, X1, Y1], fill=W[3], outline=OUT)                                 # the front edge and its drawer pulls
    for k in (X0 + (X1 - X0) // 4, X1 - (X1 - X0) // 4): d.rectangle([k - 3, Y1 - 6, k + 3, Y1 - 2], fill=R["iron"][3], outline=OUT)


def t_workbench(tm, x, y, w, h):
    """A joiner's bench: a thick two-plank top with dog holes, a wooden vice at the front left with its screw handle
    out toward the worker, a saw, a plane, a mallet and chisels laid ready, shavings on the floor in front."""
    d = tm.d; X0, Y0, X1, Y1 = P(x) + 3, P(y) + 3, P(x + w) - 3, P(y + h) - 12; Wd = R["wood"]; rng = tm.rng
    for _ in range(18): px_, py_ = rng.uniform(X0, X1), rng.uniform(Y1, Y1 + 12); d.arc([px_ - 4, py_ - 3, px_ + 4, py_ + 3], 0, 250, fill=Wd[4])
    tm.box(X0, Y0, X1, Y1, "wood", 2, sh=8); d.line([X0 + 2, (Y0 + Y1) // 2, X1 - 2, (Y0 + Y1) // 2], fill=Wd[1])
    for xx in range(X0 + 20, X1 - 30, 26): d.rectangle([xx, Y1 - 10, xx + 3, Y1 - 7], fill=OUT)
    vx = X0 + 8; tm.box(vx, Y1 - 4, vx + 26, Y1 + 6, "dwood", 2); d.line([vx + 13, Y1 + 6, vx + 13, Y1 + 18], fill=R["dwood"][3], width=3); d.line([vx + 4, Y1 + 16, vx + 22, Y1 + 16], fill=R["dwood"][3], width=3)
    cx = (X0 + X1) // 2
    d.polygon([(cx - 8, Y0 + 8), (cx + 30, Y0 + 8), (cx + 30, Y0 + 18), (cx - 8, Y0 + 22)], fill=R["iron"][3], outline=OUT); d.rectangle([cx - 20, Y0 + 8, cx - 8, Y0 + 22], fill=Wd[2], outline=OUT)   # saw
    d.rectangle([X1 - 44, Y0 + 9, X1 - 16, Y0 + 19], fill=Wd[3], outline=OUT); d.rectangle([X1 - 34, Y0 + 11, X1 - 28, Y0 + 17], fill=R["iron"][2])   # plane
    d.rectangle([vx + 34, Y0 + 24, vx + 48, Y0 + 34], fill=R["dwood"][2], outline=OUT); d.line([vx + 48, Y0 + 29, vx + 66, Y0 + 29], fill=Wd[3], width=3)   # mallet
    for k in range(3): d.line([cx + 6 + k * 8, Y0 + 26, cx + 6 + k * 8, Y0 + 40], fill=R["iron"][3], width=2); d.rectangle([cx + 5 + k * 8, Y0 + 38, cx + 8 + k * 8, Y0 + 44], fill=Wd[2])


def t_toolrack(tm, x, y, w, h):
    """Tools hung on pegs along a board on the wall, their heads hanging down toward the room: a spade, a rake, a
    pitchfork, a sickle, an axe and a coil of rope."""
    d = tm.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h)
    tm.box(X0 + 2, Y0 + 2, X1 - 2, Y0 + 10, "dwood", 2, sh=3)
    n = max(3, int((X1 - X0) / 24)); kinds = ("spade", "rake", "sickle", "fork", "axe", "rope")
    for k in range(n):
        cx = X0 + 14 + k * (X1 - X0 - 28) // max(1, n - 1); kd = kinds[k % len(kinds)]
        d.ellipse([cx - 2, Y0 + 4, cx + 2, Y0 + 8], fill=R["wood"][4])
        if kd == "rope": [d.ellipse([cx - r, Y0 + 14 - r + 10, cx + r, Y0 + 14 + r + 10], outline=R["straw"][2], width=3) for r in (11, 7)]; continue
        tm.shade((cx + 2, Y0 + 12, cx + 6, Y1), f=.65); d.line([cx, Y0 + 8, cx, Y1 - 14], fill=R["wood"][3], width=4)
        if kd == "spade": d.polygon([(cx - 8, Y1 - 16), (cx + 8, Y1 - 16), (cx + 7, Y1 - 2), (cx - 7, Y1 - 2)], fill=R["iron"][3], outline=OUT)
        elif kd == "rake": d.line([cx - 11, Y1 - 14, cx + 11, Y1 - 14], fill=R["iron"][2], width=3); [d.line([cx + j, Y1 - 14, cx + j, Y1 - 5], fill=R["iron"][3], width=2) for j in (-10, -5, 0, 5, 10)]
        elif kd == "fork": [d.line([cx + j, Y1 - 16, cx + j * 1.4, Y1 - 2], fill=R["iron"][3], width=2) for j in (-5, 0, 5)]
        elif kd == "sickle": d.arc([cx - 14, Y1 - 26, cx + 6, Y1 - 4], 300, 160, fill=R["iron"][4], width=3)
        else: d.polygon([(cx - 2, Y1 - 18), (cx + 12, Y1 - 22), (cx + 12, Y1 - 8), (cx - 2, Y1 - 12)], fill=R["iron"][3], outline=OUT)


def t_pegrail(tm, x, y, w, h):
    """A peg rail on the wall with clothes hung on it: a long wool cloak, a hat, a leather satchel and a belt."""
    d = tm.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); rng = tm.rng
    tm.box(X0 + 2, Y0 + 2, X1 - 2, Y0 + 9, "dwood", 2, sh=3)
    things = ["cloak", "hat", "bag", "cloak", "belt"]; n = max(2, int((X1 - X0) / 30))
    for k in range(n):
        cx = X0 + 16 + k * (X1 - X0 - 32) // max(1, n - 1); t = things[(k + int(rng.integers(0, 5))) % 5]; d.ellipse([cx - 2, Y0 + 3, cx + 2, Y0 + 7], fill=R["wood"][4])
        if t == "cloak":
            c = R[("red", "blue", "green", "dwood")[int(rng.integers(0, 4))]]; tm.shade((cx - 10, Y0 + 12, cx + 18, Y1 + 4), f=.6)
            d.polygon([(cx - 6, Y0 + 7), (cx + 6, Y0 + 7), (cx + 13, Y1 - 2), (cx - 13, Y1 - 2)], fill=c[2], outline=OUT)
            for j in (-6, 0, 6): d.line([cx + j * .4, Y0 + 10, cx + j * 1.6, Y1 - 4], fill=c[1])
            d.line([cx - 5, Y0 + 9, cx + 5, Y0 + 9], fill=c[4])
        elif t == "hat": d.ellipse([cx - 11, Y0 + 8, cx + 11, Y0 + 26], fill=(70, 52, 40), outline=OUT); d.ellipse([cx - 6, Y0 + 12, cx + 6, Y0 + 22], fill=(96, 72, 52))
        elif t == "bag": d.line([cx, Y0 + 6, cx - 6, Y0 + 14], fill=(90, 60, 36), width=2); d.rectangle([cx - 10, Y0 + 14, cx + 10, Y0 + 30], fill=(124, 84, 50), outline=OUT); d.line([cx - 10, Y0 + 20, cx + 10, Y0 + 20], fill=(96, 62, 36))
        else: d.line([cx, Y0 + 7, cx, Y1 - 6], fill=(80, 54, 34), width=4); d.rectangle([cx - 3, Y1 - 10, cx + 3, Y1 - 5], fill=R["iron"][3])


def t_wheel(tm, x, y, w, h):
    """A spinning wheel: the slanted bench on three legs, the great wheel standing up with its spokes (seen a little
    from the side), the flyer and bobbin with yarn on it, the distaff with a puff of wool, the treadle toward the spinner."""
    d = tm.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
    tm.shade((X0 + 10, cy - 2, X1 - 2, cy + 12), f=.6)
    d.polygon([(X0 + 6, cy - 4), (X1 - 6, cy - 8), (X1 - 6, cy + 4), (X0 + 6, cy + 6)], fill=R["dwood"][2], outline=OUT)
    for lx, ly in ((X0 + 8, cy + 6), (X1 - 8, cy + 4), (cx, cy - 8)): d.ellipse([lx - 3, ly - 3, lx + 3, ly + 3], fill=R["dwood"][1])
    wx = cx - 8; d.ellipse([wx - 12, Y0 + 2, wx + 12, Y1 - 10], outline=R["wood"][3], width=3)
    for a in np.linspace(0, math.pi, 7): d.line([wx, cy - 4, wx + math.cos(a) * 10, cy - 4 + math.sin(a) * ((Y1 - Y0 - 12) / 2) * (1 if a < 1.6 else -1)], fill=R["wood"][2])
    d.ellipse([wx - 3, cy - 7, wx + 3, cy - 1], fill=R["dwood"][1])
    d.rectangle([X1 - 22, cy - 12, X1 - 8, cy - 4], fill=R["wood"][3], outline=OUT); d.ellipse([X1 - 19, cy - 13, X1 - 11, cy - 3], fill=R["linen"][3])   # flyer and bobbin
    d.line([X1 - 14, cy - 12, X1 - 4, Y0 + 2], fill=R["wood"][4], width=2); d.ellipse([X1 - 10, Y0 - 2, X1 + 2, Y0 + 10], fill=(214, 206, 188), outline=(150, 144, 130))   # distaff
    d.rectangle([cx - 14, Y1 - 8, cx + 14, Y1 - 2], fill=R["dwood"][3], outline=OUT)      # treadle
    pr.stool(tm, (cx) / T, (Y1 + 16) / T)


def t_bed(tm, x, y, w, h):
    """A bed with its head to the wall (north here) and its foot out into the room."""
    pr.bed(tm, x, y, w, h, head="n", cloth=("red", "blue", "green", "linen")[int(tm.rng.integers(0, 4))])


def t_pallet(tm, x, y, w, h):
    """A straw pallet on the floor, head to the wall: a ticking mattress bulging with straw, a rolled bolster at the
    head, a blanket thrown back."""
    d = tm.d; X0, Y0, X1, Y1 = P(x) + 3, P(y) + 3, P(x + w) - 3, P(y + h) - 3; c = R[("red", "blue", "green", "dwood")[int(tm.rng.integers(0, 4))]]
    tm.shade((X0 + 4, Y0 + 5, X1 + 5, Y1 + 6), f=.65)
    d.rounded_rectangle([X0, Y0, X1, Y1], 8, fill=(196, 184, 150), outline=OUT) if hasattr(d, "rounded_rectangle") else d.rectangle([X0, Y0, X1, Y1], fill=(196, 184, 150), outline=OUT)
    for xx in range(X0 + 5, X1 - 3, 6): d.line([xx, Y0 + 3, xx, Y1 - 3], fill=(176, 162, 128))
    for k in range(8): px_ = tm.rng.uniform(X0 - 2, X1 + 2); d.line([px_, Y1 - 2, px_ + 4, Y1 + 3], fill=R["straw"][3])
    d.ellipse([X0 + 4, Y0 + 4, X1 - 4, Y0 + 18], fill=R["linen"][4], outline=OUT)
    d.polygon([(X0 + 1, Y0 + (Y1 - Y0) * .45), (X1 - 1, Y0 + (Y1 - Y0) * .38), (X1 - 1, Y1 - 1), (X0 + 1, Y1 - 1)], fill=c[2], outline=OUT)
    d.line([X0 + 2, Y0 + (Y1 - Y0) * .45 + 3, X1 - 2, Y0 + (Y1 - Y0) * .38 + 3], fill=c[4])


def t_bench(tm, x, y, w, h): pr.bench(tm, x, y, w, h)


def t_chest(tm, x, y, w, h): pr.chest(tm, x, y, w, h)


def t_shelf(tm, x, y, w, h): pr.shelf(tm, x, y, w, h, shelfgoods(tm.rng.random())[:max(2, int(w * 3))])


def t_churn(tm, x, y, w, h):
    """A butter churn: a tall staved tub with its lid and the dasher handle standing up out of it."""
    cx, cy = P(x + w / 2), P(y + h / 2); tm.disc(cx, cy, 16, "wood", 2, sh=5); d = tm.d
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], outline=R["iron"][1], width=2); d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=R["wood"][3], outline=OUT)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=R["dwood"][2], outline=OUT); d.line([cx, cy, cx + 6, cy - 18], fill=R["wood"][4], width=4)


def t_quern(tm, x, y, w, h):
    """A hand quern: two round millstones, the upper with its feed hole and the upright handle, flour dusted round it."""
    cx, cy = P(x + w / 2), P(y + h / 2); d = tm.d
    for k in range(14): d.point((cx + tm.rng.uniform(-22, 22), cy + tm.rng.uniform(-22, 22)), fill=(236, 230, 214))
    tm.disc(cx, cy, 20, "stone", 2, sh=5); tm.disc(cx, cy, 16, "stone", 3); d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=OUT)
    d.ellipse([cx + 8, cy - 4, cx + 14, cy + 2], fill=R["wood"][3], outline=OUT)


def t_washtub(tm, x, y, w, h):
    """A wash tub of staves with water and a ribbed washboard leant in it, a cake of soap on the rim."""
    cx, cy = P(x + w / 2), P(y + h / 2); d = tm.d; rx, ry = P(w) // 2 - 4, P(h) // 2 - 4
    tm.shade((cx - rx + 4, cy - ry + 6, cx + rx + 6, cy + ry + 8), kind="ellipse", f=.6)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=R["wood"][2], outline=OUT); d.ellipse([cx - rx + 5, cy - ry + 5, cx + rx - 5, cy + ry - 5], fill=R["water"][3])
    d.ellipse([cx - rx + 2, cy - ry + 2, cx + rx - 2, cy + ry - 2], outline=R["iron"][1], width=2)
    d.rectangle([cx - 4, cy - ry + 3, cx + 12, cy + 4], fill=R["wood"][3], outline=OUT); [d.line([cx - 3, k, cx + 11, k], fill=R["wood"][1]) for k in range(cy - ry + 6, cy + 3, 3)]
    d.rectangle([cx - rx + 6, cy - 3, cx - rx + 14, cy + 3], fill=(226, 214, 170), outline=OUT)


def t_loom(tm, x, y, w, h):
    import town as tw
    tw.loom(tm, x, y, w, h, ("blue", "red", "green", "gold")[int(tm.rng.integers(0, 4))])


def t_table(tm, x, y, w, h):
    """A table with things set on it and stools drawn up on the near side and the ends."""
    tm.table(x + .12, y + .1, w - .24, h - .42, things=True)
    pr.stool(tm, x + w / 2, y + h - .14); pr.stool(tm, x + .06, y + h / 2 - .1); pr.stool(tm, x + w - .06, y + h / 2 - .1)


# turned pieces: (along the wall, depth) in squares, and the south-facing drawing
TURN = {"dresser": (1.4, .55, t_dresser), "workbench": (1.8, .82, t_workbench), "rack": (1.4, .5, t_toolrack), "pegrail": (1.2, .45, t_pegrail),
        "wheel": (.95, .9, t_wheel), "bed": (.95, 1.85, t_bed), "pallet": (.85, 1.75, t_pallet), "bench": (1.6, .36, t_bench), "chest": (.95, .6, t_chest),
        "shelf": (1.6, .42, t_shelf), "churn": (.45, .45, t_churn), "quern": (.5, .5, t_quern), "washtub": (.8, .6, t_washtub), "loom": (1.9, 1.3, t_loom),
        "table": (1.5, 1.2, t_table)}


FLAT = {"stall", "washline"}                                                          # always set east-west


MAXPER = {"rug": 1, "wheel": 1, "dresser": 1, "table": 2, "pallet": 2, "bed": 1, "churn": 1, "quern": 1, "washtub": 1, "loom": 1,
          "pegrail": 2, "grindstone": 1, "sawhorse": 2, "cart": 1, "hayrick": 1, "washline": 1, "butt": 1, "stall": 99, "heap": 99}


def _lay(m, rec, rect, menu, n, inset=.28, tries=90, used=None):
    """Lay n pieces for this kind of place in rect (squares), only on bare floor or ground: big pieces (shelves,
    cupboards, benches, chests, crates, casks, workbenches, tool racks, beds) set square along the sides, small
    things (baskets, buckets, pots, brooms, boots, cloaks, rugs, straw) along the sides or out on the floor.
    Returns how many were laid."""
    x, y, w, h = rect; rng = m.rng
    if not menu: return 0
    U = lambda a, b: rng.uniform(a, b) if b > a else (a + b) / 2
    wts = np.array([e[0] for e in menu], float); wts /= wts.sum(); laid = 0; occ = _grid(m, rec)
    used = {} if used is None else used
    for _ in range(n):
        _, piece, where = menu[int(rng.choice(len(menu), p=wts))]
        if used.get(piece, 0) >= MAXPER.get(piece, 99): continue
        if piece in TURN: L, D, fn = TURN[piece]; L, D = L * T, D * T
        elif piece in BIG: L, D, fn = BIG[piece]; L, D = L * T, D * T
        else: hw, hh, sf = SMALL[piece]; L, D, fn = hw * 2, hh * 2, f_small(sf)
        for _ in range(tries):
            wall = where == "wall" or (where == "any" and rng.random() < .5)
            if wall:
                side = int(rng.integers(0, 4)); hz = side < 2; face = "snew"[side]; bw, bh = (L, D) if hz else (D, L); e = 30
                if side == 0: X0, Y0 = U(x * T + e, (x + w) * T - e - bw), y * T + e
                elif side == 1: X0, Y0 = U(x * T + e, (x + w) * T - e - bw), (y + h) * T - e - bh
                elif side == 2: X0, Y0 = x * T + e, U(y * T + e, (y + h) * T - e - bh)
                else: X0, Y0 = (x + w) * T - e - bw, U(y * T + e, (y + h) * T - e - bh)
            else:
                hz = rng.random() < .5 or piece in FLAT; bw, bh = (L, D) if hz else (D, L); face = ("s" if rng.random() < .5 else "n") if hz else ("e" if rng.random() < .5 else "w")
                X0, Y0 = U((x + inset) * T, (x + w - inset) * T - bw), U((y + inset) * T, (y + h - inset) * T - bh)
            if X0 < x * T or Y0 < y * T or X0 + bw > (x + w) * T or Y0 + bh > (y + h) * T: continue
            if _freebox(occ, X0, Y0, X0 + bw, Y0 + bh):
                a = float(rng.uniform(0, math.pi * 2))
                if piece in TURN: turned(m, X0 / T, Y0 / T, bw / T, bh / T, face, fn)
                else: fn(m, int(X0), int(Y0), int(X0 + bw), int(Y0 + bh), a, hz)
                occ[max(0, int(Y0) // C):int(Y0 + bh) // C + 1, max(0, int(X0) // C):int(X0 + bw) // C + 1] = True; laid += 1; used[piece] = used.get(piece, 0) + 1; break
    return laid


def _freebox(occ, X0, Y0, X1, Y1):
    y0, y1, x0, x1 = int(Y0) // C, int(Y1) // C, int(X0) // C, int(X1) // C
    if y0 < 0 or x0 < 0 or y1 >= occ.shape[0] or x1 >= occ.shape[1]: return False
    return not occ[y0:y1 + 1, x0:x1 + 1].any()


def rooms(m, rec, rect, lines, kind="home", at=()):
    """Dress each room of a building. rect (x, y, w, h) in squares; lines: the map's wall, door and window lines
    (x0, y0, x1, y1); the rooms are found by flooding between them. at: [(x, y, kind)] gives the room holding that
    point its own kind; every other room is dressed as kind. Rooms under 4 square squares get two things."""
    from collections import deque
    x, y, w, h = rect; res = .1; nx, ny = int(round(w / res)), int(round(h / res)); g = np.zeros((ny + 1, nx + 1), np.int32)
    for c in lines:
        x0, y0, x1, y1 = c
        if max(x0, x1) < x - .05 or min(x0, x1) > x + w + .05 or max(y0, y1) < y - .05 or min(y0, y1) > y + h + .05: continue
        L = max(abs(x1 - x0), abs(y1 - y0)); k = max(1, int(L / res * 2))
        for t in np.linspace(0, 1, k + 1):
            i_, j_ = int(round((y0 + (y1 - y0) * t - y) / res)), int(round((x0 + (x1 - x0) * t - x) / res))
            if 0 <= i_ <= ny and 0 <= j_ <= nx: g[i_, j_] = -1
    g[0, :] = g[-1, :] = -1; g[:, 0] = g[:, -1] = -1; lab = 0
    for i0 in range(ny + 1):
        for j0 in range(nx + 1):
            if g[i0, j0]: continue
            lab += 1; q_ = deque([(i0, j0)]); g[i0, j0] = lab; cells = []
            while q_:
                i_, j_ = q_.popleft(); cells.append((i_, j_))
                for a, b in ((i_ + 1, j_), (i_ - 1, j_), (i_, j_ + 1), (i_, j_ - 1)):
                    if 0 <= a <= ny and 0 <= b <= nx and g[a, b] == 0: g[a, b] = lab; q_.append((a, b))
            if len(cells) * res * res < 1.0: continue
            ii = [c[0] for c in cells]; jj = [c[1] for c in cells]
            r = (x + (min(jj) - .5) * res, y + (min(ii) - .5) * res, (max(jj) - min(jj) + 1) * res, (max(ii) - min(ii) + 1) * res)
            kd = kind
            for px_, py_, k_ in at:
                a, b = int(round((py_ - y) / res)), int(round((px_ - x) / res))
                if 0 <= a <= ny and 0 <= b <= nx and g[a, b] == lab: kd = k_
            got = dress(m, rec, r, kd, n=2 if r[2] * r[3] < 4 else None)
            if DEBUG: print("room", [round(v, 1) for v in r], kd, got)
