# A sprite for every character, drawn in batches outside the game (B2586).
# The game writes a roster (Paperdoll: api.sprites.roster()), this draws each character on it from its look and worn
# things, and the game shows the sheets it finds.   Run:  python3 batch.py <roster.json> <out folder> [--all]
# For each character:  <id>.png (walk, 8 by 4), <id>-still.png, <id>.<move>.png (6 by 4) and one manifest.json for all.
# A character whose roster entry has not changed since its sheets were drawn is skipped unless --all is given.
import sys, os, re, json, hashlib, zlib, numpy as np
from PIL import Image
import wear as Wr, beast as B, critter as Cr, items as It
import proto_attacks as PA, monster as M
S,SH=Wr.S,Wr.SH
VERSION=10
POINTED=re.compile(r'spear|pike|lance|javelin|rapier|dagger|knife|stiletto|stake|fork|bayonet|kris|katar|halberd|glaive')
ANIMALS=[(r'gray alpha.s cub|wolf cub','wolf_cub'),(r'gray alpha','wolf_alpha'),(r'winter wolf','wolf_winter'),(r'wolf','wolf'),(r'hound','hound'),(r'dog, small','dog_small'),(r'dog, large|mastiff','mastiff'),(r'dog','dog_medium'),
 (r'bobcat|lynx','bobcat'),(r'leopard|panther','leopard'),(r'tiger','tiger'),(r'lion','lion'),(r'\bcat\b','cat'),(r'warhorse','warhorse'),(r'horse, large','horse_large'),(r'horse, small|pony','pony'),(r'horse','horse'),(r'mule|donkey','mule'),
 (r'camel','camel'),(r'bull|\box\b','bull'),(r'cow|cattle','cow'),(r'giant boar|old tusk','boar_giant'),(r'boar','boar'),(r'pig, small|piglet','pig_small'),(r'pig, large|sow','pig_large'),(r'pig|swine','pig'),(r'white hart','white_hart'),
 (r'stag','stag'),(r'deer|doe','deer'),(r'sheep|goat|ram\b','sheep'),(r'bear','bear'),(r'chimp|ape|monkey','chimpanzee'),(r'\brat\b|mouse','rat'),(r'hare|rabbit','hare'),(r'alligator|crocodile','alligator'),
 (r'bird, small|sparrow|songbird','bird_small'),(r'bird, large','bird_large'),(r'owl','owl'),(r'raven','raven'),(r'crow','crow'),(r'hawk|falcon|eagle','hawk'),(r'swan|goose','swan'),(r'\bbat\b','bat'),
 (r'constrictor|python','snake_constrictor'),(r'snake|viper|adder|serpent','snake_poisonous'),(r'spider','spider')]
# Things the Library does not list under these names (a character's own gear): drawn as the nearest thing it does list.
ARMOUR_LIKE=[(r'plate|harness|cuirass.*steel','Class Five'),(r'hauberk.*coif|coif.*hauberk|full mail','Class Four'),(r'mail|hauberk|haubergeon|byrnie|chain','Class Three'),
 (r'gambeson|padded|quilted|aketon|kirtle','Class Two'),(r'leather|jack\b|cuirass|hide|studded|brigandine','Class One'),(r'kevlar|flak|ballistic|vest','Class Two')]
HELM_LIKE=[(r'great helm|helm\b|bascinet|sallet',('helm','steel')),(r'helmet|nasal|kettle|cap of',('helmet','steel')),(r'coif',('coif','steel'))]
SHIELD_LIKE=[(r'kite|heater|tower','Standard Shield'),(r'buckler|target','Buckler'),(r'pavise|war shield','War Shield'),(r'shield','Small Shield')]
WEAPON_LIKE=[(r'longsword|great ?sword|claymore|zweih','bastard'),(r'sword|blade\b|spatha|sabre|saber','sword'),(r'dagger|misericorde|rondel|stiletto|dirk|scalpel','dagger'),(r'knife|seax','knife'),
 (r'torch|firebrand','torch'),(r'cudgel|club|baton|truncheon','club'),(r'sickle|billhook','sickle'),(r'axe\b|\bax\b','axe'),(r'spear|glaive|partisan','spear'),(r'staff','staff'),(r'bow\b','bow'),(r'mace','mace'),(r'hammer','warhammer'),(r'pistol','pistol'),(r'rifle|carbine','rifle'),(r'shotgun','shotgun'),(r'revolver','revolver')]
