import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Maya in the People generator (B3830 to B3833): own names and a patronym before the conquest, church names after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const {MAYA_LISTS: L} = await import(join(root, "modules/wodx-creation/data/people-maya.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const MEX = W.cultureOf("mexico");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("maya", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: MEX}), origin: "maya", sex: i % 2 ? "female" : "male"}));

test("maya: no list repeats itself, no pronoun words, over 200 names", () => {
  const all = new Set(Object.values(L).flatMap(split));
  assert.ok(all.size >= 200, `${all.size} names`);
  for ( const l of Object.values(L).map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("maya: an own name and a patronym before the conquest, a church name and the patronym after", () => {
  const med = people("medieval");
  assert.ok(med.every(p => split(L.FAMILY).includes(p.family) && !p.name.includes("{")), med.find(p => !split(L.FAMILY).includes(p.family))?.name);
  assert.ok(med.every((p, i) => split(i % 2 ? L.WOMEN_OLD : L.MEN_OLD).includes(p.given)));
  for ( const era of ["early-modern", "industrial", "modern"] ) {
    const ps = people(era);
    assert.ok(ps.every((p, i) => split(i % 2 ? L.WOMEN_NEW : L.MEN_NEW).includes(p.given) && split(L.FAMILY).includes(p.family)), era);
  }
});

test("maya: beside the Nahua in Mexico and Central America before the conquest, a share later", () => {
  const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: MEX})?.results.map(r => r.text) ?? [];
  assert.deepEqual(origin("medieval"), ["nahua", "maya"]);
  assert.ok(origin("early-modern").includes("maya") && origin("industrial").includes("maya"));
});
