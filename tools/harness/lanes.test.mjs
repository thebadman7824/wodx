import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

/* Testbed lanes: drift fingerprint, lane locks and lane picking, with no Foundry */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(pathToFileURL(path.join(root, "tools/lanes/lib.mjs")));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "wodx-lanes-"));
const put = (base, rel, text) => { fs.mkdirSync(path.dirname(path.join(base, rel)), {recursive: true}); fs.writeFileSync(path.join(base, rel), text); };

function fakeRepo() {
  const r = tmp();
  put(r, "modules/wodx-a/module.json", JSON.stringify({id: "wodx-a", version: "1.2.0"}));
  put(r, "modules/wodx-a/scripts/a.mjs", "export const a = 1;");
  put(r, "system/worldofdarkness/system.json", JSON.stringify({id: "worldofdarkness", version: "7.3.2"}));
  put(r, "system/worldofdarkness/main.js", "x");
  return r;
}
function laneFrom(repo) {
  const d = tmp();
  fs.cpSync(path.join(repo, "modules"), path.join(d, "Data/modules"), {recursive: true});
  fs.cpSync(path.join(repo, "system"), path.join(d, "Data/systems"), {recursive: true});
  put(d, "Data/modules/lib-other/module.json", JSON.stringify({id: "lib-other", version: "3.0"}));
  return d;
}
const check = (repo, lane) => {
  const exp = L.expectedCode(repo);
  return L.diffCode(exp, L.codeFingerprint(lane, {only: new Set(Object.keys(exp))}));
};

test("lanes.json lists local lanes with distinct ports and folders, lane 1 not auto-reset", () => {
  const cfg = L.loadConfig(path.join(root, "tools/lanes/lanes.json"));
  assert.ok(cfg.lanes.length >= 3);
  assert.equal(new Set(cfg.lanes.map(l => l.port)).size, cfg.lanes.length);
  assert.equal(new Set(cfg.lanes.map(l => l.dataPath.toLowerCase())).size, cfg.lanes.length);
  assert.equal(L.getLane(cfg, 1).autoReset, false);
  assert.ok(!cfg.lanes.some(l => /rothenstein-live/i.test(JSON.stringify(l))), "no lane may point at the Live world");
  assert.equal(cfg.world, "rothenstein-wodx");
});

test("a lane deployed from the repo matches it; other modules are ignored", () => {
  const repo = fakeRepo();
  assert.deepEqual(check(repo, laneFrom(repo)), []);
});

test("changed, missing and extra files and a version bump are each named", () => {
  const repo = fakeRepo(), lane = laneFrom(repo);
  put(lane, "Data/modules/wodx-a/scripts/a.mjs", "export const a = 2;");
  put(lane, "Data/modules/wodx-a/scripts/stale.mjs", "old");
  fs.rmSync(path.join(lane, "Data/systems/worldofdarkness/main.js"));
  put(lane, "Data/systems/worldofdarkness/system.json", JSON.stringify({id: "worldofdarkness", version: "7.3.1"}));
  const d = check(repo, lane).map(x => `${x.where} | ${x.what}`);
  assert.ok(d.some(x => x.startsWith("module:wodx-a/scripts/a.mjs | differs")), d.join("\n"));
  assert.ok(d.some(x => x.startsWith("module:wodx-a/scripts/stale.mjs | extra")));
  assert.ok(d.some(x => x.startsWith("system:worldofdarkness/main.js | missing")));
  assert.ok(d.some(x => x.startsWith("system:worldofdarkness | version 7.3.1")));
});

test("a package missing from the lane is reported", () => {
  const repo = fakeRepo(), lane = laneFrom(repo);
  fs.rmSync(path.join(lane, "Data/modules/wodx-a"), {recursive: true});
  assert.deepEqual(check(repo, lane).map(x => x.where), ["module:wodx-a"]);
});

