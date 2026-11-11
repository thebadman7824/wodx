import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Money by era (Storyteller 0.14.0) and Consensus by era (Actions 3.18.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");
const C = await imp("modules/wodx-actions/scripts/consensus-rules.js");

test("money: at home a character lives at their rating", () => {
  for ( let d = 0; d <= 5; d++ ) assert.equal(R.livingAs({dots: d}).level, d);
  assert.equal(R.lifestyle(9).dots, 5);
});

test("money: away from home, by the books' steps", () => {
  assert.equal(R.livingAs({dots: 2, away: 100}).level, 1);
  assert.equal(R.livingAs({dots: 2, away: 200}).level, 0);
  assert.equal(R.livingAs({dots: 3, away: 5000}).level, 1);
  assert.equal(R.livingAs({dots: 5, away: 5000}).level, 3);
  assert.equal(R.livingAs({dots: 1, away: 1}).house, true);
  assert.equal(R.nextDrop({dots: 2, away: 170}), 10);
});

test("money: a neglected fortune keeps comfort for a year, then less", () => {
  assert.equal(R.livingAs({dots: 4, neglected: 200}).level, 3);
  assert.equal(R.livingAs({dots: 4, neglected: 400}).level, 2);
  assert.equal(R.livingAs({dots: 5, neglected: 400}).level, 2);
  // Only 4 and 5 dots are hurt by neglect
  assert.equal(R.livingAs({dots: 3, neglected: 400}).level, 3);
  assert.equal(R.nextDrop({dots: 4, neglected: 350}), 15);
});

test("money: coins of the day follow history", () => {
  assert.match(R.coinsFor(1197, "german").coin, /pfennig/);
  assert.match(R.coinsFor(1600, "german").coin, /thaler/);
  assert.match(R.coinsFor(1900, "german").coin, /gold mark/);
  assert.match(R.coinsFor(1999, "german").coin, /Deutsche Mark/);
  assert.match(R.coinsFor(1700, "english").coin, /guinea/);
  assert.equal(R.coinsFor(1700, "nowhere").region, "moravian");
  assert.equal(R.monthsBetween(0, 61 * R.DAY), 2);
  assert.match(R.coinsFor(1400).coin, /Prague groschen/);
  assert.match(R.coinsFor(1925).coin, /Czechoslovak koruna/);
});

test("consensus: the age by year, M20 with no year", () => {
  assert.equal(C.ageFor(1197).key, "dark");
  assert.equal(C.ageFor(1466).key, "crusade");
  assert.equal(C.ageFor(1699).key, "crusade");
  assert.equal(C.ageFor(1890).key, "ascension");
  assert.equal(C.ageFor(null).key, "ascension");
  assert.equal(C.WORDS.crusade.coincidental, "Casual");
});

test("consensus: in the Crusade a stranger's magick is vain", () => {
  assert.equal(C.suggestKind({age: "crusade", style: "Hermetic"}).kind, "coincidental");
  assert.equal(C.suggestKind({age: "crusade", style: "Taoist alchemy"}).kind, "coincidental");
  assert.equal(C.suggestKind({age: "crusade", style: "Taoist"}).kind, "vulgar");
  assert.equal(C.suggestKind({age: "crusade", style: "Hermetic", place: "maya, sacrifice"}).kind, "vulgar");
  assert.equal(C.suggestKind({age: "crusade", style: ""}).kind, null);
  assert.equal(C.suggestKind({age: "dark", style: "Hermetic"}).kind, null);
});

test("consensus: M20 Reality Zones only when the place decides", () => {
  assert.equal(C.suggestKind({age: "ascension", style: "Buddhist", place: "buddhist, temple", zones: "zone"}).kind, "coincidental");
  assert.equal(C.suggestKind({age: "ascension", style: "Hermetic", place: "buddhist", zones: "zone"}).kind, "vulgar");
  assert.equal(C.suggestKind({age: "ascension", style: "Hermetic", place: "buddhist", zones: "world"}).kind, null);
});

test("consensus: Fortune Dice, Bane over Boon, purifying", () => {
  assert.equal(C.fortuneDice(0), 1);
  assert.equal(C.fortuneDice(10), 3);
  assert.equal(C.readFortune([4, 10]), "boon");
  assert.equal(C.readFortune([1, 10]), "bane");
  assert.equal(C.readFortune([5]), null);
  assert.equal(C.purifyDays(6), 6);
  assert.match(C.fortuneSize(16), /catastrophe/);
});

test("wiring: settings, api, menus, the monthly card", () => {
  const m = src("modules/wodx-storyteller/scripts/main.mjs"), z = src("modules/wodx-actions/scripts/m20.js"), a = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /Money\.registerMoneyHooks\(\)/);
  assert.match(m, /money: \{of: Money\.moneyOf/);
  assert.match(a, /"consensusEra"/);
  assert.match(a, /"realityZones"/);
  assert.match(a, /m20Purify/);
  assert.match(z, /fortuneRoll/);
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /api:m20Purify/);
  assert.match(src("modules/wodx-storyteller/scripts/money.mjs"), /searchBox\("table\.wst-money-t"/);
});

/* Real money (Storyteller 0.23.0, B598) */
const G = await imp("modules/wodx-library/data/goods.mjs");

test("money: Moravia's money follows history, other lands have their own", () => {
  assert.equal(R.moneyFor(1197).id, "denar");
  assert.equal(R.moneyFor(1400).id, "grosch");
  assert.equal(R.moneyFor(1700).id, "zlaty-cm");
  assert.equal(R.moneyFor(1880).id, "zlaty-oe");
  assert.equal(R.moneyFor(1913).id, "krone");
  assert.equal(R.moneyFor(1930).id, "kc-1");
  assert.equal(R.moneyFor(1995).id, "czk");
  assert.equal(R.moneyFor(2050).id, "eb");
  assert.equal(R.moneyFor(1995, "german").id, "dm");
  assert.equal(R.moneyFor(1700, "american").id, "lsd");
  assert.equal(R.moneyFor(1880, "american").id, "usd");
  assert.equal(R.moneyFor(1300, "french").id, "pfennig");
  assert.equal(R.moneyFor(1197).banks, false);
  assert.equal(R.moneyFor(1700, "english").banks, true);
  // Every money covers its years without gaps, from the prologue to the far future
  for ( const [k, r] of Object.entries(R.MONIES) ) for ( let y = -3000; y <= 2200; y += 7 ) assert.ok(R.moneyFor(y, k).wage.length, `${k} ${y}`);
});

test("money: the allowance is the Wild West's pay by dot, raised by half", () => {
  // 1880s United States: a one-dot wage of $45 a month (V20 The Wild West pdf 86)
  assert.equal(R.wageAt(1880, "american"), 4500);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(d => R.allowance(d, 1880, "american") / 100), [27, 67.5, 168.75, 472.5, 1350, 3375]);
  // World of Future Darkness: a tenth of the article's starting cash, raised by half
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(d => R.allowance(d, 2050)), [120, 300, 750, 1500, 3000, 7500]);
  assert.ok(R.allowance(3, 1197) > R.allowance(1, 1197));
});

