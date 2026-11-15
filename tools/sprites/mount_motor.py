# Motor cars, lorries, armoured cars and tanks for the mount sprites (B4970): one builder with many knobs, so that each
# era and style is a row of figures, not its own drawing. Sizes are in pixels at 37 to the metre; x runs from the tail
# to the nose, y up from the ground.
import math
from mountkit import *


def P(**k):
    d = dict(L=170, w=64, c=7, r=10, xr=30, xf=140, hb=31, hh=32, hn=28, ht=30, hr=52, xt=40, xh=118, rr=14, wr=14, nr=4, tr=4,
             roof='hard', fenders='flush', board=False, wheel='disc', windows=2, grille='wide', lamps='round', bumper=True, two=False,
             spare=False, fin=0, seats=(2, 3), glassroof=False, bed=None, hubs=None, tall=0, strip=None, hoodline=True, tiller=False)
    d.update(k)
    return d


def _profile(p):
    L, c = p['L'], p['c']
    pts = [(3, c), (0, c + 3), (0, p['ht'] + p['fin'] - p['tr']), (p['tr'], p['ht'] + p['fin'])]
    if p['fin']: pts += [(p['tr'] + 10, p['ht'])]
    pts += [(p['xt'], max(p['ht'], p['hb'] - 1)), (p['xt'] + 1, p['hb']), (p['xh'], p['hb']), (p['xh'] + 1, p['hh'])]
    pts += [(L - p['nr'] - 1, p['hn']), (L, p['hn'] - p['nr']), (L, c + 3), (L - 3, c)]
    return pts


def car_side(p, FW, FH, ph=0):
    G = FH - 9; x0 = (FW - p['L']) // 2; L = p['L']; c = p['c']; r = p['r']
    X = lambda x: x0 + x
    Y = lambda y: G - y
    t = Pt(FW, FH); seats = []
    arch = r + 2
    # far wheels, a little darker, behind everything
    for xa in (p['xr'], p['xf']): t.ell(X(xa) + 2, Y(r) - 1, r, r, TYRE, 1)
    body = [(X(x), Y(y)) for x, y in _profile(p)]
    paint = KA
    t.poly(body, paint, 2, vol=(2, 3), gloss=True)
    if p['hoodline'] and p['xh'] < L - 12: t.line([(X(p['xh'] + 3), Y(p['hh'] - 4)), (X(L - p['nr'] - 2), Y(p['hn'] - 4))], paint, 1)
    # the cabin
    xt, xh, hb, hr = p['xt'], p['xh'], p['hb'], p['hr']
    top0, top1 = xt + p['rr'], xh - p['wr']
    if p['roof'] in ('hard', 'soft'):
        rp = KC if p['roof'] == 'soft' else (KB if p['two'] else paint)
        cab = [(X(xt), Y(hb)), (X(top0), Y(hr - 1)), (X(top0 + 2), Y(hr)), (X(top1 - 2), Y(hr)), (X(top1), Y(hr - 1)), (X(xh), Y(hb))]
        t.poly(cab, rp, 2, vol=(2, 0), gloss=p['roof'] == 'hard')
        # windows, split by pillars
        n = p['windows']; gy0 = hb + 2; gy1 = hr - 4; span = (xh - 3) - (xt + 4)
        cuts = [xt + 4 + span * i / n for i in range(n + 1)]
        wins = []
        for i in range(n):
            a, b = cuts[i] + (1 if i else 0), cuts[i + 1] - (2 if i < n - 1 else 0)
            # lean the first and the last pane with the rake
            la = p['rr'] * (gy1 - hb) / max(1, hr - hb) if i == 0 else 0
            lb = p['wr'] * (gy1 - hb) / max(1, hr - hb) if i == n - 1 else 0
            la0 = p['rr'] * (gy0 - hb) / max(1, hr - hb) if i == 0 else 0
            lb0 = p['wr'] * (gy0 - hb) / max(1, hr - hb) if i == n - 1 else 0
            if p['roof'] == 'soft' and i == 0 and n > 1: wins.append(None); continue
            t.poly([(X(a + la0), Y(gy0)), (X(a + la), Y(gy1)), (X(b - lb), Y(gy1)), (X(b - lb0), Y(gy0))], GLASS, 1, vol=(1, 0))
            wins.append(((a + la0 + b - lb0) / 2 + (la - lb) / 4, (gy0 + gy1) / 2, gy1 - gy0))
        if p['glassroof']: t.line([(X(top0 + 4), Y(hr)), (X(top1 - 4), Y(hr))], GLASS, 3)
        front = wins[-1]; back = wins[0] if n > 1 else None
    else:
        # open: a windscreen frame and the seat backs
        t.line([(X(xh), Y(hb)), (X(xh - p['wr'] * .5), Y(hb + 13))], CHROME, 2, w=1)
        t.line([(X(xh - 1), Y(hb + 1)), (X(xh - p['wr'] * .5 - 1), Y(hb + 12))], GLASS, 3)
        rows = len(p['seats']); wins = []
        for i in range(rows):
            sx = xh - 20 - i * 26
            if sx < xt + 2: sx = xt + 4
            t.rect(X(sx - 7), Y(hb + 7), X(sx - 3), Y(hb), BLACKLEATHER if not p['tall'] else LEATHER, 2, vol=(1, 0))
            wins.insert(0, (sx + 2, hb + 9, 16))
        front = wins[-1]; back = wins[0] if rows > 1 else None
        if p['roof'] == 'folded':
            t.poly([(X(xt - 2), Y(hb + 1)), (X(xt - 4), Y(hb + 8)), (X(xt + 8), Y(hb + 7)), (X(xt + 10), Y(hb + 1))], KC, 2, vol=(1, 1))
    if p['tiller']: t.line([(X(xh - 9), Y(hb + 12)), (X(xh - 4), Y(hb + 2))], IRON, 2)
    # belt line and doors
    t.line([(X(xt + 2), Y(hb - 2)), (X(xh - 1), Y(hb - 2))], paint, 1)
    for dx in ([(xt + xh) / 2] if len(p['seats']) > 1 and xh - xt > 50 else []) + [xh - 1]:
        t.line([(X(dx), Y(hb - 2)), (X(dx), Y(c + 5))], paint, 1)
    if p['strip']: t.line([(X(4), Y(p['strip'])), (X(L - 5), Y(p['strip']))], KB if p['strip'] > 0 else CHROME, 3)
    # fenders and arches
    for xa in (p['xr'], p['xf']):
        if p['fenders'] == 'cycle':
            t.arc(X(xa), Y(r), arch + 1, arch + 1, 185, 355, KB, 2, w=2)
        elif p['fenders'] == 'pontoon':
            t.arc(X(xa), Y(r), arch + 2, arch + 2, 180, 360, paint, 3, w=2)
            t.ell(X(xa), Y(r), arch, arch, BLACK, 0)
        elif p['fenders'] == 'skirt' and xa == p['xr']:
            pass
        else:
            t.ell(X(xa), Y(r), arch, arch, BLACK, 0)
    if p['board']: t.rect(X(p['xr'] + arch), Y(c + 2), X(p['xf'] - arch), Y(c), KB, 2, vol=(1, 0))
    # trim: bumpers, lamps
    if p['bumper']:
        bp = CHROME if p['bumper'] is True else p['bumper']
        t.rect(X(-1), Y(c + 5), X(3), Y(c + 2), bp, 2, vol=(1, 0)); t.rect(X(L - 3), Y(c + 5), X(L + 1), Y(c + 2), bp, 2, vol=(1, 0))
    ly = p['hn'] - p['nr'] - 2
    if p['lamps'] == 'brass':
        t.ell(X(L - 5), Y(p['hn'] + 3), 3, 3, BRASS, 2, vol=(1, 1)); t.px(X(L - 3), Y(p['hn'] + 3), LAMP, 3)
        t.ell(X(p['xh'] + 2), Y(hb + 3), 2, 2, BRASS, 2)
    elif p['lamps'] == 'pod':
        t.ell(X(L - 7), Y(p['hn'] + 1), 3.5, 3.5, CHROME, 2, vol=(1, 1)); t.px(X(L - 4), Y(p['hn'] + 1), LAMP, 3); t.px(X(L - 4), Y(p['hn']), LAMP, 3)
    elif p['lamps'] == 'round':
        t.rect(X(L - 2), Y(ly + 2), X(L), Y(ly - 1), LAMP, 3); t.rect(X(0), Y(p['ht'] + p['fin'] - p['tr'] - 2), X(1), Y(p['ht'] + p['fin'] - p['tr'] - 6), REDL, 3)
    elif p['lamps'] == 'rect':
        t.rect(X(L - 4), Y(ly + 1), X(L), Y(ly - 1), LAMP, 3); t.rect(X(0), Y(p['ht'] - p['tr'] - 1), X(3), Y(p['ht'] - p['tr'] - 4), REDL, 3); t.px(X(L - 5), Y(ly - 1), AMBER, 3)
    elif p['lamps'] == 'strip':
        t.line([(X(L - 9), Y(p['hn'] - p['nr'] - 1)), (X(L), Y(p['hn'] - p['nr'] - 1))], NEON, 3); t.line([(X(0), Y(p['ht'] - p['tr'] - 1)), (X(7), Y(p['ht'] - p['tr'] - 1))], REDL, 3)
    if p['grille'] == 'radiator' and p['xh'] < L - 12:
        t.rect(X(L - 3), Y(p['hn'] - 1), X(L), Y(c + 6), BRASS if p['lamps'] == 'brass' else CHROME, 2, vol=(1, 0))
    if p['spare']: t.ell(X(-3), Y(p['ht'] - 8), 4, r - 1, TYRE, 2, vol=(1, 1))
    hx, hy = X(xh - 4), Y(hb - 6)
    t.px(hx, hy, CHROME, 3); t.px(hx - 1, hy, CHROME, 3)
    # the lorry's bed or box
    if p['bed']: _bed(t, p, X, Y)
    # near wheels
    for xa in (p['xr'], p['xf']) + tuple(p.get('axles', ())): t.wheel(X(xa), Y(r), r, p['wheel'], ph, hub=p['hubs'])
    if p['fenders'] == 'skirt': t.rect(X(p['xr'] - arch), Y(2 * r - 2), X(p['xr'] + arch), Y(c + 1), paint, 2, vol=(0, 2))
    t.shadow(X(L / 2), G + 1, L / 2 + 2, 4)
    # who shows: the driver and a passenger in the front pane, the rest in the back
    fn, bn = p['seats'][0], sum(p['seats'][1:])
    fx, fy, fh = front
    for i in range(fn): seats.append(seat_head(X(fx + (i - (fn - 1) / 2) * 5 - .5), Y(fy + 1 - (i % 2)), below=max(6, int(fh / 2) + 1)))
    for i in range(bn):
        if back: seats.append(seat_head(X(back[0] + (i - (bn - 1) / 2) * 6), Y(back[1] + 1 - (i % 2)), below=max(6, int(back[2] / 2) + 1)))
        else: seats.append(seat_hidden(X(xt + 10), Y(hb)))
    return t.outline(), seats


