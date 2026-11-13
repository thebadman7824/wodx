# Children (B3480): a child is the same figure drawn shorter, head larger for its body, feet on the same row, no beard.
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import batch as Bt, child as Ch
SH,S=112,96
def height(a):
    sh,_,_=Bt.draw(a); fr=sh[''][2*SH:3*SH,0:S]; ys=np.nonzero(fr[...,3])[0]; return ys.min(),ys.max(),sh
base=dict(id='t1',kind='person',year=1600,look=dict(skin='c89878',hair='3a2a1c',beard=True),worn=[],held=['Dagger'])
top0,feet0,adult=height(base); tall0=feet0-top0
last=tall0+1
for g in ('youth','young','child','small'):
    top,feet,sh=height(dict(base,growth=g)); tall=feet-top
    assert abs(feet-feet0)<=1, (g,feet,feet0)
    assert tall<last, (g,tall,last); last=tall
    assert abs(tall/tall0-Ch.BANDS[g][0])<0.08, (g,tall/tall0)
    assert set(sh)==set(adult), (g,set(adult)^set(sh))
assert Ch.band(9)=='child' and Ch.band(18) is None and Ch.band(None,'small')=='small' and Ch.band('x') is None
spec,_,_,_=Bt.person(dict(base,growth='child')); assert 'beard' not in spec and spec['growth']=='child'
spec,_,_,_=Bt.person(dict(base,age=16)); assert spec['growth']=='youth' and 'beard' in spec
spec,_,_,_=Bt.person(base); assert 'growth' not in spec
print('child sprites ok')
