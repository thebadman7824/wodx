"""WoDX pixel map drawer (B5730): distance fields and smooth lines for paths, streams and shores."""
import numpy as np
from px import T, Q


def dist(pts, w, h):
    """Distance (in 94ths of a square) from every art pixel to a polyline given in squares."""
    yy, xx = np.mgrid[0:h // Q, 0:w // Q].astype(np.float32) * Q + Q / 2
    best = np.full(yy.shape, 1e9, np.float32)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        ax, ay, bx, by = ax * T, ay * T, bx * T, by * T
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy + 1e-6
        t = np.clip(((xx - ax) * dx + (yy - ay) * dy) / L2, 0, 1)
        best = np.minimum(best, np.hypot(xx - ax - t * dx, yy - ay - t * dy))
    return best


def curve(pts, n=14):
    """A smooth line through points (Catmull-Rom)."""
    P = [pts[0]] + pts + [pts[-1]]; out = []
    for i in range(1, len(P) - 2):
        for t in np.linspace(0, 1, n, endpoint=False):
            a, b, c, d = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(tuple(.5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t ** 3) for k in (0, 1)))
    return out + [pts[-1]]


