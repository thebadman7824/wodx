/**
 * WoDX NPC 0.7.0: faces you have met. Pure rules, harness-tested.
 *
 * With the world setting on, a token of someone the Storyteller plays shows each player a short description ("a tall
 * stranger in grey") instead of the name, until one of that player's characters has been introduced. The Storyteller
 * introduces from the token's HUD. The list is kept on the actor: flags.wodx-npc.metBy (player character ids) and
 * flags.wodx-npc.stranger (the description). The Storyteller always sees the name.
 */

export const DEFAULT_STRANGER = "A stranger";

const ids = v => (Array.isArray(v) ? v : []).map(x => String(x ?? "")).filter(x => /^[A-Za-z0-9]{1,32}$/.test(x));

/** The met list, cleaned. */
export const metList = flags => [...new Set(ids(flags?.metBy))];

/** Does a player know this face? mine: the ids of that player's characters. */
export function knows(flags, mine = []) {
  const met = new Set(metList(flags));
  return (mine ?? []).some(id => met.has(id));
}

/** The words a player sees on the token. */
export function nameFor({name = "", flags = {}, mine = [], gm = false, on = true, playerOwned = false} = {}) {
  if ( gm || !on || playerOwned ) return name;
  if ( knows(flags, mine) ) return name;
  const s = String(flags?.stranger ?? "").trim().slice(0, 80);
  return s || DEFAULT_STRANGER;
}

/** The met list after introducing some characters (add) or making them forget (remove). */
export function introduce(flags, add = [], remove = []) {
  const out = new Set(metList(flags));
  for ( const id of ids(add) ) out.add(id);
  for ( const id of ids(remove) ) out.delete(id);
  return [...out];
}
