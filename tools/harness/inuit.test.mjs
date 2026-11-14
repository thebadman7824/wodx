import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Inuit in the People generator (B4650 to B4653): one list of own names for anyone, church and family names after 1800 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const IN = await import(join(root, "modules/wodx-creation/data/people-inuit.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const AR = W.cultureOf("arctic");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("in", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: AR}), origin: "inuit", sex: i % 2 ? "female" : "male"}));

test("inuit: no list repeats itself, no pronoun words", () => {
  for ( const l of [IN.IN_NAMES, IN.IN_LANDS, IN.IN_FAMILY].map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("inuit: the same own names for anyone before 1800, family names after; the Arctic and Canada", () => {
  const names = split(IN.IN_NAMES), lands = split(IN.IN_LANDS).map(l => `A woman of ${l}`);
  for ( const era of ["medieval", "early-modern"] ) {
    const ps = people(era);
    assert.ok(ps.every(p => !p.family && (names.includes(p.name) || lands.includes(p.name))), era);
    assert.ok(ps.some((p, i) => i % 2 && names.includes(p.name)), `${era}: women bear the same names`);
  }
  assert.ok(people("modern", 60).every(p => split(IN.IN_FAMILY).includes(p.family)));
  const origin = (era, r) => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: W.cultureOf(r)})?.results.map(r => r.text) ?? [];
  assert.ok(origin("medieval", "arctic").includes("inuit") && origin("medieval", "arctic").includes("norse"));
  assert.ok(origin("modern", "arctic").includes("inuit") && origin("medieval", "canada").includes("inuit"));
});
