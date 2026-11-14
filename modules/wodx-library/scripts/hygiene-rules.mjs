/**
 * WoDX Library: washing, grooming and cosmetics (B3909). No Foundry calls here; hygiene-use.mjs does the rest.
 *
 *   Filthy and Bloody are marks on a character (token statuses through WoDX Chronicle's conditions). The look reads
 *     them already: blood on them puts a mortal off at a first meeting, and filth puts off anyone of standing.
 *     Bloody is marked when a character takes lethal or aggravated harm; the Storyteller marks either from the token.
 *   Wash with soap, a towel, a sponge, a scrub brush, a bath: both marks come off.
 *   Groom with a comb, a razor, scent or cosmetics: well groomed for the night, so someone of standing meets them a
 *     step warmer (house rule), unless filth or blood still shows.
 *   Things for the house or the body that do neither (a plunger, a bathroom scale) are plain things with no Use.
 */
export const MARKS = ["filthy", "bloody"];
export const CLEANERS = /\b(soap|towel|sponge|scrub brush|pumice|tin bath|washboard)\b/i;
export const NO_USE = /plunger|toilet brush|\bmop\b|bathroom scale|sanitary pads|tampon/i;

export const isCleaner = name => CLEANERS.test(String(name ?? ""));
export const hasNoUse = name => NO_USE.test(String(name ?? ""));

/** The night a world time falls in (a day counted from noon). */
export const nightOf = worldTime => Math.floor(((Number(worldTime) || 0) - 43200) / 86400);

/** What washing or grooming with this does: {clears: [marks taken off], groomed, line}. marks: the marks on them. */
export function washResult(name, marks = []) {
  const on = MARKS.filter(m => (marks ?? []).includes(m));
  if ( isCleaner(name) ) {
    if ( on.length ) return {clears: on, groomed: true, line: `Washed clean: no more ${on.map(m => (m === "bloody" ? "blood" : "filth")).join(" or ")} on them, and they are fit to be seen.`};
    return {clears: [], groomed: true, line: "Washed and fresh: well groomed for the night."};
  }
  if ( on.length ) return {clears: [], groomed: true, line: `Groomed, though the ${on.map(m => (m === "bloody" ? "blood" : "filth")).join(" and ")} still shows until they wash.`};
  return {clears: [], groomed: true, line: "Well groomed for the night: someone of standing meets them a little warmer."};
}

/** Are they well groomed tonight? flag: the night they groomed. */
export const groomedTonight = (flag, worldTime) => flag !== null && flag !== undefined && Number(flag) === nightOf(worldTime);

/** Did this update give the character a lethal or aggravated wound? before, after: system.health.damage. */
export function newWound(before = {}, after = {}) {
  const n = v => Number(v) || 0;
  return ["lethal", "aggravated"].some(k => after?.[k] !== undefined && n(after[k]) > n(before?.[k]));
}
