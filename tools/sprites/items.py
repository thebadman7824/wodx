# Every clothing, armor and weapon item in the item tables, matched to a wearable or hand-held piece of wear.py.
import json,re,sys
import wear as Wr
REPO='/home/user/wodx/modules/wodx-library/data/'
PAL=[('flame-resistant|fire','#c89a3a'),('hi.?vis|high-visibility','#d4dc3c'),('leather|cowboy boots|moccasin','#6a4630'),('sheepskin','#d0c4a8'),('hide|fur','#8a6c4c'),('woollen|wool','#8c8474'),('linen|cotton','#d6cdb8'),
 ('velvet','#5c2a4c'),('silk','#a8485e'),('black|ninja|grim|plague|abaya|cassock|tuxedo|balaclava|niqab|eboshi|wetsuit|diving','#26262c'),('white|wedding|ghost|kittel|thawb|medical|wimple|tallit|karate|judo|keikogi|tabi|chef','#e6e2d6'),
 ('straw|grass|sombrero','#c8b070'),('jean|denim','#4a6288'),('army|military|combat|tactical|cargo','#5a6044'),('rubber|rain','#c8b838'),('ski|puffer|windbreaker|swim|racing|lycra','#3a6a9a'),('golden|gold','#ceaa4a'),
 ('clown','#d84460'),('skeleton','#2a2a30'),('mummy','#d6ceb4'),('devil','#a82e2a'),('wizard','#3a3c86'),('police','#2a3252'),('cheerleader|sports|basketball','#b83a3c'),('evening','#3c1c4c'),('steampunk','#5c4230'),
 ('heraldic','#8a2c2c'),('monk','#4c3c2e'),('antarvasa|uttarasanga|kasaya|samghati','#c8782c'),('kimono|cheongsam','#8a3a50'),('yukata','#4a6a8a'),('haori|hakama|zubon|kariginu','#34384e'),('keffiyeh','#e0dcd0'),
 ('hijab|headscarf','#5a7a8a'),('turban','#d8d0c0'),('kippah','#2a2e4a'),('beret','#7a2a2a'),('fedora|bowler|top hat|tricorne','#34302c'),('cowboy hat','#a08660'),('baseball','#8a3030'),('hard hat','#d8b83a'),('riot|flight','#3a4250'),
 ('trench|duster|greatcoat','#6a5c48'),('frock|peacoat|blazer|business','#2c2e3a'),('work|coverall|overall','#4a5a78'),('plastic','#b8c8d0'),('beekeeping','#e0dcc8'),('bathrobe','#b8a8c0'),('hooded sweatshirt|hoodie','#5a5a66'),
 ('sweater|turtleneck','#7a4a3a'),('band t-shirt','#2a2a2e'),('jersey','#b83a3c'),('striped','#8a8a92'),('checkered','#c8c8c8'),('kilt','#3a5a3a'),('smart-fabric|cooling','#5a8a9a'),('sneakers|cleats','#d8d8d8'),('heels','#a82e3a'),
 ('socks|stockings|sock','#d0ccc4'),('undershirt|camisole|briefs|boxer|panties|shorts|bra|underwear|chestwrap|loincloth|belly|garter','#cfc8b8')]
def tint(n,default):
    for p,c in PAL:
        if re.search(p,n): return c
    return default
