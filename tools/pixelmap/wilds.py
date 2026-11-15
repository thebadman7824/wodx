"""WoDX pixel map drawer (B5739): things of the woods and the wild, drawn for a player to name at a glance. Every
size is true to the 5 ft square (RULES.md, True sizes). Positions are in squares unless a name says pixels."""
import math
import numpy as np
from px import R, T, OUT

P = lambda v: int(round(v * T))


def stump(m, x, y, r=20):
    """A sawn tree stump, as used for a seat: bark ring, pale cut face with growth rings and a saw line."""
    d = m.d; cx, cy = P(x), P(y)
    m.shade((cx - r + 3, cy - r + 5, cx + r + 5, cy + r + 7), kind="ellipse", f=.6)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=R["dwood"][1], outline=OUT)           # the bark
    for a in np.linspace(0, 2 * math.pi, 14, endpoint=False):                                # its ridges
        d.line([cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4), cx + math.cos(a) * r, cy + math.sin(a) * r], fill=R["dwood"][0])
    q = r - 5; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=R["wood"][3])
    for k in range(1, 4): qq = q * k / 4; d.ellipse([cx - qq, cy - qq, cx + qq, cy + qq], outline=R["wood"][2])
    d.arc([cx - q + 2, cy - q + 2, cx + q - 2, cy + q - 2], 190, 260, fill=R["wood"][4]); d.point((cx, cy), fill=R["wood"][1])
    d.line([cx - q + 3, cy + 2, cx + q - 3, cy - 1], fill=R["wood"][1])                     # where the saw stopped


def campfire(m, x, y, rec=None, label="Campfire", seats=0):
    """An open fire in a ring of stones, the ground scorched round it, and stumps set round as seats. Lit: flames,
    embers and warm light on what is near. Records a light when a recorder is given."""
    d = m.d; cx, cy = P(x), P(y); rng = m.rng
    m.shade((cx - 46, cy - 46, cx + 46, cy + 46), kind="ellipse", f=.62)                    # scorched earth
    for a in np.linspace(0, 2 * math.pi, 11, endpoint=False):                                # the ring of stones
        sx, sy = cx + math.cos(a) * 30, cy + math.sin(a) * 30
        m.rock(sx, sy, rng.integers(8, 11), rng.integers(7, 9))
    d.ellipse([cx - 21, cy - 21, cx + 21, cy + 21], fill=(34, 26, 24))                       # ash and char inside
    m.fire(cx, cy, 30, 28, seed=int(rng.integers(0, 99)))
    m.hearths = getattr(m, "hearths", []) + [(cx, cy, 230, None)]
    for k in range(seats):
        a = k * 2 * math.pi / seats + .4; stump(m, x + math.cos(a) * 1.15, y + math.sin(a) * 1.15, 17)
    if rec: rec.light(label, label, (x - .5, y - .5, 1, 1), dim=6, bright=2); rec.note(label.lower(), x, y)


