# The creature roster from the book check (B2617, 2026-11-13): every creature the hand passes over the books found
# (pixel-sprites/bestiary/hand-*.tsv: name, book, page, line, what, body plan, size, moves, a short look in our own
# words, source) gets one of the shared sprite looks. Creatures close in body plan and look share one drawing.
#   python3 bestiary.py <bestiary folder>  ->  bestiary-looks.json here (name -> look, used by batch.py) and roster.md there.
import csv, glob, json, re, sys, os, collections
def has(t, *w): return any(re.search(r'\b' + x, t) for x in w)
def colour(t, dflt='light'):
    for c, w in (('balefire', ('balefire', 'sickly green')), ('fire', ('fire', 'flame', 'burn', 'ember', 'sun')), ('lightning', ('electric', 'lightning', 'spark', 'crackl', 'code', 'glitch')),
                 ('shadow', ('shadow', 'dark', 'night', 'black', 'tar')), ('moon', ('moon', 'lune', 'silver', 'star')), ('ice', ('ice', 'frost', 'cold', 'snow')), ('water', ('water', 'wave', 'river', 'sea', 'spring', 'brook')),
                 ('oil', ('oil', 'smog', 'miasma', 'smudge')), ('blood', ('blood', 'red')), ('smoke', ('smoke', 'mist', 'fog', 'cloud', 'grey', 'gray', 'wind', 'air', 'storm')),
                 ('earth', ('rock', 'stone', 'earth', 'soil', 'compost', 'garbage', 'flesh', 'heap')), ('green', ('green', 'leaf', 'plant')), ('violet', ('colour', 'color', 'rainbow', 'dream', 'mind'))):
        if has(t, *w): return c
    return dflt