STRIP=dict(top=('#000000','bare'),legs=('#cfc8b8','briefs'))
# (pattern, pieces). '@' is the item's own colour; a 2nd tuple member is the colour used when no word in the name gives one.
RULES=[
 (r'false teeth|glass eye|hearing aid|earbuds|earpiece|contact lenses|mouthpiece|ear trumpet',('#000000',dict(small=1))),
 (r'\bring\b',('gold',dict(small=1))),(r'wristwatch|luxury watch',('silver',dict(hands=('cuff','@'),small=1))),(r'pocket watch',('gold',dict(neck=('chain','@'),small=1))),
 (r'brooch|body camera|saint.s medal',('gold',dict(glint='@',small=1))),(r'necklace|pearls',('#d8c8a0',dict(neck=('chain','@')))),(r'amulet|cross on a cord|scapular|hag stone|eye bead|gris-gris',('#8a7a5a',dict(neck=('cord','@'),small=1))),
 (r'girdle',('gold',dict(belt='@'))),(r'sword belt',('leather',dict(belt='@',scab='@'))),(r'suspenders',('#3a3632',dict(susp='@'))),(r'belly band|belly wrap|garter belt',('#cfc8b8',dict(belt='@',**STRIP))),(r'\bbelt\b',('leather',dict(belt='@'))),
 (r'wig',('#d8d4c8',dict(hairover=('@','long')))),(r'clown nose',('#d83a3a',dict(face=('nose','@')))),(r'crown',('gold',dict(hat=('crown','@')))),(r'chaplet',('#5a8a4a',dict(hat=('crown','@')))),
 (r'tefillin',('#1e1e22',dict(hat=('band','@'),hands=('cuff','@')))),(r'earmuffs|headset',('#3a3a40',dict(hat=('band','@')))),
 (r'prayer shawl|tallit gadol',('#e6e2d6',dict(over=('cape','@',56),tex=[('@','hoop')]))),(r'tallit katan',('#e6e2d6',dict(top=('@','vest'),under='#b8b0a0'))),
 (r'sunglasses',('#1a1a1e',dict(face=('shades','@')))),(r'spectacles|eyeglasses|smart glasses',('#c8d0d8',dict(face=('glasses','@')))),(r'monocle',('#c8d0d8',dict(face=('monocle','@')))),(r'eyepatch',('#2a221e',dict(face=('patch','@')))),
 (r'goggles',('#3a3a3e',dict(face=('goggles','@')))),(r'gas mask',('#3a4238',dict(face=('gasmask','@')))),(r'filter mask',('#c8ccd0',dict(face=('mask','@')))),(r'^a bandana',('#8a2e2e',dict(face=('mask','@')))),
 (r'wedding veil|face veil',('#e6e2d6',dict(face=('veil','@')))),(r'beekeeping hood',('#e0dcc8',dict(hat=('brim','@','@',7),face=('veil','@')))),
 (r'niqab',('#26262c',dict(hat=('veilall','@')))),(r'balaclava|ninja hood',('#26262c',dict(hat=('veilall','@',1)))),
 (r'hijab|headscarf|keffiyeh|wimple',('#5a7a8a',dict(hat=('scarf','@')))),(r'hood with|rain hood|flame-resistant hood|wetsuit hood',('#6a4a36',dict(hat=('hood','@')))),
 (r'riot helmet|flight helmet',('#3a4250',dict(hat=('helmet','@'),face=('visor','#2a3038')))),(r'hard hat',('#d8b83a',dict(hat=('helmet','@')))),
 (r'cowboy hat',('#a08660',dict(hat=('brim','@','@',8.5)))),(r'sombrero',('#c8b070',dict(hat=('brim','@','@',11)))),(r'fedora',('#34302c',dict(hat=('brim','@','@',6.2)))),(r'top hat',('#26242a',dict(hat=('tall','@')))),
 (r'bowler',('#2c2a2a',dict(hat=('bowler','@')))),(r'tricorne',('#2c2826',dict(hat=('tricorne','@')))),(r'baseball cap',('#8a3030',dict(hat=('cap','@')))),(r'flat cap',('#5c4c3c',dict(hat=('flatcap','@')))),
 (r'beret',('#7a2a2a',dict(hat=('beret','@')))),(r'toque',('#e6e2d6',dict(hat=('toque','@')))),(r'kippah',('#2a2e4a',dict(hat=('kippah','@')))),(r'turban',('#d8d0c0',dict(hat=('turban','@')))),(r'eboshi',('#1e1e22',dict(hat=('eboshi','@')))),
 (r'head bandana',('#8a2e2e',dict(hat=('skull','@')))),
 (r'scarf',('#8a4a3a',dict(neck=('scarf','@')))),(r'ruff',('#e8e6de',dict(neck=('ruff','@')))),(r'lace collar',('#e8e6de',dict(neck=('collar','@')))),(r'cravat',('#a8485e',dict(neck=('cravat','@')))),(r'bow tie',('#1e1e22',dict(neck=('bow','@')))),
 (r'\btie\b|necktie',('#7a2a2e',dict(neck=('tie','@'),top=('#d8d4c8','shirt')))),
 (r'boxing gloves',('#a82e2e',dict(hands=('boxing','@')))),(r'mittens',('#8c8474',dict(hands=('mitt','@')))),(r'extra long white gloves|arm warmers',('#e6e2d6',dict(hands=('long','@')))),(r'gauntlets',('#c89a3a',dict(hands=('long','@')))),
 (r'hand wraps',('#e0dccc',dict(hands=('wrap','@')))),(r'leather cuffs',('leather',dict(hands=('cuff','@')))),(r'gloves|glove liners',('#5a5248',dict(hands=('glove','@')))),
 (r'rollerblades|rollerskates',('#3a6a9a',dict(feet=('@','skate')))),(r'swim fins',('#2a4a6a',dict(feet=('@','fin')))),(r'clogs|geta',('wood',dict(feet=('@','clog')))),(r'heels',('#a82e3a',dict(feet=('@','heel')))),
 (r'sandals|flip-flops',('leather',dict(feet=('@','sandal')))),(r'foot rags|foot wraps|puttees|gaiters|leg warmers',('#b8ac94',dict(feet=('@','wrap')))),(r'cowboy boots|jika-tabi|spurs',('leather',dict(feet=('@','boot')))),
 (r'shoes|sneakers|toecaps|cleats|moccasins|slippers|espadrilles|socks|tabi',('#5a4030',dict(feet=('@','shoe')))),
 (r'stockings|tights|leggings|long underwear|woollen hose|wetsuit pants',('#6a665e',dict(legs=('@','tights'),**{'top':('#000000','bare')}))),
 (r'boxer shorts|basketball shorts|cargo shorts|short shorts|^a pair of shorts|compression shorts',('#6a6a5a',dict(legs=('@','shorts')))),(r'briefs|panties|boy shorts|bikini bottoms',('#cfc8b8',dict(top=('#000000','bare'),legs=('@','briefs')))),
 (r'police breeches|breeches',('#5c4c3c',dict(legs=('@','breeches'),hose='#d0c8b8'))),(r'hakama|zubon',('#34384e',dict(legs=('@','wide')))),(r'cheerleader skirt',('#b83a3c',dict(legs=('@','mini')))),(r'utility kilt',('#3a3a3a',dict(legs=('@','kilt')))),
 (r'kilt',('#3a5a3a',dict(legs=('@','kilt'),tex=[('@','plaid')]))),(r'grass skirt',('#c8b070',dict(legs=('@','skirt'),tex=[('@','stripe')],top=('#000000','bare')))),(r'long skirt|crinoline',('#6a4a5a',dict(legs=('@','skirtlong')))),
 (r'skirt',('#5a5a6a',dict(legs=('@','skirt')))),(r'loincloth',('#cfc8b8',dict(legs=('@','loin'),top=('#000000','bare')))),(r'antarvasa',('#c8782c',dict(legs=('@','skirtlong'),top=('#000000','bare')))),
 (r'fishing waders',('#4a5a3a',dict(legs=('@','trousers'),feet=('@','boot'),susp='@'))),(r'ski bib|denim overalls',('#4a6288',dict(legs=('@','trousers'),over=('apron','@',54),susp='@'))),
 (r'checkered pants',('#c8c8c8',dict(legs=('@','trousers'),tex=[('@','check')]))),(r'striped pants',('#8a8a92',dict(legs=('@','trousers'),tex=[('@','stripe')]))),(r'jeans|pants|trousers',('#5a564e',dict(legs=('@','trousers')))),
 (r'sports bra|chestwrap',('#cfc8b8',dict(top=('@','band'),legs=('#cfc8b8','briefs')))),(r'camisole|undershirt',('#cfc8b8',dict(top=('@','shirt'),sleeve='none',legs=('#cfc8b8','briefs')))),
 (r'swimsuit|leotard',('#3a6a9a',dict(top=('@','shirt'),sleeve='none',legs=('@','briefs')))),(r'lycra bodysuit|^a wetsuit$',('#26262c',dict(top=('@','shirt'),legs=('@','tights')))),
 (r'fursuit',('#b07a3a',dict(top=('@','shirt'),legs=('@','trousers'),feet=('@','shoe'),hands=('mitt','@'),hat=('hood','@')))),(r'devil onesie',('#a82e2a',dict(top=('@','shirt'),legs=('@','trousers'),hat=('hood','@')))),
 (r'jumpsuit|coveralls',('#4a5a78',dict(top=('@','shirt'),legs=('@','trousers')))),
 (r'cloak',('#5a5448',dict(over=('cloak','@')))),(r'heraldic cape|straw cape|sheepskin',('#8a2c2c',dict(over=('cape','@')))),(r'poncho',('#8a5a3a',dict(over=('poncho','@')))),
 (r'short apron',('#d6cdb8',dict(over=('apron','@',60)))),(r'apron',('#d6cdb8',dict(over=('apron','@')))),
 (r'monk.s habit|grim reaper',('#4c3c2e',dict(top=('@','robe'),legs=('@','robe'),neck=('roll','@'),belt='cord'))),(r'kimono|yukata|kariginu',('#8a3a50',dict(top=('@','kimono'),legs=('@','robe'),belt='#d0c090'))),
 (r'uttarasanga|kasaya|samghati',('#c8782c',dict(top=('@','wrap'),legs=('@','skirtlong')))),
 (r'cassock|bathrobe|kittel|robe|thawb|abaya',('#4a4a56',dict(top=('@','robe'),legs=('@','robe')))),(r'long dress|evening gown|wedding dress',('#6a2a3a',dict(top=('@','gown'),legs=('@','robe')))),
 (r'cheerleader dress|short dress|sundress|cheongsam|mummy dress|ninja dress|linen shift',('#8a5a6a',dict(top=('@','dress'),legs=('@','mini'),sleeve='short'))),
 (r'tuxedo',('#1e1e22',dict(top=('@','suit'),under='#e8e6de',legs=('@','trousers'),neck=('bow','#1e1e22')))),(r'business suit',('#2c2e3a',dict(top=('@','suit'),under='#e8e6de',legs=('@','trousers'),neck=('tie','#7a2a2e')))),
 (r'blazer',('#2c2e3a',dict(top=('@','suit'),under='#d8d4c8'))),(r'greatcoat|trench ?coat|duster|long coat',('#6a5c48',dict(top=('@','longcoat'),under='#b8b0a0'))),(r'frock coat|peacoat',('#2c2e3a',dict(top=('@','coat'),under='#d8d4c8'))),
 (r'puffer',('#3a6a9a',dict(top=('@','jacket'),tex=[('@','hoop')]))),(r'judo gi|karate gi|keikogi',('#e6e2d6',dict(top=('@','jacket'),legs=('@','trousers'),belt='#26262c'))),
 (r'haori|leather jacket|windbreaker|smart-fabric jacket|velvet doublet',('#3a3632',dict(top=('@','jacket'),under='#b8b0a0'))),
 (r'surcoat',('#a8485e',dict(top=('@','tunic'),sleeve='none'))),(r'tunic',('#8c8474',dict(top=('@','tunic')))),
 (r'jerkin|waistcoat|high-visibility vest|cooling vest|corset',('#6a4630',dict(top=('@','vest'),under='#d6cdb8'))),
 (r'hooded sweatshirt|hoodie|turtleneck',('#5a5a66',dict(top=('@','shirt'),neck=('roll','@')))),(r't-shirt|jersey',('#2a2a2e',dict(top=('@','shirt'),sleeve='short'))),(r'sweater|combat blouse',('#7a4a3a',dict(top=('@','shirt')))),
]
UNSURE={  # item pattern: (desk question id)
 r'\bring\b|false teeth|glass eye|hearing aid|earbuds|earpiece|contact lenses|mouthpiece|ear trumpet|wristwatch|luxury watch|pocket watch|brooch|body camera|saint.s medal|amulet|cross on a cord|scapular|hag stone|eye bead|gris-gris':'small',
 r'crinoline|corset':'under'}
