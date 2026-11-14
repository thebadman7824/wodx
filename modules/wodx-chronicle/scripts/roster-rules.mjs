/**
 * A roster of characters for each player (B3534 to B3536), the pure part. Every character a player owns, with the tie
 * the books use for it and its state, so the player can switch to another when the main one falls into torpor, dies
 * or is away. No Foundry here.
 *
 *   tieOf(a)     the tie: main, ghoul, Kinfolk, retainer, apprentice, thrall, follower or ally
 *   stateOf(a)   awake, torpor, dead or away
 *   roster(...)  the list for one player, main first, then the playable, then the rest
 *   needsPick()  whether a change to the played character should prompt for another
 */

export const TIES = {
  main: "Main character", ghoul: "Ghoul", kinfolk: "Kinfolk", retainer: "Retainer", apprentice: "Apprentice",
  thrall: "Thrall", follower: "Follower", ally: "Ally"
};
export const STATES = {awake: "Awake", torpor: "In torpor", dead: "Dead", away: "Away"};
export const PLAYABLE = ["awake"];

const low = v => String(v ?? "").toLowerCase();

/**
 * The tie, from a plain record: {main, ghoul, kinfolk, role (the main character's tie role for it, from the sheet's
 * ties), type}. The sheet's own role words win where they name one of the book ties.
 */
export function tieOf(a = {}) {
  if ( a.main ) return "main";
  const r = low(a.role);
  if ( a.ghoul || /ghoul|revenant/.test(r) ) return "ghoul";
  if ( a.kinfolk || /kinfolk|kin\b/.test(r) ) return "kinfolk";
  if ( /thrall/.test(r) ) return "thrall";
  if ( /apprentice|student|acolyte|pupil/.test(r) ) return "apprentice";
  if ( /retainer|servant|squire|bodyguard/.test(r) ) return "retainer";
  if ( /follower|cultist|minion/.test(r) ) return "follower";
  return "ally";
}

/** The state, from {died, torpor, away}: dead wins over torpor, torpor over away. */
export function stateOf(a = {}) {
  if ( a.died !== undefined && a.died !== null && a.died !== false ) return "dead";
  if ( a.torpor ) return "torpor";
  if ( a.away ) return "away";
  return "awake";
}

/** The roster: [{id, name, tie, state, playable}], main first, then the playable, then by name. */
export function roster(list = [], mainId = null) {
  const order = {awake: 0, away: 1, torpor: 2, dead: 3};
  return (list ?? []).filter(a => a?.id).map(a => {
    const tie = tieOf({...a, main: a.id === mainId});
    const state = stateOf(a);
    return {id: a.id, name: String(a.name ?? ""), tie, tieLabel: TIES[tie], state, stateLabel: STATES[state], playable: PLAYABLE.includes(state)};
  }).sort((x, y) => (x.tie === "main" ? -1 : y.tie === "main" ? 1 : 0) || (order[x.state] - order[y.state]) || x.name.localeCompare(y.name));
}

/** A change that should prompt the player to pick another: the played character's state left "awake". */
export function needsPick(before = "awake", after = "awake") {
  return before === "awake" && after !== "awake";
}

/** The others the player could switch to now. */
export const others = (list, id) => list.filter(r => r.id !== id && r.playable);
