# Looks for monsters and for the fae (B2613, B2614). Own art in the manner of the other rigs.
# Each look follows what the world's own entry for the creature says of it (source page in the entry's notes), in our words:
# a basilisk is a small serpent with a cock's head, a mist dragon is the size of a cat, a custodes is a great spider, the
# Black Monk is a monk like any other. A changeling is drawn in its fae mien by kith.
import re, math, numpy as np
from PIL import Image
import crinos as K, beast as B, critter as Cr, wear as Wr
from rig import ramp
S,SH=K.S,K.SH; FEET=103
# ---- after the drawing: size, a wash of colour, how solid it is, how high it hovers -------------------------------------------
def _cell(c,scale=1.0,wash=None,alpha=1.0,lift=0):
    im=c
    if scale!=1.0:
        w,h=max(1,round(S*scale)),max(1,round(SH*scale)); small=Image.fromarray(np.ascontiguousarray(c),'RGBA').resize((w,h),Image.NEAREST)
        big=Image.new('RGBA',(S,SH),(0,0,0,0)); big.paste(small,(round(48-48*scale),round(FEET-FEET*scale))); im=np.array(big)
    if lift:
        out=np.zeros_like(im); out[:SH-lift]=im[lift:]; im=out
    if wash or alpha!=1.0:
        im=im.copy(); m=im[...,3]>0
        if wash: col,k=wash; im[m,:3]=(im[m,:3]*(1-k)+np.array(col)*k).astype(np.uint8)
        if alpha!=1.0: im[m,3]=(im[m,3]*alpha).astype(np.uint8)
    return im
