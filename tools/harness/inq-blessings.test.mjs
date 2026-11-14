/* Inquisitor Blessings (B3755): every Blessing in Dark Ages: Inquisitor Chapter Five has a page, a roll, a cost and a result on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const IB = await import("../../modules/wodx-actions/scripts/inq-blessings.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const H = await import("../../modules/wodx-actions/scripts/hunter-rules.js");

test("every Blessing has a kind, a page, a known keyword and results (B3755)", () => {
  const ids = new Set();
  assert.ok(IB.BLESSINGS.length >= 90);
  for ( const b of IB.BLESSINGS ) {
    assert.ok(!ids.has(b.id), `${b.id}: unique`); ids.add(b.id);
    assert.ok(H.ENDOWMENT_KINDS.includes(b.kind), `${b.name}: kind`);
    assert.ok(b.p >= 170 && b.p <= 201, `${b.name}: page`);
    assert.ok(E.KEYWORDS[b.spec.kw], `${b.name}: keyword ${b.spec.kw}`);
    const res = IB.blessingResults(b.id, 2);
    assert.ok(res.length, `${b.name}: results`);
    for ( const r of res ) assert.ok(E.KEYWORDS[r.key], `${b.name}: result keyword ${r.key}`);
    assert.ok(!/\b(she|her|hers|he|him|his)\b/i.test(b.fx), `${b.name}: neutral text`);
    assert.ok(!/—/.test(b.fx), `${b.name}: no em-dash`);
  }
});

test("failure applies nothing; no-roll Blessings count one success; pools and Conviction (B3755)", () => {
  assert.equal(IB.blessingResults("lux-z", 0).length, 0);
  const lux = IB.blessingResults("lux-z", 3)[0];
  assert.equal(lux.out.levels, 3); assert.equal(lux.out.type, "lethal"); assert.equal(lux.who, "all");
  assert.equal(IB.blessingResults("blessing-of-years", 0)[0].key, "boost");
  const lit = IB.blessingResults("liturgy-w", 4)[0];
  assert.equal(lit.out.kind, "pool"); assert.equal(lit.out.pool, "willpower"); assert.equal(lit.out.points, 1);
  assert.equal(IB.blessingResults("ar-z", 2)[0].out.points, -2);
  assert.equal(IB.convictionGain(IB.blessingById("liturgy-f"), 5, { piety: 3 }), 3);
  assert.equal(IB.convictionGain(IB.blessingById("res-z"), 4, { zeal: 2 }), 2);
  assert.equal(IB.convictionGain(IB.blessingById("lux-z"), 4, {}), 0);
});

test("the window reads the roll from the entry (B3755)", () => {
  assert.deepEqual(IB.rollParts(IB.blessingById("gospel-z")), { attr: "charisma", trait: "zeal", sv: "zeal" });
  assert.deepEqual(IB.rollParts(IB.blessingById("noahs-favor")), { attr: "perception", trait: "animal ken", sv: "virtue" });
  assert.equal(IB.rollParts(IB.blessingById("sf5")).sv, "path");
  assert.equal(IB.blessingByName("Divine Liturgy")?.id, "liturgy-w");
  assert.equal(IB.blessingByName("Sunder")?.id, "sf1");
});
