"""Daily deconfliction check for every approved timeline event (Ben, 2026-11-12 03:13Z: run each day at 02:00 UTC).

Sources, all approved:
  timeline-approved-2026-11-11.json   stage 1 book cards, already deconflicted (PR 586)
  desk-data-2026-11-12h2.json         round 1 house cards (round == 1)
  desk-data-2026-11-12h3.json         round 3 desk: r3 events plus kept round 2 cards
  r3/events-2026-11-12r3.json         round 3 events with place, tags and branch
  modules/wodx-chronicle/data/future-events.mjs (via node), the approved Future Darkness timeline

Checks:
  build     r3/build.py runs clean (era spans, kinds, tags, em-dashes, duplicates)
  branch    classic eras never carry branch future; the Future Darkness era never carries classic
  twin      two events with nearly the same title and place set more than one year apart
  dead      a person whose death is dated, named as acting in a later event of the same branch
  order     a 'falls', 'ends' or 'dies' event dated before the matching 'founded', 'begins' or 'born' event

A finding listed in daily/accepted.json (by its key) is known and ruled harmless; only new findings are reported.
Writes daily/<date>.md and prints the count of new findings. Exit 0 either way, so the report is always written."""
import datetime, json, os, re, subprocess, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
ROOT = '../../..'
STOP = set('the a an of and in at to on for by from with is as its his her their into over after before under first great new old last'.split())

ROMAN = re.compile(r"\b(?:[IVX]+|first|second|third|fourth|fifth|1[0-9]{3}|20[0-9]{2})\b", re.I)
LIFE = {'dies', 'died', 'killed', 'again', 'ends', 'end', 'begins', 'falls', 'listed', 'taken', 'retaken', 'murdered', 'founded', 'reborn', 'returned', 'born', 'crowned', 'holds', 'later', 'years', 'early', 'fall', 'rise'}
def entry(i):
    m = re.match(r'^(en-.+)-\d+$', i)
    return m.group(1) if m else i

def words(t): return {w for w in re.findall(r"[a-z]+", t.lower()) if w not in STOP and len(w) > 2}

def load():
    ev = []
    for era in json.load(open('timeline-approved-2026-11-11.json')):
        for i in era['items']:
            ev.append(dict(id=i['id'], set='stage1', era=era['id'], year=i['year'], title=i['title'], text=i['text'], place='', branch='classic'))
    for era in json.load(open('desk-data-2026-11-12h2.json')):
        for i in era['items']:
            if i['round'] == 1:
                ev.append(dict(id=i['id'], set='round1', era=era['id'], year=i['year'], title=i['title'], text=i['text'], place='', branch='classic'))
    for era in json.load(open('desk-data-2026-11-12h3.json')):
        for i in era['items']:
            if i['src'] == 'r2':
                ev.append(dict(id=i['id'], set='round2', era=era['id'], year=i['y'], title=i['t'], text=i['x'], place='', branch='classic'))
    for e in json.load(open('r3/events-2026-11-12r3.json')):
        ev.append(dict(id=e['id'], set='round3', era=e['era'], year=e['year'], title=e['title'], text=e['text'], place=e['place'],
                       branch=e.get('branch', 'classic')))
    try:
        out = subprocess.run(['node', '-e', "import('" + ROOT + "/modules/wodx-chronicle/data/future-events.mjs').then(m=>console.log(JSON.stringify(m.default.events)))"],
                             capture_output=True, text=True, check=True).stdout
        for e in json.loads(out):
            ev.append(dict(id=e['id'], set='wofd', era='future-darkness', year=e['year'], title=e['name'], text=e['summary'], place='', branch='future',
                           cascade=e.get('cascade')))
    except Exception as x:
        print('could not read future-events.mjs:', x)
    return ev

