import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {PEOPLE, GROUPS, BOOK} from "../../modules/wodx-creation/data/vtda-people.mjs";
import * as BR from "../../modules/wodx-rules/creation/book-people-rules.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const SYS = ["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "streetwise", "subterfuge",
  "animalken", "craft", "etiquette", "melee", "performance", "stealth", "survival", "academics", "enigmas", "investigation", "law", "medicine", "occult", "politics"];

/* B7674: the Storyteller characters of V20 Dark Ages pp. 383-396 */
test("the book's people: 23 mortals and 3 of the Faithful, every one in a group with a page", () => {
  assert.equal(PEOPLE.length, 26);
  assert.equal(new Set(PEOPLE.map(p => p.key)).size, 26);
  for ( const p of PEOPLE ) {
    assert.ok(GROUPS.includes(p.group), p.key);
    assert.ok(p.p >= 383 && p.p <= 396, p.key);
    assert.ok(p.about && p.about.length > 20, p.key);
  }
  assert.equal(PEOPLE.filter(p => p.faith).length >= 5, true);
  assert.equal(BR.pageOf(BR.byKey("curious-barber")), `${BOOK} p. 383`);
});

test("a book person's sheet plan: system Abilities, Dark Ages Secondary Abilities, Willpower and the Road", () => {
  const plan = BR.planOf(BR.byKey("curious-barber"), SYS);
  assert.equal(plan.update["system.attributes.wits.value"], 4);
  assert.equal(plan.update["system.abilities.medicine.value"], 3);
  assert.equal(plan.update["system.abilities.craft.value"], 2);
  assert.equal(plan.update["system.advantages.willpower.permanent"], 5);
  assert.equal(plan.update["system.advantages.path.permanent"], 5);
  const sec = Object.fromEntries(plan.secondary.map(s => [s.key, s.group]));
  assert.deepEqual(sec, {legerdemain: "talent", commerce: "skill", hearthwisdom: "knowledge"});
  assert.deepEqual(plan.backgrounds.map(b => b.name).sort(), ["Allies", "Contacts", "Resources"]);
});

test("the Faithful carry their True Faith; nobody of the book is under 18", () => {
  const faith = BR.planOf(BR.byKey("saint-of-the-vine"), SYS);
  assert.equal(faith.faith, 5);
  assert.equal(faith.update["flags.wodx-actions.trueFaith"], 5);
  const text = JSON.stringify(PEOPLE);
  assert.doesNotMatch(text, /\b(1[0-7]|[1-9]) years old\b|\bonly 1[0-7]\b|\borphan girl\b/i);
  assert.match(BR.byKey("marisa").about, /grown .* age floor/i);
  assert.doesNotMatch(text, /\b(he|she|him|her|his|hers)\b/i);
  const ui = src("modules/wodx-creation/scripts/apps.mjs");
  assert.match(ui, /bookPeople/);
});
