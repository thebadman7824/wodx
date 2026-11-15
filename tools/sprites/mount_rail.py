# Trains and trams for the mount sprites (B6073-B6075). Own art in the mount painter's manner. A train's look is its
# engine with the tender and the first coach or wagon behind it, laid end to end at true size (37 pixels to the
# metre), so the drivers show in the cab and passengers at the coach windows. x runs from the tail to the head, y up
# from the rail head.
import math, numpy as np
from mountkit import *
import mount_beasts as MB

SOOT = ramp((40, 40, 44)); COPPER = ramp((184, 112, 62)); BUFFER = ramp((70, 70, 76)); PLATE = ramp((60, 60, 66))


def _wheel(t, X, Y, x, r, ph, kind='spoke', counter=True):
    """a railway wheel side on: a flange ring, spokes or a disc, a crank boss; a crescent counterweight on drivers"""
    t.ell(X(x), Y(r), r, r, PLATE, 1)
    if kind == 'spoke':
        t.ell(X(x), Y(r), r - 1.5, r - 1.5, SOOT, 2, vol=(1, 1)); t.ell(X(x), Y(r), r - 3.5, r - 3.5, SOOT, 0)
        n = 10 if r < 20 else 16 if r > 28 else 14
        for i in range(n):
            a = ph + i * 2 * math.pi / n
            t.line([(X(x), Y(r)), (X(x) + math.cos(a) * (r - 3), Y(r) + math.sin(a) * (r - 3))], KB, 2)
        if counter and r > 18:
            a0 = math.degrees(ph) + 150
            t.arc(X(x), Y(r), r * .55, r * .55, a0, a0 + 70, KB, 1, w=int(r * .3))
        t.ell(X(x), Y(r), max(2, r * .18), max(2, r * .18), KB, 3)
    else:
        t.ell(X(x), Y(r), r - 1.5, r - 1.5, STEEL, 1, vol=(1, 1)); t.ell(X(x), Y(r), r * .55, r * .55, STEEL, 2)
        t.ell(X(x), Y(r), 2, 2, STEEL, 3)


def _bogie(t, X, Y, x, r, ph, gap=None, kind='disc', frame=None):
    """a two-axle truck: two wheels and a sprung side frame"""
    gap = gap or r * 2.6; frame = frame or PLATE
    for dx in (-gap / 2, gap / 2): _wheel(t, X, Y, x + dx, r, ph, kind, counter=False)
    t.rect(X(x - gap / 2 - r * .4), Y(r + 4), X(x + gap / 2 + r * .4), Y(r - 2), frame, 2, vol=(1, 1), edge=1)
    t.rect(X(x - 4), Y(r + 2), X(x + 4), Y(r - 4), frame, 1, edge=0)
    for dx in (-gap / 2, gap / 2): t.ell(X(x + dx), Y(r), 2.5, 2.5, frame, 3)


def _buffers(t, X, Y, x, h, sg):
    """buffers and a coupling at an end: sg +1 at the head, -1 at the tail"""
    t.rect(X(x), Y(h + 4), X(x + sg * 5), Y(h - 3), BUFFER, 2, vol=(1, 1))
    t.rect(X(x + sg * 5), Y(h + 5), X(x + sg * 7), Y(h - 4), BUFFER, 3)
    t.line([(X(x), Y(h - 6)), (X(x + sg * 6), Y(h - 6))], IRON, 2)


# ---- a steam engine ----
def steam(t, X, Y, p, ph):
    """p: L, drivers [(x, r)], lead [(x, r)], trail, bc (boiler centre), br (radius), chim (height), cab (x0, x1, roof), knobs.
    -> (seats, head end x)"""
    L = p['L']; bc = p['bc']; br = p['br']; fb = p.get('frame', 22); seats = []
    b0, b1 = p.get('boiler', (p['cab'][1] - 4, L - 4))
    # the frame and the running board
    t.rect(X(6), Y(fb + 6), X(L - 4), Y(fb - 8), SOOT, 1, edge=0)
    rb = p.get('board', fb + 8)
    t.rect(X(p['cab'][0]), Y(rb + 2), X(L - 6), Y(rb), SOOT, 2, vol=(1, 0))
    if p.get('valance'): t.line([(X(p['cab'][1]), Y(rb - 1)), (X(L - 8), Y(rb - 1))], KB, 3)
    # the boiler: a cylinder lit from the top, banded with brass or steel rings
    t.rect(X(b0), Y(bc + br), X(b1), Y(bc - br), KA, 2, vol=(int(br * .5), int(br * .45)))
    t.line([(X(b0), Y(bc + br - 2)), (X(b1), Y(bc + br - 2))], KA, 4)
    for x in p.get('bands', [b0 + (b1 - b0) * k / 4 for k in range(1, 4)]): t.line([(X(x), Y(bc + br)), (X(x), Y(bc - br))], BRASS if p.get('brass') else STEEL, 2)
    # the smokebox at the front, black, with its round door seen edge on
    sx0 = b1 - p.get('smoke', 20)
    t.rect(X(sx0), Y(bc + br + 1), X(b1 + 2), Y(bc - br - 1), SOOT, 2, vol=(2, 2))
    t.rect(X(b1 + 2), Y(bc + br - 3), X(b1 + 4), Y(bc - br + 3), SOOT, 3)
    # the chimney
    cx = p.get('chimx', sx0 + 10); ch = p['chim']; cw = p.get('chimw', 5); stk = p.get('stack', 'plain')
    t.rect(X(cx - cw), Y(ch - 4), X(cx + cw), Y(bc + br - 1), SOOT, 2, vol=(0, 0), edge=1)
    if stk == 'copper': t.rect(X(cx - cw - 2), Y(ch), X(cx + cw + 2), Y(ch - 6), COPPER, 2, vol=(1, 2), edge=1)
    elif stk == 'balloon': t.poly([(X(cx - cw), Y(ch - 14)), (X(cx - cw - 9), Y(ch - 2)), (X(cx - cw - 7), Y(ch + 2)), (X(cx + cw + 7), Y(ch + 2)), (X(cx + cw + 9), Y(ch - 2)), (X(cx + cw), Y(ch - 14))], SOOT, 2, vol=(2, 2), edge=1)
    elif stk == 'flared': t.rect(X(cx - cw - 2), Y(ch), X(cx + cw + 2), Y(ch - 3), SOOT, 3)
    else: t.rect(X(cx - cw - 1), Y(ch), X(cx + cw + 1), Y(ch - 2), SOOT, 3)
    # domes: steam (brass) and sand
    for dx, col in p.get('domes', [((b0 + sx0) / 2, BRASS)]):
        t.poly([(X(dx - 8), Y(bc + br - 1)), (X(dx - 6), Y(bc + br + 6)), (X(dx - 3), Y(bc + br + 9)), (X(dx + 3), Y(bc + br + 9)), (X(dx + 6), Y(bc + br + 6)), (X(dx + 8), Y(bc + br - 1))], col, 2, vol=(2, 2), edge=1)
    if p.get('whistle'): t.line([(X(b0 + 4), Y(bc + br)), (X(b0 + 4), Y(bc + br + 8))], BRASS, 3)
    # side tanks or a firebox
    if p.get('tanks'):
        t0, t1 = p['tanks']; t.rect(X(t0), Y(bc + br - 4), X(t1), Y(rb), KA, 2, vol=(2, 2), edge=1)
        t.line([(X(t0 + 2), Y((bc + br + rb) / 2)), (X(t1 - 2), Y((bc + br + rb) / 2))], KB, 3)
        for x in range(int(t0) + 4, int(t1) - 2, 8): t.px(X(x), Y(bc + br - 6), KA, 4)
    # the cylinder and the motion
    cy0 = p.get('cyl', L - 26); cr = p.get('cylr', 8)
    t.rect(X(cy0 - 12), Y(fb + cr), X(cy0 + 14), Y(fb - cr + 2), KA if p.get('cylpaint') else SOOT, 2, vol=(2, 2), edge=1)
    t.line([(X(cy0 - 10), Y(fb + cr - 3)), (X(cy0 + 12), Y(fb + cr - 3))], STEEL, 3)
    # the wheels: leading, coupled drivers, trailing; the far ones a shade darker behind
    for x, r in p.get('lead', []) + p.get('trail', []): _wheel(t, X, Y, x, r, ph, 'spoke', counter=False)
    drv = p['drivers']
    for x, r in drv: _wheel(t, X, Y, x, r, ph)
    if p.get('splasher'):
        for x, r in drv: t.arc(X(x), Y(r), r + 2, r + 2, 180, 360, KA, 2, w=3)
    # coupling rod between the crank pins, the connecting rod back from the crosshead
    if drv:
        k = .55
        pins = [(X(x) + math.cos(ph) * r * k, Y(r) + math.sin(ph) * r * k) for x, r in drv]
        if len(pins) > 1: t.line(pins, STEEL, 3, w=3); t.line(pins, STEEL, 4)
        main = pins[min(1, len(pins) - 1)] if len(pins) > 2 else pins[0]
        xh = X(cy0 - 14) + math.cos(ph) * 6
        t.line([main, (xh, Y(fb))], STEEL, 2, w=3); t.line([(xh, Y(fb)), (X(cy0 - 12), Y(fb))], STEEL, 3, w=2)
        for q in pins: t.ell(q[0], q[1], 1.6, 1.6, CHROME, 4)
    # the front: buffer beam, buffers or a cowcatcher, lamps, a headlamp
    head = L
    t.rect(X(L - 6), Y(fb + 6), X(L), Y(fb - 6), KB if not p.get('redbeam') else REDL, 2, vol=(1, 1), edge=1)
    if p.get('pilot'):
        pl = p['pilot']; t.poly([(X(L - 2), Y(fb - 2)), (X(L + pl), Y(2)), (X(L - 2), Y(2))], IRON, 2, vol=(1, 1), edge=1)
        for x in range(int(L), int(L + pl), 4): t.line([(X(x), Y(fb - 2 - (x - L) * (fb - 4) / pl)), (X(x), Y(3))], IRON, 3)
        head = L + pl
    else:
        _buffers(t, X, Y, L, fb, 1); head = L + 7
    if p.get('headlamp'):
        hx = p['headlamp']; t.rect(X(hx - 6), Y(bc + br + 14), X(hx + 6), Y(bc + br + 2), BRASS if p.get('brass') else SOOT, 2, vol=(1, 1), edge=1)
        t.rect(X(hx + 6), Y(bc + br + 11), X(hx + 8), Y(bc + br + 5), LAMP, 4)
    else:
        t.rect(X(L - 3), Y(fb + 13), X(L), Y(fb + 8), LAMP, 4)
    if p.get('casing'):
        # a streamlined shroud over the boiler: a long rounded nose, a skirt over the wheels
        c0 = p['cab'][1] - 2
        nose = [(c0, rb - 6), (c0, bc + br + 10), (c0 + 30, bc + br + 14), (L - 34, bc + br + 12), (L - 10, bc + br), (L + 4, bc), (L + 8, fb + 6), (L + 6, fb - 4), (L - 8, fb - 8), (c0, fb - 8)]
        t.poly([(X(x), Y(y)) for x, y in nose], KA, 2, vol=(5, 4), gloss=True, edge=1)
        t.line([(X(c0 + 2), Y(rb + 2)), (X(L + 2), Y(rb + 2))], KB, 3, w=3); t.line([(X(c0 + 2), Y(rb + 6)), (X(L - 2), Y(rb + 6))], KB, 4)
        for x, r in drv: t.rect(X(x - r), Y(rb - 6), X(x + r), Y(rb - 8), KA, 1)
        t.ell(X(L + 2), Y(bc - 4), 3, 3, LAMP, 4)
        head = L + 10
    # the cab
    c0, c1, roof = p['cab']; cab = p.get('cabstyle', 'closed')
    if cab == 'none':
        t.rect(X(c0), Y(rb + 10), X(c1), Y(rb), SOOT, 2, vol=(1, 1))
        t.line([(X(c0 + 2), Y(rb + 10)), (X(c0 + 2), Y(rb + 22))], IRON, 2); t.line([(X(c0 + 2), Y(rb + 22)), (X(c1 - 2), Y(rb + 22))], IRON, 2)
        seats.append(dict(x=X(c0 + (c1 - c0) * .6), y=Y(rb), cut=112, pose='sit')); seats.append(dict(x=X(c0 + (c1 - c0) * .3), y=Y(rb), cut=112, pose='sit'))
    else:
        t.rect(X(c0), Y(roof), X(c1), Y(rb), KA, 2, vol=(2, 2), edge=1)
        t.poly([(X(c0 - 3), Y(roof + 2)), (X(c0 - 1), Y(roof + 6)), (X(c1 + 1), Y(roof + 6)), (X(c1 + 3), Y(roof + 2))], SOOT if not p.get('casing') else KA, 2, vol=(1, 1), edge=1)
        wy0, wy1 = rb + (roof - rb) * .52, roof - 6
        if cab == 'open':
            t.rect(X(c0 + 2), Y(wy1 + 2), X(c1 - 10), Y(rb + 10), BLACK, 0)
            seats.append(dict(x=X(c0 + 10), y=Y(rb), cut=112, pose='sit'))
        else:
            t.rect(X(c0 + 4), Y(wy1), X(c1 - 6), Y(wy0), GLASS, 1, vol=(1, 0))
            seats.append(seat_head(X(c1 - 12), Y((wy0 + wy1) / 2 - 2), below=6))
        t.rect(X(c1 - 4), Y(wy1 + 2), X(c1 - 1), Y(wy0 - 2), GLASS, 3)
        t.line([(X(c0 + 1), Y(rb + 2)), (X(c1 - 1), Y(rb + 2))], KB, 3)
        if cab != 'open': seats.append(seat_head(X(c0 + 12), Y((wy0 + wy1) / 2 - 3), below=6))
        if p.get('number'): t.rect(X((c0 + c1) / 2 - 6), Y(rb + 12), X((c0 + c1) / 2 + 6), Y(rb + 8), BRASS, 3)
    _buffers(t, X, Y, 0, fb, -1)
    return seats, head


