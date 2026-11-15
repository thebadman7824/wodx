# Sleds, sleighs and snow machines for the mount sprites (B4970, B6070-B6072). Own art in the mount painter's manner:
# runners where carts have wheels, the beasts that pull them from the rig (dogs, reindeer, horses), and the motor
# sledges, propeller sledges, snow coaches and snowmobiles of the twentieth century and after. Sizes at 37 pixels to
# the metre, as the people are drawn; x runs from the tail to the nose, y up from the ground.
import math, numpy as np
from mountkit import *
import mount_beasts as MB

SNOW = ramp((222, 228, 236))


def seat_stand(x, y):
    """standing on the runners or a footboard, the feet at (x, y): the whole figure shows"""
    return dict(x=round(x), y=round(y), cut=112, pose='sit')


def _dark(im, k=.72):
    o = im.copy(); o[..., :3] = (o[..., :3] * k).astype(np.uint8); return o


def _spray(t, x0, x1, G, ph=0):
    """loose snow kicked up behind runners or a track: a few broken clumps, never single pixels"""
    for i, x in enumerate(range(int(x0), int(x1), 7)):
        k = (i + int(ph * 2)) % 3
        t.rect(x, G - 2 - k, x + 2, G - 1 - k, SNOW, 3 - (k == 2))
        if k == 0: t.px(x + 3, G - 4, SNOW, 4)


# ---- the beasts in harness ----
TEAMS = {
    # build, size, coats (a: coat, b: mane or dark parts) for each beast of the team in turn
    'dog': ('wolf', dict(s=.62, furry=1.1), [dict(a=ramp((96, 92, 92)), b=ramp((40, 38, 40))), dict(a=ramp((150, 120, 84)), b=ramp((70, 54, 40))),
                                             dict(a=ramp((206, 204, 200)), b=ramp((120, 118, 116))), dict(a=ramp((60, 56, 56)), b=ramp((30, 28, 28)))]),
    'reindeer': ('stag', dict(s=1.0, heavy=1.0, furry=.7), [dict(a=ramp((128, 112, 96)), b=ramp((214, 206, 190))), dict(a=ramp((150, 140, 128)), b=ramp((226, 222, 214)))]),
    'horse': ('horse', dict(s=1.6), [dict(a=ramp((112, 70, 40)), b=ramp((36, 28, 24))), dict(a=ramp((58, 52, 50)), b=ramp((30, 26, 26))),
                                     dict(a=ramp((172, 172, 166)), b=ramp((96, 96, 100))), dict(a=ramp((140, 84, 44)), b=ramp((196, 170, 120)))]),
    'pony': ('pony', dict(s=1.3, furry=.5), [dict(a=ramp((150, 128, 96)), b=ramp((60, 46, 34))), dict(a=ramp((96, 70, 52)), b=ramp((40, 32, 28)))]),
}
_BEAST = {}


def _beast(kind, i, f):
    """one beast of a team, its four facings, in its own fixed coat (the colour scheme is for the paint)"""
    key = (kind, i % len(TEAMS[kind][2]), f)
    if key not in _BEAST:
        build, k, coats = TEAMS[kind]
        a = MB.beast(build, **k)
        if kind == 'reindeer': a['antlers'] = (214, 200, 168)
        fr, _ = MB.draw(a, 'none', (), f)
        _BEAST[key] = {q: recolour(v, coats[i % len(coats)]) for q, v in fr.items()}
    return _BEAST[key]


def _parts(im, bx0, blen):
    """where the harness goes on a beast facing right: the mouth, the base of the neck (collar), the back behind the withers,
    as (x from the left of its span, y in its picture)"""
    a = im[..., 3] > 0; xs = np.nonzero(a.any(0))[0]; x1 = int(xs.max())
    col = lambda x: np.nonzero(a[:, int(x)])[0]
    m = col(x1 - 2); mouth = (x1 - 2 - bx0, int(m.max()) - 1 if len(m) else 0)
    cxp = bx0 + int(blen * .6); c = col(cxp); collar = (cxp - bx0, int(c.min()) + 12 if len(c) else 0)
    bxp = bx0 + int(blen * .48); b = col(bxp); back = (bxp - bx0, int(b.min()) + 1 if len(b) else 0)
    return dict(mouth=mouth, collar=collar, back=back)


def _span(im):
    xs = np.nonzero(im[..., 3].any(0))[0]; ys = np.nonzero(im[..., 3].any(1))[0]
    return int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())


# ---- a sled or a sleigh, side on ----
def _runner(t, X, Y, x0, x1, curl, ry=0, rp=None, shoe=True):
    """one runner: a long thin board on the snow, curled up at the front; an iron shoe under it"""
    rp = rp or WOOD
    t.line([(X(x0), Y(ry + 1)), (X(x1 - curl * .6), Y(ry + 1))], rp, 2, w=2)
    # the curl: a quarter circle stepping 1,1,2,3 up to the tip
    pts = [(x1 - curl * .6 + curl * .6 * math.sin(a), ry + 1 + curl * (1 - math.cos(a))) for a in np.linspace(0, math.pi / 2, 7)]
    for a, b in zip(pts, pts[1:]): t.line([(X(a[0]), Y(a[1])), (X(b[0]), Y(b[1]))], rp, 2, w=2)
    t.line([(X(x1 - curl * .1), Y(ry + 1 + curl)), (X(x1 - curl * .5), Y(ry + 1 + curl + 1))], rp, 3)
    if shoe: t.line([(X(x0), Y(ry)), (X(x1 - curl * .5), Y(ry))], IRON, 3)


