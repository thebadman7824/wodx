/**
 * WoDX Library 0.10.0: recipes for food, drink, medicine and drugs. No Foundry calls here; data in data/recipes.mjs.
 *
 * Adapted from the way Cataclysm: Dark Days Ahead runs its recipes (mechanics only): a recipe names what it uses up
 * by group, the heat and tools by what they do, who can know it, how long the work takes and how long the result must
 * stand. In WoDX the work is a V20 extended action (V20 pp. 251-252; V20 Dark Ages p. 324) run by Storyteller's long
 * tasks; everyday dishes need no roll when the cook's pool is at least the difficulty (Ben, 2026-11-12). Goals, waits,
 * batches, dots and strength are house rules (B947-B952).
 */
import {GROUPS, KITS, KIT_WORKSHOP, FAMILIES, BOOKS, METHODS, WORDS, RAW, FACTORY, FACTORY_PRINTER, PART_CHOICES, SALVAGE, NOT_APART, APART_TOOLS, APART_QUALITIES} from "../data/recipes.mjs";
import {substanceOf} from "./use-rules.mjs";

export {GROUPS, KITS, FAMILIES, METHODS, PART_CHOICES, SALVAGE};

/** Strength for drugs and medicine, from the successes past the goal (house rule, B950). */
export const STRENGTHS = [
  {key: "weak", min: 0, label: "Weak"},
  {key: "usual", min: 1, label: "Usual strength"},
  {key: "strong", min: 3, label: "Strong"}
];
export function strengthFor(extra) {
  const e = Math.max(0, Math.round(Number(extra) || 0));
  let s = STRENGTHS[0];
  for ( const x of STRENGTHS ) if ( e >= x.min ) s = x;
  return s;
}

/** A batch's goal grows by half the base for each one past the first (house rule, after Cataclysm's batch savings). */
export const batchGoal = (goal, n = 1) => Math.max(1, Math.ceil((Number(goal) || 1) * (1 + (Math.max(1, Math.round(n)) - 1) / 2)));

/** Kindred can taste food, though they cannot eat it, so they cook as well as anyone (Ben, B951). Set diff above 0 to bring a penalty back. */
export const KINDRED_TASTE = {diff: 0, unless: 3};

/** The thing a carried item is, as a name: "3 claret (in a bottle) (good work)" -> "claret". */
export function cleanName(name) {
  return String(name ?? "").replace(/\s*\([^)]*\)/g, "").replace(/^\d+\s+/, "").trim().toLowerCase();
}
const meets = (group, name) => !!GROUPS[group]?.re.test(cleanName(name));

/** In scope: food and drink, and drugs or medicine that are taken. */
export function inScope(good) {
  if ( !good ) return false;
  if ( good.kind === "food" || good.kind === "drink" ) return true;
  if ( METHODS.some(m => !m.catch && m.makes?.test(good.name) && (m.kinds ?? []).includes(good.kind)) ) return true;
  if ( good.kind === "drugs" || good.kind === "medicine" ) return !!substanceOf(good) && !PARAPHERNALIA.test(good.name);
  return false;
}

/** Things a drug is taken with, not drugs themselves. */
const PARAPHERNALIA = /\b(pipe|syringe|hookah|lighter)\b/i;

const fam = m => ({...FAMILIES[m.family], ...Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined))});
const kindsOf = m => m.kinds ?? FAMILIES[m.family]?.kinds ?? ["food"];
const matches = (m, good) => kindsOf(m).includes(good.kind) && (m.catch ? (!m.subs || m.subs.includes(substanceOf(good))) && !m.not?.test(good.name) : m.makes?.test(good.name));

