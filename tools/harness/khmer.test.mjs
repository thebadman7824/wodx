import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Khmer in the People generator (B4740 to B4742): Angkor at 1197, family names first in modern Cambodia */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const SE = W.cultureOf("southeast-asia");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("khmer", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: SE}), origin: "khmer", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: SE})?.results.map(r => r.text) ?? [];

test("khmer: Angkor names alone before 1800, family name first after", () => {
  const med = people("medieval");
  assert.ok(med.every(p => !p.family && !p.name.includes("{")));
  assert.ok(med.some(p => /varman$/.test(p.name)));
  const mod = people("modern", 60);
  assert.ok(mod.every(p => p.family && p.name.startsWith(`${p.family} `)));
});

test("khmer: the largest people of the mainland at 1197, fewer after Angkor falls", () => {
  assert.ok(origin("medieval").includes("khmer") && origin("early-modern").includes("khmer") && origin("industrial").includes("khmer"));
});
