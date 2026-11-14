import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../../modules/wodx-storyteller/scripts/haven-works-rules.mjs";
import * as H from "../../modules/wodx-storyteller/scripts/haven-rules.mjs";
import * as P from "../../modules/wodx-storyteller/scripts/projects-rules.mjs";
import * as R from "../../modules/wodx-storyteller/scripts/tasks-rules.mjs";

test("haven works: the upgrade list follows the year, the way of life and the owner's kind", () => {
  const keys = o => W.upgradesFor(o).map(u => u.key);
  assert.ok(keys({year: 1197, way: "latin"}).includes("door"));
  assert.ok(!keys({year: 1197, way: "latin"}).includes("cameras"));
  assert.ok(keys({year: 1990, way: "latin"}).includes("cameras"));
  assert.ok(!keys({year: 1990, way: "latin"}).includes("door"));
  assert.ok(keys({year: 1300, way: "islamic"}).includes("courtyard"));
  assert.ok(!keys({year: 1300, way: "latin"}).includes("courtyard"));
  assert.ok(!keys({year: 1300}).includes("ward"));
  assert.ok(keys({year: 1300, beings: ["Mage"]}).includes("ward"));
  assert.ok(!keys({year: 1300, have: ["door"]}).includes("door"));
  // one show room for each era
  for ( const y of [1197, 1700, 1990] ) assert.equal(W.upgradesFor({year: y}).filter(u => u.show).length, 1, `show room in ${y}`);
});

test("haven works: installing leaves passing traces that fade, standing ones stay", () => {
  let w = W.install({}, "wall", 0);
  w = W.install(w, "ward", 0);
  assert.equal(w.upgrades.length, 2);
  const t0 = W.tracesNow(w, 0);
  assert.ok(t0.find(t => t.key === "builders").w === 1);
  assert.ok(t0.find(t => t.key === "ward").w === 1);
  const t2 = W.tracesNow(w, 2 * W.YEAR);
  assert.ok(t2.find(t => t.key === "builders").w < 0.1);
  assert.equal(t2.find(t => t.key === "ward").w, 1);
  assert.equal(W.install(w, "wall", 5).upgrades.length, 2, "once");
  // staff: loyal ones count for less
  const loyal = W.tracesNow({staff: [{post: "servant", loyal: 5}]}, 0).find(t => t.key === "servants").w;
  const fickle = W.tracesNow({staff: [{post: "servant", loyal: 0}]}, 0).find(t => t.key === "servants").w;
  assert.ok(loyal < fickle);
});

test("haven works: the haven keeps its works, and security comes from them", () => {
  const h = H.normHaven({name: "x", upgrades: [{key: "door", at: 1}, {key: "nope"}], staff: [{post: "guard", name: "Ota"}], traces: [{key: "builders", at: 1}]});
  assert.deepEqual(h.upgrades.map(u => u.key), ["door"]);
  assert.equal(h.staff[0].loyal, 3);
  assert.equal(W.securityFrom(h), 2);
});

test("haven works: probes fit the traces and the rival, and the chance falls with security", () => {
  const tr = [{key: "builders", w: 1}];
  assert.equal(W.pickProbe(tr, {}).key, "scout");
  assert.equal(W.pickProbe([{key: "servants", w: 1}, ...tr], {}).key, "bribe");
  assert.equal(W.pickProbe([{key: "ward", w: 1}], {}), null);
  assert.equal(W.pickProbe([{key: "ward", w: 1}], {awakened: true}).key, "ward");
  assert.equal(W.pickProbe([{key: "data", w: 1}], {}, 1980), null);
  assert.equal(W.pickProbe([{key: "data", w: 1}], {}, 2000).key, "hack");
  assert.equal(W.pickProbe(tr, {knows: true}), null, "a rival who knows only does harm");
  assert.equal(W.pickProbe(tr, {knows: true, violent: true}).key, "fire");
  assert.ok(W.probeChance(tr, 0) > W.probeChance(tr, 4));
  assert.ok(W.probeChance(Array(50).fill({w: 1}), 0) <= 0.5);
  // cooldown
  const works = {traces: [{key: "builders", at: 0, w: 5}], probed: {r1: 0}};
  assert.equal(W.probeMonth({works, rival: {id: "r1"}, now: W.MONTH, rand: () => 0}), null);
  assert.equal(W.probeMonth({works, rival: {id: "r1"}, now: 4 * W.MONTH, rand: () => 0}).probe.key, "scout");
});

test("haven works: an upgrade is a downtime project with its own troubles", () => {
  const t = R.normTask({kind: "upgrade", haven: "s1", upgrade: "wall"});
  assert.equal(t.kind, "upgrade");
  assert.equal(t.haven, "s1");
  assert.equal(t.upgrade, "wall");
  assert.ok(P.troubleFor("upgrade", 1500).some(r => r.key === "plans"));
  assert.match(P.outcomeOf({kind: "upgrade"}).text, /works are done/);
});
