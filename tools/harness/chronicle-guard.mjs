/**
 * The chronicle guard (Chronicle Packs Desk e1, Ben 18 Nov 2026). A story chronicle (Rothenstein is the first) lives
 * in a WoDX module of its own, with chronicle.mjs at its root naming its marks: the words that belong to it alone
 * (its town, its cast, its places, its book keys). Shared code must never name them, or the chronicle comes back in
 * worlds that do not play it.
 *
 *   node tools/harness/chronicle-guard.mjs              list what the scan finds now
 *   node tools/harness/chronicle-guard.mjs --baseline   write tools/harness/chronicle-guard-baseline.json (only after
 *                                                        moving a mention out, so the list only shrinks)
 *
 * The baseline holds the mentions still in shared modules, file by file with a count; a new file or a higher count
 * fails tools/harness/chronicle-guard.test.mjs. Move the content into the chronicle's module, or read the word from
 * the chronicle in play (WoDX Chronicle's chronicle-data.mjs, its manifest) instead.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
const MODULES = path.join(ROOT, "modules");
export const BASELINE = path.join(HERE, "chronicle-guard-baseline.json");

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** How many times the marks appear in a text (whole words, case as written). */
export const countMarks = (text, marks) => marks.reduce((n, m) => n + (text.match(new RegExp(`(?<![\\w-])${esc(m)}(?![\\w-])`, "g")) ?? []).length, 0);

/** Every chronicle module: [{module, id, marks}]. */
export async function chronicles() {
  const out = [];
  for ( const d of fs.readdirSync(MODULES) ) {
    const f = path.join(MODULES, d, "chronicle.mjs");
    if ( !fs.existsSync(f) ) continue;
    const {MANIFEST} = await import(pathToFileURL(f).href);
    out.push({module: d, id: MANIFEST.id, marks: MANIFEST.marks ?? []});
  }
  return out;
}

function walk(dir, out = []) {
  for ( const e of fs.readdirSync(dir, {withFileTypes: true}) ) {
    if ( e.name === "node_modules" || e.name.startsWith(".") ) continue;
    const p = path.join(dir, e.name);
    if ( e.isDirectory() ) walk(p, out);
    else if ( /\.(m?js|json)$/.test(e.name) && !/\.min\./.test(e.name) && e.name !== "module.json" ) out.push(p);
  }
  return out;
}

/** What the scan finds now: {"<chronicle id>|<module>/<file>": n}. */
export async function check() {
  const found = {}, list = await chronicles(), files = walk(MODULES);
  for ( const c of list ) {
    if ( !c.marks.length ) continue;
    for ( const f of files ) {
      const rel = path.relative(MODULES, f).split(path.sep).join("/");
      if ( rel.startsWith(`${c.module}/`) ) continue;
      const n = countMarks(fs.readFileSync(f, "utf8"), c.marks);
      if ( n ) found[`${c.id}|${rel}`] = n;
    }
  }
  return found;
}

export function loadBaseline() {
  try { return JSON.parse(fs.readFileSync(BASELINE, "utf8")); } catch (e) { return {}; }
}

/** fresh: mentions past the baseline; cleared: baseline entries now lower (to take down). */
export function compare(now, base) {
  const fresh = [], cleared = [];
  for ( const [k, n] of Object.entries(now) ) if ( n > (base[k] ?? 0) ) fresh.push(`${k}: ${n}${base[k] ? ` (was ${base[k]})` : ""}`);
  for ( const [k, n] of Object.entries(base) ) if ( (now[k] ?? 0) < n ) cleared.push(`${k}: ${now[k] ?? 0} (baseline ${n})`);
  return {fresh, cleared};
}

if ( process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ) {
  const now = await check();
  if ( process.argv.includes("--baseline") ) {
    const sorted = Object.fromEntries(Object.entries(now).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 1)}\n`);
    console.log(`Wrote ${Object.keys(sorted).length} entries to ${path.relative(ROOT, BASELINE)}`);
  } else {
    for ( const [k, n] of Object.entries(now) ) console.log(`${n}\t${k}`);
    console.log(`${Object.keys(now).length} files, ${Object.values(now).reduce((a, b) => a + b, 0)} mentions`);
  }
}