def tender(t, X, Y, p, ph):
    """the tender behind the engine: a tank of water, coal heaped on top, on axles or bogies"""
    L = p['L']; h = p['h']; fb = p.get('frame', 22)
    t.rect(X(2), Y(fb + 4), X(L - 2), Y(fb - 6), SOOT, 1)
    if p.get('barrel'):
        t.ell(X(L * .5), Y(fb + 18), L * .4, 16, DARKWOOD, 2, vol=(4, 3), edge=1)
        for x in (L * .25, L * .5, L * .75): t.line([(X(x), Y(fb + 33)), (X(x), Y(fb + 3))], IRON, 1)
    else:
        t.rect(X(2), Y(h), X(L - 2), Y(fb + 2), KA, 2, vol=(2, 2), edge=1)
        t.line([(X(4), Y(h - 3)), (X(L - 4), Y(h - 3))], KB, 3)
        t.line([(X(4), Y(fb + 6)), (X(L - 4), Y(fb + 6))], KB, 3)
        # the coal: a heap of dark clusters with a few glints, not single pixels
        heap = [(X(6), Y(h)), (X(10), Y(h + 7)), (X(L * .3), Y(h + 11)), (X(L * .7), Y(h + 10)), (X(L - 8), Y(h + 4)), (X(L - 6), Y(h))]
        t.poly(heap, SOOT, 1, vol=(2, 0))
        for i, x in enumerate(range(12, int(L) - 10, 7)): t.rect(X(x), Y(h + 6 + (i % 3)), X(x + 2), Y(h + 5 + (i % 3)), SOOT, 3)
    if p.get('bogies'):
        for x in (L * .22, L * .78): _bogie(t, X, Y, x, 14, ph, kind='spoke')
    else:
        for x in p.get('axles', (L * .2, L * .5, L * .8)): _wheel(t, X, Y, x, 14, ph, 'spoke', counter=False)
    _buffers(t, X, Y, 0, fb, -1)


