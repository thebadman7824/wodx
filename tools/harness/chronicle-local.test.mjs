import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* What belongs to one chronicle's own place (Chronicle Packs Desk d1, B7610-B7616) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-chronicle/scripts/chronicle-local-rules.mjs"));
const C = await import(join(root, "modules/wodx-chronicle/scripts/church-rules.mjs"));
const LR = await import(join(root, "modules/wodx-chronicle/scripts/languages-rules.mjs"));
const I = await import(join(root, "modules/wodx-storyteller/scripts/institution-rules.mjs"));
const P = await import(join(root, "modules/wodx-storyteller/scripts/power-rules.mjs"));
const H = await import(join(root, "modules/wodx-storyteller/scripts/hunters-rules.mjs"));
const {DateEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));
const {PACK} = await import(join(root, "modules/wodx-rothenstein/chronicle.mjs"));
const src = f => readFileSync(join(root, f), "utf8");

const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
const date = (y, m, d) => engine.timeToDate(engine.dateToTime({year: y, month: m, day: d, hour: 22, minute: 0}));

/** A chronicle set in no real place, so the test names none. */
const PACK_X = {id: "test-town", manifest: {id: "test-town", town: "Weirmoor", homeland: "british-isles", local: {
  feasts: [{month: 9, day: 1, name: "The patron's feast"}, {month: 7, day: 10, name: "The well fires", custom: true, revel: true},
    {month: 13, day: 1, name: "bad"}, {month: 3, day: 3}],
  titles: [{kind: "council", rank: 4, title: "Reeve", to: 1849}, {kind: "council", rank: 3, title: "Reeve's deputy", to: 1849}, {kind: "council", rank: 9, title: "bad"}],
  languages: [{name: "the Hollow Speech", closedIn: ["first"], intent: true, sounds: ["hu", "ol", "mm"]}, {name: ""}],
  caerns: [{key: "grove", name: "The Grove of Oaks", scene: "Grove of Oaks", level: 3, totem: "Stag"}, {name: "No scene"}],
  hunters: {stage: "rumours"}
}}, saga: {SAGA: {books: [{key: "first", from: 1200, to: 1203}, {key: "second", from: 1204, to: 1250}]}}};

test("a chronicle's local block is cleaned, and a chronicle without one changes nothing", () => {
  const l = L.localOf(PACK_X);
  assert.equal(l.feasts.length, 2, "bad feast rows are dropped");
  assert.equal(l.titles.length, 2);
  assert.deepEqual(L.languageNames(l), ["the Hollow Speech"]);
  assert.equal(l.caerns.length, 1);
  assert.deepEqual(l.hunters, {stage: "rumours", region: ""});
  for ( const none of [null, {}, {manifest: {}}, {manifest: {local: "x"}}] ) {
    const e = L.localOf(none);
    assert.deepEqual([e.feasts, e.titles, e.languages, e.caerns, e.hunters], [[], [], [], [], null]);
  }
});

test("the Rothenstein chronicle fills its local hooks from the Book 1 omnibus (B7804)", () => {
  const l = L.localOf(PACK);
  const o = L.feastOptions(l);
  assert.deepEqual(o.extra.map(f => f.slice(0, 2)), [[9, 1], [9, 28]], "St Aegidius and St Wenceslas are holy days");
  assert.deepEqual(o.customs.map(f => f.slice(0, 2)), [[6, 23]], "the Kupala fires are a custom, not a holy day");
  assert.equal(o.revels.length, 2);
  assert.equal(C.churchDay(date(1200, 9, 1), o).feast, "St Aegidius, the parish feast", "chapter I opens on the parish feast");
  assert.deepEqual(L.titlesFor(l, "council", 1200), {4: "Richter"});
  assert.deepEqual(L.titlesFor(l, "council", 1900), {}, "the Richter seat ends with the old town law");
  assert.deepEqual(L.languageNames(l), ["the Old Tongue"]);
  assert.deepEqual(l.languages[0].closedIn, ["red-stone"]);
  assert.equal(l.languages[0].intent, true);
  assert.deepEqual(l.caerns.map(c => [c.key, c.level]), [["old-grove", 3]], "an active caern: Gauntlet 3");
  assert.deepEqual(L.hunterStart(l, PACK.manifest.homeland), {region: "moravia", stage: "rumours"});
  assert.ok(H.STAGES.some(s => s.key === l.hunters.stage));
});

