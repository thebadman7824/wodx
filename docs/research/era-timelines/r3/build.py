"""Round 3 of the house-only events (Ben, 2026-11-12 02:23Z): at least 300 events per era, from real history,
tied to World of Darkness canon where possible, and tagged so other WoDX systems can use them.

Each era file <era>.txt holds one event per line:
    year[-month]|kind|lines|region|place|tags|title|text
kind:   F (future-darkness only) the branch's own mundane history, a house reading built on the approved Future Darkness timeline;
        H real history; W real history with a World of Darkness reading in the text (a house reading);
        N a named canon character placed in a real event (the book gives what happened, the year is WoDX's);
        M (prologues only) myth: a legend of one or more lines, its year an approximate house reading the characters cannot check.
year:   BCE years are negative with no year 0 (-753 is 753 BCE), as in the Encyclopaedia; a month follows a second dash (-44-3).
lines:  comma list of all mor vam wer mag wra cha hun mum kue dem
region: MO Moravia, EU Europe, ME Middle East, AS Asia, AF Africa, AM Americas
place:  the city, land or sea it happens in (used for the Encyclopaedia links and by place-aware systems)
tags:   comma list from TAGS below
Lines starting with # are comments. Writes events-2026-11-12r3.json (all events, with canon links)."""
import json, glob, os, re, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ERAS = [('living-gods', -10000, -801), ('classical', -800, 1196), ('dark-ages', 1197, 1346), ('long-night', 1347, 1449), ('renaissance', 1450, 1600), ('age-of-reason', 1601, 1836),
        ('victorian', 1837, 1913), ('great-war', 1914, 1918), ('mid-century', 1919, 1989), ('modern', 1990, 2009), ('future-darkness', 1990, 2099)]
LINES = {'all': 'All lines', 'mor': 'Mortals', 'vam': 'Vampire', 'wer': 'Werewolf', 'mag': 'Mage', 'wra': 'Wraith', 'cha': 'Changeling',
         'hun': 'Hunter', 'mum': 'Mummy', 'kue': 'Kindred of the East', 'dem': 'Demon'}
REGIONS = {'MO': 'Moravia', 'EU': 'Europe', 'ME': 'Middle East', 'AS': 'Asia', 'AF': 'Africa', 'AM': 'Americas'}
KINDS = {'H': 'history', 'W': 'tied', 'N': 'named', 'F': 'branch', 'M': 'myth'}
PROLOGUES = {'living-gods', 'classical'}
# The seven prologue eras (Ben picked seven real eras, 2026-11-12); ids match wodx-chronicle data/eras.json, names follow the naming desk.
PERIODS = [('mythic-age', 'Before the Flood', -10000, -3101), ('bronze-kings', 'The Age of Living Gods', -3100, -1178), ('iron-dawn', 'The Age of Burning Palaces', -1177, -801),
           ('greece-republic', 'The Age of Oracles', -800, -28), ('roman-empire', 'The Age of Silk and Eagles', -27, 476),
           ('migration-age', 'The Age of Fallen Thrones', 477, 907), ('premyslid-duchy', 'The Age of Gathering Darkness', 908, 1196)]
def period_of(y): return next((p for p, _, lo, hi in PERIODS if lo <= y <= hi), None)
YEAR = re.compile(r'^(-?\d+)(?:-(\d{1,2}))?$')
TAGS = {'war', 'battle', 'siege', 'massacre', 'plague', 'famine', 'disaster', 'quake', 'flood', 'fire', 'storm', 'faith', 'heresy', 'persecution',
        'trade', 'money', 'science', 'learning', 'art', 'crown', 'death', 'uprising', 'law', 'travel', 'crusade', 'exploration', 'industry',
        'migration', 'treaty', 'occult', 'crime', 'sport', 'media', 'empire', 'revolution', 'terror', 'weather', 'founding', 'building', 'sea'}
LINE_KEY = {'vampire', 'werewolf', 'mage', 'wraith', 'changeling', 'hunter', 'mummy', 'kuei', 'kuei-jin', 'demon'}
GENDERED = re.compile(r'\b(he|she|his|hers|him|himself|herself)\b', re.I)

