import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Player immersion: carried light, the character's state on screen, era timekeeping, letters, opening card, faces */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const C = await imp("modules/wodx-interactables/scripts/carry-rules.mjs");
const P = await imp("modules/wodx-senses/scripts/perception-rules.mjs");
const R = await imp("modules/wodx-chronicle/scripts/reckoning-rules.mjs");
const L = await imp("modules/wodx-storyteller/scripts/letters-rules.mjs");
const O = await imp("modules/wodx-atmosphere/scripts/opening-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/faces-rules.mjs");

test("carried light: kinds follow the year, and fuel follows the kind", () => {
  assert.deepEqual(C.kindsFor(1197).map(k => k.id), ["candle", "torch", "lantern"]);
  assert.ok(C.kindsFor(1899).some(k => k.id === "electric"));
  assert.ok(!C.kindsFor(0).some(k => k.id === "electric"));
  assert.equal(C.fuelFor("torch", 1197), 3600);
  assert.equal(C.fuelFor("electric", 1920), 7200);
  assert.equal(C.fuelFor("electric", 1999), 21600);
  assert.equal(C.fuelFor("nope", 1999), 0);
});

test("carried light: radii in the scene's units", () => {
  assert.equal(C.lightData("torch", "ft").dim, 39);
  assert.equal(C.lightData("torch", "yd").dim, 13);
  assert.equal(C.lightData("torch", "m").dim, 11.9);
  assert.equal(C.lightData("electric", "ft").angle, 60);
  assert.equal(C.lightData("bad", "ft"), null);
});

test("carried light: burns down, burns low once, and the weather puts some out", () => {
  const s = C.fresh("torch", 1197, 1000);
  let r = C.burn(s, 1000 + 1800);
  assert.equal(r.out, ""); assert.equal(r.state.left, 1800); assert.equal(r.low, false);
  r = C.burn(s, 1000 + 3200);
  assert.equal(r.low, true);
  assert.equal(C.burn(r.state, 1000 + 3300).low, false, "the note comes once");
  r = C.burn(s, 1000 + 4000);
  assert.equal(r.out, "spent"); assert.equal(r.state.lit, false); assert.equal(r.state.left, 0);
  assert.equal(C.burn(C.fresh("candle", 1197, 0), 10, {outdoors: true, tags: ["wind"]}).out, "weather");
  assert.equal(C.burn(C.fresh("candle", 1197, 0), 10, {outdoors: false, tags: ["wind"]}).out, "", "indoors the wind does nothing");
  assert.equal(C.burn(C.fresh("torch", 1197, 0), 10, {outdoors: true, tags: ["wind"]}).out, "", "wind alone does not put out a torch");
  assert.equal(C.weatherPutsOut("torch", {outdoors: true, tags: ["rain", "downpour"]}), "the downpour");
  assert.equal(C.weatherPutsOut("lantern", {outdoors: true, tags: ["gale", "downpour"]}), "");
  assert.match(C.cannotLight({kind: "torch", left: 0}), /spent/);
  assert.equal(C.leftWords(0), "spent");
  assert.equal(C.leftWords(1800), "about 30 minutes left");
  assert.equal(C.leftWords(7200), "about 2 hours left");
});

