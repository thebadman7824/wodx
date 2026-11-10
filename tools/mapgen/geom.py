"""WoDX map generators: plain 2D geometry for the organic town layout (no outside libraries).
Points are (x, y) tuples; polygons are lists of points."""
import math

def area(poly):
    """Signed area: positive when the points run clockwise on a map whose y grows downward."""
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) / 2

def centroid(poly):
    A = area(poly)
    if abs(A) < 1e-9: return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))
    cx = sum((a[0] + b[0]) * (a[0] * b[1] - b[0] * a[1]) for a, b in zip(poly, poly[1:] + poly[:1])) / (6 * A)
    cy = sum((a[1] + b[1]) * (a[0] * b[1] - b[0] * a[1]) for a, b in zip(poly, poly[1:] + poly[:1])) / (6 * A)
    return (cx, cy)

def inside(p, poly):
    x, y = p
    hit = False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay): hit = not hit
    return hit

def seg_dist(p, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L))
    return math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)

def poly_dist(p, poly):
    """0 inside, else the distance to the outline."""
    if inside(p, poly): return 0.0
    return min(seg_dist(p, a, b) for a, b in zip(poly, poly[1:] + poly[:1]))

def edge_dist(p, poly):
    """The distance to the outline, inside or out."""
    return min(seg_dist(p, a, b) for a, b in zip(poly, poly[1:] + poly[:1]))

def seg_poly_dist(a, b, poly):
    """The least distance from a segment to a polygon's area: 0 when it touches, crosses or lies inside."""
    if inside(a, poly) or inside(b, poly): return 0.0
    o = lambda u, v, w: (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0])
    d = math.inf
    for p, q in zip(poly, poly[1:] + poly[:1]):
        if o(a, b, p) * o(a, b, q) < 0 and o(p, q, a) * o(p, q, b) < 0: return 0.0
        d = min(d, seg_dist(p, a, b), seg_dist(a, p, q), seg_dist(b, p, q))
    return d

def separation(A, B):
    """For two convex polygons, the widest gap between them along any edge normal; below 0 they overlap."""
    best = -math.inf
    for P in (A, B):
        for a, b in zip(P, P[1:] + P[:1]):
            nx, ny = b[1] - a[1], a[0] - b[0]
            L = math.hypot(nx, ny)
            if L < 1e-9: continue
            nx, ny = nx / L, ny / L
            pa = [q[0] * nx + q[1] * ny for q in A]
            pb = [q[0] * nx + q[1] * ny for q in B]
            best = max(best, min(pb) - max(pa), min(pa) - max(pb))
    return best

def bbox(poly):
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    return (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))

def line_x(p1, d1, p2, d2):
    """Where two lines (point, direction) cross, or None if parallel."""
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-9: return None
    t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
    return (p1[0] + d1[0] * t, p1[1] + d1[1] * t)

def inset(poly, dists):
    """Each edge moved inward by its own distance; None when the polygon folds over itself."""
    s = 1 if area(poly) > 0 else -1
    n = len(poly)
    lines = []
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        if L < 1e-9: return None
        nx, ny = -dy / L * s, dx / L * s                    # points into the polygon
        d = dists[i]
        lines.append(((a[0] + nx * d, a[1] + ny * d), (dx, dy)))
    out = []
    for i in range(n):
        p = line_x(*lines[i - 1], *lines[i])
        if p is None: return None
        out.append(p)
    if area(out) * area(poly) <= 0 or abs(area(out)) < 4: return None
    # every edge must keep its direction, or the inset turned it inside out
    for i in range(n):
        a, b = out[i], out[(i + 1) % n]
        if (b[0] - a[0]) * lines[i][1][0] + (b[1] - a[1]) * lines[i][1][1] <= 0: return None
    return out

def clip_poly(poly, win):
    """A polygon cut to a window (x, y, w, h), Sutherland and Hodgman's way."""
    x0, y0, w, h = win
    x1, y1 = x0 + w, y0 + h
    def cut(pts, inside_f, cross):
        out = []
        for i, q in enumerate(pts):
            p = pts[i - 1]
            if inside_f(q):
                if not inside_f(p): out.append(cross(p, q))
                out.append(q)
            elif inside_f(p): out.append(cross(p, q))
        return out
    def at_x(X): return lambda p, q: (X, p[1] + (q[1] - p[1]) * (X - p[0]) / (q[0] - p[0]))
    def at_y(Y): return lambda p, q: (p[0] + (q[0] - p[0]) * (Y - p[1]) / (q[1] - p[1]), Y)
    pts = list(poly)
    for f, c in ((lambda p: p[0] >= x0, at_x(x0)), (lambda p: p[0] <= x1, at_x(x1)), (lambda p: p[1] >= y0, at_y(y0)), (lambda p: p[1] <= y1, at_y(y1))):
        if not pts: break
        pts = cut(pts, f, c)
    return pts if len(pts) >= 3 and abs(area(pts)) > .05 else None

