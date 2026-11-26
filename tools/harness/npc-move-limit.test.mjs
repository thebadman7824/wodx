// #2485: an NPC the Storyteller drags in a fight keeps to the running speed, as a player's character does
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");

test("a Storyteller's drag of an NPC past the running speed is stopped, with Alt to go further", () => {
  assert.match(M, /const gmHand = game\.user\.isGM && !doc\.actor\.hasPlayerOwner && \["dragging", "keyboard"\]\.includes\(method\) && !game\.keyboard\?\.isModifierActive\?\.\("Alt"\)/);
  assert.match(M, /if \(p === "over" && mode === "block" && \(!game\.user\.isGM \|\| gmHand\)\)/);
  assert.match(M, /hold Alt to move an NPC further/, "the setting says so");
});
