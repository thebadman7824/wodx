/* The index of decision blocks at the top of docs/DECISIONS.md stays in step with the decisions below it.
 * Every decision number falls inside one row, rows run in order without overlapping, and the next free block is
 * above everything used or given out. Stale design desk 2026-11-12b-d4. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const text = fs.readFileSync(path.join(ROOT, "docs/DECISIONS.md"), "utf8");
const [before, after] = text.split("<!-- decision-index:end -->");
const indexPart = before.split("<!-- decision-index:start -->")[1] ?? "";
const rows = [...indexPart.matchAll(/^\| B(\d+)(?:-B(\d+))? \| ([^|]+) \| ([^|]+) \|$/gm)]
  .map(m => ({lo: +m[1], hi: +(m[2] ?? m[1]), label: m[0], what: m[3].trim(), mods: m[4].trim()}));
const used = [];
for ( const m of (after ?? "").matchAll(/^(?:\| B(\d+)[a-z]? \||#+ B(\d+)[a-z]?\b)/gm) ) used.push(+(m[1] ?? m[2]));
const nextFree = +(/^Next free block: B(\d+)$/m.exec(before)?.[1] ?? NaN);

test("the index is there, above the decisions", () => {
  assert.ok(rows.length > 50, "the index has its rows");
  assert.ok(used.length > 700, "the decisions are read below the index");
  for ( const r of rows ) assert.ok(r.what && r.mods, `${r.label}: each row names a feature and its modules`);
});

test("rows run in order and do not overlap", () => {
  for ( let i = 0; i < rows.length; i++ ) {
    assert.ok(rows[i].lo <= rows[i].hi, `${rows[i].label}: the block runs backwards`);
    if ( i ) assert.ok(rows[i].lo > rows[i - 1].hi, `${rows[i].label} overlaps or comes before ${rows[i - 1].label}`);
  }
});

test("every decision falls inside a row of the index", () => {
  const missing = [...new Set(used)].filter(n => !rows.some(r => n >= r.lo && n <= r.hi));
  assert.deepEqual(missing.map(n => `B${n}`), [], "add a row to the index for these decisions");
});

test("the next free block is above every decision and every block given out", () => {
  assert.ok(Number.isInteger(nextFree), "the index names the next free block");
  const top = Math.max(...used, ...rows.map(r => r.hi));
  assert.ok(nextFree > top, `next free block B${nextFree} is not above B${top}; move it up`);
});

test("no new decision number is used twice", () => {
  // B593 and B947 were each given to two decisions before the index; other files link to both, so they stay
  const KNOWN = new Set([593, 947]);
  const seen = new Set(), twice = [];
  for ( const n of used ) { if ( seen.has(n) && !KNOWN.has(n) ) twice.push(`B${n}`); seen.add(n); }
  assert.deepEqual(twice, []);
});
