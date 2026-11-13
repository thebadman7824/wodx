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
  for ( const k of ["oh-you-dead.writerLease", "wodx-actions.sky", "wodx-atmosphere.applied"] ) assert.ok(cfg.ignoreSettings.includes(k), k);
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
