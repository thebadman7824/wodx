/**
 * The ledger, the pure part: oaths, debts, boons and consequences that come due, the Veil track, and who inherits
 * what when someone dies. No Foundry in here.
 */

export const KINDS = {
  oath: "Oath or vow",
  debt: "Debt (money or a favour owed)",
  boon: "Boon (Kindred prestation)",
  consequence: "Consequence (comes due on a date)",
  objective: "Objective (steps that tick from the map)"
};
/** Boon sizes, smallest first. */
export const BOONS = {trivial: "Trivial", minor: "Minor", major: "Major", blood: "Blood", life: "Life"};
export const STATUS = {open: "Open", kept: "Kept or paid", broken: "Broken", void: "Cancelled"};

export const VEIL_MAX = 10;
/** What each band of the Veil track means at the table (a house rule). */
export const VEIL_BANDS = [
  {min: 8, name: "Sound", note: "Mortals explain away what they glimpse."},
  {min: 5, name: "Talk", note: "Rumours run among mortals; the curious start asking."},
  {min: 3, name: "Hunted", note: "Hunters of the era act openly; the courts punish the careless."},
  {min: 1, name: "Failing", note: "Authorities take notice; every breach has witnesses who will not forget."},
  {min: 0, name: "Torn", note: "The secret is out in this place and time; the Storyteller decides what that means."}
];

const id = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
const who = v => (v && typeof v === "object" ? {id: v.id ?? null, name: String(v.name ?? "")} : {id: null, name: String(v ?? "")});

/** A clean entry from anything the window or the API gives. */
export function normEntry(e = {}) {
  const kind = KINDS[e.kind] ? e.kind : "debt";
  const due = e.due === null || e.due === undefined || e.due === "" ? null : Number(e.due);
  return {
    id: e.id ?? id(), kind,
    size: kind === "boon" ? (BOONS[e.size] ? e.size : "minor") : null,
    from: who(e.from), to: who(e.to),
    what: String(e.what ?? "").slice(0, 500),
    made: Number(e.made) || 0,
    due: Number.isFinite(due) ? due : null,
    status: STATUS[e.status] ? e.status : "open",
    announced: !!e.announced,
    notes: String(e.notes ?? "").slice(0, 1000),
    history: Array.isArray(e.history) ? e.history.slice(-20) : [],
    steps: kind === "objective" ? normSteps(e.steps) : []
  };
}

/* ------------------------------------------------------------------ */
/*  Objectives (Storyteller 0.20.0)                                    */
/* ------------------------------------------------------------------ */

/**
 * An objective is a Ledger entry with steps the Storyteller writes, one a line, each ticked by a map event:
 *   reach the cellar stairs      a WoDX: Trigger region whose name has these words
 *   open the reliquary           an object (door, chest) that comes to this state: open, forced, broken, empty,
 *   found the trapdoor           found, disarmed, lit, out, desecrated, taken, sprung, broken through
 *   any the abbot's study        any map event at something with these words
 * Its due date, if set, is the date it fails by: the Ledger says so when it comes due. Ticking a step never awards
 * Experience; the Storyteller decides what finishing it is worth.
 */
export const STEP_STATES = ["open", "forced", "broken", "empty", "emptied", "found", "disarmed", "lit", "out", "desecrated", "taken", "sprung", "breached", "broken through"];
const low = v => String(v ?? "").trim().toLowerCase();

