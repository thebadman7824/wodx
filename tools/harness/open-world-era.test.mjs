/**
 * The open world by era (Storyteller 0.22.0, NPC 0.13.0, Chronicle 0.16.0): travel by distance and the year's ways,
 * routines that change with the age, and word that travels at the speed of the age's media.
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import * as Road from "../../modules/wodx-storyteller/scripts/road-rules.mjs";
import * as W from "../../modules/wodx-storyteller/scripts/world-rules.mjs";
import * as RR from "../../modules/wodx-storyteller/scripts/rumour-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";
import * as F from "../../modules/wodx-npc/scripts/faction-rules.mjs";
import * as Media from "../../modules/wodx-chronicle/scripts/media-rules.mjs";

test("travel: the ways open by year and road", () => {
  const ids = (k, y, o) => Road.modesFor(k, y, o).map(m => m.id);
  assert.deepEqual(ids("road", 1197), ["horse", "coach", "foot"]);
  assert.ok(!ids("rail", 1800).includes("train"), "no train before 1839");
  assert.equal(Road.roadIn("rail", 1800), "highway");
  assert.equal(ids("rail", 1850)[0], "train");
  assert.equal(Road.roadIn("motorway", 1960), "highway");
  assert.equal(ids("motorway", 1990)[0], "car");
  assert.ok(!ids("street", 1850).includes("tram"));
  assert.ok(ids("street", 1870).includes("tram"));
  assert.deepEqual(ids("water", 1300), ["boat"]);
  assert.ok(!ids("highway", 2060).includes("transit"), "transit pods only on the Future Darkness branch");
  assert.equal(ids("highway", 2060, {future: true})[0], "transit");
  assert.ok(!ids("road", 1950).includes("coach"), "carts and coaches end after 1945");
  for ( const y of [1197, 1500, 1750, 1839, 1900, 1950, 2000, 2025, 2099] ) for ( const k of Object.keys(Road.ROADS) ) {
    for ( const m of Road.modesFor(k, y, {future: true}) ) assert.ok(m.speed > 0 && m.speed <= 300, `${k} ${y} ${m.id}`);
  }
});

test("travel: a trip by distance, the weather and the dark", () => {
  const walk = Road.tripByDistance({km: 9, road: "road", year: 1197, want: "foot"});
  assert.equal(walk.minutes, 120); assert.equal(walk.mode, "foot");
  const fast = Road.tripByDistance({km: 9, road: "road", year: 1197});
  assert.equal(fast.mode, "horse"); assert.ok(fast.minutes < walk.minutes);
  const train = Road.tripByDistance({km: 90, road: "rail", year: 1900});
  assert.equal(train.mode, "train"); assert.equal(train.minutes, 120);
  const want = Road.tripByDistance({km: 90, road: "rail", year: 1800, want: "train"});
  assert.notEqual(want.mode, "train", "a train asked for before the line goes by the fastest way open");
  const mud = Road.tripByDistance({km: 9, road: "road", year: 1197, want: "foot", weather: {precip: "rain", intensity: "heavy"}});
  assert.ok(mud.minutes > walk.minutes && mud.why.includes("mud"));
  const paved = Road.tripByDistance({km: 9, road: "road", year: 1990, want: "car", weather: {precip: "rain", intensity: "heavy"}});
  assert.deepEqual(paved.why, [], "a paved road takes rain without mud");
  const dark = Road.tripByDistance({km: 9, road: "road", year: 1197, want: "foot", night: true});
  assert.equal(dark.minutes, 180); assert.ok(dark.why.includes("the dark"));
  const lit = Road.tripByDistance({km: 9, road: "road", year: 1950, want: "foot", night: true});
  assert.equal(lit.minutes, 120, "lit roads after 1900");
  const snow = Road.weatherFactor({deepSnow: true, snowLying: true, precip: "snow", wind: "gale", fog: "thick"}, "path", "horse", 1197);
  assert.ok(snow.factor <= 2.5 && snow.factor > 2);
  assert.equal(Road.tripByDistance({km: 0, road: "road", year: 1197}), null);
});

test("travel: hand-typed minutes still win, and the distance fills in after", () => {
  const from = {id: "a", travel: {}};
  assert.equal(W.travelMinutes(from, {id: "b", travel: {}}, 30), 30);
  assert.equal(W.travelMinutes(from, {id: "b", travel: {minutes: 45, km: 50}}, 30), 45);
  assert.equal(W.travelMinutes({id: "a", travel: {routes: {b: 20}}}, {id: "b", travel: {km: 50}}, 30), 20);
  const p = W.tripPlan(from, {id: "b", travel: {km: 9, road: "road"}}, {year: 1197, want: "foot"});
  assert.equal(p.by, "distance"); assert.equal(p.minutes, 120);
  assert.equal(W.normPlace({km: "12.34", road: "rail"}).km, 12.3);
  assert.equal(W.normPlace({road: "teleporter"}).road, null);
  assert.equal(W.normPlace({}).km, null);
});

test("travel: encounter odds by road, era and the dark", () => {
  assert.equal(Road.encounterChance(10, "path", 1197), 15);
  assert.equal(Road.encounterChance(10, "path", 1197, true), 18.8);
  assert.equal(Road.encounterChance(10, "motorway", 1990, true), 2.5);
  assert.equal(Road.encounterChance(10, "motorway", 1960), 7.5, "a motorway not yet built rolls as a main road");
});

test("routines: the year picks the age's hours, and a fixed age or own hours hold", () => {
  assert.equal(R.ageOf(1197), "medieval"); assert.equal(R.ageOf(1600), "early"); assert.equal(R.ageOf(1880), "industrial");
  assert.equal(R.ageOf(1950), "c20"); assert.equal(R.ageOf(2010), "modern"); assert.equal(R.ageOf(2090), "modern"); assert.equal(R.ageOf(null), "medieval");
  const med = R.blocksOf({preset: "labourer"}, "civilian", 1197);
  assert.deepEqual(med, R.PRESETS.labourer.blocks, "medieval hours are the ones first written");
  assert.deepEqual(R.blocksOf({preset: "labourer"}, "civilian"), R.PRESETS.labourer.blocks, "no year keeps the medieval hours");
  const ind = R.blocksOf({preset: "labourer"}, "civilian", 1880);
  assert.ok(ind.some(b => b.from === 6 && b.to === 18 && b.activity === "work"));
  assert.deepEqual(R.blocksOf({preset: "labourer", age: "medieval"}, "civilian", 1990), med, "a fixed age holds");
  const own = [{from: 0, to: 24, place: "home", activity: "rest"}];
  assert.deepEqual(R.blocksOf({preset: "labourer", blocks: own}, "civilian", 1990), own);
  assert.deepEqual(R.presetBlocks("ghoul", "modern"), R.PRESETS.ghoul.blocks, "a preset with no later hours keeps its own");
  assert.deepEqual(R.presetBlocks("priest", "modern"), R.PRESETS.priest.ages.industrial, "the nearest earlier age");
  assert.ok(!R.presetsFor(1197).factory && R.presetsFor(1880).factory && R.presetsFor(1400).student && !R.presetsFor(1400).police);
  for ( const k of Object.keys(R.PRESETS) ) for ( const a of Object.keys(R.AGES) ) assert.deepEqual(R.checkBlocks(R.presetBlocks(k, a)), [], `${k} ${a}`);
  for ( const k of Object.keys(R.PRESETS) ) for ( const a of Object.keys(R.AGES) ) for ( const b of R.presetBlocks(k, a) ) assert.ok(R.ACTIVITIES[b.activity] && (R.ROLES[b.place]), `${k} ${a} ${b.place}`);
});

test("routines: a modern labourer at 10 on a Monday morning is at work, a medieval one at Mass on Sunday", () => {
  const at = (h, dow) => () => ({hour: h, minute: 0, dayOfWeek: dow, isNight: h < 6 || h >= 20, feast: false});
  const mod = R.blocksOf({preset: "labourer"}, "civilian", 2010);
  assert.equal(R.blockAt(mod, 0, at(10, 0)).block.activity, "work");
  assert.equal(R.blockAt(mod, 0, at(10, 5)).block.activity, "rest", "a modern Saturday off");
  const med = R.blocksOf({preset: "labourer"}, "civilian", 1197);
  assert.equal(R.blockAt(med, 0, at(8, 6)).block.activity, "pray");
  assert.equal(R.blockAt(med, 0, at(10, 5)).block.activity, "work", "the medieval Saturday is a working day");
});

test("media: word travels by the age, and big news floods once the papers print", () => {
  assert.equal(Media.mediaFor(1197).id, "word"); assert.equal(Media.mediaFor(1600).id, "print");
  assert.equal(Media.mediaFor(1900).id, "papers"); assert.equal(Media.mediaFor(1930).id, "radio");
  assert.equal(Media.mediaFor(1970).id, "television"); assert.equal(Media.mediaFor(2010).id, "internet");
  assert.equal(Media.mediaFor(2050).id, "internet"); assert.equal(Media.mediaFor(2050, {future: true}).id, "net");
  assert.equal(Media.rumourHeat(1197), 2); assert.equal(Media.rumourHeat(1197, {big: true}), 2);
  assert.equal(Media.rumourHeat(1600, {big: true}), 4); assert.equal(Media.rumourHeat(1900, {big: true}), Infinity);
  assert.equal(Media.breachReach(1, 1197), 1); assert.equal(Media.breachReach(2, 1197), 2);
  assert.equal(Media.breachReach(1, 2010), 4); assert.equal(Media.breachReach(2, 1900), Infinity);
  assert.equal(Media.breachReach(0, 2010), 0);
});

test("rumours: the heat of the age, the flood, and twists counted", () => {
  const chain = {a: ["b"], b: ["a", "c"], c: ["b", "d"], d: ["c"]};
  const r = {id: "r", text: "They say", knownBy: ["a"]};
  const one = RR.spreadNight(r, chain, () => 0, {heat: 2});
  assert.deepEqual(one.heard, ["b"], "one hop a night by word of mouth");
  const flood = RR.spreadNight({...r, big: true}, chain, () => 0, {heat: Infinity});
  assert.deepEqual(flood.heard.sort(), ["b", "c", "d"], "the papers carry it through everyone in one night");
  assert.equal(flood.rumour.big, true);
  const tw = RR.spreadNight(r, chain, () => 0, {heat: Infinity, twist: 0.5});
  assert.equal(tw.rumour.twists, 3);
  const none = RR.spreadNight(r, chain, () => 0.9, {heat: Infinity, twist: 0.5});
  assert.equal(none.rumour.twists, 0);
  assert.equal(RR.normRumour({id: "x", text: "y", twists: "2"}).twists, 2);
  const old = RR.spreadNight(r, chain, () => 0);
  assert.deepEqual(old.heard, one.heard, "the default is the old two a night");
});

test("breaches: the age's reach per day, medieval unchanged", () => {
  const state = F.normState({factions: []});
  const places = Array.from({length: 10}, (_, i) => ({id: `p${i}`, kind: "street"}));
  const b = F.normBreach({id: "b1", severity: 2, state: "live", place: "p0", heard: [], known: []});
  const day = (o) => F.spreadDay(state, b, places, () => 0, {now: 1, ...o}).changes.find(c => c.op === "heard").places.length;
  assert.equal(day({}), 2);
  assert.equal(day({perDay: Media.breachReach(2, 1197)}), 2);
  assert.equal(day({perDay: Media.breachReach(2, 1900)}), 10);
});

test("generations: townsfolk with no birth year are spread over thirty years; others keep the usual adult", async () => {
  const T = await import("../../modules/wodx-creation/scripts/time.mjs");
  const town = id => ({id, flags: {"wodx-npc": {routine: {on: true}}}});
  assert.equal(T.townsfolk(town("a")), true);
  assert.equal(T.townsfolk({id: "h", flags: {"wodx-npc": {behavior: {household: "The Kessler farm"}}}}), true);
  assert.equal(T.townsfolk({id: "p", hasPlayerOwner: true, flags: {"wodx-npc": {routine: {on: true}}}}), false);
  assert.equal(T.townsfolk({id: "n", flags: {}}), false);
  assert.equal(T.assumedAgeOf({id: "n", flags: {}}), 20);
  const ages = Array.from({length: 60}, (_, i) => T.assumedAgeOf(town(`npc${i}`)));
  assert.ok(ages.every(a => a >= 20 && a < 50));
  assert.ok(new Set(ages).size >= 15, "spread, not one year");
  assert.equal(T.assumedAgeOf(town("same")), T.assumedAgeOf(town("same")), "the same NPC gets the same age every time");
});
