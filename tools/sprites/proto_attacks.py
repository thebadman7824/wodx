# Attack sheets for the six prototype sprites: <name>.<act>.png, 6 frames by 4 facings (up, left, down, right), 96 by 112.
# The four people are drawn by wear.py from one description each, so walk and attack match; the Crinos and the Lupus
# lunge from their own walk sheets with claw or bite marks.  Run:  python3 proto_attacks.py <folder of the proto sheets>
import sys, numpy as np
from PIL import Image
import wear as Wr
S,SH=Wr.S,Wr.SH
PEOPLE={
 'kindred-elder-1888':(dict(skin=(214,208,204),hair=('#16120e','short'),top=('#1c1a20','longcoat'),under='#d8d4c8',neck=('cravat','#5a1a1e'),legs=('#1c1a20','trousers'),feet=('#121012','shoe')),[('claw',None,None),('cast',None,None)]),
 'garou-homid':(dict(skin=(172,130,96),hair=('#16120e','long'),top=('#5a5a52','shirt'),legs=('#3a4a66','trousers'),feet=('#3a2e26','boot')),[('claw',None,None)]),
 'townsman-1888':(dict(skin=(206,170,140),hair=('#3a2a1c','short'),top=('#26262c','suit'),under='#d8d4c8',neck=('tie','#3a3a40'),legs=('#26262c','trousers'),feet=('#16120e','shoe'),hat=('bowler','#1e1c1c'),beard='#3a2a1c'),[('claw',None,None),('shot','revolver',None)]),
 'lady-1888':(dict(skin=(226,190,160),hair=('#5a3a20','bun'),top=('#4a3460','gown'),legs=('#4a3460','robe'),feet=('#16120e','shoe'),neck=('collar','#d8d4c8')),[('thrust','dagger',None)]),
}
BEASTS={'garou-crinos':'claw','garou-lupus':'bite'}
def person_sheets(spec,acts):
    d=Wr.fig(**spec); out={'':Wr.sheet(d)}
    for act,held,power in acts:
        a=dict(d); a['held']=held; a['power']=power; sh=np.zeros((4*SH,6*S,4),np.uint8)
        for i in range(6):
            r=Wr.side(a,0,(act,i))
            for row,im in ((0,Wr.front(a,0,True,(act,i))),(1,r[:,::-1]),(2,Wr.front(a,0,False,(act,i))),(3,r)): sh[row*SH:(row+1)*SH,i*S:(i+1)*S]=im
        out[act]=sh
    return out
def lunge(walk,kind):
    sh=np.zeros((4*SH,6*S,4),np.uint8); DIR={0:(0,-1),1:(-1,0),2:(0,1),3:(1,0)}
    for row in range(4):
        ux,uy=DIR[row]
        for i in range(6):
            src=walk[row*SH:(row+1)*SH,[0,7,7,1,2,1][i]*S:([0,7,7,1,2,1][i]+1)*S]; k=[0,-2,-3,4,6,2][i]; dx,dy=ux*k,uy*k//2
            fr=np.zeros_like(src); ys,xs=np.nonzero(src[...,3]); ok=(xs+dx>=0)&(xs+dx<S)&(ys+dy>=0)&(ys+dy<SH); fr[ys[ok]+dy,xs[ok]+dx]=src[ys[ok],xs[ok]]
            if i in(3,4) and len(xs):
                cx,cy=(xs.min()+xs.max())/2+dx,(ys.min()+ys.max())/2+dy; hx,hy=(xs.max()-xs.min())/2,(ys.max()-ys.min())/2
                if kind=='bite' and row in(1,3): cy=ys.min()+dy+hy*.45
                px,py=cx+ux*(hx+3),cy+uy*(hy*.5+3)-(0 if uy else hy*.25)
                for m in (-3,0,3) if kind=='claw' else (0,):
                    for t in range(-4,5):
                        if kind=='claw': x=px+(m if ux==0 else 0)+(t*.5 if ux==0 else t*.4*ux); y=py+(m if ux else 0)+t
                        else: x=px+(t if ux==0 else (2-abs(t)*.5)*ux); y=py+((2-abs(t)*.5)*uy if ux==0 else t)
                        x=int(round(x)); y=int(round(y))
                        if 0<=x<S and 0<=y<SH and not fr[y,x,3]: fr[y,x]=((236,236,240,255) if i==3 else (200,60,50,255) if kind=='bite' else (190,194,204,255))
            sh[row*SH:(row+1)*SH,i*S:(i+1)*S]=fr
    return sh