def sled_side(p, f, ph, t, X, Y, G):
    """the body. p: L (length), style, and knobs. -> seats"""
    L = p['L']; st = p['style']; seats = []; curl = p.get('curl', 10); body = p.get('wood', WOOD)
    if st == 'basket':                                     # a dog sled: runners, stanchions, a slatted bed, a basket rail and a handlebar
        t.line([(X(4), Y(2)), (X(L - 6), Y(2))], body, 1)
        _runner(t, X, Y, -6, L, curl, rp=PALEWOOD)
        bed = 9
        for x in range(4, int(L) - 12, 12): t.line([(X(x), Y(2)), (X(x), Y(bed + 9))], PALEWOOD, 2)
        t.rect(X(2), Y(bed + 1), X(L - 14), Y(bed - 1), PALEWOOD, 3, vol=(1, 0))
        t.line([(X(2), Y(bed + 9)), (X(L - 12), Y(bed + 9)), (X(L - 2), Y(curl + 2))], PALEWOOD, 3)
        if p.get('bag'): t.rect(X(6), Y(bed + 12), X(L - 18), Y(bed + 2), KC, 2, vol=(2, 2), edge=1); t.line([(X(8), Y(bed + 7)), (X(L - 20), Y(bed + 7))], KC, 1)
        for x in range(8, int(L) - 16, 9): t.line([(X(x), Y(bed + 8)), (X(x + 4), Y(bed + 2))], ROPE, 1)
        # the handlebar at the tail, the musher's footboards on the runner ends
        t.line([(X(2), Y(bed)), (X(-2), Y(bed + 30)), (X(4), Y(bed + 31))], p.get('bar', PALEWOOD), 2, w=2)
        t.rect(X(-6), Y(3), X(1), Y(2), BLACK, 2)
        seats.append(seat_stand(X(-4), Y(4)))
        seats.append(seat_sit(X(L * .45), Y(bed + 2), below=2) if not p.get('bag') else seat_hidden(X(L * .45), Y(bed)))
    elif st == 'pulk':                                     # a reindeer sledge: a boat-shaped wooden hull on one keel
        h = 14
        t.poly([(X(0), Y(h)), (X(2), Y(3)), (X(8), Y(0)), (X(L - 18), Y(0)), (X(L - 4), Y(6)), (X(L + 2), Y(h + 6)), (X(L - 4), Y(h + 4)), (X(L - 16), Y(h))], body, 2, vol=(2, 3), edge=1)
        for y in (4, 8): t.line([(X(3), Y(y)), (X(L - 14), Y(y))], body, 1)
        t.rect(X(-1), Y(h + 10), X(3), Y(3), body, 3, vol=(1, 1), edge=1)       # the high stern board to lean on
        t.line([(X(2), Y(h + 1)), (X(L - 16), Y(h + 1))], KB, 3)                 # a painted gunwale
        t.ell(X(L * .35), Y(h + 4), 7, 5, KC, 2, vol=(2, 1), edge=1)             # a fur rug
        seats.append(seat_sit(X(L * .32), Y(h - 2), below=1))
    elif st == 'sledge':                                   # a working sledge: a low flat bed on heavy runners, a load
        bed = 12
        _runner(t, X, Y, 0, L, curl, rp=body)
        for x in (6, L * .5, L - 16): t.rect(X(x - 2), Y(bed), X(x + 2), Y(2), body, 1, edge=0)
        t.rect(X(0), Y(bed + 3), X(L - 8), Y(bed), body, 2, vol=(1, 1), edge=1)
        if p.get('load') == 'logs':
            for k in range(3): t.rect(X(-6 + k * 3), Y(bed + 7 + k * 5), X(L - 18 - k * 4), Y(bed + 4 + k * 5), DARKWOOD, 2, vol=(1, 1), edge=1)
            for x in (8, L - 30): t.line([(X(x), Y(bed + 18)), (X(x), Y(bed + 3))], ROPE, 3)
            seats.append(seat_sit(X(L - 22), Y(bed + 18), below=3))
        elif p.get('load') == 'hay':
            t.poly([(X(-2), Y(bed + 3)), (X(-4), Y(bed + 18)), (X(6), Y(bed + 26)), (X(L - 30), Y(bed + 26)), (X(L - 20), Y(bed + 16)), (X(L - 20), Y(bed + 3))], ramp((196, 176, 104)), 2, vol=(3, 2))
            for x in range(4, int(L) - 26, 6): t.line([(X(x), Y(bed + 24)), (X(x + 3), Y(bed + 18))], ramp((196, 176, 104)), 3)
            seats.append(seat_sit(X(L * .4), Y(bed + 26), below=3))
        else:
            for x in range(6, int(L) - 20, 13): t.rect(X(x), Y(bed + 12), X(x + 10), Y(bed + 3), KB, 2, vol=(1, 2), edge=1)
            seats.append(seat_sit(X(L - 14), Y(bed + 3), below=3))
    else:                                                  # a sleigh: a curved dash, a bench or two, a body on runners
        bed = p.get('bed', 14); bh = p.get('bh', 18); dash = p.get('dash', 30); swan = p.get('swan', False)
        _runner(t, X, Y, 2, L, curl, rp=IRON if p.get('iron') else body)
        for x in (10, L * .5, L - 20): t.line([(X(x), Y(2)), (X(x + 3), Y(bed))], IRON, 2, w=2)
        # the body: low at the back, the dash sweeping up at the front
        b0 = p.get('b0', 4); b1 = L - p.get('nose', 10)
        pts = [(b0, bed), (b0 - 2, bed + bh), (b0 + 6, bed + bh + 3), (b1 - 22, bed + bh - 2), (b1 - 12, bed + bh), (b1 - 4, bed + dash - 6), (b1, bed + dash), (b1 + 5, bed + dash + 1), (b1 + 2, bed + dash - 8), (b1 - 2, bed + 4), (b1 - 8, bed)]
        if swan: pts = pts[:8] + [(b1 + 4, bed + dash + 8), (b1 + 9, bed + dash + 6), (b1 + 6, bed + dash - 2), (b1 + 2, bed + dash - 10), (b1 - 2, bed + 4), (b1 - 8, bed)]
        t.poly([(X(x), Y(y)) for x, y in pts], KA, 2, vol=(2, 3), gloss=True, edge=1)
        t.line([(X(b0 + 2), Y(bed + bh * .45)), (X(b1 - 8), Y(bed + bh * .45))], KB, 3)
        if p.get('scroll'):
            for x in (b0 + 14, b1 - 26): t.arc(X(x), Y(bed + bh * .7), 4, 3, 180, 360, KB, 4); t.px(X(x), Y(bed + bh * .7), KB, 4)
        # the seat backs, upholstered
        rows = p.get('rows', 1); seats_x = []
        for i in range(rows):
            sx = b0 + 10 + i * 32
            t.poly([(X(sx - 6), Y(bed + bh)), (X(sx - 8), Y(bed + bh + 12)), (X(sx - 3), Y(bed + bh + 13)), (X(sx), Y(bed + bh))], KC, 2, vol=(1, 1), edge=1)
            seats_x.append(sx + 6)
        if p.get('rug'): t.poly([(X(b1 - 30), Y(bed + bh + 2)), (X(b1 - 18), Y(bed + bh + 6)), (X(b1 - 10), Y(bed + bh - 6)), (X(b1 - 22), Y(bed + bh - 10))], KC, 3, vol=(1, 1), edge=1)
        if p.get('bells'):
            for x in range(int(b0) + 6, int(b1) - 6, 8): t.px(X(x), Y(bed + 2), BRASS, 3); t.px(X(x + 1), Y(bed + 2), BRASS, 4)
        if p.get('lamp'): t.rect(X(b1 - 3), Y(bed + dash - 2), X(b1), Y(bed + dash - 8), BRASS, 2); t.px(X(b1 - 1), Y(bed + dash - 5), LAMP, 4)
        # the driver on the front bench, passengers behind
        seats.append(seat_sit(X(seats_x[-1]), Y(bed + bh - 1), below=4))
        seats.append(seat_sit(X(seats_x[-1] - 6), Y(bed + bh), below=4))
        for x in seats_x[-2::-1]: seats.append(seat_sit(X(x), Y(bed + bh - 1), below=4)); seats.append(seat_sit(X(x - 6), Y(bed + bh), below=4))
        if p.get('footman'): t.rect(X(b0 - 8), Y(bed - 2), X(b0), Y(bed - 4), body, 2); seats.append(seat_stand(X(b0 - 4), Y(bed - 2)))
    return seats


