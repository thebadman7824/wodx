import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Sickness that spreads from town to town and person to person (Storyteller, B3260-B3266) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/contagion-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const never = () => 0.99, always = () => 0;

test("every disease has a rating, a difficulty, a book or rated-beside reference and a note", () => {
  for ( const [id, d] of Object.entries(R.DISEASES) ) {
    assert.ok(d.rating >= 1 && d.rating <= 7, id);
    assert.ok([6, 7, 8, 9].includes(d.diff), id);
    assert.ok(["bashing", "lethal"].includes(d.dmg), id);
    assert.match(d.ref, /M20 p\. 442|CP2020/, id);
    assert.ok(d.note.length > 20 && !/—/.test(d.note), id);
    assert.ok(d.attack > 0 && d.attack < 1 && d.death >= 0 && d.death < 1 && d.weeks >= 4, id);
  }
  // The book's own ratings (M20 p. 442)
  assert.deepEqual([R.DISEASES.plague.rating, R.DISEASES.plague.diff, R.DISEASES.plague.dmg], [6, 9, "lethal"]);
  assert.deepEqual([R.DISEASES.cholera.rating, R.DISEASES.cholera.diff, R.DISEASES.cholera.dmg], [5, 8, "bashing"]);
  assert.deepEqual([R.DISEASES.influenza.rating, R.DISEASES.influenza.diff], [3, 7]);
  assert.deepEqual([R.DISEASES.ebola.rating, R.DISEASES.ebola.diff], [7, 9]);
  assert.ok(R.DISEASES.hiv.blood && R.DISEASES.plague.blood && !R.DISEASES.cholera.blood);
});

test("history names only real regions, years from 1197 to 2022 and real diseases", () => {
  const ids = new Set(Object.keys(WR.WORLD_REGIONS));
  const keys = new Set();
  for ( const h of R.HISTORY ) {
    assert.ok(R.DISEASES[h.disease], h.id);
    for ( const [r, y] of h.at ) {
      assert.ok(ids.has(r), `${h.id} ${r}`);
      assert.ok(y >= 1197 && y <= 2022, `${h.id} ${y}`);
      const k = `${h.id}:${r}:${y}`;
      assert.ok(!keys.has(k), k); keys.add(k);
    }
  }
  for ( const r of Object.keys(R.CONTACT) ) assert.ok(ids.has(r), r);
  for ( const list of Object.values(R.HOMES) ) for ( const r of list ) assert.ok(ids.has(r), r);
});

test("the whole world and every era meets a sickness of its time", () => {
  // Every inhabited region gets at least one historic outbreak
  for ( const r of Object.keys(WR.WORLD_REGIONS).filter(x => x !== "antarctica") ) assert.ok(R.HISTORY.some(h => h.at.some(([x]) => x === r)), r);
  for ( const y of [1197, 1350, 1500, 1650, 1800, 1900, 1990, 2020] ) assert.ok(R.diseasesFor(y, "moravia").length >= 4, `${y}`);
  assert.ok(R.diseasesFor(2050, "moravia", {future: true}).includes("bioplague"));
  assert.ok(!R.diseasesFor(1300, "moravia").includes("bioplague"));
  // The great dying: no smallpox in the Americas before contact; far worse in the century after
  assert.ok(!R.canBreakOut("smallpox", "mexico", 1500));
  assert.ok(R.canBreakOut("smallpox", "mexico", 1520));
  assert.ok(R.virginSoil("smallpox", "mexico", 1520).death > 1);
  assert.equal(R.virginSoil("smallpox", "mexico", 1700).death, 1);
  assert.equal(R.virginSoil("plague", "mexico", 1520).death, 1);
  // Sicknesses of their own years and lands
  assert.ok(!R.canBreakOut("cholera", "moravia", 1700) && R.canBreakOut("cholera", "moravia", 1831));
  assert.ok(!R.canBreakOut("sweat", "china", 1500) && R.canBreakOut("sweat", "british-isles", 1500));
  assert.ok(!R.canBreakOut("smallpox", "moravia", 1990), "smallpox is gone after 1977");
  assert.ok(!R.canBreakOut("yellow-fever", "scandinavia", 1800));
});

test("an outbreak in a town rises, peaks a third of the way in and wanes", () => {
  let s = 0;
  for ( let i = 1; i <= 26; i++ ) s += R.weekShare(i, 26);
  assert.ok(Math.abs(s - 1) < 1e-9);
  assert.deepEqual([1, 5, 9, 20, 27].map(w => R.phaseOf(w, 26)), ["arriving", "rising", "height", "waning", "over"]);
  let o = R.newOutbreak({market: "brno", disease: "plague", year: 1350, region: "moravia", scale: 0.4});
  assert.ok(Math.abs(o.attack - 0.14) < 1e-9);
  for ( let i = 0; i < 26; i++ ) o = R.advance(o).outbreak;
  assert.ok(Math.abs(o.sick - o.attack) < 0.01);
  assert.ok(Math.abs(o.dead - o.attack * o.death) < 0.01);
  assert.equal(R.advance(o).phase, "over");
  assert.equal(R.normOutbreak({market: "x", disease: "nothing"}), null);
});

