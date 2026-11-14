import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Vehicles in a fight (B4790-B4799): lorries, armoured vehicles and aircraft on map tiles, a vehicle's Durability and
   Structure, shelter for those inside, ramming, swerving, and NPCs who get into a vehicle by themselves. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const load = p => import(pathToFileURL(join(root, p)));
const IR = await load("modules/wodx-interactables/scripts/interact-rules.mjs");
const C = await load("modules/wodx-interactables/scripts/chase-rules.mjs");
const VR = await load("modules/wodx-combat/scripts/vehicle-rules.js");
const NR = await load("modules/wodx-npc/scripts/npc-rules.mjs");

const ride = (kind, year, role = "reins", extra = {}) => ({...C.rideInFight(kind, year, "road"), kind, role, label: IR.MOUNTS[kind].label, year, ...extra});
const ch = (abilities = {}, year = 1990) => ({actorId: "a1", year, dexterity: 3, abilities});

test("the new kinds: lorry, armoured car, tank, balloon, aeroplane, helicopter, jet, each in its years", () => {
  for ( const k of ["truck", "armoured", "tank", "balloon", "plane", "helicopter", "jet"] ) {
    assert.ok(IR.MOUNTS[k], k);
    assert.ok(Number.isFinite(IR.MOUNTS[k].from), `${k} has a first year`);
    assert.ok(C.WAYS[k]?.mount === k, `${k} runs in a chase`);
    assert.ok(C.bodyOf(k, 2000)?.structure > 0, `${k} has a body`);
  }
  assert.equal(IR.MOUNTS.plane.skill, "pilot");
  assert.equal(C.WAYS.helicopter.pool[1], "pilot");
  assert.equal(C.wayOpen("tank", 1910), false);
  assert.equal(C.wayOpen("tank", 1917), true);
  assert.equal(C.wayOpen("helicopter", 1930), false);
  assert.equal(C.wayOpen("balloon", 1790), true);
  // Bring forward: the nearest kind in use
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "tank"}, {year: 1910}).patch, {mountKind: "car"});
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "jet"}, {year: 1920}).patch, {mountKind: "plane"});
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "truck"}, {year: 1850}).patch, {mountKind: "cart"});
});

test("the book's bodies: Durability and Structure by year, mass on a ram, full shelter for military and aircraft", () => {
  assert.deepEqual(C.bodyOf("car", 1990), {durability: 3, structure: 4, mass: 1, guard: 0, shelter: true, full: false});
  assert.equal(C.bodyOf("tank", 1985).durability, 20);
  assert.equal(C.bodyOf("armoured", 1970).structure, 15, "the APC");
  assert.equal(C.bodyOf("truck", 1990).mass, 3);
  assert.equal(C.bodyOf("truck", 1990).guard, 3);
  assert.equal(C.bodyOf("motorbike", 1990).shelter, false, "Durability does not protect a rider");
  assert.ok(C.bodyOf("helicopter", 1990).full && C.bodyOf("tank", 1990).full);
  assert.equal(C.bodyOf("foot", 1990), null);
  assert.equal(C.bodyOf("horse", 1197), null, "a beast has no body here");
  assert.equal(C.rideInFight("car", 1990).body.durability, 3);
  assert.equal(C.rideInFight("car", 1990).maneuver, 5);
});

test("aircraft fly over any ground but indoors, ignore its caps and its difficulty", () => {
  assert.ok(C.rideInFight("plane", 1990, "water").yards > 0);
  assert.equal(C.speedOf({way: "helicopter"}, "crowd", 1990).capped, false);
  assert.equal(C.rollFor({way: "helicopter"}, "rough", {year: 1990}).diff, 6, "the ground adds nothing in the air");
  assert.equal(C.canGo("plane", "indoors"), false);
  assert.equal(C.canGo("truck", "rough"), false);
  assert.equal(C.canGo("tank", "rough"), true, "tracks go where wheels cannot");
  assert.equal(C.speedOf({way: "tank"}, "rough", 1990).yards, 20, "slowed on rough ground");
  assert.equal(C.canGo("tank", "water"), false);
  assert.equal(C.rollFor({way: "balloon"}, "open", {year: 1800}).cap, 0, "a balloon goes with the wind");
});

