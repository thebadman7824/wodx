import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Kuei-jin stone weapons and true jade (B3770-B3779), and the engine's night limit, expiry and ambient gain (B3774) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const KD = await imp("modules/wodx-library/data/wonders-kuei-jin.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const KK = await imp("modules/wodx-library/scripts/wonders-kuei-jin.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = KK.kueiJinKit;

const art = (id, name, v) => ({id, type: "Power", name, system: {type: "wod.types.discipline", value: v}});
const actor = ({jade = 6, variant = "kindredeast", extra = [], wp = 4} = {}) => ({name: "Lin Mei", type: "Vampire",
  system: {settings: {variant}, advantages: {willpower: {temporary: wp, permanent: 6}}},
  items: [art("a1", "Jade Shintai", jade), ...extra, {id: "j1", type: "Item", name: "Jade ring", system: {}}]});
const maker = (o, profile = "kindred") => kit.makerOf(kit.factsFrom(actor(o), {profile}));
const DAY = 86400;

test("kuei-jin: rows carry refs; registered; only Kuei-jin with Jade Shintai 6 or the power", () => {
  for ( const r of KD.ROWS ) { assert.ok(r.does && r.page && r.book, r.key); assert.ok(!/—/.test(r.does), r.key); }
  assert.ok(R.kitFor("kuei-jin"));
  assert.equal(maker().kind, "wangyu");
  assert.deepEqual(kit.listFor(maker()).map(r => r.key), ["blade-of-stone", "taste-of-jade"]);
  assert.equal(maker({variant: ""}).kind, null, "a western Kindred");
  assert.equal(maker({}, "mage").kind, null);
  assert.equal(maker({jade: 5}).kind, null);
  const one = maker({jade: 3, extra: [art("p1", "Taste of Jade", 0)]});
  assert.deepEqual(kit.listFor(one).map(r => r.key), ["taste-of-jade"]);
  assert.match(kit.blockers(KD.byKey["blade-of-stone"], one, {shape: "sword"}).join(), /Jade Shintai 6/);
});

test("kuei-jin: Blade of Stone is one Manipulation + Crafts roll at 8 and makes an aggravated weapon, chart damage plus two", () => {
  const m = maker(), r = KD.byKey["blade-of-stone"];
  assert.match(kit.blockers(r, m, {shape: ""}).join(), /shape/);
  assert.deepEqual(kit.blockers(r, m, {shape: "axe"}), []);
  const t = T.normTask({...kit.taskFor(r, m, {shape: "axe"}), wonder: "blade-of-stone"});
  assert.deepEqual([t.attr, t.ability, t.diff, t.goal, t.maxRolls], ["manipulation", "craft", 8, 1, 1]);
  const [w] = kit.itemsFor(r, {task: kit.taskFor(r, m, {shape: "axe"})});
  assert.equal(w.type, "Melee Weapon");
  assert.deepEqual([w.system.damage.attribute, w.system.damage.bonus, w.system.damage.type], ["strength", 5, "aggravated"]);
  assert.equal(w.flags["wodx-library"].wonder.key, "blade-of-stone");
  assert.equal(kit.marks(r, {opts: {}}), false);
});

test("kuei-jin: Taste of Jade costs a Willpower, Perception + Meditation at 9, and lasts a night a success", () => {
  const m = maker(), r = KD.byKey["taste-of-jade"];
  assert.match(kit.blockers(r, maker({wp: 0}), {attune: "yin"}).join(), /Willpower/);
  assert.match(kit.blockers(r, m, {attune: ""}).join(), /Yin or Yang/);
  const t = T.normTask({...kit.taskFor(r, m, {attune: "yin"}), wonder: "taste-of-jade"});
  assert.deepEqual([t.attr, t.ability, t.diff, t.maxRolls], ["perception", "meditation", 9, 1]);
  assert.deepEqual(t.perRoll.map(c => [c.path, c.amount]), [["system.advantages.willpower.temporary", 1]]);
  const [j] = kit.itemsFor(r, {at: 1000, successes: 3, task: kit.taskFor(r, m, {attune: "yin"})});
  const f = j.flags["wodx-library"].wonder;
  assert.deepEqual(f.pool, {label: "Yin Chi", value: 0, max: 2});
  assert.equal(f.expires, 1000 + 3 * DAY);
  assert.equal(P.powerOf(f, "draw").transfer.to, "actor:system.advantages.yinchi.temporary");
  const tt = kit.taskFor(r, m, {attune: "yang", target: "j1"});
  assert.deepEqual(kit.itemsFor(r, {task: tt}), []);
  assert.equal(kit.marks(r, tt), true);
});

