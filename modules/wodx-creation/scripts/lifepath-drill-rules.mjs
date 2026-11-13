/**
 * WoDX Creation: the drill-down lifepath's rules (Ben, 13 November 2026). Pure: no Foundry here.
 *
 * A drill is {v, birthYear, age, line, picks {step id: pick}, place {stage id: region id}}. The steps run continent,
 * region, origin, two picks for childhood, two for the teenage years (from 12), two for each chapter of adult life the
 * character is old enough for (from 18). Every list reads the region the stage happened in, the year of that stage
 * and the origin picked. age is the age at the turn for the changed, or the age when play starts for mortals.
 */

import {WORLD_REGIONS, regionOf, hasPeopleIn, DEFAULT_REGION} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {CONTINENTS, ORIGINS, HOME, CMARK, TPATH, TMARK, CALL, AMARK, LOCAL, CHAPTERS, ARRIVALS} from "../data/lifepath-drill.mjs";
import {parseGives, KINDS} from "./lifepath-rules.mjs";

export {CONTINENTS, CHAPTERS, ARRIVALS};
export const VERSION = 1;
export const AGE_MIN = 1, AGE_MAX = 120;
export const TEEN_FROM = 12, ADULT_FROM = 18;

const num = v => (Number.isFinite(Number(v)) && v !== null && v !== "") ? Math.trunc(Number(v)) : null;
export const slug = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** The era group a year reads its local lists from. */
export function eraGroup(year) {
  const y = num(year) ?? 1200;
  return y < 1500 ? "M" : y < 1789 ? "E" : y < 1946 ? "I" : y < 2023 ? "N" : "F";
}

/** The continents with their regions; named says whether WoDX has name lists for the region's people that year. */
export function continents(year = null) {
  return CONTINENTS.map(([label, ids]) => ({id: slug(label), label,
    regions: ids.filter(id => regionOf(id)).map(id => ({id, label: WORLD_REGIONS[id].label, named: hasPeopleIn(id, year)}))}));
}

export const continentOf = regionId => continents().find(c => c.regions.some(r => r.id === regionId)) ?? null;

/** The local lists of a region in a year, or null when none are written yet. */
export function localOf(regionId, year) {
  const L = LOCAL[regionId]?.[eraGroup(year)];
  return L ? {age: L[0], origins: L[1] ?? [], teen: L[2] ?? null, adult: L[3] ?? null} : null;
}

/** A fresh drill. */
export function newDrill({birthYear, age = 25, line = "mortal"} = {}) {
  const a = Math.max(AGE_MIN, Math.min(AGE_MAX, num(age) ?? 25));
  return {v: VERSION, birthYear: num(birthYear) ?? 1200, age: a, line: String(line || "mortal"), picks: {}, place: {}};
}

/** The stages a character of this age lives through: childhood, teens from 12, an adult chapter from 18, 30, 45, 60. */
export function stagesFor(age) {
  const a = num(age) ?? 0;
  const out = [{id: "c", kind: "child", from: 0, to: Math.min(11, a)}];
  if ( a >= TEEN_FROM ) out.push({id: "t", kind: "teen", from: TEEN_FROM, to: Math.min(17, a)});
  CHAPTERS.forEach(([from, label], i) => {
    if ( a >= from ) out.push({id: `a${i}`, kind: "adult", from, to: Math.min((CHAPTERS[i + 1]?.[0] ?? AGE_MAX + 1) - 1, a), label});
  });
  return out;
}

/** Why the later stages are closed, for the window; "" when adult life is open. */
export function closedNote(age) {
  const a = num(age) ?? 0;
  if ( a < TEEN_FROM ) return `Not yet ${TEEN_FROM}: the teenage years and adult life are closed.`;
  if ( a < ADULT_FROM ) return `Not yet ${ADULT_FROM}: adult life is closed.`;
  return "";
}

const fitsRow = (x = {}, year, base) => (!x.from || year >= x.from) && (!x.to || year <= x.to)
  && (!x.bases || x.bases.includes(base)) && (!x.not || !x.not.includes(base));
const opt = (label, g, extra = {}) => ({id: slug(label), label, g: g ?? "", text: "", ...extra});
const shared = (list, year, base) => list.filter(o => fitsRow(o[2], year, base)).map(o => opt(o[0], o[1]));

/** The origins open in a region and year: the local ones first, then the shared list. */
export function originsFor(regionId, year) {
  const L = localOf(regionId, year);
  return [
    ...(L?.origins ?? []).map(o => opt(o[0], o[1], {base: o[2], local: true})),
    ...ORIGINS.filter(o => (!o[4] || year >= o[4]) && (!o[5] || year <= o[5])).map(o => opt(o[1], o[3], {text: o[2], base: o[0]}))
  ];
}