test("LevelDB LOCK and LOG files never count as drift", () => {
  const repo = fakeRepo(), lane = laneFrom(repo);
  put(lane, "Data/modules/wodx-a/packs/p/LOCK", "");
  put(lane, "Data/modules/wodx-a/packs/p/LOG", "busy");
  assert.deepEqual(check(repo, lane), []);
});

test("compendium LevelDB files are left out; other pack files still count", () => {
  const repo = fakeRepo(), lane = laneFrom(repo);
  for ( const f of ["CURRENT", "MANIFEST-000012", "000013.log", "000011.ldb"] ) put(lane, `Data/systems/worldofdarkness/packs/powers/${f}`, "compacted");
  assert.deepEqual(check(repo, lane), []);
  put(lane, "Data/systems/worldofdarkness/packs/readme.txt", "new");
  assert.deepEqual(check(repo, lane).map(x => x.where), ["system:worldofdarkness/packs/readme.txt"]);
  assert.equal(L.isPackDb("scripts/000001.log"), false, "a .log file outside packs still counts");
});

test("lanes.json ignores the settings that change on their own", () => {
  const cfg = L.loadConfig(path.join(root, "tools/lanes/lanes.json"));
  for ( const k of ["oh-you-dead.writerLease", "wodx-actions.sky", "wodx-atmosphere.applied", "wodx-actions.healClock", "wodx-actions.lastGmReady",
    // B7200: the effects modules' migration markers, the cause of every exit-4 lane reset on 16 and 17 November
    "fxmaster.parameterRangeMigrationVersion", "fxmaster.parameterRangePassiveMigrationVersion", "fxmaster.directionConventionPassiveMigrationVersion", "tokenmagic.migration"] ) assert.ok(cfg.ignoreSettings.includes(k), k);
});

test("the hash cache gives the same answer and sees edits", () => {
  const d = tmp(), cache = path.join(tmp(), "c.json");
  put(d, "f.txt", "one");
  const a = L.hashTree(d, cache), b = L.hashTree(d, cache);
  assert.deepEqual(a, b);
  put(d, "f.txt", "two!");
  assert.notEqual(L.hashTree(d, cache)["f.txt"], a["f.txt"]);
});

const raw = (over = {}) => ({world: "rothenstein-wodx", core: "14.369", system: {id: "worldofdarkness", version: "7.3.2"},
  modules: {"wodx-a": "1.2.0"}, settings: {"core.time": "100", "wodx-a.mode": "\"on\""}, docs: {actors: {count: 1, rows: ["a1:5"]}},
  worldTime: 100, paused: true, ...over});

test("an unchanged world shows no drift", () => {
  const f = L.worldFingerprint(raw());
  assert.deepEqual(L.diffWorld(f, L.worldFingerprint(raw())), {strict: [], warn: []});
});

test("settings, modules and the clock stop a run; documents only warn", () => {
  const clean = L.worldFingerprint(raw());
  const now = L.worldFingerprint(raw({worldTime: 400, modules: {"wodx-a": "1.2.0", "wodx-b": "0.1.0"},
    settings: {"core.time": "400", "wodx-a.mode": "\"off\"", "wodx-a.new": "1"}, docs: {actors: {count: 2, rows: ["a1:5", "a2:9"]}}}));
  const d = L.diffWorld(clean, now);
  const s = d.strict.map(x => x.where);
  assert.ok(s.includes("clock"));
  assert.ok(s.includes("module wodx-b"));
  assert.ok(s.includes("setting wodx-a.mode"));
  assert.ok(s.includes("setting wodx-a.new"));
  assert.ok(!s.includes("setting core.time"), "the clock is reported once, not again as a setting");
  assert.deepEqual(d.warn.map(x => x.where), ["actors"]);
});

