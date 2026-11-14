import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Hedge magic Enchantment (B3810-B3813) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
await imp("modules/wodx-library/scripts/wonder-lines.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const HK = await imp("modules/wodx-library/scripts/wonders-hedge.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = HK.hedgeKit;

const actor = (path = 3, wp = 4) => ({name: "Jana", system: {abilities: {occult: {value: 3}, science: {value: 1}, craft: {value: 2}}, advantages: {willpower: {temporary: wp, permanent: 5}}},
  items: path ? [{id: "p1", type: "Power", name: "Path of Enchantment", system: {type: "wod.types.numina", value: path}}] : []});
const maker = (p, wp) => kit.makerOf(kit.factsFrom(actor(p, wp), {profile: "mortal"}));

test("hedge: registered; only the path's knowers; levels up to the rating", () => {
  assert.ok(R.kitFor("hedge"));
  for ( const r of HK.LEVELS ) { assert.ok(r.does && r.pdf && !/—/.test(r.does), r.key); }
  assert.equal(maker(0).kind, null);
  assert.equal(maker(3).kind, "enchanter");
  assert.deepEqual(kit.listFor(maker(2)).map(r => r.level), [1, 2]);
  assert.match(kit.blockers(HK.LEVELS[0], maker(3), {power: "dice", amount: 3}).join(), /at most 2/);
  assert.match(kit.blockers(HK.LEVELS[2], maker(3), {power: "attr", amount: 1}).join(), /Attribute/);
  assert.match(kit.blockers(HK.LEVELS[0], maker(3, 0), {}).join(), /Willpower/);
});

test("hedge: one roll at 4 + level after two days a level, a Willpower paid on the roll", () => {
  const w = HK.LEVELS[2], t = T.normTask({...kit.taskFor(w, maker(3), {power: "ward", amount: 2, mastered: true}), wonder: w.key});
  assert.deepEqual([t.attr, t.ability, t.diff, t.goal, t.maxRolls, t.delay, t.interval], ["intelligence", "occult", 6, 1, 1, 5, "day"]);
  assert.deepEqual(t.perRoll.map(c => [c.path, c.amount]), [["system.advantages.willpower.temporary", 1]]);
  assert.equal(T.normTask(kit.taskFor(w, maker(3), {techno: true})).ability, "science");
  assert.equal(HK.difficultyOf(HK.LEVELS[0], {mastered: true, fine: true}), 3);
});

test("hedge: the item carries its power, its uses and an Attribute while worn", () => {
  const w = HK.LEVELS[1];
  const [a] = kit.itemsFor(w, {successes: 3, task: kit.taskFor(w, maker(3), {power: "attr", attr: "perception", amount: 2, uses: "daily"})});
  const f = a.flags["wodx-library"].wonder;
  assert.deepEqual(f.worn, [{attr: "perception", value: 2, label: "Lesser talisman (Enchantment)"}]);
  assert.equal(P.powerOf(f, "power").perNight, true);
  const [c] = kit.itemsFor(w, {successes: 3, task: kit.taskFor(w, maker(3), {power: "soak", amount: 2, uses: "charges"})});
  assert.deepEqual(c.flags["wodx-library"].wonder.uses, {value: 3, max: 3});
  const [o] = kit.itemsFor(w, {successes: 1, task: kit.taskFor(w, maker(3), {power: "damage", uses: "once"})});
  assert.equal(o.flags["wodx-library"].wonder.oneUse, true);
  assert.deepEqual(kit.costs(w, {}), []);
});
