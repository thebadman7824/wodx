/**
 * The rumour network (WoDX Storyteller 0.8.0), the pure rules: gossip passing between the Storyteller's characters
 * night by night. Who talks to whom comes from the chronicle itself (the same faction, or tokens on the same scene).
 * No book gives rules for this; every number here is a house reading. No Foundry here.
 */

/** Each night a knower passes it to this many of their contacts who have not heard. */
export const HEAT = 2;
/** After this many nights in a row with nobody new, the rumour goes quiet. */
export const QUIET_NIGHTS = 3;
/** At most this many nights are worked through at once (a long time skip). */
export const MAX_NIGHTS = 60;

/** Who talks to whom: shared faction membership or a shared scene. Returns {id: [ids]}, each list sorted. */
export function buildContacts({groups = []} = {}) {
  const m = new Map();
  const link = (a, b) => { if ( a === b ) return; if ( !m.has(a) ) m.set(a, new Set()); m.get(a).add(b); };
  for ( const g of groups ?? [] ) {
    const ids = [...new Set((g ?? []).filter(Boolean))];
    for ( const a of ids ) for ( const b of ids ) link(a, b);
  }
  return Object.fromEntries([...m.entries()].map(([k, v]) => [k, [...v].sort()]));
}

/** A rumour kept clean. */
export function normRumour(r = {}) {
  return {
    id: String(r.id ?? ""),
    text: String(r.text ?? "").trim().slice(0, 1000),
    started: Number.isFinite(Number(r.started)) ? Number(r.started) : 0,
    night: Number.isFinite(Number(r.night)) ? Math.trunc(Number(r.night)) : null,
    knownBy: [...new Set((r.knownBy ?? []).filter(Boolean).map(String))],
    quiet: Math.max(0, Math.trunc(Number(r.quiet) || 0)),
    ended: !!r.ended,
    log: Array.isArray(r.log) ? r.log.slice(-40) : []
  };
}
export const normRumours = list => (Array.isArray(list) ? list : []).map(normRumour).filter(r => r.id && r.text);
export const live = r => !r.ended && r.quiet < QUIET_NIGHTS;

/**
 * One night of one rumour: every knower (in order) tells up to `heat` contacts who have not heard, picked with rand.
 * Returns the rumour after the night and the ids who heard it new.
 */
export function spreadNight(rumour, contacts, rand, {heat = HEAT} = {}) {
  const r = normRumour(rumour);
  if ( !live(r) ) return {rumour: r, heard: []};
  const knows = new Set(r.knownBy);
  const heard = [];
  for ( const teller of [...r.knownBy].sort() ) {
    const fresh = (contacts?.[teller] ?? []).filter(id => !knows.has(id));
    for ( let k = 0; k < heat && fresh.length; k++ ) {
      const i = Math.floor(rand() * fresh.length);
      const [id] = fresh.splice(i, 1);
      knows.add(id); heard.push(id);
    }
  }
  r.knownBy = [...knows];
  r.quiet = heard.length ? 0 : r.quiet + 1;
  return {rumour: r, heard};
}

/** The nights to work through for a rumour now, from the night after its last to tonight. */
export function nightsDue(rumour, tonight) {
  const r = normRumour(rumour);
  const t = Math.trunc(Number(tonight));
  if ( !Number.isFinite(t) || !live(r) ) return [];
  const from = r.night === null ? t : r.night + 1;
  const out = [];
  for ( let n = Math.max(from, t - MAX_NIGHTS + 1); n <= t; n++ ) out.push(n);
  return out;
}

/** Who to start it with when none is named: a character the chosen place's people know, else any with contacts. */
export function firstTeller(contacts, rand, prefer = []) {
  const pool = (prefer ?? []).filter(id => contacts?.[id]?.length);
  const any = Object.keys(contacts ?? {}).filter(id => contacts[id].length).sort();
  const list = pool.length ? pool : any;
  return list.length ? list[Math.floor(rand() * list.length)] : null;
}