test("ignored settings and version-free comparison", () => {
  const clean = L.worldFingerprint(raw(), ["wodx-a.*"]);
  const now = L.worldFingerprint(raw({settings: {"core.time": "100", "wodx-a.mode": "\"off\""}, modules: {"wodx-a": "1.3.0"}}), ["wodx-a.*"]);
  assert.deepEqual(L.diffWorld(clean, now, {versions: false}).strict, []);
  assert.equal(L.diffWorld(clean, now).strict.length, 1);
});

test("a server still running an old version is caught", () => {
  const exp = {"module:wodx-a": {version: "1.3.0"}, "system:worldofdarkness": {version: "7.3.2"}, "module:wodx-off": {version: "1"}};
  const d = L.diffRunning(exp, L.worldFingerprint(raw()));
  assert.deepEqual(d.map(x => x.where), ["module wodx-a"]);
});

test("locks: one holder at a time; a dead or old lock is stale", () => {
  const cfg = {lockMaxMinutes: 60};
  const lane = {id: 9, dataPath: tmp()};
  assert.ok(L.acquireLock(lane, cfg, {gates: ["g"]}));
  assert.equal(L.acquireLock(lane, cfg, {gates: ["h"]}), null, "a live lock blocks a second run");
  assert.equal(L.lockState(lane, cfg).held, true);
  assert.equal(L.lockState(lane, cfg, Date.now() + 61 * 60000).held, false);
  assert.equal(L.lockState(lane, cfg, Date.now(), () => false).stale, "its process has ended");
  L.releaseLock(lane);
  assert.equal(L.lockState(lane, cfg).held, false);
});

test("a gate run's lock has a deadline it moves on; past it the lane is free (B3089)", () => {
  const cfg = {lockMaxMinutes: 600};
  const lane = {id: 8, dataPath: tmp()};
  assert.ok(L.acquireLock(lane, cfg, {gates: ["g"], runner: "run-gate", until: new Date(Date.now() + 60000).toISOString()}));
  assert.equal(L.lockState(lane, cfg).held, true);
  const late = L.lockState(lane, cfg, Date.now() + 2 * 60000);
  assert.equal(late.held, false);
  assert.equal(late.overdue, true);
  L.extendLock(lane, Date.now() + 10 * 60000);
  assert.equal(L.lockState(lane, cfg, Date.now() + 2 * 60000).held, true, "a moved deadline holds the lane again");
  assert.equal(L.lockState(lane, {lockMaxMinutes: 1}, Date.now() + 2 * 60000).held, true, "a long run inside its deadline is not taken over");
  L.releaseLock(lane);
});

test("only a hung gate run that is still a node process is ended (B3089)", () => {
  const calls = [];
  const exec = (cmd, a) => { calls.push([cmd, ...a].join(" ")); return cmd === "tasklist" ? '"node.exe","4242","Console","1","50,000 K"\n' : ""; };
  assert.equal(L.endOverdue({runner: "run-gate", pid: 4242}, {platform: "win32", exec}), true);
  assert.ok(calls.some(c => c === "taskkill /PID 4242 /T /F"), "the process and its browser are ended together");
  calls.length = 0;
  const other = (cmd, a) => { calls.push(cmd); return '"msedge.exe","4242"\n'; };
  assert.equal(L.endOverdue({runner: "run-gate", pid: 4242}, {platform: "win32", exec: other}), false, "a reused process id is left alone");
  assert.ok(!calls.includes("taskkill"));
  assert.equal(L.endOverdue({pid: 4242, gates: ["lanes.mjs deploy"]}, {platform: "win32", exec}), false, "a deploy lock is never ended");
  assert.equal(L.endOverdue({pid: 4242, gates: ["gatefaces", "gateage"]}, {platform: "win32", exec}), true, "an older gate run's lock (no runner) is ended too");
});

test("run-gate has a gate limit, a window sweep, a whole-run watchdog and moves the lock deadline (B3089)", () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../lanes/run-gate.mjs"), "utf8");
  for ( const s of ["extendLock(lane", "clearInterval(sweep)", "bail(5,", "within(run, limit", "await closeBrowser()", 'runner: "run-gate"'] ) assert.ok(src.includes(s), s);
});

