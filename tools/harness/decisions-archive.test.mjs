import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The weekly move of old decision text to docs/archive, the index kept (B6243, stale design desk 2026-11-15 f2) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = await import(pathToFileURL(join(root, "tools/docs/archive-decisions.mjs")).href);

const DOC = `# WoDX decisions (build log)

## Index of decision blocks

Next free block: B40

<!-- decision-index:start -->
| Block | Feature | Modules |
|---|---|---|
| B1-B9 | The start | Chronicle |
| B10-B19 | Doors | Interactables |
| B20-B29 | Later work | NPC |
| B30-B39 | Fresh work | Storyteller |
<!-- decision-index:end -->

## The decisions

| # | Date | Decision | Why |
|---|------|----------|-----|
| B1 | 2026-10-01 | The first one. | Because. |
| B2 | 2026-11-20 | A later one. | Because. |

## B10. Doors open (2026-10-05)

A door opens.

## B11. Locks (house rule)

Dated by the one above.

## B20. Later (2026-11-02)

Text.

## B21. Same block, newer (2026-11-25)

Text.

## B30. Fresh (2026-12-01)

Text.
`;

const lines = s => s.split("\n").filter(l => /^(\| B\d|## B\d)|^[A-Z][a-z]/.test(l) && !l.startsWith("Moved here") && !l.startsWith("Next free") && !l.startsWith("Decisions more"));

test("nothing moves before its month is up", () => {
  const r = A.plan(DOC, {}, "2026-10-20");
  assert.equal(r.moved, 0);
  assert.equal(r.text, DOC);
});

test("decisions more than a month old move by month, the index names their file", () => {
  const r = A.plan(DOC, {}, "2026-12-10");
  assert.equal(r.cutoff, "2026-11-10");
  assert.equal(r.moved, 4, "B1, B10, B11 and B20 move");
  assert.deepEqual(Object.keys(r.archives).sort(), ["2026-10", "2026-11"]);
  const oct = r.archives["2026-10"], nov = r.archives["2026-11"];
  assert.match(oct, /\| B1 \| 2026-10-01 \|/);
  assert.match(oct, /## B10\. Doors open/);
  assert.match(oct, /## B11\. Locks[\s\S]*Dated by the one above/, "an undated heading goes with the one above");
  assert.match(nov, /## B20\. Later/);
  assert.doesNotMatch(r.text, /## B10\.|## B20\.|\| B1 \|/);
  assert.match(r.text, /\| B2 \| 2026-11-20 \|/);
  assert.match(r.text, /## B21\./);
  assert.match(r.text, /## B30\./);
  assert.match(r.text, /\| B1-B9 \| The start \(text in \[decisions-2026-10\]\(archive\/decisions-2026-10\.md\), the rest in this file\) \| Chronicle \|/);
  assert.match(r.text, /\| B10-B19 \| Doors \(text in \[decisions-2026-10\]\(archive\/decisions-2026-10\.md\)\) \| Interactables \|/);
  assert.match(r.text, /\| B30-B39 \| Fresh work \| Storyteller \|/);
  assert.ok(r.text.includes(A.POINTER), "the file says where the older text is");
});

test("a move keeps every line, and a second run moves nothing", () => {
  const r = A.plan(DOC, {}, "2026-12-10");
  const below = r.text.split("<!-- decision-index:end -->")[1];
  assert.deepEqual([...lines(below), ...Object.values(r.archives).flatMap(lines)].sort(), lines(DOC.split("<!-- decision-index:end -->")[1]).sort());
  const again = A.plan(r.text, r.archives, "2026-12-10");
  assert.equal(again.moved, 0);
  const later = A.plan(r.text, r.archives, "2027-02-01");
  assert.equal(later.moved, 3, "B2, B21 and B30");
  assert.match(later.archives["2026-11"], /## B20\.[\s\S]*## B21\./, "the month's file keeps its decisions in order");
  assert.equal((later.archives["2026-11"].match(/## B20\./g) ?? []).length, 1, "nothing is written twice");
  assert.match(later.text, /\| B1-B9 \| The start \(text in \[decisions-2026-10\]\(archive\/decisions-2026-10\.md\), \[decisions-2026-11\]\(archive\/decisions-2026-11\.md\)\) \| Chronicle \|/);
});

test("the index rows still read as index rows", () => {
  const r = A.plan(DOC, {}, "2027-02-01");
  const rows = [...r.text.matchAll(/^\| B(\d+)(?:-B(\d+))? \| ([^|]+) \| ([^|]+) \|$/gm)];
  assert.equal(rows.length, 4);
  assert.ok(A.numbersIn(Object.values(r.archives).join("\n")).length === 7);
});

test("the real file plans cleanly and loses nothing", () => {
  const text = readFileSync(join(root, "docs/DECISIONS.md"), "utf8");
  const r = A.plan(text, {}, "2027-06-01");
  const all = new Set(A.numbersIn(text.split("<!-- decision-index:end -->")[1]));
  const after = new Set([...A.numbersIn(r.text.split("<!-- decision-index:end -->")[1]), ...Object.values(r.archives).flatMap(A.numbersIn)]);
  assert.deepEqual([...all].filter(n => !after.has(n)), []);
  assert.equal(A.plan(r.text, r.archives, "2027-06-01").moved, 0);
});

test("the archive README lists each month", () => {
  const t = A.readme("# Archive\n\n## Build log by month\n\n- x\n", ["2026-11"]);
  assert.match(t, /## Decisions by month[\s\S]*decisions-2026-11\.md/);
  assert.match(t, /## Build log by month/);
  assert.equal(A.readme(t, ["2026-11"]), t);
});
