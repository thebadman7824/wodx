/**
 * A ghoul going without vitae (B5050 to B5054). No Foundry calls, so the harness can test it.
 *
 *   B5050 each month unfed takes the month's vitae off the sheet by itself (human ghouls 1; an animal by its size,
 *         WoDX Creation B5044). With the pool empty, a Discipline dot goes each month, Potence last (Kindred of the
 *         Ebony Kingdom p. 186, filling in where V20 Dark Ages p. 400 says only that the powers fade).
 *   B5051 the craving: after a month unfed, a roll to hold back from blood, Self-Control at difficulty 7 (V20 Dark
 *         Ages p. 401); an animal rolls Willpower (WoDX Creation B5046). A botch means it must feed at once.
 *   B5052 an animal ghoul with no vitae left ages a year a week until it has caught up; past its natural span it
 *         dies, past twice its span it turns to dust (house pace; V20 Dark Ages p. 400 says only "quickly").
 */
import {DAY, WEEK} from "./terms.mjs";
import * as TERMS from "./terms.mjs";
export {DAY, WEEK};
export const CRAVING_DIFF = 7;

const n = v => Number(v) || 0;

/**
 * What the months take. months: whole months unfed now; warned: months already taken; monthly: vitae a month;
 * pool: blood points now; disciplines: [{id, name, value}]. Returns {pool, taken, cuts: [{id, name, from, to}], empty}.
 */
export function drain({months = 0, warned = 0, monthly = 1, pool = 0, disciplines = []} = {}) {
  let p = Math.max(0, n(pool)), taken = 0;
  const ds = disciplines.map(d => ({...d, value: n(d.value)})).filter(d => d.value > 0);
  const cuts = new Map();
  for ( let m = n(warned); m < n(months); m++ ) {
    if ( p > 0 ) { const t = Math.min(p, Math.max(1, n(monthly))); p -= t; taken += t; continue; }
    // Potence last; otherwise the highest dot goes first
    const pick = ds.filter(d => d.value > 0).sort((a, b) => (Number(/potence/i.test(a.name)) - Number(/potence/i.test(b.name))) || (b.value - a.value))[0];
    if ( !pick ) break;
    const from = cuts.get(pick.id)?.from ?? pick.value;
    pick.value -= 1;
    cuts.set(pick.id, {id: pick.id, name: pick.name, from, to: pick.value});
  }
  return {pool: p, taken, cuts: [...cuts.values()], empty: p === 0};
}

/**
 * The craving roll's outcome from the dice (d10 faces). Successes are faces at or over the difficulty, less ones;
 * a botch is no success and at least one 1.
 */
export function craving(faces = [], diff = CRAVING_DIFF) {
  const {raw: hits, ones} = TERMS.successes(faces, diff);
  const net = hits - ones;
  if ( hits === 0 && ones > 0 ) return {result: "botch", net};
  return {result: net > 0 ? "held" : "craves", net};
}

/**
 * An animal ghoul's age once its vitae is gone. ageAtGhouling: its age when it first drank; heldOff: years it has
 * lived as a ghoul; emptySince / now: world seconds; span: natural life. Returns {age, caughtUp, state}.
 */
export function ageing({ageAtGhouling = 0, heldOff = 0, emptySince = null, now = 0, span = 13} = {}) {
  const weeks = emptySince === null || emptySince === undefined ? 0 : Math.max(0, Math.floor((n(now) - n(emptySince)) / WEEK));
  const caught = Math.min(weeks, Math.max(0, Math.floor(n(heldOff))));
  const age = n(ageAtGhouling) + caught;
  const state = age >= 2 * span ? "dust" : age >= span ? "dead" : "alive";
  return {age, caughtUp: caught >= Math.floor(n(heldOff)), state};
}
