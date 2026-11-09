import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-chronicle/scripts/migrations-rules.mjs"));

const step = name => ({name, run: async () => {}});

test("plan: a world never stamped is stamped at the code's versions, nothing runs", () => {
  const reg = {"wodx-npc": {steps: {2: step("a"), 3: step("b")}}};
  const p = R.planMigrations(reg, null, ["wodx-npc", "wodx-combat"]);
  assert.deepEqual(p.stamp, {"wodx-npc": 3, "wodx-combat": 1});
  assert.deepEqual(p.pending, []);
});

test("plan: steps from the stored version up, in order; a module turned on later is stamped", () => {
  const reg = {"wodx-npc": {steps: {2: step("a"), 3: step("b")}}};
  const p = R.planMigrations(reg, {"wodx-npc": 1}, ["wodx-npc", "wodx-sheets"]);
  assert.deepEqual(p.stamp, {"wodx-sheets": 1});
  assert.equal(p.pending.length, 1);
  assert.deepEqual(p.pending[0].steps.map(s => s.version), [2, 3]);
  assert.deepEqual(R.planMigrations(reg, {"wodx-npc": 3}, ["wodx-npc"]).pending, []);
});

test("plan: data newer than the code, or a missing step, is a problem and runs nothing for that module", () => {
  const reg = {"wodx-npc": {steps: {3: step("b")}}};
  const p = R.planMigrations(reg, {"wodx-npc": 1, "wodx-combat": 4}, ["wodx-npc", "wodx-combat"]);
  assert.equal(p.pending.length, 0);
  assert.equal(p.problems.length, 2);
  assert.match(p.problems.join(" "), /no step to bring its data from 1 to 2/);
  assert.match(p.problems.join(" "), /newer than the module's 1/);
});

test("carriesFlags looks into embedded documents", () => {
  assert.equal(R.carriesFlags({flags: {"wodx-npc": {a: 1}}}, "wodx-npc"), true);
  assert.equal(R.carriesFlags({flags: {"wodx-npc": {}}}, "wodx-npc"), false);
  assert.equal(R.carriesFlags({flags: {}, items: [{flags: {"wodx-npc": {x: 1}}}]}, "wodx-npc"), true);
  assert.equal(R.carriesFlags({flags: {}, tokens: [{flags: {other: {x: 1}}}]}, "wodx-npc"), false);
  assert.match(R.backupName("w", "wodx-npc", 2, new Date("2026-11-09T01:02:03Z")), /^w-wodx-npc-v2-2026-11-09T01-02-03-000Z\.json$/);
});

/* Runtime */
const mock = installMock({dataRoot: root});
const uploads = [];
foundry.applications.apps = {FilePicker: {implementation: {
  async createDirectory(source, dir) { if ( uploads.some(u => u.dir === dir) ) throw new Error("EEXIST: The directory already exists"); uploads.push({dir}); },
  async upload(source, dir, file) { uploads.push({dir, name: file.name, text: await file.text()}); return {status: "success", path: `${dir}/${file.name}`}; }
}}};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const M = "wodx-chronicle";
for ( const id of ["wodx-chronicle", "wodx-npc", "wodx-combat"] ) game.modules.set(id, {...(game.modules.get(id) ?? {}), id, active: true, title: id});
game.version = "14.369";
// The stand-in's documents have no toObject; Foundry's do
for ( const C of [Actor, JournalEntry, Folder] ) C.prototype.toObject = function() { return structuredClone({name: this.name, flags: this.flags}); };

test("first load stamps every WoDX module; nothing is backed up or changed", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.deepEqual(game.settings.get(M, "dataVersions"), {"wodx-chronicle": 1, "wodx-npc": 1, "wodx-combat": 1});
  assert.equal(uploads.filter(u => u.name).length, 0);
  assert.ok(!mock.log.chat.some(c => /WoDX data updated/.test(c.content)));
});

test("a new step: backup first, then the step, then the version; one card for the Storyteller", async () => {
  const api = game.modules.get(M).api;
  const npc = await Actor.create({name: "Konrad", type: "Mortal"});
  npc.flags["wodx-npc"] = {routine: "old"};
  const other = await Actor.create({name: "Plain", type: "Mortal"});
  const order = [];
  const hook = reg => reg.register("wodx-npc", {steps: {2: {name: "routine by id", run: async ctx => {
    order.push(uploads.filter(u => u.name).length ? "after backup" : "before backup");
    for ( const a of ctx.actors() ) if ( ctx.flag(a, "routine") === "old" ) a.flags["wodx-npc"].routine = "new";
  }}}});
  Hooks.on("wodxRegisterMigrations", hook);
  const r = await api.migrations.run();
  assert.deepEqual(order, ["after backup"]);
  assert.equal(npc.flags["wodx-npc"].routine, "new");
  assert.equal(game.settings.get(M, "dataVersions")["wodx-npc"], 2);
  const file = uploads.find(u => u.name);
  assert.equal(file.dir, "wodx-backups/migrations");
  const data = JSON.parse(file.text);
  assert.equal(data.module, "wodx-npc");
  assert.equal(data.dataVersion, 1);
  assert.deepEqual(data.documents.actors.map(a => a.name), ["Konrad"], "only documents carrying the module's flags");
  assert.equal(data.documents.actors[0].flags["wodx-npc"].routine, "old", "the backup holds the data before the step");
  const card = mock.log.chat.find(c => /WoDX data updated/.test(c.content));
  assert.match(card.content, /version 1 to 2/);
  assert.deepEqual(card.whisper, ["gm"]);
  assert.equal(r.done.length, 1);
  assert.equal(game.settings.get(M, "migrationLog").at(-1).to, 2);
  // Run again: nothing to do
  const again = await api.migrations.run();
  assert.equal(again.done.length, 0);
});

test("a failing step stops that module where it is and says where the backup is", async () => {
  const api = game.modules.get(M).api;
  Hooks.on("wodxRegisterMigrations", reg => reg.register("wodx-combat", {steps: {
    2: {name: "fine", run: async () => {}},
    3: {name: "broken", run: async () => { throw new Error("bad data on Wilhelm"); }}
  }}));
  const r = await api.migrations.run();
  assert.equal(r.failed.length, 1);
  assert.equal(game.settings.get(M, "dataVersions")["wodx-combat"], 2, "the step that worked counts; the failed one does not");
  const card = mock.log.chat.filter(c => /WoDX data updated/.test(c.content)).at(-1);
  assert.match(card.content, /stopped at version 2, bad data on Wilhelm/);
  assert.match(card.content, /wodx-backups\/migrations\/.*wodx-combat-v1/);
  assert.ok(mock.log.notifications.some(([kind, m]) => kind === "error" && /did not finish/.test(m)));
  assert.deepEqual(api.migrations.status().find(s => s.module === "wodx-combat"), {module: "wodx-combat", data: 2, code: 3});
});
