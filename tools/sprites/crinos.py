# Code-drawn Crinos on a 96x96 frame, LPC-style ramp + dark outline. Own art (no LPC pixels).
import numpy as np, math
from PIL import Image
S=96; SH=112; YO=16
RAMP=[(34,28,26),(62,52,46),(92,78,66),(124,108,90),(156,140,118)]   # outline, deep, mid, light, highlight
BELLY=[(34,28,26),(96,84,72),(134,120,102),(168,154,132),(196,184,160)]
CLAW=(222,214,190); EYE=(236,190,60); NOSE=(20,16,16); TOOTH=(236,232,220); MOUTH=(70,22,24)
def hsh(a,b): 
    v=math.sin(a*12.9898+b*78.233)*43758.5453; return v-math.floor(v)
class Cv:
    def __init__(s):
        s.c=np.zeros((SH,S,4),np.uint8); s.id=np.zeros((SH,S),int); s.rid=np.full((SH,S),-1); s.dk=np.zeros((SH,S),int)
        s.ramps=[]; s.full={}; s.groups={}; s.n=0
    def part(s): s.n+=1; return s.n
    def px(s,x,y,col,pid=None):
        x=int(round(x)); y=int(round(y))+YO
        if 0<=x<S and 0<=y<SH:
            s.c[y,x]=(*col,255); s.rid[y,x]=-1
            if pid: s.id[y,x]=pid
            elif s.id[y,x]==0: s.id[y,x]=-1
    def capsule(s,a,b,ra,rb,ramp=RAMP,fur=0.0,seed=0,dark=0,g=None):
        if g is None: pid=s.part()
        else:
            if g not in s.groups: s.groups[g]=s.part()
            pid=s.groups[g]
        if ramp not in s.ramps: s.ramps.append(ramp)
        ri=s.ramps.index(ramp); full=s.full.setdefault(pid,np.zeros((SH,S),bool))
        ax,ay=a; bx,by=b; ay+=YO; by+=YO; L=max(math.hypot(bx-ax,by-ay),1e-6); m=max(ra,rb)+3
        for y in range(max(int(min(ay,by)-m),0),min(int(max(ay,by)+m),SH)):
            for x in range(max(int(min(ax,bx)-m),0),min(int(max(ax,bx)+m),S)):
                t=((x-ax)*(bx-ax)+(y-ay)*(by-ay))/(L*L); t=min(1,max(0,t))
                cx=ax+(bx-ax)*t; cy=ay+(by-ay)*t; r=ra+(rb-ra)*t; dx=x-cx; dy=y-cy
                rr=r+(fur*(hsh(math.atan2(dy,dx)*3+seed,t*5+seed)-.35) if fur else 0)
                if math.hypot(dx,dy)<=rr:
                    full[y,x]=True; s.id[y,x]=pid; s.rid[y,x]=ri; s.c[y,x,3]=255
                    s.dk[y,x]=dark+(1 if fur and hsh(x*1.7+seed,y*2.3)>.94 else 0)
        return pid
    def shade(s):
        """One light, top left. Each group is lit as a single shape, so joints inside a limb or a body do not show."""
        for pid,m in s.full.items():
            h=np.zeros((SH,S)); cur=m.copy()
            for i in range(4):
                h+=cur; e=cur.copy(); e[1:]&=cur[:-1]; e[:-1]&=cur[1:]; e[:,1:]&=cur[:,:-1]; e[:,:-1]&=cur[:,1:]; e[0]=e[-1]=False; e[:,0]=e[:,-1]=False; cur=e
            gx=np.zeros_like(h); gy=np.zeros_like(h); gx[:,1:-1]=h[:,2:]-h[:,:-2]; gy[1:-1]=h[2:]-h[:-2]
            lit=gx*.55+gy*.8; wide=h.max()>=3
            k=np.full((SH,S),2); k[lit>=(1.0 if wide else .9)]=3; k[(lit>=2.3)&(h<=2)&wide]=4; k[lit<=-.9]=1
            k=np.maximum(1,k-s.dk); vis=(s.id==pid)&(s.rid>=0)
            for ri,rp in enumerate(s.ramps):
                sel=vis&(s.rid==ri)
                if sel.any(): s.c[sel,:3]=np.array(rp)[k[sel]]
        # where a nearer group sits over a farther one, give the nearer one a dark edge on its shadow side
        ys,xs=np.nonzero(s.rid>=0)
        for y,x in zip(ys,xs):
            for ddx,ddy in ((1,0),(0,1)):
                xx,yy=x+ddx,y+ddy
                if xx<S and yy<SH and s.c[yy,xx,3] and 0<s.id[yy,xx]<s.id[y,x]:
                    s.c[y,x,:3]=s.ramps[s.rid[y,x]][1]; break
    def outline(s,col=None):
        s.shade(); a=s.c[...,3]>0
        for y in range(SH):
            for x in range(S):
                if a[y,x]: continue
                for ddx,ddy in ((0,1),(1,0),(-1,0),(0,-1)):
                    xx,yy=x+ddx,y+ddy
                    if 0<=xx<S and 0<=yy<SH and a[yy,xx]:
                        ri=s.rid[yy,xx]; s.c[y,x]=(*(col or (s.ramps[ri][0] if ri>=0 else RAMP[0])),255); break
