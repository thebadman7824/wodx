/**
 * WoDX NPC 0.8.0: followers who take orders. No Foundry calls here. NPC 0.37.0 adds one tie read from four places,
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
  // NPC 0.37.0 (B1804): orders for a fight
  attack: {label: "Attack the one I point at", hint: "In a fight it goes for the targeted token first, unless fear or its wounds drive it off."},
  holdback: {label: "Hold back", hint: "In a fight it keeps out of the blows: it dodges and blocks, and strikes no one."},
  // NPC 0.37.0 (B1810-B1815): orders away from the map and beside it
  errand: {label: "Go and do this (an errand)", hint: "It leaves the scene and works at it over the clock as a long task with its own dice; the result comes back on a card."},
  help: {label: "Help me with a long task", hint: "It adds its own dots in the task's Ability to the dice of one of your long tasks until told otherwise."},
  cleanup: {label: "Deal with that witness", hint: "It talks round the targeted witness of a breach: Manipulation + Subterfuge, difficulty 6."},
  cutoff: {label: "Cut them off", hint: "If the targeted token runs, it joins the chase after them."}
};
/** Orders that stop the NPC's routine while they hold. */
export const HOLDS = new Set(["follow", "wait", "guard", "watch", "fetch", "attack", "holdback", "errand", "help", "cleanup", "cutoff"]);
/** Orders that need a targeted token. */
export const NEEDS_TARGET = new Set(["fetch", "attack", "cleanup", "cutoff"]);

/** Normalise a stored order. */
export function normOrder(o = {}) {
  if ( !o || !ORDERS[o.kind] ) return null;
  return {kind: o.kind, by: String(o.by ?? ""), leader: String(o.leader ?? ""), target: o.target ? String(o.target) : null,
    at: Number(o.at) || 0, hard: !!o.hard, note: String(o.note ?? "").slice(0, 200), stage: o.stage === "back" ? "back" : "out",
    errand: ERRANDS[o.errand] ? o.errand : null, task: o.task ? String(o.task) : null, cost: Math.max(0, Math.round(Number(o.cost) || 0))};
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
    errand: `Away on an errand: ${(ERRANDS[n.errand]?.label ?? "an errand").toLowerCase()}`, help: `Helping ${who} with a long task`,
    cleanup: `Dealing with ${names[n.target] ?? "a witness"}`, cutoff: `Ready to cut off ${names[n.target] ?? "the one pointed at"}`,
    fetch: n.stage === "back" ? `Coming back to ${who}` : `Going to ${names[n.target] ?? "the one pointed at"}`}[n.kind] + (n.hard ? " (a hard order)" : "");
}

/* ---------------- NPC 0.37.0: one tie, hard orders, sentries (B1800-B1804) ---------------- */

const idOf = v => (v && typeof v === "object" ? v.id : v) ? String(v && typeof v === "object" ? v.id : v) : null;

/**
 * Every character an NPC serves, from any of the four ties WoDX keeps (B1800): the old orders flag
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
 * Why WoDX counts an order as hard even when the player did not tick it (B1801). Returns reasons, empty for an
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
 * NPC 0.37.0 (B1804): the fight AI's options with the follower's standing order laid over them. options: from
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
 * The roll WoDX suggests when the Storyteller weighs a hard order (B1802, house rule). A ghoul blood bound to the
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
/** What a sentry does once it notices someone (B1803): Keep watch warns its master; Guard steps into the way of anyone close. */
export function sentryAct(kind, {noticed = false, yards = null} = {}) {
  if ( !noticed ) return null;
  if ( kind === "watch" ) return "alarm";
  if ( kind === "guard" ) return yards === null || yards <= GUARD_YARDS ? "challenge" : "alarm";
  return null;
}

/* ---------------- NPC 0.37.0: errands, clean-up, chases, loyalty (B1810-B1816) ---------------- */

/**
 * Errands a follower runs for its master as a long task on its own sheet (B1810, house rule: the pools follow the
 * V20 Abilities they name; the goals and intervals are WoDX's). abilities: the first one the follower's sheet
 * carries is used (Dark Ages sheets have Commerce where later ones have Finance).
 */
