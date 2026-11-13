/**
 * WoDX NPC 0.57.0: trust, betrayal, boons in every line, blackmail and hidden loyalties (B2810-B2816). Pure: no Foundry.
 *
 * Trust is kept one way, on the one who trusts: flags["wodx-npc"].trust {otherId: {value, log: [{at, why, delta}]}},
 * from -5 (would not turn their back) to +5 (would trust them with their life). It sits beside attitude: attitude is
 * how warmly someone regards a person, trust is how far they would rely on them. The numbers are house rules (B2811).
 */

export const TRUST_MIN = -5, TRUST_MAX = 5;
/** What moves trust, and by how much. */
export const TRUST_EVENTS = {
  promiseKept: {delta: 1, label: "Kept a promise or paid a debt"},
  boonPaid: {delta: 1, label: "Paid a boon"},
  rescued: {delta: 2, label: "Came to their aid at a cost"},
  secretKept: {delta: 1, label: "Kept a secret they were told"},
  promiseBroken: {delta: -2, label: "Broke a promise or left a debt unpaid"},
  boonBroken: {delta: -2, label: "Refused a boon"},
  lieFound: {delta: -2, label: "Was caught in a lie"},
  oathBroken: {delta: -3, label: "Broke an oath"},
  betrayed: {delta: -4, label: "Betrayed them"},
  blackmailed: {delta: -3, label: "Blackmailed them"}
};
export const trustWord = v => (v >= 4 ? "Would trust with their life" : v >= 2 ? "Trusts" : v >= 1 ? "Inclined to trust" : v <= -4 ? "Would not turn their back" : v <= -2 ? "Distrusts" : v <= -1 ? "Wary" : "No opinion");
/** Will they share a secret with this person? Risk something for them? */
export const sharesSecrets = v => Number(v) >= 3;
export const takesRisks = v => Number(v) >= 2;

