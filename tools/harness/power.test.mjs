import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Places of power: Nodes and Tass, chantries, freeholds and balefires (Storyteller, B3450-B3456) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const P = await imp("modules/wodx-storyteller/scripts/power-rules.mjs");
const U = await imp("modules/wodx-storyteller/scripts/upkeep-rules.mjs");
const W = P.WEEK, D = P.DAY;

test("a Node's weekly output follows the year and splits half free, half Tass (M20 p. 320)", () => {
  assert.equal(P.nodeRateFor(1200).perDot, 4);
  assert.equal(P.nodeRateFor(1600).perDot, 3);
  assert.equal(P.nodeRateFor(1890).perDot, 2);
  assert.equal(P.nodeRateFor(2022).perDot, 2);
  assert.equal(P.nodeRateFor(2040).perDot, 1);
  assert.deepEqual(P.nodeWeekly({rating: 3}, 1890), {total: 6, quint: 3, tass: 3});
  assert.deepEqual(P.nodeWeekly({rating: 1, rate: 3}, 1890), {total: 3, quint: 2, tass: 1}, "the Storyteller's own rate wins; the odd point is free");
  assert.equal(P.caernOf(1), 1); assert.equal(P.caernOf(4), 2); assert.equal(P.caernOf(10), 5);
});

test("a Node fills week by week up to its cap, and a drained one has to fill again", () => {
  let r = P.accrueNode({rating: 2}, 0, 1900);
  assert.equal(r.node.last, 0); assert.equal(r.weeks, 0);
  r = P.accrueNode(r.node, 3 * W + 2 * D, 1900);
  assert.equal(r.weeks, 3);
  assert.deepEqual(r.node.store, {quint: 6, tass: 6});
  assert.equal(r.node.last, 3 * W, "part weeks carry over");
  r = P.accrueNode(r.node, 50 * W, 1900);
  assert.deepEqual(r.node.store, P.nodeCap({rating: 2}, 1900));
  assert.ok(r.full);
  const m = P.meditate(r.node, {avatar: 3, prime: 0, quint: 0, turns: 1});
  assert.ok(m.ok); assert.equal(m.take, 3, "no more than the Avatar a turn without Prime 1");
  const m2 = P.meditate(r.node, {avatar: 5, prime: 1, quint: 4, turns: 1});
  assert.equal(m2.take, 1, "the Avatar caps what is held");
  assert.equal(P.meditate(r.node, {avatar: 0}).ok, false);
  assert.equal(P.meditate({rating: 2, store: {quint: 0, tass: 0}}, {avatar: 3}).ok, false);
  assert.equal(P.meditate(r.node, {avatar: 5, quint: 0, paradox: 18, turns: 3}).take, 2, "Paradox on the wheel leaves less room");
  const g = P.gatherTass(r.node, 5);
  assert.equal(g.take, 5); assert.equal(g.node.store.tass, r.node.store.tass - 5);
  assert.equal(P.absorbTass({prime: 2, avatar: 5, points: 3}).ok, false, "Tass needs Prime 3");
  assert.equal(P.absorbTass({prime: 3, avatar: 5, quint: 3, points: 9}).take, 2);
});

test("chantry pools, tiers, era names and members leaving (M20 p. 309)", () => {
  assert.equal(P.chantryTier(5).label, "Too few points for a stronghold of its own");
  assert.equal(P.chantryTier(15).label, "Secure squat");
  assert.equal(P.chantryTier(30).label, "Small sanctuary");
  assert.equal(P.chantryTier(31).label, "Mystic chantry");
  assert.equal(P.chantryTier(150).label, "Power center");
  assert.equal(P.chantryName(1300), "Covenant");
  assert.equal(P.chantryName(1500), "Chantry");
  assert.equal(P.chantryName(1700, "tech"), "Order of Reason house");
  assert.equal(P.chantryName(1950, "tech"), "Construct");
  const c = {members: [{actor: "a", name: "A", points: 15}, {actor: "b", name: "B", points: 10}]};
  assert.equal(P.chantryPool(c), 25);
  const r = P.memberLeaves(c, "b");
  assert.equal(r.lost, 10); assert.equal(P.chantryPool(r.chantry), 15); assert.ok(r.dropped);
  assert.equal(P.chantryPool(P.fracture(c)), 0);
});

test("dreaming by the balefire, Glades, Reaving and the oath (C20 pp. 312-313)", () => {
  const f = {base: 3, rating: 3, form: "hearth"};
  let h = P.harvest(f, [{id: "a", glamour: 2, perm: 6}]);
  assert.deepEqual(h.gains, [{id: "a", gain: 3, capped: false}]);
  h = P.harvest(f, [{id: "a", glamour: 5, perm: 6}]);
  assert.equal(h.gains[0].gain, 1, "no more than the Glamour rating holds");
  h = P.harvest(f, [{id: "a", glamour: 0, perm: 5}, {id: "b", glamour: 0, perm: 5}, {id: "c", glamour: 0, perm: 5}, {id: "d", glamour: 0, perm: 5}]);
  assert.ok(h.gains.every(g => g.gain === 1), "an oathcircle splits it, at least 1 each");
  h = P.harvest({...f, form: "glade"}, [{id: "a", glamour: 0, perm: 5}, {id: "b", glamour: 0, perm: 5}]);
  assert.equal(h.gains.length, 1, "a Glade gives only to the first sleeper");
  assert.equal(P.harvest({...f, rating: 0}, [{id: "a"}]).ok, false);
  const r = P.reave(f, 8);
  assert.equal(r.glamour, 8); assert.equal(r.lose, 2); assert.equal(r.freehold.rating, 1);
  assert.equal(P.reave(f, 3).lose, 0);
  assert.equal(P.oathCost(f), 3);
  assert.deepEqual(P.destroyFreehold(f, {keeperIsCreator: true}), {freehold: {...P.normFreehold(f), rating: 0, destroyed: true}, banality: 3, glamourBack: 3});
  assert.deepEqual(P.freeholdRights(f), {defend: 3, soak: 1, mandate: 3, cantrip: -1});
});

