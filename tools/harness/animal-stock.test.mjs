import assert from "node:assert/strict";
import {test} from "node:test";
import * as AG from "../../modules/wodx-creation/scripts/animal-ghoul-rules.mjs";
import * as AS from "../../modules/wodx-creation/scripts/animal-stock-rules.mjs";
import * as O from "../../modules/wodx-npc/scripts/order-rules.mjs";

/* Ghouled animals, step three (B5058 to B5064) */

test("every animal kind has traits, Physical and Mental only", () => {
  for ( const k of Object.keys(AG.KINDS) ) {
    const s = AS.STATS[k];
    assert.ok(s, `traits for ${k}`);
    assert.deepEqual(Object.keys(s.attributes).sort(), [...AG.ANIMAL_ATTRIBUTES].sort(), k);
    assert.ok(s.willpower >= 1 && s.ref, k);
  }
  assert.deepEqual(AS.STATS.horse.attributes, {strength: 6, dexterity: 2, stamina: 5, perception: 3, intelligence: 2, wits: 2}, "the large horse (V20 Dark Ages p. 398)");
});

test("training: steps in order, war only for war beasts, the bracket traits raised and never lowered", () => {
  assert.equal(AS.nextTraining("horse", "untrained"), "trained");
  assert.equal(AS.nextTraining("horse", "trained"), "war");
  assert.equal(AS.nextTraining("horse", "war"), null);
  assert.equal(AS.nextTraining("cat", "trained"), null, "no war cat");
  const p = AS.trainingPatch({abilities: {brawl: {value: 1}, empathy: {value: 4}}}, "horse", "trained");
  assert.equal(p["system.abilities.brawl.value"], 3);
  assert.equal(p["system.abilities.intimidation.value"], 2);
  assert.equal(p["system.abilities.empathy.value"], undefined, "a higher dot stays");
  const w = AS.trainingPatch({abilities: {brawl: {value: 3}}}, "horse", "war");
  assert.equal(w["system.abilities.brawl.value"], 4, "war adds a dot of Brawl");
  assert.equal(AS.canRecoverWillpower({training: "untrained"}), false);
  assert.equal(AS.canRecoverWillpower({training: "trained"}), true);
  assert.equal(AS.TRAINING.trained.xp, 5);
  assert.equal(AS.TRAINING.war.xp, 10);
});

test("breeds by year and land, moving a trait by one dot at most", () => {
  const moravia1200 = AS.breedsFor("horse", {year: 1200, zone: "europe"}).map(b => b.key);
  assert.ok(moravia1200.includes("destrier") && moravia1200.includes("palfrey"));
  assert.ok(!moravia1200.includes("thoroughbred"), "no Thoroughbred before 1750");
  const guard1950 = AS.breedsFor("guard-dog", {year: 1950, zone: "europe"}).map(b => b.key);
  assert.ok(guard1950.includes("doberman") && guard1950.includes("shepherd") && !guard1950.includes("alaunt"));
  assert.ok(AS.breedsFor("hound", {zone: "mideast"}).some(b => b.key === "saluki"));
  for ( const [kind, list] of Object.entries(AS.BREEDS) ) {
    assert.ok(AG.KINDS[kind], kind);
    for ( const b of list ) for ( const d of Object.values(b.nudge) ) assert.ok(Math.abs(d) === 1, `${kind} ${b.key}`);
  }
  const d = AS.statsFor("horse", {breedKey: "destrier"});
  assert.equal(d.attributes.strength, 7);
  const t = AS.statsFor("cat", {training: "trained"});
  assert.equal(t.abilities.subterfuge, 2, "a trained cat has its bracket traits");
  assert.equal(AS.statsFor("rats", {breedKey: "none"}).attributes.wits, 1, "never below 1");
});

test("Retainers dots: dots left, and more dots make a tougher beast", () => {
  assert.equal(AS.retainerDotsLeft(3, [{dots: 1}]), 2);
  assert.equal(AS.retainerDotsLeft(1, [{dots: 2}]), 0);
  assert.deepEqual(AS.extraDisciplines(1), {Potence: 1});
  assert.deepEqual(AS.extraDisciplines(4), {Potence: 2, Fortitude: 1, Celerity: 1});
  assert.equal(AS.beastName("Horse", "Destrier", ""), "Destrier");
  assert.equal(AS.beastName("Horse", null, " Vran "), "Vran");
});

test("orders: an animal takes trained commands only, unless its master has Feral Whispers (B5063)", () => {
  assert.equal(O.animalOrderBlock("follow", {animal: false}), "");
  assert.equal(O.animalOrderBlock("follow", {animal: true, trained: true}), "");
  assert.match(O.animalOrderBlock("follow", {animal: true, trained: false}), /untrained/);
  assert.match(O.animalOrderBlock("errand", {animal: true, trained: true}), /Feral Whispers/);
  assert.equal(O.animalOrderBlock("errand", {animal: true, trained: false, whispers: true}), "");
  assert.equal(O.animalOrderBlock("none", {animal: true, trained: false}), "", "an order can always be called off");
});
