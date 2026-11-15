/**
 * WoDX NPC (Servants and Bonds Desk, B5120-B5127): the pure rules for servants that the world makes by itself.
 *   Fomori (W20 pdf pp. 431-434): one to three powers, in WoDX's own words, each a rollable item where the book rolls.
 *   Masters of the Wyrm: a Black Spiral hive or a Wyrm cult, or from 1900 Pentex.
 *   Mummy cults (Mummy: The Resurrection): at the mummy's death the cult guards the body; neglect thins the cult.
 *   NPC keepers (desk x4): what to recruit, from whom, with an undo record.
 * Nothing here copies book text.
 */
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export const PAGE = "W20 pdf pp. 431-434";
/** Fomori powers. roll: [attribute, ability, difficulty] when the book rolls; sheet: what WoDX sets on the sheet. */
export const FOMORI = [
  {k: "animalControl", n: "Animal Control", e: "A cry only beasts hear calls the sickliest animals nearby to obey simple orders for a scene; a Willpower point.", roll: ["manipulation", "animalken", 6]},
  {k: "armoredHide", n: "Armored Hide", e: "Hide, scales or slime that turns blows: three more soak dice, and aggravated damage can be soaked at 8."},
  {k: "armoredSkin", n: "Armored Skin", e: "Lethal wounds are soaked and heal as if bashing.", sheet: "lethalSoak"},
  {k: "berserker", n: "Berserker", e: "Five points of Rage to spend like a Garou, and the frenzy that comes with them.", sheet: "rage"},
  {k: "bestialMutation", n: "Bestial Mutation", e: "A shift into a nightmare beast-shape that no one would mistake for a natural creature."},
  {k: "bodyBarbs", n: "Body-Barbs", e: "Razor growths that wound anyone who grapples or strikes bare-handed."},
  {k: "bodyExpansion", n: "Body Expansion", e: "Limbs that stretch yards beyond their reach."},
  {k: "brainEating", n: "Brain Eating", e: "Eating a victim's brain dulls a Mental trait for a time.", roll: ["intelligence", "occult", 7]},
  {k: "causeInsanity", n: "Cause Insanity", e: "A touch or a stare twists the victim's mind into a derangement for a time.", roll: ["manipulation", "intimidation", 7]},
  {k: "chameleon", n: "Chameleon Coloration", e: "Skin that takes the colours behind it; very hard to see when still.", roll: ["dexterity", "stealth", 5]},
  {k: "clawsFangs", n: "Claws and Fangs", e: "Natural weapons that deal Strength + 1 aggravated damage."},
  {k: "darksight", n: "Darksight", e: "Sight in total darkness."},
  {k: "deception", n: "Deception", e: "The fomor's Wyrm taint hides from senses that look for it."},
  {k: "echoesWrath", n: "Echoes of Wrath", e: "Stirs anger in those nearby until fights break out.", roll: ["manipulation", "empathy", 7]},
  {k: "extraLimbs", n: "Extra Limbs", e: "One or more extra limbs: an extra action with them each turn."},
  {k: "extraSpeed", n: "Extra Speed", e: "Runs faster than any human: double running speed."},
  {k: "eyesWyrm", n: "Eyes of the Wyrm", e: "A gaze that holds the onlooker frozen in place.", roll: ["charisma", "intimidation", 7]}
];
/** One to three powers, picked by a die function (0 to 1). A fireman leans to fire, a soldier to armour: the Storyteller can change them. */
export function pickPowers(rand = Math.random, count = null) {
  const k = count ?? (1 + Math.floor(Math.max(0, Math.min(0.999, rand())) * 3));
  const pool = [...FOMORI], out = [];
  while ( out.length < k && pool.length ) out.push(pool.splice(Math.floor(Math.max(0, Math.min(0.999, rand())) * pool.length), 1)[0]);
  return out;
}
/** The items a fomor's powers put on the sheet. */
export function powerItems(powers = []) {
  return powers.map(p => ({
    name: `Fomori power: ${p.n}`,
    type: "Power",
    img: "systems/worldofdarkness/assets/img/items/power_werewolf.svg",
    system: {type: "wod.types.power", game: "werewolf", level: 1, ...(p.roll ? {dice1: p.roll[0], dice2: p.roll[1], difficulty: p.roll[2]} : {}),
      description: `<p>${p.e}</p><p><em>${PAGE}</em></p>`, reference: PAGE},
    flags: {"wodx-npc": {fomori: p.k}}
  }));
}
/** Sheet changes from the powers: Rage 5 for Berserker, lethal soak for Armored Skin. */
export function powerSheet(powers = []) {
  const upd = {};
  if ( powers.some(p => p.sheet === "rage") ) { upd["system.advantages.rage.permanent"] = 5; upd["system.advantages.rage.temporary"] = 5; }
  if ( powers.some(p => p.sheet === "lethalSoak") ) upd["system.settings.soak.lethal.isrollable"] = true;
  return upd;
}
/**
 * Who a new fomor serves: candidates [{id, kind: "spiral" | "cult" | "pentex", sceneId, name}]. The one on the fomor's own
 * scene first, then any; Pentex only from 1900. Null when none fits.
 */
export function wyrmMaster(cands = [], {year = 1197, sceneId = null} = {}) {
  const ok = cands.filter(c => c?.id && (c.kind !== "pentex" || num(year) >= 1900));
  const rank = c => (c.sceneId && c.sceneId === sceneId ? 0 : 10) + ({spiral: 0, cult: 1, pentex: 2}[c.kind] ?? 3);
  return ok.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/* -- Mummy cults --------------------------------------------------- */
/** A cult left untended this long (weeks) loses a step; mistreated it may turn. House reading. */
export const CULT_NEGLECT_WEEKS = 12;
export function cultDrift({step = 1, last = 0} = {}, now = 0, {mistreated = false} = {}) {
  const weeks = Math.floor((num(now) - num(last)) / (7 * 86400));
  if ( mistreated ) return {step: 0, why: "mistreated, the cult turns on its master", betray: true};
  if ( weeks >= CULT_NEGLECT_WEEKS && num(step) > 0 ) return {step: num(step) - 1, why: `${weeks} weeks untended: the cult thins`, betray: false};
  return {step: num(step), why: "", betray: false};
}

/* -- NPC keepers --------------------------------------------------- */
/** The line words keepers use, from an actor type. */
export const LINE_OF_TYPE = {Vampire: "vampire", Mage: "mage", Werewolf: "werewolf", Demon: "demon", Wraith: "wraith", Mummy: "mummy", Changeling: "changeling"};
/** How many more of a row a master needs: the target count, less what it already keeps of that kind. */
export const shortfall = (target, have) => Math.max(0, num(target) - num(have));
/** Pick recruits from unbound mortal NPCs, nearest first (same scene). Returns ids. */
export function recruits(pool = [], k = 0, {sceneId = null, taken = new Set()} = {}) {
  return pool.filter(p => p?.id && !taken.has(p.id)).sort((a, b) => (a.sceneId === sceneId ? 0 : 1) - (b.sceneId === sceneId ? 0 : 1)).slice(0, Math.max(0, k)).map(p => p.id);
}
/** The keeper turn runs once a month of world time. */
export const KEEPER_EVERY = 30 * 86400;
