import {test} from "node:test";
import assert from "node:assert/strict";
import * as N from "../../modules/wodx-storyteller/scripts/naval-rules.mjs";

const all = f => k => Array(k).fill(f);
const seq = faces => { let i = 0; return k => Array.from({length: k}, () => faces[i++ % faces.length]); };
const pair = (a, b, extra = {}) => N.normFight({ships: [{type: a, name: "Swift"}, {type: b, name: "Slow"}], ...extra});

test("ships: the book's seven, every era has ships, the future branch", () => {
  for ( const id of ["longship", "smallCog", "largeCog", "dromon", "sagitta", "tarida", "qayiq"] ) assert.ok(N.SHIPS[id] && !N.SHIPS[id].house, id);
  assert.equal(N.SHIPS.dromon.crew, 180);
  assert.equal(N.SHIPS.largeCog.health, 14);
  for ( const y of [1197, 1300, 1450, 1600, 1750, 1880, 1916, 1944, 1999, 2040] ) assert.ok(N.shipsFor(y).length >= 2, String(y));
  assert.ok(!N.shipsFor(2040).some(s => s.id === "droneCorvette"));
  assert.ok(N.shipsFor(2040, "future").some(s => s.id === "droneCorvette"));
  for ( const s of Object.values(N.SHIPS) ) for ( const [a] of s.arms ) assert.ok(N.armOf(a), a);
  assert.equal(N.armOf("mangonel").gun, false);
  assert.equal(N.armOf("turret").gun, true);
});

test("normFight keeps fields in range and drops strangers", () => {
  const f = N.normFight({ships: [{type: "nope", damage: 99, helm: 40}], gap: -5, junk: 1});
  assert.equal(f.ships[0].type, "smallCog");
  assert.equal(f.ships[0].damage, N.SHIPS.smallCog.health);
  assert.equal(f.ships[0].helm, 15);
  assert.equal(f.gap, 0);
  assert.equal(f.junk, undefined);
  assert.equal(f.ships[1].crew, N.SHIPS.smallCog.crew);
});

test("damage costs Speed and Maneuverability; below 0 Speed a ship floods", () => {
  const s = N.normShip({type: "smallCog", damage: 4});
  const st = N.stateOf(s);
  assert.equal(st.speed, -1);
  assert.equal(st.maneuver, -3);
  assert.ok(st.flooding);
  const f = N.quarter(N.normFight({ships: [s, {type: "smallCog"}]}), all(5));
  assert.equal(f.ships[0].damage, 5);
  assert.equal(f.elapsed, N.QUARTER);
  assert.equal(f.ships[1].damage, 0);
});

test("the chase: 500 yards a point; a quarry 5,000 yards off gets away; oars tire", () => {
  // both roll the same faces, so only Speed counts: sagitta 5 against large cog 3
  let f = pair("sagitta", "largeCog", {gap: 2000});
  f = N.pursue(f, 0, all(10));
  assert.equal(f.gap, 1000);
  assert.equal(f.elapsed, N.WATCH);
  f = N.pursue(f, 0, all(10));
  f = N.pursue(f, 0, all(10));
  assert.equal(f.gap, 0);
  assert.match(f.log.at(-1).words, /alongside/);
  let g = pair("largeCog", "sagitta", {gap: 4000});
  g = N.pursue(g, 0, all(10));
  assert.ok(g.over && /gets away/.test(g.over.text));
  let r = N.normFight({ships: [{type: "dromon", rowing: true, push: 1}, {type: "largeCog"}]});
  assert.equal(N.stateOf(r.ships[0]).speed, 4);
  r = N.pursue(r, 0, all(10));
  assert.equal(r.ships[0].rowed, 7);
  r = N.pursue(r, 0, all(10));
  assert.equal(r.ships[0].rowed, 14);
  assert.equal(N.stateOf(r.ships[0]).speed, 3, "past 12 hours the ship is back to its sails");
});

test("the turn for position and navigation", () => {
  const f = N.manoeuvre(pair("sagitta", "largeCog"), seq([7, 7, 7, 7, 7, 3, 3, 3, 3, 3]));
  assert.equal(f.initiative, 0);
  assert.equal(f.edge, 5);
  const g = N.navigate(pair("smallCog", "smallCog"), 0, {land: false}, all(8));
  assert.match(g.log.at(-1).words, /lost its bearings/);
  assert.match(g.log.at(-1).dice, /at 9/);
  const h = N.navigate(pair("smallCog", "smallCog"), 0, {land: false, compass: true, pilot: true}, all(8));
  assert.match(h.log.at(-1).words, /holds its course/);
});

test("shooting: engines against soak, guns by range, torpedoes", () => {
  // all tens: every attack hits, damage dice all succeed, soak all succeed
  const f = N.fire(pair("dromon", "longship"), 0, {}, all(10));
  const want = (14 + 4 - 1 - 4) + 2 * (10 + 4 - 1 - 4);
  assert.equal(f.ships[1].damage, Math.min(N.SHIPS.longship.health, want));
  assert.ok(f.ships[1].sunk);
  assert.ok(f.over && /goes down/.test(f.over.text));
  const none = N.fire(pair("longship", "dromon"), 0, {}, all(10));
  assert.match(none.log.at(-1).words, /nothing to shoot/);
  const miss = N.fire(N.normFight({year: 1916, ships: [{type: "destroyer"}, {type: "cruiser"}]}), 0, {range: "long"}, all(6));
  assert.equal(miss.ships[1].damage, 0, "sixes miss at long range even with fire direction (7)");
  const torp = N.fire(N.normFight({ships: [{type: "torpedoBoat"}, {type: "cruiser", helm: 1}]}), 0, {only: "torpedo"}, all(7));
  assert.ok(torp.ships[1].damage > 0, "a 7 hits, the dodge at 8 fails");
});