test("the skill it takes: a lorry is a roll below Drive 3; nobody flies without Pilot; military needs Drive 3", () => {
  const truck = IR.describeMount({mount: true, mountKind: "truck"});
  assert.equal(IR.optionsFor(truck, ch({drive: 3})).find(o => o.id === "mount").roll, null, "Drive 3: no roll");
  assert.ok(IR.optionsFor(truck, ch({drive: 1})).find(o => o.id === "mount").roll, "Drive 1: a roll");
  assert.match(IR.optionsFor(truck, ch({drive: 1})).find(o => o.id === "mount").note, /short of the 3/);
  const plane = IR.describeMount({mount: true, mountKind: "plane"});
  const p0 = IR.optionsFor(plane, ch({drive: 4}));
  assert.ok(p0.find(o => o.id === "skillNote")?.disabled, "no Pilot: cannot fly it at all");
  assert.equal(p0.find(o => o.id === "mount"), undefined);
  assert.equal(IR.optionsFor(plane, ch({pilot: 1})).find(o => o.id === "mount").roll, null);
  const tank = IR.describeMount({mount: true, mountKind: "tank"});
  assert.ok(IR.optionsFor(tank, ch({drive: 2})).find(o => o.id === "skillNote")?.disabled);
  assert.ok(IR.optionsFor(tank, ch({drive: 2})).find(o => o.id === "board"), "anyone may ride along");
  const car = IR.describeMount({mount: true, mountKind: "car"});
  assert.equal(IR.optionsFor(car, ch({drive: 1})).find(o => o.id === "mount").roll, null, "a car still needs only Drive 1");
});

test("damage on the tile: sound, damaged, battered, wrecked and burnt, and a wreck goes nowhere", () => {
  assert.equal(IR.hullState({lost: 0}, 4).state, "sound");
  assert.equal(IR.hullState({lost: 1}, 4).state, "damaged");
  assert.equal(IR.hullState({lost: 2}, 4).state, "battered");
  assert.equal(IR.hullState({lost: 5}, 4).state, "wrecked");
  assert.equal(IR.hullState({lost: 4, burning: true}, 4).label, "burnt out");
  assert.ok(IR.hullState({lost: 2}, 4).tint && IR.hullState({lost: 4}, 4).tint !== IR.hullState({lost: 2}, 4).tint, "the tint darkens");
  const wreck = IR.describeMount({mount: true, mountKind: "car", hull: {lost: 4, structure: 4}, driver: {a: "a1", t: "T1", n: "Vlasta"}});
  assert.match(IR.objectLabel?.(wreck) ?? IR.nameOf?.(wreck) ?? "wrecked", /wrecked/);
  const opts = IR.optionsFor(wreck, ch({drive: 3}));
  assert.ok(opts.find(o => o.id === "wreckNote")?.disabled);
  assert.ok(opts.find(o => o.id === "dismount"), "the one inside can still get out");
  assert.equal(opts.find(o => o.id === "control"), undefined);
  assert.equal(IR.cleanMount({mount: true, mountKind: "car", hullLost: "0"}).hullLost, 0, "mended by hand");
});

test("shelter: a closed body takes blows under 4 successes; armour and aircraft take them all; a motorcycle none", () => {
  const car = ride("car", 1990, "passenger");
  assert.deepEqual([VR.shelter(car, {attackSuccesses: 2}).shielded, VR.shelter(car, {attackSuccesses: 2}).through], [true, false]);
  assert.deepEqual([VR.shelter(car, {attackSuccesses: 4}).shielded, VR.shelter(car, {attackSuccesses: 4}).through], [false, true]);
  assert.match(VR.shelter(car, {attackSuccesses: 4}).note, /Mage 20th p\. 459/);
  assert.equal(VR.shelter(ride("tank", 1990), {attackSuccesses: 9}).shielded, true);
  assert.equal(VR.shelter(ride("plane", 1990), {attackSuccesses: 9}).shielded, true);
  assert.equal(VR.shelter(ride("motorbike", 1990), {attackSuccesses: 1}).shielded, false);
  assert.equal(VR.shelter(car, {attackSuccesses: 1, sameVehicle: true}).shielded, false, "a blow from inside");
  assert.equal(VR.shelter(ride("motorbike", 1990), {ram: true}).shielded, true, "a ram strikes the body");
  assert.equal(VR.shelter(null).shielded, false);
});

