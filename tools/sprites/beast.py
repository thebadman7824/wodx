# Four-legged animals on one rig (grown from wolf.py). Own art, same manner. Proportions per kind in KINDS.
import numpy as np, math
import crinos as K
from rig import ramp
S,SH=K.S,K.SH
def kind(**k):
    d=dict(s=1.0,heavy=1.0,bl=1.0,ll=1.0,ox=47,fur=(104,96,88),belly=None,head=(18,-37),hr=4.2,mz=7.5,mzr=2.8,ear=('prick',5.5),tail='brush',teeth=False,mane=None,antlers=None,horns=None,tusks=False,wd=1.0,furry=1.0,longface=0,eye=K.EYE,hump=0,neckr=1.0,snout=None,stripe=None,spots=None,humpx=0,wings=None,horn1=None,beak=None,spines=None,headfur=None,nonose=False,earcol=None)
    d.update(k); return d
KINDS=dict(
 wolf=kind(),
 hound=kind(s=.9,fur=(150,118,84),belly=(196,176,146),ear=('flop',5),tail='thin',furry=.3,heavy=.92,eye=(40,30,26)),
 mastiff=kind(s=1.05,heavy=1.25,fur=(132,104,76),ear=('flop',4),tail='thin',furry=.3,mz=6,mzr=3.3,hr=4.8,eye=(40,30,26)),
 cat=kind(s=.5,heavy=1.0,fur=(88,80,76),ear=('prick',4.5),tail='thin',mz=3.2,mzr=2.6,head=(15,-35),furry=.4,ll=.9,eye=(190,200,90)),
 rat=kind(s=.4,heavy=1.2,fur=(86,74,66),ear=('round',3.5),tail='thin',mz=6,ll=.55,head=(15,-26),furry=.4,eye=(20,16,16)),
 horse=kind(s=1.62,heavy=.95,ll=1.16,bl=1.12,ox=38,longface=1,fur=(112,76,48),head=(19,-40),hr=3.9,mz=10,mzr=3.1,ear=('prick',3.6),tail='horse',mane=(40,30,26),furry=.15,neckr=1.05,eye=(30,22,20)),
 pony=kind(s=1.25,heavy=1.08,ll=1.06,bl=1.1,ox=40,longface=1,fur=(150,128,96),head=(18,-39),hr=4.0,mz=9,mzr=3.1,ear=('prick',3.6),tail='horse',mane=(60,46,34),furry=.2,neckr=1.1,eye=(30,22,20)),
 bear=kind(s=1.45,heavy=1.5,ll=.82,ox=44,fur=(84,60,42),head=(17,-31),hr=5.0,mz=5.5,mzr=3.0,ear=('round',2.4),tail='none',furry=1.1,hump=2.5,eye=(20,16,14),neckr=1.3),
 boar=kind(s=.95,heavy=1.4,ll=.72,fur=(70,60,54),head=(15,-27),hr=4.4,mz=8,mzr=2.6,ear=('prick',3.2),tail='stub',tusks=True,furry=1.3,hump=2,eye=(20,16,14),neckr=1.3),
 stag=kind(s=1.3,heavy=0.9,ll=1.12,ox=44,fur=(140,104,70),belly=(206,190,160),head=(18,-36),hr=3.5,mz=6.5,mzr=2.3,longface=1,ear=('prick',4),tail='stub',antlers=(196,180,150),furry=.3,neckr=0.8,eye=(30,22,20)),
 bull=kind(s=1.45,heavy=1.45,ll=.9,bl=1.1,ox=42,fur=(64,52,46),head=(17,-31),hr=4.8,mz=6.5,mzr=3.4,ear=('flop',3),tail='tuft',horns=(206,196,170),furry=.3,hump=3,neckr=1.4,eye=(20,16,14)),
 goat=kind(s=.8,heavy=.95,ll=.95,fur=(196,188,170),head=(15,-38),hr=3.4,mz=5.5,mzr=2.2,ear=('flop',3.5),tail='stub',horns=(120,104,84),furry=.6,eye=(60,50,30)),
 sheep=kind(s=.82,heavy=1.35,ll=.8,fur=(214,206,188),head=(15,-32),hr=3.4,mz=5,mzr=2.3,ear=('flop',3),tail='stub',furry=1.4,snout=(60,52,48),eye=(20,16,14)),
 pig=kind(s=.85,heavy=1.4,ll=.68,fur=(206,160,150),head=(15,-26),hr=4.2,mz=6,mzr=2.8,ear=('flop',3.5),tail='stub',furry=.1,eye=(20,16,14),neckr=1.3),
 fox=kind(s=.6,heavy=.85,fur=(176,96,48),belly=(226,216,200),head=(17,-35),mz=7,mzr=2.2,ear=('prick',5.5),furry=.9,eye=(60,40,20)),
 lion=kind(s=1.35,heavy=1.2,ll=.95,ox=44,fur=(186,150,96),head=(17,-36),hr=5.0,mz=5,mzr=3.2,ear=('round',2.4),tail='tuft',mane=(120,84,48),furry=.3,eye=(190,160,60),teeth=True),
 tiger=kind(s=1.4,heavy=1.2,ll=.92,ox=44,fur=(200,128,56),belly=(226,216,200),head=(17,-35),hr=5.0,mz=5,mzr=3.2,ear=('round',2.4),tail='thin',furry=.3,stripe=(40,32,30),eye=(190,180,80),teeth=True),
 panther=kind(s=1.15,heavy=1.05,ll=.95,fur=(44,42,48),head=(17,-35),hr=4.6,mz=4.6,mzr=3.0,ear=('round',2.4),tail='thin',furry=.2,eye=(190,200,90)),
 # kinds for the animal actors the worlds hold (pixel-sprites/animal-actors.md)
 dog_small=kind(s=.5,fur=(170,140,100),belly=(214,196,166),ear=('flop',4),tail='thin',furry=.5,mz=5,head=(16,-35),eye=(40,30,26)),
 dog_medium=kind(s=.74,fur=(120,92,64),belly=(190,170,140),ear=('flop',4.5),tail='thin',furry=.4,mz=6.5,eye=(40,30,26)),
 wolf_alpha=kind(s=1.14,heavy=1.08,fur=(80,76,74),furry=1.2,teeth=True),
 wolf_cub=kind(s=.52,heavy=1.1,fur=(112,104,96),hr=5.0,mz=5,ll=.85,ear=('prick',4.5),head=(16,-35)),
 wolf_winter=kind(s=1.08,fur=(214,216,220),furry=1.3,eye=(120,170,210)),
 bobcat=kind(s=.66,heavy=1.1,fur=(160,124,88),belly=(214,200,176),ear=('prick',5),tail='stub',mz=3.4,mzr=2.8,head=(15,-35),furry=.8,spots=(84,62,44),eye=(190,200,90)),
 leopard=kind(s=1.15,heavy=1.05,ll=.95,fur=(204,160,88),belly=(230,218,196),head=(17,-35),hr=4.6,mz=4.6,mzr=3.0,ear=('round',2.4),tail='thin',furry=.2,spots=(52,40,32),eye=(190,200,90),teeth=True),
 horse_large=kind(s=1.76,heavy=1.1,ll=1.14,bl=1.12,ox=37,longface=1,fur=(84,60,44),head=(19,-40),hr=4.0,mz=10,mzr=3.3,ear=('prick',3.6),tail='horse',mane=(30,24,22),furry=.2,neckr=1.15,eye=(30,22,20)),
 warhorse=kind(s=1.72,heavy=1.12,ll=1.14,bl=1.12,ox=37,longface=1,fur=(52,46,46),head=(19,-41),hr=4.0,mz=10,mzr=3.3,ear=('prick',3.6),tail='horse',mane=(20,18,18),furry=.2,neckr=1.2,eye=(30,22,20)),
 mule=kind(s=1.42,heavy=1.0,ll=1.1,bl=1.1,ox=40,longface=1,fur=(108,90,74),belly=(190,176,156),head=(18,-38),hr=4.0,mz=9.5,mzr=3.2,ear=('prick',6.5),tail='horse',mane=(40,32,28),furry=.2,neckr=1.05,eye=(30,22,20)),
 camel=kind(s=1.5,heavy=1.08,ll=1.18,bl=1.05,ox=40,longface=1,fur=(196,160,110),head=(23,-35),hr=3.2,mz=6.5,mzr=2.7,ear=('round',1.6),tail='tuft',furry=.5,hump=7,humpx=-5,neckr=0.6,eye=(30,22,20)),
 cow=kind(s=1.36,heavy=1.35,ll=.9,bl=1.12,ox=42,fur=(150,96,60),belly=(226,214,196),head=(17,-30),hr=4.4,mz=6.5,mzr=3.2,ear=('flop',3),tail='tuft',horns=(206,196,170),furry=.2,neckr=1.2,snout=(214,176,160),eye=(20,16,14)),
 pig_small=kind(s=.6,heavy=1.35,ll=.68,fur=(214,170,160),head=(15,-26),hr=4.2,mz=5.5,mzr=2.8,ear=('flop',3.5),tail='stub',furry=.1,eye=(20,16,14),neckr=1.3),
 pig_large=kind(s=1.05,heavy=1.5,ll=.66,fur=(196,150,140),head=(15,-26),hr=4.4,mz=6,mzr=3.0,ear=('flop',3.5),tail='stub',furry=.1,eye=(20,16,14),neckr=1.3),
 boar_giant=kind(s=1.42,heavy=1.45,ll=.76,ox=44,fur=(52,46,44),head=(15,-27),hr=4.6,mz=8.5,mzr=2.8,ear=('prick',3.2),tail='stub',tusks=True,furry=1.6,hump=3,eye=(150,40,30),neckr=1.35),
 deer=kind(s=1.08,heavy=0.88,ll=1.1,ox=45,fur=(150,112,76),belly=(214,198,168),head=(18,-35),hr=3.3,mz=6,mzr=2.2,longface=1,ear=('prick',4.5),tail='stub',furry=.3,neckr=0.75,eye=(30,22,20)),
 white_hart=kind(s=1.34,heavy=0.9,ll=1.12,ox=44,fur=(226,226,222),head=(18,-36),hr=3.5,mz=6.5,mzr=2.3,longface=1,ear=('prick',4),tail='stub',antlers=(214,200,150),furry=.3,neckr=0.8,eye=(120,170,210)),
 hare=kind(s=.5,heavy=1.15,fur=(140,116,88),belly=(214,200,180),ear=('prick',8.5),tail='stub',mz=3.5,mzr=2.4,ll=.8,head=(14,-33),furry=.5,eye=(20,16,16)),
 chimpanzee=kind(s=.95,heavy=1.15,ll=.95,bl=.8,fur=(40,36,36),head=(13,-37),hr=4.4,mz=2.6,mzr=3.0,ear=('round',2.6),tail='none',furry=.9,snout=(170,130,110),eye=(30,22,20),neckr=1.1),
 alligator=kind(s=1.25,heavy=.9,ll=.36,bl=1.45,ox=46,fur=(70,84,60),belly=(170,170,120),head=(17,-27),hr=3.2,mz=12,mzr=2.6,ear=('none',0),tail='brush',furry=0,wd=1.5,teeth=True,eye=(200,190,60),neckr=1.0),
 # beasts of legend (monster.py names them): proportions after the old bestiaries, not after cartoons
 dragon=kind(s=1.5,heavy=1.15,ll=.82,bl=1.12,ox=45,fur=(62,84,58),belly=(176,160,104),head=(17,-40),hr=3.6,mz=8.5,mzr=2.6,longface=1,ear=('none',0),tail='brush',furry=0,neckr=.62,horns=(196,186,150),wings=((84,60,60),'bat',1.25),spines=(40,52,40),spots=(40,58,42),teeth=True,eye=(236,170,40),nonose=True),
 dragon_mist=kind(s=1.4,heavy=1.0,ll=.84,bl=1.14,ox=45,fur=(170,180,190),belly=(214,220,226),head=(17,-40),hr=3.4,mz=8.5,mzr=2.4,longface=1,ear=('none',0),tail='brush',furry=0,neckr=.58,horns=(226,228,232),wings=((150,160,176),'bat',1.2),spines=(140,150,164),teeth=True,eye=(190,230,240),nonose=True),
 gryphon=kind(s=1.35,heavy=1.15,ll=.98,ox=44,fur=(176,136,80),head=(17,-37),hr=4.2,mz=5.5,mzr=2.8,ear=('prick',3.2),tail='tuft',mane=(226,220,204),headfur=(226,220,204),furry=.3,beak=(214,170,60),wings=((120,90,60),'feather',1.2),eye=(236,190,60)),
 sphinx=kind(s=1.35,heavy=1.2,ll=.95,ox=44,fur=(196,160,104),head=(16,-37),hr=4.4,mz=1.6,mzr=2.6,ear=('none',0),tail='tuft',mane=(40,34,40),headfur=(170,124,90),furry=.2,wings=((150,120,84),'feather',1.0),eye=(40,30,26),nonose=True),
 unicorn=kind(s=1.5,heavy=.9,ll=1.16,bl=1.1,ox=40,longface=1,fur=(236,236,232),head=(19,-40),hr=3.7,mz=9.5,mzr=2.9,ear=('prick',3.6),tail='tuft',mane=(214,214,222),furry=.15,neckr=.95,horn1=(226,206,150),eye=(60,70,120)),
 salamander=kind(s=.5,heavy=.9,ll=.36,bl=1.4,ox=47,fur=(226,110,30),belly=(250,206,90),head=(17,-27),hr=3.2,mz=6,mzr=2.6,ear=('none',0),tail='brush',furry=0,wd=1.5,spots=(250,220,110),eye=(40,20,10),nonose=True),
 basilisk=kind(s=.62,heavy=.85,ll=.4,bl=1.45,ox=47,fur=(70,96,60),belly=(190,180,110),head=(17,-29),hr=3.0,mz=6.5,mzr=2.4,ear=('none',0),tail='brush',furry=0,wd=1.5,spines=(200,170,60),spots=(40,60,40),eye=(250,230,90),nonose=True),
 stone_dog=kind(s=1.0,heavy=1.3,fur=(122,122,126),wings=((96,96,102),'bat',.7),ear=('prick',4),tail='stub',furry=0,mz=6,mzr=3.2,hr=4.8,eye=(236,150,40),teeth=True),
 rock_cat=kind(s=1.3,heavy=1.2,ll=.95,ox=44,wings=((100,94,90),'bat',.45),fur=(128,120,112),head=(17,-35),hr=4.6,mz=4.6,mzr=3.0,ear=('prick',3.4),tail='thin',furry=0,spots=(96,90,86),eye=(236,50,40),teeth=True),
 zephyr=kind(s=1.18,heavy=.82,ll=1.2,bl=1.08,ox=42,longface=1,fur=(206,212,220),head=(19,-40),hr=3.6,mz=9,mzr=2.8,ear=('prick',3.6),tail='horse',mane=(236,238,242),furry=.15,neckr=.9,eye=(60,90,130)),
 familiar=kind(s=.5,heavy=1.0,fur=(30,28,34),ear=('prick',4.5),tail='thin',mz=3.2,mzr=2.6,head=(15,-35),furry=.4,ll=.9,eye=(230,60,40)),
 fae_cattle=kind(s=1.36,heavy=1.3,ll=.92,bl=1.12,ox=42,fur=(236,232,224),head=(17,-30),hr=4.4,mz=6.5,mzr=3.2,ear=('flop',3),tail='tuft',earcol=(170,44,40),horns=(226,216,190),furry=.2,neckr=1.2,snout=(214,176,160),eye=(150,40,36)),
)

