# Draws the sheets of every mount and vehicle look (B4970) and the list the game reads:
#   python3 mounts.py <out folder>            sheets, stills and mounts.json (modules/wodx-paperdoll/sprites/mounts)
#   python3 mounts.py --samples <out folder>  labelled sample sheets with riders aboard, for looking over
# A look's sheet is its frames across by four facings down (back, left, front, right), painted in three key ramps that
# the game swaps for one of the look's colour schemes. Each look carries its seats: where a rider's frame stands on it.
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from mountkit import *
import mount_motor as MM, mount_beasts as MB, mount_land as ML, mount_air as MA

ROWS = ('up', 'left', 'down', 'right')
BG = (74, 84, 70)


def _motor(side, end, FW, FH0):
    def go(look, ph):
        p = look[3]; FH = FH0 + (p.get('tall') or 0) if FH0 == 112 else FH0
        r, sr = side(p, FW, FH, ph=ph); d, sd = end(p, FW, FH, ph=ph); u, su = end(p, FW, FH, back=True, ph=ph)
        return (dict(right=r, left=mirror(r), down=d, up=u), dict(right=sr, left=[dict(s, x=FW - 1 - s['x']) for s in sr], down=sd, up=su))
    return go


_beast = lambda look, f: MB.draw(look[3], look[4], look[5], f)
_of = lambda fn: (lambda look, ph: fn(look[3], ph))
_drawn = lambda look, f: ML.drawn(look[3], f * 2, f % 2)

# kind: (looks, drawer(look, frame), frames, rows from the ground line to the frame's foot, label)
KINDS = {
    'horse': (MB.horses, _beast, 8, 10, 'Horses'), 'mule': (MB.mules, _beast, 8, 10, 'Mules and donkeys'), 'camel': (MB.camels, _beast, 8, 10, 'Camels'),
    'ghoulhorse': (MB.ghoulhorses, _beast, 8, 10, 'Ghouled horses'), 'szlachta': (MB.szlachta, _beast, 8, 10, 'Fleshcrafted steeds'),
    'chimera': (MB.chimeras, _beast, 8, 10, 'Chimerical steeds'), 'stygian': (MB.stygians, _beast, 8, 10, 'Stygian steeds'), 'gryphon': (MB.gryphons, _beast, 8, 10, 'Gryphons'),
    'cart': (ML.carts, _drawn, 4, 10, 'Carts and wagons'), 'carriage': (ML.carriages, _drawn, 4, 10, 'Carriages'),
    'bicycle': (ML.bicycles, _of(ML.bicycle), 2, 9, 'Bicycles'), 'motorbike': (ML.motorbikes, _of(ML.motorbike), 2, 9, 'Motorcycles'),
    'car': (MM.cars, _motor(MM.car_side, MM.car_end, 224, 112), 2, 9, 'Motor cars'), 'truck': (MM.trucks, _motor(MM.car_side, MM.car_end, 256, 136), 2, 9, 'Lorries'),
    'armoured': (MM.armoured, _motor(MM.armour_side, MM.armour_end, 256, 136), 2, 9, 'Armoured cars'), 'tank': (MM.tanks, _motor(MM.armour_side, MM.armour_end, 256, 136), 2, 9, 'Tanks'),
    'boat': (ML.boats, _of(ML.boat), 2, 14, 'Rowing boats'), 'motorboat': (ML.motorboats, _of(ML.boat), 2, 14, 'Motorboats'),
    'balloon': (MA.balloons, _of(MA.balloon), 2, 10, 'Balloons and airships'), 'plane': (MA.planes, _of(MA.plane), 2, 10, 'Aeroplanes'),
    'helicopter': (MA.helicopters, _of(MA.helicopter), 2, 10, 'Helicopters'), 'jet': (MA.jets, _of(MA.jet), 2, 10, 'Jets'),
}

