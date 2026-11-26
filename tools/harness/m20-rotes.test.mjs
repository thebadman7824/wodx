/* B7836: the rotes, Adjustments and Procedures of M20 (pp. 601-611) as Cast window presets. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BR = await import("../../modules/wodx-actions/scripts/m20-rotes.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const M = await import("../../modules/wodx-actions/scripts/m20-rules.js");

test("the core book's 17 rotes, each with its Spheres, page, kind and keywords the Cast window knows (B7836)", () => {
  assert.equal(BR.ROTES.length, 17);
  assert.equal(new Set(BR.ROTES.map(r => r.id)).size, 17);
  for ( const r of BR.ROTES ) {
    assert.match(r.page, /^pp?\. 6(0[1-9]|1[01])(-6(0[1-9]|1[01]))?$/, `${r.id}: page`);
    assert.ok(["Adjustment", "Procedure", "rote"].includes(r.kind), r.id);
    assert.ok(Object.keys(r.spheres).length && Object.keys(r.spheres).every(s => M.SPHERES.includes(s)), `${r.id}: Spheres`);
    assert.ok(r.keywords.length && r.keywords.every(k => E.KEYWORDS[k]), `${r.id}: keywords`);
    assert.ok(r.text.length > 40, `${r.id}: text`);
    assert.equal(BR.roteOf(r.name), r, `${r.id}: found by name`);
    assert.doesNotMatch(r.text, /\b(each|every) (turn|round)\b/i, `${r.id}: no each-turn text`);
  }
});

test("a mage sees only the rotes its Spheres allow, as presets that fill the window (B7836)", () => {
  const known = {life: 3, matter: 2};
  const list = BR.bookRotes(known);
  assert.ok(list.some(r => r.name === "Talons (M20 pp. 609-610)"));
  assert.ok(list.some(r => r.name === "Hands of Death (M20 p. 602)"));
  assert.ok(!list.some(r => /Lawn Chair/.test(r.name)), "Life 5 and Matter 5 needed");
  const t = list.find(r => /^Talons/.test(r.name));
  assert.deepEqual(t.spheres, {life: 3});
  assert.deepEqual(t.keywords, ["shape"]);
  assert.equal(t.kind, "vulgar");
  assert.match(t.text, /Options: Life 4; Matter 2; Prime 2\./);
  assert.equal(BR.presetOf(BR.roteOf("Right-Click")).kind, "coincidental");
});

test("the Cast window lists the book's rotes after the caster's own, and shows what one does (B7836)", () => {
  const read = f => fs.readFileSync(path.join(root, f), "utf8");
  assert.match(read("modules/wodx-actions/scripts/m20.js"), /\[\.\.\.EF\.rotesOf\(actor\), \.\.\.BR\.bookRotes\(i\.spheres\)\]/);
  assert.match(read("modules/wodx-actions/scripts/effects.js"), /wodx-rote-note/);
});
