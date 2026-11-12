import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Faction moves on markets, traders going broke and caravans (Storyteller 0.49.0, B2380-B2389) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const MK = await imp("modules/wodx-storyteller/scripts/market-rules.mjs");
const R = await imp("modules/wodx-storyteller/scripts/market-turn-rules.mjs");
const MV = await imp("modules/wodx-storyteller/scripts/market-moves-rules.mjs");
const CR = await imp("modules/wodx-storyteller/scripts/caravan-rules.mjs");
const L = await imp("modules/wodx-interactables/scripts/living-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const kinds = Object.keys(G.KINDS);
const st = markets => MK.normState({markets}, kinds);
const find = (s, id) => s.markets.find(m => m.id === id);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const faction = (id, over = {}) => ({id, name: over.name ?? id, places: over.places ?? [], dormant: !!over.dormant, run: over.run ?? "auto", ruler: !!over.ruler,
  members: over.members ?? [], standing: over.standing ?? {}, assets: {retainers: 0, resources: 0, security: 0, influence: {}, ...(over.assets ?? {})}});
const town = (over = {}) => ({id: "town", name: "Town", scenes: ["s1"], links: ["village"], ...over});
const village = (over = {}) => ({id: "village", name: "Village", scenes: ["s2"], ...over});

test("market moves: a market keeps its moves, closed roads and what the weeks did to a trader", () => {
  const s = st([town({moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.2, weeks: 3}, {type: "tax", faction: "crown", name: "Again", rate: 0.3},
    {type: "monopoly", faction: "guild", name: "The Guild", goods: "food"}, {type: "monopoly", faction: "other", name: "Other", goods: "food"}, {type: "monopoly", faction: "guild", name: "No goods"},
    {type: "nonsense", faction: "x"}, {type: "smuggle", faction: "", name: "Nobody"}],
    unsafe: {village: 3, ghost: 2}, traders: [{actor: "a1", tile: "t1", behind: 2, shut: true, shutWeeks: 5, backer: "The Guild"}, {actor: "a2", tile: "t2"}]}), village()]);
  const t = find(s, "town");
  assert.deepEqual(t.moves.map(v => [v.type, v.faction, v.goods, v.rate, v.hand]), [["tax", "crown", "", 0.2, false], ["monopoly", "guild", "food", 0, false]]);
  assert.equal(t.moves[0].weeks, 3);
  assert.deepEqual(t.unsafe, {village: 3});
  assert.deepEqual(find(s, "village").unsafe, {town: 3}, "a closed road is closed from both ends");
  assert.deepEqual(t.traders, [{actor: "a1", tile: "t1", behind: 2, shut: true, shutWeeks: 5, backer: "The Guild"}, {actor: "a2", tile: "t2"}]);
  assert.deepEqual(MK.normState(JSON.parse(JSON.stringify(s)), kinds), s, "cleaning twice changes nothing");
});

test("market moves: a faction's powers are read across every period's spheres; home is a scene it holds", () => {
  const s = st([town(), village()]);
  const v = MV.viewOf(faction("crown", {places: ["Scene.s1.Region.r9"], assets: {retainers: 1, resources: 4, security: 2, influence: {crown: 3, guild: 1, military: 4, street: 2}}}), s.markets);
  assert.deepEqual({law: v.law, trade: v.trade, force: v.force, crime: v.crime, guard: v.guard, home: v.home}, {law: 3, trade: 1, force: 4, crime: 2, guard: 2, home: ["town"]});
  const m = MV.viewOf(faction("bank", {places: ["Scene.s2"], assets: {influence: {finance: 4, bureaucracy: 2, police: 1}}}), s.markets);
  assert.deepEqual({law: m.law, trade: m.trade, force: m.force, home: m.home}, {law: 2, trade: 4, force: 1, home: ["village"]});
  assert.deepEqual(MV.viewOf(faction("far", {places: ["Scene.s10"]}), s.markets).home, [], "Scene.s10 is not Scene.s1");
});

