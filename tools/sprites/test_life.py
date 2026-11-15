# Everyday life (B5660 to B5664): beasts stand on four feet, graze and lie down; people stand still, sit, kneel, work, carry and sleep.
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import beast as B, wear as Wr, batch as Bt
SH,S=112,96
def box(fr):
    ys,xs=np.nonzero(fr[...,3]); return xs.min(),ys.min(),xs.max(),ys.max()
def cell(sh,row,col): return sh[row*SH:(row+1)*SH,col*S:(col+1)*S]
# every four-legged kind: a standing frame with its feet on the ground line, a head that comes down to graze, a body that comes down to lie
for name,a in B.KINDS.items():
    assert a['leg'] in('paw','hoof','pad'), name
    st=B.stand(a); assert st.shape==(4*SH,S,4), name
    x0,y0,x1,y1=box(cell(st,3,0)); walk=B.sheet(a); wy=max(box(cell(walk,3,f))[3] for f in range(8))
    assert abs(y1-wy)<=2, (name,y1,wy)
    lie=B.posed(a,'lie'); gz=B.posed(a,'graze'); assert lie.shape==gz.shape==(4*SH,6*S,4), name
    assert box(cell(lie,3,5))[1]>=y0, (name,'lying is no taller than standing')
    assert box(cell(lie,3,5))[3]<=y1+2, (name,'lying stays on the ground')
for name in ('horse','cow','sheep','deer','pig','goat'):
    a=B.fit(B.KINDS[name]); assert a['leg']=='hoof'
    fr=cell(B.stand(B.KINDS[name]),3,0); hoof=np.array(Bt.Wr.ramp(a['hoof'])[2])
    low=fr[box(fr)[3]-2:box(fr)[3]+1]; m=low[...,3]>0
    assert (np.abs(low[m][:,:3].astype(int)-hoof).sum(1)<90).any(), (name,'a dark hoof at the foot')
# the head of a grazing cow is far below the head of a standing one
a=B.KINDS['cow']; up=cell(B.stand(a),3,0); dn=cell(B.posed(a,'graze'),3,5)
assert box(dn)[2]<box(up)[2]-4 and box(dn)[3]<=box(up)[3]+1, (box(dn),box(up))
# people
d=Wr.fig(skin=(206,166,132),hair=('#5a4026','short'),top=('#5a4532','tunic'),legs=('#4a4238','tights'))
st=Wr.stand(d); assert st.shape==(4*SH,S,4)
tall=box(cell(st,2,0)); h0=tall[3]-tall[1]
for n in Wr.POSED:
    sh=Wr.posed(d,n); assert sh.shape==(4*SH,6*S,4), n
    for row in range(4):
        b=box(cell(sh,row,5)); assert b[3]<=tall[3]+2, (n,row,'nothing below the ground',b)
        if n in('seat','stool','sit','kneel','sup','tend'): assert b[3]-b[1]<h0-6, (n,row,'lower than standing')
assert box(cell(Wr.posed(d,'sit'),2,5))[1]>box(cell(Wr.posed(d,'seat'),2,5))[1], 'on the ground is lower than on a seat'
sl=Wr.asleep(d)
for row,flat in ((0,False),(1,True),(2,False),(3,True)):
    b=box(cell(sl,row,5)); assert ((b[2]-b[0])>(b[3]-b[1]))==flat, (row,b)
ca=Wr.carrying(d); assert ca.shape==(4*SH,8*S,4)
assert box(cell(ca,3,0))[2]>box(cell(Wr.sheet(d),3,0))[2], 'the load is carried in front'
# children take every pose too, smaller
k=dict(d,growth='small')
for n in Wr.POSED: assert box(cell(Wr.posed(k,n),2,5))[1]>box(cell(Wr.posed(d,n),2,5))[1], n
# the batch: a person's walk gets its standing frame, the drawn poses and the load; a beast its own
sheets,label,notes,sq=Bt.draw(dict(id='t1',kind='person',year=1300,look=dict(skin='c89878',hair='3a2a1c'),worn=[],held=[]))
assert set(Wr.POSED)<=set(sheets) and {'stand','carry','sleep'}<=set(sheets), set(sheets)
sheets,label,notes,sq=Bt.draw(dict(id='t2',kind='animal',name='Cow'))
assert {'stand','graze','lie'}<=set(sheets), set(sheets)
print('everyday life ok')
