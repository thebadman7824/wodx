import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Amazigh (Berbers) in the People generator (B4710 to B4712): the Maghreb's mountains and desert edge */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const MA = W.cultureOf("maghreb");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("amazigh", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: MA}), origin: "amazigh", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: MA})?.results.map(r => r.text) ?? [];

test("amazigh: medieval names carry a son-of or a tribe, modern names a family name", () => {
  const med = people("medieval");
  assert.ok(med.every(p => p.family && !p.name.includes("{")));
  assert.ok(med.some(p => /^al-/.test(p.family)) && med.some(p => /^(ibn|bint) /.test(p.family)));
  assert.ok(med.some(p => ["Tinhinan", "Dihya", "Tafsut", "Taous", "Itto"].some(n => p.name.startsWith(n))));
  const mod = people("modern", 100);
  assert.ok(mod.some(p => /^Aït /.test(p.family)) && mod.every(p => !p.name.includes("{")));
});

test("amazigh: the Maghreb holds Arabs and Amazigh in every age, the French a share in the industrial age", () => {
  for ( const era of ["medieval", "early-modern", "modern"] ) assert.deepEqual(origin(era).sort(), ["amazigh", "arabic"], era);
  assert.ok(origin("industrial").includes("french"));
});
