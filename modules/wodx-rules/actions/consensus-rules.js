/**
 * Consensus by era (Actions 3.18.0). Pure rules, no Foundry.
 *
 *   Dark Ages      Dark Ages: Mage (pp. 97, 136-139): no coincidental or vulgar split; a world-wide Consensus is
 *                  centuries off. Badly failed spells bring Backlash, and each Quintessence point spent adds to it.
 *   The Crusade    Mage: The Sorcerers Crusade (pdf pp. 241-253): casual and vain magick. Casual works through
 *                  accepted practice (the will of God, Fate or the Devil); vain comes from nowhere, from machines, or
 *                  from a foreign style. Difficulty and the Scourge gained are the same steps as M20. Backlash is
 *                  luck: a Fortune Die on every Arete roll, a 1 a Bane, a 10 a Boon, and either spends the Scourge.
 *                  The pool is cleared by a day alone in meditation for each point.
 *   The Ascension  Mage 20th (pp. 611-612): coincidental and vulgar, with optional Reality Zones.
 *
 * The years each age starts are a house rule (the books set no hard border): the Crusade from 1450, the Ascension
 * from 1700.
 */
export const AGES = [
  {key: "dark", from: -Infinity, label: "The Dark Ages", ref: "Dark Ages: Mage pp. 97, 136-139"},
  {key: "crusade", from: 1450, label: "The Sorcerers Crusade", ref: "Sorcerers Crusade pdf pp. 241-249"},
  {key: "ascension", from: 1700, label: "The Ascension", ref: "Mage 20th pp. 611-612"}
];

/** The age a year falls in. No year (no chronicle) means the M20 rules, as before. */
export function ageFor(year) {
  const y = Number(year);
  if ( !year || !Number.isFinite(y) ) return AGES[2];
  let age = AGES[0];
  for ( const a of AGES ) if ( y >= a.from ) age = a;
  return age;
}

/** The words each age uses for the three kinds of Effect, and the name of Paradox. */
export const WORDS = {
  dark: {coincidental: "Coincidental", vulgar: "Vulgar, no witnesses", witnessed: "Vulgar, with witnesses", paradox: "Paradox"},
  crusade: {coincidental: "Casual", vulgar: "Vain, no witnesses", witnessed: "Vain, with witnesses", paradox: "the Scourge"},
  ascension: {coincidental: "Coincidental", vulgar: "Vulgar, no witnesses", witnessed: "Vulgar, with witnesses", paradox: "Paradox"}
};

/** The styles accepted across Europe in the Crusade (pdf p. 243). */
export const CRUSADE_EUROPE = ["pagan", "witchcraft", "christian", "miracle", "prayer", "alchemy", "hermetic", "infernal"];

const words = s => String(s ?? "").toLowerCase().split(/[^a-zÀ-ɏ]+/).filter(w => w.length > 2);

/** Whether a caster's style is at home in a place's accepted styles (a word in common). */
export function styleFits(style, accepted) {
  const a = new Set((Array.isArray(accepted) ? accepted : words(accepted)).map(x => String(x).toLowerCase()));
  return words(style).some(w => a.has(w));
}

/**
 * What the Effect should count as, before witnesses: "coincidental" or "vulgar", with the reason.
 *   age      ageFor(year).key
 *   style    the caster's style, in words ("Hermetic", "Christian miracles", "Taoist")
 *   place    the scene's accepted styles (words or a list); empty means none set
 *   zones    the M20 Reality Zone mode: "zone" (the place decides), "world" (one Consensus everywhere), "free"
 * A stranger's magick is vain (Crusade pdf p. 242). In M20 only "zone" mode looks at the place (p. 611).
 */
export function suggestKind({age = "ascension", style = "", place = "", zones = "world"} = {}) {
  const hasPlace = Array.isArray(place) ? place.length > 0 : words(place).length > 0;
  if ( age === "dark" ) return {kind: null, why: "No coincidental or vulgar split in this age: a badly failed spell brings Backlash."};
  if ( age === "crusade" ) {
    const accepted = hasPlace ? place : CRUSADE_EUROPE;
    if ( !words(style).length ) return {kind: null, why: "Name the caster's style to see whether it is at home here."};
    return styleFits(style, accepted) ? {kind: "coincidental", why: "The style fits what people here believe: it can be casual."}
      : {kind: "vulgar", why: "A stranger's magick is vain here."};
  }
  if ( zones !== "zone" || !hasPlace || !words(style).length ) return {kind: null, why: ""};
  return styleFits(style, place) ? {kind: "coincidental", why: "The methods fit this Reality Zone."}
    : {kind: "vulgar", why: "These methods do not fit this Reality Zone."};
}

/** Fortune Dice on an Arete roll (pdf p. 249): one, and one more for each five points in the Scourge Pool. */
export const fortuneDice = pool => 1 + Math.floor(Math.max(0, Number(pool) || 0) / 5);

/** Reading the Fortune Dice: any 1 is a Bane, any 10 a Boon; both at once, the Bane wins. */
export function readFortune(faces = []) {
  const f = faces.map(Number);
  if ( f.includes(1) ) return "bane";
  if ( f.includes(10) ) return "boon";
  return null;
}

/** How big the event is, by the pool it spends (pdf p. 249: a small pool is a small event, a large one a catastrophe or a miracle). House rule bands. */
export function fortuneSize(pool) {
  const p = Number(pool) || 0;
  return p <= 0 ? "nothing at all" : p <= 4 ? "a small turn of luck" : p <= 9 ? "a marked turn of fate" : p <= 14 ? "a grave event" : "a catastrophe or a miracle";
}

/** Clearing the Scourge (pdf p. 249): a day alone in meditation for each point. */
export const purifyDays = pool => Math.max(0, Number(pool) || 0);
