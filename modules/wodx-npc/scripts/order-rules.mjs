/**
 * WoDX NPC 0.8.0: followers who take orders. No Foundry calls here.
 *
 * A follower is an NPC with no player owner who serves one or more player characters (flags.wodx-npc.serves, set by
 * the Storyteller): a ghoul, a retainer, Kinfolk, an ally, a bound spirit. A player gives it a short order from the
 * map. An everyday order is carried out at once; a hard order (dangerous, or against its nature) waits for the
 * Storyteller, who weighs the bond and loyalty (Retainers and Allies as the line's book rates them; a blood bond).
 */

export const ORDERS = {
  follow: {label: "Follow me", hint: "Keeps beside the character who gave the order, on this scene."},
  wait: {label: "Wait here", hint: "Stays where it stands until told otherwise."},
  guard: {label: "Guard this place", hint: "Stays here and stands in the way of anyone who comes."},
  watch: {label: "Keep watch", hint: "Stays here and raises the alarm when it notices someone."},
  fetch: {label: "Go to the one I point at", hint: "Walks to the targeted token, then comes back and follows. What it brings or says is the Storyteller's."}
};
/** Orders that stop the NPC's routine while they hold. */
export const HOLDS = new Set(["follow", "wait", "guard", "watch", "fetch"]);

/** Normalise a stored order. */
export function normOrder(o = {}) {
  if ( !o || !ORDERS[o.kind] ) return null;
  return {kind: o.kind, by: String(o.by ?? ""), leader: String(o.leader ?? ""), target: o.target ? String(o.target) : null,
    at: Number(o.at) || 0, hard: !!o.hard, note: String(o.note ?? "").slice(0, 200), stage: o.stage === "back" ? "back" : "out"};
}

/** May a user order this NPC? It must have no player owner and serve a character the user owns (the Storyteller always may). */
export function canOrder({isGM = false, npcHasPlayerOwner = false, serves = [], ownedActorIds = []} = {}) {
  if ( npcHasPlayerOwner ) return {ok: false, why: "A character with a player is moved by that player."};
  if ( isGM ) return {ok: true};
  const own = new Set(ownedActorIds);
  if ( !(serves ?? []).some(id => own.has(id)) ) return {ok: false, why: "It does not serve any of your characters."};
  return {ok: true};
}

/** The leader for an order: the character the user picked if it is one the NPC serves, else the first one it serves that the user owns. */
export function leaderFor({picked = null, serves = [], ownedActorIds = [], isGM = false} = {}) {
  if ( picked && (isGM || (serves.includes(picked) && ownedActorIds.includes(picked))) ) return picked;
  return serves.find(id => ownedActorIds.includes(id)) ?? (isGM ? picked ?? serves[0] ?? null : null);
}

/**
 * Where a follower should stand: the free cell beside the leader nearest the follower. Null when it is already
 * beside the leader (within one cell), or no cell is free.
 */
export function followCell(leader, follower, beside, isFree) {
  const di = Math.abs(leader.i - follower.i), dj = Math.abs(leader.j - follower.j);
  if ( Math.max(di, dj) <= 1 && !(di === 0 && dj === 0) ) return null;
  for ( const c of beside ) if ( isFree(c) ) return c;
  return null;
}

export function describeOrder(o, names = {}) {
  const n = normOrder(o);
  if ( !n ) return "No order";
  const who = names[n.leader] ?? "its master";
  return {follow: `Following ${who}`, wait: "Waiting", guard: "Guarding", watch: "Keeping watch",
    fetch: n.stage === "back" ? `Coming back to ${who}` : `Going to ${names[n.target] ?? "the one pointed at"}`}[n.kind] + (n.hard ? " (a hard order)" : "");
}