test("the picker takes the first lane that is up and free", async () => {
  const lanes = [{id: 1}, {id: 2}, {id: 3}, {id: 4, disabled: true}];
  const cfg = {lanes, lockMaxMinutes: 60};
  const pick = (up, busy, only) => L.pickLane(cfg, {only, up: l => up.includes(l.id), state: l => ({held: busy.includes(l.id)})});
  assert.equal((await pick([1, 2, 3], [])).id, 1);
  assert.equal((await pick([1, 2, 3], [1])).id, 2);
  assert.equal((await pick([1, 3], [1])).id, 3);
  assert.equal(await pick([1, 2, 3], [1, 2, 3]), null);
  assert.equal(await pick([4], []), null, "a disabled lane is never picked");
  assert.equal((await pick([1, 2, 3], [], ["3"])).id, 3);
  // B6527: a reserved lane is taken only when named
  lanes.push({id: 6, reserved: "local-agents"});
  assert.equal(await pick([6], []), null, "a reserved lane is not picked unasked");
  assert.equal((await pick([6], [], ["6"])).id, 6);
});

test("lane tools never name the Live world and keep backups", () => {
  for ( const f of ["lanes.mjs", "run-gate.mjs", "lib.mjs", "lane-reset.cmd"] ) {
    const src = fs.readFileSync(path.join(root, "tools/lanes", f), "utf8");
    assert.ok(!/rothenstein-live/.test(src), `${f} mentions the Live world`);
  }
  const m = fs.readFileSync(path.join(root, "tools/lanes/lanes.mjs"), "utf8");
  assert.match(m, /case "reset":[\s\S]*backup\(worldDir\(lane\)/, "reset backs the world up before copying");
  assert.match(m, /allow-lane-1/, "lane 1 reset needs an explicit flag");
});

test("B6775: sign-in waits for the WoDX apis that start after game.ready", async () => {
  const B = await import(pathToFileURL(path.join(root, "tools/lanes/browser.mjs")));
  assert.ok(B.LATE_APIS.includes("wodx-creation"), "creation is waited for");
  const mods = new Map([["wodx-chronicle", {active: true, api: {}}], ["wodx-creation", {active: true}], ["wodx-npc", {active: false}]]);
  const had = globalThis.game;
  globalThis.game = {modules: mods};
  try {
    assert.equal(B.apisReady(B.LATE_APIS), false, "creation without its api is not ready");
    mods.get("wodx-creation").api = {people: {}};
    assert.equal(B.apisReady(B.LATE_APIS), true, "an inactive module is not waited for");
  } finally { globalThis.game = had; }
  const src = fs.readFileSync(path.join(root, "tools/lanes/browser.mjs"), "utf8");
  assert.match(src, /waitForFunction\(apisReady, LATE_APIS/, "openGM waits for them");
});

test("lanes on the second PC are seen only there, with its own paths (B6880)", () => {
  const was = process.env.WODX_HOST;
  try {
    process.env.WODX_HOST = "desktop-s6nv3q9";
    const two = L.loadConfig();
    assert.deepEqual(two.lanes.map(l => l.id), [7]);
    assert.equal(two.foundryMain, "C:/WoDX/Foundry/resources/app/main.js");
    assert.ok(two.allLaneIds.includes("7") && two.allLaneIds.includes("2"));
    process.env.WODX_HOST = "benjamin-pc";
    const three = L.loadConfig();
    assert.deepEqual(three.lanes.map(l => l.id), [8], "the Secondary PC sees lane 8 only (B6990)");
    assert.equal(three.foundryMain, "D:/WoDX/Foundry/resources/app/main.js");
    assert.ok(three.allLaneIds.includes("8") && three.allLaneIds.includes("7"));
    process.env.WODX_HOST = "desktop-mrkcmrg";
    const main = L.loadConfig();
    assert.ok(!main.lanes.some(l => l.host));
    assert.deepEqual(main.lanes.map(l => l.id), [1, 2, 3, 4, 5, 6]);
    assert.match(main.foundryMain, /^G:/);
    process.env.WODX_HOST = "cloud";
    const cloud = L.loadConfig();
    assert.deepEqual(cloud.lanes.map(l => l.id), [9], "a cloud thread's box sees lane 9 only (B7240)");
    assert.ok(!cloud.lanes[0].dataPath.includes("%"), "the cloud lane's home folder is filled in");
    assert.match(cloud.foundryMain, /\/foundry\/app\/main\.mjs$/);
    assert.equal(cloud.lanes[0].url, "http://localhost:30090");
  } finally { if ( was === undefined ) delete process.env.WODX_HOST; else process.env.WODX_HOST = was; }
});

test("before each gate the runner looks for the WoDX apis again and names the missing ones (B6960)", async () => {
  const B = await import(pathToFileURL(path.join(root, "tools/lanes/browser.mjs")));
  const mods = new Map([["wodx-chronicle", {active: true, api: {}}], ["wodx-creation", {active: true}], ["wodx-npc", {active: false}]]);
  const was = globalThis.game;
  globalThis.game = {modules: {get: id => mods.get(id)}};
  try {
    assert.deepEqual(B.apisMissing(["wodx-chronicle", "wodx-creation", "wodx-npc"]), ["wodx-creation"], "an active module without its api; an inactive one is not waited for");
    const page = {waitForFunction: async (fn, ids) => { if ( !fn(ids) ) throw new Error("timeout"); }, evaluate: async (fn, ids) => fn(ids)};
    assert.deepEqual(await B.waitApis(page, ["wodx-creation"], 10), ["wodx-creation"]);
    mods.get("wodx-creation").api = {};
    assert.deepEqual(await B.waitApis(page, ["wodx-creation"], 10), []);
  } finally { globalThis.game = was; }
  const src = fs.readFileSync(path.join(root, "tools/lanes/run-gate.mjs"), "utf8");
  assert.ok(src.includes("await waitApis(page)") && src.includes("no api before this gate"), "run-gate waits before each gate and says so on the gate's line");
});

test("lane 7 on the Laptop takes only small named-gate jobs (B6887)", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "tools/lanes/lanes.json"), "utf8"));
  const seven = cfg.lanes.find(l => String(l.id) === "7"), two = cfg.lanes.find(l => String(l.id) === "2");
  assert.ok(seven.maxGates > 0, "lane 7 has a gate limit");
  assert.ok(L.laneRefuses(seven, {kind: "gates", touched: true, gates: []}), "touched run refused");
  assert.ok(L.laneRefuses(seven, {kind: "gates", all: true, gates: []}), "every-gate run refused");
  assert.ok(L.laneRefuses(seven, {kind: "gates", gates: Array.from({length: seven.maxGates + 1}, (_, i) => `gate${i}`)}), "too many gates refused");
  assert.equal(L.laneRefuses(seven, {kind: "gates", gates: ["gateplains", "gatelifepath"]}), null);
  assert.equal(L.laneRefuses(seven, {kind: "gate-two", gate: "gateplayerload"}), null);
  assert.equal(L.laneRefuses(seven, {kind: "setup-lane", lane: 7}), null);
  assert.equal(L.laneRefuses(two, {kind: "gates", touched: true, gates: []}), null, "main PC lanes keep taking any run");
  const runner = fs.readFileSync(path.join(root, "tools/pcq/runner.mjs"), "utf8"), submit = fs.readFileSync(path.join(root, "tools/pcq/submit.mjs"), "utf8");
  assert.ok(runner.includes("!laneRefuses(laneOf(l), q.job)") && submit.includes("laneRefuses(named, v.job)"), "runner and submit both check it");
});