# ---- colour schemes: paint or coat (a), trim or mane (b), cloth or stripe (c) ----
def S(id, label, a, b, c=(150, 130, 100)): return dict(id=id, label=label, a=a, b=b, c=c)
_BLACK = (44, 42, 48); _CREAM = (224, 214, 186); _WHITE = (226, 226, 222); _TAN = (176, 150, 110); _GREY = (130, 132, 136)
SCHEMES = {
    'none': [S('plain', 'Plain', (120, 96, 66), (70, 54, 40), _TAN)],
    'early': [S('black', 'Black', _BLACK, (30, 28, 32), (96, 62, 40)), S('maroon', 'Maroon', (110, 30, 36), _BLACK, _TAN), S('green', 'Brunswick green', (36, 78, 54), _BLACK, _TAN),
              S('blue', 'Royal blue', (34, 54, 110), _BLACK, _CREAM), S('yellow', 'Primrose', (206, 176, 70), _BLACK, (96, 62, 40)), S('grey', 'Dove grey', (150, 150, 146), (60, 60, 64), (110, 40, 40))],
    'twenties': [S('black', 'Black', _BLACK, (30, 28, 32), _TAN), S('maroon', 'Maroon', (112, 30, 38), _BLACK, _TAN), S('blue', 'Blue', (38, 62, 112), _BLACK, _CREAM),
                 S('green', 'Green', (44, 86, 60), _BLACK, _TAN), S('cream', 'Cream and black', _CREAM, _BLACK, (110, 60, 40)), S('red', 'Red', (170, 40, 36), _BLACK, _TAN)],
    'forties': [S('black', 'Black', _BLACK, (30, 28, 32), _GREY), S('grey', 'Gunmetal', (96, 102, 110), (50, 52, 58), _GREY), S('maroon', 'Maroon', (104, 32, 40), _BLACK, _TAN),
                S('green', 'Dark green', (44, 74, 56), _BLACK, _TAN), S('blue', 'Navy', (38, 52, 92), _BLACK, _CREAM), S('tan', 'Tan', (170, 146, 104), (96, 70, 48), _CREAM)],
    'field': [S('olive', 'Olive drab', (86, 92, 58), (56, 60, 40), (140, 130, 96)), S('sand', 'Sand', (186, 160, 112), (120, 100, 70), (140, 130, 96)), S('grey', 'Field grey', (104, 110, 108), (64, 68, 68), (140, 130, 96)),
              S('white', 'Whitewash', (212, 212, 206), (120, 124, 120), (140, 130, 96))],
    'sixties': [S('turquoise', 'Turquoise', (60, 160, 160), _WHITE, _CREAM), S('red', 'Red', (186, 40, 36), _WHITE, _CREAM), S('cream', 'Cream', _CREAM, (120, 40, 40), (120, 40, 40)),
                S('blue', 'Sky blue', (104, 150, 200), _WHITE, _CREAM), S('green', 'Sea green', (86, 150, 110), _WHITE, _CREAM), S('black', 'Black', _BLACK, (150, 150, 156), (150, 40, 40)),
                S('orange', 'Orange', (214, 120, 40), _BLACK, _CREAM), S('yellow', 'Yellow', (220, 190, 60), _BLACK, _BLACK)],
    'modern': [S('silver', 'Silver', (168, 172, 178), (60, 62, 68), _GREY), S('black', 'Black', _BLACK, (30, 30, 34), _GREY), S('white', 'White', _WHITE, (60, 62, 68), _GREY),
               S('red', 'Red', (170, 34, 36), (40, 40, 44), _GREY), S('blue', 'Blue', (40, 70, 130), (40, 40, 44), _GREY), S('green', 'Dark green', (40, 80, 62), (40, 40, 44), _TAN),
               S('gold', 'Champagne', (190, 170, 130), (60, 56, 50), _TAN), S('rust', 'Rusted', (120, 76, 52), (70, 60, 56), _GREY)],
    'future': [S('white', 'White', (226, 230, 232), (60, 200, 210), (60, 66, 76)), S('graphite', 'Graphite', (64, 68, 78), (230, 120, 40), (40, 42, 50)), S('teal', 'Teal', (40, 130, 136), _WHITE, (40, 42, 50)),
               S('violet', 'Violet', (110, 70, 160), (220, 220, 230), (40, 42, 50)), S('lime', 'Lime', (150, 200, 70), (40, 44, 52), (40, 42, 50)), S('copper', 'Copper', (180, 110, 70), (50, 50, 58), (40, 42, 50))],
    'work': [S('green', 'Dark green', (40, 78, 58), _BLACK, (176, 160, 124)), S('red', 'Red', (150, 40, 36), _BLACK, (176, 160, 124)), S('blue', 'Blue', (40, 62, 110), _BLACK, (170, 170, 160)),
             S('grey', 'Grey', (120, 122, 124), (56, 56, 60), (150, 140, 110)), S('brown', 'Brown', (110, 74, 50), _BLACK, (176, 160, 124)), S('yellow', 'Yellow', (210, 176, 60), _BLACK, (120, 120, 116))],
    'haul': [S('white', 'White', _WHITE, (60, 62, 70), (200, 200, 196)), S('red', 'Red', (170, 38, 36), (60, 62, 70), (200, 200, 196)), S('blue', 'Blue', (40, 74, 136), (60, 62, 70), (210, 210, 206)),
             S('yellow', 'Yellow', (220, 180, 50), _BLACK, (150, 150, 150)), S('green', 'Green', (50, 110, 70), _BLACK, (200, 200, 196)), S('orange', 'Orange', (214, 110, 40), _BLACK, (170, 170, 170))],
    'army': [S('olive', 'Olive drab', (86, 92, 58), (56, 60, 40), (140, 130, 96)), S('sand', 'Sand', (186, 160, 112), (120, 100, 70), (150, 136, 100)), S('grey', 'Grey', (100, 106, 108), (60, 64, 66), (140, 130, 96)),
             S('green', 'Forest green', (54, 82, 56), (36, 50, 38), (120, 110, 80)), S('white', 'Winter white', (212, 212, 206), (130, 134, 130), (150, 150, 140)), S('brown', 'Earth brown', (110, 86, 60), (70, 56, 40), (140, 130, 96))],
    'police': [S('blue', 'Dark blue', (36, 48, 90), _WHITE, (60, 60, 70)), S('black', 'Black', _BLACK, _WHITE, (60, 60, 70)), S('white', 'White', _WHITE, (36, 48, 90), (60, 60, 70)), S('grey', 'Grey', (110, 114, 120), (40, 42, 50), (60, 60, 70))],
    'enamel': [S('black', 'Black', _BLACK, (150, 150, 156), (96, 62, 40)), S('green', 'Green', (40, 86, 60), (190, 160, 70), (96, 62, 40)), S('maroon', 'Maroon', (112, 30, 38), (190, 160, 70), (96, 62, 40)),
               S('blue', 'Blue', (38, 62, 112), (200, 200, 196), (96, 62, 40)), S('cream', 'Cream', _CREAM, (110, 40, 40), (96, 62, 40)), S('red', 'Red', (170, 40, 36), _BLACK, (60, 50, 46))],
    'bright': [S('red', 'Red', (200, 44, 40), _WHITE, _BLACK), S('yellow', 'Yellow', (226, 190, 50), _BLACK, _BLACK), S('blue', 'Blue', (44, 96, 180), _WHITE, _BLACK), S('green', 'Green', (60, 150, 80), _WHITE, _BLACK),
               S('orange', 'Orange', (226, 120, 40), _BLACK, _BLACK), S('white', 'White', _WHITE, (200, 44, 40), _BLACK), S('purple', 'Purple', (120, 60, 150), _WHITE, _BLACK), S('black', 'Black', _BLACK, (200, 44, 40), (70, 70, 76))],
    'cartwood': [S('plain', 'Bare wood', (132, 100, 64), (86, 62, 42), (186, 172, 140)), S('tarred', 'Tarred', (72, 56, 46), (44, 36, 32), (150, 136, 110)), S('blue', 'Blue', (60, 86, 120), (110, 40, 36), (190, 176, 144)),
                 S('red', 'Ox-blood', (120, 44, 38), (50, 40, 36), (186, 172, 140)), S('green', 'Green', (60, 94, 64), (150, 40, 36), (190, 176, 144))],
    'heraldic': [S('red', 'Red and gold', (150, 34, 36), (200, 164, 60), (150, 34, 36)), S('blue', 'Blue and silver', (40, 60, 130), (200, 200, 204), (40, 60, 130)), S('green', 'Green and gold', (40, 96, 60), (200, 164, 60), (40, 96, 60)),
                 S('black', 'Black and silver', _BLACK, (190, 190, 196), (110, 30, 36)), S('purple', 'Purple and gold', (96, 40, 110), (200, 164, 60), (96, 40, 110)), S('white', 'White and red', (216, 212, 200), (150, 34, 36), (216, 212, 200))],
    'coach': [S('black', 'Black', _BLACK, (190, 160, 70), (110, 30, 36)), S('maroon', 'Maroon', (104, 28, 36), _BLACK, _TAN), S('green', 'Bottle green', (34, 70, 50), _BLACK, _TAN), S('blue', 'Dark blue', (34, 46, 90), _BLACK, _CREAM),
              S('yellow', 'Yellow', (206, 170, 60), _BLACK, (96, 62, 40)), S('red', 'Mail red', (160, 36, 34), _BLACK, _TAN)],
    'boatpaint': [S('white', 'White', _WHITE, (40, 60, 110), _TAN), S('blue', 'Blue', (40, 70, 130), _WHITE, _TAN), S('green', 'Green', (44, 100, 70), _CREAM, _TAN), S('red', 'Red', (160, 40, 36), _WHITE, _TAN),
                  S('black', 'Black', _BLACK, (160, 40, 36), _TAN), S('varnish', 'Varnished', (150, 100, 56), (96, 62, 40), _CREAM)],
    'rubber': [S('grey', 'Grey', (110, 114, 120), _BLACK, (220, 120, 40)), S('orange', 'Orange', (226, 110, 40), _BLACK, (60, 60, 66)), S('black', 'Black', _BLACK, (90, 90, 96), (200, 44, 40)), S('olive', 'Olive', (86, 92, 58), _BLACK, (60, 60, 50))],
    'canvas': [S('linen', 'Doped linen', (206, 192, 150), (120, 86, 56), (150, 130, 100)), S('red', 'Red', (150, 36, 36), _CREAM, _TAN), S('blue', 'Blue', (40, 66, 120), _CREAM, _TAN), S('silver', 'Silver', (176, 178, 180), (60, 62, 70), _TAN),
               S('yellow', 'Yellow', (214, 180, 70), _BLACK, _TAN), S('green', 'Green', (50, 100, 70), _CREAM, _TAN)],
    'royal': [S('blue', 'Blue and gold', (40, 60, 136), (206, 170, 70), (206, 170, 70)), S('red', 'Red and gold', (156, 36, 40), (206, 170, 70), (220, 206, 160)), S('green', 'Green and white', (40, 104, 70), _WHITE, (206, 170, 70)),
              S('white', 'White and blue', (220, 214, 196), (40, 60, 136), (156, 36, 40))],
    'gaudy': [S('red', 'Red and yellow', (200, 44, 40), (226, 190, 50), _WHITE), S('blue', 'Blue and white', (44, 96, 180), _WHITE, (200, 44, 40)), S('green', 'Green and yellow', (50, 130, 80), (226, 190, 50), _TAN),
              S('purple', 'Purple and orange', (110, 60, 150), (226, 120, 40), _WHITE), S('black', 'Black and red', _BLACK, (200, 44, 40), _WHITE), S('rainbow', 'Orange and blue', (226, 120, 40), (44, 96, 180), _WHITE)],
    'airline': [S('silver', 'Silver', (184, 188, 192), (40, 60, 130), _WHITE), S('white', 'White and blue', _WHITE, (40, 70, 140), _WHITE), S('red', 'White and red', _WHITE, (180, 40, 40), _WHITE),
                S('green', 'Cream and green', _CREAM, (40, 100, 70), _WHITE), S('black', 'Black and gold', _BLACK, (200, 164, 60), _WHITE)],
    'warbird': [S('olive', 'Olive', (86, 92, 58), (150, 40, 36), (220, 210, 170)), S('grey', 'Grey', (120, 128, 136), (50, 60, 80), (220, 220, 220)), S('sand', 'Sand', (190, 164, 116), (110, 80, 50), _WHITE),
                S('red', 'Red', (170, 36, 36), _WHITE, _BLACK), S('blue', 'Dark blue', (36, 52, 96), (220, 190, 60), _WHITE), S('silver', 'Bare metal', (180, 184, 188), (60, 62, 70), (180, 40, 40))],
    'rescue': [S('red', 'Red and white', (190, 40, 36), _WHITE, _WHITE), S('yellow', 'Yellow', (226, 186, 40), _BLACK, _BLACK), S('white', 'White and red', _WHITE, (190, 40, 36), _WHITE), S('orange', 'Orange and blue', (226, 110, 40), (36, 52, 110), _WHITE)],
    'coat': [S('bay', 'Bay', (112, 70, 40), (36, 28, 24), (150, 40, 40)), S('black', 'Black', (58, 52, 50), (30, 26, 26), (40, 70, 120)), S('grey', 'Grey', (176, 176, 170), (96, 96, 100), (60, 110, 70)),
             S('chestnut', 'Chestnut', (150, 84, 44), (120, 64, 34), (40, 60, 110)), S('palomino', 'Palomino', (200, 160, 96), (230, 220, 194), (120, 60, 90)), S('dun', 'Dun', (170, 140, 96), (50, 40, 34), (110, 40, 40)),
             S('brown', 'Dark brown', (84, 56, 40), (40, 30, 26), (190, 160, 70)), S('white', 'White', (220, 218, 210), (190, 188, 180), (130, 40, 50))],
    'dun': [S('brown', 'Brown', (110, 84, 64), (40, 32, 28), (150, 120, 80)), S('grey', 'Grey', (130, 126, 122), (56, 52, 52), (110, 60, 50)), S('black', 'Black', (60, 54, 52), (30, 26, 26), (150, 120, 80)),
            S('sorrel', 'Sorrel', (150, 96, 60), (80, 50, 36), (60, 80, 110))],
    'camel': [S('sand', 'Sand', (196, 160, 110), (140, 100, 60), (150, 40, 40)), S('brown', 'Brown', (140, 100, 66), (90, 60, 40), (40, 70, 120)), S('white', 'White', (220, 210, 190), (180, 164, 136), (60, 110, 70)),
              S('dark', 'Dark', (96, 70, 52), (56, 40, 32), (190, 150, 60))],
    'ghoul': [S('black', 'Black', (48, 40, 42), (20, 16, 18), (110, 20, 26)), S('blood', 'Blood bay', (96, 40, 36), (30, 18, 18), (40, 36, 40)), S('ashen', 'Ashen', (120, 116, 112), (40, 36, 38), (110, 20, 26)),
              S('dark', 'Dark brown', (70, 48, 40), (26, 20, 20), (60, 20, 60))],
    'flesh': [S('raw', 'Raw', (176, 120, 116), (90, 40, 44), (60, 20, 26)), S('pale', 'Pale', (200, 180, 166), (120, 70, 70), (60, 20, 26)), S('bruise', 'Bruised', (130, 100, 124), (70, 36, 60), (50, 20, 30)),
              S('grey', 'Corpse grey', (140, 140, 130), (80, 60, 60), (60, 20, 26))],
    'dream': [S('moon', 'Moonlit', (190, 200, 226), (236, 226, 160), (90, 60, 150)), S('night', 'Night', (40, 36, 70), (150, 60, 160), (40, 120, 130)), S('rose', 'Rose', (226, 170, 190), (250, 240, 220), (150, 60, 100)),
              S('leaf', 'Leaf', (90, 150, 90), (220, 200, 90), (120, 70, 40)), S('ember', 'Ember', (60, 30, 30), (230, 110, 40), (120, 30, 30))],
    'dead': [S('pale', 'Pale', (178, 186, 190), (90, 110, 130), (40, 40, 50)), S('iron', 'Iron', (80, 84, 92), (40, 44, 52), (110, 110, 120)), S('ash', 'Ash', (130, 126, 122), (60, 58, 60), (40, 40, 50))],
    'gryphon': [S('gold', 'Golden', (176, 136, 80), (226, 220, 204), (150, 40, 40)), S('dark', 'Dark', (96, 70, 50), (60, 50, 46), (40, 60, 110)), S('snow', 'Snowy', (214, 210, 200), (236, 234, 226), (60, 110, 70)),
                S('red', 'Red', (150, 80, 50), (200, 160, 90), (40, 60, 40))],
}