export function parseStep(line) {
  const t = String(line ?? "").replace(/#.*$/, "").trim();
  if ( !t ) return null;
  const m = /^(reach|any|broken through|[a-z]+)\s+(.+)$/i.exec(t);
  if ( !m ) return {text: t, verb: "any", what: low(t), problem: null};
  const verb = low(m[1]);
  if ( verb === "reach" || verb === "any" || STEP_STATES.includes(verb) ) return {text: t, verb, what: low(m[2]).replace(/^the\s+/, ""), problem: null};
  return {text: t, verb: "any", what: low(t), problem: null};
}

export function normSteps(list) {
  if ( typeof list === "string" ) list = list.split(/\r?\n/).map(parseStep).filter(Boolean).map(s => ({...s, done: false, at: null, by: ""}));
  return (Array.isArray(list) ? list : []).slice(0, 20).map(s => ({text: String(s?.text ?? "").slice(0, 200), verb: String(s?.verb ?? "any"), what: low(s?.what).slice(0, 120),
    done: !!s?.done, at: s?.at === null || s?.at === undefined ? null : Number(s.at), by: String(s?.by ?? "").slice(0, 80)})).filter(s => s.text);
}

/** Does a map event tick this step? ev: a WoDX map event {kind, objectKind, objectName, state, undone}. */
export function stepMatches(step, ev = {}) {
  if ( !step || step.done || !ev || ev.undone ) return false;
  const name = low(ev.objectName);
  if ( !step.what || !name.includes(step.what) ) return false;
  if ( step.verb === "any" ) return true;
  if ( step.verb === "reach" ) return ev.objectKind === "trigger" || ev.kind === "trigger";
  const state = low(ev.state);
  const want = step.verb === "emptied" ? "empty" : step.verb === "breached" ? "broken through" : step.verb;
  return state === want || state.startsWith(want) || low(ev.kind) === want;
}

/** Tick an objective's steps for one event. Returns {entry, ticked: [step texts], finished}. Pure: a new entry. */
export function tickObjective(entry, ev = {}) {
  if ( entry?.kind !== "objective" || entry.status !== "open" ) return {entry, ticked: [], finished: false};
  const ticked = [];
  const steps = entry.steps.map(s => {
    if ( !stepMatches(s, ev) ) return s;
    ticked.push(s.text);
    return {...s, done: true, at: Number(ev.at) || 0, by: String(ev.whoName ?? "")};
  });
  const finished = !!ticked.length && steps.length > 0 && steps.every(s => s.done);
  return {entry: {...entry, steps, status: finished ? "kept" : entry.status}, ticked, finished};
}

export function blankLedger() { return {entries: [], heirs: {}, veil: {value: VEIL_MAX, lastBreach: null, lastRise: null, log: []}}; }

export function normLedger(s) {
  const b = blankLedger();
  const out = {entries: (s?.entries ?? []).map(normEntry), heirs: {...(s?.heirs ?? {})}, veil: {...b.veil, ...(s?.veil ?? {})}};
  out.veil.value = Math.max(0, Math.min(VEIL_MAX, Number(out.veil.value ?? VEIL_MAX)));
  out.veil.log = (out.veil.log ?? []).slice(-50);
  return out;
}

/** Entries that have come due by this time and have not been announced. */
export function comingDue(ledger, now) {
  return ledger.entries.filter(e => e.status === "open" && e.due !== null && e.due <= now && !e.announced)
    .sort((a, b) => a.due - b.due);
}

/** Setting the clock back: announced entries whose date is ahead again count as not yet due. */
export function noLongerDue(ledger, now) {
  return ledger.entries.filter(e => e.announced && e.due !== null && e.due > now);
}

export function veilBand(value) {
  return VEIL_BANDS.find(b => value >= b.min) ?? VEIL_BANDS.at(-1);
}

/** A breach's severity, from its witnesses (the same scale as the rumours: 1, 2 to 4, 5 or more). */
export function breachSeverity(entry) {
  const n = Array.isArray(entry?.witnesses) ? entry.witnesses.length : Number(entry?.witnesses) || 1;
  return n >= 5 ? 3 : n >= 2 ? 2 : 1;
}

/** The Veil after a change, with the band crossed (if any). */
export function moveVeil(veil, delta) {
  const before = veil.value;
  const value = Math.max(0, Math.min(VEIL_MAX, before + delta));
  const crossed = veilBand(value).name !== veilBand(before).name ? veilBand(value) : null;
  return {value, before, crossed};
}

/** Days of quiet before the Veil mends a step (a house rule): 30 days with no breach, one step, up to the top. */
export const MEND_DAYS = 30;
export function mendSteps(veil, now, day = 86400) {
  const since = Math.max(veil.lastBreach ?? -Infinity, veil.lastRise ?? -Infinity);
  if ( !Number.isFinite(since) || veil.value >= VEIL_MAX ) return 0;
  return Math.min(VEIL_MAX - veil.value, Math.floor((now - since) / (MEND_DAYS * day)));
}

/** What a death means for the ledger: entries naming the dead, and the heir who could take them over. */
export function inheritance(ledger, deadId, heir) {
  const touched = ledger.entries.filter(e => e.status === "open" && (e.from.id === deadId || e.to.id === deadId));
  return touched.map(e => ({entry: e, side: e.from.id === deadId ? "from" : "to", heir: heir ? {id: heir.id, name: heir.name} : null}));
}

/** Pass an entry to an heir: the dead's side becomes the heir's, with a note. */
export function passToHeir(entry, side, heir, deadName) {
  const next = normEntry(entry);
  next[side] = {id: heir.id, name: heir.name};
  next.history.push({what: `Passed from ${deadName} to ${heir.name}, the heir.`});
  return next;
}

/** A faction's next leader when the leader dies: a named heir among the members, else the first living member. */
export function successor(faction, deadId, {heirOf = () => null, alive = () => true} = {}) {
  const members = (faction.members ?? []).filter(m => m && m !== deadId && alive(m));
  const heir = heirOf(deadId);
  if ( heir && members.includes(heir) ) return heir;
  return members[0] ?? null;
}
