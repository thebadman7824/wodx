"""WoDX pixel map drawer (B5730): props, each drawn so a player can name it at a glance (RULES.md).
Positions in squares, sizes in pixels at 94 a square. Light from the north-west, shadows kept tight to the base.

Things that open and shut (doors, shutters, chests, casks, crates, sacks) are "openables" (B5732). Drawn on their own
they show one state (OPEN: "auto", "closed", "open" or "none"). While a scene.Recorder is set as REC, an openable is
not drawn into the map at all: the recorder notes where it is and draws it later once per state, so each state
becomes a picture of its own that Foundry swaps when the thing is opened or shut."""
import functools, math
import numpy as np
from px import R, T, OUT

P = lambda v: int(round(v * T))


def tone(c, k): return tuple(int(max(0, min(255, v + k))) for v in c)


OPEN = "auto"            # "closed", "open", "none" (left out), or "auto" (windows open, the rest shut)
REC = None               # a scene.Recorder while a scene is recorded
CUTTING = False          # True while the recorder draws one openable in one state
_PROBE = None
SEGS = []                # the scene's wall lines (squares), so things hung outside a wall keep clear of others
OPENS = []               # its doors and windows: (x0, y0, x1, y1, kind)


class _Defer(Exception):
    pass


def _state(kind, box, auto="closed"):
    """The state to draw a thing in, or None to leave it out. While the recorder probes, stop here with the box."""
    if _PROBE is not None:
        _PROBE.update(kind=kind, box=tuple(int(v) for v in box)); raise _Defer
    s = auto if OPEN == "auto" else OPEN
    return None if s == "none" else s


def _opening(x0, y0, x1, y1, kind, centre, exterior):
    """A door or window tells the recorder where its opening is (squares) and which side is indoors."""
    if _PROBE is not None: _PROBE["opening"] = {"c": [x0, y0, x1, y1], "kind": kind, "inside": list(centre), "exterior": exterior}


def openable(fn):
    """See the module note. name: what a player would call it; flags: WoDX Interactables settings for it."""
    @functools.wraps(fn)
    def wrap(m, *a, name=None, flags=None, state=None, **k):
        global OPEN, CUTTING, _PROBE
        if state is not None:
            old = OPEN, CUTTING; OPEN, CUTTING = state, True
            try: return fn(m, *a, **k)
            finally: OPEN, CUTTING = old
        if REC is None: return fn(m, *a, **k)
        _PROBE = {}
        try: fn(m, *a, **k)
        except _Defer: pass
        finally: probe, _PROBE = _PROBE, None
        if "box" not in probe: return
        REC.openable(probe["kind"], probe["box"], functools.partial(wrap, m, *a, **k), name=name, flags=flags, opening=probe.get("opening"))
    return wrap


def logpile(m, x, y, w, h, upright=False):
    """Cut firewood stacked lengthwise, seen from above: round billets side by side, each with its pale ringed cut
    end showing, rows staggered, a few split faces, a loose log or two fallen off the stack."""
    d = m.d; X0, Y0, W, H = P(x), P(y), P(w), P(h); rng = m.rng; Wd = R["wood"]
    Bk = [tone(Wd[1], -18), tone(Wd[1], -4), Wd[2], tone(Wd[2], 14)]
    m.shade((X0 + 2, Y0 + 3, X0 + W + 4, Y0 + H + 5), f=.58)
    def billet(u, v, l, th=9):
        """One log: u along its length, v across. Body shaded like a cylinder, a round pale end face."""
        c = int(rng.integers(0, 3)); split = rng.random() < .3
        def rect(u0, v0, u1, v1, **kw):
            d.rectangle([X0 + u0, Y0 + v0, X0 + u1, Y0 + v1] if not upright else [X0 + v0, Y0 + u0, X0 + v1, Y0 + u1], **kw)
        def ell(u0, v0, u1, v1, **kw):
            d.ellipse([X0 + u0, Y0 + v0, X0 + u1, Y0 + v1] if not upright else [X0 + v0, Y0 + u0, X0 + v1, Y0 + u1], **kw)
        rect(u, v, u + l - 3, v + th - 1, fill=Bk[c], outline=OUT)
        rect(u + 1, v + 2, u + l - 4, v + 3, fill=Bk[c + 1]); rect(u + 1, v + th - 3, u + l - 4, v + th - 2, fill=tone(Bk[c], -14))
        if split: rect(u + 1, v + 1, u + l - 4, v + th - 2, fill=tone(Wd[4], -10)); rect(u + 3, v + 3, u + l - 8, v + 3, fill=Wd[4]); rect(u + 5, v + 6, u + l - 12, v + 6, fill=Wd[3])
        ell(u + l - 7, v, u + l, v + th - 1, fill=Wd[4], outline=OUT); ell(u + l - 5, v + 2, u + l - 2, v + th - 3, outline=Wd[2])       # the cut end with a ring
    span, across = (W, H) if not upright else (H, W)
    for j, v in enumerate(range(0, across - 8, 10)):
        u = -(j % 2) * 12
        while u < span - 14:
            l = 40 + int(rng.integers(-5, 8)); u0 = max(u, 0); l2 = min(l - (u0 - u), span - u0)
            if l2 > 12: billet(u0, v, l2)
            u += l + 1
    billet(span * .3, across + 3, 34); billet(span * .62, across + 9, 30)                                  # two that rolled off


def axe(m, cx, cy, ang=-.6, L=34):
    """A felling axe lying or stuck: pale haft, dark iron wedge head with a bright edge."""
    d = m.d; ca, sa = math.cos(ang), math.sin(ang); hx, hy = cx + ca * L, cy + sa * L
    d.line([cx + 2, cy + 3, hx + 2, hy + 3], fill=tone(R["dwood"][0], -4), width=3)
    d.line([cx, cy, hx, hy], fill=OUT, width=5); d.line([cx, cy, hx, hy], fill=R["wood"][4], width=3); d.line([cx, cy - 1, hx, hy - 1], fill=tone(R["wood"][4], 26))
    nx, ny = -sa, ca
    head = [(cx - ca * 4 - nx * 3, cy - sa * 4 - ny * 3), (cx + ca * 5 - nx * 3, cy + sa * 5 - ny * 3), (cx + ca * 7 + nx * 13, cy + sa * 7 + ny * 13), (cx - ca * 7 + nx * 13, cy - sa * 7 + ny * 13)]
    d.polygon(head, fill=R["iron"][3], outline=OUT); d.line([head[2], head[3]], fill=(196, 200, 206), width=2); d.line([head[0], head[1]], fill=R["iron"][1])


def chopping(m, x, y):
    """The chopping block: a broad stump showing its rings, the axe struck into it, split billets and chips about."""
    d = m.d; cx, cy = P(x), P(y); rng = m.rng; Wd = R["wood"]
    for dx, dy, a in ((-34, 16, .3), (-26, -22, -.9), (30, 24, 1.2), (8, 34, .1)):                # split billets
        ca, sa = math.cos(a), math.sin(a); p = [(cx + dx - ca * 12 - sa * 3, cy + dy - sa * 12 + ca * 3), (cx + dx + ca * 12 - sa * 3, cy + dy + sa * 12 + ca * 3), (cx + dx + ca * 12 + sa * 3, cy + dy + sa * 12 - ca * 3), (cx + dx - ca * 12 + sa * 3, cy + dy - sa * 12 - ca * 3)]
        d.polygon([(px_ + 1, py_ + 2) for px_, py_ in p], fill=tone(R["grass"][0], -8)); d.polygon(p, fill=Wd[4], outline=OUT); d.line([p[0], p[1]], fill=R["dwood"][2])
    for _ in range(26): a, q = rng.uniform(0, 6.28), rng.uniform(22, 44); d.point((cx + math.cos(a) * q, cy + math.sin(a) * q), fill=Wd[4] if rng.random() < .6 else R["straw"][4])   # chips
    m.shade((cx - 18, cy - 14, cx + 24, cy + 26), kind="ellipse", f=.56)
    d.ellipse([cx - 21, cy - 21, cx + 21, cy + 21], fill=R["dwood"][1], outline=OUT)                    # bark
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=Wd[3])
    for q in (14, 10, 6, 2): d.ellipse([cx - q, cy - q, cx + q, cy + q], outline=Wd[2])
    d.arc([cx - 17, cy - 17, cx + 17, cy + 17], 180, 280, fill=Wd[4])
    for a in (.4, 2.1, 3.9): d.line([cx + math.cos(a) * 5, cy + math.sin(a) * 5, cx + math.cos(a) * 16, cy + math.sin(a) * 16], fill=R["dwood"][1])   # checks and axe scars
    axe(m, cx + 2, cy - 2, ang=-.75, L=38)


def stool(m, x, y, r=14):
    d = m.d; cx, cy = P(x), P(y)
    m.shade((cx - r + 2, cy - r + 4, cx + r + 4, cy + r + 5), kind="ellipse", f=.58)
    for a in (-.5, 1.6, 3.7):                                                     # three splayed legs show past the seat
        lx, ly = cx + math.cos(a) * (r + 2), cy + math.sin(a) * (r + 2); d.rectangle([lx - 3, ly - 3, lx + 3, ly + 3], fill=R["dwood"][2], outline=OUT)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=R["wood"][2], outline=OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 3, cy + r - 3], fill=R["wood"][3])
    d.arc([cx - r + 3, cy - r + 3, cx + r - 4, cy + r - 4], 180, 270, fill=R["wood"][4])
    for dy in (-5, 0, 5): d.line([cx - r + 6, cy + dy, cx + r - 7, cy + dy], fill=R["wood"][2])
    for a in (-.5, 1.6, 3.7): d.point((cx + math.cos(a) * (r - 5), cy + math.sin(a) * (r - 5)), fill=R["dwood"][1])   # the leg wedges


