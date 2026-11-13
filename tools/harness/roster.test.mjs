import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* A roster of characters for each player (B3534 to B3536): the tie, the state, the order, and when to prompt. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RR = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/roster-rules.mjs")).href);
const Q = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/approvals-rules.mjs")).href);

test("the tie follows the books' names, the sheet's role words where they name one", () => {
  assert.equal(RR.tieOf({main: true, ghoul: true}), "main");
  assert.equal(RR.tieOf({ghoul: true}), "ghoul");
  assert.equal(RR.tieOf({kinfolk: true}), "kinfolk");
  assert.equal(RR.tieOf({role: "Apprentice"}), "apprentice");
  assert.equal(RR.tieOf({role: "bodyguard"}), "retainer");
  assert.equal(RR.tieOf({role: "Thrall"}), "thrall");
  assert.equal(RR.tieOf({role: "cultist"}), "follower");
  assert.equal(RR.tieOf({role: "old friend"}), "ally");
  for ( const k of Object.keys(RR.TIES) ) assert.ok(RR.TIES[k]);
});

test("state: dead over torpor over away", () => {
  assert.equal(RR.stateOf({died: 1201, torpor: true}), "dead");
  assert.equal(RR.stateOf({died: 0}), "dead", "a death in year 0 is still a death");
  assert.equal(RR.stateOf({torpor: true, away: true}), "torpor");
  assert.equal(RR.stateOf({away: true}), "away");
  assert.equal(RR.stateOf({died: null}), "awake");
});

test("the roster puts the main character first, then the playable, and prompts only on a fall", () => {
  const list = RR.roster([{id: "g", name: "Greta", ghoul: true, torpor: true}, {id: "a", name: "Anna"}, {id: "r", name: "Rudolf", role: "retainer"}, {id: "k", name: "Karel", died: 1250}], "a");
  assert.deepEqual(list.map(r => r.id), ["a", "r", "g", "k"]);
  assert.equal(list[0].tie, "main");
  assert.deepEqual(RR.others(list, "a").map(r => r.id), ["r"]);
  assert.ok(RR.needsPick("awake", "torpor"));
  assert.ok(!RR.needsPick("torpor", "dead"));
  assert.ok(!RR.needsPick("awake", "awake"));
});

test("a new roster entry always waits on the Storyteller; the Clock has the button for players", () => {
  assert.ok(Q.NEVER_AUTO.includes("roster.add"));
  assert.match(readFileSync(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"), "utf8"), /data-action="roster"/);
  const src = readFileSync(join(root, "modules/wodx-chronicle/scripts/roster.mjs"), "utf8");
  assert.match(src, /searchBox\("ul\.wodx-roster"/);
  assert.match(src, /searchBox\("select\[name=actor\]"/);
});
