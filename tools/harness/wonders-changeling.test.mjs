import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Changeling dreamstuff, chimerical crafting, forged chimera and Treasures (B3700-B3705) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const C = await imp("modules/wodx-library/data/wonders-changeling.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const CK = await imp("modules/wodx-library/scripts/wonders-changeling.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = CK.changelingKit;

const actor = (stuff = 5) => ({name: "Wren", system: {advantages: {glamour: {temporary: 4, permanent: 6}}}, items: [
  {id: "a1", type: "Power", name: "Primal", system: {type: "wod.types.art", value: 3}},
  {id: "a2", type: "Power", name: "Dragon's Ire", system: {type: "wod.types.art", value: 1}},
  {id: "g1", type: "Item", name: "Old guitar", system: {}},
  ...(stuff ? [{id: "d1", type: "Item", name: "Dreamstuff", system: {}, flags: {"wodx-library": {wonder: {key: "dreamstuff", pool: {value: stuff, max: stuff}}}}}] : [])]});
const maker = (s = 5) => kit.makerOf(kit.factsFrom(actor(s), {profile: "fae"}));

test("changeling: rows complete, page refs, no em-dash, registered; only changelings", () => {
  for ( const r of C.ROWS ) {
    assert.ok(r.does && r.book && r.pdf, r.key);
    assert.ok(!/—/.test(r.does), r.key);
    if ( r.kind === "craft" ) assert.ok(C.SCOPES[r.scope], r.key);
  }
  assert.ok(R.kitFor("changeling"));
  assert.equal(kit.makerOf(kit.factsFrom(actor(), {profile: "kindred"})).kind, null);
  assert.equal(maker().arts.dragonsire, 1);
});

test("changeling: crafting difficulty by scope and modifiers, never under 3; over 10 is impossible", () => {
  assert.equal(CK.craftDiff("basic", {}), 7);
  assert.equal(CK.craftDiff("advanced", {place: "realm", tools: "special", planned: 3, experienced: true}), 3);
  assert.equal(CK.craftDiff("masterwork", {place: "extreme"}), 13);
  assert.match(kit.blockers(C.byKey.masterwork, maker(9), {place: "extreme"}).join(), /over difficulty 10/);
  const t = T.normTask({...kit.taskFor(C.byKey["chimerical-weapon"], maker(), {tools: "basic"}), wonder: "chimerical-weapon"});
  assert.deepEqual([t.attr, t.ability, t.diff, t.goal, t.interval, t.delicate], ["dexterity", "craft", 6, 8, "week", false]);
});

test("changeling: crafting needs dreamstuff; gathering makes it as a pool", () => {
  assert.match(kit.blockers(C.byKey["chimerical-armor"], maker(2)).join(), /needs 3 measures of dreamstuff, has 2/);
  assert.deepEqual(kit.blockers(C.byKey["chimerical-armor"], maker(3)), []);
  const g = kit.taskFor(C.byKey.dreamstuff, maker(0));
  assert.equal(g.maxRolls, 1);
  const [stuff] = kit.itemsFor(C.byKey.dreamstuff, {successes: 3, task: g});
  assert.deepEqual(stuff.flags["wodx-library"].wonder.pool, {label: "measures of dreamstuff", value: 3, max: 3});
  assert.equal(stuff.flags["wodx-library"].wonder.chimerical, true);
});

test("changeling: weapons and armor are chimerical items of the system's kinds", () => {
  const [w] = kit.itemsFor(C.byKey["unique-weapon"], {task: kit.taskFor(C.byKey["unique-weapon"], maker())});
  assert.equal(w.type, "Melee Weapon"); assert.equal(w.system.damage.bonus, 3);
  assert.equal(w.flags["wodx-library"].wonder.chimerical, true);
  const [ar] = kit.itemsFor(C.byKey["chimerical-armor"], {task: kit.taskFor(C.byKey["chimerical-armor"], maker())});
  assert.equal(ar.type, "Armor"); assert.equal(ar.system.soak.chimerical.lethal, 3); assert.equal(ar.system.soak.lethal, 0);
});

test("changeling: imbuing a Treasure needs the Art, the thing and the Glamour; it costs a Glamour a level", () => {
  const m = maker();
  assert.match(kit.blockers(C.byKey["treasure-imbued"], m, {art: "dragonsire", level: 2, target: "g1"}).join(), /know Dragon's Ire at 2/);
  assert.deepEqual(kit.blockers(C.byKey["treasure-imbued"], m, {art: "primal", level: 2, target: "g1"}), []);
  const t = kit.taskFor(C.byKey["treasure-imbued"], m, {art: "primal", level: 2, target: "g1"});
  assert.deepEqual([t.attr, t.ability, t.goal, t.interval], ["intelligence", "gremayre", 10, "hour"]);
  assert.deepEqual(kit.costs(C.byKey["treasure-imbued"], {...t, status: "done"}).map(c => [c.path, c.amount]), [["system.advantages.glamour.temporary", 2]]);
  assert.equal(kit.marks(C.byKey["treasure-imbued"], t), true);
  assert.deepEqual(kit.itemsFor(C.byKey["treasure-imbued"], {task: t}), []);
  assert.deepEqual(kit.blockers(C.byKey["treasure-crafted"], m, {art: "winter", level: 4}), [], "a crafted Treasure's maker need not know the Art");
});

test("changeling: a Treasure's Art draws on its own Glamour first, and can be fed", () => {
  const f = kit.flagFor(C.byKey["treasure-imbued"], {task: {opts: {art: "primal", level: 2}}});
  assert.deepEqual(f.pool, {label: "Glamour", value: 0, max: 10});
  const pool = "item:flags.wodx-library.wonder.pool.value";
  assert.match(P.blockersOf(P.powerOf(f, "art"), {flag: f, values: {[pool]: 0}}).join(), /needs 1 Glamour/);
  const fed = P.plan(P.powerOf(f, "feed"), {flag: f, values: {[pool]: 0, "actor:system.advantages.glamour.temporary": 3}});
  assert.equal(fed.item["flags.wodx-library.wonder.pool.value"], 1);
  assert.equal(fed.actor["system.advantages.glamour.temporary"], 2);
  const crafted = kit.flagFor(C.byKey["treasure-crafted"], {task: {opts: {art: "winter", level: 4}}});
  assert.equal(P.powerOf(crafted, "art").spend, undefined, "a crafted Treasure's Art needs no Glamour from it");
});

test("changeling: forged chimera traits stay inside the chimera point costs", () => {
  const tr = CK.chimeraTraits(20);
  const attrDots = Object.values(tr.attributes).reduce((s, v) => s + v, 0);
  const spent = attrDots / 3 + tr.abilityDots / 3 + tr.glamour + tr.willpower * 3 + Math.ceil(tr.health / 2);
  assert.ok(spent <= 20.01, `spent ${spent}`);
  assert.ok(tr.health <= tr.attributes.stamina * 5);
});

test("changeling: after() uses up dreamstuff across held items", async () => {
  const ups = [];
  const mk = (id, v) => ({id, flags: {"wodx-library": {wonder: {key: "dreamstuff", pool: {value: v}}}}, update: async u => ups.push([id, u])});
  const a = {name: "Wren", items: [mk("x", 1), mk("y", 4)]};
  const lines = await kit.after({row: C.byKey["chimerical-armor"], task: {opts: {stuff: 3}}, status: "done", services: {actor: a}});
  assert.deepEqual(ups.map(([id, u]) => [id, u["flags.wodx-library.wonder.pool.value"]]), [["x", 0], ["y", 2]]);
  assert.ok(lines.some(l => /3 measures of dreamstuff used/.test(l)));
});
