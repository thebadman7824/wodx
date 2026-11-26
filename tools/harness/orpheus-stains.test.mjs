/* B7832: the Stains of Orpheus (pp. 194-199) are listed with their page, and calling one up taps Spite. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OS = await import("../../modules/wodx-actions/scripts/orpheus-stains.js");
const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const PM = await import("../../modules/wodx-actions/scripts/power-mods.js");

test("the twenty Stains of the core book, each with a page, a look, a gain and a cost (B7832)", () => {
  assert.equal(Object.keys(OS.STAINS).length, 20);
  for ( const [k, s] of Object.entries(OS.STAINS) ) {
    assert.match(s.page, /^pp?\. 19[5-9](-19[6-9])?$/, `${k}: page`);
    for ( const f of ["label", "look", "gain", "cost"] ) assert.ok(s[f]?.length > 4, `${k}: ${f}`);
    assert.equal(OS.stainOf(s.label), k, `${k}: found by its name`);
    for ( const r of OS.stainResults(k, 2) ) assert.ok(E.KEYWORDS[r.key], `${k}: keyword ${r.key}`);
  }
});

test("calling a Stain up: Spite 4, a die a point at 7, a miss one Spite and a botch two (p. 195)", () => {
  assert.equal(OS.canCall({rating: 3}, 2).ok, false);
  assert.equal(OS.canCall({rating: 4}, 2).ok, true);
  assert.equal(OS.canCall({rating: 6}, 0).ok, false);
  assert.deepEqual(OS.tapResult([7, 10]), {turns: 2, failed: 0, botched: 0, spite: 0});
  assert.deepEqual(OS.tapResult([1, 6, 9]), {turns: 3, failed: 1, botched: 1, spite: 3});
});

test("a Stain lasts one turn a point, and its numbers reach the dice (B7832)", () => {
  const scales = OS.stainResults("addersscales", 3);
  assert.deepEqual(scales[0].out.timed, {kind: "rounds", rounds: 3});
  assert.deepEqual(PM.timedData(scales[0].out), {dice: 1});
  const cham = OS.stainResults("chameleonskin", 2)[0].out;
  const fx = [{id: "c", name: "Chameleon Skin", key: PM.keyFor(cham), data: PM.timedData(cham)}];
  assert.equal(PM.modsFrom(fx, {tags: ["dexterity", "stealth"]}).dice, 3, "three dice on Stealth");
  assert.equal(PM.modsFrom(fx, {tags: ["dexterity", "athletics"]}).dice, 0, "none elsewhere");
  assert.equal(PM.modsFrom(fx, {soak: true}).dice, 0, "none on soak");
  assert.equal(OS.stainWeapon("claws").system.damage.bonus, 2);
  assert.equal(OS.stainWeapon("claws").system.damage.type, "lethal");
  assert.equal(OS.stainWeapon("withered"), null);
  assert.equal(OS.applies("leper"), false, "the Storyteller's from the card");
});

test("the Stain window is on the Orpheus menu, the sheet and the api, and its weapon goes when it fades (B7832)", () => {
  const read = f => fs.readFileSync(path.join(root, f), "utf8");
  assert.match(read("modules/wodx-actions/scripts/main.js"), /orphStain: withActor/);
  assert.match(read("modules/wodx-actions/scripts/main.js"), /registerReverter\?\.\("wodx-actions\.stainEnd"/);
  assert.match(read("modules/wodx-actions/scripts/profile-menus.js"), /api:orphStain/);
  assert.match(read("modules/wodx-sheets/scripts/sheet-rules.mjs"), /"orphStain"/);
  assert.match(read("modules/wodx-actions/scripts/orpheus.js"), /async function stain\(actor\)/);
});
