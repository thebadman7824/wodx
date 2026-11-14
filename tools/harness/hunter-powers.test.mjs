/* Powers pass p8 (B3749): Hunter edges, hedge sorcery and Repel put their effects on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = await import("../../modules/wodx-actions/scripts/reckoning-rules.js");
const H = await import("../../modules/wodx-actions/scripts/hunter-rules.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const src = f => fs.readFileSync(path.join(root, "modules/wodx-actions/scripts", f), "utf8");

test("every HtR edge has keywords under path-id, and Use an edge posts them (B3749)", () => {
  for ( const e of R.EDGES ) assert.ok(PK.keywordsOf("htr", `${e.path}-${e.id}`), `${e.path}-${e.id}`);
  assert.match(src("reckoning.js"), /EF\.powerPlan\(actor, \{ set: "htr", id: `\$\{e\.path\}-\$\{e\.id\}`/);
  assert.match(src("reckoning.js"), /fd\.resisted && !fd\.won\) \? 0 : r\.successes/, "a lost resisted roll applies nothing");
});

test("every hedge path has an outcome once the spell works, and none before (B3749)", () => {
  assert.deepEqual(Object.keys(H.SORCERY_FX).sort(), Object.keys(H.SORCERY).sort());
  for ( const k of Object.keys(H.SORCERY) ) {
    const res = H.sorceryResults(k, {top: 2, successes: 3, need: 2, rating: 3});
    assert.ok(res.length, k);
    for ( const r of res ) assert.ok(E.KEYWORDS[r.key], `${k}: ${r.key}`);
    assert.equal(H.sorceryResults(k, {top: 2, successes: 1, need: 2, rating: 3}).length, 0, `${k}: short of the need`);
  }
  assert.equal(H.sorceryResults("hellfire", {top: 1, successes: 4, need: 1, rating: 2})[0].out.pool, 4, "damage successes stop at the rating");
  assert.equal(H.sorceryResults("healing", {top: 3, successes: 3, need: 3, rating: 3})[0].out.levels, 3);
  assert.match(src("hunter.js"), /EF\.planOf\(actor, H\.sorceryResults\(key/);
});

test("Repel bars the creature: a turn of flight a success in the Dark Ages, the scene otherwise (B3749)", () => {
  assert.deepEqual(H.repelResults("da20", 3)[0].out.timed, {kind: "rounds", rounds: 3});
  assert.deepEqual(H.repelResults("hh2", 2)[0].out.timed, {kind: "scene"});
  assert.equal(H.repelResults("hh2", 0)[0].key, "banish");
  assert.match(src("hunter.js"), /H\.repelResults\(rules, r\.successes/);
});
