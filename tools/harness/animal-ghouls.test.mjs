import assert from "node:assert/strict";
import {test} from "node:test";
import * as AG from "../../modules/wodx-creation/scripts/animal-ghoul-rules.mjs";
import * as AN from "../../modules/wodx-npc/scripts/animal-rules.mjs";

/* Ghouled animals (B5040 to B5049) */

test("blood pool goes by size, from the ghoul rules (V20 Dark Ages p. 401)", () => {
  assert.equal(AG.animalBloodMax("horse"), 14, "a horse 14");
  assert.equal(AG.animalBloodMax("hound"), 6, "a large dog 6");
  assert.equal(AG.animalBloodMax("pigs"), 10, "human-sized 10");
  assert.equal(AG.animalBloodMax("rats"), 1);
  assert.equal(AG.animalBloodMax("elephant"), 20);
  assert.equal(AG.animalBloodMax("horse", 250), 16, "one more a century (V20DA p. 400)");
  assert.equal(AG.monthlyNeed("elephant"), 2, "the largest beasts need more a month");
  assert.equal(AG.monthlyNeed("cat"), 1);
});

test("the kind comes from the saved kind, then the NPC template, then the name", () => {
  assert.equal(AG.kindOf({name: "Ghoul Warhorse"}), "horse");
  assert.equal(AG.kindOf({name: "The Bratovich mastiff"}), "guard-dog");
  assert.equal(AG.kindOf({name: "Old Grey Wolf"}), "wolf");
  assert.equal(AG.kindOf({name: "Brother Anselm"}), null, "a person is no animal");
  assert.equal(AG.kindOf({template: "crows", name: "Horse"}), "crows", "the template wins over the name");
  assert.equal(AG.kindOf({kind: "bear", template: "crows"}), "bear");
  for ( const k of Object.keys(AN.ANIMALS) ) assert.ok(AG.KINDS[k], `NPC animal ${k} has a kind`);
});

test("animals learn only Celerity, Fortitude and Potence (V20 Dark Ages p. 401)", () => {
  for ( const d of ["Potence", "celerity", "Fortitude"] ) assert.ok(AG.animalCanLearn(d));
  for ( const d of ["Animalism", "Dominate", "Auspex", "Vicissitude"] ) assert.ok(!AG.animalCanLearn(d));
});

test("every kind has a size, a span and a name word; no size band is out of order", () => {
  const order = Object.values(AG.SIZES).map(s => s.blood);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for ( const [k, v] of Object.entries(AG.KINDS) ) {
    assert.ok(AG.SIZES[v.size], `${k} size`);
    assert.ok(v.span > 0 && v.words.length, `${k} span and words`);
  }
  assert.match(AG.describe("horse"), /holds 14 vitae, needs 1 a month/);
});
