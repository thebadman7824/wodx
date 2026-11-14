/**
 * WoDX Chronicle 0.37.0: pure rules for the four Princes of Darkness ideas (city exposure, great cities, Golconda as
 * a long road, story chains). No Foundry calls here, so the harness can test them.
 */
import * as D from "../data/pod.mjs";
export * from "../data/pod.mjs";
import * as LPD from "../data/pod-lifepath.mjs";
import * as S from "./saga-rules.mjs";
export * as saga from "./saga-rules.mjs";
export {LP_CHAINS, LP_DAYS, meansFor} from "../data/pod-lifepath.mjs";

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

export const chainByKey = k => S.isSagaKey(k) ? S.bookChain(S.bookOfKey(k)) : D.CHAINS.find(c => c.key === k) ?? null;
/** Chains that fit a year and the lines in play ("all" fits every line). */
export function chainsFor(year, lines = []) {
  return D.CHAINS.filter(c => year >= c.from && year <= c.to && (c.lines.includes("all") || !lines.length || c.lines.some(l => lines.includes(l))));
}
/* ---------------- lifepath threads as story chains (cr2, B2300 to B2304) ---------------- */

/** Mortals further back than this are dead by the year of play, and an heir carries the thread (B2302). */
export const LP_ALIVE_SPAN = 70;
/** The undying from this far back have had time to grow strong, or to fall under something older (B2302). */
export const LP_OLD_SPAN = 150;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** A lifepath's "your sire", "who owes you" told of the character instead: "Jana's sire", "who owes Jana". */
export const third = (text = "", name = "the character") => String(text).replace(/\byour\b/gi, `${name}'s`).replace(/\byou\b/gi, name);

/** Who comes back: the NPC's name with the role, or the role; an heir when a mortal is long dead. */
export function lpWho(lp = {}, year = null) {
  const role = third(lp.role || "someone from the past", lp.actorName || "the character");
  const base = lp.name ? `${lp.name} (${role})` : role;
  const gap = Number(year) - Number(lp.year);
  if ( !lp.undying && Number.isFinite(gap) && gap > LP_ALIVE_SPAN ) return {who: `a descendant of ${base}`, heir: true, gap};
  return {who: base, heir: false, gap: Number.isFinite(gap) ? gap : null};
}

/** A lifepath run's chain, written for the year of play. run.lp = the thread plus {actorName}. */
export function lpChain(run = {}, year = null) {
  const lp = run.lp ?? {}, tpl = LPD.LP_CHAINS[lp.kind];
  if ( !tpl ) return null;
  const {who, heir, gap} = lpWho(lp, year), m = LPD.meansFor(year);
  const name = lp.actorName || "the character";
  const fill = t => t.replaceAll("{seek}", m.seek).replaceAll("{word}", m.word).replaceAll("{Who}", cap(who)).replaceAll("{who}", who)
    .replaceAll("{name}", name).replaceAll("{where}", run.where || "the city").replaceAll("{turning}", lp.turning || "the change");
  const past = `From ${name}'s past (${lp.year}, ${lp.scene || "the lifepath"}): ${third(lp.role, name)}${lp.note ? `, ${third(lp.note, name)}` : ""}.`;
  const age = heir ? ` ${cap(third(lp.role, name))} is long dead; the thread passed down the family.`
    : lp.undying && gap !== null && gap > LP_OLD_SPAN && ["enemy", "rival", "debt", "secret"].includes(lp.kind) ? ` ${gap} years on, they are far stronger, and may now be the pawn of something older.`
    : !lp.undying && gap !== null && gap >= 40 ? " They are old now." : "";
  const steps = tpl.steps.map((s, i) => ({...s, text: (i === 0 ? `${past}${age} ` : "") + fill(s.text)}));
  return {key: run.key, label: `${tpl.label}: ${name}`, lines: ["all"], from: 0, to: 99999, page: LPD.LP_PAGE, steps};
}

/** Any running chain, a preset or a lifepath one. */
export const chainOf = (run = {}, year = null) => run.lp ? lpChain(run, year)
  : run.saga ? S.bookChain(run.saga.book, run.saga.endings ?? {}) : chainByKey(run.key);

/**
 * The next thread to put to the Storyteller, or null. st = {since, last, seen: {id: status}}; threads from
 * Creation. The first falls due LP_DAYS.first days after the character is first seen, each next LP_DAYS.gap
 * days after the last was put (B2301).
 */
export function lpNext(st = {}, threads = [], t = 0) {
  const seen = st.seen ?? {};
  const open = threads.filter(x => !seen[x.id]);
  if ( !open.length ) return null;
  const due = st.last ? st.last + LPD.LP_DAYS.gap * DAY : (Number(st.since) || 0) + LPD.LP_DAYS.first * DAY;
  return t >= due ? open[0] : null;
}

/** A running chain's next step and when it falls due. */
export function nextStep(run = {}, year = null) {
  const c = chainOf(run, year);
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
