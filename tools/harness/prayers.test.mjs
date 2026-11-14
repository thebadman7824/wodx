import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const PR = await import(join(root, "modules/wodx-npc/scripts/passerby-rules.mjs"));
const F = await import(join(root, "modules/wodx-chronicle/scripts/faith-rules.mjs"));
const SR = await import(join(root, "modules/wodx-senses/scripts/senses-rules.mjs"));
const {DateEngine, sunTimes, formatHours} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

/* WoDX NPC 0.50.0 (B2660 to B2662): the five daily prayers, Ramadan's nights and houses of worship of every faith. */

const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
// The routines' describer: the Chronicle's sunrise and sunset as HH:MM, the faith's feast and the month of the fast
const describer = (lat = 30) => time => {
  const d = engine.timeToDate(time), sun = sunTimes(d.jdn, lat), h = d.hour + d.minute / 60;
  const isNight = sun.polar === "day" ? false : sun.polar === "night" ? true : (h < sun.sunrise || h >= sun.sunset);
  return {...d, isNight, sunrise: formatHours(sun.sunrise), sunset: formatHours(sun.sunset), feast: null, ramadan: F.islamicDate(d.jdn).month === 9, sun};
};
const cairo = describer(30);
const at = (y, m, d, hour = 0, minute = 0) => engine.dateToTime({year: y, month: m, day: d, hour, minute});
const day0 = t => t - (engine.timeToDate(t).hour * 3600 + engine.timeToDate(t).minute * 60);
const hm = (t, hours) => day0(t) + Math.round(hours * 60) * 60;
const sunOf = (t, lat = 30) => sunTimes(engine.timeToDate(t).jdn, lat);
const places = [{id: "home1", kind: "home"}, {id: "shop", kind: "workplace"}, {id: "stvitus", kind: "church"}, {id: "azhar", kind: "mosque"},
  {id: "shul", kind: "synagogue"}, {id: "wat", kind: "temple"}, {id: "lane", kind: "street"}, {id: "tavern", kind: "tavern"}];
const ctx = faith => ({places, roles: {}, seed: "npc1", faith});
const merchant = (year, keep, more = {}) => R.blocksOf({preset: "merchant", ...more}, "civilian", year, keep);
const EGYPT = {faith: "islamic", region: "egypt"};
/** A weekday (0 Monday) at or after a time, away from Ramadan unless asked. */
function findDay(year, month, dow, {ramadan = false} = {}) {
  for ( let k = 0; k < 400; k++ ) {
    const t = at(year, month, 1, 12) + k * 86400, d = cairo(t);
    if ( d.dayOfWeek === dow && d.ramadan === ramadan ) return t;
  }
  throw new Error("no such day");
}

test("a Muslim merchant stops for the five prayers wherever they are", () => {
  const b = merchant(1250, EGYPT), tue = findDay(1250, 3, 1), s = sunOf(tue);
  const hit = h => R.placeAt(b, hm(tue, h), cairo, ctx("islamic"));
  const dawn = hit(s.sunrise - 70 / 60);
  assert.equal(dawn.block.activity, "pray"); assert.equal(dawn.block.label, "The dawn prayer"); assert.equal(dawn.place, "home1");
  const noon = hit((s.sunrise + s.sunset) / 2 + 20 / 60);
  assert.equal(noon.block.label, "The noon prayer"); assert.equal(noon.place, "shop", "the noon prayer is said at work");
  assert.equal(hit(s.sunset + 15 / 60).block.label, "The sunset prayer");
  assert.equal(hit(s.sunset + 100 / 60).block.label, "The night prayer");
  // Between the prayers the day goes on as before
  assert.equal(hit(10).block.activity, "work");
  assert.equal(hit((s.sunrise + s.sunset) / 2 + 45 / 60).block.activity, "work");
});

test("Friday's noon prayer is the Friday prayer at the great mosque", () => {
  const b = merchant(1250, EGYPT), fri = findDay(1250, 3, 4), s = sunOf(fri);
  const r = R.placeAt(b, hm(fri, (s.sunrise + s.sunset) / 2 + 20 / 60), cairo, ctx("islamic"));
  assert.match(r.block.label, /Friday prayer/);
  assert.equal(r.place, "azhar", "the church role finds the mosque");
});

test("the prayers follow the sun through the seasons and the latitude", () => {
  const blk = R.withPrayers([])[0];
  const summer = R.sunWindow(blk, cairo(findDay(1250, 6, 1))), winter = R.sunWindow(blk, cairo(findDay(1250, 12, 1)));
  assert.ok(summer[0] < winter[0] - 0.5, "the dawn prayer comes earlier in summer");
  assert.ok(Math.abs(summer[1] - summer[0] - 1 / 3) < 1e-9, "twenty minutes");
  // Where the sun does not set, 06:00 and 18:00 stand in
  const polar = R.sunWindow(blk, {sunrise: "none", sunset: "none"});
  assert.ok(Math.abs(polar[0] - (6 - 80 / 60)) < 1e-9);
  const night = R.sunWindow({sun: "sunset", off: [90, 110]}, {sunrise: "04:00", sunset: "23:30"});
  assert.ok(night[0] < 24 && night[0] >= 0, "a prayer after midnight wraps");
});

