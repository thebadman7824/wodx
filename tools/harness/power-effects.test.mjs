import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 4 (Actions 3.33.0): a Discipline or Gift roll puts the power's keywords on the effects card */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PW = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/power-effects.js")));
const E = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/effects-rules.js")));
const PK = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/power-keywords.js")));
const src = p => readFileSync(join(root, p), "utf8");

test("a power's keywords come from the data set, then the line list by name", () => {
  const disc = PW.powerKeywords("disc", "abombwe-predators-communion");
  assert.ok(disc?.keywords.length);
  const byName = Object.entries(PK.LINE_KEYWORDS.w20)[0];
  assert.ok(PW.powerKeywords("gift", "not-in-the-library", byName[1].n ?? byName[0], "w20"));
  assert.equal(PW.powerKeywords("gift", "not-in-the-library", "Nothing by this name", "w20"), null);
});

test("the successes are the strength; passive powers and failed rolls do nothing", () => {
  const {results} = PW.powerOutcomes({keywords: ["ward"], passive: false}, 3, {label: "Shield", hasTarget: false});
  assert.equal(results.length, 1);
  assert.equal(results[0].who, "self");
  assert.match(results[0].out.label, /^Shield: /);
  assert.deepEqual(PW.powerOutcomes({keywords: ["ward"], passive: true}, 3).results, []);
  assert.deepEqual(PW.powerOutcomes({keywords: ["ward"]}, 0).results, []);
});

test("a hostile keyword with no target is dropped, never turned on the user", () => {
  const none = PW.powerOutcomes({keywords: ["harm", "sense"]}, 2, {hasTarget: false});
  assert.deepEqual(none.results.map(r => r.key), ["sense"]);
  assert.deepEqual(none.skipped, ["Harm"]);
  const aimed = PW.powerOutcomes({keywords: ["harm"]}, 2, {hasTarget: true});
  assert.equal(aimed.results[0].who, "one");
  for ( const k of [...PW.NEEDS_TARGET, ...PW.ON_SELF] ) assert.ok(E.KEYWORDS[k], k);
});

test("the card's own routing keeps mind keywords and player characters in the queue", () => {
  assert.equal(E.route("sway", {self: false, playerCharacter: false, count: 1}), "queue");
  assert.equal(E.route("ward", {self: true, playerCharacter: true, count: 1}), "auto");
  assert.equal(E.route("harm", {self: false, playerCharacter: true, count: 1}), "queue");
});

test("Disciplines and Gifts call the power plan, behind a world setting", () => {
  assert.match(src("modules/wodx-actions/scripts/kindred.js"), /EF\.powerPlan\(actor, \{ set: (p\.book === "V20" \? "v20" : )?"disc"/);
  assert.match(src("modules/wodx-actions/scripts/garou.js"), /EF\.powerPlan\(actor, \{ set: "gift"/);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /export function powerPlan/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /"powerEffects"/);
});
