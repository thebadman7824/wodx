/**
 * Creation totals and the two changes of state that keep the character (death into a wraith, the Awakening): the
 * pure part. No Foundry calls, so the tests use it directly. The books' numbers live in ../data/creation-totals.mjs.
 */
import {TOTALS} from "../data/creation-totals.mjs";

export {TOTALS};

const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const GROUPS = {attributes: ["physical", "social", "mental"], abilities: ["talent", "skill", "knowledge"]};
const LABEL = {physical: "Physical", social: "Social", mental: "Mental", talent: "Talents", skill: "Skills", knowledge: "Knowledges"};

/**
 * Match what a sheet has to the book's primary, secondary and tertiary allotments, in the way that costs the
 * fewest freebies: the group with the most dots takes the largest allotment.
 * @param {Record<string, number>} have  Dots per group
 * @param {number[]} allot              The book's three numbers, largest first
 */
export function assign(have, allot) {
  const keys = Object.keys(have).sort((a, b) => have[b] - have[a]);
  const sorted = [...allot].sort((a, b) => b - a);
  return keys.map((k, i) => ({group: k, have: n(have[k]), allowed: sorted[i] ?? 0, over: Math.max(0, n(have[k]) - (sorted[i] ?? 0)), under: Math.max(0, (sorted[i] ?? 0) - n(have[k]))}));
}

/**
 * Check a sheet against a book's creation totals.
 * @param {object} view
 * @param {Record<string, number>} view.attributes  Dots above the free 1, per group (physical, social, mental)
 * @param {Record<string, {dots: number, aboveCap: number}>} view.abilities  Per group: dots up to the cap, and dots past it
 * @param {number} view.backgrounds
 * @param {Record<string, number>} [view.powers]   Per power key (discipline, gift, sphere ...): dots, or items for Gifts
 * @param {number|null} [view.virtues]             Dots above the free ones, when the line has Virtues
 * @param {string} lineId
 * @returns {{line: object, rows: object[], freebies: {allowed: number, used: number, flaws: number, left: number}, ok: boolean}}
 */
export function checkCreation(view, lineId) {
  const line = TOTALS[lineId];
  if ( !line ) throw new Error(`No creation totals for ${lineId}`);
  const c = line.costs;
  const rb = line.rebirth ?? null;
  const rows = [];
  const add = (step, label, allowed, have, cost, note = "") => {
    const over = Math.max(0, have - allowed);
    rows.push({step, label, allowed, have, over, under: Math.max(0, allowed - have), cost: over * (cost ?? 0), note});
  };

  // Attributes: the Rebirth's 2 extra dots soak up overage wherever it falls
  let rebirthAttr = rb?.attributes ?? 0;
  for ( const r of assign(Object.fromEntries(GROUPS.attributes.map(g => [g, n(view.attributes?.[g])])), line.attributes) ) {
    const soak = Math.min(rebirthAttr, r.over);
    rebirthAttr -= soak;
    add("attributes", `${LABEL[r.group]} Attributes`, r.allowed + soak, r.have, c.attribute);
  }
  let rebirthAb = rb?.abilities ?? 0;
  const abil = Object.fromEntries(GROUPS.abilities.map(g => [g, view.abilities?.[g] ?? {dots: 0, aboveCap: 0}]));
  for ( const r of assign(Object.fromEntries(GROUPS.abilities.map(g => [g, n(abil[g].dots)])), line.abilities) ) {
    const soak = Math.min(rebirthAb, r.over);
    rebirthAb -= soak;
    add("abilities", LABEL[r.group], r.allowed + soak, r.have, c.ability);
  }
  const past = GROUPS.abilities.reduce((s, g) => s + n(abil[g].aboveCap), 0);
  if ( past ) {
    // Dots past the cap are bought with freebies, or (Mummy) with the Rebirth's dots
    const soak = Math.min(rebirthAb, past);
    rebirthAb -= soak;
    add("abilities", `Ability dots above ${line.abilityCap}`, soak, past, c.ability, `No Ability above ${line.abilityCap} before freebies.`);
  }
  add("backgrounds", "Backgrounds", line.backgrounds + (rb?.backgrounds ?? 0), n(view.backgrounds), c.background);
  for ( const p of line.powers ?? [] ) {
    const have = view.powers?.[p.key];
    if ( have === undefined || have === null ) { rows.push({step: "powers", label: p.label, allowed: p.dots, have: null, over: 0, under: 0, cost: 0, note: `Count by hand. ${p.note ?? ""}`.trim()}); continue; }
    add("powers", p.label, p.dots, n(have), c[p.key], p.note ?? "");
  }
  if ( line.virtues !== undefined && view.virtues !== null && view.virtues !== undefined ) add("virtues", "Virtues", line.virtues, n(view.virtues), c.virtue);

  const allowed = line.freebies + (rb?.freebies ?? 0);
  const used = rows.reduce((s, r) => s + r.cost, 0);
  return {line, rows, freebies: {allowed, used, flaws: line.flaws ?? 0, left: allowed - used}, ok: used <= allowed + (line.flaws ?? 0)};
}

