import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The no-effect audit, weapon fittings and everyday arms in the fight (B3806) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")));
const combat = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");

test("WoDX Combat turns fittings into dice and difficulty", () => {
  const far = R.fittingsPlan({far: 2, diff: -1, smart: -1, silenced: true}, {range: "double", smartLink: true});
  assert.equal(far.fitDice, 2); assert.equal(far.fitDiff, -2); assert.ok(far.silenced);
  assert.equal(R.fittingsPlan({far: 2}, {range: "short"}).fitDice, 0);
  assert.equal(R.fittingsPlan({smart: -1}, {smartLink: false}).fitDiff, 0);
  assert.equal(R.fittingsPlan({}, {bow: true, wet: true}).wetString, 1);
  assert.equal(R.fittingsPlan({wax: true}, {bow: true, wet: true}).wetString, 0);
  assert.ok(R.fittingsPlan({light: true}, {blind: true}).blindCancelled);
  const p = R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6, fitDice: 2, fitDiff: -1, wetString: 1});
  assert.equal(p.dice, 7); assert.equal(p.difficulty, 6);
  assert.equal(R.fightNoise({name: "Colt revolver", ranged: true, silenced: true}), "quiet");
  assert.equal(R.fightNoise({name: "Colt revolver", ranged: true}), "loud");
});

test("Combat lists the Library's everyday arms and carries out what they do", () => {
  assert.match(combat, /A\.weaponEntry\(i\)/);
  assert.match(combat, /async function armsAftermath/);
  assert.match(combat, /fitDice: fp\.fitDice/);
  assert.match(combat, /atHand/);
});
