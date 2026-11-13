# Dressed people: the rig.py figure with wearable and hand-held pieces. Own art, same manner (capsules, 5-tone ramps, one light).
import numpy as np, math
import crinos as K, rig
from rig import ramp,H,R,pol
S,SH,YO=K.S,K.SH,K.YO
C=dict(steel=(150,156,166),iron=(96,98,108),wood=(112,82,54),dwood=(72,52,38),brass=(178,142,72),leather=(96,64,42),black=(46,46,52),bone=(206,196,170),
       gold=(206,170,74),silver=(192,196,204),red=(150,52,46),cord=(150,132,100),stone=(128,124,118),green=(70,96,66),chrome=(196,204,216),flame=(230,150,60),glass=(120,150,140))
RP={k:ramp(v) for k,v in C.items()}
def col(c): return c if isinstance(c,tuple) else C[c] if c in C else H(c)
def rc(c): return ramp(col(c))
def fig(**k):
    d=rig.base(top=('#7a766c','shirt'),legs=('#4a4640','trousers'),feet=('#3a2e26','shoe'),under=None,hose=None,hat=None,face=None,neck=None,hands=None,belt=None,over=None,held=None,off=None,tex=None,hairover=None)
    d.update(k)
    if isinstance(d['feet'],str): d['feet']=(d['feet'],'shoe')
    return d
LONG=dict(tunic=62,jacket=57,coat=66,suit=58,longcoat=77,robe=82,kimono=82,dress=66,gown=82,mail=62,plate=58,kvest=54)
def legramps(d):
    c,k=d['legs']; sk=ramp(d['skin']); hs=rc(d['hose']) if d['hose'] else sk; lr=rc(c)
    if k in('trousers','tights','wide','plate'): return lr,lr
    if k in('shorts','breeches'): return lr,hs
    return hs,hs
def legw(d): k=d['legs'][1]; return 1.4 if k=='wide' else .85 if k=='tights' else 1.12 if k=='breeches' else 1
def foot(cv,d,ank,sgn,g,sidev=False,dark=0):
    c,k=d['feet']; fr=ramp(d['skin']) if k in('bare','sandal') else rc(c); x,y=ank
    if k in('boot','wrap'): cv.capsule((x,y-7),(x,y),2.4 if k=='boot' else 2.1,2.1,ramp=rc(c),dark=dark,g=g)
    if sidev:
        L=6.5 if k=='fin' else 3.2; cv.capsule((x-.5,y+.6),(x+L,y+1.2),1.9 if k=='clog' else 1.7,1.5 if k!='fin' else 1.0,ramp=fr,dark=dark,g=g)
        if k=='heel': cv.px(x-1,y+3,rc(c)[1]); cv.px(x-1,y+2,rc(c)[1])
        if k=='skate':
            for xx in (-1,1,3): cv.px(x+xx,y+3.4,C['black'])
        if k=='sandal':
            for xx in (0,2): cv.px(x+xx,y,rc(c)[2])
    else:
        cv.capsule((x,y+.8),(x+sgn*(.6 if k!='fin' else 2.5),y+1.6),2.1 if k in('clog','fin') else 1.9,1.8,ramp=fr,g=g)
        if k=='skate':
            for xx in (-1,1): cv.px(x+xx,y+4.2,C['black'])
        if k=='sandal':
            for xx in (-1,0,1): cv.px(x+xx,y,rc(c)[2])
def skirtlen(d):
    k=d['legs'][1]; return {'skirt':70,'skirtlong':82,'kilt':66,'mini':62,'loin':63}.get(k)
def hem(cv,x,y0,y1,r0,r1,rp,g,dark=0,sway=0):
    cv.capsule((x,y0),(x+sway,y1-r1+1.3),r0,r1,ramp=rp,dark=dark,g=g); cv.capsule((x+sway-r1+1.5,y1-1.3),(x+sway+r1-1.5,y1-1.3),1.5,1.5,ramp=rp,dark=dark,g=g)
def dome(cv,cx,cy,r,rp,test,pid=None):
    for y in range(int(cy-r-2),int(cy+r+3)):
        for x in range(int(cx-r-2),int(cx+r+3)):
            dx=x-cx; dy=y-(cy-.6)
            if dx*dx+dy*dy<=r*r and test(dx,dy): cv.px(x,y,rp[3 if (-dx*.5-dy*.8)>r*.42 else 2 if dy<r*.25 else 1],pid)
def hat(cv,d,cx,cy,view,pid):
    """view: 'f' front, 'b' back, 's' side (facing right). Drawn after the head and hair."""
    if not d['hat']: return
    k,c=d['hat'][0],d['hat'][1]; rp=rc(c); c2=rc(d['hat'][2]) if len(d['hat'])>2 and not isinstance(d['hat'][2],int) else rp; s=view=='s'; b=view=='b'
    face=(lambda dx,dy: dx>1.6 and dy>-2.4) if s else (lambda dx,dy: (not b) and abs(dx)<3.4 and dy>-1.4)
    def brim(w,r=.9,y=-4,fw=0): cv.capsule((cx-w,cy+y),(cx+w+fw,cy+y),r,r,ramp=c2)
    if k in('cap','flatcap'):
        dome(cv,cx,cy,5.2,rp,lambda dx,dy: dy<-2.2,pid)
        if s:
            for x in range(4,9): cv.px(cx+x,cy-3,rp[1])
        elif not b:
            for x in range(-4,5): cv.px(cx+x,cy-3,rp[1])
    elif k=='brim': brim(d['hat'][3] if len(d['hat'])>3 else 6.5); cv.capsule((cx-2.2,cy-6.5),(cx+2.2,cy-6.5),2.5,2.5,ramp=rp)
    elif k=='tall': brim(5.5); cv.capsule((cx,cy-5.5),(cx,cy-11),3.3,3.5,ramp=rp)
    elif k=='bowler': brim(5.2); cv.capsule((cx,cy-6),(cx,cy-6.5),3.9,3.8,ramp=rp)
    elif k=='tricorne': cv.capsule((cx-6.5,cy-5),(cx+6.5,cy-5),1.5,1.5,ramp=rp); cv.capsule((cx-2,cy-6.5),(cx+2,cy-6.5),2.3,2.3,ramp=rp)
    elif k in('helmet','turban','coif'):
        r=5.9 if k=='turban' else 5.3
        dome(cv,cx,cy,r,rp,(lambda dx,dy: not face(dx,dy) and dy<(5 if k=='coif' else 1.4)) if k!='turban' else (lambda dx,dy: dy<-1.8),pid)
        if k=='coif' and not s: cv.capsule((cx-3.5,cy+8.2),(cx+3.5,cy+8.2),2.4,2.4,ramp=rp,g='coif')
    elif k=='helm':
        dome(cv,cx,cy,5.4,rp,lambda dx,dy: dy<5.2,pid)
        if not b:
            for x in (range(2,6) if s else range(-3,4)): cv.px(cx+x,cy,(20,20,24))
    elif k in('beret','toque','kippah'):
        dome(cv,cx,cy,5.3 if k!='kippah' else 4.9,rp,lambda dx,dy: dy<(-3.0 if k!='kippah' else -3.9),pid)
        if k=='beret': cv.capsule((cx-3,cy-5.5),(cx-4,cy-5),2.0,1.6,ramp=rp)
        if k=='toque': cv.capsule((cx,cy-6),(cx,cy-7),3.0,2.4,ramp=rp)
    elif k=='crown':
        for x in (range(-4,5) if not s else range(-4,5)):
            cv.px(cx+x,cy-5,rp[3]); cv.px(cx+x,cy-6,rp[2])
            if x%2==0: cv.px(cx+x,cy-7,rp[4])
    elif k=='skull': dome(cv,cx,cy,5.3,rp,lambda dx,dy: dy<-2.4,pid)
    elif k=='eboshi': cv.capsule((cx,cy-5),(cx-.6,cy-11),2.4,1.8,ramp=rp)
    elif k=='band':
        for x in range(-5,6):
            if not face(x,-3.4) : cv.px(cx+x,cy-4,rp[2])
        if not s and not b:
            for x in range(-4,5): cv.px(cx+x,cy-4,rp[2])