def ramps(s): return dict(a=ramp(s['a']), b=ramp(s['b']), c=ramp(s['c']))


def look_id(look): return f"{look[0]}-{look[1]}"


def frames_of(kind, look):
    """[(frames by facing, seats by facing)] for each frame of the look's sheet"""
    _, drawer, n, _, _ = KINDS[kind]
    return [drawer(look, f) for f in range(n)]


def sheet(fr):
    h, w = fr[0][0]['right'].shape[:2]; out = np.zeros((h * 4, w * len(fr), 4), np.uint8)
    for c, (faces, _) in enumerate(fr):
        for r, face in enumerate(ROWS): out[r * h:(r + 1) * h, c * w:(c + 1) * w] = faces[face]
    return out


def write(out):
    man = dict(version=1, rows=list(ROWS), keys=dict(a=KA, b=KB, c=KC), schemes={k: [dict(id=s['id'], label=s['label'], **{q: [list(t) for t in v] for q, v in ramps(s).items()}) for s in v] for k, v in SCHEMES.items()}, kinds={})
    total = 0
    for kind, (looks, _, n, foot, label) in KINDS.items():
        os.makedirs(f'{out}/{kind}', exist_ok=True); entry = dict(label=label, frames=n, looks=[])
        for i, look in enumerate(looks()):
            fr = frames_of(kind, look); h, w = fr[0][0]['right'].shape[:2]; im = sheet(fr)
            Image.fromarray(im).save(f'{out}/{kind}/{look_id(look)}.png', optimize=True); total += 1
            assert look[-1] in SCHEMES, look[-1]
            seats = {f: [[s['x'], s['y'], s['cut'], 1 if s['pose'] == 'ride' else 0] for s in fr[0][1][f]] for f in ROWS}
            entry['looks'].append(dict(id=look_id(look), **{'from': look[0]}, style=look[1], label=look[2], w=w, h=h, ground=h - foot, schemes=look[-1], seats=seats, **({'adds': True} if look[3].get('adds') else {})))
            if i == 0: Image.fromarray(recolour(fr[0][0]['right'], ramps(SCHEMES[look[-1]][0]))).save(f'{out}/{kind}/still.png', optimize=True)
        man['kinds'][kind] = entry
    json.dump(man, open(f'{out}/mounts.json', 'w'), separators=(',', ':'))
    print(total, 'looks')


