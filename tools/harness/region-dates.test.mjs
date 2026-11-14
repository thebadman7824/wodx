import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* News, travel and the week by world region (Chronicle 0.50.0, Storyteller 0.57.0, NPC 0.49.0; B2570 to B2572) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const M = await import(join(root, "modules/wodx-chronicle/scripts/media-rules.mjs"));
const F = await import(join(root, "modules/wodx-chronicle/scripts/faith-rules.mjs"));
const Road = await import(join(root, "modules/wodx-storyteller/scripts/road-rules.mjs"));
const R = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const RS = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));

const REGIONS = Object.keys(W.WORLD_REGIONS);
const MEDIA_IDS = ["print", "papers", "radio", "television", "internet"];

test("every world region has its own years for news and for the roads", () => {
  for ( const id of REGIONS ) {
    assert.ok(M.REGION_MEDIA[id], `media years for ${id}`);
    assert.ok(Road.REGION_ROADS[id], `road years for ${id}`);
    for ( const k of MEDIA_IDS ) assert.ok(k in M.REGION_MEDIA[id], `${id} names ${k}`);
  }
  for ( const id of Object.keys(M.REGION_MEDIA) ) assert.ok(W.WORLD_REGIONS[id], `${id} is a world region`);
  for ( const id of Object.keys(Road.REGION_ROADS) ) assert.ok(W.WORLD_REGIONS[id], `${id} is a world region`);
  for ( const id of Object.keys(R.SUNDAY_FROM) ) assert.ok(W.WORLD_REGIONS[id], `${id} is a world region`);
});

test("news years: plausible, and each way after the one before it where both come", () => {
  for ( const [id, y] of Object.entries(M.REGION_MEDIA) ) {
    for ( const k of MEDIA_IDS ) assert.ok(y[k] === null || (Number.isInteger(y[k]) && y[k] <= 2030), `${id} ${k}`);
    const seen = ["radio", "television", "internet"].map(k => y[k]).filter(v => v !== null);
    for ( let i = 1; i < seen.length; i++ ) assert.ok(seen[i] > seen[i - 1], `${id}: broadcast ways in order`);
    if ( y.print !== null && y.papers !== null ) assert.ok(y.papers > y.print, `${id}: papers after print`);
  }
});

test("Moravia keeps the years it had, and a region left out keeps Moravia's", () => {
  for ( const year of [1197, 1490, 1600, 1848, 1923, 1953, 1995, 2010] ) {
    assert.equal(M.mediaFor(year).id, M.mediaFor(year, {region: "moravia"}).id);
    assert.equal(M.mediaFor(year).id, M.mediaFor(year, {region: "nowhere"}).id);
  }
  assert.equal(M.mediaFor(1850).id, "papers");
  assert.equal(M.mediaFor(2030, {future: true}).id, "net");
  for ( const year of [1197, 1760, 1845, 1880, 1905, 1975, 2050] ) for ( const k of Object.keys(Road.ROADS) ) {
    assert.deepEqual(Road.modesFor(k, year), Road.modesFor(k, year, {region: "moravia"}), `${k} ${year}`);
    assert.equal(Road.darkRoad(k, year), Road.darkRoad(k, year, "moravia"));
  }
});

test("word travels by the region's years", () => {
  assert.equal(M.mediaFor(1250, {region: "china"}).id, "print", "the court gazette and the small news sheets of Song China");
  assert.equal(M.mediaFor(1250, {region: "moravia"}).id, "word");
  assert.equal(M.mediaFor(1700, {region: "brazil"}).id, "word", "no press in Brazil before 1808");
  assert.equal(M.mediaFor(1960, {region: "southern-africa"}).id, "radio", "television came to South Africa in 1976");
  assert.equal(M.mediaFor(1960, {region: "british-isles"}).id, "television");
  assert.equal(M.mediaYear("internet", "china"), 2002);
  assert.equal(M.mediaYear("television", "antarctica"), null);
  assert.equal(M.mediaFor(1990, {region: "antarctica"}).id, "radio");
  // A stronger way that came before a weaker one stands from its own year
  assert.equal(M.mediaFor(1945, {region: "central-africa"}).id, "radio");
  assert.equal(M.mediaFor(1955, {region: "central-africa"}).id, "radio");
  // Heat and reach read the same years
  assert.equal(M.rumourHeat(1860, {big: true, region: "british-isles"}), Infinity);
  assert.equal(M.rumourHeat(1860, {big: true, region: "persia"}), 4);
  assert.equal(M.breachReach(2, 1880, {region: "france"}), Infinity);
  assert.equal(M.breachReach(2, 1880, {region: "arabia"}), 2);
});