def _wing_side(cv,a,P,r,bob,ph,dark):
    """one wing seen from the side: (colour, 'bat' or 'feather', size). The far one is drawn dark, behind the body."""
    col,kd,sz=a['wings']; wp=ramp(col); fl=math.sin(ph)*3.5; rt=P(4,-29+bob); el=P(-1,-29-8*sz+bob-fl*.5); tip=P(-9-4*sz,-29-11*sz+bob-fl); g='wing%d'%dark
    if kd=='bat':
        for (x,y) in ((-12-3*sz,-29-3*sz-fl*.6),(-9-2*sz,-27+sz-fl*.3),(-4,-26+sz)):
            cv.capsule(el,P(x,y+bob),r(2.2),r(1.6),ramp=[wp[0],wp[0],wp[1],wp[2],wp[3]],dark=dark,g=g+'m')
        cv.capsule(rt,el,r(1.5),r(1.2),ramp=wp,dark=dark,g=g); cv.capsule(el,tip,r(1.2),r(.6),ramp=wp,dark=dark,g=g)
    else:
        cv.capsule(rt,el,r(2.6),r(2.4),ramp=wp,dark=dark,g=g); cv.capsule(el,tip,r(2.6),r(1.2),ramp=wp,dark=dark,g=g)
        cv.capsule(el,P(-10-3*sz,-28-2*sz+bob-fl*.6),r(2.8),r(1.4),ramp=wp,dark=dark,g=g); cv.capsule(rt,P(-7-2*sz,-27+bob-fl*.3),r(2.6),r(1.6),ramp=wp,dark=dark,g=g)
