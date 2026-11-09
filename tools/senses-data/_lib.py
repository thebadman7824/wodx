import json
BANDS={"m":"medieval","e":"early","i":"industrial","d":"modern","f":"future"}
def L(t,n=0,e=None,p=None,io=None,sky=None,moon=None,w=None,glows=None,wx=None):
    d={"t":t}
    if n: d["n"]=n
    if e: d["e"]=[BANDS[c] for c in e]
    if p: d["p"]=p.split()
    if io: d["io"]=io
    if sky: d["sky"]=sky.split()
    if moon: d["moon"]=moon.split()
    if w: d["w"]=w
    if wx: d["wx"]=wx.split()
    return d
def parse(block):
    """Lines like:  [n] [e=mi] [p=night dusk] [io=in] | text"""
    out=[]
    for raw in block.strip().splitlines():
        raw=raw.strip()
        if not raw or raw.startswith("#"): continue
        head,_,text=raw.partition("|")
        kw={}; last=None
        for tok in head.split():
            if tok.isdigit(): kw["n"]=int(tok)
            elif "=" in tok:
                k,_,v=tok.partition("=")
                kw[k]=v.replace(",", " "); last=k
            else:
                kw[last]+=" "+tok
        out.append(L(text.strip(),**kw))
    return out
