import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The last of the ways of moving (WoDX Combat 3.20.0, Interactables 0.35.0, Senses 0.8.0, NPC 0.45.3): riding and
   driving in a fight outside a chase, a rider's charge, a load that slows a swimmer, and the senses reading how a
   character moves. Pure rules, plus the wiring read from the source. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const load = p => import(pathToFileURL(join(root, p)));
const MV = await load("modules/wodx-combat/scripts/movement-rules.js");
const C = await load("modules/wodx-interactables/scripts/chase-rules.mjs");
const IR = await load("modules/wodx-interactables/scripts/interact-rules.mjs");
const SR = await load("modules/wodx-senses/scripts/senses-rules.mjs");
const RR = await load("modules/wodx-npc/scripts/routine-rules.mjs");

/* ---------------- riding outside a chase ---------------- */

test("every mount and vehicle on a tile has a pace in a fight, the same as its pace in a chase", () => {
  for ( const kind of Object.keys(IR.MOUNTS) ) {
    const r = C.rideInFight(kind, 1990, "road");
    assert.ok(r, `${kind} has a way to run`);
    assert.ok(r.yards > 0, `${kind} moves on a road or the water`);
    assert.equal(r.yards, C.speedOf({way: r.way}, r.ground, 1990).yards, `${kind}: chase and fight agree`);
    assert.ok(["ride", "drive", "athletics"].includes(r.skill), `${kind}: ${r.skill}`);
  }
  assert.equal(C.rideInFight("dragon", 1990), null);
});

test("the ground holds a mount down, shuts it out, and a boat is always on the water", () => {
  assert.equal(C.rideInFight("horse", 1197, "road").yards, 50);
  assert.equal(C.rideInFight("horse", 1197, "streets").yards, 30, "town streets cap hooves");
  assert.equal(C.rideInFight("horse", 1197).yards, 30, "streets when nothing is said");
  assert.equal(C.rideInFight("horse", 1197, "indoors").yards, 0, "no riding indoors");
  assert.equal(C.rideInFight("cart", 1197, "rough").yards, 0);
  const boat = C.rideInFight("boat", 1197, "streets");
  assert.equal(boat.ground, "water"); assert.ok(boat.yards > 0); assert.equal(boat.water, true);
});

test("a ride through the ages: a horse in 1197 and 2090, a car faster each age, a saddle on a horse and a motorcycle only", () => {
  assert.equal(C.rideInFight("horse", 1197, "road").yards, C.rideInFight("horse", 2090, "road").yards);
  const car = y => C.rideInFight("car", y, "road").yards;
  assert.ok(car(1905) < car(1950) && car(1950) < car(1995) && car(1995) < car(2090), "cars by year");
  for ( const [k, saddle] of [["horse", true], ["mule", true], ["motorbike", true], ["cart", false], ["carriage", false], ["car", false], ["boat", false]] )
    assert.equal(C.rideInFight(k, 1990, "road").saddle, saddle, k);
  assert.equal(C.rideInFight("horse", 1300, "road").hooves, true);
  assert.equal(C.rideInFight("motorbike", 1990, "road").hooves, false);
});

test("at the reins the mount's pace is the limit; no dot in the skill keeps it to half; a passenger is carried", () => {
  const horse = {...C.rideInFight("horse", 1197, "road"), role: "reins", label: "Riding horse"};
  assert.deepEqual([MV.rideMove(horse, {skill: 2}).limit, MV.rideMove(horse, {skill: 0}).limit], [50, 25]);
  assert.match(MV.rideMove(horse, {skill: 0}).note, /half pace: no Ride/);
  assert.match(MV.rideMove({...horse, skill: "drive", label: "Motor car"}, {skill: 0}).note, /no Drive/);
  const pass = MV.rideMove({...horse, role: "passenger"});
  assert.equal(pass.limit, null); assert.equal(pass.carried, true);
  assert.deepEqual(MV.rideMove(null), {limit: null, carried: false, note: ""});
});

test("the saddle and the vehicle are stances; a knocked-down rider is prone, and Earth Meld still wins", () => {
  assert.equal(MV.stanceOf({ride: {saddle: true}}), "mounted");
  assert.equal(MV.stanceOf({ride: {saddle: false}}), "aboard");
  assert.equal(MV.stanceOf({ride: {saddle: true}, knockedDown: true}), "prone");
  assert.equal(MV.stanceOf({ride: {saddle: true}, ab: {meld: true}}), "melded");
  assert.equal(MV.stanceOf({ride: {saddle: true}, mode: "crawl"}), "mounted", "the rider's own way of moving does not matter");
  assert.equal(MV.stanceOf({mode: "crawl"}), "prone");
  for ( const s of ["mounted", "aboard"] ) assert.ok(MV.STANCES[s].label && MV.STANCES[s].note, s);
});

