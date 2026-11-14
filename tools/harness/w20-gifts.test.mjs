/* Powers pass p5 (B3747): every W20 Gift the game lists has a library entry: pool, cost, duration, effect and page. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const G = await import("../../modules/wodx-actions/scripts/garou-rules.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");
const J = f => JSON.parse(fs.readFileSync(path.join(root, "modules/wodx-actions/data", f), "utf8")).gifts;
const DA = J("gifts-daw.json"), W20 = J("gifts-w20.json");
const slug = s => String(s).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

test("every W20 Gift the game lists is in the Dark Ages library by name or in the W20 library (B3747)", () => {
  const da = new Set(DA.map(g => slug(g.n))), w = new Set(W20.map(g => g.kw));
  const missing = Object.keys(PK.LINE_KEYWORDS.w20).filter(id => !da.has(id) && !w.has(id));
  assert.deepEqual(missing, []);
});

test("W20 entries are well formed and their pools, costs, difficulties and durations read (B3747)", () => {
  const DUR = new Set(["scene", "turn", "turns", "minutes", "hours", "day", "days", "week", "months", "instant", "var", "at-will", "permanent"]);
  for ( const g of W20 ) {
    assert.ok(g.l >= 1 && g.l <= 6, `${g.id}: level`);
    assert.ok(g.p >= 150 && g.p <= 202, `${g.id}: page`);
    assert.ok(g.e.length > 20 && g.book === "W20", `${g.id}: text`);
    assert.ok(!g.t || DUR.has(g.t), `${g.id}: duration ${g.t}`);
    if ( g.r ) assert.ok(G.giftPool(g.r)?.length, `${g.id}: pool ${g.r}`);
    if ( g.c ) { const c = G.giftCost(g.c); assert.ok(c.gnosis + c.rage + c.willpower > 0 || c.variable, `${g.id}: cost ${g.c}`); }
    if ( typeof g.d === "number" ) assert.ok(g.d >= 3 && g.d <= 10, `${g.id}: difficulty`);
    assert.ok(PK.LINE_KEYWORDS.w20[g.kw], `${g.id}: keywords under ${g.kw}`);
  }
  assert.equal(new Set(W20.map(g => g.id)).size, W20.length, "ids are unique");
  const sp = W20.find(g => g.kw === "sense-prey");
  assert.equal(sp.r, "perception+primalurge"); assert.equal(sp.d, 5);
  assert.deepEqual(G.giftDuration(W20.find(g => g.kw === "tread-sebeks-back").t, 3), {kind: "time", seconds: 3 * 3600});
  assert.equal(G.giftDifficulty(W20.find(g => g.kw === "paralyzing-stare").d, {t: {willpower: 7}}), 7);
});

test("Use a Gift reads the W20 library for Gifts the Dark Ages one lacks, and cites the W20 page (B3747)", () => {
  const src = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/garou.js"), "utf8");
  assert.match(src, /"gifts-w20"/);
  assert.match(src, /findGift\(item\.name\) \|\| findW20Gift\(item\.name\)/);
  assert.match(src, /giftRef = g => g \? `\$\{g\.book \?\? "DA:W"\} p\. \$\{g\.p\}`/);
  assert.doesNotMatch(src, /\(DA:W p\. \$\{g\.p\}\)<\/span>/);
});
