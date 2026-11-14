import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Papers and the undying (B3612-B3613) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const P = await imp("modules/wodx-chronicle/scripts/law-papers-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");
const R = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");

test("papers: the records grow with the years", () => {
  assert.deepEqual(P.recordsFor("latin", 1197).map(r => r.id), ["rolls"]);
  assert.ok(P.recordsFor("latin", 1600).some(r => r.id === "registers"));
  assert.ok(!P.recordsFor("common", 1500).some(r => r.id === "registers") && P.recordsFor("common", 1540).some(r => r.id === "registers"));
  assert.ok(P.recordsFor("chinese", 1197).some(r => r.id === "household"));
  assert.ok(!P.recordsFor("common", 2000).some(r => r.id === "idcard"), "no identity card in Britain");
  assert.ok(P.paperWeight("latin", 2010) > P.paperWeight("latin", 1900) && P.paperWeight("latin", 1900) > P.paperWeight("latin", 1197));
  for ( const f of Object.keys(L.FAMILIES) ) assert.ok(P.recordsFor(f, 1197).length >= 1, f);
});

test("papers: a new self costs more, and is noticed sooner, as the records grow", () => {
  const a = P.newSelfProject("latin", 1300), b = P.newSelfProject("latin", 2010);
  assert.ok(b.diff > a.diff && b.goal > a.goal && b.resources > a.resources);
  assert.ok(b.diff <= 9 && a.diff >= 5);
  assert.ok(P.noticeChance("latin", 2010) > P.noticeChance("latin", 1300));
  assert.ok(P.noticeChance("latin", 1900, {quality: 5}) < P.noticeChance("latin", 1900, {quality: 1}));
  assert.ok(P.noticeChance("latin", 1900, {decades: 3}) > P.noticeChance("latin", 1900, {decades: 1}));
  assert.equal(P.qualityFrom(10, 5), 5);
  assert.equal(P.qualityFrom(5, 5), 3);
  assert.ok(P.heirChallenge("latin", 2010).chance > P.heirChallenge("latin", 1300).chance);
  const s = P.normSelf({name: "Anna", quality: 9, current: 1});
  assert.equal(s.quality, 5);
  assert.equal(s.current, true);
  for ( const l of Object.keys(P.LINE_PAPERS) ) assert.ok(l === "mortal" || P.LINE_PAPERS[l], l);
});

test("papers: the wiring", () => {
  assert.ok(R.KINDS.identity, "the Storyteller's project");
  assert.match(src("modules/wodx-storyteller/scripts/tasks.mjs"), /t\.kind === "identity"/);
  assert.match(src("modules/wodx-chronicle/scripts/law-papers.mjs"), /Hooks\.on\("wodxTaskDone"/);
  assert.match(src("modules/wodx-chronicle/scripts/law.mjs"), /checkSelves\(seen, y\)/);
  assert.match(src("modules/wodx-chronicle/scripts/main.mjs"), /registerPapersHooks\(\)/);
});