def _bed(t, p, X, Y):
    kind, b0, b1, bh = p['bed']; fl = p['c'] + 12
    if kind == 'flat':
        t.rect(X(b0), Y(fl + 3), X(b1), Y(fl), WOOD, 2, vol=(1, 1))
        for x in range(int(b0) + 2, int(b1), 9): t.line([(X(x), Y(fl + bh)), (X(x), Y(fl + 3))], WOOD, 3)
        t.line([(X(b0), Y(fl + bh)), (X(b1), Y(fl + bh))], WOOD, 3); t.line([(X(b0), Y(fl + bh / 2 + 1)), (X(b1), Y(fl + bh / 2 + 1))], WOOD, 2)
    elif kind == 'tilt':
        t.rect(X(b0), Y(fl + 8), X(b1), Y(fl), WOOD, 2, vol=(1, 1))
        t.poly([(X(b0), Y(fl + 8)), (X(b0), Y(fl + bh - 4)), (X(b0 + 4), Y(fl + bh)), (X(b1 - 4), Y(fl + bh)), (X(b1), Y(fl + bh - 4)), (X(b1), Y(fl + 8))], KC, 2, vol=(3, 2))
        for x in range(int(b0) + 10, int(b1) - 4, 14): t.line([(X(x), Y(fl + bh - 1)), (X(x), Y(fl + 9))], KC, 1)
    elif kind == 'box':
        t.rect(X(b0), Y(fl + bh), X(b1), Y(fl), KB, 2, vol=(2, 3), edge=1)
        t.line([(X(b0 + 2), Y(fl + bh * .55)), (X(b1 - 2), Y(fl + bh * .55))], KC, 3, w=2)
    elif kind == 'tank':
        t.ell(X((b0 + b1) / 2), Y(fl + bh / 2 + 1), (b1 - b0) / 2, bh / 2, KB, 2, vol=(3, 4), gloss=True)
        t.rect(X(b0 + 6), Y(fl + 1), X(b1 - 6), Y(fl - 1), IRON, 2)
        t.rect(X((b0 + b1) / 2 - 3), Y(fl + bh + 3), X((b0 + b1) / 2 + 3), Y(fl + bh), IRON, 2)
    elif kind == 'tip':
        t.poly([(X(b0), Y(fl)), (X(b0 - 2), Y(fl + bh)), (X(b1 + 3), Y(fl + bh)), (X(b1), Y(fl))], KB, 2, vol=(1, 3), edge=1)
        for x in range(int(b0) + 8, int(b1), 12): t.line([(X(x), Y(fl + bh - 2)), (X(x), Y(fl + 2))], KB, 1)
    elif kind == 'semi':
        t.rect(X(b0), Y(fl + 4), X(b1), Y(fl), IRON, 2, vol=(1, 1)); t.ell(X((b0 + b1) / 2), Y(fl + 5), 6, 2, IRON, 3)


