import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {TEMPLATES, GROUPS, TIERS, ABILITY_2002} from "../../modules/wodx-rules/creation/data/dasc-templates.mjs";
import * as SC from "../../modules/wodx-rules/creation/supporting-cast-rules.mjs";
import * as BR from "../../modules/wodx-rules/creation/book-people-rules.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const sum = o => Object.values(o ?? {}).reduce((s, v) => s + v, 0);

/* B7695: the Dark Ages Storytellers Companion (2002) supporting-character templates, pdf pp. 58-61 */
test("twenty templates in the book's four groups, each with nine Attributes, a page and three Virtues", () => {
  assert.equal(TEMPLATES.length, 20);
  assert.equal(new Set(TEMPLATES.map(t => t.key)).size, 20);
  assert.deepEqual(GROUPS.map(g => TEMPLATES.filter(t => t.group === g).length), [7, 6, 2, 5]);
  for ( const t of TEMPLATES ) {
    assert.equal(Object.keys(t.attributes).length, 9, t.key);
    assert.ok(t.pdf >= 58 && t.pdf <= 61, t.key);
    assert.equal(Object.keys(t.virtues).length, 3, t.key);
    assert.ok(t.about.length > 20, t.key);
  }
  // The book's Generation Background agrees with the stated Generation (12th less the dots)
  for ( const t of TEMPLATES.filter(x => x.line === "vampire") ) assert.equal(t.generation, 12 - (t.backgrounds.Generation ?? 0), t.key);
});

test("a base template keeps the book's numbers, with 2002 Abilities read for V20 Dark Ages", () => {
  const g = SC.build("city-guard");
  assert.equal(g.attributes.strength, 3);
  assert.equal(g.abilities.Athletics, 2);
  assert.equal(g.abilities.Dodge, undefined);
  assert.equal(g.willpower, 3);
  assert.equal(g.road.value, 4);
  assert.match(g.notes.join(" "), /Dodge as Athletics/);
  assert.equal(SC.build("cutthroat").abilities.Legerdemain, 2);
  assert.equal(SC.build("cutthroat").road.value, 4, "Conscience 1 + Instinct 3");
  assert.deepEqual(Object.keys(ABILITY_2002).sort(), ["Dodge", "Herbalism", "Larceny"]);
  const ib = SC.build("information-broker");
  assert.equal(ib.attributes.appearance, 0, "a Nosferatu's Appearance is 0");
  assert.equal(ib.willpower, 4);
  assert.equal(ib.generation, 12);
  assert.equal(SC.build("ashen-crusader").backgrounds.Generation, undefined, "the Generation is the sheet's own");
  assert.equal(SC.build("heretic-priest").road.name, "Road of Night");
  assert.equal(SC.pageOf(SC.byKey("magus")), "DASC 2002 pdf p. 61 / printed p. 60");
});

test("experienced and exceptional versions add exactly the book's dots", () => {
  for ( const t of TEMPLATES ) {
    const base = SC.build(t.key);
    for ( const tier of ["experienced", "exceptional"] ) {
      const b = SC.build(t.key, tier), add = TIERS[tier][t.line];
      assert.equal(sum(b.attributes) - sum(base.attributes), add.attributes, `${t.key} ${tier} attributes`);
      assert.equal(sum(b.abilities) - sum(base.abilities), add.abilities, `${t.key} ${tier} abilities`);
      assert.equal(sum(b.backgrounds) - sum(base.backgrounds), add.backgrounds, `${t.key} ${tier} backgrounds`);
      assert.equal(sum(b.disciplines) - sum(base.disciplines), add.disciplines ?? 0, `${t.key} ${tier} disciplines`);
      for ( const v of [...Object.values(b.attributes), ...Object.values(b.abilities), ...Object.values(b.disciplines)] ) assert.ok(v <= 5);
      if ( t.line === "ghoul" ) assert.equal(b.disciplines.Potence - base.disciplines.Potence, add.disciplines, "a ghoul's dots go to Potence");
      if ( t.line === "vampire" ) {
        assert.ok(b.generation <= add.generation, `${t.key} generation`);
        for ( const d of Object.keys(b.disciplines) ) assert.ok(b.clanDisciplines.includes(d), `${t.key} ${d} is a clan Discipline`);
      }
    }
  }
  assert.equal(SC.build("information-broker", "exceptional").attributes.appearance, 0);
  assert.equal(SC.build("ashen-crusader", "exceptional").generation, 8);
});

test("spread raises the highest traits first and stops at the cap", () => {
  assert.deepEqual(SC.spread({a: 3, b: 1, c: 2}, 4), {a: 5, b: 2, c: 3});
  assert.deepEqual(SC.spread({a: 5, b: 5}, 3), {a: 5, b: 5});
  assert.deepEqual(SC.spread({a: 2, b: 2}, 1, 5, ["a"]), {a: 2, b: 3});
});

test("a template plans onto a sheet; the window is on the Creation panel; no gendered words in WoDX's text", () => {
  const plan = BR.planOf(SC.asPerson(SC.build("aged-castellan")), ["alertness", "athletics", "etiquette", "intimidation", "law"]);
  assert.equal(plan.update["system.abilities.athletics.value"], 1);
  assert.equal(plan.update["system.advantages.virtues.conviction.permanent"], 2);
  assert.ok(plan.secondary.some(s => s.key === "seneschal" && s.value === 3));
  assert.doesNotMatch(JSON.stringify(TEMPLATES.map(t => t.about)), /\b(he|she|him|her|his|hers)\b/i);
  assert.match(src("modules/wodx-creation/scripts/apps.mjs"), /data-action="supportingCast"/);
  assert.match(src("modules/wodx-creation/scripts/main.mjs"), /supportingCast:/);
});
