import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Servants and Bonds Desk, step three (B5120-B5127): fomori, the Retinue, mummy cults, Social Conditioning programmes, NPC keepers.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const W = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/servant-world-rules.mjs")));

test("fomori get one to three different powers, rollable where the book rolls, and the sheet changes they bring", () => {
  for ( const r of [0, 0.5, 0.99] ) {
    const p = W.pickPowers(() => r);
    assert.ok(p.length >= 1 && p.length <= 3);
    assert.equal(new Set(p.map(x => x.k)).size, p.length, "no power twice");
  }
  const items = W.powerItems(W.FOMORI.filter(p => ["animalControl", "berserker"].includes(p.k)));
  assert.equal(items[0].system.dice1, "manipulation");
  assert.equal(items[0].system.difficulty, 6);
  assert.equal(items[1].system.dice1, undefined, "Berserker has no roll of its own");
  assert.ok(items.every(i => i.type === "Power" && i.flags["wodx-npc"].fomori));
  const upd = W.powerSheet(W.FOMORI.filter(p => ["berserker", "armoredSkin"].includes(p.k)));
  assert.equal(upd["system.advantages.rage.permanent"], 5);
  assert.equal(upd["system.settings.soak.lethal.isrollable"], true);
  for ( const p of W.FOMORI ) assert.ok(p.e.split(" ").length < 30, `${p.n} is in WoDX's own short words`);
});

test("a fomor serves the nearest Wyrm master; Pentex only from 1900", () => {
  const c = [{id: "p", kind: "pentex"}, {id: "c", kind: "cult", sceneId: "far"}, {id: "s", kind: "spiral", sceneId: "here"}];
  assert.equal(W.wyrmMaster(c, {year: 1999, sceneId: "here"}).id, "s");
  assert.equal(W.wyrmMaster(c, {year: 1999, sceneId: "elsewhere"}).id, "s", "a hive before a cult");
  assert.equal(W.wyrmMaster([{id: "p", kind: "pentex"}], {year: 1850}), null);
  assert.equal(W.wyrmMaster([{id: "p", kind: "pentex"}], {year: 1950}).id, "p");
});

test("an untended mummy cult thins; a mistreated one turns", () => {
  const wk = 7 * 86400;
  assert.equal(W.cultDrift({step: 2, last: 0}, 5 * wk).step, 2);
  assert.equal(W.cultDrift({step: 2, last: 0}, 13 * wk).step, 1);
  assert.equal(W.cultDrift({step: 2, last: 0}, wk, {mistreated: true}).betray, true);
});

test("NPC keepers recruit unbound mortals nearest first, only as many as are missing", () => {
  assert.equal(W.shortfall(3, 1), 2);
  assert.equal(W.shortfall(1, 4), 0);
  const pool = [{id: "a", sceneId: "x"}, {id: "b", sceneId: "here"}, {id: "c", sceneId: "here"}];
  assert.deepEqual(W.recruits(pool, 2, {sceneId: "here"}), ["b", "c"]);
  assert.deepEqual(W.recruits(pool, 2, {sceneId: "here", taken: new Set(["b"])}), ["c", "a"]);
  assert.equal(W.LINE_OF_TYPE.Mummy, "mummy");
});

test("the wiring: settings, hooks, the API and the followers window", () => {
  const sw = src("modules/wodx-npc/scripts/servant-world.mjs"), main = src("modules/wodx-npc/scripts/main.mjs");
  assert.ok(/taint\?\.ridden === true/.test(sw), "a Bane riding someone makes the fomor");
  assert.ok(/Hooks\.on\("updateItem"/.test(sw) && /retinue/i.test(sw), "the Retinue starts enchanted");
  assert.ok(/Hooks\.on\("wodxDamageApplied"/.test(sw), "the mummy's death");
  assert.ok(/data-wnpc-keepers-undo/.test(sw), "the keepers card can be undone");
  assert.ok(/payer: "patron"/.test(sw) && /Hooks\.on\("wodxBond"/.test(sw), "a servant takes the master's experience");
  assert.ok(/SWORLD\.listen\(\)/.test(main) && /openSocial: SWORLD\.openSocial/.test(main));
  assert.ok(/data-social/.test(src("modules/wodx-npc/scripts/followers.mjs")));
});