/** Which method makes a good: {method, why}. Raw goods and factory goods have none. */
export function methodFor(good, year = 0) {
  if ( !good?.name ) return {method: null, why: "No such good."};
  const y = Number(year) || 0;
  const named = METHODS.filter(m => !m.catch && matches(m, good));
  const ofYear = list => list.find(m => !y || (y >= m.from && y <= m.to));
  const pick = ofYear(named);
  if ( pick ) return {method: pick, why: ""};
  if ( named.length && FACTORY.test(good.name) ) return {method: null, factory: true, why: `${cap(good.name)} comes from a works or a factory; it is bought, not made by hand.`};
  if ( named.length ) return {method: null, why: `No one knows how to make ${good.name} that way until about ${named[0].from}.`};
  if ( RAW.test(good.name) ) return {method: null, raw: true, why: `${cap(good.name)} is grown, gathered or caught, not made.`};
  if ( FACTORY.test(good.name) && !(y >= FACTORY_PRINTER && good.kind === "food") ) return {method: null, factory: true, why: `${cap(good.name)} comes from a works or a factory; it is bought, not made by hand.`};
  if ( FACTORY.test(good.name) && good.kind === "food" ) return {method: METHODS.find(m => m.key === "printed") ?? null, why: ""};
  const c = ofYear(METHODS.filter(m => m.catch && matches(m, good)));
  if ( c ) return {method: c, why: ""};
  return {method: null, why: inScope(good) ? `WoDX has no recipe for ${good.name} in ${y || "this year"}.` : ""};
}

/** What a method needs for a good: its own list plus what the name asks for. [{group, label, n}] */
export function needsFor(method, good) {
  const out = new Map();
  for ( const [g, n] of method.needs ?? [] ) out.set(g, (out.get(g) ?? 0) + n);
  if ( method.words ) {
    for ( const [re, g] of WORDS ) if ( re.test(good?.name ?? "") && !out.has(g) ) out.set(g, 1);
    if ( !out.size ) out.set("anyfood", 2);
  }
  return [...out].map(([group, n]) => ({group, label: GROUPS[group]?.label ?? group, n}));
}

/** Goods that belong to a group in a year. */
export function membersOf(group, goods = [], year = 0) {
  const y = Number(year) || 0;
  return goods.filter(g => meets(group, g.name) && (!y || (y >= g.from && y <= g.to)));
}

/** Does a kit stand ready? carried: names; sceneKits: kit keys marked on the scene. Returns {ok, how, why}. */
export function kitReady(kit, {carried = [], sceneKits = [], year = 0} = {}) {
  const k = KITS[kit] ?? KITS.none;
  if ( kit === "none" || !KITS[kit] ) return {ok: true, how: ""};
  if ( k.from && year && year < k.from ) return {ok: false, why: `there is no ${k.label.replace(/^an? /i, "").toLowerCase()} before about ${k.from}`};
  const here = (sceneKits ?? []).filter(x => KITS[x]);
  if ( here.includes(kit) || here.some(x => KITS[x].covers.includes(kit)) ) return {ok: true, how: "here"};
  if ( k.carry.length && k.carry.every(re => carried.some(c => re.test(String(c)))) ) return {ok: true, how: "carried"};
  return {ok: false, why: `needs ${k.label.replace(/^./, c => c.toLowerCase())}${k.carry.length ? "" : " on this scene"}`};
}

/** The form a kit takes in a year, for the window: "an iron range". */
export function kitForm(kit, year = 0) {
  const k = KITS[kit];
  if ( !k?.forms ) return k?.label ?? "";
  let f = k.forms[0][1];
  for ( const [from, label] of k.forms ) if ( (Number(year) || 0) >= from ) f = label;
  return f;
}

/** The best Ability a character has for a method: {key, value}. abilities: {key: dots}. */
export function bestAbility(method, abilities = {}) {
  const list = fam(method).ab ?? ["crafts"];
  let best = {key: list[0], value: Number(abilities[list[0]]) || 0};
  for ( const k of list ) { const v = Number(abilities[k]) || 0; if ( v > best.value ) best = {key: k, value: v}; }
  return best;
}

