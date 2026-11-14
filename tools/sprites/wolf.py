# Four-legged wolf forms (Lupus, Hispo) in the same manner. Own art.
import numpy as np, math
import crinos as K
S,SH=K.S,K.SH
GREY=[(34,30,30),(70,64,60),(104,96,88),(138,128,116),(170,160,146)]
PALE=[(34,30,30),(112,104,94),(150,140,126),(184,174,158),(208,200,186)]
def T(s,ox=48): return lambda x,y:(ox+x*s,87+y*s)
def side(f,s=1.0,heavy=1.0,ramp=GREY,teeth=False):
    cv=K.Cv(); ph=f/8*2*math.pi; P=T(s,47); r=lambda v:v*s*heavy; bob=-abs(math.sin(ph))*.6
    def fore(p,dark,g):
        sw=math.sin(p); lift=max(0,math.cos(p))*2.5
        cv.capsule(P(9,-21+bob),P(8+sw*2.5,-12.5+bob),r(2.8),r(2.0),ramp=ramp,fur=.6*s,seed=1,dark=dark,g=g); cv.capsule(P(8+sw*2.5,-12.5+bob),P(8+sw*6,-2-lift),r(1.9),r(1.5),ramp=ramp,dark=dark,g=g)
        cv.capsule(P(8+sw*6,-1.6-lift),P(10+sw*6,-1.4-lift),r(1.6),r(1.3),ramp=ramp,dark=dark,g=g)
    def hind(p,dark,g):
        sw=math.sin(p); lift=max(0,math.cos(p))*2.5
        st=(-7+sw*2,-12.5+bob); hk=(-12.5+sw*4.5,-7-lift*.5); pw=(-10.5+sw*6.5,-2-lift)
        cv.capsule(P(-10,-21+bob),P(*st),r(3.8),r(2.6),ramp=ramp,fur=.8*s,seed=2,dark=dark,g=g); cv.capsule(P(*st),P(*hk),r(2.2),r(1.6),ramp=ramp,dark=dark,g=g); cv.capsule(P(*hk),P(*pw),r(1.5),r(1.4),ramp=ramp,dark=dark,g=g)
        cv.capsule(P(pw[0],pw[1]+.4),P(pw[0]+2,pw[1]+.6),r(1.6),r(1.3),ramp=ramp,dark=dark,g=g)
    cv.capsule(P(-13,-26+bob),P(-20,-21+bob+math.sin(ph)),r(2.6),r(2.4),ramp=ramp,fur=1.2*s,seed=3,g='tail'); cv.capsule(P(-20,-21+bob+math.sin(ph)),P(-25,-12+bob+math.sin(ph+1)*1.5),r(2.4),r(1.2),ramp=ramp,fur=1.2*s,seed=4,g='tail')
    fore(ph+math.pi,1,'f1'); hind(ph,1,'h1')
    cv.capsule(P(7,-25+bob),P(-9,-24.5+bob),r(7),r(5.6),ramp=ramp,fur=1.2*s,seed=5,g='body')
    cv.capsule(P(2,-20+bob),P(-6,-21+bob),r(3.2),r(2.6),ramp=PALE,fur=.8*s,seed=6,g='body')
    cv.capsule(P(9,-28+bob),P(16,-35+bob),r(5.2),r(4.0),ramp=ramp,fur=1.6*s,seed=7,g='body')
    hind(ph+math.pi,0,'h0'); fore(ph,0,'f0')
    cv.capsule(P(18,-37+bob),P(19.5,-37+bob),r(4.2),r(3.8),ramp=ramp,fur=.8*s,seed=8,g='head')
    cv.capsule(P(20,-36.5+bob),P(27.5,-34.5+bob),r(2.8),r(1.6),ramp=ramp,g='head'); cv.capsule(P(20,-34.6+bob),P(26,-33.2+bob),r(1.5),r(1.0),ramp=PALE,g='jaw')
    cv.capsule(P(16.5,-40+bob),P(15.5,-45.5+bob),r(1.7),r(.5),ramp=ramp,g='ear')
    for xy in ((28.6,-35.2),): cv.px(*P(xy[0],xy[1]+bob),K.NOSE)
    cv.px(*P(21.4,-38.4+bob),K.EYE)
    if teeth:
        for x in (22,24,26): cv.px(*P(x,-33.6+bob),K.TOOTH)
    cv.outline(); return cv.c