/**
 * Every step of the drill in order, each with its options. A step whose earlier steps are not picked yet is not
 * listed, so the last step listed and not picked is the one to show. end: every step open to this age is picked.
 */
export function stepsOf(drill) {
  const P = drill.picks ?? {}, born = drill.birthYear, steps = [];
  const out = (end = false, here = null) => ({steps, end, here, closed: closedNote(drill.age)});
  steps.push({id: "continent", kind: "continent", title: "Continent", year: born, options: continents(born).map(c => ({id: c.id, label: c.label, g: "", text: `${c.regions.length} regions`}))});
  if ( !P.continent ) return out();
  const cont = continents(born).find(c => c.id === P.continent.id);
  steps.push({id: "region", kind: "region", title: "Region", year: born, search: true,
    options: (cont?.regions ?? []).map(r => ({id: r.id, label: r.label, g: "", text: r.named ? "" : "WoDX has no name lists for this land in this year yet. Name the people yourself.", local: !!localOf(r.id, born)}))});
  if ( !P.region ) return out();
  const home = P.region.id;
  steps.push({id: "origin", kind: "origin", title: "Origin", year: born, region: home, age: localOf(home, born)?.age ?? "", options: originsFor(home, born)});
  if ( !P.origin ) return out();
  const base = P.origin.base ?? "trade";
  let here = home;
  for ( const st of stagesFor(drill.age) ) {
    here = (drill.place?.[st.id] && regionOf(drill.place[st.id])) ? drill.place[st.id] : here;
    const year = born + st.from, L = localOf(here, year);
    const common = {stage: st.id, year, region: here, age: L?.age ?? "", from: st.from, to: st.to, movable: st.kind !== "child"};
    const [first, second, title, local] = st.kind === "child" ? [HOME, CMARK, "Childhood", null]
      : st.kind === "teen" ? [TPATH, TMARK, "Teenage years", L?.teen] : [CALL, AMARK, `Adult life, ${st.label}`, L?.adult];
    const lead = st.kind === "child" ? "who raised you" : st.kind === "teen" ? "what you were set to" : "how you lived";
    steps.push({...common, id: `${st.id}-path`, kind: `${st.kind}-path`, title: `${title}: ${lead}`,
      options: [...(local ? [opt(local[0], local[1], {local: true})] : []), ...shared(first, year, base)]});
    if ( !P[`${st.id}-path`] ) return out();
    steps.push({...common, movable: false, id: `${st.id}-mark`, kind: `${st.kind}-mark`, title: `${title}: what marked those years`, options: shared(second, year, base)});
    if ( !P[`${st.id}-mark`] ) return out();
  }
  return out(true, here);
}

/** The step waiting for a pick, or null when the drill is done. */
export function current(drill) {
  return stepsOf(drill).steps.find(s => !drill.picks?.[s.id]) ?? null;
}
export const done = drill => stepsOf(drill).end;

/** Where the character last lived. */
export const lastHome = drill => stepsOf(drill).here ?? drill.picks?.region?.id ?? null;
/** True when the last home is not the chronicle's homeland, so the arrival question is asked. */
export const fromAbroad = (drill, homeland = DEFAULT_REGION) => { const h = lastHome(drill); return !!h && h !== homeland; };

function dropAfter(drill, stepId) {
  const ids = stepsOf(drill).steps.map(s => s.id), i = ids.indexOf(stepId);
  const picks = {};
  for ( const [k, v] of Object.entries(drill.picks ?? {}) ) { const j = ids.indexOf(k); if ( j >= 0 && j < i ) picks[k] = v; }
  return picks;
}

/** Pick an option of a step by its id. Later picks are dropped, since their lists depend on this one. */
export function pick(drill, stepId, optionId) {
  const step = stepsOf(drill).steps.find(s => s.id === stepId);
  const o = step?.options.find(x => x.id === optionId);
  if ( !step || !o ) return drill;
  const picks = dropAfter(drill, stepId);
  picks[stepId] = {id: o.id, label: o.label, g: o.g, ...(o.base ? {base: o.base} : {}), ...(o.local ? {local: true} : {})};
  const place = (stepId === "continent" || stepId === "region") ? {} : {...drill.place};
  return {...drill, picks, place};
}

/** The player's own answer for a step ("Something else"). gives: a gives string picked from the full lists. */
export function pickOwn(drill, stepId, label, {gives = "", base = null} = {}) {
  const text = String(label ?? "").trim();
  const step = stepsOf(drill).steps.find(s => s.id === stepId);
  if ( !step || !text || step.kind === "continent" || step.kind === "region" ) return drill;
  const picks = dropAfter(drill, stepId);
  picks[stepId] = {id: `own:${slug(text)}`, label: text, g: String(gives ?? ""), own: true, ...(stepId === "origin" ? {base: base ?? "trade"} : {})};
  return {...drill, picks};
}

