/**
 * WoDX Chronicle (Antagonist Lines Desk, B6670-B6709): the pure rules every antagonist system reads. No Foundry.
 *
 *   groupOf    which antagonist group a character belongs to, from the words on its sheet (whole words only)
 *   activeIn   whether a group is about in a year, and the name it goes by then (G3, B6672)
 *   fallOf     the Fall ledger a group works on its victims (G2, B6671)
 *   resistShift the extra difficulty a victim's resisting roll takes against the one corrupting them (B6698)
 *   thresholds what crossing step 3 and step 5 does in play (B6698): at 3 the victim warms to the corrupter and
 *              does small wrongs for them; at 5 they fall into the group's servant bond (a cultist, a fomor, a pact)
 *   marksFor   the mark a foe or a victim leaves that a sight can catch (G4, B6673)
 */
import {ANTAGONISTS, FALLS, PENTEX_FROM, PENTEX_NAMES} from "../data/antagonists.mjs";
export {ANTAGONISTS, FALLS, PENTEX_FROM, PENTEX_NAMES};

const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const words = s => ` ${String(s ?? "").toLowerCase().replace(/^wod\.bio\.[a-z]+\./, "").replace(/[^a-z0-9']+/g, " ").trim()} `;

/** The group a list of sheet words (clan, tribe, affiliation, faction...) names, or null. Whole words only. */
export function groupOf(sides = []) {
  const hay = [sides].flat(3).filter(Boolean).map(words).join("|");
  if ( !hay.trim() ) return null;
  for ( const g of ANTAGONISTS ) {
    if ( g.match.some(m => hay.includes(words(m))) ) return g;
  }
  return null;
}
export const groupByKey = key => ANTAGONISTS.find(g => g.key === key) ?? null;

/** Is the group about in this year? {active, name}. Open ends count as always. */
export function activeIn(group, year) {
  const g = typeof group === "string" ? groupByKey(group) : group;
  if ( !g ) return {active: false, name: ""};
  const y = num(year);
  const era = (g.eras ?? []).find(e => (e.from == null || y >= e.from) && (e.to == null || y <= e.to));
  return {active: !!era, name: era?.name ?? g.label};
}
/** Pentex's name in a year, or null before it is the Wyrm's (W20 pdf 463). */
export const pentexName = year => PENTEX_NAMES.find(e => num(year) >= e.from && (e.to == null || num(year) <= e.to))?.name ?? null;

/** The Fall ledger a group works, or null. */
export function fallOf(group) {
  const g = typeof group === "string" ? groupByKey(group) : group;
  return g?.fall && FALLS[g.fall] ? {kind: g.fall, ...FALLS[g.fall]} : null;
}

/** How much harder the victim's own resisting roll is against the one working on them: one a step, as the ledger
 *  has always said (V20 pdf 61 reading), so the track is read by every social roll between them (B6698). */
export const resistShift = rec => Math.max(0, Math.min(5, Math.round(num(rec?.step))));

/**
 * What crossing a step does, for each step crossed upward: a list of {step, attitude, compromised, bind, words}.
 * attitude: how far the victim's attitude to the corrupter moves; compromised: they now do small wrongs when asked;
 * bind: the servant bond kind proposed to the Storyteller.
 */
export function thresholds(kind, crossed = []) {
  const f = FALLS[kind] ?? FALLS.setite;
  return crossed.map(step => step === 3
    ? {step, attitude: 1, compromised: true, bind: null, words: "will now do small wrongs when asked, and warms to the one who corrupts them"}
    : step === 5 ? {step, attitude: 1, compromised: true, bind: f.end, words: f.endWords} : null).filter(Boolean);
}

/** The sheet fields that name a character's side (clan, tribe, affiliation...), as WoDX NPC's rivalries read them. */
export const SHEET_FIELDS = ["clan", "bloodline", "sect", "tribe", "affiliation", "tradition", "convention", "creed", "court", "kith", "house", "legion", "faction", "amenti"];
const fieldText = v => typeof v === "string" ? v : (typeof v?.value === "string" ? v.value : "");
/** The group an actor belongs to: a key the Storyteller set (flags["wodx-chronicle"].antagonist), else its sheet words. */
export function groupOfActor(actor) {
  const key = actor?.flags?.["wodx-chronicle"]?.antagonist;
  if ( key ) return groupByKey(key);
  const sys = actor?.system ?? {};
  return groupOf(SHEET_FIELDS.map(f => fieldText(sys[f])).filter(Boolean));
}
/** The deepest fall an actor is on: {kind, step} from its Fall ledger records, or null. */
export function deepestFall(corruption = {}) {
  let best = null;
  for ( const r of Object.values(corruption ?? {}) ) if ( r && num(r.step) > num(best?.step) ) best = {kind: r.kind ?? "setite", step: num(r.step)};
  return best;
}
/** Does a sight catch this group's mark? Returns {colour, words} or null. Victims show it from step 2 (B6673). */
export function markFor(sight, {group = null, fallKind = null, step = 0} = {}) {
  const g = typeof group === "string" ? groupByKey(group) : group;
  if ( g?.mark?.sights?.includes(sight) ) return {colour: g.mark.colour, words: g.mark.words};
  if ( fallKind && num(step) >= 2 ) {
    const owner = ANTAGONISTS.find(x => x.fall === fallKind && x.mark);
    if ( owner?.mark?.sights?.includes(sight) ) return {colour: owner.mark.colour, words: `touched by ${owner.mark.words}`};
  }
  return null;
}
