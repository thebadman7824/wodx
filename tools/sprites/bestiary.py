# The creature roster from the book check (2026-11-13): sorts every creature stat block found in the books by body plan,
# and names the sprite look that draws each plan. Input: blocks.jsonl and hits.jsonl from the PC scan (names and single
# look words only, no book text). Run: python3 bestiary.py <bestiary folder>  -> roster.json, roster.md in that folder.
import json, re, sys, os, collections
D = sys.argv[1].rstrip('/') + '/'
# body plans, checked in this order; the first whose words appear wins. look: the sprite that draws the plan.
PLANS = [
 ('dragon', 'Dragon or drake', {'dragon'}, 'beast:dragon'),
 ('tentacled', 'Tentacled horror', {'tentacle', 'tentacles', 'squid', 'octopus', 'jellyfish'}, 'critter:spider_squid'),
 ('spider', 'Spider, insect or other many-legged thing', {'spider', 'scorpion', 'insect', 'beetle', 'centipede', 'crab', 'lobster', 'locust', 'wasp', 'ant', 'bee'}, 'critter:spider_giant'),
 ('bird', 'Bird', {'bird', 'raven', 'crow', 'owl', 'hawk', 'falcon', 'eagle', 'vulture', 'heron', 'crane', 'feathers', 'beak'}, 'critter:raven'),
 ('bat', 'Bat', {'bat'}, 'critter:bat'),
 ('canine', 'Wolf, dog or fox', {'wolf', 'dog', 'hound', 'jackal', 'fox'}, 'beast:wolf'),
 ('feline', 'Great cat or cat', {'cat', 'lion', 'tiger', 'leopard', 'panther'}, 'beast:leopard'),
 ('bear', 'Bear', {'bear'}, 'beast:bear'),
 ('swine', 'Boar or pig', {'boar', 'pig', 'swine'}, 'beast:boar'),
 ('horse', 'Horse', {'horse', 'mare', 'stallion', 'hooves'}, 'beast:horse'),
 ('deer', 'Deer or stag', {'deer', 'stag', 'hart', 'antlers'}, 'beast:stag'),
 ('cattle', 'Bull, goat or ram', {'bull', 'ox', 'cow', 'goat', 'ram', 'sheep'}, 'beast:bull'),
 ('rodent', 'Rat, weasel or hare', {'rat', 'mouse', 'weasel', 'ferret', 'rabbit', 'hare'}, 'beast:rat'),
 ('ape', 'Ape or monkey', {'ape', 'monkey', 'gorilla'}, 'beast:chimpanzee'),
 ('reptile', 'Lizard, toad or crocodile', {'toad', 'frog', 'lizard', 'crocodile', 'alligator', 'turtle', 'tortoise', 'scales'}, 'beast:alligator'),
 ('fish', 'Fish, shark or sea beast', {'fish', 'shark', 'whale', 'dolphin', 'seal'}, 'own:fish'),
 ('serpent', 'Serpent or worm', {'snake', 'serpent', 'eel', 'worm'}, 'critter:snake_constrictor'),
 ('swarm', 'Swarm', {'swarm', 'flies'}, 'own:swarm'),
 ('formless', 'Formless: cloud, smoke, ooze, mass', {'cloud', 'mist', 'fog', 'smoke', 'ooze', 'slime', 'blob'}, 'own:wisp'),
 ('plant', 'Plant or tree', {'tree', 'plant', 'vine', 'vines', 'flower', 'thorns', 'fungus'}, 'own:plant'),
 ('construct', 'Statue, clay or machine', {'statue', 'clay', 'machine', 'mechanical', 'robot', 'doll', 'puppet', 'wires'}, 'person:golem'),
 ('corpse', 'Walking corpse or skeleton', {'corpse', 'rotting', 'skeleton', 'skeletal', 'zombie', 'mummy', 'bones'}, 'person:corpse'),
 ('giant', 'Giant, ogre or troll', {'giant', 'ogre', 'troll', 'hulking'}, 'person:troll'),
 ('small', 'Imp, goblin or dwarf', {'imp', 'goblin', 'dwarf'}, 'person:gnome'),
 ('winged', 'Winged figure: angel or demon', {'angel', 'wings', 'winged'}, 'person:belteroth'),
 ('ghost', 'Ghost or spectral figure', {'ghost', 'spectral', 'translucent', 'transparent'}, 'person:ghost'),
 ('person', 'Person (drawn by the people rig)', {'human', 'humanoid', 'man', 'woman', 'child', 'person', 'figure', 'monk', 'knight', 'warrior', 'soldier', 'priest', 'demon', 'devil', 'hair'}, 'person'),
 ('light', 'Light, flame or shadow with no body', {'light', 'flame', 'flames', 'fire', 'shadow', 'shadows', 'darkness', 'glowing', 'invisible', 'storm', 'wind', 'ice', 'water', 'crystal', 'mirror', 'glass'}, 'own:wisp'),
]
SPIRIT = {'charms', 'essence'}
BAD = re.compile(r"^(chapter|book|incapacitated|politics|prime|attributes|abilities|backgrounds|appendix|introduction|traits|powers|gifts|rites|image|notes?|hunt|xt|stamina|strength|dexterity|dematerialized|materialized|exceptional|demonic|delusions|sample|forms?|speech|passage|bridge|opened bridge|wounding|dedication|talisman|status|ride|wealth|resources|presence|investigation|metal|young cultist|unit commander|[^a-z]*$)|\d|chapter|^[A-Z\u2019'\-:, ]{11,}$", re.I)
def plan_of(words):
    w = set(words) - {'wyrm', 'children', 'silver'}   # the Wyrm and tribe names are not looks
    for k, label, keys, look in PLANS:
        if w & keys: return k
    return None