def tent(m, x, y, w=1.4, L=2.2, along="x", cloth="linen"):
    """A ridge tent of oiled canvas from above: two sloping sheets meeting at a dark ridge pole, the sunny (north or
    west) slope pale and the far one in shade, the eaves sagging between the guy ropes, each rope fanned out to its
    own peg, the door flaps tied back at the east end showing the dark inside and a bedroll."""
    d = m.d; C = R[cloth]
    if along != "x": raise ValueError("tent: only east-west tents so far (along='x')")
    X0, Y0, X1, Y1 = P(x), P(y), P(x + L), P(y + w); mid = (Y0 + Y1) // 2
    m.shade((X0 + 6, Y0 + 10, X1 + 10, Y1 + 12), f=.6)
    xs = np.linspace(X0, X1, 4)
    for side, ye, yp in ((-1, Y0, Y0 - 34), (1, Y1, Y1 + 34)):                           # guy ropes fanned to pegs
        for k, xx in enumerate(xs):
            px_ = xx + (-18 if k == 0 else 18 if k == 3 else 0)
            d.line([xx, ye, px_, yp], fill=R["straw"][3], width=2); m.box(px_ - 3, yp - 3, px_ + 3, yp + 3, "dwood", 2, bevel=False)
    def eave(yv, sag):                                                                   # an edge sagging between the ropes
        pts = []
        for k in range(3):
            for t in np.linspace(0, 1, 8):
                xx = xs[k] + (xs[k + 1] - xs[k]) * t; pts.append((xx, yv + sag * math.sin(math.pi * t)))
        return pts
    top, bot = eave(Y0, 6), eave(Y1, -6)
    d.polygon(top + [(X1, mid), (X0, mid)], fill=C[4], outline=OUT)
    d.polygon([(X0, mid), (X1, mid)] + bot[::-1], fill=C[1], outline=OUT)
    for xx in xs[1:-1]:                                                                  # creases where the ropes pull
        d.line([xx, Y0 + 2, xx, mid - 2], fill=C[3]); d.line([xx, mid + 2, xx, Y1 - 2], fill=C[0])
    for t in np.linspace(.08, .92, 9):                                                   # light along the sunny slope
        xx = X0 + (X1 - X0) * t; d.line([xx, Y0 + 10, xx + 8, Y0 + 10], fill=C[3])
    d.line([X0 - 6, mid, X1 + 6, mid], fill=OUT, width=6); d.line([X0 - 6, mid, X1 + 6, mid], fill=R["dwood"][2], width=3)   # ridge pole
    for xx_ in (X0 - 6, X1 + 6): m.disc(xx_, mid, 5, "dwood", 2)
    d.polygon([(X1, Y0 + 6), (X1 + 22, mid - 3), (X1 + 22, mid + 3), (X1, Y1 - 6)], fill=(28, 24, 24), outline=OUT)   # open door, dark inside
    d.polygon([(X1, Y0 + 6), (X1 + 14, Y0 - 4), (X1 + 8, mid - 6)], fill=C[3], outline=OUT)    # the flaps tied back
    d.polygon([(X1, Y1 - 6), (X1 + 14, Y1 + 4), (X1 + 8, mid + 6)], fill=C[1], outline=OUT)
    m.box(X1 - 30, mid - 7, X1 + 10, mid + 7, "red", 2)                                    # a bedroll showing in the door


def _smoke(m, cx, cy, n=6, drift=(26, -12), r0=12, a0=.55):
    """Grey smoke puffs laid over the map with transparency, drifting with the wind."""
    from PIL import Image, ImageDraw
    W, H = m.img.size; lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    for k in range(n):
        sx, sy, sr = cx + drift[0] * k, cy + drift[1] * k, r0 + k * 5
        a = int(255 * a0 * (1 - k / (n + 1)))
        ld.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(196, 196, 204, a))
        ld.ellipse([sx - sr * .6 - 3, sy - sr * .6 - 3, sx + sr * .3, sy + sr * .3], fill=(226, 226, 232, a // 2))
    m.img.paste(Image.alpha_composite(m.img.convert("RGBA"), lay).convert("RGB"), (0, 0))


def kiln(m, x, y, r=110, lit=True, rec=None, label="Charcoal kiln"):
    """A charcoal burner's clamp: a low dome of stacked billets sealed under turf and black earth, about 11 ft
    across, the cut ends of the wood showing in a ring at its foot, vent holes round its flank. Lit, the vents glow
    and smoke streams off the top; cold, the mound is grey and nothing smokes."""
    d = m.d; cx, cy = P(x), P(y); rng = m.rng
    m.shade((cx - r + r * .25, cy - r + r * .3, cx + r + r * .25, cy + r + r * .3), kind="ellipse", f=.6)
    for a in np.linspace(0, 2 * math.pi, 34, endpoint=False):                              # billet ends at the foot
        bx, by = cx + math.cos(a) * (r + 4), cy + math.sin(a) * (r + 4)
        d.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=R["wood"][3], outline=OUT); d.point((bx, by), fill=R["wood"][1])
    m.dome(cx, cy, r, "stone" if not lit else "dirt")
    a_ = np.array(m.img.crop((cx - r, cy - r, cx + r + 1, cy + r + 1)), np.float32)       # sooty black earth
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]; ins = np.hypot(xx, yy) <= r
    a_[ins] *= (.55 if lit else .8); m.img.paste(__import__("PIL.Image", fromlist=["Image"]).fromarray(a_.astype(np.uint8)), (cx - r, cy - r))
    for _ in range(int(r * 1.6)):                                                            # turf sods laid over it
        a = rng.uniform(0, 6.28); t = rng.uniform(.1, .95) * r; x_, y_ = cx + math.cos(a) * t, cy + math.sin(a) * t
        lit_side = (x_ - cx) + (y_ - cy) < 0
        d.rectangle([x_, y_, x_ + rng.integers(3, 7), y_ + rng.integers(2, 4)], fill=R["green"][2 if lit_side else 1])
    for a in np.linspace(0, 2 * math.pi, 9, endpoint=False):                                 # vent holes
        vx, vy = cx + math.cos(a) * r * .66, cy + math.sin(a) * r * .66
        d.ellipse([vx - 6, vy - 5, vx + 6, vy + 5], fill=(24, 18, 16), outline=OUT)
        if lit: d.ellipse([vx - 3, vy - 2, vx + 3, vy + 2], fill=(236, 120, 40)); d.point((vx, vy), fill=(255, 220, 120))
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=(30, 24, 22), outline=OUT)          # the chimney hole at the top
    if lit:
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(214, 96, 34))
        _smoke(m, cx + 8, cy - 6)
        for a in np.linspace(0, 2 * math.pi, 9, endpoint=False):                             # thin smoke from the vents
            _smoke(m, cx + math.cos(a) * r * .66 + 4, cy + math.sin(a) * r * .66 - 4, n=2, r0=5, a0=.35)
        m.hearths = getattr(m, "hearths", []) + [(cx, cy, 180, None)]
        if rec: rec.light(label, label, (x - .5, y - .5, 1, 1), dim=3, bright=.5)
    if rec: rec.note(label.lower() + (", burning" if lit else ", cold"), x, y)


