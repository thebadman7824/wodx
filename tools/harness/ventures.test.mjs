import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Putting money into a venture (Storyteller 0.60.0, B2740-B2743) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const VR = await imp("modules/wodx-storyteller/scripts/venture-rules.mjs");
const M = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const never = () => 0.99, always = () => 0;
const open = (over = {}) => VR.openVenture({id: "v1", actor: "a1", name: "Ilse", market: "brno", kind: "house", goods: "", amount: 10000, now: 0, year: 1250, ...over});

test("every way of life and every age has words for a venture", () => {
  const spheres = Object.keys(WR.SPHERES);
  for ( const s of spheres ) for ( const y of [1197, 1300, 1500, 1650, 1820, 1900, 1990, 2020] ) {
    const f = VR.formFor(y, s);
    for ( const k of ["stake", "caravan", "workshop", "house", "seat"] ) assert.ok(f[k] && typeof f[k] === "string", `${s} ${y} ${k}`);
    assert.ok(VR.AGES.includes(f.age));
  }
  assert.equal(VR.formFor(2050, "latin", {future: true}).age, "future");
  assert.match(VR.formFor(1250, "latin").stake, /commenda/);
  assert.match(VR.formFor(1250, "islamic").stake, /qirad/);
  assert.match(VR.formFor(1620, "latin").stake, /joint-stock/);
  assert.match(VR.formFor(1880, "latin").stake, /exchange/);
  assert.match(VR.formFor(2050, "latin", {future: true}).stake, /shell company|crypto/);
  // Before mid-century the older ways hold outside Western Christendom; Japan's family firms after 1868
  assert.match(VR.formFor(1820, "indic").stake, /hundi/);
  assert.match(VR.formFor(1880, "japanese").seat, /family firm/);
  // Every world region reaches a sphere with words
  for ( const id of Object.keys(WR.WORLD_REGIONS) ) assert.ok(VR.formFor(1400, WR.sphereFor(id, 1400)).stake, id);
});

test("Resources sets the most at once and, with Influence, how many ventures", () => {
  const w = M.wageAt(1250);
  assert.equal(VR.mostAtOnce(0, 1250), w);
  assert.equal(VR.mostAtOnce(3, 1250), 12 * M.allowance(3, 1250));
  assert.equal(VR.mostVentures(0, 0), 1);
  assert.equal(VR.mostVentures(3, 2), 5);
  assert.equal(VR.canPut({amount: 0, have: 100}).ok, false);
  assert.equal(VR.canPut({amount: 200, have: 100, resources: 5, year: 1250}).ok, false);
  assert.equal(VR.canPut({amount: VR.mostAtOnce(1, 1250) + 1, have: 1e9, resources: 1, year: 1250}).ok, false);
  assert.equal(VR.canPut({amount: 10, have: 1e9, resources: 1, influence: 0, held: 1, year: 1250}).ok, false);
  assert.equal(VR.canPut({amount: 10, have: 1e9, resources: 1, influence: 1, held: 1, year: 1250}).ok, true);
  assert.equal(VR.shield(0), 1);
  assert.equal(VR.shield(3), 0.7);
  assert.equal(VR.shield(9, true), 0.5);
});

test("a week pays a share that follows trade, the age and taxes", () => {
  const v = open();
  const plain = VR.week(v, {year: 1250, rand: never});
  assert.equal(plain.payout, Math.round(10000 * VR.BASE.house * VR.AGE_RETURN.medieval));
  assert.equal(plain.venture.weeks, 1);
  assert.equal(plain.venture.paid, plain.payout);
  const modern = VR.week(v, {year: 1990, rand: never});
  assert.ok(modern.payout < plain.payout, "later ages pay less");
  const g = {...open(), goods: "food"};
  const glut = VR.week(g, {year: 1250, rand: never, trade: VR.tradeOf(g, {supply: "plenty"})});
  assert.ok(glut.payout < plain.payout && /glut/.test(glut.line));
  const dear = VR.week(g, {year: 1250, rand: never, trade: VR.tradeOf(g, {supply: "short", index: 1.6})});
  assert.ok(dear.payout > plain.payout);
  const taxed = VR.tradeOf(g, {tax: 0.2, monopoly: true});
  assert.equal(taxed.factor, Math.round(0.8 * 0.85 * 100) / 100);
  assert.deepEqual(VR.tradeOf({...g, kind: "caravan"}, {closed: true}), {factor: 0, why: ["the roads are closed"]});
  assert.equal(VR.tradeOf({...g, kind: "house"}, {shut: true}).factor, 0);
  assert.equal(VR.week({...v, state: "closed"}, {rand: always}).payout, 0);
});

test("a bad week costs value, softened by Influence; caravans lose by the real caravans", () => {
  const v = open();
  const bad = VR.week(v, {year: 1250, rand: always, influence: 0});
  assert.equal(bad.lost, Math.round(10000 * VR.BAD_SHARE.house));
  assert.equal(bad.payout, 0);
  assert.match(bad.line, /debtor/i);
  const softened = VR.week(v, {year: 1250, rand: always, influence: 3});
  assert.ok(softened.lost < bad.lost);
  const c = open({kind: "caravan"});
  assert.equal(VR.week(c, {year: 1250, rand: always, caravansOn: true}).lost, 0);
  assert.ok(VR.week(c, {year: 1250, rand: always, caravansOn: false}).lost > 0);
  // Worn down to almost nothing, the venture is gone
  let w = open({amount: 100});
  for ( let i = 0; i < 30 && w.state === "open"; i++ ) w = VR.week(w, {year: 1250, rand: always}).venture;
  assert.equal(w.state, "lost");
});

