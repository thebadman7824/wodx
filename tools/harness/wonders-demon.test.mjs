import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Demon Enchant Object and Imbue Object (B3712-B3716) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const Dm = await imp("modules/wodx-library/data/wonders-demon.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const DK = await imp("modules/wodx-library/scripts/wonders-demon.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = DK.demonKit;

const lore = (id, name, v) => ({id, type: "Power", name, system: {type: "wod.types.lore", value: v}});
const actor = ({forge = 4, torment = 4, faith = 3} = {}) => ({name: "Ashur", system: {advantages: {faith: {temporary: faith, permanent: 5}, torment: {temporary: 0, permanent: torment}, willpower: {temporary: 5, permanent: 6}}},
  items: [lore("l1", "Lore of the Forge", forge), lore("l2", "Lore of Light", 2), {id: "k1", type: "Item", name: "Iron key", system: {}}, {id: "p1", type: "Item", name: "Mobile phone", system: {}}]});
const maker = o => kit.makerOf(kit.factsFrom(actor(o), {profile: "demon"}));

test("demon: rows refs, registered, only the Fallen with Forge 4; Imbue at 5", () => {
  for ( const r of Dm.ROWS ) { assert.ok(r.does && r.cursed && r.pdf, r.key); assert.ok(!/—/.test(r.does + r.cursed), r.key); }
  assert.ok(R.kitFor("demon"));
  assert.equal(kit.makerOf(kit.factsFrom(actor(), {profile: "mage"})).kind, null);
  assert.equal(maker({forge: 3}).kind, null);
  assert.deepEqual(kit.listFor(maker()).map(r => r.key), ["enchant-object"]);
  assert.deepEqual(kit.listFor(maker({forge: 5})).map(r => r.key), ["enchant-object", "imbue-object"]);
});

test("demon: enchanting needs a known evocation and a scope; nothing electronic; difficulty 6 own, 8 carried", () => {
  const m = maker(), row = Dm.byKey["enchant-object"];
  assert.match(kit.blockers(row, m, {scope: "simple"}).join(), /pick an evocation/);
  assert.deepEqual(kit.blockers(row, m, {evocation: "light:2", scope: "notable"}), []);
  assert.match(kit.blockers(row, m, {evocation: "light:2", scope: "simple", target: "p1"}).join(), /electronic/);
  const own = T.normTask({...kit.taskFor(row, m, {evocation: "light:2", scope: "notable"}), wonder: "enchant-object"});
  assert.deepEqual([own.attr, own.ability, own.diff, own.goal, own.interval, own.delicate], ["dexterity", "craft", 6, 5, "day", true]);
  assert.equal(kit.taskFor(row, m, {evocation: "light:2", scope: "notable", target: "k1"}).diff, 8);
  assert.equal(kit.marks(row, {opts: {target: "k1"}}), true);
  assert.deepEqual(kit.costs(row, {status: "ruined"}).map(c => c.amount), [1], "the Faith goes in even when it breaks");
});

test("demon: an enchanted thing rolls Willpower at 8 or Faith at 6, a botch costs a point; attuning ends the roll", () => {
  const m = maker(), t = kit.taskFor(Dm.byKey["enchant-object"], m, {evocation: "forge:4", scope: "simple"});
  const f = kit.flagFor(Dm.byKey["enchant-object"], {task: t});
  const um = P.powerOf(f, "use-mortal"), ud = P.powerOf(f, "use-demon");
  assert.deepEqual([um.roll.diff, ud.roll.diff], [8, 6]);
  const vals = {"actor:system.advantages.willpower.temporary": 5, "actor:system.advantages.faith.temporary": 3};
  assert.equal(P.plan(um, {flag: f, values: vals, roll: {successes: 0, botch: true}}).actor["system.advantages.willpower.temporary"], 4);
  const att = P.powerOf(f, "use-attuned");
  assert.match(P.blockersOf(att, {flag: f, values: {}}).join(), /first: Attune/);
  assert.deepEqual(P.blockersOf(att, {flag: {...f, used: {"attune-demon": 1}}, values: {}}), []);
});

test("demon: a monstrous maker makes a cursed thing: Willpower lost or Torment gained, no roll", () => {
  const m = maker({torment: 7});
  assert.equal(DK.monstrous(m), true);
  const t = kit.taskFor(Dm.byKey["enchant-object"], m, {evocation: "light:1", scope: "simple"});
  const f = kit.flagFor(Dm.byKey["enchant-object"], {task: t});
  assert.equal(f.cursed, true);
  assert.equal(P.powerOf(f, "use-mortal").roll, undefined);
  const out = P.plan(P.powerOf(f, "use-demon"), {flag: f, values: {"actor:system.advantages.torment.temporary": 2}});
  assert.equal(out.actor["system.advantages.torment.temporary"], 3);
  assert.equal(P.powerOf(f, "attune-mortal"), null);
});

test("demon: Imbue Object is one roll; the soul's Willpower resists when it is done", async () => {
  const m = maker({forge: 5, torment: 8}), row = Dm.byKey["imbue-object"];
  assert.match(kit.blockers(row, m, {}).join(), /name the soul/);
  const t = {...kit.taskFor(row, m, {soul: "Old Hesper", soulKind: "demon", soulWill: 2}), status: "done", total: 3};
  assert.deepEqual([t.attr, t.ability, t.maxRolls, t.diff], ["stamina", "craft", 1, 6]);
  const ups = [];
  const vessel = {flags: {"wodx-library": {wonder: {key: "imbue-object"}}}, update: async u => ups.push(u)};
  const lines = await kit.after({row, task: t, status: "done", services: {actor: {name: "Ashur", items: [vessel]}, rand: () => 0.05}});
  assert.ok(lines.some(l => /is bound/.test(l)), lines.join(" | "));
  assert.ok(lines.some(l => /\+3 permanent Torment/.test(l)));
  const lost = await kit.after({row, task: {...t, total: 1}, status: "done", services: {actor: {name: "Ashur", items: [vessel]}, rand: () => 0.95}});
  assert.ok(lost.some(l => /slips the binding/.test(l)));
  assert.equal(ups.at(-1)["flags.wodx-library.wonder.soul.bound"], false);
});
