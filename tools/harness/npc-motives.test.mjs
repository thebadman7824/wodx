import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC: NPC Motives Desk, what comes after an NPC's first reaction (B5680-B5709).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const F = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/follow-rules.mjs")));
const R = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/routine-rules.mjs")));

const guard = {template: "guard", aggression: 1, caution: 1, cunning: 0.5, loyalty: 1.2, cowardice: 0.3, tactics: ["melee", "call", "guard"], fears: []};
const clerk = {template: "bystander", aggression: 0.2, caution: 1.2, cunning: 0.5, loyalty: 0.5, cowardice: 1.4, tactics: ["flee", "call"], fears: ["supernatural", "violence"]};

test("m1: an unanswered challenge goes further, by who gave it", () => {
  const sit = {trespass: true, alliesNear: 1};
  const g = F.escalate(R.pickReaction(guard, sit), guard);
  assert.ok(!g.some(o => o.action === "challenge"), "no second challenge");
  assert.ok(["alarm", "fight"].includes(g[0].action), `a guard raises the alarm or fights, got ${g[0].action}`);
  assert.match(g[0].why, /did not/);
  const c = F.escalate(R.pickReaction(clerk, sit), clerk);
  assert.ok(["send", "flee", "alarm"].includes(c[0].action), `the timid send, run or shout, got ${c[0].action}`);
  assert.equal(c.find(o => o.action === "ignore")?.score ?? 0, 0, "letting it pass is no longer the easy way");
});

test("m1: a challenge is due after ten minutes, kept for an hour, acted on once", () => {
  const c = {at: 1000};
  assert.equal(F.challengeDue(c, 1000 + 599), false);
  assert.equal(F.challengeDue(c, 1000 + 600), true);
  assert.equal(F.challengeDue({...c, acted: true}, 1000 + 700), false);
  assert.equal(F.challengeFresh(c, 1000 + 3599), true);
  assert.equal(F.challengeFresh(c, 1000 + 3600), false);
});

test("m2: the bold come to an alarm, the timid and the frightened go", () => {
  assert.equal(F.hearAlarm(guard), "come");
  assert.equal(F.hearAlarm(clerk), "go");
  assert.equal(F.hearAlarm({...guard, fears: ["supernatural"]}, {supernatural: true}), "go", "even a guard runs from what it fears");
  assert.equal(F.hearAlarm({aggression: 0.7, cowardice: 0.5}), "stay");
  assert.equal(F.hearAlarm({animal: true, aggression: 2}), "stay");
});

test("m4 and m5: the word is lost if the informer is stopped; the timid who run tell someone", () => {
  assert.equal(F.reportArrives({}, {}), true);
  assert.equal(F.reportArrives({}, {down: true}), false);
  assert.equal(F.reportArrives({}, {held: true}), false);
  assert.equal(F.tellsAfterFleeing({tactics: ["report"], aggression: 1}), true);
  assert.equal(F.tellsAfterFleeing({group: "townsfolk", aggression: 1}), true);
  assert.equal(F.tellsAfterFleeing({aggression: 1.2}), false);
  assert.equal(F.tellsAfterFleeing({animal: true, aggression: 0.1}), false);
});

test("c1: hostages of one fight are found from the takers' flags", () => {
  const toks = [{id: "a", hostage: {token: "h1", combat: "c1"}}, {id: "b", hostage: {token: "h2", combat: "c2"}}, {id: "c"}];
  assert.deepEqual(F.hostagesOf(toks, "c1"), [{taker: "a", hostage: "h1"}]);
  assert.equal(F.hostagesOf(toks, null).length, 2);
});

test("r3: a beat goes round the places and back to the post", () => {
  const ps = ["post", "gate", "market"];
  assert.equal(F.nextBeat(ps, "post", "post"), "gate");
  assert.equal(F.nextBeat(ps, "post", "gate"), "market");
  assert.equal(F.nextBeat(ps, "post", "market"), "post");
  assert.equal(F.nextBeat(ps, "post", null, 0), "post");
  assert.equal(F.nextBeat(["post"], "post", "post"), null, "nowhere else to go");
  assert.equal(F.beatDue(null, 10), true);
  assert.equal(F.beatDue(0, F.BEAT_SECONDS - 1), false);
});

test("routines: the reactions follow through on the map", () => {
  const s = src("modules/wodx-npc/scripts/routines.mjs");
  assert.match(s, /recordChallenge\(canvas\.scene, data\.region, i\.id/, "a challenge is recorded");
  assert.match(s, /checkChallenges\(canvas\.scene/, "and checked when the clock moves");
  assert.match(s, /FW\.hearAlarm\(profileFor\(h\.actor\)/, "hearers of an alarm move");
  assert.match(s, /goTo\(d\.object, i, null\)/, "help walks to the intruder");
  assert.match(s, /watchHouseHere\(\)/, "an informer walks off");
  assert.match(s, /FW\.reportArrives/, "a stopped informer's word is lost");
  assert.match(s, /releaseHostages\(combat\)/, "hostages are let go when the fight ends");
  assert.match(s, /walkBeats\(scene, t\)/, "the watch walks its beat");
});