test("ramming: only alongside; a ship built to ram hurts more and takes less", () => {
  const far = N.ram(pair("ironclad", "frigate", {gap: 300}), 0, all(10));
  assert.equal(far.ships[1].damage, 0);
  assert.match(far.log.at(-1).words, /too far/);
  // the rammer wins 5 to 0 (sevens against threes), damage at 5 all succeed, soak at 6 all fail
  const faces = [7, 7, 7, 7, 7, 3, 3, 3, 3, 3, 3, ...Array(25).fill(5), ...Array(30).fill(3)];
  const f = N.ram(N.normFight({gap: 0, ships: [{type: "ironclad", helm: 5}, {type: "frigate", helm: 6}]}), 0, seq(faces));
  assert.equal(f.ships[1].damage, N.SHIPS.frigate.health, "25 dice at 5 against a frigate");
  assert.ok(f.ships[1].sunk);
  const turn = N.ram(N.normFight({gap: 0, ships: [{type: "galleon"}, {type: "galleon"}]}), 0, seq([3, 3, 3, 3, 3, 7, 7, 7, 7, 7]));
  assert.match(turn.log.at(-1).words, /turns aside/);
});

test("breaking away: the first to 5", () => {
  const f = N.breakAway(N.normFight({gap: 0, ships: [{type: "frigate", helm: 5}, {type: "galleon", helm: 5}]}), 0, seq([7, 7, 7, 7, 7, 2, 2, 2, 2, 2]));
  assert.equal(f.gap, 200);
  assert.match(f.log.at(-1).words, /breaks away/);
});

test("repair: an extended roll that mends a level", () => {
  let f = N.normFight({ships: [{type: "largeCog", damage: 3}, {type: "smallCog"}]});
  f = N.quarter(f, all(6), {repair: [true, false], pool: [2, 3], helpers: [0, 0]});
  assert.equal(f.ships[0].repair, 2);
  assert.equal(f.ships[0].damage, 3);
  f = N.quarter(f, all(6), {repair: [true, false], pool: [2, 3], helpers: [1, 0]});
  assert.equal(f.ships[0].damage, 2);
  assert.equal(f.ships[0].repair, 0);
  assert.match(f.log.at(-1).words, /patch it up/);
});

test("boarding: the defenders yield when half are down and outnumbered two to one", () => {
  let f = N.normFight({gap: 0, ships: [{type: "dromon"}, {type: "smallCog"}]});
  f = N.boarding(f, [10, 10]);
  assert.ok(!f.over);
  f = N.boarding(f, [0, 10]);
  assert.ok(f.over && /strikes its colours/.test(f.over.text));
  assert.ok(f.ships[1].struck);
  assert.ok(N.yields(f, 1));
  assert.ok(!N.yields(f, 0));
});

test("undo takes back each step, the end of the fight included", () => {
  let f = pair("dromon", "longship");
  const start = JSON.stringify({ships: f.ships, gap: f.gap});
  f = N.pursue(f, 0, all(10));
  f = N.fire(f, 0, {}, all(10));
  assert.ok(f.over);
  f = N.undo(f);
  assert.equal(f.over, null);
  assert.equal(f.ships[1].damage, 0);
  assert.equal(f.log.length, 1);
  f = N.undo(f);
  assert.equal(JSON.stringify({ships: f.ships, gap: f.gap}), start);
  assert.equal(f.elapsed, 0);
  assert.equal(N.undo(f), f);
});

test("a long soak of random fights stays in range and the words stay neutral", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const draw = k => Array.from({length: k}, () => 1 + Math.floor(rnd() * 10));
  const ids = Object.keys(N.SHIPS);
  for ( let t = 0; t < 60; t++ ) {
    let f = N.normFight({gap: 1000, ships: [{type: ids[t % ids.length]}, {type: ids[(t * 7 + 3) % ids.length]}]});
    for ( let s = 0; s < 30 && !f.over; s++ ) {
      const k = s % 7;
      f = k === 0 ? N.pursue(f, 0, draw) : k === 1 ? N.manoeuvre(f, draw) : k === 2 ? N.fire(f, s % 2, {}, draw) : k === 3 ? N.ram(f, 0, draw)
        : k === 4 ? N.quarter(f, draw, {repair: [true, true]}) : k === 5 ? N.boarding(f, [3, 5]) : N.breakAway(f, 1, draw);
      f = N.normFight(JSON.parse(JSON.stringify(f)));
      for ( const sh of f.ships ) assert.ok(sh.damage >= 0 && sh.damage <= N.SHIPS[sh.type].health);
      assert.ok(f.gap >= 0 && f.history.length <= 20 && f.log.length <= 80);
      for ( const l of f.log ) assert.doesNotMatch(l.words, /\b(he|she|his|her|him|hers)\b/i, l.words);
    }
  }
  assert.ok(N.normNaval({list: Array(70).fill({})}).list.length <= N.NAVAL_CAP);
});
