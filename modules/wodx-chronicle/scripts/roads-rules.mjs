/**
 * WoDX Chronicle, B6304-B6309: the long roads out for the lines that have one besides the Kindred's Golconda
 * (15 November 2026: build them, and make them do something, not only say it). Pure rules; roads.mjs does the rest.
 *
 *   Wraith: Transcendence (Wraith: The Oblivion 20th pp. 297-300, pdf 362-365). No mechanical path in the book: the
 *     Storyteller judges each of the Eight Truths of the Tomes of Golden Light as the wraith lives it. A rise in
 *     permanent Angst (the Shadow growing) undoes "Conquer the Shadow". With all eight and permanent Angst below
 *     permanent Willpower, the Storyteller may let the wraith go: a one-way trip out of the chronicle.
 *   Kuei-jin: the Road Back (Kindred of the East, pdf pp. 30-31). The road is the Dharma rating on the sheet. At the
 *     final stages (Dharma 9) a Kuei-jin may be recognised as a bodhisattva, in communion with the spirit worlds; at
 *     Dharma 10 a bodhisattva may become an arhat and rejoin the Great Cycle, leaving the chronicle.
 *   Demon: Redemption (Demon: The Fallen p. 160). A demon whose permanent Torment reaches 0 could become an angel
 *     again, if the Storyteller says redemption exists. Grace holds until Torment rises again.
 */

export const TRUTHS = [
  {key: "patience", label: "Practice patience"},
  {key: "higher", label: "Cultivate the higher self"},
  {key: "shadow", label: "Conquer the Shadow"},
  {key: "self", label: "Make peace with yourself"},
  {key: "living", label: "Make peace with the world of the living"},
  {key: "identity", label: "Value identity over Corpus"},
  {key: "beyond", label: "Value Transcendence over identity"},
  {key: "virtues", label: "Perfect the positive virtues"}
];
export const truthByKey = k => TRUTHS.find(t => t.key === k) ?? null;
/** The Kuei-jin ranks of the Road Back by Dharma (KotE pdf p. 31: the bodhisattva heading's number is unclear in the scan; 9 chosen). */
export const BODHISATTVA_DHARMA = 9;
export const ARHAT_DHARMA = 10;

export const ROADS = {
  wraith: {key: "transcendence", label: "Transcendence", source: "Wraith: The Oblivion 20th pp. 297-300"},
  "kuei-jin": {key: "roadback", label: "The Road Back", source: "Kindred of the East pdf pp. 30-31"},
  demon: {key: "redemption", label: "Redemption", source: "Demon: The Fallen p. 160"}
};

/** The road a character can walk, from plain facts: {type, variant, hastorment}. */
export function roadLine({type = "", variant = "", hastorment = false} = {}) {
  const t = String(type).toLowerCase(), v = String(variant).toLowerCase();
  if ( t === "wraith" ) return "wraith";
  if ( t === "vampire" && v === "kindredeast" ) return "kuei-jin";
  if ( t === "demon" || hastorment ) return "demon";
  return null;
}

/** Add or take away one Truth. Returns the new list (no repeats, book order). */
export function withTruth(list = [], key, on = true) {
  const set = new Set((list ?? []).filter(k => truthByKey(k)));
  if ( truthByKey(key) ) { if ( on ) set.add(key); else set.delete(key); }
  return TRUTHS.map(t => t.key).filter(k => set.has(k));
}
/** Whether a wraith may go: every Truth, and the Shadow weaker than the will. */
export function transcendReady(truths = [], angstPerm = 0, willPerm = 0) {
  const all = TRUTHS.every(t => (truths ?? []).includes(t.key));
  const shadowHeld = (Number(angstPerm) || 0) < (Number(willPerm) || 0);
  return {all, shadowHeld, ready: all && shadowHeld, missing: TRUTHS.filter(t => !(truths ?? []).includes(t.key)).map(t => t.label)};
}
/** The Kuei-jin's place on the Road Back. */
export function roadBackStage(dharma = 0, {bodhisattva = false} = {}) {
  const d = Number(dharma) || 0;
  if ( bodhisattva && d >= ARHAT_DHARMA ) return "arhat-ready";
  if ( bodhisattva && d >= BODHISATTVA_DHARMA ) return "bodhisattva";
  if ( bodhisattva ) return "lapsed";
  if ( d >= BODHISATTVA_DHARMA ) return "bodhisattva-ready";
  return "walking";
}
/** A demon's distance from grace: 10 steps from Torment 10 to 0. */
export const redemptionStep = tormentPerm => Math.max(0, Math.min(10, 10 - (Number(tormentPerm) || 0)));
/** A rise in the Shadow: the permanent Angst went up since it was last seen. */
export const shadowRose = (before, now) => Number.isFinite(Number(before)) && before !== null && Number(now) > Number(before);
