import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Aboriginal Australians in the People generator (B4680 to B4683): Australia named from 1197 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const A = await import(join(root, "modules/wodx-creation/data/people-aboriginal.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const AU = W.cultureOf("australia");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("ab", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: AU}), origin: "aboriginal", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: AU})?.results.map(r => r.text) ?? [];

test("aboriginal: no list repeats itself, no pronoun words", () => {
  for ( const l of [A.AB_MEN, A.AB_WOMEN, A.AB_NATIONS, A.AB_FAMILY].map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("aboriginal: own names and women of a nation before 1800, family names after; Australia from 1197", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => split(A.AB_NATIONS).map(n => `A woman of ${n}`).includes(p.name)));
  assert.ok(people("modern", 60).every(p => split(A.AB_FAMILY).includes(p.family)));
  assert.deepEqual(origin("medieval"), ["aboriginal"]);
  assert.ok(origin("industrial").includes("aboriginal") && origin("industrial").includes("english"));
  assert.equal(W.hasPeopleIn("australia", 1300), true);
});
