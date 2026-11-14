/* Powers pass p7 (B3748): every Orpheus Horror says what each level of Vitality does and puts it on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const O = await import("../../modules/wodx-actions/scripts/orpheus-rules.js");
const OH = await import("../../modules/wodx-actions/scripts/orpheus-horrors.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");

test("every Horror has six level lines, a page and results with known keywords (B3748)", () => {
  assert.deepEqual(Object.keys(OH.HORROR_FX).sort(), Object.keys(O.HORRORS).sort());
  for ( const [k, h] of Object.entries(OH.HORROR_FX) ) {
    assert.equal(h.levels.length, 6, `${k}: six levels`);
    assert.match(h.page, /^pp\. \d+-\d+$/, `${k}: page`);
    for ( let v = 0; v <= 5; v++ ) {
      const res = OH.horrorResults(k, v, 3, {name: k});
      assert.ok(res.length, `${k} at ${v}: results`);
      for ( const r of res ) assert.ok(E.KEYWORDS[r.key], `${k} at ${v}: keyword ${r.key}`);
    }
  }
});

test("Vitality sets the size of the effect (B3748)", () => {
  const w0 = OH.horrorResults("wail", 0, 4)[0], w3 = OH.horrorResults("wail", 3, 4)[0];
  assert.equal(w0.key, "sway"); assert.equal(w0.out.successes, 1, "zero Vitality lets one success count");
  assert.equal(w3.key, "harm"); assert.equal(w3.out.levels, 4);
  assert.deepEqual(OH.horrorResults("juggernaut", 2, 0)[0].out.timed, {kind: "rounds", rounds: 3});
  assert.equal(OH.horrorResults("puppetry", 1, 5)[0].out.duration, "one minute", "one Vitality caps the hold at two successes");
  assert.equal(OH.horrorResults("witchsnimbus", 4, 2).find(r => r.key === "harm").out.levels, 5, "the bolt: four Vitality and two successes make five levels");
  assert.equal(OH.horrorResults("wail", 2, 0).length, 0, "a failed roll does nothing");
  assert.ok(OH.horrorResults("stormwending", 1, 0).length, "no roll needed");
});

test("the Horror window fills the pool and posts the level line and effects (B3748)", () => {
  const src = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/orpheus.js"), "utf8");
  assert.match(src, /import \* as OH from "\.\/orpheus-horrors\.js"/);
  assert.match(src, /EF\.planOf\(actor, OH\.horrorResults\(hk, k, got/);
  assert.match(src, /describe\(root, true\)/);
});
