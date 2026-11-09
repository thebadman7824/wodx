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

/** The realms a journey can cross. Fixed list. */
export const REALMS = {
  tempest: {label: "The Tempest (by a Byway)", hazard: 0.35, maelstrom: 0.05, lines: ["wraith"]},
  labyrinth: {label: "The Labyrinth", hazard: 0.6, maelstrom: 0.1, lines: ["wraith"]},
  umbra: {label: "The Umbral roads (Moon Paths, the Near Umbra)", hazard: 0.3, maelstrom: 0, lines: ["werewolf", "mage", "changeling"]}
};

/** The years of the Great Maelstroms WoDX dates (see Dated events): the storm is far likelier then. */
export const GREAT_MAELSTROMS = [[1347, 1352, "the Second Great Maelstrom"], [1600, 1601, "the Third Great Maelstrom"], [1916, 1918, "the Fourth Great Maelstrom"]];
export function greatMaelstrom(year) {
  const y = Number(year);
  return GREAT_MAELSTROMS.find(([a, b]) => y >= a && y <= b)?.[2] ?? null;
}

/** Legs for a journey of so many hours. */
export const legsFor = hours => Math.max(1, Math.min(8, Math.ceil((Number(hours) || 1) / 2)));

/**
 * Plan a journey. randFor(key) gives a seeded stream for a leg. tables: (id) => table. storm: force the Maelstrom
 * odds up (the Storyteller's own Maelstrom).
 */
export function planJourney({realm = "tempest", hours = 2, year = null, storm = false, randFor, tables} = {}) {
  const R = REALMS[realm] ?? REALMS.tempest;
  const great = greatMaelstrom(year);
  const mChance = R.maelstrom ? (storm || great ? 0.4 : R.maelstrom) : 0;
  const legs = [];
  for ( let i = 0; i < legsFor(hours); i++ ) {
    const rand = randFor(`leg:${i}`);
    const leg = {n: i + 1, landmark: G.draw(`journey.${realm}.landmark`, {rand, tables})?.text ?? ""};
    if ( rand() < R.hazard ) leg.hazard = G.draw(`journey.${realm}.hazard`, {rand, tables})?.text ?? null;
    if ( mChance && rand() < mChance ) leg.maelstrom = G.draw("journey.maelstrom", {rand, tables})?.text ?? null;
    legs.push(leg);
  }
  return {realm, realmLabel: R.label, hours: Number(hours) || 1, legs, great, storm: !!storm,
    hazards: legs.filter(l => l.hazard).length, maelstroms: legs.filter(l => l.maelstrom).length};
}

export function journeyText(j) {
  return j.legs.map(l => `Leg ${l.n}: ${l.landmark}${l.hazard ? ` Hazard: ${l.hazard}` : ""}${l.maelstrom ? ` Maelstrom: ${l.maelstrom}` : ""}`).join(" ");
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
