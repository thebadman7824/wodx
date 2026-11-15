/**
 * The Future Darkness branch's world history by region (Chronicle, B5890 to B5892): the build reads the research file,
 * every part of the world has news after 2023, and the card tells only the news heard where the chronicle stands.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parse} from "../wofd/build-future-world.mjs";
import FW from "../../modules/wodx-chronicle/data/future-world.mjs";
import FUTURE from "../../modules/wodx-chronicle/data/future-events.mjs";
import * as R from "../../modules/wodx-chronicle/scripts/events-rules.mjs";
import * as W from "../../modules/wodx-chronicle/scripts/world-rules.mjs";

const SRC = new URL("../../docs/research/era-timelines/r3/future-darkness.txt", import.meta.url);

test("B5890: the shipped file is the build of the research file", () => {
  assert.deepEqual(FW.events, parse(fs.readFileSync(SRC, "utf8")));
});

test("B5890: ids are unique and none clashes with the metaplot", () => {
  const ids = FW.events.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const meta = new Set(FUTURE.events.map(e => e.id));
  assert.ok(ids.every(id => !meta.has(id)));
});

test("B5890: the Americas, Africa and Oceania have news in every decade from 2024 to 2099", () => {
  for ( const r of ["AM", "AF", "OC"] ) {
    const late = FW.events.filter(e => e.region === r && e.year >= 2024);
    assert.ok(late.length >= 15, `${r}: ${late.length}`);
    for ( let d = 2020; d <= 2090; d += 10 ) {
      assert.ok(late.some(e => e.year >= d && e.year < d + 10), `${r} has nothing in the ${d}s`);
    }
  }
});

test("B5890: every event is on the future branch, dated in range, with a place and plain text", () => {
  for ( const e of FW.events ) {
    assert.equal(e.branch, "future");
    assert.ok(e.year >= 1990 && e.year <= 2099, e.id);
    assert.ok(e.place && e.name && e.summary.length > 20, e.id);
    assert.ok(!/—/.test(e.summary + e.name), `em-dash in ${e.id}`);
    assert.ok(!/\b(he|she|his|her|him)\b/i.test(e.summary), `pronoun in ${e.id}`);
  }
});

test("B5891: every WoDX region belongs to a part of the world, and Moravia hears Europe too", () => {
  for ( const id of Object.keys(W.WORLD_REGIONS) ) assert.ok(R.NEWS_PARTS[R.partOf(id)], id);
  assert.equal(R.partOf("north-america-west"), "AM");
  assert.equal(R.partOf("east-africa"), "AF");
  assert.equal(R.partOf("aotearoa"), "OC");
  assert.deepEqual([...R.newsCodes("moravia")].sort(), ["EU", "MO"]);
  assert.deepEqual([...R.newsCodes("brazil")], ["AM"]);
  assert.deepEqual([...R.newsCodes("brazil", "australia")].sort(), ["AM", "OC"]);
  assert.deepEqual([...R.newsCodes()].sort(), ["EU", "MO"]);
});

test("B5892: the card tells home news, counts the rest, and keeps old news out unless a time skip is told", () => {
  const am = {id: "a", year: 2027, region: "AM", place: "Sacramento"}, old = {id: "b", year: 2020, region: "AM"};
  const af = {id: "c", year: 2027, region: "AF"}, meta = {id: "d", year: 2027};
  const out = R.newsFor([old, am, af, meta], R.newsCodes("north-america-west"), {date: {year: 2027, month: 6, day: 1}});
  assert.deepEqual(out.told.map(e => e.id), ["a", "d"]);
  assert.equal(out.older, 1);
  assert.equal(out.elsewhere, 1);
  const skip = R.newsFor([old, am], R.newsCodes("north-america-west"), {date: {year: 2027}, skip: true});
  assert.deepEqual(skip.told.map(e => e.id), ["b", "a"]);
  assert.ok(R.heardIn(meta, new Set(["OC"])), "an event with no region is heard everywhere");
});

test("B5891: regional events fire on their date whatever the homeland, so nothing floods in when it changes", () => {
  const ids = R.firedAt(FW.events, {year: 2030, month: 1, day: 1}, {futureBranch: true});
  assert.ok(ids.includes(FW.events.find(e => e.region === "OC" && e.year === 2026).id));
  assert.equal(R.firedAt(FW.events, {year: 2030}, {futureBranch: false}).length, 0, "the classic timeline has none");
});
