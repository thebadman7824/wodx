"""The lie of the land under a generated town, and the river it gives (house rules on the river research doc,
B656).

The order follows how rivers form: the ground first, then the water down its lowest line, then the town on the dry
rise. Land makes a coarse height field (a tilt down the valley, rolling noise, and the rise the town stands on);
course() routes the river down the valley floor by the cheapest path over low ground; shape() lays real bends on
that course where the ground is flat (the sine-generated curve, organic.meander), cuts off loops that close on
themselves, and gives the water a width that changes along it, ragged banks and gravel bars inside the bends.
Everything is in map squares."""
import base64, heapq, math, struct, zlib

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


# Landforms (the landform study doc). relief: metres from the valley floor to the highest ground on the map; the
# rest shapes the ground before the water wears it. A town map is 300 to 850 m across, so it shows one slice of a
# landscape: a valley side, a spur, a lone hill, not a whole range.
KINDS = {
    "plain":     {"label": "river plain", "relief": 5, "fbm": .25, "ridged": 0, "strike": 0, "wall": "wide", "tilt": .15, "rise": .45, "erode": .5, "contour": 1},
    "hills":     {"label": "rolling hills", "relief": 18, "fbm": .45, "ridged": .1, "strike": 0, "wall": "soft", "tilt": .25, "rise": .45, "erode": 1, "contour": 2},
    "upland":    {"label": "upland plateau cut by a deep valley", "relief": 32, "fbm": .3, "ridged": 0, "strike": 0, "wall": "steep", "tilt": .2, "rise": .3, "erode": 1.2, "contour": 4},
    "foothills": {"label": "foothills of parallel ridges", "relief": 36, "fbm": .3, "ridged": .15, "strike": .35, "wall": "soft", "tilt": .3, "rise": .35, "erode": 1, "contour": 4},
    "mountain":  {"label": "mountain valley", "relief": 48, "fbm": .3, "ridged": .5, "strike": .15, "wall": "vee", "tilt": .45, "rise": .3, "erode": 1.4, "contour": 5},
    "karst":     {"label": "limestone karst", "relief": 26, "fbm": .3, "ridged": 0, "strike": 0, "wall": "steep", "tilt": .2, "rise": .3, "erode": .7, "contour": 2},
}
PICK = (("plain", 30), ("hills", 35), ("upland", 15), ("foothills", 10), ("karst", 5), ("mountain", 5))   # Moravian odds


def pick_kind(R):
    t, n = R.random() * sum(w for _, w in PICK), 0
    for k, w in PICK:
        n += w
        if t < n: return k
    return "hills"


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


