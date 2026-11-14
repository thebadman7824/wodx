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

/* Things on the maps (WoDX Sheets 0.14.0, Interactables 0.34.0) */

const IR = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs")).href);
const thing = (id, f, extra = {}) => ({scene: "s1", sceneName: "Market square", id, wall: !!extra.wall, ...IR.datedParts(f, {wall: !!extra.wall}), kept: !!extra.kept, keptGoods: extra.keptGoods ?? []});
const GOODS_INFO = {"flintlock pistol": {firstYear: 1600, lastYear: 1850}, "mobile phone": {firstYear: 1985}, "bread": null};
const lookLine = line => { const ref = A.lineOf(line).ref; return {name: ref, eraInfo: GOODS_INFO[ref.toLowerCase()] ? {order: ORDER, eras: [], ...GOODS_INFO[ref.toLowerCase()]} : null}; };

test("what on a tile or door belongs to a span of years", () => {
  assert.deepEqual(IR.datedParts({mount: true, mountKind: "car"}).parts, [{key: "mount", label: "Motor car", from: 1900, until: null}]);
  assert.deepEqual(IR.datedParts({mount: true, mountKind: "carriage"}).parts, [{key: "mount", label: "Carriage or coach", from: null, until: IR.ANTIQUE_AFTER.mount.carriage}]);
  assert.equal(IR.datedParts({mount: true, mountKind: "horse"}).parts.length, 0, "a horse belongs to every year");
  assert.equal(IR.datedParts({watch: true, watchKind: "radio"}).parts[0].from, 1930);
  assert.equal(IR.datedParts({watch: true, watchKind: "mirror"}).parts.length, 0);
  assert.equal(IR.datedParts({light: true, lightKind: "switch"}).parts[0].from, IR.ELECTRIC_FROM);
  assert.equal(IR.datedParts({light: true, lightKind: "torch"}).parts.length, 0);
  assert.equal(IR.datedParts({hazard: true, hazardKind: "shock"}).parts[0].from, IR.ELECTRIC_FROM);
  assert.equal(IR.datedParts({hazard: true, hazardKind: "fire"}).parts.length, 0);
  assert.equal(IR.datedParts({electronic: "good"}, {wall: true}).parts[0].from, IR.ELECTRONIC_FROM);
  assert.equal(IR.datedParts({lock: "good"}, {wall: true}).parts.length, 0);
  const safe = IR.datedParts({container: true, kind: "safe", electronic: "excellent", items: "Flintlock pistol\nBread (3)"});
  assert.equal(safe.parts[0].key, "electronic");
  assert.deepEqual(safe.goods, ["Flintlock pistol", "Bread (3)"]);
  assert.equal(IR.datedParts({mount: true, mountKind: "car", title: "The Baron's Daimler"}).name, "The Baron's Daimler");
  // Every kind in the tables with a year is read, so a new dated kind cannot be missed
  for ( const [k, M] of Object.entries(IR.MOUNTS) ) assert.equal(IR.datedParts({mount: true, mountKind: k}).parts.length > 0, Number.isFinite(M.from) || k in IR.ANTIQUE_AFTER.mount, k);
  for ( const [k, W] of Object.entries(IR.WATCHES) ) assert.equal(IR.datedParts({watch: true, watchKind: k}).parts.length > 0, Number.isFinite(W.from), k);
});

test("a span of years: early, late, inside, and silence with no year", () => {
  assert.equal(A.spanStatus({from: 1900, until: null}, 1850), "early");
  assert.equal(A.spanStatus({from: 1900, until: null}, 1900), "ok");
  assert.equal(A.spanStatus({from: null, until: 1930}, 2020), "late");
  assert.equal(A.spanStatus({from: 1900}, 0), null);
  assert.equal(A.spanStatus({}, 1850), null);
  assert.deepEqual(A.lineOf("silver pennies (7)"), {ref: "silver pennies", count: 7});
  assert.deepEqual(A.lineOf(" Rope "), {ref: "Rope", count: 1});
});

