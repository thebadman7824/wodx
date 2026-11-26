import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B7132: the night's temper moves the oracle's odds a step; a 10 or a 1 weaves a Threads of Fate storyline for the
   approval queue. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const W = await import(pathToFileURL(join(root, "modules/wodx-rules/solo/world-rules.mjs")));

test("Pressure makes bad news likelier, a rest good news, a steady night leaves the odds alone", () => {
  assert.equal(W.shiftOdds("even", "pressure", "bad").odds, "likely");
  assert.equal(W.shiftOdds("even", "pressure").odds, "likely", "neither leans with the night");
  assert.equal(W.shiftOdds("even", "pressure", "good").odds, "unlikely");
  assert.equal(W.shiftOdds("even", "rest", "bad").odds, "unlikely");
  assert.equal(W.shiftOdds("even", "rest", "good").odds, "likely");
  assert.deepEqual(W.shiftOdds("likely", "steady", "bad"), {odds: "likely", from: "likely", step: 0, why: ""});
  assert.equal(W.shiftOdds("sure", "pressure").odds, "sure", "the odds stop at the ends");
  assert.equal(W.shiftOdds("hardly", "rest").odds, "hardly");
  assert.equal(W.shiftOdds("hardly", "rest").why, "");
  assert.equal(W.shiftOdds("even", "pressure", "bad").why, "A night under pressure: Even odds becomes Likely");
  assert.equal(W.shiftOdds("nonsense", "pressure", "nonsense").from, "even");
});

test("A 10 or a 1 turns the night, at any odds", () => {
  assert.deepEqual([1, 2, 5, 9, 10].map(W.turnsTheNight), [true, false, false, false, true]);
});

test("The seat reads the director's temper, shows the shift and sends a storyline to the approval queue", () => {
  const m = src("modules/wodx-solo/scripts/world.mjs");
  assert.match(m, /import \{temperOf\} from "\.\.\/\.\.\/wodx-rules\/solo\/director-rules\.mjs";/);
  assert.match(m, /const shift = W\.shiftOdds\(W\.ODDS\[odds\] \? odds : "even", temper, tone\);/);
  assert.match(m, /wsolo-shift/);
  assert.match(m, /const fate = turns \? await turnTheNight\(actor, q, answer\) : null;/);
  assert.match(m, /return await T\.run\(\{force: true, why: "oracle"\}\);/);
  assert.match(m, /name="tone"/);
  // A forced weave always goes to the approval queue, never straight open
  const t = src("modules/wodx-storyteller/scripts/threads.mjs");
  assert.match(t, /if \( mode\(\) === "auto" && !force \) \{ await openStory\(story\);/);
  assert.match(t, /else await chron\(\)\?\.propose\?\.\(\{type: TYPE/);
  assert.match(t, /export async function addHook\(actorId, text, weight = 2\)/);
});
