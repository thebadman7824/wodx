# Code-drawn people and forms in the same manner as crinos.py: capsule limbs, 5-tone ramps, dark outline.
import numpy as np, math
from PIL import Image
import crinos as K
S,SH,YO=K.S,K.SH,K.YO; R=math.radians; pol=K.pol
H=lambda c:tuple(int(c[i:i+2],16) for i in (1,3,5))
def ramp(b,warm=0):
    b=np.array(b,float); f=lambda k,sh=(0,0,0):tuple(int(v) for v in np.clip(b*k+np.array(sh),0,255))
    return [f(.30,(-4,-4,6)),f(.62),f(.86),f(1.0),f(1.16,(6,6,4))]
INK=(30,26,28)
def base(**k):
    d=dict(skin=(214,170,140),hair=('#3a2a1c','short'),beard=None,top=('#6a6a70','shirt'),sleeve='long',legs=('#3c4a66','trousers'),feet='#2a2422',
           sw=7.0,thin=1.0,eyes=(40,30,30),horns=None,wings=None,post=None,mark=None,ink=INK)
    d.update(k); return d
def kin(ph,goat=False,amp=1.0):
    """leg/arm joints for the side view; returns dict for near (0) and far (1) limbs and a y shift that keeps the lower foot on the ground"""
    out={}
    for i,p in ((0,ph),(1,ph+math.pi)):
        sw=math.sin(p); lift=max(0,math.cos(p))
        hip=(47+(-1 if i else 1)*0.5,57)
        if goat:
            knee=pol(hip,R(26)+R(20)*sw,11); hock=pol(knee,R(-34)+R(16)*sw-R(14)*lift,10); toe=pol(hock,R(8)+R(18)*sw+R(24)*lift,9)
            pts=[hip,knee,hock,toe]
        else:
            th=R(24)*amp*sw; knee=pol(hip,th,14.5); ank=pol(knee,th-R(6)-R(38)*amp*lift*(1 if sw<0.3 else .4),13.5)
            pts=[hip,knee,ank]
        ua=-R(20)*sw; sh=(47,40.5); el=pol(sh,ua,9.5); wr=pol(el,ua+R(14),9)
        out[i]=dict(leg=pts,arm=[sh,el,wr])
    low=max(out[0]['leg'][-1][1],out[1]['leg'][-1][1]); dy=(85.5 if not goat else 86)-low
    for i in out:
        for key in ('leg','arm'): out[i][key]=[(x,y+dy) for x,y in out[i][key]]
    return out,dy
def draw_leg_side(cv,pts,d,dark):
    col,kind=d['legs']; t=d['thin']
    if kind=='goat':
        fr=ramp(H(col)); hip,knee,hock,toe=pts
        cv.capsule(hip,knee,3.6*t,2.6*t,ramp=fr,fur=1.0,seed=31,dark=dark,g='L%d'%id(pts)); cv.capsule(knee,hock,2.2*t,1.6,ramp=fr,fur=.7,seed=32,dark=dark,g='L%d'%id(pts)); cv.capsule(hock,toe,1.5,1.4,ramp=fr,dark=dark,g='L%d'%id(pts))
        cv.capsule(toe,(toe[0]+2,toe[1]+.6),1.5,1.3,ramp=ramp((40,34,30)),dark=dark,g='L%d'%id(pts)); return
    lr=ramp(d['skin']) if kind in('bare','skirt') else ramp(H(col)); hip,knee,ank=pts
    if kind=='robe': dark=dark+1
    cv.capsule(hip,knee,3.3*t,2.6*t,ramp=lr,dark=dark,g='L%d'%id(pts)); cv.capsule(knee,ank,2.5*t,1.9*t,ramp=lr,dark=dark,g='L%d'%id(pts))
    cv.capsule((ank[0]-.5,ank[1]+.6),(ank[0]+3.2,ank[1]+1.2),1.7,1.5,ramp=ramp(H(d['feet'])),dark=dark,g='L%d'%id(pts))
