import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Central Africa in the People generator (B4690 to B4693): the Kongo, the Luba and Lunda, and the Baganda from 1197 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const A = await import(join(root, "modules/wodx-creation/data/people-central-africa.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const CA = W.cultureOf("central-africa");
const people = (origin, era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream(`ca:${origin}`, era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: CA}), origin, sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: CA})?.results.map(r => r.text) ?? [];
const LISTS = [A.KO_MEN, A.KO_WOMEN, A.KO_CLANS, A.KO_FAMILY, A.LU_MEN, A.LU_WOMEN, A.LU_TOWNS, A.LU_FAMILY,
  A.GA_MEN, A.GA_WOMEN, A.GA_CLANS, A.GA_FAMILY];

test("central Africa: no list repeats itself, no pronoun words", () => {
  for ( const l of LISTS.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("central Africa: Kongo kanda and Ganda ebika before 1800, Luba women of a chiefdom; family names after", () => {
  const clan = c => `of the ${c} clan`;
  assert.ok(people("kongo", "medieval").every(p => split(A.KO_CLANS).map(clan).includes(p.family) && !p.name.includes("{")));
  assert.ok(people("ganda", "medieval").every(p => split(A.GA_CLANS).map(clan).includes(p.family)));
  const lu = people("luba", "medieval");
  assert.ok(lu.every(p => !p.family && !p.name.includes("{")));
  assert.ok(lu.some(p => split(A.LU_TOWNS).map(t => `A woman of ${t}`).includes(p.name)));
  // the Kongo court took church names from 1491
  assert.ok(people("kongo", "early-modern").some(p => /^(Afonso|Pedro|Álvaro|Garcia|Diogo|António) /.test(p.name)));
  for ( const [o, fam] of [["kongo", A.KO_FAMILY], ["luba", A.LU_FAMILY], ["ganda", A.GA_FAMILY]] )
    assert.ok(people(o, "modern", 60).every(p => split(fam).includes(p.family)), o);
});

test("central Africa: peopled from 1197, the Kongo, Luba and Ganda first, the colony later", () => {
  assert.deepEqual(origin("medieval").sort(), ["banyarwanda", "ganda", "kongo", "luba"]);
  assert.ok(origin("industrial").includes("french") && origin("industrial").includes("kongo"));
  assert.equal(W.hasPeopleIn("central-africa", 1300), true);
});
