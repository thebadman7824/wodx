import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* An inquisitor cell to live in (B7891-B7898; Dark Ages: Inquisitor Companion pp. 71-80, 95-98, 116; DA:I pp. 155-156) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-rules/storyteller/cell-rules.mjs");
const C = await imp("modules/wodx-rules/actions/inq-curses-rules.js");
const {ROTHENSTEIN} = await imp("modules/wodx-rothenstein/data/recipe.mjs");
const DAY = 86400;

const cell = (extra = {}) => R.normState({name: "Cell", founded: 0, members: [{id: "a", name: "Agnes"}, {id: "b", name: "Bertrand"}], ...extra});

test("B7891: the daily round and chapter; a week of the Rule kept or broken, from 1223 only", () => {
  let s = cell();
  for ( let d = 0; d < 5; d++ ) { s = R.markRound(s, "a", "office", d * DAY).state; s = R.markRound(s, "a", "meal", d * DAY + 100).state; }
  s = R.markRound(s, "b", "office", 0).state;
  assert.equal(R.markRound(s, "b", "office", 50).fresh, false, "once a day");
  for ( const d of [0, 2, 4] ) s = R.holdChapter(s, d * DAY).state;
  assert.equal(R.holdChapter(s, 4 * DAY + 5).fresh, false);
  const w = R.reckonWeek(s, 0, 7 * DAY, {year: 1230, pcs: ["a", "b"]});
  assert.deepEqual(w.rows.map(r => [r.id, r.office, r.meal, r.kept]), [["a", 5, 5, true], ["b", 1, 0, false]]);
  assert.equal(w.chapters, 3);
  assert.ok(w.chaptersKept);
  assert.deepEqual(w.sins.map(x => [x.id, x.event]), [["b", "disobey"]]);
  assert.equal(C.pietyEvent("disobey"), 6);
  assert.equal(R.reckonWeek(s, 0, 7 * DAY, {year: 1230, pcs: []}).sins.length, 0, "only players' inquisitors are asked");
  assert.equal(R.reckonWeek(s, 0, 7 * DAY, {year: 1200, pcs: ["b"]}).sins.length, 0, "no Rule before 1223");
  assert.equal(R.reckonWeek({...s, precursor: true}, 0, 7 * DAY, {year: 1230, pcs: ["b"]}).sins.length, 0, "nor in a household of the faithful");
  assert.ok(R.reckonDue(s, 0));
  assert.ok(!R.reckonDue({...s, lastReckon: 0}, 6 * DAY));
});

test("B7892: the rector set by the Council, elected after a year; the veto; the sub-rector leads", () => {
  const s = cell({rector: "a", rectorSince: 0});
  assert.equal(R.electionOpen(s, 100 * DAY).ok, false);
  assert.match(R.electionOpen(s, 100 * DAY).why, /full year/);
  assert.equal(R.electionOpen(s, 366 * DAY).ok, true);
  assert.equal(R.electionOpen({...s, precursor: true}, 400 * DAY).ok, false);
  assert.equal(R.setOfficer(s, "subrector", "b", {veto: true}).ok, false);
  const t = R.setOfficer(s, "subrector", "b").state;
  assert.equal(t.officers.subrector, "b");
  assert.equal(R.setOfficer(s, "pope", "b").ok, false);
  const g = R.rectorGone(t);
  assert.equal(g.acting, "b");
  assert.equal(R.leader(g.state), "b");
  assert.equal(R.leader(t), "a");
});

test("B7893: the chapter-house: pooled dots, rent, the ward; its Holy Ground and Flock go on the sheet", () => {
  assert.deepEqual(R.houseSpend({pooled: 6, size: 2, security: 3, holy: 1}).ok, true, "the book's example: six pooled");
  const h = R.houseSpend({pooled: 7, size: 3, security: 2, holy: 2});
  assert.equal(h.holy, 2);
  assert.equal(h.left, 0);
  assert.equal(R.houseSpend({pooled: 2, size: 2, holy: 1}).ok, false);
  assert.equal(R.houseSpend({pooled: 2, prisons: 2}).prisoners, 6);
  const house = R.normHouse({rent: "four shillings", paidUntil: null});
  assert.ok(R.rentOwed(house, 10));
  const paid = R.payRent(house, 10);
  assert.ok(!R.rentOwed(paid, 10 + 29 * DAY));
  assert.ok(R.rentOwed(paid, 10 + 30 * DAY));
  assert.ok(!R.rentOwed(R.normHouse({}), 10), "no rent named, none owed");
  const link = R.sheetLink(cell({house: {name: "St. Giles", holy: 2, pooled: 2}, flock: {name: "Parish", rating: 3}}), "k");
  assert.deepEqual(link, {key: "k", name: "Cell", house: "St. Giles", holy: 2, flock: 3, flockName: "Parish"});
  assert.ok(Object.keys(R.HOUSES).includes("presbytery"));
});

