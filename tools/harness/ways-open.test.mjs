// Ways, the open world's doorways (B4780-B4783): the pure rules.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-storyteller/scripts/way-rules.mjs"));

test("every kind of way has a label and words", () => {
  for ( const k of W.WAY_ORDER ) assert.ok(W.WAY_KINDS[k].label && W.WAY_KINDS[k].words, k);
  assert.equal(W.wayMinutes({kind: "door"}), 1);
  assert.equal(W.wayMinutes({kind: "road"}), null, "a road's end goes by the trip rules");
  assert.equal(W.wayMinutes({kind: "road", minutes: 40}), 40, "a way's own minutes win");
});

test("a town gate shuts at night and says what can be done", () => {
  assert.equal(W.wayBlocked({shut: "night"}, {night: false}), null);
  const b = W.wayBlocked({shut: "night"}, {night: true});
  assert.match(b.why, /shut for the night/);
  assert.ok(b.can.includes("Wait for dawn"));
  assert.match(W.wayBlocked({shut: "locked"}, {locked: true}).why, /locked/);
  assert.equal(W.wayBlocked({shut: "locked"}, {locked: false}), null, "an opened lock lets them through");
  assert.ok(W.wayBlocked({shut: "closed"}, {}));
  assert.equal(W.wayBlocked({shut: "asks"}, {}), null, "asking first is the approval queue, not a shut door");
  assert.ok(W.wayAsks({shut: "asks"}));
});

test("a way that the year has not built yet, or has lost, is not there", () => {
  assert.match(W.wayBlocked({built: {from: 1866}}, {year: 1200}).why, /nothing there yet/);
  assert.match(W.wayBlocked({built: {to: 1645}}, {year: 1700}).why, /gone/);
  assert.equal(W.wayBlocked({built: {from: 1199}}, {year: 1200}), null);
});

test("the company close by and followers go along; strangers stay", () => {
  const g = 100;
  const walker = {id: "w", actorId: "A", x: 0, y: 0, pc: true};
  const toks = [walker, {id: "n", actorId: "B", x: 200, y: 0, pc: true}, {id: "far", actorId: "C", x: 900, y: 0, pc: true},
    {id: "npc", actorId: "D", x: 100, y: 0, pc: false}, {id: "f", actorId: "E", x: 1500, y: 0, pc: false, follows: "A"}];
  const go = W.companions(walker, toks, g).map(t => t.id);
  assert.deepEqual(go, ["w", "n", "f"]);
  assert.deepEqual(W.companions(null, toks, g), []);
});

test("the network check names dead ends and places that cannot be reached", () => {
  const ok = [{id: "a", name: "Gate", ways: [{to: "b"}]}, {id: "b", name: "Square", ways: [{to: "a"}, {to: "c"}]}, {id: "c", name: "Inn", ways: [{to: "b"}]}];
  assert.deepEqual(W.checkNetwork(ok), []);
  const bad = [...ok, {id: "d", name: "Cellar", ways: [{to: "x"}]}];
  const out = W.checkNetwork(bad).join(" ");
  for ( const w of ["Cellar has a way to a place that is not there", "Cellar has no way out", "Cellar has no way in", "Cellar cannot be reached"] ) assert.ok(out.includes(w), w);
});

test("the line on the way in says where and how long", () => {
  assert.equal(W.wayLine({kind: "gate"}, "Lower Town", 3), "Lower Town, through the gate, 3 minutes.");
  assert.equal(W.wayLine({kind: "door"}, "The Inn", 1), "The Inn, through the door, 1 minute.");
  assert.equal(W.wayLine({kind: "road"}, "Dolany", null), "Dolany, by the road.");
});
