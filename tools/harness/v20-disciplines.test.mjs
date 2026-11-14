/* Powers pass p4 (B3746): every V20 Discipline power in the game has a library entry: a card, its roll and its keywords. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");
const J = f => JSON.parse(fs.readFileSync(path.join(root, "modules/wodx-actions/data", f), "utf8")).powers;
const DA = J("disciplines-daw.json"), V20 = J("disciplines-v20.json");
const slug = s => String(s).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

test("every V20 power the game lists is in the Dark Ages library by name or in the V20 library (B3746)", () => {
  const da = new Set(DA.map(p => slug(p.n))), v = new Set(V20.map(p => p.kw));
  const missing = Object.keys(PK.LINE_KEYWORDS.v20).filter(id => !da.has(id) && !v.has(id));
  assert.deepEqual(missing, []);
});

test("V20 entries are well formed: level, cost, duration, pool, page and text (B3746)", () => {
  for ( const p of V20 ) {
    assert.ok(p.l >= 1 && p.l <= 5, `${p.id}: level`);
    assert.ok(K.DURATION_TEXT[p.t], `${p.id}: duration ${p.t}`);
    assert.ok(/^(b\d+)?(w\d+)?$/.test(p.c), `${p.id}: cost ${p.c}`);
    if ( p.r ) assert.ok(K.poolParts(p.r).length, `${p.id}: pool ${p.r}`);
    assert.ok(p.p >= 130 && p.p <= 245, `${p.id}: page`);
    assert.ok(p.e.length > 20 && p.book === "V20", `${p.id}: text`);
    assert.ok(PK.LINE_KEYWORDS.v20[p.kw], `${p.id}: keywords under ${p.kw}`);
  }
  assert.equal(new Set(V20.map(p => p.id)).size, V20.length, "ids are unique");
});

test("later eras use the V20 powers in place of the Dark Ages ones at the same level; the Dark Ages keeps its own (B3746)", () => {
  const names = new Set(Object.keys(PK.LINE_KEYWORDS.v20));
  const modern = K.powersFor(K.librarySet(DA, V20, {darkAges: false, v20Names: names}), [{name: "Animalism", value: 2}, {name: "Auspex", value: 3}]).map(p => p.n);
  assert.ok(modern.includes("Feral Whispers") && modern.includes("Beckoning") && modern.includes("Aura Perception"));
  assert.ok(modern.some(n => /Spirit.s Touch/.test(n)), "a power both books name stays");
  const da1 = DA.find(p => p.d === "Animalism" && p.l === 1).n;
  assert.ok(!modern.includes(da1), `${da1} gives way to Feral Whispers`);
  const old = K.powersFor(K.librarySet(DA, V20, {darkAges: true, v20Names: names}), [{name: "Animalism", value: 2}]).map(p => p.n);
  assert.ok(old.includes(da1) && !old.includes("Feral Whispers"));
  const thaum = K.powersFor(K.librarySet(DA, V20, {v20Names: names}), [{name: "The Green Path", value: 5}]).map(p => p.n);
  assert.equal(thaum.length, 5, "a Thaumaturgy path on the sheet reaches its five powers");
  const kin = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/kindred.js"), "utf8");
  assert.match(kin, /disciplines-v20\.json/);
  assert.match(kin, /set: p\.book === "V20" \? "v20" : "disc"/);
});