def clothing(name,colour=None):
    """the pieces an item is drawn as; colour, when given, is used in place of the item's own"""
    n=name.lower()
    for pat,(dflt,spec) in RULES:
        if re.search(pat,n):
            c=colour or tint(n,dflt); out={}
            for k,v in spec.items():
                rep=lambda x: c if x=='@' else tuple(rep(y) for y in x) if isinstance(x,tuple) else [rep(y) for y in x] if isinstance(x,list) else x
                out[k]=rep(v)
            if re.search(r'cropped',n): out['sleeve']='short'
            if re.search(r'grim reaper|plague|wizard|ghost',n): out['hat']=('hood',c)
            if re.search(r'skeleton',n): out['tex']=[(c,'hoop')]
            return out
    return None
# ---- weapons -------------------------------------------------------------------------------------------------------------------
WRULES=[(r'^hatchet|^ax, thrown|hand ax','hatchet'),(r'battle-ax','battleaxe'),(r'great ax','greataxe'),(r'^axe$','axe'),(r'pick ax','pick'),(r'mattock','mattock'),(r'great spiked club','greatclub'),(r'^club','club'),(r'branch','branch'),
 (r'morning ?star','morningstar'),(r'^mace','mace'),(r'quarterstaff','staff'),(r'smith.s hammer','smithhammer'),(r'war ?hammer','warhammer'),(r'^knife|switchblade|pocket knife','knife'),(r'silver-bladed dagger|^dagger|main-gauche','dagger'),
 (r'stiletto','stiletto'),(r'cleaver','cleaver'),(r'saber','saber'),(r'scimitar','scimitar'),(r'falchion','falchion'),(r'katana','katana'),(r'rapier','rapier'),(r'kris','kris'),(r'bastard sword','bastard'),(r'greatsword','greatsword'),
 (r'short sword','shortsword'),(r'broadsword|^sword$','sword'),(r'katar','katar'),(r'tiger claws|rippers','claws'),(r'wolvers|big ripps','longclaws'),(r'scratchers','nails'),(r'big knucks','cyberfist'),(r'brass knuckles','knuckles'),
 (r'hammerhand','hammerhand'),(r'buzz hand','buzzhand'),(r'spike hand','spikehand'),(r'cat-o','cat'),(r'flail, spiked','spikedflail'),(r'^flail','flail'),(r'whip','whip'),(r'halberd','halberd'),(r'glaive','glaive'),(r'^lance','lance'),
 (r'^pike','pike'),(r'pitchfork|field fork','fork'),(r'javelin','javelin'),(r'^spear','spear'),(r'candlestick','candlestick'),(r'chair','chair'),(r'table','table'),(r'tankard','tankard'),(r'sap$|blackjack','sap'),(r'stake','stake'),
 (r'bayonet','bayonet'),(r'rock','rock'),(r'grenade launcher|micro-missile|mm launcher','launcher'),(r'grenade','grenade'),(r'heavy crossbow|crossbow, hvy','heavycrossbow'),(r'crossbow, hand','handcrossbow'),(r'crossbow','crossbow'),
 (r'longbow','longbow'),(r'short ?bow','shortbow'),(r'compound','compound'),(r'^bow','bow'),(r'^a sling$|^sling$','sling'),(r'sling stone','rock'),(r'hand cannon','handcannon'),(r'arquebus|hackbutt|musket|longrifle|flintlock \.50$','musket'),
 (r'matchlock pistol|wheellock pistol|dueling pistol','oldpistol'),(r'derringer','derringer'),(r'colt army|remington army|revolver, hvy','heavyrevolver'),(r'colt|remington single|revolver','revolver'),(r'gatling','gatling'),
 (r'coach gun','coachgun'),(r'shotgun|12-gauge','shotgun'),(r'assault','assault'),(r'rifle|henry|remington bolt|winchester|1880s','rifle'),(r'smg, small','smg'),(r'smg, large','smgl'),(r'pistol, hvy','heavypistol'),(r'flare pistol','flare'),
 (r'pistol|popup gun|dartgun','pistol'),(r'stun gun','stungun'),(r'pepper spray','spray'),(r'dynamite','dynamite'),(r'molotov','bottle'),(r'pipebomb','pipebomb'),(r'flashbang','flashbang'),(r'firecracker','cracker'),
 (r'flame thrower','flamer'),(r'laser','laser'),(r'cutting torch','flamer')]
