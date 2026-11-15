import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as FP from "../../modules/wodx-actions/scripts/fomor-powers.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B5610-B5619: every fomor power of W20 pp. 430-439 has a playable effect */
test("the whole W20 list is here, each with a page in 430-439 and a summary in WoDX's words", () => {
  assert.equal(FP.POWERS.length, 73);
  const keys = new Set();
  for (const p of FP.POWERS) {
    assert.ok(p.p >= 430 && p.p <= 439, `${p.name} page`);
    assert.ok(p.fx.length > 10 && p.fx.length < 200, `${p.name} summary`);
    assert.ok(["always", "roll", "free"].includes(p.kind), `${p.name} kind`);
    assert.ok(!keys.has(p.key), `${p.key} twice`);
    keys.add(p.key);
    assert.doesNotMatch(p.fx, /—/, `${p.name}: no em-dash`);
    assert.doesNotMatch(p.fx, /\b(he|she|him|her|his|hers)\b/i, `${p.name}: neutral words`);
  }
});

test("each power does something on the table (standing rule 31)", () => {
  const doesSomething = p => p.bonus?.length || p.weapon || p.vision || p.lethalSoak || p.rage || p.gnosis || p.immune || p.regen || p.extraAction
    || p.burst || p.tar || p.hidesTaint || p.gifts || p.mega || p.climb || p.water || p.spec || p.self || p.numbing || p.drain || p.dull || p.sick || p.gnosisDrain || p.feed;
  for (const p of FP.POWERS) assert.ok(doesSomething(p), `${p.name} has no effect`);
  // rolled powers say what to roll
  for (const p of FP.POWERS.filter(x => x.kind === "roll" && !x.numbing)) if (p.roll) assert.ok(p.diff >= 3 && p.diff <= 10, `${p.name} difficulty`);
});

test("a sheet item's name finds its power", () => {
  assert.equal(FP.powerOf("Claws and Fangs")?.key, "clawsandfangs");
  assert.equal(FP.powerOf("Claws & Fangs (fomor)")?.key, "clawsandfangs");
  assert.equal(FP.powerOf("Hell's Hide")?.key, "hellshide");
  assert.equal(FP.powerOf("Mega-Attribute (Dexterity)")?.key, "megaattribute");
  assert.equal(FP.megaAttr("Mega-Attribute (Dexterity)"), "dexterity");
  assert.equal(FP.powerOf("Fireball"), null);
});

test("bonus rows are the system's own rows and switch without touching others", () => {
  const rows = FP.bonusRows("Armored Hide", FP.BY_KEY.armoredhide.bonus);
  assert.deepEqual(rows.map(r => [r.type, r.settingtype, r.value]), [["soak_buff", "bashing", 3], ["soak_buff", "lethal", 3]]);
  const mine = {name: "own", type: "attribute_buff", settingtype: "wits", value: 1, isactive: true};
  const list = FP.withRows([mine, ...rows], FP.bonusRows("X", [["attr", "strength", 2]], true, "use"), "use");
  assert.equal(list.length, 4);
  assert.equal(FP.withRows(list, [], "always").length, 2);
  assert.deepEqual(FP.bonusRows("Extra Speed", FP.BY_KEY.extraspeed.bonus)[0].type, "movement_buff");
});

