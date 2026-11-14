import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* How much runs by itself (Chronicle 0.46.0), the small rules, fights that end, letting time pass (B2450-B2458). */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const AR = await load("modules/wodx-chronicle/scripts/automation-rules.mjs");
const QR = await load("modules/wodx-chronicle/scripts/approvals-rules.mjs");
const WR = await load("modules/wodx-chronicle/scripts/waiting-rules.mjs");
const SOLO = await load("modules/wodx-solo/scripts/solo-rules.mjs");
const FE = await load("modules/wodx-combat/scripts/fight-end-rules.js");
const SR = await load("modules/wodx-storyteller/scripts/spend-rules.mjs");
const K = await load("modules/wodx-storyteller/scripts/kits-rules.mjs");
const J = await load("modules/wodx-otherworlds/scripts/journey-rules.mjs");
const CR = await load("modules/wodx-creation/scripts/rules.mjs");
const TR = await load("modules/wodx-targeting/scripts/target-rules.mjs");

function sources(mod) {
  const dir = join(root, "modules", mod, "scripts");
  return existsSync(dir) ? readdirSync(dir).filter(f => /\.m?js$/.test(f)).map(f => readFileSync(join(dir, f), "utf8")).join("\n") : "";
}

test("every setting a level sets is registered by its module", () => {
  for ( const p of AR.TOUCHED ) {
    const src = sources(p.mod);
    const found = p.key.startsWith("rule.")
      ? readFileSync(join(root, "modules", p.mod, "data/house-rules.mjs"), "utf8").includes(p.key.slice(5))
      : new RegExp(`(register\\(\\s*(MOD|MODULE_ID|D\\.MOD),\\s*|\\bs\\()"${p.key}"`).test(src);
    assert.ok(found, `${p.mod}.${p.key} is not registered`);
  }
});

test("Hands off covers everything the Lone Chronicle switch sets, at the same values", () => {
  const off = new Map(AR.SETTINGS.handsOff.map(p => [`${p.mod}.${p.key}`, p.to]));
  for ( const p of SOLO.PRESET ) assert.equal(off.get(`${p.mod}.${p.key}`), p.to, `${p.mod}.${p.key}`);
  assert.ok(AR.SETTINGS.handsOff.length > AR.SETTINGS.balanced.length);
  assert.deepEqual(AR.SETTINGS.handsOn, []);
});

test("every kind in the queue table is a kind some module proposes", () => {
  const all = ["wodx-chronicle", "wodx-actions", "wodx-interactables", "wodx-npc", "wodx-creation", "wodx-storyteller", "wodx-otherworlds"].map(sources).join("\n");
  for ( const k of Object.keys(AR.QUEUE) ) {
    const tail = k.includes(".") ? k.split(".").slice(1).join(".") : k;
    assert.ok(all.includes(`"${k}"`) || all.includes(`.${tail}\``) || all.includes(`${tail}: \`\${MOD}.${tail}\``) || all.includes(`"${tail}"`) || new RegExp(`\\.${tail}[\`"]`).test(all), `${k} is not proposed anywhere`);
  }
  assert.ok(!("request" in AR.QUEUE));
});

test("a first move away from Hands on keeps the old values, and Hands on puts them back", () => {
  const world = {"wodx-npc.mode": "suggest", "wodx-npc.routineMode": "suggest", "wodx-combat.turnConductor": "off", "wodx-combat.fightEnd": "suggest"};
  const read = (m, k) => world[`${m}.${k}`];
  const none = AR.planLevel("handsOn", read, {});
  assert.deepEqual(none.changes, []); assert.deepEqual(none.base, {});

  const bal = AR.planLevel("balanced", read, {types: ["xp-spend", "era-change", "request", "wodx-storyteller.night"], autoNow: {"era-change": true}});
  assert.deepEqual(bal.changes.map(c => `${c.key}=${c.to}`).sort(), ["fightEnd=auto", "mode=auto", "routineMode=auto"]);
  assert.ok(bal.missing.some(m => m.key === "factionMode"), "a setting that is not there is named, not set");
  assert.equal(bal.auto["xp-spend"], "small");
  assert.equal(bal.auto["wodx-storyteller.night"], true);
  assert.equal(bal.auto["era-change"], true, "a standing rule set by hand stays");
  assert.ok(!("request" in bal.auto));
  for ( const c of bal.changes ) world[`${c.mod}.${c.key}`] = c.to;

  const off = AR.planLevel("handsOff", read, {base: bal.base, types: ["xp-spend", "request"], autoNow: bal.auto});
  assert.ok(off.changes.some(c => c.key === "turnConductor" && c.to === "everyone"));
  assert.equal(off.auto["xp-spend"], true);
  for ( const c of off.changes ) world[`${c.mod}.${c.key}`] = c.to;

  world["wodx-npc.routineMode"] = "off"; // changed by hand while at Hands off
  const back = AR.planLevel("handsOn", read, {base: off.base, autoNow: off.auto});
  assert.deepEqual(Object.fromEntries(back.changes.map(c => [c.key, c.to])), {mode: "suggest", fightEnd: "suggest", turnConductor: "off"});
  assert.deepEqual(back.kept.map(k => k.key), ["routineMode"]);
  assert.deepEqual(back.base, {});
  assert.deepEqual(back.auto, {"era-change": true});
});

