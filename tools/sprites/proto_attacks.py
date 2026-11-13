# Attack sheets for the six prototype sprites: <name>.<act>.png, 6 frames by 4 facings (up, left, down, right), 96 by 112.
# The four people are drawn by wear.py from one description each, so walk and attack match; the Crinos and the Lupus
# lunge from their own walk sheets with claw or bite marks.  Run:  python3 proto_attacks.py <folder of the proto sheets>
import sys, numpy as np
from PIL import Image
import wear as Wr
S,SH=Wr.S,Wr.SH
PEOPLE={
 'kindred-elder-1888':(dict(skin=(214,208,204),hair=('#16120e','short'),top=('#1c1a20','longcoat'),under='#d8d4c8',neck=('cravat','#5a1a1e'),legs=('#1c1a20','trousers'),feet=('#121012','shoe')),[('claw',None,None),('cast',None,('blood','bolt'))]),
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
if __name__=='__main__':
    out=sys.argv[1].rstrip('/')+'/'
    for name,(spec,acts) in PEOPLE.items():
        for act,sh in person_sheets(spec,acts).items():
            Image.fromarray(sh).save(out+name+('.'+act if act else '')+'.png')
            if not act: Image.fromarray(sh[2*SH:3*SH,0:S]).save(out+name+'-still.png')
    for name,kind in BEASTS.items():
        walk=np.array(Image.open(out+name+'.png').convert('RGBA')); Image.fromarray(lunge(walk,kind)).save(out+name+'.'+kind+'.png')