test("from the saddle down at someone on foot is easier, up at a rider harder, and two riders meet level", () => {
  assert.equal(MV.attackStance("mounted", "standing", {close: true}).diff, -1);
  assert.equal(MV.attackStance("mounted", "standing", {close: true, higher: true}).diff, -1, "not doubled by higher ground");
  assert.equal(MV.attackStance("standing", "mounted", {close: true}).diff, 1);
  assert.equal(MV.attackStance("mounted", "mounted", {close: true, sameStance: true}).diff, 0);
  assert.equal(MV.attackStance("mounted", "standing", {close: false}).diff, 1, "a shot from a moving saddle");
  assert.equal(MV.attackStance("mounted", "flying", {close: true}).diff, MV.STANCES.flying.vs.close, "no saddle edge on a flier");
  assert.equal(MV.attackStance("standing", "standing", {close: true, higher: true}).diff, -1, "higher ground as before");
  assert.equal(MV.rollStance("mounted", ["stealth"]).diff, 2);
  assert.equal(MV.rollStance("aboard", ["dodge"]).diff, 2);
});

test("the mounted charge: a die for each 10 yards ridden this turn, five at most, hooves and reins only, never a shot", () => {
  const horse = {role: "reins", hooves: true, saddle: true};
  assert.deepEqual([0, 9, 10, 29, 50, 300].map(y => MV.chargeDice(horse, y)), [0, 0, 1, 2, 5, 5]);
  assert.equal(MV.chargeDice(horse, 40, {ranged: true}), 0);
  assert.equal(MV.chargeDice({...horse, role: "passenger"}, 40), 0);
  assert.equal(MV.chargeDice({role: "reins", hooves: false, saddle: true}, 40), 0, "a motorcycle is no lance charge");
  assert.equal(MV.chargeDice({role: "reins", hooves: true, saddle: false}, 40), 0, "nor a cart");
  assert.equal(MV.chargeDice(null, 40), 0);
  assert.equal(MV.CHARGE_MAX, 5, "V20 Dark Ages p. 399: five at most");
});

/* ---------------- a load in the water ---------------- */

test("a swimmer's load: armor's Dexterity penalty and the burden count steps, and strength takes some off", () => {
  assert.equal(MV.swimLoad().steps, 0);
  assert.equal(MV.swimLoad({armorPenalty: 1}).steps, 1);
  assert.equal(MV.swimLoad({armorPenalty: 2, burden: 1}).steps, 3);
  assert.equal(MV.swimLoad({armorPenalty: 2, burden: 1, strength: 4}).steps, 2);
  assert.equal(MV.swimLoad({armorPenalty: 2, burden: 1, strength: 3, potence: 4}).steps, 1);
  assert.equal(MV.swimLoad({burden: 9}).burden, 3, "the burden stops at all they can lift");
  assert.equal(MV.swimLoad({armorPenalty: -2}).steps, 0);
  assert.equal(MV.BURDENS.length, 4);
  for ( const b of MV.BURDENS ) assert.ok(b.label && b.hint);
});

test("each step takes a quarter off the swim and adds 1 difficulty in the water; four steps and they go under", () => {
  const base = {walk: 7, jog: 14, run: 26};
  const sp = steps => MV.speedFor("swim", base, {}, {athletics: 2, load: MV.swimLoad({armorPenalty: steps})});
  assert.deepEqual([0, 1, 2, 3, 4].map(sp), [14, 10, 7, 3, 0]);
  assert.equal(MV.speedFor("swim", base, {swimfast: true}, {load: MV.swimLoad({armorPenalty: 2})}), 13, "a swimming power is slowed too");
  assert.equal(MV.speedFor("swim", base, {}, {athletics: 0, load: MV.swimLoad({armorPenalty: 1})}), 1, "never less than a yard while afloat");
  assert.equal(MV.speedFor("fly", base, {fly: true}, {load: MV.swimLoad({armorPenalty: 4})}), 15, "only swimming");
  const heavy = MV.swimLoad({armorPenalty: 3, burden: 2});
  assert.equal(heavy.sinks, true); assert.match(heavy.note, /go under/);
  assert.equal(MV.underWater({athletics: 4, load: heavy}), true);
  assert.equal(MV.underWater({athletics: 4, ab: {swimfast: true}, load: heavy}), true);
  assert.equal(MV.underWater({athletics: 4, ab: {waterwalk: true}, load: heavy}), false, "a water-walker is not swimming");
  assert.equal(MV.underWater({athletics: 4, load: MV.swimLoad({armorPenalty: 1})}), false);
  const l2 = MV.swimLoad({armorPenalty: 2});
  assert.equal(MV.rollStance("swimming", ["dexterity"], {load: l2}).diff, MV.STANCES.swimming.own.dexterity + 2);
  assert.equal(MV.rollStance("swimming", ["close", "dodge"], {load: l2}).diff, MV.STANCES.swimming.own.close + MV.STANCES.swimming.own.dodge + 2, "counted once");
  assert.equal(MV.rollStance("swimming", ["perception"], {load: l2}).diff, 0, "weight does not dull the eye");
  assert.equal(MV.rollStance("standing", ["dexterity"], {load: l2}).diff, 0, "on dry land the load is the armor's own business");
  assert.equal(MV.swimLoad({armorPenalty: 6}).diff, 3, "three at most");
});

