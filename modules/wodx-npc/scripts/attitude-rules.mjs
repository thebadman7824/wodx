/**
 * WoDX NPC 0.11.0: how one NPC regards one character. The pure parts, so the harness can test them.
 *
 * The steps are the faction standing steps (-3 Hunted to +3 Honoured). The first time a character deals with an NPC,
 * the attitude is taken from the character's standing with the NPC's household (a faction of that name or key), else the
 * first faction the NPC belongs to, else Unknown. From then on it is the NPC's own and moves only on how the characters
 * treat that NPC; later changes to faction standing leave it alone. The books have no such track: house rules,
 * logged in docs/PENDING-REVIEW.md.
 *
 * Stored on the NPC's world actor: flags["wodx-npc"].attitude = {<character actor id>: {step, log: [{at, delta, why}]}}.
 */
import {PEOPLE_STEPS, STANDING} from "./faction-rules.mjs";

export const STEPS = PEOPLE_STEPS;
export const LOG_LIMIT = 20;
const clampStep = n => Math.max(STANDING.min, Math.min(STANDING.max, Math.round(Number(n) || 0)));
export const word = n => STEPS[String(clampStep(n))];
const low = v => String(v ?? "").trim().toLowerCase();

/**
 * The step a first meeting starts from. npc: {household, factions: [names or keys the NPC belongs to]};
 * standing: the character's standing by faction name, key and id, lower case (WoDX NPC's peopleOf).
 * Returns {step, from} where from names the group it came from ("" for none).
 */
export function seedFrom(npc = {}, standing = {}) {
  const st = standing ?? {};
  const h = low(npc.household);
  if ( h && Object.prototype.hasOwnProperty.call(st, h) ) return {step: clampStep(st[h]), from: npc.household};
  for ( const f of npc.factions ?? [] ) {
    const k = low(f);
    if ( k && Object.prototype.hasOwnProperty.call(st, k) ) return {step: clampStep(st[k]), from: f};
  }
  return {step: 0, from: ""};
}

/** The saved entry for a character, or null when they have not met. */
export function entryFor(attitude = {}, charId) {
  const e = attitude?.[charId];
  if ( !e || typeof e !== "object" || !Number.isFinite(Number(e.step)) ) return null;
  return {step: clampStep(e.step), log: Array.isArray(e.log) ? e.log : []};
}

/** The attitude in force: the saved one, else the seed. Returns {step, word, met, from}. */
export function attitudeOf(attitude, charId, seed = {step: 0, from: ""}) {
  const e = entryFor(attitude, charId);
  const step = e ? e.step : clampStep(seed.step);
  return {step, word: word(step), met: !!e, from: e ? "" : seed.from ?? ""};
}

/**
 * A change to apply. delta moves by steps, to sets a step (a number or a step word). The first change seeds the
 * entry first, so the log starts from where the meeting began. Returns the new entry ({step, log}).
 */
export function changed(attitude, charId, {delta = 0, to = null, why = "", at = 0} = {}, seed = {step: 0, from: ""}) {
  const e = entryFor(attitude, charId);
  const log = e ? [...e.log] : [{at, delta: 0, why: seed.from ? `First met: as ${seed.from} regards them` : "First met", step: clampStep(seed.step)}];
  const was = e ? e.step : clampStep(seed.step);
  const target = to === null || to === undefined || to === "" ? null : stepOf(to);
  const step = clampStep(target !== null ? target : was + (Number(delta) || 0));
  log.push({at, delta: step - was, why: String(why ?? "").slice(0, 200), step});
  return {step, log: log.slice(-LOG_LIMIT)};
}

/** A word or a number to a step: "welcome" => 2. Null when it is neither. */
export function stepOf(v) {
  if ( String(v ?? "").trim() !== "" && Number.isFinite(Number(v)) ) return clampStep(v);
  const hit = Object.entries(STEPS).find(([, w]) => w.toLowerCase() === low(v));
  return hit ? Number(hit[0]) : null;
}

/**
 * The difficulty change a social roll against the NPC takes from its attitude: one a step past Unknown, at most two.
 * A friendly NPC is easier to sway (Welcome: -2), a hostile one harder (Hostile: +2). Intimidation ignores it (fear
 * does not need goodwill), so the caller passes {ignore: true}.
 */
export function difficultyShift(step, {ignore = false} = {}) {
  if ( ignore ) return 0;
  return Math.max(-2, Math.min(2, -clampStep(step))) || 0;
}