def post(sheet,**k):
    """the same sheet with every frame made larger or smaller about its feet, washed, thinned or lifted"""
    if not k: return sheet
    out=np.zeros_like(sheet)
    for r in range(sheet.shape[0]//SH):
        for c in range(sheet.shape[1]//S): out[r*SH:(r+1)*SH,c*S:(c+1)*S]=_cell(sheet[r*SH:(r+1)*SH,c*S:(c+1)*S],**k)
    return out
GHOST=dict(wash=((196,214,230),.38),alpha=.74)
# ---- the kiths: what is changed on the person's figure (spec), and after the drawing (post) ------------------------------------
def _hair(spec): return spec['hair'][0]
KITH=[
 (r'boggan',lambda s:(dict(sw=7.9,thin=1.12,skin=(214,170,140) if s['skin'][2]>s['skin'][0] else s['skin']),dict(scale=.84))),
 (r'eshu',lambda s:(dict(thin=.94,skin=(110,74,52),hair=('#16120f',s['hair'][1]),hat=('turban','#8a3a2a')),dict(scale=1.06))),
 (r'nocker',lambda s:(dict(skin=(232,226,220),thin=.95,marks=dict(ears=('point',None),nose='#b0403a')),dict(scale=.92))),
 (r'pooka',lambda s:(dict(skin=(206,170,140) if s['skin'][2]>s['skin'][0] else s['skin'],marks=dict(ears=('beast',_hair(s)),tail=(_hair(s),'brush'))),{})),
 (r'redcap',lambda s:(dict(skin=(156,156,150),sw=7.6,hat=('cap','#8a1c1c'),eyes=(150,30,30),marks=dict(teeth=True)),dict(scale=.96))),
 (r'satyr',lambda s:(dict(legs=('#6a4a30','tights'),hose=None,feet=('#2a2018','shoe'),marks=dict(horns=('#c8b890','goat'),ears=('long',None))),{})),
 (r'sidhe|firstborn',lambda s:(dict(thin=.92,hair=(s['hair'][0],'long'),eyes=(120,90,200),marks=dict(ears=('point',None))),dict(scale=1.08))),
 (r'troll',lambda s:(dict(sw=8.3,thin=1.14,skin=(124,146,176),hair=('#16161c',s['hair'][1]),eyes=(170,214,236),marks=dict(horns=('#c8c0a8','nub'))),dict(scale=1.2))),
 (r'sl[ua]+gh',lambda s:(dict(skin=(226,226,222),thin=.9,hair=('#101014','long'),top=('#1c1c22','coat'),legs=('#1c1c22','trousers'),eyes=(16,16,20)),{})),
 (r'clurichaun',lambda s:(dict(hair=('#a8481c',s['hair'][1]),top=('#2e5a34','coat'),marks=dict(ears=('point',None))),dict(scale=.8))),
 (r'piskie|pixie',lambda s:(dict(thin=.9,marks=dict(ears=('long',None))),dict(scale=.78))),
 (r'selkie',lambda s:(dict(over=('cloak','#5a5c60')),{})),
 (r'changeling|kithain|\bfae\b|faerie',lambda s:(dict(marks=dict(ears=('point',None))),{})),
]
def fae(a,spec):
    """(what to change on the figure, what to do after drawing) for a roster entry; ({}, {}) for anyone else"""
    text=' '.join(str(a.get(k) or '') for k in ('kith','name')).lower(); line=str(a.get('line') or '').lower()
    for pat,f in KITH:
        if re.search(pat,text) or (pat.startswith('changeling') and line=='changeling'): return f(spec)
    if line=='wraith' or a.get('death')=='fade' or re.search(r'wraith|ghost|\bspirit\b|spectre',text): return {},dict(GHOST)
    return {},{}
# ---- drawings of their own --------------------------------------------------------------------------------------------------
def _plant(f,view):
    """a hedge of barbed vines with red blooms: it does not walk, it sways"""
    cv=K.Cv(); ph=f/8*2*math.pi; vp=ramp((52,84,48)); rng=np.random.default_rng(7)
    for i in range(9):
        x0=48+(i-4)*4.2+rng.uniform(-1,1); h=14+rng.uniform(0,16); sw=math.sin(ph+i)*1.4; mid=(x0+rng.uniform(-4,4)+sw*.5,FEET-16-h*.5); top=(x0+rng.uniform(-6,6)+sw,FEET-16-h)
        cv.capsule((x0,FEET-17),mid,1.3,1.1,ramp=vp,g='v%d'%i); cv.capsule(mid,top,1.1,.7,ramp=vp,g='v%d'%i)
        for t in (.3,.7): cv.px(mid[0]+(top[0]-mid[0])*t+1.5,mid[1]+(top[1]-mid[1])*t,(150,160,120))
        if i%2==0: cv.capsule(top,(top[0]+.5,top[1]),2.3,2.1,ramp=ramp((196,40,30)),g='b%d'%i); cv.px(top[0],top[1],(250,200,90))
        elif i%3==0: cv.capsule((mid[0]+2,mid[1]),(mid[0]+2.3,mid[1]),1.4,1.4,ramp=ramp((130,16,30)),g='f%d'%i)
    cv.outline(); return cv.c
def _ribbon(f,view):
    """a twisting ribbon of light and shadow with no body: it hangs in the air and turns"""
    c=np.zeros((SH,S,4),np.uint8); ph=f/8*2*math.pi
    for i in range(46):
        t=i/45; y=int(FEET-8-t*52); a=math.sin(t*7+ph)*(9-5*t); w=2+int(2.6*abs(math.cos(t*7+ph))); lit=math.cos(t*7+ph)>0
        for d in range(-w,w+1):
            x=int(48+a+d)
            if 0<=x<S and 0<=y<SH: c[y,x]=(*((250,232,170) if lit and abs(d)<w else (236,150,60) if lit else (40,28,70) if abs(d)<w else (16,12,30)),235 if lit else 215)
        if i%6==0 and lit:
            for (dx,dy) in ((w+2,0),(-w-3,1)):
                x=int(48+a+dx)
                if 0<=x<S: c[y+dy,x]=(250,240,200,200)
    return c
def _own(fn):
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=fn(f,'s')
        for row,im in ((0,fn(f,'b')),(1,r[:,::-1]),(2,fn(f,'f')),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=im
    return sh

# ---- shapes shared by many creatures of the books (B2617): a glow, a swarm, a floating figure of lines, a mass of tentacles, a fish --------
COL=dict(fire=[(150,40,10),(230,110,30),(250,200,90),(255,246,200)],balefire=[(30,70,20),(90,170,40),(170,230,90),(230,255,190)],
 lightning=[(40,60,120),(110,150,230),(200,220,255),(255,255,255)],shadow=[(6,4,12),(24,18,40),(52,40,80),(90,76,120)],moon=[(70,80,110),(150,160,190),(214,220,236),(250,250,255)],
 water=[(20,50,90),(50,110,170),(120,180,220),(210,236,250)],ice=[(80,120,150),(160,200,220),(220,240,250),(255,255,255)],smoke=[(40,40,44),(90,90,96),(150,150,156),(200,200,206)],
 oil=[(4,4,6),(22,20,26),(52,48,60),(110,100,130)],blood=[(60,4,8),(130,16,22),(196,40,44),(240,120,110)],light=[(150,130,60),(230,210,120),(250,240,190),(255,255,240)],
 green=[(20,60,30),(50,130,60),(120,200,110),(210,250,200)],violet=[(40,20,70),(100,60,160),(170,130,220),(236,220,255)],earth=[(50,40,30),(100,80,60),(150,124,96),(200,180,150)],
 insect=[(20,16,12),(60,48,30),(100,84,50),(150,130,90)],bird=[(14,14,18),(44,44,52),(80,80,90),(130,130,140)],sand=[(120,96,60),(180,150,100),(220,196,140),(246,230,190)],
 crystal=[(70,110,140),(140,190,220),(210,236,250),(255,255,255)],jade=[(20,80,50),(60,150,100),(140,210,160),(220,250,230)],metal=[(50,54,62),(110,116,128),(170,176,188),(230,234,240)],
 rust=[(70,30,16),(130,66,30),(180,110,60),(220,170,110)],grey=[(50,50,54),(100,100,106),(150,150,156),(210,210,216)])
def _rgba(c,a): return (*c,a)
def _wisp(col):
    def fn(f,view):
        c=np.zeros((SH,S,4),np.uint8); ph=f/8*2*math.pi; P=COL[col]; cy=FEET-30+math.sin(ph)*2.5; cx=48
        for y in range(SH):
            for x in range(S):
                d=math.hypot((x-cx)*1.0,(y-cy)*1.15); wob=1+.18*math.sin(math.atan2(y-cy,x-cx)*3+ph*2)
                r=12*wob
                if d<r:
                    t=d/r; i=0 if t>.85 else 1 if t>.6 else 2 if t>.3 else 3; c[y,x]=_rgba(P[i],int(255*(.55+.45*(1-t))))
                elif d<r+3 and (x*7+y*3+f)%5==0: c[y,x]=_rgba(P[1],110)
        for k in range(5):   # a trail of motes below
            yy=int(cy+14+k*2.4); xx=int(cx+math.sin(ph+k)*3)
            if yy<SH: c[yy,xx]=_rgba(P[2],200-k*30)
        for y,w in ((FEET,4),(FEET+1,3)):
            for x in range(cx-w,cx+w+1):
                if not c[y,x,3]: c[y,x]=(10,10,16,70)
        return c
    return fn
def _swarm(col):
    def fn(f,view):
        c=np.zeros((SH,S,4),np.uint8); P=COL[col]; rng=np.random.default_rng(11)
        for k in range(150):
            a=rng.uniform(0,2*math.pi); r=abs(rng.normal(0,8)); sp=rng.uniform(.6,1.6)
            x=int(48+math.cos(a+f*.35*sp)*r*1.3); y=int(FEET-24+math.sin(a+f*.35*sp)*r*.9+math.sin(f+k)*1.2)
            if 0<=x<S and 0<=y<SH: c[y,x]=_rgba(P[k%3],235)
            if col=='bird' and k%9==0 and 0<x<S-1: c[y-1,x-1]=c[y-1,x+1]=_rgba(P[1],235)
        return c
    return fn
def _geomid(col):
    def fn(f,view):
        cv=K.Cv(); P=[(0,0,0)]+COL[col]; ph=f/8*2*math.pi; cx,cy=48,GF-30+math.sin(ph)*2
        pts=[(math.cos(ph*.5+i*math.pi/3)*10,math.sin(i*math.pi/3)*10) for i in range(6)]
        for i in range(6):
            a=(cx+pts[i][0],cy+pts[i][1]); b=(cx+pts[(i+1)%6][0],cy+pts[(i+1)%6][1]); cv.capsule(a,b,1.0,1.0,ramp=P,g='e%d'%i); cv.capsule(a,(cx,cy),.6,.6,ramp=P,g='s%d'%i)
        cv.capsule((cx,cy),(cx,cy),2.2,2.2,ramp=P,g='c'); cv.outline()
        for y,w in ((FEET,5),(FEET+1,3)):
            for x in range(cx-w,cx+w+1):
                if not cv.c[y,x,3]: cv.c[y,x]=(10,10,16,80)
        return cv.c
    return fn
GF=FEET-K.YO   # the feet line on the drawing canvas, which sits YO above the frame's
def _tentacles(col):
    def fn(f,view):
        cv=K.Cv(); P=[(0,0,0)]+COL[col]; ph=f/8*2*math.pi; cx,cy=48,GF-30
        for j in range(8):
            a=j/8*2*math.pi; prev=(cx,cy+4)
            for t in range(1,9):
                r=t*3.0; q=(cx+math.cos(a+math.sin(ph+t*.5+j)*.35)*r*1.1,cy+6+math.sin(a)*r*.5+t*1.6)
                if q[1]>GF: q=(q[0],GF)
                cv.capsule(prev,q,max(.6,2.2-t*.2),max(.5,2.0-t*.2),ramp=P,g='t%d'%j); prev=q
        cv.capsule((cx,cy),(cx,cy+3),8,7,ramp=P,g='body')
        for sg in (-1,1): cv.px(cx+sg*3,cy+1,(250,230,90))
        cv.outline(); return cv.c
    return fn
def _fish(col,kind='fish'):
    def fn(f,view):
        cv=K.Cv(); P=[(0,0,0)]+COL[col]; ph=f/8*2*math.pi; cy=GF-1; L={'fish':16,'shark':26,'whale':34}[kind]
        if view=='s':
            pts=[(48-L/2+i*L/10,cy+math.sin(ph+i*.6)*(1.2*(1-i/10))) for i in range(11)]
            for i in range(10): r=[1,1.6,2.4,3.2,3.8,4.0,3.8,3.4,2.8,2.0][i]*(L/22); cv.capsule(pts[i],pts[i+1],r,r,ramp=P,g='b')
            t=pts[0]; cv.capsule(t,(t[0]-4,t[1]-4),1.2,.6,ramp=P,g='tail'); cv.capsule(t,(t[0]-4,t[1]+4),1.2,.6,ramp=P,g='tail')
            if kind=='shark': m=pts[5]; cv.capsule(m,(m[0]-2,m[1]-7),1.4,.5,ramp=P,g='fin')
            if kind=='whale' and col=='grey': h=pts[-1]; cv.capsule(h,(h[0]+9,h[1]-1),.6,.4,ramp=[(0,0,0),(200,190,170),(230,224,210),(250,246,236),(255,255,255)],g='tusk')
            cv.outline(); e=pts[-2]; cv.px(e[0]+1,e[1]-1,(20,16,16))
        else:
            r=L/22*4; cv.capsule((48,cy-1),(48,cy+1),r,r,ramp=P,g='b'); cv.outline()
            if view=='f':
                for sg in (-1,1): cv.px(48+sg*2,cy-1,(20,16,16))
        for x in range(28,68):   # the water it moves in
            if (x+f)%4<2: cv.c[FEET-int(r if view!='s' else 6),x]=(150,190,214,150) if not cv.c[FEET-6,x,3] else cv.c[FEET-6,x]
        return cv.c
    return fn
OWN=dict(plant=_plant,ribbon=_ribbon)
for _c in COL: OWN['wisp:'+_c]=_wisp(_c); OWN['swarm:'+_c]=_swarm(_c); OWN['geomid:'+_c]=_geomid(_c); OWN['tentacles:'+_c]=_tentacles(_c)
for _c,_k in (('water','fish'),('grey','shark'),('grey','whale'),('water','whale'),('green','fish'),('metal','fish')): OWN['%s:%s'%(_k,_c)]=_fish(_c,_k)
# ---- monsters that go on two legs: a figure for wear.py -------------------------------------------------------------------------
def P(post=None,acts=(),death='die',**spec): return dict(spec=spec,post=post or {},acts=list(acts),death=death)
SPRITE=lambda cloth:P(dict(scale=.55,lift=14),skin=(236,222,206),hair=('#d8c890','long'),top=(cloth,'tunic'),legs=(cloth,'tights'),feet=(cloth,'shoe'),thin=.9,marks=dict(ears=('long',None),wings=('#cfe4ec','fly')))
PEOPLE={
 'troll':P(dict(scale=1.26),acts=[('swing','club',None)],skin=(120,96,70),hair=('#2a221c','long'),beard='#2a221c',top=('#000000','bare'),legs=('#4a3a2a','loin'),feet=('#000000','bare'),sw=8.4,thin=1.18,held='club',marks=dict(tail=('#6a5240','thin'),tusks=True)),
 'golem':P(dict(scale=1.16),skin=(156,124,92),hair=('#9c7c5c','bald'),top=('#000000','bare'),legs=('#8a6c4e','briefs'),feet=('#000000','bare'),sw=8.4,thin=1.16,eyes=(60,44,32),marks=dict(brow='#3a2a1c')),
 'gnome':P(dict(scale=.62),skin=(128,110,96),hair=('#5a5450','bald'),beard='#6a6660',top=('#4a4038','tunic'),legs=('#3a322c','breeches'),feet=('#2a2420','boot'),sw=8.0,thin=1.15,eyes=(236,170,60),marks=dict(ears=('long',None),nose='#6a5a50')),
 'jenny':P(acts=[('cast',None,None)],skin=(132,158,128),hair=('#22402c','long'),top=('#34443a','gown'),legs=('#34443a','skirtlong'),feet=('#000000','bare'),sw=8.0,thin=1.15,eyes=(20,24,20),marks=dict(teeth=True)),
 'kaiser':P(acts=[('cast',None,None)],skin=(52,42,38),hair=('#342a26','bald'),top=('#4a2a4a','coat'),legs=('#2a2228','breeches'),feet=('#1c1818','shoe'),eyes=(52,42,38),tex=None),
 'monk':P(acts=[('cast',None,None)],skin=(206,176,150),hair=('#6a625c','short'),top=('#17161a','robe'),legs=('#17161a','trousers'),feet=('#2a2422','sandal'),belt='leather'),
 'huntsman':P(acts=[('shot','bow',None),('cast',None,None)],skin=(214,180,150),hair=('#2a1c14','long'),top=('#6a1c22','coat'),under='#e0d8c8',legs=('#2a2a34','breeches'),hose='#d8d0c0',feet=('#1c1616','boot'),hat=('beret','#2a2a34'),over=('cloak','#23301f'),held='bow'),
 'belteroth':P(dict(scale=1.12,lift=10,alpha=.82),acts=[('cast',None,None)],skin=(34,32,44),hair=('#16141c','bald'),top=('#000000','bare'),legs=('#1c1a24','tights'),feet=('#000000','bare'),thin=.95,eyes=(190,214,236),marks=dict(wings=('#2a2836','bat'))),
 'corpse':P(dict(wash=((110,120,96),.25)),skin=(150,150,124),hair=('#3a3a30','long'),top=('#4a4436','tunic'),legs=('#3a3428','breeches'),hose='#3a3428',feet=('#000000','bare'),thin=.86,eyes=(220,220,170),marks=dict(teeth=True)),
 'skeleton':P(skin=(222,214,190),hair=('#000000','bald'),top=('#000000','bare'),legs=('#c8bea4','briefs'),feet=('#000000','bare'),thin=.62,eyes=(20,16,16),marks=dict(teeth=True)),
 'figure':P(skin=(206,176,150),hair=('#3a2a1c','long'),top=('#3c3c4a','robe'),legs=('#3c3c4a','trousers'),feet=('#2a2422','shoe')),
 'ghostfig':P(dict(GHOST),skin=(206,206,206),hair=('#808088','long'),top=('#6a6a72','robe'),legs=('#6a6a72','trousers'),feet=('#000000','bare')),
 'imp':P(dict(scale=.55),skin=(170,52,40),hair=('#2a1010','bald'),top=('#000000','bare'),legs=('#8a2a20','briefs'),feet=('#000000','bare'),thin=.9,eyes=(250,220,60),marks=dict(horns=('#2a2020','goat'),tail=('#a03a2a','devil'),ears=('point',None))),
 'oni':P(dict(scale=1.25),acts=[('swing','club',None)],skin=(176,56,44),hair=('#141010','long'),top=('#000000','bare'),legs=('#c8b07a','loin'),feet=('#000000','bare'),sw=8.4,thin=1.16,held='club',marks=dict(horns=('#e0d6b0','nub'),tusks=True)),
 'angel':P(dict(lift=4),acts=[('cast',None,None)],skin=(236,222,206),hair=('#e8d8a0','long'),top=('#ecebe6','robe'),legs=('#ecebe6','trousers'),feet=('#000000','bare'),marks=dict(wings=('#f4f2ea','fly'))),
 'birdman':P(skin=(60,56,64),hair=('#141418','short'),top=('#2a2a34','robe'),legs=('#2a2a34','trousers'),feet=('#c8a040','bare'),marks=dict(wings=('#1c1c22','fly'),nose='#c8a040')),
 'giant':P(dict(scale=1.42),acts=[('swing','club',None)],skin=(196,160,128),hair=('#5a3a20','long'),beard='#5a3a20',top=('#6a5a40','tunic'),legs=('#4a3a2a','breeches'),hose='#4a3a2a',feet=('#3a2a1a','wrap'),sw=8.4,thin=1.15,held='club'),
 'fishfolk':P(skin=(96,140,110),hair=('#1c3a30','bald'),top=('#3a5a4a','robe'),legs=('#3a5a4a','trousers'),feet=('#000000','bare'),eyes=(220,220,120),marks=dict(ears=('long','#4a7a60'))),
 'el_stone':P(dict(scale=1.15),skin=(130, 126, 120),hair=('#000000','bald'),top=('#000000','bare'),legs=('#827e78','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_earth':P(dict(scale=1.2),skin=(120, 96, 70),hair=('#000000','bald'),top=('#000000','bare'),legs=('#786046','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_fire':P(dict(scale=1.0, alpha=.82),skin=(236, 120, 40),hair=('#000000','bald'),top=('#000000','bare'),legs=('#ec7828','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_water':P(dict(scale=1.0, alpha=.82),skin=(80, 140, 200),hair=('#000000','bald'),top=('#000000','bare'),legs=('#508cc8','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_ice':P(dict(scale=1.0, alpha=.82),skin=(190, 226, 240),hair=('#000000','bald'),top=('#000000','bare'),legs=('#bee2f0','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_metal':P(dict(scale=1.1),skin=(150, 156, 168),hair=('#000000','bald'),top=('#000000','bare'),legs=('#969ca8','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_glass':P(dict(scale=1.0, alpha=.82),skin=(190, 220, 230),hair=('#000000','bald'),top=('#000000','bare'),legs=('#bedce6','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_jade':P(dict(scale=1.0),skin=(90, 170, 120),hair=('#000000','bald'),top=('#000000','bare'),legs=('#5aaa78','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_bronze':P(dict(scale=1.4),skin=(176, 130, 70),hair=('#000000','bald'),top=('#000000','bare'),legs=('#b08246','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_shadow':P(dict(scale=1.0, alpha=.82),skin=(30, 24, 44),hair=('#000000','bald'),top=('#000000','bare'),legs=('#1e182c','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_light':P(dict(scale=1.0, alpha=.82),skin=(250, 240, 190),hair=('#000000','bald'),top=('#000000','bare'),legs=('#faf0be','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_plant':P(dict(scale=1.1),skin=(80, 120, 60),hair=('#000000','bald'),top=('#000000','bare'),legs=('#50783c','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'el_clay':P(dict(scale=1.16),skin=(156, 124, 92),hair=('#000000','bald'),top=('#000000','bare'),legs=('#9c7c5c','briefs'),feet=('#000000','bare'),sw=8.0,thin=1.1,eyes=(250,240,200)),
 'sprite_master':SPRITE('#5a3a7a'),'sprite_scholar':SPRITE('#6a6a72'),'sprite_squire':SPRITE('#2e5a34'),'sprite_messenger':SPRITE('#3c5a8a'),'sprite':SPRITE('#7a5a3a'),
}
# name of the creature, then what draws it: ('beast', kind) | ('critter', kind) | ('person', key) | ('own', key), with what to do after
MONSTERS=[
 (r'^mist dragon$',('beast','dragon_mist',dict(scale=.46,alpha=.9))),(r'^(the )?dragon$',('beast','dragon',{})),(r'^(gryphon|griffin|griffon)$',('beast','gryphon',{})),(r'^sphinx$',('beast','sphinx',{})),
 (r'^unicorn$',('beast','unicorn',dict(scale=.88))),(r'^zephyr$',('beast','zephyr',{})),(r'^fire salamander$',('beast','salamander',{})),(r'^basilisk$',('critter','basilisk',{})),
 (r'stone dog',('beast','stone_dog',{})),(r'rock cat',('beast','rock_cat',{})),(r'razor bat',('critter','razor_bat',{})),(r'^(fae|faerie) cattle$',('beast','fae_cattle',{})),
 (r'custodes',('critter','spider_giant',{})),(r"t'arrkel",('critter','spider_squid',{})),(r'^familiar',('beast','familiar',{})),(r'^spite$',('beast','cat',{})),
 (r'blood rose',('own','plant',{})),(r'star daemon|star demon',('own','ribbon',{})),
 (r'master sprite',('person','sprite_master')),(r'scholar sprite',('person','sprite_scholar')),(r'squire sprite',('person','sprite_squire')),(r'messenger sprite',('person','sprite_messenger')),(r'^sprite$',('person','sprite')),
 (r'^troll$',('person','troll')),(r'^golem$',('person','golem')),(r'gnome$',('person','gnome')),(r'jenny green',('person','jenny')),(r'^kaiser',('person','kaiser')),(r'black monk',('person','monk')),
 (r'huntsman',('person','huntsman')),(r'belteroth',('person','belteroth')),
]
def monster(name):
    n=str(name or '').lower().strip()
    for pat,what in MONSTERS:
        if re.search(pat,n): return what
# the creatures of the books (B2617): bestiary-looks.json, made by bestiary.py from the hand-checked roster, names each one's shared look
import json as _json, os as _os
_TABLE=None
def _norm(n): return re.sub(r'[^a-z0-9]','',re.sub(r'\(.*?\)','',str(n or '').lower()))
def book_look(name):
    """('person', key, scale) or (rig, key, post) for a creature named in the books, else None"""
    global _TABLE
    if _TABLE is None:
        p=_os.path.join(_os.path.dirname(_os.path.abspath(__file__)),'bestiary-looks.json'); _TABLE=_json.load(open(p)) if _os.path.exists(p) else {}
    n=_norm(name); hit=_TABLE.get(n) or (_TABLE.get(n.rstrip('s')) if n.endswith('s') else None)
    if not hit: return None
    key,sc=hit[0],hit[1]; rig,rest=key.split(':',1)
    if rig=='person': return ('person',rest,sc)
    return (rig,rest,{'scale':sc} if sc!=1 else {})
MUL=1.0   # set by the batch to draw a look larger or smaller for its true size (B2618)
def book_size(name):
    """the size word the books give a creature (tiny, small, man, large, huge, vast), or '' (B2618)"""
    book_look(name); n=_norm(name); hit=_TABLE.get(n) or (_TABLE.get(n.rstrip('s')) if n.endswith('s') else None)
    return hit[2] if hit and len(hit)>2 else ''
def walk(what):
    """the walk sheet of a monster that is not a person"""
    k,key,p=what
    if k=='beast': return post(B.sheet(B.KINDS[key]),**{q:v for q,v in p.items() if q!='scale'})   # a beast's size is set in its kind (B.MUL)
    if k=='critter' and MUL!=1: return post(Cr.sheet(dict(Cr.KINDS[key],big=Cr.KINDS[key].get('big',1)*MUL)),**{q:v for q,v in p.items() if q!='scale'})   # grown about its own feet
    sh=Cr.sheet(Cr.KINDS[key]) if k=='critter' else _own(OWN[key])
    if MUL!=1: p=dict(p,scale=p.get('scale',1)*MUL)
    elif p.get('scale') and p['scale']>1.0 and k!='own': p=dict(p,scale=min(p['scale'],1.25))   # a big beast stays inside its frame
    return post(sh,**p)
