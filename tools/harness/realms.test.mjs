// WoDX Otherworlds 0.4.0: the Near Dreaming, trods, the moon's roads, the Avatar Storm and Great Maelstroms by date,
// Disembodiment, the Net and layer sound (pure rules).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as RR from "../../modules/wodx-otherworlds/scripts/realms-rules.mjs";
import * as J from "../../modules/wodx-otherworlds/scripts/journey-rules.mjs";
import {JOURNEY_TABLES} from "../../modules/wodx-otherworlds/data/journey-tables.mjs";
import * as G from "../../modules/wodx-chronicle/scripts/gen-core.mjs";

const seq = list => { let i = 0; return () => list[i++ % list.length]; };

test("the Mists: Banality 10 bars the way; no Glamour needs enchanting; the steps go down with the score", () => {
  assert.equal(RR.mists({glamour: 3, banality: 10}).canEnter, false);
  assert.equal(RR.mists({glamour: 0, banality: 7}).canEnter, false);
  assert.equal(RR.mists({glamour: 0, banality: 7, enchanted: true}).canEnter, true);
  const a = RR.mists({glamour: 8, banality: 2, fae: true}), b = RR.mists({glamour: 0, banality: 7, enchanted: true});
  assert.equal(a.step, 0); assert.equal(b.step, 4);
  assert.ok(RR.mists({glamour: 4, banality: 3, fae: true}).step < RR.mists({glamour: 2, banality: 4, fae: true}).step);
});

test("trods: time runs true most of the time, and slips by a day or more now and then", () => {
  assert.deepEqual(RR.trodTime(4, seq([0.1])), {hours: 4, slip: "none", days: 0});
  assert.equal(RR.trodTime(4, seq([0.7, 0])).slip, "fast");
  const lost = RR.trodTime(4, seq([0.95, 0.5]));
  assert.equal(lost.slip, "lost"); assert.equal(lost.days, 4); assert.equal(lost.hours, 100);
  assert.deepEqual(RR.wayfarePortal({successes: 5}), {open: true, chosen: true, danger: false});
  assert.equal(RR.wayfarePortal({successes: 0}).open, false);
  assert.equal(RR.wayfarePortal({botch: true}).danger, true);
});

test("the moon's roads: safest at the full moon; caern reach; the Rite of the Opened Bridge", () => {
  assert.equal(RR.moonRisk(4), 0.5); assert.equal(RR.moonRisk(0), 1.5); assert.equal(RR.moonRisk(2), 1); assert.equal(RR.moonRisk(6), 1);
  assert.equal(RR.bridgeReach(5), 10000); assert.equal(RR.bridgeReach(2), 2000);
  const p = RR.openedBridge({wits: 3, enigmas: 2, caern: 4, target: 3, totemMatch: true, failedBefore: true});
  assert.deepEqual(p, {pool: 8, diff: 5, need: 3});
  assert.equal(RR.openedBridgeResult(p, [5, 6, 7, 1]).open, false);
  assert.equal(RR.openedBridgeResult(p, [5, 6, 7, 2]).open, true);
});

test("the Avatar Storm: by the date, on, fading or never; who it hurts; Shredding Winds", () => {
  assert.deepEqual(RR.stormState("auto", false), {on: false, fading: false});
  assert.deepEqual(RR.stormState("auto", true), {on: true, fading: false});
  assert.deepEqual(RR.stormState("fading", false), {on: true, fading: true});
  assert.equal(RR.stormState("off", true).on, false);
  assert.equal(RR.stormHurts({type: "Mage"}), true);
  assert.equal(RR.stormHurts({type: "Werewolf"}), false);
  assert.equal(RR.stormHurts({type: "Mage", astral: true}), false);
  const s = RR.shredding({paradox: 2, arete: 3}, [6, 7, 1, 2, 9]);
  assert.equal(s.pool, 5); assert.equal(s.levels, 2); assert.equal(s.damage, "aggravated");
  assert.equal(RR.shredding({paradox: 2, arete: 3, shield: true}).pool, 2);
  assert.match(RR.shredding({paradox: 1, arete: 1, fading: true}).damage, /lethal or bashing/);
  assert.equal(RR.acrossGauntlet(3, [6, 6, 2]).lost, 2);
});

test("Great Maelstroms follow the chronicle's events; bells and Haunts", () => {
  assert.equal(RR.greatMaelstrom(1349), "the Second Great Maelstrom");
  assert.equal(RR.greatMaelstrom(1999, []), null, "the Sixth does not rage unless its event fired");
  assert.equal(RR.greatMaelstrom(1999, ["sixth-great-maelstrom"]), "the Sixth Great Maelstrom");
  assert.equal(RR.greatMaelstrom(1917, ["fourth-great-maelstrom"]), "the Fourth Great Maelstrom");
  assert.equal(J.greatMaelstrom(1945, ["fifth-great-maelstrom"]), "the Fifth Great Maelstrom");
  assert.deepEqual(RR.maelstromDice(4), {dice: 12, sheltered: false, breaksAfterHours: 0});
  assert.equal(RR.maelstromDice(3, {haunt: 3}).sheltered, true);
  assert.equal(RR.maelstromDice(5, {haunt: 2}).breaksAfterHours, 2);
});

