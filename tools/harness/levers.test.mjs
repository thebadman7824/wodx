import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Crisis levers for a region (B3524 to B3527): ranges, the era's words, records and undo; Wyrm spread rate and lever drift. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/levers-rules.mjs")).href);
const C = await import(pathToFileURL(join(root, "modules/wodx-otherworlds/scripts/corruption-rules.mjs")).href);
const D = await import(pathToFileURL(join(root, "modules/wodx-otherworlds/scripts/drift-rules.mjs")).href);

test("levers keep to their ranges and steps; the Gauntlet moves at most 2 either way", () => {
  assert.equal(L.clampLever("gauntlet", 5), 2);
  assert.equal(L.clampLever("gauntlet", -7), -2);
  assert.equal(L.clampLever("plague", 1.3), 1.25);
  assert.equal(L.clampLever("wyrm", 9), 3);
  assert.equal(L.clampLever("hunters", 4.4), 4);
  assert.equal(L.clampLever("nonsense", 4), 0);
});

test("only running systems get a slider, and hunters are named for the age", () => {
  assert.deepEqual(L.available({plague: true, drift: true}).map(a => a.key), ["plague", "gauntlet", "shroud", "banality"]);
  assert.deepEqual(L.available({}).map(a => a.key), []);
  assert.match(L.available({hunters: true}, {year: 1210})[0].label, /zealots/);
  assert.match(L.available({hunters: true}, {year: 1480})[0].label, /Inquisition/);
  assert.equal(L.available({hunters: true}, {year: 1990})[0].label, "Hunter pressure");
});

test("a form's changes, a record, and an undo that puts the value back", () => {
  const cur = {plague: 1, gauntlet: 0, hunters: 3};
  const ch = L.changes(cur, {plague: "1.5", gauntlet: "0", hunters: "6"}, ["plague", "gauntlet", "hunters"]);
  assert.deepEqual(ch, [{key: "plague", from: 1, to: 1.5}, {key: "hunters", from: 3, to: 6}]);
  let st = L.record(L.blankState(), {region: "moravia", key: "plague", from: 1, to: 1.5, at: 100, id: "a1", why: "a hard winter"});
  st = L.record(st, {region: "moravia", key: "gauntlet", from: 0, to: 2, at: 200, id: "a2"});
  assert.equal(L.valueOf(st, "moravia", "plague"), 1.5);
  assert.equal(L.valueOf(st, "moravia", "gauntlet"), 2);
  assert.equal(L.valueOf(st, "bohemia", "plague"), 1);
  assert.equal(L.lastOpen(st, "moravia").id, "a2");
  st = L.markUndone(st, "a2");
  assert.equal(L.valueOf(st, "moravia", "gauntlet"), 0);
  assert.equal(L.lastOpen(st, "moravia").id, "a1");
  assert.equal(L.normState(st).log.length, 2, "the dated log keeps both");
  assert.match(L.words({key: "gauntlet", from: 0, to: 2}), /Gauntlet: 0 to \+2/);
  assert.match(L.words({key: "plague", from: 1, to: 1.5}), /1 to 1.5 times/);
});

test("the plague lever scales an outbreak's weekly attack and the undo scales it back", () => {
  const a = L.scaleAttack(0.2, 1, 1.5);
  assert.ok(Math.abs(a - 0.3) < 1e-9);
  assert.ok(Math.abs(L.scaleAttack(a, 1.5, 1) - 0.2) < 1e-9);
  assert.equal(L.scaleAttack(0.8, 1, 2), 0.9, "capped");
});

test("Wyrm spread rate multiplies the chance to deepen and to spread; 0 holds it", () => {
  assert.equal(C.riseChance(2, 1197, 0), 0);
  assert.ok(C.riseChance(2, 1197, 2) > C.riseChance(2, 1197, 1));
  const hi = C.spreadChance(8, 3, 1990, 2), lo = C.spreadChance(8, 3, 1990, 1);
  assert.ok(hi >= lo && hi <= 0.6);
  assert.equal(C.normRate("x"), 1);
  assert.equal(C.normRate(7), 3);
  // A whole week with rate 0 never deepens a place
  const places = {a: {name: "A", place: {level: 3, sources: [{kind: "hive"}]}, rate: 0}};
  for ( let i = 0; i < 20; i++ ) assert.equal(C.weekTurn(places, {now: i * C.WEEK, year: 1990, rng: () => 0}).places.a.level, 3);
});

test("lever drift moves one track by its step, inside -3 to +3, and undoes by its own track", () => {
  let d = D.normDrift({value: 2});
  const r = D.leverDrift(d, "value", 2, {at: 5, why: "lever"});
  assert.equal(r.value, 3);
  assert.equal(r.taken, 1, "only the step that fits is taken");
  const s = D.leverDrift(r, "shroud", -2);
  assert.equal(s.shroud, -2);
  assert.equal(D.normDrift(s).log.at(-1).track, "shroud");
  const u = D.undoDrift(s);
  assert.equal(u.shroud, 0);
  assert.equal(u.value, 3);
});

test("the window uses fixed lists and sits in the Storyteller's hand", () => {
  const src = readFileSync(join(root, "modules/wodx-storyteller/scripts/levers.mjs"), "utf8");
  for ( const m of src.matchAll(/<select [^>]*>/g) ) assert.match(m[0], /data-fixed/);
  assert.match(src, /addTool\(\{key: "levers"/);
  assert.match(readFileSync(join(root, "modules/wodx-storyteller/scripts/main.mjs"), "utf8"), /Levers\.registerLeverSettings\(\)/);
});
