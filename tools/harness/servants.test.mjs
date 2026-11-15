import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Servants and Bonds Desk (B5100-B5111): one ledger for every bond, bonds that stop a blow, bonded NPCs, Kinfolk,
// revenants, guanxi, acolytes, Conditioning of both kinds, keepers by era, the look on the map.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const SR = await imp("modules/wodx-npc/scripts/servant-rules.mjs");
const FR = await imp("modules/wodx-npc/scripts/followers-rules.mjs");
const O = await imp("modules/wodx-npc/scripts/order-rules.mjs");

test("the ledger reads the older stores in place and the new bonds from the sheet", () => {
  const flags = {
    "wodx-creation": {lineage: {bonds: {r: {drinks: 3, name: "Regnant"}, z: {drinks: 0}}}},
    "wodx-npc": {held: {"thrall:w": {kind: "thrall", master: "w", step: 3}, "cult:m": {kind: "cult", master: "m", step: 1}, "bogus:x": {kind: "bogus", master: "x"}}}
  };
  const rs = SR.recordsOf(flags, {id: "s", vinculum: {"s>v": 9, "v>s": 9}, guanxi: {k: 7}, kinOf: [{id: "g", name: "Garou"}], revenantMaster: {id: "t", name: "Tzimisce"}});
  const kinds = rs.map(r => `${r.kind}:${r.master}:${r.step}`).sort();
  assert.deepEqual(kinds, ["blood:r:3", "cult:m:1", "guanxi:k:2", "kinfolk:g:1", "revenant:t:1", "thrall:w:3", "vinculum:v:3"].sort());
  assert.equal(rs[0].step, 3, "deepest first");
  assert.deepEqual(SR.mastersIn(rs).sort(), ["g", "k", "m", "r", "t", "v", "w"]);
  assert.equal(SR.recordsOf(flags, {id: "r"}).some(r => r.master === "r"), false, "never bound to oneself");
});

test("guanxi is 5 + the mate's Charisma less the higher of P'o or Yin, read as a Vaulderie score", () => {
  assert.equal(SR.guanxi({mateCharisma: 3, po: 2, yin: 4}), 4);
  assert.equal(SR.guanxi({mateCharisma: 5, po: 1, yin: 0}), 9);
  assert.equal(SR.guanxi({mateCharisma: 0, po: 9, yin: 0}), 0);
  assert.deepEqual([4, 5, 7, 8, 10].map(SR.vaulderieStep), [0, 2, 2, 3, 3]);
});

test("a bond holds back a blow at the book's difficulty; kindness and cruelty move it", () => {
  const blood2 = [{kind: "blood", master: "r", step: 2}];
  assert.equal(SR.restraint(blood2, "r").difficulty, 8);
  assert.equal(SR.restraint(blood2, "r", {treatment: 1}).difficulty, 7, "abuse makes it easier to strike");
  assert.equal(SR.restraint(blood2, "r", {treatment: -1}).difficulty, 9, "kindness makes it harder");
  assert.equal(SR.restraint([{kind: "blood", master: "r", step: 1}], "r"), null, "one drink does not hold a hand");
  assert.equal(SR.restraint(blood2, "other"), null, "only toward the master");
  assert.ok(SR.restraint([{kind: "fomor", master: "b", step: 1}], "b"), "a fomor's Bane holds it back");
  assert.equal(SR.restraint([{kind: "thrall", master: "w", step: 1}], "w"), null, "an unchained Thrall can strike");
  assert.ok(SR.restraint([{kind: "thrall", master: "w", step: 3}], "w"));
  assert.equal(SR.restraint([{kind: "enchant", master: "c", step: 3}], "c"), null, "Enchantment binds nobody");
});

test("hard orders: a full bond obeys, a lesser one makes refusing harder", () => {
  assert.equal(SR.orderWeight([{kind: "conditioning", master: "m", step: 3}], "m").free, true);
  assert.equal(SR.orderWeight([{kind: "social", master: "m", step: 2}], "m").shift, -1);
  assert.equal(SR.orderWeight([{kind: "pact", master: "m", step: 1}], "m").shift, 0);
  const plain = O.loyaltyCheck({willpower: 4});
  const harder = O.loyaltyCheck({willpower: 4, weight: {free: false, shift: -1, why: "x"}});
  assert.equal(harder.diff, plain.diff + 1);
  assert.equal(O.loyaltyCheck({willpower: 4, weight: {free: true, why: "Fully conditioned"}}).bound, true);
  assert.equal(SR.warmFloor([{kind: "blood", master: "r", step: 3}], "r"), true);
  assert.equal(SR.warmFloor([{kind: "blood", master: "r", step: 2}], "r"), false);
});

