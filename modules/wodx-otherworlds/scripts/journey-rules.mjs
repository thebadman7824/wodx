/**
 * Otherworld journeys and the Shadowlands' decay, with no Foundry in them.
 *
 *   Journeys  A trip through the Tempest, the Labyrinth or the Umbral roads is cut into legs (one for every two hours,
 *             one to eight). Each leg has a landmark and may have a hazard; in the Tempest and the Labyrinth a leg may
 *             meet the Maelstrom, far more often in the years of a Great Maelstrom. House figures, seeded.
 *   Decay     How the Shadowlands look by the local Shroud: the lower the Shroud, the nearer death, the more the
 *             world rots and greys on the map. A CSS filter, applied on the viewer's own client.
 */
import * as G from "../../wodx-chronicle/scripts/gen-core.mjs";
import {greatMaelstrom as gm, moonRisk, trodTime, TRODS} from "./realms-rules.mjs";

/** The realms a journey can cross. Fixed list. */
export const REALMS = {
  tempest: {label: "The Tempest (by a Byway)", hazard: 0.35, maelstrom: 0.05, lines: ["wraith"]},
  labyrinth: {label: "The Labyrinth", hazard: 0.6, maelstrom: 0.1, lines: ["wraith"]},
  umbra: {label: "The Umbral roads (an airt, the Near Umbra)", hazard: 0.3, maelstrom: 0, lines: ["werewolf", "mage", "changeling"]},
  moonpath: {label: "A Moon Path", hazard: 0.2, maelstrom: 0, moon: true, tables: "moon", lines: ["werewolf", "mage"]},
  moonbridge: {label: "A Moon Bridge from a caern", hazard: 0.05, maelstrom: 0, moon: true, legs: 1, tables: "moon", lines: ["werewolf"]},
  "trod-silver": {label: "A trod: the Silver Path", hazard: 0.2, maelstrom: 0, trod: "silver", tables: "trod", lines: ["changeling"]},
  "trod-balor": {label: "A trod: a Path of Balor", hazard: 0.45, maelstrom: 0, trod: "balor", tables: "trod", lines: ["changeling"]},
  "trod-twilight": {label: "A trod: a twilight road", hazard: 0.3, maelstrom: 0, trod: "twilight", tables: "trod", lines: ["changeling"]}
};

/** The year of a Great Maelstrom, if any (by the chronicle's fired events when given; see realms-rules.mjs). */
export function greatMaelstrom(year, fired = null) {
  return gm(year, fired);
}

/** Legs for a journey of so many hours. */
export const legsFor = hours => Math.max(1, Math.min(8, Math.ceil((Number(hours) || 1) / 2)));

/**
 * Plan a journey. randFor(key) gives a seeded stream for a leg. tables: (id) => table. storm: force the Maelstrom
 * odds up (the Storyteller's own Maelstrom).
 */
export function planJourney({realm = "tempest", hours = 2, year = null, storm = false, randFor, tables, fired = null, moon = null} = {}) {
  const R = REALMS[realm] ?? REALMS.tempest;
  const great = R.maelstrom ? greatMaelstrom(year, fired) : null;
  const mChance = R.maelstrom ? (storm || great ? 0.4 : R.maelstrom) : 0;
  // The moon's roads are safest at the full moon, worst at the new (house figures)
  const risk = R.moon && moon !== null && moon !== undefined ? moonRisk(moon) : 1;
  const hazard = Math.min(0.95, R.hazard * risk);
  const key = R.tables ?? realm;
  const legs = [];
  const nLegs = R.legs ?? legsFor(hours);
  for ( let i = 0; i < nLegs; i++ ) {
    const rand = randFor(`leg:${i}`);
    const leg = {n: i + 1, landmark: G.draw(`journey.${key}.landmark`, {rand, tables})?.text ?? ""};
    if ( rand() < hazard ) leg.hazard = G.draw(`journey.${key}.hazard`, {rand, tables})?.text ?? null;
    if ( mChance && rand() < mChance ) leg.maelstrom = G.draw("journey.maelstrom", {rand, tables})?.text ?? null;
    legs.push(leg);
  }
  const out = {realm, realmLabel: R.label, hours: Number(hours) || 1, legs, great, storm: !!storm,
    hazards: legs.filter(l => l.hazard).length, maelstroms: legs.filter(l => l.maelstrom).length};
  if ( R.moon && moon !== null && moon !== undefined ) out.moonRisk = risk;
  if ( realm === "moonbridge" ) out.note = "A Moon Bridge takes a thousandth of the time (the Rite of the Opened Bridge, W20 pdf 209 / p. 207).";
  if ( R.trod ) { out.trod = R.trod; out.arrival = trodTime(hours, randFor("time")); out.note = TRODS[R.trod].note; }
  return out;
}

export function journeyText(j) {
  const slip = j.arrival && j.arrival.slip !== "none" ? ` Time on the trod: ${slipWords(j.arrival)}.` : "";
  return j.legs.map(l => `Leg ${l.n}: ${l.landmark}${l.hazard ? ` Hazard: ${l.hazard}` : ""}${l.maelstrom ? ` Maelstrom: ${l.maelstrom}` : ""}`).join(" ") + slip;
}

