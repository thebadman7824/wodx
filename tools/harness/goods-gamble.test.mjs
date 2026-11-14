import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, gambling with dice, cards and board games (B3910) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const B = await imp("modules/wodx-library/scripts/gamble-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");

test("dice, cards and board games can be played for a stake, and Gamble does something", () => {
  assert.equal(U.ABILITIES.gamble.effect, "gamble");
  for ( const n of ["a pair of gaming dice", "a worn deck of cards", "a carved chess set", "a pack of playing cards", "a backgammon set"] ) {
    assert.ok(U.abilitiesOf(G.GOODS.find(g => g.name === n)).includes("gamble"), n);
  }
  assert.ok(!U.abilitiesOf(G.GOODS.find(g => g.name === "a teddy bear")).includes("gamble"));
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /case "gamble": return GU\.gamble\(actor, item\)/);
});

test("the stake is a share of what they carry", () => {
  assert.equal(B.stakeOf(200, "small"), 10);
  assert.equal(B.stakeOf(200, "big"), 100);
  assert.equal(B.stakeOf(3, "small"), 1, "at least the smallest coin");
  assert.equal(B.stakeOf(0, "big"), 0);
  assert.equal(B.poolOf(3, 1, 2), 5, "Gambling counts in place of Streetwise when better");
});

test("against the house and against another player", () => {
  assert.equal(B.gambleResult({successes: 2}, null, 10).delta, 10);
  assert.equal(B.gambleResult({successes: 1}, null, 10).delta, 0);
  assert.equal(B.gambleResult({successes: 0}, null, 10).delta, -10);
  assert.equal(B.gambleResult({successes: 0, botch: true}, null, 10).delta, -20);
  assert.equal(B.gambleResult({successes: 3}, {successes: 1}, 10).delta, 10);
  assert.equal(B.gambleResult({successes: 1}, {successes: 2}, 10).delta, -10);
  assert.equal(B.gambleResult({successes: 2}, {successes: 2}, 10).delta, 0);
});

test("gamble: money moves through Storyteller's purse api (api.upkeep.money)", () => {
  const f = src("modules/wodx-library/scripts/gamble-use.mjs"), st = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(f, /api\?\.upkeep\?\.money/);
  assert.match(st, /upkeep: \{[\s\S]*?money: \{of: Money\.moneyOf[\s\S]*?transfer: Money\.transfer/);
});
