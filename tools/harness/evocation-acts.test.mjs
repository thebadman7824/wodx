import test from "node:test";
import assert from "node:assert/strict";
import * as DE from "../../modules/wodx-actions/scripts/demon-evocations.js";
import * as ACT from "../../modules/wodx-actions/scripts/acts.js";
import * as E from "../../modules/wodx-actions/scripts/effects-rules.js";
import * as PW from "../../modules/wodx-actions/scripts/power-effects.js";
import * as MH from "../../modules/wodx-actions/scripts/mummy-hekau.js";
import * as BR from "../../modules/wodx-actions/scripts/book-rituals.js";
import * as TK from "../../modules/wodx-npc/scripts/talk-rules.mjs";

const kinds = (lore, level, s = 3) => DE.evocationResults(lore, level, s, {faith: 3}).map(r => r.out.kind);

test("B5780: the eleven evocations that only printed text now work", () => {
  assert.deepEqual(kinds("humanity", 5), ["memory"]);
  assert.deepEqual(kinds("celestials", 2), ["vision"]);
  assert.deepEqual(kinds("celestials", 5), ["seize"]);
  assert.deepEqual(kinds("radiance", 4), ["mark"]);
  assert.deepEqual(kinds("awakening", 2), ["cleanse"]);
  assert.deepEqual(kinds("firmament", 4), ["remote"]);
  for ( const lv of [2, 3, 4, 5] ) assert.deepEqual(kinds("paths", lv), ["path"]);
  assert.deepEqual(kinds("fundament", 3), ["damage", "timed"]);
  assert.deepEqual(kinds("flame", 2), ["damage"]);
  assert.deepEqual(kinds("flame", 3), ["damage"]);
  const ops = [2, 3, 4, 5].map(lv => DE.evocationResults("paths", lv, 2, {faith: 2})[0].out.op);
  assert.deepEqual(ops, ["lay", "conceal", "close", "warp"]);
  for ( const k of ["memory", "vision", "seize", "mark", "cleanse", "remote", "path", "detect", "question"] ) assert.ok(ACT.KINDS.has(k), k);
});

test("B5780: the act rules", () => {
  assert.equal(ACT.memoryNet(4, 1), 3);
  assert.equal(ACT.markSpan(1).label, "a day");
  assert.equal(ACT.markSpan(4).label, "a year");
  assert.equal(ACT.markTakes(2, 3), true);
  assert.equal(ACT.markTakes(4, 3, 0), true);
  assert.equal(ACT.markTakes(4, 3, 1), false);
  assert.ok(ACT.AILING.test("Poisoned"));
  assert.ok(!ACT.AILING.test("Blessed"));
});

test("B5788-B5789: Sense and Know do something", () => {
  const [s] = E.stOutcomes(["sense"], {strength: 2});
  assert.equal(s.out.kind, "detect");
  assert.equal(s.out.range, 60);
  const [k] = E.stOutcomes(["know"], {strength: 1});
  assert.equal(k.out.kind, "question");
  const facts = ACT.sheetFacts({type: "Mortal", system: {health: {lethal: 2}, advantages: {willpower: {temporary: 3, permanent: 5}}}, effects: [{name: "Afraid"}]});
  assert.deepEqual(facts, ["kind: Mortal", "hurt: 2 health levels", "Willpower 3 of 5", "under: Afraid"]);
  const scene = {environment: {darknessLevel: 0.9}, grid: {size: 100, distance: 5}, tokens: [{hidden: true, x: 100, y: 0}, {hidden: true, x: 5000, y: 0}], regions: []};
  assert.deepEqual(ACT.sceneFacts(scene, {near: {x: 0, y: 0}, range: 30}), ["night-dark", "1 hidden figure nearby"]);
});

test("B5790: beasts and ghosts talk only with someone who can speak with them", () => {
  assert.equal(TK.speechKind({animal: true}), "beast");
  assert.equal(TK.speechKind({type: "Wraith"}), "ghost");
  assert.equal(TK.speechKind({type: "Mortal"}), null);
  assert.equal(TK.canTalkWith(null, {type: "Mortal"}), true);
  assert.equal(TK.canTalkWith("beast", {type: "Mortal", effects: []}), false);
  assert.equal(TK.canTalkWith("beast", {type: "Mortal", effects: [{name: "Speaks with"}]}), true);
  assert.equal(TK.canTalkWith("beast", {type: "Werewolf"}), true);
  assert.equal(TK.canTalkWith("ghost", {type: "Vampire", effects: [{key: "wodx-effect-speak"}]}), true);
  assert.equal(TK.canTalkWith("ghost", {type: "Wraith"}), true);
  assert.equal(TK.canTalkWith("ghost", {type: "Werewolf"}), false);
});

test("B5787: a chained keyword carries its flavour", () => {
  const {results} = PW.powerOutcomes({keywords: ["speak", "fortune:curse", "boost:sap"]}, 2, {label: "X", hasTarget: true});
  const by = Object.fromEntries(results.map(r => [r.key, r.out]));
  assert.equal(by.fortune.name, "Cursed");
  assert.equal(by.boost.name, "Sapped");
  assert.equal(by.speak.kind, "timed");
});

test("B5791-B5792: every ritual changes the game, none is only a card", () => {
  const INFO_ONLY = new Set(["note"]);
  let n = 0;
  for ( const set of Object.values(BR.BOOK_RITUALS) ) for ( const r of set.rituals ?? set.list ?? [] ) {
    n++;
    const {results} = PW.powerOutcomes({keywords: r.k}, 2, {label: r.n, hasTarget: true});
    assert.ok(results.some(x => !INFO_ONLY.has(x.out.kind) || ["sway", "imbue", "banish", "place", "work", "summon"].includes(x.key)), `${r.n}: ${r.k}`);
  }
  assert.ok(n > 300, `book rituals ${n}`);
  for ( const [id, sp] of Object.entries(MH.SPELLS) ) {
    if ( sp.type !== "ritual" ) continue;
    const res = MH.hekauResults(id, 2, {name: sp.name});
    assert.ok(res.length, id);
    assert.ok(!res.some(x => x.st && x.key !== "summon"), `${id} is still the Storyteller's alone`);
  }
});

test("B5791: the K and P spec kinds", () => {
  const w = MH.hekauResults("simple-weather-magic", 2, {name: "Simple Weather Magic"});
  assert.equal(w[0].out.kind, "weather");
  assert.equal(w[0].out.weather, "fog");
  const t = MH.hekauResults("tears-of-isis", 3, {name: "Tears of Isis"});
  assert.equal(t[0].out.kind, "pool");
  assert.equal(t[0].out.pool, "sekhem");
  assert.equal(t[0].out.points, 3);
  const n = MH.hekauResults("name-the-secret", 2, {name: "Name the Secret"}).map(r => r.out.kind);
  assert.deepEqual(n, ["question", "timed"]);
});