test("lost ranks come back by the month, or the season when harvested daily; untended freeholds fade", () => {
  const t0 = 1000 * D;
  let f = P.normFreehold({base: 4, rating: 2, lastRegen: t0, lastTended: t0, lastFade: t0, banality: 3});
  let r = P.freeholdTime(f, t0 + 65 * D, {year: 1990});
  assert.equal(r.regained, 2); assert.equal(r.freehold.rating, 4);
  let busy = f;
  for ( let i = 0; i < 25; i++ ) busy = P.noteHarvest(busy, t0 + i * D);
  assert.ok(P.harvestedDaily(busy, t0 + 25 * D));
  r = P.freeholdTime(busy, t0 + 26 * D, {year: 1990});
  assert.equal(r.regained, 0, "a balefire used every night heals only by the season");
  // Untended in a dull place
  const dull = P.normFreehold({base: 3, rating: 3, lastTended: t0, lastFade: t0, lastRegen: t0, banality: 8});
  r = P.freeholdTime(dull, t0 + 20 * D, {year: 1990});
  assert.equal(r.faded, 0, "not yet untended");
  r = P.freeholdTime(dull, t0 + (30 + 92) * D, {year: 1990});
  assert.equal(r.faded, 1); assert.equal(r.freehold.rating, 2); assert.equal(r.freehold.base, 2);
  assert.equal(P.freeholdTime({...dull, banality: 4}, t0 + 400 * D, {year: 1990}).faded, 0, "a lively place keeps it");
  assert.equal(P.freeholdTime({...dull, banality: 8}, t0 + 400 * D, {year: 1100}).faded, 0, "before the Shattering the bar is higher");
  assert.ok(P.freeholdTime(dull, t0 + 400 * D, {year: 1990, banality: 6}).faded === 0, "the scene's Banality, with drift, can override");
});

test("the clock tick reports a Node filling up and a balefire coming back, once", () => {
  let st = P.normState({list: [{id: "n1", kind: "node", name: "The Well", rating: 1}, {id: "f1", kind: "freehold", name: "The Inn", base: 2, rating: 1, banality: 2}]});
  let r = P.tick(st, 0, {year: 1900});
  assert.equal(r.lines.length, 0);
  r = P.tick(r.state, 40 * D, {year: 1900});
  assert.ok(r.lines.some(l => /The Inn.*regains/.test(l)));
  assert.ok(r.lines.some(l => /The Well is full: 4 Quintessence and 4 Tass/.test(l)), "four weeks of output and it is full");
  r = P.tick(r.state, 30 * W, {year: 1900});
  assert.ok(!r.lines.some(l => /The Well is full/.test(l)), "full is said once");
  assert.match(P.describe(r.state.list[0], {year: 1900}), /Node 1 \(caern level 1\)/);
  assert.match(P.describe({kind: "chantry", name: "House", members: [{actor: "a", points: 40}]}, {year: 1900}), /Chantry, mystic chantry \(40 pool points/);
  assert.match(P.describe({kind: "freehold", name: "Inn", base: 3, rating: 2}, {year: 1500}), /Hearth 2 of 3; the Interregnum/);
});

test("Node, Chantry and Holdings backgrounds are ties that need tending", () => {
  assert.equal(U.tieKindOfBackground("Node"), "node");
  assert.equal(U.tieKindOfBackground("Chantry"), "chantry");
  assert.equal(U.tieKindOfBackground("Construct"), "chantry");
  assert.equal(U.tieKindOfBackground("Holdings"), "freehold");
  for ( const k of ["node", "chantry", "freehold"] ) assert.ok(U.TIE_KINDS[k].lapse);
  const d = U.deriveTies({items: [{id: "x", type: "background", name: "Holdings", value: 2}]}, 0);
  assert.equal(d.ties[0].kind, "freehold");
});

test("the wiring: settings, clock, upkeep chooser, api; plain words players may read", () => {
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const re of [/Power\.registerPowerSettings\(\)/, /Power\.setupPower\(\)/, /power: Power\.api\(\)/] ) assert.match(main, re);
  const up = src("modules/wodx-storyteller/scripts/upkeep.mjs");
  assert.match(up, /action: "power", label: "Places of power"/);
  const p = src("modules/wodx-storyteller/scripts/power.mjs");
  assert.match(p, /Hooks\.on\("updateWorldTime"/);
  assert.match(p, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(p, /searchBox\(/);
  assert.match(p, /system\.quintessence\.temporary/);
  assert.match(p, /system\.advantages\.glamour\.temporary/);
  const shown = (p + src("modules/wodx-storyteller/scripts/power-rules.mjs")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(shown, /B3[24]\d\d|house rule/i);
  assert.doesNotMatch(shown, /—/);
  assert.doesNotMatch(shown, /\b(he|she|him|her|his|hers)\b/);
});
