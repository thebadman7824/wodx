/**
 * WoDX Interactables 0.16.0: carried light that burns down. Pure rules; carry.mjs does the Foundry side.
 *
 * A character carries a candle, a torch, an oil lantern or (from 1899) an electric torch. Lit, it is a light on the
 * token, and it burns down on the clock: a torch lasts about an hour, a candle four, a lantern's oil eight, an early
 * electric torch's battery two (six from 1960). Out of doors, wind puts out a candle and a downpour, a gale or a storm
 * puts out a torch or a candle; a lantern and an electric torch are shielded. House rules: the books give no burn times
 * or radii, so these are plain period figures (see PENDING-REVIEW).
 *
 * The state lives on the token: flags.wodx-interactables.carried = {kind, lit, left (seconds of fuel), since (world
 * time it was last lit or checked), low (the burning-low note was given), before (the token's own light, to put back)}.
 */

/** Radii in yards; angle in degrees (360 = all round). from/to: the years it can be had. */
export const CARRIED = {
  candle: {label: "Candle", bright: 1, dim: 3, angle: 360, hours: 4, color: "#ffb35c", animation: "torch", from: 0, to: 9999, wind: true, rain: true, verb: "gutters out"},
  torch: {label: "Torch", bright: 7, dim: 13, angle: 360, hours: 1, color: "#ff9b45", animation: "flame", from: 0, to: 9999, wind: false, rain: true, verb: "burns out"},
  lantern: {label: "Oil lantern", bright: 5, dim: 10, angle: 360, hours: 8, color: "#ffc27a", animation: "torch", from: 0, to: 9999, wind: false, rain: false, verb: "runs out of oil"},
  electric: {label: "Electric torch", bright: 10, dim: 20, angle: 60, hours: 2, hoursLate: 6, lateFrom: 1960, color: "#fff4d6", animation: "", from: 1899, to: 9999, wind: false, rain: false, verb: "fades as the battery dies"}
};

const num = v => Number(v) || 0;

/** The kinds a character can carry in a year (0 or unknown: all but the electric torch). */
export function kindsFor(year) {
  const y = num(year);
  return Object.entries(CARRIED).filter(([, k]) => y ? (y >= k.from && y <= k.to) : k.from === 0).map(([id, k]) => ({id, label: k.label}));
}

/** Seconds of fuel in a fresh one, in a year. */
export function fuelFor(kind, year) {
  const k = CARRIED[kind];
  if ( !k ) return 0;
  const h = (k.hoursLate && num(year) >= k.lateFrom) ? k.hoursLate : k.hours;
  return Math.round(h * 3600);
}

/** Yards in a scene's own units. */
export function toUnits(yards, units) {
  const u = String(units ?? "ft").toLowerCase();
  if ( /^(m|meter|metre|meters|metres)$/.test(u) ) return Math.round(yards * 0.9144 * 10) / 10;
  if ( /^(yd|yard|yards)$/.test(u) ) return yards;
  return yards * 3;
}

/** The token light data for a lit carried light, in a scene's units. */
export function lightData(kind, units) {
  const k = CARRIED[kind];
  if ( !k ) return null;
  return {bright: toUnits(k.bright, units), dim: toUnits(k.dim, units), angle: k.angle, color: k.color, alpha: 0.35,
    animation: k.animation ? {type: k.animation, speed: 2, intensity: 2} : {type: null}};
}

/** A fresh light, lit now. */
export function fresh(kind, year, now) {
  return {kind, lit: true, left: fuelFor(kind, year), since: num(now), low: false};
}

/**
 * The weather's verdict on a lit light out of doors. tags: WoDX Atmosphere's weather tags.
 * Returns "" (it stays lit) or a reason.
 */
export function weatherPutsOut(kind, {outdoors = false, tags = []} = {}) {
  const k = CARRIED[kind];
  if ( !k || !outdoors ) return "";
  const t = new Set(tags ?? []);
  if ( k.wind && (t.has("wind") || t.has("gale")) ) return "the wind";
  if ( k.rain && (t.has("downpour") || t.has("gale") || t.has("thunder")) ) return t.has("downpour") ? "the downpour" : t.has("gale") ? "the gale" : "the storm";
  return "";
}

/** Can it be lit here and now? "" if so, else why not. */
export function cannotLight(state, ctx = {}) {
  if ( !state || !CARRIED[state.kind] ) return "Nothing to light.";
  if ( num(state.left) <= 0 ) return `The ${CARRIED[state.kind].label.toLowerCase()} is spent. Take a fresh one.`;
  const w = weatherPutsOut(state.kind, ctx);
  return w ? `It will not stay lit in ${w}.` : "";
}

/**
 * Burn a lit light from state.since to now. ctx: {outdoors, tags}.
 * Returns {state, out: "" | "spent" | "weather", reason, low: true when it has just begun to burn low}.
 */
export function burn(state, now, ctx = {}) {
  if ( !state?.lit || !CARRIED[state.kind] ) return {state, out: "", reason: "", low: false};
  const k = CARRIED[state.kind];
  const dt = Math.max(0, num(now) - num(state.since));
  const left = Math.max(0, num(state.left) - dt);
  const next = {...state, left, since: num(now)};
  if ( left <= 0 ) return {state: {...next, lit: false}, out: "spent", reason: k.verb, low: false};
  const w = weatherPutsOut(state.kind, ctx);
  if ( w ) return {state: {...next, lit: false}, out: "weather", reason: w, low: false};
  const lowNow = !state.low && left <= Math.min(900, fuelFor(state.kind, 0) * 0.15);
  if ( lowNow ) next.low = true;
  return {state: next, out: "", reason: "", low: lowNow};
}

/** Fuel left, in words. */
export function leftWords(seconds) {
  const s = Math.max(0, Math.round(num(seconds)));
  if ( s <= 0 ) return "spent";
  if ( s < 600 ) return "a few minutes left";
  if ( s < 3600 ) return `about ${Math.round(s / 600) * 10} minutes left`;
  const h = Math.round(s / 1800) / 2;
  return `about ${h} hour${h === 1 ? "" : "s"} left`;
}