test("roads by the region's years", () => {
  const has = (kind, y, region, id) => Road.modesFor(kind, y, {region}).some(m => m.id === id);
  assert.ok(has("rail", 1830, "british-isles", "train"), "Stockton and Darlington, 1825");
  assert.ok(!has("rail", 1830, "moravia", "train"));
  assert.ok(has("rail", 1838, "caribbean", "train"), "Cuba's railway, 1837");
  assert.ok(!has("rail", 1990, "tibet-himalaya", "train"), "Lhasa's railway came in 2006");
  assert.ok(has("rail", 2010, "tibet-himalaya", "train"));
  assert.ok(!has("rail", 2050, "antarctica", "train"), "no railway on the ice");
  assert.equal(Road.roadIn("motorway", 1930, "italy"), "motorway", "the autostrada of 1924");
  assert.equal(Road.roadIn("motorway", 1930, "moravia"), "highway");
  assert.ok(has("street", 1880, "egypt", "tram"));
  assert.ok(!has("street", 1880, "arabia", "tram"));
  assert.ok(has("road", 1905, "moravia", "car") && !has("road", 1905, "korea", "car"));
  // Lit roads and streets
  assert.equal(Road.darkRoad("street", 1760, "british-isles"), false, "London's lamps");
  assert.equal(Road.darkRoad("street", 1760, "moravia"), true);
  assert.equal(Road.darkRoad("road", 1950, "west-africa"), true);
  assert.equal(Road.darkRoad("road", 2050, "antarctica"), true);
  // A trip by distance reads the region
  const t = r => Road.tripByDistance({km: 100, road: "rail", year: 1845, region: r});
  assert.equal(t("british-isles").mode, "train");
  assert.equal(t("persia").mode, "horse");
  assert.ok(t("persia").minutes > t("british-isles").minutes);
  // Paving: mud slows a coach on an unpaved road
  const rain = {precip: "rain", intensity: "heavy"};
  assert.equal(Road.weatherFactor(rain, "road", "car", 1940, "british-isles").factor, 1);
  assert.ok(Road.weatherFactor(rain, "road", "car", 1940, "moravia").factor > 1);
  assert.ok(Road.encounterChance(10, "road", 1950, true, "west-africa") > Road.encounterChance(10, "road", 1950, true, "british-isles"));
});

const merchant = (year, keep) => R.blocksOf({preset: "merchant"}, "civilian", year, keep);
const days = b => (b.days ?? null);

test("the Western church keeps the routines as written", () => {
  for ( const y of [1250, 1600, 1850, 1950, 1990] ) {
    assert.deepEqual(merchant(y, {faith: "western", region: "moravia"}), merchant(y));
    assert.deepEqual(merchant(y, null), merchant(y));
  }
});

test("Islam: Friday prayer at noon, the week turned to Friday", () => {
  const b = merchant(1250, {faith: "islamic", region: "egypt"});
  const pray = b.find(x => x.place === "church" && x.days && !x.prayer);
  assert.deepEqual(days(pray), [4]);
  assert.equal(pray.from, 12);
  assert.match(pray.label, /Friday prayer/);
  const work = b.find(x => x.activity === "work");
  assert.ok(!work.days.includes(4), "no trading on Friday");
  assert.ok(work.days.includes(6), "Sunday is a working day");
  // Turkey moved its day of rest to Sunday in 1935; the Friday prayer stays
  const tr = merchant(1950, {faith: "islamic", region: "anatolia"});
  assert.deepEqual(days(tr.find(x => x.place === "church" && x.days)), [4]);
  assert.ok(tr.filter(x => x.activity === "work").every(x => !x.days.includes(6)));
  assert.equal(R.restDay("islamic", "anatolia", 1930), 4);
  assert.equal(R.restDay("islamic", "anatolia", 1940), 6);
});