def _wings_front(cv,a,P,r,bob,ph,dark):
    col,kd,sz=a['wings']; wp=ramp(col); fl=math.sin(ph)*3
    for sg in (-1,1):
        rt=P(sg*4,-27+bob); el=P(sg*(9+3*sz),-30-6*sz+bob-fl*.5); tip=P(sg*(13+6*sz),-27-2*sz+bob-fl); g='wing%d'%sg
        if kd=='bat':
            for (x,y) in ((12+5*sz,-22),(9+3*sz,-20),(6+sz,-21)): cv.capsule(el,P(sg*x,y+bob-fl*.4),r(2.0),r(1.5),ramp=[wp[0],wp[0],wp[1],wp[2],wp[3]],dark=dark,g=g+'m')
            cv.capsule(rt,el,r(1.5),r(1.2),ramp=wp,dark=dark,g=g); cv.capsule(el,tip,r(1.2),r(.6),ramp=wp,dark=dark,g=g)
        else:
            cv.capsule(rt,el,r(2.6),r(2.4),ramp=wp,dark=dark,g=g); cv.capsule(el,tip,r(2.6),r(1.2),ramp=wp,dark=dark,g=g); cv.capsule(el,P(sg*(11+4*sz),-21+bob-fl*.5),r(2.6),r(1.4),ramp=wp,dark=dark,g=g)
