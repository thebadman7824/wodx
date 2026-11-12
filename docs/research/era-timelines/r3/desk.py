"""Builds the round 3 desk page: r3 events plus the unreviewed round 2 cards (round 2 history cards that repeat an r3 event are left out).
Set WOFD_EVENTS to a JSON dump of the approved non-cascade Future Darkness events to add that tab.
Writes desk-data-2026-11-12h3.json and, given a path, the page itself (head3.html + data + tail3.html)."""
import json, os, re, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
r3 = json.load(open('events-2026-11-12r3.json'))
old = json.load(open('../desk-data-2026-11-12h2.json'))
STOP = {'the','of','a','and','in','at','to','on','is','first','great','war','battle'}
def words(t): return {w for w in re.findall(r"[a-z]+", t.lower()) if w not in STOP and len(w) > 2}
eras, dropped = [], 0
for e in old:
    mine = [x for x in r3 if x['era'] == e['id']]
    items = [{'id': x['id'], 'y': x['year'], 'm': x['month'], 'k': x['kind'], 'ln': ', '.join(x['lines']), 'rg': x['region'], 'pl': x['place'],
              'tg': x['tags'], 't': x['title'], 'x': x['text'], 'lk': [l['title'] for l in x['links']], 'src': 'r3'} for x in mine]
    for i in e['items']:
        if i['round'] != 2: continue
        if i['kind'] == 'history' and any(abs(x['year'] - i['year']) <= 1 and len(words(x['title'] + ' ' + x['place']) & words(i['title'])) >= 1 for x in mine):
            dropped += 1; continue
        items.append({'id': i['id'], 'y': i['year'], 'm': None, 'k': {'history': 'history', 'named': 'named', 'house': 'tied'}[i['kind']], 'ln': i['line'],
                      'rg': i['region'], 'pl': '', 'tg': [], 't': i['title'], 'x': i['text'] + (' Fits: ' + i['fits'] if i.get('fits') else ''), 'lk': [], 'src': 'r2', 'ref': i['ref']})
    items.sort(key=lambda i: (i['y'], i['m'] or 13))
    appr = [{'y': i['year'], 't': i['title'], 'x': i['text'], 's': 'Approved, Moravia'} for i in e['items'] if i['round'] == 1] + \
           [{'y': b['year'], 't': b['title'], 'x': b['text'], 's': 'Book'} for b in e['book']]
    eras.append({'id': e['id'], 'name': e['name'], 'span': e['span'], 'items': items, 'appr': appr})
fe = os.environ.get('WOFD_EVENTS')
if fe:
    mine = [x for x in r3 if x['era'] == 'future-darkness']
    items = [{'id': x['id'], 'y': x['year'], 'm': x['month'], 'k': x['kind'], 'ln': ', '.join(x['lines']), 'rg': x['region'], 'pl': x['place'],
              'tg': x['tags'], 't': x['title'], 'x': x['text'], 'lk': [l['title'] for l in x['links']], 'src': 'r3'} for x in mine]
    appr = [{'y': e['year'], 't': e['name'], 'x': e['summary'], 's': 'Approved, Future Darkness'} for e in json.load(open(fe))]
    eras.append({'id': 'future-darkness', 'name': 'Future Darkness', 'span': '1990 to 2099, future branch only', 'items': items, 'appr': appr})
data = json.dumps(eras, ensure_ascii=False, separators=(',', ':'))
open('../desk-data-2026-11-12h3.json', 'w').write(data)
print({e['id']: len(e['items']) for e in eras}, 'round 2 repeats left out', dropped, 'bytes', len(data))
if len(sys.argv) > 1:
    open(sys.argv[1], 'w').write(open('../head3.html').read() + 'const ERAS=' + data + ';\n' + open('../tail3.html').read())