test("the followers window names ledger servants, and a mage's people are acolytes and consors", () => {
  const row = {kind: "follower", kindLabel: "Follower", bond: {drinks: 0, text: ""}};
  FR.withLedger(row, [{kind: "fomor", master: "m", step: 1}]);
  assert.equal(row.kindLabel, "Fomor");
  assert.ok(row.bond.text);
  const ally = {kind: "ally", kindLabel: "Ally", bond: {drinks: 0, text: ""}};
  FR.withLedger(ally, [], {masterLine: "mage"});
  assert.equal(ally.kindLabel, "Acolyte");
  const consor = {kind: "retainer", kindLabel: "Retainer", bond: {drinks: 0, text: ""}};
  FR.withLedger(consor, [], {masterLine: "mage", consor: true});
  assert.equal(consor.kindLabel, "Consor");
  const vamp = {kind: "ally", kindLabel: "Ally", bond: {drinks: 0, text: ""}};
  FR.withLedger(vamp, [], {masterLine: "vampire"});
  assert.equal(vamp.kindLabel, "Ally", "other lines keep their words");
});

test("Dominate Conditioning: the total, halfway, full, the shift and the time apart", () => {
  assert.equal(SR.conditioningNeed(3), 21);
  assert.equal(SR.conditioningNeed(3, "yielding"), 15);
  assert.equal(SR.conditioningNeed(3, "wilful"), 30);
  assert.deepEqual([0, 5, 11, 21].map(t => SR.conditioningStep(t, 21)), [0, 1, 2, 3]);
  assert.deepEqual(SR.conditioningRoll({charisma: 3, leadership: 2, willpowerNow: 6}), {dice: 5, difficulty: 6});
  const rs = [{kind: "conditioning", master: "m", step: 3}];
  assert.equal(SR.dominateShift(rs, "m"), -1);
  assert.equal(SR.dominateShift(rs, "other"), 2);
  assert.equal(SR.conditioningFadesAt(0, 5), (182 - 35) * 86400);
});

test("Social Conditioning: ten stages, who may run it in each age, a stage won or held", () => {
  assert.equal(SR.SOCIAL_STAGES.length, 11);
  assert.deepEqual([0, 3, 5, 6, 7, 10].map(SR.socialStep), [0, 1, 2, 2, 3, 3]);
  assert.ok(SR.socialGroupsIn(1500).includes("reason") && !SR.socialGroupsIn(1500).includes("union"));
  assert.ok(SR.socialGroupsIn(1999).includes("union") && !SR.socialGroupsIn(1999).includes("reason"));
  assert.equal(SR.socialRollResult({stage: 3, agentSuccesses: 3, subjectSuccesses: 1}).stage, 4);
  assert.equal(SR.socialRollResult({stage: 3, agentSuccesses: 1, subjectSuccesses: 1}).stage, 3);
  assert.equal(SR.socialRollResult({stage: 3, agentBotch: true}).ruined, true);
  assert.equal(SR.socialDifficulty(5), 3);
});

test("NPC masters keep servants by line and year", () => {
  const v = SR.keeperRows({line: "vampire", year: 1200, disciplines: {dominate: 4}, clan: "Tzimisce"}).map(r => r.kind);
  assert.deepEqual(v, ["ghoul", "conditioning", "revenant"]);
  assert.deepEqual(SR.keeperRows({line: "vampire", year: 1200, disciplines: {dominate: 2}, clan: "Ventrue"}).map(r => r.kind), ["ghoul"]);
  assert.deepEqual(SR.keeperRows({line: "mage", year: 1250, group: "Order of Reason"}).map(r => r.kind), [], "the Order of Reason starts in 1325");
  assert.deepEqual(SR.keeperRows({line: "mage", year: 1999, group: "Technocratic Union"}).map(r => r.kind), ["social"]);
  assert.ok(SR.keeperRows({line: "kuei-jin", year: 1500}).every(r => r.kind !== "ghoul"), "Kuei-jin cannot make ghouls");
  assert.equal(SR.keeperCount({count: [1, 3]}, 0), 1);
  assert.equal(SR.keeperCount({count: [1, 3]}, 0.999), 3);
});

test("every kind has a look on the map, and only the master and the Storyteller see the ring", () => {
  for ( const k of Object.keys(SR.KINDS) ) assert.ok(SR.FX[k], `${k} has a look`);
  const rs = [{kind: "pact", master: "d", step: 1}];
  assert.equal(SR.ringFor(rs, ["someone-else"], false), null);
  assert.ok(SR.ringFor(rs, ["d"], false));
  assert.ok(SR.ringFor(rs, [], true));
});

test("the wiring: Combat asks before the blow, the followers window and orders read the ledger", () => {
  const combat = src("modules/wodx-combat/scripts/main.js");
  assert.ok(/bondHolds\(attacker, target\)\) return null;/.test(combat), "the attack window asks first");
  assert.ok(/bondHolds\(attacker, target\)\) continue;/.test(combat), "the quick attack asks first");
  assert.ok(/servants\?\.restrain/.test(combat));
  assert.ok(/SV\.records\(a\)/.test(src("modules/wodx-npc/scripts/followers.mjs")));
  assert.ok(/SV\.mastersOf\(a\)/.test(src("modules/wodx-npc/scripts/orders.mjs")));
  assert.ok(/SV\.warmFloor/.test(src("modules/wodx-npc/scripts/attitude.mjs")));
  assert.ok(/servants: \{records: SERVANTS\.records/.test(src("modules/wodx-npc/scripts/main.mjs")));
  assert.ok(/carriesBlood\(founder\)/.test(src("modules/wodx-npc/scripts/kin.mjs")));
});
