import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Sephardi and Mizrahi Jews in the People generator (B4730 to B4733) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const people = (origin, region, era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream(`jw:${origin}`, era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: W.cultureOf(region)}), origin, sex: i % 2 ? "female" : "male"}));
const origin = (region, era) => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: W.cultureOf(region)})?.results.map(r => r.text) ?? [];

test("sephardi: Sefarad's names and families before 1800, Ladino and Portuguese Nation names after", () => {
  const med = people("sephardi", "iberia", "medieval");
  assert.ok(med.every(p => p.family && !p.name.includes("{")));
  assert.ok(med.some(p => ["Abravanel", "Benveniste", "Ibn Ezra"].includes(p.family)));
  assert.ok(people("sephardi", "aegean", "industrial", 100).some(p => ["Modiano", "Carasso", "Saltiel", "Molho"].includes(p.family)));
});

test("mizrahi: son-of names and places before 1800, family names after", () => {
  const med = people("mizrahi", "levant", "medieval");
  assert.ok(med.every(p => p.family && !p.name.includes("{")));
  assert.ok(med.some(p => /^(ben|bat) /.test(p.family)));
  assert.ok(med.some(p => p.name.startsWith("Sitt al-")));
  assert.ok(people("mizrahi", "levant", "modern", 100).some(p => ["Sassoon", "Kadoorie", "Somekh", "Shasha"].includes(p.family)));
});

test("sephardi and mizrahi: where they live", () => {
  assert.ok(origin("iberia", "medieval").includes("sephardi") && !origin("iberia", "medieval").includes("jewish"));
  assert.ok(!origin("iberia", "early-modern").includes("sephardi"));
  assert.ok(origin("aegean", "early-modern").includes("sephardi"));
  assert.ok(origin("low-countries", "early-modern").includes("sephardi"));
  for ( const r of ["levant", "egypt", "arabia", "persia", "maghreb"] ) assert.ok(origin(r, "medieval").includes("mizrahi"), r);
});