def car_end(p, FW, FH, back=False, ph=0):
    """seen from the front (coming toward us) or from behind"""
    G = FH - 9; cx = FW // 2; w = p['w']; c = p['c']; r = p['r']
    Y = lambda y: G - y
    t = Pt(FW, FH); seats = []
    paint = KA; hw = w / 2
    old = p['fenders'] == 'cycle'
    bw = hw * (.62 if old else 1)          # an old car's body is narrower than its wheels
    tw = 5 if r < 12 else 6
    for sg in (-1, 1):
        x = cx + sg * (hw - tw / 2 - (0 if old else 1))
        t.tyre_front(x - tw / 2, x + tw / 2, Y(min(2 * r, c + 9)), G)
        if old: t.rect(x - tw / 2 - 1, Y(2 * r + 2), x + tw / 2 + 1, Y(2 * r), KB, 2, vol=(1, 0))
    face = p['ht'] + p['fin'] if back else p['hn']
    deck = (p['hb'] if p['bed'] is None else p['hb']) + 5
    if p['roof'] == 'none' or p['roof'] == 'folded': deck = p['hb'] + 3
    # the face, then the bonnet or boot seen from above it
    t.poly([(cx - bw, Y(c)), (cx - bw, Y(face - 2)), (cx - bw + 2, Y(face)), (cx + bw - 2, Y(face)), (cx + bw, Y(face - 2)), (cx + bw, Y(c))], paint, 2, vol=(0, 3))
    t.poly([(cx - bw + 1, Y(face)), (cx - bw + 3, Y(deck)), (cx + bw - 3, Y(deck)), (cx + bw - 1, Y(face))], paint, 3, vol=(1, 0), gloss=True)
    if p['hoodline'] and not back: t.line([(cx, Y(face + 1)), (cx, Y(deck - 1))], paint, 2)
    hr = p['hr']
    if p['roof'] in ('hard', 'soft'):
        rp = KC if p['roof'] == 'soft' else (KB if p['two'] else paint)
        t.poly([(cx - bw + 2, Y(deck)), (cx - bw + 6, Y(hr - 1)), (cx - bw + 8, Y(hr)), (cx + bw - 8, Y(hr)), (cx + bw - 6, Y(hr - 1)), (cx + bw - 2, Y(deck))], rp, 2, vol=(2, 0), gloss=p['roof'] == 'hard')
        g0 = deck + (3 if back else 1); g1 = hr - 4; ins = 5 if not back else 8
        if p['roof'] == 'soft' and back: ins = bw - 7; g0 = deck + 6; g1 = hr - 8
        t.poly([(cx - bw + ins, Y(g0)), (cx - bw + ins + 3, Y(g1)), (cx + bw - ins - 3, Y(g1)), (cx + bw - ins, Y(g0))], GLASS, 1, vol=(1, 0))
        if not back and bw > 20: t.line([(cx, Y(g0)), (cx, Y(g1))], rp, 1) if p['windows'] and p['lamps'] in ('brass', 'pod') else None
        win = (g0 + g1) / 2, g1 - g0
    else:
        if not back:
            t.rect(cx - bw + 3, Y(deck + 12), cx + bw - 3, Y(deck), GLASS, 2, vol=(1, 0), edge=1)
        t.rect(cx - bw + 4, Y(deck + 6), cx + bw - 4, Y(deck), BLACKLEATHER, 2, vol=(1, 0)) if back else None
        win = deck + 8, 14
    # the nose or the tail
    if not back:
        if p['grille'] == 'radiator':
            t.rect(cx - 6, Y(face - 1), cx + 6, Y(c + 5), BRASS if p['lamps'] == 'brass' else CHROME, 2, vol=(1, 1), edge=1)
            t.rect(cx - 4, Y(face - 3), cx + 4, Y(c + 7), BLACK, 1)
        elif p['grille'] == 'wide':
            t.rect(cx - bw + 9, Y(face - 4), cx + bw - 9, Y(c + 7), CHROME, 2, edge=1)
            for y in range(int(c) + 8, int(face) - 4, 2): t.line([(cx - bw + 10, Y(y)), (cx + bw - 10, Y(y))], BLACK, 1)
        elif p['grille'] == 'slot':
            t.rect(cx - bw + 10, Y(face - 5), cx + bw - 10, Y(face - 8), BLACK, 1)
        elif p['grille'] == 'bars':
            for x in range(-9, 10, 3): t.line([(cx + x, Y(face - 3)), (cx + x, Y(c + 7))], BLACK, 1)
        if p['lamps'] in ('brass', 'pod'):
            lr = BRASS if p['lamps'] == 'brass' else CHROME
            for sg in (-1, 1): t.ell(cx + sg * (bw + (4 if old else -6)), Y(face - 4), 3.5, 3.5, lr, 2); t.ell(cx + sg * (bw + (4 if old else -6)), Y(face - 4), 2, 2, LAMP, 3)
        elif p['lamps'] == 'round':
            for sg in (-1, 1): t.ell(cx + sg * (bw - 5), Y(face - 6), 3, 3, LAMP, 3, edge=1)
        elif p['lamps'] == 'rect':
            for sg in (-1, 1): t.rect(cx + sg * (bw - 3), Y(face - 4), cx + sg * (bw - 10), Y(face - 8), LAMP, 3); t.px(cx + sg * (bw - 2), Y(face - 9), AMBER, 3)
        elif p['lamps'] == 'strip':
            t.line([(cx - bw + 3, Y(face - 4)), (cx + bw - 3, Y(face - 4))], NEON, 3)
    else:
        lr = REDL
        if p['lamps'] == 'strip': t.line([(cx - bw + 3, Y(face - 4)), (cx + bw - 3, Y(face - 4))], lr, 3)
        elif p['lamps'] == 'rect':
            for sg in (-1, 1): t.rect(cx + sg * (bw - 2), Y(face - 4), cx + sg * (bw - 10), Y(face - 8), lr, 3)
        else:
            for sg in (-1, 1): t.rect(cx + sg * (bw - 3), Y(face - 4 + p['fin']), cx + sg * (bw - 6), Y(face - 9), lr, 3)
        t.rect(cx - 5, Y(c + 9), cx + 5, Y(c + 6), WHITE, 3) if p['lamps'] != 'brass' else None
        if p['spare']: t.ell(cx, Y(face - 8), r - 1, r - 1, TYRE, 2, vol=(1, 2)); t.ell(cx, Y(face - 8), r * .5, r * .5, p['hubs'] or STEEL, 2)
    if p['bumper']:
        bp = CHROME if p['bumper'] is True else p['bumper']
        t.rect(cx - hw + 1, Y(c + 5), cx + hw - 1, Y(c + 2), bp, 2, vol=(1, 0))
    if p['bed']: _bed_end(t, p, cx, Y, back)
    t.shadow(cx, G + 1, hw + 2, 4)
    wy, wh = win
    fn, bn = p['seats'][0], sum(p['seats'][1:])
    side = bw * .42
    for i in range(fn):
        sx = cx + (side if i == 0 else -side if i == 1 else 0) * (1 if not back else -1) if fn > 1 else cx
        seats.append(seat_head(sx, Y(wy), below=max(5, int(wh / 2))) if not back or bn == 0 else seat_head(sx, Y(wy + 4), below=3))
    for i in range(bn):
        sx = cx + (i - (bn - 1) / 2) * min(13, 2 * side)
        seats.append(seat_head(sx, Y(wy + 4), below=2) if not back else seat_head(sx, Y(wy), below=max(5, int(wh / 2))))
    return t.outline(), seats


