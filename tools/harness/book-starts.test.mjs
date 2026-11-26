import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6779e: starting traits the books give, by era and by tribe or bloodline */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/rules.mjs")));
const SR = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/states-rules.mjs")));
const D = await import(pathToFileURL(join(root, "modules/wodx-rules/creation/derived-rules.mjs")));
const wp = tribe => D.derivedTraits("w20", {tribe}).rows.find(r => r.key === "willpower")?.want ?? null;

test("a ghoul's pool by the era's book", () => {
  assert.equal(R.ghoulBloodMax(0), 10, "no era: the Dark Ages rule");
  assert.equal(R.ghoulBloodMax(250, {era: "darkages"}), 12);
  assert.equal(R.ghoulBloodMax(0, {era: "modern"}), 2);
  assert.equal(R.ghoulBloodMax(800, {era: "modern"}), 6, "V20's 800-year-old ghoul");
  assert.equal(R.ghoulBloodMax(300, {era: "victorian", revenant: true}), 5);
  assert.equal(SR.revenantStart({family: Object.keys(SR.FAMILIES)[0], era: "modern"}).blood.max, 2);
  assert.equal(SR.revenantStart({family: Object.keys(SR.FAMILIES)[0], era: "darkages"}).blood.max, 10);
});

test("starting Willpower of the lost tribes, the Black Spiral Dancers and the Hakken", () => {
  assert.equal(wp("Croatan"), 4); assert.equal(wp("Bunyip"), 4); assert.equal(wp("White Howlers"), 3);
  assert.equal(wp("Black Spiral Dancers"), 3); assert.equal(wp("Hakken"), 3);
});

test("Tlacique, Mla Watu and Nkulu Zao have their Disciplines", () => {
  const d = n => R.clanDisciplines(R.findClan(n), "darkages");
  assert.deepEqual(d("Tlacique"), ["Obfuscate", "Presence", "Protean"]);
  assert.deepEqual(d("Mla Watu"), ["Auspex", "Fortitude", "Necromancy"]);
  assert.deepEqual(d("Nkulu Zao"), ["Auspex", "Fortitude", "Obeah"]);
});

test("a ghoul keeps the rule of the era it became one in; the year matches the Chronicle's Victorian era", async () => {
  const {readFileSync} = await import("node:fs");
  const eras = JSON.parse(readFileSync(join(root, "modules/wodx-chronicle/data/eras.json"), "utf8"));
  assert.equal((eras.profiles ?? eras).find(p => p.id === "victorian").start, R.V20_FROM);
  assert.equal(R.ghoulRuleEra(1197), "darkages"); assert.equal(R.ghoulRuleEra(1900), "victorian");
});
