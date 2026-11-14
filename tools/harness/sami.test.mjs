import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Sami in the People generator (B4900 to B4902): given names alone before 1800, family names after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const SC = W.cultureOf("scandinavia");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("sami", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: SC}), origin: "sami", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: SC})?.results.map(r => r.text) ?? [];

test("sami: Sami given names alone before 1800, family names after", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => ["Ánde", "Áslat", "Máhtte", "Niillas", "Biret", "Risten", "Máret"].includes(p.name)));
  assert.ok(people("modern", 60).every(p => p.family && !p.name.includes("{")));
});

test("sami: Scandinavia holds the Sami beside the Norse in every age", () => {
  for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) assert.ok(origin(era).includes("sami") && origin(era).includes("norse"), era);
});