def coach(t, X, Y, p, ph):
    """a coach, a van or a wagon: p kind (coach, open, van, tank, flat, chaldron), L, h, roof, windows, axles or bogies -> seats"""
    L = p['L']; h = p['h']; fb = p.get('frame', 22); kind = p.get('kind', 'coach'); seats = []
    floor = fb + 4
    t.rect(X(2), Y(fb + 2), X(L - 2), Y(fb - 6), SOOT, 1)
    paint = KC if p.get('own') else KA
    if kind == 'coach':
        roof = p.get('roof', 'arc')
        t.rect(X(0), Y(h), X(L), Y(floor), paint, 2, vol=(2, 3), edge=1)
        if roof == 'arc': t.poly([(X(-1), Y(h)), (X(2), Y(h + 6)), (X(10), Y(h + 9)), (X(L - 10), Y(h + 9)), (X(L - 2), Y(h + 6)), (X(L + 1), Y(h))], PLATE, 2, vol=(2, 1), edge=1)
        elif roof == 'clere':
            t.poly([(X(-1), Y(h)), (X(1), Y(h + 4)), (X(L - 1), Y(h + 4)), (X(L + 1), Y(h))], PLATE, 2, vol=(1, 1), edge=1)
            t.rect(X(12), Y(h + 11), X(L - 12), Y(h + 4), PLATE, 2, vol=(1, 1), edge=1)
            for x in range(16, int(L) - 14, 10): t.rect(X(x), Y(h + 9), X(x + 5), Y(h + 6), GLASS, 2)
        elif roof == 'flat': t.rect(X(-1), Y(h + 3), X(L + 1), Y(h), PLATE, 2, vol=(1, 1), edge=1)
        elif roof == 'stage':                        # the earliest: coach bodies on a frame, luggage on the roof
            t.rect(X(6), Y(h + 7), X(L - 6), Y(h), LEATHER, 2, vol=(1, 1), edge=1)
        # waist and panelling
        t.line([(X(1), Y(floor + (h - floor) * .42)), (X(L - 1), Y(floor + (h - floor) * .42))], KB, 3, w=2)
        if p.get('two'): t.rect(X(1), Y(h - 1), X(L - 1), Y(floor + (h - floor) * .44), KC, 2, vol=(1, 0))
        n = p.get('windows', 8); w0 = p.get('wx0', 8); span = L - 2 * w0
        wy0, wy1 = floor + (h - floor) * .5, h - 5
        doors = p.get('doors', 'ends')
        for i in range(n):
            a = w0 + span * i / n + 2; b = w0 + span * (i + 1) / n - 2
            if doors == 'compart' and i % 2 == 1:
                t.rect(X(a), Y(h - 3), X(b), Y(floor + 2), paint, 3, edge=1); t.rect(X(a + 2), Y(wy1), X(b - 2), Y(wy0 + 2), GLASS, 1, vol=(1, 0)); t.px(X(b - 2), Y(wy0 - 3), BRASS, 4)
                continue
            t.rect(X(a), Y(wy1), X(b), Y(wy0), GLASS, 1, vol=(1, 0))
            if p.get('round'): t.px(X(a), Y(wy1), paint, 2); t.px(X(b), Y(wy1), paint, 2)
            if len(seats) < 6 and i % 2 == 0: seats.append(seat_head(X((a + b) / 2), Y((wy0 + wy1) / 2), below=int((wy1 - wy0) / 2)))
        if doors == 'ends':
            for x in (3, L - 9): t.rect(X(x), Y(h - 3), X(x + 6), Y(floor + 1), paint, 1, edge=0); t.rect(X(x + 1), Y(wy1), X(x + 5), Y(wy0 + 4), GLASS, 2)
        if p.get('stripe'): t.line([(X(1), Y(floor + 5)), (X(L - 1), Y(floor + 5))], KB, 4, w=2)
        if p.get('steps'): t.rect(X(6), Y(floor), X(L - 6), Y(floor - 3), SOOT, 2)
    elif kind in ('open', 'chaldron'):
        if kind == 'chaldron':
            t.poly([(X(4), Y(h)), (X(10), Y(floor)), (X(L - 10), Y(floor)), (X(L - 4), Y(h))], DARKWOOD, 2, vol=(1, 2), edge=1)
            for x in range(10, int(L) - 8, 8): t.line([(X(x), Y(h - 1)), (X(x + 2), Y(floor + 1))], IRON, 2)
        else:
            t.rect(X(0), Y(h), X(L), Y(floor), paint, 2, vol=(1, 2), edge=1)
            for x in range(6, int(L) - 4, 14): t.line([(X(x), Y(h - 1)), (X(x), Y(floor + 1))], paint, 1)
            t.line([(X(1), Y(h - 1)), (X(L - 1), Y(h - 1))], paint, 4)
        load = p.get('load', 'coal')
        if load == 'coal':
            for i, x in enumerate(range(8, int(L) - 8, 6)): t.rect(X(x), Y(h + 3 + (i % 3)), X(x + 4), Y(h), SOOT, 1 + (i % 2))
        elif load == 'logs':
            for k in range(3): t.rect(X(2 + k * 4), Y(h + 5 + k * 5), X(L - 2 - k * 4), Y(h + 1 + k * 5), DARKWOOD, 2, vol=(1, 1), edge=1)
    elif kind == 'van':
        t.rect(X(0), Y(h), X(L), Y(floor), paint, 2, vol=(2, 3), edge=1)
        t.poly([(X(-1), Y(h)), (X(4), Y(h + 6)), (X(L - 4), Y(h + 6)), (X(L + 1), Y(h))], PLATE, 2, vol=(1, 1), edge=1)
        for x in range(4, int(L) - 2, 6): t.line([(X(x), Y(h - 1)), (X(x), Y(floor + 1))], paint, 1)
        dx = L / 2; t.rect(X(dx - 12), Y(h - 2), X(dx + 12), Y(floor + 2), paint, 3, edge=1)
        t.line([(X(dx - 12), Y(floor + (h - floor) / 2)), (X(dx + 12), Y(floor + (h - floor) / 2))], IRON, 2)
        if p.get('letters'): t.rect(X(10), Y(h - 6), X(dx - 16), Y(h - 10), WHITE, 3)
    elif kind == 'tank':
        R = 36; cy = floor + 6 + R
        t.rect(X(4), Y(floor + 4), X(L - 4), Y(floor), PLATE, 2)
        for x in (L * .2, L * .5, L * .8): t.rect(X(x - 6), Y(floor + 14), X(x + 6), Y(floor + 2), PLATE, 1, edge=0)
        t.rect(X(6 + R * .3), Y(cy + R), X(L - 6 - R * .3), Y(cy - R), paint, 2, vol=(9, 8), gloss=True)
        for sg, x in ((-1, 6 + R * .3), (1, L - 6 - R * .3)): t.ell(X(x), Y(cy), R * .3, R, paint, 2, vol=(9, 8))
        for x in (L * .25, L * .75): t.line([(X(x), Y(cy + R)), (X(x), Y(cy - R))], paint, 1)
        t.rect(X(L / 2 - 8), Y(cy + R + 8), X(L / 2 + 8), Y(cy + R - 1), paint, 3, vol=(1, 1), edge=1)
        t.line([(X(L * .3), Y(cy + R + 3)), (X(L * .7), Y(cy + R + 3))], STEEL, 2)
    elif kind == 'flat':
        t.rect(X(0), Y(floor + 3), X(L), Y(floor), PLATE, 2)
        for k, (c0, c1) in enumerate(p.get('boxes', [(4, L * .48), (L * .52, L - 4)])):
            col = (KA, KB, KC)[k % 3]
            t.rect(X(c0), Y(floor + 92), X(c1), Y(floor + 4), col, 2, vol=(2, 3), edge=1)
            for x in range(int(c0) + 4, int(c1) - 2, 5): t.line([(X(x), Y(floor + 88)), (X(x), Y(floor + 8))], col, 1)
            for x in (c0 + 2, c1 - 6): t.rect(X(x), Y(floor + 90), X(x + 4), Y(floor + 6), col, 3)
            t.rect(X(c1 - 30), Y(floor + 80), X(c1 - 12), Y(floor + 72), WHITE, 3)
    if p.get('bogies'):
        bg = p['bogies']; r = p.get('r', 16)
        for x in (bg, L - bg): _bogie(t, X, Y, x, r, ph, kind=p.get('wheel', 'disc'))
    else:
        for x in p.get('axles', (L * .25, L * .75)): _wheel(t, X, Y, x, p.get('r', 16), ph, p.get('wheel', 'spoke'), counter=False)
    _buffers(t, X, Y, 0, fb, -1); _buffers(t, X, Y, L, fb, 1)
    return seats


