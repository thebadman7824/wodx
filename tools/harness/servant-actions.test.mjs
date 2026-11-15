import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Servants and Bonds Desk, step two (B5112-B5119): Conditioning, Enchantment, oaths that cost, pacts, names, Thralls, consorts.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const R = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/servant-actions-rules.js")));
const DR = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/demon-rules.js")));

test("Enchantment loses a point a day and ends; the Parted Mists last and need more than one changeling", () => {
  assert.deepEqual(R.enchantLeft({glamour: 3, day: 10}, 11), {glamour: 2, ended: false});
  assert.deepEqual(R.enchantLeft({glamour: 3, day: 10}, 13), {glamour: 0, ended: true});
  assert.equal(R.enchantLeft({glamour: 3, day: 10, lasting: true}, 400).ended, false);
  assert.deepEqual([1, 3].map(g => R.enchantStep({glamour: g})), [1, 2]);
  assert.equal(R.enchantStep({glamour: 1, lasting: true}), 3);
  assert.equal(R.partedMists([{glamour: 2}]).ok, false);
  assert.equal(R.partedMists([{glamour: 2}, {glamour: 1}, {glamour: 0}]).total, 3);
});

test("an attack on someone an oath binds you to breaks the first such oath", () => {
  const oaths = [{kind: "burden", parties: ["Ada"]}, {kind: "crossedBlades", parties: ["Ada"], broken: 5}, {kind: "clasped", parties: ["ada "]}];
  assert.equal(R.oathHarmed(oaths, "Ada"), 2, "a broken one and a burden do not count");
  assert.equal(R.oathHarmed(oaths, "Bo"), -1);
  assert.equal(R.oathHarmed([], "Ada"), -1);
});

test("pacts: potential, gifts as working items, thrall entries and old typed thralls linked", () => {
  assert.equal(R.potentialGuess({}), 2);
  assert.equal(R.potentialGuess({trueFaith: 2}), 4);
  assert.equal(R.potentialGuess({set: 0}), 0);
  const items = R.giftItems([{k: "innate"}, {k: "evocation", level: 2}, {k: "bogus"}], {demon: "Asmo"});
  assert.equal(items.length, 2);
  assert.equal(items[0].flags["wodx-actions"].pactGift.diff, 7);
  assert.equal(items[1].flags["wodx-actions"].pactGift.level, 2);
  assert.ok(items.every(i => i.type === "Feature" && /p\. 253/.test(i.system.description)));
  const e = R.thrallEntry({name: "Eli", actorId: "e1", potential: 3, offered: 5, gifts: [{k: "innate"}]});
  assert.equal(e.offered, 2, "no more than half the potential, rounded up");
  assert.equal(DR.giftsCost(3, [{k: "innate"}, {k: "evocation", level: 2}]).ok, true);
  const linked = R.linkThralls([{name: "Eli"}, {name: "Twin"}, {name: "Zed", actorId: "z"}], [{id: "e1", name: "eli"}, {id: "t1", name: "Twin"}, {id: "t2", name: "Twin"}]);
  assert.deepEqual(linked.map(t => t.actorId ?? null), ["e1", null, "z"], "an unclear name stays text");
});

test("names: each evocation card gives its own difficulties, and the best name known wins", () => {
  assert.deepEqual(R.nameDifficulties("(mundane name 8, Celestial 7, True Name 6)"), {mundane: 8, celestial: 7, true: 6, thrall: 0});
  assert.deepEqual(R.nameDifficulties("(9 mundane, 8 Celestial, 7 True Name, 6 own thrall)"), {mundane: 9, celestial: 8, true: 7, thrall: 6});
  assert.equal(R.nameDifficulties("Throw fire"), null);
  const names = [{demonId: "d", kind: "celestial"}, {demonId: "d", kind: "true"}, {demonId: "x", kind: "celestial"}];
  assert.equal(R.bestName(names, "d").kind, "true");
  assert.equal(R.bestName(names, "x").kind, "celestial");
  assert.equal(R.bestName(names, "none"), null);
  assert.deepEqual([[3, 1], [2, 2], [0, 1]].map(([a, b]) => R.pressResult(a, b)), ["yields", "holds", "refuses"]);
});

test("Thralls and consorts", () => {
  assert.equal(R.thrallStep(true), 3);
  assert.equal(R.thrallStep(false), 1);
  assert.deepEqual([0, 1, 2, 3].map(p => R.rideCount(p).consort), [false, false, true, true]);
  assert.equal(R.rideCount(3).easier, 1);
  assert.equal(R.rideCount(2).easier, 0);
});

test("the wiring: menus, the API, approvals, the clock, attacks, effects and evocations", () => {
  const main = src("modules/wodx-actions/scripts/main.js"), menus = src("modules/wodx-actions/scripts/profile-menus.js");
  for ( const k of ["conditioning", "enchant", "partedMists", "demonPact", "pactGift", "knownNames", "pressName", "chainThrall"] ) {
    assert.ok(new RegExp(`\\b${k}: withActor`).test(main), `${k} in the API`);
    assert.ok(menus.includes(`"api:${k}"`), `${k} on a menu`);
  }
  assert.ok(/svx\(\)\.registerHandlers\(\)/.test(main));
  assert.ok(/svx\(\)\.enchantDaily\(\)/.test(main));
  assert.ok(/Hooks\.on\("wodxAttackRolled"/.test(main));
  assert.ok(/Hooks\.on\("wodxEffectApplied"/.test(main));
  assert.ok(/Hooks\.callAll\("wodxEffectApplied"/.test(src("modules/wodx-actions/scripts/effects.js")));
  assert.ok(/ctx\.nameDifficulty\?\.\(/.test(src("modules/wodx-actions/scripts/demon.js")));
  const sa = src("modules/wodx-actions/scripts/servant-actions.js");
  for ( const t of ["partedMists", "oathBroken", "pact", "pressName"] ) assert.ok(sa.includes(`"wodx-actions.${t}"`), `approval type ${t}`);
});
