"""WoDX pixel map drawer (B5737): open ground. Grass with a dirt road (verges, ruts), a brook (banks, depth, ripples),
ploughed strips, a plank bridge and scattered trees that keep clear of what was built."""
import math
import numpy as np
from px import R, T, OUT
from bits import dist, curve


def ground(m, roads=(), brooks=(), wide=52):
    """Lay the grass, then each road (a list of points in squares) and each brook. Returns the distance fields
    (road, brook), in pixels from the road's edge and the brook's middle, for placing trees and bridges."""
    a = m.grass(m.H, m.W); wob = (m.noise(m.H, m.W, 34) - .5) * .5 + (m.noise(m.H, m.W, 8) - .5) * .28
    big = np.full((m.H, m.W), 1e9, np.float32); dt, db = big.copy(), big.copy()
    for pts, half in roads:
        dt = np.minimum(dt, dist(curve(pts), m.W, m.H) - half + wob * 46)
    dirt = m.dirt(m.H, m.W); verge = (dt < 14) & (dt >= 0)
    a[verge] = np.array(R["grass"][1], np.uint8); a[verge & (m.noise(m.H, m.W, 6) > .55)] = R["dirt"][2]
    a[dt < 0] = dirt[dt < 0]
    for pts, half in roads:                                                       # two wheel ruts and the hoof-worn middle
        dr = dist(curve(pts), m.W, m.H); rut = (np.abs(dr - half * .55) < 5) & (dt < -6) & (m.noise(m.H, m.W, 14) > .3)
        a[rut] = R["dirt"][1]; a[np.roll(rut, 1, 0) & (dt < -6)] = R["dirt"][0]
    for pts in brooks:
        db = np.minimum(db, dist(curve(pts), m.W, m.H) + (m.noise(m.H, m.W, 40) - .5) * 30)
    if brooks:
        bank = (db < wide + 12) & (db >= wide)
        a[bank] = R["dirt"][1]; a[bank & (m.noise(m.H, m.W, 5) > .5)] = R["dirt"][2]
        a[(db < wide + 16) & (db >= wide + 12)] = R["grass"][0]
        water = db < wide; lv = np.clip(db / wide, 0, .999)
        wa = m.ramp(1 - lv, "water", 0, 3)
        wa = np.where((lv > .86)[..., None], np.array(R["water"][3], np.uint8), wa)
        yy, xx = m.grid()
        rip = ((yy + (xx // 12) * 6) % 28 < 2) & (m.noise(m.H, m.W, 14) > .52) & (lv < .8); wa[rip] = R["water"][3]
        glint = ((yy + (xx // 10) * 4) % 34 < 2) & (m.noise(m.H, m.W, 8) > .66) & (lv < .7); wa[glint] = R["water"][4]
        wa[lv > .93] = R["water"][4]; wa[(lv > .93) & (m.noise(m.H, m.W, 6) > .5)] = R["water"][3]
        a[water] = wa[water]
    m.put(a, 0, 0)
    return dt, db


def strips(m, x0, y0, x1, y1, crops=("rye", "oats", "fallow", "flax")):
    """Open-field strips ploughed east to west, each a crop a player can tell apart at a glance: rye a gold field
    with ears, oats a pale green one, flax green with blue flowers, fallow bare brown earth with weeds. A grass balk
    runs between strips."""
    X0, Y0, X1, Y1 = int(x0 * T), int(y0 * T), int(x1 * T), int(y1 * T); rng = m.rng; d = m.d
    look = {"rye": ("straw", 1, 4, R["straw"][4]), "oats": ("green", 2, 5, (176, 180, 120)), "flax": ("green", 1, 4, R["blue"][4]), "fallow": ("dirt", 1, 4, R["green"][2])}
    h = 92; k = 0
    for y in range(Y0, Y1 - 30, h):
        crop = crops[k % len(crops)]; k += 1; yb = min(Y1, y + h - 10)
        name, lo, hi, dot = look[crop]
        lv = m.noise(yb - y, X1 - X0, 18) * .7 + m.noise(yb - y, X1 - X0, 5) * .3
        m.put(m.ramp(lv, name, lo, hi), X0, y)
        if crop == "fallow":                                                       # bare clods and weeds, no rows
            for _ in range(int((X1 - X0) * (yb - y) / 90)):
                x_, y_ = int(rng.integers(X0 + 3, X1 - 4)), int(rng.integers(y + 3, yb - 4))
                if rng.random() < .6: d.rectangle([x_, y_, x_ + 2, y_ + 1], fill=R["dirt"][0]); d.point((x_, y_), fill=R["dirt"][4])
                else: d.line([x_, y_ + 2, x_ - 1, y_], fill=R["green"][2]); d.line([x_, y_ + 2, x_ + 2, y_], fill=R["green"][3])
        else:
            gaps = m.noise(yb - y, X1 - X0, 9)
            for yy in range(y + 6, yb - 3, 10):                                    # the plough's rows, broken where the crop grows over
                row = gaps[yy - y] > .38; xs = np.flatnonzero(row) + X0
                for x_ in xs[::1]: d.point((int(x_), yy), fill=R[name][max(0, lo - 1)])
            for _ in range(int((X1 - X0) * (yb - y) / 70)):                        # ears or flowers, in little clusters
                x_, y_ = int(rng.integers(X0 + 2, X1 - 3)), int(rng.integers(y + 2, yb - 3))
                d.point((x_, y_), fill=dot); d.point((x_ + 1, y_ + 1), fill=dot if crop != "flax" else R["blue"][3])
        d.rectangle([X0, yb, X1, yb + 9], fill=R["grass"][2]); d.line([X0, yb + 1, X1, yb + 1], fill=R["grass"][3])   # the balk


def bridge(m, x0, y0, x1, y1):
    """A plank bridge across a brook: two beams, cross planks, a rail each side on posts. Squares; runs east-west."""
    d = m.d; bx0, bx1, by0, by1 = int(x0 * T), int(x1 * T), int(y0 * T), int(y1 * T)
    m.shade((bx0 + 6, by0 + 12, bx1 + 6, by1 + 12), f=.58)
    pl = np.transpose(m.blocks(bx1 - bx0, by1 - by0, 4000, 13, "wood", jitter=1, lo=1, hi=5), (1, 0, 2)); m.put(pl, bx0, by0)
    d.rectangle([bx0, by0, bx1 - 1, by1 - 1], outline=OUT)
    for yy_ in (by0 - 5, by1 - 4):
        m.box(bx0 - 8, yy_, bx1 + 8, yy_ + 8, "dwood", 3)
        for xx_ in range(bx0 - 6, bx1 + 6, 46): m.box(xx_, yy_ - 2, xx_ + 9, yy_ + 10, "dwood", 2)
    for xx_ in range(bx0 + 6, bx1 - 4, 13): d.point((xx_, by0 + 5), fill=R["iron"][1]); d.point((xx_, by1 - 6), fill=R["iron"][1])


def trees(m, W, H, keep_clear, n=500, fir=.45, gap=.62):
    """Trees and firs scattered over the map, none where keep_clear(x, y, r) says no; drawn north to south."""
    rng = m.rng; got = []
    for _ in range(n):
        x, y = rng.uniform(-.5, W + .5), rng.uniform(-.5, H + .5); r = rng.uniform(.95, 1.6)
        if keep_clear(x, y, r): continue
        if any(math.hypot(x - a, y - b) < (r + c) * gap for a, b, c, _ in got): continue
        got.append((x, y, r, rng.random() < fir))
    for x, y, r, f in sorted(got, key=lambda t: t[1]): (m.fir if f else m.tree)(x * T, y * T, int(r * T * .78))
    return got
