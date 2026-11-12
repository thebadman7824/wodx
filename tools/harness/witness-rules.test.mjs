import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as W from "../../modules/wodx-actions/scripts/witness-rules.js";

/* WoDX Actions 3.42.0: who an act startles, and how far word goes by place (B980-B984) */

test("Kindred and ghouls are calm at a Cainite's Discipline; mortals breach", () => {
  assert.equal(W.reaction("kindred", {profile: "kindred"}), "calm");
  assert.equal(W.reaction("kindred", {profile: "ghoul"}), "calm");
  assert.equal(W.reaction("kindred", {profile: "mortal"}), "breach");
  assert.equal(W.reaction("kindred", {profile: "hunter"}), "breach");
  assert.equal(W.reaction("kindred", {profile: "beast"}), "startled");
});

test("A Cainite is startled by a Crinos or an apocalyptic form", () => {
  assert.equal(W.reaction("lupine", {profile: "kindred"}), "startled");
  assert.equal(W.reaction("demon", {profile: "kindred"}), "startled");
  assert.equal(W.reaction("lupine", {profile: "lupine"}), "calm");
  assert.equal(W.reaction("kindred", {profile: "lupine"}), "startled");
});

test("Kinfolk, herd and the ticked already know", () => {
  assert.equal(W.reaction("lupine", {profile: "mortal", kinfolk: true}), "calm");
  assert.equal(W.reaction("kindred", {profile: "mortal", knows: ["kindred"]}), "calm");
  assert.equal(W.reaction("demon", {profile: "mortal", knows: ["kindred"]}), "breach");
  assert.equal(W.reaction("demon", {profile: "mage", knows: "*"}), "calm");
});

test("Only Sleepers witness vulgar magick; other kinds are startled", () => {
  assert.equal(W.reaction("mage", {profile: "mortal"}), "breach");
  assert.equal(W.reaction("mage", {profile: "beast"}), "calm");
  assert.equal(W.reaction("mage", {profile: "kindred"}), "startled");
  assert.equal(W.reaction("mage", {profile: "mage"}), "calm");
});

test("Spirits, wraiths, demons and mummies are never startled; unknown profiles count as mortal; no secret, no breach", () => {
  for ( const s of Object.keys(W.SECRETS) ) for ( const p of ["spirit", "wraith", "demon", "mummy"] ) assert.equal(W.reaction(s, {profile: p}), "calm");
  assert.equal(W.reaction("kindred", {profile: "nonsense"}), "breach");
  assert.equal(W.reaction(null, {profile: "mortal"}), "calm");
  assert.equal(W.secretOf("mortal"), null);
  assert.equal(W.secretOf("kindred"), "kindred");
});

test("sortOnlookers splits a crowd", () => {
  const s = W.sortOnlookers("kindred", [{profile: "mortal"}, {profile: "kindred"}, {profile: "lupine"}, {profile: "ghoul"}]);
  assert.deepEqual([s.breach.length, s.startled.length, s.calm.length], [1, 1, 2]);
});

test("Place modes: set wins, else the kind of place, else open", () => {
  assert.equal(W.placeMode(null), "open");
  assert.equal(W.placeMode({kind: "street"}), "open");
  assert.equal(W.placeMode({kind: "haven"}), "closed");
  assert.equal(W.placeMode({kind: "elysium"}), "guarded");
  assert.equal(W.placeMode({kind: "caern"}), "closed");
  assert.equal(W.placeMode({kind: "haven", masq: "open"}), "open");
  assert.equal(W.placeMode({kind: "street", masq: "bogus"}), "open");
  assert.equal(W.spreads("open"), true);
  assert.equal(W.spreads("closed"), false);
  assert.equal(W.spreads("guarded"), false);
});

test("Feeding in Elysium breaks the Prince's peace; talk does not", () => {
  assert.equal(W.breaksPeace("guarded", "kindred", "feeding"), true);
  assert.equal(W.breaksPeace("guarded", "kindred", "used Awe"), false);
  assert.equal(W.breaksPeace("open", "kindred", "feeding"), false);
  assert.match(W.placeNote("guarded", "kindred", "feeding"), /Prince's peace/);
  assert.equal(W.placeNote("open", "kindred", "feeding"), "");
});

test("Every place mode default names a real kind of place", async () => {
  const R = await import("../../modules/wodx-npc/scripts/routine-rules.mjs");
  for ( const k of Object.keys(W.MODE_OF_KIND) ) assert.ok(R.PLACE_KINDS[k], k);
});
