# A sprite for every character, drawn in batches outside the game (B2586).
# The game writes a roster (Paperdoll: api.sprites.roster()), this draws each character on it from its look and worn
# things, and the game shows the sheets it finds.   Run:  python3 batch.py <roster.json> <out folder> [--all]
# For each character:  <id>.png (walk, 8 by 4), <id>-still.png, <id>.<move>.png (6 by 4) and one manifest.json for all.
# A character whose roster entry has not changed since its sheets were drawn is skipped unless --all is given.
import sys, os, re, json, hashlib, numpy as np
from PIL import Image
import wear as Wr, beast as B, critter as Cr, items as It
import proto_attacks as PA
S,SH=Wr.S,Wr.SH
VERSION=1
POINTED=re.compile(r'spear|pike|lance|javelin|rapier|dagger|knife|stiletto|stake|fork|bayonet|kris|katar|halberd|glaive')
ANIMALS=[(r'gray alpha.s cub|wolf cub','wolf_cub'),(r'gray alpha','wolf_alpha'),(r'winter wolf','wolf_winter'),(r'wolf','wolf'),(r'hound','hound'),(r'dog, small','dog_small'),(r'dog, large|mastiff','mastiff'),(r'dog','dog_medium'),
 (r'bobcat|lynx','bobcat'),(r'leopard|panther','leopard'),(r'tiger','tiger'),(r'lion','lion'),(r'\bcat\b','cat'),(r'warhorse','warhorse'),(r'horse, large','horse_large'),(r'horse, small|pony','pony'),(r'horse','horse'),(r'mule|donkey','mule'),
 (r'camel','camel'),(r'bull|\box\b','bull'),(r'cow|cattle','cow'),(r'giant boar|old tusk','boar_giant'),(r'boar','boar'),(r'pig, small|piglet','pig_small'),(r'pig, large|sow','pig_large'),(r'pig|swine','pig'),(r'white hart','white_hart'),
 (r'stag','stag'),(r'deer|doe','deer'),(r'sheep|goat|ram\b','sheep'),(r'bear','bear'),(r'chimp|ape|monkey','chimpanzee'),(r'\brat\b|mouse','rat'),(r'hare|rabbit','hare'),(r'alligator|crocodile','alligator'),
 (r'bird, small|sparrow|songbird','bird_small'),(r'bird, large','bird_large'),(r'owl','owl'),(r'raven','raven'),(r'crow','crow'),(r'hawk|falcon|eagle','hawk'),(r'swan|goose','swan'),(r'\bbat\b','bat'),
 (r'constrictor|python','snake_constrictor'),(r'snake|viper|adder|serpent','snake_poisonous'),(r'spider','spider')]
def animal(name):
    n=name.lower()
    for pat,k in ANIMALS:
        if re.search(pat,n): return k
def rgb(v,dflt):
    if isinstance(v,str) and re.fullmatch(r'#?[0-9a-fA-F]{6}',v): v=v.lstrip('#'); return tuple(int(v[i:i+2],16) for i in (0,2,4))
    return dflt
def hexs(v,dflt): return '#%02x%02x%02x'%rgb(v,rgb(dflt,(60,44,30)))
def person(a):
    """the roster entry as a figure for wear.py, with the notes of what could not be drawn"""
    L=a.get('look') or {}; notes=[]
    spec=dict(skin=rgb(L.get('skin'),(206,170,140)),hair=(hexs(L.get('hair'),'#3a2a1c'),L.get('hairStyle') or 'short'))
    if L.get('beard'): spec['beard']=hexs(L.get('hair'),'#3a2a1c')
    worn=0
    for n in a.get('worn') or []:
        p=It.ARMOR.get(n); p=dict(p[0] if isinstance(p,tuple) else p) if p else It.clothing(n)
        if p is None and n in It.SHIELD: p=dict(off=It.SHIELD[n])
        if p is None: notes.append('not drawn: '+n); continue
        spec.update({k:v for k,v in p.items() if k not in('small','note')}); worn+=1
    held=None
    for n in a.get('held') or []:
        if n in It.SHIELD: spec['off']=It.SHIELD[n]; continue
        k=It.weapon(n)
        if k and k in Wr.W and not held: held=(n,k)
        elif not k: notes.append('not drawn: '+n)
    return spec,held,worn,notes
def acts_for(a,held):
    out=[('claw',None,None)]
    if held:
        n,k=held; carry=Wr.W[k][0]
        move='shot' if carry in('low','bow') or re.search(r'pistol|revolver|rifle|gun|bow|sling|musket|derringer',k) else 'thrust' if (carry=='pole' or POINTED.search(k)) else 'swing'
        out.append((move,k,None))
    if a.get('powers'): out.append(('cast',None,None))
    return out
def draw(a):
    """{'' : walk sheet, move: sheet}, label of what was drawn, notes; None when nothing fits"""
    kind=a.get('kind') or 'person'
    if kind=='animal':
        k=animal(a.get('animal') or a.get('name') or '')
        if not k: return None,None,['no animal look for this name']
        if k in B.KINDS:
            walk=B.sheet(B.KINDS[k]); return {'':walk,'bite':PA.lunge(walk,'bite')},k,[]
        walk=Cr.sheet(k); return {'':walk,'bite':PA.lunge(walk,'bite')},k,[]
    spec,held,worn,notes=person(a)
    return PA.person_sheets(spec,acts_for(a,held)),'person',notes
def key(a): return hashlib.sha1(json.dumps([VERSION,a],sort_keys=True).encode()).hexdigest()[:16]
def run(roster,out,every=False):
    os.makedirs(out,exist_ok=True); mf=os.path.join(out,'manifest.json')
    old=json.load(open(mf)) if os.path.exists(mf) else {}; man={'version':VERSION,'sprites':{}}; drawn=skipped=0; report=[]
    for a in roster.get('actors',[]):
        i=re.sub(r'[^A-Za-z0-9]','',str(a.get('id','')))
        if not i: continue
        k=key(a); was=(old.get('sprites') or {}).get(i)
        if was and was.get('key')==k and not every and os.path.exists(os.path.join(out,i+'.png')): man['sprites'][i]=was; skipped+=1; continue
        try: sheets,label,notes=draw(a)
        except Exception as e: sheets,label,notes=None,None,['could not be drawn: %s'%e]
        if not sheets: report.append((a.get('name'),notes)); continue
        for act,sh in sheets.items():
            Image.fromarray(np.ascontiguousarray(sh),'RGBA').save(os.path.join(out,i+('.'+act if act else '')+'.png'),optimize=True)
        walk=sheets['']; Image.fromarray(np.ascontiguousarray(walk[2*SH:3*SH,0:S]),'RGBA').save(os.path.join(out,i+'-still.png'))
        man['sprites'][i]={'name':a.get('name'),'key':k,'look':label,'acts':[m for m in sheets if m],'notes':notes}; drawn+=1
        if notes: report.append((a.get('name'),notes))
    json.dump(man,open(mf,'w'),indent=1,sort_keys=True)
    return drawn,skipped,report
if __name__=='__main__':
    d,s,rep=run(json.load(open(sys.argv[1],encoding='utf-8')),sys.argv[2],'--all' in sys.argv)
    print(f'{d} drawn, {s} unchanged, {len(rep)} with notes')
    for n,notes in rep: print('  ',n,'|','; '.join(notes))
