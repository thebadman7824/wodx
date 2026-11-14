import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Punishment and what follows (B3610-B3611) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const P = await imp("modules/wodx-chronicle/scripts/law-punish-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");

test("sentences: the land allows them, the deeds weigh them", () => {
  assert.equal(P.tierOf([{deed: "fight"}]).tier, "light");
  assert.equal(P.tierOf([{deed: "theft"}, {deed: "fire"}]).tier, "middle");
  assert.equal(P.tierOf([{deed: "fire"}, {deed: "fire"}, {deed: "theft"}]).tier, "grave");
  const grave = [{deed: "fire"}, {deed: "fire"}, {deed: "theft"}];
  assert.ok(P.sentencesFor(L.lawOf("british-isles", 1800), grave).list.includes("hanging"));
  assert.ok(!P.sentencesFor(L.lawOf("british-isles", 1980), grave).list.includes("hanging"), "hanging ended");
  assert.ok(P.sentencesFor(L.lawOf("russia", 1940), grave).list.includes("camp"));
  assert.ok(P.sentencesFor(L.lawOf("british-isles", 1800), [{deed: "theft"}, {deed: "theft"}, {deed: "fight"}]).list.includes("transportation"));
  for ( const r of Object.keys(L.REGION_FAMILY) ) for ( const y of [1197, 1700, 2000] ) for ( const d of [[{deed: "fight"}], grave] ) {
    const s = P.sentencesFor(L.lawOf(r, y), d);
    assert.ok(s.list.length > 0 && s.list.every(p => P.MARKS[p]), `${r} ${y}`);
  }
  for ( const p of Object.keys(L.PUNISH) ) assert.ok(P.MARKS[p], p);
});

test("sentences: the marks they leave", () => {
  const m = P.markFor("prison", {year: 1900, region: "moravia", weight: 4});
  assert.ok(m.until > 1900 && m.kind === "time" && m.record === "file");
  assert.equal(P.markFor("prison", {year: 1990}).record, "database");
  assert.equal(P.markFor("prison", {year: 1500}).record, "register");
  assert.ok(P.markFor("camp", {year: 1940, weight: 8}).until - 1940 > P.markFor("camp", {year: 1940, weight: 3}).until - 1940);
  const marks = [m, P.markFor("outlawry", {year: 1300, region: "moravia"}), P.markFor("maiming", {year: 1300}), P.markFor("fine", {year: 1300})];
  const s = P.standingHere(marks, "moravia", 1901);
  assert.ok(s.outlaw && s.branded && s.serving);
  assert.ok(!P.standingHere(marks, "russia", 1901).outlaw, "outlawry is the land's own");
  assert.equal(P.standingHere(marks, "moravia", 1990).serving, null, "time served");
  assert.ok(!P.standingHere([{...marks[1], pardoned: true}], "moravia", 1301).outlaw, "pardoned");
  assert.equal(P.inForce([P.markFor("fine", {year: 1300})], 1300).length, 0, "a fine is paid and done");
  for ( const l of Object.keys(P.LINE_PUNISH) ) assert.ok(l === "mortal" || P.LINE_PUNISH[l], l);
});

test("sentences: the wiring", () => {
  const p = src("modules/wodx-chronicle/scripts/law-punish.mjs"), m = src("modules/wodx-chronicle/scripts/main.mjs"), l = src("modules/wodx-chronicle/scripts/law.mjs");
  assert.match(p, /Hooks\.on\("wodxVerdict"/);
  assert.match(m, /registerPunishHooks\(\)/);
  assert.match(l, /playerMarks\(/);
});