def like(name,table):
    n=name.lower()
    for pat,k in table:
        if re.search(pat,n): return k
# A character with nothing on is dressed plainly for the year, in colours of its own (the same character, the same clothes).
CLOTH=['#6a5a48','#7a766c','#5a4a36','#4a5a4a','#6a4a3a','#3c4a66','#5a5a52','#7a6a4a','#4a3460','#6a3a3a','#3a4a40','#8a7a5a']
def plain(a,year):
    h=zlib.crc32(str(a.get('id','')).encode()); c1=CLOTH[h%len(CLOTH)]; c2=CLOTH[(h>>8)%len(CLOTH)]; c3=['#3a2e26','#2a2422','#4a3a2a'][(h>>16)%3]
    if year is None or year<1500: return dict(top=(c1,'tunic'),legs=(c2,'breeches'),hose=c2,feet=(c3,'shoe'),belt='leather')
    if year<1800: return dict(top=(c1,'coat' if h&1 else 'shirt'),under='#d8d4c8',legs=(c2,'breeches'),hose='#cfc8b8',feet=(c3,'shoe'))
    if year<1950: return dict(top=(c1,'jacket' if h&1 else 'shirt'),under='#d8d4c8',legs=(c2,'trousers'),feet=(c3,'boot' if h&2 else 'shoe'))
    return dict(top=(c1,'jacket' if h&1 else 'shirt'),legs=(c2,'trousers'),feet=(c3,'shoe'))
