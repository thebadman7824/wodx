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

// #2485 (both): out of a fight, routine walks keep to the walking pace for the time that passed, and reactions to
// three turns at a run
const NR = await import(join(root, "modules/wodx-rules/npc/npc-rules.mjs"));
const RT = readFileSync(join(root, "modules/wodx-npc/scripts/routines.mjs"), "utf8");

test("a routine walk reaches the walking pace times the turns that passed", () => {
  assert.equal(NR.walkReach(7, 60), 140, "a minute is 20 turns of 7 yards");
  assert.equal(NR.walkReach(7, 1), 7, "at least one turn's walk");
  assert.equal(NR.walkReach(9, 900), 2700, "a quarter hour, with Celerity 2");
  assert.equal(NR.walkReach(7, null), null, "no time known: not cut");
  assert.equal(NR.walkReach(0, 600), 0, "one who cannot walk stays");
});

test("a reaction away from a fight goes three turns at a run", () => {
  assert.equal(NR.reactReach(26), 78);
  assert.equal(NR.reactReach(0), 0);
});

test("a cut path keeps to its budget", () => {
  const path = Array.from({length: 30}, (_, i) => ({i, j: 0}));
  assert.equal(NR.trimPath(path, 10).length, 11);
});

test("routines cut their walks and pick up the rest at the next tick", () => {
  assert.match(RT, /walkTo\(tok, goal, routineReach\(tok, secs\)\)/, "a routine walk is cut to the time that passed");
  assert.match(RT, /const path = cutPath\(way\.path, reactionReach\(tok\)\)/, "a walk up to someone is a reaction");
  assert.match(RT, /async function walkToRegion\(tok, region, snap, yards = reactionReach\(tok\)\)/, "alarms and calls are reactions");
  assert.match(RT, /walkToRegion\(tok, p\.region, null, routineReach\(tok, secs\)\)/, "a guard's beat keeps to the walking pace");
  assert.match(RT, /if \( short \) lastKey\.set\(scene\.id, ""\)/, "a walk cut short goes on at the next tick");
  assert.match(RT, /track\(tick\(how, \{secs\}\)\)/, "the clock's change is the time that passed");
});
