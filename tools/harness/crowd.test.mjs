import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as CR from "../../modules/wodx-npc/scripts/crowd-rules.mjs";
import * as PR from "../../modules/wodx-npc/scripts/passerby-rules.mjs";

/* The crowd as a resource (WoDX NPC 0.40.0, Actions 3.52.0, B2220 to B2226) */

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const read = p => readFileSync(new URL(p, import.meta.url), "utf8");

test("every kind of place has a crowd feeling table, and every feeling is one the rules know", () => {
  for ( const key of Object.keys(PR.PLACES) ) assert.ok(CR.PLACE_FEELINGS[key], key);
  for ( const t of [CR.PLACE_FEELINGS, CR.CAT_FEELINGS, CR.BAND_FEELINGS, CR.AGE_FEELINGS] ) {
    for ( const row of Object.values(t) ) for ( const k of Object.keys(row) ) assert.ok(CR.FEELINGS[k], k);
  }
  for ( const age of Object.keys(PR.AGES) ) { assert.ok(CR.AGE_FEELINGS[age], age); assert.ok(CR.AGE_SPARK[age] > 0, age); }
});

test("a feeling comes out for every place, age and hour, and a church in 1250 is mostly devout", () => {
  for ( const place of Object.keys(CR.PLACE_FEELINGS) ) for ( const age of Object.keys(PR.AGES) ) for ( const band of ["day", "evening", "night", "late"] ) {
    assert.ok(CR.FEELINGS[CR.feelingFor({place, age, band, cat: "local", rng: Math.random})], `${place} ${age} ${band}`);
  }
  let devout = 0;
  for ( let i = 0; i < 400; i++ ) if ( CR.feelingFor({place: "church", age: "medieval", cat: "religious"}) === "devotion" ) devout++;
  assert.ok(devout > 200, `devotion ${devout}/400`);
  let future = 0;
  for ( let i = 0; i < 400; i++ ) if ( CR.feelingFor({place: "church", age: "future", cat: "local"}) === "devotion" ) future++;
  assert.ok(future < devout, "faith thins by the Future Darkness");
});

test("the spark falls with the ages and the young keep more of it", () => {
  const avg = (age, cat) => { let s = 0; for ( let i = 0; i < 2000; i++ ) s += CR.sparkFor({age, cat}); return s / 2000; };
  assert.ok(avg("medieval", "local") > avg("modern", "local"));
  assert.ok(avg("modern", "young") > avg("modern", "gentry"));
  assert.equal(CR.sparkFor({age: "medieval", cat: "young", rng: () => 0}), 3);
  assert.equal(CR.sparkFor({age: "future", cat: "gentry", rng: () => 0.99}), 0);
  assert.equal(CR.SPARK_LABEL.length, 4);
});

test("a Passion's feeling is read from its name, the bracketed one first", () => {
  assert.equal(CR.passionFeeling("Protect my daughter (Love)"), "love");
  assert.equal(CR.passionFeeling("Punish my murderer (Hate)"), "anger");
  assert.equal(CR.passionFeeling("See the sea again (Longing)"), "longing");
  assert.equal(CR.passionFeeling("Keep the family's honour (Pride)"), "pride");
  assert.equal(CR.passionFeeling("Revenge on the Count"), "anger");
  assert.equal(CR.passionFeeling("Finish the cathedral"), null, "no feeling named: the Storyteller matches it");
});

test("Pathos from the crowd: only those who feel it, once a scene for each wraith", () => {
  const crowd = [{id: "a", feeling: "love"}, {id: "b", feeling: "fear"}, {id: "c", feeling: "love", used: {pathos: {s1: ["w1"]}}}, {id: "d", feeling: null}];
  const c = CR.pathosCandidates("Protect my child (Love)", crowd, {wraithId: "w1", scene: "s1"});
  assert.equal(c.feeling, "love");
  assert.deepEqual(c.match.map(m => m.id), ["a"]);
  assert.ok(c.other.some(m => m.id === "d"));
  const other = CR.pathosCandidates("Protect my child (Love)", crowd, {wraithId: "w2", scene: "s1"});
  assert.deepEqual(other.match.map(m => m.id), ["a", "c"], "another wraith may draw on the same mortal");
  const next = CR.pathosCandidates("Protect my child (Love)", crowd, {wraithId: "w1", scene: "s2"});
  assert.deepEqual(next.match.map(m => m.id), ["a", "c"], "a new scene starts fresh");
  const m = CR.markPathos({pathos: {old: ["w9"]}, ravaged: 3}, {wraithId: "w1", scene: "s2"});
  assert.deepEqual(m, {ravaged: 3, pathos: {s2: ["w1"]}}, "only this scene's list is kept");
});