test("Durability turns damage aside, Structure wrecks it, and the fuel goes up at 3 successes and 6 levels", () => {
  const b = C.bodyOf("car", 1990);
  assert.deepEqual([VR.hullBlow(b, 3).lost, VR.hullBlow(b, 3).bounced], [0, true]);
  assert.deepEqual([VR.hullBlow(b, 5).lost, VR.hullBlow(b, 5).total, VR.hullBlow(b, 5).wrecked], [2, 2, false]);
  assert.equal(VR.hullBlow(b, 5, 2).wrecked, true, "4 of 4 lost");
  assert.equal(VR.hullBlow(b, 20, 0).total, 4, "never past its Structure");
  const car = ride("car", 1990);
  assert.ok(VR.fuelGoes(car, {attackSuccesses: 3, levels: 6}));
  assert.equal(VR.fuelGoes(car, {attackSuccesses: 2, levels: 9}), false);
  assert.equal(VR.fuelGoes(ride("carriage", 1850), {attackSuccesses: 5, levels: 9}), false, "no motor, no fuel");
});

test("ramming: Durability, a die a 10 mph and the mass; a crash inside less the Durability, halved when strapped", () => {
  const limo = ride("car", 1990);
  // 50 mph is about 74 yards a turn
  const r = VR.ramDice(limo, 74);
  assert.equal(r.mph, 50);
  assert.equal(r.dice, 3 + 5 + 1);
  assert.match(r.parts.join(" "), /Durability 3.*50 mph \+5.*mass \+1/);
  assert.equal(VR.ramDice(ride("tank", 1990), 0).dice, 20 + 5);
  assert.equal(VR.crashDice(ride("car", 1960), 9), 6, "9 less Durability 3, no belts in 1960");
  assert.equal(VR.crashDice(ride("car", 1990), 9), 3, "halved: strapped in");
  assert.equal(VR.crashDice(ride("truck", 1960), 12), 5, "12 less Durability 4 and a lorry's +3 guard");
  assert.equal(VR.crashDice(ride("motorbike", 1990), 9), 9, "a motorcycle shields no one");
  assert.ok(VR.canRam(ride("car", 1990)) && !VR.canRam(ride("car", 1990, "passenger")) && !VR.canRam(ride("plane", 1990)));
});

test("the wheel: the driving pool held to the Maneuver; a swerve in place of a dodge; sat inside, no dodge", () => {
  const car = ride("car", 1990);
  assert.deepEqual(VR.maneuverCap(car, 8), {dice: 5, held: true});
  assert.deepEqual(VR.maneuverCap(ride("cart", 1800), 8), {dice: 8, held: false}, "no chart, no cap");
  const s = VR.swerve(car, {dex: 4, dots: 3, ranged: true});
  assert.deepEqual([s.valid, s.dice, s.diff], [true, 5, 8]);
  assert.equal(VR.swerve(ride("car", 1990, "passenger"), {dex: 4, dots: 3}).valid, false);
  assert.equal(VR.swerve({...car, wrecked: true}, {dex: 4, dots: 3}).valid, false);
  assert.ok(VR.seated(ride("car", 1990, "passenger")));
  assert.equal(VR.seated(ride("motorbike", 1990)), false, "astride a motorcycle you still dodge");
  assert.equal(VR.skillLabel("pilot"), "Pilot");
});

