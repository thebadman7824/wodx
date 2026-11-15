# Children (B3480): the same figure drawn shorter, with a head larger for its body, by squeezing every point the rig
# lays down toward the feet. Nothing is drawn from a picture: the shapes are the rig's own, so they stay crisp, and
# every piece of clothing, hair, hat and gear a grown figure can wear fits a child the same way.
# A band: (whole height as a share of a grown figure's, head size, body width). Every share is at most 1, so no gap
# opens between pixels. Heights follow common growth charts in rough steps (about half a grown height at 3, two
# thirds at 8, five sixths at 13); the head shrinks least, as it does in life.
BANDS={
 'small':(0.56,0.93,0.76),   # about 2 to 6
 'child':(0.70,0.94,0.80),   # about 7 to 11
 'young':(0.84,0.96,0.89),   # about 12 to 14
 'youth':(0.94,0.98,0.96),   # about 15 to 17
}
# A child is not a small adult (B5663): the legs are the shortest part of a young body and grow the most, so each band
# gives the legs their own share of the height below the chin (a grown figure's legs take 0.63 of it), and the trunk
# takes the rest. The head keeps nearly its full width, the shoulders come in, and the neck all but goes.
LEGS={'small':0.50,'child':0.55,'young':0.60,'youth':0.62}
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
HIP=17.5       # from the chin line down to the hip line in a grown figure
class Warp:
    """maps a point of the grown figure to the child's; neck is the chin line for this frame"""
    def __init__(s,name,neck=NECK):
        tot,kh,kw=BANDS[name]; s.kh,s.kw=kh,kw
        below=tot*TALL-kh*HEAD; legs=below*LEGS[name]    # what the head leaves, shared between legs and trunk
        s.hip=neck+HIP; s.kl=legs/(FEET-NECK-HIP); s.kt=(below-legs)/HIP
        s.kb=below/(TALL-HEAD)
        s.n=neck; s.hip2=FEET-(FEET-s.hip)*s.kl; s.n2=s.hip2-HIP*s.kt
    def k(s,y): return (s.kh+1)/2 if y<s.n-4 else s.kh if y<s.n else s.kw
    def pt(s,x,y):
        if y>=s.hip: return (CX+(x-CX)*s.kw, FEET-(FEET-y)*s.kl)
        if y>=s.n: return (CX+(x-CX)*s.kw, s.hip2-(s.hip-y)*s.kt)
        return (CX+(x-CX)*s.kh, s.n2-(s.n-y)*s.kh)
def beardless(name): return name in ('small','child','young')