def motor_unit(t, X, Y, p, ph):
    """a diesel or electric engine, a railcar or a high-speed power car: a long body, a cab at the head, bogies or skirts.
    p: L, h, nose (flat, hood, round, wedge, bullet), roof gear, windows, knobs -> (seats, head)"""
    L = p['L']; h = p['h']; fb = p.get('frame', 22); floor = fb + 4; nose = p.get('nose', 'flat'); seats = []
    nl = p.get('nosel', 0)
    # the body outline by nose shape, the head at the right
    if nose == 'flat': body = [(0, floor), (0, h), (L - 2, h), (L, h - 3), (L, floor)]
    elif nose == 'round': body = [(0, floor), (0, h), (L - nl, h), (L - nl * .35, h - (h - floor) * .25), (L, floor + (h - floor) * .45), (L, floor)]
    elif nose == 'hood':
        hh = floor + (h - floor) * .6
        body = [(0, floor), (0, h - 2), (2, h), (L - nl - 2, h), (L - nl, h - 2), (L - nl, hh), (L - 2, hh), (L, hh - 2), (L, floor)]
    elif nose == 'wedge': body = [(0, floor), (0, h), (L - nl, h), (L - nl * .2, floor + (h - floor) * .35), (L, floor + 4), (L, floor)]
    else: body = [(0, floor - 4), (0, h), (L - nl, h), (L - nl * .55, h - (h - floor) * .18), (L - nl * .15, floor + (h - floor) * .35), (L, floor + 2), (L - 2, floor - 4)]
    t.poly([(X(x), Y(y)) for x, y in body], KA, 2, vol=(3, 4), gloss=nose in ('round', 'wedge', 'bullet'), edge=1)
    if p.get('stripe'): t.line([(X(1), Y(floor + 6)), (X(L - 2), Y(floor + 6))], KB, 3, w=3)
    if p.get('band'): t.line([(X(1), Y(h - 6)), (X(L - nl - 2), Y(h - 6))], KC, 3, w=2)
    # roof gear: a pantograph, fans, an exhaust stack
    if p.get('panto'):
        px_ = p['panto']; up = h + 14 + math.sin(ph * 2) * 0
        t.rect(X(px_ - 10), Y(h + 3), X(px_ + 10), Y(h), PLATE, 2)
        t.line([(X(px_ - 8), Y(h + 3)), (X(px_ + 2), Y(up))], STEEL, 2); t.line([(X(px_ + 2), Y(up)), (X(px_ - 4), Y(up + 10))], STEEL, 2)
        t.line([(X(px_ - 12), Y(up + 10)), (X(px_ + 4), Y(up + 10))], STEEL, 3, w=2)
    if p.get('fans'):
        for x in p['fans']: t.ell(X(x), Y(h + 1), 7, 2, PLATE, 2); t.rect(X(x - 5), Y(h + 2), X(x + 5), Y(h + 1), SOOT, 1)
    if p.get('stack'): t.rect(X(p['stack'] - 3), Y(h + 6), X(p['stack'] + 3), Y(h), SOOT, 2)
    if p.get('grille'):
        g0, g1 = p['grille']
        for x in range(int(g0), int(g1), 3): t.line([(X(x), Y(h - 8)), (X(x), Y(floor + (h - floor) * .5))], KA, 1)
    # windows: the passengers' row and the cab's own
    wy0, wy1 = floor + (h - floor) * .48, h - 6
    for a, b in p.get('wins', []):
        t.rect(X(a), Y(wy1), X(b), Y(wy0), GLASS, 1, vol=(1, 0))
        if len(seats) < 6: seats.append(seat_head(X((a + b) / 2), Y((wy0 + wy1) / 2), below=int((wy1 - wy0) / 2)))
    if p.get('ribbon'):
        a, b = p['ribbon']; t.rect(X(a), Y(wy1), X(b), Y(wy0), GLASS, 1, vol=(1, 0))
        for k in range(4): seats.append(seat_head(X(a + (b - a) * (k + .5) / 4), Y((wy0 + wy1) / 2), below=int((wy1 - wy0) / 2)))
    for d in p.get('doors', []): t.rect(X(d - 5), Y(h - 3), X(d + 5), Y(floor + 1), KA, 1, edge=0); t.rect(X(d - 4), Y(wy1), X(d + 4), Y(wy0 - 6), GLASS, 2)
    # the cab glass at the head
    if nose == 'hood':
        c1 = L - nl - 1; t.rect(X(c1 - 14), Y(h - 4), X(c1 - 1), Y(wy0), GLASS, 1, vol=(1, 0)); cab = (c1 - 7, (wy0 + h - 4) / 2)
    elif nose == 'flat':
        t.rect(X(L - 16), Y(wy1), X(L - 3), Y(wy0), GLASS, 1, vol=(1, 0)); cab = (L - 9, (wy0 + wy1) / 2)
    elif nose == 'round':
        t.poly([(X(L - nl + 2), Y(h - 3)), (X(L - nl * .35), Y(h - (h - floor) * .27)), (X(L - nl * .2), Y(wy0)), (X(L - nl + 2), Y(wy0))], GLASS, 1, vol=(1, 0)); cab = (L - nl * .6, (wy0 + h) / 2)
    else:
        t.poly([(X(L - nl), Y(h - 3)), (X(L - nl * .45), Y(floor + (h - floor) * .62)), (X(L - nl * .55), Y(floor + (h - floor) * .5)), (X(L - nl - 4), Y(floor + (h - floor) * .5))], GLASS, 1, vol=(1, 0)); cab = (L - nl * .75, floor + (h - floor) * .62)
    seats.insert(0, seat_head(X(cab[0]), Y(cab[1]), below=5))
    # lamps at the head
    if nose in ('wedge', 'bullet'): t.line([(X(L - nl * .25), Y(floor + 8)), (X(L - 4), Y(floor + 5))], LAMP, 4)
    else: t.rect(X(L - 2), Y(floor + 10), X(L + 1), Y(floor + 6), LAMP, 4); t.px(X(L), Y(h - 4), LAMP, 3)
    # the running gear: bogies, or a skirt and a guideway for a magnetic train
    if p.get('maglev'):
        t.rect(X(2), Y(floor + 2), X(L - 6), Y(fb - 12), KB, 2, vol=(1, 2), edge=1)
        t.line([(X(4), Y(fb - 10)), (X(L - 8), Y(fb - 10))], NEON, 3)
    else:
        if p.get('skirt'): t.rect(X(4), Y(floor + 1), X(L - nl * .4 - 2), Y(floor - 6), KA, 1, edge=0)
        r = p.get('r', 16)
        for x in p.get('bogies', (L * .18, L * .82)): _bogie(t, X, Y, x, r, ph, gap=p.get('gap'), kind='disc')
        _buffers(t, X, Y, 0, fb, -1)
        if nose in ('flat', 'hood'): _buffers(t, X, Y, L, fb, 1)
    return seats, L + 2