/* ---------------- the senses read how they move ---------------- */

test("the sight changes in the senses are WoDX Combat's own, so a look and a Perception check agree", () => {
  for ( const [stance, S] of Object.entries(SR.STANCE_SENSES) ) {
    assert.ok(MV.STANCES[stance], `${stance} is a stance WoDX Combat knows`);
    const sight = S.mods.filter(m => m.senses.includes("sight")).reduce((n, m) => n + m.n, 0);
    assert.equal(sight, MV.STANCES[stance].own.perception ?? 0, `${stance}: sight`);
  }
  assert.equal(SR.STANCE_SENSES.standing, undefined);
});

test("a stance lays its changes, lost senses, reach and lines over the powers", () => {
  const pw = SR.powersFor({});
  const fly = SR.withStance(pw, "flying");
  assert.equal(SR.difficulty("sight", {light: "bright", indoor: false}, fly).diff, SR.difficulty("sight", {light: "bright", indoor: false}, pw).diff - 1);
  assert.equal(SR.difficulty("sound", {indoor: false}, fly).diff, SR.difficulty("sound", {indoor: false}, pw).diff + 1);
  assert.equal(fly.sightFar, 2); assert.ok(fly.stanceLines.sight);
  const under = SR.withStance(pw, "under");
  const smell = SR.difficulty("smell", {}, under);
  assert.equal(smell.blind, true); assert.match(smell.lostLine, /Under the water/);
  assert.equal(SR.difficulty("sight", {light: "bright"}, under).diff, SR.difficulty("sight", {light: "bright"}, pw).diff + 2);
  const meld = SR.withStance(pw, "melded");
  assert.match(SR.difficulty("sight", {light: "bright"}, meld).lostLine, /Inside the earth/);
  assert.equal(SR.difficulty("sound", {}, meld).blind, false);
  const plain = SR.withStance(pw, "standing");
  assert.equal(plain.sightFar, 1); assert.deepEqual(plain.stanceLines, {}); assert.equal(plain.traitMods.length, pw.traitMods.length);
  // someone already blind keeps their own line
  const blind = SR.withStance({...pw, cannot: [{sense: "sight", label: "Blind"}]}, "melded");
  assert.equal(blind.cannot.filter(c => c.sense === "sight").length, 1);
  assert.equal(SR.difficulty("sight", {}, blind).lost, "Blind");
});

test("the eye reaches twice as far from the air, half as far from the ground, and 8 yards under the water", () => {
  const at = (yards, o) => SR.reachOf("sight", {yards}, {light: "bright", ...o});
  assert.equal(at(100, {}), null); assert.equal(at(100, {sightFar: 2}), 0);
  assert.equal(at(40, {}), 0); assert.equal(at(40, {sightFar: 0.5}), null);
  assert.equal(at(10, {sightCap: 8}), null); assert.equal(at(8, {sightCap: 8}), 0);
  assert.equal(SR.reachOf("sound", {yards: 20}, {sightFar: 0.5}), 0, "only the eye");
});

test("the stance lines: one sentence each, no numbers, nothing a year would get wrong, nobody's gender", () => {
  const all = Object.values(SR.STANCE_SENSES).flatMap(S => [...Object.values(S.lines ?? {}), ...(S.cannot ?? []).map(c => c.line)]);
  assert.ok(all.length >= 20);
  for ( const t of all ) {
    assert.match(t, /^[A-Z].*\.$/, t);
    assert.doesNotMatch(t, /\d|—|\b(he|she|his|her|him)\b/i, t);
    assert.ok(t.length <= 90, t);
  }
  assert.equal(new Set(all).size, all.length, "no line twice");
});

