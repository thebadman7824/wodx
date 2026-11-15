import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-chronicle/scripts/ghoul-need-rules.mjs";

/* A ghoul going without vitae (B5050 to B5054) */

const ds = () => [{id: "p", name: "Potence", value: 2}, {id: "c", name: "Celerity", value: 1}, {id: "f", name: "Fortitude", value: 1}];

test("each month unfed takes the month's vitae, then Disciplines, Potence last", () => {
  assert.deepEqual(R.drain({months: 1, warned: 0, monthly: 1, pool: 5, disciplines: ds()}), {pool: 4, taken: 1, cuts: [], empty: false});
  assert.equal(R.drain({months: 1, monthly: 2, pool: 5}).pool, 3, "the very large need two a month");
  const r = R.drain({months: 5, warned: 0, monthly: 1, pool: 2, disciplines: ds()});
  assert.equal(r.pool, 0);
  assert.equal(r.taken, 2);
  assert.deepEqual(r.cuts.map(c => `${c.name} ${c.from}>${c.to}`).sort(), ["Celerity 1>0", "Fortitude 1>0", "Potence 2>1"]);
  assert.equal(R.drain({months: 2, warned: 2, pool: 3}).taken, 0, "months already taken are not taken again");
});

test("the craving roll: difficulty 7, ones cancel, a botch must feed (V20 Dark Ages p. 401)", () => {
  assert.equal(R.craving([7, 8, 2]).result, "held");
  assert.equal(R.craving([7, 1]).result, "craves");
  assert.equal(R.craving([2, 1, 3]).result, "botch");
  assert.equal(R.craving([2, 3]).result, "craves");
});

test("an animal with its vitae gone ages a year a week, dies past its span, dust past twice that", () => {
  const base = {ageAtGhouling: 6, heldOff: 40, emptySince: 0, span: 13};
  assert.equal(R.ageing({...base, now: R.WEEK * 3}).state, "alive");
  assert.equal(R.ageing({...base, now: R.WEEK * 7}).state, "dead");
  assert.equal(R.ageing({...base, now: R.WEEK * 20}).state, "dust");
  assert.equal(R.ageing({...base, heldOff: 2, now: R.WEEK * 50}).state, "alive", "it only catches up with the years it held off");
  assert.equal(R.ageing({...base, emptySince: null, now: R.WEEK * 50}).age, 6);
});

import * as NR from "../../modules/wodx-npc/scripts/npc-rules.mjs";
import * as O from "../../modules/wodx-npc/scripts/order-rules.mjs";

const foe = (more = {}) => ({id: "e1", name: "Foe", visible: true, distance: 1, reach: true, wounds: 0, fearSources: [], attackDice: 4, ...more});

test("an animal ghoul frenzies on an animal's triggers, with five or more vitae in it (B5056)", () => {
  const hound = NR.profileOf({}, "hound");
  const opts = (self, allies = []) => NR.scoreOptions(hound, {self: {wounds: 0, ...self}, enemies: [foe()], allies});
  const master = [{id: "m", name: "Master", hurt: 1, isDomitor: true, attackerIds: ["e1"]}];
  const fr = o => o.find(x => x.action === "frenzy" && x.animal);
  assert.ok(fr(opts({animalGhoul: true, blood: 6}, master)), "its master is attacked");
  assert.match(fr(opts({animalGhoul: true, blood: 6}, master)).why, /master is attacked/);
  assert.ok(fr(opts({animalGhoul: true, blood: 6, wounds: 3})), "badly hurt");
  assert.ok(!fr(opts({animalGhoul: true, blood: 4}, master)), "under five vitae: no frenzy");
  assert.ok(!fr(opts({animalGhoul: false, blood: 6}, master)), "a plain animal: no ghoul frenzy");
  assert.ok(!fr(opts({animalGhoul: true, blood: 6})), "nothing to set it off");
});

test("a blood-bound animal ghoul holds to its master unless mistreated (B5055)", () => {
  assert.equal(O.drift("unfed", {step: 1, months: 1, animal: true, bound: true}), null, "a month unfed: it stays Friendly");
  assert.equal(O.drift("unfed", {step: 1, months: 2, animal: true, bound: true}).delta, -1, "two months unfed: it slips");
  assert.equal(O.drift("fedOn", {step: 1, animal: true, bound: true}).delta, -1, "fed on by its master: it slips");
  assert.equal(O.drift("unfed", {step: 1, months: 1, animal: true, bound: false}).delta, -1, "not yet bound: drifts as any follower");
  assert.equal(O.drift("unfed", {step: 0, months: 1, animal: true, bound: true}), null, "already under the floor: never raised, never lowered by a month");
  assert.equal(O.drift("unfed", {step: 1, months: 1}).delta, -1, "a person drifts as before");
});