def boulder(m, x, y, w=1.0, h=.8, name="stone", moss=True):
    """A big boulder, sizes in squares: a lit top, facets, a shaded south-east side and moss on its north face."""
    cx, cy = P(x), P(y); W_, H_ = P(w) / 2, P(h) / 2
    m.rock(cx, cy, W_, H_, name)
    if moss:
        rng = m.rng
        for _ in range(int(W_ * .8)):
            a = rng.uniform(math.pi * 1.1, math.pi * 1.9); t = rng.uniform(.55, .9)
            px_, py_ = cx + math.cos(a) * W_ * t, cy + math.sin(a) * H_ * t
            m.d.rectangle([px_, py_, px_ + 2, py_ + 1], fill=R["green"][2 if rng.random() < .6 else 3])


def outcrop(m, pts, width=.9, name="stone", face="e"):
    """A rock scarp: a band of grey rock along the line, its top edge (the high ground) lit, the face falling away
    toward the low side in darker ledges with cracks down it, a shadow at its foot and scree fallen off it.
    face: the side the drop faces (e or w)."""
    rng = m.rng; d = m.d; C = R[name]; sg = 1 if face == "e" else -1; Wd = P(width)
    line = []
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        n = max(2, int(math.hypot(bx - ax, by - ay) * 4))
        line += [(P(ax + (bx - ax) * t), P(ay + (by - ay) * t)) for t in np.linspace(0, 1, n, endpoint=False)]
    line.append((P(pts[-1][0]), P(pts[-1][1])))
    wob = [rng.uniform(-.22, .22) * Wd for _ in line]
    off = lambda f: [(x + sg * (f * Wd + wob[i] * (1 if f > .3 else .3)), y) for i, (x, y) in enumerate(line)]
    m.shade((0, 0, m.W, m.H), f=.55, kind="poly", pts=off(.45) + off(1.15)[::-1])           # the shadow at the foot
    bands = ((-.5, 4), (-.3, 3), (-.05, 2), (.2, 1), (.38, 0))                               # lit lip down to the dark foot
    for k, (f0, lv) in enumerate(bands):
        f1 = bands[k + 1][0] if k + 1 < len(bands) else .55
        poly = off(f0) + off(f1)[::-1]; d.polygon(poly, fill=C[lv])
    for i in range(0, len(line) - 3, 2):                                                 # broken blocks of rock across the face
        j = i + int(rng.integers(2, 4)); f0, f1 = rng.uniform(-.5, -.2), rng.uniform(.05, .45)
        a0, a1, b0, b1 = off(f0)[i], off(f0)[j], off(f1)[j], off(f1)[i]
        lv = int(rng.choice([2, 3, 3, 4])) if f1 < .25 else int(rng.choice([1, 2]))
        d.polygon([a0, a1, b0, b1], fill=C[lv], outline=C[max(0, lv - 2)])
        d.line([a0, a1], fill=C[min(4, lv + 1)], width=2)                                    # each block's lit top edge
    d.line(off(-.5), fill=OUT, width=3); d.line(off(.55), fill=OUT, width=3)
    for i in range(0, len(line), 3):                                                     # cracks down the face, ledges across
        x, y = line[i]; d.line([x + sg * (-.05 * Wd), y, x + sg * .5 * Wd, y + rng.uniform(-8, 8)], fill=C[0], width=2)
        if rng.random() < .5: d.line([x - sg * .45 * Wd, y + 4, x - sg * .2 * Wd, y + 6], fill=C[3])
    for i in range(0, len(line), 2):                                                     # moss and grass on the top
        x, y = line[i]
        if rng.random() < .6: d.rectangle([x - sg * .42 * Wd, y, x - sg * .42 * Wd + 3, y + 2], fill=R["green"][2])
    for _ in range(len(line) // 2):                                                      # scree at the foot
        x, y = line[rng.integers(0, len(line))]; r_ = rng.uniform(5, 13)
        m.rock(x + sg * (.62 * Wd + rng.uniform(0, .35) * Wd), y + rng.uniform(-10, 10), r_, r_ * .75, name)


def trunk(m, x0, y0, x1, y1, r=22):
    """A felled tree: bark-dark trunk with a pale sawn end, branch stubs, lying where it was dropped."""
    d = m.d; X0, Y0, X1, Y1 = x0 * T, y0 * T, x1 * T, y1 * T; ang = math.atan2(Y1 - Y0, X1 - X0); nx, ny = -math.sin(ang), math.cos(ang)
    sh = [(X0 + nx * r + 8, Y0 + ny * r + 12), (X1 + nx * r * .6 + 8, Y1 + ny * r * .6 + 12), (X1 - nx * r * .6 + 8, Y1 - ny * r * .6 + 12), (X0 - nx * r + 8, Y0 - ny * r + 12)]
    m.shade((0, 0, m.W, m.H), f=.6, kind="poly", pts=sh)
    for k, (c, rr) in enumerate(((OUT, r), (R["dwood"][1], r - 2), (R["dwood"][2], r - 6), (R["dwood"][3], r - 12))):
        off = -k * 1.2
        pts = [(X0 + nx * (rr + off), Y0 + ny * (rr + off)), (X1 + nx * rr * .6, Y1 + ny * rr * .6), (X1 - nx * rr * .6, Y1 - ny * rr * .6), (X0 - nx * rr, Y0 - ny * rr)]
        d.polygon(pts, fill=c)
    rng = m.rng
    for t in np.linspace(.15, .9, 9):                                                # bark furrows along the trunk
        px_, py_ = X0 + (X1 - X0) * t, Y0 + (Y1 - Y0) * t; o = rng.uniform(-.5, .5) * r
        d.line([px_ + nx * o, py_ + ny * o, px_ + nx * o + math.cos(ang) * 18, py_ + ny * o + math.sin(ang) * 18], fill=R["dwood"][0])
    for t, s in ((.45, 1), (.7, -1)):                                               # lopped branch stubs
        px_, py_ = X0 + (X1 - X0) * t, Y0 + (Y1 - Y0) * t
        m.disc(px_ + nx * r * s * .9, py_ + ny * r * s * .9, 7, "wood", 3)
    d.ellipse([X0 - r, Y0 - r, X0 + r, Y0 + r], fill=R["wood"][3], outline=OUT)     # the sawn end, with rings
    for rr in (r - 6, r - 12): d.ellipse([X0 - rr, Y0 - rr, X0 + rr, Y0 + rr], outline=R["wood"][2])
    d.point((X0, Y0), fill=R["wood"][1])


def ladder(m, x0, y0, x1, y1, w=26):                                        # about 16 in between the rails
    """A wooden ladder lying or leant, ends in squares: two rails and rungs a foot apart."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1); ang = math.atan2(Y1 - Y0, X1 - X0); nx, ny = -math.sin(ang) * w / 2, math.cos(ang) * w / 2
    L = math.hypot(X1 - X0, Y1 - Y0)
    m.shade((0, 0, m.W, m.H), f=.65, kind="poly", pts=[(X0 + nx + 5, Y0 + ny + 7), (X1 + nx + 5, Y1 + ny + 7), (X1 - nx + 5, Y1 - ny + 7), (X0 - nx + 5, Y0 - ny + 7)])
    for t in np.arange(10, L - 6, 19):
        px_, py_ = X0 + (X1 - X0) * t / L, Y0 + (Y1 - Y0) * t / L
        d.line([px_ + nx, py_ + ny, px_ - nx, py_ - ny], fill=R["wood"][2], width=3)
    for s in (1, -1):
        d.line([X0 + nx * s, Y0 + ny * s, X1 + nx * s, Y1 + ny * s], fill=OUT, width=5); d.line([X0 + nx * s, Y0 + ny * s, X1 + nx * s, Y1 + ny * s], fill=R["wood"][3], width=3)


def leanto(m, x, y, w, h, low="s"):
    """A lean-to shelter roofed with split boards, open on its low side, seen from above: boards running down the
    slope, lighter at the high edge, the ridge pole on its posts, its shadow thrown south-east."""
    X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h)
    m.shade((X0 + 12, Y0 + 16, X1 + 14, Y1 + 18), f=.55)
    vert = low in "ns"
    pl = m.planks(Y1 - Y0, X1 - X0, "dwood", bh=16) if not vert else np.transpose(m.planks(X1 - X0, Y1 - Y0, "dwood", bh=16), (1, 0, 2))
    a = pl.astype(np.float32); n = (Y1 - Y0) if vert else (X1 - X0)
    ramp = np.linspace(1.15, .8, n) if low in "se" else np.linspace(.8, 1.15, n)
    a *= ramp[:, None, None] if vert else ramp[None, :, None]
    m.put(a.clip(0, 255).astype(np.uint8), X0, Y0); m.d.rectangle([X0, Y0, X1, Y1], outline=OUT)
    hi = {"s": (X0, Y0 + 2, X1, Y0 + 2), "n": (X0, Y1 - 2, X1, Y1 - 2), "e": (X0 + 2, Y0, X0 + 2, Y1), "w": (X1 - 2, Y0, X1 - 2, Y1)}[low]
    m.d.line(hi, fill=R["dwood"][0], width=4)
    if low == "s":                                                                       # posts at the open side, a bedroll half out
        for xx in (X0 + 4, X1 - 4): m.disc(xx, Y1, 7, "dwood", 2)
        m.box(X0 + 30, Y1 - 12, X0 + 52, Y1 + 30, "red", 2); m.box(X0 + 62, Y1 - 12, X0 + 84, Y1 + 26, "blue", 2)


# ---- High Woods pieces (B5740) ----
def hearth(m, x, y, rec=None, label="Hearth", r=.55, lit=True):
    """An open hearth on a hut's floor: a square of flat stones, a ring of kerb stones, ash, and a fire when lit."""
    d = m.d; cx, cy = P(x), P(y); R_ = P(r); rng = m.rng
    m.box(cx - R_, cy - R_, cx + R_, cy + R_, "stone", 2)
    for k in range(int(R_ * 2 / 16)):                                                    # the slab joints
        d.line([cx - R_ + 3, cy - R_ + 16 * k, cx + R_ - 3, cy - R_ + 16 * k], fill=R["stone"][1])
    for a in np.linspace(0, 2 * math.pi, 10, endpoint=False):
        m.rock(cx + math.cos(a) * R_ * .62, cy + math.sin(a) * R_ * .62, int(rng.integers(7, 10)), int(rng.integers(6, 8)))
    d.ellipse([cx - R_ * .45, cy - R_ * .45, cx + R_ * .45, cy + R_ * .45], fill=(40, 32, 30))
    if lit:
        m.fire(cx, cy, int(R_ * .5), int(R_ * .46), seed=int(rng.integers(0, 99)))
        m.hearths = getattr(m, "hearths", []) + [(cx, cy, 200, None)]
    if rec:
        rec.light(label, label, (x - .5, y - .5, 1, 1), dim=5, bright=1, color="#ff9a40", kind="fire", on=lit); rec.note(label.lower(), x, y)


def bones(m, x, y, n=6, spread=.5, skull=True):
    """Gnawed bones scattered on the ground: long bones with knobbed ends, a few ribs, and a small skull."""
    d = m.d; rng = m.rng; B = [(150, 140, 120), (196, 188, 166), (228, 222, 204)]
    for _ in range(n):
        bx, by = P(x + rng.uniform(-spread, spread)), P(y + rng.uniform(-spread, spread)); a = rng.uniform(0, math.pi); L = rng.uniform(10, 20)
        ex, ey = bx + math.cos(a) * L, by + math.sin(a) * L
        d.line([bx + 2, by + 3, ex + 2, ey + 3], fill=(30, 26, 26), width=3)
        d.line([bx, by, ex, ey], fill=B[1], width=3); d.line([bx, by - 1, ex, ey - 1], fill=B[2])
        for px_, py_ in ((bx, by), (ex, ey)): d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=B[2], outline=B[0])
    if skull:
        sx, sy = P(x), P(y)
        d.ellipse([sx - 8, sy - 7, sx + 8, sy + 9], fill=B[2], outline=OUT)
        d.rectangle([sx - 4, sy + 6, sx + 4, sy + 14], fill=B[1], outline=OUT)                 # the snout
        for ex_ in (-4, 3): d.rectangle([ex_ + sx, sy, ex_ + sx + 2, sy + 2], fill=(30, 24, 24))