test("the Sabbath for the Jewish year, the Liturgy for the Eastern church", () => {
  const b = merchant(1400, {faith: "jewish", region: "moravia"});
  const pray = b.find(x => x.place === "church" && x.days && !x.prayer);
  assert.deepEqual(days(pray), [5]);
  assert.match(pray.label, /Sabbath/);
  assert.ok(b.filter(x => x.activity === "work").every(x => !x.days.includes(5)));
  const o = merchant(1400, {faith: "orthodox", region: "russia"});
  assert.deepEqual(days(o.find(x => x.place === "church" && x.days)), [6]);
  assert.match(o.find(x => x.place === "church" && x.days).label, /Liturgy/);
});

test("faiths with no weekly day: work every day, worship on the holy days, until the Sunday week", () => {
  for ( const [faith, region] of [["hindu", "india"], ["theravada", "southeast-asia"], ["chinese", "china"], ["tibetan", "tibet-himalaya"]] ) {
    assert.equal(R.restDay(faith, region, 1300), null, faith);
    const b = merchant(1300, {faith, region});
    assert.ok(b.filter(x => x.place === "church" && !x.prayer).every(x => x.feast === "only" && !x.days), `${faith}: worship on holy days only`);
    assert.ok(b.filter(x => x.activity === "work").every(x => !x.days), `${faith}: work every day`);
  }
  assert.equal(R.restDay("chinese", "japan", 1880), 6, "Japan took the Sunday rest in 1876");
  assert.equal(R.restDay("chinese", "china", 1900), null);
  const cn = merchant(1950, {faith: "chinese", region: "china"});
  assert.ok(cn.filter(x => x.activity === "work").some(x => x.days && !x.days.includes(6)));
});

test("labels follow the faith and the turned week", () => {
  const b = R.blocksOf({preset: "merchant"}, "civilian", 1950, {faith: "islamic", region: "egypt"});
  assert.ok(b.every(x => !/\bMass\b/.test(x.label ?? "")));
  const sat = R.forFaith([{from: 8, to: 12, place: "work", activity: "work", when: "any", days: [5], feast: "any", label: "Saturday morning"}], {faith: "islamic", region: "egypt", year: 1950});
  assert.deepEqual(sat[0].days, [3]);
  assert.equal(sat[0].label, "Thursday morning");
  const clergy = R.forFaith([{from: 5, to: 7, place: "church", activity: "pray", when: "any", days: null, feast: "any", label: "Matins and Lauds"}], {faith: "islamic"});
  assert.equal(clergy[0].label, "The dawn prayer");
  for ( const f of Object.keys(F.FAITHS) ) for ( const y of [1250, 1700, 1900, 2000] ) for ( const key of Object.keys(R.PRESETS) ) {
    const out = R.blocksOf({preset: key}, "civilian", y, {faith: f, region: "moravia"});
    assert.deepEqual(R.checkBlocks(out), [], `${key} for ${f} in ${y}`);
  }
});

test("Kindred and Garou keep their own nights; the Storyteller's own hours stand", () => {
  for ( const tpl of ["neonate", "elder", "garou"] ) {
    assert.deepEqual(R.blocksOf({}, tpl, 1300, {faith: "islamic", region: "egypt"}), R.blocksOf({}, tpl, 1300));
  }
  const own = [{from: 0, to: 24, place: "home", activity: "rest", when: "any", days: [6], feast: "any", label: "Sunday at home"}];
  assert.equal(R.blocksOf({blocks: own}, "civilian", 1300, {faith: "islamic"}), own);
});

test("a household's origin can keep another faith than the land", () => {
  assert.equal(R.originFaith("jewish"), "jewish");
  assert.equal(R.originFaith("arabic"), "islamic");
  assert.equal(R.originFaith("czech"), null);
  const h = {household: {label: "A house", id: "h1"}, region: "Scene.s.Region.r"};
  const plan = {template: "civilian", preset: "merchant", roles: {}, role: "master", master: true};
  assert.equal(RS.residentFlags({plan, origin: "jewish"}, h, "Scene.s").resident.faith, "jewish");
  assert.equal(RS.residentFlags({plan, origin: "czech"}, h, "Scene.s").resident.faith, undefined);
});
