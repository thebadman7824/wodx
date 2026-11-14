/**
 * NPC memory and grudges (B3346-B3349): the pure part. No Foundry here, so the harness can test it.
 *
 * Every NPC keeps a short list of what a character did to them or theirs, on the NPC's world actor:
 *   flags["wodx-npc"].memory = {<character id>: [{id, kind, weight, at, text, seen}]}
 *     kind    one of KINDS; weight is signed: a favour is +, an insult is -
 *     at      world time it happened
 *     seen    the character knows the NPC knows (it was done to their face); only these show on the player's side
 * How fast a note fades follows the NPC's Nature (V20 Archetypes): some never forget, some forgive quickly (B3347).
 * Once a season each NPC with a strong grudge and the means to act picks one move (B3348); anything that touches a
 * player character goes to the Storyteller's approval queue first. Undying NPCs keep a grudge as long as it lasts;
 * a mortal's passes to the heirs through feuds when they die (B3349). The weights, fades and moves are house figures.
 */

export const YEAR = 365 * 86400;
export const SEASON = 91 * 86400;
/** Notes kept per character, newest last. */
export const KEEP = 24;

/** What can be remembered, and how much it weighs. */
export const KINDS = {
  favour: {weight: 2, label: "Did them a favour"},
  gift: {weight: 1, label: "Gave them a gift"},
  saved: {weight: 4, label: "Saved them, or someone dear to them"},
  kept: {weight: 1, label: "Kept a promise"},
  warm: {weight: 1, label: "Treated them well"},
  cold: {weight: -1, label: "Treated them badly"},
  insult: {weight: -2, label: "Insulted them"},
  shamed: {weight: -3, label: "Shamed them in front of others"},
  broken: {weight: -3, label: "Broke a promise to them"},
  harm: {weight: -4, label: "Hurt them"},
  robbed: {weight: -3, label: "Robbed them"},
  betrayed: {weight: -5, label: "Betrayed them"},
  kin: {weight: -6, label: "Killed or ruined someone dear to them"}
};

/**
 * How a Nature holds on to what was done (B3347): years until a note weighs half as much. null never fades.
 * Grudges and favours fade at their own rates: a Caregiver forgets an insult fast and a kindness slowly.
 */
export const TEMPERS = {
  unforgiving: {grudge: null, favour: 10, label: "Never forgets a wrong"},
  proud: {grudge: 20, favour: 5, label: "Slow to forgive"},
  even: {grudge: 5, favour: 5, label: "Forgives in time"},
  kind: {grudge: 1, favour: 20, label: "Quick to forgive, slow to forget a kindness"},
  fickle: {grudge: 0.5, favour: 0.5, label: "Forgets both soon"}
};
export const NATURE_TEMPER = {
  autocrat: "proud", bravo: "proud", competitor: "proud", conniver: "unforgiving", curmudgeon: "unforgiving", deviant: "proud",
  director: "proud", fanatic: "unforgiving", judge: "unforgiving", monster: "unforgiving", perfectionist: "proud", rebel: "proud",
  rogue: "even", survivor: "even", architect: "even", loner: "even", pedagogue: "even", traditionalist: "proud", visionary: "even",
  caregiver: "kind", child: "fickle", celebrant: "kind", gallant: "fickle", martyr: "kind", masochist: "even", "bon vivant": "fickle",
  conformist: "even", penitent: "kind", explorer: "fickle", jester: "fickle", sage: "kind", guru: "kind", thrill: "fickle"
};
export const temperOf = nature => {
  const k = String(nature ?? "").toLowerCase().trim();
  const key = Object.keys(NATURE_TEMPER).find(x => k === x || k.startsWith(x)) ?? (k.includes("thrill") ? "thrill" : "");
  return TEMPERS[NATURE_TEMPER[key]] ? NATURE_TEMPER[key] : "even";
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clean = s => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 200);

/** A note, cleaned. */
export function normNote(x = {}) {
  const kind = KINDS[x.kind] ? x.kind : (n(x.weight) < 0 ? "cold" : "warm");
  return {id: String(x.id ?? "").slice(0, 20), kind, weight: Number.isFinite(Number(x.weight)) && x.weight !== null ? Math.max(-9, Math.min(9, Math.round(Number(x.weight)))) : KINDS[kind].weight,
    at: n(x.at), text: clean(x.text) || KINDS[kind].label, seen: x.seen !== false};
}
export function normMemory(m = {}) {
  const out = {};
  for ( const [k, v] of Object.entries(m && typeof m === "object" ? m : {}) ) if ( Array.isArray(v) ) out[k] = v.map(normNote).slice(-KEEP);
  return out;
}

