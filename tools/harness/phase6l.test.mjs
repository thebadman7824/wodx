import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6l: the crucible (WoDX Actions 3.10.0, Orpheus) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const O = await import(join(root, "modules/wodx-actions/scripts/orpheus-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));

test("five Shades and their bases; four Laments; ten Horrors and their prerequisites (pp. 122–124)", () => {
  assert.equal(Object.keys(O.SHADES).length, 5);
  assert.deepEqual(Object.values(O.SHADES).map(s => [s.vitality, s.willpower, s.spite]), [[5, 3, 0], [5, 4, 1], [5, 5, 2], [4, 6, 2], [4, 4, 0]]);
  assert.equal(Object.keys(O.LAMENTS).length, 4);
  assert.equal(Object.keys(O.HORRORS).length, 10);
  assert.equal(O.shadeOf("Poltergeist"), "poltergeist");
  assert.equal(O.horrorOf("Witch's Nimbus"), "witchsnimbus");
  assert.equal(O.canLearn("banshee", "congeal").ok, false);
  assert.equal(O.canLearn("banshee", "forebode").ok, false);
  assert.deepEqual(O.canLearn("banshee", "forebode", ["wail"]), {ok: true, freebies: 7});
  assert.deepEqual(O.canLearn("banshee", "inhabit"), {ok: true, freebies: 10});
});

test("starting traits: Shade + Nature; the book's Poltergeist Critic; Vitality nine (seven for hues) (pp. 123, 189)", () => {
  assert.deepEqual(O.startingAdvantages("poltergeist", O.natureMods("Critic")), {vitality: 6, willpower: 7, spite: 4, vitalityCap: 9});
  assert.equal(O.startingAdvantages("haunter", {vitality: 5}, "hue").vitality, 7);
  assert.equal(Object.keys(O.NATURE_MODS).length >= 50, true);
});

test("Vitality: how visible; the ripple; rest; Willpower; zero (pp. 190–192)", () => {
  assert.equal(O.visibility(7).key, "living");
  assert.equal(O.visibility(5).key, "between");
  assert.equal(O.visibility(4).key, "ghost");
  assert.equal(O.symmetry(2), null);
  assert.equal(O.symmetry(3).blocks, 3);
  assert.equal(O.symmetry(5).blocks, 5);
  assert.equal(O.rest(2, 6, 17), 4);
  assert.equal(O.rest(2, 6, 3, true), 5);
  assert.equal(O.rest(5, 6, 24), 6);
  assert.equal(O.willpowerBoost(9), 10);
  assert.deepEqual(O.zeroVitality({vitality: 0, willpower: 2}), {state: "revived", vitality: 3, willpower: 1});
  assert.equal(O.zeroVitality({vitality: 0, willpower: 0}).state, "dissipates");
});

test("tapping Spite: the book's example (three points, 2, 5, 8: two more points); the rating fills Vitality (pp. 191–192)", () => {
  const t = O.tapSpite({spitePoints: 5, spiteRating: 4, vitality: 1}, [2, 5, 8], {count: 3});
  assert.deepEqual([t.vitality, t.spitePoints, t.spiteRating, t.newRatings], [4, 7, 4, 0]);
  const b = O.tapSpite({spitePoints: 9, spiteRating: 4, vitality: 1}, [1], {count: 1});
  assert.deepEqual([b.spitePoints, b.spiteRating, b.stains], [1, 5, 1]);
  const r = O.tapSpite({spitePoints: 0, spiteRating: 3, vitality: 0}, [4], {rating: true});
  assert.deepEqual([r.vitality, r.spiteRating, r.stains], [10, 4, 1]);
});

test("Spite against the starting Vitality; the last tether; Stains from Spite 4 (pp. 129, 193)", () => {
  assert.equal(O.spiteState(3, 6).level, 0);
  assert.equal(O.spiteState(6, 6).level, 1);
  assert.equal(O.spiteState(7, 6).level, 2);
  assert.deepEqual([O.spiteState(9, 6).level, O.spiteState(9, 6).stains], [3, 3]);
  assert.equal(O.spiteState(10, 6).level, 4);
  assert.equal(O.severLast(3), 2);
  assert.equal(O.canUseStains(3), false);
  assert.equal(O.canUseStains(4), true);
});

test("the inner voice of a spook: Spite", () => {
  assert.equal(V.pressure("spite", {rating: 2, points: 0, vitality: 6}).level, "calm");
  assert.equal(V.pressure("spite", {rating: 6, points: 0, vitality: 6}).level, "rising");
  assert.equal(V.pressure("spite", {rating: 7, points: 0, vitality: 6}).level, "breaking");
});

test("wiring: the Orpheus menu by the sheet's variant, the API; gender-neutral text (B48)", () => {
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  for ( const k of ["orphHorror", "orphVitality", "orphHarm", "orphSpite", "orphProject", "orphSetup"] ) assert.match(main, new RegExp(`${k}: withActor`));
  assert.match(readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8"), /kind === "mortal" && ctx\.isOrpheus\?\.\(actor\)\) \? MENUS\.orpheus/);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  for ( const f of ["orpheus.js", "orpheus-rules.js"] ) {
    const src = readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
    for ( const s of src.match(/`[^`]*`|"[^"\n]*"/g) ?? [] ) assert.ok(!words.test(s), `${f}: ${s.slice(0, 80)}`);
  }
});