def weapon(name):
    n=name.lower()
    for pat,k in WRULES:
        if re.search(pat,n): return k
ARMOR={ # gear name: (pieces, note for the desk or None)
 'Class One':dict(top=('#6a5a48','tunic'),under=None,neck=('roll','#6a5a48')),'Class Two':dict(top=('#b8a888','tunic'),tex=[('#b8a888','stripe')],hat=('skull','#b8a888')),
 'Class Three':dict(top=('steel','mail'),tex=[('steel','mail')],under='#6a5a48',hat=('helmet','steel')),'Class Four':dict(top=('steel','mail'),tex=[('steel','mail')],under='steel',legs=('steel','tights'),hat=('coif','steel'),hands=('glove','iron')),
 'Class Five':dict(top=('steel','plate'),legs=('steel','plate'),feet=('iron','boot'),hat=('helm','steel'),hands=('glove','iron')),
 '"Crow\'s Mail"':dict(top=('#5a4030','vest'),under='#55555c',tex=[('#55555c','mail'),('#5a4030','plates')],legs=('#4a4238','trousers'),feet=('leather','boot'),hands=('cuff','iron')),'Light Armor':dict(top=('#6a4630','vest'),under='#b8b0a0',legs=('#4a4640','trousers'),feet=('#5a3a26','boot'),hat=('helmet','steel'),hands=('cuff','#6a4630')),
 '"Bastard Plate"':dict(top=('steel','plate'),under='#7c7c84',tex=[('#7c7c84','mail')],legs=('#7c7c84','tights'),feet=('iron','boot'),hat=('helmet','steel'),hands=('cuff','steel')),'Mail':dict(top=('steel','mail'),tex=[('steel','mail')],under='steel',legs=('steel','tights'),feet=('leather','boot'),hat=('helm','steel')),
 'Full Plate':dict(top=('steel','plate'),legs=('steel','plate'),feet=('iron','boot'),hat=('helm','steel'),hands=('glove','iron')),
 'Tournament Armor':dict(top=('chrome','plate'),legs=('chrome','plate'),feet=('chrome','boot'),hat=('helm','chrome'),hands=('glove','chrome'),sw=7.6,tex=[('chrome','plates')],neck=('chain','gold'),belt='gold'),
 "Titan's Armor":dict(top=('#c8ccd6','plate'),legs=('#c8ccd6','plate'),feet=('#c8ccd6','boot'),hat=('helm','#c8ccd6'),hands=('glove','#c8ccd6'),sw=8.6,tex=[('#c8ccd6','plates')],belt='gold'),
 'Armor class one':dict(top=('#3a3632','jacket'),under='#b8b0a0'),'Armor class two':dict(top=('#4a4a52','shirt'),sleeve='short',tex=[('#4a4a52','hoop')]),'Armor class three':dict(top=('#2e3038','kvest'),under='#7a766c'),
 'Armor class four':dict(top=('#4a5238','kvest'),under='#5a6044',hat=('helmet','#4a5238'),neck=('roll','#4a5238')),
 'Armor class five':dict(top=('#26282e','plate'),legs=('#26282e','plate'),feet=('black','boot'),hat=('helmet','#26282e'),face=('visor','#2a3038'),hands=('glove','black')),
 'Subdermal Armor':dict(top=('#000000','bare'),tex=[],skinplate=1),'Skinweave':dict(top=('#000000','bare'),skinweave=1),'Body plating':dict(top=('chrome','plate'),sleeve='none',hat=('helm','chrome')),'Decentral Heart':dict(small=1)}
