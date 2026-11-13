/**
 * WoDX Creation 0.17.0: the drill-down lifepath's rules (Ben, 13 November 2026; Lifepath Drill-down Desk). Pure: no
 * Foundry here.
 *
 * A drill is {v, birthYear, age, line, homeland, seed, picks {step id: pick}, place {stage id: region id}, rerolls
 * {step id: n}, placeName}. The steps run continent, region, your people (where more than one lives there), origin,
 * then two picks for childhood, the teenage years and each chapter of adult life the character is old enough for,
 * then what brought the character to the chronicle's homeland when the last home is elsewhere. The first pick of a
 * stage and the second each show five things: two good, two hard, one neither, with five others on request.
 * Every list reads the region the stage happened in, the year of that stage and the origin picked. age is the age at
 * the turn for the changed, or the age when play starts for mortals. The coming of age moves with era and region.
 */

import {WORLD_REGIONS, regionOf, hasPeopleIn, mixFor, DEFAULT_REGION} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {LOCAL_EVENTS} from "../data/lifepath-local-events.mjs";
import {OFFWORLD, OFFWORLD_AGE, OFFWORLD_NOT, SINCE, SINCE_MIN, CONTINENTS, ORIGINS, HOME, CMARK, TPATH, TMARK, CALL, AMARK, LOCAL, CHAPTERS, ARRIVALS, COMING_OF_AGE, REGION_COMING_OF_AGE,
  PEOPLE_LABELS} from "../data/lifepath-drill.mjs";

export {CONTINENTS, CHAPTERS, ARRIVALS};
export const VERSION = 1;
export const AGE_MIN = 1, AGE_MAX = 120;
export const KINDS = {bg: "Background", ab: "Ability", merit: "Merit", flaw: "Flaw", note: "Note"};
export const TONES = {"+": "Good fortune", "-": "Hard times", "0": "Neither"};
export const MARK_SHAPE = {"+": 2, "-": 2, "0": 1};

const num = v => (Number.isFinite(Number(v)) && v !== null && v !== "") ? Math.trunc(Number(v)) : null;
export const slug = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** "bg Allies|ab Crafts|flaw Enemy" -> [{kind, name}]. Unknown kinds become notes. */
export function parseGives(g) {
  if ( !g ) return [];
  return String(g).split("|").map(s => s.trim()).filter(Boolean).map(s => {
    const sp = s.indexOf(" ");
    const k = sp > 0 ? s.slice(0, sp) : s;
    return KINDS[k] && sp > 0 ? {kind: k, name: s.slice(sp + 1).trim()} : {kind: "note", name: s};
  });
}

/** The era group a year reads its local lists from. */
export function eraGroup(year) {
  const y = num(year) ?? 1200;
  return y < 1500 ? "M" : y < 1789 ? "E" : y < 1946 ? "I" : y < 2023 ? "N" : "F";
}
const WORLD_GROUP = {M: "medieval", E: "early-modern", I: "industrial", N: "modern", F: "modern"};

/** The continents with their regions; named says whether WoDX has name lists for the region's people that year. */
export function continents(year = null, now = null) {
  return CONTINENTS.map(([label, ids]) => ({id: slug(label), label,
    regions: ids.filter(id => regionOf(id) || (OFFWORLD[id] && year !== null && offworldOpen(id, year, now))).map(id => ({id, label: labelOf(id), named: !!regionOf(id) && hasPeopleIn(id, year)}))}))
    .filter(c => c.regions.length);
}
/** A land a lifepath can name: a world region, or a place beyond Earth (off: true). */
export const landOf = id => regionOf(id) ?? (id && Object.hasOwn(OFFWORLD, id) ? {id, ...OFFWORLD[id], off: true} : null);
export const labelOf = id => landOf(id)?.label ?? "";
/** Whether a land is there to be born or live in: Earth always; beyond Earth only in the future age and from the land's first year. */
export const offworldOpen = (id, year, now = null) => !OFFWORLD[id] || ((num(now) ?? num(year) ?? 0) >= OFFWORLD_AGE && (num(year) ?? 0) >= OFFWORLD[id].from);
/** Every land in every age, Earth and beyond, for the Storyteller's limits and the checks. */
export const allLands = () => CONTINENTS.map(([label, ids]) => ({id: slug(label), label, regions: ids.filter(id => landOf(id)).map(id => ({id, label: labelOf(id)}))}));
export const continentOf = regionId => allLands().find(c => c.regions.some(r => r.id === regionId)) ?? null;

/** The local lists of a region in a year, or null when none are written yet. */
export function localOf(regionId, year) {
  const L = LOCAL[regionId]?.[eraGroup(year)];
  return L ? {age: L[0], origins: L[1] ?? [], teen: L[2] ?? null, adult: L[3] ?? null} : null;
}

