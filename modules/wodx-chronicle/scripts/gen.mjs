/**
 * The generator core in Foundry (Phase 7a, B52): the chronicle's seed, WoDX's tables kept as Foundry Roll Tables the
 * Storyteller can edit (folder "WoDX tables"), and draws from them. Generators in other modules register their tables
 * here and send their results to the approval queue.
 */
import {MODULE_ID, isActiveGM, log} from "./util.mjs";
import * as G from "./gen-core.mjs";

const SOURCES = new Map(); // source -> [table definitions]
let cache = null;          // {defs: [...]} built from the world's Roll Tables and the shipped data
const FOLDER = "WoDX tables";

export const CULTURES = {bohemia: "Bohemia and its neighbours (Czech, German and Jewish names)", american: "The Americas (English-speaking)"};

export function registerGenSettings() {
  game.settings.register(MODULE_ID, "genSeed", {scope: "world", config: false, type: String, default: ""});
  game.settings.register(MODULE_ID, "peopleCulture", {
    name: "Where the chronicle's people come from",
    hint: "Names and people the generators make. Each era gives its own names (medieval, early modern, industrial, mid-century, modern, future).",
    scope: "world", config: true, type: String, choices: CULTURES, default: "bohemia", onChange: () => { cache = null; }
  });
  for ( const h of ["createRollTable", "updateRollTable", "deleteRollTable", "createTableResult", "updateTableResult", "deleteTableResult"] ) Hooks.on(h, () => { cache = null; });
}

/** The chronicle's seed: made once, by the Storyteller, when the world first runs the generators. */
let pendingSeed = null;
export function seed() {
  let s = game.settings.get(MODULE_ID, "genSeed");
  if ( !s && pendingSeed ) return pendingSeed;
  if ( !s && game.user.isGM ) {
    // Made once: the setting is written in the background, so the new seed is kept here until it lands
    s = pendingSeed = foundry.utils.randomID(16);
    game.settings.set(MODULE_ID, "genSeed", s).finally(() => { pendingSeed = null; });
  }
  return s || "unseeded";
}
/** At ready, the Storyteller's client makes sure the seed exists before anything draws. */
export async function ensureSeed() {
  if ( !game.user.isGM || game.settings.get(MODULE_ID, "genSeed") ) return;
  const s = seed();
  if ( pendingSeed ) await game.settings.set(MODULE_ID, "genSeed", s);
}

/** Where and when the chronicle is: the era group the tables are written for, and the people's culture. */
export function context() {
  const eras = game.modules.get(MODULE_ID)?.api?.eras;
  const active = eras?.activeEra?.();
  const profile = active?.profile;
  const region = (() => { try { return game.settings.get(MODULE_ID, "region"); } catch { return "europe"; } })();
  let culture = game.settings.get(MODULE_ID, "peopleCulture");
  if ( region === "americas" && culture === "bohemia" ) culture = "american";
  const year = eras?.currentYear?.() ?? null;
  return {eraId: profile?.id ?? null, era: G.eraGroupFor(profile?.id, profile?.prologue || active?.locked ? null : year), culture, year};
}

/** A generator module registers its tables. */
let installTimer = null;
export function registerTables(source, defs) {
  SOURCES.set(source, defs ?? []);
  cache = null;
  // The Storyteller's client puts them in the world a moment later (several modules register at ready)
  if ( isActiveGM() ) {
    clearTimeout(installTimer);
    installTimer = setTimeout(() => installTables().catch(e => console.error("WoDX | tables", e)), 1500);
  }
}

const tableKey = d => `${d.id}|${(d.era ?? []).join(",")}|${(d.culture ?? []).join(",")}`;
const contentHash = results => G.hash128(JSON.stringify(results.map(r => [r.text, r.weight ?? 1]))).join("-");
const textOf = r => String(r.description || r.name || r.text || "").replace(/<[^>]+>/g, "").trim();

