import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Moro in the People generator (B5000 to B5002): sultanate names alone before 1800, bin, binti or a family name after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const NU = W.cultureOf("nusantara");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("moro", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: NU}), origin: "moro", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: NU})?.results.map(r => r.text) ?? [];

test("moro: names alone before 1800, then bin, binti or a family name", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => ["Kudarat", "Kabungsuwan", "Tarhata", "Piandao"].includes(p.name)));
  const mod = people("modern", 100);
  assert.ok(mod.every(p => p.family && !p.name.includes("{")));
  assert.ok(mod.some(p => ["Kiram", "Alonto", "Misuari", "Lucman"].includes(p.family)));
});

test("moro: in the Malay world's mix in every age", () => {
  for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) assert.ok(origin(era).includes("moro"), era);
});
