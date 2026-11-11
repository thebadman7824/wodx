import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Interactables 0.26.0: chases and pursuit (chase-rules.mjs), and the runtime file loading without Foundry. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = await import(join(root, "modules/wodx-interactables/scripts/chase-rules.mjs"));

const S = n => ({successes: n, botch: false});
const B = {successes: 0, botch: true};
const chase = (o = {}) => C.newChase({quarry: {id: "q", name: "Quarry", way: "foot", run: 26, lead: 4, ...(o.q ?? {})},
  pursuers: (o.ps ?? [{}]).map((p, i) => ({id: `p${i}`, name: `Hunter ${i}`, way: "foot", run: 26, ...p})), ground: o.ground ?? "streets", year: o.year ?? 1197, night: !!o.night});

test("ways follow the year: no cars in 1197, bicycles from 1885, cars from 1900, carriages gone after 1945", () => {
  const ids = y => C.waysIn(y).map(w => w.id);
  assert.deepEqual(ids(1197).sort(), ["boat", "cart", "carriage", "foot", "horse", "mule"].sort());
  assert.ok(ids(1890).includes("bicycle") && !ids(1890).includes("car"));
  assert.ok(ids(1905).includes("car") && !ids(1905).includes("motorbike"));
  assert.ok(ids(2050).includes("car") && !ids(2050).includes("carriage") && !ids(2050).includes("cart"));
  assert.equal(C.wayFromMount("car", 1197), "foot");
  assert.equal(C.wayFromMount("horse", 1197), "horse");
  assert.equal(C.wayFromMount(null, 1999), "foot");
});

test("speeds: running from the sheet, cars faster by era, the ground holds hooves and wheels down", () => {
  assert.equal(C.speedOf({way: "foot", run: 26}, "open", 1999).yards, 26);
  assert.ok(C.speedOf({way: "car"}, "road", 1910).yards < C.speedOf({way: "car"}, "road", 1970).yards);
  assert.ok(C.speedOf({way: "car"}, "road", 2045).yards > C.speedOf({way: "car"}, "road", 1995).yards);
  assert.deepEqual(C.speedOf({way: "car"}, "streets", 1970), {yards: 40, capped: true});
  assert.deepEqual(C.speedOf({way: "horse"}, "crowd", 1300), {yards: 10, capped: true});
  assert.equal(C.speedOf({way: "motorbike"}, "rough", 1970).yards, 15);
  assert.equal(C.speedOf({way: "horse", flatOut: true}, "open", 1300).yards, 75);
  assert.equal(C.canGo("car", "indoors"), false);
  assert.equal(C.canGo("foot", "indoors"), true);
  assert.equal(C.canGo("carriage", "rough"), false);
  assert.equal(C.canGo("boat", "water"), true);
  assert.equal(C.canGo("foot", "water"), false);
});

test("the head start and the speed edge", () => {
  assert.equal(C.headStart(9, "foot"), 4);
  assert.equal(C.headStart(25, "horse"), 2);
  assert.deepEqual(C.edge(26, 26), {to: null, n: 0});
  assert.deepEqual(C.edge(50, 26), {to: "a", n: 2});
  assert.deepEqual(C.edge(26, 130), {to: "b", n: 3});
});

test("the roll: Dexterity + Athletics on foot, Ride mounted, Drive in a car; ground, flat out and unlit nights add difficulty", () => {
  assert.deepEqual(C.rollFor({way: "foot"}, "streets"), {attr: "dexterity", ability: "athletics", diff: 6, parts: []});
  assert.equal(C.rollFor({way: "horse"}, "open").ability, "ride");
  assert.equal(C.rollFor({way: "car"}, "crowd", {year: 1970}).diff, 8);
  assert.equal(C.rollFor({way: "foot"}, "crowd").diff, 7);
  assert.equal(C.rollFor({way: "foot", flatOut: true}, "open").diff, 9);
  assert.equal(C.rollFor({way: "horse"}, "open", {night: true, year: 1300}).diff, 7);
  assert.equal(C.rollFor({way: "horse"}, "open", {night: true, year: 1950}).diff, 6);
  assert.equal(C.rollFor({way: "foot"}, "open", {night: true, year: 1300}).diff, 6);
  assert.equal(C.rollFor({way: "boat"}, "water").attr, "stamina");
  assert.equal(C.rollFor({way: "car", flatOut: true}, "rough", {night: true, year: 1300}).diff, 10);
});

test("a turn: totals grow, a pursuer whose total passes the quarry's catches up", () => {
  let st = chase();
  assert.equal(st.quarry.total, 2);
  let r = C.playTurn(st, {q: S(1), p0: S(2)});
  assert.equal(r.state.status, "running");
  assert.equal(r.state.quarry.total, 3);
  assert.equal(r.state.pursuers[0].total, 2);
  r = C.playTurn(r.state, {q: S(0), p0: S(2)});
  assert.equal(r.state.status, "caught");
  assert.deepEqual(r.state.caughtBy, ["p0"]);
  assert.ok(r.events.some(e => e.kind === "caught"));
  // The old state is left alone, so an Undo can put it back
  assert.equal(st.turn, 0);
  assert.equal(C.playTurn(r.state, {q: S(9)}).state.turn, r.state.turn);
});