def rope(m, x0, y0, x1, y1, bell=None):
    """A thin rope stretched low across a path between two trunks, tied off at each end; with bell=(x, y), it runs
    on to a cow-bell hung there."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1)
    d.line([X0 + 3, Y0 + 5, X1 + 3, Y1 + 5], fill=(26, 22, 22), width=2)                 # its thin shadow
    d.line([X0, Y0, X1, Y1], fill=R["straw"][3], width=2)
    for px_, py_ in ((X0, Y0), (X1, Y1)): d.ellipse([px_ - 5, py_ - 5, px_ + 5, py_ + 5], fill=R["straw"][2], outline=OUT)   # the knots
    if bell:
        bx, by = P(bell[0]), P(bell[1]); d.line([X1, Y1, bx, by], fill=R["straw"][3], width=2)
        d.ellipse([bx - 8, by - 8, bx + 8, by + 8], fill=R["gold"][2], outline=OUT); d.ellipse([bx - 4, by - 4, bx + 2, by + 2], fill=R["gold"][4])
        d.point((bx + 1, by + 1), fill=(30, 24, 24))


def pit_trap(m, x, y, w=1.2, h=1.2):
    """A pit under a lattice of sticks and leaves. Drawn to be hard but not impossible to see: the leaves lie a shade
    too even and too fresh, and sticks show at the edges where the ground's own litter does not quite meet."""
    d = m.d; rng = m.rng; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h)
    for _ in range(int((X1 - X0) * (Y1 - Y0) / 50)):                                       # an even layer of fresh leaves
        lx, ly = rng.uniform(X0, X1), rng.uniform(Y0, Y1)
        d.rectangle([lx, ly, lx + 2, ly + 1], fill=R["straw"][2] if rng.random() < .5 else R["red"][2])
    for k in range(5):                                                                     # stick ends at the rim
        t = (k + .5) / 5
        d.line([X0 + (X1 - X0) * t, Y0 - 5, X0 + (X1 - X0) * t + 3, Y0 + 4], fill=R["dwood"][2], width=2)
        d.line([X0 - 5, Y0 + (Y1 - Y0) * t, X0 + 4, Y0 + (Y1 - Y0) * t + 2], fill=R["dwood"][2], width=2)
    d.line([X1 - 4, Y1 - 2, X1 + 4, Y1 + 1], fill=(28, 22, 22), width=2)                   # a dark crack where it sags


