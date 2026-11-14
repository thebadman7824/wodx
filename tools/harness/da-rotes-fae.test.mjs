/* Powers pass p11 (B3752): more Dark Ages rotes act on the effects card, and a cantrip's keywords do too. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const DAE = await import("../../modules/wodx-actions/scripts/mage-da-effects.js");
const FX = await import("../../modules/wodx-actions/scripts/fae-da.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");

test("only extended rituals, journeys and judgements stay the Storyteller's call (B3752)", () => {
  const specs = Object.values(DAE.DA_EFFECTS);
  assert.ok(specs.filter(s => s.kind === "st").length <= 17);
  for ( const s of specs ) assert.ok(E.KEYWORDS[s.kw], `keyword ${s.kw}`);
  const wrath = DAE.outcomesOf(DAE.DA_EFFECTS.wrathapollo, {key: "harm", label: "Wrath of Apollo"}, 2);
  assert.equal(wrath[0].out.levels, 6); assert.equal(wrath[0].who, "all"); assert.equal(wrath[0].ask, true);
  const pack = DAE.outcomesOf(DAE.DA_EFFECTS["g-summonpack"], {key: "summon", label: "Summon the Pack"}, 3)[0];
  assert.equal(pack.out.kind, "timed"); assert.equal(pack.who, "self");
});

test("a cantrip line carries what it does, and a cantrip that takes puts it on the card (B3752)", () => {
  const [c, d] = FX.parseCantrips("Night 1: Hush (manipulation) [veil]\nDay 2: Sunflash [light, harm, nonsense]");
  assert.deepEqual(c.kw, ["veil"]); assert.equal(c.trait, "manipulation");
  assert.deepEqual(d.kw, ["light", "harm"]); assert.equal(d.trait, "");
  assert.equal(FX.cantripLine(c), "Night 1: Hush (manipulation) [veil]");
  assert.equal(FX.parseCantrips("Night 1: Hush (manipulation)")[0].kw, undefined);
  const res = FX.cantripResults(["veil"], 2, {name: "Hush"});
  assert.equal(res[0].key, "veil"); assert.equal(res[0].who, "self");
  assert.equal(FX.cantripResults(["harm"], 2, {name: "Sunflash"}).length, 0, "harm needs a target");
  assert.equal(FX.cantripResults(["harm"], 2, {name: "Sunflash", hasTarget: true})[0].key, "harm");
});
