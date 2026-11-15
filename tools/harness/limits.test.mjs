// Power use limits (B4920-B4923): the books' limits, the house rule for great powers, per-target bars and Drained.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-actions/scripts/limit-rules.js"));
const DAY = 86400;

test("a once-a-scene Gift is refused until the scene count moves", () => {
  const thor = {name: "Might of Thor", level: 3};
  let u = L.record({}, thor, {scene: 4});
  assert.equal(L.check(u, thor, {scene: 4}).ok, false);
  assert.match(L.check(u, thor, {scene: 4}).why, /W20 p\. 181/);
  assert.equal(L.check(u, thor, {scene: 5}).ok, true);
});

test("a power of the fifth level or more is once a scene by the house rule; lower ones are free", () => {
  const big = {name: "Some Great Power", level: 5}, small = {name: "Some Small Power", level: 4};
  assert.equal(L.limitOf(big).house, true);
  assert.equal(L.limitOf(small), null);
  const u = L.record(L.record({}, big, {scene: 1}), small, {scene: 1});
  assert.equal(L.check(u, big, {scene: 1}).ok, false);
  assert.equal(L.check(u, small, {scene: 1}).ok, true);
});

test("Dementation bars one victim for the night, not the next one", () => {
  const p = {name: "Eyes of Chaos", disc: "Dementation", level: 3}, now = {worldTime: 20 * DAY + 3600 * 22};
  const u = L.record({}, p, now, {targets: ["A"]});
  const st = L.check(u, p, now, ["A", "B"]);
  assert.equal(st.ok, true);
  assert.deepEqual(st.barred, ["A"]);
  assert.equal(L.check(u, p, now, ["A"]).ok, false);
  // After noon the next day it is a new night
  assert.equal(L.check(u, p, {worldTime: 21 * DAY + 3600 * 13}, ["A"]).ok, true);
});

test("the small hours belong to the night before", () => {
  const evening = {worldTime: 5 * DAY + 3600 * 21}, smallHours = {worldTime: 6 * DAY + 3600 * 3};
  assert.equal(L.periodKey("night", evening), L.periodKey("night", smallHours));
});

test("a ghost that beats Compel Soul is safe from all that vampire's Necromancy that night", () => {
  const cs = {name: "Compel Soul", disc: "Necromancy: the Path of the Sepulchre", level: 3};
  const other = {name: "Summon Soul", disc: "Necromancy: the Path of the Sepulchre", level: 2};
  const now = {worldTime: 9 * DAY};
  const won = L.record({}, cs, now, {targets: ["G"], fail: false});
  assert.equal(L.check(won, other, now, ["G"]).ok, true, "a success bars nothing");
  const lost = L.record({}, cs, now, {targets: ["G"], fail: true});
  assert.equal(L.check(lost, other, now, ["G"]).ok, false);
  assert.equal(L.check(lost, other, now, ["H"]).ok, true);
});

test("Unburden the Bestial Soul bars only after a failure", () => {
  const p = {name: "Unburden the Bestial Soul", disc: "Valeren (Healer)", level: 5}, now = {worldTime: 3 * DAY};
  assert.equal(L.check(L.record({}, p, now, {targets: ["S"], fail: false}), p, now, ["S"]).ok, true);
  assert.equal(L.check(L.record({}, p, now, {targets: ["S"], fail: true}), p, now, ["S"]).ok, false);
});

test("once a turn follows the fight's round", () => {
  const p = {name: "Samiel's Vengeance", level: 6};
  const r1 = {combat: {id: "c", round: 1}}, r2 = {combat: {id: "c", round: 2}};
  const u = L.record({}, p, r1);
  assert.equal(L.check(u, p, r1).ok, false);
  assert.equal(L.check(u, p, r2).ok, true);
});

test("old uses are pruned; story uses and tonight's family bars stay", () => {
  const thor = {name: "Might of Thor"}, cs = {name: "Compel Soul", disc: "Necromancy: the Path of the Sepulchre"};
  let u = L.record({}, thor, {scene: 1});
  u = L.record(u, cs, {worldTime: DAY}, {targets: ["G"], fail: true});
  const p = L.prune(u, {scene: 2, worldTime: DAY});
  assert.equal(p["might-of-thor"], undefined);
  assert.equal(p["compel-soul"].length, 1);
});

test("Drained is +1 difficulty and comes only from great powers", () => {
  assert.equal(L.DRAINED.mods.ownDiff, 1);
  assert.equal(L.drains({level: 5}), true);
  assert.equal(L.drains({level: 4}), false);
});

test("every book limit names its page and a period WoDX keeps", () => {
  for ( const l of L.LIMITS ) {
    assert.ok(l.page && /p\. \d+/.test(l.page), `${l.name ?? l.disc} needs a page`);
    assert.ok(L.PERIODS[l.per], `${l.name ?? l.disc}: unknown period ${l.per}`);
  }
});