test("lost caravans, raids and broke traders hit the ventures they touch", () => {
  const st = VR.normState({list: [open({id: "c", kind: "caravan", market: "brno"}), open({id: "h", kind: "house", market: "brno", trader: "t1"}),
    open({id: "w", kind: "workshop", market: "brno"}), open({id: "x", kind: "house", market: "olomouc", trader: "t1"})]});
  assert.deepEqual(VR.touched(st, "caravanLost", {from: "olomouc", to: "brno"}).map(v => v.id), ["c"]);
  assert.deepEqual(VR.touched(st, "raid", {market: "brno"}).map(v => v.id), ["h", "w"]);
  assert.deepEqual(VR.touched(st, "traderBroke", {market: "brno", trader: "t1"}).map(v => v.id), ["h"]);
  assert.deepEqual(VR.touched(st, "traderBroke", {market: "brno", trader: "t2"}).map(v => v.id), []);
  const h = VR.hit(st.list[1], "traderBroke", {influence: 0});
  assert.equal(h.lost, 6000);
  assert.equal(h.venture.value, 4000);
  assert.ok(VR.hit(st.list[1], "traderBroke", {influence: 5}).lost < 6000);
  assert.equal(VR.hit({...st.list[1], state: "closed"}, "raid").lost, 0);
});

test("taking money out costs the age's cut; all closes the venture", () => {
  const v = open();
  const r = VR.takeOut(v, 2000, {year: 1250});
  assert.equal(r.back, 2000 - Math.round(2000 * VR.EXIT_CUT.medieval));
  assert.equal(r.venture.value, 8000);
  assert.equal(r.venture.state, "open");
  const all = VR.takeOut(v, 0, {year: 1990, all: true});
  assert.equal(all.venture.state, "closed");
  assert.equal(all.back, 10000 - Math.round(10000 * VR.EXIT_CUT.modern));
  const more = VR.addTo(v, 500);
  assert.equal(more.put, 10500);
  assert.equal(more.value, 10500);
});

test("a large stake draws a rival's notice and, with Influence and time, a seat", () => {
  const big = 70 * M.wageAt(1250);
  const v = {...open({amount: big}), weeks: VR.SEAT_WEEKS};
  assert.ok(VR.isLarge(v, 1250));
  assert.ok(!VR.isLarge(open({amount: 10}), 1250));
  const views = [{id: "f1", name: "The Guild", idle: false, home: ["brno"], trade: 3, members: []},
    {id: "f2", name: "Own house", idle: false, home: ["brno"], trade: 4, members: ["a1"]},
    {id: "f3", name: "Asleep", idle: true, home: ["brno"], trade: 5, members: []}];
  const n = VR.notice(v, {views, year: 1250, influence: 1});
  assert.equal(n.rival, "The Guild");
  assert.equal(n.seat, true);
  assert.equal(VR.notice({...v, rival: "The Guild"}, {views, year: 1250, influence: 0}).rival, null);
  assert.equal(VR.notice(v, {views, year: 1250, influence: 0}).seat, false);
  assert.equal(VR.notice({...v, weeks: 2}, {views, year: 1250, influence: 2}).seat, false);
  assert.equal(VR.notice(open({amount: 10}), {views, year: 1250, influence: 3}).rival, null);
});

test("state is cleaned and capped, closed ventures go first", () => {
  const list = Array.from({length: VR.LIST_CAP + 10}, (_, i) => open({id: `v${i}`, actor: `a${i}`}));
  for ( let i = 0; i < 15; i++ ) list[i].state = "closed";
  const st = VR.normState({list: [...list, {id: "v3", actor: "dup"}, {id: "", actor: "x"}, {id: "y"}]});
  assert.equal(st.list.length, VR.LIST_CAP);
  assert.equal(st.list.filter(v => v.state === "closed").length, 5);
  assert.equal(VR.normVenture({kind: "bogus", state: "bogus", seat: "x"}).kind, "house");
  assert.equal(VR.normVenture({log: Array(40).fill({t: 1, text: "x"})}).log.length, VR.LOG_CAP);
});

test("the venture wiring: market turn, settings, socket, windows", () => {
  const turn = src("modules/wodx-storyteller/scripts/market-turn.mjs");
  assert.match(turn, /Ventures\.weekRun\(\{weeks, stamp\}\)/);
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const re of [/Ventures\.registerVentureSettings\(\)/, /Ventures\.registerApproval\(\)/, /Ventures\.setupVentures\(\)/, /ventures: Ventures\.api\(\)/, /req\.venture/] ) assert.match(main, re);
  const v = src("modules/wodx-storyteller/scripts/ventures.mjs");
  for ( const h of ["wodxCaravan", "wodxMarketMove", "wodxTraderBroke"] ) assert.match(v, new RegExp(`Hooks\\.on\\("${h}"`));
  assert.match(v, /testUserPermission\?\.\(user, "OWNER"\)/, "a player acts only for their own character");
  assert.match(v, /searchBox\(/);
  assert.match(src("modules/wodx-storyteller/scripts/markets.mjs"), /action: "ventures"/);
  assert.match(src("modules/wodx-storyteller/scripts/owners.mjs"), /action: "ventures"/);
  // No meta words or decision numbers in what players read
  const shown = v.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(shown, /B2[67]\d\d|house rule/);
});