# ---- being hit, dodging, falling, dying; running and sneaking (B2588) ------------------------------------------------
# These are made from a figure's own walk sheet, so every sprite has them: people, beasts and the war form alike.
DIRS={0:(0,-1),1:(-1,0),2:(0,1),3:(1,0)}; FEET=103
def _cell(sh,row,col): return sh[row*SH:(row+1)*SH,col*S:(col+1)*S]
def _move(src,dx,dy):
    fr=np.zeros_like(src); ys,xs=np.nonzero(src[...,3]); ok=(xs+dx>=0)&(xs+dx<S)&(ys+dy>=0)&(ys+dy<SH); fr[ys[ok]+dy,xs[ok]+dx]=src[ys[ok],xs[ok]]; return fr
def _squash(src,k):
    """press the figure down toward its feet: k of its height"""
    fr=np.zeros_like(src)
    for y in range(SH):
        sy=int(round(FEET-(FEET-y)/k))
        if 0<=sy<SH: fr[y]=src[sy]
    return fr
def _lean(src,px,sgn):
    """tip the figure forward: the head goes px further than the feet"""
    fr=np.zeros_like(src); ys=np.nonzero(src[...,3].any(1))[0]
    if not len(ys): return fr
    top=ys.min()
    for y in range(SH):
        d=int(round(sgn*px*max(0,FEET-y)/max(1,FEET-top))); d=max(-px,min(px,d)); row=src[y]
        if d>0: fr[y,d:]=row[:S-d]
        elif d<0: fr[y,:S+d]=row[-d:]
        else: fr[y]=row
    return fr
def _turn(src,deg,sgn):
    """turn the figure about its middle (falling over), then set it down on the ground"""
    ys,xs=np.nonzero(src[...,3]); fr=np.zeros_like(src)
    if not len(ys) or not deg: return src.copy()
    cx,cy=(xs.min()+xs.max())/2,(ys.min()+ys.max())/2; a=np.deg2rad(deg*sgn); ca,sa=np.cos(a),np.sin(a)
    Y,X=np.mgrid[0:SH,0:S]; sx=np.rint(ca*(X-cx)+sa*(Y-cy)+cx).astype(int); sy=np.rint(-sa*(X-cx)+ca*(Y-cy)+cy).astype(int)
    ok=(sx>=0)&(sx<S)&(sy>=0)&(sy<SH); fr[ok]=src[sy[ok],sx[ok]]
    y2=np.nonzero(fr[...,3].any(1))[0]
    return _move(fr,0,int(FEET-y2.max())) if len(y2) else fr
def _wash(fr,col,k):
    out=fr.copy(); m=out[...,3]>0; out[m,:3]=(out[m,:3]*(1-k)+np.array(col)*k).astype(np.uint8); return out
def _spark(fr,row,y,big):
    """a small star of struck metal on the side the blow comes from"""
    ux,uy=DIRS[row]; out=fr.copy(); xs=np.nonzero(fr[...,3].any(0))[0]
    if not len(xs): return out
    x=int((xs.max()+2) if ux>0 else (xs.min()-2) if ux<0 else 48+(5 if row==2 else -5)); y=int(y+(4 if uy>0 else -4 if uy<0 else 0))
    pts=[(0,0),(1,0),(-1,0),(0,1),(0,-1)]+([(2,0),(-2,0),(0,2),(0,-2),(1,1),(-1,-1)] if big else [])
    for dx,dy in pts:
        if 0<=x+dx<S and 0<=y+dy<SH: out[y+dy,x+dx]=(255,244,190,255) if abs(dx)+abs(dy)<2 else (250,200,90,230)
    return out
