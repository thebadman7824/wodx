import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The weekly market turn (Storyteller 0.48.0, B2370-B2376) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const MK = await imp("modules/wodx-storyteller/scripts/market-rules.mjs");
const R = await imp("modules/wodx-storyteller/scripts/market-turn-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const kinds = Object.keys(G.KINDS);
const st = markets => MK.normState({markets}, kinds);
const find = (s, id) => s.markets.find(m => m.id === id);

test("market turn: links go both ways, only to markets that exist; cut and weeks kept", () => {
  const s = st([{id: "town", name: "Town", links: ["village", "ghost", "town"], cut: 1, supply: {food: "short"}, seen: {food: {level: "short", weeks: 2}, fuel: {level: "short", weeks: 4}}},
    {id: "village", name: "Village"}]);
  assert.deepEqual(find(s, "town").links, ["village"]);
  assert.deepEqual(find(s, "village").links, ["town"]);
  assert.equal(find(s, "town").cut, true);
  assert.deepEqual(find(s, "town").seen, {food: {level: "short", weeks: 2}});
  assert.equal(find(s, "village").cut, false);
});

test("market turn: seasons by month, full before 1850, half to 1950, slight after; trade faster with railways", () => {
  assert.equal(R.seasonShift("food", 1, 1197), 0.25);
  assert.equal(R.seasonShift("food", 9, 1600), -0.2);
  assert.equal(R.seasonShift("food", 1, 1900), 0.13);
  assert.equal(R.seasonShift("food", 1, 2000), 0.04);
  assert.equal(R.seasonShift("fuel", 7, 1197), -0.1);
  assert.equal(R.seasonShift("tools", 1, 1197), 0);
  assert.equal(R.tradeShare(1197), 0.15);
  assert.equal(R.tradeShare(1880), 0.3);
  assert.equal(R.tradeShare(2030), 0.5);
  assert.equal(R.targetIndex("short", "food", 1, 1197), 1.65);
  assert.equal(R.targetIndex("normal", "tools", 6, 1197), 1);
  assert.equal(R.floorOf(0), null);
  assert.equal(R.floorOf(2), "normal");
  assert.equal(R.floorOf(3), "plenty");
});

test("market turn: prices drift toward supply and season in small steps", () => {
  const s = st([{id: "town", name: "Town", index: {food: 3}, supply: {food: "short"}}]);
  const r = R.weekTurn(s, {kinds, month: 7, year: 1300});
  const c = r.changes.find(x => x.kind === "food");
  assert.equal(c.from.index, 3);
  assert.equal(c.to.index, 2.8);
  assert.ok(Math.abs(c.to.index - c.from.index) <= R.SMALL + 1e-9);
  assert.equal(c.big, false);
  // Winter food in 1197 climbs from normal toward 1.25
  const w = R.weekTurn(st([{id: "t", name: "T"}]), {kinds, month: 1, year: 1197});
  assert.equal(find(w.state, "t").index.food, 1.09);
  assert.ok(w.changes.find(x => x.kind === "food").why.includes("the season"));
  // Midsummer tools: nothing to do
  assert.equal(R.weekTurn(st([{id: "t", name: "T"}]), {kinds: ["tools"], month: 7, year: 1197}).changes.length, 0);
});

test("market turn: supply recovers toward normal after its weeks, never below what workshops keep up", () => {
  let s = st([{id: "t", name: "T", supply: {food: "short", cloth: "plenty", tools: "plenty"}}]);
  const k = ["food", "cloth", "tools"];
  for ( let i = 0; i < 3; i++ ) s = R.weekTurn(s, {kinds: k, month: 7, year: 1300, works: {t: {tools: 3}}}).state;
  assert.equal(MK.supplyOf(find(s, "t"), "food"), "short");
  assert.equal(MK.supplyOf(find(s, "t"), "cloth"), "normal");
  assert.equal(MK.supplyOf(find(s, "t"), "tools"), "plenty");
  s = R.weekTurn(s, {kinds: k, month: 7, year: 1300}).state;
  assert.equal(MK.supplyOf(find(s, "t"), "food"), "normal");
  // Making: one working place lifts an empty stall a step a week
  let e = st([{id: "t", name: "T", supply: {arms: "none"}}]);
  e = R.weekTurn(e, {kinds: ["arms"], month: 7, year: 1300, works: {t: {arms: 1}}}).state;
  assert.equal(MK.supplyOf(find(e, "t"), "arms"), "short");
  const r = R.weekTurn(e, {kinds: ["arms"], month: 7, year: 1300, works: {t: {arms: 1}}});
  assert.equal(MK.supplyOf(find(r.state, "t"), "arms"), "normal");
  assert.ok(r.changes[0].why.includes("the town's workshops make more"));
});

test("market turn: linked markets trade goods and meet on price; a drain where a player is waits", () => {
  const s = st([{id: "a", name: "Brno", links: ["b"], supply: {food: "plenty"}, index: {food: 0.8}}, {id: "b", name: "Rothenstein", supply: {food: "short"}, index: {food: 1.4}}]);
  const r = R.weekTurn(s, {kinds: ["food"], month: 7, year: 1300});
  assert.equal(MK.supplyOf(find(r.state, "a"), "food"), "normal");
  assert.equal(MK.supplyOf(find(r.state, "b"), "food"), "normal");
  assert.ok(r.changes.find(c => c.id === "b").why.includes("goods come from Brno"));
  assert.ok(MK.indexOf(find(r.state, "a"), "food") > 0.8);
  // Normal against none: the normal market drains to short, big; with a player there it waits in the queue
  const d = st([{id: "a", name: "Brno", links: ["b"]}, {id: "b", name: "Rothenstein", supply: {food: "none"}}]);
  const q = R.weekTurn(d, {kinds: ["food"], month: 7, year: 1300, pcMarkets: ["a"]});
  const big = q.changes.find(c => c.id === "a");
  assert.equal(big.big, true);
  assert.equal(big.queue, true);
  assert.equal(MK.supplyOf(find(q.state, "a"), "food"), "normal");
  const quiet = R.weekTurn(d, {kinds: ["food"], month: 7, year: 1300});
  assert.equal(quiet.changes.find(c => c.id === "a").queue, false);
  assert.equal(MK.supplyOf(find(quiet.state, "a"), "food"), "short");
});

test("market turn: a cut-off market is left alone and does not trade", () => {
  const s = st([{id: "a", name: "Under siege", cut: true, links: ["b"], supply: {food: "none"}, index: {food: 3}}, {id: "b", name: "B", supply: {food: "plenty"}}]);
  const r = R.weekTurn(s, {kinds: ["food"], month: 1, year: 1300});
  assert.equal(r.changes.some(c => c.id === "a"), false);
  assert.equal(MK.supplyOf(find(r.state, "a"), "food"), "none");
  assert.equal(MK.indexOf(find(r.state, "a"), "food"), 3);
  assert.equal(R.settle(s, {kinds: ["food"], month: 1, year: 1300}).changes.some(c => c.id === "a"), false);
});

test("market turn: turns due, twelve at most, the rest settle; merged changes", () => {
  assert.deepEqual(R.turnsDue(null, 100), {due: 0, skipped: 0, start: true});
  assert.equal(R.turnsDue(0, R.WEEK * 3 + 5).due, 3);
  assert.deepEqual(R.turnsDue(0, R.WEEK * 30), {due: 12, skipped: 18, start: false});
  const s = st([{id: "t", name: "T", supply: {food: "none"}, index: {food: 3}}]);
  const dates = Array.from({length: 12}, () => ({month: 7, year: 1300}));
  const r = R.runTurns(s, {dates, skipped: 18, settleAt: {month: 9, year: 1300}, kinds: ["food"]});
  assert.equal(r.changes.length, 1);
  assert.equal(r.changes[0].from.index, 3);
  assert.equal(r.changes[0].to.index, 0.8);
  assert.equal(r.changes[0].to.supply, "normal");
  assert.deepEqual(find(r.state, "t").seen, {});
});

test("market turn: talk of dear and cheap goods starts once and ends when prices meet", () => {
  const s = st([{id: "a", name: "Brno", links: ["b"], index: {food: 0.8}}, {id: "b", name: "Rothenstein", index: {food: 1.6}}]);
  const r = R.rumoursDue(s, [], {kinds: ["food", "tools"]});
  assert.equal(r.fresh.length, 1);
  assert.equal(r.fresh[0].dear.name, "Rothenstein");
  assert.equal(r.fresh[0].cheap.name, "Brno");
  assert.equal(R.rumoursDue(s, r.told, {kinds: ["food"]}).fresh.length, 0);
  const closer = st([{id: "a", name: "Brno", links: ["b"], index: {food: 1}}, {id: "b", name: "Rothenstein", index: {food: 1.2}}]);
  assert.deepEqual(R.rumoursDue(closer, r.told, {kinds: ["food"]}).told, []);
});

test("market turn: snapshot and restore put markets back", () => {
  const s = st([{id: "t", name: "T", supply: {food: "short"}, index: {food: 1.4}}]);
  const snap = R.snapshot(s, ["t"]);
  const moved = R.weekTurn(s, {kinds: ["food"], month: 7, year: 1300}).state;
  const back = R.restore(moved, snap);
  assert.deepEqual(find(back, "t").index, {food: 1.4});
  assert.deepEqual(find(back, "t").supply, {food: "short"});
});

test("market turn: wired into the Storyteller (setting, hooks, queue, window, api)", () => {
  const t = src("modules/wodx-storyteller/scripts/market-turn.mjs");
  assert.match(t, /register\(MOD, "marketTurn"/);
  assert.match(t, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(t, /registerApprovalHandler\?\.\(TYPE/);
  assert.match(t, /startRumour/);
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(main, /Turn\.registerMarketTurnSettings\(\)/);
  assert.match(main, /marketTurn: Turn\.api\(\)/);
  const w = src("modules/wodx-storyteller/scripts/markets.mjs");
  assert.match(w, /Run a week now/);
  assert.match(w, /name="cut"/);
  assert.match(src("modules/wodx-storyteller/scripts/owners.mjs"), /export function workshopCounts/);
});
