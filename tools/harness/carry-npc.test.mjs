import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* NPCs and companions pick up the fallen (B5077, B5079, Ben's Carry Bodies Desk c8 and c10). */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const NR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/npc-rules.mjs")));
const SR = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/solo-rules.mjs")));

const guard = NR.profileOf({}, "guard");
const self = (o = {}) => ({kind: "mortal", wounds: 0, run: 20, ...o});
const ally = (o = {}) => ({id: "a1", name: "Jana", ally: true, distance: 2, canMove: true, mode: "carry", ...o});
const foe = (o = {}) => ({id: "f1", name: "Otto", foe: true, distance: 2, canMove: true, mode: "drag", ...o});

test("rescue: retreating with an ally down, the NPC carries them off, above the flight (B5077)", () => {
  const opts = NR.scoreOptions({...guard, fleeAt: 2}, {self: self({wounds: 4}), enemies: [{id: "e", name: "E", reach: true, visible: true}], allies: [], fallen: [ally()]});
  const carry = opts.find(o => o.action === "carry"), flee = opts.find(o => o.action === "flee");
  assert.ok(carry && flee);
  assert.equal(carry.intent, "rescue");
  assert.ok(carry.score > flee.score, "carrying the ally off beats fleeing alone");
  assert.equal(opts[0].action, "carry");
});

test("hide: masquerade, mortals about, no foe in reach: drag a body out of sight (B5077)", () => {
  const p = {...guard, tactics: ["masquerade"]};
  const o = NR.carryOption({self: self(), enemies: [], witnesses: 2, fallen: [foe({dead: true})]}, [], p);
  assert.equal(o.intent, "hide");
  assert.equal(o.want, "drag");
});

test("capture: no foe standing in reach, a downed enemy, rival or hostile player character is taken (Ben's note)", () => {
  const o = NR.carryOption({self: self(), enemies: [{id: "f1", reach: true, down: true}], fallen: [foe({hostile: true})]}, [], guard);
  assert.equal(o.intent, "capture");
  assert.match(o.why, /hostile player character/);
  assert.equal(NR.carryOption({self: self(), enemies: [], fallen: [foe({foe: false, rival: true})]}, [], guard).intent, "capture");
  assert.equal(NR.carryOption({self: self(), enemies: [{id: "x", reach: true}], fallen: [foe()]}, [], guard), null, "a foe on their feet in reach comes first");
  assert.equal(NR.carryOption({self: self(), enemies: [], fallen: [foe({dead: true})]}, [], guard), null, "the dead are not captives");
  assert.equal(NR.carryOption({self: self(), enemies: [], fallen: [foe()]}, [], {...guard, aggression: 0.2}), null, "a timid NPC leaves them");
});

test("the switch, animals, and a body too heavy (B5077)", () => {
  assert.equal(NR.carryOption({self: self(), noCarry: true, fallen: [foe()]}, [], guard), null);
  assert.equal(NR.carryOption({self: self({animal: true}), fallen: [foe()]}, [], guard), null);
  assert.equal(NR.carryOption({self: self(), fallen: [foe({canMove: false})]}, [], guard), null);
  assert.equal(NR.carryOption({self: self({run: 5}), fallen: [foe({distance: 30})]}, [], guard), null, "too far to reach this turn");
});

test("holding one already: keep going, unless a fight it wants is in reach (B5077)", () => {
  const held = {id: "a1", name: "Jana", intent: "capture"};
  assert.equal(NR.carryOption({self: self({holding: held}), enemies: []}, [], guard).target, "a1");
  assert.equal(NR.carryOption({self: self({holding: held}), enemies: [{id: "x", reach: true}]}, [], guard), null);
  assert.ok(NR.carryOption({self: self({holding: {...held, intent: "rescue"}}), enemies: [{id: "x", reach: true}]}, [], guard), "a rescuer keeps hold");
});

test("an order to carry goes first (B5079)", () => {
  const o = NR.carryOption({self: self(), enemies: [{id: "x", reach: true}], carryOrder: "a1", fallen: [ally({distance: 30})]}, [], guard);
  assert.equal(o.target, "a1");
  assert.ok(o.score >= 9);
  assert.ok(NR.SELF_ACTING.includes("carry"));
  assert.equal(NR.ACTION_LABEL.carry, "Carry off");
});

test("the companion: one who serves first, then a friendly one, nearest; never a player's, a fallen or a busy one (B5079)", () => {
  const list = [
    {id: "f", friendly: true, distance: 3},
    {id: "s", serves: true, distance: 12},
    {id: "p", friendly: true, player: true, distance: 1},
    {id: "d", serves: true, down: true, distance: 1},
    {id: "h", serves: true, holding: true, distance: 1},
    {id: "far", serves: true, distance: 90}
  ];
  assert.equal(SR.companionFor(list).id, "s");
  assert.equal(SR.companionFor(list.filter(c => c.id !== "s")).id, "f");
  assert.equal(SR.companionFor([{id: "n", distance: 1}]), null, "a stranger does not");
  assert.ok(SR.PANEL.some(b => b.id === "carry"));
});

test("wiring: NPC reads the fallen and acts; Solo watches the player's character and answers the panel", () => {
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(npc, /fallen: fallenNear\(tok, combat, harm\)/);
  assert.match(npc, /case "carry": return carryTurn\(/);
  assert.match(npc, /name="noCarry"/);
  assert.match(npc, /export async function orderCarry/);
  assert.match(npc, /await dropForFight\(tok\)/);
  assert.match(npc, /HAUL\(\)\?\.release\?\.\(doc, \{quiet: true\}\)/, "Undo lets go");
  const solo = src("modules/wodx-solo/scripts/companions.mjs"), main = src("modules/wodx-solo/scripts/main.mjs");
  assert.match(solo, /"ask\.carry"/);
  assert.match(solo, /orderCarry/);
  assert.match(main, /installCarry\(/);
  assert.match(main, /registerCarrySettings\(\)/);
  assert.match(src("modules/wodx-solo/scripts/panel.mjs"), /\bcarry\(\)/);
  assert.match(src("modules/wodx-interactables/scripts/haul.mjs"), /strengthOf, loadOf/);
});

/* ---------------- B5087 to B5089: where they take them ---------------- */
import * as CG from "../../modules/wodx-npc/scripts/carry-goal-rules.mjs";

test("rescue: a Cainite to a haven, a living mortal home, a dead mortal to their own home for burial, else off the map (B5087)", () => {
  const places = [{id: "h1", kind: "haven", scene: "s1"}, {id: "home1", kind: "home", scene: "s1"}, {id: "home2", kind: "home", scene: "s2"}];
  const roles = {haven: "h1", home: "home1"};
  assert.deepEqual(CG.goalFor({intent: "rescue", kindred: true, places, roles, here: "s1"}), {kind: "place", id: "h1", onScene: true, after: "safe"});
  assert.equal(CG.goalFor({intent: "rescue", places, roles, here: "s1"}).id, "home1");
  const dead = CG.goalFor({intent: "rescue", dead: true, places, roles, bodyRoles: {home: "home2"}, here: "s1"});
  assert.deepEqual(dead, {kind: "place", id: "home2", onScene: false, after: "burial"});
  assert.equal(CG.goalFor({intent: "rescue", dead: true, kindred: true, places, roles, here: "s1"}).after, "rest");
  assert.equal(CG.goalFor({intent: "rescue", places, roles: {home: "gone"}, here: "s1"}).kind, "edge");
  // a player's character is not carried off the map by a rescuer
  assert.equal(CG.goalFor({intent: "rescue", places, roles: {home: "gone"}, here: "s1", stayOnMap: true}).kind, "away");
  assert.equal(CG.goalFor({intent: "rescue", places, roles: {home: "home2"}, here: "s1", stayOnMap: true}).kind, "away");
  assert.equal(CG.goalFor({intent: "rescue", places, roles, here: "s1", stayOnMap: true}).id, "home1");
});

test("hiding: the nearest hiding spot with room, else away out of sight (B5088)", () => {
  const hides = [{id: "far", distance: 6, room: true}, {id: "full", distance: 1, room: false}, {id: "near", distance: 3, room: true}];
  assert.deepEqual(CG.goalFor({intent: "hide", hides}), {kind: "hide", id: "near", onScene: true, after: "hidden"});
  assert.equal(CG.goalFor({intent: "hide", hides: []}).kind, "away");
});

test("captives: the faction's watch-house before its keep or haven, on this map first; tied and recorded; freed (B5089)", () => {
  const places = [{id: "keep", kind: "castle", scene: "s1"}, {id: "watch", kind: "gate", scene: "s1"}, {id: "watch2", kind: "gate", scene: "s2"}, {id: "inn", kind: "tavern", scene: "s1"}];
  assert.equal(CG.goalFor({intent: "capture", places, factionPlaces: ["inn", "keep", "watch2", "watch"], here: "s1"}).id, "watch");
  assert.equal(CG.goalFor({intent: "capture", places, factionPlaces: ["inn", "keep"], here: "s1"}).id, "keep");
  assert.equal(CG.goalFor({intent: "capture", places, factionPlaces: [], roles: {post: "watch2"}, here: "s1"}).id, "watch2");
  assert.equal(CG.goalFor({intent: "capture", places, here: "s1"}).after, "prison");
  // a body taken as proof goes where a captive would, and arrives as proof
  assert.deepEqual(CG.goalFor({intent: "proof", dead: true, places, factionPlaces: ["watch"], here: "s1"}), {kind: "place", id: "watch", onScene: true, after: "proof"});
  const e = CG.prisonerEntry({captive: "a1", name: "Mira", factionName: "the Watch", placeName: "the watch-house", since: 5});
  assert.equal(CG.prisonerRumour(e), "Mira is held prisoner by the Watch at the watch-house");
  let list = CG.addPrisoner([], e);
  assert.equal(CG.heldNow(list).length, 1);
  list = CG.freePrisoner(list, "a1", 9);
  assert.equal(CG.heldNow(list).length, 0);
  assert.equal(list[0].freed, 9);
});

test("the walk: the reachable cell nearest the goal; the map's nearest edge", () => {
  const map = new Map([["0,0", {c: {i: 0, j: 0}, g: 0}], ["0,3", {c: {i: 0, j: 3}, g: 3}], ["1,3", {c: {i: 1, j: 3}, g: 4}]]);
  assert.deepEqual(CG.towardCell(map, {i: 0, j: 9}).node.c, {i: 0, j: 3});
  assert.deepEqual(CG.edgePoint({x: 0, y: 0, w: 2000, h: 1500}, {x: 1900, y: 700}, 100), {x: 1950, y: 700});
  assert.ok(CG.arrived(1) && !CG.arrived(2));
});

test("the walk to another map: an hour in the same region, three to another, dragging doubles; the clock brings them and takes them back", () => {
  assert.equal(CG.tripSeconds({sameRegion: true}), 3600);
  assert.equal(CG.tripSeconds({sameRegion: false}), 3 * 3600);
  assert.equal(CG.tripSeconds({sameRegion: true, mode: "drag"}), 7200);
  const trips = [{id: "a", due: 100, arrived: false}, {id: "b", due: 500, arrived: false}, {id: "c", due: 300, arrived: true}];
  const {due, back} = CG.tripsAt(trips, 200);
  assert.deepEqual(due.map(t => t.id), ["a"]);
  assert.deepEqual(back.map(t => t.id), ["c"]);
});

test("wiring: carryTurn walks to the goal and arrives; a player's character waits on approval; prisoners are untied by a card", () => {
  const m = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  const g = readFileSync(new URL("../../modules/wodx-npc/scripts/carry-goals.mjs", import.meta.url), "utf8");
  assert.match(m, /carryGoals\.goalOf\(tok, target/);
  assert.match(m, /carryGoals\.arrive\(/);
  assert.match(m, /carryGoals\.askCapture\(/);
  assert.match(g, /setCondition\?\.\(actor, "immobilized", true\)/);
  assert.match(g, /Hooks\.callAll\("wodxCaptive"/);
  assert.match(g, /registerApprovalHandler\?\.\(TYPE/);
  assert.match(g, /data-wnpc-untie/);
  assert.match(g, /Hooks\.callAll\("wodxBodyTaken"/);
  assert.match(m, /orderCarry\(tok, target, \{intent = "rescue"\}/);
  assert.match(g, /Hooks\.on\("updateWorldTime"/);
  assert.match(g, /startTrip\(tok, target, goal\)/);
  assert.match(g, /setConcealed\?\.\(td, true\)/);
  const s = readFileSync(new URL("../../modules/wodx-storyteller/scripts/signals.mjs", import.meta.url), "utf8");
  assert.match(s, /wodxCaptive:/);
});
