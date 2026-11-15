/**
 * WoDX NPC (NPC Motives Desk r1, B5687): a Kindred or Kuei-jin NPC's hours out hunting end in a meal, or in hunger.
 * The pure part; routines.mjs reads the map and the sheet, and factions.mjs rolls the hunt.
 *
 * Book basis (in WoDX's own words; printed pages):
 *   Hunting is a roll for each hour spent at it, Attribute + Ability by the way the hunter goes about it, against the
 *   hunting ground's difficulty; a success finds a vessel and the vampire may take what it wants, or the Storyteller may
 *   give it one die's worth of blood; a failure loses the hour; a botch is a complication (V20 pp. 259-260; V20 Dark
 *   Ages p. 334). The Kuei-jin take Chi from breath or blood
 *   instead of the blood itself (Kindred of the East, the Chi pools).
 * WoDX readings: the hunt is rolled once, at the end of the block; an NPC takes one die's worth (the books' Storyteller
 * option, so an NPC never empties a town in a night); a hungry NPC is bolder and quicker to frenzy until it feeds.
 */

/** The ways to hunt, as the hunting window lists them (factions.mjs METHODS). */
export const HUNT_METHODS = ["wits+streetwise", "appearance+subterfuge", "manipulation+persuasion", "charisma+empathy", "dexterity+stealth", "stamina+athletics"];
/** How much bolder a hungry NPC is, on the reaction and fight dials (WoDX reading). */
export const HUNGRY = {aggression: 0.5, hunger: 1};
/** A hungry NPC stays hungry for this long without a meal, then the Storyteller's sheet is the truth again. */
export const HUNGRY_KEEP = 3 * 24 * 3600;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * What an NPC feeds: "blood" (a vampire's blood pool), "chi" (a Kuei-jin's Yang Chi) or null (it does not hunt to feed).
 * sheet: {type, bloodMax, yangMax}
 */
export function feedsOn(sheet = {}) {
  if ( num(sheet.yangMax) > 0 ) return "chi";
  if ( sheet.type === "Vampire" && num(sheet.bloodMax) > 0 ) return "blood";
  return null;
}

/** Did a block of hunting just end? prev: the NPC's last where flag; next: the new block (or null). */
export const huntEnded = (prev = {}, next = null) => prev?.activity === "hunt" && (next?.activity ?? null) !== "hunt" && !!prev.place;

/** Hours spent at the hunt, from when the block began to now: 1 to 8 (the hunting window's own cap). */
export const huntHours = (since, now) => Math.max(1, Math.min(8, Math.round((num(now) - num(since)) / 3600) || 1));

/** The NPC's best way to hunt from its pools: {method: dice}. Ties keep the list's order; none known is stalking. */
export function bestMethod(pools = {}) {
  let best = "wits+streetwise", n = -1;
  for ( const m of HUNT_METHODS ) if ( num(pools[m]) > n ) { n = num(pools[m]); best = m; }
  return best;
}

/** What one meal puts back: one die's worth, never past the pool's top. {taken, after} */
export function meal({now = 0, max = 0} = {}, die = 0) {
  const room = Math.max(0, num(max) - num(now));
  const taken = Math.max(0, Math.min(room, Math.round(num(die))));
  return {taken, after: num(now) + taken};
}

/** Is a hunger mark still in force at now? */
export const isHungry = (mark, now) => !!mark && num(now) - num(mark.since) < HUNGRY_KEEP;

/** A hungry NPC's profile: bolder, hungrier and prone to frenzy until it feeds. */
export function withHunger(profile = {}, hungry = false) {
  if ( !hungry ) return profile;
  return {...profile, aggression: num(profile.aggression) + HUNGRY.aggression, hunger: num(profile.hunger) + HUNGRY.hunger, frenzyProne: true};
}

/**
 * Someone on the map to lead aside instead of the roll ("as players can"): a passer-by (a person; an animal only
 * when the hunter is a vampire and nothing better walks by), else a lone mortal townsperson no one else is near.
 * candidates: [{id, passerby: bool, animal: bool, mortal: bool, player: bool, alone: bool}]; returns an id or null.
 */
export function preyOnMap(candidates = [], feeds = "blood") {
  const ok = c => !c.player && (c.mortal || c.passerby);
  const people = candidates.filter(c => ok(c) && !c.animal);
  const pick = people.find(c => c.passerby) ?? people.find(c => c.alone)
    ?? (feeds === "blood" ? candidates.find(c => ok(c) && c.animal && c.passerby) : null);
  return pick?.id ?? null;
}

/** The talk a botched hunt starts (a small breach with a witness). */
export function botchTale(name = "", feeds = "blood") {
  return feeds === "chi" ? `Someone saw ${name || "a stranger"} bent over a sleeper, breathing in their breath, and ran`
    : `Someone saw ${name || "a stranger"} at a throat in the dark, and ran`;
}
