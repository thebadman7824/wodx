import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Filipinos in the People generator (B4750 to B4753): own names before 1565, church names after, family names from 1800 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const A = await import(join(root, "modules/wodx-creation/data/people-filipino.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const NU = W.cultureOf("philippines");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("filipino", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: NU}), origin: "filipino", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: NU})?.results.map(r => r.text) ?? [];

test("filipino: no list repeats itself, no pronoun words", () => {
  for ( const l of [A.FI_MEN, A.FI_WOMEN, A.FI_TOWNS, A.FI_FAMILY].map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("filipino: own names and women of a barangay before 1565, church names after, family names from 1800", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => split(A.FI_TOWNS).map(t => `A woman of ${t}`).includes(p.name)));
  assert.ok(people("early-modern").some(p => /^(Juan|Pedro|Francisco|Agustín|Andrés|Domingo|Felipe) /.test(p.name)));
  assert.ok(people("modern", 60).every(p => split(A.FI_FAMILY).includes(p.family)));
});

test("filipino: the islands of the Philippines draw them in every age", () => {
  for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) assert.ok(origin(era).includes("filipino"), era);
});