test("Ramadan: the meal before dawn, the fast broken at sunset, the night prayers, a late night out", () => {
  const b = merchant(1250, EGYPT), t = findDay(1250, 1, 1, {ramadan: true}), s = sunOf(t);
  const hit = h => R.placeAt(b, hm(t, h), cairo, ctx("islamic"));
  assert.equal(hit(s.sunrise - 110 / 60).block.label, "The meal before dawn");
  assert.equal(hit(s.sunset + 45 / 60).block.label, "Breaking the fast");
  assert.equal(hit(s.sunset + 45 / 60).place, "home1");
  const tar = hit(s.sunset + 150 / 60);
  assert.equal(tar.block.label, "The night prayers of Ramadan"); assert.equal(tar.place, "azhar");
  assert.equal(hit(s.sunset + 240 / 60).block.label, "Out in the Ramadan night");
  // No night at the coffee house in Ramadan's evenings; there is one out of it
  assert.ok(b.filter(x => x.activity === "drink").every(x => x.ramadan === "not"));
  const out = findDay(1250, 1, 4);
  assert.equal(R.placeAt(b, hm(out, sunOf(out).sunset + 150 / 60), cairo, ctx("islamic")).block.label === "The night prayers of Ramadan", false);
});

test("the prayer leader leads all five at the mosque", () => {
  const b = R.blocksOf({preset: "priest"}, "civilian", 1250, EGYPT), tue = findDay(1250, 3, 1), s = sunOf(tue);
  const r = R.placeAt(b, hm(tue, s.sunrise - 70 / 60), cairo, ctx("islamic"));
  assert.equal(r.block.label, "Leads the dawn prayer"); assert.equal(r.place, "azhar");
  assert.ok(R.withPrayers(b).length > b.length);
});

test("who keeps the prayers: the Western church, the night folk and the Storyteller's own hours are left alone", () => {
  for ( const y of [1250, 1700, 1950] ) assert.deepEqual(merchant(y, {faith: "western", region: "moravia"}), merchant(y));
  assert.ok(!merchant(1500, {faith: "orthodox", region: "russia"}).some(x => x.prayer), "the Eastern church keeps no daily rite here");
  for ( const f of ["jewish", "hindu", "chinese"] ) assert.ok(!merchant(1500, {faith: f, region: "india"}).some(x => x.prayer && R.PRAYERS.some(p => p.key === x.prayer)), `${f}: not the five prayers`);
  for ( const tpl of ["neonate", "elder", "garou"] ) assert.deepEqual(R.blocksOf({}, tpl, 1300, EGYPT), R.blocksOf({}, tpl, 1300));
  const own = [{from: 0, to: 24, place: "home", activity: "rest", when: "any", days: null, feast: "any", label: ""}];
  assert.equal(R.blocksOf({blocks: own}, "civilian", 1300, EGYPT), own);
  const asked = R.blocksOf({blocks: own, prayers: "five"}, "civilian", 1300, EGYPT);
  assert.equal(asked.filter(x => x.prayer).length, R.PRAYERS.length + R.RAMADAN.length);
  assert.equal(merchant(1300, EGYPT, {prayers: "none"}).some(x => x.prayer), false);
  // The routine window shows the hours without the prayers laid over them
  assert.deepEqual(R.blocksOf({preset: "merchant"}, "civilian", 1250, EGYPT, {prayers: false}), R.forFaith(R.blocksOf({preset: "merchant"}, "civilian", 1250), {...EGYPT, year: 1250}));
});

test("under the Soviet campaign against religion the prayers are not kept by default", () => {
  const CA = {faith: "islamic", region: "central-asia"};
  assert.equal(merchant(1950, CA).some(x => x.prayer), false);
  assert.equal(merchant(1920, CA).some(x => x.prayer), true);
  assert.equal(merchant(1995, CA).some(x => x.prayer), true);
  assert.equal(merchant(1950, CA, {prayers: "five"}).some(x => x.prayer), true);
});

test("every ready routine with the prayers passes the block check, in every age", () => {
  for ( const y of [1197, 1600, 1850, 1950, 2050] ) for ( const key of Object.keys(R.PRESETS) ) {
    const out = R.blocksOf({preset: key}, "civilian", y, EGYPT);
    assert.deepEqual(R.checkBlocks(out), [], `${key} in ${y}`);
  }
  assert.ok(R.checkBlocks([{from: 1, to: 2, place: "home", activity: "pray", sun: "moonrise"}]).length);
});

