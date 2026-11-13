# Power effects as their own sheets, laid over a figure's casting move: fx/<colour>-<shape>.png, 6 frames by 4 facings
# (up, left, down, right), 96 by 112, clear but for the effect.  Each is what the rig draws for a power on a plain
# figure, with the figure taken away.  Run:  python3 proto_fx.py <folder of the proto sheets>
import sys, os, numpy as np
from PIL import Image
import wear as Wr
S,SH=Wr.S,Wr.SH
SHAPES=('bolt','jag','tendril','spark','wave','gaze','glyph')
PLAIN=dict(skin=(206,170,140),hair=('#3a2a1c','short'),top=('#26262c','shirt'),legs=('#26262c','trousers'),feet=('#16120e','shoe'))
def frames(d):
    out=[]
    for i in range(6):
        r=Wr.side(d,0,('cast',i)); out.append((Wr.front(d,0,True,('cast',i)),r[:,::-1],Wr.front(d,0,False,('cast',i)),r))
    return out
def sheets():
    d=Wr.fig(**PLAIN); a=dict(d); a['held']=None; a['power']=None; bare=frames(a); out={}
    for colour in Wr.FXCOL:
        for shape in SHAPES:
            b=dict(a); b['power']=(colour,shape); sh=np.zeros((4*SH,6*S,4),np.uint8)
            for i,(fr,ba) in enumerate(zip(frames(b),bare)):
                for row in range(4):
                    im=np.array(fr[row]); diff=(im!=np.array(ba[row])).any(axis=2); cell=np.zeros_like(im); cell[diff]=im[diff]
                    sh[row*SH:(row+1)*SH,i*S:(i+1)*S]=cell
            out[f'{colour}-{shape}']=sh
    return out
if __name__=='__main__':
    dst=os.path.join(sys.argv[1],'fx'); os.makedirs(dst,exist_ok=True)
    for k,sh in sheets().items(): Image.fromarray(sh,'RGBA').save(os.path.join(dst,k+'.png'),optimize=True)
    print(len(os.listdir(dst)),'effect sheets')