def thicket(m, x0, y0, x1, y1, keep=(), n=90):
    """A blackthorn thicket: low dark scrub packed tight, white with blossom in spring, blue-black sloes in autumn
    (both shown a little), and thorny stems between the clumps; keep: (x, y, rx, ry) left open."""
    rng = m.rng; got = []
    for _ in range(n * 3):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        if any(((x - a) / c) ** 2 + ((y - b) / e) ** 2 < 1 for a, b, c, e in keep): continue
        if any(math.hypot(x - a, y - b) < .4 for a, b in got): continue
        got.append((x, y))
        if len(got) >= n: break
    for x, y in sorted(got, key=lambda p: p[1]):
        m.bush(P(x), P(y), int(rng.uniform(.45, .62) * T), (46, 52, 92) if rng.random() < .6 else (232, 230, 220))
        for _ in range(2):
            a = rng.uniform(0, 2 * math.pi); L = rng.uniform(16, 30)
            m.d.line([P(x), P(y), P(x) + math.cos(a) * L, P(y) + math.sin(a) * L], fill=(46, 32, 38), width=2)


def wallow(m, x, y, rx=1.3, ry=.9):
    """A boar's wallow: a hollow of churned brown mud, puddles of muddy water standing in it, the rim trampled bare and
    printed with cloven tracks."""
    d = m.d; rng = m.rng; cx, cy = P(x), P(y); RX, RY = P(rx), P(ry)
    blobs = [(cx + rng.uniform(-.5, .5) * RX, cy + rng.uniform(-.4, .4) * RY, rng.uniform(.45, .7)) for _ in range(6)]
    for bx, by, q in blobs: d.ellipse([bx - RX * q - 16, by - RY * q - 14, bx + RX * q + 16, by + RY * q + 14], fill=R["dirt"][1])
    for bx, by, q in blobs: d.ellipse([bx - RX * q, by - RY * q, bx + RX * q, by + RY * q], fill=(70, 50, 36))
    for bx, by, q in blobs: d.ellipse([bx - RX * q * .7, by - RY * q * .7, bx + RX * q * .5, by + RY * q * .5], fill=(56, 40, 30))
    for k in range(3):                                                                     # muddy puddles
        bx, by, q = blobs[k]; pw, ph = RX * q * .35, RY * q * .3
        d.ellipse([bx - pw, by - ph, bx + pw, by + ph], fill=(72, 70, 56)); d.line([bx - pw * .5, by - ph * .3, bx, by - ph * .3], fill=(120, 120, 100))
    for _ in range(int(RX / 2)):                                                           # cloven tracks in the mud and round the rim
        a = rng.uniform(0, 2 * math.pi); t = rng.uniform(.3, 1.1); tx, ty = cx + math.cos(a) * RX * t, cy + math.sin(a) * RY * t
        for sgn in (-2, 2): d.ellipse([tx + sgn - 1, ty - 3, tx + sgn + 1, ty + 3], fill=(34, 24, 20))