/** In words, how the trod's time ran. */
export function slipWords(a) {
  if ( !a || a.slip === "none" ) return "as planned";
  if ( a.slip === "lost" ) return `they come out ${a.days} day${a.days === 1 ? "" : "s"} later than they should`;
  return `${a.slip === "fast" ? "quicker" : "slower"} than planned, ${a.hours} hours`;
}

/** Decay strength from the Shroud (4 to 10; 7 when unknown): 1 at Shroud 4, 0.6 at 7, 0.2 at 10. House figures. */
export function decayStrength(shroud) {
  const n = shroud === null || shroud === undefined || shroud === "" ? NaN : Number(shroud);
  const s = Number.isFinite(n) ? Math.min(10, Math.max(4, n)) : 7;
  return Math.round((0.2 + 0.8 * (10 - s) / 6) * 100) / 100;
}
/** The decay as a CSS filter: grey, a little sepia rot, harder contrast, darker. "" when off. */
export function decayCss(shroud, {on = true} = {}) {
  if ( !on ) return "";
  const k = decayStrength(shroud);
  const f = n => Math.round(n * 100) / 100;
  return `grayscale(${f(0.35 + 0.45 * k)}) sepia(${f(0.25 * k)}) contrast(${f(1 + 0.15 * k)}) brightness(${f(1 - 0.15 * k)})`;
}

/* ---- the looks of the other worlds ---- */

/**
 * The map as seen from each other world, on the viewer's own client: the Penumbra and the Shadowlands already have their
 * silvered and drained twin art (and the Shadowlands its decay); the Near Dreaming shimmers, its colours swaying slowly
 * through a hue; one jacked into the Net sees the world as glowing lines.
 */
export const LOOKS = {dreaming: {label: "Near Dreaming: an iridescent shimmer", sway: 28, period: 7000}, net: {label: "The Net: the world in glowing lines"}};
export const NET_FILTER_ID = "wodx-net-look";
/** The CSS filter for a viewer's layer. phase runs from -1 to 1 (the Dreaming's sway). "" for none. */
export function layerLookCss({layer = "physical", inNet = false, shroud = null, phase = 0, looks = true, decay = true} = {}) {
  if ( inNet ) return looks ? `url(#${NET_FILTER_ID})` : "";
  if ( layer === "shadowlands" ) return decayCss(shroud, {on: decay});
  if ( layer === "dreaming" && looks ) {
    const p = Math.max(-1, Math.min(1, Number(phase) || 0));
    return `saturate(1.45) hue-rotate(${Math.round(LOOKS.dreaming.sway * p)}deg) brightness(1.06) contrast(1.04)`;
  }
  return "";
}
/** The Net's filter: grey, then the edges only (a Laplacian), lit green and cyan on black. */
export const NET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false">`
  + `<filter id="${NET_FILTER_ID}" color-interpolation-filters="sRGB">`
  + `<feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0 0.3 0.59 0.11 0 0 0.3 0.59 0.11 0 0 0 0 0 1 0"/>`
  + `<feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true"/>`
  + `<feComponentTransfer><feFuncR type="linear" slope="0.25"/><feFuncG type="linear" slope="3"/><feFuncB type="linear" slope="2.4" intercept="0.04"/></feComponentTransfer>`
  + `</filter></svg>`;

/**
 * 0.15.0: how much time passes outside while travellers make a journey (B1604, B1605). Most roads keep the world's
 * time: the hours planned. A Moon Bridge takes a thousandth of it (W20, above). A trod runs fast, slow or loses days
 * (C20, above; house figures). Realms whose books may say time runs differently there are listed in REALM_TIME with
 * check: true until the book check fixes their pages; until then they keep the plain clock and the card says it is the
 * Storyteller's call.
 */
export const REALM_TIME = {
  tempest: {rule: "same"}, labyrinth: {rule: "same"}, umbra: {rule: "same"}, moonpath: {rule: "same"},
  moonbridge: {rule: "thousandth", ref: "W20 pdf 209 / p. 207"},
  "trod-silver": {rule: "trod", ref: "C20 pdf 53 / p. 52"}, "trod-balor": {rule: "trod", ref: "C20 pdf 53 / p. 52"}, "trod-twilight": {rule: "trod", ref: "C20 pdf 53 / p. 52"},
  "far-dreaming": {rule: "storyteller", check: true, note: "Time in the Far Dreaming and Arcadia may not match the world's: the Storyteller's call until the book check."},
  "deep-umbra": {rule: "storyteller", check: true, note: "Some Deep Umbra realms may keep their own time: the Storyteller's call until the book check."}
};

/** Seconds that pass outside for a drawn journey, and the words for the card: {seconds, rule, words}. */
export function timeOutside(j) {
  const t = REALM_TIME[j?.realm] ?? {rule: "same"};
  const hours = Math.max(0, Number(j?.hours) || 0);
  if ( t.rule === "thousandth" ) { const s = Math.max(1, Math.round(hours * 3600 / 1000)); return {seconds: s, rule: t.rule, words: `${s} seconds outside (a thousandth of ${hours} hours)`}; }
  if ( t.rule === "trod" && j?.arrival ) { const h = Math.max(1, Number(j.arrival.hours) || hours); return {seconds: h * 3600, rule: t.rule, words: `${h} hours outside (${slipWords(j.arrival)})`}; }
  return {seconds: Math.round(hours * 3600), rule: t.rule, words: `${hours} hours outside`, note: t.note ?? null};
}