def draw_arm_side(cv,pts,d,dark):
    tr=ramp(H(d['top'][0])); sk=ramp(d['skin']); t=d['thin']; sh,el,wr=pts
    bare=d['top'][1]=='bare'
    cv.capsule(sh,el,2.4*t,2.0*t,ramp=sk if bare or d['sleeve']=='none' else tr,dark=dark,g='A%d'%id(pts))
    cv.capsule(el,wr,1.9*t,1.6*t,ramp=tr if d['sleeve']=='long' and not bare else sk,dark=dark,g='A%d'%id(pts))
    cv.capsule(wr,(wr[0]+.4,wr[1]+2),1.6,1.4,ramp=sk,dark=dark,g='A%d'%id(pts))
def torso_ramp(d): return ramp(d['skin']) if d['top'][1]=='bare' else ramp(H(d['top'][0]))
def head_side(cv,d,dy):
    sk=ramp(d['skin']); hr=ramp(H(d['hair'][0])); st=d['hair'][1]; cy=31.5+dy; cx=48
    if st in('long','bun'): cv.capsule((cx-2.5,cy),(cx-3,cy+(9 if st=='long' else 2)),3.6,2.6 if st=='long' else 3,ramp=hr)
    cv.capsule((cx,36.5+dy),(cx-.5,39+dy),1.9,2.1,ramp=sk,g='head')
    pid=cv.capsule((cx,cy-1),(cx+.6,cy+1.2),4.2,3.8,ramp=sk,g='head')
    cv.px(cx+5,cy+1,sk[2]); cv.px(cx+2.4,cy,d['eyes'])
    if d['beard']:
        for (x,y) in ((2,3),(3,3),(1,4),(2,4),(3,4),(0,3),(2,5),(1,5),(4,2),(3,2)): cv.px(cx+x,cy+y,ramp(H(d['beard']))[2])
    if st!='bald':
        for y in range(int(cy-8),int(cy+5)):
            for x in range(cx-7,cx+7):
                dx=x-cx; dyy=y-(cy-.6)
                if dx*dx+dyy*dyy<=5.5**2 and (dyy<-1.2 or dx<-1.4-(dyy*.25)) and not (dx>2.2 and dyy>-2.6):
                    k=3 if (-dx*.5-dyy*.8)>2 else 2 if dyy<1 else 1; cv.px(x,y,hr[k],pid)
    if st=='bun': cv.capsule((cx-5,cy-3),(cx-5.5,cy-3),2.2,2.2,ramp=hr)
    if d['horns']:
        hn=ramp(H(d['horns'])); cv.capsule((cx+.5,cy-4),(cx-3,cy-5.5),1.4,1.3,ramp=hn); cv.capsule((cx-3,cy-5.5),(cx-5,cy-2.5),1.3,1.0,ramp=hn); cv.capsule((cx-5,cy-2.5),(cx-3.4,cy-.5),1.0,.7,ramp=hn)
def wings_side(cv,d,dy):
    wr=ramp(H(d['wings'])); root=(44,42+dy); top=(36,22+dy)
    for i in range(6):
        t=i/5; p=(top[0]+(root[0]-top[0])*t*.8, top[1]+(root[1]-top[1])*t*.8); tip=(p[0]-5-3*(1-t),p[1]+52-24*t)
        cv.capsule(p,tip,2.6,1.2,ramp=wr,dark=1 if i%2 else 0)
    cv.capsule(root,top,2.8,2.4,ramp=wr)
