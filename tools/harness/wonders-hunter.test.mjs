import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Inquisitors' blessings and relics (B3717-B3719) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const H = await imp("modules/wodx-library/data/wonders-hunter.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const HK = await imp("modules/wodx-library/scripts/wonders-hunter.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = HK.hunterKit;

const actor = ({order = "john", conviction = 3, wp = 4} = {}) => ({name: "Sister Agnes", system: {advantages: {willpower: {temporary: wp, permanent: 6}}},
  flags: {"wodx-actions": {inquisitor: {order, conviction, faith: 3, wisdom: 2, zeal: 1}}},
  items: [{id: "s1", type: "Melee Weapon", name: "Mace", system: {}}, {id: "b1", type: "Item", name: "Finger bone of St Ludmila", system: {}}]});
const maker = (o, year = 1240) => kit.makerOf(kit.factsFrom(actor(o), {profile: "hunter", year}));

test("hunter: rows refs, registered; only inquisitors before 1500; relics only for an order", () => {
  for ( const r of H.ROWS ) { assert.ok(r.does && r.page && r.pdf, r.key); assert.ok(!/—/.test(r.does), r.key); }
  assert.ok(R.kitFor("hunter"));
  assert.equal(maker().kind, "inquisitor");
  assert.equal(maker({}, 1700).kind, null);
  assert.match(kit.blockers(H.byKey["holy-water"], maker({}, 1700)).join(), /Dark Ages/);
  assert.equal(maker().faithRating, 3, "advocate stage: True Faith 3");
  assert.deepEqual(kit.listFor(maker({order: ""})).map(r => r.key), ["holy-water", "holy-salt", "holy-weapon"]);
});

test("hunter: a blessing is one prayer roll and a Willpower; water comes a vial a success for the scene", () => {
  const m = maker(), t = T.normTask({...kit.taskFor(H.byKey["holy-water"], m), wonder: "holy-water"});
  assert.deepEqual([t.attr, t.ability, t.diff, t.maxRolls], ["charisma", "religion", 6, 1]);
  assert.deepEqual(t.perRoll.map(c => [c.path, c.amount]), [["system.advantages.willpower.temporary", 1]]);
  const [w] = kit.itemsFor(H.byKey["holy-water"], {task: kit.taskFor(H.byKey["holy-water"], m), successes: 3});
  const f = w.flags["wodx-library"].wonder;
  assert.deepEqual(f.uses, {value: 3, max: 3});
  assert.match(P.powerOf(f, "present").label, /True Faith 3/);
  assert.equal(P.plan(P.powerOf(f, "end"), {flag: f, values: {}}).spent, true);
});

test("hunter: a weapon must be carried and be a weapon; it is marked, not made", async () => {
  const m = maker();
  assert.match(kit.blockers(H.byKey["holy-weapon"], m, {}).join(), /pick the weapon/);
  assert.match(kit.blockers(H.byKey["holy-weapon"], m, {target: "b1"}).join(), /not a weapon/);
  const t = kit.taskFor(H.byKey["holy-weapon"], m, {target: "s1"});
  assert.deepEqual(kit.itemsFor(H.byKey["holy-weapon"], {task: t}), []);
  assert.equal(kit.marks(H.byKey["holy-weapon"], t), true);
  const ups = [];
  const mace = {name: "Mace", system: {}, update: async u => ups.push(u)};
  const lines = await kit.after({row: H.byKey["holy-weapon"], task: {...t, total: 2}, status: "done", services: {actor: {name: "Agnes", items: {get: () => mace}}}});
  assert.equal(ups[0]["flags.wodx-library.wonder"].key, "holy-weapon");
  assert.ok(lines.some(l => /blessed for the scene/.test(l)));
});

test("hunter: enshrining is an order's weekly rite; the relic's rating is a success in five, 1 to 3", () => {
  const m = maker(), row = H.byKey["enshrine-relic"];
  assert.match(kit.blockers(row, maker({order: ""}), {target: "b1"}).join(), /only an order/);
  const t = kit.taskFor(row, m, {target: "b1"});
  assert.deepEqual([t.attr, t.ability, t.diff, t.goal, t.interval, t.delicate], ["intelligence", "religion", 7, 10, "week", true]);
  assert.equal(kit.flagFor(row, {task: t, successes: 11}).relic.rating, 2);
  assert.equal(kit.flagFor(row, {task: t, successes: 40}).relic.rating, 3);
  assert.ok(kit.cautions(row).some(c => /arise on their own/.test(c)));
});
