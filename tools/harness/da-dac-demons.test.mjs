import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {DEMONS, GROUPS} from "../../modules/wodx-creation/data/dac-demons.mjs";
import * as R from "../../modules/wodx-creation/scripts/dac-demons-rules.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const KEYS = ["alertness", "athletics", "brawl", "empathy", "intimidation", "leadership", "legerdemain", "stealth", "subterfuge", "performance", "occult",
  "academics", "investigation", "etiquette", "melee", "archery", "ride", "law", "linguistics", "politics", "science"];

/* B7698: the sample and bound demons of the Dark Ages Companion (2002) pp. 180-185 */
test("ten demons from the book's stat blocks, each with its page and group", () => {
  assert.equal(DEMONS.length, 10);
  assert.deepEqual(DEMONS.map(d => d.key), ["kaiser", "huntsman", "spite", "star-daemon", "belteroth", "black-monk", "jenny-green-teeth", "gergimoth", "familiar", "custodes"]);
  for ( const d of DEMONS ) {
    assert.ok(GROUPS.includes(d.group), d.key);
    assert.ok(d.p >= 180 && d.p <= 185, d.key);
    assert.equal(Object.keys(d.attributes).length, 9, d.key);
    assert.ok(d.about.length <= 260 && !/—/.test(d.about), `${d.key}: a short summary in WoDX's words`);
  }
  // Spot checks against the page images
  const k = R.byKey("kaiser");
  assert.deepEqual([k.attributes.perception, k.abilities.Investigation, k.disciplines.Obtenebration, k.paths["Dark Thaumaturgy: Video Nefas"], k.blood, k.willpower], [8, 8, 6, 5, 20, 9]);
  const g = R.byKey("gergimoth");
  assert.deepEqual([g.attributes.strength, g.attributes.stamina, g.blood, g.willpower], [10, 10, 15, 8]);
  assert.match(g.about, /-2 in the book/);
  assert.deepEqual(R.byKey("black-monk").disciplines.Maleficia, 5);
  assert.deepEqual(R.byKey("familiar").disciplines, {Animalism: 3, Auspex: 2, Celerity: 3, Maleficia: 2});
});

test("health: the book's levels on the sheet's seven slots, the book's penalties kept", () => {
  const want = {kaiser: 10, huntsman: 10, spite: 7, "star-daemon": 8, belteroth: 12, "black-monk": 9, "jenny-green-teeth": 13, gergimoth: 16, familiar: 6, custodes: 13};
  for ( const d of DEMONS ) {
    const h = R.healthOf(d);
    assert.equal(h.levels, want[d.key], d.key);
    assert.equal(R.bookLevels(d), want[d.key], d.key);
    assert.equal(h.counts.injured, 0);
    assert.equal(h.counts.incapacitated, 1);
  }
  const j = R.healthOf(R.byKey("jenny-green-teeth"));
  assert.deepEqual(j.counts, {bruised: 3, hurt: 3, injured: 0, wounded: 3, mauled: 2, crippled: 1, incapacitated: 1});
  assert.equal(j.update["system.health.mauled.penalty"], -3);
  assert.equal(j.update["system.health.crippled.total"], 1);
});

test("the sheet plan: 2002 Abilities read in V20 Dark Ages terms, blood, Disciplines and paths, notes", () => {
  const h = R.plan(R.byKey("huntsman"), KEYS);
  assert.equal(h.update["system.abilities.legerdemain.value"], 6, "Larceny is Legerdemain");
  assert.equal(h.update["system.abilities.performance.value"], 4, "Acting 4 and Music 3 are Performance at the higher");
  assert.equal(h.update["system.advantages.bloodpool.max"], 15);
  assert.equal(h.update["system.advantages.willpower.permanent"], 7);
  assert.equal(h.update["system.settings.powers.hasdisciplines"], true);
  assert.deepEqual(h.paths, {"Dark Thaumaturgy: Rego Venalis": 4});
  assert.match(h.notes.join(" "), /eight dice plus Potence/);
  const s = R.plan(R.byKey("spite"), KEYS);
  assert.equal(s.update["system.abilities.athletics.value"], 5, "Dodge is Athletics");
  assert.match(R.plan(R.byKey("star-daemon"), KEYS).notes.join(" "), /no body/);
  assert.match(R.plan(R.byKey("black-monk"), KEYS).notes.join(" "), /dead, not dispelled/);
  assert.deepEqual(R.plan(R.byKey("gergimoth"), KEYS).secondary.map(x => x.name), ["Discover Treasures"]);
  assert.equal(R.pageOf(R.byKey("custodes")), "DAC 2002 p. 185");
});

test("the Storyteller's window and the API", () => {
  assert.match(src("modules/wodx-creation/scripts/apps.mjs"), /data-action="dacDemons"/);
  assert.match(src("modules/wodx-creation/scripts/main.mjs"), /dacDemons: \{list/);
});
