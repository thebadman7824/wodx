"""Checks run on every map drawn from the object library, before it is written (B6334). Each returns a line a person
can act on. Recorder.finish() stops the map when any fail.

  wall      an object's pixels lie in a wall (or a door or window frame)
  shutter   a window's shutters, open or shut, lie in a wall or on another object
  door      an object stands in a doorway or where a door leaf swings
  facing    an object's front (an oven's mouth, a bed's foot, a chest's lock) faces a wall or is blocked
  against   an object made to stand against a wall is not against one
  overlap   two objects stand in each other
  bare      a room has too few things in it to look lived in
(Size and year are checked when the object is placed: put() refuses a size or a year outside the object's own.)"""
from collections import deque

import numpy as np

from px import T
from library.core import FT

BARE_MIN_COVER = .10             # at least a tenth of a room's floor under things
BARE_PER_SQ = 1 / 4.5            # and about one thing to every 4 1/2 square squares, at least 3
CELL = 6


SEATS = {"chair", "stool", "bench", "barstool", "armchair", "sofa", "cushion", "lordchair", "officechair", "rocking", "settle", "priedieu", "candlestand", "mat"}
SEATED_AT = {"table", "table-small", "table-round", "table-low", "dininglong", "desk", "counter", "bar", "cardtable", "coffeetable", "writingslope", "fireplace",
             "altar", "workbench", "labbench", "dressingtable", "pooltable"}


def _wall_raster(rec, shape):
    H, W = shape; ras = np.zeros(shape, bool)
    for (x0, y0, x1, y1), th in zip(rec.walls, rec.wall_th or [26] * len(rec.walls)):
        t = th // 2; ax, ay, bx, by = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T)
        ras[max(0, min(ay, by) - t):max(ay, by) + t, max(0, min(ax, bx) - t):max(ax, bx) + t] = True
    return ras


def _span(o, th):
    """The frame zone of a door or window: its opening in the wall, the wall's thickness plus a little."""
    x0, y0, x1, y1 = o["opening"]["c"]; t = th // 2 + 3
    ax, ay, bx, by = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T)
    return (min(ax, bx) - (12 if ay == by else t), min(ay, by) - (t if ay == by else 12), max(ax, bx) + (12 if ay == by else t), max(ay, by) + (t if ay == by else 12))


def _state_masks(rec, o):
    """Draw an openable in each state on the finished map, keep the pixels it changed, put the map back."""
    img = rec.m.img; W, H = img.size
    x0, y0, x1, y1 = max(0, o["box"][0]), max(0, o["box"][1]), min(W, o["box"][2]), min(H, o["box"][3])
    keep = img.crop((x0, y0, x1, y1)); base = np.asarray(keep.convert("RGB")).astype(int); out = {}
    for st in ("closed", "open"):
        o["draw"](state=st); a = np.asarray(img.crop((x0, y0, x1, y1)).convert("RGB")).astype(int)
        out[st] = ((np.abs(a - base).sum(2) > 40), x0, y0); img.paste(keep, (x0, y0))
    return out


def _paint(dst, mask, ox, oy):
    H, W = dst.shape; h, w = mask.shape
    sy, sx = max(0, -oy), max(0, -ox); ey, ex = min(h, H - oy), min(w, W - ox)
    if ey > sy and ex > sx: dst[oy + sy:oy + ey, ox + sx:ox + ex] |= mask[sy:ey, sx:ex]


def _hits(ras, mask, ox, oy):
    H, W = ras.shape; h, w = mask.shape
    sy, sx = max(0, -oy), max(0, -ox); ey, ex = min(h, H - oy), min(w, W - ox)
    if ey <= sy or ex <= sx: return 0
    return int((ras[oy + sy:oy + ey, ox + sx:ox + ex] & mask[sy:ey, sx:ex]).sum())