test("carried light: wired into Interactables", () => {
  const m = src("modules/wodx-interactables/scripts/main.mjs");
  assert.ok(m.includes("setupCarry()"));
  assert.ok(src("modules/wodx-interactables/module.json").match(/"version": "0\.(1[89]|[2-9]\d)\./));
  assert.ok(src("modules/wodx-interactables/scripts/carry.mjs").includes("searchBox") === false, "a fixed short list, marked data-fixed");
  assert.ok(src("modules/wodx-interactables/scripts/carry.mjs").includes("data-fixed"));
});

test("the state on screen: wounds, hunger, Rage, the Shadow, Paradox, Banality, Willpower", () => {
  assert.deepEqual(P.stateEdges({}), []);
  assert.equal(P.stateEdges({woundPenalty: -1})[0].id, "wound1");
  assert.equal(P.stateEdges({woundPenalty: -2})[0].id, "wound2");
  assert.equal(P.stateEdges({woundPenalty: -5})[0].id, "wound3");
  assert.equal(P.stateEdges({woundPenalty: -5, incapacitated: true})[0].id, "incap");
  assert.equal(P.stateEdges({kindred: true, blood: 3, selfcontrol: 3})[0].id, "hunger");
  assert.deepEqual(P.stateEdges({kindred: true, blood: 4, selfcontrol: 3}), [], "at the line is not under it");
  assert.match(P.stateEdges({kindred: true, blood: 0, selfcontrol: 3})[0].words, /Ravenous/);
  assert.deepEqual(P.stateEdges({kindred: false, blood: 0, selfcontrol: 3}), [], "only Kindred feel the hunger line");
  assert.equal(P.stateEdges({garou: true, rage: 6, ragePerm: 6})[0].id, "rage");
  assert.deepEqual(P.stateEdges({garou: true, rage: 3, ragePerm: 3}), []);
  assert.equal(P.stateEdges({wraith: true, angst: 6, willpower: 5, willpowerPerm: 5})[0].id, "shadow");
  assert.equal(P.stateEdges({mage: true, paradox: 5})[0].id, "paradox");
  assert.equal(P.stateEdges({changeling: true, banality: 7})[0].id, "banality");
  assert.equal(P.stateEdges({willpower: 0, willpowerPerm: 4})[0].id, "nowill");
  const both = P.stateEdges({kindred: true, blood: 1, selfcontrol: 3, woundPenalty: -2});
  assert.deepEqual(both.map(e => e.id), ["hunger", "wound2"], "hunger outweighs a lesser wound");
  for ( const e of [...both, ...P.stateEdges({woundPenalty: -5}), ...P.stateEdges({wraith: true, angst: 6, willpower: 5})] ) assert.ok(!/—/.test(e.words));
  const s = src("modules/wodx-senses/scripts/perception.mjs");
  assert.ok(s.includes('register(MOD, "state"'));
  assert.ok(src("modules/wodx-senses/styles/wodx-senses.css").includes("wsn-state-hunger"));
});

test("era time: the style follows the year and the era", () => {
  assert.equal(R.styleFor(1197), "hours");
  assert.equal(R.styleFor(1350), "striking");
  assert.equal(R.styleFor(1840), "railway");
  assert.equal(R.styleFor(2020), "railway");
  assert.equal(R.styleFor(2020, "future-darkness"), "digital");
});

test("era time: the church's hours, a striking clock, the railway clock", () => {
  assert.equal(R.canonicalHour(12, 7, 17), "Sext, about midday");
  assert.equal(R.canonicalHour(17.2, 7, 17), "Vespers, at dusk");
  assert.equal(R.canonicalHour(23, 7, 17), "the dead of night");
  assert.equal(R.canonicalHour(4, 7, 17), "Matins, in the dark before dawn");
  assert.equal(R.canonicalHour(6.8, 7, 17), "Lauds, at first light");
  assert.equal(R.canonicalHour(9, 7, 17), "Terce, mid-morning");
  assert.equal(R.canonicalHour(15, 7, 19), "None, the afternoon");
  assert.equal(R.strikingHour(3, 14), "a quarter past three at night");
  assert.equal(R.strikingHour(9, 0), "nine o'clock in the morning");
  assert.equal(R.strikingHour(14, 50), "a quarter to three in the afternoon");
  assert.equal(R.strikingHour(0, 2), "midnight");
  assert.equal(R.strikingHour(11, 55), "noon");
  assert.equal(R.railwayHour(0, 5), "12:05 a.m.");
  assert.equal(R.railwayHour(15, 15), "3:15 p.m.");
});

test("era time: reckon puts the date as the character would have it", () => {
  const d = {year: 1197, month: 3, day: 12, hour: 12, minute: 0, weekday: "Wednesday", monthName: "March", sunrise: "06:10", sunset: "17:55"};
  const a = R.reckon(d, {church: {day: null, season: "Lent"}});
  assert.equal(a.date, "Wednesday, the 12th day of March, in Lent, in the year of Our Lord 1197");
  assert.equal(a.time, "Sext, about midday");
  assert.equal(R.reckon(d, {church: {day: "Saint Gregory", season: "Lent"}}).date, "Wednesday, Saint Gregory, in the year of Our Lord 1197");
  assert.equal(R.reckon({...d, year: 1890}).time, "12:00 p.m.");
  assert.equal(R.reckon({...d, year: 2040}, {eraId: "future-darkness"}).date, "2040-03-12");
  const hr = src("modules/wodx-chronicle/data/house-rules.mjs");
  assert.ok(hr.includes('"id": "eraReckoning"'));
  assert.ok(src("modules/wodx-chronicle/scripts/clock-app.mjs").includes("reckon(now"));
});

test("letters: carriers by year, times by reach", () => {
  assert.deepEqual(L.carriersFor(1197).map(c => c.id), ["messenger"]);
  assert.deepEqual(L.carriersFor(1600).map(c => c.id), ["messenger", "post"]);
  assert.ok(L.carriersFor(1900).some(c => c.id === "telegraph" && true));
  assert.ok(!L.carriersFor(2000).some(c => c.id === "telegraph"));
  assert.ok(L.carriersFor(2000).some(c => c.id === "email"));
  assert.ok(!L.carriersFor(2020).some(c => c.id === "net"));
  assert.ok(L.carriersFor(2020, {future: true}).some(c => c.id === "net"));
  assert.equal(L.plan("messenger", "far", 1197).seconds, 30 * 86400);
  assert.equal(L.plan("messenger", "far", 1600).seconds, 14 * 86400);
  assert.equal(L.plan("post", "region", 1700).seconds, 3 * 86400);
  assert.equal(L.plan("post", "region", 1880).seconds, 86400);
  assert.equal(L.plan("telephone", "far", 1900).ok, false);
  assert.equal(L.plan("telephone", "far", 1950).seconds, 0);
  assert.equal(L.plan("post", "near", 1197).ok, false);
  assert.equal(L.wayWords(0), "at once");
  assert.equal(L.wayWords(4 * 3600), "in about 4 hours");
  assert.equal(L.wayWords(3 * 86400), "in about 3 days");
});

test("letters: stored clean, delivered when due, pruned after a year", () => {
  const l = L.normLetter({id: "a1", from: "x", to: "y", how: "bogus", reach: "nowhere", text: "t".repeat(5000), dueAt: 50});
  assert.equal(l.how, "messenger"); assert.equal(l.reach, "near"); assert.equal(l.text.length, 4000); assert.equal(l.state, "way");
  const list = [l, {...l, id: "a2", dueAt: 500}, {...l, id: "a3", dueAt: 10, state: "held"}];
  assert.deepEqual(L.due(list, 100).map(x => x.id), ["a1"]);
  assert.deepEqual(L.prune([{...l, state: "done", dueAt: 0}], 400 * 86400), []);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.ok(m.includes('type === "req.letter"') && m.includes("wodxLetters"));
  assert.ok(src("modules/wodx-chronicle/scripts/player-tools.mjs").includes('"wodxLetters"'));
});

test("opening card: battle maps and marked scenes have none, and a scene is not shown twice running", () => {
  assert.equal(O.placeName({name: "⚔ BATTLEMAP · The crypt"}), "The crypt");
  assert.equal(O.placeName({name: "Market", navName: "The market square"}), "The market square");
  assert.equal(O.wantsCard({id: "s1", name: "Market"}), true);
  assert.equal(O.wantsCard({id: "s1", name: "Market"}, {last: "s1"}), false);
  assert.equal(O.wantsCard({id: "s1", name: "⚔ BATTLEMAP · Crypt"}), false);
  assert.equal(O.wantsCard({id: "s1", name: "Market", flags: {"wodx-atmosphere": {noCard: true}}}), false);
  assert.equal(O.wantsCard({id: "s1", name: "Market"}, {on: false}), false);
  const c = O.cardLines({name: "Market"}, {told: {date: "Wednesday", time: "Vespers"}, weather: "Rain", outdoors: false});
  assert.deepEqual(c, {place: "Market", when: "Wednesday, Vespers", weather: ""});
  assert.equal(O.cardLines({name: "Market"}, {dateLabel: "x", weather: "Rain", outdoors: true}).weather, "Rain");
  assert.ok(src("modules/wodx-atmosphere/scripts/main.mjs").includes('register(MOD, "openingCard"'));
});

test("faces: strangers until introduced; the Storyteller and player characters always by name", () => {
  const flags = {metBy: ["pcA", "bad id!"], stranger: "A tall woman in grey"};
  assert.deepEqual(F.metList(flags), ["pcA"]);
  assert.equal(F.nameFor({name: "Ilse", flags, mine: ["pcB"]}), "A tall woman in grey");
  assert.equal(F.nameFor({name: "Ilse", flags, mine: ["pcA"]}), "Ilse");
  assert.equal(F.nameFor({name: "Ilse", flags, mine: ["pcB"], gm: true}), "Ilse");
  assert.equal(F.nameFor({name: "Ilse", flags, mine: ["pcB"], on: false}), "Ilse");
  assert.equal(F.nameFor({name: "Ilse", flags: {}, mine: []}), F.DEFAULT_STRANGER);
  assert.equal(F.nameFor({name: "Pat", flags: {}, mine: [], playerOwned: true}), "Pat");
  assert.deepEqual(F.introduce(flags, ["pcB"], ["pcA"]), ["pcB"]);
  assert.ok(src("modules/wodx-npc/scripts/faces.mjs").includes("default: false"), "off until the Storyteller turns it on");
});