def side(a,f):
    cv=K.Cv(); ph=f/8*2*math.pi; s=a['s']; hv=a['heavy']; rp=ramp(a['fur']) if not isinstance(a['fur'],list) else a['fur']; bp=ramp(a['belly']) if a['belly'] else [tuple(min(255,int(c*1.22+10)) for c in t) for t in rp]
    P=lambda x,y:(a['ox']+x*a['bl']*s,87+y*a['ll']*s); r=lambda v:v*s*hv; rl=lambda v:v*s*(.6+.4*hv); bob=-abs(math.sin(ph))*.6/a['ll']; fu=a['furry']*s
    hx,hy=a['head']; hy+=bob
    def fore(p,dark,g):
        sw=math.sin(p); lift=max(0,math.cos(p))*2.5
        cv.capsule(P(9,-21+bob),P(8+sw*2.5,-12.5+bob),rl(2.8),rl(2.0),ramp=rp,fur=.6*fu,seed=1,dark=dark,g=g); cv.capsule(P(8+sw*2.5,-12.5+bob),P(8+sw*6,-2-lift),rl(1.9),rl(1.5),ramp=rp,dark=dark,g=g)
        cv.capsule(P(8+sw*6,-1.6-lift),P(10+sw*6,-1.4-lift),rl(1.6),rl(1.3),ramp=rp,dark=dark,g=g)
    def hind(p,dark,g):
        sw=math.sin(p); lift=max(0,math.cos(p))*2.5; st=(-7+sw*2,-12.5+bob); hk=(-12.5+sw*4.5,-7-lift*.5); pw=(-10.5+sw*6.5,-2-lift)
        cv.capsule(P(-10,-21+bob),P(*st),rl(3.8),rl(2.6),ramp=rp,fur=.8*fu,seed=2,dark=dark,g=g); cv.capsule(P(*st),P(*hk),rl(2.2),rl(1.6),ramp=rp,dark=dark,g=g); cv.capsule(P(*hk),P(*pw),rl(1.5),rl(1.4),ramp=rp,dark=dark,g=g)
        cv.capsule(P(pw[0],pw[1]+.4),P(pw[0]+2,pw[1]+.6),rl(1.6),rl(1.3),ramp=rp,dark=dark,g=g)
    t=a['tail']; wag=math.sin(ph)
    if t=='brush': cv.capsule(P(-13,-26+bob),P(-20,-21+bob+wag),r(2.6),r(2.4),ramp=rp,fur=1.2*fu,seed=3,g='tail'); cv.capsule(P(-20,-21+bob+wag),P(-25,-12+bob+math.sin(ph+1)*1.5),r(2.4),r(1.2),ramp=rp,fur=1.2*fu,seed=4,g='tail')
    elif t in('thin','tuft'):
        cv.capsule(P(-14,-27+bob),P(-21,-22+bob+wag),max(.7,r(1.1)),max(.6,r(.9)),ramp=rp,g='tail'); cv.capsule(P(-21,-22+bob+wag),P(-24,-13+bob+wag*1.5),max(.6,r(.9)),max(.5,r(.6)),ramp=rp,g='tail')
        if t=='tuft': cv.capsule(P(-24,-13+bob+wag*1.5),P(-24,-11+bob+wag*1.5),r(1.4),r(1.2),ramp=ramp(a['mane'] or tuple(int(c*.5) for c in a['fur'])),g='tuft')
    elif t=='horse': cv.capsule(P(-14.5,-27+bob),P(-17-wag,-10+bob),r(2.2),r(1.3),ramp=ramp(a['mane']),g='tail')
    elif t=='stub': cv.capsule(P(-15,-27+bob),P(-17,-25+bob),max(.7,r(1.2)),max(.6,r(.9)),ramp=rp,g='tail')
    if a['wings']: _wing_side(cv,a,P,r,bob,ph+.6,1)
    fore(ph+math.pi,1,'f1'); hind(ph,1,'h1')
    cv.capsule(P(7,-25+bob),P(-9,-24.5+bob),r(7),r(5.6),ramp=rp,fur=1.2*fu,seed=5,g='body')
    if a['hump']: cv.capsule(P(6+a['humpx'],-28-a['hump']+bob),P(-1+a['humpx'],-27+bob-(a['hump']*.5 if a['humpx'] else 0)),r(4.5),r(4),ramp=rp,fur=1.2*fu,seed=20,g='body')
    cv.capsule(P(2,-20+bob),P(-6,-21+bob),r(3.2),r(2.6),ramp=bp,fur=.8*fu,seed=6,g='body')
    cv.capsule(P(9,-28+bob),P(hx-2,hy+2),r(5.2)*a['neckr'],r(4.0)*a['neckr'],ramp=rp,fur=1.6*fu,seed=7,g='body')
    if a['mane']:
        mr=ramp(a['mane'])
        if a['tail']=='horse': cv.capsule(P(7,-31+bob),P(hx-3.5,hy-1),r(1.8),r(1.6),ramp=mr,g='mane')
        else: cv.capsule(P(10,-27+bob),P(hx-2.5,hy+1),r(6.2),r(5.6),ramp=mr,fur=1.8*s,seed=21,g='mane')
    hind(ph+math.pi,0,'h0'); fore(ph,0,'f0')
    if a['wings']: _wing_side(cv,a,P,r,bob,ph,0)
    if a['spines']:
        for x in range(-12,9,3): cv.capsule(P(x,-30+bob-(1 if x>-10 else 0)),P(x-1,-33+bob),max(.7,r(.9)),max(.4,r(.4)),ramp=ramp(a['spines']),g='spine')
    hp=ramp(a['headfur']) if a['headfur'] else rp
    hr=a['hr']; cv.capsule(P(hx,hy),P(hx+1.5,hy),r(hr),r(hr-.4),ramp=hp,fur=.8*fu if not a['headfur'] else 0,seed=8,g='head')
    mz=a['mz']; mp=ramp(a['beak']) if a['beak'] else ramp(a['snout']) if a['snout'] else hp
    if a['beak']: cv.capsule(P(hx+2,hy+.3),P(hx+2+mz*.7,hy+1.2),r(a['mzr']*.8),r(a['mzr']*.45),ramp=mp,g='beak'); cv.capsule(P(hx+2+mz*.7,hy+1.2),P(hx+2+mz*.75,hy+3.4),r(a['mzr']*.4),r(.5),ramp=mp,g='beak')
    else: cv.capsule(P(hx+2,hy+.5),P(hx+2+mz,hy+2.5),r(a['mzr']),r(a['mzr']*.6),ramp=mp,g='head'); cv.capsule(P(hx+2,hy+2.4),P(hx+.5+mz,hy+3.8),r(1.5),r(1.0),ramp=bp if not (a['snout'] or a['headfur']) else mp,g='jaw')
    ek,el=a['ear']
    if ek=='prick': cv.capsule(P(hx-1.5,hy-3),P(hx-2.5,hy-3-el),max(.7,r(1.7)),max(.4,r(.5)),ramp=rp,g='ear')
    elif ek=='flop': cv.capsule(P(hx-1.5,hy-2.5),P(hx-3,hy-2.5+el),max(.8,r(1.8)),max(.6,r(1.3)),ramp=ramp(a['earcol']) if a['earcol'] else [rp[0],rp[0],rp[1],rp[2],rp[3]],g='ear')
    elif ek=='round': cv.capsule(P(hx-1.5,hy-hr+.5),P(hx-1.6,hy-hr-.2),max(.8,r(el*.7)),max(.8,r(el*.7)),ramp=rp,g='ear')
    px=cv.px; q=P(hx+3+mz,hy+1.6)
    if not (a['beak'] or a['nonose']): px(q[0],q[1],K.NOSE)
    q=P(hx+3.4,hy-1.4); px(q[0],q[1],a['eye'])
    if a['horn1']: cv.capsule(P(hx+3,hy-hr+.8),P(hx+7.5,hy-hr-6.5),max(.8,r(.9)),.5,ramp=ramp(a['horn1']),g='horn1')
    if a['teeth']:
        for x in (4,6,8):
            if x<mz+2: q=P(hx+x,hy+3.2); px(q[0],q[1],K.TOOTH)
    if a['tusks']: q=P(hx+mz-1,hy+2.6); px(q[0],q[1],K.TOOTH); px(q[0],q[1]-1,K.TOOTH); px(q[0]+1,q[1]-2,K.TOOTH)
    if a['horns']:
        hn=ramp(a['horns']); cv.capsule(P(hx-.5,hy-hr+.8),P(hx+1.5,hy-hr-2.5),max(.7,r(1.0)),max(.5,r(.6)),ramp=hn,g='horn'); cv.capsule(P(hx+1.5,hy-hr-2.5),P(hx+3.5,hy-hr-3.2),max(.6,r(.7)),max(.4,r(.4)),ramp=hn,g='horn')
    if a['antlers']:
        an=ramp(a['antlers']); b0=(hx-.5,hy-hr+.5)
        for (x0,y0,x1,y1) in ((0,0,-2,-7),(-2,-7,-1,-12),(-1,-4,2.5,-7),(-2,-7,-5,-10),(-1.5,-9.5,1.5,-12.5)): cv.capsule(P(b0[0]+x0,b0[1]+y0),P(b0[0]+x1,b0[1]+y1),max(.6,r(.7)),max(.5,r(.5)),ramp=an,g='antler')
    cv.outline(); stripes(cv,a,rp); return cv.c