def den(m, x, y, rx=2.6, ry=2.4, mouth=(-.6, -.2)):
    """A wolf den under a pile of great boulders: a ring of rocks heaped round, a black hole going down under them,
    earth scraped out bare in front, and bones."""
    rng = m.rng; d = m.d
    for a in np.linspace(0, 2 * math.pi, 12, endpoint=False):
        if math.cos(a - math.atan2(mouth[1], mouth[0])) > .82: continue                     # the gap at the mouth
        s = rng.uniform(1.6, 2.4); boulder(m, x + math.cos(a) * rx * rng.uniform(.85, 1), y + math.sin(a) * ry * rng.uniform(.85, 1), s, s * .8)
    for k in range(3):                                                                    # rocks heaped over the hole, behind its mouth
        s = rng.uniform(1.5, 2.0); boulder(m, x - mouth[0] * rx * .25 + (k - 1) * .9, y - mouth[1] * ry * .25 + rng.uniform(-.3, .3), s, s * .8)
    mx, my = P(x + mouth[0] * rx * .4), P(y + mouth[1] * ry * .4)
    d.ellipse([mx - 70, my - 54, mx + 70, my + 54], fill=R["dirt"][2])                      # scraped earth
    for k, (c, sc) in enumerate(((OUT, 1), ((28, 22, 24), .82), ((14, 10, 12), .6))):         # the hole, deepening
        d.ellipse([mx - 52 * sc, my - 40 * sc, mx + 52 * sc, my + 40 * sc], fill=c)
    for _ in range(14):                                                                    # claw scrapes
        sx, sy = mx + rng.uniform(-50, 50), my + rng.uniform(20, 50); d.line([sx, sy, sx + 4, sy + 10], fill=R["dirt"][0])


