import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* A Dark Ages mage's household and standing (B7904-B7909; Dark Ages: Mage pp. 37, 83-93) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-actions/scripts/mage-household-rules.js");
const L = await imp("modules/wodx-chronicle/data/trait-lines.mjs");
const T = await imp("modules/wodx-chronicle/scripts/trait-rules.mjs");

test("B7904: the chantry's points, the flaws rule, Aura on the grounds, and the commoners' talk", () => {
  const p = H.chantryPlan(4, {size: 2, security: 1, aura: 1, community: 0});
  assert.deepEqual([p.ok, p.size.room, p.breakIn, p.auraDamp, p.left], [true, 4, 1, 1, 0]);
  assert.equal(H.chantryPlan(3, {size: 2, security: 2}).ok, false);
  assert.equal(H.chantryPlan(3, {size: 3, security: -2, aura: 2}).ok, false, "negative security needs the optional rule");
  assert.equal(H.chantryPlan(3, {size: 3, security: -2, aura: 2}, {flaws: true}).ok, true);
  assert.equal(H.chantryPlan(3, {security: -5, size: 3}, {flaws: true}).breakIn, -3);
  assert.equal(H.auraOnGrounds(3, 2), 1, "the book's example: Foundation 3, two points, as if 1");
  assert.equal(H.auraOnGrounds(3, 2, false), 2, "a mage outside the cabal keeps the full Aura");
  assert.equal(H.gossipDue({community: 0, lastWeek: 4}, 5).tone, "damaging");
  assert.equal(H.gossipDue({community: 1, lastWeek: 4}, 5), null);
  assert.equal(H.gossipDue({community: 1, lastWeek: 4}, 6).tone, "wary");
  assert.equal(H.gossipDue({community: 3}, 9), null);
  for ( const g of H.GOSSIP ) assert.ok(!/—/.test(g.text("A", "B")));
});

test("B7905: the familiar's boons, its weekly meal, weakening and death", () => {
  assert.equal(H.familiarPlan(3, {backlash: 2, speech: 1}).ok, true);
  assert.equal(H.familiarPlan(2, {backlash: 2, speech: 1}).ok, false);
  assert.equal(H.familiarPlan(5, {protection: 9}).boons.protection, 3);
  let f = {boons: {backlash: 2, speech: 1}};
  f = H.familiarWeek(f, 1, 3);
  assert.equal(f.weak, 1);
  assert.deepEqual(H.boonsNow(f.boons, H.familiarStrength(f, 3)), {backlash: 1, speech: 1});
  f = H.familiarWeek({...f, fedWeek: 2}, 2, 3);
  assert.equal(f.weak, 0);
  f = H.familiarWeek(H.familiarWeek(H.familiarWeek(f, 3, 3), 4, 3), 5, 3);
  assert.equal(f.dead, true);
  assert.equal(H.familiarStrength(f, 3), 0);
  assert.equal(H.feedCost(3), 3);
  const used = H.useBoon({}, "backlash", "s1");
  assert.equal(H.boonLeft(used, "backlash", 2, "s1"), 1);
  assert.equal(H.boonLeft(used, "backlash", 2, "s2"), 2, "a new story");
  assert.equal(H.boonLeft({}, "protection", 2, "s1"), 0);
  assert.equal(H.boonLeft({}, "protection", 3, "s1"), 1);
});

test("B7906: Library costs, and a Pillar's price with the Library and Pillar Natural", () => {
  assert.equal(H.LIBRARY_POINTS, 2);
  assert.deepEqual(H.pillarPrice(0), {base: 10, off: 0, cost: 10});
  assert.equal(H.pillarPrice(2).cost, 12);
  assert.equal(H.pillarPrice(2, {librarySuccesses: 3}).cost, 9);
  assert.equal(H.pillarPrice(2, {natural: true}).cost, 10);
  assert.equal(H.pillarPrice(0, {natural: true}).cost, 8);
  assert.equal(H.pillarPrice(1, {librarySuccesses: 9}).cost, 1, "never free");
});

test("B7907: servants: commoners can be turned, magical servants cannot; the apprentice", () => {
  assert.equal(H.bribePlan({kind: "construct"}).immune, true);
  assert.deepEqual(H.bribePlan({kind: "commoner", quality: "good"}), {immune: false, dice: 4, difficulty: 6});
  assert.equal(H.bribePlan({kind: "commoner", quality: "good"}, {threat: true, magic: true}).difficulty, 9);
  assert.equal(H.bribePlan({kind: "commoner", quality: "exceptional", apprentice: "merit"}).difficulty, 4);
  assert.equal(H.taskTime({kind: "construct"}, 6), 3);
  assert.equal(H.taskTime({kind: "commoner"}, 6), 6);
  assert.ok(H.apprenticeTaught({lastTaught: 10}, 12));
  assert.ok(!H.apprenticeTaught({lastTaught: 10}, 14));
  assert.ok(!H.apprenticeTaught({}, 1));
  assert.ok(H.apprenticeMess(3) && !H.apprenticeMess(4));
});

