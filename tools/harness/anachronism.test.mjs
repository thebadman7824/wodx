import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The anachronism check (WoDX Sheets 0.8.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = await import(pathToFileURL(join(root, "modules/wodx-sheets/scripts/anachronism-rules.mjs")).href);
const X = await import(pathToFileURL(join(root, "modules/wodx-sheets/scripts/extras-rules.mjs")).href);
const G = await import(pathToFileURL(join(root, "modules/wodx-library/data/goods.mjs")).href);

const ORDER = G.ERAS;
const item = (id, name, info, extra = {}) => ({id, name, type: "Item", info, flags: {"wodx-sheets": extra}});
const look = it => ({eraInfo: it.info ? {order: ORDER, eras: [], ...it.info} : null});
const items = [
  item("a", "Flintlock pistol", {firstYear: 1600, lastYear: 1850}),
  item("b", "Mobile phone", {firstYear: 1985}),
  item("c", "Longsword", {firstYear: 1100, lastYear: 1600}),
  item("d", "Bread", null),
  item("e", "Family sword", {firstYear: 1100, lastYear: 1600}, {keepOutOfEra: true}),
  {id: "f", name: "Fortitude", type: "Power", info: {firstYear: 1990}, flags: {}}
];

test("a jump is a year or more, or a new era", () => {
  assert.equal(A.jumped({era: "victorian", year: 1880}, {era: "victorian", year: 1880}), false);
  assert.equal(A.jumped({era: "victorian", year: 1880}, {era: "victorian", year: 1881}), true);
  assert.equal(A.jumped({era: "victorian", year: 1880}, {era: "wild-west", year: 1880}), true);
  assert.equal(A.jumped(null, {era: "victorian", year: 1880}), false);
});

test("from 1500 to 1900: the sword and the pistol are antiques now", () => {
  const out = A.newlyOut(items, look, {era: "renaissance", year: 1500}, {era: "victorian", year: 1900});
  assert.deepEqual(out.map(o => [o.name, o.status]), [["Flintlock pistol", "late"], ["Longsword", "late"]]);
  assert.match(out[0].note, /antique/);
});

test("only what the jump changed: things already out of time stay quiet", () => {
  // The phone was already not made in 1500 and still is not in 1900
  assert.ok(!A.newlyOut(items, look, {year: 1500}, {year: 1900}).some(o => o.name === "Mobile phone"));
  const back = A.newlyOut(items, look, {year: 2000}, {year: 1700});
  assert.deepEqual(back.map(o => [o.name, o.status]), [["Mobile phone", "early"]]);
  assert.ok(!back.some(o => o.name === "Longsword"), "no longer made in 2000 or in 1700: nothing new");
});

test("kept items, powers and unknown goods are never raised; the sheet stops counting kept ones", () => {
  const out = A.newlyOut(items, look, {year: 1400}, {year: 2020});
  assert.ok(!out.some(o => ["Family sword", "Bread", "Fortitude"].includes(o.name)));
  const view = X.possessions(items, {look, year: 2020});
  assert.equal(view.outOfEra, 2); // the longsword and the pistol; the sword kept is not counted
  const row = view.groups.flatMap(g => g.rows).find(r => r.name === "Family sword");
  assert.equal(row.era, "kept");
  assert.match(row.eraNote, /kept/);
});

test("eras without years: goods listed by era", () => {
  const byEra = [item("g", "Telegraph key", {eras: ["victorian", "wild-west", "great-war"]})];
  const out = A.newlyOut(byEra, look, {era: "victorian", year: 0}, {era: "dark-ages", year: 0});
  assert.equal(out[0]?.status, "early");
});

test("automatic is on everywhere but the Live world", () => {
  assert.equal(A.isOn("auto", false), true);
  assert.equal(A.isOn("auto", true), false);
  assert.equal(A.isOn("on", true), true);
  assert.equal(A.isOn("off", false), false);
});
