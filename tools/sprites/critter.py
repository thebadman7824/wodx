# Animals that are not four-legged walkers: birds, bats, snakes, spiders. Own art, same manner as beast.py.
import numpy as np, math
import crinos as K
from rig import ramp
S,SH=K.S,K.SH
def flyer(**k):
    d=dict(plan='flyer',s=1.0,col=(60,56,60),belly=None,wing=None,span=9.0,neck=0,beak=(200,160,60),beakl=2,alt=22,ears=False,tail=4.0,eye=(20,16,16),membrane=False); d.update(k); return d
def crawler(**k):
    d=dict(plan='snake',col=(84,100,60),belly=(190,180,120),L=30,r=1.6,band=None,eye=(20,16,16),comb=None); d.update(k); return d
KINDS=dict(
 bird_small=flyer(s=.55,col=(120,96,72),belly=(200,180,150),alt=16,span=7),
 bird_large=flyer(s=1.0,col=(110,84,60),belly=(206,190,160),span=11,beak=(210,180,70),alt=24),
 hawk=flyer(s=.95,col=(120,90,62),belly=(214,200,170),span=11,beak=(210,180,70),alt=26),
 crow=flyer(s=.8,col=(36,36,44),span=9,beak=(30,30,34),alt=20),
 raven=flyer(s=.92,col=(30,30,38),span=10,beak=(30,30,34),beakl=3,alt=22),
 owl=flyer(s=.95,col=(140,116,84),belly=(214,200,176),span=10,beak=(190,160,90),beakl=1,alt=22,eye=(230,190,60)),
 swan=flyer(s=1.3,col=(232,232,228),span=12,neck=8,beak=(220,130,50),beakl=3,alt=18),
 bat=flyer(s=.6,col=(52,44,48),wing=(72,58,60),span=10,beak=None,ears=True,tail=0,alt=24,membrane=True),
 snake_poisonous=crawler(col=(96,104,60),band=(40,40,30),L=24,r=1.3),
 snake_constrictor=crawler(col=(120,100,60),band=(60,44,30),L=40,r=2.3),
 spider=dict(plan='spider',col=(40,34,34),r=2.2),
 # creatures of legend (monster.py names them)
 razor_bat=flyer(s=.8,col=(96,96,104),wing=(120,120,128),span=11,beak=None,ears=True,tail=0,alt=24,membrane=True,eye=(220,60,40)),
 basilisk=crawler(col=(84,110,60),band=(46,66,40),L=16,r=1.3,comb=(200,40,36),eye=(250,230,90)),
 spider_giant=dict(plan='spider',col=(104,84,66),r=2.2,big=2.6),
 spider_squid=dict(plan='spider',col=(96,72,128),r=2.2,big=2.4,arms=(140,110,170)),
)
def _flyer(a,f,view):
    cv=K.Cv(); ph=f/8*2*math.pi; s=a['s']; rp=ramp(a['col']); bp=ramp(a['belly']) if a['belly'] else rp; wp=ramp(a['wing']) if a['wing'] else rp
    fl=math.sin(ph); cx=48; cy=87-a['alt']-fl*1.2; sp=a['span']*s; px=cv.px
    if view=='s':
        if a['tail']: cv.capsule((cx-4*s,cy),(cx-(4+a['tail'])*s,cy+.6),1.6*s,1.0*s,ramp=rp,g='tail')
        cv.capsule((cx-3*s,cy),(cx+3*s,cy-.5),3.0*s,2.6*s,ramp=rp,g='body'); cv.capsule((cx-2*s,cy+1.2*s),(cx+2*s,cy+1*s),1.9*s,1.6*s,ramp=bp,g='body')
        hx,hy=cx+5*s,cy-1.5*s
        if a['neck']: n=a['neck']*s; cv.capsule((cx+3*s,cy-1),(cx+3*s+n,cy-1-n*.25),1.5*s,1.2*s,ramp=rp,g='body'); hx,hy=cx+3*s+n+1,cy-1-n*.25-.5
        cv.capsule((hx,hy),(hx+.5,hy),2.2*s,2.0*s,ramp=rp,g='head')
        if a['beak']:
            for i in range(a['beakl']): px(hx+2.2*s+i+.5,hy+.4,a['beak'])
        if a['ears']: px(hx-.5,hy-2.4*s-.5,rp[1]); px(hx+.8,hy-2.4*s-.5,rp[1])
        px(hx+1*s,hy-.5,a['eye'])
        tip=(cx-1.5*s-abs(fl)*1.0,cy-1-fl*sp*.85); mid=((cx+tip[0])/2-1,(cy-1+tip[1])/2)
        cv.capsule((cx+.5,cy-1),mid,2.6*s,2.2*s,ramp=wp,g='wing'); cv.capsule(mid,tip,2.2*s,1.0*s,ramp=wp,g='wing')
    else:
        back=view=='b'
        for sg in (-1,1):
            mid=(cx+sg*sp*.55,cy-fl*sp*.28); tip=(cx+sg*sp*(1.05-abs(fl)*.12),cy-fl*sp*.62+(.8 if fl<0 else 0))
            cv.capsule((cx+sg*2*s,cy-.5),mid,(2.4 if a['membrane'] else 1.9)*s,(2.2 if a['membrane'] else 1.6)*s,ramp=wp,g='w%d'%sg); cv.capsule(mid,tip,(2.0 if a['membrane'] else 1.5)*s,.8*s,ramp=wp,g='w%d'%sg)
            if a['membrane']:
                for t in (.35,.7): q=(cx+sg*sp*t,cy-fl*sp*.3*t+2.2*s+1); px(q[0],q[1],wp[1])
        if a['tail'] and back: cv.capsule((cx,cy+1),(cx,cy+(2+a['tail']*.7)*s),1.8*s,1.2*s,ramp=rp,g='tail')
        cv.capsule((cx,cy-1*s),(cx,cy+1.6*s),2.8*s,2.5*s,ramp=rp if back else bp,g='body')
        hy=cy-3.4*s-(a['neck']*s*.5 if a['neck'] else 0)
        if a['neck']: cv.capsule((cx,cy-2*s),(cx,hy+1),1.4*s,1.2*s,ramp=rp,g='body')
        cv.capsule((cx,hy),(cx,hy+.3),2.2*s,2.1*s,ramp=rp,g='head')
        if a['ears']: px(cx-1.6*s-.5,hy-2.2*s-.5,rp[1]); px(cx+1.6*s+.5,hy-2.2*s-.5,rp[1])
        if not back:
            px(cx-1.1*s,hy-.3,a['eye']); px(cx+1.1*s,hy-.3,a['eye'])
            if a['beak']: px(cx,hy+1.2*s,a['beak']); px(cx,hy+1.2*s+1,a['beak']) if a['beakl']>1 else None
    cv.outline(); return cv.c
