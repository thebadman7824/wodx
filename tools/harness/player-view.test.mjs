import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-chronicle/scripts/player-view-rules.mjs"));

test("view: the player's own pick, then the Storyteller's, then the world default", () => {
  assert.equal(R.viewFor({mine: "full", byUser: "beginner", fallback: "beginner"}), "full");
  assert.equal(R.viewFor({mine: "", byUser: "beginner", fallback: "full"}), "beginner");
  assert.equal(R.viewFor({mine: "", byUser: "", fallback: "beginner"}), "beginner");
  assert.equal(R.viewFor({mine: "nonsense", byUser: "", fallback: "nonsense"}), "full");
  assert.equal(R.viewFor(), "full");
});

test("fits: line and year", () => {
  assert.equal(R.fits("wodxStepSideways", {kind: "lupine"}), true);
  assert.equal(R.fits("wodxStepSideways", {kind: "mortal"}), false);
  assert.equal(R.fits("wodxStepSideways", {kind: ""}), true, "no character: nothing is moved aside");
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1197}), false);
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1999}), true);
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1990}), true);
  assert.equal(R.fits("wodxTalk", {kind: "mortal", year: 1197}), true);
});

test("sortTools: every WoDX button lands on the bar or in exactly one drawer", () => {
  const names = [...Object.keys(R.TOOL_GROUP), "wodxXCard", "wodxFindMe", "wodxSomethingNew"];
  const tools = names.map(name => ({name, title: name, icon: "x"}));
  const {bar, drawers} = R.sortTools(tools, {kind: "kindred", year: 1197});
  const inDrawers = Object.values(drawers).flatMap(d => [...d.fit, ...d.more].map(t => t.name));
  assert.deepEqual([...bar, ...inDrawers].sort(), [...names].sort());
  assert.ok(bar.includes("wodxXCard") && bar.includes("wodxFindMe") && bar.includes("wodxSomethingNew"));
  assert.ok(drawers.beyond.more.some(t => t.name === "wodxJack"), "the Net in 1197 is under More");
  assert.ok(drawers.beyond.more.some(t => t.name === "wodxStepSideways"), "a Kindred does not step sideways");
  assert.ok(drawers.now.fit.some(t => t.name === "wodxSight"), "Auspex sight fits a Kindred");
  for ( const g of R.GROUPS ) assert.ok(drawers[g.id], g.id);
});

test("sortTools: a button the Storyteller hid never reaches a drawer", () => {
  const {bar, drawers} = R.sortTools([{name: "wodxTalk"}], {});
  assert.equal(bar.length, 0);
  assert.equal(Object.values(drawers).flatMap(d => [...d.fit, ...d.more]).length, 1);
});

test("hud groups", () => {
  assert.equal(R.hudGroupOf("control-icon vta-hud"), "keep");
  assert.equal(R.hudGroupOf("control-icon vtc-hud"), "act");
  assert.equal(R.hudGroupOf("control-icon vtc-hud vtc-room"), "move");
  assert.equal(R.hudGroupOf("control-icon vtc-hud vtc-burden-btn active"), "move");
  assert.equal(R.hudGroupOf("control-icon wix-hud wix-carry-hud"), "move");
  assert.equal(R.hudGroupOf("control-icon wix-hud"), "look");
  assert.equal(R.hudGroupOf("control-icon wsn-who"), "look");
  assert.equal(R.hudGroupOf("control-icon wnpc-hud wnpc-faces-hud"), "talk");
  assert.equal(R.hudGroupOf("control-icon wodx-sprite-pick"), "act");
  assert.equal(R.hudGroupOf("control-icon some-other-module"), null);
  assert.equal(R.hudGroupOf("control-icon"), null);
});

test("search: every word must match; label starts rank first", () => {
  const e = [{label: "Feed", hint: "Kindred"}, {label: "Spend blood", hint: "heal, feed later"}, {label: "Letters", hint: "send a letter"}];
  assert.deepEqual(R.search(e, "feed").map(x => x.label), ["Feed", "Spend blood"]);
  assert.deepEqual(R.search(e, "send letter").map(x => x.label), ["Letters"]);
  assert.deepEqual(R.search(e, ""), []);
  assert.deepEqual(R.search(e, "(x["), [], "odd characters do not throw");
  assert.equal(R.search(Array.from({length: 99}, (_, i) => ({label: `a${i}`})), "a").length, 40);
});

test("the Storyteller's window lists every drawer button", async () => {
  const src = (await import("node:fs")).readFileSync(join(root, "modules/wodx-chronicle/scripts/player-tools.mjs"), "utf8");
  for ( const name of Object.keys(R.TOOL_GROUP) ) assert.ok(src.includes(`"${name}"`), `${name} missing from PLAYER_TOOLS`);
});
