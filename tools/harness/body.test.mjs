import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Bodies that change (Storyteller 0.16.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const B = await imp("modules/wodx-storyteller/scripts/body-rules.mjs");

test("body: a change needs words and falls back to safe keys", () => {
  assert.equal(B.normChange({what: "  "}), null);
  const c = B.normChange({what: "Bone spurs", source: "nonsense", part: "wings", appearance: 9});
  assert.equal(c.source, "other");
  assert.equal(c.part, "whole");
  assert.equal(c.appearance, 5);
  assert.equal(c.shows, true);
  assert.ok(c.id);
});

test("body: Appearance stays between 0 and its maximum, and a clan held at 0 stays there", () => {
  assert.equal(B.appearanceAfter(2, -3), 0);
  assert.equal(B.appearanceAfter(4, 3), 5);
  assert.equal(B.appearanceAfter(3, 3, {max: 7}), 6);
  assert.equal(B.appearanceAfter(0, 2, {locked: true}), 0);
  assert.ok(B.ZERO_APPEARANCE.test("Nosferatu"));
  assert.ok(!B.ZERO_APPEARANCE.test("Tzimisce"));
});

test("body: only changes that show reach the token, by part", () => {
  const s = B.shownByPart([{what: "Claws", part: "hands"}, {what: "A brand", part: "torso", shows: false}, {what: "Fangs", part: "mouth"}]);
  assert.deepEqual(Object.keys(s).sort(), ["hands", "mouth"]);
  assert.match(B.describeChange({what: "Cheekbones raised", part: "face", appearance: 1}), /^Face: Cheekbones raised \(Appearance \+1\)$/);
  assert.match(B.describeChange({what: "A brand", part: "torso", shows: false}), /hidden$/);
});

test("body: every book source names its pages", () => {
  for ( const k of ["vicissitude", "metis", "moliate", "visage"] ) assert.match(B.SOURCES[k].ref, /p\./);
});

test("body: the window, Undo and the wiring", () => {
  const s = src("modules/wodx-storyteller/scripts/body.mjs");
  assert.match(s, /wst-body-undo/);
  assert.match(s, /searchBox\("ul\.wst-body-list"/);
  assert.match(s, /data-fixed/);
  assert.match(s, /if \( !game\.user\.isGM \|\| !a \) return null;/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /Body\.registerBodyHooks\(\)/);
  assert.match(m, /body: \{open: Body\.bodyDialog/);
});
