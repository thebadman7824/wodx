import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {resolveEra, mergeProfiles, validateProfile} from "../scripts/era-resolve.mjs";

const data = JSON.parse(readFileSync(new URL("../data/eras.json", import.meta.url)));
const {profiles, rejected} = mergeProfiles(data.profiles);
const at = (y, o) => { const r = resolveEra(profiles, y, o); return [r.profile?.id, r.interlude]; };

test("shipped profiles are all valid", () => {
  assert.deepEqual(rejected, []);
  assert.equal(profiles.length, data.profiles.length);
});

test("years pick their era", () => {
  assert.deepEqual(at(1197), ["dark-ages", false]);
  assert.deepEqual(at(1200), ["dark-ages", false]);
  assert.deepEqual(at(1346), ["dark-ages", false]);
  assert.deepEqual(at(1347), ["long-night", false]);
  assert.deepEqual(at(1486), ["renaissance", false]);
  assert.deepEqual(at(1700), ["age-of-reason", false]);
  assert.deepEqual(at(1836), ["age-of-reason", false]);
  assert.deepEqual(at(1870), ["victorian", false]);
  assert.deepEqual(at(1916), ["great-war", false]);
  assert.deepEqual(at(1950), ["mid-century", false]);
  assert.deepEqual(at(1910), ["victorian", true]);
  assert.deepEqual(at(1999), ["modern", false]);
  assert.deepEqual(at(2004), ["modern", true]);
  assert.deepEqual(at(2020), ["modern", true]);
  assert.deepEqual(at(1100), ["dark-ages", true]);
});

test("region and rules", () => {
  assert.deepEqual(at(1870, {region: "americas"}), ["wild-west", false]);
  assert.deepEqual(at(1850, {region: "americas"}), ["victorian", false]);
  assert.deepEqual(at(2004, {rules: {timeOfJudgment: true}}), ["time-of-judgment", false]);
  assert.deepEqual(at(2020, {rules: {futureBranch: true}}), ["future-darkness", false]);
  assert.deepEqual(at(2007, {rules: {futureBranch: true}}), ["modern", true]);
});

test("Future Darkness skips the Time of Judgment and ends in the Time of Future Judgement", () => {
  const both = {rules: {futureBranch: true, timeOfJudgment: true}};
  assert.deepEqual(at(2004, both), ["modern", true]);
  assert.deepEqual(at(2098, both), ["future-darkness", false]);
  assert.deepEqual(at(2099, both), ["time-of-future-judgement", false]);
  assert.deepEqual(at(2150, both), ["time-of-future-judgement", true]);
  assert.deepEqual(at(2099), ["modern", true]);
  assert.deepEqual(at(2099, {rules: {timeOfJudgment: true}}), ["time-of-judgment", true]);
});

test("prologues never resolve by date", () => {
  for ( let y = 1000; y < 2100; y += 7 ) assert.ok(!["classical", "living-gods"].includes(at(y)[0]));
});

test("world profiles replace or add, invalid ones are rejected", () => {
  const world = [{...data.profiles[0], name: "Bohemian Dark Ages"}, {id: "Bad Id", name: "x", start: 1, end: 0, system: {}}];
  const m = mergeProfiles(data.profiles, world);
  assert.equal(m.profiles.find(p => p.id === "dark-ages").name, "Bohemian Dark Ages");
  assert.equal(m.rejected.length, 1);
  assert.ok(validateProfile({id: "x", name: "x", start: 1, end: 2, system: {mortal: "modern", vampire: "modern", werewolf: "modern", mage: "darkages"}}).length);
});
