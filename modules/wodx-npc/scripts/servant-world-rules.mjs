/**
 * WoDX NPC (Servants and Bonds Desk, B5120-B5127): the pure rules for servants that the world makes by itself.
 *   Fomori: one to three of the powers WoDX Actions plays (W20 pp. 430-439), put on the sheet as Power items.
 *   Masters of the Wyrm: a Black Spiral hive or a Wyrm cult, or from 1900 Pentex.
 *   Mummy cults (Mummy: The Resurrection): at the mummy's death the cult guards the body; neglect thins the cult.
 *   NPC keepers (desk x4): what to recruit, from whom, with an undo record.
 * Nothing here copies book text.
 */
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export const PAGE = "W20 pp. 430-439";
/**
 * One to three different powers, picked by a die function (0 to 1), from the fomor powers WoDX Actions plays (its
 * fomor-powers.js list, B5610-B5619): a list of {key, name}. The Storyteller can change them on the sheet.
 */
export function pickPowers(list = [], rand = Math.random, count = null) {
  const k = count ?? (1 + Math.floor(Math.max(0, Math.min(0.999, rand())) * 3));
  const pool = [...(list ?? [])].filter(p => p?.key && p?.name), out = [];
  while ( out.length < k && pool.length ) out.push(pool.splice(Math.floor(Math.max(0, Math.min(0.999, rand())) * pool.length), 1)[0]);
  return out;
}
/** The Power items for the picks, named as WoDX Actions reads them, so its fomor window and always-on effects take them up. */
export function powerItems(powers = []) {
  return powers.map(p => ({
    name: p.name,
    type: "Power",
    img: "systems/worldofdarkness/assets/img/items/power_werewolf.svg",
    system: {type: "wod.types.power", game: "werewolf", level: 1, description: `<p>${p.fx ?? ""}</p><p><em>W20 p. ${p.p ?? "430"}</em></p>`},
    flags: {"wodx-npc": {fomori: p.key}}
  }));
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
/**
 * Pick recruits from unbound mortal NPCs near the master: on the master's own scene, or, for a master with no token
 * anywhere, from mortals with none either. Returns ids.
 */
export function recruits(pool = [], k = 0, {sceneId = null, taken = new Set()} = {}) {
  return pool.filter(p => p?.id && !taken.has(p.id) && (p.sceneId ?? null) === (sceneId ?? null)).slice(0, Math.max(0, k)).map(p => p.id);
}
/** The keeper turn runs once a month of world time. */
export const KEEPER_EVERY = 30 * 86400;
