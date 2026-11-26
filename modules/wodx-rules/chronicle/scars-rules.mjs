/**
 * Scars on the map (B3759): what a disaster or a great power leaves on a place until it is rebuilt. Pure rules.
 *
 * A scar changes the map's own pieces and adds a few of its own, and remembers how each piece stood, so Undo or the
 * slow rebuilding puts every one back:
 *   tiles    the things in the hit buildings are darkened (burnt), washed grey-blue (flooded) or dimmed (wrecked)
 *   lights   the lights in them go out
 *   doors    doors burst open; in the worst-hit buildings walls break through (nothing blocks sight or passage)
 *   marks    scorch, rubble or mud pictures from the asset packs over the spots, or a plain drawing when the picture
 *            is not on this Foundry
 * Buildings are read from WoDX Interactables' adopted maps (a building's region carries its key, its walls, things
 * and lights carry ids that start with the key); a map with no adopted buildings is hit in spots instead.
 */

export const KINDS = {
  fire:   {label: "Burnt", tint: "#3b2a22", alpha: 0.85, lights: 1, doors: 0.5, breach: 0, marks: "scorch", markColour: "#1f1510", weeks: 10},
  flood:  {label: "Flooded", tint: "#7d93a0", alpha: 0.95, lights: 0.6, doors: 0.3, breach: 0, marks: "mud", markColour: "#4b5a52", weeks: 4},
  quake:  {label: "Collapsed", tint: "#7a6f62", alpha: 0.9, lights: 0.8, doors: 0.7, breach: 0.25, marks: "rubble", markColour: "#6b5536", weeks: 14},
  storm:  {label: "Storm-wrecked", tint: "#8a8478", alpha: 1, lights: 0.4, doors: 0.4, breach: 0.05, marks: "rubble", markColour: "#6b5536", weeks: 4},
  blast:  {label: "Blasted", tint: "#4a4038", alpha: 0.9, lights: 1, doors: 0.8, breach: 0.3, marks: "rubble", markColour: "#5a4a3a", weeks: 8},
  battle: {label: "Fought over", tint: "#5a4c40", alpha: 0.9, lights: 0.7, doors: 0.6, breach: 0.1, marks: "rubble", markColour: "#5a4a3a", weeks: 10},
  sack:   {label: "Sacked", tint: "#3b2a22", alpha: 0.85, lights: 1, doors: 1, breach: 0.15, marks: "scorch", markColour: "#1f1510", weeks: 20},
  riot:   {label: "Smashed", tint: null, alpha: 1, lights: 0.5, doors: 0.6, breach: 0, marks: "rubble", markColour: "#6b5536", weeks: 2}
};
/** Town events and world kinds that scar, and the scar they leave. */
export const SCAR_OF = {fire: "fire", flood: "flood", quake: "quake", storm: "storm", battle: "battle", sack: "sack", riot: "riot", rising: "riot",
  blaze: "fire", rubble: "quake", water: "flood", blast: "blast"};

/**
 * Pictures from the packs, by mark, best first: paths relative to Foundry's Data. Each is checked on the Storyteller's
 * computer before it is used; a plain drawing stands in when none is there.
 */
const PACK = "wodx-assets/scars";
const nums = (n, f) => Array.from({length: n}, (_, i) => f(i + 1));
const two = i => String(i).padStart(2, "0");
export const ART = {
  rubble: [...nums(5, i => `${PACK}/A9Ogfn7p/textures/objects/RuinsRubble${i}.png`), ...nums(4, i => `${PACK}/A9Ogfn7p/textures/objects/RuinsRubbleC${i}.png`)],
  scorch: [...nums(7, i => `${PACK}/VBK7mziu/textures/objects/Skront_Fire/Colorable/Ash_Scatter_${two(i)}.png`),
    ...nums(7, i => `${PACK}/VBK7mziu/textures/objects/Skront_Fire/Colorable/Ash_Pile_${two(i)}.png`),
    ...nums(6, i => `${PACK}/VBK7mziu/textures/objects/Skront_Fire/Colorable/Burnt_Log_${two(i)}.png`)],
  mud: [...nums(3, i => `${PACK}/l7pUS3Kp/textures/patterns/normal/Wet_Mud_A_${two(i)}.jpg`), ...nums(3, i => `${PACK}/l7pUS3Kp/textures/patterns/normal/Wet_Mud_B_${two(i)}.jpg`)]
};

