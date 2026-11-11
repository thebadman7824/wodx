import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.7.0: the sheet extras (possessions, money, strip, ties, history) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const X = await import(join(root, "modules/wodx-sheets/scripts/extras-rules.mjs"));
const H = await import(join(root, "modules/wodx-sheets/scripts/extras-html.mjs"));
const G = await import(join(root, "modules/wodx-library/data/goods.mjs"));

const it = (id, name, o = {}) => ({id, name, type: o.type ?? "Item", system: {iscontainer: !!o.box, conceal: o.conceal ?? "", isequipped: !!o.eq},
  flags: {"wodx-sheets": {in: o.in ?? null, qty: o.qty, holds: o.holds, coin: o.coin, stacks: o.stacks}, "wodx-library": o.lib ?? {}}});
const items = [
  it("purse", "Leather purse", {box: true, holds: "P"}),
  it("sack", "Satchel", {box: true, holds: "J"}),
  it("pen", "Pfennig coins", {in: "purse", qty: 30, coin: {denom: "Pfennig"}, conceal: "P"}),
  it("pen2", "Pfennig coins", {in: "purse", qty: 5, coin: {denom: "Pfennig"}, conceal: "P"}),
  it("knife", "Knife", {type: "Melee Weapon", conceal: "P"}),
  it("sword", "Broadsword", {type: "Melee Weapon", conceal: "N"}),
  it("watch", "a pocket watch", {in: "sack"})
];

test("concealment steps: pocket, jacket, coat or cloak, cannot hide", () => {
  assert.deepEqual(["P", "J", "T", "C", "N", "", "x"].map(X.concealStep), [0, 1, 2, 2, 3, null, null]);
});

test("containers: what fits, what does not, and nothing inside itself", () => {
  const by = id => items.find(i => i.id === id);
  assert.equal(X.canPut(by("knife"), by("purse"), items).ok, true);
  const big = X.canPut(by("sword"), by("purse"), items);
  assert.equal(big.ok, false); assert.match(big.why, /too big/);
  assert.equal(X.canPut(by("purse"), by("purse"), items).ok, false);
  assert.equal(X.canPut(by("watch"), by("knife"), items).ok, false);
  // a satchel inside a purse would put the purse in its own contents when the purse sits in the satchel
  const nested = items.map(i => i.id === "purse" ? {...i, flags: {"wodx-sheets": {...i.flags["wodx-sheets"], in: "sack"}}} : i);
  assert.equal(X.canPut(nested.find(i => i.id === "sack"), nested.find(i => i.id === "purse"), nested).ok, false);
  assert.deepEqual(X.contentsOf("purse", items).map(i => i.id), ["pen", "pen2"]);
});

test("stacks: same name and place merge; containers and things with contents never do", () => {
  const by = id => items.find(i => i.id === id);
  assert.equal(X.canStack(by("pen"), by("pen2"), items), true);
  assert.equal(X.canStack(by("pen"), by("knife"), items), false);
  assert.equal(X.canStack(by("purse"), {...by("purse"), id: "purse2"}, items), false);
  assert.equal(X.qtyOf(by("pen")), 30); assert.equal(X.qtyOf(by("knife")), 1);
});

test("era checks: by era list, by years, and the bridge eras", () => {
  assert.equal(X.eraStatus({eras: ["dark-ages"]}, "dark-ages"), "ok");
  assert.equal(X.eraStatus({eras: ["renaissance"]}, "age-of-reason"), "ok");
  assert.equal(X.eraStatus({eras: ["modern"], order: G.ERAS}, "dark-ages"), "early");
  assert.equal(X.eraStatus({eras: ["dark-ages"], order: G.ERAS}, "modern"), "late");
  assert.equal(X.eraStatus({firstYear: 1510, lastYear: 2099}, "dark-ages", 1197), "early");
  assert.equal(X.eraStatus({firstYear: 1200, lastYear: 1800}, "modern", 1999), "late");
  assert.equal(X.eraStatus(null, "modern"), null);
  assert.equal(X.tierAt("4>1600:2>1850:1", 1700), 2); assert.equal(X.tierAt("4>1600:2>1850:1", 1197), 4); assert.equal(X.tierAt(3), 3);
});

test("the possessions view groups, nests and flags things out of era", () => {
  const look = i => i.id === "watch" ? {eraInfo: {firstYear: 1510}} : {};
  const v = X.possessions(items, {look, era: "dark-ages", year: 1197});
  assert.deepEqual(v.groups.map(g => g.id), ["containers", "weapons"]);
  const purse = v.groups[0].rows.find(r => r.id === "purse");
  assert.equal(purse.contents.length, 2); assert.equal(purse.count, 2); assert.equal(purse.holds, "Pocket");
  const sack = v.groups[0].rows.find(r => r.id === "sack");
  assert.equal(sack.contents[0].eraNote, X.ERA_NOTE.early);
  assert.equal(v.outOfEra, 1);
  // a thing whose container is gone is loose again
  const lost = X.possessions([it("x", "Comb", {in: "nowhere"})]);
  assert.equal(lost.groups[0].rows[0].name, "Comb");
});