test("uses: once a scene, once a day, three a day, Stamina a scene, every other turn", () => {
  const E = FP.BY_KEY.echoesofwrath, U = FP.BY_KEY.fungaludder, S = FP.BY_KEY.stomachpumper, B = FP.BY_KEY.hazardousbreath, F = FP.BY_KEY.fierydischarge;
  let used = FP.usedAfter(E, {}, {scene: 4});
  assert.equal(FP.usesLeft(E, used, {scene: 4}).ok, false);
  assert.equal(FP.usesLeft(E, used, {scene: 5}).ok, true);
  used = FP.usedAfter(U, {}, {day: 10});
  assert.equal(FP.usesLeft(U, used, {day: 10}).ok, false);
  used = {};
  for (let i = 0; i < 3; i++) used = FP.usedAfter(S, used, {day: 2});
  assert.equal(FP.usesLeft(S, used, {day: 2}).ok, false);
  used = FP.usedAfter(B, FP.usedAfter(B, {}, {scene: 1}), {scene: 1});
  assert.equal(FP.usesLeft(B, used, {scene: 1, stamina: 2}).ok, false);
  assert.equal(FP.usesLeft(B, used, {scene: 1, stamina: 3}).ok, true);
  used = FP.usedAfter(F, {}, {round: 3});
  assert.equal(FP.usesLeft(F, used, {round: 4}).ok, false);
  assert.equal(FP.usesLeft(F, used, {round: 5}).ok, true);
});

test("results on targets carry the book's resistance and lasting harm", () => {
  const mb = FP.resultsOf(FP.BY_KEY.mindblast, 3);
  assert.equal(mb[0].key, "hold");
  assert.equal(mb[0].out.condition, "dazed");
  assert.equal(mb[0].out.timed.rounds, 3);
  assert.deepEqual(mb[0].out.resist, {pool: "willpower", diff: 6});
  const heave = FP.resultsOf(FP.BY_KEY.hazardousheave, 1);
  assert.equal(heave[0].out.levels, 2);
  assert.equal(heave[0].out.everyTurn.levels, 2);
  const roar = FP.resultsOf(FP.BY_KEY.roarofthewyrm, 2);
  assert.equal(roar[0].who, "all");
  assert.equal(roar[0].out.timed.rounds, 4);
  assert.deepEqual(FP.resultsOf(FP.BY_KEY.mindblast, 0), []);
  // Eyes of the Wyrm needs no roll: one success stands in
  assert.equal(FP.resultsOf(FP.BY_KEY.eyesofthewyrm, 0)[0].out.condition, "immobilized");
  assert.equal(FP.resultsOf(FP.BY_KEY.animalcontrol, 2)[0].key, "summon");
});

test("splash dice: Poison Tumors three, Toxic Secretions a die a level to five", () => {
  assert.equal(FP.burstDice(FP.BY_KEY.poisontumors), 3);
  assert.equal(FP.burstDice(FP.BY_KEY.toxicsecretions, 4), 4);
  assert.equal(FP.burstDice(FP.BY_KEY.toxicsecretions, 9), 5);
});

test("NPC fomor choose only powers that need using", () => {
  const ch = FP.choosable(FP.POWERS);
  assert.ok(ch.every(p => p.kind !== "always" && p.keywords.length));
  assert.ok(ch.some(p => p.key === "mindblast"));
});

test("the window, Combat, the Delirium, the senses and NPC choice are wired", () => {
  const f = src("modules/wodx-actions/scripts/fomor.js");
  assert.match(f, /registerReverter\?\.\("wodx-actions\.fomorOff"/);
  assert.match(f, /Hooks\.on\("wodxAttackRolled"/);
  assert.match(f, /healDamage\(a, type, 1\)/);
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /useFomor: a => fmx\(\)\.power\(a\)/);
  assert.match(m, /FOM\.isFomor\(actor\)\) from\.push\(\.\.\.fmx\(\)\.powersFor/);
  assert.match(m, /LIM\.takeDull\(\)/);
  assert.match(src("modules/wodx-combat/scripts/main.js"), /fomor\?\.soakOf\?\.\(actor\)/);
  assert.match(src("modules/wodx-actions/scripts/garou.js"), /FOM\.immune\(a\)/);
  assert.match(src("modules/wodx-actions/scripts/garou.js"), /FOM\.giftStandIn\(actor\)/);
  assert.match(src("modules/wodx-senses/scripts/main.mjs"), /fomor\?\.taintHidden/);
  assert.match(src("modules/wodx-actions/scripts/summon-specs.js"), /"fomor\|animal-control"/);
});
