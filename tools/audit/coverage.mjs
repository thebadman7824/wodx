#!/usr/bin/env node
/**
 * Audit coverage (B6899): which script files an audit gave no verdict. An audit may only say "everything was checked"
 * when this passes.
 *   node tools/audit/coverage.mjs <audit dir> [--list]
 * Reads every items.jsonl under the audit dir. A file counts as covered when an item names it in `file`, or in `where`
 * as "path" or "path:line". It is open when no item names it, or when every item naming it is not-checked.
 * Exit 1 with the open files listed; exit 0 when every file has a verdict.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** The script files an audit must cover: every module script and the system's own code. */
export const SCOPE = ["modules/*/scripts/**", "system/worldofdarkness/module/**"];

export function scriptFiles(root = ROOT) {
  const out = execFileSync("git", ["ls-files", "--", ...SCOPE], {cwd: root, encoding: "utf8"});
  return out.split("\n").filter(f => /\.(m?js)$/.test(f)).sort();
}
const pathOf = s => String(s ?? "").trim().replace(/:\d+(-\d+)?$/, "").replace(/\\/g, "/");

/** {file: [verdicts]} from item objects. */
export function verdictsByFile(items, files) {
  const want = new Set(files), by = new Map(files.map(f => [f, []]));
  for ( const x of items ) {
    for ( const p of [x.file, ...String(x.where ?? "").split(/[,;]\s*/)].map(pathOf) ) if ( want.has(p) ) by.get(p).push(x.verdict ?? "");
  }
  return by;
}
/** The files with no verdict but not-checked. */
export function openFiles(by) {
  return [...by].filter(([, v]) => !v.some(x => x && x !== "not-checked")).map(([f, v]) => ({file: f, why: v.length ? "not-checked" : "no item"}));
}
export function readItems(dir) {
  const found = [];
  const walk = d => { for ( const e of fs.readdirSync(d, {withFileTypes: true}) ) {
    const p = path.join(d, e.name);
    if ( e.isDirectory() ) walk(p); else if ( e.name === "items.jsonl" ) found.push(p);
  } };
  walk(dir);
  return found.flatMap(f => fs.readFileSync(f, "utf8").split("\n").filter(l => l.trim()).map(l => JSON.parse(l)));
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const dir = process.argv[2];
  if ( !dir || !fs.existsSync(dir) ) { console.error("Usage: node tools/audit/coverage.mjs <audit dir> [--list]"); process.exit(2); }
  const files = scriptFiles(), open = openFiles(verdictsByFile(readItems(dir), files));
  console.log(`${files.length - open.length} of ${files.length} script files have a verdict; ${open.length} open.`);
  if ( open.length && (process.argv.includes("--list") || open.length <= 50) ) for ( const o of open ) console.log(`  ${o.why}: ${o.file}`);
  process.exit(open.length ? 1 : 0);
}