/** Add a note about one character. Returns the new map. */
export function remember(memory, charId, note, idFor = i => `m${i}`) {
  const m = normMemory(memory);
  const list = m[charId] ?? [];
  const nn = normNote(note);
  if ( !nn.id ) nn.id = idFor(list.length + (list.at(-1) ? Number(String(list.at(-1).id).replace(/\D/g, "")) + 1 : 0));
  m[charId] = [...list, nn].slice(-KEEP);
  return m;
}

/** What a note weighs now, after its fade. */
export function weightNow(note, now, temper = "even") {
  const t = TEMPERS[temper] ?? TEMPERS.even;
  const half = note.weight < 0 ? t.grudge : t.favour;
  if ( half === null ) return note.weight;
  const years = Math.max(0, (n(now) - n(note.at)) / YEAR);
  return note.weight * Math.pow(0.5, years / Math.max(0.1, half));
}

/** The balance of what one NPC remembers of one character: {grudge (>= 0), favour (>= 0), net, notes}. */
export function balance(notes = [], now = 0, temper = "even") {
  let grudge = 0, favour = 0;
  for ( const x of (notes ?? []).map(normNote) ) { const w = weightNow(x, now, temper); if ( w < 0 ) grudge -= w; else favour += w; }
  const r = v => Math.round(v * 10) / 10;
  return {grudge: r(grudge), favour: r(favour), net: r(favour - grudge)};
}

/** A grudge strong enough to act on (B3348). */
export const GRUDGE_AT = 5;

/**
 * The moves a grudge can take, best first; each needs a means. means: {rumours, boon, hunters, venture, seat, kin, violent}
 * as booleans. The first that fits and is not on cooldown wins. Every move is a proposal for the Storyteller.
 */
export const MOVES = [
  {key: "boon", needs: "boon", min: 5, label: "Calls in a boon the character owes, at the worst time"},
  {key: "talk", needs: "rumours", min: 5, label: "Spreads an unkind tale about the character"},
  {key: "seat", needs: "seat", min: 6, label: "Works against the character in a court or an institution"},
  {key: "venture", needs: "venture", min: 6, label: "Spoils a venture or a business of the character's"},
  {key: "hunters", needs: "hunters", min: 8, label: "Lets hunters know where to look"},
  {key: "kin", needs: "kin", min: 8, label: "Turns on someone dear to the character"},
  {key: "violence", needs: "violent", min: 9, label: "Means to do the character harm"}
];

/** One season's move for one NPC against one character, or null. last: {move key: world time last used}. */
export function pickMove({grudge = 0, means = {}, last = {}, now = 0, cooldown = 2 * SEASON} = {}) {
  if ( grudge < GRUDGE_AT ) return null;
  for ( const m of MOVES ) {
    if ( grudge < m.min || !means[m.needs] ) continue;
    if ( last[m.key] && now - last[m.key] < cooldown ) continue;
    return m;
  }
  return null;
}

/** Is a season turn due? last: world time of the last turn. */
export const seasonDue = (last, now) => !Number.isFinite(Number(last)) || last === null || now - Number(last) >= SEASON;

/**
 * B3349: when a mortal NPC dies, a grudge strong enough passes to the heirs as a feud note, at half weight.
 * Returns the notes an heir inherits about each character.
 */
export function inherited(memory, now, temper, from = "") {
  const out = {};
  for ( const [cid, notes] of Object.entries(normMemory(memory)) ) {
    const b = balance(notes, now, temper);
    if ( b.grudge >= GRUDGE_AT ) out[cid] = [normNote({kind: "kin", weight: -Math.round(b.grudge / 2), at: now, text: `The family remembers what was done to ${from || "one of them"}`, seen: false})];
  }
  return out;
}

/** What a character can see: the notes done to the NPC's face, and the word for the balance. */
export function seenBy(notes = [], now = 0, temper = "even") {
  const seen = (notes ?? []).map(normNote).filter(x => x.seen);
  const b = balance(seen, now, temper);
  const word = b.net <= -GRUDGE_AT ? "Holds a grudge" : b.net < -1 ? "Has not forgotten" : b.net >= GRUDGE_AT ? "Owes you, and knows it" : b.net > 1 ? "Remembers you kindly" : "Nothing much";
  return {notes: seen, word};
}

/**
 * B3346: an attitude change or a trust event as a note. Attitude changes carry {delta, why}; trust events are keyed.
 */
export const TRUST_KIND = {promiseKept: "kept", boonPaid: "kept", rescued: "saved", secretKept: "kept", promiseBroken: "broken",
  boonBroken: "broken", lieFound: "cold", oathBroken: "broken", betrayed: "betrayed", blackmailed: "harm"};
export function noteFromAttitude(change = {}, at = 0) {
  const d = Math.round(n(change.delta));
  if ( !d ) return null;
  return normNote({kind: d > 0 ? "warm" : "cold", weight: d, at, text: change.why || "", seen: true});
}
