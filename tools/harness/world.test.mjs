import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * The world's regions (WoDX Chronicle 0.47.0, B2510 to B2514): every region is whole (a climate, a money and people
 * WoDX can name), a scene abroad takes its region's sun, and the people generator names people the way their own
 * people do.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WR = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const PL = await import(join(root, "modules/wodx-chronicle/scripts/place-rules.mjs"));
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-atmosphere/scripts/weather-rules.mjs"));
const M = await import(join(root, "modules/wodx-storyteller/scripts/money-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PW = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const RR = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
const {gregorianToJDN} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

const ids = Object.keys(WR.WORLD_REGIONS);
const tablesFor = ctx => id => G.resolveTable(PEOPLE_TABLES, id, ctx);
const GROUPS = ["ancient", "medieval", "early-modern", "industrial", "mid-century", "modern", "future"];

test("the world: every inhabited continent has regions, and each region is whole", () => {
  assert.ok(ids.length >= 35);
  for ( const id of ids ) {
    const r = WR.regionOf(id);
    assert.ok(["europe", "americas", "other"].includes(r.part), id);
    assert.ok(Math.abs(r.lat) <= 89 && Math.abs(r.lon) <= 180, id);
    assert.ok(W.CLIMATES[r.climate], `climate of ${id}`);
    assert.ok(M.MONIES[r.money] && M.COINS[r.money], `money of ${id}`);
    assert.ok(r.mix || r.culture, `people of ${id}`);
    assert.equal(W.climateForRegion(id), r.climate);
  }
  // Not Europe alone: at least five regions each for the Americas, Africa with the Middle East, and Asia with Oceania
  assert.ok(ids.filter(id => WR.WORLD_REGIONS[id].part === "americas").length >= 5);
  assert.ok(ids.filter(id => WR.WORLD_REGIONS[id].part === "other").length >= 18);
  assert.ok(ids.some(id => WR.WORLD_REGIONS[id].lat < 0), "south of the equator");
  assert.equal(WR.regionOf("atlantis"), null);
  assert.equal(WR.cultureOf("moravia"), "bohemia");
  assert.equal(WR.cultureOf("japan"), "japan");
});

test("the world: every climate makes a year of weather, and the south has its summer at the turn of the year", () => {
  for ( const c of Object.keys(W.CLIMATES) ) {
    const j0 = gregorianToJDN(1900, 1, 1);
    for ( let i = 0; i < 365; i += 3 ) { const d = W.weatherFor("world", c, j0 + i); assert.ok(d && Number.isFinite(d.tempDay) && Number.isFinite(d.tempNight), c); }
    for ( const k of ["t", "wet", "storm", "fog"] ) assert.equal(W.CLIMATES[c][k].length, 12, `${c} ${k}`);
  }
  const s = W.CLIMATES["australia-southeast"].t;
  assert.ok(s[0] > s[6]);
});

test("the world: every money region pays a wage in every age, in coins that fit", () => {
  for ( const r of Object.keys(M.MONIES) ) for ( const y of [-3000, -500, 300, 700, 1197, 1350, 1500, 1650, 1800, 1900, 1950, 1995, 2050] ) {
    const m = M.moneyFor(y, r);
    assert.ok(M.wageAt(y, r) > 0, `${r} ${y}`);
    const u = m.units.map(x => x[2]);
    assert.ok(u.every((v, i) => !i || v < u[i - 1]) && u.at(-1) === 1, `units ${r} ${m.id}`);
    assert.ok(M.formatMoney(M.allowance(3, y, r), m).length > 0);
    assert.ok(M.coinsFor(y, r).coin);
  }
  assert.equal(M.moneyFor(1250, "japanese").id, "mon");
  assert.equal(M.moneyFor(1400, "mexican").id, "cacao");
  assert.equal(M.moneyFor(800, "arab").id, "dinar");
  assert.equal(M.moneyFor(300, "arab").id, "roman");
  assert.equal(M.moneyFor(1500, "american").id, "barter");
  assert.equal(M.moneyFor(1900, "pacific").id, "usd");
});

test("the world: people can be made in every region and age WoDX has names for", () => {
  for ( const id of ids ) {
    const r = WR.regionOf(id), culture = WR.cultureOf(id);
    for ( const era of GROUPS ) {
      const tb = tablesFor({era, culture});
      const origin = tb("people.origin");
      if ( !origin ) { assert.ok(r.from, `${id} has no people in ${era} and does not say so`); continue; }
      for ( let i = 0; i < 12; i++ ) {
        const p = PR.person({rand: G.stream("world", `${id}:${era}:${i}`), tables: tb, era, culture});
        assert.ok(p.given && p.name && !/[{}]/.test(p.name), `${id} ${era}: ${JSON.stringify([p.origin, p.name])}`);
        assert.ok(p.trade, `${id} ${era} trade`);
      }
    }
  }
});

test("the world: names follow their people's own order and forms", () => {
  const one = (culture, era, origin, sex) => PR.nameOf({rand: G.stream("names", `${culture}${era}${origin}${sex}`), tables: tablesFor({era, culture}), origin, sex});
  const zh = one("china", "medieval", "chinese", "male");
  assert.ok(zh.name.startsWith(zh.family + " "), zh.name);
  assert.match(one("egypt", "medieval", "arabic", "female").name, / (bint |al-)/);
  assert.match(one("anatolia", "early-modern", "turkish", "male").family, /oğlu$/);
  assert.doesNotMatch(one("anatolia", "modern", "turkish", "male").family, /oğlu$/);
  assert.equal(one("mexico", "medieval", "nahua", "female").family, null);
  // The German lands draw Bohemia's medieval German names, and their own modern ones
  assert.ok(one("german-lands", "medieval", "german", "male").given);
  assert.ok(one("german-lands", "modern", "german", "female").family);
  // A region's own people outrank the lands it borrows from
  assert.ok(tablesFor({era: "medieval", culture: "british-isles"})("people.origin").results.some(x => x.text === "english"));
  assert.ok(tablesFor({era: "medieval", culture: "bohemia"})("people.origin").results.some(x => x.text === "czech"));
  // A woman of the household takes the feminine form
  assert.equal(RR.kinFamily({family: "Ivanov", origin: "russian"}, {sex: "female", origin: "russian", family: "Petrova"}), "Ivanova");
  assert.equal(RR.kinFamily({family: "ibn Yusuf", origin: "arabic", masterSex: "male", masterGiven: "Khalid"}, {sex: "female", origin: "arabic", family: "bint Ali"}), "bint Khalid");
  assert.equal(RR.kinFamily({family: "ben Moshe", origin: "jewish", masterSex: "male", masterGiven: "David"}, {sex: "male", origin: "jewish", family: "ben Asher"}), "ben David");
  assert.ok(PW.FAMILY_FIRST.has("japanese") && !PW.FAMILY_FIRST.has("english"));
});

test("the world: a mix stands until the next one, and regions without early names say from when", () => {
  assert.deepEqual(WR.mixFor("japan", "modern"), [["japanese", 100]]);
  assert.deepEqual(WR.mixFor("iberia", "industrial"), WR.mixFor("iberia", "early-modern"));
  assert.equal(WR.mixFor("australia", "medieval"), null);
  assert.equal(WR.mixFor("moravia", "medieval"), null);
  assert.equal(WR.hasPeopleIn("australia", 1500), false);
  assert.equal(WR.hasPeopleIn("australia", 1900), true);
  assert.equal(WR.hasPeopleIn("japan", 1197), true);
  for ( const id of ids ) for ( const g of WR.ERA_GROUPS ) for ( const [o, w] of WR.mixFor(id, g) ?? [] ) assert.ok(o && w > 0, `${id} ${g}`);
});

test("the world: a scene abroad takes its region's sun, and the hours between regions follow the longitude", () => {
  assert.deepEqual(PL.cleanPlace({region: "egypt"}), {latitude: null, offset: 0, region: "egypt"});
  assert.deepEqual(PL.cleanPlace({region: "nowhere", offset: 2}), {latitude: null, offset: 2});
  assert.equal(PL.hasOwnPlace({region: "japan"}), true);
  assert.equal(PL.placeTime({region: "egypt"}, 0, 50.1).latitude, 30);
  assert.equal(PL.placeTime({region: "egypt", latitude: 25.7}, 0, 50.1).latitude, 25.7);
  assert.equal(PL.placeTime({}, 0, 50.1).latitude, 50.1);
  assert.equal(WR.hoursAhead("egypt"), 1);
  assert.equal(WR.hoursAhead("japan"), 8);
  assert.equal(WR.hoursAhead("north-america-east"), -6);
  assert.equal(WR.hoursAhead("moravia", "japan"), -8);
  assert.equal(WR.regionHere({region: "india"}, "moravia").id, "india");
  assert.equal(WR.regionHere({}, "china").id, "china");
  assert.equal(WR.regionHere({}, "nowhere").id, "moravia");
});