/* -------------------------------------------- */
/*  Death into a wraith (Wraith 20)              */
/* -------------------------------------------- */

/** Successes on a roll: dice at or above the difficulty. Ones cancel unless `onesCancel` is false. */
export function successes(dice, difficulty, {onesCancel = true} = {}) {
  const hits = dice.filter(d => d >= difficulty).length;
  return onesCancel ? hits - dice.filter(d => d === 1).length : hits;
}

/**
 * Starting permanent Angst: roll Willpower at difficulty 6, ones do not cancel; at least 1, never above
 * permanent Willpower (Wr20 pdf 295 / printed 230).
 */
export function angstFrom(dice, willpower) {
  return Math.min(Math.max(1, successes(dice, 6, {onesCancel: false})), Math.max(1, n(willpower)));
}

/** Pathos to start: 5 + Memoriam, 10 at most (Wr20 pdf 179 / printed 114). */
export const pathosStart = memoriam => Math.min(10, 5 + n(memoriam));

/**
 * The new wraith's traits from the dying mortal's. House rule: Attributes, Abilities and the mortal's life carry over;
 * Willpower is the higher of the mortal's and the wraith's starting 5; Corpus 10 and Pathos 5 + Memoriam are fresh.
 * The Arcanoi, Passions, Fetters and wraith Backgrounds are left for the player to spend (5, 10, 10 and 7).
 */
export function wraithStart({willpower = 0, memoriam = 0} = {}) {
  return {corpus: 10, pathos: pathosStart(memoriam), willpower: Math.min(10, Math.max(5, n(willpower))),
    toSpend: {arcanoi: 5, passions: 10, fetters: 10, backgrounds: 7, darkPassions: 7, shadowFreebies: 10}};
}

/**
 * Leaving the Caul (Wr20 pdf 345–347 / printed 280–282).
 * self: spend 1 Willpower, roll Willpower at difficulty 4; each success is 1 extra Pathos, past 10 if need be.
 * reaper: the Reaper rolls Charisma + Empathy at difficulty 9 − the Enfant's Memoriam (2 at the least).
 * harvest: torn off; no cost on the sheet.
 */
export function caul(way, {dice = [], memoriam = 0} = {}) {
  if ( way === "self" ) { const s = Math.max(0, successes(dice, 4)); return {way, difficulty: 4, successes: s, extraPathos: s, willpowerSpent: 1, freed: s > 0}; }
  if ( way === "reaper" ) {
    const difficulty = Math.max(2, 9 - n(memoriam));
    const s = successes(dice, difficulty);
    return {way, difficulty, successes: Math.max(0, s), extraPathos: 0, reaperPathos: s > 0 ? n(memoriam) + 2 : 0, freed: s > 0};
  }
  return {way: "harvest", extraPathos: 0, freed: true};
}

/* -------------------------------------------- */
/*  The Awakening (M20)                          */
/* -------------------------------------------- */

export const SPHERES = ["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"];

/**
 * A Sleeper Awakens in play. House rule: Attributes, Abilities and Backgrounds stay; Arete 1, one dot in the Affinity
 * Sphere and Avatar 1 if the character has none; Quintessence = Avatar, Paradox 0; Willpower is left as it is, and
 * while it is below Arete it caps Sphere ranks and casting dice (M20 pdf 330 / printed 329).
 */
export function awakenStart({willpower = 0, avatar = 0, affinity} = {}) {
  if ( !SPHERES.includes(affinity) ) throw new Error(`Pick an Affinity Sphere: ${SPHERES.join(", ")}`);
  const av = Math.max(1, n(avatar));
  const wp = n(willpower);
  return {arete: 1, spheres: {[affinity]: 1}, affinity, avatar: av, addAvatar: n(avatar) < 1, quintessence: av, paradox: 0, willpower: wp,
    willpowerCap: wp < 1, toSpend: {note: "Later Spheres and Arete come from experience; each Arete dot needs a Seeking first."}};
}
