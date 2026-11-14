# Bicycles, motorcycles, carts, carriages and boats for the mount sprites (B4970).
import math, numpy as np
from mountkit import *
import mount_beasts as MB


def _frame(t, pts, rp=KA, tone=2, w=2):
    for a, b in zip(pts, pts[1:]): t.line([a, b], rp, tone, w=w)


# ---- bicycles ----
def bicycle(p, ph=0):
    FW, FH = 112, 112; G = FH - 9; t = Pt(FW, FH)
    Y = lambda y: G - y
    rr, rf = p.get('rr', 12), p.get('rf', 12); wb = p.get('wb', 40); x0 = (FW - wb) // 2 - (4 if rf > 16 else 0)
    xr, xf = x0, x0 + wb; kind = p.get('wheel', 'wire')
    sx, sy = xr + p.get('sx', 12), p.get('sy', 34)                 # the saddle
    hx, hy = xf - p.get('hx', 6), p.get('hy', 38)                  # the bars
    bb = (xr + wb * .42, rr + 1)                                     # the cranks
    t.wheel(xr, Y(rr), rr, kind, ph); t.wheel(xf, Y(rf), rf, kind, ph)
    if p.get('fat'):
        for x, r in ((xr, rr), (xf, rf)): t.arc(x, Y(r), r, r, 0, 360, TYRE, 1, w=2)
    if p.get('guards'):
        for x, r in ((xr, rr), (xf, rf)): t.arc(x, Y(r), r + 2, r + 2, 200, 330, KB, 2, w=1)
    st = p.get('style', 'diamond')
    if st == 'ordinary':
        _frame(t, [(xf, Y(rf)), (xf - 2, Y(2 * rf + 2)), (xr + 6, Y(rr + 14)), (xr, Y(rr))]); sx, sy = xf - 9, 2 * rf + 3; hx, hy = xf + 2, 2 * rf + 7
    elif st == 'step':
        _frame(t, [(xr, Y(rr)), bb and (bb[0], Y(bb[1])), (hx - 2, Y(hy - 14))]); _frame(t, [(bb[0], Y(bb[1])), (sx, Y(sy - 2))]); _frame(t, [(xr, Y(rr)), (sx, Y(sy - 10))], w=1)
    elif st == 'cargo':
        _frame(t, [(xr, Y(rr)), (bb[0], Y(bb[1])), (sx, Y(sy - 2)), (xr, Y(rr))]); _frame(t, [(bb[0], Y(bb[1])), (xf - 4, Y(rf + 2))])
        t.rect(bb[0] + 8, Y(rf + 16), xf - 8, Y(rf + 3), KB, 2, vol=(1, 2), edge=1)
    else:
        top = (hx - 2, Y(hy - 8))
        _frame(t, [(xr, Y(rr)), (bb[0], Y(bb[1])), (sx, Y(sy - 2)), (xr, Y(rr))], w=1 if p.get('thin') else 2)
        _frame(t, [(sx + 1, Y(sy - 4)), top, (bb[0], Y(bb[1]))], w=1 if p.get('thin') else 2)
        if p.get('battery'): t.line([(bb[0] + 1, Y(bb[1] + 2)), (top[0] - 2, top[1] + 3)], IRON, 1, w=4)
    if st != 'ordinary': t.line([(xf, Y(rf)), (hx - 2, Y(hy - 8)), (hx - 3, Y(hy))], STEEL, 2, w=1)
    # bars, saddle, cranks
    if p.get('drop'): t.line([(hx - 3, Y(hy)), (hx + 3, Y(hy)), (hx + 4, Y(hy - 4))], BLACK, 2)
    else: t.line([(hx - 5, Y(hy + 1)), (hx + 1, Y(hy))], BLACK, 2)
    t.rect(sx - 4, Y(sy + 1), sx + 4, Y(sy - 1), BLACKLEATHER if not p.get('brown') else LEATHER, 2, vol=(1, 0))
    if st != 'ordinary':
        a = ph * 2
        t.ell(bb[0], Y(bb[1]), 3, 3, STEEL, 1); t.line([(bb[0], Y(bb[1])), (bb[0] + math.cos(a) * 5, Y(bb[1]) + math.sin(a) * 5)], STEEL, 3)
        t.line([(bb[0], Y(bb[1] - 3)), (xr, Y(rr - 2))], IRON, 1)
    if p.get('lamp'): t.px(hx + 2, Y(hy - 5), LAMP, 3); t.px(hx + 1, Y(hy - 5), BRASS, 2)
    if p.get('basket'): t.rect(hx + 2, Y(hy - 2), hx + 10, Y(hy - 9), ROPE, 2, vol=(1, 1), edge=1)
    if p.get('rack'): t.line([(xr - 6, Y(2 * rr + 2)), (xr + 6, Y(2 * rr + 2))], IRON, 2)
    t.shadow(FW / 2, G + 1, wb / 2 + 12, 3)
    side = t.outline(); seats = [seat_astride(sx, Y(sy + 1))]
    ends = {}
    for back in (False, True):
        e = Pt(FW, FH); cx = FW // 2
        r = rr if back else rf
        e.rect(cx - 1, Y(2 * r), cx + 1, G, TYRE, 2); e.rect(cx - 1, Y(2 * r), cx, G, TYRE, 1)
        if p.get('guards'): e.rect(cx - 2, Y(2 * r + 2), cx + 2, Y(2 * r), KB, 2)
        e.line([(cx, Y(2 * r)), (cx, Y(hy if not back else sy))], KA if st != 'ordinary' else KA, 2, w=2)
        e.line([(cx - 9, Y(hy)), (cx + 9, Y(hy))], BLACK, 2)
        for sg in (-1, 1): e.px(cx + sg * 9, Y(hy - 1), BLACK, 2)
        if back: e.rect(cx - 4, Y(sy + 1), cx + 4, Y(sy - 2), BLACKLEATHER, 2, vol=(1, 0)); e.px(cx, Y(sy - 6), REDL, 3)
        elif p.get('lamp'): e.ell(cx, Y(hy - 5), 2, 2, LAMP, 3)
        if p.get('basket') and not back: e.rect(cx - 8, Y(hy - 2), cx + 8, Y(hy - 10), ROPE, 2, vol=(1, 1), edge=1)
        if st == 'cargo' and not back: e.rect(cx - 12, Y(rf + 16), cx + 12, Y(rf + 3), KB, 2, vol=(1, 2), edge=1)
        e.shadow(cx, G + 1, 8, 2)
        ends['up' if back else 'down'] = e.outline()
    return (dict(right=side, left=mirror(side), **ends),
            dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], down=[seat_astride(FW // 2, Y(sy + 1), cut=92)], up=[seat_astride(FW // 2, Y(sy + 1), cut=96)]))


def bicycles():
    return [
        (1885, 'safety', 'Safety bicycle', dict(wheel='wire', brown=True), 'enamel'),
        (1885, 'ordinary', 'Penny-farthing', dict(style='ordinary', rf=25, rr=8, wb=34, brown=True), 'enamel'),
        (1885, 'ladies', 'Ladies\' safety', dict(style='step', guards=True, brown=True), 'enamel'),
        (1920, 'roadster', 'Roadster', dict(guards=True, lamp=True, rack=True, brown=True), 'enamel'),
        (1920, 'delivery', 'Delivery bicycle', dict(guards=True, basket=True, rf=10, brown=True), 'enamel'),
        (1920, 'ladies', 'Ladies\' roadster', dict(style='step', guards=True, lamp=True, basket=True, brown=True), 'enamel'),
        (1960, 'racer', 'Racing bicycle', dict(thin=True, drop=True, sy=37, hy=36), 'bright'),
        (1960, 'small', 'Small-wheeled bicycle', dict(style='step', rr=8, rf=8, wb=36, guards=True, sy=33, hy=37, rack=True), 'bright'),
        (1960, 'roadster', 'Roadster', dict(guards=True, lamp=True, rack=True), 'bright'),
        (1990, 'mountain', 'Mountain bicycle', dict(fat=True, sy=36, hy=37, wb=42), 'bright'),
        (1990, 'bmx', 'Stunt bicycle', dict(rr=9, rf=9, wb=34, fat=True, sy=27, hy=33), 'bright'),
        (1990, 'racer', 'Racing bicycle', dict(thin=True, drop=True, sy=38, hy=36), 'bright'),
        (2040, 'electric', 'Electric bicycle', dict(battery=True, fat=True, guards=True, lamp=True, wheel='alloy', wb=42), 'future'),
        (2040, 'cargo', 'Cargo bicycle', dict(style='cargo', wb=56, rf=9, battery=True, wheel='alloy', guards=True), 'future'),
        (2040, 'folding', 'Folding bicycle', dict(style='step', rr=7, rf=7, wb=34, sy=33, hy=37, wheel='alloy', battery=True), 'future'),
    ]


# ---- motorcycles ----
def motorbike(p, ph=0):
    FW, FH = 144, 112; G = FH - 9; t = Pt(FW, FH)
    Y = lambda y: G - y
    r = p.get('r', 12); rf = p.get('rf', r); wb = p.get('wb', 54); x0 = (FW - wb) // 2 + p.get('shift', 0)
    xr, xf = x0, x0 + wb; kind = p.get('wheel', 'wire'); st = p.get('style', 'std')
    sx, sy = xr + p.get('sx', 14), p.get('sy', 30); hx, hy = xf - p.get('hx', 12), p.get('hy', 38)
    side_car = p.get('sidecar')
    if side_car:
        # the far side: a tub on a third wheel, seen over the machine
        t.wheel(xr + 16, Y(r) - 3, r - 1, kind, ph); t.poly([(xr + 2, Y(r + 2) - 3), (xr, Y(r + 15) - 3), (xr + 12, Y(r + 19) - 3), (xf - 14, Y(r + 19) - 3), (xf - 2, Y(r + 10) - 3), (xf - 8, Y(r + 2) - 3)], KA if side_car is True else side_car, 2, vol=(2, 3), edge=1)
    t.wheel(xr, Y(r), r, kind, ph); t.wheel(xf, Y(rf), rf, kind, ph)
    for x, rad in ((xr, r), (xf, rf)): t.arc(x, Y(rad), rad, rad, 0, 360, TYRE, 1, w=2 if rad > 8 else 1)
    if st == 'scooter':
        t.poly([(xr - 8, Y(r + 2)), (xr - 10, Y(r + 14)), (sx + 8, Y(r + 15)), (sx + 12, Y(5)), (xf - 12, Y(5)), (xf - 8, Y(hy - 6)), (xf - 3, Y(hy - 6)), (xf - 4, Y(3)), (xr + 8, Y(3)), (xr + 4, Y(r + 2))], KA, 2, vol=(2, 2), edge=1)
        t.arc(xf, Y(rf), rf + 2, rf + 2, 180, 340, KA, 3, w=2)
    elif st == 'fairing':
        t.poly([(xr + 2, Y(r + 6)), (sx - 10, Y(sy + 3)), (sx + 6, Y(sy - 2)), (hx - 4, Y(hy)), (hx + 6, Y(hy + 4)), (xf + 2, Y(rf + 12)), (xf - 6, Y(rf + 1)), (xf - 12, Y(5)), (xr + 14, Y(5))], KA, 2, vol=(2, 3), edge=1, gloss=True)
        t.poly([(hx + 1, Y(hy + 3)), (hx + 5, Y(hy + 4)), (hx + 7, Y(hy - 2)), (hx + 2, Y(hy - 2))], GLASS, 2)
        if p.get('stripe'): t.line([(xr + 12, Y(r + 2)), (xf - 8, Y(r + 6))], KB, 3)
    elif st == 'shell':
        t.poly([(xr - 6, Y(r)), (xr - 2, Y(r + 14)), (sx, Y(sy)), (hx - 2, Y(hy + 12)), (hx + 10, Y(hy + 2)), (xf + 6, Y(rf + 6)), (xf, Y(rf - 4)), (xr, Y(r - 5))], KA, 2, vol=(2, 3), edge=1, gloss=True)
        t.poly([(hx - 1, Y(hy + 10)), (hx + 8, Y(hy + 2)), (hx + 2, Y(hy - 2)), (sx + 10, Y(sy + 2))], GLASS, 1, vol=(1, 0))
        t.line([(xr, Y(r + 3)), (xf, Y(rf + 3))], NEON, 3)
        for x, rad in ((xr, r), (xf, rf)): t.wheel(x, Y(rad), rad - 2, 'alloy', ph, hub=IRON)
    else:
        # frame, engine, tank
        _frame(t, [(xr, Y(r)), (sx - 4, Y(sy - 3)), (hx - 4, Y(hy - 8)), (xr + wb * .5, Y(r - 2)), (xr, Y(r))], rp=IRON, tone=2, w=1 if p.get('thin') else 2)
        ew = p.get('engine', 12)
        t.rect(xr + wb * .5 - ew / 2 - 2, Y(r + 10), xr + wb * .5 + ew / 2, Y(r - 3), IRON, 2, vol=(1, 2), edge=1)
        for k in range(3): t.line([(xr + wb * .5 - ew / 2, Y(r + 8 - k * 3)), (xr + wb * .5 + ew / 2 - 2, Y(r + 8 - k * 3))], STEEL, 3)
        tl = p.get('tank', 16)
        t.poly([(sx + 5, Y(sy - 1)), (sx + 7, Y(sy + 4)), (sx + 5 + tl, Y(sy + 5)), (sx + 8 + tl, Y(sy)), (sx + 6 + tl, Y(sy - 3)), (sx + 6, Y(sy - 4))], KA, 2, vol=(1, 2), gloss=True, edge=1)
        if p.get('stripe'): t.line([(sx + 8, Y(sy + 1)), (sx + 5 + tl, Y(sy + 2))], KB, 3)
        # exhaust
        t.line([(xr + wb * .5, Y(r - 2)), (xr - 4 + p.get('pipe', 0), Y(r + p.get('pipeup', 0)))], CHROME, 2, w=2)
        if p.get('guards', True):
            t.arc(xr, Y(r), r + 2, r + 2, 190, 320, KA, 2, w=2); t.arc(xf, Y(rf), rf + 2, rf + 2, 220, 330, KA, 2, w=2)
        if p.get('highguard'): t.line([(xf - 8, Y(2 * rf + 7)), (xf + 6, Y(2 * rf + 6))], KA, 3, w=2)
    # fork and bars
    if st not in ('fairing', 'shell'):
        t.line([(xf, Y(rf)), (hx, Y(hy - 3))], CHROME, 2, w=2 if st != 'scooter' else 1)
        t.line([(hx - 5 - p.get('ape', 0), Y(hy + 2 + p.get('ape', 0))), (hx, Y(hy - 2))], BLACK if st != 'chopper' else CHROME, 2)
        if p.get('lamp', True): t.ell(hx + 4, Y(hy - 6), 2.5, 2.5, CHROME if p.get('chromelamp', True) else BRASS, 2); t.px(hx + 6, Y(hy - 6), LAMP, 3)
        if p.get('screen'): t.line([(hx + 1, Y(hy)), (hx + 5, Y(hy + 10))], GLASS, 3)
    # seat
    sl = p.get('seatlen', 16)
    t.poly([(sx - sl / 2 - 2, Y(sy)), (sx - sl / 2, Y(sy + 2 + p.get('hump', 0))), (sx + sl / 2, Y(sy + 2)), (sx + sl / 2 + 1, Y(sy - 1)), (sx - sl / 2, Y(sy - 2))], BLACKLEATHER if not p.get('brown') else LEATHER, 2, vol=(1, 0))
    if p.get('sissy'): t.line([(sx - sl / 2 - 2, Y(sy)), (sx - sl / 2 - 5, Y(sy + 14))], CHROME, 2)
    if p.get('bags'): t.rect(xr - 4, Y(r + 12), xr + 8, Y(r + 2), LEATHER if p.get('brown') else BLACKLEATHER, 2, vol=(1, 2), edge=1)
    if p.get('box'): t.rect(xr - 12, Y(sy + 12), xr, Y(sy), KB, 2, vol=(1, 2), edge=1)
    t.px(xr - r - 1 if st != 'scooter' else xr - 10, Y(r + 12), REDL, 3)
    t.shadow(FW / 2 + p.get('shift', 0), G + 1, wb / 2 + r + 2, 3)
    side = t.outline()
    seats = [seat_astride(sx + 3, Y(sy + 2)), seat_astride(sx - 8, Y(sy + 2 + p.get('hump', 0)))]
    if side_car: seats.append(seat_head(xr + wb * .45, Y(r + 26) - 3, below=7))
    ends = {}; es = {}
    for back in (False, True):
        e = Pt(FW, FH); cx = FW // 2 - (8 if side_car else 0)
        rad = r if back else rf; tw = 3 if rad > 8 else 2
        if side_car:
            scx = cx + (22 if not back else -22)
            e.tyre_front(scx + 9 * (1 if not back else -1) - 2, scx + 9 * (1 if not back else -1) + 2, Y(2 * r - 4), G)
            e.poly([(scx - 10, Y(4)), (scx - 11, Y(r + 14)), (scx - 6, Y(r + 20)), (scx + 6, Y(r + 20)), (scx + 11, Y(r + 14)), (scx + 10, Y(4))], KA if side_car is True else side_car, 2, vol=(2, 3), edge=1)
            if not back: e.rect(scx - 7, Y(r + 26), scx + 7, Y(r + 20), GLASS, 3)
        e.tyre_front(cx - tw, cx + tw, Y(2 * rad), G)
        body = KA if st in ('scooter', 'fairing', 'shell') else IRON
        w2 = 9 if st in ('scooter', 'fairing', 'shell') else 6
        e.poly([(cx - w2 + 2, Y(rad)), (cx - w2, Y(sy)), (cx - w2 + 3, Y(hy - 2)), (cx + w2 - 3, Y(hy - 2)), (cx + w2, Y(sy)), (cx + w2 - 2, Y(rad))], body, 2, vol=(2, 2), edge=1)
        if st not in ('scooter', 'fairing', 'shell'): e.rect(cx - 4, Y(sy + 4), cx + 4, Y(sy - 4), KA, 2, vol=(1, 1))
        bw = 12 + p.get('ape', 0)
        e.line([(cx - bw, Y(hy + p.get('ape', 0))), (cx - 3, Y(hy - 2)), (cx + 3, Y(hy - 2)), (cx + bw, Y(hy + p.get('ape', 0)))], BLACK, 2)
        if back:
            e.rect(cx - 5, Y(sy + 2 + p.get('hump', 0)), cx + 5, Y(sy - 3), BLACKLEATHER, 2, vol=(1, 0)); e.rect(cx - 2, Y(r + 14), cx + 2, Y(r + 12), REDL, 3)
            if p.get('bags'):
                for sg in (-1, 1): e.rect(cx + sg * 10, Y(r + 12), cx + sg * 5, Y(r + 2), BLACKLEATHER, 2, vol=(1, 2), edge=1)
            if p.get('box'): e.rect(cx - 8, Y(sy + 12), cx + 8, Y(sy), KB, 2, vol=(1, 2), edge=1)
            e.px(cx + 5, Y(r - 2), CHROME, 3); e.px(cx + 6, Y(r - 2), CHROME, 2)
        else:
            if st in ('fairing', 'shell') or p.get('screen'): e.poly([(cx - 5, Y(hy - 1)), (cx - 3, Y(hy + 8)), (cx + 3, Y(hy + 8)), (cx + 5, Y(hy - 1))], GLASS, 2, vol=(1, 0))
            e.ell(cx, Y(hy - 7), 3, 3, LAMP, 3, edge=1)
        e.shadow(cx + (11 if side_car and not back else -11 if side_car else 0), G + 1, 12 + (14 if side_car else 0), 3)
        ends['up' if back else 'down'] = e.outline()
        ss = [seat_astride(cx, Y(sy + 2), cut=90 if not back else 96), seat_astride(cx, Y(sy + 6), cut=74 if not back else 96)]
        if back: ss = [seat_astride(cx, Y(sy + 7), cut=80), seat_astride(cx, Y(sy + 2), cut=96)]
        if side_car: ss.append(seat_head(cx + (22 if not back else -22), Y(r + 27), below=7))
        es['up' if back else 'down'] = ss
    return (dict(right=side, left=mirror(side), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es))


def motorbikes():
    return [
        (1910, 'belt', 'Motor bicycle', dict(r=13, thin=True, engine=8, tank=14, wb=52, sy=32, hy=38, brown=True, chromelamp=False, guards=False), 'enamel'),
        (1910, 'twin', 'Twin-cylinder', dict(r=13, engine=14, tank=18, wb=56, sy=30, hy=36, brown=True, chromelamp=False), 'enamel'),
        (1910, 'combination', 'Sidecar combination', dict(r=13, engine=12, wb=56, sy=31, hy=37, brown=True, chromelamp=False, sidecar=True), 'enamel'),
        (1930, 'tourer', 'Tourer', dict(engine=14, tank=18, bags=True, brown=True, stripe=True, seatlen=20), 'enamel'),
        (1930, 'combination', 'Sidecar combination', dict(engine=14, tank=18, sidecar=True, seatlen=20), 'field'),
        (1930, 'despatch', 'Despatch machine', dict(engine=12, tank=14, bags=True, wheel='wire', guards=True), 'field'),
        (1960, 'cafe', 'Cafe racer', dict(engine=14, tank=20, hy=33, hump=3, stripe=True, pipeup=4, wheel='wire'), 'bright'),
        (1960, 'chopper', 'Chopper', dict(engine=14, tank=12, wb=66, rf=13, r=11, hx=22, hy=40, ape=6, sissy=True, sy=26, guards=False, wheel='wire', shift=-4), 'bright'),
        (1960, 'scooter', 'Scooter', dict(style='scooter', r=7, wb=44, sy=30, hy=40, wheel='disc', seatlen=20, lamp=True), 'bright'),
        (1990, 'sport', 'Sport machine', dict(style='fairing', wheel='alloy', sy=33, hy=36, hump=4, stripe=True, seatlen=14), 'bright'),
        (1990, 'cruiser', 'Cruiser', dict(engine=16, tank=20, wb=62, sy=26, hy=38, ape=3, bags=True, wheel='alloy', seatlen=22, hx=16), 'bright'),
        (1990, 'trail', 'Trail machine', dict(engine=10, tank=14, r=13, sy=36, hy=42, highguard=True, guards=False, pipeup=14, wheel='wire', seatlen=22), 'bright'),
        (2040, 'shell', 'Enclosed machine', dict(style='shell', wheel='alloy', sy=30, hy=34, seatlen=14), 'future'),
        (2040, 'street', 'Electric street machine', dict(engine=18, tank=14, wheel='alloy', sy=31, hy=36, stripe=True, pipe=40, pipeup=-2, hump=2), 'future'),
        (2040, 'courier', 'Courier scooter', dict(style='scooter', r=8, wb=46, sy=30, hy=41, wheel='alloy', box=True, seatlen=18), 'future'),
    ]


# ---- carts and carriages: a body on wheels behind a horse from the rig ----
def _horse(build='horse', **k): return MB.beast(build, **k)


TEAM = [dict(a=ramp((112, 70, 40)), b=ramp((36, 28, 24))), dict(a=ramp((58, 52, 50)), b=ramp((30, 26, 26))), dict(a=ramp((172, 172, 166)), b=ramp((96, 96, 100))),
        dict(a=ramp((140, 84, 44)), b=ramp((196, 170, 120)))]


def drawn(p, f=0, ph=0):
    """a cart or a carriage with its team. p: body parts in pixels from the tail of the vehicle; the team stands ahead of it"""
    FW, FH = 288, 160; G = FH - 10
    Y = lambda y: G - y
    L = p['L']; n = p.get('team', 1); hs = p.get('horse', dict(build='horse', s=1.6))
    a = _horse(hs.get('build', 'horse'), **{k: v for k, v in hs.items() if k != 'build'})
    hw = 92                                                # room a horse takes ahead of the body
    x0 = (FW - (L + hw - 8)) // 2
    X = lambda x: x0 + x
    hfr, _ = MB.draw(a, 'none', (), f)
    # the team's coats are fixed: the colour scheme is for the paint
    coat = TEAM[p.get('coat', 0) % len(TEAM)]
    hfr = {k: recolour(v, coat) for k, v in hfr.items()}
    def harness(t, hx, dy=0):
        t.line([(hx + 58, G - 60 + dy), (hx + 66, G - 40 + dy)], BLACKLEATHER, 2, w=2)
        t.line([(hx + 40, G - 50 + dy), (hx + 62, G - 50 + dy)], BLACKLEATHER, 1)
    # --- side ---
    t = Pt(FW, FH)
    hx = X(L) - 40                                         # the horse picture's left edge
    for xa, r, kind in p['wheels']: t.ell(X(xa) + 2, Y(r) - 2, r, r, IRON, 1)
    if n > 1: t.paste(_dark(hfr['right']), hx + 7, G - MB.GROUND - 4)
    if n > 2: t.paste(_dark(hfr['right']), hx + 60, G - MB.GROUND - 4)
    seats = _body_side(t, p, X, Y)
    for xa, r, kind in p['wheels']: t.wheel(X(xa), Y(r), r, kind, ph, rim=p.get('rim'))
    t.line([(X(L - 4), Y(p['shaft'])), (hx + 86, G - 44)], WOOD, 2, w=1)
    t.paste(hfr['right'], hx, G - MB.GROUND); harness(t, hx)
    if n > 2: t.paste(hfr['right'], hx + 54, G - MB.GROUND); harness(t, hx + 54)
    t.line([(seats[0]['x'] + 6, seats[0]['y'] - 50), (hx + 96, G - 62)], BLACKLEATHER, 1)
    t.shadow(X(L / 2), G + 1, L / 2, 3)
    side = t.outline()
    # --- ends ---
    cx = FW // 2; w = p['w']; ends = {}; es = {}
    for back in (False, True):
        e = Pt(FW, FH)
        ss = _body_end(e, p, cx, Y, back)
        img = hfr['up' if back else 'down']
        if not back:
            offs = (0,) if n == 1 else (-15, 15)
            for o in offs: e.paste(img, cx - MB.FW // 2 + o, G - MB.GROUND + 8)
        else:
            offs = (0,) if n == 1 else (-15, 15)
            for o in offs: e.paste(img, cx - MB.FW // 2 + o, G - MB.GROUND - 16, under=True)
        e.shadow(cx, G + 1, w / 2 + 4, 4)
        ends['up' if back else 'down'] = e.outline(); es['up' if back else 'down'] = ss
    return (dict(right=side, left=mirror(side), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es))


def _dark(im):
    o = im.copy(); o[..., :3] = (o[..., :3] * .72).astype(np.uint8)
    return o


def _body_side(t, p, X, Y):
    L = p['L']; fl = p['floor']; side = p['side']; kind = p['kind']; seats = []
    body = p.get('paint', WOOD)
    bx = p.get('bench', L - 12); by = fl + side + p.get('benchup', 2)
    if kind in ('cart', 'wagon', 'dray', 'van'):
        t.rect(X(0), Y(fl + side), X(L - 2), Y(fl), body, 2, vol=(1, 2), edge=1)
        if p.get('planks', True):
            for y in range(int(fl) + 3, int(fl + side), 4): t.line([(X(1), Y(y)), (X(L - 3), Y(y))], body, 1)
        if p.get('stakes'):
            for x in range(4, int(L) - 2, 10): t.line([(X(x), Y(fl + side + p['stakes'])), (X(x), Y(fl + side))], body, 3)
            t.line([(X(2), Y(fl + side + p['stakes'])), (X(L - 4), Y(fl + side + p['stakes']))], body, 3)
        if p.get('tilt'):
            h = p['tilt']; t.poly([(X(0), Y(fl + side)), (X(-2), Y(fl + side + h - 6)), (X(6), Y(fl + side + h)), (X(bx - 14), Y(fl + side + h)), (X(bx - 8), Y(fl + side + h - 6)), (X(bx - 8), Y(fl + side))], KC, 2, vol=(3, 2))
            for x in range(10, int(bx) - 12, 14): t.line([(X(x), Y(fl + side + h - 1)), (X(x), Y(fl + side + 1))], KC, 1)
        if p.get('load') == 'barrels':
            for x in range(10, int(bx) - 14, 14): t.ell(X(x), Y(fl + side + 7), 6, 8, DARKWOOD, 2, vol=(2, 2), edge=1); t.line([(X(x - 5), Y(fl + side + 7)), (X(x + 5), Y(fl + side + 7))], IRON, 2)
        if p.get('load') == 'sacks':
            for x in range(8, int(bx) - 14, 11): t.ell(X(x), Y(fl + side + 4), 6, 5, CANVAS, 2, vol=(2, 2), edge=1)
        if p.get('box'):
            h = p['box']; t.rect(X(0), Y(fl + side + h), X(bx - 10), Y(fl + side), KA, 2, vol=(2, 2), edge=1); t.line([(X(4), Y(fl + side + h * .55)), (X(bx - 14), Y(fl + side + h * .55))], KB, 3, w=2)
        t.rect(X(bx - 6), Y(by), X(bx + 6), Y(by - 2), body, 3)
        seats.append(seat_sit(X(bx), Y(by + 1), below=3))
        k = 0
        for x in range(int(bx) - 22, 6, -16):
            seats.append(seat_sit(X(x), Y(fl + side + (1 if not (p.get('tilt') or p.get('box')) else 0)), below=1) if not (p.get('tilt') or p.get('box')) else seat_hidden(X(x), Y(fl)))
            k += 1
    else:
        # a coach: a body hung between the axles, a box for the driver, windows or an open top
        b0, b1 = p['body']; bh = p['bh']; curve = p.get('curve', 4)
        pts = [(b0 + curve, fl), (b0, fl + curve + 2), (b0, fl + bh * .55), (b0 + 2, fl + bh), (b1 - 2, fl + bh), (b1, fl + bh * .55), (b1, fl + curve + 2), (b1 - curve, fl)]
        if p.get('open'):
            pts = [(b0 + curve, fl), (b0, fl + curve + 2), (b0 - 1, fl + bh * .5), (b1 + 1, fl + bh * .5), (b1, fl + curve + 2), (b1 - curve, fl)]
        t.poly([(X(x), Y(y)) for x, y in pts], KA, 2, vol=(2, 3), edge=1, gloss=not p.get('open'))
        t.line([(X(b0 + 2), Y(fl + bh * .48)), (X(b1 - 2), Y(fl + bh * .48))], KB, 3)
        if p.get('hoop'):
            h = p['hoop']; t.poly([(X(b0), Y(fl + bh * .5)), (X(b0 + 2), Y(fl + h - 5)), (X(b0 + 10), Y(fl + h)), (X(b1 - 10), Y(fl + h)), (X(b1 - 2), Y(fl + h - 5)), (X(b1), Y(fl + bh * .5))], KC, 2, vol=(3, 1))
            for x in range(int(b0) + 12, int(b1) - 6, 12): t.line([(X(x), Y(fl + h - 1)), (X(x), Y(fl + bh * .5 + 1))], KB, 2)
        wins = []
        if not p.get('open') and not p.get('hoop'):
            nw = p.get('windows', 2); span = b1 - b0 - 8
            for i in range(nw):
                a_ = b0 + 4 + span * i / nw + 1; b_ = b0 + 4 + span * (i + 1) / nw - 2
                t.rect(X(a_), Y(fl + bh - 4), X(b_), Y(fl + bh * .56), GLASS, 1, vol=(1, 0)); wins.append(((a_ + b_) / 2, fl + bh * .76, bh * .4))
            t.line([(X((b0 + b1) / 2), Y(fl + bh * .46)), (X((b0 + b1) / 2), Y(fl + 4))], KA, 1); t.px(X((b0 + b1) / 2 + 2), Y(fl + bh * .36), BRASS, 3)
        if p.get('folded'):
            for x in (b0 - 2, b1 - 6): t.poly([(X(x), Y(fl + bh * .5)), (X(x - 1), Y(fl + bh * .5 + 7)), (X(x + 8), Y(fl + bh * .5 + 7)), (X(x + 9), Y(fl + bh * .5))], KC, 2, vol=(1, 1))
        if p.get('lugg'):
            t.rect(X(b0 + 6), Y(fl + bh + 6), X(b1 - 10), Y(fl + bh + 1), LEATHER, 2, vol=(1, 1), edge=1); t.rect(X(b0 + 14), Y(fl + bh + 10), X(b0 + 30), Y(fl + bh + 6), CANVAS, 2, edge=1)
        if p.get('lamp', True): t.rect(X(b1), Y(fl + bh * .72), X(b1 + 2), Y(fl + bh * .58), BRASS, 2); t.px(X(b1 + 2), Y(fl + bh * .66), LAMP, 3)
        # the perch and the box
        t.line([(X(p['wheels'][0][0]), Y(p['wheels'][0][1])), (X(p['wheels'][-1][0]), Y(p['wheels'][-1][1]))], IRON, 1, w=2)
        if p.get('hansom'):
            bx = b0 - 6; by = fl + bh + 4; t.rect(X(bx - 5), Y(by), X(bx + 5), Y(by - 8), KA, 1, edge=0)
        else:
            t.poly([(X(b1), Y(fl + bh * .34)), (X(b1 + 2), Y(by - 6)), (X(bx + 8), Y(by - 6)), (X(bx + 10), Y(fl + 2)), (X(b1 + 2), Y(fl + 2))], KB, 2, vol=(1, 2), edge=1)
            t.rect(X(bx - 7), Y(by), X(bx + 6), Y(by - 3), BLACKLEATHER, 2, vol=(1, 0))
        seats.append(seat_sit(X(bx), Y(by + 1), below=4)); seats.append(seat_sit(X(bx - 3), Y(by + 2), below=4) if not p.get('hansom') else seat_hidden(X(bx), Y(by)))
        if p.get('hansom'): seats.pop()
        ns = 6 - len(seats)
        for i in range(ns):
            if wins: wx, wy, wh = wins[min(len(wins) - 1, i * len(wins) // max(1, ns))]; seats.append(seat_head(X(wx + (i % 2) * 5 - 2), Y(wy - 1), below=int(wh / 2) + 1))
            elif p.get('hoop'): seats.append(seat_hidden(X((b0 + b1) / 2), Y(fl + 10)))
            else: seats.append(seat_sit(X(b0 + 10 + (b1 - b0 - 20) * i / max(1, ns - 1)), Y(fl + bh * .5 - 2), below=1))
    return seats


def _body_end(e, p, cx, Y, back):
    w = p['w']; fl = p['floor']; side = p['side']; kind = p['kind']; hw = w / 2; seats = []
    body = p.get('paint', WOOD)
    rr = max(r for _, r, _ in p['wheels']); kd = p['wheels'][0][2]
    for sg in (-1, 1):
        x = cx + sg * (hw + 2); e.rect(x - 2, Y(2 * rr), x + 2, Y(0), p.get('rim') or (WOOD if kd in ('spoke', 'solid') else TYRE), 1, vol=(1, 1), edge=0)
    by = fl + side + p.get('benchup', 2)
    if kind in ('cart', 'wagon', 'dray', 'van'):
        top = fl + side + (p.get('tilt') or p.get('box') or p.get('stakes') or 0)
        e.rect(cx - hw, Y(fl + side), cx + hw, Y(fl), body, 2, vol=(1, 2), edge=1)
        if p.get('tilt'):
            e.poly([(cx - hw, Y(fl + side)), (cx - hw, Y(top - 8)), (cx - hw + 8, Y(top)), (cx + hw - 8, Y(top)), (cx + hw, Y(top - 8)), (cx + hw, Y(fl + side))], KC, 2, vol=(3, 1))
            e.poly([(cx - hw + 7, Y(fl + side + 1)), (cx - hw + 8, Y(top - 9)), (cx + hw - 8, Y(top - 9)), (cx + hw - 7, Y(fl + side + 1))], BLACK, 1)
        elif p.get('box'):
            e.rect(cx - hw, Y(top), cx + hw, Y(fl + side), KA, 2, vol=(2, 2), edge=1)
            if back: e.line([(cx, Y(top - 2)), (cx, Y(fl + side + 1))], KA, 1)
        elif p.get('stakes'):
            for x in range(int(cx - hw) + 2, int(cx + hw), 8): e.line([(x, Y(top)), (x, Y(fl + side))], body, 3)
            e.line([(cx - hw, Y(top)), (cx + hw, Y(top))], body, 3)
        if p.get('load') == 'barrels' and back:
            for x in (-10, 6): e.ell(cx + x, Y(fl + side + 8), 7, 8, DARKWOOD, 2, vol=(2, 2), edge=1)
        if not back: e.rect(cx - hw + 3, Y(by), cx + hw - 3, Y(by - 2), body, 3)
        hid = bool(p.get('tilt') or p.get('box'))
        seats.append(seat_sit(cx, Y(by + 1 + (0 if not back else 4)), below=3 if not back else (0 if hid else 3)))
        if back and hid: seats[0] = seat_hidden(cx, Y(by))
        for i in range(5): seats.append(seat_hidden(cx, Y(fl)) if hid else seat_sit(cx + (-1) ** i * (6 + 3 * (i // 2)), Y(fl + side + 5 + (i // 2) * 4 + (0 if back else 6)), below=0))
    else:
        bh = p['bh']
        if p.get('open'):
            e.poly([(cx - hw + 4, Y(fl)), (cx - hw, Y(fl + bh * .5)), (cx + hw, Y(fl + bh * .5)), (cx + hw - 4, Y(fl))], KA, 2, vol=(2, 3), edge=1)
            if p.get('folded') and back: e.rect(cx - hw, Y(fl + bh * .5 + 7), cx + hw, Y(fl + bh * .5), KC, 2, vol=(1, 1))
        else:
            top = fl + (p.get('hoop') or bh)
            e.poly([(cx - hw + 4, Y(fl)), (cx - hw, Y(fl + bh * .5)), (cx - hw + 2, Y(top - 4)), (cx - hw + 8, Y(top)), (cx + hw - 8, Y(top)), (cx + hw - 2, Y(top - 4)), (cx + hw, Y(fl + bh * .5)), (cx + hw - 4, Y(fl))], KC if p.get('hoop') else KA, 2, vol=(2, 3), edge=1, gloss=not p.get('hoop'))
            if p.get('hoop'): e.poly([(cx - hw + 8, Y(fl + bh * .5)), (cx - hw + 9, Y(top - 8)), (cx + hw - 9, Y(top - 8)), (cx + hw - 8, Y(fl + bh * .5))], BLACK, 1); e.rect(cx - hw, Y(fl + bh * .5), cx + hw, Y(fl), KA, 2, vol=(1, 2), edge=1)
            elif back: e.rect(cx - 7, Y(top - 5), cx + 7, Y(fl + bh * .62), GLASS, 1, vol=(1, 0))
            else: e.rect(cx - hw + 5, Y(top - 5), cx + hw - 5, Y(fl + bh * .62), GLASS, 1, vol=(1, 0))
            if p.get('lugg'): e.rect(cx - hw + 6, Y(top + 6), cx + hw - 6, Y(top + 1), LEATHER, 2, vol=(1, 1), edge=1)
        e.line([(cx - hw + 1, Y(fl + bh * .48)), (cx + hw - 1, Y(fl + bh * .48))], KB, 3)
        if p.get('lamp', True) and not back:
            for sg in (-1, 1): e.rect(cx + sg * (hw + 1), Y(fl + bh * .72), cx + sg * (hw + 3), Y(fl + bh * .58), BRASS, 2); e.px(cx + sg * (hw + 2), Y(fl + bh * .66), LAMP, 3)
        if p.get('hansom'):
            by = fl + bh + 4; seats.append(seat_sit(cx, Y(by + 1), below=4))
        else:
            if not back: e.rect(cx - 13, Y(by - 3), cx + 13, Y(by - 9), KB, 2, vol=(1, 1), edge=1); e.rect(cx - 12, Y(by), cx + 12, Y(by - 3), BLACKLEATHER, 2, vol=(1, 0))
            seats.append(seat_sit(cx + (5 if not back else -5), Y(by + 1 + (0 if not back else 5)), below=4 if not back else 0)); seats.append(seat_sit(cx - (6 if not back else -6), Y(by + 1 + (0 if not back else 5)), below=4 if not back else 0))
        ns = 6 - len(seats)
        for i in range(ns):
            if p.get('open'): seats.append(seat_sit(cx + (-1) ** i * 9, Y(fl + bh * .5 - 1 + (i // 2) * 5 + (0 if back else 8)), below=0))
            elif p.get('hoop'): seats.append(seat_hidden(cx, Y(fl + 8)))
            else: seats.append(seat_head(cx + (-1) ** i * (5 + 4 * (i // 2)) * (.5 if back else 1), Y(fl + bh * .78), below=int(bh * .2) + 1))
    return seats


def carts():
    S, K = 'spoke', 'solid'
    out = []
    for yr, wk, wr in ((0, K, 13), (1500, S, 15), (1800, S, 15), (1900, 'wire', 13)):
        hs = dict(build='horse_large', s=1.66, heavy=1.2) if yr < 1900 else dict(build='horse', s=1.6)
        out += [
            (yr, 'cart', 'Two-wheeled cart', dict(kind='cart', L=74, w=50, floor=wr + 2, side=10, wheels=[(34, wr, wk)], shaft=wr + 6, bench=62, stakes=6 if yr < 1800 else 0, load='sacks', horse=hs, paint=WOOD if yr < 1800 else KA), 'cartwood'),
            (yr, 'wagon', 'Four-wheeled wagon', dict(kind='wagon', L=112, w=54, floor=wr + 3, side=11, wheels=[(22, wr, wk), (90, wr - 2, wk)], shaft=wr + 5, bench=100, stakes=7 if yr < 1900 else 0, load='barrels' if yr in (1500, 1800) else None, horse=hs, paint=WOOD if yr < 1900 else KA), 'cartwood'),
            (yr, 'covered', 'Covered wagon' if yr < 1900 else 'Delivery van', dict(kind='van', L=112, w=54, floor=wr + 3, side=9, wheels=[(22, wr, wk), (90, wr - 2, wk)], shaft=wr + 5, bench=102, benchup=4, tilt=34 if yr < 1900 else 0, box=36 if yr >= 1900 else 0, horse=hs, paint=WOOD), 'cartwood' if yr < 1900 else 'enamel'),
        ]
    for i, o in enumerate(out): o[3]['coat'] = i + 1
    return out


def carriages():
    S = 'spoke'
    out = [
        (0, 'wain', 'Hooped long wagon', dict(kind='coach', L=132, w=58, floor=19, side=0, bh=30, body=(4, 118), hoop=48, wheels=[(26, 16, 'solid'), (104, 14, 'solid')], shaft=22, bench=124, benchup=24, team=2, lamp=False, curve=1), 'heraldic'),
        (0, 'chariot', 'Open travelling cart', dict(kind='coach', L=118, w=56, floor=19, side=0, bh=36, body=(4, 100), open=True, wheels=[(24, 16, 'solid'), (92, 14, 'solid')], shaft=22, bench=108, benchup=22, team=2, lamp=False, curve=1), 'heraldic'),
        (0, 'litter', 'Curtained wagon', dict(kind='coach', L=112, w=54, floor=19, side=0, bh=28, body=(4, 98), hoop=40, wheels=[(24, 16, 'solid'), (88, 14, 'solid')], shaft=22, bench=104, benchup=22, team=1, lamp=False, curve=1), 'heraldic'),
        (1600, 'coach', 'Coach', dict(kind='coach', L=128, w=58, floor=22, side=0, bh=44, body=(16, 96), windows=2, wheels=[(24, 18, S), (104, 13, S)], shaft=20, bench=110, benchup=34, team=2, curve=6, lamp=False), 'coach'),
        (1600, 'calash', 'Open calash', dict(kind='coach', L=116, w=54, floor=22, side=0, bh=38, body=(16, 88), open=True, folded=True, wheels=[(24, 18, S), (94, 13, S)], shaft=20, bench=100, benchup=30, team=1, curve=8, lamp=False), 'coach'),
        (1600, 'stage', 'Stage wagon', dict(kind='coach', L=140, w=58, floor=22, side=0, bh=30, body=(6, 118), hoop=46, wheels=[(26, 18, S), (112, 14, S)], shaft=20, bench=128, benchup=26, team=3, curve=2, lamp=False), 'coach'),
        (1750, 'berline', 'Berline', dict(kind='coach', L=132, w=60, floor=22, side=0, bh=46, body=(18, 100), windows=3, wheels=[(24, 19, S), (108, 13, S)], shaft=20, bench=114, benchup=36, team=2, curve=10), 'coach'),
        (1750, 'landau', 'Landau', dict(kind='coach', L=124, w=58, floor=22, side=0, bh=40, body=(16, 96), open=True, folded=True, wheels=[(24, 19, S), (102, 13, S)], shaft=20, bench=108, benchup=32, team=2, curve=12), 'coach'),
        (1750, 'stagecoach', 'Stagecoach', dict(kind='coach', L=134, w=60, floor=24, side=0, bh=46, body=(14, 104), windows=3, lugg=True, wheels=[(26, 19, S), (110, 15, S)], shaft=20, bench=118, benchup=40, team=3, curve=8), 'coach'),
        (1850, 'brougham', 'Brougham', dict(kind='coach', L=104, w=54, floor=18, side=0, bh=44, body=(10, 70), windows=2, wheels=[(24, 16, S), (82, 12, S)], shaft=18, bench=84, benchup=32, team=1, curve=8, rim=BLACK), 'coach'),
        (1850, 'hansom', 'Hansom cab', dict(kind='coach', L=78, w=52, floor=16, side=0, bh=46, body=(14, 66), windows=1, hansom=True, wheels=[(40, 20, S)], shaft=22, bench=8, team=1, curve=8, rim=BLACK), 'coach'),
        (1850, 'victoria', 'Victoria', dict(kind='coach', L=110, w=54, floor=18, side=0, bh=36, body=(12, 76), open=True, folded=True, wheels=[(24, 16, S), (88, 12, S)], shaft=18, bench=90, benchup=30, team=1, curve=12, rim=BLACK), 'coach'),
    ]
    for i, o in enumerate(out): o[3]['coat'] = i
    return out


# ---- boats, seen a little from above ----
def boat(p, ph=0):
    FW, FH = 256, 144; G = FH - 14; L = p['L']; w = p['w']; h = p.get('h', 12) + 4; t = Pt(FW, FH)
    x0 = (FW - L) // 2
    X = lambda x: x0 + x
    Y = lambda y: G - y
    hull = p.get('hull', KA); deck = p.get('floorc', WOOD); st = p.get('style', 'skiff')
    bow = p.get('bow', 16); stern = p.get('stern', 3); dp = p.get('depth', 7) + 1     # dp: how much of the inside shows
    lift = p.get('lift', 0)
    if lift:
        for x in (L * .3, L * .72): t.line([(X(x), Y(0)), (X(x - 2), Y(lift))], STEEL, 2, w=2); t.line([(X(x - 8), Y(0)), (X(x + 8), Y(0))], STEEL, 3, w=2)
    yb = lift
    # the far gunwale and the inside
    inner = [(X(stern + 2), Y(yb + h + dp)), (X(L - bow - 4), Y(yb + h + dp)), (X(L - 3), Y(yb + h + 2)), (X(L - bow), Y(yb + h)), (X(stern), Y(yb + h))]
    t.poly(inner, deck, 1, edge=0)
    nth = p.get('thwarts', 3); ths = []
    for i in range(nth):
        x = stern + 10 + (L - bow - stern - 16) * i / max(1, nth - 1)
        if p.get('cabin') and p['cabin'][0] - 4 < x < p['cabin'][1] + 4: continue
        t.line([(X(x), Y(yb + h + dp - 1)), (X(x), Y(yb + h + 1))], deck, 3, w=2); ths.append(x)
    t.line([(X(stern + 2), Y(yb + h + dp)), (X(L - bow - 4), Y(yb + h + dp)), (X(L - 3), Y(yb + h + 2))], hull, 3)
    # the near side
    if st == 'punt': side = [(X(0), Y(yb + h)), (X(6), Y(yb)), (X(L - 8), Y(yb)), (X(L), Y(yb + h))]
    elif st == 'tube': side = [(X(0), Y(yb + h)), (X(1), Y(yb + 3)), (X(5), Y(yb)), (X(L - 14), Y(yb)), (X(L - 2), Y(yb + h - 4)), (X(L), Y(yb + h))]
    else: side = [(X(0), Y(yb + h)), (X(stern), Y(yb + 1)), (X(stern + 4), Y(yb)), (X(L - bow - 4), Y(yb)), (X(L - bow * .4), Y(yb + h * .45)), (X(L), Y(yb + h + 2)), (X(L - 3), Y(yb + h + 2))]
    t.poly(side, hull, 2, vol=(2, 3), edge=None, gloss=st != 'tube')
    if st == 'clinker':
        for y in range(3, int(h) - 1, 3): t.line([(X(stern + 2), Y(yb + y)), (X(L - bow * .6), Y(yb + y))], hull, 1)
    if st == 'tube': t.line([(X(4), Y(yb + h * .5)), (X(L - 10), Y(yb + h * .5))], hull, 3); t.line([(X(L * .3), Y(yb + h - 1)), (X(L * .3), Y(yb + 1))], hull, 1); t.line([(X(L * .62), Y(yb + h - 1)), (X(L * .62), Y(yb + 1))], hull, 1)
    if p.get('stripe'): t.line([(X(stern + 1), Y(yb + h - 3)), (X(L - 5), Y(yb + h - 2))], KB, 3)
    if p.get('rub'): t.line([(X(0), Y(yb + h)), (X(L - 3), Y(yb + h + 1))], KB if p['rub'] is True else p['rub'], 3)
    seats = []
    # what stands in it
    if p.get('foredeck'):
        fd = p['foredeck']; t.poly([(X(L - bow - fd), Y(yb + h + dp)), (X(L - bow - 4), Y(yb + h + dp)), (X(L - 3), Y(yb + h + 2)), (X(L - bow - fd + 4), Y(yb + h))], p.get('deckc', hull), 3, vol=(1, 0), edge=1)
        t.poly([(X(L - bow - fd - 2), Y(yb + h + dp + 9)), (X(L - bow - fd + 5), Y(yb + h + dp + 1)), (X(L - bow - fd + 3), Y(yb + h + 1)), (X(L - bow - fd - 4), Y(yb + h + 9))], GLASS, 3, edge=1)
    if p.get('cabin'):
        c0, c1, ch = p['cabin']; cy = yb + h + 2
        t.rect(X(c0), Y(cy + ch), X(c1), Y(cy), KB, 2, vol=(2, 2), edge=1)
        nw = max(1, int((c1 - c0) / 16))
        for i in range(nw): t.rect(X(c0 + 3 + (c1 - c0 - 6) * i / nw + 1), Y(cy + ch - 3), X(c0 + 3 + (c1 - c0 - 6) * (i + 1) / nw - 2), Y(cy + ch * .45), GLASS, 1, vol=(1, 0))
        cab_seats = [(c0 + 3 + (c1 - c0 - 6) * (i + .5) / nw, cy + ch * .7) for i in range(nw)]
    if p.get('canopy'):
        c0, c1, ch = p['canopy']; cy = yb + h + dp
        for x in (c0 + 1, c1 - 1): t.line([(X(x), Y(cy + ch)), (X(x), Y(yb + h))], STEEL, 2)
        t.poly([(X(c0 - 3), Y(cy + ch)), (X(c0), Y(cy + ch + 4)), (X(c1), Y(cy + ch + 4)), (X(c1 + 3), Y(cy + ch))], p.get('canopyc', KC), 2, vol=(2, 1), edge=1)
    if p.get('funnel'): fx = p['funnel']; t.rect(X(fx - 3), Y(yb + h + 20), X(fx + 3), Y(yb + h + 3), BLACK, 2, vol=(1, 0), edge=1); t.rect(X(fx - 3), Y(yb + h + 17), X(fx + 3), Y(yb + h + 15), KB, 3); t.rect(X(fx - 9), Y(yb + h + 8), X(fx + 9), Y(yb + h + 2), IRON, 2, vol=(1, 1), edge=1)
    if p.get('outboard'): t.rect(X(-5), Y(yb + h + 8), X(1), Y(yb + h - 2), p.get('motorc', BLACK), 2, vol=(1, 2), edge=1); t.line([(X(-3), Y(yb + h - 2)), (X(-3), Y(yb - 2))], IRON, 2)
    if p.get('console'): cxn = p['console']; t.rect(X(cxn - 4), Y(yb + h + 12), X(cxn + 4), Y(yb + h + 1), WHITE, 2, vol=(1, 2), edge=1); t.line([(X(cxn + 4), Y(yb + h + 12)), (X(cxn + 6), Y(yb + h + 18))], GLASS, 3)
    if p.get('oars'):
        sw = math.sin(ph) * 10
        ox = ths[len(ths) // 2] if ths else L / 2
        t.line([(X(ox + 2), Y(yb + h)), (X(ox - 14 + sw), Y(yb - 4))], PALEWOOD, 2); t.line([(X(ox - 14 + sw), Y(yb - 4)), (X(ox - 19 + sw), Y(yb - 8))], PALEWOOD, 3, w=2)
    if p.get('pole'): t.line([(X(6), Y(yb + h + 40)), (X(2), Y(yb - 6))], PALEWOOD, 2)
    # water round it
    if not lift:
        for i, x in enumerate(range(-8, int(L) + 10, 13)): t.line([(X(x), Y(yb - 1 - (i % 2))), (X(x + 6), Y(yb - 1 - (i % 2)))], WATER, 3 + (i % 2))
    else:
        for i, x in enumerate(range(10, int(L) - 4, 17)): t.line([(X(x), Y(-2 - (i % 2))), (X(x + 7), Y(-2 - (i % 2)))], WATER, 3 + (i % 2))
    side_img = t.outline()
    helm = p.get('helm')
    hip = yb + h + 3
    if p.get('cabin') and p.get('helm_in'):
        for (sx, sy) in cab_seats[::-1]: seats.append(seat_head(X(sx), Y(sy), below=5))
    if helm is not None: seats.insert(0, seat_sit(X(helm), Y(hip), below=1))
    for x in ths[::-1]:
        if len(seats) >= 6: break
        if helm is not None and abs(x - helm) < 8: continue
        seats.append(seat_sit(X(x), Y(hip), below=1))
    while len(seats) < 6: seats.append(seat_sit(X(stern + 10 + len(seats) * 5), Y(hip), below=1))
    # ends: the boat seen along its length, a pointed oval
    ends = {}; es = {}
    for back in (False, True):
        e = Pt(FW, FH); cx = FW // 2; hl = min(118, L * .64); hw = w / 2; top = G - hl - 8
        ybow = G - 2 if not back else top
        pts = []
        for i in range(25):
            a = i / 24 * 2 * math.pi; yy = (G - 2 + top) / 2 + math.cos(a) * hl / 2 * (1 if not back else -1); k = abs(math.sin(a)) ** (.8 if st != 'punt' else .35)
            sq = 1 if (math.cos(a) > 0) else (.9 if st not in ('punt',) else 1)      # the stern is squarer
            pts.append((cx + math.sin(a) * hw * k * sq if math.sin(a) else cx, yy))
        e.poly(pts, hull, 2, vol=(2, 3), gloss=True)
        e.poly([(cx + (x - cx) * .78, (G - 2 + top) / 2 + (y - (G - 2 + top) / 2) * .86 - 1) for x, y in pts], deck, 1)
        ys = []
        for i in range(nth):
            yy = top + 12 + (hl - 22) * i / max(1, nth - 1)
            if back: yy = G - 2 - 12 - (hl - 22) * i / max(1, nth - 1) + 6
            e.line([(cx - hw * .7, yy), (cx + hw * .7, yy)], deck, 3, w=2); ys.append(yy)
        if p.get('cabin') or p.get('canopy'):
            c0, c1, ch = p.get('cabin') or p.get('canopy'); f0 = (c0 / L, c1 / L)
            ya = top + hl * (1 - f0[1]) if not back else top + hl * f0[0]; yb2 = top + hl * (1 - f0[0]) if not back else top + hl * f0[1]
            ya, yb2 = sorted((ya, yb2))
            e.rect(cx - hw * .7, ya - ch * .5, cx + hw * .7, yb2 - ch * .2, KB if p.get('cabin') else p.get('canopyc', KC), 2, vol=(2, 2), edge=1)
            if p.get('cabin'): e.rect(cx - hw * .6, yb2 - ch * .2 - 8 if not back else ya - ch * .5 + 3, cx + hw * .6, yb2 - ch * .2 - 3 if not back else ya - ch * .5 + 8, GLASS, 1)
        if p.get('outboard'): oy = top - 2 if not back else G - 4; e.rect(cx - 3, oy - 4, cx + 3, oy + 4, p.get('motorc', BLACK), 2, vol=(1, 1), edge=1)
        if p.get('oars'):
            oy = ys[len(ys) // 2] if ys else (top + G) / 2
            for sg in (-1, 1): e.line([(cx + sg * hw * .9, oy), (cx + sg * (hw + 16), oy + 6 + math.sin(ph) * 5)], PALEWOOD, 2); e.line([(cx + sg * (hw + 16), oy + 6 + math.sin(ph) * 5), (cx + sg * (hw + 21), oy + 8 + math.sin(ph) * 5)], PALEWOOD, 3, w=2)
        for i, x in enumerate(range(int(cx - hw) - 12, int(cx + hw) + 10, 12)): e.line([(x, G + (i % 2)), (x + 5, G + (i % 2))], WATER, 3 + (i % 2))
        ss = []
        order = ys if not back else ys
        # the one at the helm sits at the stern in a rowing boat, forward under a cabin
        yh = (top + 10 if not back else G - 12)
        if helm is not None: ss.append(seat_sit(cx, yh + (hl * (1 - helm / L) - 10 if not back else -(hl * (1 - helm / L)) + 10) * (1 if helm / L < .9 else .5) + 3, below=0))
        for i, yy in enumerate(ys):
            if len(ss) >= 6: break
            ss.append(seat_sit(cx + (0 if w < 46 else (-1) ** i * hw * .3), yy + 2, below=0))
        while len(ss) < 6: ss.append(seat_sit(cx + (-1) ** len(ss) * hw * .3, (top + G) / 2 + len(ss) * 3, below=0))
        ends['up' if back else 'down'] = e.outline(); es['up' if back else 'down'] = ss
    return (dict(right=side_img, left=mirror(side_img), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es))


def boats():
    return [
        (0, 'skiff', 'Clinker skiff', dict(L=132, w=48, style='clinker', hull=WOOD, floorc=DARKWOOD, oars=True, helm=None, thwarts=3), 'none'),
        (0, 'punt', 'Flat-bottomed punt', dict(L=150, w=40, h=9, style='punt', hull=DARKWOOD, floorc=WOOD, pole=True, thwarts=3, depth=6), 'none'),
        (0, 'dugout', 'Dugout', dict(L=140, w=30, h=9, bow=20, stern=10, hull=DARKWOOD, floorc=BLACK, oars=True, thwarts=3, depth=4), 'none'),
        (1800, 'dinghy', 'Painted dinghy', dict(L=120, w=50, rub=True, floorc=PALEWOOD, oars=True, thwarts=3), 'boatpaint'),
        (1800, 'whaler', 'Whaleboat', dict(L=176, w=52, bow=18, stern=12, rub=True, floorc=PALEWOOD, oars=True, thwarts=5), 'boatpaint'),
        (1800, 'punt', 'Pleasure punt', dict(L=160, w=40, h=9, style='punt', hull=PALEWOOD, floorc=WOOD, pole=True, thwarts=3, depth=6, rub=KB), 'boatpaint'),
        (1960, 'metal', 'Aluminium boat', dict(L=128, w=52, hull=STEEL, floorc=IRON, oars=True, thwarts=3, rub=CHROME), 'none'),
        (1960, 'glass', 'Fibreglass dinghy', dict(L=118, w=52, stripe=True, floorc=WHITE, oars=True, thwarts=3), 'bright'),
        (1960, 'inflatable', 'Inflatable', dict(L=116, w=56, style='tube', floorc=IRON, oars=True, thwarts=2, h=11), 'rubber'),
    ]


def motorboats():
    return [
        (1910, 'launch', 'Steam launch', dict(L=200, w=54, hull=KA, floorc=PALEWOOD, rub=KB, canopy=(60, 150, 24), funnel=104, helm=150, thwarts=5, bow=20), 'boatpaint'),
        (1910, 'runabout', 'Motor launch', dict(L=176, w=52, hull=DARKWOOD, floorc=PALEWOOD, rub=BRASS, foredeck=44, deckc=WOOD, helm=100, thwarts=4, bow=22), 'none'),
        (1910, 'work', 'Workboat', dict(L=190, w=58, h=14, hull=KA, floorc=WOOD, rub=BLACK, cabin=(112, 150, 26), helm=None, helm_in=True, funnel=96, thwarts=5, bow=18), 'boatpaint'),
        (1950, 'runabout', 'Mahogany runabout', dict(L=180, w=56, hull=DARKWOOD, floorc=LEATHER, rub=CHROME, foredeck=58, deckc=WOOD, helm=98, thwarts=4, bow=26, stern=2), 'none'),
        (1950, 'cruiser', 'Cabin cruiser', dict(L=214, w=64, h=15, floorc=PALEWOOD, rub=KB, cabin=(86, 158, 24), helm_in=True, thwarts=6, bow=26, stripe=True), 'boatpaint'),
        (1950, 'outboard', 'Outboard skiff', dict(L=140, w=52, floorc=WHITE, outboard=True, helm=14, thwarts=3, stripe=True), 'bright'),
        (1980, 'speed', 'Speedboat', dict(L=190, w=60, h=11, floorc=WHITE, stripe=True, foredeck=70, helm=96, thwarts=4, bow=34, stern=2, outboard=True, motorc=BLACK), 'bright'),
        (1980, 'rib', 'Rigid inflatable', dict(L=170, w=62, style='tube', h=12, floorc=IRON, console=92, helm=84, thwarts=4, outboard=True), 'rubber'),
        (1980, 'cruiser', 'Motor cruiser', dict(L=220, w=66, h=15, hull=WHITE, floorc=PALEWOOD, rub=KA, cabin=(80, 160, 26), helm_in=True, thwarts=6, bow=32, stripe=True), 'bright'),
        (2040, 'foil', 'Hydrofoil', dict(L=188, w=60, h=11, lift=12, floorc=WHITE, foredeck=74, helm=94, thwarts=4, bow=36, stern=2, rub=NEON), 'future'),
        (2040, 'jet', 'Patrol boat', dict(L=176, w=62, style='tube', h=12, floorc=IRON, cabin=(84, 124, 22), helm_in=True, helm=None, thwarts=5, rub=NEON), 'rubber'),
        (2040, 'solar', 'Solar launch', dict(L=200, w=58, hull=WHITE, floorc=PALEWOOD, rub=KA, canopy=(50, 156, 24), canopyc=SOLAR, helm=150, thwarts=5, bow=24), 'future'),
    ]