def stripes(cv,a,rp):
    if not (a['stripe'] or a['spots']) or rp not in cv.ramps: return
    sel=cv.rid==cv.ramps.index(rp); ys,xs=np.nonzero(sel)
    for y,x in zip(ys,xs):
        if a['stripe'] and (x+y//4)%5==0 and K.hsh(x,y//5)>.3: cv.c[y,x,:3]=a['stripe']
        if a['spots'] and (x%3==0 and y%3==(x//3)%2) and K.hsh(x,y)>.25: cv.c[y,x,:3]=a['spots']
def front(a,f,back=False):
    cv=K.Cv(); ph=f/8*2*math.pi; s=a['s']; hv=a['heavy']; rp=ramp(a['fur']); bp=ramp(a['belly']) if a['belly'] else [tuple(min(255,int(c*1.22+10)) for c in t) for t in rp]
    P=lambda x,y:(48+x*s*(.7+.3*hv),87+y*a['ll']*s); r=lambda v:v*s*hv; rl=lambda v:v*s*(.6+.4*hv); bob=-abs(math.sin(ph))*.6/a['ll']; fu=a['furry']*s; px=cv.px
    hy=a['head'][1]+bob+4; hr=a['hr']+.4; ek,el=a['ear']
    def ears(dark):
        for sg in (-1,1):
            if ek=='prick': cv.capsule(P(sg*hr*.65,hy-hr*.6),P(sg*hr*.95,hy-hr*.6-el),max(.7,r(1.7)),max(.4,r(.5)),ramp=rp,dark=dark,g='ear%d'%sg)
            elif ek=='flop': cv.capsule(P(sg*hr*.9,hy-hr*.4),P(sg*(hr+1.6),hy-hr*.4+el),max(.8,r(1.6)),max(.6,r(1.2)),ramp=ramp(a['earcol']) if a['earcol'] else [rp[0],rp[0],rp[1],rp[2],rp[3]],dark=dark,g='ear%d'%sg)
            elif ek=='round': cv.capsule(P(sg*hr*.75,hy-hr*.8),P(sg*hr*.8,hy-hr*.85),max(.8,r(el*.7)),max(.8,r(el*.7)),ramp=rp,dark=dark,g='ear%d'%sg)
            if a['horns']: hn=ramp(a['horns']); cv.capsule(P(sg*hr*.5,hy-hr*.8),P(sg*(hr+2),hy-hr-1.5),max(.7,r(1.0)),max(.5,r(.7)),ramp=hn,g='horn%d'%sg); cv.capsule(P(sg*(hr+2),hy-hr-1.5),P(sg*(hr+2.6),hy-hr-4),max(.6,r(.7)),max(.4,r(.4)),ramp=hn,g='horn%d'%sg)
            if a['antlers']:
                an=ramp(a['antlers'])
                for (x0,y0,x1,y1) in ((.5,0,2.5,-6),(2.5,-6,2,-11),(1.5,-3.5,5,-6),(2.5,-6,6,-9),(2.2,-9,4.5,-12)): cv.capsule(P(sg*(hr*.3+x0),hy-hr+y0),P(sg*(hr*.3+x1),hy-hr+y1),max(.6,r(.7)),max(.5,r(.5)),ramp=an,g='antler%d'%sg)
    for sgn,p in ((-1,ph),(1,ph+math.pi)):
        lift=max(0,math.sin(p))*2.2; x=sgn*(6.5 if not back else 4)*a['wd']
        cv.capsule(P(x,-19+bob),P(x,-10),rl(2.6),rl(1.9),ramp=rp,dark=1,g='far%d'%sgn); cv.capsule(P(x,-10),P(x,-1.8-lift),rl(1.8),rl(1.6),ramp=rp,dark=1,g='far%d'%sgn)
    if back:
        if hy<-36: cv.capsule(P(0,hy+3),P(0,-27+bob),r(4.0)*a['neckr'],r(5.0),ramp=rp,dark=1,g='neckb')
        cv.capsule(P(0,hy+2),P(0,hy+4),r(hr),r(hr+.2),ramp=rp,fur=.8*fu,seed=9,dark=1,g='head'); ears(1)
        if a['horn1']: cv.capsule(P(0,hy-hr+3),P(0,hy-hr-4.5),max(.8,r(.9)),.5,ramp=ramp(a['horn1']),g='horn1')
    if a['wings'] and not back: _wings_front(cv,a,P,r,bob,ph,1)
    cv.capsule(P(0,-25+bob),P(0,-18+bob),r(7.2),r(6.2),ramp=rp,fur=1.2*fu,seed=10,g='body')
    if a['wings'] and back: _wings_front(cv,a,P,r,bob,ph,0)
    if a['spines'] and back:
        for y in range(-30,-17,3): cv.capsule(P(0,y+bob),P(0,y-2+bob),max(.7,r(.9)),max(.4,r(.4)),ramp=ramp(a['spines']),g='spine')
    if a['hump'] and back: cv.capsule(P(0,-28-a['hump']+bob),P(0,-26+bob),r(4.6),r(5),ramp=rp,g='body')
    if not back: cv.capsule(P(0,-22+bob),P(0,-16+bob),r(3.2),r(2.6),ramp=bp,fur=.8*fu,seed=11,g='body')
    for sgn,p in ((-1,ph+math.pi),(1,ph)):
        lift=max(0,math.sin(p))*2.2; x=sgn*(4 if not back else 5.5)*a['wd']; g='near%d'%sgn
        cv.capsule(P(x,-18+bob),P(x*1.1,-9.5),rl(3.0 if back else 2.7),rl(2.0),ramp=rp,fur=.6*fu,seed=12+sgn,g=g); cv.capsule(P(x*1.1,-9.5),P(x*1.1,-1.8-lift),rl(1.9),rl(1.7),ramp=rp,g=g)
    if back:
        sw=math.sin(ph)*2; t=a['tail']; tr=ramp(a['mane']) if t=='horse' else rp
        if t in('brush','horse'): cv.capsule(P(0,-25+bob),P(sw*.5,-16+bob),r(2.8),r(2.4),ramp=tr,fur=1.2*fu,seed=14,g='tail'); cv.capsule(P(sw*.5,-16+bob),P(sw,-7+bob),r(2.4),r(1.2),ramp=tr,fur=1.2*fu,seed=15,g='tail')
        elif t in('thin','tuft'): cv.capsule(P(0,-25+bob),P(sw,-9+bob),max(.7,r(1.0)),max(.5,r(.7)),ramp=rp,g='tail')
        elif t=='stub': cv.capsule(P(0,-26+bob),P(0,-24+bob),max(.8,r(1.3)),max(.7,r(1.0)),ramp=rp,g='tail')
    else:
        cv.capsule(P(-4.5,hy+3.5),P(4.5,hy+3.5),r(4.2)*a['neckr'],r(4.2)*a['neckr'],ramp=rp,fur=1.6*fu,seed=16,g='body')
        if hy<-36: cv.capsule(P(0,hy+3),P(0,-27+bob),r(4.4)*a['neckr'],r(5.4),ramp=rp,g='body')
        if a['mane'] and a['tail']!='horse': cv.capsule(P(0,hy-1),P(0,hy+3),r(hr+2.6),r(hr+2.2),ramp=ramp(a['mane']),fur=1.8*s,seed=22,g='mane')
        hp=ramp(a['headfur']) if a['headfur'] else rp
        cv.capsule(P(0,hy-.5),P(0,hy+1),r(hr),r(hr-.4),ramp=hp,fur=.8*fu if not a['headfur'] else 0,seed=17,g='head'); ears(0)
        if a['horn1']: cv.capsule(P(0,hy-hr+1),P(0,hy-hr-6.5),max(.8,r(.9)),.5,ramp=ramp(a['horn1']),g='horn1')
        if a['mane'] and a['tail']=='horse': cv.capsule(P(0,hy-hr),P(0,hy-hr+2.5),r(1.6),r(1.3),ramp=ramp(a['mane']),g='mane')
        mzl=min(a['mz']*.55,5.5) if not a['longface'] else a['mz']*.8; mp=ramp(a['beak']) if a['beak'] else ramp(a['snout']) if a['snout'] else hp if a['headfur'] else bp
        cv.capsule(P(0,hy+1),P(0,hy+1+mzl),r(a['mzr']*.9),r(a['mzr']*.7),ramp=mp,g='muz')
        q=P(0,hy+2+mzl)
        if not (a['beak'] or a['nonose']): px(q[0],q[1],K.NOSE)
        for sg in (-1,1):
            q=P(sg*hr*.5,hy-1); px(q[0],q[1],a['eye'])
            if a['teeth']: q=P(sg*1.2,hy+3+mzl); px(q[0],q[1],K.TOOTH)
            if a['tusks']: q=P(sg*(a['mzr']*.9+.6),hy+1+mzl); px(q[0],q[1],K.TOOTH); px(q[0],q[1]-1,K.TOOTH)
    cv.outline(); stripes(cv,a,rp); return cv.c
def bite(a,i):
    """six frames of a lunge and bite, side view: the body draws back, springs, and the jaws snap"""
    if isinstance(a,str): a=KINDS[a]
    dx=[0,-2,-3,4,6,2][i]; im=side(a,[0,7,7,1,2,1][i]); out=np.zeros_like(im)
    if dx>=0: out[:,dx:]=im[:,:S-dx] if dx else im
    else: out[:,:dx]=im[:,-dx:]
    if i in(3,4):
        s=a['s']; hx,hy=a['head']; x0=a['ox']+(hx+3+a['mz'])*a['bl']*s+dx+2; y0=87+(hy+2)*a['ll']*s+K.YO
        for k in range(-3,4):
            for q,(col) in enumerate(((240,240,236),(200,60,50) if i==4 else (200,204,212))):
                x=int(round(x0+2-abs(k)*.5+q)); y=int(round(y0+k))
                if 0<=x<S and 0<=y<SH: out[y,x]=(*col,255)
    return out
def sheet(a):
    if isinstance(a,str): a=KINDS[a]
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=side(a,f)
        for row,im in ((0,front(a,f,True)),(1,r[:,::-1]),(2,front(a,f)),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=im
    return sh
if __name__=='__main__':
    from PIL import Image,ImageDraw,ImageFont
    names=list(KINDS); font=ImageFont.load_default(size=14)
    for part,ns in enumerate((['horse','pony','stag','tiger','cat'],)):
        im=Image.new('RGBA',(len(ns)*96*2,(SH*2-20)),(30,34,48,255))
        for i,n in enumerate(ns):
            a=KINDS[n]; im.alpha_composite(Image.fromarray(side(a,2)),(i*192,0)); im.alpha_composite(Image.fromarray(front(a,0)),(i*192+96,0))
            im.alpha_composite(Image.fromarray(side(a,1)),(i*192,SH-20)); im.alpha_composite(Image.fromarray(front(a,0,True)),(i*192+96,SH-20))
        im=im.resize((im.width*2,im.height*2),Image.NEAREST) if len(ns)<6 else im
        d=ImageDraw.Draw(im)
        for i,n in enumerate(ns): d.text((i*192+4,2),n,font=font,fill=(220,224,236))
        im.save('beast-test%d.png'%part)
