import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as S from "../../modules/wodx-senses/scripts/sight-rules.mjs";
import * as B from "../../modules/wodx-combat/scripts/body-rules.js";
import * as R from "../../modules/wodx-combat/scripts/rules.js";
import * as L from "../../modules/wodx-interactables/scripts/living-rules.mjs";

/* The Display-Only Systems Desk, batch A (B2900-B2904): systems that used to show something now feed the rules. */

test("B2900: Aura Perception shows only what a reading showed", () => {
  assert.equal(S.ringFor("aura", "kindred", {needsRead: true, read: null}), null);
  const one = S.ringFor("aura", "kindred", {needsRead: true, read: {n: 1}});
  assert.equal(one.words, "pale");
  assert.equal(S.ringFor("aura", "mortal", {needsRead: true, read: {n: 1}}).words, "bright");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: true, read: {n: 2}}).words, "bright and wild");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: true, read: {botch: true}}).words, "pale", "a botch shows a false colour");
  assert.equal(S.ringFor("aura", "lupine", {needsRead: false}).words, "bright and wild", "setting off: as before");
  assert.ok(S.ringFor("lifesight", "mortal", {needsRead: true}), "Lifesight needs no reading");
  assert.equal(S.ringFor("aura", "kindred", {needsRead: true, safe: true, read: {n: 1}}).colour, S.SAFE.kindred);
});

test("B2900: a reading holds for an hour of game time", () => {
  const reads = {a: {n: 3, at: 100}, b: {n: 0, at: 100}, c: {botch: true, at: 100}};
  assert.equal(S.readFor(reads, "a", 200).n, 3);
  assert.equal(S.readFor(reads, "a", 100 + S.AURA_READ_SECONDS + 1), null);
  assert.equal(S.readFor(reads, "a", 50), null, "a reading from the future (time went back) does not hold");
  assert.equal(S.readFor(reads, "b", 200), null, "no success: nothing shown");
  assert.equal(S.readFor(reads, "c", 200).botch, true);
  assert.equal(S.readFor(reads, "x", 200), null);
  const many = Object.fromEntries(Array.from({length: 50}, (_, i) => [`t${i}`, {n: 2, at: 1000 + i}]));
  const kept = S.pruneReads({...many, old: {n: 2, at: 0}}, 2000);
  assert.equal(Object.keys(kept).length, 40);
  assert.ok(!("old" in kept) && "t49" in kept && !("t0" in kept));
});

test("B2901: loud noise and guns overwhelm Heightened Senses", () => {
  assert.equal(S.overwhelms({noise: "loud"}), true);
  assert.equal(S.overwhelms({noise: "quiet"}), false);
  for ( const w of ["Wheellock pistol", "Matchlock musket", "Hand cannon", "Assault rifle", "Revolver"] ) assert.equal(S.overwhelms({ranged: true, weapon: w}), true, w);
  for ( const w of ["Longbow", "Crossbow", "Sling", "Throwing knife"] ) assert.equal(S.overwhelms({ranged: true, weapon: w}), false, w);
  assert.equal(S.overwhelms({ranged: false, weapon: "Pistol"}), false, "a pistol-whip makes no bang");
  assert.match(S.overloadText("Ada"), /Willpower at difficulty 6/);
  assert.doesNotMatch(S.overloadText("Ada"), /\b(he|she|his|her)\b/i);
});

test("B2902: a crippled part counts on the attack", () => {
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Sword"}), 2);
  assert.equal(B.crippledAttackDiff(["hand-l"], {name: "Punch"}), 2);
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Kick"}), 0);
  assert.equal(B.crippledAttackDiff(["leg-l"], {name: "Kick"}), 2);
  assert.equal(B.crippledAttackDiff(["arm-r"], {name: "Bite"}), 0);
  assert.equal(B.crippledAttackDiff([], {name: "Sword"}), 0);
  const p = R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6, crippledDiff: 2});
  assert.equal(p.difficulty, 8);
  assert.ok(p.parts.some(x => /Crippled limb \+2 diff/.test(x)));
  assert.equal(R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6}).difficulty, 6, "no crippled part: as before");
});

test("B2903: wounds that add up get the maiming offer once", () => {
  const arm = {id: "arm-r", type: "arm", side: "r"};
  assert.ok(B.addedUpOffer({"arm-r": {l: 2, a: 1}}, [], arm, {thisBlow: 1}));
  assert.equal(B.addedUpOffer({"arm-r": {l: 2}}, [], arm, {thisBlow: 1}), null, "two levels are not enough");
  assert.equal(B.addedUpOffer({"arm-r": {l: 3, b: 4}}, ["arm-r"], arm), null, "offered once");
  assert.equal(B.addedUpOffer({"arm-r": {l: 3}}, [], arm, {thisBlow: 3}), null, "a single heavy blow has its own offer");
  assert.equal(B.addedUpOffer({"body": {l: 5}}, [], {id: "body", type: "torso"}), null, "the torso cannot be lost");
  assert.deepEqual(B.healedParts(["arm-r", "leg-l"], {"leg-l": {l: 1}, "arm-r": {b: 2}}), ["arm-r"]);
});

test("B2904: living tiles switch walls, doors and lights", () => {
  assert.equal(L.cleanRule({mode: "show", when: ["day"]}).also, "none");
  assert.equal(L.cleanRule({mode: "show", when: ["day"], also: "lock"}).also, "lock");
  assert.equal(L.cleanRule({mode: "show", when: ["day"], also: "nonsense"}).also, "none");
  const rect = {x: 100, y: 100, width: 200, height: 200};
  assert.equal(L.wallInside([110, 110, 290, 110], rect), true);
  assert.equal(L.wallInside([110, 110, 400, 110], rect), false);
  assert.deepEqual(L.linkedChange("block", true, "wall", {door: 0, move: 0, sight: 0}), {move: 20, sight: 20});
  assert.deepEqual(L.linkedChange("block", false, "wall", {door: 0, move: 20, sight: 20}), {move: 0, sight: 0});
  assert.equal(L.linkedChange("block", true, "wall", {door: 1, move: 20, sight: 20}), null, "doors are not walls to block");
  assert.deepEqual(L.linkedChange("lock", true, "wall", {door: 1, ds: 0}), {ds: 2, wodxLocked: true});
  assert.deepEqual(L.linkedChange("lock", false, "wall", {door: 1, ds: 2, wodxLocked: true}), {ds: 0, wodxLocked: false});
  assert.equal(L.linkedChange("lock", false, "wall", {door: 1, ds: 2, wodxLocked: false}), null, "a door locked by hand stays locked");
  assert.deepEqual(L.linkedChange("light", true, "light", {hidden: true}), {hidden: false});
  assert.equal(L.linkedChange("light", true, "light", {hidden: false}), null);
  assert.match(L.ruleWords({mode: "show", when: ["fast"], also: "lock"}), /doors inside it are locked while it holds/);
});