/** Does the character know the method? By dots, by a book carried, or by being taught (known: method keys). */
export function knows(method, {abilities = {}, known = [], carried = []} = {}) {
  const f = fam(method);
  if ( (known ?? []).includes(method.key) ) return {ok: true, how: "taught"};
  const ab = bestAbility(method, abilities);
  if ( ab.value >= f.dots ) return {ok: true, how: "dots"};
  const book = BOOKS.find(b => b.families.includes(method.family) && carried.some(c => b.re.test(String(c))));
  if ( book ) return {ok: true, how: "book"};
  return {ok: false, why: `needs ${f.dots} dot${f.dots === 1 ? "" : "s"} in ${f.ab.map(abLabel).join(" or ")}, a book that teaches it, or a teacher`};
}
const AB_LABELS = {crafts: "Crafts", cooking: "Cooking", medicine: "Medicine", herbalism: "Herbalism", hearthwisdom: "Hearth Wisdom", science: "Science", survival: "Survival",
  technology: "Technology", computer: "Computer"};
export const abLabel = k => AB_LABELS[k] ?? cap(k);

/** The recipe for a good in a year: {ok, why, recipe}. */
export function recipeOf(good, year = 0) {
  const {method, why} = methodFor(good, year);
  if ( !method ) return {ok: false, why};
  const f = fam(method);
  return {ok: true, why: "", recipe: {
    key: method.key, family: method.family, familyLabel: FAMILIES[method.family]?.label ?? "", label: method.label, good: good.id ?? "", makes: good.name,
    needs: needsFor(method, good), kit: f.kit, attr: f.attr, ab: f.ab, dots: f.dots, diff: f.diff, goal: f.goal, interval: f.interval,
    wait: Number(f.wait) || 0, waitWord: f.waitWord ?? "", batch: f.batch ?? 1, everyday: !!f.everyday, strength: !!f.strength, taste: !!f.taste,
    leaves: f.leaves ?? []
  }};
}

/**
 * What to take from the character's things for a batch. carried: [{name, qty, id}]. Returns {take: [{id, name, n}],
 * missing: [{group, label, n}]}. A thing used for one group is not used for another.
 */
export function planBatch(recipe, carried = [], batch = 1) {
  const left = carried.map(c => ({...c, qty: Math.max(1, Math.floor(Number(c.qty) || 1))}));
  const take = [], missing = [];
  for ( const need of recipe.needs ) {
    let want = need.n * Math.max(1, Math.round(batch));
    for ( const c of left ) {
      if ( !want || !c.qty || !meets(need.group, c.name) ) continue;
      const n = Math.min(c.qty, want);
      c.qty -= n; want -= n;
      take.push({id: c.id, name: c.name, n, group: need.group});
    }
    if ( want > 0 ) missing.push({group: need.group, label: need.label, n: want});
  }
  return {take, missing};
}

/** Difficulty for this cook: KINDRED_TASTE adds to it for a Kindred cooking by taste below its dots (0 now), and an old kit adds one. */
export function diffFor(recipe, {line = "mortal", abilityValue = 0, old = false} = {}) {
  let d = recipe.diff;
  if ( recipe.taste && line === "vampire" && (Number(abilityValue) || 0) < KINDRED_TASTE.unless ) d += KINDRED_TASTE.diff;
  return Math.max(2, Math.min(10, d + (old ? 1 : 0)));
}

/** Everyday food and drink is made at once, with no roll, when the pool is at least the difficulty (Ben, 2026-11-12). */
export const noRoll = (recipe, pool, diff) => !!recipe.everyday && (Number(pool) || 0) >= (Number(diff) || recipe.diff);

/** The long task for Storyteller (tasks-rules normTask reads these fields). */
export function taskFor(recipe, {batch = 1, ability = "crafts", diff = recipe.diff, spent = []} = {}) {
  const n = Math.max(1, Math.min(recipe.batch, Math.round(batch) || 1));
  return {kind: "craft", name: `${recipe.label}: ${n > 1 ? `${n} of ` : ""}${recipe.makes}`, attr: recipe.attr, ability, diff,
    goal: batchGoal(recipe.goal, n), interval: recipe.interval, delicate: !recipe.strength, workshop: KIT_WORKSHOP[recipe.kit] ?? "",
    makes: recipe.makes, good: recipe.good, materials: [], spent, recipe: recipe.key, batch: n, wait: recipe.wait, waitWord: recipe.waitWord,
    strength: recipe.strength, leaves: recipe.leaves.map(([name, k]) => `${k * n} ${name}`),
    note: `${recipe.familyLabel}${recipe.wait ? `; then ${recipe.wait} day${recipe.wait === 1 ? "" : "s"} ${recipe.waitWord}` : ""}.`};
}

