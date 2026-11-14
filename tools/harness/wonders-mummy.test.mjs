import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Mummy amulets, ushabti and creature effigies, Sekhem Vessels (B3706-B3711) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const M = await imp("modules/wodx-library/data/wonders-mummy.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const MK = await imp("modules/wodx-library/scripts/wonders-mummy.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = MK.mummyKit;

const hk = (id, name, v) => ({id, type: "Power", name, system: {type: "wod.types.hekau", value: v}});
const rit = (id, name) => ({id, type: "Power", name, system: {type: "wod.types.hekaupower", value: 0}});
const actor = ({sekhem = 6, made = 0, extra = []} = {}) => ({name: "Nefer", system: {
  advantages: {balance: {permanent: 2}, sekhem: {temporary: sekhem, permanent: 7}}, abilities: {craft: {value: 3}, occult: {value: 2}}, attributes: {perception: {value: 2}}},
  items: [hk("h1", "Amulets", 4), hk("h2", "Effigy", 3), rit("r1", "Greater Talisman"), rit("r2", "Simple Servitor"), rit("r3", "Sekhem Vessel"), rit("r4", "Simple Ward"),
    ...Array.from({length: made}, (_, i) => ({id: `m${i}`, type: "Item", name: `Ward ${i}`, flags: {"wodx-library": {wonder: {line: "mummy", maker: "Nefer", counts: true}}}})), ...extra]});
const maker = o => kit.makerOf(kit.factsFrom(actor(o), {profile: "mummy"}));

test("mummy: rows have page refs and no em-dash; registered; only the Reborn; list by path rating", () => {
  for ( const r of M.ROWS ) { assert.ok(r.does && r.pdf && M.TRAITS[r.trait], r.key); assert.ok(!/—/.test(r.does), r.key); }
  assert.ok(R.kitFor("mummy"));
  assert.equal(kit.makerOf(kit.factsFrom(actor(), {profile: "kindred"})).kind, null);
  const keys = kit.listFor(maker()).map(r => r.key);
  assert.ok(keys.includes("greater-talisman") && keys.includes("sekhem-vessel"));
  assert.ok(!keys.includes("princely-talisman") && !keys.includes("superior-creature"));
});

test("mummy: the inscription rolls trait + path, successes equal to Sekhem, a Sekhem a roll", () => {
  const t = T.normTask({...kit.taskFor(M.byKey["greater-talisman"], maker(), {attr: "strength"}), wonder: "greater-talisman"});
  assert.equal(t.pool, "path:system.abilities.craft");
  assert.deepEqual([t.dice, t.diff, t.goal, t.interval], [4, 7, 30, "hour"]);
  assert.deepEqual(t.perRoll.map(c => [c.path, c.amount]), [["system.advantages.sekhem.temporary", 1]]);
});

test("mummy: blockers for ritual known, path, Attribute, Sekhem and the active limit", () => {
  assert.deepEqual(kit.blockers(M.byKey["greater-talisman"], maker(), {attr: "wits"}), []);
  assert.match(kit.blockers(M.byKey["greater-talisman"], maker()).join(), /pick the Attribute/);
  assert.match(kit.blockers(M.byKey["lesser-ward"], maker()).join(), /has not learned Lesser Ward/);
  assert.match(kit.blockers(M.byKey["simple-ward"], maker({sekhem: 0})).join(), /no Sekhem/);
  assert.equal(MK.limitOf(maker()), 6);
  assert.match(kit.blockers(M.byKey["simple-ward"], maker({made: 6})).join(), /already keeps 6/);
  assert.deepEqual(kit.blockers(M.byKey["simple-servitor"], maker({made: 5})), []);
  assert.match(kit.blockers(M.byKey["sekhem-vessel"], maker({sekhem: 3}), {store: 5}).join(), /cannot put in 5 Sekhem with 3/);
});

test("mummy: a talisman gives its Attribute while worn and lasts Amulets + Balance months", () => {
  const m = maker(), t = kit.taskFor(M.byKey["greater-talisman"], m, {attr: "strength"});
  const [it] = kit.itemsFor(M.byKey["greater-talisman"], {maker: "Nefer", at: 100, task: t});
  const f = it.flags["wodx-library"].wonder;
  assert.deepEqual(f.worn.map(w => [w.attr, w.value]), [["strength", 2]]);
  assert.equal(f.lasts.months, 6); assert.equal(f.lasts.until, 100 + 6 * 30 * 86400);
  assert.equal(f.counts, true);
  const list = P.wornList(f, true, []);
  assert.deepEqual(list.map(b => [b.type, b.settingtype, b.value]), [["attribute_buff", "strength", 2]]);
});

test("mummy: a Sekhem Vessel holds what was poured in; drawing moves a point a success, capped by the rating", () => {
  const m = maker(), t = {...kit.taskFor(M.byKey["sekhem-vessel"], m, {store: 4}), status: "done"};
  assert.deepEqual(kit.costs(M.byKey["sekhem-vessel"], t).map(c => [c.path, c.amount]), [["system.advantages.sekhem.temporary", 4]]);
  const f = kit.flagFor(M.byKey["sekhem-vessel"], {task: t});
  assert.deepEqual(f.pool, {label: "Sekhem", value: 4, max: 4});
  const draw = P.powerOf(f, "draw");
  assert.ok(P.pathsOf(draw).includes("system.advantages.sekhem.permanent"));
  const vals = {"item:flags.wodx-library.wonder.pool.value": 4, "actor:system.advantages.sekhem.temporary": 5, "actor:system.advantages.sekhem.permanent": 7};
  const out = P.plan(draw, {flag: f, values: vals, roll: {successes: 3, botch: false}});
  assert.equal(out.actor["system.advantages.sekhem.temporary"], 7, "two fit under the rating of 7");
  assert.equal(out.item["flags.wodx-library.wonder.pool.value"], 2);
});

test("mummy: an ushabti becomes a companion with three health levels and a monthly upkeep", async () => {
  const made = [];
  globalThis.Actor = {createDocuments: async d => { made.push(...d); return d.map(x => ({...x})); }};
  try {
    const t = kit.taskFor(M.byKey["simple-servitor"], maker());
    const [tok] = kit.itemsFor(M.byKey["simple-servitor"], {maker: "Nefer", task: t});
    assert.equal(P.powerOf(tok.flags["wodx-library"].wonder, "upkeep").spend.amount, 1);
    const lines = await kit.after({row: M.byKey["simple-servitor"], task: t, status: "done", services: {actor: {name: "Nefer", id: "a1", ownership: {u1: 3}, items: []}}});
    assert.equal(made[0].type, "Creature");
    assert.equal(made[0].flags["wodx-library"].effigy.health, 3);
    assert.equal(made[0].flags["wodx-library"].effigy.fights, false);
    assert.ok(lines.some(l => /1 Sekhem a month/.test(l)));
  } finally { delete globalThis.Actor; }
});
