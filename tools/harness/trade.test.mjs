import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as TR from "../../modules/wodx-actions/scripts/trade-rules.js";
import * as SR from "../../modules/wodx-actions/scripts/social-rules.js";

const src = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("haggle: a tenth a success, three tenths at most, a botch costs a tenth", () => {
  assert.equal(TR.haggle(100, 0), 100);
  assert.equal(TR.haggle(100, 2), 80);
  assert.equal(TR.haggle(100, 9), 70);
  assert.equal(TR.haggle(100, 0, {botch: true}), 110);
  assert.equal(TR.haggle(50, 2, {selling: true}), 60);
  assert.equal(TR.haggle(50, 5, {selling: true, cap: 60}), 60);
  assert.equal(TR.haggle(50, 0, {selling: true, botch: true}), 45);
  assert.equal(TR.haggle(0, 3), 0);
});

test("attitude: hostile and hunted refuse, distrusted pay and are paid a tenth worse", () => {
  assert.equal(TR.willTrade(-2), false);
  assert.equal(TR.willTrade(-3), false);
  assert.equal(TR.willTrade(-1), true);
  assert.equal(TR.attitudeFactor(-1), 1.1);
  assert.equal(TR.attitudeFactor(-1, {selling: true}), 0.9);
  assert.equal(TR.attitudeFactor(2), 1);
});

test("shop rows: take and add keep counts in the Inside text", () => {
  const text = "silver pennies (7)\na loaf of bread\ntallow candles (3)";
  const rows = TR.shopRows(text);
  assert.deepEqual(rows.map(r => [r.name, r.count]), [["silver pennies", 7], ["a loaf of bread", 1], ["tallow candles", 3]]);
  assert.equal(TR.takeFromShop(text, 2, 2).text, "silver pennies (7)\na loaf of bread\ntallow candles");
  assert.equal(TR.takeFromShop(text, 1, 1).text, "silver pennies (7)\ntallow candles (3)");
  assert.equal(TR.takeFromShop(text, 0, 99).taken, 7);
  assert.equal(TR.addToShop(text, "A loaf of bread", 2), "silver pennies (7)\na loaf of bread (3)\ntallow candles (3)");
  assert.equal(TR.addToShop("", "a knife"), "a knife");
});

test("barter and what a trader gives", () => {
  assert.deepEqual(TR.barter(100, 60), {owe: 40, even: false});
  assert.equal(TR.barter(50, 80).owe, -30);
  const price = {each: 100, sell: 50, fence: 25};
  assert.equal(TR.offerFor(price), 50);
  assert.equal(TR.offerFor(price, {lifted: true}), 25);
  assert.equal(TR.offerFor(null), 0);
  assert.equal(TR.offerFor({each: 1, sell: 0, fence: 0}), 1);
  assert.equal(TR.offerFor({each: 0, sell: 0, fence: 0}), 0);
});

test("tradeable leaves out traits and powers", () => {
  const items = [{type: "Item", name: "a"}, {type: "Power", name: "b"}, {type: "Feature", name: "c"}, {type: "Melee Weapon", name: "d"}];
  assert.deepEqual(TR.tradeable(items).map(i => i.name), ["a", "d"]);
});

test("haggle preset: Manipulation with Finance, Commerce in the Dark Ages", () => {
  const p = TR.HAGGLE_PRESET.haggleNpc;
  assert.equal(p.diff, 6);
  assert.ok(p.alts.some(a => a[1] === "commerce"));
});

test("social acts map to stock lines", () => {
  for ( const a of SR.ACTS ) assert.ok(SR.STOCK_KIND[a.key], a.key);
});

test("With this person offers Trade, and the trade queue type is registered", () => {
  const s = src("modules/wodx-actions/scripts/social.js");
  assert.match(s, /btn\("trade"/);
  assert.match(s, /"wodx-actions\.trade"/);
  const t = src("modules/wodx-actions/scripts/trade.js");
  assert.match(t, /proposeOrApply\("wodx-actions\.trade"/);
  assert.match(t, /trade:noMoney/);
});