test("kuei-jin: the jade takes in Chi once a night at the Wall plus three, two at most; it fades after its nights", () => {
  const r = KD.byKey["taste-of-jade"];
  const f = kit.flagFor(r, {at: 0, successes: 2, task: kit.taskFor(r, maker(), {attune: "yang"})});
  const ab = P.powerOf(f, "absorb");
  assert.equal(P.askedDiff(ab.roll, 4), 7);
  assert.equal(P.askedDiff(ab.roll, 9), 9, "the Wall is held to 6");
  const now = 20 * 3600;
  const out = P.plan(ab, {flag: f, values: {"item:flags.wodx-library.wonder.pool.value": 1}, roll: {successes: 3, botch: false}, now});
  assert.equal(out.item["flags.wodx-library.wonder.pool.value"], 2, "capped at two");
  assert.equal(out.item["flags.wodx-library.wonder.nights.absorb"], P.nightOf(now));
  const tried = {...f, nights: {absorb: P.nightOf(now)}};
  assert.match(P.blockersOf(ab, {flag: tried, values: {}, now: now + 3600}).join(), /tonight/);
  assert.deepEqual(P.blockersOf(ab, {flag: tried, values: {}, now: now + DAY}), []);
  assert.match(P.blockersOf(P.powerOf(f, "draw"), {flag: f, values: {"item:flags.wodx-library.wonder.pool.value": 1}, now: 3 * DAY}).join(), /ordinary jade/);
  const failed = P.plan(ab, {flag: f, values: {}, roll: {successes: 0, botch: false}, now});
  assert.equal(failed.item["flags.wodx-library.wonder.nights.absorb"], P.nightOf(now), "a failed try still uses the night");
});

test("kuei-jin: drawing moves a point into the body's Chi; a botch spending it bursts the jade", () => {
  const r = KD.byKey["taste-of-jade"];
  const f = kit.flagFor(r, {at: 0, successes: 2, task: kit.taskFor(r, maker(), {attune: "yang"})});
  const vals = {"item:flags.wodx-library.wonder.pool.value": 2, "actor:system.advantages.yangchi.temporary": 3};
  const d = P.plan(P.powerOf(f, "draw"), {flag: f, values: vals});
  assert.equal(d.actor["system.advantages.yangchi.temporary"], 4);
  assert.equal(d.item["flags.wodx-library.wonder.pool.value"], 1);
  const b = P.plan(P.powerOf(f, "burst"), {flag: f, values: vals, roll: {successes: 1, botch: false}});
  assert.equal(b.spent, true);
});

test("kuei-jin: after() turns a carried piece true", async () => {
  const r = KD.byKey["taste-of-jade"], ups = [];
  const ring = {name: "Jade ring", system: {}, update: async u => ups.push(u)};
  const t = {...kit.taskFor(r, maker(), {attune: "yin", target: "j1"}), total: 2};
  const lines = await kit.after({row: r, task: t, status: "done", services: {actor: {name: "Lin Mei", items: {get: () => ring}}}});
  assert.equal(ups[0]["flags.wodx-library.wonder"].attune, "yin");
  assert.ok(lines.some(l => /2 nights/.test(l)), lines.join(" | "));
});
