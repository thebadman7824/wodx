"""The lie of the land under a generated town, and the river it gives (house rules on the river research doc,
B656).

The order follows how rivers form: the ground first, then the water down its lowest line, then the town on the dry
rise. Land makes a coarse height field (a tilt down the valley, rolling noise, and the rise the town stands on);
course() routes the river down the valley floor by the cheapest path over low ground; shape() lays real bends on
that course where the ground is flat (the sine-generated curve, organic.meander), cuts off loops that close on
themselves, and gives the water a width that changes along it, ragged banks and gravel bars inside the bends.
Everything is in map squares."""
import heapq, math

STEP = 2.0                                                   # the height field's cell, in squares


class Noise:
    """Smooth value noise on a seeded lattice, summed over a few octaves (0 to 1)."""
    def __init__(self, R, scale, octaves=3):
        self.scale, self.oct = scale, octaves
        self.seed = [R.random() * 1000 for _ in range(octaves)]

    @staticmethod
    def _h(i, j, s):
        n = math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
        return n - math.floor(n)

    def __call__(self, x, y):
        tot, amp, norm, f = 0.0, 1.0, 0.0, 1.0 / self.scale
        for o in range(self.oct):
            u, v = x * f, y * f
            i, j = math.floor(u), math.floor(v)
            fu, fv = u - i, v - j
            fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
            s = self.seed[o]
            a = self._h(i, j, s) * (1 - fu) + self._h(i + 1, j, s) * fu
            b = self._h(i, j + 1, s) * (1 - fu) + self._h(i + 1, j + 1, s) * fu
            tot += amp * (a * (1 - fv) + b * fv)
            norm += amp; amp *= .5; f *= 2
        return tot / norm


class Land:
    """Height (0 low to about 1.5 high) over the map. th: the way the valley falls; rise: (x, y, radius) of the
    ground the town stands on; keep: polygons the water must not touch (the market)."""
    def __init__(self, R, cols, rows, th, rise, valley=None, width=40):
        """valley: a point the valley's middle line passes through (it runs along th); width: the valley floor's
        breadth, in squares. The sides climb away from it, so the water keeps to the floor."""
        self.R, self.cols, self.rows, self.th = R, cols, rows, th
        self.valley, self.vw = valley or (cols / 2, rows / 2), width
        self.noise = Noise(R, max(40.0, (cols + rows) / 5))
        self.rise = rise
        self.u = (math.cos(th), math.sin(th))
        self.nx, self.ny = int(cols / STEP) + 1, int(rows / STEP) + 1
        self.h = [[self.at(i * STEP, j * STEP) for i in range(self.nx)] for j in range(self.ny)]

    def at(self, x, y):
        cx, cy, r = self.rise
        along = ((x - self.cols / 2) * self.u[0] + (y - self.rows / 2) * self.u[1]) / max(self.cols, self.rows)
        d = math.hypot(x - cx, y - cy) / max(r, 1)
        side = abs(-(x - self.valley[0]) * self.u[1] + (y - self.valley[1]) * self.u[0]) / self.vw
        return .45 * self.noise(x, y) - .25 * along + .45 * math.exp(-d * d) + .5 * min(side, 3) ** 1.5

    def height(self, x, y):
        i, j = min(self.nx - 1, max(0, round(x / STEP))), min(self.ny - 1, max(0, round(y / STEP)))
        return self.h[j][i]

    def course(self, avoid):
        """The valley floor: the cheapest way across the map from the up-valley side to the down-valley side, over
        low ground. avoid(x, y) gives an extra cost (the market, the town gates). Returns points in squares."""
        nx, ny, u = self.nx, self.ny, self.u
        edge = [(i, j) for i in range(nx) for j in range(ny) if i in (0, nx - 1) or j in (0, ny - 1)]
        side = lambda c: (c[0] * STEP - self.cols / 2) * u[0] + (c[1] * STEP - self.rows / 2) * u[1]
        across = lambda c: -(c[0] * STEP - self.cols / 2) * u[1] + (c[1] * STEP - self.rows / 2) * u[0]
        hi = max(side(c) for c in edge)
        # it enters on the up-valley side, not far off the valley's middle line, and leaves on the far side
        vx = -(self.valley[0] - self.cols / 2) * u[1] + (self.valley[1] - self.rows / 2) * u[0]
        ups = [c for c in edge if side(c) < -hi * .6 and abs(across(c) - vx) < self.vw] or [min(edge, key=lambda c: abs(across(c) - vx) + 3 * side(c))]
        downs = {c for c in edge if side(c) > hi * .6}
        start = min(ups, key=lambda c: self.h[c[1]][c[0]] + self.R.random() * .15)
        rim = lambda i, j: 6.0 if min(i, j, nx - 1 - i, ny - 1 - j) * STEP < 10 else 0.0   # not along the map's edge
        cost = lambda i, j: 1 + 40 * max(0, self.h[j][i]) ** 2 + rim(i, j) + avoid(i * STEP, j * STEP)
        dist, prev, pq = {start: 0.0}, {}, [(0.0, start)]
        end = None
        while pq:
            d, c = heapq.heappop(pq)
            if d > dist.get(c, 1e18): continue
            if c in downs: end = c; break
            i, j = c
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                k, l = i + di, j + dj
                if not (0 <= k < nx and 0 <= l < ny): continue
                nd = d + cost(k, l) * math.hypot(di, dj)
                if nd < dist.get((k, l), 1e18):
                    dist[(k, l)] = nd; prev[(k, l)] = c; heapq.heappush(pq, (nd, (k, l)))
        path, c = [], end
        while c is not None:
            path.append((c[0] * STEP, c[1] * STEP)); c = prev.get(c)
        path.reverse()
        return path