def _bed_end(t, p, cx, Y, back):
    kind, b0, b1, bh = p['bed']; fl = p['c'] + 12; hw = p['w'] / 2
    if kind in ('semi',): return
    top = fl + bh
    if not back:
        # over the cab roof only the top of the load shows
        if top <= p['hr'] + 2: return
        rp = KC if kind == 'tilt' else KB if kind in ('box', 'tank', 'tip') else WOOD
        t.rect(cx - hw + 2, Y(top), cx + hw - 2, Y(p['hr'] + 1), rp, 2, vol=(2, 0))
        return
    if kind == 'flat':
        t.rect(cx - hw + 1, Y(fl + bh), cx + hw - 1, Y(fl), WOOD, 2, vol=(1, 1), edge=1)
        for x in range(int(cx - hw) + 6, int(cx + hw) - 2, 7): t.line([(x, Y(fl + bh - 1)), (x, Y(fl + 1))], WOOD, 1)
    elif kind == 'tilt':
        t.poly([(cx - hw + 1, Y(fl)), (cx - hw + 1, Y(top - 5)), (cx - hw + 6, Y(top)), (cx + hw - 6, Y(top)), (cx + hw - 1, Y(top - 5)), (cx + hw - 1, Y(fl))], KC, 2, vol=(3, 2))
        t.poly([(cx - hw + 8, Y(fl + 2)), (cx - hw + 9, Y(top - 7)), (cx + hw - 9, Y(top - 7)), (cx + hw - 8, Y(fl + 2))], BLACK, 1)
        t.rect(cx - hw + 1, Y(fl + 8), cx + hw - 1, Y(fl), WOOD, 2, vol=(1, 1))
    elif kind == 'box':
        t.rect(cx - hw + 1, Y(top), cx + hw - 1, Y(fl), KB, 2, vol=(2, 2), edge=1)
        t.line([(cx, Y(top - 2)), (cx, Y(fl + 2))], KB, 1); t.px(cx - 2, Y(fl + bh / 2), CHROME, 3); t.px(cx + 2, Y(fl + bh / 2), CHROME, 3)
    elif kind == 'tank':
        t.ell(cx, Y(fl + bh / 2 + 1), hw - 3, bh / 2, KB, 2, vol=(3, 3), gloss=True, edge=1)
        t.ell(cx, Y(fl + bh / 2 + 1), 4, 4, IRON, 2)
    elif kind == 'tip':
        t.poly([(cx - hw + 2, Y(fl)), (cx - hw, Y(top)), (cx + hw, Y(top)), (cx + hw - 2, Y(fl))], KB, 2, vol=(1, 3), edge=1)


# ---- the looks: [from year, style id, label, params, colour schemes] ----
def cars():
    V = dict(fenders='cycle', wheel='spoke', lamps='brass', grille='radiator', bumper=False, board=True, hoodline=False)
    T = dict(fenders='cycle', wheel='spoke', lamps='pod', grille='radiator', bumper=False, board=True)
    F = dict(fenders='pontoon', wheel='disc', lamps='round', grille='wide')
    out = [
        (1900, 'runabout', 'Runabout', P(L=98, w=50, c=15, r=13, xr=20, xf=80, hb=30, hh=30, hn=27, ht=30, xt=18, xh=74, nr=3, tr=2, roof='none', seats=(2,), tiller=True, **V), 'early'),
        (1900, 'tonneau', 'Tonneau', P(L=124, w=52, c=15, r=13, xr=24, xf=102, hb=31, hh=33, hn=31, ht=31, xt=12, xh=90, nr=2, tr=3, roof='none', seats=(2, 3), **V), 'early'),
        (1900, 'brougham', 'Electric brougham', P(L=112, w=52, c=15, r=13, xr=22, xf=92, hb=33, hh=31, hn=28, ht=33, hr=74, xt=24, xh=86, rr=1, wr=3, nr=3, tr=2, windows=2, seats=(2, 2), **V), 'early'),
        (1920, 'tourer', 'Touring car', P(L=152, w=58, c=12, r=12, xr=24, xf=128, hb=33, hh=35, hn=34, ht=31, hr=62, xt=20, xh=98, rr=3, wr=4, nr=1, tr=4, roof='soft', windows=2, seats=(2, 3), spare=True, **T), 'twenties'),
        (1920, 'saloon', 'Saloon', P(L=150, w=58, c=12, r=12, xr=24, xf=126, hb=33, hh=35, hn=34, ht=33, hr=68, xt=14, xh=96, rr=1, wr=2, nr=1, tr=2, windows=3, seats=(2, 3), spare=True, **T), 'twenties'),
        (1920, 'roadster', 'Roadster', P(L=140, w=56, c=11, r=12, xr=26, xf=118, hb=30, hh=32, hn=31, ht=27, xt=34, xh=84, wr=6, nr=1, tr=12, roof='folded', seats=(2,), **T), 'twenties'),
        (1940, 'sedan', 'Sedan', P(L=178, w=66, c=8, r=11, xr=34, xf=146, hb=33, hh=35, hn=31, ht=30, hr=60, xt=24, xh=116, rr=26, wr=10, nr=9, tr=12, windows=2, **F), 'forties'),
        (1940, 'coupe', 'Coupe', P(L=170, w=66, c=8, r=11, xr=34, xf=140, hb=32, hh=35, hn=31, ht=29, hr=57, xt=50, xh=112, rr=22, wr=9, nr=9, tr=14, windows=1, seats=(2, 1), **F), 'forties'),
        (1940, 'field', 'Field car', P(L=124, w=60, c=11, r=11, xr=22, xf=98, hb=31, hh=33, hn=33, ht=31, xt=8, xh=78, wr=2, nr=1, tr=1, roof='none', seats=(2, 2), spare=True, grille='bars', lamps='round', bumper=IRON, hubs=KA), 'field'),
        (1960, 'sedan', 'Sedan', P(L=198, w=72, c=7, r=10, xr=38, xf=160, hb=30, hh=32, hn=30, ht=30, hr=51, xt=52, xh=134, rr=14, wr=14, nr=3, tr=2, fin=4, windows=2, wheel='white', two=True, strip=20), 'sixties'),
        (1960, 'compact', 'Small car', P(L=150, w=60, c=7, r=10, xr=30, xf=122, hb=30, hh=31, hn=24, ht=26, hr=55, xt=22, xh=110, rr=26, wr=12, nr=12, tr=14, windows=2, grille='none', seats=(2, 2)), 'sixties'),
        (1960, 'estate', 'Estate car', P(L=192, w=70, c=7, r=10, xr=38, xf=156, hb=30, hh=32, hn=30, ht=30, hr=52, xt=4, xh=130, rr=6, wr=14, nr=3, tr=2, windows=3, wheel='white', strip=20), 'sixties'),
        (1990, 'sedan', 'Sedan', P(L=172, w=64, c=6, r=10, xr=32, xf=140, hb=29, hh=30, hn=25, ht=30, hr=51, xt=30, xh=120, rr=18, wr=22, nr=4, tr=3, windows=2, wheel='alloy', lamps='rect', grille='slot', bumper=KA), 'modern'),
        (1990, 'hatch', 'Hatchback', P(L=146, w=62, c=6, r=10, xr=28, xf=120, hb=29, hh=30, hn=25, ht=29, hr=52, xt=4, xh=104, rr=14, wr=20, nr=4, tr=3, windows=2, wheel='disc', lamps='rect', grille='slot', bumper=BLACK, seats=(2, 2)), 'modern'),
        (1990, 'fourbyfour', 'Four-wheel drive', P(L=172, w=68, c=11, r=13, xr=30, xf=140, hb=36, hh=38, hn=36, ht=36, hr=67, xt=3, xh=120, rr=3, wr=10, nr=2, tr=2, windows=3, wheel='alloy', lamps='rect', grille='bars', bumper=BLACK, spare=True), 'modern'),
        (2040, 'pod', 'Saloon', P(L=170, w=66, c=5, r=10, xr=30, xf=140, hb=27, hh=28, hn=20, ht=28, hr=49, xt=16, xh=132, rr=30, wr=44, nr=6, tr=6, windows=2, wheel='alloy', lamps='strip', grille='none', bumper=False, glassroof=True, hoodline=False, hubs=IRON), 'future'),
        (2040, 'sport', 'Sports car', P(L=168, w=70, c=4, r=10, xr=30, xf=138, hb=24, hh=25, hn=16, ht=27, hr=40, xt=40, xh=116, rr=24, wr=34, nr=5, tr=4, windows=1, wheel='alloy', lamps='strip', grille='none', bumper=False, hoodline=False, seats=(2,), hubs=IRON), 'future'),
        (2040, 'cab', 'Driverless cab', P(L=148, w=66, c=5, r=9, xr=24, xf=124, hb=26, hh=26, hn=22, ht=26, hr=66, xt=3, xh=145, rr=12, wr=12, nr=6, tr=6, windows=3, wheel='alloy', lamps='strip', grille='none', bumper=False, glassroof=True, hoodline=False, seats=(2, 3), hubs=IRON), 'future'),
    ]
    return out


