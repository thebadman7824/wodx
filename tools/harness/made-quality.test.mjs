import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as TR from "../../modules/wodx-actions/scripts/trade-rules.js";
import * as X from "../../modules/wodx-library/scripts/examine-rules.mjs";

/* Handmade work reaches trade, Examine and use (NPC look design, PR 1) */
const src = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("the quality tag is stripped before a good is looked up", async () => {
  const M = await import("../../modules/wodx-storyteller/scripts/money.mjs");
  assert.equal(M.stripQuality("a sword (fine work)"), "a sword");
  assert.equal(M.stripQuality("a sword (Masterwork)"), "a sword");
  assert.equal(M.stripQuality("ale (strong)"), "ale");
  assert.equal(M.stripQuality("bronze coins (7)"), "bronze coins (7)");
  assert.equal(M.stripQuality("claret (in a bottle)"), "claret (in a bottle)");
  assert.match(src("modules/wodx-storyteller/scripts/money.mjs"), /s = stripQuality\(s\);/);
});

test("quality scales a trader's price, and plain work is untouched", () => {
  const p = {each: 8, total: 8, sell: 4, fence: 2, text: "8"};
  assert.equal(TR.withQuality(p, 1), p);
  assert.equal(TR.withQuality(null, 2), null);
  const m = TR.withQuality(p, 2);
  assert.deepEqual([m.each, m.total, m.sell, m.fence], [16, 16, 8, 4]);
  const g = TR.withQuality({each: 1, total: 1, sell: 0, fence: 0}, 1.25);
  assert.deepEqual([g.each, g.sell], [1, 0]);
  assert.equal(TR.offerFor(TR.withQuality(p, 1.5)), 6);
  assert.equal(TR.qualityFactor({flags: {"wodx-storyteller": {priceFactor: 1.5}}}), 1.5);
  assert.equal(TR.qualityFactor({flags: {}}), 1);
  assert.equal(TR.qualityFactor({flags: {"wodx-storyteller": {priceFactor: "x"}}}), 1);
  const t = src("modules/wodx-actions/scripts/trade.js");
  // 3.54.0: both lists go through qualityPrice, which also redoes the words in money
  assert.equal((t.match(/qualityPrice\(priceOf\(it\.name, shop\), it\)/g) ?? []).length, 2);
  assert.match(t, /const qualityPrice = \(p, it\) => \{ const q = TR\.withQuality\(p, TR\.qualityFactor\(it\)\); return q && q !== p \? \{ \.\.\.q, text: fmt\(q\.total\) \} : q; \};/);
});

test("Examine fills in a made thing's quality and maker, the Storyteller's notes win", () => {
  assert.deepEqual(X.withMade({}, {quality: "fine", maker: "Anna"}), {quality: "fine", origin: "It is the work of Anna."});
  assert.deepEqual(X.withMade({quality: "poor", origin: "Brno"}, {quality: "master", maker: "Anna"}), {quality: "poor", origin: "Brno"});
  assert.deepEqual(X.withMade(undefined, {quality: "bogus"}), {});
  const f = X.findings("arms", 2, X.withMade({}, {quality: "master", maker: "Anna"}));
  assert.ok(f.some(l => l.text === "The work is masterwork."));
  assert.ok(f.some(l => l.text === "It is the work of Anna."));
  assert.ok(!X.findings("arms", 1, X.withMade({}, {maker: "Anna"})).some(l => /Anna/.test(l.text)));
});

test("crafting records the maker, and a well-made thing is easier to use", () => {
  assert.match(src("modules/wodx-storyteller/scripts/tasks.mjs"), /maker: a\.name/);
  assert.match(src("modules/wodx-storyteller/scripts/cookery.mjs"), /maker: a\.name/);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /extraDiff: easier/);
});

test("a made thing still finds its good for its description", () => {
  const goods = [{id: "sword", name: "a sword"}, {id: "ale", name: "ale"}];
  assert.equal(X.goodOf("a sword (fine work)", goods)?.id, "sword");
  assert.equal(X.goodOf("ale (strong)", goods)?.id, "ale");
  assert.equal(X.goodOf("a sword", goods)?.id, "sword");
});
