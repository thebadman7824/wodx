import assert from "node:assert/strict";
import {test} from "node:test";
import * as AG from "../../modules/wodx-creation/scripts/animal-ghoul-rules.mjs";
import * as AK from "../../modules/wodx-creation/scripts/animal-keepers-rules.mjs";

/* Ghouled animals, step four (B5130 to B5137) */

test("the domitor's clan weakness shows at five points, only where it fits a beast (V20 Dark Ages p. 401)", () => {
  assert.equal(AG.clanMark("nosferatu", 4), null);
  assert.equal(AG.clanMark("nosferatu", 5)?.label, "Hideous");
  assert.equal(AG.clanMark("gangrel", 6)?.frenzy, 1, "a Gangrel beast is quick to rage");
  assert.equal(AG.clanMark("tremere", 10), null, "a weakness that needs a mind skips the beast");
});

test("the szlachta: a person takes the book's traits, a beast its own raised (V20 p. 502)", () => {
  const person = AK.szlachtaPatch({attributes: {strength: {value: 2}, appearance: {value: 3}, perception: {value: 6}}, abilities: {brawl: {value: 5}}, advantages: {path: {permanent: 7}}});
  assert.equal(person.patch["system.attributes.strength.value"], 5);
  assert.equal(person.patch["system.attributes.appearance.value"], 0, "Appearance falls to 0");
  assert.equal(person.patch["system.attributes.perception.value"], undefined, "a higher trait stays");
  assert.equal(person.patch["system.abilities.brawl.value"], undefined);
  assert.equal(person.patch["system.advantages.path.permanent"], 2);
  assert.equal(person.flaw, true);
  assert.deepEqual(person.disciplines, {Fortitude: 1, Potence: 1});
  const hound = AK.szlachtaPatch({attributes: {strength: {value: 3}, stamina: {value: 3}, perception: {value: 3}}, abilities: {brawl: {value: 2}}}, {animal: true});
  assert.equal(hound.patch["system.attributes.strength.value"], 4);
  assert.equal(hound.patch["system.abilities.brawl.value"], 3);
  assert.equal(hound.flaw, false);
  assert.ok(AK.canCraft("szlachta", 3) && !AK.canCraft("szlachta", 2) && !AK.canCraft("vozhd", 4) && AK.canCraft("vozhd", 5));
  assert.equal(AK.VOZHD.ghouls, 15);
  assert.equal(AK.VOZHD.attributes.strength, 8);
});

test("kennels: a litter once a year, in the season, from two or more", () => {
  assert.equal(AK.litterDue({kind: "hound", last: 0}, {count: 2, year: 1230, month: 3}), true);
  assert.equal(AK.litterDue({kind: "hound", last: 1230}, {count: 2, year: 1230, month: 9}), false, "one a year");
  assert.equal(AK.litterDue({kind: "hound", last: 0}, {count: 1, year: 1230, month: 3}), false, "a pair at least");
  assert.equal(AK.litterDue({kind: "horse", last: 0}, {count: 3, year: 1230, month: 3}), false, "out of season");
});

test("households keep beasts by clan, era and place", () => {
  assert.deepEqual(AK.householdBeasts({clanId: "ventrue", animalism: 0, year: 1230}), [], "no Animalism, no keeping clan: none");
  const dark = AK.householdBeasts({clanId: "tzimisce", year: 1230, rural: true, seed: 3});
  assert.equal(dark.length, 3, "more in the Dark Ages and the countryside");
  assert.ok(["hound", "wolf", "horse", "guard-dog"].includes(dark[0]), "the first leans on the clan");
  const modern = AK.householdBeasts({clanId: "nosferatu", year: 1995, seed: 1});
  assert.equal(modern.length, 1);
  assert.ok(["rats", "cat", "crows"].includes(modern[0]));
  assert.ok(!AK.householdBeasts({clanId: "gangrel", year: 1995, seed: 2, rural: true}).includes("horse"), "no horses kept in modern towns' lists");
  for ( const k of AK.householdBeasts({clanId: "gangrel", year: 1300, seed: 7, rural: true}) ) assert.ok(AG.KINDS[k], k);
  assert.deepEqual(AK.householdBeasts({clanId: "tzimisce", year: 1230, seed: 5}), AK.householdBeasts({clanId: "tzimisce", year: 1230, seed: 5}), "the same household draws the same");
});
