import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Day jobs for a character's mortal agents (WoDX NPC, B3590-B3596) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const J = await imp("modules/wodx-npc/scripts/day-jobs-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/faction-rules.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");

test("the powers a job works through follow the age, and every one touches a sphere that age has", () => {
  for ( const y of [1197, 1350, 1600, 1750, 1880, 1960, 2010, 2080] ) {
    const sp = F.spheresFor(null, y), ch = J.channelsFor(y, "western", sp);
    assert.ok(ch.length >= 4, `powers in ${y}`);
    for ( const c of ch ) assert.ok(c.sphere in sp, `${c.key} in ${y} touches ${c.sphere}`);
  }
  const med = J.channelsFor(1300, "western", F.spheresFor(null, 1300)).map(c => c.key);
  assert.ok(med.includes("guild") && med.includes("church") && med.includes("lords") && med.includes("mercenaries"));
  assert.ok(!med.includes("police") && !med.includes("corporations"));
  const mod = J.channelsFor(2000, "western", F.spheresFor(null, 2000)).map(c => c.key);
  assert.ok(mod.includes("police") && mod.includes("media") && mod.includes("banks") && mod.includes("technology") && mod.includes("corporations"));
  assert.ok(!mod.includes("guild") && !mod.includes("mercenaries"));
});

test("the powers take their local names worldwide", () => {
  const cairo = J.channelsFor(1300, "islamic", F.spheresFor(null, 1300));
  assert.equal(cairo.find(c => c.key === "church").label, "The mosques, the waqfs and the qadi's court");
  assert.equal(J.channelsFor(1600, "chinese", F.spheresFor(null, 1600)).find(c => c.key === "lords").label, "The magistrate's yamen and its clerks");
  assert.equal(J.channelsFor(1300, "western").find(c => c.key === "church").label, "The Church");
});

test("a job becomes a long task the Storyteller's clock keeps", () => {
  const t = J.jobTask("sabotage", {agent: {kind: "retainer", sheet: {larceny: {value: 2}}}, place: "The Mill", channel: {key: "industry", label: "The mills, mines and factories"}, masterName: "Anna"});
  assert.equal(t.attr, "dexterity"); assert.equal(t.ability, "larceny"); assert.equal(t.errand, "job:sabotage");
  assert.match(t.name, /^For Anna: sabotage the works at The Mill, through the mills/);
  const n = T.normTask({...t, id: "x"});
  assert.equal(n.errand, "job:sabotage", "the long task keeps the job's key");
  assert.equal(n.place, "The Mill");
  assert.equal(J.jobOfTask(n), "sabotage");
  const inf = J.jobTask("scrub", {agent: {kind: "influence", dots: 3}});
  assert.equal(inf.attr, "manipulation"); assert.equal(inf.ability, ""); assert.equal(inf.dice, 3, "Influence stands in for the Ability (V20 p. 115)");
  assert.equal(J.jobTask("debt", {agent: {kind: "contact"}, cost: 50}).cost, 50);
  assert.equal(J.jobTask("watch", {agent: {kind: "contact"}, cost: 50}).cost, 0, "only buying a debt costs money");
  assert.equal(J.jobTask("nothing"), null);
});

test("the faction holding the sphere reacts when a job ends", () => {
  const fs = [{id: "a", name: "The Weavers", members: [], owners: [], assets: {influence: {guild: 3}}},
    {id: "b", name: "Mine", members: ["pc"], owners: [], assets: {influence: {guild: 5}}},
    {id: "c", name: "The Bishop", members: [], owners: [], assets: {influence: {church: 2}}}];
  assert.equal(J.targetFaction(fs, {sphere: "guild", masterId: "pc"}).id, "a", "never the master's own");
  assert.equal(J.targetFaction(fs, {sphere: "guild", picked: "c", masterId: "pc"}).id, "c", "the one the player named");
  assert.equal(J.targetFaction(fs, {sphere: "police", masterId: "pc"}), null);
  const done = J.reaction("sabotage", "done", fs[0], {sphereName: "Guilds and trade"});
  assert.ok(done.lose); assert.match(done.text, /Weavers loses ground/);
  assert.ok(!J.reaction("watch", "done", fs[0]).lose, "watching costs no one");
  const ruined = J.reaction("stir", "ruined", fs[0]);
  assert.equal(ruined.standing, -1);
  assert.ok(J.reaction("hide", "ruined", null).breach, "a body found is a breach");
  assert.match(J.resultText("debt", "done"), /holds the debt/);
});

test("the Day jobs window is wired to the Followers window and the clock", () => {
  const main = src("modules/wodx-npc/scripts/main.mjs"), fw = src("modules/wodx-npc/scripts/followers.mjs"), dj = src("modules/wodx-npc/scripts/day-jobs.mjs");
  assert.match(main, /openDayJobs: dayJobs\.openDayJobs/);
  assert.match(fw, /data-dayjobs/);
  assert.match(dj, /Hooks\.on\("wodxTaskDone"/);
  assert.match(dj, /type: "dayjob"/);
  for ( const n of ["agent", "job", "channel"] ) assert.match(dj, new RegExp(`name="${n}" data-fixed`));
  assert.match(dj, /searchBox\("select\[name=sceneId\]"/);
});
