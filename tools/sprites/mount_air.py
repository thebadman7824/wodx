# Balloons, airships, aeroplanes, helicopters and jets for the mount sprites (B4970). Seen as the figures are: from the
# side a little from above, so the far wing rises behind the body and the near wing comes down toward us.
import math, numpy as np
from mountkit import *


# ---- balloons and airships ----
def balloon(p, ph=0):
    FW, FH = 288, 288; G = FH - 10; cx = FW // 2
    Y = lambda y: G - y
    def one(view):
        t = Pt(FW, FH); st = p['style']; seats = []
        if st in ('round', 'drop'):
            r = p.get('r', 78); cy = p.get('cy', 178); ry = r * p.get('tall', 1.0)
            # the lines down to the basket, then the bag over them
            bw = p.get('bw', 20); by = p.get('by', 30)
            for sg in (-1, -.4, .4, 1): t.line([(cx + sg * r * .7, Y(cy - ry * .7)), (cx + sg * bw * .5, Y(by + 14))], ROPE, 1)
            if st == 'drop':
                t.poly([(cx - r * .82, Y(cy - ry * .45)), (cx - 14, Y(by + 28)), (cx + 14, Y(by + 28)), (cx + r * .82, Y(cy - ry * .45))], KA, 2, vol=(0, 4))
            t.ell(cx, Y(cy), r, ry, KA, 2, vol=(int(r * .32), int(r * .28)), gloss=True)
            n = p.get('gores', 0)
            if n:
                for i in range(-n, n + 1):
                    if i % 2: continue
                    x = cx + r * math.sin(i / n * math.pi / 2) * .98; x2 = cx + r * math.sin((i + 1) / n * math.pi / 2) * .98
                    m = t._mask(lambda d: d.rectangle((int(min(x, x2)), int(Y(cy + ry)), int(max(x, x2)), int(Y(cy - ry * (1.0 if st == 'round' else .5)))), fill=255))
                    sel = m & (t.c[..., 0] == t.c[..., 2]) & (t.c[..., 1] == 0) & (t.c[..., 3] > 0)
                    for k in range(5):
                        q = sel & (t.c[..., 0] == KA[k][0]); t.c[q, :3] = KB[k]
            if p.get('band'):
                m = t._mask(lambda d: d.rectangle((0, int(Y(cy + ry * .12)), FW, int(Y(cy - ry * .12))), fill=255)); sel = m & (t.c[..., 1] == 0) & (t.c[..., 3] > 0) & (t.c[..., 0] == t.c[..., 2]) & (t.c[..., 0] > 0)
                for k in range(5):
                    q = sel & (t.c[..., 0] == KA[k][0]); t.c[q, :3] = KC[k]
            if p.get('net'):
                for i in range(-5, 6): t.arc(cx, Y(cy), abs(r * math.sin(i / 6 * math.pi / 2)) + 1, ry, 180, 360, ROPE, 1)
                t.arc(cx, Y(cy + ry * .1), r, ry * .25, 0, 180, ROPE, 1)
            if p.get('swags'):
                for i in range(-3, 4): t.arc(cx + i * r * .26, Y(cy - ry * .25), r * .13, 8, 0, 180, KC, 3, w=2)
            if p.get('solar'): t.poly([(cx - r * .7, Y(cy + ry * .7)), (cx - r * .3, Y(cy + ry * .95)), (cx + r * .3, Y(cy + ry * .95)), (cx + r * .7, Y(cy + ry * .7))], SOLAR, 2, vol=(1, 0), edge=1)
            if p.get('burner'): t.rect(cx - 3, Y(by + 22), cx + 3, Y(by + 16), STEEL, 2); t.poly([(cx - 2, Y(by + 22)), (cx, Y(by + 32 + (ph % 2) * 3)), (cx + 2, Y(by + 22))], AMBER, 3)
            # the basket
            bk = p.get('basket', ROPE)
            t.rect(cx - bw / 2, Y(by + 14), cx + bw / 2, Y(by), bk, 2, vol=(1, 3), edge=1)
            if bk is ROPE:
                for y in range(int(by) + 3, int(by) + 13, 3): t.line([(cx - bw / 2 + 1, Y(y)), (cx + bw / 2 - 1, Y(y))], ROPE, 1)
            if p.get('sandbags'):
                for sg in (-1, 1): t.ell(cx + sg * (bw / 2 + 2), Y(by + 7), 2, 3, CANVAS, 2, edge=1)
            if p.get('tether'): t.line([(cx, Y(by)), (cx - 30, Y(0))], ROPE, 1)
            for i in range(4): seats.append(seat_sit(cx + (i - 1.5) * bw * .26, Y(by + 13 + (i % 2)), below=-2))
            t.shadow(cx, G + 1, 26, 4)
        else:
            # an airship: a long hull seen from the side, round seen end on
            L = p.get('L', 250); r = p.get('r', 38); cy = p.get('cy', 170); gx = p.get('gx', 0); gw = p.get('gw', 46); gy = cy - r - p.get('drop', 8)
            if view == 'side':
                x0 = cx - L // 2
                if p.get('fins'):
                    t.poly([(x0 + 4, Y(cy)), (x0 - 4, Y(cy + r * 1.1)), (x0 + 30, Y(cy + r * .7)), (x0 + 40, Y(cy))], KB, 2, vol=(1, 1), edge=1)
                    t.poly([(x0 + 4, Y(cy)), (x0 - 4, Y(cy - r * 1.1)), (x0 + 30, Y(cy - r * .7)), (x0 + 40, Y(cy))], KB, 2, vol=(1, 1), edge=1)
                for sg in (-.6, .6): t.line([(cx + gx + sg * gw * .5, Y(gy)), (cx + gx + sg * gw * .8, Y(cy - r * .7))], ROPE if not p.get('rigid') else STEEL, 1)
                pts = []
                for i in range(41):
                    a = i / 40 * 2 * math.pi; k = p.get('blunt', .62)
                    pts.append((cx + math.copysign(abs(math.cos(a)) ** k, math.cos(a)) * L / 2, Y(cy + math.sin(a) * r)))
                t.poly(pts, p.get('hullc', KA), 2, vol=(int(r * .5), int(r * .45)), gloss=True)
                if p.get('ribs'):
                    for i in range(1, p['ribs']):
                        x = x0 + L * i / p['ribs']; hh = r * math.sqrt(max(0, 1 - ((x - cx) / (L / 2)) ** 2)) ** .9
                        t.line([(x, Y(cy + hh - 2)), (x, Y(cy - hh + 2))], p.get('hullc', KA), 1)
                if p.get('stripe'): t.line([(x0 + 14, Y(cy)), (x0 + L - 14, Y(cy))], KB, 3, w=3)
                if p.get('solar'): t.poly([(x0 + 40, Y(cy + r * .86)), (x0 + 60, Y(cy + r)), (x0 + L - 60, Y(cy + r)), (x0 + L - 40, Y(cy + r * .86))], SOLAR, 2, vol=(1, 0), edge=1)
                if p.get('fins'): t.poly([(x0 + 2, Y(cy + 2)), (x0 - 10, Y(cy + 3)), (x0 - 10, Y(cy - 3)), (x0 + 2, Y(cy - 2))], KB, 3, edge=1)
                g0, g1 = cx + gx - gw / 2, cx + gx + gw / 2
                if p.get('open'):
                    t.rect(g0, Y(gy), g1, Y(gy - 4), WOOD, 2, vol=(1, 1), edge=1); t.line([(g0, Y(gy + 8)), (g1, Y(gy + 8))], STEEL, 2)
                    for x in (g0, (g0 + g1) / 2, g1): t.line([(x, Y(gy + 8)), (x, Y(gy))], STEEL, 2)
                    t.rect(g0 - 10, Y(gy + 6), g0 - 2, Y(gy), IRON, 2, edge=1); t.line([(g0 - 12, Y(gy + 10 - (ph % 2) * 14)), (g0 - 12, Y(gy - 4 + (ph % 2) * 14))], WOOD, 3)
                    for i in range(4): seats.append(seat_sit(g1 - 6 - i * (gw - 10) / 3, Y(gy + 1), below=2))
                else:
                    t.poly([(g0 + 4, Y(gy - 12)), (g0, Y(gy)), (g1, Y(gy)), (g1 - 2, Y(gy - 8)), (g1 - 8, Y(gy - 12))], KB, 2, vol=(1, 3), edge=1)
                    nw = max(2, int(gw / 12))
                    for i in range(nw): t.rect(g0 + 3 + (gw - 6) * i / nw + 1, Y(gy - 2), g0 + 3 + (gw - 6) * (i + 1) / nw - 1, Y(gy - 7), GLASS, 1, vol=(1, 0))
                    t.rect(g0 - 9, Y(gy - 3), g0 - 1, Y(gy - 9), IRON, 2, edge=1); t.line([(g0 - 11, Y(gy + 1 - (ph % 2) * 12)), (g0 - 11, Y(gy - 13 + (ph % 2) * 12))], STEEL, 3)
                    for i in range(4): seats.append(seat_head(g1 - 6 - i * (gw - 12) / 3, Y(gy - 5), below=3))
                t.shadow(cx, G + 1, L * .3, 4)
            else:
                back = view == 'back'
                if p.get('fins') and back:
                    t.rect(cx - 2, Y(cy + r * 1.25), cx + 2, Y(cy - r * 1.25), KB, 2, edge=1); t.rect(cx - r * 1.25, Y(cy + 2), cx + r * 1.25, Y(cy - 2), KB, 2, edge=1)
                t.ell(cx, Y(cy), r, r, p.get('hullc', KA), 2, vol=(int(r * .5), int(r * .45)), gloss=True)
                if p.get('ribs'):
                    for k in (.35, .7): t.arc(cx, Y(cy), r * k, r * k, 0, 360, p.get('hullc', KA), 1)
                if p.get('stripe'): t.line([(cx - r + 2, Y(cy)), (cx + r - 2, Y(cy))], KB, 3, w=3)
                if p.get('fins') and not back:
                    t.rect(cx - 1, Y(cy + r * 1.2), cx + 1, Y(cy + r), KB, 1); t.rect(cx - r * 1.2, Y(cy + 1), cx - r, Y(cy - 1), KB, 1); t.rect(cx + r, Y(cy + 1), cx + r * 1.2, Y(cy - 1), KB, 1)
                gw2 = 22
                for sg in (-1, 1): t.line([(cx + sg * gw2 * .4, Y(gy)), (cx + sg * r * .5, Y(cy - r * .8))], ROPE if not p.get('rigid') else STEEL, 1)
                if p.get('open'):
                    t.rect(cx - gw2 / 2, Y(gy), cx + gw2 / 2, Y(gy - 4), WOOD, 2, vol=(1, 1), edge=1); t.line([(cx - gw2 / 2, Y(gy + 8)), (cx + gw2 / 2, Y(gy + 8))], STEEL, 2)
                    for i in range(4): seats.append(seat_sit(cx + (-1) ** i * 5, Y(gy + 1 + (i // 2) * 3), below=2))
                else:
                    t.poly([(cx - gw2 / 2 + 2, Y(gy - 12)), (cx - gw2 / 2, Y(gy)), (cx + gw2 / 2, Y(gy)), (cx + gw2 / 2 - 2, Y(gy - 12))], KB, 2, vol=(1, 3), edge=1)
                    t.rect(cx - gw2 / 2 + 3, Y(gy - 2), cx + gw2 / 2 - 3, Y(gy - 7), GLASS, 1, vol=(1, 0))
                    for i in range(4): seats.append(seat_head(cx + (-1) ** i * 4, Y(gy - 5), below=3) if i < 2 else seat_hidden(cx, Y(gy)))
                t.shadow(cx, G + 1, r * .7, 4)
        return t.outline(), seats
    r_, sr = one('side'); d_, sd = one('front'); u_, su = one('back')
    return (dict(right=r_, left=mirror(r_), down=d_, up=u_), dict(right=sr, left=[dict(s, x=FW - 1 - s['x']) for s in sr], down=sd, up=su))


def balloons():
    return [
        (1783, 'montgolfier', 'Montgolfier', dict(style='drop', r=74, tall=1.12, cy=176, band=True, swags=True, gores=0, basket=WOOD, bw=40, by=24, burner=True), 'royal'),
        (1783, 'gas', 'Gas balloon', dict(style='round', r=62, cy=188, gores=6, net=True, bw=22, basket=WOOD), 'royal'),
        (1783, 'paper', 'Paper fire balloon', dict(style='drop', r=64, tall=1.2, cy=178, gores=0, basket=ROPE, bw=18, burner=True), 'canvas'),
        (1850, 'gas', 'Netted gas balloon', dict(style='round', r=70, cy=186, net=True, sandbags=True, bw=22), 'canvas'),
        (1850, 'war', 'Observation balloon', dict(style='round', r=64, cy=188, net=True, tether=True, bw=18), 'canvas'),
        (1850, 'fair', 'Fairground balloon', dict(style='round', r=72, cy=184, gores=8, band=True, net=True, sandbags=True, bw=22), 'gaudy'),
        (1900, 'airship', 'Airship', dict(style='ship', L=236, r=34, cy=176, open=True, gw=70, drop=26, blunt=.7), 'canvas'),
        (1900, 'dirigible', 'Keeled dirigible', dict(style='ship', L=256, r=30, cy=178, open=True, gw=96, drop=18, blunt=.8, fins=True, hullc=KC), 'canvas'),
        (1900, 'gas', 'Racing balloon', dict(style='round', r=70, cy=186, net=True, sandbags=True, gores=6, bw=22), 'gaudy'),
        (1930, 'rigid', 'Rigid airship', dict(style='ship', L=268, r=36, cy=176, ribs=12, fins=True, rigid=True, hullc=STEEL, gw=40, gx=60, drop=2, blunt=.55), 'airline'),
        (1930, 'blimp', 'Blimp', dict(style='ship', L=220, r=44, cy=180, fins=True, gw=46, drop=2, blunt=.6, stripe=True), 'airline'),
        (1930, 'strato', 'High-altitude balloon', dict(style='drop', r=66, tall=1.25, cy=180, basket=STEEL, bw=22, by=26), 'canvas'),
        (1960, 'hotair', 'Hot-air balloon', dict(style='drop', r=76, tall=1.05, cy=180, gores=8, burner=True, bw=20), 'gaudy'),
        (1960, 'blimp', 'Advertising blimp', dict(style='ship', L=226, r=42, cy=180, fins=True, gw=40, drop=2, blunt=.6, stripe=True), 'gaudy'),
        (1960, 'chevron', 'Banded hot-air balloon', dict(style='drop', r=74, tall=1.08, cy=180, band=True, gores=4, burner=True, bw=20), 'gaudy'),
        (2040, 'solar', 'Solar airship', dict(style='ship', L=262, r=36, cy=178, fins=True, rigid=True, solar=True, gw=56, drop=2, blunt=.5, hullc=WHITE), 'future'),
        (2040, 'pod', 'Lifting pod', dict(style='round', r=60, cy=190, solar=True, basket=KB, bw=30, by=28), 'future'),
        (2040, 'hotair', 'Hot-air balloon', dict(style='drop', r=76, tall=1.05, cy=180, gores=10, band=True, burner=True, bw=20, basket=KB), 'future'),
    ]


# ---- winged aircraft ----
def _wing(t, x, y, chord, reach, sweep, rp, up, tone=2, taper=.6):
    """a wing seen from the side and a little above: it leaves the body at (x, y) and goes up the screen (the far one) or down (the near one)"""
    dy = -reach * .5 if up else reach * .8
    tip0 = x - sweep + (-reach * .25 if up else reach * .1)
    pts = [(x - chord / 2, y), (x + chord / 2, y), (tip0 + chord * taper / 2, y + dy), (tip0 - chord * taper / 2, y + dy)]
    return t.poly(pts, rp, tone if not up else max(1, tone - 1), vol=(1, 1), edge=1)


def plane(p, ph=0):
    FW, FH = 320, 192; G = FH - 10; cx = FW // 2
    Y = lambda y: G - y
    L = p['L']; d = p.get('d', 18); x0 = cx - L // 2; X = lambda x: x0 + x
    ay = p.get('ay', 46)                                # the body's middle above the ground
    nose = p.get('nose', 'round'); span = min(150, p.get('span', 130)); chord = p.get('chord', 30); wx = p.get('wx', L * .62); wings = p.get('wings', 1)
    reach = span * .34; rot = p.get('rotor')
    def body(t):
        tail = p.get('tailh', d * .35)
        pts = [(X(0), Y(ay + tail * .2)), (X(2), Y(ay + tail)), (X(L * .3), Y(ay + d / 2)), (X(L * .84), Y(ay + d / 2))]
        pts += {'round': [(X(L - 4), Y(ay + d * .3)), (X(L), Y(ay)), (X(L - 4), Y(ay - d * .34))], 'flat': [(X(L), Y(ay + d * .46)), (X(L), Y(ay - d * .46))],
                'point': [(X(L - 12), Y(ay + d * .3)), (X(L + 8), Y(ay - d * .06)), (X(L - 12), Y(ay - d * .4))]}[nose]
        pts += [(X(L * .8), Y(ay - d / 2)), (X(L * .32), Y(ay - d / 2)), (X(4), Y(ay - tail * .3))]
        if p.get('frame'):
            # an open girder tail: only the front part is covered
            t.line([(X(4), Y(ay + 2)), (X(L * .5), Y(ay + d / 2))], PALEWOOD, 2); t.line([(X(4), Y(ay - 2)), (X(L * .5), Y(ay - d / 2))], PALEWOOD, 2)
            for i in range(1, 5): xx = L * .5 * i / 5 + 4; t.line([(X(xx), Y(ay + 2 + (d / 2 - 2) * i / 5)), (X(xx), Y(ay - 2 - (d / 2 - 2) * i / 5))], PALEWOOD, 1)
            pts = [(X(L * .5), Y(ay + d / 2)), (X(L * .84), Y(ay + d / 2)), (X(L), Y(ay)), (X(L * .8), Y(ay - d / 2)), (X(L * .5), Y(ay - d / 2))]
        t.poly(pts, KA, 2, vol=(max(2, int(d * .25)), max(2, int(d * .3))), gloss=True)
        if p.get('stripe'): t.line([(X(L * .1), Y(ay)), (X(L * .92), Y(ay))], KB, 3, w=2)
    def side():
        t = Pt(FW, FH); seats = []
        wy_low = ay - d * .3; wy_high = ay + d * .5 + p.get('gap', 16)
        tips = []
        # far wing(s), tail, then the body, then the near wing(s)
        levels = {1: [p.get('wy', wy_low)], 2: [wy_low, wy_high], 3: [wy_low, (wy_low + wy_high) / 2, wy_high]}[wings]
        for wy in levels: _wing(t, X(wx), Y(wy), chord, reach, p.get('sweep', 0), KB if p.get('wingc') == 'b' else KA, True)
        if p.get('twin'): t.ell(X(wx + 8), Y(ay - d * .2) - reach * .5, 10, 6, IRON, 1, edge=0)
        _wing(t, X(8), Y(ay + 1), chord * .5, reach * .42, p.get('sweep', 0) * .4, KA, True)
        fin = p.get('fin', 22)
        t.poly([(X(0), Y(ay + 2)), (X(-2 - p.get('finsweep', 0)), Y(ay + fin)), (X(10 - p.get('finsweep', 0)), Y(ay + fin)), (X(22), Y(ay + 3))], KB if p.get('tailc', 'b') == 'b' else KA, 2, vol=(1, 0), edge=1)
        if p.get('ttail'): t.rect(X(-8 - p.get('finsweep', 0)), Y(ay + fin + 2), X(14 - p.get('finsweep', 0)), Y(ay + fin), KA, 3, edge=1)
        # undercarriage
        gear = p.get('gear', 'wheels')
        gx = wx + chord * .1
        if gear == 'wheels':
            t.line([(X(gx), Y(ay - d * .4)), (X(gx + 2), Y(7))], STEEL, 2, w=2); t.wheel(X(gx + 2), Y(6), 6, p.get('wheel', 'disc'), ph)
            if p.get('nosewheel'): t.line([(X(L - 16), Y(ay - d * .4)), (X(L - 16), Y(5))], STEEL, 2); t.wheel(X(L - 16), Y(4), 4, 'disc', ph)
            else: t.line([(X(6), Y(ay - 3)), (X(3), Y(2))], STEEL, 2); t.px(X(3), Y(1), TYRE, 2)
        elif gear == 'skid':
            t.line([(X(gx - 8), Y(ay - d * .4)), (X(gx - 2), Y(8)), (X(gx + 18), Y(ay - d * .4))], PALEWOOD, 2); t.wheel(X(gx - 2), Y(7), 7, 'wire', ph); t.line([(X(gx - 20), Y(3)), (X(gx + 26), Y(5))], PALEWOOD, 3)
            t.line([(X(6), Y(ay - 3)), (X(3), Y(2))], PALEWOOD, 2)
        elif gear == 'floats':
            for xx in (gx - 14, gx + 16): t.line([(X(xx), Y(ay - d * .4)), (X(xx + 2), Y(9))], STEEL, 2)
            t.poly([(X(gx - 34), Y(9)), (X(gx - 30), Y(2)), (X(gx + 30), Y(2)), (X(gx + 40), Y(8)), (X(gx + 30), Y(10))], KB, 2, vol=(2, 2), edge=1)
        body(t)
        # the engine and the airscrew
        px_ = X(L + (2 if nose != 'point' else 9))
        if p.get('pusher'): px_ = X(L * .46)
        if p.get('engine') == 'radial': t.rect(X(L - 8), Y(ay + d * .5), X(L - 2), Y(ay - d * .5), IRON, 2, vol=(2, 2), edge=1)
        elif p.get('engine') == 'inline': t.line([(X(L - 26), Y(ay + d * .5 + 1)), (X(L - 6), Y(ay + d * .5 + 1))], IRON, 3, w=2)
        if p.get('twin'):
            ex = X(wx + 10); ey = Y(ay - d * .2) + reach * .5
            t.ell(ex, ey, 14, 6, KA, 2, vol=(2, 2), edge=1); t.rect(ex + 12, ey - 6, ex + 15, ey + 6, IRON, 2)
            _prop(t, ex + 17, ey, p.get('prop', 16) * .8, ph)
        if not p.get('noprop'): _prop(t, px_, Y(ay), p.get('prop', 18), ph)
        # where they sit
        cab = p.get('cab', 'open'); c0 = p.get('cx0', L * .5); n = p.get('seats', 2)
        if cab == 'open':
            for i in range(min(n, 2)):
                sx = c0 + 6 - i * 20
                t.ell(X(sx), Y(ay + d / 2 - 1), 7, 3, BLACK, 1); t.line([(X(sx + 7), Y(ay + d / 2)), (X(sx + 9), Y(ay + d / 2 + 5))], GLASS, 3)
                seats.append(seat_sit(X(sx), Y(ay + d / 2 - 7), below=-9))
        elif cab == 'canopy':
            cl = p.get('cl', 34)
            t.poly([(X(c0 - cl * .6), Y(ay + d / 2 - 1)), (X(c0 - cl * .4), Y(ay + d / 2 + 8)), (X(c0 + cl * .1), Y(ay + d / 2 + 9)), (X(c0 + cl * .5), Y(ay + d / 2 - 1))], GLASS, 2, vol=(2, 0), edge=0)
            for i in range(min(n, 2)): seats.append(seat_head(X(c0 + 4 - i * 14), Y(ay + d / 2 + 4), below=4))
        elif cab == 'cabin':
            nw = p.get('windows', 3); cl = p.get('cl', 56)
            t.poly([(X(c0 + cl * .5 - 2), Y(ay + d * .42)), (X(c0 + cl * .5 + 8), Y(ay + d * .1)), (X(c0 + cl * .5 + 8), Y(ay + d * .42))], GLASS, 2)
            for i in range(nw): t.rect(X(c0 - cl / 2 + cl * i / nw + 1), Y(ay + d * .4), X(c0 - cl / 2 + cl * (i + 1) / nw - 2), Y(ay + d * .1), GLASS, 1, vol=(1, 0))
            for i in range(n): seats.append(seat_head(X(c0 + cl / 2 - cl * (min(i, nw - 1) + .5) / nw + (i % 2) * 3), Y(ay + d * .25), below=3) if i < nw + 1 else seat_hidden(X(c0), Y(ay)))
        while len(seats) < n: seats.append(seat_hidden(X(c0), Y(ay)))
        # struts, then the near wing
        for wy in levels:
            if wings > 1 or p.get('struts'): pass
        if wings > 1:
            for sx in (-chord * .3, chord * .3):
                t.line([(X(wx + sx) - 4, Y(levels[0]) + reach * .7), (X(wx + sx) - 4, Y(levels[-1]) + reach * .7)], PALEWOOD, 2)
        for wy in levels:
            _wing(t, X(wx), Y(wy), chord, reach, p.get('sweep', 0), KB if p.get('wingc') == 'b' else KA, False, tone=3)
        if p.get('struts') and wings == 1: t.line([(X(wx), Y(ay - d * .4)), (X(wx) - 3, Y(levels[0]) + reach * .6)], STEEL, 2)
        _wing(t, X(8), Y(ay + 1), chord * .5, reach * .42, p.get('sweep', 0) * .4, KA, False, tone=3)
        if rot:
            for rx in rot: t.ell(X(rx), Y(ay + d * .5 + 10) + (reach * .5 if rx < L * .4 else 0), 22, 5, STEEL, 3 if ph % 2 else 2, edge=1)
        t.shadow(cx, G + 1, L * .4, 4)
        return t.outline(), seats
    def end(back):
        t = Pt(FW, FH); seats = []; hs = span
        levels = {1: [p.get('wy', ay - d * .3)], 2: [ay - d * .3, ay + d * .5 + p.get('gap', 16)], 3: [ay - d * .3, ay + d * .1 + p.get('gap', 16) / 2, ay + d * .5 + p.get('gap', 16)]}[wings]
        dih = p.get('dihedral', 4)
        if back:
            fin = p.get('fin', 22); t.rect(cx - 1, Y(ay + fin + 4), cx + 1, Y(ay), KB if p.get('tailc', 'b') == 'b' else KA, 2, edge=1)
            ty = ay + (fin + 4 if p.get('ttail') else 3); t.rect(cx - 30, Y(ty + 1), cx + 30, Y(ty - 1), KA, 3, edge=1)
        for wy in levels:
            t.poly([(cx - hs, Y(wy + dih + 2)), (cx, Y(wy + 2)), (cx + hs, Y(wy + dih + 2)), (cx + hs, Y(wy + dih - 1)), (cx, Y(wy - 2)), (cx - hs, Y(wy + dih - 1))], KB if p.get('wingc') == 'b' else KA, 3, vol=(1, 1), edge=1)
        if wings > 1:
            for sg in (-1, 1):
                for k in (.45, .8): t.line([(cx + sg * hs * k, Y(levels[0] + dih * k)), (cx + sg * hs * k, Y(levels[-1] + dih * k))], PALEWOOD, 2)
        gear = p.get('gear', 'wheels')
        if gear in ('wheels', 'skid'):
            for sg in (-1, 1): t.line([(cx + sg * 6, Y(ay - d * .4)), (cx + sg * 16, Y(8))], STEEL, 2); t.tyre_front(cx + sg * 16 - 2, cx + sg * 16 + 2, Y(12), G)
            if gear == 'skid': t.line([(cx - 16, Y(8)), (cx + 16, Y(8))], PALEWOOD, 2)
        elif gear == 'floats':
            for sg in (-1, 1): t.line([(cx + sg * 6, Y(ay - d * .4)), (cx + sg * 20, Y(8))], STEEL, 2); t.ell(cx + sg * 20, Y(5), 6, 5, KB, 2, vol=(2, 2), edge=1)
        w2 = d * .5 * p.get('fat', 1)
        t.ell(cx, Y(ay), w2, d / 2, KA, 2, vol=(max(2, int(d * .25)), max(2, int(d * .3))), gloss=True)
        if p.get('twin'):
            for sg in (-1, 1):
                ex = cx + sg * hs * .34; t.ell(ex, Y(levels[0] + 2), 7, 7, KA, 2, vol=(2, 2), edge=1)
                if not back: t.ell(ex, Y(levels[0] + 2), 4, 4, IRON, 1); _prop(t, ex, Y(levels[0] + 2), p.get('prop', 16) * .8, ph, front=True)
        cab = p.get('cab', 'open'); n = p.get('seats', 2)
        if not back:
            if p.get('engine') == 'radial': t.ell(cx, Y(ay), w2 - 1, d / 2 - 1, IRON, 2, vol=(1, 1)); t.ell(cx, Y(ay), 3, 3, STEEL, 3)
            elif not p.get('pusher') and not p.get('noprop'): t.ell(cx, Y(ay), 3, 3, STEEL, 3)
            if not p.get('pusher') and not p.get('noprop'): _prop(t, cx, Y(ay), p.get('prop', 18), ph, front=True)
        if cab == 'open':
            for i in range(min(n, 2)): seats.append(seat_sit(cx, Y(ay + d / 2 - 7 + (i * 4 if not back else -i * 4)), below=-9 if (i == 0) != back else -14))
        elif cab == 'canopy':
            t.poly([(cx - 6, Y(ay + d / 2 - 2)), (cx - 4, Y(ay + d / 2 + 8)), (cx + 4, Y(ay + d / 2 + 8)), (cx + 6, Y(ay + d / 2 - 2))], GLASS, 2, vol=(2, 0))
            for i in range(min(n, 2)): seats.append(seat_head(cx, Y(ay + d / 2 + 4 + (i * 3 if not back else 0)), below=4 if i == 0 else 0) if (i == 0) or back else seat_hidden(cx, Y(ay)))
        else:
            if not back: t.poly([(cx - w2 + 3, Y(ay + d * .1)), (cx - w2 + 5, Y(ay + d * .4)), (cx + w2 - 5, Y(ay + d * .4)), (cx + w2 - 3, Y(ay + d * .1))], GLASS, 2, vol=(1, 0))
            for i in range(n): seats.append(seat_head(cx + (5 if i == 0 else -5), Y(ay + d * .25), below=3) if i < 2 and not back else seat_hidden(cx, Y(ay)))
        while len(seats) < n: seats.append(seat_hidden(cx, Y(ay)))
        if rot:
            for sg in (-1, 1): t.ell(cx + sg * hs * .7, Y(levels[0] + dih + 8), 22, 5, STEEL, 3 if ph % 2 else 2, edge=1)
        t.shadow(cx, G + 1, hs * .6, 4)
        return t.outline(), seats
    r_, sr = side(); d_, sd = end(False); u_, su = end(True)
    return (dict(right=r_, left=mirror(r_), down=d_, up=u_), dict(right=sr, left=[dict(s, x=FW - 1 - s['x']) for s in sr], down=sd, up=su))


def _prop(t, x, y, r, ph, front=False):
    if front:
        if ph % 2: t.ell(x, y, r, r, GLASS, 4); t.c[(t.c[..., 0] == GLASS[4][0]) & (t.c[..., 1] == GLASS[4][1]), 3] = 70
        else: t.line([(x - r * .7, y - r * .7), (x + r * .7, y + r * .7)], WOOD, 2, w=2)
        return
    if ph % 2: t.line([(x, y - r), (x, y + r)], WOOD, 2, w=2)
    else: t.line([(x, y - r * .45), (x, y + r * .45)], WOOD, 3, w=3)
    t.px(x, y, STEEL, 3)


def planes():
    return [
        (1909, 'monoplane', 'Wire-braced monoplane', dict(L=150, d=14, span=120, chord=34, frame=True, gear='skid', engine='inline', prop=20, seats=1, cx0=92, wx=100, ay=40, fin=16, struts=True), 'canvas'),
        (1909, 'pusher', 'Pusher biplane', dict(L=150, d=12, span=140, chord=30, wings=2, frame=True, gear='skid', pusher=True, prop=20, seats=2, cx0=110, wx=92, ay=36, fin=18, gap=22, wingc='b'), 'canvas'),
        (1909, 'triplane', 'Triplane', dict(L=140, d=14, span=110, chord=22, wings=3, frame=True, gear='skid', engine='inline', prop=20, seats=1, cx0=84, wx=96, ay=38, fin=16, gap=26), 'canvas'),
        (1918, 'scout', 'Scout biplane', dict(L=150, d=20, span=130, chord=30, wings=2, gear='wheels', wheel='wire', engine='radial', prop=22, seats=1, cx0=84, wx=104, ay=42, gap=18, stripe=True), 'warbird'),
        (1918, 'twoseat', 'Two-seat biplane', dict(L=176, d=20, span=150, chord=32, wings=2, gear='wheels', wheel='wire', engine='inline', prop=22, seats=2, cx0=108, wx=122, ay=42, gap=20), 'warbird'),
        (1918, 'triplane', 'Triplane', dict(L=140, d=20, span=110, chord=22, wings=3, gear='wheels', wheel='wire', engine='radial', prop=22, seats=1, cx0=76, wx=98, ay=42, gap=28), 'warbird'),
        (1935, 'monoplane', 'Racing monoplane', dict(L=170, d=22, span=140, chord=36, gear='wheels', engine='radial', prop=24, seats=2, cab='canopy', cx0=92, wx=110, ay=44, stripe=True), 'warbird'),
        (1935, 'airliner', 'Twin-engined airliner', dict(L=236, d=28, span=150, chord=44, gear='wheels', twin=True, noprop=True, nose='round', seats=4, cab='cabin', windows=5, cl=96, cx0=120, wx=140, ay=50, fin=30, fat=1.1, stripe=True), 'airline'),
        (1935, 'floatplane', 'Floatplane', dict(L=176, d=22, span=140, chord=36, gear='floats', engine='radial', prop=24, seats=4, cab='cabin', windows=2, cl=44, cx0=100, wx=110, wy=62, ay=52, struts=True), 'bright'),
        (1950, 'light', 'High-wing light aeroplane', dict(L=170, d=24, span=140, chord=30, gear='wheels', nosewheel=True, engine='inline', prop=18, seats=4, cab='cabin', windows=2, cl=46, cx0=108, wx=108, wy=58, ay=40, struts=True, stripe=True), 'bright'),
        (1950, 'twin', 'Light twin', dict(L=200, d=24, span=150, chord=36, gear='wheels', nosewheel=True, twin=True, noprop=True, nose='point', seats=4, cab='cabin', windows=3, cl=62, cx0=112, wx=120, ay=42, stripe=True, finsweep=6), 'airline'),
        (1950, 'bush', 'Bush aeroplane', dict(L=180, d=26, span=150, chord=34, gear='floats', engine='radial', prop=22, seats=4, cab='cabin', windows=3, cl=56, cx0=104, wx=112, wy=64, ay=52, struts=True), 'bright'),
        (1990, 'turboprop', 'Turboprop', dict(L=220, d=26, span=150, chord=32, gear='wheels', nosewheel=True, nose='point', prop=20, seats=4, cab='cabin', windows=5, cl=90, cx0=120, wx=126, ay=44, stripe=True, finsweep=10, ttail=True, fin=32), 'airline'),
        (1990, 'light', 'Light aeroplane', dict(L=164, d=22, span=130, chord=28, gear='wheels', nosewheel=True, nose='point', prop=16, seats=4, cab='canopy', cl=44, cx0=96, wx=100, ay=38, stripe=True, finsweep=8), 'bright'),
        (1990, 'aerobatic', 'Aerobatic biplane', dict(L=140, d=20, span=110, chord=24, wings=2, gear='wheels', engine='radial', prop=20, seats=1, cab='canopy', cl=30, cx0=76, wx=92, ay=40, gap=14, stripe=True), 'gaudy'),
        (2040, 'tilt', 'Lift-fan air car', dict(L=160, d=24, span=110, chord=24, gear='wheels', nosewheel=True, noprop=True, nose='point', seats=4, cab='canopy', cl=60, cx0=96, wx=70, wy=56, ay=40, rotor=(40, 120), finsweep=10), 'future'),
        (2040, 'solar', 'Solar sailplane', dict(L=190, d=16, span=150, chord=22, gear='wheels', nose='point', prop=14, seats=2, cab='canopy', cl=46, cx0=120, wx=116, ay=34, wingc='b', ttail=True, fin=28, finsweep=8), 'future'),
        (2040, 'light', 'Electric light aeroplane', dict(L=170, d=22, span=130, chord=26, gear='wheels', nosewheel=True, nose='point', prop=16, seats=4, cab='cabin', windows=3, cl=60, cx0=100, wx=104, wy=56, ay=38, stripe=True, finsweep=10), 'future'),
    ]


# ---- helicopters ----
def helicopter(p, ph=0):
    FW, FH = 320, 176; G = FH - 10; cx = FW // 2
    Y = lambda y: G - y
    L = p['L']; x0 = cx - L // 2 + 10; X = lambda x: x0 + x
    bl = p.get('bl', 90); bh = p.get('bh', 44); by = p.get('by', 12); b0 = L - bl      # the cabin sits at the nose
    rr = p.get('rotor', 140); my = by + bh + 14; mx = b0 + bl * .45
    def rotor(t, x, y, r, end=False):
        t.line([(x, y + 12), (x, y)], IRON, 2, w=3)
        if ph % 2: t.line([(x - r, y - 1), (x + r, y + 1)], IRON, 2, w=2)
        else: t.line([(x - r * .55, y + 2), (x + r * .55, y - 2)], IRON, 2, w=2); t.line([(x - r * .2, y - 3), (x + r * .2, y + 3)], IRON, 3)
    def side():
        t = Pt(FW, FH); seats = []; st = p.get('style', 'pod')
        if st == 'quad':
            for rx in (b0 - 26, b0 + bl + 22): t.ell(X(rx), Y(by + bh * .9) - 18, 30, 7, IRON, 1, edge=0)
        # the tail
        ty = by + bh * .62
        if p.get('lattice'):
            t.line([(X(4), Y(ty + 2)), (X(b0 + 4), Y(ty + 8))], STEEL, 2); t.line([(X(4), Y(ty - 2)), (X(b0 + 4), Y(ty - 10))], STEEL, 2)
            for i in range(1, 7): xx = 4 + (b0) * i / 7; t.line([(X(xx), Y(ty + 2 + 6 * i / 7)), (X(xx + b0 / 7), Y(ty - 2 - 8 * (i + 1) / 7))], STEEL, 1)
        elif st != 'quad' and not p.get('tandem'):
            t.poly([(X(2), Y(ty - 2)), (X(2), Y(ty + 3)), (X(b0 + 6), Y(by + bh * .9)), (X(b0 + 6), Y(by + bh * .4))], KA, 2, vol=(2, 2))
        if not p.get('tandem') and st != 'quad':
            fin = p.get('fin', 18)
            t.poly([(X(0), Y(ty)), (X(-6), Y(ty + fin)), (X(4), Y(ty + fin)), (X(12), Y(ty + 2))], KB, 2, edge=1)
            if p.get('fenestron'): t.ell(X(2), Y(ty + 4), 7, 7, KA, 2, edge=1); t.ell(X(2), Y(ty + 4), 4, 4, BLACK, 0)
            else:
                if ph % 2: t.line([(X(-2), Y(ty + fin + 6)), (X(-2), Y(ty + fin - 18))], IRON, 2)
                else: t.line([(X(-10), Y(ty + fin - 10)), (X(6), Y(ty + fin - 2))], IRON, 2)
        # skids or wheels
        if p.get('wheels'):
            for xx in (b0 + 14, b0 + bl - 16): t.line([(X(xx), Y(by + 2)), (X(xx), Y(6))], STEEL, 2); t.wheel(X(xx), Y(5), 5, 'disc', 0)
        else:
            for xx in (b0 + 16, b0 + bl - 22): t.line([(X(xx), Y(by + 2)), (X(xx - 2), Y(2))], STEEL, 2)
            t.line([(X(b0 + 4), Y(1)), (X(b0 + bl - 6), Y(1)), (X(b0 + bl), Y(4))], STEEL, 3, w=2)
        # the body
        if st == 'bubble':
            t.rect(X(b0 + 2), Y(by + bh * .5), X(b0 + bl * .5), Y(by + 2), KA, 2, vol=(2, 2), edge=1)
            t.ell(X(b0 + bl * .62), Y(by + bh * .5), bl * .38, bh * .5, GLASS, 2, vol=(4, 3), edge=0)
            t.rect(X(b0 + 6), Y(by + bh * .8), X(b0 + bl * .34), Y(by + bh * .5), IRON, 2, vol=(1, 1), edge=1)
            win = (b0 + bl * .62, by + bh * .56, bh * .5)
        else:
            nose = p.get('nose', 10)
            pts = [(X(b0 + 4), Y(by)), (X(b0), Y(by + bh * .5)), (X(b0 + 6), Y(by + bh)), (X(b0 + bl * .7), Y(by + bh)), (X(b0 + bl - nose * .3), Y(by + bh * .55)), (X(b0 + bl), Y(by + bh * .3)), (X(b0 + bl - nose * .5), Y(by))]
            if p.get('tandem'): pts = [(X(8), Y(by)), (X(0), Y(by + bh * .5)), (X(4), Y(by + bh * 1.25)), (X(34), Y(by + bh * 1.25)), (X(46), Y(by + bh)), (X(L * .7), Y(by + bh)), (X(L - 6), Y(by + bh * .6)), (X(L), Y(by + bh * .3)), (X(L - 8), Y(by))]
            t.poly(pts, KA, 2, vol=(3, 4), gloss=True)
            ws = p.get('glass', .34)
            t.poly([(X(b0 + bl * (1 - ws) - 2), Y(by + bh - 3)), (X(b0 + bl * .72), Y(by + bh - 3)), (X(b0 + bl - nose * .3 - 2), Y(by + bh * .55)), (X(b0 + bl * (1 - ws) - 2), Y(by + bh * .5))], GLASS, 2, vol=(2, 0))
            win = (b0 + bl * (1 - ws * .55), by + bh * .72, bh * .34)
            nw = p.get('windows', 1)
            w0 = b0 + (14 if not p.get('tandem') else -b0 + 50); w1 = b0 + bl * (1 - ws) - 8
            for i in range(nw): t.rect(X(w0 + (w1 - w0) * i / nw + 1), Y(by + bh - 5), X(w0 + (w1 - w0) * (i + 1) / nw - 2), Y(by + bh * .55), GLASS, 1, vol=(1, 0))
            if p.get('stripe'): t.line([(X(b0 + 2), Y(by + bh * .42)), (X(b0 + bl - 6), Y(by + bh * .42))], KB, 3, w=2)
            if p.get('door'): t.rect(X(w0 + 2), Y(by + bh * .5), X(w1 - 2), Y(by + 4), KA, 2, edge=1)
            if p.get('stubs'): t.poly([(X(b0 + bl * .3), Y(by + bh * .4)), (X(b0 + bl * .5), Y(by + bh * .4)), (X(b0 + bl * .44), Y(by + bh * .4) + 16), (X(b0 + bl * .3), Y(by + bh * .4) + 16)], KA, 3, vol=(1, 1), edge=1); t.rect(X(b0 + bl * .3), Y(by + bh * .4) + 15, X(b0 + bl * .5), Y(by + bh * .4) + 19, IRON, 2, edge=1)
            if p.get('winch'): t.rect(X(b0 + bl * .5), Y(by + bh + 4), X(b0 + bl * .6), Y(by + bh), IRON, 2, edge=1)
        t.rect(X(mx - 10), Y(by + bh + 6), X(mx + 12), Y(by + bh), KA if st != 'bubble' else IRON, 2, vol=(1, 1), edge=1)
        if st == 'quad':
            for rx in (b0 - 26, b0 + bl + 22):
                t.line([(X(rx), Y(by + bh * .9) + 8), (X(mx), Y(by + bh * .8))], KA, 2, w=3); t.ell(X(rx), Y(by + bh * .9) + 8, 30, 7, IRON, 2, edge=1); t.ell(X(rx), Y(by + bh * .9) + 8, 26, 5, GLASS, 3 if ph % 2 else 2)
        elif p.get('tandem'):
            rotor(t, X(20), Y(by + bh * 1.25 + 16), rr * .42); rotor(t, X(L - 30), Y(by + bh + 16), rr * .42)
        else: rotor(t, X(mx), Y(my + 6), rr)
        n = p.get('seats', 5)
        for i in range(n):
            if i < 2: seats.append(seat_head(X(win[0] + (3 - i * 7)), Y(win[1] - (i % 2)), below=int(win[2] / 2) + 2))
            elif st != 'bubble' and p.get('windows', 1) and not p.get('door'): seats.append(seat_head(X(w0 + (w1 - w0) * ((i - 2) + .5) / max(1, n - 2)), Y(by + bh * .76), below=3))
            else: seats.append(seat_hidden(X(mx), Y(by + 10)))
        t.shadow(X(b0 + bl / 2), G + 1, bl * .6, 4)
        return t.outline(), seats
    def end(back):
        t = Pt(FW, FH); seats = []; st = p.get('style', 'pod'); w = p.get('w', 50); hw = w / 2
        if st == 'quad':
            for sg in (-1, 1): t.ell(cx + sg * (hw + 34), Y(by + bh * .9) - 12, 30, 7, IRON, 1, edge=0)
        if back and not p.get('tandem') and st != 'quad': t.rect(cx - 2, Y(by + bh * .62 + p.get('fin', 18)), cx + 2, Y(by + bh * .5), KB, 2, edge=1)
        if p.get('wheels'):
            for sg in (-1, 1): t.tyre_front(cx + sg * (hw - 4) - 2, cx + sg * (hw - 4) + 2, Y(10), G)
        else:
            for sg in (-1, 1): t.line([(cx + sg * (hw - 8), Y(by + 2)), (cx + sg * (hw + 2), Y(2))], STEEL, 2); t.rect(cx + sg * (hw + 2) - 1, Y(3), cx + sg * (hw + 2) + 1, Y(0), STEEL, 3)
        top = by + bh * (1.25 if p.get('tandem') and back else 1)
        if st == 'bubble' and not back: t.ell(cx, Y(by + bh * .5), hw, bh * .5, GLASS, 2, vol=(4, 3))
        else:
            t.poly([(cx - hw + 4, Y(by)), (cx - hw, Y(by + bh * .4)), (cx - hw + 5, Y(top)), (cx + hw - 5, Y(top)), (cx + hw, Y(by + bh * .4)), (cx + hw - 4, Y(by))], KA if st != 'bubble' else IRON, 2, vol=(3, 4), gloss=True)
            if not back: t.poly([(cx - hw + 4, Y(by + bh * .45)), (cx - hw + 7, Y(by + bh - 3)), (cx + hw - 7, Y(by + bh - 3)), (cx + hw - 4, Y(by + bh * .45))], GLASS, 2, vol=(2, 0)); t.line([(cx, Y(by + bh - 3)), (cx, Y(by + bh * .45))], KA, 1)
            elif p.get('stripe'): t.line([(cx - hw + 2, Y(by + bh * .42)), (cx + hw - 2, Y(by + bh * .42))], KB, 3, w=2)
            if p.get('stubs'):
                for sg in (-1, 1): t.rect(cx + sg * hw, Y(by + bh * .42), cx + sg * (hw + 20), Y(by + bh * .36), KA, 3, edge=1); t.rect(cx + sg * (hw + 14), Y(by + bh * .34), cx + sg * (hw + 20), Y(by + bh * .22), IRON, 2, edge=1)
        if st == 'quad':
            for sg in (-1, 1): t.line([(cx + sg * hw, Y(by + bh * .7)), (cx + sg * (hw + 34), Y(by + bh * .9) + 10)], KA, 2, w=3); t.ell(cx + sg * (hw + 34), Y(by + bh * .9) + 10, 30, 7, IRON, 2, edge=1); t.ell(cx + sg * (hw + 34), Y(by + bh * .9) + 10, 26, 5, GLASS, 3 if ph % 2 else 2)
        else: rotor(t, cx, Y(top + 20), rr * (.42 if p.get('tandem') else 1))
        n = p.get('seats', 5)
        for i in range(n): seats.append(seat_head(cx + (hw * .4 if i == 0 else -hw * .4), Y(by + bh * .7), below=int(bh * .2) + 2) if i < 2 and not back else seat_hidden(cx, Y(by + 10)))
        t.shadow(cx, G + 1, hw + 6, 4)
        return t.outline(), seats
    r_, sr = side(); d_, sd = end(False); u_, su = end(True)
    return (dict(right=r_, left=mirror(r_), down=d_, up=u_), dict(right=sr, left=[dict(s, x=FW - 1 - s['x']) for s in sr], down=sd, up=su))


def helicopters():
    return [
        (1945, 'bubble', 'Bubble helicopter', dict(L=230, bl=76, bh=42, style='bubble', lattice=True, rotor=140, seats=2, w=46), 'warbird'),
        (1945, 'early', 'Fabric-bodied helicopter', dict(L=240, bl=92, bh=44, nose=14, glass=.42, wheels=True, rotor=140, seats=2, w=46), 'warbird'),
        (1945, 'rescue', 'Rescue helicopter', dict(L=250, bl=104, bh=48, nose=10, glass=.3, windows=2, wheels=True, rotor=146, winch=True, stripe=True, seats=5, w=52), 'rescue'),
        (1960, 'utility', 'Utility helicopter', dict(L=270, bl=118, bh=46, nose=16, glass=.3, windows=2, rotor=150, stripe=True, seats=5, w=58), 'warbird'),
        (1960, 'light', 'Light helicopter', dict(L=210, bl=72, bh=46, nose=22, glass=.56, rotor=130, seats=4, w=44, fin=22), 'bright'),
        (1960, 'tandem', 'Twin-rotor helicopter', dict(L=276, bl=276, bh=44, tandem=True, nose=14, glass=.14, windows=5, wheels=True, rotor=150, seats=5, w=62, by=14), 'warbird'),
        (2000, 'executive', 'Executive helicopter', dict(L=264, bl=124, bh=44, nose=26, glass=.34, windows=3, wheels=True, rotor=150, fenestron=True, stripe=True, seats=5, w=54), 'airline'),
        (2000, 'rescue', 'Air ambulance', dict(L=250, bl=116, bh=48, nose=18, glass=.36, windows=2, rotor=146, fenestron=True, winch=True, stripe=True, seats=5, w=56), 'rescue'),
        (2000, 'gunship', 'Gunship', dict(L=270, bl=120, bh=40, nose=26, glass=.44, windows=0, stubs=True, wheels=True, rotor=150, seats=2, w=40), 'warbird'),
        (2040, 'quad', 'Four-fan air taxi', dict(L=170, bl=110, bh=42, style='quad', nose=24, glass=.5, windows=1, seats=5, w=54), 'future'),
        (2040, 'swift', 'Fast helicopter', dict(L=260, bl=124, bh=40, nose=30, glass=.4, windows=2, wheels=True, rotor=146, fenestron=True, stubs=True, stripe=True, seats=5, w=52), 'future'),
        (2040, 'pod', 'Pod helicopter', dict(L=200, bl=84, bh=48, nose=26, glass=.6, rotor=130, fenestron=True, seats=4, w=48), 'future'),
    ]


# ---- jets ----
def jet(p, ph=0):
    FW, FH = 384, 192; G = FH - 10; cx = FW // 2
    Y = lambda y: G - y
    L = p['L']; d = p.get('d', 22); x0 = cx - L // 2; X = lambda x: x0 + x; ay = p.get('ay', 40)
    span = min(170, p.get('span', 130)); reach = span * .36; wx = p.get('wx', L * .45); chord = p.get('chord', 50); sweep = p.get('sweep', 30)
    def side():
        t = Pt(FW, FH); seats = []
        wy = ay - d * .2
        if p.get('wing') == 'flying':
            t.poly([(X(L), Y(ay)), (X(L * .3), Y(ay) - reach), (X(0), Y(ay) - reach + 6), (X(L * .3), Y(ay + 2))], KA, 1, edge=0)
        else:
            _wing(t, X(wx), Y(wy), chord, reach, sweep, KA, True, taper=p.get('taper', .4))
            if p.get('tailplane', True): _wing(t, X(14), Y(ay + (p.get('fin', 34) if p.get('ttail') else 0)), chord * .4, reach * .45, sweep * .5, KA, True)
        if p.get('nacelles'): t.ell(X(wx + 10), Y(wy) - reach * .5, 20, 6, KA, 1, edge=0)
        fin = p.get('fin', 34); fs = p.get('finsweep', 20)
        for k in range(p.get('fins', 1)):
            ox = -k * 8
            if p.get('wing') != 'flying': t.poly([(X(6) + ox, Y(ay + d * .3)), (X(-fs) + ox, Y(ay + fin)), (X(-fs + 14) + ox, Y(ay + fin)), (X(40) + ox, Y(ay + d * .4))], KB if p.get('tailc') == 'b' else KA, 2 - k, vol=(1, 0), edge=1)
        # gear
        for xx, r in ((L * .42, 5), (L - 30, 4)): t.line([(X(xx), Y(ay - d * .4)), (X(xx), Y(r + 1))], STEEL, 2); t.wheel(X(xx), Y(r), r, 'disc', 0)
        # body
        if p.get('wing') == 'flying':
            t.poly([(X(0), Y(ay - 2)), (X(L * .3), Y(ay + d * .5)), (X(L * .7), Y(ay + d * .5)), (X(L), Y(ay)), (X(L * .7), Y(ay - d * .3)), (X(L * .2), Y(ay - d * .3))], KA, 2, vol=(2, 3), gloss=True)
        else:
            pts = [(X(0), Y(ay + d * .25)), (X(L * .2), Y(ay + d * .5)), (X(L * .78), Y(ay + d * .5)), (X(L - 14), Y(ay + d * .25)), (X(L + 6), Y(ay - d * .05)), (X(L - 14), Y(ay - d * .3)), (X(L * .7), Y(ay - d * .5)), (X(L * .2), Y(ay - d * .5)), (X(0), Y(ay - d * .2))]
            if p.get('noseintake'): pts[3:6] = [(X(L), Y(ay + d * .4)), (X(L), Y(ay - d * .4))]
            t.poly(pts, KA, 2, vol=(max(2, int(d * .25)), max(2, int(d * .3))), gloss=True)
            if p.get('noseintake'): t.ell(X(L), Y(ay), 3, d * .34, BLACK, 0)
            else: t.poly([(X(L - 14), Y(ay + d * .25)), (X(L + 6), Y(ay - d * .05)), (X(L - 14), Y(ay - d * .3))], IRON if p.get('radome', True) else KA, 2, vol=(1, 1))
        t.rect(X(-3), Y(ay + d * .2), X(1), Y(ay - d * .15), IRON, 1, edge=0)
        if ph % 2: t.px(X(-5), Y(ay), AMBER, 3); t.px(X(-6), Y(ay), AMBER, 2); t.px(X(-4), Y(ay + 1), LAMP, 3)
        if p.get('intake'): t.poly([(X(wx + chord * .4), Y(ay + d * .1)), (X(wx + chord * .4 + 14), Y(ay + d * .1)), (X(wx + chord * .4 + 14), Y(ay - d * .35)), (X(wx + chord * .4 - 4), Y(ay - d * .35))], BLACK, 1, edge=0)
        if p.get('stripe'): t.line([(X(L * .08), Y(ay + 1)), (X(L * .9), Y(ay + 1))], KB, 3, w=2)
        if p.get('rear'): t.ell(X(L * .14), Y(ay + d * .5), 16, 6, KA, 3, vol=(1, 2), edge=1); t.rect(X(L * .14 + 12), Y(ay + d * .5 + 5), X(L * .14 + 16), Y(ay + d * .5 - 5), IRON, 1)
        n = p.get('seats', 2); c0 = p.get('cx0', L * .76)
        if p.get('cab') == 'cabin':
            nw = p.get('windows', 5); cl = p.get('cl', 90)
            t.poly([(X(c0 + cl * .5 + 2), Y(ay + d * .4)), (X(c0 + cl * .5 + 14), Y(ay + d * .12)), (X(c0 + cl * .5 + 2), Y(ay + d * .12))], GLASS, 2)
            for i in range(nw): t.ell(X(c0 - cl / 2 + cl * (i + .5) / nw), Y(ay + d * .22), 3, 3, GLASS, 1)
            seats.append(seat_head(X(c0 + cl * .5 + 4), Y(ay + d * .26), below=2)); seats.append(seat_head(X(c0 + cl * .5 + 7), Y(ay + d * .26), below=2))
        elif p.get('cab') != 'none':
            cl = p.get('cl', 40)
            t.poly([(X(c0 - cl * .6), Y(ay + d * .5 - 1)), (X(c0 - cl * .3), Y(ay + d * .5 + 8)), (X(c0 + cl * .15), Y(ay + d * .5 + 8)), (X(c0 + cl * .5), Y(ay + d * .5 - 1))], GLASS, 2, vol=(2, 0))
            for i in range(min(n, 2)): seats.append(seat_head(X(c0 + 2 - i * 14), Y(ay + d * .5 + 3), below=4))
        while len(seats) < n: seats.append(seat_hidden(X(L * .5), Y(ay)))
        if p.get('wing') == 'flying':
            t.poly([(X(L), Y(ay - 1)), (X(L * .3), Y(ay) + reach), (X(0), Y(ay) + reach - 6), (X(L * .3), Y(ay - 3))], KA, 3, vol=(1, 1), edge=1)
        else:
            _wing(t, X(wx), Y(wy), chord, reach, sweep, KA, False, tone=3, taper=p.get('taper', .4))
            if p.get('tailplane', True): _wing(t, X(14), Y(ay + (fin if p.get('ttail') else 0)), chord * .4, reach * .45, sweep * .5, KA, False, tone=3)
        if p.get('nacelles'): t.ell(X(wx + 10), Y(wy) + reach * .5, 22, 7, KA, 2, vol=(2, 2), edge=1); t.ell(X(wx + 31), Y(wy) + reach * .5, 2, 5, BLACK, 0)
        if p.get('stores'): t.line([(X(wx - 6), Y(wy) + reach * .62), (X(wx + 22), Y(wy) + reach * .62)], WHITE, 2, w=2)
        t.shadow(cx, G + 1, L * .42, 4)
        return t.outline(), seats
    def end(back):
        t = Pt(FW, FH); seats = []; hs = span; dih = p.get('dihedral', 2); wy = ay - d * .2
        fin = p.get('fin', 34)
        if back and p.get('wing') != 'flying':
            for k in range(p.get('fins', 1)):
                ox = (0 if p.get('fins', 1) == 1 else (-12 if k == 0 else 12)); t.poly([(cx + ox - 2, Y(ay)), (cx + ox * 1.6 - 1, Y(ay + fin)), (cx + ox * 1.6 + 1, Y(ay + fin)), (cx + ox + 2, Y(ay))], KB if p.get('tailc') == 'b' else KA, 2, edge=1)
            if p.get('tailplane', True): ty = ay + (fin if p.get('ttail') else 1); t.rect(cx - hs * .34, Y(ty + 1), cx + hs * .34, Y(ty - 1), KA, 3, edge=1)
        t.poly([(cx - hs, Y(wy + dih + 1)), (cx, Y(wy + 2)), (cx + hs, Y(wy + dih + 1)), (cx + hs, Y(wy + dih - 1)), (cx, Y(wy - 2)), (cx - hs, Y(wy + dih - 1))], KA, 3, vol=(1, 1), edge=1)
        for sg in (-1, 1): t.line([(cx + sg * 8, Y(ay - d * .4)), (cx + sg * 14, Y(6))], STEEL, 2); t.tyre_front(cx + sg * 14 - 2, cx + sg * 14 + 2, Y(9), G)
        w2 = d * .5 * p.get('fat', 1.0)
        if p.get('wing') == 'flying': t.poly([(cx - hs * .5, Y(ay - 1)), (cx - w2, Y(ay + d * .4)), (cx + w2, Y(ay + d * .4)), (cx + hs * .5, Y(ay - 1)), (cx, Y(ay - d * .3))], KA, 2, vol=(2, 2), gloss=True)
        else: t.ell(cx, Y(ay), w2, d / 2, KA, 2, vol=(max(2, int(d * .25)), max(2, int(d * .3))), gloss=True)
        if p.get('nacelles') or p.get('rear'):
            for sg in (-1, 1):
                ex = cx + sg * (hs * .36 if p.get('nacelles') else w2 + 5); ey = Y(wy - 4 if p.get('nacelles') else ay + d * .4)
                t.ell(ex, ey, 6, 6, KA, 2, vol=(2, 2), edge=1); t.ell(ex, ey, 3.5, 3.5, BLACK if not back else IRON, 0 if not back else 1)
                if back and ph % 2: t.px(ex, ey, AMBER, 3)
        if p.get('intake') and not back:
            for sg in (-1, 1): t.rect(cx + sg * (w2 + 1), Y(ay + d * .15), cx + sg * (w2 + 6), Y(ay - d * .3), BLACK, 1, edge=0)
        if p.get('noseintake') and not back: t.ell(cx, Y(ay), w2 * .6, d * .3, BLACK, 0)
        if back and not (p.get('nacelles') or p.get('rear')):
            n2 = p.get('pipes', 1)
            for k in range(n2):
                ex = cx + (0 if n2 == 1 else (-5 if k == 0 else 5)); t.ell(ex, Y(ay - 1), 4, 4, IRON, 1, edge=0)
                if ph % 2: t.px(ex, Y(ay - 1), AMBER, 3)
        n = p.get('seats', 2)
        if p.get('cab') == 'cabin':
            if not back: t.poly([(cx - w2 + 3, Y(ay + d * .12)), (cx - w2 + 5, Y(ay + d * .4)), (cx + w2 - 5, Y(ay + d * .4)), (cx + w2 - 3, Y(ay + d * .12))], GLASS, 2, vol=(1, 0))
            for i in range(n): seats.append(seat_head(cx + (4 if i == 0 else -4), Y(ay + d * .26), below=2) if i < 2 and not back else seat_hidden(cx, Y(ay)))
        elif p.get('cab') != 'none':
            t.poly([(cx - 6, Y(ay + d * .5 - 2)), (cx - 4, Y(ay + d * .5 + 8)), (cx + 4, Y(ay + d * .5 + 8)), (cx + 6, Y(ay + d * .5 - 2))], GLASS, 2, vol=(2, 0))
            for i in range(min(n, 2)): seats.append(seat_head(cx, Y(ay + d * .5 + 3 + (i * 3 if not back else 0)), below=4 if i == 0 else 0) if (i == 0) or back else seat_hidden(cx, Y(ay)))
        while len(seats) < n: seats.append(seat_hidden(cx, Y(ay)))
        t.shadow(cx, G + 1, hs * .5, 4)
        return t.outline(), seats
    r_, sr = side(); d_, sd = end(False); u_, su = end(True)
    return (dict(right=r_, left=mirror(r_), down=d_, up=u_), dict(right=sr, left=[dict(s, x=FW - 1 - s['x']) for s in sr], down=sd, up=su))


def jets():
    return [
        (1944, 'twin', 'Twin-engined jet', dict(L=290, d=26, span=150, chord=56, sweep=10, taper=.6, nacelles=True, fin=36, finsweep=14, ttail=False, cx0=200, seats=1, radome=False), 'warbird'),
        (1944, 'single', 'Nose-intake jet', dict(L=260, d=28, span=140, chord=50, sweep=14, taper=.6, noseintake=True, fin=36, finsweep=16, cx0=170, seats=1), 'warbird'),
        (1944, 'rocket', 'Tailless rocket aeroplane', dict(L=190, d=30, span=130, chord=70, sweep=40, taper=.3, tailplane=False, fin=34, finsweep=24, cx0=130, seats=1, radome=False, wx=80), 'warbird'),
        (1960, 'delta', 'Delta interceptor', dict(L=330, d=24, span=120, chord=120, sweep=60, taper=.08, tailplane=False, intake=True, fin=40, finsweep=40, cx0=250, seats=1, wx=130, stores=True), 'warbird'),
        (1960, 'swept', 'Swept-wing fighter', dict(L=310, d=26, span=140, chord=64, sweep=50, taper=.4, intake=True, fin=40, finsweep=36, cx0=230, seats=2, stores=True), 'warbird'),
        (1960, 'business', 'Business jet', dict(L=300, d=28, span=150, chord=50, sweep=30, rear=True, ttail=True, fin=38, finsweep=30, cab='cabin', windows=5, cl=110, cx0=170, seats=2, stripe=True, radome=False, fat=1.1, tailc='b'), 'airline'),
        (1980, 'twintail', 'Twin-tailed fighter', dict(L=340, d=26, span=150, chord=90, sweep=50, taper=.3, intake=True, fins=2, fin=38, finsweep=26, cx0=262, seats=2, pipes=2, stores=True, wx=150), 'warbird'),
        (1980, 'strike', 'Strike aircraft', dict(L=340, d=28, span=140, chord=60, sweep=64, taper=.5, intake=True, fin=42, finsweep=40, cx0=258, seats=2, pipes=2, stores=True, wx=160), 'warbird'),
        (1980, 'business', 'Business jet', dict(L=320, d=28, span=160, chord=46, sweep=36, rear=True, ttail=True, fin=40, finsweep=34, cab='cabin', windows=6, cl=130, cx0=180, seats=2, stripe=True, radome=False, fat=1.1), 'airline'),
        (2040, 'wing', 'Flying wing', dict(L=250, d=22, span=170, wing='flying', cx0=180, seats=2, cl=36), 'future'),
        (2040, 'dart', 'Hypersonic dart', dict(L=350, d=20, span=110, chord=140, sweep=70, taper=.05, tailplane=False, fins=2, fin=26, finsweep=30, cx0=270, seats=2, pipes=2, wx=130, radome=False), 'future'),
        (2040, 'shuttle', 'Air shuttle', dict(L=300, d=30, span=150, chord=56, sweep=40, rear=True, ttail=True, fin=36, finsweep=34, cab='cabin', windows=6, cl=130, cx0=170, seats=2, stripe=True, radome=False, fat=1.15), 'future'),
    ]


# ---- the Future Darkness row (B4976): flying cars on ducted fans, a tilt-rotor, an autogyro, an airship liner ----
_helicopter0, _helicopters0, _balloons0 = helicopter, helicopters, balloons
def helicopter(p, ph=0):
    return plane(p, ph) if p.get('winged') else _helicopter0(p, ph)
def helicopters():
    return _helicopters0() + [
        (2023, 'flyingcar', 'Ducted-fan flying car', dict(adds=True, L=180, bl=124, bh=44, style='quad', nose=12, glass=.3, windows=2, stripe=True, seats=5, w=58), 'modern'),
        (2023, 'fancar', 'Personal flying car', dict(adds=True, L=150, bl=96, bh=38, style='quad', nose=30, glass=.5, windows=1, seats=4, w=50), 'modern'),
        (2023, 'tiltrotor', 'Tilt-rotor transport', dict(adds=True, winged=True, L=230, d=30, span=150, chord=30, gear='wheels', nosewheel=True, noprop=True, nose='round', seats=5, cab='cabin', windows=4, cl=80, cx0=130, wx=126, wy=62, ay=44, rotor=(126,), ttail=True, fin=30, finsweep=8, fat=1.1), 'warbird'),
        (2023, 'autogyro', 'Autogyro', dict(adds=True, L=190, bl=66, bh=40, style='bubble', lattice=True, rotor=120, seats=2, w=42), 'bright'),
    ]
def balloons():
    return _balloons0() + [(2023, 'liner', 'Airship liner', dict(adds=True, style='ship', L=268, r=38, cy=176, ribs=10, fins=True, rigid=True, gw=120, gx=10, drop=2, blunt=.55, stripe=True), 'airline')]


# ---- B6623: aerodynes and armoured AVs for the World of Future Darkness (from 2023). Placeholder looks on the
# ducted-fan drawer, kept simple while the art may be redrawn: a closed car body lifted on four fans (a personal or
# hire aerodyne), a heavier armoured body for police and military AVs, and a tilt-rotor gunship. ----
def aerodyne(p, ph=0):
    return helicopter(p, ph)
def aerodynes():
    return [
        (2023, 'personal', 'Personal aerodyne', dict(L=150, bl=96, bh=38, style='quad', nose=30, glass=.5, windows=1, seats=4, w=50), 'modern'),
        (2023, 'saloon', 'Aerodyne saloon', dict(L=180, bl=124, bh=44, style='quad', nose=12, glass=.3, windows=2, stripe=True, seats=5, w=58), 'modern'),
        (2040, 'sport', 'Sporting aerodyne', dict(L=160, bl=100, bh=34, style='quad', nose=36, glass=.55, windows=1, seats=2, w=48), 'future'),
        (2040, 'executive', 'Executive aerodyne', dict(L=186, bl=128, bh=44, style='quad', nose=20, glass=.3, windows=3, stripe=True, seats=5, w=60), 'future'),
    ]
def aerocabs():
    return [
        (2023, 'cab', 'Aerocab', dict(L=176, bl=116, bh=42, style='quad', nose=20, glass=.4, windows=2, stripe=True, seats=5, w=56), 'bright'),
        (2023, 'shuttle', 'Air shuttle', dict(L=186, bl=128, bh=46, style='quad', nose=14, glass=.35, windows=3, stripe=True, seats=5, w=60), 'bright'),
        (2040, 'quad', 'Four-fan air taxi', dict(L=170, bl=110, bh=42, style='quad', nose=24, glass=.5, windows=1, seats=5, w=54), 'future'),
    ]
def assaultavs():
    return [
        (2023, 'assault', 'Assault AV', dict(L=184, bl=124, bh=54, style='quad', nose=12, glass=.2, windows=0, seats=5, w=66), 'army'),
        (2023, 'patrol', 'Police AV', dict(L=180, bl=120, bh=46, style='quad', nose=16, glass=.3, windows=2, stripe=True, seats=5, w=62), 'police'),
        (2023, 'gunship', 'Tilt-rotor gunship', dict(winged=True, L=230, d=30, span=150, chord=30, gear='wheels', nosewheel=True, noprop=True, nose='round', seats=5, cab='cabin', windows=2, cl=80, cx0=130, wx=126, wy=62, ay=44, rotor=(126,), ttail=True, fin=30, finsweep=8, fat=1.1), 'warbird'),
    ]