test("feasts: a holy day and a local custom; the custom is named and makes a night of revel but is no day off", () => {
  const o = L.feastOptions(L.localOf(PACK_X));
  assert.deepEqual(o.extra, [[9, 1, "The patron's feast"]]);
  assert.deepEqual(o.customs, [[7, 10, "The well fires"]]);
  assert.deepEqual(o.revels, ["The well fires"]);
  const feast = C.churchDay(date(1200, 9, 1), o);
  assert.equal(feast.feast, "The patron's feast");
  const fires = C.churchDay(date(1200, 7, 10), o);
  assert.equal(fires.feast, null, "a custom is not a holy day");
  assert.equal(fires.custom, "The well fires");
  assert.match(fires.day, /The well fires/);
  assert.equal(fires.revel, true);
  assert.equal(fires.crowd, "busy");
  assert.equal(fires.curfewStart, 24);
  const plain = C.churchDay(date(1200, 7, 10));
  assert.equal(plain.custom, null);
  assert.equal(plain.revel, false, "without the chronicle the day is as before");
  // A custom on a vigil of the church keeps the vigil, and joins its name
  const eve = C.churchDay(date(1200, 6, 23), {customs: [[6, 23, "The midsummer fires"]], revels: ["The midsummer fires"]});
  assert.equal(eve.vigil, "St John's Eve");
  assert.match(eve.day, /The midsummer fires/);
  assert.equal(eve.revel, true);
});

test("church.mjs keeps the chronicle's days only where the homeland's year is kept", () => {
  const s = src("modules/wodx-chronicle/scripts/church.mjs");
  assert.match(s, /region === place\.homeland\(\)/);
  assert.match(s, /customs: loc\.customs, revels: loc\.revels/);
});

test("seat titles: the chronicle's town calls its top seat by its own name, other towns keep the shared names", () => {
  const l = L.localOf(PACK_X);
  assert.deepEqual(L.titlesFor(l, "council", 1200), {4: "Reeve", 3: "Reeve's deputy"});
  assert.deepEqual(L.titlesFor(l, "council", 1900), {}, "past its years");
  assert.deepEqual(L.titlesFor(l, "guild", 1200), {});
  assert.equal(L.townTitles(l, "council", "weirmoor", PACK_X.manifest).length, 2, "the town by name, case aside");
  assert.deepEqual(L.townTitles(l, "council", "Elsewhere", PACK_X.manifest), []);
  const titles = {council: L.townTitles(l, "council", "Weirmoor", PACK_X.manifest)};
  const home = I.reconcile([], {town: "m1", name: "Weirmoor", year: 1200, people: 2000, titles});
  const away = I.reconcile(home.list, {town: "m2", name: "Elsewhere", year: 1200, people: 2000, titles: {}});
  const council = id => away.list.find(i => i.town === id && i.kind === "council");
  assert.equal(I.instRanks(council("m1"), 1200).at(-1), "Reeve");
  assert.equal(I.instRanks(council("m1"), 1200).at(-2), "Reeve's deputy");
  assert.equal(I.instRanks(council("m1"), 1900).at(-1), "Mayor", "the later ladder once the name has passed");
  assert.equal(I.instRanks(council("m2"), 1200).at(-1), "Burgomaster");
  assert.deepEqual(I.instRanks(council("m2"), 1200), I.ranksOf("council", 1200));
  // A chronicle that drops the names: the town's seats take the shared names again at the next reconcile
  const again = I.reconcile(away.list, {town: "m1", name: "Weirmoor", year: 1200, people: 2000});
  assert.equal(I.instRanks(again.list.find(i => i.town === "m1" && i.kind === "council"), 1200).at(-1), "Burgomaster");
  assert.deepEqual(I.normInst({kind: "council"}).titles, []);
});