def bench(m, x, y, w, h):
    """A plank bench: two boards for the seat, trestle legs showing at each end, pegs through the top."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); horiz = w > h; Wd = R["wood"]
    m.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 5), f=.58)
    if horiz:
        for lx in (X0 + 10, X1 - 18): d.rectangle([lx, Y0 - 3, lx + 8, Y1 + 3], fill=R["dwood"][2], outline=OUT)
        d.rectangle([X0, Y0, X1, Y1], fill=Wd[2], outline=OUT); my = (Y0 + Y1) // 2
        d.rectangle([X0 + 1, Y0 + 1, X1 - 1, my - 1], fill=Wd[3]); d.line([X0 + 1, my, X1 - 1, my], fill=Wd[0]); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Wd[4])
        for k in range(X0 + 18, X1 - 20, 23): d.line([k, Y0 + 4, k + 9, Y0 + 4], fill=Wd[2]); d.line([k + 6, my + 4, k + 14, my + 4], fill=Wd[1])
        for lx in (X0 + 14, X1 - 14): d.rectangle([lx - 1, my - 4, lx + 1, my - 2], fill=R["dwood"][0]); d.rectangle([lx - 1, my + 3, lx + 1, my + 5], fill=R["dwood"][0])
    else:
        for ly in (Y0 + 10, Y1 - 18): d.rectangle([X0 - 3, ly, X1 + 3, ly + 8], fill=R["dwood"][2], outline=OUT)
        d.rectangle([X0, Y0, X1, Y1], fill=Wd[2], outline=OUT); mx = (X0 + X1) // 2
        d.rectangle([X0 + 1, Y0 + 1, mx - 1, Y1 - 1], fill=Wd[3]); d.line([mx, Y0 + 1, mx, Y1 - 1], fill=Wd[0]); d.line([X0 + 1, Y0 + 1, X0 + 1, Y1 - 1], fill=Wd[4])
        for k in range(Y0 + 18, Y1 - 20, 23): d.line([X0 + 4, k, X0 + 4, k + 9], fill=Wd[2]); d.line([mx + 4, k + 6, mx + 4, k + 14], fill=Wd[1])
        for ly in (Y0 + 14, Y1 - 14): d.rectangle([mx - 4, ly - 1, mx - 2, ly + 1], fill=R["dwood"][0]); d.rectangle([mx + 3, ly - 1, mx + 5, ly + 1], fill=R["dwood"][0])


# ---- small things for tables and shelves (centre in pixels) ----
def jug(m, cx, cy, r=8, col="clay", turn=0):
    d = m.d; C = R[col]; hx = cx + (r + 3 if turn == 0 else -(r + 3))
    d.rectangle([min(cx, hx), cy - 2, max(cx, hx), cy + 2], fill=C[2], outline=OUT)                    # the handle
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C[2], outline=OUT); d.arc([cx - r + 1, cy - r + 1, cx + r - 2, cy + r - 2], 170, 280, fill=C[4])
    d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=(16, 12, 16), outline=C[1])         # the dark mouth
    sx = cx - (r if turn == 0 else -r); d.polygon([(sx, cy - 2), (sx + (-3 if turn == 0 else 3), cy), (sx, cy + 2)], fill=C[3], outline=OUT)   # the spout


def bowl(m, cx, cy, r=8, food=None, spoon=False):
    d = m.d; W = R["wood"]
    d.ellipse([cx - r + 1, cy - r + 2, cx + r + 2, cy + r + 3], fill=tone(R["dwood"][0], -6))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=W[3], outline=OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=W[1])
    d.ellipse([cx - r + 3, cy - r + 4, cx + r - 3, cy + r - 2], fill=food or W[2]); d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 180, 270, fill=W[4])
    if food: d.point((cx - 2, cy), fill=tone(food, 30)); d.point((cx + 2, cy + 2), fill=tone(food, -24))
    if spoon: d.line([cx + 2, cy - 1, cx + r + 7, cy - 6], fill=OUT, width=3); d.line([cx + 2, cy - 1, cx + r + 7, cy - 6], fill=W[4]); d.ellipse([cx - 1, cy - 3, cx + 4, cy + 1], fill=W[4], outline=OUT)


def loaf(m, cx, cy, rx=11, ry=8):
    d = m.d; d.ellipse([cx - rx + 1, cy - ry + 2, cx + rx + 2, cy + ry + 3], fill=tone(R["dwood"][0], -6))
    B = [(92, 58, 34), (132, 88, 46), (166, 120, 62), (196, 154, 88)]
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=B[1], outline=OUT); d.ellipse([cx - rx + 2, cy - ry + 1, cx + rx - 3, cy + ry - 3], fill=B[2])
    d.ellipse([cx - rx + 4, cy - ry + 2, cx + 1, cy - 1], fill=B[3])
    for k in (-5, 0, 5): d.line([cx + k - 2, cy - 4, cx + k + 2, cy + 4], fill=B[0])                   # the baker's slashes


def cheese(m, cx, cy, r=8):
    d = m.d; G = [(120, 96, 40), (168, 138, 58), (204, 176, 86), (226, 204, 124)]
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=G[1], outline=OUT); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=G[2])
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 20, 75, fill=(20, 14, 16)); d.line([cx, cy, cx + r - 1, cy + 3], fill=G[3]); d.arc([cx - r + 2, cy - r + 2, cx + r - 3, cy + r - 3], 180, 270, fill=G[3])


def plates(m, cx, cy, r=8):
    d = m.d; W = R["wood"]
    for k in (2, 1, 0): d.ellipse([cx - r + k, cy - r + k, cx + r + k, cy + r + k], fill=W[3 if k == 0 else 2], outline=OUT)
    d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], outline=W[2]); d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 180, 270, fill=W[4])


def cup(m, cx, cy):
    d = m.d; W = R["wood"]; d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=W[3], outline=OUT); d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(70, 46, 30)); d.point((cx - 3, cy - 3), fill=W[4])


def knife(m, cx, cy, ang=.2):
    d = m.d; ca, sa = math.cos(ang), math.sin(ang)
    d.line([cx, cy, cx + ca * 9, cy + sa * 9], fill=(170, 174, 180), width=2); d.line([cx - ca * 6, cy - sa * 6, cx, cy], fill=R["dwood"][1], width=2); d.point((cx + ca * 9, cy + sa * 9), fill=(214, 218, 222))


def candle(m, cx, cy, lit=True):
    d = m.d; G = R["gold"]
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=G[2], outline=OUT); d.ellipse([cx - 4, cy - 4, cx + 3, cy + 3], fill=G[1]); d.arc([cx - 5, cy - 5, cx + 5, cy + 5], 180, 270, fill=G[4])
    d.rectangle([cx - 2, cy - 2, cx + 1, cy + 1], fill=(214, 206, 180), outline=(130, 122, 104))
    if lit:
        d.rectangle([cx - 2, cy - 5, cx, cy - 3], fill=(255, 190, 70)); d.point((cx - 1, cy - 6), fill=(255, 236, 164)); d.point((cx - 1, cy - 3), fill=(238, 124, 30))
        m.glow(cx, cy, 46, power=.4)


def basket(m, cx, cy, r=15, fill="wool"):
    """A woven basket: a braided rim, the weave showing, and its load heaped inside."""
    d = m.d; S = R["straw"]; rng = m.rng
    m.shade((cx - r + 2, cy - r + 4, cx + r + 4, cy + r + 5), kind="ellipse", f=.58)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=S[1], outline=OUT)
    for a in np.linspace(0, 2 * math.pi, int(r * 1.5), endpoint=False):                               # the braid
        d.line([cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1), cx + math.cos(a + .25) * (r - 4), cy + math.sin(a + .25) * (r - 4)], fill=S[3] if math.cos(a) + math.sin(a) < .2 else S[2])
    d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=tone(S[0], -14))
    q = r - 6
    if fill == "wool":
        for _ in range(9):
            a, t = rng.uniform(0, 6.28), rng.uniform(0, q - 3); x, y = cx + math.cos(a) * t, cy + math.sin(a) * t
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(150, 144, 132)); d.ellipse([x - 4, y - 4, x + 2, y + 2], fill=(196, 190, 174)); d.point((x - 2, y - 2), fill=(226, 222, 208))
    else:
        cols = {"onions": [(150, 100, 44), (186, 136, 60), (216, 176, 96)], "apples": [(110, 26, 26), (156, 44, 36), (200, 84, 60)], "eggs": [(170, 160, 140), (206, 198, 178), (232, 226, 210)],
                "turnips": [(120, 78, 110), (180, 170, 160), (214, 208, 196)]}[fill]
        for _ in range(11):
            a, t = rng.uniform(0, 6.28), rng.uniform(0, q - 2); x, y = int(cx + math.cos(a) * t), int(cy + math.sin(a) * t)
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=cols[1], outline=cols[0]); d.point((x - 1, y - 1), fill=cols[2])
            if fill == "onions": d.point((x + 1, y - 3), fill=(120, 110, 60))


def distaff(m, cx, cy, ang=.5):
    """A drop spindle and a hank of spun yarn beside the wool basket."""
    d = m.d; ca, sa = math.cos(ang), math.sin(ang)
    d.line([cx, cy, cx + ca * 22, cy + sa * 22], fill=OUT, width=3); d.line([cx, cy, cx + ca * 22, cy + sa * 22], fill=R["wood"][4])
    d.ellipse([cx + ca * 6 - 4, cy + sa * 6 - 4, cx + ca * 6 + 4, cy + sa * 6 + 4], fill=(196, 190, 174), outline=(120, 114, 104))      # the cop of yarn
    d.ellipse([cx + ca * 17 - 3, cy + sa * 17 - 3, cx + ca * 17 + 3, cy + sa * 17 + 3], fill=R["dwood"][2], outline=OUT)                 # the whorl


def shelf(m, x, y, w, h, goods):
    """A wall shelf seen from above, set with things one can name."""
    d = m.d; X0, Y0, X1, Y1 = P(x) + 2, P(y) + 2, P(x + w) - 2, P(y + h) - 2; horiz = w > h; Dk = R["dwood"]
    m.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 4), f=.6)
    d.rectangle([X0, Y0, X1, Y1], fill=Dk[3], outline=OUT); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=Dk[4])
    if horiz: d.line([X0 + 1, (Y0 + Y1) // 2, X1 - 1, (Y0 + Y1) // 2], fill=Dk[2])
    else: d.line([(X0 + X1) // 2, Y0 + 1, (X0 + X1) // 2, Y1 - 1], fill=Dk[2])
    for bx in ((X0 + 3, X1 - 6) if horiz else ()): d.rectangle([bx, Y0 + 1, bx + 3, Y1 - 1], fill=Dk[1])     # brackets
    n = len(goods); span = (X1 - X0 if horiz else Y1 - Y0) - 24
    for i, g in enumerate(goods):
        t = 12 + (span * i / max(1, n - 1) if n > 1 else span / 2)
        cx, cy = (X0 + t, (Y0 + Y1) / 2) if horiz else ((X0 + X1) / 2, Y0 + t); cx, cy = int(cx), int(cy)
        if g == "jug": jug(m, cx, cy, 8)
        elif g == "pot": jug(m, cx, cy, 9, "stone", turn=1)
        elif g == "bowl": bowl(m, cx, cy, 8)
        elif g == "plates": plates(m, cx, cy, 8)
        elif g == "loaf": loaf(m, cx, cy, 10, 7)
        elif g == "cheese": cheese(m, cx, cy, 8)
        elif g == "eggs": basket(m, cx, cy, 10, "eggs")
        elif g == "apples": basket(m, cx, cy, 10, "apples")
        elif g == "candle": candle(m, cx, cy, lit=False)
        elif g == "cups": cup(m, cx - 5, cy - 1); cup(m, cx + 5, cy + 2)
        elif g == "linen":
            L = R["linen"]; d.rectangle([cx - 9, cy - 7, cx + 9, cy + 7], fill=L[3], outline=OUT)
            for k in (-3, 1, 5): d.line([cx - 8, cy + k, cx + 8, cy + k], fill=L[1])
            d.line([cx - 8, cy - 6, cx + 8, cy - 6], fill=L[4])


def bed(m, x, y, w, h, head="n", cloth="red"):
    """A bedstead: a tall headboard, corner posts, a plump pillow, a blanket with a turned-back sheet and folds."""
    d = m.d; X0, Y0, X1, Y1 = P(x) + 3, P(y) + 3, P(x + w) - 3, P(y + h) - 3; Dk = R["dwood"]; L = R["linen"]; C = R[cloth]
    m.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 6), f=.58)
    d.rectangle([X0, Y0, X1, Y1], fill=Dk[2], outline=OUT)
    vert = head in "ns"
    # mattress
    d.rectangle([X0 + 4, Y0 + 4, X1 - 4, Y1 - 4], fill=L[1], outline=L[0])
    Lg = (Y1 - Y0) if vert else (X1 - X0)
    if head == "n": hb = (X0, Y0, X1, Y0 + 8); pil = [X0 + int((X1 - X0) * .2), Y0 + 13, X1 - int((X1 - X0) * .2), Y0 + 13 + 20]; bl = [X0 + 4, Y0 + int(Lg * .36), X1 - 4, Y1 - 5]
    elif head == "s": hb = (X0, Y1 - 8, X1, Y1); pil = [X0 + int((X1 - X0) * .2), Y1 - 33, X1 - int((X1 - X0) * .2), Y1 - 13]; bl = [X0 + 4, Y0 + 5, X1 - 4, Y1 - int(Lg * .36)]
    elif head == "w": hb = (X0, Y0, X0 + 8, Y1); pil = [X0 + 13, Y0 + int((Y1 - Y0) * .2), X0 + 33, Y1 - int((Y1 - Y0) * .2)]; bl = [X0 + int(Lg * .36), Y0 + 4, X1 - 5, Y1 - 4]
    else: hb = (X1 - 8, Y0, X1, Y1); pil = [X1 - 33, Y0 + int((Y1 - Y0) * .2), X1 - 13, Y1 - int((Y1 - Y0) * .2)]; bl = [X0 + 5, Y0 + 4, X1 - int(Lg * .36), Y1 - 4]
    # pillow: rounded, lit top-left, dented in the middle
    px0, py0, px1, py1 = pil
    d.rectangle([px0 + 1, py0 + 2, px1 + 1, py1 + 2], fill=L[0])
    d.rectangle([px0 + 2, py0, px1 - 2, py1], fill=L[3]); d.rectangle([px0, py0 + 2, px1, py1 - 2], fill=L[3])
    d.line([px0 + 2, py0, px1 - 2, py0], fill=L[4]); d.line([px0, py0 + 2, px0, py1 - 2], fill=L[4]); d.line([px0 + 2, py1, px1 - 2, py1], fill=L[1]); d.line([px1, py0 + 2, px1, py1 - 2], fill=L[1])
    mx, my = (px0 + px1) // 2, (py0 + py1) // 2
    d.ellipse([mx - 7, my - 4, mx + 7, my + 4], fill=L[2]); d.line([mx - 4, my + 3, mx + 5, my + 3], fill=L[1])
    for cxp, cyp in ((px0 + 2, py0 + 2), (px1 - 2, py0 + 2), (px0 + 2, py1 - 2), (px1 - 2, py1 - 2)): d.point((cxp, cyp), fill=L[1])
    # blanket with folds, and the sheet turned back over it
    bx0, by0, bx1, by1 = bl
    d.rectangle(bl, fill=C[2], outline=C[0])
    if vert:
        for i in range(by0 + 12, by1 - 4, 14): d.line([bx0 + 2, i, bx1 - 2, i], fill=C[1]); d.line([bx0 + 2, i + 1, bx1 - 2, i + 1], fill=C[3])
        for fx in (bx0 + (bx1 - bx0) // 3, bx0 + 2 * (bx1 - bx0) // 3): d.line([fx, by0 + 9, fx + 4, by1 - 3], fill=C[1]); d.line([fx + 1, by0 + 9, fx + 5, by1 - 3], fill=C[3])
        d.line([bx1 - 2, by0 + 2, bx1 - 2, by1 - 2], fill=C[1]); d.line([bx0 + 1, by0 + 2, bx0 + 1, by1 - 2], fill=C[3])
        sh = [bx0, by0, bx1, by0 + 8] if head == "n" else [bx0, by1 - 8, bx1, by1]
    else:
        for i in range(bx0 + 12, bx1 - 4, 14): d.line([i, by0 + 2, i, by1 - 2], fill=C[1]); d.line([i + 1, by0 + 2, i + 1, by1 - 2], fill=C[3])
        for fy in (by0 + (by1 - by0) // 3, by0 + 2 * (by1 - by0) // 3): d.line([bx0 + 9, fy, bx1 - 3, fy + 4], fill=C[1]); d.line([bx0 + 9, fy + 1, bx1 - 3, fy + 5], fill=C[3])
        sh = [bx0, by0, bx0 + 8, by1] if head == "w" else [bx1 - 8, by0, bx1, by1]
    d.rectangle(sh, fill=L[4], outline=L[1])
    d.rectangle(hb, fill=Dk[3], outline=OUT); d.line([hb[0] + 1, hb[1] + 1, hb[2] - 1, hb[1] + 1], fill=Dk[4])
    for cxp, cyp in ((X0, Y0), (X1 - 7, Y0), (X0, Y1 - 7), (X1 - 7, Y1 - 7)):                          # posts with turned knobs
        d.rectangle([cxp, cyp, cxp + 7, cyp + 7], fill=Dk[3], outline=OUT); d.rectangle([cxp + 2, cyp + 2, cxp + 4, cyp + 4], fill=Dk[4])


def chest(m, x, y, w=1.0, h=.6):
    """A coffer: plank lid with iron straps and hinges at the back, a hasp and lock at the front."""
    d = m.d; X0, Y0, X1, Y1 = P(x) + 5, P(y) + 4, P(x + w) - 5, P(y + h) - 4; W = R["wood"]; I = R["iron"]
    m.shade((X0 + 2, Y0 + 3, X1 + 3, Y1 + 5), f=.56)
    d.rectangle([X0, Y0, X1, Y1], fill=W[2], outline=OUT); d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 3], fill=W[1])                    # the back edge, where the lid hinges
    d.line([X0 + 1, Y0 + 4, X1 - 1, Y0 + 4], fill=W[4])
    for k in range(Y0 + 12, Y1 - 4, 9): d.line([X0 + 1, k, X1 - 1, k], fill=W[1])
    for sx in (X0 + 12, X1 - 15): d.rectangle([sx, Y0 + 1, sx + 3, Y1 - 1], fill=I[2]); d.line([sx, Y0 + 1, sx, Y1 - 1], fill=I[4]); [d.point((sx + 1, k), fill=I[4]) for k in range(Y0 + 6, Y1 - 2, 8)]
    mx = (X0 + X1) // 2; d.rectangle([mx - 4, Y1 - 12, mx + 4, Y1 - 1], fill=I[3], outline=OUT); d.rectangle([mx - 1, Y1 - 7, mx + 1, Y1 - 4], fill=OUT); d.point((mx - 3, Y1 - 11), fill=(170, 172, 178))
    for cxp, cyp in ((X0, Y0), (X1 - 4, Y0), (X0, Y1 - 4), (X1 - 4, Y1 - 4)): d.rectangle([cxp, cyp, cxp + 4, cyp + 4], fill=I[2], outline=OUT)


def bucket(m, cx, cy, r=13, water=True):
    d = m.d; W = R["wood"]; I = R["iron"]
    m.shade((cx - r + 2, cy - r + 4, cx + r + 4, cy + r + 5), kind="ellipse", f=.58)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=W[2], outline=OUT)
    for a in np.linspace(0, 2 * math.pi, 12, endpoint=False): d.line([cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4), cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=W[0])   # staves
    d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], outline=I[3])                             # the hoop
    d.ellipse([cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4], fill=R["water"][1] if water else W[0], outline=OUT)
    if water: d.arc([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], 190, 260, fill=R["water"][4]); d.line([cx - 1, cy + 2, cx + 4, cy + 2], fill=R["water"][3])
    d.arc([cx - r - 2, cy - r + 3, cx + r + 2, cy + r + 9], 200, 340, fill=OUT, width=3); d.arc([cx - r - 2, cy - r + 3, cx + r + 2, cy + r + 9], 205, 335, fill=I[4])      # the bail handle


@openable
def barrel(m, x, y, r=30, lying=False, holds="water", head="e"):
    """A cask standing on end: staves, the head boards inside the chime, two iron hoops, a bung."""
    d = m.d; cx, cy = P(x), P(y); W = R["wood"]; I = R["iron"]
    state = _state("barrel", (cx - r - 34, cy - r - 34, cx + r + 34, cy + r + 34))
    if state is None: return
    if state == "open":
        _open_barrel(m, cx, cy, r, holds, head); return
    m.shade((cx - r + 3, cy - r + 5, cx + r + 5, cy + r + 7), kind="ellipse", f=.56)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=W[1], outline=OUT)                                  # the bulge of the staves
    for a in np.linspace(0, 2 * math.pi, 18, endpoint=False): d.line([cx + math.cos(a) * (r - 6), cy + math.sin(a) * (r - 6), cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=W[0])
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=I[3]); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 270, fill=I[4])
    q = r - 6; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=W[2], outline=OUT)                        # the chime and the head
    d.ellipse([cx - q + 2, cy - q + 2, cx + q - 2, cy + q - 2], fill=W[3])
    for dx in range(-q + 7, q - 4, 8):
        hh = int(math.sqrt(max(0, (q - 2) ** 2 - dx * dx))); d.line([cx + dx, cy - hh + 1, cx + dx, cy + hh - 1], fill=W[1])
    d.arc([cx - q + 2, cy - q + 2, cx + q - 3, cy + q - 3], 185, 265, fill=W[4])
    d.ellipse([cx + 3, cy - 9, cx + 9, cy - 3], fill=R["dwood"][1], outline=OUT); d.point((cx + 5, cy - 7), fill=W[4])   # the bung


def _open_barrel(m, cx, cy, r, holds, head="e"):
    """The head lifted out and leant against the cask, so the rim of the staves rings what is inside."""
    d = m.d; W = R["wood"]; I = R["iron"]; rng = np.random.default_rng(cx * 3 + cy)
    m.shade((cx - r + 3, cy - r + 5, cx + r + 5, cy + r + 7), kind="ellipse", f=.56)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=W[1], outline=OUT)
    for a in np.linspace(0, 2 * math.pi, 18, endpoint=False): d.line([cx + math.cos(a) * (r - 6), cy + math.sin(a) * (r - 6), cx + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1)], fill=W[0])
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], outline=I[3]); d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 180, 270, fill=I[4])
    q = r - 5; d.ellipse([cx - q, cy - q, cx + q, cy + q], fill=W[3], outline=OUT)                       # the top edge of the staves, end grain lit
    q2 = q - 3; d.ellipse([cx - q2, cy - q2, cx + q2, cy + q2], fill=tone(W[0], -22), outline=OUT)            # dark inside wall
    q3 = q2 - 3; C = {"water": R["water"], "grain": R["gold"], "apples": None, "kraut": [(70, 76, 40), (98, 104, 52), (128, 132, 66), (156, 158, 86), (186, 186, 112)]}.get(holds, R["water"])
    if holds == "apples":
        d.ellipse([cx - q3, cy - q3 + 2, cx + q3, cy + q3 + 2], fill=(70, 30, 28))
        for _ in range(int(q3 * q3 / 14)):
            a, t = rng.uniform(0, 6.28), rng.uniform(0, 1) ** .5 * (q3 - 4); x_, y_ = cx + math.cos(a) * t, cy + 2 + math.sin(a) * t
            d.ellipse([x_ - 4, y_ - 4, x_ + 4, y_ + 4], fill=(150, 46, 38) if rng.random() < .7 else (120, 140, 52), outline=OUT); d.point((x_ - 2, y_ - 2), fill=(214, 150, 120))
    else:
        d.ellipse([cx - q3, cy - q3 + 3, cx + q3, cy + q3 + 3], fill=C[1])                                  # the contents, sunk a little below the rim
        if holds == "water":
            d.arc([cx - q3 + 4, cy - q3 + 6, cx + q3 - 4, cy + q3], 200, 250, fill=C[4]); d.line([cx - 4, cy + 4, cx + 6, cy + 4], fill=C[3]); d.line([cx - 8, cy + 9, cx, cy + 9], fill=C[2])
        else:
            for _ in range(int(q3 * q3 / 3)):
                a, t = rng.uniform(0, 6.28), rng.uniform(0, 1) ** .5 * (q3 - 2); x_, y_ = cx + math.cos(a) * t, cy + 3 + math.sin(a) * t
                d.point((x_, y_), fill=C[int(rng.integers(2, 5))])
            if holds == "grain": d.ellipse([cx - 6, cy - 2, cx + 8, cy + 6], fill=C[3]); d.arc([cx - 6, cy - 2, cx + 8, cy + 6], 180, 270, fill=C[4])   # a heaped crown and the scoop mark
    if head == "s":                                                              # the head, leant on its edge against the cask: a foreshortened disc
        hy = cy + r + 9; m.shade((cx - r * .7 + 3, hy - 4, cx + r * .7 + 5, hy + 12), kind="ellipse", f=.6)
        d.ellipse([cx - r * .8, hy - 8, cx + r * .8, hy + 8], fill=W[2], outline=OUT)
        for k in (-4, 0, 4): d.line([cx - r * .7, hy + k, cx + r * .7, hy + k], fill=W[1])
        d.line([cx - r * .5, hy - 6, cx + r * .5, hy - 6], fill=W[4]); return
    hx = cx + r + 10
    m.shade((hx - 6, cy - r * .7 + 4, hx + 14, cy + r * .7 + 4), kind="ellipse", f=.6)
    d.ellipse([hx - 9, cy - r * .8, hx + 9, cy + r * .8], fill=W[2], outline=OUT)
    for k in (-4, 0, 4): d.line([hx + k, cy - r * .7, hx + k, cy + r * .7], fill=W[1])
    d.line([hx - 7, cy - r * .5, hx - 7, cy + r * .5], fill=W[4])


def trough(m, x, y, w, h):
    """A water trough hewn from a log: thick rounded sides, end grain at the ends, water inside."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); Dk = R["dwood"]; Wa = R["water"]
    m.shade((X0 + 3, Y0 + 4, X1 + 4, Y1 + 6), f=.58)
    for ly in (Y0 + 14, Y1 - 22): d.rectangle([X0 - 4, ly, X1 + 4, ly + 8], fill=Dk[1], outline=OUT)      # the bearers it sits on
    d.rectangle([X0, Y0 + 4, X1, Y1 - 4], fill=Dk[3], outline=OUT); d.ellipse([X0, Y0, X1, Y0 + 10], fill=Dk[3], outline=OUT); d.ellipse([X0, Y1 - 10, X1, Y1], fill=Dk[3], outline=OUT)
    d.rectangle([X0 + 1, Y0 + 5, X1 - 1, Y1 - 5], fill=Dk[3]); d.line([X0 + 1, Y0 + 6, X0 + 1, Y1 - 6], fill=Dk[4]); d.line([X1 - 1, Y0 + 6, X1 - 1, Y1 - 6], fill=Dk[1])
    for k in range(Y0 + 12, Y1 - 10, 17): d.line([X0 + 2, k, X0 + 4, k + 6], fill=Dk[2]); d.line([X1 - 4, k + 5, X1 - 2, k + 11], fill=Dk[2])     # adze marks
    d.rectangle([X0 + 7, Y0 + 9, X1 - 7, Y1 - 9], fill=Wa[1], outline=OUT); d.line([X0 + 8, Y0 + 10, X1 - 8, Y0 + 10], fill=Wa[0]); d.line([X0 + 8, Y0 + 10, X0 + 8, Y1 - 10], fill=Wa[0])
    for k in range(Y0 + 20, Y1 - 14, 15): d.line([X0 + 11, k, X1 - 13, k + 1], fill=Wa[2]); d.line([X0 + 14, k + 5, X1 - 17, k + 5], fill=Wa[3])
    d.line([X0 + 11, Y0 + 15, X0 + 11, Y0 + 30], fill=Wa[4])