def pelt(m, x, y, w=.9, h=1.2, fur="brown", head="n"):
    """An animal's skin laid flat, seen from above: the body's outline with four leg flaps and a neck, fur
    speckled light and dark, the edge a shade darker. fur: brown (deer, boar), grey (wolf) or red (fox)."""
    d = m.d; rng = m.rng; F = {"brown": [(86, 58, 38), (120, 84, 54), (150, 108, 70), (176, 132, 88)],
                               "grey": [(74, 72, 72), (110, 106, 102), (140, 136, 128), (170, 166, 156)],
                               "red": [(110, 50, 26), (150, 74, 36), (184, 100, 50), (210, 140, 80)]}[fur]
    cx, cy = P(x + w / 2), P(y + h / 2); hw, hh = P(w) / 2, P(h) / 2; sg = -1 if head == "n" else 1
    pts = [(cx - hw * .2, cy + sg * hh), (cx + hw * .2, cy + sg * hh),                     # neck
           (cx + hw * .45, cy + sg * hh * .6), (cx + hw, cy + sg * hh * .75), (cx + hw * .7, cy + sg * hh * .3),   # foreleg flap
           (cx + hw * .6, cy - sg * hh * .35), (cx + hw * .95, cy - sg * hh * .85), (cx + hw * .4, cy - sg * hh * .7),   # hind leg flap
           (cx, cy - sg * hh * .95),                                                       # tail end
           (cx - hw * .4, cy - sg * hh * .7), (cx - hw * .95, cy - sg * hh * .85), (cx - hw * .6, cy - sg * hh * .35),
           (cx - hw * .7, cy + sg * hh * .3), (cx - hw, cy + sg * hh * .75), (cx - hw * .45, cy + sg * hh * .6)]
    m.shade((0, 0, m.W, m.H), f=.7, kind="poly", pts=[(px_ + 3, py_ + 4) for px_, py_ in pts])
    d.polygon(pts, fill=F[1], outline=OUT)
    inner = [(cx + (px_ - cx) * .7, cy + (py_ - cy) * .7) for px_, py_ in pts]; d.polygon(inner, fill=F[2])
    d.line([cx, cy - hh * .8, cx, cy + hh * .8], fill=F[0], width=3)                       # the dark stripe down the back
    for _ in range(int(hw * hh / 6)):
        px_, py_ = cx + rng.uniform(-hw * .6, hw * .6), cy + rng.uniform(-hh * .7, hh * .7)
        d.point((px_, py_), fill=F[3] if rng.random() < .5 else F[0])


