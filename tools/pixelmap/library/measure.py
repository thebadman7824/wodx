"""Draw every library object alone and measure it against its true size (B6332): what test_library.py and the
contact sheet both use."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from library.core import CATALOGUE, render, T


def measure(sp, face="s", state=None, var=None):
    """(rendered, problems): problems lists anything drawn outside the footprint or far smaller than it."""
    wf, df = sp.size(); st = state or sp.states[0]
    v = sp.look(None); v.update(next(iter(sp.variants.values())) if sp.variants else {})
    try:  # a real variation of its first era, so era, wealth and style are set (global_from objects need them)
        from library import variants as V
        eras = V.eras_for(sp.id)
        if eras: v.update(V.variations(sp.id, eras[-1] if sp.global_from else eras[0])[0])
    except Exception: pass
    v.update(var or {})
    r = render(sp, face, wf, df, st, v, 7)
    body = r["body"]; pad = r["pad"]; out = []
    ys, xs = np.nonzero(body)
    if not len(xs): return r, ["draws nothing"]
    fw, fh = r["fw"] * T, r["fh"] * T
    x0, x1, y0, y1 = xs.min() - pad, xs.max() + 1 - pad, ys.min() - pad, ys.max() + 1 - pad
    tol = 4
    if x0 < -tol or y0 < -tol or x1 > fw + tol or y1 > fh + tol:
        out.append(f"drawn past its {sp.ft} ft footprint by {max(-x0, -y0, x1 - fw, y1 - fh):.0f} px")
    if sp.group != "goods" and sp.mount != "on" and ((x1 - x0) < fw * .6 or (y1 - y0) < fh * .6):
        out.append(f"drawn at {(x1 - x0) / T * 5:.1f} by {(y1 - y0) / T * 5:.1f} ft, much smaller than its size {fw / T * 5:.1f} by {fh / T * 5:.1f} ft")
    return r, out


def all_problems():
    res = {}
    for oid, sp in CATALOGUE.items():
        if sp.mount == "opening": continue
        probs = []
        for st in sp.states:
            try: _, p = measure(sp, state=st)
            except Exception as e: p = [f"fails to draw: {e!r}"]
            probs += [f"{st}: {x}" if st != "one" else x for x in p if not (st == "open" and "past" in x)]
        if probs: res[oid] = probs
    return res


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import library  # noqa
    for k, v in all_problems().items(): print(k, v)
    print(len(CATALOGUE), "objects")
