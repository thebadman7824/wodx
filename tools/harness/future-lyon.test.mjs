import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {execFileSync} from "node:child_process";
import {readFileSync, mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6932: the Lyon burning of 2039 is one Future Darkness event (the desk's date-lyon ruling), and the shipped
   future-events.mjs is the build of the research drafts. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const shipped = join(root, "modules/wodx-chronicle/data/future-events.mjs");
const FUTURE = (await import(shipped)).default;

test("one event burns Lyon in 2039, and it keeps the Merciful walking out", () => {
  const lyon = FUTURE.events.filter(e => e.year === 2039 && /Lyon/.test(e.summary));
  assert.equal(lyon.length, 1, lyon.map(e => e.id).join(", "));
  assert.match(lyon[0].summary, /Merciful walk out/);
  assert.match(lyon[0].summary, /children/);
  assert.deepEqual(lyon[0].lines, ["hunter"]);
});

test("the shipped Future Darkness events are the build of the drafts", () => {
  const dir = mkdtempSync(join(tmpdir(), "wofd-"));
  try {
    const out = join(dir, "future-events.mjs");
    execFileSync(process.execPath, [join(root, "tools/wofd/build-future-events.mjs"), "--out", out], {stdio: "pipe"});
    assert.equal(readFileSync(out, "utf8"), readFileSync(shipped, "utf8"), "run node tools/wofd/build-future-events.mjs");
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