def side(d,f):
    cv=K.Cv(); ph=f/8*2*math.pi; goat=d['legs'][1]=='goat'; k,dy=kin(ph,goat,.45 if d['legs'][1]=='robe' else .7 if d['legs'][1]=='skirt' else 1); tr=torso_ramp(d); kind=d['top'][1]; lk=d['legs'][1]
    if d['wings']: wings_side(cv,d,dy)
    draw_arm_side(cv,k[1]['arm'],d,1); draw_leg_side(cv,k[1]['leg'],d,1); draw_leg_side(cv,k[0]['leg'],d,0)
    hipc=(47,55+dy)
    if lk not in('goat','bare','skirt','robe'): cv.capsule((47,53+dy),(47,57+dy),3.8,3.6,ramp=ramp(H(d['legs'][0])),g='body')
    if lk=='goat': cv.capsule((47,53+dy),(46.6,57+dy),4.0,3.8,ramp=ramp(H(d['legs'][0])),fur=.8,seed=40,g='body')
    if lk=='skirt': cv.capsule((47,53+dy),(47,70+dy),3.8,5.2,ramp=ramp(H(d['legs'][0])),g='body')
    cv.capsule((47,41.5+dy),(47,52+dy),4.4*d['thin'],3.6*d['thin'],ramp=tr,g='body')
    if kind=='coat': cv.capsule((47,52+dy),(47+math.sin(ph)*.6,66+dy),3.5,4.0,ramp=tr,g='body')
    if kind=='robe': cv.capsule((47,52+dy),(47+math.sin(ph)*.8,82+dy),3.8,5.6,ramp=tr,g='body')
    if kind=='vest': cv.capsule((47.5,42+dy),(47.5,50+dy),2.2,2.0,ramp=ramp(d['skin']),g='body')
    if d['mark']: 
        for x in (46,47,48,49): cv.px(x,38+dy,d['mark'])
    head_side(cv,d,dy); draw_arm_side(cv,k[0]['arm'],d,0)
    cv.outline(d['ink']); return cv.c
def wings_front(cv,d,dy,cx):
    wr=ramp(H(d['wings']))
    for sgn in (-1,1):
        root=(cx+sgn*3,43+dy); wrist=(cx+sgn*20,18+dy)
        n=15
        for i in range(n):                       # flight feathers, outermost first, fanning from the wrist round to the body
            t=i/(n-1); p=(wrist[0]+(root[0]-wrist[0])*t*.8, wrist[1]+(root[1]-wrist[1])*t*.8)
            a=R(118-t*100); L=39-15*t
            tip=(p[0]+sgn*math.sin(a)*L*.75, p[1]-math.cos(a)*L)
            cv.capsule(p,tip,2.4,1.0,ramp=wr,dark=1 if i%2 else 0)
        for i in range(8):                        # shorter covering feathers along the wing arm
            t=i/7; p=(wrist[0]+(root[0]-wrist[0])*t*.85, wrist[1]+(root[1]-wrist[1])*t*.85); a=R(150-t*40)
            cv.capsule(p,(p[0]+sgn*math.sin(a)*10,p[1]-math.cos(a)*12),2.6,1.6,ramp=wr)
        cv.capsule(root,wrist,3.0,2.4,ramp=wr)