test("B7181: flagPlan puts back the flags a gate changed on documents that were there before it", async () => {
  const {flagPlan} = await import("../lanes/lib.mjs");
  const before = {
    "Actor.a": {"wodx-npc": {haven: "Scene.x", mood: 1}, core: {sheetClass: "s"}},
    "Scene.x": {},
    "Actor.same": {"wodx-npc": {k: 1}},
    "Actor.gone": {"wodx-npc": {k: 1}}
  };
  const after = {
    "Actor.a": {"wodx-npc": {haven: "Scene.gate", mood: 1, learned: ["dodge"]}, core: {sheetClass: "s"}},
    "Scene.x": {"wodx-chronicle": {domain: "gate"}},
    "Actor.same": {"wodx-npc": {k: 1}},
    "Actor.new": {"wodx-npc": {k: 2}}
  };
  const plan = flagPlan(before, after);
  assert.deepEqual(plan, [
    {uuid: "Actor.a", unset: [["wodx-npc", "haven"], ["wodx-npc", "learned"]], set: [["wodx-npc", "haven", "Scene.x"]]},
    {uuid: "Scene.x", unset: [["wodx-chronicle", "domain"]], set: []}
  ], "changed keys are unset then set back, added keys unset; unchanged, deleted and new documents are left alone");
  const deep = flagPlan({"A.b": {m: {o: {x: 1}}}}, {"A.b": {m: {o: {x: 1, y: 2}}}});
  assert.deepEqual(deep, [{uuid: "A.b", unset: [["m", "o"]], set: [["m", "o", {x: 1}]]}], "an object value is replaced whole, so no merged key stays");
  assert.deepEqual(flagPlan({}, {}), []);
});

