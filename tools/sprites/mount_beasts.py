# Beasts to ride for the mount sprites (B4970): the four-legged rig of beast.py on a larger frame, at its true size, the
# coat and mane in key ramps, with the tack of the era laid over it.
import math, numpy as np
import crinos as K, beast as B
from mountkit import *
FW = FH = 144
GROUND = 134
_MA, _MB = (200, 0, 200), (0, 200, 200)        # marker colours the rig is given; their ramps become KA and KB


def _rig(a, view, f):
    """one frame from the rig on the big frame: view 'side', 'front' or 'back'"""
    old = (K.S, K.SH, K.YO, B.S, B.SH)
    K.S = B.S = FW; K.SH = B.SH = FH; K.YO = GROUND - 87
    try:
        im = B.side(a, f) if view == 'side' else B.front(a, f, view == 'back')
    finally:
        K.S, K.SH, K.YO, B.S, B.SH = old
    if view != 'side': im = np.roll(im, FW // 2 - 48, 1)      # the rig draws its front view about column 48
    out = im.copy()
    for mk, key in ((_MA, KA), (_MB, KB)):
        for i, c in enumerate(B.ramp(mk)):
            m = (im[..., 0] == c[0]) & (im[..., 1] == c[1]) & (im[..., 2] == c[2])
            out[m, :3] = key[i]
        # the belly is the coat made lighter: fold it back into the coat's lighter tones
        for i, c in enumerate([tuple(min(255, int(v * 1.22 + 10)) for v in t) for t in B.ramp(mk)]):
            m = (im[..., 0] == c[0]) & (im[..., 1] == c[1]) & (im[..., 2] == c[2])
            out[m, :3] = key[min(4, i + 1)]
        # a tuft or a dark part the rig makes from half the coat's colour
        for i, c in enumerate(B.ramp(tuple(int(v * .5) for v in mk))):
            m = (im[..., 0] == c[0]) & (im[..., 1] == c[1]) & (im[..., 2] == c[2])
            out[m, :3] = key[max(0, i - 1)]
    return out


def beast(base, **k):
    a = dict(B.KINDS[base]); a.update(k)
    a['fur'] = _MA; a['belly'] = None
    if a.get('mane'): a['mane'] = _MB
    if a.get('headfur'): a['headfur'] = _MB
    if a.get('wings'): a['wings'] = (_MB, a['wings'][1], a['wings'][2])
    a['ox'] = FW // 2 - 6 * a['bl'] * a['s']
    return a


def _top(im, x):
    col = np.nonzero(im[:, int(round(x)), 3])[0]
    return int(col.min()) if len(col) else GROUND - 50


def _span(im):
    xs = np.nonzero(im[..., 3].any(0))[0]
    return int(xs.min()), int(xs.max())


def _body_mask(im):
    return (im[..., 3] > 0) & (im[..., 0] == im[..., 2]) & (im[..., 1] == 0) & (im[..., 0] >= 90)


def draw(a, tack, marks=(), f=0):
    """the four facings of one walk frame, with tack. -> ({facing: picture}, {facing: seats})"""
    s = a['s']; bl = a['bl']; ox = a['ox']
    out = {}; seats = {}
    for view in ('side', 'front', 'back'):
        im = _rig(a, view, f); t = Pt(FW, FH); t.paste(im); body = _body_mask(im)
        if view == 'side':
            sx = ox + (-1.5) * bl * s; by = _top(_rig(a, 'side', 0), sx) + 1
            for mk in marks: _mark(t, im, body, mk, a, view)
            _tack_side(t, tack, sx, by, a, im)
            seats['right'] = [seat_astride(sx + 1, by - 1), seat_astride(sx - 11, by)]
            out['right'] = t.outline()
        else:
            cx = FW // 2
            base = _rig(a, view, 0); col = np.nonzero(base[:, cx, 3])[0]
            # the back is behind the head when it comes toward us, in plain sight from behind
            ys = np.nonzero(base[..., 3].any(1))[0]; top = int(ys.min())
            x0, x1 = _span(base)
            by = GROUND - int(31 * a['ll'] * s)
            for mk in marks: _mark(t, im, body, mk, a, view)
            _tack_end(t, tack, cx, by, a, view == 'back', (x0, x1))
            if view == 'front':
                seats['down'] = [seat_astride(cx, by - 5, cut=84), seat_astride(cx, by - 9, cut=70)]; out['down'] = t.outline()
            else:
                seats['up'] = [seat_astride(cx, by - 4, cut=93), seat_astride(cx, by + 3, cut=93)]; out['up'] = t.outline()
    out['left'] = mirror(out['right']); seats['left'] = [dict(q, x=FW - 1 - q['x']) for q in seats['right']]
    return out, seats


def _mark(t, im, body, mk, a, view):
    """marks on the coat that no colour scheme gives: white socks and a blaze, patches, a dark stripe, veins, plates of bone, fire"""
    H, W = body.shape; yy, xx = np.mgrid[0:H, 0:W]
    if mk == 'socks':
        m = body & (yy >= GROUND - 9); t.c[m, :3] = WHITE[3]
        m2 = body & (yy >= GROUND - 11) & (yy < GROUND - 9); t.c[m2, :3] = WHITE[2]
    elif mk == 'feather':
        m = body & (yy >= GROUND - 12); t.c[m, :3] = WHITE[3]
        if view == 'side':
            for x in np.nonzero(m.any(0))[0][::3]: t.px(x - 1, GROUND - 5, WHITE, 2)
    elif mk == 'blaze':
        hx = a['ox'] + (a['head'][0] + 5) * a['bl'] * a['s'] if view == 'side' else W // 2
        hy = GROUND + (a['head'][1] + 1) * a['ll'] * a['s']
        if view == 'side': t.line([(hx, hy - 2), (hx + 6, hy + 2)], WHITE, 3)
        elif view == 'front': t.line([(hx, hy + 2), (hx, hy + 11)], WHITE, 3)
    elif mk == 'patches':
        n = np.sin(xx * .21 + 1.3) + np.cos(yy * .27 + xx * .08) + np.sin((xx + yy) * .11)
        m = body & (n > .75) & (yy < GROUND - 14); t.c[m, :3] = WHITE[3]
    elif mk == 'dapple':
        m = body & ((xx * 7 + yy * 13) % 11 == 0) & (yy < GROUND - 22) & (yy > GROUND - 62); t.c[m, :3] = KA[4]
    elif mk == 'stripe' and view == 'side':
        x0, x1 = _span(im); 
        for x in range(x0 + 14, x1 - 34): 
            y = _top(im, x) + 1
            if body[y, x]: t.c[y, x, :3] = KB[1]
    elif mk == 'veins':
        m = body & ((xx * 5 + yy * 3) % 17 == 0) & (((xx // 3) + (yy // 2)) % 3 == 0); t.c[m, :3] = (120, 20, 26)
        eye = (im[..., 0] == a['eye'][0]) & (im[..., 1] == a['eye'][1]) & (im[..., 2] == a['eye'][2]); t.c[eye, :3] = (240, 40, 30)
    elif mk == 'bone':
        # plates of bone along the top line, and stitched seams where the flesh was joined
        top = np.where(body.any(0), body.argmax(0), H)[None, :]
        m = body & (yy - top < 5) & ((xx // 6) % 3 != 2) & (yy < GROUND - 30); t.c[m, :3] = BONE[3]
        e = m & (yy - top < 1); t.c[e, :3] = BONE[4]
        e = m & (yy - top == 4); t.c[e, :3] = BONE[1]
        m = body & ((xx + yy // 3) % 19 == 0) & (yy % 3 != 0) & (yy - top >= 6) & (yy < GROUND - 26); t.c[m, :3] = KB[1]
    elif mk == 'stars':
        m = body & ((xx * 31 + yy * 17) % 53 == 0); t.c[m, :3] = (236, 240, 250)
    elif mk == 'ribs' and view == 'side':
        cx = a['ox'] + 0 * a['bl'] * a['s']; top = _top(im, cx)
        for i in range(-3, 4):
            x = int(cx + i * 4)
            for y in range(top + 5, top + 17):
                if body[y, x]: t.c[y, x, :3] = KA[1]
    elif mk == 'fire':
        ys, xs = np.nonzero(body & (yy >= GROUND - 3))
        for x in sorted(set(xs))[::2]:
            for k, c in enumerate(((150, 220, 240), (110, 170, 230), (80, 110, 200))):
                yq = GROUND - 1 - k * 2 - ((x * 7) % 3)
                if 0 <= yq < H and t.c[yq, x - 1 + k % 2, 3] == 0: t.c[yq, x - 1 + k % 2] = (*c, 220)
        eye = (im[..., 0] == a['eye'][0]) & (im[..., 1] == a['eye'][1]) & (im[..., 2] == a['eye'][2]); t.c[eye, :3] = (150, 230, 250)
    elif mk == 'ghost':
        fade = (yy > GROUND - 16) & (t.c[..., 3] > 0)
        t.c[fade, 3] = np.clip(255 - (yy[fade] - (GROUND - 16)) * 9, 60, 255).astype(np.uint8)


def _tack_side(t, tack, sx, by, a, im):
    s = a['s']; hx = a['ox'] + (a['head'][0]) * a['bl'] * s; hy = GROUND + a['head'][1] * a['ll'] * s
    if tack in (None, 'none'): return
    girth = lambda rp: t.line([(sx + 2, by + 2), (sx + 3, by + int(15 * s / 1.6))], rp, 1)
    rein = lambda rp: (t.line([(hx + 6 * s / 1.6, hy + 3), (sx + 6, by - 2)], rp, 1), t.line([(hx + 1, hy - 2), (hx + 5 * s / 1.6, hy + 5)], rp, 1))
    if tack == 'caparison':
        # a trapper to the knees, the rider's colours
        x0, x1 = _span(im); bx0 = sx - 26 * s / 1.6; bx1 = sx + 20 * s / 1.6
        m = (t.c[..., 3] > 0); yy, xx = np.mgrid[0:FH, 0:FW]
        cloth = m & (xx >= bx0) & (xx <= bx1) & (yy >= by - 1) & (yy <= GROUND - 22)
        t.fill(cloth, KC, 2, vol=(2, 2))
        hang = t._mask(lambda d: d.polygon([(int(bx0), by + 8), (int(bx0) - 1, GROUND - 20), (int(bx1) + 1, GROUND - 20), (int(bx1), by + 8)], fill=255))
        t.fill(hang, KC, 2, vol=(0, 2))
        for x in range(int(bx0) + 3, int(bx1), 6): t.px(x, GROUND - 21, KB, 3)
        tack = 'war'
    if tack == 'war':
        t.rect(sx - 8, by + 4, sx + 9, by, KC, 2, vol=(1, 1))
        t.poly([(sx - 7, by + 1), (sx - 8, by - 6), (sx - 5, by - 6), (sx - 3, by - 1), (sx + 5, by - 1), (sx + 6, by - 5), (sx + 8, by - 5), (sx + 8, by + 1)], LEATHER, 2, vol=(1, 1))
        girth(LEATHER); rein(LEATHER); t.line([(sx + 9, by + 3), (sx + 22 * s / 1.6, by + 9)], LEATHER, 1)
    elif tack == 'cloth':
        t.rect(sx - 9, by + 7, sx + 9, by, KC, 2, vol=(1, 2), edge=1)
        t.poly([(sx - 6, by), (sx - 7, by - 4), (sx - 4, by - 3), (sx + 4, by - 2), (sx + 6, by - 4), (sx + 7, by)], LEATHER, 2, vol=(1, 0))
        girth(LEATHER); rein(LEATHER)
    elif tack == 'flat':
        t.rect(sx - 7, by + 3, sx + 7, by, KC, 2, vol=(1, 0))
        t.poly([(sx - 6, by), (sx - 6, by - 2), (sx - 3, by - 2), (sx + 4, by - 1), (sx + 6, by - 3), (sx + 7, by)], BLACKLEATHER, 2, vol=(1, 0))
        t.poly([(sx - 1, by), (sx + 5, by), (sx + 4, by + 8), (sx, by + 8)], BLACKLEATHER, 2)
        girth(BLACKLEATHER); rein(BLACKLEATHER); t.line([(sx + 2, by + 8), (sx + 2, by + 13)], IRON, 2); t.px(sx + 2, by + 14, STEEL, 3); t.px(sx + 3, by + 14, STEEL, 3)
    elif tack == 'modern':
        t.rect(sx - 8, by + 5, sx + 8, by, KC, 3, vol=(1, 1), edge=2)
        t.poly([(sx - 5, by), (sx - 6, by - 3), (sx - 3, by - 2), (sx + 4, by - 1), (sx + 6, by - 2), (sx + 6, by)], BLACKLEATHER, 2, vol=(1, 0))
        t.poly([(sx - 1, by), (sx + 5, by), (sx + 5, by + 9), (sx, by + 9)], BLACKLEATHER, 2)
        girth(BLACKLEATHER); rein(BLACKLEATHER); t.line([(sx + 2, by + 9), (sx + 2, by + 14)], BLACKLEATHER, 2); t.px(sx + 2, by + 15, STEEL, 3); t.px(sx + 3, by + 15, STEEL, 3)
    elif tack == 'pack':
        t.rect(sx - 10, by + 3, sx + 8, by, KC, 2, vol=(1, 0))
        for dx in (-9, 2): t.rect(sx + dx, by + 13, sx + dx + 8, by + 2, CANVAS if dx < 0 else LEATHER, 2, vol=(1, 2), edge=1)
        t.line([(sx - 10, by - 1), (sx + 8, by - 1)], WOOD, 2); girth(ROPE); rein(ROPE)
    elif tack == 'bone':
        t.poly([(sx - 7, by + 1), (sx - 8, by - 5), (sx - 5, by - 4), (sx + 4, by - 1), (sx + 6, by - 4), (sx + 8, by + 1)], BONE, 2, vol=(1, 1))
        t.rect(sx - 8, by + 4, sx + 8, by + 1, FLESH, 1); rein(FLESH)
    elif tack == 'silver':
        t.rect(sx - 8, by + 6, sx + 8, by, KC, 2, vol=(1, 2), edge=3)
        t.poly([(sx - 6, by), (sx - 7, by - 4), (sx - 4, by - 3), (sx + 4, by - 2), (sx + 6, by - 4), (sx + 7, by)], CHROME, 2, vol=(1, 0)); rein(CHROME)
    elif tack == 'chain':
        t.poly([(sx - 6, by), (sx - 7, by - 4), (sx - 4, by - 3), (sx + 4, by - 2), (sx + 6, by - 4), (sx + 7, by)], IRON, 1, vol=(1, 0)); rein(IRON); girth(IRON)


def _tack_end(t, tack, cx, by, a, back, span):
    if tack in (None, 'none'): return
    hw = int(7.5 * a['s'] * a['heavy'] * .62)
    cloth = dict(caparison=KC, war=KC, cloth=KC, flat=KC, modern=KC, pack=KC, bone=FLESH, silver=KC, chain=IRON).get(tack, KC)
    seat = dict(caparison=LEATHER, war=LEATHER, cloth=LEATHER, flat=BLACKLEATHER, modern=BLACKLEATHER, pack=WOOD, bone=BONE, silver=CHROME, chain=IRON)[tack]
    drop = 26 if tack == 'caparison' else 8 if tack in ('cloth', 'war', 'silver') else 5
    if back:
        t.rect(cx - hw - 1, by + drop, cx + hw + 1, by - 2, cloth, 2, vol=(1, 2))
        t.rect(cx - 5, by + 1, cx + 5, by - (5 if tack in ('war', 'caparison', 'bone') else 3), seat, 2, vol=(1, 1))
        if tack == 'pack':
            for sg in (-1, 1): t.rect(cx + sg * (hw + 5), by + 12, cx + sg * (hw - 1), by + 1, CANVAS if sg < 0 else LEATHER, 2, vol=(1, 2), edge=1)
    else:
        for sg in (-1, 1):
            t.rect(cx + sg * (hw + 1), by + drop, cx + sg * (hw - 1), by, cloth, 2, vol=(1, 1))
            if tack == 'pack': t.rect(cx + sg * (hw + 5), by + 12, cx + sg * (hw), by + 1, CANVAS if sg < 0 else LEATHER, 2, vol=(1, 2), edge=1)
        if tack == 'caparison':
            m = (t.c[..., 3] > 0); yy, xx = np.mgrid[0:FH, 0:FW]
            t.fill(m & (yy >= by + 6) & (yy <= GROUND - 22) & (abs(xx - cx) <= hw + 2), KC, 2, vol=(1, 2))


# ---- the looks: [from year, style id, label, beast, tack, marks, scheme set] ----
def horses():
    eras = ((0, 'war'), (1500, 'cloth'), (1800, 'flat'), (1950, 'modern'))
    out = []
    for yr, tack in eras:
        out += [
            (yr, 'riding', 'Riding horse', beast('horse', s=1.7, heavy=1.05), tack, ('blaze',), 'coat'),
            (yr, 'heavy', 'Heavy horse', beast('horse_large', s=1.86, heavy=1.24), 'caparison' if yr == 0 else tack, ('feather', 'blaze'), 'coat'),
            (yr, 'light', 'Light horse', beast('pony', s=1.5, heavy=1.0, ll=1.12), tack, ('socks',), 'coat'),
            (yr, 'pied', 'Pied horse', beast('horse', s=1.7, heavy=1.05), tack, ('patches',), 'coat'),
        ]
    return out


def mules():
    out = []
    for yr, tack in ((0, 'pack'), (1800, 'flat')):
        out += [(yr, 'mule', 'Mule', beast('mule'), tack if yr else 'cloth', (), 'dun'),
                (yr, 'donkey', 'Donkey', beast('mule', s=1.12, heavy=1.05), 'cloth' if yr == 0 else tack, ('stripe',), 'dun'),
                (yr, 'pack', 'Pack mule', beast('mule', s=1.5, heavy=1.08), 'pack', (), 'dun')]
    return out


def camels():
    out = []
    for yr, tack in ((0, 'cloth'), (1900, 'modern')):
        out += [(yr, 'riding', 'Riding camel', beast('camel'), tack, (), 'camel'),
                (yr, 'pack', 'Pack camel', beast('camel', s=1.58, heavy=1.16), 'pack', (), 'camel'),
                (yr, 'racing', 'Racing camel', beast('camel', s=1.42, heavy=.94, ll=1.24), 'flat' if yr else 'cloth', (), 'camel')]
    return out


def ghoulhorses():
    out = []
    for yr, tack in ((0, 'war'), (1500, 'cloth'), (1800, 'flat'), (1950, 'modern')):
        out += [(yr, 'charger', 'Ghouled charger', beast('warhorse', s=1.86, heavy=1.24, neckr=1.3), 'caparison' if yr == 0 else tack, ('veins',), 'ghoul'),
                (yr, 'courser', 'Ghouled courser', beast('horse', s=1.7, heavy=1.02, neckr=1.15), tack, ('veins',), 'ghoul'),
                (yr, 'gaunt', 'Starved ghoul horse', beast('horse', s=1.66, heavy=.84, neckr=.9), tack, ('veins', 'ribs'), 'ghoul')]
    return out


def szlachta():
    sp = (60, 0, 60)
    return [(0, 'spined', 'Spined steed', beast('warhorse', s=1.8, heavy=1.2, mane=None, spines=BONE[2], teeth=True, tail='thin', eye=(230, 230, 200)), 'bone', ('bone',), 'flesh'),
            (0, 'plated', 'Bone-plated steed', beast('horse_large', s=1.84, heavy=1.34, mane=None, horns=BONE[3], teeth=True, tail='stub', eye=(230, 230, 200), neckr=1.4), 'bone', ('bone', 'veins'), 'flesh'),
            (0, 'hound', 'Long-limbed steed', beast('horse', s=1.72, heavy=.92, ll=1.3, mane=None, spines=BONE[2], teeth=True, tail='thin', longface=1, mz=12, eye=(230, 230, 200)), 'bone', ('bone', 'ribs'), 'flesh')]


def chimeras():
    return [(0, 'steed', 'Dream steed', beast('zephyr', s=1.6), 'silver', ('stars',), 'dream'),
            (0, 'horned', 'Horned steed', beast('unicorn', s=1.6, tail='horse', mane=(1, 1, 1)), 'silver', (), 'dream'),
            (0, 'winged', 'Winged steed', beast('pegasus', s=1.56, tail='horse'), 'silver', ('stars',), 'dream'),
            (0, 'nightmare', 'Nightmare steed', beast('nightmare', s=1.66, horns=(40, 30, 40)), 'chain', ('fire',), 'dream')]


def stygians():
    return [(0, 'pale', 'Pale horse', beast('horse', s=1.66, heavy=.8, neckr=.85, eye=(150, 230, 250)), 'chain', ('ribs', 'fire', 'ghost'), 'dead'),
            (0, 'iron', 'Iron-shod steed', beast('warhorse', s=1.74, heavy=1.0, eye=(150, 230, 250)), 'chain', ('fire', 'ghost'), 'dead'),
            (0, 'barghest', 'Hollow steed', beast('horse', s=1.6, heavy=.74, ll=1.22, neckr=.8, mane=None, tail='thin', eye=(150, 230, 250)), 'chain', ('ribs', 'ribs', 'fire', 'ghost'), 'dead')]


def gryphons():
    return [(0, 'gryphon', 'Gryphon', beast('gryphon', s=1.7, heavy=1.2), 'cloth', (), 'gryphon'),
            (0, 'hippogryph', 'Hippogryph', beast('pegasus', s=1.56, beak=(214, 170, 60), longface=0, mz=5.5, mzr=2.8, headfur=(1, 1, 1), tail='horse', wings=((1, 1, 1), 'feather', 1.25)), 'cloth', (), 'gryphon'),
            (0, 'opinicus', 'Great gryphon', beast('gryphon', s=1.9, heavy=1.3, wings=((1, 1, 1), 'feather', 1.4), tail='brush'), 'war', (), 'gryphon')]