test("the week spreads it along links and caravans, less in quarantine, never to an immune or sick town", () => {
  const markets = [{id: "a", links: ["b", "c"], cut: false}, {id: "b", links: ["a"], cut: false}, {id: "c", links: ["a"], cut: false}, {id: "d", links: [], cut: false}];
  let st = R.blankState();
  st.towns.a = {...R.newOutbreak({market: "a", disease: "typhus", year: 1900}), week: 4};
  assert.equal(R.spreadWeek(st, markets, {rng: never}).length, 0);
  const hit = R.spreadWeek(st, markets, {rng: always, routes: [{from: "a", to: "d"}], year: 1900});
  assert.deepEqual(hit.map(t => t.to).sort(), ["b", "c", "d"]);
  // Quarantine cuts the chance to a sixth
  const open = R.spreadChance(st.towns.a, {year: 1900}), shut = R.spreadChance(st.towns.a, {year: 1900, quarantine: true});
  assert.ok(Math.abs(shut - open / 6) < 0.002);
  // Railways and aircraft carry it faster; winter favours typhus
  assert.ok(R.spreadChance(st.towns.a, {year: 1960}) > R.spreadChance(st.towns.a, {year: 1700}));
  assert.ok(R.spreadChance(st.towns.a, {season: "winter"}) > R.spreadChance(st.towns.a, {season: "summer"}));
  // Immune or already sick towns are passed over
  st.immune.b = {typhus: 10 * R.WEEK};
  st.towns.c = R.newOutbreak({market: "c", disease: "plague"});
  assert.deepEqual(R.spreadWeek(st, markets, {rng: always, now: 0}).map(t => t.to), []);
  // A finished outbreak leaves the town immune for two years, and immunity runs out
  st = R.blankState();
  st.towns.a = {...R.newOutbreak({market: "a", disease: "flux"}), week: 6};
  const w = R.weekTowns(st, {now: 100});
  assert.equal(w.rows[0].phase, "over");
  assert.ok(!w.state.towns.a && R.isImmune(w.state, "a", "flux", 101));
  assert.ok(!R.isImmune(R.weekTowns(w.state, {now: 100 + R.IMMUNE_WEEKS * R.WEEK}).state, "a", "flux", 100 + R.IMMUNE_WEEKS * R.WEEK));
});

test("seasons turn round in the south and stand still in the tropics", () => {
  assert.equal(R.seasonOf(7, 50), "summer");
  assert.equal(R.seasonOf(7, -35), "winter");
  assert.equal(R.seasonOf(1, -35), "summer");
  assert.equal(R.seasonOf(7, 2), "warm");
});

test("history offers each arrival once, to a clean town of that land", () => {
  const markets = [{id: "brno", links: []}, {id: "olomouc", links: []}, {id: "paris", links: []}];
  const regionOf = id => (id === "paris" ? "france" : "moravia");
  const st = R.blankState();
  const due = R.seedsDue(st, markets, {regionOf, year: 1350});
  assert.deepEqual(due.map(d => [d.market, d.disease]).sort(), [["brno", "plague"], ["paris", "plague"]]);
  assert.equal(due.find(d => d.market === "brno").scale, 0.4, "the crown lands were lightly struck");
  st.seeded = due.map(d => d.key);
  assert.equal(R.seedsDue(st, markets, {regionOf, year: 1350}).length, 0);
  st.towns.brno = R.newOutbreak({market: "brno", disease: "cholera"});
  assert.equal(R.seedsDue(R.blankState(), markets, {regionOf, year: 1831}).find(d => d.market !== "paris").market, "brno");
  assert.equal(R.historicHere("mexico", 1520).disease, "smallpox");
  assert.equal(R.historicHere("moravia", 1200), null);
});

test("towns feel it: prices, supply, crowds and the hunt", () => {
  const o = {...R.newOutbreak({market: "a", disease: "plague"}), week: 9};
  assert.equal(R.phaseOf(9, 26), "height");
  const h = R.marketHit(o);
  assert.equal(h.supply.food, "short");
  assert.ok(h.index.medicine >= 2 && h.crowd === "quiet");
  assert.equal(R.marketHit({...o, week: 1}), null, "nobody believes it yet");
  assert.equal(R.marketHit({...R.newOutbreak({market: "a", disease: "leprosy"}), week: 10}), null, "a slow sickness moves no prices");
  const hunt = R.huntHit(o);
  assert.equal(hunt.diff, -1);
  assert.ok(hunt.blood && hunt.name === "Plague" && hunt.note.length > 20);
  assert.match(R.describe(o, "Brno"), /^Plague in Brno: at its height, week 9/);
});