def _rect_mask(shape, r):
    m = np.zeros(shape, bool); x0, y0, x1, y1 = (int(v) for v in r)
    m[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = True; return m


def _front_zone(p, depth_px, gap=3):
    """The strip in front of an object (pixels), its full width, `depth_px` deep."""
    X0, Y0, X1, Y1 = p.x * T, p.y * T, (p.x + p.w) * T, (p.y + p.h) * T; k = .12
    if p.face == "s": return (X0 + (X1 - X0) * k, Y1 + gap, X1 - (X1 - X0) * k, Y1 + gap + depth_px)
    if p.face == "n": return (X0 + (X1 - X0) * k, Y0 - gap - depth_px, X1 - (X1 - X0) * k, Y0 - gap)
    if p.face == "e": return (X1 + gap, Y0 + (Y1 - Y0) * k, X1 + gap + depth_px, Y1 - (Y1 - Y0) * k)
    return (X0 - gap - depth_px, Y0 + (Y1 - Y0) * k, X0 - gap, Y1 - (Y1 - Y0) * k)


def _back_zone(p, depth_px):
    o = {"s": "n", "n": "s", "e": "w", "w": "e"}[p.face]
    class Q: pass
    q = Q(); q.x, q.y, q.w, q.h, q.face = p.x, p.y, p.w, p.h, o
    return _front_zone(q, depth_px, gap=1)


def _where(p): return f"{p.name} ({p.spec.id}) at {p.x:.2f}, {p.y:.2f}"


def rooms(block, min_area_sq=2.0):
    """Closed rooms: areas fenced by walls and openings that do not reach the map's edge. Returns label grid and ids."""
    H, W = block.shape; gh, gw = H // CELL, W // CELL
    g = block[:gh * CELL, :gw * CELL].reshape(gh, CELL, gw, CELL).any((1, 3))
    lab = np.zeros((gh, gw), np.int32); out = []; n = 0
    for i0 in range(gh):
        for j0 in range(gw):
            if g[i0, j0] or lab[i0, j0]: continue
            n += 1; q = deque([(i0, j0)]); lab[i0, j0] = n; cnt = 0; edge = False
            while q:
                i, j = q.popleft(); cnt += 1
                if i in (0, gh - 1) or j in (0, gw - 1): edge = True
                for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                    if 0 <= a < gh and 0 <= b < gw and not g[a, b] and not lab[a, b]: lab[a, b] = n; q.append((a, b))
            if not edge and cnt * CELL * CELL / (T * T) >= min_area_sq: out.append(n)
    return lab, out


def run(rec, bare=True):
    m = rec.m; W, H = m.img.size; shape = (H, W); bad = []
    walls = _wall_raster(rec, shape)
    opens = [o for o in rec.things if o.get("opening")]
    from library.core import wall_th
    spans = []
    for o in opens:
        c = o["opening"]["c"]; spans.append((o, _span(o, wall_th(rec, tuple(c)))))
    framed = walls.copy()
    for o, s in spans: framed |= _rect_mask(shape, s)
    things = [p for p in rec.placed if p.spec.mount != "opening"]
    solid = [p for p in things if not p.spec.low and p.on is None]

    # wall
    for p in things:
        for st, (mk, ox, oy) in p.masks.items():
            n = _hits(framed, mk, ox, oy)
            if n > 6: bad.append(f"wall: {_where(p)} has {n} px in a wall or a door or window frame" + (f" when {st}" if st != "one" else "")); break

    # doors and windows
    body = np.zeros(shape, bool)
    for p in solid: _paint(body, *p.masks[p.spec.states[0]])
    for o, s in spans:
        own = _rect_mask(shape, s); others = walls & ~own
        sm = _state_masks(rec, o); kind = o["opening"]["kind"]
        for st, (mk, ox, oy) in sm.items():
            mk = mk & ~own[oy:oy + mk.shape[0], ox:ox + mk.shape[1]]
            if kind == "shutter":                                    # only what lies outdoors: the daylight let in is not a shutter
                c = o["opening"]["c"]; inside = o["opening"]["inside"]; yy, xx = np.mgrid[oy:oy + mk.shape[0], ox:ox + mk.shape[1]]
                if abs(c[1] - c[3]) < 1e-6: mk = mk & ((yy < c[1] * T) if inside[1] > c[1] else (yy > c[1] * T))
                else: mk = mk & ((xx < c[0] * T) if inside[0] > c[0] else (xx > c[0] * T))
            if kind == "shutter":
                n = _hits(others, mk, ox, oy)
                if n > 6: bad.append(f"shutter: {o['label']} ({o['id']}) has {n} px of its {st} shutters in a wall")
                n = _hits(body, mk, ox, oy)
                if n > 6: bad.append(f"shutter: {o['label']} ({o['id']}) {st} shutters lie on an object")
            elif st == "open":
                zone = np.zeros(shape, bool); _paint(zone, mk, ox, oy)
                x0, y0, x1, y1 = s; horiz = (x1 - x0) > (y1 - y0); k = int(T * .6)
                zone |= _rect_mask(shape, (x0, y0 - k, x1, y1 + k) if horiz else (x0 - k, y0, x1 + k, y1))
                for p in solid:
                    n = _hits(zone, *p.masks[p.spec.states[0]])
                    if n > 10: bad.append(f"door: {_where(p)} stands in the way of {o['label']} ({o['id']})")

    # facing and against
    for p in things:
        sp = p.spec
        if sp.front and p.on is None:
            z = _rect_mask(shape, _front_zone(p, max(8, sp.clear * FT)))
            if (z & framed).sum() > 20: bad.append(f"facing: {_where(p)} has its front to a wall (turn it to face {p.face!r} away from the wall)")
            else:
                for q in solid:
                    if q is p or q.on is p: continue
                    if sp.id in SEATS and q.spec.id in SEATED_AT: continue          # a chair drawn up to its table faces it
                    n = _hits(z, *q.masks[q.spec.states[0]])
                    if n > max(30, z.sum() * .15): bad.append(f"facing: {_where(p)} has {q.name} in front of it"); break
        if sp.mount == "wall":
            g = sp.back * FT + 8                                         # the strip just past its back, where the wall must be
            z = _rect_mask(shape, _back_zone(p, g + 10)) & ~_rect_mask(shape, _back_zone(p, g)); n = (z & framed).sum()
            if n < z.sum() * .3: bad.append(f"against: {_where(p)} should stand with its back to a wall")

    # overlap
    for i, p in enumerate(solid):
        mp, px0, py0 = p.masks[p.spec.states[0]]
        for q in solid[i + 1:]:
            if q.on is p or p.on is q: continue
            if p.spec.group == "plant" or q.spec.group == "plant": continue      # a bush under a tree's crown, a garden by a tree
            mq, qx0, qy0 = q.masks[q.spec.states[0]]
            if px0 > qx0 + mq.shape[1] or qx0 > px0 + mp.shape[1] or py0 > qy0 + mq.shape[0] or qy0 > py0 + mp.shape[0]: continue
            a = np.zeros(shape, bool); _paint(a, mp, px0, py0)
            if _hits(a, mq, qx0, qy0) > 20: bad.append(f"overlap: {_where(p)} and {_where(q)} stand in each other")

    # bare rooms
    if bare:
        lab, ids = rooms(framed)
        cover = np.zeros(shape, bool)
        for p in things: _paint(cover, *p.masks[p.spec.states[0]])
        gh, gw = lab.shape; cv = cover[:gh * CELL, :gw * CELL].reshape(gh, CELL, gw, CELL).mean((1, 3))
        for r in ids:
            cells = lab == r; area = cells.sum() * CELL * CELL / (T * T)
            cnt = sum(1 for p in things if 0 <= int((p.y + p.h / 2) * T) // CELL < gh and 0 <= int((p.x + p.w / 2) * T) // CELL < gw
                      and lab[int((p.y + p.h / 2) * T) // CELL, int((p.x + p.w / 2) * T) // CELL] == r)
            frac = cv[cells].mean(); need = max(3, int(round(area * BARE_PER_SQ)))
            if cnt < need or frac < BARE_MIN_COVER:
                ii, jj = np.nonzero(cells)
                bad.append(f"bare: the room at {jj.min() * CELL / T:.1f}, {ii.min() * CELL / T:.1f} ({area:.0f} square squares) has {cnt} things covering {frac:.0%} of its floor; it needs {need} and {BARE_MIN_COVER:.0%}")
    return bad
