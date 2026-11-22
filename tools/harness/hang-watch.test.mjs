/* B7201: the hang watch that ends a gate run within minutes when the lane stops answering. */
import assert from "node:assert/strict";
import {test} from "node:test";
import {watchHang} from "../lanes/hang-watch.mjs";

const tick = () => new Promise(r => setImmediate(r));
/** A hand-driven clock: step() runs the one pending check. */
function clock() {
  let next = null;
  return {timer: fn => (next = fn, 1), clear: () => { next = null; }, step: async () => { const f = next; next = null; if ( f ) await f(); await tick(); }, get pending() { return !!next; }};
}

test("four misses in a row end the watch as a hang", async () => {
  const c = clock(); let n = 0;
  const w = watchHang({probe: async () => (n++, false), everyMs: 30000, misses: 4, timer: c.timer, clear: c.clear});
  let err = null; w.hung.catch(e => { err = e; });
  for ( let i = 0; i < 3; i++ ) await c.step();
  assert.equal(err, null, "three misses are not a hang");
  await c.step();
  assert.ok(err?.hang, "the fourth miss is");
  assert.match(err.message, /stopped answering \(4 checks in a row, 120 s\)/);
  assert.equal(c.pending, false, "no check after the hang");
});

test("one answer resets the count; a throw counts as a miss; stop ends it", async () => {
  const c = clock(); const answers = [false, false, false, true, false, false, false];
  const w = watchHang({probe: async () => { const a = answers.shift(); if ( a === undefined ) throw new Error("down"); return a; }, misses: 4, timer: c.timer, clear: c.clear});
  let err = null; w.hung.catch(e => { err = e; });
  for ( let i = 0; i < 7; i++ ) await c.step();
  assert.equal(err, null, "the answer in the middle broke the run of misses");
  assert.equal(w.missed, 3);
  await c.step();
  assert.ok(err?.hang, "a probe that throws is a miss");
  const c2 = clock();
  const w2 = watchHang({probe: async () => false, misses: 1, timer: c2.timer, clear: c2.clear});
  w2.stop();
  assert.equal(c2.pending, false, "stop clears the pending check");
});

test("run-gate wires the watch in and gives a hung gate back (exit 5, no line of its own)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../lanes/run-gate.mjs", import.meta.url), "utf8");
  assert.match(src, /watchHang\(\{everyMs: hangEveryMs, misses: hangChecks/);
  assert.match(src, /if \( e\?\.hang \) \{ run\.catch\(\(\) => \{\}\); await bail\(5, `Lane \$\{lane\.id\}: /, "the bail line starts with the lane, not the gate, so the queue gives the gate back");
  assert.match(src, /await bail\(5, `Lane \$\{lane\.id\}: could not sign in again before/);
  assert.match(src, /finally \{ watch\?\.stop\(\); \}/);
  const runner = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(runner, /stallMinutes: stallFor\(wt\.dir\)/);
  assert.match(runner, /Math\.min\(16 \* q\.size \+ 20, CEILING\)/);
});