def chaikin(pts, n=3):
    for _ in range(n):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        pts = out + [pts[-1]]
    return pts


def resample(pts, ds):
    out, carry = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); t = ds - carry
        while t <= L:
            out.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L)); t += ds
        carry = L - (t - ds)
    if math.dist(out[-1], pts[-1]) > ds * .3: out.append(pts[-1])
    return out


def smooth(pts, win):
    """A running mean over win points either side: the valley's broad line, with the small jogs taken out."""
    out = []
    for i in range(len(pts)):
        a, b = max(0, i - win), min(len(pts), i + win + 1)
        out.append((sum(p[0] for p in pts[a:b]) / (b - a), sum(p[1] for p in pts[a:b]) / (b - a)))
    out[0], out[-1] = pts[0], pts[-1]
    return out


def normals(pts):
    ns = []
    for i in range(len(pts)):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
        ns.append((-dy / L, dx / L))
    return ns


def cut_offs(pts, B, ds=2.0):
    """Loops whose neck closes to under two widths are cut across, as a flood cuts them; the old loops are returned."""
    oxbows, gap, i = [], 4 * B / ds, 0
    while i < len(pts):
        hit = next((j for j in range(len(pts) - 1, int(i + gap), -1) if math.dist(pts[i], pts[j]) < 2 * B), None)
        if hit:
            oxbows.append(pts[i:hit + 1])
            neck = [(pts[i][0] + (pts[hit][0] - pts[i][0]) * t / 4, pts[i][1] + (pts[hit][1] - pts[i][1]) * t / 4) for t in range(1, 4)]
            pts = pts[:i + 1] + neck + pts[hit:]
        i += 1
    return pts, oxbows


def shape(R, land, course, B, K, meander):
    """The river's middle line on the valley course, with bends where the ground is flat, then cut-offs.
    meander(R, th, length, B, K) gives a bend pattern along x (organic.meander)."""
    base = smooth(resample(chaikin(course, 3), 2.0), int(4 * B))
    base = smooth(smooth(base, int(3 * B)), int(3 * B))
    def stretch(a, b, by):                                    # run on past the map's edge, so the bends do not stop short
        dx, dy = a[0] - b[0], a[1] - b[1]; L_ = math.hypot(dx, dy) or 1
        return [(a[0] + dx / L_ * t, a[1] + dy / L_ * t) for t in range(int(by), 0, -2)]
    base = stretch(base[0], base[3], 50) + base + stretch(base[-1], base[-4], 50)[::-1]
    L = sum(math.dist(a, b) for a, b in zip(base, base[1:]))
    wig, _ = meander(R, 0.0, L + 20, B, K)
    xs, m = [], -1e9
    for p in wig: m = max(m, p[0]); xs.append(m)
    import bisect
    def lateral(s):                                           # the bend pattern's side-step at distance s along
        k = max(0, min(len(xs) - 2, bisect.bisect_left(xs, s) - 1))
        a, b = wig[k], wig[k + 1]
        t = 0 if xs[k + 1] == xs[k] else (s - xs[k]) / (xs[k + 1] - xs[k])
        return a[1] + (b[1] - a[1]) * max(0, min(1, t))
    ns, out, s = normals(base), [], 0.0
    fl = [max(.35, min(1.0, 1.2 - 1.0 * max(0, land.height(*p)))) for p in base]   # higher, steeper ground bends less
    w_ = int(6 * B)
    fl = [sum(fl[max(0, i - w_):i + w_ + 1]) / len(fl[max(0, i - w_):i + w_ + 1]) for i in range(len(fl))]
    for i, p in enumerate(base):
        if i: s += math.dist(base[i - 1], p)
        y = lateral(s) * fl[i]
        out.append((p[0] + ns[i][0] * y, p[1] + ns[i][1] * y))
    out = steer(resample(out, 2.0), 1.6 * B)
    return cut_offs(out, B)


