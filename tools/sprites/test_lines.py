# Moves only one line has (B5810 to B5819): each drawn move is a full six-frame sheet in four facings that stays on the ground,
# props show in the hands, a Garou's other forms take its own fur colour, the wolf throws its head back to howl.
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wear as Wr, wolf as Wf, forms as Fm, batch as Bt
SH, S = 112, 96
def box(fr):
    ys, xs = np.nonzero(fr[..., 3]); return xs.min(), ys.min(), xs.max(), ys.max()
def cell(sh, row, col): return sh[row*SH:(row+1)*SH, col*S:(col+1)*S]
d = Wr.fig(skin=(206, 166, 132), hair=('#5a4026', 'short'), top=('#5a4532', 'tunic'), legs=('#4a4238', 'tights'))
ground = box(cell(Wr.stand(d), 2, 0))[3]
for n in Wr.LINE_POSED:
    sh = Wr.line_posed(d, n); assert sh.shape == (4*SH, 6*S, 4), n
    for row in range(4):
        for col in (0, 5):
            assert cell(sh, row, col)[..., 3].any(), (n, row, col, 'drawn')
            assert box(cell(sh, row, col))[3] <= ground + (5 if col == 0 else 3), (n, row, col, 'nothing below the ground')
    assert not np.array_equal(cell(sh, 2, 0), cell(sh, 2, 5)) or n in Wr.LINE_LOOP, (n, 'the move goes somewhere')
# a Kindred in frenzy has red eyes
fz = cell(Wr.line_posed(d, 'frenzy'), 2, 3)
assert ((fz[..., 0] > 180) & (fz[..., 1] < 60) & (fz[..., 2] < 60) & (fz[..., 3] > 0)).any(), 'red eyes in frenzy'
# the holy symbol, the stake and the cards are things in the hands, in their own colours
def has(fr, ramp): px = set(map(tuple, fr[..., :3][fr[..., 3] > 0])); return sum(tuple(c) in px for c in ramp[1:])
assert has(cell(Wr.line_posed(d, 'brandish'), 2, 5), Wr.RP['holy']) >= 2, 'a holy symbol'
assert has(cell(Wr.line_posed(d, 'brace'), 3, 5), Wr.RP['wood']) >= 2, 'a stake'
assert has(cell(Wr.line_posed(d, 'cards'), 2, 5), Wr.RP['bone']) >= 2, 'cards'
# the day's sleep: lying down after the first two frames, flat in the coffin, a face in the earth
for where in ('coffin', 'earth'):
    sh = Wr.rest_in(d, where); assert sh.shape == (4*SH, 6*S, 4), where
    for row in range(4): assert cell(sh, row, 5)[..., 3].any(), (where, row)
cof, ear = cell(Wr.rest_in(d, 'coffin'), 2, 5), cell(Wr.rest_in(d, 'earth'), 2, 5)
assert not np.array_equal(cof, ear), 'coffin and earth look different'
# a Garou's forms in its own fur, and a howl that lifts the head
fur = (150, 96, 50)
fs = Fm.sheets(dict(skin=(206, 166, 132), hair=('#5a4026', 'short'), top=('#5a4532', 'tunic'), legs=('#4a4238', 'tights')), fur)
assert set(fs) == {'glabro', 'crinos', 'hispo', 'lupus'}, set(fs)
coat = set(map(tuple, Fm.fur_ramps(fur)[0][1:]))
for f in ('crinos', 'hispo', 'lupus'):
    px = fs[f][''][..., :3][fs[f][''][..., 3] > 0]
    assert any(tuple(p) in coat for p in px[:: max(1, len(px)//4000)]), (f, 'drawn in the fur colour')
    assert 'die' in fs[f], f
assert 'howl' in fs['lupus'] and 'howl' in fs['hispo']
gl = box(cell(fs['glabro'][''], 2, 0)); hm = box(cell(Wr.sheet(Wr.fig(skin=(206, 166, 132), hair=('#5a4026', 'short'), top=('#5a4532', 'tunic'), legs=('#4a4238', 'tights'))), 2, 0))
assert gl[3] - gl[1] > hm[3] - hm[1], 'the Glabro is taller than the homid'
hw = Wf.howl(); hd = box(cell(hw, 3, 5))[1]; wk = box(cell(Wf.sheet(), 3, 0))[1]
assert hd < wk, ('the howling head is higher than the walking one', hd, wk)
# the batch knows which moves each line gets, and a ghoul is a Mortal with the ghoul variant
assert Bt.line_of({'line': 'Mortal', 'variant': 'ghoul'}) == 'ghoul'
for line, moves in Bt.LINE_MOVES.items():
    for m in moves: assert m in Wr.LINE_POSED or m == 'howl', (line, m)
print('line moves ok')