test("queue rules: Hands off lets all but a player's request through; the differences are counted", () => {
  const r = AR.queueRules("handsOff", ["a.b", "request", {type: "c.d"}]);
  assert.equal(r["a.b"], true); assert.equal(r["c.d"], true); assert.ok(!("request" in r));
  assert.deepEqual(AR.queueDiff({x: true, y: "small"}, {x: "small", z: true}), {on: ["z"], small: ["x"], off: ["y"]});
});

test("a small standing rule approves only what its kind calls small", () => {
  assert.equal(QR.routeProposal("k", {auto: {k: "small"}, small: true}), "auto");
  assert.equal(QR.routeProposal("k", {auto: {k: "small"}, small: false}), "queue");
  assert.equal(QR.routeProposal("request", {auto: {request: "small"}, small: true}), "queue");
  assert.equal(QR.routeProposal("k", {auto: {k: "small"}, small: true, lightTouch: true}), "hold");
  assert.deepEqual(QR.cleanAuto({a: true, b: "small", c: "yes", request: true}), {a: true, b: "small"});
});

test("the tray's choice is the seat's choice, and never a way back", () => {
  const b = WR.buttonsOf(`<button>Undo</button><button>Accept</button><a data-action="x">Edit</a>`);
  assert.equal(WR.pickButton(b).label, "Accept");
  assert.equal(WR.pickButton(WR.buttonsOf(`<button>Undo</button><button>Reject</button>`)), null);
  assert.equal(SOLO.pickButton, WR.pickButton, "WoDX Solo uses the Chronicle's copy");
});

test("fights end when one side has nobody standing for a full turn", () => {
  assert.equal(FE.fightOver([{pc: true}, {hostile: true, defeated: true}]).winner, "pcs");
  assert.equal(FE.fightOver([{pc: true, defeated: true}, {hostile: true}]).winner, "foes");
  assert.equal(FE.fightOver([{pc: true}, {hostile: true, present: false}]).over, true, "a foe that left the scene is gone");
  assert.equal(FE.fightOver([{pc: true}, {hostile: true, hidden: true}]).over, false, "a hidden ambusher is still there");
  assert.equal(FE.fightOver([{pc: true}, {pc: true, defeated: true}]).over, false, "one side only never counts");
  assert.equal(FE.fightOver([{friendly: true}, {neutral: true}]).over, false);
  let s = FE.step(null, true, {round: 2, turn: 1});
  assert.deepEqual(s, {watch: {round: 2, turn: 1}, end: false});
  assert.equal(FE.step(s.watch, true, {round: 2, turn: 3}).end, false);
  assert.equal(FE.step(s.watch, true, {round: 3, turn: 0}).end, false);
  assert.equal(FE.step(s.watch, true, {round: 3, turn: 1}).end, true);
  assert.deepEqual(FE.step(s.watch, false, {round: 3, turn: 1}), {watch: null, end: false});
});