def trucks():
    V = dict(fenders='cycle', wheel='spoke', lamps='brass', grille='radiator', bumper=False, hoodline=False, seats=(3,), tall=24, windows=1)
    M = dict(fenders='pontoon', wheel='disc', lamps='round', grille='wide', seats=(3,), tall=24, windows=1, bumper=IRON)
    N = dict(wheel='disc', lamps='rect', grille='slot', seats=(3,), tall=24, windows=1, bumper=BLACK)
    def T(L, cab0, cab1, **k):
        d = dict(L=L, w=78, c=12, r=13, xr=36, xf=L - 30, hb=44, hh=46, hn=44, ht=24, hr=74, xt=cab0, xh=cab1, rr=1, wr=3, nr=2, tr=1); d.update(k); return P(**d)
    out = []
    for yr, base, L, cab, extra, sch in (
        (1900, V, 190, (118, 152), dict(roof='none', hb=40, hh=42, hn=40, w=66), 'early'),
        (1920, V, 200, (120, 158), dict(lamps='pod', hr=76, w=70), 'twenties'),
        (1940, M, 216, (126, 170), dict(hn=40, nr=6, hr=76), 'forties'),
        (1960, M, 230, (176, 226), dict(hh=44, hn=44, nr=2, wr=6, hr=82, fenders='flush', grille='wide', xf=200), 'sixties'),
        (1990, N, 236, (180, 232), dict(hh=44, hn=40, nr=3, wr=10, hr=86, xf=206, wheel='disc'), 'modern'),
        (2040, N, 236, (176, 234), dict(hh=40, hn=30, nr=8, wr=26, hr=84, xf=208, lamps='strip', grille='none', bumper=False, hubs=IRON, glassroof=True), 'future')):
        beds = (('flat', 'Flatbed', ('flat', 6, cab[0] - 6, 12)), ('covered', 'Covered', ('tilt' if yr < 1960 else 'box', 6, cab[0] - 6, 48 if yr < 1960 else 56)), ('tanker', 'Tanker', ('tank', 8, cab[0] - 8, 34)))
        if yr >= 1960: beds = (('tipper', 'Tipper', ('tip', 8, cab[0] - 8, 30)),) + beds[1:]
        for sid, label, bed in beds:
            k = dict(base); k.update(extra); k['bed'] = bed
            if yr >= 1960: k['axles'] = (62,)
            out.append((yr, sid, label, T(L, cab[0], cab[1], **k), 'work' if sch in ('early', 'twenties') else sch if sch == 'future' else 'haul'))
    return out


# ---- armoured cars and tanks: a hull, wheels or tracks, a turret and a gun ----
def A(**k):
    d = dict(L=200, w=84, hull=[], tracks=None, wheels=(), r=12, wheel='disc', turret=None, gun=None, hatch=None, extras=(), seats=4, tall=24, front=None, mg=None, skirt=False, c=10)
    d.update(k); return d


def _track(t, X, Y, x0, x1, h, r, ph, rise=0, rhomb=None):
    """a run of track with its road wheels; rise: how far the ends are lifted"""
    if rhomb:
        t.poly([(X(x), Y(y)) for x, y in rhomb], IRON, 1, vol=(2, 2), edge=0)
        ins = [(x + (3 if i < len(rhomb) / 2 else -3) * 0, y) for i, (x, y) in enumerate(rhomb)]
        cx = sum(x for x, y in rhomb) / len(rhomb); cy = sum(y for x, y in rhomb) / len(rhomb)
        t.poly([(X(cx + (x - cx) * .9), Y(cy + (y - cy) * .74)) for x, y in rhomb], KA, 2, vol=(2, 3))
        for x in range(int(x0) + 4 + int(ph * 3) % 6, int(x1) - 2, 6): t.px(X(x), Y(1), IRON, 3)
        return
    t.poly([(X(x0 + r), Y(0)), (X(x0), Y(r + rise)), (X(x0 + r * .6), Y(h)), (X(x1 - r * .6), Y(h)), (X(x1), Y(r + rise)), (X(x1 - r), Y(0))], IRON, 1, vol=(1, 2), edge=0)
    n = max(3, int((x1 - x0 - 2 * r) / (2 * r + 1)))
    for i in range(n + 1):
        cx = x0 + r + 2 + (x1 - x0 - 2 * r - 4) * i / n
        t.wheel(X(cx), Y(r * .9 + 1), r * .82, 'disc', ph, hub=KA)
    t.ell(X(x0 + r * .8), Y(r + rise + 1), r * .55, r * .55, IRON, 2); t.ell(X(x1 - r * .8), Y(r + rise + 1), r * .55, r * .55, IRON, 2)
    for x in range(int(x0) + r + int(ph * 3) % 5, int(x1) - r, 5): t.px(X(x), Y(0), IRON, 3)