SCALE = dict(tiny=.5, small=.75, man=1.0, large=1.2, huge=1.4, vast=1.55)
def look_of(r):
    """(look key, scale) for one row of a hand pass"""
    b = r['body'].strip(); t = (r['name'] + ' ' + r['look']).lower(); sz = r['size'].strip()
    if b == 'dragon':
        if has(t, 'eastern', 'oriental', 'celestial', 'lindworm', 'wurm', 'wingless', 'serpent', 'amphiptere', 'long'): return 'critter:dragon_east', 1
        if has(t, 'red', 'fire'): return 'beast:dragon_red', 1
        return ('beast:drake', 1) if has(t, 'lesser', 'drake', 'wyvern', 'demi', 'small') else ('beast:dragon', 1)
    if b == 'mixed':
        for w, k in (('gryph|hippogry', 'beast:gryphon'), ('sphinx', 'beast:sphinx'), ('manticore', 'beast:manticore'), ('chim', 'beast:chimera'), ('peryton', 'beast:peryton'), ('centaur', 'beast:horse'),
                     ('qilin|unicorn', 'beast:unicorn'), ('tanuki|raccoon', 'beast:raccoon_dog'), ('cockatrice', 'critter:basilisk'), ('wolf-spider|spider', 'critter:spider_giant'), ('toad|freak', 'beast:toad'),
                     ('rhino|kerasi', 'beast:ox_horn'), ('hunt|rider', 'person:ghostfig'), ('cluster|mass|amalgam', 'own:wisp:earth'), ('goat', 'beast:goat')):
            if re.search(w, t): return k, 1
        return 'beast:chimera', 1
    if b == 'tentacled': return ('critter:spider_squid', 1) if sz in ('tiny', 'small') else ('own:tentacles:' + ('violet' if has(t, 'cloud', 'hell', 'jelly') else 'water'), SCALE.get(sz, 1))
    if b == 'spider-insect':
        if has(t, 'butterfly', 'moth'): return 'own:swarm:light', 1
        if has(t, 'mantis'): return 'critter:mantis', 1
        if has(t, 'crystal', 'pattern', 'web', 'net', 'weaver', 'strand', 'rail', 'backdoor'): return 'critter:spider_crystal', 1
        if has(t, 'rust'): return 'critter:spider_rust', 1
        if has(t, 'cockroach', 'roach', 'beetle', 'mosquito', 'insect', 'crab', 'disc'): return 'critter:insect', 1
        return ('critter:spider', 1) if sz in ('tiny',) else ('critter:spider_giant', 1)
    if b == 'swarm': return 'own:swarm:' + ('bird' if has(t, 'bird', 'flock', 'crow') else 'sand' if has(t, 'sand', 'grain') else 'blood' if has(t, 'blood', 'red') else 'light' if has(t, 'firefl', 'light', 'pop-up', 'window') else 'grey' if has(t, 'grey', 'gray', 'faceless', 'white') else 'insect'), 1
    if b == 'serpent':
        if has(t, 'feather'): return 'critter:coatl', 1
        if has(t, 'light', 'shimmer', 'rainbow', 'see-through'): return 'own:wisp:' + colour(t), .8
        if has(t, 'worm', 'burrow', 'slug'): return 'critter:worm_giant', 1
        if has(t, 'sea', 'lake', 'water', 'deep') or sz in ('huge', 'vast'): return 'critter:sea_serpent', 1
        return ('critter:snake_poisonous', 1) if sz in ('tiny', 'small') else ('critter:snake_constrictor', 1)
    if b == 'reptile':
        if has(t, 'pterano', 'pterosaur', 'flying'): return 'critter:vulture', 1
        if has(t, 'frog', 'toad', 'kappa'): return 'beast:toad', SCALE.get(sz, 1) if sz in ('man', 'large') else 1
        if has(t, 'salamander', 'flame'): return 'beast:salamander', 1
        if has(t, 'basilisk'): return 'critter:basilisk', 1
        if has(t, 'dinosaur', 'saur', 'triceratops', 'carno'): return 'beast:dinosaur', 1
        if has(t, 'lizard'): return 'beast:salamander', 1
        return 'beast:alligator', 1
    if b == 'fish':
        if has(t, 'narwhal'): return 'own:whale:grey', 1
        if has(t, 'whale', 'dolphin'): return 'own:whale:water', 1
        if has(t, 'shark'): return 'own:shark:grey', 1
        return 'own:fish:water', 1
    if b == 'bird':
        for w, k in (('harpy|vulture|scab', 'critter:vulture'), ('feng|firebird|phoenix|fire', 'critter:firebird'), ('roc|simurgh', 'critter:roc'), ('raven|crow|hrafn', 'critter:raven'),
                     ('owl', 'critter:owl'), ('swan|goose|duck', 'critter:swan'), ('dove|pigeon', 'critter:dove'), ('eagle|hawk|falcon|raptor|thunderbird', 'critter:hawk')):
            if re.search(w, t): return k, 1
        return ('critter:bird_small', 1) if sz in ('tiny',) else ('critter:bird_large', 1)
    if b == 'bat': return 'critter:bat', 1
    if b == 'canine':
        if has(t, 'fox', 'kitsune'): return 'beast:fox', 1
        if has(t, 'white', 'winter', 'snow', 'frost'): return 'beast:wolf_winter', 1
        if has(t, 'hound', 'dog', 'jackal', 'cerberus'): return ('beast:mastiff', 1) if sz in ('large', 'huge', 'vast') or has(t, 'black dog', 'hell') else ('beast:hound', 1)
        return ('beast:wolf_alpha', 1) if sz in ('large', 'huge', 'vast') else ('beast:wolf', 1)
    if b == 'feline':
        if has(t, 'sphinx'): return 'beast:sphinx', 1
        if has(t, 'tiger'): return 'beast:tiger', 1
        if has(t, 'lion'): return 'beast:lion', 1
        if has(t, 'leopard', 'cheetah', 'jaguar'): return 'beast:leopard', 1
        if has(t, 'panther', 'black'): return 'beast:panther', 1
        return ('beast:cat', 1) if sz in ('tiny', 'small') else ('beast:leopard', 1)
    if b == 'bear': return 'beast:bear', 1
    if b == 'swine': return ('beast:boar_giant', 1) if sz in ('large', 'huge', 'vast') else ('beast:boar', 1)
    if b == 'horse':
        if has(t, 'pegasus', 'wing'): return 'beast:pegasus', 1
        if has(t, 'unicorn'): return 'beast:unicorn', 1
        if has(t, 'kelpie', 'hippocamp', 'water'): return 'beast:zephyr', 1
        if has(t, 'nightmare', 'black', 'bloodshot', 'hell'): return 'beast:nightmare', 1
        if has(t, 'mule', 'donkey'): return 'beast:mule', 1
        return 'beast:horse', 1
    if b == 'deer': return ('beast:white_hart', 1) if has(t, 'white', 'hart') else ('beast:stag', 1) if has(t, 'stag', 'antler', 'elk', 'moose') else ('beast:hare', 1) if has(t, 'rabbit', 'hare') else ('beast:deer', 1)
    if b == 'cattle':
        if has(t, 'one-horn', 'one horn', 're\'em', 'single horn'): return 'beast:ox_horn', 1
        if has(t, 'goat'): return 'beast:goat', 1
        if has(t, 'sheep', 'ram'): return 'beast:sheep', 1
        if has(t, 'fae', 'faerie', 'white bull'): return 'beast:fae_cattle', 1
        return ('beast:bull', 1) if has(t, 'bull', 'ox') else ('beast:cow', 1)
    if b == 'rodent': return ('beast:hare', 1) if has(t, 'hare', 'rabbit') else ('beast:rat', 1)
    if b == 'ape': return 'beast:chimpanzee', SCALE.get(sz, 1) if sz in ('large', 'huge') else 1
    if b == 'plant': return ('person:el_plant', 1) if has(t, 'legs', 'walk', 'man', 'woman', 'child') else ('own:plant', 1)
    if b == 'construct':
        if has(t, 'geomid', 'geometric', 'fractal', 'vector', 'monitor', 'order spirit'): return 'own:geomid:' + ('crystal' if has(t, 'crystal', 'glass') else 'metal'), 1
        for w, k in (('glass', 'person:el_glass'), ('jade', 'person:el_jade'), ('bronze|talos', 'person:el_bronze'), ('clay|golem', 'person:golem'), ('stone|statue|gargoyle', 'person:el_stone'),
                     ('plastic|junk|debris', 'own:wisp:earth'), ('train|truck|car|vehicle|machine|mech|clockwork|automaton|metal|gear|robot|tech', 'person:el_metal')):
            if re.search(w, t): return k, SCALE.get(sz, 1)
        return 'person:el_metal', SCALE.get(sz, 1)
    if b == 'corpse': return ('person:skeleton', 1) if has(t, 'skelet', 'bone') else ('person:corpse', 1)
    if b == 'giant':
        for w, k in (('fire|surtur', 'person:el_fire'), ('earth|rock|stone|gnome|subterranean', 'person:el_stone'), ('clay|golem', 'person:golem'), ('bronze|talos', 'person:el_bronze'),
                     ('oni|ogre|red|blue', 'person:oni'), ('troll|shaggy|hairy|ape|tail', 'person:troll'), ('corpse|grafted|flesh', 'person:corpse')):
            if re.search(w, t): return k, max(1.2, SCALE.get(sz, 1.3))
        return 'person:giant', max(1, SCALE.get(sz, 1.3) / 1.3)
    if b == 'small-person':
        if has(t, 'imp', 'devil', 'demon', 'gremlin', 'pain'): return 'person:imp', 1
        if has(t, 'child', 'kid', 'toy'): return 'person:figure', .7
        if has(t, 'sprite', 'faerie', 'fairy', 'wee', 'pixie', 'brownie', 'elf'): return 'person:sprite', 1
        return 'person:gnome', 1
    if b == 'winged-person':
        if has(t, 'angel', 'celestial', 'gabriel', 'archangel', 'radiant', 'holy'): return 'person:angel', 1
        if has(t, 'tengu', 'crow', 'hawk', 'owl', 'bird', 'mothman'): return 'person:birdman', 1
        return 'person:belteroth', 1
    if b == 'ghost-figure': return 'person:ghostfig', 1
    if b == 'person':
        if has(t, 'fish', 'gill', 'sea bishop', 'drowned'): return 'person:fishfolk', 1
        if has(t, 'giant', 'six-armed') or sz in ('large', 'huge', 'vast'): return 'person:giant', 1
        return 'person:figure', SCALE.get(sz, 1) if sz in ('tiny', 'small') else 1
    if b in ('formless', 'light-flame-shadow', 'other'):
        if b == 'other':
            for w, k in (('mammoth|elephant|mastodon', 'beast:mammoth'), ('eyeball|eye scream', 'critter:eye_flyer'), ('skull', 'critter:eye_flyer'), ('slug', 'critter:slug'),
                         ('chupacabra|goatsucker', 'beast:dog_small'), ('toad|cat|weasel|raven', 'beast:familiar'), ('dove', 'critter:dove')):
                if re.search(w, t): return k, 1
        if has(t, 'heap', 'pile', 'compost', 'garbage', 'flesh'): return 'own:wisp:earth', SCALE.get(sz, 1)
        if b == 'formless' and has(t, 'elemental') and has(t, 'earth', 'rock', 'stone'): return 'person:el_stone', 1.2
        if has(t, 'ice') and has(t, 'elemental'): return 'person:el_ice', 1
        if has(t, 'water') and has(t, 'elemental'): return 'person:el_water', 1
        if has(t, 'fire') and has(t, 'elemental'): return 'person:el_fire', 1
        if has(t, 'woman', 'figure', 'silhouette', 'shaped from') and b == 'light-flame-shadow': return 'person:el_' + ('shadow' if has(t, 'shadow', 'dark', 'silhouette') else 'light'), 1
        return 'own:wisp:' + colour(t, 'smoke' if b == 'formless' else 'light'), SCALE.get(sz, 1) if sz in ('tiny', 'small', 'large', 'huge') else 1
    return 'own:wisp:violet', 1