def hoodpre(cv,d,cx,cy,dy,view):
    """cloth round the head that sits behind the face: hoods and headscarves"""
    if not d['hat'] or d['hat'][0] not in('hood','scarf','veilall'): return False
    rp=rc(d['hat'][1]); drape=d['hat'][0]!='hood' or True
    cv.capsule((cx-(1.2 if view=='s' else 0),cy-1.2),(cx-(1.6 if view=='s' else 0),cy+7),5.7,5.0,ramp=rp,g='hood'); return True
def hoodpost(cv,d,cx,cy,view,pid):
    if not d['hat'] or d['hat'][0] not in('hood','scarf','veilall'): return
    k=d['hat'][0]; rp=rc(d['hat'][1]); s=view=='s'; b=view=='b'
    if b: dome(cv,cx,cy,5.6,rp,lambda dx,dy: True,pid); return
    dome(cv,cx,cy,5.5,rp,(lambda dx,dy: dy<-2.6 or dx<-.5) if s else (lambda dx,dy: dy<-2.6 or abs(dx)>3.4),pid)
    if k=='veilall':
        for y in (1,2,3,4):
            for x in (range(0,6) if s else range(-3,4)): cv.px(cx+x,cy+y,rp[2 if y<3 else 1])
        if len(d['hat'])>2:
            for y in (-2,-1):
                for x in (range(0,6) if s else range(-3,4)): cv.px(cx+x,cy+y,rp[2])
def face(cv,d,cx,cy,view):
    if not d['face'] or view=='b': return
    k,c=d['face']; cc=col(c); s=view=='s'
    ex=[cx+2,cx+3] if s else [cx-3,cx-2,cx-1,cx+1,cx+2,cx+3]
    if k=='shades':
        for x in ex: cv.px(x,cy+.4,cc)
        if not s: cv.px(cx,cy+.4,cc)
    elif k=='glasses':
        for x in ([cx+3,cx+4] if s else [cx-3,cx-1,cx+1,cx+3]): cv.px(x,cy+.4,cc)
        if s: cv.px(cx+1,cy+.4,cc)
    elif k=='goggles':
        for x in (range(cx+1,cx+5) if s else range(cx-4,cx+5)):
            cv.px(x,cy+.4,cc); cv.px(x,cy-.6,cc)
        for x in ([cx+3] if s else [cx-2,cx+2]): cv.px(x,cy+.4,(150,190,200))
        if s:
            for x in range(-4,1): cv.px(cx+x,cy-.6,cc)
    elif k in('mask','gasmask'):
        for y in (2,3,4):
            for x in (range(1,6) if s else range(-2,3)): cv.px(cx+x,cy+y,cc)
        if k=='gasmask':
            for x in ex: cv.px(x,cy+.4,(60,70,70))
            cv.px(cx+(6 if s else 0),cy+4,(40,40,44)); cv.px(cx+(6 if s else 0),cy+5,(40,40,44))
    elif k=='patch':
        for x in ([cx+2,cx+3] if s else [cx+1,cx+2,cx+3]): cv.px(x,cy+.4,cc)
        if not s:
            cv.px(cx,cy-1,cc); cv.px(cx-1,cy-2,cc)
    elif k=='monocle': cv.px(cx+(3 if s else 2),cy+.4,(210,220,226))
    elif k=='veil':
        for y in range(-2,6):
            for x in (range(0,6) if s else range(-4,5)):
                if (x+y)%2==0: cv.px(cx+x,cy+y,cc)
    elif k=='nose': cv.px(cx+(5 if s else 0),cy+1.5,cc)
    elif k=='visor':
        for y in (-1,0,1,2):
            for x in (range(1,6) if s else range(-3,4)): cv.px(cx+x,cy+y,cc if (x-y)!=2 else (120,150,165))
# ---- things held in the hand: drawn along an axis from the hand --------------------------------------------------------------
def held(cv,hand,u,spec,g):
    hx,hy=hand; ux,uy=u; vx,vy=-uy,ux; P=lambda t,o=0:(hx+ux*t+vx*o,hy+uy*t+vy*o)
    for p in spec:
        o=p[0]
        if o=='c': cv.capsule(P(p[1],p[6] if len(p)>6 else 0),P(p[2],p[7] if len(p)>7 else 0),p[3],p[4],ramp=RP[p[5]],g=g+p[5])
        elif o=='x': cv.capsule(P(p[1],-p[2]),P(p[1],p[2]),p[3],p[3],ramp=RP[p[4]],g=g+'x'+p[4])
        elif o=='b': cv.capsule(P(p[1],p[4] if len(p)>4 else 0),P(p[1]+.01,p[4] if len(p)>4 else 0),p[2],p[2],ramp=RP[p[3]],g=g+'b'+p[3])
        elif o=='s':
            for i in range(p[3]):
                a=i/p[3]*2*math.pi; q=P(p[1]); cv.px(q[0]+math.cos(a)*p[2],q[1]+math.sin(a)*p[2],RP[p[4]][3])
        elif o=='h':      # cord or chain hanging from a point on the axis
            q=P(p[1],p[5] if len(p)>5 else 0)
            for i in range(p[2]): cv.px(q[0]+math.sin(i*.5)*p[3],q[1]+i,RP[p[4]][2 if i%2 else 3])
        elif o=='arc':    # bow: stave bulging to one side, string straight
            n=p[1]
            for i in range(-n,n+1):
                t=i/n; q=P(i,(1-t*t)*p[2]); cv.px(q[0],q[1],RP[p[3]][3]); cv.px(q[0]+vx*.9,q[1]+vy*.9,RP[p[3]][2])
            for i in range(-n,n+1): s2=P(i,0); cv.px(s2[0],s2[1],(200,196,180))