def well(m, x, y):
    """A draw well: a ring of fitted stones, black water far down, a windlass on two posts with its rope and crank, the bucket on the rim."""
    d = m.d; cx, cy = P(x), P(y); S = R["stone"]; Dk = R["dwood"]
    m.shade((cx - 36, cy - 30, cx + 46, cy + 48), kind="ellipse", f=.58)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=OUT)
    for k in range(12):
        a = k * math.pi / 6; m.rock(cx + math.cos(a) * 32, cy + math.sin(a) * 32, 11, 10)
    d.ellipse([cx - 23, cy - 23, cx + 23, cy + 23], fill=(8, 8, 16), outline=OUT)
    d.ellipse([cx - 14, cy - 10, cx + 16, cy + 18], fill=(14, 18, 34)); d.arc([cx - 12, cy - 6, cx + 14, cy + 16], 30, 120, fill=R["water"][2]); d.point((cx + 4, cy + 12), fill=R["water"][4])
    for px_ in (cx - 46, cx + 39): d.rectangle([px_, cy - 6, px_ + 8, cy + 6], fill=Dk[3], outline=OUT); d.line([px_ + 1, cy - 5, px_ + 7, cy - 5], fill=Dk[4])      # the posts
    d.rectangle([cx - 38, cy - 3, cx + 39, cy + 3], fill=Dk[2], outline=OUT); d.line([cx - 37, cy - 2, cx + 38, cy - 2], fill=Dk[4])                              # the axle
    for k in range(cx - 12, cx + 13, 3): d.line([k, cy - 4, k, cy + 4], fill=R["straw"][3]); d.point((k, cy + 4), fill=R["straw"][1])                              # rope wound on it
    d.line([cx + 2, cy + 5, cx + 3, cy + 20], fill=R["straw"][3])                                                                                                 # rope going down
    d.line([cx + 47, cy, cx + 56, cy], fill=R["iron"][3], width=3); d.line([cx + 56, cy - 1, cx + 56, cy + 13], fill=R["iron"][3], width=3); d.rectangle([cx + 53, cy + 12, cx + 59, cy + 17], fill=Dk[4], outline=OUT)   # the crank
    bucket(m, cx - 30, cy + 34, 11, water=True)


# ---- the kitchen garden ----
def cabbage(m, cx, cy, r=9):
    d = m.d; G = R["green"]
    d.ellipse([cx - r + 2, cy - r + 3, cx + r + 2, cy + r + 3], fill=tone(R["dirt"][0], -14))
    for a in (0.4, 1.9, 3.5, 5.0):                                                # the loose outer leaves
        x, y = cx + math.cos(a) * r * .55, cy + math.sin(a) * r * .55; d.ellipse([x - r * .6, y - r * .6, x + r * .6, y + r * .6], fill=G[2], outline=G[0])
    d.ellipse([cx - r * .62, cy - r * .62, cx + r * .62, cy + r * .62], fill=G[3], outline=G[1])       # the head
    d.arc([cx - r * .4, cy - r * .4, cx + r * .4, cy + r * .4], 120, 330, fill=G[1]); d.point((cx - 2, cy - 2), fill=tone(G[4], 20)); d.point((cx - 3, cy - 1), fill=G[4])
    for a in (1.1, 2.7, 4.3, 5.8): d.line([cx + math.cos(a) * r * .5, cy + math.sin(a) * r * .5, cx + math.cos(a) * r, cy + math.sin(a) * r], fill=G[1])   # leaf ribs


def leek(m, cx, cy):
    d = m.d; G = R["green"]
    d.line([cx, cy + 4, cx, cy - 1], fill=(190, 196, 170), width=2)
    for dx, dy in ((-6, -8), (-2, -10), (3, -10), (7, -7)): d.line([cx, cy, cx + dx, cy + dy], fill=G[3]); d.point((cx + dx, cy + dy), fill=G[4])
    d.point((cx + 2, cy + 5), fill=tone(R["dirt"][0], -14))


def turnip(m, cx, cy):
    d = m.d; G = R["green"]
    for a in np.linspace(0, 2 * math.pi, 7, endpoint=False):                      # a rosette of leaves flat on the soil
        x, y = cx + math.cos(a) * 7, cy + math.sin(a) * 6; d.line([cx, cy, x, y], fill=G[2], width=2); d.point((x, y), fill=G[3])
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(150, 96, 134), outline=(84, 50, 78)); d.point((cx - 1, cy - 1), fill=(206, 196, 200))                          # the purple shoulder


def beanpole(m, cx, cy):
    d = m.d; G = R["green"]
    d.line([cx + 1, cy + 1, cx + 11, cy + 7], fill=tone(R["dirt"][0], -16), width=2)                     # the pole's shadow gives it height
    for dx, dy, k in ((-5, 2, 2), (4, -4, 3), (-3, -5, 3), (5, 4, 1), (0, 6, 2), (-6, -2, 2)):
        d.ellipse([cx + dx - 3, cy + dy - 2, cx + dx + 3, cy + dy + 2], fill=G[k], outline=G[0])
    d.point((cx - 4, cy - 4), fill=(190, 60, 50)); d.point((cx + 5, cy + 1), fill=(190, 60, 50))          # bean flowers
    d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=R["wood"][4], outline=OUT)                         # the pole, end on