test("B7192: sheetPlan puts back the sheet data, effects and items a gate changed on shared actors", async () => {
  const {sheetPlan} = await import("../lanes/lib.mjs");
  const frenzy = {_id: "e1", name: "Frenzy", statuses: ["frenzy"]}, old = {_id: "e0", name: "Blessed", statuses: []};
  const before = {
    "Actor.a": {system: {conditions: {isfrenzy: false}, blood: 10}, effects: {e0: old}, items: ["i1"]},
    "Actor.a.Item.i1": {system: {clip: 6}},
    "Actor.same": {system: {blood: 3}, effects: {}, items: []},
    "Actor.gone": {system: {}, effects: {}, items: []}
  };
  const after = {
    "Actor.a": {system: {conditions: {isfrenzy: true}, blood: 7}, effects: {e1: frenzy}, items: ["i1", "i2"]},
    "Actor.a.Item.i1": {system: {clip: 0}},
    "Actor.same": {system: {blood: 3}, effects: {}, items: []},
    "Actor.new": {system: {blood: 1}, effects: {}, items: []}
  };
  assert.deepEqual(sheetPlan(before, after), [
    {uuid: "Actor.a", system: {conditions: {isfrenzy: false}, blood: 10}, dropEffects: ["e1"], addEffects: [old], dropItems: ["i2"]},
    {uuid: "Actor.a.Item.i1", system: {clip: 6}}
  ], "changed system data comes back whole, added effects and items go, removed effects return; unchanged, deleted and new documents are left alone");
  const edited = sheetPlan({"Actor.b": {system: {}, effects: {e0: old}, items: []}}, {"Actor.b": {system: {}, effects: {e0: {...old, name: "x"}}, items: []}});
  assert.deepEqual(edited, [{uuid: "Actor.b", dropEffects: ["e0"], addEffects: [old]}], "an edited effect is replaced by its old self");
  assert.deepEqual(sheetPlan({}, {}), []);
});

test("B7192: run-gate reads sheets before each gate and puts them back before the flags", () => {
  const src = fs.readFileSync(new URL("../lanes/run-gate.mjs", import.meta.url), "utf8");
  assert.match(src, /const sheetsBefore = lane\.autoReset \? await page\.evaluate\(READ_SHEETS\)/);
  assert.ok(src.indexOf("PUT_SHEETS_BACK, sheetPlan") < src.indexOf("PUT_FLAGS_BACK, flagPlan"), "sheets go back before flags");
});