const clamp = v => Math.max(TRUST_MIN, Math.min(TRUST_MAX, Math.round(Number(v) || 0)));
export function normTrust(t = {}) {
  const out = {};
  for ( const [k, v] of Object.entries(t ?? {}) ) if ( k && v && typeof v === "object" ) out[k] = {value: clamp(v.value), log: (v.log ?? []).slice(-12).map(x => ({at: Number(x.at) || 0, why: String(x.why ?? "").slice(0, 120), delta: Number(x.delta) || 0}))};
  return out;
}
/** One event on one person's trust in another: returns the new map. */
export function moveTrust(map = {}, otherId, event, {at = 0, why = ""} = {}) {
  const ev = TRUST_EVENTS[event];
  const delta = ev ? ev.delta : Number(event) || 0;
  const t = normTrust(map);
  const cur = t[otherId] ?? {value: 0, log: []};
  cur.value = clamp(cur.value + delta);
  cur.log.push({at, why: why || ev?.label || "", delta});
  cur.log = cur.log.slice(-12);
  t[otherId] = cur;
  return t;
}
/** The Ledger event a settled entry makes: kept or broken boon, oath or debt. */
export function ledgerEvent(entry = {}, status = "") {
  if ( status === "kept" ) return entry.kind === "boon" ? "boonPaid" : "promiseKept";
  if ( status === "broken" ) return entry.kind === "boon" ? "boonBroken" : entry.kind === "oath" ? "oathBroken" : "promiseBroken";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Betrayal (b2)                                                      */
/* ------------------------------------------------------------------ */

export const BETRAYALS = {
  secret: {label: "Sold or told their secret", rumour: "told what {victim} wanted kept hidden"},
  boon: {label: "Refused a boon owed to them", rumour: "would not pay what was owed to {victim}"},
  handover: {label: "Handed them to their enemies", rumour: "gave {victim} up to their enemies"},
  sides: {label: "Changed sides against them", rumour: "turned against {victim}"},
  other: {label: "Betrayed them", rumour: "betrayed {victim}"}
};
/**
 * What a betrayal does. step: the betrayer's bond step toward the victim (bond-rules stepToward), vinculum counted.
 * Returns {needsWillpower, trust: event, attitude: steps, rumour: text, revenge: bool}.
 */
export function betrayal({kind = "other", step = 0, victimIsNpc = true, betrayer = "", victim = ""} = {}) {
  const b = BETRAYALS[kind] ?? BETRAYALS.other;
  return {needsWillpower: step >= 2, trust: "betrayed", attitude: -2, revenge: !!victimIsNpc,
    rumour: `${betrayer} ${b.rumour.replace("{victim}", victim)}`, label: b.label};
}

/* ------------------------------------------------------------------ */
/*  Boons in every line (b3)                                           */
/* ------------------------------------------------------------------ */

/** What each line calls a debt of honour, and what defaulting on it costs (W20, M20, C20, Wraith 20th, the hunter books). */
export const DEBT_WORDS = {
  vampire: {name: "boon", cost: "Status among the Kindred; the Harpies keep the record"},
  werewolf: {name: "debt of honour", cost: "Honor Renown, and the sept's regard"},
  mage: {name: "debt among the Awakened", cost: "standing in the Tradition or Convention"},
  changeling: {name: "oath of service", cost: "the Dreaming's price for a broken oath, and standing at court"},
  wraith: {name: "favour of the Hierarchy", cost: "standing in the Legion or Guild"},
  hunter: {name: "debt in the cell", cost: "the cell's trust"},
  mummy: {name: "debt of the cult", cost: "standing among the Shemsu-heru"},
  demon: {name: "pact debt", cost: "the pact's hold, and Faith"},
  kueijin: {name: "debt of face", cost: "face at court"},
  mortal: {name: "favour", cost: "reputation in town"}
};
export const debtWordFor = line => DEBT_WORDS[line] ?? DEBT_WORDS.mortal;
/** A boon may change hands: the debtor now owes the new holder. Returns the changed entry (pure). */
export function tradeBoon(entry = {}, newHolder = {}) {
  if ( entry.kind !== "boon" || (entry.status ?? "open") !== "open" || !newHolder?.id ) return null;
  return {...entry, to: {id: newHolder.id, name: newHolder.name ?? ""}, history: [...(entry.history ?? []), {at: 0, what: `Passed to ${newHolder.name ?? "another"}.`}]};
}

/* ------------------------------------------------------------------ */
/*  Blackmail (b4)                                                     */
/* ------------------------------------------------------------------ */

/** How the means of blackmail change over the centuries: what the proof is and how it is kept. */
export const PROOF_BY_ERA = [
  {from: -9999, proof: "a witness and a letter", keep: "a go-between holds the letter"},
  {from: 1840, proof: "letters and a photograph", keep: "a sealed packet with a lawyer"},
  {from: 1950, proof: "photographs and a tape", keep: "copies in a safe deposit box"},
  {from: 1995, proof: "photographs, recordings and files", keep: "copies on a server set to send if they go quiet"},
  {from: 2040, proof: "records pulled from the net", keep: "a dead man's switch in the net"}
];
export const proofFor = year => { let o = PROOF_BY_ERA[0]; for ( const p of PROOF_BY_ERA ) if ( Number(year) >= p.from ) o = p; return o; };
/** What a victim can do: pay, strike back, confess first. Their odds come from the secret's weight (1 or 2). */
export const RESPONSES = {
  pay: {label: "Pay", text: "Pays this month's price; the hold stays."},
  strike: {label: "Strike back", text: "Moves against the blackmailer: a scene, or the Storyteller's call on the faction turn."},
  confess: {label: "Confess first", text: "Lays the secret bare before it can be used: the hold is gone, and the secret's cost falls now."}
};
/** A monthly price by the secret's weight and the victim's Resources. */
export const blackmailPrice = (weight = 1, resources = 1) => Math.max(1, Number(weight) || 1) * Math.max(1, Number(resources) || 1);

/* ------------------------------------------------------------------ */
/*  Hidden loyalties (b5)                                              */
/* ------------------------------------------------------------------ */

/**
 * The powers that can find a hidden loyalty, by the book: aura reading shows deceit, mind reading the truth. Each is
 * {line, power, dots, roll, difficulty, book}; the Storyteller rolls (house reading of what each power shows).
 */
export const LOYALTY_SENSES = [
  {line: "vampire", power: "Auspex (Telepathy)", dots: 4, roll: "Intelligence + Subterfuge", difficulty: "the target's Willpower", book: "V20"},
  {line: "vampire", power: "Auspex (Aura Perception)", dots: 2, roll: "Perception + Empathy", difficulty: 8, book: "V20", shows: "a lie as it is told, not the side"},
  {line: "werewolf", power: "Truth of Gaia", dots: 1, roll: "Intelligence + Empathy", difficulty: "the speaker's Manipulation + Subterfuge", book: "W20"},
  {line: "werewolf", power: "Sense Wyrm", dots: 1, roll: "Perception + Occult", difficulty: 6, book: "W20 p. 156", shows: "Wyrm-taint, not the side"},
  {line: "mage", power: "Mind 1 (sense thoughts and moods)", dots: 1, roll: "Arete", difficulty: "Sphere rating + 3 (coincidental)", book: "M20"},
  {line: "changeling", power: "Kenning", dots: 0, roll: "Perception + Kenning", difficulty: 7, book: "C20", shows: "a lie spoken, not the side"},
  {line: "hunter", power: "Discern", dots: 1, roll: "Wits + Awareness", difficulty: 7, book: "Hunter: the Reckoning", shows: "what a thing truly is"},
  {line: "mortal", power: "Empathy", dots: 0, roll: "Perception + Empathy", difficulty: "the spy's Manipulation + Subterfuge", book: "V20", shows: "a lie, not the side"}
];
export const sensesFor = line => LOYALTY_SENSES.filter(s => s.line === line || s.line === "mortal");
/** The tie a hidden loyalty makes: hidden, so only the Storyteller sees it until it is found out. */
export const SIDE_KINDS = {
  spyFor: {label: "Secretly serves", back: "spiedBy", group: "service", up: true},
  spiedBy: {label: "Has a hidden servant", back: "spyFor", group: "service"}
};
export function normSide(s = {}) {
  if ( !s || !s.faction ) return null;
  const leader = s.leader && (s.leader.id || s.leader.name) ? {id: s.leader.id ? String(s.leader.id) : null, name: String(s.leader.name ?? "")} : null;
  return {faction: String(s.faction), name: String(s.name ?? ""), leader, note: String(s.note ?? "").slice(0, 200), since: Number(s.since) || null, found: {...(s.found ?? {})}};
}