test("back from 2020 to 1850: the car, the radio, the keypad and the phone in the safe are not made yet", () => {
  const things = [
    thing("t1", {mount: true, mountKind: "car"}),
    thing("t2", {watch: true, watchKind: "radio", title: "Guard room set"}),
    thing("t3", {mount: true, mountKind: "horse"}),
    thing("w1", {electronic: "good"}, {wall: true}),
    thing("t4", {container: true, kind: "safe", items: "Mobile phone\nBread\nFlintlock pistol (2)"}),
    thing("t5", {mount: true, mountKind: "carriage"})
  ];
  const out = A.mapNewlyOut(things, lookLine, {era: "modern", year: 2020}, {era: "victorian", year: 1850});
  assert.deepEqual(out.map(o => `${o.id} ${o.key} ${o.status}`).sort(), ["t1 mount early", "t2 watch early", "t4 goods:mobile phone early", "w1 electronic early"]);
  assert.deepEqual(out.map(o => o.name), [...out.map(o => o.name)].sort((x, y) => x.localeCompare(y)), "by name within a scene");
  assert.match(out.find(o => o.id === "t2").name, /Guard room set \(radio or walkie-talkie\)/);
  assert.match(out.find(o => o.id === "t4").name, /Mobile phone, in safe/);
  assert.match(out.find(o => o.id === "t1").note, /not made yet in 1850/);
  // The flintlock was an antique in 2020 and is in its time in 1850: nothing to say. The carriage is at home in 1850.
  assert.ok(!out.some(o => /flintlock/i.test(o.name) || o.id === "t5"));
});

test("forward from 1850 to 2020: the carriage and the flintlock are antiques; what was already wrong stays quiet", () => {
  const things = [thing("t1", {mount: true, mountKind: "car"}), thing("t5", {mount: true, mountKind: "carriage"}),
    thing("t4", {container: true, kind: "chest", items: "Flintlock pistol\nflintlock pistol\nMobile phone"}), thing("t6", {light: true, lightKind: "lamp"})];
  const out = A.mapNewlyOut(things, lookLine, {year: 1850}, {year: 2020});
  assert.deepEqual(out.map(o => `${o.id} ${o.status}`).sort(), ["t4 late", "t5 late", "t6 late"]);
  assert.equal(out.filter(o => o.id === "t4").length, 1, "the same line twice is raised once");
  // The same side of the span before and after: the car was not made yet in 1850 and still is not in 1880
  assert.equal(A.mapNewlyOut(things.slice(0, 2), lookLine, {year: 1850}, {year: 1880}).length, 0);
});

test("kept things and kept lines are never raised; an empty before lists everything out now", () => {
  const things = [thing("t1", {mount: true, mountKind: "car"}, {kept: true}),
    thing("t4", {container: true, kind: "chest", electronic: "good", items: "Mobile phone\nFlintlock pistol"}, {keptGoods: ["mobile phone"]})];
  const out = A.mapNewlyOut(things, lookLine, {}, {era: "dark-ages", year: 1230});
  assert.deepEqual(out.map(o => o.key).sort(), ["electronic", "goods:flintlock pistol"]);
  assert.equal(A.mapNewlyOut(things, lookLine, null, {year: 1230}).length, 2);
  assert.equal(A.mapNewlyOut([], lookLine, {}, {year: 1230}).length, 0);
  assert.equal(A.mapNewlyOut(things, lookLine, {}, {year: 0}).length, 0, "no year, nothing said");
});

test("a kept thing works in any year: the car drives in 1850, the keypad can be worked, the phone rings", () => {
  const ch = {actorId: "a", year: 1850, eraId: "victorian", dexterity: 3, perception: 2, abilities: {drive: 2, security: 2}};
  const car = IR.describeMount({mount: true, mountKind: "car"});
  assert.equal(IR.optionsFor(car, ch)[0].id, "eraNote");
  assert.ok(!IR.optionsFor(car, {...ch, kept: true}).some(o => o.id === "eraNote"));
  const phone = IR.describeWatch({watch: true, watchKind: "phone"});
  assert.equal(IR.optionsFor(phone, ch)[0].id, "eraNote");
  assert.ok(IR.optionsFor(phone, {...ch, kept: true}).some(o => o.id === "callHelp"));
  const lamp = IR.describeLight({light: true, lightKind: "switch"}, {on: false, count: 1});
  assert.equal(IR.optionsFor(lamp, ch)[0].id, "eraNote");
  assert.ok(IR.optionsFor(lamp, {...ch, kept: true}).some(o => o.id === "lightOn"));
  assert.equal(IR.isModern({year: 1850}), false);
  assert.equal(IR.isModern({year: 1850, kept: true}), true);
  const door = IR.describe({door: true, ds: "locked", flags: {electronic: "good"}});
  assert.ok(!IR.optionsFor(door, ch).some(o => o.id === "hack"));
  assert.ok(IR.optionsFor(door, {...ch, kept: true}).some(o => o.id === "hack"));
});
