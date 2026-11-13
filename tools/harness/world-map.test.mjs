/**
 * The rough map of the whole Earth and the chart of the otherworlds (Storyteller 0.55.0, Otherworlds 0.20.0).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import * as WM from "../../modules/wodx-storyteller/scripts/world-map-rules.mjs";
import * as D from "../../modules/wodx-storyteller/scripts/discovery-rules.mjs";
import * as W from "../../modules/wodx-storyteller/data/world.mjs";
import * as CH from "../../modules/wodx-otherworlds/scripts/worlds-chart-rules.mjs";
import {REALMS} from "../../modules/wodx-otherworlds/scripts/realm-maps-rules.mjs";

const P = {brno: {lon: 16.6, lat: 49.2}, london: {lon: -0.1, lat: 51.5}, newYork: {lon: -74, lat: 40.7}, kyoto: {lon: 135.8, lat: 35}, cairo: {lon: 31.2, lat: 30}, lima: {lon: -77, lat: -12},
  sydney: {lon: 151.2, lat: -33.9}, timbuktu: {lon: -3, lat: 16.8}, delhi: {lon: 77.2, lat: 28.6}, lagos: {lon: 3.4, lat: 6.5}, mexico: {lon: -99.1, lat: 19.4}, beijing: {lon: 116.4, lat: 39.9}};

test("world map: the grid covers the whole Earth, and every land square has a region", () => {
  assert.equal(W.GROUND.length, 180); assert.equal(W.REGION.length, 180);
  assert.ok(W.GROUND.every(r => r.length === 360 && /^[~liMPDTpw.]+$/.test(r)));
  let land = 0;
  for ( let r = 0; r < 180; r++ ) for ( let c = 0; c < 360; c++ ) {
    const sea = W.GROUND[r][c] === "~";
    assert.equal(W.REGION[r][c] === "~", sea, `square ${c},${r}`);
    if ( !sea ) { land++; assert.ok(WM.regionAt(c, r), `square ${c},${r} has a region`); }
  }
  assert.ok(land > 19000 && land < 24000, `about a third of the squares are land (${land})`);
  // every part of the world, not Europe alone
  const seen = new Set(W.REGION.join("").replace(/~/g, ""));
  assert.equal(seen.size, W.REGION_IDS.length, "every region has ground on the map");
  for ( const id of ["west-africa", "central-africa", "east-africa", "southern-africa", "india", "china", "japan", "nusantara", "andes", "brazil", "southern-cone", "mexico", "north-america-west",
    "canada", "australia", "aotearoa", "pacific-islands", "siberia", "arctic", "antarctica", "tibet-himalaya", "moravia"] ) assert.ok(W.REGION_IDS.includes(id), id);
});

test("world map: known places fall where they should", () => {
  const at = k => { const d = WM.describe(P[k]); return [d.region, d.ground]; };
  assert.deepEqual(at("brno")[0], "moravia"); assert.equal(at("london")[0], "british-isles"); assert.equal(at("newYork")[0], "north-america-east");
  assert.equal(at("kyoto")[0], "japan"); assert.equal(at("cairo")[0], "egypt"); assert.equal(at("lima")[0], "andes"); assert.equal(at("sydney")[0], "australia");
  assert.equal(at("timbuktu")[0], "west-africa"); assert.equal(at("delhi")[0], "india"); assert.equal(at("lagos")[0], "west-africa"); assert.equal(at("mexico")[0], "mexico");
  assert.equal(at("beijing")[0], "china");
  assert.ok(WM.describe(P.cairo).rivers.includes("Nile")); assert.equal(WM.describe(P.cairo).ground, "D");
  assert.equal(WM.groundAt(...Object.values(WM.squareOf(-40, 30))), "~", "mid Atlantic is sea");
  assert.equal(WM.groundAt(...Object.values(WM.squareOf(0, -85))), "i", "the far south is ice");
  assert.match(WM.describe(P.cairo, {regionLabel: id => `the land of ${id}`}).words, /Desert.*in the land of egypt, on the Nile, 30 north, 31 east/);
  for ( const id of W.REGION_IDS ) { const c = WM.regionCentre(id); assert.equal(WM.regionAt(...Object.values(WM.squareOf(c.lon, c.lat))), id, `${id}'s middle lies in ${id}`); }
});

test("world map: distances are great circles, and a journey gets quicker as the ages turn", () => {
  assert.ok(Math.abs(WM.kmBetween(P.london, P.newYork) - 5570) < 60);
  assert.ok(Math.abs(WM.kmBetween(P.brno, P.kyoto) - 8900) < 120);
  for ( const [a, b] of [["brno", "kyoto"], ["london", "newYork"], ["cairo", "timbuktu"], ["lima", "newYork"], ["london", "sydney"], ["delhi", "beijing"], ["lagos", "mexico"]] ) {
    let last = Infinity;
    for ( const year of [1197, 1500, 1700, 1850, 1910, 1950, 2000] ) {
      const j = WM.journey(P[a], P[b], {year});
      const best = j.best === "air" ? j.air.days : j.surface.days;
      assert.ok(best > 0 && best <= last + 0.01, `${a} to ${b} in ${year}: ${best} days, after ${last}`);
      assert.ok(j.surface.path.length > 1 && j.surface.legs.length >= 1);
      assert.equal(!!j.air, year >= 1935, `air in ${year}`);
      last = best;
    }
  }
  const medieval = WM.journey(P.london, P.newYork, {year: 1197}), steam = WM.journey(P.london, P.newYork, {year: 1880}), jet = WM.journey(P.london, P.newYork, {year: 2000});
  assert.ok(medieval.surface.days > 40 && steam.surface.days < 25 && steam.surface.days > 8 && jet.air.days < 4 && jet.best === "air");
  assert.ok(steam.surface.legs.some(l => l.way === "sea" && l.km > 3000));
  const rail = WM.journey(P.newYork, {lon: -122.4, lat: 37.8}, {year: 1880});
  assert.ok(rail.surface.legs.some(l => l.way === "rail") && rail.surface.days < 14, "the railway crosses North America by 1880");
  assert.ok(!WM.journey(P.newYork, {lon: -122.4, lat: 37.8}, {year: 1800}).surface.legs.some(l => l.way === "rail"));
  // no ship's road over the pole
  assert.ok(WM.journey(P.brno, P.kyoto, {year: 1700}).surface.path.every(([, row]) => 89.5 - row < 72), "the journey keeps clear of the pack ice");
  const lines = WM.journeyLines(WM.journey(P.brno, P.kyoto, {year: 1700}));
  assert.match(lines[0], /km as the crow flies\. In 1700: about \d+(\.\d)? days by land and sea\.$/);
  assert.ok(lines.some(l => /under sail/.test(l)));
  assert.equal(WM.journey(P.brno, P.brno, {year: 1300}).surface.days, 0.5);
});

test("world map: the closer view is the same every time and runs on across squares", () => {
  const sq = WM.squareOf(12.5, 41.9), a = WM.closer(sq.col, sq.row), b = WM.closer(sq.col, sq.row);
  assert.deepEqual(a, b);
  assert.equal(a.cells.length, WM.ZOOM); assert.ok(a.cells.every(l => l.length === WM.ZOOM));
  const lands = new Set(a.cells.flat().map(c => c.land));
  assert.ok(lands.has("sea") && [...lands].some(l => l !== "sea"), "a coast square has both sea and land");
  assert.ok(a.km > 3 && a.km < 5.2 && Math.abs(a.kmNorth - 5.1) < 0.1);
  const sea = WM.closer(...Object.values(WM.squareOf(-40, 30)));
  assert.ok(sea.cells.flat().every(c => c.land === "sea"));
  const nile = WM.closer(...Object.values(WM.squareOf(31.2, 27)));
  assert.ok(nile.rivers.includes("Nile") && nile.cells.flat().some(c => c.river), "a great river shows in the closer view");
  assert.ok(WM.closer(...Object.values(WM.squareOf(86.9, 28))).cells.flat().some(c => c.land === "mountain"), "the Himalaya has mountains");
  assert.ok(WM.closer(...Object.values(WM.squareOf(10, 23))).cells.flat().some(c => c.land === "desert"), "the Sahara has desert");
  assert.notDeepEqual(WM.closer(sq.col, sq.row, {seed: 5}).cells, a.cells);
  assert.match(WM.closerSvg(a), /^<svg .*<\/svg>$/s);
});

test("world map: the picture is one SVG, drawn as night, with marks and a journey", () => {
  const j = WM.journey(P.brno, P.kyoto, {year: 1700});
  const s = WM.svg({title: "The world", legend: WM.EARTH_LEGEND, marks: [{...P.brno, label: "Brno & <more>"}], path: j.surface.path});
  assert.match(s, /^<svg [^>]*viewBox="0 0 1440 774"/); assert.match(s, /Brno &amp; &lt;more&gt;/); assert.match(s, /stroke-dasharray/);
  assert.ok(s.length < 900000, `the picture stays small (${s.length})`);
  assert.ok(!/NaN|undefined/.test(s));
  // night: the sea and the land are dark
  for ( const k of ["~", ".", "p"] ) { const [r, g, b] = [1, 3, 5].map(i => parseInt(WM.NIGHT[k].slice(i, i + 2), 16)); assert.ok(r + g + b < 200, `${k} is dark`); }
});

test("otherworlds chart: every realm of the catalogue has one spot, and the mirrors dress the world map", () => {
  assert.deepEqual(CH.missing(REALMS), []);
  const ids = CH.CHART.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, "no place twice");
  for ( const p of CH.CHART ) { assert.ok(CH.SIDES[p.side], p.id); assert.ok(p.ring >= 1 && p.ring <= 4); assert.ok(p.realm ? REALMS[p.realm] : CH.MIRRORS[p.mirror], p.id); }
  for ( const [id, m] of Object.entries(CH.MIRRORS) ) {
    assert.ok(CH.CHART.some(p => p.mirror === id && p.ring === 1), `${id} lies over the world`);
    for ( const k of "~liMPDTpw." ) assert.match(m.palette[k], /^#[0-9a-f]{6}$/);
    const d = CH.mirrorDress(id);
    const s = WM.svg(d);
    assert.ok(s.includes(m.palette["~"]) && s.includes(m.label));
  }
  assert.equal(CH.mirrorDress("nowhere"), null);
  const L = CH.layout(REALMS);
  assert.equal(L.places.length, CH.CHART.length);
  for ( const p of L.places ) assert.ok(p.label && p.x > 20 && p.x < L.size - 20 && p.y > 20 && p.y < L.size - 20, `${p.id} is on the chart`);
  for ( let i = 0; i < L.places.length; i++ ) for ( let k = i + 1; k < L.places.length; k++ )
    assert.ok(Math.hypot(L.places[i].x - L.places[k].x, L.places[i].y - L.places[k].y) > 20, `${L.places[i].id} and ${L.places[k].id} do not sit on each other`);
  const s = CH.svg(REALMS, {mark: "stygia"});
  assert.match(s, /^<svg .*<\/svg>$/s); assert.ok(s.includes("Stygia") && s.includes("The living world") && !/NaN|undefined/.test(s));
});

test("otherworlds chart: how far apart two places are", () => {
  assert.equal(CH.between("world", "shadowlands").steps, 1);
  assert.match(CH.between("world", "stygia").words, /across the Shroud: 2 steps/);
  assert.equal(CH.between("tempest", "labyrinth").steps, 2);
  assert.match(CH.between("wolfhome", "stygia").words, /Back through the living world, across the Gauntlet and the Shroud: 4 steps/);
  assert.equal(CH.between("stygia", "stygia").steps, 0);
  assert.equal(CH.between("stygia", "nowhere"), null);
});

test("world map: the canals open in their year and not before", () => {
  const through = (j, lon, lat) => { const q = WM.squareOf(lon, lat); return j.surface.path.some(([c, r]) => c === q.col && r === q.row) && WM.paceAt(q.col, q.row, j.year).way === "sea"; };
  const bombay = {lon: 72.8, lat: 19};
  for ( const year of [1197, 1600, 1868, 1970] ) {
    const j = WM.journey(P.london, bombay, {year});
    assert.deepEqual(j.surface.canals, [], `no Suez Canal in ${year}`);
    assert.ok(!through(j, 32.5, 30.5), `no ship crosses the isthmus of Suez in ${year}`);
  }
  for ( const year of [1869, 1900, 1930] ) {
    const j = WM.journey(P.london, bombay, {year});
    assert.deepEqual(j.surface.canals.map(c => c.id), ["suez"], `through Suez in ${year}`);
    assert.ok(through(j, 32.5, 30.5));
    assert.ok(WM.journeyLines(j).includes("Through the Suez Canal, open since 1869"));
  }
  assert.ok(WM.journey(P.london, bombay, {year: 1869}).surface.days < WM.journey(P.london, bombay, {year: 1868}).surface.days);
  for ( const year of [1600, 1855, 1913] ) {
    const j = WM.journey(P.newYork, P.lima, {year});
    assert.deepEqual(j.surface.canals, [], `no Panama Canal in ${year}`);
    assert.ok(j.surface.legs.filter(l => l.way === "sea").length >= 2 || j.surface.km > 15000, `in ${year} the way to Lima lands and takes ship again, or rounds the Horn`);
  }
  for ( const year of [1914, 1930, 2020] ) assert.deepEqual(WM.journey(P.newYork, P.lima, {year}).surface.canals.map(c => c.id), ["panama"], `through Panama in ${year}`);
  assert.equal(WM.canalOpen(WM.CANALS[0], 1967), false); assert.equal(WM.canalOpen(WM.CANALS[0], 1975), true); assert.equal(WM.canalOpen(null, 2000), false);
});

test("world map: no ship crosses Panama without the canal, by any neighbouring square", () => {
  // every sea square beside the neck of land: the Caribbean ones and the Pacific ones must not touch in 1900
  const sea = (c, r, y) => WM.paceAt(c, r, y).way === "sea";
  const fill = (start, year, stop) => { const seen = new Set([start.join()]), todo = [start]; while ( todo.length ) { const [c, r] = todo.pop(); for ( let dr = -1; dr <= 1; dr++ ) for ( let dc = -1; dc <= 1; dc++ ) { const c2 = c + dc, r2 = r + dr, k = [c2, r2].join(); if ( seen.has(k) || !stop(c2, r2) || !sea(c2, r2, year) ) continue; seen.add(k); todo.push([c2, r2]); } } return seen; };
  const carib = WM.squareOf(-80.5, 11.5), pacific = WM.squareOf(-80.5, 6.5);
  const west = WM.squareOf(-100, 0).col, east = WM.squareOf(-76, 0).col, north = WM.squareOf(0, 22).row, south = WM.squareOf(0, 4).row;
  const inBox = (c, r) => c >= west && c <= east && r >= north && r <= south;
  assert.ok(sea(carib.col, carib.row, 1900) && sea(pacific.col, pacific.row, 1900));
  assert.ok(!fill([carib.col, carib.row], 1900, inBox).has([pacific.col, pacific.row].join()), "the two seas do not meet in 1900");
  assert.ok(fill([carib.col, carib.row], 1920, inBox).has([pacific.col, pacific.row].join()), "they meet through the canal in 1920");
});

test("world map: the straits are open in every age", () => {
  const venice = {lon: 12.3, lat: 45.4}, odessa = {lon: 30.7, lat: 46.5}, lisbon = {lon: -9.1, lat: 38.7}, alexandria = {lon: 29.9, lat: 31.2};
  for ( const [a, b] of [[venice, odessa], [lisbon, alexandria]] ) {
    const j = WM.journey(a, b, {year: 1400});
    assert.equal(j.surface.legs.filter(l => l.way === "sea" && l.km >= 50).length, 1, "one sea leg, no landing on the way");
  }
});

test("known world: every region has a circle, and what is known only grows", () => {
  const inCircle = Object.values(D.CIRCLES).flatMap(c => c.members);
  assert.equal(new Set(inCircle).size, inCircle.length, "no region sits in two circles");
  for ( const id of inCircle ) assert.ok(W.REGION_IDS.includes(id), `${id} is a region of the map`);
  for ( const c of Object.values(D.CIRCLES) ) for ( const id of Object.keys(c.knows) ) assert.ok(W.REGION_IDS.includes(id), `${id} is a region of the map`);
  assert.deepEqual(W.REGION_IDS.filter(id => !inCircle.includes(id)), ["antarctica"]);
  for ( const home of W.REGION_IDS ) {
    assert.ok(D.isKnown(home, home, -5000), `${home} knows itself`);
    let last = 0;
    for ( const year of [1197, 1400, 1500, 1600, 1800, 1900] ) { const n = D.knownRegions(home, year, W.REGION_IDS).size; assert.ok(n >= last); last = n; }
    assert.equal(last, W.REGION_IDS.length, `${home} knows the whole world by 1900`);
  }
});

test("known world: Europe learns of the Americas, and the Americas of Europe, in their years", () => {
  assert.equal(D.knownYear("moravia", "caribbean"), 1492); assert.equal(D.knownYear("iberia", "mexico"), 1517); assert.equal(D.knownYear("moravia", "india"), 1498); assert.equal(D.knownYear("moravia", "nusantara"), 1511); assert.equal(D.knownYear("moravia", "china"), 1513); assert.equal(D.knownYear("china", "moravia"), 1513); assert.equal(D.knownYear("moravia", "tibet-himalaya"), 1624); assert.equal(D.knownYear("india", "moravia"), 1498); assert.equal(D.knownYear("egypt", "india"), D.OLD);
  assert.equal(D.knownYear("moravia", "southern-africa"), 1488); assert.equal(D.knownYear("british-isles", "australia"), 1606);
  assert.equal(D.knownYear("mexico", "iberia"), 1492); assert.equal(D.knownYear("andes", "france"), 1500); assert.equal(D.knownYear("mexico", "north-america-west"), D.OLD);
  assert.equal(D.knownYear("china", "mexico"), 1587, "seventy years after Europe's ships");
  assert.equal(D.knownYear("egypt", "caribbean"), 1512); assert.equal(D.knownYear("aotearoa", "pacific-islands"), D.OLD); assert.equal(D.knownYear("aotearoa", "france"), 1767);
  assert.equal(D.knownYear("antarctica", "caribbean"), 1492);
  assert.ok(!D.isKnown("moravia", "caribbean", 1300)); assert.ok(D.isKnown("moravia", "caribbean", 1300, ["caribbean"]), "found by the chronicle itself");
  assert.deepEqual(D.unknownRegions("moravia", 1500, W.REGION_IDS).slice(0, 2), [{id: "southeast-asia", year: 1509}, {id: "nusantara", year: 1511}]);
  assert.deepEqual(D.normFound(["caribbean", "atlantis", "caribbean"], W.REGION_IDS), ["caribbean"]);
});

test("known world: a journey keeps to the known world", () => {
  const C = id => WM.regionCentre(id), K = (home, year, found = []) => D.knownRegions(home, year, W.REGION_IDS, found);
  const go = (home, from, to, year, found) => WM.journey(C(from), C(to), {year, known: K(home, year, found)});
  for ( const year of [1197, 1400, 1491] ) {
    const j = go("moravia", "iberia", "caribbean", year);
    assert.equal(j.unknown, "caribbean"); assert.equal(j.surface, null); assert.equal(j.air, null);
    assert.match(WM.journeyLines(j)[0], /beyond the known world/);
  }
  const first = go("moravia", "iberia", "caribbean", 1492);
  assert.ok(first.surface.days > 30 && first.surface.legs.some(l => l.way === "sea" && l.km > 5000), "the crossing of 1492");
  assert.equal(go("moravia", "iberia", "mexico", 1492).unknown, "mexico");
  assert.ok(go("moravia", "iberia", "mexico", 1300, ["mexico", "caribbean"]).surface, "a chronicle that found the way itself can sail it");
  const walled = go("moravia", "iberia", "mexico", 1300, ["mexico"]);
  assert.equal(walled.noWay, true, "Mexico alone is found, but the islands and coasts before it are not");
  assert.match(WM.journeyLines(walled)[0], /no known way leads there/);
  assert.ok(go("moravia", "iberia", "brazil", 1300, ["brazil"]).surface, "the open sea to a found coast is open");
  assert.equal(go("moravia", "iberia", "india", 1197).unknown, "india", "India is hidden from Europe"); assert.equal(go("moravia", "iberia", "india", 1497).unknown, "india");
  assert.ok(go("moravia", "iberia", "india", 1498).surface, "India opens in 1498"); assert.ok(go("egypt", "egypt", "india", 1197).surface, "Egypt has always known the way");
  assert.equal(go("moravia", "iberia", "china", 1300).unknown, "china", "China does not open before India"); assert.ok(go("moravia", "iberia", "china", 1513).surface);
  for ( const id of W.REGION_IDS ) if ( !["india", ...D.CIRCLES.europe.members, ...D.CIRCLES["near-east"].members, "arctic"].includes(id) ) assert.ok(D.knownYear("moravia", id) >= 1444, `${id} is not known to Europe from of old`);
  for ( const id of ["china", "southeast-asia", "nusantara", "japan", "korea", "tibet-himalaya"] ) assert.ok(D.knownYear("moravia", id) > D.knownYear("moravia", "india"), `${id} opens after India`);
  assert.equal(go("mexico", "mexico", "iberia", 1400).unknown, "iberia", "nor does Mexico know of Spain");
  assert.equal(go("china", "china", "mexico", 1500).unknown, "mexico");
  assert.ok(go("pacific-islands", "pacific-islands", "aotearoa", 1300).surface);
  // with no knowledge given, the whole world is open, as before
  assert.ok(WM.journey(C("iberia"), C("caribbean"), {year: 1300}).surface);
});

test("known world: the waters off an unknown coast are closed, and the Cape opens with its discovery", () => {
  const at = (chart, lon, lat) => { const q = WM.squareOf(lon, lat); return chart[q.row * WM.COLS + q.col]; };
  const K = year => WM.charted(D.knownRegions("iberia", year, W.REGION_IDS));
  assert.equal(at(K(1480), 18.5, -36.5), 0, "off the Cape of Good Hope in 1480"); assert.equal(at(K(1488), 18.5, -36.5), 1);
  assert.equal(at(K(1480), 5, 38.5), 1, "the Mediterranean"); assert.equal(at(K(1480), -75, 20), 0, "the Caribbean in 1480"); assert.equal(at(K(1492), -75, 20), 1);
  assert.equal(at(K(1480), -100, 40), 0, "the plains of North America"); assert.equal(at(K(1480), -160, 0), 0, "the middle of the Pacific");
  // the sea road round Africa to India: closed before the Cape is known, open after
  const sail = year => { const chart = K(year), seen = new Set(), start = WM.squareOf(-10.5, 36.5), goal = WM.squareOf(72.5, 15.5), todo = [[start.col, start.row]];
    while ( todo.length ) { const [c, r] = todo.pop(); if ( c === goal.col && r === goal.row ) return true;
      for ( let dr = -1; dr <= 1; dr++ ) for ( let dc = -1; dc <= 1; dc++ ) { const c2 = (c + dc + WM.COLS) % WM.COLS, r2 = r + dr, k = r2 * WM.COLS + c2;
        if ( r2 < 0 || r2 >= WM.ROWS || seen.has(k) || !chart[k] || WM.paceAt(c2, r2, year).way !== "sea" || WM.canalAt(c2, r2) ) continue; seen.add(k); todo.push([c2, r2]); } }
    return false; };
  assert.equal(sail(1450), false, "no sea road from Lisbon to India in 1450"); assert.equal(sail(1498), true, "the sea road of 1498");
  const s = WM.svg({tint: WM.shroudTint(D.knownRegions("moravia", 1300, W.REGION_IDS)), legend: [[WM.SHROUD, "beyond the known world"]]});
  assert.ok(s.includes(WM.SHROUD) && !/NaN|undefined/.test(s));
});

test("world map: its regions are WoDX Chronicle's world regions, when that list is in the repo", {skip: !existsSync(new URL("../../modules/wodx-chronicle/scripts/world-rules.mjs", import.meta.url)) && "the world regions list is not merged yet"}, async () => {
  const {WORLD_REGIONS} = await import("../../modules/wodx-chronicle/scripts/world-rules.mjs");
  const unknown = W.REGION_IDS.filter(id => !WORLD_REGIONS[id]);
  assert.deepEqual(unknown, []);
  assert.deepEqual(Object.keys(WORLD_REGIONS).filter(id => !W.REGION_IDS.includes(id)), [], "every world region has ground on the map");
});

test("world map: the words in the window carry no dash or gendered word", () => {
  const src = readFileSync(new URL("../../modules/wodx-storyteller/scripts/world-map.mjs", import.meta.url), "utf8") + JSON.stringify(D.CIRCLES) + JSON.stringify(CH.MIRRORS) + JSON.stringify(CH.SIDES);
  assert.ok(!/—/.test(src)); assert.ok(!/\b(he|she|his|her|him)\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));
});
