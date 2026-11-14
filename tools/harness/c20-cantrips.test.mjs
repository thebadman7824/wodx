/* Powers pass p2 (B3744): the ninety named cantrips of C20 say what they do and reach the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const C = await import("../../modules/wodx-actions/scripts/c20-rules.js");
const CA = await import("../../modules/wodx-actions/scripts/c20-arts.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");

test("five named cantrips for each of the eighteen Arts, each with text, duration, type and a known keyword (B3744)", () => {
  for ( const art of Object.keys(C.ARTS) ) assert.deepEqual(CA.cantripsOf(art).map(c => c.level), [1, 2, 3, 4, 5], art);
  for ( const [id, c] of Object.entries(CA.CANTRIPS) ) {
    assert.ok(c.name && c.name !== id, `${id} has no name`);
    for ( const f of ["fx", "lasts", "type"] ) assert.ok(String(c[f] ?? "").length > 3, `${id}: no ${f}`);
    assert.ok(/Chimerical|Wyrd/.test(c.type), `${id}: type`);
    if ( c.spec ) assert.ok(E.KEYWORDS[c.spec.kw], `${id}: unknown keyword ${c.spec.kw}`);
  }
  assert.deepEqual(CA.cantripsOf("wayfare", 2).map(c => c.name), ["Hopscotch", "Quicksilver"], "only the levels the Art reaches");
});

test("successes pick the duration from the cantrip's table, Glamour scales the Glamour ones (B3744)", () => {
  const vm = CA.cantripResults("veiled-mind", 3, {glamour: 4});
  assert.equal(vm[0].key, "veil");
  assert.equal(vm[0].out.timed.seconds, 86400, "Veiled Mind at 3 successes lasts a day");
  const wr = CA.cantripResults("wind-runner", 1, {glamour: 3});
  assert.deepEqual(wr[0].out.timed, {kind: "rounds", rounds: 3}, "Wind Runner at 1 success: Glamour turns");
  const st = CA.cantripResults("stasis", 2, {});
  assert.equal(st[0].out.condition, "immobilized");
  assert.equal(st[0].out.timed.seconds, 86400);
  assert.deepEqual(CA.cantripResults("stasis", 0), []);
});

test("Holly-Strike rolls Willpower + Glamour + extra successes in lethal dice through the soak window (B3744)", () => {
  const hs = CA.cantripResults("holly-strike", 3, {willpower: 5, glamour: 4});
  assert.equal(hs[0].out.pool, 11);
  assert.equal(hs[0].out.type, "lethal");
  const lv = CA.cantripResults("lord-of-levin", 2, {});
  assert.equal(lv[0].out.pool, 6);
  assert.equal(lv[0].out.type, "aggravated");
  const fx = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/effects.js"), "utf8");
  assert.match(fx, /mode: o\.pool \? "pool" : "levels"/, "a pool is rolled as damage dice");
  const c20 = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/c20.js"), "utf8");
  assert.match(c20, /select name="power"/, "Cast a cantrip names the cantrips");
});
