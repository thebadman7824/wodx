import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Living caerns: level, sept and offices, moots, raids, caern wars (Storyteller, B3470-B3476) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const C = await imp("modules/wodx-storyteller/scripts/caern-rules.mjs");
const P = await imp("modules/wodx-storyteller/scripts/power-rules.mjs");
const M = C.MONTH, D = C.DAY;
/** Dice that always land on one face: 0.95 is a 10, 0.0 is a 1, 0.45 is a 5. */
const always = v => () => v;
const seq = list => { let i = 0; return () => list[i++ % list.length]; };

test("level sets the Gauntlet, the Moon Bridge reach and the moot's Gnosis (W20 pp. 206, 311)", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(C.gauntletFor), [4, 4, 3, 3, 2]);
  assert.deepEqual([1, 2, 3, 4, 5].map(C.bridgeMiles), [1000, 2000, 3000, 6000, 10000]);
  assert.equal(C.mootNeed(3), 15);
  assert.equal(Object.keys(C.CAERN_TYPES).length, 12);
  const c = C.normCaern({level: 9, type: "nonsense", offices: {rite: "a", bogus: "b"}});
  assert.equal(c.level, 5); assert.equal(c.type, "gnosis"); assert.deepEqual(c.offices, {rite: "a"});
  assert.ok(C.normCaern({type: "urban"}).urban);
});

test("the Master of the Rite is the highest-ranking Theurge; office notes", () => {
  const g = [{id: "a", name: "A", auspice: "Ahroun", rank: 5}, {id: "b", name: "B", auspice: "Theurge", rank: 2}, {id: "c", name: "C", auspice: "theurge", rank: 4}];
  assert.equal(C.masterOfTheRite(g), "c");
  const notes = C.officeNotes({offices: {rite: "a", warder: "b"}}, g);
  assert.ok(notes.some(n => /A is Master of the Rite but not a Theurge/.test(n)));
  assert.ok(notes.some(n => /B holds Warder below Adren/.test(n)));
});

test("the Moot Rite fills the caern; a year of full moots readies it to grow", () => {
  let c = C.normCaern({level: 2, lastMoot: 0});
  let r = C.holdMoot(c, [{id: "a", gnosis: 4}, {id: "b", gnosis: 9}], M);
  assert.ok(r.ok && r.full); assert.equal(r.given, 10);
  assert.deepEqual(r.takes, [{id: "a", give: 4}, {id: "b", give: 6}]);
  assert.equal(r.caern.charge, 10); assert.equal(r.caern.streak, 1);
  r = C.holdMoot(r.caern, [{id: "a", gnosis: 3}], 2 * M);
  assert.ok(!r.full); assert.equal(r.caern.streak, 0, "a thin moot breaks the run");
  c = {...r.caern, streak: 12};
  r = C.holdMoot(c, [{id: "a", gnosis: 10}], 3 * M);
  assert.ok(r.caern.ready); assert.ok(r.lines.some(l => /ready to grow/.test(l)));
  assert.equal(C.raiseCaern(r.caern, 50).ok, false);
  const up = C.raiseCaern(r.caern, 100);
  assert.ok(up.ok); assert.equal(up.caern.level, 3); assert.equal(up.caern.ready, false);
  assert.equal(C.riseCost(4), 200, "a fifth level takes another hundred (W20 p. 208)");
  assert.equal(C.raiseCaern({level: 2, ready: false}, 999).ok, false);
  assert.equal(C.holdMoot({level: 2, status: "wyrm"}, [], 0).ok, false);
});

test("missed moots: a lapse, a level lost every three months, and the caern dies", () => {
  const c = C.normCaern({level: 2, lastMoot: 0, lastRaidCheck: 0, raids: false, sept: "Sept of the Spring"});
  let r = C.caernTime(c, 20 * D);
  assert.equal(r.caern.status, "held"); assert.equal(r.lines.length, 0);
  r = C.caernTime(c, M + D);
  assert.equal(r.caern.status, "lapsed"); assert.deepEqual(r.drift, ["neglect"]);
  assert.ok(r.lines[0].includes("Sept of the Spring"));
  r = C.caernTime(r.caern, 3 * M + D);
  assert.equal(r.caern.level, 1); assert.equal(r.drift.length, 0, "the lapse steps the drift once");
  r = C.caernTime(r.caern, 6 * M + D);
  assert.equal(r.caern.status, "dead"); assert.ok(r.died);
  const back = C.holdMoot(C.caernTime(c, M + D).caern, [{id: "a", gnosis: 10}], M + 2 * D);
  assert.ok(back.wasLapsed); assert.equal(back.caern.status, "held"); assert.equal(back.caern.missed, 0);
});

