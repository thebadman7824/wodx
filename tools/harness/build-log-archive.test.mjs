import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The weekly move of old build log entries to docs/archive (B2722) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = await import(pathToFileURL(join(root, "tools/docs/archive-build-log.mjs")).href);

const LOG = `# WoDX build log

## Phase 0, 2026-10-06

- one

### A fix with no date

- two

## 2026-11-07: later

- three

## No date at all, under a dated one

- four
`;

test("a month back, held to the end of a short month", () => {
  assert.equal(A.monthBefore("2026-12-14"), "2026-11-14");
  assert.equal(A.monthBefore("2027-01-05"), "2026-12-05");
  assert.equal(A.monthBefore("2027-03-31"), "2027-02-28");
});

test("entries over a month old move to their month's file; the newer stay, nothing is lost", () => {
  const r = A.plan(LOG, {}, "2026-11-16");
  assert.equal(r.moved, 2, "the October entry and the undated one under it");
  assert.deepEqual(Object.keys(r.archives), ["2026-10"]);
  assert.match(r.archives["2026-10"], /^# WoDX build log, October 2026/);
  assert.match(r.archives["2026-10"], /## Phase 0, 2026-10-06\n\n- one\n\n### A fix with no date\n\n- two\n$/);
  assert.match(r.log, /^# WoDX build log\n\nEntries more than a month old/);
  assert.match(r.log, /## 2026-11-07: later\n\n- three\n\n## No date at all, under a dated one\n\n- four\n$/);
  assert.doesNotMatch(r.log, /Phase 0/);
  for ( const line of LOG.split("\n").filter(l => l.startsWith("- ")) ) assert.ok(r.log.includes(line) || r.archives["2026-10"].includes(line), line);
});

test("run twice: nothing moves twice, an entry already in the archive is not copied again, and a quiet week changes nothing", () => {
  const r1 = A.plan(LOG, {}, "2026-11-16");
  assert.deepEqual(A.plan(r1.log, r1.archives, "2026-11-23"), {log: r1.log, archives: {}, moved: 0, cutoff: "2026-10-23"});
  const again = A.plan(LOG, r1.archives, "2026-11-16");
  assert.equal(again.archives["2026-10"], r1.archives["2026-10"]);
  assert.equal((A.plan(r1.log, r1.archives, "2026-12-14").log.match(/Entries more than a month old/g) ?? []).length, 1, "one pointer line");
  assert.equal(A.plan(LOG, {}, "2026-11-01").moved, 0);
});

test("the archive README lists each month once, after what was there", () => {
  const t = A.readme("# Archive\n\nFinished checklists.\n", ["2026-10"]);
  assert.match(t, /Finished checklists\.\n\n## Build log by month/);
  const t2 = A.readme(t, ["2026-11", "2026-10"]);
  assert.equal((t2.match(/build-log-2026-10\.md\)/g) ?? []).length, 1);
  assert.match(t2, /2026-10\.md\)\n- \[build-log-2026-11/);
});

test("the real log parses with every entry dated, so the Monday run can place each one", () => {
  const {entries} = A.parse(readFileSync(join(root, "docs/BUILD-LOG.md"), "utf8"));
  assert.ok(entries.length > 200);
  assert.ok(entries.every(e => e.date), "every entry has a date of its own or from the one above");
});
