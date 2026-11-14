/**
 * WoDX Library: the registry of lines that can make supernatural items (B3683). No Foundry calls here.
 *
 * Each game line registers a kit: plain functions over plain data, so the rules stay testable outside Foundry.
 * WoDX Storyteller reads the kits to build one picker for every line an actor can make things in, runs the work as a
 * long task, and on the task's end pays the kit's costs, makes its items and calls its after() hook with services
 * (spirit courts, chat lines) it passes in.
 *
 * A kit: {
 *   title (the line, "Werewolf and the Changing Breeds"), noun ("a fetish or talen"), setting (world setting key in WoDX Library), settingName, settingHint,
 *   settingDefault, ref (one line on how the making works, with page refs),
 *   rows() -> every row; row(key) -> one row (rows carry key, name, does, book, pdf, and what the kit needs),
 *   factsFrom(actorData, ctx) -> facts (ctx: {profile, gender, year, settings: {name: value}}),
 *   makerOf(facts) -> maker ({kind: null} when this actor can't make anything in the line),
 *   listFor(maker, {year}) -> rows, groups?(rows) -> [{label, rows}],
 *   blockers(row, maker, opts) -> [reasons], cautions(row, maker) -> [notes],
 *   fields(maker, {isGM}) -> [{name, label, type: "number"|"select"|"checkbox", min, max, value, options: [[v, l]], gm, hint}],
 *   settingsRead? -> [world setting keys in WoDX Library whose values factsFrom gets as ctx.settings],
 *   courtOf?(row) -> a spirit court key in WoDX Otherworlds, whose regard Storyteller passes in as opts.court,
 *   taskFor(row, maker, opts) -> a saveTask seed (Storyteller sets wonder, line),
 *   itemsFor(row, {successes, maker, at, task}) -> item data,
 *   costs(row, task, facts) -> [{path, amount, label, floor, cap}] (cap: another path held at or below the new value),
 *   after?(ctx) -> [chat lines] (ctx: {row, task, status, services: {actor (the Foundry actor), spirits (Otherworlds api)}}),
 *   label(row) -> one line for the picker, detail?(row, task, maker) -> text for the approval card
 * }
 */
const KITS = new Map();
const NEEDS = ["rows", "row", "factsFrom", "makerOf", "listFor", "blockers", "cautions", "fields", "taskFor", "itemsFor", "costs", "label"];

/** Add or replace a line's kit. Returns the stored kit; throws on a kit missing a required part. */
export function registerLine(line, kit = {}) {
  const key = String(line ?? "").trim();
  if ( !/^[a-z][a-z0-9-]{1,30}$/.test(key) ) throw new Error(`wonders: bad line key "${line}"`);
  const missing = NEEDS.filter(k => typeof kit[k] !== "function");
  if ( typeof kit.title !== "string" || !kit.title ) missing.push("title");
  if ( missing.length ) throw new Error(`wonders: the ${key} kit lacks ${missing.join(", ")}`);
  const stored = {line: key, noun: "an item", setting: "", settingDefault: true, ...kit};
  KITS.set(key, stored);
  return stored;
}

/** The kit for a line, or null. */
export const kitFor = line => KITS.get(String(line ?? "")) ?? null;

/** Every registered kit, in the order registered. */
export const lines = () => [...KITS.values()];

/** A row by line and key. */
export const rowOf = (line, key) => kitFor(line)?.row?.(key) ?? null;

/**
 * Apply costs to plain numbers (no Foundry): values is {path: number}. Returns {updates: {path: value}, lines}.
 * Storyteller reads the current values off the actor and writes the updates back.
 */
export function applyCosts(costs = [], values = {}) {
  const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const updates = {}, out = [];
  for ( const c of costs ) {
    if ( !c?.path || !n(c.amount) ) continue;
    const from = n(updates[c.path] ?? values[c.path]);
    const to = Math.max(n(c.floor ?? 0), from - n(c.amount));
    updates[c.path] = to;
    if ( c.cap ) updates[c.cap] = Math.min(n(updates[c.cap] ?? values[c.cap]), to);
    if ( c.label ) out.push(c.label);
  }
  return {updates, lines: out};
}

/** For tests: forget every kit. */
export const _reset = () => KITS.clear();