ODD={'Implanted Fangs':dict(small=1),'Talon Foot':dict(feet=('chrome','fin')),'Spike Heel Foot':dict(feet=('chrome','heel'))}
SHIELD={'Small Shield':('small','#6a5a3a'),'Standard Shield':('kite','#7a3030'),'Buckler':('buckler','steel'),'War Shield':('war','#3a4a6a')}
def collect():
    """every in-scope item: (table, name, source, group, pieces or None)"""
    out=[]; gear=json.load(open(REPO+'gear.json'))['items']
    for i in gear:
        n=i['name']; src=i['flags']['wodx-library'].get('source'); t=i['type']
        if t=='Armor': out.append(('gear',n,src,'Armor',dict(ARMOR[n]) if n in ARMOR else None))
        elif n in SHIELD: out.append(('gear',n,src,'Shields',dict(off=SHIELD[n])))
        elif t in('Melee Weapon','Ranged Weapon'):
            k=weapon(n); out.append(('gear',n,src,'Melee weapons' if t=='Melee Weapon' else 'Ranged weapons',dict(ODD[n]) if n in ODD else dict(held=k) if k else None))
        elif weapon(n) and re.search(r'launcher|popup gun|flame thrower|laser|cutting torch|dartgun',n.lower()): out.append(('gear',n,src,'Cyberware weapons',dict(held=weapon(n))))
    goods=json.load(open('wear.json'))
    for n,kind,use,fr,to,src in goods:
        if use=='worn':
            sp=clothing(n); grp='Clothing' if kind=='cloth' else 'Worn things from other lists'
            out.append(('goods',n,src,grp,sp))
        elif kind=='arms' and use=='wielded': k=weapon(n); out.append(('goods',n,src,'Everyday arms',dict(held=k) if k else None))
    return out
if __name__=='__main__':
    its=collect(); miss=[i for i in its if i[4] is None]
    import collections; print(collections.Counter(i[3] for i in its)); print('total',len(its),'unmatched',len(miss))
    for m in miss: print('  ',m[:4])