test("B7193: sheetPlan removes what a gate placed on a scene that was there before it", async () => {
  const {sheetPlan} = await import("../lanes/lib.mjs");
  const before = {"Scene.s": {kids: {Region: ["r1"], Token: ["t1"], Wall: []}}, "Scene.same": {kids: {Region: ["r1"]}}};
  const after = {"Scene.s": {kids: {Region: ["r1", "chapel"], Token: ["t1", "t2"], Wall: []}}, "Scene.same": {kids: {Region: ["r1"]}}, "Scene.new": {kids: {Region: ["x"]}}};
  assert.deepEqual(sheetPlan(before, after), [{uuid: "Scene.s", dropKids: {Region: ["chapel"], Token: ["t2"]}}]);
});

test("B7200: a migration marker written after the clean fingerprint is not drift", () => {
  const cfg = L.loadConfig(path.join(root, "tools/lanes/lanes.json"));
  const raw = settings => ({world: "w", core: "14.369", system: {id: "worldofdarkness", version: "1"}, modules: {fxmaster: "6"}, settings, docs: {}, worldTime: 0});
  const clean = L.worldFingerprint(raw({"wodx-chronicle.automationLevel": "1"}), cfg.ignoreSettings);
  const now = L.worldFingerprint(raw({"wodx-chronicle.automationLevel": "1", "fxmaster.parameterRangeMigrationVersion": "\"6.0\"", "tokenmagic.migration": "2"}), cfg.ignoreSettings);
  assert.deepEqual(L.diffWorld(clean, now).strict, []);
  const real = L.worldFingerprint(raw({"wodx-chronicle.automationLevel": "2"}), cfg.ignoreSettings);
  assert.deepEqual(L.diffWorld(clean, real).strict.map(d => d.where), ["setting wodx-chronicle.automationLevel"], "a real setting change still stops the run");
});

test("B7204: stop takes over the lane's own Foundry by its port only when its command line is this lane's", () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../lanes/lanes.mjs"), "utf8");
  const fn = src.slice(src.indexOf("function lanePidByPort"), src.indexOf("async function stop"));
  assert.match(fn, /Get-NetTCPConnection -LocalPort \$\{Number\(lane\.port\)\} -State Listen/);
  assert.match(fn, /pid > 0 && pidIsLane\(pid, lane\) \? pid : 0/, "a process that is not the lane's Foundry is never taken");
  const stop = src.slice(src.indexOf("async function stop"), src.indexOf("async function accept"));
  assert.ok(stop.indexOf("lanePidByPort(lane)") < stop.indexOf("process.kill(pid)"), "the takeover comes before any kill");
  assert.ok(stop.includes("if ( !pidIsLane(pid, lane) ) throw"), "the stale-id guard still stands");
});

test("cloud lane 9 keeps Foundry and its licence out of the repo and uses Node 24 through the proxy (B7240-B7242)", () => {
  const src = fs.readFileSync(path.join(root, "tools/lanes/cloud-lane.mjs"), "utf8");
  assert.ok(src.includes('"/mnt/project-files/private/cloud-foundry"'), "the zip and licence come from the private cache");
  assert.ok(!/license\.json"\)\s*,\s*path\.join\(REPO/.test(src), "the licence is never copied into the checkout");
  assert.ok(src.includes('NODE_USE_ENV_PROXY: "1"'), "Foundry's licence check goes through the cloud proxy");
  assert.ok(src.includes('WODX_HOST: "cloud"'));
  assert.match(src, />= 24/, "Foundry 14 needs Node 24");
  assert.ok(!/console\.(log|warn|error)\([^)]*\.license\b/.test(src), "the key is never printed");
});
