# The figure menu's catalogue (B2587): every wardrobe piece the rig can draw, as one small layer each, so the menu can
# show a quick picture of a figure being put together.  The finished sheets are still drawn by batch.py.
# Writes <out>/catalogue.json and <out>/atlas.png (layers 96 by 112, COLS across).  Run:  python3 catalogue.py <out folder>
import sys, os, json, numpy as np
from PIL import Image
import wear as Wr, items as It
S,SH=Wr.S,Wr.SH; COLS=32
SLOTS=[('held','hand'),('off','offhand'),('top','body'),('legs','legs'),('feet','feet'),('over','over'),('hat','head'),('hairover','head'),('face','face'),('neck','neck'),('hands','hands'),
       ('belt','belt'),('susp','belt'),('scab','belt'),('glint','extra')]
GREY=(214,214,214)
def still(spec):
    d=Wr.fig(**spec); return np.array(Wr.front(d,0,False))
def layer(base,spec):
    im=still(spec); diff=(im!=base).any(axis=2); out=np.zeros_like(im); out[diff]=im[diff]; return out
def build():
    bare=dict(skin=GREY,hair=('#d6d6d6','bald'),**It.STRIP); base=still(bare); cells=[]; cat=dict(cols=COLS,w=S,h=SH,body=0,hair={},items=[])
    cells.append(base)
    for st in ('short','long','bun'):
        cat['hair'][st]=len(cells); cells.append(layer(base,dict(bare,hair=('#d6d6d6',st))))
    years={n:(fr,to) for n,kind,use,fr,to,src in json.load(open('wear.json'))}
    # gear carries era names, not years: a thing is offered from the first year of its earliest era on (made things stay in the world)
    START={'dark-ages':-3100,'long-night':-3100,'renaissance':1450,'victorian':1837,'wild-west':1860,'great-war':1914,'modern':1990,'time-of-judgment':1990,'future-darkness':2010}
    for g in json.load(open(It.REPO+'gear.json'))['items']:
        er=[START[e] for e in g['flags']['wodx-library'].get('eras',[]) if e in START]
        if er and g['name'] not in years: years[g['name']]=(min(er),None)
    for table,name,src,group,p in It.collect():
        if not p: continue
        slot=next((s for k,s in SLOTS if k in p),None)
        if not slot: continue
        spec=dict(bare); spec.update({k:v for k,v in p.items() if k not in('small','note')})
        try: im=layer(base,spec)
        except Exception as e: print('skipped',name,e); continue
        if not im[...,3].any(): continue
        ys,xs=np.nonzero(im[...,3]); cx=int(min(max((xs.min()+xs.max())//2,24),S-24)); cy=int(min(max((ys.min()+ys.max())//2,24),SH-24))
        e=dict(n=name,s=slot,g=group,i=len(cells),c=[cx,cy]); fr,to=years.get(name,(None,None))
        if fr is not None: e['fr']=fr; e['to']=to
        cat['items'].append(e); cells.append(im)
    rows=-(-len(cells)//COLS); at=np.zeros((rows*SH,COLS*S,4),np.uint8)
    for i,c in enumerate(cells): at[(i//COLS)*SH:(i//COLS+1)*SH,(i%COLS)*S:(i%COLS+1)*S]=c
    return cat,at
if __name__=='__main__':
    out=sys.argv[1]; os.makedirs(out,exist_ok=True); cat,at=build()
    Image.fromarray(at,'RGBA').save(os.path.join(out,'atlas.png'),optimize=True)
    json.dump(cat,open(os.path.join(out,'catalogue.json'),'w'),separators=(',',':'),sort_keys=True)
    import collections; print(len(cat['items']),'pieces',dict(collections.Counter(e['s'] for e in cat['items'])),at.shape)