test("market moves: who can tax, corner, smuggle and raid, and why not", () => {
  const s = st([town({moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.1}]}), village()]);
  const views = [faction("crown", {places: ["Scene.s1"], assets: {security: 3, influence: {crown: 3}}}),
    faction("guild", {places: ["Scene.s1"], assets: {resources: 3, influence: {guild: 3}}}),
    faction("poor-guild", {places: ["Scene.s1"], assets: {resources: 2, influence: {guild: 4}}}),
    faction("thieves", {assets: {influence: {underworld: 2}}}),
    faction("knights", {standing: {crown: -2}, assets: {retainers: 3}}),
    faction("friends", {standing: {crown: 2}, assets: {retainers: 5}}),
    faction("prince", {ruler: true, assets: {influence: {crown: 2}}})].map(f => MV.viewOf(f, s.markets));
  const by = id => views.find(v => v.id === id), t = find(s, "town"), v = find(s, "village");
  assert.equal(MV.can(by("crown"), "tax", t, views).ok, false, "it already taxes every sale");
  assert.equal(MV.can(by("crown"), "tax", t, views, {goods: "drink"}).ok, true);
  assert.equal(MV.can(by("crown"), "tax", v, views).ok, false, "no place in the village");
  assert.equal(MV.can(by("prince"), "tax", v, views).ok, true, "the ruler taxes the whole domain");
  assert.equal(MV.can(by("guild"), "tax", t, views).ok, false);
  assert.equal(MV.can(by("guild"), "monopoly", t, views, {goods: "food"}).ok, true);
  assert.equal(MV.can(by("guild"), "monopoly", t, views).ok, false, "a monopoly is on one kind");
  assert.equal(MV.can(by("poor-guild"), "monopoly", t, views, {goods: "food"}).ok, false, "Resources 3 as well as trade 3");
  assert.equal(MV.can(by("thieves"), "smuggle", t, views).ok, true);
  assert.equal(MV.can(by("thieves"), "smuggle", v, views).ok, false, "nothing to run goods past");
  assert.equal(MV.can(by("knights"), "raid", t, views).ok, true);
  assert.equal(MV.can(by("friends"), "raid", t, views).ok, false, "it stands badly with nobody there");
  assert.equal(MV.can(by("crown"), "raid", t, views).ok, false, "it would rob itself");
  assert.equal(MV.guardOf(t, views), 3);
  assert.match(MV.can(by("guild"), "tax", t, views).why, /Influence over the law/);
});

test("market moves: taxes and monopolies raise the price goal, smuggling halves it, and the weekly turn follows", () => {
  const s = st([town({moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.2}, {type: "monopoly", faction: "guild", name: "The Guild", goods: "food"}]})]);
  const t = find(s, "town");
  assert.equal(MV.taxOn(t, "fuel"), 0.2);
  assert.equal(MV.priceShift(t, "coin"), 0, "a levy on every sale leaves money itself alone");
  assert.equal(MV.priceShift(t, "fuel"), 0.2);
  assert.equal(MV.priceShift(t, "food"), 0.5);
  const smug = find(st([town({moves: [...t.moves, {type: "smuggle", faction: "thieves", name: "Thieves"}]})]), "town");
  assert.equal(MV.priceShift(smug, "food"), 0.25);
  const own = find(st([town({moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.2}, {type: "smuggle", faction: "crown", name: "The Crown"}]})]), "town");
  assert.equal(MV.priceShift(own, "fuel"), 0.2, "nobody smuggles past their own tax");
  // Many crushing taxes stop at the cap
  const many = find(st([town({moves: [{type: "tax", faction: "a", name: "A", rate: 0.3}, {type: "tax", faction: "b", name: "B", rate: 0.3}, {type: "tax", faction: "c", name: "C", rate: 0.3}]})]), "town");
  assert.equal(MV.priceShift(many, "fuel"), MV.SHIFT_CAP);
  // The turn: prices climb toward 1 + the shift, a small step a week, and stay there
  let cur = s;
  for ( let i = 0; i < 12; i++ ) cur = R.weekTurn(cur, {kinds, month: 5, year: 1950, shift: MV.priceShift}).state;
  assert.ok(Math.abs(find(cur, "town").index.kitchen - 1.2) < 0.03);
  assert.ok(Math.abs(find(cur, "town").index.food - (1.5 + R.seasonShift("food", 5, 1950))) < 0.03);
  const first = R.weekTurn(s, {kinds, month: 5, year: 1950, shift: MV.priceShift});
  assert.ok(first.changes.find(c => c.kind === "kitchen").why.includes("taxes and those who hold the trade"));
  assert.ok(first.changes.every(c => c.to.index - c.from.index <= R.SMALL + 0.001));
  // A long skip settles on the taxed price
  assert.equal(find(R.settle(s, {kinds, month: 5, year: 1950, shift: MV.priceShift}).state, "town").index.kitchen, 1.2);
  // Without the option the turn is as it was
  assert.equal(R.weekTurn(s, {kinds, month: 5, year: 1950}).changes.some(c => c.kind === "kitchen"), false);
});

