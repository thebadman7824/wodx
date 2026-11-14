/**
 * WoDX Storyteller: what a town event looks like on the town's scenes (B4620, show-don't-tell desk v1). Pure rules,
 * no Foundry; the Foundry side is town-looks.mjs.
 *
 * A town turn's fire, flood, storm, earthquake, riot, rising or sack (and a power that reaches the town) leaves marks
 * on every scene of that market: the kinds are WoDX Chronicle's shared looks (water, flood, fire, smoke, rubble, taint,
 * plague, storm, rain, fog, snow, quake, calm). Each mark is a spot ({x, y, radius} on the scene) or the whole scene,
 * and lasts a while of game time. The spots are seeded by the town, the event and the scene, so the same turn draws the
 * same marks. How long each lasts and how many there are are house rules.
 */

const HOUR = 3600, DAY = 24 * HOUR, WEEK = 7 * DAY;

/**
 * By town event kind: the marks it leaves. spots: how many; r: radius in grid squares; band: where on the scene the
 * spots fall ("low" is the lowest third, where water gathers; "any" anywhere); last: seconds of game time.
 */
export const TOWN_LOOKS = {
  fire: [{kind: "fire", spots: 3, r: 2.5, band: "any", last: DAY}, {kind: "smoke", scene: true, last: DAY}, {kind: "rubble", spots: 3, r: 1.5, band: "any", last: 4 * WEEK, note: "burnt out"}],
  flood: [{kind: "flood", spots: 3, r: 4, band: "low", last: 3 * DAY}, {kind: "rain", scene: true, last: DAY}, {kind: "rubble", spots: 2, r: 1, band: "low", last: 2 * WEEK, note: "wreckage left by the water"}],
  storm: [{kind: "storm", scene: true, last: DAY}, {kind: "rubble", spots: 2, r: 1, band: "any", last: WEEK, note: "torn roofs and fallen branches"}],
  quake: [{kind: "quake", scene: true, last: HOUR}, {kind: "rubble", spots: 4, r: 2, band: "any", last: 4 * WEEK, note: "fallen walls"}],
  riot: [{kind: "fire", spots: 1, r: 1, band: "any", last: 12 * HOUR}, {kind: "smoke", scene: true, last: 12 * HOUR}, {kind: "rubble", spots: 3, r: 1, band: "any", last: WEEK, note: "barricades and smashed shutters"}],
  rising: [{kind: "fire", spots: 2, r: 1.5, band: "any", last: DAY}, {kind: "smoke", scene: true, last: 2 * DAY}, {kind: "rubble", spots: 4, r: 1.5, band: "any", last: 2 * WEEK, note: "barricades across the streets"}],
  sack: [{kind: "fire", spots: 4, r: 3, band: "any", last: 2 * DAY}, {kind: "smoke", scene: true, last: 3 * DAY}, {kind: "rubble", spots: 5, r: 2, band: "any", last: 8 * WEEK, note: "burnt and broken houses"}],
  blight: [{kind: "taint", spots: 2, r: 3, band: "low", last: 4 * WEEK, note: "withered gardens and fields"}],
  dread: [{kind: "fog", scene: true, last: 2 * DAY}],
  calm: [{kind: "calm", scene: true, last: DAY}]
};
/** The kinds a town event can name that leave marks. */
export const kindsWithLooks = () => Object.keys(TOWN_LOOKS);

/** A seeded number stream (mulberry32 over a string hash). */
export function seeded(seed) {
  let h = 2166136261;
  for ( const c of String(seed) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = (h >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The marks for one event on one scene. rect: the scene's playable rectangle {x, y, width, height}; grid: pixels a
 * square; now: world time; seed: anything that names the event (town, kind, turn). Returns
 * [{kind, at: {x, y, radius} | null, until: {worldTime}, note}].
 */
export function looksFor(kind, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, now = 0, seed = ""} = {}) {
  const plan = TOWN_LOOKS[kind];
  if ( !plan ) return [];
  const rand = seeded(`${seed}:${kind}`);
  const out = [];
  for ( const p of plan ) {
    const until = {worldTime: Math.round(Number(now) || 0) + p.last};
    if ( p.scene ) { out.push({kind: p.kind, at: null, until, note: p.note ?? ""}); continue; }
    const radius = Math.round(p.r * grid);
    const pad = Math.min(radius, rect.width / 4, rect.height / 4);
    const top = p.band === "low" ? rect.y + rect.height * 2 / 3 : rect.y + pad;
    const h = p.band === "low" ? rect.height / 3 - pad : rect.height - 2 * pad;
    for ( let i = 0; i < p.spots; i++ ) {
      out.push({kind: p.kind, at: {x: Math.round(rect.x + pad + rand() * Math.max(1, rect.width - 2 * pad)), y: Math.round(top + rand() * Math.max(1, h)), radius}, until, note: p.note ?? ""});
    }
  }
  return out;
}

/** The colour a fallback drawing takes for each look kind (when WoDX Chronicle's looks layer is not there). */
export const FALLBACK = {
  water: {color: "#2f5f8f", alpha: 0.45}, flood: {color: "#2f5f8f", alpha: 0.5}, fire: {color: "#d2551e", alpha: 0.45},
  smoke: {color: "#3a3a3a", alpha: 0.12}, rubble: {color: "#5b5148", alpha: 0.55}, taint: {color: "#4d5a2a", alpha: 0.4},
  plague: {color: "#6b6b3a", alpha: 0.15}, storm: {color: "#20262e", alpha: 0.15}, rain: {color: "#20262e", alpha: 0.08},
  fog: {color: "#8a8f96", alpha: 0.2}, snow: {color: "#e8eef4", alpha: 0.15}, quake: {color: "#5b5148", alpha: 0.1}, calm: {color: "#c9b27a", alpha: 0.06}
};

/** Is a look over at this world time? */
export const isOver = (look, now) => Number.isFinite(Number(look?.until?.worldTime)) && Number(now) >= Number(look.until.worldTime);