test("B7908: Destiny once a story for Willpower; talismans by level", () => {
  assert.deepEqual(H.destinyOpen({}, "s1", 3), {ok: true, dice: 3, difficulty: 7});
  assert.equal(H.destinyOpen({story: "s1"}, "s1", 3).ok, false);
  assert.equal(H.destinyOpen({fulfilled: true}, "s2", 3).ok, false);
  assert.equal(H.destinyWillpower({successes: 3}, 2), 2);
  assert.equal(H.destinyWillpower({successes: 3, botch: true}, 5), 0);
  assert.equal(H.talismanCheck([{level: 1}, {level: 2}], 3).ok, true);
  assert.equal(H.talismanCheck([{level: 3}, {level: 1}], 3).ok, false);
});

test("B7909: degrees of each fellowship; the merits and flaws in the trait table with their numbers", () => {
  assert.deepEqual(Object.keys(H.DEGREES).sort(), ["batini", "hermes", "messianic", "oldfaith", "spirit", "valdaermen"]);
  assert.equal(H.degreeOf("valdaermen", 1).title, "Thane");
  assert.equal(H.degreeOf("batini", 4).title, "Qutb");
  assert.equal(H.degreeOf("oldfaith", 2, {organised: false}).title, "");
  assert.equal(H.degreeShift(3, 1), -2);
  assert.equal(H.degreeShift(2, 1), -1);
  assert.equal(H.degreeShift(1, 3), 0);
  const rows = L.LINE_MERITS_FLAWS.filter(e => e.book === "DA:M");
  assert.equal(rows.length, 14);
  for ( const k of ["hale", "pain-resistant", "weak-lungs", "elderly"] ) assert.ok(L.LINE_MERITS_FLAWS.find(e => e.key === k).holders.includes("mage"), k);
  assert.deepEqual(T.problems(), []);
  const v = T.traitsOf({kind: "mage", features: [{id: "a", name: "Arcane Heritage", kind: "flaw", value: 1}, {id: "b", name: "Indomitable", kind: "merit", value: 3}]});
  assert.deepEqual(v.matched.map(m => [m.key, m.wrongKind]).sort(), [["arcane-heritage", false], ["indomitable", false]]);
  assert.equal(T.sumEffects(T.effectsFor({kind: "mage", features: [{id: "b", name: "Indomitable", kind: "merit", value: 3}]}, {channel: "resist", tags: ["coerce"]})).diff, 2);
  assert.equal(H.devotionWillpower(5), 3);
  assert.ok(H.madnessCheck(6, 5) && !H.madnessCheck(5, 5));
  assert.deepEqual([H.madnessShift({successes: 1}), H.madnessShift({successes: 0}), H.madnessShift({botch: true})], [0, 1, 2]);
  assert.equal(H.ineptRolls(0, 3, 7), 0);
  assert.equal(H.ineptRolls(6, 3, 7), 2, "the eighth and ninth points");
  assert.equal(H.ineptRolls(8, 1, 7), 1);
  assert.equal(H.showCost(true, 1), 0);
  assert.equal(H.showCost(true, 6), 1);
  assert.equal(H.showCost(false, 1), 1);
  assert.ok(H.saltWarded({mage: "m", until: 100}, "m", 50));
  assert.ok(!H.saltWarded({mage: "m", until: 100}, "m", 150));
  assert.ok(H.witchwalkSeen(4) && !H.witchwalkSeen(3));
  assert.ok(!/—/.test(JSON.stringify(rows) + H.WITCHWALK.join("")));
});

test("B7904-B7909: wiring", () => {
  const d = src("modules/wodx-actions/scripts/mage-da.js"), m = src("modules/wodx-actions/scripts/main.js"), h = src("modules/wodx-actions/scripts/trait-hooks.js");
  const s = src("modules/wodx-actions/scripts/social.js");
  assert.match(d, /HO\.castBlock\(actor\)/);
  assert.match(d, /HO\.afterCast\(actor, \{ q: qSpend, qScene, seen: !!fd\.seen \}\)/);
  assert.match(d, /data-mx="familiar"/);
  assert.match(d, /what === "familiar"/);
  assert.match(m, /\(\) => mx\(\)\.householdWeek\(\)/);
  assert.match(m, /mx\(\)\.house\.degreeEffects\(actor, ctx\)/);
  assert.match(m, /daHousehold: withActor/);
  assert.match(h, /daMageDestiny\(actor, k\) \? 0/);
  assert.match(h, /FELLOWSHIP_TICK/);
  assert.match(s, /TH\.resistMods\(npc, \["coerce"\], actor\)/);
});