test("an NPC gets into a vehicle by itself: to flee faster, or to give chase", () => {
  const vehicles = [{id: "T1", label: "Motor car", distance: 6, canDrive: true}, {id: "T2", label: "Tank", distance: 3, canDrive: false}];
  const fleeing = [{action: "flee", score: 9, why: "wounded"}, {action: "attack", target: "e", score: 4, why: ""}];
  const b = NR.boardOption({self: {run: 20}, vehicles, enemies: [{id: "e", reach: true, distance: 1}]}, fleeing, {aggression: 0.2});
  assert.deepEqual([b.action, b.vehicle, b.score], ["board", "T1", 9.5], "the one it can drive");
  assert.match(b.why, /6 yards off/);
  assert.equal(NR.boardOption({self: {run: 4}, vehicles}, fleeing, {}), null, "too far to reach this turn");
  assert.equal(NR.boardOption({self: {run: 20, atWheel: true}, vehicles}, fleeing, {}), null, "already at the wheel");
  const far = [{action: "attack", target: "e", score: 5, why: ""}];
  const c = NR.boardOption({self: {run: 20}, vehicles, enemies: [{id: "e", reach: false, ranged: false, distance: 90}]}, far, {aggression: 2});
  assert.deepEqual([c?.action, c?.score], ["board", 5.5]);
  assert.equal(NR.boardOption({self: {run: 20}, vehicles, enemies: [{id: "e", reach: false, distance: 10}]}, far, {aggression: 2}), null, "a foe within a run: just go");
  assert.ok(NR.SELF_ACTING.includes("board"));
  const opts = NR.scoreOptions({aggression: 0.1, cowardice: 3, caution: 1, fleeAt: 1, fears: ["violence"], tactics: ["flee"]},
    {self: {wounds: 3, run: 25}, vehicles, enemies: [{id: "e", visible: true, reach: true, distance: 1}], allies: []});
  assert.equal(opts[0].action, "board", "a frightened NPC runs for the car");
});

test("the wiring: Interactables kinds and damage, Combat's shelter, ram and swerve, NPC boarding, the setting", () => {
  const ixm = src("modules/wodx-interactables/scripts/main.mjs"), chase = src("modules/wodx-interactables/scripts/chase.mjs");
  assert.match(ixm, /"pilot"/, "Pilot is read from the sheet");
  assert.match(ixm, /hullLost/, "mended in the tile config");
  assert.match(ixm, /a wrecked vehicle goes nowhere/);
  assert.match(chase, /wrecked: !!\(r\.body && lost >= r\.body\.structure\)/);
  const main = src("modules/wodx-combat/scripts/main.js"), glue = src("modules/wodx-combat/scripts/vehicles.js");
  assert.match(main, /import \* as VH from "\.\/vehicles\.js"/);
  assert.match(main, /VH\.setupVehicles\(/);
  assert.match(main, /VH\.ramWeapon\(actor\)/);
  assert.match(main, /VH\.capPool\(attacker, w, pool\.dice\)/);
  assert.match(main, /VH\.shelterFor\(/);
  assert.match(main, /shelter\?\.shielded/);
  assert.match(main, /await VH\.afterHit\(/);
  assert.match(main, /await wreck\.apply\(\)/);
  assert.match(main, /planDefense\(target, "swerve"/);
  assert.match(main, /option value="swerve"/);
  assert.match(main, /mounted, vehicles, aftermath/);
  assert.match(glue, /"vehicleCombat"/);
  assert.match(glue, /createScrollingText/, "the damage shows over the tile");
  assert.match(glue, /"texture\.tint"/, "and on its tint");
  assert.match(glue, /hazardKind: "fire"/, "a burning wreck is a fire on the map");
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(npc, /case "board"/);
  assert.match(npc, /ix\.attempt\?\.\(tok, tile\.id, "mount"/, "getting in is Interactables' own action");
  assert.match(npc, /vehicles: pace\.atWheel \? \[\] : vehiclesNear\(tok\)/);
  assert.match(npc, /drives off in the/);
});
