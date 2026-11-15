/**
 * WoDX NPC: what NPCs do once they have carried someone where they meant to (Aftercare Desk a1-a12, B5710 to B5721).
 * Pure rules; the Foundry side is carry-aftercare.mjs. Every figure marked "house" is logged in docs/PENDING-REVIEW.md.
 *
 *   a1  a hurt ally is tended (Intelligence + Medicine, 6, harder for worse wounds), then mends on the clock; a
 *       Cainite ally is fed and mends with the blood
 *   a2  a Cainite in torpor is kept hidden; one of their own may feed them blood to wake them (the Storyteller approves)
 *   a3  a dead mortal ally gets the rite of their faith and era, a marked grave, and their family's grudge
 *   a4  a Cainite's Final Death: the remains are gathered, the news spreads, their faction loses Status
 *   a5  a dead enemy is disposed of by kind (burned, sunk, buried in the wilds, or handed to the law)
 *   a6  the fallen foe's and the captive's things go into the captors' stores
 *   a7  a prisoner is guarded and fed, and tries the bonds each night (Dexterity + Larceny or Strength + Athletics, 7)
 *   a8  questioning each day: Manipulation + Intimidation (or Dominate or Presence) against the prisoner's Willpower
 *   a9  a Cainite captor feeds on a mortal prisoner every other night, a point or two, never to the death
 *   a10 after a week the captors' faction decides: ransom, trade, the law, or let go; killing waits on the Storyteller
 *   a11 on its turn the prisoner's own faction may come for them
 *   a12 a player's character held prisoner gets a card each day: try the bonds, talk, or wait
 */
import {DAY, WEEK} from "../../wodx-chronicle/scripts/terms.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
export {DAY, WEEK};


/* ---------------- dice ---------------- */

