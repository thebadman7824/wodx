/**
 * WoDX Sheets 0.16.0: the damage doll (house rule B2690). No Foundry calls here.
 *
 * Draws a small pixel figure (64 x 80) from a body plan in the manner of the token sprites, and colours each part by the
 * health levels that landed on it: bruise purple for bashing, red for lethal, charred black for aggravated. Lost parts
 * show as a dotted outline, false limbs in wood, steel or chrome by era. Parts carry no health of their own: the colours
 * only show where the health track's levels were taken (WoDX Combat body-rules woundsByPart).
 */
const W = 64, H = 80;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const R = a => a.map(hex);
const RAMP = {
  flesh: R(["#4a443d", "#80786b", "#aca28d", "#d3c9b0"]),
  bash:  R(["#2e1f3a", "#5a3a6e", "#80569a", "#a986c2"]),
  lethal: R(["#3a0d10", "#781a1c", "#aa2c28", "#d65846"]),
  agg:   R(["#0e0808", "#241313", "#3b1c19", "#c8521e"]),
  wood:  R(["#38240f", "#6a4424", "#8e6135", "#b38350"]),
  steel: R(["#2c2c2c", "#5e5e5e", "#8f8f8f", "#c4c4c4"]),
  chrome: R(["#1a2730", "#3c5f71", "#7cb0c2", "#d6f1f9"])
};
const INK = hex("#120f14"), GHOST = hex("#a49cb8"), EYE = hex("#141018"), SCAR = hex("#8a5a50");
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* ---------- shapes on the grid ---------- */
const cap = (a, b, ra, rb = ra) => ({k: "cap", a, b, ra, rb});
const poly = pts => ({k: "poly", pts});
const mirror = (prims, cx = 32) => prims.map(p => p.k === "cap" ? {...p, a: [2 * cx - p.a[0], p.a[1]], b: [2 * cx - p.b[0], p.b[1]]} : {...p, pts: p.pts.map(([x, y]) => [2 * cx - x, y])});
const chain = (pts, r0, r1) => pts.slice(1).map((p, i) => cap(pts[i], p, r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1)));

/* ---------- poses: part id -> {z, prims, detail} ---------- */
function person(st = {}) {
  const b = st.bulk ?? 1, hy = st.hunch ? 4 : 0, sh = 7 * b;
  const P = {};
  const head = [cap([32, 8 + hy], [32, 10 + hy], st.muzzle ? 5.5 : 5)];
  if ( st.muzzle ) head.push(cap([32, 13 + hy], [32, 18 + hy], 3, 2.2));
  if ( st.ears ) head.push(poly([[27, 6 + hy], [25, -1 + hy], [30, 3 + hy]]), poly([[37, 6 + hy], [39, -1 + hy], [34, 3 + hy]]));
  if ( st.batEars ) head.push(poly([[28, 6 + hy], [23, -2 + hy], [31, 3 + hy]]), poly([[36, 6 + hy], [41, -2 + hy], [33, 3 + hy]]));
  P.head = {z: 5, prims: head};
  P["eye-r"] = {z: 6, eye: true, prims: [cap([30, 9 + hy], [30, 9 + hy], 0.7)]};
  P["eye-l"] = {z: 6, eye: true, prims: [cap([34, 9 + hy], [34, 9 + hy], 0.7)]};
  P.mouth = {z: 6, eye: true, prims: [cap([31, st.muzzle ? 16 + hy : 12.5 + hy], [33, st.muzzle ? 16 + hy : 12.5 + hy], 0.5)]};
  P.gills = {z: 6, prims: [cap([29, 15], [29, 18], 0.9), cap([35, 15], [35, 18], 0.9)]};
  P.body = {z: 3, prims: [cap([32, 14 + hy / 2], [32, 18], 2.2 * b), cap([32 - sh + 3, 20.5], [32 + sh - 3, 20.5], 3.5 * b), cap([32, 22], [32, 32], sh, sh * 0.78), cap([32, 34], [32, 38], 5.6 * b)]};
  P.heart = {z: 4, inner: true, prims: [cap([34, 23], [34, 24], 1.4)]};
  const ax = 32 - sh - 1;
  P["arm-r"] = {z: 4, prims: [cap([ax + 1, 20], [ax - 2.5, 33], 2.7 * b, 2.2 * b)]};
  P["hand-r"] = {z: 5, prims: [cap([ax - 3, 35.5], [ax - 3.2, 38], 2.2 * Math.max(1, b * 0.9))]};
  P["arm-r2"] = {z: 4.5, prims: [cap([ax + 3, 27], [ax - 7, 33], 2.2, 1.9)]};
  P["hand-r2"] = {z: 4.6, prims: [cap([ax - 9, 34], [ax - 10, 35.5], 1.9)]};
  P["leg-r"] = {z: 2, prims: [cap([29 - b, 39], [28 - b, 62], 3.3 * b, 2.6 * b), cap([28 - b, 63], [25.5 - b, 63.5], 2.2)]};
  for ( const [r, l] of [["arm-r", "arm-l"], ["hand-r", "hand-l"], ["arm-r2", "arm-l2"], ["hand-r2", "hand-l2"], ["leg-r", "leg-l"]] ) P[l] = {...P[r], prims: mirror(P[r].prims)};
  const wing = poly([[27, 21], [12, 8], [6, 13], [3, 26], [8, 30], [11, 27], [15, 32], [19, 29], [27, 31]]);
  P["wing-r"] = {z: 1, prims: [wing]};
  P["wing-l"] = {z: 1, prims: mirror([wing])};
  P.tail = {z: 1, prims: chain([[32, 37], [39, 47], [43, 55], [49, 59]], 2.6, 1)};
  return P;
}