test("houses of worship: a kind of place for each faith, the church role finds its own", () => {
  for ( const k of ["mosque", "synagogue", "temple"] ) { assert.ok(R.PLACE_KINDS[k]); assert.equal(R.baseKind(k), "church"); assert.ok(PR.CROWD_OF_KIND[k]); }
  const pick = faith => R.resolvePlace({place: "church"}, ctx(faith)).place;
  assert.equal(pick("islamic"), "azhar"); assert.equal(pick("jewish"), "shul"); assert.equal(pick("theravada"), "wat");
  assert.equal(pick("western"), "stvitus"); assert.equal(pick("orthodox"), "stvitus");
  assert.equal(R.resolvePlace({place: "church"}, {...ctx("western"), places: places.filter(p => p.kind === "mosque")}).place, null, "a Christian does not go to the mosque");
  assert.equal(R.resolvePlace({place: "church"}, {...ctx("islamic"), places: places.filter(p => p.id !== "azhar")}).place, "stvitus", "a place tagged plainly as a church still serves");
  assert.equal(R.resolvePlace({place: "church"}, {places, roles: {church: "shul"}, seed: "x", faith: "islamic"}).place, "shul", "a place the Storyteller set wins");
  assert.equal(R.guessPlace("The Great Mosque").kind, "mosque");
  assert.equal(R.guessPlace("Old-New Synagogue").kind, "synagogue");
  assert.equal(R.guessPlace("Temple of the Tooth").kind, "temple");
  assert.equal(R.guessPlace("Temple Church").kind, "church");
});

test("the senses have lines for the new houses of worship in every era", () => {
  const places = JSON.parse(readFileSync(join(root, "modules/wodx-senses/data/places.json"), "utf8"));
  const T = {places};
  for ( const k of ["mosque", "synagogue", "temple"] ) for ( const s of SR.SENSE_KEYS ) {
    assert.ok(places.kinds[k]?.[s]?.length, `${k} ${s}`);
    for ( const era of Object.keys(SR.ERA_BANDS) ) assert.ok(SR.placeLines(T, {kind: k}, s, {era, part: "day", sky: "clear", indoor: true}).some(l => !l.n), `${k} ${s} ${era}`);
  }
  assert.ok(SR.INDOOR_KINDS.includes("mosque") && SR.WORSHIP.includes("temple"));
});

// WoDX NPC 0.65.0 (B2980 to B2982): the daily worship of the other faiths.
test("a Jewish NPC goes to the morning and evening services, and the rabbi's routine leads them", () => {
  const b = merchant(1500, {faith: "jewish", region: "moravia"});
  const sh = b.find(x => x.prayer === "shacharit"), mi = b.find(x => x.prayer === "mincha");
  assert.ok(sh && mi);
  assert.equal(sh.place, "church");
  assert.ok(!sh.days.includes(5) && !mi.days.includes(5) && !mi.days.includes(4), "not on the Sabbath, nor its eve for the evening");
  assert.equal(b.indexOf(sh) < b.findIndex(x => !x.prayer), true, "laid first, so they win");
  const lead = R.withWorship([{from: 6, to: 8, place: "church", activity: "pray", when: "any", days: null, feast: "any", label: "The offices"}], "jewish");
  assert.ok(lead.filter(x => x.prayer).every(x => /^Leads /.test(x.label)));
});

test("the faiths of India, the Buddhist south, Tibet and China keep their daily rites; their clergy keep their offices", () => {
  const want = {hindu: ["puja", "lamp"], theravada: ["alms"], tibetan: ["kora"], chinese: ["incense"]};
  for ( const [faith, keys] of Object.entries(want) ) {
    const got = merchant(1700, {faith, region: "india"}).filter(x => x.prayer).map(x => x.prayer);
    assert.deepEqual(got, keys, faith);
    const clergy = R.withWorship([{from: 6, to: 8, place: "church", activity: "pray", when: "any", days: null, feast: "any", label: "The offices"}], faith);
    assert.equal(clergy.filter(x => x.prayer).length, 0, `${faith}: the clergy's own hours stand`);
  }
  assert.equal(merchant(1700, {faith: "western", region: "moravia"}).some(x => x.prayer), false);
});

test("daily worship is not kept openly under the campaigns against religion, unless asked", () => {
  assert.equal(merchant(1970, {faith: "chinese", region: "china"}).some(x => x.prayer), false, "the Cultural Revolution");
  assert.equal(merchant(1990, {faith: "chinese", region: "china"}).some(x => x.prayer), true);
  assert.equal(merchant(1960, {faith: "jewish", region: "russia"}).some(x => x.prayer), false);
  assert.equal(merchant(1960, {faith: "jewish", region: "russia"}, {prayers: "five"}).some(x => x.prayer), true, "Kept wins");
  assert.equal(merchant(1700, {faith: "hindu", region: "india"}, {prayers: "none"}).some(x => x.prayer), false);
  const own = [{from: 0, to: 24, place: "home", activity: "rest", when: "any", days: null, feast: "any", label: ""}];
  assert.equal(R.blocksOf({blocks: own}, "civilian", 1700, {faith: "hindu", region: "india"}), own, "the Storyteller's own hours stand");
  assert.equal(R.blocksOf({blocks: own, prayers: "five"}, "civilian", 1700, {faith: "hindu", region: "india"}).filter(x => x.prayer).length, 2);
  for ( const rows of Object.values(R.DAILY_WORSHIP) ) for ( const w of rows ) assert.ok(!/—/.test(w.label) && !/\b(he|she|his|her)\b/i.test(w.label), w.key);
});