def hide_rack(m, x, y, L=2.4, hides=3, fur="brown"):
    """A drying rack: two forked posts and a pole across (east-west), skins hung over it to dry, each one's halves
    falling either side of the pole, legs and all."""
    d = m.d; X0, X1, Y = P(x), P(x + L), P(y)
    for px_ in (X0 - 8, X1 + 8): m.disc(px_, Y, 9, "dwood", 2)                             # the posts
    for i in range(hides):
        w = L / hides * .8; hx = x + L * (i + .5) / hides - w / 2
        pelt(m, hx, y - .7, w, .7, fur, "s"); pelt(m, hx, y, w, .7, fur, "n")            # a skin over the pole, halves each side
    d.line([X0 - 12, Y, X1 + 12, Y], fill=OUT, width=8); d.line([X0 - 12, Y, X1 + 12, Y], fill=R["dwood"][3], width=4)
    d.line([X0 - 12, Y - 1, X1 + 12, Y - 1], fill=R["dwood"][4])


def bow(m, x, y, along="y"):
    """A hunting bow hung on the wall with its quiver: a curved stave and its string, arrows' fletching in the quiver."""
    d = m.d; X, Y = P(x), P(y)
    if along == "y":
        d.arc([X - 10, Y - 40, X + 14, Y + 40], 100, 260, fill=R["wood"][3], width=3); d.line([X + 1, Y - 39, X + 1, Y + 39], fill=R["straw"][4])
        m.box(X + 8, Y - 12, X + 18, Y + 20, "red", 1)
        for k in range(3): d.rectangle([X + 9 + k * 3, Y - 18, X + 10 + k * 3, Y - 12], fill=R["linen"][4])
    else:
        d.arc([X - 40, Y - 10, X + 40, Y + 14], 190, 350, fill=R["wood"][3], width=3); d.line([X - 39, Y + 1, X + 39, Y + 1], fill=R["straw"][4])
