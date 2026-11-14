# Hand tools a person carries (wardrobe pick w8). Adds shapes to wear.W and maps the goods lists' tools onto them.
# tool(name) gives a shape name, 'object' (stands on the map, not carried in the hand) or 'small' (too small to draw).
import re, wear as Wr
W=Wr.W
def T(carry,*parts): return (carry,list(parts))
c=lambda a,b,ra,rb,m,o1=0,o2=0:('c',a,b,ra,rb,m,o1,o2)
W.update({
 'threshflail':T('pole',c(-12,14,.7,.7,'wood'),('h',14,9,1.2,'wood')),
 'net':T('hang',c(-1,2,.8,.8,'cord'),('h',2,9,2.2,'cord'),('h',2,9,-2.2,'cord'),('h',2,10,.6,'cord'),('h',2,8,-1.2,'cord',1.5)),
 'awl':T('up',c(-2,1.5,1.0,.9,'wood'),c(1.5,6,.5,.3,'steel')),
 'tongs':T('up',c(-3,9,.5,.5,'iron',-.9,.4),c(-3,9,.5,.5,'iron',.9,-.4)),
 'mallet':T('up',c(-2.5,8,.7,.7,'wood'),c(8,8.1,1.8,1.8,'dwood',-2.6,2.6)),
 'hammer':T('up',c(-2.5,8,.7,.7,'wood'),c(8,8.1,1.1,1.0,'iron',-2.4,2.0)),
 'spindle':T('up',c(-3,9,.5,.4,'wood'),('b',1,1.6,'bone'),('b',5.5,2.0,'cord')),
 'distaff':T('pole',c(-16,14,.6,.6,'wood'),c(14,20,2.4,1.6,'bone')),
 'cards':T('fist',c(-2,2,.7,.7,'wood'),c(2,6,1.0,1.0,'dwood',-2.4,2.4)),
 'shears':T('up',c(-3,0,1.2,.8,'iron'),c(0,9,.7,.3,'steel',-.6,.9),c(0,9,.7,.3,'steel',.6,-.9)),
 'drawknife':T('fist',c(0,.1,.6,.6,'steel',-5,5),c(-2.5,0,.8,.8,'wood',-5,-5),c(-2.5,0,.8,.8,'wood',5,5)),
 'saw':T('up',c(-3,1,1.5,1.5,'wood'),c(1,13,1.6,.8,'steel')),
 'hacksaw':T('up',c(-3,1,1.2,1.2,'black'),c(1,12,.5,.5,'steel',1.8,1.8),c(1,12,.4,.4,'steel',-1.2,-1.2),c(12,12.1,.5,.5,'steel',-1.2,1.8)),
 'brace':T('up',c(-3,0,1.3,1.3,'wood'),c(0,4,.5,.5,'iron'),c(4,7,.5,.5,'iron',0,2.4),c(7,7.1,.5,.5,'iron',2.4,0),c(7,12,.5,.3,'iron')),
 'level':T('low',c(-3,9,1.0,1.0,'wood'),('b',3,.7,'glass')),
 'trowel':T('up',c(-2.5,2,.8,.8,'wood'),c(2,3.5,.4,.4,'iron'),c(3.5,9,1.8,.4,'steel')),
 'pan':T('fist',c(0,.1,.8,.8,'iron',-4,4),c(1,1.1,.5,.5,'brass',-3,3)),
 'wrench':T('up',c(-3,9,.8,.8,'iron'),c(9,9.1,1.6,1.4,'steel',-1,1.6)),
 'jack':T('fist',c(0,5,1.8,1.4,'red'),c(5,8,.7,.7,'iron'),c(1,1.1,.5,.5,'iron',0,5)),
 'cables':T('hang',c(-1,1,.8,.8,'black'),('h',1,10,1.6,'red'),('h',1,10,-1.6,'black')),
 'iron':T('low',c(-3,3,1.1,1.0,'black'),c(3,8,.5,.3,'steel'),('h',-3,6,.8,'black')),
 'torch':T('low',c(-3,4,1.0,.9,'brass'),c(4,7,.5,.5,'iron',0,-1.6),('b',8,.9,'flame',-1.6)),
 'boltcutter':T('up',c(-10,2,.6,.6,'red',-1.6,-.4),c(-10,2,.6,.6,'red',1.6,.4),c(2,6,1.2,.7,'iron')),
 'drill':T('low',c(-1,5,1.8,1.5,'green'),c(5,9,.5,.3,'steel'),c(-1,-.9,1.2,1.4,'black',0,4.5)),
 'multitool':T('up',c(-2,3,1.0,1.0,'steel'),c(3,6,.5,.3,'steel',-.6,.2)),
 'meter':T('fist',c(0,5,2.0,2.0,'black'),('b',1.5,.9,'glass'),('h',5,6,1.0,'red')),
 'pen':T('up',c(-2,5,.7,.5,'black')),
 'spool':T('fist',c(0,.1,2.0,2.0,'steel'),('b',0,.8,'black')),
 'hoofpick':T('up',c(-2.5,3,.8,.8,'wood'),c(3,5,.5,.4,'iron',0,1.6)),
 'pincers':T('up',c(-6,3,.5,.5,'iron',-1.2,-.3),c(-6,3,.5,.5,'iron',1.2,.3),c(3,5,1.3,1.0,'iron')),
 'rasp':T('up',c(-3,1,.9,.9,'wood'),c(1,12,1.1,1.0,'iron')),
 'punch':T('up',c(-2,6,.7,.4,'iron')),
 'binoculars':T('fist',c(-1,3,1.3,1.5,'black',-1.5,-1.5),c(-1,3,1.3,1.5,'black',1.5,1.5)),
 'whistle':T('fist',c(0,2.5,.8,.7,'brass')),
 'gauge':T('fist',c(0,.1,2.2,2.2,'brass'),('b',0,1.2,'bone')),
 'box':T('fist',c(0,5,2.4,2.4,'glass')),
 'extinguisher':T('fist',c(0,9,2.4,2.4,'red'),c(-2,0,1.0,1.0,'black'),('h',-1,5,1.2,'black',2)),
 'pikepole':T('pole',c(-24,30,.7,.7,'wood'),c(30,35,.6,.2,'iron'),c(30,30.1,.5,.3,'iron',0,3)),
 'pole':T('pole',c(-24,24,.6,.6,'steel')),
 'chopper':T('fist',c(0,3,2.0,1.4,'stone')),
 'scraper':T('up',c(-3,2,.9,.9,'wood'),c(2,6,1.6,1.4,'steel')),
 'clamp':T('fist',c(0,7,.6,.6,'iron',-2,-2),c(0,.1,.6,.6,'iron',-2,2),c(7,7.1,.6,.6,'iron',-2,1),c(3,7,.5,.5,'iron',2.5,1.5)),
 'jackhammer':T('low',c(-4,6,2.2,1.8,'iron'),c(6,14,.8,.4,'steel'),c(-4,-3.9,.8,.8,'black',-4,4)),
 'snips':T('up',c(-5,1,.5,.5,'red',-1.3,-.3),c(-5,1,.5,.5,'red',1.3,.3),c(1,6,.9,.3,'steel')),
 'files':T('up',c(-3,0,.9,.9,'wood'),c(0,9,.8,.6,'iron')),
 'brush':T('up',c(-3,3,.8,.8,'wood'),c(3,4,1.2,1.2,'brass'),c(4,7,1.3,1.0,'black')),
 'pliers':T('up',c(-5,1,.5,.5,'red',-1.2,-.3),c(-5,1,.5,.5,'red',1.2,.3),c(1,5,.9,.5,'iron')),
 'screwdriver':T('up',c(-3,1,1.0,1.0,'red'),c(1,8,.5,.4,'steel')),
 'toolbox':T('fist',c(1,6,3.0,3.0,'red',-2.5,-2.5),c(1,6,3.0,3.0,'red',2.5,2.5),c(-1,-.9,.5,.5,'iron',-2.5,2.5)),
 'welder':T('low',c(-3,3,1.0,1.0,'black'),c(3,6,.5,.4,'iron'),('b',7,1.0,'flame'),('h',-3,8,1.4,'black')),
 'tackle':T('hang',c(-1,1,.8,.8,'cord'),('b',3,1.8,'wood'),('h',4,10,.8,'cord'),('b',14,1.5,'wood')),
 'rotary':T('low',c(-3,4,1.2,1.0,'green'),c(4,6,.4,.3,'steel')),
 'crucible':T('fist',c(0,3.5,1.6,2.2,'stone')),
 'chisel':T('up',c(-2.5,2,.9,.9,'wood'),c(2,9,.8,.9,'steel')),
 'sandpaper':T('fist',c(0,.1,.5,.5,'cord',-2.5,2.5)),
 'needles':T('up',c(-2,9,.4,.3,'bone',-.8,.8),c(-2,9,.4,.3,'bone',.8,-.8)),
 'canister':T('fist',c(0,4,1.4,1.4,'red')),
 'entrench':T('up',c(-4,8,.7,.7,'green'),c(8,13,2.0,1.6,'iron')),
 'grapple':T('hang',c(-1,1,.8,.8,'cord'),('h',1,10,1.0,'cord'),('b',12,.9,'iron'),c(12,12.1,.5,.4,'iron',-3,3)),
 'bellows':T('low',c(-3,3,2.4,1.4,'leather'),c(3,7,.6,.4,'iron'),c(-5,-3,.6,.6,'wood',-1.5,-1.5),c(-5,-3,.6,.6,'wood',1.5,1.5)),
 'marker':T('up',c(-2,4,.7,.6,'black')),
 'ladder':T('pole',c(-22,22,.7,.7,'wood',-3,-3),c(-22,22,.7,.7,'wood',3,3),('x',-14,3,.5,'wood'),('x',-5,3,.5,'wood'),('x',4,3,.5,'wood'),('x',13,3,.5,'wood')),
 'ladderal':T('pole',c(-22,22,.7,.7,'chrome',-3,-3),c(-22,22,.7,.7,'chrome',3,3),('x',-14,3,.5,'chrome'),('x',-5,3,.5,'chrome'),('x',4,3,.5,'chrome'),('x',13,3,.5,'chrome')),
 'sprayer':T('low',c(-2,3,1.3,1.3,'black'),('b',3.6,.8,'red')),
 'tape':T('fist',c(0,.1,1.8,1.8,'gold'),c(0,5,.4,.4,'steel',1.8,1.8)),
 'adze':T('up',c(-2.5,10,.7,.7,'wood'),c(10,10.1,1.0,.6,'stone',0,3.5)),
 'case':T('fist',c(1,6,2.6,2.6,'dwood',-2.5,-2.5),c(1,6,2.6,2.6,'dwood',2.5,2.5),c(-1,-.9,.5,.5,'brass',-2,2)),
 'tank':T('fist',c(1,12,2.4,2.4,'steel'),c(-1,1,1.0,1.0,'brass')),
 'scale':T('hang',c(-1,1,.7,.7,'brass'),('x',2,4,.5,'brass'),('h',2,6,.3,'brass',-4),('h',2,6,.3,'brass',4),('b',8,1.4,'brass',-4),('b',8,1.4,'brass',4)),
 'prism':T('fist',c(0,3,1.6,.6,'glass')),
 'tube':T('up',c(-1,6,.6,.6,'glass')),
 'hoe':T('pole',c(-22,26,.7,.7,'wood'),c(26,26.1,.9,.6,'iron',0,4)),
 'shovel':T('pole',c(-14,12,.7,.7,'wood'),c(-22,-15,2.0,2.2,'iron'),c(12,12.1,.6,.6,'wood',-2,2)),
 'woodshovel':T('pole',c(-14,12,.7,.7,'wood'),c(-22,-15,2.0,2.2,'dwood')),
 'snowshovel':T('pole',c(-12,12,.7,.7,'wood'),c(-21,-13,3.2,3.4,'chrome')),
 'rake':T('pole',c(-22,26,.7,.7,'wood'),('x',26,5,.6,'iron'),c(26,28,.4,.3,'iron',-5,-5),c(26,28,.4,.3,'iron',-2.5,-2.5),c(26,28,.4,.3,'iron'),c(26,28,.4,.3,'iron',2.5,2.5),c(26,28,.4,.3,'iron',5,5)),
 'billpole':T('pole',c(-24,28,.7,.7,'wood'),c(28,34,1.0,.4,'iron'),c(31,31.1,.6,.3,'iron',0,3.5)),
 'trimmer':T('low',c(-3,3,1.8,1.6,'green'),c(3,16,1.0,.7,'steel')),
 'sieve':T('fist',c(0,.1,.9,.9,'wood',-4,4),c(1,1.1,.4,.4,'cord',-3,3)),
 'hone':T('up',c(-3,1,.9,.9,'black'),c(1,10,.6,.5,'steel')),
 'sharpener':T('fist',c(0,3,1.3,1.1,'stone')),
 'stove':T('fist',c(0,4,2.4,2.4,'iron')),
 'tarp':T('fist',c(0,.1,2.2,2.2,'leather',-3,3)),
 'rod':T('pole',c(-8,34,.5,.25,'dwood'),('b',-2,1.1,'brass',1.2),('h',34,12,.4,'cord')),
 'reel':T('fist',c(0,.1,1.8,1.8,'wood'),('h',1,7,.5,'cord')),
 'goggles':T('fist',c(0,.1,1.2,1.2,'black',-1.8,1.8)),
})
OBJECT=r'anvil|forge|kiln|loom|fanning mill|bench vise|tanning frame|press$|arbor press|screw press|oil press|quern|can sealer|smoker|butchering rack|smoking rack|centrifuge|distillation|space heater|travel toilet|terrarium|microscope|3d printer$|workshop toolbox|sandcasting mold|vacuum sealer|test tube rack|burette'
SMALL=r'fishing hook|needle$|bone needle|curved needle|wooden needle|microscope slide|lockpick$|filter straw|gasket|pattern set|thermometer|diagnostic plug'
TRULES=[(r'^a sickle','sickle'),(r'scythe','scythe'),(r'threshing flail','threshflail'),(r'entrenching','entrench'),(r'snow shovel','snowshovel'),(r'wooden shovel','woodshovel'),(r'shovel','shovel'),(r'spade','spade'),(r'pitchfork','fork'),(r'fishing net','net'),
 (r'sewing awl|^an awl|bone punch|pin reamer','awl'),(r'tongs|horseshoe puller|nippers|clinchers|hoof tester|nail puller','pincers'),(r'mallet','mallet'),(r'knitting needles','needles'),(r'distaff','distaff'),(r'spindle','spindle'),(r'wool cards|carding paddles','cards'),
 (r'shears','shears'),(r'drawknife','drawknife'),(r'hacksaw','hacksaw'),(r'hand saw','saw'),(r'brace and bits','brace'),(r'pocket knife','knife'),(r'spirit level','level'),(r'trowel','trowel'),(r'pickaxe','pick'),(r'gold pan','pan'),(r'crowbar','crowbar'),
 (r'wrench','wrench'),(r'car jack','jack'),(r'jumper cables','cables'),(r'soldering iron','iron'),(r'welding torch','torch'),(r'arc welder','welder'),(r'bolt cutter','boltcutter'),(r'chainsaw','chainsaw'),(r'cordless drill|lockpick gun','drill'),(r'rotary tool','rotary'),
 (r'multitool','multitool'),(r'multimeter|voltmeter','meter'),(r'glass cutter|3d printer pen','pen'),(r'permanent marker','marker'),(r'monofilament','spool'),(r'hoof pick','hoofpick'),(r'rasp','rasp'),(r'pritchel|nail punch|nail header|hot chisel','punch'),(r'chisel','chisel'),
 (r'binoculars','binoculars'),(r'goggles','goggles'),(r'whistle','whistle'),(r'pyrometer|barometer|hygrometer','gauge'),(r'fire extinguisher','extinguisher'),(r'pike pole','pikepole'),(r'bill pole','billpole'),(r'tent pole','pole'),(r'stone chopper','chopper'),(r'stone adze','adze'),
 (r'paint chipper','scraper'),(r'clamp','clamp'),(r'jackhammer','jackhammer'),(r'tin snips','snips'),(r'fileset','files'),(r'paint brush','brush'),(r'pliers','pliers'),(r'screwdriver set|^a toolbox|luthier toolset','toolbox'),(r'screwdriver','screwdriver'),
 (r'block and tackle','tackle'),(r'crucible','crucible'),(r'sandpaper','sandpaper'),(r'butane$|hexamine stove','canister'),(r'grappling hook','grapple'),(r'bellows','bellows'),(r'aluminum stepladder','ladderal'),(r'stepladder','ladder'),(r'tear gas','sprayer'),(r'tape measure','tape'),
 (r'chemistry set','case'),(r'tank|diving cylinder','tank'),(r'weight scale','scale'),(r'prism','prism'),(r'glass tube','tube'),(r'hoe$','hoe'),(r'rake','rake'),(r'hedge trimmer','trimmer'),(r'sieve','sieve'),(r'honing rod','hone'),(r'knife sharpener','sharpener'),
 (r'brazier|hobo stove|portable stove','stove'),(r'tarp','tarp'),(r'fishing rod','rod'),(r'fishing reel','reel'),(r'hand press','clamp')]
def tool(name):
    n=name.lower()
    if re.search(SMALL,n): return 'small'
    for pat,k in TRULES:
        if re.search(pat,n): return k
    if re.search(OBJECT,n): return 'object'
if __name__=='__main__':
    import json,collections
    g=[n for n,k,u,*_ in json.load(open('wear.json')) if k=='tools' and u=='wielded']
    r={n:tool(n) for n in g}; cnt=collections.Counter('held' if v not in('object','small',None) else str(v) for v in r.values()); print(cnt,len(set(v for v in r.values() if v not in('object','small',None))),'shapes')
    print('unmatched',[n for n,v in r.items() if v is None]); print('object',[n for n,v in r.items() if v=='object']); print('small',[n for n,v in r.items() if v=='small'])
    bad=[v for v in set(r.values()) if v not in('object','small',None) and v not in W]; print('missing shapes',bad)
