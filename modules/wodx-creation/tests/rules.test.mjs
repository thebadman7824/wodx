import assert from "node:assert/strict";
import {test} from "node:test";
import {generationRow, childeGeneration, findClan, clanDisciplines, ghoulDisciplineCap, ghoulBloodMax, ghoulCanLearn,
  bondStage, xpCost, traitMax} from "../scripts/rules.mjs";

test("generation chart (V20DA p. 340)", () => {
  assert.deepEqual(generationRow(12), {generation: 12, maxTrait: 5, bloodMax: 11, perTurn: 1});
  assert.deepEqual(generationRow(9), {generation: 9, maxTrait: 5, bloodMax: 14, perTurn: 2});
  assert.deepEqual(generationRow(6), {generation: 6, maxTrait: 7, bloodMax: 30, perTurn: 6});
  assert.equal(generationRow(15).bloodMax, 10, "Thirteenth and higher share a row");
  assert.equal(generationRow(15).generation, 15);
});

test("a childe is one Generation further from Caine", () => {
  assert.equal(childeGeneration(9), 10);
  assert.equal(childeGeneration(13), 14);
  assert.equal(childeGeneration(undefined), null);
});

test("clan names as Rothenstein and upstream write them", () => {
  assert.equal(findClan("Old Clan Tzimisce").id, "tzimisce");
  assert.equal(findClan("wod.bio.vampire.gangrel").id, "gangrel");
  assert.equal(findClan("Salubri (Healer)").id, "salubri-healer");
  assert.equal(findClan("Salubri (Warrior)").id, "salubri-warrior");
  assert.equal(findClan("Unconfirmed (plays as Gangrel)").id, "gangrel");
  assert.equal(findClan("Clan unconfirmed"), null);
  assert.equal(findClan(""), null);
});

test("clan Disciplines by era", () => {
  assert.deepEqual(clanDisciplines(findClan("Lasombra")), ["Dominate", "Obtenebration", "Potence"]);
  assert.deepEqual(clanDisciplines(findClan("Assamite"), "darkages"), ["Auspex", "Presence", "Quietus"]);
  assert.deepEqual(clanDisciplines(findClan("Assamite"), "modern"), ["Celerity", "Obfuscate", "Quietus"]);
  assert.deepEqual(clanDisciplines(findClan("Caitiff")), []);
});

test("ghouls (V20DA p. 399)", () => {
  assert.equal(ghoulDisciplineCap(12), 1);
  assert.equal(ghoulDisciplineCap(8), 1);
  assert.equal(ghoulDisciplineCap(7), 2);
  assert.equal(ghoulDisciplineCap(4), 5);
  assert.equal(ghoulBloodMax(0), 10);
  assert.equal(ghoulBloodMax(99), 10);
  assert.equal(ghoulBloodMax(250), 12, "one more point each century");
  assert.equal(ghoulCanLearn("Potence", []), true);
  assert.equal(ghoulCanLearn("Dominate", ["Obtenebration"]), false);
  assert.equal(ghoulCanLearn("Dominate", ["Dominate"]), true);
});

test("the blood oath takes three drinks", () => {
  assert.equal(bondStage(0).stage, 0);
  assert.equal(bondStage(2).label, "Second drink");
  assert.equal(bondStage(3).label, "Blood bound");
  assert.equal(bondStage(7).stage, 3);
});

test("vampire experience costs (V20DA p. 183; Caitiff V20 p. 124)", () => {
  assert.equal(xpCost({line: "vampire", kind: "attribute", current: 3}), 12);
  assert.equal(xpCost({line: "vampire", kind: "ability", current: 2}), 4);
  assert.equal(xpCost({line: "vampire", kind: "ability", current: 0}), 3, "a first dot is a new Ability");
  assert.equal(xpCost({line: "vampire", kind: "discipline", current: 2, discipline: "clan"}), 10);
  assert.equal(xpCost({line: "vampire", kind: "discipline", current: 2, discipline: "other"}), 14);
  assert.equal(xpCost({line: "vampire", kind: "discipline", current: 2, discipline: "caitiff"}), 12);
  assert.equal(xpCost({line: "vampire", kind: "discipline", current: 0}), 10, "a first dot is a new Discipline");
  assert.equal(xpCost({line: "vampire", kind: "virtue", current: 3}), 6);
  assert.equal(xpCost({line: "vampire", kind: "road", current: 6}), 12);
  assert.equal(xpCost({line: "vampire", kind: "willpower", current: 5}), 5);
});

test("ghoul and mortal experience costs", () => {
  assert.equal(xpCost({line: "ghoul", kind: "discipline", current: 1, discipline: "clan"}), 15);
  assert.equal(xpCost({line: "ghoul", kind: "discipline", current: 1, discipline: "other"}), 25);
  assert.equal(xpCost({line: "ghoul", kind: "newDiscipline"}), 20);
  assert.equal(xpCost({line: "ghoul", kind: "attribute", current: 2}), 10, "G&R p. 139");
  assert.equal(xpCost({line: "mortal", kind: "discipline", current: 1}), null);
  assert.equal(xpCost({line: "mortal", kind: "attribute", current: 2}), 10);
  assert.equal(xpCost({line: "werewolf", kind: "attribute", current: 2}), null);
});

test("trait limits", () => {
  assert.equal(traitMax({line: "vampire", kind: "attribute", generation: 12}), 5);
  assert.equal(traitMax({line: "vampire", kind: "discipline", generation: 6}), 7);
  assert.equal(traitMax({line: "ghoul", kind: "discipline", domitorGeneration: 9}), 1);
  assert.equal(traitMax({line: "ghoul", kind: "discipline", domitorGeneration: 7}), 2);
  assert.equal(traitMax({line: "mortal", kind: "discipline"}), 0);
  assert.equal(traitMax({line: "vampire", kind: "virtue", generation: 4}), 5);
  assert.equal(traitMax({line: "vampire", kind: "road"}), 10);
});