hits = collections.defaultdict(list)
for l in open(D + 'hits.jsonl', encoding='utf-8'):
    h = json.loads(l)
    for s in h['stat']:
        m = re.match(r"Image:\s*(?:The |An? |Each |Most |Every )?([A-Z][\w'’\-]*(?: (?:[A-Z][\w'’\-]*|of|the|de)){0,4})\s+(?:is|are|appears?|looks?|resembles?|takes?|has|have|seems?|stands?)\b", s)
        hits[(h['book'], h['page'])].append(m.group(1) if m else None)
rows = []; used = collections.Counter()
for l in open(D + 'blocks.jsonl', encoding='utf-8'):
    b = json.loads(l); key = (b['book'], b['page']); name = b['name'] if b['name'] and not BAD.match(b['name']) else ''
    if b['image_words']:
        i = used[key]; used[key] += 1; alt = hits[key][i] if i < len(hits[key]) else None
        if alt and not BAD.match(alt) and alt.lower() not in ('this', 'these', 'they', 'it', 'he', 'she'): name = name or alt
        if alt and name and name.lower() != alt.lower() and re.search(r'chapter|book|\bthe\b', name, re.I): name = alt
    kinds = set(b['kinds']); words = b['image_words'] or []
    # what kind of thing: a spirit has charms or essence, a wraith or spectre corpus or pathos, a vampire disciplines
    kind = 'spirit' if kinds & SPIRIT else 'wraith' if kinds & {'corpus', 'pathos'} else 'vampire' if 'disciplines' in kinds else 'shapechanger' if {'rage', 'gnosis'} <= kinds else 'fae' if 'glamour' in kinds else 'creature' if (kinds & {'weight'} or 'rage' in kinds) else 'other'
    p = plan_of(words) if words else None; sure = bool(p)
    if not p and kind in ('vampire', 'shapechanger'): p = 'person'
    if not p and kind not in ('spirit',): p = plan_of(b['words'])
    if not p and kind == 'spirit': p = 'unsure'
    if kind == 'other' and p in (None, 'person', 'light'): continue          # an NPC or a rules box, not a creature
    rows.append({'name': name, 'book': b['book'], 'page': int(b['page']), 'kind': kind, 'plan': p or 'unsure', 'sure': sure, 'feet': b['feet'], 'words': words})
# one row per named creature (the first book that has it), unnamed ones kept apart
by = {}; unnamed = []
for r in rows:
    if not r['name']: unnamed.append(r); continue
    k = re.sub(r'[^a-z]', '', r['name'].lower()).rstrip('s')
    if k in by: by[k].setdefault('also', []).append('%s %d' % (r['book'], r['page']))
    else: by[k] = r
named = sorted(by.values(), key=lambda r: (r['plan'], r['name'].lower()))
json.dump({'named': named, 'unnamed': unnamed}, open(D + 'roster.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
L = {k: (label, look) for k, label, keys, look in PLANS}; L['unsure'] = ('Look words not enough to tell', '?')
cnt = collections.Counter(r['plan'] for r in named); ucnt = collections.Counter(r['plan'] for r in unnamed)
out = ['# Creature roster from the book check (2026-11-13)', '', 'Built from the PC scan of the extracted text of 434 books (380 with game numbers). Each line is one stat block with its name and the book page; the body plan is read from single look words of its description, not from book text. "sure" means the description itself named the shape; otherwise the shape was guessed from the whole block.', '',
       '| Body plan | Named | Unnamed | Drawn by |', '|---|---|---|---|']
for k in [p[0] for p in PLANS] + ['unsure']:
    out.append('| %s | %d | %d | %s |' % (L[k][0], cnt[k], ucnt[k], L[k][1]))
out += ['', 'Total: %d named creatures, %d more blocks without a readable name.' % (len(named), len(unnamed)), '']
for k in [p[0] for p in PLANS] + ['unsure']:
    rs = [r for r in named if r['plan'] == k]
    if not rs: continue
    out += ['## %s (%d)' % (L[k][0], len(rs)), '']
    out += ['- %s (%s, %s p%d%s)%s' % (r['name'], r['kind'], r['book'], r['page'], '' if r['sure'] else ', guessed', ' also ' + ', '.join(r['also'][:3]) if r.get('also') else '') for r in rs]
    out.append('')
open(D + 'roster.md', 'w', encoding='utf-8').write('\n'.join(out))
print(len(named), 'named', len(unnamed), 'unnamed'); print(cnt.most_common())
