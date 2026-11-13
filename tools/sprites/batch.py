# A sprite for every character, drawn in batches outside the game (B2586).
# The game writes a roster (Paperdoll: api.sprites.roster()), this draws each character on it from its look and worn
# things, and the game shows the sheets it finds.   Run:  python3 batch.py <roster.json> <out folder> [--all]
# For each character:  <id>.png (walk, 8 by 4), <id>-still.png, <id>.<move>.png (6 by 4) and one manifest.json for all.
# A character whose roster entry has not changed since its sheets were drawn is skipped unless --all is given.
import sys, os, re, json, hashlib, zlib, numpy as np
from PIL import Image
import wear as Wr, beast as B, critter as Cr, items as It
import proto_attacks as PA
S,SH=Wr.S,Wr.SH
VERSION=4
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
 (r'cudgel|club|baton|truncheon','club'),(r'axe\b|\bax\b','axe'),(r'spear|glaive|partisan','spear'),(r'staff','staff'),(r'bow\b','bow'),(r'mace','mace'),(r'hammer','warhammer'),(r'pistol','pistol'),(r'rifle|carbine','rifle'),(r'shotgun','shotgun'),(r'revolver','revolver')]
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
    for n in a.get('held') or []:
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
def draw(a):
    """{'' : walk sheet, move: sheet}, label of what was drawn, notes; None when nothing fits"""
    kind=a.get('kind') or 'person'
    if kind=='animal':
        k=animal(a.get('animal') or a.get('name') or '')
        if not k: return None,None,['no animal look for this name']
        if k in B.KINDS:
            walk=B.sheet(B.KINDS[k])
        else: walk=Cr.sheet(k)
        return {'':walk,'bite':PA.lunge(walk,'bite'),**PA.extras(walk,'die')},k,[]
    spec,held,worn,notes=person(a)
    sheets=PA.person_sheets(spec,acts_for(a,held)); sheets.update(PA.extras(sheets[''],a.get('death') if a.get('death') in('die','ash','fade') else 'die'))
    return sheets,'person',notes
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
        man['sprites'][i]={'name':a.get('name'),'key':k,'look':label,'acts':[m for m in sheets if m and m not in PA.GAITS],'gaits':[m for m in sheets if m in PA.GAITS],'notes':notes}; drawn+=1
        if notes: report.append((a.get('name'),notes))
    json.dump(man,open(mf,'w'),indent=1,sort_keys=True)
    return drawn,skipped,report
if __name__=='__main__':
    try: sys.stdout.reconfigure(encoding='utf-8',errors='replace')
    except Exception: pass
    d,s,rep=run(json.load(open(sys.argv[1],encoding='utf-8')),sys.argv[2],'--all' in sys.argv)
    print(f'{d} drawn, {s} unchanged, {len(rep)} with notes')
    for n,notes in rep: print('  ',n,'|','; '.join(notes))