const HEADS = {
  wolf: {snout: [[52, 34], [58, 36.5], 2.8, 2], ears: [[[46, 28], [47, 21], [50, 27]], [[43, 29], [43, 22], [47, 27]]]},
  cat:  {snout: [[52, 34], [55, 35], 3.2, 2.8], ears: [[[46, 28], [48, 23], [50, 28]], [[43, 29], [44, 24], [47, 28]]]},
  rat:  {snout: [[52, 34], [59, 37], 2.6, 0.9], ears: [[[45, 28], [44, 24], [48, 26]]]},
  croc: {snout: [[51, 34], [61, 36], 2.4, 1.8], ears: []},
  bear: {snout: [[52, 34], [57, 35], 3.4, 2.8], ears: [[[46, 28], [46, 25], [49, 27]]]},
  fox:  {snout: [[52, 34], [59, 36.5], 2.4, 1.2], ears: [[[46, 28], [47, 19], [51, 27]], [[43, 29], [43, 20], [47, 27]]]},
  hyena: {snout: [[52, 34], [58, 36], 3, 2.4], ears: [[[45, 28], [45, 23], [49, 27]], [[42, 29], [42, 24], [46, 28]]]},
  bull: {snout: [[52, 34], [57, 36], 3.4, 3], ears: [[[46, 27], [42, 22], [44, 21], [48, 26]], [[49, 27], [53, 21], [54, 23], [50, 28]]]},
  boar: {snout: [[52, 34], [58, 36], 3.2, 2.6], ears: [[[45, 28], [44, 24], [48, 27]], [[56, 38], [57, 33], [58, 38]]]}
};
const TAILS = {
  wolf: [[[13, 39], [6, 45], [3, 52]], 2.8, 1.4], cat: [[[13, 39], [7, 34], [6, 26], [9, 22]], 1.8, 1.4],
  rat: [[[13, 42], [6, 48], [1, 50]], 1.3, 0.5], croc: [[[14, 41], [6, 44], [0, 45]], 5, 0.8], bear: [[[13, 39], [11, 40]], 2.2, 1.6]
};
function beast(st = {}) {
  const a = st.animal ?? "wolf", hd = HEADS[a] ?? HEADS.wolf, low = a === "croc" ? 8 : 0, leg = a === "croc" ? 8 : 16;
  const P = {};
  P.body = {z: 3, prims: [cap([20, 42 + low], [41, 40 + low], a === "bear" ? 10 : 8, a === "bear" ? 9 : 7.5), cap([41, 39 + low], [47, 34 + low], 5)]};
  P.head = {z: 5, prims: [cap([47, 31 + low], [50, 33 + low], a === "croc" ? 3.6 : 5), cap(hd.snout[0].map((v, i) => v + (i ? low : 0)), hd.snout[1].map((v, i) => v + (i ? low : 0)), hd.snout[2], hd.snout[3]), ...hd.ears.map(e => poly(e.map(([x, y]) => [x, y + low])))]};
  P["eye-r"] = {z: 6, eye: true, prims: [cap([51, 30 + low], [51, 30 + low], 0.7)]};
  P.mouth = {z: 6, eye: true, prims: [cap([hd.snout[1][0] - 4, hd.snout[1][1] + low + 1.2], [hd.snout[1][0] - 1, hd.snout[1][1] + low + 1.2], 0.45)]};
  P.heart = {z: 4, inner: true, prims: [cap([37, 43 + low], [37, 44 + low], 1.4)]};
  const L = (x0, x1, r) => [cap([x0, 45 + low], [x1, 46 + low + leg], r, r * 0.75), cap([x1, 47 + low + leg], [x1 + 2.5, 47.5 + low + leg], 1.8)];
  P["leg-lf"] = {z: 1, prims: L(44, 46, 2.9)};
  P["leg-lh"] = {z: 1, prims: L(21, 19, 3.3)};
  P["leg-rf"] = {z: 4, prims: L(40, 41, 3.2)};
  P["leg-rh"] = {z: 4, prims: L(25, 23, 3.6)};
  const t = TAILS[a] ?? TAILS.wolf;
  P.tail = {z: 2, prims: chain(t[0].map(([x, y]) => [x, y + low]), t[1], t[2])};
  return P;
}
function flier(st = {}) {
  const bird = st.bird, P = {};
  P.body = {z: 3, prims: [cap([32, 33], [32, 45], 5, 4.5)]};
  P.head = {z: 5, prims: [cap([32, 25], [32, 26], 4.5), ...(bird ? [poly([[30, 27], [32, 32], [34, 27]])] : [poly([[29, 23], [26, 15], [31, 21]]), poly([[35, 23], [38, 15], [33, 21]])])]};
  P["eye-r"] = {z: 6, eye: true, prims: [cap([30.5, 25], [30.5, 25], 0.7)]};
  P["eye-l"] = {z: 6, eye: true, prims: [cap([33.5, 25], [33.5, 25], 0.7)]};
  P.mouth = {z: 6, eye: true, prims: [cap([31.5, 28.3], [32.5, 28.3], 0.4)]};
  P.heart = {z: 4, inner: true, prims: [cap([33, 36], [33, 37], 1.3)]};
  const w = bird ? poly([[28, 33], [16, 26], [3, 29], [5, 35], [10, 37], [5, 41], [13, 42], [10, 47], [19, 45], [28, 42]])
    : poly([[29, 33], [15, 22], [4, 25], [2, 40], [8, 37], [11, 43], [17, 39], [21, 45], [29, 42]]);
  P["wing-r"] = {z: 2, prims: [w]};
  P["wing-l"] = {z: 2, prims: mirror([w])};
  P["leg-r"] = {z: 2, prims: [cap([30, 46], [29, 54], 1.3), cap([29, 54.5], [27, 55], 0.9)]};
  P["leg-l"] = {z: 2, prims: mirror(P["leg-r"].prims)};
  P.tail = {z: 1, prims: [poly([[30, 44], [27, 54], [32, 56], [37, 54], [34, 44]])]};
  return P;
}
function serpent() {
  return {
    head: {z: 5, prims: [cap([44, 20], [50, 22], 4.5, 3.4)]},
    "eye-r": {z: 6, eye: true, prims: [cap([47, 19], [47, 19], 0.7)]},
    mouth: {z: 6, eye: true, prims: [cap([49, 23.6], [52, 23.6], 0.4)]},
    body: {z: 4, prims: chain([[42, 24], [37, 33], [30, 40], [31, 46]], 4, 4.6)},
    heart: {z: 5, inner: true, prims: [cap([35, 35], [35, 36], 1.3)]},
    tail: {z: 3, prims: chain([[31, 46], [40, 52], [40, 59], [28, 62], [14, 59], [9, 53]], 4.6, 0.8)}
  };
}
function fish() {
  return {
    body: {z: 3, prims: [cap([16, 40], [40, 40], 7, 9)]},
    head: {z: 4, prims: [cap([42, 40], [50, 40], 9, 5)]},
    "eye-r": {z: 6, eye: true, prims: [cap([48, 37], [48, 37], 0.8)]},
    mouth: {z: 6, eye: true, prims: [cap([52, 42], [54, 42], 0.4)]},
    gills: {z: 5, prims: [cap([43, 35], [42, 44], 0.8)]},
    heart: {z: 5, inner: true, prims: [cap([38, 43], [38, 44], 1.3)]},
    tail: {z: 2, prims: [poly([[15, 40], [3, 28], [6, 40], [3, 52]])]},
    "fin-r": {z: 5, prims: [poly([[36, 43], [30, 51], [38, 47]])]},
    "fin-l": {z: 1, prims: [poly([[30, 32], [22, 26], [24, 33]])]}
  };
}
function spider() {
  const P = {
    head: {z: 5, prims: [cap([32, 26], [32, 29], 5.5)]},
    "eye-r": {z: 6, eye: true, prims: [cap([30.5, 23.5], [30.5, 23.5], 0.6)]},
    "eye-l": {z: 6, eye: true, prims: [cap([33.5, 23.5], [33.5, 23.5], 0.6)]},
    mouth: {z: 6, eye: true, prims: [cap([31.5, 21.5], [32.5, 21.5], 0.5)]},
    body: {z: 4, prims: [cap([32, 40], [32, 48], 8.5, 7.5)]},
    heart: {z: 5, inner: true, prims: [cap([32, 42], [32, 43], 1.3)]}
  };
  const knees = [[[18, 14], [12, 6]], [[14, 22], [5, 18]], [[14, 32], [5, 38]], [[18, 40], [11, 52]]];
  knees.forEach(([k, t], i) => {
    const r = [cap([28, 24 + i * 2.5], k, 1.5, 1.2), cap(k, t, 1.2, 0.7)];
    P[`leg-r${i + 1}`] = {z: 2, prims: r};
    P[`leg-l${i + 1}`] = {z: 2, prims: mirror(r)};
  });
  return P;
}
const POSES = {person, wingedPerson: person, beast, winged: s => flier(s), bird: s => flier({...s, bird: true}), serpent, fish, spider};