test("small rules for time, downtime, journeys and XP spends", () => {
  assert.equal(SR.smallSpan(8 * 3600), true);
  assert.equal(SR.smallSpan(30 * 3600), false);
  assert.equal(SR.smallSpan(3600, {inFight: true}), false);
  const kinds = Object.keys(K.DOWNTIME_KINDS).filter(k => k !== "other");
  assert.equal(K.smallDowntime({kind: kinds[0], nights: 3, what: "works the forge"}), true);
  assert.equal(K.smallDowntime({kind: "other", nights: 1, what: "x"}), false);
  assert.equal(K.smallDowntime({kind: kinds[0], nights: 14, what: "x"}), false);
  assert.equal(J.smallJourney({legs: [{landmark: "a"}]}), true);
  assert.equal(J.smallJourney({legs: [{landmark: "a", hazard: "teeth"}]}), false);
  assert.equal(J.smallJourney({storm: true, legs: [{}]}), false);
  assert.equal(CR.byTheBook({ok: true, kind: "attribute", cost: 8}, 8), true);
  assert.equal(CR.byTheBook({ok: true, kind: "attribute", cost: 8}, 6), false, "the sheet changed since");
  assert.equal(CR.byTheBook({ok: true, kind: "discipline", discipline: "clan", cost: 10}), true);
  assert.equal(CR.byTheBook({ok: true, kind: "discipline", discipline: "other", cost: 14}), false);
  assert.equal(CR.byTheBook({ok: true, kind: "newDiscipline", cost: 10}), false);
  assert.equal(CR.byTheBook({ok: true, kind: "road", cost: 4}), false);
  assert.equal(CR.byTheBook({ok: false, kind: "ability", cost: 2}), false);
});

test("letting time pass: everyone here agrees, one no ends it", () => {
  assert.equal(SR.voteState({needed: ["a", "b"], agreed: ["a"]}), "wait");
  assert.equal(SR.voteState({needed: ["a", "b"], agreed: ["b", "a"]}), "pass");
  assert.equal(SR.voteState({needed: ["a"], agreed: ["a"], refused: ["b"]}), "refused");
  assert.ok(Object.values(SR.PASS_CHOICES).every(c => SR.smallSpan(c.seconds)));
});

test("only a fight on the characters' own scene holds time back", () => {
  const where = [{id: "a", scene: "s1"}, {id: "b", scene: "s2"}];
  assert.equal(SR.fightHolds([{started: true, scene: "s9", actorIds: ["a"]}], where), false, "a fight left on another scene");
  assert.equal(SR.fightHolds([{started: true, scene: "s1", actorIds: ["a"]}], where), true);
  assert.equal(SR.fightHolds([{started: false, scene: "s1", actorIds: ["a"]}], where), false, "not started");
  assert.equal(SR.fightHolds([{started: true, scene: "s2", actorIds: ["b"]}], where, ["a"]), false, "someone else's fight");
});

test("letting time pass asks the party on the asker's scene", () => {
  const where = [{id: "a", scene: "s1"}, {id: "b", scene: "s2"}, {id: "c", scene: "s1"}];
  assert.deepEqual(SR.partyAt(where, "s1").map(p => p.id), ["a", "c"]);
  assert.deepEqual(SR.partyAt(where, null).map(p => p.id), ["a", "b", "c"]);
  assert.equal(SR.fightHolds([{started: true, scene: "s2", actorIds: ["b"]}], where, SR.partyAt(where, "s1").map(p => p.id)), false, "a fight on another scene");
});

test("targeting: Automatic for everyone reaches players", () => {
  assert.equal(TR.modeFor("everyone", {isGM: false}), "auto");
  assert.equal(TR.modeFor("auto", {isGM: false}), "suggest");
});

test("wiring: handlers carry their small rules, and the tray and levels are reachable", () => {
  const has = (mod, re) => assert.match(sources(mod), re);
  has("wodx-npc", /label: "NPC attitude",\s*\/\/[^\n]*\n\s*small:/);
  has("wodx-npc", /label: "Factions",\s*\/\/[^\n]*\n\s*small:/);
  has("wodx-creation", /small: entry => \{ const a = game\.actors\.get/);
  has("wodx-storyteller", /T_TIME, \{label: "Time for a long action",\s*small:/);
  has("wodx-storyteller", /type === "req\.passVote"/);
  has("wodx-chronicle", /tokens\.tools\.wodxWaiting/);
  has("wodx-chronicle", /automation: \{level: automation\.level/);
  has("wodx-combat", /FEnd\.installFightEnd\(\)/);
  has("wodx-npc", /"talkAskWait"/);
});