test("Ravaging once a night, nights run noon to noon", () => {
  const d = 86400;
  assert.equal(CR.nightOf(13 * 3600), 0);
  assert.equal(CR.nightOf(d + 11 * 3600), 0, "the small hours belong to the night before");
  assert.equal(CR.nightOf(d + 13 * 3600), 1);
  const u = CR.markRavaged({}, 0);
  assert.equal(CR.ravagedTonight(u, 0), true);
  assert.equal(CR.ravagedTonight(u, 1), false);
  assert.equal(CR.ravagedTonight({}, 0), false);
  assert.equal(CR.markReverie({}, "x").reverie, "x");
});

test("doors on a large map: shapes give bounds, walks go door to door, the fleeing head for the nearest", () => {
  assert.deepEqual(CR.shapeBounds({type: "rectangle", x: 10, y: 20, width: 30, height: 40}), {x: 10, y: 20, width: 30, height: 40});
  assert.deepEqual(CR.shapeBounds({type: "circle", x: 50, y: 50, radius: 10}), {x: 40, y: 40, width: 20, height: 20});
  assert.deepEqual(CR.shapeBounds({type: "ellipse", x: 50, y: 50, radiusX: 10, radiusY: 5}), {x: 40, y: 45, width: 20, height: 10});
  assert.deepEqual(CR.shapeBounds({type: "polygon", points: [0, 0, 10, 0, 10, 20]}), {x: 0, y: 0, width: 10, height: 20});
  assert.equal(CR.shapeBounds({type: "rectangle", x: 0, y: 0, width: 5, height: 5, hole: true}), null);
  const rect = {x: 0, y: 0, width: 4000, height: 4000};
  const doors = [{id: "west", rects: [{x: 0, y: 1900, width: 100, height: 200}]}, {id: "east", rects: [{x: 3900, y: 1900, width: 100, height: 200}]}];
  const w = CR.planDoorWalk(rect, doors, {rng: seq(0, 0.5, 0.5, 0.5, 0.5, 0.9)});
  assert.equal(w.from, "west"); assert.equal(w.to, "east");
  assert.ok(w.start.x <= 100 && w.start.y >= 1900 && w.start.y <= 2100);
  const end = w.waypoints.at(-1);
  assert.ok(end.exit && end.x >= 3900);
  assert.equal(CR.planDoorWalk(rect, []), null, "no doors: the edge walk is used");
  const one = CR.planDoorWalk(rect, [doors[0]], {rng: seq(0.5)});
  assert.equal(one.from, one.to, "one door: in and out by it");
  const n = CR.nearestDoor(doors, {x: 3000, y: 100});
  assert.ok(n.exit && n.x > 3000);
  const refuse = CR.pointInDoor({rects: [{x: 0, y: 0, width: 10, height: 10}], test: () => false}, seq(0.1));
  assert.deepEqual(refuse, {x: 5, y: 5}, "a region that refuses every point falls back to the middle");
});

test("a passer-by now says what kind of person they are, so the crowd rules can weigh them", () => {
  const p = PR.makePasserby({year: 1450, hour: 12});
  assert.ok(typeof p.cat === "string" && CR.CAT_FEELINGS[p.cat], p.cat);
  const kept = PR.keepIf({kept: false}, {touched: "ravaged"});
  assert.equal(kept.kept, true); assert.equal(kept.why, "ravaged");
  assert.equal(PR.keepIf({kept: false}, {}).kept, false);
});

test("labels are plain: gender-neutral, no em-dashes", () => {
  const banned = /\b(he|she|his|her|him|man|woman)\b/i;
  for ( const s of [...Object.values(CR.FEELINGS), ...CR.SPARK_LABEL] ) { assert.ok(!banned.test(s), s); assert.ok(!/—/.test(s), s); }
});

test("the wiring: passers-by carry a feeling and a spark; Actions offers the crowd to wraiths and changelings; Mage witnesses already count them", () => {
  const pb = read("../../modules/wodx-npc/scripts/passersby.mjs");
  assert.match(pb, /CR\.feelingFor\(/);
  assert.match(pb, /CR\.sparkFor\(/);
  assert.match(pb, /doorsOf\(scene\)/);
  assert.match(pb, /mindOf/);
  const main = read("../../modules/wodx-actions/scripts/main.js");
  assert.match(main, /function crowdNear\(actor\)/);
  assert.match(main, /crowdNear, crowdRules \}\);/);
  const wr = read("../../modules/wodx-actions/scripts/wraith.js");
  assert.match(wr, /CR\.pathosCandidates\(/);
  assert.match(wr, /"crowdUse", CR\.markPathos\(/);
  const c20 = read("../../modules/wodx-actions/scripts/c20.js");
  assert.match(c20, /CR\.ravagedTonight\(/);
  assert.match(c20, /CR\.markRavaged\(/);
  // Mage 20th: Sleepers in sight make vulgar magick witnessed; only animals among the passers-by are left out
  const kx = read("../../modules/wodx-actions/scripts/kindred.js");
  assert.match(kx, /passerby\?\.animal\) continue;/);
  assert.ok(!/passerby\) continue;/.test(kx), "people in the street stay witnesses");
  const m20 = read("../../modules/wodx-actions/scripts/m20.js");
  assert.match(m20, /sg\.kind = "witnessed"/);
});
