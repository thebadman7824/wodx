/**
 * B6760: hooks a player's own client fires reach WoDX NPC's listeners on the active Storyteller's client.
 *
 * WoDX Actions fires wodxFed (a feeding), wodxSocial (a social roll) and wodxPowerShown (a power worked) on the client
 * that rolled, which for a player character is the player's. WoDX NPC's listeners act only on the active Storyteller's
 * client (the Kiss leaves a mortal Dazed, a vessel remembers who fed on it, a follower's loyalty drifts, a deed feeds a
 * cult), so a player's feeding, social win or power did nothing there. A listener added with onPlayerHook still runs
 * where the hook fires; on a player's client the hook is also sent by socket, and the Storyteller's client runs this
 * module's listeners for it once (documents travel as uuids). Other modules' listeners are not fired again, so
 * nothing they do happens twice. The sender must own the actor the event is about. A second Storyteller who is not the
 * active one sends too.
 *
 * Exactly once: WoDX Combat's relay also fires a player's wodxFed again on the Storyteller's client, relayed: true,
 * for the other modules' listeners (B6789); WoDX Storyteller's herds sends its own request and skips it. When that or
 * any other relay fires these hooks again with relayed: true, each listener here still runs once per event: a relayed delivery (from this socket or from another
 * module) is skipped when the same event reached that listener in the last few seconds (B6767).
 */
const MOD = "wodx-npc";
const SOCKET = `module.${MOD}`;
export const TYPE = "hook.relay";
/** The hooks sent on. */
export const RELAYED = ["wodxFed", "wodxSocial", "wodxPowerShown"];

const handlers = new Map();
let listening = false;
/** How long a relayed event is remembered, in milliseconds, so a second relay of it is skipped. */
export const SAME_EVENT_MS = 5000;
const seen = new Map();

const isDoc = v => !!v && typeof v === "object" && typeof v.uuid === "string" && typeof v.documentName === "string";
const isActiveGM = () => !!game.user?.isGM && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);

/** A hook's argument made safe to send: documents become {__uuid}, functions are left out. */
export function encode(v, depth = 0) {
  if ( isDoc(v) ) return {__uuid: v.uuid};
  if ( typeof v === "function" ) return undefined;
  if ( v === null || typeof v !== "object" ) return v;
  if ( depth > 4 ) return null;
  if ( Array.isArray(v) ) return v.map(x => encode(x, depth + 1) ?? null);
  const out = {};
  for ( const [k, x] of Object.entries(v) ) { const e = encode(x, depth + 1); if ( e !== undefined ) out[k] = e; }
  return out;
}
/** The other way: {__uuid} found again with find(uuid). */
export function decode(v, find, depth = 0) {
  if ( v === null || typeof v !== "object" || depth > 5 ) return v;
  if ( typeof v.__uuid === "string" && Object.keys(v).length === 1 ) return find(v.__uuid) ?? null;
  if ( Array.isArray(v) ) return v.map(x => decode(x, find, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x, find, depth + 1)]));
}
/** The uuid of the actor an event is about, from the sent arguments: the first one, its actor, or who it is by. */
export function subjectOf(args = []) {
  const a = args[0];
  return a?.__uuid ?? a?.actor?.__uuid ?? a?.by?.uuid ?? null;
}

const relayedArgs = args => args.some(a => a && typeof a === "object" && !isDoc(a) && a.relayed);
/** What makes two deliveries the same event: the hook, the actor it is about, and the plain values and uuids of
 * its arguments, leaving out relayed and anything a relay may drop (functions, nested objects). */
export function eventKey(name, args = []) {
  const flat = v => {
    if ( isDoc(v) ) return v.uuid;
    if ( v && typeof v === "object" && typeof v.__uuid === "string" ) return v.__uuid;
    if ( v === null || typeof v !== "object" ) return v;
    const o = {};
    for ( const k of Object.keys(v).sort() ) {
      if ( k === "relayed" ) continue;
      const x = v[k];
      if ( isDoc(x) ) o[k] = x.uuid;
      else if ( x && typeof x === "object" && (typeof x.uuid === "string" || typeof x.__uuid === "string") ) o[k] = x.uuid ?? x.__uuid;
      else if ( x === null || ["string", "number", "boolean"].includes(typeof x) ) o[k] = x;
    }
    return o;
  };
  return `${name}|${JSON.stringify(args.map(flat))}`;
}
/** True the first time a listener sees an event; false for a repeat within SAME_EVENT_MS. */
function firstTime(fnId, key, now = Date.now()) {
  for ( const [k, t] of seen ) if ( now - t > SAME_EVENT_MS ) seen.delete(k);
  const k = `${fnId}|${key}`;
  if ( seen.has(k) ) return false;
  seen.set(k, now);
  return true;
}

/** Send a hook on from a player's client (or a Storyteller's who is not the active one). Returns whether it was sent. */
export function send(name, args) {
  if ( !RELAYED.includes(name) || isActiveGM() || !game.users?.activeGM ) return false;
  if ( relayedArgs(args) ) return false;
  game.socket?.emit?.(SOCKET, {type: TYPE, hook: name, userId: game.user.id, args: args.map(a => encode(a) ?? null)});
  return true;
}

/** The Storyteller's client: run this module's listeners for a hook a player's client sent. Returns how many ran. */
export async function receive(m) {
  if ( m?.type !== TYPE || !isActiveGM() || !handlers.has(m.hook) ) return 0;
  const find = uuid => { try { return fromUuidSync(uuid); } catch (e) { return null; } };
  const user = game.users?.get?.(m.userId);
  const subject = find(subjectOf(m.args));
  if ( !user || !subject?.testUserPermission?.(user, "OWNER") ) return 0;
  const args = (m.args ?? []).map(a => decode(a, find));
  const last = args.length - 1;
  if ( last >= 0 && args[last] && typeof args[last] === "object" && !isDoc(args[last]) ) args[last] = {...args[last], relayed: true};
  const key = eventKey(m.hook, args);
  let n = 0;
  for ( const h of handlers.get(m.hook) ) {
    if ( !firstTime(h.id, key) ) continue;
    try { await h.fn(...args); n++; } catch (e) { console.error(`${MOD} | ${m.hook} from a player`, e); }
  }
  return n;
}

function listen() {
  if ( listening ) return;
  listening = true;
  const on = () => game.socket?.on?.(SOCKET, m => { if ( m?.type === TYPE ) receive(m).catch(e => console.error(`${MOD} | hook relay`, e)); });
  if ( game.ready ) on(); else Hooks.once("ready", on);
}

/** Hooks.on(name, fn), and fn also runs on the Storyteller's client when the hook fires on a player's. */
export function onPlayerHook(name, fn) {
  if ( !handlers.has(name) ) {
    handlers.set(name, []);
    Hooks.on(name, (...args) => { try { send(name, args); } catch (e) { console.warn(`${MOD} | relay ${name}`, e); } });
  }
  const h = {id: `${name}#${handlers.get(name).length}`, fn};
  handlers.get(name).push(h);
  // a delivery another module relayed (relayed: true) runs only if this listener has not had the event already
  Hooks.on(name, (...args) => {
    if ( relayedArgs(args) && isActiveGM() && !firstTime(h.id, eventKey(name, args)) ) return;
    return fn(...args);
  });
  listen();
}