test("market moves: a closed road stops trade both ways, and opens when its weeks are up", () => {
  const s = st([town({supply: {food: "plenty"}, index: {fuel: 2}, unsafe: {village: 2}}), village({supply: {food: "none"}})]);
  assert.equal(MV.closed(find(s, "town"), find(s, "village")), true);
  assert.equal(MV.closed(find(s, "village"), find(s, "town")), true);
  const r = R.weekTurn(s, {kinds, month: 5, year: 1300, blocked: MV.closed});
  assert.equal(find(r.state, "village").supply.food, "none");
  assert.equal(r.changes.some(c => c.why.some(w => /goods go to|trade with/.test(w))), false);
  let w = MV.weekMoves(s, []);
  assert.deepEqual([find(w.state, "town").unsafe, find(w.state, "village").unsafe, w.opened], [{village: 1}, {town: 1}, []]);
  w = MV.weekMoves(w.state, []);
  assert.deepEqual([find(w.state, "town").unsafe, w.opened], [{}, [{a: "town", b: "village"}]], "one line for the road, not one an end");
  assert.equal(R.weekTurn(MK.normState(w.state, kinds), {kinds, month: 5, year: 1300, blocked: MV.closed}).state.markets[1].supply.food, "short");
});

test("market moves: a move lapses when its faction is gone, idle or has lost its hold; a heavy tax is talked of once", () => {
  const s = st([town({moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.2, weeks: 7}, {type: "tax", faction: "gone", name: "Gone", rate: 0.1},
    {type: "monopoly", faction: "guild", name: "The Guild", goods: "food"}, {type: "smuggle", faction: "thieves", name: "Thieves"}]})]);
  const all = [faction("crown", {places: ["Scene.s1"], assets: {influence: {crown: 2}}}), faction("guild", {places: ["Scene.s1"], assets: {resources: 3, influence: {guild: 3}}}),
    faction("thieves", {assets: {influence: {street: 2}}})];
  const views = fs => fs.map(f => MV.viewOf(f, s.markets));
  let w = MV.weekMoves(s, views(all));
  assert.deepEqual(w.lapsed.map(l => [l.move.faction, l.why]), [["gone", "the faction is gone"]]);
  assert.deepEqual(w.grumbles.map(g => [g.market, g.move.faction]), [["town", "crown"]]);
  assert.equal(find(w.state, "town").moves.find(v => v.faction === "crown").weeks, 8);
  w = MV.weekMoves(w.state, views(all));
  assert.equal(w.grumbles.length, 0, "told once");
  // The guild loses a dot, the crown its place: both lapse, and the smugglers have nothing left to run goods past
  const weak = [faction("crown", {assets: {influence: {crown: 2}}}), faction("guild", {places: ["Scene.s1"], assets: {resources: 3, influence: {guild: 2}}}), all[2]];
  w = MV.weekMoves(w.state, views(weak));
  assert.deepEqual(w.lapsed.map(l => l.move.type).sort(), ["monopoly", "smuggle", "tax"]);
  assert.deepEqual(find(w.state, "town").moves, []);
  // A move set by hand stands whatever the dots, but not once the faction is gone
  const hand = MK.normState(MV.addMove(st([town()]), {type: "monopoly", market: "town", faction: "crown", name: "The Crown", goods: "food", hand: true}, kinds).state, kinds);
  assert.equal(MV.weekMoves(hand, views(weak)).lapsed.length, 0);
  assert.equal(find(MV.weekMoves(hand, views(weak)).state, "town").moves[0].weeks, 1);
  assert.equal(MV.weekMoves(hand, []).lapsed[0].why, "the faction is gone");
  // A dormant faction's moves end; a market cut off is left alone
  assert.equal(MV.weekMoves(s, views([faction("crown", {places: ["Scene.s1"], dormant: true, assets: {influence: {crown: 5}}})])).lapsed.some(l => l.why === "the faction lies idle"), true);
  const cut = st([town({cut: true, moves: [{type: "tax", faction: "gone", name: "Gone", rate: 0.1}], unsafe: {village: 1}}), village()]);
  assert.equal(MV.weekMoves(cut, []).lapsed.length, 0);
});