def front(d,f,back=False):
    cv=K.Cv(); ph=f/8*2*math.pi; cx=48; t=d['thin']; sw=d['sw']; tr=torso_ramp(d); sk=ramp(d['skin']); kind=d['top'][1]; lk=d['legs'][1]; hr=ramp(H(d['hair'][0])); st=d['hair'][1]
    dy=round(abs(math.sin(ph))*-0.8)
    if d['wings'] and not back: wings_front(cv,d,dy,cx)
    if st=='long' and not back: cv.capsule((cx,31+dy),(cx,41+dy),5.0,4.6,ramp=hr,dark=1)
    lr=ramp(d['skin']) if lk in('bare','skirt','robe') else ramp(H(d['legs'][0]))
    for sgn,p in ((-1,ph),(1,ph+math.pi)):
        lift=max(0,math.sin(p))*3.2; hip=(cx+sgn*3,57+dy); knee=(cx+sgn*3.4,71-lift*.7); ank=(cx+sgn*3.2,84.5-lift)
        if lk=='goat':
            fr=ramp(H(d['legs'][0])); hock=(cx+sgn*2.6,77-lift)
            cv.capsule(hip,(cx+sgn*4,67-lift*.5),3.6,2.8,ramp=fr,fur=1.0,seed=50+sgn,g='L%d'%sgn); cv.capsule((cx+sgn*4,67-lift*.5),hock,2.4,1.6,ramp=fr,fur=.6,seed=52+sgn,g='L%d'%sgn); cv.capsule(hock,(cx+sgn*3,84-lift),1.5,1.5,ramp=fr,g='L%d'%sgn)
            cv.capsule((cx+sgn*3,85-lift),(cx+sgn*3,86-lift),1.8,1.6,ramp=ramp((40,34,30)),g='L%d'%sgn)
        else:
            cv.capsule(hip,knee,3.3*t,2.6*t,ramp=lr,g='L%d'%sgn); cv.capsule(knee,ank,2.5*t,1.9*t,ramp=lr,g='L%d'%sgn)
            cv.capsule((ank[0],ank[1]+.8),(ank[0]+sgn*.6,ank[1]+1.6),1.9,1.8,ramp=ramp(H(d['feet'])),g='L%d'%sgn)
    if lk not in('goat','bare','skirt','robe'): cv.capsule((cx-2.4,55+dy),(cx+2.4,55+dy),4.0,4.0,ramp=lr,g='body')
    if lk=='goat': cv.capsule((cx-2.4,55+dy),(cx+2.4,55+dy),4.2,4.2,ramp=ramp(H(d['legs'][0])),fur=.8,seed=41,g='body')
    if lk=='skirt': cv.capsule((cx,54+dy),(cx,70+dy),6.0,7.4,ramp=ramp(H(d['legs'][0])),g='body')
    if kind=='coat': cv.capsule((cx,53+dy),(cx,66+dy),5.0,6.0,ramp=tr,g='body')
    if kind=='robe': cv.capsule((cx,52+dy),(cx,82+dy),6.0,8.2,ramp=tr,g='body')
    cv.capsule((cx-sw+2.4,41.5+dy),(cx+sw-2.4,41.5+dy),2.8,2.8,ramp=tr,g='body')
    cv.capsule((cx,43+dy),(cx,53+dy),(sw-.6)*t,(sw-1.8)*t,ramp=tr,g='body')
    if kind=='vest' and not back: cv.capsule((cx,42+dy),(cx,52+dy),2.4,2.0,ramp=sk,g='body')
    if kind=='coat' and not back:
        for y in range(47,68): cv.px(cx,y+dy,tr[0] if y>55 else tr[1])
        for i in range(7):
            for sg in (-1,1): cv.px(cx+sg*(3-i//2.4),40+i+dy,tr[4]); cv.px(cx+sg*(4-i//2.4),40+i+dy,tr[1])
        for y in (49,53): cv.px(cx+1,y+dy,tr[4])
        for sg in (-1,1):
            for x in (3,4): cv.px(cx+sg*x,57+dy,tr[1])
        for i,y in enumerate(range(40,47)):
            for x in range(-(2-i//3),(2-i//3)+1): cv.px(cx+x,y+dy,(214,210,202) if x else (188,184,178))
    for sgn,p in ((-1,ph+math.pi),(1,ph)):
        s=math.sin(p)*1.6; shd=(cx+sgn*sw,41.5+dy); el=(cx+sgn*(sw+1.4),50.5+dy+s*.5); wr=(cx+sgn*(sw+1.2),59+dy+s)
        bare=kind=='bare'
        cv.capsule(shd,el,2.4*t,2.0*t,ramp=sk if bare or d['sleeve']=='none' else tr,g='A%d'%sgn); cv.capsule(el,wr,1.9*t,1.6*t,ramp=tr if d['sleeve']=='long' and not bare else sk,g='A%d'%sgn)
        cv.capsule(wr,(wr[0],wr[1]+2),1.6,1.4,ramp=sk,g='A%d'%sgn)
    cv.capsule((cx,36.5+dy),(cx,39+dy),1.9,2.1,ramp=sk,g='head')
    if d['mark'] and not back:
        for x in range(cx-2,cx+3): cv.px(x,38+dy,d['mark'])
    cy=31.5+dy; pid=cv.capsule((cx,cy-1),(cx,cy+1.2),4.1,3.7,ramp=sk if not back or st=='bald' else hr,g='head')
    if not back:
        cv.px(cx-2,cy+.4,d['eyes']); cv.px(cx+2,cy+.4,d['eyes'])
        if d['beard']:
            br=ramp(H(d['beard']))
            for (x,y) in ((-3,2),(3,2),(-3,3),(-2,3),(2,3),(3,3),(-2,4),(-1,4),(0,4),(1,4),(2,4),(-1,5),(0,5),(1,5)): cv.px(cx+x,cy+y,br[2])
        if st!='bald':
            for y in range(int(cy-8),int(cy+3)):
                for x in range(cx-7,cx+8):
                    dx=x-cx; dyy=y-(cy-.6)
                    if dx*dx+dyy*dyy<=5.4**2 and (dyy<-1.6 or (abs(dx)>3.3 and dyy<(4 if st=='long' else 1.5))):
                        cv.px(x,y,hr[3 if (dx<0 and dyy<-3) else 2 if dyy<0 else 1],pid)
    if st=='bun': cv.capsule((cx,cy-(5.5 if not back else 2)),(cx,cy-(5.5 if not back else 2)),2.3,2.3,ramp=hr)
    if st=='long' and back: cv.capsule((cx,cy+2),(cx,42+dy),4.6,4.2,ramp=hr)
    if d['horns']:
        hn=ramp(H(d['horns']))
        for sgn in (-1,1):
            cv.capsule((cx+sgn*2.5,cy-4),(cx+sgn*5.5,cy-5.5),1.4,1.3,ramp=hn); cv.capsule((cx+sgn*5.5,cy-5.5),(cx+sgn*7,cy-2.5),1.3,1.0,ramp=hn); cv.capsule((cx+sgn*7,cy-2.5),(cx+sgn*5.6,cy-.5),1.0,.7,ramp=hn)
    if d['wings'] and back: wings_front(cv,d,dy,cx)
    cv.outline(d['ink']); return cv.c
def post(img,d,row):
    a=img.astype(float)
    if d['post']=='wraith':
        g=a[...,:3].mean(-1,keepdims=True); a[...,:3]=np.clip((a[...,:3]*.35+g*.65)*np.array([.82,.98,1.2])+np.array([10,18,30]),0,255)
        ys=np.arange(SH)[:,None]-YO; fade=np.clip((90-ys)/26,0,1); a[...,3]*=.6*fade
    if d['post']=='radiance':
        m=a[...,3]>0; dist=np.full(m.shape,99.0); cur=m.copy()
        for i in range(1,6):
            n=cur.copy(); n[1:]|=cur[:-1]; n[:-1]|=cur[1:]; n[:,1:]|=cur[:,:-1]; n[:,:-1]|=cur[:,1:]
            dist[n&~cur]=i; cur=n
        jew=[(230,70,90),(240,190,70),(90,210,130),(90,150,240),(180,110,230)]
        ys,xs=np.nonzero((dist<99))
        for y,x in zip(ys,xs):
            ang=math.atan2(y-(55+YO),x-48); c=jew[int((ang+math.pi)/(2*math.pi)*10)%5]
            if (x+y)%2==0 or dist[y,x]<3: a[y,x]=(*c,int(150-22*dist[y,x]))
    return a.clip(0,255).astype(np.uint8)
def sheet(d):
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=side(d,f)
        for row,im in ((0,front(d,f,True)),(1,r[:,::-1]),(2,front(d,f)),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=post(im,d,row)
    return sh
