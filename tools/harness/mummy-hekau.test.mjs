/* Powers pass p3 (B3745): every Hekau spell and ritual of the six paths says what it does and reaches the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MU = await import("../../modules/wodx-actions/scripts/mummy-rules.js");
const MH = await import("../../modules/wodx-actions/scripts/mummy-hekau.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");

test("every listed Hekau has a card, and every path has spells at every level (B3745)", () => {
  for ( const id of Object.keys(PK.LINE_KEYWORDS.mummy) ) assert.ok(MH.SPELLS[id], `${id} has no card`);
  for ( const p of Object.keys(MU.HEKAU) ) for ( let l = 1; l <= 5; l++ ) assert.ok(MH.spellsOf(p, 5).some(id => MH.SPELLS[id].level === l), `${p} ${l}`);
  for ( const [id, s] of Object.entries(MH.SPELLS) ) {
    assert.ok(s.name && s.name !== id, `${id}: name`);
    assert.ok(MU.HEKAU[s.path], `${id}: path`);
    assert.ok(["spell", "ritual"].includes(s.type), `${id}: type`);
    assert.ok(s.difficulty >= 2 && s.difficulty <= 10 && s.cost >= 0, `${id}: difficulty or cost`);
    for ( const f of ["fx", "lasts", "trait"] ) assert.ok(String(s[f]).length > 3, `${id}: ${f}`);
    assert.ok(s.spec && E.KEYWORDS[s.spec.kw], `${id}: keyword ${s.spec?.kw}`);
  }
  assert.deepEqual(MH.spellsOf("alchemy", 1).map(id => MH.SPELLS[id].level).filter(l => l > 1), [], "only the levels the path reaches");
});

test("tonics heal a set amount, poisons a set harm, lightning rolls ten dice, tables pick the duration (B3745)", () => {
  assert.equal(MH.hekauResults("potent-tonic", 1)[0].out.levels, 5);
  assert.equal(MH.hekauResults("simple-tonic", 4)[0].out.levels, 1);
  assert.equal(MH.hekauResults("mend-flesh", 3)[0].out.levels, 3, "Mend Flesh heals a level a success");
  const dp = MH.hekauResults("deadly-poison", 4)[0].out;
  assert.equal(dp.levels, 3); assert.equal(dp.type, "lethal");
  assert.equal(MH.hekauResults("greater-weather-magic", 1)[0].out.pool, 10);
  assert.equal(MH.hekauResults("eye-of-sekhmet", 3)[0].out.timed.seconds, 7 * 86400, "Eye of Sekhmet at 3 successes: a week");
  assert.equal(MH.hekauResults("simple-elixir", 2)[0].out.timed.seconds, 14400, "an elixir lasts a tori");
  assert.equal(MH.hekauResults("khaibits-embrace", 2)[0].out.condition, "immobilized");
  assert.deepEqual(MH.hekauResults("mend-flesh", 0), []);
  assert.match(MH.spellLine("cloud-of-smoke"), /occult \+ alchemy, difficulty 6; 1 Sekhem/);
});

test("the Hekau window names the spells and puts the effects on the card (B3745)", () => {
  const mu = fs.readFileSync(path.join(root, "modules/wodx-actions/scripts/mummy.js"), "utf8");
  assert.match(mu, /select name="named"/);
  assert.match(mu, /MH\.hekauResults\(fd\.named/);
  assert.match(mu, /kind: "effects"/);
});