test("market moves: a faction's week, one move at most, one a market, and where it must wait", () => {
  const s = st([town({index: {cloth: 1.6}}), village()]);
  const views = [faction("a-crown", {places: ["Scene.s1"], assets: {resources: 2, influence: {crown: 2}}}),
    faction("b-guild", {places: ["Scene.s1"], assets: {resources: 3, influence: {guild: 3}}}),
    faction("c-knights", {standing: {"a-crown": -1}, assets: {retainers: 2}}),
    faction("d-players", {run: "orders", places: ["Scene.s2"], assets: {influence: {crown: 5}}}),
    faction("e-asleep", {dormant: true, places: ["Scene.s2"], assets: {influence: {crown: 5}}})].map(f => MV.viewOf(f, s.markets));
  assert.equal(MV.pickMove(views[0], s, views, {kinds, rand: seq(0.5)}), null, "five weeks in six nothing is done");
  assert.deepEqual(MV.pickMove(views[0], s, views, {kinds, rand: seq(0)}), {type: "tax", market: "town", faction: "a-crown", name: "a-crown", goods: "", rate: 0.2});
  assert.equal(MV.pickMove({...views[0], resources: 3}, s, views, {kinds, rand: seq(0)}).rate, 0.1, "only a faction short of money taxes heavily");
  assert.equal(MV.pickMove(views[1], s, views, {kinds, rand: seq(0)}).goods, "cloth", "it corners what is dearest");
  assert.equal(MV.pickMove(views[2], s, views, {kinds, rand: seq(0)}).type, "raid");
  assert.equal(MV.pickMove(views[3], s, views, {kinds, rand: seq(0)}), null, "a faction the players run makes its own moves");
  assert.equal(MV.pickMove(views[4], s, views, {kinds, rand: seq(0)}), null);
  const plan = MV.planMoves(s, views, {kinds, randFor: () => seq(0), pcMarkets: [], pcFactions: []});
  assert.deepEqual(plan.map(p => [p.faction, p.type, p.queue]), [["a-crown", "tax", false]], "one new move a market a week");
  assert.equal(MV.planMoves(s, views, {kinds, randFor: () => seq(0), pcMarkets: ["town"]})[0].queue, true);
  assert.equal(MV.planMoves(s, views, {kinds, randFor: () => seq(0), pcFactions: ["a-crown"]})[0].queue, true);
  assert.equal(MV.planMoves(s, views, {kinds, randFor: () => seq(0.9)}).length, 0);
  // Once the tax stands the crown has nothing more to lay on the town, and the smugglers have something to run past
  const taxed = MK.normState(MV.addMove(s, plan[0], kinds).state, kinds);
  assert.equal(find(taxed, "town").moves.length, 1);
  assert.equal(MV.pickMove(views[0], taxed, views, {kinds, rand: seq(0)}), null);
  const thieves = MV.viewOf(faction("thieves", {assets: {influence: {underworld: 3}}}), s.markets);
  assert.equal(MV.pickMove(thieves, taxed, [...views, thieves], {kinds, rand: seq(0)}).type, "smuggle");
  assert.equal(MV.addMove(taxed, {type: "monopoly", market: "nowhere", faction: "x", goods: "food"}, kinds).move, null);
  assert.deepEqual(find(MV.dropMove(taxed, "town", find(taxed, "town").moves[0].id), "town").moves, []);
});