def pol(p,ang,l): return (p[0]+math.sin(ang)*l, p[1]+math.cos(ang)*l)   # ang 0 = straight down, + = forward (right)
R=math.radians
def leg_side(cv,hip,ph,dark):
    sw=math.sin(ph); lift=max(0,math.cos(ph))      # swing fwd/back, lift during forward pass
    th=R(34)+R(24)*sw; knee=pol(hip,th,17)
    sh=R(-36)+R(18)*sw-R(18)*lift; hock=pol(knee,sh,18)
    mt=R(14)+R(20)*sw+R(30)*lift; toe=pol(hock,mt,14)
    cv.capsule(hip,knee,6.5,4.5,fur=1.6,seed=1,dark=dark,g='leg%d'%dark); cv.capsule(knee,hock,4.2,2.6,fur=1.0,seed=2,dark=dark,g='leg%d'%dark); cv.capsule(hock,toe,2.6,2.4,dark=dark,g='leg%d'%dark)
    paw=(toe[0]+4,toe[1]+.5); cv.capsule(toe,paw,2.6,2.0,dark=dark,g='leg%d'%dark)
    for i in range(3): cv.px(paw[0]+2+ (i==1), paw[1]-1+i,CLAW)
def arm_side(cv,sh,ph,dark):
    sw=math.sin(ph); ua=R(8)+R(26)*sw; el=pol(sh,ua,16)
    fa=ua+R(22)+R(10)*sw; wr=pol(el,fa,16)
    cv.capsule(sh,el,5.5,4.2,fur=1.4,seed=3,dark=dark,g='arm%d'%dark); cv.capsule(el,wr,4.2,3.0,fur=1.0,seed=4,dark=dark,g='arm%d'%dark)
    hd=pol(wr,fa+R(10),4); cv.capsule(wr,hd,3.2,2.8,dark=dark,g='arm%d'%dark)
    for i in (-1,0,1):
        c0=pol(hd,fa+R(10)+i*.5,3); c1=pol(hd,fa+R(10)+i*.5,5.5); cv.px(*c0,CLAW); cv.px(*c1,CLAW)