/** Take a pick back, and every pick after it. */
export function unpick(drill, stepId) {
  const place = (stepId === "continent" || stepId === "region") ? {} : {...drill.place};
  return {...drill, picks: dropAfter(drill, stepId), place};
}

/** Set where a stage happened (teens or an adult chapter). That stage's picks and the later ones are dropped. */
export function moveTo(drill, stageId, regionId) {
  if ( !regionOf(regionId) || !stagesFor(drill.age).some(s => s.id === stageId && s.kind !== "child") ) return drill;
  const picks = dropAfter(drill, `${stageId}-path`);
  const place = {...drill.place, [stageId]: regionId};
  return {...drill, picks, place};
}

/** True when any pick is the player's own writing, so the Storyteller looks at it first. */
export const hasOwn = drill => Object.values(drill.picks ?? {}).some(p => p.own);

/** Everything the picks offer, each once, with the steps that offered it. */
export function pool(drill) {
  const {steps} = stepsOf(drill), gives = new Map();
  for ( const s of steps ) {
    const p = drill.picks?.[s.id];
    if ( !p ) continue;
    for ( const g of parseGives(p.g) ) {
      const key = `${g.kind}:${g.name.toLowerCase()}`;
      if ( !gives.has(key) ) gives.set(key, {...g, key, from: []});
      gives.get(key).from.push(s.title);
    }
  }
  const order = Object.keys(KINDS);
  return [...gives.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
}

/** The life so far, one line per pick after the continent. */
export function story(drill) {
  return stepsOf(drill).steps.filter(s => s.id !== "continent" && drill.picks?.[s.id]).map(s => ({
    step: s.id, title: s.title, year: s.year, region: s.region ?? (s.id === "region" ? drill.picks.region.id : null),
    regionLabel: s.region ? WORLD_REGIONS[s.region]?.label ?? "" : "", age: s.age ?? "", choice: drill.picks[s.id].label, own: !!drill.picks[s.id].own}));
}

/** Problems in the lists (the harness runs this). */
export function lint() {
  const bad = [];
  const seen = new Set();
  for ( const [label, ids] of CONTINENTS ) for ( const id of ids ) {
    if ( !regionOf(id) ) bad.push(`${label}: unknown region ${id}`);
    if ( seen.has(id) ) bad.push(`${id} is on two continents`);
    seen.add(id);
  }
  for ( const id of Object.keys(WORLD_REGIONS) ) if ( !seen.has(id) ) bad.push(`${id} is on no continent`);
  const bases = new Set(ORIGINS.map(o => o[0]));
  const gives = (g, where) => { for ( const x of parseGives(g) ) if ( !x.name ) bad.push(`${where}: empty gain`); if ( !g ) bad.push(`${where}: gives nothing`); };
  const uniq = (rows, where) => { const s = new Set(); for ( const r of rows ) { const k = slug(r); if ( !k ) bad.push(`${where}: empty label`); if ( s.has(k) ) bad.push(`${where}: "${r}" twice`); s.add(k); } };
  uniq(ORIGINS.map(o => o[1]), "origins");
  for ( const o of ORIGINS ) gives(o[3], `origin ${o[1]}`);
  for ( const [name, list] of Object.entries({HOME, CMARK, TPATH, TMARK, CALL, AMARK}) ) {
    uniq(list.map(o => o[0]), name);
    for ( const o of list ) {
      gives(o[1], `${name} ${o[0]}`);
      for ( const b of [...(o[2]?.bases ?? []), ...(o[2]?.not ?? [])] ) if ( !bases.has(b) ) bad.push(`${name} ${o[0]}: unknown origin ${b}`);
    }
  }
  for ( const [rid, groups] of Object.entries(LOCAL) ) {
    if ( !regionOf(rid) ) bad.push(`local: unknown region ${rid}`);
    for ( const [g, L] of Object.entries(groups) ) {
      const where = `local ${rid} ${g}`;
      if ( !"MEINF".includes(g) ) bad.push(`${where}: unknown era group`);
      if ( !L[0] ) bad.push(`${where}: no age name`);
      uniq([...L[1].map(o => o[0]), ...ORIGINS.map(o => o[1])], `${where} origins`);
      for ( const o of L[1] ) { gives(o[1], `${where} ${o[0]}`); if ( !bases.has(o[2]) ) bad.push(`${where} ${o[0]}: unknown origin ${o[2]}`); }
      if ( L[2] ) { gives(L[2][1], `${where} teen`); if ( TPATH.some(o => slug(o[0]) === slug(L[2][0])) ) bad.push(`${where}: teen path repeats a shared one`); }
      if ( L[3] ) { gives(L[3][1], `${where} adult`); if ( CALL.some(o => slug(o[0]) === slug(L[3][0])) ) bad.push(`${where}: calling repeats a shared one`); }
    }
  }
  return bad;
}