def norm(n): return re.sub(r'[^a-z0-9]', '', re.sub(r'\(.*?\)', '', n.lower()))
if __name__ == '__main__':
    D = sys.argv[1].rstrip('/') + '/'; rows = []
    for f in sorted(glob.glob(D + 'hand-*.tsv')):
        for r in csv.DictReader(open(f, encoding='utf-8'), delimiter='\t'):
            if r.get('name') and r.get('body'): rows.append(r)
    table = {}; by = collections.defaultdict(list)
    for r in rows:
        k, sc = look_of(r); r['key'] = k; r['scale'] = round(sc, 2); by[k].append(r)
        n = norm(r['name'])
        if n and n not in table: table[n] = [k, r['scale']]
        for alias in re.findall(r'\(([^)]*)\)', r['name']):
            a = norm(alias)
            if len(a) > 3 and a not in table: table[a] = [k, r['scale']]
    here = os.path.dirname(os.path.abspath(__file__))
    json.dump(dict(sorted(table.items())), open(os.path.join(here, 'bestiary-looks.json'), 'w'), indent=0, separators=(',', ':'))
    out = ['# Creature roster and sprite looks (book check, 2026-11-13)', '', '%d creatures from %d hand-checked lines, drawn with %d shared looks. Each look below lists every creature it draws; sizes are scaled per creature.' % (len(table), len(rows), len(by)), '']
    for k in sorted(by, key=lambda k: (-len(by[k]), k)):
        rs = by[k]; out.append('## %s (%d)' % (k, len(rs))); out.append('')
        out.append('; '.join('%s (%s p%s)' % (r['name'], r['book'], r['pdf_page']) for r in rs)); out.append('')
    open(D + 'roster.md', 'w', encoding='utf-8').write('\n'.join(out))
    print(len(rows), 'rows', len(table), 'names', len(by), 'looks')
    print(collections.Counter({k: len(v) for k, v in by.items()}).most_common(70))
