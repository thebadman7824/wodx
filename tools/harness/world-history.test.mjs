/**
 * The classic world timeline in the game (Chronicle, B5920 to B5925): the build reads the eight era files, ids hold
 * still, the house readings are hidden and in plain words, and a card stays short however many events a skip passes.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {parse, readFiles, inGame, WAITING, ERAS, TOLD_BY_BOOK} from "../timeline/build-world-history.mjs";
import WH from "../../modules/wodx-chronicle/data/world-history.mjs";
import EVENTS from "../../modules/wodx-chronicle/data/events.mjs";
import FUTURE from "../../modules/wodx-chronicle/data/future-events.mjs";
import FW from "../../modules/wodx-chronicle/data/future-world.mjs";
import * as R from "../../modules/wodx-chronicle/scripts/events-rules.mjs";

test("B5920: the shipped file is the build of the research files", () => {
  assert.deepEqual(WH.events, parse(readFiles()));
  assert.deepEqual(WH.eras.map(e => e.id), ERAS);
});

test("B5920: about three thousand events, 1197 to 2009, in every part of the world", () => {
  assert.ok(WH.events.length >= 3000, String(WH.events.length));
  for ( const e of WH.events ) {
    assert.ok(e.year >= 1197 && e.year <= 2009, e.id);
    assert.ok(e.place && e.name && e.summary && e.region, e.id);
    assert.equal(e.branch, e.year >= 1990 ? "classic" : undefined, e.id);
    assert.ok(e.lines.length, e.id);
  }
  for ( const r of Object.keys(R.NEWS_PARTS) ) assert.ok(WH.events.filter(e => e.region === r).length >= 100, r);
});

test("B5920: ids are unique, clash with no other event and come from the year and title, not the order", () => {
  const ids = WH.events.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const other = new Set([...EVENTS.events, ...FUTURE.events, ...FW.events].map(e => e.id));
  assert.ok(ids.every(id => id.startsWith("wh-") && !other.has(id)));
  // a line added at the top of a file renames nothing
  const files = readFiles();
  files[0] = `1197|H|mor|EU|Rome|test|A new first line|Something happens.\n${files[0]}`;
  const again = new Map(parse(files).map(e => [`${e.year}|${e.name}|${e.place}`, e.id]));
  for ( const e of WH.events ) assert.equal(again.get(`${e.year}|${e.name}|${e.place}`), e.id);
});

test("B5920: the house readings still waiting on the book check stay out", () => {
  for ( const e of WH.events ) assert.ok(!WAITING.has(`${e.year}|${e.name}`), e.id);
  assert.equal(WAITING.size, 8);
});

test("B5926: no house reading tells again what a book event already tells", () => {
  const book = new Map([...EVENTS.events].map(e => [e.id, e]));
  for ( const [key, id] of Object.entries(TOLD_BY_BOOK) ) {
    assert.ok(book.has(id), id);
    assert.ok(!WH.events.some(e => `${e.year}|${e.name}` === key), key);
  }
  const n = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for ( const e of WH.events ) {
    assert.ok(![...book.values()].some(b => Math.abs(b.year - e.year) <= 1 && n(b.name) === n(e.name)), e.id);
  }
});

test("B5921: house readings are hidden, real history is not, and neither speaks of the project", () => {
  const hidden = WH.events.filter(e => e.hidden);
  assert.ok(hidden.length > 300 && hidden.length < WH.events.length / 4, String(hidden.length));
  for ( const e of WH.events ) assert.ok(!/house reading|canon in spirit|follows \w+ canon/i.test(e.summary), e.id);
  assert.equal(inGame("The house reading follows Mage canon: the Order meets."), "The Order meets.");
  assert.equal(inGame("Trials begin; the house reading has a witch-hunter behind them."), "Trials begin; the hidden story has a witch-hunter behind them.");
});

test("B5922: a card tells every book event and only the newest twelve of the world's", () => {
  const book = {id: "black-death", year: 1347};
  const world = Array.from({length: 30}, (_, i) => ({id: `wh-${1300 + i}-x`, year: 1300 + i}));
  const {told, more} = R.capTold([book, ...world]);
  assert.equal(more, 18);
  assert.ok(told.includes(book));
  assert.deepEqual(told.filter(R.isWorld).map(e => e.year), world.slice(18).map(e => e.year));
  assert.deepEqual(R.capTold([book]), {told: [book], more: 0});
});

test("B5923: the era a year falls in, the nearest outside the timeline, and what the window lists", () => {
  assert.equal(R.worldEraAt(WH.eras, 1347).id, "long-night");
  assert.equal(R.worldEraAt(WH.eras, 1916).id, "great-war");
  assert.equal(R.worldEraAt(WH.eras, 2050).id, "modern");
  assert.equal(R.worldEraAt([], 1500), null);
  const ev = WH.events.find(e => e.era === "victorian");
  assert.ok(R.shownIn(ev, "victorian") && R.shownIn(ev, "all") && !R.shownIn(ev, "modern") && !R.shownIn(ev, ""));
  assert.ok(R.shownIn({id: "black-death"}, ""));
});

test("B5924, B5891: Legends keeps Moravia's own history and leaves out the far world and the hidden story", () => {
  assert.ok(R.inLegends({id: "black-death"}));
  assert.ok(R.inLegends({id: "wh-1400-x", region: "MO"}));
  assert.ok(!R.inLegends({id: "wh-1400-x", region: "EU"}));
  assert.ok(!R.inLegends({id: "wh-1400-x", region: "MO", hidden: true}));
  assert.ok(R.inLegends({id: "fdw-2030-eu-1", region: "EU"}));
});

test("B5891: news heard in Moravia, Egypt and East Africa", () => {
  const ev = r => ({id: "wh-1500-x", region: r});
  const mo = R.newsCodes("moravia"), eg = R.newsCodes("egypt"), ea = R.newsCodes("east-africa");
  assert.ok(R.heardIn(ev("EU"), mo) && R.heardIn(ev("MO"), mo) && !R.heardIn(ev("AF"), mo));
  assert.ok(R.heardIn(ev("AF"), ea) && !R.heardIn(ev("EU"), ea));
  assert.ok(R.heardIn(ev(R.partOf("egypt")), eg));
});