test("B7896: Sanctification of the Homestead: a day a success; a botch bars it three days", () => {
  const h = R.homestead(R.normHouse({}), {successes: 3}, 0);
  assert.equal(h.house.wardUntil, 3 * DAY);
  assert.ok(R.warded(h.house, 2 * DAY));
  assert.ok(!R.warded(h.house, 3 * DAY));
  const b = R.homestead(R.normHouse({}), {botch: true}, 0);
  assert.equal(b.house.noWardUntil, 3 * DAY);
  assert.equal(R.homestead(b.house, {successes: 2}, DAY).ok, false);
  assert.equal(R.homestead(b.house, {successes: 2}, 3 * DAY).ok, true);
});

test("B7895: retreats bank up to the highest Superior Virtue and its Virtue; off retreat one a day; rushed is a Curse roll", () => {
  assert.equal(C.retreatCap({faith: 2, zeal: 1}, {conscience: 3, courage: 4}), 5);
  assert.equal(C.retreatCap({}, {conscience: 3}), 0);
  assert.equal(C.bankRoom({onRetreat: false, today: 5, bankDay: 5, bankedToday: 1}).max, 0);
  assert.equal(C.bankRoom({onRetreat: false, today: 6, bankDay: 5, bankedToday: 1}).max, 1);
  assert.equal(C.bankRoom({onRetreat: true, cap: 5, banked: 2}).max, 3);
  assert.equal(C.retreatDays(3), 7);
  assert.equal(C.retreatDays(40), 30);
  const r = {from: 0, until: 14 * DAY, purpose: "endowment"};
  assert.ok(C.onRetreat(r, DAY));
  assert.deepEqual(C.retreatEnd(r, 3 * DAY), {days: 3, rushed: true});
  assert.equal(C.retreatEnd(r, 14 * DAY).rushed, false);
  assert.equal(C.retreatEnd({...r, purpose: "bank"}, DAY).rushed, false);
});

test("B7897: confession at chapter: confessed stays, hidden and found out leaves", () => {
  const s = cell({rector: "b", officers: {treasurer: "b"}});
  const c = R.sinAtChapter(s, {id: "a", name: "Agnes", confessed: true});
  assert.equal(c.leaves, false);
  assert.equal(c.state.members.length, 2);
  const h = R.sinAtChapter(s, {id: "b", name: "Bertrand", what: "a lie", confessed: false});
  assert.equal(h.leaves, true);
  assert.deepEqual(h.state.members.map(m => m.id), ["a"]);
  assert.equal(h.state.rector, null);
  assert.deepEqual(h.state.officers, {});
  assert.ok(!/—/.test(c.line + h.line));
});

test("B7898: Rothenstein's household of the faithful before 1223", () => {
  const c = ROTHENSTEIN.cells[0];
  assert.equal(c.precursor, true);
  assert.deepEqual(c.members, ["Anselm", "Thibault"]);
  assert.equal(c.house.kind, "presbytery");
  assert.ok(R.HOUSES[c.house.kind]);
  assert.ok(ROTHENSTEIN.cast.people.some(p => p.name.includes("Thibault")));
  assert.ok(ROTHENSTEIN.cast.sheets.some(p => p.match === "Anselm"));
  assert.equal(R.ruleOn({precursor: true}, 1230), false);
  assert.equal(R.ruleOn({}, 1222), false);
  assert.equal(R.ruleOn({}, 1223), true);
});

test("B7891-B7898: wiring: the window, the api, prayer, banking, waking", () => {
  const h = src("modules/wodx-actions/scripts/hunter.js"), m = src("modules/wodx-actions/scripts/main.js");
  const cm = src("modules/wodx-storyteller/scripts/cell.mjs"), st = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(h, /CR\.bankRoom\(/);
  assert.match(h, /At the chapter-house: Holy Ground/);
  assert.match(h, /the cell's Flock/);
  assert.match(h, /why: "A retreat rushed"/);
  assert.match(h, /async function wake\(/);
  assert.match(m, /wakeOnHolyGround:/);
  assert.match(m, /homestead: \(a, o\)/);
  assert.match(cm, /pietyPrompt\?\.\(a, "disobey"/);
  assert.match(cm, /inquisitor\.cell/);
  assert.match(st, /cell: Cell\.api\(\)/);
  assert.match(st, /wodxCell/);
});
