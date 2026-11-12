/**
 * WoDX Chronicle 0.37.0: pure rules for the four Princes of Darkness ideas (city exposure, great cities, Golconda as
 * a long road, story chains). No Foundry calls here, so the harness can test them.
 */
import * as D from "../data/pod.mjs";
export * from "../data/pod.mjs";

const DAY = 86400;
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/* ---------------- city exposure ---------------- */

/** Exposure after quiet days: one point off for each QUIET_DAYS since the last change. */
export function exposureNow(rec = {}, now = 0) {
  const v = Math.max(0, Number(rec.value) || 0), at = Number(rec.at) || 0;
  if ( !v || now <= at ) return v;
  return Math.max(0, v - Math.floor((now - at) / (D.QUIET_DAYS * DAY)));
}
export const bandOf = v => [...D.EXPOSURE_BANDS].reverse().find(b => v >= b.min) ?? D.EXPOSURE_BANDS[0];
const bandIndex = key => D.EXPOSURE_BANDS.findIndex(b => b.key === key);
/** What one breach adds: one, one more for each witness past the first (up to two more), one more once news is printed, two more on camera. */
export function breachPoints({witnesses = 1, year = 0, camera = false} = {}) {
  return 1 + Math.min(2, Math.max(0, (Number(witnesses) || 1) - 1)) + (year >= D.PRINT_YEAR ? 1 : 0) + (camera ? 2 : 0);
}
/** The sect law of a city, by its record or the age (the Church of Caine before the Camarilla). */
export function lawOf(rec = {}, year = 0) {
  const k = rec.sect && D.SECT_LAW[rec.sect] ? rec.sect : (year && year < 1435 ? "church" : "camarilla");
  return {key: k, ...D.SECT_LAW[k]};
}
/** Add points to a city's record. Returns the new record and whether the court and the hunters should stir. */
export function raise(rec = {}, points, now, year = 0) {
  const before = exposureNow(rec, now), value = Math.max(0, before + points);
  const b0 = bandOf(before), b1 = bandOf(value), law = lawOf(rec, year);
  const up = bandIndex(b1.key) > bandIndex(b0.key);
  return {rec: {...rec, value, at: now}, before, value, band: b1, crossed: up,
    court: up && bandIndex(b1.key) >= bandIndex(law.acts) && bandIndex(b0.key) < bandIndex(law.acts),
    hunters: up && b1.key === "hunted"};
}

/* ---------------- great cities ---------------- */

export function cityByName(name) {
  const n = norm(name);
  if ( !n ) return null;
  return D.CITIES.find(c => norm(c.label) === n || c.key === n || (c.also ?? []).some(x => norm(x) === n)) ?? null;
}
/** A city's state in a year: the last state that has begun. */
export function stateAt(city, year) {
  const c = typeof city === "string" ? cityByName(city) : city;
  if ( !c ) return null;
  return [...c.states].filter(s => s.from <= year).at(-1) ?? c.states[0];
}
/** Lines for the Senses module: a smell and a sound for the city's state. */
export function senseLines(state) {
  if ( !state ) return null;
  const out = {};
  if ( state.smell ) out.smell = [{t: `The air of the city: ${state.smell}.`, n: 0}];
  if ( state.sound ) out.sound = [{t: `Under it all, the city: ${state.sound}.`, n: 1}];
  return Object.keys(out).length ? out : null;
}

/* ---------------- Golconda ---------------- */

export function golcondaStep(rec = {}, delta) {
  const step = Math.max(0, Math.min(D.GOLCONDA_STEPS, (Number(rec.step) || 0) + delta));
  return {...rec, step};
}
/** A killing from the damage hook: the target was alive before and is past Incapacitated now (seven levels). */
export function killed(before = {}, after = {}, max = 7) {
  const hurt = d => (Number(d?.lethal) || 0) + (Number(d?.aggravated) || 0);
  return hurt(before) < max && hurt(after) >= max;
}
/** Feeding that harms: three or more blood points from one vessel, or taken by force. */
export const harmfulFeed = ({drunk = 0, willing = true, fought = false} = {}) => Number(drunk) >= 3 || fought || willing === false;
/** Whole mentor terms since the last step a mentor gave. */
export const mentorTerms = (since, now) => since && now > since ? Math.floor((now - since) / (D.MENTOR_DAYS * DAY)) : 0;

/* ---------------- story chains and goals ---------------- */

export const chainByKey = k => D.CHAINS.find(c => c.key === k) ?? null;
/** Chains that fit a year and the lines in play ("all" fits every line). */
export function chainsFor(year, lines = []) {
  return D.CHAINS.filter(c => year >= c.from && year <= c.to && (c.lines.includes("all") || !lines.length || c.lines.some(l => lines.includes(l))));
}
/** A running chain's next step and when it falls due. */
export function nextStep(run = {}) {
  const c = chainByKey(run.key);
  if ( !c ) return null;
  const i = Number(run.at) || 0;
  if ( i >= c.steps.length ) return null;
  const s = c.steps[i];
  return {...s, index: i, due: (Number(run.last) || 0) + s.days * DAY, last: i === c.steps.length - 1};
}
export function goalsFor(line, year) {
  const l = D.GOALS[line] ? line : "mortal";
  return D.GOALS[l][year >= 1800 ? 1 : 0];
}
