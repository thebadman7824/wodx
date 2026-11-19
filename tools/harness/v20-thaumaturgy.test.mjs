// B7089-B7090: every V20 core Thaumaturgy path (V20 pp. 210-230) has a power at each of its five levels in the library
// the vampire window reads (V20 rows, or Dark Ages rows of the same name), and the sheet's names find them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));
const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords-lines.js");
const DA = read("modules/wodx-actions/data/disciplines-daw.json").powers;
const V20 = read("modules/wodx-actions/data/disciplines-v20.json").powers;
const LIB = K.librarySet(DA, V20, { v20Names: new Set(Object.keys((PK.LINE_KEYWORDS ?? PK.default).v20)) });
// The V20 core paths, as a sheet would name them; the Dark Ages rows carry Blood and Elemental Mastery by power name
const PATHS = { "Path of Blood": ["A Taste for Blood", "Blood Rage", "Blood of Potency", "Theft of Vitae", "Cauldron of Blood"],
  "Elemental Mastery": ["Elemental Strength", "Wooden Tongues", "Animate the Unmoving", "Elemental Form", "Summon Elemental"],
  "Lure of Flames": null, "Movement of the Mind": null, "Weather Control": null, "Path of Technomancy": null, "Hands of Destruction": null,
  "Green Path": null, "Neptune's Might": null, "Path of Conjuring": null, "Path of Corruption": null, "Path of Mars": null, "Father's Vengeance": null };

test("B7089: each V20 core Thaumaturgy path has a power at every level", () => {
  for (const [name, names] of Object.entries(PATHS)) {
    const got = K.powersFor(V20.concat(names ? DA.filter(p => names.includes(p.n)) : []), [{ name: `Thaumaturgy: ${name}`, value: 5 }]).filter(p => /^thaumaturgy/i.test(p.d));
    for (let l = 1; l <= 5; l++) assert.ok(got.some(p => p.l === l), `${name} level ${l}`);
  }
});

test("B7089: the Lure of Flames follows V20 p. 218: Candle 1 to Inferno 5", () => {
  const lure = V20.filter(p => p.d === "Thaumaturgy: the Lure of Flames").sort((a, b) => a.l - b.l).map(p => p.n);
  assert.deepEqual(lure, ["Candle", "Palm of Flame", "Campfire", "Bonfire", "Inferno"]);
});

test("B7090: a sheet's 'Hands of Destruction' or 'Path of Decay' finds the same powers", () => {
  for (const s of ["Hands of Destruction", "Path of Decay", "Thaumaturgy: Hands of Destruction"]) {
    const got = K.powersFor(V20, [{ name: s, value: 5 }]).filter(p => /thaumaturgy/i.test(p.d)).map(p => p.n);
    assert.ok(["Decay", "Gnarl Wood", "Acidic Touch", "Atrophy", "Turn to Dust"].every(n => got.includes(n)), `${s}: ${got}`);
  }
});

test("B7089: every new row has keywords the effects card reads", () => {
  const kw = (PK.LINE_KEYWORDS ?? PK.default).v20;
  for (const p of V20.filter(x => /^v20-(candle|campfire|bonfire|inferno|movement-of-the-mind|fog|storm|encrypt)/.test(x.id))) assert.ok(kw[p.kw]?.k?.length, p.id);
  assert.ok(LIB.length > V20.length);
});

test("B7091: the V20 bloodline Disciplines a sheet could not reach have all five levels (V20 pp. 453-477)", () => {
  for (const d of ["Melpominee", "Obeah", "Sanguinus", "Thanatosis", "Visceratika"]) {
    const got = K.powersFor(V20, [{ name: d, value: 5 }]);
    for (let l = 1; l <= 5; l++) assert.ok(got.some(p => p.l === l && p.d === d), `${d} level ${l}`);
  }
});
