"""Dates for the Encyclopaedia's events, read from the OCR'd books around each entry's cited pages (2026-11-10).
id: (from, to, label, book, pdf, approx). BCE years negative. pdf None: take the page from the claim that gives the date.
Run from the repo root: python3 tools/encyclopedia/event-dates.py   (idempotent: it rewrites each entry's date)."""
import json, glob, re, statistics
# id: (from, to, label, book, pdf, approx)
D = {
'au-russia-silence':(1990,None,'1990','anarchs',18,0),
'berbn-wall':(1989,None,'9 November 1989','berbn',22,0),
'bh-two-hands':(-800,-650,'800 to 650 BCE','blackhand',21,0),
'the-shattering':(1300,1399,'from the 14th century','c20',37,1),
'the-interregnum':(1300,1969,'14th century to 1969','c20',37,1),
'the-resurgence':(1969,None,'20 July 1969','c20',109,0),
'night-of-iron-knives':(1970,None,'1 May 1970','cfool',35,0),
'accordance-war':(1970,None,'from May 1970; Battle of Manhattan December 1973','cfool',35,0),
'ckpooka-accordance-war':(1970,None,'from May 1970','cfool',35,0),
'evanescence':(2001,None,'11 September 2001','c20',29,0),
'cba-breaking':(1998,None,'late 1998','cbassamite',43,0),
'cbgv-promise-of-1528':(1528,None,'1528','cbgiovanni',28,0),
'cbn2-devils-night':(1871,None,'1871','cbn2',20,0),
'cbn2-night-of-rage':(1966,None,'1966','cbn2',22,0),
'cbn2-lupine-war':(1993,None,'1993','cbn2',26,0),
'cbtz-kupalas-eve':(1241,None,'after the Mongol invasion of 1241','cbtzimisce',22,1),
'cbv-trade':(1500,1599,'16th century','cbventrue',25,1),
'daf-oath-truce':(1130,1230,'AD 1130 to 1230','dafae',20,0),
'daf-battle-of-ice':(1,100,'1st century AD','dafae',48,1),
'daf-battle-of-stone':(300,399,'4th century AD','dafae',25,1),
'daibn-visigoth-wars':(585,None,'AD 585 (fall of Yzebel)','daibn',22,0),
'daibn-taifa-intrigues':(1090,1093,'1090 to 1093','daibn',26,0),
'dajbn-weeks-of-blood':(1099,None,'1099','dajbn',39,0),
'dajbn-cainite-influx':(1099,None,'after 1099','dajbn',39,1),
'dam-mistridge':(1210,None,'winter 1210','damage',61,0),
'dam-house-coalition':(876,None,'876','damage',59,0),
'encv-iron-hag':(1990,None,'1990','cb',26,0),
'encv-chicago-war':(1908,1913,'1908 to 1913','encv',48,0),
'gw-twilight-era':(1918,1929,'11 November 1918 to 1929','greatwar',15,0),
'gw-fourth-maelstrom':(1916,None,'from 1916 (the Somme)','greatwar',16,0),
'gtanarch-convention-of-thorns':(1493,None,'23 October 1493','gtanarch',19,0),
'gtanarch-free-state-fall':(1944,1998,'1944 to 1998','gtanarch',24,0),
'anarch-revolt':(1381,1493,'1381 to 1493','gtanarch',20,0),
'kotec-treaty-quincunx':(1304,None,'1304','kotec',8,0),
'labn-zoot-suit-riots':(1943,None,'June 1943','labn',25,0),
'labn-watts-siege':(1965,None,'1965','labn',30,0),
'lostp-iran':(1979,1980,'1979 to 1980','lostp',19,0),
'mrlp-reprieve':(1979,None,'January 1979','mrlp',19,0),
'lostp-devil-kings':(610,None,'610','lostp',62,0),
'm2bow-mus':(1995,None,'August 1995','m2bow',144,0),
'm2cf-great-quake':(1985,None,'19 September 1985','m2cf',22,0),
'm2fp-founding-timeline':(1210,1457,'1210 to 1457','m2fp',8,0),
'm2hl-czar-vargo':(1914,None,'24 July 1914','m2hl',21,0),
'm2hor-founding':(1450,1456,'1450 to 1456','m2hor',42,0),
'm2hota-founding':(1885,None,'24 November 1885','m2hota',23,0),
'm2stc-medieval-schisms':(1003,1335,'1003 to 1335','m2stc',10,0),
'm2stc-dust-witch':(1345,1350,'1345 to 1350','m2stc',11,0),
'm2stc-founding-wars':(1448,1453,'1448 to 1453','m2stc',12,0),
'mrcc-templar-fall':(1307,1314,'1307 to 1314','mrcc',25,0),
'mrdote-yellow-springs':(-221,None,'221 BCE','mrdote',44,0),
'mrdote-silk-accord':(-190,None,'190 BCE','mrdote',44,0),
'mreu-himalayan-war':(-950,-790,'950 to 790 BCE','mreu',21,0),
'mrva-new-madrid':(1810,1811,'1810 to 1811','mrva',15,0),
'mrve-burning-times':(1200,1499,'13th to 15th centuries, worst from 1435','mrve',25,1),
'mrvoid-anomaly':(1999,2000,'late June 1999 to 2000','mrvoid',59,0),
'nobn-bayou-treaty':(1755,None,'after 1755','nobn',20,1),
'nybn-sect-war':(1999,None,'1999','nybn',31,0),
'raam-amazon-war':(1991,None,'from 1991','raam',20,0),
'scinf-witch-craze':(1452,1686,'from 1452, worst after 1486','scinf',26,1),
'sfbn-gold-rush':(1849,None,'1849','sfbn',22,0),
'sfbn-great-quake':(1906,None,'18 April 1906','sfbn',26,0),
'tbgn-great-pipings':(1540,None,'1540 (Barcelona)','tbgn',24,0),
'tbwen-storm-eater':(1889,None,'1889','tbwen',28,0),
'vav-gothic-victorian-age':(1880,1897,'1880 to 1897','vav',16,0),
'vav-dracula':(1897,None,'1897','vav',16,0),
'sd-second-war-of-rage':(1492,None,'from 1492','w20sd',110,0),
'w20wwx-storm-eater':(1830,1839,'1830s','w20wwx',9,1),
'wawwcore-storm-eater-birth':(1830,1839,'1830s','wawwcore',65,1),
'wawor-shadow-curtain':(1990,1993,'early 1990s','wawor',72,1),
'wawor-death-of-baba-yaga':(1998,None,'1998','wawor',77,0),
'whier-anacreon-revolts':(1931,None,'from 1 February 1931; most Necropoli drift away after Charon is lost in 1945','whier',44,0),
'wda-eclipse-1230':(1230,None,'May 1230','wtda',19,0),
'cbs-egypt':(-1799,-1600,'18th century BC, then 200 years of Hyksos rule','cbsetite',None,1),
'daf-war-of-seasons':(300,399,'ended in the 300s AD','dafae',25,1),
'dapillars-orvieto':(1194,None,'1194','dapillars',None,0),
'datbn-tremere-tzimisce-war':(1000,None,'began around 1000','datbn',None,1),
'dbbf-hong-kong-envoys':(1997,None,'ended 1997','dbbf',None,0),
'm2hor-council-seats':(1560,1946,'1560s to 1946','m2hor',None,0),
'm2stc-modern-history':(1756,1880,'1756 to about 1880','m2stc',13,0),
'mrcc-schism-paladins':(800,899,'800s','mrcc',None,1),
'ncns4-moncada-madrid':(1999,None,'September 1999','ncns4',None,0),
'tbgw-cyber-dogs':(1999,None,'end of 1999','tbgw',None,0),
'vav-golden-dawn':(1880,None,'from 1880','vav',None,0),
'wofd-masquerade-frays':(2024,2025,'2024 or 2025 at the latest','wofd',None,0),
}