/** The peoples of a region in a year, most numerous first: [{id, label}]. Empty when the region has one people only. */
export function peoplesOf(regionId, year) {
  const mix = mixFor(regionId, WORLD_GROUP[eraGroup(year)]) ?? [];
  return mix.map(([k]) => ({id: k, label: PEOPLE_LABELS[k] ?? k.replace(/^\w/, c => c.toUpperCase())}));
}

/** When the teenage years and adult life start for someone born in this region and year. */
export function comingOfAge(regionId, birthYear) {
  const g = eraGroup((num(birthYear) ?? 1200) + 14);
  const adult = REGION_COMING_OF_AGE[regionId]?.[g] ?? COMING_OF_AGE[g] ?? 18;
  return {teen: adult <= 14 ? 10 : 12, adult};
}

/** A fresh drill. homeland: the chronicle's own region, for the arrival question (none asked when not given). */
export function newDrill({birthYear, age = 25, line = "mortal", homeland = null, seed = "wodx", limits = null, now = null} = {}) {
  const a = Math.max(AGE_MIN, Math.min(AGE_MAX, num(age) ?? 25));
  const L = cleanLimits(limits);
  return {v: VERSION, birthYear: num(birthYear) ?? 1200, age: a, line: String(line || "mortal"), homeland: regionOf(homeland) ? homeland : null,
    seed: String(seed), picks: {}, place: {}, rerolls: {}, placeName: "", ...(L ? {limits: L} : {}), ...(num(now) !== null ? {now: num(now)} : {})};
}

/** The Storyteller's limits for a chronicle: {regions (only these; empty means all), noBases (origin kinds left out)}. Null when nothing is limited. */
export function cleanLimits(limits) {
  const regions = [...new Set((limits?.regions ?? []).filter(id => landOf(id)))];
  const all = new Set(ORIGINS.map(o => o[7] ?? o[0]));
  const noBases = [...new Set((limits?.noBases ?? []).filter(b => all.has(b)))];
  return regions.length || noBases.length ? {regions, noBases} : null;
}
/** Is a region open under a drill's limits? The chronicle's homeland always is. */
export const regionOpen = (drill, id) => !drill.limits?.regions?.length || drill.limits.regions.includes(id) || id === drill.homeland;
/** The continents and regions open under a drill's limits. */
export const openContinents = (drill, year = null) => continents(year, drill.now ?? null).map(c => ({...c, regions: c.regions.filter(r => regionOpen(drill, r.id))})).filter(c => c.regions.length);
/** The origin kinds a Storyteller can leave out: [{key, label}]. */
export const originKinds = () => ORIGINS.filter(o => !o[6]).map(o => ({key: o[0], label: o[1]}));

/** The stages a character of this age lives through. ages: {teen, adult} from comingOfAge. */
export function stagesFor(age, ages = {teen: 12, adult: 18}) {
  const a = num(age) ?? 0;
  const out = [{id: "c", kind: "child", from: 0, to: Math.min(ages.teen - 1, a)}];
  if ( a >= ages.teen ) out.push({id: "t", kind: "teen", from: ages.teen, to: Math.min(ages.adult - 1, a)});
  const starts = [ages.adult, ...CHAPTERS.filter(c => c > ages.adult)];
  starts.forEach((from, i) => {
    if ( a < from ) return;
    const next = starts[i + 1] ?? null;
    out.push({id: `a${i}`, kind: "adult", from, to: Math.min((next ?? AGE_MAX + 1) - 1, a), label: next ? `${from} to ${next - 1}` : `${from} and after`});
  });
  return out;
}

/** Why the later stages are closed, for the window; "" when adult life is open. */
export function closedNote(age, ages = {teen: 12, adult: 18}) {
  const a = num(age) ?? 0;
  if ( a < ages.teen ) return `Not yet ${ages.teen}: the teenage years and adult life are closed.`;
  if ( a < ages.adult ) return `Not yet ${ages.adult}, the coming of age in this land and time: adult life is closed.`;
  return "";
}

