/**
 * WoDX Interactables: cover on the map (B4671 to B4673). Pure rules, no Foundry calls.
 *
 * A tile marked as cover (a table, a counter or a bar, a barricade of crates or sacks, a low wall) makes shots at
 * whoever crouches behind it harder, by the cover table of V20 (pdf p. 286): light +1, good +2, superior +3. Shots
 * fired from behind it are one less (none for light cover). WoDX Combat reads it on every shot and throw.
 * A table stands as light cover and can be tipped over in a turn, loudly, for good cover (B4672, house rule): what
 * stood on it falls. Counters, bars and walls are fixed.
 * Who counts as behind it (B4673, house rule): someone whose middle is within a square of the cover, with the line of
 * the shot crossing it. Someone standing on it, or the shooter at the same cover, is not behind it.
 */

export const COVERS = {
  table: {label: "A table", level: 1, tipped: 2, tips: true},
  counter: {label: "A counter or a bar", level: 2, tips: false},
  barricade: {label: "Crates, sacks or a barricade", level: 2, tips: false},
  wall: {label: "A low wall or a parapet", level: 3, tips: false}
};
export const COVER_LEVELS = {1: "Light cover", 2: "Good cover", 3: "Superior cover"};

/** A cover tile, read from its WoDX settings. f: the tile's flags.wodx-interactables, with cover: true. */
export function describeCover(f = {}) {
  const kind = COVERS[f.coverKind] ? f.coverKind : "table";
  const C = COVERS[kind], tipped = !!(C.tips && f.tipped);
  return {
    cover: true, climb: false, mount: false, watch: false, sacred: false, hazard: false, hide: false, light: false, clue: false, trap: false,
    container: false, door: false, secret: false, ds: "open", kind, tips: C.tips, tipped, level: tipped ? C.tipped : C.level,
    title: String(f.title ?? "").trim().slice(0, 80), electronic: "none", lock: "none", items: [], progress: {}, tries: f.tries ?? {}
  };
}

/** Its name in the Interact list: "The table, tipped over (good cover)". */
export function coverTitle(o) {
  const base = o.title || COVERS[o.kind].label;
  return `${base}${o.tipped ? ", tipped over" : ""} (${COVER_LEVELS[o.level].toLowerCase()})`;
}

/** What a character can do with it. turn: seconds in a turn. */
export function coverOptions(o, turn = 3) {
  const out = [];
  const shots = `${COVER_LEVELS[o.level]}: shots at someone crouched behind it are at +${o.level} difficulty${o.level > 1 ? `, and shots from behind it at +${o.level - 1}` : ""} (V20 p. 286).`;
  if ( o.tips && !o.tipped ) out.push({id: "tipOver", label: "Tip it over for cover", roll: null, seconds: turn, noise: {success: "loud"}, fight: true,
    note: `Good cover once it is on its side: +${COVERS[o.kind].tipped} to shots at someone behind it. Whatever stood on it falls.`});
  if ( o.tipped ) out.push({id: "setUpright", label: "Set it on its legs again", roll: null, seconds: turn, noise: {success: "quiet"}, note: "Light cover again."});
  out.push({id: "coverNote", label: COVER_LEVELS[o.level], roll: null, disabled: true, note: shots});
  return out;
}

/** The result of an option on a cover tile, or null for one that is not a cover option. flags: the patch to fill. */
export function resolveCover(id, flags) {
  if ( id === "tipOver" ) { flags.tipped = true; return "tips it over and crouches behind it."; }
  if ( id === "setUpright" ) { flags.tipped = false; return "sets it back on its legs."; }
  return null;
}

/** Clean a tile's cover settings from the config form. */
export function cleanCover(s = {}) {
  return {cover: !!s.cover, coverKind: COVERS[s.coverKind] ? s.coverKind : "table", tipped: !!s.tipped};
}

// ---------------------------------------------------------------- geometry (pixels)
/** A point in the tile's own frame (unturned, from its top-left corner). t: {x, y, width, height, rotation}. */
function local(t, p) {
  const cx = t.x + t.width / 2, cy = t.y + t.height / 2, a = -(Number(t.rotation) || 0) * Math.PI / 180;
  const dx = p[0] - cx, dy = p[1] - cy;
  return [dx * Math.cos(a) - dy * Math.sin(a) + t.width / 2, dx * Math.sin(a) + dy * Math.cos(a) + t.height / 2];
}
/** How far a point (tile frame) lies outside the box 0..w, 0..h; 0 inside. */
function outside(t, q) {
  const dx = Math.max(0, -q[0], q[0] - t.width), dy = Math.max(0, -q[1], q[1] - t.height);
  return Math.hypot(dx, dy);
}
/** Does the segment a-b (tile frame) cross the box? Liang-Barsky clipping. */
function crosses(t, a, b) {
  let lo = 0, hi = 1;
  const d = [b[0] - a[0], b[1] - a[1]];
  for ( const [p, q] of [[-d[0], a[0]], [d[0], t.width - a[0]], [-d[1], a[1]], [d[1], t.height - a[1]]] ) {
    if ( p === 0 ) { if ( q < 0 ) return false; continue; }
    const r = q / p;
    if ( p < 0 ) { if ( r > hi ) return false; if ( r > lo ) lo = r; }
    else { if ( r < lo ) return false; if ( r < hi ) hi = r; }
  }
  return lo <= hi;
}

/**
 * The cover on a shot from one point to another. tiles: [{x, y, width, height, rotation, level, name}] in pixels;
 * grid: a square's size in pixels. Returns {target: {level, name} | null, shooter: {level, name} | null, diff}:
 * diff is what the shot's difficulty goes up by (the target's cover, plus the shooter's own less one).
 */
export function coverOnShot(from, to, tiles = [], grid = 100) {
  let target = null, shooter = null;
  for ( const t of tiles ) {
    if ( !(t?.width > 0 && t?.height > 0 && t.level > 0) ) continue;
    const a = local(t, from), b = local(t, to);
    const dt = outside(t, b), ds = outside(t, a);
    if ( !crosses(t, a, b) ) continue;
    // behind it: within a square of it, and not inside it (on it or under it, the tile is no shield)
    if ( dt > 0 && dt <= grid && ds > grid && (!target || t.level > target.level) ) target = {level: t.level, name: t.name ?? ""};
    if ( ds > 0 && ds <= grid && dt > grid && (!shooter || t.level > shooter.level) ) shooter = {level: t.level, name: t.name ?? ""};
  }
  const diff = (target?.level ?? 0) + Math.max(0, (shooter?.level ?? 0) - 1);
  return {target, shooter, diff};
}