def clip_line(points, win):
    """A polyline cut to a window: the pieces that lie inside it."""
    x0, y0, w, h = win
    x1, y1 = x0 + w, y0 + h
    pieces, cur = [], []
    for a, b in zip(points, points[1:]):
        t0, t1 = 0.0, 1.0
        dx, dy = b[0] - a[0], b[1] - a[1]
        ok = True
        for p, q in ((-dx, a[0] - x0), (dx, x1 - a[0]), (-dy, a[1] - y0), (dy, y1 - a[1])):
            if p == 0:
                if q < 0: ok = False; break
            else:
                t = q / p
                if p < 0: t0 = max(t0, t)
                else: t1 = min(t1, t)
        if not ok or t0 > t1:
            if cur: pieces.append(cur); cur = []
            continue
        pa, pb = (a[0] + dx * t0, a[1] + dy * t0), (a[0] + dx * t1, a[1] + dy * t1)
        if cur and math.hypot(cur[-1][0] - pa[0], cur[-1][1] - pa[1]) < 1e-6: cur.append(pb)
        else:
            if cur: pieces.append(cur)
            cur = [pa, pb]
    if cur: pieces.append(cur)
    return [p for p in pieces if len(p) >= 2 and sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(p, p[1:])) > .05]

def buffer_line(points, half):
    """A polyline widened to a band, as one polygon (mitred, good enough for gentle bends)."""
    left, right = [], []
    n = len(points)
    for i, p in enumerate(points):
        ds = []
        if i > 0: ds.append((p[0] - points[i - 1][0], p[1] - points[i - 1][1]))
        if i < n - 1: ds.append((points[i + 1][0] - p[0], points[i + 1][1] - p[1]))
        dx, dy = (sum(d[0] / (math.hypot(*d) or 1) for d in ds), sum(d[1] / (math.hypot(*d) or 1) for d in ds))
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        left.append((p[0] + nx * half, p[1] + ny * half)); right.append((p[0] - nx * half, p[1] - ny * half))
    return left + right[::-1]

# ------------------------------------------------------------------ Voronoi, by way of Delaunay
def circum(a, b, c):
    ax, ay = a; bx, by = b; cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-12: return None
    ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
    return (ux, uy)

def delaunay(points):
    """Bowyer and Watson's way. Returns triangles as index triples into points; indexes past the end are the
    frame's corners, far out."""
    n = len(points)
    big = 1e5
    pts = list(points) + [(-big, -big), (big, -big), (0, big)]
    tris = [(n, n + 1, n + 2)]
    cc = {tris[0]: (circum(*[pts[i] for i in tris[0]]))}
    for i in range(n):
        p = pts[i]
        bad = []
        for t in tris:
            c = cc[t]
            r = math.hypot(pts[t[0]][0] - c[0], pts[t[0]][1] - c[1])
            if math.hypot(p[0] - c[0], p[1] - c[1]) < r: bad.append(t)
        edges = {}
        for t in bad:
            for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                k = tuple(sorted(e))
                edges[k] = edges.get(k, 0) + 1
        tris = [t for t in tris if t not in set(bad)]
        for t in bad: cc.pop(t, None)
        for (a, b), cnt in edges.items():
            if cnt == 1:
                t = (a, b, i)
                c = circum(pts[a], pts[b], pts[i])
                if c is None: continue
                tris.append(t); cc[t] = c
    return tris, cc, pts

def voronoi(points):
    """Voronoi regions of the points that are closed in by others: {point index: [vertex ids]}, vertices {id: (x, y)}.
    A region's vertices run clockwise on the map and neighbours share vertex ids."""
    tris, cc, pts = delaunay(points)
    n = len(points)
    ids = {t: k for k, t in enumerate(tris)}
    verts = {ids[t]: cc[t] for t in tris}
    around = {}
    for t in tris:
        for i in t: around.setdefault(i, []).append(t)
    regions = {}
    for i in range(n):
        ts = around.get(i, [])
        if not ts or any(j >= n for t in ts for j in t): continue
        p = pts[i]
        ts.sort(key=lambda t: math.atan2(cc[t][1] - p[1], cc[t][0] - p[0]))
        regions[i] = [ids[t] for t in ts]
    return regions, verts

def half_plane(poly, p, n, off=0.0):
    """The part of a polygon on the side of the line through p that n points to, moved off along n."""
    q = (p[0] + n[0] * off, p[1] + n[1] * off)
    side = lambda v: (v[0] - q[0]) * n[0] + (v[1] - q[1]) * n[1]
    out = []
    for i, b in enumerate(poly):
        a = poly[i - 1]
        sa, sb = side(a), side(b)
        if sb >= 0:
            if sa < 0: t = sa / (sa - sb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            out.append(b)
        elif sa >= 0:
            t = sa / (sa - sb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out if len(out) >= 3 and abs(area(out)) > .01 else None

def chord(poly, p, d):
    """Where the line through p along d crosses a convex polygon: the two ends, or None."""
    hits = []
    for i, b in enumerate(poly):
        a = poly[i - 1]
        x = line_x(p, d, a, (b[0] - a[0], b[1] - a[1]))
        if x is None: continue
        ex, ey = b[0] - a[0], b[1] - a[1]
        L = ex * ex + ey * ey
        t = ((x[0] - a[0]) * ex + (x[1] - a[1]) * ey) / L if L else -1
        if -1e-6 <= t <= 1 + 1e-6: hits.append(x)
    if len(hits) < 2: return None
    hits.sort(key=lambda h: (h[0] - p[0]) * d[0] + (h[1] - p[1]) * d[1])
    return hits[0], hits[-1]