def load_ency():
    out = []
    for f in glob.glob('../../../../modules/wodx-library/data/encyclopedia/*.json'):
        if f.endswith('index.json'): continue
        for e in json.load(open(f)):
            if e.get('kind') in ('place', 'faction', 'character', 'event', 'lore'):
                out.append((e['id'], e['title'], (e['title'] + ' ' + e.get('summary', '')).lower(), set(e.get('lines', [])), set(e.get('eras', []))))
    return out

def links(ev, ency):
    names = [p.strip().lower() for p in re.split(r'[,/]| and ', ev['place']) if len(p.strip()) > 3]
    want = {k for k, v in LINES.items() if v in ev['lines']}
    scored = []
    for eid, title, hay, lines, eras in ency:
        s = sum(2 for n in names if re.search(r'\b' + re.escape(n) + r'\b', hay))
        if not s: continue
        if ev['era'] in eras: s += 2
        if 'all' in want or any(l.startswith(w[:4]) for l in lines for w in want): s += 1
        scored.append((s, eid, title))
    scored.sort(key=lambda x: -x[0])
    return [{'id': e, 'title': t} for s, e, t in scored[:3] if s >= 3]

def main():
    ency = load_ency()
    out, seen, errs = [], set(), []
    for era, lo, hi in ERAS:
        f = era + '.txt'
        if not os.path.exists(f): continue
        n = 0
        for ln, raw in enumerate(open(f, encoding='utf-8'), 1):
            raw = raw.strip()
            if not raw or raw.startswith('#'): continue
            p = raw.split('|')
            where = f'{f}:{ln}'
            if len(p) != 8: errs.append(f'{where}: {len(p)} fields'); continue
            ym, kind, lines, region, place, tags, title, text = [x.strip() for x in p]
            ymm = YEAR.match(ym)
            if not ymm or ymm.group(1) in ('0', '-0'): errs.append(f'{where}: bad year {ym}'); continue
            y = int(ymm.group(1)); m = int(ymm.group(2)) if ymm.group(2) else None
            if m is not None and not 1 <= m <= 12: errs.append(f'{where}: bad month {ym}')
            if not lo <= y <= hi: errs.append(f'{where}: {y} outside {era}')
            if kind not in KINDS: errs.append(f'{where}: kind {kind}')
            if kind == 'M' and era not in PROLOGUES: errs.append(f'{where}: myth outside the prologues')
            if kind == 'F' and era != 'future-darkness': errs.append(f'{where}: branch history outside Future Darkness')
            ls = [x.strip() for x in lines.split(',')]
            if any(x not in LINES for x in ls): errs.append(f'{where}: lines {lines}')
            if region not in REGIONS: errs.append(f'{where}: region {region}')
            tg = [x.strip() for x in tags.split(',') if x.strip()]
            if any(x not in TAGS for x in tg): errs.append(f'{where}: tags {[x for x in tg if x not in TAGS]}')
            if '—' in text + title: errs.append(f'{where}: em-dash')
            key = (y, title.lower())
            if key in seen: errs.append(f'{where}: duplicate {title}')
            seen.add(key)
            n += 1
            ev = {'id': f'r3-{era}-{n:03d}', 'era': era, 'year': y, 'month': m, 'kind': KINDS.get(kind, kind), 'lines': [LINES.get(x, x) for x in ls],
                  'region': REGIONS.get(region, region), 'place': place, 'tags': tg, 'title': title, 'text': text,
                  'ref': ('Legend; the year is a house reading' if kind == 'M' else 'Future Darkness branch history, a house reading' if kind == 'F' else 'Real history') + ('' if kind in 'HFM' else '; the World of Darkness reading is a house rule' if kind == 'W' else '; character from the Encyclopaedia entry linked, year a house reading')}
            if era in PROLOGUES: ev['period'] = period_of(y)
            if era == 'future-darkness': ev['branch'] = 'future'
            elif y >= 1990: ev['branch'] = 'classic'
            ev['links'] = links(ev, ency)
            out.append(ev)
    json.dump(out, open('events-2026-11-12r3.json', 'w'), ensure_ascii=False, indent=0)
    by = {}
    for e in out: by[e['era']] = by.get(e['era'], 0) + 1
    print(len(out), by, 'linked', sum(1 for e in out if e['links']))
    if errs: print('\n'.join(errs[:40])); sys.exit(1)

if __name__ == '__main__':
    main()