def front(f,s=1.0,heavy=1.0,ramp=GREY,back=False,teeth=False):
    cv=K.Cv(); ph=f/8*2*math.pi; P=T(s); r=lambda v:v*s*heavy; bob=-abs(math.sin(ph))*.6
    for sgn,p in ((-1,ph),(1,ph+math.pi)):                       # the pair farther from the viewer
        lift=max(0,math.sin(p))*2.2; x=sgn*(6.5 if not back else 4)
        cv.capsule(P(x,-19+bob),P(x,-10),r(2.6),r(1.9),ramp=ramp,dark=1,g='far%d'%sgn); cv.capsule(P(x,-10),P(x,-1.8-lift),r(1.8),r(1.6),ramp=ramp,dark=1,g='far%d'%sgn)
    if back:
        cv.capsule(P(0,-33+bob),P(0,-31+bob),r(4.2),r(4.4),ramp=ramp,fur=.8*s,seed=9,dark=1,g='head')
        for sgn in (-1,1): cv.capsule(P(sgn*3,-36+bob),P(sgn*4.4,-41.5+bob),r(1.7),r(.5),ramp=ramp,dark=1,g='ear%d'%sgn)
    cv.capsule(P(0,-25+bob),P(0,-18+bob),r(7.2),r(6.2),ramp=ramp,fur=1.2*s,seed=10,g='body')
    if not back: cv.capsule(P(0,-22+bob),P(0,-16+bob),r(3.2),r(2.6),ramp=PALE,fur=.8*s,seed=11,g='body')
    for sgn,p in ((-1,ph+math.pi),(1,ph)):                       # the nearer pair
        lift=max(0,math.sin(p))*2.2; x=sgn*(4 if not back else 5.5); g='near%d'%sgn
        cv.capsule(P(x,-18+bob),P(x*1.1,-9.5),r(3.0 if back else 2.7),r(2.0),ramp=ramp,fur=.6*s,seed=12+sgn,g=g); cv.capsule(P(x*1.1,-9.5),P(x*1.1,-1.8-lift),r(1.9),r(1.7),ramp=ramp,g=g)
    if back:
        sw=math.sin(ph)*2; cv.capsule(P(0,-25+bob),P(sw*.5,-16+bob),r(2.8),r(2.4),ramp=ramp,fur=1.2*s,seed=14,g='tail'); cv.capsule(P(sw*.5,-16+bob),P(sw,-7+bob),r(2.4),r(1.2),ramp=ramp,fur=1.2*s,seed=15,g='tail')
    else:
        cv.capsule(P(-4.5,-30+bob),P(4.5,-30+bob),r(4.2),r(4.2),ramp=ramp,fur=1.6*s,seed=16,g='body')
        cv.capsule(P(0,-35+bob),P(0,-33.5+bob),r(4.6),r(4.2),ramp=ramp,fur=.8*s,seed=17,g='head')
        for sgn in (-1,1): cv.capsule(P(sgn*3,-38+bob),P(sgn*4.6,-43.5+bob),r(1.7),r(.5),ramp=ramp,g='ear%d'%sgn)
        cv.capsule(P(0,-33.5+bob),P(0,-29.5+bob),r(2.5),r(1.9),ramp=PALE,g='muz')
        cv.px(*P(0,-28.6+bob),K.NOSE); cv.px(*P(-2.2,-36+bob),K.EYE); cv.px(*P(2.2,-36+bob),K.EYE)
        if teeth: cv.px(*P(-1.2,-27.6+bob),K.TOOTH); cv.px(*P(1.2,-27.6+bob),K.TOOTH)
    cv.outline(); return cv.c
def sheet(s=1.0,heavy=1.0,ramp=GREY,teeth=False):
    sh=np.zeros((4*SH,8*S,4),np.uint8)
    for f in range(8):
        r=side(f,s,heavy,ramp,teeth)
        for row,im in ((0,front(f,s,heavy,ramp,True)),(1,r[:,::-1]),(2,front(f,s,heavy,ramp,False,teeth)),(3,r)): sh[row*SH:(row+1)*SH,f*S:(f+1)*S]=im
    return sh
