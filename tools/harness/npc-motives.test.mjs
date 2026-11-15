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

// Part two: r1, r2, g1, g2 (B5687, B5688, B5690, B5691)
const HN = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/hunt-npc-rules.mjs")));
const PW = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/prowl-rules.mjs")));
const GR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/grudge-rules.mjs")));
const VR = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/venture-rules.mjs")));

test("r1: who feeds, when the hunt ends, and what a meal puts back", () => {
  assert.equal(HN.feedsOn({type: "Vampire", bloodMax: 10}), "blood");
  assert.equal(HN.feedsOn({type: "Mortal", yangMax: 4}), "chi", "a Kuei-jin takes Chi");
  assert.equal(HN.feedsOn({type: "Mortal"}), null);
  assert.equal(HN.huntEnded({activity: "hunt", place: "p"}, {activity: "rest"}), true);
  assert.equal(HN.huntEnded({activity: "hunt", place: "p"}, {activity: "hunt"}), false);
  assert.equal(HN.huntEnded({activity: "rest", place: "p"}, {activity: "sleep"}), false);
  assert.equal(HN.huntHours(0, 3 * 3600), 3);
  assert.equal(HN.huntHours(0, 20 * 3600), 8, "the window's own cap");
  assert.deepEqual(HN.meal({now: 4, max: 10}, 7), {taken: 6, after: 10}, "never past the top");
  assert.deepEqual(HN.meal({now: 2, max: 10}, 3), {taken: 3, after: 5}, "one die's worth");
  assert.equal(HN.bestMethod({"wits+streetwise": 3, "appearance+subterfuge": 6}), "appearance+subterfuge");
  assert.equal(HN.bestMethod({}), "wits+streetwise");
});

test("r1: hunger makes an NPC bolder until it feeds; prey on the map is led aside", () => {
  const p = HN.withHunger({aggression: 1, hunger: 0}, true);
  assert.equal(p.aggression, 1.5); assert.equal(p.hunger, 1); assert.equal(p.frenzyProne, true);
  assert.equal(HN.withHunger({aggression: 1}, false).aggression, 1);
  assert.equal(HN.isHungry({since: 0}, HN.HUNGRY_KEEP - 1), true);
  assert.equal(HN.isHungry({since: 0}, HN.HUNGRY_KEEP), false);
  assert.equal(HN.preyOnMap([{id: "pc", player: true, mortal: true, alone: true}, {id: "pb", passerby: true}]), "pb", "a passer-by first, never a player");
  assert.equal(HN.preyOnMap([{id: "a", mortal: true, alone: false}, {id: "b", mortal: true, alone: true}]), "b", "a lone townsperson");
  assert.equal(HN.preyOnMap([{id: "rat", passerby: true, animal: true}], "chi"), null, "a Kuei-jin does not feed on a rat");
  assert.match(HN.botchTale("Mira"), /Mira/);
});

test("r2: a prowler picks a lone mark it can handle, at its own hours", () => {
  assert.equal(PW.prowling("footpad", "hunt", true), true);
  assert.equal(PW.prowling("footpad", "hunt", false), false, "footpads wait for the dark");
  assert.equal(PW.prowling("bandit", "hunt", true), false, "bandits work the road by day");
  assert.equal(PW.prowling("highwayman", "hunt", false), true);
  assert.equal(PW.prowling("footpad", "rest", true), false);
  assert.equal(PW.pickMark([{id: "far", player: true, yards: 40, side: 1}, {id: "near", player: true, yards: 8, side: 1}], 0), "near");
  assert.equal(PW.pickMark([{id: "a", player: true, yards: 8, side: 2}]), null, "not someone with company");
  assert.equal(PW.pickMark([{id: "a", player: true, yards: 8, side: 1, guards: 1}]), null, "not with an armed guard near");
  assert.equal(PW.pickMark([{id: "a", player: true, yards: 8, side: 1, tried: 100}], 200), null, "not the same mark twice in a night");
  assert.equal(PW.outmatched({side: 3}), true);
  assert.equal(PW.demandOf(9), 4); assert.equal(PW.demandOf(0), 0);
  assert.equal(PW.talkRoll({manipulation: 3, intimidation: 2, charisma: 2, persuasion: 1}, {aggression: 1.2}).difficulty, 7);
  assert.deepEqual([PW.after("pay").go, PW.after("talk", {talked: false}).fight, PW.after("fight").fight], [true, true, true]);
});

test("g1: each grudge move has its own result", () => {
  assert.equal(GR.boonDue(0), 7 * 86400);
  assert.equal(GR.pickLever([{key: "denounce"}, {key: "rumour"}]), "rumour", "the gentlest lever the seat opens");
  assert.equal(GR.pickLever([{key: "prices"}]), null);
  assert.equal(GR.harmNow({night: true, found: true}), true);
  assert.equal(GR.harmNow({night: false, found: true}), false, "harm comes at night");
  assert.equal(GR.harmLapsed({at: 0}, GR.HARM_WAIT), true);
  const st = VR.normState({list: [{id: "v1", actor: "pc", value: 100, put: 100, state: "open", kind: "house", market: "m"}, {id: "v2", actor: "pc", value: 300, put: 300, state: "open", kind: "house", market: "m"}]});
  assert.deepEqual(VR.touched(st, "spoiled", {actor: "pc"}).map(v => v.id), ["v2"], "the largest venture is spoiled");
  assert.ok(VR.hit(st.list[1], "spoiled").lost > 0);
});

test("g2: one who knows a wanted culprit acts by kind", () => {
  assert.equal(GR.knowsAct({keeper: true}), "challenge");
  assert.equal(GR.knowsAct({criminal: true}), "hold");
  assert.equal(GR.knowsAct({servant: true, keeper: true}), "silent");
  assert.equal(GR.knowsAct({}), "tell");
});

test("part two is wired to the world", () => {
  const r = src("modules/wodx-npc/scripts/routines.mjs"), m = src("modules/wodx-npc/scripts/memory.mjs"), w = src("modules/wodx-npc/scripts/wanted.mjs");
  assert.match(r, /HN\.huntEnded\(w, r\.block\)/, "a hunt is resolved when its block ends");
  assert.match(r, /F\.hunt\(actor, w\.place/, "the books' hunting roll");
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /HN\.withHunger/, "hunger reaches the profile");
  assert.match(src("modules/wodx-npc/scripts/prowl.mjs"), /fight\?\.start/, "a refused robbery is a fight");
  for ( const k of ["boon", "seat", "venture", "kin", "violence"] ) assert.match(m, new RegExp(`case "${k}"`), `the ${k} move acts`);
  assert.match(w, /knowAndAct\(/, "recognition acts");
});
