import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC: every line gets its own equivalent of the Kindred-only tools (B6310-B6318).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const LR = await imp("modules/wodx-npc/scripts/lines-rules.mjs");
const AC = await imp("modules/wodx-npc/scripts/aftercare-rules.mjs");
const H = await imp("modules/wodx-npc/scripts/hearts-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/fates-rules.mjs");
const SW = await imp("modules/wodx-npc/scripts/servant-world-rules.mjs");
const SR = await imp("modules/wodx-npc/scripts/servant-rules.mjs");
const RS = await imp("modules/wodx-npc/scripts/resident-rules.mjs");
const DU = await imp("modules/wodx-npc/scripts/duty-rules.mjs");
const TRR = await imp("modules/wodx-npc/scripts/trust-rules.mjs");

test("one key per line: a Kuei-jin is never Kindred, a Fera never a mortal", () => {
  assert.equal(LR.lineKey({type: "Vampire", system: {settings: {variant: "kindredeast"}}}), "kuei-jin");
  assert.equal(LR.lineKey({type: "Vampire", system: {settings: {variant: ""}}}), "vampire");
  assert.equal(LR.lineKey({type: "Changing Breed"}), "fera");
  assert.equal(LR.lineKey({type: "Mortal", system: {settings: {variant: "ghoul"}}}), "ghoul");
  assert.equal(LR.lineKey({type: "Mortal", flags: {"wodx-creation": {lineage: {kinfolk: {id: "g"}}}}}), "kinfolk");
  assert.equal(LR.lineKey({type: "Mortal"}), "mortal");
  assert.equal(LR.lineKey(null), "mortal");
  assert.equal(LR.lineKey({type: "Mortal"}, {of: () => "kinain"}), "kinain", "Creation's helper wins when it answers");
  assert.equal(LR.lineKey({type: "Mage"}, {of: () => { throw new Error("off"); }}), "mage", "a broken helper falls back");
  assert.equal(LR.tableLine("kuei-jin"), "kueijin");
  assert.equal(LR.tableLine("fera"), "werewolf");
  for ( const k of LR.KEYS ) assert.ok(LR.familyOf(k));
});

test("after a fight each line mends with its own power, by its book", () => {
  const chi = AC.lineMend("kuei-jin", {bashing: 2, lethal: 1, aggravated: 1}, 10);
  assert.deepEqual([chi.bashing, chi.lethal, chi.aggravated, chi.spent, chi.what], [2, 1, 1, 8, "Chi"], "a Chi a level, five for aggravated, two kept");
  const pathos = AC.lineMend("wraith", {bashing: 3, lethal: 1}, 4);
  assert.deepEqual([pathos.bashing, pathos.lethal, pathos.spent], [3, 1, 3], "a Pathos mends two bashing or one lethal");
  assert.equal(AC.lineMend("wraith", {aggravated: 2}, 9).aggravated, 0, "Pathos cannot mend aggravated");
  const faith = AC.lineMend("demon", {bashing: 3, lethal: 2}, 3);
  assert.deepEqual([faith.bashing, faith.lethal, faith.spent], [3, 1, 2], "one Faith for all bashing, one each lethal, one kept");
  const blood = AC.lineMend("vampire", {bashing: 1, lethal: 2}, 5);
  assert.deepEqual([blood.bashing, blood.lethal, blood.spent], [1, 2, 3], "the Kindred as before");
  assert.equal(AC.lineMend("ghoul", {lethal: 3}, 3).spent, 2, "a ghoul keeps one back");
  assert.equal(AC.lineMend("mage", {lethal: 3}, 9), null, "a mage heals with time");
  assert.equal(AC.lineMend("kuei-jin", {lethal: 3}, 2).spent, 0, "nothing past the reserve");
});

test("loved ones and lovers: each line's own checks and truths", () => {
  const k = H.weakSpotChecks("kueijin", "spouse", "harm", {name: "Mei"}).map(c => c.text).join(" ");
  assert.match(k, /P'o/); assert.doesNotMatch(k, /Beast/);
  assert.match(H.weakSpotChecks("wraith", "child", "taken").map(c => c.text).join(" "), /Angst/);
  assert.match(H.weakSpotChecks("demon", "lover", "death").map(c => c.text).join(" "), /Torment/);
  assert.match(H.weakSpotChecks("mummy", "lover", "death").map(c => c.text).join(" "), /outlives/);
  assert.match(H.weakSpotChecks("vampire", "lover", "harm").map(c => c.text).join(" "), /Beast/, "the Kindred keep theirs");
  assert.equal(H.hindrance({line: "kueijin", humanity: 2}, {line: "mortal"}).cap, 2);
  assert.equal(H.hindrance({line: "demon", torment: 8}, {line: "mortal"}).cap, 2);
  assert.ok(H.hindrance({line: "mummy"}, {line: "mortal"}).notes.length);
  const house = [{id: "a", role: "spouse"}, {id: "b", role: "child"}, {id: "c", role: "servant"}];
  assert.equal(H.masqueradeRisk("vampire", house), 2);
  assert.equal(H.masqueradeRisk("kueijin", house), 2);
  assert.equal(H.masqueradeRisk("werewolf", house, {kinfolk: ["a", "b", "c"]}), 0, "Kinfolk know the truth");
  assert.equal(H.masqueradeRisk("werewolf", house, {kinfolk: ["a"]}), 1, "two who do not know");
  assert.equal(H.masqueradeRisk("mage", house), 0);
  assert.match(H.riskWords("werewolf", 1), /Veil/);
  assert.equal(H.riskWords("vampire", 1), " Mortals in a Kindred's haven: a risk to the Masquerade.", "the old words stay");
});

test("Fates, servants, households and duties follow the right line", () => {
  assert.equal(F.fatesLine("Vampire", "kindredeast"), "kuei-jin");
  assert.equal(F.fatesLine("Vampire", ""), "vampire");
  assert.ok(F.UNDYING.has("kuei-jin"));
  assert.equal(SW.keeperLine("kuei-jin"), "kuei-jin");
  assert.equal(SW.keeperLine("fera"), "werewolf");
  assert.equal(SW.keeperLine("hunter"), "");
  assert.ok(!SR.keeperRows({line: SW.keeperLine("kuei-jin"), year: 1500}).some(x => x.kind === "ghoul"), "a Kuei-jin never keeps ghouls");
  assert.deepEqual(RS.householdServes("werewolf"), {kind: "kinfolk", words: "Kinfolk of"});
  assert.equal(RS.householdServes("kuei-jin").kind, "cult");
  assert.equal(RS.householdServes("mage", "Order of Hermes"), null);
  assert.equal(RS.householdServes("mage", "Iteration X (Technocratic Union)").kind, "social");
  assert.equal(RS.householdServes("hunter"), null);
  assert.deepEqual(RS.parseServes("kinfolk:abc"), {kind: "kinfolk", id: "abc"});
  assert.deepEqual(RS.parseServes("abc"), {kind: "ghoul", id: "abc"}, "an old pick is a ghoul pick");
  assert.equal(DU.servantDuty("cult", "P", "kuei-jin").when, "day");
  assert.notEqual(DU.servantDuty("cult", "P", "mummy")?.when, "day");
  assert.ok(TRR.sensesFor("wraith").some(s => s.power === "Lifesight"));
  assert.ok(!TRR.sensesFor("kueijin").some(s => /Auspex/.test(s.power)), "no Auspex for a Cathayan");
});