/* ---------- raster ---------- */
function fill(map, id, prims, z, zmap) {
  for ( const p of prims ) {
    if ( p.k === "cap" ) {
      const [ax, ay] = p.a, [bx, by] = p.b, m = Math.max(p.ra, p.rb) + 1, L2 = Math.max((bx - ax) ** 2 + (by - ay) ** 2, 1e-6);
      for ( let y = Math.floor(Math.min(ay, by) - m); y <= Math.ceil(Math.max(ay, by) + m); y++ ) for ( let x = Math.floor(Math.min(ax, bx) - m); x <= Math.ceil(Math.max(ax, bx) + m); x++ ) {
        if ( x < 0 || y < 0 || x >= W || y >= H ) continue;
        let t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2; t = Math.max(0, Math.min(1, t));
        const r = p.ra + (p.rb - p.ra) * t;
        if ( Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)) <= r + 0.15 && (zmap == null || z >= zmap[y * W + x]) ) { map[y * W + x] = id; if ( zmap ) zmap[y * W + x] = z; }
      }
    } else {
      const ys = p.pts.map(q => q[1]), xs = p.pts.map(q => q[0]);
      for ( let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++ ) for ( let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.ceil(Math.max(...xs))); x++ ) {
        let inside = false;
        for ( let i = 0, j = p.pts.length - 1; i < p.pts.length; j = i++ ) {
          const [xi, yi] = p.pts[i], [xj, yj] = p.pts[j];
          if ( (yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi ) inside = !inside;
        }
        if ( inside && (zmap == null || z >= zmap[y * W + x]) ) { map[y * W + x] = id; if ( zmap ) zmap[y * W + x] = z; }
      }
    }
  }
}

