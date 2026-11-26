/* B7833: the Spectral arsenal of Orpheus (pp. 267-270): Thorns on the sheet, Horrors from Spite tapped, never spent. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OX = await import("../../modules/wodx-actions/scripts/orpheus-spectres.js");
const E = await import("../../modules/wodx-rules/actions/effects-rules.js");

test("five Thorns and eight Spectral Horrors, each with a page (B7833)", () => {
  assert.deepEqual(Object.keys(OX.THORNS), ["carapace", "claws", "envelop", "maw", "tentacles"]);
  assert.deepEqual(Object.keys(OX.HORRORS), ["chill", "flicker", "flit", "hivemind", "immolate", "manifest", "rend", "virus"]);
  for ( const [k, h] of Object.entries(OX.HORRORS) ) {
    assert.match(h.page, /^pp?\. 26[7-9]/, `${k}: page`);
    const {min, max} = OX.tapRange(k);
    for ( let s = Math.max(1, min); s <= Math.min(5, max); s++ ) assert.ok(OX.horrorLine(k, s).length > 8, `${k} at ${s}: a line`);
    for ( const r of OX.horrorResults(k, 2) ) assert.ok(E.KEYWORDS[r.key], `${k}: keyword ${r.key}`);
    assert.equal(OX.spectralOf(h.label)?.key, k);
  }
  assert.equal(OX.spectralOf("Claws (Thorn)")?.kind, "thorn");
});

test("a Spectre taps its rating a scene, and Willpower buys three more a point (p. 267)", () => {
  assert.deepEqual(OX.tapPlan(6, 0, 6, 0), {ok: true, willpower: 0});
  assert.equal(OX.tapPlan(6, 4, 3, 0).ok, false);
  assert.deepEqual(OX.tapPlan(6, 4, 3, 2), {ok: true, willpower: 1});
  assert.deepEqual(OX.tapPlan(6, 0, 9, 1), {ok: true, willpower: 1}, "Spite 6 reaches 9 with one Willpower");
  assert.equal(OX.tapPlan(6, 0, 10, 1).ok, false);
});

test("Chill harms all near by Spite tapped; Immolate burns a toucher for one more (pp. 268-269)", () => {
  const chill = OX.horrorResults("chill", 3)[0];
  assert.equal(chill.key, "harm"); assert.equal(chill.out.levels, 3); assert.equal(chill.out.type, "bashing");
  const [burn, sneak] = OX.horrorResults("immolate", 2);
  assert.deepEqual(burn.out.touch, {levels: 3, type: "lethal"}, "the book's example: two Spite, three lethal");
  assert.deepEqual(sneak.out.tags, ["stealth"]); assert.equal(sneak.out.shift, 2);
  assert.equal(OX.applies("rend"), false);
  assert.match(OX.horrorLine("flit", 2), /walls.*leaps/);
  assert.match(OX.horrorLine("manifest", 3), /apparition/);
});

test("Thorns on the sheet: Carapace by kind, Claws Strength + 1, Maw Strength + 2 (p. 267)", () => {
  assert.equal(OX.thornItem("carapace", {kind: "chitin"}).system.soak.lethal, 5);
  assert.equal(OX.thornItem("carapace", {kind: "hide"}).system.soak.bashing, 1);
  assert.equal(OX.thornItem("claws").system.damage.bonus, 1);
  assert.equal(OX.thornItem("maw").system.damage.bonus, 2);
  assert.equal(OX.thornItem("envelop"), null);
  const read = f => fs.readFileSync(path.join(root, f), "utf8");
  assert.match(read("modules/wodx-actions/scripts/main.js"), /orphSpectre: withActor/);
  assert.match(read("modules/wodx-actions/scripts/profile-menus.js"), /api:orphSpectre/);
  assert.match(read("modules/wodx-actions/scripts/orpheus.js"), /async function spectre\(actor\)/);
});
