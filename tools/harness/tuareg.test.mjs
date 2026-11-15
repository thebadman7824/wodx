import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Tuareg in the People generator (B4950 to B4952): son of and daughter of the father in every age */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const people = (region, era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("tuareg", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: W.cultureOf(region)}), origin: "tuareg", sex: i % 2 ? "female" : "male"}));
const origin = (region, era) => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: W.cultureOf(region)})?.results.map(r => r.text) ?? [];

test("tuareg: ag and welet the father's name, in every age", () => {
  for ( const era of ["medieval", "modern"] ) {
    const all = people("west-africa", era, 60);
    assert.ok(all.every(p => /^(ag|welet) /.test(p.family ?? "") && !p.name.includes("{")), era);
    assert.ok(all.filter((p, i) => i % 2).every(p => p.family.startsWith("welet ")), era);
  }
});

test("tuareg: at the desert edge of West Africa and the Maghreb", () => {
  for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) assert.ok(origin("west-africa", era).includes("tuareg"), era);
  assert.ok(origin("maghreb", "medieval").includes("tuareg"));
});