/** How many of the buildings a town-wide event hits, by severity 1 to 3; an area hits every building in it. */
export const SHARE = {1: 0.15, 2: 0.3, 3: 0.5};
export const sev = s => Math.max(1, Math.min(3, Math.round(Number(s) || 1)));

/** Severity from a town event's blow to prosperity (the town rules' figures). */
export function severityOf(e = {}) {
  const p = Math.abs(Number(e.prosperity) || 0);
  if ( e.kind === "sack" || p >= 1.2 ) return 3;
  return p >= 0.5 ? 2 : 1;
}

/** A small seeded random number source, so a scar is the same on a replay. */
export function seeded(seed = "") {
  let h = 2166136261;
  for ( const c of String(seed) ) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const inCircle = (p, at) => !at || Math.hypot(p.x - at.x, p.y - at.y) <= at.radius;
const centre = b => ({x: b.x + b.w / 2, y: b.y + b.h / 2});

/**
 * What a scar changes. inv: {buildings: [{key, x, y, w, h, walls: [{id, door}], tiles: [id], lights: [id]}],
 * loose: {walls: [{id, door, x, y}], tiles: [{id, x, y}], lights: [{id, x, y}]}, grid, rect}.
 * at: {x, y, radius} or null for the whole scene. Returns {hit: [keys], changes: [...], marks: [...]}:
 *   {type: "tile", id, set: {tint, alpha}} · {type: "light", id, set: {hidden: true}} · {type: "wall", id, set: {ds: 1}}
 *   {type: "wall", id, set: {move: 0, sight: 0, light: 0, sound: 0}} (broken through) · marks: {x, y, size, rotation}
 */
export function plan(kind, severity, inv = {}, {at = null, seed = "", spots = null} = {}) {
  const K = KINDS[kind];
  if ( !K ) return {hit: [], changes: [], marks: []};
  const s = sev(severity), rand = seeded(`${kind}:${s}:${seed}`), grid = Number(inv.grid) || 100;
  const pick = share => rand() < Math.min(1, share * (0.6 + s * 0.2));
  const changes = [], marks = [], hit = [];
  const hitPiece = ({tiles = [], lights = [], walls = []}) => {
    if ( K.tint ) for ( const id of tiles ) changes.push({type: "tile", id, set: {tint: K.tint, alpha: K.alpha}});
    for ( const id of lights ) if ( pick(K.lights) ) changes.push({type: "light", id, set: {hidden: true}});
    for ( const w of walls ) {
      if ( K.breach && pick(K.breach) ) changes.push({type: "wall", id: w.id, set: {move: 0, sight: 0, light: 0, sound: 0}});
      else if ( w.door && pick(K.doors) ) changes.push({type: "wall", id: w.id, set: {ds: 1}});
    }
  };
  let buildings = (inv.buildings ?? []).filter(b => inCircle(centre(b), at));
  if ( !at ) buildings = buildings.filter(() => rand() < SHARE[s]);
  for ( const b of buildings ) {
    hit.push(b.key);
    hitPiece(b);
    const c = centre(b), n = 1 + Math.floor(rand() * s);
    for ( let i = 0; i < n; i++ ) marks.push({x: c.x + (rand() - 0.5) * b.w * 0.6, y: c.y + (rand() - 0.5) * b.h * 0.6,
      size: Math.round(Math.max(grid, Math.min(b.w, b.h) * (0.35 + rand() * 0.3))), rotation: Math.round(rand() * 360)});
  }
  // No adopted buildings here: the spot itself (an area), or a few spots over the scene
  if ( !buildings.length ) {
    const L = inv.loose ?? {};
    const places = at ? [at] : (spots ?? spotsIn(inv.rect, grid, 1 + s * 2, rand));
    for ( const p of places ) {
      const within = list => (list ?? []).filter(x => inCircle(x, p));
      hitPiece({tiles: within(L.tiles).map(t => t.id), lights: within(L.lights).map(l => l.id), walls: within(L.walls)});
      const n = Math.max(1, Math.round((p.radius / grid) * 0.6 * s));
      for ( let i = 0; i < n; i++ ) {
        const a = rand() * Math.PI * 2, r = rand() * p.radius * 0.7;
        marks.push({x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, size: Math.round(grid * (1 + rand() * 1.5)), rotation: Math.round(rand() * 360)});
      }
    }
  }
  // One change for each piece, the strongest wins (a breach over a burst door)
  const seen = new Map();
  for ( const c of changes ) { const k = `${c.type}:${c.id}`; if ( !seen.has(k) || "move" in c.set ) seen.set(k, c); }
  return {hit, changes: [...seen.values()], marks: marks.map(m => ({...m, x: Math.round(m.x), y: Math.round(m.y)}))};
}

/** A few spots over a scene's rectangle, each two to four squares across. */
export function spotsIn(rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, n = 3, rand = Math.random) {
  const out = [];
  for ( let i = 0; i < n; i++ ) {
    const radius = grid * (2 + rand() * 2);
    out.push({x: rect.x + radius + rand() * Math.max(1, rect.width - radius * 2), y: rect.y + radius + rand() * Math.max(1, rect.height - radius * 2), radius});
  }
  return out;
}

/** The share of a town's scars rebuilt in a week: 10% for a ruined town, up to 40% for a rich one. */
export const healShare = prosperity => Math.round((0.1 + 0.06 * Math.max(0, Math.min(5, Number(prosperity) || 0))) * 100) / 100;

/**
 * Which of a scar's changes are put right this time, oldest damage first in this order: lights, things, doors, walls,
 * then the marks. Returns the indexes into record.changes and record.made.
 */
export function healStep(record, share = 0.2) {
  const order = {light: 0, tile: 1, wall: 2};
  const left = (record.changes ?? []).map((c, i) => ({c, i})).filter(x => !x.c.healed)
    .sort((a, b) => (order[a.c.type] ?? 3) - (order[b.c.type] ?? 3) + (("move" in (a.c.set ?? {})) - ("move" in (b.c.set ?? {}))) * 0.5);
  const marks = (record.made ?? []).map((m, i) => ({m, i})).filter(x => !x.m.healed);
  const total = (record.changes ?? []).length + (record.made ?? []).length;
  let n = Math.max(1, Math.ceil(total * Math.max(0, Math.min(1, share))));
  const changes = left.slice(0, n).map(x => x.i);
  n -= changes.length;
  const made = n > 0 ? marks.slice(0, n).map(x => x.i) : [];
  return {changes, made, done: changes.length === left.length && made.length === marks.length};
}

/** How a piece stood before, for the keys a change sets. */
export function before(doc = {}, set = {}) {
  const out = {};
  for ( const k of Object.keys(set) ) {
    if ( k === "tint" ) out.tint = doc.texture?.tint ?? doc.tint ?? "#ffffff";
    else out[k] = doc[k] ?? null;
  }
  return out;
}
/** The update that puts a piece back. */
export function restoreOf(change) {
  const b = change.before ?? {};
  const upd = {};
  for ( const [k, v] of Object.entries(b) ) { if ( k === "tint" ) upd["texture.tint"] = v; else upd[k] = v; }
  return upd;
}
/** The update that scars a piece. */
export function updateOf(change) {
  const upd = {};
  for ( const [k, v] of Object.entries(change.set ?? {}) ) { if ( k === "tint" ) upd["texture.tint"] = v; else upd[k] = v; }
  return upd;
}