# ---- sample sheets ----
PROTO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../modules/wodx-paperdoll/sprites/proto/')
_R = {}
def _rider(face, seat, i):
    names = ('townsman-1888', 'lady-1888')[i % 2]; key = names + ('.ride' if seat['pose'] == 'ride' else '')
    if key not in _R: _R[key] = np.array(Image.open(PROTO + key + '.png').convert('RGBA'))
    r = ROWS.index(face); f = _R[key][r * 112:(r + 1) * 112, 0:96].copy(); f[seat['cut']:] = 0; return f


def _put(canvas, arr, ox, oy):
    h, w = arr.shape[:2]; x0 = max(0, ox); y0 = max(0, oy); x1 = min(canvas.shape[1], ox + w); y1 = min(canvas.shape[0], oy + h)
    if x1 <= x0 or y1 <= y0: return
    src = arr[y0 - oy:y1 - oy, x0 - ox:x1 - ox]; a = src[..., 3:4].astype(float) / 255; reg = canvas[y0:y1, x0:x1]
    reg[..., :3] = (src[..., :3] * a + reg[..., :3] * (1 - a)).astype(np.uint8); reg[..., 3] = np.maximum(reg[..., 3], src[..., 3])


def _cell(faces, seats, face, scheme, riders=True):
    h, w = faces['right'].shape[:2]; c = np.zeros((h, w, 4), np.uint8); c[..., :3] = BG
    _put(c, recolour(faces[face], ramps(scheme)), 0, 0)
    if riders:
        for i in sorted(range(len(seats[face])), key=lambda i: seats[face][i]['y']):
            s = seats[face][i]; _put(c, _rider(face, s, i), s['x'] - 48, s['y'] - 103)
    return c