test("market moves: the words follow the year, from a market toll to a corporate levy", () => {
  const mv = {type: "tax", name: "The Crown", goods: "", rate: 0.2};
  assert.match(MV.describe(mv, {year: 1197}), /lays a market toll on every sale \(heavy/);
  assert.match(MV.describe(mv, {year: 1700}), /an excise/);
  assert.match(MV.describe(mv, {year: 1890}), /a duty/);
  assert.match(MV.describe(mv, {year: 1995}), /a sales tax/);
  assert.match(MV.describe(mv, {year: 2030}), /a corporate levy/);
  assert.match(MV.describe(mv, {year: 1999, future: true}), /a corporate levy/);
  assert.match(MV.describe({type: "monopoly", name: "The Guild", goods: "cloth"}, {year: 1300, kindLabel: () => "cloth and spice"}), /the staple right on cloth and spice/);
  assert.equal(MV.wordFor("raid", 1197), "robber knights");
  assert.equal(MV.wordFor("raid", 1750), "highwaymen");
  assert.equal(MV.wordFor("raid", 1990), "hijackers");
  for ( const type of Object.keys(MV.WORDS) ) for ( const y of [1197, 1600, 1850, 1950, 2050] ) assert.ok(MV.wordFor(type, y).length > 3);
});

test("market moves: a raid's roll, and what it does to a market with no caravan to take", () => {
  // rand 0.55 is a 6, 0 is a 1, 0.95 a 10
  assert.deepEqual(MV.rollRaid(3, 0, seq(0.55, 0.95, 0.2)), {dice: [6, 10, 3], successes: 2, botch: false, net: 2});
  assert.equal(MV.rollRaid(3, 2, seq(0.55, 0.95, 0.2)).net, 0, "the guard holds");
  assert.equal(MV.rollRaid(2, 0, seq(0, 0.3)).botch, true);
  assert.equal(MV.rollRaid(3, 0, seq(0.55, 0, 0.2)).successes, 0, "a one takes a success away");
  assert.equal(MV.rollRaid(40, 0, seq(0.9)).dice.length, 10);
  const s = st([town({supply: {food: "plenty"}, traders: [{actor: "a1", tile: "t1"}, {actor: "a2", tile: "t2", shut: true}]}), village()]);
  const only = ["food"];
  const r = MV.raidMarket(s, "town", 2, {kinds: only, rand: seq(0)});
  assert.deepEqual([r.kind, r.from, r.to, r.trader, r.share, r.road, r.weeks], ["food", "plenty", "normal", "a1", 0.5, "village", 2]);
  assert.deepEqual([find(r.state, "town").unsafe, find(r.state, "village").unsafe], [{village: 2}, {town: 2}]);
  assert.equal(MV.raidMarket(s, "town", 9, {kinds: only, rand: seq(0)}).weeks, MV.UNSAFE_MAX);
  assert.equal(MV.raidMarket(s, "town", 9, {kinds: only, rand: seq(0)}).share, 0.75);
  assert.equal(MV.raidMarket(s, "town", 0, {kinds: only}).kind, null);
  const bare = st([town({supply: {food: "none"}, links: []})]);
  assert.deepEqual((({kind, trader, road}) => [kind, trader, road])(MV.raidMarket(bare, "town", 1, {kinds: only, rand: seq(0)})), [null, null, null], "nothing to take");
});

test("traders: takings follow supply, taxes and a monopoly's squeeze", () => {
  const s = st([town({supply: {food: "short", fuel: "none", drink: "plenty"}, moves: [{type: "tax", faction: "crown", name: "The Crown", rate: 0.2, goods: "drink"},
    {type: "monopoly", faction: "guild", name: "The Guild", goods: "cloth"}]})]);
  const t = find(s, "town");
  assert.equal(MV.tradeFactor(t, {sells: ["food"], kinds}), 0.7);
  assert.equal(MV.tradeFactor(t, {sells: ["fuel"], kinds}), 0.2);
  assert.equal(MV.tradeFactor(t, {sells: ["drink"], kinds}), 0.88);
  assert.equal(MV.tradeFactor(t, {sells: ["cloth"], kinds}), 0.85);
  assert.equal(MV.tradeFactor(t, {sells: ["cloth"], kinds, member: f => f === "guild"}), 1, "the guild's own shops are not squeezed");
  assert.equal(MV.tradeFactor(t, {sells: ["food", "fuel"], kinds}), 0.45);
  assert.equal(MV.tradeFactor(find(st([town()]), "town"), {kinds}), 1, "a shop with no stock list follows the whole market");
  assert.deepEqual(MV.shopWeek(400, 1), {keep: 100, takings: 130, net: 30});
  assert.deepEqual(MV.shopWeek(400, 0.7), {keep: 100, takings: 91, net: -9});
  assert.ok(MV.shopWeek(400, 0.8).net > 0, "a heavy tax can be borne in good times");
  assert.ok(MV.shopWeek(400, 0.7).net < 0, "a crushing one cannot");
});

test("traders: four weeks the till cannot cover and the shop shuts; eight good weeks and it opens", () => {
  // A good week fills the till
  assert.deepEqual(MV.traderWeeks({}, {wage: 400, factor: 1, till: 50, weeks: 3}), {trader: {behind: 0, shut: false, shutWeeks: 0}, till: 90, shutNow: false, openNow: false});
  // but only up to six months' wages
  assert.equal(MV.traderWeeks({}, {wage: 400, factor: 1, till: 2390, weeks: 500}).till, 10);
  assert.equal(MV.traderWeeks({}, {wage: 400, factor: 1, till: 9000, weeks: 500}).till, 0, "a rich trader's savings are left alone");
  // A bad week is paid from the till while it lasts
  const paid = MV.traderWeeks({}, {wage: 400, factor: 0.7, till: 40, weeks: 2});
  assert.deepEqual([paid.till, paid.trader.behind], [-18, 0]);
  // Then the shop falls behind, a week at a time, and shuts at four
  const three = MV.traderWeeks({}, {wage: 400, factor: 0.2, till: 0, weeks: 3});
  assert.deepEqual([three.trader.behind, three.trader.shut, three.shutNow], [3, false, false]);
  const four = MV.traderWeeks(three.trader, {wage: 400, factor: 0.2, till: 0, weeks: 1});
  assert.deepEqual([four.trader.shut, four.shutNow, four.till], [true, true, 0]);
  // What is left in a thin till goes first
  const thin = MV.traderWeeks({}, {wage: 400, factor: 0.2, till: 30, weeks: 1});
  assert.deepEqual([thin.till, thin.trader.behind], [-30, 1]);
  // A good week pays off arrears before the till sees a coin
  const back = MV.traderWeeks({behind: 2}, {wage: 400, factor: 1, till: 0, weeks: 3});
  assert.deepEqual([back.trader.behind, back.till], [0, 30]);
  // Shut: no trade; it opens after eight weeks if trade is good, and not while it is bad
  const wait = MV.traderWeeks({shut: true, behind: 4}, {wage: 400, factor: 1, till: 0, weeks: 7});
  assert.deepEqual([wait.trader.shut, wait.trader.shutWeeks, wait.till], [true, 7, 0]);
  const open = MV.traderWeeks(wait.trader, {wage: 400, factor: 1, till: 0, weeks: 1});
  assert.deepEqual([open.trader.shut, open.trader.behind, open.openNow], [false, 0, true]);
  assert.equal(MV.traderWeeks({shut: true}, {wage: 400, factor: 0.7, till: 0, weeks: 30}).trader.shut, true);
  // A long span: shuts, waits, opens and trades on
  const long = MV.traderWeeks({behind: 3}, {wage: 400, factor: 1, till: 0, weeks: 1});
  assert.equal(long.trader.behind, 2);
  const cycle = MV.traderWeeks({behind: 3, shut: true, shutWeeks: 7}, {wage: 400, factor: 1, till: 0, weeks: 3});
  assert.deepEqual([cycle.trader.shut, cycle.openNow, cycle.shutNow, cycle.till], [false, true, false, 60]);
});

test("caravans: how freight moves in each age, and how long the road takes", () => {
  assert.deepEqual([1197, 1600, 1850, 1950, 2040].map(y => CR.freightFor(y, 100).id), ["pack", "wagon", "rail", "lorry", "auto"]);
  assert.equal(CR.freightFor(1850, 10).id, "wagon", "nobody loads a goods train for the next village");
  assert.equal(CR.freightFor(1999, 100, {future: true}).id, "auto");
  const load = {from: "town", to: "village", ship: ["food"], kinds: ["cloth"]};
  const days = (year, km) => CR.daysOf(CR.setOut(load, {id: "c1", now: 1000, year, km}));
  assert.deepEqual([days(1197, 100), days(1700, 100), days(1880, 100), days(1980, 100), days(1197, 10), days(1197, 2000)], [4, 4, 1, 1, 1, CR.MAX_DAYS]);
  const c = CR.setOut(load, {id: "c1", now: 1000, year: 1197, names: {from: "Town", to: "Village"}, guard: 2});
  assert.deepEqual([c.km, c.way, c.arrive, c.state, c.guard], [CR.DEFAULT_KM, "pack", 1000 + (2 * CR.DAY), "road", 2]);
  assert.equal(CR.describe(c, {kindLabel: k => k.toUpperCase()}), "A pack train from Town to Village with FOOD, CLOTH");
  assert.equal(CR.setOut({from: "a", to: "a", ship: ["food"], kinds: []}, {id: "x", now: 0}), null);
  assert.deepEqual([CR.guardFor(), CR.guardFor({senderForce: 3}), CR.guardFor({senderForce: 4, raidedLately: true})], [1, 2, 3]);
});

test("caravans: the week's cargo, one caravan a direction, goods in want first", () => {
  const loads = CR.cargoes([{from: "town", to: "village", kind: "food"}, {from: "town", to: "village", kind: "fuel"}],
    [{cheap: "town", dear: "village", kind: "cloth", gap: 0.4}, {cheap: "town", dear: "village", kind: "food", gap: 0.9}, {cheap: "town", dear: "village", kind: "drink", gap: 0.2},
      {cheap: "town", dear: "village", kind: "tools", gap: 0.6}, {cheap: "town", dear: "village", kind: "light", gap: 0.5}, {cheap: "village", dear: "town", kind: "kitchen", gap: 0.3}]);
  assert.deepEqual(loads, [{from: "town", to: "village", ship: ["food", "fuel"], kinds: ["tools", "light", "cloth"]}, {from: "village", to: "town", ship: [], kinds: ["kitchen"]}]);
  assert.deepEqual(CR.cargoes([], []), []);
});

test("caravans: the turn sends goods by road, they arrive with the caravan, and none are sent twice", () => {
  const s = st([town({supply: {food: "plenty"}, index: {cloth: 1}}), village({supply: {food: "none"}, index: {cloth: 1.8}})]);
  const r = R.weekTurn(s, {kinds, month: 5, year: 1300, defer: true});
  assert.deepEqual(r.shipments, [{from: "town", to: "village", kind: "food"}]);
  assert.equal(find(r.state, "town").supply.food, undefined, "the sender gives up its goods at once");
  assert.equal(find(r.state, "village").supply.food, "none", "the market in want waits for the caravan");
  assert.ok(r.trades.some(t => t.kind === "cloth" && t.cheap === "town" && t.dear === "village"));
  // Without defer the goods arrive at once, as before 0.49.0
  assert.equal(find(R.weekTurn(s, {kinds, month: 5, year: 1300}).state, "village").supply.food, "short");
  // Next week nothing more is sent while that caravan is out
  const again = R.weekTurn(MK.normState({markets: [town({supply: {food: "plenty"}}), village({supply: {food: "none"}})]}, kinds), {kinds, month: 5, year: 1300, defer: true, onWay: (to, k) => to === "village" && k === "food"});
  assert.deepEqual(again.shipments, []);
  assert.equal(find(again.state, "town").supply.food, "plenty");
  // Several weeks at once: the caravans have come and gone
  const many = R.runTurns(s, {dates: [{month: 5, year: 1300}, {month: 5, year: 1300}], kinds, defer: true});
  assert.deepEqual([many.shipments, many.trades], [[], []]);
  assert.notEqual(find(many.state, "village").supply.food, "none");
  const one = R.runTurns(s, {dates: [{month: 5, year: 1300}], kinds, defer: true});
  assert.equal(one.shipments.length, 1);
  // Delivery lifts the supply a step; a second load cannot lift it past plenty
  const c = CR.setOut(CR.cargoes(r.shipments, r.trades)[0], {id: "c1", now: 0, year: 1300, names: {from: "Town", to: "Village"}});
  const d = CR.deliver(r.state, c);
  assert.deepEqual(d.changes, [{id: "village", name: "Village", kind: "food", from: "none", to: "short"}]);
  assert.equal(CR.deliver(st([town(), village({supply: {food: "plenty"}})]), c).changes.length, 0);
  assert.equal(CR.deliver(st([town()]), c).changes.length, 0, "its market is gone");
});

test("caravans: on the road, in town for two days, then gone; a lost one makes its cargo dearer", () => {
  const load = {from: "town", to: "village", ship: ["food"], kinds: ["cloth"]};
  const c = CR.setOut(load, {id: "c1", now: 0, year: 1300, km: 75, names: {from: "Town", to: "Village"},
    legs: [{from: "Town", to: "Ford", minutes: 600, land: "plain"}, {from: "Ford", to: "Village", minutes: 600, land: "hills"}]});
  assert.equal(CR.daysOf(c), 3);
  let s = CR.normState({list: [c, {...c}, {id: "bad", from: "a", to: "a"}]});
  assert.equal(s.list.length, 1);
  const words = {plain: "open plain", hills: "rolling hills"};
  assert.equal(CR.whereWords(c, CR.DAY, words), "in the open plain between Town and Ford");
  assert.equal(CR.whereWords(c, 2 * CR.DAY, words), "in the rolling hills between Ford and Village");
  const bare = {...c, legs: []};
  assert.deepEqual([0.1, 0.5, 0.9].map(f => CR.whereWords(bare, f * 3 * CR.DAY)), ["not long out of Town", "about half way between Town and Village", "nearing Village"]);
  assert.deepEqual(CR.onRoadAt(s, "village").map(x => x.id), ["c1"]);
  assert.deepEqual(CR.between(s, "village", "town", CR.DAY, CR.DAY + 3600).map(x => x.id), ["c1"], "either way along the road");
  assert.deepEqual(CR.between(s, "village", "town", 4 * CR.DAY, 5 * CR.DAY), []);
  assert.deepEqual(CR.inTown(s), []);
  let t = CR.tick(s, 2 * CR.DAY);
  assert.deepEqual([t.arrived.length, t.state.list[0].state], [0, "road"]);
  t = CR.tick(s, 3 * CR.DAY);
  assert.deepEqual([t.arrived.map(x => x.id), t.state.list[0].state, CR.inTown(t.state)], [["c1"], "town", ["village"]]);
  assert.equal(CR.whereWords(t.state.list[0], 3 * CR.DAY), "in Village");
  assert.equal(CR.tick(t.state, 4 * CR.DAY).arrived.length, 0, "it arrives once");
  assert.equal(CR.tick(t.state, 5 * CR.DAY).state.list.length, 0, "two days in town and it is gone");
  // Lost on the road
  const lost = CR.markLost(s, "c1", {now: CR.DAY, by: "taken by robber knights"});
  assert.deepEqual([lost.caravan.state, lost.caravan.by], ["lost", "taken by robber knights"]);
  assert.equal(CR.markLost(lost.state, "c1", {now: CR.DAY}).caravan, null, "only once");
  assert.equal(CR.tick(lost.state, 3 * CR.DAY).arrived.length, 0, "a lost caravan never arrives");
  assert.equal(CR.tick(lost.state, 9 * CR.DAY).state.list.length, 0);
  const m = st([town(), village({index: {cloth: 2.95}})]);
  const l = CR.lose(m, c);
  assert.deepEqual(l.changes.map(x => [x.kind, x.from, x.to]), [["food", 1, 1.1], ["cloth", 2.95, 3]]);
  assert.equal(find(l.state, "village").supply.food, undefined, "nothing was delivered");
});

test("living maps: a tile can wait for a caravan in town", () => {
  const rule = {mode: "show", when: ["caravan"]};
  assert.deepEqual(L.cleanRule(rule).when, ["caravan"]);
  assert.equal(L.holds(rule, {month: 5, year: 1300, caravan: true}), true);
  assert.equal(L.holds(rule, {month: 5, year: 1300}), false);
  assert.equal(L.holds({mode: "show", when: ["caravan", "night"]}, {month: 5, year: 1300, caravan: true, isNight: false}), false);
  assert.notEqual(L.momentKey({year: 1300, month: 5, day: 1, caravans: ["s2"]}), L.momentKey({year: 1300, month: 5, day: 1, caravans: []}));
  assert.match(L.ruleWords(rule), /a caravan in town/);
});

test("market moves: the wiring", () => {
  const turn = src("modules/wodx-storyteller/scripts/market-turn.mjs"), main = src("modules/wodx-storyteller/scripts/main.mjs");
  const moves = src("modules/wodx-storyteller/scripts/market-moves.mjs"), car = src("modules/wodx-storyteller/scripts/caravans.mjs");
  const markets = src("modules/wodx-storyteller/scripts/markets.mjs");
  assert.match(turn, /shift: Moves\.shift, blocked: Moves\.blocked, defer: !suggest && Caravans\.on\(\)/);
  assert.match(turn, /Moves\.before\(st0/);
  assert.match(turn, /Moves\.after\(\{pre, weeks, live: due\.due === 1 && !due\.skipped/);
  assert.match(turn, /Caravans\.remove\(f\.caravans\)/, "the turn's Undo calls its caravans back");
  for ( const s of ["Moves.registerMoveSettings()", "Caravans.registerCaravanSettings()", "Moves.setupMoves()", "Caravans.setupCaravans()", "Moves.registerApproval()", "marketMoves: Moves.api()", "caravans: Caravans.api()"] ) assert.ok(main.includes(s), s);
  assert.match(moves, /registerApprovalHandler\?\.\(TYPE/);
  assert.match(moves, /isActiveGM\(\)/);
  assert.match(car, /chain = chain\.then\(look, look\)/, "one look at a time");
  assert.match(markets, /if \( t\.shut \) \{ fresh\.splice\(0, fresh\.length\); return; \}/, "a shut shop draws no stock");
  assert.match(src("modules/wodx-storyteller/scripts/core.mjs"), /caravans\?\.onTrip\?\./);
  assert.match(src("modules/wodx-interactables/scripts/living.mjs"), /caravans\?\.inTownScenes\?\./);
  // Factions are read, never written, from the market code
  assert.doesNotMatch(moves + car + turn, /factions\?\.(mutate|save|applyNow)/);
});
