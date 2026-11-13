import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Hunters across a region: pressure, bodies by faith and era, files on culprits, the trail (B3300-B3305) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-storyteller/scripts/hunters-rules.mjs");
const DAY = H.DAY;

test("hunters: the line by year follows WoDX's hunter rules (B42)", () => {
  assert.equal(H.lineOf(1197), "inquisitor");
  assert.equal(H.lineOf(1499), "inquisitor");
  assert.equal(H.lineOf(1500), "hh2");
  assert.equal(H.lineOf(1998), "hh2");
  assert.equal(H.lineOf(1999), "reckoning");
  assert.equal(H.lineOf(2010, {futureBranch: true}), "hh2");
  assert.equal(H.lineOf(2023, {futureBranch: true}), "reckoning");
});

test("hunters: who hunts follows faith and year", () => {
  const keys = o => H.bodiesFor(o).map(b => b.key);
  assert.equal(keys({faith: "western", year: 1197})[0], "church-courts");
  assert.equal(keys({faith: "western", year: 1231})[0], "inquisition");
  assert.equal(keys({faith: "western", year: 1833})[0], "inquisition");
  assert.equal(keys({faith: "western", year: 1834})[0], "leopold");
  assert.equal(keys({faith: "islamic", year: 1300})[0], "sayyadin");
  assert.equal(keys({faith: "islamic", year: 1453})[0], "ikhwan");
  assert.equal(keys({faith: "hindu", year: 1600})[0], "local");
  assert.equal(keys({faith: "chinese", year: 1999})[0], "imbued");
  assert.equal(keys({faith: "western", year: 2010, futureBranch: true}).includes("imbued"), false);
  assert.ok(keys({faith: "western", year: 2023, futureBranch: true}).includes("imbued"));
  // The Arcanum and the Society reach other lands only once an investigation is under way
  assert.equal(keys({faith: "hindu", year: 1900}).includes("leopold"), false);
  assert.ok(keys({faith: "hindu", year: 1900, stage: 3}).includes("leopold"));
  assert.ok(keys({faith: "hindu", year: 1900}).includes("arcanum"));
  assert.equal(keys({faith: "hindu", year: 1800}).includes("arcanum"), false);
  // Names of the security service by region
  const us = H.bodiesFor({faith: "western", year: 1990, region: "north-america"}).find(b => b.key === "agency");
  assert.match(us.label, /Special Affairs/);
  // Every body carries a reference
  for ( const b of H.BODIES ) assert.ok(b.ref && b.ref.length > 5, b.key);
});

test("hunters: pressure, stages, cooling and the witch trials", () => {
  let r = H.normRegion({});
  let res = H.addPressure(r, "heatHunted", 0, {faith: "orthodox", year: 1300, why: "x"});
  assert.equal(res.after, 2);
  assert.equal(res.crossed?.key, "rumours");
  r = res.region;
  assert.equal(r.log.length, 1);
  res = H.addPressure(r, "breach", DAY);
  assert.equal(res.after, 3);
  assert.equal(res.crossed, null);
  // Witch trials: half as fast again, rounded up, in Western church lands 1450-1650
  assert.equal(H.addPressure({}, "breach", 0, {faith: "western", year: 1500}).after, 2);
  assert.equal(H.addPressure({}, "breach", 0, {faith: "western", year: 1700}).after, 1);
  assert.equal(H.addPressure({}, "breach", 0, {faith: "islamic", year: 1500}).after, 1);
  // Capped at MAX
  assert.equal(H.addPressure({pressure: 9}, "heatHunted", 0).after, H.MAX);
  // Cools one for every QUIET_DAYS without news
  const c = H.cooled({pressure: 5, last: 0}, 29 * DAY);
  assert.equal(c.pressure, 3);
  assert.equal(H.stageOf(0).key, "quiet");
  assert.equal(H.stageOf(6).key, "investigating");
  assert.equal(H.stageOf(10).key, "purge");
  assert.equal(H.huntExtra(2, 10), 3);
  assert.equal(H.huntExtra(0, 5), 0);
});

test("hunters: files grow by stage and learning; levels cap at 4", () => {
  let r = H.normRegion({pressure: 6, last: 0});
  r = H.noteCulprit(r, {id: "a1", name: "Ilse"}, 0, {gain: 1, kind: "Vampire"}).region;
  assert.equal(r.files.a1.level, 1);
  assert.equal(r.files.a1.kind, "Vampire");
  assert.equal(H.turnGain(1), 0);
  assert.equal(H.turnGain(3), 2);
  assert.equal(H.turnGain(3, 2), 4);
  const t = H.regionTurn(r, DAY, {bodies: H.bodiesFor({faith: "islamic", year: 1600})});
  assert.ok(t.events.some(e => e.kind === "level"));
  assert.equal(t.region.files.a1.level, 2);
  let big = H.noteCulprit(r, {id: "a1", name: "Ilse"}, 0, {gain: 40}).region;
  assert.equal(big.files.a1.level, 4);
  assert.equal(big.files.a1.progress, 0);
});