/** A seeded stream (mulberry32 over a string hash). */
function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for ( const c of String(seed) ) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffled = (list, rand) => { const a = [...list]; for ( let i = a.length - 1; i > 0; i-- ) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const fitsRow = (x = {}, year, base) => (!x.from || year >= x.from) && (!x.to || year <= x.to)
  && (base === "wild" ? (x.bases ? x.bases.includes("wild") : false) : (!x.bases || x.bases.includes(base)))
  && (!x.not || !x.not.includes(base));
const fitsMark = (x = {}, year, base) => (!x.from || year >= x.from) && (!x.to || year <= x.to) && (!x.bases || x.bases.includes(base)) && (!x.not || !x.not.includes(base));
const opt = (label, g, extra = {}) => ({id: slug(label), label, g: g ?? "", text: "", ...extra});
const shared = (list, year, base) => list.filter(o => fitsRow(o[2], year, base)).map(o => opt(o[0], o[1]));

/** Five things that marked a stage: two good, two hard, one neither, drawn by the drill's seed and the re-rolls. */
export function fiveOf(list, year, base, seed, {fits = fitsMark, lead = null, extra = [], front = false} = {}) {
  const rand = rng(seed);
  const fit = list.filter(o => fits(o[2], year, base));
  // extra: dated rows of the land (already fitted to the years). On the first draw one of each tone comes first.
  const by = t => {
    const own = shuffled(extra.filter(o => o[3] === t), rand);
    const head = front ? own.splice(0, 1) : [];
    return [...head, ...shuffled([...fit.filter(o => o[3] === t), ...own], rand)];
  };
  const pools = {"+": by("+"), "-": by("-"), "0": by("0")};
  const out = [];
  for ( const [t, n] of Object.entries(MARK_SHAPE) ) out.push(...pools[t].splice(0, n));
  const rest = [...pools["+"], ...pools["-"], ...pools["0"]];
  while ( out.length < 5 && rest.length ) out.push(rest.shift());
  // lead: a row of this land and age takes the "neither" place (or the last place) on the first draw
  if ( lead ) { const i = out.findIndex(o => o[3] === "0"); out.splice(i < 0 ? out.length - 1 : i, 1, lead); }
  const order = ["+", "0", "-"];
  return out.sort((a, b) => order.indexOf(a[3]) - order.indexOf(b[3])).map(o => opt(o[0], o[1], {tone: o[3], ...(o[4] ? {p: o[4]} : {}), ...(o[5] ? {local: true} : {})}));
}

/** Every way a stage could have been spent in a year for an origin (the list the five are drawn from). kind: child, teen, adult. */
export function pathPool(kind, year, base, regionId = null) {
  const list = kind === "child" ? HOME : kind === "teen" ? TPATH : CALL;
  const L = regionId ? localOf(regionId, year) : null;
  const local = kind === "teen" ? L?.teen : kind === "adult" ? L?.adult : null;
  return [...(local && base !== "wild" ? [opt(local[0], local[1], {tone: "0", local: true})] : []), ...list.filter(o => fitsRow(o[2], year, base)).map(o => opt(o[0], o[1], {tone: o[3]}))];
}

/** The dated things that marked a stage lived in a region between two years: rows in the shape of the mark lists. */
export function datedMarks(regionId, from, to, base = "trade") {
  if ( base === "wild" ) return [];
  return (LOCAL_EVENTS[regionId]?.marks ?? []).filter(m => m[2].some(([a, b]) => a <= to && b >= from)).map(m => [m[0], m[1], {}, m[3], m[4], true]);
}
/** The dated origins of a region for a year of birth. */
export const datedOrigins = (regionId, year) => (LOCAL_EVENTS[regionId]?.origins ?? []).filter(o => year >= o[3] && year <= o[4]);

/** The origins open in a region and year for a line: the line's own births, the local ones, then the shared list. */
export function originsFor(regionId, year, line = "mortal") {
  const L = localOf(regionId, year);
  const off = OFFWORLD[regionId] ? OFFWORLD_NOT : [];
  const rows = ORIGINS.filter(o => (!o[4] || year >= o[4]) && (!o[5] || year <= o[5]) && !off.includes(o[7] ?? o[0]));
  const row = o => opt(o[1], o[3], {text: o[2], base: o[7] ?? o[0], ...(o[6] ? {line: true} : {})});
  return [
    ...rows.filter(o => o[6]?.includes(line)).map(row),
    ...datedOrigins(regionId, year).map(o => opt(o[0], o[1], {base: o[2], local: true})),
    ...(L?.origins ?? []).map(o => opt(o[0], o[1], {base: o[2], local: true})),
    ...rows.filter(o => !o[6]).map(row)
  ];
}

/** The ages of the drill's own land and time. Before a region is picked: the era's. */
export const agesOf = drill => comingOfAge(drill.picks?.region?.id ?? null, drill.birthYear);

/**
 * Every step of the drill in order, each with its options. A step whose earlier steps are not picked yet is not
 * listed, so the first step listed and not picked is the one to show. end: every step open to this age is picked.
 */
export function stepsOf(drill) {
  const P = drill.picks ?? {}, born = drill.birthYear, steps = [];
  const ages = agesOf(drill);
  const out = (end = false, here = null) => ({steps, end, here, ages, closed: closedNote(drill.age, ages)});
  steps.push({id: "continent", kind: "continent", title: "Continent", year: born, options: openContinents(drill, born).map(c => ({id: c.id, label: c.label, g: "", text: `${c.regions.length} ${c.regions.length === 1 ? "region" : "regions"}`}))});
  if ( !P.continent ) return out();
  const cont = openContinents(drill, born).find(c => c.id === P.continent.id);
  steps.push({id: "region", kind: "region", title: "Region", year: born, search: true,
    options: (cont?.regions ?? []).map(r => ({id: r.id, label: r.label, g: "", text: r.named ? "" : "WoDX has no name lists for this land in this year yet. You name the people.", local: !!localOf(r.id, born)}))});
  if ( !P.region ) return out();
  const home = P.region.id;
  const peoples = peoplesOf(home, born), named = hasPeopleIn(home, born);
  if ( peoples.length > 1 || !named ) {
    steps.push({id: "people", kind: "people", title: "Your people", year: born, region: home, own: true,
      options: named ? peoples.map(p => ({id: p.id, label: p.label, g: "", text: ""})) : [{id: "of-this-land", label: landOf(home)?.off ? "Your family's people on Earth" : "A people of this land", g: "", text: "Named with the Storyteller."}]});
    if ( !P.people ) return out();
  }
  steps.push({id: "origin", kind: "origin", title: "Origin", year: born, region: home, age: localOf(home, born)?.age ?? "", own: true, options: originsFor(home, born, drill.line).filter(o => !drill.limits?.noBases?.includes(o.base))});
  if ( !P.origin ) return out();
  const base = P.origin.base ?? "trade";
  let here = home;
  for ( const st of stagesFor(drill.age, ages) ) {
    here = (drill.place?.[st.id] && landOf(drill.place[st.id])) ? drill.place[st.id] : here;
    const year = born + st.from, L = localOf(here, year);
    const common = {stage: st.id, year, region: here, age: L?.age ?? "", from: st.from, to: st.to, own: true};
    const [first, second, title, local] = st.kind === "child" ? [HOME, CMARK, "Childhood", null]
      : st.kind === "teen" ? [TPATH, TMARK, "Teenage years", L?.teen] : [CALL, AMARK, `Adult life, ${st.label}`, L?.adult];
    const lead = st.kind === "child" ? "who raised you" : st.kind === "teen" ? "what you were set to" : "how you lived";
    const pid = `${st.id}-path`, turn = drill.rerolls?.[pid] ?? 0;
    steps.push({...common, id: pid, kind: `${st.kind}-path`, title: `${title}: ${lead}`, movable: st.kind !== "child", five: true,
      options: fiveOf(first, year, base, `${drill.seed}:${pid}:${here}:${turn}`,
        {fits: fitsRow, lead: local && base !== "wild" && turn === 0 ? [local[0], local[1], {}, "0", null, true] : null})});
    if ( !P[pid] ) return out();
    const id = `${st.id}-mark`;
    steps.push({...common, id, kind: `${st.kind}-mark`, title: `${title}: what marked those years`, five: true,
      options: fiveOf(second, year, base, `${drill.seed}:${id}:${here}:${drill.rerolls?.[id] ?? 0}`,
        {extra: datedMarks(here, year, born + st.to, base).filter(m => !Object.entries(P).some(([k, v]) => k !== id && v?.id === slug(m[0]))), front: !(drill.rerolls?.[id] ?? 0)})});
    if ( !P[id] ) return out();
  }
  if ( drill.homeland && here !== drill.homeland ) {
    steps.push({id: "arrival", kind: "arrival", title: `What brought you to ${WORLD_REGIONS[drill.homeland].label}`, year: born + drill.age, region: drill.homeland, own: true,
      options: ARRIVALS.map(a => opt(a, ""))});
    if ( !P.arrival ) return out(false, here);
  }
  return out(true, here);
}

/** The step waiting for a pick, or null when the drill is done. */
export const current = drill => stepsOf(drill).steps.find(s => !drill.picks?.[s.id]) ?? null;
export const done = drill => stepsOf(drill).end;
/** Where the character last lived. */
export const lastHome = drill => stepsOf(drill).here ?? drill.picks?.region?.id ?? null;
export const fromAbroad = (drill, homeland = drill.homeland ?? DEFAULT_REGION) => { const h = lastHome(drill); return !!h && h !== homeland; };

function dropAfter(drill, stepId) {
  const ids = stepsOf(drill).steps.map(s => s.id), i = ids.indexOf(stepId);
  const picks = {};
  for ( const [k, v] of Object.entries(drill.picks ?? {}) ) { const j = ids.indexOf(k); if ( j >= 0 && j < i ) picks[k] = v; }
  return picks;
}
const freshPlace = (drill, stepId) => (stepId === "continent" || stepId === "region") ? {} : {...drill.place};

/** Pick an option of a step by its id. Later picks are dropped, since their lists depend on this one. */
export function pick(drill, stepId, optionId) {
  const step = stepsOf(drill).steps.find(s => s.id === stepId);
  const o = step?.options.find(x => x.id === optionId);
  if ( !step || !o ) return drill;
  const picks = dropAfter(drill, stepId);
  picks[stepId] = {id: o.id, label: o.label, g: o.g, ...(o.text && step.kind === "origin" ? {text: o.text} : {}), ...(o.base ? {base: o.base} : {}),
    ...(o.local ? {local: true} : {}), ...(o.tone ? {tone: o.tone} : {}), ...(o.p ? {p: o.p} : {})};
  return {...drill, picks, place: freshPlace(drill, stepId)};
}

/** The player's own answer for a step ("Something else"). gives: a gives string picked from the full lists. */
export function pickOwn(drill, stepId, label, {gives = "", base = null} = {}) {
  const text = String(label ?? "").trim().slice(0, 160);
  const step = stepsOf(drill).steps.find(s => s.id === stepId);
  if ( !step?.own || !text ) return drill;
  const picks = dropAfter(drill, stepId);
  picks[stepId] = {id: `own:${slug(text)}`, label: text, g: String(gives ?? ""), own: true, ...(stepId === "origin" ? {base: base ?? "trade"} : {})};
  return {...drill, picks};
}

/** Take a pick back, and every pick after it. */
export const unpick = (drill, stepId) => ({...drill, picks: dropAfter(drill, stepId), place: freshPlace(drill, stepId)});

/** Take back the last pick made. */
export function back(drill) {
  const last = stepsOf(drill).steps.filter(s => drill.picks?.[s.id]).at(-1);
  return last ? unpick(drill, last.id) : drill;
}

/** Set where a stage happened (teens or an adult chapter). That stage's picks and the later ones are dropped. */
export function moveTo(drill, stageId, regionId) {
  if ( !regionOpen(drill, regionId) ) return drill;
  if ( !landOf(regionId) || !stagesFor(drill.age, agesOf(drill)).some(s => s.id === stageId && s.kind !== "child") ) return drill;
  return {...drill, picks: dropAfter(drill, `${stageId}-path`), place: {...drill.place, [stageId]: regionId}};
}

/** Draw five other marks for a stage's second pick. */
export function reroll(drill, stepId) {
  const step = current(drill);
  if ( !step?.five || step.id !== stepId ) return drill;
  return {...drill, rerolls: {...(drill.rerolls ?? {}), [stepId]: (drill.rerolls?.[stepId] ?? 0) + 1}};
}

/** Surprise me: pick one option of the waiting step by the drill's seed. */
export function surprise(drill) {
  const step = current(drill);
  if ( !step?.options.length ) return drill;
  const rand = rng(`${drill.seed}:surprise:${step.id}:${Object.keys(drill.picks ?? {}).length}:${drill.rerolls?.[step.id] ?? 0}`);
  return pick(drill, step.id, step.options[Math.floor(rand() * step.options.length)].id);
}

/** The exact place inside the region (a town, a province), free text; it colours the story only. */
export const setPlaceName = (drill, text) => ({...drill, placeName: String(text ?? "").trim().slice(0, 80)});

/** True when any pick is the player's own writing. */
export const hasOwn = drill => Object.values(drill.picks ?? {}).some(p => p.own);
/** Why a player's drill goes to the Storyteller before it counts: own answers, or a character younger than 12. */
export function reviewReasons(drill) {
  const out = [];
  if ( hasOwn(drill) ) out.push("answers written by the player");
  if ( drill.age < 12 ) out.push("a character younger than 12");
  return out;
}

const STEP_STAGE = s => s.id;

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

/** The life so far, one line per pick after the continent: {stage, year, title, choice, text, region, own}. */
export function story(drill) {
  const P = drill.picks ?? {};
  return stepsOf(drill).steps.filter(s => s.id !== "continent" && P[s.id]).map(s => {
    const p = P[s.id];
    const where = s.id === "region" ? (drill.placeName ? `${drill.placeName}, ${p.label}` : p.label) : p.label;
    const land = s.region && s.stage ? labelOf(s.region) : "";
    return {stage: STEP_STAGE(s), year: s.year, title: s.title, choice: where, text: p.text ?? (land && s.movable ? `In ${land}.` : ""), region: s.region ?? (s.id === "region" ? p.id : null), own: !!p.own};
  });
}

/** The people the picks name: {role, note, year, scene, step}. */
export function people(drill) {
  const out = [];
  for ( const s of stepsOf(drill).steps ) {
    const p = drill.picks?.[s.id];
    if ( !p?.p ) continue;
    const [role, ...rest] = String(p.p).split("|");
    out.push({role: role.trim(), note: rest.join("|").trim(), year: s.year + Math.max(0, Math.floor(((s.to ?? s.from ?? 0) - (s.from ?? 0)) / 2)), scene: s.title, step: s.id, region: s.region ?? null});
  }
  return out;
}

/** The station flag the old scenes read (st:...), from the origin picked. */
const STATION = {orphan: "st:poor", land: "st:serf", bound: "st:serf", trade: "st:town", merchant: "st:town", noble: "st:noble", faith: "st:church",
  soldier: "st:soldier", scholar: "st:scholar", wander: "st:nomad", outsider: "st:foreign", under: "st:poor", labour: "st:labour", prof: "st:town",
  corp: "st:rich", strange: "st:hidden", wild: "st:serf"};
export function flags(drill) {
  const out = [];
  const base = drill.picks?.origin?.base;
  if ( base && STATION[base] ) out.push(STATION[base]);
  if ( base ) out.push(`origin:${base}`);
  if ( drill.picks?.region ) out.push(`region:${drill.picks.region.id}`);
  if ( drill.homeland && fromAbroad(drill) ) out.push("st:foreign");
  return [...new Set(out)];
}

/* ------------------------------------------------------------------ */
/*  Putting the kept picks on the sheet                                */
/* ------------------------------------------------------------------ */

/** A Merit's or Flaw's cost from the book table: the lowest when the book gives a range. null when not in the table. */
export function costOf(name, kind, table = []) {
  const want = String(name).toLowerCase().replace(/\s*\(.*$/, "");
  const rows = table.filter(t => t.kind === kind && String(t.name).toLowerCase() === want);
  const row = rows.find(t => t.book === "V20") ?? rows[0];
  if ( !row ) return null;
  const m = String(row.cost).match(/\d+/);
  return m ? {cost: Number(m[0]), book: row.book, page: row.page ?? null, range: /[-/]/.test(String(row.cost))} : null;
}

/**
 * What putting the kept picks on the sheet would do, without doing it.
 *   view  {abilities: [{path, label, value}], features: [{id, name, type, value}]}
 *   kept  pool entries [{kind, name, key}]
 *   book  {abilityCap, backgrounds, flaws, table (Merits and Flaws with costs)}
 * Returns {ops: [{op "ability"|"raise"|"create", ...}], skipped: [{key, why}], backgrounds, flawPoints, meritPoints}.
 * Abilities go up one dot, never past the book's cap at creation. A Background starts at one dot or goes up one.
 * Merits and Flaws are written with the book's cost; Flaws past the book's cap are left off.
 */
export function sheetPlan(view = {}, kept = [], book = {}) {
  const BG = "wod.types.background", MERIT = "wod.types.merit", FLAW = "wod.types.flaw";
  const ops = [], skipped = [];
  const cap = book.abilityCap ?? 3, flawCap = book.flaws ?? 7;
  const feats = (view.features ?? []).map(f => ({...f, key: String(f.name).toLowerCase().replace(/\s*\(.*$/, "")}));
  let bgDots = feats.filter(f => f.type === BG).reduce((s, f) => s + (Number(f.value) || 0), 0);
  let flawPoints = feats.filter(f => f.type === FLAW).reduce((s, f) => s + (Number(f.value) || 0), 0);
  let meritPoints = feats.filter(f => f.type === MERIT).reduce((s, f) => s + (Number(f.value) || 0), 0);
  for ( const g of kept ) {
    const name = g.name, low = name.toLowerCase().replace(/\s*\(.*$/, "");
    if ( g.kind === "ab" ) {
      const t = (view.abilities ?? []).find(a => String(a.label).toLowerCase() === low);
      if ( !t ) skipped.push({key: g.key, why: "This sheet has no such Ability."});
      else if ( t.value >= cap ) skipped.push({key: g.key, why: `Already at ${cap}, the most the book allows at creation.`});
      else ops.push({op: "ability", key: g.key, path: t.path, label: t.label, from: t.value, to: t.value + 1});
    } else if ( g.kind === "bg" ) {
      const f = feats.find(x => x.type === BG && x.key === low);
      if ( f && Number(f.value) >= 5 ) { skipped.push({key: g.key, why: "Already at five dots."}); continue; }
      if ( f ) ops.push({op: "raise", key: g.key, id: f.id, name: f.name, from: Number(f.value) || 0, to: (Number(f.value) || 0) + 1});
      else ops.push({op: "create", key: g.key, name, type: BG, value: 1});
      bgDots++;
    } else if ( g.kind === "merit" || g.kind === "flaw" ) {
      const type = g.kind === "merit" ? MERIT : FLAW;
      if ( feats.some(x => x.type === type && x.key === low) ) { skipped.push({key: g.key, why: "Already on the sheet."}); continue; }
      const c = costOf(name, g.kind, book.table ?? []);
      if ( !c ) { skipped.push({key: g.key, why: "Not in the book table: add it by hand with the Storyteller."}); continue; }
      if ( g.kind === "flaw" && flawPoints + c.cost > flawCap ) { skipped.push({key: g.key, why: `Past the book's ${flawCap} points of Flaws.`}); continue; }
      ops.push({op: "create", key: g.key, name, type, value: c.cost, book: c.book, page: c.page, range: c.range});
      if ( g.kind === "flaw" ) flawPoints += c.cost; else meritPoints += c.cost;
    } else skipped.push({key: g.key, why: "A note: nothing to put on the sheet."});
  }
  return {ops, skipped, backgrounds: {dots: bgDots, allowed: book.backgrounds ?? null}, flawPoints, meritPoints, flawCap};
}

/** Problems in the lists (the harness runs this). table: the Merits and Flaws the books give, to check the names. */
/* ---- The years after the change (0.20.0) ---- */

const GROUP_YEARS = [["M", -Infinity, 1499], ["E", 1500, 1788], ["I", 1789, 1945], ["N", 1946, 2022], ["F", 2023, Infinity]];
/** The ages a character lived at least SINCE_MIN years of after the turn: [{id, group, from, to}]. */
export function sinceSpans(turnYear, nowYear) {
  const t = num(turnYear), n = num(nowYear), out = [];
  if ( t === null || n === null ) return out;
  for ( const [g, a, b] of GROUP_YEARS ) {
    const from = Math.max(a, t + 1), to = Math.min(b, n);
    if ( to - from + 1 >= SINCE_MIN ) out.push({id: `s-${g}`, group: g, from, to});
  }
  return out;
}
export function newSince({turnYear, nowYear, line = "vampire", seed = "wodx"} = {}) {
  return {v: VERSION, turnYear: num(turnYear), nowYear: num(nowYear), line: String(line), seed: String(seed), picks: {}, skipped: [], rerolls: {}};
}
/** The steps of the years after the change, each with five options. */
export function sinceSteps(since) {
  if ( !since ) return [];
  const list = SINCE.filter(o => !o[2]?.lines || o[2].lines.includes(since.line));
  return sinceSpans(since.turnYear, since.nowYear).map(sp => ({id: sp.id, kind: "since", five: true, year: sp.from, from: sp.from, to: sp.to,
    title: `${sp.from} to ${sp.to}: how you spent those years`,
    options: fiveOf(list.filter(o => !Object.entries(since.picks ?? {}).some(([k, v]) => k !== sp.id && v?.id === slug(o[0]))), sp.to, "trade", `${since.seed}:${sp.id}:${since.rerolls?.[sp.id] ?? 0}`)}));
}
export const sinceCurrent = since => sinceSteps(since).find(s => !since.picks?.[s.id] && !since.skipped?.includes(s.id)) ?? null;
export function sincePick(since, stepId, optionId) {
  const step = sinceCurrent(since), o = step?.options.find(x => x.id === optionId);
  if ( !step || step.id !== stepId || !o ) return since;
  return {...since, picks: {...since.picks, [stepId]: {id: o.id, label: o.label, g: o.g, ...(o.tone ? {tone: o.tone} : {}), ...(o.p ? {p: o.p} : {})}}};
}
export function sinceSkip(since, stepId) {
  const step = sinceCurrent(since);
  return step && step.id === stepId ? {...since, skipped: [...(since.skipped ?? []), stepId]} : since;
}
export function sinceReroll(since, stepId) {
  const step = sinceCurrent(since);
  return step && step.id === stepId ? {...since, rerolls: {...(since.rerolls ?? {}), [stepId]: (since.rerolls?.[stepId] ?? 0) + 1}} : since;
}
export function sinceSurprise(since) {
  const step = sinceCurrent(since);
  if ( !step?.options.length ) return since;
  const rand = rng(`${since.seed}:surprise:${step.id}:${since.rerolls?.[step.id] ?? 0}`);
  return sincePick(since, step.id, step.options[Math.floor(rand() * step.options.length)].id);
}
/** Undo the last step answered or skipped. Returns the same object when there is none. */
export function sinceBack(since) {
  const last = sinceSteps(since).filter(s => since.picks?.[s.id] || since.skipped?.includes(s.id)).at(-1);
  if ( !last ) return since;
  const picks = {...since.picks};
  delete picks[last.id];
  return {...since, picks, skipped: (since.skipped ?? []).filter(x => x !== last.id)};
}
export const sinceStory = since => sinceSteps(since).filter(s => since.picks?.[s.id]).map(s => ({stage: s.id, year: s.from, title: s.title, choice: since.picks[s.id].label, text: ""}));
export function sincePool(since) {
  const out = [];
  for ( const s of sinceSteps(since) ) for ( const g of parseGives(since.picks?.[s.id]?.g) ) out.push({...g, key: `${g.kind}:${g.name.toLowerCase()}`, from: [s.title]});
  return out;
}
export function sincePeople(since) {
  const out = [];
  for ( const s of sinceSteps(since) ) {
    const p = since.picks?.[s.id]?.p;
    if ( !p ) continue;
    const [role, ...rest] = String(p).split("|");
    out.push({role: role.trim(), note: rest.join("|").trim(), year: s.to, scene: s.title, step: s.id});
  }
  return out;
}

export function lint({table = null, backgrounds = null} = {}) {
  const bad = [];
  const seen = new Set();
  for ( const [label, ids] of CONTINENTS ) for ( const id of ids ) {
    if ( !landOf(id) ) bad.push(`${label}: unknown region ${id}`);
    if ( seen.has(id) ) bad.push(`${id} is on two continents`);
    seen.add(id);
  }
  for ( const id of Object.keys(WORLD_REGIONS) ) if ( !seen.has(id) ) bad.push(`${id} is on no continent`);
  const bases = new Set(ORIGINS.map(o => o[7] ?? o[0]));
  const gives = (g, where, need = true) => {
    if ( !g && need ) bad.push(`${where}: gives nothing`);
    for ( const x of parseGives(g) ) {
      if ( !x.name ) bad.push(`${where}: empty gain`);
      if ( table && (x.kind === "merit" || x.kind === "flaw") && !costOf(x.name, x.kind, table) ) bad.push(`${where}: ${x.kind} "${x.name}" is not in the book table`);
      if ( backgrounds && x.kind === "bg" && !backgrounds.includes(x.name) ) bad.push(`${where}: Background "${x.name}" is not in the book table`);
    }
  };
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
  for ( const [name, list] of Object.entries({CMARK, TMARK, AMARK}) ) {
    for ( const o of list ) if ( !TONES[o[3]] ) bad.push(`${name} ${o[0]}: no tone`);
    for ( const base of ["trade", "wild"] ) for ( const [t, n] of Object.entries(MARK_SHAPE) ) {
      const have = list.filter(o => o[3] === t && fitsMark(o[2], 1200, base)).length;
      if ( have < n ) bad.push(`${name}: only ${have} "${t}" marks for ${base} in 1200`);
    }
  }
  for ( const [name, list] of Object.entries({HOME, TPATH, CALL}) ) {
    for ( const o of list ) if ( !TONES[o[3]] ) bad.push(`${name} ${o[0]}: no tone`);
    for ( const base of bases ) for ( const y of [1200, 1550, 1700, 1900, 2000, 2100] ) for ( const [t, n] of Object.entries(MARK_SHAPE) ) {
      const have = list.filter(o => o[3] === t && fitsRow(o[2], y, base)).length;
      if ( have < n ) bad.push(`${name}: only ${have} "${t}" for ${base} in ${y}`);
    }
  }
  for ( const [rid, groups] of Object.entries(LOCAL) ) {
    if ( !landOf(rid) ) bad.push(`local: unknown region ${rid}`);
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
  uniq(SINCE.map(o => o[0]), "SINCE");
  for ( const o of SINCE ) { gives(o[1], `SINCE ${o[0]}`); if ( !TONES[o[3]] ) bad.push(`SINCE ${o[0]}: no tone`); }
  for ( const y of [1250, 1700, 1900, 2000, 2100] ) for ( const [t, n] of Object.entries(MARK_SHAPE) ) if ( SINCE.filter(o => o[3] === t && fitsMark(o[2], y, "trade")).length < n ) bad.push(`SINCE: too few "${t}" in ${y}`);
  for ( const [rid, E] of Object.entries(LOCAL_EVENTS) ) {
    if ( !landOf(rid) ) bad.push(`dated: unknown region ${rid}`);
    uniq([...(E.origins ?? []).map(o => o[0]), ...ORIGINS.map(o => o[1]), ...Object.values(LOCAL[rid] ?? {}).flatMap(L => L[1].map(o => o[0]))], `dated ${rid} origins`);
    for ( const o of E.origins ?? [] ) { gives(o[1], `dated ${rid} ${o[0]}`); if ( !bases.has(o[2]) ) bad.push(`dated ${rid} ${o[0]}: unknown origin ${o[2]}`); if ( !(o[3] <= o[4]) ) bad.push(`dated ${rid} ${o[0]}: years`); }
    uniq([...(E.marks ?? []).map(o => o[0]), ...CMARK.map(o => o[0]), ...TMARK.map(o => o[0]), ...AMARK.map(o => o[0])], `dated ${rid} marks`);
    for ( const m of E.marks ?? [] ) { gives(m[1], `dated ${rid} ${m[0]}`); if ( !TONES[m[3]] ) bad.push(`dated ${rid} ${m[0]}: no tone`); if ( !m[2]?.length || m[2].some(([a, b]) => !(a <= b)) ) bad.push(`dated ${rid} ${m[0]}: years`); }
  }
  for ( const [rid, g] of Object.entries(REGION_COMING_OF_AGE) ) if ( !regionOf(rid) || Object.values(g).some(a => a < 12 || a > 21) ) bad.push(`coming of age: ${rid}`);
  return bad;
}
