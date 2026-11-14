import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The law of the Future Darkness (B3620-B3621) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-chronicle/scripts/law-future-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");
const P = await imp("modules/wodx-chronicle/scripts/law-punish-rules.mjs");

test("future: off the branch, the law of 2022 holds", () => {
  const a = L.lawOf("moravia", 2022), b = L.lawOf("moravia", 2070);
  assert.deepEqual({...b, year: 0}, {...a, year: 0});
  assert.equal(b.spec, false);
  assert.ok(!L.futureOn());
});

test("future: on the branch, the guesses lay on from 2023 and are marked", () => {
  const off = L.lawOf("moravia", 2045), on = L.lawOf("moravia", 2045, {future: true});
  assert.ok(on.spec && !off.spec);
  assert.ok(on.order.includes("algorithm") && on.order.includes("corporate") && on.crimes.includes("unlicensed-cyberware"));
  assert.ok(!L.lawOf("moravia", 2022, {future: true}).spec);
  assert.ok(L.lawOf("china", 2035, {future: true}).crimes.includes("low-score"));
  assert.ok(!L.lawOf("china", 2035, {future: true}).order.includes("corporate"));
  // the corporate war lapses
  assert.ok(L.lawOf("british-isles", 2052, {future: true}).warn.some(w => /Martial law/.test(w)));
  assert.ok(!L.lawOf("british-isles", 2060, {future: true}).warn.some(w => /Martial law/.test(w)));
  L.setFuture(true); assert.ok(L.lawOf("moravia", 2065).punish.includes("erasure")); L.setFuture(false);
  assert.ok(!L.lawOf("moravia", 2065).punish.includes("erasure"));
});

test("future: every row is after 2022 and names known ids", () => {
  const tables = {crimes: L.CRIMES, punish: L.PUNISH, order: L.ORDER, proof: L.PROOF};
  for ( const r of F.FUTURE_ROWS ) {
    assert.ok(r.from >= 2023 && (r.to == null || r.to >= r.from), r.note);
    for ( const part of [r.add, r.drop] ) for ( const [k, ids] of Object.entries(part ?? {}) ) if ( tables[k] ) for ( const id of ids ) assert.ok(id in tables[k], `${k}.${id}`);
    assert.doesNotMatch(r.note, /—/);
  }
  assert.ok(P.MARKS.erasure && P.TIERS.grave.includes("erasure"));
  for ( const k of ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant"] ) assert.ok(F.LINE_FUTURE[k], k);
  assert.match(src("modules/wodx-chronicle/scripts/law.mjs"), /setFuture\(rule\("futureBranch"\)\)/);
  assert.match(src("modules/wodx-chronicle/scripts/law.mjs"), /Speculation: /);
});