test("a lead of ten and the quarry is away; a faster quarry pulls away by itself", () => {
  let st = chase({q: {lead: 0}});
  let r = C.playTurn(st, {q: S(10), p0: S(0)});
  assert.equal(r.state.status, "away");
  st = chase({q: {way: "horse", lead: 0}, year: 1300, ground: "open"});
  r = C.playTurn(st, {q: S(0), p0: S(0)});
  assert.equal(r.state.quarry.total, 2);
  assert.ok(r.events.some(e => e.kind === "edge" && e.who === "q"));
});

test("a car runs a runner down on the road, but cannot follow indoors", () => {
  const st = chase({ps: [{way: "car"}], year: 1975, ground: "road", q: {lead: 0}});
  let r = C.playTurn(st, {q: S(2), p0: S(0)});
  assert.equal(r.state.pursuers[0].total, 3);
  assert.equal(r.state.status, "caught");
  r = C.playTurn({...st, ground: "indoors"}, {q: S(1), p0: S(5)});
  assert.equal(r.state.pursuers[0].out, "stuck");
  assert.equal(r.state.status, "away");
});

test("the quarry's edge counts once, against the fastest pursuer", () => {
  const st = chase({q: {way: "horse", lead: 0}, ps: [{way: "foot"}, {way: "horse"}], year: 1300, ground: "open"});
  const r = C.playTurn(st, {q: S(1), p0: S(1), p1: S(1)});
  assert.equal(r.state.quarry.total, 1);
});

test("botches: a stumble on foot loses the ground made; thrown from a horse; a car crashes", () => {
  let r = C.playTurn(chase(), {q: B, p0: S(1)});
  assert.equal(r.state.quarry.total, 0);
  assert.equal(r.state.status, "caught");
  r = C.playTurn(chase({ps: [{way: "horse"}], year: 1300, ground: "open"}), {q: S(1), p0: B});
  const e = r.events.find(x => x.kind === "thrown");
  assert.ok(e && e.dice >= 1);
  assert.equal(r.state.pursuers[0].out, "botch");
  r = C.playTurn(chase({ps: [{way: "car"}], year: 1975, ground: "road"}), {q: S(1), p0: B});
  const c = r.events.find(x => x.kind === "crash");
  assert.equal(c.dice, C.crashDice(90));
  assert.equal(C.crashDice(300), 10);
  assert.equal(C.thrownDice(5), 1);
});

test("breaking sight needs a lead of three and cover; a pursuer must score more to keep sight", () => {
  let st = chase({q: {lead: 8}, ps: [{}, {}]});
  st.quarry.hide = true;
  let r = C.playTurn(st, {q: {...S(0), stealth: S(2)}, p0: {...S(0), sight: S(3)}, p1: {...S(0), sight: S(2)}});
  assert.equal(r.state.pursuers[0].out, null);
  assert.equal(r.state.pursuers[1].out, "lost");
  assert.equal(r.state.status, "running");
  r = C.playTurn(st, {q: {...S(0), stealth: S(3)}, p0: {...S(0), sight: S(1)}, p1: {...S(0), sight: S(0)}});
  assert.equal(r.state.status, "away");
  assert.ok(r.events.some(e => e.kind === "hidden"));
  // No cover on open fields
  const open = {...st, ground: "open"};
  r = C.playTurn(open, {q: {...S(0), stealth: S(5)}, p0: {...S(0), sight: S(0)}, p1: {...S(0), sight: S(0)}});
  assert.equal(r.state.status, "running");
  // Not enough lead
  const near = chase({q: {lead: 2}});
  near.quarry.hide = true;
  r = C.playTurn(near, {q: {...S(0), stealth: S(5)}, p0: {...S(0), sight: S(0)}});
  assert.equal(r.state.pursuers[0].out, null);
});

test("standing words carry no numbers", () => {
  const st = chase({q: {lead: 12}});
  assert.equal(C.standing(st, st.pursuers[0]), "is far behind");
  st.quarry.total = 1;
  assert.equal(C.standing(st, st.pursuers[0]), "is close behind");
  assert.equal(C.yardsBehind(st, st.pursuers[0]), 2);
});

test("every way and every ground has a label, and every way can go somewhere", () => {
  for ( const [id, W] of Object.entries(C.WAYS) ) {
    assert.ok(W.label && W.pool?.length === 2, id);
    assert.ok(Object.keys(C.GROUNDS).some(g => C.canGo(id, g)), id);
  }
  for ( const g of Object.values(C.GROUNDS) ) assert.ok(g.label);
  assert.equal(C.groundKind("nowhere"), "streets");
});

test("the chase runtime and Interactables' main file load without Foundry", async () => {
  const m = await import(join(root, "modules/wodx-interactables/scripts/chase.mjs"));
  assert.equal(typeof m.setupChase, "function");
  assert.deepEqual(m.abilityOf({system: {abilities: {animalken: {value: 2, type: "skill"}}}}, "ride"), {dots: 2, type: "skill"});
  assert.deepEqual(m.abilityOf({system: {abilities: {athletics: {value: 3, type: "talent"}}}}, "athletics"), {dots: 3, type: "talent"});
  assert.deepEqual(m.abilityOf({}, "drive"), {dots: 0, type: "skill"});
});
