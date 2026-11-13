# Children (B3480): the same figure drawn shorter, with a head larger for its body, by squeezing every point the rig
# lays down toward the feet. Nothing is drawn from a picture: the shapes are the rig's own, so they stay crisp, and
# every piece of clothing, hair, hat and gear a grown figure can wear fits a child the same way.
# A band: (whole height as a share of a grown figure's, head size, body width). Every share is at most 1, so no gap
# opens between pixels. Heights follow common growth charts in rough steps (about half a grown height at 3, two
# thirds at 8, five sixths at 13); the head shrinks least, as it does in life.
BANDS={
 'small':(0.56,0.86,0.78),   # about 2 to 6
 'child':(0.70,0.90,0.82),   # about 7 to 11
 'young':(0.84,0.95,0.90),   # about 12 to 14
 'youth':(0.94,0.98,0.96),   # about 15 to 17
}
FEET=87.0      # where the soles stand in the rig's own y (frame row 103 less the canvas offset)
TALL=64.0      # a grown figure from soles to crown
HEAD=15.0      # of which the head, crown to chin
NECK=39.5      # the chin line in the rig's y with no bob; the drawing passes its own bob
CX=48.0
def band(age=None,growth=None):
    """the band for a roster entry: its own growth if named, else from its age in years; None for the grown"""
    if growth in BANDS: return growth
    try: a=float(age)
    except (TypeError,ValueError): return None
    if a>=18: return None
    return 'small' if a<7 else 'child' if a<12 else 'young' if a<15 else 'youth'
class Warp:
    """maps a point of the grown figure to the child's; neck is the chin line for this frame"""
    def __init__(s,name,neck=NECK):
        tot,kh,kw=BANDS[name]; s.kh,s.kw=kh,kw
        s.kb=(tot*TALL-kh*HEAD)/(TALL-HEAD)    # the body below the chin takes what the head leaves
        s.n=neck; s.n2=FEET-(FEET-neck)*s.kb
    def k(s,y): return s.kh if y<s.n else s.kw
    def pt(s,x,y):
        if y>=s.n: return (CX+(x-CX)*s.kw, FEET-(FEET-y)*s.kb)
        return (CX+(x-CX)*s.kh, s.n2-(s.n-y)*s.kh)
def beardless(name): return name in ('small','child','young')
