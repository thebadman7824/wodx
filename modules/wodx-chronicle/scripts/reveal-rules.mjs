/**
 * Twists on the table, the rules (Rothenstein Rebuilt, Volume Three picks x1, x2 and x5, B6650-B6659). Pure functions
 * over podState.saga.reveals; reveals.mjs puts them on the map. Data in data/twist-reveals-rothenstein.mjs.
 *
 * State: {debts: {who: {from, what, at, called}}, murders: {name: at}, cold: at | null, sounds: {n: {scene, text, until}}}.
 */
import {REVEALS, JUDGED_FAVOURS, MURDERS, COLD} from "../data/twist-reveals-rothenstein.mjs";
import {TWISTS} from "../data/twists-rothenstein.mjs";
import {CHAPTERS, chapterNow, frontOf, judgementOf} from "./front-rules.mjs";

export {REVEALS, JUDGED_FAVOURS, MURDERS, COLD};
const idx = k => CHAPTERS.indexOf(k);
const DOS = ["comes", "runs", "talk", "push", "step", "lean"];

export function normState(s = {}) {
  return {debts: {...(s?.debts ?? {})}, murders: {...(s?.murders ?? {})}, cold: s?.cold ?? null, sounds: {...(s?.sounds ?? {})}};
}
/** What revealing twist n shows, and what its people do, for the heart chosen. */
export const showOf = n => REVEALS[Number(n)]?.show ?? null;
export const afterOf = (n, variant = "") => (REVEALS[Number(n)]?.after ?? []).filter(a => !a.variant || a.variant === variant);
export const favourOf = n => REVEALS[Number(n)]?.favour ?? null;

/** Someone owes the company: a debt to call in from a chapter. Owing twice does not double it. */
export function owe(st, {who, from = "c1", what = ""} = {}, now = 0) {
  if ( !who || st.debts[who] ) return st;
  return {...st, debts: {...st.debts, [who]: {from, what, at: now, called: null}}};
}
/** Why a debt cannot be called in now, or "". */
export function whyNotCall(st, who, played = []) {
  const d = st.debts[who];
  if ( !d ) return "Nobody of that name owes the company.";
  if ( d.called !== null && d.called !== undefined ) return "Already called in.";
  const ch = chapterNow(played);
  if ( ch && idx(d.from) > idx(ch) ) return `It can be called in from chapter ${idx(d.from) + 1}.`;
  return "";
}
export function call(st, who, {now = 0, played = []} = {}) {
  const why = whyNotCall(st, who, played);
  if ( why ) throw new Error(why);
  return {...st, debts: {...st.debts, [who]: {...st.debts[who], called: now}}};
}
/** A favour from a judgement: the one that applies to this choice, or null. */
export const judgedFavour = (key, choice) => JUDGED_FAVOURS.find(f => f.judgement === key && f.choice === choice) ?? null;

/** One of the three murders. Returns {state, count, cold}: cold is true the moment the third is done. */
export function murder(st, name, now = 0) {
  if ( !MURDERS.includes(name) ) return {state: st, count: Object.keys(st.murders).length, cold: false};
  const murders = {...st.murders, [name]: st.murders[name] ?? now};
  const count = Object.keys(murders).length, turns = count >= MURDERS.length && !st.cold;
  return {state: {...st, murders, cold: turns ? now : st.cold}, count, cold: turns};
}
export function unmurder(st, name) {
  const murders = {...st.murders}; delete murders[name];
  return {...st, murders, cold: Object.keys(murders).length >= MURDERS.length ? st.cold : null};
}

export function validate() {
  const out = [];
  for ( const t of TWISTS ) {
    const r = REVEALS[t.n];
    if ( !r ) { out.push(`${t.n}: no reveal`); continue; }
    const s = r.show ?? {};
    if ( !s.item && !s.sight && !s.sound ) out.push(`${t.n}: nothing shown`);
    if ( s.item && (!s.item.name || !s.item.text) ) out.push(`${t.n}: item`);
    if ( s.sight && (!s.sight.scene || !s.sight.looks?.length) ) out.push(`${t.n}: sight`);
    if ( s.sound && (!s.sound.scene || !s.sound.text) ) out.push(`${t.n}: sound`);
    if ( !r.after?.length ) out.push(`${t.n}: nobody acts`);
    for ( const a of r.after ?? [] ) {
      if ( !DOS.includes(a.do) ) out.push(`${t.n}: ${a.do}`);
      if ( ["comes", "runs", "lean"].includes(a.do) && !a.who ) out.push(`${t.n}: ${a.do} without who`);
      if ( a.do === "comes" && !a.preset ) out.push(`${t.n}: comes without a routine`);
      if ( a.do === "talk" && !a.text ) out.push(`${t.n}: talk`);
      if ( ["push", "step"].includes(a.do) && !frontOf(a.front) ) out.push(`${t.n}: front ${a.front}`);
      if ( a.do === "step" && !frontOf(a.front)?.steps.some(x => x.key === a.step) ) out.push(`${t.n}: step ${a.step}`);
      if ( a.variant && !t.variants?.[a.variant] ) out.push(`${t.n}: variant ${a.variant}`);
    }
    if ( r.favour && (!r.favour.who || idx(r.favour.from) < 0) ) out.push(`${t.n}: favour`);
  }
  for ( const f of JUDGED_FAVOURS ) if ( !judgementOf(f.judgement)?.choices?.[f.choice] ) out.push(`judged favour ${f.who}`);
  if ( MURDERS.length !== 3 ) out.push("three murders");
  return out;
}
