import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Taxes on the month's upkeep (B3616-B3617) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const T = await imp("modules/wodx-chronicle/scripts/law-tax-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");
const H = await imp("modules/wodx-chronicle/scripts/law-heat-rules.mjs");

test("taxes: the usual share changes with the age and the land", () => {
  assert.equal(T.shareFor("latin", 1197), 0.15);
  assert.equal(T.shareFor("latin", 1990), 0.35);
  assert.equal(T.shareFor("japanese", 1700), 0.4);
  assert.ok(T.shareFor("north", 1500) < T.shareFor("latin", 1500));
  for ( const [f, rows] of Object.entries(T.SHARE) ) for ( const [, s] of rows ) assert.ok(s > 0 && s < 1, f);
});

test("taxes: levies are dated and placed", () => {
  assert.equal(T.taxOf("latin", "moravia", 1600).levy, 0);
  const tw = T.taxOf("latin", "moravia", 1630);
  assert.ok(tw.levies.some(l => l.id === "thirty-years") && tw.crushing);
  assert.ok(!T.taxOf("latin", "iberia", 1630).levies.some(l => l.id === "thirty-years"));
  assert.ok(T.taxOf("common", "british-isles", 1380).crushing);
  assert.ok(T.taxOf("chinese", "china", 1916).levies.some(l => l.id === "war-1914"));
  assert.ok(T.taxOf("latin", "moravia", 1942).levy > 0 && !T.taxOf("latin", "moravia", 1942).crushing);
  for ( const l of T.LEVIES ) {
    assert.ok(l.from <= l.to && l.to <= 2022 && l.extra > 0 && l.extra <= 0.5, l.id);
    for ( const r of l.regions ?? [] ) assert.ok(r in L.REGION_FAMILY, r);
  }
  assert.ok(T.taxOf("latin", "moravia", 1630).levy <= 0.5);
});

test("taxes: dodging keeps the usual share, paying takes the levy", () => {
  const tax = {share: 0.2, levy: 0.1};
  assert.deepEqual(T.monthSums(800, tax), {kept: 0, levy: 80});
  assert.deepEqual(T.monthSums(800, tax, {dodge: true}), {kept: 200, levy: 0});
  assert.deepEqual(T.monthSums(0, tax, {dodge: true}), {kept: 0, levy: 0});
});

test("taxes: the records and the law catch a dodger, a collector's seat hides one", () => {
  const law = {catch: 0.3};
  const old = T.catchChance(law, "latin", 1197), modern = T.catchChance(law, "latin", 2010);
  assert.ok(modern > old);
  assert.ok(T.catchChance(law, "latin", 2010, {collector: 3}) < modern);
  assert.ok(T.catchChance({catch: 1}, "latin", 2020) <= 0.5 && T.catchChance({catch: 0}, "north", 0) >= 0.01);
  assert.match(T.caughtWords("latin", 1197), /reeve/);
});

test("taxes: a crushing levy weighs on the towns, a light one barely", () => {
  assert.equal(T.townTaxFrom({crushing: false, levy: 0}), 0);
  assert.equal(T.townTaxFrom({crushing: false, levy: 0.15}), 0.15);
  assert.equal(T.townTaxFrom({crushing: true, levy: 0.1}), 0.8);
  assert.equal(T.townTaxFrom({crushing: true, levy: 0.3}), 1.6);
  assert.equal(T.townTaxFrom(null), 0);
  assert.match(src("modules/wodx-storyteller/scripts/towns.mjs"), /townTaxFrom\(law\.here\(regionOfMarket\(m, town\)/);
});

test("taxes: a caught dodger is a deed for the law's heat", () => {
  assert.equal(H.GRAVITY.tax, 2);
  assert.ok(H.DEED_WORDS.tax);
});

test("taxes: every line has a hook, and the wiring is in place", () => {
  for ( const k of ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant"] ) assert.ok(T.LINE_TAX[k], k);
  assert.match(src("modules/wodx-chronicle/scripts/main.mjs"), /registerTaxHooks\(\)/);
  assert.match(src("modules/wodx-chronicle/scripts/law-tax.mjs"), /Hooks\.on\("wodxMonthPaid"/);
  assert.match(src("modules/wodx-storyteller/scripts/money.mjs"), /wodxMonthPaid", \{month, months: .*paid: /);
  assert.match(src("modules/wodx-chronicle/scripts/law.mjs"), /playerTax\(who/);
});
