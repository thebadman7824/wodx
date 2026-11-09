/**
 * WoDX Paperdoll: measuring a head so the clothes fit it.
 * The head is drawn once in key colours (skin pure green, hair pure red, lines black) at 980 by 980 pixels,
 * the size of Lorelei's own drawing. These rules read those pixels and give the anchors every garment is built
 * from: the neck base, the shoulder line, the jaw, the face outline and the outline of head and hair.
 */

export const SIZE = 980;
export const KEY = {skin: "00ff00", hair: "ff0000"};
const TAU = Math.PI * 2;

/** What a pixel is: "." empty, "s" skin, "h" hair, "k" line, "o" anything else. */
export function kindAt(px, x, y) {
  if ( x < 0 || y < 0 || x >= px.width || y >= px.height ) return ".";
  const i = (y * px.width + x) * 4, d = px.data, r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
  if ( a < 128 ) return ".";
  if ( g > 200 && r < 80 && b < 80 ) return "s";
  if ( r > 200 && g < 80 && b < 80 ) return "h";
  if ( r < 60 && g < 60 && b < 60 ) return "k";
  return "o";
}

/** A smooth closed (or open) path through points, as cubic curves. */
export function smoothPath(pts, closed = true) {
  const n = pts.length, f = v => Math.round(v);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for ( let i = 0; i < last; i++ ) {
    let p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if ( !closed ) { p0 = pts[Math.max(i - 1, 0)]; p3 = pts[Math.min(i + 2, n - 1)]; }
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? " Z" : "");
}

/**
 * Measure the head. px: {width, height, data} with RGBA bytes, 980 square. Returns the anchors, or null when the
 * picture has no neck to measure (a broken render).
 */
export function measure(px, {sx = 1, sy = 1} = {}) {
  const W = px.width, H = px.height;
  const k = (x, y) => kindAt(px, x, y);
  // The build of the face scales the head from the middle of the neck base; the fixed lines below follow it
  const TX = x => 490 + (x - 490) * sx, TY = y => 815 + (y - 815) * sy, R = Math.max(sx, sy);
  // The neck: the skin span on each row below the chin, and the wide base where it meets the shoulders
  const rows = new Map();
  for ( let y = Math.round(TY(700)); y < H; y++ ) {
    let a = -1, b = -1;
    for ( let x = 0; x < W; x++ ) if ( k(x, y) === "s" ) { if ( a < 0 ) a = x; b = x; }
    if ( a >= 0 ) rows.set(y, [a, b]);
  }
  if ( !rows.size ) return null;
  const neckBottom = Math.max(...rows.keys());
  let blobTop = null;
  for ( const [y, [a, b]] of [...rows].sort((p, q) => p[0] - q[0]) ) if ( y > TY(780) && b - a > 330 * sx ) { blobTop = y; break; }
  if ( blobTop === null ) return null;
  let bl = Infinity, br = -Infinity;
  for ( const [y, [a, b]] of rows ) if ( y >= blobTop ) { bl = Math.min(bl, a); br = Math.max(br, b); }

  // The face, by rays from a point between the eyes and the mouth; the jaw is the lowest line in each column
  const cx = Math.round(TX(510)), cy = Math.round(TY(480)), jawTop = Math.round(TY(789)), jawLow = Math.round(TY(600));
  const jaw = new Map();
  for ( let x = 0; x < W; x++ ) for ( let y = jawTop; y >= jawLow; y-- ) if ( k(x, y) === "k" ) { jaw.set(x, y); break; }
  const ray = t => {
    let last = 0;
    for ( let r = 0; r < 420 * R; r += 2 ) {
      const x = Math.trunc(cx + r * Math.cos(t)), y = Math.trunc(cy + r * Math.sin(t)), kk = k(x, y);
      if ( kk === "." || kk === "h" ) break;
      if ( y >= (jaw.get(x) ?? jawTop + 1) - 3 ) break;
      if ( x < TX(305) || y > TY(768) ) break;
      last = r;
    }
    return last;
  };
  const N = 72, angs = Array.from({length: N}, (_, i) => i * TAU / N);
  let rad = angs.map(ray);
  for ( let p = 0; p < 3; p++ ) rad = rad.map((_, i) => [-2, -1, 0, 1, 2].reduce((s, j) => s + rad[(i + j + N) % N], 0) / 5);
  const INSET = 16;
  const faceAll = rad.map((r, i) => [cx + (r - INSET) * Math.cos(angs[i]), Math.max(TY(300), cy + (r - INSET) * Math.sin(angs[i]))]);
  const face = faceAll.filter((_, i) => i % 3 === 0);

  // The outline of head and hair, upper part only, for the veil and anything worn on the head
  const outer = t => {
    let far = 0;
    for ( let r = 0; r < 520 * R; r += 2 ) if ( k(Math.trunc(cx + r * Math.cos(t)), Math.trunc(cy + r * Math.sin(t))) !== "." ) far = r;
    return far;
  };
  let top = angs.filter(t => Math.sin(t) < -0.25).map(t => [t, outer(t)]);
  let tr = top.map(p => p[1]);
  top = top.map(([t], i) => [t, Math.max(...tr.slice(Math.max(0, i - 3), i + 4))]);      // ride over tufts
  tr = top.map(p => p[1]);
  top = top.map(([t], i) => { const s = tr.slice(Math.max(0, i - 2), i + 3); return [t, s.reduce((a, b) => a + b, 0) / s.length]; });
  const order = t => t + (t < Math.PI / 2 ? TAU : 0);
  const headTop = top.slice().sort((p, q) => order(p[0]) - order(q[0])).map(([t, r]) => [cx + (r + 16) * Math.cos(t), cy + (r + 16) * Math.sin(t)]);

  const nl = bl + 6, nr = br - 6, neckMid = (nl + nr) / 2;
  const xs = face.map(p => p[0]), ys = face.map(p => p[1]);
  return {
    build: {sx, sy}, neckBottom, blobTop, blob: [bl, br], neckMid,
    shoulder: {l: [nl, blobTop + 8], r: [nr, blobTop + 8], dip: [neckMid, blobTop + 46]},
    face, facePath: smoothPath(face), faceBox: {x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)},
    headTop, crown: Math.min(...headTop.map(p => p[1]))
  };
}
