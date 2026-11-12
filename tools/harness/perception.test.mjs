import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Senses 0.3.0: the screen in frenzy and Rötschreck, scent trails, the unseen */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = await import(pathToFileURL(join(root, "modules/wodx-senses/scripts/perception-rules.mjs")));

test("the screen: frenzy is a red edge, Rötschreck drains the colour and wins over frenzy", () => {
  assert.equal(P.screenFor({}), null);
  assert.equal(P.screenFor({frenzy: true}), "frenzy");
  assert.equal(P.screenFor({rotschreck: true}), "rotschreck");
  assert.equal(P.screenFor({frenzy: true, rotschreck: true}), "rotschreck");
});

test("scent trails: steps are kept for an hour of world time, at most sixty a token, fading with age", () => {
  let t = [];
  for ( let i = 0; i < 70; i++ ) t = P.addStep(t, {x: i, y: 0, at: 1000 + i}, {now: 1000 + i});
  assert.equal(t.length, P.TRAIL_STEPS);
  assert.equal(t[0].x, 10);
  t = P.addStep(t, {x: 99, y: 0, at: 1000 + 70 + P.TRAIL_SECONDS}, {now: 1000 + 70 + P.TRAIL_SECONDS});
  assert.equal(t.length, 1, "everything older than an hour is dropped");
  assert.equal(P.trailStrength(100, 100), 1);
  assert.ok(P.trailStrength(100, 100 + 1800) < 0.6 && P.trailStrength(100, 100 + 1800) > 0.4);
  assert.equal(P.trailStrength(100, 100 + P.TRAIL_SECONDS + 1), 0);
  assert.equal(P.trailStrength(200, 100), 0, "the clock set back: gone");
  assert.equal(P.smellYards(0), 8);
  assert.equal(P.smellYards(1), 16);
  assert.equal(P.smellYards(0, true), 20);
});

test("scent trails: only steps within smell's reach, never the sniffer's own or a skipped token's", () => {
  const trails = {a: [{x: 100, y: 0, at: 0}, {x: 1000, y: 0, at: 0}], me: [{x: 0, y: 0, at: 0}], hid: [{x: 50, y: 0, at: 0}]};
  const steps = P.stepsInReach(trails, {x: 0, y: 0}, {now: 60, pxPerYard: 20, reachYards: 16, skip: ["me", "hid"]});
  assert.deepEqual(steps.map(s => [s.id, s.x]), [["a", 100]]);
  assert.ok(steps[0].alpha > 0.9);
  assert.deepEqual(P.stepsInReach(trails, null, {now: 0}), []);
});

test("the unseen: shown to the Storyteller, the owner, and those who found them; never if the Storyteller hid the token", () => {
  const t = {gmHidden: false, concealed: true, seenBy: ["pc1"], owner: false};
  assert.equal(P.showsTo(t, ["pc1"]), true);
  assert.equal(P.showsTo(t, ["pc2"]), false);
  assert.equal(P.showsTo(t, [], {isGM: true}), true);
  assert.equal(P.showsTo({...t, owner: true}, []), true);
  assert.equal(P.showsTo({...t, gmHidden: true}, ["pc1"]), false);
  assert.equal(P.showsTo({...t, concealed: false}, []), true);
  assert.deepEqual(P.seenAfter(["pc1"], [{actorId: "pc2", noticed: true}, {actorId: "pc3", noticed: false}, {actorId: "pc1", noticed: false}]).sort(), ["pc1", "pc2"]);
});

test("the module wires it in: settings, the HUD button, the isVisible wrap, player characters never hidden from the others", () => {
  const src = readFileSync(join(root, "modules/wodx-senses/scripts/perception.mjs"), "utf8");
  const main = readFileSync(join(root, "modules/wodx-senses/scripts/main.mjs"), "utf8");
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-senses/module.json"), "utf8"));
  assert.equal(m.version, "0.7.1");
  assert.match(main, /const VERSION = "0\.7\.1"/);
  assert.match(main, /setupPerception\(\{/);
  for ( const k of ["\"screen\"", "\"trails\"", "\"unseen\""] ) assert.ok(src.includes(`register(MOD, ${k}`), k);
  assert.match(src, /a\.hasPlayerOwner \) return false/);
  assert.match(src, /renderTokenHUD/);
  assert.match(src, /defineProperty\(T\.prototype, "isVisible"/);
  assert.match(src, /RR\.notice\(/, "the books' noticing rules, through WoDX NPC");
});
