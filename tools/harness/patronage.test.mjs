import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../modules/wodx-storyteller/scripts/patronage-rules.mjs";
import * as R from "../../modules/wodx-storyteller/scripts/tasks-rules.mjs";
import * as PR from "../../modules/wodx-storyteller/scripts/projects-rules.mjs";

test("patronage: forms and fashions follow the year and the way of life", () => {
  const keys = y => P.formsFor(y).map(f => f.key);
  assert.ok(keys(1197).includes("manuscript"));
  assert.ok(!keys(1197).includes("film"));
  assert.ok(keys(1950).includes("film"));
  assert.ok(!keys(1950).includes("game"));
  assert.ok(keys(2000).includes("webart"));
  const fash = (y, w) => P.fashionFor(y, w).map(m => m.key);
  assert.ok(fash(1250, "latin").includes("gothic"));
  assert.ok(!fash(1250, "sinic").includes("gothic"));
  assert.ok(fash(1250, "sinic").includes("ink"));
  assert.ok(fash(1750, "japanese").includes("ukiyoe"));
  assert.ok(fash(1820, "indic").includes("romantic"), "a movement with no ways is everywhere");
  assert.ok(P.inFashion("window", 1300, "latin"));
  assert.ok(!P.inFashion("window", 1300, "islamic"));
  // every era has something in fashion in the West
  for ( let y = 1200; y <= 2020; y += 10 ) assert.ok(P.fashionFor(y, "latin").length, `fashion in ${y}`);
});

test("patronage: quality from skill, money and fashion; status from quality", () => {
  assert.equal(P.qualityOf({skill: 2}), 2);
  assert.equal(P.qualityOf({skill: 2, money: 3, fashion: true}), 4);
  assert.equal(P.qualityOf({skill: 5, money: 5, fashion: true}), 5);
  assert.equal(P.qualityOf({skill: 0}), 1);
  assert.equal(P.qualityOf({skill: 3, ravaged: true}), 2);
  assert.equal(P.statusFor(3, true), 0);
  assert.equal(P.statusFor(4, false), 1);
  assert.equal(P.statusFor(5, true), 2);
});

test("patronage: a finished commission keeps the artist, and the fae make Dreamers or Ravage", () => {
  const artist = {id: "a1", name: "Ota", skill: 3, fame: 1};
  const r = P.finish({artist, formKey: "window", money: 2, year: 1300, way: "latin"});
  assert.equal(r.quality, 5);
  assert.equal(r.fashion, true);
  assert.equal(r.artist.fame, 2);
  assert.equal(r.artist.works, 1);
  assert.equal(r.toreador, true);
  assert.equal(P.finish({artist, formKey: "poem", year: 1300, fae: true}).artist.dreamer, true);
  const harsh = P.finish({artist, formKey: "poem", year: 1300, fae: true, handling: "harsh"}).artist;
  assert.equal(harsh.ravaged, true);
  assert.equal(harsh.skill, 2);
});

test("patronage: careers on the clock", () => {
  const a = {id: "a", name: "x", fame: 0, since: 0};
  assert.equal(P.monthArtist(a, {now: P.MONTH}).event, "");
  const s = P.monthArtist(a, {now: 6 * P.MONTH});
  assert.equal(s.event, "starving");
  assert.equal(P.monthArtist(s.artist, {now: 7 * P.MONTH, rand: () => 0}).event, "dead");
  assert.equal(P.monthArtist(s.artist, {now: 7 * P.MONTH, rand: () => 0.05}).event, "found");
  assert.equal(P.monthArtist(s.artist, {now: 7 * P.MONTH, rand: () => 0.9}).event, "");
  assert.equal(P.monthArtist({...s.artist, patron: "p"}, {now: 7 * P.MONTH}).event, "found");
  assert.equal(P.monthArtist({...a, fame: 3}, {now: 12 * P.MONTH}).event, "", "the famous do not starve");
  assert.equal(P.salonName(1250), "a court of song");
  assert.equal(P.salonName(1800), "a salon");
  assert.equal(P.salonName(2010), "a launch party");
});

test("patronage: a commission is a downtime project", () => {
  const t = R.normTask({kind: "commission", artist: "a1", form: "opera", money: 9, handling: "x"});
  assert.equal(t.kind, "commission");
  assert.equal(t.money, 5);
  assert.equal(t.handling, "kind");
  assert.ok(PR.troubleFor("commission", 1500).some(r => r.key === "censor"));
  assert.match(PR.outcomeOf({kind: "commission"}).text, /made over/);
});
