import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Kindred blood sorcery that makes or marks objects (B3693-B3699): rows, makers, tasks, items, marking, powers */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const K = await imp("modules/wodx-library/data/wonders-kindred.mjs");
const R = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const KK = await imp("modules/wodx-library/scripts/wonders-kindred.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const kit = KK.kindredKit;

const actor = (o = {}) => ({name: "Ilse", system: {advantages: {bloodpool: {temporary: 12}, willpower: {temporary: 5}}, abilities: {occult: {value: 3}}, attributes: {wits: {value: 3, total: 3}}},
  items: [
    {_id: "d1", type: "Power", name: "Thaumaturgy", system: {type: "wod.types.discipline", value: 5}},
    {_id: "d2", type: "Power", name: "Necromancy", system: {type: "wod.types.discipline", value: 4}},
    ...["Ward versus Ghouls", "Principal Focus of Vitae Infusion", "Shaft of Belated Quiescence", "Enchant Talisman", "Bone of Lies", "Baleful Doll", "Flaming Weapon", "Ward versus Kindred"]
      .map((name, i) => ({_id: `r${i}`, type: "Power", name, system: {type: "wod.types.ritual", level: 1}})),
    {_id: "c1", type: "Item", name: "Silver coin", system: {}},
    {_id: "s1", type: "Melee Weapon", name: "Rowan stake", system: {attack: {accuracy: 0}, damage: {bonus: 1}}},
    {_id: "w1", type: "Melee Weapon", name: "Walking staff", system: {attack: {accuracy: 0}, damage: {bonus: 1}}}
  ], ...o});
const maker = (year = 2000, o = {}) => kit.makerOf(kit.factsFrom(actor(o), {profile: "kindred", year}));

test("kindred: rows complete, page refs, no em-dash, the kit is registered", () => {
  const keys = new Set();
  for ( const r of K.RITUALS ) {
    assert.ok(!keys.has(r.key), r.key); keys.add(r.key);
    assert.ok(["thaumaturgy", "necromancy"].includes(r.path), r.key);
    assert.ok(r.level >= 1 && r.level <= 5, r.key);
    assert.ok(r.does && r.needs && r.book && r.pdf, r.key);
    assert.ok(!/—/.test(r.does + r.needs + JSON.stringify(r.item ?? {})), `${r.key}: em-dash`);
  }
  assert.ok(R.kitFor("kindred"), "registered");
  assert.equal(K.byKey["enchant-talisman"].pdf, 247);
  assert.equal(KK.diffOf(K.byKey["ward-ghouls"], 2000), 5);
  assert.equal(KK.diffOf(K.byKey["enchant-talisman"], 2000), 8, "level 5 is 3 + 5, at most 9");
  assert.equal(KK.diffOf(K.byKey["baleful-doll"], 2000), 8, "the doll is made with Stamina + Crafts at 8");
});

test("kindred: only Kindred with the sorcery; lists follow the era", () => {
  assert.equal(kit.makerOf(kit.factsFrom(actor(), {profile: "mortal"})).kind, null);
  const modern = kit.listFor(maker(2000), {year: 2000}).map(r => r.key);
  const da = kit.listFor(maker(1230), {year: 1230}).map(r => r.key);
  assert.ok(modern.includes("ward-kindred") && !modern.includes("flaming-weapon"));
  assert.ok(da.includes("flaming-weapon") && da.includes("da-ward") && !da.includes("ward-kindred"));
  assert.ok(da.includes("enchant-talisman") && modern.includes("enchant-talisman"), "both books have it");
  assert.equal(KK.levelOf(K.byKey["blood-contract"], 1230), 1, "Dark Ages Blood Contract is level 1");
  assert.equal(KK.pdfOf(K.byKey["shaft-quiescence"], 1230), 308);
  const noNec = kit.makerOf(kit.factsFrom(actor({items: actor().items.filter(i => i.name !== "Necromancy")}), {profile: "kindred", year: 2000}));
  assert.ok(!kit.listFor(noNec, {year: 2000}).some(r => r.path === "necromancy"));
});

test("kindred: blockers (rating, known ritual, blood, the right object, one talisman)", () => {
  const m = maker(2000);
  assert.deepEqual(kit.blockers(K.byKey["ward-ghouls"], m, {target: "c1"}), []);
  assert.match(kit.blockers(K.byKey["mirror-second-sight"], m).join(), /does not know/);
  assert.match(kit.blockers(K.byKey["shaft-quiescence"], m, {target: "c1"}).join(), /will not take/);
  assert.deepEqual(kit.blockers(K.byKey["shaft-quiescence"], m, {target: "s1"}), []);
  const poor = kit.makerOf(kit.factsFrom(actor({system: {...actor().system, advantages: {bloodpool: {temporary: 3}}}}), {profile: "kindred", year: 2000}));
  assert.match(kit.blockers(K.byKey["bone-of-lies"], poor).join(), /needs 10 blood/);
  const has = actor(); has.items.push({_id: "t9", type: "Item", name: "Old staff", system: {}, flags: {"wodx-library": {wonder: {key: "enchant-talisman", maker: "Ilse"}}}});
  const m2 = kit.makerOf(kit.factsFrom(has, {profile: "kindred", year: 2000}));
  assert.match(kit.blockers(K.byKey["enchant-talisman"], m2, {target: "w1"}).join(), /only one talisman/);
  assert.match(kit.blockers(K.byKey["ward-ghouls"], m2, {target: "t9"}).join(), /already holds/);
});

test("kindred: a ritual is one roll with its blood paid first; the talisman is four weeks for 20", () => {
  const m = maker(2000);
  const s = T.normTask({...kit.taskFor(K.byKey["ward-ghouls"], m, {target: "c1"}), wonder: "ward-ghouls"});
  assert.deepEqual([s.attr, s.ability, s.diff, s.goal, s.interval, s.line], ["intelligence", "occult", 5, 1, "hour", "kindred"]);
  const raw = kit.taskFor(K.byKey["ward-ghouls"], m, {target: "c1"});
  assert.equal(raw.maxRolls, 1);
  assert.deepEqual(raw.perRoll.map(c => [c.path, c.amount]), [["system.advantages.bloodpool.temporary", 1]]);
  assert.equal(raw.opts.target, "c1");
  const tal = kit.taskFor(K.byKey["enchant-talisman"], m, {target: "w1"});
  assert.deepEqual([tal.diff, tal.goal, tal.interval, tal.maxRolls, tal.perRoll[0].amount], [8, 20, "week", 4, 7]);
  const da = kit.taskFor(K.byKey["enchant-talisman"], maker(1230), {target: "w1", willpower: true});
  assert.equal(da.perRoll[1].adds, 1, "Dark Ages Willpower buys a success");
  assert.equal(kit.taskFor(K.byKey["hand-of-glory"], m).delay, 14, "a fortnight in salt");
  assert.deepEqual(T.smallOpts(raw.opts).target, "c1");
});

test("kindred: new objects carry working powers; a ward on a marked object is flagged", () => {
  const m = maker(2000), task = kit.taskFor(K.byKey["vitae-infusion"], m, {});
  const [bauble] = kit.itemsFor(K.byKey["vitae-infusion"], {successes: 1, maker: "Ilse", task});
  const f = bauble.flags["wodx-library"].wonder;
  assert.deepEqual([f.pool.value, f.pool.max, f.line], [1, 1, "kindred"]);
  const out = P.plan(P.powerOf(f, "release"), {flag: f, values: {"item:flags.wodx-library.wonder.pool.value": 1, "actor:system.advantages.bloodpool.temporary": 4}});
  assert.equal(out.actor["system.advantages.bloodpool.temporary"], 5);
  assert.equal(out.spent, true);
  assert.deepEqual(kit.itemsFor(K.byKey["ward-ghouls"], {task: {opts: {target: "c1"}}}), [], "a marked object makes nothing new");
  assert.equal(kit.marks(K.byKey["ward-ghouls"], {opts: {target: "c1"}}), true);
  const wf = kit.flagFor(K.byKey["ward-kindred"], {maker: "Ilse", task: {opts: {year: 2000}}});
  assert.deepEqual([wf.ward.against, wf.ward.spares, wf.powers[0].gm, wf.powers[0].roll.dice], ["vampires", "Ilse", true, 3]);
});

test("kindred: shafts and servants use the caster's numbers; charges follow successes", () => {
  const m = maker(2000);
  const [shaft] = kit.itemsFor(K.byKey["shaft-quiescence"], {successes: 2, maker: "Ilse", task: kit.taskFor(K.byKey["shaft-quiescence"], m, {})});
  assert.equal(shaft.type, "Melee Weapon");
  assert.deepEqual([shaft.system.damage.bonus, shaft.system.damage.type], [1, "lethal"]);
  const burrow = P.powerOf(shaft.flags["wodx-library"].wonder, "burrow");
  assert.deepEqual([burrow.roll.dice, burrow.roll.diff, burrow.gm], [5, 9, true]);
  const [servant] = kit.itemsFor(K.byKey["splinter-servant"], {successes: 3, task: kit.taskFor(K.byKey["splinter-servant"], m, {})});
  const sf = servant.flags["wodx-library"].wonder;
  assert.deepEqual([sf.life, sf.oneUse, P.powerOf(sf, "loose").roll.dice], ["15 turns", true, 6]);
  const [fw] = kit.itemsFor(K.byKey["flaming-weapon"], {successes: 4, task: kit.taskFor(K.byKey["flaming-weapon"], maker(1230), {})});
  assert.deepEqual(fw.flags["wodx-library"].wonder.uses, {value: 4, max: 4});
});

test("kindred: after() marks the chosen object and gives a talisman weapon its bonus", async () => {
  const updates = [];
  const item = {name: "Walking staff", type: "Melee Weapon", system: {description: "", attack: {accuracy: 0}, damage: {bonus: 1}}, update: async u => updates.push(u)};
  const a = {name: "Ilse", items: {get: id => (id === "w1" ? item : null)}};
  const t = {...kit.taskFor(K.byKey["enchant-talisman"], maker(1230), {target: "w1"}), total: 21};
  const lines = await kit.after({row: K.byKey["enchant-talisman"], task: t, status: "done", services: {actor: a}});
  assert.equal(updates[0]["flags.wodx-library.wonder"].key, "enchant-talisman");
  assert.equal(updates[0]["system.attack.accuracy"], 1);
  assert.equal(updates[0]["system.damage.bonus"], 3, "Dark Ages talisman: two more damage");
  assert.ok(lines.some(l => /now holds Enchant Talisman/.test(l)));
  const ruined = await kit.after({row: K.byKey["enchant-talisman"], task: {...t, ruinedBy: "rolls"}, status: "ruined", services: {actor: a}});
  assert.match(ruined.join(), /ruined and must be begun again/);
});
