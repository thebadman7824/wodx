import assert from "node:assert/strict";
import {test} from "node:test";
import * as WR from "../../modules/wodx-chronicle/scripts/world-rules.mjs";
import * as PR from "../../modules/wodx-npc/scripts/passerby-rules.mjs";
import * as PW from "../../modules/wodx-npc/scripts/passerby-world.mjs";
import * as RS from "../../modules/wodx-npc/scripts/resident-rules.mjs";
import {PEOPLE_TABLES, TRADE_SHEETS} from "../../modules/wodx-creation/data/people.mjs";
import {tradesFor} from "../../modules/wodx-creation/data/people-trades-world.mjs";
import {resolveTable} from "../../modules/wodx-chronicle/scripts/gen-core.mjs";

/* Passers-by, residents, clergy and trades by region (Chronicle 0.51.0, NPC 0.51.0, Creation 0.23.0; B2670 to B2673) */

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const banned = /\b(man|woman|men|women|boy|girl|he|she|his|her|him|wife|husband|mother|father)\b/i;

test("every world region has a way of life in every year, and lands change on their dates", () => {
  for ( const id of Object.keys(WR.WORLD_REGIONS) ) for ( const y of [1197, 1500, 1700, 1900, 2000, 2080] ) {
    assert.ok(WR.SPHERES[WR.sphereFor(id, y)], `${id} ${y}`);
  }
  assert.equal(WR.sphereFor("mexico", 1520), "mesoamerican");
  assert.equal(WR.sphereFor("mexico", 1521), "latin");
  assert.equal(WR.sphereFor("aegean", 1452), "orthodox");
  assert.equal(WR.sphereFor("aegean", 1453), "islamic");
  assert.equal(WR.sphereFor("moravia", 1197), "latin");
  assert.equal(WR.sphereFor("nowhere", 1300), "latin", "an unknown region follows Moravia's");
});

test("Moravia's street is unchanged, and other lands get their own people", () => {
  for ( const age of Object.keys(PR.AGES) ) assert.equal(PR.streetTable(PR.AGES[age].from + 1 || 1300, "moravia"), PR.PEOPLE[age]);
  assert.equal(PR.streetTable(1300), PR.PEOPLE.medieval);
  const cairo = PR.streetTable(1300, "egypt");
  assert.ok(cairo.friar.who.includes("dervish") && cairo.water, "a dervish and a water seller in Cairo");
  assert.ok(!/tavern/.test(cairo.reveller.who), "no tavern drunk in Cairo");
  assert.ok(PR.streetTable(1300, "southeast-asia").friar.who.includes("alms"));
  assert.ok(PR.streetTable(1400, "mexico").friar.who.includes("temple priest"));
  const newSpain = PR.streetTable(1600, "mexico");
  assert.equal(newSpain.wagoner, PR.PEOPLE.early.wagoner, "New Spain walks the early modern street");
  assert.ok(newSpain.porter, "with porters of its own (NPC 0.52.0, B2674)");
  assert.ok(PR.streetTable(1995, "india").cleric, "a modern street has the land's clergy");
  assert.ok(!PR.streetTable(1995, "egypt").clubber, "no clubbers in 1995 Cairo");
});

test("every kind of every way of life is gender-neutral, has looks, a category and no em-dashes", () => {
  for ( const [s, ages] of Object.entries(PW.PEOPLE_WORLD) ) {
    assert.ok(WR.SPHERES[s], s);
    for ( const [age, t] of Object.entries(ages) ) for ( const [k, p] of Object.entries(t ?? {}) ) {
      if ( p === null ) continue;
      assert.ok(p.looks.length && typeof p.day === "number" && typeof p.night === "number", `${s}.${age}.${k}`);
      for ( const x of [p.who, ...p.looks] ) { assert.ok(!banned.test(x), `${s}.${age}.${k}: ${x}`); assert.ok(!/—/.test(x)); }
      assert.ok(p.cat, `${s}.${age}.${k} has a category`);
    }
  }
  for ( const id of Object.keys(WR.WORLD_REGIONS) ) for ( const y of [1250, 1650, 1850, 1950, 2000, 2050] ) {
    for ( const h of [3, 12, 20] ) assert.ok(PR.makePasserby({year: y, hour: h, region: id, rng: seq(0.3, 0.6, 0.9)}).kind, `${id} ${y} ${h}`);
  }
});

