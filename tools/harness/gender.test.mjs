// One gender for every module (B3500-B3503): what is recorded, what a rule may use, players untouched, 1 in 100 nonbinary.
import {test} from "node:test";
import assert from "node:assert/strict";
import * as G from "../../modules/wodx-chronicle/scripts/gender-rules.mjs";
import * as W from "../../modules/wodx-storyteller/scripts/will-rules.mjs";
import * as PR from "../../modules/wodx-creation/scripts/people-rules.mjs";

test("gender: written forms made plain", () => {
  assert.equal(G.normalize("F"), "female"); assert.equal(G.normalize("woman"), "female"); assert.equal(G.normalize("Male"), "male");
  assert.equal(G.normalize("non-binary"), "nonbinary"); assert.equal(G.normalize("  "), ""); assert.equal(G.normalize(null), "");
  assert.equal(G.normalize("Two-spirit"), "Two-spirit"); assert.equal(G.normalize("x".repeat(60)).length, 40);
});

test("gender: every old record is read, the newest first", () => {
  assert.equal(G.recorded({flags: {"wodx-creation": {people: {sex: "male"}}}}), "male", "the People generator");
  assert.equal(G.recorded({flags: {"wodx-creation": {sex: "female"}}}), "female", "a baby born in play");
  assert.equal(G.recorded({flags: {"wodx-creation": {chronology: {sex: "male"}}}}), "male", "wills");
  assert.equal(G.recorded({flags: {"wodx-paperdoll": {look: {face: {gender: "woman"}}}}}), "female", "the portrait");
  assert.equal(G.recorded({flags: {"wodx-chronicle": {gender: "nonbinary"}, "wodx-creation": {people: {sex: "male"}}}}), "nonbinary", "the sheet's own line first");
  assert.equal(G.recorded({}), "");
});

test("gender: a rule sees female or male only, and nothing for a player character", () => {
  const npc = {flags: {"wodx-creation": {people: {sex: "female"}}}};
  assert.equal(G.forRules(npc), "female");
  assert.equal(G.forRules(npc, {player: true}), "", "a player character's gender has no bearing on play");
  assert.equal(G.forRules({flags: {"wodx-chronicle": {gender: "nonbinary"}}}), "");
  assert.equal(G.forRules({flags: {"wodx-chronicle": {gender: "Two-spirit"}}}), "");
  assert.equal(G.letter("female"), "f"); assert.equal(G.letter("male"), "m"); assert.equal(G.letter(""), "");
});

test("inheritance: a player character ('any') takes a son's place under every law", () => {
  const kids = [{id: "a", name: "A", sex: "female", born: 1200}, {id: "b", name: "B", sex: "any", born: 1202}];
  const r = W.settle({law: {key: "eldest"}, kin: {children: kids}});
  const share = id => r.shares.find(s => s.id === id)?.share ?? 0;
  assert.ok(share("b") > share("a"), JSON.stringify(r.shares));
});

test("the People generator: 1 in 100 nonbinary, and everyone drawn before keeps their sex and name side", () => {
  let n = 0, nb = 0;
  for ( let i = 0; i < 20000; i++ ) {
    let x = (i * 2654435761 % 4294967296) / 4294967296; const rand = () => { const v = x; x = (x * 9301 + 0.49297) % 1; return v; };
    const r0 = rand(); x = (i * 2654435761 % 4294967296) / 4294967296;
    const s = PR.person({rand, tables: () => null, era: "medieval", culture: "moravian"}).sex; n++;
    if ( s === "nonbinary" ) { nb++; assert.ok(Math.abs(r0 - 0.5) < PR.NONBINARY_HALF); }
    else assert.equal(s, r0 < 0.5 ? "female" : "male");
  }
  assert.ok(nb / n > 0.004 && nb / n < 0.02, `${nb} of ${n}`);
});