def steer(pts, rmin, ds=2.0):
    """Walks the line as the water would: heading for a point a little ahead, turning no tighter than rmin. Where
    the bends laid on a curving valley would fold into a corner, the walk rounds it off."""
    turn = ds / rmin
    out, pos = [pts[0]], pts[0]
    head = math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])
    k, n = 0, len(pts)
    while k < n - 1 and len(out) < 4 * n:
        while k < n - 1 and math.dist(pos, pts[k]) < 3 * ds: k += 1
        want = math.atan2(pts[k][1] - pos[1], pts[k][0] - pos[0])
        d = (want - head + math.pi) % (2 * math.pi) - math.pi
        head += max(-turn, min(turn, d))
        pos = (pos[0] + ds * math.cos(head), pos[1] + ds * math.sin(head))
        out.append(pos)
    return out


def banks(R, line, half, noise):
    """The water's two edges: a width that swells in the bends and narrows on the straight crossings, a little
    wider downstream, with ragged edges; the inner bank of a strong bend gives up some water to a gravel bar.
    Returns (left, right, bars, widths): bars as polygons."""
    n, ns = len(line), normals(line)
    curv = [0.0] * n
    for i in range(1, n - 1):
        a, b, c = line[i - 1], line[i], line[i + 1]
        h1 = math.atan2(b[1] - a[1], b[0] - a[0]); h2 = math.atan2(c[1] - b[1], c[0] - b[0])
        curv[i] = (h2 - h1 + math.pi) % (2 * math.pi) - math.pi
    curv = [sum(curv[max(0, i - 3):i + 4]) / len(curv[max(0, i - 3):i + 4]) for i in range(n)]
    big = max(1e-6, max(abs(c) for c in curv))
    left, right, bars, widths, bar = [], [], [], [], []
    for i, p in enumerate(line):
        k = abs(curv[i]) / big
        f = (.74 + .18 * k + .08 * i / max(1, n - 1)) * (1 + .10 * (noise(p[0] * 3, p[1] * 3) - .5))
        f = max(.66, min(1.0, f))
        w = half * f
        rag = lambda s: .22 * half * (noise(p[0] * 5 + s, p[1] * 5 - s) - .5)
        bl, br = w + rag(13), w + rag(71)
        inner = 1 if curv[i] < 0 else -1                     # the inside of the bend: the left side when it turns left
        cut = half * .55 * max(0, k - .45) / .55
        if inner > 0: bl -= cut
        else: br -= cut
        left.append((p[0] + ns[i][0] * bl, p[1] + ns[i][1] * bl))
        right.append((p[0] - ns[i][0] * br, p[1] - ns[i][1] * br))
        widths.append(bl + br)
        if cut > .25 * half:                                  # a gravel bar between the water and the band's edge
            edge = (p[0] + inner * ns[i][0] * half, p[1] + inner * ns[i][1] * half)
            water = left[-1] if inner > 0 else right[-1]
            bar.append((edge, water))
        elif bar:
            if len(bar) > 2: bars.append([e for e, _ in bar] + [w_ for _, w_ in reversed(bar)])
            bar = []
    if len(bar) > 2: bars.append([e for e, _ in bar] + [w_ for _, w_ in reversed(bar)])
    return left, right, bars, widths
