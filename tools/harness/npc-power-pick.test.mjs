// NPCs choose their own powers (B4926) and hold back obvious ones before mortals (B4927).
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PP = await import(join(root, "modules/wodx-npc/scripts/power-pick-rules.mjs"));
const NPW = await import(join(root, "modules/wodx-actions/scripts/npc-power-rules.js"));

const claws = {name: "Feral Claws", level: 2, uses: ["attack"], obvious: true};
const dominate = {name: "Command", level: 1, uses: ["hold"], obvious: false};
const mend = {name: "Mend", level: 1, uses: ["heal"], obvious: false};
const flee = {name: "Earth Meld", level: 3, uses: ["escape"], obvious: true};
const ALL = [claws, dominate, mend, flee];

test("a fresh NPC with a foe strikes with its strongest attack", () => {
  const r = PP.pick(ALL, {hasTarget: true, wounds: 0, boosted: true});
  assert.equal(r.power.name, "Feral Claws");
  assert.equal(r.use, "attack");
});

test("a badly hurt NPC mends first", () => {
  assert.equal(PP.pick(ALL, {hasTarget: true, wounds: 4}).power.name, "Mend");
});

test("obvious powers wait while mortals watch, unless frenzied, cornered or near death", () => {
  const st = {hasTarget: true, wounds: 0, boosted: true, mortalsSee: true};
  assert.equal(PP.pick(ALL, st).power.name, "Command");
  assert.equal(PP.pick(ALL, {...st, frenzied: true}).power.name, "Feral Claws");
  assert.equal(PP.pick(ALL, {...st, cornered: true}).power.name, "Feral Claws");
  assert.equal(PP.mayShow({mortalsSee: true, nearDeath: true}), true);
});

test("a used-up power is passed over", () => {
  const r = PP.pick([{...claws, free: false}, dominate], {hasTarget: true, boosted: true});
  assert.equal(r.power.name, "Command");
});

test("nothing fits: null, and the menu opens", () => {
  assert.equal(PP.pick([mend], {hasTarget: true, wounds: 0, boosted: true}), null);
});

test("keywords give the uses and whether a power shows", () => {
  const t = NPW.tagsOf(["harm"]);
  assert.ok(t.uses.includes("attack"));
  assert.equal(t.obvious, true);
  const s = NPW.tagsOf(["sway"]);
  assert.ok(s.uses.includes("hold"));
  assert.equal(s.obvious, false);
});

test("B6400: held back only when every fitting power is obvious and mortals watch", () => {
  const st = {hasTarget: true, wounds: 0, boosted: true, mortalsSee: true};
  assert.equal(PP.heldBack([claws], st), true);
  assert.equal(PP.heldBack([claws], {...st, mortalsSee: false}), false, "no one watching: it uses the power");
  assert.equal(PP.heldBack([claws, dominate], st), false, "a quiet power fits: it uses that one");
  assert.equal(PP.heldBack([mend], st), false, "nothing fits at all: not held back, the menu opens");
});
