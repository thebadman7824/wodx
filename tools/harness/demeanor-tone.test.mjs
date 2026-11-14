import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import * as TK from "../../modules/wodx-npc/scripts/talk-rules.mjs";

/* An NPC's Demeanor sets the tone of their stock talk (B3918) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("demeanor: a cold mask speaks cooler, a warm one warmer, others as they feel", () => {
  assert.equal(TK.toneOf("Bravo"), -1);
  assert.equal(TK.toneOf("the Bon Vivant"), 1);
  assert.equal(TK.toneOf("Survivor"), 0);
  assert.equal(TK.toneOf(""), 0);
  assert.equal(TK.toneRegard(0, "Bravo"), "dislike");
  assert.equal(TK.toneRegard(1, "Gallant"), "like");
  assert.equal(TK.toneRegard(0, "Survivor"), "neutral");
  assert.equal(TK.toneRegard(-3, "Monster"), "hate");
  assert.equal(TK.toneRegard(3, "Caregiver"), "love");
});

test("demeanor: the talk window's stock lines read it", () => {
  const t = readFileSync(join(root, "modules/wodx-npc/scripts/talk.mjs"), "utf8");
  assert.match(t, /regard: TK\.toneRegard\(step, npc\?\.system\?\.demeanor\)/);
});
