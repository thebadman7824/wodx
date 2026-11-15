import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Banyarwanda and Barundi in the People generator (B5030 to B5032): court names alone before 1800, a church name and an own name after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const CA = W.cultureOf("central-africa");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("banyarwanda", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: CA}), origin: "banyarwanda", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: CA})?.results.map(r => r.text) ?? [];

test("banyarwanda: names alone before 1800, then a church name and an own name", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => ["Rwabugiri", "Ntare", "Kanjogera", "Mwezi"].includes(p.name)));
  const mod = people("modern", 100);
  assert.ok(mod.every(p => p.family && !p.name.includes("{")));
  assert.ok(mod.some(p => ["Habimana", "Uwimana", "Nkurunziza", "Bizimana"].includes(p.family)));
});

test("banyarwanda: in the central Africa's mix in every age", () => {
  for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) assert.ok(origin(era).includes("banyarwanda"), era);
});