test("money by era: coins in use by year and place, and what is carried", () => {
  assert.ok(X.coinsAt("german", 1197).includes("Pfennig"));
  assert.ok(X.coinsAt("german", 1520).includes("Thaler"));
  assert.deepEqual(X.coinsAt("german", 1950), ["Pfennig", "Deutsche Mark"]);
  assert.ok(X.coinsAt("english", 1700).includes("Guinea"));
  assert.ok(X.coinsAt("american", 1880).includes("Dollar"));
  assert.ok(X.coinsAt("german", 2060).includes("Eurodollar"));
  for ( const c of Object.values(X.CURRENCIES) ) {
    // every year from 1197 to 2099 has coin, and the spans never overlap
    for ( let y = 1197; y <= 2099; y++ ) assert.equal(c.spans.filter(s => y >= s.from && y <= s.to).length, 1, `${c.label} ${y}`);
  }
  assert.deepEqual(X.moneyOf(items), [{denom: "Pfennig", count: 35}]);
});

test("the strip shows health, Willpower, the line's pools, soak and initiative", () => {
  const sys = {settings: {hasbloodpool: true, haswillpower: true}, advantages: {willpower: {temporary: 3, permanent: 5}, bloodpool: {temporary: 7, max: 10}, rage: {temporary: 2}},
    health: {damage: {bashing: 1, lethal: 1, aggravated: 0}}, soak: {bashing: 3, lethal: 0, aggravated: 0}, initiative: {total: 6}};
  const s = X.strip(sys, {healthLabel: "Hurt", conditions: ["Prone"]});
  assert.deepEqual(s.cells.map(c => c.key), ["health", "willpower", "bloodpool", "soak", "initiative"]);
  assert.equal(s.cells[0].text, "Hurt"); assert.equal(s.cells[2].text, "7 / 10"); assert.deepEqual(s.conditions, ["Prone"]);
  assert.equal(X.strip({}).cells[0].text, "Unhurt");
});

test("ties: roles in order, ghouls from their sheets, gone links marked, XP spent", () => {
  const rows = X.tieRows([{uuid: "Actor.b", role: "ally"}, {uuid: "Actor.gone", role: "mentor"}, {uuid: "Actor.b", role: "rival"}],
    [{uuid: "Actor.g", role: "ghoul", auto: true}], u => u === "Actor.gone" ? null : {name: u === "Actor.g" ? "Hans" : "Berta", kind: "Mortal", xpSpent: 4});
  assert.deepEqual(rows.map(r => [r.role, r.name, r.auto, r.gone]), [["ghoul", "Hans", true, false], ["ally", "Berta", false, false], ["mentor", "(gone)", false, true]]);
  assert.equal(X.xpSpent([{type: "Experience", system: {isspent: true, amount: 3}}, {type: "Experience", system: {isspent: false, amount: 9}}]), 3);
});

test("history: keeps what a person changed, drops the recompute, and holds the old values", () => {
  const before = {name: "A", system: {attributes: {strength: {value: 2, total: 2}}, settings: {isupdated: true}}};
  const e = X.entryFor(before, {system: {attributes: {strength: {value: 3}}, settings: {isupdated: false}}}, {at: 1, user: "Ben"});
  assert.deepEqual(e.undo, {"system.attributes.strength.value": 2}); assert.equal(e.label, "Strength");
  assert.equal(X.entryFor(before, {system: {settings: {isupdated: true}, attributes: {strength: {total: 3}}}}), null);
  let list = [];
  for ( let i = 0; i < 40; i++ ) list = X.pushEntry(list, {at: i});
  assert.equal(list.length, X.HISTORY_MAX); assert.equal(list[0].at, 39);
});

test("the markup escapes names and gives every growable list a search box", () => {
  const v = X.possessions([it("a", "<b>Evil</b> & co", {})]);
  const html = H.possessionsHtml(v, {money: {coins: [], inUse: ["Pfennig"], carried: 0, bank: 0}});
  assert.ok(!html.includes("<b>Evil</b>")); assert.ok(html.includes("&lt;b&gt;Evil"));
  assert.match(html, /class="wodx-search"/);
  assert.match(H.tiesHtml([]), /class="wodx-search"/);
  // fixed short lists say so
  for ( const sel of html.match(/<select[^>]*>/g) ?? [] ) assert.match(sel, /data-fixed/);
});

test("the extras are wired into every WoDX sheet and the module has a socket", () => {
  const main = readFileSync(join(root, "modules/wodx-sheets/scripts/main.mjs"), "utf8");
  assert.match(main, /X\.decorate\(this, el\)/); assert.match(main, /X\.listen\(this/); assert.match(main, /X\.setup\(\)/);
  const mod = JSON.parse(readFileSync(join(root, "modules/wodx-sheets/module.json"), "utf8"));
  assert.equal(mod.socket, true); assert.equal(mod.version, "0.8.2");
  assert.match(main, /version: "0\.8\.2"/);
});