def _shadow(fr,src,k=1.0):
    xs=np.nonzero(src[...,3].any(0))[0]
    if not len(xs): return fr
    cx=(xs.min()+xs.max())//2; w=max(4,int((xs.max()-xs.min())//3*k))
    for y,ww in((FEET-1,w-2),(FEET,w),(FEET+1,w-2)):
        seg=fr[y,max(0,cx-ww):cx+ww+1]; e=seg[...,3]==0; seg[e]=(10,10,16,90)
    return fr
def react(walk,kind):
    """a six-frame sheet from the standing frame: 'hit' (knocked back, a flash), 'dodge' (ducks back and down), 'fall' (goes over and lies),
    'block' (braces, a spark), 'parry' (turns the blow aside, a spark higher up), 'die' (falls and goes still and grey), 'ash' (a Cainite's Final Death: crumbles from the head down to a heap), 'fade' (a wraith: thins and drifts up)"""
    sh=np.zeros((4*SH,6*S,4),np.uint8)
    for row in range(4):
        ux,uy=DIRS[row]; src=_cell(walk,row,0); side=-ux if ux else (1 if row==2 else -1)
        for i in range(6):
            if kind=='hit':
                k=[0,-3,-4,-2,-1,0][i]; fr=_move(src,ux*k,uy*k//2)
                if i==1: fr=_wash(fr,(255,255,255),.3)
                if i==2: fr=_wash(fr,(200,40,40),.22)
            elif kind=='dodge':
                k=[0,-3,-6,-6,-3,0][i]; fr=_move(_squash(src,[1,.94,.88,.88,.94,1][i]),ux*k if ux else [0,3,6,6,3,0][i]*(1 if row==2 else -1),0)
            elif kind in('block','parry'):
                # block: braces and takes the blow on shield or arm, a spark at the middle; parry: the weapon turns the blow aside higher up
                k=[0,-1,-2,-2,-1,0][i]; fr=_move(_squash(src,[1,.97,.94,.95,.98,1][i]) if kind=='block' else _lean(src,[0,1,3,2,1,0][i],ux or (1 if row==2 else -1)),ux*k,uy*k//2)
                if i in(2,3): fr=_spark(fr,row,62 if kind=='block' else 48,i==2)
            elif kind in('fall','die'):
                ys,xs=np.nonzero(src[...,3]); wide=len(xs) and (xs.max()-xs.min())>(ys.max()-ys.min())*1.1
                # a beast seen from the side sinks onto its flank; anything upright goes over
                fr=_squash(src,[1,.9,.74,.6,.52,.52][i]) if wide else _turn(src,[0,12,38,68,90,90][i],side)
                if kind=='die' and i>=4: fr=_wash(fr,(70,70,78),.25 if i==4 else .45)
            elif kind=='ash':
                fr=_wash(src,(120,116,112),[0,.3,.55,.75,.9,1][i]); ys=np.nonzero(fr[...,3].any(1))[0]
                if len(ys):
                    top,h=ys.min(),FEET-ys.min(); cut=int(top+h*[0,.1,.35,.65,.9,1][i]); rng=np.random.default_rng(row*10+i)
                    gone=fr[:cut]; n=np.argwhere(gone[...,3]>0); fr[:cut]=0
                    for y,x in n[::3]:   # what crumbles drifts down into the heap
                        px=int(np.clip(48+(x-48)*.7+rng.integers(-2,3),0,S-1)); py=int(FEET-rng.integers(0,1+int(3*[0,.1,.35,.65,.9,1][i]+1)))
                        fr[py,px]=(*[(96,92,88),(120,116,112),(70,66,64)][int(rng.integers(0,3))],255)
            elif kind=='fade':
                fr=_move(src,0,-[0,1,2,4,6,8][i]); m=fr[...,3]>0; fr[m,3]=(fr[m,3]*[1,.8,.6,.4,.22,.1][i]).astype(np.uint8); fr=_wash(fr,(206,226,236),[0,.2,.35,.5,.6,.7][i])
            sh[row*SH:(row+1)*SH,i*S:(i+1)*S]=fr
    return sh
def gait(walk,kind):
    """an eight-frame sheet from the walk: 'run' leans into it, 'sneak' goes low"""
    sh=np.zeros_like(walk)
    for row in range(4):
        ux,uy=DIRS[row]
        for f in range(8):
            src=_cell(walk,row,f)
            fr=_lean(src,4,ux) if kind=='run' and ux else _move(src,0,-1 if f%4==1 else 0) if kind=='run' else _lean(_squash(src,.84),2,ux) if ux else _squash(src,.84)
            sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=fr
    return sh
def _fold(src,k):
    """fold the legs: everything below the hip is pressed to k of its height and the body comes down with it (sitting, kneeling, in the saddle)"""
    ys=np.nonzero(src[...,3].any(1))[0]
    if not len(ys): return src.copy()
    top=ys.min(); hip=int(top+(FEET-top)*.56); fr=np.zeros_like(src); legs=FEET-hip; n=max(1,int(round(legs*k))); drop=legs-n
    for j in range(n+1): fr[FEET-j]=src[min(FEET,int(round(FEET-j/k)))] if int(round(FEET-j/k))>=hip else fr[FEET-j]
    for y in range(top,hip):
        if y+drop<SH: fr[y+drop]=src[y]
    fr[FEET+1:]=src[FEET+1:]
    return fr
def _bubble(fr):
    """a small speech mark by the head"""
    ys,xs=np.nonzero(fr[...,3])
    if not len(ys): return fr
    out=fr.copy(); x0=int(min(S-11,xs[ys<ys.min()+10].max()+2)); y0=int(max(1,ys.min()-7))
    out[y0:y0+6,x0:x0+9]=(238,236,228,255); out[y0,x0]=out[y0,x0+8]=out[y0+5,x0]=out[y0+5,x0+8]=0; out[y0+6,x0+1:x0+3]=(238,236,228,255)
    for d in (2,4,6): out[y0+3,x0+d]=(40,40,48,255)
    return out
def pose(walk,kind,lunged=None):
    """a six-frame sheet from the standing frame: 'sit' and 'kneel' (down and stay), 'search' (stoops and looks about), 'talk' (a nod and a speech mark),
    'feed' (leans in to the vessel, a flush of red), 'shift' (the body blurs white as it changes form), 'pick' (stoops and works at a lock)"""
    sh=np.zeros((4*SH,6*S,4),np.uint8)
    for row in range(4):
        ux,uy=DIRS[row]; src=_cell(walk,row,0)
        ys,xs=np.nonzero(src[...,3]); wide=len(xs) and (xs.max()-xs.min())>(ys.max()-ys.min())*1.1
        for i in range(6):
            if kind in('sit','kneel'):
                k=([1,.8,.6,.42,.3,.3] if kind=='sit' else [1,.9,.8,.7,.62,.62])[i]; fr=_squash(src,(1+k)/2) if wide else _fold(src,k)
                if kind=='sit' and not wide and i>=2:
                    # seated on the ground: seen from the side the legs lie out in front, seen from front or back the knees spread
                    yy=np.nonzero(src[...,3].any(1))[0]; hip=int(yy.min()+(FEET-yy.min())*.56); n=max(1,int(round((FEET-hip)*k))); band=fr[FEET-n:FEET+1].copy(); d=[0,0,3,5,7,7][i]
                    if ux:
                        out=np.zeros_like(band)
                        for j in range(band.shape[0]): out[j]=np.roll(band[j],ux*int(round(d*(j+1)/band.shape[0])),axis=0)
                        for j in range(max(0,band.shape[0]-3),band.shape[0]):   # the shins and feet reach forward along the ground
                            for e in range(1,d+1): sh2=np.roll(band[j],ux*(int(round(d*(j+1)/band.shape[0]))+e),axis=0); m=out[j,:,3]==0; out[j][m]=sh2[m]
                        band=out
                    else:
                        l=np.roll(band,-2,axis=1); r=np.roll(band,2,axis=1); m=band[...,3]==0; band[m]=l[m]; m=band[...,3]==0; band[m]=r[m]
                    fr[FEET-n:FEET+1]=band
            elif kind=='search':
                fr=_move(_squash(src,.85) if wide else _lean(_fold(src,.72),3,ux or (1 if i%2 else -1)),[0,-2,-2,2,2,0][i] if not ux else 0,0)
            elif kind=='pick':
                # stoops to a lock and works at it: the hands stay at the lock, a glint of the pick now and then
                fr=_squash(src,.85) if wide else _lean(_fold(src,.7),3,ux or (1 if row==2 else -1)); fr=_move(fr,0,1 if i in(1,4) else 0)
                if i%2 and not wide: fr=_spark(fr,row,70,False)
            elif kind=='talk':
                fr=_move(src,0,[0,-1,0,-1,0,0][i]); fr=_bubble(fr) if 1<=i<=4 and not wide else fr
            elif kind=='feed':
                fr=_cell(lunged,row,i) if lunged is not None else _lean(src,[0,2,5,6,6,3][i],ux)
                if i in(3,4): t=np.nonzero(fr[...,3].any(1))[0]; m=np.zeros(fr.shape[:2],bool); m[t.min():t.min()+14]=True; m&=fr[...,3]>0; fr=fr.copy(); fr[m,:3]=(fr[m,:3]*.72+np.array((170,20,24))*.28).astype(np.uint8)
            elif kind=='shift':
                fr=_wash(_squash(src,[1,.96,.9,.94,.98,1][i]),(236,240,248),[.15,.5,.9,.9,.5,.15][i])
                if i in(2,3): fr=np.maximum(fr,_move(fr,1,0)//2+_move(fr,-1,0)//2)
            sh[row*SH:(row+1)*SH,i*S:(i+1)*S]=fr
    return sh
def way(walk,kind):
    """an eight-frame sheet from the walk: 'climb' (seen from behind, hand over hand), 'swim' (head and shoulders above the water),
    'fly' (off the ground, a shadow below), 'ride' (legs folded in the saddle), 'jump' (a leap over its shadow), 'crawl' (flat to the ground),
    'glide' (a ghost's drifting, used as its walk)"""
    sh=np.zeros_like(walk)
    for row in range(4):
        ux,uy=DIRS[row]
        for f in range(8):
            src=_cell(walk,row,f)
            if kind=='climb': fr=_move(_cell(walk,0,f),[0,1,0,-1,0,1,0,-1][f],[0,-2,-3,-2,0,-2,-3,-2][f])
            elif kind=='ride': fr=_fold(_cell(walk,row,0),.62)
            elif kind=='jump':
                # gathers, springs, hangs in the air over its shadow, lands with bent knees
                up=[0,0,5,10,12,10,5,0][f]; st=_cell(walk,row,[0,0,2,2,3,2,2,0][f]); fr=_squash(st,[1,.88,1,1,1,1,1,.9][f]); fr=_move(_lean(fr,2,ux) if 2<=f<=6 else fr,0,-up)
                if up: fr=_shadow(fr,st,1-up/30)
            elif kind=='crawl':
                # flat to the ground on hands and knees
                ys=np.nonzero(src[...,3].any(1))[0]; wd=np.nonzero(src[...,3].any(0))[0]
                if len(ys) and (wd.max()-wd.min())>(FEET-ys.min())*1.1: fr=_squash(src,.8)
                else: fr=_turn(_cell(walk,row,0),78,ux) if ux else _squash(src,.5); fr=_move(fr,(1 if f%4<2 else 0)*ux,0 if ux else (1 if f%4<2 else 0))
            elif kind=='glide':
                # a ghost does not step: it drifts, the legs thinning away to nothing
                fr=_move(_lean(_cell(walk,row,0),2,ux),0,-2-(1 if f%8>3 else 0)); ys=np.nonzero(fr[...,3].any(1))[0]
                if len(ys):
                    y0=int(ys.min()+(ys.max()-ys.min())*.62)
                    for y in range(y0,ys.max()+1): fr[y,:,3]=(fr[y,:,3]*max(0,1-(y-y0)/max(1,ys.max()-y0)*1.05)).astype(np.uint8)
            elif kind=='fly':
                fr=_move(_lean(src,3,ux),0,-12+(1 if f%4>1 else 0)); xs=np.nonzero(src[...,3].any(0))[0]
                if len(xs):
                    cx=(xs.min()+xs.max())//2; w=max(5,(xs.max()-xs.min())//3)
                    for y,ww in((FEET-1,w-2),(FEET,w),(FEET+1,w-2)):
                        seg=fr[y,cx-ww:cx+ww+1]; e=seg[...,3]==0; seg[e]=(10,10,16,90)
            elif kind=='swim':
                fr=np.zeros_like(src); ys=np.nonzero(src[...,3].any(1))[0]
                if len(ys):
                    top=ys.min(); tall=FEET-top; wide=np.nonzero(src[...,3].any(0))[0]; flat=(wide.max()-wide.min())>tall*1.1
                    line=int(top+tall*(.62 if flat else .4)); drop=FEET-line-2+(1 if f%4>1 else 0); part=_lean(src,2,ux); part[line:]=0; fr=_move(part,0,drop)
                    x0,x1=max(0,wide.min()-3),min(S-1,wide.max()+3)
                    for x in range(x0,x1+1):
                        if (x+f)%4<2: fr[FEET-1,x]=(150,190,214,200)
                        if (x+f+2)%5<2: fr[FEET+1,x]=(96,140,176,170)
            sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=fr
    return sh
REACTS=('hit','dodge','fall','block','parry'); GAITS=('run','sneak'); POSES=('sit','kneel','search','talk','feed','shift','pick'); WAYS=('climb','swim','fly','ride','jump','crawl')
def extras(walk,death='die'):
    """every sheet a sprite gets beyond its walk and its attacks; death is how it dies: 'die', 'ash' or 'fade', always saved as die"""
    out={k:react(walk,k) for k in REACTS}; out['die']=react(walk,death); out.update({g:gait(walk,g) for g in GAITS})
    out.update({k:pose(walk,k) for k in POSES}); out.update({k:way(walk,k) for k in WAYS}); return out
DEATHS={'kindred-elder-1888':'ash'}
if __name__=='__main__':
    out=sys.argv[1].rstrip('/')+'/'
    for name,(spec,acts) in PEOPLE.items():
        for act,sh in person_sheets(spec,acts).items():
            Image.fromarray(sh).save(out+name+('.'+act if act else '')+'.png')
            if not act: Image.fromarray(sh[2*SH:3*SH,0:S]).save(out+name+'-still.png')
    for name,kind in BEASTS.items():
        walk=np.array(Image.open(out+name+'.png').convert('RGBA')); Image.fromarray(lunge(walk,kind)).save(out+name+'.'+kind+'.png')
    for name in list(PEOPLE)+list(BEASTS):
        walk=np.array(Image.open(out+name+'.png').convert('RGBA'))
        for k,sh in extras(walk,DEATHS.get(name,'die')).items(): Image.fromarray(sh).save(out+name+'.'+k+'.png',optimize=True)