def sled_end(e, p, cx, Y, back):
    """the body seen from ahead (back False) or behind. -> seats"""
    st = p['style']; w = p.get('w', 30); hw = w / 2; seats = []; body = p.get('wood', WOOD)
    for sg in (-1, 1):                                     # the runners, end on: two thin dark posts with an iron shoe
        x = cx + sg * (hw - 1)
        e.rect(x - 1, Y(p.get('curl', 10) + 1 if not back else 3), x + 1, Y(0), PALEWOOD if st == 'basket' else body, 2 if not back else 1)
        e.rect(x - 1, Y(1), x + 1, Y(0), IRON, 3)
    if st == 'basket':
        bed = 9
        e.rect(cx - hw + 1, Y(bed + 1), cx + hw - 1, Y(bed - 1), PALEWOOD, 3)
        e.line([(cx - hw, Y(bed + 9)), (cx + hw, Y(bed + 9))], PALEWOOD, 3)
        for sg in (-1, 1): e.line([(cx + sg * hw, Y(bed + 9)), (cx + sg * hw, Y(2))], PALEWOOD, 2)
        if p.get('bag'): e.rect(cx - hw + 2, Y(bed + 12), cx + hw - 2, Y(bed + 2), KC, 2, vol=(2, 2), edge=1)
        if back:
            e.line([(cx - hw + 2, Y(bed + 31)), (cx + hw - 2, Y(bed + 31))], PALEWOOD, 2, w=2)
            for sg in (-1, 1): e.line([(cx + sg * (hw - 2), Y(bed + 31)), (cx + sg * (hw - 2), Y(bed))], PALEWOOD, 2)
            seats = [seat_stand(cx, Y(1)), seat_hidden(cx, Y(bed)) if p.get('bag') else seat_sit(cx, Y(bed + 8), below=0)]
        else:
            seats = [seat_stand(cx, Y(-2)), seat_hidden(cx, Y(bed)) if p.get('bag') else seat_sit(cx, Y(bed + 2), below=2)]
            seats[0]['cut'] = 70
    elif st == 'pulk':
        h = 14
        e.poly([(cx - hw + 4, Y(0)), (cx - hw, Y(h)), (cx + hw, Y(h)), (cx + hw - 4, Y(0))], body, 2, vol=(2, 3), edge=1)
        e.line([(cx - hw, Y(h + 1)), (cx + hw, Y(h + 1))], KB, 3)
        if back: e.rect(cx - 5, Y(h + 10), cx + 5, Y(h), body, 3, vol=(1, 1), edge=1)
        seats = [seat_sit(cx, Y(h - 2 + (6 if back else 0)), below=0 if back else 1)]
    elif st == 'sledge':
        bed = 12
        e.rect(cx - hw, Y(bed + 3), cx + hw, Y(bed), body, 2, vol=(1, 1), edge=1)
        if p.get('load') == 'logs':
            for k in range(3):
                for j in range(3 - k): e.ell(cx - (2 - k) * 5 + j * 10, Y(bed + 7 + k * 8), 5, 5, PALEWOOD if back else DARKWOOD, 2, vol=(1, 1), edge=1)
            seats = [seat_sit(cx, Y(bed + 27), below=3)]
        elif p.get('load') == 'hay':
            e.poly([(cx - hw - 2, Y(bed + 3)), (cx - hw - 4, Y(bed + 20)), (cx - hw + 6, Y(bed + 28)), (cx + hw - 6, Y(bed + 28)), (cx + hw + 4, Y(bed + 20)), (cx + hw + 2, Y(bed + 3))], ramp((196, 176, 104)), 2, vol=(3, 2))
            seats = [seat_sit(cx, Y(bed + 28), below=3)]
        else:
            e.rect(cx - hw + 3, Y(bed + 12), cx + hw - 3, Y(bed + 3), KB, 2, vol=(1, 2), edge=1)
            seats = [seat_sit(cx, Y(bed + 3 + (8 if back else 0)), below=3 if not back else 0)]
    else:
        bed = p.get('bed', 14); bh = p.get('bh', 18); dash = p.get('dash', 30)
        e.poly([(cx - hw + 3, Y(bed)), (cx - hw, Y(bed + bh)), (cx + hw, Y(bed + bh)), (cx + hw - 3, Y(bed))], KA, 2, vol=(2, 3), edge=1, gloss=True)
        e.line([(cx - hw + 1, Y(bed + bh * .45)), (cx + hw - 1, Y(bed + bh * .45))], KB, 3)
        if not back:
            e.poly([(cx - hw + 6, Y(bed + bh)), (cx - hw + 4, Y(bed + dash)), (cx + hw - 4, Y(bed + dash)), (cx + hw - 6, Y(bed + bh))], KA, 3, vol=(1, 2), edge=1, gloss=True)
            if p.get('lamp'):
                for sg in (-1, 1): e.rect(cx + sg * (hw - 3) - 1, Y(bed + dash - 2), cx + sg * (hw - 3) + 1, Y(bed + dash - 7), BRASS, 2); e.px(cx + sg * (hw - 3), Y(bed + dash - 4), LAMP, 4)
        else:
            e.rect(cx - hw + 2, Y(bed + bh + 12), cx + hw - 2, Y(bed + bh), KC, 2, vol=(1, 1), edge=1)
        rows = p.get('rows', 1)
        if back: seats = [seat_sit(cx + 6, Y(bed + bh + 8), below=0), seat_sit(cx - 6, Y(bed + bh + 8), below=0)] + [seat_sit(cx + (-1) ** i * 6, Y(bed + bh + 3), below=0) for i in range(2 * (rows - 1))]
        else: seats = [seat_sit(cx + 6, Y(bed + bh - 2), below=2), seat_sit(cx - 6, Y(bed + bh - 2), below=2)] + [seat_sit(cx + (-1) ** i * 6, Y(bed + bh + 6), below=0) for i in range(2 * (rows - 1))]
        if p.get('footman'): seats.append(seat_stand(cx, Y(bed - 2 + (0 if back else 30))) if back else seat_hidden(cx, Y(bed)))
    return seats