def _snake(a,f,view):
    cv=K.Cv(); ph=f/8*2*math.pi; rp=ramp(a['col']); L=a['L']; r=a['r']; n=int(L); pts=[]
    for i in range(n+1):
        t=i/n                                  # 0 tail, 1 head
        if view=='s': pts.append((48-L/2+t*L,86-r+math.sin(i*.55-ph)*(1.3+r*.3)*(1-t*.5)-(2.2*r if t>.9 else 0)*(t-.9)*10))
        else:
            y=(86-L*.62)+t*L*.62 if view=='f' else 86-t*L*.62
            pts.append((48+math.sin(i*.6-ph)*(2.4+r)*(1-t*.4),y))
    for i in range(n):
        t=i/n; rr=r*(.35+.65*min(1,t*4))*(1 if t<.92 else 1.25); cv.capsule(pts[i],pts[i+1],rr,rr,ramp=rp,g='b')
    cv.outline()
    if a['band']:
        for i in range(2,n-2,4):
            x,y=pts[i]; rr=int(r+1)
            for d in range(-rr,rr+1):
                q=(int(round(x)),int(round(y+d))+K.YO) if view=='s' else (int(round(x+d)),int(round(y))+K.YO)
                if 0<=q[1]<SH and 0<=q[0]<S and cv.c[q[1],q[0],3] and True: 
                    if abs(d)<rr: cv.c[q[1],q[0],:3]=a['band']
    hx,hy=pts[-1]
    if a['comb']:   # a cock's head on the serpent: a red comb, a wattle and a yellow beak
        Y=lambda y:int(round(y))+K.YO; X=lambda x:int(round(x)); cb=(*a['comb'],255); bk=(226,180,60,255)
        if view=='s':
            for (dx,dy) in ((-1,-3),(0,-3),(1,-3),(0,-4),(-1,-2)): cv.c[Y(hy+dy),X(hx+dx)]=cb
            cv.c[Y(hy),X(hx+3)]=bk; cv.c[Y(hy),X(hx+2)]=bk; cv.c[Y(hy+2),X(hx+1)]=cb
        else:
            for (dx,dy) in ((0,-3),(0,-4),(-1,-3),(1,-3)): cv.c[Y(hy+dy+(0 if view=='f' else 1)),X(hx+dx)]=cb
            if view=='f': cv.c[Y(hy+1),X(hx)]=bk; cv.c[Y(hy+2),X(hx)]=cb
    if view=='s': cv.c[int(round(hy-.5))+K.YO,int(round(hx)),:3]=a['eye']
    elif view=='f':
        for sg in (-1,1): cv.c[int(round(hy-1))+K.YO,int(round(hx+sg*max(1,r*.6))),:3]=a['eye']
    return cv.c