test("someone prone or under the water is picked out only on a closer look", () => {
  assert.equal(SR.lowFigure("standing", 0), null);
  assert.deepEqual(SR.lowFigure("prone", MV.spotStance("prone")), {t: "Someone keeps low to the ground {{dir}}.", n: 1});
  assert.equal(SR.lowFigure("under", MV.spotStance("under")).n, 2);
  assert.match(SR.lowFigure("under", 2).t, /under the water/);
});

test("noticing a hider: each side can have its own difficulty, and the old call still works", () => {
  const seq = faces => { let i = 0; return () => (faces[i++ % faces.length] - 0.5) / 10; };
  const watcher = {perception: 2, alertness: 1, awake: true, inSight: true}, hider = {dexterity: 2, stealth: 1, sneaking: true};
  // watcher rolls 7,7,7 and the hider 7,7,7: at 6 each a tie (not noticed); a watcher at 8 gets none; a hider at 8 gets none
  assert.equal(RR.notice(watcher, hider, {rng: seq([7])}).noticed, false);
  assert.equal(RR.notice(watcher, hider, {rng: seq([7]), intruderDiff: 8}).noticed, true);
  assert.equal(RR.notice(watcher, hider, {rng: seq([7]), watcherDiff: 8}).noticed, false);
  assert.equal(RR.notice(watcher, hider, {rng: seq([7]), diff: 8}).noticed, false, "one difficulty for both, as before");
});

/* ---------------- the wiring ---------------- */

test("the wiring: Interactables tells the ride, Combat reads it for moves, stances and damage, Senses reads the stance", () => {
  const chase = src("modules/wodx-interactables/scripts/chase.mjs"), ix = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(chase, /export function rideOf\(tokDoc\)/);
  assert.match(ix, /api\.rideOf = /);
  assert.match(ix, /td\.update\(go, \{wodxMove: false\}\)/, "a carried passenger's move is not counted");
  const mv = src("modules/wodx-combat/scripts/movement.js"), main = src("modules/wodx-combat/scripts/main.js");
  assert.match(mv, /api\?\.rideOf\?\.\(doc\)/);
  assert.match(mv, /ride: rideOf\(doc\)/, "the stance reads the ride");
  assert.match(mv, /mode: "ride"/);
  assert.match(mv, /rideOf, loadOf, chargeOf, rideCapOf, setBurden, burdenDialog/);
  assert.match(main, /add\("Mounted charge", charge\)/);
  assert.match(main, /export function armorPenalty/);
  assert.match(main, /armorPenalty, ask: P\.ask/);
  const sn = src("modules/wodx-senses/scripts/main.mjs"), pc = src("modules/wodx-senses/scripts/perception.mjs");
  assert.match(sn, /R\.withStance\(R\.powersFor\(ctx\.traits\), stanceOf\(actor, td\)\)/);
  assert.match(sn, /sightFar: pw\.sightFar, sightCap: pw\.sightCap/);
  assert.match(sn, /R\.lowFigure/);
  assert.match(pc, /watcherDiff: clamp\(6 \+ own \+ hide\.spot\)/);
});

test("the three runtime files still load without Foundry's globals in their top level imports", async () => {
  for ( const f of ["modules/wodx-combat/scripts/movement-rules.js", "modules/wodx-interactables/scripts/chase-rules.mjs", "modules/wodx-senses/scripts/senses-rules.mjs"] )
    assert.ok(await load(f), f);
});

test("in the saddle an Ability is held to Ride; not on foot, in a cart or at a wheel", () => {
  const horse = {role: "reins", hooves: true, saddle: true, skill: "ride"};
  assert.deepEqual(MV.rideCap(horse, 4, 2), {value: 2, lost: 2});
  assert.deepEqual(MV.rideCap(horse, 2, 4), {value: 2, lost: 0});
  assert.deepEqual(MV.rideCap(horse, 3, 0), {value: 0, lost: 3});
  assert.deepEqual(MV.rideCap({...horse, role: "passenger"}, 4, 1), {value: 1, lost: 3}, "anyone astride");
  assert.deepEqual(MV.rideCap({...horse, saddle: false}, 4, 1), {value: 4, lost: 0}, "a cart");
  assert.deepEqual(MV.rideCap({role: "reins", motor: true, skill: "drive"}, 4, 0), {value: 4, lost: 0});
  assert.deepEqual(MV.rideCap(null, 4, 0), {value: 4, lost: 0});
});