export const ERRANDS = {
  buy: {label: "Buy something", attr: "manipulation", abilities: ["finance", "commerce"], goal: 3, interval: "hour",
    done: "comes back with it; the price is paid from its master's purse.", ruined: "comes back empty-handed, and the money is spent all the same."},
  deliver: {label: "Carry a message or a parcel", attr: "wits", abilities: ["streetwise", "etiquette"], goal: 2, interval: "hour",
    done: "has handed it over.", ruined: "lost it on the way, or it fell into the wrong hands (the Storyteller says which)."},
  find: {label: "Find someone or something", attr: "perception", abilities: ["investigation", "streetwise"], goal: 4, interval: "hour",
    done: "has found what it was sent for and can lead the way.", ruined: "drew notice while asking: someone knows it was looking."},
  ask: {label: "Ask around for rumours", attr: "charisma", abilities: ["streetwise", "etiquette"], goal: 3, interval: "hour",
    done: "brings back what people are saying (the Storyteller gives a rumour or two).", ruined: "was taken for a spy and sent off with lies."},
  vessel: {label: "Bring me someone to feed on", attr: "charisma", abilities: ["subterfuge", "streetwise"], goal: 3, interval: "hour",
    done: "has brought someone willing or unwary to its master's haven: one feeding there needs no hunting roll.", ruined: "was seen leading someone away: a breach for the Storyteller to weigh."},
  spy: {label: "Watch a rival", attr: "wits", abilities: ["stealth", "streetwise"], goal: 3, interval: "day",
    done: "knows the rival's comings and goings, and what they plan at the next faction turn (the Storyteller says).", ruined: "was caught watching: the rival knows who sent it."}
};

/** The long task for an errand. sheet: the follower's abilities object. Returns the task data for WoDX Storyteller. */
export function errandTask(key, {sheet = {}, master = "", masterName = "", note = "", cost = 0} = {}) {
  const e = ERRANDS[key];
  if ( !e ) return null;
  const ability = e.abilities.find(k => sheet?.[k] !== undefined) ?? e.abilities[0];
  return {kind: "other", name: `Errand for ${masterName || "its master"}: ${e.label.toLowerCase()}${note ? `: ${String(note).slice(0, 80)}` : ""}`,
    attr: e.attr, ability, diff: 6, goal: e.goal, interval: e.interval, errand: key, master: String(master), cost: Math.max(0, Math.round(Number(cost) || 0))};
}

/** What came of an errand, for the card. */
export function errandResult(key, status) {
  const e = ERRANDS[key];
  if ( !e ) return "";
  return status === "done" ? e.done : e.ruined;
}

/** Dealing with a witness (B1813): successes of Manipulation + Subterfuge at 6. Returns the witness state to set, or null. */
export function cleanupOutcome({successes = 0, botch = false} = {}) {
  if ( botch ) return {state: "told", text: "botches: the witness takes fright and tells others."};
  if ( successes > 0 ) return {state: "convinced", text: `talks the witness round (${successes} success${successes === 1 ? "" : "es"}).`};
  return {state: null, text: "cannot talk the witness round."};
}

/**
 * Loyalty drift (B1816, house rule): small moves in the follower's attitude toward its master through WoDX NPC's
 * attitude track. Never below Distrusted (-1) by drift alone, so drift never starts a fight; at Distrusted or below
 * the Storyteller is told the follower may refuse, leave or turn. Returns {delta, why} or null.
 */
export const DRIFT_FLOOR = -1, DRIFT_CEIL = 3;
export function drift(kind, {step = 0, months = 0} = {}) {
  const now = Math.round(Number(step) || 0);
  const want = {drank: 1, unfed: -1, fedOn: -1, hard: -1, errand: 0}[kind];
  if ( !want ) return null;
  const to = Math.max(DRIFT_FLOOR, Math.min(DRIFT_CEIL, now + want));
  if ( to === now ) return null;
  const why = {drank: "drank from its domitor", unfed: `${months || 1} month${months === 1 ? "" : "s"} without the domitor's vitae`,
    fedOn: "its master fed on it", hard: "made to carry out a hard order"}[kind];
  return {delta: to - now, why, wavers: to <= DRIFT_FLOOR};
}