def side(f):
    cv=Cv(); ph=f/8*2*math.pi; bob=round(abs(math.sin(ph))*1.2)-14
    P=(40,53+bob); C=(52,35+bob); N=(57,30+bob)
    tail0=(36,55+bob); t1=(27,62+bob+math.sin(ph)*1.5); t2=(22,72+bob+math.sin(ph+1)*2)
    cv.capsule(tail0,t1,3.5,3.2,fur=1.8,seed=9,dark=1,g='tail'); cv.capsule(t1,t2,3.2,1.6,fur=1.8,seed=10,dark=1,g='tail')
    leg_side(cv,(41,56+bob),ph+math.pi,1); arm_side(cv,(54,34+bob),ph,1)
    cv.capsule(P,(46,45+bob),7.5,8.5,fur=1.4,seed=5,g='body'); cv.capsule((46,45+bob),C,8.5,12,fur=2.0,seed=6,g='body')
    cv.capsule((47,40+bob),(51,34+bob),4,5,ramp=BELLY) if False else None
    cv.capsule((44,30+bob),(53,26+bob),7,6.5,fur=3.2,seed=7,g='body')              # hackles / mane over the shoulders
    leg_side(cv,(42,56+bob),ph,0)
    # head: low and forward of the chest
    H=(63,27+bob); cv.capsule(N,H,6,7,fur=2.2,seed=8,g='head')
    mz=(75,32+bob); cv.capsule((67,28+bob),mz,4.6,2.6,g='head'); 
    cv.capsule((66,33+bob),(73,35+bob),2.2,1.5,dark=1)                   # lower jaw
    for x in (69,71,73): cv.px(x,33+bob,TOOTH)
    cv.px(70,34+bob,MOUTH); cv.px(72,34+bob,MOUTH)
    cv.px(77,31+bob,NOSE); cv.px(77,32+bob,NOSE); cv.px(76,31+bob,NOSE)
    cv.px(66,25+bob,EYE); cv.px(65,24+bob,RAMP[0]); cv.px(66,24+bob,RAMP[0]); cv.px(67,24+bob,RAMP[0])
    e=cv.part()
    for i in range(8):                                                   # ear, upright and tilted back
        for j in range(max(1,5-(i*5)//8)): cv.px(62-i*0.5-j,21+bob-i,RAMP[3 if j==0 else 2 if j<3 else 1],e)
    arm_side(cv,(52,35+bob),ph+math.pi,0)
    cv.outline(); return cv.c
def front(f,back=False):
    cv=Cv(); ph=f/8*2*math.pi; bob=round(abs(math.sin(ph))*1.2)-13; cx=48
    if back:
        pass
    # legs (front view: digitigrade reads as short thigh, narrow hock, big paw)
    for sgn,p in ((-1,ph),(1,ph+math.pi)):
        lift=max(0,math.sin(p))*4; hip=(cx+sgn*7,57+bob); toe=(cx+sgn*9,87-lift); knee=(cx+sgn*11,hip[1]+(87-hip[1])*.36-lift*.4); hock=(cx+sgn*8,hip[1]+(87-hip[1])*.72-lift)
        cv.capsule(hip,knee,6.5,5,fur=1.5,seed=11+sgn,g='leg%d'%sgn); cv.capsule(knee,hock,4.5,2.8,fur=1,seed=13+sgn,g='leg%d'%sgn); cv.capsule(hock,toe,2.8,3.6,g='leg%d'%sgn)
        if not back:
            for i in (-2,0,2): cv.px(toe[0]+i,toe[1]+4,CLAW)
    if back:
        t1=(cx+math.sin(ph)*3,70+bob); t2=(cx+math.sin(ph)*5,86+bob)
    cv.capsule((cx,56+bob),(cx,47+bob),9,10,fur=1.4,seed=15,g='body'); cv.capsule((cx,47+bob),(cx,36+bob),10,14.5,fur=2.0,seed=16,g='body')
    if not back: cv.capsule((cx,53+bob),(cx,43+bob),3.5,5.5,ramp=BELLY,fur=1.8,seed=17,g='body')
    for sgn,p in ((-1,ph+math.pi),(1,ph)):
        sw=math.sin(p)*2.5; sh=(cx+sgn*14,35+bob); el=(cx+sgn*19,51+bob+sw*.5); wr=(cx+sgn*18,66+bob+sw)
        cv.capsule(sh,el,6,4.6,fur=1.5,seed=18+sgn,g='arm%d'%sgn); cv.capsule(el,wr,4.4,3.2,fur=1,seed=20+sgn,g='arm%d'%sgn); hd=(wr[0],wr[1]+4); cv.capsule(wr,hd,3.4,3,g='arm%d'%sgn)
        for i in (-2,0,2): cv.px(hd[0]+i,hd[1]+4,CLAW); cv.px(hd[0]+i,hd[1]+5,CLAW)
    cv.capsule((cx-9,30+bob),(cx+9,30+bob),6.5,6.5,fur=3.2,seed=22,g='body')        # mane across the shoulders
    hy=29+bob if not back else 27+bob
    cv.capsule((cx,hy-2),(cx,hy+1),8.5,8,fur=2.4,seed=23,g='head')
    for sgn in (-1,1):
        e=cv.part()
        for i in range(7):
            for j in range(max(1,4-i//2)): cv.px(cx+sgn*(5+j+i*0.4),hy-8-i,RAMP[2 if j else 1],e)
    if back:
        cv.capsule((cx,hy+4),(cx,46+bob),5,3.5,fur=2.6,seed=24,dark=1,g='body')       # mane running down the spine
        cv.capsule((cx,58+bob),t1,3.6,3.4,fur=1.8,seed=25,g='tail'); cv.capsule(t1,t2,3.4,1.6,fur=1.8,seed=26,g='tail')
    else:
        cv.capsule((cx,hy+2),(cx,hy+9),4.4,3.2,ramp=BELLY,g='head'); cv.px(cx-2,hy+12,TOOTH); cv.px(cx+2,hy+12,TOOTH)                              # muzzle, pointing at the viewer and down
        cv.px(cx,hy+11,NOSE); cv.px(cx-1,hy+11,NOSE); cv.px(cx+1,hy+11,NOSE); cv.px(cx,hy+12,NOSE)
        for sgn in (-1,1):
            cv.px(cx+sgn*4,hy,EYE); cv.px(cx+sgn*5,hy,EYE); 
            for k in (3,4,5,6): cv.px(cx+sgn*k,hy-1- (k>4),RAMP[0])
    cv.outline(); return cv.c
def sheet():
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        sh[0:SH,f*S:(f+1)*S]=front(f,True); r=side(f); sh[SH:2*SH,f*S:(f+1)*S]=r[:,::-1]; sh[2*SH:3*SH,f*S:(f+1)*S]=front(f); sh[3*SH:,f*S:(f+1)*S]=r
    return sh
if __name__=='__main__':
    sh=sheet(); Image.fromarray(sh).save('crinos-sheet.png')
    bg=np.zeros((SH+8,4*S+8,4),np.uint8); bg[...]=(30,34,48,255)
    im=Image.fromarray(bg)
    for i,r in enumerate([2,3,1,0]): im.alpha_composite(Image.fromarray(sh[r*SH:(r+1)*SH,0:S]),(4+i*S,4))
    im.resize((im.width*5,im.height*5),Image.NEAREST).save('crinos-test.png')