/** The colour ramp a part takes from its wounds: worst kind decides the hue, the count how deep. */
function rampOf(w, fake) {
  if ( fake ) return RAMP[fake] ?? RAMP.wood;
  const n = (w?.b ?? 0) + (w?.l ?? 0) + (w?.a ?? 0);
  if ( !n ) return RAMP.flesh;
  const hue = w.a ? RAMP.agg : w.l ? RAMP.lethal : RAMP.bash;
  const t = Math.min(1, 0.45 + 0.2 * (n - 1));
  return RAMP.flesh.map((c, i) => mix(c, hue[i], t));
}

/**
 * spec: {plan, style, parts: [ids], lost: [ids], wounds: {id: {b, l, a}}, fakes: {id: "wood"|"steel"|"chrome"}}.
 * Returns {img: ImageData-like {w, h, data}, at(x, y) -> part id}.
 */
export function draw(spec) {
  const data = new Uint8ClampedArray(W * H * 4);
  const ids = [], idOf = new Map(), map = new Int16Array(W * H).fill(-1), zmap = new Float32Array(W * H).fill(-1);
  const put = (x, y, c, a = 255) => { const i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = a; };
  const pose = POSES[spec.plan]?.(spec.style ?? {});
  if ( !pose ) return mist(spec, data, put);
  const has = new Set(spec.parts ?? []), lost = new Set(spec.lost ?? []), wounds = spec.wounds ?? {};
  const order = Object.entries(pose).sort((a, b) => a[1].z - b[1].z);
  for ( const [id, p] of order ) {
    if ( !has.has(id) ) continue;
    if ( (p.inner || p.eye) && !wounds[id] ) continue;
    const n = ids.push(id) - 1; idOf.set(id, n);
    fill(map, n, (spec.fakes?.[id] === "wood" && /leg/.test(id)) ? p.prims.slice(0, 1).map(q => ({...q, ra: 1.3, rb: 1.1})) : p.prims, p.z + (p.eye ? 10 : 0) + (p.inner ? 10 : 0), zmap);
  }
  // ghosts of lost parts
  const ghost = new Int16Array(W * H).fill(-1);
  for ( const [id, p] of order ) if ( lost.has(id) && !p.eye ) fill(ghost, 1, p.prims, 0, null);
  const z = i => { const id = ids[map[i]]; return pose[id]?.z + (pose[id]?.eye ? 10 : 0) + (pose[id]?.inner ? 10 : 0); };
  for ( let y = 0; y < H; y++ ) for ( let x = 0; x < W; x++ ) {
    const i = y * W + x, m = map[i];
    if ( m < 0 ) continue;
    const id = ids[m], P = pose[id];
    if ( P.eye ) { const w = wounds[id]; put(x, y, w ? rampOf(w)[2] : EYE); continue; }
    const ramp = rampOf(wounds[id], spec.fakes?.[id]);
    const same = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W && yy < H && map[yy * W + xx] === m; };
    // a part in front gets a dark seam where it meets a part behind it
    let seam = false;
    for ( const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] ) {
      const xx = x + dx, yy = y + dy;
      if ( xx < 0 || yy < 0 || xx >= W || yy >= H ) continue;
      const o = map[yy * W + xx];
      if ( o >= 0 && o !== m && !pose[ids[o]].eye && z(yy * W + xx) < z(i) ) { seam = true; break; }
    }
    let tone = 2;
    if ( !same(-1, -1) || !same(0, -1) ) tone = 3; else if ( !same(1, 1) || !same(1, 0) ) tone = 1;
    if ( seam ) tone = 0;
    // the deeper the wound, the more of it shows as speckle
    const w = wounds[id], n = w ? (w.b ?? 0) + (w.l ?? 0) + (w.a ?? 0) : 0;
    if ( n >= 2 && tone > 0 && ((x * 7 + y * 13) % 11) < n ) tone = Math.max(0, tone - 1);
    put(x, y, ramp[tone]);
  }
  // the ink line round the whole figure, then the dotted ghosts
  for ( let y = 0; y < H; y++ ) for ( let x = 0; x < W; x++ ) {
    const i = y * W + x;
    if ( map[i] >= 0 ) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W && yy < H && map[yy * W + xx] >= 0; });
    if ( near ) { put(x, y, INK); continue; }
    if ( ghost[i] >= 0 ) {
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= W || yy >= H || ghost[yy * W + xx] < 0; });
      if ( edge && (x + y) % 2 === 0 ) put(x, y, GHOST);
    }
  }
  // a lost eye heals over as a scar
  for ( const id of lost ) { const p = pose[id]; if ( p?.eye ) { const q = p.prims[0]; put(Math.round(q.a[0]), Math.round(q.a[1]), SCAR); } }
  return {w: W, h: H, data, at: (x, y) => { const m = map[y * W + x]; if ( m >= 0 ) return ids[m]; return ghost[y * W + x] >= 0 ? "lost" : null; }};
}