def armour_side(p, FW, FH, ph=0):
    G = FH - 9; L = p['L']; x0 = (FW - L) // 2
    X = lambda x: x0 + x
    Y = lambda y: G - y
    t = Pt(FW, FH); r = p['r']
    for xa in p['wheels']: t.ell(X(xa) + 2, Y(r) - 1, r, r, TYRE, 1)
    if p['tracks'] and not p['tracks'].get('rhomb'):
        tr = p['tracks']; _track(t, X, Y, tr['x0'], tr['x1'], tr['h'], tr.get('r', 8), ph, tr.get('rise', 0))
    t.poly([(X(x), Y(y)) for x, y in p['hull']], KA, 2, vol=(2, 3), edge=1)
    if p['tracks'] and p['tracks'].get('rhomb'):
        _track(t, X, Y, 0, L, 0, 0, ph, rhomb=p['tracks']['rhomb'])
    for e in p['extras']:
        k = e[0]
        if k == 'rect': t.rect(X(e[1]), Y(e[2]), X(e[3]), Y(e[4]), e[5], 2, vol=(1, 1), edge=1)
        elif k == 'line': t.line([(X(e[1]), Y(e[2])), (X(e[3]), Y(e[4]))], e[5], e[6] if len(e) > 6 else 1)
        elif k == 'slit': t.rect(X(e[1]), Y(e[2]), X(e[1] + e[3]), Y(e[2] - 1), GLASS, 1)
        elif k == 'glass': t.poly([(X(x), Y(y)) for x, y in e[1]], GLASS, 1, vol=(1, 0))
        elif k == 'rivets':
            for x in range(int(e[1]), int(e[3]), 6): t.px(X(x), Y(e[2]), KA, 1)
        elif k == 'ell': t.ell(X(e[1]), Y(e[2]), e[3], e[4], e[5], 2, vol=(1, 1), edge=1)
    hatch = None
    if p['turret']:
        tx0, tx1, ty0, ty1, slope = p['turret']
        if p['gun']:
            gl, gy, gw = p['gun']
            t.line([(X(tx1 - 2), Y(gy)), (X(tx1 + gl), Y(gy))], IRON, 2, w=gw); t.line([(X(tx1 - 2), Y(gy + gw // 2)), (X(tx1 + gl), Y(gy + gw // 2))], IRON, 3)
            if gw > 2: t.rect(X(tx1 + gl - 4), Y(gy + gw // 2 + 1), X(tx1 + gl), Y(gy - gw // 2 - 1), IRON, 1)
        t.poly([(X(tx0), Y(ty0)), (X(tx0 + slope), Y(ty1)), (X(tx1 - slope * 1.5), Y(ty1)), (X(tx1), Y(ty0))], KA, 2, vol=(2, 2), edge=1, gloss=True)
        hx = (tx0 + tx1) / 2 - 3
        t.rect(X(hx - 5), Y(ty1 + 2), X(hx + 5), Y(ty1), KA, 1)
        hatch = (hx, ty1)
    if p['hatch']: hatch = p['hatch']
    if p['mg']:
        mx, my = p['mg']; t.line([(X(mx), Y(my)), (X(mx + 12), Y(my + 2))], IRON, 1, w=1)
    for xa in p['wheels']: t.wheel(X(xa), Y(r), r, p['wheel'], ph, hub=KA)
    if p['skirt']: t.rect(X(p['tracks']['x0'] + 6), Y(p['tracks']['h'] + 1), X(p['tracks']['x1'] - 6), Y(p['tracks']['h'] - 7), KA, 2, vol=(1, 2), edge=1)
    t.shadow(X(L / 2), G + 1, L / 2 + 2, 4)
    seats = []
    for i in range(p['seats']):
        if i == 0 and hatch: seats.append(seat_head(X(hatch[0]), Y(hatch[1] + 9), below=9))
        elif i < len(p.get('show', ())) + 1 and p.get('show'): sx, sy = p['show'][i - 1]; seats.append(seat_head(X(sx), Y(sy), below=7))
        else: seats.append(seat_hidden(X(L / 2), Y(20)))
    return t.outline(), seats


def armour_end(p, FW, FH, back=False, ph=0):
    G = FH - 9; cx = FW // 2; hw = p['w'] / 2
    Y = lambda y: G - y
    t = Pt(FW, FH)
    hh = max(y for x, y in p['hull']); c = p['c']
    if p['tracks']:
        tw = 13
        for sg in (-1, 1):
            x = cx + sg * (hw - tw / 2)
            t.rect(x - tw / 2, Y(p['tracks'].get('eh', p['tracks']['h'])), x + tw / 2, G, IRON, 1, vol=(1, 2), edge=0)
            for y in range(int(Y(p['tracks'].get('eh', p['tracks']['h']))) + 2 + int(ph * 2) % 3, G, 3): t.line([(x - tw / 2 + 1, y), (x + tw / 2 - 1, y)], IRON, 3)
        bw = hw - tw + 2
    else:
        for sg in (-1, 1):
            x = cx + sg * (hw - 4); t.tyre_front(x - 4, x + 4, Y(min(2 * p['r'], c + 12)), G)
        bw = hw - 2
    f = p['front'] or dict(nose=hh * .55)
    nose = f['nose']
    t.poly([(cx - bw, Y(c)), (cx - bw, Y(nose)), (cx + bw, Y(nose)), (cx + bw, Y(c))], KA, 2, vol=(0, 3), edge=1)
    t.poly([(cx - bw, Y(nose)), (cx - bw + 4, Y(hh + 4)), (cx + bw - 4, Y(hh + 4)), (cx + bw, Y(nose))], KA, 3, vol=(1, 0), edge=1)
    if p['tracks'] and p['tracks'].get('rhomb'):
        for sg in (-1, 1): t.rect(cx + sg * (hw + 2), Y(hh * .62), cx + sg * (hw - 6), Y(hh * .3), KA, 2, vol=(1, 1), edge=1)
    if not back:
        for sx in f.get('slits', (-10, 10)): t.rect(cx + sx - 4, Y(nose + (hh + 4 - nose) * .55), cx + sx + 4, Y(nose + (hh + 4 - nose) * .55) + 1, GLASS, 1)
        if f.get('glass'): t.rect(cx - bw + 5, Y(hh + 1), cx + bw - 5, Y(nose + 3), GLASS, 1, vol=(1, 0))
        for sg in (-1, 1): t.ell(cx + sg * (bw - 6), Y(c + (nose - c) * .6), 2.5, 2.5, LAMP, 3, edge=1)
    else:
        for sg in (-1, 1): t.rect(cx + sg * (bw - 3), Y(c + (nose - c) * .7), cx + sg * (bw - 6), Y(c + (nose - c) * .7 - 3), REDL, 3)
        t.rect(cx - 9, Y(nose - 3), cx + 9, Y(c + 4), KA, 1, edge=0)
    hatch = None
    if p['turret']:
        tx0, tx1, ty0, ty1, slope = p['turret']; tw2 = min(bw + 6, (tx1 - tx0) * .5)
        d = 5
        t.poly([(cx - tw2, Y(ty0 + d)), (cx - tw2 + 3, Y(ty1 + d)), (cx + tw2 - 3, Y(ty1 + d)), (cx + tw2, Y(ty0 + d))], KA, 2, vol=(2, 2), edge=1, gloss=True)
        if p['gun']:
            gl, gy, gw = p['gun']
            if not back: t.ell(cx, Y(gy + d), gw / 2 + 2, gw / 2 + 2, IRON, 2, edge=0); t.ell(cx, Y(gy + d), max(1, gw / 2 - .5), max(1, gw / 2 - .5), BLACK, 0)
            else: t.rect(cx - gw / 2, Y(ty1 + d + 3), cx + gw / 2, Y(ty1 + d + 3 + min(22, gl * .4)), IRON, 2)
        hatch = (cx + (5 if not back else -5), ty1 + d)
    if p['hatch']: hatch = (cx, p['hatch'][1] + 4)
    t.shadow(cx, G + 1, hw + 2, 4)
    seats = []
    for i in range(p['seats']):
        if i == 0 and hatch: seats.append(seat_head(hatch[0], Y(hatch[1] + 9), below=9))
        elif f.get('glass') and i < 3 and not back: seats.append(seat_head(cx + (-12 if i == 1 else 12), Y((hh + nose) / 2 + 3), below=5))
        else: seats.append(seat_hidden(cx, Y(20)))
    return t.outline(), seats


def armoured():
    out = []
    # 1914: a touring car's chassis under riveted plate, one turret
    for sid, label, tur, ex in (('turret', 'Turret car', (62, 104, 52, 72, 4), ()), ('open', 'Open-topped', None, (('line', 60, 54, 110, 54, KA, 3),)), ('twin', 'Twin turret', (52, 86, 52, 68, 3), (('rect', 96, 66, 116, 52, KA),))):
        out.append((1914, sid, label, A(L=176, w=70, r=13, wheel='spoke', wheels=(30, 146), c=14, hull=[(6, 16), (4, 50), (118, 52), (124, 40), (170, 38), (174, 18)], turret=tur, gun=(16, 62, 2) if tur else None,
            hatch=None if tur else (84, 50), mg=None if tur else (96, 56), extras=(('rivets', 10, 46, 116), ('slit', 126, 36, 8), ('rect', 170, 34, 175, 20, IRON)) + ex, seats=8, front=dict(nose=38, slits=(-9, 9))), 'army'))
    # 1940: scout car, half-track, heavy armoured car
    out.append((1940, 'scout', 'Scout car', A(L=170, w=74, r=13, wheels=(30, 138), c=12, hull=[(4, 16), (2, 44), (22, 52), (110, 52), (128, 38), (164, 34), (168, 16)], hatch=(70, 50), mg=(84, 56), extras=(('slit', 112, 46, 9), ('rivets', 26, 48, 108)), seats=8, front=dict(nose=34, slits=(-11, 11))), 'army'))
    out.append((1940, 'halftrack', 'Half-track', A(L=204, w=78, r=13, wheels=(170,), c=12, tracks=dict(x0=6, x1=112, h=22, r=8, rise=2, eh=20), hull=[(4, 22), (2, 52), (132, 52), (142, 44), (198, 38), (202, 18), (120, 18), (116, 22)], hatch=(60, 50), mg=(120, 58), extras=(('slit', 134, 48, 8), ('line', 6, 46, 128, 46, KA)), seats=8, front=dict(nose=36, slits=(-11, 11))), 'army'))
    out.append((1940, 'heavy', 'Heavy armoured car', A(L=186, w=78, r=13, wheels=(24, 66, 120, 162), c=12, hull=[(4, 18), (0, 36), (16, 54), (150, 54), (182, 36), (184, 18)], turret=(62, 122, 54, 74, 5), gun=(26, 64, 3), seats=8, front=dict(nose=36, slits=(-10, 10))), 'army'))
    # 1960: tracked carrier, wheeled carrier, riot van
    out.append((1960, 'carrier', 'Tracked carrier', A(L=196, w=92, tracks=dict(x0=4, x1=192, h=20, r=8, rise=3), hull=[(2, 18), (0, 58), (150, 60), (192, 34), (194, 18)], hatch=(120, 59), mg=(128, 66), extras=(('line', 4, 50, 160, 50, KA), ('rect', 20, 64, 60, 60, KA)), seats=8, front=dict(nose=30, slits=(-14, 14))), 'army'))
    out.append((1960, 'wheeled', 'Wheeled carrier', A(L=210, w=88, r=13, wheels=(26, 70, 138, 182), c=13, hull=[(6, 16), (0, 40), (10, 60), (160, 60), (204, 40), (208, 20), (200, 16)], turret=(96, 132, 60, 72, 4), gun=(18, 66, 2), seats=8, front=dict(nose=38, slits=(-13, 13))), 'army'))
    out.append((1960, 'riot', 'Riot van', A(L=186, w=76, r=12, wheels=(34, 150), c=11, hull=[(4, 14), (2, 72), (136, 72), (150, 46), (182, 44), (184, 16)], extras=(('glass', [(134, 68), (146, 48), (118, 48), (118, 68)]), ('slit', 30, 60, 14), ('slit', 60, 60, 14), ('slit', 90, 60, 14), ('line', 4, 40, 148, 40, KB), ('rect', 100, 78, 112, 72, REDL)), seats=8, show=((130, 58),), front=dict(nose=44, glass=True, slits=())), 'police'))
    # 1990: mine-proof truck, eight-wheeler, police carrier
    out.append((1990, 'mrap', 'Mine-proof truck', A(L=206, w=86, r=15, wheel='disc', wheels=(40, 166), c=18, hull=[(8, 22), (4, 76), (150, 76), (162, 52), (200, 50), (204, 24), (104, 14)], hatch=(90, 75), mg=(98, 82), extras=(('glass', [(148, 72), (158, 54), (132, 54), (132, 72)]), ('slit', 40, 62, 16), ('slit', 76, 62, 16), ('rect', 84, 84, 98, 76, KA)), seats=8, show=((144, 62),), front=dict(nose=50, glass=True, slits=())), 'army'))
    out.append((1990, 'eight', 'Eight-wheeled carrier', A(L=220, w=90, r=13, wheels=(26, 68, 140, 184), c=13, hull=[(8, 16), (0, 42), (14, 62), (166, 62), (214, 40), (218, 22), (208, 16)], turret=(100, 150, 62, 76, 5), gun=(34, 68, 3), extras=(('line', 10, 46, 200, 46, KA),), seats=8, front=dict(nose=40, slits=(-14, 14))), 'army'))
    out.append((1990, 'police', 'Police carrier', A(L=190, w=78, r=13, wheels=(36, 152), c=13, hull=[(4, 16), (2, 70), (132, 70), (150, 46), (186, 44), (188, 18)], extras=(('glass', [(130, 66), (146, 48), (112, 48), (112, 66)]), ('slit', 30, 58, 16), ('slit', 66, 58, 16), ('line', 4, 38, 150, 38, KB, 2), ('rect', 96, 76, 110, 70, NEON)), seats=8, show=((126, 58),), front=dict(nose=44, glass=True, slits=())), 'police'))
    # 2040
    out.append((2040, 'crawler', 'Carrier', A(L=214, w=90, r=13, wheel='alloy', wheels=(28, 72, 142, 186), c=12, hull=[(10, 14), (0, 36), (20, 60), (150, 62), (212, 30), (212, 18), (204, 14)], turret=(84, 120, 62, 70, 6), gun=(30, 66, 2), extras=(('line', 20, 44, 196, 44, NEON),), seats=8, front=dict(nose=34, slits=(-14, 14))), 'army'))
    out.append((2040, 'hover', 'Skirted carrier', A(L=204, w=90, tracks=dict(x0=6, x1=198, h=14, r=6, rise=4), skirt=True, hull=[(2, 14), (0, 40), (24, 58), (140, 60), (200, 34), (202, 14)], hatch=(100, 59), mg=(106, 66), extras=(('line', 24, 46, 190, 46, NEON),), seats=8, front=dict(nose=34, slits=(-14, 14))), 'army'))
    out.append((2040, 'patrol', 'Patrol car', A(L=184, w=78, r=12, wheel='alloy', wheels=(34, 150), c=10, hull=[(6, 12), (0, 34), (20, 62), (120, 62), (150, 40), (182, 34), (182, 14)], extras=(('glass', [(118, 58), (144, 42), (96, 42), (96, 58)]), ('line', 6, 30, 178, 30, NEON), ('rect', 80, 66, 100, 62, NEON)), seats=8, show=((118, 50),), front=dict(nose=38, glass=True, slits=())), 'police'))
    return out


def tanks():
    out = []
    rh = [(10, 0), (0, 22), (16, 62), (150, 70), (214, 44), (222, 26), (196, 0)]
    for sid, label, ex in (('male', 'Gun tank', (('rect', 92, 44, 128, 22, KA), ('line', 126, 34, 150, 34, IRON, 3))), ('female', 'Machine-gun tank', (('rect', 92, 44, 124, 24, KA), ('line', 122, 38, 136, 38, IRON, 1), ('line', 122, 30, 136, 30, IRON, 1))), ('supply', 'Supply tank', (('rect', 60, 78, 130, 68, WOOD),))):
        out.append((1916, sid, label, A(L=222, w=104, tracks=dict(rhomb=rh, h=60, eh=58), hull=[(60, 60), (60, 74), (118, 76), (120, 62)], hatch=(90, 75), extras=(('slit', 108, 70, 8),) + ex, seats=8, front=dict(nose=36, slits=(-8, 8))), 'army'))
    def T(L, th, hull, tur, gun, w=88, **k):
        return A(L=L, w=w, tracks=dict(x0=2, x1=L - 2, h=th, r=k.pop('tr', 8), rise=k.pop('rise', 4)), hull=hull, turret=tur, gun=gun, front=dict(nose=th + 8, slits=(-10,)), **k)
    out += [
        (1930, 'tankette', 'Tankette', T(112, 16, [(4, 14), (2, 36), (70, 40), (96, 30), (108, 16)], None, None, w=66, hatch=(50, 38), mg=(74, 36), seats=2, tr=6, rise=2), 'army'),
        (1930, 'light', 'Light tank', T(150, 20, [(4, 18), (2, 40), (100, 42), (132, 34), (146, 20)], (46, 90, 42, 60, 4), (22, 51, 2), w=78, seats=3), 'army'),
        (1930, 'multi', 'Many-turreted tank', T(200, 24, [(4, 22), (2, 46), (150, 48), (184, 36), (196, 24)], (70, 122, 48, 70, 5), (30, 60, 3), w=92, seats=6, extras=(('rect', 136, 58, 156, 48, KA), ('line', 154, 53, 168, 53, IRON, 1), ('rect', 30, 58, 50, 48, KA))), 'army'),
        (1940, 'medium', 'Medium tank', T(190, 24, [(4, 22), (0, 44), (30, 52), (140, 52), (180, 36), (188, 24)], (60, 122, 52, 74, 6), (46, 63, 3), w=96), 'army'),
        (1940, 'heavy', 'Heavy tank', T(214, 28, [(4, 26), (2, 54), (160, 56), (176, 44), (208, 40), (212, 28)], (64, 138, 56, 80, 3), (60, 68, 4), w=110, seats=5), 'army'),
        (1940, 'assault', 'Assault gun', T(186, 24, [(4, 22), (2, 42), (30, 62), (120, 62), (150, 44), (182, 36), (184, 24)], None, None, w=96, hatch=(70, 61), extras=(('line', 140, 50, 196, 50, IRON, 4), ('rect', 192, 53, 197, 47, IRON)), seats=4), 'army'),
        (1960, 'battle', 'Battle tank', T(212, 24, [(4, 22), (0, 40), (20, 50), (170, 50), (206, 32), (210, 24)], (70, 140, 50, 68, 12), (76, 59, 3), w=106), 'army'),
        (1960, 'light', 'Light tank', T(176, 20, [(4, 18), (0, 36), (16, 44), (140, 44), (170, 28), (174, 20)], (60, 112, 44, 60, 8), (54, 52, 2), w=92), 'army'),
        (1960, 'aa', 'Flak tank', T(196, 24, [(4, 22), (0, 42), (20, 50), (160, 50), (190, 32), (194, 24)], (66, 124, 50, 76, 3), None, w=100, extras=(('line', 110, 70, 150, 92, IRON, 2), ('line', 110, 64, 152, 86, IRON, 2), ('ell', 82, 84, 9, 5, IRON))), 'army'),
        (1980, 'battle', 'Battle tank', T(226, 24, [(4, 22), (0, 40), (16, 48), (186, 48), (222, 30), (224, 24)], (60, 150, 48, 66, 4), (88, 57, 4), w=114, skirt=True, extras=(('rect', 52, 64, 64, 50, KA),)), 'army'),
        (1980, 'infantry', 'Fighting vehicle', T(204, 22, [(4, 20), (0, 44), (12, 54), (150, 54), (198, 32), (200, 22)], (86, 126, 54, 68, 5), (40, 61, 2), w=104, seats=8, skirt=True), 'army'),
        (1980, 'engineer', 'Recovery tank', T(214, 24, [(4, 22), (0, 42), (16, 54), (150, 54), (206, 32), (210, 24)], None, None, w=110, hatch=(110, 53), extras=(('line', 60, 54, 150, 92, IRON, 3), ('line', 150, 92, 150, 74, IRON, 1), ('rect', 30, 62, 70, 54, KA)), skirt=True), 'army'),
        (2040, 'battle', 'Battle tank', T(226, 22, [(4, 20), (0, 36), (24, 46), (180, 46), (224, 26), (224, 22)], (90, 150, 46, 58, 10), (84, 52, 3), w=114, skirt=True, extras=(('line', 24, 38, 200, 38, NEON),)), 'army'),
        (2040, 'drone', 'Crewless tank', T(170, 18, [(4, 16), (0, 28), (20, 36), (130, 36), (168, 22), (168, 18)], (60, 104, 36, 46, 8), (60, 41, 2), w=92, skirt=True, seats=1, extras=(('rect', 40, 42, 50, 36, NEON),)), 'army'),
        (2040, 'walker', 'Heavy tank', T(230, 26, [(4, 24), (0, 44), (24, 56), (176, 56), (226, 32), (228, 26)], (70, 150, 56, 74, 8), (90, 65, 5), w=118, skirt=True, extras=(('line', 24, 46, 206, 46, NEON), ('rect', 96, 80, 120, 74, KA))), 'army'),
    ]
    return out


# ---- the Future Darkness row (B4976): looks that join the row before them (adds), from 2023, the first year past the
# main timeline. After the vehicles the near-future game books describe, under plain names. ----
_cars0, _armoured0, _tanks0 = cars, armoured, tanks
def cars():
    out = _cars0(); base = next(l for l in out if l[0] == 1990 and l[1] == 'sedan')
    return out + [(2023, 'armedcab', 'Armoured cab', dict(base[3], adds=True, bumper=IRON, strip=22), 'bright')]
def armoured():
    out = _armoured0(); base = next(l for l in out if l[0] == 2040 and l[1] == 'hover')
    return out + [(2023, 'hovercraft', 'Combat hovercraft', dict(base[3], adds=True, turret=(60, 104, 60, 70, 6), gun=(30, 66, 2)), 'army')]
def tanks():
    out = _tanks0(); base = next(l for l in out if l[0] == 2040 and l[1] == 'battle')
    return out + [(2023, 'capsule', 'Tracked capsule', dict(base[3], adds=True, hull=[(4, 20), (0, 38), (16, 54), (196, 54), (222, 38), (224, 22)], turret=(150, 186, 54, 62, 6), gun=(64, 58, 4)), 'army')]
