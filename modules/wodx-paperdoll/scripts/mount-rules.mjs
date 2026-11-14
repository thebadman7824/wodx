/**
 * WoDX Paperdoll: the looks of mounts and vehicles (decision B4970). Pure rules; mounts.mjs does the Foundry side.
 * Every kind of mount (WoDX Interactables MOUNTS) has drawn looks: each look belongs to a year from which it is seen,
 * has a shape (its style), a set of colour schemes, and its seats: where each rider's own figure stands on it, for each
 * way it faces. The sheets are painted in three key ramps (paint, trim, cloth) that a scheme's colours replace.
 * The list comes from sprites/mounts/mounts.json, written by tools/sprites/mounts.py.
 */
export const FOLDER = "modules/wodx-paperdoll/sprites/mounts";
export const ROWS = ["up", "left", "down", "right"];
/** A person's frame, and the row its feet stand on (sprite-rules). */
export const RIDER = {w: 96, h: 112, feet: 103, anchorY: 0.745};

let LIST = {kinds: {}, schemes: {}, keys: {a: [], b: [], c: []}};
/** Take the list in. Returns how many looks it holds. */
export function learn(manifest) {
  LIST = manifest && typeof manifest === "object" && manifest.kinds ? manifest : {kinds: {}, schemes: {}, keys: {a: [], b: [], c: []}};
  return Object.values(LIST.kinds).reduce((n, k) => n + (k.looks?.length ?? 0), 0);
}
export const kinds = () => Object.keys(LIST.kinds);
export const kindOf = kind => LIST.kinds[kind] ?? null;
export const looksOf = kind => LIST.kinds[kind]?.looks ?? [];
export const schemesOf = look => LIST.schemes[look?.schemes] ?? [];
export const keys = () => LIST.keys;
export const sheetPath = (kind, look) => `${FOLDER}/${kind}/${look.id}.png`;
export const stillPath = kind => `${FOLDER}/${kind}/still.png`;