def garden(m, x0, y0, x1, y1):
    """Fenced beds: ridged soil, one crop to a row so each row can be named."""
    d = m.d; gx0, gy0, gx1, gy1 = P(x0), P(y0), P(x1), P(y1)
    soil = (m.dirt(gy1 - gy0, gx1 - gx0) * .7).astype(np.uint8); m.put(soil, gx0, gy0)
    crops = [cabbage, leek, turnip, beanpole, cabbage, leek]
    rows = list(range(gy0 + 16, gy1 - 8, 23))
    for i, row in enumerate(rows):
        d.line([gx0 + 4, row + 11, gx1 - 4, row + 11], fill=tone(R["dirt"][0], -12)); d.line([gx0 + 4, row + 12, gx1 - 4, row + 12], fill=R["dirt"][2])   # the furrow between ridges
        f = crops[i % len(crops)]; step = {cabbage: 26, leek: 15, turnip: 19, beanpole: 30}[f]
        for xx in range(gx0 + 14 + (i % 2) * 6, gx1 - 10, step):
            if m.rng.random() < .07: continue                                     # a gap where one failed or was pulled
            f(m, xx + int(m.rng.integers(-1, 2)), row + int(m.rng.integers(-1, 2)))


def wattle(m, x0, y0, x1, y1):
    """A wattle fence: stakes with withies woven between them."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1); S = R["straw"]; horiz = Y0 == Y1
    if horiz:
        m.shade((X0, Y0 + 2, X1 + 3, Y0 + 7), f=.6)
        d.rectangle([X0, Y0 - 3, X1, Y0 + 3], fill=S[2], outline=OUT)
        for xx in range(X0 + 2, X1 - 2, 4): d.point((xx, Y0 - 1 if (xx // 4) % 2 else Y0 + 1), fill=S[4]); d.point((xx + 2, Y0 + 1 if (xx // 4) % 2 else Y0 - 1), fill=S[0])
        for xx in range(X0, X1 + 1, 30): d.rectangle([xx - 3, Y0 - 5, xx + 3, Y0 + 5], fill=R["dwood"][3], outline=OUT); d.point((xx - 1, Y0 - 3), fill=R["dwood"][4])
    else:
        m.shade((X0 + 2, Y0, X0 + 7, Y1 + 3), f=.6)
        d.rectangle([X0 - 3, Y0, X0 + 3, Y1], fill=S[2], outline=OUT)
        for yy in range(Y0 + 2, Y1 - 2, 4): d.point((X0 - 1 if (yy // 4) % 2 else X0 + 1, yy), fill=S[4]); d.point((X0 + 1 if (yy // 4) % 2 else X0 - 1, yy + 2), fill=S[0])
        for yy in range(Y0, Y1 + 1, 30): d.rectangle([X0 - 5, yy - 3, X0 + 5, yy + 3], fill=R["dwood"][3], outline=OUT); d.point((X0 - 3, yy - 1), fill=R["dwood"][4])


@openable
def crate(m, x, y, s=46, goods="apples", lid="w"):
    d = m.d; X, Y = P(x), P(y); W = R["wood"]
    state = _state("crate", (X - 30, Y - 30, X + s + 10, Y + s + 8))
    if state is None: return
    if state == "open":
        _open_crate(m, X, Y, s, goods, lid); return
    m.shade((X + 2, Y + 3, X + s + 4, Y + s - 1), f=.55)
    m.box(X, Y, X + s, Y + s - 6, "wood", 2)
    for k in (1, 2, 3): d.line([X + 2, Y + k * 10, X + s - 2, Y + k * 10], fill=W[0]); d.line([X + 3, Y + k * 10 + 2, X + s - 3, Y + k * 10 + 2], fill=W[3])
    for bx_ in (X + 5, X + s - 9):
        m.box(bx_, Y + 1, bx_ + 4, Y + s - 7, "dwood", 3, bevel=False)
        for k in (5, 15, 25, 35): d.point((bx_ + 2, Y + k), fill=R["iron"][3])


def _open_crate(m, X, Y, s, goods, lid="w"):
    """The lid off and leaning against the crate's side; inside, the goods in straw."""
    d = m.d; W = R["wood"]; S = R["straw"]; rng = np.random.default_rng(X * 7 + Y)
    m.shade((X + 2, Y + 3, X + s + 4, Y + s - 1), f=.55)
    m.box(X, Y, X + s, Y + s - 6, "wood", 2)
    d.rectangle([X + 4, Y + 4, X + s - 4, Y + s - 10], fill=tone(W[0], -16), outline=OUT)            # the open top: four board walls round a dark hold
    for _ in range(26):                                                          # straw packing
        x_, y_ = rng.uniform(X + 6, X + s - 6), rng.uniform(Y + 6, Y + s - 12); a = rng.uniform(0, 3.14)
        d.line([x_, y_, x_ + math.cos(a) * 5, y_ + math.sin(a) * 3], fill=S[int(rng.integers(1, 4))])
    for i in range(7):                                                           # the goods
        x_, y_ = X + 10 + (i % 3) * 11 + int(rng.integers(-1, 2)), Y + 10 + (i // 3) * 10 + int(rng.integers(-1, 2))
        if y_ > Y + s - 16: continue
        if goods == "apples":
            d.ellipse([x_ - 4, y_ - 4, x_ + 4, y_ + 4], fill=(150, 46, 38) if i % 3 else (120, 140, 52), outline=OUT); d.point((x_ - 2, y_ - 2), fill=(214, 150, 120)); d.point((x_, y_ - 4), fill=R["dwood"][1])
        else:                                                                    # earthen jars stoppered with wax
            d.ellipse([x_ - 4, y_ - 4, x_ + 4, y_ + 4], fill=R["clay"][3], outline=OUT); d.ellipse([x_ - 2, y_ - 2, x_ + 2, y_ + 2], fill=(200, 176, 96))
    if lid == "s":                                                               # the lid leant against the south side, toward the room (B6331)
        ly = Y + s - 4; m.shade((X + 4, ly + 2, X + s + 4, ly + 20), f=.6)
        d.rectangle([X + 2, ly, X + s - 2, ly + 14], fill=W[3], outline=OUT)
        for k in (1, 2, 3): d.line([X + 2 + k * 10, ly + 1, X + 2 + k * 10, ly + 13], fill=W[1])
        for bx_ in (X + 6, X + s - 10): d.rectangle([bx_, ly + 1, bx_ + 3, ly + 13], fill=R["dwood"][2], outline=OUT)
        d.line([X + 3, ly + 1, X + s - 3, ly + 1], fill=W[4]); return
    if lid == "n":                                                               # the lid leant against the north side
        ly = Y - 22; m.shade((X + 4, ly + 2, X + s + 4, ly + 22), f=.6)
        d.rectangle([X + 2, ly, X + s - 2, ly + 16], fill=W[3], outline=OUT)
        for k in (1, 2, 3): d.line([X + 2 + k * 10, ly + 1, X + 2 + k * 10, ly + 15], fill=W[1])
        for bx_ in (X + 6, X + s - 10): d.rectangle([bx_, ly + 1, bx_ + 3, ly + 15], fill=R["dwood"][2], outline=OUT)
        d.line([X + 3, ly + 1, X + s - 3, ly + 1], fill=W[4]); return
    lx = X - 26                                                                 # the lid, leaning on the west side: boards and battens
    m.shade((lx + 2, Y + 4, lx + 24, Y + s), f=.6)
    d.rectangle([lx, Y + 2, lx + 18, Y + s - 6], fill=W[3], outline=OUT)
    for k in (1, 2, 3): d.line([lx + 1, Y + 2 + k * 10, lx + 17, Y + 2 + k * 10], fill=W[1])
    for by_ in (Y + 7, Y + s - 14): d.rectangle([lx + 1, by_, lx + 17, by_ + 3], fill=R["dwood"][2], outline=OUT)
    d.line([lx + 1, Y + 3, lx + 1, Y + s - 7], fill=W[4])


def hay(m, x, y, r=26):
    """A heap of loose hay with a pitchfork stuck in it. From r 60 up, a field stack: a tall round rick built about a
    pole, its straw combed down the sides, domed and lit from the north-west, with loose hay round its foot."""
    d = m.d; cx, cy = P(x), P(y); S = R["straw"]; rng = m.rng
    if r >= 60:
        m.shade((cx - r + r * .3, cy - r + r * .38, cx + r + r * .3, cy + r + r * .38), kind="ellipse", f=.6)
        for _ in range(int(r * 1.6)):                                             # loose hay trodden round the foot
            a = rng.uniform(0, 6.28); t = r * rng.uniform(1.0, 1.22); x_, y_ = cx + math.cos(a) * t, cy + math.sin(a) * t; b = a + rng.uniform(-.6, .6)
            d.line([x_, y_, x_ + math.cos(b) * 6, y_ + math.sin(b) * 6], fill=S[rng.integers(1, 4)])
        m.dome(cx, cy, r, "straw")
        for _ in range(int(r * r * .12)):                                         # straw combed down from the crown
            a = rng.uniform(0, 6.28); t = rng.uniform(.15, .97) * r; x_, y_ = cx + math.cos(a) * t, cy + math.sin(a) * t
            lit = (x_ - cx) + (y_ - cy) < -r * .2; L_ = rng.uniform(5, 10)
            d.line([x_, y_, x_ + math.cos(a) * L_, y_ + math.sin(a) * L_], fill=S[4] if lit else S[1] if (x_ - cx) + (y_ - cy) > r * .3 else S[2])
        for k in range(3):                                                        # ropes weighted over the top
            a = k * 2.09 + .3; d.line([cx, cy, cx + math.cos(a) * r * .95, cy + math.sin(a) * r * .95], fill=R["dwood"][2], width=2)
        m.disc(cx, cy, max(6, r // 12), "dwood", 2)                               # the stack pole's top
        hx, hy = cx + r * 1.05, cy + r * .45                                      # a fork leant at the foot
        d.line([hx, hy, hx + 36, hy - 26], fill=OUT, width=3); d.line([hx, hy, hx + 36, hy - 26], fill=R["wood"][4])
        for k in (-4, 0, 4): d.line([hx + k * .6, hy + k * .8, hx - 7 + k * .6, hy + 6 + k * .8], fill=R["iron"][4])
        return
    m.shade((cx - r + 3, cy - r * .7 + 5, cx + r + 5, cy + r * .7 + 7), kind="ellipse", f=.58)
    d.ellipse([cx - r, cy - r * .7, cx + r, cy + r * .7], fill=S[1], outline=OUT); d.ellipse([cx - r + 3, cy - r * .7 + 2, cx + r - 6, cy + r * .7 - 6], fill=S[2]); d.ellipse([cx - r * .6, cy - r * .5, cx + r * .2, cy], fill=S[3])
    for _ in range(int(r * 2.4)):
        a, t = rng.uniform(0, 6.28), rng.uniform(0, 1) ** .6; x_, y_ = cx + math.cos(a) * t * r, cy + math.sin(a) * t * r * .7; b = rng.uniform(0, 3.14)
        d.line([x_, y_, x_ + math.cos(b) * 5, y_ + math.sin(b) * 3], fill=S[4] if x_ + y_ < cx + cy else S[0])
    hx, hy = cx + r * .2, cy - r * .1                                              # the fork
    d.line([hx, hy, hx + 30, hy - 22], fill=OUT, width=3); d.line([hx, hy, hx + 30, hy - 22], fill=R["wood"][4])
    for k in (-4, 0, 4): d.line([hx + k * .6, hy + k * .8, hx - 7 + k * .6, hy + 6 + k * .8], fill=R["iron"][4])


@openable
def window(m, x0, y0, x1, y1, th=26, centre=(10, 6.5), light=True, glass=True, look=None):
    """A window one can name from above: the wall cut through to a pale sill between two jambs, a lattice of bars
    across the opening, two plank shutters swung open against the outside of the wall, and daylight on the floor within.
    look: None draws the plain glazed or unglazed window above; a dict (era, wealth, style, condition, kind) draws the
    window of that age, means and land (window_kind and _window_look below)."""
    from PIL import Image, ImageDraw
    d = m.d; ax, ay, bx, by = P(x0), P(y0), P(x1), P(y1); horiz = ay == by; t = th // 2; L = (bx - ax) if horiz else (by - ay)
    out = (-1 if ay < centre[1] * T else 1) if horiz else (-1 if ax < centre[0] * T else 1)        # which way is outdoors
    def pt(u, v): return (ax + u, ay + v * out) if horiz else (ax + v * out, ay + u)
    def rect(u0, v0, u1, v1, **kw):
        (xa, ya), (xb, yb) = pt(u0, v0), pt(u1, v1); d.rectangle([min(xa, xb), min(ya, yb), max(xa, xb), max(ya, yb)], **kw)
    def poly(pts, **kw): d.polygon([pt(u, v) for u, v in pts], **kw)
    W_, Dk, I = R["wood"], R["dwood"], R["iron"]
    _opening(x0, y0, x1, y1, "shutter", centre, True)
    half = L // 2 - 1
    c_ = [pt(-L // 2 - 12, -t - 100), pt(L + L // 2 + 12, t + half + 10)]
    state = _state("window", (min(c_[0][0], c_[1][0]), min(c_[0][1], c_[1][1]), max(c_[0][0], c_[1][0]), max(c_[0][1], c_[1][1])), auto="open")
    if state is None: return
    light = light and state == "open"
    if light:                                                                    # daylight falls in a spreading patch
        box = [pt(-26, -t), pt(L + 26, -t - 96)]; xs = sorted(p[0] for p in box); ys = sorted(p[1] for p in box)
        X0, Y0, X1, Y1 = max(0, xs[0]), max(0, ys[0]), min(m.img.size[0], xs[1]), min(m.img.size[1], ys[1])
        msk = Image.new("L", (X1 - X0, Y1 - Y0), 0); md = ImageDraw.Draw(msk)
        for depth, val in ((92, 90), (62, 170), (34, 255)):
            md.polygon([(p[0] - X0, p[1] - Y0) for p in (pt(2, -t), pt(L - 2, -t), pt(L - 2 + depth * .28, -t - depth), pt(2 - depth * .28, -t - depth))], fill=val)
        a = np.array(m.img.crop((X0, Y0, X1, Y1)), np.float32); k = (np.array(msk, np.float32) / 255)[..., None]
        a = a * (1 + k * np.array([.30, .30, .22], np.float32)) + k * np.array([8, 9, 6], np.float32)
        m.img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8)), (X0, Y0))
    if look is not None and not _legacy_window(look, glass):
        return _window_look(m, pt, rect, poly, L, t, state, look, glass, ax, ay, horiz, out)
    G = [(34, 52, 72), (62, 94, 118), (104, 144, 164), (160, 196, 204), (226, 240, 240)]              # glass, dark to glint
    if not glass:                                                                # before glass reached a house: the dark of the room through the hole
        G = [(14, 10, 14), (24, 18, 22), (30, 22, 26), (36, 28, 30), (44, 34, 34)]
    Sh = R["red"]
    rect(0, -t, L, t, fill=W_[2], outline=OUT)                                   # the frame, set through the wall
    rect(1, -t + 1, L - 1, -t + 2, fill=tone(W_[4], 20)); rect(1, t - 2, L - 1, t - 1, fill=W_[1])
    rect(4, -t + 4, L - 4, t - 4, fill=G[0], outline=OUT)
    n = 3 if L > 70 else 2; pw = (L - 10) / n
    for i in range(n):                                                           # broad panes: lit corner, a slanting glint, dark far edge
        u0, u1 = int(5 + i * pw) + 1, int(5 + (i + 1) * pw) - 1; v0, v1 = -t + 5, t - 5
        rect(u0, v0, u1, v1, fill=G[1])
        poly([(u0, v0), (u1 - 4, v0), (u0, v1 - 3)], fill=G[2])
        poly([(u0, v0), (u0 + (u1 - u0) * .45, v0), (u0, v0 + (v1 - v0) * .5)], fill=G[3])
        if glass:
            (xa, ya), (xb, yb) = pt(u0 + 3, v1 - 5), pt(u0 + 3 + (v1 - v0) - 8, v0 + 3); d.line([xa, ya, xb, yb], fill=G[4], width=2)
            (xa, ya), (xb, yb) = pt(u0 + 10, v1 - 4), pt(u0 + 10 + (v1 - v0) - 12, v0 + 8); d.line([xa, ya, xb, yb], fill=G[3])
        if i: rect(u0 - 3, -t + 4, u0 - 1, t - 4, fill=W_[3], outline=OUT)       # a wooden mullion between panes
    _shutters(m, pt, rect, L, t, n, pw, state, Sh, G, ax, ay, horiz, out)


def _shutters(m, pt, rect, L, t, n, pw, state, Sh, G, ax, ay, horiz, out, glass_dark=True, bar=True, louvred=False):
    """Two shutter leaves on the outside face of the wall: shut across the window and barred (the glass behind goes
    dark), or thrown open flat along the outside wall (square to it where there is no room). Always wholly outdoors."""
    d = m.d; I = R["iron"]; half = L // 2 - 1
    SH = 12                                                                      # a shutter's depth as drawn, out from the wall face
    if state == "closed":                                                        # both leaves swung shut against the outside face of the wall, barred
        o0, o1 = t + 1, t + 1 + SH - 4
        rect(-2, o0, L + 2, o1, fill=Sh[2], outline=OUT); rect(-1, o0 + 1, L + 1, o0 + 2, fill=Sh[3])
        for k_ in range(1, 10): u = -2 + (L + 4) * k_ // 10; rect(u, o0 + 2, u, o1 - 1, fill=Sh[0])            # their planks
        rect(L // 2 - 1, o0, L // 2 + 1, o1, fill=OUT)                                                          # where the two leaves meet
        for hinge in (-2, L + 2): rect(hinge - 2, o0, hinge + 2, o0 + 4, fill=I[3], outline=OUT)                # the hinges at the frame
        if bar: rect(L // 2 - 14, o1 - 4, L // 2 + 14, o1 - 2, fill=I[3], outline=OUT); rect(L // 2 - 13, o1 - 4, L // 2 + 13, o1 - 4, fill=I[4])   # the iron bar across
        if louvred:
            for k_ in range(o0 + 2, o1 - 1, 2): rect(-1, k_, L + 1, k_, fill=Sh[3] if k_ % 4 else Sh[1])            # the slats of persiennes
        if glass_dark:
            for i in range(n):                                                                                  # the glass behind goes dark: no daylight comes in
                u0, u1 = int(5 + i * pw) + 1, int(5 + (i + 1) * pw) - 1; rect(u0, -t + 5, u1, t - 5, fill=G[0])
        return
    room = _face_room(ax, ay, L, horiz, out, t, SH)
    for (hinge, sgn), free in zip(((1, -1), (L - 1, 1)), room):
        if free >= half + 2:                                                     # thrown open flat along the outside of the wall
            (xa, ya), (xb, yb) = pt(hinge, t + 1), pt(hinge + sgn * half, t + SH + 1)
            m.shade(_outside((min(xa, xb) + 2, min(ya, yb) + 3, max(xa, xb) + 4, max(ya, yb) + 5), ax, ay, horiz, out, t), f=.58)
            rect(hinge, t + 1, hinge + sgn * half, t + SH + 1, fill=Sh[2], outline=OUT)
            rect(hinge + sgn, t + 2, hinge + sgn * (half - 1), t + 3, fill=Sh[3])
            for k_ in range(1, 5): u = hinge + sgn * half * k_ // 5; rect(u, t + 3, u, t + SH, fill=Sh[0])        # its planks
            (xa, ya), (xb, yb) = pt(hinge + sgn * 4, t + SH - 1), pt(hinge + sgn * (half - 4), t + 4); d.line([xa, ya, xb, yb], fill=Sh[1], width=2)   # the brace
            for k_ in (.2, .8): u = hinge + sgn * int(half * k_); rect(u - 1, t + 2, u + 1, t + SH, fill=I[2]); rect(u, t + 4, u, t + 4, fill=I[4])
        else:                                                                    # no room along the wall (a corner or a wall in the way): it stands open square to the wall
            a, b = hinge, hinge + sgn * 7
            (xa, ya), (xb, yb) = pt(a, t + 1), pt(b, t + half + 1)
            m.shade(_outside((min(xa, xb) + 2, min(ya, yb) + 3, max(xa, xb) + 4, max(ya, yb) + 5), ax, ay, horiz, out, t), f=.58)
            rect(a, t + 1, b, t + half + 1, fill=Sh[2], outline=OUT); rect(a + sgn, t + 2, a + sgn, t + half, fill=Sh[3])
            for k_ in (.2, .8): v = t + 1 + int(half * k_); rect(a, v - 1, b, v + 1, fill=I[2])
        rect(hinge - 2, t - 1, hinge + 2, t + 3, fill=I[3], outline=OUT)                                       # the hinge at the frame


def _outside(box, ax, ay, horiz, out, t):
    """A shutter's shadow kept on the ground outside: it never darkens the top of the wall (B6334)."""
    x0, y0, x1, y1 = box
    if horiz:
        if out < 0: y1 = min(y1, ay - t)
        else: y0 = max(y0, ay + t + 1)
    else:
        if out < 0: x1 = min(x1, ax - t)
        else: x0 = max(x0, ax + t + 1)
    return (x0, y0, x1, y1)


def _face_room(ax, ay, L, horiz, out, t, depth):
    """How far (pixels) each shutter leaf can lie flat along the outside face of its wall, from its jamb toward the
    start and toward the end of the window: to the corner where this wall's run ends, or to a wall that crosses the
    strip of ground outside. Without the scene's lines, all the room it wants."""
    if not SEGS: return (10 ** 6, 10 ** 6)
    segs = [(P(a), P(b), P(c), P(e)) for a, b, c, e in SEGS]
    line, a0, a1 = (ay, ax, ax + L) if horiz else (ax, ay, ay + L)
    def along(s): return (s[1] == s[3] and abs(s[1] - line) <= 2) if horiz else (s[0] == s[2] and abs(s[0] - line) <= 2)
    def span(s): return sorted((s[0], s[2])) if horiz else sorted((s[1], s[3]))
    lo, hi = a0, a1; grew = True
    while grew:                                                                  # the run of this wall the window is set in
        grew = False
        for s in segs:
            if not along(s): continue
            p, q = span(s)
            if p <= hi + 2 and q >= lo - 2 and (p < lo or q > hi): lo, hi = min(lo, p), max(hi, q); grew = True
    lo, hi = lo - t, hi + t                                                      # its outside face runs on round the corner post
    for o in OPENS:                                                              # a door's way stays clear; two windows share the wall between them
        sg = tuple(P(v) for v in o[:4])
        if not along(sg): continue
        p, q = span(sg)
        if q <= a0 + 1 and q > lo: lo = max(lo, q if o[4] != "shutter" else (q + a0) // 2)
        elif p >= a1 - 1 and p < hi: hi = min(hi, p if o[4] != "shutter" else (p + a1) // 2)
    v0, v1 = sorted((line + out * (t + 1), line + out * (t + depth + 2)))        # the strip of ground the open leaves lie on
    for s in segs:
        if along(s) or (s[0] == s[2]) == (s[1] == s[3]): continue
        cross = (s[0] == s[2]) if horiz else (s[1] == s[3])
        if not cross: continue
        pos = s[0] if horiz else s[1]; p, q = (sorted((s[1], s[3])) if horiz else sorted((s[0], s[2])))
        if q + t <= v0 or p - t >= v1: continue                                  # it does not reach out across the strip
        if pos < a0: lo = max(lo, pos + t)
        elif pos > a1: hi = min(hi, pos - t)
    return (a0 + 1 - lo, hi - (a1 - 1))




@openable
def door(m, x0, y0, x1, y1, th=26, centre=(10, 6.5), swing=-1, hinge="a", exterior=False, ang=38, look=None):
    """A door one can name from above: two jambs, a worn threshold, the plank leaf standing ajar on iron hinges with a
    ring handle, and the scrape its foot has worn in an arc on the floor. swing -1 opens toward the house centre.
    look: None draws that plank door; a dict (era, wealth, style, condition, kind) draws the door of that age, means
    and land: plank, iron-bound, panelled, glazed, flush, steel, sliding paper or a sealed door (door_kind below)."""
    if look is not None and _legacy_door(look, exterior): look = None
    d = m.d; ax, ay, bx, by = P(x0), P(y0), P(x1), P(y1); horiz = ay == by; t = th // 2; L = (bx - ax) if horiz else (by - ay)
    out = (-1 if ay < centre[1] * T else 1) if horiz else (-1 if ax < centre[0] * T else 1)
    def pt(u, v): return (ax + u, ay + v * out) if horiz else (ax + v * out, ay + u)
    def rect(u0, v0, u1, v1, **kw):
        (xa, ya), (xb, yb) = pt(u0, v0), pt(u1, v1); d.rectangle([min(xa, xb), min(ya, yb), max(xa, xb), max(ya, yb)], **kw)
    W_, Dk, I, S = R["wood"], R["dwood"], R["iron"], R["stone"]
    _opening(x0, y0, x1, y1, "door", centre, exterior)
    c_ = [pt(-L, -L - t), pt(2 * L, L + t)]
    box = (min(c_[0][0], c_[1][0]), min(c_[0][1], c_[1][1]), max(c_[0][0], c_[1][0]), max(c_[0][1], c_[1][1]))
    hu = 7 if hinge == "a" else L - 7; dirn = 1 if hinge == "a" else -1; ln = L - 15; hv = swing * (t - 2)
    if not CUTTING: _door_frame(m, pt, rect, L, t, exterior, hu, hv, dirn, ln, swing, look=look)
    state = _state("door", box, auto="closed")
    if state is None: return
    if look is None: _door_leaf(m, pt, rect, L, t, hinge, hu, hv, dirn, ln, swing, state, ang)
    else: _door_look(m, pt, rect, L, t, hinge, hu, hv, dirn, ln, swing, state, ang, look, exterior)


def _door_frame(m, pt, rect, L, t, exterior, hu, hv, dirn, ln, swing, look=None):
    """The doorway that stays when the leaf moves: threshold, jambs, and the arc its foot has scraped on the floor."""
    d = m.d; W_, Dk, S = R["wood"], R["dwood"], R["stone"]
    if look is not None:
        lp = _look_pal(look); Dk = lp["jamb"]; S = lp["sill"]
        if door_kind(look, exterior) in ("sliding", "sealed"):
            hu, hv = 0, 0                                                     # nothing swings: no arc on the floor
    # the threshold: stone for an outer door (with a step outside), a worn board for an inner one
    if exterior:
        rect(-4, t + 1, L + 4, t + 13, fill=S[2], outline=OUT); rect(-3, t + 2, L + 3, t + 3, fill=S[4]); rect(L // 2 - 14, t + 5, L // 2 + 14, t + 9, fill=S[3])   # the step, dished by feet
        rect(0, -t, L, t, fill=S[3], outline=OUT); rect(1, -t + 1, L - 1, -t + 2, fill=S[4]); rect(L // 2 - 16, -5, L // 2 + 16, 5, fill=tone(S[4], 12)); rect(L // 3, -t + 1, L // 3, t - 1, fill=S[1])
    else:
        rect(0, -t, L, t, fill=W_[1], outline=OUT); rect(1, -t + 1, L - 1, -t + 2, fill=W_[3]); rect(L // 2 - 16, -5, L // 2 + 16, 5, fill=W_[2])
        for v in (-6, 1, 7): rect(3, v, L - 3, v, fill=W_[0])
    for u in (0, L - 7): rect(u, -t - 2, u + 7, t + 2, fill=Dk[3], outline=OUT); rect(u + 1, -t - 1, u + 2, t + 1, fill=Dk[4])        # the jambs
    for k in (range(4, 76, 5) if (look is None or hu or hv) else ()):         # the arc its foot has scraped on the floor
        b = math.radians(k); x_, y_ = pt(hu + dirn * math.cos(b) * ln, hv + swing * math.sin(b) * ln)
        px_ = m.img.getpixel((int(max(0, min(m.img.size[0] - 1, x_))), int(max(0, min(m.img.size[1] - 1, y_)))))
        d.point((x_, y_), fill=tone(px_, 22)); d.point((x_ + 1, y_), fill=tone(px_, 22))


def _door_leaf(m, pt, rect, L, t, hinge, hu, hv, dirn, ln, swing, state, ang):
    """The leaf: shut across the gap, swung open against the wall (about 86 degrees), or ajar (ang)."""
    d = m.d; W_, Dk, I = R["wood"], R["dwood"], R["iron"]
    if state == "open": ang = 86
    a = math.radians(ang)
    def lp(s_):                                                                  # a point s_ along the leaf
        return pt(hu + dirn * math.cos(a) * s_, hv + swing * math.sin(a) * s_)
    if state == "closed":                                                         # the leaf shut in its frame: planks across the gap, straps, a handle each side
        lo, hi = 7, L - 7
        rect(lo, -5, hi, 5, fill=W_[2], outline=OUT); rect(lo + 1, -4, hi - 1, -3, fill=W_[4]); rect(lo + 1, 3, hi - 1, 4, fill=W_[1])
        for k_ in range(1, 5): u = lo + (hi - lo) * k_ // 5; rect(u, -4, u, 4, fill=W_[0])                      # joints between the planks
        for f in (.15, .85):
            u = int(hu + dirn * (hi - lo) * f) if hinge == "a" else int(hu + dirn * (hi - lo) * f)
            rect(u - 1, -6, u + 1, 6, fill=I[2]); rect(u, -6, u, -5, fill=I[4])                                # strap irons over both faces
        lu = hi - 9 if hinge == "a" else lo + 9                                                                  # the latch end
        for sg in (-1, 1):
            (rx, ry) = pt(lu, sg * 9); d.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], outline=OUT); d.ellipse([rx - 2, ry - 2, rx + 2, ry + 2], outline=I[4])
        rect(lu - 1, -6, lu + 1, 6, fill=I[3])                                                                   # the latch bar
        (hx_, hy_) = pt(hu, 0); d.rectangle([hx_ - 4, hy_ - 4, hx_ + 4, hy_ + 4], fill=I[3], outline=OUT); d.point((hx_ - 1, hy_ - 1), fill=(190, 192, 198))
        return
    (xa, ya), (xb, yb) = lp(0), lp(ln)
    d.line([xa + 2, ya + 4, xb + 2, yb + 4], fill=tone(Dk[0], -6), width=6)       # its shadow, close under it
    d.line([xa, ya, xb, yb], fill=OUT, width=9); d.line([xa, ya, xb, yb], fill=W_[3], width=7)
    nx, ny = -(yb - ya) / ln, (xb - xa) / ln                                      # across the leaf
    if nx + ny > 0: nx, ny = -nx, -ny                                             # point the normal north-west, toward the light
    d.line([xa + nx * 3, ya + ny * 3, xb + nx * 3, yb + ny * 3], fill=W_[4]); d.line([xa - nx * 3, ya - ny * 3, xb - nx * 3, yb - ny * 3], fill=W_[1])
    for f in (.25, .5, .75):                                                      # the joints between its planks
        x_, y_ = xa + (xb - xa) * f, ya + (yb - ya) * f; d.line([x_ - nx * 3, y_ - ny * 3, x_ + nx * 3, y_ + ny * 3], fill=W_[1])
    for f in (.12, .88):                                                          # iron straps wrapped over the top edge
        x_, y_ = xa + (xb - xa) * f, ya + (yb - ya) * f; d.line([x_ - nx * 4, y_ - ny * 4, x_ + nx * 4, y_ + ny * 4], fill=I[2], width=3); d.point((x_ + nx * 3, y_ + ny * 3), fill=I[4])
    hx_, hy_ = xa + (xb - xa) * .8, ya + (yb - ya) * .8                           # a ring handle standing off each face
    for sg in (-1, 1):
        rx, ry = hx_ + nx * 7 * sg, hy_ + ny * 7 * sg; d.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], outline=OUT); d.ellipse([rx - 2, ry - 2, rx + 2, ry + 2], outline=I[4])
    d.rectangle([xa - 4, ya - 4, xa + 4, ya + 4], fill=I[3], outline=OUT); d.point((xa - 1, ya - 1), fill=(190, 192, 198))                 # the hinge pin



def _open_chest(m, X0, Y0, X1, Y1, C, I, G):
    """The lid thrown back on its hinges so its painted face is seen tipped toward the wall behind, the box open below
    it: the rim of the sides, a dark inside, and folded cloth, a shawl and a little pouch to show what it keeps."""
    d = m.d; W = R["wood"]; L_ = R["linen"]; ld = 26                              # how far the leaning lid reaches back
    m.shade((X0 + 3, Y0 - ld + 2, X1 + 5, Y1 + 7), f=.55)
    d.polygon([(X0 - 2, Y0 - ld), (X1 + 2, Y0 - ld), (X1, Y0), (X0, Y0)], fill=C[1], outline=OUT)      # the lid, painted face up, foreshortened
    d.line([X0, Y0 - ld + 1, X1, Y0 - ld + 1], fill=C[3])
    d.rectangle([X0 + 6, Y0 - ld + 5, X1 - 6, Y0 - 5], outline=G[2])
    mx = (X0 + X1) // 2; my = Y0 - ld // 2
    for a in range(0, 360, 60): r_ = math.radians(a); d.ellipse([mx + math.cos(r_) * 5 - 2, my + math.sin(r_) * 3 - 1, mx + math.cos(r_) * 5 + 2, my + math.sin(r_) * 3 + 1], fill=(190, 182, 158))
    d.point((mx, my), fill=G[3])
    d.rectangle([mx - 3, Y0 - ld, mx + 3, Y0 - ld + 4], fill=I[3], outline=OUT)                     # the hasp, now at the top of the lid
    for sx in (X0 + 10, X1 - 13): d.rectangle([sx, Y0 - 3, sx + 3, Y0 + 2], fill=I[3], outline=OUT)   # the hinges at the back edge
    d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT)                         # the box: painted sides as a rim
    d.rectangle([X0 + 5, Y0 + 4, X1 - 5, Y1 - 5], fill=tone(W[0], -18), outline=OUT)                     # the dark inside
    d.line([X0 + 6, Y0 + 5, X1 - 6, Y0 + 5], fill=tone(W[0], -34)); d.line([X0 + 1, Y1 - 2, X1 - 1, Y1 - 2], fill=C[1]); d.line([X0 + 1, Y0 + 1, X1 - 1, Y0 + 1], fill=C[4])
    ix0, iy0, ix1, iy1 = X0 + 7, Y0 + 7, X1 - 7, Y1 - 7; w3 = (ix1 - ix0) // 3
    for k, (col, sh) in enumerate(((L_, 0), (R["red"] if C is not R["red"] else R["blue"], 1), (L_, 2))):   # folded cloth, its folds showing
        a0 = ix0 + k * w3 + 1; a1 = a0 + w3 - 2
        d.rectangle([a0, iy0, a1, iy1], fill=col[2 + (sh == 1)], outline=OUT)
        for yy in range(iy0 + 4, iy1 - 1, 5): d.line([a0 + 1, yy, a1 - 1, yy], fill=col[1])
        d.line([a0 + 1, iy0 + 1, a1 - 1, iy0 + 1], fill=col[4])
    px_, py_ = ix1 - 8, iy1 - 6; d.ellipse([px_ - 5, py_ - 4, px_ + 5, py_ + 4], fill=R["dwood"][3], outline=OUT); d.line([px_ - 2, py_ - 4, px_ + 1, py_ - 6], fill=R["gold"][3])   # a tied purse
    for cxp, cyp in ((X0, Y1 - 4), (X1 - 4, Y1 - 4)): d.rectangle([cxp, cyp, cxp + 4, cyp + 4], fill=I[2], outline=OUT)


@openable
def painted_chest(m, x, y, w=1.0, h=.6, paint="red"):
    """A painted dower chest: coloured lid with a border and a flower in the middle, iron hasp at the front."""
    d = m.d; X0, Y0, X1, Y1 = P(x) + 5, P(y) + 4, P(x + w) - 5, P(y + h) - 4; C = R[paint]; I = R["iron"]; G = R["gold"]
    state = _state("chest", (X0 - 12, Y0 - 34, X1 + 14, Y1 + 14))
    if state is None: return
    if state == "open":
        _open_chest(m, X0, Y0, X1, Y1, C, I, G); return
    m.shade((X0 + 3, Y0 + 4, X1 + 5, Y1 + 7), f=.55)
    d.rectangle([X0, Y0, X1, Y1], fill=C[2], outline=OUT); d.rectangle([X0 + 1, Y0 + 1, X1 - 1, Y0 + 3], fill=C[1]); d.line([X0 + 1, Y0 + 4, X1 - 1, Y0 + 4], fill=C[4])
    d.rectangle([X0 + 5, Y0 + 8, X1 - 5, Y1 - 6], outline=G[3])
    mx, my = (X0 + X1) // 2, (Y0 + Y1) // 2 + 1
    for a in range(0, 360, 60):
        r_ = math.radians(a); px_, py_ = mx + math.cos(r_) * 5, my + math.sin(r_) * 4; d.ellipse([px_ - 2, py_ - 2, px_ + 2, py_ + 2], fill=(214, 206, 180))
    d.ellipse([mx - 2, my - 2, mx + 2, my + 2], fill=G[3])
    for sx in (-1, 1): d.line([mx + sx * 9, my, mx + sx * 18, my - 2], fill=R["green"][3]); d.point((mx + sx * 16, my - 4), fill=R["green"][3]); d.point((mx + sx * 13, my + 2), fill=R["green"][3])
    d.rectangle([mx - 3, Y1 - 6, mx + 3, Y1 - 1], fill=I[3], outline=OUT)
    for cxp, cyp in ((X0, Y0), (X1 - 4, Y0), (X0, Y1 - 4), (X1 - 4, Y1 - 4)): d.rectangle([cxp, cyp, cxp + 4, cyp + 4], fill=I[2], outline=OUT)


def fleece(m, x, y, w, h):
    """A sheepskin thrown over a bench: a pale shaggy shape with curled locks and a darker rim."""
    d = m.d; X0, Y0, X1, Y1 = P(x), P(y), P(x + w), P(y + h); rng = m.rng; F = [(120, 112, 100), (166, 158, 140), (200, 194, 176), (226, 222, 206)]
    pts = [(X0 + 3, Y0 + 2), (X1 - 2, Y0 + 4), (X1 - 1, Y1 - 3), (X0 + 2, Y1 - 1)]
    d.polygon(pts, fill=F[1], outline=OUT)
    for _ in range(int((X1 - X0) * (Y1 - Y0) / 10)):
        x_, y_ = rng.uniform(X0 + 3, X1 - 3), rng.uniform(Y0 + 3, Y1 - 3); d.point((x_, y_), fill=F[3]); d.point((x_ + 1, y_ + 1), fill=F[0] if rng.random() < .4 else F[2])


def herbs(m, x0, y, x1):
    """Bunches of herbs and an onion braid hung from the beam along a wall, seen from above."""
    d = m.d; X0, X1, Y = P(x0), P(x1), P(y); rng = m.rng
    d.line([X0, Y, X1, Y], fill=R["dwood"][1], width=2)
    for i, x in enumerate(range(X0 + 8, X1 - 6, 15)):
        k = i % 4
        if k == 3:                                                                 # onions on a braid
            for j in range(4): d.ellipse([x - 3, Y + 1 + j * 5, x + 3, Y + 6 + j * 5], fill=(178, 120, 56), outline=(96, 60, 30)); d.point((x - 1, Y + 2 + j * 5), fill=(224, 176, 100))
        else:
            col = [(84, 120, 70), (176, 156, 64), (128, 92, 142)][k]                  # sage, tansy, lavender: a fan of stalks tied at the beam
            for j in range(-4, 5):
                d.line([x, Y + 2, x + j * 1.4, Y + 13 - abs(j) * .6], fill=tone(col, -30))
                d.ellipse([x + j * 1.4 - 2, Y + 11 - abs(j) * .6, x + j * 1.4 + 2, Y + 15 - abs(j) * .6], fill=col if j % 2 else tone(col, 28))
            d.rectangle([x - 2, Y + 1, x + 2, Y + 4], fill=R["straw"][3], outline=OUT)


def washline(m, x0, y0, x1, y1, cloths):
    """A line of washing between two posts: each piece hangs as a strip seen from above with its shadow on the grass."""
    d = m.d; X0, Y0, X1, Y1 = P(x0), P(y0), P(x1), P(y1)
    for px_, py_ in ((X0, Y0), (X1, Y1)): m.shade((px_ - 3, py_ - 3, px_ + 30, py_ + 12), f=.62); d.rectangle([px_ - 4, py_ - 4, px_ + 4, py_ + 4], fill=R["dwood"][3], outline=OUT); d.point((px_ - 2, py_ - 2), fill=R["dwood"][4])
    n = len(cloths); L = X1 - X0
    for i, (col, wd) in enumerate(cloths):
        cx = X0 + 14 + (L - 28) * (i + .5) / n; y = Y0 + (Y1 - Y0) * (cx - X0) / L
        C = R[col]
        m.shade((cx - wd // 2 + 8, y + 9, cx + wd // 2 + 12, y + 40), f=.55)          # the hanging cloth throws a long shadow
        d.rectangle([cx - wd // 2, y - 5, cx + wd // 2, y + 6], fill=C[3], outline=OUT); d.line([cx - wd // 2 + 1, y - 4, cx + wd // 2 - 1, y - 4], fill=C[4]); d.line([cx - wd // 2 + 1, y + 5, cx + wd // 2 - 1, y + 5], fill=C[1])
        for k in range(int(cx - wd // 2) + 4, int(cx + wd // 2) - 2, 6): d.line([k, y - 3, k + 2, y + 4], fill=C[2])          # folds where it drapes over the line
        for k in range(int(cx - wd // 2) + 5, int(cx + wd // 2), 7): d.point((k, y), fill=C[2])
    d.line([X0, Y0, X1, Y1], fill=R["straw"][2])
    for i in range(n):
        cx = X0 + 14 + (L - 28) * (i + .5) / n; y = Y0 + (Y1 - Y0) * (cx - X0) / L
        for dx in (-6, 6): d.rectangle([cx + dx - 1, y - 2, cx + dx + 1, y], fill=R["wood"][4])                 # pegs


@openable
def sack(m, x, y, r=24):
    """A grain sack: tied shut (Map.sack) or untied with its mouth rolled down over a heap of grain and the cord loose beside it."""
    cx, cy = P(x), P(y)
    state = _state("sack", (cx - 50, cy - 40, cx + 56, cy + 40))
    if state is None: return
    if state == "closed": m.sack(x, y, r); return
    d = m.d; rng = np.random.default_rng(cx + 5 * cy); C = R["linen"]; G = R["gold"]
    # stood up and opened: the bag bulges round, its mouth rolled down into a thick cuff, grain heaped inside with a scoop in it
    br = int(r * 1.05)
    m.shade((cx - br + 3, cy - br + 5, cx + br + 6, cy + br + 7), kind="ellipse", f=.6)
    d.ellipse([cx - br, cy - br, cx + br, cy + br], fill=C[1], outline=OUT)                 # the bulge of the bag below the cuff
    d.arc([cx - br + 2, cy - br + 2, cx + br - 2, cy + br - 2], 160, 290, fill=C[3], width=2)
    cr = br - 5                                                                  # the rolled cuff: lumpy, with the folds pinched in
    pts = []
    for k in range(28):
        a = k / 28 * 2 * math.pi; rr = cr + (2 if k % 2 else -1); pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=C[3], outline=OUT)
    for k in range(0, 28, 2):
        a = k / 28 * 2 * math.pi; d.line([cx + math.cos(a) * (cr - 6), cy + math.sin(a) * (cr - 6), cx + math.cos(a) * (cr + 1), cy + math.sin(a) * (cr + 1)], fill=C[1])
    d.arc([cx - cr + 2, cy - cr + 2, cx + cr - 2, cy + cr - 2], 190, 260, fill=C[4], width=2)
    gr = cr - 7; d.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=G[2], outline=tone(G[0], -10))    # the grain
    for _ in range(int(gr * gr * 1.2)):
        a, t = rng.uniform(0, 6.28), rng.uniform(0, 1) ** .5 * (gr - 2); d.point((cx + math.cos(a) * t, cy + math.sin(a) * t), fill=G[int(rng.integers(1, 5))])
    d.ellipse([cx - gr * .5, cy - gr * .6, cx + gr * .2, cy], fill=G[3]); d.point((cx - gr * .3, cy - gr * .4), fill=G[4])
    W = R["wood"]; d.ellipse([cx + 1, cy - 2, cx + 11, cy + 7], fill=W[3], outline=OUT); d.ellipse([cx + 3, cy, cx + 9, cy + 5], fill=G[3])   # a wooden scoop in the grain
    d.line([cx + 10, cy + 4, cx + 22, cy + 14], fill=OUT, width=4); d.line([cx + 10, cy + 4, cx + 22, cy + 14], fill=W[4], width=2)
    for _ in range(30):                                                          # a little spilled grain on the floor
        a, t = rng.uniform(.2, 1.6), rng.uniform(br + 2, br + 14); d.point((cx + math.cos(a) * t, cy + math.sin(a) * t), fill=G[int(rng.integers(2, 5))])
    d.line([(cx - br - 2, cy + br - 6), (cx - br + 6, cy + br + 4), (cx - br + 16, cy + br + 2)], fill=R["dwood"][1], width=2)   # the untied cord


# ---------------------------------------------------------------- doors and windows by age, means and land
# A look is a dict: era (a census era key, or year), wealth (0 destitute to 5 princely), style (a census style family),
# condition (new, worn, broken) and, to choose one outright, kind. Without a look a door is the plank door and a
# window the glazed or unglazed casement above, as every map drew them before.
ERAS_ = ["dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "great-war", "mid-century", "modern", "future-darkness"]
DOOR_KINDS = ("plank", "ironbound", "panelled", "glazed", "flush", "steel", "sliding", "sealed")
WINDOW_KINDS = ("open", "cloth", "horn", "leaded", "glazed", "sash", "steel", "plate", "paper", "jali", "sealed")
# each land's door and shutter paint, and the stone of its door frames (base colours, toned to the map's palette)
_PAINT = {"central": (54, 92, 60), "atlantic": (36, 48, 92), "northern": (118, 36, 30), "mediterranean": (40, 98, 104), "islamic": (34, 108, 112),
          "steppe": (176, 84, 34), "southasia": (116, 74, 40), "eastasia": (154, 34, 28), "seasia": (122, 86, 50), "africa": (70, 44, 30),
          "americas": (48, 112, 130), "oceania": (98, 64, 40), "polar": (122, 118, 110)}
_FRAME = {"central": (138, 134, 126), "atlantic": (112, 108, 104), "northern": (94, 96, 108), "mediterranean": (200, 190, 168), "islamic": (192, 160, 112),
          "steppe": (140, 120, 100), "southasia": (172, 100, 76), "eastasia": (106, 112, 110), "seasia": (138, 128, 106), "africa": (160, 90, 56),
          "americas": (184, 134, 102), "oceania": (100, 94, 88), "polar": (138, 140, 148)}


def _era_i(look):
    e = look.get("era", "dark-ages")
    if isinstance(e, int):
        for k, y in enumerate((1197, 1347, 1450, 1601, 1837, 1902, 1919, 1990, 2010)):
            if e >= y: i = k
        return i
    return ERAS_.index(e) if e in ERAS_ else 0


def _rmp(base, step=16):
    """Five tones of a colour, dark to light (cool darks, warm lights), dimmed to the World of Darkness palette."""
    from px import WOD
    k = .72 if WOD else 1.0; base = tuple(c * k for c in base)
    return [tuple(int(max(0, min(255, base[i] + j * step + (6, 2, -6)[i] * j * (1 if j > 0 else .5)))) for i in range(3)) for j in (-2, -1, 0, 1, 2)]


STEEL_DOOR_PAINT = ((62, 92, 70), (52, 72, 108), (110, 52, 40), (44, 44, 48), (150, 152, 150))   # green, blue, oxide red, black, grey


def _look_pal(look):
    """The colours of a door or window of this look: wood, paint, iron or brass, the jambs, the sill, the shutters."""
    st = look.get("style") or "central"; w = look.get("wealth"); w = 2 if w is None else w; e = _era_i(look); cond = look.get("condition") or "new"
    f = {"worn": .25, "broken": .35}.get(cond, 0)
    fade = lambda c: tuple(int(c[i] + ((120, 112, 104)[i] - c[i]) * f) for i in range(3))
    paint = _PAINT.get(st, _PAINT["central"]); wood = (140, 104, 64) if st not in ("africa", "southasia", "seasia", "oceania") else (112, 72, 44)
    if w <= 1: paint = tuple(int(paint[i] * .5 + (110, 100, 88)[i] * .5) for i in range(3)); wood = (118, 100, 80)
    stone = _FRAME.get(st, _FRAME["central"])
    leaf = _rmp(fade(paint if (w >= 2 and e >= 2) or w >= 4 else wood), 18)
    jamb = _rmp(fade(stone), 14) if (w >= 3 or e >= 4) else R["dwood"]
    sh = _rmp(fade(paint if w >= 1 else wood), 18)
    return {"leaf": leaf, "wood": _rmp(fade(wood), 16), "jamb": jamb, "sill": _rmp(fade(stone), 14), "shut": sh,
            "metal": _rmp((190, 150, 70), 20) if w >= 4 else R["iron"], "w": w, "e": e, "st": st, "cond": cond}


def door_kind(look, exterior=False):
    """The door a household of this age, means and land hangs: plank and iron-bound doors to the Renaissance, panelled
    doors from the Renaissance for the comfortable and from the Victorian age for most, glazed doors for the
    comfortable from the Great War, flush doors inside and steel doors outside from the Mid-Century, sliding paper
    doors in East Asia, sealed doors in Future Darkness."""
    if look.get("kind"): return look["kind"]
    e = _era_i(look); w = look.get("wealth"); w = 2 if w is None else w; st = look.get("style")
    if e >= 8: return "sealed" if w >= 2 else "steel"
    if st == "eastasia" and not exterior and e <= 7: return "sliding"
    if e <= 1: return "ironbound" if (w >= 4 or (exterior and e == 1 and w >= 3)) else "plank"
    if e <= 3: return "panelled" if w >= 3 else ("ironbound" if exterior and w >= 2 else "plank")
    if e <= 5: return ("glazed" if (e == 5 and exterior and w >= 4) else "panelled") if w >= 2 else "plank"
    if e == 6: return ("glazed" if w >= 3 else "panelled") if exterior else ("flush" if w >= 1 else "plank")
    return ("steel" if w <= 2 else "glazed") if exterior else "flush"


def window_kind(look, glass=True):
    """The window of this age, means and land: an open hole with shutters, oiled cloth or horn, leaded quarries,
    glazed casements, sashes, steel frames, plate glass, a paper lattice in East Asia, a pierced jali or mashrabiya
    screen in the Islamic lands and South Asia, a sealed pane in Future Darkness."""
    if look.get("kind"): return look["kind"]
    e = _era_i(look); w = look.get("wealth"); w = 2 if w is None else w; st = look.get("style")
    if e >= 8: return "sealed"
    if st == "eastasia" and e <= 6: return "paper"
    if st in ("islamic", "southasia") and e <= 5: return "jali" if w >= 2 else "open"
    if e <= 1: return ("leaded" if w >= 5 else "horn" if w >= 4 else "cloth" if w >= 2 else "open") if look.get("wealth") is not None else ("glazed" if glass else "open")
    if e == 2: return "leaded" if w >= 3 else ("cloth" if w >= 1 else "open")
    if e == 3: return ("sash" if st in ("atlantic", "americas", "oceania") else "glazed") if w >= 3 else ("leaded" if w >= 1 else "cloth")
    if e <= 5: return ("plate" if (e == 5 and w >= 5) else "sash" if st in ("atlantic", "americas", "oceania", "africa") else "glazed") if w >= 1 else "glazed"
    if e == 6: return "plate" if w >= 4 else ("steel" if st in ("atlantic", "central", "northern", "americas") else "glazed")
    return "plate" if w >= 2 else "glazed"


def _legacy_door(look, exterior):
    return door_kind(look, exterior) == "plank" and not look.get("style") and look.get("wealth") is None and (look.get("condition") or "new") == "new"


def _legacy_window(look, glass):
    return window_kind(look, glass) == ("glazed" if glass else "open") and not look.get("style") and look.get("wealth") is None and (look.get("condition") or "new") == "new"


def _door_look(m, pt, rect, L, t, hinge, hu, hv, dirn, ln, swing, state, ang, look, exterior):
    """The leaf of a door of this look, shut across the gap or swung back on its hinges (a sliding door slides along
    the inner face; a sealed door draws back into the wall). Seen from above a leaf is its top edge: the kind shows in
    its colour and thickness, its joints, its straps, studs, glass or paper, and its handle."""
    d = m.d; P_ = _look_pal(look); kind = door_kind(look, exterior); I = R["iron"]; M = P_["metal"]
    C = {"plank": P_["wood"], "ironbound": _rmp((96, 70, 50), 14), "flush": P_["leaf"], "steel": _rmp((120, 126, 132), 14),
         "sealed": _rmp((60, 66, 78), 12), "sliding": _rmp((130, 96, 60), 14)}.get(kind, P_["leaf"])
    if kind == "steel" and P_["w"] >= 2: C = _rmp(STEEL_DOOR_PAINT[(P_["w"] + _era_i(look)) % len(STEEL_DOOR_PAINT)], 14)   # factory paint, the same the world over
    G = [(34, 52, 72), (62, 94, 118), (104, 144, 164), (160, 196, 204), (226, 240, 240)]
    PAPER = [(150, 146, 136), (184, 180, 168), (214, 210, 196), (230, 228, 216), (244, 242, 232)]
    LIT = [(40, 120, 140), (70, 190, 210), (150, 240, 250)]
    broken = P_["cond"] == "broken"; worn = P_["cond"] == "worn"
    lo, hi = 7, L - 7; th_ = {"ironbound": 6, "panelled": 5, "glazed": 5, "flush": 4, "steel": 4, "sliding": 3, "sealed": 5}.get(kind, 5)
    if kind in ("sliding", "sealed"):
        if state == "open" and kind == "sealed":                                   # drawn back into the wall: only its lit edge at the jamb
            rect(lo - 2, -th_, lo, th_, fill=C[2], outline=OUT); rect(lo, -1, lo, 1, fill=LIT[2])
            for u in (lo, hi): rect(u - 1, -t + 2, u, t - 2, fill=LIT[1])
            return
        if state == "open": a0, a1, v0 = -(hi - lo) + 4, 4, -t - 1 - 2 * th_      # slid along the inner face of the wall beside the opening
        else: a0, a1, v0 = lo, hi, -th_
        rect(a0, v0, a1, v0 + 2 * th_, fill=C[2], outline=OUT)
        if kind == "sliding":
            rect(a0 + 2, v0 + 1, a1 - 2, v0 + 2 * th_ - 1, fill=PAPER[3])
            for u in range(a0 + 8, a1 - 2, 8): rect(u, v0 + 1, u, v0 + 2 * th_ - 1, fill=C[1])   # the lattice over the paper
            rect(a1 - 8, v0 + 1, a1 - 6, v0 + 2 * th_ - 1, fill=C[0])                            # the finger pull
            if broken: rect((a0 + a1) // 2 - 4, v0 + 1, (a0 + a1) // 2 + 3, v0 + 2 * th_ - 1, fill=(20, 16, 18))
        else:
            rect(a0 + 2, -1, a1 - 2, 1, fill=LIT[1]); rect((a0 + a1) // 2 - 2, -th_ + 1, (a0 + a1) // 2 + 2, th_ - 1, fill=LIT[2] if not broken else (150, 30, 30))
        return
    if state == "closed":
        rect(lo, -th_, hi, th_, fill=C[2], outline=OUT); rect(lo + 1, -th_ + 1, hi - 1, -th_ + 2, fill=C[4]); rect(lo + 1, th_ - 2, hi - 1, th_ - 1, fill=C[1])
        if kind in ("plank", "ironbound"):
            for k_ in range(1, 5 if kind == "plank" else 6): u = lo + (hi - lo) * k_ // (5 if kind == "plank" else 6); rect(u, -th_ + 1, u, th_ - 1, fill=C[0])
            for f in ((.15, .85) if kind == "plank" else (.12, .5, .88)):
                u = int(hu + dirn * (hi - lo) * f); rect(u - 1, -th_ - 1, u + 1, th_ + 1, fill=I[2]); rect(u, -th_ - 1, u, -th_, fill=I[4])
            if kind == "ironbound":
                for u in range(lo + 4, hi - 2, 6): rect(u, -th_ + 2, u + 1, -th_ + 3, fill=I[4]); rect(u, th_ - 3, u + 1, th_ - 2, fill=I[4])   # the nail heads
        elif kind == "panelled":
            for u0_, u1_ in ((lo + 4, (lo + hi) // 2 - 2), ((lo + hi) // 2 + 2, hi - 4)): rect(u0_, -2, u1_, 1, fill=C[3]); rect(u0_, 1, u1_, 1, fill=C[0])   # the fielded panels
        elif kind == "glazed":
            rect(lo + 6, -2, hi - 6, 2, fill=G[1]); rect(lo + 8, -1, lo + 16, -1, fill=G[4])
            for u in range(lo + 6 + (hi - lo - 12) // 3, hi - 6, (hi - lo - 12) // 3 or 1): rect(u, -2, u, 2, fill=C[3])
            if broken: rect((lo + hi) // 2 - 6, -2, (lo + hi) // 2 + 4, 2, fill=(14, 12, 16))
        elif kind == "steel":
            for u in (lo + 3, hi - 3): rect(u, -th_ + 2, u, th_ - 2, fill=C[4])
            rect((lo + hi) // 2, -1, (lo + hi) // 2 + 1, 0, fill=OUT)                                 # the spy hole
        lu = hi - 9 if hinge == "a" else lo + 9
        if kind in ("plank", "ironbound"):
            for sg in (-1, 1):
                (rx, ry) = pt(lu, sg * (th_ + 4)); d.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], outline=OUT); d.ellipse([rx - 2, ry - 2, rx + 2, ry + 2], outline=I[4] if P_["w"] < 4 else M[3])
            rect(lu - 1, -th_ - 1, lu + 1, th_ + 1, fill=I[3])
        else:                                                                       # a knob or a lever each side
            H = M if kind in ("panelled", "glazed") else _rmp((180, 184, 190), 14)
            for sg in (-1, 1):
                if kind in ("panelled", "glazed"): rect(lu - 2, sg * (th_ + 1) - 1, lu + 2, sg * (th_ + 1) + 2 * sg, fill=H[3], outline=OUT)
                else: rect(lu - 6 * (1 if hinge == "a" else -1), sg * (th_ + 1), lu, sg * (th_ + 2), fill=H[3], outline=OUT)
        (hx_, hy_) = pt(hu, 0); d.rectangle([hx_ - 3, hy_ - 3, hx_ + 3, hy_ + 3], fill=I[3] if kind in ("plank", "ironbound") else M[2], outline=OUT)
        if worn: rect(lo + 3, th_ - 2, lo + 12, th_ - 1, fill=C[4]); rect(hi - 14, -th_ + 1, hi - 6, -th_ + 1, fill=C[0])
        if broken and kind != "glazed": rect((lo + hi) // 2 - 3, -th_, (lo + hi) // 2 + 2, th_, fill=(18, 14, 16))   # a panel stove in
        return
    if state == "open": ang = 86
    if broken: ang = min(ang, 60)                                                   # hanging off one hinge, stuck part open
    a = math.radians(ang)
    def lp(s_): return pt(hu + dirn * math.cos(a) * s_, hv + swing * math.sin(a) * s_)
    (xa, ya), (xb, yb) = lp(0), lp(ln)
    w_ = 2 * th_ - 1
    d.line([xa + 2, ya + 4, xb + 2, yb + 4], fill=tone(R["dwood"][0], -6), width=w_ - 2)
    d.line([xa, ya, xb, yb], fill=OUT, width=w_ + 2); d.line([xa, ya, xb, yb], fill=C[3], width=w_)
    nx, ny = -(yb - ya) / ln, (xb - xa) / ln
    if nx + ny > 0: nx, ny = -nx, -ny
    q = th_ - 2
    d.line([xa + nx * q, ya + ny * q, xb + nx * q, yb + ny * q], fill=C[4]); d.line([xa - nx * q, ya - ny * q, xb - nx * q, yb - ny * q], fill=C[1])
    def at(f): return xa + (xb - xa) * f, ya + (yb - ya) * f
    if kind in ("plank", "ironbound"):
        for f in (.25, .5, .75): x_, y_ = at(f); d.line([x_ - nx * q, y_ - ny * q, x_ + nx * q, y_ + ny * q], fill=C[1])
        for f in ((.12, .88) if kind == "plank" else (.1, .5, .9)):
            x_, y_ = at(f); d.line([x_ - nx * (q + 1), y_ - ny * (q + 1), x_ + nx * (q + 1), y_ + ny * (q + 1)], fill=I[2], width=3)
        if kind == "ironbound":
            for f in np.linspace(.15, .85, 8): x_, y_ = at(f); d.point((x_ + nx * (q - 1), y_ + ny * (q - 1)), fill=I[4])
    elif kind == "panelled":
        for f0, f1 in ((.12, .46), (.54, .88)): (p0, p1), (p2, p3) = at(f0), at(f1); d.line([p0, p1, p2, p3], fill=C[1], width=2)
    elif kind == "glazed":
        (p0, p1), (p2, p3) = at(.15), at(.85); d.line([p0, p1, p2, p3], fill=G[1], width=3); d.line([p0 + nx, p1 + ny, p0 + (p2 - p0) * .3 + nx, p1 + (p3 - p1) * .3 + ny], fill=G[4])
    elif kind == "steel":
        for f in (.06, .94): x_, y_ = at(f); d.point((x_, y_), fill=C[4])
    hx_, hy_ = at(.8)
    for sg in (-1, 1):
        rx, ry = hx_ + nx * (th_ + 3) * sg, hy_ + ny * (th_ + 3) * sg
        if kind in ("plank", "ironbound"): d.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], outline=OUT); d.ellipse([rx - 2, ry - 2, rx + 2, ry + 2], outline=I[4] if P_["w"] < 4 else M[3])
        else: d.rectangle([rx - 2, ry - 2, rx + 2, ry + 2], fill=(M if kind in ("panelled", "glazed") else _rmp((180, 184, 190), 14))[3], outline=OUT)
    d.rectangle([xa - 3, ya - 3, xa + 3, ya + 3], fill=I[3], outline=OUT)
    if broken and kind in ("panelled", "plank", "flush"): x_, y_ = at(.5); d.line([x_ - nx * q, y_ - ny * q, x_ + nx * q, y_ + ny * q], fill=(18, 14, 16), width=3)


def _window_look(m, pt, rect, poly, L, t, state, look, glass, ax, ay, horiz, out):
    """A window of this look in its wall: the frame at the wall's thickness, what fills the opening (oiled cloth, horn
    leaves, leaded quarries, casement panes, sashes, a steel grid, one sheet of plate glass, a paper lattice, a pierced
    screen, a sealed pane) and how it shuts: shutters folded back on the outside wall or barred across it (louvred in
    the Mediterranean), or, for windows without shutters, a blind or curtain drawn across inside the glass."""
    d = m.d; P_ = _look_pal(look); kind = window_kind(look, glass); e = P_["e"]
    G = [(34, 52, 72), (62, 94, 118), (104, 144, 164), (160, 196, 204), (226, 240, 240)]
    DARK = [(14, 10, 14), (24, 18, 22), (30, 22, 26), (36, 28, 30), (44, 34, 34)]
    broken = P_["cond"] == "broken"; worn = P_["cond"] == "worn"
    Fr = {"sash": _rmp((206, 202, 190), 12), "plate": _rmp((200, 200, 196), 10) if e >= 7 else P_["leaf"], "steel": _rmp((58, 60, 66), 12),
          "sealed": _rmp((60, 66, 78), 12), "paper": _rmp((130, 96, 60), 14), "jali": P_["sill"] if P_["w"] >= 4 else P_["wood"]}.get(kind, P_["wood"] if P_["w"] < 3 else P_["leaf"])
    if worn: Fr = [tuple(int(c * .85 + 20) for c in x) for x in Fr]
    rect(0, -t, L, t, fill=Fr[2], outline=OUT)                                    # the frame, set through the wall
    rect(1, -t + 1, L - 1, -t + 2, fill=Fr[4]); rect(1, t - 2, L - 1, t - 1, fill=Fr[1])
    v0, v1 = -t + 4, t - 4; u0, u1 = 4, L - 4
    rect(u0, v0, u1, v1, fill=G[0] if kind not in ("open", "jali") else DARK[1], outline=OUT)
    shut = kind in ("open", "cloth", "horn", "leaded", "glazed", "jali", "paper") or (kind == "sash" and P_["st"] not in ("atlantic", "americas", "oceania", "africa"))
    if kind == "steel" and P_["st"] in ("central", "mediterranean"): shut = True
    n = 3 if L > 70 else 2; pw = (L - 10) / n
    def panes(fill_fn):
        for i in range(n):
            a0, a1 = int(5 + i * pw) + 1, int(5 + (i + 1) * pw) - 1; fill_fn(i, a0, a1)
            if i: rect(a0 - 3, v0, a0 - 1, v1, fill=Fr[3], outline=OUT)
    if kind == "open":
        panes(lambda i, a0, a1: rect(a0, v0 + 1, a1, v1 - 1, fill=DARK[2 + i % 2]))
        for u in range(u0 + 6, u1, 10): rect(u, v0, u + 1, v1, fill=P_["wood"][1])            # the bars across the hole
    elif kind == "cloth":
        CL = _rmp((206, 186, 130), 12)
        panes(lambda i, a0, a1: (rect(a0, v0 + 1, a1, v1 - 1, fill=CL[2 + (i % 2)]), rect(a0, (v0 + v1) // 2, a1, (v0 + v1) // 2, fill=CL[1])))
    elif kind == "horn":
        HN = _rmp((196, 150, 76), 14)
        def hp(i, a0, a1):
            rect(a0, v0 + 1, a1, v1 - 1, fill=HN[2])
            for u in range(a0 + 6, a1, 6): rect(u, v0 + 1, u, v1 - 1, fill=HN[0])
            rect(a0 + 1, v0 + 1, a0 + 3, v0 + 2, fill=HN[4])
        panes(hp)
    elif kind == "leaded":
        LG = [(56, 82, 74), (80, 114, 100), (120, 152, 134), (170, 196, 176), (226, 236, 220)]
        def lq(i, a0, a1):
            rect(a0, v0 + 1, a1, v1 - 1, fill=LG[1 + (i % 2)])
            for u in range(a0 - 6, a1, 6):                                            # the diamond quarries in their leads
                (xa, ya), (xb, yb) = pt(max(a0, u), v0 + 1 + max(0, a0 - u)), pt(min(a1, u + (v1 - v0) - 2), min(v1 - 1, v0 + 1 + (min(a1, u + v1 - v0 - 2) - u)))
                d.line([xa, ya, xb, yb], fill=(40, 40, 46))
            rect(a0 + 2, v0 + 2, a0 + 4, v0 + 2, fill=LG[4])
        panes(lq)
    elif kind in ("glazed", "sash", "steel", "plate", "sealed"):
        def gp(i, a0, a1):
            rect(a0, v0 + 1, a1, v1 - 1, fill=G[1] if kind != "sealed" else (24, 34, 46))
            poly([(a0, v0 + 1), (a1 - 4, v0 + 1), (a0, v1 - 3)], fill=G[2] if kind != "sealed" else (40, 56, 70))
            (xa, ya), (xb, yb) = pt(a0 + 3, v1 - 3), pt(a0 + 3 + (v1 - v0) - 6, v0 + 3); d.line([xa, ya, xb, yb], fill=G[4], width=2)
            if kind == "sash": rect(a0, (v0 + v1) // 2, a1, (v0 + v1) // 2 + 1, fill=Fr[3]); rect((a0 + a1) // 2, v0 + 1, (a0 + a1) // 2, v1 - 1, fill=Fr[3])   # meeting rail and glazing bars
            if kind == "steel":
                for u in range(a0 + 5, a1, 6): rect(u, v0 + 1, u, v1 - 1, fill=Fr[3])
        if kind in ("plate", "sealed"):
            n_, pw_ = 1, L - 10
            rect(5, v0 + 1, L - 5, v1 - 1, fill=G[1] if kind == "plate" else (24, 34, 46))
            poly([(5, v0 + 1), (L * .6, v0 + 1), (5, v1 - 2)], fill=G[2] if kind == "plate" else (40, 56, 70))
            (xa, ya), (xb, yb) = pt(10, v1 - 3), pt(10 + (v1 - v0) - 6, v0 + 3); d.line([xa, ya, xb, yb], fill=G[4], width=2)
            (xa, ya), (xb, yb) = pt(20, v1 - 2), pt(20 + (v1 - v0) - 8, v0 + 4); d.line([xa, ya, xb, yb], fill=G[3])
            if kind == "sealed": rect(2, -t + 2, L - 2, -t + 2, fill=(70, 190, 210)); rect(2, t - 2, L - 2, t - 2, fill=(70, 190, 210))
        else: panes(gp)
    elif kind == "paper":
        PAPER = [(150, 146, 136), (184, 180, 168), (214, 210, 196), (230, 228, 216), (244, 242, 232)]
        rect(u0, v0, u1, v1, fill=PAPER[3], outline=OUT)
        for u in range(u0 + 7, u1, 7): rect(u, v0, u, v1, fill=Fr[1])
        rect(u0, (v0 + v1) // 2, u1, (v0 + v1) // 2, fill=Fr[1])
    elif kind == "jali":                                                              # a pierced screen: a lattice of small openings
        S = Fr
        rect(u0, v0, u1, v1, fill=S[2], outline=OUT)
        for u in range(u0 + 3, u1 - 2, 5):
            for v in range(v0 + 2, v1 - 1, 4): rect(u, v, u + 2, v + 1, fill=DARK[1])
    if broken:                                                                        # a pane out, the cracks round it
        a0 = int(5 + pw) + 2 if kind not in ("plate", "sealed") else L // 3
        rect(a0, v0 + 1, a0 + 9, v1 - 1, fill=DARK[0])
        (xa, ya), (xb, yb) = pt(a0 + 9, v0 + 2), pt(a0 + 16, v1 - 2); d.line([xa, ya, xb, yb], fill=G[4])
    if shut:
        Sh = P_["shut"]
        _shutters(m, pt, rect, L, t, n, pw, state, Sh, G, ax, ay, horiz, out, glass_dark=kind not in ("open", "jali"), bar=e <= 4, louvred=P_["st"] == "mediterranean" and e >= 3)
        if state == "closed" and kind in ("open", "jali", "paper", "cloth", "horn"): rect(u0 + 1, v0 + 1, u1 - 1, v1 - 1, fill=DARK[1])
        return
    if state == "closed":                                                             # no shutters: a blind or curtain drawn inside the glass
        B = _rmp({"sealed": (50, 56, 66)}.get(kind, _PAINT.get(P_["st"], (120, 100, 80))), 14) if kind != "sash" else _rmp((170, 156, 120), 12)
        rect(u0 + 1, v0 + 1, u1 - 1, -1, fill=B[2])
        for u in range(u0 + 3, u1 - 1, 4): rect(u, v0 + 1, u, -1, fill=B[0] if kind != "plate" or e < 7 else B[3])
        if kind == "sealed": rect(u0 + 1, -1, u1 - 1, -1, fill=(70, 190, 210))
    elif kind == "sash":                                                              # the lower sash run up: an open gap
        rect(u0 + 2, v0 + 1, u1 - 2, v0 + 2, fill=DARK[0])