DIR = 'modules/wodx-library/data/encyclopedia/'
off = {}
for f in glob.glob(DIR + '*.json'):
    if f.endswith('index.json'): continue
    for e in json.load(open(f)):
        for c in e['claims']:
            for r in c['refs']:
                if r.get('pdf'): off.setdefault(r['book'], []).append(r['page'] - r['pdf'])
def ref(e, frm, label, book, pdf):
    yrs = re.findall(r'\d{3,4}', label) or [str(abs(frm))]
    for c in e['claims']:
        if any(y in c['text'] for y in yrs):
            for r in c['refs']:
                if r['book'] == book and (pdf is None or r.get('pdf') == pdf): return dict(r)
    for c in e['claims']:
        for r in c['refs']:
            if r['book'] == book and (pdf is None or r.get('pdf') == pdf): return dict(r)
    if pdf is None: raise SystemExit(f'{e["id"]}: no ref for {book}')
    page = pdf + int(statistics.median(off.get(book, [0])))
    return {'book': book, 'page': page, 'pdf': pdf}
done = set()
for f in sorted(glob.glob(DIR + '*.json')):
    if f.endswith('index.json'): continue
    data = json.load(open(f)); ch = False
    for e in data:
        if e['id'] not in D: continue
        frm, to, label, book, pdf, ap = D[e['id']]
        d = {'from': frm}
        if to is not None: d['to'] = to
        d['label'] = label
        if ap: d['approx'] = True
        d['refs'] = [ref(e, frm, label, book, pdf)]
        new = {}
        for k, v in e.items():
            if k == 'date': continue
            new[k] = v
            if k == 'summary': new['date'] = d
        e.clear(); e.update(new); ch = True; done.add(e['id'])
    if ch: open(f, 'w').write(json.dumps(data, ensure_ascii=False, indent=1))
miss = set(D) - done
print(len(done), 'dated', ('missing ' + ', '.join(sorted(miss))) if miss else '')
