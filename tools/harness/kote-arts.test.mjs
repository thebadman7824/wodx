/* Powers pass p9 (B3750): each Kuei-jin Discipline power has a page, a cost and a result on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const KA = await import("../../modules/wodx-actions/scripts/kote-arts.js");
const K = await import("../../modules/wodx-actions/scripts/kote-rules.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");

test("every Discipline has five levels and every power a page and a known keyword (B3750)", () => {
  for ( const art of Object.keys(K.ARTS) ) {
    const lv = new Set(KA.POWERS.filter(p => p.art === art).map(p => p.l));
    assert.deepEqual([...lv].sort(), [1, 2, 3, 4, 5], `${art}: five levels`);
  }
  const ids = new Set();
  for ( const p of KA.POWERS ) {
    assert.ok(!ids.has(p.id), `${p.id}: unique`); ids.add(p.id);
    assert.ok(p.p >= 100 && p.p <= 127, `${p.name}: page`);
    assert.ok(E.KEYWORDS[p.spec.kw], `${p.name}: keyword ${p.spec.kw}`);
    const res = KA.artResults(p.id, 2);
    assert.ok(res.length, `${p.name}: results`);
    for ( const r of res ) assert.ok(E.KEYWORDS[r.key], `${p.name}: result keyword ${r.key}`);
    assert.ok(!/\b(she|her|hers|he|him|his)\b/i.test(p.fx), `${p.name}: neutral text`);
  }
});

test("a failed roll applies nothing, a power with no roll counts one success (B3750)", () => {
  assert.equal(KA.artResults("equilibrium-4-chi-interrupt", 0).length, 0);
  const dd = KA.artResults("yangprana-3-dragon-dance", 0);
  assert.equal(dd[0].key, "boost"); assert.equal(dd[0].out.label, "Dragon Dance");
  const cloud = KA.artResults("boneshintai-4-five-poison-cloud", 1)[0];
  assert.equal(cloud.out.levels, 6); assert.equal(cloud.out.type, "aggravated"); assert.equal(cloud.who, "all");
});

test("the spend form gets the Chi, pool and difficulty from the power (B3750)", () => {
  const p = KA.powerById("tapestry-3-chi-shaping");
  assert.deepEqual(KA.chiOf(p.cost), { kind: "", k: 1 });
  assert.equal(KA.diffOf(p, 4), 4);
  assert.equal(KA.poolOf(p.roll, (kind, k) => ({ perception: 3, crafts: 2 })[k] ?? 0), 5);
  assert.deepEqual(KA.chiOf(KA.powerById("yinprana-1-shrouded-moon").cost), { kind: "yin", k: 1 });
  assert.equal(KA.artKeyOf("Ghost-Flame Shintai"), "ghostflameshintai");
  assert.equal(KA.artKeyOf("Yang Prana"), "yangprana");
});
