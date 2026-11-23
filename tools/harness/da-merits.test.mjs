import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {MERITS_FLAWS, SHOWS} from "../../modules/wodx-chronicle/data/trait-effects.mjs";
import {daTable, DA_MERITS_FLAWS} from "../../modules/wodx-chronicle/data/trait-lines.mjs";
import {meritOptions} from "../../modules/wodx-creation/scripts/wizard-rules.mjs";
import {flawPowerDiff} from "../../modules/wodx-actions/scripts/kindred-rules.js";

// B7665: the 80 Merits and Flaws of V20 Dark Ages (printed pp. 420-427), checked one by one in the full check.
test("a Dark Ages vampire is offered the book's 80, at the book's costs", () => {
  assert.equal(Object.keys(DA_MERITS_FLAWS).length, 80);
  const t = daTable(MERITS_FLAWS);
  assert.equal(t.length, 80, "every key has a row");
  const by = k => t.find(x => x.key === k);
  assert.equal(by("child").cost, "4"); assert.equal(by("lucky").cost, "1-5");
  assert.equal(by("unbondable").cost, "3"); assert.equal(by("cant-cross-running-water").cost, "4");
  const o = meritOptions("vtda20", MERITS_FLAWS);
  assert.equal(o.length, 80);
  const names = new Set(o.map(x => x.name));
  for ( const n of ["Unclean", "Impaired Sense", "Ethical Prohibition", "Debt of Gratitude", "Marked for Death", "Outspoken Heretic", "Nameless", "Unlucky", "Thirteenth Generation", "Harbinger of the Abyss", "Rivalry", "Oathbreaker", "Apostate"] )
    assert.ok(names.has(n), n);
  assert.ok(!names.has("Eat Food"), "a V20-only Merit is not offered in the Dark Ages");
  assert.deepEqual(o.find(x => x.name === "Ethical Prohibition").choices, [2, 4]);
  assert.ok(meritOptions("v20", MERITS_FLAWS).some(x => x.name === "Eat Food"), "V20 is unchanged");
});

test("the new Flaws do what a system can read", () => {
  assert.ok(MERITS_FLAWS.find(x => x.key === "impaired-sense").effects.some(e => e.diff === 3));
  assert.ok(MERITS_FLAWS.find(x => x.key === "harbinger-of-the-abyss").effects.some(e => e.diff === -2));
  assert.ok(SHOWS.unclean && SHOWS["harbinger-of-the-abyss"]);
  assert.deepEqual(flawPowerDiff(["Thirteenth Generation"]), {diff: 1, part: "Thirteenth Generation +1"});
  assert.equal(flawPowerDiff(["Vulgar"]).diff, 0);
});