test("passers-by abroad carry the faith and origin of their region", () => {
  const p = PR.makePasserby({year: 1300, hour: 11, region: "egypt", rng: () => 0.2});
  assert.ok(p.tags.includes("muslim") && p.tags.includes("egypt") && p.tags.includes("arabic"));
  const q = PR.makePasserby({year: 1300, hour: 11, region: "india", rng: () => 0.1});
  assert.ok(q.tags.includes("hindu") && q.tags.includes("india"));
  const r = PR.makePasserby({year: 1700, hour: 11, region: "british-isles", rng: () => 0.1});
  assert.ok(r.tags.includes("protestant"));
  const m = PR.makePasserby({year: 1300, hour: 11, rng: () => 0.2});
  assert.ok(m.tags.includes("catholic") && m.tags.includes("moravian"), "Moravia keeps its old tags");
});

test("clergy take the words of the place's faith, and the right people fill them", () => {
  assert.equal(RS.localClergy("priest", "islamic"), "imam");
  assert.equal(RS.localClergy("monk", "islamic"), "dervish");
  assert.equal(RS.localClergy("priest", "tibetan"), "lama");
  assert.equal(RS.localClergy("nun", "theravada"), "nun");
  assert.equal(RS.localClergy("rabbi", "islamic"), "rabbi", "a synagogue keeps its own");
  assert.equal(RS.localClergy("priest", "western"), "priest");
  assert.equal(RS.localClergy("smith", "hindu"), "smith");
  for ( const words of Object.values(RS.CLERGY) ) assert.equal(RS.presetForTrade(words[0]), "priest", words[0]);
  const plan = RS.planRole({region: "r", kind: "church", household: {trade: "priest", people: [{role: "priest"}]}}, 0, {year: 1300, land: "islamic"});
  assert.equal(plan.trade, "imam");
  assert.equal(plan.roles.church, "r");
  const imam = RS.wantsFor("imam", {year: 1300, region: "egypt"});
  assert.equal(imam.sex, "male");
  assert.ok(imam.origin("arabic") && !imam.origin("greek") && !imam.origin("jewish"));
  const priest = RS.wantsFor("priest", {year: 1300, region: "egypt"});
  assert.ok(priest.origin("greek") && !priest.origin("arabic"), "a Christian priest in Cairo is of a Christian people");
  const lama = RS.wantsFor("lama", {year: 1300, region: "tibet-himalaya"});
  assert.ok(lama.origin("tibetan"));
  // Moravia as before
  assert.ok(RS.wantsFor("priest", {year: 1300}).origin("czech") && !RS.wantsFor("priest", {year: 1300}).origin("jewish"));
});

test("trades by region: each way of life gets its own table, with a sheet for every trade", () => {
  const trades = PEOPLE_TABLES.filter(t => t.id === "people.trade");
  const pick = (culture, era) => resolveTable(trades, "people.trade", {era, culture})?.results.map(r => r.text) ?? [];
  const cairo = pick("egypt", "medieval");
  assert.ok(cairo.includes("imam") && cairo.includes("mamluk") && !cairo.includes("knight") && !cairo.includes("village priest"));
  assert.ok(pick("china", "medieval").includes("Buddhist monk"));
  assert.ok(pick("mexico", "medieval").includes("eagle warrior") && !pick("mexico", "medieval").includes("knight"));
  assert.ok(pick("bohemia", "medieval").includes("knight"), "Bohemia keeps its knights");
  assert.ok(pick("india", "modern").includes("temple priest") && !pick("india", "modern").includes("priest"));
  for ( const t of trades ) for ( const r of t.results ) {
    assert.ok(TRADE_SHEETS[r.text], `${t.name}: ${r.text} has a sheet`);
    assert.ok(!banned.test(r.text) || /man-at-arms/.test(r.text), `${r.text}`);
  }
  assert.deepEqual(tradesFor([{text: "smith"}], "latin", "medieval"), [{text: "smith"}]);
});
