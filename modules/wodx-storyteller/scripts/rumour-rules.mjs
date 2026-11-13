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

/** How true a rumour is (Storyteller 0.63.0), for the Storyteller's eyes. */
export const TRUTH = {true: "True", half: "Half true", false: "False", unknown: "Not known"};
/** The tie kinds along which NPCs pass gossip (Storyteller 0.63.0): friends, lovers, kin, those who serve and are served. */
export const GOSSIP_TIES = ["friend", "lover", "spouse", "sibling", "parent", "child", "kin", "ally", "contact", "retainer", "patron", "apprentice", "mentor", "rival"];
/** Pairs of NPCs a tie of these kinds joins, as two-person groups for buildContacts. */
export const tiePairs = (edges = [], isNpc = () => true) => (edges ?? []).filter(e => GOSSIP_TIES.includes(e.kind) && e.from && e.to?.id && isNpc(e.from) && isNpc(e.to.id)).map(e => [e.from, e.to.id]);
/** Each denial a character makes takes one off how many a knower tells each night (Storyteller 0.63.0). */
export const heatAfterDoubt = (heat, doubt = 0) => (heat === Infinity ? (doubt ? 3 - Math.min(2, doubt) : Infinity) : Math.max(0, heat - (Number(doubt) || 0)));

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
    big: !!r.big,
    twists: Math.max(0, Math.trunc(Number(r.twists) || 0)),
    // 0.62.0: who it came from, who it is about, how true it is, and how much it has been denied
    source: r.source ? String(r.source) : null, about: r.about ? String(r.about) : null,
    truth: TRUTH[r.truth] ? r.truth : "unknown", doubt: Math.max(0, Math.min(3, Math.trunc(Number(r.doubt) || 0))),
    log: Array.isArray(r.log) ? r.log.slice(-40) : []
  };
}
export const normRumours = list => (Array.isArray(list) ? list : []).map(normRumour).filter(r => r.id && r.text);
export const live = r => !r.ended && r.quiet < QUIET_NIGHTS;

/**
 * One night of one rumour: every knower (in order) tells up to `heat` contacts who have not heard, picked with rand.
 * heat comes from the age's media (wodx-chronicle media-rules.mjs); Infinity tells every contact. twist: the chance a
 * telling changes the tale, counted on the rumour for the Storyteller (0: garbling off).
 * Returns the rumour after the night and the ids who heard it new.
 */
export function spreadNight(rumour, contacts, rand, {heat = HEAT, twist = 0} = {}) {
  const r = normRumour(rumour);
  if ( !live(r) ) return {rumour: r, heard: []};
  const knows = new Set(r.knownBy);
  const heard = [];
  // A flood (heat Infinity: big news in the age of the papers) goes on through those who just heard, the same night
  const queue = [...r.knownBy].sort();
  for ( let q = 0; q < queue.length; q++ ) {
    const teller = queue[q];
    const fresh = (contacts?.[teller] ?? []).filter(id => !knows.has(id));
    for ( let k = 0; k < heat && fresh.length; k++ ) {
      const i = Math.floor(rand() * fresh.length);
      const [id] = fresh.splice(i, 1);
      knows.add(id); heard.push(id);
      if ( heat === Infinity ) queue.push(id);
      if ( twist > 0 && rand() < twist ) r.twists += 1;
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