def blade(L,r=.9,hilt='leather',guard=2.4,metal='steel',bend=0):
    sp=[('c',-2.5,.5,.8,.8,hilt)]
    if guard: sp.append(('x',1.2,guard,.6,'brass' if metal=='steel' else metal))
    if bend: sp+=[('c',2,L*.5,r,r,metal,0,bend*.35),('c',L*.5,L,r,.5,metal,bend*.35,bend)]
    else: sp.append(('c',2,L,r,.5,metal))
    return sp
def haft(L,head,wood='wood',butt=2.5): return [('c',-butt,L,.7,.7,wood)]+head
W={ # name: (carry, spec). carry: up (blade up at the side), pole (upright), low (muzzle low and forward), fist, hang
 'knife':('up',blade(6,.8,guard=1.4)),'dagger':('up',blade(8,.8,guard=1.8)),'stiletto':('up',blade(8,.6,guard=1.2)),'cleaver':('up',[('c',-2.5,.5,.8,.8,'wood'),('c',2,7,1.9,1.9,'steel')]),
 'shortsword':('up',blade(12,1.0)),'sword':('up',blade(17,1.0,guard=2.8)),'bastard':('up',blade(20,1.1,guard=3)),'greatsword':('up',blade(26,1.3,guard=3.6)),
 'saber':('up',blade(16,.9,bend=2.2)),'scimitar':('up',blade(15,1.2,bend=3.2)),'falchion':('up',blade(13,1.5,bend=1.4)),'katana':('up',blade(17,.9,guard=1.3,bend=1.4,hilt='black')),
 'rapier':('up',blade(18,.55,guard=2.2)),'kris':('up',blade(9,.8,guard=1.6,bend=1)),'bayonet':('up',blade(9,.6,guard=1,hilt='iron')),
 'hatchet':('up',haft(9,[('c',7,9.5,1.6,2.0,'steel',1.2,2.6)])),'axe':('up',haft(13,[('c',10,13.5,1.8,2.6,'steel',1.4,3.4)])),
 'battleaxe':('up',haft(20,[('c',16,20,2.0,3.2,'steel',1.6,4.2),('c',16,20,1.4,2.2,'steel',-1.2,-2.8)])),
 'greataxe':('pole',haft(34,[('c',28,34,2.4,3.8,'steel',1.8,4.8),('c',28,34,2.0,3.0,'steel',-1.6,-4.0)],butt=20)),
 'club':('up',[('c',-2.5,12,.8,1.8,'wood')]),'greatclub':('up',[('c',-3,20,1.0,2.6,'dwood'),('s',16,3.4,7,'iron'),('s',12,3.0,6,'iron')]),'branch':('up',[('c',-2.5,14,.8,1.3,'dwood'),('c',9,13,.6,.5,'dwood',0,3)]),
 'sap':('up',[('c',-2,5,.8,1.4,'black')]),'stake':('up',[('c',-2,7,1.0,.4,'wood')]),'candlestick':('up',[('c',-2,7,.7,.7,'brass'),('x',7.5,1.6,.6,'brass'),('b',-2.5,1.4,'brass')]),
 'tankard':('up',[('c',0,3,1.9,1.9,'wood'),('x',1.5,2.6,.5,'iron')]),'mace':('up',haft(12,[('b',12.5,2.3,'iron')],wood='iron')),
 'morningstar':('up',haft(13,[('b',13.5,2.2,'iron'),('s',13.5,3.6,8,'steel')])),'warhammer':('up',haft(15,[('x',14.5,2.6,1.3,'iron')])),'smithhammer':('up',haft(8,[('x',8,2.0,1.4,'iron')])),
 'pick':('up',haft(15,[('c',14.5,14.6,.8,.5,'iron',-4.5,4.5)])),'mattock':('pole',haft(22,[('c',21.5,21.6,1.0,.6,'iron',-4.5,4.5)],butt=14)),
 'flail':('up',haft(11,[('h',11,6,1.2,'iron',1.5),('b',16.5,2.0,'iron',2)])),'spikedflail':('up',haft(11,[('h',11,6,1.2,'iron',1.5),('b',16.5,2.0,'iron',2),('s',16.5,3.3,7,'steel')])),
 'whip':('hang',[('c',-2,3,.8,.6,'leather'),('h',3,22,2.2,'leather')]),'cat':('hang',[('c',-2,3,.8,.6,'leather'),('h',3,10,1.5,'cord'),('h',3,10,-1.5,'cord'),('h',3,9,.4,'cord',1)]),
 'sling':('hang',[('h',0,9,1.0,'cord'),('h',0,9,-1.0,'cord'),('b',-9.5,1.2,'stone')]),
 'staff':('pole',[('c',-24,26,.8,.8,'wood')]),'spear':('pole',[('c',-24,28,.7,.7,'wood'),('c',28,34,1.2,.3,'steel')]),'javelin':('pole',[('c',-14,22,.6,.6,'wood'),('c',22,27,1.0,.3,'steel')]),
 'pike':('pole',[('c',-24,62,.7,.7,'wood'),('c',62,68,1.0,.3,'steel')]),'lance':('pole',[('c',-24,60,1.0,.6,'wood'),('c',-6,-2,1.8,1.0,'wood'),('c',60,65,1.0,.3,'steel')]),
 'halberd':('pole',[('c',-24,34,.7,.7,'wood'),('c',34,41,1.0,.3,'steel'),('c',30,35,1.8,2.6,'steel',1.4,3.4),('c',32,33,.8,.4,'steel',-1,-3.2)]),
 'glaive':('pole',[('c',-24,32,.7,.7,'wood'),('c',32,43,1.5,.5,'steel',0,1.6)]),'bill':('pole',[('c',-24,32,.7,.7,'wood'),('c',32,40,1.3,.6,'steel',0,2.4),('c',35,36,.7,.4,'steel',-1,-3)]),
 'fork':('pole',[('c',-24,28,.7,.7,'wood'),('x',28,2.6,.6,'iron'),('c',28,35,.6,.3,'iron',-2.6,-2.6),('c',28,35,.6,.3,'iron',2.6,2.6),('c',28,35,.6,.3,'iron')]),
 'scythe':('pole',[('c',-24,30,.7,.7,'wood'),('c',30,30.1,1.1,.4,'steel',0,13)]),'sickle':('up',[('c',-2.5,3,.8,.8,'wood'),('c',3,8,.8,.8,'steel',0,2.5),('c',8,9,.8,.4,'steel',2.5,6)]),
 'spade':('pole',[('c',-14,12,.7,.7,'wood'),('c',-22,-15,2.0,2.2,'iron')]),'crowbar':('up',[('c',-3,14,.7,.7,'iron'),('c',14,15,.7,.5,'iron',0,2.4)]),
 'bow':('bow',[('arc',13,4.2,'wood')]),'shortbow':('bow',[('arc',10,3.6,'wood')]),'longbow':('bow',[('arc',17,4.6,'dwood')]),'compound':('bow',[('arc',11,3.2,'black'),('b',-11,1.2,'iron'),('b',11,1.2,'iron')]),
 'crossbow':('low',[('c',-7,9,1.0,.8,'wood'),('x',8,5.5,.6,'dwood'),('h',-99,0,0,'cord')]),'heavycrossbow':('low',[('c',-8,11,1.2,.9,'wood'),('x',10,7,.8,'iron')]),'handcrossbow':('low',[('c',-2,5,.8,.7,'wood'),('x',4.5,3.2,.5,'dwood')]),
 'pistol':('low',[('c',0,5.5,.9,.8,'black'),('c',-1,.2,.9,.9,'black',-2.4,-.3)]),'heavypistol':('low',[('c',0,6.5,1.1,1.0,'black'),('c',-1,.2,1.0,1.0,'black',-2.8,-.3)]),
 'revolver':('low',[('c',0,6,.8,.7,'iron'),('b',1.6,1.4,'iron'),('c',-1,.2,.9,.9,'wood',-2.6,-.3)]),'heavyrevolver':('low',[('c',0,8,.9,.8,'iron'),('b',1.8,1.6,'iron'),('c',-1,.2,1.0,1.0,'wood',-2.8,-.3)]),
 'derringer':('low',[('c',0,3,.8,.8,'iron'),('c',-.6,.2,.8,.8,'wood',-1.8,-.3)]),'oldpistol':('low',[('c',0,8,.8,.7,'iron'),('c',-2.5,1,1.1,.9,'wood',-2.4,-.2),('b',1,.9,'brass',-1.2)]),
 'flare':('low',[('c',0,4,1.3,1.3,'red'),('c',-1,.2,.9,.9,'black',-2.4,-.3)]),'stungun':('low',[('c',-1,3,1.3,1.3,'black'),('s',4,.9,2,'chrome')]),'spray':('low',[('c',-2,2,1.2,1.2,'red'),('b',2.6,.8,'black')]),
 'musket':('low',[('c',-9,-2,1.6,1.1,'wood'),('c',-2,22,.9,.7,'iron'),('c',-2,12,1.0,.9,'wood',.6,.6),('b',0,1.0,'brass',-1.2)]),'handcannon':('low',[('c',-12,2,.8,.8,'wood'),('c',2,12,1.6,1.7,'iron')]),
 'rifle':('low',[('c',-9,-2,1.6,1.1,'wood'),('c',-2,20,.8,.7,'iron'),('c',-2,10,1.0,.9,'wood',.6,.6)]),'shotgun':('low',[('c',-8,-2,1.6,1.1,'wood'),('c',-2,16,1.1,1.0,'iron'),('c',2,9,1.1,1.0,'wood',1,1)]),
 'coachgun':('low',[('c',-7,-2,1.5,1.1,'wood'),('c',-2,11,1.3,1.2,'iron')]),'smg':('low',[('c',-4,8,1.2,.9,'black'),('c',2,2.1,.9,.8,'black',0,4.5),('c',-1,-.9,.9,.8,'black',0,2.6)]),
 'smgl':('low',[('c',-7,-3,1.2,.9,'black'),('c',-3,11,1.3,.9,'black'),('c',3,3.1,.9,.8,'black',0,5.5),('c',-1,-.9,.9,.8,'black',0,2.6)]),
 'assault':('low',[('c',-9,-3,1.5,1.1,'black'),('c',-3,17,1.2,.8,'black'),('c',4,4.1,1.0,.9,'black',0,5.5),('c',-1,-.9,.9,.8,'black',0,2.8),('c',13,13.1,.5,.5,'black',0,-2)]),
 'gatling':('low',[('c',-4,16,2.4,2.4,'brass'),('c',-8,-4,1.4,1.4,'iron'),('x',2,5,1.0,'dwood')]),'launcher':('low',[('c',-8,14,1.9,1.9,'green'),('c',0,.1,.9,.8,'black',0,3)]),
 'flamer':('low',[('c',-6,12,1.4,1.0,'iron'),('b',-7,2.6,'red'),('b',13,1.0,'flame')]),'laser':('low',[('c',-5,12,1.3,1.0,'chrome'),('b',12.5,.9,'red')]),
 'rock':('fist',[('b',2.4,1.6,'stone')]),'grenade':('fist',[('b',2.6,1.7,'green'),('b',.8,.7,'iron')]),'dynamite':('up',[('c',0,6,1.0,1.0,'red'),('h',-99,0,0,'cord')]),'bottle':('up',[('c',0,5,1.3,1.3,'glass'),('c',5,7.5,.6,.6,'glass'),('b',8.4,.9,'flame')]),
 'pipebomb':('up',[('c',0,6,1.1,1.1,'iron'),('x',0,1.3,.5,'iron'),('x',6,1.3,.5,'iron')]),'flashbang':('fist',[('c',1,4.5,1.2,1.2,'iron')]),'cracker':('fist',[('c',1,4,.6,.6,'red')]),
 'knuckles':('fist',[('x',1.2,1.4,.7,'brass')]),'katar':('fist',[('x',.5,1.8,.6,'iron'),('c',1.5,9,1.3,.4,'steel')]),'claws':('fist',[('c',1.5,6,.5,.3,'steel',-1.4,-1.8),('c',1.5,6.5,.5,.3,'steel'),('c',1.5,6,.5,.3,'steel',1.4,1.8)]),
 'longclaws':('fist',[('c',1.5,10,.5,.3,'chrome',-1.4,-1.8),('c',1.5,11,.5,.3,'chrome'),('c',1.5,10,.5,.3,'chrome',1.4,1.8)]),'nails':('fist',[('c',1.5,4,.4,.3,'chrome',-1.2,-1.4),('c',1.5,4,.4,.3,'chrome',1.2,1.4)]),
 'cyberfist':('fist',[('b',1.2,2.1,'chrome')]),'hammerhand':('fist',[('b',1.2,2.0,'chrome'),('c',2,5,1.8,1.8,'iron')]),'buzzhand':('fist',[('b',1,1.8,'chrome'),('b',4.5,2.6,'steel'),('s',4.5,3.4,8,'chrome')]),
 'spikehand':('fist',[('b',1,1.8,'chrome'),('c',2,9,.8,.3,'chrome')]),'chair':('up',[('c',0,9,.6,.6,'wood',-2.6,-2.6),('c',0,15,.6,.6,'wood',2.6,2.6),('x',9,2.6,.9,'wood'),('x',14,2.6,.6,'wood')]),
 'table':('up',[('x',10,7.5,1.0,'dwood'),('c',0,10,.7,.7,'dwood',-6,-6),('c',0,10,.7,.7,'dwood',6,6)]),
 'tool':('up',[('c',-2,7,.8,.8,'iron')]),'chainsaw':('low',[('c',-5,1,2.4,2.4,'red'),('c',1,14,1.4,1.2,'iron')]),
}
W['crossbow'][1].pop(); W['dynamite'][1].pop()
def carry(d,view,hand,dyb):
    """direction of the held thing for each view. Returns (anchor, unit vector)"""
    c=W[d['held']][0]; hx,hy=hand; sg=-1 if view=='f' else 1
    if view=='s':
        return {'up':((hx,hy),(.42,-.91)),'pole':((hx+.5,hy),(.06,-1)),'low':((hx,hy),(.82,.57)),'fist':((hx,hy),(.75,.66)),'hang':((hx,hy),(.9,-.44)),'bow':((hx+3,hy),(0,-1))}[c]
    return {'up':((hx,hy),(sg*.36,-.93)),'pole':((hx+sg*.6,hy),(0,-1)),'low':((hx,hy),(sg*.5,.87)),'fist':((hx,hy+1),(0,1)),'hang':((hx,hy),(sg*.5,-.87)),'bow':((hx+sg*2,hy-2),(0,-sg))}[c]