def _spider(a,f,view):
    cv=K.Cv(); ph=f/8*2*math.pi; rp=ramp(a['col']); r=a['r']; cx,cy=48,82
    u={'s':(1,0),'f':(0,.8),'b':(0,-.8)}[view]; v=(-u[1],u[0]) if view=='s' else (1,0)
    for k in range(4):
        for sg in (-1,1):
            w=math.sin(ph+k*1.6+(0 if sg>0 else math.pi))*1.0; along=(k-1.5)*1.3+w
            base=(cx+u[0]*(1.5+along*.4),cy+u[1]*(1.5+along*.4)); 
            for t in range(1,7):
                bend=1.6 if t<4 else 1.6-(t-3)*1.0
                x=base[0]+v[0]*sg*t*1.0+u[0]*along*t*.28; y=base[1]+(v[1]*sg*t*1.0 if view=='s' else 0)+u[1]*along*t*.28-(bend if view!='s' else 0)
                if view=='s': y=base[1]-bend+ (t*.9 if t>3 else 0)*0+ (t-3 if t>3 else 0)*.9; x=base[0]+along*.9+sg*0+ (t*.9)*(1 if (k%2==0) else -1)*.0 + (k-1.5)*t*.55
                cv.px(x,y,rp[1])
    cv.capsule((cx-u[0]*2.2,cy-u[1]*2.2),(cx-u[0]*2.6,cy-u[1]*2.6),r,r,ramp=rp,g='ab'); cv.capsule((cx+u[0]*1.2,cy+u[1]*1.2),(cx+u[0]*1.6,cy+u[1]*1.6),r*.65,r*.65,ramp=rp,g='hd')
    cv.outline(); return cv.c
def frame(a,f,view):
    if isinstance(a,str): a=KINDS[a]
    im={'flyer':_flyer,'snake':_snake,'spider':_spider}[a['plan']](a,f,view)
    if a.get('big'):
        from PIL import Image
        k=a['big']; w,h=round(S*k),round(SH*k); big=Image.new('RGBA',(S,SH),(0,0,0,0)); big.paste(Image.fromarray(im,'RGBA').resize((w,h),Image.NEAREST),(round(48-48*k),round(102-102*k))); im=np.array(big)
        if a.get('arms'):   # the squid's arms: four that trail and curl behind the spider's body
            ph=f/8*2*math.pi
            for j in range(4):
                for t in range(16):
                    x=int(48+(j-1.5)*5+math.sin(ph+j+t*.4)*(1+t*.25)+(-t*.9 if view=='s' else 0)); y=int(86+K.YO-18+t*.6+(0 if view=='s' else (t*.5 if view=='b' else -t*1.2)))
                    if 0<=x<S and 0<=y<SH and not im[y,x,3]: im[y,x]=(*a['arms'],255)
    return im
def sheet(a):
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=frame(a,f,'s')
        for row,im in ((0,frame(a,f,'b')),(1,r[:,::-1]),(2,frame(a,f,'f')),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=im
    return sh