/** Every table, the world's own Roll Tables (as the Storyteller edited them) before the shipped data. */
function allTables() {
  if ( cache ) return cache;
  const defs = [];
  const seen = new Set();
  for ( const t of game.tables ?? [] ) {
    const f = t.getFlag?.(MODULE_ID, "table");
    if ( !f?.id ) continue;
    const d = {id: f.id, era: f.era ?? null, culture: f.culture ?? null, name: t.name,
      results: [...t.results].map(r => ({text: textOf(r), weight: r.weight, range: r.range}))};
    seen.add(tableKey(d));
    defs.push(d);
  }
  // Shipped tables are drawn by range too, exactly as their Roll Tables will be: the same seed then gives the same
  // result before and after the tables are installed in the world
  for ( const list of SOURCES.values() ) for ( const d of list ) if ( !seen.has(tableKey(d)) ) defs.push({...d, results: G.withRanges(d.results)});
  cache = defs;
  return defs;
}

/** (id) => the table that fits the chronicle now. */
export function lookup(ctx = context()) {
  const defs = allTables();
  return id => G.resolveTable(defs, id, ctx);
}

/** A stream for one result. key names what is drawn; nonce counts re-rolls. */
export const random = (key, nonce = 0) => G.stream(seed(), key, nonce);

/** Draw and expand, seeded. */
export function draw(tableId, {key, nonce = 0, vars = {}, ctx = context()} = {}) {
  return G.draw(tableId, {rand: random(`${tableId}:${key}`, nonce), tables: lookup(ctx), vars});
}
export function expand(template, {key, nonce = 0, vars = {}, ctx = context()} = {}) {
  return G.expand(template, {rand: random(`tpl:${key}`, nonce), tables: lookup(ctx), vars});
}

/**
 * Active GM: put the shipped tables into the world as Roll Tables, once. A table the Storyteller has edited is never
 * overwritten; one left as shipped is brought up to date when WoDX's data changes.
 */
let installing = null;
export function installTables() {
  // One install at a time (the start-up install and a caller's can overlap)
  installing ??= doInstall().finally(() => { installing = null; });
  return installing;
}
async function doInstall() {
  if ( !isActiveGM() || !game.tables?.[Symbol.iterator] || !globalThis.RollTable ) return {created: 0, updated: 0, kept: 0};
  let folder = game.folders.find(f => f.type === "RollTable" && f.name === FOLDER);
  if ( !folder ) folder = await Folder.create({name: FOLDER, type: "RollTable", color: "#5b1a1a"});
  const byKey = new Map();
  for ( const t of game.tables ) { const f = t.getFlag(MODULE_ID, "table"); if ( f?.id ) byKey.set(tableKey(f), t); }
  let created = 0, updated = 0, kept = 0;
  for ( const [source, list] of SOURCES ) {
    for ( const d of list ) {
      const ranged = G.withRanges(d.results);
      const results = ranged.map(r => ({type: CONST.TABLE_RESULT_TYPES?.TEXT ?? "text", name: r.text.slice(0, 120), description: r.text, weight: r.weight, range: r.range}));
      const shipped = contentHash(d.results);
      const flag = {id: d.id, era: d.era ?? null, culture: d.culture ?? null, source, shipped};
      const have = byKey.get(tableKey(d));
      if ( !have ) {
        await RollTable.create({name: d.name ?? d.id, folder: folder.id, formula: `1d${ranged.at(-1)?.range[1] ?? 1}`, replacement: true, displayRoll: false,
          description: d.description ?? "", results, flags: {[MODULE_ID]: {table: flag}}});
        created++;
        continue;
      }
      const f = have.getFlag(MODULE_ID, "table");
      if ( f.shipped === shipped ) continue;
      const now = contentHash([...have.results].map(r => ({text: textOf(r), weight: r.weight})));
      if ( now === f.shipped ) {
        await have.deleteEmbeddedDocuments("TableResult", have.results.map(r => r.id));
        await have.createEmbeddedDocuments("TableResult", results);
        await have.update({formula: `1d${ranged.at(-1)?.range[1] ?? 1}`, [`flags.${MODULE_ID}.table`]: flag});
        updated++;
      } else kept++;
    }
  }
  cache = null;
  if ( created || updated || kept ) log(`Tables: ${created} added, ${updated} brought up to date, ${kept} kept as the Storyteller edited them`);
  return {created, updated, kept};
}