test("raids by era: rolled once a month, met or left to settle itself", () => {
  assert.equal(C.raidOddsFor(1300).wyrm, 0.03);
  assert.equal(C.raidOddsFor(2022).wyrm, 0.08);
  assert.equal(C.raidOddsFor(2040).label, "after 2022");
  assert.equal(C.raidChance({status: "lapsed"}, 1300).wyrm, 0.06, "a lapsed caern draws the Wyrm twice as often");
  assert.equal(C.raidChance({type: "urban"}, 1300).weaver, 0.02);
  assert.equal(C.rollRaid({level: 2}, 1990, 0, always(0.5)), null);
  const raid = C.rollRaid({level: 2}, 1990, 0, always(0.01));
  assert.equal(raid.foe, "wyrm"); assert.ok(raid.what);
  assert.equal(C.rollRaid({level: 2, raids: false}, 1990, 0, always(0.01)), null);
  let r = C.caernTime(C.normCaern({level: 2, lastMoot: 0, lastRaidCheck: 0}), M + 1, {year: 1990, rand: always(0.01)});
  assert.ok(r.caern.raid); assert.ok(r.lines.some(l => /Raid on the caern/.test(l)));
  // Held: the sept's dice all land on 10
  const held = C.settleRaid(r.caern, {}, always(0.95));
  assert.ok(held.won); assert.equal(held.caern.raid, null); assert.equal(held.drift, null);
  // Lost on purpose, to the Wyrm and the Weaver
  const hurt = C.settleRaid({level: 3, raid: {foe: "wyrm", strength: 2, what: "fomori"}}, {outcome: "lost"});
  assert.equal(hurt.caern.level, 2); assert.equal(hurt.drift, "taint"); assert.equal(hurt.caern.status, "held");
  const over = C.settleRaid({level: 3, raid: {foe: "wyrm", strength: 5, what: "a Hive rises"}}, {outcome: "overrun"});
  assert.equal(over.caern.status, "wyrm");
  const calc = C.settleRaid({level: 1, raid: {foe: "weaver", strength: 3, what: "a quarry"}}, {outcome: "lost"});
  assert.equal(calc.caern.status, "calcified"); assert.equal(calc.drift, "weaver");
  // Left alone a week, it settles
  r = C.caernTime({...r.caern, lastMoot: M}, M + 8 * D, {year: 1990, rand: always(0.95)});
  assert.equal(r.caern.raid, null); assert.ok(r.lines.some(l => /Left to itself/.test(l)));
  assert.equal(C.defencePool({level: 2, garou: 9, offices: {warder: "x", gatekeeper: "y"}}), 10);
});

test("caern wars change the sept; a lost caern can be taken back", () => {
  const c = C.normCaern({level: 3, sept: "Sept of the Spring", garou: 10, offices: {warder: "a"}});
  const keep = C.caernWar(c, {sept: "Sept of the Oak", garou: 8, rank: 3}, seq([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95]));
  assert.ok(keep.ok);
  const lost = C.caernWar(c, {sept: "Sept of the Oak", garou: 8, rank: 3}, (() => { let i = 0; return () => (i++ < 7 ? 0.95 : 0.0); })());
  assert.ok(lost.won); assert.equal(lost.caern.sept, "Sept of the Oak"); assert.deepEqual(lost.caern.offices, {}); assert.equal(lost.caern.level, 2);
  assert.equal(C.caernWar({status: "dead"}, {}).ok, false);
  assert.equal(C.reclaim(c, {}).ok, false);
  const fail = C.reclaim({level: 0, status: "wyrm"}, {garou: 2}, always(0.0));
  assert.equal(fail.won, false);
  const back = C.reclaim({level: 0, status: "wyrm"}, {garou: 6, rank: 2}, always(0.95));
  assert.ok(back.won); assert.equal(back.caern.status, "lapsed"); assert.equal(back.caern.level, 1);
});

test("the Rite of the Opened Caern (W20 p. 206)", () => {
  const win = C.openCaern({level: 2, type: "rage"}, {wits: 3, rituals: 3, gnosis: 5, willpower: 6}, always(0.95));
  assert.ok(win.won); assert.equal(win.gain, 2); assert.equal(win.trait, "rage");
  const botch = C.openCaern({level: 2, type: "rage"}, {wits: 3, rituals: 3, gnosis: 5, willpower: 6}, always(0.0));
  assert.ok(botch.botch); assert.equal(botch.gain, 0);
  assert.equal(C.openCaern({level: 2, status: "dead"}).ok, false);
});

test("caerns sit on the places-of-power register and run on its clock", () => {
  let st = P.normState({list: [{id: "c1", kind: "caern", name: "The Spring", scene: "s1", level: 2, lastMoot: 0, lastRaidCheck: 0, raids: false}]});
  assert.equal(st.list[0].kind, "caern");
  const r = P.tick(st, M + D, {year: 1990});
  assert.ok(r.lines.some(l => /^The Spring: No Moot Rite/.test(l)));
  assert.deepEqual(r.drift, [{id: "c1", scene: "s1", kind: "neglect"}]);
  assert.match(P.describe(r.state.list[0], {year: 1990}), /The Spring: caern of Gnosis, level 2; .*lapsed.*Gauntlet 4; Moon Bridges to 2,000 miles/);
});

test("the wiring: window acts, api, editor; plain words players may read", () => {
  const p = src("modules/wodx-storyteller/scripts/power.mjs");
  for ( const re of [/action: "caern", label: "New caern"/, /caern: \{moot: holdMoot/, /system\.advantages\.gnosis\.temporary/, /api\?\.drift/, /C\.OFFICES/] ) assert.match(p, re);
  const shown = (p + src("modules/wodx-storyteller/scripts/caern-rules.mjs")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(shown, /B3[24]\d\d|house rule/i);
  assert.doesNotMatch(shown, /—/);
  assert.doesNotMatch(shown, /\b(he|she|him|her|his|hers)\b/);
});