/** The name a waiting thing carries until it is ready: "ale (fermenting)". */
export const waitingName = (makes, word) => `${makes} (${word || "standing"})`;
/** How long is left, for the item and the window: "4 days", "about 3 months". */
export function leftLine(seconds) {
  const d = Math.max(0, Math.ceil((Number(seconds) || 0) / 86400));
  if ( d <= 1 ) return "less than a day";
  if ( d < 60 ) return `${d} days`;
  return `about ${Math.round(d / 30)} months`;
}

/** Recipes that use a thing ("Cook with it" on an ingredient): method keys whose needs it meets. */
export function usesOf(name, goods = [], year = 0) {
  const out = [];
  for ( const g of goods ) {
    if ( year && (year < g.from || year > g.to) ) continue;
    const r = recipeOf(g, year);
    if ( r.ok && r.recipe.needs.some(n => meets(n.group, name)) ) out.push(g);
  }
  return out;
}

/* ---------------------------------------------------------------- taking things apart (0.13.0) */

/**
 * The parts a good gives when taken apart in a year: {ok, why, parts: [{name, n}], ab, diff, tool, quick}.
 * goods: the goods list (for the parts' years); valueAt: (good, year) => tier.
 */
export function salvageOf(good, year = 0, {goods = [], valueAt = g => Number(g?.value) || 0} = {}) {
  if ( !good?.name ) return {ok: false, why: "No such thing."};
  if ( NOT_APART.has(good.kind) || inScope(good) ) return {ok: false, why: `${cap(good.name)} is not something to take apart.`};
  const rule = SALVAGE.find(r => r.kinds.includes(good.kind) && r.re.test(good.name));
  if ( !rule ) return {ok: false, why: `${cap(good.name)} gives nothing worth keeping when taken apart.`};
  const y = Number(year) || 0;
  const tier = Math.max(0, Math.min(5, Math.round(valueAt(good, y) || 0)));
  const inUse = name => goods.find(g => g.name === name && (!y || (y >= g.from && y <= g.to)));
  const parts = [];
  for ( const [choice, n] of rule.parts ) {
    const g = (PART_CHOICES[choice] ?? []).map(inUse).find(Boolean);
    if ( g ) parts.push({name: g.name, id: g.id, n: n + (tier >= 3 ? 1 : 0)});
  }
  if ( !parts.length ) return {ok: false, why: `${cap(good.name)} gives nothing worth keeping in ${y || "this year"}.`};
  const ab = rule.ab === "technology" && y && y < 1900 ? "crafts" : rule.ab;
  return {ok: true, why: "", parts, ab, attr: "dexterity", diff: 6 + (tier >= 4 ? 1 : 0), tool: rule.ab === "technology" ? "technology" : "any", quick: tier <= 1};
}

/** Has the character something to take it apart with? carried: names; qualitiesOf: Library link-rules, when there. */
export function apartTool(tool = "any", carried = [], qualitiesOf = null) {
  const re = APART_TOOLS[tool] ?? APART_TOOLS.any, want = APART_QUALITIES[tool] ?? APART_QUALITIES.any;
  const hit = carried.find(c => re.test(String(c)) || (qualitiesOf && (qualitiesOf(c) ?? []).some(q => want.includes(q))));
  return hit ? {ok: true, with: hit} : {ok: false, why: tool === "technology" ? "needs a screwdriver, pliers or a soldering iron" : "needs a knife, a hammer, a saw, pliers or a crowbar"};
}

/** V20 successes: each die at or over the difficulty, less one for each 1; a botch is ones and no successes. */
export function successes(faces = [], diff = 6) {
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}

const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