def shield(cv,d,x,y,view):
    k,c=d['off']; rp=rc(c)
    if view=='s':
        hh={'buckler':3,'small':5,'kite':8,'war':11}[k]; cv.capsule((x,y-hh+2),(x,y+hh-1),1.8,1.6,ramp=rp,g='shield'); return
    if k=='buckler': cv.capsule((x,y),(x,y+.1),3.4,3.4,ramp=RP['steel'],g='shield'); cv.px(x,y,RP['steel'][4])
    elif k=='small': cv.capsule((x,y),(x,y+.1),5.2,5.2,ramp=rp,g='shield'); cv.px(x,y,RP['iron'][3]); cv.px(x+1,y,RP['iron'][2])
    elif k=='kite':
        cv.capsule((x,y-4),(x,y+7),5.6,2.6,ramp=rp,g='shield')
        if view=='f':
            for i in range(-6,9): cv.px(x,y+i,RP['bone'][2])
    elif k=='war':
        cv.capsule((x,y-6),(x,y+12),6.6,5.6,ramp=rp,g='shield')
        if view=='f':
            for i in range(-9,15): cv.px(x,y+i,RP['iron'][2])
            for i in range(-5,6): cv.px(x+i,y+2,RP['iron'][2])
def texture(cv,d):
    if not d['tex']: return
    for c,kind in d['tex']:
        rp=rc(c)
        if rp not in cv.ramps: continue
        sel=cv.rid==cv.ramps.index(rp); ys,xs=np.nonzero(sel)
        for y,x in zip(ys,xs):
            if kind=='mail' and (x+y)%2==0: cv.c[y,x,:3]=(cv.c[y,x,:3]*.74).astype(np.uint8)
            if kind=='stripe' and x%3==0: cv.c[y,x,:3]=(cv.c[y,x,:3]*.72).astype(np.uint8)
            if kind=='check' and (x//2+y//2)%2==0: cv.c[y,x,:3]=(cv.c[y,x,:3]*.7).astype(np.uint8)
            if kind=='plaid' and (x%4==0 or y%4==0): cv.c[y,x,:3]=(cv.c[y,x,:3]*.72).astype(np.uint8)
            if kind=='hoop' and y%4==0: cv.c[y,x,:3]=np.clip(cv.c[y,x,:3]*1.25,0,255).astype(np.uint8)
            if kind=='plates' and (y%5==0 or (x%6==0 and y%5<3)): cv.c[y,x,:3]=(cv.c[y,x,:3]*.7).astype(np.uint8)
def armramps(d):
    k=d['top'][1]; sk=ramp(d['skin']); tr=rc(d['top'][0]); un=rc(d['under']) if d['under'] else sk
    if k in('bare','band','wrap'): return sk,sk
    if k in('vest','kvest'): a=un; sl='long' if d['under'] and d['sleeve']!='none' else 'none'
    elif k=='mail': return tr,(un if d['under'] else sk)
    else: a=tr; sl=d['sleeve']
    return (a if sl!='none' else sk),(a if sl=='long' else sk)
def hand(cv,d,wr,g,dark=0,dx=0):
    sk=ramp(d['skin']); hp=d['hands']
    if hp:
        k,c=hp; r=2.4 if k=='boxing' else 2.0 if k=='mitt' else 1.7
        if k=='long': cv.capsule((wr[0],wr[1]-7),wr,1.9,1.7,ramp=rc(c),dark=dark,g=g)
        if k=='cuff': cv.capsule((wr[0],wr[1]-3),(wr[0],wr[1]-1),2.0,1.9,ramp=rc(c),dark=dark,g=g); cv.capsule(wr,(wr[0]+dx,wr[1]+2),1.6,1.4,ramp=sk,dark=dark,g=g); return
        if k=='wrap' : cv.capsule((wr[0],wr[1]-2),(wr[0]+dx,wr[1]+1.4),1.7,1.6,ramp=rc(c),dark=dark,g=g); return
        cv.capsule(wr,(wr[0]+dx,wr[1]+2),r,r-.2,ramp=rc(c),dark=dark,g=g)
    else: cv.capsule(wr,(wr[0]+dx,wr[1]+2),1.6,1.4,ramp=sk,dark=dark,g=g)
def neckwear(cv,d,cx,dy,view):
    if not d['neck']: return
    k,c=d['neck']; rp=rc(c); s=view=='s'; b=view=='b'; x0=cx-(0 if not s else 0)
    if k=='scarf':
        cv.capsule((cx-2,38.6+dy),(cx+2,38.6+dy),2.1,2.1,ramp=rp,g='scarf')
        if not b: cv.capsule((cx+(2 if not s else 2.5),40+dy),(cx+(2 if not s else 3),47+dy),1.3,1.1,ramp=rp,g='scarf')
    elif k=='roll': cv.capsule((cx-2.4,38.8+dy),(cx+2.4,38.8+dy),2.0,2.0,ramp=rp,g='scarf')
    elif k=='ruff': cv.capsule((cx-3.6,38.6+dy),(cx+3.6,38.6+dy),1.7,1.7,ramp=rp,g='ruff')
    elif k=='collar' and not b:
        for x in (range(-3,4) if not s else range(0,4)): cv.px(cx+x,40+dy,rp[4]); cv.px(cx+x,41+dy,rp[3])
    elif k in('tie','cravat') and not b:
        xx=cx+(4 if s else 0)
        for y in range(40,50 if k=='tie' else 44): cv.px(xx,y+dy,rp[3 if y<42 else 2])
        if k=='cravat': cv.px(xx-1,41+dy,rp[3]); cv.px(xx+1,41+dy,rp[3])
    elif k=='bow' and not b:
        xx=cx+(4 if s else 0)
        for x in (-1,0,1): cv.px(xx+x,40+dy,rp[2])
    elif k=='chain' and not b:
        for x,y in ((-2,40),(-1,41),(0,42),(1,41),(2,40)): cv.px(cx+x+(3 if s else 0),y+dy,rp[4] if x else rp[3])
        if len(d['neck'])>2: cv.px(cx+(3 if s else 0),43+dy,col(d['neck'][2]))
    elif k=='cord' and not b: cv.px(cx+(3 if s else 0),42+dy,rp[3]); cv.px(cx+(3 if s else 0),43+dy,rp[2])
def front(d,f,back=False):
    cv=K.Cv(); ph=f/8*2*math.pi; cx=48; t=d['thin']; sw=d['sw']; kind=d['top'][1]; lk=d['legs'][1]; tr=ramp(d['skin']) if kind in('bare','band','wrap') else rc(d['top'][0]); sk=ramp(d['skin'])
    hr=ramp(H((d['hairover'] or d['hair'])[0])); st=(d['hairover'] or d['hair'])[1]; view='b' if back else 'f'
    dy=round(abs(math.sin(ph))*-0.8); ov=d['over']
    if ov and ov[0]=='cloak' and not back: hem(cv,cx,42+dy,ov[2] if len(ov)>2 else 76,sw+1.6,sw+3.0,rc(ov[1]),'cloakb',1)
    if d['off'] and back: shield(cv,d,cx-sw-2.5,53+dy,'b')
    hood=d['hat'] and d['hat'][0] in('hood','scarf','veilall')
    if st=='long' and not back and not hood: cv.capsule((cx,31+dy),(cx,41+dy),5.0,4.6,ramp=hr,dark=1)
    th,shk=legramps(d); w=legw(d)
    for sgn,p in ((-1,ph),(1,ph+math.pi)):
        lift=max(0,math.sin(p))*3.2; hip=(cx+sgn*3,57+dy); knee=(cx+sgn*3.4,71-lift*.7); ank=(cx+sgn*3.2,84.5-lift); g='L%d'%sgn
        cv.capsule(hip,knee,3.3*t*w,2.6*t*w,ramp=th,g=g); cv.capsule(knee,ank,2.5*t*w,(1.9 if lk!='wide' else 2.3)*t*(w if lk=='wide' else 1),ramp=shk,g=g)
        foot(cv,d,ank,sgn,g)
    lr=rc(d['legs'][0])
    if lk in('trousers','tights','wide','shorts','breeches','plate','briefs'): cv.capsule((cx-2.4,55+dy),(cx+2.4,55+dy),4.0,4.0,ramp=lr,g='body')
    sl=skirtlen(d)
    if sl:
        if lk=='loin': cv.capsule((cx-2.4,55+dy),(cx+2.4,55+dy),3.8,3.8,ramp=sk,g='body'); cv.capsule((cx,55+dy),(cx,sl+dy),3.4,3.0,ramp=lr,g='loin')
        else: hem(cv,cx,54+dy,sl+dy,6.0,6.0+(sl-54)*.07,lr,'body')
    if kind in LONG and LONG[kind]>56: L=LONG[kind]; hem(cv,cx,53+dy,L+dy,5.0 if kind not in('robe','kimono','gown','dress') else 6.0,5.0+(L-53)*.06+(1 if kind in('robe','kimono','gown','dress') else 0),tr,'body')
    cv.capsule((cx-sw+2.4,41.5+dy),(cx+sw-2.4,41.5+dy),2.8,2.8,ramp=tr,g='body')
    cv.capsule((cx,43+dy),(cx,53+dy),(sw-.6)*t+(.5 if kind in('kvest','plate') else 0),(sw-1.8)*t+(.7 if kind in('kvest','plate') else 0),ramp=tr,g='body')
    px=cv.px
    if kind=='band':
        for y in (44,45,46):
            for x in range(-5,6): px(cx+x,y+dy,rc(d['top'][0])[2 if y<46 else 1])
    if kind=='wrap': cv.capsule((cx+sw-2.5,41+dy),(cx-3.5,50+dy),2.4,3.2,ramp=rc(d['top'][0]),g='wrap'); cv.capsule((cx,50+dy),(cx,53+dy),sw-1.8,sw-2,ramp=rc(d['top'][0]),g='wrap')
    if not back:
        un=rc(d['under']) if d['under'] else None
        if kind=='vest' and not d['under']: cv.capsule((cx,42+dy),(cx,52+dy),2.4,2.0,ramp=sk,g='body')
        if kind in('vest','jacket','coat','longcoat','suit') and un:
            for i,y in enumerate(range(40,47 if kind!='jacket' else 54)):
                hw=max(0,2-i//3) if kind!='jacket' else 1
                for x in range(-hw,hw+1): px(cx+x,y+dy,un[4] if x else un[2])
        if kind in('coat','longcoat','suit','jacket'):
            for y in range(47,LONG[kind]+1): px(cx,y+dy,tr[0] if y>55 else tr[1])
            if kind!='jacket':
                for i in range(7):
                    for sg in (-1,1): px(cx+sg*(3-i//2.4),40+i+dy,tr[4]); px(cx+sg*(4-i//2.4),40+i+dy,tr[1])
                for y in (49,53): px(cx+1,y+dy,tr[4])
        if kind=='kimono':
            for i in range(10): px(cx+3-i*.6,40+i+dy,tr[4]); px(cx-3+i*.3,40+i+dy,tr[1])
        if kind=='plate':
            for x in range(-4,5): px(cx+x,50+dy,tr[1])
            px(cx,44+dy,tr[4]); px(cx,45+dy,tr[4])
        if kind=='kvest':
            for x in range(-5,6): px(cx+x,47+dy,tr[1])
            for sg in (-1,1):
                for y in (41,42,43): px(cx+sg*4,y+dy,tr[1])
    if d['belt'] or kind in('tunic','kimono','mail'):
        br=rc(d['belt'] or 'leather')
        for x in range(-int(sw-2),int(sw-2)+1):
            px(cx+x,53+dy,br[2]); 
            if kind=='kimono': px(cx+x,52+dy,br[3]); px(cx+x,54+dy,br[1])
        if not back and kind!='kimono': px(cx,53+dy,RP['brass'][4])
    if ov and ov[0]=='apron' and not back:
        ar=rc(ov[1]); cv.capsule((cx,47+dy),(cx,ov[2] if len(ov)>2 else 68),4.0,4.6,ramp=ar,g='apron')
        for sg in (-1,1):
            for y in (41,42,43,44): px(cx+sg*3,y+dy,ar[2])
    if d.get('susp') and not back:
        for sg in (-1,1):
            for y in range(41,54): px(cx+sg*3,y+dy,rc(d['susp'])[2])
    if d.get('glint') and not back: px(cx-3,45+dy,col(d['glint']))
    if d.get('scab'): cv.capsule((cx+(sw-1)*(1 if not back else -1),54+dy),(cx+(sw+2.5)*(1 if not back else -1),69+dy),1.0,.8,ramp=rc(d['scab']),g='scab')
    au,af=armramps(d); wide=kind in('kimono','robe')
    hands={}
    for sgn,p in ((-1,ph+math.pi),(1,ph)):
        s=math.sin(p)*1.6; shd=(cx+sgn*sw,41.5+dy); el=(cx+sgn*(sw+1.4),50.5+dy+s*.5); wr=(cx+sgn*(sw+1.2),59+dy+s); g='A%d'%sgn
        cv.capsule(shd,el,2.4*t,2.0*t+(.5 if wide else 0),ramp=au,g=g); cv.capsule(el,wr,1.9*t+(.5 if wide else 0),1.6*t+(1.0 if wide else 0),ramp=af,g=g)
        if kind=='plate': cv.capsule((shd[0],shd[1]-.5),(shd[0]+sgn*.5,shd[1]+1),3.2,2.8,ramp=tr,g='P%d'%sgn)
        hand(cv,d,wr,g); hands[sgn]=(wr[0],wr[1]+1.5)
    if ov and ov[0] in('poncho','cape'):
        L=ov[2] if len(ov)>2 else (58 if ov[0]=='poncho' else 52); cv.capsule((cx,41+dy),(cx,L+dy),sw+.8,sw+1.5+(L-41)*.12,ramp=rc(ov[1]),g='poncho')
    if ov and ov[0]=='cloak':
        if back: hem(cv,cx,43+dy,(ov[2] if len(ov)>2 else 76),sw+1.2,sw+2.6,rc(ov[1]),'cloak')
        else: cv.capsule((cx-sw+1,41+dy),(cx+sw-1,41+dy),2.6,2.6,ramp=rc(ov[1]),g='mantle')
    cv.capsule((cx,36.5+dy),(cx,39+dy),1.9,2.1,ramp=sk,g='head'); neckwear(cv,d,cx,dy,view)
    cy=31.5+dy
    if hood: hoodpre(cv,d,cx,cy,dy,view)
    pid=cv.capsule((cx,cy-1),(cx,cy+1.2),4.1,3.7,ramp=sk if not back or st=='bald' else hr,g='head')
    if not back:
        px(cx-2,cy+.4,d['eyes']); px(cx+2,cy+.4,d['eyes'])
        if d['beard']:
            br=ramp(H(d['beard']))
            for (x,y) in ((-3,2),(3,2),(-3,3),(-2,3),(2,3),(3,3),(-2,4),(-1,4),(0,4),(1,4),(2,4),(-1,5),(0,5),(1,5)): px(cx+x,cy+y,br[2])
        if st!='bald' and not hood:
            for y in range(int(cy-8),int(cy+3)):
                for x in range(cx-7,cx+8):
                    dx=x-cx; dyy=y-(cy-.6)
                    if dx*dx+dyy*dyy<=5.4**2 and (dyy<-1.6 or (abs(dx)>3.3 and dyy<(4 if st=='long' else 1.5))): px(x,y,hr[3 if (dx<0 and dyy<-3) else 2 if dyy<0 else 1],pid)
    if st=='bun' and not hood: cv.capsule((cx,cy-(5.5 if not back else 2)),(cx,cy-(5.5 if not back else 2)),2.3,2.3,ramp=hr)
    if st=='long' and back and not hood: cv.capsule((cx,cy+2),(cx,42+dy),4.6,4.2,ramp=hr)
    hoodpost(cv,d,cx,cy,view,pid); hat(cv,d,cx,cy,view,pid); face(cv,d,cx,cy,view)
    if d['off'] and not back: shield(cv,d,cx+sw+2.5,53+dy,'f')
    if d['held']:
        hs=hands[-1 if not back else 1]; a,u=carry(d,view,hs,dy); held(cv,a,u,W[d['held']][1],'W')
    cv.outline(d['ink']); texture(cv,d); return cv.c
def side(d,f):
    cv=K.Cv(); ph=f/8*2*math.pi; lk=d['legs'][1]; kind=d['top'][1]; t=d['thin']; sk=ramp(d['skin']); tr=sk if kind in('bare','band','wrap') else rc(d['top'][0])
    longk=LONG.get(kind,0); amp=.45 if (longk>=77 or lk=='skirtlong') else .7 if (lk in('skirt','kilt') or longk>=62) else 1
    k,dy=rig.kin(ph,False,amp); ov=d['over']; th,shk=legramps(d); w=legw(d); px=cv.px
    hr=ramp(H((d['hairover'] or d['hair'])[0])); st=(d['hairover'] or d['hair'])[1]; hood=d['hat'] and d['hat'][0] in('hood','scarf','veilall')
    au,af=armramps(d); wide=kind in('kimono','robe')
    def arm(pts,dark,g):
        sh,el,wr=pts; cv.capsule(sh,el,2.4*t,2.0*t+(.5 if wide else 0),ramp=au,dark=dark,g=g); cv.capsule(el,wr,1.9*t+(.5 if wide else 0),1.6*t+(1.0 if wide else 0),ramp=af,dark=dark,g=g)
        if kind=='plate': cv.capsule((sh[0],sh[1]-.5),(sh[0],sh[1]+1.5),3.0,2.6,ramp=tr,dark=dark,g=g+'p')
        hand(cv,d,wr,g,dark,.4)
    def leg(pts,dark,g):
        hip,knee,ank=pts; dk=dark+(1 if longk>=77 else 0)
        cv.capsule(hip,knee,3.3*t*w,2.6*t*w,ramp=th,dark=dk,g=g); cv.capsule(knee,ank,2.5*t*w,(1.9 if lk!='wide' else 2.3)*t*(w if lk=='wide' else 1),ramp=shk,dark=dk,g=g); foot(cv,d,ank,1,g,True,dk)
    if d['off']: shield(cv,d,53,52+dy,'s')
    arm(k[1]['arm'],1,'A1'); leg(k[1]['leg'],1,'L1'); leg(k[0]['leg'],0,'L0')
    lr=rc(d['legs'][0])
    if lk in('trousers','tights','wide','shorts','breeches','plate','briefs'): cv.capsule((47,53+dy),(47,57+dy),3.8,3.6,ramp=lr,g='body')
    sl=skirtlen(d)
    if sl:
        if lk=='loin': cv.capsule((47,53+dy),(47,57+dy),3.6,3.4,ramp=sk,g='body'); cv.capsule((49.5,54+dy),(50,sl+dy),1.4,1.2,ramp=lr,g='loin'); cv.capsule((44.5,54+dy),(44,sl-1+dy),1.4,1.2,ramp=lr,g='loin')
        else: hem(cv,47,53+dy,sl+dy,3.8,3.8+(sl-53)*.07,lr,'body',0,math.sin(ph)*.6)
    cv.capsule((47,41.5+dy),(47,52+dy),4.4*t+(.4 if kind in('kvest','plate') else 0),3.6*t+(.5 if kind in('kvest','plate') else 0),ramp=tr,g='body')
    if longk>56: hem(cv,47,52+dy,longk+dy,3.5,3.5+(longk-52)*.06+(.6 if kind in('robe','kimono','gown','dress') else 0),tr,'body',0,math.sin(ph)*.6)
    if kind=='band':
        for y in (44,45,46):
            for x in range(-4,5): px(47+x,y+dy,rc(d['top'][0])[2])
    if kind=='wrap': cv.capsule((47,42+dy),(47,52+dy),3.4,3.6,ramp=rc(d['top'][0]),g='wrap')
    if kind in('vest',) and not d['under']: cv.capsule((47.5,42+dy),(47.5,50+dy),2.2,2.0,ramp=sk,g='body')
    if kind in('vest','jacket','coat','longcoat','suit') and d['under']:
        un=rc(d['under'])
        for y in range(41,47): px(51,y+dy,un[3])
    if d['belt'] or kind in('tunic','kimono','mail'):
        br=rc(d['belt'] or 'leather')
        for x in range(-3,5): px(47+x,53+dy,br[2])
    if ov and ov[0]=='cloak': hem(cv,45,42+dy,(ov[2] if len(ov)>2 else 76),4.2,5.0,rc(ov[1]),'cloak',0,-1.5)
    if ov and ov[0]=='apron': cv.capsule((50.6,46+dy),(51,(ov[2] if len(ov)>2 else 68)),1.5,1.5,ramp=rc(ov[1]),g='apron')
    if d.get('scab'): cv.capsule((46,54+dy),(40,67+dy),1.0,.8,ramp=rc(d['scab']),g='scab')
    cy=31.5+dy; cx=48
    if hood: hoodpre(cv,d,cx,cy,dy,'s')
    if st in('long','bun') and not hood: cv.capsule((cx-2.5,cy),(cx-3,cy+(9 if st=='long' else 2)),3.6,2.6 if st=='long' else 3,ramp=hr)
    cv.capsule((cx,36.5+dy),(cx-.5,39+dy),1.9,2.1,ramp=sk,g='head'); neckwear(cv,d,47,dy,'s')
    pid=cv.capsule((cx,cy-1),(cx+.6,cy+1.2),4.2,3.8,ramp=sk,g='head')
    px(cx+5,cy+1,sk[2]); px(cx+2.4,cy,d['eyes'])
    if d['beard']:
        for (x,y) in ((2,3),(3,3),(1,4),(2,4),(3,4),(0,3),(2,5),(1,5),(4,2),(3,2)): px(cx+x,cy+y,ramp(H(d['beard']))[2])
    if st!='bald' and not hood:
        for y in range(int(cy-8),int(cy+5)):
            for x in range(cx-7,cx+7):
                dx=x-cx; dyy=y-(cy-.6)
                if dx*dx+dyy*dyy<=5.5**2 and (dyy<-1.2 or dx<-1.4-(dyy*.25)) and not (dx>2.2 and dyy>-2.6): px(x,y,hr[3 if (-dx*.5-dyy*.8)>2 else 2 if dyy<1 else 1],pid)
    if st=='bun' and not hood: cv.capsule((cx-5,cy-3),(cx-5.5,cy-3),2.2,2.2,ramp=hr)
    hoodpost(cv,d,cx,cy,'s',pid); hat(cv,d,cx,cy,'s',pid); face(cv,d,cx,cy,'s')
    if d['held']:
        sh=(47,40.5+dy); el=pol(sh,R(-8),9.5); c=W[d['held']][0]; wr=pol(el,R(62 if c!='pole' else 75),8.5)
        hs=(wr[0]+.4,wr[1]+1)
        if c in('pole','bow'): a,u=carry(d,'s',hs,dy); held(cv,a,u,W[d['held']][1],'W'); arm([sh,el,wr],0,'A0')
        else: arm([sh,el,wr],0,'A0'); a,u=carry(d,'s',hs,dy); held(cv,a,u,W[d['held']][1],'W')
    else: arm(k[0]['arm'],0,'A0')
    if ov and ov[0] in('poncho','cape'):
        L=ov[2] if len(ov)>2 else (58 if ov[0]=='poncho' else 52); cv.capsule((47,41+dy),(47,L+dy),4.6,5.0+(L-41)*.1,ramp=rc(ov[1]),g='poncho')
    cv.outline(d['ink']); texture(cv,d); return cv.c
def sheet(d):
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=side(d,f)
        for row,im in ((0,front(d,f,True)),(1,r[:,::-1]),(2,front(d,f)),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=im
    return sh
