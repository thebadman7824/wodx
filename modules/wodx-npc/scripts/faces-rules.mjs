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

/* ------------------------------------------------------------------ */
/*  0.33.0 (B1382): the stranger's words in chat and the combat tracker */
/* ------------------------------------------------------------------ */

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The names this player should not see yet, with what to show instead. people: [{name, flags, playerOwned}];
 * own: the names of the player's own characters (never hidden). Longest names first, so "Anna Weber" goes before "Anna".
 */
export function swapsFor({people = [], mine = [], gm = false, on = true, own = []} = {}) {
  if ( gm || !on ) return [];
  const keep = new Set((own ?? []).map(n => String(n ?? "").trim().toLowerCase()));
  const out = new Map();
  for ( const p of people ?? [] ) {
    const name = String(p?.name ?? "").trim();
    if ( name.length < 2 || keep.has(name.toLowerCase()) || out.has(name) ) continue;
    const as = nameFor({name, flags: p.flags ?? {}, mine, gm, on, playerOwned: !!p.playerOwned});
    if ( as !== name ) out.set(name, as);
  }
  return [...out].map(([name, as]) => ({name, as})).sort((a, b) => b.name.length - a.name.length);
}

/** A piece of text with each hidden name, as a whole word, swapped for the stranger's words (capitalised at the start). */
export function maskText(text, swaps = []) {
  let s = String(text ?? "");
  for ( const {name, as} of swaps ?? [] ) {
    if ( !name ) continue;
    s = s.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escRe(name)}(?=$|[^\\p{L}\\p{N}])`, "gu"), (m, pre, at) => `${pre}${at === 0 && !pre ? as.charAt(0).toUpperCase() + as.slice(1) : as}`);
  }
  return s;
}