function mist(spec, data, put) {
  const g = hex(spec.plan === "formless" && spec.style?.earth ? "#4a3a2a" : "#9a96a8");
  if ( spec.style?.earth ) {
    for ( let x = 8; x < 56; x++ ) { const top = 58 - Math.round(6 * Math.sin((x - 8) / 48 * Math.PI)); for ( let y = top; y < 64; y++ ) put(x, y, y === top ? hex("#7a6448") : g); }
    for ( let x = 0; x < W; x++ ) put(x, 64, INK);
  } else {
    for ( let y = 4; y < 76; y++ ) for ( let x = 2; x < 62; x++ ) {
      const v = Math.sin(y / 3.2 + Math.sin(x / 9) * 2.2) * 0.6 + Math.sin(x / 13 - y / 17) * 0.5;
      const d = Math.hypot((x - 32) / 26, (y - 40) / 32);
      const f = v - d * 1.3 + 0.75;
      if ( f > 0 && ((x + y) % 2 === 0 || f > 0.45) ) put(x, y, g, 110 + Math.round(120 * Math.min(1, f)));
    }
  }
  return {w: W, h: H, data, at: () => null};
}


export {W, H, RAMP};

/** The pose style for a shape (bulk and head of the person plan). */
export const STYLE = {
  glabro: {bulk: 1.2}, crinos: {bulk: 1.45, muzzle: true, ears: true, hunch: true},
  zulo: {bulk: 1.3, hunch: true}, chiropteran: {bulk: 1.25, batEars: true, hunch: true}
};

/** A false limb's look by year: wood and iron to 1900, steel and plastic to 2022, chrome in the World of Future Darkness. */
export const fakeOf = year => !year || year < 1900 ? "wood" : year < 2023 ? "steel" : "chrome";

/**
 * What draw() takes, from a Combat body and the doll's wound numbers. body: bodyOf result; wounds: {id: {b, l, a}};
 * fakes: [part ids replaced by false limbs]; plan: the shape's plan key.
 */
export function specOf(body, {plan, wounds = {}, fakes = [], year = 0} = {}) {
  if ( !body ) return null;
  const lost = (body.lost ?? []).filter(id => !fakes.includes(id));
  const fk = {}, kind = fakeOf(year);
  for ( const id of fakes ) if ( (body.lost ?? []).includes(id) ) { fk[id] = kind; const h = id.replace(/^arm/, "hand"); if ( h !== id ) fk[h] = kind; }
  const parts = [...(body.parts ?? []).map(p => p.id), ...Object.keys(fk)];
  return {plan: body.intangible || body.hidden ? "formless" : plan, style: {...(STYLE[body.shape] ?? {}), animal: body.animal ?? "wolf", bird: plan === "bird", earth: !!body.hidden}, parts, lost, wounds, fakes: fk};
}