INK = (232, 228, 214); DIM = (176, 180, 160)
def _text(img, x, y, s, col=INK, big=False):
    d = ImageDraw.Draw(img); f = ImageFont.load_default(size=22 if big else 13)
    d.text((x, y), s, fill=col, font=f)


def sample(kinds, out, name, title):
    """one picture: for each kind, a row per era with every style (riders aboard, colours varied), then one look in every colour and its four facings"""
    blocks = []
    for kind in kinds:
        looks = KINDS[kind][0](); drawn = [(l, frames_of_first(kind, l)) for l in looks]
        h, w = drawn[0][1][0]['right'].shape[:2]; h = max(d[1][0]['right'].shape[0] for d in drawn)
        eras = sorted({l[0] for l in looks}); cols = max(sum(1 for l in looks if l[0] == e) for e in eras)
        # crop the empty top of the frames so the sheet stays compact
        top = min(min(int(np.nonzero(d[1][0][f][..., 3].any(1))[0].min()) + (h - d[1][0][f].shape[0]) for f in ROWS) for d in drawn); top = max(0, min(top - 46, h - 60))
        ch = h - top + 18; W = max(cols, 4) * w + 70; rows_n = len(eras) + 2
        img = Image.new('RGBA', (W, 34 + rows_n * ch + 8), BG + (255,)); _text(img, 8, 4, KINDS[kind][4], big=True); arr = None
        k = 0
        for r, e in enumerate(eras):
            _text(img, 6, 34 + r * ch + ch // 2 - 8, 'from' if e else 'any', DIM); _text(img, 6, 34 + r * ch + ch // 2 + 6, str(e) if e else 'year', INK)
            for c, (l, (faces, seats)) in enumerate([d for d in drawn if d[0][0] == e]):
                sc = SCHEMES[l[-1]]; cell = _cell(faces, seats, 'right', sc[k % len(sc)]); k += 1
                pad = h - cell.shape[0]; cell = cell[max(0, top - pad):]
                img.alpha_composite(Image.fromarray(cell), (70 + c * w, 34 + r * ch + (ch - 18 - cell.shape[0])))
                _text(img, 70 + c * w + 6, 34 + r * ch + ch - 17, l[2], DIM)
        # one look in each of its colours
        mid = drawn[len(drawn) // 2]; sc = SCHEMES[mid[0][-1]]; r = len(eras)
        _text(img, 6, 34 + r * ch + ch // 2 - 8, 'colours', DIM)
        n = min(len(sc), max(cols, 4))
        for c in range(n):
            cell = _cell(mid[1][0], mid[1][1], 'right', sc[c], riders=False); pad = h - cell.shape[0]; cell = cell[max(0, top - pad):]
            img.alpha_composite(Image.fromarray(cell), (70 + c * w, 34 + r * ch + (ch - 18 - cell.shape[0]))); _text(img, 70 + c * w + 6, 34 + r * ch + ch - 17, sc[c]['label'], DIM)
        r += 1; _text(img, 6, 34 + r * ch + ch // 2 - 8, 'facings', DIM)
        for c, face in enumerate(('down', 'up', 'left', 'right')):
            cell = _cell(mid[1][0], mid[1][1], face, sc[(len(drawn) // 2) % len(sc)]); pad = h - cell.shape[0]; cell = cell[max(0, top - pad):]
            img.alpha_composite(Image.fromarray(cell), (70 + c * w, 34 + r * ch + (ch - 18 - cell.shape[0])))
        blocks.append(img)
    W = max(b.width for b in blocks); H = sum(b.height for b in blocks)
    full = Image.new('RGBA', (W, H), BG + (255,)); y = 0
    for b in blocks: full.paste(b, (0, y)); y += b.height
    full = full.convert('RGB'); full.save(f'{out}/{name}.png', optimize=True); print(name, full.size)


def frames_of_first(kind, look): return KINDS[kind][1](look, 0)


SAMPLES = [
    ('01-horses-mules-camels', ['horse', 'mule', 'camel']), ('02-supernatural-mounts', ['ghoulhorse', 'szlachta', 'chimera', 'stygian', 'gryphon']),
    ('03-carts', ['cart']), ('04-carriages', ['carriage']), ('05-bicycles-motorcycles', ['bicycle', 'motorbike']), ('06-motor-cars', ['car']), ('07-lorries', ['truck']),
    ('08-armoured-cars', ['armoured']), ('09-tanks', ['tank']), ('10-boats', ['boat', 'motorboat']), ('11-balloons-airships', ['balloon']), ('12-aeroplanes', ['plane']),
    ('13-helicopters', ['helicopter']), ('14-jets', ['jet']),
]

if __name__ == '__main__':
    if sys.argv[1] == '--samples':
        os.makedirs(sys.argv[2], exist_ok=True)
        for name, kinds in SAMPLES:
            if len(sys.argv) > 3 and not any(a in name for a in sys.argv[3:]): continue
            sample(kinds, sys.argv[2], name, name)
    else: write(sys.argv[1])
