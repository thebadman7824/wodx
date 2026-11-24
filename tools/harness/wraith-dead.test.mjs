import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The valley's dead and the living (B7899-B7903; Wraith 20th pp. 281-291) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const W = await imp("modules/wodx-actions/scripts/wraith-rules.js");
const WR = await imp("modules/wodx-actions/scripts/witness-rules.js");
const L = await imp("modules/wodx-chronicle/scripts/chronicle-local-rules.mjs");
const {MANIFEST} = await imp("modules/wodx-rothenstein/chronicle.mjs");

test("B7899: the Crucible holds the Caul until it is lived through", () => {
  assert.equal(W.caulSelfOpen(null), true, "a wraith made at creation tears it as before");
  assert.equal(W.caulSelfOpen({crucible: "open"}), false);
  assert.equal(W.caulSelfOpen({crucible: "done"}), true);
});

test("B7900: the Fog by Willpower, and its memory; children and animals outside it", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(w => W.fogReaction(w).key),
    ["catatonic", "panic", "disbelief", "berserk", "terror", "conciliatory", "controlled", "curiosity", "anger", "none"]);
  assert.deepEqual([1, 2, 4, 5, 7, 9].map(w => W.fogReaction(w).act), ["freeze", "flee", "fight", "flee", null, "fight"]);
  assert.equal(W.fogReaction(0).key, "catatonic");
  assert.equal(W.fogReaction(5).remembers, false);
  assert.equal(W.fogReaction(5, {child: true}).remembers, true);
  assert.equal(W.fogReaction(5, {beast: true}).act, null);
  assert.equal(WR.remembers("hysteria", {fog: W.fogReaction(3)}), false);
  assert.equal(WR.remembers("hysteria", {fog: W.fogReaction(3, {child: true})}), true);
  assert.equal(WR.remembers("hysteria", {}), true, "a roll given from elsewhere keeps the old way");
  for ( const f of W.FOG.slice(1) ) assert.ok(!/—/.test(f.text));
});

test("B7901: Haunt echoes: one a point past Shroud 4; the Nightmarish and Forbidding rolls", () => {
  assert.equal(W.echoSlots(7, 3), 0);
  assert.equal(W.echoSlots(7, 4), 1);
  assert.equal(W.echoSlots(7, 5), 2);
  assert.equal(W.echoSlots(5, 3), 2);
  assert.equal(Object.keys(W.ECHOES).length, 8);
  assert.equal(W.shroudRating({base: 7, haunt: 5}), 4);
  assert.equal(W.nightmareDiff(4), 7);
  assert.equal(W.nightmareAfter(0, false), 1);
  assert.equal(W.nightmareAfter(2, false), 3);
  assert.equal(W.nightmareAfter(2, true), 1);
  assert.equal(W.nightmareAfter(0, true), 0);
  assert.deepEqual(W.forbidding(3, {successes: 2}), {enter: true, hours: 2});
  assert.deepEqual(W.forbidding(3, {successes: 0}), {enter: false, hours: 3});
  assert.deepEqual(W.forbidding(3, {botch: true}), {enter: false, days: 3, hysterical: true});
});

test("B7902: shelter in a Maelstrom: the level less the Haunt, five a level, crowding, a Great Maelstrom", () => {
  assert.equal(W.shelter({force: 3, haunt: 3, wraiths: 4}).safe, true);
  const s = W.shelter({force: 4, haunt: 2, wraiths: 5});
  assert.deepEqual([s.safe, s.level, s.hours, s.soak, s.capacity], [false, 2, 2, 2, 10]);
  const crowd = W.shelter({force: 2, haunt: 1, wraiths: 6});
  assert.deepEqual([crowd.over, crowd.effective, crowd.safe, crowd.level], [1, 0, false, 2], "a Haunt of 1 fails with one over");
  assert.equal(W.shelter({force: 3, haunt: 2, wraiths: 12}).effective, 1);
  const g = W.shelter({force: 5, haunt: 5, wraiths: 1, great: true});
  assert.deepEqual([g.safe, g.level, g.hours], [false, 5, 2.5]);
});

test("B7901, B7903: a chronicle's Haunts and its eaten souls, read by scene name", () => {
  const local = L.localOf({manifest: MANIFEST});
  const h = L.hauntOn(local, "Ruins · Altenhof");
  assert.equal(h.rating, 4);
  assert.deepEqual(h.echoes, ["nightmarish"]);
  for ( const x of local.haunts ) assert.ok(x.echoes.length <= W.echoSlots(7, x.rating), x.name);
  assert.equal(L.soulFateOn(local, "The Ashfield"), "eaten");
  assert.equal(W.soulEaten(L.soulFateOn(local, "Dolany Village")), false);
  assert.equal(L.hauntOn(L.localOf(null), "Altenhof"), null);
});

test("B7899-B7903: wiring", () => {
  const w = src("modules/wodx-actions/scripts/wraith.js"), m = src("modules/wodx-actions/scripts/main.js"), k = src("modules/wodx-actions/scripts/kindred.js");
  assert.match(w, /W\.caulSelfOpen\(actor\.getFlag\(MOD, "wraithDeath"\)\)/);
  assert.match(w, /W\.shelter\(\{ force, haunt: haunt\.rating/);
  assert.match(w, /haunt: h\?\.rating \?\? 0/);
  assert.match(w, /Local\.soulFateOn/);
  assert.match(m, /info\?\.condition === "dead"\) wx\(\)\.onDeath/);
  assert.match(k, /fogReaction\(w, \{ child/);
});