def sled(p, f=0):
    """a sled or a sleigh with its team, drawn as the carts are: the team ahead of the body. p['team']: (beast, how many, abreast)"""
    beast, n, abreast = p['team']; L = p['L']
    one = _beast(beast, 0, 0); bx0, bx1, by0, _ = _span(one['right'])          # the frame's size from the first walk frame
    blen = bx1 - bx0 + 1                                    # one beast's length in the picture
    lines = (n + abreast - 1) // abreast                    # beasts one behind the other
    gap = {'dog': 6, 'reindeer': 10, 'horse': 6, 'pony': 6}[beast]
    tow = {'dog': 16, 'reindeer': 22, 'horse': 10, 'pony': 10}[beast]
    team_len = lines * blen + (lines - 1) * gap
    FW = int(math.ceil((L + tow + team_len + 40) / 16) * 16); FH = p.get('FH', 160); G = FH - 10
    Y = lambda y: G - y
    x0 = (FW - (L + tow + team_len)) // 2
    X = lambda x: x0 + x
    # --- side ---
    t = Pt(FW, FH)
    seats = sled_side(p, f, 0, t, X, Y, G)
    hitch = X(L) + 2; hy = G - {'dog': 10, 'reindeer': 16, 'horse': 30, 'pony': 26}[beast]
    pos = []                                                # where each line of the team stands: (left edge of the beast's span)
    for k in range(lines): pos.append(hitch + tow + k * (blen + gap))
    # the far beasts of each pair first, darker and a little higher, then the line, then the near ones
    for k, x in enumerate(pos):
        if abreast > 1: t.paste(_dark(_beast(beast, 2 * k + 1, f)['right']), x - bx0 + 5, G - MB.GROUND - 3, under=True)
        if abreast > 2: t.paste(_dark(_beast(beast, 2 * k + 2, f)['right'], .6), x - bx0 + 9, G - MB.GROUND - 5, under=True)
    hz = {}
    if beast in ('horse', 'pony'):
        # shafts from the body to the collar; a troika's arch (the duga) over the shaft horse's withers
        sh = _parts(_beast(beast, 0, f)['right'], bx0, blen)
        cx_, cy_ = pos[0] + sh['collar'][0], G - MB.GROUND + sh['collar'][1]
        t.line([(X(L - 8), Y(p.get('bed', 14) + 6)), (cx_ - 2, cy_ + 10)], DARKWOOD, 2, w=2)
        if p.get('duga'): t.arc(cx_ - 1, cy_ - 4, 9, 16, 180, 360, KB, 3, w=3)
    else:
        # the towline and the tug lines to each beast's harness
        t.line([(hitch - 4, Y(p.get('bed', 9) + 2)), (pos[-1] + blen * .7, hy)], ROPE, 1)
    for k, x in enumerate(pos):
        im = _beast(beast, 2 * k, f)['right']
        t.paste(im, x - bx0, G - MB.GROUND)
        q = _parts(im, bx0, blen); ox, oy = x, G - MB.GROUND
        if beast in ('horse', 'pony'):
            # a collar round the base of the neck, a trace back along the flank, a strap over the back
            c = q['collar']; t.ell(ox + c[0], oy + c[1], 3, 7, BLACKLEATHER, 2, vol=(1, 1)); t.px(ox + c[0] + 1, oy + c[1] - 5, BRASS, 4)
            t.line([(ox + c[0] - 2, oy + c[1] + 4), (ox + q['back'][0] - 10, oy + q['back'][1] + 14)], BLACKLEATHER, 1)
            t.line([(ox + q['back'][0], oy + q['back'][1]), (ox + q['back'][0], oy + q['back'][1] + 16)], BLACKLEATHER, 2, w=2)
            if p.get('bells'): t.px(ox + q['back'][0] - 1, oy + q['back'][1] + 9, BRASS, 4); t.px(ox + q['back'][0] + 1, oy + q['back'][1] + 9, BRASS, 3)
        else:
            # a breast band and a back strap, red webbing for dogs and a dark leather pad for reindeer
            hcol = REDL if beast == 'dog' else BLACKLEATHER; c = q['collar']; b = q['back']
            t.line([(ox + c[0], oy + c[1]), (ox + c[0] + 1, oy + c[1] + (5 if beast == 'dog' else 10))], hcol, 2)
            t.line([(ox + c[0], oy + c[1] + 2), (ox + b[0], oy + b[1] + 1)], hcol, 1 if beast == 'dog' else 2)
            if beast == 'reindeer': t.px(ox + b[0], oy + b[1], BRASS, 4)
    if p.get('reins', True) and beast in ('horse', 'pony', 'reindeer') and seats:
        # thin reins from the driver's hands to the bit, with a little sag
        s0 = seats[0]; hx_, hy_ = s0['x'] + 6, s0['y'] - 36
        q = _parts(_beast(beast, 0, f)['right'], bx0, blen); mx, my = pos[0] + q['mouth'][0], G - MB.GROUND + q['mouth'][1]
        mid = ((hx_ + mx) / 2, max(hy_, my) + 6)
        t.line([(hx_, hy_), mid, (mx, my)], LEATHER, 1)
    t.shadow(X(L / 2), G + 1, L / 2 + 2, 2)
    for x in pos: t.shadow(x + blen / 2, G + 1, blen / 2, 2)
    _spray(t, X(-10), X(-2), G, f)
    side = t.outline()
    # --- ends: the team ahead of the body (coming toward us) or ahead of it and partly hidden (going away) ---
    ends = {}; es = {}; cx = FW // 2
    for back in (False, True):
        e = Pt(FW, FH)
        ss = sled_end(e, p, cx, Y, back)
        offs = [0] if abreast == 1 else ([-14, 14] if abreast == 2 else [-24, 0, 24])
        img_key = 'up' if back else 'down'
        if not back:
            for k in range(min(lines, 2) - 1, -1, -1):
                for j, o in enumerate(offs):
                    im = _beast(beast, k * abreast + j, f)[img_key]
                    e.paste(im if k == 0 else _dark(im, .85), cx - MB.FW // 2 + o, G - MB.GROUND + 10 + (0 if k == 0 else -8))
        else:
            for k in range(min(lines, 2)):
                for j, o in enumerate(offs):
                    im = _beast(beast, k * abreast + j, f)[img_key]
                    e.paste(im if k == 0 else _dark(im, .85), cx - MB.FW // 2 + o, G - MB.GROUND - 14 - k * 6, under=True)
        if p.get('duga') and not back: e.arc(cx, G - 66, 12, 12, 180, 360, KB, 3, w=3)
        e.shadow(cx, G + 1, p.get('w', 30) / 2 + 6, 3)
        ends[img_key] = e.outline(); es[img_key] = ss
    return (dict(right=side, left=mirror(side), **ends), dict(right=seats, left=[dict(s, x=FW - 1 - s['x']) for s in seats], **es))


def sleds():
    D, R, H, Po = ('dog', 6, 2), ('reindeer', 1, 1), ('horse', 1, 1), ('pony', 1, 1)
    return [
        (0, 'dogsled', 'Dog sled', dict(style='basket', L=90, w=24, team=D, bag=True), 'sledwood'),
        (0, 'pulk', 'Reindeer sledge', dict(style='pulk', L=72, w=26, team=R, curl=6), 'sledwood'),
        (0, 'sledge', 'Horse sledge', dict(style='sledge', L=104, w=40, team=H, load='logs', curl=12, wood=DARKWOOD), 'sledwood'),
        (1600, 'sleigh', 'Sleigh', dict(style='sleigh', L=110, w=40, team=H, swan=True, dash=34, scroll=True, rug=True, bells=True), 'sleigh'),
        (1600, 'troika', 'Troika', dict(style='sleigh', L=112, w=44, team=('horse', 3, 3), dash=30, duga=True, rows=2, bells=True), 'sleigh'),
        (1600, 'sledge', 'Hay sledge', dict(style='sledge', L=110, w=42, team=H, load='hay', curl=12), 'sledwood'),
        (1800, 'cutter', 'Cutter', dict(style='sleigh', L=96, w=36, team=H, dash=28, bh=16, iron=True, scroll=True, bells=True, lamp=True), 'sleigh'),
        (1800, 'troika', 'Troika', dict(style='sleigh', L=116, w=44, team=('horse', 3, 3), dash=30, duga=True, rows=2, bells=True, lamp=True, iron=True), 'sleigh'),
        (1800, 'dogsled', 'Dog sled', dict(style='basket', L=96, w=24, team=('dog', 8, 2), bag=True), 'sledwood'),
        (1900, 'bobsleigh', 'Bob sleigh', dict(style='sleigh', L=124, w=42, team=('horse', 2, 2), dash=24, bh=16, rows=2, iron=True, footman=True), 'sleigh'),
        (1900, 'sledge', 'Freight sledge', dict(style='sledge', L=116, w=44, team=H, curl=12, load='crates'), 'sledwood'),
        (1900, 'dogsled', 'Dog sled', dict(style='basket', L=92, w=24, team=D), 'sledwood'),
        (1990, 'racing', 'Racing dog sled', dict(style='basket', L=84, w=22, team=('dog', 8, 2), bar=BLACK, curl=8), 'sledrace'),
        (1990, 'pulk', 'Reindeer sledge', dict(style='pulk', L=74, w=26, team=R, curl=6), 'sledwood'),
        (1990, 'sleigh', 'Pleasure sleigh', dict(style='sleigh', L=104, w=40, team=('pony', 1, 1), dash=28, swan=True, rug=True, bells=True, iron=True), 'sleigh'),
    ]


# ---- snow machines ----
def _track(t, X, Y, x0, x1, h, ph=0, rp=None, wheels=4):
    """a rubber or steel track seen from the side: a long rounded loop, lugs on its edge, road wheels inside"""
    rp = rp or TYRE; r = h / 2
    t.rect(X(x0 + r), Y(h), X(x1 - r), Y(0), rp, 2, vol=(1, 1))
    t.ell(X(x0 + r), Y(r), r, r, rp, 2, vol=(1, 1)); t.ell(X(x1 - r), Y(r), r, r, rp, 2, vol=(1, 1))
    t.rect(X(x0 + r), Y(h - 2), X(x1 - r), Y(2), rp, 1)
    t.ell(X(x0 + r), Y(r), r - 2, r - 2, rp, 1); t.ell(X(x1 - r), Y(r), r - 2, r - 2, rp, 1)
    off = int(ph * 3) % 4
    for x in range(int(x0 + r) + off, int(x1 - r), 4):
        t.px(X(x), Y(0), rp, 3); t.px(X(x + 1), Y(h), rp, 3)
    for i in range(wheels):
        wx = x0 + r + (x1 - x0 - 2 * r) * i / max(1, wheels - 1)
        t.ell(X(wx), Y(r), r - 3, r - 3, STEEL, 1, vol=(1, 0)); t.px(X(wx), Y(r), STEEL, 3)


def _ski(t, X, Y, x0, x1, rp=None):
    rp = rp or IRON
    t.line([(X(x0), Y(0)), (X(x1 - 5), Y(0))], rp, 2, w=2)
    t.line([(X(x1 - 5), Y(0)), (X(x1 - 2), Y(1)), (X(x1), Y(4))], rp, 2, w=2)
    t.px(X(x0 + 2), Y(1), rp, 4)


def snow_side(p, FW, FH, ph=0):
    """the snow machines, side on. p: style and knobs. -> (picture, seats)"""
    G = FH - 9; L = p['L']; x0 = (FW - L) // 2; st = p['style']
    X = lambda x: x0 + x
    Y = lambda y: G - y
    t = Pt(FW, FH); seats = []
    if st == 'motorsledge':                                 # an open frame on a long track, an engine box, the driver sat behind it
        _track(t, X, Y, 0, L, 16, ph, rp=IRON, wheels=5)
        t.rect(X(2), Y(24), X(L - 2), Y(16), KA, 2, vol=(1, 2), edge=1)
        t.rect(X(L - 40), Y(40), X(L - 6), Y(24), IRON, 2, vol=(2, 2), edge=1)
        for x in range(int(L) - 36, int(L) - 8, 5): t.line([(X(x), Y(38)), (X(x), Y(26))], STEEL, 3)
        t.rect(X(6), Y(34), X(L - 46), Y(24), KC, 2, vol=(2, 1), edge=1)
        for x in range(10, int(L) - 50, 12): t.line([(X(x), Y(34)), (X(x + 2), Y(24))], ROPE, 3)
        t.line([(X(L - 4), Y(20)), (X(L + 14), Y(20))], ROPE, 2)
        seats.append(seat_sit(X(L - 50), Y(34), below=3))
    elif st == 'aerosan':                                   # a propeller sledge: a boat-shaped body on three skis, a pusher airscrew
        _ski(t, X, Y, 6, 44); _ski(t, X, Y, L - 40, L - 4)
        for x in (24, L - 22): t.line([(X(x), Y(1)), (X(x + 2), Y(12))], IRON, 2, w=2)
        body = [(0, 26), (2, 14), (10, 10), (L - 30, 10), (L - 6, 16), (L, 24), (L - 4, 34), (L - 30, 46), (24, 46), (8, 40)]
        t.poly([(X(x), Y(y)) for x, y in body], KA, 2, vol=(3, 3), gloss=True, edge=1)
        t.poly([(X(L - 32), Y(44)), (X(L - 14), Y(34)), (X(L - 28), Y(34))], GLASS, 1, vol=(1, 0))
        for i in range(2): t.rect(X(40 + i * 26), Y(41), X(58 + i * 26), Y(33), GLASS, 1, vol=(1, 0))
        t.line([(X(4), Y(28)), (X(L - 4), Y(28))], KB, 3, w=2)
        if p.get('star'): t.ell(X(L * .45), Y(20), 3, 3, REDL, 3)
        # the engine on its pylon and the airscrew, a blur when it turns
        t.rect(X(-2), Y(58), X(22), Y(46), IRON, 2, vol=(2, 2), edge=1)
        for x in range(2, 20, 4): t.line([(X(x), Y(57)), (X(x), Y(48))], STEEL, 3)
        t.ell(X(-4), Y(52), 2, 3, CHROME, 3)
        a = ph * 3.1
        blade = abs(math.cos(a)) * 26 + 3
        t.line([(X(-6), Y(52 + blade)), (X(-6), Y(52 - blade))], PALEWOOD, 2 if abs(math.cos(a)) > .4 else 1, w=3)
        t.line([(X(-7), Y(52 + 27)), (X(-7), Y(52 - 27))], PALEWOOD, 4) if abs(math.cos(a)) < .2 else None
        seats.append(seat_head(X(L - 34), Y(38), below=6)); seats.append(seat_head(X(66), Y(38), below=6)); seats.append(seat_head(X(46), Y(38), below=6))
    elif st == 'snowcoach':                                 # a snow coach: a teardrop body with round windows, skis ahead, a track behind
        _ski(t, X, Y, L - 52, L - 6)
        t.line([(X(L - 30), Y(1)), (X(L - 30), Y(10))], IRON, 2, w=2)
        _track(t, X, Y, 2, L * .55, 20, ph, wheels=4)
        body = [(0, 22), (2, 44), (16, 58), (L * .45, 64), (L - 30, 58), (L - 6, 40), (L, 22), (L - 4, 12), (8, 12)]
        t.poly([(X(x), Y(y)) for x, y in body], KA, 2, vol=(4, 3), gloss=True, edge=1)
        t.line([(X(4), Y(26)), (X(L - 4), Y(26))], KB, 3, w=2)
        for i in range(p.get('ports', 4)):
            px = 22 + i * (L - 66) / max(1, p.get('ports', 4) - 1)
            t.ell(X(px), Y(42), 6, 6, CHROME, 2); t.ell(X(px), Y(42), 4.5, 4.5, GLASS, 1, vol=(1, 0))
            if i: seats.append(seat_head(X(px), Y(42), below=5))
        t.poly([(X(L - 28), Y(55)), (X(L - 10), Y(42)), (X(L - 24), Y(42))], GLASS, 1, vol=(1, 0))
        t.ell(X(L - 3), Y(30), 3, 3, LAMP, 3)
        seats.insert(0, seat_head(X(L - 22), Y(46), below=5))
    elif st == 'snowcat':                                   # a snowcat: a box cab on four track pods
        for x in (4, L - 50):
            _track(t, X, Y, x, x + 46, 22, ph, wheels=3)
        t.rect(X(10), Y(30), X(L - 10), Y(22), IRON, 1, vol=(0, 1))
        t.rect(X(6), Y(66), X(L - 34), Y(30), KA, 2, vol=(2, 2), edge=1)
        t.poly([(X(L - 34), Y(30)), (X(L - 34), Y(50)), (X(L - 4), Y(46)), (X(L - 2), Y(30))], KA, 2, vol=(2, 2), edge=1)
        for x in range(L - 30, L - 6, 4): t.line([(X(x), Y(44)), (X(x), Y(34))], KB, 1)
        t.rect(X(L - 50), Y(62), X(L - 36), Y(46), GLASS, 1, vol=(1, 0)); t.rect(X(12), Y(62), X(L - 56), Y(46), GLASS, 1, vol=(1, 0))
        t.line([(X(L * .45), Y(62)), (X(L * .45), Y(46))], KA, 2)
        t.line([(X(4), Y(67)), (X(L - 32), Y(67))], KB, 3, w=2)
        t.rect(X(L - 4), Y(40), X(L - 1), Y(36), LAMP, 3)
        seats.append(seat_head(X(L - 43), Y(54), below=6)); seats.append(seat_head(X(30), Y(54), below=6)); seats.append(seat_head(X(L * .45 - 6), Y(54), below=6))
    else:                                                   # a snowmobile: a single track under a long seat, two skis ahead, a hood and a screen
        tl = p.get('track', L * .6); th = 12
        _track(t, X, Y, 0, tl, th, ph, wheels=3)
        _ski(t, X, Y, L * .62, L + 2, rp=p.get('skic', BLACK))
        t.line([(X(L * .74), Y(1)), (X(L * .72), Y(14))], IRON, 2, w=2)
        hood = p.get('hood', 'round')
        sh = p.get('sh', 32)                                    # seat height
        tun = [(-2, th + 2), (-2, th + 8), (tl * .9, th + 9), (tl, th + 4), (tl - 4, th - 2)]
        t.poly([(X(x), Y(y)) for x, y in tun], KA, 2, vol=(1, 2), edge=1)
        if hood == 'round':
            pts = [(tl * .8, th + 6), (tl * .82, sh), (L * .78, sh + 4), (L - 4, sh - 4), (L + 2, th + 4), (L - 6, 8), (tl, 8)]
        elif hood == 'sharp':
            pts = [(tl * .78, th + 6), (tl * .8, sh + 2), (L * .7, sh + 6), (L - 2, sh - 8), (L + 4, th), (L - 8, 6), (tl, 8)]
        else:
            pts = [(tl * .78, th + 6), (tl * .8, sh + 2), (L * .7, sh + 4), (L + 2, sh - 2), (L + 4, th + 2), (L - 8, 6), (tl, 8)]
        t.poly([(X(x), Y(y)) for x, y in pts], KA, 2, vol=(3, 3), gloss=True, edge=1)
        if p.get('stripe'): t.line([(X(tl * .84), Y(sh - 4)), (X(L - 6), Y(th + 6))], KB, 3, w=2)
        if p.get('lightstrip'): t.line([(X(L - 6), Y(th + 4)), (X(L + 3), Y(th + 5))], NEON, 3)
        else: t.rect(X(L - 3), Y(sh - 5), X(L), Y(sh - 8), LAMP, 3)
        # the screen and the bars
        sc = p.get('screen', 10)
        t.poly([(X(L * .7 - 2), Y(sh + 5)), (X(L * .7 - 6), Y(sh + 5 + sc)), (X(L * .7 - 3), Y(sh + 5 + sc)), (X(L * .7 + 2), Y(sh + 5))], GLASS, 3, edge=1)
        t.line([(X(L * .66), Y(sh + 8)), (X(L * .62), Y(sh + 10))], BLACK, 2, w=2)
        # the seat, long enough for two, and a rack or a rear box
        sl = tl * .78
        t.poly([(X(2), Y(th + 9)), (X(2), Y(sh)), (X(6), Y(sh + 2)), (X(sl), Y(sh + 2)), (X(sl + 4), Y(sh - 2)), (X(sl), Y(th + 9))], BLACKLEATHER, 2, vol=(1, 1), edge=1)
        if p.get('rack'): t.line([(X(-4), Y(sh + 4)), (X(8), Y(sh + 4))], CHROME, 2, w=2)
        if p.get('box'): t.rect(X(-6), Y(sh + 14), X(14), Y(sh), KB, 2, vol=(1, 2), edge=1)
        t.px(X(-1), Y(th + 8), REDL, 3); t.px(X(-1), Y(th + 7), REDL, 2)
        seats.append(seat_astride(X(sl - 8), Y(sh + 2))); seats.append(seat_astride(X(sl - 22), Y(sh + 2)))
    _spray(t, X(-10), X(0), G, ph)
    t.shadow(X(L / 2), G + 1, L / 2 + 4, 3)
    return t.outline(), seats


def snow_end(p, FW, FH, back=False, ph=0):
    G = FH - 9; cx = FW // 2; st = p['style']; w = p['w']; hw = w / 2
    Y = lambda y: G - y
    e = Pt(FW, FH); seats = []
    def tracks(n_h, inset=0):
        for sg in (-1, 1): e.rect(cx + sg * (hw - inset) - (6 if sg > 0 else -6), Y(n_h), cx + sg * (hw - inset), Y(0), TYRE, 2, vol=(1, 1))
    def skis(span):
        for sg in (-1, 1): e.rect(cx + sg * span - 2, Y(4), cx + sg * span + 2, Y(0), BLACK if st not in ('aerosan', 'snowcoach') else IRON, 2)
    if st == 'motorsledge':
        e.rect(cx - hw, Y(16), cx + hw, Y(0), IRON, 2, vol=(1, 1)); e.rect(cx - hw + 4, Y(14), cx + hw - 4, Y(2), IRON, 1)
        e.rect(cx - hw + 2, Y(24), cx + hw - 2, Y(16), KA, 2, vol=(1, 2), edge=1)
        e.rect(cx - hw + 6, Y(40), cx + hw - 6, Y(24), IRON if not back else KC, 2, vol=(2, 2), edge=1)
        seats = [seat_sit(cx, Y(34 + (6 if back else 0)), below=3 if back else 0)]
    elif st == 'aerosan':
        skis(hw - 2); e.rect(cx - 2, Y(4), cx + 2, Y(0), IRON, 2)
        e.poly([(cx - hw + 4, Y(10)), (cx - hw, Y(30)), (cx - hw + 8, Y(46)), (cx + hw - 8, Y(46)), (cx + hw, Y(30)), (cx + hw - 4, Y(10))], KA, 2, vol=(3, 3), gloss=True, edge=1)
        e.line([(cx - hw + 1, Y(28)), (cx + hw - 1, Y(28))], KB, 3, w=2)
        if not back: e.rect(cx - hw + 10, Y(43), cx + hw - 10, Y(33), GLASS, 1, vol=(1, 0))
        e.rect(cx - 8, Y(58), cx + 8, Y(46), IRON, 2, vol=(2, 2), edge=1)
        a = ph * 3.1; bl = abs(math.sin(a)) * 30 + 3
        e.line([(cx - bl, Y(52)), (cx + bl, Y(52))], PALEWOOD, 2, w=3) if back else e.line([(cx - bl, Y(56)), (cx + bl, Y(56))], PALEWOOD, 2, w=2)
        seats = [seat_head(cx - 6, Y(38), below=6), seat_head(cx + 6, Y(38), below=6)] if not back else [seat_hidden(cx, Y(30))] * 2
    elif st == 'snowcoach':
        e.rect(cx - hw + 2, Y(20), cx - hw + 10, Y(0), TYRE, 2, vol=(1, 1)); e.rect(cx + hw - 10, Y(20), cx + hw - 2, Y(0), TYRE, 2, vol=(1, 1))
        if not back: skis(8)
        e.poly([(cx - hw + 6, Y(12)), (cx - hw, Y(34)), (cx - hw + 6, Y(56)), (cx - 6, Y(64)), (cx + 6, Y(64)), (cx + hw - 6, Y(56)), (cx + hw, Y(34)), (cx + hw - 6, Y(12))], KA, 2, vol=(4, 3), gloss=True, edge=1)
        e.line([(cx - hw + 1, Y(26)), (cx + hw - 1, Y(26))], KB, 3, w=2)
        if not back:
            e.poly([(cx - 14, Y(52)), (cx - 16, Y(40)), (cx + 16, Y(40)), (cx + 14, Y(52))], GLASS, 1, vol=(1, 0)); e.ell(cx, Y(30), 3, 3, LAMP, 4)
            seats = [seat_head(cx - 7, Y(46), below=5), seat_head(cx + 7, Y(46), below=5)]
        else:
            e.rect(cx - 6, Y(54), cx + 6, Y(30), KA, 1, edge=0); e.ell(cx, Y(46), 4, 4, GLASS, 1)
            seats = [seat_hidden(cx, Y(30))] * 2
    elif st == 'snowcat':
        tracks(22)
        e.rect(cx - hw + 8, Y(30), cx + hw - 8, Y(18), IRON, 1)
        e.rect(cx - hw + 4, Y(66), cx + hw - 4, Y(30), KA, 2, vol=(2, 2), edge=1)
        e.rect(cx - hw + 8, Y(62), cx + hw - 8, Y(46), GLASS, 1, vol=(1, 0)); e.line([(cx, Y(62)), (cx, Y(46))], KA, 2)
        e.line([(cx - hw + 4, Y(67)), (cx + hw - 4, Y(67))], KB, 3, w=2)
        if not back:
            for sg in (-1, 1): e.rect(cx + sg * (hw - 10) - 2, Y(40), cx + sg * (hw - 10) + 2, Y(36), LAMP, 3)
            seats = [seat_head(cx - 8, Y(54), below=6), seat_head(cx + 8, Y(54), below=6)]
        else: seats = [seat_head(cx - 8, Y(54), below=6), seat_head(cx + 8, Y(54), below=6)]
    else:
        sh = p.get('sh', 32)
        e.rect(cx - 8, Y(12), cx + 8, Y(0), TYRE, 2, vol=(1, 1))
        if not back: skis(hw - 4)
        if not back:
            e.poly([(cx - hw + 2, Y(6)), (cx - hw, Y(sh - 6)), (cx - hw + 8, Y(sh + 2)), (cx + hw - 8, Y(sh + 2)), (cx + hw, Y(sh - 6)), (cx + hw - 2, Y(6))], KA, 2, vol=(3, 3), gloss=True, edge=1)
            if p.get('lightstrip'): e.line([(cx - hw + 4, Y(12)), (cx + hw - 4, Y(12))], NEON, 3)
            else: e.ell(cx, Y(sh - 8), 4, 3, LAMP, 3)
            e.poly([(cx - 9, Y(sh + 2)), (cx - 7, Y(sh + 3 + p.get('screen', 10))), (cx + 7, Y(sh + 3 + p.get('screen', 10))), (cx + 9, Y(sh + 2))], GLASS, 3, edge=1)
            e.line([(cx - hw + 2, Y(sh + 4)), (cx + hw - 2, Y(sh + 4))], BLACK, 2, w=2)
            seats = [seat_astride(cx, Y(sh + 2), cut=86), seat_astride(cx, Y(sh + 6), cut=70)]
        else:
            e.rect(cx - 10, Y(sh), cx + 10, Y(10), KA, 2, vol=(1, 2), edge=1)
            e.rect(cx - 8, Y(sh + 2), cx + 8, Y(sh - 3), BLACKLEATHER, 2, vol=(1, 0))
            if p.get('box'): e.rect(cx - 10, Y(sh + 14), cx + 10, Y(sh), KB, 2, vol=(1, 2), edge=1)
            e.rect(cx - 6, Y(14), cx + 6, Y(12), REDL, 3)
            seats = [seat_astride(cx, Y(sh + 7), cut=80), seat_astride(cx, Y(sh + 2), cut=96)]
    _spray(e, cx - hw - 4, cx + hw + 4, G, ph) if back else None
    e.shadow(cx, G + 1, hw + 4, 3)
    return e.outline(), seats


def snowmobiles():
    return [
        (1910, 'motorsledge', 'Motor sledge', dict(style='motorsledge', L=120, w=40), 'work'),
        (1910, 'aerosan', 'Propeller sledge', dict(style='aerosan', L=150, w=46), 'field'),
        (1935, 'snowcoach', 'Snow coach', dict(style='snowcoach', L=170, w=56, ports=5), 'snowpaint'),
        (1935, 'aerosan', 'Propeller sledge', dict(style='aerosan', L=156, w=48, star=True), 'field'),
        (1935, 'snowcat', 'Snowcat', dict(style='snowcat', L=150, w=64), 'snowpaint'),
        (1960, 'snowmobile', 'Snowmobile', dict(style='snowmobile', L=100, w=36, hood='round', stripe=True), 'bright'),
        (1960, 'snowcat', 'Snowcat', dict(style='snowcat', L=160, w=68), 'snowpaint'),
        (1960, 'snowcoach', 'Snow bus', dict(style='snowcoach', L=180, w=58, ports=6), 'snowpaint'),
        (1990, 'sport', 'Sport snowmobile', dict(style='snowmobile', L=112, w=40, hood='sharp', stripe=True, sh=36, screen=8, track=64), 'bright'),
        (1990, 'touring', 'Touring snowmobile', dict(style='snowmobile', L=124, w=42, hood='round', stripe=True, rack=True, box=True, track=76, screen=14), 'bright'),
        (1990, 'snowcat', 'Snowcat', dict(style='snowcat', L=168, w=70), 'rescue'),
        (2040, 'electric', 'Electric snowmobile', dict(style='snowmobile', L=114, w=40, hood='flat', lightstrip=True, sh=34, screen=10, track=66, skic=STEEL), 'future'),
        (2040, 'utility', 'Electric utility sled', dict(style='snowmobile', L=130, w=44, hood='flat', lightstrip=True, box=True, track=82, skic=STEEL, screen=16), 'future'),
        (2040, 'snowcat', 'Tracked snow cab', dict(style='snowcat', L=170, w=70), 'future'),
    ]