def train(p, ph=0):
    """a train: vehicles laid tail to head, the engine at the head. p: parts [(kind, knobs)], FH. -> ({facing: picture}, {facing: seats})"""
    FH = p.get('FH', 208); G = FH - 12; gapc = 6
    lens = [k['L'] + (k.get('pilot') or 0) + 10 for _, k in p['parts']]
    total = sum(lens) + gapc * (len(lens) - 1) + (110 if p.get('horse') else 0)
    FW = int(math.ceil((total + 40) / 16) * 16)
    t = Pt(FW, FH); x = (FW - total) // 2; seats = []; drivers = []
    for (kind, k), ln in zip(p['parts'], lens):
        X = (lambda o: (lambda v: o + v))(x + 4); Y = lambda y: G - y
        if kind == 'steam': ss, _ = steam(t, X, Y, k, ph); drivers = ss
        elif kind == 'tender': tender(t, X, Y, k, ph)
        elif kind == 'motor' and k.get('flip'):
            tmp = Pt(FW, FH); ss, _ = motor_unit(tmp, X, Y, k, ph); a, b = x + 4 - 8, x + 4 + k['L'] + 8
            tmp.c[:, a:b] = tmp.c[:, a:b][:, ::-1].copy(); t.paste(tmp.c)
            seats += [dict(q, x=a + b - 1 - q['x']) for q in ss]
        elif kind == 'motor': ss, _ = motor_unit(t, X, Y, k, ph); drivers = ss[:1]; seats += ss[1:]
        else: seats += coach(t, X, Y, k, ph)
        x += ln + gapc
    if p.get('horse'):
        # a horse on the path between the rails, drawing the wagons by a chain
        a = MB.beast('horse_large', s=1.66, heavy=1.2); hfr, _ = MB.draw(a, 'none', (), int(ph / math.pi * 4) % 8)
        hfr = {q: recolour(v, dict(a=ramp((112, 70, 40)), b=ramp((36, 28, 24)))) for q, v in hfr.items()}
        t.line([(x - gapc - 2, G - 22), (x + 40, G - 46)], IRON, 2)
        t.paste(hfr['right'], x - 34, G - MB.GROUND)
        drivers = [dict(x=x - 20, y=G, cut=112, pose='sit')]
    t.shadow(FW / 2, G + 1, total / 2 + 4, 3)
    side = t.outline()
    seats = (drivers + seats[::-1])[:10]
    # --- ends ---
    head = p['parts'][-1]; tail = p['parts'][0]
    ends = {}; es = {}
    for back in (False, True):
        e = Pt(FW, FH); cx = FW // 2
        kind, k = tail if back else head
        ss = _end(e, kind, k, cx, G, back and not k.get('flip'))
        if p.get('horse') and not back:
            e.paste(hfr['down'], cx - MB.FW // 2, G - MB.GROUND + 10); ss = [dict(x=cx + 30, y=G, cut=112, pose='sit')] + ss
        e.shadow(cx, G + 1, 62, 4)
        ends['up' if back else 'down'] = e.outline(); es['up' if back else 'down'] = ss
    return _rnd((dict(right=side, left=mirror(side), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es)))


def _end(e, kind, k, cx, G, back):
    """an engine's face or a coach's end, seen along the track"""
    Y = lambda y: G - y; fb = k.get('frame', 22); W = k.get('w', 112); hw = W / 2; seats = []
    for sg in (-1, 1):                                       # wheels end on, then the buffers
        e.rect(cx + sg * 30 - 3, Y(18), cx + sg * 30 + 3, Y(0), SOOT, 1)
        e.rect(cx + sg * 40 - 5, Y(fb + 5), cx + sg * 40 + 5, Y(fb - 5), BUFFER, 2, vol=(1, 1), edge=1)
    e.rect(cx - hw + 8, Y(fb + 8), cx + hw - 8, Y(fb - 6), KB if kind == 'steam' else SOOT, 2, vol=(1, 1), edge=1)
    if kind == 'steam' and not back:
        bc, br = k['bc'], k['br']; c0, c1, roof = k['cab']
        if k.get('casing'):
            e.poly([(cx - hw + 6, Y(fb + 8)), (cx - hw + 2, Y(bc)), (cx - 30, Y(bc + br + 12)), (cx + 30, Y(bc + br + 12)), (cx + hw - 2, Y(bc)), (cx + hw - 6, Y(fb + 8))], KA, 2, vol=(5, 3), gloss=True, edge=1)
            e.ell(cx, Y(bc - 4), 5, 5, LAMP, 4); e.line([(cx - hw + 6, Y(fb + 14)), (cx + hw - 6, Y(fb + 14))], KB, 3, w=3)
            seats = [seat_hidden(cx, Y(roof))]
        else:
            if k.get('cabstyle', 'closed') != 'none':
                e.rect(cx - hw + 10, Y(roof), cx + hw - 10, Y(k.get('board', fb + 8)), KA, 1, vol=(1, 1), edge=1)
                e.rect(cx - hw + 10, Y(roof + 6), cx + hw - 10, Y(roof + 1), SOOT, 2)
                for sg in (-1, 1): e.rect(cx + sg * (hw - 22) - 7, Y(roof - 6), cx + sg * (hw - 22) + 7, Y(roof - 18), GLASS, 2)
            if k.get('tanks'): e.rect(cx - hw + 6, Y(bc + br - 4), cx + hw - 6, Y(fb + 10), KA, 2, vol=(2, 2), edge=1)
            e.ell(cx, Y(bc), br + 1, br + 1, SOOT, 2, vol=(3, 2))
            e.ell(cx, Y(bc), br - 4, br - 4, SOOT, 3)
            e.ell(cx, Y(bc), 3, 3, STEEL, 3); e.line([(cx - br + 6, Y(bc)), (cx + br - 6, Y(bc))], STEEL, 2)
            cw = k.get('chimw', 5); ch = k['chim']
            e.rect(cx - cw, Y(ch), cx + cw, Y(bc + br - 1), SOOT, 2, vol=(1, 0), edge=1)
            if k.get('stack') == 'balloon': e.poly([(cx - cw, Y(ch - 14)), (cx - cw - 9, Y(ch)), (cx + cw + 9, Y(ch)), (cx + cw, Y(ch - 14))], SOOT, 2, vol=(2, 2), edge=1)
            if k.get('stack') == 'copper': e.rect(cx - cw - 2, Y(ch), cx + cw + 2, Y(ch - 6), COPPER, 2, vol=(1, 2), edge=1)
            if k.get('headlamp'): e.rect(cx - 7, Y(bc + br + 14), cx + 7, Y(bc + br + 2), BRASS, 2, vol=(1, 1), edge=1); e.ell(cx, Y(bc + br + 8), 4, 4, LAMP, 4)
            else:
                for sg in (-1, 1): e.rect(cx + sg * 24 - 2, Y(fb + 14), cx + sg * 24 + 2, Y(fb + 10), LAMP, 4)
            if k.get('pilot'): e.poly([(cx - hw + 12, Y(fb - 2)), (cx - 30, Y(2)), (cx + 30, Y(2)), (cx + hw - 12, Y(fb - 2))], IRON, 2, vol=(1, 1), edge=1)
            seats = [seat_head(cx + hw - 22, Y(k['cab'][2] - 12), below=5), seat_head(cx - hw + 22, Y(k['cab'][2] - 12), below=5)]
    elif kind == 'motor' and not back:
        h = k['h']; floor = fb + 4; nose = k.get('nose', 'flat')
        top = h if nose != 'hood' else floor + (h - floor) * .6
        if nose in ('wedge', 'bullet', 'round'):
            e.poly([(cx - hw + 4, Y(floor - 2)), (cx - hw, Y(h - 18)), (cx - hw + 14, Y(h)), (cx + hw - 14, Y(h)), (cx + hw, Y(h - 18)), (cx + hw - 4, Y(floor - 2))], KA, 2, vol=(4, 3), gloss=True, edge=1)
            e.poly([(cx - hw + 12, Y(h - 8)), (cx - hw + 8, Y(h - 30)), (cx + hw - 8, Y(h - 30)), (cx + hw - 12, Y(h - 8))], GLASS, 1, vol=(1, 0))
        else:
            e.rect(cx - hw + 2, Y(h), cx + hw - 2, Y(floor), KA, 2, vol=(2, 3), edge=1)
            if nose == 'hood':
                e.rect(cx - hw + 2, Y(h), cx + hw - 2, Y(top + 2), KA, 1, edge=1)
                e.rect(cx - 22, Y(top), cx + 22, Y(floor), KA, 3, edge=1)
                for x in range(int(cx) - 18, int(cx) + 20, 4): e.line([(x, Y(top - 4)), (x, Y(top - 20))], KA, 1)
                for sg in (-1, 1): e.rect(cx + sg * 28 - 10, Y(h - 4), cx + sg * 28 + 10, Y(top + 6), GLASS, 1, vol=(1, 0))
            else:
                for sg in (-1, 1): e.rect(cx + sg * 22 - 18, Y(h - 6), cx + sg * 22 + 18, Y(floor + (h - floor) * .5), GLASS, 1, vol=(1, 0))
        if k.get('stripe'): e.line([(cx - hw + 4, Y(floor + 6)), (cx + hw - 4, Y(floor + 6))], KB, 3, w=3)
        for sg in (-1, 1): e.ell(cx + sg * (hw - 16), Y(floor + 10), 4, 3, LAMP, 4)
        if k.get('panto'): e.line([(cx - 20, Y(h + 22)), (cx + 20, Y(h + 22))], STEEL, 3, w=2); e.line([(cx - 10, Y(h)), (cx, Y(h + 22)), (cx + 10, Y(h))], STEEL, 2)
        if k.get('maglev'): e.rect(cx - hw + 10, Y(floor), cx + hw - 10, Y(fb - 12), KB, 2, vol=(1, 2), edge=1)
        seats = [seat_head(cx + 18, Y(h - 16), below=6), seat_hidden(cx, Y(floor))]
    else:
        # the tail: a coach's end, a van's or a wagon's, with a red tail lamp
        h = k.get('h', 100); floor = fb + 4; kd = k.get('kind', 'coach')
        if kind == 'motor':
            e.rect(cx - hw + 2, Y(h), cx + hw - 2, Y(floor), KA, 2, vol=(2, 3), edge=1)
            for sg in (-1, 1): e.rect(cx + sg * 22 - 16, Y(h - 6), cx + sg * 22 + 16, Y(floor + (h - floor) * .5), GLASS, 1, vol=(1, 0))
        elif kind == 'steam':
            e.rect(cx - hw + 10, Y(k['cab'][2]), cx + hw - 10, Y(fb + 8), KA, 2, vol=(2, 2), edge=1)
            e.rect(cx - 16, Y(k['cab'][2] - 4), cx + 16, Y(fb + 12), BLACK, 0)
        elif kd in ('open', 'chaldron'):
            e.rect(cx - hw + 6, Y(h), cx + hw - 6, Y(floor), DARKWOOD if kd == 'chaldron' else KA, 2, vol=(1, 2), edge=1)
            for i, x in enumerate(range(int(cx - hw) + 10, int(cx + hw) - 10, 8)): e.rect(x, Y(h + 4 + (i % 2) * 2), x + 5, Y(h), SOOT, 1 + (i % 2))
        elif kd == 'tank':
            e.ell(cx, Y(floor + 42), 40, 37, KA, 2, vol=(9, 8), gloss=True); e.ell(cx, Y(floor + 42), 6, 6, KA, 3)
        elif kd == 'flat':
            e.rect(cx - hw + 8, Y(floor + 92), cx + hw - 8, Y(floor + 4), KA, 2, vol=(2, 3), edge=1)
            e.line([(cx, Y(floor + 90)), (cx, Y(floor + 6))], KA, 1); e.rect(cx - 10, Y(floor + 60), cx - 6, Y(floor + 30), STEEL, 3); e.rect(cx + 6, Y(floor + 60), cx + 10, Y(floor + 30), STEEL, 3)
        else:
            e.rect(cx - hw + 4, Y(h), cx + hw - 4, Y(floor), KA, 2, vol=(2, 3), edge=1)
            e.poly([(cx - hw + 3, Y(h)), (cx - hw + 12, Y(h + 8)), (cx + hw - 12, Y(h + 8)), (cx + hw - 3, Y(h))], PLATE, 2, vol=(1, 1), edge=1)
            if kd == 'coach':
                e.rect(cx - 10, Y(h - 4), cx + 10, Y(floor + 2), KA, 1, edge=1); e.rect(cx - 7, Y(h - 8), cx + 7, Y(floor + (h - floor) * .5), GLASS, 1, vol=(1, 0))
                for sg in (-1, 1): e.rect(cx + sg * 30 - 10, Y(h - 8), cx + sg * 30 + 10, Y(floor + (h - floor) * .5), GLASS, 1, vol=(1, 0))
        e.rect(cx + hw - 20, Y(floor + 12), cx + hw - 16, Y(floor + 8), REDL, 4)
        seats = [seat_hidden(cx, Y(floor)), seat_hidden(cx, Y(floor))]
    return seats


def _rnd(fs):
    faces, seats = fs
    return faces, {k: [dict(q, x=int(round(q['x'])), y=int(round(q['y']))) for q in v] for k, v in seats.items()}


def _s(**k):
    d = dict(frame=22, w=112); d.update(k); return d


def trains():
    # early: an engine with a tall chimney and no cab, a water barrel tender, a coach of stage bodies on one frame
    early = _s(L=124, bc=50, br=17, chim=132, chimw=4, stack='flared', cab=(0, 22, 0), cabstyle='none', board=32, boiler=(14, 112), smoke=10, chimx=106,
               drivers=[(84, 26)], trail=[(30, 16)], cyl=70, cylr=6, bands=[40, 64, 88], domes=[], whistle=True)
    out = [
        (1825, 'pioneer', 'Pioneer engine', dict(parts=[('coach', _s(kind='coach', L=150, h=86, roof='stage', windows=6, doors='compart', axles=(36, 114), r=18, wx0=8, steps=True)),
                                                          ('tender', _s(L=76, h=60, barrel=True, axles=(20, 56))), ('steam', early)]), 'railearly'),
        (1825, 'goods', 'Coal train', dict(parts=[('coach', _s(kind='chaldron', L=74, h=60, axles=(18, 56), r=14)), ('tender', _s(L=76, h=60, barrel=True, axles=(20, 56))), ('steam', early)]), 'railearly'),
        (1825, 'horse', 'Horse wagonway', dict(parts=[('coach', _s(kind='chaldron', L=74, h=60, axles=(18, 56), r=14)), ('coach', _s(kind='chaldron', L=74, h=60, axles=(18, 56), r=14))], horse=True), 'railearly'),
    ]
    # 1850: the American with its balloon stack and cowcatcher, the European with its copper cap, a goods engine
    am = _s(L=270, bc=72, br=24, chim=150, chimw=6, stack='balloon', cab=(4, 54, 136), board=48, boiler=(54, 236), smoke=26, chimx=226,
            drivers=[(70, 30), (128, 30)], lead=[(196, 14), (232, 14)], cyl=212, cylr=9, pilot=30, headlamp=222, brass=True, domes=[(120, BRASS), (178, BRASS)], splasher=True, cylpaint=True)
    eu = _s(L=250, bc=72, br=23, chim=148, chimw=5, stack='copper', cab=(4, 46, 128), cabstyle='open', board=46, boiler=(46, 232), smoke=22, chimx=216,
            drivers=[(64, 30), (132, 30)], lead=[(208, 18)], cyl=206, brass=True, domes=[(120, BRASS)], splasher=True, redbeam=True)
    gd = _s(L=230, bc=70, br=24, chim=140, chimw=5, cab=(4, 46, 130), cabstyle='open', board=44, boiler=(46, 220), smoke=22, chimx=202,
            drivers=[(64, 24), (118, 24), (172, 24)], cyl=200, domes=[(120, BRASS)])
    out += [
        (1850, 'american', 'American engine', dict(parts=[('coach', _s(kind='coach', L=420, h=104, roof='clere', windows=12, bogies=48, r=15, steps=True)), ('tender', _s(L=150, h=86, bogies=True)), ('steam', am)]), 'railvict'),
        (1850, 'european', 'Passenger engine', dict(parts=[('coach', _s(kind='coach', L=230, h=98, roof='arc', windows=7, doors='compart', axles=(46, 184), r=17, round=True, steps=True)), ('tender', _s(L=130, h=82, axles=(24, 64, 106))), ('steam', eu)]), 'railvict'),
        (1850, 'goods', 'Goods engine', dict(parts=[('coach', _s(kind='open', L=170, h=70, axles=(40, 130), r=16, load='coal')), ('tender', _s(L=130, h=82, axles=(24, 64, 106))), ('steam', gd)]), 'railvict'),
    ]
    # 1900: the express engine with a bogie coach, a tank engine with a suburban coach, a heavy goods engine with a van
    ex = _s(L=370, bc=84, br=28, chim=160, chimw=6, cab=(4, 64, 148), board=54, boiler=(64, 340), smoke=30, chimx=318,
            drivers=[(100, 36), (178, 36), (256, 36)], lead=[(306, 16), (346, 16)], cyl=316, domes=[(196, BRASS)], valance=True, number=True)
    tk = _s(L=300, bc=78, br=24, chim=150, chimw=5, cab=(4, 66, 142), board=46, boiler=(66, 284), smoke=24, chimx=268, tanks=(88, 230),
            drivers=[(90, 28), (156, 28), (222, 28)], lead=[(272, 14)], trail=[(30, 14)], cyl=264, domes=[(160, BRASS)])
    hg = _s(L=360, bc=82, br=28, chim=154, chimw=6, cab=(4, 60, 146), board=50, boiler=(60, 336), smoke=28, chimx=312,
            drivers=[(92, 26), (150, 26), (208, 26), (266, 26)], lead=[(322, 14)], cyl=318, domes=[(200, SOOT)])
    out += [
        (1900, 'express', 'Express engine', dict(parts=[('coach', _s(kind='coach', L=560, h=112, roof='clere', windows=14, doors='compart', bogies=70, r=16, wheel='spoke')), ('tender', _s(L=230, h=98, bogies=True)), ('steam', ex)]), 'railvict'),
        (1900, 'tank', 'Tank engine', dict(parts=[('coach', _s(kind='coach', L=340, h=104, roof='arc', windows=10, doors='compart', axles=(70, 270), r=17)), ('steam', tk)]), 'railvict'),
        (1900, 'goods', 'Heavy goods engine', dict(parts=[('coach', _s(kind='van', L=220, h=100, axles=(50, 170), r=16, letters=True)), ('tender', _s(L=200, h=98, axles=(40, 100, 160))), ('steam', hg)]), 'railgoods'),
    ]
    # 1935: a streamlined steam express, a diesel railcar, an electric engine
    sl = _s(L=420, bc=86, br=30, chim=126, chimw=5, cab=(4, 70, 152), board=56, boiler=(70, 400), smoke=28, chimx=372, casing=True,
            drivers=[(118, 38), (196, 38), (274, 38)], lead=[(340, 17), (384, 17)], cyl=350, domes=[])
    out += [
        (1935, 'streamliner', 'Streamlined express', dict(parts=[('coach', _s(kind='coach', L=600, h=114, roof='arc', windows=16, bogies=70, r=16, stripe=True)), ('tender', _s(L=240, h=110, bogies=True)), ('steam', sl)]), 'railstream'),
        (1935, 'railcar', 'Diesel railcar', dict(parts=[('coach', _s(kind='coach', L=560, h=112, roof='arc', windows=14, bogies=70, r=16, stripe=True)),
                                                         ('motor', _s(L=580, h=116, nose='round', nosel=60, wins=[(40 + 36 * i, 66 + 36 * i) for i in range(12)], bogies=(80, 480), stripe=True, skirt=True))]), 'railstream'),
        (1935, 'electric', 'Electric engine', dict(parts=[('coach', _s(kind='coach', L=600, h=114, roof='arc', windows=16, bogies=70, r=16)),
                                                           ('motor', _s(L=440, h=120, nose='flat', panto=300, wins=[(40, 60), (380, 400)], grille=(80, 360), bogies=(80, 360), r=20, gap=70))]), 'railgoods'),
    ]
    # 1960: a diesel with a bonnet, an electric multiple unit, a diesel freight
    out += [
        (1960, 'diesel', 'Diesel engine', dict(parts=[('coach', _s(kind='coach', L=620, h=114, roof='arc', windows=16, bogies=70, r=16)),
                                                       ('motor', _s(L=560, h=124, nose='hood', nosel=110, grille=(60, 400), bogies=(100, 440), r=18, stripe=True, fans=(120, 220, 320), gap=72))]), 'railmodern'),
        (1960, 'emu', 'Electric train', dict(parts=[('coach', _s(kind='coach', L=600, h=112, roof='arc', windows=14, bogies=70, r=15, two=True)),
                                                    ('motor', _s(L=600, h=114, nose='flat', panto=420, wins=[(40 + 40 * i, 70 + 40 * i) for i in range(12)], doors=(30, 300, 560), bogies=(80, 520), r=15, band=True))]), 'railmodern'),
        (1960, 'freight', 'Diesel freight', dict(parts=[('coach', _s(kind='tank', L=420, h=100, bogies=60, r=15)),
                                                        ('motor', _s(L=560, h=124, nose='hood', nosel=110, grille=(60, 400), bogies=(100, 440), r=18, fans=(120, 220, 320), gap=72, stripe=True))]), 'railgoods'),
    ]
    # 1990: a high-speed power car, a regional railcar, container freight
    out += [
        (1990, 'highspeed', 'High-speed train', dict(parts=[('coach', _s(kind='coach', L=640, h=112, roof='arc', windows=18, bogies=80, r=15, stripe=True)),
                                                            ('motor', _s(L=640, h=118, nose='wedge', nosel=140, panto=240, wins=[], ribbon=None, bogies=(100, 520), r=16, stripe=True, skirt=True, band=True))]), 'railmodern'),
        (1990, 'regional', 'Regional railcar', dict(parts=[('coach', _s(kind='coach', L=560, h=112, roof='arc', windows=14, bogies=70, r=15, stripe=True)),
                                                           ('motor', _s(L=580, h=116, nose='round', nosel=40, wins=[(60 + 44 * i, 94 + 44 * i) for i in range(10)], doors=(40, 520), bogies=(90, 480), r=15, stripe=True))]), 'railmodern'),
        (1990, 'freight', 'Container freight', dict(parts=[('coach', _s(kind='flat', L=500, h=100, bogies=60, r=15, boxes=[(6, 244), (256, 494)])),
                                                           ('motor', _s(L=580, h=126, nose='hood', nosel=100, grille=(60, 420), bogies=(100, 460), r=18, fans=(140, 260, 380), gap=74, stripe=True))]), 'railgoods'),
    ]
    # 2040 (Future Darkness): a magnetic train, a driverless shuttle, a freight pod
    out += [
        (2040, 'maglev', 'Magnetic train', dict(parts=[('motor', _s(L=560, h=116, nose='bullet', nosel=120, wins=[(40 + 34 * i, 64 + 34 * i) for i in range(12)], maglev=True, band=True, flip=True)),
                                                       ('motor', _s(L=700, h=116, nose='bullet', nosel=220, wins=[(40 + 34 * i, 64 + 34 * i) for i in range(12)], maglev=True, band=True))]), 'railfuture'),
        (2040, 'shuttle', 'Driverless shuttle', dict(parts=[('coach', _s(kind='coach', L=480, h=110, roof='flat', windows=10, bogies=60, r=14, stripe=True)),
                                                            ('motor', _s(L=500, h=112, nose='round', nosel=30, ribbon=(30, 440), doors=(250,), bogies=(70, 430), r=14, stripe=True, panto=200))]), 'railfuture'),
        (2040, 'freight', 'Freight pod', dict(parts=[('coach', _s(kind='flat', L=440, h=100, bogies=56, r=14, boxes=[(6, 214), (226, 434)])),
                                                     ('motor', _s(L=360, h=110, nose='wedge', nosel=60, bogies=(70, 290), r=15, stripe=True, panto=180))]), 'railfuture'),
    ]
    return out


# ---- trams ----
def tram(p, f=0):
    """a tram: one body on a truck or bogies, a trolley pole or a pantograph to the wire, or a horse ahead"""
    L = p['L']; h = p['h']; fb = 14; floor = fb + 6; FH = 208; G = FH - 12
    horse = p.get('horse')
    if horse:
        a = MB.beast('horse', s=1.6); hfr, _ = MB.draw(a, 'none', (), (f * 4) % 8)
        hfr = {k: recolour(v, dict(a=ramp((112, 70, 40)), b=ramp((36, 28, 24)))) for k, v in hfr.items()}
    total = L + (110 if horse else 0)
    FW = int(math.ceil((total + 40) / 16) * 16)
    x0 = (FW - total) // 2; X = lambda x: x0 + x; Y = lambda y: G - y
    t = Pt(FW, FH); seats = []; ph = f * math.pi / 4
    st = p.get('style', 'box')
    # platforms at the ends, the saloon between
    pl = p.get('plat', 26)
    if st == 'open':
        # an open-sided car: a roof on posts, benches across
        t.rect(X(0), Y(floor + 10), X(L), Y(floor), KA, 2, vol=(1, 2), edge=1)
        t.poly([(X(-2), Y(h)), (X(2), Y(h + 7)), (X(L - 2), Y(h + 7)), (X(L + 2), Y(h))], KB, 2, vol=(2, 1), edge=1)
        for x in range(4, int(L) - 2, 24): t.line([(X(x), Y(h)), (X(x), Y(floor + 10))], BRASS, 2)
        for i, x in enumerate(range(16, int(L) - 10, 24)):
            t.rect(X(x - 2), Y(floor + 30), X(x + 2), Y(floor + 10), PALEWOOD, 2)
            if i % 2 == 0 and len(seats) < 6: seats.append(seat_sit(X(x + 8), Y(floor + 18), below=3))
        t.line([(X(0), Y(floor + 12)), (X(L), Y(floor + 12))], KC, 3, w=2)
    else:
        b0, b1 = (pl, L - pl) if st != 'modern' else (0, L)
        top = h if not p.get('deck') else p['deck']
        t.rect(X(b0), Y(top), X(b1), Y(floor), KA, 2, vol=(2, 3), edge=1)
        if p.get('dash', True) and st != 'modern':
            for a, b in ((0, b0), (b1, L)):
                t.rect(X(a), Y(floor + 22), X(b), Y(floor), KA, 3, vol=(1, 2), edge=1)
                t.line([(X(a + 2), Y(floor + 20)), (X(b - 2), Y(floor + 20))], BRASS, 3)
            if not p.get('vest'):
                for x in (2, L - 2): t.line([(X(x), Y(floor + 22)), (X(x), Y(top))], STEEL, 2)
            else:
                for a, b in ((0, b0), (b1, L)): t.rect(X(a), Y(top), X(b), Y(floor + 22), KA, 2, vol=(1, 0), edge=1); t.rect(X(a + 3), Y(top - 6), X(b - 3), Y(floor + 30), GLASS, 1, vol=(1, 0))
        # the lower panel and the windows
        if p.get('two'): t.rect(X(b0 + 1), Y(floor + (top - floor) * .44), X(b1 - 1), Y(floor + 2), KC, 2, vol=(0, 2))
        t.line([(X(b0 + 1), Y(floor + (top - floor) * .44)), (X(b1 - 1), Y(floor + (top - floor) * .44))], KB, 3, w=2)
        n = p.get('windows', 6); wy0, wy1 = floor + (top - floor) * .52, top - 6; span = b1 - b0 - 8
        for i in range(n):
            a = b0 + 4 + span * i / n + 2; b = b0 + 4 + span * (i + 1) / n - 2
            if a > b - 3: continue
            t.rect(X(a), Y(wy1), X(b), Y(wy0), GLASS, 1, vol=(1, 0))
            if p.get('lights'): t.rect(X(a), Y(wy1 + 4), X(b), Y(wy1 + 1), GLASS, 3)
            if len(seats) < 6 and i % 2 == 1: seats.append(seat_head(X((a + b) / 2), Y((wy0 + wy1) / 2), below=int((wy1 - wy0) / 2)))
        for d in p.get('doors', []): t.rect(X(d - 8), Y(top - 3), X(d + 8), Y(floor + 1), KA, 1, edge=0); t.line([(X(d), Y(top - 4)), (X(d), Y(floor + 2))], KA, 0); t.rect(X(d - 6), Y(wy1), X(d + 6), Y(floor + 18), GLASS, 2)
        if st == 'modern':
            # a rounded cab at each end, low floor, a band of colour
            t.poly([(X(L - 2), Y(floor)), (X(L + 6), Y(floor + 6)), (X(L + 8), Y(top - 20)), (X(L + 2), Y(top)), (X(L - 2), Y(top))], KA, 2, vol=(2, 3), gloss=True, edge=1)
            t.poly([(X(L), Y(top - 4)), (X(L + 6), Y(top - 20)), (X(L + 6), Y(floor + (top - floor) * .5)), (X(L), Y(floor + (top - floor) * .5))], GLASS, 1, vol=(1, 0))
            t.poly([(X(2), Y(floor)), (X(-6), Y(floor + 6)), (X(-8), Y(top - 20)), (X(-2), Y(top)), (X(2), Y(top))], KA, 2, vol=(2, 3), edge=1)
            if p.get('joints'):
                for j in p['joints']: t.rect(X(j - 3), Y(top - 2), X(j + 3), Y(floor + 2), SOOT, 2)
            t.line([(X(-6), Y(floor + 4)), (X(L + 6), Y(floor + 4))], KB, 3, w=3)
            t.ell(X(L + 6), Y(floor + 12), 2, 2, LAMP, 4)
        if p.get('deck'):
            # an upper deck: open with garden seats, or covered
            d = p['deck']; t.rect(X(4), Y(d + 8), X(L - 4), Y(d), KA, 2, vol=(1, 1), edge=1)
            t.rect(X(10), Y(h), X(L - 10), Y(d + 8), KA, 2, vol=(2, 1), edge=1)
            t.rect(X(10), Y(h + 3), X(L - 10), Y(h), PLATE, 2)
            for i in range(n):
                a = 16 + (L - 32) * i / n + 2; b = 16 + (L - 32) * (i + 1) / n - 2
                t.rect(X(a), Y(h - 5), X(b), Y(d + 12), GLASS, 1, vol=(1, 0))
                if len(seats) < 8 and i % 2 == 0: seats.append(seat_head(X((a + b) / 2), Y((d + 12 + h - 5) / 2), below=6))
            t.line([(X(4), Y(d + 3)), (X(L - 4), Y(d + 3))], KB, 3, w=2)
        else:
            t.poly([(X(-2 if st != 'modern' else 0), Y(top)), (X(4), Y(top + 6)), (X(L - 4), Y(top + 6)), (X(L + (2 if st != 'modern' else 0)), Y(top))], PLATE if st != 'modern' else KA, 2, vol=(2, 1), edge=1)
            if p.get('clere'): t.rect(X(b0 + 6), Y(top + 11), X(b1 - 6), Y(top + 6), PLATE, 2, vol=(1, 1), edge=1)
        if p.get('board'): t.rect(X(L * .3), Y(top + 18 if not p.get('deck') else h + 12), X(L * .7), Y(top + 8 if not p.get('deck') else h + 4), CREAMB, 3, edge=1)
    # the driver on the front platform
    if st == 'modern': seats.insert(0, seat_head(X(L + 1), Y(floor + (h - floor) * .7), below=6))
    elif st == 'open': seats.insert(0, dict(x=X(L - 6), y=Y(floor + 10), cut=112, pose='sit'))
    else: seats.insert(0, dict(x=X(L - pl / 2), y=Y(floor), cut=112, pose='sit')); seats.append(dict(x=X(pl / 2), y=Y(floor), cut=112, pose='sit'))
    # the current collector
    top_ = (p.get('deck') and h) or h
    if p.get('pole'):
        t.rect(X(L * .5 - 6), Y(top_ + 10), X(L * .5 + 6), Y(top_ + 6), SOOT, 2)
        t.line([(X(L * .5), Y(top_ + 10)), (X(L * .5 - 120), Y(top_ + 46))], SOOT, 2, w=2); t.ell(X(L * .5 - 120), Y(top_ + 47), 2, 2, BRASS, 3)
    if p.get('panto'):
        px_ = p['panto']; t.rect(X(px_ - 10), Y(top_ + 9), X(px_ + 10), Y(top_ + 6), PLATE, 2)
        t.line([(X(px_ - 8), Y(top_ + 9)), (X(px_ + 2), Y(top_ + 22))], STEEL, 2); t.line([(X(px_ + 2), Y(top_ + 22)), (X(px_ - 4), Y(top_ + 32))], STEEL, 2)
        t.line([(X(px_ - 12), Y(top_ + 32)), (X(px_ + 4), Y(top_ + 32))], STEEL, 3, w=2)
    if p.get('fender'): t.rect(X(L - 4), Y(floor - 2), X(L + 6), Y(4), IRON, 2, edge=1)
    # the truck or bogies
    r = p.get('r', 13)
    if p.get('bogies'):
        for x in p['bogies']: _bogie(t, X, Y, x, r, ph, gap=r * 2.4)
    else:
        for x in p.get('axles', (L * .3, L * .7)): _wheel(t, X, Y, x, r, ph, 'disc' if not horse else 'spoke', counter=False)
        t.rect(X(L * .3 - r), Y(r + 4), X(L * .7 + r), Y(r - 1), PLATE, 2, vol=(1, 1), edge=1)
    if horse:
        hx = X(L) + 10
        t.line([(X(L - 2), Y(floor + 8)), (hx + 40, G - 42)], IRON, 2)
        t.paste(hfr['right'], hx - 40, G - MB.GROUND)
        t.line([(seats[0]['x'] + 6, seats[0]['y'] - 36), (hx + 92, G - 64)], LEATHER, 1)
    t.shadow(FW / 2, G + 1, total / 2, 3)
    side = t.outline()
    # ends
    ends = {}; es = {}; cx = FW // 2; hw = p.get('w', 84) / 2
    for back in (False, True):
        e = Pt(FW, FH)
        for sg in (-1, 1): e.rect(cx + sg * 22 - 3, Y(2 * r), cx + sg * 22 + 3, Y(0), SOOT, 1)
        top = h
        if st == 'modern':
            e.poly([(cx - hw + 2, Y(floor)), (cx - hw, Y(top - 10)), (cx - hw + 8, Y(top)), (cx + hw - 8, Y(top)), (cx + hw, Y(top - 10)), (cx + hw - 2, Y(floor))], KA, 2, vol=(2, 3), gloss=True, edge=1)
            e.rect(cx - hw + 8, Y(top - 6), cx + hw - 8, Y(floor + (top - floor) * .45), GLASS, 1, vol=(1, 0))
            e.line([(cx - hw + 1, Y(floor + 4)), (cx + hw - 1, Y(floor + 4))], KB, 3, w=3)
            for sg in (-1, 1): e.ell(cx + sg * (hw - 10), Y(floor + 12), 3, 2, LAMP if not back else REDL, 4)
        else:
            e.rect(cx - hw, Y(top if not p.get('deck') else h), cx + hw, Y(floor), KA, 2, vol=(2, 3), edge=1)
            e.poly([(cx - hw - 2, Y(top)), (cx - hw + 6, Y(top + 6)), (cx + hw - 6, Y(top + 6)), (cx + hw + 2, Y(top))], PLATE, 2, vol=(1, 1), edge=1)
            if st == 'open':
                e.rect(cx - hw + 4, Y(top - 4), cx + hw - 4, Y(floor + 30), BLACK, 0)
                for x in (-hw + 6, -8, 8, hw - 6): e.rect(cx + x - 2, Y(floor + 30), cx + x + 2, Y(floor + 10), PALEWOOD, 2)
            else:
                e.rect(cx - hw + 6, Y((p.get('deck') or top) - 6), cx + hw - 6, Y(floor + 30), GLASS, 1, vol=(1, 0))
                if p.get('deck'): e.rect(cx - hw + 6, Y(h - 6), cx + hw - 6, Y(p['deck'] + 12), GLASS, 1, vol=(1, 0))
                e.rect(cx - hw + 2, Y(floor + 24), cx + hw - 2, Y(floor), KA, 3, edge=1); e.line([(cx - hw + 4, Y(floor + 20)), (cx + hw - 4, Y(floor + 20))], BRASS, 3)
            e.ell(cx, Y(floor + 12), 3, 3, LAMP if not back else REDL, 4)
        if p.get('pole'): e.line([(cx, Y(top + 8)), (cx, Y(top + 46))], SOOT, 2, w=2)
        if p.get('panto'): e.line([(cx - 16, Y(top + 32)), (cx + 16, Y(top + 32))], STEEL, 3, w=2); e.line([(cx - 8, Y(top + 6)), (cx, Y(top + 30)), (cx + 8, Y(top + 6))], STEEL, 2)
        if horse and not back: e.paste(hfr['down'], cx - MB.FW // 2, G - MB.GROUND + 10)
        if horse and back: e.paste(hfr['up'], cx - MB.FW // 2, G - MB.GROUND - 30, under=True)
        e.shadow(cx, G + 1, hw + 4, 3)
        ends['up' if back else 'down'] = e.outline()
        es['up' if back else 'down'] = [dict(x=cx, y=Y(floor + 2), cut=60 if not back else 112, pose='sit')] + [seat_head(cx + (-1) ** i * 14, Y(floor + (top - floor) * .7), below=5) for i in range(3)]
    return _rnd((dict(right=side, left=mirror(side), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es)))


CREAMB = ramp((228, 220, 196))


def trams():
    return [
        (1860, 'horse', 'Horse tram', dict(L=190, h=96, w=74, windows=6, horse=True, axles=(56, 134), r=15, clere=True, board=True), 'tram'),
        (1860, 'open', 'Open horse tram', dict(L=170, h=92, w=74, style='open', horse=True, axles=(50, 120), r=15), 'tram'),
        (1860, 'double', 'Double-deck horse tram', dict(L=200, h=136, deck=88, w=76, windows=6, horse=True, axles=(60, 140), r=15), 'tram'),
        (1895, 'electric', 'Electric tram', dict(L=300, h=104, w=80, windows=8, pole=True, clere=True, axles=(110, 190), r=13, fender=True, board=True), 'tram'),
        (1895, 'open', 'Open summer tram', dict(L=330, h=100, w=84, style='open', pole=True, axles=(110, 220), r=13), 'tram'),
        (1895, 'double', 'Double-deck tram', dict(L=310, h=150, deck=100, w=82, windows=8, pole=True, axles=(110, 200), r=13, fender=True), 'tram'),
        (1930, 'electric', 'Enclosed tram', dict(L=420, h=108, w=86, windows=11, vest=True, pole=True, bogies=(90, 330), r=12, two=True, board=True), 'tram'),
        (1930, 'double', 'Covered double-deck tram', dict(L=360, h=154, deck=104, w=84, windows=9, vest=True, pole=True, bogies=(80, 280), r=12, two=True), 'tram'),
        (1930, 'streamlined', 'Streamlined tram', dict(L=520, h=110, w=90, windows=13, vest=True, pole=True, bogies=(110, 410), r=12, doors=(60, 460), two=True), 'tram'),
        (1960, 'articulated', 'Articulated tram', dict(L=760, h=110, w=88, style='modern', windows=20, panto=380, bogies=(80, 380, 680), r=12, doors=(70, 260, 500, 690), joints=(380,)), 'trammodern'),
        (1960, 'electric', 'Tram', dict(L=500, h=110, w=88, style='modern', windows=13, panto=250, bogies=(100, 400), r=12, doors=(60, 440)), 'trammodern'),
        (1960, 'streamlined', 'Streamlined tram', dict(L=520, h=110, w=90, windows=13, vest=True, panto=260, bogies=(110, 410), r=12, doors=(60, 460), two=True), 'trammodern'),
        (1990, 'lowfloor', 'Low-floor tram', dict(L=1100, h=112, w=90, style='modern', windows=28, panto=550, bogies=(100, 550, 1000), r=10, doors=(80, 300, 550, 800, 1020), joints=(280, 550, 820), lights=True), 'trammodern'),
        (1990, 'articulated', 'Articulated tram', dict(L=780, h=110, w=88, style='modern', windows=20, panto=390, bogies=(80, 390, 700), r=12, doors=(70, 270, 510, 710), joints=(390,)), 'trammodern'),
        (1990, 'electric', 'Tram', dict(L=520, h=112, w=88, style='modern', windows=13, panto=260, bogies=(100, 420), r=11, doors=(60, 460)), 'trammodern'),
        (2040, 'driverless', 'Driverless tram', dict(L=1000, h=114, w=92, style='modern', windows=26, bogies=(100, 500, 900), r=10, doors=(80, 280, 500, 720, 920), joints=(330, 670), lights=True), 'railfuture'),
        (2040, 'pod', 'Tram pod', dict(L=420, h=110, w=88, style='modern', windows=10, bogies=(90, 330), r=10, doors=(210,), lights=True), 'railfuture'),
        (2040, 'lowfloor', 'Low-floor tram', dict(L=1100, h=112, w=90, style='modern', windows=28, panto=550, bogies=(100, 550, 1000), r=10, doors=(80, 300, 550, 800, 1020), joints=(280, 550, 820), lights=True), 'railfuture'),
    ]