def _cap(sheet):
    """the largest scale about the feet at which every frame of a sheet still fits inside its frame"""
    S_,SH_,F=96,112,103; k=9.0
    for r in range(sheet.shape[0]//SH_):
        for c in range(sheet.shape[1]//S_):
            ys,xs=np.nonzero(sheet[r*SH_:(r+1)*SH_,c*S_:(c+1)*S_,3])
            if not len(xs): continue
            if xs.min()<48: k=min(k,46/(48-xs.min()))
            if xs.max()>48: k=min(k,46/(xs.max()-48))
            if ys.min()<F: k=min(k,(F-2)/(F-ys.min()))
    return max(k,.5)
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
    spec=dict(skin=rgb(L.get('skin'),(206,170,140)),hair=(hexs(L.get('hair'),'#3a2a1c'),L.get('hairStyle') if L.get('hairStyle') in('short','long','bun','bald') else 'short'))
    if L.get('beard'): spec['beard']=hexs(L.get('hair'),'#3a2a1c')
    worn=0
    for n in a.get('worn') or []:
        dye=None
        if isinstance(n,(list,tuple)): n,dye=n[0],('#'+str(n[1]).lstrip('#') if len(n)>1 and re.fullmatch(r'#?[0-9a-fA-F]{6}',str(n[1])) else None)
        p=It.ARMOR.get(n); p=dict(p[0] if isinstance(p,tuple) else p) if p else It.clothing(n,dye)
        if p is None and n in It.SHIELD: p=dict(off=It.SHIELD[n])
        if p is None and like(n,SHIELD_LIKE): p=dict(off=It.SHIELD[like(n,SHIELD_LIKE)])
        if p is None and like(n,ARMOUR_LIKE): p=dict(It.ARMOR[like(n,ARMOUR_LIKE)])
        if p is None and like(n,HELM_LIKE): p=dict(hat=like(n,HELM_LIKE))
        elif p is not None and 'hat' not in p and like(n,HELM_LIKE) and not n in It.ARMOR: p=dict(p,hat=like(n,HELM_LIKE))
        if p is None: notes.append('not drawn: '+n); continue
        spec.update({k:v for k,v in p.items() if k not in('small','note')}); worn+=1
    held=None
    # of several things in hand the largest is drawn; a torch counts above a knife or a dagger
    RANK=lambda n:(0 if re.search(r'knife|dagger|misericorde|stiletto|dirk',n.lower()) else 1 if re.search(r'torch|firebrand',n.lower()) else 2)
    for n in sorted(a.get('held') or [],key=lambda n:-RANK(n)):
        if n in It.SHIELD or like(n,SHIELD_LIKE): spec['off']=It.SHIELD[n if n in It.SHIELD else like(n,SHIELD_LIKE)]; continue
        k=It.weapon(n) or like(n,WEAPON_LIKE)
        if k and k in Wr.W and not held: held=(n,k)
        elif not k: notes.append('not drawn: '+n)
    if not worn and not a.get('figure'): spec.update({k:v for k,v in plain(a,a.get('year')).items() if k not in spec or k in('top','legs','feet')})
    if held: spec['held']=held[1]   # carried in the walk too, not only when striking
    return spec,held,worn,notes
def acts_for(a,held):
    out=[]
    if held:
        n,k=held; carry=Wr.W[k][0]
        move='shot' if carry in('low','bow') or re.search(r'pistol|revolver|rifle|gun|bow|sling|musket|derringer',k) else 'thrust' if (carry=='pole' or POINTED.search(k)) else 'swing'
        out.append((move,k,None))
    out.append(('claw',None,None))   # the weapon's own move comes first: it is the one played when nothing says which
    if a.get('powers'): out.append(('cast',None,None))
    return out
# ---- true sizes (B2618) -------------------------------------------------------------------------------------------------
# Every creature is drawn on one scale with people: a person stands 1.75 m. One too big for a frame on that scale is drawn
# smaller and given a token of 2, 3 or more squares, so that on the map it is as much bigger than a person as it should be.
# The size is the longest of its length and height, in metres: from its kind's own drawing for the animals of the world,
# from the size the books give it, else from the size of its look below.
PERSON_M=1.75; ROOM=88
SIZE_WORD=dict(tiny=.4,small=1.0,man=1.8,large=3.0,huge=6.0,vast=12.0)   # the longest side, in metres, of a creature the books call so
LOOK_M=dict(dragon=12,dragon_mist=10,dragon_red=12,dragon_east=10,drake=5,gryphon=3,sphinx=3.5,manticore=3.5,chimera=3.5,peryton=2.2,
 mammoth=5,dinosaur=6,alligator=4,coatl=4,sea_serpent=12,worm_giant=10,roc=9,firebird=1.6,vulture=1.0,
 spider_giant=2.2,spider_squid=2.6,spider_crystal=1.6,spider_rust=1.6,mantis=2.0,insect=1.0,slug=1.2,
 giant=5,oni=2.8,imp=.6,el_bronze=3,el_stone=2.6,el_earth=2.6,el_metal=2.4,angel=2.0,belteroth=2.4,
 **{'tentacles:'+c:6 for c in ('water','violet','green','blood','shadow','oil')},**{'whale:'+c:12 for c in ('water','grey')},
 **{'fish:'+c:.8 for c in ('water','green','metal')},**{'shark:grey':4})
MUL=1.0
_PPM=None
def ppm():
    """pixels to the metre on a 1-square token: a plain person's height over 1.75 m"""
    global _PPM
    if _PPM is None:
        sh,_,_=_draw({'id':'scale','name':'scale','kind':'person','items':[]}); _PPM=_dims(sh[''])[1]/PERSON_M
    return _PPM
def _dims(walk):
    """the longest side length and the tallest height of the standing figure, over its front and side"""
    L=H=0
    for r in (2,3):
        ys,xs=np.nonzero(walk[r*112:(r+1)*112,0:96,3])
        if len(xs): L=max(L,xs.max()-xs.min()+1); H=max(H,ys.max()-ys.min()+1)
    return L,H
def true_m(a,label,sh):
    """how big this creature truly is, in metres, or None to leave it as drawn"""
    if not label or label.startswith('person') or re.search(r'wisp|swarm|geomid|plant|ribbon',label): return None
    key=label.split(':',1)[1] if ':' in label else label
    if label.startswith('book:'):
        w=M.book_size(a.get('animal') or a.get('name') or '')
        if w in SIZE_WORD: return PERSON_M if (w=='man' and label.startswith('book:person')) else SIZE_WORD[w]
    if key in LOOK_M: return LOOK_M[key]
    nm=a.get('animal') or a.get('name') or ''
    if re.search(r'\b(giant|great|huge|dire|monstrous)\b',nm,re.I) and not label.startswith(('book:','monster:')):   # a giant spider, a dire wolf
        return max(2.0,max(_dims(sh['']))/ppm()*3) if key not in B.KINDS else max(_dims(sh['']))*B.KINDS[key]['s']/B.fit(B.KINDS[key])['s']/ppm()*1.6
    if key in B.KINDS:   # a beast of the world: the size its kind was drawn for, before it was fitted to the frame
        k=B.KINDS[key]; f=B.fit(k); return max(_dims(sh[''])) *k['s']/f['s']/ppm()
    return None
def squares_for(m):
    """the token's size in squares, and the pixels the creature's longest side takes in its frame"""
    for n in (1,2,3,4,5,6,8):
        if m*ppm()/n<=ROOM: return n,m*ppm()/n
    return 8,ROOM
def draw(a):
    """the creature at its true size, with the token squares it needs (B2618)"""
    global MUL
    sh,label,notes=_draw1(a); m=true_m(a,label,sh) if sh else None
    if not m: return sh,label,notes,1
    n,want=squares_for(m); cur=max(_dims(sh['']))
    if abs(want/cur-1)<.05: return sh,label,notes,n
    try:
        MUL=want/cur; B.MUL=M.MUL=MUL
        for _ in range(4):
            sh2,_,_=_draw1(a); got=max(_dims(sh2['']))
            if got<=ROOM+4 and abs(got/want-1)<.08: break
            MUL*=want/max(1,got); B.MUL=M.MUL=MUL
        return sh2,label,notes,n
    finally: MUL=1.0; B.MUL=M.MUL=1.0
def _draw1(a):
    """draw() with the one-pixel gaps closed on every solid figure (not on glows, swarms and figures of lines, which are meant to show through)"""
    sh,label,notes=_draw(a)
    if sh and not re.search(r'wisp|swarm|geomid',label or ''): sh={k:PA.seal(v) for k,v in sh.items()}
    return sh,label,notes
def _draw(a):
    """{'' : walk sheet, move: sheet}, label of what was drawn, notes; None when nothing fits"""
    kind=a.get('kind') or 'person'
    if kind=='animal':
        name=a.get('animal') or a.get('name') or ''; m=M.monster(name); book=None
        if not m:   # a creature of the books (B2617), unless the name is just a plain animal's
            a0=animal(name); n0=M._norm(name)
            if not a0 or len(n0)>len(a0)+3: m=book=M.book_look(name)
        if m and m[0]=='person':   # a monster that goes on two legs is drawn as a figure, with its own marks and size
            p=M.PEOPLE[m[1]]; post=dict(p['post'])
            if book and book[2]!=1: post['scale']=round(post.get('scale',1)*book[2],2)
            sheets=PA.person_sheets(p['spec'],p['acts']+[('claw',None,None)]); sheets.update(PA.extras(sheets[''],'fade' if post.get('alpha',1)<1 else p['death']))
            if MUL!=1: post['scale']=post.get('scale',1)*MUL
            sc=post.get('scale',1)
            if sc>1:   # a big figure is drawn only as big as its frame holds, so no move cuts off its head or hands
                caps={k:_cap(v) for k,v in sheets.items()}; base=min(c for k,c in caps.items() if k not in ('jump','fly'))
                return {k:M.post(v,**dict(post,scale=round(min(sc,base,caps[k]),3))) for k,v in sheets.items()},('book:' if book else 'monster:')+m[1],[]
            return {k:M.post(v,**post) for k,v in sheets.items()},('book:' if book else 'monster:')+m[1],[]
        if m:
            walk=M.walk(m); soft=m[0]=='own' and not m[1].startswith(('plant','fish','shark','whale'))
            return {'':walk,'bite':PA.lunge(walk,'bite'),**PA.extras(walk,'fade' if soft or m[1]=='ribbon' else 'die')},('book:' if book else 'monster:')+m[1],[]
        k=animal(name)
        if not k: return None,None,['no animal look for this name']
        if k in B.KINDS:
            walk=B.sheet(B.KINDS[k])
        else: walk=Cr.sheet(dict(Cr.KINDS[k],big=Cr.KINDS[k].get('big',1)*MUL) if MUL!=1 else k)   # grown about its own feet
        return {'':walk,'bite':PA.lunge(walk,'bite'),**PA.extras(walk,'die')},k,[]
    spec,held,worn,notes=person(a)
    up,post=M.fae(a,Wr.fig(**spec)); spec.update(up); ghost=post.get('alpha',1)<1
    sheets=PA.person_sheets(spec,acts_for(a,held))
    if ghost: sheets['']=PA.way(sheets[''],'glide')
    sheets.update(PA.extras(sheets[''],a.get('death') if a.get('death') in('die','ash','fade') else 'die'))
    if post: sheets={k:M.post(v,**post) for k,v in sheets.items()}
    return sheets,'person'+(':fae' if up else ':ghost' if ghost else ''),notes
def key(a): return hashlib.sha1(json.dumps([VERSION,a],sort_keys=True).encode()).hexdigest()[:16]
def run(roster,out,every=False):
    os.makedirs(out,exist_ok=True); mf=os.path.join(out,'manifest.json')
    old=json.load(open(mf)) if os.path.exists(mf) else {}; man={'version':VERSION,'sprites':{}}; drawn=skipped=0; report=[]
    for a in roster.get('actors',[]):
        i=re.sub(r'[^A-Za-z0-9]','',str(a.get('id','')))
        if not i: continue
        k=key(a); was=(old.get('sprites') or {}).get(i)
        if was and was.get('key')==k and not every and os.path.exists(os.path.join(out,i+'.png')): man['sprites'][i]=was; skipped+=1; continue
        try: sheets,label,notes,sq=draw(a)
        except Exception as e: sheets,label,notes,sq=None,None,['could not be drawn: %s'%e],1
        if not sheets: report.append((a.get('name'),notes)); continue
        for act,sh in sheets.items():
            Image.fromarray(np.ascontiguousarray(sh),'RGBA').save(os.path.join(out,i+('.'+act if act else '')+'.png'),optimize=True)
        walk=sheets['']; Image.fromarray(np.ascontiguousarray(walk[2*SH:3*SH,0:S]),'RGBA').save(os.path.join(out,i+'-still.png'))
        man['sprites'][i]={'name':a.get('name'),'key':k,'look':label,'acts':[m for m in sheets if m and m not in PA.GAITS+PA.WAYS],'gaits':[m for m in sheets if m in PA.GAITS+PA.WAYS],'squares':sq,'notes':notes}; drawn+=1
        if notes: report.append((a.get('name'),notes))
    json.dump(man,open(mf,'w'),indent=1,sort_keys=True)
    return drawn,skipped,report
if __name__=='__main__':
    try: sys.stdout.reconfigure(encoding='utf-8',errors='replace')
    except Exception: pass
    d,s,rep=run(json.load(open(sys.argv[1],encoding='utf-8')),sys.argv[2],'--all' in sys.argv)
    print(f'{d} drawn, {s} unchanged, {len(rep)} with notes')
    for n,notes in rep: print('  ',n,'|','; '.join(notes))