test("Disembodiment after three phases of the moon", () => {
  assert.equal(RR.disembodiment(null).known, false);
  assert.equal(RR.disembodiment(80 * 86400).due, false);
  assert.equal(RR.disembodiment(89 * 86400).due, true);
});

test("the Net: open from 1990; systems; combat and soak", () => {
  assert.equal(RR.netOpen(1989), false); assert.equal(RR.netOpen(2020), true);
  assert.deepEqual(RR.netSystem(4), {intelligence: 6, computer: 5});
  assert.deepEqual(RR.netPool({intelligence: 3, computer: 4, program: 2}), {pool: 7, diff: 6, auto: 2});
  const x = RR.netExchange({program: 1}, {program: 0}, [6, 7, 2], [6, 1], {witsB: 2, protectB: 3});
  assert.deepEqual(x, {winner: "a", a: 3, b: 0, damageDice: 3, soakPool: 5});
  assert.equal(RR.netExchange({}, {}, [6], [6]).winner, null);
  assert.deepEqual(RR.programTest({computer: 3, program: 2}, {intelligence: 6, program: 1}), {userPool: 5, systemPool: 7, diff: 6});
});

test("layer sound: one loop for each other world, none for the physical", () => {
  assert.equal(RR.layerSoundFor({layer: "penumbra"}), "wodx-kits/layers/penumbra.ogg");
  assert.equal(RR.layerSoundFor({layer: "physical", inNet: true}, "x/"), "x/net.ogg");
  assert.equal(RR.layerSoundFor({layer: "physical"}), null);
});

test("journeys on the moon's roads and the trods", () => {
  const tables = id => JOURNEY_TABLES.find(t => t.id === id);
  const rf = k => G.stream ? G.stream("t", k) : seq([0.5]);
  const full = J.planJourney({realm: "moonpath", hours: 4, moon: 4, tables, randFor: rf});
  assert.equal(full.moonRisk, 0.5);
  assert.ok(full.legs.every(l => l.landmark));
  const bridge = J.planJourney({realm: "moonbridge", hours: 40, tables, randFor: rf});
  assert.equal(bridge.legs.length, 1); assert.match(bridge.note, /thousandth/);
  const trod = J.planJourney({realm: "trod-silver", hours: 4, tables, randFor: rf});
  assert.ok(trod.arrival && trod.legs.every(l => l.landmark)); assert.match(trod.note, /Thallain/);
  assert.equal(J.slipWords({slip: "lost", days: 2}), "they come out 2 days later than they should");
});

test("Otherworlds 0.4.0 is wired: tools, the api, the twins window and the statuses", () => {
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/twins-app.mjs", import.meta.url), "utf8");
  const cross = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/crossing.mjs", import.meta.url), "utf8");
  for ( const t of ["wodxDreaming", "wodxOtherRolls", "wodxJack"] ) assert.match(main, new RegExp(t));
  assert.match(main, /registerRealmSettings\(\)/); assert.match(main, /setupRealms\(\)/);
  assert.match(app, /data-action="dreaming"/); assert.match(app, /data-action="trod"/);
  for ( const id of ["wodx-dreaming", "wodx-deep-umbra", "wodx-net"] ) assert.match(cross, new RegExp(id));
  assert.equal(JSON.parse(readFileSync(new URL("../../modules/wodx-otherworlds/module.json", import.meta.url), "utf8")).version, "0.11.0");
});

test("a refused Net or gateway returns nothing, so a caller can tell it from a done one", () => {
  const src = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/realms.mjs", import.meta.url), "utf8");
  assert.ok(!/return ui\.notifications\.warn\(/.test(src.replace(/\? \w+\([^)]*\) : ui\.notifications\.warn/g, "")));
});

/* WoDX Otherworlds 0.5.0: the looks of the other worlds. */
test("each layer's look: decay in the Shadowlands, a swaying shimmer in the Dreaming, lines in the Net", () => {
  assert.equal(J.layerLookCss({layer: "physical"}), "");
  assert.equal(J.layerLookCss({layer: "penumbra"}), "", "the Penumbra's twin art is already silvered");
  assert.equal(J.layerLookCss({layer: "shadowlands", shroud: 5}), J.decayCss(5));
  assert.equal(J.layerLookCss({layer: "shadowlands", shroud: 5, decay: false}), "");
  const a = J.layerLookCss({layer: "dreaming", phase: 1}), b = J.layerLookCss({layer: "dreaming", phase: -1});
  assert.match(a, /hue-rotate\(28deg\)/);
  assert.match(b, /hue-rotate\(-28deg\)/);
  assert.match(J.layerLookCss({layer: "dreaming", phase: 9}), /hue-rotate\(28deg\)/);
  assert.equal(J.layerLookCss({layer: "dreaming", looks: false}), "");
  assert.equal(J.layerLookCss({layer: "shadowlands", inNet: true}), `url(#${J.NET_FILTER_ID})`, "the Net wins over the layer");
  assert.equal(J.layerLookCss({inNet: true, looks: false}), "");
  assert.match(J.NET_SVG, new RegExp(`<filter id="${J.NET_FILTER_ID}"`));
  assert.match(J.NET_SVG, /feConvolveMatrix/);
  const src = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/journey.mjs", import.meta.url), "utf8");
  assert.match(src, /register\(MODULE_ID, "looks"/);
  assert.match(src, /keepSway\(\)/);
});
