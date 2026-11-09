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
  assert.match(R.coinsFor(1197).coin, /pfennig/);
  assert.match(R.coinsFor(1600).coin, /thaler/);
  assert.match(R.coinsFor(1900).coin, /gold mark/);
  assert.match(R.coinsFor(1999).coin, /Deutsche Mark/);
  assert.match(R.coinsFor(1700, "english").coin, /guinea/);
  assert.equal(R.coinsFor(1700, "nowhere").region, "german");
  assert.equal(R.monthsBetween(0, 61 * R.DAY), 2);
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