test("a sick character rolls each week: the rating as damage on a failure, a slow sickness monthly", () => {
  let x = {disease: "cholera", since: 0, weeks: 0, held: 0, where: "Brno"};
  const fail = R.illnessWeek(x, {successes: 0});
  assert.deepEqual([fail.damage, fail.dmg, fail.over], [5, "bashing", true], "cholera runs its course in a week");
  x = {disease: "smallpox", since: 0, weeks: 0, held: 0};
  const ok = R.illnessWeek(x, {successes: 2});
  assert.equal(ok.damage, 0);
  assert.equal(ok.illness.held, 1);
  // Two good weeks in a row end a bashing sickness early
  const m1 = R.illnessWeek({disease: "malaria", weeks: 0, held: 0}, {successes: 1});
  assert.ok(R.illnessWeek(m1.illness, {successes: 1}).over);
  // A slow sickness strikes every fourth week and never ends by itself
  const lep = {disease: "leprosy", weeks: 0, held: 0};
  assert.ok(!R.strikesThisWeek(lep));
  assert.equal(R.illnessWeek(lep, null).damage, 0);
  assert.ok(R.strikesThisWeek({...lep, weeks: 3}));
  assert.equal(R.illnessWeek({...lep, weeks: 3}, {successes: 0}).damage, 4);
  assert.equal(R.illnessWeek({...lep, weeks: 3}, {successes: 5}).over, false);
  assert.ok(R.exposeChance({...R.newOutbreak({market: "a", disease: "plague"}), week: 9}) > 0.5);
});

test("the town turn takes its sickness from the towns' own outbreaks when they spread (B3267)", async () => {
  const TR = await imp("modules/wodx-storyteller/scripts/town-rules.mjs");
  const o = {...R.newOutbreak({market: "brno", disease: "plague"}), week: 9};
  const h = R.townHit(o);
  assert.equal(h.name, "Plague");
  assert.ok(h.dead > 0.005 && h.dead < 0.05 && h.pressure === 1);
  assert.equal(R.townHit({...o, week: 0}), null);
  const markets = [{id: "brno", name: "Brno", links: []}, {id: "jihlava", name: "Jihlava", links: []}];
  const st0 = {v: 1, towns: {brno: TR.newTown(markets[0], {people: 10000}), jihlava: TR.newTown(markets[1], {people: 10000})}};
  const r = TR.weekTowns(st0, markets, {year: 1350, regionOf: () => "moravia", randFor: () => () => 0.99, sickFor: m => (m.id === "brno" ? h : null)});
  assert.equal(r.state.towns.brno.struck?.name, "Plague");
  assert.ok(r.state.towns.brno.people < r.state.towns.jihlava.people - 50, "the sick town loses its dead");
  assert.equal(r.state.towns.jihlava.struck, null, "no plague by year while the towns' own sickness rules");
  // With the sickness gone the town is clear again
  const r2 = TR.weekTowns(r.state, markets, {year: 1350, regionOf: () => "moravia", randFor: () => () => 0.99, sickFor: () => null});
  assert.equal(r2.state.towns.brno.struck, null);
  // Left out, the outbreaks by year still strike (a sure roll in 1348 in France)
  const r3 = TR.weekTowns(st0, markets, {year: 1348, regionOf: () => "france", randFor: () => () => 0});
  assert.ok(r3.state.towns.brno.struck);
});

test("normState keeps only good entries", () => {
  const s = R.normState({towns: {a: {disease: "plague", week: 3}, b: {disease: "nope"}}, immune: {a: {plague: 5, nope: 3}}, people: {p: {disease: "typhus"}, q: {disease: "x"}}, seeded: ["k", "k"]});
  assert.deepEqual(Object.keys(s.towns), ["a"]);
  assert.deepEqual(s.immune, {a: {plague: 5}});
  assert.deepEqual(Object.keys(s.people), ["p"]);
  assert.deepEqual(s.seeded, ["k"]);
});

test("Foundry side: weekly after the market turn, hunt reads the town, the Markets window opens it, the api is there", () => {
  const turn = src("modules/wodx-storyteller/scripts/market-turn.mjs");
  assert.match(turn, /Contagion\.weekRun\(\{weeks, left: departed\}\)/);
  const up = src("modules/wodx-storyteller/scripts/upkeep.mjs");
  assert.match(up, /const outbreak = outbreakHere\(scene\)/);
  assert.match(up, /contagion\?\.here\?\.\(scene\)/);
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const s of ["Contagion.registerContagionSettings()", "Contagion.registerApproval()", "Contagion.setupContagion()", "contagion: Contagion.api()"] ) assert.ok(main.includes(s), s);
  assert.match(src("modules/wodx-storyteller/scripts/markets.mjs"), /action: "sickness"/);
  const c = src("modules/wodx-storyteller/scripts/contagion.mjs");
  assert.match(c, /data-action="wst-contagion-undo"/);
  assert.match(c, /searchBox\(/);
  for ( const m of c.matchAll(/<select [^>]*>/g) ) assert.match(m[0], /data-fixed/, m[0]);
  assert.ok(!/house rule/i.test(c), "no meta words in game text");
});
