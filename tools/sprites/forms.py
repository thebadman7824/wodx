# A Garou's other forms in the colour of its own fur (B5813): Glabro (the near-man, bigger and hairier, in the same clothes),
# Crinos (crinos.py), Hispo and Lupus (wolf.py). The two rigs draw in fixed greys; recolour() swaps those exact ramps for
# ramps made from the fur colour, so eyes, claws, teeth and the mouth keep their own colours. Own art, no outside pixels.
import numpy as np
import rig, crinos as K, wolf as Wf, wear as Wr, proto_attacks as PA, monster as M
S, SH = Wr.S, Wr.SH
FORMS = ('homid', 'glabro', 'crinos', 'hispo', 'lupus')


def fur_ramps(fur):
    """(coat, belly) ramps for a fur colour (r, g, b): the belly is the coat lightened toward bone"""
    fur = tuple(int(v) for v in fur)
    belly = tuple(int(c + (232 - c) * .35) for c in fur)
    return rig.ramp(fur), rig.ramp(belly)


def recolour(sheet, pairs):
    """every pixel whose colour is in a source ramp takes the matching tone of its target ramp; nothing else changes"""
    out = sheet.copy()
    rgb = out[..., :3].astype(np.int32)
    code = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
    for src, dst in pairs:
        for i, c in enumerate(src):
            if i == 0:
                continue   # the outline stays the outline
            k = (c[0] << 16) | (c[1] << 8) | c[2]
            m = (code == k) & (out[..., 3] > 0)
            out[m, :3] = dst[i]
    return out


def _wolfish(fur):
    coat, belly = fur_ramps(fur)
    return [(Wf.GREY, coat), (Wf.PALE, belly)]


def _crinish(fur):
    coat, belly = fur_ramps(fur)
    return [(K.RAMP, coat), (K.BELLY, belly)]


def glabro_spec(spec, fur):
    """the near-man: broader and heavier in the limbs, the hair grown long and a beard of the fur's colour, the skin darkened a little"""
    d = dict(spec)
    hx = '#%02x%02x%02x' % tuple(int(v) for v in fur)
    sk = tuple(int(c * .9) for c in (spec.get('skin') or (206, 170, 140)))
    d.update(skin=sk, hair=(hx, 'long'), beard=hx, thin=1.22, sw=7.8, eyes=(150, 110, 40))
    return d


def sheets(spec, fur):
    """{form: {act: sheet}} for the four other forms; each walk sheet first under ''"""
    out = {}
    g = glabro_spec(spec, fur)
    gs = PA.person_sheets(g, [('claw', None, None)])
    gs.update(PA.extras(gs[''], 'die'))
    gs.update(PA.drawn(g))
    gs = {k: M.post(v, scale=1.18) for k, v in gs.items()}   # a head taller than the homid, about its feet
    out['glabro'] = gs
    cw = recolour(K.sheet(), _crinish(fur))
    out['crinos'] = {'': cw, 'claw': PA.lunge(cw, 'claw'), **PA.extras(cw, 'die')}
    for form, (s, heavy) in (('hispo', (1.32, 1.22)), ('lupus', (1.0, 1.0))):
        w = recolour(Wf.sheet(s, heavy), _wolfish(fur))
        out[form] = {'': w, 'bite': PA.lunge(w, 'bite'), **PA.extras(w, 'die'),
                     'howl': recolour(Wf.howl(s, heavy), _wolfish(fur))}
    return out
