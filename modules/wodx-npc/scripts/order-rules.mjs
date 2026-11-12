/**
 * WoDX NPC 0.8.0: followers who take orders. No Foundry calls here. NPC 0.34.0 adds one tie read from four places,
 * hard orders WoDX spots itself, a suggested loyalty roll, and sentries (the end of this file).
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
  fetch: {label: "Go to the one I point at", hint: "Walks to the targeted token, then comes back and follows. What it brings or says is the Storyteller's."},
  // NPC 0.34.0 (B1604): orders for a fight
  attack: {label: "Attack the one I point at", hint: "In a fight it goes for the targeted token first, unless fear or its wounds drive it off."},
  holdback: {label: "Hold back", hint: "In a fight it keeps out of the blows: it dodges and blocks, and strikes no one."}
};
/** Orders that stop the NPC's routine while they hold. */
export const HOLDS = new Set(["follow", "wait", "guard", "watch", "fetch", "attack", "holdback"]);
/** Orders that need a targeted token. */
export const NEEDS_TARGET = new Set(["fetch", "attack"]);

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
  return {follow: `Following ${who}`, wait: "Waiting", guard: "Guarding", watch: "Keeping watch", attack: `Ordered to attack ${names[n.target] ?? "the one pointed at"}`, holdback: "Holding back",
    fetch: n.stage === "back" ? `Coming back to ${who}` : `Going to ${names[n.target] ?? "the one pointed at"}`}[n.kind] + (n.hard ? " (a hard order)" : "");
}

/* ---------------- NPC 0.34.0: one tie, hard orders, sentries (B1600-B1604) ---------------- */

const idOf = v => (v && typeof v === "object" ? v.id : v) ? String(v && typeof v === "object" ? v.id : v) : null;

/**
 * Every character an NPC serves, from any of the four ties WoDX keeps (B1600): the old orders flag
 * (wodx-npc.serves), a background made real (wodx-chronicle.bound.actor), a ghoul's domitor
 * (wodx-creation.lineage.domitor, stored as {id, name}) and a Creation ally's patron (wodx-creation.ally.patron).
 * flags: the actor's flags object. Nothing is migrated: each tie stays where its module keeps it.
 */
export function servesFrom(flags = {}) {
  const f = flags ?? {};
  const out = [];
  const add = v => { const id = idOf(v); if ( id && !out.includes(id) ) out.push(id); };
  for ( const v of Array.isArray(f["wodx-npc"]?.serves) ? f["wodx-npc"].serves : [] ) add(v);
  add(f["wodx-chronicle"]?.bound?.actor);
  add(f["wodx-creation"]?.lineage?.domitor);
  add(f["wodx-creation"]?.ally?.patron);
  return out;
}

/**
 * Why WoDX counts an order as hard even when the player did not tick it (B1601). Returns reasons, empty for an
 * everyday order. inFight: a started fight on the scene; target: {hostile, obvious} for the one pointed at.
 */
export function hardReasons({kind = "", inFight = false, target = null} = {}) {
  const r = [];
  if ( inFight && kind === "fetch" ) r.push("it is sent across a fight");
  if ( kind === "fetch" && target?.hostile ) r.push("it is sent to someone hostile");
  if ( (kind === "fetch" || kind === "attack") && target?.obvious ) r.push("it is sent against something plainly not human");
  if ( kind === "attack" && !inFight ) r.push("it is told to start a fight");
  return r;
}

/**
 * NPC 0.34.0 (B1604): the fight AI's options with the follower's standing order laid over them. options: from
 * npc-rules scoreOptions (best first). Attack the one I point at: +5 on striking that token. Hold back: no blows,
 * a full defence instead. Guard and Wait: less ready to run. Fear, frenzy and Rötschreck, which the caller adds
 * after, still win. Returns a new list, best first.
 */
export function fightShift(options = [], order = null) {
  const o = normOrder(order);
  if ( !o ) return options;
  const STRIKE = new Set(["attack", "shoot", "power", "willpower"]);
  let out = options.map(x => ({...x}));
  if ( o.kind === "attack" ) for ( const x of out ) if ( (x.action === "attack" || x.action === "shoot") && x.target === o.target ) { x.score += 5; x.why = `ordered to attack this one; ${x.why}`; }
  if ( o.kind === "holdback" ) {
    for ( const x of out ) if ( STRIKE.has(x.action) ) { x.score -= 6; x.why = `ordered to hold back; ${x.why}`; }
    if ( !out.some(x => x.action === "defend") ) out.push({action: "defend", score: 3, why: "ordered to hold back: dodges and blocks all turn"});
  }
  if ( o.kind === "guard" || o.kind === "wait" ) for ( const x of out ) if ( x.action === "flee" ) { x.score -= 2; x.why = `${x.why}; ordered to stand`; }
  out = out.sort((a, b) => b.score - a.score).map(x => ({...x, score: Math.round(x.score * 10) / 10}));
  return out;
}

/**
 * The roll WoDX suggests when the Storyteller weighs a hard order (B1602, house rule). A ghoul blood bound to the
 * one giving the order obeys (V20 blood bond); it may try to refuse only an order that means near-certain death,
 * at Willpower difficulty 8. Anyone else refuses on any success of Willpower at 6, plus its attitude step toward
 * the leader and its bond stage, held to 4-9.
 */
export function loyaltyCheck({bondStage = 0, step = 0, willpower = 3} = {}) {
  const wp = Math.max(1, Math.trunc(Number(willpower) || 1));
  const b = Math.max(0, Math.min(3, Math.trunc(Number(bondStage) || 0)));
  if ( b >= 3 ) return {pool: wp, diff: 8, bound: true, text: `Blood bound: it obeys. Only if the order means near-certain death may it try to refuse: Willpower ${wp}, difficulty 8.`};
  const diff = Math.max(4, Math.min(9, 6 + Math.round(Number(step) || 0) + b));
  return {pool: wp, diff, bound: false, text: `To refuse, it rolls Willpower ${wp} at difficulty ${diff}; any success and it balks.`};
}

/** Who a sentry cares about: anyone moving who is not a player's character, not itself and not another follower of the same master. */
export function isIntruder({self = false, pc = false, passerby = false, sharesMaster = false, down = false} = {}) {
  return !self && !pc && !passerby && !sharesMaster && !down;
}
export const GUARD_YARDS = 10;
/** What a sentry does once it notices someone (B1603): Keep watch warns its master; Guard steps into the way of anyone close. */
export function sentryAct(kind, {noticed = false, yards = null} = {}) {
  if ( !noticed ) return null;
  if ( kind === "watch" ) return "alarm";
  if ( kind === "guard" ) return yards === null || yards <= GUARD_YARDS ? "challenge" : "alarm";
  return null;
}