test("money: prices come from the value tiers, with a spread, sale and haggling", () => {
  // Sorcerers Crusade Companion pdf 36: an inn meal at 5-6 pence in 1630, a horse at 30 shillings
  const meal = R.priceOf({name: "an inn meal", value: 1}, 1630, "english");
  assert.ok(meal >= 3 * 4 && meal <= 8 * 4, `meal ${meal}`);
  const wage = R.wageAt(1630, "english");
  assert.ok(30 * 48 > wage && 30 * 48 < wage * 6, "a horse sits between Costly and Dear");
  for ( const n of ["a", "bb", "a bronze coin", "a sack of grain"] ) { const s = R.spread(n); assert.ok(s >= 0.7 && s <= 1.4); }
  assert.equal(R.spread("x"), R.spread("x"));
  const cig = G.GOODS.find(g => g.name === "a cigarette");
  const each = R.priceOf({...cig, value: 0}, 1995), pack = R.priceOf({...cig, value: 0}, 1995, "moravian", {perUnit: false});
  assert.ok(each * 10 < pack, "one cigarette costs a share of the usual stack");
  assert.equal(R.priceOf({name: "x", value: 2}, 1995, "moravian", {book: 777}), 777);
  assert.equal(R.sellPrice(100), 50);
  assert.equal(R.sellPrice(100, {fence: true}), 25);
  assert.equal(R.haggled(100, 2), 80);
  assert.equal(R.haggled(100, 9), 70);
  assert.equal(R.haggled(100, 0, {botch: true}), 110);
  assert.equal(R.creditLimit(2, 1197), 0);
  assert.equal(R.creditLimit(2, 1995), 2 * R.allowance(2, 1995));
});

test("money: amounts read as coins, savings keep their worth, missed months are paid", () => {
  assert.equal(R.formatMoney(90, "zlaty-cm"), "1 gulden 30 kreuzer");
  assert.equal(R.formatMoney(1, "denar"), "1 half-denar");
  assert.equal(R.formatMoney(0, "czk"), "0 haléřů");
  assert.equal(R.formatMoney(2 * 960 + 3 * 48 + 2 * 4 + 1, "lsd"), "2 pounds 3 shillings 2 pence 1 farthing");
  assert.equal(R.mainUnits(12345, R.moneyFor(1995)), 123.45);
  const saved = R.convertSavings(R.wageAt(1500), 1500, 1700);
  assert.equal(saved, R.wageAt(1700));
  assert.equal(R.monthsToPay(null, 40), 1);
  assert.equal(R.monthsToPay(38, 40), 2);
  assert.equal(R.monthsToPay(0, 400), 12);
  assert.equal(R.monthsToPay(40, 40), 0);
});
