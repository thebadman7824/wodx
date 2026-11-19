// B7092: the combination Disciplines of V20 Lore of the Clans (data/rules/vampire/combinations-lotc.json): each row
// needs every Discipline it names, at its level, and carries keywords the effects card reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const DATA = JSON.parse(read("modules/wodx-actions/data/rules/vampire/combinations-lotc.json"));
const DISCS = ["Animalism", "Auspex", "Celerity", "Chimerstry", "Dementation", "Dominate", "Fortitude", "Necromancy", "Obfuscate", "Obtenebration",
  "Potence", "Presence", "Protean", "Quietus", "Serpentis", "Thaumaturgy", "Vicissitude"];

test("B7092: every combination row is sound", () => {
  const ids = new Set();
  for (const r of DATA.rows) {
    assert.ok(!ids.has(r.id), `${r.id}: repeated`); ids.add(r.id);
    assert.ok(r.needs.length >= 2 && r.needs.every(x => DISCS.includes(x.d.split(":")[0]) && x.l >= 1 && x.l <= 6), `${r.id}: needs`);
    assert.equal(r.l, Math.max(...r.needs.map(x => x.l)), `${r.id}: level`);
    assert.ok(r.xp > 0 && r.p > 0 && r.book === "V20 LotC" && r.e.length > 20, `${r.id}: xp, page, text`);
    assert.ok(K.DURATION_TEXT[r.t] && /^(b\d+|bX)?(w\d+)?$/.test(r.c), `${r.id}: duration ${r.t}, cost ${r.c}`);
    if (r.r) assert.ok(K.poolParts(r.r).length, `${r.id}: pool`);
    assert.ok(r.k.length && r.k.every(k => E.KEYWORDS[k.split(":")[0]]), `${r.id}: keywords`);
    assert.doesNotMatch(r.e, /\b(he|she|his|her|him|himself|herself)\b/i, `${r.id}: gendered text`);
  }
});

test("B7092: a combination power shows only when every Discipline it needs is on the sheet at its level", () => {
  const rows = DATA.rows;
  const has = sheet => K.powersFor(rows, sheet).map(p => p.kw);
  assert.ok(has([{ name: "Auspex", value: 2 }, { name: "Presence", value: 1 }]).includes("honeyed-words"));
  assert.ok(!has([{ name: "Auspex", value: 1 }, { name: "Presence", value: 3 }]).includes("honeyed-words"));
  assert.ok(!has([{ name: "Auspex", value: 5 }]).includes("honeyed-words"));
  assert.ok(has([{ name: "Celerity", value: 3 }, { name: "Obfuscate", value: 2 }]).includes("shadow-feint"));
  // A sorcery is met by the sorcery or one of its paths, never by an unrelated Discipline
  const paths = [{ d: "Necromancy: The Sepulchre Path", l: 1, n: "Witness of Death" }, ...rows];
  const with_ = sheet => K.powersFor(paths, sheet).map(p => p.kw);
  assert.ok(with_([{ name: "Auspex", value: 1 }, { name: "Sepulchre Path", value: 3 }]).includes("eyes-of-a-thousand-shades"));
  assert.ok(with_([{ name: "Auspex", value: 1 }, { name: "Necromancy", value: 3 }]).includes("eyes-of-a-thousand-shades"));
  assert.ok(!with_([{ name: "Auspex", value: 1 }, { name: "Potence", value: 5 }]).includes("eyes-of-a-thousand-shades"));
  assert.ok(!with_([{ name: "Auspex", value: 1 }, { name: "Sepulchre Path", value: 2 }]).includes("eyes-of-a-thousand-shades"));
  // A need that names one path takes that path only
  assert.ok(has([{ name: "Auspex", value: 2 }, { name: "Path of Blood", value: 1 }]).includes("blood-sight"));
  assert.ok(!has([{ name: "Auspex", value: 2 }, { name: "Lure of Flames", value: 3 }]).includes("blood-sight"));
});

test("B7092: the vampire window loads the table and its keywords", () => {
  const k = read("modules/wodx-actions/scripts/kindred.js");
  assert.match(k, /get\("rules\/vampire\/combinations-lotc\.json"\)/);
  assert.match(k, /PK\.LINE_KEYWORDS\.v20\[r\.kw\] = \{ n: r\.n, k: r\.k \}/);
});
