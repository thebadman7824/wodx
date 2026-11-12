/**
 * The country map behind a trip (Storyteller 0.46.0): the grid, one's own way across it, paid rides between their
 * stops by era, legs, and the schedule of rests and day shelter.
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import * as C from "../../modules/wodx-storyteller/scripts/country-rules.mjs";
import * as W from "../../modules/wodx-storyteller/scripts/world-rules.mjs";
import * as D from "../../modules/wodx-storyteller/data/country.mjs";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {build} from "../mapgen/export_country.mjs";

const at = (town, km = 0, dir = "N") => ({at: {town, km, dir}, name: D.TOWNS[town][0]});
const trip = (a, b, year, o = {}) => C.countryTrip(at(a), at(b), {year, wage: 600, ...o});
const DAY = 86400;
// A plain sun for tests: dawn at 06:00 and dusk at 18:00 every day.
const nextDawn = t => { const d = Math.floor(t / DAY) * DAY + 6 * 3600; return d > t ? d : d + DAY; };
const nextDusk = t => { const d = Math.floor(t / DAY) * DAY + 18 * 3600; return d > t ? d : d + DAY; };

test("data: every link names a town, every town sits on the map, no two towns share a square", () => {
  for ( const list of [D.WAYS, D.RAILS, D.MOTORWAYS, D.WATERWAYS] ) for ( const e of list ) assert.ok(D.TOWNS[e[0]] && D.TOWNS[e[1]], e.join(" "));
  for ( const t of Object.keys(D.AIRFIELDS) ) assert.ok(D.TOWNS[t], t);
  const seen = new Map();
  for ( const [id, [, lon, lat]] of Object.entries(D.TOWNS) ) {
    assert.ok(lon > D.BOUNDS.west && lon < D.BOUNDS.east && lat > D.BOUNDS.south && lat < D.BOUNDS.north, id);
    const p = C.locate({town: id});
    assert.ok(!seen.has(p.i), `${id} shares a square with ${seen.get(p.i)}`);
    seen.set(p.i, id);
    assert.equal(C.grid().town[p.i], id);
  }
  for ( const [a, b, kind] of D.WAYS ) assert.ok(["road", "highway"].includes(kind), `${a} ${b}`);
});

test("grid: the ground is what the country is", () => {
  const land = (town, km, dir) => C.landAt({town, km, dir}).land;
  assert.ok(["plain", "vale"].includes(land("olomouc")), "Olomouc lies in the Hana");
  assert.equal(land("jihlava"), "upland");
  assert.ok(["plain", "vale"].includes(land("vienna")));
  assert.equal(land("sumperk", 22, "NE"), "mountain", "the High Jeseniky");
  assert.ok(["plain", "vale"].includes(land("sopron")), "the Alps stop short of Sopron");
  const g = C.grid();
  for ( const l of g.land ) assert.ok(l >= 0 && l < C.LANDS.length);
  assert.equal(C.grid(), g, "built once");
  const brno = C.landAt({town: "brno"}, 1197);
  assert.ok(brno.river && brno.river.km <= 5, "Brno stands on its rivers");
  assert.ok(C.landAt({town: "jihlava"}, 1197).woods > C.landAt({town: "jihlava"}, 1900).woods, "the uplands were more wooded before the clearances");
});

test("places: a spot is a town and an offset", () => {
  assert.deepEqual(C.parseOffset("12 NE"), {km: 12, dir: "NE"});
  assert.deepEqual(C.parseOffset("7,5 km south-west"), {km: 7.5, dir: "SW"});
  assert.deepEqual(C.parseOffset(""), {km: 0, dir: "N"});
  assert.equal(C.parseOffset("somewhere"), null);
  assert.equal(C.normAt({town: "nowhere"}), null);
  assert.deepEqual(C.normAt({town: "brno", km: 12.34, dir: "X"}), {town: "brno", km: 12.3, dir: "N"});
  const a = C.locate({town: "brno"}), b = C.locate({town: "brno", km: 30, dir: "E"});
  assert.equal(b.c - a.c, 6); assert.equal(b.r, a.r);
  assert.equal(W.normPlace({at: {town: "brno", km: 5, dir: "S"}}).at.town, "brno");
  assert.equal(W.normPlace({}).at, null);
});

test("own way: roads beat open country, and the year changes the going", () => {
  const foot = trip("brno", "olomouc", 1197, {want: "foot"}), horse = trip("brno", "olomouc", 1197);
  assert.equal(horse.mode, "horse", "the fastest way of one's own in 1197");
  assert.ok(foot.minutes > horse.minutes);
  assert.ok(foot.km > 60 && foot.km < 110, `Brno to Olomouc is about 65 km as the crow flies, more by road: ${foot.km}`);
  assert.ok(foot.legs.length >= 2 && foot.legs.some(l => /Vyškov|Prostějov/.test(l.to)), "split at the towns on the way");
  assert.equal(foot.by, "map");
  assert.ok(!trip("brno", "prague", 1197).hired);
  const car70 = trip("brno", "prague", 1970, {want: "car"}), car90 = trip("brno", "prague", 1990, {want: "car"});
  assert.ok(car90.minutes < car70.minutes, "the motorway opens in 1980");
  assert.ok(car90.legs.some(l => l.road === "motorway"));
  assert.equal(trip("brno", "prague", 1300, {want: "car"}).mode, "horse", "no cars in 1300: the fastest way open instead");
  // off the road
  const wild = C.countryTrip(at("sumperk", 20, "NE"), at("sumperk", 45, "NE"), {year: 1300, want: "foot"});
  assert.ok(wild.legs.every(l => l.road === "path" || l.minutes > 0));
  assert.ok(wild.minutes / wild.km > 20, "mountains off the road are slow going");
  assert.equal(C.countryTrip(at("brno"), at("brno", 1, "N"), {year: 1300}), null, "one square: a local trip");
  assert.equal(C.countryTrip(at("brno"), {at: null}, {year: 1300}), null);
});

test("paid rides: each runs only between its stops, in its years", () => {
  assert.equal(trip("brno", "vienna", 1838, {want: "hire:train"}).mode, "hire:coach", "the line opens in 1839: the post coach is the fastest way until then");
  const rail = trip("brno", "vienna", 1850, {want: "train"});
  assert.equal(rail.mode, "hire:train"); assert.ok(rail.hired && rail.fare > 0);
  assert.match(rail.stop, /the station at Brno/);
  assert.ok(rail.minutes < trip("brno", "vienna", 1850, {want: "horse"}).minutes);
  const boat = trip("vienna", "buda", 1900, {want: "boat"});
  assert.equal(boat.mode, "hire:boat"); assert.match(boat.legs.find(l => l.hired).from, /the landing at Vienna/);
  const far = C.countryTrip(at("jihlava", 10, "W"), at("olomouc"), {year: 1900, want: "hire:train", wage: 600});
  assert.ok(far.legs.length >= 2 && !far.legs[0].hired && /the station at/.test(far.legs[0].to), "first to the station");
  assert.equal(trip("brno", "prague", 1915, {want: "hire:air"}).hired, true, "no flights yet: another ride");
  assert.notEqual(trip("brno", "prague", 1915, {want: "hire:air"}).mode, "hire:air");
  assert.equal(trip("brno", "prague", 1935, {want: "hire:air"}).mode, "hire:air");
  assert.notEqual(trip("brno", "prague", 1990).mode, "hire:air", "nobody flies a short hop unless they ask");
  assert.ok(!C.hiredModes(2060).some(m => m.id === "hire:pod")); assert.ok(C.hiredModes(2060, {future: true}).some(m => m.id === "hire:pod"));
  assert.ok(!C.hiredModes(1950).some(m => m.id === "hire:coach"), "hired carts end after 1945");
  assert.ok(C.fareOf("hire:train", 100, 1850, 600) > C.fareOf("hire:train", 100, 1950, 600));
  assert.equal(C.fareOf("hire:train", 0, 1850, 600), 0);
  const o = trip("brno", "vienna", 1900).options;
  assert.ok(o.length >= 4 && o[0].minutes <= o[1].minutes);
});

test("every era: a trip can be planned in each, and never takes no time", () => {
  for ( const y of [1197, 1350, 1500, 1650, 1750, 1840, 1900, 1930, 1950, 1975, 2000, 2025, 2077] ) for ( const [a, b] of [["brno", "olomouc"], ["znojmo", "krakow"], ["cheb", "buda"]] ) {
    const t = trip(a, b, y, {future: y > 2040});
    assert.ok(t && t.minutes > 0 && t.km > 0 && t.legs.length, `${a} ${b} ${y}`);
    assert.ok(Math.abs(t.minutes - t.legs.reduce((n, l) => n + l.minutes, 0)) < 1, "legs add up");
    for ( const l of t.legs ) assert.ok(l.from && l.to && l.minutes >= 1, `${a} ${b} ${y} leg`);
  }
  assert.ok(trip("cheb", "buda", 2000).minutes < trip("cheb", "buda", 1900).minutes);
  assert.ok(trip("cheb", "buda", 1900).minutes < trip("cheb", "buda", 1300).minutes);
});

test("weather and the dark slow the going", () => {
  const dry = trip("brno", "olomouc", 1300, {want: "foot"});
  const wet = trip("brno", "olomouc", 1300, {want: "foot", weather: {precip: "rain", intensity: "heavy"}});
  const dark = trip("brno", "olomouc", 1300, {want: "foot", night: true});
  assert.ok(wet.minutes > dry.minutes && wet.why.includes("mud"));
  assert.ok(dark.minutes > dry.minutes && dark.why.includes("the dark"));
  assert.equal(trip("brno", "olomouc", 1300, {want: "foot"}).minutes, dry.minutes, "a plan does not change the stored way");
});

test("schedule: the living rest each day; pace and lodging change time, cost and trouble", () => {
  const t = trip("brno", "krakow", 1300, {want: "foot"});
  const base = {start: 8 * 3600, nextDawn, nextDusk, wage: 600};
  const steady = C.schedule(t, base), careful = C.schedule(t, {...base, pace: "careful"}), forced = C.schedule(t, {...base, pace: "forced"});
  assert.ok(steady.nights >= 5 && steady.stops.length === steady.nights);
  assert.ok(steady.minutes > t.minutes, "nights on the way");
  assert.ok(careful.travel > steady.travel && forced.travel < steady.travel);
  assert.ok(forced.minutes < steady.minutes && forced.toll >= 1 && !steady.toll);
  assert.ok(careful.enc < steady.enc && forced.enc > steady.enc);
  assert.ok(steady.cost > 0 && steady.cost === steady.stops.filter(s => !s.camp).length * 20);
  const camp = C.schedule(t, {...base, lodging: "camp"});
  assert.equal(camp.cost, 0); assert.ok(camp.enc > steady.enc);
  const short = C.schedule(trip("brno", "vyskov", 1300, {want: "foot"}), base);
  assert.equal(short.nights, 0); assert.equal(short.cost, 0);
  const rail = trip("brno", "vienna", 1900, {want: "hire:train"}), sr = C.schedule(rail, {...base, heads: 3});
  assert.equal(sr.fare, rail.fare * 3); assert.equal(sr.nights, 0);
});

test("schedule: those the sun burns move by night and shelter in towns by day", () => {
  const t = trip("brno", "olomouc", 1300, {want: "horse", night: true});
  const s = C.schedule(t, {start: 19 * 3600, nextDawn, nextDusk, sunBurns: true, wage: 600});
  assert.ok(s.stops.length >= 1 && s.stops.every(x => x.why === "day shelter"));
  assert.ok(!s.exposed);
  for ( const x of s.stops ) assert.ok(x.to > x.from && x.to % DAY === 18 * 3600, "they leave at dusk");
  const arriveHour = (s.arrive % DAY) / 3600;
  assert.ok(arriveHour >= 18 || arriveHour <= 5.5, `arrives in the dark: ${arriveHour}`);
  // setting out by day waits for dusk first
  const day = C.schedule(trip("brno", "vyskov", 1300, {want: "horse", night: true}), {start: 10 * 3600, nextDawn, nextDusk, sunBurns: true});
  assert.equal(day.stops[0].why, "day shelter"); assert.equal(day.stops[0].to, 18 * 3600);
  // a stretch with no town for longer than a night is the Storyteller's call
  const wild = C.countryTrip(at("cheb", 10, "S"), at("budejovice", 10, "S"), {year: 1300, want: "foot", night: true});
  const far = wild.legs.some(l => l.minutes > 11.5 * 60);
  const sw = C.schedule(wild, {start: 19 * 3600, nextDawn, nextDusk, sunBurns: true});
  if ( far ) assert.ok(sw.exposed);
  assert.equal(W.travelNeedsAsk({place: {travel: {}}, sunBurns: true, plan: {exposed: true}}), "A stretch of this trip is longer than a night, with no shelter on it.");
  assert.equal(W.travelNeedsAsk({place: {travel: {}}, sunBurns: true, plan: {exposed: false}, arrive: 99, dawnAt: 1}), null, "a planned trip with shelter needs no asking");
  assert.equal(W.travelNeedsAsk({place: {travel: {}}, sunBurns: true, arrive: 99, dawnAt: 1}), "The trip would end after dawn.", "the older check stands off the map");
});

test("trip plan: typed minutes still win; the map comes before the place's km", () => {
  const A = {id: "a", name: "A", travel: {at: {town: "brno"}}}, B = {id: "b", name: "B", travel: {at: {town: "olomouc"}, km: 5}};
  assert.equal(W.tripPlan(A, B, {year: 1300}).by, "map");
  assert.equal(W.tripPlan(A, {...B, travel: {...B.travel, minutes: 45}}, {year: 1300}).by, "place");
  assert.equal(W.tripPlan(A, {...B, travel: {...B.travel, routes: {a: 20}}}, {year: 1300}).by, "route");
  assert.equal(W.tripPlan({id: "a", travel: {}}, B, {year: 1300}).by, "distance", "one end off the map: the older sum");
  assert.equal(W.tripPlan({id: "a", travel: {}}, {id: "c", travel: {}}, {year: 1300, fallback: 30}).by, "default");
});

test("words: where an hour of the trip falls, and the legs in a line each", () => {
  const t = trip("brno", "olomouc", 1300, {want: "foot"});
  assert.match(C.spotAt(t, 1).words, /between Brno and /);
  assert.match(C.spotAt(t, 9999).words, /near Olomouc/);
  const lines = C.legLines(t, s => `${Math.round(s / 60)} min`);
  assert.equal(lines.length, t.legs.length); assert.match(lines[0], /^Brno to .*on foot.* km, \d+ min$/);
  const r = trip("brno", "prague", 1900, {want: "hire:train"});
  assert.match(C.spotAt(r, 1).words, /by train between/);
});

test("map tools: country.json is up to date, and Python reads the same ground", t => {
  const file = new URL("../mapgen/country.json", import.meta.url);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), JSON.parse(JSON.stringify(build())), "run node tools/mapgen/export_country.mjs");
  const spots = [["brno", 0, "N"], ["olomouc", 6, "E"], ["jihlava", 0, "N"], ["sumperk", 22, "NE"], ["boskovice", 8, "S"], ["znojmo", 14, "SW"], ["tesin", 30, "S"]];
  let out;
  try {
    out = execFileSync("python3", ["-c", `import json,sys\nsys.path.insert(0, sys.argv[1])\nimport country\nprint(json.dumps([country.land_at(s, 1300) for s in sys.argv[2:]]))`,
      fileURLToPath(new URL("../mapgen/", import.meta.url)), ...spots.map(([a, k, d]) => `${a}:${k}:${d}`)], {encoding: "utf8"});
  } catch (e) { return t.skip(`python3 could not be run here (${e.code ?? "error"})`); }
  const py = JSON.parse(out);
  spots.forEach(([town, km, dir], i) => {
    const js = C.landAt({town, km, dir}, 1300);
    assert.equal(py[i].land, js.land, `${town} land`); assert.equal(py[i].landName, js.landName, `${town} name`);
    assert.deepEqual(py[i].river, js.river, `${town} river`); assert.equal(py[i].woods, js.woods, `${town} woods`);
  });
});