/** A steady number from a text, so the same thing always gets the same look. */
export function hash(text) {
  let h = 2166136261;
  for ( const ch of String(text ?? "") ) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The years from which a kind has looks, oldest first. */
export const erasOf = kind => [...new Set(looksOf(kind).map(l => l.from))].sort((a, b) => a - b);

/**
 * The look of a kind in a year. pick: {look: an id that wins outright, style: a shape to keep across the years, seed}.
 * The era is the latest one not after the year (the oldest when the year is before them all); a style that the era
 * does not have falls back to the nearest earlier era that has it, then to a seeded pick of the era's own.
 */
export function lookFor(kind, year, pick = {}) {
  const all = looksOf(kind);
  if ( !all.length ) return null;
  if ( pick.look ) { const l = all.find(x => x.id === pick.look); if ( l ) return l; }
  const eras = erasOf(kind), y = Number.isFinite(Number(year)) && Number(year) > 0 ? Number(year) : eras[eras.length - 1];
  const era = [...eras].reverse().find(e => e <= y) ?? eras[0];
  if ( pick.style ) {
    for ( const e of [...eras].reverse().filter(e => e <= era) ) { const l = all.find(x => x.from === e && x.style === pick.style); if ( l ) return l; }
  }
  const own = all.filter(l => l.from === era);
  return own[hash(`${pick.seed ?? ""}:shape`) % own.length];
}

/** The colours a vehicle sheet offers (WoDX Interactables), as paint, to find the nearest scheme a look has. */
export const PAINT = {black: [44, 42, 48], white: [226, 226, 222], grey: [130, 132, 136], silver: [170, 174, 180], red: [176, 40, 36], maroon: [108, 30, 38],
  blue: [42, 70, 130], navy: [36, 48, 92], green: [44, 92, 62], olive: [86, 92, 58], brown: [110, 80, 54], tan: [176, 150, 110], cream: [224, 214, 186],
  yellow: [214, 180, 60], orange: [220, 116, 40], rust: [120, 76, 52], camo: [86, 92, 58], wood: [150, 100, 56], brass: [196, 160, 70]};

/** The colour scheme of a look. pick: {scheme: an id of the look's own, colour: a paint name (PAINT), seed}. */
export function schemeFor(look, pick = {}) {
  const all = schemesOf(look);
  if ( !all.length ) return null;
  if ( pick.scheme ) { const s = all.find(x => x.id === pick.scheme); if ( s ) return s; }
  if ( pick.colour ) {
    const same = all.find(x => x.id === pick.colour); if ( same ) return same;
    const want = PAINT[pick.colour];
    if ( want ) {
      // nearest by hue first (each colour scaled to its strongest channel), then by how light it is
      const hue = c => { const m = Math.max(...c, 1); return c.map(v => v / m); }, light = c => (c[0] + c[1] + c[2]) / 765;
      const far = c => hue(c).reduce((n, v, i) => n + (v - hue(want)[i]) ** 2, 0) + 0.5 * (light(c) - light(want)) ** 2;
      return all.reduce((best, s) => { const d = far(s.a[3]); return !best || d < best.d ? {s, d} : best; }, null).s;
    }
  }
  return all[hash(`${pick.seed ?? ""}:paint`) % all.length];
}

/** Swap the key ramps of a sheet's pixels (RGBA bytes) for a scheme's colours, in place. Returns how many pixels changed. */
export function recolour(data, scheme, K = LIST.keys) {
  const map = new Map();
  for ( const k of ["a", "b", "c"] ) (K[k] ?? []).forEach((c, i) => { const to = scheme?.[k]?.[i]; if ( to ) map.set((c[0] << 16) | (c[1] << 8) | c[2], to); });
  let n = 0;
  for ( let i = 0; i < data.length; i += 4 ) {
    if ( !data[i + 3] ) continue;
    const to = map.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if ( to ) { data[i] = to[0]; data[i + 1] = to[1]; data[i + 2] = to[2]; n++; }
  }
  return n;
}

/** The frame to show: wheels and oars go round twice a square, legs once (as the people's). */
export function colOf(kind, st, grid) {
  const n = kindOf(kind)?.frames ?? 1;
  if ( !st?.moving || n < 2 ) return 0;
  const per = n > 4 ? n : n * 2;
  return Math.floor(st.dist / (grid || 100) * per) % n;
}
/** A wing or a rotor turns while the thing is in the air, moving or not. */
export const spins = kind => ["helicopter", "plane", "jet", "balloon"].includes(kind);

export const rectOf = (look, facing, col = 0) => ({x: col * look.w, y: Math.max(0, ROWS.indexOf(facing)) * look.h, width: look.w, height: look.h});

/** Seat i of a look for a facing: {x, y, cut, pose}. More riders than seats sit out of sight inside. */
export function seatOf(look, facing, i) {
  const s = look?.seats?.[facing]?.[i];
  if ( !s ) return {x: (look?.w ?? 0) / 2, y: look?.ground ?? 0, cut: 0, pose: "sit"};
  return {x: s[0], y: s[1], cut: s[2], pose: s[3] ? "ride" : "sit"};
}

/**
 * Where a rider's feet go on the map: ground is the point of the map under the middle of the mount (the middle of its
 * frame across, its ground line down), k the map's size of one drawn pixel.
 */
export const seatPoint = (look, seat, ground, k) => ({x: ground.x + (seat.x - look.w / 2) * k, y: ground.y + (seat.y - look.ground) * k});

/** The map's size of one drawn pixel: a person's frame stands two squares tall. */
export const pixel = grid => (grid || 100) * 2 / RIDER.h;

/** What to draw of a rider in a seat: the rows of the frame that show, and where the picture's own anchor goes. */
export function riderDraw(seat, point, k) {
  const rows = Math.max(0, Math.min(RIDER.h, seat.cut));
  return {hidden: rows <= 0, rows, anchorY: rows > 0 ? RIDER.anchorY * RIDER.h / rows : RIDER.anchorY,
    x: point.x, y: point.y - (RIDER.feet - RIDER.anchorY * RIDER.h) * k, width: RIDER.w * k, height: rows * k};
}
