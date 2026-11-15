/**
 * War beyond Europe (Storyteller, B5900 to B5910, the Armies and Ships Desk): each land's own age of war, troops,
 * engines, walls, supply and ships come first; the navigators of the Pacific and the Indian Ocean count.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as WL from "../../modules/wodx-storyteller/scripts/war-lands-rules.mjs";
import * as B from "../../modules/wodx-storyteller/scripts/battle-rules.mjs";
import * as SW from "../../modules/wodx-storyteller/scripts/siege-works-rules.mjs";
import * as N from "../../modules/wodx-storyteller/scripts/naval-rules.mjs";
import * as W from "../../modules/wodx-chronicle/scripts/world-rules.mjs";

const REGIONS = new Set(Object.keys(W.WORLD_REGIONS));

test("B5902: every land named is a WoDX region, and ages do not overlap within a land", () => {
  const all = [...WL.LAND_AGES.flatMap(a => a.lands), ...Object.values({...WL.LAND_UNITS, ...WL.LAND_ENGINES, ...WL.LAND_WALLS, ...WL.LAND_SUPPLY, ...WL.LAND_SHIPS}).flatMap(t => t.lands)];
  for ( const l of all ) assert.ok(REGIONS.has(l), l);
  for ( const land of REGIONS ) {
    const mine = WL.LAND_AGES.filter(a => a.lands.includes(land)).sort((a, b) => a.from - b.from);
    for ( let i = 1; i < mine.length; i++ ) assert.ok(mine[i].from > mine[i - 1].to, `${land}: ${mine[i - 1].id} and ${mine[i].id}`);
  }
});

test("B5902: Mexico before 1521 fights without guns, and Europe keeps its ages", () => {
  const mx = B.ageFor(1500, {land: "mexico"});
  assert.equal(mx.id, "mesoamerica");
  assert.equal(mx.guns, false);
  assert.ok(mx.phase > 0 && mx.kill > 0 && mx.hazard > 0, "numbers borrowed from the base age");
  assert.equal(B.ageFor(1525, {land: "mexico"}).id, "pike");
  assert.equal(B.ageFor(1500, {land: "moravia"}).id, "pike");
  assert.equal(B.ageFor(1500).id, "pike");
  assert.equal(B.ageFor(1550, {land: "japan"}).id, "japan-guns");
  assert.equal(B.ageFor(1820, {land: "aotearoa"}).id, "aotearoa-muskets");
  assert.equal(B.ageFor(2050, {land: "mexico", branch: "future"}).id, "future");
});

test("B5903: a land's troops come first, other lands' are kept under Others, and years count", () => {
  const jp = B.unitsFor(1560, "japan");
  assert.equal(jp[0].own, true);
  assert.ok(jp.some(t => t.id === "ashigaru" && t.own));
  assert.ok(jp.some(t => t.id === "warElephants" && t.other));
  assert.ok(!B.unitsFor(1500, "japan").some(t => t.id === "ashigaru"), "no matchlock foot before 1543");
  assert.ok(B.unitsFor(1500, "japan", {ashigaru: 2}).some(t => t.id === "ashigaru"), "a unit already in the army stays");
  const b = B.normBattle({sides: [{units: {samurai: 3}}, {units: {peasants: 2}}]});
  assert.equal(b.sides[0].units.samurai, 3);
  assert.ok(b.book, "an army of land troops fights with the book's pools");
});

test("B5904, B5905: the supernatural and the realms of the East", () => {
  assert.match(B.supernaturalLabels("china", 1300)[2], /Kuei-jin/);
  assert.match(B.supernaturalLabels("west-africa", 1300)[2], /Laibon/);
  assert.equal(B.supernaturalLabels("moravia", 1300), B.SUPERNATURAL);
  assert.match(B.supernaturalLabels("mexico", 1400)[2], /changing breeds/);
  assert.equal(B.supernaturalLabels("mexico", 1700), B.SUPERNATURAL, "after the settlers the usual labels");
  assert.match(B.ageFor(1300, {realm: "underworld", land: "japan"}).label, /Jade/);
  assert.equal(B.ageFor(1300, {realm: "underworld", land: "france"}).id, "underworld");
});

test("B5906 to B5908: engines, walls and supply of other lands", () => {
  assert.ok(SW.enginesFor(1250, "classic", "china")[0].own);
  assert.ok(SW.enginesFor(1250, "classic", "france").find(e => e.id === "fireLance").other);
  assert.equal(SW.blankCampaign(B.normBattle({kind: "siege", land: "aotearoa", year: 1700, sides: [{}, {position: "town"}]})).wall.type, "pa");
  assert.equal(SW.blankCampaign(B.normBattle({kind: "siege", land: "china", year: 1300, sides: [{}, {position: "town"}]})).wall.type, "rammedEarth");
  assert.equal(SW.blankCampaign(B.normBattle({kind: "siege", land: "moravia", year: 1300, sides: [{}, {position: "town"}]})).wall.type, "mediumWall");
  assert.ok(SW.supplyLinesFor(1400, "classic", "andes").find(s => s.id === "llamas").own);
  assert.ok(!SW.supplyLinesFor(1700, "classic", "andes").some(s => s.id === "llamas"));
});

test("B5909, B5910: ships of other seas and their navigators", () => {
  const ko = N.shipsFor(1595, "classic", "korea");
  assert.ok(ko.find(s => s.id === "turtleShip").own);
  assert.equal(N.normShip({type: "turtleShip"}).type, "turtleShip");
  const nav = (land, wayfinder) => {
    const f = N.normFight({land, ships: [{type: "doubleCanoe"}, {type: "doubleCanoe"}]});
    const r = N.navigate(f, 0, {land: false, wayfinder}, k => Array(k).fill(10));
    return r.log.at(-1).dice;
  };
  assert.match(nav("pacific-islands", true), /at 7/);
  assert.match(nav("pacific-islands", false), /at 9/);
  assert.match(nav("india", true), /at 8/);
  assert.match(nav("france", true), /at 9/);
});

test("B5901: the quick start keeps this timeline's wars, the land's part first", () => {
  const evs = [{id: "a", name: "A war far off", year: 2030, region: "AF", live: true}, {id: "b", name: "A war at home", year: 2031, region: "AM", live: true},
    {id: "c", name: "A war of the other timeline", year: 2030, live: false}];
  assert.deepEqual(B.warEvents(evs, 2030, 5, {part: "AM"}).map(e => e.id), ["b", "a"]);
});