test("languages: closed in the first book, learnable after; the sense comes through; its own sounds", () => {
  const l = L.localOf(PACK_X), books = PACK_X.saga.SAGA.books;
  assert.equal(L.bookAt(books, 1201), "first");
  assert.equal(L.bookAt(books, 1300), "");
  assert.equal(L.canLearn(l, "the hollow speech", {y: 1201, books}), false);
  assert.equal(L.canLearn(l, "the Hollow Speech", {y: 1210, books}), true);
  assert.equal(L.canLearn(l, "Latin", {y: 1201, books}), true, "shared languages are never closed");
  assert.deepEqual(L.closedAdded(l, ["Czech"], ["Czech", "the Hollow Speech"], {y: 1201, books}), ["the Hollow Speech"]);
  assert.deepEqual(L.closedAdded(l, ["Czech", "the Hollow Speech"], ["Czech", "the Hollow Speech"], {y: 1201, books}), [], "one already on the sheet stays");
  assert.equal(L.givesIntent(l, "the Hollow Speech"), true);
  assert.equal(L.givesIntent(l, "Latin"), false);
  const words = LR.scramble("Come to the grove", "the Hollow Speech", L.languageOf(l, "the Hollow Speech").sounds);
  assert.match(words.toLowerCase(), /^[huolm ]+$/, words);
  assert.equal(LR.scramble("Pax", "Latin"), LR.scramble("Pax", "Latin", null), "without own sounds as before");
  const s = src("modules/wodx-chronicle/scripts/languages.mjs");
  assert.match(s, /Local\.closedAdded\(/);
  assert.match(s, /Local\.givesIntent\(/);
});

test("caerns go on the register once, when their scene is in the world", () => {
  const l = L.localOf(PACK_X), scenes = [{id: "s1", name: "Town square"}, {id: "s2", name: "The Grove of Oaks by night"}];
  const seeds = L.caernSeeds(l, "test-town", {scenes});
  assert.equal(seeds.length, 1);
  const place = P.normPlace(seeds[0].place);
  assert.equal(place.kind, "caern");
  assert.equal(place.scene, "s2");
  assert.equal(place.level, 3);
  assert.equal(place.totem, "Stag");
  assert.ok(place.id.length <= 40 && place.id === L.caernId("test-town", "grove"));
  assert.deepEqual(L.caernSeeds(l, "test-town", {scenes, have: [place.id]}), [], "already on the register");
  assert.deepEqual(L.caernSeeds(l, "test-town", {scenes, seeded: [place.id]}), [], "removed by the Storyteller: stays removed");
  assert.deepEqual(L.caernSeeds(l, "test-town", {scenes: [{id: "s1", name: "Town square"}]}), [], "no scene yet");
  assert.deepEqual(L.caernSeeds({caerns: [{key: "x", name: "X", scene: "(", level: 1}]}, "t", {scenes}), [], "a bad pattern seeds nothing");
  const st = P.normState({list: [place], seeded: [place.id, place.id, ""]});
  assert.deepEqual(st.seeded, [place.id]);
  assert.deepEqual(P.normState({}).seeded, []);
});

test("the hunters' start: the region opens at the stage, once a chronicle, and never over a record it has", () => {
  const start = L.hunterStart(L.localOf(PACK_X), "british-isles");
  assert.deepEqual(start, {region: "british-isles", stage: "rumours"});
  assert.equal(L.hunterStart(L.localOf(null), "x"), null);
  const r = H.applyStart({}, "test-town", start, 5000);
  assert.equal(r.region, "british-isles");
  assert.equal(r.state.regions["british-isles"].stage, "rumours");
  assert.equal(H.stageOf(r.state.regions["british-isles"].pressure).key, "rumours");
  assert.deepEqual(r.state.started, ["test-town"]);
  assert.equal(H.applyStart(r.state, "test-town", start, 6000), null, "once");
  const kept = H.applyStart({regions: {"british-isles": {pressure: 7}}}, "test-town", start, 0);
  assert.equal(kept.region, null);
  assert.equal(kept.state.regions["british-isles"].pressure, 7);
  assert.deepEqual(kept.state.started, ["test-town"]);
  assert.equal(H.applyStart({}, "test-town", {region: "x", stage: "nope"}, 0).region, null, "an unknown stage starts nothing");
  assert.deepEqual(H.normState({}).started, []);
});
