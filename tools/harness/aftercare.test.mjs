// WoDX NPC aftercare rules (Aftercare Desk a1-a12, B5710-B5721).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as A from "../../modules/wodx-npc/scripts/aftercare-rules.mjs";
import {CONTAINERS} from "../../modules/wodx-interactables/scripts/interact-rules.mjs";

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const die = d => (d - 1) / 10 + 0.01; // rand value that rolls d

test("dice count V20 successes, ones cancel, a botch", () => {
  const r = A.roll(3, 7, seq(die(8), die(1), die(9)));
  assert.deepEqual(r.dice, [8, 1, 9]);
  assert.equal(r.net, 1);
  assert.equal(A.roll(2, 6, seq(die(1), die(3))).botch, true);
});

test("a1: first aid is harder for deep wounds, the best healer tends", () => {
  assert.equal(A.tendDiff({lethal: 1}), 6);
  assert.equal(A.tendDiff({lethal: 4}), 7);
  assert.equal(A.tendDiff({lethal: 3, aggravated: 3}), 8);
  assert.equal(A.bestHealer([{name: "a", int: 2, medicine: 0}, {name: "b", int: 2, medicine: 3}, {name: "c", int: 0, medicine: 0}]).name, "b");
  assert.equal(A.bestHealer([{name: "c", int: 0, medicine: 0}]), null);
});

test("a1: a Cainite is fed and mends with blood, keeping one", () => {
  const m = A.kindredMend({value: 1, max: 10}, {bashing: 1, lethal: 5}, 3);
  assert.equal(m.fed, 3);
  assert.equal(m.spent, 3);
  assert.deepEqual(m.damage, {bashing: 1, lethal: 2, aggravated: 0});
  assert.equal(m.blood, 1);
  assert.equal(A.kindredMend({value: 5, max: 10}, {aggravated: 2}, 0).spent, 0);
});

test("a3: a rite for each faith", () => {
  assert.equal(A.riteFor("hindu", 1500).rite, "cremation");
  assert.equal(A.riteFor("jewish", 1300).within, 24);
  assert.equal(A.riteFor("western", 1197, "moravia").rite, "burial");
  assert.equal(A.riteFor("western", 1990, "british-isles").rite, "cremation");
  assert.equal(A.riteFor("own", 800).rite, "barrow");
  for ( const f of ["western", "orthodox", "islamic", "jewish", "hindu", "theravada", "tibetan", "chinese", "own"] ) assert.ok(A.RITE_WORDS[A.riteFor(f, 1500).rite], f);
});

test("a5: disposal by the takers' kind", () => {
  assert.equal(A.disposalFor("mortal", {lawful: true}).how, "law");
  assert.equal(A.disposalFor("mortal").how, "buried");
  assert.equal(A.disposalFor("kindred").how, "burned");
  assert.equal(A.disposalFor("garou").how, "wilds");
  assert.equal(A.disposalFor("mage", {water: true}).how, "sunk");
});

test("a6: only gear is taken, not powers or traits", () => {
  const got = A.lootable([{type: "Melee Weapon", name: "Sword"}, {type: "Power", name: "Dominate"}, {type: "Feature", name: "Merit"}, {type: "Armor", name: "Mail"}, {type: "Melee Weapon", name: "Claws", natural: true}]);
  assert.deepEqual(got.map(i => i.name), ["Sword", "Mail"]);
});

test("a7: the bonds give over nights; a botch starts again", () => {
  assert.equal(A.escapePool({dex: 3, larceny: 2, str: 2, athletics: 1}).words, "Dexterity + Larceny");
  assert.equal(A.escapePool({dex: 1, larceny: 0, str: 4, athletics: 2}).pool, 6);
  const one = A.tryBonds(0, {dex: 2, larceny: 1}, seq(die(8), die(3), die(2)));
  assert.equal(one.progress, 1); assert.equal(one.free, false);
  const two = A.tryBonds(2, {dex: 2, larceny: 1}, seq(die(9), die(3), die(2)));
  assert.equal(two.free, true);
  assert.equal(A.tryBonds(2, {dex: 2, larceny: 0}, seq(die(1), die(2))).progress, 0);
});

test("a8: each success gives up a secret", () => {
  assert.equal(A.questionPool({manipulation: 3, intimidation: 2}).words, "Manipulation + Intimidation");
  assert.equal(A.questionPool({manipulation: 3, intimidation: 1, dominate: 3}).words, "Dominate");
  const q = A.question({manipulation: 2, intimidation: 1}, 6, [{id: "a"}, {id: "b"}, {id: "c"}], seq(die(7), die(9), die(4)));
  assert.equal(q.roll.diff, 6);
  assert.deepEqual(q.secrets.map(s => s.id), ["a", "b"]);
});

test("a9: feeding never takes the prisoner to the edge", () => {
  assert.equal(A.feedDraw({hunger: 2, healthLeft: 7}), 2);
  assert.equal(A.feedDraw({hunger: 2, healthLeft: 4}), 1);
  assert.equal(A.feedDraw({hunger: 2, healthLeft: 3}), 0);
});

test("a10: a fate by temper; killing and a player's character ask first", () => {
  assert.equal(A.decideFate({kind: "guild", payer: true}, () => 0).fate, "ransom");
  assert.notEqual(A.decideFate({kind: "guild", payer: false}, () => 0).fate, "ransom");
  const k = A.decideFate({kind: "hunters"}, () => 0.999);
  assert.equal(k.fate, "kill"); assert.equal(k.ask, true);
  assert.equal(A.decideFate({kind: "folk", payer: true, pc: true}, () => 0.5).ask, true);
  assert.equal(A.decideFate({kind: "folk", lawHere: false, swap: false, payer: false}, () => 0).fate, "release");
});

test("a11: a rescue against the captors' Security", () => {
  const r = A.rescueTry({retainers: 2, security: 1}, seq(die(8), die(2), die(3), die(4)));
  assert.equal(r.roll.diff, 7);
  assert.equal(r.freed, true);
});

test("days crossed and health left", () => {
  assert.equal(A.daysCrossed(0, 86399), 0);
  assert.equal(A.daysCrossed(86000, 86500), 1);
  assert.equal(A.daysCrossed(0, 100 * 86400), 14);
  assert.equal(A.healthLeft({bashing: 2, lethal: 1}, 7), 4);
});

test("the container kinds NPC names match WoDX Interactables'", () => {
  const src = fs.readFileSync(new URL("../../modules/wodx-npc/scripts/aftercare.mjs", import.meta.url), "utf8");
  const m = /const CONTAINERS = \{(.+)\};/.exec(src);
  const keys = [...m[1].matchAll(/(\w+): \{label/g)].map(x => x[1]);
  assert.deepEqual(keys.sort(), Object.keys(CONTAINERS).sort());
});
