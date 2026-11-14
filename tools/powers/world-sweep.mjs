#!/usr/bin/env node
/**
 * Every power whose own words reach the world (B3757): floods, fires and quakes on a town, sickness, Wyrm taint and its
 * cleansing, a whole town's mood, and water, fire or broken ground on the scene. It runs the inventory with --text:
 * "wired" are the powers in world-effects.js WORLD_POWERS (what play does), "unread" the powers whose words worldOf
 * flags that the table leaves out (each one read and left out on purpose, or a new power to read).
 *
 *   node tools/powers/world-sweep.mjs [--out file.json] [--list] [--unread]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const W = await import(pathToFileURL(path.join(ROOT, "modules/wodx-actions/scripts/world-effects.js")).href);
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-world-")), "inv.json");
execFileSync(process.execPath, [path.join(ROOT, "tools/powers/inventory.mjs"), "--text", "--out", tmp], {stdio: "ignore"});
const inv = JSON.parse(fs.readFileSync(tmp, "utf8"));
const hits = [], unread = [], seen = new Set();
for ( const r of inv.rows ) {
  const kinds = W.worldKinds(r.name, r.line);
  if ( kinds.length ) { hits.push({line: r.line, group: r.group, name: r.name, page: r.page, kinds}); seen.add(W.nameKey(r.name)); seen.add(`${r.line}|${W.nameKey(r.name)}`); continue; }
  const words = W.worldOf(`${r.name} ${r.text ?? ""}`).map(k => k.kind);
  if ( words.length ) unread.push({line: r.line, group: r.group, name: r.name, page: r.page, kinds: words});
}
const counts = {};
for ( const h of hits ) for ( const k of h.kinds ) counts[k] = (counts[k] ?? 0) + 1;
const missing = Object.keys(W.WORLD_POWERS).filter(k => !seen.has(k));
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if ( arg("--out") ) fs.writeFileSync(arg("--out"), JSON.stringify({made: new Date().toISOString(), total: hits.length, counts, missing, hits, unread}, null, 1));
console.log(`${hits.length} of ${inv.rows.length} powers reach the world:`, counts, missing.length ? `; names with no power: ${missing.join(", ")}` : "");
const show = list => { for ( const h of list ) console.log(`${h.kinds.join(",").padEnd(18)} ${h.line} | ${h.group} | ${h.name}`); };
if ( process.argv.includes("--list") ) show(hits);
if ( process.argv.includes("--unread") ) { console.log(`-- flagged by the words, not wired (${unread.length}):`); show(unread); }