class Land:
    """Height (0 low to about 1.5 high) over the map. th: the way the valley falls; rise: (x, y, radius) of the
    ground the town stands on; kind: a key of KINDS. erode() then wears it with running water (metres)."""
    def __init__(self, R, cols, rows, th, rise, valley=None, width=40, kind="hills"):
        """valley: a point the valley's middle line passes through (it runs along th), or None for no valley;
        width: the valley floor's breadth, in squares. The sides climb away from it, so the water keeps to the floor."""
        self.R, self.cols, self.rows, self.th = R, cols, rows, th
        self.kind, self.k = kind, KINDS[kind]
        self.valley, self.vw = valley, width
        self.noise = Noise(R, max(40.0, (cols + rows) / 5))
        self.noise2 = Noise(R, max(18.0, (cols + rows) / 12), 2)
        self.rise = rise
        self.u = (math.cos(th), math.sin(th))
        self.lam = max(50.0, (cols + rows) / 6)               # ridge spacing on folded ground
        self.nx, self.ny = int(cols / STEP) + 1, int(rows / STEP) + 1
        self.h = [[self.at(i * STEP, j * STEP) for i in range(self.nx)] for j in range(self.ny)]
        self.z = None

    def at(self, x, y):
        k = self.k
        cx, cy, r = self.rise
        along = ((x - self.cols / 2) * self.u[0] + (y - self.rows / 2) * self.u[1]) / max(self.cols, self.rows)
        across = -(x - self.cols / 2) * self.u[1] + (y - self.rows / 2) * self.u[0]
        d = math.hypot(x - cx, y - cy) / max(r, 1)
        v = k["fbm"] * self.noise(x, y) - k["tilt"] * along + k["rise"] * math.exp(-d * d)
        if k["ridged"]:                                       # sharp crests where the rock is hard
            n2 = 1 - abs(2 * self.noise2(x, y) - 1)
            v += k["ridged"] * n2 * n2
        if k["strike"]:                                       # folds: ridges along the valley, troughs between
            v += k["strike"] * (.5 + .5 * math.cos(2 * math.pi * across / self.lam + 3 * (self.noise2(x + 300, y) - .5)))
        if self.valley:
            side = abs(-(x - self.valley[0]) * self.u[1] + (y - self.valley[1]) * self.u[0]) / self.vw
            w = k["wall"]
            if w == "wide": v += .25 * min(side / 2, 3)
            elif w == "soft": v += .5 * min(side, 3) ** 1.5
            elif w == "steep": v += .95 * smoothstep(.35, 1.4, side) + .1 * min(side, 3)
            else: v += .75 * min(side, 3) ** 1.1
        return v

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


    # ------------------------------------------------------------ wearing the ground down
    ES = 4.0                                                  # the erosion grid's cell, in squares (1 square = 1.5 m)

    def erode(self, river=None, river_half=0, in_town=None, iters=28):
        """Rain on the ground, worn by running water (the stream power law: cutting grows with the water a cell
        carries and its slope) and by soil creep (smoothing). The river, once laid, is the base level the side
        streams cut down to. Then the town's own ground is levelled a little, karst gets its sinkholes, and the
        streams are read off where enough water gathers. Heights are in metres above the lowest point."""
        k, ES = self.k, self.ES
        nx, ny = int(self.cols / ES) + 2, int(self.rows / ES) + 2
        self.enx, self.eny = nx, ny
        N = nx * ny
        z = [self.at(min(self.cols, (c % nx) * ES), min(self.rows, (c // nx) * ES)) for c in range(N)]
        lo_, hi_ = min(z), max(z)                             # scaled so the map's rise is the landform's relief
        z = [k["relief"] * (v - lo_) / max(hi_ - lo_, 1e-6) for v in z]
        fixed = [False] * N
        if river:
            for a, b in zip(river, river[1:]):
                L_ = math.dist(a, b)
                for t in range(int(L_ / 2) + 1):
                    q = (a[0] + (b[0] - a[0]) * t * 2 / max(L_, 1), a[1] + (b[1] - a[1]) * t * 2 / max(L_, 1))
                    i, j = round(q[0] / ES), round(q[1] / ES)
                    if 0 <= i < nx and 0 <= j < ny: fixed[j * nx + i] = True
        nb8 = ((1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414))
        edge = {c for c in range(N) if c % nx in (0, nx - 1) or c // nx in (0, ny - 1)}
        Kc, D = .028 * k["erode"], .12
        cell_m = ES * 1.5
        for it in range(iters):
            order, rec, A = self._route(z, fixed, edge, nb8)
            for c in order:                                   # downstream first, implicit, so it never overshoots
                r = rec[c]
                if r < 0 or fixed[c] or z[c] <= z[r]: continue
                dd = cell_m * (1.414 if (c % nx != r % nx and c // nx != r // nx) else 1.0)
                F = Kc * math.sqrt(A[c]) / dd * cell_m
                z[c] = (z[c] + F * z[r]) / (1 + F)
            z2 = z[:]                                         # soil creep rounds the crests
            for c in range(N):
                if fixed[c]: continue
                i, j = c % nx, c // nx
                if 0 < i < nx - 1 and 0 < j < ny - 1:
                    z2[c] = z[c] + D * (z[c - 1] + z[c + 1] + z[c - nx] + z[c + nx] - 4 * z[c])
            z = z2
            for c in edge:                                    # water runs freely off the map: the edge wears with what is inside it
                i, j = c % nx, c // nx
                n = min(max(j, 1), ny - 2) * nx + min(max(i, 1), nx - 2)
                if not fixed[c]: z[c] = min(z[c], z[n])
        order, rec, A = self._route(z, fixed, edge, nb8)
        self.flow, self.rec = A, rec
        if in_town:                                           # the town terraces and levels its own ground
            m = [1.0 if in_town(((c % nx) * ES, (c // nx) * ES)) else 0.0 for c in range(N)]
            for _ in range(3):                                # a soft edge, so the levelling fades out past the walls
                m2 = m[:]
                for c in range(N):
                    i, j = c % nx, c // nx
                    if 0 < i < nx - 1 and 0 < j < ny - 1: m2[c] = (m[c] * 2 + m[c - 1] + m[c + 1] + m[c - nx] + m[c + nx]) / 6
                m = m2
            inside = [z[c] for c in range(N) if m[c] > .5]
            if inside:
                mean = sum(inside) / len(inside)
                keep = {"mountain": .25, "upland": .35, "foothills": .35}.get(self.kind, .55)
                for c in range(N):
                    z[c] = z[c] * (1 - m[c]) + (mean + keep * (z[c] - mean)) * m[c]
        self.sinks = []
        if self.kind == "karst":                              # sinkholes: round hollows where the limestone gave way
            for _ in range(200):
                if len(self.sinks) >= max(4, int(self.cols * self.rows / 9000)): break
                x, y = self.R.uniform(10, self.cols - 10), self.R.uniform(10, self.rows - 10)
                rad = self.R.uniform(4, 9)
                if in_town and any(in_town((x + (rad + 4) * math.cos(t), y + (rad + 4) * math.sin(t))) for t in [n * math.pi / 4 for n in range(8)] + [0]) or (in_town and in_town((x, y))): continue
                if river and min(math.dist((x, y), q) for q in river[::3]) < river_half * 6 + rad: continue
                if any(math.dist((x, y), (a, b)) < r_ + rad + 4 for a, b, r_ in self.sinks): continue
                self.sinks.append((x, y, rad))
            for x, y, rad in self.sinks:
                dep = self.R.uniform(2, 5)
                for c in range(N):
                    d = math.hypot((c % nx) * ES - x, (c // nx) * ES - y) / rad
                    if d < 1: z[c] -= dep * (1 - d * d) ** 2
        base = min(z)
        self.z = [v - base for v in z]
        self.zmax = max(self.z)
        self.streams = self._streams(river, river_half, in_town)

    def _route(self, z, fixed, edge, nb8):
        """Where each cell's water goes: hollows are filled to their spill level first (priority flood), then each
        cell drains to its lowest neighbour. Returns the cells downstream first, the receivers and the area drained."""
        nx, ny = self.enx, self.eny
        N = nx * ny
        fz, seen, pq = z[:], [False] * N, []
        for c in edge | {c for c in range(N) if fixed[c]}:
            seen[c] = True; heapq.heappush(pq, (z[c], c))
        order = []
        while pq:
            h, c = heapq.heappop(pq)
            order.append(c)
            i, j = c % nx, c // nx
            for di, dj, _ in nb8:
                k_, l = i + di, j + dj
                if 0 <= k_ < nx and 0 <= l < ny:
                    n = l * nx + k_
                    if not seen[n]:
                        seen[n] = True
                        fz[n] = max(z[n], h + 1e-4)
                        heapq.heappush(pq, (fz[n], n))
        rec = [-1] * N
        for c in order:
            if fixed[c] or c in edge: continue
            i, j = c % nx, c // nx
            best, bs = -1, 0.0
            for di, dj, dl in nb8:
                k_, l = i + di, j + dj
                if 0 <= k_ < nx and 0 <= l < ny:
                    n = l * nx + k_
                    sl = (fz[c] - fz[n]) / dl
                    if sl > bs: best, bs = n, sl
            rec[c] = best
        A = [1.0] * N
        for c in reversed(order):
            if rec[c] >= 0: A[rec[c]] += A[c]
        return order, rec, A

    def _streams(self, river, river_half, in_town):
        """Brooks where enough water gathers: traced down from each head until they reach the river, a stream
        already traced, a sinkhole or the map's edge. Inside the town they run in culverts and drains, so only the
        reaches outside it are kept. Returns [{"line", "half", "into"}] in squares."""
        nx, ny, ES = self.enx, self.eny, self.ES
        A, rec = self.flow, self.rec
        N = nx * ny
        thr = max(25.0, N / 80) * (2 if self.kind == "karst" else 1)
        chan = [A[c] >= thr for c in range(N)]
        heads = [c for c in range(N) if chan[c] and not any(chan[n] and rec[n] == c for n in self._nbrs(c))]
        heads.sort(key=lambda c: -A[c])
        taken, out = set(), []
        pt = lambda c: ((c % nx) * ES, (c // nx) * ES)
        near_river = lambda q: river and min(math.dist(q, p) for p in river[::2]) < river_half * 1.6
        for h in heads:
            line, c, into = [], h, "edge"
            while c >= 0:
                q = pt(c)
                line.append(q)
                if c in taken: into = "stream"; break
                if near_river(q): into = "river"; break
                if min(q[0], q[1], self.cols - q[0], self.rows - q[1]) < 2 * ES: into = "edge"; break
                if any(math.dist(q, (x, y)) < r for x, y, r in self.sinks): into = "sink"; break
                taken.add(c)
                c = rec[c]
            if len(line) < 4: continue
            line = chaikin(line, 2)
            ns_ = normals(line)                               # brooks wander a little on their own small scale
            line = [(p[0] + ns_[i][0] * 2.2 * (self.noise2(p[0] * 2.5, p[1] * 2.5) - .5), p[1] + ns_[i][1] * 2.2 * (self.noise2(p[0] * 2.5, p[1] * 2.5) - .5)) if 0 < i < len(line) - 1 else p for i, p in enumerate(line)]
            line = chaikin(smooth(line, 2), 1)
            half = min(.75, .3 + .12 * math.sqrt(A[h] / thr))
            pieces, cur = [], []
            for q in line:
                if in_town and in_town(q):
                    if len(cur) > 2: pieces.append(cur)
                    cur = []
                else: cur.append(q)
            if len(cur) > 2: pieces.append(cur)
            for pc in pieces:
                if sum(math.dist(a, b) for a, b in zip(pc, pc[1:])) > 18:
                    out.append({"line": pc, "half": round(half, 2), "into": into})
        return out

    def _nbrs(self, c):
        nx, ny = self.enx, self.eny
        i, j = c % nx, c // nx
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if (di or dj) and 0 <= i + di < nx and 0 <= j + dj < ny: yield (j + dj) * nx + i + di

    def z_at(self, x, y):
        """Height in metres, read off the worn ground (bilinear)."""
        ES, nx, ny = self.ES, self.enx, self.eny
        u, v = max(0.0, min(nx - 1.001, x / ES)), max(0.0, min(ny - 1.001, y / ES))
        i, j = int(u), int(v); fu, fv = u - i, v - j
        z = self.z
        a = z[j * nx + i] * (1 - fu) + z[j * nx + i + 1] * fu
        b = z[(j + 1) * nx + i] * (1 - fu) + z[(j + 1) * nx + i + 1] * fu
        return a * (1 - fv) + b * fv

    def slope(self, x, y):
        """Rise over run (metres per metre) at a point."""
        d = 2.0
        gx = (self.z_at(x + d, y) - self.z_at(x - d, y)) / (2 * d * 1.5)
        gy = (self.z_at(x, y + d) - self.z_at(x, y - d)) / (2 * d * 1.5)
        return math.hypot(gx, gy)

    # ------------------------------------------------------------ drawing it on the plan
    def picture(self, px):
        """The ground as a PNG data URL, one pixel per px squares: low ground green, high ground buff, lit from the
        north-west so slopes show."""
        W, H = int(self.cols / px) + 1, int(self.rows / px) + 1
        top = max(self.zmax, 1e-6)
        gs = []
        for j in range(H):
            for i in range(W):
                x, y = i * px, j * px
                e = self.ES                                   # a step of one erosion cell, so the cells' facets do not show
                gs.append(((self.z_at(x + e, y) - self.z_at(x - e, y)) / e, (self.z_at(x, y + e) - self.z_at(x, y - e)) / e))
        mags = sorted(math.hypot(*g) for g in gs)
        gain = .32 / max(mags[int(len(mags) * .9)], .15)
        rows = bytearray()
        lo, hi = (214, 226, 196), (232, 222, 196)
        for j in range(H):
            rows.append(0)
            for i in range(W):
                gx, gy = gs[j * W + i]
                t = self.z_at(i * px, j * px) / top
                lit = max(-.45, min(.45, (-gx - gy) * .7071 * gain))
                base = [lo[n] + (hi[n] - lo[n]) * t for n in range(3)]
                if lit >= 0: c = [b + (255 - b) * lit * .8 for b in base]
                else: c = [b * (1 + lit * .9) for b in base]
                rows += bytes(max(0, min(255, int(v))) for v in c)
        def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
        return "data:image/png;base64," + base64.b64encode(png).decode(), W * px, H * px

    def contours(self, step=2.0):
        """Contour lines every k["contour"] metres (marching squares): [(level, [(a, b), ...])], in squares."""
        iv = self.k["contour"]
        W, H = int(self.cols / step), int(self.rows / step)
        g = [[self.z_at(i * step, j * step) for i in range(W + 1)] for j in range(H + 1)]
        out = {}
        lv = iv
        while lv < self.zmax:
            segs = []
            for j in range(H):
                for i in range(W):
                    a, b, c, d = g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]
                    cs = [(a, b, (i, j), (i + 1, j)), (b, c, (i + 1, j), (i + 1, j + 1)), (c, d, (i + 1, j + 1), (i, j + 1)), (d, a, (i, j + 1), (i, j))]
                    hit = []
                    for p, q, P, Q in cs:
                        if (p < lv) != (q < lv):
                            t = (lv - p) / (q - p)
                            hit.append(((P[0] + (Q[0] - P[0]) * t) * step, (P[1] + (Q[1] - P[1]) * t) * step))
                    if len(hit) == 2: segs.append((hit[0], hit[1]))
                    elif len(hit) == 4: segs += [(hit[0], hit[1]), (hit[2], hit[3])]
            out[lv] = segs
            lv += iv
        return sorted(out.items())


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
