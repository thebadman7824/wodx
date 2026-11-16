/* B6923: the trap, hazard and stock hooks of WoDX Interactables each have a listener that shows the Storyteller
 * something: a word over the token, the Held mark while a snare or live wire holds someone, and a stock card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as H from "../../modules/wodx-interactables/scripts/hook-rules.mjs";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("B6923: a snare holds while its holding names the actor; a live wire while it is live and caught", () => {
  assert.equal(H.holdsNow({holding: "a1"}, "a1"), true);
  assert.equal(H.holdsNow({holding: null}, "a1"), false, "broken free or cut loose");
  assert.equal(H.holdsNow({live: true, caught: {a1: true}}, "a1"), true);
  assert.equal(H.holdsNow({live: true, caught: {a1: false}}, "a1"), false, "pulled free");
  assert.equal(H.holdsNow({live: false, caught: {a1: true}}, "a1"), false, "the power is cut");
  assert.equal(H.hazardHolds("shock", {live: true, caught: {a1: true}}, "a1"), true);
  assert.equal(H.hazardHolds("fire", {live: true, caught: {a1: true}}, "a1"), false);
});

test("B6923: the words over the token and the stock card", () => {
  assert.equal(H.trapWord({kind: "snare", caught: true}), "Snared!");
  assert.equal(H.trapWord({kind: "blade", dice: 5}), "Spring blade!");
  assert.equal(H.trapWord({kind: "tripwire", dice: 0}), "Tripwire sprung");
  assert.equal(H.hazardWord({kind: "fire"}), "Burning!");
  assert.equal(H.stockCard([]), null);
  const one = H.stockCard([{title: "Baker's shelf", scene: "Market Square", lines: ["bread (6)", "honey cake"]}]);
  assert.equal(one.title, "Fresh stock came in");
  assert.deepEqual(one.rows, [{where: "Baker's shelf, Market Square", what: "bread (6); honey cake"}]);
  assert.match(H.stockCard([{title: "A", lines: []}, {title: "B", lines: ["x"]}]).title, /at 2 places/);
});

test("B6923: the module listens to all three and lifts the Held mark when a tile lets go", () => {
  const src = read("modules/wodx-interactables/scripts/hook-listeners.mjs");
  for ( const h of ["wodxInteractablesTrap", "wodxInteractablesHazard", "wodxStockDrawn"] ) assert.match(src, new RegExp(`Hooks\\.on\\("${h}"`), h);
  assert.match(src, /setCondition\(actor, "held", true\)/);
  assert.match(src, /setCondition\(actor, "held", false\)/);
  assert.match(src, /whisper: gmIds\(\)/);
  assert.match(read("modules/wodx-interactables/scripts/main.mjs"), /setupHookListeners\(\);/);
  const doc = read("docs/HOOKS.md").split("## Extension points")[1] ?? "";
  for ( const h of ["wodxInteractablesTrap", "wodxInteractablesHazard", "wodxStockDrawn"] ) assert.doesNotMatch(doc, new RegExp(`\\| ${h} \\|`), `${h} is heard now`);
});
