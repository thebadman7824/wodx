import json,glob,re,collections,sys
eras=json.load(open('modules/wodx-chronicle/data/eras.json'))['profiles']
def era(y):
    if y<1197: return None
    if 1860<=y<=1899: pass
    best=None
    for e in eras:
        if e.get('prologue') or e['id'] in ('wild-west','time-of-judgment','future-darkness','time-of-future-judgement'): continue
        if e['start']<=y<=e['end']: return e['id']
    # interludes
    if 1902<=y<=1913: return 'victorian'
    if 2004<=y<=2009: return 'modern'
    if y>=2010: return None
    return None
YR=re.compile(r'(?<![\d,.])(?<!p\. )(?<!pdf )(?<!pp\. )(1[0-9]{3}|20[0-2][0-9])(?:s)?(?!\d)(?!,\d)')
rows=[]
for f in sorted(glob.glob('modules/wodx-library/data/encyclopedia/*.json')):
    d=json.load(open(f))
    if not isinstance(d,list): continue
    for e in d:
        if not isinstance(e,dict): continue
        for i,c in enumerate(e.get('claims',[])):
            t=c.get('text','')
            ys=[int(m.group(1)) for m in YR.finditer(t)]
            ys=[y for y in ys if 1197<=y<=2009]
            if not ys: continue
            y=ys[0]
            rows.append({'eid':e['id'],'title':e['title'],'kind':e.get('kind'),'lines':e.get('lines',[]),'i':i,'year':y,'years':sorted(set(ys)),'era':era(y),'tier':c.get('tier'),'text':t,'refs':c.get('refs',[])})
json.dump(rows,open(sys.argv[1],'w'),ensure_ascii=False)
c=collections.Counter(r['era'] for r in rows); print(len(rows),c)
print(collections.Counter(r['tier'] for r in rows))