def check(ev):
    f = []
    r = subprocess.run([sys.executable, 'r3/build.py'], capture_output=True, text=True)
    if r.returncode: f.append(('build', 'build', 'r3/build.py reports errors:\n' + r.stdout[-2000:]))
    for e in ev:
        if e['set'] == 'round3' and e['era'] != 'future-darkness' and e['branch'] == 'future':
            f.append((f"branch:{e['id']}", 'branch', f"{e['id']} sits in a classic era but is marked future."))
        if e['set'] == 'round3' and e['era'] == 'future-darkness' and e['branch'] != 'future':
            f.append((f"branch:{e['id']}", 'branch', f"{e['id']} sits in Future Darkness but is not marked future."))
    by_branch = {}
    for e in ev: by_branch.setdefault(e['branch'], []).append(e)
    for br, L in by_branch.items():
        W = [(e, words(e['title'])) for e in L]
        for a in range(len(W)):
            ea, wa = W[a]
            if len(wa) < 2: continue
            for b in range(a + 1, len(W)):
                eb, wb = W[b]
                if abs(ea['year'] - eb['year']) <= 1 or len(wb) < 2: continue
                if ea.get('cascade') or eb.get('cascade') or 'wofd' in (ea['set'], eb['set']): continue
                if entry(ea['id']) == entry(eb['id']): continue
                if ROMAN.findall(ea['title']) != ROMAN.findall(eb['title']): continue
                if (wa ^ wb) & LIFE: continue
                j = len(wa & wb) / len(wa | wb)
                tj = len(words(ea['text']) & words(eb['text'])) / max(1, len(words(ea['text']) | words(eb['text'])))
                if j >= 0.75 and (tj >= 0.25 or ea['title'].lower() == eb['title'].lower()):
                    k = 'twin:' + '|'.join(sorted([ea['id'], eb['id']]))
                    f.append((k, 'twin', f"{ea['id']} ({ea['year']}, {ea['title']}) and {eb['id']} ({eb['year']}, {eb['title']}) look like the same event in different years."))
        deaths = {}
        for e in L:
            m = re.match(r"^(.+?) (dies|is killed|is executed|is beheaded|is hanged|is shot|is murdered|is burned)\b", e['text'])
            if m and len(m.group(1).split()) <= 4 and m.group(1)[0].isupper() and not m.group(1).startswith('The '):
                deaths.setdefault(m.group(1), e)
        for name, d in deaths.items():
            if len(name) < 6 or ROMAN.search(name) or len(name.split()) < 2: continue
            pat = re.compile(r'\b' + re.escape(name) + r'\b')
            for e in L:
                if d['year'] + 1 < e['year'] <= d['year'] + 80 and pat.search(e['text']) and not re.search(r"dead|death|died|tomb|grave|memory|remember|ghost|wraith|after|since|legacy|named for|statue|anniversar|centur|years|wake|Embrace|returns|body|reborn|mummy|curse|crimes|follows", e['text'], re.I):
                    k = f"dead:{d['id']}|{e['id']}"
                    f.append((k, 'dead', f"{name} dies in {d['year']} ({d['id']}) but appears in {e['id']} ({e['year']}): {e['text'][:140]}"))
    return f

def main():
    ev = load()
    acc = json.load(open('daily/accepted.json')) if os.path.exists('daily/accepted.json') else {}
    found = check(ev)
    new = [x for x in found if x[0] not in acc]
    today = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    lines = [f'# Timeline deconfliction check, {today}', '', f'{len(ev)} approved events checked ({", ".join(f"{s} {sum(1 for e in ev if e["set"] == s)}" for s in ["stage1", "round1", "round2", "round3", "wofd"])}).',
             f'{len(found)} findings, {len(found) - len(new)} already ruled harmless in daily/accepted.json, {len(new)} new.', '']
    for k, kind, msg in new: lines += [f'- **{kind}** `{k}`: {msg}']
    if not new: lines.append('No new clashes.')
    open(f'daily/{today}.md', 'w').write('\n'.join(lines) + '\n')
    if '--accept' in sys.argv:
        for k, kind, msg in new: acc[k] = msg
        json.dump(acc, open('daily/accepted.json', 'w'), indent=1, ensure_ascii=False)
    print(len(new), 'new findings of', len(found))

if __name__ == '__main__':
    main()