test("hunters: a turn sends an investigator, then raids, and remembers what it did", () => {
  const bodies = H.bodiesFor({faith: "western", year: 1600});
  const t1 = H.regionTurn({pressure: 7, last: 0, stage: "watching"}, DAY, {bodies, veilLow: false});
  assert.ok(t1.events.some(e => e.kind === "stage"));
  assert.ok(t1.events.some(e => e.kind === "investigator"));
  let r = H.noteCulprit({pressure: 8, last: DAY, stage: "hunting"}, {id: "a1", name: "Ilse"}, DAY, {gain: 4}).region;
  const t2 = H.regionTurn(r, 2 * DAY, {bodies});
  const raid = t2.events.find(e => e.kind === "raid");
  assert.equal(raid?.file?.id, "a1");
  assert.equal(t2.events.some(e => e.kind === "stage"), false);
  assert.ok(H.regionTurn({pressure: 10, last: 2 * DAY, stage: "purge"}, 2 * DAY, {bodies}).events.some(e => e.kind === "purge"));
  r = H.markActed(t2.region, H.actKey(raid), 2 * DAY);
  assert.equal(H.actedLately(r, "raid:a1", 10 * DAY), true);
  assert.equal(H.actedLately(r, "raid:a1", 40 * DAY), false);
  // The Arcanum alone never raids
  assert.equal(H.canRaid([H.BODIES.find(b => b.key === "arcanum")]), false);
  // A failing Veil feeds a region already stirring, not a quiet one
  assert.equal(H.regionTurn({pressure: 2, last: 0}, DAY, {bodies, veilLow: true}).region.pressure, 3);
  assert.equal(H.regionTurn({pressure: 1, last: 0}, DAY, {bodies, veilLow: true}).region.pressure, 1);
});

test("hunters: word follows a culprit to another region at the speed of the year", () => {
  const files = {a1: H.normFile({id: "a1", name: "Ilse", level: 3}), b2: H.normFile({id: "b2", name: "Wen", level: 1})};
  const out = H.trailFrom("moravia", files, {a1: "levant", b2: "levant"}, 100, 1300);
  assert.equal(out.length, 1);
  assert.equal(out[0].file.level, 2);
  assert.equal(out[0].at, 100 + 60 * DAY);
  assert.equal(H.trailFrom("moravia", files, {a1: "levant"}, 0, 2010)[0].at, 0);
  assert.equal(H.trailFrom("moravia", files, {a1: "moravia"}, 0, 2010).length, 0);
  assert.equal(H.trailFrom("moravia", files, {a1: "levant"}, 0, 2010, () => true).length, 0);
  assert.equal(H.trailFrom("moravia", files, {a1: "levant"}, 0, 2010, () => false, out).length, 0);
});

test("hunters: turns due and state cleaning", () => {
  assert.equal(H.turnsDue(null, 0), 1);
  assert.equal(H.turnsDue(0, 6 * DAY), 0);
  assert.equal(H.turnsDue(0, 15 * DAY), 2);
  const s = H.normState({regions: {moravia: {pressure: 99, files: {x: {name: "X", level: 9}}}}, trail: [{file: {id: "x"}, to: "levant", at: 5}, {bad: 1}], lastTurn: null});
  assert.equal(s.regions.moravia.pressure, H.MAX);
  assert.equal(s.regions.moravia.files.x.level, 4);
  assert.equal(s.trail.length, 1);
  assert.equal(s.lastTurn, null);
});

test("hunters: Storyteller wiring (setting, api, Upkeep button, heat feed, approvals)", () => {
  const m = src("modules/wodx-storyteller/scripts/main.mjs"), u = src("modules/wodx-storyteller/scripts/upkeep.mjs"), h = src("modules/wodx-storyteller/scripts/hunters.mjs");
  assert.match(m, /Hunters\.registerHunterSettings\(\)/);
  assert.match(m, /Hunters\.registerHunterHandlers\(\)/);
  assert.match(m, /hunters: Hunters\.api\(\)/);
  assert.match(u, /Hunters\.onHeat\(/);
  assert.match(u, /action: "hunters"/);
  assert.match(u, /rulesHuntExtra/);
  assert.match(h, /"hunterPressure"/);
  assert.match(h, /wodxHunterStage/);
  assert.match(h, /Hooks\.on\("wodxCultNoticed"/);
  assert.equal(H.addPressure({}, "cultMoved", 0).after, 2);
  assert.match(h, /registerHandler\?\.\(T_HUNTERS/);
  // Players never see the files: every card is whispered to the Storytellers
  for ( const m2 of h.matchAll(/ChatMessage\.create\(\{[^]*?\}\)/g) ) assert.match(m2[0], /whisper: gmIds\(\)/);
});