/** V20 dice: {dice, hits, ones, net, botch}. */
export function roll(n, diff, rand = Math.random) {
  const d = Math.max(3, Math.min(10, Math.round(Number(diff) || 6)));
  const dice = Array.from({length: Math.max(0, Math.round(Number(n) || 0))}, () => 1 + Math.floor(rand() * 10));
  const {raw: hits, ones} = TERMS.successes(dice, d);
  return {dice, diff: d, hits, ones, net: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ---------------- a1: a hurt ally ---------------- */

/** First aid difficulty: 6, one harder past three levels of lethal or aggravated wounds, two past five (house). */
export function tendDiff(dmg = {}) {
  const deep = n(dmg.lethal) + n(dmg.aggravated);
  return 6 + (deep > 5 ? 2 : deep > 3 ? 1 : 0);
}
/** The best healer: the highest Intelligence + Medicine among those to hand. people: [{id, name, int, medicine}]. */
export function bestHealer(people = []) {
  return [...people].filter(p => p && n(p.medicine) + n(p.int) > 0).sort((a, b) => (n(b.int) + n(b.medicine)) - (n(a.int) + n(a.medicine)) || n(b.medicine) - n(a.medicine))[0] ?? null;
}
/**
 * A Cainite ally mends with blood (V20: a point heals a level of bashing or lethal). blood: {value, max}; dmg as
 * health damage. They are first fed up to `feed` points by a vessel or a ghoul (house: three), then spend blood
 * on the wounds, keeping one. -> {fed, spent, damage, blood}
 */
export function kindredMend(blood = {}, dmg = {}, feed = 3) {
  const max = Math.max(1, n(blood.max) || 10);
  let value = Math.min(max, n(blood.value) + Math.max(0, n(feed)));
  const fed = value - n(blood.value);
  const damage = {bashing: n(dmg.bashing), lethal: n(dmg.lethal), aggravated: n(dmg.aggravated)};
  let spent = 0;
  while ( value > 1 && (damage.lethal || damage.bashing) ) {
    if ( damage.lethal ) damage.lethal--; else damage.bashing--;
    value--; spent++;
  }
  return {fed, spent, damage, blood: value};
}

/* ---------------- a3: the rite of a faith ---------------- */

/**
 * The rite for a mortal's funeral by faith and year. faith: WoDX Chronicle's faith key; region: the world region.
 * -> {rite, words, within} within: how soon it is done, in hours (house readings of custom).
 */
export function riteFor(faith = "western", year = 1197, region = "") {
  if ( faith === "jewish" ) return {rite: "burial", words: "washed, wrapped in a plain shroud and buried before the next sunset", within: 24};
  if ( faith === "islamic" ) return {rite: "burial", words: "washed, wrapped and buried facing Mecca within the day", within: 24};
  if ( faith === "hindu" ) return {rite: "cremation", words: "burned on a pyre, the ashes given to the river", within: 24};
  if ( faith === "tibetan" ) return {rite: "sky", words: "given to the birds on the high ground after the prayers", within: 72};
  if ( faith === "theravada" ) return {rite: "cremation", words: "burned after the monks' chants", within: 72};
  if ( faith === "chinese" ) return {rite: "burial", words: "dressed, coffined and buried after the days of mourning, the family in white", within: 72};
  if ( faith === "own" ) return {rite: "barrow", words: "laid in the earth with grave goods by the old ways", within: 48};
  // the Western and Eastern churches: a wake, then burial in the churchyard; cremation from the twentieth century on
  if ( Number(year) >= 1960 && faith === "western" && /british|low-countries|german|nordic|scandinav|america|australia/.test(region) )
    return {rite: "cremation", words: "a service, then cremation, the ashes kept or scattered", within: 120};
  return {rite: "burial", words: faith === "orthodox" ? "watched over three days, then buried in the churchyard" : "watched over through the night, then buried in the churchyard", within: faith === "orthodox" ? 72 : 48};
}
export const RITE_WORDS = {burial: "Grave of", cremation: "Ashes of", sky: "Cairn of", barrow: "Barrow of"};

/* ---------------- a5: a dead enemy ---------------- */

/** How a dead foe's body goes, by who disposes of it. kind: the taker's (kindred, garou, mage, fae, mortal, ...). */
export function disposalFor(kind = "mortal", {lawful = false, water = false, year = 1197} = {}) {
  if ( kind === "mortal" || kind === "hunter" ) return lawful ? {how: "law", words: "handed over to the law"} : {how: "buried", words: "buried in an unmarked grave"};
  if ( kind === "garou" || kind === "lupine" ) return {how: "wilds", words: "carried deep into the wilds and left to the beasts"};
  if ( water ) return {how: "sunk", words: "weighted and sunk"};
  return Number(year) >= 1900 && kind === "kindred" ? {how: "burned", words: "burned to ash in a furnace"} : {how: "burned", words: "burned to ash"};
}

/* ---------------- a6: their things ---------------- */

const VALUABLE_TYPES = new Set(["Melee Weapon", "Ranged Weapon", "Armor", "Item", "Weapon", "Talisman", "Fetish", "Wonder", "melee", "ranged", "armor", "item", "weapon"]);
/** Which of a body's items the captors take: weapons, armour, gear and wonders (not powers, traits or features). */
export function lootable(items = []) {
  return (items ?? []).filter(i => i && VALUABLE_TYPES.has(String(i.type)) && !i.natural);
}

/* ---------------- a7 to a12: prisoners ---------------- */

/** Escape: successes needed against the bonds, kept from night to night (house); a botch starts them over. */
export const BONDS = 3;
export const ESCAPE_DIFF = 7;
/** The better pool for the bonds. stats: {dex, larceny, str, athletics}. */
export function escapePool(s = {}) {
  const a = n(s.dex) + n(s.larceny), b = n(s.str) + n(s.athletics);
  return a >= b ? {pool: a, words: "Dexterity + Larceny"} : {pool: b, words: "Strength + Athletics"};
}
/** One night's try at the bonds. progress: successes so far. -> {roll, progress, free, botch} */
export function tryBonds(progress, stats, rand = Math.random, {guarded = true} = {}) {
  const p = escapePool(stats);
  const r = roll(p.pool, ESCAPE_DIFF + (guarded ? 0 : -1), rand);
  const to = r.botch ? 0 : n(progress) + r.net;
  return {roll: r, words: p.words, progress: to, free: to >= BONDS, botch: r.botch};
}
/** Questioning pool: the better of Manipulation + Intimidation and a mind power (Dominate or Presence dots + Manipulation or Charisma). */
export function questionPool(c = {}) {
  const talk = n(c.manipulation) + n(c.intimidation);
  const power = Math.max(n(c.dominate) ? n(c.dominate) + n(c.manipulation) : 0, n(c.presence) ? n(c.presence) + n(c.charisma) : 0);
  return power > talk ? {pool: power, words: n(c.dominate) >= n(c.presence) ? "Dominate" : "Presence"} : {pool: talk, words: "Manipulation + Intimidation"};
}
/** Each success gives up one secret. -> {roll, secrets: [first n of the prisoner's not yet known]} */
export function question(captor, willpower, secrets = [], rand = Math.random) {
  const p = questionPool(captor);
  const r = roll(p.pool, Math.max(3, Math.min(10, n(willpower) || 5)), rand);
  return {roll: r, words: p.words, secrets: secrets.slice(0, r.net)};
}
/** a9: a Cainite captor feeds every other night, one or two points, while the prisoner has more than this many health levels left (house). */
export const FEED_EVERY = 2 * DAY;
export const FEED_KEEP = 3;
export function feedDraw({hunger = 0, healthLeft = 7, rand = Math.random} = {}) {
  if ( n(healthLeft) <= FEED_KEEP ) return 0;
  const want = Math.max(1, Math.min(2, n(hunger) || (rand() < 0.5 ? 1 : 2)));
  return Math.min(want, n(healthLeft) - FEED_KEEP);
}

/** a10: after a week the faction decides. */
export const FATES = {
  ransom: "ransomed to their people",
  trade: "traded for one of the captors' own",
  law: "handed over to the law",
  release: "let go",
  kill: "put to death (the Storyteller decides)"
};
/** Weights by the captors' kind: a house reading of each kind's temper. */
const TEMPER = {
  kindred: {ransom: 2, trade: 3, law: 0, release: 1, kill: 2},
  mortal: {ransom: 3, trade: 2, law: 3, release: 1, kill: 0.5},
  church: {ransom: 1, trade: 1, law: 4, release: 2, kill: 0.5},
  guild: {ransom: 4, trade: 2, law: 2, release: 1, kill: 0},
  folk: {ransom: 1, trade: 1, law: 3, release: 3, kill: 0.5},
  hunters: {ransom: 0, trade: 1, law: 2, release: 0.5, kill: 3},
  garou: {ransom: 0, trade: 2, law: 0, release: 2, kill: 2},
  mages: {ransom: 1, trade: 3, law: 0, release: 2, kill: 1},
  fae: {ransom: 2, trade: 3, law: 0, release: 2, kill: 0.5},
  spirits: {ransom: 0, trade: 2, law: 0, release: 3, kill: 1},
  mercenaries: {ransom: 5, trade: 2, law: 1, release: 0.5, kill: 1},
  other: {ransom: 2, trade: 2, law: 2, release: 2, kill: 0.5}
};
/**
 * The faction's choice. ctx: {kind, payer: can the prisoner's people pay (Resources), swap: a member of the captors
 * held by the prisoner's people, lawHere: there is a court to take them}. Choices that cannot be done drop out.
 */
export function decideFate({kind = "other", payer = false, swap = false, lawHere = true, pc = false} = {}, rand = Math.random) {
  const w = {...(TEMPER[kind] ?? TEMPER.other)};
  if ( !payer ) w.ransom = 0;
  if ( !swap ) w.trade = 0;
  if ( !lawHere ) w.law = 0;
  const list = Object.entries(w).filter(([, v]) => v > 0);
  const total = list.reduce((s, [, v]) => s + v, 0);
  let r = rand() * total;
  for ( const [k, v] of list ) { r -= v; if ( r < 0 ) return {fate: k, words: FATES[k], ask: k === "kill" || !!pc}; }
  return {fate: "release", words: FATES.release, ask: !!pc};
}

/** a11: the prisoner's faction comes for them: its Retainers (or Herd) and Wits 2 against 6 + the captors' Security. */
export function rescueTry({retainers = 0, herd = 0, security = 0, guard = false} = {}, rand = Math.random) {
  const pool = 2 + Math.max(n(retainers), n(herd));
  const r = roll(pool, 6 + n(security) + (guard ? 1 : 0), rand);
  return {roll: r, freed: r.net > 0, botch: r.botch};
}

/** Whole days and nights crossed between two world times (a long jump of the clock counts each, up to a cap). */
export function daysCrossed(from, to, cap = 14) {
  if ( !Number.isFinite(from) || !Number.isFinite(to) || to <= from ) return 0;
  return Math.min(cap, Math.floor(to / DAY) - Math.floor(from / DAY));
}

/** Health levels left on a track: max levels less the filled ones. */
export const healthLeft = (dmg = {}, max = 7) => Math.max(0, n(max) - (n(dmg.bashing) + n(dmg.lethal) + n(dmg.aggravated)));
